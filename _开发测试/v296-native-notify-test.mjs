// 296：📣 手机横幅弹窗（Native.js「重要」级别通知）+ 📌 后台常驻（谷雨守护 1.1.0 前台服务）+ 各牌子手机指引
// 用法（项目根目录）：node _开发测试/v296-native-notify-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const browser = await launchBrowser(chromium);

async function open(initScript, arg, ua) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 } }, ua ? { userAgent: ua } : {}));
  if (initScript) await ctx.addInitScript(initScript, arg);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\//, r => r.abort());
  await page.goto(fileUrl(path.join(root, 'index.html')));
  await page.waitForFunction(() => typeof myCharacters !== 'undefined' && typeof sendBrowserNotification === 'function' && typeof gyNativeNotify === 'function', null, { timeout: 30000 });
  await page.waitForTimeout(1800);
  return { page, errs, ctx };
}

// 假的安卓：把 Native.js 的每一次调用都记下来
const fakePlus = (o) => {
  const calls = window.__calls = [];
  window.__created = 0; window.__keep = []; window.__kon = false; window.__intent = { __cls: 'Intent0', extra: o.extra || null };
  const ACT = { __cls: 'Activity' };
  const ST = {
    'android.os.Build$VERSION': { SDK_INT: 34 },
    'android.os.Build': { MANUFACTURER: o.maker || 'OPPO', BRAND: o.maker || 'OnePlus' },
    'android.app.PendingIntent': { getActivity: (c, id, it, f) => { calls.push(['pi', id, it && it.__cls, f]); return { __cls: 'PI' }; } },
    'android.graphics.BitmapFactory': { decodeFile: p => ({ __cls: 'bmp', p }) },
    'android.net.Uri': { parse: s => ({ __cls: 'uri', s }) },
    'com.guyu.guard.Guard': o.guard ? { version: () => o.guard, keepStart: (c, t, x) => { window.__keep.push(['start', t, x]); window.__kon = true; return true; }, keepStop: () => { window.__keep.push(['stop']); window.__kon = false; return true; }, keepOn: () => window.__kon, keepError: () => '' } : null,
  };
  const name = x => (x && typeof x === 'object') ? (x.__cls || 'obj') : x;
  window.plus = {
    push: { getClientInfo: () => ({ clientid: 'CID9' }), addEventListener() {}, createMessage() { window.__created++; } },
    device: { setWakelock() {} },
    io: { convertLocalFileSystemURL: p => 'file:///data/' + p, resolveLocalFileSystemURL(a, ok, no) { no && no(); } },
    android: {
      runtimeMainActivity: () => ACT,
      importClass: c => { if (ST[c] == null) { if (c === 'com.guyu.guard.Guard') throw new Error('no class'); return {}; } return ST[c]; },
      newObject: (c, ...a) => { calls.push(['new', c, ...a.map(name)]); return { __cls: c, a }; },
      getAttribute: () => 777,
      requestPermissions: (p, ok) => { calls.push(['perm', p[0]]); ok({ granted: p, deniedAlways: [], deniedPresent: [] }); },
      invoke: (ob, m, ...a) => {
        calls.push(['inv', name(ob), m, ...a.map(name)]);
        if (m === 'getSystemService') return { __cls: 'svc:' + a[0] };
        if (m === 'getPackageName') return 'plus.test';
        if (m === 'getPackageManager') return { __cls: 'pm' };
        if (m === 'getLaunchIntentForPackage') return { __cls: 'LaunchIntent' };
        if (m === 'getApplicationInfo') return { __cls: 'ai' };
        if (m === 'getIntent') return window.__intent;
        if (m === 'getStringExtra') return ob.extra || null;
        if (m === 'removeExtra') { ob.extra = null; return null; }
        if (m === 'areNotificationsEnabled') return o.allowed !== false;
        if (m === 'getNotificationChannel') return { __cls: 'chan' };
        if (m === 'getImportance') return o.imp || 4;
        if (m === 'isIgnoringBatteryOptimizations') return false;
        if (m === 'build') return { __cls: 'Notification' };
        return null;
      },
    },
  };
};
const UA = 'Mozilla/5.0 (Linux; Android 14; PJD110) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 Html5Plus/1.0';

