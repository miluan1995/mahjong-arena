// Tournament Scoring System
export class TournamentScoring {
  constructor(playerCount = 32, rounds = 8) {
    this.playerCount = playerCount;
    this.rounds = rounds;
    this.scores = new Map(); // address -> points
    this.results = []; // round results
  }

  addRoundResult(round, winner, players) {
    // 每局赢家得 3 分
    if (!this.scores.has(winner)) this.scores.set(winner, 0);
    this.scores.set(winner, this.scores.get(winner) + 3);

    this.results.push({
      round,
      winner,
      players,
      timestamp: Date.now(),
    });
  }

  getRanking() {
    // 按积分排序
    return Array.from(this.scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([address, points], rank) => ({
        rank: rank + 1,
        address,
        points,
      }));
  }

  calculateRewards(totalPool) {
    // 前 8 名分奖
    const ranking = this.getRanking().slice(0, 8);
    const distribution = [0.4, 0.25, 0.15, 0.04, 0.04, 0.04, 0.04, 0.04];

    return ranking.map((player, idx) => ({
      rank: player.rank,
      address: player.address,
      points: player.points,
      reward: totalPool * distribution[idx],
    }));
  }

  getStats(address) {
    // 获取玩家统计
    const wins = this.results.filter(r => r.winner === address).length;
    const points = this.scores.get(address) || 0;
    const winRate = (wins / this.rounds) * 100;

    return {
      address,
      wins,
      points,
      winRate: winRate.toFixed(1),
      ranking: this.getRanking().findIndex(r => r.address === address) + 1,
    };
  }
}

// 锦标赛管理
export class TournamentManager {
  constructor(contractAddress, provider) {
    this.contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
    this.tournaments = new Map();
  }

  async createTournament(entryFee, maxPlayers = 32, rounds = 8) {
    const tx = await this.contract.createTournament(
      ethers.parseEther(entryFee),
      maxPlayers,
      rounds
    );
    const receipt = await tx.wait();
    const tournamentId = receipt.logs[0].args.tournamentId;

    this.tournaments.set(tournamentId, {
      id: tournamentId,
      entryFee,
      maxPlayers,
      rounds,
      players: [],
      scoring: new TournamentScoring(maxPlayers, rounds),
      status: 'recruiting',
      startTime: null,
    });

    return tournamentId;
  }

  async joinTournament(tournamentId, playerAddress, entryFee) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    tournament.players.push(playerAddress);

    if (tournament.players.length === tournament.maxPlayers) {
      tournament.status = 'started';
      tournament.startTime = Date.now();
    }

    return tournament;
  }

  recordRoundWinner(tournamentId, round, winner, players) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    tournament.scoring.addRoundResult(round, winner, players);
  }

  getTournamentState(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    return {
      id: tournament.id,
      status: tournament.status,
      players: tournament.players,
      playerCount: tournament.players.length,
      maxPlayers: tournament.maxPlayers,
      rounds: tournament.rounds,
      ranking: tournament.scoring.getRanking(),
      rewards: tournament.scoring.calculateRewards(
        tournament.players.length * parseFloat(tournament.entryFee)
      ),
    };
  }

  getPlayerStats(tournamentId, playerAddress) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    return tournament.scoring.getStats(playerAddress);
  }
}

const CONTRACT_ABI = [
  'event TournamentCreated(uint256 indexed tournamentId, uint256 entryFee, uint256 maxPlayers)',
  'event PlayerJoinedTournament(uint256 indexed tournamentId, address indexed player)',
  'event TournamentStarted(uint256 indexed tournamentId)',
  'event RoundCompleted(uint256 indexed tournamentId, uint256 round, address winner)',
  'function createTournament(uint256 entryFee, uint256 maxPlayers, uint256 rounds) external returns (uint256)',
  'function joinTournament(uint256 tournamentId) external payable',
];
