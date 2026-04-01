/**
 * 🀄 麻将锦标赛模拟 v3 — 正式引擎 + 番型计算 + 链上提交
 */
import crypto from 'crypto';
import fs from 'fs';
import { createDeck, shuffle, sortHand, tileName, canWin, isSevenPairs,
  canPeng, canGangMing, getAnGang, SUITS, countMap, tileKey } from './app/src/game/engine.js';
import { calcFan, calcScore } from './app/src/game/scoring.js';

const AGENTS = [
  { name: '黑瞎子', emoji: '🐻', style: 'aggressive' },
  { name: '铁柱',   emoji: '🔨', style: 'defensive' },
  { name: '算盘',   emoji: '🧮', style: 'calculative' },
  { name: '锦鲤',   emoji: '🐟', style: 'chaotic' },
];

function aiDiscard(hand, style) {
  const sorted = sortHand(hand);
  if (!sorted.length) return null;
  const scores = sorted.map(t => {
    let s = 0;
    for (const o of sorted) {
      if (o.id === t.id) continue;
      if (o.suit === t.suit) {
        const d = Math.abs(o.rank - t.rank);
        if (d === 0) s += 10;
        if (d === 1) s += 5;
        if (d === 2) s += 2;
      }
    }
    return { tile: t, score: s };
  });
  scores.sort((a, b) => a.score - b.score);
  switch (style) {
    case 'aggressive': return scores[0].tile;
    case 'defensive': return scores[Math.min(1, scores.length - 1)].tile;
    case 'calculative': return scores[0].tile;
    case 'chaotic': return scores[Math.floor(Math.random() * scores.length)].tile;
    default: return scores[0].tile;
  }
}

function playOneRound(roundNum) {
  let deck = shuffle(createDeck());
  const hands = [[], [], [], []];
  const melds = [[], [], [], []];
  const discardPiles = [[], [], [], []];
  const actions = [];
  const activePlayers = new Set([0, 1, 2, 3]);
  const winners = []; // 川麻可以多人胡

  for (let i = 0; i < 13; i++)
    for (let p = 0; p < 4; p++) hands[p].push(deck.pop());

  let current = 0;
  let turns = 0;
  let lastGang = false;

  while (deck.length > 0 && turns < 100 && activePlayers.size > 1) {
    if (!activePlayers.has(current)) { current = nextP(current, activePlayers); continue; }

    const drawn = deck.pop();
    hands[current].push(drawn);
    turns++;
    const wallEmpty = deck.length === 0;

    // 暗杠
    const angangs = getAnGang(hands[current]);
    if (angangs.length > 0 && Math.random() > 0.3) {
      const gang = angangs[0];
      melds[current].push({ type: 'angang', tiles: gang });
      hands[current] = hands[current].filter(t => !(t.suit === gang[0].suit && t.rank === gang[0].rank));
      actions.push({ turn: turns, player: current, action: 'angang', tile: tileName(gang[0]) });
      if (deck.length > 0) { hands[current].push(deck.pop()); lastGang = true; }
      // 杠后再检查自摸
    }

    // 自摸
    if (canWin(hands[current]) || isSevenPairs(hands[current])) {
      const { fan, types, base } = calcFan(hands[current], melds[current], {
        selfDraw: true, lastTile: drawn, isGangDraw: lastGang, wallEmpty
      });
      const score = calcScore(fan, true, activePlayers.size - 1);
      winners.push({ player: current, fan, types, score, winType: '自摸' });
      actions.push({ turn: turns, player: current, action: 'zimo', tile: tileName(drawn), fan, types: types.join('+'), score });
      activePlayers.delete(current);
      if (activePlayers.size <= 1) break;
      current = nextP(current, activePlayers);
      lastGang = false;
      continue;
    }

    lastGang = false;

    // 出牌
    const discard = aiDiscard(hands[current], AGENTS[current].style);
    if (!discard) { current = nextP(current, activePlayers); continue; }
    hands[current] = hands[current].filter(t => t.id !== discard.id);
    discardPiles[current].push(discard);
    actions.push({ turn: turns, player: current, action: 'discard', tile: tileName(discard) });

    let claimed = false;
    // 检查胡/杠/碰
    for (let i = 1; i <= 3; i++) {
      const rs = (current + i) % 4;
      if (!activePlayers.has(rs)) continue;

      // 胡
      if (canWin([...hands[rs], discard]) || isSevenPairs([...hands[rs], discard])) {
        hands[rs].push(discard);
        const { fan, types, base } = calcFan(hands[rs], melds[rs], { selfDraw: false, lastTile: discard });
        const score = calcScore(fan, false);
        winners.push({ player: rs, fan, types, score, winType: '点炮', from: current });
        actions.push({ turn: turns, player: rs, action: 'hu', tile: tileName(discard), from: current, fan, types: types.join('+'), score });
        activePlayers.delete(rs);
        claimed = true;
        if (activePlayers.size <= 1) break;
        break;
      }

      // 杠
      if (canGangMing(hands[rs], discard) && Math.random() > 0.4) {
        const used = hands[rs].filter(t => t.suit === discard.suit && t.rank === discard.rank).slice(0, 3);
        for (const t of used) hands[rs] = hands[rs].filter(h => h.id !== t.id);
        melds[rs].push({ type: 'minggang', tiles: [...used, discard] });
        actions.push({ turn: turns, player: rs, action: 'gang', tile: tileName(discard) });
        if (deck.length > 0) { hands[rs].push(deck.pop()); lastGang = true; }
        current = rs; claimed = true; break;
      }

      // 碰
      if (canPeng(hands[rs], discard) && Math.random() > 0.25) {
        const used = hands[rs].filter(t => t.suit === discard.suit && t.rank === discard.rank).slice(0, 2);
        for (const t of used) hands[rs] = hands[rs].filter(h => h.id !== t.id);
        melds[rs].push({ type: 'peng', tiles: [...used, discard] });
        actions.push({ turn: turns, player: rs, action: 'peng', tile: tileName(discard) });
        // 碰后出牌
        const pd = aiDiscard(hands[rs], AGENTS[rs].style);
        if (pd) {
          hands[rs] = hands[rs].filter(t => t.id !== pd.id);
          discardPiles[rs].push(pd);
          actions.push({ turn: turns, player: rs, action: 'discard', tile: tileName(pd) });
        }
        current = rs; claimed = true; break;
      }
    }

    if (activePlayers.size <= 1) break;
    if (!claimed) current = nextP(current, activePlayers);
  }

  // 计算积分
  const scores = [0, 0, 0, 0];
  for (const w of winners) {
    scores[w.player] += w.score;
  }

  return { round: roundNum, winners, scores, turns, actionCount: actions.length, actions };
}

