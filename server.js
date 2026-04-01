import http from 'http';
import { WebSocketServer } from 'ws';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { MahjongLogic } from './mahjong-logic.js';

const PORT = 3852;
const CONTRACT = '0x6a0873501EDe896606CE8F411E0ed01E2F358710';
const RPC = 'https://bsc-dataseed.binance.org';

const ABI = [
  'event LobbyStarted(uint256 indexed id, address[4] players)',
  'event LobbySettled(uint256 indexed id, address indexed winner, uint256 prize)',
  'event TournamentStarted(uint256 indexed id)',
  'event RoundCompleted(uint256 indexed id, uint256 round, bytes32 gameHash)',
  'event TournamentSettled(uint256 indexed id, address indexed winner, uint256 prize)',
  'function settleLobby(uint256 _lobbyId, address _winner)',
  'function submitRoundResult(uint256 _id, uint256 _round, bytes32 _gameHash, uint256[4] _scores)',
  'function settleTournament(uint256 _id)',
  'function getLobbyInfo(uint256) view returns (uint256 id, uint256 entryFee, uint8 playerCount, uint8 status, uint256 prizePool, address winner)',
  'function getLobbyPlayers(uint256) view returns (address[4])',
  'function getPlayers(uint256) view returns (address[4])',
  'function getAllScores(uint256) view returns (address[4], uint256[4])',
  'function lobbyCount() view returns (uint256)',
  'function tournamentCount() view returns (uint256)',
  'function tournaments(uint256) view returns (uint256 id, uint256 entryFee, uint256 totalRounds, uint256 completedRounds, uint256 prizePool, uint256 platformFee, uint8 status, address winner)',
];

const provider = new ethers.JsonRpcProvider(RPC);

// Oracle signer — reads key from env or .deploy-key
function getOracleSigner() {
  let pk = process.env.PRIVATE_KEY;
  if (!pk) {
    try { pk = readFileSync('.deploy-key', 'utf8').trim(); } catch {}
  }
  if (!pk) { console.error('No PRIVATE_KEY'); return null; }
  return new ethers.Wallet(pk, provider);
}

const signer = getOracleSigner();
const readContract = new ethers.Contract(CONTRACT, ABI, provider);
const writeContract = signer ? new ethers.Contract(CONTRACT, ABI, signer) : null;

const games = new Map();
const clients = new Map();

// ===== 初始化牌局 =====
function initGame(lobbyId, players) {
  const tiles = [];
  for (const suit of ['w', 't', 's']) {
    for (let rank = 1; rank <= 9; rank++) {
      for (let i = 0; i < 4; i++) tiles.push({ suit, rank });
    }
  }
  tiles.sort(() => Math.random() - 0.5);
  const hands = players.map(() => tiles.splice(0, 13));
  const game = {
    lobbyId, players, hands, wall: tiles,
    discards: [[], [], [], []], melds: [[], [], [], []],
    turn: 0, status: 'playing', startTime: Date.now(),
  };
  games.set(lobbyId, game);
  return game;
}

// ===== AI 自动打牌循环 =====
async function playTurn(lobbyId) {
  const game = games.get(lobbyId);
  if (!game || game.status !== 'playing') return;

  const idx = game.turn % 4;
  const hand = game.hands[idx];

  // 摸牌
  if (game.wall.length === 0) {
    // 流局 — 第一个玩家赢（简化）
    await settleOnChain(lobbyId, game.players[0]);
    return;
  }
  hand.push(game.wall.pop());

  // 检查胡牌
  if (MahjongLogic.canHu(hand)) {
    const fan = MahjongLogic.calculateFan(hand, game.melds[idx], true);
    game.status = 'settled';
    console.log(`🎉 Lobby #${lobbyId}: Player ${idx} (${game.players[idx]}) wins! ${fan}番`);
    broadcast(lobbyId, { type: 'gameEnd', winnerIdx: idx, winner: game.players[idx], fan });
    await settleOnChain(lobbyId, game.players[idx]);
    return;
  }

  // LLM 决策出牌，fallback 随机
  let discardIdx = Math.floor(Math.random() * hand.length);
  try {
    const decision = await llmDecide(hand, game.discards, game.wall.length);
    if (decision?.tileIndex >= 0 && decision.tileIndex < hand.length) {
      discardIdx = decision.tileIndex;
    }
  } catch {}

  const tile = hand.splice(discardIdx, 1)[0];
  game.discards[idx].push(tile);
  game.turn++;
  broadcast(lobbyId, { type: 'turn', playerIdx: idx, tile });

  setTimeout(() => playTurn(lobbyId), 300);
}

// ===== 链上结算 =====
async function settleOnChain(lobbyId, winner) {
  if (!writeContract) { console.error('No oracle signer'); return; }
  try {
    const tx = await writeContract.settleLobby(lobbyId, winner);
    const r = await tx.wait();
    console.log(`✅ Lobby #${lobbyId} settled on-chain. TX: ${r.hash}`);
    broadcast(lobbyId, { type: 'settled', winner, tx: r.hash });
  } catch (e) {
    console.error(`❌ settleLobby #${lobbyId} failed:`, e.message);
  }
  games.delete(lobbyId);
}

