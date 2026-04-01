import React, { useState, useEffect, useCallback } from 'react';
import './TournamentLobby.css';

const CONTRACT = '0x6a0873501EDe896606CE8F411E0ed01E2F358710';
const ABI = [
  'function joinTournament(uint256 _id) payable',
  'function tournaments(uint256) view returns (uint256 id, uint256 entryFee, uint256 totalRounds, uint256 completedRounds, uint256 prizePool, uint256 platformFee, uint8 status, address winner)',
  'function getPlayers(uint256) view returns (address[4])',
  'function getAllScores(uint256) view returns (address[4], uint256[4])',
  'function tournamentCount() view returns (uint256)',
];

const short = (a) => a === '0x0000000000000000000000000000000000000000' ? null : `${a.slice(0, 6)}...${a.slice(-4)}`;
const ts = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });
const isZero = (a) => a === '0x0000000000000000000000000000000000000000';
const STATUS = ['报名中', '进行中', '已结算', '已取消'];

export default function TournamentLobby({ onBack }) {
  const [address, setAddress] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [logs, setLogs] = useState([`[${ts()}] 加载中...`]);
  const [joiningId, setJoiningId] = useState(null);
  const [loading, setLoading] = useState(true);

  const log = useCallback((msg) => setLogs((l) => [`[${ts()}] ${msg}`, ...l].slice(0, 50)), []);

  const loadTournaments = useCallback(async () => {
    try {
      const { ethers } = await import('ethers');
      const p = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
      const c = new ethers.Contract(CONTRACT, ABI, p);
      const count = Number(await c.tournamentCount());
      const list = [];
      for (let i = 0; i < count; i++) {
        const t = await c.tournaments(i);
        const players = await c.getPlayers(i);
        const [, scores] = await c.getAllScores(i);
        const realPlayers = [...players].filter(a => !isZero(a));
        list.push({
          id: i,
          entryFee: ethers.formatEther(t.entryFee),
          totalRounds: Number(t.totalRounds),
          completedRounds: Number(t.completedRounds),
          prizePool: ethers.formatEther(t.prizePool),
          status: Number(t.status),
          winner: t.winner,
          players: realPlayers,
          scores: [...scores].map(Number),
        });
      }
      setTournaments(list);
      log(`✅ 加载 ${count} 个锦标赛`);
    } catch (e) {
      log(`❌ 加载失败: ${e.message}`);
    }
    setLoading(false);
  }, [log]);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);

  const connectWallet = async () => {
    if (!window.ethereum) { log('❌ 请安装 MetaMask'); return; }
    try {
      const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] }).catch(() => {});
      setAddress(accs[0]);
      log(`✅ 钱包已连接: ${short(accs[0])}`);
    } catch { log('❌ 连接钱包失败'); }
  };

  const joinTournament = async (tid) => {
    if (!address) { log('请先连接钱包'); return; }
    setJoiningId(tid);
    log(`⏳ 正在加入锦标赛 #${tid}...`);
    try {
      const { ethers } = await import('ethers');
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const c = new ethers.Contract(CONTRACT, ABI, s);
      const rpc = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
      const rc = new ethers.Contract(CONTRACT, ABI, rpc);
      const t = await rc.tournaments(tid);
      const tx = await c.joinTournament(tid, { value: t.entryFee });
      log(`📤 TX: ${tx.hash.slice(0, 14)}... 等待确认`);
      await tx.wait();
      log(`✅ 已加入锦标赛 #${tid}`);
      await loadTournaments();
    } catch (e) {
      log(`❌ 加入失败: ${e.message?.slice(0, 60)}`);
    }
    setJoiningId(null);
  };

  const canJoin = (t) => address && t.status === 0 && t.players.length < 4 && !t.players.some(p => p.toLowerCase() === address.toLowerCase());

  return (
    <div className="tournament-lobby">
      <div className="tournament-header">
        <button className="tournament-back" onClick={onBack}>← 返回</button>
        <h1>🏆 锦标赛</h1>
        <div className="tournament-wallet">
          {!address ? (
            <button className="tournament-connect" onClick={connectWallet}>🔗 连接钱包</button>
          ) : (
            <span className="tournament-addr">{short(address)}</span>
          )}
        </div>
      </div>

      <div className="tournament-info">
        <div className="tournament-stat">
          <span className="tournament-label">入场费</span>
          <span className="tournament-value">0.05 BNB</span>
        </div>
        <div className="tournament-stat">
          <span className="tournament-label">参赛人数</span>
          <span className="tournament-value">4 人</span>
        </div>
        <div className="tournament-stat">
          <span className="tournament-label">赛制</span>
          <span className="tournament-value">4 轮积分</span>
        </div>
        <div className="tournament-stat">
          <span className="tournament-label">平台手续费</span>
          <span className="tournament-value">5%</span>
        </div>
      </div>

      {loading ? <p style={{color:'#666',textAlign:'center'}}>加载中...</p> : tournaments.map((t) => (
        <div className="tournament-register" key={t.id}>
          <h2>锦标赛 #{t.id}</h2>
          <div className="tournament-info" style={{marginBottom:'15px'}}>
            <div className="tournament-stat">
              <span className="tournament-label">状态</span>
              <span className="tournament-value" style={{fontSize:'16px'}}>{STATUS[t.status]}</span>
            </div>
            <div className="tournament-stat">
              <span className="tournament-label">入场费</span>
              <span className="tournament-value" style={{fontSize:'16px'}}>{t.entryFee} BNB</span>
            </div>
            <div className="tournament-stat">
              <span className="tournament-label">奖池</span>
              <span className="tournament-value" style={{fontSize:'16px'}}>{t.prizePool} BNB</span>
            </div>
            <div className="tournament-stat">
              <span className="tournament-label">进度</span>
              <span className="tournament-value" style={{fontSize:'16px'}}>{t.completedRounds}/{t.totalRounds} 轮</span>
            </div>
          </div>

          <div className="tournament-registered">
            <h2 style={{fontSize:'16px'}}>已报名 ({t.players.length}/4)</h2>
            <div className="tournament-list">
              {t.players.map((p, i) => (
                <div className="tournament-agent-card" key={i}>
                  <span className="tournament-agent-num">#{i + 1}</span>
                  <span className="tournament-agent-addr">{short(p)}</span>
                  {t.scores[i] > 0 && <span style={{color:'#ffd700',fontSize:'12px'}}>积分: {t.scores[i]}</span>}
                </div>
              ))}
              {Array.from({ length: 4 - t.players.length }, (_, i) => (
                <div className="tournament-agent-card" key={`empty-${i}`} style={{opacity:0.3}}>
                  <span className="tournament-agent-num">#{t.players.length + i + 1}</span>
                  <span className="tournament-agent-addr">等待中...</span>
                </div>
              ))}
            </div>
          </div>

          {canJoin(t) ? (
            <button className="tournament-register-btn" disabled={joiningId === t.id} onClick={() => joinTournament(t.id)}>
              {joiningId === t.id ? '⏳ 加入中...' : `加入锦标赛 (${t.entryFee} BNB)`}
            </button>
          ) : t.status === 2 && !isZero(t.winner) ? (
            <div className="tournament-running"><h2>🏆 冠军: {short(t.winner)}</h2></div>
          ) : t.status === 1 ? (
            <div className="tournament-running"><h2>⚔️ 比赛进行中</h2><p>{t.completedRounds}/{t.totalRounds} 轮已完成</p></div>
          ) : null}
        </div>
      ))}

      {!loading && tournaments.length === 0 && (
        <div style={{textAlign:'center',color:'#666',padding:'40px'}}>暂无锦标赛</div>
      )}

      <div className="agent-log" style={{background:'rgba(255,215,0,0.02)',border:'1px solid rgba(255,215,0,0.2)'}}>
        <h3 style={{color:'#ffd700'}}>📋 操作日志</h3>
        {logs.map((l, i) => <p key={i} style={{color:'#999',fontSize:'12px',margin:'5px 0'}}>{l}</p>)}
      </div>
    </div>
  );
}
