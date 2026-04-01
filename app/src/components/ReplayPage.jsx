import React, { useState } from 'react';
import './ReplayPage.css';

const TILE_MAP = {
  '一万':'🀇','二万':'🀈','三万':'🀉','四万':'🀊','五万':'🀋','六万':'🀌','七万':'🀍','八万':'🀎','九万':'🀏',
  '一条':'🀐','二条':'🀑','三条':'🀒','四条':'🀓','五条':'🀔','六条':'🀕','七条':'🀖','八条':'🀗','九条':'🀘',
  '一筒':'🀙','二筒':'🀚','三筒':'🀛','四筒':'🀜','五筒':'🀝','六筒':'🀞','七筒':'🀟','八筒':'🀠','九筒':'🀡',
};
const T = (name) => TILE_MAP[name] || name;

const MOCK_REPLAYS = [
  {
    id:1, mode:'人机挑战', time:'2026-04-02 02:30',
    players:['👤 玩家','🐻 黑瞎子','🦊 狐尾','🦅 鹰眼'],
    winner:'🐻 黑瞎子', winType:'自摸·清一色', fan:3, prize:'0.05 BNB',
    rounds:[
      { seat:0, action:'出牌', tile:'三万',
        hands:[['一万','二万','三万','五条','六条','七条','二筒','三筒','四筒','七筒','八筒','九筒','一万'],
               ['一条','二条','三条','四条','五条','六条','七条','八条','九条','一条','二条','三条','四条'],
               ['一万','三万','五万','七万','九万','二条','四条','六条','八条','一筒','三筒','五筒','七筒'],
               ['二万','四万','六万','八万','一条','三条','五条','七条','九条','二筒','四筒','六筒','八筒']]},
      { seat:1, action:'摸牌', tile:'五条',
        hands:[['一万','二万','五条','六条','七条','二筒','三筒','四筒','七筒','八筒','九筒','一万'],
               ['一条','二条','三条','四条','五条','六条','七条','八条','九条','一条','二条','三条','四条','五条'],
               ['一万','三万','五万','七万','九万','二条','四条','六条','八条','一筒','三筒','五筒','七筒'],
               ['二万','四万','六万','八万','一条','三条','五条','七条','九条','二筒','四筒','六筒','八筒']]},
      { seat:1, action:'出牌', tile:'四条',
        hands:[['一万','二万','五条','六条','七条','二筒','三筒','四筒','七筒','八筒','九筒','一万'],
               ['一条','二条','三条','五条','六条','七条','八条','九条','一条','二条','三条','五条'],
               ['一万','三万','五万','七万','九万','二条','四条','六条','八条','一筒','三筒','五筒','七筒'],
               ['二万','四万','六万','八万','一条','三条','五条','七条','九条','二筒','四筒','六筒','八筒']]},
      { seat:2, action:'碰', tile:'四条',
        hands:[['一万','二万','五条','六条','七条','二筒','三筒','四筒','七筒','八筒','九筒','一万'],
               ['一条','二条','三条','五条','六条','七条','八条','九条','一条','二条','三条','五条'],
               ['一万','三万','五万','七万','九万','二条','六条','八条','一筒','三筒','五筒','七筒'],
               ['二万','四万','六万','八万','一条','三条','五条','七条','九条','二筒','四筒','六筒','八筒']]},
      { seat:2, action:'出牌', tile:'一筒',
        hands:[['一万','二万','五条','六条','七条','二筒','三筒','四筒','七筒','八筒','九筒','一万'],
               ['一条','二条','三条','五条','六条','七条','八条','九条','一条','二条','三条','五条'],
               ['一万','三万','五万','七万','九万','二条','六条','八条','三筒','五筒','七筒'],
               ['二万','四万','六万','八万','一条','三条','五条','七条','九条','二筒','四筒','六筒','八筒']]},
      { seat:1, action:'摸牌', tile:'二条',
        hands:[['一万','二万','五条','六条','七条','二筒','三筒','四筒','七筒','八筒','九筒','一万'],
               ['一条','二条','三条','五条','六条','七条','八条','九条','一条','二条','三条','五条','二条'],
               ['一万','三万','五万','七万','九万','二条','六条','八条','三筒','五筒','七筒'],
               ['二万','四万','六万','八万','一条','三条','五条','七条','九条','二筒','四筒','六筒','八筒']]},
      { seat:1, action:'自摸', tile:'二条',
        hands:[['一万','二万','五条','六条','七条','二筒','三筒','四筒','七筒','八筒','九筒','一万'],
               ['一条','二条','三条','五条','六条','七条','八条','九条','一条','二条','三条','二条'],
               ['一万','三万','五万','七万','九万','二条','六条','八条','三筒','五筒','七筒'],
               ['二万','四万','六万','八万','一条','三条','五条','七条','九条','二筒','四筒','六筒','八筒']]},
    ],
  },
];

export default function ReplayPage({ onBack }) {
  const [selected, setSelected] = useState(null);
  const [playIdx, setPlayIdx] = useState(0);

  const replay = selected !== null ? MOCK_REPLAYS[selected] : null;
  const curRound = replay ? replay.rounds[playIdx] : null;

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
          <div className="replay-info glass">
            <div className="replay-info-row">
              <span>{replay.mode}</span>
              <span className="mono">{replay.time}</span>
            </div>
            <div className="replay-result-bar">
              🏆 {replay.winner} · {replay.winType} · {replay.fan}番 · {replay.prize}
            </div>
          </div>

          {/* 四家手牌 */}
          {curRound && curRound.hands && (
            <div className="replay-hands">
              {replay.players.map((p, i) => (
                <div key={i} className={`replay-hand glass ${i === curRound.seat ? 'active-hand' : ''} ${p === replay.winner ? 'winner-hand' : ''}`}>
                  <div className="hand-header">
                    <span className="hand-name">{p}</span>
                    <span className="hand-count mono">{curRound.hands[i]?.length || 0}张</span>
                  </div>
                  <div className="hand-tiles">
                    {(curRound.hands[i] || []).map((t, j) => (
                      <span key={j} className={`hand-tile ${curRound.action !== '摸牌' && i === curRound.seat && t === curRound.tile ? 'highlight-tile' : ''}`}>
                        {T(t)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 出牌记录 + 控制 */}
          <div className="replay-log glass">
            <div className="replay-log-header">
              <span>出牌记录</span>
              <div className="replay-controls">
                <button className="replay-ctrl-btn" onClick={() => setPlayIdx(0)}>⏮</button>
                <button className="replay-ctrl-btn" onClick={() => setPlayIdx(Math.max(0, playIdx - 1))}>◀</button>
                <button className="replay-ctrl-btn primary" onClick={() => setPlayIdx(Math.min(replay.rounds.length - 1, playIdx + 1))}>▶</button>
                <button className="replay-ctrl-btn" onClick={() => setPlayIdx(replay.rounds.length - 1)}>⏭</button>
                <span className="mono replay-step">{playIdx + 1}/{replay.rounds.length}</span>
              </div>
            </div>
            <div className="replay-log-body">
              {replay.rounds.map((r, i) => (
                <div key={i} className={`replay-log-row ${i === playIdx ? 'current' : ''} ${i > playIdx ? 'future' : ''}`}>
                  <span className="log-idx mono">{i + 1}</span>
                  <span className="log-player">{replay.players[r.seat]}</span>
                  <span className={`log-action ${r.action === '自摸' || r.action === '胡' ? 'hu' : r.action === '碰' ? 'peng' : r.action === '杠' ? 'gang' : ''}`}>{r.action}</span>
                  {r.tile && <span className="log-tile">{T(r.tile)} {r.tile}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
