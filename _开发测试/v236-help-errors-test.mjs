// v236：🧯 客服把所有接口报错都提醒（余额不足、key 不对、地址错、连不上、空回、只有思考、被截断、限流、服务器挂、审核、太长、模型不存在、语音 / 向量 / 天气），用大白话讲；报错词典 + 指南
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
let MODE = 'ok';
const J = (st, o) => ({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
const CASES = {
  money: J(402, { error: { message: 'Insufficient Balance', type: 'insufficient_quota' } }),
  key: J(401, { error: { message: 'Incorrect API key provided' } }),
  url: { status: 200, contentType: 'text/html', body: '<!DOCTYPE html><html><body>控制台</body></html>' },
  empty: J(200, { choices: [{ message: { content: '' }, finish_reason: 'stop' }] }),
  think: J(200, { choices: [{ message: { content: '<think>我想想……</think>' }, finish_reason: 'stop' }] }),
  cut: J(200, { choices: [{ message: { content: '我今天想跟你说一件很重要的' }, finish_reason: 'length' }] }),
  rate: J(429, { error: { message: 'Rate limit reached, too many requests' } }),
  busy: J(503, { error: { message: 'Service Unavailable: model overloaded' } }),
  block: J(400, { error: { message: 'Content blocked by content_filter policy' } }),
  long: J(400, { error: { message: "This model's maximum context length is 8192 tokens" } }),
  model: J(404, { error: { message: 'The model `gpt-9` does not exist' } }),
  ok: J(200, { choices: [{ message: { content: '好的。' }, finish_reason: 'stop' }] })
};
await page.route(/^https?:\/\//, async r => {
  const u = r.request().url();
  if (/x\.test\/v1\/chat\/completions/.test(u)) { if (MODE === 'net') return r.abort(); return r.fulfill(CASES[MODE]); }
  if (/x\.test\/v1\/audio\/speech/.test(u)) return r.fulfill(J(401, { error: { message: 'invalid api key' } }));
  if (/x\.test\/v1\/embeddings/.test(u)) return r.fulfill(J(500, { error: { message: 'internal server error' } }));
  return r.abort();
});
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof gyHelpOpen === 'function', { timeout: 20000 });
await page.waitForTimeout(1500);
await page.evaluate(() => { myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'deepseek-chat'; window.__nj = []; window.gyNotifyJump = (c, t, d) => window.__nj.push(t + '｜' + d); });
const got = {};
for (const m of ['money', 'key', 'url', 'net', 'empty', 'think', 'cut', 'rate', 'busy', 'block', 'long', 'model']) {
  MODE = m;
  got[m] = await page.evaluate(async () => { const n0 = window.__nj.length; await callChatCompletionAPI(getApiConfig(false), '你好', 0); await new Promise(r => setTimeout(r, 150)); const i = gyHelpData().issues[0]; return { src: i && i.src, title: i && i.title, pop: window.__nj.length > n0, tip: i && i.tip }; });
}
const want = { money: 'e_money', key: 'e_key', url: 'e_url', net: 'e_net', empty: 'e_empty', think: 'e_think', cut: 'e_cut', rate: 'e_rate', busy: 'e_busy', block: 'e_block', long: 'e_long', model: 'e_model' };
const wrong = Object.keys(want).filter(k => got[k].src !== want[k] || !got[k].pop);
check('12 种聊天接口问题都认得出、每一次都弹提醒（余额 / key / 地址 / 连不上 / 空回 / 只有思考 / 截断 / 限流 / 服务器 / 审核 / 太长 / 模型）', !wrong.length, JSON.stringify(wrong.map(k => [k, got[k].src, got[k].pop])));
check('提醒写成大白话：说清楚发生了什么 + ①②③ 一步步怎么做 + 是主 API 还是副 API、哪个模型', /没钱/.test(got.money.tip) && /①/.test(got.money.tip) && /充值/.test(got.money.tip) && /主 API · deepseek-chat/.test(got.money.title), JSON.stringify(got.money));
MODE = 'ok';
const ok = await page.evaluate(async () => { const n = gyHelpData().issues.length; await callChatCompletionAPI(getApiConfig(false), '你好', 0); return gyHelpData().issues.length === n; });
check('正常回答不会误报', ok);
const other = await page.evaluate(async () => {
  const o = {};
  try { await fetch('https://x.test/v1/audio/speech', { method: 'POST', body: '{}' }); } catch (e) {} await new Promise(r => setTimeout(r, 200)); o.voice = gyHelpData().issues[0].title;
  try { await fetch('https://x.test/v1/embeddings', { method: 'POST', body: '{}' }); } catch (e) {} await new Promise(r => setTimeout(r, 200)); o.vec = gyHelpData().issues[0].title;
  try { await fetch('https://api.open-meteo.com/v1/forecast?x=1'); } catch (e) {} await new Promise(r => setTimeout(r, 200)); o.weather = gyHelpData().issues[0].src;
  return o;
});
check('不走聊天的也报：语音接口 key 不对、向量接口服务器出错、天气没拉到', /密钥.*语音接口/.test(other.voice) && /服务器.*向量接口/.test(other.vec) && other.weather === 'e_weather', JSON.stringify(other));
const dict = await page.evaluate(async () => {
  const o = {}; gyHelpOpen('dict'); await new Promise(r => setTimeout(r, 300)); const t = document.getElementById('gyhBody').innerText;
  o.n = document.querySelectorAll('#gyhBody .gyh-iss').length; o.total = gyErrDict().length; o.has = /余额不足/.test(t) && /模型回了空白/.test(t) && document.querySelectorAll('#gyhBody .gyh-how li').length >= 40;
  gyHelpOpen('issues'); await new Promise(r => setTimeout(r, 200)); o.issuesHow = /怎么办/.test(document.getElementById('gyhBody').innerText);
  document.getElementById('gyHelpOv').remove();
  gyGuideOpen(); await new Promise(r => setTimeout(r, 200)); o.guide = /报错是什么意思/.test(document.getElementById('gyGuideOv').innerText); document.getElementById('gyGuideOv').remove();
  o.q = ['余额不足怎么办', '空回了', 'key 不对', '连不上', '话说一半'].map(q => (gyGuideSearchApi(q)[0] || {}).id);
  return o;
});
check('📖 报错词典列出所有报错（每条有大白话和一步步怎么做），发现的问题里也写了怎么办', dict.n === dict.total && dict.total >= 20 && dict.has && dict.issuesHow, JSON.stringify(dict));
check('📘 指南「🧯 报错是什么意思」，客服搜得到', dict.guide && JSON.stringify(dict.q) === '["e_money","e_empty","e_key","e_net","e_cut"]', JSON.stringify(dict));
const bad = errs.filter(e => !/x\.test|Failed to fetch|ERR_|net::/.test(e));
check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
