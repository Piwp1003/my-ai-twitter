// 309：国内线路——主地址卡着不回话时，社区 / 网站请求自己换到 cn.guyu.pw，换成了记住
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e: typeof e === 'string' ? e : JSON.stringify(e) });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
const J = (o) => ({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
await page.route(/^https?:\/\//, r => {
  const u = r.request().url();
  if (/^https:\/\/(api\.)?guyu\.pw\//.test(u)) return;            // 主地址：一直不回话（模拟国内被卡）
  if (/^https:\/\/cn\.guyu\.pw\/c\/info/.test(u)) return r.fulfill(J({ community: true, name: '测试社区' }));
  if (/^https:\/\/cn\.guyu\.pw\/dl\/info/.test(u)) return r.fulfill(J({ android: { v: '9.9' } }));
  return r.abort();
});
await page.goto(fileUrl(path.join(process.cwd(), 'index.html')));
await page.waitForFunction(() => window.__guyuBooted, null, { timeout: 40000 });
const r = await page.evaluate(async () => {
  const o = {};
  o.urls = gyGate.urls; o.sites = gySite.sites;
  const t0 = Date.now();
  const res = await gyGate.fetch('/info').then(x => x.json()).catch(e => ({ err: String(e) }));
  o.info = res; o.ms = Date.now() - t0; o.cur = gyGate.url;
  const j = await gySite.each(b => fetch(b + '/dl/info?x=' + Date.now(), { signal: AbortSignal.timeout(3000) }).then(x => x.json())).catch(e => ({ err: String(e) }));
  o.dl = j; o.base = gySite.base(); o.saved = localStorage.getItem('gySite');
  return o;
});
check('社区地址里有国内线路（排第二）', r.urls[1] === 'https://cn.guyu.pw/c', r.urls);
check('主地址卡住 → 换到国内线路拿到 /info', r.info && r.info.community && r.cur === 'https://cn.guyu.pw/c', r);
check('换线没等太久（< 12 秒）', r.ms < 12000, r.ms);
check('网站请求也换到 cn.guyu.pw 并记住', r.dl && r.dl.android && r.base === 'https://cn.guyu.pw' && r.saved === 'https://cn.guyu.pw', r);
const src = fs.readFileSync('edge-functions/c/[[default]].js', 'utf8');
check('国内线路转发到 api.guyu.pw', /const UP = 'https:\/\/api\.guyu\.pw'/.test(src) && /export async function onRequest/.test(src));
check('没有报错', errs.length === 0, errs);
await browser.close();
let ok = 0; for (const x of results) { console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok ? '' : '  ' + x.e.slice(0, 400))); if (x.ok) ok++; }
console.log(`\n${ok}/${results.length} 通过`); process.exit(ok === results.length ? 0 : 1);
