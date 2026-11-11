// 305：📲 小功能首页 = 图标桌面（左右滑翻页、第一页常用和最近用过占满、搜索、长按整理拖动、能换回大方块）
// 用法（项目根目录）：node _开发测试/v305-icon-home-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e: typeof e === 'string' ? e : JSON.stringify(e) });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => { try { localStorage.setItem('gyPlayOn', '1'); } catch (e) {} });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(process.cwd(), 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.__gyPlayReady, null, { timeout: 40000 });
await page.evaluate(() => switchMainView('miniHub')); await page.waitForTimeout(2500);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  const ih = document.getElementById('gyIh'); o.shown = !!ih && ih.getBoundingClientRect().height > 300;
  const st = gyIhState(); o.first = st.pages[0].ids.length; o.titles = st.pages.map(p => p.t);
  const soft = st.pages.find(p => /软件/.test(p.t)); o.mcpWithSoft = soft && soft.ids.includes('mcp');
  o.dots = document.querySelectorAll('#gyIhDots i').length === st.pages.length;
  o.oneEach = !st.pages.some(p => p.ids.some(id => /^hub_/.test(id)));
  // 点一个 → 进最近用过
  document.querySelector('#gyIh .gyih-i[data-id="gyxWalk"]').click(); await s(400);
  try { document.querySelectorAll('.gyx-ov,[data-gy-overlay]').forEach(e => e.remove()); gyHubClose && gyHubClose(); } catch (e) {}
  switchMainView('miniHub'); await s(400); o.recent = gyIhState().pages[0].ids[0] === 'gyxWalk';
  // 搜索
  const q = document.getElementById('gyIhQ'); q.value = '锁抖音'; q.dispatchEvent(new Event('input', { bubbles: true })); await s(100);
  o.search = [...document.querySelectorAll('#gyIh .gyih-row')].map(b => b.dataset.id);
  const q2 = document.getElementById('gyIhQ'); q2.value = ''; q2.dispatchEvent(new Event('input', { bubbles: true })); await s(100);
  // 拖动：把「一起做饭」挪到「过日子」那一页最前面
  const P = gyIhState().pages, from = P.findIndex(p => p.ids.includes('gyxCook')), to = P.findIndex(p => /过日子/.test(p.t));
  gyIhMove('gyxCook', to - 1, P[to].ids[0]); await s(50);
  const P2 = gyIhState().pages; o.moved = P2.find(p => /过日子/.test(p.t)).ids[0] === 'gyxCook' && !P2[from].ids.includes('gyxCook');
  // 长按进整理
  gyIhPaint(); await s(100);
  const b = document.querySelector('#gyIh .gyih-pg[data-pg="1"] .gyih-i'), rc = b.getBoundingClientRect();
  b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: rc.x + 10, clientY: rc.y + 10, pointerId: 1 })); await s(700);
  o.edit = gyIhState().edit && !!document.querySelector('#gyIhPager.ed');
  document.querySelector('#gyIh [data-st="gyxStudy"]').click(); await s(100);
  o.star = gyIhState().pages[0].ids[0] === 'gyxStudy';
  document.querySelector('#gyIh [data-done]').click(); await s(100); o.done = !gyIhState().edit;
  // 换回大方块、再换回来
  gyIconHomeSet(false); await s(300); o.old = !document.getElementById('gyIh') && !!document.querySelector('.gyhm-grid') && /换成图标桌面/.test(document.getElementById('miniFeatureList').innerText);
  gyIconHomeSet(true); await s(300); o.back = !!document.getElementById('gyIh');
  return o;
});
check('小功能页打开就是图标桌面', r.shown, r);
check('第一页「常用和最近用过」占满 20 个；后面一类一页（太多就分两页），下面小圆点一页一个', r.first === 20 && r.dots && r.titles.length > 8, r.titles);
check('一个功能一个图标（没有「合集」图标）；真手机 / MCP 跟软件放一页', r.oneEach && r.mcpWithSoft, r);
check('点过的排到第一页最前面', r.recent, r);
check('搜「锁抖音」能找到我的 MCP', r.search.includes('mcp'), r.search);
check('能把图标挪到别的页、别的位置（存住）', r.moved, r);
check('长按进整理：图标抖、能点 ☆ 固定到第一页、点「完成」退出', r.edit && r.star && r.done, r);
check('能换回大方块，也能再换回来', r.old && r.back, r);
check('没有页面报错', !errs.length, errs.join(' | '));
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.e ? '' : '  ' + x.e.slice(0, 600))));
const p = results.filter(x => x.ok).length; console.log(`\n${p}/${results.length} 通过`); process.exit(p === results.length ? 0 : 1);
