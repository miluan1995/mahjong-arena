// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MahjongArena {
    struct GameLobby {
        uint256 id;
        uint256 entryFee;
        address[] players;
        uint256 createdAt;
        bool started;
        bytes32 gameHash;
    }

    struct Tournament {
        uint256 id;
        uint256 entryFee;
        address[] players;
        uint256 createdAt;
        bool started;
    }

    mapping(uint256 => GameLobby) public gameLobby;
    mapping(uint256 => Tournament) public tournaments;
    mapping(address => uint256) public balances;

    uint256 public lobbyCounter;
    uint256 public tournamentCounter;
    uint256 public constant GAME_SIZE = 4;
    uint256 public constant TOURNAMENT_SIZE = 32;

    event LobbyCreated(uint256 indexed lobbyId, uint256 entryFee);
    event PlayerJoined(uint256 indexed lobbyId, address indexed player);
    event GameStarted(uint256 indexed lobbyId, address[] players);
    event GameSettled(uint256 indexed lobbyId, address indexed winner, uint256 prize);
    event TournamentCreated(uint256 indexed tournamentId, uint256 entryFee);
    event TournamentStarted(uint256 indexed tournamentId);
    event TournamentSettled(uint256 indexed tournamentId, address indexed winner, uint256 prize);

    function createGameLobby(uint256 entryFee) external {
        require(entryFee > 0, "Entry fee must be > 0");
        GameLobby storage lobby = gameLobby[lobbyCounter];
        lobby.id = lobbyCounter;
        lobby.entryFee = entryFee;
        lobby.createdAt = block.timestamp;
        emit LobbyCreated(lobbyCounter, entryFee);
        lobbyCounter++;
    }

    function joinGameLobby(uint256 lobbyId) external payable {
        GameLobby storage lobby = gameLobby[lobbyId];
        require(msg.value == lobby.entryFee, "Incorrect entry fee");
        require(!lobby.started, "Game already started");
        require(lobby.players.length < GAME_SIZE, "Lobby full");

        lobby.players.push(msg.sender);
        emit PlayerJoined(lobbyId, msg.sender);

        if (lobby.players.length == GAME_SIZE) {
            lobby.started = true;
            emit GameStarted(lobbyId, lobby.players);
        }
    }

    function settleGame(uint256 lobbyId, address winner, bytes32 gameHash) external {
        GameLobby storage lobby = gameLobby[lobbyId];
        require(lobby.started, "Game not started");

        uint256 prize = lobby.entryFee * GAME_SIZE;
        balances[winner] += prize;
        lobby.gameHash = gameHash;
        emit GameSettled(lobbyId, winner, prize);
    }

    function createTournament(uint256 entryFee) external {
        require(entryFee > 0, "Entry fee must be > 0");
        Tournament storage tournament = tournaments[tournamentCounter];
        tournament.id = tournamentCounter;
        tournament.entryFee = entryFee;
        tournament.createdAt = block.timestamp;
        emit TournamentCreated(tournamentCounter, entryFee);
        tournamentCounter++;
    }

    function joinTournament(uint256 tournamentId) external payable {
        Tournament storage tournament = tournaments[tournamentId];
        require(msg.value == tournament.entryFee, "Incorrect entry fee");
        require(!tournament.started, "Tournament already started");
        require(tournament.players.length < TOURNAMENT_SIZE, "Tournament full");

        tournament.players.push(msg.sender);

        if (tournament.players.length == TOURNAMENT_SIZE) {
            tournament.started = true;
            emit TournamentStarted(tournamentId);
        }
    }

    function settleTournament(uint256 tournamentId, address winner, uint256 prizeAmount) external {
        Tournament storage tournament = tournaments[tournamentId];
        require(tournament.started, "Tournament not started");

        balances[winner] += prizeAmount;
        emit TournamentSettled(tournamentId, winner, prizeAmount);
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");
        balances[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    receive() external payable {}
}
