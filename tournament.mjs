import { createPublicClient, createWalletClient, http, parseAbi, parseEther, formatEther } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import crypto from 'crypto';

/**
 * 锦标赛管理器
 * - 监听合约事件（报名、开赛）
 * - 开赛后运行链下牌局
 * - 每局结束提交 hash + 积分到链上
 * - 全部打完调用结算
 */

const ABI = parseAbi([
  'function createTournament(uint256 _entryFee, uint256 _totalRounds, uint256 _platformFee) returns (uint256)',
  'function submitRoundResult(uint256 _id, uint256 _round, bytes32 _gameHash, uint256[4] _scores)',
  'function settleTournament(uint256 _id)',
  'function getPlayers(uint256 _id) view returns (address[4])',
  'function getAllScores(uint256 _id) view returns (address[4], uint256[4])',
  'event TournamentStarted(uint256 indexed id)',
  'event RoundCompleted(uint256 indexed id, uint256 round, bytes32 gameHash)',
  'event TournamentSettled(uint256 indexed id, address indexed winner, uint256 prize)',
]);

export class TournamentManager {
  constructor(contractAddress, oraclePrivateKey, rpcUrl = 'https://bsc-dataseed.binance.org') {
    this.contractAddress = contractAddress;
    this.account = privateKeyToAccount(oraclePrivateKey);
    
    this.publicClient = createPublicClient({
      chain: bsc,
      transport: http(rpcUrl),
    });
    
    this.walletClient = createWalletClient({
      account: this.account,
      chain: bsc,
      transport: http(rpcUrl),
    });
    
    // 活跃锦标赛 { id: { players, rounds, gameRecords } }
    this.activeTournaments = new Map();
  }

  /**
   * 创建锦标赛
   */
  async createTournament(entryFeeBNB = '0.01', totalRounds = 8, platformFeeBps = 500) {
    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: ABI,
      functionName: 'createTournament',
      args: [parseEther(entryFeeBNB), BigInt(totalRounds), BigInt(platformFeeBps)],
    });
    
    console.log(`📋 创建锦标赛 tx: ${hash}`);
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ 锦标赛已创建, block ${receipt.blockNumber}`);
    return receipt;
  }

  /**
   * 运行一局牌 — 调用现有引擎
   * 返回: { gameRecord, scores, hash }
   */
  async runOneRound(tournamentId, players, roundIndex) {
    // 动态导入引擎
    const { SichuanMahjongGame } = await import('./app/src/game/engine.js');
    const { getAIDiscard, getAIResponse } = await import('./app/src/game/ai.js');
    
    const game = new SichuanMahjongGame();
    const gameRecord = {
      tournamentId,
      round: roundIndex,
      players,
      timestamp: Date.now(),
      actions: [],
    };
    
    // 跑完整一局
    while (!game.isGameOver()) {
      const state = game.getState();
      const currentPlayer = state.currentPlayer;
      
      if (state.pendingAction) {
        // 有人可以碰/杠/胡
        const response = getAIResponse(state, currentPlayer);
        gameRecord.actions.push({ player: currentPlayer, type: 'response', action: response });
        game.respond(response);
      } else {
        // 正常出牌
        const discard = getAIDiscard(state, currentPlayer);
        gameRecord.actions.push({ player: currentPlayer, type: 'discard', tile: discard });
        game.discard(discard);
      }
    }
    
    // 计算积分（胡牌者得分，按番数）
    const result = game.getResult();
    const scores = [0, 0, 0, 0];
    
    if (result.winners) {
      for (const w of result.winners) {
        scores[w.player] += w.score || 10; // 默认 10 分
      }
    }
    
    // 生成牌谱 hash
    const recordStr = JSON.stringify(gameRecord);
    const hash = '0x' + crypto.createHash('sha256').update(recordStr).digest('hex');
    
    return { gameRecord, scores, hash };
  }

  /**
   * 提交单局结果到链上
   */
  async submitRound(tournamentId, roundIndex, gameHash, scores) {
    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: ABI,
      functionName: 'submitRoundResult',
      args: [
        BigInt(tournamentId),
        BigInt(roundIndex),
        gameHash,
        scores.map(s => BigInt(s)),
      ],
    });
    
    console.log(`🀄 第 ${roundIndex + 1} 局提交 tx: ${hash}`);
    await this.publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ 第 ${roundIndex + 1} 局已上链`);
  }

  /**
   * 结算锦标赛
   */
  async settle(tournamentId) {
    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: ABI,
      functionName: 'settleTournament',
      args: [BigInt(tournamentId)],
    });
    
    console.log(`🏆 结算 tx: ${hash}`);
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ 锦标赛已结算, block ${receipt.blockNumber}`);
    return receipt;
  }

  /**
   * 运行完整锦标赛（开赛后调用）
   */
  async runFullTournament(tournamentId, totalRounds = 8) {
    // 获取参赛者
    const players = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ABI,
      functionName: 'getPlayers',
      args: [BigInt(tournamentId)],
    });
    
    console.log(`\n🀄 锦标赛 #${tournamentId} 开始！`);
    console.log(`参赛者: ${players.join(', ')}`);
    console.log(`总局数: ${totalRounds}\n`);
    
    const allRecords = [];
    
    for (let i = 0; i < totalRounds; i++) {
      console.log(`--- 第 ${i + 1}/${totalRounds} 局 ---`);
      
      const { gameRecord, scores, hash } = await this.runOneRound(tournamentId, players, i);
      allRecords.push(gameRecord);
      
      console.log(`积分: ${scores.join(' / ')}`);
      
      // 提交到链上
      await this.submitRound(tournamentId, i, hash, scores);
    }
    
    // 查最终积分
    const [, finalScores] = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ABI,
      functionName: 'getAllScores',
      args: [BigInt(tournamentId)],
    });
    
    console.log(`\n📊 最终积分:`);
    players.forEach((p, i) => {
      console.log(`  ${p}: ${finalScores[i]}`);
    });
    
    // 结算
    await this.settle(tournamentId);
    
    return { records: allRecords, finalScores };
  }

  /**
   * 监听开赛事件并自动运行
   */
  watchAndRun() {
    console.log('👀 监听锦标赛开赛事件...');
    
    this.publicClient.watchContractEvent({
      address: this.contractAddress,
      abi: ABI,
      eventName: 'TournamentStarted',
      onLogs: async (logs) => {
        for (const log of logs) {
          const tournamentId = Number(log.args.id);
          console.log(`\n🎯 锦标赛 #${tournamentId} 已满员开赛！`);
          
          try {
            await this.runFullTournament(tournamentId);
          } catch (err) {
            console.error(`❌ 锦标赛 #${tournamentId} 运行失败:`, err);
          }
        }
      },
    });
  }
}
