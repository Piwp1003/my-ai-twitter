// v243 / v244：📊 Token 用量——每一次调用都认得出「项目 · 细项」（不再有「其它」）、每次调用的流水、此刻里同一个面板
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const PLUG = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
// 假的模型接口：聊天回 usage，向量回 usage
await page.route(/^https?:\/\//, r => {
  const u = r.request().url();
  if (/\/embeddings/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }], usage: { prompt_tokens: 12, total_tokens: 12 } }) });
  if (/chat\/completions/.test(u)) {
    const body = JSON.parse(r.request().postData() || '{}');
    if (body.stream) {
      const sse = 'data: ' + JSON.stringify({ choices: [{ delta: { content: '流式的回答' } }] }) + '\n\n'
        + 'data: ' + JSON.stringify({ choices: [], usage: { prompt_tokens: 300, completion_tokens: 40 } }) + '\n\ndata: [DONE]\n\n';
      return r.fulfill({ status: 200, contentType: 'text/event-stream', body: sse });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '好的' } }], usage: { prompt_tokens: 100, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 50 } } }) });
  }
  return r.abort();
});
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ PLUG }) => {
  myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  plugins.push(...PLUG); PLUG.forEach(p => executePluginOnLoad(p));
  myApiUrl = 'https://api.test.com/v1'; myApiKey = 'sk-test'; myModel = 'main-model';
  subApiUrl = 'https://sub.test.com/v1'; subApiKey = 'sk-sub'; subModel = 'sub-model';
  vecApiUrl = 'https://vec.test.com/v1'; vecApiKey = 'sk-vec';
}, { PLUG });
await page.waitForTimeout(2000);

