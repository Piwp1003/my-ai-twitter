/* =====================================================================
   js/house3d.js —— 🏠 3D 小屋（306）：一栋能自己定的房子
   开机不加载：第一次打开「3D 小屋」时由 插件/新玩法/源码/137-3D小屋.js 挂上来（它管数据、提示词、TA 的日子、界面）。
   用 GY3D 里带的 three.js（js/vendor/gy3d.min.js，跟 3D 小人同一个），不联网。
   · 房子：几层（1~8）、每层名字 / 地板颜色 / 摆什么；外形（风格、墙、屋顶、窗户、宽深）；朝向
   · 家具自由摆：35 种，位置随便拖、角度随便转（存 x, z, a 度），能换颜色
   · 天气、白天黑夜：137 传进来（跟天气联动 / 行程与天气 / 真实时间走）
   · 两个小人住在里面：上下楼走楼梯（单数层楼梯在左后、双数层在右后，错开不打架）
   · window.GyHouse3D = { House, FURN, FURN_GROUPS, STYLES, ROOFS, defaultPlan, clean, place, clampItem, spotsOf, H }
   约定：每件家具「背面」是 -z（靠墙那面），正面 +z；小人 rot = 0 时脸朝 +z。
   ===================================================================== */
(function () {
if (window.GyHouse3D) return;
const THREE = window.GY3D.THREE, PI = Math.PI, H = 3, FT = 0.27;   // 一层 3 米；地板面比楼板底高 0.27

/* ---------------- 家具 ---------------- */
// key: [图标, 名字, 宽(x), 深(z), 默认颜色, 分组]
const FURN = {
    bed: ['🛏️', '床', 1.6, 2.1, '#e8edf3', '睡'], night: ['🗄️', '床头柜', 0.5, 0.45, '#cbb59a', '睡'], wardrobe: ['🚪', '衣柜', 1.3, 0.6, '#d9cbb8', '睡'], dresser: ['💄', '梳妆台', 1.1, 0.5, '#efe3dc', '睡'], mirror: ['🪞', '穿衣镜', 0.7, 0.14, '#d9cbb8', '睡'],
    sofa: ['🛋️', '沙发', 2.1, 0.95, '#7d93ad', '坐'], beanbag: ['🫘', '懒人沙发', 0.9, 0.9, '#e0a96d', '坐'], chair: ['🪑', '椅子', 0.55, 0.55, '#f2f2f2', '坐'], bench: ['🪵', '长椅', 1.6, 0.5, '#a07a55', '坐'], swing: ['🪢', '吊椅', 1.0, 1.0, '#e8d8bf', '坐'],
    desk: ['🖥️', '书桌', 1.5, 0.75, '#c8b08e', '桌'], dining: ['🍽️', '餐桌', 1.6, 1.0, '#b99470', '桌'], coffee: ['☕', '茶几', 1.1, 0.6, '#b99470', '桌'], round: ['⚪', '小圆桌', 0.8, 0.8, '#f0ebe3', '桌'], bar: ['🍸', '吧台', 1.8, 0.6, '#5a6470', '桌'],
    shelf: ['📚', '书架', 1.3, 0.45, '#9c7a5b', '收纳'], tv: ['📺', '电视', 1.6, 0.45, '#2b3440', '收纳'], game: ['🎮', '游戏机', 1.2, 0.5, '#e8ecf0', '收纳'], clock: ['🕰️', '落地钟', 0.5, 0.35, '#8a6447', '收纳'], screen: ['🧱', '屏风', 1.6, 0.15, '#e9dfcf', '收纳'],
    kitchen: ['🍳', '灶台', 2.0, 0.65, '#dfe4ea', '厨卫'], fridge: ['🧊', '冰箱', 0.75, 0.7, '#eef2f5', '厨卫'], washer: ['🫧', '洗衣机', 0.65, 0.65, '#f4f6f8', '厨卫'], bath: ['🛁', '浴缸', 1.7, 0.8, '#f6f8fa', '厨卫'], fire: ['🔥', '壁炉', 1.4, 0.5, '#b8a99a', '厨卫'],
    piano: ['🎹', '钢琴', 1.5, 0.65, '#1f2329', '玩'], tread: ['🏃', '跑步机', 0.8, 1.7, '#3a4048', '玩'], tank: ['🐠', '鱼缸', 1.0, 0.45, '#6fb3d6', '玩'], cattree: ['🐾', '猫爬架', 0.7, 0.7, '#d8c3a5', '玩'], cat: ['🐈', '猫窝', 0.7, 0.7, '#e7b58b', '玩'],
    plant: ['🪴', '绿植', 0.6, 0.6, '#5d8a6a', '装饰'], flower: ['💐', '花架', 0.8, 0.4, '#e78fa0', '装饰'], lamp: ['💡', '落地灯', 0.5, 0.5, '#f4e3b5', '装饰'], rug: ['🟫', '地毯', 2.2, 1.6, '#c9a9a6', '装饰']
};
const FURN_GROUPS = ['睡', '坐', '桌', '收纳', '厨卫', '玩', '装饰'];
// 小人能去哪：[x, z, 坐/躺多高, 朝向, 做什么]（家具自己的坐标；会跟着家具一起转）
const SP = {
    bed: (w, d) => [[-0.35, d * 0.45, 0.6, 0, 'sleep'], [0.35, d * 0.45, 0.6, 0, 'sleep']],
    sofa: () => [[-0.45, 0.05, 0.3, 0, 'read'], [0.45, 0.05, 0.3, 0, 'daze']],
    beanbag: () => [[0, 0, 0.25, 0, 'daze']], chair: () => [[0, 0, 0.3, 0, 'sit']], bench: () => [[-0.4, 0, 0.3, 0, 'sit'], [0.4, 0, 0.3, 0, 'sit']], swing: () => [[0, 0, 0.45, 0, 'daze']],
    desk: (w, d) => [[0, d / 2 + 0.4, 0, PI, 'think']],
    dining: (w, d) => [[-w * 0.25, d / 2 + 0.3, 0.3, PI, 'eat'], [w * 0.25, -d / 2 - 0.3, 0.3, 0, 'eat']],
    coffee: (w, d) => [[0, d / 2 + 0.45, 0, PI, 'idle']], round: () => [[0, 0.7, 0.3, PI, 'eat'], [0, -0.7, 0.3, 0, 'eat']], bar: (w, d) => [[-0.4, d / 2 + 0.35, 0.3, PI, 'eat'], [0.4, d / 2 + 0.35, 0.3, PI, 'eat']],
    shelf: (w, d) => [[0, d / 2 + 0.45, 0, PI, 'think']], tv: () => [[0, 1.8, 0, PI, 'daze']], game: () => [[0, 1.4, 0, PI, 'phone']],
    kitchen: (w, d) => [[0, d / 2 + 0.4, 0, PI, 'think']], fridge: (w, d) => [[0, d / 2 + 0.45, 0, PI, 'think']], washer: (w, d) => [[0, d / 2 + 0.4, 0, PI, 'idle']],
    bath: () => [[0, 0, 0.25, 0, 'sit']], fire: () => [[0, 1.2, 0, PI, 'daze']], piano: (w, d) => [[0, d * 0.6, 0.36, PI, 'sit']], tread: () => [[0, 0.1, 0.15, PI, 'run']],
    tank: (w, d) => [[0, d / 2 + 0.45, 0, PI, 'daze']], cattree: (w, d) => [[0, d / 2 + 0.45, 0, PI, 'idle']], cat: (w, d) => [[0, d / 2 + 0.45, 0, PI, 'idle']],
    plant: (w, d) => [[0, d / 2 + 0.45, 0, PI, 'idle']], flower: (w, d) => [[0, d / 2 + 0.45, 0, PI, 'idle']], dresser: (w, d) => [[0, d / 2 + 0.4, 0, PI, 'idle']], mirror: (w, d) => [[0, 0.75, 0, PI, 'idle']], wardrobe: (w, d) => [[0, d / 2 + 0.45, 0, PI, 'think']],
    rug: () => [[-0.5, 0, 0, 0, 'idle'], [0.5, 0, 0, 0, 'dance']]
};
// 家具的大类（TA 的作息、「一起做」按这个找地方）
const KIND = { bed: 'bed', sofa: 'sofa', beanbag: 'sofa', swing: 'sofa', dining: 'dining', round: 'dining', bar: 'dining', desk: 'desk', shelf: 'shelf', rug: 'rug', tv: 'tv', game: 'tv', kitchen: 'kitchen', fridge: 'kitchen', piano: 'piano', bath: 'bath', fire: 'fire', tread: 'sport', cat: 'pet', cattree: 'pet', tank: 'pet', chair: 'seat', bench: 'seat', coffee: 'rug', plant: 'plant', flower: 'plant', dresser: 'dresser', mirror: 'dresser', wardrobe: 'dresser', washer: 'kitchen' };

/* ---------------- 外形 ---------------- */
const STYLES = {
    modern: { n: '现代玻璃楼', wall: '#eef0f2', roof: 'flat', roofC: '#5a6470', win: 'glass', floorC: '#cdbb9f' },
    wood: { n: '木屋', wall: '#b07a4f', roof: 'gable', roofC: '#5e3a28', win: 'small', floorC: '#d8bf9a' },
    japan: { n: '日式', wall: '#efe7d8', roof: 'hip', roofC: '#3c4650', win: 'small', floorC: '#d7c79a' },
    cottage: { n: '小洋房', wall: '#f1dcd8', roof: 'gable', roofC: '#b9605a', win: 'small', floorC: '#e3cfb3' },
    tower: { n: '塔楼', wall: '#d9dee7', roof: 'cone', roofC: '#4a6fa5', win: 'small', floorC: '#c9c2b6' },
    brick: { n: '红砖楼', wall: '#b35d47', roof: 'flat', roofC: '#4b4f55', win: 'small', floorC: '#cbb08f' }
};
const ROOFS = [['flat', '平顶'], ['gable', '人字'], ['hip', '四坡'], ['cone', '尖顶']];

/* ---------------- 摆放（纯数据，不用 3D 也能算） ---------------- */
const rad = a => (a || 0) * PI / 180;
// 转了 a 度以后占多大（外接矩形）
const footOf = it => { const f = FURN[it.t] || FURN.chair, r = rad(it.a), c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); return [f[2] * c + f[3] * s, f[2] * s + f[3] * c]; };
// 楼梯：第 fl 层往上的那段。单数层在左后，双数层在右后（错开，上一段的落脚处不会撞到下一段）
const stairOf = (P, fl) => ({ x: fl % 2 ? P.w / 2 - 0.75 : -P.w / 2 + 0.75, z: -P.d / 2 + 1.45, w: 1.1, d: 2.5 });
function clampItem(P, it) { const [fw, fd] = footOf(it); it.x = Math.max(-P.w / 2 + 0.2 + fw / 2, Math.min(P.w / 2 - 0.2 - fw / 2, +it.x || 0)); it.z = Math.max(-P.d / 2 + 0.2 + fd / 2, Math.min(P.d / 2 - 0.2 - fd / 2, +it.z || 0)); return it; }
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.z - b.z) * 2 < a.d + b.d;
let uidN = Date.now() % 100000;
const newId = () => 'f' + (uidN++).toString(36);
// 找个空地方放：先靠墙（背面贴墙、正面朝屋里），实在没地方放中间
function place(P, fl, t, c) {
    const F = P.floors[fl]; if (!F || !FURN[t]) return null;
    const it = { id: newId(), t, x: 0, z: 0, a: 0, c: c || null };
    const busy = F.items.filter(x => x.t !== 'rug').map(x => { const [w, d] = footOf(x); return { x: x.x, z: x.z, w: w + 0.2, d: d + 0.2 }; });
    if (fl < P.floors.length - 1) busy.push(stairOf(P, fl));
    if (fl > 0) { const s = stairOf(P, fl - 1); busy.push({ x: s.x, z: -P.d / 2 + 0.9, w: 2.4, d: 1.4 }); }
    if (fl === 0) busy.push({ x: 0, z: P.d / 2 - 0.6, w: 1.6, d: 1.2 });   // 门口留路
    if (t === 'rug' || t === 'dining' || t === 'round' || t === 'coffee' || t === 'swing' || t === 'tread') {
        const cands = []; for (let z = -P.d / 2 + 1; z <= P.d / 2 - 1; z += 0.25) for (let x = -P.w / 2 + 1; x <= P.w / 2 - 1; x += 0.25) cands.push({ x, z, k: Math.hypot(x, z) });
        cands.sort((a, b) => a.k - b.k);
        for (const p of cands) { it.x = p.x; it.z = p.z; clampItem(P, it); const [w, d] = footOf(it); if (t === 'rug' || !busy.some(b => overlap(b, { x: it.x, z: it.z, w, d }))) { F.items.push(it); return it; } }
    }
    // 四面墙：a = 0 背靠后墙，180 背靠前墙，90 背靠右墙，270 背靠左墙
    const walls = [[0, 'back'], [270, 'left'], [90, 'right'], [180, 'front']], best = [];
    walls.forEach(([a]) => {
        it.a = a; const [w, d] = footOf(it);
        const xs = [], zs = [];
        for (let v = -P.w / 2 + 0.2 + w / 2; v <= P.w / 2 - 0.2 - w / 2 + 1e-6; v += 0.25) xs.push(v);
        for (let v = -P.d / 2 + 0.2 + d / 2; v <= P.d / 2 - 0.2 - d / 2 + 1e-6; v += 0.25) zs.push(v);
        const pts = a === 0 ? xs.map(x => [x, -P.d / 2 + 0.2 + d / 2]) : a === 180 ? xs.map(x => [x, P.d / 2 - 0.2 - d / 2]) : a === 90 ? zs.map(z => [P.w / 2 - 0.2 - w / 2, z]) : zs.map(z => [-P.w / 2 + 0.2 + w / 2, z]);
        pts.forEach(([x, z]) => { if (!busy.some(b => overlap(b, { x, z, w, d }))) best.push({ a, x, z, k: (a === 180 ? 2 : 0) + Math.abs(x) * 0.05 + Math.abs(z) * 0.05 }); });
    });
    if (best.length) { best.sort((p, q) => p.k - q.k); const b = best[0]; Object.assign(it, { a: b.a, x: b.x, z: b.z }); F.items.push(it); return it; }
    it.a = 0; it.x = 0; it.z = 0; F.items.push(it); it.__crowd = 1; return it;
}
function defaultPlan(style) {
    const st = STYLES[style] || STYLES.modern;
    const P = { style: style || 'modern', wall: st.wall, roof: st.roof, roofC: st.roofC, win: st.win, w: 9, d: 7, rot: 0, floors: [{ name: '一楼 · 客厅', c: st.floorC, items: [] }, { name: '二楼 · 卧室', c: st.floorC, items: [] }] };
    ['sofa', 'tv', 'rug', 'dining', 'kitchen', 'fridge', 'plant', 'shelf'].forEach(t => place(P, 0, t));
    ['bed', 'wardrobe', 'desk', 'night', 'lamp', 'rug', 'plant'].forEach(t => place(P, 1, t));
    return P;
}
const hex = (v, d) => /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v) : d;
// 存档 / AI 给的方案 → 能用的房子（坏了的地方用默认的补上）
function clean(P0) {
    const P = Object.assign({}, P0 || {}), st = STYLES[P.style] || STYLES.modern;
    P.style = STYLES[P.style] ? P.style : 'modern';
    P.wall = hex(P.wall, st.wall); P.roofC = hex(P.roofC, st.roofC);
    P.roof = ROOFS.some(r => r[0] === P.roof) ? P.roof : st.roof; P.win = P.win === 'small' || P.win === 'glass' ? P.win : st.win;
    P.w = Math.max(5, Math.min(14, +P.w || 9)); P.d = Math.max(4, Math.min(11, +P.d || 7)); P.rot = ((Math.round(+P.rot || 0) % 360) + 360) % 360;
    let F = Array.isArray(P.floors) ? P.floors.slice(0, 8) : []; if (!F.length) F = [{ name: '一楼', items: [] }];
    P.floors = F.map((f, i) => ({ name: String((f && f.name) || (i + 1) + ' 楼').slice(0, 24), c: hex(f && f.c, st.floorC), items: [] }));
    F.forEach((f, i) => ((f && f.items) || []).slice(0, 40).forEach(it => {
        if (!it || !FURN[it.t]) return;
        if (it.x == null || it.z == null) { place(P, i, it.t, hex(it.c, null)); return; }
        const n = { id: String(it.id || newId()), t: it.t, x: +it.x || 0, z: +it.z || 0, a: it.a != null ? ((+it.a || 0) % 360 + 360) % 360 : (it.r ? (it.r % 4) * 90 : 0), c: hex(it.c, null) };
        P.floors[i].items.push(clampItem(P, n));
    }));
    if (Array.isArray(P0 && P0.spare)) P.spare = P0.spare.slice(0, 8);
    return P;
}
// 小人能去的地方（每件家具几个 + 每层窗边 + 门口）
function spotsOf(P) {
    const out = [];
    P.floors.forEach((F, fl) => {
        const fn = F.name.replace(/^[^·]*·\s*/, '') || (fl + 1) + ' 楼', pre = P.floors.length > 1 ? fn + '的' : '';
        F.items.forEach(it => {
            const f = FURN[it.t], g = SP[it.t]; if (!f || !g) return;
            const th = -rad(it.a), c = Math.cos(th), s = Math.sin(th);   // 家具 rotation.y = th：本地 (x, z) → (x·cos + z·sin, −x·sin + z·cos)
            g(f[2], f[3]).forEach(([ox, oz, y, rr, state], k) => out.push({ id: it.id + ':' + k, item: it.id, kind: KIND[it.t] || it.t, t: it.t, n: pre + f[1], fl, x: it.x + ox * c + oz * s, z: it.z - ox * s + oz * c, y, rot: rr + th, state }));
        });
        out.push({ id: 'win:' + fl, kind: 'window', n: pre + '窗边', fl, x: fl === 0 ? 1.6 : 0, z: P.d / 2 - 0.6, y: 0, rot: 0, state: 'daze' });
        out.push({ id: 'mid:' + fl, kind: 'floor', n: P.floors.length > 1 ? fn : '屋里', fl, x: 0.6, z: 0.6, y: 0, rot: 0, state: 'idle' });
    });
    out.push({ id: 'door', kind: 'door', n: '门口', fl: 0, x: 0, z: P.d / 2 - 0.55, y: 0, rot: PI, state: 'idle' });
    return out;
}

