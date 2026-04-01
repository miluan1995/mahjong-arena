/**
 * LLM API 代理服务器 — 四个最低版本免费 API
 * Claude Haiku / GPT-4o-mini / Gemini 2.0 Flash / DeepSeek Chat
 */
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// 四个最低版本免费 API — 完全公平
const MODELS = {
  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-haiku-20241022', // 最便宜
    apiKey: process.env.CLAUDE_API_KEY,
    type: 'anthropic',
  },
  gpt: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini', // 最便宜
    apiKey: process.env.GPT_API_KEY,
    type: 'openai',
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.0-flash', // 免费额度
    apiKey: process.env.GEMINI_API_KEY,
    type: 'openai',
  },
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat', // 最便宜
    apiKey: process.env.DEEPSEEK_API_KEY,
    type: 'openai',
  },
};

async function callAnthropic(config, prompt) {
  const start = Date.now();
  const resp = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await resp.json();
  const text = data.content?.[0]?.text || '';
  return { text, latencyMs: Date.now() - start };
}

async function callOpenAI(config, prompt) {
  const start = Date.now();
  const resp = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 100,
      temperature: 0.3,
      messages: [
        { role: 'system', content: '你是麻将AI。只回复JSON格式的决策。' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { text, latencyMs: Date.now() - start };
}

app.post('/api/llm-move', async (req, res) => {
  const { player, prompt, phase } = req.body;
  const config = MODELS[player];

  if (!config) return res.status(400).json({ error: 'Unknown player' });
  if (!config.apiKey) return res.status(500).json({ error: `No API key for ${player}` });

  try {
    const result = config.type === 'anthropic'
      ? await callAnthropic(config, prompt)
      : await callOpenAI(config, prompt);

    console.log(`[${player}] ${phase} → ${result.text.slice(0, 80)} (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    console.error(`[${player}] Error:`, e.message);
    res.status(500).json({ error: e.message });
  }
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
  const keys = {};
  for (const [k, v] of Object.entries(MODELS)) {
    keys[k] = !!v.apiKey;
  }
  res.json({ status: 'ok', models: keys });
});

const PORT = process.env.PORT || 3899;
app.listen(PORT, () => {
  console.log(`🀄 Mahjong LLM API running on :${PORT}`);
  for (const [k, v] of Object.entries(MODELS)) {
    console.log(`  ${k}: ${v.model} [${v.apiKey ? '✅' : '❌ no key'}]`);
  }
});
