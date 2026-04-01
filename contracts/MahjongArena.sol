// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MahjongArena {
    
    // ========== 数据结构 ==========
    
    enum TournamentStatus { Open, Active, Settled, Cancelled }
    enum LobbyStatus { Open, Active, Settled }
    enum ChallengeStatus { Open, Playing, Settled }
    
    struct Tournament {
        uint256 id;
        uint256 entryFee;
        uint256 totalRounds;
        uint256 completedRounds;
        uint256 prizePool;
        uint256 platformFee;
        TournamentStatus status;
        address[4] players;
        uint8 playerCount;
        mapping(address => uint256) scores;
        mapping(uint256 => bytes32) roundHashes;
        address winner;
    }
    
    struct GameLobby {
        uint256 id;
        uint256 entryFee;
        LobbyStatus status;
        address[4] players;
        uint8 playerCount;
        uint256 prizePool;
        address winner;
    }
    
    struct Challenge {
        uint256 id;
        address player;
        uint256 entryFee;
        ChallengeStatus status;
        address winner;
        uint256 prizeAmount;
    }
    
    // ========== 状态变量 ==========
    
    address public owner;
    address public oracle;
    uint256 public tournamentCount;
    uint256 public lobbyCount;
    uint256 public constant MAX_PLAYERS = 4;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant PLATFORM_FEE = 500; // 5%
    
    mapping(uint256 => Tournament) public tournaments;
    mapping(uint256 => GameLobby) public lobbies;
    
    uint256 public challengePool;
    uint256 public challengeEntryFee = 0.1 ether;
    uint256 public challengeCount;
    mapping(uint256 => Challenge) public challenges;
    
    // ========== 事件 ==========
    
    event TournamentCreated(uint256 indexed id, uint256 entryFee, uint256 totalRounds);
    event PlayerJoined(uint256 indexed id, address indexed player, uint8 playerCount);
    event TournamentStarted(uint256 indexed id);
    event RoundCompleted(uint256 indexed id, uint256 round, bytes32 gameHash);
    event TournamentSettled(uint256 indexed id, address indexed winner, uint256 prize);
    event TournamentCancelled(uint256 indexed id);
    
    event LobbyCreated(uint256 indexed id, uint256 entryFee);
    event LobbyPlayerJoined(uint256 indexed id, address indexed player, uint8 playerCount);
    event LobbyStarted(uint256 indexed id, address[4] players);
    event LobbySettled(uint256 indexed id, address indexed winner, uint256 prize);
    
    event ChallengeStarted(uint256 indexed id, address indexed player, uint256 poolAmount);
    event ChallengeSettled(uint256 indexed id, address indexed winner, uint256 prize);
    event ChallengePoolDeposited(uint256 amount, uint256 newTotal);
    
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
    
    constructor() {
        owner = msg.sender;
        oracle = msg.sender;
    }
    
    // ========== Tournament 函数 ==========
    
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
    
    function joinTournament(uint256 _id) external payable {
        Tournament storage t = tournaments[_id];
        require(t.status == TournamentStatus.Open, "Not open");
        require(msg.value == t.entryFee, "Wrong fee");
        require(t.playerCount < MAX_PLAYERS, "Full");
        
        for (uint8 i = 0; i < t.playerCount; i++) {
            require(t.players[i] != msg.sender, "Already joined");
        }
        
        t.players[t.playerCount] = msg.sender;
        t.playerCount++;
        t.prizePool += msg.value;
        
        emit PlayerJoined(_id, msg.sender, t.playerCount);
        
        if (t.playerCount == MAX_PLAYERS) {
            t.status = TournamentStatus.Active;
            emit TournamentStarted(_id);
        }
    }
    
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
        
        t.roundHashes[_round] = _gameHash;
        for (uint8 i = 0; i < MAX_PLAYERS; i++) {
            t.scores[t.players[i]] += _scores[i];
        }
        t.completedRounds++;
        emit RoundCompleted(_id, _round, _gameHash);
    }
    
    function settleTournament(uint256 _id) external onlyOracle {
        Tournament storage t = tournaments[_id];
        require(t.status == TournamentStatus.Active, "Not active");
        require(t.completedRounds == t.totalRounds, "Rounds not done");
        
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
        
        uint256 fee = (t.prizePool * t.platformFee) / FEE_DENOMINATOR;
        uint256 prize = t.prizePool - fee;
        
        (bool s1, ) = winner.call{value: prize}("");
        require(s1, "Prize transfer failed");
        if (fee > 0) {
            (bool s2, ) = owner.call{value: fee}("");
            require(s2, "Fee transfer failed");
        }
        
        emit TournamentSettled(_id, winner, prize);
    }
    
    function cancelTournament(uint256 _id) external onlyOwner {
        Tournament storage t = tournaments[_id];
        require(t.status == TournamentStatus.Open, "Can only cancel open");
        t.status = TournamentStatus.Cancelled;
        for (uint8 i = 0; i < t.playerCount; i++) {
            (bool s, ) = t.players[i].call{value: t.entryFee}("");
            require(s, "Refund failed");
        }
        emit TournamentCancelled(_id);
    }
    
    // ========== GameLobby 函数 ==========
    
    function createGameLobby(uint256 _entryFee) external onlyOwner returns (uint256) {
        require(_entryFee > 0, "Fee must > 0");
        uint256 id = lobbyCount++;
        GameLobby storage l = lobbies[id];
        l.id = id;
        l.entryFee = _entryFee;
        l.status = LobbyStatus.Open;
        emit LobbyCreated(id, _entryFee);
        return id;
    }
    
    function joinGameLobby(uint256 _lobbyId) external payable {
        GameLobby storage l = lobbies[_lobbyId];
        require(l.status == LobbyStatus.Open, "Not open");
        require(msg.value == l.entryFee, "Wrong fee");
        require(l.playerCount < MAX_PLAYERS, "Full");
        for (uint8 i = 0; i < l.playerCount; i++) {
            require(l.players[i] != msg.sender, "Already joined");
        }
        l.players[l.playerCount] = msg.sender;
        l.playerCount++;
        l.prizePool += msg.value;
        emit LobbyPlayerJoined(_lobbyId, msg.sender, l.playerCount);
        if (l.playerCount == MAX_PLAYERS) {
            l.status = LobbyStatus.Active;
            emit LobbyStarted(_lobbyId, l.players);
        }
    }
    
    function settleLobby(uint256 _lobbyId, address _winner) external onlyOracle {
        GameLobby storage l = lobbies[_lobbyId];
        require(l.status == LobbyStatus.Active, "Not active");
        bool valid;
        for (uint8 i = 0; i < MAX_PLAYERS; i++) {
            if (l.players[i] == _winner) { valid = true; break; }
        }
        require(valid, "Winner not in lobby");
        l.winner = _winner;
        l.status = LobbyStatus.Settled;
        uint256 fee = (l.prizePool * PLATFORM_FEE) / FEE_DENOMINATOR;
        uint256 prize = l.prizePool - fee;
        (bool s1, ) = _winner.call{value: prize}("");
        require(s1, "Prize transfer failed");
        if (fee > 0) {
            (bool s2, ) = owner.call{value: fee}("");
            require(s2, "Fee transfer failed");
        }
        emit LobbySettled(_lobbyId, _winner, prize);
    }
    
    function cancelLobby(uint256 _lobbyId) external onlyOwner {
        GameLobby storage l = lobbies[_lobbyId];
        require(l.status == LobbyStatus.Open, "Can only cancel open");
        l.status = LobbyStatus.Settled; // mark as done
        for (uint8 i = 0; i < l.playerCount; i++) {
            (bool s, ) = l.players[i].call{value: l.entryFee}("");
            require(s, "Refund failed");
        }
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
        address[4] memory players, uint256[4] memory scores
    ) {
        Tournament storage t = tournaments[_id];
        players = t.players;
        for (uint8 i = 0; i < MAX_PLAYERS; i++) {
            scores[i] = t.scores[t.players[i]];
        }
    }
    
    function getLobbyPlayers(uint256 _lobbyId) external view returns (address[4] memory) {
        return lobbies[_lobbyId].players;
    }
    
    function getLobbyInfo(uint256 _lobbyId) external view returns (
        uint256 id, uint256 entryFee, uint8 playerCount, uint8 status, uint256 prizePool, address winner
    ) {
        GameLobby storage l = lobbies[_lobbyId];
        return (l.id, l.entryFee, l.playerCount, uint8(l.status), l.prizePool, l.winner);
    }
    
    // ========== 人机挑战 ==========
    
    function depositChallengePool() external payable onlyOwner {
        challengePool += msg.value;
        emit ChallengePoolDeposited(msg.value, challengePool);
    }
    
    function setChallengeEntryFee(uint256 _fee) external onlyOwner {
        challengeEntryFee = _fee;
    }
    
    function startChallenge() external payable {
        require(msg.value == challengeEntryFee, "Wrong entry fee");
        uint256 id = challengeCount++;
        challenges[id] = Challenge(id, msg.sender, msg.value, ChallengeStatus.Open, address(0), 0);
        emit ChallengeStarted(id, msg.sender, challengePool);
    }
    
    function settleChallenge(uint256 _id, bool _playerWins) external onlyOracle {
        Challenge storage c = challenges[_id];
        require(c.status == ChallengeStatus.Open, "Not open");
        c.status = ChallengeStatus.Settled;
        if (_playerWins) {
            uint256 total = challengePool + c.entryFee;
            uint256 prize = total * 95 / 100;
            uint256 fee = total - prize;
            c.winner = c.player;
            c.prizeAmount = prize;
            challengePool = 0;
            (bool s1, ) = c.player.call{value: prize}("");
            require(s1, "Prize transfer failed");
            (bool s2, ) = owner.call{value: fee}("");
            require(s2, "Fee transfer failed");
        } else {
            challengePool += c.entryFee;
            c.winner = address(0);
        }
        emit ChallengeSettled(_id, c.winner, c.prizeAmount);
    }
    
    function getChallengeInfo(uint256 _id) external view returns (Challenge memory) {
        return challenges[_id];
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
