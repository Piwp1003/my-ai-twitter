import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync('js/99-mcp.js', 'utf8');
const actions = ['inspectScreen', 'tapElement', 'setText', 'scrollScreen', 'back'];
const tools = ['meituan_order_status','meituan_prepare_checkout','meituan_checkout_summary','meituan_menu','meituan_item_options','meituan_cart','meituan_add_item','meituan_inspect', 'meituan_search', 'meituan_choose_store', 'open_app', 'inspect_screen', 'wait_screen', 'tap_element', 'set_text', 'scroll_screen', 'press_back'].map(name => ({ name }));
const native = { schema: 1, pageSafety: 2, orderConfirmation: 1, orderReceipt: 1, access: true, meituanInstalled: true, actions };
function run(change = {}) {
  let writes = 0; const box = { innerHTML: '' };
  const cap = { mode: 'plugin', version: '1.2.0', featureEnabled: true, readPermission: 'auto', native, ...change.cap };
  const ctx = { console, Date, Map, setTimeout() {}, setInterval() {},
    localStorage: { getItem: k => k === 'gyMcpCfg' ? JSON.stringify({ servers: [{ kind: 'builtin', tools, ...change.server }] }) : null, setItem() { writes++; } },
    document: { getElementById: () => box }, isAutoOn: () => change.mcp !== false,
    getApiConfig: () => change.noApi ? null : { url: 'https://example.invalid', key: 'test' },
    plus: { android: {} }, gysPh: { mcp: { capabilities: () => { if(change.error) throw Error('broken'); return cap; } } },
    fetch() { throw Error('unexpected network'); }
  };
  ctx.window = ctx;
  if(change.web) delete ctx.plus;
  if(change.noBridge) delete ctx.gysPh;
  vm.runInNewContext(source, ctx);
  const r = ctx.gyMcpPhoneCheck(); assert.equal(writes, 0); return { r, html: box.innerHTML };
}
let count = 0;
function check(name, change, id, state) {
  const { r } = run(change); assert.equal(r.checks.find(x => x.id === id)?.state, state, name);
  if (state !== 'pass' && id !== 'model') assert.equal(r.ready, false, name);
  console.log('PASS', name); count++;
}
check('web environment', { web: true }, 'environment', 'blocked');
check('bridge not loaded', { noBridge: true }, 'bridge', 'blocked');
check('bridge error', { error: true }, 'bridge', 'unknown');
check('plugin missing', { cap: { mode: 'js', native: null } }, 'plugin', 'blocked');
check('old plugin handshake', { cap: { native: null } }, 'handshake', 'unknown');
check('invalid handshake', { cap: { native: { schema: 1 } } }, 'handshake', 'unknown');
check('accessibility off', { cap: { native: { ...native, access: false } } }, 'access', 'blocked');
check('app visibility unknown', { cap: { native: { ...native, meituanInstalled: false } } }, 'app', 'unknown');
check('missing native action', { cap: { native: { ...native, actions: ['inspectScreen'] } } }, 'actions', 'blocked');
check('read permission ask', { cap: { readPermission: 'ask' } }, 'permission', 'blocked');
check('feature off', { cap: { featureEnabled: false } }, 'feature', 'blocked');
check('MCP off', { mcp: false }, 'mcp', 'blocked');
check('server off', { server: { on: false } }, 'tools', 'blocked');
check('tools disabled', { server: { tools: tools.map(t => ({ ...t, on: false })) } }, 'tools', 'blocked');
check('old page safety protocol', { cap: { native: { ...native, pageSafety: 1 } } }, 'snapshotSafety', 'blocked');
check('old order confirmation protocol', { cap: { native: { ...native, orderConfirmation: 0 } } }, 'orderConfirmation', 'blocked');
check('model untested', {}, 'model', 'unknown');
assert.equal(run({ noApi: true }).r.ready, false); count++;
assert.equal(run().r.ready, true); count++;
const escaped = run({ cap: { version: '<img src=x onerror=alert(1)>' } });
assert(!escaped.html.includes('<img')); count++;
// Parse the actual dynamic module and exercise its capability bridge without starting the phone app.
const soft = fs.readFileSync('js/61-soft.js', 'utf8');
const match = soft.match(/new Function\('X', 'applyMacros', ("\/\* 📲 真手机(?:[^"\\]|\\.)*")\)/);
const body = JSON.parse(match[1]); new Function('X', 'applyMacros', body);
const method = body.match(/    capabilities\(\) \{([\s\S]*?)\n    \},/)[1];
const bridge = new Function('N', 'X', 'perm', method);
const r = bridge({ mcpCapabilities: () => native, mode: () => 'plugin', ver: () => 'test' }, { on: () => true }, () => 'auto');
assert.equal(r.native, native); assert.equal(r.readPermission, 'auto'); count++;
console.log(`${count} checks passed; no network or storage writes`);
