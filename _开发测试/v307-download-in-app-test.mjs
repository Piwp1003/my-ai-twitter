// 307 补：谷雨里面的 📦 下载安装包（图标在、能搜到、点开有三张卡、info 填上版本）
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e: typeof e === 'string' ? e : JSON.stringify(e) });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => { try { localStorage.setItem('gyPlayOn', '1'); } catch (e) {} });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await page.route(/^https?:\/\//, r => /guyu\.pw\/dl\/info/.test(r.request().url())
  ? r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ android: { v: '1.55', at: '2026-11-12T08:00:00Z', size: 31457280 }, pc: { v: '1.0.3', at: '2026-11-12T09:00:00Z', size: 83886080 } }) })
  : r.abort());
await page.goto(fileUrl(path.join(process.cwd(), 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.__gyPlayReady, null, { timeout: 40000 });
await page.evaluate(() => switchMainView('miniHub')); await page.waitForTimeout(2500);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  o.reg = GY_MINI_FEATURES.some(f => f.id === 'gyDownload');
  const st = gyIhState(); const pg = st.pages.find(p => p.ids.includes('gyDownload')); o.page = pg && pg.t;
  const q = document.getElementById('gyIhQ'); q.value = '安装包'; q.dispatchEvent(new Event('input', { bubbles: true })); await s(100);
  o.search = [...document.querySelectorAll('#gyIh .gyih-row')].map(b => b.dataset.id);
  q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); await s(100);
  gyIhOpen('gyDownload'); await s(800);
  const el = document.getElementById('gyDl'); o.open = !!el;
  o.cards = el ? el.querySelectorAll('.it').length : 0;
  o.text = el ? el.innerText : '';
  if (el) el.querySelector('.cl').click(); await s(100); o.closed = !document.getElementById('gyDl');
  switchMainView('settings'); await s(1500);
  const m = document.querySelector('#setIndex .set-menu'); const ids = m ? [...m.children].slice(0, 4).map(x => x.id || x.className) : [];
  o.setIds = ids; o.third = m ? m.children[2].innerText.slice(0,40) : ''; const de = document.getElementById('gyDlEntry'); o.setVis = !!de && de.getBoundingClientRect().height > 20;
  if (de) de.click(); await s(500); o.setOpen = !!document.getElementById('gyDl');
  return o;
});
check('注册了 gyDownload', r.reg);
check('在图标桌面「调整谷雨」那一类', /调整谷雨|设置/.test(r.page || ''), r.page);
check('搜「安装包」能找到', r.search.includes('gyDownload'), r.search);
check('点开有三张卡', r.open && r.cards === 3, r.cards);
check('写着安卓 1.55 版、电脑 1.0.3 版', /1\.55 版/.test(r.text) && /1\.0\.3 版/.test(r.text), r.text.slice(0, 300));
check('能关上', r.closed);
check('设置首页第三个就是下载安装包', r.setIds[2] === 'gyDlEntry' && r.setVis, [r.setIds, r.third]);
check('在设置里点它能打开', r.setOpen);
check('没有报错', !errs.length, errs);
await browser.close();
results.forEach(x => console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.e)));
console.log(results.filter(x => x.ok).length + '/' + results.length);
