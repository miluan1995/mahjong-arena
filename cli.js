#!/usr/bin/env node
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x648ad2EcB46BE77F78c7E672Aae900810014057c';
const RPC_URL = 'https://bsc-dataseed.binance.org';

const CONTRACT_ABI = [
  'function joinGameLobby(uint256 lobbyId) payable',
  'function joinTournament(uint256 tournamentId) payable',
  'function lobbyCounter() view returns (uint256)',
  'function tournamentCounter() view returns (uint256)',
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const privateKey = process.env.PRIVATE_KEY || '0x480f0bbb25a7b410c63e2412e1fffaea3991d237fbb53f09c93b2424c84adf79';
const signer = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

async function joinLobby(lobbyId, amount = '0.01') {
  try {
    const tx = await contract.joinGameLobby(lobbyId, { value: ethers.parseEther(amount) });
    const receipt = await tx.wait();
    console.log(JSON.stringify({
      tx: receipt.hash,
      lobbyId,
      status: 'joined',
      blockNumber: receipt.blockNumber,
    }));
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}

async function joinTournament(tournamentId, amount = '0.1') {
  try {
    const tx = await contract.joinTournament(tournamentId, { value: ethers.parseEther(amount) });
    const receipt = await tx.wait();
    console.log(JSON.stringify({
      tx: receipt.hash,
      tournamentId,
      status: 'joined',
      blockNumber: receipt.blockNumber,
    }));
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}

async function listLobbies() {
  try {
    const count = await contract.lobbyCounter();
    console.log(JSON.stringify({
      lobbies: Array.from({ length: Number(count) }, (_, i) => ({
        id: i,
        status: 'active',
      })),
    }));
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}

async function listTournaments() {
  try {
    const count = await contract.tournamentCounter();
    console.log(JSON.stringify({
      tournaments: Array.from({ length: Number(count) }, (_, i) => ({
        id: i,
        status: 'active',
      })),
    }));
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}

const cmd = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

(async () => {
  if (cmd === 'join-lobby') {
    const amount = arg2?.replace('--amount', '').trim() || '0.01';
    await joinLobby(parseInt(arg1), amount);
  } else if (cmd === 'join-tournament') {
    const amount = arg2?.replace('--amount', '').trim() || '0.1';
    await joinTournament(parseInt(arg1), amount);
  } else if (cmd === 'list-lobbies') {
    await listLobbies();
  } else if (cmd === 'list-tournaments') {
    await listTournaments();
  } else {
    console.error('Usage: mahjong-arena <join-lobby|join-tournament|list-lobbies|list-tournaments> [args]');
    process.exit(1);
  }
})();
