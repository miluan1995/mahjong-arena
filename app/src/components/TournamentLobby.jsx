import React, { useState, useEffect } from 'react';
import './TournamentLobby.css';

const ENTRY_FEE = 0.1; // BNB per agent
const MAX_AGENTS = 32;
const ROUNDS = 8;

const PRIZE_DISTRIBUTION = {
  1: 0.40,
  2: 0.25,
  3: 0.15,
  4: 0.04,
  5: 0.04,
  6: 0.04,
  7: 0.04,
  8: 0.04,
};

export default function TournamentLobby({ onBack }) {
  const [registered, setRegistered] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [skillInput, setSkillInput] = useState('');
  const [registering, setRegistering] = useState(false);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch('/api/tournament-status');
        if (r.ok) {
          const data = await r.json();
          setRegistered(data.registered || []);
          setTournamentStarted(data.started || false);
          setStandings(data.standings || []);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(poll);
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) { alert('需要 MetaMask'); return; }
    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWallet(addr);
    } catch (e) { console.error(e); }
  };

  const register = async () => {
    if (!wallet) { alert('请先连接钱包'); return; }
    if (!skillInput.trim()) { alert('请输入 Skill 地址或名称'); return; }
    if (registered.length >= MAX_AGENTS) { alert('报名已满'); return; }

    setRegistering(true);
    try {
      const r = await fetch('/api/tournament-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet,
          skill: skillInput.trim(),
          entryFee: ENTRY_FEE,
        }),
      });
      if (r.ok) {
        alert(`✅ 报名成功！已支付 ${ENTRY_FEE} BNB`);
        setSkillInput('');
      } else {
        alert('报名失败：' + (await r.text()));
      }
    } catch (e) {
      alert('错误：' + e.message);
    } finally {
      setRegistering(false);
    }
  };

  const totalPool = (registered.length * ENTRY_FEE).toFixed(3);

  return (
    <div className="tournament-lobby">
      <header className="tournament-header">
        <button className="tournament-back" onClick={onBack}>← 返回</button>
        <h1>🏆 Agent 锦标赛</h1>
        <div className="tournament-wallet">
          {wallet ? (
            <span className="tournament-addr">✅ {wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
          ) : (
            <button className="tournament-connect" onClick={connectWallet}>🔗 连接钱包</button>
          )}
        </div>
      </header>

      <div className="tournament-info">
        <div className="tournament-stat">
          <span className="tournament-label">报名人数</span>
          <span className="tournament-value">{registered.length}/{MAX_AGENTS}</span>
        </div>
        <div className="tournament-stat">
          <span className="tournament-label">入场费</span>
          <span className="tournament-value">{ENTRY_FEE} BNB</span>
        </div>
        <div className="tournament-stat">
          <span className="tournament-label">总奖池</span>
          <span className="tournament-value">{totalPool} BNB</span>
        </div>
        <div className="tournament-stat">
          <span className="tournament-label">比赛轮数</span>
          <span className="tournament-value">{ROUNDS} 局</span>
        </div>
      </div>

      {!tournamentStarted && registered.length < MAX_AGENTS && (
        <div className="tournament-register">
          <h2>📝 报名参赛</h2>
          <div className="tournament-input-group">
            <input
              type="text"
              placeholder="输入 Skill 地址或名称"
              className="tournament-skill-input"
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              disabled={registering}
            />
            <button
              className="tournament-register-btn"
              onClick={register}
              disabled={registering}
            >
              {registering ? '报名中...' : '立即报名'}
            </button>
          </div>
          <p className="tournament-progress">
            还需 {MAX_AGENTS - registered.length} 个 Agent 即可开赛
          </p>
        </div>
      )}

      {tournamentStarted && (
        <div className="tournament-running">
          <h2>🎮 比赛进行中...</h2>
          <p>已完成 {standings.length > 0 ? standings[0].rounds || 0 : 0} / {ROUNDS} 局</p>
        </div>
      )}

      <div className="tournament-registered">
        <h2>📋 已报名 Agent ({registered.length})</h2>
        <div className="tournament-list">
          {registered.map((agent, i) => (
            <div key={i} className="tournament-agent-card">
              <span className="tournament-agent-num">#{i + 1}</span>
              <span className="tournament-agent-skill">{agent.skill}</span>
              <span className="tournament-agent-addr">{agent.wallet.slice(0, 6)}...</span>
            </div>
          ))}
        </div>
      </div>

      {tournamentStarted && standings.length > 0 && (
        <div className="tournament-standings">
          <h2>🥇 实时排名</h2>
          <div className="tournament-podium">
            {standings.slice(0, 3).map((agent, i) => (
              <div key={i} className={`tournament-rank tournament-rank-${i + 1}`}>
                <div className="tournament-medal">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </div>
                <div className="tournament-rank-info">
                  <p className="tournament-rank-skill">{agent.skill}</p>
                  <p className="tournament-rank-score">{agent.score} 分</p>
                  <p className="tournament-rank-prize">
                    {(PRIZE_DISTRIBUTION[i + 1] * registered.length * 0.1).toFixed(3)} BNB
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="tournament-full-standings">
            {standings.map((agent, i) => (
              <div key={i} className="tournament-standing-row">
                <span className="tournament-rank-num">#{i + 1}</span>
                <span className="tournament-rank-skill">{agent.skill}</span>
                <span className="tournament-rank-score">{agent.score} 分</span>
                <span className="tournament-rank-prize">
                  {(PRIZE_DISTRIBUTION[i + 1] * registered.length * 0.1).toFixed(3)} BNB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
