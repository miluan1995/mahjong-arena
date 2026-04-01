/**
 * 手牌管理 + 胡牌判定（川麻）
 *
 * 胡牌条件：n 组面子(顺子/刻子) + 1 对将
 * 特殊牌型：七对、清一色、对对胡、杠上开花等
 */

import { Tile, Suit, Rank, tilesEqual, countTiles, getCount } from './tiles';

// ============ 胡牌判定 ============

/** 基本胡牌检测：能否拆成 n×面子 + 1×对子 */
export function canWinBasic(tiles: Tile[]): boolean {
  if (tiles.length % 3 !== 2) return false;

  // 尝试每种可能的将（对子）
  const suits: Suit[] = ['wan', 'tiao', 'tong'];
  const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  for (const suit of suits) {
    for (const rank of ranks) {
      // 找这种牌是否有 >= 2 张
      const matching = tiles.filter(t => t.suit === suit && t.rank === rank);
      if (matching.length < 2) continue;

      // 取出将，剩余检查能否全拆成面子
      const remaining = removeTiles(tiles, [matching[0], matching[1]]);
      if (canFormMelds(remaining)) return true;
    }
  }

  return false;
}

/** 七对判定 */
export function isSevenPairs(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;
  const counts = countTiles(tiles);
  for (const count of counts.values()) {
    if (count !== 2 && count !== 4) return false; // 4 张算两对
  }
  return counts.size === 7 || // 7 种不同的对子
    Array.from(counts.values()).reduce((sum, c) => sum + Math.floor(c / 2), 0) === 7;
}

/** 清一色判定 */
export function isFlush(tiles: Tile[], melds: Meld[] = []): boolean {
  const allTiles = [...tiles, ...melds.flatMap(m => m.tiles)];
  if (allTiles.length === 0) return false;
  const suit = allTiles[0].suit;
  return allTiles.every(t => t.suit === suit);
}

/** 对对胡判定（全是刻子+将） */
export function isAllTriplets(tiles: Tile[]): boolean {
  if (tiles.length % 3 !== 2) return false;

  const suits: Suit[] = ['wan', 'tiao', 'tong'];
  const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  for (const suit of suits) {
    for (const rank of ranks) {
      const matching = tiles.filter(t => t.suit === suit && t.rank === rank);
      if (matching.length < 2) continue;

      const remaining = removeTiles(tiles, [matching[0], matching[1]]);
      if (canFormTripletsOnly(remaining)) return true;
    }
  }

  return false;
}

// ============ 面子拆解 ============

/** 检查一组牌能否全拆成面子（顺子 + 刻子） */
function canFormMelds(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true;
  if (tiles.length % 3 !== 0) return false;

  // 按花色分组处理（顺子不能跨花色）
  const bySuit = groupBySuit(tiles);

  for (const suit of ['wan', 'tiao', 'tong'] as Suit[]) {
    const suitTiles = bySuit.get(suit) ?? [];
    if (suitTiles.length % 3 !== 0) return false;
    if (!canFormMeldsSingleSuit(suitTiles)) return false;
  }

  return true;
}

/** 单一花色面子拆解（回溯） */
function canFormMeldsSingleSuit(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true;

  // 按点数排序
  const sorted = [...tiles].sort((a, b) => a.rank - b.rank);

  // 尝试刻子（三张相同）
  if (sorted.length >= 3 &&
    sorted[0].rank === sorted[1].rank &&
    sorted[1].rank === sorted[2].rank) {
    const rest = sorted.slice(3);
    if (canFormMeldsSingleSuit(rest)) return true;
  }

  // 尝试顺子（三张连续）
  if (sorted.length >= 3) {
    const first = sorted[0];
    const secondIdx = sorted.findIndex((t, i) => i > 0 && t.rank === (first.rank + 1 as Rank));
    if (secondIdx !== -1) {
      const thirdIdx = sorted.findIndex((t, i) => i > secondIdx && t.rank === (first.rank + 2 as Rank));
      if (thirdIdx !== -1) {
        const rest = [...sorted];
        // 从后往前删避免索引偏移
        rest.splice(thirdIdx, 1);
        rest.splice(secondIdx, 1);
        rest.splice(0, 1);
        if (canFormMeldsSingleSuit(rest)) return true;
      }
    }
  }

  return false;
}

/** 检查能否全拆成刻子（对对胡用） */
function canFormTripletsOnly(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true;
  if (tiles.length % 3 !== 0) return false;

  const counts = countTiles(tiles);
  for (const count of counts.values()) {
    if (count !== 3) return false;
  }
  return true;
}

// ============ 听牌判定 ============

