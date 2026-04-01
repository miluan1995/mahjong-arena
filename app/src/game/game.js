// 对局控制器 - 支持人类玩家
import{createDeck,shuffle,sortHand,canWin,isSevenPairs,canPeng,canGangMing,canGangJia,getAnGang,tileName}from'./engine.js';
import{AIS}from'./ai.js';

export function createGame(humanSeat=-1){
  const deck=shuffle(createDeck());
  const players=AIS.map((ai,i)=>({
    seat:i,name:ai.name,emoji:ai.emoji,ai,
    hand:sortHand(deck.slice(i*13,(i+1)*13)),
    melds:[],discards:[],isOut:false,score:0,
    isHuman:i===humanSeat,
  }));
  if(humanSeat>=0){
    players[humanSeat].name='你';
    players[humanSeat].emoji='👤';
  }
  return{
    players,wall:deck.slice(52),current:0,turn:0,phase:'playing',
    activePlayers:[0,1,2,3],log:[],lastDiscard:null,bubble:null,
    humanSeat,
    // 人类交互状态
    waitingFor:null, // {type:'discard',seat} | {type:'respond',seat,tile,actions}
    drawnTile:null,   // 人类刚摸的牌（高亮用）
  };
}

export function nextActive(g,cur){
  let n=(cur+1)%4,c=0;
  while(!g.activePlayers.includes(n)&&c<4){n=(n+1)%4;c++;}
  return n;
}

// 人类摸牌阶段 - 检查自摸/暗杠/加杠可用动作
export function getAfterDrawActions(g){
  const p=g.players[g.humanSeat];
  const acts={};
  if(canWin(p.hand)||isSevenPairs(p.hand))acts.hu=true;
  const ag=getAnGang(p.hand);
  if(ag.length)acts.angang=ag;
  if(g.drawnTile&&canGangJia(p.melds,g.drawnTile))acts.jiagang=true;
  return acts;
}

// step: 推进一步。如果轮到人类，返回 {waiting:true, ...} 暂停
export function step(g){
  if(g.phase!=='playing'||g.waitingFor)return null;
  if(g.wall.length===0){g.phase='finished';return[{type:'draw_end'}];}

  const seat=g.current;
  const p=g.players[seat];
  if(p.isOut){g.current=nextActive(g,seat);return step(g);}

  // 摸牌
  const drawn=g.wall.shift();
  p.hand.push(drawn);
  g.turn++;

  const events=[{type:'draw',seat,tile:drawn}];

  // === 人类玩家 ===
  if(p.isHuman){
    g.drawnTile=drawn;
    // 检查自摸等
    const acts=getAfterDrawActions(g);
    if(acts.hu||acts.angang||acts.jiagang){
      g.waitingFor={type:'afterdraw',seat,actions:acts};
    }else{
      g.waitingFor={type:'discard',seat};
    }
    return events;
  }

  // === AI 玩家 ===
  const afterDraw=p.ai.afterDraw(p.hand,p.melds,drawn);
  if(afterDraw.action==='hu'){
    p.isOut=true;p.score+=2;
    g.activePlayers=g.activePlayers.filter(s=>s!==seat);
    g.bubble={seat,text:afterDraw.text,time:Date.now()};
    events.push({type:'hu',seat,tile:drawn,text:afterDraw.text,selfDraw:true});
    if(g.activePlayers.length<=1)g.phase='finished';
    g.current=nextActive(g,seat);
    return events;
  }
  if(afterDraw.action==='gang'){
    if(afterDraw.tiles){
      for(const t of afterDraw.tiles)p.hand=p.hand.filter(h=>h.id!==t.id);
      p.melds.push({type:'gang_an',tiles:afterDraw.tiles});
    }
    g.bubble={seat,text:afterDraw.text,time:Date.now()};
    events.push({type:'gang',seat,text:afterDraw.text});
    if(g.wall.length>0){
      const bt=g.wall.shift();
      p.hand.push(bt);
      events.push({type:'draw',seat,tile:bt,extra:true});
    }
  }

  // AI 出牌
  const decision=p.ai.chooseDiscard(p.hand,p.melds);
  const discardTile=decision.tile;
  p.hand=p.hand.filter(t=>t.id!==discardTile.id);
  p.hand=sortHand(p.hand);
  p.discards.push(discardTile);
  g.lastDiscard={tile:discardTile,seat};
  g.bubble={seat,text:decision.text,time:Date.now()};
  events.push({type:'discard',seat,tile:discardTile,text:decision.text});

  // 检查其他玩家响应
  return handleResponses(g,events,seat,discardTile);
}

