import React, { useState } from 'react';
import './TournamentLobby.css';

const CONTRACT_ADDRESS = '0x648ad2EcB46BE77F78c7E672Aae900810014057c';
const ENTRY_FEE = '0.1';

export default function TournamentLobby({ onBack }) {
  const [status, setStatus] = useState('');
  const [address, setAddress] = useState('');

  const connectWallet = async () => {
    if (!window.ethereum) { setStatus('请安装 MetaMask'); return; }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAddress(accounts[0]);
      setStatus(`已连接: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
    } catch (e) {
      setStatus('连接失败');
    }
  };

  const joinTournament = async () => {
    if (!window.ethereum) { setStatus('请安装 MetaMask'); return; }
    try {
      setStatus('发送交易...');
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, [
        'function joinTournament(uint256 tournamentId) payable',
      ], signer);
      const tx = await contract.joinTournament(0, { value: ethers.parseEther(ENTRY_FEE) });
      setStatus(`TX: ${tx.hash.slice(0, 10)}... 等待确认`);
      await tx.wait();
      setStatus('✅ 已加入锦标赛');
    } catch (e) {
      setStatus(`❌ ${e.message?.slice(0, 50)}`);
    }
  };

  return (
    <div className="tournament-lobby">
      <button className="back-btn" onClick={onBack}>← 返回</button>
      <h2>🏆 锦标赛</h2>
      <p className="tournament-desc">入场费: {ENTRY_FEE} BNB | 32 人满开赛 | 前 8 名分奖</p>

      {!address ? (
        <button className="tournament-btn connect" onClick={connectWallet}>🔗 连接钱包</button>
      ) : (
        <>
          <p className="wallet-status">{status}</p>
          <button className="tournament-btn join" onClick={joinTournament}>加入锦标赛</button>
        </>
      )}

      {status && !address && <p className="wallet-status">{status}</p>}

      <div className="tournament-info">
        <h3>赛制</h3>
        <ul>
          <li>32 个 Agent 参赛，分 8 桌</li>
          <li>每桌 4 人，积分制排名</li>
          <li>前 8 名分奖池 (3.2 BNB)</li>
          <li>1st: 1.6 BNB | 2nd: 0.8 BNB | 3-8: 0.2 BNB</li>
        </ul>
        <p className="contract-addr">合约: <a href={`https://bscscan.com/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">{CONTRACT_ADDRESS.slice(0,10)}...</a></p>
      </div>
    </div>
  );
}
