/* =====================================================================
   js/map3d.js —— 🗺️ 3D 地图（📱 软件）的 3D 部分
   开机不加载：第一次打开「3D 地图」时由 插件/软件/源码/75-3D地图.js 挂上来（它管登记、数据、提示词、自主行动）。
   用 GY3D 里带的 three.js（js/vendor/gy3d.min.js，跟 3D 小人同一个），不联网。
   · 地点来自「行程与天气」（0~100 的坐标），按名字认出是什么地方（面馆、医院、山上的寺……）搭房子，自动连路
   · 两种风格：toy 圆滚滚 / low 低模；人比房子矮（人约 2 格，平房 3~5 格 + 房顶）
   · 小人：有「3D 小人」就用捏好的（gyx3dAvFor），没有用简单小人
   · window.gysMap3dBoot(API, opt)：opt.focus 打开就看着某个角色；opt.invite 打开就看 TA 的邀请
   ===================================================================== */
(function () {
window.gysMap3dBoot = function (A, opt) {
const old = document.getElementById('gysMap3d'); if (old) old.remove();
const THREE = window.GY3D.THREE;
const D = A.D, LOW = D.style === 'low', K = (toy, low) => LOW ? low : toy;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pick1 = a => a[Math.floor(Math.random() * a.length)];
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const M10 = 10, PS = .34;
const mobile = Math.min(innerWidth, innerHeight) < 600;

/* ================= 页面 ================= */
const root = document.createElement('div'); root.id = 'gysMap3d'; root.setAttribute('data-gy-overlay', ''); root.className = 'gm3' + (LOW ? ' low' : '');
root.innerHTML = `<style>${CSS}</style>
  <canvas class="cv"></canvas><div class="tags"></div>
  <div class="top"><button class="pill bk" type="button" data-k="close" aria-label="返回">‹</button><label class="search"><span aria-hidden="true">⌕</span><input type="search" placeholder="搜地点，或者找 TA" autocomplete="off"></label><button class="pill" type="button" data-k="set" aria-label="天气、时间和设置"><span class="wxi">☀︎</span><b class="clock">--:--</b></button></div>
  <div class="side"><button class="rb on" type="button" data-k="3d">3D</button><button class="rb" type="button" data-k="me">我</button><button class="rb" type="button" data-k="all">全城</button></div>
  <div class="pop" hidden></div>
  <div class="trip" hidden><div class="t1"><div class="tt"></div><span class="tr"></span></div><div class="bar"><i></i></div></div>
  <div class="toast" style="opacity:0"></div>
  <section class="sheet"><button class="grab" type="button" aria-label="收起或展开"></button><div class="sc"></div></section>`;
document.body.appendChild(root);
const $ = s => root.querySelector(s);
const sc = $('.sc'), sheet = $('.sheet'), tags = $('.tags');
let alive = true, raf = 0;
function close() { if (!alive) return; alive = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); try { PEOPLE.forEach(p => p.av && p.av.dispose && p.av.dispose()); } catch (e) {} try { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); } catch (e) {} const ed = document.getElementById('gysMap3dWayOv'); if (ed) ed.remove(); if (root.isConnected) root.remove(); }
const ob = new MutationObserver(() => { if (!root.isConnected) { close(); ob.disconnect(); } }); ob.observe(document.body, { childList: true });
let tt; function toast(t) { const e = $('.toast'); e.textContent = t; e.style.opacity = 1; clearTimeout(tt); tt = setTimeout(() => e.style.opacity = 0, 2800); }

/* ================= 数据：地点 → 坐标、类型 ================= */
const DD = A.data();
const TYPES = [
  ['temple', /寺|庙|观|教堂|祠|庵/, '⛩️'], ['mount', /山|峰|岭|坡|顶|崖/, '⛰️'], ['water', /江|河|湖|海|堤|岸|码头|桥|港|滩|泳/, '🌊'], ['hos', /医院|诊所|卫生|药/, '🏥'], ['gov', /政府|局|委|大院|法院|公安|派出所|警|机关/, '🏛️'],
  ['school', /学校|大学|中学|小学|学院|图书馆|校/, '🏫'], ['factory', /厂|工地|仓库|开发区|基地|车间/, '🏭'], ['station', /车站|机场|地铁|高铁|站$/, '🚉'], ['market', /市场|夜市|集市|商场|超市|摊|街$/, '🏮'],
  ['tea', /茶/, '🍵'], ['bar', /酒吧|KTV|会所|夜店|酒馆/, '🍸'], ['eat', /面|饭|餐|食|烧烤|咖啡|奶茶|饮|馆|店|铺|楼/, '🍜'], ['tower', /公寓|大楼|大厦|写字楼|公司|集团|中心|酒店|宾馆|小区/, '🏙️'], ['park', /公园|园|林|花|树|广场/, '🌳'], ['home', /家|宿舍|住|屋/, '🏠']
];
const CATTYPE = { eat: 'eat', life: 'home', work: 'tower', fun: 'market', quiet: 'park', meet: 'eat' };
function typeOf(s) { const n = s.name + ' '; for (const [t, re] of TYPES) if (re.test(n)) return t; return CATTYPE[s.cat] || 'home'; }
const ICON = Object.fromEntries(TYPES.map(t => [t[0], t[2]]));
const ZONE = { home: 'town', eat: 'town', tea: 'town', bar: 'town', market: 'town', tower: 'city', gov: 'city', hos: 'city', school: 'city', station: 'city', factory: 'ind', park: 'nature', water: 'nature', temple: 'nature', mount: 'nature' };
const PLACES = DD.spots.map(s => ({ id: s.id, n: s.name, desc: s.desc || '', type: typeOf(s), x: (+s.x - 50) * 2.6, z: (+s.y - 50) * 2.0, mapName: s.mapName, faction: s.faction }));
// 挨太近的推开一点
for (let it = 0; it < 40; it++) for (let i = 0; i < PLACES.length; i++) for (let j = i + 1; j < PLACES.length; j++) { const a = PLACES[i], b = PLACES[j]; let dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < 16) { if (d < .01) { dx = 1; dz = 0; d = 1; } const k = (16 - d) / 2; a.x -= dx / d * k; a.z -= dz / d * k; b.x += dx / d * k; b.z += dz / d * k; } }
PLACES.forEach(p => { p.x = Math.round(p.x); p.z = Math.round(p.z); p.door = [p.x, p.z]; });
const P = Object.fromEntries(PLACES.map(p => [p.id, p]));

/* ================= 路：最小生成树 + 近邻，拐直角 ================= */
const SEG = [];
(function () {
  const n = PLACES.length; if (n < 2) return;
  const inT = new Set([0]), E = [], dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  while (inT.size < n) { let best = null; inT.forEach(i => { for (let j = 0; j < n; j++) if (!inT.has(j)) { const d = dist(PLACES[i], PLACES[j]); if (!best || d < best[2]) best = [i, j, d]; } }); inT.add(best[1]); E.push(best); }
  const avg = E.reduce((a, e) => a + e[2], 0) / E.length, has = (i, j) => E.some(e => (e[0] === i && e[1] === j) || (e[0] === j && e[1] === i));
  for (let i = 0; i < n; i++) { const nb = PLACES.map((p, j) => [j, dist(PLACES[i], p)]).filter(x => x[0] !== i).sort((a, b) => a[1] - b[1]).slice(0, 2); nb.forEach(([j, d]) => { if (!has(i, j) && d < avg * 1.5) E.push([i, j, d]); }); }
  E.forEach(([i, j], k) => { const a = PLACES[i], b = PLACES[j]; const hFirst = (i + j + k) % 2 === 0; const c = hFirst ? [b.x, a.z] : [a.x, b.z]; const w = 3.4;
    if (Math.hypot(c[0] - a.x, c[1] - a.z) > .5) SEG.push([[a.x, a.z], c, w]); if (Math.hypot(b.x - c[0], b.z - c[1]) > .5) SEG.push([c, [b.x, b.z], w]); });
})();
const nodes = [], edges = new Map(), nodeAt = new Map();
const key = (x, z) => x.toFixed(2) + ',' + z.toFixed(2);
function addNode(x, z) { const k = key(x, z); if (nodeAt.has(k)) return nodeAt.get(k); const i = nodes.length; nodes.push([x, z]); nodeAt.set(k, i); edges.set(i, []); return i; }
function segInter(a, b, c, d) { const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null; const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den; return t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6 ? [a[0] + t * r[0], a[1] + t * r[1]] : null; }
function projSeg(p, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz; let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L : 0; t = Math.max(0, Math.min(1, t)); const q = [a[0] + t * dx, a[1] + t * dz]; return { q, t, d: Math.hypot(p[0] - q[0], p[1] - q[1]) }; }
(function () {
  const pts = SEG.map(s => [s[0], s[1]]);
  for (let i = 0; i < SEG.length; i++) for (let j = 0; j < SEG.length; j++) { if (i === j) continue; if (j > i) { const q = segInter(SEG[i][0], SEG[i][1], SEG[j][0], SEG[j][1]); if (q) { pts[i].push(q); pts[j].push(q); } } for (const e of [SEG[j][0], SEG[j][1]]) if (projSeg(e, SEG[i][0], SEG[i][1]).d < .01) pts[i].push(e); }
  SEG.forEach((s, i) => { const a = s[0], b = s[1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const on = pts[i].map(q => ({ q, t: Math.hypot(q[0] - a[0], q[1] - a[1]) / L })).sort((u, v) => u.t - v.t);
    for (let k = 1; k < on.length; k++) { const u = addNode(...on[k - 1].q), v = addNode(...on[k].q); if (u === v) continue; const w = Math.hypot(nodes[u][0] - nodes[v][0], nodes[u][1] - nodes[v][1]); edges.get(u).push([v, w]); edges.get(v).push([u, w]); } });
  PLACES.forEach(p => { p.node = addNode(p.x, p.z); });
})();
function route(fromId, toId) {
  if (!P[fromId] || !P[toId]) return { pl: [], len: 0 };
  const s = P[fromId].node, t = P[toId].node, dist = new Map([[s, 0]]), prev = new Map(), done = new Set();
  while (true) { let u = -1, best = Infinity; for (const [k, v] of dist) if (!done.has(k) && v < best) { best = v; u = k; } if (u < 0 || u === t) break; done.add(u); for (const [v, w] of edges.get(u)) { const nd = best + w; if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); } } }
  const path = []; let c = t; if (!prev.has(t) && s !== t) { const a = P[fromId].door, b = P[toId].door; return { pl: [a, b], len: Math.hypot(a[0] - b[0], a[1] - b[1]) }; }
  while (c !== undefined) { path.unshift(nodes[c]); c = prev.get(c); }
  let len = 0; for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return { pl: path, len };
}
const crow = (a, b) => Math.hypot(P[a].door[0] - P[b].door[0], P[a].door[1] - P[b].door[1]);
// 房子放在路边：挑一个没路的方向
PLACES.forEach(p => {
  const used = SEG.filter(s => projSeg([p.x, p.z], s[0], s[1]).d < .1).map(s => { const o = Math.hypot(s[0][0] - p.x, s[0][1] - p.z) < .1 ? s[1] : s[0]; return [Math.sign(Math.round(o[0] - p.x)), Math.sign(Math.round(o[1] - p.z))]; });
  const dirs = [[0, -1], [0, 1], [1, 0], [-1, 0]].filter(d => !used.some(u => u[0] === d[0] && u[1] === d[1]));
  const d = dirs[0] || [1, 1]; p.dir = d; const off = p.type === 'mount' || p.type === 'temple' ? 12 : p.type === 'water' ? 9 : 6.5;
  p.at = [p.x + d[0] * off, p.z + d[1] * off];
});

/* ================= 场景 ================= */
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('.cv'), antialias: !mobile }); } catch (e) { close(); A.toast('这台设备画不了 3D', '可以用「行程与天气」的 2D 地图'); return; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2)); renderer.shadowMap.enabled = !D.low; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xbfe6fb, 200, 500);
const cam = new THREE.PerspectiveCamera(36, 1, .5, 1800);
const hemi = new THREE.HemisphereLight(0xffffff, 0x9ec98a, 1.4); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3df, 2.2); sun.castShadow = !D.low; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
let BX0 = Math.min(...PLACES.map(p => p.at[0]), ...PLACES.map(p => p.x)) - 34, BX1 = Math.max(...PLACES.map(p => p.at[0]), ...PLACES.map(p => p.x)) + 34, BZ0 = Math.min(...PLACES.map(p => p.at[1]), ...PLACES.map(p => p.z)) - 30, BZ1 = Math.max(...PLACES.map(p => p.at[1]), ...PLACES.map(p => p.z)) + 30;
if (!isFinite(BX0)) { BX0 = -60; BX1 = 60; BZ0 = -50; BZ1 = 50; }
const CX = (BX0 + BX1) / 2, CZ = (BZ0 + BZ1) / 2, W0 = BX1 - BX0, H0 = BZ1 - BZ0;
Object.assign(sun.shadow.camera, { left: -W0 * .65, right: W0 * .65, top: H0 * .7, bottom: -H0 * .7, near: 10, far: 700 }); sun.shadow.bias = -.0006; sun.target.position.set(CX, 0, CZ); scene.add(sun, sun.target);

const LOWMAP = new Map([[0xfff3e2, 0xf0ece2], [0xff7f6e, 0x3e4d5c], [0xfff6e8, 0xf3efe4], [0xd9483b, 0x46505a], [0xfff0d6, 0xe7dfcf], [0x7a5cd6, 0x384451], [0xb9805a, 0x6b4b36], [0xeaf6ff, 0xe9eeec], [0xff6f8f, 0xd8443a], [0xe6dcff, 0xe3e6ea], [0xd6ecff, 0xd9dde2], [0xff6f6f, 0xd9583f], [0x4fc59a, 0x2f7f8a], [0xffb84d, 0xe0a33a], [0xff9a6a, 0xc9a17a], [0x6a4fb8, 0x5a3a2c], [0xf3e9d6, 0xbdb6a6], [0xe3e7ea, 0xb9b2a4], [0xff8a6a, 0x9d958a], [0xffd37a, 0xd9c07e], [0xa8714a, 0x7a5c44], [0x63c35a, 0x6fa05b], [0x9ad65a, 0x8fb35a], [0xb6e27a, 0x9cc06c], [0x4dad6a, 0x55875a], [0x5cc078, 0x55875a], [0xffb3cc, 0x6fa05b], [0xffe1e8, 0xe8e2d6], [0xe2f4ff, 0xdde3e0], [0xfff6c9, 0xdcd8cc], [0xe8e3ff, 0xd5dce2], [0xdff7e8, 0xe6e9ec], [0x5fb8f0, 0x4c5763], [0x8a7bff, 0x35404c], [0xff8fb3, 0x3f4c5a], [0xfff1e0, 0xeceae5], [0xe1f7ea, 0xe6e9ec], [0xe9e6e0, 0xa9a598], [0xf0e6d6, 0xb7ae9c], [0xe2e9ee, 0x9fa3a0], [0xff9a7a, 0x8f8a82], [0xf4e7cf, 0x6f7672], [0xf8eedc, 0x8b8f86], [0x8fd46d, 0xc6ccb6], [0xf6dfa8, 0xd2c9ad], [0x7fcb63, 0x8fae7a], [0xfff8ee, 0xf8f6f0], [0xff4b3e, 0xd23b30], [0x6b3fa0, 0x3a3346], [0x3d2a5c, 0x2a2730]]);
const MC = {}; const m = c => { if (LOW && LOWMAP.has(c)) c = LOWMAP.get(c); return MC[c] || (MC[c] = new THREE.MeshLambertMaterial({ color: c, flatShading: LOW })); };
const SG = (r, w = 16, h = 12, ...rest) => new THREE.SphereGeometry(r, LOW ? Math.max(5, Math.round(w / 3)) : w, LOW ? Math.max(3, Math.round(h / 3)) : h, ...rest);
// 圆角方块（自己写的：分段的方块，每个点往里收到内框再按半径推出去）
function RB(w, h, d, r) {
  if (LOW) return new THREE.BoxGeometry(w, h, d);
  r = Math.min(r, w / 2 - .01, h / 2 - .01, d / 2 - .01); const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4), p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), q = new THREE.Vector3(), hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); q.set(Math.max(-hw, Math.min(hw, v.x)), Math.max(-hh, Math.min(hh, v.y)), Math.max(-hd, Math.min(hd, v.z))); const dir = v.clone().sub(q); if (dir.lengthSq() < 1e-9) continue; dir.normalize(); v.copy(q).addScaledVector(dir, r); p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, dir.x, dir.y, dir.z); }
  return g;
}
function mesh(geo, color, x, y, z, shadow = true) { const o = new THREE.Mesh(geo, typeof color === 'number' ? m(color) : color); o.position.set(x, y, z); o.castShadow = shadow && !D.low; o.receiveShadow = true; scene.add(o); return o; }

// 山包：山 / 寺 下面垫一座小山
const HILLS = PLACES.filter(p => p.type === 'mount' || p.type === 'temple').map(p => ({ x: p.at[0], z: p.at[1], r: 18, h: 10 }));
function hY(x, z) { let y = 0; HILLS.forEach(h => { const d = Math.hypot(x - h.x, z - h.z); if (d < h.r) y = Math.max(y, h.h * Math.sqrt(1 - (d / h.r) ** 2)); }); return y; }
const baseY = p => hY(p[0], p[1]) + .35;
// 地：圆滚滚是一座小岛（沙滩 + 海），低模是一块平地
const sea = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshLambertMaterial({ color: K(0x55c9e8, 0x9aa69a), flatShading: LOW })); sea.rotation.x = -Math.PI / 2; sea.position.y = -3.2; sea.receiveShadow = true; scene.add(sea);
if (!LOW) mesh(RB(W0 + 14, 4, H0 + 14, 14), 0xf6dfa8, CX, -3, CZ, false);
mesh(RB(W0, 4, H0, 12), K(0x8fd46d, 0xc6ccb6), CX, -2, CZ, false);
HILLS.forEach(h => { const g = mesh(SG(h.r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), 0x7fcb63, h.x, 0, h.z); g.scale.y = h.h / h.r; });
const ponds = [];
PLACES.filter(p => p.type === 'water').forEach(p => { const L = 34, Wd = 11, horiz = p.dir[1] !== 0; const cx = p.x + p.dir[0] * 13, cz = p.z + p.dir[1] * 13; const w = new THREE.Mesh(RB(horiz ? L : Wd, .8, horiz ? Wd : L, .35), new THREE.MeshLambertMaterial({ color: K(0x5fd0ec, 0x6aa5bd), flatShading: LOW })); w.position.set(cx, -.15, cz); w.receiveShadow = true; scene.add(w); ponds.push({ x: cx, z: cz, hw: (horiz ? L : Wd) / 2 + 1, hd: (horiz ? Wd : L) / 2 + 1, m: w }); });
const inPond = (x, z, r = 0) => ponds.some(q => Math.abs(x - q.x) < q.hw + r && Math.abs(z - q.z) < q.hd + r);
// 路：沿地面铺的带子（上山会跟着坡）
const roadM = m(0xf4e7cf), dashM = m(0xffffff);
function strip(pl, w, y0, mat) { const v = [], idx = []; let k = 0; const pts = []; for (let i = 1; i < pl.length; i++) { const a = pl[i - 1], b = pl[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 3)); for (let s = 0; s < n; s++) pts.push([a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n]); } pts.push(pl[pl.length - 1]);
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L * w / 2, nz = dx / L * w / 2, ya = baseY(a) - .35 + y0, yb = baseY(b) - .35 + y0; v.push(a[0] + nx, ya, a[1] + nz, a[0] - nx, ya, a[1] - nz, b[0] + nx, yb, b[1] + nz, b[0] - nx, yb, b[1] - nz); idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); k += 4; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); const o = new THREE.Mesh(g, mat); o.receiveShadow = true; scene.add(o); return o; }
SEG.forEach(([a, b, w]) => { strip([a, b], w, .32, roadM); const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 3; s < L - 2; s += 5) { const q = [a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L]; const d = new THREE.Mesh(new THREE.BoxGeometry(2, .06, .35), dashM); d.position.set(q[0], baseY(q) + .02, q[1]); d.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); scene.add(d); } });
PLACES.forEach(p => { const pl = [[p.x, p.z], p.at]; strip(pl, 2.4, .3, roadM); });

