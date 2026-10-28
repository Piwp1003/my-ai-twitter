// 🧊 低模小人（照「低模小人建造师」lowpoly.kkeist.com 的做法重写）：
// 方形画布（默认 256 格）上一张正面、一张背面，每个格子标属于哪个部位；
// 每个部位：描出轮廓 → 抽稀、按「简化程度」重新取点 → 里面再撒一圈点 → Delaunay 三角化（三角形大小不一，才有低模的感觉）；
// 厚度是「抱枕」形：中间平、边上按圆润度圆过去；正反两面 + 一圈侧面；法线是平滑的，靠大三角形出棱角；
// 手脚往身体里多伸几格、头往头发里多伸几格，转起来不露缝；
// 上色用自己的着色器：贴图 × 柔和的光（底光一半）× 边缘稍暗 × 一点暖色。
import * as THREE from 'three';
import Delaunator from 'delaunator';
import cdt2d from 'cdt2d';
import { skelRig } from './skel.js';

export const LP_PARTS = ['', 'head', 'body', 'armL', 'armR', 'legL', 'legR', 'hair'];
export const LP_CN = ['擦掉', '头', '身体', '左手', '右手', '左脚', '右脚', '头发'];
// 照网站「默认预设」：头 139 / 身体 23 / 手 14 / 脚 17~19，圆润度都是 100（头的厚度按头的宽度自动算，示例图的头宽约 180 格）
export const LP_DEF = { head: [139, 100], hair: [149, 100], body: [23, 100], armL: [14, 100], armR: [14, 100], legL: [18, 100], legR: [18, 100] };   // [厚度, 圆润度]（256 格画布上的格数 / 百分比）
const BONE = { head: 'head', hair: 'head', body: 'body', armL: 'armL', armR: 'armR', legL: 'legL', legR: 'legR' };
const SEAM = 4;

// ---------- 距离 ----------
function chamfer(inside, N) {   // 里面的格子到外面的距离（格），外面是 0
  const BIG = 1e6, r = new Float32Array(N * N);
  for (let i = 0; i < r.length; i++) r[i] = inside[i] ? BIG : 0;
  const g = (x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? 0 : r[y * N + x];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const p = y * N + x; if (!r[p]) continue; r[p] = Math.min(r[p], g(x - 1, y) + 3, g(x, y - 1) + 3, g(x - 1, y - 1) + 4, g(x + 1, y - 1) + 4); }
  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const p = y * N + x; if (!r[p]) continue; r[p] = Math.min(r[p], g(x + 1, y) + 3, g(x, y + 1) + 3, g(x + 1, y + 1) + 4, g(x - 1, y + 1) + 4); }
  for (let i = 0; i < r.length; i++) r[i] = Math.min(r[i] / 3, N);
  return r;
}
function outsideDist(inside, N) { const o = new Uint8Array(N * N); for (let i = 0; i < o.length; i++) o[i] = inside[i] ? 0 : 1; return chamfer(o, N); }
function signedDist(inside, N) { const a = chamfer(inside, N), b = outsideDist(inside, N), s = new Float32Array(N * N); for (let i = 0; i < s.length; i++) s[i] = inside[i] ? a[i] - 0.5 : 0.5 - b[i]; return s; }
function boxBlur(arr, N, r, it) { let a = arr; for (let k = 0; k < it; k++) for (const horiz of [true, false]) { const o = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0; for (let d = -r; d <= r; d++) { const xx = horiz ? Math.min(N - 1, Math.max(0, x + d)) : x, yy = horiz ? y : Math.min(N - 1, Math.max(0, y + d)); s += a[yy * N + xx]; } o[y * N + x] = s / (2 * r + 1); } a = o; } return a; }
function bilerp(a, N, x, y) { const fx = Math.min(N - 1, Math.max(0, x - 0.5)), fy = Math.min(N - 1, Math.max(0, y - 0.5)); const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(N - 1, x0 + 1), y1 = Math.min(N - 1, y0 + 1), u = fx - x0, v = fy - y0; return (a[y0 * N + x0] * (1 - u) + a[y0 * N + x1] * u) * (1 - v) + (a[y1 * N + x0] * (1 - u) + a[y1 * N + x1] * u) * v; }

