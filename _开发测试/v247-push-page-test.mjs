// 247：📲 谷雨自己的通知（网页 Web Push / 安卓 App uni-push）+ 🎵 后台保活，页面这一侧
// 用法（项目根目录）：node _开发测试/v247-push-page-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
import vm from 'vm';
const root = process.cwd();
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const browser = await launchBrowser(chromium);

async function open(initScript, query = '') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  if (initScript) await ctx.addInitScript(initScript);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  const hits = [];
  await page.route(/^https?:\/\//, r => {
    const u = r.request().url(), h = r.request().headers();
    if (/workers\.dev/.test(u)) {
      let b = null; try { b = JSON.parse(r.request().postData() || 'null'); } catch (e) {}
      hits.push({ u, b, auth: h.authorization });
      if (/\/test-push/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, results: [{ ch: 'ntfy', ok: true }, { ch: 'unipush', ok: false, text: '个推鉴权失败：sign error' }] }) });
      if (/\/vapid/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ publicKey: 'BAAA' }) });
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"pending":[]}' });
    }
    return r.abort();
  });
  await page.goto(fileUrl(path.join(root, 'index.html')) + query);
  await page.waitForFunction(() => window.__guyuBooted && typeof window.gyPushState === 'function', { timeout: 20000 });
  return { page, errs, hits, ctx };
}

// ---------- 网页 ----------
{
  const { page, errs, hits, ctx } = await open(null, '?gyjump=' + encodeURIComponent(JSON.stringify({ view: 'notifications' })));
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    myCharacters.push({ id: 9991, name: 'Leon', persona: 'p', worldbooks: [], diaryData: { letters: [], diaries: [] } });
    await sleep(1500);
    o.urlClean = !/gyjump/.test(location.href);
    o.jumpedNotif = (document.getElementById('view-notifications') || {}).style?.display !== 'none';
    switchMainView('settings'); openSettingsPanel('notify'); await sleep(80);
    o.panel = !!document.getElementById('gyPushBox') && document.getElementById('gyPushWeb').style.display !== 'none' && document.getElementById('gyPushApp').style.display === 'none';
    o.webWhy = document.getElementById('gyWebPushSt').innerText;
    o.testBtn = !!document.querySelector(`#gyPushBox [onclick*="gyApiTest('push'"]`);
    // 网页在 file:// 打开：开不了，告诉你为什么，勾不上
    const cb = document.getElementById('gyWebPushOn'); cb.checked = true; await gyWebPushSet(true, cb);
    o.webRefused = !cb.checked && !gyPushState().web;
    // 后台保活：默认关；全部开关里有
    o.keepDef = !gyPushState().keep && !document.getElementById('gyKeepOn').checked;
    const def = AUTO_FEATURE_DEFS.find(f => f.key === 'gyKeepAlive'); o.inSwitch = !!def && def.defaultOff && def.group === '通知' && AUTO_FEATURE_GROUPS.some(g => g.key === '通知');
    gyKeepAliveSet(true); await sleep(600);
    const st = gyKeepAliveState(); o.keepOn = st.on && (st.playing || st.waitingTap) && document.getElementById('gyKeepOn').checked;
    o.keepTxt = document.getElementById('gyKeepSt').innerText;
    gyKeepAliveSound('rain'); await sleep(300); o.sound = gyKeepAliveState().sound === 'rain';
    setAutoFeature('gyKeepAlive', false, true); await sleep(100);   // 从「全部开关」关
    o.keepOffFromSwitch = !gyKeepAliveState().on && !gyKeepAliveState().playing && !document.getElementById('gyKeepOn').checked;
    // 同步时带上订阅字段（没开就是空的），测试连接没配好给提示
    o.extra = JSON.stringify(gyPushSyncExtra());
    document.getElementById('cloudWorkerUrlInput').value = 'https://x.workers.dev'; document.getElementById('cloudAuthTokenInput').value = 'right';
    document.getElementById('ntfyTopicInput').value = ''; document.getElementById('cloudSyncEnabledToggle').checked = true; saveCloudSyncSettings();
    await gyApiTest('push'); const ov1 = document.getElementById('gyApiTestOv'); o.noChan = ov1 ? ov1.innerText : ''; if (ov1) ov1.remove();
    document.getElementById('ntfyTopicInput').value = 'tp'; saveCloudSyncSettings(); await sleep(100);
    await gyApiTest('push'); const ov2 = document.getElementById('gyApiTestOv'); o.partial = ov2 ? ov2.innerText : ''; if (ov2) ov2.remove();
    o.notif = (globalNotifications[0] || {}).text || '';
    // 点通知回来：跳到 TA 的聊天
    await gyPushGo({ chat: 9991 }); await sleep(200);
    o.chat = String(typeof currentChatSessionId !== 'undefined' ? currentChatSessionId : '');
    return o;
  });
  check('网页：点通知新开的页面（?gyjump=）读完存档后跳过去，地址栏清干净', r.urlClean && r.jumpedNotif);
  check('设置 → 通知与云端：多了「📲 谷雨自己的通知」，网页只显示网页那块，有测试按钮', r.panel && r.testBtn);
  check('本地文件打开：开不了网页推送，说清楚要 https，开关弹回去', /https/.test(r.webWhy) && r.webRefused, r.webWhy);
  check('🎵 后台保活：默认关；全部开关「🔔 通知与后台」里也有一份（默认关）', r.keepDef && r.inSwitch);
  check('打开保活：开始放（或等你点一下页面），能换成雨声', r.keepOn && r.sound, r.keepTxt);
  check('从「全部开关」关掉：声音停了，设置里的勾也跟着掉', r.keepOffFromSwitch);
  check('同步给 Worker 时带上这台设备的订阅（没开就是空的，不碰 App 的设置）', /"webPushSubs":\[\]/.test(r.extra) && !/getui/.test(r.extra), r.extra);
  check('🔌 测试连接：一条路都没配好时直说', /ntfy topic 也没填|https/.test(r.noChan), r.noChan.slice(0, 120));
  check('🔌 测试连接：每条路通没通都列出来（ntfy ✅、个推 ❌ 写原因），通知页也记一条', /ntfy/.test(r.partial) && /推出去了/.test(r.partial) && /个推鉴权失败/.test(r.partial) && /谷雨自己的通知/.test(r.notif), r.partial.slice(0, 200));
  const tp = hits.find(h => /test-push/.test(h.u));
  check('测试推送带着密钥、ntfy topic、点了去通知页', tp && tp.auth === 'Bearer right' && tp.b.ntfyTopic === 'tp' && tp.b.jump.view === 'notifications');
  check('点通知回来：先拉云端攒的消息，再打开 TA 的聊天', r.chat === '9991' && hits.some(h => /\/pending/.test(h.u)), r.chat);
  check('网页这边没有页面报错', !errs.length, errs.join(' | '));
  await ctx.close();
}