/* ---------------- 3D 小零件 ---------------- */
const MC = {};
const mat = (c, o) => { const k = c + JSON.stringify(o || {}); if (!MC[k]) MC[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: 0.9, metalness: 0 }, o || {})); return MC[k]; };
const box = (w, h, d, c, x, y, z, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? mat(c, o) : c); m.position.set(x || 0, y || 0, z || 0); m.castShadow = m.receiveShadow = true; return m; };
const cyl = (r1, r2, h, c, x, y, z, seg, o) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 8), mat(c, o)); m.position.set(x || 0, y || 0, z || 0); m.castShadow = m.receiveShadow = true; return m; };
const mix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const drop = g => { g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) { o.material.map.dispose(); o.material.dispose(); } }); g.clear(); };
function emojiTex(ch) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

// 家具模型：原点在占地中心、贴地；背面 -z
function furn(it, night) {
    const f = FURN[it.t], c = it.c || f[4], g = new THREE.Group(), w = f[2], d = f[3];
    const add = m => { g.add(m); return m; };
    const legs = (h, col, iw, id) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => add(box(0.06, h, 0.06, col || '#6b5a4a', a * (iw != null ? iw : w / 2 - 0.06), h / 2, b * (id != null ? id : d / 2 - 0.06))));
    const glow = col => night ? { emissive: col } : {};
    switch (it.t) {
        case 'bed': add(box(w, 0.35, d, '#8a7462', 0, 0.18, 0)); add(box(w - 0.08, 0.22, d - 0.1, '#ffffff', 0, 0.46, 0.02)); add(box(w, 0.85, 0.12, '#8a7462', 0, 0.42, -d / 2 + 0.06)); add(box(w * 0.7, 0.12, 0.38, '#ffffff', 0, 0.63, -d / 2 + 0.38)); add(box(w - 0.04, 0.07, d * 0.58, c, 0, 0.6, d * 0.18)); break;
        case 'night': add(box(w, 0.55, d, c, 0, 0.28, 0)); add(box(w - 0.1, 0.02, 0.01, mix(c, '#000', 0.3), 0, 0.36, d / 2 + 0.005)); add(cyl(0.08, 0.11, 0.2, '#f4e3b5', 0, 0.66, -0.05, 8, glow('#ffcc77'))); break;
        case 'wardrobe': add(box(w, 2.1, d, c, 0, 1.05, 0)); add(box(0.02, 1.9, 0.01, mix(c, '#000', 0.3), 0, 1.05, d / 2 + 0.005)); add(box(0.04, 0.2, 0.03, '#8a7462', -0.1, 1.1, d / 2 + 0.02)); add(box(0.04, 0.2, 0.03, '#8a7462', 0.1, 1.1, d / 2 + 0.02)); break;
        case 'dresser': add(box(w, 0.75, d, c, 0, 0.38, 0)); add(box(w * 0.6, 0.8, 0.04, '#cfe3ef', 0, 1.2, -d / 2 + 0.05, { roughness: 0.2 })); add(box(w * 0.66, 0.86, 0.03, mix(c, '#000', 0.15), 0, 1.2, -d / 2 + 0.03)); add(box(0.4, 0.05, 0.4, '#f2f2f2', 0, 0.46, d / 2 + 0.35)); break;
        case 'mirror': add(box(w, 1.7, 0.06, c, 0, 0.95, 0)); add(box(w - 0.12, 1.55, 0.02, '#cfe3ef', 0, 0.95, 0.04, { roughness: 0.15 })); add(box(0.4, 0.04, 0.3, c, 0, 0.02, -0.08)); break;
        case 'sofa': add(box(w, 0.42, d, c, 0, 0.21, 0)); add(box(w, 0.5, 0.2, mix(c, '#000', 0.1), 0, 0.55, -d / 2 + 0.1)); add(box(0.18, 0.32, d, mix(c, '#000', 0.1), -w / 2 + 0.09, 0.5, 0)); add(box(0.18, 0.32, d, mix(c, '#000', 0.1), w / 2 - 0.09, 0.5, 0)); add(box(0.4, 0.3, 0.12, '#f3ead9', -w / 4, 0.6, -d / 2 + 0.24)); break;
        case 'beanbag': { const b = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), mat(c))); b.scale.set(1, 0.6, 1); b.position.y = 0.27; b.castShadow = true; break; }
        case 'chair': add(box(w * 0.85, 0.06, d * 0.85, c, 0, 0.46, 0)); add(box(w * 0.85, 0.5, 0.05, c, 0, 0.72, -d * 0.4)); legs(0.44, '#9aa3ad', w * 0.36, d * 0.36); break;
        case 'bench': add(box(w, 0.06, d, c, 0, 0.45, 0)); legs(0.44, mix(c, '#000', 0.2), w / 2 - 0.1, d / 2 - 0.08); break;
        case 'swing': add(box(0.06, 2.4, 0.06, '#5a6470', 0, 1.2, -d / 2 + 0.05)); add(box(0.06, 0.06, d * 0.6, '#5a6470', 0, 2.38, -d * 0.2)); { const s = add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 7, 0, PI * 2, 0, PI * 0.62), mat(c, { side: THREE.DoubleSide }))); s.rotation.x = PI; s.position.y = 0.95; s.castShadow = true; } add(cyl(0.42, 0.42, 0.1, '#f6efe4', 0, 0.55, 0, 12)); add(box(0.02, 1.3, 0.02, '#5a6470', 0, 1.7, 0)); break;
        case 'desk': add(box(w, 0.06, d, c, 0, 0.75, 0)); legs(0.72); add(box(0.7, 0.42, 0.04, '#1e252e', 0, 1.05, -d / 2 + 0.12)); add(box(0.66, 0.36, 0.01, '#6f9ac8', 0, 1.05, -d / 2 + 0.145, { emissive: '#2a4a70' })); add(box(0.4, 0.02, 0.14, '#dfe3e8', 0, 0.79, 0.12)); break;
        case 'dining': add(box(w, 0.06, d, c, 0, 0.75, 0)); legs(0.72, null, w / 2 - 0.08, d / 2 - 0.08); [-1, 1].forEach(s => { add(box(0.42, 0.05, 0.42, '#f2f2f2', s * w * 0.25, 0.46, d / 2 + 0.3)); add(box(0.42, 0.05, 0.42, '#f2f2f2', s * w * 0.25, 0.46, -d / 2 - 0.3)); }); add(box(0.22, 0.12, 0.22, '#e9eef3', 0, 0.84, 0)); break;
        case 'coffee': add(box(w, 0.05, d, c, 0, 0.42, 0)); legs(0.4, mix(c, '#000', 0.3), w / 2 - 0.08, d / 2 - 0.08); add(cyl(0.07, 0.06, 0.1, '#ffffff', 0.2, 0.5, 0)); break;
        case 'round': add(cyl(w / 2, w / 2, 0.05, c, 0, 0.72, 0, 14)); add(cyl(0.05, 0.08, 0.7, '#9aa3ad', 0, 0.35, 0, 6)); add(cyl(0.18, 0.18, 0.4, '#f2f2f2', 0, 0.2, 0.7, 8)); add(cyl(0.18, 0.18, 0.4, '#f2f2f2', 0, 0.2, -0.7, 8)); break;
        case 'bar': add(box(w, 1.05, d, c, 0, 0.53, 0)); add(box(w + 0.1, 0.05, d + 0.15, '#e9e2d6', 0, 1.08, 0.05)); [-0.4, 0.4].forEach(x => { add(cyl(0.16, 0.16, 0.05, '#f2f2f2', x, 0.72, d / 2 + 0.35, 8)); add(cyl(0.03, 0.03, 0.7, '#5a6470', x, 0.35, d / 2 + 0.35, 5)); }); break;
        case 'shelf': add(box(w, 2.0, d, c, 0, 1.0, 0)); for (let i = 0; i < 4; i++) { add(box(w - 0.1, 0.03, d - 0.04, mix(c, '#fff', 0.3), 0, 0.35 + i * 0.45, 0.02)); for (let k = 0; k < 6; k++) add(box(0.08, 0.3, 0.26, ['#c85a54', '#4a6fa5', '#e3c16f', '#5d8a6a', '#ffffff'][(i + k) % 5], -w / 2 + 0.16 + k * 0.17, 0.53 + i * 0.45, d / 2 - 0.16)); } break;
        case 'tv': add(box(w, 0.45, d, '#b99c7c', 0, 0.22, 0)); add(box(w * 0.85, 0.7, 0.05, c, 0, 0.92, 0)); add(box(w * 0.8, 0.62, 0.01, '#3d5878', 0, 0.92, 0.03, glow('#203248'))); break;
        case 'game': add(box(w, 0.4, d, '#b99c7c', 0, 0.2, 0)); add(box(0.5, 0.08, 0.3, c, 0, 0.44, 0)); add(box(0.22, 0.05, 0.12, '#e05a5a', 0.38, 0.43, 0.08)); add(box(0.22, 0.05, 0.12, '#4a6fa5', -0.38, 0.43, 0.08)); break;
        case 'clock': add(box(w, 1.9, d, c, 0, 0.95, 0)); add(cyl(0.18, 0.18, 0.03, '#f6efe4', 0, 1.55, d / 2 + 0.01, 16)).rotation.x = PI / 2; add(box(0.05, 0.5, 0.02, '#d8b45a', 0, 0.9, d / 2 + 0.01)); break;
        case 'screen': for (let i = 0; i < 4; i++) { const p = add(box(w / 4 - 0.02, 1.7, 0.04, i % 2 ? c : mix(c, '#000', 0.08), -w / 2 + w / 8 + i * w / 4, 0.85, (i % 2) * 0.08 - 0.04)); p.rotation.y = i % 2 ? 0.25 : -0.25; } break;
        case 'kitchen': add(box(w, 0.9, d, c, 0, 0.45, 0)); add(box(w, 0.04, d, '#9aa3ad', 0, 0.92, 0)); add(box(0.5, 0.02, 0.4, '#2b3440', -w / 4, 0.95, 0)); add(box(0.4, 0.06, 0.3, '#b7c4d0', w / 4, 0.95, 0)); add(box(w, 0.7, 0.35, mix(c, '#000', 0.05), 0, 1.9, -d / 2 + 0.17)); break;
        case 'fridge': add(box(w, 1.85, d, c, 0, 0.93, 0)); add(box(w - 0.02, 0.02, 0.01, mix(c, '#000', 0.25), 0, 1.2, d / 2 + 0.005)); add(box(0.04, 0.35, 0.04, '#9aa3ad', w / 2 - 0.1, 1.45, d / 2 + 0.03)); add(box(0.04, 0.45, 0.04, '#9aa3ad', w / 2 - 0.1, 0.8, d / 2 + 0.03)); break;
        case 'washer': add(box(w, 0.85, d, c, 0, 0.43, 0)); add(cyl(0.2, 0.2, 0.03, '#9fc4dc', 0, 0.42, d / 2 + 0.01, 14, { roughness: 0.2 })).rotation.x = PI / 2; add(box(w - 0.1, 0.08, 0.02, '#cfd6dc', 0, 0.76, d / 2 + 0.01)); break;
        case 'bath': add(box(w, 0.55, d, c, 0, 0.28, 0)); add(box(w - 0.16, 0.06, d - 0.16, '#a9d0e8', 0, 0.5, 0)); break;
        case 'fire': add(box(w, 1.1, d, c, 0, 0.55, 0)); add(box(w * 0.55, 0.55, 0.06, '#2b2420', 0, 0.38, d / 2 - 0.02)); add(box(w * 0.4, 0.22, 0.05, '#ff9a3c', 0, 0.25, d / 2 - 0.01, { emissive: '#ff6a1a' })); add(box(w + 0.15, 0.08, d + 0.1, mix(c, '#fff', 0.2), 0, 1.14, 0)); break;
        case 'piano': add(box(w, 1.15, d * 0.6, c, 0, 0.6, -d * 0.2)); add(box(w, 0.08, d * 0.45, c, 0, 0.72, d * 0.25)); add(box(w - 0.1, 0.03, 0.16, '#ffffff', 0, 0.78, d * 0.18)); add(box(0.6, 0.06, 0.32, '#3b3f45', 0, 0.48, d * 0.6)); break;
        case 'tread': add(box(w, 0.15, d, c, 0, 0.08, 0)); add(box(w - 0.15, 0.02, d - 0.3, '#22262b', 0, 0.17, 0.05)); add(box(0.05, 1.1, 0.05, c, -w / 2 + 0.05, 0.6, -d / 2 + 0.1)); add(box(0.05, 1.1, 0.05, c, w / 2 - 0.05, 0.6, -d / 2 + 0.1)); add(box(w, 0.2, 0.25, c, 0, 1.15, -d / 2 + 0.1)); break;
        case 'tank': add(box(w, 0.75, d, '#8a7462', 0, 0.38, 0)); add(box(w, 0.6, d, c, 0, 1.05, 0, { transparent: true, opacity: 0.55, roughness: 0.15, emissive: night ? '#1f5c80' : '#000000' })); add(box(0.12, 0.07, 0.03, '#ff8a3c', -0.15, 1.05, 0.05)); add(box(0.1, 0.06, 0.03, '#ffd04a', 0.2, 1.15, -0.05)); break;
        case 'cattree': add(box(w, 0.08, d, c, 0, 0.04, 0)); add(cyl(0.08, 0.08, 1.6, '#c9b089', 0, 0.85, 0, 7)); add(box(0.5, 0.06, 0.5, c, 0.1, 0.8, 0.05)); add(box(0.45, 0.06, 0.45, c, -0.05, 1.6, -0.05)); break;
        case 'cat': { add(cyl(0.33, 0.33, 0.16, c, 0, 0.08, 0, 10)); const b = add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), mat('#f1ece4'))); b.position.set(0, 0.24, 0); b.scale.set(1.3, 0.75, 1); const h = add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), mat('#f1ece4'))); h.position.set(0.17, 0.3, 0.05); break; }
        case 'plant': { add(cyl(0.2, 0.15, 0.36, '#d8cbb8', 0, 0.18, 0, 7)); const l = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), mat(c))); l.position.y = 0.72; l.castShadow = true; const l2 = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), mat(mix(c, '#fff', 0.15)))); l2.position.set(0.12, 1.02, 0.05); break; }
        case 'flower': add(box(w, 0.05, d, '#a07a55', 0, 0.5, 0)); legs(0.48, '#a07a55', w / 2 - 0.05, d / 2 - 0.05); [-0.25, 0, 0.25].forEach((x, i) => { add(cyl(0.09, 0.07, 0.14, '#d8cbb8', x, 0.6, 0, 6)); const b = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), mat(i === 1 ? '#f4d35e' : c))); b.position.set(x, 0.76, 0); }); break;
        case 'lamp': add(box(0.3, 0.04, 0.3, '#5a6470', 0, 0.02, 0)); add(box(0.04, 1.45, 0.04, '#5a6470', 0, 0.74, 0)); add(cyl(0.16, 0.26, 0.3, c, 0, 1.55, 0, 8, glow('#ffcc77'))); break;
        case 'rug': add(box(w, 0.025, d, c, 0, 0.013, 0)); add(box(w - 0.3, 0.03, d - 0.3, mix(c, '#fff', 0.35), 0, 0.016, 0)); break;
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.iid = it.id; } });
    g.rotation.y = -rad(it.a);
    return g;
}

