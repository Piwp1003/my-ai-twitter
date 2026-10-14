// v232：🚶 陪你散步加计步 + 邀请卡（TA 约你 / 你约 TA）+ 挂进「约出去」；🗓️ 日程自动更新改成"只从打开之后开始"+ 一键补齐
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
await page.addInitScript(() => { window.ontouchstart = null; });
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ PLUG }) => {
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  myCharacters.push({ id: 9992, name: 'Mia', persona: '画家', worldbooks: [], diaryData: { letters: [], diaries: [] }, schedule: { text: '8:00 起床', generatedAt: Date.now() - 3 * 864e5 } });
  myCharacters.push({ id: 9993, name: 'Ken', persona: '厨师', worldbooks: [], diaryData: { letters: [], diaries: [] }, schedule: { text: '9:00 开店', generatedAt: Date.now() - 2 * 864e5 } });
  globalChats['9991'] = [{ sender: 'me', text: '在吗', timestamp: Date.now() - 6e4 }]; currentChatSessionId = '9991';
  const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); let c = '好呀。';
    if (/约你一起出去走走|想约你一起出去走走/.test(t)) c = '{"ok": true, "line": "走，我陪你。"}';
    else if (/开口约她/.test(t)) c = '下楼走走？我陪你。'; else if (/散步日记/.test(t)) c = '今天陪你走了好多步。';
    return { choices: [{ message: { content: c } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.callChatCompletionAPI = fake; try { callChatCompletionAPI = fake; } catch (e) {}
  window.__gen = []; try { runScheduleGeneration = async (id) => { window.__gen.push(String(id)); const c = myCharacters.find(x => String(x.id) === String(id)); c.schedule = { text: '新的一天', generatedAt: Date.now() }; }; } catch (e) {}
  PLUG.forEach(p => executePluginOnLoad(p)); GYX.set('gyxHot', false);
}, { PLUG });
await page.waitForTimeout(3000);

// 🗓️ 日程
const sc = await page.evaluate(async () => {
  const o = {}; window.__gen = [];
  delete autoFeatureSwitches.scheduleAutoRenew; delete autoFeatureSwitches.__schedRenewSince;
  o.defOff = !isAutoOn('scheduleAutoRenew');
  await checkAndRenewStaleSchedules(); o.offNoGen = window.__gen.length === 0;
  setAutoFeature('scheduleAutoRenew', true, true); o.since = !!autoFeatureSwitches.__schedRenewSince;
  await checkAndRenewStaleSchedules(); o.sameDayNoGen = window.__gen.length === 0;
  autoFeatureSwitches.__schedRenewSince = Date.now() - 864e5;
  await checkAndRenewStaleSchedules(); o.nextDay = window.__gen.length; o.capped = window.__gen.length <= 3;
  setAutoFeature('scheduleAutoRenew', false, true); o.offClears = !autoFeatureSwitches.__schedRenewSince;
  // 一键补齐
  myCharacters.find(x => x.id === 9992).schedule.generatedAt = Date.now() - 5 * 864e5; window.__gen = [];
  o.need = gyScheduleNeedFill(true).map(c => c.name);
  gyTodaySet(true); gyTodayRender(); await new Promise(r => setTimeout(r, 200));
  o.todayBtn = /日程还停在之前/.test(document.body.innerText);
  await gyScheduleFillNow(null, true); o.filled = window.__gen.includes('9992') && !gyScheduleNeedFill(true).length;
  o.memBtn = !!document.querySelector('button[onclick^="gyScheduleFillNow"]');
  return o;
});
check('🗓️ 日程自动更新默认关：没打开就一次都不生成', sc.defOff && sc.offNoGen, JSON.stringify(sc));
check('🗓️ 打开当天不补，从第二天起才续（每轮最多 3 个），关掉重开重新起算', sc.since && sc.sameDayNoGen && sc.nextDay > 0 && sc.capped && sc.offClears, JSON.stringify(sc));
check('🗓️ 一键补齐：今天面板和记忆总览都有按钮，点了就把过期的补上', sc.todayBtn && sc.filled && sc.memBtn, JSON.stringify(sc));

// 🚶 计步
const wk = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  gyxWalkCfg('stepTalk', 3);
  gyxWalkStart('9991', true); await s(300);
  const fire = z => window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: 0, y: 0, z } }));
  for (let i = 0; i < 10; i++) { fire(9.8); await s(20); }
  for (let k = 0; k < 6; k++) { fire(14); await s(20); fire(14); await s(40); fire(9.8); await s(30); fire(9.8); await s(30); fire(9.8); await s(200); }
  await s(500);
  o.liveTxt = (document.getElementById('gyxWkLive') || {}).innerText || '';
  o.talks = gyxWalkData ? 0 : 0;
  await gyxWalkStop(); await s(300);
  const w = gyxWalkData().walks[0]; o.steps = w.steps; o.dist = w.dist; o.diary = w.diary; o.talkN = w.talk.length;
  gyTodayRender(); await s(200); o.today = /👣/.test(document.body.innerText);
  return o;
});
check('🚶 计步：运动传感器的每个峰算一步，没定位时按步长估距离，每 N 步 TA 说一句', wk.steps >= 5 && wk.steps <= 7 && wk.dist > 3 && wk.talkN >= 2 && /👣/.test(wk.liveTxt), JSON.stringify(wk));

