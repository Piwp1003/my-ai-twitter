// 310：美团页面快照 + 原子动作接入 MCP（read 权限、原生错误码、端到端工具调用）
// 用法（项目根目录）：node _开发测试/v310-page-tools-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra: typeof extra === 'string' ? extra : JSON.stringify(extra) });
const browser = await launchBrowser(chromium);
const allErrs = [];

async function openPage(init, arg) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('gyPumpForce', '1'); } catch (e) {} });
  if (init) await ctx.addInitScript(init, arg);
  const page = await ctx.newPage();
  page.on('pageerror', e => allErrs.push(e.message.slice(0, 200)));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\//, r => r.abort());
  await page.goto(fileUrl(path.join(root, 'index.html')));
  await page.waitForFunction(() => window.__guyuBooted && window.gysPh && typeof window.gyMcpDecide === 'function', null, { timeout: 40000 });
  await page.waitForTimeout(500);
  return { ctx, page };
}

async function openAndroid(plugin) {
  return openPage(({ plugin }) => {
    window.__g = { calls: {}, inspectError: '', tapError: '' };
    const J = x => JSON.stringify(x);
    const Guard = {
      version: () => '1.3.0',
      perms: () => J({ usage: true, access: true, overlay: true, notify: true, write: true, dnd: true }),
      openSettings: () => true,
      usage: () => J({ apps: [], hours: [], total: 0, unlocks: 0 }),
      foreground: () => 'com.sankuai.meituan',
      status: () => J({ battery: 80 }),
      apps: () => J([{ pkg: 'com.sankuai.meituan', label: '美团' }]),
      screenText: () => '',
      shot: () => false,
      shotState: () => 3,
      shotErr: () => '',
      lock: () => true,
      home: () => true,
      bringFront: () => true,
      openApp: () => true,
      setBlocked: () => {},
      setNever: () => {},
      lastBlocked: () => '|0',
      pollNotifs: () => '[]',
      setVolume: () => true,
      setBright: () => true,
      setDnd: () => true,
      torch: () => true,
      vibrate: () => true,
      clip: () => true,
      wallpaper: () => true,
      alarm: () => true,
      inspectScreen: max => {
        window.__g.calls.inspect = window.__g.calls.inspect || [];
        window.__g.calls.inspect.push(max);
        if (window.__g.inspectError) return J({ ok: false, error: window.__g.inspectError });
        return J({ ok: true, pkg: 'com.sankuai.meituan', token: 77, count: 2, truncated: false, nodes: [
          { ref: 0, text: '外卖', desc: '', id: '', cls: 'android.widget.TextView', bounds: '[0,0][100,100]', clickable: true, editable: false, scrollable: false, enabled: true },
          { ref: 1, text: '', desc: '搜索', id: 'search', cls: 'android.widget.EditText', bounds: '[0,100][300,160]', clickable: true, editable: true, scrollable: false, enabled: true }
        ] });
      },
      tapElement: (token, ref) => {
        window.__g.calls.tap = window.__g.calls.tap || [];
        window.__g.calls.tap.push([token, ref]);
        return window.__g.tapError ? J({ ok: false, error: window.__g.tapError }) : J({ ok: true, action: 'tap', ref });
      },
      setText: (token, ref, value) => {
        window.__g.calls.text = window.__g.calls.text || [];
        window.__g.calls.text.push([token, ref, value]);
        return J({ ok: true, action: 'set_text', ref });
      },
      scrollScreen: direction => {
        window.__g.calls.scroll = window.__g.calls.scroll || [];
        window.__g.calls.scroll.push(direction);
        return J({ ok: true, action: 'scroll', direction });
      }
    };
    window.plus = {
      android: {
        runtimeMainActivity: () => ({}),
        importClass: name => plugin && name === 'com.guyu.guard.Guard' ? Guard : null,
        invoke: () => null,
        currentWebview: () => ({})
      },
      runtime: { appid: 'guyu' },
      io: { convertLocalFileSystemURL: p => p }
    };
  }, { plugin });
}

// ① 非安卓：说清楚为什么不能用
{
  const { ctx, page } = await openPage();
  const r = await page.evaluate(() => {
    GYX.set('gysPhone', true);
    return { mode: gysPh.__N.mode(), r: gysPh.mcp.inspectScreen() };
  });
  check('非安卓：inspect_screen 返回清楚的“只有安卓 App”提示', r.mode === 'none' && /安卓 App/.test(r.r && r.r.err || ''), r);
  await ctx.close();
}

// ② 安卓但没装插件
{
  const { ctx, page } = await openAndroid(false);
  const r = await page.evaluate(() => {
    GYX.set('gysPhone', true);
    return { mode: gysPh.__N.mode(), r: gysPh.mcp.inspectScreen() };
  });
  check('安卓无插件：inspect_screen 提示要装谷雨守护插件', r.mode === 'js' && /谷雨守护/.test(r.r && r.r.err || ''), r);
  await ctx.close();
}

