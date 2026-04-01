// 川麻引擎 - 浏览器版（精简）
export const SUITS=['wan','tiao','tong'];
export const SL={wan:'万',tiao:'条',tong:'筒'};
export const RL=['','一','二','三','四','五','六','七','八','九'];

export function createDeck(){
  const d=[];let id=0;
  for(const s of SUITS)for(let r=1;r<=9;r++)for(let c=0;c<4;c++)d.push({suit:s,rank:r,id:id++});
  return d;
}
export function shuffle(d){
  const a=[...d];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;
}
export function sortHand(h){return[...h].sort((a,b)=>(SUITS.indexOf(a.suit)*10+a.rank)-(SUITS.indexOf(b.suit)*10+b.rank));}
export function tileKey(t){return`${t.suit}_${t.rank}`;}
export function tileName(t){return RL[t.rank]+SL[t.suit];}

// 计数
export function countMap(tiles){
  const m={};for(const t of tiles){const k=tileKey(t);m[k]=(m[k]||0)+1;}return m;
}

// 胡牌判定
function canFormMeldsSuit(ranks){
  if(ranks.length===0)return true;
  if(ranks.length%3!==0)return false;
  ranks.sort((a,b)=>a-b);
  // 刻子
  if(ranks.length>=3&&ranks[0]===ranks[1]&&ranks[1]===ranks[2]){
    if(canFormMeldsSuit(ranks.slice(3)))return true;
  }
  // 顺子
  if(ranks.length>=3){
    const r0=ranks[0];
    const i1=ranks.indexOf(r0+1,1);
    if(i1!==-1){const i2=ranks.indexOf(r0+2,i1+1);
      if(i2!==-1){const rest=[...ranks];rest.splice(i2,1);rest.splice(i1,1);rest.splice(0,1);
        if(canFormMeldsSuit(rest))return true;}}
  }
  return false;
}

export function canWin(tiles){
  if(tiles.length%3!==2)return false;
  for(const s of SUITS){
    for(let r=1;r<=9;r++){
      const matching=tiles.filter(t=>t.suit===s&&t.rank===r);
      if(matching.length<2)continue;
      const rest=tiles.filter(t=>t.id!==matching[0].id&&t.id!==matching[1].id);
      // 按花色分组检查
      const bySuit={wan:[],tiao:[],tong:[]};
      for(const t of rest)bySuit[t.suit].push(t.rank);
      let ok=true;
      for(const su of SUITS){if(bySuit[su].length%3!==0){ok=false;break;}
        if(!canFormMeldsSuit(bySuit[su])){ok=false;break;}}
      if(ok)return true;
    }
  }
  return false;
}

export function isSevenPairs(tiles){
  if(tiles.length!==14)return false;
  const m=countMap(tiles);const vals=Object.values(m);
  return vals.every(v=>v===2||v===4)&&vals.reduce((s,v)=>s+Math.floor(v/2),0)===7;
}

// 碰/杠
export function canPeng(hand,t){return hand.filter(h=>h.suit===t.suit&&h.rank===t.rank).length>=2;}
export function canGangMing(hand,t){return hand.filter(h=>h.suit===t.suit&&h.rank===t.rank).length>=3;}
export function getAnGang(hand){
  const m=countMap(hand);const res=[];
  for(const[k,v]of Object.entries(m)){if(v===4){const[s,r]=k.split('_');res.push(hand.filter(t=>t.suit===s&&t.rank===+r));}}
  return res;
}
export function canGangJia(melds,t){return melds.some(m=>m.type==='peng'&&m.tiles[0].suit===t.suit&&m.tiles[0].rank===t.rank);}
