// v245：🔌 每个接口的「测试连接」+ 合集改成竖着一列、点了直接打开
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
// 一张 1x1 的 png
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
await page.route(/^https?:\/\//, r => {
  const u = r.request().url(), h = r.request().headers();
  if (/bad\.test/.test(u)) return r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Incorrect API key provided' } }) });
  if (/\/embeddings/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ embedding: new Array(1024).fill(0.1) }], usage: { prompt_tokens: 9 } }) });
  if (/chat\/completions/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '收到' } }], usage: { prompt_tokens: 20, completion_tokens: 2 } }) });
  if (/audio\/speech/.test(u)) return r.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.alloc(2000, 1) });
  if (/audio\/transcriptions/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: '' }) });
  if (/images\/generations/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ b64_json: PNG.toString('base64') }] }) });
  if (/workers\.dev\/pending/.test(u)) return r.fulfill({ status: h.authorization === 'Bearer right' ? 200 : 401, contentType: 'application/json', body: '[]' });
  return r.abort();
});
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ PLUG }) => {
  myCharacters.push({ id: 9991, name: 'Leon', persona: '摄影师', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  plugins.push(...PLUG); PLUG.forEach(p => executePluginOnLoad(p));
}, { PLUG });
await page.waitForTimeout(2000);

const r = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  const res = () => { const ov = document.getElementById('gyApiTestOv'); const t = ov ? ov.innerText : ''; if (ov) ov.remove(); return t; };
  const lastN = () => (globalNotifications[0] || {}).text || '';
  window.appConfirm = async () => true;
  // 按钮都在
  switchMainView('settings'); openSettingsPanel('api'); await sleep(50);
  o.btns = ['main', 'sub', 'vec', 'cloud'].map(k => !!document.querySelector(`[onclick*="gyApiTest('${k}'"]`));
  // ① 主 API：能用
  document.getElementById('apiUrlInput').value = 'https://good.test/v1'; document.getElementById('apiKeyInput').value = 'sk-1';
  const sel = document.getElementById('modelSelect'); sel.innerHTML = '<option value="good-model">good-model</option>'; sel.value = 'good-model';
  const btn = document.querySelector(`[onclick*="gyApiTest('main'"]`);
  const p = gyApiTest('main', '', btn); o.busy = btn.disabled && /正在测试/.test(btn.innerText); await p;
  o.mainOk = res(); o.mainN = lastN(); o.btnBack = !btn.disabled;
  o.tok = gyTokenLogGet().some(x => x.f === '接口测试');
  // ② 主 API：key 不对 → 大白话
  document.getElementById('apiUrlInput').value = 'https://bad.test/v1';
  await gyApiTest('main'); o.mainBad = res(); o.mainBadN = lastN();
  // ③ 副 API 没填全
  await gyApiTest('sub'); o.subEmpty = res();
  // ④ 向量
  document.getElementById('apiUrlInput').value = 'https://good.test/v1';
  document.getElementById('vecApiUrlInput').value = 'https://good.test/v1'; document.getElementById('vecApiKeyInput').value = 'sk-v';
  await gyApiTest('vec'); o.vec = res();
  // ⑤ 云端
  document.getElementById('cloudWorkerUrlInput').value = 'https://x.workers.dev'; document.getElementById('cloudAuthTokenInput').value = 'wrong';
  await gyApiTest('cloud'); o.cloudBad = res();
  document.getElementById('cloudAuthTokenInput').value = 'right';
  await gyApiTest('cloud'); o.cloudOk = res();
  // ⑥ TA 的声音：OpenAI 格式
  await gyVoiceOpen(); await sleep(200);
  await gyVoiceSetProv('def', 'openai'); await sleep(50);
  await gyVoiceSetF('def', 'url', 'https://good.test/v1/audio/speech'); await gyVoiceSetF('def', 'key', 'k');
  o.ttsBtn = !!document.querySelector(`[onclick*="gyApiTest('tts'"]`);
  o.sttBtn = !!document.querySelector(`[onclick*="gyApiTest('stt'"]`);
  await gyApiTest('tts', 'def'); o.tts = res();
  await gyVoiceSetF('stt', 'url', 'https://good.test/v1'); await gyVoiceSetF('stt', 'key', 'k');
  await gyApiTest('stt'); o.stt = res();
  try { document.querySelectorAll('[data-gy-overlay]').forEach(x => x.remove()); } catch (e) {}
  // ⑦ 画图
  await gyPhotoOpen(); await sleep(150); await gyPhotoSet('mode', 'gen'); await sleep(50); await gyPhotoSet('chan', 'openai'); await sleep(80);
  document.getElementById('gypicUrl').value = 'https://good.test/v1/images/generations'; document.getElementById('gypicKey').value = 'k';
  o.imgBtn = !!document.querySelector(`[onclick*="gyApiTest('img'"]`);
  await gyApiTest('img'); o.img = res();
  // ⑧ 打电话
  gyCallSet('tts', 'api'); gyCallSet('url', 'https://good.test/v1'); gyCallSet('key', 'k');
  await gyApiTest('call'); o.call = res();
  // 通知点回去
  const n = globalNotifications.find(x => /测试连接：主 API能用/.test(x.text));
  document.querySelectorAll('[data-gy-overlay]').forEach(x => x.remove());
  gyOpenNotif(n); await sleep(150);
  o.jump = getComputedStyle(document.getElementById('setPanel-api')).display !== 'none';
  // 🧩 合集：竖着一列，点了直接打开
  closeModal && document.querySelectorAll('[data-gy-overlay]').forEach(x => x.remove());
  gyHubOpen('hub_rel'); await sleep(80);
  o.rows = document.querySelectorAll('#gyHubBody .gyhb-row').length;
  o.noTabs = !document.querySelector('#gyHubOv .gyhb-tabs');
  const row = [...document.querySelectorAll('#gyHubBody .gyhb-row')].find(b => /成就/.test(b.innerText));
  row.click(); await sleep(700);
  o.inPanel = !!document.querySelector('#gyHubBody .gyx-inhub') && /成就/.test(document.querySelector('#gyHubOv .gyhb-ttl').innerText);
  gyHubBack(); await sleep(60);
  o.back = document.querySelectorAll('#gyHubBody .gyhb-row').length === o.rows;
  // 自带的整页功能：点了直接跳，合集关掉
  gyHubOpen('hub_letters'); await sleep(60);
  [...document.querySelectorAll('#gyHubBody .gyhb-row')].find(b => /信件与日记/.test(b.innerText)).click(); await sleep(200);
  o.builtin = !document.getElementById('gyHubOv') && getComputedStyle(document.getElementById('view-diary')).display !== 'none';
  return o;
});
check('设置里主 / 副 / 向量 / 云端都有测试按钮', r.btns.every(Boolean), JSON.stringify(r.btns));
check('测试中按钮变「正在测试…」，测完恢复', r.busy && r.btnBack);
check('主 API 能用：弹窗写清楚模型回了什么、用了多久', /主 API 能用/.test(r.mainOk) && /good-model/.test(r.mainOk) && /收到/.test(r.mainOk) && /用时/.test(r.mainOk), r.mainOk);
check('能用：通知页记一条', /测试连接：主 API能用/.test(r.mainN), r.mainN);
check('测试的用量记在「接口测试」', r.tok);
check('Key 不对：用大白话说原因和怎么办，通知也记了', /用不了/.test(r.mainBad) && /密钥/.test(r.mainBad) && /用不了/.test(r.mainBadN), r.mainBad);
check('副 API 没填全：说清楚会走主 API', /三样/.test(r.subEmpty) && /走主 API/.test(r.subEmpty), r.subEmpty);
check('向量：算出 1024 维', /能用/.test(r.vec) && /1024/.test(r.vec), r.vec);
check('云端：密钥不对 / 对', /AUTH_TOKEN/.test(r.cloudBad) && /能用/.test(r.cloudOk), r.cloudBad + ' | ' + r.cloudOk);
check('TA 的声音：有按钮，念出来了', r.ttsBtn && /能用/.test(r.tts) && /念出来/.test(r.tts), r.tts);
check('转文字：有按钮，接口认了', r.sttBtn && /能用/.test(r.stt), r.stt);
check('画图：有按钮，画出来了', r.imgBtn && /能用/.test(r.img) && /画出来/.test(r.img), r.img);
check('打电话：念出来了', /能用/.test(r.call), r.call);
check('点通知回到那个设置', r.jump);
check('合集：竖着一列，没有横着的标签', r.rows >= 4 && r.noTabs, String(r.rows));
check('点插件那一行：直接在合集里打开，顶上写着名字', r.inPanel);
check('‹ 返回到那一列', r.back);
check('点自带的整页功能：直接跳过去', r.builtin);
check('没有页面报错', !errs.length, errs.join(' | '));
await browser.close();
let pass = 0; results.forEach(x => { console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok ? '' : '  ' + x.extra)); if (x.ok) pass++; });
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length ? 0 : 1);
