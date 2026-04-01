// 麻将牌面精细绘制 - 万子/条子/筒子
// 所有绘制函数接收 (ctx, x, y, w, h) 表示牌面内容区域

// ===== 颜色 =====
const RED='#c0392b', GREEN='#1a7a3a', BLUE='#1a5276', BLACK='#2c3e50';

// ===== 万子 =====
const WAN_CHARS=['','一','二','三','四','五','六','七','八','九'];
function drawWan(ctx,x,y,w,h,rank){
  // 上半：数字（红色毛笔风格）
  ctx.fillStyle=RED;
  ctx.font=`bold ${h*0.42|0}px serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(WAN_CHARS[rank],x+w/2,y+h*0.32);
  // 下半："萬"字
  ctx.fillStyle=BLACK;
  ctx.font=`bold ${h*0.28|0}px serif`;
  ctx.fillText('萬',x+w/2,y+h*0.72);
}

// ===== 筒子 =====
function drawCircle(ctx,cx,cy,r,color){
  // 双环效果
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.strokeStyle=color;ctx.lineWidth=r*0.35;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,r*0.4,0,Math.PI*2);
  ctx.fillStyle=color;ctx.fill();
}

// 筒子排列位置（1-9个圆的布局）
const TONG_LAYOUTS={
  1:[[.5,.5]],
  2:[[.5,.3],[.5,.7]],
  3:[[.5,.2],[.5,.5],[.5,.8]],
  4:[[.3,.3],[.7,.3],[.3,.7],[.7,.7]],
  5:[[.3,.25],[.7,.25],[.5,.5],[.3,.75],[.7,.75]],
  6:[[.3,.2],[.7,.2],[.3,.5],[.7,.5],[.3,.8],[.7,.8]],
  7:[[.3,.18],[.7,.18],[.3,.44],[.7,.44],[.3,.7],[.7,.7],[.5,.9]],
  8:[[.3,.15],[.7,.15],[.3,.38],[.7,.38],[.3,.62],[.7,.62],[.3,.85],[.7,.85]],
  9:[[.2,.18],[.5,.18],[.8,.18],[.2,.5],[.5,.5],[.8,.5],[.2,.82],[.5,.82],[.8,.82]],
};

function drawTong(ctx,x,y,w,h,rank){
  const layout=TONG_LAYOUTS[rank];
  const r=rank<=3?w*0.16:rank<=6?w*0.13:w*0.11;
  const colors=[BLUE,'#2471a3'];
  for(let i=0;i<layout.length;i++){
    drawCircle(ctx,x+layout[i][0]*w,y+layout[i][1]*h,r,colors[i%2===0?0:1]);
  }
}

// ===== 条子 =====
function drawBamboo(ctx,cx,cy,bw,bh){
  // 单根竹节
  const segs=3;
  const segH=bh/segs;
  for(let i=0;i<segs;i++){
    const sy=cy-bh/2+i*segH;
    const grad=ctx.createLinearGradient(cx-bw/2,sy,cx+bw/2,sy);
    grad.addColorStop(0,'#1a7a3a');grad.addColorStop(0.3,'#27ae60');
    grad.addColorStop(0.7,'#27ae60');grad.addColorStop(1,'#1a7a3a');
    ctx.fillStyle=grad;
    // 竹节有腰
    ctx.beginPath();
    const pinch=bw*0.15;
    ctx.moveTo(cx-bw/2,sy);ctx.lineTo(cx+bw/2,sy);
    ctx.lineTo(cx+bw/2-pinch,sy+segH/2);ctx.lineTo(cx+bw/2,sy+segH);
    ctx.lineTo(cx-bw/2,sy+segH);ctx.lineTo(cx-bw/2+pinch,sy+segH/2);
    ctx.closePath();ctx.fill();
    // 节线
    ctx.strokeStyle='#145a2e';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.moveTo(cx-bw/2,sy);ctx.lineTo(cx+bw/2,sy);ctx.stroke();
  }
}

function drawBird(ctx,cx,cy,size){
  // 一条用鸟代替（传统麻将）
  ctx.fillStyle=RED;
  ctx.beginPath();
  // 鸟身
  ctx.ellipse(cx,cy,size*0.5,size*0.35,0,0,Math.PI*2);ctx.fill();
  // 头
  ctx.beginPath();ctx.arc(cx-size*0.35,cy-size*0.2,size*0.2,0,Math.PI*2);ctx.fill();
  // 嘴
  ctx.fillStyle='#e67e22';
  ctx.beginPath();ctx.moveTo(cx-size*0.55,cy-size*0.2);
  ctx.lineTo(cx-size*0.7,cy-size*0.15);ctx.lineTo(cx-size*0.55,cy-size*0.1);ctx.fill();
  // 眼
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx-size*0.38,cy-size*0.25,size*0.06,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=BLACK;ctx.beginPath();ctx.arc(cx-size*0.38,cy-size*0.25,size*0.03,0,Math.PI*2);ctx.fill();
  // 翅
  ctx.strokeStyle=RED;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(cx,cy-size*0.1);
  ctx.quadraticCurveTo(cx+size*0.2,cy-size*0.5,cx+size*0.5,cy-size*0.3);ctx.stroke();
  // 尾
  ctx.beginPath();ctx.moveTo(cx+size*0.4,cy);
  ctx.quadraticCurveTo(cx+size*0.7,cy-size*0.2,cx+size*0.6,cy+size*0.1);ctx.stroke();
}

const TIAO_LAYOUTS={
  1:'bird',
  2:[[.5,.3],[.5,.7]],
  3:[[.3,.5],[.5,.5],[.7,.5]],
  4:[[.35,.3],[.65,.3],[.35,.7],[.65,.7]],
  5:[[.3,.25],[.7,.25],[.5,.5],[.3,.75],[.7,.75]],
  6:[[.35,.2],[.65,.2],[.35,.5],[.65,.5],[.35,.8],[.65,.8]],
  7:[[.25,.2],[.5,.2],[.75,.2],[.35,.55],[.65,.55],[.35,.85],[.65,.85]],
  8:[[.3,.15],[.7,.15],[.3,.38],[.7,.38],[.3,.62],[.7,.62],[.3,.85],[.7,.85]],
  9:[[.2,.18],[.5,.18],[.8,.18],[.2,.5],[.5,.5],[.8,.5],[.2,.82],[.5,.82],[.8,.82]],
};

function drawTiao(ctx,x,y,w,h,rank){
  if(rank===1){
    drawBird(ctx,x+w/2,y+h/2,Math.min(w,h)*0.7);
    return;
  }
  const layout=TIAO_LAYOUTS[rank];
  const bw=rank<=4?w*0.14:w*0.11;
  const bh=rank<=4?h*0.3:h*0.22;
  for(const pos of layout){
    drawBamboo(ctx,x+pos[0]*w,y+pos[1]*h,bw,bh);
  }
}

// ===== 导出：画牌面内容 =====
export function drawTileFace(ctx,x,y,w,h,suit,rank){
  const pad=w*0.1;
  const cx=x+pad, cy=y+pad, cw=w-pad*2, ch=h-pad*2;
  if(suit==='wan')drawWan(ctx,cx,cy,cw,ch,rank);
  else if(suit==='tong')drawTong(ctx,cx,cy,cw,ch,rank);
  else if(suit==='tiao')drawTiao(ctx,cx,cy,cw,ch,rank);
}
