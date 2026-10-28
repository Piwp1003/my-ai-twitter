// 🦴 骨架：图里的人摆了动作（举手、叉腰、跑、腿分开）时，光靠「上面是头、中间是身子、两边是手」分不对。
// 改成先定 15 个关节点（自动猜 / AI 看图找 / 自己拖），再按「离哪根骨头最近（沿着人身上走，跨描线算远）」给每个格子分部位；
// 建模的时候再把举起来的手、分开的腿「掰」回自然下垂，这样挥手、走路这些动作还是对的。
// 点的顺序（L = 角色自己的左边 = 图上右边）：
export const SK = ['head', 'neck', 'hip', 'shL', 'elL', 'haL', 'shR', 'elR', 'haR', 'hpL', 'knL', 'ftL', 'hpR', 'knR', 'ftR'];
export const SK_CN = { head: '头', neck: '脖子', hip: '胯', shL: '左肩', elL: '左肘', haL: '左手', shR: '右肩', elR: '右肘', haR: '右手', hpL: '左胯', knL: '左膝', ftL: '左脚', hpR: '右胯', knR: '右膝', ftR: '右脚' };
export const SK_BONES = [['head', 'neck', 1], ['neck', 'hip', 2], ['shL', 'shR', 2], ['hpL', 'hpR', 2], ['shL', 'elL', 3], ['elL', 'haL', 3], ['shR', 'elR', 4], ['elR', 'haR', 4], ['hpL', 'knL', 5], ['knL', 'ftL', 5], ['hpR', 'knR', 6], ['knR', 'ftR', 6]];
const ix = n => SK.indexOf(n);
export const skAt = (S, n) => S[ix(n)];

// 从现成的部位（自动分的 / 改过的）猜关节
export function skelFromLabels(L, N) {
  const box = {}, cen = {}, px = {};
  for (let i = 0; i < L.length; i++) { let v = L[i]; if (!v) continue; if (v === 7) v = 1; const x = i % N, y = (i - x) / N; const b = box[v] || (box[v] = { x0: N, x1: -1, y0: N, y1: -1 }); b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); const c = cen[v] || (cen[v] = [0, 0, 0]); c[0] += x; c[1] += y; c[2]++; (px[v] || (px[v] = [])).push(i); }
  let all = { x0: N, x1: -1, y0: N, y1: -1 }; Object.values(box).forEach(b => { all.x0 = Math.min(all.x0, b.x0); all.x1 = Math.max(all.x1, b.x1); all.y0 = Math.min(all.y0, b.y0); all.y1 = Math.max(all.y1, b.y1); });
  if (all.x1 < 0) all = { x0: N * 0.3, x1: N * 0.7, y0: N * 0.05, y1: N * 0.97 };
  const H = all.y1 - all.y0, mid = (all.x0 + all.x1) / 2;
  const C = v => cen[v] ? [cen[v][0] / cen[v][2], cen[v][1] / cen[v][2]] : null;
  const head = C(1) || [mid, all.y0 + H * 0.22];
  const body = box[2] || { x0: mid - H * 0.12, x1: mid + H * 0.12, y0: all.y0 + H * 0.45, y1: all.y0 + H * 0.75 };
  const ax = (body.x0 + body.x1) / 2, bw = body.x1 - body.x0, bh = body.y1 - body.y0;
  const neck = [ax, body.y0], hip = [ax, body.y1];
  const shL = [body.x1 - bw * 0.12, body.y0 + bh * 0.12], shR = [body.x0 + bw * 0.12, body.y0 + bh * 0.12];
  const far = (v, from, fb) => { const P = px[v]; if (!P) return fb; let best = null, bd = -1; for (const i of P) { const x = i % N, y = (i - x) / N, d = (x - from[0]) ** 2 + (y - from[1]) ** 2; if (d > bd) { bd = d; best = [x, y]; } } return best; };
  const near = (v, to, fb) => { const P = px[v]; if (!P) return fb; let best = null, bd = 1e12; for (const i of P) { const x = i % N, y = (i - x) / N, d = (x - to[0]) ** 2 + (y - to[1]) ** 2; if (d < bd) { bd = d; best = [x, y]; } } return best; };
  const midp = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const haL = far(3, shL, [shL[0] + bw * 0.2, shL[1] + bh * 0.8]), haR = far(4, shR, [shR[0] - bw * 0.2, shR[1] + bh * 0.8]);
  const elL = near(3, midp(shL, haL), midp(shL, haL)), elR = near(4, midp(shR, haR), midp(shR, haR));
  const hpL = [ax + bw * 0.22, body.y1 - 2], hpR = [ax - bw * 0.22, body.y1 - 2];
  const low = (v, fb) => { const b = box[v]; if (!b || !px[v]) return fb; let s = 0, n = 0; for (const i of px[v]) { const x = i % N, y = (i - x) / N; if (y >= b.y1 - 3) { s += x; n++; } } return [n ? s / n : (b.x0 + b.x1) / 2, b.y1 - 2]; };
  const ftL = low(5, [hpL[0], all.y1 - 2]), ftR = low(6, [hpR[0], all.y1 - 2]);
  const knL = near(5, midp(hpL, ftL), midp(hpL, ftL)), knR = near(6, midp(hpR, ftR), midp(hpR, ftR));
  const S = { head, neck, hip, shL, elL, haL, shR, elR, haR, hpL, knL, ftL, hpR, knR, ftR };
  return SK.map(n => S[n].map(v => Math.round(v * 10) / 10));
}

