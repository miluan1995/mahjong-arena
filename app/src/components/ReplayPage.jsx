import React, { useState } from 'react';
import './ReplayPage.css';

// Mock replay data — 实际会从链上/服务器拉取
const MOCK_REPLAYS = [
  {
    id: 1, mode: '人机挑战', time: '2026-04-02 02:30', players: ['👤 玩家','🐻 黑瞎子','🦊 狐尾','🦅 鹰眼'],
    winner: '🐻 黑瞎子', winType: '自摸·清一色', fan: 3, prize: '0.05 BNB',
    rounds: [
      { seat:0, action:'出牌', tile:'三万' },
      { seat:1, action:'摸牌', tile:'' },
      { seat:1, action:'出牌', tile:'七条' },
      { seat:2, action:'碰', tile:'七条' },
      { seat:2, action:'出牌', tile:'一筒' },
      { seat:3, action:'摸牌', tile:'' },
      { seat:3, action:'出牌', tile:'九万' },
      { seat:0, action:'摸牌', tile:'' },
      { seat:0, action:'出牌', tile:'二筒' },
      { seat:1, action:'摸牌', tile:'' },
      { seat:1, action:'自摸', tile:'五条' },
    ],
  },
  {
    id: 2, mode: 'Agent 入局', time: '2026-04-02 02:15', players: ['🐻 黑瞎子','🦊 狐尾','🐉 龙王','🦅 鹰眼'],
    winner: '🦅 鹰眼', winType: '点炮·对对胡', fan: 2, prize: '0.04 BNB',
    rounds: [
      { seat:0, action:'出牌', tile:'一万' },
      { seat:1, action:'摸牌', tile:'' },
      { seat:1, action:'出牌', tile:'三筒' },
      { seat:2, action:'摸牌', tile:'' },
      { seat:2, action:'出牌', tile:'八条' },
      { seat:3, action:'胡', tile:'八条' },
    ],
  },
  {
    id: 3, mode: '锦标赛 #0 R2', time: '2026-04-02 01:00', players: ['Agent-A','Agent-B','Agent-C','Agent-D'],
    winner: 'Agent-C', winType: '自摸·七对', fan: 3, prize: '积分 +3',
    rounds: [
      { seat:0, action:'出牌', tile:'五万' },
      { seat:1, action:'出牌', tile:'二条' },
      { seat:2, action:'摸牌', tile:'' },
      { seat:2, action:'自摸', tile:'九筒' },
    ],
  },
];

export default function ReplayPage({ onBack }) {
  const [selected, setSelected] = useState(null);
  const [playIdx, setPlayIdx] = useState(0);

  const replay = selected !== null ? MOCK_REPLAYS[selected] : null;

  function playStep() {
    if (!replay) return;
    if (playIdx < replay.rounds.length - 1) setPlayIdx(playIdx + 1);
  }
  function resetPlay() { setPlayIdx(0); }

  return (
    <div className="page replay">
      <header className="lobby-header">
        <button className="back-btn" onClick={selected !== null ? () => { setSelected(null); setPlayIdx(0); } : onBack}>
          ← {selected !== null ? '返回列表' : '返回'}
        </button>
        <h1 className="lobby-title">📺 赛事回放</h1>
      </header>

      {selected === null ? (
        <div className="replay-body">
          <div className="replay-list">
            {MOCK_REPLAYS.map((r, i) => (
              <div key={r.id} className="replay-item glass" onClick={() => setSelected(i)}>
                <div className="replay-item-header">
                  <span className="replay-mode">{r.mode}</span>
                  <span className="replay-time mono">{r.time}</span>
                </div>
                <div className="replay-item-body">
                  <div className="replay-players">{r.players.join(' vs ')}</div>
                  <div className="replay-result">
                    <span className="replay-winner">🏆 {r.winner}</span>
                    <span className="replay-wintype">{r.winType} ({r.fan}番)</span>
                    <span className="replay-prize mono">{r.prize}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="replay-body">
          {/* Match info */}
          <div className="replay-info glass">
            <div className="replay-info-row">
              <span>{replay.mode}</span>
              <span className="mono">{replay.time}</span>
            </div>
            <div className="replay-seats">
              {replay.players.map((p, i) => (
                <div key={i} className={`replay-seat ${p === replay.winner ? 'winner' : ''}`}>
                  <span>{p}</span>
                  {p === replay.winner && <span className="seat-crown">👑</span>}
                </div>
              ))}
            </div>
            <div className="replay-result-bar">
              🏆 {replay.winner} · {replay.winType} · {replay.fan}番 · {replay.prize}
            </div>
          </div>

          {/* Play-by-play */}
          <div className="replay-log glass">
            <div className="replay-log-header">
              <span>出牌记录</span>
              <div className="replay-controls">
                <button className="replay-ctrl-btn" onClick={resetPlay}>⏮</button>
                <button className="replay-ctrl-btn" onClick={playStep}>▶ 下一步</button>
                <span className="mono replay-step">{playIdx + 1}/{replay.rounds.length}</span>
              </div>
            </div>
            <div className="replay-log-body">
              {replay.rounds.slice(0, playIdx + 1).map((r, i) => (
                <div key={i} className={`replay-log-row ${i === playIdx ? 'current' : ''}`}>
                  <span className="log-idx mono">{i + 1}</span>
                  <span className="log-player">{replay.players[r.seat]}</span>
                  <span className={`log-action ${r.action === '自摸' || r.action === '胡' ? 'hu' : r.action === '碰' ? 'peng' : ''}`}>{r.action}</span>
                  {r.tile && <span className="log-tile">{r.tile}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
