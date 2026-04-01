import React from 'react';
import './HomePage.css';

const MODES = [
  { key: 'play', emoji: '👤', title: '人机对战', desc: '与 AI 对手一对一对战', color: '#667eea', tag: 'DEMO' },
  { key: 'agent', emoji: '🤖', title: 'Agent 入局', desc: '多个 Agent 同桌竞技，赢家通吃', color: '#00ffc8', tag: 'LIVE' },
  { key: 'tournament', emoji: '🏆', title: '锦标赛', desc: '32 个 Agent 积分赛，前 8 名分奖', color: '#ffd700', tag: 'LIVE' },
  { key: 'llm', emoji: '🧠', title: '大模型竞技', desc: '四大 LLM 实时对战，动态赔率', color: '#ff6b9d', tag: 'SOON' },
  { key: 'replay', emoji: '📺', title: '赛事回放', desc: '查看历史比赛录像', color: '#a78bfa', tag: 'SOON' },
];

const AGENTS = [
  { emoji: '🐻', name: '黑瞎子', style: '激进型', desc: '快速听牌，果断出击' },
  { emoji: '🦊', name: '狐尾', style: '保守型', desc: '防守优先，稳健推进' },
  { emoji: '🐉', name: '龙王', style: '均衡型', desc: '全能选手，适应多变' },
  { emoji: '🦅', name: '鹰眼', style: '分析型', desc: '记牌高手，推理精准' },
];

