import React, { useState, useEffect, useRef } from 'react';
import './AgentLobby.css';

const ENTRY_FEE = 0.01; // BNB per agent
const PLAYERS = ['claude', 'gpt', 'gemini', 'deepseek'];

export default function AgentLobby({ onBack }) {
  const [tables, setTables] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [skillInput, setSkillInput] = useState('');
  const [joining, setJoining] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch('/api/agent-tables');
        if (r.ok) setTables(await r.json());
      } catch {}
    }, 1000);
    return () => clearInterval(poll);
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) { alert('需要 MetaMask'); return; }
    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWallet(addr);
    } catch (e) { console.error(e); }
  };

  const joinTable = async (tableId) => {
    if (!wallet) { alert('请先连接钱包'); return; }
    if (!skillInput.trim()) { alert('请输入 Skill 地址或名称'); return; }
    
    setJoining(true);
    try {
      const r = await fetch('/api/agent-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          wallet,
          skill: skillInput.trim(),
          entryFee: ENTRY_FEE,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.gameStarted) {
          alert(`✅ 桌 ${tableId} 满员！游戏开始`);
        } else {
          alert(`✅ 已加入桌 ${tableId}，等待其他 Agent...`);
        }
        setSkillInput('');
      } else {
        alert('加入失败：' + (await r.text()));
      }
    } catch (e) {
      alert('错误：' + e.message);
    } finally {
      setJoining(false);
    }
  };

  const createNewTable = async () => {
    if (!wallet) { alert('请先连接钱包'); return; }
    try {
      const r = await fetch('/api/agent-table-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      });
      if (r.ok) {
        const data = await r.json();
        alert(`✅ 创建新桌 ${data.tableId}`);
      }
    } catch (e) { alert('错误：' + e.message); }
  };

  return (
    <div className="agent-lobby">
      <header className="agent-header">
        <button className="agent-back" onClick={onBack}>← 返回</button>
        <h1>🤖 Agent 入局大厅</h1>
        <div className="agent-wallet">
          {wallet ? (
            <span className="agent-addr">✅ {wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
          ) : (
            <button className="agent-connect" onClick={connectWallet}>🔗 连接钱包</button>
          )}
        </div>
      </header>

      <div className="agent-info">
        <p>💰 入场费：{ENTRY_FEE} BNB / Agent</p>
        <p>👥 满 4 人自动开局</p>
        <p>🏆 赢家通吃 {(ENTRY_FEE * 4).toFixed(3)} BNB</p>
      </div>

      <div className="agent-input-section">
        <input
          type="text"
          placeholder="输入 Skill 地址或名称 (e.g., my-mahjong-skill)"
          className="agent-skill-input"
          value={skillInput}
          onChange={e => setSkillInput(e.target.value)}
          disabled={joining}
        />
        <button className="agent-create-btn" onClick={createNewTable} disabled={joining}>
          ➕ 创建新桌
        </button>
      </div>

      <div className="agent-tables">
        <h2>📋 等待中的桌子</h2>
        {tables.length === 0 ? (
          <p className="agent-empty">暂无桌子，创建一个吧</p>
        ) : (
          tables.map(table => (
            <div key={table.id} className="agent-table-card">
              <div className="agent-table-header">
                <span className="agent-table-id">桌 #{table.id}</span>
                <span className="agent-table-status">
                  {table.players.length}/4 人
                </span>
              </div>

              <div className="agent-table-players">
                {table.players.map((p, i) => (
                  <div key={i} className="agent-player-badge">
                    <span className="agent-player-skill">{p.skill}</span>
                    <span className="agent-player-addr">{p.wallet.slice(0, 6)}...</span>
                  </div>
                ))}
                {Array(4 - table.players.length).fill(0).map((_, i) => (
                  <div key={`empty-${i}`} className="agent-player-empty">
                    等待中...
                  </div>
                ))}
              </div>

              {table.players.length < 4 && (
                <button
                  className="agent-join-btn"
                  onClick={() => joinTable(table.id)}
                  disabled={joining}
                >
                  {joining ? '加入中...' : '加入此桌'}
                </button>
              )}
              {table.players.length === 4 && (
                <div className="agent-table-full">🎮 游戏进行中...</div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="agent-log" ref={logRef}>
        <h3>📝 最近事件</h3>
        <p>等待 Agent 加入...</p>
      </div>
    </div>
  );
}
