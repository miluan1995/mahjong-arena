// Canvas 渲染器 v2 — SVG 牌面 + 点击碰撞检测 + 操作按钮
import { getTileImage, getBackImage, isLoaded } from './tiles.js';

const TW = 48, TH = 66, TR = 4, GAP = 4;
const COL = {
  tableBg1: '#0d3320', tableBg2: '#081a12',
  tagActive: 'rgba(255,215,0,0.8)', tagInactive: 'rgba(0,0,0,0.55)',
  text: '#ecf0f1', hud: 'rgba(0,0,0,0.65)', accent: '#ffd700',
  hlBorder: '#ffd700', selectGlow: 'rgba(255,215,0,0.6)',
  tileBg: '#e8e0cc', tileBack: '#1a3a2a',
};

// 存储底部手牌的点击区域
let bottomTileHitboxes = [];

export function getBottomTileHitboxes() { return bottomTileHitboxes; }

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawTile(ctx, x, y, suit, rank, opts = {}) {
  const { scale = 1, faceDown = false, hl = false, selected = false, rot = 0 } = opts;
  const w = TW * scale, h = TH * scale;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (rot) ctx.rotate(rot);
  ctx.translate(-w / 2, -h / 2);

  // 选中时上移
  const yOff = selected ? -8 * scale : 0;

  // 阴影
  ctx.shadowColor = hl ? COL.selectGlow : 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = hl ? 8 * scale : 3 * scale;
  ctx.shadowOffsetY = 2;

  // 底座
  rr(ctx, 0, yOff, w, h, TR * scale);
  if (faceDown) {
    ctx.fillStyle = COL.tileBack; ctx.fill();
    ctx.strokeStyle = '#2a5a3a'; ctx.lineWidth = 0.8; ctx.stroke();
  } else {
    ctx.fillStyle = COL.tileBg; ctx.fill();
    if (hl || selected) {
      ctx.strokeStyle = COL.hlBorder; ctx.lineWidth = 2 * scale;
    } else {
      ctx.strokeStyle = '#bbb'; ctx.lineWidth = 0.6;
    }
    ctx.stroke();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // SVG 牌面
    const img = suit && rank ? getTileImage(suit, rank) : null;
    if (img) {
      const pad = 3 * scale;
      const iw = w - pad * 2, ih = h - pad * 2;
      ctx.drawImage(img, pad, yOff + pad, iw, ih);
    }
  }

  ctx.restore();
}

function drawTag(ctx, x, y, name, active, emoji) {
  const pw = ctx.measureText(name).width + 36;
  rr(ctx, x - pw / 2, y - 14, pw, 28, 14);
  ctx.fillStyle = active ? COL.tagActive : COL.tagInactive; ctx.fill();
  ctx.fillStyle = active ? '#000' : COL.text;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, x, y);
}

function drawDiscardsH(ctx, dc, baseX, baseY, scale = 0.45) {
  const sw = TW * scale + 2, maxR = 9;
  for (let i = 0; i < dc.length; i++) {
    const row = i / maxR | 0, col = i % maxR;
    const rl = Math.min(maxR, dc.length - row * maxR);
    const rx = baseX - rl * sw / 2;
    drawTile(ctx, rx + col * sw, baseY + row * (TH * scale + 2), dc[i].suit, dc[i].rank, { scale });
  }
}

function drawMeldH(ctx, x, y, melds, scale = 0.5) {
  let ox = 0;
  for (const m of melds) {
    for (let i = 0; i < m.tiles.length; i++) {
      drawTile(ctx, x + ox, y, m.tiles[i].suit, m.tiles[i].rank, { scale });
      ox += TW * scale + 2;
    }
    ox += 6;
  }
  return ox;
}