// ---------- 轮廓 ----------
function traceLoops(mask, N) {
  const W = N + 1, from = [], to = [], byStart = new Map();
  const edge = (x0, y0, x1, y1) => { const i = from.length; from.push(y0 * W + x0); to.push(y1 * W + x1); const k = y0 * W + x0; (byStart.get(k) || byStart.set(k, []).get(k)).push(i); };
  const at = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !!mask[y * N + x];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!at(x, y)) continue;
    if (!at(x, y - 1)) edge(x, y, x + 1, y); if (!at(x + 1, y)) edge(x + 1, y, x + 1, y + 1); if (!at(x, y + 1)) edge(x + 1, y + 1, x, y + 1); if (!at(x - 1, y)) edge(x, y + 1, x, y); }
  const used = new Uint8Array(from.length), loops = [], X = k => k % W, Y = k => Math.floor(k / W);
  for (let s = 0; s < from.length; s++) {
    if (used[s]) continue; const pts = []; let e = s;
    for (;;) { used[e] = 1; pts.push(X(from[e]), Y(from[e])); const end = to[e]; const cand = (byStart.get(end) || []).filter(i => !used[i]); if (!cand.length) break;
      let nx = cand[0]; if (cand.length > 1) { const dx = X(end) - X(from[e]), dy = Y(end) - Y(from[e]); let best = -Infinity; for (const c of cand) { const cr = dx * (Y(to[c]) - Y(end)) - dy * (X(to[c]) - X(end)); if (cr > best) { best = cr; nx = c; } } }
      e = nx; if (e === s) break; }
    if (pts.length >= 8) loops.push(pts);
  }
  return loops;
}
const loopArea = p => { let a = 0, n = p.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1]; } return a / 2; };
function smooth5(p) { const n = p.length / 2; if (n < 8) return p; const o = [], w = [1, 2, 3, 2, 1]; for (let i = 0; i < n; i++) { let x = 0, y = 0; for (let k = -2; k <= 2; k++) { const j = (i + k + n) % n; x += p[j * 2] * w[k + 2]; y += p[j * 2 + 1] * w[k + 2]; } o.push(x / 9, y / 9); } return o; }
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)); }
function dp(pts, tol) { if (pts.length <= 2) return pts; const a = pts[0], b = pts[pts.length - 1]; let m = -1, k = 0; for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i][0], pts[i][1], a[0], a[1], b[0], b[1]); if (d > m) { m = d; k = i; } } if (m <= tol) return [a, b]; const l = dp(pts.slice(0, k + 1), tol), r = dp(pts.slice(k), tol); return l.slice(0, -1).concat(r); }
function simplifyLoop(p, tol, spacing) {
  const s = smooth5(smooth5(p)), n = s.length / 2, P = []; for (let i = 0; i < n; i++) P.push([s[i * 2], s[i * 2 + 1]]);
  let far = 1, fd = -1; for (let i = 1; i < n; i++) { const d = Math.hypot(P[i][0] - P[0][0], P[i][1] - P[0][1]); if (d > fd) { fd = d; far = i; } }
  const A = dp(P.slice(0, far + 1), tol), B = dp(P.slice(far).concat([P[0]]), tol), Q = A.slice(0, -1).concat(B.slice(0, -1)), out = [];
  for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length]; out.push(a[0], a[1]); const L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.ceil(L / spacing); for (let j = 1; j < k; j++) out.push(a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k); }
  return out;
}

