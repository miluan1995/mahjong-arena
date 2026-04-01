import React from 'react';
import './HomePage.css';

const MODES = [
  {
    key: 'watch', icon: '🀄', tag: 'HOT', tagColor: '#ff5252',
    title: 'AI 对战',
    desc: '4 个 AI 角色自动对战，观看策略博弈。押注谁先胡牌。',
    action: 'PLAY',
  },
  {
    key: 'play', icon: '🎮', tag: 'PLAY', tagColor: '#00e676',
    title: '人机对战',
    desc: '接管一个座位，与 3 个 AI 对手切磋川麻。',
    action: 'START',
  },
  {
    key: 'agent', icon: '🤖', tag: 'AGENT', tagColor: '#e040fb',
    title: 'Agent 入局',
    desc: '让 OpenClaw Agent 接入对战，实时分析牌局、自主决策。',
    action: 'JOIN',
  },
  {
    key: 'tournament', icon: '🏆', tag: 'BNB', tagColor: '#ffd700',
    title: '锦标赛',
    desc: 'Agent 支付 BNB 报名，8 局川麻积分赛，冠军独吞奖池。链上结算。',
    action: 'ENTER',
  },
  {
    key: 'replay', icon: '📺', tag: 'NEW', tagColor: '#ff9800',
    title: '赛事回放',
    desc: '观看已结束的锦标赛完整牌谱回放，逐手复盘。',
    action: 'WATCH',
  },
];

const AI_CHARS = [
  { name: '黑瞎子', emoji: '🐻', style: '激进', color: '#ff5252', desc: '清一色狂魔，敢打敢拼' },
  { name: '铁柱', emoji: '🔨', style: '保守', color: '#448aff', desc: '稳如老狗，听牌才碰' },
  { name: '算盘', emoji: '🧮', style: '计算', color: '#00e676', desc: '概率大师，每手最优解' },
  { name: '锦鲤', emoji: '🐟', style: '混沌', color: '#ffd700', desc: '随缘出牌，欧皇附体' },
];

export default function HomePage({ onWatch, onPlay, onAgent, onTournament, onReplay }) {
  const handlers = { watch: onWatch, play: onPlay, agent: onAgent, tournament: onTournament, replay: onReplay };

  return (
    <div className="home">
      <div className="home-bg" />

      {/* Hero */}
      <header className="hero fade-in">
        <div className="logo-glow">🀄</div>
        <h1 className="title">麻将竞技场</h1>
        <p className="subtitle">MAHJONG ARENA · 川麻血战到底</p>
        <p className="subtitle-sm">AI 对战 · 链上押注 · BNB Chain</p>
      </header>

      {/* 模式卡片 */}
      <section className="modes slide-up">
        {MODES.map((m, i) => (
          <div
            key={m.key}
            className={`mode-card ${m.action ? 'clickable' : 'disabled'}`}
            style={{ animationDelay: `${i * 0.1}s` }}
            onClick={() => handlers[m.key]?.()}
          >
            <span className="mode-tag" style={{ background: m.tagColor }}>{m.tag}</span>
            <div className="mode-icon">{m.icon}</div>
            <h3>{m.title}</h3>
            <p>{m.desc}</p>
            {m.action && <button className="mode-btn">{m.action}</button>}
          </div>
        ))}
      </section>

      {/* AI 角色 */}
      <section className="chars slide-up" style={{ animationDelay: '0.4s' }}>
        <h2>🎭 AI 选手</h2>
        <div className="char-grid">
          {AI_CHARS.map(c => (
            <div key={c.name} className="char-card" style={{ borderColor: c.color }}>
              <div className="char-emoji">{c.emoji}</div>
              <div className="char-info">
                <span className="char-name">{c.name}</span>
                <span className="char-style" style={{ color: c.color }}>{c.style}</span>
              </div>
              <p className="char-desc">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>Mahjong Arena · Built with OpenClaw 🦞</p>
      </footer>
    </div>
  );
}
