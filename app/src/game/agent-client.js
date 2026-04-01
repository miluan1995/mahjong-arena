// Agent 客户端 — 桥接前端与 Agent Server
// Agent 模式：用 LLM 分析; 不可用时降级 rule-based

const AGENT_URL = 'http://localhost:3852';
let agentAvailable = null; // null=未检测, true/false

export async function checkAgentServer() {
  try {
    const res = await fetch(`${AGENT_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    agentAvailable = data.status === 'ok';
  } catch {
    agentAvailable = false;
  }
  return agentAvailable;
}

export function isAgentAvailable() { return agentAvailable === true; }

// 把游戏状态序列化为 API 请求
function serializeState(g, type, extras = {}) {
  const p = g.players[0]; // agent 总是 seat 0
  return {
    type,
    hand: p.hand.map(t => ({ suit: t.suit, rank: t.rank, id: t.id })),
    melds: p.melds.map(m => ({
      type: m.type,
      tiles: m.tiles.map(t => ({ suit: t.suit, rank: t.rank })),
    })),
    discards: p.discards.map(t => ({ suit: t.suit, rank: t.rank })),
    otherDiscards: Object.fromEntries(
      g.players.filter((_, i) => i !== 0).map(pp => [pp.seat, pp.discards.map(t => ({ suit: t.suit, rank: t.rank }))])
    ),
    wallRemain: g.wall.length,
    turn: g.turn,
    ...extras,
  };
}

// 调用 Agent Server 获取决策
export async function agentDecide(g, type, extras = {}) {
  if (!agentAvailable) return null;
  try {
    const state = serializeState(g, type, extras);
    const res = await fetch(`${AGENT_URL}/api/agent/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
      signal: AbortSignal.timeout(10000),
    });
    return await res.json();
  } catch (e) {
    console.warn('Agent decide failed:', e.message);
    return null;
  }
}

// 模拟思考延迟 (给 rule-based fallback 加点戏)
const THINKING_LINES = {
  discard: [
    '分析手牌结构...',
    '计算听牌概率...',
    '评估安全牌...',
    '检查对手弃牌...',
    '做出最优决策 ✓',
  ],
  respond: [
    '评估碰/杠收益...',
    '计算牌效损失...',
    '判断防守需求...',
    '决策完成 ✓',
  ],
  afterdraw: [
    '检查自摸牌型...',
    '评估暗杠价值...',
    '分析 ✓',
  ],
};

export function getThinkingSteps(type) {
  return THINKING_LINES[type] || THINKING_LINES.discard;
}
