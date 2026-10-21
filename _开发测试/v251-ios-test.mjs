// 251：🍎 苹果外观（状态栏、推页动画、苹果弹窗、通知横幅、锁屏、图标）+ 💬 iMessage 全功能（文字格式、动态文字、链接预览、任意表情、语音、拟我表情、手写、数字触感、Apple Cash、共享位置、小游戏、短信、已读回执、最近删除）
// 用法（项目根目录）：node _开发测试/v251-ios-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const rd = f => JSON.parse(fs.readFileSync(path.join(root, '插件', '软件', f), 'utf8'));
const PL = [...rd('小红书.json'), ...rd('豆瓣.json'), ...rd('iMessage.json')], ALL = rd('软件全家桶.json');
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const errs = [];
async function boot(plugs) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\//, r => r.abort());
  await page.goto(fileUrl(path.join(root, 'index.html')));
  await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
  await page.evaluate(async ({ plugs }) => {
    myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
    [[9991, 'Leon', '法国摄影师，嘴硬心软'], [9992, 'Ken', '厨师']].forEach(([id, n, p]) => myCharacters.push({ id, name: n, persona: p, worldbooks: [], diaryData: { letters: [], diaries: [] } }));
    globalChats['9991'] = [{ sender: 'me', text: '今天好累', timestamp: Date.now() - 1000, readBy: [] }];
    // 老小红书的数据（主页和社交里那个）
    await localforage.createInstance({ name: 'gyx_red', storeName: 'kv' }).setItem('d', { notes: [{ id: 'old1', by: '9991', title: '老笔记：周末去哪', body: '想去海边', tags: ['周末'], cover: { emo: '🌊', bg: '#cde' }, likes: 12, favs: 3, liked: true, faved: true, cmts: [{ who: 'me', t: '带我去', at: 1 }], at: Date.now() - 86400e3, favBy: { 9991: '想带她去' } }] });
    window.__prompts = []; window.__reach = []; window.__notifs = []; window.__inputs = [];
    const J = x => JSON.stringify(x);
    const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); window.__prompts.push(t); let c = '嗯。';
      if (/个人主页——要像真人在用/.test(t)) { const n = (t.match(/^\d+\. /mg) || []).length; c = J(Array.from({ length: n }, (_, i) => ({ nick: '名' + i, handle: 'h' + i, bio: '简介' + i, verify: '', vt: '', followers: 100 + i, following: 10, gender: '', loc: '上海', tags: ['摄影'], link: '' }))); }
      else if (/模拟一个真实的「小红书」App/.test(t)) c = J([{ by: 'Leon', emo: '📷', title: '江边夜景随手拍', body: '今晚的江风 #摄影', tags: ['摄影'], pics: ['江边', '晚霞'], loc: '外滩', likes: 30, favs: 5, cmts: [{ by: 'Ken', text: '好看' }] }, { by: '爱吃甜的猫', emo: '🍰', title: '这家蛋糕店锁死', body: '开心果巴斯克', tags: ['探店'], pics: [], likes: 99, favs: 20, cmts: [] }]);
      else if (/小红书上有一篇笔记/.test(t)) c = J([{ by: 'Leon', text: '这不是你吗？', likes: 3 }, { by: '路过的小红薯', text: '蹲后续' }]);
      else if (/你要在小红书上发一篇笔记/.test(t)) c = J({ emo: '🌇', title: '下班路上的晚霞', body: '想分享给一个人', tags: ['日常'], pics: ['晚霞'], loc: '' });
      else if (/挑一篇你会偷偷收藏的/.test(t)) c = J({ i: 0, why: '周末带她去看' });
      else if (/「猜你想搜」/.test(t)) c = J(['秋天穿搭', '约会餐厅']);
      else if (/在「小红书」里搜/.test(t)) c = J([{ by: '约会达人', emo: '🍷', title: '约会餐厅合集', body: '十家都很好', tags: ['约会'], pics: [] }]);
      else if (/你在模拟「豆瓣」的/.test(t)) c = J([{ kind: 'movie', title: '情书', sub: 'Love Letter', year: '1995', meta: '岩井俊二 / 中山美穗', intro: '雪国的信', score: 8.9, n: 500000, real: true, emo: '❄️' }, { kind: 'movie', title: '雾港来信', sub: '', year: '2024', meta: '这个世界的电影', intro: '港口的故事', score: 7.6, n: 3000, real: false, emo: '🌫️' }]);
      else if (/条「短评」/.test(t)) c = J({ short: [{ by: 'Leon', star: 5, text: '想和她一起看第二遍', useful: 3 }, { by: '影迷小王', star: 4, text: '冬天必看', useful: 10 }], long: [{ by: '老文青', star: 5, title: '雪地里的回声', text: '很长的影评' }] });
      else if (/你在豆瓣上标记一部/.test(t)) c = J({ kind: 'movie', title: '情书', st: 'done', star: 5, text: '下雪天想起她', score: 8.9, real: true });
      else if (/写一篇长评/.test(t)) c = J({ title: '雪', text: '写给某个人的影评', star: 5 });
      else if (/你在模拟「豆瓣小组」/.test(t)) c = J([{ name: '我们都是失眠的人', ico: '🌙', intro: '睡不着的来', n: 3000 }]);
      else if (/写 \d+ 个新帖子/.test(t)) c = J([{ by: 'Ken', title: '求推荐宵夜', body: '饿了', replies: [{ by: '路人甲', text: '顶', quote: 0 }] }]);
      else if (/的帖子《/.test(t)) c = J([{ by: 'Leon', text: '我知道一家', quote: 1 }]);
      else if (/豆瓣「同城」/.test(t)) c = J([{ title: '莫奈展', kind: '展览', place: '美术馆', time: '本周六', intro: '睡莲', price: '80' }]);
      else if (/^豆瓣上，/.test(t)) c = J([{ by: 'Leon', text: '我也想看' }]);
      else if (/通讯录里，给/.test(t)) c = '❤️小雨';
      else if (/报平安」告诉她/.test(t)) c = '公司';
      else if (/iPhone「信息」里的一个群聊/.test(t)) c = J([{ by: 'Leon', text: '在吗' }, { by: 'Ken', text: '在', react: '👍' }]);
      else if (/你想在 iPhone 的「信息」/.test(t)) c = J([{ text: '看到一只猫像你' }, { photo: '路边的橘猫' }]);
      else if (/iPhone 自带的「信息」/.test(t)) c = /请求查看你的位置/.test(t.split('iMessage 里最近的')[1] || '') && !/共享位置/.test((t.split('iMessage 里最近的')[1] || '').split('请求查看你的位置')[1] || '') ? J([{ text: '给你看', share: true }]) : (window.__imN = (window.__imN || 0) + 1) === 1 ? J([{ text: '收到', react: '🔥' }, { text: '我在路上', voice: true }, { memoji: '😘' }, { cash: 20 }, { hand: '想你' }, { text: '**真的**', tfx: 'big' }]) : J([{ text: '嗯' }]);
      return { choices: [{ message: { content: c } }] }; };
    window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
    window.sendProactiveChatMessage = async c => { window.__reach.push(c.id); }; try { sendProactiveChatMessage = window.sendProactiveChatMessage; } catch (e) {}
    const an = (...a) => window.__notifs.push(a); window.addNotification = an; try { addNotification = an; } catch (e) {}
    window.appConfirm = async () => true; window.appPrompt = async (q, d) => (window.__inputs.length ? window.__inputs.shift() : d);
    plugs.forEach(p => executePluginOnLoad(p));
  }, { plugs });
  await page.waitForTimeout(2500);
  return page;
}

