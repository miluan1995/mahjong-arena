import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './TournamentLobby.css';

const CONTRACT = '0x80D1766492e1C98CFf56C1D1885549FF650657a5';
const ABI = [
  'function tournamentCount() view returns (uint256)',
  'function getTournamentInfo(uint256) view returns (uint256 id, uint256 entryFee, uint8 playerCount, uint8 maxPlayers, uint8 totalRounds, uint8 currentRound, uint8 status, uint256 prizePool)',
  'function joinTournament(uint256) payable',
];

export default function TournamentLobby({ onBack }) {
  const [account, setAccount] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(); const iv = setInterval(fetch, 10000); return () => clearInterval(iv); }, []);

  async function fetch() {
    try {
      const p = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
      const c = new ethers.Contract(CONTRACT, ABI, p);
      const count = await c.tournamentCount();
      const arr = [];
      for (let i = 0; i < Number(count); i++) {
        const info = await c.getTournamentInfo(i);
        arr.push({
          id: Number(info.id), fee: ethers.formatEther(info.entryFee),
          players: Number(info.playerCount), max: Number(info.maxPlayers),
          rounds: Number(info.totalRounds), round: Number(info.currentRound),
          status: Number(info.status), prize: ethers.formatEther(info.prizePool),
        });
      }
      setTournaments(arr);
    } catch {} finally { setLoading(false); }
  }

  async function connect() {
    if (!window.ethereum) return alert('请安装 MetaMask');
    const p = new ethers.BrowserProvider(window.ethereum);
    const accs = await p.send('eth_requestAccounts', []);
    setAccount(accs[0]);
  }

  async function join(id, fee) {
    if (!account) return connect();
    const p = new ethers.BrowserProvider(window.ethereum);
    const s = await p.getSigner();
    const c = new ethers.Contract(CONTRACT, ABI, s);
    const tx = await c.joinTournament(id, { value: ethers.parseEther(fee) });
    await tx.wait();
    fetch();
  }

  const statusLabel = (s) => ['报名中','进行中','已结束'][s] || '未知';
  const statusColor = (s) => ['var(--accent-gold)','var(--accent-cyan)','var(--text-secondary)'][s] || '#888';

  return (
    <div className="page lobby">
      <header className="lobby-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h1 className="lobby-title">🏆 锦标赛大厅</h1>
        {!account ? (
          <button className="connect-btn" onClick={connect}>连接钱包</button>
        ) : (
          <div className="lobby-wallet mono">{account.slice(0,6)}...{account.slice(-4)}</div>
        )}
      </header>

      <div className="lobby-body">
        {loading && <div className="lobby-loading">加载中...</div>}
        {!loading && tournaments.length === 0 && <div className="lobby-empty glass">暂无锦标赛</div>}
        <div className="lobby-grid">
          {tournaments.map(t => (
            <div key={t.id} className="lobby-card glass tournament-card">
              <div className="lobby-card-header">
                <span className="lobby-id mono">锦标赛 #{t.id}</span>
                <span className="lobby-status" style={{ color: statusColor(t.status) }}>{statusLabel(t.status)}</span>
              </div>
              <div className="lobby-card-body">
                <div className="lobby-info">
                  <div className="lobby-info-item">
                    <span className="lobby-info-label">入场费</span>
                    <span className="lobby-info-val mono">{t.fee} BNB</span>
                  </div>
                  <div className="lobby-info-item">
                    <span className="lobby-info-label">选手</span>
                    <span className="lobby-info-val mono">{t.players}/{t.max}</span>
                  </div>
                  <div className="lobby-info-item">
                    <span className="lobby-info-label">轮次</span>
                    <span className="lobby-info-val mono">{t.round}/{t.rounds}</span>
                  </div>
                  <div className="lobby-info-item">
                    <span className="lobby-info-label">奖池</span>
                    <span className="lobby-info-val mono" style={{color:'var(--accent-gold)'}}>{t.prize} BNB</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="tourney-progress">
                  <div className="tourney-progress-bar" style={{ width: `${(t.round / t.rounds) * 100}%` }} />
                </div>
              </div>
              {t.status === 0 && t.players < t.max && (
                <button className="lobby-join-btn tourney-join" onClick={() => join(t.id, t.fee)}>报名参赛</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
