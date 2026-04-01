import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import './ChallengePage.css';

const CONTRACT = '0x80D1766492e1C98CFf56C1D1885549FF650657a5';
const ABI = [
  'function challengePool() view returns (uint256)',
  'function challengeEntryFee() view returns (uint256)',
  'function challengeCount() view returns (uint256)',
  'function startChallenge() payable',
  'function getChallengeInfo(uint256) view returns (tuple(uint256 id, address player, uint256 entryFee, uint8 status, address winner, uint256 prizeAmount))',
  'event ChallengeStarted(uint256 indexed id, address indexed player, uint256 poolAmount)',
  'event ChallengeSettled(uint256 indexed id, address indexed winner, uint256 prize)',
];

const AI_PLAYERS = [
  { emoji: '🐻', name: '黑瞎子' },
  { emoji: '🔨', name: '铁柱' },
  { emoji: '🧮', name: '算盘' },
];

export default function ChallengePage({ onBack }) {
  const [account, setAccount] = useState(null);
  const [pool, setPool] = useState('0');
  const [fee, setFee] = useState('0.05');
  const [phase, setPhase] = useState('idle'); // idle|waiting|playing|result
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null); // {win:bool, prize:string}
  const [tiles, setTiles] = useState([13, 13, 13, 13]);
  const wsRef = useRef(null);
  const logRef = useRef(null);

  const addLog = (msg) => setLogs(p => [...p, msg]);

  useEffect(() => {
    loadPool();
    const iv = setInterval(loadPool, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  async function loadPool() {
    try {
      const p = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
      const c = new ethers.Contract(CONTRACT, ABI, p);
      const [poolVal, feeVal] = await Promise.all([c.challengePool(), c.challengeEntryFee()]);
      setPool(ethers.formatEther(poolVal));
      setFee(ethers.formatEther(feeVal));
    } catch {}
  }

  async function connect() {
    if (!window.ethereum) return alert('请安装 MetaMask');
    const p = new ethers.BrowserProvider(window.ethereum);
    const accs = await p.send('eth_requestAccounts', []);
    setAccount(accs[0]);
    addLog('✅ 钱包已连接: ' + accs[0].slice(0, 8) + '...');
  }

  async function startGame() {
    if (!account) return;
    setPhase('waiting');
    addLog('⏳ 发起挑战交易...');
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const c = new ethers.Contract(CONTRACT, ABI, s);
      const feeWei = await c.challengeEntryFee();
      const tx = await c.startChallenge({ value: feeWei });
      addLog('📤 交易已发送: ' + tx.hash.slice(0, 12) + '...');
      const receipt = await tx.wait();
      addLog('✅ 交易确认，挑战开始！');

      const ev = receipt.logs.find(l => {
        try { return c.interface.parseLog(l)?.name === 'ChallengeStarted'; } catch { return false; }
      });
      const challengeId = ev ? c.interface.parseLog(ev).args[0] : null;

      setPhase('playing');
      connectWS(challengeId?.toString());
    } catch (e) {
      addLog('❌ 交易失败: ' + (e.reason || e.message));
      setPhase('idle');
    }
  }

  function connectWS(challengeId) {
    const ws = new WebSocket('ws://localhost:3852');
    wsRef.current = ws;
    ws.onopen = () => {
      addLog('🔗 连接游戏服务器...');
      if (challengeId) ws.send(JSON.stringify({ type: 'challenge_join', challengeId }));
    };
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'challenge_update') {
          addLog(d.message);
          if (d.tiles) setTiles(d.tiles);
        } else if (d.type === 'challenge_result') {
          setResult({ win: d.playerWins, prize: d.prize || '0' });
          setPhase('result');
          loadPool();
        }
      } catch {}
    };
    ws.onclose = () => addLog('🔌 服务器连接断开');
  }

  function resetGame() {
    setPhase('idle');
    setResult(null);
    setLogs([]);
    setTiles([13, 13, 13, 13]);
    if (wsRef.current) wsRef.current.close();
    loadPool();
  }

  const playerName = account ? account.slice(0, 6) + '...' : '玩家';
  const allSeats = [{ emoji: '👤', name: playerName }, ...AI_PLAYERS];

  return (
    <div className="challenge">
      <div className="challenge-bg" />
      <div className="challenge-header">
        <button className="challenge-back" onClick={onBack}>← 返回</button>
        <div className="challenge-title">🎯 人机挑战</div>
        <div className="challenge-pool">🏆 奖池: {parseFloat(pool).toFixed(4)} BNB</div>
      </div>

      <div className="challenge-main">
        {!account && <button className="challenge-connect" onClick={connect}>🔗 连接钱包</button>}

        {account && phase === 'idle' && (
          <button className="challenge-start" onClick={startGame}>
            ⚔️ 发起挑战 ({fee} BNB)
          </button>
        )}

        {phase === 'waiting' && (
          <div className="challenge-waiting">⏳ 等待交易确认<span className="dots"></span></div>
        )}

        {(phase === 'playing' || phase === 'waiting') && (
          <div className="challenge-seats">
            {allSeats.map((s, i) => (
              <div key={i} className={`seat ${phase === 'playing' ? 'active' : ''}`}>
                <div className="seat-emoji">{s.emoji}</div>
                <div className="seat-name">{s.name}</div>
                <div className="seat-tiles">🀄 ×{tiles[i]}</div>
              </div>
            ))}
          </div>
        )}

        {logs.length > 0 && (
          <div className="challenge-log" ref={logRef}>
            {logs.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        )}

        {phase === 'result' && result && (
          <div className="challenge-result" onClick={resetGame}>
            <div className={`result-card ${result.win ? 'win' : 'lose'}`}>
              <div className="result-emoji">{result.win ? '🎉' : '😤'}</div>
              <div className="result-text">{result.win ? '恭喜获胜！' : 'AI 获胜'}</div>
              {result.win && <div className="result-prize">+{result.prize} BNB</div>}
              {!result.win && <div className="result-prize" style={{color:'#ff6666'}}>入场费归入奖池，再来一局！</div>}
              <button className="result-btn">{result.win ? '🎯 再来一局' : '💪 再战一次'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