// 多边形（几圈轮廓 + 里面撒的点）→ 三角形，全部在轮廓里面、正好铺满
function fillPoly(pts, loops) {
  const key = new Map(), P = [], remap = [];
  const add = (x, y) => { const k = Math.round(x * 64) + ',' + Math.round(y * 64); let id = key.get(k); if (id == null) { id = P.length / 2; key.set(k, id); P.push(x, y); } return id; };
  for (let i = 0; i < pts.length / 2; i++) remap.push(add(pts[i * 2], pts[i * 2 + 1]));
  const L2 = [], edges = []; let base = 0;
  for (const l of loops) { const n = l.length / 2, ids = []; for (let i = 0; i < n; i++) { const id = remap[base + i]; if (ids[ids.length - 1] !== id) ids.push(id); } if (ids.length > 2 && ids[0] === ids[ids.length - 1]) ids.pop(); base += n; if (ids.length < 3) continue; L2.push(ids); for (let i = 0; i < ids.length; i++) edges.push([ids[i], ids[(i + 1) % ids.length]]); }
  fillPoly.lastLoops = L2;
  const V = P.length / 2, xy = []; for (let i = 0; i < V; i++) xy.push([P[i * 2], P[i * 2 + 1]]);
  let tri = null;
  try { tri = cdt2d(xy, edges, { exterior: false }); } catch (e) { tri = null; }
  if (!tri || !tri.length) {   // 万一约束失败：退回普通三角化，只按「在不在轮廓里」挑
    const inPoly = (x, y) => { let c = false; for (const l of L2) for (let i = 0, j = l.length - 1; i < l.length; j = i++) { const xi = P[l[i] * 2], yi = P[l[i] * 2 + 1], xj = P[l[j] * 2], yj = P[l[j] * 2 + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const t = new Delaunator(Float64Array.from(P)).triangles; tri = [];
    for (let k = 0; k < t.length; k += 3) { const a = t[k], b = t[k + 1], d = t[k + 2]; if (inPoly((P[a * 2] + P[b * 2] + P[d * 2]) / 3, (P[a * 2 + 1] + P[b * 2 + 1] + P[d * 2 + 1]) / 3)) tri.push([a, b, d]); }
  }
  const flat = []; for (const [a, b, d] of tri) { const ar = (P[b * 2] - P[a * 2]) * (P[d * 2 + 1] - P[a * 2 + 1]) - (P[b * 2 + 1] - P[a * 2 + 1]) * (P[d * 2] - P[a * 2]); if (Math.abs(ar) > 1e-6) flat.push(a, b, d); }
  return { tri: flat, V, P };
}

// ---------- 一个部位的网格 ----------
// own：自己的格子；all：量厚度用的（往相邻部位多伸 SEAM 格，这样接头处不会捏细）
function partMesh(o) {
  const { N, own, all } = o;
  const dOwn = chamfer(own, N); let sMax = 0; for (let i = 0; i < own.length; i++) if (own[i] && dOwn[i] > sMax) sMax = dOwn[i]; sMax = Math.max(1, sMax);
  const c = Math.max(2, Math.min(o.step * Math.min(1, Math.max(0.3, sMax / 35)), sMax * 1.5));
  const outOwn = outsideDist(own, N);
  const geo = new Uint8Array(N * N); let any = false;
  for (let i = 0; i < geo.length; i++) { geo[i] = own[i] || (all[i] && outOwn[i] <= SEAM) ? 1 : 0; if (geo[i]) any = true; }
  if (!any) return null;
  const prof = boxBlur(signedDist(all, N), N, Math.max(1, Math.round(Math.min(c, sMax * 0.5))), 3);
  const half = Math.max(1, o.depth / 2), rr = Math.max(5, o.round) / 100;
  const hgt = (x, y) => { const i = Math.max(0, bilerp(prof, N, x, y)); const r = Math.max(1.5, half * rr); const s = Math.max(0, 1 - i / r); const ox = outOwn[Math.min(N - 1, Math.max(0, Math.floor(y))) * N + Math.min(N - 1, Math.max(0, Math.floor(x)))]; const t = 1 - 0.3 * Math.min(1, ox / 2); const h = half * Math.sqrt(Math.max(0, 1 - s * s)) * t; return h < 0.05 ? 0 : h; };
  const loops = traceLoops(geo, N).filter(l => Math.abs(loopArea(l)) >= c * c).map(l => simplifyLoop(l, Math.max(1, c * 0.15), c));
  if (!loops.length) return null;
  const pts = []; loops.forEach(l => pts.push(...l));
  const dGeo = chamfer(geo, N), idx = (x, y) => Math.min(N - 1, Math.max(0, Math.floor(y))) * N + Math.min(N - 1, Math.max(0, Math.floor(x)));
  const inset = c * 0.8;
  for (const l of loops) { const n = l.length / 2; for (let i = 0; i < n; i++) { const a = (i + n - 1) % n, b = (i + 1) % n; const dx = l[b * 2] - l[a * 2], dy = l[b * 2 + 1] - l[a * 2 + 1], L = Math.hypot(dx, dy) || 1;
    for (const sg of [1, -1]) { const x = l[i * 2] - sg * dy / L * inset, y = l[i * 2 + 1] + sg * dx / L * inset; if (geo[idx(x, y)] && dGeo[idx(x, y)] >= inset * 0.5) { pts.push(x, y); break; } } } }
  for (let y = 0; y < N; y += c) for (let x = 0; x < N; x += c) { const p = idx(x, y); if (geo[p] && dGeo[p] >= Math.min(c * 1.5, sMax * 0.6)) pts.push(x, y); }
  // 带约束的三角化：轮廓的每一段都一定是三角形的边，里面不会漏洞（以前用普通 Delaunay + 去掉细三角形，头发尖之间会破洞）
  const { tri: keep0, V, P: P2 } = fillPoly(pts, loops);
  pts.length = 0; pts.push(...P2);
  const hF = new Float32Array(V); for (let i = 0; i < V; i++) hF[i] = hgt(pts[i * 2], pts[i * 2 + 1]);
  const keep = keep0;
  // 轮廓上的点在合并重复点后的新编号
  loops.length = 0; loops.push(...fillPoly.lastLoops);
  // 顶点：x 往右，y 往上（画布 y 往下所以翻一下），z 朝前
  const P3 = (i, side) => [pts[i * 2], -pts[i * 2 + 1], side * hF[i] + (o.z || 0)];
  const nF = new Float32Array(V * 3), nB = new Float32Array(V * 3);
  const faces = { F: [], B: [] };
  for (let t = 0; t < keep.length; t += 3) for (const side of [1, -1]) {
    let ids = [keep[t], keep[t + 1], keep[t + 2]]; let p = ids.map(i => P3(i, side));
    let cz = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]);
    if (cz * side < 0) { ids = [ids[0], ids[2], ids[1]]; p = [p[0], p[2], p[1]]; }
    const ax = p[1][0] - p[0][0], ay = p[1][1] - p[0][1], az = p[1][2] - p[0][2], bx = p[2][0] - p[0][0], by = p[2][1] - p[0][1], bz = p[2][2] - p[0][2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const A = side > 0 ? nF : nB;
    ids.forEach(i => { A[i * 3] += nx; A[i * 3 + 1] += ny; A[i * 3 + 2] += nz; });
    (side > 0 ? faces.F : faces.B).push(ids);
  }
  const nrm = (i, side) => { let x = (side > 0 ? nF : nB)[i * 3], y = (side > 0 ? nF : nB)[i * 3 + 1], z = (side > 0 ? nF : nB)[i * 3 + 2]; if (hF[i] < 0.05) { const B = side > 0 ? nB : nF; x += B[i * 3]; y += B[i * 3 + 1]; z += B[i * 3 + 2]; } const L = Math.hypot(x, y, z) || 1; return [x / L, y / L, z / L]; };
  const out = { F: { p: [], n: [], g: [] }, B: { p: [], n: [], g: [] } };
  for (const side of ['F', 'B']) { const sg = side === 'F' ? 1 : -1; for (const ids of faces[side]) for (const i of ids) { out[side].p.push(...P3(i, sg)); out[side].n.push(...nrm(i, sg)); out[side].g.push(pts[i * 2], pts[i * 2 + 1]); } }
  // 侧面（用正面贴图的边缘颜色）
  // 侧面：朝外的方向直接看格子（往一边挪一点还在形状里，那边就是里面）——轮廓在细尖处会打结，按整圈的方向算会把一些侧面翻反、看着像破洞
  const inGeo = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); return xi >= 0 && yi >= 0 && xi < N && yi < N && !!geo[yi * N + xi]; };
  for (const l of loops) { const n = l.length;
    for (let i = 0; i < n; i++) { const a = l[i], b = l[(i + 1) % n]; if (hF[a] + hF[b] < 0.1) continue;
      const ax = pts[a * 2], ay = pts[a * 2 + 1], bx = pts[b * 2], by = pts[b * 2 + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      let cx = dy / L, cy = -dx / L; const mx = (ax + bx) / 2, my = (ay + by) / 2;
      let sc = 0; for (const r of [0.8, 1.6, 2.6]) sc += (inGeo(mx + cx * r, my + cy * r) ? 1 : 0) - (inGeo(mx - cx * r, my - cy * r) ? 1 : 0);
      if (sc > 0) { cx = -cx; cy = -cy; }
      const wx = cx, wy = -cy;   // 画布 y 朝下，世界 y 朝上
      const pa = P3(a, 1), pb = P3(b, 1), qa = P3(a, -1), qb = P3(b, -1);
      let quad = [pa, qa, qb, pa, qb, pb], g2 = [a, a, b, a, b, b];
      const ux = qa[0] - pa[0], uy = qa[1] - pa[1], uz = qa[2] - pa[2], vx = qb[0] - pa[0], vy = qb[1] - pa[1], vz = qb[2] - pa[2];
      const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz;
      if (gx * wx + gy * wy < 0) { quad = [pa, pb, qb, pa, qb, qa]; g2 = [a, b, b, a, b, a]; }
      const ins = 2.5;   // 侧面颜色往里取一点，别取到描边的黑线
      quad.forEach((q, k) => { out.F.p.push(...q); out.F.n.push(wx, wy, 0); out.F.g.push(pts[g2[k] * 2] - cx * ins, pts[g2[k] * 2 + 1] - cy * ins); });
    } }
  return out;
}

// ---------- 方块风格：一格一格的小方块，厚度照抱枕形取（再按格子取整）----------
function blockMesh(o) {
  const { N, own, all } = o, b = Math.max(2, o.block || 8);
  const outOwn = outsideDist(own, N), geo = new Uint8Array(N * N); let any = false;
  for (let i = 0; i < geo.length; i++) { geo[i] = own[i] || (all[i] && outOwn[i] <= SEAM) ? 1 : 0; if (geo[i]) any = true; }
  if (!any) return null;
  const dOwn = chamfer(own, N); let sMax = 0; for (let i = 0; i < own.length; i++) if (own[i] && dOwn[i] > sMax) sMax = dOwn[i];
  const prof = boxBlur(signedDist(all, N), N, Math.max(1, Math.round(Math.min(b, sMax * 0.5))), 2);
  const half = Math.max(1, o.depth / 2), rr = Math.max(5, o.round) / 100;
  const G = Math.ceil(N / b), H = new Float32Array(G * G);
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) { let n = 0, t = 0; for (let y = gy * b; y < Math.min(N, gy * b + b); y++) for (let x = gx * b; x < Math.min(N, gx * b + b); x++) { t++; if (geo[y * N + x]) n++; } if (n * 2 < t) continue;
    const cx = gx * b + b / 2, cy = gy * b + b / 2, i = Math.max(0, bilerp(prof, N, cx, cy)), r = Math.max(1.5, half * rr), sv = Math.max(0, 1 - i / r); let h = half * Math.sqrt(Math.max(0, 1 - sv * sv)); h = Math.max(b / 2, Math.round(h / (b / 2)) * (b / 2)); H[gy * G + gx] = h; }
  const out = { F: { p: [], n: [], g: [] }, B: { p: [], n: [], g: [] } }, z0 = o.z || 0;
  const quad = (side, v, n, g) => { const T = out[side]; [0, 1, 2, 0, 2, 3].forEach(k => { T.p.push(...v[k]); T.n.push(...n); if (g === 'uv') T.g.push(v[k][0], -v[k][1]); else T.g.push(g[0], g[1]); }); };
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) { const h = H[gy * G + gx]; if (!h) continue; const x0 = gx * b, x1 = x0 + b, y0 = -gy * b, y1 = y0 - b, cg = [x0 + b / 2, gy * b + b / 2];
    quad('F', [[x0, y0, z0 + h], [x0, y1, z0 + h], [x1, y1, z0 + h], [x1, y0, z0 + h]], [0, 0, 1], 'uv');
    quad('B', [[x1, y0, z0 - h], [x1, y1, z0 - h], [x0, y1, z0 - h], [x0, y0, z0 - h]], [0, 0, -1], 'uv');
    const nb = (dx, dy) => { const X = gx + dx, Y = gy + dy; return X < 0 || Y < 0 || X >= G || Y >= G ? 0 : H[Y * G + X]; };
    if (nb(-1, 0) < h) quad('F', [[x0, y0, z0 - h], [x0, y1, z0 - h], [x0, y1, z0 + h], [x0, y0, z0 + h]], [-1, 0, 0], cg);
    if (nb(1, 0) < h) quad('F', [[x1, y0, z0 + h], [x1, y1, z0 + h], [x1, y1, z0 - h], [x1, y0, z0 - h]], [1, 0, 0], cg);
    if (nb(0, -1) < h) quad('F', [[x0, y0, z0 - h], [x0, y0, z0 + h], [x1, y0, z0 + h], [x1, y0, z0 - h]], [0, 1, 0], cg);
    if (nb(0, 1) < h) quad('F', [[x0, y1, z0 + h], [x0, y1, z0 - h], [x1, y1, z0 - h], [x1, y1, z0 + h]], [0, -1, 0], cg); }
  return out;
}

