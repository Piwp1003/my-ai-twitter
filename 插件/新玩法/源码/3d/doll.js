// 🖼️ 一张图 → 低模小人要的东西：抠背景、裁边、放进方格、自动分头 / 头发 / 身体 / 手 / 脚、没有背面就自己做一张
import { cutBg } from './pic.js';

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function dist(inside, N, H) { H = H || N; const r = new Float32Array(N * H), BIG = 1e6; for (let i = 0; i < r.length; i++) r[i] = inside[i] ? BIG : 0; const g = (x, y) => (x < 0 || y < 0 || x >= N || y >= H) ? 0 : r[y * N + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < N; x++) { const p = y * N + x; if (r[p]) r[p] = Math.min(r[p], g(x - 1, y) + 3, g(x, y - 1) + 3, g(x - 1, y - 1) + 4, g(x + 1, y - 1) + 4); }
  for (let y = H - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const p = y * N + x; if (r[p]) r[p] = Math.min(r[p], g(x + 1, y) + 3, g(x, y + 1) + 3, g(x + 1, y + 1) + 4, g(x - 1, y + 1) + 4); }
  for (let i = 0; i < r.length; i++) r[i] /= 3; return r; }

// 自动分部位（N×N 的 RGBA）：1 头 2 身体 3 左手（图右） 4 右手（图左） 5 左脚（图右） 6 右脚（图左） 7 头发
export function autoLabels2(rgba, N, opt = {}) {
  const A = i => rgba[i * 4 + 3] > 40, L = new Uint8Array(N * N), M = new Uint8Array(N * N);
  let top = N, bot = -1; for (let i = 0; i < N * N; i++) if (A(i)) { M[i] = 1; const y = (i / N) | 0; top = Math.min(top, y); bot = Math.max(bot, y); }
  if (bot < 0) return L;
  const fh = bot - top + 1, D = dist(M, N);
  // 头：上面 45% 里最大的内切圆
  let hr = 0, hx = N / 2, hy = top; for (let y = top; y <= top + fh * 0.45; y++) for (let x = 0; x < N; x++) { const d = D[y * N + x]; if (d > hr) { hr = d; hx = x; hy = y; } }
  const neck = Math.round(Math.min(top + fh * (opt.headMax || 0.66), Math.max(top + fh * 0.3, opt.neck != null ? top + fh * opt.neck : hy + hr * 0.95)));
  const runs = y => { const r = []; let s = -1; for (let x = 0; x <= N; x++) { const on = x < N && M[y * N + x]; if (on && s < 0) s = x; if (!on && s >= 0) { r.push([s, x - 1]); s = -1; } } return r; };
  const axisRun = (y, ax) => { let best = null, bd = 1e9; for (const r of runs(y)) { const d = ax < r[0] ? r[0] - ax : ax > r[1] ? ax - r[1] : 0; if (d < bd) { bd = d; best = r; } } return best; };
  // 身体的中线：脖子以下几行的中点
  let ax = hx; { let s = 0, n = 0; for (let y = neck; y < Math.min(bot, neck + fh * 0.12); y++) { const r = axisRun(y, hx); if (r) { s += (r[0] + r[1]) / 2; n++; } } if (n) ax = s / n; }
  // 腿：从下往上，中线那里有空隙的连续几行
  let legTop = -1; { let streak = 0, start = -1; for (let y = bot; y > neck; y--) { const R = runs(y); const gap = R.some((r, i) => i + 1 < R.length && r[1] < ax + 3 && R[i + 1][0] > ax - 3); if (gap) { if (start < 0) start = y; streak++; legTop = y; } else if (start >= 0) break; else if (bot - y > fh * 0.1) break; } if (streak < 3) legTop = -1; }
  if (opt.leg != null) legTop = Math.round(top + fh * opt.leg);
  if (legTop < 0) legTop = Math.round(bot - fh * 0.13);
  // 身体宽：脖子到腿之间，中线那一段宽度的 25% 分位
  const ws = []; for (let y = neck; y < legTop; y++) { const r = axisRun(y, ax); if (r) ws.push(r[1] - r[0] + 1); } ws.sort((a, b) => a - b);
  const bw = (ws.length ? ws[Math.floor(ws.length * 0.25)] : fh * 0.2) * (opt.body || 1);
  // 头发颜色：头最上面 12% 的中位色（跳过描线那种很暗的）
  const cs = []; for (let y = top; y <= top + fh * 0.1; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (!M[i]) continue; const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2]; if (lum(r, g, b) > 35 || cs.length < 4) cs.push([r, g, b]); }
  const med = k => { const v = cs.map(c => c[k]).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : 80; }; const HC = [med(0), med(1), med(2)];
  const nearHair = i => Math.abs(rgba[i * 4] - HC[0]) + Math.abs(rgba[i * 4 + 1] - HC[1]) + Math.abs(rgba[i * 4 + 2] - HC[2]) < (opt.hairTol || 90);
  // 先粗分
  for (let y = top; y <= bot; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (!M[i]) continue;
    if (y < neck) L[i] = 1;
    else if (y >= legTop) L[i] = 255;   // 待定：下面再分腿
    else if (Math.abs(x - ax) <= bw / 2 + 1) L[i] = 2; else L[i] = 254; }   // 254：手或者垂下来的头发
  // 腿：最下面那段，中线左右最近的两条
  for (let y = legTop; y <= bot; y++) { const R = runs(y); for (const r of R) { const mid = (r[0] + r[1]) / 2, near = Math.abs(mid - ax) < bw * 0.9 + 4 || (r[0] <= ax && r[1] >= ax); for (let x = r[0]; x <= r[1]; x++) { const i = y * N + x; if (L[i] !== 255) continue; L[i] = near ? (x >= ax ? 5 : 6) : 254; } } }
  // 254 的连通块：颜色像头发、挨着头 → 头发；不然是手（按在中线哪边）
  const seen = new Uint8Array(N * N);
  for (let s = 0; s < N * N; s++) { if (L[s] !== 254 || seen[s]) continue; const q = [s], cells = []; seen[s] = 1; let touchHead = 0, hairish = 0, sx = 0;
    while (q.length) { const p = q.pop(); cells.push(p); const x = p % N, y = (p - x) / N; sx += x; if (nearHair(p)) hairish++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const n = ny * N + nx; if (L[n] === 1) touchHead++; if (L[n] === 254 && !seen[n]) { seen[n] = 1; q.push(n); } } }
    const isHair = touchHead >= 3 && hairish > cells.length * 0.45;
    const lab = isHair ? 7 : (sx / cells.length >= ax ? 3 : 4); cells.forEach(p => L[p] = lab); }
  // 头里分出头发：从顶上开始、颜色像头发、连在一起的
  { const q = []; for (let i = 0; i < N * N; i++) if ((L[i] === 1) && ((i / N) | 0) <= top + fh * 0.08 && nearHair(i)) { L[i] = 7; q.push(i); }
    while (q.length) { const p = q.pop(), x = p % N, y = (p - x) / N; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const n = ny * N + nx; if (L[n] === 1 && nearHair(n)) { L[n] = 7; q.push(n); } } } }
  // 描线这种细缝：头 / 头发之间做两遍 5×5 多数票
  for (let pass = 0; pass < 2; pass++) { const C = L.slice(); for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) { const i = y * N + x; if (C[i] !== 1 && C[i] !== 7) continue; let a = 0, b = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const v = C[(y + dy) * N + x + dx]; if (v === 1) a++; else if (v === 7) b++; } L[i] = b > a ? 7 : 1; } }
  // 头发太少（比如光头 / 帽子）就都算头
  let nh = 0, nf = 0; for (let i = 0; i < N * N; i++) { if (L[i] === 7) nh++; if (L[i] === 1) nf++; } if (nh < 60 || nf < 60) for (let i = 0; i < N * N; i++) if (L[i] === 7) L[i] = 1;
  for (let i = 0; i < N * N; i++) if (L[i] === 255 || L[i] === 254) L[i] = 2;
  return L;
}