// ③ read 三档权限 + 原生参数 + 错误码
{
  const { ctx, page } = await openAndroid(true);
  const r = await page.evaluate(async () => {
    const s = ms => new Promise(r => setTimeout(r, ms));
    GYX.set('gysPhone', true);
    const mode = gysPh.__N.mode();
    gysPh.setPerm('read', 'no'); await s(20);
    const no = gysPh.mcp.inspectScreen(30);
    gysPh.setPerm('read', 'ask'); await s(20);
    const ask = gysPh.mcp.inspectScreen(24);
    const askTap = gysPh.mcp.tapElement(77, 0);
    const askText = gysPh.mcp.setText(77, 1, '牛肉面');
    const askScroll = gysPh.mcp.scrollScreen(-1);
    const beforeAuto = JSON.stringify(window.__g.calls);
    gysPh.setPerm('read', 'auto'); await s(20);
    const auto = gysPh.mcp.inspectScreen(999);
    const tap = gysPh.mcp.tapElement(77, 0);
    const text = gysPh.mcp.setText(77, 1, '牛肉面');
    const scroll = gysPh.mcp.scrollScreen(-1);
    const badScroll = gysPh.mcp.scrollScreen(0);
    window.__g.inspectError = 'not_meituan';
    const notMeituan = gysPh.mcp.inspectScreen(10);
    window.__g.inspectError = '';
    window.__g.tapError = 'unsafe_action';
    const unsafe = gysPh.mcp.tapElement(77, 0);
    window.__g.tapError = '';
    return { mode, no, ask, askTap, askText, askScroll, beforeAuto, auto, tap, text, scroll, badScroll, notMeituan, unsafe, calls: window.__g.calls };
  });
  check('read=no：快照和动作都拒绝', /不许/.test(r.no && r.no.err || ''), r.no);
  check('read=ask：可以看快照，三个动作都拒绝且没有调用动作原生', r.ask.ok === true && [r.askTap, r.askText, r.askScroll].every(x => /先问我/.test(x && x.err || '')) && !/tap|text|scroll/.test(r.beforeAuto), { ask: r.ask, beforeAuto: r.beforeAuto });
  check('read=auto：快照、点按、输入、滑动分别调用正确原生方法，参数也正确', r.mode === 'plugin' && r.auto.ok && r.tap.ok && r.text.ok && r.scroll.ok && r.calls.inspect[1] === 160 && r.calls.tap[0].join(',') === '77,0' && r.calls.text[0].join(',') === '77,1,牛肉面' && r.calls.scroll[0] === -1, r.calls);
  check('非法滑动方向在 JS 层就拒绝，不碰原生', /只能/.test(r.badScroll && r.badScroll.err || '') && r.badScroll.error === 'bad_direction' && r.calls.scroll.length === 1, r.badScroll);
  check('原生 not_meituan / unsafe_action 错误码原样保留', r.notMeituan.error === 'not_meituan' && r.unsafe.error === 'unsafe_action' && /unsafe_action/.test(r.unsafe.err || ''), { notMeituan: r.notMeituan, unsafe: r.unsafe });

  // ④ 内置 MCP：工具清单、分组、真实调用链
  const m = await page.evaluate(async () => {
    const s = ms => new Promise(r => setTimeout(r, ms));
    myCharacters.push({ id: 9310, name: '测试', persona: '测试角色', worldbooks: [], diaryData: { letters: [], diaries: [] } });
    myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
    window.getApiConfig = () => ({ url: 'https://x.test/v1', key: 'k', model: 'm' });
    setAutoFeature('mcpOn', true, true);
    await gyMcpBuiltin(); await s(100);
    const srv = gyMcpState().servers.find(x => x.kind === 'builtin');
    const names = (srv.tools || []).map(t => t.name);
    const html = (document.getElementById('gyMcpBody') || {}).innerHTML || '';
    const mark = html.indexOf('下面这些要装了');
    const grouped = ['inspect_screen', 'tap_element', 'set_text', 'scroll_screen'].every(n => names.includes(n) && html.indexOf(n) > mark);
    window.__seen = 0; window.__reqs = [];
    window.smartFetch = async (url, opt) => {
      const body = JSON.parse(opt.body); window.__reqs.push(body);
      if (body.tools) {
        window.__seen++;
        if (window.__seen === 1) {
          const fn = body.tools.find(t => /__inspect_screen$/.test(t.function.name)).function.name;
          return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ choices: [{ message: { content: '', tool_calls: [{ id: 'p1', type: 'function', function: { name: fn, arguments: '{"max":12}' } }] } }] }), text: async () => '' };
        }
      }
      const d = { choices: [{ message: { content: '无' } }] };
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => d, text: async () => JSON.stringify(d) };
    };
    const items = await gyMcpDecide('9310', '帮我看看美团页面');
    return { names, grouped, html: html.slice(Math.max(0, mark), mark + 800), items: (items || []).map(i => ({ name: i.name, out: i.out })), inspectCalls: window.__g.calls.inspect };
  });
  check('内置工具清单包含 inspect_screen / tap_element / set_text / scroll_screen', ['inspect_screen', 'tap_element', 'set_text', 'scroll_screen'].every(n => m.names.includes(n)), m.names.join(','));
  check('页面工具在“要装插件”分组里', m.grouped, m.html);
  check('gyMcpDecide 实际调用 inspect_screen，并把完整快照 JSON 交回模型', (m.items[0] || {}).name === 'inspect_screen' && /"token":77/.test((m.items[0] || {}).out || '') && m.inspectCalls.includes(12), m.items);
  await ctx.close();
}

// ⑤ 生成文件里有四个桥接方法
{
  const soft = fs.readFileSync(path.join(root, 'js/61-soft.js'), 'utf8');
  check('js/61-soft.js 已生成四个页面桥接', ['inspectScreen:', 'tapElement:', 'setText:', 'scrollScreen:'].every(s => soft.includes(s)));
}
check('这一趟没有页面报错', !allErrs.length, allErrs.join(' | '));

await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
