// 249：📱 软件合集——🧣 微博、🫧 泡泡（整页界面、每个软件里的主页不一样、改主页、bot、订阅 / 回复 3 次 / 字数、自己开频道、猜小号、注入）
// 用法（项目根目录）：node _开发测试/v249-soft-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const rd = f => JSON.parse(fs.readFileSync(path.join(root, '插件', '软件', f), 'utf8'));
const WB = rd('微博.json'), BB = rd('泡泡.json'), ALL = rd('软件全家桶.json');
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
  await page.evaluate(({ plugs }) => {
    myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
    [[9991, 'Leon', '法国摄影师，嘴硬心软'], [9992, 'Ken', '厨师']].forEach(([id, n, p]) => myCharacters.push({ id, name: n, persona: p, worldbooks: [], diaryData: { letters: [], diaries: [] } }));
    globalChats['9991'] = [{ sender: 'me', text: '今天好累', timestamp: Date.now() - 1000, readBy: [] }];
    window.__prompts = []; window.__reach = []; window.__notifs = []; window.__inputs = [];
    const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); window.__prompts.push(t); let c = '嗯。';
      if (/个人主页——要像真人在用/.test(t)) { const app = /「泡泡」/.test(t) ? '泡' : '博'; const n = (t.match(/^\d+\. /mg) || []).length; c = JSON.stringify(Array.from({ length: n }, (_, i) => ({ nick: app + '名' + i, handle: 'h' + i, bio: app + '的简介', verify: '', vt: '', followers: 100 + i, following: 10, gender: '', loc: '上海', tags: ['摄影'], link: '' }))); }
      else if (/模拟一个真实的微博时间线/.test(t)) c = JSON.stringify([{ by: 'Leon', text: '江边夜景 #夜景# [doge]', pics: ['江边'], topics: ['夜景'], likes: 30, cmts: [{ by: 'Ken', text: '好看' }] }, { by: '吃瓜路人', text: '今天也要早睡', pics: [], likes: 3, cmts: [] }]);
      else if (/这是微博热搜榜/.test(t)) c = JSON.stringify([{ title: 'Leon 深夜现身江边', tag: '爆', heat: 1200000, desc: '摄影师夜拍', about: 'Leon' }, { title: '降温', tag: '热', heat: 500000, desc: '', about: '' }]);
      else if (/微博上，.*发了一条/.test(t)) c = JSON.stringify([{ by: 'Leon', text: '注意休息', likes: 5, replyTo: '', authorLike: true }, { by: '路过的小猫咪', text: '抱抱', likes: 1 }]);
      else if (/微博上的定时 bot/.test(t)) c = '晚安，今天也辛苦了 🌙';
      else if (/付费订阅的私信频道/.test(t)) c = JSON.stringify([{ t: 'text', text: '(昵称) 今天吃饭了吗', desc: '', dur: 0, pick: '' }, { t: 'photo', text: '刚拍的', desc: '江边晚霞', dur: 0 }, { t: 'voice', text: '晚安啦(昵称)', dur: 12 }]);
      else if (/截图晒到粉丝群/.test(t)) c = JSON.stringify([{ nick: '小太阳', days: 120, text: '啊啊啊好看' }, { nick: '每天打卡', days: 3, text: '打卡' }]);
      else if (/开了艺人频道，粉丝付费订阅/.test(t)) c = JSON.stringify([{ by: 'Leon', nick: '路过的摄影爱好者', alt: true, days: 2, text: '早点睡' }, { by: 'Ken', nick: 'Ken', alt: false, days: 2, text: '给你留了蛋糕' }, { by: '', nick: '尖叫鸡', alt: false, days: 1, text: '啊啊啊' }]);
      else if (/用「泡泡信」给所有订阅/.test(t)) c = '亲爱的(昵称)：\n最近天气转凉……\nLeon';
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

const page = await boot([...WB, ...BB]);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  const ids = ['gysWeibo', 'gysBubble'];
  o.base = !!window.GYS && !!window.gysWb && !!window.gysBb && ids.every(id => GYX.FEATS.some(f => f.id === id)) && ids.every(id => GY_MINI_FEATURES.some(f => f.id === id))
    && ['gys_wb_post', 'gys_wb_cmt', 'gys_wb_alt', 'gys_bb_msg', 'gys_bb_real', 'gys_bb_fan', 'gys_bb_letter', 'gys_bb_fanletter'].every(k => GY_AUTONOMY_ACTIONS.some(a => a.key === k));
  const F = (window.gyHubFolders ? gyHubFolders() : []).find(f => f.id === 'hub_soft');
  o.hub = F && F.live && F.members.includes('gysWeibo') && F.members.includes('gysBubble');
  // 🧣 微博：整页、首页刷出来、热搜
  gysWeiboOpen('home'); await s(600);
  const R = document.getElementById('gys_weibo'), rc = R.getBoundingClientRect();
  o.wbFull = R.classList.contains('on') && rc.width >= 380 && rc.height >= 800 && R.querySelectorAll('.gys-tb').length === 5;
  const W = gysWbState();
  o.wbFeed = W.posts.some(p => p.by === 'c:9991' && /江边夜景/.test(p.text) && p.cmts.length >= 1) && W.hot.list.some(h => /Leon/.test(h.title));
  // 发一条微博 → 角色来评论
  gysWb.compose(); await s(50); document.getElementById('wbCmpT').value = '今天好累 #打工人#'; await gysWb.send(); await s(1800);
  const mine = W.posts.find(p => p.by === 'me');
  o.wbPost = mine && mine.topics.includes('打工人') && mine.cmts.length >= 1;
  // 主页：微博里和泡泡里同一个人的主页不一样；改了微博的不影响泡泡的
  o.wbProfGen = GYS.prof('weibo', 'c:9991').nick.startsWith('博名');
  gysWb.prof('c:9991'); await s(50); GYS.editProf('weibo', 'c:9991'); await s(50);
  document.getElementById('gysE_nick').value = 'Leon_Photo'; document.getElementById('gysE_bio').value = '只拍天空'; document.getElementById('gysE_link_bubble').value = 'leon_bb';
  GYS.__eSave(); await s(50);
  o.wbEdit = GYS.prof('weibo', 'c:9991').nick === 'Leon_Photo' && GYS.prof('weibo', 'c:9991').bio === '只拍天空' && GYS.linksOf('weibo', 'c:9991').some(([k, h]) => k === 'bubble' && h === 'leon_bb');
  // 🤖 bot：建一个定时 bot，现在发一条
  gysWb.botEdit(); await s(50);
  document.getElementById('wbB_name').value = '每日晚安bot'; document.getElementById('wbB_kind').value = 'timer'; document.getElementById('wbB_rule').value = '一句晚安';
  const bid = gysWb.__botDraft.id; gysWb.botSave(bid, true); await s(50);
  const bp = await gysWb.botRun(bid, 1); await s(50);
  o.wbBot = bp && /晚安/.test(bp.text) && W.bots.length === 1 && GYS.prof('weibo', W.bots[0].who).nick === '每日晚安bot';
  // 系统返回键（js/73 拿掉最上面的浮层）：先退一页，退到底才关；关着的时候右下角的发帖按钮藏起来
  o.fabHidden = getComputedStyle(document.getElementById('fabPost') || document.body).display === 'none' || !document.getElementById('fabPost');
  gysWb.open(W.posts[0].id); await s(50); const st0 = GYS.top('weibo');
  window.gyCloseOverlayEl(document.getElementById('gys_weibo')); await s(50);
  const r1 = document.getElementById('gys_weibo');
  o.backOne = st0 && r1 && r1.classList.contains('on') && GYS.top('weibo') !== st0;
  while (GYS.top('weibo')) GYS.back('weibo');
  window.gyCloseOverlayEl(document.getElementById('gys_weibo')); await s(50);
  o.backClose = !GYS.isOpen('weibo') && !document.body.classList.contains('gys-on');
  GYS.close('weibo');
  // 🫧 泡泡：订阅 Leon（昵称「小雨」）→ TA 发来消息，(昵称) 换成小雨
  gysBubbleOpen('find'); await s(400);
  const BR = document.getElementById('gys_bubble');
  o.bbFull = BR.classList.contains('on') && BR.querySelectorAll('.gys-tb').length === 4 && /Leon|泡名/.test(BR.innerText);
  window.__inputs = ['小雨']; await gysBb.sub('c:9991'); await s(400);
  const B = gysBbState();
  o.bbSub = B.subs['c:9991'] && B.subs['c:9991'].nick === '小雨' && B.rooms['c:9991'].length === 3;
  o.bbNotif = window.__notifs.some(a => /🫧/.test(a[0]) && a[5] && a[5].jump && a[5].jump.fn === 'gysBubbleOpenRoom');
  o.bbProfGen = GYS.prof('bubble', 'c:9991').nick.startsWith('泡名') || GYS.prof('bubble', 'c:9991').nick === 'Leon';
  o.bbProfDiff = GYS.prof('bubble', 'c:9991').nick !== GYS.prof('weibo', 'c:9991').nick;
  gysBb.room('c:9991'); await s(100);
  const txt = BR.querySelector('.bb-room').innerText;
  o.bbNick = /小雨 今天吃饭了吗/.test(txt) && !/昵称/.test(txt) && BR.querySelector('.bb-ph') && BR.querySelector('.bb-bub.voice');
  const inp = () => document.getElementById('bbIn');
  o.bbLimit = inp() && inp().maxLength === 15;
  for (const t of ['好吃', '想你', '晚安', '第四句']) { inp().value = t; gysBb.reply('c:9991'); await s(30); }
  const last = B.rooms['c:9991'][2];
  o.bbReply3 = last.rep.length === 3 && inp().disabled && /回满 3 次/.test(inp().placeholder);
  // 👥 别的粉丝回了什么、相册、收藏
  gysBb.wall('c:9991'); await s(200);
  o.bbWall = (B.wall['c:9991|' + last.id] || []).length === 2 && /小太阳/.test(BR.innerText);
  GYS.back('bubble'); gysBb.fav('c:9991', B.rooms['c:9991'][1].id); o.bbFav = B.fav.length === 1;
  // 💌 泡泡信
  await (async () => { const L = GY_AUTONOMY_ACTIONS.find(a => a.key === 'gys_bb_letter'); const c = myCharacters.find(c => c.id === 9991); const res = await L.run(c); o.bbLetter = res && B.rooms['c:9991'].some(m => m.t === 'letter'); })();
  // 营业完私下找她
  const c1 = myCharacters.find(c => c.id === 9991);
  const real = GY_AUTONOMY_ACTIONS.find(a => a.key === 'gys_bb_real');
  B.rooms['c:9991'].forEach(m => { m.real = 0; }); B.last = {};
  o.bbRealNeed = real.need(c1); const rr = await real.run(c1);
  o.bbReal = rr && window.__reach.includes(9991);
  // ② 自己开频道：发一条 → 粉丝刷屏，Leon 用小号 → 猜中
  gysBb.tab('studio'); await s(50); await gysBb.openMine(); await s(50);
  document.getElementById('bbMy').value = '今天的(昵称)们早点睡'; await gysBb.sendMine(); await s(300);
  const m = B.my.msgs[0];
  o.bbFans = m && m.fan.length === 3 && m.fan.some(f => f.who === 'c:9991' && f.alt && f.nick === '路过的摄影爱好者') && m.fan.some(f => f.who === 'c:9992' && !f.alt);
  const altR = m.fan.find(f => f.alt);
  o.bbAltHidden = !/Leon/.test(document.querySelector('#gys_bubble .bb-fan:not(.known)') ? document.querySelector('#gys_bubble .bb-fan:not(.known)').innerText : 'Leon');
  window.__reach = [];
  const gp = gysBb.guess(m.id, altR.id); await s(50);
  const opt = [...document.querySelectorAll('.bb-sheet-in div[data-i]')].find(d => d.textContent === 'Leon'); opt.click(); await gp; await s(50);
  o.bbGuess = altR.found === 1 && window.__reach.includes(9991);
  // TA 当粉丝来回你（自主行动）
  const fan = GY_AUTONOMY_ACTIONS.find(a => a.key === 'gys_bb_fan');
  const c2 = myCharacters.find(c => c.id === 9992); m.fan = m.fan.filter(f => f.who !== 'c:9992');
  o.bbFanAct = fan.need(c2) && !!(await fan.run(c2)) && m.fan.some(f => f.who === 'c:9992');
  // 注入：TA 知道泡泡上 / 微博上的事
  const ctx = typeof __gyxCtxFor === 'function' ? __gyxCtxFor('9991') : '';
  o.ctx = /【泡泡】/.test(ctx) && /小雨/.test(ctx) && /营业/.test(ctx) && /【你们最近在微博上】/.test(ctx);
  // 记忆总览、今天、小组件
  o.wid = !!(window.__gyPmW && window.__gyPmW.WD.gysWbHot && window.__gyPmW.WD.gysBbLast);
  // 改泡泡主页（头像能换的地方、生日字段）
  gysBb.editProf('c:9991'); await s(50);
  o.bbEdit = !!document.getElementById('gysE_bday') && !!document.querySelector('#gys_bubble .gys-eav') && !!document.querySelector('#gys_bubble .gys-ecover');
  document.getElementById('gysE_bday').value = '3-14'; GYS.__eSave(); await s(50);
  o.bbEdit = o.bbEdit && GYS.prof('bubble', 'c:9991').bday === '3-14';
  // 数据存下来了
  await s(500);
  return o;
});
for (const [k, v] of Object.entries(r)) check(k, v);
// 全家桶：两个软件都在，不报错
const p2 = await boot(ALL);
const r2 = await p2.evaluate(() => ({ both: ['gysWeibo', 'gysBubble'].every(id => GY_MINI_FEATURES.some(f => f.id === id)) && !!window.GYS }));
check('bundle', r2.both);
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const bad = results.filter(x => !x.ok);
results.forEach(x => console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.extra ? '  ' + x.extra : '')));
console.log(`\n${results.length - bad.length}/${results.length} 通过`);
process.exit(bad.length ? 1 : 0);
