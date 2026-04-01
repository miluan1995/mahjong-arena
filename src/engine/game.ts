/**
 * 川麻血战到底 - 对局控制
 */

import { Tile, createFullDeck, shuffleDeck, sortHand, tileName } from './tiles';
import {
  Meld, MeldType, canPeng, canGangMing, getAnGangOptions,
  canGangJia, getChiOptions, canWinBasic, isSevenPairs,
  calculateWin, WinResult, getWaitingTiles,
} from './hand';

export type PlayerSeat = 0 | 1 | 2 | 3; // 南东北西

export interface Player {
  seat: PlayerSeat;
  name: string;
  hand: Tile[];
  melds: Meld[];
  discards: Tile[];
  isHuman: boolean;
  isOut: boolean;       // 血战：已胡牌出局
  winResult?: WinResult;
  score: number;
}

export type GamePhase = 'waiting' | 'dealing' | 'playing' | 'finished';

export type ActionType = 'draw' | 'discard' | 'chi' | 'peng' | 'gang' | 'hu' | 'pass';

export interface GameAction {
  type: ActionType;
  player: PlayerSeat;
  tile?: Tile;
  tiles?: Tile[];       // 吃/碰/杠用到的牌
  meldType?: MeldType;
  winResult?: WinResult;
  timestamp: number;
}

export interface PendingAction {
  player: PlayerSeat;
  type: ActionType;
  priority: number;     // 胡 > 杠 > 碰 > 吃
  tiles?: Tile[];
  meldType?: MeldType;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  wall: Tile[];          // 牌墙
  currentPlayer: PlayerSeat;
  turnCount: number;
  actions: GameAction[]; // 操作历史
  lastDiscard?: { tile: Tile; player: PlayerSeat };
  gangCount: number;     // 杠牌计数
  // 血战相关
  activePlayers: PlayerSeat[];  // 还在打的玩家
}

/** 创建新对局 */
export function createGame(playerNames: string[], humanSeat: PlayerSeat | null = null): GameState {
  const deck = shuffleDeck(createFullDeck());
  
  const players: Player[] = playerNames.map((name, i) => ({
    seat: i as PlayerSeat,
    name,
    hand: [],
    melds: [],
    discards: [],
    isHuman: humanSeat === i,
    isOut: false,
    score: 0,
  }));

  // 发牌：每人 13 张
  let wallIdx = 0;
  for (const p of players) {
    p.hand = sortHand(deck.slice(wallIdx, wallIdx + 13));
    wallIdx += 13;
  }

  const wall = deck.slice(wallIdx);

  return {
    phase: 'playing',
    players,
    wall,
    currentPlayer: 0,
    turnCount: 0,
    actions: [],
    gangCount: 0,
    activePlayers: [0, 1, 2, 3],
  };
}

/** 摸牌 */
export function drawTile(state: GameState): Tile | null {
  if (state.wall.length === 0) return null;
  const tile = state.wall.shift()!;
  const player = state.players[state.currentPlayer];
  player.hand.push(tile);

  state.actions.push({
    type: 'draw',
    player: state.currentPlayer,
    tile,
    timestamp: Date.now(),
  });

  return tile;
}

/** 出牌 */
export function discardTile(state: GameState, seat: PlayerSeat, tile: Tile): boolean {
  const player = state.players[seat];
  const idx = player.hand.findIndex(t => t.id === tile.id);
  if (idx === -1) return false;

  player.hand.splice(idx, 1);
  player.hand = sortHand(player.hand);
  player.discards.push(tile);

  state.lastDiscard = { tile, player: seat };
  state.actions.push({
    type: 'discard',
    player: seat,
    tile,
    timestamp: Date.now(),
  });

  return true;
}

/** 碰 */
export function executePeng(state: GameState, seat: PlayerSeat, discardedTile: Tile): boolean {
  const player = state.players[seat];
  if (!canPeng(player.hand, discardedTile)) return false;

  const matching = player.hand.filter(t => t.suit === discardedTile.suit && t.rank === discardedTile.rank);
  const used = matching.slice(0, 2);

  // 从手牌移除
  for (const t of used) {
    const idx = player.hand.findIndex(h => h.id === t.id);
    if (idx !== -1) player.hand.splice(idx, 1);
  }

  player.melds.push({
    type: 'peng',
    tiles: [...used, discardedTile],
    fromPlayer: state.lastDiscard?.player,
  });

  player.hand = sortHand(player.hand);
  state.currentPlayer = seat;

  state.actions.push({
    type: 'peng',
    player: seat,
    tile: discardedTile,
    tiles: [...used, discardedTile],
    meldType: 'peng',
    timestamp: Date.now(),
  });

  return true;
}

