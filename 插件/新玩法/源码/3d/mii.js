// 🙂 「朋友收集」风的圆润小人：大圆头 + 胶囊身子 + 短短的手脚，表情画在脸上，头发是一顶平滑的「发帽」。
// 不走「图片鼓起来」那条路，直接按捏人的选项（发型 / 刘海 / 颜色 / 衣服 / 配饰）用几何体搭出来。
// 骨头和低模小人一样：root / body / head / armL / armR / legL / legR，高 1、脚底在 0、朝 +z。
import * as THREE from 'three';
import { lpMaterial } from './lowpoly.js';
import { HAIR_STYLES } from './hair.js';

const OL = '#2a2230';
function shade(hex, k) { let c = String(hex || '#888').replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c, 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const saw = x => { const f = x - Math.floor(x); return Math.abs(f * 2 - 1) * 2 - 1; };   // -1..1 三角波

// ---------- 脸（画在一张方图上，从正面投影到头上）----------
export function drawMiiFace(L, face = 'normal', open = 0) {
  const S = 512, c = cvs(S, S), x = c.getContext('2d');
  x.fillStyle = L.skin; x.fillRect(0, 0, S, S);
  const P = (fill, stroke, lw, path) => { x.beginPath(); path(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(); } };
  const E = (cx, cy, rx, ry) => () => x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  const ex = 96, ey = 278, my = 362, Z = 1.75;   // Z：五官放大
  // 腮红
  if (L.blush || face === 'shy') [-1, 1].forEach(k => { const g = x.createRadialGradient(256 + k * 128, 312, 2, 256 + k * 128, 312, 40); g.addColorStop(0, face === 'shy' ? 'rgba(255,105,125,.75)' : 'rgba(255,140,150,.45)'); g.addColorStop(1, 'rgba(255,140,150,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(256 + k * 128, 312, 44, 24, 0, 0, Math.PI * 2); x.fill(); });
  // 眼睛
  [-1, 1].forEach(k => {
    const cx = 256 + k * ex, cy = ey;
    if (face === 'closed') { P(null, OL, 7, () => { x.moveTo(cx - 30, cy); x.quadraticCurveTo(cx, cy + 18, cx + 30, cy); }); }
    else if (face === 'happy' || (face === 'shy' && L.eyes !== 'dot')) { P(null, OL, 7, () => { x.moveTo(cx - 30, cy + 8); x.quadraticCurveTo(cx, cy - 26, cx + 30, cy + 8); }); }
    else if (L.eyes === 'dot') { const r = face === 'surprised' ? 19 : 15; P(OL, null, 0, E(cx, cy, r, r * 1.25)); P('#fff', null, 0, E(cx + 4, cy - 6, 4, 4)); }
    else {
      let rx = 20 * Z, ry = 28 * Z; if (L.eyes === 'cat' || L.eyes === 'sharp') ry = 23 * Z; if (face === 'surprised') { rx = 23 * Z; ry = 32 * Z; }
      P('#fff', OL, 4, E(cx, cy, rx, ry));
      const ir = face === 'surprised' ? 0.55 : 0.82;
      P(L.eyeColor || '#5b7bd6', null, 0, E(cx, cy + ry * 0.12, rx * ir, ry * ir));
      P('#1c1726', null, 0, E(cx, cy + ry * 0.16, rx * ir * 0.5, ry * ir * 0.5));
      P('#fff', null, 0, E(cx + rx * 0.3, cy - ry * 0.3, rx * 0.28, ry * 0.22));
      // 眼皮（上眼线）
      P(null, OL, 6, () => { if (L.eyes === 'cat' || L.eyes === 'sharp') { x.moveTo(cx - k * rx * 1.1, cy - ry * 0.3); x.quadraticCurveTo(cx, cy - ry * 1.1, cx + k * rx * 1.25, cy - ry * 0.75); } else if (L.eyes === 'droopy') { x.moveTo(cx - k * rx * 1.05, cy - ry * 0.85); x.quadraticCurveTo(cx, cy - ry * 1.15, cx + k * rx * 1.15, cy - ry * 0.2); } else { x.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92); } });
    }
    // 眉毛
    const by = ey - 80, lw = 10;
    if (face === 'angry') P(null, OL, lw, () => { x.moveTo(cx - k * 24, by - 10); x.lineTo(cx + k * 20, by + 8); });
    else if (face === 'sad' || face === 'shy') P(null, OL, lw, () => { x.moveTo(cx - k * 22, by + 6); x.lineTo(cx + k * 20, by - 8); });
    else if (face === 'surprised') P(null, OL, lw, () => { x.moveTo(cx - 20, by - 8); x.quadraticCurveTo(cx, by - 20, cx + 20, by - 8); });
    else P(null, OL, lw, () => { x.moveTo(cx - 26, by); x.quadraticCurveTo(cx, by - 11, cx + 26, by); });
    if (face === 'sad') P('rgba(120,190,255,.9)', '#4a8fd8', 2, () => { x.moveTo(cx + k * 10, cy + 30); x.quadraticCurveTo(cx + k * 22, cy + 52, cx + k * 10, cy + 58); x.quadraticCurveTo(cx - k * 2, cy + 52, cx + k * 10, cy + 30); });
  });
  // 鼻子 / 嘴（放大一点）
  x.save(); x.translate(256, 330); x.scale(1.45, 1.45); x.translate(-256, -330);
  P(null, shade(L.skin, -0.25), 4, () => { x.moveTo(250, 300); x.quadraticCurveTo(256, 307, 262, 300); });
  // 嘴
  const m = L.mouth || 'smile';
  if (open) P('#b8334a', OL, 4.5, E(256, my + 4, 15, 13 + 4 * open));
  else if (face === 'surprised') P('#b8334a', OL, 4.5, E(256, my + 4, 10, 13));
  else if (face === 'angry' || face === 'sad') P(null, OL, 5, () => { x.moveTo(240, my + 8); x.quadraticCurveTo(256, my - 6, 272, my + 8); });
  else if (face === 'shy') P(null, OL, 4.5, () => { x.moveTo(238, my); x.quadraticCurveTo(247, my - 8, 256, my); x.quadraticCurveTo(265, my + 8, 274, my); });
  else if (face === 'happy') P('#c94a5e', OL, 4.5, () => { x.moveTo(236, my - 2); x.quadraticCurveTo(256, my + 26, 276, my - 2); x.closePath(); });
  else if (m === 'cat') P(null, OL, 4.5, () => { x.moveTo(236, my - 2); x.quadraticCurveTo(246, my + 10, 256, my); x.quadraticCurveTo(266, my + 10, 276, my - 2); });
  else if (m === 'o') P('#b8334a', OL, 4, E(256, my + 2, 8, 9));
  else if (m === 'flat') P(null, OL, 5, () => { x.moveTo(242, my + 2); x.lineTo(270, my + 2); });
  else { P(null, OL, 5, () => { x.moveTo(238, my - 2); x.quadraticCurveTo(256, my + 14, 274, my - 2); }); if (m === 'fang') P('#fff', OL, 2.5, () => { x.moveTo(262, my + 3); x.lineTo(266, my + 12); x.lineTo(270, my + 2); }); }
  x.restore();
  const acc = L.acc || [];
  if (acc.includes('glasses')) [-1, 1].forEach(k => { P(null, '#3a3346', 6, E(256 + k * ex, ey, 52, 46)); if (k > 0) P(null, '#3a3346', 5, () => { x.moveTo(256 - ex + 52, ey - 4); x.quadraticCurveTo(256, ey - 14, 256 + ex - 52, ey - 4); }); });
  if (acc.includes('bandaid')) { x.save(); x.translate(256 + 120, 318); x.rotate(-0.4); P('#f3c9a0', '#c99a72', 2, () => x.roundRect(-26, -10, 52, 20, 8)); P('#e7b48a', null, 0, () => x.rect(-8, -8, 16, 16)); x.restore(); }
  return c;
}

// ---------- 小工具 ----------
function solidTex(color) { const c = cvs(4, 4), x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 4, 4); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
// 竖着的「车削」体：prof = [[半径, y], ...] 从上到下；color 可以是颜色或 (v)=>颜色 的贴图
function lathe(prof, segs = 28) { const pts = prof.slice().reverse().map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)); return new THREE.LatheGeometry(pts, segs, Math.PI, Math.PI * 2); }
function bandTex(bands) { // bands: [[v0, v1, color]]，v 从 0（第一点）到 1（最后一点）
  const c = cvs(4, 128), x = c.getContext('2d'); bands.forEach(([a, b, col]) => { x.fillStyle = col; x.fillRect(0, Math.floor(a * 128), 4, Math.ceil((b - a) * 128) + 1); }); return canvasTex(c);
}
// 圆头圆尾的四肢：从 0 往下 len，上粗 r0 下细 r1
function limbProf(r0, r1, len, n = 10) { const P = [[0, r0 * 0.6]]; for (let i = 0; i <= 4; i++) { const a = i / 4 * Math.PI / 2; P.push([r0 * Math.sin(a), r0 * 0.6 * Math.cos(a)]); } for (let i = 1; i < n; i++) { const t = i / n; P.push([r0 + (r1 - r0) * t, -len * t]); } for (let i = 0; i <= 4; i++) { const a = i / 4 * Math.PI / 2; P.push([r1 * Math.cos(a), -len - r1 * 0.8 * Math.sin(a)]); } return P; }

// ---------- 头发 ----------
// 发帽：每个方位角一列，从头顶一直铺到「发际线」那一圈（发际线的高度随方位角变：前面是刘海、两边是鬓角、后面是后脑），
// 长发再从那一圈直直地垂下来。这样边缘是平滑的一条线，不会锯齿。
function hairLine(st, bangs, a) {
  const u = a / (Math.PI / 4), au = Math.abs(a), deg = au * 180 / Math.PI;
  let fr;
  switch (bangs) {
    case 'long': fr = 0.12; break;
    case 'parted': fr = 0.64 - 0.34 * Math.min(1, Math.abs(u)); break;
    case 'curtain': fr = 0.56 - 0.26 * Math.min(1, Math.abs(u)); break;
    case 'side': fr = 0.58 - 0.3 * clamp((u + 1) / 2, 0, 1); break;
    case 'messy': fr = 0.3 + 0.07 * saw(u * 3.5); break;
    case 'airy': fr = 0.4 + 0.05 * saw(u * 4.5); break;
    case 'none': fr = 0.74; break;
    default: fr = 0.3;
  }
  const side = st.side || 0, back = st.back || 0;
  let sd = side ? 0.22 - side / 74 * 0.75 : 0.32, bk = back ? -0.3 - back / 74 * 0.8 : 0.2;
  if (st.cap === 'buzz') { fr = Math.max(fr, 0.52); sd = 0.2; bk = -0.35; }
  sd = Math.max(sd, -0.8); bk = Math.max(bk, -0.78);
  let y;
  if (deg <= 42) y = fr;
  else if (deg <= 72) y = fr + (sd - fr) * smooth(42, 72, deg);
  else if (deg <= 105) y = sd;
  else if (deg <= 150) y = sd + (bk - sd) * smooth(105, 150, deg);
  else y = bk;
  if (st.cap === 'fluffy' || st.cap === 'spiky') y += (deg > 42 ? 0.06 : 0.03) * saw(a * 4.5);
  if (st.sideCut && deg > 55 && deg < 100) y = Math.min(y, -0.15);   // 公主切：两边一刀齐
  return clamp(y, -0.97, 0.95);
}
function hairDrop(st, a) {   // 发际线以下还要垂多长（头半径为单位）
  const deg = Math.abs(a) * 180 / Math.PI, side = st.side || 0, back = st.back || 0;
  const sd = side >= 80 ? (side - 60) / 40 : 0, bk = back > 70 ? (back - 50) / 60 : 0;
  if (deg <= 50) return 0;
  if (deg <= 80) return sd * smooth(50, 80, deg);
  if (deg <= 110) return sd;
  if (deg <= 145) return sd + (bk - sd) * smooth(110, 145, deg);
  return bk;
}
function hairCap(st, bangs, R, opt) {
  const A = 96, M = 16, K = 10, bw = st.bw || 1, rad = st.cap === 'buzz' ? 1.03 : 1.075;
  const pos = [], idx = [], cols = A + 1;
  const anyDrop = [...Array(A + 1)].some((_, i) => hairDrop(st, -Math.PI + i / A * Math.PI * 2) > 0.01);
  const rows = M + 1 + (anyDrop ? K : 0);
  for (let i = 0; i <= A; i++) {
    const a = -Math.PI + i / A * Math.PI * 2, yl = hairLine(st, bangs, a), drop = hairDrop(st, a);
    const th1 = Math.acos(drop > 0.01 ? Math.min(yl, -0.3) : yl);
    let last;
    for (let j = 0; j <= M; j++) {
      const t = j / M, th = th1 * t;
      // 最后两圈往头皮上收，发尾贴着头，不会露出发帽里面
      const tuck = drop > 0.01 ? 0 : smooth(0.86, 1, t) * (rad - 1.005);
      const r = rad - tuck;
      const sx = Math.sin(th) * Math.sin(a), sy = Math.cos(th), sz = Math.sin(th) * Math.cos(a);
      last = [sx * r * bw, sy * r, sz * r * (0.5 + 0.5 * bw)];
      pos.push(last[0] * R.x, last[1] * R.y, last[2] * R.z);
    }
    if (anyDrop) for (let k = 1; k <= K; k++) {
      const t = k / K, fl = 1 + 0.06 * Math.sin(t * Math.PI) + (st.wave ? 0.05 * Math.sin(a * 10 + t * 9) : 0), tip = 1 - 0.18 * smooth(0.7, 1, t);
      pos.push(last[0] * R.x * fl * tip, (last[1] * R.y) - drop * R.y * t, last[2] * R.z * fl * tip);
    }
  }
  for (let i = 0; i < A; i++) for (let j = 0; j < rows - 1; j++) { const a = i * rows + j, b = (i + 1) * rows + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const uv = new Float32Array(pos.length / 3 * 2).fill(0.5); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// ---------- 整个小人 ----------
export function buildMii(look, opt = {}) {
  const L = Object.assign({ skin: '#ffe3cf', hair: '#3a3341', hairStyle: 'short', bangs: 'straight', eyes: 'round', eyeColor: '#5b7bd6', mouth: 'smile', top: 'shirt', topColor: '#ffffff', tie: '#e0455a', bottom: 'skirt', bottomColor: '#5b6b8c', socks: 'white', shoes: '#3b2f2f', acc: [], accColor: '#e0455a' }, look || {});
  const st = HAIR_STYLES[L.hairStyle] || HAIR_STYLES.short, bangs = st.bangs || L.bangs || 'straight';
  const light = { yaw: opt.lightYaw, pitch: opt.lightPitch, contrast: opt.lightContrast };
  const mats = [], cache = {};
  const matC = color => { if (cache[color]) return cache[color]; const m = lpMaterial(solidTex(color), light); mats.push(m); return cache[color] = m; };
  const matT = tex => { const m = lpMaterial(tex, light); mats.push(m); return m; };
  const add = (parent, geo, mat, p = [0, 0, 0], s, r) => { const m = new THREE.Mesh(geo, mat); m.position.set(p[0], p[1], p[2]); if (s) m.scale.set(s[0], s[1], s[2]); if (r) m.rotation.set(r[0], r[1], r[2]); m.castShadow = true; parent.add(m); return m; };
  // 身材：身高 / 胖瘦（0~100，50 是标准）
  const hk = 0.85 + (opt.miiH == null ? 50 : opt.miiH) / 100 * 0.3, wk = 0.82 + (opt.miiW == null ? 50 : opt.miiW) / 100 * 0.5, headK = 0.85 + (opt.miiHead == null ? 50 : opt.miiHead) / 100 * 0.3;
  const legLen = 0.2 * hk, hipY = legLen + 0.045, torsoH = 0.27 * hk, neckY = hipY + torsoH, HR = 0.235 * headK;
  const R = new THREE.Vector3(HR, HR * 1.05, HR * 0.95), headC = neckY + R.y * 0.82;
  const tw = 0.115 * wk;
  // 骨头
  const root = new THREE.Group(), bones = {};
  ['root', 'body', 'head', 'armL', 'armR', 'legL', 'legR'].forEach(n => { bones[n] = new THREE.Group(); bones[n].name = n; });
  const piv = { root: [0, 0], body: [0, hipY], head: [0, neckY], armL: [tw * 0.98, neckY - 0.035], armR: [-tw * 0.98, neckY - 0.035], legL: [0.052 * wk, hipY], legR: [-0.052 * wk, hipY] };
  const parent = { body: 'root', head: 'body', armL: 'body', armR: 'body', legL: 'root', legR: 'root' };
  root.add(bones.root); Object.keys(parent).forEach(n => bones[parent[n]].add(bones[n]));
  Object.keys(bones).forEach(n => { const p = piv[n], q = parent[n] ? piv[parent[n]] : [0, 0]; bones[n].position.set(p[0] - q[0], p[1] - q[1], 0); });

  // —— 身子：上衣 + 下装（车削体，前面朝 +z；贴图上 u=0.5 是正前方）
  const isDress = L.top === 'dress', skirt = isDress || L.bottom === 'skirt';
  const topCol = L.topColor, botCol = isDress ? L.topColor : (L.bottom === 'none' ? L.topColor : L.bottomColor);
  const tp = [[0.0001, torsoH + 0.004], [tw * 0.55, torsoH], [tw * 0.86, torsoH - 0.022], [tw * 0.98, torsoH - 0.06], [tw, torsoH * 0.55], [tw * 1.02, torsoH * 0.2], [tw * 1.0, 0.0], [tw * 0.8, -0.03], [0.0001, -0.035]];
  const torsoC = cvs(256, 128), tx = torsoC.getContext('2d');
  const waist = 0.62;   // 贴图上（从上往下）多少以下算下装
  tx.fillStyle = topCol; tx.fillRect(0, 0, 256, 128); tx.fillStyle = botCol; tx.fillRect(0, 128 * waist, 256, 128);
  const fx = 128;   // 正前方
  const ln = (col, w, f) => { tx.strokeStyle = col; tx.lineWidth = w; tx.lineCap = 'round'; tx.lineJoin = 'round'; tx.beginPath(); f(); tx.stroke(); };
  const fl = (col, f) => { tx.fillStyle = col; tx.beginPath(); f(); tx.fill(); };
  if (L.top === 'shirt' || L.top === 'jacket') {
    if (L.top === 'jacket') { fl('#ffffff', () => { tx.moveTo(fx - 22, 10); tx.lineTo(fx, 62); tx.lineTo(fx + 22, 10); }); ln(shade(topCol, -0.3), 3, () => { tx.moveTo(fx - 22, 10); tx.lineTo(fx, 62); tx.lineTo(fx + 22, 10); }); fl(shade(topCol, -0.15), () => { tx.arc(fx, 70, 3, 0, 7); }); }
    fl('#ffffff', () => { tx.moveTo(fx - 18, 8); tx.lineTo(fx - 2, 20); tx.lineTo(fx - 16, 26); }); fl('#ffffff', () => { tx.moveTo(fx + 18, 8); tx.lineTo(fx + 2, 20); tx.lineTo(fx + 16, 26); });
    fl(L.tie, () => { tx.moveTo(fx - 4, 18); tx.lineTo(fx + 4, 18); tx.lineTo(fx + 6, 50); tx.lineTo(fx, 58); tx.lineTo(fx - 6, 50); });
  } else if (L.top === 'sailor') {
    fl('#2f3d6b', () => { tx.moveTo(fx - 40, 4); tx.lineTo(fx, 40); tx.lineTo(fx + 40, 4); tx.lineTo(fx + 28, 4); tx.lineTo(fx, 26); tx.lineTo(fx - 28, 4); });
    fl(L.tie, () => { tx.moveTo(fx - 14, 36); tx.lineTo(fx + 14, 36); tx.lineTo(fx, 54); });
  } else if (L.top === 'hoodie') {
    ln(shade(topCol, -0.3), 2.5, () => { tx.moveTo(fx - 8, 12); tx.lineTo(fx - 9, 40); tx.moveTo(fx + 8, 12); tx.lineTo(fx + 9, 40); });
    fl(shade(topCol, -0.08), () => { tx.roundRect(fx - 30, 54, 60, 22, 6); }); ln(shade(topCol, -0.25), 2, () => { tx.roundRect(fx - 30, 54, 60, 22, 6); });
  } else if (L.top === 'sweater') {
    for (let y = 70; y < 78; y += 3) ln(shade(topCol, -0.15), 1.5, () => { tx.moveTo(0, y); tx.lineTo(256, y); });
    ln(shade(topCol, -0.2), 4, () => { tx.moveTo(fx - 22, 6); tx.quadraticCurveTo(fx, 22, fx + 22, 6); });
  } else if (L.top === 'tee') { ln(shade(topCol, -0.2), 3, () => { tx.moveTo(fx - 20, 6); tx.quadraticCurveTo(fx, 22, fx + 20, 6); }); }
  else if (isDress) { fl(L.accColor || L.tie, () => tx.rect(0, 128 * waist - 6, 256, 7)); fl(L.accColor || L.tie, () => { tx.arc(fx, 128 * waist - 3, 6, 0, 7); }); }
  if (!isDress && L.bottom !== 'none') ln(shade(botCol, -0.25), 2, () => { tx.moveTo(0, 128 * waist); tx.lineTo(256, 128 * waist); });
  add(bones.body, lathe(tp.map(([r, y]) => [r, y]), 32), matT(canvasTex(torsoC)), [0, 0, 0], [1, 1, 0.82]);
  // 裙子
  if (skirt) {
    const top = torsoH * 0.36, len = (isDress ? 0.13 : 0.1) * hk + top, fl2 = isDress ? 1.6 : 1.45;
    const sp = [[tw * 1.02, top], [tw * 1.18, top * 0.3], [tw * fl2, top - len], [tw * fl2 * 0.96, top - len - 0.008], [tw * 0.9, top - len * 0.6]];
    const sc = cvs(256, 8), sx = sc.getContext('2d'); sx.fillStyle = botCol; sx.fillRect(0, 0, 256, 8); for (let i = 0; i < 16; i++) { sx.fillStyle = shade(botCol, -0.12); sx.fillRect(i * 16, 0, 2, 8); }
    add(bones.body, lathe(sp, 32), matT(canvasTex(sc)), [0, 0, 0], [1, 1, 0.86]);
  }
  // 连帽衫的帽子 / 水手服的大领子
  if (L.top === 'hoodie') add(bones.body, new THREE.TorusGeometry(tw * 0.62, tw * 0.28, 12, 24), matC(shade(topCol, -0.05)), [0, torsoH - 0.01, -tw * 0.35], [1, 1, 1], [Math.PI / 2 + 0.35, 0, 0]);
  if (L.top === 'sailor') add(bones.body, new THREE.BoxGeometry(tw * 1.7, torsoH * 0.38, 0.006), matC('#2f3d6b'), [0, torsoH * 0.8, -tw * 0.86], [1, 1, 1], [0.12, 0, 0]);
  // —— 头
  const headGeo = new THREE.SphereGeometry(1, 48, 36); { const p = headGeo.attributes.position, uv = headGeo.attributes.uv; for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y < 0) { const k = 1 + 0.06 * Math.sin(-y * Math.PI); x *= k; } p.setXYZ(i, x * R.x, y * R.y, z * R.z); if (z > -0.05) uv.setXY(i, 0.5 + x / 2, 0.5 + y / 2); else uv.setXY(i, x > 0 ? 0.995 : 0.005, 0.5 + y / 2); } headGeo.computeVertexNormals(); }
  const faceTex = {}; const getFace = (f, o) => { const k = f + (o ? 1 : 0); return faceTex[k] || (faceTex[k] = canvasTex(drawMiiFace(L, f, o))); };
  const faceMat = matT(getFace('normal', 0));
  const head = new THREE.Group(); head.position.set(0, headC - neckY, 0); bones.head.add(head);
  add(head, headGeo, faceMat);
  // 脖子
  add(bones.body, new THREE.CylinderGeometry(0.03 * wk, 0.034 * wk, 0.05, 12), matC(L.skin), [0, torsoH + 0.01, 0]);
  // 耳朵（头发长就藏起来）
  if ((st.side || 0) < 40) [-1, 1].forEach(k => add(head, new THREE.SphereGeometry(1, 16, 12), matC(L.skin), [k * R.x * 0.97, -R.y * 0.06, -R.z * 0.05], [R.x * 0.13, R.y * 0.18, R.z * 0.11]));
  // —— 头发
  const hairM = matC(L.hair), tieM = matC(L.accColor || L.tie);
  if (st.cap !== 'none') add(head, hairCap(st, bangs, R, opt), hairM);
  const onHead = (dx, dy, dz, sc = 1.08) => { const v = new THREE.Vector3(dx, dy, dz).normalize(); return [v.x * R.x * sc, v.y * R.y * sc, v.z * R.z * sc]; };
  if (st.cap === 'spiky') { const dirs = [[0, 1, 0.2], [0.5, 0.85, 0.3], [-0.5, 0.85, 0.3], [0.85, 0.5, 0.1], [-0.85, 0.5, 0.1], [0.3, 0.8, -0.5], [-0.3, 0.8, -0.5], [0.75, 0.35, -0.55], [-0.75, 0.35, -0.55], [0, 0.6, -0.8], [0.4, 0.2, -0.9], [-0.4, 0.2, -0.9], [0, 0.95, 0.55], [0.45, 0.7, 0.6], [-0.45, 0.7, 0.6]];
    dirs.forEach(([dx, dy, dz], i) => { const d = new THREE.Vector3(dx, dy, dz).normalize(); const p = onHead(d.x, d.y, d.z, 0.9); const m = add(head, new THREE.ConeGeometry(HR * 0.3, HR * (0.5 + 0.12 * (i % 3)), 12), hairM, p); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().add(new THREE.Vector3(0, 0.35, -0.2)).normalize()); }); }
  if (st.cap === 'curly' || st.cap === 'fluffy') { const n = st.cap === 'curly' ? 46 : 20, rr = st.cap === 'curly' ? 0.22 : 0.2; for (let i = 0; i < n; i++) { const y = 1 - i / n * 1.4, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996; const d = [Math.sin(a) * r, y, Math.cos(a) * r]; if (d[2] > 0.45 && d[1] < 0.5) continue; if (y < hairLine(st, bangs, Math.atan2(d[0], d[2])) + 0.1) continue; add(head, new THREE.SphereGeometry(1, 14, 10), hairM, onHead(...d, 1.04), [HR * rr, HR * rr, HR * rr]); } }
  // 发束：沿一条弯弯的线扫出来，根部粗、发尾细
  const sweep = (pts, r0, r1) => { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), n = 24, g = new THREE.TubeGeometry(c, n, 1, 12, false), P = g.attributes.position, rs = 13;
    for (let i = 0; i <= n; i++) { const t = i / n, ctr = c.getPointAt(t), r = (r0 + (r1 - r0) * Math.pow(t, 0.8)) * (t > 0.85 ? Math.sqrt(Math.max(0.05, 1 - (t - 0.85) / 0.15)) : 1) * (t < 0.08 ? 0.8 + t * 2.5 : 1);
      for (let k = 0; k < rs; k++) { const v = i * rs + k; P.setXYZ(v, ctr.x + (P.getX(v) - ctr.x) * r, ctr.y + (P.getY(v) - ctr.y) * r, ctr.z + (P.getZ(v) - ctr.z) * r); } }
    g.computeVertexNormals(); return g; };
  const tail = (p, dir, len, r0, r1, bend = 0.35) => { const d = new THREE.Vector3(...dir).normalize(), o = new THREE.Vector3(d.x, 0, d.z).normalize(); const out = o.lengthSq() ? o : new THREE.Vector3(0, 0, -1);
    const pts = [p, [p[0] + out.x * len * bend * 0.6, p[1] + len * 0.08, p[2] + out.z * len * bend * 0.6], [p[0] + out.x * len * bend + d.x * len * 0.45, p[1] + d.y * len * 0.45, p[2] + out.z * len * bend + d.z * len * 0.45], [p[0] + out.x * len * bend * 0.7 + d.x * len, p[1] + d.y * len, p[2] + out.z * len * bend * 0.7 + d.z * len]];
    add(head, sweep(pts, r0, r1), hairM); add(head, new THREE.SphereGeometry(r0 * 0.6, 12, 10), tieM, p); };
  if (st.tails === 'high') [-1, 1].forEach(k => tail(onHead(k * 0.85, 0.45, -0.15, 1.0), [k * 0.45, -1, -0.15], HR * 1.7, HR * 0.24, HR * 0.1));
  if (st.tails === 'low') [-1, 1].forEach(k => tail(onHead(k * 0.7, -0.35, -0.55, 1.0), [k * 0.2, -1, -0.1], HR * 1.5, HR * 0.2, HR * 0.09));
  if (st.pony === 'top') tail(onHead(0, 0.5, -0.85, 1.02), [0, -1, -0.45], HR * 1.7, HR * 0.24, HR * 0.08);
  if (st.pony === 'side') tail(onHead(0.8, 0.35, -0.35, 1.0), [0.4, -1, -0.1], HR * 1.6, HR * 0.24, HR * 0.08);
  if (st.buns) st.buns.forEach(([bx]) => add(head, new THREE.SphereGeometry(HR * 0.34, 18, 14), hairM, bx ? onHead(bx * 0.62, 0.72, -0.2, 1.05) : onHead(0, 0.6, -0.75, 1.08)));
  if (st.braids) [-1, 1].forEach(k => { for (let i = 0; i < 6; i++) add(head, new THREE.SphereGeometry(HR * (0.16 - i * 0.008), 12, 10), hairM, [k * R.x * 0.82, -R.y * (0.5 + i * 0.27), -R.z * 0.1 + (i % 2 ? 0.006 : -0.006)], [1, 1.25, 1]); add(head, new THREE.SphereGeometry(HR * 0.08, 10, 8), tieM, [k * R.x * 0.82, -R.y * (0.5 + 6 * 0.27 - 0.1), -R.z * 0.1]); });
  if (L.ahoge !== false && st.cap !== 'buzz' && st.cap !== 'none') { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, R.y * 1.04, R.z * 0.05), new THREE.Vector3(R.x * 0.05, R.y * 1.3, R.z * 0.1), new THREE.Vector3(R.x * 0.22, R.y * 1.38, R.z * 0.02), new THREE.Vector3(R.x * 0.25, R.y * 1.25, -R.z * 0.05)]); add(head, new THREE.TubeGeometry(c, 16, HR * 0.03, 6), hairM); }
  // —— 配饰
  const acc = L.acc || [], aM = matC(L.accColor);
  if (acc.includes('cat')) [-1, 1].forEach(k => { const p = onHead(k * 0.55, 0.85, -0.05, 0.98), m = add(head, new THREE.ConeGeometry(HR * 0.24, HR * 0.42, 4), hairM, p); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(k * 0.55, 0.85, 0).normalize()); });
  if (acc.includes('bunny')) [-1, 1].forEach(k => { const m = add(head, new THREE.CapsuleGeometry(HR * 0.12, HR * 0.7, 6, 12), matC('#ffffff'), onHead(k * 0.35, 0.95, -0.1, 1.3), [1, 1, 0.55]); m.rotation.z = -k * 0.25; });
  if (acc.includes('horn')) [-1, 1].forEach(k => { const m = add(head, new THREE.ConeGeometry(HR * 0.09, HR * 0.3, 10), matC('#7a2b3a'), onHead(k * 0.5, 0.85, 0.1, 1.08)); m.rotation.z = -k * 0.4; });
  if (acc.includes('ribbon')) [-1, 1].forEach(k => { const p = onHead(k * 0.75, 0.55, 0.05, 1.08); [-1, 1].forEach(s => { const m = add(head, new THREE.ConeGeometry(HR * 0.15, HR * 0.24, 12), aM, [p[0] + s * HR * 0.13, p[1], p[2]], [1, 1, 0.5]); m.rotation.z = s * Math.PI / 2; }); add(head, new THREE.SphereGeometry(HR * 0.06, 10, 8), aM, p); });
  if (acc.includes('clip')) { const p = onHead(0.7, 0.45, 0.45, 1.08); [-1, 1].forEach(s => { const m = add(head, new THREE.BoxGeometry(HR * 0.28, HR * 0.05, HR * 0.03), aM, p); m.rotation.z = s * 0.7; }); }
  if (acc.includes('halo')) add(head, new THREE.TorusGeometry(HR * 0.55, HR * 0.05, 8, 32), matC('#ffe27a'), [0, R.y * 1.35, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  if (acc.includes('flower')) { const p = onHead(-0.75, 0.5, 0.2, 1.06); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(head, new THREE.SphereGeometry(HR * 0.07, 10, 8), aM, [p[0], p[1] + Math.cos(a) * HR * 0.09, p[2] + Math.sin(a) * HR * 0.09]); } add(head, new THREE.SphereGeometry(HR * 0.06, 10, 8), matC('#ffe27a'), [p[0] - HR * 0.02, p[1], p[2]]); }
  if (acc.includes('hat')) add(head, new THREE.SphereGeometry(1, 24, 16), aM, [R.x * 0.12, R.y * 0.82, -R.z * 0.05], [R.x * 1.05, R.y * 0.32, R.z * 1.0], [0, 0, -0.2]);
  // —— 手（袖子 + 小圆手）
  const shortSleeve = L.top === 'tee' || L.top === 'dress';
  const armLen = 0.15 * hk, ar = 0.034 * wk;
  [['armL', 1], ['armR', -1]].forEach(([n, k]) => {
    const g = new THREE.Group(); g.rotation.z = k * 0.12; bones[n].add(g);
    add(g, lathe(limbProf(ar, ar * 0.9, armLen), 18), matT(bandTex(shortSleeve ? [[0, 0.42, topCol], [0.42, 1, L.skin]] : [[0, 1, topCol]])));
    add(g, new THREE.SphereGeometry(ar * 1.12, 16, 12), matC(L.skin), [0, -armLen - ar * 0.7, 0]);
  });
  // —— 脚（腿 + 袜子 + 鞋）
  const lr = 0.038 * wk;
  const sock = L.socks === 'long' ? ['#ffffff', 0.25] : L.socks === 'white' ? ['#ffffff', 0.75] : L.socks === 'black' ? ['#2b2733', 0.08] : null;
  [['legL', 1], ['legR', -1]].forEach(([n]) => {
    const bands = [[0, 1, L.skin]];
    if (L.bottom === 'pants' && !isDress) bands.push([0, 0.95, botCol]);
    else if (L.bottom === 'shorts' && !isDress) bands.push([0, 0.38, botCol]);
    if (sock && !(L.bottom === 'pants' && !isDress)) bands.push([sock[1], 1, sock[0]]);
    add(bones[n], lathe(limbProf(lr, lr * 0.85, legLen - 0.02), 18), matT(bandTex(bands)), [0, 0.0, 0]);
    add(bones[n], new THREE.SphereGeometry(1, 18, 12), matC(L.shoes), [0, -legLen + 0.002, 0.014], [lr * 1.25, lr * 0.85, lr * 1.65]);
  });
  // 整体：脚底在 0，最高处（头发 / 耳朵 / 配饰）算进去，缩到高 1
  root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(root);
  const H = Math.max(0.5, box.max.y - box.min.y), s = 1 / H;
  root.scale.setScalar(s); root.position.y = -box.min.y * s;
  return { root, bones, mats, legLen: hipY * s, faceMat, getFace };
}
