// v237：入口补齐——小功能「🎮 游戏厅」、「⚙️ 个性化」合集（设置里那几样两边都有）、聊天里点自己头像看反向养成
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
  myCharacters.push({ id: 9991, name: 'Leon', persona: 'x', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  globalChats['9991'] = [];
  const fake = async () => ({ choices: [{ message: { content: '{"accept":true,"reply":"好啊"}' } }] });
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  PLUG.forEach(p => executePluginOnLoad(p)); GYX.set('gyxHot', false);
}, { PLUG });
await page.waitForTimeout(4000);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  const I = gyHubInfo(), F = I.FOLDERS.find(f => f.id === 'hub_custom');
  o.hall = GY_MINI_FEATURES.some(f => f.id === 'gameHall');
  o.custom = !!F && F.live && ['gySkinBox', 'voice', 'chatstat', 'intro'].every(k => F.kids.includes(k)) && F.members.length >= 5;
  o.stillSet = I.SET_IDS.includes('voice');
  gyHallOpen(); await s(200); const t = document.getElementById('gyHallOv').innerText;
  o.list = ['剧本杀', '海龟汤', '我们的恋综', '五子棋', '狼人杀', '一起钓鱼', '时间循环', '和 TA 两个人', '拉好几个角色一起'].filter(w => !t.includes(w));
  o.n = document.querySelectorAll('#gyHallOv .gyhl-g').length; o.total = registeredMiniGames.length;
  gyHallPlay('gyxSoup'); await s(200); o.soup = !!document.getElementById('gyxSoupOv') && !document.getElementById('gyHallOv'); document.getElementById('gyxSoupOv')?.remove();
  gyHallOpen(); await s(100); gyHallPlay('werewolf_party') ; await s(100);
  const ww = registeredMiniGames.find(g => (g.minOpponents || 1) > 1); gyHallOpen(); await s(100); gyHallPlay(ww.id); await s(200); o.groupNeed = !!document.getElementById('gyHallOv');
  document.getElementById('gyHallOv')?.remove();
  const gomoku = registeredMiniGames.find(g => /五子棋/.test(g.name)); currentChatSessionId = null;
  gyHallOpen(); await s(100); gyHallPlay(gomoku.id); await s(1500);
  o.chat = String(currentChatSessionId) === '9991' && (globalChats['9991'] || []).some(m => /邀请对方玩五子棋/.test(m.text || ''));
  return o;
});
check('小功能里有「🎮 游戏厅」，所有游戏都列在里面（两个人 / 好几个人分开）', r.hall && !r.list.length && r.n === r.total, JSON.stringify(r));
check('游戏厅：插件游戏直接打开；谷雨自带的跳到 TA 的聊天发邀请；要群聊的会提示选群聊', r.soup && r.chat && r.groupNeed, JSON.stringify(r));
check('「⚙️ 个性化」合集：皮肤、TA 的声音、聊天统计、开场动画……设置里也还在', r.custom && r.stillSet, JSON.stringify(r));
const av = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  globalChats['9991'] = [{ sender: 'me', text: '在吗', timestamp: Date.now() - 1000, readBy: [] }];
  switchMainView('chat'); switchChatSession('9991'); await s(300);
  const el = [...document.querySelectorAll('#chatMessagesArea [onclick^="gyMeAvatarClick"]')].pop(); o.has = !!el;
  window.__nudge = 0; const tn = window.triggerNudge; window.triggerNudge = () => { window.__nudge++; }; try { triggerNudge = window.triggerNudge; } catch (e) {}
  el.click(); el.click(); el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await s(450); o.dblNoCare = !document.getElementById('gyxCrOv') && window.__nudge === 1;
  el.click(); await s(450); o.care = !!document.getElementById('gyxCrOv');
  return o;
});
check('聊天里点一下自己的头像 → 打开反向养成；双击还是拍一拍、不会误打开', av.has && av.care && av.dblNoCare, JSON.stringify(av));
const gd = await page.evaluate(() => ['游戏在哪', '剧本杀在哪', '个性化', '反向养成在哪看'].map(q => (gyGuideSearchApi(q)[0] || {}).id));
check('指南写了游戏厅 / 个性化 / 点头像看反向养成，客服搜得到', /^games?$/.test(gd[0]) && gd[1] === 'g_case' && gd[2] === 'h_custom' && gd[3] === 'care', JSON.stringify(gd));
const bad = errs.filter(e => !/x\.test|Failed to fetch/.test(e));
check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
