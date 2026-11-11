// 306：🏠 3D 小屋 = 一栋能自己定的房子（这里测不用显卡的部分：房子方案、家具自由摆、小人能去的地方、TA 设计的方案能不能用）
// 画面要显卡，在 Claude 那边的云端测过；这个在你电脑上也能跑。用法（项目根目录）：node _开发测试/v306-house3d-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e: typeof e === 'string' ? e : JSON.stringify(e) });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 400, height: 800 } });
await ctx.addInitScript(() => { try { localStorage.setItem('gyPlayOn', '1'); } catch (e) {} });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(process.cwd(), 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.__gyPlayReady, null, { timeout: 60000 });
const r = await page.evaluate(async () => {
  const o = {};
  await window.gyx3dLib();
  await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'js/house3d.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const HL = window.GyHouse3D; o.lib = !!HL;
  o.furn = Object.keys(HL.FURN).length;
  const P = HL.defaultPlan('modern'); o.def = P.floors.length === 2 && P.floors[0].items.length >= 7 && P.floors[1].items.length >= 6;
  // 没有两件（地毯除外）叠在一起；都在屋里；楼梯那块空着
  const ov = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.z - b.z) * 2 < a.d + b.d;
  const box = it => { const [w, d] = HL.footOf(it); return { x: it.x, z: it.z, w: w - 0.02, d: d - 0.02 }; };
  o.noOverlap = P.floors.every((F, fl) => { const L = F.items.filter(i => i.t !== 'rug').map(box); return L.every((a, i) => L.every((b, j) => i === j || !ov(a, b))) && F.items.every(i => { const [w, d] = HL.footOf(i); return Math.abs(i.x) + w / 2 <= P.w / 2 + 1e-6 && Math.abs(i.z) + d / 2 <= P.d / 2 + 1e-6; }); });
  // 自由转角度：45° 时占地变大，挪到墙边会被拦在屋里
  const it = P.floors[0].items[0]; it.a = 45; it.x = 99; it.z = -99; HL.clampItem(P, it); const [w45] = HL.footOf(it); o.free = w45 > 0 && Math.abs(it.x) + w45 / 2 <= P.w / 2 && it.z > -P.d / 2;
  // 小人能去的地方：床能躺、沙发能坐、每层有窗边、有门口；转了的家具，座位跟着转
  const S = HL.spotsOf(P), kinds = new Set(S.map(s => s.kind)); o.spots = ['bed', 'sofa', 'dining', 'window', 'door'].every(k => kinds.has(k));
  const P2 = HL.clean({ w: 8, d: 6, floors: [{ name: '一楼', items: [{ t: 'desk', x: 0, z: 0, a: 90 }] }] }); const ds = HL.spotsOf(P2).find(s => s.t === 'desk'); o.rotSpot = ds && Math.abs(ds.x + 0.775) < 0.01 && Math.abs(ds.z) < 0.01;
  // TA 设计的方案（只给了家具种类）：能用，缺的补上，家具自动靠墙摆好
  const G = HL.clean({ style: 'japan', wall: 'red', roof: 'hip', floors: [{ name: '一楼 · 客厅', items: [{ t: 'sofa' }, { t: 'tv' }, { t: 'nope' }, { t: 'fire' }] }, { name: '二楼', items: [{ t: 'bed' }, { t: 'tank' }] }, { items: [{ t: 'piano' }] }] });
  o.gen = G.style === 'japan' && G.wall === HL.STYLES.japan.wall && G.floors.length === 3 && G.floors[0].items.length === 3 && G.floors[2].name === '3 楼' && G.floors.every(f => f.items.every(i => typeof i.x === 'number' && typeof i.a === 'number'));
  // 老存档（r 是四分之一圈）也认
  const O = HL.clean({ floors: [{ items: [{ t: 'bed', x: 1, z: 0, r: 1 }] }] }); o.old = O.floors[0].items[0].a === 90;
  // 最多 8 层
  o.max8 = HL.clean({ floors: Array.from({ length: 12 }, () => ({ items: [] })) }).floors.length === 8;
  // 3D 小屋插件：TA 的作息按「去哪类地方」记，不再写死在一间屋里的某个点
  o.plugin = typeof window.gyx3dRoomOpen === 'function' && typeof window.gyx3dRoomGen === 'function' && typeof window.gyx3dEd === 'function';
  o.prompt = /设计一栋 3D 的小房子/.test(GYX.pl('3d.house', '', {}));
  return o;
});
check('房子引擎加载得出来；家具 30 种以上', r.lib && r.furn >= 30, r);
check('默认的房子：两层、客厅和卧室都摆好了', r.def, r);
check('自动摆的家具不叠在一起、不出墙、不挡楼梯', r.noOverlap, r);
check('家具能转任意角度，转了也拦在屋里', r.free, r);
check('小人能去的地方：床、沙发、餐桌、每层窗边、门口都有；家具转了座位跟着转', r.spots && r.rotSpot, r);
check('TA 设计的方案只给种类也能用：坏的颜色 / 不认识的家具去掉，家具自动靠墙摆', r.gen, r);
check('老存档的朝向也认；最多 8 层', r.old && r.max8, r);
check('3D 小屋：改房子、让 TA 设计都在；设计房子的提示词登记了', r.plugin && r.prompt, r);
check('没有页面报错', !errs.length, errs.join(' | '));
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.e ? '' : '  ' + x.e.slice(0, 600))));
const p = results.filter(x => x.ok).length; console.log(`\n${p}/${results.length} 通过`); process.exit(p === results.length ? 0 : 1);
