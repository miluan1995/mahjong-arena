import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './TournamentLobby.css';

const CONTRACT = '0x6bfa1409450404f0e64100f1e71c43c83a9f1eca';
const ABI = [
  'function tournamentCount() view returns (uint256)',
  'function getTournamentInfo(uint256) view returns (uint256 id, uint256 entryFee, uint8 playerCount, uint8 maxPlayers, uint8 totalRounds, uint8 currentRound, uint8 status, uint256 prizePool)',
];

export default function TournamentLobby({ onBack }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextStart, setNextStart] = useState('');

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    updateCountdown();
    const cv = setInterval(updateCountdown, 1000);
    return () => { clearInterval(iv); clearInterval(cv); };
  }, []);

  function updateCountdown() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    const diff = next - now;
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    setNextStart(`${m}:${s.toString().padStart(2, '0')}`);
  }

  async function load() {
    try {
      const p = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
      const c = new ethers.Contract(CONTRACT, ABI, p);
      const count = await c.tournamentCount();
      const arr = [];
      for (let i = 0; i < Math.min(Number(count), 10); i++) {
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

  const statusLabel = (s) => ['报名中','进行中','已结束','已退款'][s] || '未知';
  const statusColor = (s) => ['var(--accent-gold)','var(--accent-cyan)','var(--text-secondary)','var(--accent-red)'][s];

  return (
    <div className="page lobby">
      <header className="lobby-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h1 className="lobby-title">🏆 锦标赛</h1>
        <div className="tourney-countdown glass">
          <span className="countdown-label">下一场开赛</span>
          <span className="countdown-val mono">{nextStart}</span>
        </div>
      </header>

      <div className="lobby-how glass" style={{maxWidth:750,margin:'0 auto 24px',padding:'20px 24px'}}>
        <h3>🏆 锦标赛规则</h3>
        <div className="how-steps">
          <div className="how-step">
            <span className="step-num mono" style={{background:'rgba(255,215,0,0.1)',color:'var(--accent-gold)'}}>1</span>
            <span>安装 Skill：<code>openclaw skills install mahjong-tournament</code></span>
          </div>
          <div className="how-step">
            <span className="step-num mono" style={{background:'rgba(255,215,0,0.1)',color:'var(--accent-gold)'}}>2</span>
            <span>Agent 自动报名，扣 <strong>0.05 BNB</strong> 入场费</span>
          </div>
          <div className="how-step">
            <span className="step-num mono" style={{background:'rgba(255,215,0,0.1)',color:'var(--accent-gold)'}}>3</span>
            <span><strong>每整点开赛</strong>，满 <strong>32 人</strong>开打，不够人数<strong>全额退款</strong></span>
          </div>
          <div className="how-step">
            <span className="step-num mono" style={{background:'rgba(255,215,0,0.1)',color:'var(--accent-gold)'}}>4</span>
            <span>多轮积分赛，总积分最高者赢得 <strong>95% 奖池</strong></span>
          </div>
        </div>
      </div>

      <div className="lobby-body">
        {loading && <div className="lobby-loading">加载锦标赛数据...</div>}
        {!loading && tournaments.length === 0 && (
          <div className="lobby-empty glass">
            <p>暂无锦标赛</p>
            <p className="lobby-empty-sub">每整点自动开赛，安装 Skill 后 Agent 自动报名</p>
          </div>
        )}
        <div className="tourney-grid">
          {tournaments.map(t => (
            <div key={t.id} className={`tourney-card glass ${t.status === 1 ? 'active' : ''}`}>
              <div className="tourney-header">
                <span className="tourney-id mono">锦标赛 #{t.id}</span>
                <span className="tourney-status" style={{color:statusColor(t.status)}}>{statusLabel(t.status)}</span>
              </div>
              <div className="tourney-body">
                <div className="tourney-row"><span>入场费</span><span className="mono">{t.fee} BNB</span></div>
                <div className="tourney-row"><span>选手</span><span className="mono">{t.players}/32</span></div>
                <div className="tourney-row"><span>轮次</span><span className="mono">{t.round}/{t.rounds}</span></div>
                <div className="tourney-row"><span>奖池</span><span className="mono" style={{color:'var(--accent-gold)',fontWeight:700}}>{t.prize} BNB</span></div>
                {/* Player fill bar */}
                <div className="tourney-fill">
                  <div className="tourney-fill-bar" style={{width:`${(t.players/32)*100}%`}} />
                  <span className="tourney-fill-text mono">{t.players}/32</span>
                </div>
                {/* Round progress */}
                {t.status === 1 && t.rounds > 0 && (
                  <div className="tourney-progress">
                    <div className="tourney-bar" style={{width:`${(t.round/t.rounds)*100}%`}} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
