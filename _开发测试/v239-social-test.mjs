// v239：📰 营销号自己在主页爆料（爆谁三种模式、人数随机、私事挖不到）、🔥 微博热搜榜开关、📕 小红书频道；内置提示词能改
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
  [[9991, 'Leon', '法国摄影师'], [9992, 'Ken', '厨师'], [9993, 'Mia', '画家']].forEach(([id, n, p]) => myCharacters.push({ id, name: n, persona: p, worldbooks: [], diaryData: { letters: [], diaries: [] }, schedule: { text: '20:00 去江边拍夜景', generatedAt: Date.now() } }));
  globalChats['9991'] = [{ sender: 'me', text: '我的秘密是我其实怕黑', timestamp: Date.now() - 1000, readBy: [] }];
  window.__prompts = [];
  const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); window.__prompts.push(t); let c = '嗯。';
    if (/这次要爆料的人/.test(t)) c = '【独家】Leon 深夜现身江边，疑似与神秘人同框！#Leon夜会神秘人#';
    else if (/你是微博热搜的编辑/.test(t)) c = JSON.stringify({ 'Leon夜会神秘人': 'Leon深夜现身江边' });
    else if (/营销号刚在主页发了一条爆料/.test(t)) c = '我在拍夜景，谢谢关心。';
    else if (/小红书」App 的首页推荐/.test(t)) c = JSON.stringify([{ name: '爱吃甜的猫', emo: '🍰', title: '这家蛋糕店我要锁死', body: '开心果巴斯克绝了', tags: ['探店'] }, { name: '今天不加班', emo: '🌙', title: '男朋友总说忙怎么办', body: '在一起两年……', tags: ['情感'] }, { name: 'a', emo: '🌸', title: '春日穿搭', body: '……', tags: ['穿搭'] }, { name: 'b', emo: '🎬', title: '约会电影推荐', body: '……', tags: ['约会'] }]);
    else if (/要在小红书上发一篇笔记/.test(t)) c = '{"emo":"📷","title":"江边夜景随手拍","body":"今晚的江风很温柔","tags":["摄影","夜景"]}';
    else if (/下面这些人要在评论区留言/.test(t)) c = JSON.stringify([{ name: 'Leon', t: '这不是你吗？' }, { name: '路过的小红薯', t: '蹲后续' }]);
    else if (/挑一篇你会偷偷收藏的/.test(t)) c = '{"i":3,"why":"周末带她去看"}';
    return { choices: [{ message: { content: c } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.spawnNpcComments = async () => {}; try { spawnNpcComments = window.spawnNpcComments; } catch (e) {}
  PLUG.forEach(p => executePluginOnLoad(p)); GYX.set('gyxHot', false);
}, { PLUG });
await page.waitForTimeout(3500);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  o.base = ['gyxScoop', 'gyxHotList', 'gyxRed'].every(id => GYX.FEATS.some(f => f.id === id)) && ['gyx_scoop_tip', 'gyx_hotlist', 'gyx_red_post', 'gyx_red_fav'].every(k => GY_AUTONOMY_ACTIONS.some(a => a.key === k)) && ['gyxScoopW', 'gyxHotListW', 'gyxRedW'].every(k => window.__gyPmW.WD[k]) && ['gyxScoop', 'gyxHotList', 'gyxRed'].every(k => gyMemExList().includes(k));
  // 📰 模式与人数
  const D = gyxScoopData(); const cnt = { user: new Set(), char: new Set() };
  for (let i = 0; i < 30; i++) { const a = gyxScoopPick('user'); cnt.user.add(a.me + ':' + a.chars.length); const b = gyxScoopPick('char'); cnt.char.add(b.me + ':' + b.chars.length); }
  o.modes = [...cnt.user].every(x => x.startsWith('true')) && [...cnt.char].every(x => x.startsWith('false')) && cnt.char.size >= 2;
  // 私事挖不到
  const dug = gyxScoopDig({ me: true, chars: [myCharacters.find(c => c.id === 9991)] }).join(' ');
  o.private = !/怕黑/.test(dug) && /江边/.test(dug);
  const n0 = globalPosts.length; await gyxScoopNow(); await s(200);
  const p = globalPosts[0]; o.home = globalPosts.length === n0 + 1 && p.gyScoop && /江边/.test(p.text) && p.char.id === tabloidAccount.id;
  o.react = p.replies.length >= 1 && /拍夜景/.test(p.replies[0].text);
  o.trend = trendingTags.some(t => /Leon夜会神秘人/.test(t));
  o.ctx = /营销号刚在主页爆了你的料/.test(__gyxCtxFor(String(gyxScoopData().list[0].who.find(x => x !== 'me'))));
  o.noChatInPrompt = !window.__prompts.some(t => /怕黑/.test(t));
  // 手动爆料的提示词能改
  const ov = JSON.parse(localStorage.getItem('gyPromptLib') || '{}'); ov.on = true; ov.ov = Object.assign(ov.ov || {}, { 'scoop.post': '自定义爆料：{{人物}}' }); localStorage.setItem('gyPromptLib', JSON.stringify(ov)); window.__gyPLOv = ov;
  window.__prompts = []; await gyxScoopNow(); o.plEdit = window.__prompts.some(t => /^自定义爆料：/.test(t));
  gyPLOpen(); await s(200); const pt = document.getElementById('gyPLOv').innerText; o.plList = /营销号自动爆料/.test(pt) && /📕 小红书/.test(pt) && /营销号（手动爆料）/.test(pt) && /营销号写爆料的要求/.test(pt); document.getElementById('gyPLOv').remove();
  document.getElementById('gyxScoopOv')?.remove();
  // 📰 人数自己定 + 爆什么自己定
  gyxScoopCfg('cnt', 'fix'); gyxScoopCfg('num', 3);
  const fx = [0, 1, 2, 3, 4].map(() => [gyxScoopPick('char').chars.length, gyxScoopPick('user').chars.length]);
  o.fixCnt = fx.every(([a, b]) => a === 3 && b === 2);
  gyxScoopCfg('cnt', 'rand');
  const lp = myCharacters.find(c => c.id === 9991);
  o.chatOff = !/怕黑/.test(gyxScoopDig({ me: true, chars: [lp] }).join(' '));
  gyxScoopSrc('chat', true); o.chatOn = [0, 1, 2, 3].some(() => /怕黑/.test(gyxScoopDig({ me: true, chars: [lp] }).join(' '))) && !/怕黑/.test(gyxScoopDig({ me: false, chars: [lp] }).join(' ')); gyxScoopSrc('chat', false);
  gyxScoopSrc('sched', false); o.srcOff = !/江边/.test(gyxScoopDig({ me: false, chars: [myCharacters.find(c => c.id === 9991)] }).join(' ')); gyxScoopSrc('sched', true);
  gyxScoopCfg('want', '多爆感情线，别碰工作'); window.__prompts = []; await gyxScoopNow(); o.want = window.__prompts.some(t => /^自定义爆料：/.test(t) && /多爆感情线，别碰工作/.test(t));
  gyxScoopOpen(); const st = document.getElementById('gyxScoopOv').innerText; o.ui = /每次爆几个人/.test(st) && /爆什么/.test(st) && /今天的行程/.test(st); gyxScoopCfg('want', '');
  document.getElementById('gyxScoopOv')?.remove();
  // 🧾 注入内容管理：新玩法插件那一组，新插件的几段有名字，老插件自动标出处，能单独关
  const gg = gyInjectGroups().find(g => g.key === 'gyx'); o.injGroup = !!gg && gg.items.some(i => /营销号刚爆了 TA 的料/.test(i.label)) && gg.items.some(i => /站内热搜前三/.test(i.label)) && gg.items.some(i => /小红书/.test(i.label));
  await gyxDilemmaAsk('9992'); __gyxCtxFor('9992'); o.injSrc = __gyxHeadOf('你在等她的意见') === 'TA的人生选择题';
  const sid = String(gyxScoopData().list[0].who.find(x => x !== 'me'));
  gyInjectSet('gyx.gyxScoop.0', false); o.injOff = !/营销号刚在主页爆了你的料/.test(__gyxCtxFor(sid)); gyInjectSet('gyx.gyxScoop.0', true); o.injOn = /营销号刚在主页爆了你的料/.test(__gyxCtxFor(sid));
  document.getElementById('gyxDilemmaOv')?.remove();
  // 🔥 热搜
  o.hlOff = !GYX.on('gyxHotList'); GYX.set('gyxHotList', true); await s(100); renderTrends(); const tc = document.getElementById('trendListContainer'); o.hl = !!tc && /微博热搜/.test(tc.innerText) && tc.querySelectorAll('.hl-r').length >= 3 && /Leon夜会神秘人|Leon深夜现身江边/.test(tc.innerText);
  await gyxHotListName(true); await s(100); renderTrends(); o.hlTitle = /Leon深夜现身江边/.test(document.getElementById('trendListContainer').innerText) && gyxHotListTitle('Leon夜会神秘人') === 'Leon深夜现身江边' && window.__prompts.some(t => /你是微博热搜的编辑/.test(t));
  o.hlRank = gyxHotListBoard()[0] && /Leon/.test(gyxHotListBoard()[0].t); GYX.set('gyxHotList', false); renderTrends(); o.hlBack = !/微博热搜/.test(tc.innerText);
  o.hlEntry = GY_MINI_FEATURES.some(f => f.id === 'gyxHotList');
  // 📕 小红书
  gyxRedOpen(); await s(100); await gyxRedRefresh(); o.feed = gyxRedData().notes.length === 4 && document.querySelectorAll('#gyxRedOv .rn-c').length === 4;
  gyxRedWho('9991'); await gyxRedTaPost(); o.taNote = gyxRedData().notes.some(n => n.by === '9991' && /夜景/.test(n.title));
  gyxRedTab('mine'); document.getElementById('gyxRnT').value = '男朋友总说忙怎么办'; document.getElementById('gyxRnB').value = '姐妹们帮我看看'; document.getElementById('gyxRnG').value = '情感 求问'; await gyxRedPost();
  const mine = gyxRedData().notes.find(n => n.by === 'me'); o.mine = mine && mine.cmts.some(c => c.who === '9991' && /你吗/.test(c.t));
  await GY_AUTONOMY_ACTIONS.find(a => a.key === 'gyx_red_fav').run(myCharacters.find(c => c.id === 9991)); gyxRedTab('tafav'); o.fav = /周末带她去看/.test(document.getElementById('gyxRedOv').innerText) || gyxRedData().notes.some(n => n.favBy && n.favBy['9991']);
  gyxRedTab('real'); document.getElementById('gyxRnPaste').value = '超好吃的面馆\n就在学校后门 https://xhslink.com/abc #美食'; await gyxRedPaste(); o.paste = gyxRedData().notes[0].by === 'real' && gyxRedData().notes[0].url === 'https://xhslink.com/abc';
  o.realBtn = typeof gyxRedReal === 'function';
  document.getElementById('gyxRedOv')?.remove();
  return o;
});
check('三个新插件都有开关、自主行动、小组件、记忆总览', r.base, JSON.stringify(r));
check('📰 爆谁：只爆你和角色 / 只爆角色之间 / 都爆；每次人数随机', r.modes, JSON.stringify(r));
check('📰 挖料只用公开的东西：私聊里说的、「谁都别知道」的永远挖不到', r.private && r.noChatInPrompt, JSON.stringify(r));
check('📰 爆料发在主页（营销号账号），被爆的角色来评论区回应，话题进趋势榜，TA 聊天时知道', r.home && r.react && r.trend && r.ctx, JSON.stringify(r));
check('📰 人数可以自己定；爆什么能勾、能写要求（改过提示词也照样带上要求）', r.fixCnt && r.srcOff && r.want && r.ui, JSON.stringify(r));
check('📰 私聊内容也能勾：默认不挖，勾上后只在爆到你时挖你和那个角色的私聊', r.chatOff && r.chatOn, JSON.stringify(r));
check('🔥 热搜榜用微博的口吻起标题（副 API，起过记住）', r.hlTitle, JSON.stringify(r));
check('🧾 注入内容管理里有「新玩法插件」一组：新插件的几段有名字、老插件标出处、单独关掉就不带', r.injGroup && r.injSrc && r.injOff && r.injOn, JSON.stringify(r));
check('📜 内置提示词：营销号自动爆料、小红书、营销号手动爆料都能看能改，改了就用改的', r.plEdit && r.plList, JSON.stringify(r));
check('🔥 微博热搜榜：开关默认关、入口一直在；打开后标签排行变热搜样式（按真实帖子算热度），关掉恢复', r.hlOff && r.hl && r.hlRank && r.hlBack && r.hlEntry, JSON.stringify(r));
check('📕 小红书：刷新出笔记、TA 发笔记、你发求问贴 TA 认出你、TA 偷偷收藏、贴现实笔记进来', r.feed && r.taNote && r.mine && r.fav && r.paste && r.realBtn, JSON.stringify(r));
const bad = errs.filter(e => !/x\.test|Failed to fetch/.test(e));
check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
