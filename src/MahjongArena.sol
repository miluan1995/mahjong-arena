// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MahjongArena
 * @notice Agent 麻将锦标赛 - 链下对局 + 链上结算
 * 
 * 流程：
 * 1. Owner 创建锦标赛 (createTournament)
 * 2. Agent 钱包支付 0.01 BNB 报名 (joinTournament)
 * 3. 满 4 人自动开赛，链下跑牌局
 * 4. Oracle 提交每局结果 hash + 积分 (submitRoundResult)
 * 5. 所有局打完，冠军领奖 (settleTournament)
 */
contract MahjongArena {
    
    // ========== 数据结构 ==========
    
    enum TournamentStatus { Open, Active, Settled, Cancelled }
    
    struct Tournament {
        uint256 id;
        uint256 entryFee;        // 报名费 (wei)
        uint256 totalRounds;     // 总局数
        uint256 completedRounds; // 已完成局数
        uint256 prizePool;       // 奖池
        uint256 platformFee;     // 平台费比例 (500 = 5%)
        TournamentStatus status;
        address[4] players;      // 4 个 Agent 钱包
        uint8 playerCount;
        mapping(address => uint256) scores;    // 累计积分
        mapping(uint256 => bytes32) roundHashes; // 每局牌谱 hash（存证）
        address winner;
    }
    
    // ========== 状态变量 ==========
    
    address public owner;
    address public oracle;       // 提交结果的可信地址
    uint256 public tournamentCount;
    uint256 public constant MAX_PLAYERS = 4;
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    mapping(uint256 => Tournament) public tournaments;
    
    // ========== 事件 ==========
    
    event TournamentCreated(uint256 indexed id, uint256 entryFee, uint256 totalRounds);
    event PlayerJoined(uint256 indexed id, address indexed player, uint8 playerCount);
    event TournamentStarted(uint256 indexed id);
    event RoundCompleted(uint256 indexed id, uint256 round, bytes32 gameHash);
    event TournamentSettled(uint256 indexed id, address indexed winner, uint256 prize);
    event TournamentCancelled(uint256 indexed id);
    
    // ========== 修饰符 ==========
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }
    
    // ========== 构造函数 ==========
    
    constructor(address _oracle) {
        owner = msg.sender;
        oracle = _oracle;
    }
    
    // ========== 核心函数 ==========
    
    /// @notice 创建锦标赛
    /// @param _entryFee 报名费 (wei)
    /// @param _totalRounds 总局数
    /// @param _platformFee 平台费比例 (500 = 5%)
    function createTournament(
        uint256 _entryFee,
        uint256 _totalRounds,
        uint256 _platformFee
    ) external onlyOwner returns (uint256) {
        require(_entryFee > 0, "Fee must > 0");
        require(_totalRounds > 0 && _totalRounds <= 20, "Rounds: 1-20");
        require(_platformFee <= 1000, "Fee max 10%");
        
        uint256 id = tournamentCount++;
        Tournament storage t = tournaments[id];
        t.id = id;
        t.entryFee = _entryFee;
        t.totalRounds = _totalRounds;
        t.platformFee = _platformFee;
        t.status = TournamentStatus.Open;
        
        emit TournamentCreated(id, _entryFee, _totalRounds);
        return id;
    }
    
    /// @notice Agent 报名参赛
    function joinTournament(uint256 _id) external payable {
        Tournament storage t = tournaments[_id];
        require(t.status == TournamentStatus.Open, "Not open");
        require(msg.value == t.entryFee, "Wrong fee");
        require(t.playerCount < MAX_PLAYERS, "Full");
        
        // 检查是否已报名
        for (uint8 i = 0; i < t.playerCount; i++) {
            require(t.players[i] != msg.sender, "Already joined");
        }
        
        t.players[t.playerCount] = msg.sender;
        t.playerCount++;
        t.prizePool += msg.value;
        
        emit PlayerJoined(_id, msg.sender, t.playerCount);
        
        // 满 4 人自动开赛
        if (t.playerCount == MAX_PLAYERS) {
            t.status = TournamentStatus.Active;
            emit TournamentStarted(_id);
        }
    }
    
    /// @notice Oracle 提交单局结果
    /// @param _id 锦标赛 ID
    /// @param _round 局号 (0-indexed)
    /// @param _gameHash 完整牌谱的 keccak256 hash（链下可验证）
    /// @param _scores 本局 4 个玩家的积分增量
    function submitRoundResult(
        uint256 _id,
        uint256 _round,
        bytes32 _gameHash,
        uint256[4] calldata _scores
    ) external onlyOracle {
        Tournament storage t = tournaments[_id];
        require(t.status == TournamentStatus.Active, "Not active");
        require(_round == t.completedRounds, "Wrong round");
        require(_round < t.totalRounds, "All rounds done");
        
        // 记录牌谱 hash（存证）
        t.roundHashes[_round] = _gameHash;
        
        // 累加积分
        for (uint8 i = 0; i < MAX_PLAYERS; i++) {
            t.scores[t.players[i]] += _scores[i];
        }
        
        t.completedRounds++;
        emit RoundCompleted(_id, _round, _gameHash);
    }
    
    /// @notice 结算锦标赛 — 积分最高者独吞奖池
    function settleTournament(uint256 _id) external onlyOracle {
        Tournament storage t = tournaments[_id];
        require(t.status == TournamentStatus.Active, "Not active");
        require(t.completedRounds == t.totalRounds, "Rounds not done");
        
        // 找最高分
        address winner = t.players[0];
        uint256 highScore = t.scores[t.players[0]];
        
        for (uint8 i = 1; i < MAX_PLAYERS; i++) {
            if (t.scores[t.players[i]] > highScore) {
                highScore = t.scores[t.players[i]];
                winner = t.players[i];
            }
        }
        
        t.winner = winner;
        t.status = TournamentStatus.Settled;
        
        // 分钱：冠军独吞，扣平台费
        uint256 fee = (t.prizePool * t.platformFee) / FEE_DENOMINATOR;
        uint256 prize = t.prizePool - fee;
        
        // 转账
        (bool s1, ) = winner.call{value: prize}("");
        require(s1, "Prize transfer failed");
        
        if (fee > 0) {
            (bool s2, ) = owner.call{value: fee}("");
            require(s2, "Fee transfer failed");
        }
        
        emit TournamentSettled(_id, winner, prize);
    }
    
    /// @notice 取消锦标赛（未开赛时退款）
    function cancelTournament(uint256 _id) external onlyOwner {
        Tournament storage t = tournaments[_id];
        require(t.status == TournamentStatus.Open, "Can only cancel open");
        
        t.status = TournamentStatus.Cancelled;
        
        // 退款
        for (uint8 i = 0; i < t.playerCount; i++) {
            (bool s, ) = t.players[i].call{value: t.entryFee}("");
            require(s, "Refund failed");
        }
        
        emit TournamentCancelled(_id);
    }
    
    // ========== 查询函数 ==========
    
    function getPlayers(uint256 _id) external view returns (address[4] memory) {
        return tournaments[_id].players;
    }
    
    function getScore(uint256 _id, address _player) external view returns (uint256) {
        return tournaments[_id].scores[_player];
    }
    
    function getRoundHash(uint256 _id, uint256 _round) external view returns (bytes32) {
        return tournaments[_id].roundHashes[_round];
    }
    
    function getAllScores(uint256 _id) external view returns (
        address[4] memory players,
        uint256[4] memory scores
    ) {
        Tournament storage t = tournaments[_id];
        players = t.players;
        for (uint8 i = 0; i < MAX_PLAYERS; i++) {
            scores[i] = t.scores[t.players[i]];
        }
    }
    
    // ========== 管理函数 ==========
    
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
    
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Zero address");
        owner = _newOwner;
    }
}
