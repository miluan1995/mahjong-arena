// End-to-End Test Suite
import { MahjongLogic } from './mahjong-logic.js';
import { TournamentScoring } from './tournament-scoring.js';

export async function testMahjongLogic() {
  console.log('🧪 Testing Mahjong Logic...');

  // Test 1: 七对
  const sevenPairs = [
    { suit: 'w', rank: 1 }, { suit: 'w', rank: 1 },
    { suit: 'w', rank: 2 }, { suit: 'w', rank: 2 },
    { suit: 'w', rank: 3 }, { suit: 'w', rank: 3 },
    { suit: 'w', rank: 4 }, { suit: 'w', rank: 4 },
    { suit: 'w', rank: 5 }, { suit: 'w', rank: 5 },
    { suit: 'w', rank: 6 }, { suit: 'w', rank: 6 },
    { suit: 'w', rank: 7 }, { suit: 'w', rank: 7 },
  ];
  const canHu1 = MahjongLogic.canHu(sevenPairs);
  console.log(`✓ 七对检测: ${canHu1 ? 'PASS' : 'FAIL'}`);

  // Test 2: 标准胡
  const standardHu = [
    { suit: 'w', rank: 1 }, { suit: 'w', rank: 2 }, { suit: 'w', rank: 3 },
    { suit: 'w', rank: 4 }, { suit: 'w', rank: 5 }, { suit: 'w', rank: 6 },
    { suit: 'w', rank: 7 }, { suit: 'w', rank: 8 }, { suit: 'w', rank: 9 },
    { suit: 't', rank: 1 }, { suit: 't', rank: 1 }, { suit: 't', rank: 1 },
    { suit: 't', rank: 2 }, { suit: 't', rank: 2 },
  ];
  const canHu2 = MahjongLogic.canHu(standardHu);
  console.log(`✓ 标准胡检测: ${canHu2 ? 'PASS' : 'FAIL'}`);

  // Test 3: 番数计算
  const fan = MahjongLogic.calculateFan(sevenPairs, [], true);
  console.log(`✓ 番数计算 (七对自摸): ${fan} 番`);

  // Test 4: 积分计算
  const score = MahjongLogic.calculateScore(fan, true);
  console.log(`✓ 积分计算: ${score} 分`);
}

export async function testTournamentScoring() {
  console.log('\n🏆 Testing Tournament Scoring...');

  const scoring = new TournamentScoring(4, 3);
  const players = ['0xAAA', '0xBBB', '0xCCC', '0xDDD'];

  // 模拟 3 局比赛
  scoring.addRoundResult(1, '0xAAA', players);
  scoring.addRoundResult(2, '0xBBB', players);
  scoring.addRoundResult(3, '0xAAA', players);

  const ranking = scoring.getRanking();
  console.log(`✓ 排名: ${ranking.map(r => `${r.address}(${r.points}分)`).join(', ')}`);

  const rewards = scoring.calculateRewards(0.4); // 4 * 0.1 BNB
  console.log(`✓ 奖励分配: ${rewards.map(r => `${r.address}(${r.reward.toFixed(4)} BNB)`).join(', ')}`);
}

export async function testGameFlow() {
  console.log('\n🎮 Testing Game Flow...');

  // 模拟游戏流程
  const hand = [
    { suit: 'w', rank: 1 }, { suit: 'w', rank: 2 }, { suit: 'w', rank: 3 },
    { suit: 'w', rank: 4 }, { suit: 'w', rank: 5 }, { suit: 'w', rank: 6 },
    { suit: 'w', rank: 7 }, { suit: 'w', rank: 8 }, { suit: 'w', rank: 9 },
    { suit: 't', rank: 1 }, { suit: 't', rank: 1 }, { suit: 't', rank: 1 },
    { suit: 't', rank: 2 }, { suit: 't', rank: 2 },
  ];

  console.log(`✓ 初始手牌: 14 张`);
  console.log(`✓ 能胡: ${MahjongLogic.canHu(hand)}`);
  console.log(`✓ 番数: ${MahjongLogic.calculateFan(hand, [], true)}`);
  console.log(`✓ 积分: ${MahjongLogic.calculateScore(2, true)}`);
}

// 运行所有测试
export async function runAllTests() {
  console.log('🚀 Starting E2E Tests...\n');
  await testMahjongLogic();
  await testTournamentScoring();
  await testGameFlow();
  console.log('\n✅ All tests completed!');
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}