/** 检测听哪些牌 */
export function getWaitingTiles(hand: Tile[], melds: Meld[] = []): Tile[] {
  const waiting: Tile[] = [];
  const seen = new Set<string>();

  const suits: Suit[] = ['wan', 'tiao', 'tong'];
  const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  for (const suit of suits) {
    for (const rank of ranks) {
      const key = `${suit}_${rank}`;
      if (seen.has(key)) continue;

      // 模拟摸到这张牌
      const testHand = [...hand, { suit, rank, id: -1 } as Tile];
      const allTiles = [...testHand, ...melds.flatMap(m => m.tiles)];

      if (canWinBasic(testHand) || isSevenPairs(testHand)) {
        waiting.push({ suit, rank, id: -1 });
        seen.add(key);
      }
    }
  }

  return waiting;
}

// ============ 副露（吃碰杠） ============

export type MeldType = 'chi' | 'peng' | 'gang_ming' | 'gang_an' | 'gang_jia';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  fromPlayer?: number; // 来源玩家座位
}

/** 检查能否碰（手中有 2 张相同） */
export function canPeng(hand: Tile[], discarded: Tile): boolean {
  return hand.filter(t => t.suit === discarded.suit && t.rank === discarded.rank).length >= 2;
}

/** 检查能否明杠（手中有 3 张相同） */
export function canGangMing(hand: Tile[], discarded: Tile): boolean {
  return hand.filter(t => t.suit === discarded.suit && t.rank === discarded.rank).length >= 3;
}

/** 检查能否暗杠（手中有 4 张相同） */
export function getAnGangOptions(hand: Tile[]): Tile[][] {
  const counts = countTiles(hand);
  const options: Tile[][] = [];
  for (const [key, count] of counts) {
    if (count === 4) {
      const [suit, rankStr] = key.split('_');
      const tiles = hand.filter(t => t.suit === suit && t.rank === Number(rankStr));
      options.push(tiles);
    }
  }
  return options;
}

/** 检查能否加杠（已碰的牌，摸到第 4 张） */
export function canGangJia(melds: Meld[], tile: Tile): boolean {
  return melds.some(m =>
    m.type === 'peng' &&
    m.tiles[0].suit === tile.suit &&
    m.tiles[0].rank === tile.rank
  );
}

/** 检查能否吃（上家出的牌，能组成顺子） */
export function getChiOptions(hand: Tile[], discarded: Tile): Tile[][] {
  const options: Tile[][] = [];
  const suit = discarded.suit;
  const rank = discarded.rank;

  // 三种顺子组合
  const combos: [number, number][] = [
    [rank - 2, rank - 1], // XX_ 型
    [rank - 1, rank + 1], // X_X 型
    [rank + 1, rank + 2], // _XX 型
  ];

  for (const [r1, r2] of combos) {
    if (r1 < 1 || r1 > 9 || r2 < 1 || r2 > 9) continue;

    const t1 = hand.find(t => t.suit === suit && t.rank === r1 as Rank);
    const t2 = hand.find(t => t.suit === suit && t.rank === r2 as Rank && t.id !== t1?.id);

    if (t1 && t2) {
      options.push([t1, t2]);
    }
  }

  return options;
}

// ============ 工具函数 ============

function removeTiles(from: Tile[], toRemove: Tile[]): Tile[] {
  const result = [...from];
  for (const t of toRemove) {
    const idx = result.findIndex(r => r.id === t.id);
    if (idx !== -1) result.splice(idx, 1);
  }
  return result;
}

function groupBySuit(tiles: Tile[]): Map<Suit, Tile[]> {
  const map = new Map<Suit, Tile[]>();
  for (const t of tiles) {
    if (!map.has(t.suit)) map.set(t.suit, []);
    map.get(t.suit)!.push(t);
  }
  return map;
}

// ============ 番数计算（川麻简版） ============

export interface WinResult {
  isWin: boolean;
  fan: number;
  types: string[];
}

export function calculateWin(hand: Tile[], melds: Meld[], winTile: Tile, isSelfDraw: boolean): WinResult {
  const allHandTiles = [...hand, winTile];
  const result: WinResult = { isWin: false, fan: 0, types: [] };

  const basicWin = canWinBasic(allHandTiles);
  const sevenPairs = isSevenPairs(allHandTiles);

  if (!basicWin && !sevenPairs) return result;

  result.isWin = true;

  // 基础 1 番
  result.fan = 1;
  result.types.push('平胡');

  // 自摸 +1
  if (isSelfDraw) {
    result.fan += 1;
    result.types = result.types.filter(t => t !== '平胡');
    result.types.push('自摸');
  }

  // 清一色 +4
  if (isFlush(allHandTiles, melds)) {
    result.fan += 4;
    result.types.push('清一色');
  }

  // 对对胡 +2
  if (isAllTriplets(allHandTiles)) {
    result.fan += 2;
    result.types.push('对对胡');
  }

  // 七对 +4
  if (sevenPairs) {
    result.fan = 4;
    result.types = ['七对'];
    if (isSelfDraw) {
      result.fan += 1;
      result.types.push('自摸');
    }
    if (isFlush(allHandTiles)) {
      result.fan += 4;
      result.types.push('清一色');
    }
  }

  // 杠上开花 +2
  // (由 game.ts 在外部判断)

  return result;
}