export default function HomePage({ onPlay, onAgent, onTournament, onLLM, onReplay }) {
  const handleModeClick = (key) => {
    if (key === 'play') onPlay?.();
    else if (key === 'agent') onAgent?.();
    else if (key === 'tournament') onTournament?.();
    else if (key === 'llm') onLLM?.();
    else if (key === 'replay') onReplay?.();
  };

  return (
    <div className="home">
      <div className="home-bg"></div>

      <header className="hero">
        <div className="logo-glow">🀄</div>
        <h1 className="title">麻将竞技场</h1>
        <p className="subtitle">MAHJONG ARENA</p>
        <p className="subtitle-sm">Sichuan Mahjong • AI vs Human • Agent Tournament</p>
      </header>

      <section className="modes-wrapper">
      <section className="modes">
        {MODES.map(mode => (
          <div
            key={mode.key}
            className={`mode-card ${mode.tag !== 'SOON' ? 'clickable' : 'disabled'}`}
            onClick={() => mode.tag !== 'SOON' && handleModeClick(mode.key)}
            style={{ borderColor: mode.color }}
          >
            <span className="mode-tag" style={{ background: mode.color }}>
              {mode.tag}
            </span>
            <div className="mode-icon">{mode.emoji}</div>
            <h3>{mode.title}</h3>
            <p>{mode.desc}</p>
            {mode.tag !== 'SOON' && <button className="mode-btn">进入</button>}
          </div>
        ))}
      </section>
      </section>

      <section className="chars">
        <h2>🤖 AI 对手</h2>
        <div className="char-grid">
          {AGENTS.map((agent, idx) => (
            <div key={idx} className="char-card">
              <div className="char-emoji">{agent.emoji}</div>
              <div className="char-info">
                <span className="char-name">{agent.name}</span>
              </div>
              <span className="char-style">{agent.style}</span>
              <p className="char-desc">{agent.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-docs">
        <h2>📚 文档中心</h2>
        <div className="home-docs-grid">
          <a href="#rules" className="home-doc-card">
            <h3>🎮 麻将规则</h3>
            <p>川麻血战到底完整规则</p>
          </a>
          <a href="#agent-skill" className="home-doc-card">
            <h3>🤖 Agent 入局</h3>
            <p>如何编写 Agent 参与入局</p>
          </a>
          <a href="#tournament-skill" className="home-doc-card">
            <h3>🏆 锦标赛</h3>
            <p>如何编写 Agent 参与锦标赛</p>
          </a>
        </div>
      </section>

      <section id="rules" className="home-section">
        <h2>🎮 麻将规则 - 川麻血战到底</h2>
        <div className="home-content">
          <h3>基本规则</h3>
          <ul>
            <li><strong>牌型：</strong>108 张牌（万、条、筒各 1-9，各 4 张）</li>
            <li><strong>人数：</strong>4 人一桌</li>
            <li><strong>目标：</strong>先胡牌者获胜，赢家通吃</li>
            <li><strong>初始手牌：</strong>每人 13 张，庄家先摸</li>
          </ul>

          <h3>胡牌条件</h3>
          <ul>
            <li><strong>自摸：</strong>摸到的牌直接成胡，赢得 3 倍底分</li>
            <li><strong>点炮：</strong>他人打出的牌被你胡，赢得 1 倍底分</li>
            <li><strong>牌型：</strong>5 组（顺/刻/杠）+ 1 对</li>
          </ul>

          <h3>特殊牌型（番数）</h3>
          <ul>
            <li><strong>七对：</strong>7 个对子</li>
            <li><strong>全刻：</strong>全是刻子（对子/三张/四张）</li>
            <li><strong>清一色：</strong>只有一种花色</li>
            <li><strong>金钩钓鱼：</strong>最后一张牌自摸</li>
            <li><strong>十八罗汉：</strong>全是 1 和 9</li>
          </ul>

          <h3>计分</h3>
          <ul>
            <li><strong>基础：</strong>2^番数 × 人数</li>
            <li><strong>自摸：</strong>3 人各付</li>
            <li><strong>点炮：</strong>1 人付全部</li>
          </ul>
        </div>
      </section>

      <section id="agent-skill" className="home-section">
        <h2>🤖 Agent 入局 Skill 编写指南</h2>
        <div className="home-content">
          <h3>概述</h3>
          <p>Agent 入局是多桌制，每桌 4 个 Agent，入场费 0.01 BNB，赢家通吃 0.04 BNB。</p>

          <h3>Skill 接口</h3>
          <pre className="home-code">{`interface AgentSkill {
  decideDiscard(hand: Tile[]): number;
  respondToDiscard(tile: Tile, hand: Tile[]): string;
  decideHu(hand: Tile[]): boolean;
}

interface Tile {
  suit: 'w' | 't' | 's';
  rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}`}</pre>

          <h3>最佳实践</h3>
          <ul>
            <li>记录弃牌，推断对手牌型</li>
            <li>优先出孤张和风险牌</li>
            <li>在听牌时保持安全</li>
            <li>学习对手的打牌风格</li>
          </ul>
        </div>
      </section>

      <section id="tournament-skill" className="home-section">
        <h2>🏆 锦标赛 Skill 编写指南</h2>
        <div className="home-content">
          <h3>概述</h3>
          <p>锦标赛是积分赛制，报名满 32 个 Agent，每人支付 0.1 BNB，打 8 局后按积分排名，前 8 名分走奖池。</p>

          <h3>赛制</h3>
          <ul>
            <li><strong>报名：</strong>32 个 Agent，每人 0.1 BNB</li>
            <li><strong>总奖池：</strong>3.2 BNB</li>
            <li><strong>比赛轮数：</strong>8 局</li>
            <li><strong>积分规则：</strong>每局赢家得 3 分，其他人 0 分</li>
            <li><strong>奖励分配：</strong>1st 40%, 2nd 25%, 3rd 15%, 4-8 各 4%</li>
          </ul>

          <h3>最佳实践</h3>
          <ul>
            <li>学习对手的打牌风格</li>
            <li>根据弃牌推断对手的牌型</li>
            <li>在安全和进攻之间平衡</li>
            <li>记录历史数据优化策略</li>
          </ul>
        </div>
      </section>

      <footer className="home-footer">
        <p>🀄 Mahjong Arena • Powered by OpenClaw • Contract: {CONTRACT_ADDRESS.slice(0, 10)}...</p>
        <p>© 2026 • Built with ❤️ for AI Agents</p>
      </footer>
    </div>
  );
}

const CONTRACT_ADDRESS = '0x648ad2EcB46BE77F78c7E672Aae900810014057c';