// AI 给的（0~1000 的坐标）→ 方格里的
export function skelFromAI(j, N) { if (!j) return null; const out = []; for (const n of SK) { const p = j[n]; if (!Array.isArray(p) || p.length < 2 || !isFinite(+p[0]) || !isFinite(+p[1])) return null; out.push([Math.max(0, Math.min(N - 1, +p[0] / 1000 * N)), Math.max(0, Math.min(N - 1, +p[1] / 1000 * N))]); } return out; }

// 按骨架分部位：每个有颜色的格子 → 「沿着身上走」最近的那根骨头；跨过描线 / 颜色突变要多走几步，所以分界会贴着描线
export function labelsFromSkel(rgba, N, S) {
  const A = i => rgba[i * 4 + 3] > 40, M = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) M[i] = A(i) ? 1 : 0;
  const P = n => S[ix(n)];
  const cost = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (!M[i]) continue; let g = 0; const c = (j) => Math.abs(rgba[i * 4] - rgba[j * 4]) + Math.abs(rgba[i * 4 + 1] - rgba[j * 4 + 1]) + Math.abs(rgba[i * 4 + 2] - rgba[j * 4 + 2]); if (x + 1 < N && M[i + 1]) g = Math.max(g, c(i + 1)); if (y + 1 < N && M[i + N]) g = Math.max(g, c(i + N)); if (x > 0 && M[i - 1]) g = Math.max(g, c(i - 1)); if (y > 0 && M[i - N]) g = Math.max(g, c(i - N)); const lum = 0.3 * rgba[i * 4] + 0.59 * rgba[i * 4 + 1] + 0.11 * rgba[i * 4 + 2]; cost[i] = 1 + Math.min(300, g) * 0.035 + (lum < 60 ? 2.5 : 0); }
  const dist = new Float64Array(N * N).fill(1e9), lab = new Uint8Array(N * N);
  // 小顶堆
  const hp = [], hv = [];
  const push = (i, d) => { hp.push(i); hv.push(d); let k = hp.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (hv[p] <= hv[k]) break; [hp[p], hp[k]] = [hp[k], hp[p]]; [hv[p], hv[k]] = [hv[k], hv[p]]; k = p; } };
  const pop = () => { const i = hp[0], d = hv[0], li = hp.pop(), lv = hv.pop(); if (hp.length) { hp[0] = li; hv[0] = lv; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < hp.length && hv[l] < hv[m]) m = l; if (r < hp.length && hv[r] < hv[m]) m = r; if (m === k) break; [hp[m], hp[k]] = [hp[k], hp[m]]; [hv[m], hv[k]] = [hv[k], hv[m]]; k = m; } } return [i, d]; };
  const seed = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N) return; const i = y * N + x; if (!M[i] || dist[i] === 0) return; dist[i] = 0; lab[i] = v; push(i, 0); };
  const seg = (a, b, v, t0 = 0, t1 = 1) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L * 2)); for (let k = 0; k <= n; k++) { const t = t0 + (t1 - t0) * k / n; seed(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, v); } };
  // 头：脖子到头中心那段的一半当半径的圆
  const hd = P('head'), nk = P('neck'), hr = Math.max(4, Math.hypot(hd[0] - nk[0], hd[1] - nk[1]) * 0.5);
  for (let y = -hr; y <= hr; y++) for (let x = -hr; x <= hr; x++) if (x * x + y * y <= hr * hr) seed(hd[0] + x, hd[1] + y, 1);
  // 身子：脖子—胯 + 两肩连线 + 两胯连线（四肢从关节往外 18% 才开始，关节那一圈留给身子）
  seg(P('neck'), P('hip'), 2, 0.08, 1); seg(P('shL'), P('shR'), 2); seg(P('hpL'), P('hpR'), 2);
  seg(P('shL'), P('elL'), 3, 0.18); seg(P('elL'), P('haL'), 3); seg(P('shR'), P('elR'), 4, 0.18); seg(P('elR'), P('haR'), 4);
  seg(P('hpL'), P('knL'), 5, 0.18); seg(P('knL'), P('ftL'), 5); seg(P('hpR'), P('knR'), 6, 0.18); seg(P('knR'), P('ftR'), 6);
  while (hp.length) { const [i, d] = pop(); if (d > dist[i]) continue; const x = i % N, y = (i - x) / N;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const n = ny * N + nx; if (!M[n]) continue; const nd = d + cost[n] * (dx && dy ? 1.414 : 1); if (nd < dist[n]) { dist[n] = nd; lab[n] = lab[i]; push(n, nd); } } }
  // 没连上的小块（呆毛、飘着的发丝）：跟最近的有标签的格子走
  { const q = []; for (let i = 0; i < N * N; i++) if (lab[i]) q.push(i); for (let h = 0; h < q.length; h++) { const p = q[h], x = p % N, y = (p - x) / N; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const n = ny * N + nx; if (lab[n]) continue; lab[n] = lab[p]; q.push(n); } } for (let i = 0; i < N * N; i++) if (!M[i]) lab[i] = 0; }
  // 头发：头顶的颜色，从头往下连着走（披肩发、双马尾），但不跑进身子 / 手脚的骨头附近
  let top = N; for (let i = 0; i < N * N; i++) if (M[i]) { top = (i / N) | 0; break; }
  const cs = []; for (let y = top; y < top + Math.max(6, (nk[1] - top) * 0.22); y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (M[i] && lab[i] === 1) { const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2]; if (0.3 * r + 0.59 * g + 0.11 * b > 35 || cs.length < 4) cs.push([r, g, b]); } }
  if (cs.length > 8) {
    const med = k => { const v = cs.map(c => c[k]).sort((a, b) => a - b); return v[v.length >> 1]; }, HC = [med(0), med(1), med(2)];
    const nearHair = i => Math.abs(rgba[i * 4] - HC[0]) + Math.abs(rgba[i * 4 + 1] - HC[1]) + Math.abs(rgba[i * 4 + 2] - HC[2]) < 95;
    const segD = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L2)) : 0; return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy); };
    const limbR = Math.max(3, Math.hypot(P('shL')[0] - P('shR')[0], P('shL')[1] - P('shR')[1]) * 0.22);
    const nearCore = (x, y) => segD(x, y, P('neck'), P('hip')) < limbR * 1.2;
    const before = lab.slice();
    const q = []; for (let i = 0; i < N * N; i++) if (lab[i] === 1 && nearHair(i)) { lab[i] = 7; q.push(i); }
    while (q.length) { const p = q.pop(), x = p % N, y = (p - x) / N; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const n = ny * N + nx; if (!M[n] || lab[n] === 7 || lab[n] === 0) continue; if (!nearHair(n)) continue; if (lab[n] === 2 && nearCore(nx, ny)) continue; lab[n] = 7; q.push(n); } }
    // 衣服和头发一个颜色时，手脚会被当成头发整个吃掉：哪只手 / 脚几乎不剩了，就把骨头附近的还给它
    for (let v = 3; v <= 6; v++) { let n0 = 0, n1 = 0; for (let i = 0; i < N * N; i++) if (before[i] === v) { n0++; if (lab[i] === v) n1++; } if (n0 > 20 && n1 < n0 * 0.15 && n1 < 40) { const bs = SK_BONES.filter(b => b[2] === v); for (let i = 0; i < N * N; i++) if (before[i] === v && lab[i] === 7) { const x = i % N, y = (i - x) / N; if (bs.some(([a, b]) => segD(x, y, P(a), P(b)) < limbR)) lab[i] = v; } } }
    let nh = 0, nf = 0; for (let i = 0; i < N * N; i++) { if (lab[i] === 7) nh++; if (lab[i] === 1) nf++; } if (nh < 60 || nf < 60) for (let i = 0; i < N * N; i++) if (lab[i] === 7) lab[i] = 1;
  }
  return lab;
}

