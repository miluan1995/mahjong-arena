/**
 * AI 策略基类 + 4 种个性 AI
 * 纯算法，零 API 成本，毫秒级决策
 */

import { Tile, Suit, Rank, tileKey, countTiles, tileName, sortHand } from '../engine/tiles';
import {
  canWinBasic, isSevenPairs, getWaitingTiles,
  canPeng, getAnGangOptions, canGangJia,
  getChiOptions, Meld, isFlush,
} from '../engine/hand';
import {
  GameState, PlayerSeat, PendingAction,
  getAvailableActions, nextActivePlayer,
} from '../engine/game';

export interface AIDecision {
  action: 'discard' | 'chi' | 'peng' | 'gang' | 'hu' | 'pass';
  tile?: Tile;
  tiles?: Tile[];
  thinkingText?: string;  // 给观众看的思考过程
}

export interface AIStrategy {
  name: string;
  emoji: string;
  style: string;
  
  /** 决定出哪张牌 */
  chooseDiscard(hand: Tile[], melds: Meld[], state: GameState, seat: PlayerSeat): AIDecision;
  
  /** 决定是否响应别人出的牌 */
  respondToDiscard(hand: Tile[], melds: Meld[], discardedTile: Tile, available: PendingAction[], state: GameState): AIDecision;
  
  /** 摸牌后决定（暗杠/加杠/自摸胡） */
  afterDraw(hand: Tile[], melds: Meld[], drawnTile: Tile, state: GameState, seat: PlayerSeat): AIDecision;
}

// ============ 通用工具 ============

/** 评估一张牌的"无用度"——越高越应该打掉 */
function tileUselessness(tile: Tile, hand: Tile[], melds: Meld[]): number {
  let score = 0;
  const counts = countTiles(hand);
  const key = `${tile.suit}_${tile.rank}`;
  const count = counts.get(key) ?? 0;

  // 孤张（只有 1 张）得分高
  if (count === 1) score += 3;
  
  // 边张（1、9）得分高
  if (tile.rank === 1 || tile.rank === 9) score += 2;
  
  // 没有相邻牌
  const hasAdjacent = hand.some(t =>
    t.suit === tile.suit && t.id !== tile.id &&
    Math.abs(t.rank - tile.rank) <= 2
  );
  if (!hasAdjacent) score += 4;

  // 如果打掉后听牌数更多，加分
  const handWithout = hand.filter(t => t.id !== tile.id);
  const waitingAfter = getWaitingTiles(handWithout, melds);
  score += waitingAfter.length * 2;

  return score;
}

/** 找最无用的牌 */
function findMostUseless(hand: Tile[], melds: Meld[]): Tile {
  let best = hand[0];
  let bestScore = -1;

  for (const tile of hand) {
    const score = tileUselessness(tile, hand, melds);
    if (score > bestScore) {
      bestScore = score;
      best = tile;
    }
  }
  return best;
}

// ============ 激进型 AI：黑瞎子 🐻 ============

