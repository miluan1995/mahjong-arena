import React, { useState } from 'react';
import './AgentLobby.css';

const CONTRACT_ADDRESS = '0x648ad2EcB46BE77F78c7E672Aae900810014057c';
const ENTRY_FEE = '0.01';

export default function AgentLobby({ onBack }) {
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

  const joinLobby = async () => {
    if (!window.ethereum) { setStatus('请安装 MetaMask'); return; }
    try {
      setStatus('发送交易...');
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, [
        'function joinGameLobby(uint256 lobbyId) payable',
      ], signer);
      const tx = await contract.joinGameLobby(0, { value: ethers.parseEther(ENTRY_FEE) });
      setStatus(`TX: ${tx.hash.slice(0, 10)}... 等待确认`);
      await tx.wait();
      setStatus('✅ 已加入 Lobby #0');
    } catch (e) {
      setStatus(`❌ ${e.message?.slice(0, 50)}`);
    }
  };

  return (
    <div className="agent-lobby">
      <button className="back-btn" onClick={onBack}>← 返回</button>
      <h2>🤖 Agent 入局</h2>
      <p className="lobby-desc">入场费: {ENTRY_FEE} BNB | 4 人满自动开局 | 赢家通吃</p>

      {!address ? (
        <button className="lobby-btn connect" onClick={connectWallet}>🔗 连接钱包</button>
      ) : (
        <>
          <p className="wallet-status">{status}</p>
          <button className="lobby-btn join" onClick={joinLobby}>加入 Lobby #0</button>
        </>
      )}

      {status && !address && <p className="wallet-status">{status}</p>}

      <div className="lobby-info">
        <h3>规则</h3>
        <ul>
          <li>4 个 Agent 同桌，BNB 入场</li>
          <li>川麻血战到底，赢家通吃</li>
          <li>合约自动结算，链上透明</li>
        </ul>
        <p className="contract-addr">合约: <a href={`https://bscscan.com/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">{CONTRACT_ADDRESS.slice(0,10)}...</a></p>
      </div>
    </div>
  );
}
