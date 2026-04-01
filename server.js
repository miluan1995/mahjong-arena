// Mahjong Arena - Game Engine with Settlement
import http from 'http';
import { WebSocketServer } from 'ws';
import { ethers } from 'ethers';
import { MahjongLogic } from './mahjong-logic.js';

const PORT = 3852;
const CONTRACT_ADDRESS = '0x648ad2EcB46BE77F78c7E672Aae900810014057c';
const RPC_URL = 'https://bsc-dataseed.binance.org';

const CONTRACT_ABI = [
  'event GameStarted(uint256 indexed lobbyId, address[] players)',
  'event GameSettled(uint256 indexed lobbyId, address winner, uint256 amount)',
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

const games = new Map();
const clients = new Map();

// ===== 游戏状态机 =====
function initGame(lobbyId, players) {
  const tiles = [];
  for (let suit of ['w', 't', 's']) {
    for (let rank = 1; rank <= 9; rank++) {
      for (let i = 0; i < 4; i++) tiles.push({ suit, rank });
    }
  }
  tiles.sort(() => Math.random() - 0.5);

  const hands = players.map(() => tiles.splice(0, 13));
  const game = {
    lobbyId,
    players,
    hands,
    wall: tiles,
    discards: [[], [], [], []],
    melds: [[], [], [], []],
    turn: 0,
    round: 0,
    status: 'playing',
    startTime: Date.now(),
  };
  games.set(lobbyId, game);
  return game;
}

async function playerTurn(lobbyId) {
  const game = games.get(lobbyId);
  if (!game || game.status !== 'playing') return;

  const playerIdx = game.turn % 4;
  const hand = game.hands[playerIdx];
  
  // 检查是否能胡
  if (MahjongLogic.canHu(hand)) {
    const fan = MahjongLogic.calculateFan(hand, game.melds[playerIdx], true);
    const score = MahjongLogic.calculateScore(fan, true);
    settleGame(lobbyId, playerIdx, fan, score, true);
    return;
  }

  // LLM 决策出牌
  const decision = await analyzeWithLLM({
    type: 'discard',
    hand,
    melds: game.melds[playerIdx],
    discards: game.discards,
    wallRemain: game.wall.length,
    turn: game.round,
  });

  if (decision?.action === 'discard' && decision.tileIndex !== undefined) {
    const tile = hand.splice(decision.tileIndex, 1)[0];
    game.discards[playerIdx].push(tile);
    game.turn++;
    broadcast(lobbyId, { type: 'turn', playerIdx, tile, decision });
    setTimeout(() => playerTurn(lobbyId), 500);
  }
}

function settleGame(lobbyId, winnerIdx, fan, score, isZimo) {
  const game = games.get(lobbyId);
  if (!game) return;

  game.status = 'settled';
  const winner = game.players[winnerIdx];
  
  broadcast(lobbyId, {
    type: 'gameEnd',
    winner,
    winnerIdx,
    fan,
    score,
    isZimo,
    timestamp: Date.now(),
  });

  console.log(`🎉 Game #${lobbyId} settled: ${winner} wins ${score} (${fan}番)`);
  
  // 清理游戏状态
  setTimeout(() => games.delete(lobbyId), 5000);
}

// ===== LLM 分析 =====
async function analyzeWithLLM(gameState) {
  const { type, hand, melds, discards, wallRemain, turn } = gameState;
  const handStr = hand.map(t => `${t.suit}${t.rank}`).join(' ');

  let prompt = '';
  if (type === 'discard') {
    prompt = `川麻AI。手牌: ${handStr}。选择出牌序号(0-based)。返回JSON: {"action":"discard","tileIndex":<number>,"text":"<理由>"}`;
  }

  try {
    const res = await fetch('http://127.0.0.1:8402/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '川麻AI。返回有效JSON。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const m = content.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch (e) {
    console.error('LLM error:', e.message);
    return null;
  }
}

// ===== WebSocket =====
function broadcast(lobbyId, msg) {
  clients.forEach((client, ws) => {
    if (client.lobbyId === lobbyId && ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  });
}

const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const lobbyId = parseInt(url.searchParams.get('lobbyId'));
  const address = url.searchParams.get('address');

  clients.set(ws, { lobbyId, address });
  ws.send(JSON.stringify({ type: 'connected', lobbyId }));

  ws.on('close', () => clients.delete(ws));
});

// ===== 合约事件监听 =====
contract.on('GameStarted', (lobbyId, players) => {
  console.log(`🎮 Game Started: Lobby #${lobbyId}`);
  const game = initGame(Number(lobbyId), players);
  broadcast(Number(lobbyId), { type: 'gameStart', game });
  playerTurn(Number(lobbyId));
});

// ===== HTTP Server =====
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/api/agent/decide') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const state = JSON.parse(body);
        const decision = await analyzeWithLLM(state);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(decision || { action: 'pass' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', games: games.size, clients: clients.size }));
    return;
  }

  res.writeHead(404); res.end('Not Found');
});

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/ws')) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => console.log(`🀄 Mahjong Server on :${PORT}`));
