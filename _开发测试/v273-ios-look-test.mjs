// 273：🍏 iOS 外观——液态玻璃桌面、状态栏 / 底部导航栏开关、深浅色跟软件同步、总开关关掉回到以前
// 用法（项目根目录）：node _开发测试/v273-ios-look-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const ALL = []   /* 277：软件都内置了，不用导入 */;
const browser = await launchBrowser(chromium, { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.gyPmSet && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(async ({ plugs }) => { plugs.forEach(p => { try { executePluginOnLoad(p); } catch (e) {} }); await new Promise(r => setTimeout(r, 400)); gyPmSet(true); }, { plugs: ALL });
await page.waitForTimeout(1500);
await page.evaluate(() => { try { gyPmUnlock(); } catch (e) {} }); await page.waitForTimeout(800);
const cls = () => page.evaluate(() => document.body.className);
check('默认开着：body 有 gy-ios / gy-ios-glass', /gy-ios\b/.test(await cls()) && /gy-ios-glass/.test(await cls()));
const g = await page.evaluate(() => ({ cv: !!document.querySelector('#gyPmHome canvas.gy-lg'), on: document.getElementById('gyPmHome').classList.contains('gy-lg-on'), st: window.__gyIosGlass.state() }));
check('桌面有液态玻璃画布（WebGL 画好了）', g.cv && g.on, JSON.stringify(g));
check('软件也接上了（状态栏听 iOS 外观的）', await page.evaluate(() => !!(window.GYS && GYS.__iosHook)));
await page.evaluate(() => gyPmBeauty()); await page.waitForTimeout(300);
check('美化抽屉里有「iOS 外观」', await page.evaluate(() => /iOS 外观/.test(document.getElementById('gyPmSheet').textContent) && /底部导航栏/.test(document.getElementById('gyPmSheet').textContent)));
await page.evaluate(() => gyPmPref('dark', true)); await page.waitForTimeout(300);
check('美化里点深色：软件（谷雨深色）一起变', await page.evaluate(() => darkTheme === true && document.body.classList.contains('dark-theme')));
await page.evaluate(() => gyPmPref('dark', false)); await page.waitForTimeout(300);
check('点回浅色：一起变回来', await page.evaluate(() => darkTheme === false && !document.body.classList.contains('dark-theme')));
await page.evaluate(() => gyIos.set('sb', 'off')); check('状态栏：隐藏', /gy-ios-nosb/.test(await cls()));
await page.evaluate(() => gyIos.set('sb', 'auto'));
await page.evaluate(() => { gyIos.set('tab', 'mini'); GYS.open('weibo'); }); await page.waitForTimeout(500);
const mini = await page.evaluate(() => { const t = document.querySelector('#gys_weibo .gys-tabs'); return t ? t.getBoundingClientRect().width : -1; });
check('底部导航栏收起：只剩一个小圆', mini > 0 && mini < 80, mini);
await page.evaluate(() => document.querySelector('#gys_weibo .gys-tabs').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await page.waitForTimeout(400);
const open = await page.evaluate(() => document.querySelector('#gys_weibo .gys-tabs').getBoundingClientRect().width);
check('点一下展开', open > 200, open);
await page.evaluate(() => { gyIos.set('tab', 'show'); GYS.close('weibo'); });
await page.evaluate(() => gyIos.set('glass', false)); await page.waitForTimeout(400);
check('液态玻璃关：画布撤掉', await page.evaluate(() => !document.querySelector('#gyPmHome canvas.gy-lg')));
await page.evaluate(() => gyIos.set('on', false)); await page.waitForTimeout(400);
check('总开关关：以前的样子（没有 gy-ios 类）', !/gy-ios/.test(await cls()));
await page.evaluate(() => { gyIos.set('on', true); gyIos.set('glass', true); });
// 小组件 iOS 排版：开着是 iOS 那种，你挑了别的款式（v）还是你挑的
const wi = await page.evaluate(() => { const WD = window.__gyPmW.WD; return { cal: /gi-cal/.test(WD.cal.r({ id: 'x', size: 's', d: {} })), mu: /gi-mu/.test(WD.music.r({ id: 'x', size: 'm', d: {} })), flip: !/gi-clk/.test(WD.clock.r({ id: 'x', size: 's', d: { v: 'flip' } })) }; });
check('小组件换成 iOS 排版（挑了别的款式的不动）', wi.cal && wi.mu && wi.flip, JSON.stringify(wi));
// 豆瓣作品页：模糊海报铺底
const db = await page.evaluate(async () => {
  const st = gysDbState(); st.items.t1 = { id: 't1', kind: 'movie', title: '夜航', sub: '', year: '2026', meta: '', intro: '雨季', score: 8.9, n: 1000, real: false, emo: '🌙', dist: [40, 40, 15, 4, 1], shorts: [], longs: [] };
  GYS.open('douban'); gysDb.item('t1'); await new Promise(r => setTimeout(r, 400));
  const R = document.getElementById('gys_douban'); const o = { on: R.classList.contains('gy-dbon'), bg: !!R.querySelector(':scope>.gy-dbbg>i') };
  GYS.close('douban'); return o; });
check('豆瓣作品页：模糊海报铺在后面', db.on && db.bg, JSON.stringify(db));
// 推特个人主页：玻璃资料卡
const xp = await page.evaluate(async () => { gyPmOpen('home'); await new Promise(r => setTimeout(r, 300)); switchMainView('profile', 'me'); await new Promise(r => setTimeout(r, 1200)); const vp = document.getElementById('view-profile'); return { on: vp.classList.contains('gy-xpon'), bg: !!vp.querySelector('.gy-xpbg'), blur: /blur/.test(getComputedStyle(vp.querySelector('.profile-details')).backdropFilter || '') }; });
check('推特个人主页：横幅模糊铺底 + 玻璃资料卡', xp.on && xp.bg && xp.blur, JSON.stringify(xp));
const xo = await page.evaluate(async () => { gyIos.set('xcard', false); await new Promise(r => setTimeout(r, 200)); const off = !document.getElementById('view-profile').classList.contains('gy-xpon'); gyIos.set('xcard', true); await new Promise(r => setTimeout(r, 200)); return off && document.getElementById('view-profile').classList.contains('gy-xpon'); });
check('推特主页玻璃卡片能单独关（关了是普通的）', xo);
check('没有报错', !errs.length, errs.join('\n'));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 273 iOS 外观 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length ? 0 : 1);
