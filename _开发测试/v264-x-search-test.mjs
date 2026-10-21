// 264：推特搜索页（照 X 探索页）、顶栏不重叠
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd(); const shot = process.argv.includes('--shot');
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.gyPmSet, { timeout: 20000 });
await page.evaluate(() => {
  window.getApiConfig = () => ({ url: 'https://x.test/v1', key: 'k', model: 'm' });
  let n = 0; window.sendChatRequest = async (api, p) => { n++; const J = JSON.stringify([{ cat: '娱乐 · 趋势', t: '#晚霞第' + n + '批', n: 23000 }, { cat: '在中国的趋势', t: '降温', n: 8800 }]); return { choices: [{ message: { content: J } }] }; };
  try { sendChatRequest = window.sendChatRequest; getApiConfig = window.getApiConfig; } catch (e) {}
  myCharacters.length = 0; myCharacters.push({ id: 9101, name: '沈之遥', handle: '@shen_zy', persona: 'x', worldbooks: [], isFollowing: false });
  globalChats['9101'] = [{ sender: 9101, text: '在吗', timestamp: Date.now() - 6e4 }];
  globalPosts.unshift({ id: 'p_s1', char: { id: 9101, name: '沈之遥', handle: '@shen_zy' }, text: '今天的晚霞很好看', timestamp: Date.now() - 3e5, stats: { likes: 1, comments: 0, retweets: 0, views: 9 } });
  try { localStorage.removeItem('gyXEx'); } catch (e) {}
});
await page.evaluate(() => gyPmSet(true)); await page.waitForTimeout(600);
await page.evaluate(() => gyPmOpen('home')); await page.waitForTimeout(700);
const hidden = s => page.evaluate(s => { const e = document.querySelector(s); return !e || getComputedStyle(e).visibility === 'hidden' || getComputedStyle(e).display === 'none'; }, s);
check('主页：原来的返回键藏起来了（不跟头像叠）', await hidden('#gyPmBar .nav .l'));
await page.evaluate(() => gyPmXGo('search')); await page.waitForTimeout(800);
check('搜索：底栏还在，搜索亮着', await page.evaluate(() => getComputedStyle(document.getElementById('gyPmX')).display !== 'none' && document.querySelectorAll('#gyPmX span')[1].classList.contains('on')));
check('搜索：顶上有搜索框', await page.evaluate(() => !!document.getElementById('gyPmXQ')));
check('搜索：五个栏', await page.evaluate(() => document.querySelectorAll('#gyPmXEx .xt span').length === 5));
check('搜索：一打开就刷出趋势', await page.evaluate(() => /晚霞第1批/.test(document.getElementById('gyPmXEx').innerText)));
check('搜索：推荐关注', await page.evaluate(() => /推荐关注/.test(document.getElementById('gyPmXEx').innerText) && !!document.querySelector('#gyPmXEx .xw a')));
if (shot) await page.screenshot({ path: '_tmp/x264-search.png' });
// 下拉刷新（触屏）
await page.evaluate(async () => { const ex = document.getElementById('gyPmXEx'); const T = y => new Touch({ identifier: 1, target: ex, clientX: 100, clientY: y }); ex.dispatchEvent(new TouchEvent('touchstart', { touches: [T(200)], bubbles: true })); ex.dispatchEvent(new TouchEvent('touchmove', { touches: [T(400)], bubbles: true })); ex.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true })); });
await page.waitForTimeout(600);
check('下拉刷新：新的一批在最上面', await page.evaluate(() => { const b = [...document.querySelectorAll('#gyPmXEx .xr b')].map(x => x.textContent); return b.some(x => /第2批/.test(x)) && b.findIndex(x => /第2批/.test(x)) < b.findIndex(x => /第1批/.test(x)); }));
// 滑到底加载更多
await page.evaluate(async () => { await window.__gyPmXEx.gen('rec', 'more'); });
check('滑到底：接在后面', await page.evaluate(() => { const b = [...document.querySelectorAll('#gyPmXEx .xr b')].map(x => x.textContent); return b[b.length - 1] === '降温' || b.some(x => /第3批/.test(x)); }));
await page.evaluate(() => gyPmXExTab('news')); await page.waitForTimeout(500);
check('换栏：新闻也有', await page.evaluate(() => document.querySelector('#gyPmXEx .xt span.on').textContent === '新闻' && document.querySelectorAll('#gyPmXEx .xr').length > 0));
await page.evaluate(() => gyPmXSearch('晚霞')); await page.waitForTimeout(500);
check('搜索：能搜出推文', await page.evaluate(() => getComputedStyle(document.getElementById('searchFeedSection')).display !== 'none' && /今天的晚霞很好看/.test(document.getElementById('searchFeedSection').innerText) && getComputedStyle(document.getElementById('gyPmXEx')).display === 'none'));
if (shot) await page.screenshot({ path: '_tmp/x264-result.png' });
await page.evaluate(() => gyPmXSearch('')); await page.waitForTimeout(300);
check('清空：回到探索页', await page.evaluate(() => getComputedStyle(document.getElementById('gyPmXEx')).display !== 'none'));
await page.evaluate(() => { gyPmXGo('dm'); switchChatSession('9101'); }); await page.waitForTimeout(800);
const r = await page.evaluate(() => { const h = document.getElementById('gyPmXHead'); const rs = h ? [...h.children].map(e => e.getBoundingClientRect()) : []; let ov = false; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], b = rs[j]; if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) ov = true; } return { cls: h && h.className, n: rs.length, ov, name: h && h.innerText }; });
check('私信里：推特自己的顶栏（返回 / 头像名字 / ⓘ），不重叠', r.cls === 'x-thread' && r.n === 3 && !r.ov && /沈之遥/.test(r.name), JSON.stringify(r));
check('私信里：原来顶栏的按钮藏起来了', await hidden('#gyPmBar .nav .r') && await hidden('#gyPmBar .nav .l'));
if (shot) await page.screenshot({ path: '_tmp/x264-dm.png' });
await page.evaluate(() => document.querySelector('#gyPmXHead .xb').click()); await page.waitForTimeout(500);
check('私信里点返回：回到私信列表', await page.evaluate(() => document.getElementById('gyPmXHead') && document.getElementById('gyPmXHead').className === 'x-dm'));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 264 推特搜索页 / 顶栏 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
if (errs.length) console.log('⚠️ ' + [...new Set(errs)].slice(0, 8).join('\n'));
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length ? 0 : 1);
