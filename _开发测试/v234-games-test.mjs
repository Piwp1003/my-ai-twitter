// v234：8 个新游戏（谁是真的TA / 现实捉迷藏 / 时间循环 / 双人密室 / 命运卡牌 / 海龟汤 / 我们的恋综 / 剧本杀）+ 🔄 插件自动检查更新
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
import http from 'http';
const root = process.cwd();
if (fs.existsSync(path.join(root, 'js', '90-bailu-cards.js'))) { console.log('（白露不测）'); process.exit(0); }
const PLUG = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, geolocation: { latitude: 31.2304, longitude: 121.4737 }, permissions: ['geolocation'] });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ PLUG }) => {
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  [[9991, 'Leon', '法国摄影师，嘴硬心软'], [9992, 'Ken', '厨师，话少'], [9993, 'Mia', '画家，爱开玩笑']].forEach(([id, n, p]) => myCharacters.push({ id, name: n, persona: p, worldbooks: [], diaryData: { letters: [], diaries: [] } }));
  globalChats['9991'] = [{ sender: 'me', text: '还记得我们第一次去的那家咖啡店吗', timestamp: Date.now() - 6e4, readBy: [] }]; currentChatSessionId = '9991';
  const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); let c = '嗯。';
    if (/谁是真的你」：她问了/.test(t)) c = '记得，那家咖啡店你点了焦糖玛奇朵。';
    else if (/冒牌货的回答/.test(t)) c = '{"a":"你在我心里永远是最好的宝贝。","b":"那天我们在海边看日落你忘了？"}';
    else if (/玩完「谁是真的你」/.test(t)) c = '就知道你认得出我。';
    else if (/设计一个「时间循环」故事/.test(t)) c = '{"title":"十月二十号","premise":"每晚他都会接到一个电话离开，然后你醒来又是这一天。","goal":"让他留下来","secret":"电话是他妈妈打来的"}';
    else if (/时间循环」故事的旁白/.test(t)) c = /走到深夜结尾/.test(t) ? '{"scene":"电话又响了。你醒来，又是早上。","broken":false}' : '{"scene":"他在楼下等你。","choices":["跟着他","问电话","装傻"],"clue":"他手机里存着一个没备注的号码"}';
    else if (/双人密室/.test(t) && /隔着墙说话/.test(t)) c = '我这边有些东西，你想先听哪个？';
    else if (/逃出了/.test(t)) c = '出来了！让我抱一下。';
    else if (/命运卡牌」：一张张卡片/.test(t)) c = JSON.stringify([1, 2, 3, 4, 5].map(i => ({ t: '卡' + i, l: '不', ld: [-30, 0, 0, 0], r: '好', rd: [30, 0, 0, 0], say: '嗯' })));
    else if (/命运卡牌」，你们一起过了/.test(t)) c = '再来一次。';
    else if (/出一道原创海龟汤/.test(t)) c = '{"title":"湿掉的信","face":"她读完信把它泡进水里，然后笑了。","truth":"信是用隐形墨水写的，泡水后显出我爱你。"}';
    else if (/你在主持海龟汤/.test(t)) c = /隐形墨水/.test(t.split('她问')[1] || '') ? '{"a":"是","say":"厉害","solved":true}' : '{"a":"不是","say":"","solved":false}';
    else if (/她在给你出海龟汤/.test(t)) c = /你：/.test(t) ? '{"q":"","guess":"他在给她惊喜","say":"我猜到了"}' : '{"q":"跟爱有关吗？","guess":"","say":""}';
    else if (/玩完一局海龟汤/.test(t)) c = '不愧是我们。';
    else if (/恋爱综艺的第/.test(t)) c = '{"theme":"初次见面","open":[{"name":"Leon","t":"我来只为一个人。"},{"name":"Ken","t":"……"}]}';
    else if (/你在上恋综/.test(t)) c = '{"scene":"他带你去了海边。","opts":[{"t":"牵手","h":12,"react":"他握紧了"},{"t":"谢谢","h":5,"react":"不客气"},{"t":"问别人","h":-3,"react":"哼"}]}';
    else if (/匿名心动短信/.test(t)) c = '{"texts":[{"name":"Leon","t":"今天你很好看"},{"name":"Ken","t":"明天一起吃早餐"}],"back":"Ken 一晚上没说话。"}';
    else if (/恋综告白夜/.test(t)) c = '{"lines":[{"name":"Leon","t":"我等了六集。"},{"name":"Ken","t":"恭喜。"}]}';
    else if (/设计一个原创剧本杀/.test(t)) c = JSON.stringify({ title: '雨夜山庄', setting: '暴雨封山，主人倒在书房。', victim: '林先生', roles: [{ name: 'Leon', role: '管家', pub: '跟了二十年', secret: '改过遗嘱', alibi: '在厨房', killer: false }, { name: 'Ken', role: '侄子', pub: '欠债', secret: '去过书房', alibi: '在房间', killer: true }, { name: 'Mia', role: '画家', pub: '来画像', secret: '藏了信', alibi: '在画室', killer: false }], spots: [1, 2, 3, 4, 5, 6].map(i => ({ name: '地点' + i, clue: '线索' + i })), truth: '侄子下了药。' });
    else if (/你在玩剧本杀，正在演/.test(t)) c = /凶手。真相/.test(t) ? '我一直在房间里，你去问管家。' : '我确实有秘密，但不是我。';
    else if (/剧本杀《[^》]*》结束/.test(t)) c = '{"lines":[{"name":"Ken","t":"被你看穿了。"},{"name":"Leon","t":"我改过遗嘱。"},{"name":"Mia","t":"信是我藏的。"}]}';
    else if (/捉迷藏，你「藏」在/.test(t)) c = '被你找到了，奖励一个抱抱。';
    return { choices: [{ message: { content: c } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.__reach = []; window.sendProactiveChatMessage = async c => { window.__reach.push(window.__gyxNudgeFor(c.id)); }; try { sendProactiveChatMessage = window.sendProactiveChatMessage; } catch (e) {}
  PLUG.forEach(p => executePluginOnLoad(p)); GYX.set('gyxHot', false);
}, { PLUG });
await page.waitForTimeout(3500);
const IDS = ['gyxReal', 'gyxSeek', 'gyxLoop', 'gyxRoom', 'gyxFate', 'gyxSoup', 'gyxShow', 'gyxCase'];
const base = await page.evaluate(IDS => ({ feats: IDS.filter(id => !GYX.FEATS.some(f => f.id === id)), games: IDS.filter(id => !registeredMiniGames.some(g => g.id === id)),
  acts: ['gyx_real', 'gyx_seek', 'gyx_loop', 'gyx_room', 'gyx_fate', 'gyx_soup', 'gyx_show', 'gyx_case'].filter(k => !GY_AUTONOMY_ACTIONS.some(a => a.key === k)),
  w: ['gyxRealW', 'gyxSeekW', 'gyxLoopW', 'gyxRoomW', 'gyxFateW', 'gyxSoupW', 'gyxShowW', 'gyxCaseW'].filter(k => !window.__gyPmW.WD[k]), mem: IDS.filter(k => !gyMemExList().includes(k)),
  top: GY_MINI_FEATURES.filter(f => IDS.includes(f.id)).length, hidden: true }), IDS);
check('8 个游戏都有开关、🎮 游戏入口、自主行动、小组件、记忆总览', !base.feats.length && !base.games.length && !base.acts.length && !base.w.length && !base.mem.length, JSON.stringify(base));

const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}, rm = id => document.getElementById(id)?.remove();
  // 🎭
  gyxRealStart('9991'); for (let i = 0; i < 3; i++) { await gyxRealAsk('第一次见面的咖啡店？'); const cur = document.querySelectorAll('#gyxRealOv .rl-o'); o['rl' + i] = cur.length === 3; const real = [...cur].findIndex(e => /焦糖玛奇朵/.test(e.innerText)); await gyxRealPick(real); }
  o.real = gyxRealData().games[0] && gyxRealData().games[0].score === 3 && /认得出/.test(gyxRealData().games[0].line); rm('gyxRealOv');
  // 📍 屋里版 + 出门版
  gyxSeekStart('9991', 'room'); const t = gyxSeekLive().room.t; for (let i = 0; i < 9 && gyxSeekLive(); i++) if (i !== t) gyxSeekRoom(i); o.roomHint = !!gyxSeekLive() && !!gyxSeekLive().hint; gyxSeekRoom(t); await s(300); o.seekRoom = gyxSeekData().log[0] && gyxSeekData().log[0].found && /抱抱/.test(gyxSeekData().log[0].line); rm('gyxSeekOv');
  gyxSeekStart('9991'); await s(1500); const L = gyxSeekLive(); o.geo = !!(L && L.tgt && L.d0 >= 140 && L.d0 <= 360); gyxSeekCheat(); await s(300); o.geoFound = gyxSeekData().log[0].mode === 'geo'; rm('gyxSeekOv');
  // 🔁
  await gyxLoopNew('9991'); await gyxLoopGo('9991'); for (let i = 0; i < 4; i++) await gyxLoopPick('9991', 0); const st = gyxLoopData().stories[0];
  o.loop = st.loops.length === 1 && st.loops[0].end && st.clues.length === 1 && !st.done; await gyxLoopGo('9991'); o.loopOnce = st.loops.length === 1; await gyxLoopGo('9991', true); o.loop2 = st.loops.length === 2; rm('gyxLoopOv');
  // 🗝️
  gyxRoomStart('9991'); const G = gyxRoomLive(); o.split = G.mine.length === 2 && G.his.length === 2 && !G.mine.some(m => G.his.some(h => h.i === m.i));
  document.getElementById('gyxRmIn').value = '你那边有什么？'; await gyxRoomSay(); o.roomTalk = G.chat.slice(-1)[0].who === 'ta';
  G.code.forEach((d, i) => gyxRoomDial(i, d)); await gyxRoomTry(); o.escaped = !gyxRoomLive() && gyxRoomData().log[0].ok; rm('gyxRoomOv');
  // 🃏
  await gyxFateStart('9991'); for (let i = 0; i < 3 && gyxFateLive(); i++) await gyxFatePick(1); o.fate = !gyxFateLive() && !!gyxFateData().ends['0-1'] && gyxFateData().runs[0].days === 2; rm('gyxFateOv');
  // 🐢 TA 出题
  await gyxSoupStart('9991', 'ta'); document.getElementById('gyxSpQ').value = '跟钱有关吗'; await gyxSoupAsk(); o.soupNo = gyxSoupLive().qa[0].a === '不是';
  document.getElementById('gyxSpQ').value = '是隐形墨水写的吗'; await gyxSoupAsk(); o.soupWin = gyxSoupData().log[0].solved && !gyxSoupLive(); rm('gyxSoupOv');
  // 🐢 我出题
  await gyxSoupStart('9991', 'me'); document.getElementById('gyxSpF').value = '他每天买两张电影票，一个人看完。'; document.getElementById('gyxSpT').value = '他在给异地的她占座，一起打着电话看'; await gyxSoupSet(); o.taAsk = /跟爱有关/.test(gyxSoupLive().pending.q);
  await gyxSoupAns('是'); o.taGuess = !!gyxSoupLive().pending.guess; await gyxSoupAns('对'); o.soupMe = gyxSoupData().log[0].mode === 'me' && gyxSoupData().log[0].solved; rm('gyxSoupOv');
  // 💘
  gyxShowPick('9991'); gyxShowPick('9992'); await gyxShowNew(); const S0 = gyxShowData().seasons[0]; o.ep1 = S0.eps.length === 1 && S0.eps[0].open.length === 2;
  await gyxShowDate('9991'); await gyxShowReply(0); await gyxShowText('9992'); o.show = S0.hearts['9991'] === 12 && S0.hearts['9992'] === 5 && S0.eps[0].texts.length === 2 && /没说话/.test(S0.eps[0].back);
  for (let i = 1; i < 6; i++) { await gyxShowNext(); await gyxShowDate('9992'); await gyxShowReply(1); await gyxShowText('9992'); }
  await gyxShowNext(); o.toFinal = !!S0.toFinal; await gyxShowFinal('9991'); o.final = S0.done && S0.final === '9991' && S0.finalLines.length === 2; rm('gyxShowOv');
  // 🔍
  ['9991', '9992', '9993'].forEach(id => gyxCasePick(id)); await gyxCaseNew(); const K = gyxCaseData().cases[0]; o.case = K.roles.length === 3 && K.roles.filter(x => x.killer).length === 1 && K.spots.length === 6;
  for (let i = 0; i < 6; i++) await gyxCaseSearch(i); o.search = K.spots.filter(x => x.found).length === 4;
  gyxCaseStage('ask'); document.getElementById('gyxCsQ').value = '那晚你在哪？'; await new Promise(r => { gyxCaseAsk('9992'); setTimeout(r, 400); }); o.lie = /问管家/.test(K.ask[0].a);
  gyxCaseStage('vote'); await new Promise(r => { gyxCaseVote('9992'); setTimeout(r, 400); }); o.solved = K.done && K.ok && K.epilogue.length === 3; rm('gyxCaseOv');
  // 今天 + 自主行动由头
  gyTodaySet(true); gyTodayRender(); await s(200); const tt = document.body.innerText; o.today = ['🎭 谁是真的TA', '📍 捉迷藏', '🔁 时间循环', '🗝️ 双人密室', '🃏 命运卡牌', '🐢 海龟汤'].filter(w => !tt.includes(w));
  await GY_AUTONOMY_ACTIONS.find(a => a.key === 'gyx_soup').run(myCharacters.find(c => c.id === 9993)); o.reach = /海龟汤/.test(window.__reach.slice(-1)[0]);
  return o;
});
check('🎭 谁是真的TA：三个回答里有一个真的，认出 3/3，TA 说话', r.rl0 && r.rl2 && r.real, JSON.stringify(r));
check('📍 现实捉迷藏：屋里版冷热提示、找到解锁 TA 的话；出门版在 150~350 米外放了一个点', r.roomHint && r.seekRoom && r.geo && r.geoFound, JSON.stringify(r));
check('🔁 时间循环：四段选择走完一轮、发现线索；同一天不能再来，第二天才能醒来', r.loop && r.loopOnce && r.loop2, JSON.stringify(r));
check('🗝️ 双人密室：线索两人各一半，TA 隔墙回话，输对密码逃出', r.split && r.roomTalk && r.escaped, JSON.stringify(r));
check('🃏 命运卡牌：感情爆满 → 「窒息」结局收进图鉴', r.fate, JSON.stringify(r));
check('🐢 海龟汤：TA 出题按汤底答是/不是、猜中结束；我出题 TA 会问会猜', r.soupNo && r.soupWin && r.taAsk && r.taGuess && r.soupMe, JSON.stringify(r));
check('💘 恋综：开场采访、约会选回应、心动短信和镜头外、六集后告白夜', r.ep1 && r.show && r.toFinal && r.final, JSON.stringify(r));
check('🔍 剧本杀：一个凶手、只能搜 4 处、凶手盘问时撒谎、指认正确后复盘', r.case && r.search && r.lie && r.solved, JSON.stringify(r));
check('「今天」面板有对应一节；TA 会主动约你玩', !r.today.length && r.reach, JSON.stringify(r));