// 建模用：关节的转轴、把手脚掰回下垂要转多少（绕 z 轴，弧度；世界里 y 朝上）
export function skelRig(S, opt = {}) {
  const P = n => S[ix(n)];
  const ang = (a, b) => Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
  const wrap = t => { while (t > Math.PI) t -= Math.PI * 2; while (t < -Math.PI) t += Math.PI * 2; return t; };
  const fix = (a, b, out, min) => { const want = Math.atan2(-Math.cos(out), Math.sin(out)); const t = wrap(want - ang(a, b)); return Math.abs(t) < min ? 0 : t; };
  const rot = {};
  if (opt.straight !== false) {
    rot.armL = fix(P('shL'), P('haL'), 0.14, 0.12); rot.armR = fix(P('shR'), P('haR'), -0.14, 0.12);
    rot.legL = fix(P('hpL'), P('ftL'), 0.03, 0.08); rot.legR = fix(P('hpR'), P('ftR'), -0.03, 0.08);
    const h = wrap(Math.PI / 2 - ang(P('neck'), P('head'))); rot.head = Math.abs(h) < 0.15 ? 0 : h;
  }
  return { piv: { head: P('neck'), body: P('hip'), armL: P('shL'), armR: P('shR'), legL: P('hpL'), legR: P('hpR') }, rot, torso: [P('shL'), P('shR'), P('hpR'), P('hpL')] };
}