const winM = new THREE.MeshLambertMaterial({ color: K(0x9fd8f2, 0x404850), emissive: 0xffd37a, emissiveIntensity: 0, flatShading: LOW });
const lampM = new THREE.MeshLambertMaterial({ color: 0xfff6dd, emissive: 0xffd28a, emissiveIntensity: 0 });
const solid = [];
const nearRoad = (x, z, pad) => SEG.some(([a, b, w]) => projSeg([x, z], a, b).d < w / 2 + pad) || PLACES.some(p => projSeg([x, z], [p.x, p.z], p.at).d < 1.2 + pad);
function free(x, z, r) { if (nearRoad(x, z, r) || inPond(x, z, r)) return false; if (PLACES.some(p => Math.hypot(p.at[0] - x, p.at[1] - z) < r + 7)) return false; if (solid.some(s => Math.hypot(s[0] - x, s[1] - z) < r + s[2] + .8)) return false; if (x < BX0 + 3 || x > BX1 - 3 || z < BZ0 + 3 || z > BZ1 - 3) return false; return true; }
const WALL = [0xfff3e2, 0xffe1e8, 0xe2f4ff, 0xfff6c9, 0xe8e3ff, 0xdff7e8], ROOF = [0xff7f6e, 0x5fb8f0, 0xffb84d, 0x8a7bff, 0xff8fb3, 0x4fc59a];
function house(x, z, w, d, h, wall, roof, face = [0, 1]) {
  const g = new THREE.Group(); g.position.set(x, hY(x, z), z); g.rotation.y = Math.atan2(face[0], face[1]);
  const b = new THREE.Mesh(RB(w, h, d, .7), m(wall)); b.position.y = h / 2 + .2; g.add(b);
  const rf = new THREE.Mesh(new THREE.CylinderGeometry(d * .6, d * .6, w + .8, LOW ? 2 : 18, 1, false, 0, Math.PI), m(roof)); rf.rotation.z = Math.PI / 2; rf.position.y = h + .1; rf.scale.set(LOW ? 1.1 : .75, 1, 1); g.add(rf);
  const dr = new THREE.Mesh(RB(1.3, 1.9, .3, .3), m(0xb9805a)); dr.position.set(-w * .2, 1.15, d / 2 + .05); g.add(dr);
  const wn = new THREE.Mesh(LOW ? new THREE.PlaneGeometry(1.3, 1) : new THREE.CircleGeometry(.62, 16), winM); wn.position.set(w * .22, h * .55 + .2, d / 2 + .03); g.add(wn);
  g.traverse(o => { if (o.isMesh) { o.castShadow = !D.low; o.receiveShadow = true; } });
  scene.add(g); solid.push([x, z, Math.max(w, d) / 2]); return g;
}
function tower(x, z, w, d, h, col, bands = true) { const y0 = hY(x, z); mesh(RB(w, h, d, 1.2), col, x, y0 + h / 2 + .2, z); solid.push([x, z, Math.max(w, d) / 2]); if (bands) for (let y = 3.2; y < h - 1.5; y += 3.2) { const b = new THREE.Mesh(RB(w + .16, 1, d + .16, .45), winM); b.position.set(x, y0 + y + .2, z); scene.add(b); } mesh(RB(w * .7, 1, d * .7, .45), 0xffffff, x, y0 + h + .6, z); }
function tree(x, z, s = 1, kind = 'round') {
  const y0 = hY(x, z);
  mesh(new THREE.CylinderGeometry(.3 * s, .42 * s, 1.8 * s, LOW ? 5 : 8), 0xa8714a, x, y0 + .9 * s, z);
  if (kind === 'willow') { const c = mesh(SG(2 * s, 14, 10), 0xb6e27a, x, y0 + 3.2 * s, z); c.scale.set(1, 1.35, 1); }
  else if (kind === 'pine') { mesh(SG(1.8 * s, 14, 10), 0x4dad6a, x, y0 + 2.8 * s, z); mesh(SG(1.25 * s, 12, 8), 0x5cc078, x, y0 + 4.4 * s, z); }
  else mesh(SG(2 * s, 14, 10), kind === 'pink' ? 0xffb3cc : kind === 'plane' ? 0x9ad65a : 0x63c35a, x, y0 + 3.1 * s, z);
  solid.push([x, z, .9 * s]);
}
function awning(x, y, z, len, r, col, rotY = 0) { const a = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, LOW ? 3 : 14, 1, false, 0, Math.PI), m(col)); a.rotation.z = Math.PI / 2; a.position.set(x, y, z); const g = new THREE.Group(); g.add(a); g.rotation.y = rotY; scene.add(g); a.castShadow = !D.low; return g; }

/* 地标：按类型搭 */
const pickables = [];
function landmark(p) {
  const [x, z] = p.at, y0 = hY(x, z), f = [-p.dir[0], -p.dir[1]], rot = Math.atan2(f[0], f[1]);
  const T = p.type; let top = 9.5;
  const grp = (fn) => { const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = rot; fn((geo, c, X0, Y0, Z0) => { const o = new THREE.Mesh(geo, typeof c === 'number' ? m(c) : c); o.position.set(X0, Y0, Z0); o.castShadow = !D.low; o.receiveShadow = true; g.add(o); return o; }); scene.add(g); return g; };
  if (T === 'home') { house(x, z, 7, 6, 5, 0xfff3e2, 0xff7f6e, f); tree(x + 5.6 * Math.abs(f[1]) + 3 * f[0], z + 5.6 * Math.abs(f[0]), .9, 'pink'); }
  else if (T === 'eat' || T === 'bar') { house(x, z, 7, 6, 4, T === 'bar' ? 0x6b3fa0 : 0xfff6e8, T === 'bar' ? 0x3d2a5c : 0xd9483b, f); grp(add => { for (const s of [-1, 1]) add(SG(.65, 12, 10), new THREE.MeshLambertMaterial({ color: T === 'bar' ? 0xff4fd8 : 0xff4d3d, emissive: T === 'bar' ? 0xff4fd8 : 0xff5a3a, emissiveIntensity: .45 }), s * 2.6, 3.4, 3.4); add(RB(4.4, 1, .3, .2), 0xffffff, 0, 4.6, 3.2); }); }
  else if (T === 'tea') { house(x, z, 9, 8, 7, 0xfff0d6, 0x7a5cd6, f); grp(add => add(RB(10.6, .6, 9.6, .3), 0xb9805a, 0, 3.8, 0)); top = 12; }
  else if (T === 'gov') { tower(x, z, 18, 9, 9, 0xffffff); grp(add => { for (let i = -2; i <= 2; i++) add(new THREE.CylinderGeometry(.4, .4, 6, 10), 0xfff8ee, i * 3, 3.2, 4.9); add(new THREE.CylinderGeometry(.1, .1, 7, 6), 0xdddddd, 0, 13, 0); add(RB(2.2, 1.3, .14, .06), 0xff4b3e, 1.1, 15.6, 0); }); top = 17; }
  else if (T === 'hos') { tower(x, z, 13, 10, 20, 0xffffff); grp(add => { add(RB(4.2, 1.3, .4, .2), 0xff6f8f, 0, 17, 5.2); add(RB(1.3, 4.2, .4, .2), 0xff6f8f, 0, 17, 5.2); }); top = 23; }
  else if (T === 'tower') { tower(x, z, 9, 9, 30, 0xe6dcff); top = 33; }
  else if (T === 'school') { tower(x, z, 16, 8, 10, 0xfff1e0); grp(add => { add(new THREE.CylinderGeometry(.1, .1, 8, 6), 0xdddddd, 9, 4, 5); add(RB(2, 1.2, .12, .05), 0xff4b3e, 10, 7.4, 5); }); top = 13; }
  else if (T === 'station') { grp(add => { add(RB(20, 1, 7, .4), 0xf3e9d6, 0, .5, 0); add(RB(22, .6, 8, .3), 0x5fb8f0, 0, 5.6, 0); for (const s of [-9, -3, 3, 9]) add(new THREE.CylinderGeometry(.3, .3, 5, 8), 0xffffff, s, 3, 0); }); solid.push([x, z, 11]); top = 8; }
  else if (T === 'market') { grp(add => { for (let i = 0; i < 5; i++) { const sx = -10 + i * 5; add(RB(3.4, 1.6, 2.2, .3), 0xfff3e2, sx, 1, 0); add(SG(.45, 10, 8), lampM, sx + 1.3, 2.3, 1.2); } }); for (let i = 0; i < 5; i++) { const sx = -10 + i * 5; const loc = new THREE.Vector3(sx, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot); awning(x + loc.x, y0 + 3, z + loc.z, 3.8, 1.5, [0xff6f6f, 0x4fc59a, 0xffb84d][i % 3], rot); } solid.push([x, z, 12]); top = 6; }
  else if (T === 'water') { for (let i = 0; i < 5; i++) { const o = (i - 2) * 5.5, px = x + (p.dir[1] !== 0 ? o : 0), pz = z + (p.dir[0] !== 0 ? o : 0); if (!inPond(px, pz)) tree(px, pz, 1, 'willow'); } grp(add => add(RB(3.4, .5, 1.2, .2), 0xb9805a, 2, 1.1, -1.7)); top = 7; }
  else if (T === 'temple' || T === 'mount') { grp(add => { add(RB(9, 4.2, 6, .6), T === 'temple' ? 0xff9a6a : 0xf3e9d6, 0, 2.1, 0); add(RB(8, .6, 2, .25), 0xf3e9d6, 0, .3, 4); }); const r = awning(x, y0 + 4.2, z, 11, 4, T === 'temple' ? 0x6a4fb8 : 0x4fc59a, rot); r.children[0].scale.set(.6, 1, 1); solid.push([x, z, 6]); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .4; tree(x + Math.cos(a) * 11, z + Math.sin(a) * 11, .85, 'pine'); } top = 9; }
  else if (T === 'park') { for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; tree(x + Math.cos(a) * 6, z + Math.sin(a) * 6, .9, i % 3 ? 'round' : 'pink'); } grp(add => { add(new THREE.CylinderGeometry(1.6, 1.8, .8, 16), 0xf3e9d6, 0, .4, 0); add(new THREE.CylinderGeometry(1.2, 1.2, .2, 16), new THREE.MeshLambertMaterial({ color: K(0x5fd0ec, 0x6aa5bd) }), 0, .85, 0); }); top = 7; }
  else if (T === 'factory') { tower(x, z, 12, 9, 8, 0xe3e7ea, false); grp(add => { add(new THREE.CylinderGeometry(1.1, 1.3, 14, 12), 0xff8a6a, 4, 7, -2); for (let i = 0; i < 3; i++) { const s = add(SG(3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xffd37a, -8 + i * 7, .2, 8); s.scale.y = .8; } }); top = 15; }
  const s = new THREE.Mesh(new THREE.SphereGeometry(8, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); s.position.set(x, y0 + 4, z); s.userData.place = p.id; scene.add(s); pickables.push(s);
  p.y = y0 + top;
}
PLACES.forEach(landmark);
// 填空：每个地方周围按它是哪一带种房子 / 楼 / 树
PLACES.forEach((p, pi) => { const zn = ZONE[p.type] || 'town'; for (let i = 0; i < 46; i++) { const a = rnd() * Math.PI * 2, r = 10 + rnd() * 26, x = p.at[0] + Math.cos(a) * r, z = p.at[1] + Math.sin(a) * r; const near = PLACES.reduce((b, q) => Math.hypot(q.at[0] - x, q.at[1] - z) < Math.hypot(b.at[0] - x, b.at[1] - z) ? q : b, p); if (near !== p) continue;
  if (zn === 'town') { const w = 4.4 + rnd() * 2.6, d = 4.4 + rnd() * 2; if (free(x, z, Math.max(w, d) / 2 + .7)) house(x, z, w, d, 3.2 + rnd() * 1.8, WALL[(i + pi) % 6], ROOF[(i * 7 + pi) % 6]); else if (rnd() < .3 && free(x, z, 1.3)) tree(x, z, .75 + rnd() * .4, rnd() < .2 ? 'pink' : 'round'); }
  else if (zn === 'city') { const w = 6 + rnd() * 4, d = 6 + rnd() * 4; if (rnd() < .55 && free(x, z, Math.max(w, d) / 2 + 1.2)) tower(x, z, w, d, 7 + rnd() * 16, [0xffffff, 0xe2f4ff, 0xfff1e0, 0xe8e3ff, 0xe1f7ea][i % 5]); else if (free(x, z, 1.5)) tree(x, z, 1); }
  else if (zn === 'ind') { const w = 8 + rnd() * 5, d = 7 + rnd() * 4; if (rnd() < .5 && free(x, z, Math.max(w, d) / 2 + 1.2)) tower(x, z, w, d, 4 + rnd() * 4, [0xe9e6e0, 0xf0e6d6, 0xe2e9ee][i % 3], false); }
  else if (free(x, z, 1.4)) tree(x, z, .8 + rnd() * .5, rnd() < .3 ? 'pine' : rnd() < .2 ? 'pink' : 'round'); } });
for (let i = 0; i < 220; i++) { const x = BX0 + 4 + rnd() * (W0 - 8), z = BZ0 + 4 + rnd() * (H0 - 8); if (free(x, z, 1.6) && !PLACES.some(p => Math.hypot(p.at[0] - x, p.at[1] - z) < 30)) tree(x, z, .8 + rnd() * .5, rnd() < .25 ? 'pink' : 'round'); }
if (!LOW) for (let i = 0; i < 160; i++) { const x = BX0 + 3 + rnd() * (W0 - 6), z = BZ0 + 3 + rnd() * (H0 - 6); if (free(x, z, .5)) { const f = mesh(SG(.35, 6, 4), [0xffffff, 0xffe066, 0xff8fb3, 0xb69cff][i % 4], x, hY(x, z) + .25, z, false); f.scale.y = .6; } }
SEG.forEach(([a, b]) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 14) return; for (let s = 7; s < L - 4; s += 16) { const q = [a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L], nx = -(b[1] - a[1]) / L * 2.8, nz = (b[0] - a[0]) / L * 2.8, x = q[0] + nx, z = q[1] + nz; if (solid.some(o => Math.hypot(o[0] - x, o[1] - z) < o[2] + .5)) continue; const y = hY(x, z); mesh(new THREE.CylinderGeometry(.14, .14, 4, 6), 0x8fa7b8, x, y + 2.2, z, false); mesh(SG(.55, 10, 8), lampM, x, y + 4.4, z, false); } });
const clouds = [];
if (!LOW) for (let i = 0; i < 9; i++) { const g = new THREE.Group(); const n = 3 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const s = new THREE.Mesh(SG(4 + rnd() * 3, 12, 10), m(0xffffff)); s.position.set(k * 5 - n * 2.5, rnd() * 2, rnd() * 3); g.add(s); } const a = rnd() * Math.PI * 2, rr = Math.max(W0, H0) * .62 + rnd() * 40; g.position.set(CX + Math.cos(a) * rr, 30 + rnd() * 25, CZ + Math.sin(a) * rr * .8); g.userData.v = .6 + rnd() * .8; scene.add(g); clouds.push(g); }

/* ================= 小人 ================= */
function faceTex(skin, kind) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = skin; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(255,120,140,.35)'; g.beginPath(); g.ellipse(58, 150, 20, 12, 0, 0, 7); g.ellipse(198, 150, 20, 12, 0, 0, 7); g.fill();
  g.fillStyle = '#2b2522'; g.strokeStyle = '#2b2522'; g.lineCap = 'round'; g.lineWidth = 7;
  if (kind === 'happy') { for (const x of [88, 168]) { g.beginPath(); g.arc(x, 122, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
  else for (const x of [88, 168]) { g.beginPath(); g.ellipse(x, 118, 10, kind === 'wow' ? 16 : 14, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 3, 112, 3.6, 0, 7); g.fill(); g.fillStyle = '#2b2522'; }
  g.lineWidth = 5; if (kind === 'wow') { g.beginPath(); g.ellipse(128, 168, 9, 12, 0, 0, 7); g.fill(); } else { g.beginPath(); g.arc(128, kind === 'happy' ? 154 : 158, kind === 'happy' ? 18 : 12, Math.PI * .15, Math.PI * .85); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function simplePerson(c) {   // 没有「3D 小人」时的简单小人（两种风格各一版）
  const g = new THREE.Group(), u = {}, skin = new THREE.Color(c.skin).getHex();
  if (LOW) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.62, .82, 1.3, 7), m(c.top)); body.position.y = 1.55; g.add(body); u.body = body;
    u.lg = []; for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .9, 5), m(c.legs)); l.position.set(s * .33, .5, 0); g.add(l); u.lg.push(l); }
    u.ar = []; for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .95, 5), m(c.top)); a.position.set(s * .86, 1.6, 0); a.rotation.z = s * .25; g.add(a); u.ar.push(a); }
    const head = new THREE.Group(); head.position.y = 3.2; g.add(head); u.head = head; u.h0 = 3.2;
    head.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), m(skin))); const hr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.36, 1), m(c.hair)); hr.position.set(0, .2, -.2); head.add(hr);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(2.1, .55, .7), m(c.hair)); fr.position.set(0, .82, .78); fr.rotation.x = -.35; head.add(fr);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.IcosahedronGeometry(.13, 0), m(0x222222)); e.position.set(s * .42, -.05, 1.17); head.add(e); }
  } else {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.72, .7, 6, 14), m(c.top)); body.position.y = 1.55; g.add(body); u.body = body;
    u.lg = []; for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CapsuleGeometry(.24, .45, 4, 8), m(c.legs)); l.position.set(s * .34, .55, 0); g.add(l); u.lg.push(l); }
    u.ar = []; for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .55, 4, 8), m(c.top)); a.position.set(s * .9, 1.7, 0); a.rotation.z = s * .35; g.add(a); u.ar.push(a); }
    const head = new THREE.Group(); head.position.y = 3.35; g.add(head); u.head = head; u.h0 = 3.35;
    head.add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 28, 20), m(skin)));
    u.faces = { normal: faceTex(c.skin, 'n'), happy: faceTex(c.skin, 'happy'), surprised: faceTex(c.skin, 'wow') }; u.faceM = new THREE.MeshLambertMaterial({ map: u.faces.normal });
    head.add(new THREE.Mesh(new THREE.SphereGeometry(1.405, 28, 20, Math.PI / 2 - .9, 1.8, Math.PI * .3, Math.PI * .42), u.faceM));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.5, 28, 16, 0, Math.PI * 2, 0, Math.PI * .5), m(c.hair)); cap.rotation.x = -.38; cap.position.set(0, .12, -.08); head.add(cap);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(1.48, 24, 14, Math.PI, Math.PI, Math.PI * .3, Math.PI * .45), m(c.hair)));
    if (c.girl) { const L = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 1.2, 6, 14), m(c.hair)); L.position.set(0, -1.05, -.55); L.scale.set(1.12, 1, .55); head.add(L); }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = !D.low; }); g.scale.setScalar(PS * 1.3 * (LOW ? 1.1 : 1)); u.ph = rnd() * 6; g.userData = u; return g;
}
const COLS = ['#3d5a94', '#2f7bc0', '#7a5cd6', '#2f9a72', '#c0563b', '#8a6d52', '#d9788a', '#4a4f5c'];
const hashN = s => { let h = 0; String(s).split('').forEach(ch => h = (h * 31 + ch.charCodeAt(0)) >>> 0); return h; };
const meC = { id: 'me', n: '我', short: '我', skin: '#ffe0c9', hair: 0x5a3a28, top: 0xff9fb6, legs: 0x6f86c9, col: '#ff7a98', girl: true };
const PEOPLE = [];
function addPerson(c, at) {
  const h = hashN(c.id || c.name), col = c.id === 'me' ? meC.col : COLS[h % COLS.length];
  const p = c.id === 'me' ? Object.assign({}, meC) : { id: String(c.id), c, n: A.name(c), short: A.name(c).slice(-1), skin: '#ffe4d2', hair: [0x26262e, 0x4a3224, 0x3b2a20, 0x6b4a8a][h % 4], top: [0x3d5a94, 0xffffff, 0x2f2f35, 0x8a6d52, 0x4fc59a][h % 5], legs: [0x3a3d48, 0x2f7bc0, 0x2d2d33][h % 3], col };
  p.at = at; p.obj = new THREE.Group(); scene.add(p.obj);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.62, .78, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(col), transparent: true, opacity: .9 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .04; p.obj.add(ring);
  p.body = simplePerson(p); p.obj.add(p.body);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(2.4, 6, 4), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.2; hit.userData.person = p.id; p.obj.add(hit); pickables.push(hit);
  p.tag = document.createElement('div'); p.tag.className = 'lb who'; p.tag.style.setProperty('--c', col); p.tag.textContent = p.n; p.tag.tabIndex = 0; p.tag.onclick = () => openPerson(p.id); tags.appendChild(p.tag);
  p.bub = document.createElement('div'); p.bub.className = 'bub'; tags.appendChild(p.bub);
  PEOPLE.push(p); return p;
}
const meAt0 = A.meAt(DD);
const ME = addPerson({ id: 'me' }, meAt0);
A.chars().forEach(c => { const sid = DD.charLoc[String(c.id)]; if (sid && P[sid]) addPerson(c, sid); });
const PP = id => PEOPLE.find(p => p.id === String(id));
function spot(pid, i) { const p = P[pid]; if (!p) return [0, 0]; const n = PEOPLE.filter(q => q.at === pid && !q.moving).length; const k = i % 6, ox = (k % 3 - 1) * 1.15, oz = Math.floor(k / 3) * 1.1; return [p.door[0] + ox + p.dir[0] * 1.6, p.door[1] + oz * (p.dir[1] || 1) + p.dir[1] * 1.6]; }
function place(p, i) { const s = spot(p.at, i); p.obj.position.set(s[0], baseY(s), s[1]); p.obj.rotation.y = Math.atan2(-P[p.at].dir[0], -P[p.at].dir[1]) * 0 + (i % 2 ? -.4 : .4); }
function relayout(pid) { PEOPLE.filter(q => q.at === pid && !q.moving).forEach((q, i) => place(q, i)); }
[...new Set(PEOPLE.map(p => p.at))].forEach(relayout);
// 换成「3D 小人」里捏好的样子
const useAv = D.av !== 'simple' && A.hasAv();
if (useAv) PEOPLE.forEach(p => { window.gyx3dAvFor(p.id === 'me' ? 'me' : p.c).then(av => { if (!alive) { av.dispose && av.dispose(); return; } p.av = av; p.obj.remove(p.body); av.holder.scale.setScalar(2.05); av.holder.traverse(o => { if (o.isMesh) o.castShadow = !D.low; }); p.obj.add(av.holder); av.setState && av.setState('idle'); }).catch(() => {}); });
function face(p, f, sec) { if (p.av) { try { p.av.lockFace(f, sec || 3); } catch (e) {} return; } const u = p.body.userData; if (!u.faces) return; u.faceM.map = u.faces[f] || u.faces.normal; u.faceM.needsUpdate = true; clearTimeout(u.ft); u.ft = setTimeout(() => { u.faceM.map = u.faces.normal; u.faceM.needsUpdate = true; }, (sec || 3) * 1000); }
function say(p, t, ms = 4200) { if (!t || !p) return; p.bub.textContent = t; p.bub.classList.add('on'); clearTimeout(p.bt); p.bt = setTimeout(() => p.bub.classList.remove('on'), ms); }