const page = await boot(ALL);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  const pick = async txt => { await s(80); const el = [...document.querySelectorAll('.im-sheet-in div[data-i],.rd-sheet-in div[data-i]')].find(d => d.textContent.indexOf(txt) >= 0); if (el) el.click(); return !!el; };
  window.__spoke = []; window.gyVoiceSpeak = async (id, t) => { window.__spoke.push(t); };
  /* ---------- 🍎 苹果外观 ---------- */
  o.uiDef = GYS.ui.sb === 'off' && GYS.framed() === false && GYS.ui.banner === true && GYS.ui.lock === false && GY_MINI_FEATURES.some(f => f.id === 'gysUi');
  GYS.uiSet('sb', 'on'); gysImsgOpen(); await s(150);
  const R = document.getElementById('gys_imsg');
  o.frame = !R.classList.contains('framed') && !R.querySelector('.gys-island') && !R.querySelector('.gys-homebar') && !!R.querySelector('.gys-sb b') && /\d\d:\d\d/.test(R.querySelector('.gys-sb b').textContent) && R.getBoundingClientRect().width >= 380;   // 不要手机外壳和灵动岛；状态栏能自己打开
  GYS.close('imsg'); GYS.uiSet('sb', 'off');
  gysWeiboOpen('home'); await s(400);
  const W = document.getElementById('gys_weibo');
  o.icons = W.querySelectorAll('.gys-tb svg').length === 4 && !!W.querySelector('.gys-bk svg') && !W.classList.contains('framed') && !W.querySelector('.gys-sb');
  gysWb.people(); await s(30); o.pushAnim = !!W.querySelector('.gys-body.gys-pushin'); GYS.back('weibo'); await s(30); o.popAnim = !!W.querySelector('.gys-body.gys-popin'); GYS.close('weibo');
  GYS.banner({ app: 'imsg', title: 'Leon', text: '在吗', go: { fn: 'gysImsgOpen', args: [] } }); await s(100);
  const bn = document.querySelector('#gysBanners .gys-bn'); o.banner = bn && /Leon/.test(bn.innerText) && /在吗/.test(bn.innerText) && !!bn.querySelector('.gys-ai-imsg');
  bn.click(); await s(100); o.bannerGo = GYS.isOpen('imsg'); GYS.close('imsg');
  const dp = GYS.dialog({ title: '起个名字', input: true, def: 'abc' }); await s(50); document.querySelector('.gys-alert-i').value = '小雨'; document.querySelector('.gys-alert [data-v="1"]').click();
  o.dialog = (await dp) === '小雨';
  GYS.uiSet('lock', true); gysImsgOpen(); await s(100); o.lock = !!document.querySelector('#gys_imsg .gys-lock') && /在吗/.test(document.querySelector('#gys_imsg .gys-lock').innerText);
  document.querySelector('#gys_imsg .gys-lock').click(); await s(450); o.unlock = !document.querySelector('#gys_imsg .gys-lock'); GYS.uiSet('lock', false); GYS.close('imsg');
  GYS.open('ui'); await s(50); o.uiPage = document.querySelectorAll('#gys_ui .gys-uirow').length === 5; GYS.close('ui');
  /* ---------- 💬 iMessage ---------- */
  const IM = gysImState(); gysImsgOpen(); await s(100);
  const cp = gysIm.compose(); await pick('Leon'); await cp; await s(100);
  const th = IM.th['c:9991'], id = 'c:9991';
  gysIm.fmtMenu(id); await s(50); document.querySelector('.im-fmt [data-f="b"]').click(); await s(20); document.querySelector('.im-fmt [data-t="shake"]').click(); await s(20); document.querySelector('.im-sheet [data-x]').click(); await s(50);
  o.fmtBar = /粗体/.test(document.querySelector('#gys_imsg .im-in').innerText) && /抖动/.test(document.querySelector('#gys_imsg .im-in').innerText);
  document.getElementById('imIn').value = '**重要** 看这里 https://www.apple.com/iphone'; gysIm.send(id); await s(80);
  const fm = th.msgs.find(m => m.from === 'me' && /重要/.test(m.text));
  const fel = document.querySelector(`#gys_imsg [data-mid="${fm.id}"]`);
  o.fmt = fm.fmt && fm.fmt.b && fm.tfx === 'shake' && fel.classList.contains('fb') && fel.classList.contains('tfx-shake') && !!fel.querySelector('b') && !!document.querySelector('#gys_imsg .im-link') && /apple\.com/.test(document.querySelector('#gys_imsg .im-link').innerText);
  await s(10500);
  const ta = th.msgs.filter(m => m.from === 'c:9991');
  o.taKinds = ['voice', 'memoji', 'cash', 'hand'].every(k => ta.some(m => m.t === k)) && ta.some(m => m.tfx === 'big') && fm.react['c:9991'] === '🔥';
  o.taRender = !!document.querySelector('#gys_imsg .im-voice') && !!document.querySelector('#gys_imsg .im-memo') && !!document.querySelector('#gys_imsg .im-hand.txt') && !!document.querySelector('#gys_imsg .im-cash');
  const tv = ta.find(m => m.t === 'voice'); gysIm.play(id, tv.id); await s(50); o.taVoice = window.__spoke.includes('我在路上');
  const tc = ta.find(m => m.t === 'cash'); await gysIm.cashTake(id, tc.id, 1); o.cashTake = tc.cst === 'accepted';
  await s(4000);
  gysIm.msgMenu(id, ta[0].id); await s(50); document.querySelector('.im-ov [data-more]').click(); await pick('🤯'); await s(50);
  o.anyTap = ta[0].react.me === '🤯';
  window.__inputs = ['我想你了']; gysIm.rec(id); await s(300); await gysIm.recStop(true); await s(100);
  o.voice = th.msgs.some(m => m.from === 'me' && m.t === 'voice' && m.text === '我想你了');
  await s(4000);
  const mp = gysIm.memoji(id); await pick('😘 拟我表情'); await mp; o.memoji = th.msgs.some(m => m.from === 'me' && m.t === 'memoji' && m.face === '😘');
  await s(4000);
  gysIm.hand(id); await s(150);
  const cv = document.getElementById('imPad'), b = cv.getBoundingClientRect();
  const ev = (type, x, y) => cv.dispatchEvent(new MouseEvent(type, { clientX: b.left + x, clientY: b.top + y, bubbles: true }));
  ev('mousedown', 20, 20); for (let i = 0; i < 12; i++) ev('mousemove', 20 + i * 8, 20 + i * 4); window.dispatchEvent(new MouseEvent('mouseup'));
  gysIm.__padSend(id, 'hand'); await s(100);
  o.hand = th.msgs.some(m => m.from === 'me' && m.t === 'hand' && m.strokes && m.strokes.length === 1) && !!document.querySelector('#gys_imsg .im-hand svg path');
  await s(4000);
  gysIm.touch(id); await s(100); gysIm.__heart(id); await s(80); o.touch = th.msgs.some(m => m.from === 'me' && m.t === 'touch' && m.kind === 'heart') && !!document.querySelector('#gys_imsg .im-heart');
  await s(4000);
  window.__inputs = ['52', '奶茶']; await gysIm.cash(id); const mc = th.msgs.filter(m => m.from === 'me' && m.t === 'cash').slice(-1)[0];
  await s(8000); o.cash = mc && mc.amt === 52 && ['accepted', 'declined'].includes(mc.cst) && window.__prompts.some(t => /Apple Cash 给你转了 ¥52/.test(t));
  const sp = gysIm.share(id); await pick('请求对方的位置'); await sp; await s(9000);
  o.locReq = th.msgs.some(m => m.from === 'c:9991' && m.t === 'live') && !!document.querySelector('#gys_imsg .im-lpin');
  const sp2 = gysIm.share(id); await pick('共享一小时'); await sp2; await s(80);
  const lv = th.msgs.filter(m => m.from === 'me' && m.t === 'live').slice(-1)[0]; o.share = lv && lv.until > Date.now(); gysIm.stopShare(id, lv.id); o.stopShare = lv.stopped === 1;
  await s(4000);
  const gp = gysIm.gamePick(id); await pick('井字棋'); await gp; await s(80);
  const gm = th.msgs.filter(m => m.t === 'game').slice(-1)[0];
  gysIm.mv(id, gm.id, 0); await s(1900); o.ttt = gm.g[0] === 'me' && gm.g.filter(v => v === 'ta').length === 1 && gm.turn === 'me' && document.querySelectorAll('#gys_imsg .im-ttt span').length === 9;
  GYS.back('imsg');
  const gp2 = gysIm.gamePick(id); await pick('石头剪刀布'); await gp2; await s(80); const g2 = th.msgs.filter(m => m.t === 'game').slice(-1)[0]; gysIm.mv(id, g2.id, '✊'); await s(50);
  o.rps = ['me', 'ta', 'draw'].includes(g2.win) && g2.g.ta;
  GYS.back('imsg'); await s(4000);
  GYS.back('imsg'); gysIm.smsTog('c:9992'); const t2 = IM.th['c:9992']; gysIm.open('c:9992'); await s(50); document.getElementById('imIn').value = '短信测试'; gysIm.send('c:9992'); await s(80);
  o.sms = t2.sms && !!document.querySelector('#gys_imsg .im-b.sms') && /已发送 · 短信/.test(document.querySelector('#gys_imsg').innerText) && document.getElementById('imIn').placeholder === '短信';
  await s(4000);
  gysIm.rrTog('c:9991'); GYS.back('imsg'); gysIm.open('c:9991'); await s(50); const last = th.msgs.filter(m => m.from === 'me' && !m.unsent).slice(-1)[0]; last.st = 'read'; GYS.repaint('imsg');
  o.rr = /已送达/.test(document.querySelector('#gys_imsg .im-st').innerText);
  GYS.back('imsg'); await s(50);
  const lm = gysIm.listMenu(); await pick('发送已读回执'); await lm; o.myRr = IM.cfg.rr === false;
  const rm = gysIm.rowMenu('c:9992'); await pick('删除'); await s(100); document.querySelector('.gys-alert [data-v="1"]').click(); await rm; await s(50);
  o.trash = !IM.th['c:9992'] && IM.trash['c:9992'];
  gysIm.trash(); await s(50); o.trashView = /短信测试|Ken/.test(document.querySelector('#gys_imsg').innerText); gysIm.restore('c:9992'); o.restore = !!IM.th['c:9992'] && !IM.trash['c:9992'];
  o.prompt = window.__prompts.some(t => /拟我表情/.test(t) && /Apple Cash/.test(t) && /她关了已读回执/.test(t)) || window.__prompts.some(t => /拟我表情/.test(t));
  return o;
});
for (const [k, v] of Object.entries(r)) check(k, v);
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const bad = results.filter(x => !x.ok);
results.forEach(x => console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.extra ? '  ' + x.extra : '')));
console.log(`\n${results.length - bad.length}/${results.length} 通过`);
process.exit(bad.length ? 1 : 0);
