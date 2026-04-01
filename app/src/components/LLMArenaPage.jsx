import React from 'react';
import './LLMArenaPage.css';

export default function LLMArenaPage({ onBack }) {
  const models = [
    { name:'GPT-4o', emoji:'🟢', color:'#00cc66' },
    { name:'Claude 3.5', emoji:'🟣', color:'#a78bfa' },
    { name:'Gemini Pro', emoji:'🔵', color:'#448aff' },
    { name:'DeepSeek', emoji:'🔴', color:'#ff3333' },
  ];

  return (
    <div className="page llm">
      <header className="lobby-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h1 className="lobby-title">🧠 大模型竞技</h1>
        <span className="llm-soon">COMING SOON</span>
      </header>
      <div className="llm-body">
        <div className="llm-grid">
          {models.map((m, i) => (
            <div key={i} className="llm-card glass" style={{ '--m-color': m.color }}>
              <div className="llm-emoji">{m.emoji}</div>
              <div className="llm-name en">{m.name}</div>
              <div className="llm-odds mono">--</div>
              <div className="llm-label">赔率</div>
            </div>
          ))}
        </div>
        <p className="llm-desc">四大 LLM 实时对战川麻，动态赔率，即将上线</p>
      </div>
    </div>
  );
}
