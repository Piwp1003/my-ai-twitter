// v233：🎁 TA的秘密计划、🌱 TA被你影响、📮 现实小任务、🕯️ 一起安静待着、🔁 我们的小习惯、📤 角标和分享
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
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ PLUG }) => {
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师', worldbooks: [], diaryData: { letters: [{ title: '第一封', content: '见字如面，今天很想你。' }], diaries: [] } });
  const D0 = Date.now(), H = [];
  // 过去 8 天每晚 23:00 左右说晚安；还有一堆关于猫的话
  for (let i = 1; i <= 8; i++) { const d = new Date(D0 - i * 864e5); d.setHours(23, 5, 0, 0); H.push({ sender: 'me', text: '晚安啦', timestamp: d.getTime(), readBy: [] }); }
  for (let i = 0; i < 18; i++) H.push({ sender: 'me', text: i % 2 ? '今天又看到一只橘猫，好可爱' : '我好想养猫啊，猫猫真的太治愈了', timestamp: D0 - (20 - i) * 36e5, readBy: [] });
  H.push({ sender: 9991, text: '你今天过得怎么样？我一直在想你。', timestamp: D0 - 6e4, readBy: [] });
  H.sort((a, b) => a.timestamp - b.timestamp); globalChats['9991'] = H; currentChatSessionId = '9991';
  const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); let c = '嗯。';
    if (/偷偷为她学一样东西/.test(t)) c = '{"what":"学弹吉他","why":"她说过喜欢听吉他","days":14}';
    else if (/这 14 天你一直在偷偷/.test(t)) c = '{"result":"弹会了她最喜欢的那首歌","letter":"手指磨破了好几次，但想到你会笑就值了。"}';
    else if (/她现在猜/.test(t)) c = /吉他/.test(t.split('她现在猜')[1] || '') ? '{"hit":true,"line":"……你怎么知道的？！"}' : '{"hit":false,"line":"不是哦，再猜猜"}';
    else if (/会让你（按你的性格）也慢慢感兴趣/.test(t)) c = '{"new":{"what":"猫","from":"她天天说橘猫可爱"},"grow":[]}';
    else if (/派一个现实生活里的小任务/.test(t)) c = '拍一朵黄色的花';
    else if (/拍了这张照片来交差/.test(t)) c = '{"ok":true,"line":"好黄的花，跟你一样亮。","saw":"一朵黄花"}';
    else if (/安静地待在一起/.test(t)) c = '（翻了一页书）';
    else if (/做成一张小卡片送她/.test(t)) c = '{"text":"今天也很喜欢你","say":"送你的"}';
    return { choices: [{ message: { content: c } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.callChatCompletionAPI = async (api, p) => fake(api, p); try { callChatCompletionAPI = window.callChatCompletionAPI; } catch (e) {}
  window.__reach = []; window.sendProactiveChatMessage = async c => { window.__reach.push(window.__gyxNudgeFor(c.id)); globalChats[String(c.id)].push({ sender: c.id, text: '最近手指有点疼……没事啦', timestamp: Date.now(), readBy: [] }); }; try { sendProactiveChatMessage = window.sendProactiveChatMessage; } catch (e) {}
  PLUG.forEach(p => executePluginOnLoad(p)); GYX.set('gyxHot', false);
}, { PLUG });
await page.waitForTimeout(3500);

const base = await page.evaluate(() => {
  const ids = ['gyxPlan', 'gyxInfl', 'gyxMis', 'gyxStill', 'gyxRitual', 'gyxPing'];
  return { feats: ids.filter(id => !GYX.FEATS.some(f => f.id === id)), acts: ['gyx_plan_start', 'gyx_plan_leak', 'gyx_plan_reveal', 'gyx_infl_scan', 'gyx_infl_share', 'gyx_mission', 'gyx_still', 'gyx_ritual', 'gyx_ping_card'].filter(k => !GY_AUTONOMY_ACTIONS.some(a => a.key === k)),
    w: ['gyxPlanW', 'gyxInflW', 'gyxMisW', 'gyxStillW', 'gyxRitW', 'gyxPingW'].filter(k => !window.__gyPmW.WD[k]), mem: ids.filter(k => !gyMemExList().includes(k)),
    hub: (() => { const t = JSON.stringify(window.GY_HUB_FOLDERS || window.__gyHubFolders || ''); return t; })().length > 0 };
});
check('六个新插件都有开关、自主行动、小组件、记忆总览', !base.feats.length && !base.acts.length && !base.w.length && !base.mem.length, JSON.stringify(base));

const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}, c = myCharacters.find(x => x.id === 9991);
  // 🎁 秘密计划
  await gyxPlanStart('9991'); const P = gyxPlanData().plans[0]; o.plan = P && P.what === '学弹吉他' && /gyxPlanOv/.test(document.body.innerHTML) && !/学弹吉他/.test(document.getElementById('gyxPlanOv').innerText);
  o.ctx = /偷偷「学弹吉他」/.test(__gyxCtxFor('9991'));
  const leak = GY_AUTONOMY_ACTIONS.find(a => a.key === 'gyx_plan_leak'); o.leakNeed = leak.need(c); await leak.run(c); o.hint = P.hints.length === 1 && /破绽/.test(window.__reach.slice(-1)[0]);
  document.getElementById('gyxPlGuess').value = '你在学吉他吧'; await gyxPlanGuess('9991'); o.guess = P.guesses[0].hit;
  P.start = Date.now() - 15 * 864e5; const rv = GY_AUTONOMY_ACTIONS.find(a => a.key === 'gyx_plan_reveal'); o.revNeed = rv.need(c); await rv.run(c); o.reveal = P.done && /手指磨破/.test(P.letter);
  document.getElementById('gyxPlanOv')?.remove();
  // 🌱 被你影响
  await gyxInflScan('9991'); const I = gyxInflData().list[0]; o.infl = I && I.what === '猫' && I.lv === 1 && /因为她，你开始喜欢/.test(__gyxCtxFor('9991'));
  await gyxInflShare('9991'); o.inflShare = I.seen.length === 1;
  document.getElementById('gyxInflOv')?.remove();
  // 📮 小任务
  await gyxMisGive('9991'); const M = gyxMisData().list[0]; o.mis = M && M.text === '拍一朵黄色的花' && globalChats['9991'].some(m => /拍一朵黄色的花/.test(m.text)) && gyxMissionNow() === '拍一朵黄色的花';
  const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40; cv.getContext('2d').fillStyle = '#ff0'; cv.getContext('2d').fillRect(0, 0, 40, 40);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')); const dt = new DataTransfer(); dt.items.add(new File([blob], 'a.png', { type: 'image/png' }));
  const inp = document.createElement('input'); inp.type = 'file'; inp.files = dt.files; await gyxMisSubmit(M.id, inp); await s(200);
  o.misDone = M.done && /黄的花/.test(M.line) && M.saw === '一朵黄花' && /^data:image\/jpeg/.test(M.photo) && document.querySelectorAll('#gyxMisOv .ms-i img').length === 1;
  document.getElementById('gyxMisOv')?.remove();
  // 🕯️ 安静待着
  gyxStillStart('9991'); await s(100); o.still = !!gyxStillLive() && !!gyxStillLive().ac; await gyxStillSay(); o.murmur = gyxStillLive().lines[0].t === '（翻了一页书）';
  o.stillCtx = /安静地待在一起/.test(__gyxCtxFor('9991'));
  gyxStillLive().start -= 12 * 60000; await gyxStillStop(); o.stillLog = gyxStillData().log.length === 1 && !gyxStillLive();
  document.getElementById('gyxStillOv')?.remove();
  // 🔁 小习惯
  await gyxRitScan('9991'); const RT = gyxRitData().list.find(x => x.cid === '9991' && /晚安/.test(x.name)); o.rit = !!RT && RT.h === 23 && RT.wd === -1;
  // 今天 23:59 还没说晚安：假装现在很晚
  const RD = Date, T = new RD(); T.setHours(23, 59, 0, 0); window.__t0 = RD.now(); const TT = T.getTime();
  class FD extends RD { constructor(...a) { if (!a.length) super(TT + (RD.now() - window.__t0)); else super(...a); } static now() { return TT + (RD.now() - window.__t0); } }
  window.Date = FD; try { o.missed = gyxRitMissed('9991').length === 1; const A = GY_AUTONOMY_ACTIONS.find(a => a.key === 'gyx_ritual'); o.ritNeed = A.need(c); await A.run(c); o.ritReach = /今天到点了她还没有/.test(window.__reach.slice(-1)[0]); } finally { window.Date = RD; }
  document.getElementById('gyxRitOv')?.remove();
  // 📤 角标和分享
  gyxPingOpen('9991'); await s(100); o.src = document.querySelectorAll('#gyxPingOv .pg-r').length >= 4;
  o.srcKinds = /见字如面/.test(document.getElementById('gyxPingOv').innerText) && /手指磨破/.test(document.getElementById('gyxPingOv').innerText);
  const sh = await gyxShareCard({ cid: '9991', text: '今天也很喜欢你', by: 'Leon' }); o.share = (sh === 'download' || sh === 'share') && gyxPingData().cards.length === 1;
  currentChatSessionId = null; globalChats['9991'].push({ sender: 9991, text: '在吗', timestamp: Date.now(), readBy: [] }); o.unread = gyxPingUnread() >= 1; currentChatSessionId = '9991';
  await gyxPingGift('9991'); const last = globalChats['9991'].slice(-1)[0]; o.gift = /^data:image\/jpeg/.test(last.mediaUrl || '') && gyxPingData().cards[0].fromTa;
  o.chatAct = (window.GY_CHAT_ACTIONS || []).some(x => x.id === 'gyxPing');
  document.getElementById('gyxPingOv')?.remove();
  // 散步里能看到小任务（交差了就没有了；再派一个）
  await gyxMisGive('9991'); gyxWalkStart('9991', false); await s(300); o.walkMis = /路上的小任务/.test(document.getElementById('gyxWkLive').innerText); await gyxWalkStop(); document.getElementById('gyxWalkOv')?.remove();
  // 今天面板
  gyTodaySet(true); gyTodayRender(); await s(200); const tt = document.body.innerText; o.today = ['🎁 秘密', '🌱 被你影响', '📮 小任务', '🕯️ 安静待着', '📤 分享'].filter(w => !tt.includes(w));
  return o;
});
check('🎁 秘密计划：TA 起意（你看不到是什么），会漏破绽，你能猜，到日子揭晓信和成果', r.plan && r.ctx && r.leakNeed && r.hint && r.guess && r.revNeed && r.reveal, JSON.stringify(r));
check('🌱 被你影响：常聊猫 → TA 开始对猫好奇，进提示词，会来跟你聊', r.infl && r.inflShare, JSON.stringify(r));
check('📮 现实小任务：TA 派任务，拍照交差 TA 看图回应，照片进「一起看过的世界」；散步时会提醒', r.mis && r.misDone && r.walkMis, JSON.stringify(r));
check('🕯️ 一起安静待着：环境音合成、TA 轻轻说一句、结束留记录', r.still && r.murmur && r.stillCtx && r.stillLog, JSON.stringify(r));
check('🔁 小习惯：从聊天里认出每晚 23 点的晚安；今天到点没说，TA 注意到', r.rit && r.missed && r.ritNeed && r.ritReach, JSON.stringify(r));
check('📤 角标和分享：未读计数、信 / TA 的话 / 秘密计划的信能做成卡片分享，TA 也会做卡片送你，聊天 ⋮ 里有入口', r.src && r.srcKinds && r.share && r.unread && r.gift && r.chatAct, JSON.stringify(r));
check('「今天」面板都有对应的一节', !r.today.length, JSON.stringify(r.today));

const bad = errs.filter(e => !/x\.test|Failed to fetch/.test(e));
check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