/* ================= 交通工具 ================= */
function emojiTex(t) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '92px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 64, 70); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; }
function ride(w) {
  const look = w.look, g = new THREE.Group(), add = (geo, c, x, y, z) => { const o = new THREE.Mesh(geo, typeof c === 'number' ? m(c) : c); o.position.set(x, y, z); o.castShadow = !D.low; g.add(o); return o; };
  let seat = [0, 0, 0], seat2 = [-1.6, 0, 0], hide = false, sit = true;
  switch (look) {
    case 'bike': for (const x of [-1.4, 1.4]) add(new THREE.TorusGeometry(.75, .16, 8, 20), 0x3b3330, x, .8, 0); add(RB(3.2, .26, .26, .1), 0x5fb8f0, 0, 1.5, 0); seat = [.3, .9, 0]; seat2 = [-1, .9, 0]; break;
    case 'skate': add(RB(3, .25, 1.1, .12), 0xff7f6e, 0, .55, 0); for (const x of [-1, 1]) for (const z of [-.4, .4]) add(SG(.22, 8, 6), 0xffe066, x, .25, z); seat = [.5, .45, 0]; seat2 = [-.6, .45, 0]; sit = false; break;
    case 'goose': { const b = add(SG(1.7, 18, 12), 0xffffff, 0, 1.8, 0); b.scale.set(1.35, .9, .95); add(new THREE.CapsuleGeometry(.38, 1.8, 4, 10), 0xffffff, 2, 3.2, 0).rotation.z = -.35; add(SG(.62, 14, 10), 0xffffff, 2.4, 4.4, 0); add(new THREE.ConeGeometry(.28, .8, 10), 0xff9a2e, 3.1, 4.35, 0).rotation.z = -Math.PI / 2; seat = [-.2, 2.1, 0]; seat2 = [-1.6, 2, 0]; break; }
    case 'bus': add(RB(9, 4.2, 3.6, .9), 0xffd34d, 0, 2.6, 0); add(RB(8.4, 1.4, 3.7, .5), 0xa6e3ff, 0, 3.5, 0); for (const x of [-2.8, 2.8]) for (const z of [-1.7, 1.7]) { const wh = add(new THREE.CylinderGeometry(.75, .75, .5, 14), 0x3b3330, x, .8, z); wh.rotation.x = Math.PI / 2; } hide = true; break;
    case 'taxi': add(RB(5.2, 1.7, 2.8, .7), 0x4fc59a, 0, 1.3, 0); add(RB(2.9, 1.3, 2.5, .6), 0xffffff, -.3, 2.6, 0); add(RB(1, .45, .6, .2), 0xffe066, -.3, 3.45, 0); for (const x of [1.7, -1.7]) for (const z of [-1.3, 1.3]) { const wh = add(new THREE.CylinderGeometry(.55, .55, .4, 12), 0x3b3330, x, .55, z); wh.rotation.x = Math.PI / 2; } hide = true; break;
    case 'balloon': { const b = add(SG(5.5, 24, 18), 0xff8fb3, 0, 10, 0); b.scale.y = 1.15; add(RB(3, 1.8, 3, .4), 0xc98a5a, 0, .9, 0); for (const [x, z] of [[1.2, 1.2], [-1.2, 1.2], [1.2, -1.2], [-1.2, -1.2]]) add(new THREE.CylinderGeometry(.05, .05, 4, 4), 0x8a6a4a, x, 3.6, z); seat = [.5, 1, 0]; seat2 = [-.6, 1, 0]; sit = false; break; }
    case 'plane': { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([3.5, 0, 0, -2.5, 0, 2.4, -2, .25, 0, 3.5, 0, 0, -2, .25, 0, -2.5, 0, -2.4, 3.5, 0, 0, -2, .25, 0, -2.4, -.9, 0], 3)); geo.computeVertexNormals(); add(geo, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 0, .6, 0); seat = [.4, .6, 0]; seat2 = [-1.2, .6, 0]; break; }
    case 'broom': add(new THREE.CylinderGeometry(.12, .12, 5, 8), 0xa8714a, 0, 1.2, 0).rotation.z = Math.PI / 2; add(new THREE.ConeGeometry(.65, 1.6, 12), 0xffd37a, -2.8, 1.2, 0).rotation.z = Math.PI / 2; seat = [.3, .1, 0]; seat2 = [-1.1, .1, 0]; break;
    case 'cloud': for (let k = 0; k < 5; k++) add(SG(1.4 + (k % 2) * .4, 14, 10), 0xffffff, -2.4 + k * 1.2, .5, (k % 2) * .4 - .2); seat = [.4, .9, 0]; seat2 = [-1.2, .9, 0]; break;
    case 'bubble': { const b = add(SG(3.2, 24, 18), new THREE.MeshLambertMaterial({ color: 0xbfeaff, transparent: true, opacity: .32, emissive: 0x88ccff, emissiveIntensity: .2 }), 0, 3.2, 0); b.castShadow = false; seat = [.6, .6, 0]; seat2 = [-.9, .6, 0]; sit = false; break; }
    case 'rocket': add(new THREE.CapsuleGeometry(1.2, 3, 8, 16), 0xffffff, 0, 3.2, 0); add(new THREE.ConeGeometry(1.2, 1.8, 16), 0xff6f6f, 0, 5.9, 0); for (let k = 0; k < 3; k++) { const f = add(RB(.25, 1.4, 1.1, .1), 0xff6f6f, Math.cos(k * 2.1) * 1.1, 1.4, Math.sin(k * 2.1) * 1.1); f.rotation.y = -k * 2.1; } g.userData.flame = add(new THREE.ConeGeometry(.8, 2.4, 12), new THREE.MeshBasicMaterial({ color: 0xffb84d }), 0, -.3, 0); g.userData.flame.rotation.x = Math.PI; hide = true; break;
    case 'emoji': { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(w.ic || '✨'), transparent: true })); sp.scale.set(4.2, 4.2, 1); sp.position.y = 1.8; g.add(sp); seat = [0, 3, 0]; seat2 = [-1.4, 3, 0]; break; }
    default: sit = false;
  }
  const k = { balloon: .7, rocket: .8, emoji: .5 }[look] || .36; g.scale.setScalar(k);
  return { g, seat: seat.map(v => v * k), seat2: seat2.map(v => v * k), hide, sit };
}
const portals = [0, 1].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.2, .22, 12, 40), new THREE.MeshLambertMaterial({ color: 0xb69cff, emissive: 0x8a6bff, emissiveIntensity: .8 })); r.rotation.x = -Math.PI / 2; r.visible = false; scene.add(r); return r; });
function cannonAt(x, z) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.4, 5, 16), m(0x5a5f7a)); b.rotation.z = -.9; b.position.y = 2.6; g.add(b); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, .5, 16), m(0xb9805a)); w.rotation.x = Math.PI / 2; w.position.set(0, 1.2, s * 1.3); g.add(w); } g.position.set(x, baseY([x, z]) - .3, z); g.scale.setScalar(.4); scene.add(g); return g; }

/* ================= 标签、路线 ================= */
PLACES.forEach(p => { p.tag = document.createElement('div'); p.tag.className = 'lb'; p.tag.tabIndex = 0; p.tag.innerHTML = `<i aria-hidden="true">${ICON[p.type] || '📍'}</i>${esc(p.n)}`; p.tag.onclick = () => openPlace(p.id); tags.appendChild(p.tag); });
const lineM = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .95, depthWrite: false, side: THREE.DoubleSide });
const routeLine = new THREE.Mesh(new THREE.BufferGeometry(), lineM(0xff8a3d)), taLine = new THREE.Mesh(new THREE.BufferGeometry(), lineM(0x2fa6e8)); routeLine.renderOrder = taLine.renderOrder = 5; scene.add(routeLine, taLine);
const arcLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xff8a3d, dashSize: 2, gapSize: 1.4 })); scene.add(arcLine);
function ribbon(line, pl, w = 1.1) { const v = [], idx = []; let k = 0;
  for (let i = 1; i < pl.length; i++) { const a = pl[i - 1], b = pl[i], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L * w / 2, nz = dx / L * w / 2, ya = baseY(a) + .22, yb = baseY(b) + .22; v.push(a[0] + nx, ya, a[1] + nz, a[0] - nx, ya, a[1] - nz, b[0] + nx, yb, b[1] + nz, b[0] - nx, yb, b[1] - nz); idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); k += 4; }
  line.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); line.geometry = g; line.visible = pl.length > 1; }
function arcPreview(fn) { if (!fn) { arcLine.visible = false; return; } const pts = []; for (let i = 0; i <= 60; i++) pts.push(fn(i / 60)); arcLine.geometry.dispose(); arcLine.geometry = new THREE.BufferGeometry().setFromPoints(pts); arcLine.computeLineDistances(); arcLine.visible = true; }
const RN = mobile ? 900 : 1600, rainG = new THREE.BufferGeometry(), rainA = new Float32Array(RN * 6);
for (let i = 0; i < RN; i++) { const x = (rnd() - .5) * 220, y = rnd() * 80, z = (rnd() - .5) * 180; rainA.set([x, y, z, x - .3, y - 2.2, z], i * 6); }
rainG.setAttribute('position', new THREE.BufferAttribute(rainA, 3));
const rainMat = new THREE.LineBasicMaterial({ color: 0xd8ecff, transparent: true, opacity: .6 }); const rain = new THREE.LineSegments(rainG, rainMat); rain.visible = false; scene.add(rain);
// 雪、花瓣、落叶、光点、火星、泡泡：一团点，往下飘（光点 / 火星 / 泡泡往上飘），左右晃
const FXDEF = { snow: [0xffffff, .9, 9, 1.2], petal: [0xffb3cc, 1.1, 5, 3], leaf: [0xf0a040, 1.2, 6, 3], star: [0xfff3a0, .8, -1.6, 1], ember: [0xff8a3d, .6, -3.5, 1.5], bubble: [0xcdeeff, 1.3, -2.6, 1.6] };
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.55, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
const PN = mobile ? 700 : 1300, ptG = new THREE.BufferGeometry(), ptA = new Float32Array(PN * 3), ptPh = new Float32Array(PN);
for (let i = 0; i < PN; i++) { ptA.set([(rnd() - .5) * 220, rnd() * 80, (rnd() - .5) * 180], i * 3); ptPh[i] = rnd() * 6.28; }
ptG.setAttribute('position', new THREE.BufferAttribute(ptA, 3));
const ptMat = new THREE.PointsMaterial({ size: 1, map: dotTex, transparent: true, depthWrite: false, color: 0xffffff, sizeAttenuation: true });
const pts = new THREE.Points(ptG, ptMat); pts.visible = false; scene.add(pts); let FXNOW = null;

/* ================= 天气和时间 ================= */
const WXN = id => { const w = A.wxOf(id); return w ? w.n : '晴'; };
function realWx() { const c = DD.wcode; if (c == null) return 'sun'; if (c === 0 || c === 1) return 'sun'; if (c === 2 || c === 3) return 'cloud'; if (c === 45 || c === 48) return 'fog'; if ([71, 73, 75, 77, 85, 86].includes(c)) return 'snow'; return 'rain'; }
const S = { mode3d: true, sel: null, trip: null, with: 'none', way: 'walk', min: null, fog: [1.3, 3.2] };
const wxNow = () => (D.wx && A.wxOf(D.wx) ? D.wx : realWx());
const minNow = () => S.min != null ? S.min : (new Date().getHours() * 60 + new Date().getMinutes());
const C = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
function sky() {
  const wx0 = wxNow(), cw = A.wxOf(wx0), CU = cw && cw.custom ? cw : null, wx = CU ? 'custom' : wx0, mn = minNow(), h = mn / 60, dayT = Math.max(0, Math.sin((h - 6) / 12 * Math.PI)), night = h < 5.5 || h > 19.3 ? 1 : h < 6.5 ? 1 - (h - 5.5) : h > 18.3 ? h - 18.3 : 0;
  const dusk = Math.max(0, 1 - Math.abs(h - 18.4) / 1.4) + Math.max(0, 1 - Math.abs(h - 6.2) / 1.1) * .6;
  let col = C(K(0x9fdcff, 0xbfdcea), K(0xffb48a, 0xf0b78e), Math.min(1, dusk)).lerp(new THREE.Color(K(0x2b3a6e, 0x243052)), Math.min(1, night));
  if (wx === 'rain' || wx === 'cloud' || wx === 'snow') col.lerp(new THREE.Color(night > .5 ? 0x2a3046 : 0xb8c6d2), wx === 'rain' ? .55 : .3);
  if (wx === 'fog') col.lerp(new THREE.Color(night > .5 ? 0x464c5e : 0xe6ecef), .7);
  if (CU && /^#[0-9a-f]{6}$/i.test(CU.sky || '')) col.lerp(new THREE.Color(CU.sky), night > .5 ? .35 : .65);
  scene.background = col; scene.fog.color.copy(col); S.fog = CU ? [[1.4, 3.4], [1, 2.6], [.6, 1.8], [.25, 1.1]][Math.max(0, Math.min(3, Math.round(+CU.fog || 0)))] : { sun: [1.3, 3.2], cloud: [1.1, 2.8], rain: [.7, 2], fog: [.25, 1.1], snow: [.8, 2.2] }[wx];
  const a = (h - 6) / 12 * Math.PI; sun.position.set(CX + Math.cos(a) * -160, Math.max(30, Math.sin(a) * 190), CZ + 80);
  const dim = CU ? Math.max(.2, Math.min(1.2, +CU.light || 1)) : { rain: .5, cloud: .75, fog: .65, snow: .7, sun: 1 }[wx];
  sun.intensity = (.4 + 2 * dayT) * dim * (1 - night * .8); sun.color.copy(C(0xfff3df, 0xffae78, Math.min(1, dusk)));
  hemi.intensity = K(.9, .6) + .6 * dayT + night * .3; hemi.color.copy(C(0xffffff, 0x9aa8e8, night)); hemi.groundColor.copy(C(0x9ec98a, 0x3a4a6a, night));
  winM.emissiveIntensity = Math.min(1, night * 1.3 + (wx === 'rain' ? .15 : 0)); lampM.emissiveIntensity = Math.min(1.3, night * 1.5);
  sea.material.color.copy(C(K(0x55c9e8, 0x9aa69a), K(0x263f78, 0x2a3036), night)); ponds.forEach(q => q.m.material.color.copy(C(K(0x5fd0ec, 0x6aa5bd), K(0x2b4f86, 0x24344a), night)));
  const fx = CU ? (CU.fx || 'none') : wx === 'rain' ? 'rain' : wx === 'snow' ? 'snow' : 'none';
  clouds.forEach(c => c.visible = wx !== 'fog' && !(CU && +CU.fog >= 3)); rain.visible = fx === 'rain';
  FXNOW = FXDEF[fx] || null; pts.visible = !!FXNOW;
  if (FXNOW) { ptMat.color.set(FXNOW[0]); ptMat.size = FXNOW[1]; ptMat.blending = fx === 'star' || fx === 'ember' ? THREE.AdditiveBlending : THREE.NormalBlending; ptMat.needsUpdate = true; ptG.setDrawRange(0, Math.round(PN * ({ few: .35, mid: .7, lots: 1 }[CU ? CU.amount : 'lots'] || .7))); }
  if (fx === 'rain' && CU) rain.geometry.setDrawRange(0, Math.round(RN * 2 * ({ few: .35, mid: .7, lots: 1 }[CU.amount] || .7))); else rain.geometry.setDrawRange(0, Infinity);
  $('.wxi').textContent = CU ? (CU.ic || '✨') : { sun: night > .5 ? '☾' : '☀︎', cloud: '☁︎', rain: '☂︎', fog: '≋', snow: '❄︎' }[wx];
  $('.clock').textContent = String(Math.floor(h)).padStart(2, '0') + ':' + String(mn % 60).padStart(2, '0');
}

/* ================= 镜头（自己写的：一根手指拖动、两根手指捏合 / 转、滚轮缩放、右键转） ================= */
const tgt = new THREE.Vector3(CX, 0, CZ), sph = new THREE.Spherical(Math.max(W0, H0) * (mobile ? 1.25 : .95), .95, .5);
const LIM = { min: 10, max: Math.max(W0, H0) * 2.4 };
function applyCam() { const I = IN, mn = I ? 8 : LIM.min, mx = I ? 46 : LIM.max; sph.radius = Math.max(mn, Math.min(mx, sph.radius)); sph.phi = Math.max(I ? .35 : .02, Math.min(I ? 1.2 : S.mode3d ? 1.15 : .02, sph.phi)); if (I) { tgt.x = Math.max(-I.W / 2, Math.min(I.W / 2, tgt.x)); tgt.z = Math.max(-I.Dp / 2, Math.min(I.Dp / 2, tgt.z)); } else { tgt.x = Math.max(BX0 - 20, Math.min(BX1 + 20, tgt.x)); tgt.z = Math.max(BZ0 - 20, Math.min(BZ1 + 20, tgt.z)); } cam.position.copy(tgt).add(new THREE.Vector3().setFromSpherical(sph)); cam.lookAt(tgt); }
let fly = null;
function flyTo(x, z, dist, polar) { fly = { t0: performance.now(), dur: 900, ft: tgt.clone(), tt: new THREE.Vector3(x, 0, z), fr: sph.radius, tr: dist ?? sph.radius, fp: sph.phi, tp: polar ?? (S.mode3d ? .95 : .02) }; }
const cv = $('.cv'), ptrs = new Map(); let g0 = null, downAt = null;
function pan(dx, dy) { const s = sph.radius / innerHeight * 1.5, th = sph.theta, k = S.mode3d ? 1.3 : 1; tgt.x -= (Math.cos(th) * dx + Math.sin(th) * dy * k) * s; tgt.z -= (-Math.sin(th) * dx + Math.cos(th) * dy * k) * s; }
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button }); downAt = ptrs.size === 1 ? [e.clientX, e.clientY, Date.now()] : null; fly = null; g0 = null; });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y;
  if (ptrs.size === 1) { if (p.b === 2 || e.shiftKey) { if (S.mode3d) { sph.theta -= dx * .006; sph.phi -= dy * .005; } } else pan(dx, dy); }
  else if (ptrs.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x), my = (a.y + b.y) / 2;
    if (g0) { sph.radius *= g0.d / d; if (S.mode3d) { sph.theta -= (ang - g0.ang); sph.phi -= (my - g0.my) * .004; } } g0 = { d, ang, my }; return; }
  p.x = e.clientX; p.y = e.clientY; });