// 📨 邀请卡
const iv = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  document.querySelectorAll('#gyxWalkOv').forEach(e => e.remove());
  o.kind = !!(GY_INVITE_KINDS && GY_INVITE_KINDS.walk);
  o.act = GY_AUTONOMY_ACTIONS.some(a => a.key === 'gyx_walk');
  const inv = await gyxWalkCharInvite('9991'); await s(200);
  const msgs = globalChats['9991']; o.card = msgs.some(m => m.invite && m.invite.kind === 'walk' && m.invite.from === 'char');
  o.line = msgs.some(m => /下楼走走/.test(m.text || ''));
  await gyInviteAnswer(inv.id, true); await s(300);
  o.opened = !!document.getElementById('gyxWalkOv');
  document.querySelectorAll('#gyxWalkOv').forEach(e => e.remove());
  await gyxWalkInvite('9991'); await s(400);
  o.myCard = globalChats['9991'].some(m => m.invite && m.invite.kind === 'walk' && m.invite.from === 'me');
  o.started = /散步中|到家了/.test(document.body.innerText);
  await gyxWalkStop(); await s(200);
  document.querySelectorAll('#gyxWalkOv').forEach(e => e.remove());
  // 约出去页
  gymapOpen(); await s(200); gymapTab('date'); await s(200);
  o.map = /出去走走（陪你散步）/.test(document.body.innerText);
  try { gymapClose(); } catch (e) {}
  return o;
});
check('📨 TA 约你散步：私聊里先说一句再发一张邀请卡，点「好啊」打开散步页', iv.kind && iv.act && iv.card && iv.line && iv.opened, JSON.stringify(iv));
check('📨 你约 TA 散步：发卡，TA 答应就直接出门', iv.myCard && iv.started, JSON.stringify(iv));
check('🗺️ 「行程与天气 → 🤝 约出去」页里有「出去走走」', iv.map, JSON.stringify(iv));

const gd = await page.evaluate(async () => { const o = {}; gyGuideOpen(); await new Promise(r => setTimeout(r, 200)); const t = document.getElementById('gyGuideOv').innerText; document.getElementById('gyGuideOv').remove();
  o.has = ['计步', '一键补齐', '约 TA 去散步'].filter(w => !t.includes(w)); o.q = ['步数在哪看', '日程怎么补齐', '日程一口气全更新了'].map(q => (gyGuideSearchApi(q)[0] || {}).id); return o; });
check('📘 指南和客服跟上：计步散步、日程一键补齐都写进去了，客服搜得到', !gd.has.length && JSON.stringify(gd.q) === '["walk","sched","sched"]', JSON.stringify(gd));

const bad = errs.filter(e => !/x\.test|Failed to fetch/.test(e));
check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
