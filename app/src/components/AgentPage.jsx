import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createGame, step, humanDiscard, humanAfterDraw, humanRespond } from '../game/game.js';
import { renderGame, getBottomTileHitboxes } from '../game/render.js';
import { preloadTiles } from '../game/tiles.js';
import { checkAgentServer, isAgentAvailable, agentDecide, getThinkingSteps } from '../game/agent-client.js';
import './AgentPage.css';

export default function AgentPage({ onBack }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const timerRef = useRef(null);
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState('loading');
  const [agentConnected, setAgentConnected] = useState(null);
  const [thinking, setThinking] = useState(null); // {lines: [...], current: 0}
  const [tilesReady, setTilesReady] = useState(false);
  const [agentStats, setAgentStats] = useState({ decisions: 0, wins: 0, games: 0 });
  const [, forceUpdate] = useState(0);

  const addLog = useCallback((text) => {
    setLog(prev => [text, ...prev].slice(0, 100));
  }, []);

  const rerender = useCallback(() => {
    if (canvasRef.current && gameRef.current) {
      renderGame(canvasRef.current, gameRef.current, {});
    }
  }, []);

  // 启动：检测 agent server + 预加载牌面
  useEffect(() => {
    Promise.all([
      preloadTiles().then(() => setTilesReady(true)),
      checkAgentServer().then(ok => {
        setAgentConnected(ok);
        addLog(ok ? '🤖 Agent Server 已连接 (localhost:3852)' : '⚠️ Agent Server 离线，使用 Rule-based AI');
      }),
    ]).then(() => setPhase('ready'));
  }, [addLog]);

  // 模拟思考动画
  const showThinking = useCallback(async (type, result) => {
    const steps = result?.thinking
      ? [result.thinking, '决策完成 ✓']
      : getThinkingSteps(type);
    for (let i = 0; i < steps.length; i++) {
      setThinking({ text: steps[i], progress: (i + 1) / steps.length });
      await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
    }
    if (result?.text) {
      setThinking({ text: `💡 ${result.text}`, progress: 1 });
      await new Promise(r => setTimeout(r, 800));
    }
    setThinking(null);
  }, []);

  const initGame = useCallback(() => {
    // Agent = seat 0, 其余 AI
    gameRef.current = createGame(-1); // 全 AI 自动对战
    // 但 seat 0 标记为 Agent
    gameRef.current.players[0].name = 'OpenClaw Agent';
    gameRef.current.players[0].emoji = '🤖';
    setLog([]);
    setPhase('playing');
    addLog('🀄 新局开始 — OpenClaw Agent 入场');
    setAgentStats(s => ({ ...s, games: s.games + 1 }));
    setTimeout(() => rerender(), 100);
  }, [addLog, rerender]);

  useEffect(() => { if (tilesReady && phase === 'ready') initGame(); }, [tilesReady, phase, initGame]);
  useEffect(() => { rerender(); }, [rerender]);

  const logEvent = useCallback((e, g) => {
    const nm = g.players[e.seat]?.name || '';
    const em = g.players[e.seat]?.emoji || '';
    if (e.type === 'draw' && !e.extra) addLog(`${em} ${nm} 摸牌`);
    if (e.type === 'discard') addLog(`${em} ${nm} 打出 ${e.tile?.suit}${e.tile?.rank} ${e.text || ''}`);
    if (e.type === 'hu') addLog(`🎉 ${em} ${nm} ${e.selfDraw ? '自摸' : '胡'}！${e.text || ''}`);
    if (e.type === 'peng') addLog(`${em} ${nm} 碰！`);
    if (e.type === 'gang') addLog(`${em} ${nm} 杠！`);
    if (e.type === 'draw_end') addLog('📦 牌墙摸完，流局！');
  }, [addLog]);

  // 自动对战循环
  const runGame = useCallback(async () => {
    const g = gameRef.current;
    if (!g || g.phase !== 'playing') return;

    while (g.phase === 'playing' && g.wall.length > 0) {
      const evts = step(g);
      if (!evts) break;
      for (const e of evts) logEvent(e, g);

      // 如果是 Agent (seat 0) 出牌，展示思考过程
      const agentEvt = evts.find(e => e.seat === 0 && (e.type === 'discard' || e.type === 'hu'));
      if (agentEvt) {
        setAgentStats(s => ({ ...s, decisions: s.decisions + 1 }));
        if (agentEvt.type === 'hu') {
          setAgentStats(s => ({ ...s, wins: s.wins + 1 }));
        }
        // Agent 决策展示
        if (isAgentAvailable()) {
          // 真 LLM 分析（下一步集成，现在先模拟）
          await showThinking('discard', { text: agentEvt.text });
        } else {
          await showThinking('discard', { text: agentEvt.text });
        }
      }

      rerender();
      forceUpdate(v => v + 1);

      if (g.phase === 'finished') {
        setPhase('finished');
        addLog('🏁 对局结束');
        break;
      }

      // 非 Agent 回合等 300ms，Agent 回合已经在思考里等过了
      if (!agentEvt) await new Promise(r => setTimeout(r, 300));
    }
  }, [logEvent, rerender, addLog, showThinking]);

  useEffect(() => {
    if (phase === 'playing') { runGame(); }
  }, [phase]); // eslint-disable-line

  const g = gameRef.current;

  return (
    <div className="agent-page">
      <header className="agent-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <div className="agent-title">
          <span className="agent-icon">🤖</span>
          <span>Agent 对战</span>
          <span className={`agent-status ${agentConnected ? 'online' : 'offline'}`}>
            {agentConnected ? '● LLM' : '● Rule-based'}
          </span>
        </div>
        <div className="agent-stats">
          <span>🎮 {agentStats.games}</span>
          <span>🧠 {agentStats.decisions}</span>
          <span>🏆 {agentStats.wins}</span>
        </div>
      </header>

      {/* 思考气泡 */}
      {thinking && (
        <div className="thinking-bubble">
          <div className="thinking-header">
            <span className="thinking-icon">🧠</span>
            <span>Agent 思考中...</span>
          </div>
          <div className="thinking-text">{thinking.text}</div>
          <div className="thinking-bar">
            <div className="thinking-fill" style={{ width: `${thinking.progress * 100}%` }} />
          </div>
        </div>
      )}

      <div className="table-wrap">
        <canvas ref={canvasRef} className="table-canvas" />
      </div>

      <aside className="log-panel agent-log">
        <div className="log-title">📋 Agent 日志</div>
        <div className="log-list">
          {log.map((l, i) => <div key={i} className="log-item">{l}</div>)}
        </div>
      </aside>

      <footer className="arena-controls">
        <button className="ctrl-btn" onClick={() => { setPhase('ready'); setTimeout(initGame, 100); }}>🔄 新局</button>
        <button className="ctrl-btn" onClick={async () => {
          const ok = await checkAgentServer();
          setAgentConnected(ok);
          addLog(ok ? '✅ Agent Server 重连成功' : '❌ Agent Server 仍离线');
        }}>🔌 重连</button>
      </footer>

      {phase === 'finished' && (
        <div className="result-overlay" onClick={() => { setPhase('ready'); setTimeout(initGame, 100); }}>
          <div className="result-card slide-up" onClick={e => e.stopPropagation()}>
            <h2>🏆 对局结束</h2>
            <div className="result-scores">
              {g?.players?.map((p, i) => (
                <div key={i} className={`result-row ${p.isOut ? 'winner' : ''}`}>
                  <span>{p.emoji} {p.name}</span>
                  <span>{p.isOut ? `✅ 胡牌 +${p.score}分` : '❌ 未胡'}</span>
                </div>
              ))}
            </div>
            <button className="mode-btn" style={{ marginTop: 20 }}
              onClick={() => { setPhase('ready'); setTimeout(initGame, 100); }}>再来一局</button>
          </div>
        </div>
      )}
    </div>
  );
}
