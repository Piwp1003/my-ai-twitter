// 312：press_back 在美团页面返回一页（权限、页面限定、失败回传、MCP 调用链）
// 用法（项目根目录）：node _开发测试/v312-press-back-test.mjs
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
    window.__g = { calls: { inspect: [], back: [] }, inspectError: '', backOk: true };
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
      back: () => {
        window.__g.calls.back.push(Date.now());
        return window.__g.backOk;
      },
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
        window.__g.calls.inspect.push(max);
        if (window.__g.inspectError) return J({ ok: false, error: window.__g.inspectError });
        return J({ ok: true, pkg: 'com.sankuai.meituan', token: 1, count: 1, truncated: false, nodes: [
          { ref: 0, text: '返回', desc: '', id: 'back', cls: 'android.widget.Button', bounds: '0,0,100,100', clickable: true, editable: false, scrollable: false, enabled: true }
        ] });
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
  const r = await page.evaluate(() => {
    GYX.set('gysPhone', true);
    return { mode: gysPh.__N.mode(), r: gysPh.mcp.pressBack() };
  });
  check('非安卓：press_back 返回清楚的“只有安卓 App”提示', r.mode === 'none' && /安卓 App/.test(r.r && r.r.err || ''), r);
  await ctx.close();
}
{
  const { ctx, page } = await openAndroid(false);
  const r = await page.evaluate(() => {
    GYX.set('gysPhone', true);
    return { mode: gysPh.__N.mode(), r: gysPh.mcp.pressBack(), calls: window.__g.calls };
  });
  check('安卓无插件：press_back 提示要装谷雨守护插件，不碰页面或返回', r.mode === 'js' && /谷雨守护/.test(r.r && r.r.err || '') && !r.calls.inspect.length && !r.calls.back.length, r);
  await ctx.close();
}

// ② 权限、页面限定、原生返回失败
{
  const { ctx, page } = await openAndroid(true);
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    GYX.set('gysPhone', true);
    gysPh.setPerm('read', 'no'); await sleep(20);
    const no = gysPh.mcp.pressBack();
    const noCalls = JSON.parse(JSON.stringify(window.__g.calls));
    gysPh.setPerm('read', 'ask'); await sleep(20);
    const ask = gysPh.mcp.pressBack();
    const askCalls = JSON.parse(JSON.stringify(window.__g.calls));
    gysPh.setPerm('read', 'auto'); await sleep(20);
    const ok = gysPh.mcp.pressBack();
    const okCalls = JSON.parse(JSON.stringify(window.__g.calls));
    window.__g.inspectError = 'not_meituan';
    const wrongApp = gysPh.mcp.pressBack();
    const wrongCalls = JSON.parse(JSON.stringify(window.__g.calls));
    window.__g.inspectError = '';
    window.__g.backOk = false;
    const rejected = gysPh.mcp.pressBack();
    return { no, noCalls, ask, askCalls, ok, okCalls, wrongApp, wrongCalls, rejected };
  });
  check('read=no：拒绝返回，不读页面也不调用系统返回', /不许/.test(r.no && r.no.err || '') && !r.noCalls.inspect.length && !r.noCalls.back.length, r.no);
  check('read=ask：动作仍然拦住，不读页面也不调用系统返回', /先问我/.test(r.ask && r.ask.err || '') && r.askCalls.inspect.length === 0 && r.askCalls.back.length === 0, r.ask);
  check('read=auto：先确认当前是允许的美团页面，再调用一次系统返回', r.ok.ok === true && r.ok.action === 'back' && r.okCalls.inspect.length === 1 && r.okCalls.inspect[0] === 1 && r.okCalls.back.length === 1, r.okCalls);
  check('不在美团：原样返回 not_meituan，不调用系统返回', r.wrongApp.error === 'not_meituan' && r.wrongCalls.back.length === 1, r.wrongApp);
  check('系统返回失败：返回 action_rejected，不假装已经返回', r.rejected.error === 'action_rejected' && /没成功/.test(r.rejected.err || ''), r.rejected);

  // ③ 内置 MCP：工具清单、分组、真实调用 press_back
  const m = await page.evaluate(async () => {
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    myCharacters.push({ id: 9312, name: '测试', persona: '测试角色', worldbooks: [], diaryData: { letters: [], diaries: [] } });
    myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
    window.getApiConfig = () => ({ url: 'https://x.test/v1', key: 'k', model: 'm' });
    setAutoFeature('mcpOn', true, true);
    await gyMcpBuiltin(); await sleep(100);
    const srv = gyMcpState().servers.find(x => x.kind === 'builtin');
    const names = (srv.tools || []).map(t => t.name);
    const html = (document.getElementById('gyMcpBody') || {}).innerHTML || '';
    const mark = html.indexOf('下面这些要装了');
    const grouped = names.includes('press_back') && html.indexOf('press_back') > mark;
    window.__g.calls.inspect = []; window.__g.calls.back = []; window.__g.backOk = true;
    window.__seen = 0;
    window.smartFetch = async (url, opt) => {
      const body = JSON.parse(opt.body);
      if (body.tools) {
        window.__seen++;
        if (window.__seen === 1) {
          const fn = body.tools.find(t => /__press_back$/.test(t.function.name)).function.name;
          return {
            ok: true, status: 200, headers: { get: () => null },
            json: async () => ({ choices: [{ message: { content: '', tool_calls: [{ id: 'b1', type: 'function', function: { name: fn, arguments: '{}' } }] } }] }),
            text: async () => ''
          };
        }
      }
      const d = { choices: [{ message: { content: '无' } }] };
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => d, text: async () => JSON.stringify(d) };
    };
    const items = await gyMcpDecide('9312', '从美团当前页面返回');
    return { names, grouped, items: (items || []).map(i => ({ name: i.name, out: i.out })), calls: window.__g.calls };
  });
  check('内置工具清单包含 press_back', m.names.includes('press_back'), m.names.join(','));
  check('press_back 在“要装插件”分组里', m.grouped, '');
  check('gyMcpDecide 实际调用 press_back，并把成功结果交回模型', (m.items[0] || {}).name === 'press_back' && /"action":"back"/.test((m.items[0] || {}).out || '') && m.calls.back.length === 1, m.items);
  await ctx.close();
}

const soft = fs.readFileSync(path.join(root, 'js/61-soft.js'), 'utf8');
check('js/61-soft.js 已生成 back 桥接和 pressBack', soft.includes('back: () => {') && soft.includes('pressBack() {'));
check('这一趟没有页面报错', !allErrs.length, allErrs.join(' | '));

await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
