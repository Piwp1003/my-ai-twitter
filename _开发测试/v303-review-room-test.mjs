// 303：📝 审核处——申请的人登录后直接进审核处（能发文字 / 图片 / 视频），管理员在社区里跟 TA 聊、通过以后 TA 自动进谷雨。
// 要先在本地开一个空的社区服务器（跟 v280-community-test 一样）：
//   放了 community-worker.js + wrangler.toml（D1 绑定名 DB）的文件夹里：npx wrangler dev --port 8799 --local
// 用法（项目根目录）：node _开发测试/v303-review-room-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
import os from 'os';
const root = process.cwd();
const LOCAL = process.env.GY_COMM || 'http://localhost:8799';
const W = 'https://guyu-community.3040831326.workers.dev';
try { const j = await (await fetch(LOCAL + '/info')).json(); if (!j.empty) { console.log('⚠️ 本地社区不是空的，先删掉 .wrangler 文件夹重开（这次跳过）'); process.exit(0); } } catch (e) { console.log('⚠️ 本地社区服务器没开（这次跳过）'); process.exit(0); }
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const errs = [];
async function user(gate) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('gyAdult', JSON.stringify({ ok: 1 })); } catch (e) {} });
  if (gate) await ctx.addInitScript(() => { try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); } catch (e) {} });
  await ctx.route(/^https?:\/\//, async r => {
    const u = r.request().url(); const base = [W, 'https://api.guyu.pw'].find(b => u.startsWith(b));
    if (!base) return r.abort();
    try { const q = r.request(); const resp = await r.fetch({ url: LOCAL + u.slice(base.length), method: q.method(), headers: q.headers(), postData: q.postDataBuffer() || undefined }); await r.fulfill({ response: resp }); } catch (e) { await r.abort(); }
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(fileUrl(path.join(root, 'index.html')));
  return p;
}
const s = ms => new Promise(r => setTimeout(r, ms));
// 群主先进，把加入方式改成「申请审核」，写一句审核处欢迎语，视频上限 3MB
const A = await user(false); await A.waitForFunction(() => window.__guyuBooted, { timeout: 25000 }); await s(1200);
await A.evaluate(() => gysCommOpen()); await s(1200);
await A.fill('#cmJNick', '林'); await A.evaluate(() => gysComm.join()); await s(2500);
const tokA = await A.evaluate(() => gysCommState().S.tok);
await fetch(LOCAL + '/cfg', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Gy-Token': tokA }, body: JSON.stringify({ join: 'apply', applyQ: '怎么知道谷雨的', apIntro: '欢迎！在这里说两句，管理员看到就审核。', vidMax: 3, gate: true }) });
// 申请的人：打开谷雨 → 登录页 → 交申请 → 直接进审核处
const C = await user(true);
await C.waitForSelector('#ggNick', { timeout: 25000 });
await C.fill('#ggNick', '小C'); await C.fill('#ggApply', '朋友推荐的'); await C.click('#ggGo');
await C.waitForSelector('#ggRL', { timeout: 15000 }); await s(1500);
let t = await C.evaluate(() => document.querySelector('#gyGate').innerText);
check('交完申请直接进「审核处」，看得到群主写的欢迎话', /审核处/.test(t) && /欢迎！在这里说两句/.test(t), t.slice(0, 200));
// 说话、发图、发视频（视频太大会被拦）
await C.fill('#ggRT', '你好，我是小C'); await C.click('#ggRG'); await s(1200);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gy303-'));
const png = path.join(tmp, 'a.png'); fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR42mP4z8AARIQBDMEYAPuwB/k3bEmUAAAAAElFTkSuQmCC', 'base64'));
await C.setInputFiles('#ggFi', png); await s(2500);
const big = path.join(tmp, 'big.mp4'); fs.writeFileSync(big, Buffer.alloc(4 * 1048576, 1));
await C.setInputFiles('#ggFv', big); await s(1500);
t = await C.evaluate(() => document.querySelector('#ggUp').textContent);
check('视频超过群主设的上限：直说多大、上限多少', /超过了 3 MB/.test(t), t);
const vid = path.join(tmp, 'v.mp4'); const vbuf = Buffer.alloc(2200000, 5); fs.writeFileSync(vid, vbuf);
await C.setInputFiles('#ggFv', vid); await s(6000);
let r = await C.evaluate(() => ({ n: document.querySelectorAll('#ggRL .gg-m.me').length, img: !!document.querySelector('#ggRL .gg-m img'), v: (document.querySelector('#ggRL .gg-m video') || {}).src || '', up: document.querySelector('#ggUp').textContent, cover: !!document.getElementById('gyGate') }));
check('审核处里：文字、图片、视频都发出去了（视频切块传）', r.n === 3 && r.img && /\/f\/v/.test(r.v) && !r.up, JSON.stringify(r));
const got = Buffer.from(await (await fetch(LOCAL + '/f/' + r.v.split('/f/')[1])).arrayBuffer());
check('传上去的视频拼回来一个字节不差', got.equals(vbuf), got.length + '');
check('审核通过之前谷雨用不了（登录层一直盖着）', r.cover);
// 管理员这边：poll 知道审核处有新话 → 管理 → 入群申请 → 💬 审核处
await A.evaluate(() => { gysCommOpen(); }); await s(5500);
await A.evaluate(() => window.gysCommApRooms()); await s(2500);
t = await A.evaluate(() => document.querySelector('#gys_community').innerText);
check('管理页的入群申请：看得到申请、审核处最后一句和「💬 审核处（3）」', /小C/.test(t) && /朋友推荐的/.test(t) && /审核处（3）/.test(t) && /\[视频\]/.test(t), t.slice(0, 400));
const uidC = await A.evaluate(async () => (await (await window.gyGate.fetch('/staff', { headers: { 'X-Gy-Token': gysCommState().S.tok } })).json()).applies[0].id);
await A.evaluate(id => gysComm.apRoom(id), uidC); await s(2500);
r = await A.evaluate(() => ({ t: document.querySelector('#gys_community').innerText, v: !!document.querySelector('#gys_community .cm-vid'), img: !!document.querySelector('#gys_community .cm-dm img.cm-img') }));
check('管理员进审核处：看得到 TA 的文字、图片、视频', /你好，我是小C/.test(r.t) && r.v && r.img, r.t.slice(0, 300));
await A.fill('#cmIn', '欢迎小C，马上通过'); await A.evaluate(id => gysComm.__apSend(id), uidC); await s(5000);
t = await C.evaluate(() => document.querySelector('#ggRL').innerText);
check('管理员在审核处回话，申请的人那边几秒内就看到（标着「管理员」）', /欢迎小C，马上通过/.test(t) && /管理员/.test(t), t);
await A.evaluate(() => { window.appConfirm = async () => true; });   // 「通过 小C 的申请？」那个确认框直接点「好」
await A.evaluate(id => gysComm.__apDo(id, 'approve'), uidC); await s(6000);
r = await C.evaluate(() => ({ cover: !!document.getElementById('gyGate'), st: (JSON.parse(localStorage.getItem('gyGate') || '{}').ok || 0) > 0 }));
check('管理员点「通过」：申请的人那边登录层自己收起来，谷雨能用了', !r.cover && r.st, JSON.stringify(r));
check('没有页面报错', !errs.length, errs.join(' | '));
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.e ? '' : '  ' + x.e)));
const ok = results.filter(x => x.ok).length; console.log(`\n${ok}/${results.length} 通过`); process.exit(ok === results.length ? 0 : 1);
