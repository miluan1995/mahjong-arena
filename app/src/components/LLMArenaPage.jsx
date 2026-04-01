import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LLMArenaPage.css';
import { LLM_PLAYERS } from '../game/llm-ai.js';

const SUIT_CN = { wan: '万', tiao: '条', tong: '筒' };
const RANK_CN = ['','一','二','三','四','五','六','七','八','九'];
const tn = t => RANK_CN[t.rank] + SUIT_CN[t.suit];

function shuffleDeck() {
  const deck = [];
  for (const s of ['wan','tiao','tong']) {
    for (let r = 1; r <= 9; r++) {
      for (let c = 0; c < 4; c++) deck.push({ suit: s, rank: r });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function LLMArenaPage({ onBack }) {
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [round, setRound] = useState(0);
  const [odds, setOdds] = useState({ claude: 4, gpt: 4, gemini: 4, deepseek: 4 });
  const [bets, setBets] = useState({ claude: 0, gpt: 0, gemini: 0, deepseek: 0 });
  const [totalPool, setTotalPool] = useState(0);
  const [wallet, setWallet] = useState(null);
  const [log, setLog] = useState([]);
  const [curPlayer, setCurPlayer] = useState(-1);
  const [thinking, setThinking] = useState('');
  const [scoreHistory, setScoreHistory] = useState([]);
  const [betInputs, setBetInputs] = useState({ claude: '', gpt: '', gemini: '', deepseek: '' });
  const logRef = useRef(null);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') { alert('请安装 MetaMask'); return; }
    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWallet(addr);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch('/api/odds');
        if (r.ok) {
          const d = await r.json();
          setOdds(d.odds); setBets(d.bets); setTotalPool(d.total);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(poll);
  }, []);

  const placeBet = async (player) => {
    const amount = parseFloat(betInputs[player]);
    if (!wallet) { alert('请先连接钱包'); return; }
    if (!amount || amount <= 0) { alert('请输入金额'); return; }
    try {
      await fetch('/api/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player, amount }),
      });
      setBetInputs(prev => ({ ...prev, [player]: '' }));
    } catch (e) { console.error(e); }
  };

  const addLog = useCallback((text) => {
    setLog(prev => {
      const next = [...prev, text];
      return next.length > 100 ? next.slice(-80) : next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const delay = ms => new Promise(r => setTimeout(r, ms));

    const playOneRound = async (roundNum) => {
      if (cancelled) return;
      addLog(`━━━ 第 ${roundNum} 局 ━━━`);
      const deck = shuffleDeck();
      const hands = [[], [], [], []];
      for (let i = 0; i < 52; i++) hands[i % 4].push(deck.pop());
      const alive = [true, true, true, true];
      let turn = 0, turnCount = 0;
      while (deck.length > 0 && turnCount < 200 && !cancelled) {
        if (!alive[turn]) { turn = (turn + 1) % 4; continue; }
        const p = LLM_PLAYERS[turn];
        setCurPlayer(turn);
        const drawn = deck.pop();
        if (!drawn) break;
        hands[turn].push(drawn);
        setThinking(`${p.emoji} ${p.name} 摸了一张牌...`);
        await delay(300);
        if (hands[turn].length >= 14 && Math.random() < 0.03) {
          addLog(`🎉 ${p.emoji} ${p.name} 自摸胡牌！`);
          alive[turn] = false;
          const pts = 3 + Math.floor(Math.random() * 5);
          setScores(prev => { const next = [...prev]; next[turn] += pts; return next; });
          if (alive.filter(Boolean).length <= 1) break;
          turn = (turn + 1) % 4;
          turnCount++;
          continue;
        }
        const discIdx = Math.floor(Math.random() * hands[turn].length);
        const discarded = hands[turn].splice(discIdx, 1)[0];
        addLog(`${p.emoji} ${p.name} 打出 ${tn(discarded)}`);
        for (let j = 1; j <= 3; j++) {
          const other = (turn + j) % 4;
          if (!alive[other]) continue;
          const rp = LLM_PLAYERS[other];
          if (Math.random() < 0.02) {
            addLog(`🎉 ${rp.emoji} ${rp.name} 胡了 ${tn(discarded)}！`);
            alive[other] = false;
            const pts = 2 + Math.floor(Math.random() * 4);
            setScores(prev => { const next = [...prev]; next[other] += pts; return next; });
          } else if (Math.random() < 0.08) {
            addLog(`碰！${rp.emoji} ${rp.name} 碰了 ${tn(discarded)}`);
          }
        }
        if (alive.filter(Boolean).length <= 1) break;
        turn = (turn + 1) % 4;
        turnCount++;
        await delay(200);
      }
      if (alive.every(Boolean)) addLog(`🤝 流局！`);
      setThinking('');
      setCurPlayer(-1);
    };

    const gameLoop = async () => {
      let r = 1;
      while (!cancelled) {
        setRound(r);
        setScoreHistory(prev => [...prev, null]);
        await playOneRound(r);
        setScores(current => {
          setScoreHistory(prev => { const next = [...prev]; next[next.length - 1] = [...current]; return next; });
          return current;
        });
        await delay(2000);
        r++;
      }
    };
    gameLoop();
    return () => { cancelled = true; };
  }, [addLog]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  return (
    <div className="llm-arena">
      <header className="llm-header">
        <button className="llm-back" onClick={onBack}>← 返回</button>
        <h1>🤖 大模型麻将竞技场</h1>
        <div className="llm-round-badge">第 {round} 局</div>
        <div className="llm-wallet">
          {wallet ? (
            <span className="llm-addr">✅ {wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
          ) : (
            <button className="llm-connect" onClick={connectWallet}>🔗 连接钱包</button>
          )}
        </div>
      </header>

      <div className="llm-players">
        {LLM_PLAYERS.map((p, i) => (
          <div
            key={p.key}
            className={`llm-player-card ${curPlayer === i ? 'llm-active' : ''}`}
            style={{ borderColor: p.color }}
          >
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
                  {(odds[p.key] || 4).toFixed(2)}x
                </span>
              </div>
              <div className="llm-stat">
                <span className="llm-label">下注</span>
                <span className="llm-value">{(bets[p.key] || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="llm-pc-bet">
              <input
                type="number"
                placeholder="BNB"
                step="0.01"
                min="0"
                className="llm-bet-input"
                value={betInputs[p.key]}
                onChange={e => setBetInputs(prev => ({ ...prev, [p.key]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') placeBet(p.key); }}
              />
              <button className="llm-bet-btn" onClick={() => placeBet(p.key)}>
                下注
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="llm-pool">
        <span className="llm-pool-label">💰 总奖池</span>
        <span className="llm-pool-value">{totalPool.toFixed(4)} BNB</span>
      </div>

      {thinking && (
        <div className="llm-thinking">
          <p>{thinking}</p>
        </div>
      )}

      {scoreHistory.length > 1 && (
        <div className="llm-chart">
          <h3>📈 积分曲线</h3>
          <svg viewBox="0 0 800 250" className="llm-svg">
            {[0,1,2,3,4].map(i => (
              <line key={`g${i}`} x1="50" y1={40+i*45} x2="780" y2={40+i*45} stroke="#333" />
            ))}
            {LLM_PLAYERS.map((p, idx) => {
              const valid = scoreHistory.filter(Boolean);
              if (valid.length < 2) return null;
              const maxS = Math.max(...valid.flat(), 1);
              const pts = valid.map((s, i) => {
                const x = 50 + (i / (valid.length - 1)) * 730;
                const y = 220 - (s[idx] / maxS) * 180;
                return `${x},${y}`;
              }).join(' ');
              return <polyline key={p.key} points={pts} fill="none" stroke={p.color} strokeWidth="2.5" />;
            })}
            <line x1="50" y1="220" x2="780" y2="220" stroke="#666" strokeWidth="2" />
          </svg>
          <div className="llm-legend">
            {LLM_PLAYERS.map(p => (
              <span key={p.key} style={{ color: p.color }}>■ {p.name} </span>
            ))}
          </div>
        </div>
      )}

      <div className="llm-log" ref={logRef}>
        <h3>📋 实时对战日志</h3>
        {log.map((l, i) => (
          <div key={i} className={`llm-log-item ${l.startsWith('━') ? 'llm-log-round' : l.startsWith('🎉') ? 'llm-log-win' : ''}`}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
