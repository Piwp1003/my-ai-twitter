// 🧊 图片变 3D：一张正面图（可以再给一张背面）+ 每个像素属于哪个部位 → 鼓成一个低模小人（头、身体、两只手、两条腿各是一块，能单独动）
import * as THREE from 'three';
export const PARTS = ['', 'head', 'body', 'armL', 'armR', 'legL', 'legR'];
export const PART_CN = ['擦掉', '头', '身体', '左手', '右手', '左脚', '右脚'];

// 把图缩到干活的大小，顺便拿到 alpha
export function toWork(img, maxH = 220) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const k = Math.min(1, maxH / ih), W = Math.max(8, Math.round(iw * k)), H = Math.max(8, Math.round(ih * k));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H);
  return { canvas: c, W, H, data: x.getImageData(0, 0, W, H).data };
}
// 纯色背景抠掉：从四条边往里洪泛，和角落颜色接近的都变透明
export function cutBg(canvas, tol = 38) {
  const W = canvas.width, H = canvas.height, x = canvas.getContext('2d'), im = x.getImageData(0, 0, W, H), d = im.data;
  let opaqueCorners = 0; [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].forEach(([i, j]) => { if (d[(j * W + i) * 4 + 3] > 200) opaqueCorners++; });
  if (opaqueCorners < 3) return false;
  const seen = new Uint8Array(W * H), q = [];
  const ref = [0, 0]; const r0 = d[0], g0 = d[1], b0 = d[2];
  const near = p => { const o = p * 4; return Math.abs(d[o] - r0) + Math.abs(d[o + 1] - g0) + Math.abs(d[o + 2] - b0) < tol * 3; };
  for (let i = 0; i < W; i++) { q.push(i, (H - 1) * W + i); } for (let j = 0; j < H; j++) { q.push(j * W, j * W + W - 1); }
  while (q.length) { const p = q.pop(); if (seen[p]) continue; seen[p] = 1; if (!near(p)) continue; d[p * 4 + 3] = 0; const i = p % W, j = (p / W) | 0; if (i > 0) q.push(p - 1); if (i < W - 1) q.push(p + 1); if (j > 0) q.push(p - W); if (j < H - 1) q.push(p + W); }
  x.putImageData(im, 0, 0); return true;
}
// 自动分部位：按 Q 版比例猜（头占上面一大半，手在身体两边，脚在最下面）
export function autoLabels(W, H, alpha, opt = {}) {
  const L = new Uint8Array(W * H);
  let top = H, bot = 0, left = W, right = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (alpha[j * W + i] > 40) { if (j < top) top = j; if (j > bot) bot = j; if (i < left) left = i; if (i > right) right = i; }
  if (bot <= top) return L;
  const fh = bot - top, headY = top + fh * (opt.head || 0.56), legY = top + fh * (opt.leg || 0.8);
  // 身体的宽度：头下面那一段每行的实心中段
  const cx = (() => { let s = 0, n = 0; for (let j = Math.round(headY); j < legY; j++) for (let i = 0; i < W; i++) if (alpha[j * W + i] > 40) { s += i; n++; } return n ? s / n : (left + right) / 2; })();
  const bw = (opt.body || 0.42) * (() => { let w = 0; for (let j = Math.round(headY + (legY - headY) * 0.15); j < legY; j++) { let a = W, b = 0; for (let i = 0; i < W; i++) if (alpha[j * W + i] > 40) { a = Math.min(a, i); b = Math.max(b, i); } w = Math.max(w, b - a); } return w || (right - left); })();
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const p = j * W + i; if (alpha[p] <= 40) continue;
    if (j < headY) L[p] = 1;
    else if (j >= legY) L[p] = i >= cx ? 5 : 6;
    else if (i > cx + bw / 2) L[p] = 3; else if (i < cx - bw / 2) L[p] = 4; else L[p] = 2;
  }
  return L;
}
// 距离变换（到图形外面的距离，两遍 3-4 倒角）
function dist(W, H, inside) {
  const D = new Float32Array(W * H), BIG = 1e9;
  for (let p = 0; p < W * H; p++) D[p] = inside[p] ? BIG : 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const p = j * W + i; if (!D[p]) continue; let v = D[p];
    if (i > 0) v = Math.min(v, D[p - 1] + 3); else v = Math.min(v, 3); if (j > 0) v = Math.min(v, D[p - W] + 3); else v = Math.min(v, 3);
    if (i > 0 && j > 0) v = Math.min(v, D[p - W - 1] + 4); if (i < W - 1 && j > 0) v = Math.min(v, D[p - W + 1] + 4); D[p] = v; }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { const p = j * W + i; if (!D[p]) continue; let v = D[p];
    if (i < W - 1) v = Math.min(v, D[p + 1] + 3); else v = Math.min(v, 3); if (j < H - 1) v = Math.min(v, D[p + W] + 3); else v = Math.min(v, 3);
    if (i < W - 1 && j < H - 1) v = Math.min(v, D[p + W + 1] + 4); if (i > 0 && j < H - 1) v = Math.min(v, D[p + W - 1] + 4); D[p] = v; }
  for (let p = 0; p < W * H; p++) D[p] /= 3;
  return D;
}
// 没给背面：用正面翻一份，头那一块涂成头发的颜色
export function fakeBack(front, labels, W, H) {
  const c = document.createElement('canvas'); c.width = front.width; c.height = front.height; const x = c.getContext('2d'); x.drawImage(front, 0, 0);
  const sx = front.width / W, sy = front.height / H;
  // 头发颜色：头那一块最上面 20% 的平均色
  let top = H, bot = 0; for (let p = 0; p < W * H; p++) if (labels[p] === 1) { const j = (p / W) | 0; top = Math.min(top, j); bot = Math.max(bot, j); }
  const sm = document.createElement('canvas'); sm.width = W; sm.height = H; const sx2 = sm.getContext('2d'); sx2.drawImage(front, 0, 0, W, H); const d = sx2.getImageData(0, 0, W, H).data;
  let r = 0, g = 0, b = 0, n = 0; const lim = top + (bot - top) * 0.2;
  for (let j = top; j <= lim; j++) for (let i = 0; i < W; i++) { const p = j * W + i; if (labels[p] === 1 && d[p * 4 + 3] > 200) { r += d[p * 4]; g += d[p * 4 + 1]; b += d[p * 4 + 2]; n++; } }
  if (!n) return c;
  const col = `rgb(${r / n | 0},${g / n | 0},${b / n | 0})`;
  // 只盖住头里面那一圈（外缘保留，免得轮廓丢了）
  const big = x.getImageData(0, 0, c.width, c.height), bd = big.data;
  const inner = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) inner[p] = labels[p] === 1 ? 1 : 0;
  const dd = dist(W, H, inner);
  const [cr, cg, cb] = [r / n | 0, g / n | 0, b / n | 0];
  for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) { const p = (Math.min(H - 1, j / sy | 0)) * W + Math.min(W - 1, i / sx | 0); if (labels[p] === 1 && dd[p] > 1.5) { const o = (j * c.width + i) * 4; if (bd[o + 3] < 30) continue; const sh = 1 - Math.min(0.18, (j / sy - top) / (bot - top + 1) * 0.18); bd[o] = cr * sh; bd[o + 1] = cg * sh; bd[o + 2] = cb * sh; } }
  x.putImageData(big, 0, 0);
  return c;
}

