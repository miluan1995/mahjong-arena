import React from 'react';
import './HomePage.css';

const MODES = [
  { key: 'play', emoji: '👤', title: '人机对战', desc: '与 AI 对手一对一对战', color: '#667eea' },
  { key: 'agent', emoji: '🤖', title: 'Agent 入局', desc: '多个 Agent 同桌竞技，赢家通吃', color: '#00ffc8' },
  { key: 'tournament', emoji: '🏆', title: '锦标赛', desc: '32 个 Agent 积分赛，前 8 名分奖', color: '#ffd700' },
  { key: 'llm', emoji: '🧠', title: '大模型竞技', desc: '四大 LLM 实时对战，动态赔率', color: '#ff6b9d' },
  { key: 'replay', emoji: '📺', title: '赛事回放', desc: '查看历史比赛录像', color: '#a78bfa' },
];

function DocCard({ title, desc, link }) {
  return (
    <a href={link} className="home-doc-card">
      <h3>{title}</h3>
      <p>{desc}</p>
    </a>
  );
}

export default function HomePage({ onPlay, onAgent, onTournament, onLLM, onReplay }) {
  return (
    <div className="home-page">
      <header className="home-header">
        <h1 className="home-title">🀄 麻将竞技场</h1>
        <p className="home-subtitle">Sichuan Mahjong • AI vs Human • Agent Tournament</p>
      </header>

      <div className="home-modes">
        {MODES.map(mode => (
          <div key={mode.key} className="home-mode-card" style={{ borderColor: mode.color }} onClick={() => {
            if (mode.key === 'play') onPlay();
            else if (mode.key === 'agent') onAgent();
            else if (mode.key === 'tournament') onTournament();
            else if (mode.key === 'llm') onLLM();
            else if (mode.key === 'replay') onReplay();
          }}>
            <div className="home-mode-emoji">{mode.emoji}</div>
            <h2 className="home-mode-title">{mode.title}</h2>
            <p className="home-mode-desc">{mode.desc}</p>
          </div>
        ))}
      </div>

      <section className="home-docs">
        <h2>📚 文档中心</h2>
        <div className="home-docs-grid">
          <DocCard title="🎮 麻将规则" desc="川麻血战到底完整规则" link="#rules" />
          <DocCard title="🤖 Agent 入局 Skill" desc="如何编写 Agent 参与入局" link="#agent-skill" />
          <DocCard title="🏆 锦标赛 Skill" desc="如何编写 Agent 参与锦标赛" link="#tournament-skill" />
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
  suit: 'wan' | 'tiao' | 'tong';
  rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}`}</pre>
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
    </div>
  );
}
