import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ReplayPage.css';

const SUIT_LABEL = { wan: '万', tiao: '条', tong: '筒' };
const RANK_LABEL = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const SUIT_COLOR = { wan: '#ff4444', tiao: '#00cc66', tong: '#4488ff' };

function tileName(str) { return str; } // 已经是中文

export default function ReplayPage({ onBack }) {
  const [record, setRecord] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [actionIdx, setActionIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);
  const timerRef = useRef(null);

  // 加载牌谱
  useEffect(() => {
    fetch('./tournament-record-0.json')
      .then(r => r.json())
      .then(setRecord)
      .catch(() => setRecord(null));
  }, []);

  // 自动播放
  useEffect(() => {
    if (!playing || !record) return;
    const round = record.rounds[currentRound];
    if (!round) return;

    timerRef.current = setInterval(() => {
      setActionIdx(prev => {
        if (prev >= round.actions.length - 1) {
          // 本局结束，跳下一局
          if (currentRound < 7) {
            setCurrentRound(r => r + 1);
            return 0;
          } else {
            setPlaying(false);
            return prev;
          }
        }
        return prev + 1;
      });
    }, speed);

    return () => clearInterval(timerRef.current);
  }, [playing, currentRound, speed, record]);

  // 换局时重置
  useEffect(() => { setActionIdx(0); }, [currentRound]);

  if (!record) {
    return (
      <div className="replay-page">
        <header className="rp-header">
          <button className="rp-back" onClick={onBack}>← 返回</button>
          <h1>📺 锦标赛回放</h1>
        </header>
        <div className="rp-empty">暂无牌谱数据</div>
      </div>
    );
  }

  const round = record.rounds[currentRound];
  const actions = round ? round.actions : [];
  const visibleActions = actions.slice(0, actionIdx + 1);
  const agents = record.agents;

  // 计算当前累计积分
  const cumScores = [0, 0, 0, 0];
  for (let i = 0; i <= currentRound; i++) {
    const rd = record.rounds[i];
    if (!rd) continue;
    // 只计完整局或当前局到当前action的分
    if (i < currentRound) {
      for (let j = 0; j < 4; j++) cumScores[j] += rd.scores[j];
    } else {
      // 当前局看是否已胡牌
      for (const a of visibleActions) {
        if ((a.action === 'hu' || a.action === 'zimo') && a.score) {
          cumScores[a.player] += a.score;
        }
      }
      // 加上前面局的分
      for (let k = 0; k < currentRound; k++) {
        // already counted above
      }
    }
  }
  // fix: recalculate properly
  const properScores = [0, 0, 0, 0];
  for (let i = 0; i < currentRound; i++) {
    for (let j = 0; j < 4; j++) properScores[j] += record.rounds[i].scores[j];
  }
  // current round: check visible actions
  for (const a of visibleActions) {
    if ((a.action === 'hu' || a.action === 'zimo') && a.score) {
      properScores[a.player] += a.score;
    }
  }

  // 最后一个动作（高亮）
  const lastAction = visibleActions[visibleActions.length - 1];

  // 动作图标
  const actionIcon = (a) => ({
    discard: '🃏', draw: '📥', hu: '🀄', zimo: '🀄',
    peng: '🔴', gang: '🟡', angang: '🟡',
  }[a.action] || '▶');

  const actionLabel = (a) => {
    const name = agents[a.player]?.emoji || '';
    switch (a.action) {
      case 'discard': return `${name} 出 ${a.tile}`;
      case 'hu': return `${name} 胡！${a.tile} (${a.types} ${a.fan}番 +${a.score}分)`;
      case 'zimo': return `${name} 自摸！${a.tile} (${a.types} ${a.fan}番 +${a.score}分)`;
      case 'peng': return `${name} 碰！${a.tile}`;
      case 'gang': case 'angang': return `${name} 杠！${a.tile}`;
      default: return `${name} ${a.action}`;
    }
  };

  return (
    <div className="replay-page">
      <header className="rp-header">
        <button className="rp-back" onClick={onBack}>← 返回</button>
        <h1>📺 锦标赛 #{record.tournament} 回放</h1>
        <span className="rp-champ">🏆 {record.champion}</span>
      </header>

      {/* 积分板 */}
      <div className="rp-scoreboard">
        {agents.map((a, i) => (
          <div key={i} className={`rp-agent ${lastAction?.player === i ? 'active' : ''}`}>
            <span className="rp-emoji">{a.emoji}</span>
            <span className="rp-name">{a.name}</span>
            <span className="rp-score">{properScores[i]}分</span>
          </div>
        ))}
      </div>

      {/* 局选择 */}
      <div className="rp-rounds">
        {record.rounds.map((rd, i) => {
          const hasWinner = rd.winners.length > 0;
          return (
            <button
              key={i}
              className={`rp-round-btn ${i === currentRound ? 'current' : ''} ${hasWinner ? 'won' : 'draw'}`}
              onClick={() => { setCurrentRound(i); setPlaying(false); }}
            >
              {i + 1}
              {hasWinner && <span className="rp-round-icon">{agents[rd.winners[0].player].emoji}</span>}
            </button>
          );
        })}
      </div>

      {/* 控制栏 */}
      <div className="rp-controls">
        <button onClick={() => setActionIdx(Math.max(0, actionIdx - 1))}>⏮</button>
        <button onClick={() => setPlaying(!playing)}>{playing ? '⏸' : '▶️'}</button>
        <button onClick={() => setActionIdx(Math.min(actions.length - 1, actionIdx + 1))}>⏭</button>
        <select value={speed} onChange={e => setSpeed(+e.target.value)}>
          <option value={1000}>1x</option>
          <option value={500}>2x</option>
          <option value={250}>4x</option>
          <option value={100}>10x</option>
        </select>
        <span className="rp-progress">{actionIdx + 1}/{actions.length}</span>
      </div>

      {/* 当前高亮动作 */}
      {lastAction && (
        <div className={`rp-highlight ${lastAction.action === 'hu' || lastAction.action === 'zimo' ? 'win' : ''}`}>
          <span className="rp-h-icon">{actionIcon(lastAction)}</span>
          <span className="rp-h-text">{actionLabel(lastAction)}</span>
        </div>
      )}

      {/* 动作日志 */}
      <div className="rp-log">
        {visibleActions.slice(-20).map((a, i) => (
          <div
            key={i}
            className={`rp-log-item ${a.action === 'hu' || a.action === 'zimo' ? 'win-log' : ''}`}
          >
            <span className="rp-log-turn">T{a.turn}</span>
            <span className="rp-log-icon">{actionIcon(a)}</span>
            <span className="rp-log-text">{actionLabel(a)}</span>
          </div>
        ))}
      </div>

      {/* 本局结果 */}
      {actionIdx >= actions.length - 1 && round.winners.length > 0 && (
        <div className="rp-result">
          {round.winners.map((w, i) => (
            <div key={i} className="rp-winner">
              🀄 {agents[w.player].emoji} {agents[w.player].name} {w.winType}
              — {w.types.join('+')} {w.fan}番 +{w.score}分
              {w.from !== undefined && ` (${agents[w.from].emoji}点炮)`}
            </div>
          ))}
        </div>
      )}

      <footer className="rp-footer">
        <p>牌谱 Hash 已上链存证 · BSC · 可验证</p>
      </footer>
    </div>
  );
}
