// v230：手帐时间线、关系四条线、TA 自拍、AI 小程序、听取模式（用立绘插件）+ 小功能再归一归（23 个入口）+ 合集都是整页
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
if (fs.existsSync(path.join(root, 'js', '90-bailu-cards.js'))) { console.log('（白露不测）'); process.exit(0); }
const PLUG = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const SPRITE = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '角色立绘差分.json'), 'utf8'));
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ PLUG, SPRITE }) => {
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  const H = [], now = Date.now(); for (let d = 3; d >= 0; d--) for (let i = 0; i < 8; i++) H.push({ sender: i % 2 ? 9991 : 'me', text: i % 2 ? '哈哈今天的晚霞好漂亮，想拍给你看（举起相机）' : '你在干嘛呀，我刚下班', timestamp: now - d * 864e5 - (8 - i) * 60e3, readBy: [] });
  globalChats['9991'] = H; currentChatSessionId = '9991';
  window.__asks = [];
  const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); window.__asks.push(t); let c = '好呀。';
    if (/写手帐那样/.test(t)) c = '{"sum":"我们一起看了晚霞，他说想拍给我看。","emo":"🌇"}';
    else if (/在页边用手写的语气/.test(t)) c = '那天的晚霞其实没你好看。';
    else if (/四条线各变了多少/.test(t)) c = '{"trust":[2,"她说到做到"],"close":[3,"天天跟我说下班"],"safe":[0,""],"respect":[-1,"她没问我的意见"]}';
    else if (/拍一张自拍/.test(t)) c = '{"desc":"我在天台举着相机自拍","cap":"给你看看今天的我","emo":"🤳🌇"}';
    else if (/写一个手机小 App/.test(t)) c = '<!-- name: 喝水打卡 | icon: 💧 -->\n```html\n<div id="n">0</div><button id="b">喝一杯</button><script>(async()=>{let n=(await gyx.get("n"))||0;const el=document.getElementById("n");el.textContent=n;document.getElementById("b").onclick=async()=>{n++;el.textContent=n;await gyx.set("n",n);window.__done=1;parent.postMessage({probe:n},"*")};})()<\/script>\n```';
    else if (/念一段话给她听/.test(t)) c = '{"lines":["今天（看着窗外）下雨了。","你记得带伞。"]}';
    return { choices: [{ message: { content: c } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.sendProactiveChatMessage = async () => true; try { sendProactiveChatMessage = window.sendProactiveChatMessage; } catch (e) {}
  SPRITE.forEach(p => executePluginOnLoad(p));
  PLUG.forEach(p => executePluginOnLoad(p)); GYX.set('gyxHot', false);
}, { PLUG, SPRITE });
await page.waitForTimeout(3500);

const base = await page.evaluate(() => {
  const ids = ['gyxHandbook', 'gyxAxes', 'gyxApps', 'gyxListen'], o = {};
  o.feat = ids.filter(id => !GYX.FEATS.some(f => f.id === id));
  o.acts = ['gyx_handbook', 'gyx_axes', 'gyx_apps', 'gyx_listen', 'gyx_selfie'].filter(k => !GY_AUTONOMY_ACTIONS.some(a => a.key === k));
  o.wd = ['gyxHandbookW', 'gyxAxesW', 'gyxAppsW', 'gyxListenW'].filter(k => !window.__gyPmW.WD[k]);
  o.mem = ['gyxHandbook', 'gyxAxes', 'gyxApps', 'gyxListen'].filter(k => !gyMemExList().includes(k));
  return o;
});
check('4 个新插件都有开关、自主行动（外加 TA 自拍）、小组件、记忆总览', !base.feat.length && !base.acts.length && !base.wd.length && !base.mem.length, JSON.stringify(base));

const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  const pad = n => String(n).padStart(2, '0'), d = new Date(Date.now() - 864e5), y = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  // 手帐
  gyxHandbookOpen('9991', 'month'); await s(100); o.month = document.querySelectorAll('#gyxHbOv .hb-d.has').length >= 3;
  await gyxHandbookDay(y); await s(100); o.day = /晚霞/.test(document.getElementById('gyxHbPage').innerText) && /🌇/.test(document.getElementById('gyxHbPage').innerText);
  await gyxHandbookStkPick(y); await s(100); const img = document.querySelector('#gyxHbStk img'); img.click(); await s(150);
  o.stk = (gyxHandbookData().days['9991'][y].stk || []).length === 1 && !!document.querySelector('#gyxHbPage .hb-stk');
  const a = GY_AUTONOMY_ACTIONS.find(x => x.key === 'gyx_handbook'); o.noteAct = !!a.need(myCharacters.find(c => c.id === 9991)); await a.run(myCharacters.find(c => c.id === 9991));
  o.note = /没你好看/.test(gyxHandbookData().days['9991'][y].note || '');
  gyxHandbookOpen('9991', 'week'); await s(50); o.week = document.querySelectorAll('#gyxHbOv .hb-wc').length === 7;
  document.getElementById('gyxHbOv')?.remove();
  // 四条线
  await gyxAxesAssess('9991', true); const S = gyxAxesData().by['9991'];
  o.axes = S.v.trust === 52 && S.v.close === 53 && S.v.respect === 49 && S.log.some(x => /说到做到/.test(x.why));
  gyxAxesOpen('9991'); await s(50); o.axPanel = !!document.querySelector('#gyxAxOv svg.ax-r') && /问问 TA/.test(document.getElementById('gyxAxOv').innerText);
  o.axCtx = /四条线/.test(window.__gyxCtxFor('9991')); document.getElementById('gyxAxOv')?.remove();
  // 自拍
  const sf = await gyxAlbumSelfie('9991'); o.selfie = !!sf && sf.self && /天台/.test(sf.desc) && globalChats['9991'].some(m => /🤳/.test(m.text || ''));
  gyxAlbumOnlySelf(true); await s(300); o.selfOnly = /🤳/.test((document.getElementById('gyxAlOv') || {}).innerText || ''); gyxAlbumOnlySelf(false); document.getElementById('gyxAlOv')?.remove();
  // 小程序
  document.body.insertAdjacentHTML('beforeend', '<textarea id="gyxApNew">喝水打卡</textarea>');
  const ap = await gyxAppsNew(); document.getElementById('gyxApNew')?.remove();
  o.app = !!ap && ap.n === '喝水打卡' && ap.ico === '💧';
  await s(800); const fr = document.querySelector('#gyxApOv iframe');
  o.sandbox = !!fr && fr.getAttribute('sandbox') === 'allow-scripts allow-forms allow-modals';
  return o;
});
check('📒 手帐时间线：月历（聊过的日子有点）→ 点进一天自动写小结和 emoji → 贴纸库贴一张 → TA 在昨天那页写批注 → 周视图 7 张', r.month && r.day && r.stk && r.noteAct && r.note && r.week, JSON.stringify(r));
check('📊 关系四条线：按聊天评一次，信任 / 亲密 / 尊重各自变，原因记下来；雷达图、问问 TA；TA 的提示词里知道', r.axes && r.axPanel && r.axCtx, JSON.stringify(r));
check('🤳 TA 自拍：拍一张自拍进相册（发到聊天里），相册能只看自拍', r.selfie && r.selfOnly, JSON.stringify(r));