export const aggressiveAI: AIStrategy = {
  name: '黑瞎子',
  emoji: '🐻',
  style: '大牌优先，敢赌敢冲',

  chooseDiscard(hand, melds, state, seat) {
    // 优先做清一色：找最多花色，打其他花色
    const suitCounts = new Map<Suit, number>();
    for (const t of hand) {
      suitCounts.set(t.suit, (suitCounts.get(t.suit) ?? 0) + 1);
    }
    
    let mainSuit: Suit = 'wan';
    let maxCount = 0;
    for (const [suit, count] of suitCounts) {
      if (count > maxCount) { maxCount = count; mainSuit = suit; }
    }

    // 如果某花色占 60%+，尝试清一色
    if (maxCount >= hand.length * 0.6) {
      const offSuit = hand.filter(t => t.suit !== mainSuit);
      if (offSuit.length > 0) {
        return {
          action: 'discard',
          tile: offSuit[0],
          thinkingText: `做清一色，打掉 ${tileName(offSuit[0])}`,
        };
      }
    }

    const tile = findMostUseless(hand, melds);
    return {
      action: 'discard',
      tile,
      thinkingText: `${tileName(tile)} 用处不大`,
    };
  },

  respondToDiscard(hand, melds, discardedTile, available) {
    // 能胡必胡
    const huAction = available.find(a => a.type === 'hu');
    if (huAction) return { action: 'hu', thinkingText: '胡了！🔥' };

    // 能杠就杠（激进）
    const gangAction = available.find(a => a.type === 'gang');
    if (gangAction) return { action: 'gang', thinkingText: '杠！💪' };

    // 碰也碰
    const pengAction = available.find(a => a.type === 'peng');
    if (pengAction) return { action: 'peng', thinkingText: '碰！' };

    return { action: 'pass' };
  },

  afterDraw(hand, melds, drawnTile, state, seat) {
    // 自摸胡
    if (canWinBasic(hand) || isSevenPairs(hand)) {
      return { action: 'hu', tile: drawnTile, thinkingText: '自摸！🎉' };
    }

    // 暗杠
    const anGang = getAnGangOptions(hand);
    if (anGang.length > 0) {
      return { action: 'gang', tiles: anGang[0], thinkingText: '暗杠！' };
    }

    // 加杠
    if (canGangJia(melds, drawnTile)) {
      return { action: 'gang', tile: drawnTile, thinkingText: '加杠！' };
    }

    return { action: 'pass' };
  },
};

// ============ 保守型 AI：铁柱 🔨 ============

export const defensiveAI: AIStrategy = {
  name: '铁柱',
  emoji: '🔨',
  style: '小胡为主，稳扎稳打',

  chooseDiscard(hand, melds, state, seat) {
    // 保守：优先打危险牌（别人可能要的），保留安全牌
    const tile = findMostUseless(hand, melds);
    return {
      action: 'discard',
      tile,
      thinkingText: `稳一手，打 ${tileName(tile)}`,
    };
  },

  respondToDiscard(hand, melds, discardedTile, available) {
    const huAction = available.find(a => a.type === 'hu');
    if (huAction) return { action: 'hu', thinkingText: '胡了，稳稳的 😌' };

    // 保守：不轻易碰杠，破坏手牌结构
    const gangAction = available.find(a => a.type === 'gang');
    if (gangAction) return { action: 'gang', thinkingText: '杠一个' };

    // 只有听牌附近才碰
    const pengAction = available.find(a => a.type === 'peng');
    if (pengAction && hand.length <= 5) {
      return { action: 'peng', thinkingText: '快听了，碰' };
    }

    return { action: 'pass' };
  },

  afterDraw(hand, melds, drawnTile, state, seat) {
    if (canWinBasic(hand) || isSevenPairs(hand)) {
      return { action: 'hu', tile: drawnTile, thinkingText: '自摸，美滋滋 😊' };
    }
    const anGang = getAnGangOptions(hand);
    if (anGang.length > 0) {
      return { action: 'gang', tiles: anGang[0], thinkingText: '暗杠' };
    }
    return { action: 'pass' };
  },
};

// ============ 计算型 AI：算盘 🧮 ============

