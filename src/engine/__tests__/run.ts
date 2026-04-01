/**
 * 规则引擎测试
 */

import { createFullDeck, shuffleDeck, tileName, sortHand, Tile, Suit, Rank } from '../tiles';
import {
  canWinBasic, isSevenPairs, isFlush, isAllTriplets,
  canPeng, canGangMing, getAnGangOptions, getChiOptions,
  getWaitingTiles, calculateWin,
} from '../hand';
import { createGame, drawTile, discardTile, nextActivePlayer } from '../game';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.log(`  ❌ ${msg}`);
  }
}

function makeTile(suit: Suit, rank: Rank, id: number): Tile {
  return { suit, rank, id };
}

function makeTiles(specs: [Suit, Rank][]): Tile[] {
  return specs.map(([suit, rank], i) => makeTile(suit, rank, i));
}

console.log('=== 川麻规则引擎测试 ===\n');

// --- Test 1: 牌组生成 ---
console.log('--- 1. 牌组生成 ---');
const deck = createFullDeck();
assert(deck.length === 108, `总牌数 = ${deck.length}（应为 108）`);

const wanCount = deck.filter(t => t.suit === 'wan').length;
const tiaoCount = deck.filter(t => t.suit === 'tiao').length;
const tongCount = deck.filter(t => t.suit === 'tong').length;
assert(wanCount === 36, `万 = ${wanCount}（应为 36）`);
assert(tiaoCount === 36, `条 = ${tiaoCount}（应为 36）`);
assert(tongCount === 36, `筒 = ${tongCount}（应为 36）`);

// --- Test 2: 洗牌 ---
console.log('\n--- 2. 洗牌 ---');
const shuffled = shuffleDeck(deck);
assert(shuffled.length === 108, '洗牌后数量不变');
const isDifferent = shuffled.some((t, i) => t.id !== deck[i].id);
assert(isDifferent, '洗牌后顺序改变');

// --- Test 3: 基本胡牌判定 ---
console.log('\n--- 3. 基本胡牌 ---');

// 3.1 标准胡：4 组面子 + 1 将
// 123万 456万 789万 123条 + 11筒
const winHand1 = makeTiles([
  ['wan', 1], ['wan', 2], ['wan', 3],
  ['wan', 4], ['wan', 5], ['wan', 6],
  ['wan', 7], ['wan', 8], ['wan', 9],
  ['tiao', 1], ['tiao', 2], ['tiao', 3],
  ['tong', 1], ['tong', 1],
]);
assert(canWinBasic(winHand1), '123万 456万 789万 123条 11筒 = 胡');

// 3.2 刻子胡：111万 222条 333筒 444万 + 55条
const winHand2 = makeTiles([
  ['wan', 1], ['wan', 1], ['wan', 1],
  ['tiao', 2], ['tiao', 2], ['tiao', 2],
  ['tong', 3], ['tong', 3], ['tong', 3],
  ['wan', 4], ['wan', 4], ['wan', 4],
  ['tiao', 5], ['tiao', 5],
]);
assert(canWinBasic(winHand2), '111万 222条 333筒 444万 55条 = 胡');

// 3.3 不能胡的手牌
const noWin = makeTiles([
  ['wan', 1], ['wan', 3], ['wan', 5],
  ['tiao', 2], ['tiao', 4], ['tiao', 6],
  ['tong', 1], ['tong', 3], ['tong', 5],
  ['wan', 7], ['tiao', 8], ['tong', 9],
  ['wan', 2], ['tiao', 7],
]);
assert(!canWinBasic(noWin), '乱牌 = 不能胡');

// --- Test 4: 七对 ---
console.log('\n--- 4. 七对 ---');
const sevenPairs = makeTiles([
  ['wan', 1], ['wan', 1],
  ['wan', 3], ['wan', 3],
  ['tiao', 5], ['tiao', 5],
  ['tiao', 7], ['tiao', 7],
  ['tong', 2], ['tong', 2],
  ['tong', 4], ['tong', 4],
  ['tong', 9], ['tong', 9],
]);
assert(isSevenPairs(sevenPairs), '7 对 = 七对');
assert(!isSevenPairs(winHand1), '非七对 = false');

// --- Test 5: 清一色 ---
console.log('\n--- 5. 清一色 ---');
const flush = makeTiles([
  ['wan', 1], ['wan', 2], ['wan', 3],
  ['wan', 4], ['wan', 5], ['wan', 6],
  ['wan', 7], ['wan', 8], ['wan', 9],
  ['wan', 1], ['wan', 2], ['wan', 3],
  ['wan', 5], ['wan', 5],
]);
assert(isFlush(flush), '全万 = 清一色');
assert(!isFlush(winHand1), '混合花色 ≠ 清一色');

