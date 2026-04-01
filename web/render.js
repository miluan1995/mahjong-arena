// 渲染器
import{SL,RL,tileName}from'./engine.js';
import{getTileImage,getFrontImage,getBackImage}from'./tile-loader.js';

const TW=44,TH=60,TR=5,GAP=3;
const COL={tileFace:'#f5f0e1',wan:'#c0392b',tiao:'#27ae60',tong:'#2980b9',
  shadow:'rgba(0,0,0,0.22)',tag:'#ecf0f1',meldBg:'rgba(255,255,255,0.06)'};

let cv,ctx,W,H,cx,cy,dpr;

export function initCanvas(){
  cv=document.getElementById('c');ctx=cv.getContext('2d');
  resize();addEventListener('resize',resize);
}
function resize(){
  dpr=devicePixelRatio||1;W=innerWidth;H=innerHeight;
  cv.width=W*dpr;cv.height=H*dpr;
  cv.style.width=W+'px';cv.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);cx=W/2;cy=H/2;
}

function rr(x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function drawTile(x,y,suit,rank,opts={}){
  const{scale=1,faceDown=false,hl=false,rot=0}=opts;
  const w=TW*scale,h=TH*scale;
  ctx.save();ctx.translate(x+w/2,y+h/2);
  if(rot)ctx.rotate(rot);ctx.translate(-w/2,-h/2);
  ctx.shadowColor=COL.shadow;ctx.shadowBlur=3*scale;ctx.shadowOffsetY=2;
  if(faceDown){
    const backImg=getBackImage();
    if(backImg){ctx.drawImage(backImg,0,0,w,h);}
    else{rr(0,0,w,h,TR*scale);ctx.fillStyle='#2e7d32';ctx.fill();}
  }else{
    // 先画牌底
    const frontImg=getFrontImage();
    if(frontImg){ctx.drawImage(frontImg,0,0,w,h);}
    else{rr(0,0,w,h,TR*scale);ctx.fillStyle=hl?'#ffeaa7':COL.tileFace;ctx.fill();ctx.strokeStyle='#bbb';ctx.lineWidth=.8;ctx.stroke();}
    ctx.shadowColor='transparent';
    if(suit&&rank){
      const tileImg=getTileImage(suit,rank);
      if(tileImg){ctx.drawImage(tileImg,0,0,w,h);}
    }
    if(hl){ctx.fillStyle='rgba(255,235,100,0.25)';rr(0,0,w,h,TR*scale);ctx.fill();}
  }
  ctx.restore();
}

function drawTag(x,y,name,active){
  ctx.fillStyle=active?'rgba(255,215,0,0.6)':'rgba(0,0,0,0.5)';
  rr(x-55,y-12,110,24,12);ctx.fill();
  ctx.fillStyle=COL.tag;ctx.font='12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(name,x,y);
}

function drawDiscardsH(dc,baseX,baseY,scale=0.5){
  const sw=TW*scale+2,maxR=8;
  for(let i=0;i<dc.length;i++){
    const row=i/maxR|0,col=i%maxR;
    const rl=Math.min(maxR,dc.length-row*maxR);
    const rx=baseX-rl*sw/2;
    drawTile(rx+col*sw,baseY+row*(TH*scale+3),dc[i].suit,dc[i].rank,{scale});
  }
}

function drawMeldH(x,y,melds,scale=0.55){
  let ox=0;
  for(const m of melds){
    for(let i=0;i<m.tiles.length;i++){
      drawTile(x+ox,y,m.tiles[i].suit,m.tiles[i].rank,{scale});
      ox+=TW*scale+2;
    }
    ox+=8;
  }
  return ox;
}

function drawDiscardsV(dc,baseX,baseY,scale=0.45,dir=1){
  const sh=TW*scale+2,maxC=6;
  for(let i=0;i<dc.length;i++){
    const col=i/maxC|0,row=i%maxC;
    const cl=Math.min(maxC,dc.length-col*maxC);
    const ry=baseY-cl*sh/2+row*sh;
    const rx=baseX+dir*col*(TH*scale+3);
    drawTile(rx,ry,dc[i].suit,dc[i].rank,{scale,rot:dir*Math.PI/2});
  }
}

export function render(g){
  if(!ctx)return;
  ctx.clearRect(0,0,W,H);
  // 桌面
  const gr=ctx.createRadialGradient(cx,cy,50,cx,cy,Math.max(W,H)*.7);
  gr.addColorStop(0,'#1f8c47');gr.addColorStop(1,'#145a2e');
  ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);

  const ps=g.players;

  // ==== 底部 (seat 0) ====
  {const p=ps[0],hand=p.hand,sc=1;
    const tw=hand.length*(TW+GAP)-GAP;
    let mw=0;for(const m of p.melds)mw+=m.tiles.length*(TW*.55+2)+8;
    const total=tw+(mw>0?10+mw:0);
    const sx=cx-total/2,y=H-TH-28;
    drawTag(cx,y-16,`${p.emoji} ${p.name}`,g.current===0&&!p.isOut);
    for(let i=0;i<hand.length;i++)drawTile(sx+i*(TW+GAP),y,hand[i].suit,hand[i].rank);
    if(mw>0)drawMeldH(sx+tw+10,y+TH*.2,p.melds,.55);
    drawDiscardsH(p.discards,cx,y-22-(Math.ceil(p.discards.length/8))*(TH*.5+3),.5);
    if(p.isOut){ctx.fillStyle='rgba(0,0,0,0.4)';ctx.font='bold 20px sans-serif';ctx.textAlign='center';
      ctx.fillText('✅ 已胡',cx,y+TH/2);}}

  // ==== 上方 (seat 2) ====
  {const p=ps[2],hand=p.hand,sc=.62;
    const tw=hand.length*(TW*sc+2);
    let mw=0;for(const m of p.melds)mw+=m.tiles.length*(TW*.48+2)+8;
    const total=tw+(mw>0?10+mw:0);
    const sx=cx-total/2,y=25;
    for(let i=0;i<hand.length;i++)drawTile(sx+i*(TW*sc+2),y,null,null,{scale:sc,faceDown:true});
    if(mw>0)drawMeldH(sx+tw+10,y+TH*sc*.15,p.melds,.48);
    drawTag(cx,y+TH*sc+14,`${p.emoji} ${p.name}`,g.current===2&&!p.isOut);
    drawDiscardsH(p.discards,cx,y+TH*sc+30,.45);
    if(p.isOut){ctx.fillStyle='rgba(0,0,0,0.4)';ctx.font='bold 16px sans-serif';ctx.textAlign='center';
      ctx.fillText('✅ 已胡',cx,y+TH*sc/2);}}

  // ==== 右侧 (seat 1) ====
  {const p=ps[1],hand=p.hand,sc=.55;
    const ts=TW*sc+2,hh=hand.length*ts;
    const x=W-TH*sc-28,sy=cy-hh/2;
    for(let i=0;i<hand.length;i++)drawTile(x,sy+i*ts,null,null,{scale:sc,faceDown:true,rot:Math.PI/2});
    drawTag(x-10,sy-18,`${p.emoji} ${p.name}`,g.current===1&&!p.isOut);
    drawDiscardsV(p.discards,x-TH*sc-16,cy,.42,-1);
    if(p.isOut){ctx.save();ctx.translate(x+TH*sc/2,cy);ctx.rotate(Math.PI/2);
      ctx.fillStyle='rgba(0,0,0,0.4)';ctx.font='bold 16px sans-serif';ctx.textAlign='center';
      ctx.fillText('✅ 已胡',0,0);ctx.restore();}}

  // ==== 左侧 (seat 3) ====
  {const p=ps[3],hand=p.hand,sc=.55;
    const ts=TW*sc+2,hh=hand.length*ts;
    const x=28,sy=cy-hh/2;
    for(let i=0;i<hand.length;i++)drawTile(x,sy+i*ts,null,null,{scale:sc,faceDown:true,rot:-Math.PI/2});
    drawTag(x+TH*sc+10,sy-18,`${p.emoji} ${p.name}`,g.current===3&&!p.isOut);
    drawDiscardsV(p.discards,x+TH*sc+16,cy,.42,1);
    if(p.isOut){ctx.save();ctx.translate(x+TH*sc/2,cy);ctx.rotate(-Math.PI/2);
      ctx.fillStyle='rgba(0,0,0,0.4)';ctx.font='bold 16px sans-serif';ctx.textAlign='center';
      ctx.fillText('✅ 已胡',0,0);ctx.restore();}}

  // ==== HUD ====
  ctx.fillStyle='rgba(0,0,0,0.5)';rr(cx-40,cy-18,80,36,8);ctx.fill();
  ctx.fillStyle='#ffd700';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(`余 ${g.wall.length}`,cx,cy-3);
  ctx.fillStyle='#aaa';ctx.font='11px sans-serif';
  ctx.fillText(`第 ${g.turn} 手`,cx,cy+11);

  // 气泡
  if(g.bubble&&Date.now()-g.bubble.time<2000){
    const b=g.bubble,positions=[
      {x:cx,y:H-TH-100},{x:W-80,y:cy},{x:cx,y:120},{x:80,y:cy}
    ];
    const pos=positions[b.seat];
    ctx.fillStyle='rgba(0,0,0,0.7)';
    ctx.font='13px sans-serif';const tw2=ctx.measureText(b.text).width;
    rr(pos.x-tw2/2-10,pos.y-14,tw2+20,28,14);ctx.fill();
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(b.text,pos.x,pos.y);
  }

  // 结束
  if(g.phase==='finished'){
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffd700';ctx.font='bold 36px sans-serif';ctx.textAlign='center';
    ctx.fillText('对局结束',cx,cy-40);
    ctx.font='18px sans-serif';ctx.fillStyle='#fff';
    let ty=cy+10;
    for(const p of ps){
      const status=p.isOut?`✅ ${p.winResult||'胡牌'} +${p.score}分`:'❌ 未胡';
      ctx.fillText(`${p.emoji} ${p.name}: ${status}`,cx,ty);
      ty+=30;
    }
  }
}
