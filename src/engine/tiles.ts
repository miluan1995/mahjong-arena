/**
 * 川麻牌定义
 * 万(wan)、条(tiao)、筒(tong)，各 1-9，每种 4 张 = 108 张
 * 无字牌、无花牌
 */

// 花色
export type Suit = 'wan' | 'tiao' | 'tong';

// 牌面值 1-9
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// 一张牌
export interface Tile {
  suit: Suit;
  rank: Rank;
  id: number; // 唯一标识 0-107
}

// 牌的显示名
const SUIT_NAMES: Record<Suit, string> = {
  wan: '万',
  tiao: '条',
  tong: '筒',
};

const RANK_NAMES: Record<Rank, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九',
};

export function tileName(tile: Tile): string {
  return `${RANK_NAMES[tile.rank]}${SUIT_NAMES[tile.suit]}`;
}

/** 牌的排序键（用于手牌排序） */
export function tileKey(tile: Tile): number {
  const suitOrder: Record<Suit, number> = { wan: 0, tiao: 1, tong: 2 };
  return suitOrder[tile.suit] * 10 + tile.rank;
}

/** 两张牌是否相同（花色 + 点数） */
export function tilesEqual(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/** 生成完整的 108 张牌 */
export function createFullDeck(): Tile[] {
  const deck: Tile[] = [];
  let id = 0;
  const suits: Suit[] = ['wan', 'tiao', 'tong'];
  const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  for (const suit of suits) {
    for (const rank of ranks) {
      for (let copy = 0; copy < 4; copy++) {
        deck.push({ suit, rank, id: id++ });
      }
    }
  }

  return deck; // 108 张
}

/** Fisher-Yates 洗牌 */
export function shuffleDeck(deck: Tile[]): Tile[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 按 tileKey 排序手牌 */
export function sortHand(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => tileKey(a) - tileKey(b));
}

/** 将牌按花色+点数分组计数 */
export function countTiles(tiles: Tile[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tiles) {
    const key = `${t.suit}_${t.rank}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** 从计数 map 获取某牌数量 */
export function getCount(counts: Map<string, number>, suit: Suit, rank: Rank): number {
  return counts.get(`${suit}_${rank}`) ?? 0;
}