// --- Test 6: 对对胡 ---
console.log('\n--- 6. 对对胡 ---');
assert(isAllTriplets(winHand2), '全刻子 = 对对胡');
assert(!isAllTriplets(winHand1), '有顺子 ≠ 对对胡');

// --- Test 7: 碰/杠检测 ---
console.log('\n--- 7. 碰/杠 ---');
const hand7 = makeTiles([
  ['wan', 1], ['wan', 1], ['wan', 1],
  ['tiao', 3], ['tiao', 4], ['tiao', 5],
  ['tong', 7], ['tong', 7],
]);
const discarded7 = makeTile('wan', 1, 100);
assert(canPeng(hand7, discarded7), '手中 3 张 1万 + 打出 1万 = 可碰');
assert(canGangMing(hand7, discarded7), '手中 3 张 1万 + 打出 1万 = 可杠');

const discarded7b = makeTile('tong', 7, 101);
assert(canPeng(hand7, discarded7b), '手中 2 张 7筒 + 打出 7筒 = 可碰');
assert(!canGangMing(hand7, discarded7b), '手中 2 张 7筒 ≠ 可明杠');

// --- Test 8: 吃检测 ---
console.log('\n--- 8. 吃 ---');
const hand8 = makeTiles([
  ['wan', 2], ['wan', 3], ['tiao', 5], ['tiao', 6],
]);
const discarded8 = makeTile('wan', 1, 100);
const chiOpts = getChiOptions(hand8, discarded8);
assert(chiOpts.length > 0, `1万 可吃（选项: ${chiOpts.length}）`);

const discarded8b = makeTile('tong', 5, 101);
const chiOpts2 = getChiOptions(hand8, discarded8b);
assert(chiOpts2.length === 0, '5筒 不可吃（手中无筒子组合）');

// --- Test 9: 听牌检测 ---
console.log('\n--- 9. 听牌 ---');
// 123万 456万 789万 12条 + 11筒 → 听 3条
const tingHand = makeTiles([
  ['wan', 1], ['wan', 2], ['wan', 3],
  ['wan', 4], ['wan', 5], ['wan', 6],
  ['wan', 7], ['wan', 8], ['wan', 9],
  ['tiao', 1], ['tiao', 2],
  ['tong', 1], ['tong', 1],
]);
const waiting = getWaitingTiles(tingHand);
assert(waiting.length > 0, `听牌: ${waiting.map(t => tileName(t)).join(', ')}`);
assert(waiting.some(t => t.suit === 'tiao' && t.rank === 3), '听 3条');

// --- Test 10: 番数计算 ---
console.log('\n--- 10. 番数 ---');
const result1 = calculateWin(
  winHand1.slice(0, 13),
  [],
  winHand1[13],
  true
);
assert(result1.isWin, `胡牌: ${result1.types.join('+')} = ${result1.fan} 番`);
assert(result1.fan >= 1, `番数 >= 1`);

const flushResult = calculateWin(
  flush.slice(0, 13),
  [],
  flush[13],
  true
);
assert(flushResult.isWin, `清一色: ${flushResult.types.join('+')} = ${flushResult.fan} 番`);
assert(flushResult.types.includes('清一色'), '包含清一色');

// --- Test 11: 对局创建 ---
console.log('\n--- 11. 对局 ---');
const game = createGame(['黑瞎子', '铁柱', '算盘', '锦鲤']);
assert(game.players.length === 4, '4 个玩家');
assert(game.players.every(p => p.hand.length === 13), '每人 13 张手牌');
assert(game.wall.length === 108 - 52, `牌墙 ${game.wall.length} 张（应 56）`);

const drawn = drawTile(game);
assert(drawn !== null, `摸牌: ${drawn ? tileName(drawn) : 'null'}`);
assert(game.players[0].hand.length === 14, '摸牌后 14 张');

// --- Test 12: 出牌 ---
console.log('\n--- 12. 出牌 ---');
const tileToDiscard = game.players[0].hand[0];
const discardOk = discardTile(game, 0, tileToDiscard);
assert(discardOk, `出牌 ${tileName(tileToDiscard)}`);
assert(game.players[0].hand.length === 13, '出牌后 13 张');
assert(game.players[0].discards.length === 1, '弃牌区 1 张');

// --- 总结 ---
console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
if (failed > 0) process.exit(1);