// ---------- 安卓 App（假的 plus） ----------
{
  const init = () => {
    window.__pl = {}; window.__played = 0;
    window.plus = {
      push: { getClientInfo: () => ({ clientid: 'CID9' }), addEventListener: (t, f) => { window.__pl[t] = f; }, createMessage() {} },
      audio: { createPlayer: (o) => { window.__player = o; return { play() { window.__played++; }, stop() { window.__stopped = 1; }, close() {}, setStyles() {}, addEventListener() {} }; } },
      device: { setWakelock: (v) => { window.__wake = v; } },
      android: { requestPermissions() {} },
    };
  };
  const { page, errs, hits, ctx } = await open(init);
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    myCharacters.push({ id: 9992, name: 'Mia', persona: 'p', worldbooks: [], diaryData: { letters: [], diaries: [] } });
    switchMainView('settings'); openSettingsPanel('notify'); await sleep(80);
    o.appOnly = document.getElementById('gyPushWeb').style.display === 'none' && document.getElementById('gyPushApp').style.display !== 'none';
    o.cid = document.getElementById('gyUniSt').innerText;
    o.before = JSON.stringify(gyPushSyncExtra());
    document.getElementById('gyUniOn').checked = true;
    document.getElementById('gyUniAppId').value = ' APP1 '; document.getElementById('gyUniAppKey').value = 'K1'; document.getElementById('gyUniSecret').value = 'S1';
    gyUniPushSave();
    o.after = gyPushSyncExtra();
    // 个推通知点开 → 去 TA 的聊天；别的本地通知点开不管
    window.__pl.click({ payload: JSON.stringify({ gy: 1, jump: { chat: 9992 } }) }); await sleep(300);
    o.chat = String(currentChatSessionId);
    window.__pl.click({ payload: {} });
    // 保活：用 App 自己的播放器 + 让手机别睡死
    gyKeepAliveSet(true); await sleep(100);
    o.player = (window.__player || {}).src || ''; o.loop = (window.__player || {}).loop; o.played = window.__played; o.wake = window.__wake;
    gyKeepAliveSet(false); await sleep(50);
    o.stopped = window.__stopped === 1 && window.__wake === false;
    return o;
  });
  check('App：只显示「🤖 安卓 App 通知（uni-push）」那块，读得到这台手机的 cid', r.appOnly && /CID9/.test(r.cid), r.cid);
  check('App：没开的时候同步带 getui:null（云端不推）；填好后带上 AppID / AppKey / MasterSecret / cid', /"getui":null/.test(r.before) && r.after.getui && r.after.getui.appId === 'APP1' && r.after.getui.cid === 'CID9' && !('webPushSubs' in r.after), r.before);
  check('App：点个推的通知，打开 TA 的聊天', r.chat === '9992', r.chat);
  check('App 保活：用 plus.audio 循环放底噪 + 让手机别睡死；关掉就停、放开唤醒锁', /media\/gy-keepalive-quiet\.wav$/.test(r.player) && r.loop && r.played >= 1 && r.wake === true && r.stopped, JSON.stringify(r));
  check('App 这边没有页面报错', !errs.length, errs.join(' | '));
  await ctx.close();
}
await browser.close();

