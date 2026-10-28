// v229：从 GitHub 同类项目挑来的 12 个新插件 + 平视改名
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
if (fs.existsSync(path.join(root, 'js', '90-bailu-cards.js'))) { console.log('（白露不测）'); process.exit(0); }
const PLUG = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
await page.route(/^https?:\/\/(?!x\.test)/, r => {
  const u = r.request().url();
  if (/60s\.viki\.moe\/v2\/weibo/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ code: 200, data: Array.from({ length: 12 }, (_, i) => ({ title: '测试热搜第' + (i + 1) + '条', hot_value: 1000 - i, link: 'https://s.weibo.com/' + i })) }) });
  return r.abort();
});
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ PLUG }) => {
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  const H = []; for (let i = 0; i < 60; i++) H.push({ sender: i % 2 ? 9991 : 'me', text: i % 3 ? '今天路过花店想起你了，买了一束向日葵' : '晚安呀，明天见，记得吃早饭', timestamp: Date.now() - (60 - i) * 864e5 / 2, readBy: [] });
  globalChats['9991'] = H; currentChatSessionId = '9991';
  window.__asks = [];
  const fake = async (api, p) => {
    const t = typeof p === 'string' ? p : JSON.stringify(p); window.__asks.push(t);
    let c = '好呀。';
    if (/开一场直播/.test(t)) c = '{"title":"深夜弹琴","scene":"台灯下的钢琴","open":"能听到吗"}';
    else if (/正在开直播/.test(t)) c = '{"ta":["看到你啦，小雨"],"dm":[{"who":"路过的猫","t":"主播偏心"},{"who":"柠檬","t":"前排"},{"who":"奶茶","t":"哈哈哈"}]}';
    else if (/起一个团名/.test(t)) c = '{"title":"雾港来信","hook":"一封没有署名的信"}';
    else if (/主持人/.test(t)) c = '{"gm":"你站在雾港的码头，潮水很冷。","ta":"","need":"d20","stat":"敏捷","dc":12,"hp":-2,"end":false}';
    else if (/攻略计划/.test(t)) c = '{"plan":["观察","偶遇","送花","约会","告白"],"note":"她嘴硬心软"}';
    else if (/出今天这一招/.test(t)) c = '{"t":"我在你楼下，带了热可可","kind":"小动作"}';
    else if (/走进了你的记忆里/.test(t)) c = '那天我其实很紧张。';
    else if (/刷到一条真实的热搜/.test(t)) c = '你看到这个了吗';
    else if (/管管她一句/.test(t)) c = '先去吃饭，听话。';
    else if (/语音信箱/.test(t)) c = '你在忙吧……那我晚点再打，记得吃饭。';
    else if (/通话记录里的备注/.test(t)) c = '聊了周末去看海';
    else if (/此刻真实的心情是哪一种/.test(t)) c = '{"m":"shy","why":"想你了"}';
    else if (/配一套气泡颜色/.test(t)) c = '{"n":"晚霞","me":"#ff9a8b","meFg":"#ffffff","ta":"#2b2f4a","taFg":"#ffffff","r":20,"line":"像那天的晚霞"}';
    else if (/导入了这些聊天主题/.test(t)) c = '{"i":0,"why":"这个颜色像你"}';
    else if (/会动的壁纸/.test(t)) c = '{"k":"snow","line":"今天冷，陪你看雪"}';
    return { choices: [{ message: { content: c } }] };
  };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.sendProactiveChatMessage = async () => true; try { sendProactiveChatMessage = window.sendProactiveChatMessage; } catch (e) {}
  PLUG.forEach(p => executePluginOnLoad(p));
}, { PLUG });
await page.waitForTimeout(3500);

