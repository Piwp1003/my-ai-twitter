// 304：🫀 后台心跳（定时器停了由原生戳着走）、点通知时功能没启动完会等、一个聊天一次只回一轮 + 筛掉重复的、
//      🔒 MCP 点名锁软件（工具调用 / 文字问法 / 兜底）、无障碍没开时软锁兜底、🫥 透明滑动条
// 用法（项目根目录）：node _开发测试/v304-bg-lock-norepeat-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra: typeof extra === 'string' ? extra : JSON.stringify(extra) });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => { try { localStorage.setItem('gyPumpForce', '1'); } catch (e) {} });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 200))); page.on('dialog', d => d.accept());
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.gysPh && typeof window.gyMcpDecide === 'function', null, { timeout: 40000 });
await page.waitForTimeout(800);

// ① 后台心跳
{
  const r = await page.evaluate(async () => {
    const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const P = window.__gyPump; o.on = !!(P && P.on);
    o.alive = window.__gyBeat() === 0 && !P.stalled;                 // 定时器自己在走：不插手
    let a = 0, b = 0, cleared = 0;
    setTimeout(() => { a++; }, 1200);
    const iv = setInterval(() => { b++; }, 1000);
    const dead = setTimeout(() => { cleared++; }, 1000); clearTimeout(dead);
    // 假装过了 100 秒而定时器一下都没走（系统把它们停了）
    const now0 = Date.now; Date.now = () => now0() + 100000; P.__canary(now0());
    const n = window.__gyBeat(); Date.now = now0;
    o.pumped = n >= 2 && a === 1 && b === 1 && P.stalled === true;
    await s(1500);
    o.once = a === 1;                                                // 真定时器到点时不会再跑一遍
    o.intervalAlive = b >= 2; clearInterval(iv); const b2 = b; await s(1200); o.intervalCleared = b === b2;
    o.cleared = cleared === 0;
    o.info = P.info();
    return o;
  });
  check('🫀 心跳装上了；定时器自己在走时不插手', r.on && r.alive, r);
  check('🫀 定时器被停掉时：一戳，到点的 setTimeout / setInterval 都替它跑掉', r.pumped, r);
  check('🫀 替它跑过的不会再跑第二遍；clearTimeout / clearInterval 照常管用', r.once && r.intervalAlive && r.intervalCleared && r.cleared, r);
  const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  check('js/00-bg-pump.js 排在加载清单最前面，离线清单里也有', idx.indexOf("'./js/00-bg-pump.js'") > 0 && idx.indexOf("'./js/00-bg-pump.js'") < idx.indexOf("'./js/01-core-state-infra.js'") && /00-bg-pump\.js\?v=/.test(sw) && /99d-scrollbar\.js\?v=/.test(sw));
  const g = fs.readFileSync(path.join(root, '安卓插件/GuyuGuard-源码与构建/src/com/guyu/guard/Guard.java'), 'utf8');
  check('谷雨守护 1.2.0：keepAttach / keepBeat / 兜底拦截都在源码里', /VERSION = "1\.2\.0"/.test(g) && /keepAttach\(Object/.test(g) && /keepBeat\(int/.test(g) && /__gyBeat/.test(g) && /guardTick\(\)/.test(g));
}
// ② 透明滑动条
{
  const r = await page.evaluate(async () => {
    const s = ms => new Promise(r => setTimeout(r, ms)); const h = document.documentElement, o = {};
    o.on = h.classList.contains('gy-gsb') && !!document.getElementById('gyGhostScrollCss');
    o.hidden = !h.classList.contains('gy-gsb-show');
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })); o.show = h.classList.contains('gy-gsb-show');
    await s(1500); o.gone = !h.classList.contains('gy-gsb-show');
    setAutoFeature('gyGhostScroll', false, true); await s(120); o.off = !h.classList.contains('gy-gsb');
    setAutoFeature('gyGhostScroll', true, true); await s(120); o.back = h.classList.contains('gy-gsb');
    return o;
  });
  check('🫥 滑动条平时透明；鼠标一动就显示，停下一秒多又隐掉', r.on && r.hidden && r.show && r.gone, r);
  check('🫥 全部开关里能关、能再开', r.off && r.back, r);
}
// ③ 点通知时那个功能还没启动完：等它
{
  const r = await page.evaluate(async () => {
    const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    window.__gyPlayBuiltin = 1; const was = window.__gyPlayReady; window.__gyPlayReady = 0;
    gyJump({ fn: '__gyLateFn', args: [5] }); await s(200);
    o.waiting = window.__late === undefined;
    window.__gyLateFn = a => { window.__late = a; }; await s(500);
    o.opened = window.__late === 5;
    window.__gyPlayReady = was || 1;
    return o;
  });
  check('🌙 刚启动时点通知（TA 讲的梦…）：等功能准备好再打开，不再丢到通知页', r.waiting && r.opened, r);
}
// ④ 一个聊天一次只回一轮 + 筛重复
{
  const r = await page.evaluate(async () => {
    const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师，嘴硬心软', worldbooks: [], diaryData: { letters: [], diaries: [] } });
    o.plain = typeof window.__gyReplyRun === 'undefined' && typeof gyReplyState === 'undefined';   // 「一次只回一轮」撤掉了
    const said = [];
    o.d1 = gyReplyIsDup(said, '我今天去拍了日落，特别好看。', '9991', { id: 9991 }) === false;
    o.d2 = gyReplyIsDup(said, '我今天去拍了日落，特别好看！！', '9991', { id: 9991 }) === true;
    o.d3 = gyReplyIsDup(said, '你吃饭了没？别又忘了。', '9991', { id: 9991 }) === false;
    o.d5 = gyReplyIsDup(said, '今天去拍了日落，真的特别好看呢', '9991', { id: 9991 }) === true;   // 换了个说法
    o.d6 = gyReplyIsDup(said, '明天要不要一起去海边走走？', '9991', { id: 9991 }) === false;
    o.d4 = gyReplyIsDup(said, '好的', '9991', { id: 9991 }) === false && gyReplyIsDup(said, '好的', '9991', { id: 9991 }) === false;
    o.note = /条数不用凑/.test(gyNoRepeatNote()) && /新的东西/.test(gyNoRepeatNote());
    setAutoFeature('gyNoRepeat', false, true); o.offNote = gyNoRepeatNote() === '' && gyReplyIsDup(['我今天去拍了日落特别好看'], '我今天去拍了日落，特别好看。', '9991', { id: 9991 }) === false;
    setAutoFeature('gyNoRepeat', true, true);
    return o;
  });
  check('💬 回复流程是原来的（没有加「一次只回一轮」）', r.plain, r);
  check('💬 一次发的几条里意思重复的（只换了说法 / 语气词）会筛掉；不一样的、很短的不动', r.d1 && r.d2 && r.d3 && r.d4 && r.d5 && r.d6, r);
  check('💬 提示词里写明「每条都得是新内容、条数不用凑」；开关关掉就都不管', r.note && r.offNote, r);
}
// ⑤ MCP 点名锁软件
{
  await page.evaluate(async () => {
    const J = x => JSON.stringify(x);
    myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
    window.getApiConfig = () => ({ url: 'https://x.test/v1', key: 'k', model: 'm' });
    window.currentChatSessionId = 9991;
    window.sendProactiveChatMessage = async () => {}; try { sendProactiveChatMessage = window.sendProactiveChatMessage; } catch (e) {}
    const DIM = { 'com.ss.android.ugc.aweme': '抖音', 'com.tencent.mm': '微信', 'com.xingin.xhs': '小红书', 'com.eg.android.AlipayGphone': '支付宝', 'com.android.settings': '设置' };
    window.__g = { blocked: '', front: 0, home: 0, access: true, fg: 'plus.H5C498173', attach: 0, beat: [] };
    const Guard = {
      version: () => '1.2.0',
      perms: () => J({ usage: true, access: window.__g.access, overlay: true, notify: true, write: true, dnd: true }),
      openSettings: () => true, usage: () => J({ apps: [{ pkg: 'com.tencent.mm', label: '微信', ms: 40 * 60e3, opens: 60 }], hours: [], total: 40 * 60e3, unlocks: 3 }),
      foreground: () => window.__g.fg, status: () => J({ battery: 50 }), apps: () => J(Object.entries(DIM).map(([pkg, label]) => ({ pkg, label }))),
      screenText: () => '', shot: () => false, shotState: () => 3, shotErr: () => '', lock: () => true,
      home: () => { window.__g.home++; return true; }, bringFront: () => { window.__g.front++; return true; }, openApp: () => true,
      setBlocked: s => { window.__g.blocked = s; }, setNever: () => {}, lastBlocked: () => '|0', pollNotifs: () => '[]',
      setVolume: () => true, setBright: () => true, setDnd: () => true, torch: () => true, vibrate: () => true, clip: () => true, wallpaper: () => true, alarm: () => true,
      keepStart: () => true, keepStop: () => true, keepOn: () => true, keepError: () => '', keepAttach: () => { window.__g.attach++; return true; }, keepBeat: ms => { window.__g.beat.push(ms); return true; }, beatInfo: () => '{"n":1}'
    };
    window.plus = { android: { runtimeMainActivity: () => ({}), importClass: n => (n === 'com.guyu.guard.Guard' ? Guard : null), invoke: () => null, currentWebview: () => ({}) }, runtime: { appid: 'guyu' }, io: { convertLocalFileSystemURL: p => p } };
    GYX.set('gysPhone', true);
    window.__mode = 'tool'; window.__reqs = [];
    const reply = body => {
      window.__reqs.push(body);
      if (body.tools) {
        if (window.__mode === 'tool') return { choices: [{ message: { content: '', tool_calls: (window.__seen = (window.__seen || 0) + 1) === 1 ? [{ id: 'c1', type: 'function', function: { name: body.tools.find(t => /lock_apps$/.test(t.function.name) && !/unlock/.test(t.function.name)).function.name, arguments: window.__args } }] : [] } }] };
        if (window.__mode === 'err') return { error: { message: 'tools is not supported' } };
        return { choices: [{ message: { content: '无' } }] };
      }
      return { choices: [{ message: { content: window.__text || '无' } }] };
    };
    window.smartFetch = async (url, opt) => { const d = reply(JSON.parse(opt.body)); return { ok: true, status: 200, headers: { get: () => null }, json: async () => d, text: async () => J(d) }; };
    setAutoFeature('mcpOn', true, true);
    await gyMcpBuiltin();
    await new Promise(r => setTimeout(r, 300));
  });
  const run = (mode, text, args, plain) => page.evaluate(async ([mode, text, args, plain]) => {
    window.__mode = mode; window.__seen = 0; window.__args = args || '{}'; window.__text = plain || '无'; window.__reqs = [];
    const items = await gyMcpDecide('9991', text);
    const T = gysPhoneState().rules.temp;
    return { items: (items || []).map(i => [i.name, i.out.slice(0, 160)]), blocked: window.__g.blocked, pkgs: T && T.pkgs, mins: T ? Math.round((T.until - Date.now()) / 60e3) : 0, reqs: window.__reqs.length, sys: (window.__reqs[0] && window.__reqs[0].messages[0].content) || '' };
  }, [mode, text, args, plain]);
  const tools = await page.evaluate(() => (JSON.parse(localStorage.getItem('gyMcpCfg')).servers.find(s => s.kind === 'builtin') || { tools: [] }).tools.map(t => t.name));
  check('🧰 内置手机工具里有「点名锁」和「解锁」', tools.includes('lock_apps') && tools.includes('unlock_apps'), tools.join(','));
  const a = await run('tool', '帮我把抖音锁 20 分钟', '{"apps":["抖音"],"minutes":20}');
  check('🔒「帮我把抖音锁 20 分钟」：只锁抖音、锁 20 分钟；你自己开口的，设着「先问我」也直接锁', a.blocked === 'com.ss.android.ugc.aweme' && a.mins >= 19 && a.mins <= 20 && /锁上了：抖音/.test((a.items[0] || [])[1] || ''), a);
  check('🧰 判断那一步的提示词写明了「嘴上答应不算，要真的调用工具」', /什么都没发生/.test(a.sys) && /调用对应的工具/.test(a.sys));
  const b = await run('err', '小红书也锁了吧', '', '{"calls":[{"tool":"lock_apps","args":{"apps":["小红书"]}}]}');
  check('🧰 模型 / 中转不支持「工具调用」：自动换成文字问法，照样锁上；前面锁的抖音不会被顶掉', /aweme/.test(b.blocked) && /xingin/.test(b.blocked) && b.reqs === 2, b);
  const u = await page.evaluate(() => { const r = gysPh.mcp.unlock({ apps: ['抖音'] }); return { r, blocked: window.__g.blocked }; });
  check('🔓 解开抖音：只解开抖音，小红书还锁着', u.r.ok && u.blocked === 'com.xingin.xhs', u);
  await page.evaluate(() => gysPh.mcp.unlock({}));
  const c = await run('none', '把抖音给我锁了半小时', '', '无');
  check('🔒 模型两次都说「无」：她明明说了「锁抖音半小时」，兜底照样锁上', c.blocked === 'com.ss.android.ugc.aweme' && c.mins >= 29 && c.mins <= 30, c);
  await page.evaluate(() => gysPh.mcp.unlock({}));
  const d = await run('tool', '我今天好累啊', '{"apps":["微信"],"minutes":10}');
  check('🔒 不是你开口要的（TA 自己想锁）+ 设的是「先问我」：不直接锁，先给你弹请求', d.blocked === '' && /先问我/.test((d.items[0] || [])[1] || ''), d);
  const e = await run('tool', '把支付宝锁了', '{"apps":["支付宝"]}');
  check('🔒 银行 / 支付类永远不锁，TA 会被告知没锁成', e.blocked === '' && /工具报错/.test((e.items[0] || [])[1] || ''), e);
  // 无障碍没开：软锁兜底
  const f = await page.evaluate(async () => {
    const s = ms => new Promise(r => setTimeout(r, ms));
    window.__g.access = false; await s(50);
    const r = await gysPh.mcp.lock({ apps: ['抖音'], minutes: 5, asked: true, cid: '9991' });
    window.__g.fg = 'com.ss.android.ugc.aweme'; const f0 = window.__g.front;
    // 让 30 秒的权限缓存过期
    const now0 = Date.now; Date.now = () => now0() + 40000; gysPh.__soft(); Date.now = now0; await s(900);
    return { weak: r.weak || '', front: window.__g.front - f0, page: /抖音/.test((document.querySelector('.gys-root.on') || document.body).innerText) };
  });
  check('🔒 无障碍没开：TA 会被告知现在是「软锁」；你打开被锁的抖音，谷雨自己把自己拉上来盖住', /软锁/.test(f.weak) && f.front >= 1, f);
  const g = await page.evaluate(() => gysPh.mcp.guess('别让我刷小红书和b站了，锁两个小时'));
  check('🔒 从一句话里认出要锁哪几个、锁多久', g.lock && g.apps.includes('小红书') && g.apps.includes('b站') && g.minutes === 120, g);
}
// ⑥ 指南 / 公告 / 版本
{
  const gd = fs.readFileSync(path.join(root, 'js/94-guide-help.js'), 'utf8'), nt = fs.readFileSync(path.join(root, 'js/92d-update-notes.js'), 'utf8');
  check('使用指南有：后台心跳、聊天里锁软件、透明滑动条、别重复 四条', ["id: 'bg_beat'", "id: 'mcp_lock'", "id: 'ghost_scroll'", "id: 'no_repeat'"].every(k => gd.includes(k)));
  const v = await page.evaluate(() => [GY_VERSION, GY_NOTES[0].v]);
  check('版本 304，公告第一条是 304', v[0] >= 304 && nt.includes('"v": 304'), v);
  check('这一趟没有页面报错', !errs.length, errs.join(' | '));
}
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
