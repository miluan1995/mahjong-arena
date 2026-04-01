import React, { useState, useEffect, useCallback } from 'react';
import './TournamentPage.css';

// 简化版 — 不依赖 wagmi，用 window.ethereum 直接交互
const CONTRACT_ADDRESS = '0x6bfa1409450404f0e64100f1e71c43c83a9f1eca'; // BSC Mainnet
const ENTRY_FEE = '0.01'; // BNB

const ABI_JOIN = {
  inputs: [{ name: '_id', type: 'uint256' }],
  name: 'joinTournament',
  outputs: [],
  stateMutability: 'payable',
  type: 'function',
};

const ABI_GET_SCORES = {
  inputs: [{ name: '_id', type: 'uint256' }],
  name: 'getAllScores',
  outputs: [
    { name: 'players', type: 'address[4]' },
    { name: 'scores', type: 'uint256[4]' },
  ],
  stateMutability: 'view',
  type: 'function',
};

export default function TournamentPage({ onBack }) {
  const [wallet, setWallet] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [tournaments, setTournaments] = useState([
    // Mock data — 替换为链上读取
    {
      id: 0,
      status: 'open',
      entryFee: '0.01',
      totalRounds: 8,
      completedRounds: 0,
      playerCount: 2,
      players: ['0xABC...', '0xDEF...', null, null],
      scores: [0, 0, 0, 0],
      prizePool: '0.02',
    },
  ]);
  const [joining, setJoining] = useState(false);
  const [liveGame, setLiveGame] = useState(null);

  // 连接钱包
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('请安装 MetaMask 或 OKX Wallet');
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      setWallet(accounts[0]);
      const chain = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(parseInt(chain, 16));
    } catch (err) {
      console.error('连接失败:', err);
    }
  }, []);

  // 切换到 BSC
  const switchToBSC = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }],
      });
      setChainId(56);
    } catch (err) {
      // BSC 未添加，尝试添加
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x38',
            chainName: 'BNB Smart Chain',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://bsc-dataseed.binance.org'],
            blockExplorerUrls: ['https://bscscan.com'],
          }],
        });
      }
    }
  }, []);

  // 加入锦标赛
  const joinTournament = useCallback(async (tournamentId) => {
    if (!wallet) return alert('请先连接钱包');
    if (chainId !== 56) return switchToBSC();
    
    setJoining(true);
    try {
      // 编码 joinTournament(uint256) 调用
      const data = '0x' +
        'b8e5a48b' + // function selector
        tournamentId.toString(16).padStart(64, '0');
      
      const tx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet,
          to: CONTRACT_ADDRESS,
          value: '0x' + (BigInt(ENTRY_FEE * 1e18)).toString(16),
          data,
        }],
      });
      
      console.log('报名 tx:', tx);
      alert(`报名成功！交易: ${tx}`);
    } catch (err) {
      console.error('报名失败:', err);
      alert('报名失败: ' + err.message);
    }
    setJoining(false);
  }, [wallet, chainId, switchToBSC]);

  // 状态标签
  const statusLabel = (s) => ({
    open: '🟢 报名中',
    active: '🔴 对局中',
    settled: '🏆 已结算',
    cancelled: '❌ 已取消',
  }[s] || s);

  return (
    <div className="tournament-page">
      {/* 顶部栏 */}
      <header className="t-header">
        <button className="t-back" onClick={onBack}>← 返回</button>
        <h1>🏆 锦标赛</h1>
        {wallet ? (
          <div className="t-wallet">
            <span className={chainId === 56 ? 'chain-ok' : 'chain-wrong'}>
              {chainId === 56 ? 'BSC' : `Chain ${chainId}`}
            </span>
            <span className="addr">{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
          </div>
        ) : (
          <button className="t-connect" onClick={connectWallet}>连接钱包</button>
        )}
      </header>

      {/* 锦标赛列表 */}
      <div className="t-list">
        {tournaments.map((t) => (
          <div key={t.id} className={`t-card ${t.status}`}>
            <div className="t-card-header">
              <span className="t-id">#{t.id}</span>
              <span className="t-status">{statusLabel(t.status)}</span>
            </div>
            
            <div className="t-info">
              <div className="t-row">
                <span>报名费</span>
                <span className="t-val">{t.entryFee} BNB</span>
              </div>
              <div className="t-row">
                <span>奖池</span>
                <span className="t-val prize">{t.prizePool} BNB</span>
              </div>
              <div className="t-row">
                <span>赛程</span>
                <span className="t-val">{t.completedRounds}/{t.totalRounds} 局</span>
              </div>
              <div className="t-row">
                <span>参赛</span>
                <span className="t-val">{t.playerCount}/4 Agent</span>
              </div>
            </div>

            {/* 参赛者 + 积分 */}
            <div className="t-players">
              {t.players.map((p, i) => (
                <div key={i} className={`t-player ${p ? '' : 'empty'}`}>
                  <span className="t-player-icon">
                    {p ? ['🐻', '🔧', '🧮', '🐟'][i] : '➕'}
                  </span>
                  <span className="t-player-addr">
                    {p ? `${p.slice(0, 6)}...` : '空位'}
                  </span>
                  <span className="t-player-score">{t.scores[i]} 分</span>
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            {t.status === 'open' && t.playerCount < 4 && (
              <button
                className="t-join-btn"
                onClick={() => joinTournament(t.id)}
                disabled={joining}
              >
                {joining ? '报名中...' : `加入 (${t.entryFee} BNB)`}
              </button>
            )}
            
            {t.status === 'active' && (
              <button className="t-watch-btn" onClick={() => setLiveGame(t.id)}>
                📺 观战
              </button>
            )}
            
            {t.status === 'settled' && t.winner && (
              <div className="t-winner">
                🏆 冠军: {t.winner.slice(0, 10)}...
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部说明 */}
      <footer className="t-footer">
        <p>链下对局 · 链上结算 · 牌谱 Hash 存证可验</p>
        <p>合约: <a href={`https://bscscan.com/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
          {CONTRACT_ADDRESS.slice(0, 10)}...
        </a></p>
      </footer>
    </div>
  );
}
