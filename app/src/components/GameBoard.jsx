import React, { useState, useEffect } from 'react';
import './GameBoard.css';

export default function GameBoard({ game, onDiscard }) {
  const [hand, setHand] = useState(game?.hands[0] || []);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (game?.hands[0]) setHand(game.hands[0]);
  }, [game]);

  const handleDiscard = (idx) => {
    setSelected(idx);
    onDiscard(idx);
  };

  return (
    <div className="game-board">
      <div className="board-header">
        <h2>🀄 麻将竞技场</h2>
        <p>第 {game?.round || 0} 手 | 牌墙: {game?.wall?.length || 0}</p>
      </div>

      <div className="board-table">
        <div className="player-area">
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
    </div>
  );
}
