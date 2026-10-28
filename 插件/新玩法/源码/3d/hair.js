// 💇 发型：每种发型由几样东西拼出来——头顶的发帽（圆 / 刺 / 蓬松碎发 / 卷 / 寸头）、刘海、两边的鬓发、后面的头发（长短、宽窄、发尾）、
// 再加马尾 / 双马尾 / 丸子 / 麻花辫这些。正面画两层（脑后那层在身体后面，前面那层盖在脸上），背面画一整颗后脑勺。
export const HX = 128, HY = 100, HRX = 80, HRY = 74;
export const OL = '#2a2230';
export const HAIR_STYLES = {
  short: { n: '短发', cap: 'round', side: 54, back: 40 },
  bob: { n: '波波头', cap: 'round', side: 74, back: 80, bw: 1.1, curl: 1 },
  long: { n: '长直发', cap: 'round', side: 86, back: 150, bw: 1.05, tips: 5 },
  hime: { n: '公主切', cap: 'round', side: 50, sideCut: 1, back: 150, bw: 1.02, flat: 1, bangs: 'straight' },
  wavy: { n: '大波浪', cap: 'round', side: 92, back: 150, bw: 1.2, wave: 1 },
  fluffy: { n: '蓬松碎发', cap: 'fluffy', side: 66, back: 54, bw: 1.08, tips: 8 },
  messylong: { n: '碎发长发', cap: 'fluffy', side: 88, back: 140, bw: 1.08, tips: 9 },
  twin: { n: '双马尾', cap: 'round', side: 60, back: 44, tails: 'high' },
  lowtwin: { n: '低双马尾', cap: 'round', side: 60, back: 44, tails: 'low' },
  pony: { n: '高马尾', cap: 'round', side: 56, back: 40, pony: 'top' },
  sidepony: { n: '侧马尾', cap: 'round', side: 56, back: 40, pony: 'side' },
  bun: { n: '丸子头', cap: 'round', side: 50, back: 36, buns: [[0, -1]] },
  twinbun: { n: '双丸子', cap: 'round', side: 54, back: 36, buns: [[-1, -1], [1, -1]] },
  braids: { n: '双麻花辫', cap: 'round', side: 60, back: 44, braids: 1 },
  spiky: { n: '刺猬头', cap: 'spiky', side: 0, back: 34 },
  wolf: { n: '狼尾', cap: 'fluffy', side: 56, back: 112, bw: 0.78, tips: 4 },
  curly: { n: '卷毛', cap: 'curly', side: 64, back: 62, bw: 1.12, curly: 1 },
  buzz: { n: '寸头', cap: 'buzz', side: 0, back: 0, bangs: 'none' },
  slick: { n: '背头', cap: 'round', side: 30, back: 36, bangs: 'none' },
  centerpart: { n: '中分长发', cap: 'round', side: 96, back: 140, bw: 1.04, tips: 3, bangs: 'parted' },
  none: { n: '光头 / 自己画', cap: 'none', side: 0, back: 0, bangs: 'none' }
};
export const BANGS = [['straight', '齐刘海'], ['parted', '中分'], ['side', '斜刘海'], ['messy', '碎发'], ['airy', '空气刘海'], ['curtain', '八字刘海'], ['long', '长刘海'], ['none', '露额头']];

function shade(hex, k) { let c = String(hex || '#888').replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c, 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
function P(ctx, fill, stroke, lw, path) { ctx.beginPath(); path(ctx); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); } }
const rnd = seed => { let h = seed >>> 0; return () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296); };