// 主函数：返回 {group, joints, height}
// opt: thick 厚度(0.2~1.6) round 圆润度(0~1) step 简化程度（网格像素，越大越低模） backMirror 背面图是从后面看的（要左右翻）
export function inflate(front, back, labels, W, H, opt = {}) {
  const thick = opt.thick == null ? 0.8 : +opt.thick, round = opt.round == null ? 0.85 : +opt.round, step = Math.max(1, Math.round(opt.step || 3));
  const sm = document.createElement('canvas'); sm.width = W; sm.height = H; const sc = sm.getContext('2d'); sc.drawImage(front, 0, 0, W, H);
  const ad = sc.getImageData(0, 0, W, H).data, alpha = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) alpha[p] = ad[p * 4 + 3];
  const fig = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) fig[p] = alpha[p] > 40 && labels[p] ? 1 : 0;
  const D = dist(W, H, fig);
  let top = H, bot = 0, Rg = 1, sxSum = 0, sxN = 0;
  for (let p = 0; p < W * H; p++) if (fig[p]) { const j = (p / W) | 0; top = Math.min(top, j); bot = Math.max(bot, j); Rg = Math.max(Rg, D[p]); sxSum += p % W; sxN++; }
  const figH = Math.max(1, bot - top), cx = sxN ? sxSum / sxN : W / 2, U = 1 / figH;   // 1 个像素 = U 个单位，整个小人高 1
  const hOf = d => { if (d <= 0) return 0; const u = Math.min(1, d / Rg); const f = (1 - round) * u + round * Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u))); return thick * Rg * f * 0.55; };
  // 每个部位的转轴
  const pv = {};
  const bb = id => { let a = W, b = 0, c = H, d = 0, n = 0, sx = 0; for (let p = 0; p < W * H; p++) if (fig[p] && labels[p] === id) { const i = p % W, j = (p / W) | 0; a = Math.min(a, i); b = Math.max(b, i); c = Math.min(c, j); d = Math.max(d, j); sx += i; n++; } return n ? { a, b, c, d, n, mx: sx / n } : null; };
  const B = {}; for (let id = 1; id <= 6; id++) B[id] = bb(id);
  const body = B[2] || { a: cx - 10, b: cx + 10, c: top + figH * 0.55, d: top + figH * 0.8, mx: cx };
  pv.hips = [body.mx, body.d];
  pv.head = [B[1] ? B[1].mx : cx, B[1] ? Math.min(B[1].d, body.c + 4) : body.c];
  // 手：最上面 20% 里离身体中线最近的那个点
  [3, 4].forEach(id => { const b = B[id]; if (!b) { pv[id] = [id === 3 ? body.b : body.a, body.c + 6]; return; } let best = null, bd = 1e9; const lim = b.c + (b.d - b.c) * 0.25; for (let p = 0; p < W * H; p++) if (fig[p] && labels[p] === id) { const i = p % W, j = (p / W) | 0; if (j > lim) continue; const dd = Math.abs(i - body.mx) + (j - b.c) * 0.5; if (dd < bd) { bd = dd; best = [i, j]; } } pv[id] = best || [b.mx, b.c]; });
  [5, 6].forEach(id => { const b = B[id]; pv[id] = b ? [b.mx, b.c] : [id === 5 ? body.mx + 6 : body.mx - 6, body.d]; });
  const W2 = (i, j) => [(i - cx) * U, (bot - j) * U];
  // 贴图
  const texF = new THREE.CanvasTexture(front); texF.colorSpace = THREE.SRGBColorSpace; texF.anisotropy = 4;
  const texB = new THREE.CanvasTexture(back || front); texB.colorSpace = THREE.SRGBColorSpace;
  const matF = new THREE.MeshLambertMaterial({ map: texF, alphaTest: 0.5, flatShading: true, side: THREE.FrontSide });
  const matB = new THREE.MeshLambertMaterial({ map: texB, alphaTest: 0.5, flatShading: true, side: THREE.FrontSide });
  const mirror = !!(back && opt.backMirror !== false && opt.backIsReal);
  // 网格：顶点在图形里（或紧挨着图形、图上是透明的地方——让贴图的透明边去裁出轮廓）
  const gx = Math.ceil(W / step) + 1, gy = Math.ceil(H / step) + 1;
  const at = (i, j) => labels[Math.min(H - 1, j) * W + Math.min(W - 1, i)];
  // 每个网格点归哪个部位：自己在哪个部位里；不在图形里就看周围 step 范围内最近的部位
  const own = new Int8Array(gx * gy);
  for (let gj = 0; gj < gy; gj++) for (let gi = 0; gi < gx; gi++) {
    const i = Math.min(W - 1, gi * step), j = Math.min(H - 1, gj * step), p = j * W + i;
    if (fig[p]) { own[gj * gx + gi] = labels[p]; continue; }
    let best = 0, bd = 1e9; const r = step + 1;
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const q = jj * W + ii; if (!fig[q]) continue; const dd = di * di + dj * dj; if (dd < bd) { bd = dd; best = labels[q]; } }
    own[gj * gx + gi] = best;
  }
  // 一格里有好几个部位（接缝）：归角最多的那个，一样多就归身体 / 头 —— 这样部位之间没有缝
  const PRI = [0, 2, 3, 1, 1, 0, 0];
  const cellOwner = cs => { const cnt = [0, 0, 0, 0, 0, 0, 0]; cs.forEach(v => { if (v > 0) cnt[v]++; }); let best = 0; for (let k = 1; k <= 6; k++) if (cnt[k] > cnt[best] || (cnt[k] && cnt[k] === cnt[best] && PRI[k] > PRI[best])) best = k; return best; };
  const meshes = {};
  for (let id = 1; id <= 6; id++) {
    const pos = [], uv = [], posB = [], uvB = [], idx = [], idxB = []; const vmap = new Int32Array(gx * gy).fill(-1);
    const piv = id === 1 ? pv.head : id === 2 ? pv.hips : pv[id];
    const [px, py] = W2(piv[0], piv[1]);
    const vert = (gi, gj) => { const k = gj * gx + gi; if (vmap[k] >= 0) return vmap[k]; const i = Math.min(W - 1, gi * step), j = Math.min(H - 1, gj * step); const p = j * W + i; const h = fig[p] ? hOf(D[p]) : 0; const [x, y] = W2(gi * step, gj * step); const n = pos.length / 3;
      pos.push(x - px, y - py, h * U); uv.push(gi * step / W, 1 - gj * step / H);
      posB.push(x - px, y - py, -h * U * (opt.backDepth || 1)); uvB.push(mirror ? 1 - gi * step / W : gi * step / W, 1 - gj * step / H);
      vmap[k] = n; return n; };
    for (let gj = 0; gj < gy - 1; gj++) for (let gi = 0; gi < gx - 1; gi++) {
      const cs = [own[gj * gx + gi], own[gj * gx + gi + 1], own[(gj + 1) * gx + gi], own[(gj + 1) * gx + gi + 1]];
      if (cellOwner(cs) !== id) continue;
      const o = cs.map(v => v > 0); const n = o.filter(Boolean).length; if (n < 3) continue;
      const a = [gi, gj], b = [gi + 1, gj], c = [gi, gj + 1], d = [gi + 1, gj + 1];
      const tri = (p, q, r) => { const A = vert(...p), Bq = vert(...q), C = vert(...r); idx.push(A, C, Bq); idxB.push(A, Bq, C); };
      if (n === 4) { tri(a, b, d); tri(a, d, c); }
      else if (!o[0]) tri(b, d, c); else if (!o[1]) tri(a, d, c); else if (!o[2]) tri(a, b, d); else tri(a, b, c);
    }
    if (!idx.length) continue;
    const mk = (P, UV, I, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };
    const grp = new THREE.Group(); grp.add(mk(pos, uv, idx, matF)); grp.add(mk(posB, uvB, idxB, matB));
    grp.position.set(px, py, 0); grp.userData.piv = [px, py];
    meshes[PARTS[id]] = grp;
  }
  // 骨架：hips 下面挂 spine（身体 + 头 + 手）和两条腿
  const root = new THREE.Group(), hips = new THREE.Group(), spine = new THREE.Group();
  const [hx, hy] = W2(pv.hips[0], pv.hips[1]);
  hips.position.set(hx, hy, 0); root.add(hips); hips.add(spine);
  const J = { hips, spine };
  const attach = (name, parent) => { const m = meshes[name]; const g = new THREE.Group(); if (m) { const [x, y] = m.userData.piv; g.position.set(x - parent.__wx, y - parent.__wy, 0); m.position.set(0, 0, 0); g.add(m); } parent.add(g); J[name] = g; g.__wx = m ? m.userData.piv[0] : parent.__wx; g.__wy = m ? m.userData.piv[1] : parent.__wy; return g; };
  hips.__wx = hx; hips.__wy = hy; spine.__wx = hx; spine.__wy = hy;
  if (meshes.body) { meshes.body.position.set(0, 0, 0); spine.add(meshes.body); }
  attach('head', spine); attach('armL', spine); attach('armR', spine); attach('legL', hips); attach('legR', hips);
  // 腿太短/没有腿时，hips 的高度就是脚底
  return { root, joints: { hips: J.hips, spine: J.spine, head: J.head, armL: J.armL, armR: J.armR, legL: J.legL, legR: J.legR }, height: 1, matF, matB, texF, texB };
}
