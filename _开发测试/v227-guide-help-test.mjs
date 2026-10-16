// v227：📘 使用指南（设置最上面，去看看 / 开关状态 / 点开关跳过去）+ 🛟 客服（问答先查指南再问 API；报错、插件冲突会提醒）
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
if (!fs.existsSync(path.join(root, 'js', '94-guide-help.js'))) { console.log('（这个项目没有指南和客服，跳过）'); process.exit(0); }
const PLUG = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ PLUG }) => {
  myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  PLUG.forEach(p => executePluginOnLoad(p));
}, { PLUG });
await page.waitForTimeout(2500);

// ① 设置最上面两个入口；指南：章节、开关状态
const g = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  switchMainView('settings'); await sleep(200);
  const es = [...document.querySelectorAll('#setIndex .set-menu > .set-entry')].slice(0, 2).map(b => b.querySelector('.set-entry-title').innerText.trim());
  o.top = es;
  document.getElementById('gyGuideEntry').click(); await sleep(200);
  const ov = document.getElementById('gyGuideOv');
  o.secs = [...ov.querySelectorAll('.gyg-sec h3')].map(h => h.innerText);
  o.noOld = !/旧名字|白露版/.test(ov.innerText);
  o.items = ov.querySelectorAll('.gyg-it').length;
  o.goBtns = ov.querySelectorAll('.gyg-it-hd button').length;
  const chips = [...ov.querySelectorAll('.gyg-sw')];
  o.chips = chips.length; o.onOff = { on: ov.querySelectorAll('.gyg-sw.on').length, off: ov.querySelectorAll('.gyg-sw.off').length, na: ov.querySelectorAll('.gyg-sw.na').length };
  // 关一个插件功能，指南里显示「关着」
  GYX.set('gyxBadge', false); gyGuideOpen(); await sleep(50);
  o.badgeOff = [...document.querySelectorAll('#gyGuideOv .gyg-sw')].some(s => /我们的成就/.test(s.innerText) && s.classList.contains('off') && /关着/.test(s.innerText));
  GYX.set('gyxBadge', true);
  return o;
});
check('设置最上面是「📘 使用指南」「🛟 客服」', g.top[0] === '使用指南' && /^客服/.test(g.top[1]), JSON.stringify(g.top));
check('指南：13 节（没有「旧名字」「白露版」），每条都有「去看看」，用到的开关显示开着 / 关着', g.secs.length === 13 && g.noOld && g.items >= 80 && g.goBtns >= g.items - 2 && g.chips >= 60 && g.onOff.on > 20 && g.badgeOff, JSON.stringify(g));