const ALL = ['gyxTrpg', 'gyxWoo', 'gyxDive', 'gyxHot', 'gyxCare', 'gyxCallPlus', 'gyxMoodSkin', 'gyxBubble', 'gyxStTheme', 'gyxDayNight', 'gyxSwipe'];
const base = await page.evaluate(ALL => {
  const o = {};
  o.feats = ALL.filter(id => !(window.__gyxFeats || []).some(f => f.id === id));
  o.minis = ALL.map(id => id === 'gyxCallPlus' ? 'gyxCall' : id).filter(id => !GY_MINI_FEATURES.some(f => f.id === id));   // 10/28 来电增强和来电动画合成「📞 来电」（gyxCall）一个入口
  const acts = { gyxTrpg: 'gyx_trpg', gyxWoo: 'gyx_woo', gyxDive: 'gyx_dive', gyxHot: 'gyx_hot', gyxCare: 'gyx_care', gyxCallPlus: 'gyx_call_check', gyxMoodSkin: 'gyx_mood_skin', gyxBubble: 'gyx_bubble', gyxStTheme: 'gyx_st_theme', gyxDayNight: 'gyx_daynight' };
  o.acts = Object.values(acts).filter(k => !GY_AUTONOMY_ACTIONS.some(a => a.key === k));
  const W = window.__gyPmW.WD; o.wd = ['gyxTrpgW', 'gyxWooW', 'gyxDiveW', 'gyxHotW', 'gyxCareW', 'gyxCallPlusW', 'gyxMoodSkinW', 'gyxBubbleW', 'gyxStThemeW', 'gyxDayNightW'].filter(k => !W[k]);
  o.mem = ['gyxTrpg', 'gyxWoo', 'gyxDive', 'gyxHot', 'gyxCare', 'gyxCallSum', 'gyxCallVm', 'gyxMoodSkin', 'gyxBubble', 'gyxStTheme', 'gyxDayNight'].filter(k => !gyMemExList().includes(k));
  o.fair = (window.__gyxFeats.find(f => f.id === 'gyxFair') || {}).n;
  o.hubs = ['hub_look'].every(id => GY_MINI_FEATURES.some(f => f.id === id)) || !!document.querySelector('#setIndex [data-gyhub]');
  return o;
}, ALL);
check('12 个新插件都有：开关、小功能入口、自主行动（跟手返回除外）、小手机小组件、记忆总览', !base.feats.length && !base.minis.length && !base.acts.length && !base.wd.length && !base.mem.length, JSON.stringify(base));
check('「别把她写弱」改名叫「🛡️ 平视」', base.fair === '🛡️ 平视', base.fair);

const r1 = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}; const c = myCharacters.find(x => x.id === 9991);
  // 直播：256 起并进了 📱 软件 → 🎶 抖音（v257 测）
  // 跑团
  gyxTrpgOpen(null, '9991'); await s(50); await gyxTrpgNew('9991'); await s(50);
  const R = gyxTrpgData().runs[0]; o.trpg = R.title === '雾港来信' && R.need === 'd20' && R.stat === '敏捷' && R.me.hp === R.me.max - 2;
  document.getElementById('gyxTpIn').value = '我往仓库那边跑'; await gyxTrpgRoll(R.id); await s(50);
  o.roll = R.log.some(x => x.who === 'me' && /d20=/.test(x.roll || '')) && /掷了 d20/.test(__asks[__asks.length - 1]);
  o.game = (typeof registeredMiniGames !== 'undefined' ? registeredMiniGames : []).some(g => g.id === 'gyxTrpg');
  document.getElementById('gyxTpOv')?.remove();
  // 反向攻略
  const m = await gyxWooMove('9991'); await s(50); o.woo = !!m && /热可可/.test(m.t);
  await gyxWooAnswer('9991', m.id, 'yes'); const st = gyxWooData().by['9991']; o.wooYes = st.prog === 18 && st.step === 1 && !!st.moves[0].re;
  document.getElementById('gyxWoOv')?.remove();
  // 记忆潜行
  const D = await gyxDiveNew('9991', 'all'); await s(100);
  o.dive = !!D && D.frags.length >= 2 && !!document.getElementById('gyxDvCv');
  const f = D.frags[0]; D.me = { x: f.x - 1 >= 1 && !D.map[f.y][f.x - 1] ? f.x - 1 : f.x + 1, y: f.y }; D.map[f.y][D.me.x] = 0;
  gyxDiveMove(f.x - D.me.x, 0); await s(150); o.frag = !!f.got && /紧张/.test(f.c || '') && /紧张/.test(document.getElementById('gyxDvTop').innerText);
  document.getElementById('gyxDvOv')?.remove();
  return o;
});
check('🎲 跑团：开团（属性、血量、要掷 d20 敏捷）→ 掷骰判定带上修正 → 也进了聊天 🎮', r1.trpg && r1.roll && r1.game, JSON.stringify(r1));
check('🎯 反向攻略：TA 出一招 → 你接招，进度 +18、计划往下走、TA 有反应', r1.woo && r1.wooYes, JSON.stringify(r1));
check('🕹️ 记忆潜行：从聊天里挑出碎片铺到像素地图上，走过去捡起来，上屏放出那句话和 TA 的感受', r1.dive && r1.frag, JSON.stringify(r1));

