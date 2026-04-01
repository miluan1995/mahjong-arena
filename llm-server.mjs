/**
 * LLM API 代理服务器 — Mock 模式
 * 四个模型随机返回决策，无需 API key
 */
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const MODELS = {
  claude: { name: 'Claude Haiku', emoji: '🐻' },
  gpt: { name: 'GPT-4o-mini', emoji: '🤖' },
  gemini: { name: 'Gemini 2.0 Flash', emoji: '🧠' },
  deepseek: { name: 'DeepSeek Chat', emoji: '🔮' },
};

// Mock 决策
function mockDecision(hand, phase) {
  if (phase === 'discard') {
    const idx = Math.floor(Math.random() * hand.length);
    const tile = hand[idx];
    const suits = { wan: '万', tiao: '条', tong: '筒' };
    const ranks = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return JSON.stringify({
      action: 'discard',
      tile: `${ranks[tile.rank]}${suits[tile.suit]}`,
    });
  }
  if (phase === 'respond') {
    const actions = ['pass', 'peng', 'gang', 'hu'];
    return JSON.stringify({ action: actions[Math.floor(Math.random() * actions.length)] });
  }
  return JSON.stringify({ action: 'pass' });
}

app.post('/api/llm-move', async (req, res) => {
  const { player, prompt, phase } = req.body;
  if (!MODELS[player]) return res.status(400).json({ error: 'Unknown player' });

  // 模拟延迟 200-800ms
  await new Promise(r => setTimeout(r, 200 + Math.random() * 600));

  const text = mockDecision([], phase);
  res.json({ text, latencyMs: Math.floor(Math.random() * 600) + 200 });
});

const bets = { claude: 0, gpt: 0, gemini: 0, deepseek: 0 };

app.get('/api/odds', (req, res) => {
  const total = Object.values(bets).reduce((s, v) => s + v, 0) || 1;
  const odds = {};
  for (const [k, v] of Object.entries(bets)) {
    const share = v / total;
    odds[k] = share > 0 ? Math.min(20, Math.max(1.1, +(1 / share).toFixed(2))) : 4;
  }
  res.json({ bets, odds, total });
});

app.post('/api/bet', (req, res) => {
  const { player, amount } = req.body;
  if (!bets.hasOwnProperty(player)) return res.status(400).json({ error: 'Invalid player' });
  if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  bets[player] += amount;
  const total = Object.values(bets).reduce((s, v) => s + v, 0);
  const share = bets[player] / total;
  const odd = Math.min(20, Math.max(1.1, +(1 / share).toFixed(2)));
  res.json({ ok: true, bets, odds: odd, total });
});

app.post('/api/reset-bets', (req, res) => {
  for (const k of Object.keys(bets)) bets[k] = 0;
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'mock', models: Object.keys(MODELS) });
});

const PORT = process.env.PORT || 3899;
app.listen(PORT, () => {
  console.log(`🀄 Mahjong LLM API (MOCK) running on :${PORT}`);
  for (const [k, v] of Object.entries(MODELS)) {
    console.log(`  ${v.emoji} ${k}: ${v.name}`);
  }
});
