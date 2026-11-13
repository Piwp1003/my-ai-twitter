// 308：大更新也推过来（安卓下 APK 叫出安装界面；电脑版下 exe 自己换；老 exe 走浏览器）
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e: typeof e === 'string' ? e : JSON.stringify(e) });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await page.route(/^https?:\/\//, r => /guyu\.pw\/dl\/info/.test(r.request().url())
  ? r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ android: { v: '1.56', code: 156, at: '2026-11-12T08:00:00Z', size: 31457280 }, pc: { v: '1.0.1', at: '2026-11-12T09:00:00Z', size: 83886080 } }) })
  : r.abort());
await page.goto(fileUrl(path.join(process.cwd(), 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof window.gyBigUpdCheck === 'function', null, { timeout: 40000 });
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  // 网页版：什么都不做
  o.web = await gyBigUpdCheck(true);
  // 安卓：装的是 155
  const log = []; let cb = null, lis = null;
  window.plus = { runtime: { install: (f, opt, ok) => { log.push('install:' + f); ok(); }, openURL: u => log.push('open:' + u) }, io: { convertLocalFileSystemURL: f => '/sd/' + f },
    downloader: { createDownload: (u, opt, c) => { log.push('dl:' + u + ' ' + opt.filename); cb = c; return { addEventListener: (k, f) => { lis = f; }, start: () => log.push('start') }; } },
    android: { runtimeMainActivity: () => ({}), invoke: () => ({}), getAttribute: () => 155 } };
  o.and = await gyBigUpdCheck(true); await s(100);
  const box = document.getElementById('gyBig'); o.andBox = box ? box.innerText : '';
  box.querySelector('.ok').click(); await s(50);
  lis({ state: 3, downloadedSize: 15728640, totalSize: 31457280 }); o.andProg = document.querySelector('#gyBig .s').textContent;
  cb({ filename: '_downloads/guyu-156.apk' }, 200); await s(50);
  o.andLog = log.slice(); o.andAfter = document.querySelector('#gyBig .s').textContent;
  document.getElementById('gyBig').remove();
  // 已经最新：156
  window.plus.android.getAttribute = () => 156; o.andSame = await gyBigUpdCheck(true); o.andSameBox = !!document.getElementById('gyBig');
  delete window.plus;
  // 新电脑版（有 gy-self）
  const dl = []; let prog = null;
  window.gyDesk = { self: async (op, a) => { dl.push(op + ':' + (a || '')); if (op === 'ver') return { v: '1.0.0', canSwap: true }; prog({ got: 50, total: 100 }); return { ok: true }; }, onSelf: f => { prog = f; } };
  o.pc = await gyBigUpdCheck(true); await s(50);
  document.querySelector('#gyBig .ok').click(); await s(100);
  o.pcLog = dl.slice(); o.pcAfter = document.querySelector('#gyBig .s').textContent; document.getElementById('gyBig').remove();
  // 老 exe（没有 self）
  const opened = []; window.gyDesk = {}; const wo = window.open; window.open = u => { opened.push(u); return {}; };
  o.old = await gyBigUpdCheck(true); await s(50);
  o.oldBtn = document.querySelector('#gyBig .ok').textContent; document.querySelector('#gyBig .ok').click(); await s(50);
  o.oldOpened = opened.slice(); window.open = wo;
  // 下次再说 → 不再问（非强制）
  document.querySelector('#gyBig .no').click(); await s(20);
  o.skip = await gyBigUpdCheck(false);
  delete window.gyDesk;
  return o;
});
check('网页版不管', r.web === null, r.web);
check('安卓 155 < 156 弹大更新', r.and && r.and.need && /大更新/.test(r.andBox) && /不会丢/.test(r.andBox), r);
check('下载走 guyu.pw/dl/android', r.andLog.some(x => /^dl:https:\/\/guyu\.pw\/dl\/android _downloads\/guyu-156\.apk/.test(x)), r.andLog);
check('有进度', /15\.0 \/ 30\.0 MB/.test(r.andProg), r.andProg);
check('下完叫出安装', r.andLog.some(x => x === 'install:/sd/_downloads/guyu-156.apk') && /点「安装」/.test(r.andAfter), [r.andLog, r.andAfter]);
check('已经最新不弹', r.andSame && !r.andSame.need && !r.andSameBox, r.andSame);
check('电脑版 1.0.0 < 1.0.1 弹、能自己换', r.pc && r.pc.need && r.pc.canSwap && r.pcLog.includes('update:https://guyu.pw/dl/pc'), [r.pc, r.pcLog]);
check('电脑版换的时候说会自己打开', /自己打开/.test(r.pcAfter), r.pcAfter);
check('老 exe：按钮「去下载新版」、用浏览器下', r.oldBtn === '去下载新版' && r.oldOpened.includes('https://guyu.pw/dl/pc'), [r.oldBtn, r.oldOpened]);
check('没有报错', !errs.length, errs);
await browser.close();
results.forEach(x => console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.e)));
console.log(results.filter(x => x.ok).length + '/' + results.length);
