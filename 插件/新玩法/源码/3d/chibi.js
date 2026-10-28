// 🎨 内置捏人：用画布画一个 Q 版大头小人（正面 + 背面 + 每块属于哪个部位），再交给「图片变 3D」鼓成低模小人。
// 标签：1 头 2 身体 3 左手（角色自己的左手＝图上右边） 4 右手（图上左边） 5 左脚（图上右边） 6 右脚（图上左边）
export const CW = 256, CH = 320;
export const LOOK_DEF = {
  skin: '#ffe3cf', hair: '#3a3341', hairStyle: 'short', bangs: 'straight', ahoge: true,
  eyes: 'round', eyeColor: '#5b7bd6', blush: true, mouth: 'smile',
  top: 'shirt', topColor: '#ffffff', tie: '#e0455a', bottom: 'skirt', bottomColor: '#5b6b8c',
  socks: 'white', shoes: '#3b2f2f', acc: [], accColor: '#e0455a', hairLen: 1
};
export const LOOK_OPTS = {
  hairStyle: Object.keys(HAIR_STYLES).map(k => [k, HAIR_STYLES[k].n]),
  bangs: BANGS,
  eyes: [['round', '圆眼'], ['cat', '猫眼'], ['droopy', '下垂眼'], ['dot', '豆豆眼'], ['sharp', '凌厉眼']],
  mouth: [['smile', '微笑'], ['cat', 'ω 猫嘴'], ['o', '小 o 嘴'], ['flat', '一字嘴'], ['fang', '小虎牙']],
  top: [['shirt', '衬衫'], ['hoodie', '卫衣'], ['sweater', '毛衣'], ['jacket', '西装外套'], ['dress', '连衣裙'], ['tee', 'T恤'], ['sailor', '水手服']],
  bottom: [['skirt', '短裙'], ['shorts', '短裤'], ['pants', '长裤'], ['none', '（连衣裙不用）']],
  socks: [['white', '白短袜'], ['long', '长筒袜'], ['black', '黑丝'], ['none', '光腿']],
  acc: [['ribbon', '双蝴蝶结'], ['clip', '✕ 发夹'], ['cat', '猫耳'], ['bunny', '兔耳'], ['horn', '小恶魔角'], ['glasses', '眼镜'], ['halo', '光环'], ['flower', '小花'], ['hat', '贝雷帽'], ['bandaid', '创可贴']]
};
const OL = '#2a2230';
export const SQ = 256;   // 输出的方形画布
function shade(hex, k) { // k<0 变暗，k>0 变亮
  let c = String(hex || '#888').replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function P(ctx, fill, stroke, lw, path) { ctx.beginPath(); path(ctx); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); } }
const ell = (x, y, rx, ry, r0 = 0, r1 = Math.PI * 2) => c => c.ellipse(x, y, rx, ry, 0, r0, r1);
const K = 0.8, DX = (SQ - CW * K) / 2, DY = 4;   // 原来 256×320 的画法缩进 256×256 的方格里
function layer() { const c = document.createElement('canvas'); c.width = SQ; c.height = SQ; c.getContext('2d').setTransform(K, 0, 0, K, DX, DY); return c; }

// 头的位置
import { HX, HY, HRX, HRY, HAIR_STYLES, BANGS, hairBackLayer, hairFrontLayer, hairBackView } from './hair.js';
export { HAIR_STYLES };