const r = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const o = {};
  gyTokenStats = { total: { calls: 0, in: 0, out: 0, cached: 0, estimated: 0 }, byFeature: {}, byDetail: {}, byDay: {}, since: Date.now() };
  window.gyTokenLogClear();
  // ① 名字认得出的核心函数（全局唯一的名字）
  const f1 = new Function(`return async function triggerNudge(){ return callChatCompletionAPI(getApiConfig(false), '戳一下'); }`)();
  await f1();
  // ② 按「文件|函数」认（打电话里叫 ask 的那个）
  const f2 = new Function(`return async function ask(){ return callChatCompletionAPI(getApiConfig(true), '说话'); }\n//# sourceURL=http://x/js/47-call.js`)();
  await f2();
  // ③ 新玩法插件里问模型
  const f3 = new Function(`return async function gyxTestRun(){ return window.GYX.ask('插件问一句'); }\n//# sourceURL=gyx-plugin/测试插件.js`)();
  await f3();
  // ④ 谁都不认识的核心文件里的函数 → 按文件归项目
  const f4 = new Function(`return async function someNewThing(){ return callChatCompletionAPI(getApiConfig(true), '新功能'); }\n//# sourceURL=http://x/js/22-box-music.js`)();
  await f4();
  // ⑤ 连文件都没有（控制台 / 老插件）
  const f5 = new Function(`return async function oldScript(){ return callChatCompletionAPI(getApiConfig(true), '老脚本'); }`)();
  await f5();
  // ⑥ 向量
  const f6 = new Function(`return async function getSemanticContext(){ return getEmbedding('这是一段要算向量的文字，长一点'); }`)();
  await f6();
  // ⑦ 流式
  const f7 = new Function(`return async function triggerAIBatchReply(){ return streamCompletionText(getApiConfig(false), '聊天', () => {}); }`)();
  await f7();
  await sleep(100);
  const L = window.gyTokenLogGet();
  o.log = L.map(x => [x.f, x.d, x.k, x.m, x.i, x.o, x.c, x.s]);
  o.noOther = !L.some(x => x.f === '其它');
  o.byDetail = gyTokenStats.byDetail;
  o.total = gyTokenStats.total;
  // Token 用量面板
  showTokenStats(); await sleep(100);
  const m = document.getElementById('tokenStatsBody');
  o.tabs = [...m.querySelectorAll('.gytk-tab')].map(b => b.innerText);
  o.items = [...m.querySelectorAll('.gytk-it .gytk-hd b')].map(b => b.innerText.replace(/^[▸▾]\s*/, ''));
  o.zero = (m.querySelector('details summary') || {}).innerText || '';
  o.zeroTxt = (m.querySelector('.gytk-zero') || {}).textContent || ''; o.zeroHasPlugin = /插件 · /.test((m.querySelector('.gytk-zero') || {}).textContent || '');
  gyTokToggle('m', '聊天'); await sleep(30);
  o.sub = [...m.querySelectorAll('.gytk-sub div b')].map(b => b.innerText);
  gyTokSee('m', '打电话'); await sleep(30);
  o.logRows = m.querySelectorAll('.gytk-row').length;
  o.logFirst = (m.querySelector('.gytk-row') || {}).innerText || '';
  gyTokSet('m', 'f', ''); await sleep(30);
  o.logAll = m.querySelectorAll('.gytk-row').length;
  gyTokSet('m', 'tab', 'days'); await sleep(30);
  o.days = m.querySelectorAll('.gytk-day').length;
  // 实时：开着每次调用的时候来一次新的
  gyTokSet('m', 'tab', 'log'); await sleep(30);
  await f1(); await sleep(1800);
  o.live = m.querySelectorAll('.gytk-row').length;
  closeModal('tokenStatsModal');
  // 🌐 此刻 → 花了多少
  await gynowOpen(); await sleep(200); gynowTab('cost'); await sleep(100);
  const nb = document.getElementById('gynowBody');
  o.nowHas = !!nb.querySelector('[data-gytk="now"]');
  o.nowTabs = [...nb.querySelectorAll('.gytk-tab')].map(b => b.innerText);
  gyTokSet('now', 'tab', 'log'); await sleep(30);
  o.nowRows = nb.querySelectorAll('.gytk-row').length;
  o.nowAuto = /现在开着的自动功能/.test(nb.innerText) && /关着的/.test(nb.innerText);
  gynowClose && gynowClose();
  // 💾 保存与导出：导出三种文件（截下载的 Blob）
  const got = {};
  const _co = URL.createObjectURL; URL.createObjectURL = b => { got.last = b; return _co.call(URL, b); };
  const grab = async (fmt) => { got.last = null; gyTokExport('m', fmt); await sleep(300); const b = got.last; if (!b) return null; return new Uint8Array(await b.arrayBuffer()); };
  showTokenStats(); gyTokSet('m', 'tab', 'save'); await sleep(50);
  o.saveUi = /每次调用最多存/.test(m.innerText) && /最多存几天/.test(m.innerText) && m.querySelectorAll('.gytk-sel').length === 2;
  const xl = await grab('xlsx'), tx = await grab('txt'), pd = await grab('pdf');
  o.xlsx = xl ? Array.from(xl) : null;
  o.txt = tx ? new TextDecoder().decode(tx) : '';
  o.pdf = pd ? { head: new TextDecoder().decode(pd.slice(0, 8)), tail: new TextDecoder().decode(pd.slice(-6)), n: pd.length } : null;
  URL.createObjectURL = _co;
  // 存多少：改成最多 3 次 → 剪到 3；改成 7 天：塞一条 10 天前的，会被剪掉
  window.appConfirm = async () => true;
  gyTokSetCfg('m', 'max', 3); await sleep(50);
  o.cut3 = window.gyTokenLogGet().length;
  gyTokSetCfg('m', 'max', 0); window.gyTokenLogGet().unshift({ t: Date.now() - 10 * 864e5, f: '聊天', d: '老的', k: '主', i: 1, o: 1, c: 0, e: 0 });
  gyTokenStats.byDay['2000-01-01'] = { calls: 1, in: 1, out: 1, cached: 0, estimated: 0 };
  gyTokSetCfg('m', 'days', 7); await sleep(50);
  o.cutDays = window.gyTokenLogGet().length === 3 && !gyTokenStats.byDay['2000-01-01'];
  o.cfg = gyTokCfgGet();
  localStorage.removeItem('gyTokCfg');
  closeModal('tokenStatsModal');
  // 📘 指南里能搜到、去看看能直接打开
  gyGuideOpen(); await sleep(50); gyGuideSearch('导出 excel'); await sleep(50);
  o.guideHit = /Token 记录存多少/.test(document.getElementById('gyGuideOv').innerText);
  gyGuideGo('api_tok_save'); await sleep(150);
  o.guideGo = document.getElementById('tokenStatsModal').classList.contains('active') || getComputedStyle(document.getElementById('tokenStatsModal')).display !== 'none';
  o.guideTab = /每次调用最多存/.test(document.getElementById('tokenStatsBody').innerText);
  // 留下来的流水（刷新后还在）
  await new Promise(r => setTimeout(r, 4500));
  o.saved = await localforage.createInstance({ name: 'gyTokenLog', storeName: 'log' }).getItem('log').then(x => (x || []).length); o.mem = window.gyTokenLogGet().map(x=>x.f+'|'+x.d);
  return o;
});
const L = r.log;
check('① 核心函数按名字认：聊天 · 戳一戳（主 API、模型、缓存都记了）', L[0] && L[0][0] === '聊天' && L[0][1] === '戳一戳' && L[0][2] === '主' && L[0][3] === 'main-model' && L[0][4] === 100 && L[0][5] === 20 && L[0][6] === 50, JSON.stringify(L[0]));
check('② 按文件+函数认：打电话 · 通话里 TA 说话（副 API）', L[1] && L[1][0] === '打电话' && L[1][1] === '通话里 TA 说话' && L[1][2] === '副', JSON.stringify(L[1]));
check('③ 插件：插件 · 测试插件', L[2] && L[2][0] === '插件 · 测试插件', JSON.stringify(L[2]));
check('④ 不认识的函数按文件归：音乐盒 · 函数 someNewThing', L[3] && L[3][0] === '音乐盒' && /someNewThing/.test(L[3][1]), JSON.stringify(L[3]));
check('⑤ 连文件都没有：导入的插件 / 脚本', L[4] && L[4][0] === '导入的插件 / 脚本' && /oldScript/.test(L[4][1]), JSON.stringify(L[4]));
check('⑥ 向量：向量记忆 · 按话题翻旧记忆，12 token', L[5] && L[5][0] === '向量记忆' && L[5][2] === '向量' && L[5][4] === 12, JSON.stringify(L[5]));
check('⑦ 流式：聊天 · 私聊 / 群聊回复，拿到真实用量', L[6] && L[6][0] === '聊天' && L[6][1] === '私聊 / 群聊回复' && L[6][7] === 1 && L[6][4] === 300 && L[6][5] === 40, JSON.stringify(L[6]));
check('没有「其它」', r.noOther && !r.items.includes('其它'), JSON.stringify(r.items));
check('面板四个标签：按项目 / 每次调用 / 按天 / 保存与导出', r.tabs.join('|') === '📋 按项目|🧾 每次调用|📅 按天|💾 保存与导出', JSON.stringify(r.tabs));
check('按项目：用过的列出来，没用过的项目（含插件）也列在下面', r.items.includes('聊天') && r.items.includes('打电话') && r.items.includes('插件 · 测试插件') && /没调用过的项目（\d+）/.test(r.zero) && r.zeroHasPlugin, r.zero + ' ' + r.zeroTxt.slice(0,300) + JSON.stringify(r.items));
check('点开项目看细项', r.sub.includes('戳一戳') && r.sub.includes('私聊 / 群聊回复'), JSON.stringify(r.sub));
check('每次调用：按项目筛 / 全部', r.logRows === 1 && /打电话 · 通话里 TA 说话/.test(r.logFirst) && /副 API/.test(r.logFirst) && r.logAll === 7, r.logFirst);
check('按天', r.days >= 1);
check('开着的时候新调用自动出现', r.live === 8, String(r.live));
check('🌐 此刻 → 花了多少：同一个面板', r.nowHas && r.nowTabs.length === 4 && r.nowRows === 8, JSON.stringify([r.nowHas, r.nowTabs, r.nowRows]));
check('此刻：花了多少下面还有开着 / 关着的自动功能', r.nowAuto);
check('保存与导出页：两个设置', r.saveUi);
check('导出 Excel：是 zip（PK 开头）', r.xlsx && r.xlsx[0] === 0x50 && r.xlsx[1] === 0x4b, r.xlsx ? r.xlsx.length : 'null');
check('导出 TXT：有按项目、按天、每次调用', /【按项目】/.test(r.txt) && /【按天】/.test(r.txt) && /打电话 · 通话里 TA 说话/.test(r.txt), r.txt.slice(0, 200));
check('导出 PDF：%PDF 开头、%%EOF 结尾', r.pdf && r.pdf.head.startsWith('%PDF-1.4') && /%%EOF/.test(r.pdf.tail), JSON.stringify(r.pdf));
check('存多少：改成 3 次就剪到 3 次', r.cut3 === 3, String(r.cut3));
check('存几天：超出天数的流水和按天记录都删了', r.cutDays, JSON.stringify(r.cfg));
check('使用指南：搜得到、去看看直接打开到「保存与导出」', r.guideHit && r.guideGo && r.guideTab, JSON.stringify([r.guideHit, r.guideGo, r.guideTab]));
check('每次调用的流水存下来了（跟内存里一样多）', r.saved >= 3 && r.saved === r.mem.length, String(r.saved) + JSON.stringify(r.mem));
check('没有页面报错', !errs.length, errs.join(' | '));
await browser.close();
let pass = 0; results.forEach(x => { console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok ? '' : '  ' + x.extra)); if (x.ok) pass++; });
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length ? 0 : 1);