function drawDiscardsV(ctx, dc, baseX, baseY, scale = 0.4, dir = 1) {
  const sh = TW * scale + 2, maxC = 7;
  for (let i = 0; i < dc.length; i++) {
    const col = i / maxC | 0, row = i % maxC;
    const cl = Math.min(maxC, dc.length - col * maxC);
    const ry = baseY - cl * sh / 2 + row * sh;
    const rx = baseX + dir * col * (TH * scale + 3);
    drawTile(ctx, rx, ry, dc[i].suit, dc[i].rank, { scale, rot: dir * Math.PI / 2 });
  }
}

export function renderGame(canvas, g, opts = {}) {
  if (!canvas || !g) return;
  const { selectedTileId = null } = opts;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth;
  const H = canvas.parentElement.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 等 SVG 加载
  if (!isLoaded()) {
    ctx.fillStyle = '#0d3320'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('加载牌面中...', W / 2, H / 2);
    return;
  }

  const cx = W / 2, cy = H / 2;
  bottomTileHitboxes = [];

  // 桌面
  const gr = ctx.createRadialGradient(cx, cy, 50, cx, cy, Math.max(W, H) * 0.7);
  gr.addColorStop(0, COL.tableBg1); gr.addColorStop(1, COL.tableBg2);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);

  // 中心区域指示
  rr(ctx, cx - 80, cy - 60, 160, 120, 8);
  ctx.strokeStyle = 'rgba(255,215,0,0.1)'; ctx.lineWidth = 1; ctx.stroke();

  const ps = g.players;

  // 底部 (seat 0) — 玩家手牌（明牌 + 可点击）
  {
    const p = ps[0], hand = p.hand;
    const isHuman = p.isHuman;
    const tw = hand.length * (TW + GAP) - GAP;
    let mw = 0; for (const m of p.melds) mw += m.tiles.length * (TW * 0.5 + 2) + 6;
    const total = tw + (mw > 0 ? 12 + mw : 0);
    const sx = cx - total / 2, y = H - TH - 32;

    // 名牌
    drawTag(ctx, cx, y - 20, `${p.emoji} ${p.name}`, g.current === 0 && !p.isOut);

    // 手牌
    for (let i = 0; i < hand.length; i++) {
      const tx = sx + i * (TW + GAP);
      const isSel = selectedTileId && hand[i].id === selectedTileId;
      const isDrawn = g.drawnTile && hand[i].id === g.drawnTile.id;
      drawTile(ctx, tx, y, hand[i].suit, hand[i].rank, {
        hl: isDrawn, selected: isSel,
      });
      bottomTileHitboxes.push({ x: tx, y: isSel ? y - 8 : y, w: TW, h: TH, tileId: hand[i].id });
    }

    // 副露
    if (mw > 0) drawMeldH(ctx, sx + tw + 12, y + TH * 0.2, p.melds, 0.5);

    // 弃牌
    const discRows = Math.ceil(p.discards.length / 9);
    drawDiscardsH(ctx, p.discards, cx, y - 26 - discRows * (TH * 0.45 + 2), 0.45);

    if (p.isOut) {
      ctx.fillStyle = 'rgba(0,230,118,0.9)'; ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('✅ 已胡', cx, y + TH / 2);
    }
  }

  // 上方 (seat 2)
  {
    const p = ps[2], hand = p.hand, sc = 0.56;
    const tw = hand.length * (TW * sc + 2);
    let mw = 0; for (const m of p.melds) mw += m.tiles.length * (TW * 0.45 + 2) + 6;
    const total = tw + (mw > 0 ? 10 + mw : 0);
    const sx = cx - total / 2, y = 20;
    for (let i = 0; i < hand.length; i++) drawTile(ctx, sx + i * (TW * sc + 2), y, null, null, { scale: sc, faceDown: true });
    if (mw > 0) drawMeldH(ctx, sx + tw + 10, y + TH * sc * 0.15, p.melds, 0.45);
    drawTag(ctx, cx, y + TH * sc + 16, `${p.emoji} ${p.name}`, g.current === 2 && !p.isOut);
    drawDiscardsH(ctx, p.discards, cx, y + TH * sc + 34, 0.4);
    if (p.isOut) { ctx.fillStyle = 'rgba(0,230,118,0.9)'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✅ 已胡', cx, y + TH * sc / 2); }
  }

  // 右侧 (seat 1)
  {
    const p = ps[1], hand = p.hand, sc = 0.5;
    const ts = TW * sc + 2, hh = hand.length * ts;
    const x = W - TH * sc - 30, sy = cy - hh / 2;
    for (let i = 0; i < hand.length; i++) drawTile(ctx, x, sy + i * ts, null, null, { scale: sc, faceDown: true, rot: Math.PI / 2 });
    drawTag(ctx, x - 14, sy - 22, `${p.emoji} ${p.name}`, g.current === 1 && !p.isOut);
    drawDiscardsV(ctx, p.discards, x - TH * sc - 20, cy, 0.38, -1);
    if (p.isOut) { ctx.save(); ctx.translate(x + TH * sc / 2, cy); ctx.rotate(Math.PI / 2); ctx.fillStyle = 'rgba(0,230,118,0.9)'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✅ 已胡', 0, 0); ctx.restore(); }
  }

  // 左侧 (seat 3)
  {
    const p = ps[3], hand = p.hand, sc = 0.5;
    const ts = TW * sc + 2, hh = hand.length * ts;
    const x = 30, sy = cy - hh / 2;
    for (let i = 0; i < hand.length; i++) drawTile(ctx, x, sy + i * ts, null, null, { scale: sc, faceDown: true, rot: -Math.PI / 2 });
    drawTag(ctx, x + TH * sc + 14, sy - 22, `${p.emoji} ${p.name}`, g.current === 3 && !p.isOut);
    drawDiscardsV(ctx, p.discards, x + TH * sc + 20, cy, 0.38, 1);
    if (p.isOut) { ctx.save(); ctx.translate(x + TH * sc / 2, cy); ctx.rotate(-Math.PI / 2); ctx.fillStyle = 'rgba(0,230,118,0.9)'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✅ 已胡', 0, 0); ctx.restore(); }
  }

  // 中心 HUD
  rr(ctx, cx - 50, cy - 24, 100, 48, 10);
  ctx.fillStyle = COL.hud; ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = COL.accent; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`余 ${g.wall.length}`, cx, cy - 6);
  ctx.fillStyle = '#aaa'; ctx.font = '12px sans-serif';
  ctx.fillText(`第 ${g.turn} 手`, cx, cy + 12);

  // 等待人类操作指示
  if (g.waitingFor) {
    const w = g.waitingFor;
    let hint = '';
    if (w.type === 'discard') hint = '👆 点击手牌出牌';
    else if (w.type === 'afterdraw') hint = '选择操作：胡/杠/出牌';
    else if (w.type === 'respond') hint = '选择操作：碰/杠/胡/过';
    if (hint) {
      ctx.fillStyle = 'rgba(255,215,0,0.15)';
      rr(ctx, cx - 120, H - TH - 110, 240, 30, 15); ctx.fill();
      ctx.fillStyle = COL.accent; ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(hint, cx, H - TH - 95);
    }
  }

  // 气泡
  if (g.bubble && Date.now() - g.bubble.time < 2500) {
    const b = g.bubble;
    const positions = [
      { x: cx, y: H - TH - 130 }, { x: W - 90, y: cy },
      { x: cx, y: 130 }, { x: 90, y: cy }
    ];
    const pos = positions[b.seat];
    if (pos) {
      ctx.font = 'bold 13px sans-serif';
      const tw2 = ctx.measureText(b.text).width;
      rr(ctx, pos.x - tw2 / 2 - 14, pos.y - 16, tw2 + 28, 32, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,0,0.3)'; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.text, pos.x, pos.y);
    }
  }
}