// ② 跳转：去看看、点开关
const j = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  gyGuideOpen(); await sleep(50); gyGuideGo('allsw'); await sleep(250);
  o.allsw = getComputedStyle(document.getElementById('setPanel-auto')).display !== 'none' && !document.getElementById('gyGuideOv');
  gyGuideOpen(); await sleep(50); gyGuideGo('h_rel'); await sleep(400);
  o.hub = !!document.getElementById('gyHubOv') && /我们的关系/.test(document.getElementById('gyHubOv').innerText); try { gyHubClose(); } catch (e) {}
  gyGuideOpen(); await sleep(50); gyGuideGo('badge'); await sleep(400);
  o.hubTab = !!document.querySelector('#gyHubOv .gyhb-ttl') && /成就/.test(document.querySelector('#gyHubOv .gyhb-ttl').innerText); try { gyHubClose(); } catch (e) {}
  gyGuideOpen(); await sleep(50); gyGuideSw('c:charAutonomy'); await sleep(500);
  o.coreSw = (document.getElementById('gyswQ') || {}).value === '角色自己决定要做什么' && [...document.querySelectorAll('#setPanel-auto .auto-feat-row')].filter(r => r.style.display !== 'none').length >= 1;
  gyGuideOpen(); await sleep(50); gyGuideSw('x:gyxRing.auto'); await sleep(500);
  o.gyxSw = !!document.getElementById('gyxSwOv') && !!document.querySelector('.sw-it.gyg-flash') && /来电动画/.test(document.querySelector('.sw-it.gyg-flash').innerText);
  try { document.getElementById('gyxSwOv').remove(); } catch (e) {}
  // 搜索
  gyGuideOpen(); gyGuideSearch('记账'); await sleep(30);
  o.search = document.querySelector('#gygBody .gyg-it').dataset.id;
  document.getElementById('gyGuideOv').remove();
  o.api = ['记账在哪', '新版旧版模式在哪', '怎么换皮肤', 'TA 怎么不主动找我了', '两地时差在哪改', '更新了没反应'].map(q => (gyGuideSearchApi(q)[0] || {}).id);
  return o;
});
check('去看看：全部开关、合集、合集里的某一个标签都直接打开', j.allsw && j.hub && j.hubTab, JSON.stringify(j));
check('点开关：谷雨自带的跳到「全部开关」并搜好；插件的跳到「插件开关中心」并闪那一行', j.coreSw && j.gyxSw, JSON.stringify(j));
check('指南搜索：记账 / 新版旧版 / 换皮肤 / TA 不找我 / 两地 / 更新没反应 都找得对', j.search === 'book' && ['book', 'len', 'skin', null, 'place', 'f1'].every((x, i) => x == null ? ['reach', 'f4'].includes(j.api[i]) : j.api[i] === x), JSON.stringify(j));

// ③ 客服问答：指南能答的直接答（不调 API）；答不上的才问 API，带着指南
const q = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  let calls = 0, sys = '';
  const orig = window.callChatCompletionAPI;
  window.callChatCompletionAPI = async (api, msgs) => { calls++; sys = msgs[0].content; return { choices: [{ message: { content: '这个要在小手机的美化里改哦，换一张壁纸就好。\n[[跳转:wall,place]]' } }] }; };
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  gyHelpOpen(); await sleep(100);
  await gyHelpAsk('怎么换皮肤'); await sleep(50);
  const last = () => gyHelpData().msgs[gyHelpData().msgs.length - 1];
  o.guide = calls === 0 && (last().refs || []).includes('skin') && !!document.querySelector('#gyhBody .gyh-m.cs:last-child .gyg-it[data-id="skin"]');
  await gyHelpAsk('谷雨的作者是谁'); await sleep(50);
  o.ai = calls === 1 && last().ai && /壁纸/.test(last().t) && !/\[\[/.test(last().t) && JSON.stringify(last().refs) === '["wall","place"]' && /使用指南/.test(sys) && /\[len\]/.test(sys);
  setAutoFeature('helpAsk', false, true); await gyHelpAsk('谷雨的作者是谁'); await sleep(50);
  o.off = calls === 1 && /问 API」关着/.test(last().t);
  setAutoFeature('helpAsk', true, true);
  window.callChatCompletionAPI = orig;
  await gyHelpAsk('最近有报错吗'); o.issuesAsk = /正常|最近|没有报错|发现/.test(last().t);
  document.getElementById('gyHelpOv').remove();
  return o;
});
check('客服：指南答得上的直接答 + 给去处卡片，不花 API', q.guide, JSON.stringify(q));
check('客服：指南答不上才问 API（系统提示里带着整份指南），回答里的去处变成按钮；开关关了就只查指南', q.ai && q.off && q.issuesAsk, JSON.stringify(q));