// 🔄 插件自动检查更新：起一个本地网站
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.statusCode = 404; return s.end(); } s.setHeader('Content-Type', f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.js') ? 'application/javascript; charset=utf-8' : f.endsWith('.json') ? 'application/json; charset=utf-8' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream'); fs.createReadStream(f).pipe(s); }).listen(0);
const port = srv.address().port;
const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push('[http] ' + e.message)); p2.on('dialog', d => d.accept());
await p2.goto(`http://127.0.0.1:${port}/index.html`);
await p2.waitForFunction(() => window.__guyuBooted && typeof gyPluginUpdateCheck === 'function', { timeout: 20000 });
const up = await p2.evaluate(async ({ old }) => {
  window.__gyPlgNoReload = 1; localStorage.setItem('gyPlgAutoUpd', '0');
  plugins.length = 0; plugins.push(Object.assign({}, old, { id: 'plg_x', enabled: false, onLoad: '/* 旧版 */' }));
  window.appConfirm = async () => true; try { appConfirm = window.appConfirm; } catch (e) {}
  const d = await gyPluginUpdateCheck(true);
  const p = plugins.find(x => x.name === old.name);
  return { upd: d && d.upd.length, add: d && d.add.length, same: p && p.onLoad === old.onLoad, keepOff: p && p.enabled === false && p.id === 'plg_x', total: plugins.length, again: ((await gyPluginUpdateCheck(true) || {}).upd || []).length };
}, { old: PLUG[1] });
srv.close();
check('🔄 插件自动检查更新：网站上的插件比装的新就提醒，更新后保留你的开关，没装的合集一起补上；更新完再查就是最新', up.upd === 1 && up.add === PLUG.length - 1 && up.same && up.keepOff && up.total === PLUG.length && up.again === 0, JSON.stringify(up));

const gd = await page.evaluate(async () => { const o = {}; gyGuideOpen(); await new Promise(r => setTimeout(r, 200)); const t = document.getElementById('gyGuideOv').innerText; document.getElementById('gyGuideOv').remove();
  o.has = ['谁是真的 TA', '现实捉迷藏', '时间循环', '双人密室', '命运卡牌', '海龟汤', '我们的恋综', '剧本杀', '插件自动检查更新', 'TA 的秘密计划', '现实小任务', '一起安静待着', '我们的小习惯', '角标和分享', 'TA 被你影响'].filter(w => !t.includes(w));
  o.q = ['剧本杀在哪', '海龟汤怎么玩', '插件怎么更新', '网页更新了没变', '恋综', '捉迷藏'].map(q => (gyGuideSearchApi(q)[0] || {}).id); return o; });
check('📘 指南更新：8 个游戏、上一批 6 个、插件自动更新、网页不更新都写进去，客服搜得到', !gd.has.length && JSON.stringify(gd.q) === '["g_case","g_soup","plgupd","pages","g_show","g_seek"]', JSON.stringify(gd));

const bad = errs.filter(e => !/x\.test|Failed to fetch|ERR_|net::/.test(e));
check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
