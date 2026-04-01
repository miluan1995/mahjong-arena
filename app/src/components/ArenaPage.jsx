import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createGame, step, humanDiscard, humanAfterDraw, humanRespond } from '../game/game.js';
import { renderGame, getBottomTileHitboxes } from '../game/render.js';
import { preloadTiles } from '../game/tiles.js';
import './ArenaPage.css';

const NAMES = ['🐻 黑瞎子', '🔨 铁柱', '🧮 算盘', '🐟 锦鲤'];

export default function ArenaPage({ mode, onBack }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const timerRef = useRef(null);
  const [speed, setSpeed] = useState(800);
  const [auto, setAuto] = useState(false);
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState('playing');
  const [selectedTile, setSelectedTile] = useState(null);
  const [waiting, setWaiting] = useState(null); // 人类等待状态
  const [tilesReady, setTilesReady] = useState(false);
  const [, forceUpdate] = useState(0);

  const addLog = useCallback((text) => {
    setLog(prev => [text, ...prev].slice(0, 80));
  }, []);

  const rerender = useCallback(() => {
    if (canvasRef.current && gameRef.current) {
      renderGame(canvasRef.current, gameRef.current, { selectedTileId: selectedTile });
    }
  }, [selectedTile]);

  // 预加载牌面
  useEffect(() => {
    preloadTiles().then(() => { setTilesReady(true); });
  }, []);

  const initGame = useCallback(() => {
    const humanSeat = mode === 'play' ? 0 : -1;
    gameRef.current = createGame(humanSeat);
    setLog([]);
    setPhase('playing');
    setSelectedTile(null);
    setWaiting(null);
    addLog('🀄 新局开始！洗牌发牌完毕');
    setTimeout(() => {
      rerender();
      // 人机模式：开局自动推进到玩家回合
      if (mode === 'play') {
        const g = gameRef.current;
        if (g && !g.waitingFor && g.phase === 'playing') autoAdvanceAI(g);
      }
    }, 100);
  }, [mode, addLog, rerender, autoAdvanceAI]);

  useEffect(() => { if (tilesReady) initGame(); }, [tilesReady, initGame]);

  useEffect(() => {
    const handleResize = () => rerender();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [rerender]);

  useEffect(() => { rerender(); }, [selectedTile, waiting, rerender]);

  const logEvents = useCallback((evts, g) => {
    if (!evts) return;
    for (const e of evts) {
      const nm = g.players[e.seat]?.name || '';
      const em = g.players[e.seat]?.emoji || '';
      if (e.type === 'draw' && !e.extra) addLog(`${em} ${nm} 摸牌`);
      if (e.type === 'discard') addLog(`${em} ${nm} 打出 ${e.tile?.suit}${e.tile?.rank} ${e.text || ''}`);
      if (e.type === 'hu') addLog(`🎉 ${em} ${nm} ${e.selfDraw ? '自摸' : '胡'}！${e.text || ''}`);
      if (e.type === 'peng') addLog(`${em} ${nm} 碰！`);
      if (e.type === 'gang') addLog(`${em} ${nm} 杠！`);
      if (e.type === 'draw_end') addLog('📦 牌墙摸完，流局！');
    }
  }, [addLog]);

  // 人机模式：AI 回合自动推进（带延迟，让玩家看到 AI 操作）
  const autoAdvanceAI = useCallback((g) => {
    if (!g || g.phase !== 'playing' || g.waitingFor || mode !== 'play') return;
    let delay = 0;
    const advance = () => {
      if (!g || g.phase !== 'playing' || g.waitingFor) {
        if (g.waitingFor) setWaiting({ ...g.waitingFor });
        rerender();
        forceUpdate(v => v + 1);
        return;
      }
      const evts = step(g);
      logEvents(evts, g);
      rerender();
      forceUpdate(v => v + 1);
      if (g.phase === 'finished') { setPhase('finished'); addLog('🏁 对局结束'); return; }
      if (g.waitingFor) { setWaiting({ ...g.waitingFor }); return; }
      // 继续推进 AI，每步加 400ms 延迟
      setTimeout(advance, 400);
    };
    setTimeout(advance, 300);
  }, [mode, logEvents, rerender, addLog]);

  const processEvents = useCallback((evts) => {
    if (!evts) return;
    const g = gameRef.current;
    logEvents(evts, g);
    // 检查人类等待状态
    if (g.waitingFor) setWaiting({ ...g.waitingFor });
    else setWaiting(null);

    if (g.phase === 'finished') { setPhase('finished'); stopAuto(); addLog('🏁 对局结束'); }
    rerender();
    forceUpdate(v => v + 1);

    // 人机模式：玩家操作完后自动推进 AI
    if (mode === 'play' && !g.waitingFor && g.phase === 'playing') {
      autoAdvanceAI(g);
    }
  }, [logEvents, rerender, addLog, mode, autoAdvanceAI]);

  const doStep = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.phase !== 'playing' || g.waitingFor) return;
    const evts = step(g);
    processEvents(evts);
  }, [processEvents]);

  const stopAuto = useCallback(() => {
    setAuto(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startAuto = useCallback(() => {
    setAuto(true);
    timerRef.current = setInterval(() => {
      const g = gameRef.current;
      if (!g || g.phase !== 'playing' || g.waitingFor) return;
      const evts = step(g);
      processEvents(evts);
    }, speed);
  }, [speed, processEvents]);

  const toggleAuto = () => auto ? stopAuto() : startAuto();

  useEffect(() => {
    if (auto && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const g = gameRef.current;
        if (!g || g.phase !== 'playing' || g.waitingFor) return;
        const evts = step(g);
        processEvents(evts);
      }, speed);
    }
  }, [speed, auto, processEvents]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Canvas 点击 — 出牌
  const handleCanvasClick = useCallback((e) => {
    const g = gameRef.current;
    if (!g || !g.waitingFor) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hitboxes = getBottomTileHitboxes();

    for (let i = hitboxes.length - 1; i >= 0; i--) {
      const hb = hitboxes[i];
      if (mx >= hb.x && mx <= hb.x + hb.w && my >= hb.y && my <= hb.y + hb.h) {
        if (g.waitingFor.type === 'discard' || (g.waitingFor.type === 'afterdraw' && !selectedTile)) {
          if (selectedTile === hb.tileId) {
            // 双击同一张牌 = 出牌
            if (g.waitingFor.type === 'discard' || g.waitingFor.type === 'afterdraw') {
              const evts = humanDiscard(g, hb.tileId);
              setSelectedTile(null);
              processEvents(evts);
            }
          } else {
            setSelectedTile(hb.tileId);
          }
        }
        return;
      }
    }
    setSelectedTile(null);
  }, [selectedTile, processEvents]);

  // 人类操作按钮
  const handleAction = useCallback((action) => {
    const g = gameRef.current;
    if (!g || !g.waitingFor) return;

    if (g.waitingFor.type === 'afterdraw') {
      const evts = humanAfterDraw(g, action);
      setSelectedTile(null);
      processEvents(evts);
    } else if (g.waitingFor.type === 'respond') {
      const evts = humanRespond(g, action);
      setSelectedTile(null);
      processEvents(evts);
    } else if (action === 'discard' && selectedTile) {
      const evts = humanDiscard(g, selectedTile);
      setSelectedTile(null);
      processEvents(evts);
    }
  }, [selectedTile, processEvents]);

  const changeSpeed = (dir) => setSpeed(s => Math.max(100, Math.min(2000, s - dir * 200)));
  const g = gameRef.current;

  return (
    <div className="arena">
      <header className="arena-header">
        <button className="back-btn" onClick={() => { stopAuto(); onBack(); }}>← 返回</button>
        <div className="arena-title">
          <span className="arena-icon">🀄</span>
          <span>{mode === 'watch' ? 'AI 对战' : '人机对战'}</span>
        </div>
        <div className="arena-info">
          <span className="wall-count">余 {g?.wall?.length ?? '?'}</span>
          <span className="turn-count">第 {g?.turn ?? 0} 手</span>
        </div>
      </header>

      <div className="table-wrap">
        <canvas ref={canvasRef} className="table-canvas" onClick={handleCanvasClick} />
      </div>

      {/* 人类操作面板 */}
      {waiting && (
        <div className="human-actions">
          {waiting.type === 'discard' && (
            <>
              <span className="action-hint">👆 点击手牌选中，再次点击出牌</span>
              {selectedTile && (
                <button className="action-btn confirm" onClick={() => handleAction('discard')}>出牌</button>
              )}
            </>
          )}
          {waiting.type === 'afterdraw' && (
            <>
              {waiting.actions?.hu && <button className="action-btn hu" onClick={() => handleAction('hu')}>🎉 胡</button>}
              {waiting.actions?.angang && <button className="action-btn gang" onClick={() => handleAction('angang')}>杠</button>}
              {waiting.actions?.jiagang && <button className="action-btn gang" onClick={() => handleAction('jiagang')}>加杠</button>}
              <button className="action-btn pass" onClick={() => handleAction('pass')}>过</button>
            </>
          )}
          {waiting.type === 'respond' && (
            <>
              {waiting.actions?.hu && <button className="action-btn hu" onClick={() => handleAction('hu')}>🎉 胡</button>}
              {waiting.actions?.gang && <button className="action-btn gang" onClick={() => handleAction('gang')}>杠</button>}
              {waiting.actions?.peng && <button className="action-btn peng" onClick={() => handleAction('peng')}>碰</button>}
              <button className="action-btn pass" onClick={() => handleAction('pass')}>过</button>
            </>
          )}
        </div>
      )}

      <aside className="log-panel">
        <div className="log-title">📋 操作日志</div>
        <div className="log-list">
          {log.map((l, i) => <div key={i} className="log-item">{l}</div>)}
        </div>
      </aside>

      <footer className="arena-controls">
        <button className="ctrl-btn" onClick={() => { stopAuto(); initGame(); }}>🔄 新局</button>
        {mode === 'watch' && (
          <>
            <button className={`ctrl-btn ${auto ? 'active' : ''}`} onClick={toggleAuto}>
              {auto ? '⏸ 暂停' : '▶ 自动'}
            </button>
            <button className="ctrl-btn" onClick={doStep} disabled={auto}>⏭ 下一步</button>
            <div className="speed-ctrl">
              <button className="ctrl-btn sm" onClick={() => changeSpeed(-1)}>🐢</button>
              <span className="speed-label">{speed}ms</span>
              <button className="ctrl-btn sm" onClick={() => changeSpeed(1)}>🐇</button>
            </div>
          </>
        )}
        {mode === 'play' && (
          <span className="speed-label" style={{color:'var(--text-dim)',fontSize:12}}>AI 步速 400ms</span>
        )}
      </footer>

      {phase === 'finished' && (
        <div className="result-overlay" onClick={initGame}>
          <div className="result-card slide-up" onClick={e => e.stopPropagation()}>
            <h2>🏆 对局结束</h2>
            <div className="result-scores">
              {g?.players?.map((p, i) => (
                <div key={i} className={`result-row ${p.isOut ? 'winner' : ''}`}>
                  <span>{p.emoji} {p.name}</span>
                  <span>{p.isOut ? `✅ +${p.score}分` : '❌ 未胡'}</span>
                </div>
              ))}
            </div>
            <button className="mode-btn" style={{ marginTop: 20 }} onClick={initGame}>再来一局</button>
          </div>
        </div>
      )}
    </div>
  );
}
