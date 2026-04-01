// 川麻番型计算器
// 血战到底计分：根据胡牌牌型计算番数，2^番 = 底分倍数
import { SUITS, countMap, tileKey } from './engine.js';

/**
 * 计算胡牌番型
 * @param {Array} hand - 手牌（含胡的那张）
 * @param {Array} melds - 副露（碰/杠）
 * @param {Object} ctx - 上下文 { selfDraw, lastTile, isGangDraw, wallEmpty }
 * @returns {{ fan: number, types: string[], base: number }}
 */
export function calcFan(hand, melds = [], ctx = {}) {
  const types = [];
  let fan = 0;

  const allTiles = [...hand, ...melds.flatMap(m => m.tiles)];
  const handOnly = hand; // 不含副露的手牌

  // ===== 基础番 =====

  // 自摸 +1番
  if (ctx.selfDraw) {
    fan += 1;
    types.push('自摸');
  }

  // ===== 牌型番 =====

  // 七对子 +2番
  if (hand.length === 14) {
    const m = countMap(hand);
    const vals = Object.values(m);
    if (vals.every(v => v === 2 || v === 4) && vals.reduce((s, v) => s + Math.floor(v / 2), 0) === 7) {
      fan += 2;
      types.push('七对');
      // 龙七对（含暗杠的七对） +4番
      if (vals.some(v => v === 4)) {
        fan += 2;
        types.push('龙七对');
      }
    }
  }

  // 对对胡（全是刻子+将，没有顺子） +1番
  if (isAllTriplets(hand, melds)) {
    fan += 1;
    types.push('对对胡');
  }

  // 清一色（只有一种花色） +2番
  const suitsUsed = getSuitsUsed(allTiles);
  if (suitsUsed.length === 1) {
    fan += 2;
    types.push('清一色');
  }

  // 金钩钓（手里只剩1张+将，全靠副露） +3番
  if (handOnly.length === 2 && melds.length >= 4) {
    fan += 3;
    types.push('金钩钓');
  }

  // 十八罗汉（4个杠） +3番
  const gangCount = melds.filter(m => m.type.includes('gang')).length;
  if (gangCount === 4) {
    fan += 3;
    types.push('十八罗汉');
  }

  // 杠上开花（杠后补牌胡） +1番
  if (ctx.isGangDraw) {
    fan += 1;
    types.push('杠上开花');
  }

  // 海底捞月（最后一张牌自摸） +1番
  if (ctx.wallEmpty && ctx.selfDraw) {
    fan += 1;
    types.push('海底捞月');
  }

  // 杠上炮（别人杠后出的牌你胡） +1番
  if (ctx.isGangShot) {
    fan += 1;
    types.push('杠上炮');
  }

  // 根：手中有4张相同的牌（不是杠出去的），每根 +1番
  const roots = countRoots(hand);
  if (roots > 0) {
    fan += roots;
    types.push(`根×${roots}`);
  }

  // 最低1番
  fan = Math.max(fan, 1);

  // 底分 = 2^fan（川麻标准）
  const base = Math.pow(2, fan);

  return { fan, types, base };
}

// 检查是否对对胡
function isAllTriplets(hand, melds) {
  // 副露都是刻子/杠
  for (const m of melds) {
    if (!['peng', 'gang_an', 'gang_ming', 'minggang', 'angang'].includes(m.type)) return false;
  }

  // 手牌部分：一个将 + 全是刻子
  const cm = countMap(hand);
  const vals = Object.values(cm);

  let pairs = 0;
  for (const v of vals) {
    if (v === 2) pairs++;
    else if (v === 3) continue; // 刻子
    else if (v === 1) return false; // 孤张 → 有顺子
    else if (v === 4) { pairs++; } // 4张=刻子+1? 不对，4张当暗杠算
  }

  return pairs === 1;
}

// 获取使用的花色
function getSuitsUsed(tiles) {
  return [...new Set(tiles.map(t => t.suit))];
}

// 计算根（手中4张相同）
function countRoots(hand) {
  const cm = countMap(hand);
  return Object.values(cm).filter(v => v === 4).length;
}

/**
 * 计算川麻积分（血战到底）
 * 自摸：其余3家各出 base 分
 * 点炮：点炮者出 base 分
 */
export function calcScore(fan, selfDraw, playerCount = 3) {
  const base = Math.pow(2, fan);
  if (selfDraw) {
    return base * playerCount; // 自摸三家付
  }
  return base; // 点炮一家付
}
