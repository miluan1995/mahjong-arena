// Mahjong Arena - Agent Server
// 轻量 API server，桥接前端与 OpenClaw Agent
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = 3852;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===== LLM 分析 =====
async function analyzeWithLLM(gameState) {
  const { type, hand, melds, discards, otherDiscards, wallRemain, turn, lastDiscard, availableActions } = gameState;

  const handStr = hand.map(t => `${t.suit}${t.rank}`).join(' ');
  const meldStr = melds.map(m => `[${m.type}: ${m.tiles.map(t => `${t.suit}${t.rank}`).join(',')}]`).join(' ');

  let prompt = '';
  if (type === 'discard') {
    prompt = `你是一个川麻(血战到底)高手AI。现在轮到你出牌。
手牌: ${handStr}
副露: ${meldStr || '无'}
牌墙剩余: ${wallRemain}张
第${turn}手

分析手牌牌型，选择最优出牌。考虑:
1. 距离听牌还差几步
2. 哪些牌是孤张/废牌
3. 是否在做特殊牌型(清一色/七对)
4. 安全牌(别人打过的)

返回JSON: {"action":"discard","tileIndex":<手牌序号0-based>,"thinking":"<分析过程>","text":"<简短理由>"}`;

  } else if (type === 'respond') {
    prompt = `你是一个川麻(血战到底)高手AI。有人打出了 ${lastDiscard.suit}${lastDiscard.rank}。
手牌: ${handStr}
副露: ${meldStr || '无'}
可选动作: ${JSON.stringify(availableActions)}
牌墙剩余: ${wallRemain}张

分析是否要碰/杠/胡/过。考虑:
1. 碰/杠后是否更接近听牌
2. 碰了会暴露牌型吗
3. 过了等更好的机会?

返回JSON: {"action":"<hu|peng|gang|pass>","thinking":"<分析>","text":"<简短理由>"}`;

  } else if (type === 'afterdraw') {
    prompt = `你是一个川麻(血战到底)高手AI。你刚摸了一张牌。
手牌: ${handStr}
副露: ${meldStr || '无'}
可选动作: ${JSON.stringify(availableActions)}
牌墙剩余: ${wallRemain}张

检查是否自摸/暗杠/加杠/过。

返回JSON: {"action":"<hu|angang|jiagang|pass>","thinking":"<分析>","text":"<简短理由>"}`;
  }

  try {
    const res = await fetch('http://127.0.0.1:8402/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '你是川麻AI。始终返回有效JSON。简短分析，果断决策。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    // 提取 JSON
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    return { action: 'pass', thinking: content, text: 'AI 分析中...' };
  } catch (e) {
    console.error('LLM error:', e.message);
    return null; // 降级为 rule-based
  }
}

// ===== HTTP Server =====
const server = http.createServer(async (req, res) => {
  // CORS
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
        res.end(JSON.stringify(decision || { action: 'pass', thinking: 'LLM 不可用', text: '降级模式' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', model: 'gpt-4o-mini', endpoint: '127.0.0.1:8402' }));
    return;
  }

  res.writeHead(404); res.end('Not Found');
});

server.listen(PORT, () => console.log(`🀄 Mahjong Agent Server on http://localhost:${PORT}`));
