import React, { useState, useEffect, useCallback } from 'react';
import './AgentLobby.css';

const CONTRACT = '0x6a0873501EDe896606CE8F411E0ed01E2F358710';
const ABI = [
  'function joinGameLobby(uint256 _lobbyId) payable',
  'function getLobbyInfo(uint256) view returns (uint256 id, uint256 entryFee, uint8 playerCount, uint8 status, uint256 prizePool, address winner)',
  'function getLobbyPlayers(uint256) view returns (address[4])',
  'function lobbyCount() view returns (uint256)',
];

const short = (a) => a === '0x0000000000000000000000000000000000000000' ? null : `${a.slice(0, 6)}...${a.slice(-4)}`;
const ts = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });

export default function AgentLobby({ onBack }) {
  const [address, setAddress] = useState('');
  const [tables, setTables] = useState([]);
  const [logs, setLogs] = useState([`[${ts()}] 加载中...`]);
  const [joiningId, setJoiningId] = useState(null);
  const [loading, setLoading] = useState(true);

  const log = useCallback((msg) => setLogs((l) => [`[${ts()}] ${msg}`, ...l].slice(0, 50)), []);

  // 从合约加载牌桌
  const loadTables = useCallback(async () => {
    try {
      const { ethers } = await import('ethers');
      const p = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
      const c = new ethers.Contract(CONTRACT, ABI, p);
      const count = Number(await c.lobbyCount());
      const list = [];
      for (let i = 0; i < count; i++) {
        const info = await c.getLobbyInfo(i);
        const players = await c.getLobbyPlayers(i);
        list.push({
          id: i,
          fee: ethers.formatEther(info.entryFee),
          playerCount: Number(info.playerCount),
          status: Number(info.status), // 0=Open, 1=Active, 2=Settled
          prizePool: ethers.formatEther(info.prizePool),
          winner: info.winner,
          players: [...players],
        });
      }
      setTables(list);
      log(`✅ 加载 ${count} 个牌桌`);
    } catch (e) {
      log(`❌ 加载失败: ${e.message}`);
    }
    setLoading(false);
  }, [log]);

  useEffect(() => { loadTables(); }, [loadTables]);

  const connectWallet = async () => {
    if (!window.ethereum) { log('❌ 请安装 MetaMask'); return; }
    try {
      const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] }).catch(() => {});
      setAddress(accs[0]);
      log(`✅ 钱包已连接: ${short(accs[0])}`);
    } catch { log('❌ 连接钱包失败'); }
  };

  const joinTable = async (tableId) => {
    if (!address) { log('请先连接钱包'); return; }
    setJoiningId(tableId);
    log(`⏳ 正在加入牌桌 #${tableId}...`);
    try {
      const { ethers } = await import('ethers');
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const c = new ethers.Contract(CONTRACT, ABI, s);
      const info = await new ethers.Contract(CONTRACT, ABI, new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org')).getLobbyInfo(tableId);
      const tx = await c.joinGameLobby(tableId, { value: info.entryFee });
      log(`📤 TX: ${tx.hash.slice(0, 14)}... 等待确认`);
      await tx.wait();
      log(`✅ 已加入牌桌 #${tableId}`);
      await loadTables();
    } catch (e) {
      log(`❌ 加入失败: ${e.message?.slice(0, 60)}`);
    }
    setJoiningId(null);
  };

  const statusText = (s) => ['等待中', '游戏中', '已结算'][s] || '未知';
  const isZero = (a) => a === '0x0000000000000000000000000000000000000000';
  const canJoin = (t) => address && t.status === 0 && t.playerCount < 4 && !t.players.some(p => p.toLowerCase() === address.toLowerCase());

  return (
    <div className="agent-lobby">
      <div className="agent-header">
        <button className="agent-back" onClick={onBack}>← 返回</button>
        <h1>🀄 Agent 入局</h1>
        <div className="agent-wallet">
          {!address ? (
            <button className="agent-connect" onClick={connectWallet}>🔗 连接钱包</button>
          ) : (
            <span className="agent-addr">{short(address)}</span>
          )}
        </div>
      </div>

      <div className="agent-info">
        <p>入场费: 0.01 BNB | 4人满自动开局 | 赢家通吃(95%) | 合约: <a href={`https://bscscan.com/address/${CONTRACT}`} target="_blank" rel="noreferrer" style={{color:'#00ffc8'}}>{CONTRACT.slice(0,10)}...</a></p>
      </div>

      <div className="agent-tables">
        <h2>🎲 活跃牌桌 ({tables.length})</h2>
        {loading ? <p style={{color:'#666'}}>加载中...</p> : tables.length === 0 ? (
          <div className="agent-empty">暂无牌桌</div>
        ) : tables.map((t) => (
          <div className="agent-table-card" key={t.id}>
            <div className="agent-table-header">
              <span className="agent-table-id">牌桌 #{t.id}</span>
              <span className="agent-table-status">{t.playerCount}/4 · {statusText(t.status)}</span>
            </div>
            <div className="agent-table-players">
              {t.players.map((p, i) => !isZero(p) ? (
                <div className="agent-player-badge" key={i}>
                  <span className="agent-player-skill">Player {i + 1}</span>
                  <span className="agent-player-addr">{short(p)}</span>
                </div>
              ) : (
                <div className="agent-player-empty" key={i}>等待中...</div>
              ))}
            </div>
            {canJoin(t) ? (
              <button className="agent-join-btn" disabled={joiningId === t.id} onClick={() => joinTable(t.id)}>
                {joiningId === t.id ? '⏳ 加入中...' : `加入牌桌 (${t.fee} BNB)`}
              </button>
            ) : t.status === 1 ? (
              <div className="agent-table-full">🀄 游戏进行中</div>
            ) : t.status === 2 ? (
              <div className="agent-table-full">✅ 已结算 {!isZero(t.winner) && `| 赢家: ${short(t.winner)}`}</div>
            ) : t.playerCount === 4 ? (
              <div className="agent-table-full">已满员</div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="agent-log">
        <h3>📋 操作日志</h3>
        {logs.map((l, i) => <p key={i}>{l}</p>)}
      </div>
    </div>
  );
}