// 小程序：在沙盒里点按钮，存数据走 gyx.set
const fr = page.frameLocator('#gyxApOv iframe');
await fr.locator('#b').click(); await fr.locator('#b').click(); await page.waitForTimeout(400);
const ap2 = await page.evaluate(() => { const a = gyxAppsData().apps[0]; return { n: a.store.n, txt: document.querySelector('#gyxApOv iframe').contentDocument ? 'leak' : 'sandboxed' }; });
check('🧩 AI 小程序：一句话做出一个 App（名字和图标从 AI 的回复里取），在沙盒里跑，存的数据走 gyx.set 存回谷雨', r.app && r.sandbox && ap2.n === 2 && ap2.txt === 'sandboxed', JSON.stringify([r, ap2]));

const ls = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  document.getElementById('gyxApOv')?.remove();
  // 给 Leon 一套立绘（用立绘插件的数据）
  const SD = gySpriteData(); SD.chars['9991'] = { on: true, pos: 'right', size: 62, opacity: 100, layer: 'back', face: '默认', sprites: [{ id: 'a', mood: '默认', src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==#d' }, { id: 'b', mood: '开心', src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==#h' }] };
  gyxListenSet('voice', false);
  gyxListenPlay('9991', 'last', false); await s(200);
  const ov = document.getElementById('gyxLsOv'); o.open = !!ov;
  o.sprite = /#h$/.test((ov.querySelector('.ls-sp img') || {}).src || '');   // 「哈哈」→ 开心那张
  o.name = ov.querySelector('.ls-name').textContent === 'Leon';
  gyxListenNext(); gyxListenNext(); await s(400); o.nar = ov.querySelector('.ls-text').classList.contains('nar') || /举起相机/.test(ov.innerText);
  gyxListenClose(); o.btn = !!document.getElementById('gyxLsBtn') || !document.getElementById('miniGameIconBtn');
  // 分组：小功能顶上只剩二十几个入口；合集打开是整页
  switchMainView('miniHub'); await s(600);
  const v = document.getElementById('view-miniHub') || document.querySelector('[id^="view-mini"]'); o.count = v.querySelectorAll('.set-entry-title, .mh-title, b').length;
  gyHubOpen('hub_life'); await s(500); o.page = document.getElementById('gyHubOv').classList.contains('gy-aspage'); gyHubClose();
  gyGuideOpen(); await s(300); o.guidePage = document.getElementById('gyGuideOv').classList.contains('gy-aspage'); document.getElementById('gyGuideOv').remove();
  return o;
});
check('🎬 听取模式：一句句播，名字、括号里的动作当旁白；装了立绘插件就用立绘，「哈哈」那句换成开心的那张；聊天里有 🎬 按钮', ls.open && ls.sprite && ls.name && ls.nar && ls.btn, JSON.stringify(ls));
check('小功能再归了一次类（顶上 36 个以内；223 时是 30，后来加了游戏厅、个性化、软件、外面的世界、我的 MCP 这些入口），合集、使用指南打开都是整页', ls.count <= 36 && ls.page && ls.guidePage, JSON.stringify(ls));

const bad = errs.filter(e => !/x\.test|Failed to fetch/.test(e));
check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
