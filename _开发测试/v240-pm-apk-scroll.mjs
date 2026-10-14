// 📱 安卓打包 App 里开小手机模式：页面、弹出来的小页面都能滑
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path'; import fs from 'fs';
const root = process.cwd();
const PLUG = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 uni-app Html5Plus/1.0' });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.gyPmSet && typeof executePluginOnLoad === 'function', { timeout: 30000 });
await page.evaluate(({ PLUG }) => { PLUG.forEach(p => executePluginOnLoad(p)); myCharacters.push({ id: 9100, name: 'A', persona: 'x', worldbooks: [] }); for (let i = 0; i < 40; i++) globalPosts.push({ id: 'p' + i, char: myCharacters[0], text: '帖子 ' + i + ' 内容内容内容内容内容内容内容内容内容内容内容', timestamp: Date.now() - i * 6e4, replies: [], stats: { likes: 1, comments: 0, retweets: 0, views: 1 } }); }, { PLUG });
await page.waitForTimeout(1500);
await page.evaluate(() => gyPmSet(true)); await page.waitForTimeout(800);
const cdp = await ctx.newCDPSession(page);
const swipe = async (x, y0, y1) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] }); for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * i / 12 }] }); await page.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(400); };
await swipe(195, 700, 250); await page.waitForTimeout(500);   // 解锁
const st = await page.evaluate(() => ({ apk: document.documentElement.classList.contains('gy-apk'), shell: getComputedStyle(document.getElementById('gyPm')).display, ob: getComputedStyle(document.documentElement).overscrollBehaviorY }));
check('认出是安卓打包的 App；手机上那层外壳整个拿掉；根上不再关滚动', st.apk && st.shell === 'none' && st.ob !== 'none', JSON.stringify(st));
const scrolled = async open => { await page.evaluate(() => { scrollTo(0, 0); document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); }); await page.evaluate(open); await page.waitForTimeout(800); await swipe(195, 700, 250); return page.evaluate(() => scrollY > 0 || [...document.querySelectorAll('.gyx-box,.gyx-bd')].some(e => e.scrollTop > 0)); };
check('点图标进去的页面（主页）能滑', await scrolled(() => switchMainView('home')));
check('点图标进去的页面（设置）能滑', await scrolled(() => switchMainView('settings')));
check('弹出来的小页面能滑', await scrolled(() => gyxScoopOpen()));
const bad = errs.filter(e => !/Failed to fetch/.test(e)); check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 400));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