const up = e => { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); g0 = null; if (p && downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 7 && Date.now() - downAt[2] < 600) tap(e); downAt = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); g0 = null; });
cv.addEventListener('wheel', e => { e.preventDefault(); sph.radius *= Math.exp(e.deltaY * .0012); fly = null; }, { passive: false });
cv.addEventListener('contextmenu', e => e.preventDefault());
const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
function tap(e) { if (IN) return inTap(e); const r = cv.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(v2, cam); const h = ray.intersectObjects(pickables, false)[0]; $('.pop').hidden = true; if (!h) return; if (h.object.userData.person) openPerson(h.object.userData.person); else openPlace(h.object.userData.place); }

/* ================= 卡片 ================= */
$('.grab').onclick = () => sheet.classList.toggle('min');
const avH = (p, sz) => `<span class="av" style="background:${p.col || '#888'}${sz ? `;width:${sz}px;height:${sz}px;font-size:${sz * .38}px` : ''}">${esc(p.short || '?')}</span>`;
const meters = u => { const v = u * M10; return v >= 1000 ? (v / 1000).toFixed(1) + ' 公里' : Math.round(v / 10) * 10 + ' 米'; };
const lenFor = (w, a, b) => w.kind === 'road' ? route(a, b).len : crow(a, b);
const timeTxt = (w, u) => w.fixed || (A.minsOf(w, u) + ' 分钟');
const whereP = p => p.moving ? '在路上' : (P[p.at] ? P[p.at].n : '');
function home() {
  S.sel = null; PLACES.forEach(p => p.tag.classList.remove('sel')); ribbon(routeLine, []); ribbon(taLine, []); arcPreview(null);
  const near = PLACES.filter(p => p.id !== ME.at).map(p => ({ p, r: route(ME.at, p.id) })).sort((a, b) => a.r.len - b.r.len);
  const off = A.chars().filter(c => !PP(c.id));
  const iv = D.invite && A.char(D.invite.cid) && P[D.invite.spot] ? D.invite : null;
  const today = D.trips.filter(t => new Date(t.at).toDateString() === new Date().toDateString()).slice(-6).reverse();
  sc.innerHTML = `
    <div><p class="h">${esc(DD.demo ? '示例：临安县' : (D.fac || (DD.factions.length > 1 ? '全部地点' : (PLACES[0] && PLACES[0].mapName) || '我们的小城')))}</p><p class="k">你在${esc(whereP(ME))} · ${esc(WXN(wxNow()))}${D.wx ? '（手动）' : DD.city ? ' · ' + esc(DD.city) : ''}</p></div>
    ${DD.demo ? `<div class="note"><b>${DD.real ? '现在看的是示例' : '还没有地点，先用示例看看'}</b><span>地点来自「行程与天气」：在那里加地点，或者让 AI 照世界书生成，这里就会照着搭一座小城。示例里走的路不记、不花钱。</span><div class="btns"><button class="go ghost sm" type="button" data-k="gomap">去行程与天气</button>${DD.real ? '<button class="go sm" type="button" data-k="real">看我的地图</button>' : ''}</div></div>` : ''}
    ${iv ? `<button class="it inv" type="button" data-k="inv">${avH(PP(iv.cid) || { col: '#ff8a3d', short: A.name(A.char(iv.cid)).slice(-1) })}<span class="tx"><b>${esc(A.name(A.char(iv.cid)))} 约你${esc(iv.wayName)}去${esc(iv.spotName)}</b><span>「${esc(iv.say)}」</span></span><span class="r">去 ›</span></button>` : ''}
    <div class="sec"><h5>TA 们在哪</h5><div class="list">${PEOPLE.filter(p => p.id !== 'me').map(p => `<button class="it" type="button" data-person="${p.id}">${avH(p)}<span class="tx"><b>${esc(p.n)}</b><span>${esc(p.moving ? p.movingTxt : '在' + whereP(p))}</span></span><span class="r">${p.at === ME.at && !p.moving ? '跟你一起' : p.moving ? '在路上' : meters(route(ME.at, p.at).len)}</span></button>`).join('') || '<p class="k">地图上还没有 TA。</p>'}${off.length ? `<button class="it" type="button" data-k="off"><span class="ic" aria-hidden="true">＋</span><span class="tx"><b>还有 ${off.length} 个 TA 不在地图上</b><span>${esc(off.slice(0, 4).map(c => A.name(c)).join('、'))}</span></span><span class="r">放上来 ›</span></button>` : ''}</div></div>
    <div class="sec"><h5>想去哪</h5><div class="list">${near.map(({ p, r }) => `<button class="it" type="button" data-place="${p.id}"><span class="ic" aria-hidden="true">${ICON[p.type] || '📍'}</span><span class="tx"><b>${esc(p.n)}</b><span>${esc(p.desc || DD.spots.find(s => s.id === p.id)?.mapName || '')}</span></span><span class="r">${meters(r.len)}</span></button>`).join('')}</div></div>
    ${today.length ? `<div class="sec"><h5>今天的行程（记进「今天」和记忆总览）</h5><div class="list">${today.map(t => { const c = A.char(t.who || t.with); return `<div class="it"><span class="ic" aria-hidden="true">${t.ic}</span><span class="tx"><b>${t.solo ? esc(A.name(c)) + '自己去了' : (c ? '和' + esc(A.name(c)) : '') + t.wayName + '去了'}${esc(t.toName)}</b><span>${esc(t.odd || t.line || '')}</span></span><span class="r">${new Date(t.at).toTimeString().slice(0, 5)}</span></div>`; }).join('')}</div></div>` : ''}`;
  bindList();
}
function bindList() {
  sc.querySelectorAll('[data-place]').forEach(b => b.onclick = () => openPlace(b.dataset.place)); sc.querySelectorAll('[data-person]').forEach(b => b.onclick = () => openPerson(b.dataset.person));
  const k = s => sc.querySelector(`[data-k="${s}"]`);
  if (k('gomap')) k('gomap').onclick = () => { close(); try { window.gymapOpenTab ? window.gymapOpenTab('map') : window.gymapOpen(); } catch (e) {} };
  if (k('real')) k('real').onclick = () => { D.demo = false; A.save(); window.gysMap3dBoot(A, {}); };
  if (k('inv')) k('inv').onclick = () => { const iv = D.invite; S.with = iv.cid; S.way = iv.way; openPlace(iv.spot); };
  if (k('off')) k('off').onclick = offList;
}
function offList() {
  const off = A.chars().filter(c => !PP(c.id));
  sc.innerHTML = `<div class="hd"><div><p class="h" style="font-size:22px">放到地图上</p><p class="k">挑一个 TA，再挑 TA 现在在哪${DD.demo ? '（示例里不保存）' : '（跟「行程与天气」是同一份）'}</p></div><button class="x" type="button" data-k="cls" aria-label="关闭">✕</button></div>
    <div class="sec"><div class="chips" data-k="who">${off.map((c, i) => `<button class="chip ${i ? '' : 'on'}" type="button" data-c="${esc(c.id)}">${esc(A.name(c))}</button>`).join('')}</div></div>
    <div class="sec"><h5>在哪</h5><div class="list">${PLACES.map(p => `<button class="it" type="button" data-to="${p.id}"><span class="ic" aria-hidden="true">${ICON[p.type] || '📍'}</span><span class="tx"><b>${esc(p.n)}</b></span></button>`).join('')}</div></div>`;
  let cid = off[0] && String(off[0].id);
  sc.querySelector('[data-k="cls"]').onclick = home;
  sc.querySelector('[data-k="who"]').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; cid = b.dataset.c; sc.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b)); };
  sc.querySelectorAll('[data-to]').forEach(b => b.onclick = async () => { if (!cid) return; await A.setLoc(cid, b.dataset.to); const p = addPerson(A.char(cid), b.dataset.to); relayout(b.dataset.to); if (useAv) window.gyx3dAvFor(p.c).then(av => { if (!alive) return; p.av = av; p.obj.remove(p.body); av.holder.scale.setScalar(2.05); p.obj.add(av.holder); }).catch(() => {}); toast(A.name(A.char(cid)) + ' 在' + P[b.dataset.to].n); home(); });
}
function airFn(w, from, to) {
  const a = new THREE.Vector3(from[0], baseY(from), from[1]), b = new THREE.Vector3(to[0], baseY(to), to[1]);
  if (w.kind === 'rocket') return f => { const H = 130; if (f < .35) { const t = f / .35; return new THREE.Vector3(a.x, a.y + H * t * t, a.z); } if (f < .65) { const t = (f - .35) / .3; return new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + H + Math.sin(t * Math.PI) * 8, a.z + (b.z - a.z) * t); } const t = (f - .65) / .35; return new THREE.Vector3(b.x, b.y + H * (1 - t) * (1 - t), b.z); };
  const H = w.h || 20; return f => { const e = w.kind === 'arc' ? f : f < .5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2; const p = a.clone().lerp(b, e); p.y += w.kind === 'arc' ? 4 * H * f * (1 - f) : H * Math.min(1, Math.sin(Math.PI * f) * 1.6); if (w.wob) { p.x += Math.sin(f * 18) * 3; p.z += Math.cos(f * 14) * 2; } return p; };
}
function openPlace(id) {
  if (S.trip) return toast('还在路上，到了再选下一个');
  const p = P[id]; if (!p) return; S.sel = id; sheet.classList.remove('min'); $('.pop').hidden = true;
  PLACES.forEach(x => x.tag.classList.toggle('sel', x.id === id)); flyTo(p.at[0], p.at[1], mobile ? 90 : 75);
  const here = ME.at === id; const tw = S.with !== 'none' ? PP(S.with) : null; if (S.with !== 'none' && !tw) S.with = 'none';
  const together = tw && tw.at === ME.at && !tw.moving, W = A.ways();
  let w = W.find(x => x.id === S.way) || W[0] || A.BUILTIN[0]; if (w.need === 'ta' && !together) { w = W.find(x => !x.need) || A.BUILTIN[0]; S.way = w.id; }
  const u = here ? 0 : lenFor(w, ME.at, id);
  ribbon(routeLine, !here && w.kind === 'road' ? route(ME.at, id).pl : []);
  arcPreview(!here && ['air', 'arc', 'rocket'].includes(w.kind) ? airFn(w, P[ME.at].door, P[id].door) : null);
  ribbon(taLine, tw && !here && !together && tw.at !== id ? route(tw.at, id).pl : []);
  const cost = here ? 0 : A.costOf(w, u);
  sc.innerHTML = `
    <div class="hd"><span class="big" aria-hidden="true">${ICON[p.type] || '📍'}</span><div><p class="h" style="font-size:23px">${esc(p.n)}</p><p class="k">${esc(p.mapName || '')}${here ? ' · 你就在这儿' : ' · 离你 ' + meters(route(ME.at, id).len)}</p></div><button class="x" type="button" data-k="cls" aria-label="关闭">✕</button></div>
    ${p.desc || PEOPLE.some(q => q.at === id && q.id !== 'me') ? `<div class="desc">${p.desc ? `<p>${esc(p.desc)}</p>` : ''}<div class="tg">${PEOPLE.filter(q => q.at === id && !q.moving && q.id !== 'me').map(q => `<span class="tag" style="color:${q.col}">${esc(q.n)}在这儿</span>`).join('')}</div></div>` : ''}
    ${here ? `<div class="btns"><button class="go" type="button" data-k="in">${A.homeSpot(DD) === id && window.gyx3dRoomOpen && !DD.demo ? '进小屋' : '进去'}</button></div>${!DD.demo && A.homeSpot(DD) !== id && (p.type === 'home' || p.type === 'tower') ? '<button class="lnk" type="button" data-k="sethome">把这里设成「我们的家」（进去就是 3D 小屋）</button>' : ''}` : `
    <div class="sec"><h5>跟谁去</h5><div class="chips" data-k="with"><button class="chip ${S.with === 'none' ? 'on' : ''}" type="button" data-w="none">一个人</button>${PEOPLE.filter(q => q.id !== 'me').map(q => `<button class="chip ${S.with === q.id ? 'on' : ''}" type="button" data-w="${q.id}">${esc(q.n)}${q.at === ME.at && !q.moving ? '（在旁边）' : ''}</button>`).join('')}</div>
      ${tw && !together ? `<p class="k">${esc(tw.n)}不在你身边。先问 TA 来不来，来的话 TA 从${esc(whereP(tw))}过去，你们在门口碰头（蓝线是 TA 的路）。</p>` : ''}</div>
    <div class="sec"><h5>怎么去 <button class="lnk" type="button" data-k="ways">管理 / 自己加</button></h5><div class="ways" data-k="way">${W.map(x => { const dis = x.need === 'ta' && !together; return `<button class="way ${x.id === w.id ? 'on' : ''}" type="button" data-way="${esc(x.id)}" ${dis ? 'disabled title="TA 得在你身边"' : ''}><em aria-hidden="true">${esc(x.ic)}</em><b>${esc(x.n)}</b><span>${timeTxt(x, lenFor(x, ME.at, id))}</span></button>`; }).join('')}</div></div>
    <div class="wayinfo"><b>${esc(w.ic)} ${esc(w.n)} · ${timeTxt(w, u)}${cost && !DD.demo ? ' · ' + cost + ' 元' : ''}</b><span>${esc(w.tip || '')}${wxNow() === 'rain' && ['bike', 'skate', 'goose', 'broom', 'cloud', 'plane', 'balloon', 'emoji'].includes(w.look) ? '。在下雨，会淋湿' : ''}</span></div>
    <button class="go" type="button" data-k="go">${tw ? (together ? '和 ' + esc(tw.n) + ' 一起去' : '约 ' + esc(tw.n) + ' 一起去') : '出发'}</button>`}`;
  sc.querySelector('[data-k="cls"]').onclick = home;
  if (here) { sc.querySelector('[data-k="in"]').onclick = () => enterPlace(id); const sh = sc.querySelector('[data-k="sethome"]'); if (sh) sh.onclick = () => { D.home = id; A.save(); toast(p.n + ' 现在是你们的家'); openPlace(id); }; return; }
  sc.querySelector('[data-k="with"]').onclick = e => { const b = e.target.closest('[data-w]'); if (b) { S.with = b.dataset.w; openPlace(id); } };
  sc.querySelector('[data-k="way"]').onclick = e => { const b = e.target.closest('[data-way]'); if (b && !b.disabled) { S.way = b.dataset.way; openPlace(id); } };
  sc.querySelector('[data-k="ways"]').onclick = () => wayEditor(() => openPlace(id));
  sc.querySelector('[data-k="go"]').onclick = async e => {
    if (tw && !together) {
      const b = e.currentTarget; b.disabled = true; b.textContent = '等 ' + tw.n + ' 回你…';
      const r = await A.askJoin(tw.c, { at: whereP(tw), to: p.n, way: w.n }); if (!alive) return;
      say(tw, r.say, 5000);
      if (!r.go) { sc.querySelector('[data-k="go"]').outerHTML = `<div class="say">${avH(tw)}<span>${esc(r.say)}</span></div><div class="btns"><button class="go ghost" type="button" data-k="alone">那我自己去</button><button class="go ghost" type="button" data-k="back">算了</button></div>`; sc.querySelector('[data-k="alone"]').onclick = () => { S.with = 'none'; startTrip(id); }; sc.querySelector('[data-k="back"]').onclick = home; return; }
      S.joinSay = r.say;
    }
    startTrip(id);
  };
}
function openPerson(pid) {
  const p = PP(pid); if (!p) return; if (pid === 'me') { const o = p.obj.position; flyTo(o.x, o.z, 28); return; }
  if (S.trip) return toast('还在路上');
  sheet.classList.remove('min'); const o = p.obj.position; flyTo(o.x, o.z, 34);
  ribbon(routeLine, []); arcPreview(null); ribbon(taLine, !p.moving && p.at !== ME.at ? route(ME.at, p.at).pl : []);
  const dis = p.at === ME.at || p.moving;
  sc.innerHTML = `
    <div class="hd">${avH(p, 50)}<div><p class="h" style="font-size:23px">${esc(p.n)}</p><p class="k">${esc(p.moving ? p.movingTxt : '在' + whereP(p))}${!p.moving && A.homeSpot(DD) === p.at && window.gyx3dRoomState && window.gyx3dRoomState(p.id) ? esc('（小屋里' + window.gyx3dRoomState(p.id) + '）') : ''}${A.auto(p.c) ? ' · 🤖 自主行动中' : ''}</p></div><button class="x" type="button" data-k="cls" aria-label="关闭">✕</button></div>
    ${p.at === ME.at && !p.moving ? `<div class="say">${avH(p)}<span>就在你旁边。点一个地方，「跟谁去」选 TA。</span></div>` : ''}
    <div class="btns"><button class="go" type="button" data-k="to" ${dis ? 'disabled' : ''}>去找 TA</button><button class="go ghost" type="button" data-k="call" ${p.moving ? 'disabled' : ''}>约 TA 去个地方</button></div>
    <p class="k">约 TA 时 TA 按性格和现在在干嘛决定来不来。开了自主行动，TA 也会自己出门、自己来约你。</p>`;
  sc.querySelector('[data-k="cls"]').onclick = home;
  if (!dis) sc.querySelector('[data-k="to"]').onclick = () => { S.with = 'none'; openPlace(p.at); };
  if (!p.moving) sc.querySelector('[data-k="call"]').onclick = () => { S.with = p.id; sc.innerHTML = `<div class="hd"><div><p class="h" style="font-size:22px">约${esc(p.n)}去哪</p></div><button class="x" type="button" data-k="cls">✕</button></div><div class="list">${PLACES.filter(q => q.id !== ME.at).map(q => `<button class="it" type="button" data-place="${q.id}"><span class="ic" aria-hidden="true">${ICON[q.type] || '📍'}</span><span class="tx"><b>${esc(q.n)}</b></span><span class="r">${meters(route(ME.at, q.id).len)}</span></button>`).join('')}</div>`; sc.querySelector('[data-k="cls"]').onclick = home; bindList(); };
}

