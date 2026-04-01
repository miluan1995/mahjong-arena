// OpenClaw Skill - Mahjong Arena Agent (Node.js CLI)
import { ethers } from 'ethers';

const CONTRACT = '0x6a0873501EDe896606CE8F411E0ed01E2F358710';
const RPC = 'https://bsc-dataseed.binance.org';

const ABI = [
  'function joinGameLobby(uint256 _lobbyId) payable',
  'function joinTournament(uint256 _id) payable',
  'function getLobbyInfo(uint256) view returns (uint256 id, uint256 entryFee, uint8 playerCount, uint8 status, uint256 prizePool, address winner)',
  'function getLobbyPlayers(uint256) view returns (address[4])',
  'function tournaments(uint256) view returns (uint256 id, uint256 entryFee, uint256 totalRounds, uint256 completedRounds, uint256 prizePool, uint256 platformFee, uint8 status, address winner)',
  'function lobbyCount() view returns (uint256)',
  'function tournamentCount() view returns (uint256)',
];

const provider = new ethers.JsonRpcProvider(RPC);

export function getReadContract() {
  return new ethers.Contract(CONTRACT, ABI, provider);
}

export function getWriteContract(privateKey) {
  const signer = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(CONTRACT, ABI, signer);
}

export async function joinLobby(privateKey, lobbyId) {
  const c = getWriteContract(privateKey);
  const r = getReadContract();
  const info = await r.getLobbyInfo(lobbyId);
  const tx = await c.joinGameLobby(lobbyId, { value: info.entryFee });
  const receipt = await tx.wait();
  return { tx: receipt.hash, lobbyId, fee: ethers.formatEther(info.entryFee) };
}

export async function joinTournament(privateKey, tournamentId) {
  const c = getWriteContract(privateKey);
  const r = getReadContract();
  const t = await r.tournaments(tournamentId);
  const tx = await c.joinTournament(tournamentId, { value: t.entryFee });
  const receipt = await tx.wait();
  return { tx: receipt.hash, tournamentId, fee: ethers.formatEther(t.entryFee) };
}

export async function getLobbyInfo(lobbyId) {
  const c = getReadContract();
  const info = await c.getLobbyInfo(lobbyId);
  const players = await c.getLobbyPlayers(lobbyId);
  return {
    id: Number(info.id), entryFee: ethers.formatEther(info.entryFee),
    playerCount: Number(info.playerCount), status: ['Open','Active','Settled'][Number(info.status)],
    prizePool: ethers.formatEther(info.prizePool), winner: info.winner,
    players: [...players].filter(a => a !== ethers.ZeroAddress),
  };
}

export async function getTournamentInfo(tournamentId) {
  const c = getReadContract();
  const t = await c.tournaments(tournamentId);
  return {
    id: Number(t.id), entryFee: ethers.formatEther(t.entryFee),
    totalRounds: Number(t.totalRounds), completedRounds: Number(t.completedRounds),
    prizePool: ethers.formatEther(t.prizePool),
    status: ['Open','Active','Settled','Cancelled'][Number(t.status)],
  };
}

export async function decideDiscard(hand, discards, wallRemain) {
  const handStr = hand.map(t => `${t.suit}${t.rank}`).join(' ');
  const res = await fetch('http://127.0.0.1:8402/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '川麻AI。返回JSON: {"tileIndex":<number>}' },
        { role: 'user', content: `手牌: ${handStr}。牌墙剩余: ${wallRemain}。选出牌序号。` },
      ],
      temperature: 0.3, max_tokens: 100,
    }),
  });
  const data = await res.json();
  const m = (data.choices?.[0]?.message?.content || '').match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : { tileIndex: 0 };
}
