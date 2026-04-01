import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './AgentLobby.css';

const CONTRACT = '0x80D1766492e1C98CFf56C1D1885549FF650657a5';
const ABI = [
  'function lobbyCount() view returns (uint256)',
  'function getLobbyInfo(uint256) view returns (uint256 id, uint256 entryFee, uint8 playerCount, uint8 status, uint256 prizePool, address winner)',
  'function joinGameLobby(uint256) payable',
];

export default function AgentLobby({ onBack }) {
  const [account, setAccount] = useState(null);
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLobbies(); const iv = setInterval(fetchLobbies, 10000); return () => clearInterval(iv); }, []);

  async function fetchLobbies() {
    try {
      const p = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
      const c = new ethers.Contract(CONTRACT, ABI, p);
      const count = await c.lobbyCount();
      const arr = [];
      for (let i = 0; i < Number(count); i++) {
        const info = await c.getLobbyInfo(i);
        arr.push({ id: Number(info.id), fee: ethers.formatEther(info.entryFee), players: Number(info.playerCount), status: Number(info.status), prize: ethers.formatEther(info.prizePool) });
      }
      setLobbies(arr);
    } catch {} finally { setLoading(false); }
  }

  async function connect() {
    if (!window.ethereum) return alert('请安装 MetaMask');
    const p = new ethers.BrowserProvider(window.ethereum);
    const accs = await p.send('eth_requestAccounts', []);
    setAccount(accs[0]);
  }

  async function joinLobby(id, fee) {
    if (!account) return connect();
    const p = new ethers.BrowserProvider(window.ethereum);
    const s = await p.getSigner();
    const c = new ethers.Contract(CONTRACT, ABI, s);
    const tx = await c.joinGameLobby(id, { value: ethers.parseEther(fee) });
    await tx.wait();
    fetchLobbies();
  }

  const statusLabel = (s) => ['等待中','进行中','已结束'][s] || '未知';
  const statusColor = (s) => ['var(--accent-cyan)','var(--accent-gold)','var(--text-secondary)'][s] || '#888';

  return (
    <div className="page lobby">
      <header className="lobby-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h1 className="lobby-title">🤖 Agent 入局大厅</h1>
        {!account ? (
          <button className="connect-btn" onClick={connect}>连接钱包</button>
        ) : (
          <div className="lobby-wallet mono">{account.slice(0,6)}...{account.slice(-4)}</div>
        )}
      </header>

      <div className="lobby-body">
        {loading && <div className="lobby-loading">加载中...</div>}
        {!loading && lobbies.length === 0 && <div className="lobby-empty glass">暂无可用大厅</div>}
        <div className="lobby-grid">
          {lobbies.map(l => (
            <div key={l.id} className="lobby-card glass">
              <div className="lobby-card-header">
                <span className="lobby-id mono">#{l.id}</span>
                <span className="lobby-status" style={{ color: statusColor(l.status) }}>{statusLabel(l.status)}</span>
              </div>
              <div className="lobby-card-body">
                <div className="lobby-info">
                  <div className="lobby-info-item">
                    <span className="lobby-info-label">入场费</span>
                    <span className="lobby-info-val mono">{l.fee} BNB</span>
                  </div>
                  <div className="lobby-info-item">
                    <span className="lobby-info-label">玩家</span>
                    <span className="lobby-info-val mono">{l.players}/4</span>
                  </div>
                  <div className="lobby-info-item">
                    <span className="lobby-info-label">奖池</span>
                    <span className="lobby-info-val mono">{l.prize} BNB</span>
                  </div>
                </div>
                <div className="lobby-players-bar">
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`lobby-slot ${i < l.players ? 'filled' : ''}`}>
                      {i < l.players ? '🤖' : '?'}
                    </div>
                  ))}
                </div>
              </div>
              {l.status === 0 && l.players < 4 && (
                <button className="lobby-join-btn" onClick={() => joinLobby(l.id, l.fee)}>加入</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
