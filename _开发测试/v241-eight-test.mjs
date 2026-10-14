// v236：TA被困了 / 你打了又删 / 你让TA重说了 / 准点群聊 / TA的旧物箱 / 窗台来客 / 心电感应光谱 / TA的录像带
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path'; import fs from 'fs';
const root = process.cwd();
const PLUG = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ PLUG }) => {
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  [[9991, 'Leon', '法国摄影师'], [9992, 'Ken', '厨师'], [9993, 'Mia', '画家']].forEach(([id, n, p]) => myCharacters.push({ id, name: n, persona: p, worldbooks: [] }));
  groupChats.push({ id: 'g_t1', name: '三人行', members: [9991, 9992, 9993], speakOrder: 'all' });
  window.__prompts = []; window.__reach = [];
  const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); window.__prompts.push(t); let c = '嗯。';
    if (/被困住了，需要她/.test(t)) c = JSON.stringify({ title: '困在电梯里', setting: '公司电梯停电卡在12楼', goal: '安全出去', msgs: ['电梯卡住了', '好黑'], choices: [{ t: '按紧急按钮', r: -1 }, { t: '扒门试试', r: 2 }] });
    else if (/你决定照她说的做/.test(t)) c = JSON.stringify({ now: ['好，我按了'], wait: 30, later: ['有人回应了！说十分钟到'], choices: [{ t: '保持冷静', r: -1 }, { t: '再扒一下门', r: 2 }], end: null });
    else if (/准点群聊」时间/.test(t)) c = JSON.stringify({ topic: '晚饭吃什么', lines: [{ who: 'Leon', text: '准点！' }, { who: 'Ken', text: '我做了红烧肉' }, { who: 'Mia', text: '馋了' }, { who: 'Leon', text: '@她 来不来' }] });
    else if (/准点群聊她没来/.test(t)) c = '又没来！';
    else if (/有一箱旧东西/.test(t)) c = JSON.stringify({ items: [{ e: '🎫', n: '电影票根', story: '第一次一个人看电影', spot: '抽屉里', yes: '对！', no: '也行吧' }, { e: '☕', n: '搪瓷杯', story: '我妈的杯子', spot: '书桌', yes: '就是那儿', no: '嗯？' }, { e: '📷', n: '旧相机', story: '毕业那天坏的', spot: '书架', yes: '懂我', no: '好吧' }] });
    else if (/在窗台上放了/.test(t)) c = '{"gift":"🪶 一根羽毛","note":"脚印一串"}';
    else if (/你心里的位置是/.test(t)) c = '夏天的柏油路';
    else if (/给你的提示是/.test(t)) c = '{"g":80,"why":"听起来很热"}';
    else if (/旧录像带档案/.test(t)) c = JSON.stringify({ title: '雨天', truth: '他很早就在书店见过你', first: '书店', clips: [{ d: '2021', p: '书店', t: '今天书店来了个女生，在诗集那排', key: true }, { d: '2021', p: '家', t: '那本诗集第37页', key: true }, { d: '2022', p: '公交站', t: '下雨，把伞放下就跑', key: true }, { d: '2023', p: '咖啡馆', t: '朋友问我为什么总去书店', key: false }, { d: '2020', p: '学校', t: '毕业了', key: false }, { d: '2024', p: '家', t: '第37页还在，她不记得了吧', key: true }] });
    else if (/她看完以后说她的答案/.test(t)) c = '{"ok":true,"line":"被你看穿了"}';
    return { choices: [{ message: { content: c } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.sendProactiveChatMessage = async c => { window.__reach.push([c.id, window.__gyxNudgeFor(c.id)]); }; try { sendProactiveChatMessage = window.sendProactiveChatMessage; } catch (e) {}
  PLUG.forEach(p => executePluginOnLoad(p));
}, { PLUG });
await page.waitForTimeout(3500);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}; const ids = ['gyxStuck', 'gyxErase', 'gyxRegen', 'gyxOnTime', 'gyxBox', 'gyxSill', 'gyxWave', 'gyxTapes'];
  o.base = ids.every(id => GYX.FEATS.some(f => f.id === id) && GY_MINI_FEATURES.some(f => f.id === id)) && ['gyx_stuck', 'gyx_erase_ask', 'gyx_regen_talk', 'gyx_ontime_call', 'gyx_box_find', 'gyx_sill_visit', 'gyx_wave', 'gyx_tapes_send'].every(k => GY_AUTONOMY_ACTIONS.some(a => a.key === k));
  o.games = ['gyxStuck', 'gyxWave'].every(id => registeredMiniGames.some(g => g.id === id));
  const L = myCharacters.find(c => c.id === 9991);
  // 🆘
  gyxStuckData().speed = 'real'; await gyxStuckStart(9991); const run = gyxStuckData().runs[0];
  o.stuck1 = run && run.title === '困在电梯里' && globalChats['9991'].some(m => m.text === '电梯卡住了') && run.choices.length === 2;
  gyxStuckPick(run.id, 0); await s(300); o.stuckWait = run.pending && run.nextAt > Date.now() + 20 * 60000 && globalChats['9991'].some(m => m.sender === 'me' && m.text === '按紧急按钮') && globalChats['9991'].some(m => m.text === '好，我按了');
  gyxStuckSkip(run.id); await s(200); o.stuckLater = globalChats['9991'].some(m => /十分钟到/.test(m.text)) && run.choices.length === 2 && /你被困住了/.test(__gyxCtxFor('9991'));
  document.getElementById('gyxStuckOv')?.remove();
  // ⌨️
  currentChatSessionId = '9991'; const inp = document.getElementById('chatInput');
  gyxEraseData().cfg.rate = 'high'; Math.random0 = Math.random; Math.random = () => 0.01;
  inp.value = '其实我今天有点想你'; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true }));
  await s(1800); Math.random = Math.random0; const er = gyxEraseData().list[0];
  o.erase = er && er.text === '其实我今天有点想你' && er.noticed;
  window.__reach = []; await GY_AUTONOMY_ACTIONS.find(a => a.key === 'gyx_erase_ask').run(L); o.eraseAsk = window.__reach.length && /正在输入/.test(window.__reach[0][1]) && !/有点想你/.test(window.__reach[0][1]);
  // 🔁
  globalChats['9992'] = [{ sender: 'me', text: '在吗', timestamp: Date.now() - 2000 }, { sender: 9992, text: '在，刚下班', timestamp: Date.now() - 1000 }];
  currentChatSessionId = '9992'; gyxRegenData().cfg.rate = 'high'; gyxRegenData().cfg.need = 2;
  window.__seen = []; window.callChatCompletionAPI = async (api, p) => { window.__seen.push(JSON.stringify(p)); return { choices: [{ message: { content: '{"replies":["好吧换个说法"]}' } }] }; }; try { callChatCompletionAPI = window.callChatCompletionAPI; } catch (e) {}
  Math.random = () => 0.01;
  chatContextMenuMsgIdx = 1; await contextActionRegenerateChat(); chatContextMenuMsgIdx = 1; await contextActionRegenerateChat(); Math.random = Math.random0;
  o.regen = window.__seen.length === 2 && !/她让你重说了/.test(window.__seen[0]) && /她让你重说了/.test(window.__seen[1]) && gyxRegenData().log.length === 1 && Object.keys(gyxRegenNote()).length === 0;
  // ⏰
  gyxOnTimeData().cfg.gids = ['g_t1']; await gyxOnTimeNow(); const ev = gyxOnTimeData().ev[0];
  o.ontime = ev && ev.topic === '晚饭吃什么' && ev.lines.length === 4 && globalChats['g_t1'] && globalChats['g_t1'].some(m => m.text === '准点！');
  currentChatSessionId = 'g_t1'; try { await sendChatMessage(); } catch (e) {} o.join = ev.joined;
  const ev2 = { id: 'otx', gid: 'g_t1', gname: '三人行', day: '2020-01-01', time: '12:30', start: Date.now() - 40 * 60000, end: Date.now() - 20 * 60000, topic: '午饭', lines: [{ cid: '9992', text: '吃了吗', at: Date.now() - 39 * 60000 }], joined: false };
  gyxOnTimeData().ev.unshift(ev2); gyxOnTimeTick(); await s(300); o.miss = ev2.closed && globalChats['g_t1'].some(m => m.text === '又没来！') && /准点群聊她没来/.test(__gyxCtxFor('9992'));
  document.getElementById('gyxOnTimeOv')?.remove();
  // 📦
  await gyxBoxNew(9991); const bx = gyxBoxData().boxes[0]; gyxBoxPeek(bx.id, 0); await gyxBoxPut(bx.id, 0, bx.items[0].spot); await gyxBoxPut(bx.id, 1, '墙上');
  o.box = bx.items.length === 3 && bx.items[0].line === bx.items[0].yes && bx.items[1].line === bx.items[1].no && /你的旧东西/.test(__gyxCtxFor('9991'));
  await gyxBoxPut(bx.id, 2, '书架'); o.boxDone = bx.done && /拆完|都摆好|箱子空/.test(globalChats['9991'].slice(-1)[0].text);
  document.getElementById('gyxBoxOv')?.remove();
  // 🪟
  await gyxSillPut('小鱼干'); o.sillPut = gyxSillData().sill && gyxSillData().sill.due > Date.now();
  await gyxSillVisit(true, { kind: 'char', who: 'Ken', ico: '💌', cid: '9992' }); o.sill = gyxSillData().visits[0].gift === '🪶 一根羽毛' && !gyxSillData().sill && /你去过她的窗台/.test(__gyxCtxFor('9992')) && gyxSillData().seen.Ken === 1;
  document.getElementById('gyxSillOv')?.remove();
  // 📡
  await gyxWaveStart(9993); const W = gyxWaveState(); o.waveClue = W.cur.mode === 'ta' && W.cur.clue === '夏天的柏油路';
  document.getElementById('gyxWvS').value = String(W.cur.t); await gyxWaveGuess(); o.wave4 = W.rounds[0].pts === 4;
  await gyxWaveNext(); document.getElementById('gyxWvS').value = '78'; document.getElementById('gyxWvC').value = '烫手'; await gyxWaveGuess();
  o.waveMe = W.rounds[1].mode === 'me' && W.rounds[1].g === 80 && W.rounds[1].pts === 4;
  for (let i = 0; i < 3; i++) { await gyxWaveNext(); if (W.cur && W.cur.mode === 'me') document.getElementById('gyxWvC').value = 'x'; await gyxWaveGuess(); }
  await gyxWaveNext(); o.waveEnd = gyxWaveData().games.length === 1 && W.done != null;
  document.getElementById('gyxWaveOv')?.remove();
  // 📼
  await gyxTapesSend(9991); const a = gyxTapesData().arcs[0]; o.tapes = a && a.clips.length === 6 && gyxTapesHits(a, '书店').length === 2 && gyxTapesHits(a, '诗集').length === 2;
  a.clips.filter(x => x.key).slice(0, 3).forEach(x => gyxTapesView(a.id, x.i)); await s(50);
  document.getElementById('gyxTpA').value = '他早就见过我'; await gyxTapesAnswer(a.id); o.tapesSolve = a.solved && /她看完了你的录像带/.test(__gyxCtxFor('9991'));
  document.getElementById('gyxTapesOv')?.remove();
  // 🔗 串起来：小屋（旧物、窗台礼物、小生命、窗户）、默契问答 ↔ 光谱、草稿箱 ↔ 打了又删、准点群聊进群聊
  gyxGrowData().list.push({ id: 'pt1', kind: 'cat', name: '团子', cid: '9991', born: Date.now(), exp: 0, water: 80, love: 80, last: Date.now(), log: [] });
  gyxHomeOpen(9991); await s(100); let rm = document.getElementById('gyxHomeRm');
  const room = rm ? rm.innerHTML : '';
  o.homeBox = /搪瓷杯/.test(room) && /旧相机/.test(room) && !/电影票根/.test(room);
  o.homePet = !!rm.querySelector('.hm-fx') && /团子/.test(room) && !!rm.querySelector('.hm-win.on');
  document.getElementById('gyxHomeOv')?.remove(); gyxHomeOpen(9992); await s(50); o.homeSill = /羽毛/.test(document.getElementById('gyxHomeRm').innerHTML);
  gyxHomeWin(); await s(50); o.homeWin = !!document.getElementById('gyxSillOv') && /回小屋/.test(document.getElementById('gyxSillOv').innerText); document.getElementById('gyxSillOv')?.remove();
  gyxQuizOpen(9993); await s(50); o.quizWave = /心电感应光谱/.test(document.getElementById('gyxQzOv').innerText); document.getElementById('gyxQzOv')?.remove();
  gyxWaveOpen(9993); await s(50); o.waveQuiz = /默契问答/.test(document.getElementById('gyxWaveOv').innerText); document.getElementById('gyxWaveOv')?.remove();
  gyxDraftOpen(9991); await s(50); o.draftTab = /你没发出去的/.test(document.getElementById('gyxDfOv').innerText); document.getElementById('gyxDfOv')?.remove();
  gyxEraseOpen(); await s(50); o.eraseTab = /TA 没发出去的/.test(document.getElementById('gyxEraseOv').innerText); document.getElementById('gyxEraseOv')?.remove();
  currentChatSessionId = 'g_t1'; gyxOnTimeData().cfg.gids = []; gyxOnTimeBar(); o.bar = /准点群聊/.test((document.getElementById('gyxOtBar') || {}).innerText || '');
  renderGroupMuteCheckboxes(groupChats.find(g => g.id === 'g_t1')); o.grpSet = !!document.getElementById('gyxOtGrpSet');
  gyxOnTimeGrp('g_t1', false); gyxOnTimeBar(); o.grpOff = !document.getElementById('gyxOtBar') && gyxOnTimeData().cfg.off.includes('g_t1'); gyxOnTimeGrp('g_t1', true); o.grpOn = !gyxOnTimeData().cfg.off.length && !gyxOnTimeData().cfg.gids.length;
  const qa = (window.gyHubInfo ? JSON.stringify(gyHubInfo()) : ''); o.qaHub = !qa || /gyxWave/.test(qa);
  // 内置提示词 + 注入内容管理 + 合集
  gyPLOpen(); await s(200); const pt = document.getElementById('gyPLOv').innerText; o.pl = ['TA被困了', '你打了又删', '你让TA重说了', '准点群聊', 'TA的旧物箱', '窗台来客', '心电感应光谱', 'TA的录像带'].every(n => pt.includes(n)); document.getElementById('gyPLOv')?.remove();
  const gg = gyInjectGroups().find(g => g.key === 'gyx'); o.inj = ['TA 正被困着', 'TA 偷偷去过你的窗台', 'TA 的旧物和摆在哪', '刚玩过心电感应光谱'].every(l => gg.items.some(i => i.label === l));
  const H = gyHubInfo ? gyHubInfo() : null; o.hub = !H || JSON.stringify(H).includes('gyxSill');
  return o;
});
const J = JSON.stringify(r);
check('八个新玩法都有开关、小功能入口、自主行动；两个游戏进了游戏厅', r.base && r.games, J);
check('🆘 TA被困了：消息发进聊天、你选了 TA 照做、真按时间等、等完有下文、平时聊天带着处境', r.stuck1 && r.stuckWait && r.stuckLater, J);
check('⌨️ 你打了又删：认出删掉没发；TA 来问时看不到你打了什么（默认）', r.erase && r.eraseAsk, J);
check('🔁 你让TA重说了：连着重说第二次才可能察觉，只带在那一次里', r.regen, J);
check('⏰ 准点群聊：到点在群里开聊、你说话就算来了、错过了有人 @ 你、TA 记得你没来', r.ontime && r.join && r.miss, J);
check('📦 TA的旧物箱：拆开看故事、摆对摆错 TA 说的不一样、摆完 TA 说一句、TA 记得', r.box && r.boxDone, J);
check('🪟 窗台来客：放东西、客人来过留下礼物、角色来过 TA 记得、进图鉴', r.sillPut && r.sill, J);
check('📡 心电感应光谱：TA 出提示你猜、你出提示 TA 猜、按距离计分、五轮结算', r.waveClue && r.wave4 && r.waveMe && r.waveEnd, J);
check('📼 TA的录像带：搜关键词出片段、看够关键段能说答案、猜中了 TA 记得', r.tapes && r.tapesSolve, J);
check('🏠 小屋：摆好的旧物出现在屋里（抽屉里的不摆）、窗台礼物在窗台、小生命住在屋里、点窗户就是窗台', r.homeBox && r.homePet && r.homeSill && r.homeWin, J);
check('💞 默契问答 ↔ 📡 光谱互相能看到；✏️ 草稿箱 ↔ ⌨️ 打了又删一页两栏', r.quizWave && r.waveQuiz && r.draftTab && r.eraseTab && r.qaHub, J);
check('⏰ 准点群聊进了群聊：顶上横幅、群设置里单独开关', r.bar && r.grpSet && r.grpOff && r.grpOn, J);
check('内置提示词、注入内容管理、合集都跟上', r.pl && r.inj && r.hub, J);
const bad = errs.filter(e => !/x\.test|Failed to fetch/.test(e)); check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