// ---------- 安卓 App（OPPO，装了 1.1.0 的谷雨守护） ----------
{
  const { page, errs, ctx } = await open(fakePlus, { guard: '1.1.0', maker: 'OPPO' }, UA);
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    myCharacters.push({ id: 9993, name: 'Mia', persona: 'p', worldbooks: [], diaryData: { letters: [], diaries: [] } });
    enableBrowserNotifications = true;
    switchMainView('settings'); openSettingsPanel('notify'); await sleep(120);
    o.panel = !!document.getElementById('gyNnBox'); o.brands = document.getElementById('gyNnBrandSel').options.length;
    o.brand = gyNnBrand(); o.steps = document.getElementById('gyNnSteps').innerText; o.st = document.getElementById('gyNnSt').innerText;
    o.fgDef = gyNotifFgOn(); o.fgBox = document.getElementById('gyNnFg').checked;
    o.inSwitch = AUTO_FEATURE_DEFS.filter(f => f.key === 'gyNotifFg' || f.key === 'gyKeepSvc').map(f => f.key + ':' + !!f.defaultOff).join(',');
    // 谷雨开在最前面：照样弹（开关开着），走「重要」渠道，不再走老的 createMessage
    const n0 = window.__calls.length; window.__created = 0;
    sendBrowserNotification('Mia 发来消息', '在吗？<b>想你了</b>', { charId: 9993 }); await sleep(1900);
    const cs = window.__calls.slice(n0), all = window.__calls;
    o.chan = all.some(c => c[0] === 'new' && c[1] === 'android.app.NotificationChannel' && c[2] === 'gy_msg_v1' && c[4] === 4);
    o.builder = cs.some(c => c[0] === 'new' && c[1] === 'android.app.Notification$Builder' && c[3] === 'gy_msg_v1');
    o.title = (cs.find(c => c[2] === 'setContentTitle') || [])[3]; o.body = (cs.find(c => c[2] === 'setContentText') || [])[3];
    o.notified = cs.filter(c => c[2] === 'notify').length; o.created = window.__created;
    o.jump = (cs.find(c => c[2] === 'putExtra' && c[3] === 'gyJump') || [])[4]; o.act = (cs.find(c => c[2] === 'setAction') || [])[3];
    o.pi = cs.some(c => c[0] === 'pi') && cs.some(c => c[2] === 'setContentIntent');
    // 关掉「正在用谷雨时也弹」：盯着看的时候不弹
    gyNotifFgSet(false); await sleep(60); const n1 = window.__calls.filter(c => c[2] === 'notify').length;
    const vis = document.visibilityState === 'visible' && document.hasFocus();
    sendBrowserNotification('Mia', 'x', { charId: 9993 }); await sleep(1800);
    o.vis = vis; o.quiet = window.__calls.filter(c => c[2] === 'notify').length === n1;
    gyNotifFgSet(true);
    // 点通知回来：读到「跳到哪」，打开 TA 的聊天，并且只用一次
    window.__intent = { __cls: 'IntentN', extra: JSON.stringify({ chat: 9993 }) };
    document.dispatchEvent(new Event('newintent')); await sleep(700);
    o.chat = String(typeof currentChatSessionId !== 'undefined' ? currentChatSessionId : ''); o.cleared = window.__intent.extra === null;
    // 后台常驻：默认关；打开 → 起前台服务（要过通知权限）；从「全部开关」关 → 停
    switchMainView('settings'); openSettingsPanel('notify'); await sleep(80);
    o.svcDef = gyKeepSvcState();
    gyKeepSvcSet(true); await sleep(900);
    o.keepStart = JSON.stringify(window.__keep[0] || []); o.svcOn = gyKeepSvcState().running; o.svcTxt = document.getElementById('gyNnSvcSt').innerText;
    o.asked = window.__calls.some(c => c[0] === 'perm' && /POST_NOTIFICATIONS/.test(c[1]));
    setAutoFeature('gyKeepSvc', false, true); await sleep(400);
    o.stopped = window.__keep.some(k => k[0] === 'stop') && !document.getElementById('gyNnSvc').checked;
    // 跳到手机设置：通知渠道那一页带着包名和渠道
    const n2 = window.__calls.length; o.open = gyNnOpen('channel'); const c2 = window.__calls.slice(n2);
    o.openCh = c2.some(c => c[0] === 'new' && c[2] === 'android.settings.CHANNEL_NOTIFICATION_SETTINGS') && c2.some(c => c[2] === 'putExtra' && c[4] === 'gy_msg_v1') && c2.some(c => c[2] === 'startActivity');
    const n3 = window.__calls.length; gyNnOpen('battery'); o.openBat = window.__calls.slice(n3).some(c => c[0] === 'new' && c[2] === 'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
    // 换个牌子看
    gyNnPickBrand('xiaomi'); o.mi = document.getElementById('gyNnSteps').innerText;
    // 使用指南有这一条
    return o;
  });
  check('设置 → 通知与云端：多了「📣 手机横幅弹窗」，8 种牌子可选，自己认出 OPPO 并写出要开「横幅通知」', r.panel && r.brands === 8 && r.brand === 'oppo' && /横幅通知/.test(r.steps) && /ColorOS/.test(r.steps), r.brand + ' ' + r.steps.slice(0, 60));
  check('状态写清楚：允许通知 ✅、重要级别 ✅、电池还被限制 ⚠️', /允许谷雨发通知/.test(r.st) && /重要/.test(r.st) && /电池不限制/.test(r.st), r.st);
  check('两个新开关都在「全部开关」里：App 里「正在用时也弹」默认开，「后台常驻」默认关', r.fgDef && r.fgBox && r.inSwitch === 'gyNotifFg:false,gyKeepSvc:true', r.inSwitch);
  check('谷雨开在最前面也弹：建「重要」渠道（级别 4），用它发，标题正文去掉了标签', r.chan && r.builder && r.title === 'Mia 发来消息' && r.body === '在吗？想你了' && r.notified === 1, JSON.stringify([r.chan, r.builder, r.title, r.body, r.notified]));
  check('弹成了就不再走老的 createMessage（不会一条变两条）', r.created === 0, String(r.created));
  check('通知带着「点了去哪」：动作 com.guyu.NOTIFY + 去 TA 的聊天', r.act === 'com.guyu.NOTIFY' && r.pi && JSON.parse(r.jump || '{}').chat === 9993, r.jump);
  check('关掉「正在用谷雨时也弹」：盯着看的时候不弹' + (r.vis ? '' : '（这次窗口没焦点，跳过判断）'), !r.vis || r.quiet);
  check('点通知回来：打开 TA 的聊天，去处只用一次', r.chat === '9993' && r.cleared, r.chat);
  check('📌 后台常驻：默认关；打开先要通知权限，再起前台服务（带标题和说明），面板显示正挂着', !r.svcDef.on && r.svcDef.has && /^\["start","[^"]+","[^"]+"\]$/.test(r.keepStart) && r.svcOn && r.asked && /通知栏/.test(r.svcTxt), r.keepStart + ' ' + r.svcTxt);
  check('从「全部开关」关掉后台常驻：服务停了，设置里的勾也掉', r.stopped);
  check('「⚙️ 通知设置」跳到这个渠道那一页，「🔋 电池不限制」跳到电池那一页', r.open && r.openCh && r.openBat);
  check('可以自己换牌子看（小米：省电策略选无限制）', /无限制/.test(r.mi) && /悬浮通知/.test(r.mi), r.mi.slice(0, 50));
  check('使用指南有「📣 手机横幅弹窗」这一条，挂着两个新开关', /id: 'cfg_banner'[^\n]*c:gyNotifFg[^\n]*c:gyKeepSvc/.test(fs.readFileSync(path.join(root, 'js/94-guide-help.js'), 'utf8')));
  check('App（新包）没有页面报错', !errs.length, errs.join(' | '));
  await ctx.close();
}