// 后面那片头发的轮廓：从左耳上方往下到发尾，再回到右边
function backPath(c, st, len) {
  const bw = st.bw || 1, x0 = HX - (HRX + 6) * bw, x1 = HX + (HRX + 6) * bw, top = HY - 10, bot = HY + len;
  c.moveTo(HX - HRX - 2, top);
  if (st.curl) { c.bezierCurveTo(x0 - 6, HY + len * 0.5, x0, bot, x0 + 20, bot); c.quadraticCurveTo(HX, bot + 8, x1 - 20, bot); c.bezierCurveTo(x1, bot, x1 + 6, HY + len * 0.5, HX + HRX + 2, top); return; }
  c.bezierCurveTo(x0 - 4, HY + len * 0.35, x0 - 2, bot - len * 0.2, x0 + 8, bot);
  if (st.flat) { c.lineTo(x1 - 8, bot); }
  else if (st.wave) { const n = 6; for (let i = 1; i <= n; i++) { const xa = x0 + 8 + (x1 - x0 - 16) * (i - 0.5) / n, xb = x0 + 8 + (x1 - x0 - 16) * i / n; c.quadraticCurveTo(xa, bot + (i % 2 ? 14 : -6), xb, bot); } }
  else { const n = st.tips || 4; for (let i = 1; i <= n; i++) { const xm = x0 + 8 + (x1 - x0 - 16) * (i - 0.5) / n, xe = x0 + 8 + (x1 - x0 - 16) * i / n; c.lineTo(xm, bot + 10 + (i % 2) * 6); c.lineTo(xe, bot - 6); } }
  c.bezierCurveTo(x1 + 2, bot - len * 0.2, x1 + 4, HY + len * 0.35, HX + HRX + 2, top); c.closePath();
}
function curlyBlob(c, cx, cy, rx, ry, n) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; c.moveTo(cx + Math.cos(a) * rx + 14, cy + Math.sin(a) * ry); c.arc(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 14, 0, Math.PI * 2); } c.moveTo(cx + rx, cy); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); }
// 马尾一束：从 (x,y) 出发，往 dir 那边甩下去
function tail(c, x, y, dir, len, w) { c.moveTo(x, y); c.bezierCurveTo(x + dir * w * 2.2, y + 6, x + dir * w * 2.4, y + len * 0.7, x + dir * w * 0.9, y + len); c.lineTo(x + dir * w * 0.6, y + len - 10); c.lineTo(x + dir * w * 0.3, y + len + 4); c.bezierCurveTo(x + dir * w * 0.2, y + len * 0.6, x + dir * w * 0.2, y + 40, x - dir * 4, y + 18); c.closePath(); }
function tie(c, x, y, col) { P(c, col, OL, 1.8, c => c.ellipse(x, y, 7, 6, 0, 0, Math.PI * 2)); }

