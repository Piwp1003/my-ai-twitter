// 286：🌐 在线的歌——搜网易云 / QQ 音乐、放进音乐盒（歌词带上）、扫码登录出二维码、TA 挑一首真的能放的歌
// 要先开本地社区服务器（跟 v280 一样）：cd 放了 community-worker.js 的文件夹 && npx wrangler dev --port 8799 --local
// 这个测试会真的去网易云 / QQ 音乐查歌（只查，不登录）
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd();
const LOCAL = process.env.GY_COMM || 'http://localhost:8799';
const W = 'https://guyu-community.3040831326.workers.dev';
try { await (await fetch(LOCAL + '/info')).json(); } catch (e) { console.log('⚠️ 本地社区服务器没开（' + LOCAL + '），这次跳过'); process.exit(0); }
const j = await (await fetch(LOCAL + '/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nick: '听歌的', handle: 'mu' + Date.now().toString(36) }) })).json();
if (!j.token) { console.log('⚠️ 加不进本地社区（' + JSON.stringify(j) + '），这次跳过'); process.exit(0); }
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
await ctx.route(/^https?:\/\//, async r => {
  const u = r.request().url(); if (!u.startsWith(W)) return r.abort();
  try { const q = r.request(); const h = Object.assign({}, q.headers(), { 'cf-connecting-ip': '116.25.146.177' }); const resp = await r.fetch({ url: LOCAL + u.slice(W.length), method: q.method(), headers: h, postData: q.postDataBuffer() || undefined }); await r.fulfill({ response: resp }); } catch (e) { r.abort(); }
});
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.gyMu, { timeout: 25000 });
await page.evaluate(tok => {
  gyGate.set(tok, 'https://guyu-community.3040831326.workers.dev');
  myCharacters.push({ id: 7001, name: '谢云昭', persona: '副县长', worldbooks: [], diaryData: { letters: [], diaries: [] } }); window.currentChatSessionId = 7001;
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); let c = '嗯。'; if (/叫她跟你一起听/.test(t)) c = '{"song":"稻香","artist":"周杰伦","line":"下雨了，听这个。"}'; return { choices: [{ message: { content: c } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
}, j.token);
await page.waitForTimeout(1500);
if (process.env.DBG) page.on('console', m => console.log('C', m.text().slice(0, 200)));
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}; const T = () => (document.getElementById('gyMuBody') || {}).innerText || '';
  o.feat = GYX.FEATS.some(f => f.id === 'gyMuOnline');
  // 网易云 App 搜索页里有入口
  gysMusicOpen && gysMusicOpen(); await s(300); gysMu.search('晴天'); await s(500); await s(4000); o.inMusic = /能放的/.test((document.getElementById('gys_music') || {}).innerText || '') && document.querySelectorAll('#gys_music .mu-row').length >= 3; GYS.close('music');

  gyMuOpen(); await s(600); o.inApp = GYS.isOpen('music') && !document.getElementById('gyMuOv'); o.page = /网易云/.test(T()) && /QQ 音乐/.test(T()) && /扫码登录/.test(T());
  await gyMuGo('稻香'); o.ne = document.querySelectorAll('#gyMuBody .gymu-r').length >= 3;
  gyMuSrc('qq'); await gyMuGo('稻香'); o.qq = /周杰伦/.test(T()) && document.querySelectorAll('#gyMuBody .gymu-r').length >= 3;
  gyMuSrc('ne'); await gyMuGo('稻香');
  const n0 = gymState().tracks.length; gyMuPlayIdx(0); await s(4000);
  o.player = /music/.test(String((GYS.top('music') || {}).id || '') + 'music') && (GYS.top('music') || {}).id === 'player';
  try { gymStop(); } catch (e) {} GYS.back('music'); await s(500);
  const t = gymState().tracks.find(x => x.kind === 'online'); o.track = !!t && gymState().tracks.length === n0 + 1 && t.osrc === 'ne';
  o.lrc = !!(t && t.lrc && /\[\d\d:\d\d/.test(t.lrc));
  o.url = !!(t && t._u && /music\.126\.net/.test(t._u));
  try { gymStop(); } catch (e) {}
  gyMuPlayIdx(0, 1); await s(500); o.noDup = gymState().tracks.filter(x => x.kind === 'online').length === 1;
  await gyMuLogin('ne'); await s(800); o.qrNe = !!document.querySelector('#gyMuBody .gymu-qrim svg') && /网易云音乐 App/.test(T());
  gyMuQrCancel(); await gyMuLogin('qq'); await s(800); o.qrQq = !!document.querySelector('#gyMuBody .gymu-qrim img'); gyMuQrCancel();
  GYS.close('music');
  const A = GY_AUTONOMY_ACTIONS.find(a => a.key === 'gy_mu_pick'); o.act = !!A && A.need(myCharacters[0]);
  const res = A ? await A.run(myCharacters[0]) : null; o.pick = !!res && /稻香/.test(res.text) && res.jump.fn === 'gyMuPlayQ';
  o.need2 = !A.need(myCharacters[0]);
  const W = window.__gyPmW && window.__gyPmW.WD.gyMuW; o.widget = !!W && /稻香/.test(W.r({ size: 'm', id: 'x', k: 'gyMuW' }));
  return o;
});
check('有开关；在网易云里打开，能切网易云 / QQ 音乐、有扫码登录', r.feat && r.page && r.inApp, JSON.stringify(r));
check('网易云、QQ 音乐都能搜到歌', r.ne && r.qq, JSON.stringify(r));
check('点一首：网易云打开播放页，放进音乐盒曲库（不重复）、歌词带上、拿到了播放链接', r.track && r.lrc && r.url && r.noDup && r.player, JSON.stringify(r));
check('扫码登录：网易云画出二维码、QQ 拿到二维码图', r.qrNe && r.qrQq, JSON.stringify(r));
check('TA 挑一首真的能放的歌发给你（一天一次），小组件里有', r.act && r.pick && r.need2 && r.widget, JSON.stringify(r));
check('网易云搜索页里直接列出「能放的」', r.inMusic, JSON.stringify(r));
check('没有报错', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 286 在线的歌 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
