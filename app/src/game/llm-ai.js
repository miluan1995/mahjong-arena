/**
 * LLM 麻将 AI — 调大模型 API 决策出牌
 * 四个模型各代表一个选手
 */

const SUIT_LABEL = { wan: '万', tiao: '条', tong: '筒' };
const RANK_LABEL = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

function tileName(t) { return RANK_LABEL[t.rank] + SUIT_LABEL[t.suit]; }
function handStr(hand) { return hand.map(tileName).join(' '); }

// 四个大模型配置
export const LLM_PLAYERS = [
  {
    key: 'claude', name: 'Claude', emoji: '🐻', color: '#d97706',
    provider: 'anthropic', desc: 'Anthropic Claude — 推理见长',
  },
  {
    key: 'gpt', name: 'GPT', emoji: '🤖', color: '#10a37f',
    provider: 'openai', desc: 'OpenAI GPT — 通用王者',
  },
  {
    key: 'gemini', name: 'Gemini', emoji: '🧠', color: '#4285f4',
    provider: 'google', desc: 'Google Gemini — 多模态大脑',
  },
  {
    key: 'deepseek', name: 'DeepSeek', emoji: '🔮', color: '#7c3aed',
    provider: 'deepseek', desc: 'DeepSeek — 国产之光',
  },
];

/**
 * 构建给 LLM 的 prompt
 */
function buildPrompt(hand, melds, discardPile, availableActions, phase) {
  const handText = handStr(hand);
  const meldsText = melds.length > 0
    ? melds.map(m => `[${m.type}: ${m.tiles.map(tileName).join(' ')}]`).join(' ')
    : '无';
  const discardsText = discardPile.length > 0
    ? discardPile.slice(-10).map(tileName).join(' ')
    : '无';

  let actionPrompt = '';
  if (phase === 'discard') {
    actionPrompt = `你需要出一张牌。从手牌中选择一张出掉。
回复格式(严格JSON): {"action":"discard","tile":"X万/X条/X筒"}
示例: {"action":"discard","tile":"三万"}`;
  } else if (phase === 'respond') {
    const acts = [];
    if (availableActions.hu) acts.push('"hu"(胡牌)');
    if (availableActions.gang) acts.push('"gang"(杠)');
    if (availableActions.peng) acts.push('"peng"(碰)');
    acts.push('"pass"(过)');
    actionPrompt = `别人出了 ${availableActions.tile}，你可以: ${acts.join('、')}
回复格式(严格JSON): {"action":"hu/gang/peng/pass"}`;
  } else if (phase === 'afterdraw') {
    const acts = [];
    if (availableActions.hu) acts.push('"hu"(自摸胡)');
    if (availableActions.angang) acts.push('"gang"(暗杠)');
    acts.push('"pass"(不操作,继续出牌)');
    actionPrompt = `你刚摸了一张牌，可以: ${acts.join('、')}
回复格式(严格JSON): {"action":"hu/gang/pass"}`;
  }

  return `你正在打四川麻将(血战到底,108张,万条筒三门)。你要赢。

当前手牌: ${handText}
副露: ${meldsText}
最近弃牌: ${discardsText}

${actionPrompt}

策略提示: 优先做清一色、对对胡等高番型。注意听牌。只回复JSON,不要其他文字。`;
}

/**
 * 解析 LLM 返回
 */
function parseResponse(text, hand, phase) {
  try {
    // 提取 JSON
    const match = text.match(/\{[^}]+\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]);

    if (phase === 'discard') {
      const tileName = obj.tile;
      if (!tileName) return null;
      // 匹配手牌
      for (const t of hand) {
        const name = RANK_LABEL[t.rank] + SUIT_LABEL[t.suit];
        if (name === tileName) return { action: 'discard', tile: t };
      }
      // 模糊匹配
      for (const t of hand) {
        if (tileName.includes(String(t.rank)) || tileName.includes(RANK_LABEL[t.rank])) {
          const suitMatch = Object.entries(SUIT_LABEL).find(([k, v]) => tileName.includes(v));
          if (suitMatch && suitMatch[0] === t.suit) return { action: 'discard', tile: t };
        }
      }
      return null;
    }

    return { action: obj.action || 'pass' };
  } catch {
    return null;
  }
}

/**
 * 调用 LLM API（通过后端代理）
 */
export async function callLLM(playerKey, hand, melds, discardPile, availableActions, phase) {
  const prompt = buildPrompt(hand, melds, discardPile, availableActions, phase);

  try {
    const resp = await fetch('/api/llm-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: playerKey, prompt, phase }),
    });

    if (!resp.ok) throw new Error(`API ${resp.status}`);
    const data = await resp.json();

    const parsed = parseResponse(data.text, hand, phase);
    if (parsed) {
      parsed.thinking = data.thinking || prompt.slice(0, 50) + '...';
      parsed.rawResponse = data.text;
      parsed.latencyMs = data.latencyMs || 0;
      return parsed;
    }
  } catch (e) {
    console.warn(`LLM ${playerKey} failed:`, e.message);
  }

  // Fallback: 随机出牌
  if (phase === 'discard') {
    const idx = Math.floor(Math.random() * hand.length);
    return { action: 'discard', tile: hand[idx], thinking: '(API 超时，随机出牌)', fallback: true };
  }
  return { action: 'pass', thinking: '(API 超时，默认过)', fallback: true };
}

export { buildPrompt, parseResponse, tileName, handStr };