// 正面：脑后那层（在身体后面）
export function hairBackLayer(c, L, st) {
  const h = L.hair, dk = shade(h, -0.2), len = (st.back || 0) * (L.hairLen || 1), lenT = (L.hairLen || 1);
  if (st.cap === 'none' || st.cap === 'buzz') return;
  if (st.buns) st.buns.forEach(([bx, by]) => P(c, h, OL, 2.4, c => c.ellipse(HX + bx * 46, HY - HRY - 4 + (bx ? 18 : 0), 25, 22, 0, 0, Math.PI * 2)));
  if (st.curly) { P(c, dk, OL, 2.4, c => curlyBlob(c, HX, HY + 20, HRX * 0.95, len * 0.55 + 30, 12)); return; }
  if (len > 0) P(c, dk, OL, 2.4, c => backPath(c, st, len));
  if (st.tails) [-1, 1].forEach(k => P(c, h, OL, 2.4, c => st.tails === 'high' ? tail(c, HX + k * (HRX - 10), HY - 42, k, 150 * lenT, 18) : tail(c, HX + k * (HRX - 20), HY + 22, k, 120 * lenT, 14)));
  if (st.pony === 'top') P(c, h, OL, 2.4, c => tail(c, HX + 52, HY - HRY + 14, 1, 150 * lenT, 30));
  if (st.pony === 'side') P(c, h, OL, 2.4, c => tail(c, HX + HRX - 12, HY - 28, 1, 130 * lenT, 18));
  if (st.braids) [-1, 1].forEach(k => { const x = HX + k * (HRX - 18); for (let i = 0; i < 7 * lenT; i++) P(c, i % 2 ? h : shade(h, -0.08), OL, 2, c => c.ellipse(x + k * (i % 2 ? 3 : -3), HY + 40 + i * 16, 11, 10, 0, 0, Math.PI * 2)); tie(c, x, HY + 40 + 7 * lenT * 16, L.accColor || '#e0455a'); });
}
// 正面：盖在脸上那层（发帽 + 刘海 + 鬓发 + 呆毛）
export function hairFrontLayer(c, L, st) {
  const h = L.hair, hl = shade(h, 0.3), dk = shade(h, -0.28), bangs = (st.cap === 'buzz' || st.bangs === 'none') ? 'none' : (L.bangs || st.bangs || 'straight');
  if (st.cap === 'none') return;
  const R = rnd(String(L.hairStyle).length * 97 + 13);
  if (st.cap === 'buzz') { P(c, h, OL, 2.4, c => { c.ellipse(HX, HY + 2, HRX - 1, HRY - 2, 0, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(HX + HRX - 14, HY - 34, HX, HY - 40); c.quadraticCurveTo(HX - HRX + 14, HY - 34, HX + Math.cos(Math.PI * 1.02) * (HRX - 1), HY + 2 + Math.sin(Math.PI * 1.02) * (HRY - 2)); }); return; }
  // 发帽 + 刘海：一个整体的形状
  P(c, h, OL, 2.6, c => {
    c.moveTo(HX - HRX - 6, HY + 30);
    if (st.cap === 'spiky') { const pts = [[-86, 10], [-104, -26], [-76, -32], [-84, -66], [-50, -58], [-46, -92], [-16, -72], [0, -104], [18, -74], [46, -94], [50, -60], [84, -70], [78, -34], [106, -28], [86, 10]]; pts.forEach(([x, y]) => c.lineTo(HX + x, HY + y)); }
    else if (st.cap === 'fluffy') {   // 蓬松碎发：几大片弯弯的发束，长短不一
      const n = 9, rx = HRX + 8, ry = HRY + 10, cy = HY - 6; let prev = [HX - HRX - 6, HY + 30];
      for (let i = 0; i <= n; i++) { const a = Math.PI * (1.02 + i / n * 0.96), bx = HX + Math.cos(a) * rx, by = cy + Math.sin(a) * ry;
        if (i > 0) { const am = Math.PI * (1.02 + (i - 0.45) / n * 0.96), L2 = (st.back > 100 ? 6 : 10) + R() * (st.back > 100 ? 8 : 12), tx = HX + Math.cos(am) * (rx + L2) + (i < n / 2 ? -6 : 6), ty = cy + Math.sin(am) * (ry + L2) + 4; c.quadraticCurveTo((prev[0] + tx) / 2 + Math.cos(am) * 6, (prev[1] + ty) / 2 + Math.sin(am) * 6, tx, ty); c.quadraticCurveTo((tx + bx) / 2, (ty + by) / 2 + 4, bx, by); }
        else c.lineTo(bx, by); prev = [bx, by]; }
      c.lineTo(HX + HRX + 6, HY + 30); }
    else if (st.cap === 'curly') { const n = 11; for (let i = 0; i <= n; i++) { const a = Math.PI + i / n * Math.PI; const x = HX + Math.cos(a) * (HRX + 8), y = HY - 6 + Math.sin(a) * (HRY + 10); if (i === 0) c.lineTo(x, y); else c.quadraticCurveTo(HX + Math.cos(a - Math.PI / n / 2) * (HRX + 24), HY - 6 + Math.sin(a - Math.PI / n / 2) * (HRY + 24), x, y); } c.lineTo(HX + HRX + 6, HY + 30); }
    else { c.bezierCurveTo(HX - HRX - 12, HY - 40, HX - 40, HY - HRY - 12, HX, HY - HRY - 10); c.bezierCurveTo(HX + 40, HY - HRY - 12, HX + HRX + 12, HY - 40, HX + HRX + 6, HY + 30); }
    const y0 = HY + 6;
    if (bangs === 'none') { c.quadraticCurveTo(HX + HRX - 6, HY - 30, HX, HY - 40); c.quadraticCurveTo(HX - HRX + 6, HY - 30, HX - HRX - 6, HY + 30); }
    else if (bangs === 'parted') { c.quadraticCurveTo(HX + 64, HY - 14, HX + 4, HY - 44); c.lineTo(HX - 4, HY - 44); c.quadraticCurveTo(HX - 64, HY - 14, HX - HRX - 6, HY + 30); }
    else if (bangs === 'curtain') { c.quadraticCurveTo(HX + 60, HY + 4, HX + 30, y0 - 4); c.quadraticCurveTo(HX + 10, HY - 26, HX, HY - 36); c.quadraticCurveTo(HX - 10, HY - 26, HX - 30, y0 - 4); c.quadraticCurveTo(HX - 60, HY + 4, HX - HRX - 6, HY + 30); }
    else if (bangs === 'side') { c.lineTo(HX + 56, y0 - 4); c.lineTo(HX + 44, y0 - 20); c.quadraticCurveTo(HX + 10, y0 - 6, HX - 30, y0 + 4); c.lineTo(HX - 40, y0 - 18); c.lineTo(HX - 62, y0 + 2); c.closePath(); }
    else if (bangs === 'messy') { [[62, 4], [52, -10], [42, 12], [26, -6], [14, 14], [2, -10], [-12, 13], [-24, -6], [-40, 12], [-50, -8], [-62, 4]].forEach(([dx, dy]) => c.lineTo(HX + dx, y0 + dy)); c.closePath(); }
    else if (bangs === 'airy') { [[62, 0], [54, -14], [44, -2], [36, -16], [22, 0], [12, -18], [2, -2], [-8, -18], [-20, 0], [-32, -16], [-42, -2], [-52, -14], [-62, 0]].forEach(([dx, dy]) => c.lineTo(HX + dx, y0 + dy - 6)); c.closePath(); }
    else if (bangs === 'long') { [[64, 10], [52, 0], [40, 22], [24, 6], [10, 24], [-4, 8], [-18, 22], [-32, 4], [-44, 20], [-54, 2], [-64, 10]].forEach(([dx, dy]) => c.lineTo(HX + dx, y0 + dy)); c.closePath(); }
    else { [[64, 2], [52, -6], [40, 6], [26, -4], [13, 8], [0, -4], [-13, 8], [-26, -4], [-40, 6], [-52, -6], [-64, 2]].forEach(([dx, dy]) => c.lineTo(HX + dx, y0 + dy)); c.closePath(); }
  });
  // 鬓发
  const sl = (st.side || 0) * Math.min(1.2, L.hairLen || 1);
  if (sl > 0) [-1, 1].forEach(k => P(c, h, OL, 2.4, c => {
    const x = HX + k * (HRX - 2);
    if (st.sideCut) { c.moveTo(x + k * 6, HY - 6); c.lineTo(x + k * 6, HY + sl); c.lineTo(x - k * 16, HY + sl); c.lineTo(x - k * 18, HY + 2); c.closePath(); return; }
    c.moveTo(x + k * 6, HY - 12); c.quadraticCurveTo(x + k * 10, HY + sl * 0.6, x - k * 2, HY + sl); c.lineTo(x - k * 8, HY + sl - 10); c.lineTo(x - k * 10, HY + sl - 2);
    c.quadraticCurveTo(x - k * 14, HY + sl * 0.45, x - k * 20, HY + 4); c.closePath(); }));
  // 发丝和高光
  if (st.cap !== 'curly') P(c, null, dk, 1.5, c => { [[-30, -1], [-8, 1], [22, 1]].forEach(([x, k]) => { c.moveTo(HX + x, HY - HRY + 10); c.quadraticCurveTo(HX + x + k * 10, HY - 40, HX + x + k * 4, HY - 16); }); });
  P(c, null, hl, 3, c => { c.moveTo(HX - 46, HY - 46); c.quadraticCurveTo(HX - 20, HY - 62, HX + 10, HY - 58); c.moveTo(HX + 22, HY - 56); c.quadraticCurveTo(HX + 38, HY - 52, HX + 50, HY - 42); });
  if (L.ahoge) P(c, h, OL, 2.2, c => { c.moveTo(HX - 4, HY - HRY - 8); c.bezierCurveTo(HX - 10, HY - HRY - 34, HX + 22, HY - HRY - 40, HX + 16, HY - HRY - 22); c.bezierCurveTo(HX + 10, HY - HRY - 30, HX + 2, HY - HRY - 22, HX + 6, HY - HRY - 8); c.closePath(); });
}
// 背面：一整颗后脑勺 + 后面的头发 + 辫子
export function hairBackView(c, L, st) {
  const h = L.hair, dk = shade(h, -0.22), len = (st.back || 0) * (L.hairLen || 1);
  if (st.cap === 'none') return;
  hairBackLayer(c, Object.assign({}, L, { hair: h }), Object.assign({}, st, { curly: st.curly }));
  if (st.cap === 'buzz') { P(c, h, OL, 2.4, c => c.ellipse(HX, HY, HRX - 2, HRY - 4, 0, 0, Math.PI * 2)); return; }
  if (len > 0 && !st.curly) P(c, h, OL, 2.4, c => backPath(c, st, len));
  if (st.cap === 'spiky' || st.cap === 'fluffy') P(c, h, OL, 2.4, c => { const n = st.cap === 'spiky' ? 12 : 9; c.moveTo(HX - HRX - 6, HY); for (let i = 0; i <= n; i++) { const a = Math.PI + i / n * Math.PI; c.lineTo(HX + Math.cos(a - 0.12) * (HRX + 22), HY - 6 + Math.sin(a - 0.12) * (HRY + 20)); c.lineTo(HX + Math.cos(a) * (HRX + 6), HY - 6 + Math.sin(a) * (HRY + 6)); } c.closePath(); });
  P(c, h, OL, 2.4, c => c.ellipse(HX, HY - 2, HRX + 6, HRY + 8, 0, 0, Math.PI * 2));
  P(c, null, dk, 1.5, c => { [[-26, -1], [0, 0], [26, 1]].forEach(([x, k]) => { c.moveTo(HX + x * 0.4, HY - HRY + 6); c.quadraticCurveTo(HX + x, HY + 10, HX + x + k * 8, HY + Math.max(HRY - 10, len - 10)); }); });
}
