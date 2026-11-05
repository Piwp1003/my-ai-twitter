// 285：🛍️ 拼多多——首页、详情、拼单（TA 决定拼不拼）、TA 开团你去拼、砍一刀（TA 帮砍、砍到 0 免费拿）、外卖、个人中心、自主行动
// 用法（项目根目录）：node _开发测试/v285-pdd-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd();
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.gysPdd, { timeout: 25000 });
await page.evaluate(() => {
  myCharacters.push({ id: 7001, name: '谢云昭', persona: '副县长', worldbooks: [], diaryData: { letters: [], diaries: [] } }); window.currentChatSessionId = 7001;
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  window.__p = [];
  const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); window.__p.push(t); let c = '嗯。';
    if (/上架 10 样商品/.test(t)) c = JSON.stringify([{ name: '手冲咖啡套装', price: '39.9', emoji: '☕', desc: '送滤纸', tag: '' }, { name: '羊绒围巾', price: '59', emoji: '🧣', desc: '软', tag: '' }, { name: '香薰蜡烛', price: '6.6', emoji: '🕯️', desc: '', tag: '' }]);
    else if (/发起拼单，叫你一起拼/.test(t)) c = '{"join":true,"line":"拼了，别买太多。"}';
    else if (/砍一刀/.test(t)) c = '又是拼多多。砍了。';
    else if (/开了个团想叫她/.test(t)) c = '这个围巾拼一下？';
    return { choices: [{ message: { content: c } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
});
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}; const T = () => (document.getElementById('gys_pdd') || {}).innerText || '';
  gysPddOpen('home'); await s(300); o.empty = /货架还是空的/.test(T());
  await gysPdd.restock(); await s(400); o.stock = gymallState().products.length >= 3 && /限时秒杀/.test(T()) && /手冲咖啡套装/.test(T());
  o.grid = ['帮我砍一刀', '多多外卖', '装扮商店', 'TA 的小店', '给 TA 买'].every(w => T().includes(w));
  const P0 = gymallState().products.find(p => /围巾/.test(p.name));
  gysPdd.item(P0.id); await s(300); o.detail = /先用后付/.test(T()) && /发起拼单/.test(T()) && /单独购买/.test(T()) && /50\.2/.test(T());
  // 发起拼单 → TA 拼了 → 下单是拼单价
  GYS.sheet = async () => 0; const n0 = gymallState().orders.length;
  await gysPdd.startGroup(P0.id); await s(400);
  const od = gymallState().orders[0]; o.group = gymallState().orders.length === n0 + 1 && od.productSnapshot.price === '50.2' && od.src === 'pdd' && (globalChats['7001'] || []).some(m => /拼了，别买太多/.test(m.text));
  // TA 开团（自主行动）→ 首页条 → 去拼单
  const A = GY_AUTONOMY_ACTIONS.find(a => a.key === 'gys_pdd_group'); const c = myCharacters[0];
  o.actNeed = !!A && A.need(c); const res = await A.run(c); o.actText = res && /围巾|拼/.test(res.text) && res.jump && res.jump.fn === 'gysPddGroup';
  GYS.tab('pdd', 'home'); await s(300); o.bar = /开了个团/.test(T());
  const nj = gymallState().orders.length; await gysPdd.join(res.jump.args[0]); await s(300); o.join = gymallState().orders.length === nj + 1 && (globalChats['7001'] || []).some(m => /拼上了|两份一起到|我也下单了/.test(m.text));
  // 砍一刀
  const P1 = gymallState().products.find(p => /咖啡/.test(p.name));
  gysPdd.cutStart(P1.id); await s(300); o.cutPage = /还差/.test(T()) && /叫 谢云昭 帮砍/.test(T());
  const n1 = gymallState().orders.length;
  for (let i = 0; i < 8; i++) { const k = (window.__pddD || {}).x; const btn = [...document.querySelectorAll('#gys_pdd .pd-go')].find(b => /叫 谢云昭 帮砍/.test(b.textContent)); if (!btn) break; btn.click(); await s(400); if (/砍成功了/.test(T())) break; }
  o.helped = /谢云昭/.test(T()) && /砍掉/.test(T()) && /又是拼多多/.test(T());
  o.onceADay = !![...document.querySelectorAll('#gys_pdd .pd-go.off')].length;
  // 外卖 / 个人中心 / 购物车
  GYS.tab('pdd', 'to'); await s(300); o.to = !!document.querySelector('#gys_pdd #gyTakeoutBody');
  GYS.tab('pdd', 'me'); await s(300); o.me = /钱包余额/.test(T()) && /在路上的快递/.test(T()) && /拼单 2 次/.test(T());
  GYS.tab('pdd', 'cart'); await s(300); o.cart = /正在砍的/.test(T());
  // 小功能、今天、小组件
  o.mini = GY_MINI_FEATURES.some(f => f.id === 'gysPdd') && gyHubFolders().find(f => f.id === 'hub_soft').members.includes('gysPdd');
  const W = window.__gyPmW && window.__gyPmW.WD && window.__gyPmW.WD.gysPddW; o.widget = !!W && /拼多多/.test(W.r({ size: 'm', id: 'x', k: 'gysPddW' }));
  GYS.close('pdd');
  return o;
});
check('货架空的时候能「进一批货」，首页有十个入口、限时秒杀、商品流', r.empty && r.stock && r.grid, JSON.stringify(r));
check('商品详情：拼单价、单独购买、先用后付', r.detail);
check('发起拼单：叫 TA 拼，TA 在聊天里回一句；拼上了按拼单价下单（进商城订单、有包裹）', r.group, JSON.stringify(r));
check('TA 自己开团叫你拼（自主行动），首页顶上出现「开了个团」，点「去拼单」就下单', r.actNeed && r.actText && r.bar && r.join, JSON.stringify(r));
check('砍一刀：自己先砍一大刀，叫 TA 帮砍（TA 在聊天里说一句），一天一次', r.cutPage && r.helped && r.onceADay, JSON.stringify(r));
check('多多外卖就是原来的外卖；个人中心有钱包、快递、拼单次数；购物车里有在砍的', r.to && r.me && r.cart, JSON.stringify(r));
check('📱 软件里有拼多多；有小组件', r.mini && r.widget, JSON.stringify(r));
check('没有报错', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 285 拼多多 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