/* ================= 出行方式管理 / 自己加 ================= */
function wayEditor(after) {
  const ov = document.createElement('div'); ov.id = 'gysMap3dWayOv'; ov.setAttribute('data-gy-overlay', ''); ov.className = 'gm3 gm3ed' + (LOW ? ' low' : ''); document.body.appendChild(ov);
  let edit = null;
  const paint = () => {
    const all = A.allWays();
    ov.innerHTML = `<style>${CSS}</style><div class="edbox"><div class="hd"><div><p class="h" style="font-size:22px">出行方式</p><p class="k">关掉的不出现在「怎么去」里；自己加的能改能删</p></div><button class="x" type="button" data-k="x" aria-label="关闭">✕</button></div>
      ${edit ? form(edit) : `<div class="list">${all.map(w => `<div class="it"><span class="ic" aria-hidden="true">${esc(w.ic)}</span><span class="tx"><b>${esc(w.n)}${w.custom ? ' <em class="tag">自己加的</em>' : ''}</b><span>${esc(A.KINDS[w.kind])} · ${esc(w.tip || '')}</span></span>${w.custom ? `<button class="lnk" type="button" data-e="${esc(w.id)}">改</button>` : ''}<button class="sw ${D.ways[w.id] === false ? '' : 'on'}" type="button" data-t="${esc(w.id)}" aria-label="开关"></button></div>`).join('')}</div>
      <button class="go" type="button" data-k="add">＋ 自己加一种</button>`}</div>`;
    ov.querySelector('[data-k="x"]').onclick = () => { ov.remove(); after && after(); };
    ov.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const id = b.dataset.t; D.ways[id] = D.ways[id] === false; if (A.ways().length === 0) { D.ways[id] = true; toast('至少留一种'); } A.save(); paint(); });
    ov.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { edit = Object.assign({}, D.custom.find(c => c.id === b.dataset.e)); paint(); });
    const add = ov.querySelector('[data-k="add"]'); if (add) add.onclick = () => { edit = { id: 'cw' + Date.now().toString(36), n: '', ic: '', kind: 'road', speed: 'mid', h: 20, cost: 0, tip: '', look: 'emoji', isNew: true }; paint(); };
    if (edit) bindForm();
  };
  const sel = (k, opts, v) => `<select data-f="${k}">${Object.entries(opts).map(([a, b]) => `<option value="${a}"${a === v ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
  const form = e => `<div class="form">
    <label>叫什么<input data-f="n" value="${esc(e.n)}" placeholder="比如：骑恐龙、坐 TA 的电动车后座、被风吹过去" maxlength="16"></label>
    <button class="go ghost sm" type="button" data-k="ai">✨ 让 AI 帮我填下面的</button>
    <div class="two"><label>图标（一个 emoji）<input data-f="ic" value="${esc(e.ic)}" placeholder="🦖" maxlength="4"></label><label>一次多少钱（元）<input data-f="cost" type="number" min="0" step="0.5" value="${+e.cost || 0}"></label></div>
    <div class="two"><label>怎么动${sel('kind', A.KINDS, e.kind)}</label><label>快慢${sel('speed', { slow: '慢', mid: '中', fast: '快', super: '超快' }, e.speed)}</label></div>
    <div class="two"><label>样子${sel('look', A.LOOKS, e.look)}</label><label>飞多高（飞的才算）<input data-f="h" type="number" min="5" max="80" value="${+e.h || 20}"></label></div>
    <label>一句说明<input data-f="tip" value="${esc(e.tip)}" placeholder="会出现在选的时候" maxlength="30"></label>
    <p class="k">TA 坐这个时说什么、路上碰到什么，出发时按人设现编。</p>
    <div class="btns"><button class="go" type="button" data-k="ok">保存</button><button class="go ghost" type="button" data-k="${e.isNew ? 'cancel' : 'del'}">${e.isNew ? '取消' : '删掉'}</button></div></div>`;
  const read = () => { ov.querySelectorAll('[data-f]').forEach(i => { edit[i.dataset.f] = i.type === 'number' ? +i.value : i.value.trim(); }); };
  function bindForm() {
    ov.querySelector('[data-k="ai"]').onclick = async e => { read(); if (!edit.n) return toast('先写叫什么'); const b = e.currentTarget; b.disabled = true; b.textContent = '…想一下'; const j = await A.fillWay(edit.n); if (!ov.isConnected) return; if (!j) { b.disabled = false; b.textContent = '✨ 让 AI 帮我填下面的'; return toast('没想出来（API 没回），自己填吧'); } Object.assign(edit, { ic: j.ic || edit.ic, kind: A.KINDS[j.kind] ? j.kind : edit.kind, speed: A.SPEED[j.speed] ? j.speed : edit.speed, h: +j.h || edit.h, cost: Math.max(0, +j.cost || 0), tip: j.tip || edit.tip, look: A.LOOKS[j.look] ? j.look : 'emoji' }); paint(); };
    ov.querySelector('[data-k="ok"]').onclick = () => { read(); if (!edit.n) return toast('写个名字'); const c = Object.assign({}, edit); delete c.isNew; const i = D.custom.findIndex(x => x.id === c.id); if (i >= 0) D.custom[i] = c; else D.custom.push(c); A.save(); edit = null; paint(); toast('加好了：' + (c.ic || '✨') + ' ' + c.n); };
    const dl = ov.querySelector('[data-k="del"]'); if (dl) dl.onclick = () => { D.custom = D.custom.filter(x => x.id !== edit.id); delete D.ways[edit.id]; A.save(); edit = null; paint(); };
    const cc = ov.querySelector('[data-k="cancel"]'); if (cc) cc.onclick = () => { edit = null; paint(); };
  }
  paint();
}

