import React, { useState, useEffect, useRef } from 'react';
import './LLMArenaPage.css';
import { LLM_PLAYERS, callLLM } from '../game/llm-ai.js';

export default function LLMArenaPage({ onBack }) {
  const [gameState, setGameState] = useState('idle'); // idle|loading|playing|finished
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [odds, setOdds] = useState({ claude: 4, gpt: 4, gemini: 4, deepseek: 4 });
  const [bets, setBets] = useState({ claude: 0, gpt: 0, gemini: 0, deepseek: 0 });
  const [totalPool, setTotalPool] = useState(0);
  const [wallet, setWallet] = useState(null);
  const [thinking, setThinking] = useState(null);
  const [history, setHistory] = useState([]);
  const oddsRef = useRef(null);

  // 连接钱包
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('请安装 MetaMask');
      return;
    }
    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWallet(addr);
    } catch (e) {
      console.error('Wallet connect failed:', e);
    }
  };

  // 获取实时赔率
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch('/api/odds').then(r => r.json());
        setOdds(r.odds);
        setBets(r.bets);
        setTotalPool(r.total);
      } catch (e) {
        console.warn('Odds fetch failed:', e.message);
      }
    }, 1000);
    return () => clearInterval(poll);
  }, []);

  // 下注
  const placeBet = async (player, amount) => {
    if (!wallet) { alert('请先连接钱包'); return; }
    if (amount <= 0) { alert('金额必须 > 0'); return; }
    try {
      const r = await fetch('/api/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player, amount }),
      }).then(r => r.json());
      console.log('Bet placed:', r);
    } catch (e) {
      console.error('Bet failed:', e);
    }
  };

  // 开始对战
  const startGame = async () => {
    setGameState('loading');
    setRound(0);
    setScores([0, 0, 0, 0]);
    setHistory([]);
    await fetch('/api/reset-bets', { method: 'POST' });
    // 模拟 8 局
    for (let r = 0; r < 8; r++) {
      setRound(r + 1);
      // 这里应该调用真实游戏引擎 + LLM API
      // 简化：模拟随机结果
      await new Promise(resolve => setTimeout(resolve, 2000));
      const winner = Math.floor(Math.random() * 4);
      const newScores = [...scores];
      newScores[winner] += Math.floor(Math.random() * 10) + 2;
      setScores(newScores);
      setHistory(h => [...h, { round: r + 1, winner, scores: [...newScores] }]);
    }
    setGameState('finished');
  };

  return (
    <div className="llm-arena">
      <header className="llm-header">
        <button className="llm-back" onClick={onBack}>← 返回</button>
        <h1>🤖 大模型麻将竞技场</h1>
        <div className="llm-wallet">
          {wallet ? (
            <span className="llm-addr">✅ {wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
          ) : (
            <button className="llm-connect" onClick={connectWallet}>🔗 连接钱包</button>
          )}
        </div>
      </header>

      {/* 选手卡片 + 下注 */}
      <div className="llm-players">
        {LLM_PLAYERS.map((p, i) => (
          <div key={p.key} className="llm-player-card" style={{ borderColor: p.color }}>
            <div className="llm-pc-header">
              <span className="llm-emoji">{p.emoji}</span>
              <div className="llm-pc-info">
                <h3>{p.name}</h3>
                <p className="llm-pc-desc">{p.desc}</p>
              </div>
            </div>

            <div className="llm-pc-stats">
              <div className="llm-stat">
                <span className="llm-label">积分</span>
                <span className="llm-value">{scores[i]}</span>
              </div>
              <div className="llm-stat">
                <span className="llm-label">赔率</span>
                <span className="llm-value" style={{ color: p.color }}>
                  {odds[p.key]?.toFixed(2)}x
                </span>
              </div>
              <div className="llm-stat">
                <span className="llm-label">下注</span>
                <span className="llm-value">{bets[p.key]?.toFixed(2) || 0} BNB</span>
              </div>
            </div>

            <div className="llm-pc-bet">
              <input
                type="number"
                placeholder="0.01"
                step="0.01"
                min="0"
                className="llm-bet-input"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    const amt = parseFloat(e.target.value);
                    placeBet(p.key, amt);
                    e.target.value = '';
                  }
                }}
              />
              <button
                className="llm-bet-btn"
                onClick={e => {
                  const inp = e.target.previousElementSibling;
                  const amt = parseFloat(inp.value);
                  placeBet(p.key, amt);
                  inp.value = '';
                }}
              >
                下注
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 奖池 + 开始按钮 */}
      <div className="llm-pool">
        <div className="llm-pool-info">
          <span className="llm-pool-label">总奖池</span>
          <span className="llm-pool-value">{totalPool.toFixed(4)} BNB</span>
        </div>
        <button
          className="llm-start-btn"
          onClick={startGame}
          disabled={gameState !== 'idle' || totalPool === 0}
        >
          {gameState === 'idle' ? '🎮 开始对战' : gameState === 'loading' ? '⏳ 对战中...' : '✅ 已结束'}
        </button>
      </div>

      {/* 积分曲线 */}
      {history.length > 0 && (
        <div className="llm-chart">
          <h3>📈 积分曲线</h3>
          <svg viewBox="0 0 800 300" className="llm-svg">
            {/* 网格 */}
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={`h${i}`}
                x1="40" y1={60 + i * 50} x2="780" y2={60 + i * 50}
                stroke="#333" strokeWidth="1"
              />
            ))}
            {/* 曲线 */}
            {LLM_PLAYERS.map((p, idx) => {
              const points = history.map((h, i) => {
                const x = 40 + (i / (history.length - 1 || 1)) * 740;
                const maxScore = Math.max(...history.map(hh => Math.max(...hh.scores)), 1);
                const y = 260 - (h.scores[idx] / maxScore) * 200;
                return `${x},${y}`;
              }).join(' ');
              return (
                <polyline
                  key={p.key}
                  points={points}
                  fill="none"
                  stroke={p.color}
                  strokeWidth="2"
                />
              );
            })}
            {/* 轴 */}
            <line x1="40" y1="260" x2="780" y2="260" stroke="#666" strokeWidth="2" />
            <line x1="40" y1="60" x2="40" y2="260" stroke="#666" strokeWidth="2" />
          </svg>
          <div className="llm-legend">
            {LLM_PLAYERS.map(p => (
              <span key={p.key} style={{ color: p.color }}>
                ■ {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 思考气泡 */}
      {thinking && (
        <div className="llm-thinking">
          <p>{thinking}</p>
        </div>
      )}

      {/* 对战日志 */}
      {history.length > 0 && (
        <div className="llm-log">
          <h3>📋 对战记录</h3>
          {history.map((h, i) => (
            <div key={i} className="llm-log-item">
              <span className="llm-log-round">第 {h.round} 局</span>
              <span className="llm-log-winner">
                {LLM_PLAYERS[h.winner].emoji} {LLM_PLAYERS[h.winner].name} 胜
              </span>
              <span className="llm-log-scores">
                {h.scores.map((s, j) => (
                  <span key={j} style={{ color: LLM_PLAYERS[j].color }}>
                    {LLM_PLAYERS[j].name} {s}
                  </span>
                )).reduce((a, b) => [a, ' | ', b])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