// 不靠部位、直接从轮廓找关节（摆了动作的图用）：头 = 上面最大的内切圆；从脖子沿着身子「走中间」到各处，
// 走得最远的几个尖 = 手、脚（颜色像头发的尖是发梢，不算）；肩 / 胯在去手脚的路上，肘 / 膝取中点。
export function skelAuto(rgba, N) {
  const M = new Uint8Array(N * N); let top = N, bot = -1; for (let i = 0; i < N * N; i++) if (rgba[i * 4 + 3] > 40) { M[i] = 1; const y = (i / N) | 0; top = Math.min(top, y); bot = Math.max(bot, y); }
  if (bot < 0) return null; const fh = bot - top + 1;
  // 到外面的距离
  const D = new Float32Array(N * N); for (let i = 0; i < N * N; i++) D[i] = M[i] ? 1e6 : 0;
  const g = (x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? 0 : D[y * N + x];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const p = y * N + x; if (D[p]) D[p] = Math.min(D[p], g(x - 1, y) + 1, g(x, y - 1) + 1, g(x - 1, y - 1) + 1.4, g(x + 1, y - 1) + 1.4); }
  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const p = y * N + x; if (D[p]) D[p] = Math.min(D[p], g(x + 1, y) + 1, g(x, y + 1) + 1, g(x + 1, y + 1) + 1.4, g(x - 1, y + 1) + 1.4); }
  let hr = 0, hx = N / 2, hy = top; for (let y = top; y <= top + fh * 0.5; y++) for (let x = 0; x < N; x++) { const d = D[y * N + x]; if (d > hr) { hr = d; hx = x; hy = y; } }
  const neck = [hx, Math.min(bot - 2, hy + hr * 1.0)];
  // 头发颜色（头顶）
  const cs = []; for (let y = top; y < top + hr * 0.4; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (M[i]) cs.push(i); }
  const med = k => { const v = cs.map(i => rgba[i * 4 + k]).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : -999; }, HC = [med(0), med(1), med(2)];
  const hairish = (x, y) => { let n = 0, h = 0; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = Math.round(x) + dx, yy = Math.round(y) + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const i = yy * N + xx; if (!M[i]) continue; n++; if (Math.abs(rgba[i * 4] - HC[0]) + Math.abs(rgba[i * 4 + 1] - HC[1]) + Math.abs(rgba[i * 4 + 2] - HC[2]) < 110) h++; } return n && h > n * 0.5; };
  // 从脖子出发的测地距离（走中间：离边越近越贵）
  const dist = new Float64Array(N * N).fill(1e9), prev = new Int32Array(N * N).fill(-1), hp = [], hv = [];
  const push = (i, d) => { hp.push(i); hv.push(d); let k = hp.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (hv[p] <= hv[k]) break; [hp[p], hp[k]] = [hp[k], hp[p]]; [hv[p], hv[k]] = [hv[k], hv[p]]; k = p; } };
  const pop = () => { const i = hp[0], d = hv[0], li = hp.pop(), lv = hv.pop(); if (hp.length) { hp[0] = li; hv[0] = lv; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < hp.length && hv[l] < hv[m]) m = l; if (r < hp.length && hv[r] < hv[m]) m = r; if (m === k) break; [hp[m], hp[k]] = [hp[k], hp[m]]; [hv[m], hv[k]] = [hv[k], hv[m]]; k = m; } } return [i, d]; };
  let s0 = Math.round(neck[1]) * N + Math.round(neck[0]); if (!M[s0]) { let bd = 1e9; for (let i = 0; i < N * N; i++) if (M[i]) { const x = i % N, y = (i - x) / N, d = (x - neck[0]) ** 2 + (y - neck[1]) ** 2; if (d < bd) { bd = d; s0 = i; } } }
  dist[s0] = 0; push(s0, 0);
  while (hp.length) { const [i, d] = pop(); if (d > dist[i]) continue; const x = i % N, y = (i - x) / N;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const n = ny * N + nx; if (!M[n]) continue; const nd = d + (dx && dy ? 1.414 : 1) * (1 + 4 / (D[n] + 0.5)); if (nd < dist[n]) { dist[n] = nd; prev[n] = i; push(n, nd); } } }
  // 尖：7×7 里测地距离最大、离脖子够远
  const tips = []; const w = Math.max(4, Math.round(hr * 0.35));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (!M[i] || dist[i] > 1e8 || D[i] > 3) continue; const v = dist[i]; if (v < hr * 1.2) continue; let mx = true; for (let dy = -w; dy <= w && mx; dy++) for (let dx = -w; dx <= w; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx; if (M[j] && dist[j] < 1e8 && dist[j] > v) { mx = false; break; } } if (mx) tips.push({ x, y, v, i }); }
  // 头附近的尖（头顶、发梢在头旁边）不要
  const inHead = t => (t.x - hx) ** 2 + (t.y - hy) ** 2 < (hr * 1.02) ** 2;
  let cand = tips.filter(t => !inHead(t) && !(t.y < neck[1] && hairish(t.x, t.y)));
  // 合并挨得很近的
  cand.sort((a, b) => b.v - a.v); const uniq = []; for (const t of cand) if (!uniq.some(u => Math.hypot(u.x - t.x, u.y - t.y) < hr * 0.6)) uniq.push(t);
  // 脚：最低的两个（在下面 35% 里）
  // 脚：最下面一条里有颜色的几段，取最大的两段的中点
  const feet = []; { const y0 = Math.round(bot - Math.max(3, fh * 0.05)), cols = new Uint16Array(N); for (let y = y0; y <= bot; y++) for (let x = 0; x < N; x++) if (M[y * N + x]) cols[x]++;
    const runs = []; let st = -1; for (let x = 0; x <= N; x++) { const on = x < N && cols[x] > 0; if (on && st < 0) st = x; if (!on && st >= 0) { let m = 0, sx = 0; for (let k = st; k < x; k++) { m += cols[k]; sx += k * cols[k]; } runs.push({ x0: st, x1: x - 1, m, cx: sx / m }); st = -1; } }
    runs.sort((a, b) => b.m - a.m); const two = runs.slice(0, 2).filter(r => r.m > 4);
    if (two.length === 1) { const r = two[0], q = (r.x1 - r.x0) / 4; feet.push({ x: r.cx + q, y: bot - 2 }, { x: r.cx - q, y: bot - 2 }); }
    else two.sort((a, b) => b.cx - a.cx).forEach(r => feet.push({ x: r.cx, y: bot - 2 })); }
  const isFoot = t => t.y > bot - fh * 0.2 && feet.some(f => Math.abs(f.x - t.x) < hr * 0.7);
  const rest = uniq.filter(t => !isFoot(t) && !hairish(t.x, t.y)).sort((a, b) => b.v - a.v).slice(0, 2).sort((a, b) => b.x - a.x);
  const path = t => { const P = []; let i = t.i, k = 0; while (i >= 0 && k++ < 4000) { P.push([i % N, (i / N) | 0, dist[i]]); i = prev[i]; } return P.reverse(); };   // 从脖子到尖
  const along = (P, f) => { const L = P[P.length - 1][2], tgt = L * f; for (const p of P) if (p[2] >= tgt) return [p[0], p[1]]; return [P[P.length - 1][0], P[P.length - 1][1]]; };
  // 身子：脖子往下到两只脚分叉的地方
  const ax = neck[0];
  let hip = [ax, neck[1] + (bot - neck[1]) * 0.45];
  let ftL = feet[0] ? [feet[0].x, feet[0].y] : [ax + hr * 0.4, bot - 2], ftR = feet[1] ? [feet[1].x, feet[1].y] : [ax - hr * 0.4, bot - 2];
  feet.forEach(f => { let best = -1, bd = 1e9; for (let dy = -4; dy <= 2; dy++) for (let dx = -4; dx <= 4; dx++) { const x = Math.round(f.x) + dx, y = Math.round(f.y) + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue; const i = y * N + x; if (M[i] && dist[i] < 1e8 && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = i; } } f.i = best; });
  if (feet.length === 2 && feet[0].i >= 0 && feet[1].i >= 0) { const P1 = path(feet[0]), P2 = path(feet[1]); let j = 0; while (j < P1.length && j < P2.length && Math.hypot(P1[j][0] - P2[j][0], P1[j][1] - P2[j][1]) < 3) j++; const sp = P1[Math.max(0, j - 1)]; if (sp && sp[1] > neck[1] + hr * 0.5) hip = [sp[0], sp[1]]; }
  else if (feet.length === 1) { ftR = [ftL[0] - hr * 0.5, ftL[1]]; }
  const hw = Math.max(3, hr * 0.32);
  const hpL = [hip[0] + hw, hip[1]], hpR = [hip[0] - hw, hip[1]];
  const knL = [(hpL[0] + ftL[0]) / 2, (hpL[1] + ftL[1]) / 2], knR = [(hpR[0] + ftR[0]) / 2, (hpR[1] + ftR[1]) / 2];
  // 手：从脖子出发的两条路；肩在路上「离开身子」那点附近（取到脖子距离 ≈ 头半径 0.7 的点）
  // 身子宽：脖子到胯之间、中线那一段宽度的 25% 分位（手贴着身子的行会偏宽，所以取偏小的）
  const ws = []; for (let y = Math.round(neck[1] + 2); y < hip[1] - 2; y++) { let x0 = Math.round(ax), x1 = x0; if (!M[y * N + x0]) continue; while (x0 > 0 && M[y * N + x0 - 1]) x0--; while (x1 < N - 1 && M[y * N + x1 + 1]) x1++; ws.push(x1 - x0 + 1); }
  ws.sort((a, b) => a - b); const tw = ws.length ? ws[Math.floor(ws.length * 0.25)] : hr;
  const shY = neck[1] + Math.max(2, (hip[1] - neck[1]) * 0.12);
  const arm = (t, side) => { if (!t) { const sh = [ax + side * tw * 0.4, shY]; return [sh, [sh[0] + side * 4, sh[1] + hr * 0.5], [sh[0] + side * 6, sh[1] + hr]]; } const P = path(t); const shp = [ax + side * tw * 0.4, shY]; let sh = P[0], bd = 1e9; for (const p of P) { const d = Math.hypot(p[0] - shp[0], p[1] - shp[1]); if (d < bd) { bd = d; sh = p; } } const ha = [t.x, t.y], rest2 = P.filter(p => p[2] >= sh[2]), el = rest2.length > 2 ? along(rest2, 0.5) : [(shp[0] + ha[0]) / 2, (shp[1] + ha[1]) / 2]; return [shp, el, ha]; };
  // 手多半是肤色：头外面、胯上面、不挨着脖子的肤色小块，取离脖子最远的那点（找到的比上面猜的尖更可信）
  { const sc = []; for (let y = Math.round(hy - hr * 0.2); y < hy + hr * 0.3; y++) for (let x = Math.round(hx - hr * 0.3); x < hx + hr * 0.3; x++) { const i = y * N + x; if (i >= 0 && i < N * N && M[i]) sc.push(i); }
    const md = k => { const v = sc.map(i => rgba[i * 4 + k]).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : -999; }, SCc = [md(0), md(1), md(2)];
    const skin = i => Math.abs(rgba[i * 4] - SCc[0]) + Math.abs(rgba[i * 4 + 1] - SCc[1]) + Math.abs(rgba[i * 4 + 2] - SCc[2]) < 80;
    const face = new Uint8Array(N * N); { const q = []; for (const i of sc) if (skin(i)) { face[i] = 1; q.push(i); } while (q.length) { const p = q.pop(), x = p % N, y = (p - x) / N; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const k = ny * N + nx; if (!face[k] && M[k] && skin(k)) { face[k] = 1; q.push(k); } } } }
    const ok = i => { const x = i % N, y = (i - x) / N; return M[i] && !face[i] && skin(i) && y < hip[1]; };
    const seen = new Uint8Array(N * N), blobs = [];
    for (let s0 = 0; s0 < N * N; s0++) { if (seen[s0] || !ok(s0)) continue; const q = [s0]; seen[s0] = 1; let n = 0, best = null; while (q.length) { const p = q.pop(); n++; if (!best || dist[p] > dist[best]) best = p; const x = p % N, y = (p - x) / N; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const k = ny * N + nx; if (!seen[k] && ok(k)) { seen[k] = 1; q.push(k); } } } if (n >= Math.max(6, hr * hr * 0.006) && dist[best] < 1e8) blobs.push({ x: best % N, y: (best / N) | 0, v: dist[best], i: best, n }); }
    // 挨着脖子的（下巴下面那块）不要；挨得近的几块是同一只手（手 + 露出来的手腕）
    const bl = blobs.filter(b => Math.hypot(b.x - neck[0], b.y - neck[1]) > hr * 0.5).sort((a, b) => b.v - a.v), mg = [];
    for (const b of bl) { const m = mg.find(u => Math.hypot(u.x - b.x, u.y - b.y) < hr * 0.6); if (m) m.n += b.n; else mg.push(Object.assign({}, b)); }
    // 每边挑一只：先用肤色找到的，没有就用上面走得最远的尖
    const pick = side => { const c = mg.filter(b => Math.sign(b.x - ax) === side).sort((a, b) => b.n * 0.3 + b.v - (a.n * 0.3 + a.v))[0]; return c || rest.find(t => Math.sign(t.x - ax) === side) || null; };
    const hL = pick(1), hR = pick(-1); rest.length = 0; if (hL) rest.push(hL); if (hR) rest.push(hR); }
  let A = rest[0], B = rest[1];
  if (A && !B) { if (A.x < ax) { B = A; A = null; } }
  const [shL, elL, haL] = arm(A, 1), [shR, elR, haR] = arm(B, -1);
  const S = { head: [hx, hy], neck, hip, shL, elL, haL, shR, elR, haR, hpL, knL, ftL, hpR, knR, ftR };
  return SK.map(n => S[n].map(v => Math.round(v * 10) / 10));
}

// 是不是摆了动作：有手 / 脚要掰 0.6 弧度（35°）以上
export function skelPosed(S) { const r = skelRig(S).rot; return Object.keys(r).some(k => k !== 'head' && Math.abs(r[k]) > 0.6); }