// ===== 锦标赛自动运行 =====
async function runTournament(tournamentId, players) {
  console.log(`🏆 Tournament #${tournamentId} started`);
  const t = await readContract.tournaments(tournamentId);
  const totalRounds = Number(t.totalRounds);
  const scores = [0, 0, 0, 0];

  for (let round = 0; round < totalRounds; round++) {
    // 每轮跑一局
    const tiles = [];
    for (const suit of ['w', 't', 's']) {
      for (let rank = 1; rank <= 9; rank++) {
        for (let i = 0; i < 4; i++) tiles.push({ suit, rank });
      }
    }
    tiles.sort(() => Math.random() - 0.5);
    const hands = players.map(() => tiles.splice(0, 13));

    // 简化：随机决定赢家（完整版应跑完整牌局）
    let winnerIdx = 0;
    for (let turn = 0; turn < 200 && tiles.length > 0; turn++) {
      const idx = turn % 4;
      hands[idx].push(tiles.pop());
      if (MahjongLogic.canHu(hands[idx])) { winnerIdx = idx; break; }
      hands[idx].splice(Math.floor(Math.random() * hands[idx].length), 1);
    }

    scores[winnerIdx] += 3;
    const gameHash = ethers.keccak256(ethers.toUtf8Bytes(`t${tournamentId}r${round}w${winnerIdx}${Date.now()}`));
    const roundScores = [0, 0, 0, 0];
    roundScores[winnerIdx] = 3;

    try {
      const tx = await writeContract.submitRoundResult(tournamentId, round, gameHash, roundScores);
      await tx.wait();
      console.log(`  Round ${round + 1}/${totalRounds}: Player ${winnerIdx} wins`);
    } catch (e) {
      console.error(`  submitRoundResult failed round ${round}:`, e.message);
      return;
    }
  }

  // 结算锦标赛
  try {
    const tx = await writeContract.settleTournament(tournamentId);
    await tx.wait();
    console.log(`🏆 Tournament #${tournamentId} settled!`);
  } catch (e) {
    console.error(`settleTournament failed:`, e.message);
  }
}

// ===== LLM 决策 =====
async function llmDecide(hand, discards, wallRemain) {
  const handStr = hand.map(t => `${t.suit}${t.rank}`).join(' ');
  const res = await fetch('http://127.0.0.1:8402/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '川麻AI。返回JSON: {"tileIndex":<number>}' },
        { role: 'user', content: `手牌: ${handStr}。牌墙剩余: ${wallRemain}。选出牌序号(0-based)。` },
      ],
      temperature: 0.3, max_tokens: 100,
    }),
  });
  const data = await res.json();
  const m = (data.choices?.[0]?.message?.content || '').match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

// ===== WebSocket =====
function broadcast(lobbyId, msg) {
  clients.forEach((c, ws) => {
    if (c.lobbyId === lobbyId && ws.readyState === 1) ws.send(JSON.stringify(msg));
  });
}

const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const lobbyId = parseInt(url.searchParams.get('lobbyId'));
  clients.set(ws, { lobbyId });
  ws.send(JSON.stringify({ type: 'connected', lobbyId }));
  ws.on('close', () => clients.delete(ws));
});

// ===== 合约事件监听 =====
readContract.on('LobbyStarted', (id, players) => {
  const lobbyId = Number(id);
  console.log(`🎮 LobbyStarted #${lobbyId}: ${players.join(', ')}`);
  initGame(lobbyId, [...players]);
  broadcast(lobbyId, { type: 'gameStart', lobbyId, players: [...players] });
  playTurn(lobbyId);
});

readContract.on('TournamentStarted', async (id) => {
  const tid = Number(id);
  console.log(`🏆 TournamentStarted #${tid}`);
  const players = await readContract.getPlayers(tid);
  runTournament(tid, [...players]);
});

// ===== HTTP =====
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', games: games.size, clients: clients.size, contract: CONTRACT }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/agent/decide') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const state = JSON.parse(body);
        const decision = await llmDecide(state.hand, state.discards || [], state.wallRemain || 0);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(decision || { tileIndex: 0 }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 查询牌桌
  const lobbyMatch = req.url.match(/^\/api\/lobby\/(\d+)$/);
  if (req.method === 'GET' && lobbyMatch) {
    try {
      const info = await readContract.getLobbyInfo(lobbyMatch[1]);
      const players = await readContract.getLobbyPlayers(lobbyMatch[1]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: Number(info.id), entryFee: ethers.formatEther(info.entryFee),
        playerCount: Number(info.playerCount), status: Number(info.status),
        prizePool: ethers.formatEther(info.prizePool), winner: info.winner, players: [...players],
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404); res.end('Not Found');
});

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/ws')) {
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  } else socket.destroy();
});

server.listen(PORT, () => console.log(`🀄 Mahjong Server on :${PORT} | Contract: ${CONTRACT}`));