// 处理出牌后的响应（碰/杠/胡）
function handleResponses(g,events,fromSeat,discardTile){
  // 先检查人类是否能响应
  if(g.humanSeat>=0){
    const hs=g.humanSeat;
    const hp=g.players[hs];
    if(!hp.isOut&&hs!==fromSeat){
      const hActs={};
      if(canWin([...hp.hand,discardTile])||isSevenPairs([...hp.hand,discardTile]))hActs.hu=true;
      if(canGangMing(hp.hand,discardTile))hActs.gang=true;
      if(canPeng(hp.hand,discardTile))hActs.peng=true;
      if(hActs.hu||hActs.gang||hActs.peng){
        // 人类有动作可选，暂停等待
        g.waitingFor={type:'respond',seat:hs,tile:discardTile,fromSeat,actions:hActs,events};
        return events;
      }
    }
  }

  // AI 响应
  for(let i=1;i<=3;i++){
    const rs=(fromSeat+i)%4;
    const rp=g.players[rs];
    if(rp.isOut||rp.isHuman)continue;

    const acts={
      hu:canWin([...rp.hand,discardTile])||isSevenPairs([...rp.hand,discardTile]),
      gang:canGangMing(rp.hand,discardTile),
      peng:canPeng(rp.hand,discardTile),
    };
    if(!acts.hu&&!acts.gang&&!acts.peng)continue;

    const resp=rp.ai.respond(rp.hand,rp.melds,discardTile,acts);
    if(resp.action==='pass')continue;

    if(resp.action==='hu'){
      rp.isOut=true;rp.score+=1;
      g.activePlayers=g.activePlayers.filter(s=>s!==rs);
      g.bubble={seat:rs,text:resp.text,time:Date.now()};
      events.push({type:'hu',seat:rs,tile:discardTile,text:resp.text,selfDraw:false});
      if(g.activePlayers.length<=1)g.phase='finished';
      g.current=nextActive(g,fromSeat);return events;
    }
    if(resp.action==='gang'){
      const used=rp.hand.filter(t=>t.suit===discardTile.suit&&t.rank===discardTile.rank).slice(0,3);
      for(const t of used)rp.hand=rp.hand.filter(h=>h.id!==t.id);
      rp.melds.push({type:'gang_ming',tiles:[...used,discardTile]});
      rp.hand=sortHand(rp.hand);
      g.bubble={seat:rs,text:resp.text,time:Date.now()};
      events.push({type:'gang',seat:rs,text:resp.text});
      g.current=rs;return events;
    }
    if(resp.action==='peng'){
      const used=rp.hand.filter(t=>t.suit===discardTile.suit&&t.rank===discardTile.rank).slice(0,2);
      for(const t of used)rp.hand=rp.hand.filter(h=>h.id!==t.id);
      rp.melds.push({type:'peng',tiles:[...used,discardTile]});
      rp.hand=sortHand(rp.hand);
      g.players[fromSeat].discards.pop();
      g.bubble={seat:rs,text:resp.text,time:Date.now()};
      events.push({type:'peng',seat:rs,text:resp.text});
      const pd=rp.ai.chooseDiscard(rp.hand,rp.melds);
      rp.hand=rp.hand.filter(t=>t.id!==pd.tile.id);
      rp.hand=sortHand(rp.hand);
      rp.discards.push(pd.tile);
      g.lastDiscard={tile:pd.tile,seat:rs};
      events.push({type:'discard',seat:rs,tile:pd.tile,text:pd.text});
      g.current=nextActive(g,rs);return events;
    }
  }

  g.current=nextActive(g,fromSeat);
  return events;
}

// === 人类动作接口 ===

// 人类出牌
export function humanDiscard(g,tileId){
  if(!g.waitingFor||g.waitingFor.type==='respond')return null;
  const p=g.players[g.humanSeat];
  const tile=p.hand.find(t=>t.id===tileId);
  if(!tile)return null;

  p.hand=p.hand.filter(t=>t.id!==tileId);
  p.hand=sortHand(p.hand);
  p.discards.push(tile);
  g.lastDiscard={tile,seat:g.humanSeat};
  g.drawnTile=null;
  g.waitingFor=null;

  const events=[{type:'discard',seat:g.humanSeat,tile,text:''}];
  return handleResponses(g,events,g.humanSeat,tile);
}