function nextP(cur, active) {
  for (let i = 1; i <= 4; i++) {
    const n = (cur + i) % 4;
    if (active.has(n)) return n;
  }
  return (cur + 1) % 4;
}

// ========== 主流程 ==========

console.log('╔═══════════════════════════════════════════════╗');
console.log('║   🀄 麻将竞技场 — 锦标赛 #0                  ║');
console.log('║   川麻血战到底 · 8局积分赛 · 番型计分          ║');
console.log('║   奖池 0.04 BNB · 冠军独吞(扣5%平台费)       ║');
console.log('╚═══════════════════════════════════════════════╝\n');

AGENTS.forEach(a => console.log(`  ${a.emoji} ${a.name} [${a.style}] — 0.01 BNB ✅`));
console.log('');

const totalScores = [0, 0, 0, 0];
const records = [];
const hashList = [];

for (let r = 0; r < 8; r++) {
  const result = playOneRound(r);
  records.push(result);
  for (let i = 0; i < 4; i++) totalScores[i] += result.scores[i];

  const hash = '0x' + crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
  hashList.push(hash);

  if (result.winners.length > 0) {
    const wStrs = result.winners.map(w => {
      const a = AGENTS[w.player];
      return `${a.emoji}${a.name} ${w.winType}(${w.types.join('+')} ${w.fan}番) +${w.score}分`;
    });
    console.log(`第${r + 1}/8局 | ${wStrs.join(' | ')} | ${result.turns}回合`);
  } else {
    console.log(`第${r + 1}/8局 | 🤝 流局 | ${result.turns}回合`);
  }
  console.log(`  📊 ${AGENTS.map((a, i) => `${a.emoji}${totalScores[i]}`).join(' | ')}`);
}

// 冠军
let champIdx = 0;
for (let i = 1; i < 4; i++) if (totalScores[i] > totalScores[champIdx]) champIdx = i;

const pool = 0.04, fee = pool * 0.05, prize = pool - fee;

console.log('\n══════════════════════════════');
console.log('🏆 最终排名:\n');
const ranking = AGENTS.map((a, i) => ({ ...a, score: totalScores[i] })).sort((a, b) => b.score - a.score);
['🥇', '🥈', '🥉', '  '].forEach((m, i) => {
  const r = ranking[i];
  const p = i === 0 ? ` → ${prize.toFixed(4)} BNB` : '';
  console.log(`  ${m} ${r.emoji} ${r.name}: ${r.score} 分${p}`);
});
console.log(`\n💰 奖池 ${pool} BNB | 平台费 ${fee.toFixed(4)} | 冠军 ${prize.toFixed(4)} BNB`);

// 保存牌谱
const record = {
  tournament: 0, agents: AGENTS, rounds: records, hashes: hashList,
  finalScores: totalScores, champion: AGENTS[champIdx].name, prize,
  ts: new Date().toISOString(),
};
fs.writeFileSync('tournament-record-0.json', JSON.stringify(record, null, 2));
console.log('\n💾 完整牌谱已保存: tournament-record-0.json');

// 输出链上提交命令
console.log('\n⛓️  链上提交命令 (cast send):');
for (let i = 0; i < 8; i++) {
  const sc = records[i].scores;
  console.log(`  局${i + 1}: submitRoundResult(0, ${i}, ${hashList[i].slice(0, 18)}..., [${sc.join(',')}])`);
}
console.log(`  结算: settleTournament(0)`);
