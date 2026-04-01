// AI 策略 - 浏览器版
import{canWin,isSevenPairs,getAnGang,canGangJia,canPeng,tileName,countMap,SUITS}from'./engine.js';

function tileUselessness(tile,hand){
  let s=0;const m=countMap(hand);const k=`${tile.suit}_${tile.rank}`;
  if((m[k]||0)===1)s+=3;
  if(tile.rank===1||tile.rank===9)s+=2;
  if(!hand.some(t=>t.suit===tile.suit&&t.id!==tile.id&&Math.abs(t.rank-tile.rank)<=2))s+=4;
  return s;
}
function findUseless(hand){let best=hand[0],bs=-1;for(const t of hand){const s=tileUselessness(t,hand);if(s>bs){bs=s;best=t;}}return best;}

export const AIS=[
  {name:'黑瞎子',emoji:'🐻',style:'激进',
    chooseDiscard(hand,melds){
      const sc={};for(const t of hand)sc[t.suit]=(sc[t.suit]||0)+1;
      let ms=hand[0].suit,mc=0;for(const s of SUITS)if((sc[s]||0)>mc){mc=sc[s]||0;ms=s;}
      if(mc>=hand.length*0.6){const off=hand.find(t=>t.suit!==ms);if(off)return{tile:off,text:`做清一色，打${tileName(off)}`};}
      const t=findUseless(hand);return{tile:t,text:`${tileName(t)}没用`};
    },
    respond(hand,melds,dt,acts){
      if(acts.hu)return{action:'hu',text:'胡了！🔥'};
      if(acts.gang)return{action:'gang',text:'杠！💪'};
      if(acts.peng)return{action:'peng',text:'碰！'};
      return{action:'pass'};
    },
    afterDraw(hand,melds,dt){
      if(canWin(hand)||isSevenPairs(hand))return{action:'hu',text:'自摸！🎉'};
      const ag=getAnGang(hand);if(ag.length)return{action:'gang',tiles:ag[0],text:'暗杠！'};
      if(canGangJia(melds,dt))return{action:'gang',tile:dt,text:'加杠！'};
      return{action:'pass'};
    }
  },
  {name:'铁柱',emoji:'🔨',style:'保守',
    chooseDiscard(hand,melds){const t=findUseless(hand);return{tile:t,text:`稳一手，打${tileName(t)}`};},
    respond(hand,melds,dt,acts){
      if(acts.hu)return{action:'hu',text:'胡了 😌'};
      if(acts.gang)return{action:'gang',text:'杠一个'};
      if(acts.peng&&hand.length<=5)return{action:'peng',text:'快听了，碰'};
      return{action:'pass'};
    },
    afterDraw(hand,melds,dt){
      if(canWin(hand)||isSevenPairs(hand))return{action:'hu',text:'自摸 😊'};
      const ag=getAnGang(hand);if(ag.length)return{action:'gang',tiles:ag[0],text:'暗杠'};
      return{action:'pass'};
    }
  },
  {name:'算盘',emoji:'🧮',style:'计算',
    chooseDiscard(hand,melds){const t=findUseless(hand);return{tile:t,text:`最优解：打${tileName(t)}`};},
    respond(hand,melds,dt,acts){
      if(acts.hu)return{action:'hu',text:'计算完毕，胡 📊'};
      if(acts.gang)return{action:'gang',text:'杠，+EV'};
      if(acts.peng)return{action:'peng',text:'碰，优化牌型'};
      return{action:'pass'};
    },
    afterDraw(hand,melds,dt){
      if(canWin(hand)||isSevenPairs(hand))return{action:'hu',text:'自摸 ✓'};
      const ag=getAnGang(hand);if(ag.length)return{action:'gang',tiles:ag[0],text:'暗杠，正EV'};
      if(canGangJia(melds,dt))return{action:'gang',tile:dt,text:'加杠'};
      return{action:'pass'};
    }
  },
  {name:'锦鲤',emoji:'🐟',style:'混沌',
    chooseDiscard(hand,melds){
      if(Math.random()<0.2){const t=findUseless(hand);return{tile:t,text:'难得认真一次'};}
      const t=hand[Math.random()*hand.length|0];
      const q=['随便~','感觉不错！','跟着感觉走','闭眼出牌','这张有灵气'];
      return{tile:t,text:q[Math.random()*q.length|0]};
    },
    respond(hand,melds,dt,acts){
      if(acts.hu)return{action:'hu',text:'运气来了 🍀'};
      if(acts.gang&&Math.random()<0.5)return{action:'gang',text:'杠着玩~'};
      if(acts.peng&&Math.random()<0.5)return{action:'peng',text:'碰碰碰！'};
      return{action:'pass'};
    },
    afterDraw(hand,melds,dt){
      if(canWin(hand)||isSevenPairs(hand))return{action:'hu',text:'锦鲤附体 🐟✨'};
      const ag=getAnGang(hand);if(ag.length&&Math.random()<0.7)return{action:'gang',tiles:ag[0],text:'暗杠~'};
      return{action:'pass'};
    }
  }
];
