// 280：开屏登录 + 最低版本（js/92）。社区服务器用假的（page.route 拦下来回假数据），不会碰真的社区
// 用法（项目根目录）：node _开发测试/v280-gate-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd();
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const W = 'https://guyu-community.3040831326.workers.dev';
let M = {};   // 假服务器的状态
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
await ctx.addInitScript(() => { try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); } catch (e) {} });
// 302：年满 18 岁那一层（js/92e）当作已经确认过，这里只测开屏登录
await ctx.addInitScript(() => { try { if (!localStorage.getItem('gyAdult')) localStorage.setItem('gyAdult', JSON.stringify({ ok: 1 })); } catch (e) {} });
await ctx.route(/^https?:\/\//, async r => {
  const u = r.request().url();
  if (!u.startsWith(W)) return r.abort();
  if (M.down) return r.abort();
  const p = new URL(u).pathname; const J = o => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
  if (p === '/info') return J({ ok: true, community: true, name: '谷雨社区', join: M.join || 'open', applyQ: '怎么知道谷雨的', gate: M.gate !== false, minVer: M.minVer || 0, updUrl: M.updUrl || '', updMsg: M.updMsg || '' });
  if (p === '/whoami') return J({ ok: true, status: M.who || 'ok' });
  if (p === '/join') { M.joined = JSON.parse(r.request().postData() || '{}'); return J({ ok: true, token: 'u1.sec', id: 'u1', handle: 'x', status: M.join === 'apply' ? 'pending' : 'ok' }); }
  return J({ ok: false, err: 'mock' });
});
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
const go = async (pre) => { await page.goto(fileUrl(path.join(root, 'index.html'))); if (pre) { await page.evaluate(pre); await page.reload(); } await page.waitForFunction(() => window.__guyuBooted, { timeout: 25000 }); await page.waitForTimeout(1200); };
const ov = () => page.evaluate(() => { const b = document.getElementById('gyGate'); return b ? b.innerText : ''; });

// 1 没登录、谁都能进 → 登录页
M = {}; await go(() => localStorage.removeItem('gyGate'));
let t = await ov(); check('没登录：开屏出登录页（昵称 + 谷雨号）', /进入谷雨/.test(t) && await page.$('#ggNick') && !(await page.$('#ggCode')), t);
check('后面的谷雨照常启动（被盖住而已）', await page.evaluate(() => !!window.__guyuBooted && typeof myCharacters !== 'undefined'));
await page.click('#ggGo'); await page.waitForTimeout(200); t = await ov(); check('不填昵称拦一下', /起个昵称/.test(t));
await page.fill('#ggNick', '小林'); await page.click('#ggGo'); await page.waitForTimeout(800);
check('填好 → 进来了，钥匙存下', !(await ov()) && M.joined.nick === '小林' && await page.evaluate(() => gyGate.tok === 'u1.sec'));
await page.waitForTimeout(1200);
check('社区那边也算登录了（共用钥匙）', await page.evaluate(() => gysComm.__tok() === 'u1.sec'));

// 2 已登录 → 再打开直接进
await go(); check('登录过的人再打开：不拦', !(await ov()));
// 3 没网也放行（登录过的）
M.down = true; await go(); check('登录过的人没网：照样进', !(await ov())); M.down = false;
// 4 被封
M.who = 'banned'; await go(); t = await ov(); check('被封号：拦下', /被封/.test(t), t); M.who = 'ok';
// 5 被踢（钥匙失效）→ 回登录页
M.who = 'none'; await go(); t = await ov(); check('钥匙失效 / 被踢：回登录页', /进入谷雨/.test(t), t); M.who = 'ok';
// 6 邀请码模式
M.join = 'invite'; await go(() => localStorage.removeItem('gyGate')); check('邀请码模式：多一栏邀请码', !!(await page.$('#ggCode')));
// 7 申请模式 → 等审核
M.join = 'apply'; await go(() => localStorage.removeItem('gyGate')); check('申请审核模式：有问题要回答', !!(await page.$('#ggApply')) && /怎么知道谷雨的/.test(await page.getAttribute('#ggApply', 'placeholder')));
M.who = 'pending';   // 303：审核处每 4 秒会问一次过了没，这时候还没过
await page.fill('#ggNick', 'A'); await page.fill('#ggApply', '朋友说的'); await page.click('#ggGo'); await page.waitForTimeout(600);
t = await ov(); check('交了申请 → 审核处（303）（302 起申请最前面带「【已确认年满 18 岁】」，并交 adult:1）', /审核处/.test(t) && /等管理员审核/.test(t) && M.joined.apply === '【已确认年满 18 岁】朋友说的' && M.joined.adult === 1, t + ' ' + JSON.stringify(M.joined));
M.who = 'pending'; await go(); check('还没通过：再打开还是进审核处', /审核处/.test(await ov()));
M.who = 'ok'; await page.click('#ggRR'); await page.waitForTimeout(1500); check('通过了 → 审核处点「刷新」（不点 4 秒内也会自己发现）就进', !(await ov()));
M.join = 'open';
// 8 群主关了开屏登录
M.gate = false; await go(() => localStorage.removeItem('gyGate')); check('群主关掉开屏登录：没登录也直接进', !(await ov())); M.gate = true;
// 9 没登录 + 连不上 → 重试
M.down = true; await go(() => localStorage.removeItem('gyGate')); t = await ov(); check('第一次打开没网：出「重试」', /重试/.test(t), t);
M.down = false; await page.click('#ggRe'); await page.waitForTimeout(800); check('有网了点重试 → 登录页', /进入谷雨/.test(await ov()));
// 10 最低版本
M.minVer = 99999; M.updMsg = '新版出了，去群里下'; M.updUrl = 'https://example.com/a.apk';
await go(() => localStorage.setItem('gyGate', JSON.stringify({ tok: 'u1.sec' }))); t = await ov();
check('最低版本比自己高：拦下来叫更新（登录过也拦）', /新版出了/.test(t) && /去更新/.test(t) && /99999/.test(t), t);
M.minVer = 0;
// 11 自动化测试不拦（老测试照常跑）
const p2 = await (await browser.newContext()).newPage(); await p2.route(/^https?:\/\//, r => r.abort());
await p2.goto(fileUrl(path.join(root, 'index.html'))); await p2.waitForFunction(() => window.__guyuBooted, { timeout: 25000 }); await p2.waitForTimeout(800);
check('自动化测试里不出登录页（不影响别的测试）', !(await p2.$('#gyGate')));
// 12 社区设置里有开屏登录 / 最低版本（群主）
const src = (await import('fs')).readFileSync(path.join(root, 'js', '61-soft.js'), 'utf8');
check('社区设置里能改开屏登录、最低版本、更新链接', /__gate/.test(src) && /cmCV/.test(src) && /cmCU/.test(src) && /gateSync/.test(src));
check('没有报错', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 280 开屏登录 / 最低版本 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