// 背面：衣服照正面，头和头发那一块涂成头发的颜色（描边留着）
export function backFromFront(front, labels, N) {
  const c = document.createElement('canvas'); c.width = N; c.height = N; const x = c.getContext('2d'); x.drawImage(front, 0, 0, N, N);
  const im = x.getImageData(0, 0, N, N), d = im.data;
  let r = 0, g = 0, b = 0, n = 0, top = N, bot = 0;
  for (let i = 0; i < N * N; i++) if ((labels[i] === 7 || labels[i] === 1) && d[i * 4 + 3] > 200) { const y = (i / N) | 0; top = Math.min(top, y); bot = Math.max(bot, y); if (labels[i] === 7 && lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) > 30) { r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; n++; } }
  if (!n) { for (let i = 0; i < N * N; i++) { const y = (i / N) | 0; if (labels[i] === 1 && y < top + (bot - top) * 0.15 && d[i * 4 + 3] > 200) { r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; n++; } } }
  if (!n) return c;
  r /= n; g /= n; b /= n;
  const inner = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) inner[i] = labels[i] === 1 || labels[i] === 7 ? 1 : 0; const dd = dist(inner, N);
  for (let i = 0; i < N * N; i++) { if (!inner[i] || dd[i] < 2.2 || d[i * 4 + 3] < 30) continue; const y = (i / N) | 0, k = 1 - 0.16 * (y - top) / (bot - top + 1); d[i * 4] = r * k; d[i * 4 + 1] = g * k; d[i * 4 + 2] = b * k; }
  // 几道发丝
  x.putImageData(im, 0, 0); x.strokeStyle = `rgba(${r * 0.7 | 0},${g * 0.7 | 0},${b * 0.7 | 0},.8)`; x.lineWidth = 1.2;
  let hx = 0, hn = 0; for (let i = 0; i < N * N; i++) if (inner[i]) { hx += i % N; hn++; } hx = hn ? hx / hn : N / 2;
  for (let k = -3; k <= 3; k++) { x.beginPath(); x.moveTo(hx + k * 3, top + 6); x.quadraticCurveTo(hx + k * 10, (top + bot) / 2, hx + k * 14, bot - 6); x.stroke(); }
  // 线别画出界
  const im2 = x.getImageData(0, 0, N, N); for (let i = 0; i < N * N; i++) if (!inner[i] && labels[i] === 0) im2.data[i * 4 + 3] = 0; else if (!inner[i]) { im2.data[i * 4] = im.data[i * 4]; im2.data[i * 4 + 1] = im.data[i * 4 + 1]; im2.data[i * 4 + 2] = im.data[i * 4 + 2]; im2.data[i * 4 + 3] = im.data[i * 4 + 3]; }
  x.putImageData(im2, 0, 0);
  return c;
}

