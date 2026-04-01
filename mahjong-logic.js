// 胡牌判定 + 番数计算
export class MahjongLogic {
  // 牌的表示: { suit: 'w'|'t'|'s', rank: 1-9 }
  
  static canHu(hand) {
    // 检查是否能胡
    if (hand.length !== 14) return false;
    
    // 尝试七对
    if (this.checkSevenPairs(hand)) return true;
    
    // 尝试标准胡（5组+1对）
    return this.checkStandardHu(hand);
  }

  static checkSevenPairs(hand) {
    if (hand.length !== 14) return false;
    const sorted = this.sortTiles(hand);
    const pairs = [];
    
    for (let i = 0; i < sorted.length; i += 2) {
      if (i + 1 >= sorted.length) return false;
      if (!this.tilesEqual(sorted[i], sorted[i + 1])) return false;
      pairs.push(sorted[i]);
    }
    return pairs.length === 7;
  }

  static checkStandardHu(hand) {
    if (hand.length !== 14) return false;
    
    const sorted = this.sortTiles(hand);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (this.tilesEqual(sorted[i], sorted[j])) {
          const remaining = sorted.filter((_, idx) => idx !== i && idx !== j);
          if (this.canFormGroups(remaining, 4)) return true;
        }
      }
    }
    return false;
  }

  static canFormGroups(tiles, groupCount) {
    if (groupCount === 0) return tiles.length === 0;
    if (tiles.length < 3) return false;

    const sorted = this.sortTiles(tiles);
    const first = sorted[0];

    // 尝试刻子（3张相同）
    if (sorted.filter(t => this.tilesEqual(t, first)).length >= 3) {
      const remaining = sorted.slice();
      for (let i = 0; i < 3; i++) {
        remaining.splice(remaining.findIndex(t => this.tilesEqual(t, first)), 1);
      }
      if (this.canFormGroups(remaining, groupCount - 1)) return true;
    }

    // 尝试顺子（3张连续）
    if (first.suit !== 'z' && first.rank <= 7) {
      const second = { suit: first.suit, rank: first.rank + 1 };
      const third = { suit: first.suit, rank: first.rank + 2 };
      
      if (sorted.some(t => this.tilesEqual(t, second)) && 
          sorted.some(t => this.tilesEqual(t, third))) {
        const remaining = sorted.slice();
        remaining.splice(remaining.findIndex(t => this.tilesEqual(t, first)), 1);
        remaining.splice(remaining.findIndex(t => this.tilesEqual(t, second)), 1);
        remaining.splice(remaining.findIndex(t => this.tilesEqual(t, third)), 1);
        if (this.canFormGroups(remaining, groupCount - 1)) return true;
      }
    }

    return false;
  }

  static calculateFan(hand, melds, isZimo) {
    let fan = 0;

    // 七对
    if (this.checkSevenPairs(hand)) fan += 2;

    // 全刻
    if (melds.every(m => m.type === 'peng' || m.type === 'gang')) fan += 2;

    // 清一色
    const suits = new Set(hand.map(t => t.suit));
    if (suits.size === 1) fan += 3;

    // 金钩钓鱼（自摸最后一张）
    if (isZimo) fan += 1;

    // 十八罗汉（全是1和9）
    if (hand.every(t => t.rank === 1 || t.rank === 9)) fan += 3;

    return Math.max(fan, 1); // 最少1番
  }

  static calculateScore(fan, isZimo, playerCount = 4) {
    const base = Math.pow(2, fan);
    if (isZimo) {
      // 自摸：3人各付
      return base * 3;
    } else {
      // 点炮：1人付全部
      return base;
    }
  }

  static sortTiles(tiles) {
    const order = { w: 0, t: 1, s: 2, z: 3 };
    return [...tiles].sort((a, b) => {
      if (order[a.suit] !== order[b.suit]) return order[a.suit] - order[b.suit];
      return a.rank - b.rank;
    });
  }

  static tilesEqual(a, b) {
    return a.suit === b.suit && a.rank === b.rank;
  }
}