// ④ 盯着出问题：插件报错、接口报错、插件装了两份 → 客服窗口一条 + 通知；6 小时内不重复
const w = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  const n0 = (globalNotifications || []).length;
  setTimeout(new Function('null.boom();\n//# sourceURL=gyx-plugin/测试插件.js'), 0); await sleep(1200);
  setTimeout(new Function('null.boom();\n//# sourceURL=gyx-plugin/测试插件.js'), 0); await sleep(150);
  // 死循环那种 1 秒内连环刷的，并成一条
  for (let k = 0; k < 5; k++) setTimeout(new Function('null.boom();\n//# sourceURL=gyx-plugin/测试插件.js'), 0); await sleep(150);
  const D = gyHelpData(), it = D.issues.find(i => /测试插件/.test(i.title));
  o.plugin = !!it && it.n === 7 && /插件开关中心/.test(it.tip) && D.msgs.filter(m => m.iss === it.id).length === 2;
  const mine = (globalNotifications || []).slice(0, (globalNotifications || []).length - n0).filter(n => /测试插件/.test(n.text)); o.notif = mine.length === 2 && /客服|🛟/.test(mine[0].text) && mine[0].jump && mine[0].jump.fn === 'gyHelpOpen';
  o.unread = D.unread >= 1 && document.querySelector('#gyHelpEntry .gyh-dot').style.display !== 'none';
  // 接口报错
  window.callChatCompletionAPI = async () => ({ error: { message: 'You exceeded your current quota (insufficient_quota)' } }); await sleep(700);
  await window.callChatCompletionAPI({}, []); await sleep(100);
  o.api = gyHelpData().issues.some(i => /余额/.test(i.title));
  // 插件装了两份
  const fk = { name: '💞 我们的关系', type: 'script', enabled: true, onLoad: '' }; plugins.push(fk, Object.assign({}, fk));
  await gyHelpCheck(); await sleep(100);
  o.dup = gyHelpData().issues.some(i => i.title === '同一个插件装了两份' && /我们的关系/.test(i.detail));
  plugins.splice(plugins.length - 2, 2);
  // 打开看：问题页、解决了、复制
  gyHelpOpen('issues'); await sleep(100);
  o.page = document.querySelectorAll('#gyhBody .gyh-iss').length >= 3 && gyHelpData().unread === 0;
  const id = gyHelpData().issues.find(i => /测试插件/.test(i.title)).id; await gyHelpDone(id); o.done = gyHelpData().issues.find(i => i.id === id).done;
  // 关掉「盯着」就不记
  setAutoFeature('helpWatch', false, true); const k = gyHelpData().issues.length;
  setTimeout(new Function('null.other();\n//# sourceURL=gyx-plugin/另一个.js'), 0); await sleep(150);
  o.offWatch = gyHelpData().issues.length === k; setAutoFeature('helpWatch', true, true);
  document.getElementById('gyHelpOv').remove();
  return o;
});
check('插件出错：记成「插件「测试插件」出错了」+ 怎么办；每出一次都提醒（只有 1 秒内连环刷的并成一条）；通知能点回客服', w.plugin && w.notif && w.unread, JSON.stringify(w));
check('接口报错（余额不够）、插件装了两份 都会记下；问题页能标解决；开关关了就不记', w.api && w.dup && w.page && w.done && w.offWatch, JSON.stringify(w));

// ⑤ 开关、小功能、今天、小组件、记忆总览
const r = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  o.sw = ['helpWatch', 'helpAsk'].every(k => AUTO_FEATURE_DEFS.some(f => f.key === k && f.group === '客服'));
  o.mini = GY_MINI_FEATURES.some(f => f.id === 'gyHelp');
  o.mem = ['gyHelpIssues', 'gyHelpChat'].every(k => gyMemExList().includes(k));
  o.wd = !!(window.__gyPmW && window.__gyPmW.WD.gyHelp) && /问题|正常/.test(window.__gyPmW.WD.gyHelp.r({ size: 'm', d: {} }));
  gyTodaySet(true); gyTodayRender(); await sleep(100);
  o.today = /🛟 客服/.test((document.getElementById('gyToday') || document.getElementById('gyTodayM') || {}).innerText || '');
  return o;
});
check('「全部开关」里两个客服开关、小功能里有客服、今天里有客服、小手机小组件、记忆总览两项', r.sw && r.mini && r.mem && r.wd && r.today, JSON.stringify(r));

const bad = errs.filter(e => !/boom|other|Cannot read properties of null/.test(e));
check('没有别的页面报错', !bad.length, bad.join(' | '));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
