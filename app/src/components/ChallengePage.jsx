import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { createGame, step, humanDiscard, humanAfterDraw, humanRespond } from '../game/game.js';
import { renderGame, getBottomTileHitboxes } from '../game/render.js';
import { preloadTiles } from '../game/tiles.js';
import './ChallengePage.css';

const CONTRACT = '0x6bfa1409450404f0e64100f1e71c43c83a9f1eca';
const ABI = [
  'function challengePool() view returns (uint256)',
  'function challengeEntryFee() view returns (uint256)',
  'function startChallenge() payable',
  'event ChallengeStarted(uint256 indexed id, address indexed player, uint256 poolAmount)',
];

export default function ChallengePage({ onBack }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const timerRef = useRef(null);
  const logRef = useRef(null);

  const [account, setAccount] = useState(null);
  const [pool, setPool] = useState('0');
  const [fee, setFee] = useState('0.05');
  const [phase, setPhase] = useState('idle'); // idle|paying|playing|result
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [tilesReady, setTilesReady] = useState(false);
  const [selectedTile, setSelectedTile] = useState(null);
  const [waiting, setWaiting] = useState(null);
  const [speed] = useState(600);
  const [, forceUpdate] = useState(0);

  const log = useCallback((msg) => {
    setLogs(p => [...p, { t: new Date().toLocaleTimeString('en',{hour12:false}), msg }]);
  }, []);

  const rerender = useCallback(() => {
    if (canvasRef.current && gameRef.current) {
      renderGame(canvasRef.current, gameRef.current, { selectedTileId: selectedTile });
    }
  }, [selectedTile]);

  // Load pool + preload tiles
  useEffect(() => { loadPool(); const iv = setInterval(loadPool, 15000); return () => clearInterval(iv); }, []);
  useEffect(() => { preloadTiles().then(() => setTilesReady(true)); }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);
  useEffect(() => { rerender(); }, [selectedTile, rerender]);

  async function loadPool() {
    try {
      const p = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
      const c = new ethers.Contract(CONTRACT, ABI, p);
      const [pv, fv] = await Promise.all([c.challengePool(), c.challengeEntryFee()]);
      setPool(ethers.formatEther(pv));
      setFee(ethers.formatEther(fv));
    } catch {}
  }

  async function connect() {
    if (!window.ethereum) return alert('请安装 MetaMask');
    const p = new ethers.BrowserProvider(window.ethereum);
    const accs = await p.send('eth_requestAccounts', []);
    setAccount(accs[0]);
    log('钱包已连接 ' + accs[0].slice(0,6) + '...' + accs[0].slice(-4));
  }

  async function payAndStart() {
    if (!account) return;
    setPhase('paying');
    log('发起链上交易...');
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const c = new ethers.Contract(CONTRACT, ABI, s);
      const feeWei = await c.challengeEntryFee();
      const tx = await c.startChallenge({ value: feeWei });
      log('交易已发送 ' + tx.hash.slice(0,10) + '...');
      await tx.wait();
      log('✅ 交易确认！开始对局');
      startRealGame();
    } catch (err) {
      log('❌ 交易失败: ' + (err.reason || err.message));
      setPhase('idle');
    }
  }

  function startRealGame() {
    const g = createGame(0); // seat 0 = human
    gameRef.current = g;
    setPhase('playing');
    setSelectedTile(null);
    setWaiting(null);
    log('🀄 洗牌发牌完毕，对局开始！');
    setTimeout(() => {
      rerender();
      if (g && !g.waitingFor && g.phase === 'playing') autoAdvanceAI(g);
    }, 200);
  }

  // AI auto-advance
  const autoAdvanceAI = useCallback((g) => {
    if (!g || g.phase !== 'playing') return;
    if (g.waitingFor === 0) {
      // Human's turn
      if (g.waitType === 'discard') setWaiting('discard');
      else if (g.waitType === 'afterdraw') setWaiting('afterdraw');
      else if (g.waitType === 'respond') setWaiting('respond');
      rerender();
      return;
    }
    timerRef.current = setTimeout(() => {
      const ev = step(g);
      if (ev) {
        if (ev.type === 'discard') log(`${ev.playerName} 打出 ${ev.tileName}`);
        else if (ev.type === 'peng') log(`${ev.playerName} 碰！`);
        else if (ev.type === 'gang') log(`${ev.playerName} 杠！`);
        else if (ev.type === 'hu') {
          log(`🎉 ${ev.playerName} 胡牌！`);
          handleGameEnd(g);
          return;
        } else if (ev.type === 'draw') log(`${ev.playerName} 摸牌`);
      }
      forceUpdate(n => n + 1);
      rerender();
      if (g.phase === 'playing') autoAdvanceAI(g);
    }, speed);
  }, [speed, log, rerender]);

  function handleGameEnd(g) {
    setPhase('result');
    clearTimeout(timerRef.current);
    // Check if human (seat 0) won
    const humanWon = g.winners && g.winners.includes(0);
    if (humanWon) {
      const prize = (parseFloat(pool) + parseFloat(fee)).toFixed(4);
      log('🎉 你赢了！奖金 ' + prize + ' BNB');
      setResult({ win: true, prize });
    } else {
      log('AI 获胜，入场费归入奖池');
      setResult({ win: false });
    }
    rerender();
  }

  // Human interactions
  function handleCanvasClick(e) {
    if (phase !== 'playing' || !waiting) return;
    const g = gameRef.current;
    if (!g || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hitboxes = getBottomTileHitboxes(canvasRef.current, g);
    if (!hitboxes) return;

    if (waiting === 'discard' || waiting === 'afterdraw') {
      for (const hb of hitboxes) {
        if (x >= hb.x && x <= hb.x + hb.w && y >= hb.y && y <= hb.y + hb.h) {
          if (selectedTile === hb.tileId) {
            // Double click = confirm discard
            if (waiting === 'discard') humanDiscard(g, hb.tileId);
            else humanAfterDraw(g, 'discard', hb.tileId);
            setSelectedTile(null);
            setWaiting(null);
            log('你打出 ' + hb.tileName);
            forceUpdate(n => n + 1);
            rerender();
            if (g.phase === 'playing') autoAdvanceAI(g);
          } else {
            setSelectedTile(hb.tileId);
          }
          return;
        }
      }
    }
  }

  function handleAction(action) {
    const g = gameRef.current;
    if (!g) return;
    if (waiting === 'respond') {
      humanRespond(g, action);
      if (action !== 'pass') log('你选择了 ' + action);
      setWaiting(null);
      forceUpdate(n => n + 1);
      rerender();
      if (g.phase === 'playing') autoAdvanceAI(g);
    } else if (waiting === 'afterdraw') {
      if (action === 'hu') { humanAfterDraw(g, 'hu'); handleGameEnd(g); return; }
      if (action === 'gang') { humanAfterDraw(g, 'gang'); log('你暗杠！'); }
      setWaiting(null);
      forceUpdate(n => n + 1);
      rerender();
      if (g.phase === 'playing') autoAdvanceAI(g);
    }
  }

  function resetGame() {
    clearTimeout(timerRef.current);
    setPhase('idle'); setResult(null); setLogs([]); setSelectedTile(null); setWaiting(null);
    gameRef.current = null;
    loadPool();
  }

  return (
    <div className="page challenge">
      <header className="ch-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h1 className="ch-title">🎯 人机挑战</h1>
        <div className="ch-pool glass">
          <span className="ch-pool-label">奖池</span>
          <span className="ch-pool-val mono">{parseFloat(pool).toFixed(4)}</span>
          <span className="ch-pool-unit">BNB</span>
        </div>
      </header>

      <div className="ch-body">
        {/* Game area */}
        <div className="ch-game">
          {phase === 'idle' && (
            <div className="ch-idle-panel">
              <div className="ch-idle-icon">🀄</div>
              <h2>川麻血战到底 · 人机挑战</h2>
              <p className="ch-idle-desc">支付 <span className="mono">{fee} BNB</span> 入场，击败 3 个 AI 赢走奖池</p>
              <p className="ch-idle-pool">当前奖池 <span className="mono ch-pool-highlight">{parseFloat(pool).toFixed(4)} BNB</span></p>
              {!account ? (
                <button className="connect-btn" onClick={connect}>连接钱包</button>
              ) : (
                <button className="ch-start-btn" onClick={payAndStart}>
                  ⚔️ 支付 {fee} BNB 开始挑战
                </button>
              )}
              {account && <div className="ch-wallet mono">{account.slice(0,6)}...{account.slice(-4)}</div>}
            </div>
          )}

          {phase === 'paying' && (
            <div className="ch-idle-panel">
              <div className="ch-paying-spinner" />
              <p>等待交易确认...</p>
            </div>
          )}

          {(phase === 'playing' || phase === 'result') && (
            <div className="ch-canvas-wrap">
              <canvas
                ref={canvasRef}
                className="ch-canvas"
                width={800} height={600}
                onClick={handleCanvasClick}
              />
              {/* Action buttons */}
              {waiting === 'respond' && (
                <div className="ch-actions">
                  <button className="ch-act-btn pass" onClick={() => handleAction('pass')}>过</button>
                  <button className="ch-act-btn peng" onClick={() => handleAction('peng')}>碰</button>
                  <button className="ch-act-btn gang" onClick={() => handleAction('gang')}>杠</button>
                  <button className="ch-act-btn hu" onClick={() => handleAction('hu')}>胡</button>
                </div>
              )}
              {waiting === 'afterdraw' && (
                <div className="ch-actions">
                  <button className="ch-act-btn pass" onClick={() => handleAction('pass')}>出牌</button>
                  <button className="ch-act-btn gang" onClick={() => handleAction('gang')}>暗杠</button>
                  <button className="ch-act-btn hu" onClick={() => handleAction('hu')}>自摸</button>
                </div>
              )}
              {waiting === 'discard' && (
                <div className="ch-hint">点击选牌，再点确认出牌</div>
              )}
            </div>
          )}
        </div>

        {/* Log panel */}
        <div className="ch-log" ref={logRef}>
          <div className="ch-log-header">GAME LOG</div>
          {logs.length === 0 && <p className="ch-log-empty">等待对局开始...</p>}
          {logs.map((l, i) => (
            <p key={i}><span className="ch-log-time">{l.t}</span> {l.msg}</p>
          ))}
        </div>
      </div>

      {/* Result overlay */}
      {phase === 'result' && result && (
        <div className="ch-result-overlay" onClick={resetGame}>
          <div className={`ch-result-card glass ${result.win ? 'win' : 'lose'}`}>
            <div className="ch-result-emoji">{result.win ? '🎉' : '😤'}</div>
            <div className="ch-result-text">{result.win ? '恭喜获胜！' : 'AI 获胜'}</div>
            {result.win && <div className="ch-result-prize mono">+{result.prize} BNB</div>}
            {!result.win && <div className="ch-result-sub">入场费归入奖池，再来一局！</div>}
            <button className="ch-result-btn">{result.win ? '🎯 再来一局' : '💪 再战'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
