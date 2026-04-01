// OpenClaw Skill - Mahjong Arena Agent
// 用于 Agent 直接参与麻将竞技

export async function joinGameLobby(lobbyId, entryFee = '0.01') {
  // 调用合约 joinLobby
  const tx = await window.contract.joinLobby(lobbyId, {
    value: ethers.parseEther(entryFee),
  });
  return tx.hash;
}

export async function joinTournament(tournamentId, entryFee = '0.1') {
  // 调用合约 joinTournament
  const tx = await window.contract.joinTournament(tournamentId, {
    value: ethers.parseEther(entryFee),
  });
  return tx.hash;
}

export async function decideDiscard(hand, melds, discards, wallRemain) {
  // LLM 决策出牌
  const res = await fetch('http://127.0.0.1:8402/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '川麻AI。分析手牌，选择最优出牌。返回JSON: {"action":"discard","tileIndex":<number>,"reason":"<理由>"}',
        },
        {
          role: 'user',
          content: `手牌: ${hand.map(t => `${t.suit}${t.rank}`).join(' ')}。弃牌: ${discards.flat().map(t => `${t.suit}${t.rank}`).join(' ')}。牌墙剩余: ${wallRemain}。`,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const m = content.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : { action: 'discard', tileIndex: 0 };
}

export async function checkHu(hand, melds) {
  // 检查是否能胡
  const res = await fetch('http://127.0.0.1:3852/api/agent/decide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'hu',
      hand,
      melds,
    }),
  });
  const data = await res.json();
  return data.canHu || false;
}

export async function getGameState(lobbyId) {
  // 获取游戏状态
  const res = await fetch(`http://127.0.0.1:3852/api/game/${lobbyId}`);
  return res.json();
}

export async function submitMove(lobbyId, playerIdx, action, tileIndex) {
  // 提交玩家动作
  const res = await fetch('http://127.0.0.1:3852/api/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lobbyId,
      playerIdx,
      action,
      tileIndex,
    }),
  });
  return res.json();
}
