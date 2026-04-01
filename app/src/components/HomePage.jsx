import React, { useEffect, useRef } from 'react';
import './HomePage.css';

const CONTRACT = '0x80D1766492e1C98CFf56C1D1885549FF650657a5';

const MODES = [
  { key:'challenge', emoji:'🎯', title:'人机挑战', desc:'0.05 BNB 挑战 AI，赢走累计奖池', color:'#ff3333', tag:'LIVE' },
  { key:'play', emoji:'👤', title:'人机对战', desc:'免费体验，与 AI 切磋牌技', color:'#667eea', tag:'DEMO' },
  { key:'agent', emoji:'🤖', title:'Agent 入局', desc:'多 Agent 同桌竞技，赢家通吃', color:'#00ffc8', tag:'LIVE' },
  { key:'tournament', emoji:'🏆', title:'锦标赛', desc:'4 人积分赛，0.05 BNB 入场', color:'#ffd700', tag:'LIVE' },
  { key:'llm', emoji:'🧠', title:'大模型竞技', desc:'GPT vs Claude vs Gemini 实时对战', color:'#ff6b9d', tag:'SOON' },
  { key:'replay', emoji:'📺', title:'赛事回放', desc:'查看历史比赛录像', color:'#a78bfa', tag:'SOON' },
];

const AGENTS = [
  { emoji:'🐻', name:'黑瞎子', style:'激进', color:'#ff3333', desc:'快攻听牌，果断出击' },
  { emoji:'🦊', name:'狐尾', style:'保守', color:'#00ffc8', desc:'防守优先，稳健推进' },
  { emoji:'🐉', name:'龙王', style:'均衡', color:'#ffd700', desc:'全能选手，适应多变' },
  { emoji:'🦅', name:'鹰眼', style:'分析', color:'#a78bfa', desc:'记牌高手，推理精准' },
];

export default function HomePage({ onPlay, onAgent, onTournament, onLLM, onReplay, onChallenge }) {
  const cardsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const go = (key) => {
    const map = { challenge: onChallenge, play: onPlay, agent: onAgent, tournament: onTournament, llm: onLLM, replay: onReplay };
    map[key]?.();
  };

  return (
    <div className="page home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        <div className="hero-icon">🀄</div>
        <h1 className="hero-title">麻将竞技场</h1>
        <p className="hero-sub en">MAHJONG ARENA</p>
        <p className="hero-desc">川麻血战到底 · AI vs Human · On-Chain</p>
        <div className="hero-stats">
          <div className="stat"><span className="stat-val mono">0.05</span><span className="stat-label">BNB 入场</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-val mono">4</span><span className="stat-label">AI 对手</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-val mono">BSC</span><span className="stat-label">链上结算</span></div>
        </div>
      </section>

      {/* Modes */}
      <section className="section reveal">
        <h2 className="section-title">选择模式</h2>
        <div className="modes-grid" ref={cardsRef}>
          {MODES.map((m, i) => (
            <div
              key={m.key}
              className={`mode-card glass ${m.tag === 'SOON' ? 'disabled' : ''}`}
              style={{ '--card-color': m.color, animationDelay: `${i * 0.08}s` }}
              onClick={() => m.tag !== 'SOON' && go(m.key)}
            >
              <div className="mode-tag" style={{ background: m.color }}>{m.tag}</div>
              <div className="mode-emoji">{m.emoji}</div>
              <h3 className="mode-title">{m.title}</h3>
              <p className="mode-desc">{m.desc}</p>
              {m.tag !== 'SOON' && <div className="mode-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* AI Agents */}
      <section className="section reveal">
        <h2 className="section-title">AI 对手</h2>
        <div className="agents-grid">
          {AGENTS.map((a, i) => (
            <div key={i} className="agent-card glass" style={{ '--agent-color': a.color, animationDelay: `${i * 0.1}s` }}>
              <div className="agent-emoji">{a.emoji}</div>
              <div className="agent-name">{a.name}</div>
              <div className="agent-style" style={{ color: a.color }}>{a.style}</div>
              <div className="agent-desc">{a.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-contract mono">{CONTRACT.slice(0,6)}...{CONTRACT.slice(-4)}</div>
        <div className="footer-text">Mahjong Arena · BSC · Powered by AI</div>
      </footer>
    </div>
  );
}