// 任意一张图 → 方格里的低模小人数据
// opt: {cut 抠背景, back 背面图（从后面看的）, labels/W/H 老数据的标签, N}
export function imageToDoll(img, opt = {}) {
  const N = opt.N || 256;
  const src = document.createElement('canvas'); src.width = img.naturalWidth || img.width; src.height = img.naturalHeight || img.height; src.getContext('2d').drawImage(img, 0, 0);
  if (opt.cut !== false && !opt.labels) cutBg(src, opt.tol || 38);
  const sd = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
  let x0 = src.width, x1 = -1, y0 = src.height, y1 = -1; for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) if (sd[(y * src.width + x) * 4 + 3] > 30) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = src.width - 1; y1 = src.height - 1; }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = Math.min(N * 0.94 / bh, N * 0.94 / bw), dw = bw * k, dh = bh * k, ox = (N - dw) / 2, oy = N * 0.975 - dh;
  const put = (s) => { const c = document.createElement('canvas'); c.width = N; c.height = N; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(s, x0, y0, bw, bh, ox, oy, dw, dh); return c; };
  const front = put(src);
  let labels;
  if (opt.labels) { labels = new Uint8Array(N * N); const sx = src.width / opt.W, sy = src.height / opt.H; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = Math.floor(((x - ox) / k + x0) / sx), v = Math.floor(((y - oy) / k + y0) / sy); if (u >= 0 && v >= 0 && u < opt.W && v < opt.H) labels[y * N + x] = opt.labels[v * opt.W + u]; } const fd = front.getContext('2d').getImageData(0, 0, N, N).data; for (let i = 0; i < N * N; i++) if (fd[i * 4 + 3] < 40) labels[i] = 0; }
  else labels = autoLabels2(front.getContext('2d').getImageData(0, 0, N, N).data, N, opt.auto || {});
  let back = null, backMirror = false;
  if (opt.back) {   // 背面图跟正面画在同样大小、同样位置（从后面看）：左右翻过来，再用正面的裁切 / 缩放放进方格，这样和正面一格对一格
    const b = document.createElement('canvas'); b.width = src.width; b.height = src.height; const bx = b.getContext('2d'); bx.translate(b.width, 0); bx.scale(-1, 1); bx.drawImage(opt.back, 0, 0, b.width, b.height);
    if (opt.cut !== false && !opt.labels) cutBg(b, opt.tol || 38);
    back = put(b); backMirror = false; }
  if (!back) back = backFromFront(front, labels, N);
  return { kind: 'doll', N, front, back, labels, backMirror };
}
