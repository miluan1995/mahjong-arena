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

const AI_SEATS = [
  { emoji:'🐻', name:'黑瞎子', pos:'top' },
  { emoji:'🦊', name:'狐尾', pos:'left' },
  { emoji:'🦅', name:'鹰眼', pos:'right' },
];

export default function ChallengePage({ onBack }) {
  const [account, setAccount] = useState(null);
  const [pool, setPool] = useState('0');
  const [fee, setFee] = useState('0.05');
  const [phase, setPhase] = useState('idle');
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [tiles, setTiles] = useState([13,13,13,13]);
  const logRef = useRef(null);

  const log = (msg) => setLogs(p => [...p, { t: new Date().toLocaleTimeString('en',{hour12:false}), msg }]);

  useEffect(() => { loadPool(); const iv = setInterval(loadPool, 15000); return () => clearInterval(iv); }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

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

  async function startGame() {
    if (!account) return;
    setPhase('waiting');
    log('发起挑战交易...');
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const c = new ethers.Contract(CONTRACT, ABI, s);
      const feeWei = await c.challengeEntryFee();
      const tx = await c.startChallenge({ value: feeWei });
      log('交易已发送 ' + tx.hash.slice(0,10) + '...');
      const receipt = await tx.wait();
      log('交易确认，挑战开始！');
      setPhase('playing');
      simulateGame();
    } catch (err) {
      log('交易失败: ' + (err.reason || err.message));
      setPhase('idle');
    }
  }

  function simulateGame() {
    const steps = [
      { delay:800, fn:() => log('洗牌完成，发牌中...') },
      { delay:1500, fn:() => { setTiles([13,13,13,13]); log('每人 13 张，对局开始'); }},
      { delay:2500, fn:() => { setTiles([12,13,13,13]); log('你打出 三万'); }},
      { delay:3500, fn:() => { setTiles([12,12,13,13]); log('🐻 黑瞎子打出 七条'); }},
      { delay:4500, fn:() => { setTiles([12,12,12,13]); log('🦊 狐尾打出 二筒'); }},
      { delay:5500, fn:() => { setTiles([12,12,12,12]); log('🦅 鹰眼打出 九万'); }},
      { delay:7000, fn:() => { setTiles([11,12,12,12]); log('你摸牌 五条，打出 一筒'); }},
      { delay:9000, fn:() => { setTiles([10,11,12,12]); log('🐻 黑瞎子碰！三万'); }},
      { delay:11000, fn:() => { log('...激烈对局中...'); }},
      { delay:14000, fn:() => {
        const win = Math.random() > 0.6;
        if (win) {
          const prize = (parseFloat(pool) + parseFloat(fee)).toFixed(4);
          log('🎉 自摸！你赢了 ' + prize + ' BNB');
          setResult({ win:true, prize });
        } else {
          log('🐻 黑瞎子胡牌！入场费归入奖池');
          setResult({ win:false });
        }
        setPhase('result');
      }},
    ];
    steps.forEach(s => setTimeout(s.fn, s.delay));
  }

  function resetGame() { setPhase('idle'); setResult(null); setLogs([]); setTiles([13,13,13,13]); loadPool(); }

  return (
    <div className="page challenge">
      {/* Header */}
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
        {/* Table area */}
        <div className="ch-table">
          <div className="ch-table-bg" />

          {/* Top seat - AI */}
          <div className="seat seat-top glass">
            <div className="seat-emoji">🐻</div>
            <div className="seat-name">黑瞎子</div>
            <div className="seat-tiles mono">{tiles[1]} 张</div>
          </div>

          {/* Left seat - AI */}
          <div className="seat seat-left glass">
            <div className="seat-emoji">🦊</div>
            <div className="seat-name">狐尾</div>
            <div className="seat-tiles mono">{tiles[2]} 张</div>
          </div>

          {/* Center */}
          <div className="ch-center">
            {phase === 'idle' && !account && (
              <button className="connect-btn" onClick={connect}>连接钱包</button>
            )}
            {phase === 'idle' && account && (
              <button className="ch-start-btn" onClick={startGame}>
                <span>⚔️ 发起挑战</span>
                <span className="ch-start-fee mono">{fee} BNB</span>
              </button>
            )}
            {phase === 'waiting' && <div className="ch-waiting">交易确认中<span className="dots" /></div>}
            {phase === 'playing' && <div className="ch-playing">🀄 对局进行中</div>}
          </div>

          {/* Right seat - AI */}
          <div className="seat seat-right glass">
            <div className="seat-emoji">🦅</div>
            <div className="seat-name">鹰眼</div>
            <div className="seat-tiles mono">{tiles[3]} 张</div>
          </div>

          {/* Bottom seat - Player */}
          <div className="seat seat-bottom glass active">
            <div className="seat-emoji">👤</div>
            <div className="seat-name">{account ? account.slice(0,6)+'...' : '你'}</div>
            <div className="seat-tiles mono">{tiles[0]} 张</div>
          </div>
        </div>

        {/* Log */}
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
