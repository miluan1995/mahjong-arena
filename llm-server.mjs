/**
 * LLM API 代理服务器
 * 统一转发麻将决策请求到四个大模型
 */
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// 模型配置 — 全走中转站
const MODELS = {
  claude: {
    url: process.env.CLAUDE_BASE_URL || 'https://www.heiyucode.com/v1/messages',
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
    type: 'anthropic',
  },
  gpt: {
    url: process.env.GPT_BASE_URL || 'https://www.heiyucode.com/v1/chat/completions',
    model: process.env.GPT_MODEL || 'gpt-4o-mini',
    apiKey: process.env.GPT_API_KEY || process.env.OPENAI_API_KEY,
    type: 'openai',
  },
  gemini: {
    url: process.env.GEMINI_BASE_URL || 'https://www.heiyucode.com/v1/chat/completions',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    type: 'openai', // 走 OpenAI 兼容格式
  },
  deepseek: {
    url: process.env.DEEPSEEK_BASE_URL || 'https://www.heiyucode.com/v1/chat/completions',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY,
    type: 'openai',
  },
};

// 调用 Anthropic 格式
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

// 调用 OpenAI 兼容格式
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

// API 端点
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

// 赔率查询（前端轮询）
const bets = { claude: 0, gpt: 0, gemini: 0, deepseek: 0 };

app.get('/api/odds', (req, res) => {
  const total = Object.values(bets).reduce((s, v) => s + v, 0) || 1;
  const odds = {};
  for (const [k, v] of Object.entries(bets)) {
    const share = v / total;
    // 赔率 = 1 / 下注占比（最低1.1，最高20）
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

// 重置（新一局）
app.post('/api/reset-bets', (req, res) => {
  for (const k of Object.keys(bets)) bets[k] = 0;
  res.json({ ok: true });
});

// 健康检查
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
