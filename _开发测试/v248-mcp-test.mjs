// 248：🧰 我的 MCP（网址形式 Streamable HTTP / 老 SSE 回复 / 本地形式走桌面版 / TA 回之前用工具 / 记录 / 测试连接）
// 用法（项目根目录）：node _开发测试/v248-mcp-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd();
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
// 假的桌面版：本地 MCP 由「main.js」起——这里直接在页面里假装
await ctx.addInitScript(() => {
  window.__deskLog = [];
  window.gyDesk = { isDesk: true, oauthLoopback: async () => ({ ok: false, err: 'x' }), mcp: async (op, a) => {
    window.__deskLog.push([op, a && a.command, a && a.msg && a.msg.method]);
    if (op === 'start') return a.command === 'nope' ? { ok: false, err: '起不来：电脑上找不到「nope」这个命令（ENOENT）' } : { ok: true };
    if (op === 'rpc') { const m = a.msg; if (m.id == null) return { ok: true };
      if (m.method === 'initialize') return { ok: true, msg: { jsonrpc: '2.0', id: m.id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'mem' } } } };
      if (m.method === 'tools/list') return { ok: true, msg: { jsonrpc: '2.0', id: m.id, result: { tools: [{ name: 'recall', description: '翻记忆', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } }] } } };
      if (m.method === 'tools/call') return { ok: true, msg: { jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: '她上周说喜欢桂花' }] } } };
    }
    return { ok: true };
  } };
});
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
const chatBodies = []; let toolRound = 0; const mcpCalls = [];
await page.route(/^https?:\/\//, async r => {
  const u = r.request().url(), h = r.request().headers();
  if (/mcp\.test\/mcp/.test(u)) {
    const m = JSON.parse(r.request().postData() || '{}'); mcpCalls.push({ m: m.method, sid: h['mcp-session-id'] || '', auth: h.authorization || '' });
    if (m.id == null) return r.fulfill({ status: 202, body: '' });
    let result;
    if (m.method === 'initialize') return r.fulfill({ status: 200, headers: { 'Content-Type': 'application/json', 'Mcp-Session-Id': 'S1', 'Access-Control-Expose-Headers': 'Mcp-Session-Id' }, body: JSON.stringify({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'weather' } } }) });
    if (m.method === 'tools/list') result = m.params && m.params.cursor ? { tools: [{ name: 'get_forecast', title: '查预报', description: '查未来几天', inputSchema: { type: 'object', properties: { city: { type: 'string' } } } }] } : { tools: [{ name: 'get_weather', title: '查天气', description: '查某个城市现在的天气', inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } }], nextCursor: 'p2' };
    if (m.method === 'tools/call') result = { content: [{ type: 'text', text: m.params.arguments.city + '：小雨 14 度' }] };
    // 用 SSE 回（Streamable HTTP 的另一种回法）
    return r.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: `event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: m.id, result })}\n\n` });
  }
  if (/chat\/completions/.test(u)) {
    const b = JSON.parse(r.request().postData() || '{}'); chatBodies.push(b);
    if (b.tools) {
      toolRound++;
      const last = b.messages[b.messages.length - 1];
      if (last.role === 'tool') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '无' } }] }) });
      const tn = b.tools.find(t => /get_weather/.test(t.function.name)) || b.tools.find(t => /recall/.test(t.function.name));
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '', tool_calls: [{ id: 'c1', type: 'function', function: { name: tn.function.name, arguments: JSON.stringify(/recall/.test(tn.function.name) ? { q: '喜欢' } : { city: '杭州' }) } }] } }], usage: { prompt_tokens: 30, completion_tokens: 8 } }) });
    }
    const content = '今天杭州下小雨，记得带伞～';
    if (b.stream) return r.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n` });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 50, completion_tokens: 9 } }) });
  }
  return r.abort();
});
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof window.gyMcpOpen === 'function' && typeof window.gyMcpDecide === 'function', { timeout: 20000 });
await page.waitForTimeout(3500);
const r = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  myCharacters.push({ id: 8801, name: '立夏', persona: '温柔', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm'; window.appConfirm = async () => true;
  // 整页 + 加一个网址形式的
  gyMcpOpen(); await sleep(50);
  o.full = document.getElementById('gyMcpPage').classList.contains('on') && /总开关还关着/.test(document.getElementById('gyMcpBody').innerText);
  gyMcpNew('http'); await sleep(30);
  document.getElementById('gymcpE_url').value = 'https://mcp.test/mcp'; document.getElementById('gymcpE_headers').value = 'Authorization: Bearer T0K';
  const id = gyMcpState().servers.length ? null : document.querySelector('[onclick^="gyMcpSave"]').getAttribute('onclick').match(/'(.+?)'/)[1];
  gyMcpSave(id); await sleep(30);
  // 🔌 测试连接
  await gyApiTest('mcp', id); const ov = document.getElementById('gyApiTestOv'); o.test = ov ? ov.innerText : ''; if (ov) ov.remove();
  o.tools = gyMcpState().servers[0].tools.map(t => t.name).join(',');
  o.name = gyMcpState().servers[0].name;
  // 关掉一个工具
  gyMcpToolToggle(id, 'get_forecast', false);
  // 打开总开关，跟 TA 说话
  setAutoFeature('mcpOn', true, true);
  globalChats['8801'] = [{ sender: 'me', text: '今天出门要带伞吗', timestamp: Date.now() }];
  switchMainView('chat'); switchChatSession('8801'); await sleep(200);
  await triggerAIBatchReply('8801', '今天出门要带伞吗'); await sleep(1500);
  const msgs = globalChats['8801'];
  o.sys = (msgs.find(m => m.sender === 'system' && m.gyMcp) || {}).text || '';
  o.reply = msgs.filter(m => m.sender !== 'me' && m.sender !== 'system').map(m => m.text).join('|');
  o.log = gyMcpState().log.slice(0, 1).map(x => x.tool + ' ' + x.args + ' ' + x.out).join('');
  o.ctx = window.__gyMcpCtxFor('8801');
  // 本地形式（桌面版）
  gyMcpNew('local'); await sleep(30);
  document.getElementById('gymcpE_command').value = 'npx'; document.getElementById('gymcpE_args').value = '-y\n@modelcontextprotocol/server-memory';
  const lid = document.querySelector('[onclick^="gyMcpSave"]').getAttribute('onclick').match(/'(.+?)'/)[1];
  gyMcpSave(lid); const lr = await gyMcpTest(lid); o.local = lr.ok && /recall/.test(JSON.stringify(lr.rows));
  // 命令找不到 → 大白话
  gyMcpNew('local'); await sleep(30); document.getElementById('gymcpE_command').value = 'nope';
  const bid = document.querySelector('[onclick^="gyMcpSave"]').getAttribute('onclick').match(/'(.+?)'/)[1]; gyMcpSave(bid);
  const br = await gyMcpTest(bid); o.bad = !br.ok && br.explain && /命令找不到/.test(br.explain.n);
  // 粘 JSON 配置
  window.appPrompt = async () => JSON.stringify({ mcpServers: { memo: { command: 'uvx', args: ['mcp-memo'], env: { K: '1' } }, remote: { url: 'https://mcp.test/mcp', headers: { Authorization: 'Bearer X' } } } });
  const before = gyMcpState().servers.length; await gyMcpImport(); o.imp = gyMcpState().servers.length === before + 2 && gyMcpState().servers.some(s => s.name === 'memo' && s.kind === 'local' && /K=1/.test(s.env));
  // 记录页
  gyMcpGo('log'); await sleep(30); o.logPage = /查天气/.test(document.getElementById('gyMcpBody').innerText);
  return o;
});
const replyBody = JSON.stringify(chatBodies.filter(b => !b.tools).slice(-1)[0] || {});
const toolBody = JSON.stringify(chatBodies.find(b => b.tools) || {});
check('打开是一整页；总开关关着时会说', r.full);
check('🔌 测试连接：Streamable HTTP 握手（带会话 id、带你填的请求头），工具清单翻页拿全', /能用/.test(r.test) && r.tools === 'get_weather,get_forecast' && mcpCalls.some(c => c.m === 'tools/list' && c.sid === 'S1') && mcpCalls.every(c => c.auth === 'Bearer T0K') && r.name === 'mcp.test', r.test.slice(0, 120) + ' ' + r.tools);
check('TA 回之前先问模型要不要用工具（只给开着的工具），调了「查天气」', toolRound >= 1 && /get_weather/.test(toolBody) && !/get_forecast/.test(toolBody), toolBody.slice(0, 200));
check('聊天里多一行小字「🧰 立夏 用了「查天气」」，点了能看记录', /🧰 立夏/.test(r.sys) && /查天气/.test(r.sys) && /gyMcpOpen/.test(r.sys), r.sys);
check('工具结果带进这一轮回复的 prompt，TA 照常回你', /杭州：小雨 14 度/.test(replyBody) && /今天杭州下小雨/.test(r.reply), replyBody.slice(0, 120));
check('调用记录：工具、参数、结果都记下了', /查天气/.test(r.log) && /杭州/.test(r.log) && /小雨/.test(r.log) && r.logPage, r.log);
check('本地形式（桌面版起进程）：能连上、列出工具', r.local);
check('本地命令找不到：说清楚是「命令找不到」', r.bad);
check('粘贴 Claude 桌面版那种 JSON 配置，一次导进来几个', r.imp);
check('没有页面报错', !errs.length, errs.join(' | '));
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
