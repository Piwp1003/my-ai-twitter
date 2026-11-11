// 302：🔞 只给成年人用 + 🆓 完全免费声明 + 不是官方网址时挂提醒
// 用法（项目根目录）：node _开发测试/v302-free-adult-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const browser = await launchBrowser(chromium);
async function open(init) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(init || (() => {}));
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\//, r => r.abort());
  await page.goto(fileUrl(path.join(root, 'index.html')));
  await page.waitForFunction(() => typeof window.gyShowFree === 'function' && typeof myCharacters !== 'undefined', null, { timeout: 30000 });
  await page.waitForTimeout(800);
  return { ctx, page, errs };
}
// ① 第一次打开：先问年满 18 岁
{
  const { ctx, page, errs } = await open(() => { window.__gyAdultForce = 1; });
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const a = document.getElementById('gyAdult'); o.ask = !!a && /18/.test(a.innerText) && getComputedStyle(a).zIndex > 2147483600;
    document.getElementById('gyAdN').click(); await sleep(50);
    o.no = /先不要用/.test(document.getElementById('gyAdult').innerText) && !JSON.parse(localStorage.getItem('gyAdult') || '{}').ok;
    document.getElementById('gyAdB').click(); await sleep(50);
    document.getElementById('gyAdY').click(); await sleep(50);
    o.yes = !document.getElementById('gyAdult') && !!JSON.parse(localStorage.getItem('gyAdult') || '{}').ok && Object.keys(JSON.parse(localStorage.getItem('gyAdult'))).join() === 'ok';
    await sleep(1900); o.free = !!document.getElementById('gyFreeCard') && /完全免费/.test(document.getElementById('gyFreeCard').innerText) && /guyu\.pw/.test(document.getElementById('gyFreeCard').innerText);
    document.getElementById('gyFreeOk').click(); await sleep(50); o.freeClosed = !document.getElementById('gyFreeCard');
    return o;
  });
  check('第一次打开先问「年满 18 周岁吗」，盖在登录页上面', r.ask);
  check('点「还没满」：进不去，什么都不记；点错了能回去', r.no);
  check('点「我已年满 18 周岁」：只记「确认过了」（不记生日年龄），放行', r.yes);
  check('确认完弹一次「谷雨是完全免费的」，写着官方网址；能关', r.free && r.freeClosed);
  // 刷新：都不再问
  await page.reload(); await page.waitForFunction(() => typeof window.gyShowFree === 'function'); await page.waitForTimeout(4500);
  const r2 = await page.evaluate(async () => {
    const o = { adult: !!document.getElementById('gyAdult'), free: !!document.getElementById('gyFreeCard') };
    switchMainView('settings'); await new Promise(r => setTimeout(r, 3300));
    const b = document.querySelector('#setVersionLine .gy-freebtn'); o.btn = !!b; if (b) b.click(); o.again = !!document.getElementById('gyFreeCard');
    return o;
  });
  check('以后打开不再问、不再弹', !r2.adult && !r2.free);
  check('设置最下面版本号旁边有「🆓 完全免费」，点了能再看', r2.btn && r2.again);
  check('这一段没有页面报错', !errs.length, errs.join(' | '));
  await ctx.close();
}
// ② 不是官方网址：顶上挂红条；官方的不挂
{
  const { ctx, page, errs } = await open(() => { window.__gyHostForTest = 'guyu-vip.example.com'; });
  const r = await page.evaluate(() => ({
    ok: ['guyu.pw', 'www.guyu.pw', 'api.guyu.pw', 'my-ai-twitter.pages.dev', 'abc.my-ai-twitter.pages.dev', 'piwp1003.github.io', 'localhost', '127.0.0.1', '192.168.1.5', ''].every(h => window.__gyFreeHostOk(h)),
    bad: ['guyu-vip.example.com', 'guyu.pw.evil.com', 'xguyu.pw'].every(h => !window.__gyFreeHostOk(h)),
  }));
  check('认得出哪些是官方网址（guyu.pw、Pages、GitHub、本机），别的都不算', r.ok && r.bad);
  check('本地文件打开（电脑版）不挂红条', !(await page.$('#gyFreeBar')));
  await ctx.close();
}
// ③ 开屏登录把「已确认年满 18 岁」交上去；申请审核写在申请最前面
{
  const src = fs.readFileSync(path.join(root, 'js/92-gate.js'), 'utf8');
  check('开屏登录：交 adult，申请审核的申请最前面写「【已确认年满 18 岁】」', /adult: adult \? 1 : 0/.test(src) && /'【已确认年满 18 岁】' \+ ap/.test(src));
  const g = fs.readFileSync(path.join(root, 'js/94-guide-help.js'), 'utf8');
  check('使用指南有「完全免费」「只给成年人用」两条（标题不带「谷雨」，客服搜得到）', /id: 'free', t: '🆓 完全免费/.test(g) && /id: 'adult', t: '🔞 只给成年人用'/.test(g));
}
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