/* ---------------- 房子 ---------------- */
class House {
    constructor(canvas, overlay, plan, opt = {}) {
        this.canvas = canvas; this.ov = overlay; this.opt = opt;
        this.r = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); this.r.outputColorSpace = THREE.SRGBColorSpace;
        this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap;
        this.scene = new THREE.Scene(); this.scene.fog = new THREE.Fog(0xcccccc, 40, 120);
        this.cam = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
        this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a9aa8, 1.6); this.scene.add(this.hemi);
        this.sun = new THREE.DirectionalLight(0xffffff, 1.6); this.sun.position.set(14, 22, 10); this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024); Object.assign(this.sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 }); this.scene.add(this.sun);
        this.world = new THREE.Group(); this.fx = new THREE.Group(); this.root = new THREE.Group(); this.house = new THREE.Group(); this.actors = new THREE.Group(); this.items = new THREE.Group();
        this.root.add(this.house, this.actors, this.items); this.scene.add(this.world, this.fx, this.root);
        this.avs = {}; this.bubbles = {}; this.tap = null; this.onEdit = null; this.edit = false; this.sel = null;
        this.env = { wx: 'sun', t: 'day' }; this.view = 0; this.follow = true; this.last = performance.now(); this.alive = true;
        this.C = { th: 0.7, ph: 0.95, r: 26, ty: 1.5 };
        this.setPlan(plan || defaultPlan(), true);
        this._input();
        const loop = () => { if (!this.alive) return; this.raf = requestAnimationFrame(loop); if (document.hidden) return; this.frame(); };
        loop();
    }
    get night() { return this.env.t === 'night'; }
    base(fl) { return fl * H + FT; }
    setPlan(plan, first) {
        this.plan = plan; this.spots = spotsOf(plan);
        if (this.view !== 'all' && this.view >= plan.floors.length) this.view = plan.floors.length - 1;
        this.buildHouse(); this.buildWorld();
        Object.values(this.avs).forEach(a => { if (a.fl >= plan.floors.length) { a.fl = 0; a.av.holder.position.set(0, this.base(0), 0); } a.path = []; });
        if (first) this.camPreset('iso');
        this._vis();
    }
    setEnv(env) { this.env = Object.assign({}, this.env, env); this.buildHouse(); this.buildWorld(); Object.values(this.avs).forEach(a => a.av.setDim && a.av.setDim(this.night ? 0.62 : 1)); }
    setView(v) { this.view = v === 'all' ? 'all' : Math.max(0, Math.min(this.plan.floors.length - 1, +v || 0)); this.buildHouse(); this._vis(); }
    setSel(id) { this.sel = id; this.buildHouse(); }
    camPreset(k) { const P = { iso: [0.7, 0.95], front: [0, 1.3], top: [0.3, 0.12], side: [PI / 2, 1.2] }[k] || [0.7, 0.95]; this.C.th = P[0] + rad(this.plan.rot || 0) * 0; this.C.ph = P[1]; this.C.r = 16 + Math.max(this.plan.w, this.plan.d) * 1.3; }
    _wallMat(c, focus) { return focus ? mat(c, { transparent: true, opacity: 0.2, depthWrite: false }) : mat(c); }
    _wall(len, h, side, c, glassy, lvl) {
        const g = new THREE.Group(), t = 0.16, focus = this.view !== 'all' && this.view === lvl, night = this.night;
        const glassM = mat(night ? '#f2d9a8' : '#b9d0e2', { transparent: true, opacity: focus ? 0.12 : night ? 0.55 : 0.3, roughness: 0.15, emissive: night ? '#5a4220' : '#000000', depthWrite: false });
        if (glassy) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.05), glassM); p.userData.tap = 'window'; p.userData.fl = lvl; g.add(p);
            const n = Math.max(2, Math.round(len / 1.6)), fm = this._wallMat('#2f3a46', focus);
            for (let i = 0; i <= n; i++) g.add(box(0.08, h, 0.1, fm, -len / 2 + i * len / n, 0, 0));
            g.add(box(len, 0.1, 0.12, fm, 0, h / 2 - 0.05, 0)); g.add(box(len, 0.1, 0.12, fm, 0, -h / 2 + 0.05, 0));
        } else {
            const wm = new THREE.Mesh(new THREE.BoxGeometry(len, h, t), this._wallMat(c, focus)); wm.castShadow = !focus; wm.receiveShadow = true; g.add(wm);
            const n = Math.max(1, Math.floor(len / 2.2));
            for (let i = 0; i < n; i++) {
                const x = -len / 2 + (i + 0.5) * len / n;
                if (side === 'front' && lvl === 0 && i === Math.floor(n / 2)) continue;
                const p = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, t + 0.06), glassM); p.position.set(x, 0.15, 0); p.userData.tap = 'window'; p.userData.fl = lvl; g.add(p);
                g.add(box(1.1, 0.08, t + 0.12, this._wallMat(mix(c, '#000', 0.25), focus), x, -0.48, 0));
            }
        }
        return g;
    }
    buildHouse() {
        drop(this.house); this.floorTops = [];
        const P = this.plan, n = P.floors.length, w = P.w, d = P.d, snow = this.env.wx === 'snow', wallH = H - 0.25, glassy = P.win === 'glass';
        P.floors.forEach((F, i) => {
            const g = new THREE.Group(); g.position.y = i * H; g.visible = this.view === 'all' || i <= this.view; g.userData.fl = i; this.house.add(g);
            g.add(box(w + 0.3, 0.25, d + 0.3, i === 0 ? '#9aa4ae' : '#e6e9ec', 0, 0.125, 0));
            const top = box(w - 0.1, 0.02, d - 0.1, F.c || '#cdbb9f', 0, 0.26, 0); top.userData.floor = i; g.add(top); this.floorTops[i] = top;
            const y = 0.25 + wallH / 2;
            const fr = this._wall(w, wallH, 'front', P.wall, glassy, i); fr.position.set(0, y, d / 2 - 0.08); g.add(fr);
            const bk = this._wall(w, wallH, 'back', P.wall, glassy, i); bk.position.set(0, y, -d / 2 + 0.08); g.add(bk);
            const lf = this._wall(d, wallH, 'side', P.wall, false, i); lf.rotation.y = PI / 2; lf.position.set(-w / 2 + 0.08, y, 0); g.add(lf);
            const rt = this._wall(d, wallH, 'side', P.wall, false, i); rt.rotation.y = PI / 2; rt.position.set(w / 2 - 0.08, y, 0); g.add(rt);
            if (i === 0) { const dr = box(1.1, 2.1, 0.12, '#6b4a34', 0, 1.3, d / 2 + 0.02); dr.userData.tap = 'door'; g.add(dr); g.add(box(1.6, 0.12, 0.9, '#c7ccd2', 0, 0.06, d / 2 + 0.55)); }
            if (i < n - 1) { const r = stairOf(P, i); for (let k = 0; k < 10; k++) g.add(box(r.w, 0.3 * (k + 1), r.d / 10, '#a99a87', r.x, 0.25 + 0.15 * (k + 1), r.z + r.d / 2 - (k + 0.5) * r.d / 10)); }
            F.items.forEach(it => {
                const m = furn(it, this.night); m.position.set(it.x, FT, it.z); m.userData.iidG = it.id; g.add(m);
                if (this.sel === it.id) { const [fw, fd] = footOf(it); g.add(box(fw + 0.2, 0.02, fd + 0.2, '#4a6fa5', it.x, FT + 0.01, it.z, { transparent: true, opacity: 0.45 })); }
            });
            if (this.night) { const pl = new THREE.PointLight(0xffc98a, 5, Math.max(w, d) * 1.5, 1.2); pl.position.set(0, 2.3, 0); g.add(pl); }
        });
        if (this.view === 'all') {
            const top = n * H, rc = snow ? mix(P.roofC, '#ffffff', 0.72) : P.roofC, rg = new THREE.Group(); rg.position.y = top; this.house.add(rg);
            rg.add(box(w + 0.5, 0.3, d + 0.5, P.roof === 'flat' ? rc : '#e6e9ec', 0, 0.15, 0));
            if (P.roof === 'flat') { rg.add(box(w + 0.5, 0.35, 0.15, rc, 0, 0.45, d / 2 + 0.17)); rg.add(box(w + 0.5, 0.35, 0.15, rc, 0, 0.45, -d / 2 - 0.17)); }
            else if (P.roof === 'gable') { const sh = new THREE.Shape(); sh.moveTo(-(w + 0.9) / 2, 0); sh.lineTo((w + 0.9) / 2, 0); sh.lineTo(0, Math.min(3.2, w * 0.32)); sh.lineTo(-(w + 0.9) / 2, 0); const geo = new THREE.ExtrudeGeometry(sh, { depth: d + 0.9, bevelEnabled: false }); geo.translate(0, 0, -(d + 0.9) / 2); const m = new THREE.Mesh(geo, mat(rc)); m.position.y = 0.3; m.castShadow = true; rg.add(m); }
            else if (P.roof === 'hip') { const m = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4), mat(rc)); m.rotation.y = PI / 4; m.scale.set(w + 1.2, Math.min(2.6, w * 0.25), d + 1.2); m.position.y = 0.3 + m.scale.y / 2; m.castShadow = true; rg.add(m); }
            else { const r = Math.max(w, d) * 0.62, m = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.1, 8), mat(rc)); m.position.y = 0.3 + r * 0.55; m.castShadow = true; rg.add(m); }
        }
        this.root.rotation.y = rad(P.rot);
        this._vis();
    }
    _tree(x, z, s, snow) {
        const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
        g.add(cyl(0.16, 0.2, 0.9, '#6e5440', 0, 0.45, 0, 6));
        [[1.25, 1.5, 1.3], [1.0, 1.3, 2.2], [0.7, 1.1, 3.0]].forEach(([r, h, y]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat(snow ? '#3f6658' : '#3e6b5a')); c.position.y = y; c.castShadow = true; g.add(c); if (snow) { const t = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, h * 0.45, 7), mat('#f4f7fa')); t.position.y = y + h * 0.28; g.add(t); } });
        this.world.add(g);
    }
    buildWorld() {
        drop(this.world); drop(this.fx); this.clouds = []; this.flakes = null;
        const w = this.env.wx, snow = w === 'snow', t = this.env.t, P = this.plan;
        const sky = { day: { sun: '#bcd3e6', cloud: '#c5d0da', rain: '#9aa8b5', snow: '#c9d3dc', fog: '#d3d9de' }, dusk: { sun: '#e9b89c', cloud: '#c8aaa4', rain: '#8f8f9c', snow: '#b9b2bd', fog: '#c9bdb8' }, night: { sun: '#1a2440', cloud: '#232c42', rain: '#1c2333', snow: '#26304a', fog: '#2a3140' } }[t][w] || '#bcd3e6';
        this.scene.background = new THREE.Color(sky); this.scene.fog.color.set(sky); this.scene.fog.near = w === 'fog' ? 14 : 40; this.scene.fog.far = w === 'fog' ? 48 : 120;
        if (this.opt.onSky) try { this.opt.onSky(sky); } catch (e) {}
        const dim = t === 'night' ? 0.3 : t === 'dusk' ? 0.65 : 1, wet = (w === 'rain' || w === 'fog') ? 0.75 : w === 'cloud' ? 0.85 : 1;
        this.hemi.intensity = 1.6 * dim * wet + (t === 'night' ? 0.25 : 0); this.sun.intensity = (w === 'sun' ? 1.8 : 1.0) * dim;
        this.sun.color.set(t === 'dusk' ? '#ffc39a' : t === 'night' ? '#9fb3d9' : '#ffffff'); this.hemi.color.set(t === 'night' ? '#8ea2c8' : '#ffffff');
        const ground = cyl(70, 70, 0.4, snow ? '#eef2f6' : w === 'rain' ? '#7e9579' : '#9db38b', 0, -0.2, 0, 48); ground.castShadow = false; this.world.add(ground);
        const gw = new THREE.Group(); gw.rotation.y = rad(P.rot); this.world.add(gw);
        const path = box(1.4, 0.04, 9, snow ? '#d9dfe6' : '#c9c6bf', 0, 0.02, P.d / 2 + 5); path.castShadow = false; gw.add(path);
        const R0 = Math.max(P.w, P.d) / 2 + 3, add = o => { this.world.remove(o); gw.add(o); };
        [[-R0 - 1, -2, 1.1], [R0 + 1.5, -3, 1.3], [-R0 + 0.5, 4.5, 0.9], [R0, 5, 1.0], [-3, -R0 - 2, 1.2], [4, -R0 - 1.5, 1.0], [-R0 - 4, 7, 1.4], [R0 + 5, 1, 1.2]].forEach(([x, z, s]) => { this._tree(x, z, s, snow); add(this.world.children[this.world.children.length - 1]); });
        for (let i = -3; i <= 3; i++) { if (!i) continue; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mat(snow ? '#4c6f60' : '#4f7a62')); b.position.set(i * 1.25, 0.35, P.d / 2 + 2.3); b.scale.y = 0.75; b.castShadow = true; gw.add(b); if (snow) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), mat('#f4f7fa')); c.position.set(i * 1.25, 0.62, P.d / 2 + 2.3); c.scale.y = 0.4; gw.add(c); } }
        const lit = t !== 'day', lx = 2.2, lz = P.d / 2 + 5.5; gw.add(box(0.12, 3.2, 0.12, '#2f3a46', lx, 1.6, lz)); gw.add(box(0.5, 0.25, 0.5, lit ? '#ffe1a6' : '#e8edf2', lx, 3.3, lz, { emissive: lit ? '#ffb85c' : '#000000' }));
        if (lit) { const p = new THREE.PointLight(0xffc77a, t === 'night' ? 8 : 3, 14, 1.2); p.position.set(lx, 3.1, lz); gw.add(p); }
        if (t === 'night' && (w === 'sun' || w === 'snow')) { const n = 400, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const th = Math.random() * PI * 2, ph = Math.random() * 1.2, r = 160; pos[i * 3] = r * Math.cos(th) * Math.sin(ph); pos[i * 3 + 1] = r * Math.cos(ph) * 0.6 + 20; pos[i * 3 + 2] = r * Math.sin(th) * Math.sin(ph); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.fx.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, fog: false }))); }
        if (w !== 'sun' && w !== 'fog') for (let k = 0; k < 6; k++) { const c = new THREE.Group(); for (let j = 0; j < 4; j++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + Math.random() * 0.9, 0), mat(t === 'night' ? '#3a4560' : w === 'rain' ? '#8c97a3' : '#f3f5f8')); s.position.set(j * 1.4 - 2, Math.random() * 0.6, Math.random() * 1.2); c.add(s); } c.scale.setScalar(1.3); c.position.set(-45 + k * 16, 24 + Math.random() * 5, -38 + Math.random() * 14); c.userData.v = 0.4 + Math.random() * 0.5; this.fx.add(c); this.clouds.push(c); }
        if (w === 'rain' || w === 'snow') {
            const rain = w === 'rain', n = rain ? 1400 : 1300, per = rain ? 6 : 3, pos = new Float32Array(n * per);
            for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * 50, y = Math.random() * 30, z = (Math.random() - 0.5) * 50; pos.set(rain ? [x, y, z, x - 0.05, y - 0.7, z] : [x, y, z], i * per); }
            const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            this.flakes = rain ? new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: t === 'night' ? 0x7f93ad : 0xc3d0dd, transparent: true, opacity: 0.6 })) : new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.9 }));
            this.flakes.userData.rain = rain; this.fx.add(this.flakes);
        }
    }
    // 屋里的小物件（「我们的小屋」里放的）：摆在一楼，墙上的挂后墙
    setItems(list) {
        drop(this.items); const P = this.plan;
        (list || []).forEach(it => {
            let tex; if (it.img) { tex = new THREE.TextureLoader().load(it.img); tex.colorSpace = THREE.SRGBColorSpace; } else tex = emojiTex(it.ico || '🎁');
            let m; const x = -P.w / 2 + 0.8 + (+it.x || 0.5) * (P.w - 1.6);
            if ((+it.y || 0) < 0.45) { const s = it.img ? 0.55 : 0.45; m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshStandardMaterial({ map: tex, transparent: !it.img, alphaTest: 0.1 })); m.position.set(x, FT + 1.4 + (0.45 - (+it.y || 0)) * 2, -P.d / 2 + 0.2); }
            else { m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); m.scale.set(0.42, 0.42, 0.42); m.position.set(x, FT + 0.22, -P.d / 2 + 1 + ((+it.y || 0.7) - 0.45) / 0.55 * (P.d - 2)); }
            m.userData.item = it.id; this.items.add(m);
        });
        this._vis();
    }
    /* ---------- 小人 ---------- */
    add(key, av, fl) {
        if (this.avs[key]) this.remove(key);
        const a = { av, key, path: [], fl: fl || 0, seg: null }; this.avs[key] = a;
        av.holder.traverse(o => { if (o.isMesh) o.castShadow = true; o.userData.av = key; });
        av.holder.scale.setScalar(this.opt.size || 1.15); av.holder.position.set(0, this.base(a.fl), 0);
        this.actors.add(av.holder); if (this.night && av.setDim) av.setDim(0.62); this._vis(); return a;
    }
    remove(key) { const a = this.avs[key]; if (!a) return; this.actors.remove(a.av.holder); a.av.dispose(); delete this.avs[key]; if (this.bubbles[key]) { this.bubbles[key].remove(); delete this.bubbles[key]; } }
    floorOf(key) { const a = this.avs[key]; return a ? a.fl : 0; }
    place(key, to) { const a = this.avs[key]; if (!a) return; a.fl = to.fl || 0; a.path = []; a.seg = null; a.av.holder.position.set(to.x, this.base(a.fl) + (to.y || 0), to.z); if (to.rot != null) a.av.holder.rotation.y = to.rot; if (to.state) a.av.setState(to.state); this._vis(); }
    _clampXZ(p) { const P = this.plan; p.x = Math.max(-P.w / 2 + 0.4, Math.min(P.w / 2 - 0.4, p.x)); p.z = Math.max(-P.d / 2 + 0.4, Math.min(P.d / 2 - 0.4, p.z)); return p; }
    // 走过去：to = 地点 {x, z, fl, y, rot, state}；换层就走楼梯
    go(key, to, then) {
        const a = this.avs[key]; if (!a || !to) return;
        const P = this.plan, tf = Math.max(0, Math.min(P.floors.length - 1, to.fl == null ? a.fl : to.fl)), hd = a.av.holder, path = [];
        if (hd.position.y > this.base(a.fl) + 0.01) hd.position.y = this.base(a.fl);
        let f = a.fl;
        while (f !== tf) {
            if (tf > f) { const s = stairOf(P, f); path.push({ x: s.x, z: s.z + s.d / 2 + 0.35, fl: f, y: this.base(f) }, { x: s.x, z: s.z - s.d / 2 + 0.15, fl: f + 1, y: this.base(f + 1) }, { x: s.x + (f % 2 ? -1.1 : 1.1), z: s.z - s.d / 2 + 0.5, fl: f + 1, y: this.base(f + 1) }); f++; }
            else { const s = stairOf(P, f - 1); path.push({ x: s.x + ((f - 1) % 2 ? -1.1 : 1.1), z: s.z - s.d / 2 + 0.5, fl: f, y: this.base(f) }, { x: s.x, z: s.z - s.d / 2 + 0.15, fl: f, y: this.base(f) }, { x: s.x, z: s.z + s.d / 2 + 0.35, fl: f - 1, y: this.base(f - 1) }); f--; }
        }
        const end = this._clampXZ({ x: +to.x || 0, z: +to.z || 0 }); path.push({ x: end.x, z: end.z, fl: tf, y: this.base(tf) });
        a.path = path; a.seg = null; a.spot = to.state || to.rot != null ? to : null; a.then = then || null;
        const far = path.length > 1 || Math.hypot(end.x - hd.position.x, end.z - hd.position.z) > 3;
        a.av.setState(far ? 'run' : 'walk');
    }
    stop(key) { const a = this.avs[key]; if (!a) return; a.path = []; a.av.setState('idle'); }
    near(k1, k2) { const a = this.avs[k1], b = this.avs[k2]; if (!a || !b || a.fl !== b.fl) return 99; const p = a.av.holder.position, q = b.av.holder.position; return Math.hypot(p.x - q.x, p.z - q.z); }
    face(key, other) { const a = this.avs[key], b = this.avs[other]; if (!a || !b) return; const p = a.av.holder.position, q = b.av.holder.position; a.av.holder.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); }
    say(key, text, ms) {
        let b = this.bubbles[key]; if (!b) { b = document.createElement('div'); b.className = 'g3-bub'; this.ov.appendChild(b); this.bubbles[key] = b; }
        b.textContent = text; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), ms || Math.max(3500, String(text).length * 260));
        const a = this.avs[key]; if (a) { a.av.talk(true); clearTimeout(a._tt); a._tt = setTimeout(() => a.av.talk(false), Math.min(6000, 600 + String(text).length * 140)); }
    }
    // 看哪层：看某一层时，比它高的东西藏起来
    _vis() {
        const v = this.view;
        Object.values(this.avs || {}).forEach(a => { a.av.holder.visible = v === 'all' ? false : a.fl <= v; });
        if (this.items) this.items.visible = v !== 'all' ? true : false;
    }
    /* ---------- 摸、拖 ---------- */
    _ray(e) { const r = this.canvas.getBoundingClientRect(), m = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), ray = new THREE.Raycaster(); ray.setFromCamera(m, this.cam); return ray; }
    _onFloor(ray, fl) { const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.base(fl)), p = new THREE.Vector3(); if (!ray.ray.intersectPlane(pl, p)) return null; return this.root.worldToLocal(p); }
    _input() {
        const ptr = new Map(); let down = null, pinch = 0, drag = null;
        const cv = this.canvas;
        cv.addEventListener('pointerdown', e => {
            try { cv.setPointerCapture(e.pointerId); } catch (x) {}
            ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY, moved: 0 };
            if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; }
            if (this.edit) {   // 改房子时：按住家具就能拖
                const hit = this._ray(e).intersectObjects(this.house.children.filter(g => g.visible), true).find(h => h.object.userData.iid);
                if (hit) { const id = hit.object.userData.iid, fl = this.plan.floors.findIndex(F => F.items.some(x => x.id === id)); if (fl >= 0 && (this.view === 'all' || fl === this.view)) drag = { id, fl, it: this.plan.floors[fl].items.find(x => x.id === id) }; }
            }
        });
        cv.addEventListener('pointermove', e => {
            const p = ptr.get(e.pointerId); if (!p) return;
            if (ptr.size === 2) { ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); const [a, b] = [...ptr.values()]; const dd = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) this.C.r *= pinch / dd; pinch = dd; if (down) down.moved = 99; return; }
            const dx = e.clientX - p.x, dy = e.clientY - p.y; if (down) down.moved += Math.abs(dx) + Math.abs(dy); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (drag) {
                if (down && down.moved < 5) return;
                const q = this._onFloor(this._ray(e), drag.fl); if (!q) return;
                drag.it.x = q.x; drag.it.z = q.z; clampItem(this.plan, drag.it); drag.moving = true;
                const g = this.house.children[drag.fl]; const m = g && g.children.find(o => o.userData.iidG === drag.id); if (m) m.position.set(drag.it.x, FT, drag.it.z);
                return;
            }
            this.C.th -= dx * 0.008; this.C.ph -= dy * 0.006;
        });
        const up = e => {
            const was = ptr.size; ptr.delete(e.pointerId); if (ptr.size < 2) pinch = 0;
            if (drag) { const d0 = drag; drag = null; if (d0.moving) { this.spots = spotsOf(this.plan); this.sel = d0.id; this.buildHouse(); this.onEdit && this.onEdit({ type: 'move', id: d0.id, fl: d0.fl }); return; } }
            if (was === 1 && down && down.moved < 6) this._tap(e);
            down = null;
        };
        cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { ptr.delete(e.pointerId); drag = null; });
        cv.addEventListener('wheel', e => { e.preventDefault(); this.C.r *= e.deltaY > 0 ? 1.08 : 0.92; }, { passive: false });
    }
    _tap(e) {
        const ray = this._ray(e), vis = this.view === 'all' ? [this.root] : [this.house, this.actors, this.items];
        const hits = ray.intersectObjects(vis, true).filter(h => { let o = h.object; while (o) { if (o.visible === false) return false; o = o.parent; } return true; });
        if (this.edit) {
            const h = hits.find(x => x.object.userData.iid);
            if (h) { const id = h.object.userData.iid; this.onEdit && this.onEdit({ type: 'sel', id, fl: this.plan.floors.findIndex(F => F.items.some(x => x.id === id)) }); return; }
            const fl = this.view === 'all' ? 0 : this.view, q = this._onFloor(ray, fl);
            this.onEdit && this.onEdit({ type: 'floor', fl, x: q && q.x, z: q && q.z }); return;
        }
        for (const h of hits) {
            let o = h.object, av = null, item = null, iid = null, tap = null, fl = null;
            while (o) { av = av || o.userData.av; item = item || o.userData.item; iid = iid || o.userData.iid; tap = tap || o.userData.tap; if (fl == null && o.userData.fl != null) fl = o.userData.fl; o = o.parent; }
            if (av) return this.tap && this.tap({ type: 'avatar', key: av });
            if (item) return this.tap && this.tap({ type: 'item', id: item });
            if (iid) return this.tap && this.tap({ type: 'furn', id: iid });
            if (tap) return this.tap && this.tap({ type: 'thing', name: tap, fl: fl || 0 });
            if (h.object.userData.floor != null) { const p = this.root.worldToLocal(h.point.clone()); return this.tap && this.tap({ type: 'floor', fl: h.object.userData.floor, x: p.x, z: p.z }); }
        }
        if (this.view !== 'all') { const q = this._onFloor(ray, this.view); if (q && Math.abs(q.x) < this.plan.w / 2 && Math.abs(q.z) < this.plan.d / 2) this.tap && this.tap({ type: 'floor', fl: this.view, x: q.x, z: q.z }); }
    }
    frame() {
        const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
        const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (!w || !h) return;
        if (this.canvas.width !== Math.round(w * this.r.getPixelRatio()) || this.canvas.height !== Math.round(h * this.r.getPixelRatio())) this.r.setSize(w, h, false);
        this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
        const C = this.C, n = this.plan.floors.length, ty = this.view === 'all' ? Math.min(n * H, 12) * 0.45 : this.view * H + 1.2;
        C.ty += (ty - C.ty) * 0.15; C.ph = Math.max(0.08, Math.min(1.5, C.ph)); C.r = Math.max(7, Math.min(90, C.r));
        if (this.opt.spin && !this.edit) C.th += dt * 0.08;
        const rr = C.r * (w / h < 1 ? 1.25 : 1);
        this.cam.position.set(rr * Math.sin(C.ph) * Math.sin(C.th), C.ty + rr * Math.cos(C.ph), rr * Math.sin(C.ph) * Math.cos(C.th)); this.cam.lookAt(0, C.ty, 0);
        if (this.flakes) { const p = this.flakes.geometry.attributes.position, a = p.array; if (this.flakes.userData.rain) { for (let i = 0; i < a.length; i += 6) { a[i + 1] -= dt * 18; a[i + 4] -= dt * 18; if (a[i + 4] < 0) { const y = 28 + Math.random() * 2; a[i + 1] = y; a[i + 4] = y - 0.7; } } } else for (let i = 0; i < a.length; i += 3) { a[i + 1] -= dt * 1.6; a[i] += Math.sin(now / 900 + i) * dt * 0.3; if (a[i + 1] < 0) a[i + 1] = 28 + Math.random() * 2; } p.needsUpdate = true; }
        (this.clouds || []).forEach(c => { c.position.x += dt * c.userData.v; if (c.position.x > 50) c.position.x = -50; });
        for (const k in this.avs) {
            const a = this.avs[k], hd = a.av.holder;
            if (a.path.length) {
                const t = a.path[0];
                if (!a.seg) a.seg = { y0: hd.position.y, L0: Math.max(0.001, Math.hypot(t.x - hd.position.x, t.z - hd.position.z)) };
                const dx = t.x - hd.position.x, dz = t.z - hd.position.z, L = Math.hypot(dx, dz), sp = (a.av.state === 'run' ? 2.4 : 1.25) * dt;
                const want = Math.atan2(dx, dz); let dr = want - hd.rotation.y; while (dr > PI) dr -= 2 * PI; while (dr < -PI) dr += 2 * PI; if (L > 0.05) hd.rotation.y += dr * Math.min(1, dt * 10);
                if (L <= sp) {
                    hd.position.set(t.x, t.y, t.z); a.path.shift(); a.seg = null;
                    if (t.fl !== a.fl) { a.fl = t.fl; if (this.follow && k === 'me' && this.view !== 'all' && this.view !== a.fl) { this.setView(a.fl); try { this.opt.onView && this.opt.onView(a.fl); } catch (e) {} } else this._vis(); }
                    if (!a.path.length) { const s = a.spot; if (s) { if (s.rot != null) hd.rotation.y = s.rot; hd.position.y = this.base(a.fl) + (s.y || 0); } a.av.setState((a.then && a.then.state) || (s && s.state) || 'idle'); if (a.then && a.then.fn) try { a.then.fn(); } catch (e) {} }
                } else { hd.position.x += dx / L * sp; hd.position.z += dz / L * sp; hd.position.y = a.seg.y0 + (t.y - a.seg.y0) * (1 - Math.min(1, L / a.seg.L0)); }
            }
            a.av.update(dt);
            const b = this.bubbles[k];
            if (b) { if (!hd.visible) { b.style.display = 'none'; } else { b.style.display = ''; const p = new THREE.Vector3(0, 1.25 * (this.opt.size || 1.15), 0); p.applyMatrix4(hd.matrixWorld).project(this.cam); b.style.left = ((p.x + 1) / 2 * w) + 'px'; b.style.top = ((1 - p.y) / 2 * h) + 'px'; } }
        }
        this.r.render(this.scene, this.cam);
    }
    dispose() { this.alive = false; cancelAnimationFrame(this.raf); Object.keys(this.avs).forEach(k => this.remove(k)); drop(this.house); drop(this.world); drop(this.fx); drop(this.items); this.r.dispose(); try { this.r.forceContextLoss(); } catch (e) {} }
}
window.GyHouse3D = { House, FURN, FURN_GROUPS, STYLES, ROOFS, KIND, defaultPlan, clean, place, clampItem, footOf, spotsOf, H };
})();
