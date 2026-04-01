#!/usr/bin/env node
import { ethers } from 'ethers';

const CONTRACT = '0x80D1766492e1C98CFf56C1D1885549FF650657a5';
const RPC = 'https://bsc-dataseed.binance.org';

const ABI = [
  'function joinGameLobby(uint256 _lobbyId) payable',
  'function joinTournament(uint256 _id) payable',
  'function getLobbyInfo(uint256) view returns (uint256 id, uint256 entryFee, uint8 playerCount, uint8 status, uint256 prizePool, address winner)',
  'function getLobbyPlayers(uint256) view returns (address[4])',
  'function getPlayers(uint256) view returns (address[4])',
  'function getAllScores(uint256) view returns (address[4], uint256[4])',
  'function lobbyCount() view returns (uint256)',
  'function tournamentCount() view returns (uint256)',
  'function tournaments(uint256) view returns (uint256 id, uint256 entryFee, uint256 totalRounds, uint256 completedRounds, uint256 prizePool, uint256 platformFee, uint8 status, address winner)',
];

const provider = new ethers.JsonRpcProvider(RPC);
const pk = process.env.PRIVATE_KEY;
if (!pk) { console.error('Set PRIVATE_KEY env var'); process.exit(1); }
const signer = new ethers.Wallet(pk, provider);
const contract = new ethers.Contract(CONTRACT, ABI, signer);
const readOnly = new ethers.Contract(CONTRACT, ABI, provider);

const cmd = process.argv[2];
const arg1 = process.argv[3];

(async () => {
  try {
    if (cmd === 'join-lobby') {
      const info = await readOnly.getLobbyInfo(parseInt(arg1));
      const tx = await contract.joinGameLobby(parseInt(arg1), { value: info.entryFee });
      const r = await tx.wait();
      console.log(JSON.stringify({ tx: r.hash, lobbyId: arg1, status: 'joined', fee: ethers.formatEther(info.entryFee) }));

    } else if (cmd === 'join-tournament') {
      const t = await readOnly.tournaments(parseInt(arg1));
      const tx = await contract.joinTournament(parseInt(arg1), { value: t.entryFee });
      const r = await tx.wait();
      console.log(JSON.stringify({ tx: r.hash, tournamentId: arg1, status: 'joined', fee: ethers.formatEther(t.entryFee) }));

    } else if (cmd === 'info') {
      const info = await readOnly.getLobbyInfo(parseInt(arg1));
      const players = await readOnly.getLobbyPlayers(parseInt(arg1));
      console.log(JSON.stringify({
        id: Number(info.id), entryFee: ethers.formatEther(info.entryFee),
        playerCount: Number(info.playerCount), status: ['Open','Active','Settled'][Number(info.status)],
        prizePool: ethers.formatEther(info.prizePool), winner: info.winner,
        players: [...players].filter(a => a !== ethers.ZeroAddress),
      }));

    } else if (cmd === 'tournament-info') {
      const t = await readOnly.tournaments(parseInt(arg1));
      const players = await readOnly.getPlayers(parseInt(arg1));
      const [addrs, scores] = await readOnly.getAllScores(parseInt(arg1));
      console.log(JSON.stringify({
        id: Number(t.id), entryFee: ethers.formatEther(t.entryFee),
        totalRounds: Number(t.totalRounds), completedRounds: Number(t.completedRounds),
        prizePool: ethers.formatEther(t.prizePool),
        status: ['Open','Active','Settled','Cancelled'][Number(t.status)],
        winner: t.winner,
        players: [...addrs].filter(a => a !== ethers.ZeroAddress),
        scores: [...scores].map(Number),
      }));

    } else if (cmd === 'list-lobbies') {
      const count = Number(await readOnly.lobbyCount());
      for (let i = 0; i < count; i++) {
        const info = await readOnly.getLobbyInfo(i);
        console.log(JSON.stringify({
          id: i, fee: ethers.formatEther(info.entryFee),
          players: Number(info.playerCount), status: ['Open','Active','Settled'][Number(info.status)],
        }));
      }

    } else if (cmd === 'list-tournaments') {
      const count = Number(await readOnly.tournamentCount());
      for (let i = 0; i < count; i++) {
        const t = await readOnly.tournaments(i);
        console.log(JSON.stringify({
          id: i, fee: ethers.formatEther(t.entryFee),
          rounds: `${Number(t.completedRounds)}/${Number(t.totalRounds)}`,
          status: ['Open','Active','Settled','Cancelled'][Number(t.status)],
        }));
      }

    } else {
      console.error('Usage: mahjong-arena <join-lobby|join-tournament|info|tournament-info|list-lobbies|list-tournaments> [id]');
      process.exit(1);
    }
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
})();
