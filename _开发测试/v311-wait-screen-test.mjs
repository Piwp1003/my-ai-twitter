// 311：wait_screen 等美团页面变化（只读权限、变化快照、超时、MCP 调用链）
// 用法（项目根目录）：node _开发测试/v311-wait-screen-test.mjs
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
    window.__g = { calls: {}, phase: 0, token: 0, inspectError: '' };
    const J = x => JSON.stringify(x);
    const node = (text, bounds, clickable) => ({
      ref: 0, text, desc: '', id: text === '外卖' ? 'home' : 'result',
      cls: 'android.widget.TextView', bounds, clickable: !!clickable,
      editable: false, scrollable: false, enabled: true
    });
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
        window.__g.token++;
        const nodes = window.__g.phase
          ? [node('外卖', '[0,0][100,100]', true), node('商家列表', '[0,100][300,160]', true)]
          : [node('外卖', '[0,0][100,100]', true)];
        return J({
          ok: true, pkg: 'com.sankuai.meituan', token: window.__g.token,
          count: nodes.length, truncated: false, nodes
        });
      },
      tapElement: () => J({ ok: true }),
      setText: () => J({ ok: true }),
      scrollScreen: () => J({ ok: true })
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

// ① 非安卓 / 安卓但没插件
{
  const { ctx, page } = await openPage();
  const r = await page.evaluate(async () => {
    GYX.set('gysPhone', true);
    return { mode: gysPh.__N.mode(), r: await gysPh.mcp.waitScreen(1, 300) };
  });
  check('非安卓：wait_screen 返回清楚的“只有安卓 App”提示', r.mode === 'none' && /安卓 App/.test(r.r && r.r.err || ''), r);
  await ctx.close();
}
{
  const { ctx, page } = await openAndroid(false);
  const r = await page.evaluate(async () => {
    GYX.set('gysPhone', true);
    return { mode: gysPh.__N.mode(), r: await gysPh.mcp.waitScreen(1, 300) };
  });
  check('安卓无插件：wait_screen 提示要装谷雨守护插件', r.mode === 'js' && /谷雨守护/.test(r.r && r.r.err || ''), r);
  await ctx.close();
}

// ② 权限、页面变化、超时、坏 token
{
  const { ctx, page } = await openAndroid(true);
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    GYX.set('gysPhone', true);
    gysPh.setPerm('read', 'ask');
    const base = gysPh.mcp.inspectScreen(25);
    const baseCalls = window.__g.calls.inspect.length;
    setTimeout(() => { window.__g.phase = 1; }, 100);
    const changed = await gysPh.mcp.waitScreen(base.token, 1000);
    const actionCalls = {
      tap: window.__g.calls.tap || [], text: window.__g.calls.text || [], scroll: window.__g.calls.scroll || []
    };

    const same = gysPh.mcp.inspectScreen(25);
    const timeout = await gysPh.mcp.waitScreen(same.token, 300);

    gysPh.setPerm('read', 'no');
    const denied = await gysPh.mcp.waitScreen(same.token, 300);
    const noCalls = window.__g.calls.inspect.length;
    gysPh.setPerm('read', 'ask');

    const bad = await gysPh.mcp.waitScreen(999999, 300);
    return {
      base, baseCalls, changed, actionCalls, same, timeout, denied, bad,
      noCalls, calls: window.__g.calls.inspect
    };
  });
  check('read=ask：可以只读等待，页面变化后返回新的完整快照和新 token', r.base.ok && r.changed.ok && r.changed.token > r.base.token && r.changed.count === 2 && r.changed.nodes.some(n => n.text === '商家列表'), r.changed);
  check('等待过程只读，没有调用点按、输入或滑动', Object.values(r.actionCalls).every(a => a.length === 0), r.actionCalls);
  check('页面没变化：等待到上限后返回 timeout', r.timeout.error === 'timeout' && /没有变化/.test(r.timeout.err || ''), r.timeout);
  check('read=no：拒绝等待，而且没有继续读页面', /不许/.test(r.denied.err || '') && r.noCalls === r.calls.length, { denied: r.denied, calls: r.calls.length, noCalls: r.noCalls });
  check('不存在的 token：直接返回 bad_snapshot', r.bad.error === 'bad_snapshot' && /过期|不存在/.test(r.bad.err || ''), r.bad);
  check('快照轮询带上了原快照的节点上限', r.calls.includes(25), r.calls);

  // ③ 内置 MCP：工具清单、分组、真实调用 wait_screen
  const m = await page.evaluate(async () => {
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    myCharacters.push({ id: 9311, name: '测试', persona: '测试角色', worldbooks: [], diaryData: { letters: [], diaries: [] } });
    myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
    window.getApiConfig = () => ({ url: 'https://x.test/v1', key: 'k', model: 'm' });
    setAutoFeature('mcpOn', true, true);
    await gyMcpBuiltin(); await sleep(100);
    const srv = gyMcpState().servers.find(x => x.kind === 'builtin');
    const names = (srv.tools || []).map(t => t.name);
    const html = (document.getElementById('gyMcpBody') || {}).innerHTML || '';
    const mark = html.indexOf('下面这些要装了');
    const grouped = html.indexOf('wait_screen') > mark;

    window.__g.phase = 0;
    const base = await gysPh.mcp.inspectScreen(20);
    window.__seen = 0; window.__reqs = [];
    window.smartFetch = async (url, opt) => {
      const body = JSON.parse(opt.body); window.__reqs.push(body);
      if (body.tools) {
        window.__seen++;
        if (window.__seen === 1) {
          const fn = body.tools.find(t => /__wait_screen$/.test(t.function.name)).function.name;
          return {
            ok: true, status: 200, headers: { get: () => null },
            json: async () => ({ choices: [{ message: { content: '', tool_calls: [{ id: 'w1', type: 'function', function: { name: fn, arguments: JSON.stringify({ token: base.token, timeout_ms: 1000 }) } }] } }] }),
            text: async () => ''
          };
        }
      }
      const d = { choices: [{ message: { content: '无' } }] };
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => d, text: async () => JSON.stringify(d) };
    };
    setTimeout(() => { window.__g.phase = 1; }, 100);
    const items = await gyMcpDecide('9311', '等美团页面刷新');
    return { names, grouped, base, items: (items || []).map(i => ({ name: i.name, out: i.out })) };
  });
  check('内置工具清单包含 wait_screen', m.names.includes('wait_screen'), m.names.join(','));
  check('wait_screen 在“要装插件”分组里', m.grouped, '');
  check('gyMcpDecide 实际调用 wait_screen，并把变化后的完整快照交回模型', (m.items[0] || {}).name === 'wait_screen' && new RegExp(`"token":${m.base.token + 1}`).test((m.items[0] || {}).out || '') && /"nodes":/.test((m.items[0] || {}).out || ''), m.items);
  await ctx.close();
}

const soft = fs.readFileSync(path.join(root, 'js/61-soft.js'), 'utf8');
check('js/61-soft.js 已生成 waitScreen 和页面签名', soft.includes('async waitScreen(token, timeoutMs)') && soft.includes('rememberPage(r, n)'));
check('这一趟没有页面报错', !allErrs.length, allErrs.join(' | '));

await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
