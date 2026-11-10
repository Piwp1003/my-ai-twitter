// 292：App / 电脑版里直接更新 + 更新公告弹窗（guyu.pw/update/latest.json 用假的）
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path'; import fs from 'fs'; import { execSync } from 'child_process';
const root = process.cwd();
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const LATEST = { ver: 999, at: Date.now(), notes: [{ v: 999, d: '2099-01-01', t: '测试的新版本', items: ['新东西一', '新东西二'] }], wgt: 'update/guyu.wgt', wgtSize: 5e6, files: {} };
async function open(init) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); } catch (e) {} });
  if (init) await ctx.addInitScript(init);
  await ctx.route(/^https?:\/\//, r => r.request().url().startsWith('https://guyu.pw/update/latest.json') ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LATEST) }) : r.abort());
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(fileUrl(path.join(root, 'index.html')));
  await page.waitForFunction(() => window.__guyuBooted && window.gyCheckUpdate, { timeout: 25000 });
  return { ctx, page, errs };
}
const txt = p => p.evaluate(() => { const b = document.getElementById('gyUpd'); return b ? b.innerText : ''; });
// 1 更新公告：上次看到 291 → 打开 292 弹一次
let { ctx, page, errs } = await open(() => { localStorage.setItem('gyUpd', JSON.stringify({ seen: 291 })); localStorage.setItem('gyGate', JSON.stringify({ tok: 'x', ok: Date.now() })); });
await page.waitForFunction(() => document.getElementById('gyUpd'), { timeout: 9000 }).catch(() => {});
let t = await txt(page);
const VER = await page.evaluate(() => GY_VERSION);
check('更新后第一次打开：弹更新公告（这一版写了什么）', /更新公告/.test(t) && t.includes('v' + VER), t.slice(0, 120));
await page.evaluate(() => document.getElementById('gyUpdOk').click());
check('点「知道了」：记下看过了', await page.evaluate(() => JSON.parse(localStorage.getItem('gyUpd')).seen === GY_VERSION && !document.getElementById('gyUpd')));
await page.waitForTimeout(2500);
t = await txt(page);
check('接着查到新版本：问要不要更新（带新版公告）', /发现新版本 v999/.test(t) && /新东西一/.test(t), t.slice(0, 160));
await page.evaluate(() => document.getElementById('gyUpdLater').click());
check('「下次再说」：这一版不再自动问', await page.evaluate(() => JSON.parse(localStorage.getItem('gyUpd')).skip === 999));
await page.evaluate(() => gyShowNotes()); await page.waitForTimeout(200);
check('设置里「更新公告」随时能看', /更新公告/.test(await txt(page)));
check('今天里有「有新版本」', await page.evaluate(() => { const st = gyUpdState(); return st.latest && st.latest.ver === 999; }));
check('没有页面报错', !errs.length, errs.join(' | '));
await ctx.close();
// 2 电脑版：gyDesk.hot 走 apply → restart
({ ctx, page, errs } = await open(() => { localStorage.setItem('gyUpd', JSON.stringify({ seen: 99999 })); window.__hot = []; window.gyDesk = { isDesk: true, hot: async (op, a) => { window.__hot.push(op); if (op === 'latest') return { ver: 999, notes: [] }; if (op === 'apply') return { ok: true, n: 3, ver: 999 }; if (op === 'progress') return { done: 1, total: 2 }; return true; } }; }));
await page.evaluate(() => gyCheckUpdate()); await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('gyUpdGo').click()); await page.waitForTimeout(1500);
check('电脑版：点「现在更新」→ 下载变了的文件 → 重启', await page.evaluate(() => window.__hot.includes('apply') && window.__hot.includes('restart')), await page.evaluate(() => window.__hot.join(',')));
await ctx.close();
// 3 安卓 App：plus.downloader 下 wgt → runtime.install → restart
({ ctx, page, errs } = await open(() => { localStorage.setItem('gyUpd', JSON.stringify({ seen: 99999 })); window.__app = []; window.plus = { runtime: { install: (f, o, ok) => { window.__app.push('install:' + f + ':' + o.force); ok(); }, restart: () => window.__app.push('restart'), openURL: () => {} }, net: { XMLHttpRequest: function () { const x = this; x.open = (m, u) => { x.u = u; }; x.send = () => { x.readyState = 4; x.status = 200; x.responseText = JSON.stringify({ ver: 999, notes: [], wgt: 'update/guyu.wgt', wgtSize: 5e6 }); x.onreadystatechange(); }; } }, downloader: { createDownload: (url, o, cb) => { window.__app.push('dl:' + url); return { addEventListener() {}, start: () => cb({ filename: '_doc/update/guyu.wgt' }, 200) }; } } }; }));
await page.evaluate(() => gyCheckUpdate()); await page.waitForTimeout(300);
check('安卓 App：弹窗写着下载更新包', /下载更新包/.test(await txt(page)));
await page.evaluate(() => document.getElementById('gyUpdGo').click()); await page.waitForTimeout(1500);
check('安卓 App：下载 guyu.wgt → 强制安装 → 重启', await page.evaluate(() => window.__app.some(x => /^dl:https:\/\/guyu\.pw\/update\/guyu\.wgt/.test(x)) && window.__app.includes('install:_doc/update/guyu.wgt:true') && window.__app.includes('restart')), await page.evaluate(() => window.__app.join(',')));
await ctx.close();
// 4 make_update.py：生成 latest.json 和 wgt
try {
  execSync('python3 tools/make_update.py', { cwd: root, stdio: 'pipe' });
  const L = JSON.parse(fs.readFileSync(path.join(root, 'update/latest.json'), 'utf8'));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  check('make_update.py：版本号 = index.html、带公告和文件清单、有 wgt', L.ver === +html.match(/GY_VERSION\s*=\s*(\d+)/)[1] && L.notes.length && L.files['index.html'] && L.files['js/92c-app-update.js'] && fs.statSync(path.join(root, 'update/guyu.wgt')).size > 1e6);
} catch (e) { check('make_update.py 跑通', false, String(e.stderr || e)); }
fs.rmSync(path.join(root, 'update'), { recursive: true, force: true });
await browser.close();
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : '  ' + x.e}`));
console.log(`\n${results.filter(x => x.ok).length}/${results.length} 通过`); process.exit(results.every(x => x.ok) ? 0 : 1);