export const calculatingAI: AIStrategy = {
  name: '算盘',
  emoji: '🧮',
  style: '最优解，效率至上',

  chooseDiscard(hand, melds, state, seat) {
    // 计算每张牌打出后的听牌数，选最优
    let bestTile = hand[0];
    let bestWaiting = -1;

    for (const tile of hand) {
      const remaining = hand.filter(t => t.id !== tile.id);
      const waiting = getWaitingTiles(remaining, melds);
      if (waiting.length > bestWaiting) {
        bestWaiting = waiting.length;
        bestTile = tile;
      }
    }

    return {
      action: 'discard',
      tile: bestTile,
      thinkingText: bestWaiting > 0
        ? `打 ${tileName(bestTile)}，听 ${bestWaiting} 张`
        : `打 ${tileName(bestTile)}，向听 -1`,
    };
  },

  respondToDiscard(hand, melds, discardedTile, available) {
    const huAction = available.find(a => a.type === 'hu');
    if (huAction) return { action: 'hu', thinkingText: '计算完毕，胡 📊' };

    // 计算碰/杠后是否向听数更好
    const gangAction = available.find(a => a.type === 'gang');
    if (gangAction) return { action: 'gang', thinkingText: '杠，期望值 +' };

    const pengAction = available.find(a => a.type === 'peng');
    if (pengAction) {
      // 碰了之后听牌数更多才碰
      const afterPeng = hand.filter(t =>
        !(t.suit === discardedTile.suit && t.rank === discardedTile.rank)
      ).slice(0, hand.length - 2);
      const waiting = getWaitingTiles(afterPeng, melds);
      if (waiting.length > 0) {
        return { action: 'peng', thinkingText: `碰，听 ${waiting.length} 张` };
      }
    }

    return { action: 'pass' };
  },

  afterDraw(hand, melds, drawnTile, state, seat) {
    if (canWinBasic(hand) || isSevenPairs(hand)) {
      return { action: 'hu', tile: drawnTile, thinkingText: '自摸 ✓' };
    }
    const anGang = getAnGangOptions(hand);
    if (anGang.length > 0) {
      return { action: 'gang', tiles: anGang[0], thinkingText: '暗杠，正 EV' };
    }
    if (canGangJia(melds, drawnTile)) {
      return { action: 'gang', tile: drawnTile, thinkingText: '加杠' };
    }
    return { action: 'pass' };
  },
};

// ============ 混沌型 AI：锦鲤 🐟 ============

export const chaoticAI: AIStrategy = {
  name: '锦鲤',
  emoji: '🐟',
  style: '随机但偶尔神操作',

  chooseDiscard(hand, melds) {
    // 80% 随机，20% 最优
    if (Math.random() < 0.2) {
      return calculatingAI.chooseDiscard(hand, melds, {} as GameState, 0 as PlayerSeat);
    }

    const idx = Math.floor(Math.random() * hand.length);
    const tile = hand[idx];
    const quips = ['随便打一张~', '感觉不错！', '跟着感觉走', '这张有灵气', '闭眼出牌'];
    return {
      action: 'discard',
      tile,
      thinkingText: quips[Math.floor(Math.random() * quips.length)],
    };
  },

  respondToDiscard(hand, melds, discardedTile, available) {
    const huAction = available.find(a => a.type === 'hu');
    if (huAction) return { action: 'hu', thinkingText: '哈哈胡了！运气来了 🍀' };

    // 50% 概率碰/杠
    const gangAction = available.find(a => a.type === 'gang');
    if (gangAction && Math.random() < 0.5) {
      return { action: 'gang', thinkingText: '杠着玩~' };
    }

    const pengAction = available.find(a => a.type === 'peng');
    if (pengAction && Math.random() < 0.5) {
      return { action: 'peng', thinkingText: '碰碰碰！' };
    }

    return { action: 'pass' };
  },

  afterDraw(hand, melds, drawnTile, state, seat) {
    if (canWinBasic(hand) || isSevenPairs(hand)) {
      return { action: 'hu', tile: drawnTile, thinkingText: '自摸！锦鲤附体 🐟✨' };
    }
    const anGang = getAnGangOptions(hand);
    if (anGang.length > 0 && Math.random() < 0.7) {
      return { action: 'gang', tiles: anGang[0], thinkingText: '暗杠~' };
    }
    return { action: 'pass' };
  },
};

export const AI_STRATEGIES: AIStrategy[] = [aggressiveAI, defensiveAI, calculatingAI, chaoticAI];