// ---------- 着色器 ----------
const VS = `varying vec2 vUv; varying vec3 vPos; varying vec3 vN; varying vec3 vWN; varying vec3 vVN;
void main(){ vUv = uv; vPos = position; vN = normal; vWN = normalize(mat3(modelMatrix) * normal); vVN = normalMatrix * normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FS = `uniform sampler2D map; uniform vec3 lightDir; uniform float ambient; uniform float gain; uniform float dim; uniform float facet; uniform float cell;
varying vec2 vUv; varying vec3 vPos; varying vec3 vN; varying vec3 vWN; varying vec3 vVN;
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
void main(){
  vec3 c = texture2D(map, vUv).rgb;
  float tone = 1.0;
  if (facet > 0.0) { vec3 a = abs(vN); vec3 id = floor(vPos / cell); float r = a.z >= a.x && a.z >= a.y ? hash(vec3(id.xy, 1.0)) : (a.x >= a.y ? hash(vec3(id.zy, 2.0)) : hash(vec3(id.xz, 3.0))); tone = 1.0 + facet * 0.12 * (r * 2.0 - 1.0); }
  float d = max(dot(normalize(vWN), lightDir), 0.0);
  float sh = (ambient + (1.0 - ambient) * d) * gain * tone;
  float facing = abs(normalize(vVN).z);
  sh *= 1.0 - 0.38 * (1.0 - smoothstep(0.0, 0.45, facing));
  vec3 tint = vec3(pow(sh, 0.85), sh, pow(sh, 1.2));
  gl_FragColor = vec4(min(c * tint, vec3(1.0)) * dim, 1.0);
  #include <colorspace_fragment>
}`;
export function lightOf(yaw = 322, pitch = 57, contrast = 50) { const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180; const dir = new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)); const amb = 1 - contrast / 100; return { dir, amb, gain: 1 / (amb + (1 - amb) * dir.z) }; }
export function lpMaterial(tex, opt = {}) {
  const L = lightOf(opt.yaw, opt.pitch, opt.contrast);
  return new THREE.ShaderMaterial({ side: THREE.DoubleSide, vertexShader: VS, fragmentShader: FS, uniforms: { map: { value: tex }, lightDir: { value: L.dir }, ambient: { value: L.amb }, gain: { value: L.gain }, dim: { value: 1 }, facet: { value: (opt.facet || 0) / 100 }, cell: { value: opt.cell || 10 } } });
}

// 透明格子补成旁边的颜色（贴图边缘不发白）
export function bleed(cv) {
  const N = cv.width, H = cv.height, x = cv.getContext('2d'), im = x.getImageData(0, 0, N, H), d = im.data, q = [], seen = new Uint8Array(N * H);
  for (let i = 0; i < N * H; i++) if (d[i * 4 + 3] > 8) { seen[i] = 1; q.push(i); }
  for (let h = 0; h < q.length; h++) { const p = q[h], px = p % N, py = (p - px) / N; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= H) continue; const n = ny * N + nx; if (seen[n]) continue; seen[n] = 1; d[n * 4] = d[p * 4]; d[n * 4 + 1] = d[p * 4 + 1]; d[n * 4 + 2] = d[p * 4 + 2]; q.push(n); } }
  for (let i = 0; i < N * H; i++) d[i * 4 + 3] = 255;
  const o = document.createElement('canvas'); o.width = N; o.height = H; o.getContext('2d').putImageData(im, 0, 0); return o;
}
const texOf = (cv, px) => { const t = new THREE.CanvasTexture(bleed(cv)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (px) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; } return t; };

// ---------- 整个小人 ----------
// front/back：N×N 画布（背面是从后面看的样子，左右会翻过来贴）；labels：N×N（LP_PARTS 的编号）
export function buildDoll(d) {
  const N = d.N, L = d.labels, P = d.parts || {}, gThick = (d.thick == null ? 100 : d.thick) / 100, gRound = (d.round == null ? 100 : d.round) / 100, step = (d.step || 20) * N / 256;
  // 跟网站一样：头发就是头的一部分，整颗头一块网格（分两块的话接缝处会凹凸不平）
  const masks = {}; for (let id = 1; id < LP_PARTS.length - 1; id++) { const m = new Uint8Array(N * N); let n = 0; for (let i = 0; i < m.length; i++) if (L[i] === id || (id === 1 && L[i] === 7)) { m[i] = 1; n++; } if (n) masks[LP_PARTS[id]] = m; }
  // 量厚度用的 all：往「上一级」部位伸进去 SEAM 格
  const near = (own, other) => { if (!own) return null; if (!other) return own; const out = outsideDist(own, N), a = own.slice(); for (let i = 0; i < a.length; i++) if (other[i] && out[i] <= SEAM) a[i] = 1; return a; };
  // 头和头发当成一整颗来量厚度（网站上头发就画在头里）：不然头发是一圈细环，量出来是扁的
  const headAll = (() => { if (!masks.head && !masks.hair) return null; const u = new Uint8Array(N * N); for (let i = 0; i < u.length; i++) if ((masks.head && masks.head[i]) || (masks.hair && masks.hair[i])) u[i] = 1; return u; })();
  let allOf = { head: masks.head ? headAll : null, hair: masks.hair ? headAll : null, body: near(masks.body, masks.head), armL: near(masks.armL, masks.body), armR: near(masks.armR, masks.body), legL: near(masks.legL, masks.body), legR: near(masks.legR, masks.body) };
  // 骨头的转轴（kkeist 的放法：头 = 头的底边中点；手 = 靠身体那一侧的上角往里一点；脚 = 顶边中点）
  const bb = m => { if (!m) return null; let x0 = N, x1 = -1, y0 = N, y1 = -1; for (let i = 0; i < m.length; i++) if (m[i]) { const x = i % N, y = (i - x) / N; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return x1 < 0 ? null : { x0, x1: x1 + 1, y0, y1: y1 + 1 }; };
  const B = {}; Object.keys(masks).forEach(k => B[k] = bb(masks[k]));
  const all = bb((() => { const m = new Uint8Array(N * N); for (let i = 0; i < m.length; i++) if (L[i]) m[i] = 1; return m; })()) || { x0: N / 4, x1: N * 3 / 4, y0: 0, y1: N };
  const body = B.body || all, ax = (body.x0 + body.x1) / 2;
  const headB = B.head || B.hair;
  const piv = {
    root: [ax, all.y1], body: [(body.x0 + body.x1) / 2, body.y1],
    head: headB ? [(headB.x0 + headB.x1) / 2, Math.min(headB.y1, body.y0 + 2)] : [ax, body.y0],
    armL: arm(B.armL, 'armL'), armR: arm(B.armR, 'armR'),
    legL: B.legL ? [(B.legL.x0 + B.legL.x1) / 2, B.legL.y0 + Math.min(2, (B.legL.y1 - B.legL.y0) * 0.1)] : [ax + 4, body.y1],
    legR: B.legR ? [(B.legR.x0 + B.legR.x1) / 2, B.legR.y0 + Math.min(2, (B.legR.y1 - B.legR.y0) * 0.1)] : [ax - 4, body.y1]
  };
  // 有骨架（摆了动作的图）：转轴用骨架上的关节点；挡在身子前面的手（叉腰、抱胸）那块也算进身子，手掰下来以后身子不缺一块
  const rig = d.skel && d.skel.length === 15 ? skelRig(d.skel, { straight: d.straight }) : null;
  if (rig) {
    Object.keys(rig.piv).forEach(k => { if (k === 'body' || k === 'head' || masks[k] || (k === 'head' && masks.hair)) piv[k] = rig.piv[k]; });
    if (masks.body) { const T = rig.torso, cx = T.reduce((a, p) => a + p[0], 0) / 4, cy = T.reduce((a, p) => a + p[1], 0) / 4, Q = T.map(p => [cx + (p[0] - cx) * 1.12, cy + (p[1] - cy) * 1.08]), sw = Math.hypot(T[0][0] - T[1][0], T[0][1] - T[1][1]) * 0.28;
      // 身子（加两个肩点）的凸包：手挡住的那块身子在凸包里
      const hp = [rig.piv.armL, rig.piv.armR]; for (let y = 0; y < N; y++) { let x0 = -1, x1 = -1; for (let x = 0; x < N; x++) if (masks.body[y * N + x]) { if (x0 < 0) x0 = x; x1 = x; } if (x0 >= 0) hp.push([x0, y], [x1 + 1, y]); }
      hp.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
      for (const p of hp) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (let i = hp.length - 1; i >= 0; i--) { const p = hp[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      const hull = lo.slice(0, -1).concat(up.slice(0, -1));
      const inH = (x, y) => { if (hull.length < 3) return false; for (let i = 0; i < hull.length; i++) { const a = hull[i], b = hull[(i + 1) % hull.length]; if (cr(a, b, [x, y]) < 0) return false; } return true; };
      const inQ = (x, y) => { let c = false; for (let i = 0, j = 3; i < 4; j = i++) { const [xi, yi] = Q[i], [xj, yj] = Q[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
      for (const k of ['armL', 'armR']) { if (!masks[k] || !(rig.rot[k])) continue; const sp = rig.piv[k]; for (let i = 0; i < N * N; i++) if (masks[k][i]) { const x = i % N, y = (i - x) / N; if (inQ(x + 0.5, y + 0.5) || inH(x + 0.5, y + 0.5) || Math.hypot(x + 0.5 - sp[0], y + 0.5 - sp[1]) < sw) masks.body[i] = 1; } }
      allOf.body = near(masks.body, masks.head); }
    const hm = masks.head || masks.hair; if (hm) { const hc = d.skel[0], nk = d.skel[1], hr = Math.hypot(hc[0] - nk[0], hc[1] - nk[1]) * 0.92; let add = 0;
      for (const k of ['armL', 'armR']) { if (!masks[k] || !(rig.rot[k])) continue; for (let i = 0; i < N * N; i++) if (masks[k][i]) { const x = i % N, y = (i - x) / N; if ((x - hc[0]) ** 2 + (y - hc[1]) ** 2 < hr * hr && y < nk[1]) { hm[i] = 1; add++; } } }
      if (add && headAll) for (let i = 0; i < N * N; i++) if (hm[i]) headAll[i] = 1; }
  }
  function arm(b, k) { if (!b) return [k === 'armL' ? body.x1 : body.x0, body.y0 + 2]; const w = b.x1 - b.x0, r = Math.min(w, b.y1 - b.y0) * 0.3; const inner = Math.abs(b.x1 - ax) < Math.abs(b.x0 - ax) ? b.x1 - r : b.x0 + r; return [inner, b.y0 + r]; }
  const figH = Math.max(1, all.y1 - all.y0);
  // 骨头
  const root = new THREE.Group(), bones = {};
  ['root', 'body', 'head', 'armL', 'armR', 'legL', 'legR'].forEach(n => { bones[n] = new THREE.Group(); bones[n].name = n; });
  const parent = { body: 'root', head: 'body', armL: 'body', armR: 'body', legL: 'root', legR: 'root' };
  root.add(bones.root); Object.keys(parent).forEach(n => bones[parent[n]].add(bones[n]));
  const W3 = p => [p[0], -p[1]];
  Object.keys(bones).forEach(n => { const p = W3(piv[n]), q = parent[n] ? W3(piv[parent[n]]) : [0, 0]; bones[n].position.set(p[0] - q[0], p[1] - q[1], 0); });
  // 整体：脚底在 0，水平居中，高度 1
  const s = 1 / figH; root.scale.setScalar(s); root.position.set(-ax * s, all.y1 * s, 0);
  const texF = texOf(d.front, d.pixel || d.shape === 'block'), texB = texOf(d.back || d.front, d.pixel || d.shape === 'block');
  const look = { yaw: d.lightYaw, pitch: d.lightPitch, contrast: d.lightContrast, facet: d.facet || 0, cell: N / (48 - (d.facetSize == null ? 50 : d.facetSize) * 0.36) };
  const matF = lpMaterial(texF, look), matB = lpMaterial(texB, look);
  const mirror = !!d.backMirror;
  Object.keys(masks).forEach(name => {
    let def = LP_DEF[name] || [16, 40]; const pp = P[name] || {};
    if ((name === 'head' || name === 'hair') && headB) { const hw = (Math.max(B.head ? B.head.x1 - B.head.x0 : 0, B.hair ? B.hair.x1 - B.hair.x0 : 0)) * 256 / N; def = [Math.round(hw * 0.77) + 0, 100]; }
    const m = (d.shape === 'block' ? blockMesh : partMesh)({ N, block: (d.block || 8) * N / 256, own: masks[name], all: allOf[name], depth: (pp.depth != null ? pp.depth : def[0]) * N / 256 * gThick, round: (pp.round != null ? pp.round : def[1]) * gRound, step, z: (pp.z || 0) * N / 256 });
    if (!m) return;
    const bone = bones[BONE[name]], pv = W3(piv[BONE[name]]);
    const geo = new THREE.BufferGeometry(), pos = [], nor = [], uv = [];
    m.F.p.forEach((v, i) => pos.push(i % 3 === 0 ? v - pv[0] : i % 3 === 1 ? v - pv[1] : v)); nor.push(...m.F.n); for (let i = 0; i < m.F.g.length; i += 2) uv.push(m.F.g[i] / N, 1 - m.F.g[i + 1] / N);
    const nF = m.F.p.length / 3;
    m.B.p.forEach((v, i) => pos.push(i % 3 === 0 ? v - pv[0] : i % 3 === 1 ? v - pv[1] : v)); nor.push(...m.B.n); for (let i = 0; i < m.B.g.length; i += 2) uv.push(mirror ? 1 - m.B.g[i] / N : m.B.g[i] / N, 1 - m.B.g[i + 1] / N);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.addGroup(0, nF, 0); geo.addGroup(nF, m.B.p.length / 3, 1); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, [matF, matB]); mesh.castShadow = true; mesh.name = name; bone.add(mesh);
  });
  const rot = rig ? rig.rot : {};
  return { rot, root, bones, matF, matB, texF, texB, pixel: !!(d.pixel || d.shape === 'block'), legLen: (all.y1 - piv.root[1] + (piv.root[1] - (B.legL ? B.legL.y0 : body.y1))) * s, mats: [matF, matB] };
}