// ---------- service-worker.js 的 push / 点击（不开浏览器，直接跑代码） ----------
{
  const code = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  const H = {}; const shown = []; const posted = []; const opened = []; let clientsList = [];
  const self = {
    location: { href: 'https://x/service-worker.js?v=1', origin: 'https://x' },
    addEventListener: (t, f) => { H[t] = f; }, skipWaiting() {},
    registration: { showNotification: async (t, o) => { shown.push({ t, o }); } },
    clients: { matchAll: async () => clientsList, openWindow: async (u) => { opened.push(u); }, claim() {} },
  };
  vm.runInNewContext(code, { self, caches: {}, fetch: () => {}, URL, console, setTimeout, Promise, Response, Request });
  const ev = (data) => { let p; return { data: { json: () => data, text: () => JSON.stringify(data) }, waitUntil: (x) => { p = x; }, get p() { return p; } }; };
  // 没开着谷雨：弹通知，带着去哪
  let e = ev({ title: '立夏 发来消息', body: '想你了', jump: { chat: 7 }, tag: 't1' }); H.push(e); await e.p;
  const ok1 = shown.length === 1 && shown[0].t === '立夏 发来消息' && shown[0].o.data.gyJump.chat === 7;
  // 正看着谷雨：不弹，让页面去拉
  clientsList = [{ visibilityState: 'visible', focused: true, postMessage: (m) => posted.push(m) }];
  e = ev({ title: 'x', body: 'y' }); H.push(e); await e.p;
  const ok2 = shown.length === 1 && posted.length === 1 && posted[0].gyPush;
  check('Service Worker：收到云端推送，谷雨没在看就弹「谷雨」的通知；正看着就不弹、只让页面拉新消息', ok1 && ok2);
  // 点通知：没开着 → 带 ?gyjump= 打开；开着 → 让它跳
  clientsList = [];
  let c = { notification: { close() {}, data: shown[0].o.data }, waitUntil: (x) => { c.p = x; } }; H.notificationclick(c); await c.p;
  const ok3 = /\?gyjump=%7B%22chat%22%3A7%7D$/.test(opened[0] || '');
  const fc = { focus: async () => 'f', postMessage: (m) => posted.push(m) }; clientsList = [fc];
  c = { notification: { close() {}, data: shown[0].o.data }, waitUntil: (x) => { c.p = x; } }; H.notificationclick(c); await c.p;
  const ok4 = posted.some(m => m.gyPushClick && m.gyPushClick.chat === 7);
  // 谷雨自己弹的本地通知（没带 data）：照旧只把页面叫到前台
  const before = posted.length; c = { notification: { close() {}, data: null }, waitUntil: (x) => { c.p = x; } }; H.notificationclick(c); await c.p;
  check('点通知：谷雨没开就带着去处新开一页，开着就让它直接跳；本地通知照旧', ok3 && ok4 && posted.length === before, opened.join(','));
}

results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