/** 明杠 */
export function executeGangMing(state: GameState, seat: PlayerSeat, discardedTile: Tile): boolean {
  const player = state.players[seat];
  if (!canGangMing(player.hand, discardedTile)) return false;

  const matching = player.hand.filter(t => t.suit === discardedTile.suit && t.rank === discardedTile.rank);
  const used = matching.slice(0, 3);

  for (const t of used) {
    const idx = player.hand.findIndex(h => h.id === t.id);
    if (idx !== -1) player.hand.splice(idx, 1);
  }

  player.melds.push({
    type: 'gang_ming',
    tiles: [...used, discardedTile],
    fromPlayer: state.lastDiscard?.player,
  });

  player.hand = sortHand(player.hand);
  state.currentPlayer = seat;
  state.gangCount++;

  state.actions.push({
    type: 'gang',
    player: seat,
    tile: discardedTile,
    meldType: 'gang_ming',
    timestamp: Date.now(),
  });

  return true;
}

/** 暗杠 */
export function executeGangAn(state: GameState, seat: PlayerSeat, tiles: Tile[]): boolean {
  const player = state.players[seat];
  if (tiles.length !== 4) return false;

  for (const t of tiles) {
    const idx = player.hand.findIndex(h => h.id === t.id);
    if (idx !== -1) player.hand.splice(idx, 1);
  }

  player.melds.push({
    type: 'gang_an',
    tiles,
  });

  player.hand = sortHand(player.hand);
  state.gangCount++;

  state.actions.push({
    type: 'gang',
    player: seat,
    tiles,
    meldType: 'gang_an',
    timestamp: Date.now(),
  });

  return true;
}

/** 加杠 */
export function executeGangJia(state: GameState, seat: PlayerSeat, tile: Tile): boolean {
  const player = state.players[seat];
  const meld = player.melds.find(m =>
    m.type === 'peng' && m.tiles[0].suit === tile.suit && m.tiles[0].rank === tile.rank
  );
  if (!meld) return false;

  const idx = player.hand.findIndex(h => h.id === tile.id);
  if (idx === -1) return false;

  player.hand.splice(idx, 1);
  meld.type = 'gang_jia';
  meld.tiles.push(tile);

  player.hand = sortHand(player.hand);
  state.gangCount++;

  state.actions.push({
    type: 'gang',
    player: seat,
    tile,
    meldType: 'gang_jia',
    timestamp: Date.now(),
  });

  return true;
}

/** 胡牌 */
export function executeHu(state: GameState, seat: PlayerSeat, tile: Tile, isSelfDraw: boolean): WinResult | null {
  const player = state.players[seat];
  const result = calculateWin(player.hand, player.melds, tile, isSelfDraw);

  if (!result.isWin) return null;

  player.winResult = result;
  player.isOut = true;
  player.score += result.fan;

  // 血战：从活跃玩家中移除
  state.activePlayers = state.activePlayers.filter(s => s !== seat);

  state.actions.push({
    type: 'hu',
    player: seat,
    tile,
    winResult: result,
    timestamp: Date.now(),
  });

  // 血战到底：只剩 1 人时结束
  if (state.activePlayers.length <= 1) {
    state.phase = 'finished';
  }

  return result;
}

/** 获取下一个活跃玩家 */
export function nextActivePlayer(state: GameState, current: PlayerSeat): PlayerSeat {
  let next = ((current + 1) % 4) as PlayerSeat;
  let attempts = 0;
  while (!state.activePlayers.includes(next) && attempts < 4) {
    next = ((next + 1) % 4) as PlayerSeat;
    attempts++;
  }
  return next;
}

/** 检查某玩家能否对弃牌做出反应 */
export function getAvailableActions(state: GameState, seat: PlayerSeat, discardedTile: Tile, fromSeat: PlayerSeat): PendingAction[] {
  const player = state.players[seat];
  if (player.isOut) return [];

  const actions: PendingAction[] = [];

  // 胡（最高优先级）
  const testHand = [...player.hand, discardedTile];
  if (canWinBasic(testHand) || isSevenPairs(testHand)) {
    actions.push({ player: seat, type: 'hu', priority: 3 });
  }

  // 明杠
  if (canGangMing(player.hand, discardedTile)) {
    actions.push({ player: seat, type: 'gang', priority: 2, meldType: 'gang_ming' });
  }

  // 碰
  if (canPeng(player.hand, discardedTile)) {
    actions.push({ player: seat, type: 'peng', priority: 1 });
  }

  // 吃（只有下家）
  const isNextPlayer = nextActivePlayer(state, fromSeat) === seat;
  if (isNextPlayer) {
    const chiOptions = getChiOptions(player.hand, discardedTile);
    if (chiOptions.length > 0) {
      actions.push({ player: seat, type: 'chi', priority: 0, tiles: chiOptions[0] });
    }
  }

  return actions;
}

/** 牌墙是否已空 */
export function isWallEmpty(state: GameState): boolean {
  return state.wall.length === 0;
}

/** 获取对局摘要（用于解说） */
export function getGameSummary(state: GameState): string {
  const lines: string[] = [];
  lines.push(`=== 第 ${state.turnCount} 回合 ===`);
  lines.push(`牌墙剩余: ${state.wall.length} 张`);
  
  for (const p of state.players) {
    const status = p.isOut ? `✅ 已胡 (${p.winResult?.types.join('+')})` : `手牌 ${p.hand.length} 张`;
    lines.push(`${p.name}: ${status} | 副露 ${p.melds.length} | 弃牌 ${p.discards.length}`);
  }

  return lines.join('\n');
}
