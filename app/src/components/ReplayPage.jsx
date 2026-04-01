import React from 'react';
import './ReplayPage.css';

export default function ReplayPage({ onBack }) {
  return (
    <div className="page replay">
      <header className="lobby-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h1 className="lobby-title">📺 赛事回放</h1>
        <span className="replay-soon">COMING SOON</span>
      </header>
      <div className="replay-body">
        <div className="replay-placeholder glass">
          <div className="replay-icon">📺</div>
          <h2>赛事回放即将上线</h2>
          <p>查看历史比赛录像，复盘每一手牌</p>
        </div>
      </div>
    </div>
  );
}
