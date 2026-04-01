import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// ===== Agent 入局 (多桌制) =====
const tables = new Map();
let tableIdCounter = 1;

function createTable() {
  const id = tableIdCounter++;
  tables.set(id, { id, players: [], createdAt: Date.now() });
  return id;
}

app.get('/api/agent-tables', (req, res) => {
  const active = Array.from(tables.values()).filter(t => t.players.length < 4);
  res.json(active);
});

app.post('/api/agent-table-create', (req, res) => {
  const tableId = createTable();
  res.json({ tableId });
});

app.post('/api/agent-join', (req, res) => {
  const { tableId, wallet, skill, entryFee } = req.body;
  const table = tables.get(tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  if (table.players.length >= 4) return res.status(400).json({ error: 'Table full' });

  table.players.push({ wallet, skill });
  const gameStarted = table.players.length === 4;

  if (gameStarted) {
    // 满员自动开局
    table.gameStarted = true;
    table.startedAt = Date.now();
    // 这里可以触发游戏逻辑
  }

  res.json({ tableId, gameStarted, players: table.players.length });
});

// ===== 锦标赛 (积分赛) =====
const tournament = {
  registered: [],
  started: false,
  standings: [],
  rounds: 0,
  maxRounds: 8,
};

app.get('/api/tournament-status', (req, res) => {
  res.json({
    registered: tournament.registered,
    started: tournament.started,
    standings: tournament.standings,
    rounds: tournament.rounds,
  });
});

app.post('/api/tournament-register', (req, res) => {
  const { wallet, skill, entryFee } = req.body;
  if (tournament.registered.length >= 32) {
    return res.status(400).json({ error: 'Tournament full' });
  }

  tournament.registered.push({ wallet, skill, score: 0 });

  // 满 32 人自动开赛
  if (tournament.registered.length === 32) {
    tournament.started = true;
    tournament.standings = tournament.registered.map((a, i) => ({ ...a, score: 0 }));
    // 这里可以触发锦标赛逻辑
  }

  res.json({ ok: true, registered: tournament.registered.length });
});

// ===== LLM 竞技场 =====
const bets = { claude: 0, gpt: 0, gemini: 0, deepseek: 0 };

app.get('/api/odds', (req, res) => {
  const total = Object.values(bets).reduce((s, v) => s + v, 0) || 1;
  const odds = {};
  for (const [k, v] of Object.entries(bets)) {
    odds[k] = v > 0 ? Math.min(20, Math.max(1.1, +(total / v).toFixed(2))) : 4;
  }
  res.json({ bets, odds, total });
});

app.post('/api/bet', (req, res) => {
  const { player, amount } = req.body;
  if (!bets.hasOwnProperty(player)) return res.status(400).json({ error: 'Invalid player' });
  if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  bets[player] += amount;
  const total = Object.values(bets).reduce((s, v) => s + v, 0);
  const odd = bets[player] > 0 ? Math.min(20, Math.max(1.1, +(total / bets[player]).toFixed(2))) : 4;
  res.json({ ok: true, bets, odds: odd, total });
});

app.post('/api/reset-bets', (req, res) => {
  for (const k of Object.keys(bets)) bets[k] = 0;
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', tables: tables.size, tournament: tournament.registered.length });
});

const PORT = process.env.PORT || 3899;
app.listen(PORT, () => {
  console.log(`🀄 Mahjong Arena API running on :${PORT}`);
  console.log(`  Agent Lobby: /api/agent-*`);
  console.log(`  Tournament: /api/tournament-*`);
  console.log(`  LLM Arena: /api/odds, /api/bet`);
});