const r2 = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}; const c = myCharacters.find(x => x.id === 9991);
  // 热搜
  await gyxHotOpen('9991'); await s(200);
  o.hot = (gyxHotData().lists.weibo || {}).items?.length === 12 && /测试热搜第1条/.test(document.getElementById('gyxHtOv').innerText);
  o.hotCtx = /真实热搜/.test(window.__gyxCtxFor('9991'));
  o.parse = gyxHotParse({ result: { list: [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }, { name: 'e' }] } }).length === 5;
  document.getElementById('gyxHtOv')?.remove();
  // 反向养成：聊天里说的话会记上
  const before = gyxCareData().v.food; globalChats['9991'].push({ sender: 'me', text: '刚吃完饭，好饱', timestamp: Date.now() + 5, readBy: [] }); gyxCareScan(); await s(50);
  o.care = gyxCareData().v.food > before && /吃完/.test(gyxCareData().log[0].why);
  gyxCareData().v.mood = 10; o.careAct = !!GY_AUTONOMY_ACTIONS.find(a => a.key === 'gyx_care').need(c);
  // 来电增强：拒接理由、没接留言、通话小结
  gyCallRing(c, '想你'); await s(600);
  o.why = !!document.querySelector('#gyCallIncoming .cp-why');
  gyxCallWhy(0); await s(300);
  const H = globalChats['9991']; o.whyMsg = H.some(m => /挂断了你的电话：在开会/.test(m.text || '')) && H.some(m => m.callMissed);
  await gyxCallPlusScan(); await s(100); o.vm = gyxCallPlusData().vm.length === 1 && H.some(m => /语音留言/.test(m.text || ''));
  // 情绪皮肤
  switchMainView('chat'); try { openChat('9991'); } catch (e) {} await s(300);
  globalChats['9991'].push({ sender: 9991, text: '哼，你都不理我，我生气了', timestamp: Date.now() + 10, readBy: [] });
  await s(1700); o.mood = gyxMoodSkinMood('9991') === 'angry' && document.body.classList.contains('gyx-ms-angry') && !!document.getElementById('gyxMsFx');
  return o;
});
check('🔥 真实热搜：联网拉到热搜（接口长什么样都能认）、面板列出来、TA 的提示词里知道', r2.hot && r2.hotCtx && r2.parse, JSON.stringify(r2));
check('🍙 反向养成：你说「吃完饭」饱腹就涨；心情太低 TA 会来管你', r2.care && r2.careAct, JSON.stringify(r2));
check('📞 来电增强：来电时能挑理由挂断（聊天里记下理由）；没接 TA 留语音留言', r2.why && r2.whyMsg && r2.vm, JSON.stringify(r2));
check('🌈 情绪皮肤：TA 说「我生气了」，聊天界面变成生气的样子', r2.mood, JSON.stringify(r2));

