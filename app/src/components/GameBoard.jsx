import React, { useState, useEffect } from 'react';
import './GameBoard.css';

export default function GameBoard({ game, onBack }) {
  const [hand, setHand] = useState(game?.hands[0] || []);
  const [selected, setSelected] = useState(null);
  const [gameLog, setGameLog] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    if (game?.hands[0]) setHand(game.hands[0]);
  }, [game]);

  useEffect(() => {
    if (!game) return;
    const socket = new WebSocket(`ws://localhost:3852/ws?lobbyId=${game.lobbyId}&address=player0`);
    
    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'turn') {
        setGameLog(prev => [...prev, `玩家 ${msg.playerIdx + 1} 出 ${msg.tile.suit}${msg.tile.rank}`]);
      } else if (msg.type === 'gameEnd') {
        setGameLog(prev => [...prev, `🎉 ${msg.winner} 胡牌！${msg.fan}番，得分 ${msg.score}`]);
      }
    };
    
    setWs(socket);
    return () => socket.close();
  }, [game]);

  const handleDiscard = (idx) => {
    setSelected(idx);
    const tile = hand[idx];
    setGameLog(prev => [...prev, `你出 ${tile.suit}${tile.rank}`]);
  };

  return (
    <div className="game-board">
      <button className="back-btn" onClick={onBack}>← 返回</button>
      
      <div className="board-header">
        <h2>🀄 麻将竞技场</h2>
        <p>第 {game?.round || 0} 手 | 牌墙: {game?.wall?.length || 0}</p>
      </div>

      <div className="board-container">
        <div className="board-main">
          <div className="player-area">
            <h3>你的手牌</h3>
            <div className="player-hand">
              {hand.map((tile, idx) => (
                <div
                  key={idx}
                  className={`tile ${selected === idx ? 'selected' : ''}`}
                  onClick={() => handleDiscard(idx)}
                >
                  {tile.suit}{tile.rank}
                </div>
              ))}
            </div>
          </div>

          <div className="discard-area">
            <h3>弃牌区</h3>
            {game?.discards?.map((discard, playerIdx) => (
              <div key={playerIdx} className="player-discard">
                <p>玩家 {playerIdx + 1}</p>
                <div className="discard-tiles">
                  {discard.map((tile, idx) => (
                    <span key={idx} className="discard-tile">
                      {tile.suit}{tile.rank}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="game-log">
          <h3>游戏日志</h3>
          <div className="log-content">
            {gameLog.map((log, idx) => (
              <p key={idx} className="log-entry">{log}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