/* ================= 自定义天气 ================= */
function wxEditor() {
  const ov = document.createElement('div'); ov.id = 'gysMap3dWayOv'; ov.setAttribute('data-gy-overlay', ''); ov.className = 'gm3 gm3ed' + (LOW ? ' low' : ''); document.body.appendChild(ov);
  let edit = null; const keep = D.wx;
  const sel = (k, opts, v) => `<select data-f="${k}">${Object.entries(opts).map(([a, b]) => `<option value="${a}"${String(a) === String(v) ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
  const form = e => `<div class="form">
    <label>叫什么<input data-f="n" value="${esc(e.n)}" placeholder="比如：花瓣雨、流星雨、沙尘暴、彩虹天、末日黄昏" maxlength="12"></label>
    <button class="go ghost sm" type="button" data-k="ai">✨ 让 AI 帮我填下面的</button>
    <div class="two"><label>图标（一个 emoji）<input data-f="ic" value="${esc(e.ic)}" placeholder="🌸" maxlength="4"></label><label>天空偏什么颜色<input data-f="sky" type="color" value="${/^#[0-9a-f]{6}$/i.test(e.sky || '') ? e.sky : '#ffc8dd'}"></label></div>
    <div class="two"><label>天上飘什么${sel('fx', A.FX, e.fx || 'none')}</label><label>飘多少${sel('amount', { few: '一点点', mid: '不少', lots: '满天都是' }, e.amount || 'mid')}</label></div>
    <div class="two"><label>多雾${sel('fog', { 0: '不雾', 1: '有一点', 2: '挺雾', 3: '看不清' }, Math.round(+e.fog || 0))}</label><label>多亮<input data-f="light" type="range" min="0.2" max="1.2" step="0.05" value="${+e.light || 1}"></label></div>
    <label>一句话说这天气（TA 出门说话时会照着这个）<input data-f="desc" value="${esc(e.desc || '')}" maxlength="30" placeholder="粉色的花瓣一直往下落"></label>
    <div class="btns"><button class="go" type="button" data-k="ok">保存并用上</button><button class="go ghost" type="button" data-k="${e.isNew ? 'cancel' : 'del'}">${e.isNew ? '取消' : '删掉'}</button></div></div>`;
  const read = () => ov.querySelectorAll('[data-f]').forEach(i => { edit[i.dataset.f] = i.type === 'range' ? +i.value : i.dataset.f === 'fog' ? +i.value : i.value.trim(); });
  // 改的时候地图上马上看到
  const preview = () => { read(); const tmp = Object.assign({}, edit, { id: '__pv', custom: true }); const i = D.cwx.findIndex(x => x.id === '__pv'); if (i >= 0) D.cwx[i] = tmp; else D.cwx.push(tmp); D.wx = '__pv'; sky(); };
  const unpreview = () => { D.cwx = D.cwx.filter(x => x.id !== '__pv'); if (D.wx === '__pv') D.wx = keep; sky(); };
  const paint = () => {
    ov.innerHTML = `<style>${CSS}</style><div class="edbox"><div class="hd"><div><p class="h" style="font-size:22px">天气</p><p class="k">自带的 5 种 + 你加的；点一个就用上</p></div><button class="x" type="button" data-k="x" aria-label="关闭">✕</button></div>
      ${edit ? form(edit) : `<div class="list"><button class="it" type="button" data-u=""><span class="ic" aria-hidden="true">📡</span><span class="tx"><b>跟着现实</b><span>${esc(DD.wdesc || '「行程与天气」里你所在城市的天气')}</span></span>${!D.wx ? '<span class="r">用着</span>' : ''}</button>${A.allWx().filter(w => w.id !== '__pv').map(w => `<div class="it"><button class="it" style="padding:0;background:none" type="button" data-u="${esc(w.id)}"><span class="ic" aria-hidden="true">${esc(w.ic || '✨')}</span><span class="tx"><b>${esc(w.n)}${w.custom ? ' <em class="tag">自己加的</em>' : ''}</b><span>${esc(w.custom ? (A.FX[w.fx] || '') + (w.desc ? ' · ' + w.desc : '') : '自带')}</span></span></button>${D.wx === w.id ? '<span class="r">用着</span>' : ''}${w.custom ? `<button class="lnk" type="button" data-e="${esc(w.id)}">改</button>` : ''}</div>`).join('')}</div>
      <button class="go" type="button" data-k="add">＋ 自己加一种天气</button>`}</div>`;
    ov.querySelector('[data-k="x"]').onclick = () => { unpreview(); ov.remove(); home(); };
    ov.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { D.wx = b.dataset.u; A.save(); sky(); paint(); });
    ov.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { edit = Object.assign({}, D.cwx.find(c => c.id === b.dataset.e)); paint(); preview(); });
    const add = ov.querySelector('[data-k="add"]'); if (add) add.onclick = () => { edit = { id: 'cx' + Date.now().toString(36), n: '', ic: '', sky: '#ffc8dd', fx: 'petal', amount: 'mid', fog: 0, light: 1, desc: '', isNew: true }; paint(); preview(); };
    if (!edit) return;
    ov.querySelectorAll('[data-f]').forEach(i => i.addEventListener('input', preview));
    ov.querySelector('[data-k="ai"]').onclick = async e => { read(); if (!edit.n) return toast('先写叫什么'); const b = e.currentTarget; b.disabled = true; b.textContent = '…想一下'; const j = await A.fillWx(edit.n); if (!ov.isConnected) return; if (!j) { b.disabled = false; b.textContent = '✨ 让 AI 帮我填下面的'; return toast('没想出来（API 没回），自己填吧'); } Object.assign(edit, { ic: j.ic || edit.ic, sky: /^#[0-9a-f]{6}$/i.test(j.sky || '') ? j.sky : edit.sky, fx: A.FX[j.fx] ? j.fx : edit.fx, amount: ['few', 'mid', 'lots'].includes(j.amount) ? j.amount : edit.amount, fog: Math.max(0, Math.min(3, Math.round(+j.fog || 0))), light: Math.max(.2, Math.min(1.2, +j.light || 1)), desc: j.desc || edit.desc }); paint(); preview(); };
    ov.querySelector('[data-k="ok"]').onclick = () => { read(); if (!edit.n) return toast('写个名字'); unpreview(); const c = Object.assign({}, edit); delete c.isNew; const i = D.cwx.findIndex(x => x.id === c.id); if (i >= 0) D.cwx[i] = c; else D.cwx.push(c); D.wx = c.id; A.save(); sky(); edit = null; paint(); toast('用上了：' + (c.ic || '✨') + ' ' + c.n); };
    const dl = ov.querySelector('[data-k="del"]'); if (dl) dl.onclick = () => { unpreview(); D.cwx = D.cwx.filter(x => x.id !== edit.id); if (D.wx === edit.id) D.wx = ''; A.save(); sky(); edit = null; paint(); };
    const cc = ov.querySelector('[data-k="cancel"]'); if (cc) cc.onclick = () => { unpreview(); edit = null; paint(); };
  };
  paint();
}

/* ================= 出行 ================= */
function roadMover(p, toId, speed, txt) {
  const r = route(p.at, toId), i = PEOPLE.filter(q => q.at === toId && !q.moving).length, end = spot(toId, i);
  const pl = [[p.obj.position.x, p.obj.position.z], ...(P[p.at] ? [P[p.at].door] : []), ...r.pl, P[toId].door, end];
  let len = 0; const cum = [0]; for (let k = 1; k < pl.length; k++) { len += Math.hypot(pl[k][0] - pl[k - 1][0], pl[k][1] - pl[k - 1][1]); cum.push(len); }
  p.moving = { kind: 'road', pl, cum, len, d: 0, speed, to: toId }; p.movingTxt = txt; return p.moving;
}
function roadAt(mv, d) { let k = 1; while (k < mv.cum.length - 1 && mv.cum[k] < d) k++; const a = mv.pl[k - 1], b = mv.pl[k], seg = mv.cum[k] - mv.cum[k - 1] || 1, t = Math.max(0, Math.min(1, (d - mv.cum[k - 1]) / seg)); return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, dx: (b[0] - a[0]) / seg, dz: (b[1] - a[1]) / seg }; }
let R = null;
function startTrip(id) {
  const tw = S.with !== 'none' ? PP(S.with) : null, w = A.ways().find(x => x.id === S.way) || A.BUILTIN[0], together = !!(tw && tw.at === ME.at && !tw.moving);
  const T = S.trip = { to: id, from: ME.at, w: tw ? tw.id : null, together, way: w, f: 0, odd: 0, lines: 0, len: lenFor(w, ME.at, id) };
  T.mins = A.minsOf(w, T.len); T.cost = A.costOf(w, T.len);
  if (w.kind === 'road') { const mv = roadMover(ME, id, w.sp || 8, '在路上'); T.dur = Math.max(2.5, mv.len / (w.sp || 8)); }
  else if (w.kind === 'portal') T.dur = 2.4;
  else { T.fn = airFn(w, [ME.obj.position.x, ME.obj.position.z], spot(id, 0)); T.dur = w.kind === 'rocket' ? 7 : w.kind === 'arc' ? 3.4 : Math.max(4, crow(ME.at, id) / (w.sp || 10)); ME.moving = { kind: 'air' }; ME.movingTxt = '在天上'; }
  T.lineP = tw ? A.tripLines(tw.c, { way: w, together, from: P[ME.at].n, to: P[id].n, todesc: P[id].desc }).then(r => { T.L = r; if (together && S.trip === T) say(tw, r.start); return r; }) : null;
  if (together) { tw.moving = { kind: 'ride' }; tw.movingTxt = '跟你一起在路上'; }
  else if (tw) { const mv = roadMover(tw, id, 0, '在去' + P[id].n + '的路上'); mv.speed = Math.max(5, mv.len / Math.max(T.dur, 6)); if (S.joinSay) say(tw, S.joinSay); S.joinSay = null; }
  if (R) scene.remove(R.g); R = ['walk', 'piggy', 'portal', 'cannon'].includes(w.look) ? null : ride(w); if (R) scene.add(R.g);
  if (w.look === 'cannon' || w.kind === 'arc') { T.cannon = cannonAt(ME.obj.position.x - .8, ME.obj.position.z); face(ME, 'surprised', 3.5); }
  if (w.kind === 'rocket') face(ME, 'surprised', 4);
  if (w.kind === 'portal') { portals[0].position.set(ME.obj.position.x, ME.obj.position.y + .2, ME.obj.position.z); const e = spot(id, 0); portals[1].position.set(e[0], baseY(e) + .2, e[1]); portals.forEach(q => { q.visible = true; q.scale.setScalar(.01); }); }
  $('.trip').hidden = false; $('.tt').textContent = w.ic + ' ' + w.n + '去' + P[id].n + (tw ? ' · 和' + tw.n : '');
  sheet.classList.add('min'); sc.innerHTML = `<div><p class="h" style="font-size:22px">${esc(w.ic)} 去${esc(P[id].n)}</p><p class="k">地图上走得快一点：现实 1 分钟 ≈ 这里 1 秒左右${T.mins ? '（算 ' + T.mins + ' 分钟）' : ''}</p></div>`;
  PLACES.forEach(x => x.tag.classList.remove('sel')); if (w.kind !== 'road') ribbon(routeLine, []); else ribbon(routeLine, ME.moving.pl); ribbon(taLine, tw && !together ? tw.moving.pl : []);
}
async function arrive() {
  const T = S.trip, tw = T.w ? PP(T.w) : null, p = P[T.to], w = T.way;
  if (R) { scene.remove(R.g); R = null; } if (T.cannon) scene.remove(T.cannon); portals.forEach(x => x.visible = false);
  ME.at = T.to; ME.moving = null; ME.obj.visible = true; ME.obj.rotation.set(0, 0, 0); ME.obj.scale.setScalar(1);
  if (tw) { tw.at = T.to; tw.moving = null; tw.obj.visible = true; tw.obj.rotation.set(0, 0, 0); tw.obj.scale.setScalar(1); }
  relayout(T.to); if (T.from !== T.to) relayout(T.from);
  S.trip = null; $('.trip').hidden = true; ribbon(routeLine, []); ribbon(taLine, []); arcPreview(null);
  face(ME, 'happy', 4); if (tw) face(tw, 'happy', 4);
  const L = tw ? (T.L || await Promise.race([T.lineP, new Promise(r => setTimeout(() => r(null), 1500))]) || {}) : {};
  const line = tw ? (L.arrive || A.CANNED.arrive[0]) : '';
  const odd = T.oddTxt || '';
  if (tw) say(tw, line, 5200);
  await A.finish({ from: T.from, to: T.to, way: w, withId: tw ? tw.id : null, odd, line, cost: T.cost });
  if (!alive) return;
  const extra = { cannon: '你从天上掉下来，滚了两圈，站起来拍了拍土。', rocket: '火箭稳稳落地，冒着烟。', portal: '你从传送圈里冒出来，有点晕。', bubble: '泡泡「啵」地破了，你轻轻落地。', goose: '大鹅把你放下，扭头就走了。', piggy: (tw ? tw.n : 'TA') + '把你放下来，喘了口气。' }[w.look] || '';
  sheet.classList.remove('min');
  sc.innerHTML = `
    <div class="hd"><span class="big" aria-hidden="true">${ICON[p.type] || '📍'}</span><div><p class="h" style="font-size:23px">到啦！${esc(p.n)}</p><p class="k">${esc(w.ic + ' ' + w.n)} · ${timeTxt(w, T.len)}${T.cost && !DD.demo ? ' · 花了 ' + T.cost + ' 元' : ''}</p></div></div>
    ${extra ? `<div class="desc"><p>${esc(extra)}</p></div>` : ''}${odd ? `<div class="desc"><p>路上：${esc(odd)}</p></div>` : ''}
    ${tw ? `<div class="say">${avH(tw)}<span>${esc(line)}</span></div>` : ''}
    <div class="btns"><button class="go" type="button" data-k="room">${A.homeSpot(DD) === T.to && window.gyx3dRoomOpen && !DD.demo ? '进小屋' : '进去'}</button><button class="go ghost" type="button" data-k="back">回地图</button></div>
    <p class="k">${DD.demo ? '示例里的行程不记。' : '这一趟记进了「今天」和记忆总览；' + (tw ? esc(tw.n) + '记得你们一起来过这里，还记得是' + esc(w.n) + '来的。' : '一个人出门，TA 们问起来也知道你去哪了。')}</p>`;
  sc.querySelector('[data-k="back"]').onclick = home;
  sc.querySelector('[data-k="room"]').onclick = () => enterPlace(T.to);
}
function tripFrame(dt, now) {
  const T = S.trip, w = T.way, tw = T.w ? PP(T.w) : null; T.f = Math.min(1, T.f + dt / T.dur);
  let pos, dir = null;
  if (w.kind === 'road') { const mv = ME.moving; mv.d = T.f * mv.len; const r = roadAt(mv, mv.d); pos = new THREE.Vector3(r.x, baseY([r.x, r.z]), r.z); dir = [r.dx, r.dz]; }
  else if (w.kind === 'portal') { const f = T.f; portals[0].scale.setScalar(Math.min(1, f * 4)); portals[1].scale.setScalar(Math.max(.01, Math.min(1, (f - .4) * 4))); portals.forEach(q => q.rotation.z += dt * 5);
    const sh = f < .45 ? 1 - f / .45 : f > .55 ? (f - .55) / .45 : 0; [ME, T.together && tw].forEach(c => { if (c) c.obj.scale.setScalar(Math.max(.01, sh)); });
    const e = spot(T.to, 0); pos = f < .5 ? ME.obj.position.clone() : new THREE.Vector3(e[0], baseY(e), e[1]); if (f >= .5 && T.together) { const e2 = spot(T.to, 1); tw.obj.position.set(e2[0], baseY(e2), e2[1]); } }
  else { pos = T.fn(T.f); const nx = T.fn(Math.min(1, T.f + .01)); dir = [nx.x - pos.x, nx.z - pos.z]; }
  const yaw = dir && (dir[0] || dir[1]) ? Math.atan2(dir[0], dir[1]) : ME.obj.rotation.y;
  if (w.kind !== 'portal') {
    if (R) { R.g.position.copy(pos); R.g.rotation.y = yaw - Math.PI / 2; if (R.g.userData.flame) R.g.userData.flame.scale.y = .8 + Math.random() * .6; if (w.look === 'goose') R.g.position.y += Math.abs(Math.sin(now / 120)) * .15; }
    const seat = R ? R.seat : [0, 0, 0], seat2 = R ? R.seat2 : [-.6, 0, 0], off = s => { const c = Math.cos(yaw - Math.PI / 2), sN = Math.sin(yaw - Math.PI / 2); return new THREE.Vector3(s[0] * c + s[2] * sN, s[1], -s[0] * sN + s[2] * c); };
    if (w.look === 'piggy' && tw) { tw.obj.position.copy(pos); tw.obj.rotation.y = yaw; ME.obj.position.copy(pos).add(new THREE.Vector3(-Math.sin(yaw) * .32, .8, -Math.cos(yaw) * .32)); ME.obj.rotation.y = yaw; }
    else { ME.obj.position.copy(pos).add(off(seat)); ME.obj.rotation.y = yaw; ME.obj.visible = !(R && R.hide); if (w.kind === 'arc') ME.obj.rotation.x = T.f * Math.PI * 4;
      if (T.together && tw) { tw.obj.position.copy(pos).add(off(w.kind === 'road' && !R ? [0, 0, 1.1] : seat2)); tw.obj.rotation.y = yaw; tw.obj.visible = !(R && R.hide); } }
    if (T.cannon) T.cannon.visible = T.f < .5;
  }
  if (T.f > .45 && !T.odd) { T.odd = 1; T.oddTxt = (T.L && T.L.odd) || ((Math.random() < .6 && A.CANNED.oddw[w.look]) || pick1(A.CANNED.odd)); toast(T.oddTxt); }
  if (tw && T.together && T.f > .25 && !T.lines) { T.lines = 1; say(tw, (T.L && T.L.mid) || pick1(A.CANNED.mid)); }
  const apart = tw && !T.together && tw.moving;
  $('.trip .bar i').style.width = (T.f * 100).toFixed(1) + '%'; $('.tr').textContent = T.f >= 1 ? (apart ? '等' + tw.n : '到了') : w.kind === 'portal' ? '' : (T.mins ? '还有 ' + Math.max(0, Math.ceil(T.mins * (1 - T.f))) + ' 分钟' : '');
  tgt.lerp(new THREE.Vector3(pos.x, 0, pos.z), Math.min(1, dt * 3));
  const want = w.kind === 'rocket' ? 230 : w.look === 'balloon' ? 120 : ['air', 'arc'].includes(w.kind) ? 75 : 42; if (!fly && ptrs.size === 0) sph.radius += (want - sph.radius) * Math.min(1, dt * 1.2);
  if (T.f >= 1 && (!apart || tw.moving.d >= tw.moving.len - .1) && !T.done) { T.done = 1; arrive(); }
}

/* ================= 地方里面（面馆、住处、医院、寺、公园、小店……） ================= */
// 家（「我们的家」）进的是 3D 小屋；别的地方按类型搭一间：点地板走、点家具用、点 TA 跟 TA 玩
let IN = null;
const LAY = { eat: 'eat', tea: 'tea', bar: 'bar', tower: 'home', home: 'home', hos: 'hos', temple: 'temple', mount: 'park', park: 'park', water: 'park' };
const INACT = {
  eat: [['order', '🍜 一起点菜', '叫你一起坐下来点菜'], ['counter', '🧑‍🍳 去柜台看看', '']], tea: [['order', '🍵 一起喝茶', '叫你坐下来喝茶'], ['counter', '🫖 去柜台看看', '']], bar: [['order', '🍸 一起喝一杯', '叫你坐下来喝一杯'], ['counter', '🎶 去吧台', '']],
  home: [['sofa', '🛋️ 一起坐沙发', '叫你一起坐沙发'], ['table', '🍚 一起吃饭', '叫你一起吃饭'], ['bed', '😴 躺一会儿', '叫你一起躺一会儿']],
  hos: [['desk', '🩺 去 TA 桌前坐坐', '坐到你桌子对面，让你看看她'], ['bed', '🛏️ 躺一会儿', '在病床上躺下，叫你坐旁边']],
  temple: [['pray', '🙏 一起上香', '叫你一起上香'], ['sit', '🪷 坐一会儿', '叫你一起在蒲团上坐一会儿']],
  park: [['bench', '🪑 一起坐长椅', '叫你一起坐长椅'], ['walk', '🚶 绕着走一圈', '拉着你绕着走一圈']],
  shop: [['shop', '🛍️ 一起逛逛', '拉着你一起逛'], ['sit', '☕ 坐一会儿', '叫你一起坐一会儿']]
};
const INCOMMON = [['hi', '👋 打招呼', '跟你打了个招呼'], ['hug', '🤗 抱抱', '走过来抱住了你'], ['poke', '👆 戳戳', '戳了戳你']];
const INLOG = { hi: '打了个招呼', hug: '抱了抱', poke: '戳了戳', talk: '说了几句话', order: '一起点了单', counter: '去柜台看了看', sofa: '一起坐在沙发上', table: '一起吃了饭', bed: '躺了一会儿', desk: '去 TA 桌前坐了坐', pray: '一起上了香', sit: '坐了一会儿', bench: '一起坐在长椅上', walk: '绕着走了一圈', shop: '一起逛了逛' };
function buildInside(p) {
  const kind = LAY[p.type] || 'shop', out = kind === 'park';
  const s2 = new THREE.Scene(); s2.background = new THREE.Color(out ? K(0x9fdcff, 0xbfdcea) : K(0xf6efe6, 0xd6d2c8));
  const h = new THREE.HemisphereLight(0xffffff, 0xbfa98a, K(1.5, 1.1)), dl = new THREE.DirectionalLight(0xfff3df, 1.5); dl.position.set(6, 18, 12); dl.castShadow = !D.low; dl.shadow.mapSize.set(1024, 1024); Object.assign(dl.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 1, far: 70 }); s2.add(h, dl);
  const lamp = new THREE.PointLight(0xffc77a, 0, 30); lamp.position.set(0, 6, 0); s2.add(lamp);
  const add = (geo, c, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, typeof c === 'number' ? m(c) : c); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = !D.low; o.receiveShadow = true; s2.add(o); return o; };
  const W = out ? 30 : 22, Dp = out ? 20 : 14, spots = {}, pick = [], pairs = {};
  const SP = (k, n, x, z, rot, state, y = 0) => (spots[k] = { k, n, pos: [x, z], rot, state, y });
  const tag = (o, k) => { o.userData.spot = k; pick.push(o); return o; };
  const chair = (x, z, rot, col) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; const st = new THREE.Mesh(RB(1.1, .18, 1.1, .08), m(col)); st.position.y = .62; g.add(st); const bk = new THREE.Mesh(RB(1.1, 1.1, .16, .06), m(col)); bk.position.set(0, 1.1, -.5); g.add(bk); for (const [a, b] of [[-.45, -.45], [.45, -.45], [-.45, .45], [.45, .45]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .62, 6), m(col)); l.position.set(a, .31, b); g.add(l); } g.traverse(o => { if (o.isMesh) { o.castShadow = !D.low; o.receiveShadow = true; } }); s2.add(g); return g; };
  const table = (x, z, w, d, hh, col) => { const t = add(RB(w, .2, d, .08), col, x, hh, z); add(new THREE.CylinderGeometry(.16, .25, hh, 8), col, x, hh / 2, z); return t; };
  const floorC = { eat: 0xe8c9a0, tea: 0xd9b88f, bar: 0x6b4b5c, home: 0xe9d3b5, hos: 0xe3eef0, temple: 0xc9a77c, park: 0x8fd46d, shop: 0xeadfcf }[kind];
  const wallC = { eat: 0xfff3e2, tea: 0xfff0d6, bar: 0x3d2a5c, home: 0xfff6e8, hos: 0xffffff, temple: 0xff9a6a, shop: 0xe2f4ff }[kind];
  add(RB(W, .6, Dp, .25), floorC, 0, -.3, 0);
  if (!out) { add(RB(W, 7, .5, .2), wallC, 0, 3.5, -Dp / 2); add(RB(.5, 7, Dp, .2), wallC, -W / 2, 3.5, 0); add(RB(.5, 7, Dp, .2), wallC, W / 2, 3.5, 0); const wn = add(RB(4, 2.4, .2, .1), winM, -5, 4.2, -Dp / 2 + .3); wn.castShadow = false; add(RB(2.2, 4, .2, .1), m(0xb9805a), W / 2 - 2.5, 2, Dp / 2 - .2).visible = false; }
  SP('door', '门口', W / 2 - 3, Dp / 2 - 1.2, -2.4, 'idle');
  const lantern = (x, y, z, c) => add(SG(.55, 12, 10), new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: .5 }), x, y, z);
  if (kind === 'eat' || kind === 'tea' || kind === 'bar') {
    const wood = kind === 'bar' ? 0x2a2730 : 0xb9805a, top = kind === 'bar' ? 0x8a7bff : 0xd9483b;
    tag(add(RB(8, 1.6, 1.6, .3), wood, 0, .8, -Dp / 2 + 1.6), 'counter'); add(RB(8.4, .2, 1.9, .08), top, 0, 1.7, -Dp / 2 + 1.6); SP('counter', '柜台前', 0, -Dp / 2 + 3.4, Math.PI, 'idle');
    if (kind === 'eat') { add(RB(2.4, 1.2, 1.4, .3), 0x8f8a82, -5, .6, -Dp / 2 + 1.2); add(new THREE.CylinderGeometry(.7, .6, .7, 14), 0x5a5f7a, -5, 1.55, -Dp / 2 + 1.2); }
    if (kind === 'tea') for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(.22, .26, .4, 10), 0xffffff, -1.6 + i * .8, 1.95, -Dp / 2 + 1.5);
    if (kind === 'bar') { for (let i = 0; i < 6; i++) add(new THREE.CylinderGeometry(.12, .16, .7, 8), [0x4fc59a, 0xffb84d, 0xff6f8f][i % 3], -2.5 + i, 2.15, -Dp / 2 + 1.1); add(RB(5, .5, .1, .05), new THREE.MeshLambertMaterial({ color: 0xff4fd8, emissive: 0xff4fd8, emissiveIntensity: .9 }), 0, 5, -Dp / 2 + .3); }
    [-6.5, 0, 6.5].forEach((tx, i) => { const tz = 2; tag(table(tx, tz, 2.6, 2, kind === 'tea' ? .9 : 1.25, wood), 't' + i); chair(tx - 1.9, tz, Math.PI / 2, wood); chair(tx + 1.9, tz, -Math.PI / 2, wood); SP('t' + i, '桌边', tx - 1.9, tz, Math.PI / 2, 'eat', .62); SP('t' + i + 'b', '桌边对面', tx + 1.9, tz, -Math.PI / 2, 'eat', .62); pairs['t' + i] = 't' + i + 'b'; pairs['t' + i + 'b'] = 't' + i; spots['t' + i].table = [tx, tz, kind === 'tea' ? .9 : 1.25]; spots['t' + i + 'b'].table = spots['t' + i].table; });
    for (const x of [-7, 0, 7]) lantern(x, 6, -1, kind === 'bar' ? 0xff4fd8 : 0xff4d3d);
  } else if (kind === 'home') {
    const bed = add(RB(4.2, .8, 5.6, .3), 0xb9805a, 7.6, .4, -3.6); add(RB(4, .5, 5.2, .3), 0xffffff, 7.6, 1, -3.6); add(RB(3.6, .45, 1.2, .2), 0xffe1e8, 7.6, 1.45, -5.6); tag(bed, 'bed');
    SP('bed', '床上', 6.7, -3.4, 0, 'sleep', 1.03); SP('bed2', '床上另一边', 8.5, -3.4, 0, 'sleep', 1.03); pairs.bed = 'bed2'; pairs.bed2 = 'bed';
    const so = add(RB(5.4, 1, 2, .45), 0xff8fb3, -5, .5, -4.8); add(RB(5.4, 1.6, .6, .3), 0xff8fb3, -5, 1.3, -5.6); tag(so, 'sofa'); SP('sofa', '沙发上', -6.2, -4.5, 0, 'read', .62); SP('sofa2', '沙发另一头', -3.8, -4.5, 0, 'daze', .62); pairs.sofa = 'sofa2'; pairs.sofa2 = 'sofa';
    tag(table(-4, 2.5, 3, 2, 1.25, 0xb9805a), 'table'); chair(-5.9, 2.5, Math.PI / 2, 0xb9805a); chair(-2.1, 2.5, -Math.PI / 2, 0xb9805a); SP('table', '餐桌', -5.9, 2.5, Math.PI / 2, 'eat', .62); SP('table2', '餐桌对面', -2.1, 2.5, -Math.PI / 2, 'eat', .62); pairs.table = 'table2'; pairs.table2 = 'table'; spots.table.table = spots.table2.table = [-4, 2.5, 1.25];
    SP('window', '窗边', -5, -Dp / 2 + 1.6, Math.PI, 'daze'); tag(add(RB(1, 5, 4, .2), 0xb9805a, -W / 2 + 1, 2.5, -1), 'shelf'); for (let i = 0; i < 8; i++) add(RB(.6, .8, .3, .05), [0x5fb8f0, 0xffb84d, 0x4fc59a, 0xff7f6e][i % 4], -W / 2 + 1.6, 1 + Math.floor(i / 4) * 1.6, -2.2 + (i % 4) * .8); SP('shelf', '书架前', -W / 2 + 2.6, -1, -Math.PI / 2, 'think');
    add(new THREE.CircleGeometry(3, 24), m(0xfff1e0), 1, .02, 1).rotation.x = -Math.PI / 2; SP('rug', '地毯上', 1, 1, 0, 'idle');
  } else if (kind === 'hos') {
    [-4, 0, 4].forEach((z, i) => { const b = add(RB(4.4, .9, 2.2, .2), 0xeaf6ff, -7.4, .45, z); add(RB(4.2, .3, 2, .15), 0xffffff, -7.4, 1.05, z); add(RB(.15, 4, 2.6, .05), new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: .7 }), -4.7, 2.2, z + 1.4).castShadow = false; tag(b, 'b' + i); chair(-4.2, z, -Math.PI / 2, 0x8fa7b8); SP('b' + i, '病床上', -7.6, z, Math.PI / 2, 'sleep', 1.0); SP('b' + i + 'c', '床边', -4.2, z, -Math.PI / 2, 'sit', .74); pairs['b' + i] = 'b' + i + 'c'; pairs['b' + i + 'c'] = 'b' + i; });
    tag(table(6.5, -3.6, 3.6, 2, 1.3, 0xffffff), 'desk'); chair(6.5, -5.3, 0, 0x5fb8f0); chair(6.5, -1.9, Math.PI, 0x5fb8f0); SP('desk', '桌子后面', 6.5, -5.3, 0, 'think', .74); SP('desk2', '桌子对面', 6.5, -1.9, Math.PI, 'sit', .74); pairs.desk = 'desk2'; pairs.desk2 = 'desk';
    add(RB(2.4, 1, .2, .1), 0xff6f8f, 0, 5.2, -Dp / 2 + .3); add(RB(.8, 3, .2, .1), 0xff6f8f, 0, 5.2, -Dp / 2 + .32); add(RB(2, 4.6, 1.2, .2), 0xe2e9ee, 9.6, 2.3, 3);
  } else if (kind === 'temple') {
    for (const x of [-7, 7]) for (const z of [-3, 3]) add(new THREE.CylinderGeometry(.5, .5, 7, 12), 0xd23b30, x, 3.5, z);
    tag(add(RB(6, 1.6, 2, .3), 0x6a4fb8, 0, .8, -Dp / 2 + 2), 'altar'); add(new THREE.CylinderGeometry(.6, .5, .8, 14), 0xd9c07e, 0, 2, -Dp / 2 + 2); for (const x of [-.25, 0, .25]) add(new THREE.CylinderGeometry(.03, .03, 1, 4), new THREE.MeshLambertMaterial({ color: 0xffb84d, emissive: 0xff8a3d, emissiveIntensity: .8 }), x, 2.8, -Dp / 2 + 2);
    for (const x of [-2.4, 2.4]) lantern(x, 2.2, -Dp / 2 + 2, 0xffd37a);
    SP('altar', '香案前', 0, -Dp / 2 + 3.8, Math.PI, 'think'); [-3, 0, 3].forEach((x, i) => { tag(add(new THREE.CylinderGeometry(.8, .85, .3, 16), 0xffd37a, x, .15, 1), 'c' + i); SP('c' + i, '蒲团上', x, 1, Math.PI, 'sit', .2); }); pairs.c0 = 'c1'; pairs.c1 = 'c0'; pairs.c2 = 'c1';
    SP('steps', '偏殿台阶', 8, 5, -2.4, 'daze');
  } else if (kind === 'park') {
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, x = Math.cos(a) * 12, z = Math.sin(a) * 8; add(new THREE.CylinderGeometry(.3, .4, 1.8, 8), 0xa8714a, x, .9, z); add(SG(2, 14, 10), i % 4 ? 0x63c35a : 0xffb3cc, x, 3.1, z); }
    [[-5, 1], [5, 1]].forEach(([x, z], i) => { const b = add(RB(4, .3, 1.3, .12), 0xb9805a, x, .7, z); add(RB(4, 1, .2, .08), 0xb9805a, x, 1.3, z - .6); tag(b, 'k' + i); SP('k' + i, '长椅上', x - .9, z, 0, 'sit', .74); SP('k' + i + 'b', '长椅另一头', x + .9, z, 0, 'sit', .74); pairs['k' + i] = 'k' + i + 'b'; pairs['k' + i + 'b'] = 'k' + i; });
    tag(add(new THREE.CylinderGeometry(2.2, 2.4, .8, 20), 0xf3e9d6, 0, .4, -4), 'fountain'); add(new THREE.CylinderGeometry(1.8, 1.8, .2, 20), new THREE.MeshLambertMaterial({ color: K(0x5fd0ec, 0x6aa5bd) }), 0, .85, -4); SP('fountain', '喷泉边', 0, -1.4, Math.PI, 'daze');
    if (p.type === 'water') add(RB(W, .4, 5, .2), new THREE.MeshLambertMaterial({ color: K(0x5fd0ec, 0x6aa5bd) }), 0, -.05, -Dp / 2 + 1);
  } else {
    tag(add(RB(5, 1.5, 1.6, .3), 0xb9805a, 5, .75, -Dp / 2 + 1.8), 'counter'); SP('counter', '柜台前', 5, -Dp / 2 + 3.6, Math.PI, 'idle');
    for (let s = 0; s < 3; s++) { add(RB(6, .2, 1.2, .06), 0xffffff, -4, 1 + s * 1.5, -Dp / 2 + 1); for (let i = 0; i < 6; i++) add(RB(.7, .9, .6, .12), [0xff7f6e, 0x5fb8f0, 0xffb84d, 0x4fc59a, 0x8a7bff][(i + s) % 5], -6.3 + i * .9, 1.55 + s * 1.5, -Dp / 2 + 1); }
    tag(add(RB(6.2, .2, .2, .05), 0xffffff, -4, .05, -Dp / 2 + 1.6), 'shelf'); SP('shelf', '货架前', -4, -Dp / 2 + 3, Math.PI, 'think');
    tag(table(-4, 3, 2.4, 2, 1.25, 0xb9805a), 'seat'); chair(-5.8, 3, Math.PI / 2, 0xb9805a); chair(-2.2, 3, -Math.PI / 2, 0xb9805a); SP('seat', '小桌边', -5.8, 3, Math.PI / 2, 'eat', .62); SP('seat2', '小桌对面', -2.2, 3, -Math.PI / 2, 'eat', .62); pairs.seat = 'seat2'; pairs.seat2 = 'seat'; spots.seat.table = spots.seat2.table = [-4, 3, 1.25];
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, Dp), new THREE.MeshBasicMaterial({ visible: false })); floor.rotation.x = -Math.PI / 2; floor.userData.floor = 1; s2.add(floor);
  return { kind, scene: s2, spots, pick, pairs, floor, W, Dp, lamp, hemi: h };
}
// 每种地方 TA 一开始待在哪
const INHOME = { eat: ['t1', 't0', 'counter'], tea: ['t1', 't0'], bar: ['counter', 't1'], home: ['sofa', 'table', 'shelf'], hos: ['desk', 'b1c', 'b0'], temple: ['altar', 'c1', 'steps'], park: ['k0', 'fountain', 'k1'], shop: ['counter', 'shelf', 'seat'] };
function walkIn(p, x, z, then) {
  return new Promise(res => { const o = p.obj.position; p.inMv = { from: [o.x, o.z], to: [x, z], d: 0, len: Math.hypot(x - o.x, z - o.z), then, res }; p.spot = null; if (p.inMv.len < .05) { p.inMv.d = p.inMv.len; } });
}
function settle(p, sp) { p.spot = sp ? sp.k : null; p.obj.rotation.y = sp ? sp.rot : p.obj.rotation.y; const y = sp && sp.y ? sp.y : 0; p.obj.position.y = p.av ? y : (sp && sp.state === 'sleep' ? y : 0); p.inState = sp ? sp.state : 'idle'; if (!p.av && p.body) p.body.rotation.x = sp && sp.state === 'sleep' ? -Math.PI / 2 : 0; if (!p.av && p.body) p.body.position.y = sp && sp.state === 'sleep' ? .5 : 0; }
const goSpot = (p, k) => { const sp = IN.spots[k]; if (!sp) return Promise.resolve(); return walkIn(p, sp.pos[0], sp.pos[1], sp); };
const freeSpot = (k, who) => { const taken = s => IN.people.some(q => q !== who && q.spot === s); if (!taken(k)) return k; const pr = IN.pairs[k]; if (pr && !taken(pr)) return pr; return k; };
function enterPlace(id) {
  if (S.trip || IN) return; const p = P[id]; if (!p) return;
  if (A.homeSpot(DD) === id && window.gyx3dRoomOpen && !DD.demo) { const ta = PEOPLE.find(q => q.id !== 'me' && q.at === id && !q.moving); close(); window.gyx3dRoomOpen(ta ? ta.id : undefined); return; }
  const B = buildInside(p); const ppl = PEOPLE.filter(q => q.at === id && !q.moving);
  IN = Object.assign(B, { p, people: ppl, ta: (ppl.find(q => q.id !== 'me') || {}).id || null, keep: { t: tgt.clone(), r: sph.radius, ph: sph.phi, th: sph.theta, m3: S.mode3d }, busy: false, dishes: [] });
  ppl.forEach(q => { scene.remove(q.obj); IN.scene.add(q.obj); q.obj.rotation.set(0, 0, 0); });
  const dr = IN.spots.door; ME.obj.position.set(dr.pos[0], 0, dr.pos[1]); settle(ME, null);
  const others = ppl.filter(q => q.id !== 'me'); const hs = INHOME[IN.kind] || ['door'];
  others.forEach((q, i) => { const k = freeSpot(hs[i % hs.length] || 'door', q), sp = IN.spots[k] || dr; q.obj.position.set(sp.pos[0], 0, sp.pos[1]); settle(q, sp); });
  walkIn(ME, dr.pos[0] - 3, dr.pos[1] - 3, null);
  S.mode3d = true; tgt.set(0, 0, 0); sph.set(mobile ? 30 : 25, .92, 0); fly = null;
  root.classList.add('inside'); PLACES.forEach(q => { q.tag.style.display = 'none'; }); PEOPLE.forEach(q => { if (!ppl.includes(q)) { q.tag.style.display = 'none'; q.bub.style.display = 'none'; } });
  const gate = document.createElement('div'); gate.id = 'gysMap3dInOv'; gate.setAttribute('data-gy-overlay', ''); gate.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;z-index:9605;pointer-events:none'; document.body.appendChild(gate); IN.gate = gate;
  IN.gob = new MutationObserver(() => { if (IN && !gate.isConnected) exitPlace(); }); IN.gob.observe(document.body, { childList: true });
  if (others[0]) setTimeout(() => { if (IN) { const q = others[0]; say(q, pick1(['来了？', '你来啦。', '这边。', '嗯，坐。'])); faceTo(q, ME); } }, 900);
  inSheet();
}
function exitPlace() {
  if (!IN) return; const I = IN; IN = null;
  try { I.gob.disconnect(); if (I.gate.isConnected) I.gate.remove(); } catch (e) {}
  I.people.forEach(q => { I.scene.remove(q.obj); scene.add(q.obj); q.inMv = null; q.spot = null; q.inState = null; if (!q.av && q.body) { q.body.rotation.x = 0; q.body.position.y = 0; } q.obj.position.y = 0; });
  I.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  relayout(I.p.id); tgt.copy(I.keep.t); sph.set(I.keep.r, I.keep.ph, I.keep.th); S.mode3d = I.keep.m3;
  root.classList.remove('inside'); PLACES.forEach(q => { q.tag.style.display = ''; }); PEOPLE.forEach(q => { q.tag.style.display = ''; q.bub.style.display = ''; });
  openPlace(I.p.id);
}
function faceTo(a, b) { const dx = b.obj.position.x - a.obj.position.x, dz = b.obj.position.z - a.obj.position.z; if (Math.hypot(dx, dz) > .1) a.obj.rotation.y = Math.atan2(dx, dz); }
function inSheet() {
  const I = IN, others = I.people.filter(q => q.id !== 'me'), ta = PP(I.ta);
  const acts = INCOMMON.concat(INACT[I.kind] || INACT.shop);
  sheet.classList.remove('min');
  sc.innerHTML = `
    <div class="hd"><span class="big" aria-hidden="true">${ICON[I.p.type] || '📍'}</span><div><p class="h" style="font-size:22px">${esc(I.p.n)}<span class="k" style="font-weight:500"> · 里面</span></p><p class="k">${others.length ? esc(others.map(q => q.n).join('、')) + ' 也在' : '这里没有别人'} · 点地板走过去，点桌椅床就去用</p></div><button class="x" type="button" data-k="out" aria-label="出去">↩</button></div>
    ${others.length > 1 ? `<div class="chips" data-k="who">${others.map(q => `<button class="chip ${q.id === I.ta ? 'on' : ''}" type="button" data-c="${q.id}">${esc(q.n)}</button>`).join('')}</div>` : ''}
    <div class="ways" data-k="acts">${acts.map(a => `<button class="way" type="button" data-a="${a[0]}" ${!ta && INCOMMON.some(c => c[0] === a[0]) ? 'disabled' : ''}><em aria-hidden="true">${a[1].split(' ')[0]}</em><b>${esc(a[1].split(' ').slice(1).join(' '))}</b></button>`).join('')}</div>
    ${ta ? `<div class="talk"><input type="text" data-k="say" placeholder="跟${esc(ta.n)}说句话…" maxlength="80"><button class="go sm" type="button" data-k="send">说</button></div>` : '<p class="k">一个人也能坐坐、逛逛。叫 TA 一起来：出去以后点这里，「跟谁去」选 TA。</p>'}
    <div class="inlog" data-k="log"></div>
    <button class="go ghost" type="button" data-k="out2">出去</button>`;
  sc.querySelector('[data-k="out"]').onclick = exitPlace; sc.querySelector('[data-k="out2"]').onclick = exitPlace;
  const who = sc.querySelector('[data-k="who"]'); if (who) who.onclick = e => { const b = e.target.closest('[data-c]'); if (b) { I.ta = b.dataset.c; inSheet(); } };
  sc.querySelector('[data-k="acts"]').onclick = e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled) inDo(b.dataset.a); };
  const send = sc.querySelector('[data-k="send"]'); if (send) { const inp = sc.querySelector('[data-k="say"]'); const go = () => { const t = inp.value.trim(); if (!t) return inp.focus(); inp.value = ''; inDo('talk', t); }; send.onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); }; }
  inLog();
}
function inLog(t) { if (!IN) return; IN.log = IN.log || []; if (t) IN.log.push(t); const b = sc.querySelector('[data-k="log"]'); if (b) b.innerHTML = IN.log.slice(-4).map(x => `<div>${esc(x)}</div>`).join(''); }
function dish(sp, t) { if (!sp || !sp.table || !t) return; const em = (String(t).match(/\p{Extended_Pictographic}/u) || ['🍽️'])[0]; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(em), transparent: true })); s.scale.set(1.1, 1.1, 1); s.position.set(sp.table[0] + (sp.pos[0] < sp.table[0] ? -.5 : .5), sp.table[2] + .6, sp.table[1]); IN.scene.add(s); IN.dishes.push(s); }
const actOk = a => { const L = window.GY3D && window.GY3D.ACT_CN; if (!L) return null; if (L[a]) return a; return Object.keys(L).find(k => L[k] === a || String(a).includes(L[k])) || null; };
async function inDo(kind, text) {
  const I = IN; if (!I || I.busy) return; const ta = PP(I.ta), act = (INACT[I.kind] || []).concat(INCOMMON).find(a => a[0] === kind);
  I.busy = true; sc.querySelectorAll('[data-a],[data-k="send"]').forEach(b => b.disabled = true);
  try {
    // 一起做的事：两个人各去一个位置
    const SPK = { order: freeSpot('t1', ME), counter: 'counter', sofa: 'sofa', table: 'table', bed: I.kind === 'hos' ? 'b1' : 'bed', desk: 'desk2', pray: 'c1', sit: I.kind === 'temple' ? 'c0' : 'seat', bench: 'k0', walk: null, shop: 'shelf' }[kind];
    const together = !!(ta && act && act[2] && kind !== 'counter');
    I.mine = null;
    if (kind === 'walk') { const L = [[-8, 5], [-9, -3], [0, -6.5], [9, -3], [8, 5], [0, 6]]; for (const [x, z] of L) { const ps = [walkIn(ME, x, z)]; if (ta) ps.push(walkIn(ta, x + 1.1, z + .4)); await Promise.all(ps); if (!IN) return; } }
    else if (SPK && I.spots[SPK]) {
      const mine = kind === 'desk' ? 'desk2' : SPK; await goSpot(ME, mine); if (!IN) return; I.mine = mine;
    } else if (ta) { const o = ta.obj.position, m0 = ME.obj.position, dx = m0.x - o.x, dz = m0.z - o.z, L = Math.hypot(dx, dz) || 1; if (L > 1.6) await walkIn(ME, o.x + dx / L * 1.2, o.z + dz / L * 1.2); if (!IN) return; faceTo(ME, ta); }
    if (text) say(ME, text, 3600);
    if (!ta) { if (kind === 'order') dish(I.spots[SPK], pick1(['🍜', '🍵', '🍸', '🥟'])); inLog('你' + (INLOG[kind] || '待了一会儿')); return; }
    const sleeping = ta.inState === 'sleep';
    const ev = kind === 'talk' ? `她跟你说：「${text}」` : '她' + (act ? act[2] || ('想' + act[1].split(' ').slice(1).join('')) : '') + '。';
    const ask = kind === 'order' ? '你们坐下来了，在 JSON 里多给一个 dish：你点了什么（一两个 emoji + 名字，比如「🍜 白汤面」）。' : together ? '她在叫你一起，你来不来？在 JSON 里多给一个 go（true / false）。' : '';
    const r = await A.inReact(ta.c, { place: I.p.n, desc: I.p.desc, doing: (ta.spot && I.spots[ta.spot] ? '在' + I.spots[ta.spot].n : '站着') + (sleeping ? '（睡着了）' : ''), event: ev, ask, askKey: kind === 'order' ? ',"dish":""' : together ? ',"go":true' : '' });
    if (!IN) return;
    // TA 答应了才过来（坐到对面 / 旁边）
    if (together && r.go !== false && I.mine) { const pr = kind === 'desk' ? 'desk' : I.pairs[I.mine]; if (pr && I.spots[pr]) goSpot(ta, pr); else { const sp = I.spots[I.mine]; walkIn(ta, sp.pos[0] + 1.2, sp.pos[1] + .4, { k: null, rot: sp.rot, state: 'idle', y: 0 }); } }
    else if (kind === 'walk' && ta) faceTo(ta, ME);
    if (!together || r.go === false) faceTo(ta, ME);
    const a = actOk(r.act);
    if (ta.av) { try { if (a) ta.av.play(a); if (r.face) ta.av.lockFace(r.face, 4); } catch (e) {} } else { ta.hop = 1; if (r.face === 'happy' || r.face === 'surprised') face(ta, r.face, 3); }
    if (kind === 'hug' && ME.av) try { ME.av.play('hug'); } catch (e) {}
    say(ta, r.say, 5200);
    if (kind === 'order' && r.go !== false) { const sp = I.spots[ME.spot] || I.spots[SPK]; dish(sp, r.dish || '🍜'); if (r.dish) inLog(ta.n + ' 点了 ' + r.dish); }
    const what = (kind === 'talk' ? '说了几句话' : INLOG[kind] || '待了一会儿') + (r.go === false ? '（TA 没来）' : '') + (r.dish ? '：' + r.dish : '');
    inLog('你' + what + ' → ' + ta.n + '：「' + r.say + '」');
    A.logIn({ to: I.p.id, ic: ICON[I.p.type] || '📍', withId: ta.id, what, line: r.say });
  } finally { if (IN === I) { I.busy = false; sc.querySelectorAll('[data-a],[data-k="send"]').forEach(b => b.disabled = false); const ta2 = PP(I.ta); if (!ta2) sc.querySelectorAll('[data-a]').forEach(b => { if (INCOMMON.some(c => c[0] === b.dataset.a)) b.disabled = true; }); } }
}
function inTap(e) {
  const r = cv.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(v2, cam);
  const hitP = IN.people.map(q => q.obj.children.find(o => o.userData && o.userData.person)).filter(Boolean);
  const h = ray.intersectObjects(hitP.concat(IN.pick), false)[0];
  if (h && h.object.userData.person) { const q = PP(h.object.userData.person); if (q && q.id !== 'me') { IN.ta = q.id; inSheet(); inDo('poke'); } return; }
  if (h && h.object.userData.spot) { let k = h.object.userData.spot; k = freeSpot(k, ME); goSpot(ME, k); return; }
  const f = ray.intersectObject(IN.floor, false)[0]; if (f) walkIn(ME, Math.max(-IN.W / 2 + 1.2, Math.min(IN.W / 2 - 1.2, f.point.x)), Math.max(-IN.Dp / 2 + 1.2, Math.min(IN.Dp / 2 - 1.2, f.point.z)), null);
}
function inFrame(dt, now) {
  const h = minNow() / 60, night = h < 6 || h > 19;
  IN.lamp.intensity = night ? 40 : 0; IN.hemi.intensity = (night ? .8 : K(1.5, 1.1));
  IN.people.forEach(q => { const mv = q.inMv; let walking = false;
    if (mv) { mv.d = Math.min(mv.len, mv.d + 4.2 * dt); const t = mv.len ? mv.d / mv.len : 1; q.obj.position.set(mv.from[0] + (mv.to[0] - mv.from[0]) * t, 0, mv.from[1] + (mv.to[1] - mv.from[1]) * t); if (mv.len > .05) { const yaw = Math.atan2(mv.to[0] - mv.from[0], mv.to[1] - mv.from[1]); q.obj.rotation.y += ((yaw - q.obj.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 10); }
      walking = mv.d < mv.len; if (!walking) { q.inMv = null; if (mv.then) settle(q, mv.then); else { q.inState = 'idle'; } mv.res && mv.res(); } }
    if (q.hop) { q.hop = Math.max(0, q.hop - dt * 2.2); q.obj.position.y = Math.sin(q.hop * Math.PI) * .6 + (q.spot && q.av && IN.spots[q.spot] ? IN.spots[q.spot].y || 0 : 0); }
    const st = walking ? 'walk' : (q.inState || 'idle');
    if (q.av) { try { q.av.setState(st); q.av.update(dt); } catch (e) {} }
    else { const u = q.body.userData; if (walking && !reduce) u.ph += dt * 12; const s = walking && !reduce ? Math.sin(u.ph) : 0; u.lg[0].rotation.x = s * .7; u.lg[1].rotation.x = -s * .7; u.ar[0].rotation.x = -s * .8; u.ar[1].rotation.x = s * .8; u.head.position.y = u.h0 + Math.sin(now / 520 + u.ph) * .05; }
  });
  if (!fly && ptrs.size === 0) { const o = ME.obj.position; tgt.x += (o.x * .5 - tgt.x) * Math.min(1, dt * 1.5); tgt.z += (o.z * .4 - tgt.z) * Math.min(1, dt * 1.5); }
}

/* ================= 设置（天气、时间、风格……） ================= */
function setPop() {
  const pop = $('.pop'); if (!pop.hidden) { pop.hidden = true; return; }
  const segH = (k, opts, v) => `<div class="seg" data-s="${k}">${opts.map(([a, b]) => `<button type="button" data-v="${a}" class="${a === v ? 'on' : ''}">${b}</button>`).join('')}</div>`;
  pop.innerHTML = `<h4>地图风格</h4>${segH('style', [['toy', '圆滚滚'], ['low', '低模']], D.style)}
    <h4>小人</h4>${segH('av', [['auto', '3D 小人'], ['simple', '简单小人']], D.av === 'simple' ? 'simple' : 'auto')}${!A.hasAv() ? '<p class="k">「🧊 3D 小人」没开，现在都是简单小人。</p>' : ''}
    <h4>天气 <span class="k">${D.wx ? '' : '跟着现实：' + esc(DD.wdesc || '还没拉到天气')}</span></h4>${segH('wx', [['', '现实']].concat(A.allWx().map(w => [w.id, (w.custom ? esc(w.ic || '✨') + ' ' : '') + esc(w.n)])), D.wx)}<button class="lnk" type="button" data-k="wxed">＋ 自定义天气</button>
    <h4>时间 <span class="k tl">${$('.clock').textContent}</span></h4><input type="range" min="0" max="1439" value="${minNow()}" aria-label="时间"><div class="row"><span>跟着现实时间</span><button class="sw ${S.min == null ? 'on' : ''}" type="button" data-k="now" aria-label="跟着现实时间"></button></div>
    ${DD.factions.length > 1 && !DD.demo ? `<h4>看哪</h4><select data-k="fac"><option value="">全部地点</option>${DD.factions.map(f => `<option value="${esc(f)}"${f === D.fac ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select>` : ''}
    <div class="row"><span>省电（不画影子）</span><button class="sw ${D.low ? 'on' : ''}" type="button" data-k="low" aria-label="省电"></button></div>
    <div class="btns"><button class="go ghost sm" type="button" data-k="ways">出行方式</button><button class="go ghost sm" type="button" data-k="gomap">编辑地点</button></div>
    ${DD.real && !DD.demo ? '<button class="lnk" type="button" data-k="demo">看看示例小城</button>' : ''}`;
  pop.hidden = false;
  const reboot = () => { pop.hidden = true; A.save(); window.gysMap3dBoot(A, {}); };
  pop.querySelectorAll('[data-s]').forEach(s => s.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; const k = s.dataset.s, v = b.dataset.v; if (k === 'wx') { D.wx = v; A.save(); sky(); s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); return; } if (D[k] === v) return; D[k] = v; reboot(); });
  pop.querySelector('input[type=range]').oninput = e => { S.min = +e.target.value; sky(); pop.querySelector('.tl').textContent = $('.clock').textContent; pop.querySelector('[data-k="now"]').classList.remove('on'); };
  pop.querySelector('[data-k="now"]').onclick = e => { S.min = S.min == null ? minNow() : null; e.currentTarget.classList.toggle('on', S.min == null); sky(); };
  pop.querySelector('[data-k="low"]').onclick = () => { D.low = !D.low; reboot(); };
  pop.querySelector('[data-k="wxed"]').onclick = () => { pop.hidden = true; wxEditor(); };
  const fac = pop.querySelector('[data-k="fac"]'); if (fac) fac.onchange = () => { D.fac = fac.value; reboot(); };
  pop.querySelector('[data-k="ways"]').onclick = () => { pop.hidden = true; wayEditor(() => { if (S.sel) openPlace(S.sel); }); };
  pop.querySelector('[data-k="gomap"]').onclick = () => { close(); try { window.gymapOpenTab ? window.gymapOpenTab('map') : window.gymapOpen(); } catch (e) {} };
  const dm = pop.querySelector('[data-k="demo"]'); if (dm) dm.onclick = () => { D.demo = true; reboot(); };
}
root.querySelector('[data-k="set"]').onclick = setPop;
root.querySelector('[data-k="close"]').onclick = () => IN ? exitPlace() : close();
root.querySelector('[data-k="3d"]').onclick = e => { S.mode3d = !S.mode3d; e.currentTarget.textContent = S.mode3d ? '3D' : '2D'; e.currentTarget.classList.toggle('on', S.mode3d); flyTo(tgt.x, tgt.z, undefined, S.mode3d ? .95 : .02); };
root.querySelector('[data-k="me"]').onclick = () => { const o = ME.obj.position; flyTo(o.x, o.z, 30); };
root.querySelector('[data-k="all"]').onclick = () => flyTo(CX, CZ, Math.max(W0, H0) * (mobile ? 1.25 : .95));
root.querySelector('.search input').addEventListener('keydown', e => { if (e.key !== 'Enter') return; const v = e.target.value.trim(); if (!v) return home(); const p = PEOPLE.find(p => p.n.includes(v)); if (p) return openPerson(p.id); const q = PLACES.find(q => (q.n + q.desc).includes(v)); if (q) openPlace(q.id); else toast('没找到「' + v + '」，可以去「行程与天气」加这个地方'); });

/* ================= 每一帧 ================= */
const v3 = new THREE.Vector3(); let last = performance.now(), skyT = 0;
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function place2(el, x, y, z, dy = 0) { v3.set(x, y, z).project(cam); if (v3.z > 1 || v3.x < -1.2 || v3.x > 1.2 || v3.y < -1.2 || v3.y > 1.2) { el.style.opacity = 0; el.style.pointerEvents = 'none'; return false; } el.style.transform = `translate(${(v3.x + 1) / 2 * innerWidth}px,${(1 - v3.y) / 2 * innerHeight + dy}px) translate(-50%,-100%)`; return true; }
function frame(now) {
  if (!alive) return; raf = requestAnimationFrame(frame);
  if (document.hidden) return;
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (fly) { const t = Math.min(1, (now - fly.t0) / fly.dur), e = t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; tgt.lerpVectors(fly.ft, fly.tt, e); sph.radius = fly.fr + (fly.tr - fly.fr) * e; sph.phi = fly.fp + (fly.tp - fly.fp) * e; if (t >= 1) fly = null; }
  if (IN) { inFrame(dt, now); applyCam(); renderer.render(IN.scene, cam); IN.people.forEach(p => { const o = p.obj.position; if (place2(p.tag, o.x, o.y + 2.55, o.z)) { p.tag.style.opacity = 1; p.tag.style.pointerEvents = 'auto'; } p.bub.style.opacity = place2(p.bub, o.x, o.y + 2.95, o.z, -30) ? '' : 0; }); return; }
  if (S.trip) tripFrame(dt, now);
  PEOPLE.forEach(p => { const mv = p.moving;
    if (mv && mv.kind === 'road' && !(S.trip && p === ME)) { mv.d = Math.min(mv.len, mv.d + mv.speed * dt); const r = roadAt(mv, mv.d); p.obj.position.set(r.x, baseY([r.x, r.z]), r.z); const yaw = Math.atan2(r.dx, r.dz); p.obj.rotation.y += ((yaw - p.obj.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 10);
      if (mv.d >= mv.len && !(S.trip && S.trip.w === p.id)) { p.at = mv.to; p.moving = null; relayout(p.at); } }
    const T = S.trip, riding = T && (p === ME || (T.together && T.w === p.id)) && T.way.look !== 'walk' && !(T.way.look === 'piggy' && p.id === T.w);
    const walking = !reduce && ((mv && mv.kind === 'road' && !riding) || (T && T.together && T.w === p.id && (T.way.look === 'walk' || T.way.look === 'piggy')));
    if (p.av) { try { p.av.setState(walking ? (T && T.way.sp > 12 && !riding ? 'run' : 'walk') : riding && R && R.sit ? 'sit' : 'idle'); p.av.update(dt); } catch (e) {} }
    else { const u = p.body.userData; if (walking) u.ph += dt * 12; const s = walking ? Math.sin(u.ph) : 0; u.lg[0].rotation.x = s * .7; u.lg[1].rotation.x = -s * .7; u.ar[0].rotation.x = -s * .8; u.ar[1].rotation.x = s * .8; u.body.position.y = 1.55 + (walking ? Math.abs(s) * .18 : 0); u.head.position.y = u.h0 + (walking ? Math.abs(s) * .22 : Math.sin(now / 520 + u.ph) * .05); }
  });
  clouds.forEach(c => { c.position.x += c.userData.v * dt * 2; if (c.position.x > BX1 + 140) c.position.x = BX0 - 140; });
  if (pts.visible && FXNOW) { const a = ptG.attributes.position.array, sp = FXNOW[2], dr = FXNOW[3], n = ptG.drawRange.count === Infinity ? PN : ptG.drawRange.count; for (let i = 0; i < n; i++) { const o = i * 3; a[o + 1] -= dt * sp; a[o] += Math.sin(now / 900 + ptPh[i]) * dr * dt; if (a[o + 1] < 0) a[o + 1] += 80; else if (a[o + 1] > 80) a[o + 1] -= 80; } ptG.attributes.position.needsUpdate = true; pts.position.set(tgt.x, 0, tgt.z); ptMat.size = FXNOW[1] * Math.max(1, sph.radius / 55); }
  if (rain.visible) { const a = rainG.attributes.position.array, sp = 70; for (let i = 0; i < RN; i++) { const o = i * 6; a[o + 1] -= dt * sp; a[o + 4] -= dt * sp; if (a[o + 4] < 0) { a[o + 1] += 80; a[o + 4] += 80; } } rainG.attributes.position.needsUpdate = true; rain.position.set(tgt.x, 0, tgt.z); }
  if (now - skyT > 30000 && S.min == null) { skyT = now; sky(); }
  applyCam(); { const dd = cam.position.distanceTo(tgt); scene.fog.near = dd * S.fog[0]; scene.fog.far = dd * S.fog[1]; } renderer.render(scene, cam);
  const dist = sph.radius;
  PLACES.forEach(p => { if (place2(p.tag, p.at[0], p.y, p.at[1], -4)) { const show = (!S.mode3d || dist < Math.max(W0, H0) * 1.6 || p.id === S.sel) && !(dist < 45 && p.id !== S.sel && S.trip); p.tag.style.opacity = show ? 1 : 0; p.tag.style.pointerEvents = show ? 'auto' : 'none'; } });
  PEOPLE.forEach(p => { const o = p.obj.position, y = p.obj.visible ? 2.55 : 2.4; if (place2(p.tag, o.x, o.y + y, o.z)) { const ok = dist < Math.max(W0, H0) * 1.4; p.tag.style.opacity = ok ? 1 : 0; p.tag.style.pointerEvents = ok ? 'auto' : 'none'; } p.bub.style.opacity = place2(p.bub, o.x, o.y + y + .4, o.z, -30) ? '' : 0; });
}
sky(); home();
sph.radius = LIM.max * .8; flyTo(CX, CZ, Math.max(W0, H0) * (mobile ? 1.25 : .95));
if (opt.focus && PP(opt.focus)) setTimeout(() => openPerson(opt.focus), 400);
else if (opt.invite && D.invite && P[D.invite.spot]) setTimeout(() => { S.with = D.invite.cid; S.way = D.invite.way; openPlace(D.invite.spot); }, 400);
raf = requestAnimationFrame(frame);
setTimeout(() => toast(DD.demo ? '这是示例小城：拖动看看，点地方或者点 TA' : '拖动看看，点地方或者点 TA'), 700);
};

const CSS = `
.gm3{--bg:#bfe6fb;--card:#fff;--ink:#3b3330;--sub:#8a7f78;--line:#efe7df;--fill:#f7f2ec;--accent:#ff8a3d;--accent-dk:#e06a1c;--accent-ink:#fff;--sky:#2fa6e8;--sky-dk:#1d84c0;--mint:#e4f7ef;--pink:#ffe7ee;--shadow:0 8px 24px rgba(60,40,20,.16);position:fixed;inset:0;background:var(--bg);color:var(--ink);font:15px/1.5 "PingFang SC",-apple-system,"Microsoft YaHei",sans-serif;overflow:hidden;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;z-index:9600}
.gm3.low{--accent:#23806c;--accent-dk:#17604f;--sky:#23806c;--sky-dk:#17604f;--pink:#e6f1ed}
@media (prefers-color-scheme:dark){.gm3{--card:#2a2a33;--ink:#f4eee8;--sub:#b0a69e;--line:#3a3944;--fill:#33333d;--mint:#24403a;--pink:#4a2f38;--accent-ink:#2a1606;--shadow:0 8px 24px rgba(0,0,0,.45)}.gm3.low{--pink:#1f322c;--accent-ink:#fff}}
.gm3 *{box-sizing:border-box}.gm3 [hidden]{display:none!important}
.gm3 .cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.gm3 .tags{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.gm3 .lb{position:absolute;left:0;top:0;white-space:nowrap;font-size:12.5px;font-weight:700;padding:3px 10px 3px 5px;border-radius:999px;background:var(--card);color:var(--ink);box-shadow:0 3px 0 rgba(0,0,0,.12),0 4px 10px rgba(0,0,0,.12);display:flex;gap:4px;align-items:center;pointer-events:auto;cursor:pointer;transition:opacity .2s}
.gm3 .lb i{font-style:normal;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:var(--fill);font-size:12px}
.gm3 .lb.sel{background:var(--accent);color:var(--accent-ink)}.gm3 .lb.who{font-size:12px;padding:2px 9px;border:2px solid var(--c);font-weight:900}
.gm3 .bub{position:absolute;left:0;top:0;max-width:210px;white-space:normal;font-size:13.5px;font-weight:500;padding:8px 12px;border-radius:18px;background:var(--card);color:var(--ink);box-shadow:var(--shadow);opacity:0;transition:opacity .3s;pointer-events:none}
.gm3 .bub::after{content:"";position:absolute;left:50%;bottom:-7px;margin-left:-7px;border:7px solid transparent;border-bottom:0;border-top-color:var(--card)}.gm3 .bub.on{opacity:1}
.gm3 .top{position:absolute;top:calc(10px + env(safe-area-inset-top,0px));left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));display:flex;gap:8px;align-items:flex-start;pointer-events:none}
.gm3 .search{pointer-events:auto;flex:1;min-width:0;max-width:420px;display:flex;align-items:center;gap:8px;height:46px;padding:0 16px;border-radius:23px;background:var(--card);box-shadow:0 4px 0 rgba(0,0,0,.08),var(--shadow);color:var(--sub)}
.gm3 .search input{flex:1;min-width:0;border:0;background:transparent;font-weight:500;font-size:15px;font-family:inherit;color:var(--ink);outline:none;-webkit-user-select:text;user-select:text}
.gm3 .pill{pointer-events:auto;height:46px;display:flex;align-items:center;gap:6px;padding:0 14px;border-radius:23px;background:var(--card);box-shadow:0 4px 0 rgba(0,0,0,.08),var(--shadow);font-weight:700;font-size:14px;font-family:inherit;white-space:nowrap;cursor:pointer;border:0;color:var(--ink)}
.gm3 .pill.bk{width:46px;justify-content:center;padding:0;font-size:26px;line-height:1}.gm3 .pill b{font-variant-numeric:tabular-nums}
.gm3 .side{position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:calc(68px + env(safe-area-inset-top,0px));display:grid;gap:8px}
.gm3 .rb{width:46px;height:46px;border-radius:50%;border:0;background:var(--card);color:var(--ink);font-weight:900;font-size:13px;font-family:inherit;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.12),var(--shadow)}
.gm3 .rb.on{background:var(--sky);color:#fff}.gm3 .rb:active,.gm3 .go:active,.gm3 .way:active,.gm3 .chip:active{transform:translateY(3px);box-shadow:none}
.gm3 button:focus-visible{outline:3px solid var(--sky);outline-offset:2px}
.gm3 .pop{position:absolute;right:max(68px,calc(56px + env(safe-area-inset-right,0px)));top:calc(68px + env(safe-area-inset-top,0px));width:min(300px,calc(100vw - 96px));max-height:calc(100% - 160px);overflow-y:auto;padding:14px;border-radius:22px;background:var(--card);box-shadow:var(--shadow);display:grid;gap:10px;z-index:3}
.gm3 h4{margin:0;font-size:13px;color:var(--sub);font-weight:700}.gm3 h4 .k{font-weight:400}
.gm3 .seg{display:flex;gap:5px;flex-wrap:wrap}.gm3 .seg button{flex:1;min-width:40px;border:0;background:var(--fill);color:var(--ink);font-weight:700;font-size:13px;font-family:inherit;padding:7px 4px;border-radius:12px;cursor:pointer}.gm3 .seg button.on{background:var(--sky);color:#fff;box-shadow:0 3px 0 var(--sky-dk)}
.gm3 input[type=range]{width:100%;accent-color:var(--accent)}
.gm3 select,.gm3 .form input{width:100%;font:inherit;padding:8px 10px;border-radius:12px;border:2px solid var(--line);background:var(--fill);color:var(--ink);-webkit-user-select:text;user-select:text}
.gm3 .row{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:14px;font-weight:500}
.gm3 .sw{width:48px;height:28px;border-radius:14px;background:var(--line);border:0;position:relative;cursor:pointer;flex:none}.gm3 .sw::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 3px rgba(0,0,0,.25);transition:left .2s}.gm3 .sw.on{background:#5fcf6b}.gm3 .sw.on::after{left:23px}
.gm3 .trip{position:absolute;top:calc(68px + env(safe-area-inset-top,0px));left:max(12px,env(safe-area-inset-left,0px));right:calc(68px + env(safe-area-inset-right,0px));max-width:440px;padding:10px 16px;border-radius:22px;background:var(--accent);color:var(--accent-ink);box-shadow:0 4px 0 var(--accent-dk),var(--shadow);display:grid;gap:6px}
.gm3 .trip .t1{display:flex;justify-content:space-between;gap:8px;font-size:14.5px;font-weight:900}.gm3 .trip .t1 span{font-variant-numeric:tabular-nums;white-space:nowrap}
.gm3 .trip .bar{height:8px;border-radius:4px;background:rgba(255,255,255,.35);overflow:hidden}.gm3 .trip .bar i{display:block;height:100%;width:0;background:#fff;border-radius:4px}
.gm3 .sheet{position:absolute;left:0;right:0;bottom:0;max-height:46%;display:flex;flex-direction:column;background:var(--card);border-radius:26px 26px 0 0;box-shadow:0 -6px 30px rgba(0,0,0,.14);padding-bottom:env(safe-area-inset-bottom,0px);transition:max-height .3s}
.gm3 .sheet.min{max-height:calc(80px + env(safe-area-inset-bottom,0px))}
.gm3 .grab{flex:none;height:24px;display:grid;place-items:center;cursor:pointer;border:0;background:transparent;width:100%}.gm3 .grab::before{content:"";width:42px;height:6px;border-radius:3px;background:var(--line)}
.gm3 .sc{overflow-y:auto;padding:0 max(16px,env(safe-area-inset-right,0px)) 18px max(16px,env(safe-area-inset-left,0px));display:grid;gap:12px;align-content:start}
@media (min-width:860px){.gm3 .sheet{left:max(14px,env(safe-area-inset-left,0px));right:auto;top:calc(68px + env(safe-area-inset-top,0px));bottom:14px;width:370px;max-height:none;border-radius:26px}.gm3 .sheet.min{max-height:none}.gm3 .grab{display:none}.gm3 .sc{padding-top:16px}.gm3 .trip{left:400px}}
.gm3 .h{font-weight:800;font-size:24px;font-family:inherit;margin:0}.gm3 .k{font-size:12.5px;color:var(--sub);margin:0}
.gm3 .sec{display:grid;gap:8px}.gm3 .sec>h5{margin:0;font-size:13px;color:var(--sub);font-weight:700;display:flex;justify-content:space-between;align-items:center}
.gm3 .list{display:grid;gap:8px;min-width:0}.gm3 .sc>*{min-width:0}.gm3 .it{min-width:0}
.gm3 .it{display:flex;align-items:center;gap:12px;padding:10px 12px;border:0;border-radius:18px;background:var(--fill);color:var(--ink);font:inherit;text-align:left;width:100%}.gm3 button.it{cursor:pointer}
.gm3 .it.inv{background:var(--pink);box-shadow:0 0 0 2px var(--accent)}
.gm3 .it .ic{width:38px;height:38px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:18px;background:var(--card)}
.gm3 .it .tx{flex:1;min-width:0}.gm3 .it .tx b{display:block;font-weight:700;font-size:14.5px}.gm3 .it .tx span{display:block;font-size:12.5px;color:var(--sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gm3 .it .r{font-size:12.5px;color:var(--sub);white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:500}
.gm3 .av{width:38px;height:38px;flex:none;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:14px;font-family:inherit;color:#fff}
.gm3 .chips{display:flex;flex-wrap:wrap;gap:6px}.gm3 .chip{border:0;background:var(--fill);color:var(--ink);font-weight:700;font-size:13.5px;font-family:inherit;border-radius:999px;padding:7px 14px;cursor:pointer;box-shadow:0 3px 0 var(--line)}.gm3 .chip.on{background:var(--sky);color:#fff;box-shadow:0 3px 0 var(--sky-dk)}
.gm3 .ways{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}
.gm3 .way{border:0;background:var(--fill);border-radius:18px;padding:9px 6px 8px;text-align:center;cursor:pointer;font:inherit;color:var(--ink);display:grid;justify-items:center;box-shadow:0 3px 0 var(--line)}
.gm3 .way em{font-style:normal;font-size:24px;line-height:1.2}.gm3 .way b{font-size:13px;font-weight:700}.gm3 .way span{font-size:11.5px;color:var(--sub);font-variant-numeric:tabular-nums}
.gm3 .way.on{background:var(--pink);box-shadow:0 0 0 2.5px var(--accent),0 3px 0 var(--accent-dk)}.gm3 .way[disabled]{opacity:.4;cursor:not-allowed}
.gm3 .wayinfo{background:var(--pink);border-radius:18px;padding:10px 12px;display:grid;gap:2px;font-size:13.5px}.gm3 .wayinfo b{font-size:15px}
.gm3 .go{border:0;background:var(--accent);color:var(--accent-ink);font-weight:900;font-size:17px;font-family:inherit;border-radius:22px;min-height:52px;cursor:pointer;width:100%;box-shadow:0 5px 0 var(--accent-dk)}.gm3 .go[disabled]{opacity:.5}
.gm3 .go.ghost{background:var(--fill);color:var(--ink);box-shadow:0 5px 0 var(--line)}.gm3 .go.sm{min-height:40px;font-size:14px;border-radius:16px;box-shadow:0 3px 0 var(--line)}
.gm3 .lnk{border:0;background:none;color:var(--accent);font-weight:700;font-size:13px;font-family:inherit;cursor:pointer;padding:4px}
.gm3 .btns{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px}
.gm3 .desc{background:var(--fill);border-radius:18px;padding:12px;font-size:14px;display:grid;gap:4px}.gm3 .desc p{margin:0}.gm3 .desc .tg{display:flex;gap:6px;flex-wrap:wrap}
.gm3 .tag{font-size:11.5px;font-weight:700;padding:1px 8px;border-radius:999px;background:var(--card);color:var(--sub);font-style:normal}
.gm3 .say{background:var(--mint);border-radius:18px;padding:10px 12px;font-size:14px;display:flex;gap:10px;align-items:flex-start}.gm3 .say .av{width:30px;height:30px;font-size:12px}
.gm3 .note{font-size:12.5px;color:var(--sub);background:var(--fill);border-radius:18px;padding:12px;display:grid;gap:8px}.gm3 .note b{color:var(--ink);font-size:14px}
.gm3 .x{border:0;background:var(--fill);color:var(--sub);width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:15px;flex:none}
.gm3 .hd{display:flex;align-items:center;gap:10px}.gm3 .hd>div{flex:1;min-width:0}
.gm3 .big{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;font-size:24px;background:var(--fill);flex:none}
.gm3 .toast{position:absolute;left:50%;top:calc(150px + env(safe-area-inset-top,0px));transform:translateX(-50%);max-width:calc(100vw - 32px);background:var(--ink);color:var(--card);font-size:14px;font-weight:700;padding:10px 18px;border-radius:999px;box-shadow:var(--shadow);pointer-events:none;transition:opacity .3s;text-align:center;z-index:4}
.gm3ed{z-index:9610;background:rgba(0,0,0,.35);display:grid;place-items:end center}
.gm3ed .edbox{width:min(520px,100%);max-height:88%;overflow-y:auto;background:var(--card);border-radius:26px 26px 0 0;padding:18px max(16px,env(safe-area-inset-right,0px)) calc(18px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));display:grid;gap:12px}
@media (min-width:860px){.gm3ed{place-items:center}.gm3ed .edbox{border-radius:26px}}
.gm3 .talk{display:flex;gap:8px}.gm3 .talk input{flex:1;min-width:0;font:inherit;padding:8px 12px;border-radius:16px;border:2px solid var(--line);background:var(--fill);color:var(--ink);-webkit-user-select:text;user-select:text}.gm3 .talk .go{width:auto;padding:0 18px}.gm3 .inlog{display:grid;gap:4px;font-size:12.5px;color:var(--sub)}.gm3.inside .side,.gm3.inside .trip{display:none!important}
.gm3 .form{display:grid;gap:10px}.gm3 .form input[type=color]{height:42px;padding:3px}.gm3 .form input[type=range]{padding:0;border:0;background:none}.gm3 .form label{display:grid;gap:4px;font-size:13px;font-weight:700;color:var(--sub)}.gm3 .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (prefers-reduced-motion:reduce){.gm3 *{transition:none!important}}
`;
})();