const r3 = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}; const c = myCharacters.find(x => x.id === 9991);
  // 气泡工坊
  gyxBubblePre('cream'); await s(50); o.prev = !!document.getElementById('gyxBwPrev') && /ffd8a8/.test(document.getElementById('gyxBwPrevCss').textContent);
  gyxBubbleSet('me.r', 6); await gyxBubbleSave(true); await s(1400);
  const b = document.querySelector('#view-chat .chat-bubble.me'); o.live = !!b && getComputedStyle(b).borderRadius === '6px';
  const t = await gyxBubbleTa('9991'); o.ta = t.n === '晚霞' && gyxBubbleData().per['9991'] === t.id;
  document.getElementById('gyxBwOv')?.remove();
  // 酒馆主题
  const th = await gyxStThemeAdd({ name: '樱花', main_text_color: 'rgb(60, 20, 40)', chat_tint_color: 'rgba(255, 230, 240, 0.9)', user_mes_blur_tint_color: 'rgba(255, 180, 200, 0.8)', bot_mes_blur_tint_color: 'rgba(255, 255, 255, 0.8)', italics_text_color: 'rgb(200, 80, 120)', font_scale: 1.1, avatar_style: 1, custom_css: "body{background:url('https://x.test/bg.jpg')}" });
  await gyxStThemeUse(th.id); await s(100); o.st = /rgba\(255, 180, 200, 0.8\)/.test(gyxStThemeCss()) && th.bg === 'https://x.test/bg.jpg' && /16\.5px/.test(gyxStThemeCss());
  o.stBad = (await gyxStThemeAdd({ foo: 1 })) === null;
  document.getElementById('gyxStOv')?.remove();
  // 日夜 + 动态壁纸
  const D = gyxDayNightData(); D.mode = 'time'; D.from = 0; D.to = 0; D.last = ''; D.fx = 'snow'; D.where = 'both'; gyxDayNightTick(); await s(100);
  o.fx = !!document.querySelector('#gyxDnApp.dn-snow i');
  D.fx = 'auto'; D.fxDay = 'cloud'; D.fxNight = 'stars'; D.weather = false; D.from = 0; D.to = 24; D.last = ''; gyxDayNightTick(); await s(100);
  o.night = gyxDayNightNow().night === true && gyxDayNightNow().fx === 'stars' && darkTheme === true;
  D.fx = ''; D.mode = 'off'; gyxDayNightTick();
  // 跟手返回
  o.swipe = typeof window.gyxSwipeOpen === 'function' && /gyx-sw-drag/.test(document.getElementById('gyxSwpCss').textContent);
  return o;
});
check('🫧 气泡工坊：从「奶油」改、预览、存好用上后聊天气泡真的变了；TA 能给某个角色配一套', r3.prev && r3.live && r3.ta, JSON.stringify(r3));
check('🎨 导入酒馆主题：颜色 / 字号 / 头像照着换，custom_css 里的背景图挑出来；不是主题的 JSON 不收', r3.st && r3.stBad, JSON.stringify(r3));
check('🌗 日夜主题：到点切深色、会动的壁纸（飘雪 / 晚上星空）', r3.fx && r3.night, JSON.stringify(r3));

// 跟手返回：真的拖一下
await page.evaluate(() => { gyxSwipeOpen(); });
await page.waitForTimeout(300);
const sw = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms));
  const T = (type, x, y) => { const t = new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y }); window.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true })); };
  T('touchstart', 5, 400); T('touchmove', 40, 402); T('touchmove', 120, 404); const box = document.querySelector('#gyxSwpOv .gyx-box'); const mid = box && /translateX\(1[01]\dpx\)/.test(box.style.transform);
  T('touchmove', 260, 405); T('touchend', 260, 405); await s(400);
  return { mid, gone: !document.getElementById('gyxSwpOv') || getComputedStyle(document.getElementById('gyxSwpOv')).display === 'none' };
});
check('👉 跟手返回：从左边缘拖，弹窗跟着手指走，拖够了松手就关掉', sw.mid && sw.gone, JSON.stringify(sw));

const bad = errs.filter(e => !/x\.test|Failed to fetch|NetworkError/.test(e));
check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
