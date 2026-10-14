// v238：📸 同一秒、💌 有条件才能拆的信、📜 TA的往事、🪴 TA的成长日志、🗳️ TA的人生选择题 + API 分工表更新
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
  myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师，嘴硬心软。', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  const H = []; const t0 = Date.now() - 10 * 864e5; for (let i = 0; i < 120; i++) H.push({ sender: i % 2 ? 9991 : 'me', text: i === 119 ? '今天好累，想哭' : '聊天' + i, timestamp: t0 + i * 6e6, readBy: ['me'] });
  globalChats['9991'] = H; currentChatSessionId = '9991';
  const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); let c = '嗯。';
    if (/「此刻！」/.test(t)) c = '{"desc":"桌上一杯快凉掉的咖啡","line":"你在干嘛"}';
    else if (/同一秒你拍的是/.test(t)) c = '{"line":"原来你那边在下雨","saw":"窗外的雨"}';
    else if (/信封上写着「/.test(t)) c = '如果你现在打开了，说明你难过了。我在。';
    else if (/想跟她讲一段以前的事/.test(t)) c = '{"title":"槐树下","text":"小时候我家楼下有棵老槐树……","sum":"小时候在槐树下等人"}';
    else if (/刚跟她讲了一段往事/.test(t)) c = '等的是我外婆。';
    else if (/有没有一点真实的、细小的变化/.test(t)) c = '{"change":"我学会把想你说出口了","why":"她说喜欢听我直说","edit":"会把在意直接说出口，不再嘴硬"}';
    else if (/拿不定主意的事/.test(t)) c = '{"q":"要不要把头发剪短？","ctx":"天热了","opts":["剪","别剪"]}';
    else if (/你决定听她的/.test(t)) c = '好，听你的。';
    else if (/结果怎么样/.test(t)) c = '剪了，同事都说好看。';
    return { choices: [{ message: { content: c } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.callChatCompletionAPI = async (api, p) => fake(api, p); try { callChatCompletionAPI = window.callChatCompletionAPI; } catch (e) {}
  window.gymapWeatherInfo = () => ({ desc: '小雨', now: 18 });
  window.appConfirm = async () => true; try { appConfirm = window.appConfirm; } catch (e) {}
  PLUG.forEach(p => executePluginOnLoad(p)); GYX.set('gyxHot', false);
}, { PLUG });
await page.waitForTimeout(3500);
const IDS = ['gyxMoment', 'gyxSeal', 'gyxPast', 'gyxEvolve', 'gyxDilemma'];
const base = await page.evaluate(IDS => ({ f: IDS.filter(id => !GYX.FEATS.some(f => f.id === id)), a: ['gyx_moment', 'gyx_seal', 'gyx_past', 'gyx_evolve', 'gyx_dilemma', 'gyx_dilemma_result'].filter(k => !GY_AUTONOMY_ACTIONS.some(a => a.key === k)), w: ['gyxMomentW', 'gyxSealW', 'gyxPastW', 'gyxEvolveW', 'gyxDilemmaW'].filter(k => !window.__gyPmW.WD[k]), m: IDS.filter(k => !gyMemExList().includes(k)),
  hub: (() => { const I = gyHubInfo(); const all = I.FOLDERS.flatMap(F => F.kids).concat(I.HOSTS.flatMap(h => h.kids)); return IDS.filter(id => !all.includes(id)); })() }), IDS);
check('五个新插件：开关、自主行动、小组件、记忆总览都有，也都放进了合集', !base.f.length && !base.a.length && !base.w.length && !base.m.length && !base.hub.length, JSON.stringify(base));
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}, rm = id => document.getElementById(id)?.remove();
  // 📸
  await gyxMomentNow('9991'); const M = gyxMomentData().list[0]; o.mo = M && /咖啡/.test(M.ta.desc) && /此刻！/.test(document.getElementById('gyxMomentOv').innerText);
  const cv = document.createElement('canvas'); cv.width = 30; cv.height = 30; const blob = await new Promise(r => cv.toBlob(r, 'image/png')); const dt = new DataTransfer(); dt.items.add(new File([blob], 'a.png', { type: 'image/png' })); const inp = document.createElement('input'); inp.type = 'file'; inp.files = dt.files;
  await gyxMomentShoot(M.id, inp); await s(200); o.mo2 = !!M.me && /下雨/.test(M.react) && M.saw === '窗外的雨' && document.querySelectorAll('#gyxMomentOv .mo-two img').length >= 1; rm('gyxMomentOv');
  // 💌
  globalChats['9991'].push({ sender: 'me', text: '今天好累，想哭', timestamp: Date.now() - 6e4, readBy: [] });
  await gyxSealWrite('9991', 'rain'); await gyxSealWrite('9991', 'sad'); await gyxSealWrite('9991', 'walk'); const L = gyxSealData().list;
  const rain = L.find(x => x.cond === 'rain'), sad = L.find(x => x.cond === 'sad'), walk = L.find(x => x.cond === 'walk');
  o.can = gyxSealCan(rain.id) && gyxSealCan(sad.id) && !gyxSealCan(walk.id);
  await gyxSealOpenOne(walk.id); o.locked = !walk.opened; await gyxSealOpenOne(sad.id); o.opened = sad.opened && /难过/.test(document.getElementById('gyxSealOv').innerText); rm('gyxSealOv');
  // 📜
  gyxPastScan(); gyxPastOpen('9991'); o.ready = /听 TA 讲/.test(document.getElementById('gyxPastOv').innerText) && /🔒/.test(document.getElementById('gyxPastOv').innerText);
  await gyxPastTell('9991', 0); const P = gyxPastData().by['9991'].ch[0]; o.past = P && P.title === '槐树下' && /槐树/.test(__gyxCtxFor('9991'));
  document.getElementById('gyxPaQ').value = '你等的是谁？'; await gyxPastAsk('9991', 0); o.pastQ = /外婆/.test(P.qa[0].a); rm('gyxPastOv');
  // 🪴
  await gyxEvolveRun('9991'); const E = gyxEvolveData().log[0]; o.ev = E && E.state === 'wait';
  await gyxEvolveDecide(E.id, true); const c = myCharacters.find(x => x.id === 9991); o.persona = /和她在一起之后的变化/.test(c.persona) && /不再嘴硬/.test(c.persona);
  await gyxEvolveUndo(E.id); o.undo = !/不再嘴硬/.test(c.persona) && !/和她在一起之后的变化/.test(c.persona) && /法国摄影师/.test(c.persona); rm('gyxEvolveOv');
  // 🗳️
  await gyxDilemmaAsk('9991'); const Q = gyxDilemmaData().list[0]; o.dq = Q && Q.opts.length === 2 && globalChats['9991'].some(m => /剪短/.test(m.text));
  await gyxDilemmaPick(Q.id, 0); o.dp = Q.pick === 0 && /听你的/.test(Q.line) && /照做/.test(__gyxCtxFor('9991'));
  Q.due = Date.now() - 1; await gyxDilemmaReport(Q.id); o.dr = /好看/.test(Q.outcome) && /结果：剪了/.test(__gyxCtxFor('9991')); rm('gyxDilemmaOv');
  gyTodaySet(true); gyTodayRender(); await s(200); o.today = ['📸 同一秒', '📜 往事'].filter(w => !document.body.innerText.includes(w));
  return o;
});
check('📸 同一秒：TA 拍下 TA 的这一秒，你拍照交上去，两张并排、TA 看图回一句', r.mo && r.mo2, JSON.stringify(r));
check('💌 有条件才能拆的信：下雨、你说难过时能拆；没走满一万步的拆不开', r.can && r.locked && r.opened, JSON.stringify(r));
check('📜 TA 的往事：聊够了解锁第一章，讲完进提示词，能追问；后面几章锁着', r.ready && r.past && r.pastQ, JSON.stringify(r));
check('🪴 TA 的成长日志：你同意才写进人设，撤回后人设恢复原样', r.ev && r.persona && r.undo, JSON.stringify(r));
check('🗳️ TA 的人生选择题：TA 来问 → 你选 → TA 照做 → 过几天告诉你结果', r.dq && r.dp && r.dr, JSON.stringify(r));
check('「今天」面板有对应一节', !r.today.length, JSON.stringify(r.today));
const api = await page.evaluate(() => { const t = document.querySelector('.gy-api-split').innerText; return { t: /推文记忆总结/.test(t) && /聊天自动总结/.test(t) && /画图/.test(t) && /语音/.test(t) && /完全不调 API/.test(t) && /同一秒/.test(t) && /游戏厅/.test(t), q: ['往事在哪', '同一秒', '有条件的信', '帮TA选', '成长日志'].map(q => (gyGuideSearchApi(q)[0] || {}).id) }; });
check('设置 → API 与模型的分工表更新了（主 / 副 / 向量 / 画图 / 语音 / 只联网 / 不调用）；指南写进了五个新功能', api.t && JSON.stringify(api.q) === '["past","moment","seal","dilemma","evolve"]', JSON.stringify(api));
const bad = errs.filter(e => !/x\.test|Failed to fetch/.test(e));
check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