function drawEars(c, L) {
  // 头两侧的小耳朵（被头发盖住大半）
  [-1, 1].forEach(k => P(c, L.skin, OL, 2, ell(HX + k * (HRX - 6), HY + 22, 9, 13)));
}
function drawHead(c, L) { P(c, L.skin, OL, 2.6, c => { c.ellipse(HX, HY + 4, HRX - 4, HRY - 6, 0, 0, Math.PI * 2); }); }
function drawFace(c, L, face, open) {
  const ex = 32, ey = HY + 26, sk = L.skin;
  const blushOn = L.blush || face === 'shy';
  if (blushOn) [-1, 1].forEach(k => { const g = c.createRadialGradient(HX + k * 46, ey + 22, 1, HX + k * 46, ey + 22, 16); g.addColorStop(0, face === 'shy' ? 'rgba(255,110,130,.75)' : 'rgba(255,140,150,.5)'); g.addColorStop(1, 'rgba(255,140,150,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(HX + k * 46, ey + 22, 18, 10, 0, 0, Math.PI * 2); c.fill(); if (face === 'shy') P(c, null, 'rgba(220,70,90,.7)', 1.4, c => { for (let i = 0; i < 3; i++) { c.moveTo(HX + k * 40 + i * 6 - 6, ey + 18); c.lineTo(HX + k * 40 + i * 6 - 9, ey + 26); } }); });
  const eye = (k) => {
    const x = HX + k * ex, y = ey;
    if (face === 'happy' || face === 'shy' && L.eyes !== 'dot') { P(c, null, OL, 3.2, c => { c.moveTo(x - 11, y + 3); c.quadraticCurveTo(x, y - 12, x + 11, y + 3); }); return; }
    if (face === 'closed') { P(c, null, OL, 3.2, c => { c.moveTo(x - 11, y - 1); c.quadraticCurveTo(x, y + 8, x + 11, y - 1); }); return; }
    if (L.eyes === 'dot') { P(c, OL, null, 0, ell(x, y, face === 'surprised' ? 6 : 5, face === 'surprised' ? 8 : 7)); P(c, '#fff', null, 0, ell(x + 1.5, y - 2.5, 1.6, 1.6)); return; }
    let rx = 12.5, ry = 16; if (L.eyes === 'cat' || L.eyes === 'sharp') { ry = 13; } if (face === 'surprised') { rx = 13.5; ry = 18; }
    // 眼白
    P(c, '#fff', null, 0, ell(x, y + 1, rx + 1, ry));
    // 虹膜
    const g = c.createLinearGradient(x, y - ry, x, y + ry); g.addColorStop(0, shade(L.eyeColor, -0.45)); g.addColorStop(0.55, L.eyeColor); g.addColorStop(1, shade(L.eyeColor, 0.45));
    const ir = face === 'surprised' ? 0.62 : 0.86;
    P(c, g, shade(L.eyeColor, -0.6), 1.2, ell(x, y + 2, rx * ir, ry * ir));
    P(c, shade(L.eyeColor, -0.65), null, 0, ell(x, y + 2, rx * ir * 0.45, ry * ir * 0.5));
    // 高光
    P(c, '#fff', null, 0, ell(x - k * 4, y - 5, 4.2, 5.2)); P(c, 'rgba(255,255,255,.85)', null, 0, ell(x + k * 4, y + 8, 2.2, 2.2));
    // 上眼线（睫毛）
    const tilt = L.eyes === 'cat' || L.eyes === 'sharp' ? 5 : L.eyes === 'droopy' ? -4 : 0;
    P(c, null, OL, 4, c => { c.moveTo(x - k * (rx + 2), y - ry * 0.55 - (k < 0 ? 0 : 0) + (tilt ? -tilt * 0 : 0) + (k > 0 ? -tilt : -tilt) * 0 + (tilt < 0 ? 4 : 0)); c.quadraticCurveTo(x, y - ry - 4, x + k * (rx + 3), y - ry * 0.45 - tilt); });
    if (face === 'angry') P(c, null, OL, 3, c => { c.moveTo(x - k * 14, y - ry - 2); c.lineTo(x + k * 12, y - ry - 12); });
    if (face === 'sad') { P(c, null, OL, 2.6, c => { c.moveTo(x - k * 13, y - ry - 12); c.lineTo(x + k * 12, y - ry - 4); }); P(c, 'rgba(120,190,255,.9)', '#4a8fd8', 1.2, c => { c.moveTo(x + k * 4, y + ry - 2); c.quadraticCurveTo(x + k * 10, y + ry + 12, x + k * 4, y + ry + 14); c.quadraticCurveTo(x - k * 2, y + ry + 12, x + k * 4, y + ry - 2); }); }
  };
  eye(-1); eye(1);
  // 嘴
  const mx = HX, my = ey + 26;
  if (open) { P(c, '#b8334a', OL, 2, c => { c.moveTo(mx - 7, my - 2); c.quadraticCurveTo(mx, my - 4, mx + 7, my - 2); c.quadraticCurveTo(mx + 6, my + 9, mx, my + 9); c.quadraticCurveTo(mx - 6, my + 9, mx - 7, my - 2); }); P(c, '#ff8a9a', null, 0, ell(mx, my + 5, 4, 2.6)); return; }
  if (face === 'surprised') { P(c, '#b8334a', OL, 2, ell(mx, my + 2, 4.5, 5.5)); return; }
  if (face === 'angry' || face === 'sad') { P(c, null, OL, 2.2, c => { c.moveTo(mx - 7, my + 4); c.quadraticCurveTo(mx, my - 3, mx + 7, my + 4); }); return; }
  if (face === 'shy') { P(c, null, OL, 2, c => { c.moveTo(mx - 8, my + 1); c.quadraticCurveTo(mx - 4, my - 3, mx, my + 1); c.quadraticCurveTo(mx + 4, my + 5, mx + 8, my + 1); }); return; }
  const m = L.mouth;
  if (m === 'cat') P(c, null, OL, 2.2, c => { c.moveTo(mx - 9, my - 1); c.quadraticCurveTo(mx - 4.5, my + 6, mx, my); c.quadraticCurveTo(mx + 4.5, my + 6, mx + 9, my - 1); });
  else if (m === 'o') P(c, '#c94a5e', OL, 1.8, ell(mx, my + 1, 3.5, 4));
  else if (m === 'flat') P(c, null, OL, 2.2, c => { c.moveTo(mx - 6, my + 1); c.lineTo(mx + 6, my + 1); });
  else { P(c, face === 'happy' ? '#c94a5e' : null, OL, 2.2, c => { c.moveTo(mx - 8, my - 1); c.quadraticCurveTo(mx, my + (face === 'happy' ? 10 : 6), mx + 8, my - 1); if (face === 'happy') c.closePath(); }); if (m === 'fang') P(c, '#fff', OL, 1.2, c => { c.moveTo(mx + 3, my); c.lineTo(mx + 5, my + 4.5); c.lineTo(mx + 7, my); }); }
}
function drawAcc(c, L, back) {
  const A = L.acc || [], ac = L.accColor || '#e0455a';
  if (A.includes('cat')) [-1, 1].forEach(k => { P(c, L.hair, OL, 2.4, c => { c.moveTo(HX + k * 30, HY - HRY + 4); c.lineTo(HX + k * 62, HY - HRY - 26); c.lineTo(HX + k * 66, HY - HRY + 22); c.closePath(); }); if (!back) P(c, '#ffb6c4', null, 0, c => { c.moveTo(HX + k * 40, HY - HRY + 6); c.lineTo(HX + k * 60, HY - HRY - 14); c.lineTo(HX + k * 60, HY - HRY + 14); c.closePath(); }); });
  if (A.includes('bunny')) [-1, 1].forEach(k => { P(c, '#fff', OL, 2.4, ell(HX + k * 26, HY - HRY - 34, 13, 38)); if (!back) P(c, '#ffc2cf', null, 0, ell(HX + k * 26, HY - HRY - 32, 6, 28)); });
  if (A.includes('horn')) [-1, 1].forEach(k => P(c, ac === '#e0455a' ? '#7a4bd6' : ac, OL, 2.2, c => { c.moveTo(HX + k * 26, HY - HRY + 2); c.quadraticCurveTo(HX + k * 44, HY - HRY - 18, HX + k * 34, HY - HRY - 34); c.quadraticCurveTo(HX + k * 30, HY - HRY - 10, HX + k * 12, HY - HRY + 6); c.closePath(); }));
  if (A.includes('halo')) P(c, null, '#ffd84a', 5, ell(HX, HY - HRY - 22, 40, 9));
  if (A.includes('hat')) { P(c, ac, OL, 2.4, ell(HX + 10, HY - HRY + 6, HRX - 6, 22)); P(c, OL, null, 0, ell(HX + 14, HY - HRY - 14, 4, 4)); }
  if (A.includes('ribbon')) [-1, 1].forEach(k => { const x = HX + k * (HRX - 2), y = HY - 26; P(c, ac, OL, 2, c => { c.moveTo(x, y); c.lineTo(x + k * 22, y - 18); c.lineTo(x + k * 24, y + 10); c.closePath(); c.moveTo(x, y); c.lineTo(x - k * 18, y - 16); c.lineTo(x - k * 20, y + 10); c.closePath(); }); P(c, ac, OL, 2, c => { c.moveTo(x, y); c.lineTo(x + k * 10, y + 40); c.lineTo(x + k * 2, y + 36); c.lineTo(x - k * 6, y + 42); c.closePath(); }); P(c, shade(ac, -0.2), OL, 2, ell(x, y, 5, 5)); });
  if (back) return;
  if (A.includes('clip')) P(c, null, '#f2f2f2', 5, c => { const x = HX + 40, y = HY - 30; c.moveTo(x - 8, y - 8); c.lineTo(x + 8, y + 8); c.moveTo(x + 8, y - 8); c.lineTo(x - 8, y + 8); });
  if (A.includes('flower')) { const x = HX - 50, y = HY - 34; for (let i = 0; i < 5; i++) P(c, ac === '#e0455a' ? '#ff9fb4' : ac, OL, 1.4, ell(x + Math.cos(i * 1.256) * 7, y + Math.sin(i * 1.256) * 7, 6, 6)); P(c, '#ffd84a', OL, 1.2, ell(x, y, 4, 4)); }
  if (A.includes('glasses')) { const ey = HY + 26; P(c, 'rgba(255,255,255,.15)', '#3a3a48', 2.6, c => { c.roundRect(HX - 52, ey - 14, 38, 28, 8); c.moveTo(HX + 14 + 38, ey); c.roundRect(HX + 14, ey - 14, 38, 28, 8); }); P(c, null, '#3a3a48', 2.6, c => { c.moveTo(HX - 14, ey - 2); c.lineTo(HX + 14, ey - 2); }); }
  if (A.includes('bandaid')) { P(c, '#f6c99a', '#c8996a', 1.4, c => { c.save(); c.translate(HX + 44, HY + 54); c.rotate(-0.4); c.roundRect(-11, -4, 22, 8, 3); c.restore(); }); }
}
function drawBody(c, L, back) {
  const t = L.top, col = L.topColor, dk = shade(col, -0.2), sk = L.skin;
  const y0 = 166, y1 = 232;
  // 脖子
  P(c, shade(sk, -0.08), OL, 2, c => c.rect(HX - 9, y0 - 12, 18, 16));
  if (t === 'dress') {
    P(c, col, OL, 2.4, c => { c.moveTo(HX - 26, y0); c.lineTo(HX + 26, y0); c.lineTo(HX + 46, y1 + 14); c.quadraticCurveTo(HX, y1 + 22, HX - 46, y1 + 14); c.closePath(); });
    if (!back) P(c, null, dk, 1.6, c => { c.moveTo(HX - 30, y1 - 4); c.quadraticCurveTo(HX, y1 + 2, HX + 30, y1 - 4); });
  } else {
    P(c, col, OL, 2.4, c => { c.moveTo(HX - 26, y0); c.lineTo(HX + 26, y0); c.lineTo(HX + 30, y1 - 8); c.lineTo(HX - 30, y1 - 8); c.closePath(); });
    if (t === 'hoodie') { P(c, dk, OL, 2, c => { c.moveTo(HX - 26, y0); c.quadraticCurveTo(HX, y0 + (back ? 30 : 12), HX + 26, y0); c.quadraticCurveTo(HX, y0 - 8, HX - 26, y0); }); if (!back) { P(c, null, OL, 1.6, c => { c.moveTo(HX - 6, y0 + 10); c.lineTo(HX - 8, y0 + 30); c.moveTo(HX + 6, y0 + 10); c.lineTo(HX + 8, y0 + 30); }); P(c, dk, OL, 1.6, c => c.roundRect(HX - 18, y1 - 30, 36, 16, 5)); } }
    if (t === 'sweater') P(c, null, dk, 1.4, c => { for (let x = -22; x <= 22; x += 7) { c.moveTo(HX + x, y0 + 6); c.lineTo(HX + x * 1.1, y1 - 10); } });
    if (t === 'jacket' && !back) { P(c, '#fff', null, 0, c => { c.moveTo(HX - 10, y0); c.lineTo(HX + 10, y0); c.lineTo(HX, y1 - 10); c.closePath(); }); P(c, null, OL, 2, c => { c.moveTo(HX - 12, y0); c.lineTo(HX - 2, y1 - 9); c.moveTo(HX + 12, y0); c.lineTo(HX + 2, y1 - 9); }); P(c, OL, null, 0, c => { c.arc(HX - 6, y1 - 22, 2, 0, 7); }); }
    if (t === 'sailor') { P(c, L.tie ? shade(L.tie, -0.1) : '#2d3c6a', OL, 2, c => { c.moveTo(HX - 28, y0 - 2); c.lineTo(HX + 28, y0 - 2); c.lineTo(HX + 22, y0 + (back ? 26 : 10)); c.lineTo(HX, y0 + (back ? 26 : 26)); c.lineTo(HX - 22, y0 + (back ? 26 : 10)); c.closePath(); }); }
    if (t === 'tee' && !back) P(c, shade(col, -0.35), null, 0, c => { c.arc(HX, y0 + 18, 7, 0, 7); });
  }
  if (!back && (t === 'shirt' || t === 'sailor' || t === 'dress' || t === 'jacket')) {
    if (t !== 'sailor') P(c, '#fff', OL, 1.8, c => { c.moveTo(HX - 12, y0 - 2); c.lineTo(HX, y0 + 9); c.lineTo(HX + 12, y0 - 2); c.lineTo(HX, y0 + 2); c.closePath(); });
    if (L.tie) P(c, L.tie, OL, 1.8, c => { c.moveTo(HX, y0 + 7); c.lineTo(HX - 11, y0 + 1); c.lineTo(HX - 11, y0 + 13); c.closePath(); c.moveTo(HX, y0 + 7); c.lineTo(HX + 11, y0 + 1); c.lineTo(HX + 11, y0 + 13); c.closePath(); c.moveTo(HX, y0 + 7); c.lineTo(HX - 5, y0 + 22); c.lineTo(HX + 5, y0 + 22); c.closePath(); });
  }
}
function drawBottom(c, L) {
  const b = L.bottom, col = L.bottomColor, y = 222;
  if (L.top === 'dress' || b === 'none') return;
  if (b === 'skirt') { P(c, col, OL, 2.4, c => { c.moveTo(HX - 30, y); c.lineTo(HX + 30, y); c.lineTo(HX + 42, y + 26); c.quadraticCurveTo(HX, y + 32, HX - 42, y + 26); c.closePath(); }); P(c, null, shade(col, -0.25), 1.6, c => { for (let i = -2; i <= 2; i++) { c.moveTo(HX + i * 12, y + 2); c.lineTo(HX + i * 16, y + 27); } }); }
  if (b === 'shorts') P(c, col, OL, 2.4, c => { c.moveTo(HX - 30, y); c.lineTo(HX + 30, y); c.lineTo(HX + 32, y + 22); c.lineTo(HX + 3, y + 22); c.lineTo(HX, y + 10); c.lineTo(HX - 3, y + 22); c.lineTo(HX - 32, y + 22); c.closePath(); });
}
function drawArm(c, L, k, back) {
  // k=-1 图上左边（角色的右手），k=1 图上右边（角色的左手）
  const sx = HX + k * 26, sy = 170, hx = HX + k * 48, hy = 222;
  const sleeve = L.top === 'tee' || L.top === 'dress' ? 0.45 : 1;
  const col = L.topColor;
  P(c, L.skin, OL, 2.2, c => { c.moveTo(sx - k * 2, sy); c.lineTo(sx + k * 10, sy + 2); c.lineTo(hx + k * 8, hy - 4); c.lineTo(hx - k * 8, hy); c.closePath(); });
  P(c, col, OL, 2.2, c => { const ex = sx + (hx - sx) * sleeve, ey = sy + (hy - sy) * sleeve; c.moveTo(sx - k * 4, sy - 4); c.lineTo(sx + k * 12, sy); c.lineTo(ex + k * 9, ey - 2); c.lineTo(ex - k * 9, ey + 2); c.closePath(); });
  P(c, L.skin, OL, 2.2, ell(hx, hy + 2, 9, 9));
}
function drawLeg(c, L, k) {
  const x = HX + k * 13, y0 = 236, y1 = 290;
  const sk = L.skin, so = L.socks;
  P(c, so === 'black' ? '#2b2b33' : sk, OL, 2.2, c => c.roundRect(x - 8, y0, 16, y1 - y0, 4));
  if (so === 'white') P(c, '#fff', OL, 2, c => c.rect(x - 8, y1 - 16, 16, 14));
  if (so === 'long') P(c, '#fff', OL, 2, c => c.rect(x - 8, y0 + 18, 16, y1 - y0 - 18));
  if (L.bottom === 'pants' && L.top !== 'dress') P(c, L.bottomColor, OL, 2.2, c => { c.moveTo(x - 10, y0 - 14); c.lineTo(x + 10, y0 - 14); c.lineTo(x + 9, y1 - 6); c.lineTo(x - 9, y1 - 6); c.closePath(); });
  P(c, L.shoes, OL, 2.2, c => { c.ellipse(x + k * 2, y1 + 4, 12, 8, 0, 0, Math.PI * 2); });
  P(c, 'rgba(255,255,255,.35)', null, 0, ell(x + k * 2 - 4, y1 + 1, 4, 2));
}
function drawPants(c, L) { if (L.bottom === 'pants' && L.top !== 'dress') P(c, L.bottomColor, OL, 2.4, c => { c.moveTo(HX - 30, 222); c.lineTo(HX + 30, 222); c.lineTo(HX + 26, 238); c.lineTo(HX - 26, 238); c.closePath(); }); }

// 画一张：view 'front' | 'back'，face 表情，open 张嘴。返回 {canvas, labels, N}（labels：1 头 2 身体 3 左手 4 右手 5 左脚 6 右脚 7 头发）
export function drawChibi(look, view = 'front', face = 'normal', open = false) {
  const L = Object.assign({}, LOOK_DEF, look || {}); L.acc = Array.isArray(L.acc) ? L.acc : [];
  const st = HAIR_STYLES[L.hairStyle] || HAIR_STYLES.short;
  const back = view === 'back';
  const lay = { hairBack: layer(), legR: layer(), legL: layer(), body: layer(), armR: layer(), armL: layer(), head: layer(), hairFront: layer() };
  const g = k => lay[k].getContext('2d');
  drawLeg(g('legR'), L, -1); drawLeg(g('legL'), L, 1);
  drawBottom(g('body'), L); drawPants(g('body'), L); drawBody(g('body'), L, back);
  drawArm(g('armR'), L, -1, back); drawArm(g('armL'), L, 1, back);
  if (!back) { hairBackLayer(g('hairBack'), L, st); drawEars(g('head'), L); drawHead(g('head'), L); drawFace(g('head'), L, face, open); hairFrontLayer(g('hairFront'), L, st); drawAcc(g('hairFront'), L, false); }
  else { drawEars(g('head'), L); drawHead(g('head'), L); hairBackView(g('hairFront'), L, st); drawAcc(g('hairFront'), L, true); }
  const out = document.createElement('canvas'); out.width = SQ; out.height = SQ; const o = out.getContext('2d');
  const order = back ? ['legR', 'legL', 'armR', 'armL', 'body', 'head', 'hairBack', 'hairFront'] : ['hairBack', 'legR', 'legL', 'body', 'armR', 'armL', 'head', 'hairFront'];
  order.forEach(k => o.drawImage(lay[k], 0, 0));
  const labels = new Uint8Array(SQ * SQ);
  if (!back) { const ID = { hairBack: 7, head: 1, hairFront: 7, body: 2, armL: 3, armR: 4, legL: 5, legR: 6 }; order.forEach(k => { const d = g(k).getImageData(0, 0, SQ, SQ).data; for (let i = 0; i < SQ * SQ; i++) if (d[i * 4 + 3] > 60) labels[i] = ID[k]; }); }
  return { canvas: out, labels, N: SQ, W: SQ, H: SQ };
}