// 人类自摸/暗杠/加杠
export function humanAfterDraw(g,action){
  if(!g.waitingFor||g.waitingFor.type!=='afterdraw')return null;
  const p=g.players[g.humanSeat];
  const events=[];

  if(action==='hu'){
    p.isOut=true;p.score+=2;
    g.activePlayers=g.activePlayers.filter(s=>s!==g.humanSeat);
    events.push({type:'hu',seat:g.humanSeat,text:'自摸！',selfDraw:true});
    if(g.activePlayers.length<=1)g.phase='finished';
    g.current=nextActive(g,g.humanSeat);
    g.waitingFor=null;g.drawnTile=null;
    return events;
  }
  if(action==='angang'){
    const ag=getAnGang(p.hand);
    if(ag.length){
      for(const t of ag[0])p.hand=p.hand.filter(h=>h.id!==t.id);
      p.melds.push({type:'gang_an',tiles:ag[0]});
      events.push({type:'gang',seat:g.humanSeat,text:'暗杠！'});
      if(g.wall.length>0){const bt=g.wall.shift();p.hand.push(bt);g.drawnTile=bt;}
    }
    // 杠后还要出牌（或再检查自摸）
    const acts2=getAfterDrawActions(g);
    if(acts2.hu||acts2.angang||acts2.jiagang){
      g.waitingFor={type:'afterdraw',seat:g.humanSeat,actions:acts2};
    }else{
      g.waitingFor={type:'discard',seat:g.humanSeat};
    }
    return events;
  }
  if(action==='pass'){
    g.waitingFor={type:'discard',seat:g.humanSeat};
    return[];
  }
  return null;
}

// 人类响应别人的出牌（碰/杠/胡/过）
export function humanRespond(g,action){
  if(!g.waitingFor||g.waitingFor.type!=='respond')return null;
  const w=g.waitingFor;
  const p=g.players[g.humanSeat];
  const dt=w.tile;
  const events=w.events||[];
  g.waitingFor=null;

  if(action==='pass'){
    // 继续 AI 响应检查（从人类之后的座位开始）
    // 简化：直接推进
    g.current=nextActive(g,w.fromSeat);
    return events;
  }
  if(action==='hu'){
    p.isOut=true;p.score+=1;
    g.activePlayers=g.activePlayers.filter(s=>s!==g.humanSeat);
    events.push({type:'hu',seat:g.humanSeat,tile:dt,text:'胡！',selfDraw:false});
    if(g.activePlayers.length<=1)g.phase='finished';
    g.current=nextActive(g,w.fromSeat);
    return events;
  }
  if(action==='gang'){
    const used=p.hand.filter(t=>t.suit===dt.suit&&t.rank===dt.rank).slice(0,3);
    for(const t of used)p.hand=p.hand.filter(h=>h.id!==t.id);
    p.melds.push({type:'gang_ming',tiles:[...used,dt]});
    p.hand=sortHand(p.hand);
    events.push({type:'gang',seat:g.humanSeat,text:'杠！'});
    g.current=g.humanSeat;
    // 杠后补牌
    if(g.wall.length>0){
      const bt=g.wall.shift();p.hand.push(bt);g.drawnTile=bt;
      const acts=getAfterDrawActions(g);
      if(acts.hu||acts.angang||acts.jiagang){
        g.waitingFor={type:'afterdraw',seat:g.humanSeat,actions:acts};
      }else{
        g.waitingFor={type:'discard',seat:g.humanSeat};
      }
    }
    return events;
  }
  if(action==='peng'){
    const used=p.hand.filter(t=>t.suit===dt.suit&&t.rank===dt.rank).slice(0,2);
    for(const t of used)p.hand=p.hand.filter(h=>h.id!==t.id);
    p.melds.push({type:'peng',tiles:[...used,dt]});
    p.hand=sortHand(p.hand);
    g.players[w.fromSeat].discards.pop();
    events.push({type:'peng',seat:g.humanSeat,text:'碰！'});
    // 碰后要出牌
    g.waitingFor={type:'discard',seat:g.humanSeat};
    g.current=g.humanSeat;
    return events;
  }
  return null;
}
