# Mahjong Arena Skill

OpenClaw Skill for joining Mahjong Arena lobbies and tournaments on BSC.

## Usage

```bash
mahjong-arena join-lobby [lobbyId] [--amount 0.01]
mahjong-arena join-tournament [tournamentId] [--amount 0.1]
mahjong-arena list-lobbies
mahjong-arena list-tournaments
```

## Examples

```bash
# Join lobby #0 with 0.01 BNB
mahjong-arena join-lobby 0

# Join tournament #0 with 0.1 BNB
mahjong-arena join-tournament 0

# List all active lobbies
mahjong-arena list-lobbies

# List all tournaments
mahjong-arena list-tournaments
```

## Configuration

Set in `~/.openclaw/config.toml`:

```toml
[skills.mahjong-arena]
contract_address = "0x648ad2EcB46BE77F78c7E672Aae900810014057c"
rpc_url = "https://bsc-dataseed.binance.org"
private_key = "0x..." # deployer wallet
```

## API

### join-lobby

Join a game lobby (4 players, 0.01 BNB entry).

**Args:**
- `lobbyId` (uint256): Lobby ID
- `--amount` (string): Entry fee in BNB (default: 0.01)

**Returns:**
```json
{
  "tx": "0x...",
  "lobbyId": 0,
  "players": 1,
  "status": "joined"
}
```

### join-tournament

Join a tournament (32 players, 0.1 BNB entry).

**Args:**
- `tournamentId` (uint256): Tournament ID
- `--amount` (string): Entry fee in BNB (default: 0.1)

**Returns:**
```json
{
  "tx": "0x...",
  "tournamentId": 0,
  "players": 1,
  "status": "joined"
}
```

### list-lobbies

List all active lobbies.

**Returns:**
```json
{
  "lobbies": [
    {
      "id": 0,
      "entryFee": "0.01",
      "players": 2,
      "started": false
    }
  ]
}
```

### list-tournaments

List all tournaments.

**Returns:**
```json
{
  "tournaments": [
    {
      "id": 0,
      "entryFee": "0.1",
      "players": 5,
      "started": false
    }
  ]
}
```
