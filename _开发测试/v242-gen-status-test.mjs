// v238：⏳ 生成中提示（小条 / 流体云 / 停止）
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path'; import fs from 'fs';
const root = process.cwd();
const PLUG = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, async r => {
  if (/x\.test\/v1\/chat\/completions/.test(r.request().url())) { await new Promise(res => setTimeout(res, 2500)); try { await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ choices: [{ message: { content: '好呀' } }] }) }); } catch (e) {} return; }
  r.abort();
});
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ PLUG }) => { PLUG.forEach(p => executePluginOnLoad(p)); }, { PLUG });
await page.waitForTimeout(3500);
const api = { url: 'https://x.test/v1', key: 'k', model: 'm' };
const r = await page.evaluate(async api => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  o.base = GYX.FEATS.some(f => f.id === 'gyxGen') && GYX.on('gyxGen') && GY_MINI_FEATURES.some(f => f.id === 'gyxGen');
  // 1) 你点出来的：弹小条，写完收回
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  let p = sendChatRequest(api, '你好'); await s(900);
  const b = document.getElementById('gyxGenBar'); o.bar = !!b && b.classList.contains('on') && /生成|正在写|在想/.test(b.innerText) && /停止/.test(b.innerText);
  const d = await p; await s(400); o.ok = d && d.choices && d.choices[0].message.content === '好呀'; o.gone = !document.querySelector('#gyxGenBar.on');
  // 2) 点停止：马上停、不弹报错框
  window.__al = []; const A0 = window.alert; document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  p = sendChatRequest(api, '你好'); await s(800); const t0 = Date.now(); gyxGenStop(); const d2 = await p;
  o.stop = Date.now() - t0 < 600 && d2.error && /你停止了生成/.test(d2.error.message); await s(300); o.stopGone = !document.querySelector('#gyxGenBar.on');
  try { alert('⚠️ 聊天 API 报错：⏹ 你停止了生成'); o.noAlert = true; } catch (e) { o.noAlert = false; }
  // 3) 后台的（很久没点东西）：默认不弹；改成「都提示」就弹
  await s(8200); p = sendChatRequest(api, '后台'); await s(900); o.bgHidden = !document.querySelector('#gyxGenBar.on'); await p;
  gyxGenCfg('scope', 'all'); p = sendChatRequest(api, '后台'); await s(900); o.bgShown = !!document.querySelector('#gyxGenBar.on'); await p; gyxGenCfg('scope', 'mine'); document.getElementById('gyxGenOv')?.remove();
  // 4) 小手机模式：挂在流体云上，不弹小条；点岛上的停止也能停
  gyPmSet(true); await s(600); document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  p = sendChatRequest(api, '你好'); await s(900); const isl = document.getElementById('gyPmIsl');
  o.island = !!isl && isl.classList.contains('m-gen') && !document.getElementById('gyxGenBar') && !!isl.querySelector('[data-ic="stop"]');
  isl.querySelector('[data-ic="stop"]').click(); const d3 = await p; await s(300); o.islStop = d3.error && /你停止了生成/.test(d3.error.message) && !isl.classList.contains('m-gen');
  gyPmSet(false); await s(300);
  // 5) 开关关掉：什么都不弹
  GYX.set('gyxGen', false); document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); p = sendChatRequest(api, '你好'); await s(900); o.off = !document.getElementById('gyxGenBar'); await p; GYX.set('gyxGen', true);
  return o;
}, api);
// 📍 默认在顶上；按住能拖，记住位置；放回顶上
const pos = await (async () => {
  const o = {};
  const p = page.evaluate(api => { document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return sendChatRequest(api, '拖一下').then(() => 1); }, api);
  await page.waitForTimeout(900);
  let bb = await page.evaluate(() => { const r = document.getElementById('gyxGenBar').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top }; });
  o.top = bb.top < 80;
  await page.mouse.move(bb.x - 30, bb.y); await page.mouse.down(); await page.mouse.move(bb.x - 30 + 100, bb.y + 300, { steps: 8 }); await page.mouse.up();
  o.moved = await page.evaluate(() => { const r = document.getElementById('gyxGenBar').getBoundingClientRect(); const c = JSON.parse(localStorage.getItem('gyxGenCfg') || '{}'); return r.top > 250 && c.pos && c.pos.y > 0.25 && !document.getElementById('gyxGenOv'); });
  await p;
  const p2 = page.evaluate(api => { document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return sendChatRequest(api, '再来').then(() => 1); }, api);
  await page.waitForTimeout(900);
  o.kept = await page.evaluate(() => document.getElementById('gyxGenBar').getBoundingClientRect().top > 250);
  await page.evaluate(() => gyxGenHome()); await page.waitForTimeout(100);
  o.home = await page.evaluate(() => document.getElementById('gyxGenBar').getBoundingClientRect().top < 80 && !JSON.parse(localStorage.getItem('gyxGenCfg')).pos);
  await page.evaluate(() => document.getElementById('gyxGenOv')?.remove()); await p2;
  return o;
})();
Object.assign(r, pos);
const J = JSON.stringify(r);
check('⏳ 生成中提示有开关、小功能入口', r.base, J);
check('你点出来的生成：浮出小条（能停止），写完自己收回', r.bar && r.ok && r.gone, J);
check('点停止马上停下，不弹「API 报错」框', r.stop && r.stopGone && r.noAlert, J);
check('后台自己跑的默认不弹；选「都提示」就弹', r.bgHidden && r.bgShown, J);
check('小手机模式：显示在流体云上，岛上的停止也能停', r.island && r.islStop, J);
check('📍 提示条默认在顶上，按住能拖、记住位置，能放回顶上', r.top && r.moved && r.kept && r.home, J);
check('开关关掉就不弹', r.off, J);
const bad = errs.filter(e => !/Failed to fetch/.test(e)); check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
