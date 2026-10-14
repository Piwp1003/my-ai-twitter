// v235：🛟 客服——弹窗提醒可以关（窗口右上角 🔔 + 全部开关里）；客服人设可切换（默认客服 / 换成某个角色 / 自己写）
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
if (fs.existsSync(path.join(root, 'js', '90-bailu-cards.js'))) { console.log('（白露不测）'); process.exit(0); }
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof gyHelpOpen === 'function', { timeout: 20000 });
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师，嘴硬心软，叫她"小笨蛋"', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  window.__sys = []; const fake = async (api, msgs) => { window.__sys.push(JSON.stringify(msgs)); return { choices: [{ message: { content: '小笨蛋，这个在设置里。' } }] }; };
  window.callChatCompletionAPI = fake; try { callChatCompletionAPI = fake; } catch (e) {}
  window.__nj = []; const nj = window.gyNotifyJump; window.gyNotifyJump = (c, t, d, j) => { window.__nj.push({ c: c && c.name, t }); };
  o.defs = ['helpPop'].every(k => AUTO_FEATURE_DEFS.some(f => f.key === k)) && isAutoOn('helpPop');
  gyHelpOpen('chat'); await s(300);
  o.def = gyHelpWho().mode === 'cs' && /🛟 客服/.test(document.getElementById('gyhTitle').innerText) && /🔔/.test(document.getElementById('gyhPopBtn').innerText);
  // 弹窗开着：报一个问题 → 弹
  await gyHelpReport('测试问题一', '这是提示'); await s(100); o.popOn = window.__nj.some(x => /客服/.test(x.t) && /测试问题一/.test(x.t));
  // 点 🔔 关掉
  document.querySelector('.gyh-cfg .gyh-pop').click(); await s(100); o.offBtn = !isAutoOn('helpPop') && /不弹窗/.test(document.getElementById('gyhPopBtn').innerText) && /弹窗提醒：关/.test(document.querySelector('.gyh-cfg .gyh-pop').innerText);
  const u0 = await (async () => 0)(); await gyHelpReport('测试问题二', '提示二'); await s(100); o.popOff = !window.__nj.some(x => /测试问题二/.test(x.t));
  gyHelpOpen('issues'); await s(100); o.stillLogged = /测试问题二/.test(document.getElementById('gyhBody').innerText); gyHelpOpen('chat'); await s(100);
  // 换成角色
  const sel = document.querySelector('.gyh-cfg select'); o.opts = sel && [...sel.options].map(x => x.text).join('|');
  sel.value = '9991'; sel.dispatchEvent(new Event('change')); await s(200);
  o.char = gyHelpWho().name === 'Leon' && /Leon/.test(document.getElementById('gyhTitle').innerText);
  await gyHelpAsk('有没有办法让月亮唱歌给我听'); await s(200);
  o.sysChar = /以「Leon」的身份/.test(window.__sys.slice(-1)[0] || '') && /小笨蛋/.test(window.__sys.slice(-1)[0] || '') && /只能来自下面的使用指南/.test(window.__sys.slice(-1)[0] || '');
  // 弹窗打开时用角色的名字
  gyHelpPop(true); await gyHelpReport('测试问题三', '提示三'); await s(100); o.popChar = window.__nj.slice(-1)[0] && window.__nj.slice(-1)[0].c === 'Leon' && /^Leon/.test(window.__nj.slice(-1)[0].t);
  // 自己写一个
  const sel2 = document.querySelector('.gyh-cfg select'); sel2.value = 'custom'; sel2.dispatchEvent(new Event('change')); await s(100);
  document.getElementById('gyhPN').value = '学姐'; document.getElementById('gyhPE').value = '🎓'; document.getElementById('gyhPD').value = '毒舌但很靠谱'; gyHelpCustomSave(); await s(200);
  o.custom = gyHelpWho().mode === 'custom' && /学姐/.test(document.getElementById('gyhTitle').innerText) && /🎓/.test(document.querySelector('.gyh-m.cs .gyh-av').innerText);
  await gyHelpAsk('怎么让星星跳舞'); await s(200); o.sysCustom = /「学姐」：毒舌但很靠谱/.test(window.__sys.slice(-1)[0] || '');
  // 换回默认，刷新后还记得
  await gyHelpPersona('cs'); o.back = gyHelpWho().mode === 'cs';
  await gyHelpPersona('9991'); document.getElementById('gyHelpOv').remove(); return o;
});
check('客服窗口右上角有 🔔 按钮，全部开关里也有「客服：有新问题时弹窗提醒」，默认开', r.defs && r.def, JSON.stringify(r));
check('开着时新问题会弹；点 🔔 关掉后不弹，但问题照样记在「发现的问题」里', r.popOn && r.offBtn && r.popOff && r.stillLogged, JSON.stringify(r));
check('🎭 人设能换成角色：标题、头像、问 API 时用角色的语气（内容仍只来自指南），弹窗也用角色的名字', r.char && r.sysChar && r.popChar && /Leon/.test(r.opts) && /客服（默认）/.test(r.opts), JSON.stringify(r));
check('🎭 也能自己写一个人设（名字 / 头像 / 性格），能换回默认', r.custom && r.sysCustom && r.back, JSON.stringify(r));
await page.reload(); await page.waitForFunction(() => window.__guyuBooted && typeof gyHelpOpen === 'function', { timeout: 20000 });
const keep = await page.evaluate(async () => { myCharacters.push({ id: 9991, name: 'Leon', persona: 'x', worldbooks: [], diaryData: { letters: [], diaries: [] } }); gyHelpOpen('chat'); await new Promise(r => setTimeout(r, 800)); return gyHelpWho().name; });
check('刷新之后还是你选的人设', keep === 'Leon', keep);
const gd = await page.evaluate(async () => { const o = {}; gyGuideOpen(); await new Promise(r => setTimeout(r, 200)); const t = document.getElementById('gyGuideOv').innerText; document.getElementById('gyGuideOv').remove();
  o.has = ['API 都花在哪', '走主 API 的', '走副 API 的', '完全不调 API 的', '换客服的人设', '客服弹不弹窗'].filter(w => !t.includes(w));
  o.q = ['哪些功能走副 API', '怎么省钱', '怎么换客服人设', '客服弹窗太吵', '语音要钱吗', '生图用什么接口'].map(q => (gyGuideSearchApi(q)[0] || {}).id); return o; });
check('📘 指南更新：🔑 API 都花在哪（主 / 副 / 向量 / 生图 / 语音 / 联网 / 不调用 / 省钱）、客服弹窗和人设；客服搜得到', !gd.has.length && JSON.stringify(gd.q) === '["api_sub","api_save","cs_who","cs_pop","api_tts","api_img"]', JSON.stringify(gd));
const bad = errs.filter(e => !/x\.test|Failed to fetch/.test(e));
check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