// ---------- 安卓 App（老安装包：谷雨守护 1.0.0；手机把渠道调安静了；刚才是点通知启动的） ----------
{
  const { page, errs, ctx } = await open(fakePlus, { guard: '1.0.0', maker: 'vivo', imp: 2, extra: JSON.stringify({ chat: 9994 }) }, UA);
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    switchMainView('settings'); openSettingsPanel('notify'); await sleep(120);
    o.brand = gyNnBrand(); o.st = document.getElementById('gyNnSt').innerText;
    gyKeepSvcSet(true); await sleep(300);
    o.keep = window.__keep.length; o.svcTxt = document.getElementById('gyNnSvcSt').innerText;
    setAutoFeature('gyKeepSvc', false, true);
    o.took = window.__intent.extra === null;
    return o;
  });
  check('认出 vivo；渠道被手机调安静了会提醒去改回来', r.brand === 'vivo' && /安静/.test(r.st), r.st);
  check('老安装包：后台常驻开不了，直说要装 1.52 以上的包，不报错', r.keep === 0 && /1\.52/.test(r.svcTxt), r.svcTxt);
  check('点通知冷启动：启动时就把「去哪」取走了', r.took);
  check('App（老包）没有页面报错', !errs.length, errs.join(' | '));
  await ctx.close();
}

// ---------- 网页 ----------
{
  const { page, errs, ctx } = await open(null);
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    switchMainView('settings'); openSettingsPanel('notify'); await sleep(120);
    o.panel = !!document.getElementById('gyNnBox'); o.fgDef = gyNotifFgOn(); o.appPart = document.getElementById('gyNnApp').style.display;
    o.native = gyNativeNotify('a', 'b', {}); o.open = gyNnOpen('channel');
    gyKeepSvcSet(true); await sleep(100); o.svc = gyKeepSvcState(); setAutoFeature('gyKeepSvc', false, true);
    return o;
  });
  check('网页：面板在，「正在用谷雨时也弹」默认关（跟以前一样），安卓那一块藏起来', r.panel && r.fgDef === false && r.appPart === 'none', JSON.stringify(r));
  check('网页：原生横幅 / 跳设置 / 后台常驻都安静地做不了，不报错', r.native === false && r.open === false && !r.svc.running && !errs.length, errs.join(' | '));
  await ctx.close();
}
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
