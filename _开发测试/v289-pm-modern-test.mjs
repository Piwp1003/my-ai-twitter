// 289：小手机——通知中心「已读」= 全部已读、已读的不再显示；老图标换成后来的软件（购物 → 拼多多、音乐 → 网易云、电影 → 抖音一起看）
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd();
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.gyPmSet, { timeout: 25000 });
await page.waitForTimeout(1500);
await page.evaluate(() => gyPmSet(true)); await page.waitForTimeout(800);
// 通知
await page.evaluate(() => { const t = Date.now(); globalNotifications.unshift({ text: '<b>甲</b> 测试一', timestamp: t }, { text: '<b>乙</b> 测试二', timestamp: t - 1000 }, { text: '旧的', timestamp: t - 2000, read: true }); gyNotifEnsureIds(); gyPmNC(true); });
await page.waitForTimeout(300);
let t = await page.evaluate(() => document.getElementById('gyPmNC').innerText);
check('通知中心只显示没读的', /测试一/.test(t) && /测试二/.test(t) && !/旧的/.test(t), t.slice(0, 200));
await page.evaluate(() => gyPmNCRead()); await page.waitForTimeout(300);
t = await page.evaluate(() => document.getElementById('gyPmNC').innerText);
check('点「已读」：全部算已读、列表空了', !/测试一|测试二/.test(t) && /没有新通知/.test(t) && await page.evaluate(() => globalNotifications.every(n => n.read)), t.slice(0, 200));
await page.evaluate(() => globalNotifications.unshift({ text: '新来的', timestamp: Date.now() }));
await page.evaluate(() => gyPmNC(true)); await page.waitForTimeout(200);
t = await page.evaluate(() => document.getElementById('gyPmNC').innerText);
check('再来一条新的：只出新的那条', /新来的/.test(t) && !/测试一/.test(t));
await page.evaluate(() => gyPmNC(false));
// 图标
await page.evaluate(() => gyPmHomeRender()); await page.waitForTimeout(300);
const lb = await page.evaluate(() => { const g = k => { const e = document.querySelector(`#gyPmHome .pm-app[data-pmapp="${k}"] .pm-lb`); return e ? e.textContent : null; }; return { mall: g('mall'), pddDup: !!document.querySelector('#gyPmHome .pm-app[data-pmapp="mf_gysPdd"]'), muDup: !!document.querySelector('#gyPmHome .pm-app[data-pmapp="mf_gysMusic"]'), m: gyPmModernOf('mall'), mu: gyPmModernOf('music'), f: gyPmModernOf('film') }; });
check('「购物」图标变成拼多多，没有重复的拼多多 / 网易云图标', lb.mall === '拼多多' && !lb.pddDup && !lb.muDup && lb.m && lb.mu, JSON.stringify(lb));
await page.evaluate(() => gyPmOpen('mall')); await page.waitForTimeout(500);
check('点「购物」→ 打开拼多多', await page.evaluate(() => GYS.isOpen('pdd'))); await page.evaluate(() => GYS.close('pdd')); await page.waitForTimeout(200);
await page.evaluate(() => gyPmOpen('music')); await page.waitForTimeout(500);
check('点「音乐」→ 打开网易云', await page.evaluate(() => GYS.isOpen('music'))); await page.evaluate(() => GYS.close('music')); await page.waitForTimeout(200);
if (lb.f) { await page.evaluate(() => gyPmOpen('film')); await page.waitForTimeout(500); check('点「一起看」→ 抖音的一起看', await page.evaluate(() => GYS.isOpen('douyin'))); await page.evaluate(() => GYS.close('douyin')); }
// 拼多多关了 → 回到原来的购物
await page.evaluate(() => { GYX.set ? GYX.set('gysPdd', false) : null; }); await page.waitForTimeout(200);
const off = await page.evaluate(() => GYX.on && !GYX.on('gysPdd') ? gyPmModernOf('mall') : 'skip');
check('拼多多关了：购物还是原来的商城', off === null || off === 'skip', JSON.stringify(off));
check('没有页面报错', !errs.length, [...new Set(errs)].slice(0, 5).join(' | '));
await browser.close();
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${results.filter(x => x.ok).length}/${results.length} 通过`); process.exit(results.every(x => x.ok) ? 0 : 1);
