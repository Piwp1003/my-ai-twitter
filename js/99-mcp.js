// =====================================================================
//  🧰 我的 MCP（248）：自己接 MCP 服务器，TA 回你之前能用上面的工具
//  · 网址形式（Streamable HTTP，老的 SSE 也认）：网页、安卓 App、桌面版都能用
//    （网页版要对面开了跨域；App 走原生网络不受限；桌面版不受限）
//  · 本地形式（command + args，跟 Claude 桌面版的配置一样）：只有桌面版 exe 能用，由 main.js 起进程
//  怎么用上：你给 TA 发消息 → 谷雨先问一次模型「要不要用工具」（带着工具清单，最多几轮）→
//  真用了就把结果塞进这一轮的 prompt（注入内容管理 →「🧰 我的 MCP」）→ TA 照常回你。
//  聊天里会多一行小字「🧰 立夏 用了「xxx」」，点开能看每次调用的参数和结果。
// =====================================================================
(function () {
    if (window.__gyMcpLoaded) return; window.__gyMcpLoaded = true;
    const LS = 'gyMcpCfg', LOG = 'gyMcpLog';
    const PROTO = '2025-06-18';
    const isDesk = () => !!(window.gyDesk && window.gyDesk.isDesk && window.gyDesk.mcp);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const toast = (t, d) => { try { if (typeof showToast === 'function') showToast('', t, d || '', null, null, false); } catch (e) {} };
    const on = k => (typeof isAutoOn === 'function') ? isAutoOn(k) : false;
    const chars = () => (typeof myCharacters !== 'undefined' ? myCharacters : []);
    const charOf = id => chars().find(c => String(c.id) === String(id)) || null;
    const uid = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    let C = { servers: [], chars: 'all', api: 'main', rounds: 3, keep: 200 };
    try { C = Object.assign(C, JSON.parse(localStorage.getItem(LS) || '{}') || {}); } catch (e) {}
    let L = []; try { L = JSON.parse(localStorage.getItem(LOG) || '[]') || []; } catch (e) { L = []; }
    const save = () => { try { localStorage.setItem(LS, JSON.stringify(C)); } catch (e) {} };
    const saveLog = () => { const k = Math.max(0, Number(C.keep) || 0); if (k) L = L.slice(0, k); try { localStorage.setItem(LOG, JSON.stringify(L)); } catch (e) { L = L.slice(0, 50); try { localStorage.setItem(LOG, JSON.stringify(L)); } catch (e2) {} } };

    // Only checks metadata. Never launches an app, reads a screen, or calls AI.
    window.gyMcpPhoneCheck = function () {
        const checks = [];
        const add = (id, state, detail) => checks.push({ id, state, detail });
        add('environment', isApp() ? 'pass' : 'blocked', isApp() ? '安卓 App' : '请在 Android 版谷雨中检查；当前环境不能直接操作手机');
        let c = null;
        if (isApp()) {
            try {
                const bridge = window.gysPh && window.gysPh.mcp;
                if (bridge && typeof bridge.capabilities === 'function') c = bridge.capabilities();
                else add('bridge', 'blocked', '真手机桥接未就绪，请等待启动完成或更新网页资源');
            } catch (e) { add('bridge', 'unknown', '能力读取失败，请重新检查'); }
        }
        if (c) {
            add('plugin', c.mode === 'plugin' ? 'pass' : 'blocked', c.mode === 'plugin' ? '谷雨守护 ' + (c.version || '版本未知') : '未检测到谷雨守护插件，需要安装含插件的 APK');
            add('feature', c.featureEnabled ? 'pass' : 'blocked', c.featureEnabled ? '真手机功能已开启' : '请开启「真手机」功能');
            add('permission', c.readPermission === 'auto' ? 'pass' : 'blocked', c.readPermission === 'auto' ? '页面操作已授权' : '请在真手机设置中将「读屏幕上的字」设为「TA 直接做」');
            const n = c.native;
            if (n && n.schema === 1 && typeof n.access === 'boolean' && typeof n.meituanInstalled === 'boolean' && Array.isArray(n.actions)) {
                add('access', n.access ? 'pass' : 'blocked', n.access ? '无障碍服务已运行' : '无障碍服务未运行，请在系统设置开启或重新启用');
                add('app', n.meituanInstalled ? 'pass' : 'unknown', n.meituanInstalled ? '检测到美团或美团外卖' : '未检测到可启动的美团；请确认安装情况及系统应用可见性');
                const missing = ['inspectScreen', 'tapElement', 'setText', 'scrollScreen', 'back'].filter(k => !n.actions.includes(k));
                add('snapshotSafety', n.pageSafety === 2 ? 'pass' : 'blocked', n.pageSafety === 2 ? '支持整页快照校验与一次性操作' : '旧插件缺少安全快照协议，请安装新 APK');
                add('orderConfirmation', n.orderConfirmation === 1 ? 'pass' : 'blocked', n.orderConfirmation === 1 ? '支持本机原生订单确认与提交防重' : '缺少原生订单确认能力，请安装新 APK；不会开放提交');
                add('orderReceipt', n.orderReceipt === 1 ? 'pass' : 'blocked', n.orderReceipt === 1 ? '支持订单身份与结果核验' : '缺少原生订单结果核验，请安装新 APK');
                add('actions', missing.length ? 'blocked' : 'pass', missing.length ? '插件缺少页面操作能力，请更新 APK：' + missing.join('、') : '插件已声明读取、点击、输入、滚动、返回能力');
            } else add('handshake', 'unknown', '插件未提供有效的能力握手；旧版本不能仅凭版本号确认，请更新含新插件的 APK');
        }
        add('mcp', on('mcpOn') ? 'pass' : 'blocked', on('mcpOn') ? 'MCP 总开关已开启' : 'MCP 总开关未开启');
        const server = C.servers.find(x => x.kind === 'builtin' && x.on !== false);
        const needed = ['meituan_order_status','meituan_prepare_checkout','meituan_checkout_summary','meituan_menu','meituan_item_options','meituan_cart','meituan_add_item','meituan_inspect', 'meituan_search', 'meituan_choose_store', 'open_app', 'inspect_screen', 'wait_screen', 'tap_element', 'set_text', 'scroll_screen', 'press_back'];
        const enabled = server && needed.every(k => (server.tools || []).some(t => t.name === k && t.on !== false));
        add('tools', enabled ? 'pass' : 'blocked', enabled ? '内置手机页面工具已启用' : '请添加「用这台手机（内置）」、测试连接，并启用页面操作工具');
        let api = null; try { if (typeof getApiConfig === 'function') api = getApiConfig(C.api === 'sub'); } catch (e) {}
        add('model', api && api.url && api.key ? 'unknown' : 'blocked', api && api.url && api.key ? '模型已配置；自检未请求模型，工具调用兼容性仍需实测' : '请配置 MCP 所选的主 / 副 API');
        const required = checks.filter(x => x.id !== 'model');
        const ready = required.every(x => x.state === 'pass') && !!(api && api.url && api.key);
        const report = { at: Date.now(), ready, checks };
        const box = document.getElementById('gyMcpPhoneCheck');
        if (box) box.innerHTML = '<b>' + (ready ? '设备基础条件已具备，尚未验证实际操作' : '尚不能确认可操作') + '</b>'
            + checks.map(x => '<div>' + ({ pass: '✅', blocked: '❌', unknown: '❔' })[x.state] + ' ' + esc(x.detail) + '</div>').join('')
            + '<div>只检查能力和设置，不读取屏幕、不调用模型、不操作其他软件；不代表已经支持自动下单。</div>';
        return report;
    };

    /* ---------------- 连接 ---------------- */
    const CONN = {};   // serverId → { tools, rpc(method, params), close() }
    const doFetch = (url, opt) => (typeof smartFetch === 'function' ? smartFetch(url, opt) : fetch(url, opt));
    function headersOf(s) {
        const h = {};
        String(s.headers || '').split(/\n/).forEach(line => { const i = line.indexOf(':'); if (i > 0) { const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim(); if (k) h[k] = v; } });
        return h;
    }
    // SSE 文本里挑出 JSON-RPC 回复
    function parseSse(text) {
        const out = [];
        String(text || '').split(/\r?\n\r?\n/).forEach(block => {
            const data = block.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).replace(/^ /, '')).join('\n');
            if (!data) return; try { out.push(JSON.parse(data)); } catch (e) {}
        });
        return out;
    }
    async function httpConn(s) {
        let sid = '', idn = 1;
        const base = String(s.url || '').trim();
        if (!/^https?:\/\//i.test(base)) throw new Error('网址要以 http:// 或 https:// 开头');
        async function post(msg) {
            const h = Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': PROTO }, headersOf(s));
            if (sid) h['Mcp-Session-Id'] = sid;
            const res = await doFetch(base, { method: 'POST', headers: h, body: JSON.stringify(msg) });
            try { const x = res.headers && res.headers.get && res.headers.get('mcp-session-id'); if (x) sid = x; } catch (e) {}
            if (msg.id == null) return null;   // 通知，不等回复
            const text = await res.text();
            if (!res.ok) { const e = new Error('HTTP ' + res.status + (text ? '：' + text.slice(0, 160) : '')); e.status = res.status; throw e; }
            let arr = [];
            if (/^\s*[\[{]/.test(text)) { try { const j = JSON.parse(text); arr = Array.isArray(j) ? j : [j]; } catch (e) {} } else arr = parseSse(text);
            const r = arr.find(x => x && x.id === msg.id) || arr.find(x => x && (x.result || x.error));
            if (!r) throw new Error('服务器没回这条请求');
            if (r.error) throw new Error((r.error.message || 'MCP 报错') + (r.error.code ? '（' + r.error.code + '）' : ''));
            return r.result;
        }
        const rpc = (method, params) => post({ jsonrpc: '2.0', id: idn++, method, params: params || {} });
        await rpc('initialize', { protocolVersion: PROTO, capabilities: {}, clientInfo: { name: 'guyu', title: '谷雨', version: String(typeof GY_VERSION !== 'undefined' ? GY_VERSION : '0') } });
        try { await post({ jsonrpc: '2.0', method: 'notifications/initialized' }); } catch (e) {}
        return { rpc, close() {} };
    }
    // 老式 SSE（2024-11-05）：GET 拿到 endpoint，POST 发请求，回复从 SSE 流里回来
    async function sseConn(s) {
        const base = String(s.url || '').trim();
        const ctrl = new AbortController();
        const res = await fetch(base, { headers: Object.assign({ Accept: 'text/event-stream' }, headersOf(s)), signal: ctrl.signal });
        if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
        const rd = res.body.getReader(), dec = new TextDecoder();
        let buf = '', endpoint = null, idn = 1; const wait = {};
        let gotEp; const epP = new Promise(r => { gotEp = r; });
        (async () => {
            try {
                for (;;) {
                    const { value, done } = await rd.read(); if (done) break;
                    buf += dec.decode(value, { stream: true });
                    let i; while ((i = buf.search(/\r?\n\r?\n/)) >= 0) {
                        const block = buf.slice(0, i); buf = buf.slice(i).replace(/^\r?\n\r?\n/, '');
                        const ev = (/^event:\s*(.*)$/m.exec(block) || [])[1] || 'message';
                        const data = block.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).replace(/^ /, '')).join('\n');
                        if (ev === 'endpoint') { endpoint = new URL(data.trim(), base).href; gotEp(); continue; }
                        try { const j = JSON.parse(data); if (j && j.id != null && wait[j.id]) { wait[j.id](j); delete wait[j.id]; } } catch (e) {}
                    }
                }
            } catch (e) {}
        })();
        await Promise.race([epP, new Promise((_, rej) => setTimeout(() => rej(new Error('等不到 SSE 的 endpoint')), 10000))]);
        async function send(msg) {
            const h = Object.assign({ 'Content-Type': 'application/json' }, headersOf(s));
            const p = msg.id != null ? new Promise((res2, rej) => { wait[msg.id] = res2; setTimeout(() => { if (wait[msg.id]) { delete wait[msg.id]; rej(new Error('等回复超时')); } }, 60000); }) : null;
            const r = await fetch(endpoint, { method: 'POST', headers: h, body: JSON.stringify(msg) });
            if (!r.ok && r.status !== 202) throw new Error('HTTP ' + r.status);
            if (!p) return null;
            const j = await p; if (j.error) throw new Error(j.error.message || 'MCP 报错'); return j.result;
        }
        const rpc = (method, params) => send({ jsonrpc: '2.0', id: idn++, method, params: params || {} });
        await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'guyu', version: '1' } });
        try { await send({ jsonrpc: '2.0', method: 'notifications/initialized' }); } catch (e) {}
        return { rpc, close() { try { ctrl.abort(); } catch (e) {} } };
    }
    async function localConn(s) {
        if (!isDesk()) throw new Error('本地 MCP 只有桌面版（exe）能用');
        const key = 'mcp_' + s.id;
        const args = Array.isArray(s.args) ? s.args : String(s.args || '').split(/\n/).map(x => x.trim()).filter(Boolean);
        const env = {}; String(s.env || '').split(/\n/).forEach(line => { const i = line.indexOf('='); if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim(); });
        const st = await window.gyDesk.mcp('start', { key, command: String(s.command || '').trim(), args, env, cwd: s.cwd || '' });
        if (!st || !st.ok) throw new Error((st && st.err) || '起不来');
        let idn = 1;
        const rpc = async (method, params) => {
            const r = await window.gyDesk.mcp('rpc', { key, msg: { jsonrpc: '2.0', id: idn++, method, params: params || {} } });
            if (!r || !r.ok) throw new Error((r && r.err) || '没回复');
            if (r.msg && r.msg.error) throw new Error(r.msg.error.message || 'MCP 报错');
            return r.msg && r.msg.result;
        };
        await rpc('initialize', { protocolVersion: PROTO, capabilities: {}, clientInfo: { name: 'guyu', version: '1' } });
        try { await window.gyDesk.mcp('rpc', { key, msg: { jsonrpc: '2.0', method: 'notifications/initialized' }, noWait: true }); } catch (e) {}
        return { rpc, close() { try { window.gyDesk.mcp('stop', { key }); } catch (e) {} } };
    }
    // 📱 内置：不连任何服务器、不靠别的软件，直接用 App 自带的 Native.js（plus.android）调手机。
    // 底下复用「📲 真手机」那套 N（装了谷雨守护插件走插件，没装走 Native.js），只有安卓 App 里能用。
    const isApp = () => !!(window.plus && plus.android);
    const PN = () => { const n = window.gysPh && window.gysPh.__N; if (!n || !n.ok()) throw new Error('只有安卓 App 里能用（网页 / 电脑上调不了手机）'); return n; };
    const okOr = (r, bad) => { if (!r) throw new Error(bad); return r; };
    const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
    const mins = ms => { const m = Math.round((ms || 0) / 60e3); return m >= 60 ? Math.floor(m / 60) + ' 小时 ' + (m % 60) + ' 分' : m + ' 分钟'; };
    const appLabel = pkg => { try { const a = PN().apps().find(x => x.pkg === pkg); return a ? a.label : pkg; } catch (e) { return pkg; } };
    const notify = (title, body) => { if (typeof sendBrowserNotification === 'function') sendBrowserNotification(title, body); else if (window.plus && plus.push) plus.push.createMessage(body, {}, { title }); };
    const O = (props, req) => ({ type: 'object', properties: props || {}, required: req || [] });
    const pageTool = async (name, ...a) => {
        const M = window.gysPh && gysPh.mcp;
        if (!M || typeof M[name] !== 'function') throw new Error('真手机没加载上');
        const r = await M[name](...a);
        return r;
    };
    const meituanTool = (name, args, env) => {
        if (!window.gyMeituan) throw new Error('美团适配模块未加载，请更新谷雨');
        return window.gyMeituan[name](args, env.check);
    };
    const cartTool = (name, args, env) => {
        if (!window.gyMeituanCart) throw new Error('美团购物车模块未加载，请更新谷雨');
        return window.gyMeituanCart[name](args, env.check);
    };
    const itemArgs = { token: { type: 'integer', minimum: 1 }, ref: { type: 'integer', minimum: 0 }, store: { type: 'string', minLength: 1, maxLength: 80 }, name: { type: 'string', minLength: 1, maxLength: 80 } };
    const checkoutTool = (name, args, env) => {
        if (!window.gyMeituanCheckout) throw new Error('结算摘要模块未加载，请更新谷雨');
        return window.gyMeituanCheckout[name](args, env.check);
    };
    const BUILTIN = {
        meituan_order_status: ['只读当前真实订单详情；区分待付款、已支付、失败与未知。只有 confirmedAssociation=true 才能认定对应本次提交；不会支付、取消、退款或重试提交', O(), (a, env) => window.gyMeituanOrders ? window.gyMeituanOrders.read(a,env.check) : {ok:true,state:'unknown',note:'订单核验模块未加载'}],
        meituan_prepare_checkout: ['从已展开且数量核对完整的购物车进入结算页，读取摘要；只点「去结算」，不提交订单或付款，store 必须是用户指定的店铺', O({store:{type:'string',minLength:1,maxLength:80}}, ['store']), (a, env) => checkoutTool('prepare', a, env)],
        meituan_checkout_summary: ['只读真实结算页的商品、数量、费用和配送信息；缺失字段标为未确认，完整地址和联系方式仅在本机核对，不上传模型', O(), (a, env) => checkoutTool('read', a, env)],
        meituan_menu: ['读取当前店铺可见商品及明确加购/选规格入口；候选必须有屏幕证据', O(), (a, env) => cartTool('list', a, env)],
        meituan_item_options: ['读取指定候选商品的规格并返回菜单；只支持明确的单选规格，未知布局需人工处理，不加购', O(itemArgs, ['token','ref','store','name']), (a, env) => cartTool('options', a, env)],
        meituan_cart: ['只读已展开的真实购物车明细，不点击结算；数量不明确时停止', O(), (a, env) => cartTool('readCart', a, env)],
        meituan_add_item: ['按用户指定的商品和规格加购 1～5 份，每份加购后核对同款数量增加 1；不提交订单。规格必须先从 meituan_item_options 获取，必选项不可猜测或省略', O({ ...itemArgs, quantity: { type: 'integer', minimum: 1, maximum: 5 }, specs: { type: 'array', maxItems: 10, items: { type: 'object', required: ['group','option'], additionalProperties: false, properties: { group: { type: 'string', minLength: 1, maxLength: 80 }, option: { type: 'string', minLength: 1, maxLength: 80 } } } } }, ['token','ref','store','name','quantity','specs']), (a, env) => cartTool('add', a, env)],
        meituan_inspect: ['读取真实美团页面及有屏幕证据的店铺候选；无法识别时停止', O(), (a, env) => meituanTool('inspect', a, env)],
        meituan_search: ['在真实美团中搜索商家；query 是用户要求的搜索词。只搜索，不加购不下单；识别不清时需人工处理', O({ query: { type: 'string', minLength: 1, maxLength: 80 } }, ['query']), (a, env) => meituanTool('search', a, env)],
        meituan_choose_store: ['进入当前候选里的指定店铺；token、ref、name 必须来自最近一次美团读取或搜索结果，不得编造', O({ token: { type: 'integer', minimum: 1 }, ref: { type: 'integer', minimum: 0 }, name: { type: 'string', minLength: 1, maxLength: 80 } }, ['token', 'ref', 'name']), (a, env) => meituanTool('chooseStore', a, env)],
        now: ['手机上现在几点、星期几', O(), () => { const n = new Date(); return n.toLocaleString() + ' 星期' + '日一二三四五六'[n.getDay()]; }],
        phone_status: ['看手机现在的状态：电量、在不在充电、音量、有没有戴耳机、亮度、正在用哪个软件', O(), () => {
            const s = PN().status(); const o = {};
            if (s.battery != null) o['电量'] = s.battery + '%' + (s.charging ? '（在充电）' : '');
            if (s.vol != null) o['媒体音量'] = s.vol + ' / ' + s.volMax;
            if (s.headset != null) o['耳机'] = s.headset ? '戴着' : '没戴';
            if (s.bright != null && s.bright >= 0) o['亮度'] = s.bright + ' / 255';
            if (s.fg) o['正在用'] = appLabel(s.fg);
            return JSON.stringify(o);
        }],
        screen_time: ['看她今天的屏幕使用时间、解锁次数、哪些软件用得最多（要先在系统里给谷雨开「使用情况访问权限」）', O(), () => {
            const u = PN().usage(today0(), Date.now());
            if (!u || u.err) throw new Error('读不到：去系统设置 →「使用情况访问权限」里给谷雨打开');
            return `今天一共 ${mins(u.total)}，解锁 ${u.unlocks || 0} 次。` + (u.apps || []).slice(0, 8).map(a => `${a.label} ${mins(a.ms)}`).join('、');
        }],
        notify: ['在她手机上弹一条通知', O({ title: { type: 'string' }, content: { type: 'string' } }, ['content']), a => { notify(a.title || '谷雨', String(a.content || '')); return '通知发出去了'; }],
        remind_later: ['过几分钟在她手机上弹提醒（叫她喝水、睡觉、起床）。谷雨被系统杀掉的话就弹不出来了，要准点的用 set_alarm', O({ minutes: { type: 'number' }, content: { type: 'string' } }, ['minutes', 'content']), a => {
            const m = Math.max(0.1, Math.min(24 * 60, Number(a.minutes) || 1)), at = new Date(Date.now() + m * 60e3);
            setTimeout(() => notify('⏰ 提醒', String(a.content || '')), m * 60e3);
            return '定好了，' + at.toTimeString().slice(0, 5) + ' 左右提醒';
        }],
        set_alarm: ['给她手机设一个真闹钟（系统时钟里的）', O({ hour: { type: 'integer' }, minute: { type: 'integer' }, label: { type: 'string' } }, ['hour', 'minute']), a => { okOr(PN().alarm(+a.hour || 0, +a.minute || 0, a.label || '谷雨'), '设不了：这个手机的时钟不让别的软件设闹钟'); return `闹钟设好了：${a.hour}:${String(a.minute).padStart(2, '0')}`; }],
        vibrate: ['让她手机震一下（心跳那种）', O({ pattern: { type: 'string', description: '震 / 停的毫秒数，逗号隔开，比如 0,300,150,300' } }), a => { okOr(PN().buzz(a.pattern || '0,300,150,300'), '震不了'); return '震了'; }],
        torch: ['开 / 关手电筒', O({ on: { type: 'boolean' } }, ['on']), a => { okOr(PN().torch(!!a.on), '手电筒调不动'); return '手电筒' + (a.on ? '开了' : '关了'); }],
        volume: ['调媒体音量（0-100）', O({ percent: { type: 'integer' } }, ['percent']), a => { okOr(PN().vol(Math.max(0, Math.min(100, +a.percent || 0))), '调不了音量'); return '音量调到 ' + a.percent + '%'; }],
        brightness: ['调屏幕亮度（1-255，要先给谷雨开「修改系统设置」）', O({ level: { type: 'integer' } }, ['level']), a => { okOr(PN().bright(+a.level || 128), '调不了：去系统设置给谷雨开「修改系统设置」'); return '亮度调好了'; }],
        clipboard_set: ['往她剪贴板里放一段字（偷偷留话）', O({ text: { type: 'string' } }, ['text']), a => { okOr(PN().clip(String(a.text || '')), '放不进去'); return '放进剪贴板了'; }],
        clipboard_get: ['看她剪贴板里复制了什么', O(), () => {
            PN(); const c = plus.android.runtimeMainActivity(), inv = plus.android.invoke;
            const clip = inv(inv(c, 'getSystemService', 'clipboard'), 'getPrimaryClip');
            const t = clip && inv(inv(clip, 'getItemAt', 0), 'getText');
            return t ? String(t) : '剪贴板是空的';
        }],
        open_app: ['在她手机上打开一个软件（按名字找，比如 微信、网易云音乐）', O({ name: { type: 'string' } }, ['name']), a => {
            const n = PN(), q = String(a.name || '').trim().toLowerCase();
            const hit = n.apps().find(x => x.label.toLowerCase() === q) || n.apps().find(x => x.label.toLowerCase().includes(q) || x.pkg.toLowerCase().includes(q));
            if (!hit) throw new Error('手机上没找到「' + a.name + '」');
            okOr(n.openApp(hit.pkg), '打不开'); return '打开了 ' + hit.label;
        }],
        location: ['看她手机现在大概在哪（要给谷雨定位权限）', O(), () => new Promise((res, rej) => {
            if (!(window.plus && plus.geolocation)) return rej(new Error('只有 App 里能定位'));
            plus.geolocation.getCurrentPosition(p => { const c = p.coords, ad = p.address || {}; res([ad.province, ad.city, ad.district, ad.street].filter(Boolean).join('') || p.addresses || `纬度 ${c.latitude.toFixed(4)}，经度 ${c.longitude.toFixed(4)}`); }, e => rej(new Error('定位失败：' + (e && e.message || '没权限或没信号'))), { timeout: 15000, maximumAge: 120000, geocode: true });
        })],
        // 下面几样要装了「谷雨守护」插件才有，而且照她在「📲 真手机 → 设置」里定的档来（设成「不许」的就用不了）
        read_notifications: ['看她手机上别的软件发来的通知（谁给她发了消息）。要装谷雨守护插件 + 她允许「读通知」', O({ limit: { type: 'integer' } }), a => {
            const r = (window.gysPh && gysPh.mcp) ? gysPh.mcp.notifications(a.limit) : { err: '真手机没加载上' };
            if (r.err) throw new Error(r.err);
            return r.list.length ? r.list.map(x => `${x.app}：${x.title || ''} ${x.text || ''}`.trim()).join('\n') : (r.note || '现在没有通知');
        }],
        read_screen: ['看她手机屏幕上现在显示的字（她正在看什么）。要装谷雨守护插件 + 她允许「读屏幕上的字」', O(), () => {
            const r = (window.gysPh && gysPh.mcp) ? gysPh.mcp.readScreen() : { err: '真手机没加载上' };
            if (r.err) throw new Error(r.err);
            return `她在用「${r.app}」，屏幕上：${r.text}`;
        }],
        inspect_screen: ['看当前美团页面里能点的文字、输入框和位置，返回这次快照的 token。只读；token 30 秒内有效，页面一换就失效', O({ max: { type: 'integer', minimum: 1, maximum: 160, description: '最多返回多少个节点，默认 80' } }), a => pageTool('inspectScreen', a.max)],
        wait_screen: ['等当前美团页面出现变化，再返回一份新的完整快照。只读；token 用 inspect_screen 返回的那个，最多等 15 秒', O({ token: { type: 'integer', minimum: 1 }, timeout_ms: { type: 'integer', minimum: 300, maximum: 15000, description: '最多等多少毫秒，默认 8000' } }, ['token']), (a, env) => pageTool('waitScreen', a.token, a.timeout_ms, env.check)],
        tap_element: ['点当前美团页面快照里的一个元素。要装谷雨守护插件，并把「读屏幕上的字」设成「TA 直接做」；支付、提交订单、验证码这类动作会被拦住', O({ token: { type: 'integer', minimum: 1 }, ref: { type: 'integer', minimum: 0 } }, ['token', 'ref']), (a, env) => pageTool('tapElement', a.token, a.ref, env.check)],
        set_text: ['往当前美团页面快照里的输入框写字。要装谷雨守护插件，并把「读屏幕上的字」设成「TA 直接做」；密码框写不了', O({ token: { type: 'integer', minimum: 1 }, ref: { type: 'integer', minimum: 0 }, value: { type: 'string' } }, ['token', 'ref', 'value']), (a, env) => pageTool('setText', a.token, a.ref, a.value, env.check)],
        scroll_screen: ['使用最新快照 token 在美团页面上下滑；操作后返回新快照。1 = 向下，-1 = 向上。要装谷雨守护插件，并把「读屏幕上的字」设成「TA 直接做」', O({ direction: { type: 'integer', enum: [1, -1] }, token: { type: 'integer', minimum: 1 } }, ['direction', 'token']), (a, env) => pageTool('scrollScreen', a.direction, a.token, env.check)],
        press_back: ['使用最新快照 token 在当前美团页面按一次系统返回，退出当前页面、弹窗或输入状态。要装谷雨守护插件，并把「读屏幕上的字」设成「TA 直接做」', O({ token: { type: 'integer', minimum: 1 } }, ['token']), (a, env) => pageTool('pressBack', a.token, env.check)],
        pull_back: ['把她从别的软件拉回谷雨（想她了 / 催她别玩了）。要装谷雨守护插件 + 她把「把你拉回谷雨」设成了「TA 直接做」', O(), async () => {
            const r = (window.gysPh && gysPh.mcp) ? await gysPh.mcp.act('pull') : { err: '真手机没加载上' };
            if (r.err) throw new Error(r.err); return '把她拉回谷雨了';
        }],
        lock_apps: ['把她手机上的软件锁住一会儿（她说「帮我把抖音锁了」「别让我刷小红书了」「管管我」，或者你觉得她该歇歇了）。apps 填软件名字，可以好几个（抖音、小红书、微博、王者荣耀……）；不填 apps 就锁她今天用得最多的那几个娱乐软件。她开口让你锁的时候必须调用这个工具——只在嘴上说「锁了」而不调用，等于没锁', O({ apps: { type: 'array', items: { type: 'string' }, description: '要锁的软件名字，照她说的填，比如 ["抖音"]' }, minutes: { type: 'integer', description: '锁多少分钟，默认 30' }, all: { type: 'boolean', description: '除了谷雨全都锁（她明确要「全锁」才用）' }, reason: { type: 'string', description: '为什么锁（会写在拦截页上给她看，像你会说的话）' } }), async (a, env) => {
            a = a || {}; env = env || {};
            const M = window.gysPh && gysPh.mcp;
            if (!M) throw new Error('真手机没加载上');
            if (!M.lock) { const r0 = await M.act('lock', '', { min: Math.max(1, Math.min(180, +a.minutes || 30)) }); if (r0.err) throw new Error(r0.err); return '锁上了'; }
            const apps = [].concat(a.apps || a.app || a.name || []).filter(Boolean);
            const r = await M.lock({ apps, minutes: a.minutes, all: !!a.all, why: a.reason || '', cid: env.cid, asked: !!env.asked });
            if (r.err) throw new Error(r.err);
            if (r.asked) return r.note;
            return `锁上了：${r.names}，到 ${r.until}。` + (r.miss && r.miss.length ? `（没找到：${r.miss.join('、')}）` : '') + (r.weak ? `\n要老实告诉她的一点：${r.weak}` : '');
        }],
        unlock_apps: ['把你之前锁住的软件解开（她好好求你了 / 时间差不多了 / 她有正事要用）。apps 不填就全部解开', O({ apps: { type: 'array', items: { type: 'string' }, description: '只解开这几个；不填 = 全解开' } }), async a => {
            const M = window.gysPh && gysPh.mcp; if (!M || !M.unlock) throw new Error('真手机没加载上');
            const r = M.unlock({ apps: [].concat((a && (a.apps || a.app || a.name)) || []).filter(Boolean) });
            if (r.err) throw new Error(r.err); return '解开了：' + r.names;
        }]
    };
    async function builtinConn() {
        if (!isApp()) throw new Error('只有安卓 App 里能用（网页 / 电脑上调不了手机）');
        return {
            async rpc(method, p) {
                if (method === 'tools/list') return { tools: Object.keys(BUILTIN).map(k => ({ name: k, description: BUILTIN[k][0], inputSchema: BUILTIN[k][1] })) };
                if (method === 'tools/call') {
                    const t = BUILTIN[p && p.name]; if (!t) throw new Error('没有这个工具：' + (p && p.name));
                    try { const args = checkedArgs(p && p.arguments, t[1], true); const value = await t[2](args, (p && p._gy) || {}); const data = value && typeof value === 'object' ? value : null; return { content: [{ type: 'text', text: data ? JSON.stringify(data) : String(value) }], ...(data ? { structuredContent: data, isError: data.ok === false || !!data.err } : {}) }; }
                    catch (e) { return { content: [{ type: 'text', text: String(e && e.message || e) }], isError: true }; }
                }
                return {};
            },
            close() {}
        };
    }
    async function connect(s, fresh, task) {
        if (task) task.check();
        if (!fresh && CONN[s.id]) return CONN[s.id];
        if (CONN[s.id]) { try { CONN[s.id].close(); } catch (e) {} delete CONN[s.id]; }
        let c;
        if (s.kind === 'builtin') c = await builtinConn();
        else if (s.kind === 'local') c = await localConn(s);
        else {
            try { c = await httpConn(s); }
            catch (e) { if (e && (e.status === 404 || e.status === 405 || e.status === 400)) c = await sseConn(s); else throw e; }
        }
        if (task) task.check();
        // 工具清单（可能分页）
        let tools = [], cursor;
        for (let i = 0; i < 10; i++) {
            if (task) task.check();
            const r = await c.rpc('tools/list', cursor ? { cursor } : {});
            if (task) task.check();
            tools = tools.concat((r && r.tools) || []);
            cursor = r && r.nextCursor; if (!cursor) break;
        }
        c.tools = tools;
        const old = {}; (s.tools || []).forEach(t => { old[t.name] = t.on; });
        s.tools = tools.map(t => ({ name: t.name, title: t.title || (t.annotations && t.annotations.title) || '', description: String(t.description || '').slice(0, 600), inputSchema: t.inputSchema || { type: 'object', properties: {} }, on: old[t.name] !== false }));
        s.ok = Date.now(); s.err = ''; save();
        CONN[s.id] = c;
        return c;
    }
    // Validate without coercion: "1" must not turn into a node ref or an amount.
    function validateArgs(value, schema, path, depth) {
        path = path || 'arguments'; depth = depth || 0; if (schema == null) schema = {};
        if (depth > 20) throw new Error(path + '：参数嵌套过深');
        if (schema === false) throw new Error(path + '：不允许此参数');
        const type = v => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
        const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
        if (types.length && !types.some(t => t === 'integer' ? Number.isSafeInteger(value) : t === 'number' ? typeof value === 'number' && Number.isFinite(value) : type(value) === t)) throw new Error(path + '：类型不符合工具声明');
        if (schema.enum && !schema.enum.some(v => JSON.stringify(v) === JSON.stringify(value))) throw new Error(path + '：值不在允许范围');
        if (typeof value === 'number') {
            if (!Number.isFinite(value) || (schema.minimum != null && value < schema.minimum) || (schema.maximum != null && value > schema.maximum)) throw new Error(path + '：数值超出范围');
        }
        if (typeof value === 'string' && ((schema.minLength != null && [...value].length < schema.minLength) || (schema.maxLength != null && [...value].length > schema.maxLength))) throw new Error(path + '：文字长度超出范围');
        if (Array.isArray(value)) {
            if ((schema.minItems != null && value.length < schema.minItems) || (schema.maxItems != null && value.length > schema.maxItems)) throw new Error(path + '：列表长度超出范围');
            if (schema.items) value.forEach((v, i) => validateArgs(v, schema.items, path + '[' + i + ']', depth + 1));
        } else if (value && typeof value === 'object') {
            (schema.required || []).forEach(k => { if (!Object.prototype.hasOwnProperty.call(value, k)) throw new Error(path + '.' + k + '：缺少必填参数'); });
            Object.keys(value).forEach(k => {
                if (['__proto__', 'constructor', 'prototype'].includes(k)) throw new Error(path + '：不允许的参数名');
                if (Object.prototype.hasOwnProperty.call(schema.properties || {}, k)) validateArgs(value[k], schema.properties[k], path + '.' + k, depth + 1);
                else if (schema.additionalProperties === false) throw new Error(path + '.' + k + '：未知参数');
                else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') validateArgs(value[k], schema.additionalProperties, path + '.' + k, depth + 1);
            });
        }
    }
    function checkedArgs(args, schema, strict) {
        const value = args === undefined ? {} : args;
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('工具参数必须是对象');
        // Built-in phone tools accept only their declared fields. Remote tools retain their own schema semantics.
        validateArgs(value, strict ? Object.assign({}, schema, { additionalProperties: false }) : schema);
        return value;
    }
    function normalizeResult(r) {
        const text = toolText(r);
        if (!r || typeof r !== 'object' || (!Array.isArray(r.content) && !r.structuredContent && r.isError !== true)) return { status: 'unknown', ok: null, error: 'empty_result', text };
        const data = r.structuredContent;
        const failed = r.isError === true || !!(data && (data.ok === false || data.error));
        return { status: failed ? 'error' : 'ok', ok: !failed, error: failed ? 'tool_error' : null, text: failed && !r.isError ? '［工具报错］' + text : text, data: data || null };
    }
    window.__gyMcpProtocol = { checkedArgs, normalizeResult };
    function toolText(r) {
        if (!r) return '（没有内容）';
        const parts = (r.content || []).map(x => x.type === 'text' ? x.text : x.type === 'resource' ? (x.resource && (x.resource.text || x.resource.uri)) : x.type === 'image' ? '［一张图片］' : x.type === 'resource_link' ? (x.name || x.uri) : '').filter(Boolean);
        let t = parts.join('\n');
        if (!t && r.structuredContent) t = JSON.stringify(r.structuredContent);
        return (r.isError ? '［工具报错］' : '') + (t || '（空）');
    }

    /* ---------------- 测试连接（🔌） ---------------- */
    window.gyMcpTest = async function (id) {
        const s = C.servers.find(x => x.id === id) || C.servers[0];
        const rows = [];
        if (!s) return { ok: false, rows, hint: '还没加 MCP 服务器。' };
        rows.push(['服务器', s.name || s.url || s.command], ['类型', s.kind === 'builtin' ? '内置（App 自己调手机）' : s.kind === 'local' ? '本地（桌面版起进程）' : '网址']);
        const t0 = Date.now();
        try {
            const c = await connect(s, true);
            rows.push(['用时', ((Date.now() - t0) / 1000).toFixed(1) + ' 秒'], ['工具', c.tools.length + ' 个：' + c.tools.slice(0, 6).map(t => t.name).join('、') + (c.tools.length > 6 ? '……' : '')]);
            paint();
            return { ok: true, rows, ms: Date.now() - t0, what: c.tools.length ? '连上了，TA 能用这些工具' : '连上了，但对面没有工具' };
        } catch (e) {
            s.err = String(e && e.message || e).slice(0, 200); save(); paint();
            const m = s.err;
            const explain = /Failed to fetch|Load failed|NetworkError|CORS/i.test(m) ? { n: '连不上（多半是跨域）', what: '网页版的谷雨只能连「开了跨域（CORS）」的 MCP 服务器。', how: ['先确认网址对、服务器开着', '网页版连不上的话，换 App 或桌面版试试（它们不受跨域限制）', '自己的服务器：在服务器上允许跨域，并允许 Mcp-Session-Id 这个头'] }
                : /401|403|unauthor/i.test(m) ? { n: '密钥不对 / 没权限', what: '服务器不认你填的密钥。', how: ['「请求头」里按 Authorization: Bearer 你的密钥 这样写', '密钥前后别多空格'] }
                : /桌面版/.test(m) ? { n: '本地 MCP 只能在桌面版用', what: '网页和手机 App 起不了你电脑上的程序。', how: ['用谷雨桌面版（exe）打开再试', '或者换成网址形式的 MCP'] }
                : /ENOENT|not found|找不到|spawn/i.test(m) ? { n: '命令找不到', what: '电脑上没有这个命令（比如没装 Node.js 就没有 npx）。', how: ['装好需要的程序（npx 要装 Node.js，uvx 要装 uv）', '命令写完整路径也行'] } : null;
            return { ok: false, rows, ms: Date.now() - t0, err: m, explain };
        }
    };

    /* ---------------- 回你之前：要不要用工具 ---------------- */
    const CTX = {};   // charId → {at, items:[{tool, args, out}]}
    window.__gyMcpCtxFor = function (charId) {
        const x = CTX[String(charId)];
        if (!x || Date.now() - x.at > 5 * 60000 || !on('mcpOn')) return '';
        return `\n【你刚才用工具（MCP）查到 / 做了的事——回她的时候用得上就用，别念工具名】\n` + x.items.map(i => `· ${i.tool}（${i.argsText}）→ ${i.out.slice(0, 1500)}`).join('\n') + '\n';
    };
    const charAllowed = c => c && (C.chars === 'all' || (Array.isArray(C.chars) && C.chars.map(String).includes(String(c.id))));
    function toolsNow() {
        const out = [];
        C.servers.filter(s => s.on !== false).forEach(s => (s.tools || []).filter(t => t.on !== false).forEach(t => {
            if (s.kind === 'builtin') { const live = BUILTIN[t.name]; if (!live) return; t = Object.assign({}, t, { description: live[0], inputSchema: live[1] }); }
            if (out.length >= 48) return;
            const fn = ('s' + C.servers.indexOf(s) + '__' + t.name).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
            out.push({ fn, s, t });
        }));
        return out;
    }
    const lastMsgs = (sid, n) => ((typeof globalChats !== 'undefined' && globalChats[sid]) || []).filter(m => m && m.text && !m.isRecalled).slice(-n);
    async function callApi(api, msgs, tools, signal) {
        const anth = typeof isAnthropicApiUrl === 'function' && isAnthropicApiUrl(api.url);
        const __gyCall = typeof gyDetectCall === 'function' ? gyDetectCall() : null, t0 = Date.now();
        if (anth) {
            const sys = msgs.filter(m => m.role === 'system').map(m => m.content).join('\n');
            const body = { model: api.model, max_tokens: 1024, system: sys, messages: msgs.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })), tools: tools.map(x => ({ name: x.fn, description: (x.t.title ? x.t.title + '：' : '') + x.t.description, input_schema: x.t.inputSchema })) };
            const res = await doFetch(`${api.url}/v1/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': api.key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body), signal });
            const d = await res.json();
            if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
            try { if (typeof recordTokenUsage === 'function') recordTokenUsage(d, { inChars: JSON.stringify(body).length, outChars: 50 }, __gyCall, { api, t0, kind: 'chat' }); } catch (e) {}
            const calls = (d.content || []).filter(b => b.type === 'tool_use').map(b => ({ id: b.id, fn: b.name, args: b.input || {} }));
            return { calls, append: calls.length ? [{ role: 'assistant', content: d.content }] : [], result: (outs) => ({ role: 'user', content: outs.map(o => ({ type: 'tool_result', tool_use_id: o.id, content: o.out })) }) };
        }
        const body = { model: api.model, messages: msgs, tools: tools.map(x => ({ type: 'function', function: { name: x.fn, description: ((x.t.title ? x.t.title + '：' : '') + x.t.description).slice(0, 1000), parameters: x.t.inputSchema && x.t.inputSchema.type ? x.t.inputSchema : { type: 'object', properties: {} } } })), tool_choice: 'auto' };
        const res = await doFetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.key}` }, body: JSON.stringify(body), signal });
        const d = await res.json().catch(() => ({ error: { message: 'HTTP ' + res.status } }));
        if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
        try { if (typeof recordTokenUsage === 'function') recordTokenUsage(d, { inChars: JSON.stringify(body).length, outChars: 50 }, __gyCall, { api, t0, kind: 'chat' }); } catch (e) {}
        const m = (d.choices && d.choices[0] && d.choices[0].message) || {};
        const calls = (m.tool_calls || []).map(tc => { let a = {}; try { a = JSON.parse(tc.function.arguments || '{}'); } catch (e) {} return { id: tc.id, fn: tc.function.name, args: a }; });
        return { calls, append: calls.length ? [{ role: 'assistant', content: m.content || '', tool_calls: m.tool_calls }] : [], result: outs => outs.map(o => ({ role: 'tool', tool_call_id: o.id, content: o.out })) };
    }
    // 304：这句话像不像「要 TA 动手做点什么 / 查点什么」（只用来决定要不要多问一次，不直接执行）
    const wantsTool = t => /锁|解锁|解开|闹钟|手电|音量|亮度|震一下|震动|打开|提醒我|叫我起|电量|屏幕时间|玩了多久|用了多久|几点|剪贴板|通知|拉我回|搜一下|查一下|查查|帮我看看|记一下|记住/.test(String(t || ''));
    async function plainChat(api, msgs, signal) {
        const anth = typeof isAnthropicApiUrl === 'function' && isAnthropicApiUrl(api.url);
        const __gyCall = typeof gyDetectCall === 'function' ? gyDetectCall() : null, t0 = Date.now();
        let body, d, text = '';
        if (anth) {
            body = { model: api.model, max_tokens: 600, system: msgs.filter(m => m.role === 'system').map(m => m.content).join('\n'), messages: msgs.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })) };
            const res = await doFetch(`${api.url}/v1/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': api.key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body), signal });
            d = await res.json(); if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
            text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
        } else {
            body = { model: api.model, messages: msgs };
            const res = await doFetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.key}` }, body: JSON.stringify(body), signal });
            d = await res.json().catch(() => ({ error: { message: 'HTTP ' + res.status } })); if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
            text = String(((d.choices && d.choices[0] && d.choices[0].message) || {}).content || '');
        }
        try { if (typeof recordTokenUsage === 'function') recordTokenUsage(d, { inChars: JSON.stringify(body).length, outChars: text.length }, __gyCall, { api, t0, kind: 'chat' }); } catch (e) {}
        return text;
    }
    // 不靠「工具调用」这项本事：把工具清单写成字给模型看，让它回一段 JSON
    async function callApiText(api, msgs, tools, signal) {
        const list = tools.map(x => `- ${x.fn}：${((x.t.title ? x.t.title + '：' : '') + x.t.description).slice(0, 260)}　参数：${JSON.stringify((x.t.inputSchema && x.t.inputSchema.properties) || {}).slice(0, 360)}`).join('\n');
        const ask = `【你手边的工具】\n${list}\n\n看她最后说的话：要是她让你做的事、或者你回她之前需要知道的东西，上面有工具能办到，就只输出一段 JSON：{"calls":[{"tool":"工具名","args":{参数}}]}（可以好几个）。真的一个都用不上，只输出：无。别的什么都不要写。`;
        const text = await plainChat(api, msgs.concat([{ role: 'user', content: ask }]), signal);
        const m = String(text || '').match(/\{[\s\S]*\}/); if (!m) return [];
        let j = null; try { j = JSON.parse(m[0]); } catch (e) { try { j = JSON.parse(m[0].replace(/，/g, ',').replace(/[“”]/g, '"')); } catch (e2) {} }
        const arr = j && Array.isArray(j.calls) ? j.calls : (j && j.tool ? [j] : []);
        return arr.filter(x => x && x.tool).map((x, i) => ({ id: 'tx' + Date.now() + i, fn: String(x.tool), args: (x.args && typeof x.args === 'object') ? x.args : {} })).filter(x => tools.some(t => t.fn === x.fn || t.t.name === x.fn));
    }
    window.__gyMcpText = callApiText;
    const TASK_RUNS = new Map(), TASK_LATEST = new Map(), REQUEST_WINDOW = new Map();
    const TASK_TIMEOUT = 180000, MODEL_TIMEOUT = 90000, CONNECT_TIMEOUT = 30000, TOOL_TIMEOUT = 45000, QUEUE_TIMEOUT = 45000;
    let resumeHumanBusy = false;
    function invalidatePhoneState() {
        try { const m = window.gysPh && window.gysPh.mcp; if (m && m.invalidateSnapshots) m.invalidateSnapshots(); } catch (e) {}
        ['gyMeituan','gyMeituanCart','gyMeituanCheckout','gyMeituanSubmit','gyMeituanOrders'].forEach(k => { try { if (window[k] && window[k].invalidate) window[k].invalidate(); } catch (e) {} });
        Object.keys(CTX).forEach(k => { delete CTX[k]; });
    }
    window.gyMcpTakeover = function (source) {
        if (!isApp()) { toast('手机接管需要 Android 版', '当前环境不具备本机手机页面操作能力'); return { ok: false, error: 'android_required' }; }
        const gate = window.gyMcpExecution; if (!gate) return { ok: false };
        let target = ''; try { const m = window.gysPh && window.gysPh.mcp; if (m && m.lastPackage) target = m.lastPackage(); } catch (e) {}
        const persisted = gate.takeover(target);
        invalidatePhoneState();
        for (const run of TASK_RUNS.values()) run.stop('handed_over');
        if (window.gyMcpTasks) window.gyMcpTasks.list().forEach(t => {
            if (['created','running','waiting','paused'].includes(t.state)) window.gyMcpTasks.transition(t.id, 'handed_over', '已交给用户操作；不会自动恢复或重放。');
        });
        paintTasks();
        if (!persisted) toast('人工接管已在本次运行生效', '接管标记未能保存，重启后请确认 MCP 保持关闭');
        return { ok: true, persistent: persisted, pending: gate.status().pending };
    };
    window.gyMcpResumeHuman = async function (confirmed, targetPackage) {
        const gate = window.gyMcpExecution;
        if (!gate || !gate.status().human) return { ok: false, error: 'not_in_takeover' };
        if (!confirmed) { toast('请先核对外部操作结果', '勾选已处理并核对后，再重新读屏恢复'); return { ok: false, error: 'confirmation_required' }; }
        if (resumeHumanBusy) return { ok: false, error: 'resume_busy' };
        const before = gate.status();
        if (before.owner || before.pending || before.queued || TASK_RUNS.size) { toast('仍有工具请求在途', '请等请求返回后再处理和恢复'); return { ok: false, error: 'in_flight' }; }
        resumeHumanBusy = true; paintTasks(); let timer;
        const deadline = Date.now() + 8000;
        try {
            invalidatePhoneState();
            const m = window.gysPh && window.gysPh.mcp;
            if (!m || typeof m.inspectScreen !== 'function') throw new Error('页面读取能力未就绪');
            const probe = async () => {
                const valid = () => { if (Date.now() >= deadline || gate.status().humanRevision !== before.humanRevision) throw new Error('接管状态已变化'); };
                valid(); let screen = await m.inspectScreen(160); valid();
                if (screen && screen.error === 'not_meituan') {
                    const n = window.gysPh && window.gysPh.__N;
                    if (!n || !n.apps || !n.openApp) throw new Error('无法打开美团，请先确认原生能力');
                    const apps = n.apps().filter(a => ['com.sankuai.meituan','com.sankuai.meituan.takeoutnew'].includes(a.pkg));
                    const target = targetPackage || before.humanPackage || (apps.length === 1 && apps[0].pkg);
                    if (!target || !apps.some(a => a.pkg === target)) throw new Error('请选择已安装的美团或美团外卖后重试');
                    valid(); if (!n.openApp(target)) throw new Error('没能打开选定的美团软件');
                    for (let i = 0; i < 3; i++) { valid(); screen = await m.inspectScreen(160); valid(); if (screen && screen.ok) break; await new Promise(resolve => setTimeout(resolve, 200)); }
                }
                return screen;
            };
            const screen = await Promise.race([probe(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('读取超时')), 8000); })]);
            if (Date.now() >= deadline || before.humanRevision !== gate.status().humanRevision) throw new Error('页面读取已过期或发生了新的接管');
            if (!screen || !screen.ok || screen.snapshotSchema !== 2 || !screen.fingerprint || (!Number.isSafeInteger(screen.token) || screen.token < 1) || !Array.isArray(screen.nodes)
                || !['com.sankuai.meituan','com.sankuai.meituan.takeoutnew'].includes(screen.pkg)) throw new Error('请先手动回到美团的可识别页面');
            const words = screen.nodes.map(n => String(n.text || n.desc || '').trim());
            if (words.some(v => /验证码|验证身份|安全验证|支付密码|付款密码|人脸识别|指纹支付|立即支付|确认支付|登录后继续|立即登录/.test(v))) throw new Error('仍在登录、验证或支付页面，请手动完成后返回');
            const info = window.gyMeituan && window.gyMeituan.classify(screen);
            const checkout = window.gyMeituanCheckout && window.gyMeituanCheckout.parse(screen, null);
            const receipt = window.gyMeituanOrders && window.gyMeituanOrders.parse(screen);
            const page = receipt && receipt.ok ? 'order' : checkout && checkout.ok ? 'checkout' : info && info.page;
            if (!page || page === 'unknown' || page === 'human_required' || screen.truncated) throw new Error('页面识别不清或内容不完整，请手动回到店铺、搜索或结算页');
            // Discard this probe too. A new user request must inspect again before any action.
            invalidatePhoneState();
            if (!gate.resumeHuman(before.humanRevision)) throw new Error('状态已变化或接管标记未能保存，请重新核对');
            toast('已恢复工具使用', '旧任务不会续跑；请发送新消息，系统会重新读屏');
            return { ok: true, page, resumed: true, replayed: false };
        } catch (e) { toast('继续保持人工接管', String(e && e.message || '页面未确认')); return { ok: false, error: 'resume_unverified' }; }
        finally { try { clearTimeout(timer); } catch (e) {} resumeHumanBusy = false; paintTasks(); }
    };
    function stoppedError() { const e = new Error('MCP task stopped'); e.gyMcpStopped = true; return e; }
    window.gyMcpCancel = function (id) {
        const run = TASK_RUNS.get(id);
        if (run) return run.stop('cancelled');
        const store = window.gyMcpTasks;
        return !!(store && store.transition(id, 'cancelled', '已取消，不会自动继续。'));
    };
    async function executeMcp(sessionId, triggerText, task) {
        const gate = window.gyMcpExecution;
        const c = charOf(sessionId);
        if (!on('mcpOn') || !c || !charAllowed(c)) return null;
        const tools = toolsNow(); if (!tools.length) return null;
        const api = typeof getApiConfig === 'function' ? getApiConfig(C.api === 'sub') : null;
        if (!api || !api.key) return null;
        const me = (typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '她';
        const msgs = [{ role: 'system', content: `你是${c.name}。${String(c.persona || '').slice(0, 800)}\n现在${me}给你发了消息。你手边有一些工具，能真的去查、真的去做。\n· 她让你做一件工具做得到的事（锁软件、设闹钟、开手电筒、调音量、打开某个软件、提醒她、查东西……），或者你自己想这么做 → 现在就调用对应的工具。只在嘴上答应「好，锁了」却不调用工具 = 什么都没发生，她一试就知道你在哄她。\n· 回她之前需要知道点什么（现在几点、电量、她在用什么、屏幕时间、网上的资料、记下的东西……）→ 调用工具去看，别猜。\n· 一次可以调好几个。参数照她说的填（她说的软件名、几分钟，原样填）。\n· 这句话真的用不上任何工具（纯聊天）→ 只回一个字：无。\n交易结果若 complete=false、state=unknown 或 confirmedAssociation=false，只能说明观察到的事实和未确认项，不能声称本次购买、付款或任务已经成功。\n这一步不用写回复：工具结果会交给你，之后你再正常回她。现在是 ${new Date().toLocaleString()}。` }];
        (task.history || lastMsgs(String(sessionId), 12)).forEach(m => { if (m.sender === 'system') return; msgs.push({ role: m.sender === 'me' ? 'user' : 'assistant', content: String(m.text).slice(0, 800) }); });
        if (triggerText && !(msgs.length > 1 && msgs[msgs.length - 1].content === triggerText)) msgs.push({ role: 'user', content: String(triggerText).slice(0, 1500) });
        if (msgs[msgs.length - 1].role !== 'user') msgs.push({ role: 'user', content: '（她刚发了消息，看上面）' });
        const userText = String(triggerText || (msgs.filter(m => m.role === 'user').slice(-1)[0] || {}).content || '');
        const env = { check: task.check, cid: String(c.id), text: userText.slice(0, 500), asked: /锁|禁用|封了|封掉|别让我|不让我|不许我|管住|管管我|没收/.test(userText) };
        const base = msgs.slice();
        const items = [], callResults = new Map(), addRequests = new Set();
        const runCall = async call => {
            task.check();
            if (call.id && callResults.has(call.id)) return callResults.get(call.id);
            if (call.id) callResults.set(call.id, '［该工具调用已处理，结果未确认，不重复发送］');
            if (gate.status().blocked) throw new Error('外部工具结果未确认，停止后续操作');
            const x = tools.find(t => t.fn === call.fn) || tools.find(t => t.t.name === call.fn);
            let out, result = { status: 'error', ok: false, error: 'unknown_tool' }; const t0 = Date.now();
            if (!x) out = '［没有这个工具］';
            else {
                try { const args = checkedArgs(call.args, x.t.inputSchema, x.s.kind === 'builtin'); if (x.s.kind === 'builtin' && x.t.name === 'meituan_add_item') { const identity = JSON.stringify([args.store, args.name, (args.specs || []).map(v => [v.group,v.option]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]); if (addRequests.has(identity)) throw new Error('本任务已处理该商品的加购请求，不重复发送；请先核对购物车'); addRequests.add(identity); } const conn = await task.wait(() => connect(x.s, false, task), '连接工具服务', CONNECT_TIMEOUT); task.check(); const p = { name: x.t.name, arguments: args }; if (x.s.kind === 'builtin') p._gy = env; result = normalizeResult(await task.wait(() => { gate.begin(task.id); task.inFlight = true; return Promise.resolve().then(() => { task.check(); task.externalCalls++; return conn.rpc('tools/call', p); }).then(r => { gate.settle(task.id, normalizeResult(r).ok === true); task.inFlight = false; return r; }, e => { gate.settle(task.id, false); task.inFlight = false; throw e; }); }, '等待工具返回：' + x.t.name, TOOL_TIMEOUT)); out = result.text; }
                catch (e) { if (e.gyMcpStopped) throw e; task.inFlight = false; result = { status: 'error', ok: false, error: 'validation_or_call_failed' }; out = '［调用失败：' + String(e && e.message || e).slice(0, 160) + '］'; try { delete CONN[x.s.id]; } catch (e2) {} }
            }
            task.check();
            if (gate.status().blocked) task.decisionFailed = true;
            out = String(out).slice(0, 4000);
            const argsText = JSON.stringify(call.args || {}).slice(0, 300);
            const item = { id: call.id, tool: x ? (x.t.title || x.t.name) : call.fn, name: x ? x.t.name : call.fn, status: result.status, error: result.error, bad: result.ok !== true, server: x ? (x.s.name || x.s.url || x.s.command) : '', argsText, out, ms: Date.now() - t0 };
            items.push(item);
            window.gyMcpTasks.step(task.id, result.ok);
            L.unshift({ taskId: task.id, at: Date.now(), cid: String(c.id), who: c.name, tool: item.tool, server: item.server, args: argsText, out: out.slice(0, 800), ms: item.ms, status: item.status, error: item.error, err: item.bad });
            saveLog();
            if (x && x.s.kind === 'builtin' && result.data && result.data.error === 'human_required') { window.gyMcpTakeover('human_required'); task.check(); }
            if (call.id) callResults.set(call.id, out);
            return out;
        };
        let firstErr = null;
        for (let round = 0; round < Math.max(1, Math.min(6, Number(C.rounds) || 3)); round++) {
            let r = null;
            try { r = await task.wait(() => callApi(api, msgs, tools, task.signal), '等待模型选择工具（第 ' + (round + 1) + ' 轮）', MODEL_TIMEOUT); } catch (e) { if (e.gyMcpStopped) throw e; task.decisionFailed = true; if (round === 0) firstErr = e; else console.warn('[MCP] 第 ' + (round + 1) + ' 轮没问成：', e); break; }
            if (!r.calls.length) break;
            task.limitReached = round + 1 >= Math.max(1, Math.min(6, Number(C.rounds) || 3));
            const outs = [];
            for (const call of r.calls.slice(0, 5)) { outs.push({ id: call.id, out: await runCall(call) }); if (gate.status().blocked) break; }
            if (gate.status().blocked) break;
            msgs.push(...r.append);
            const res = r.result(outs); if (Array.isArray(res)) msgs.push(...res); else msgs.push(res);
        }
        // 304 兜底①：这个模型 / 中转不支持「工具调用」（报错了），或者这句话明明像是要用工具却回了「无」→ 换成纯文字的问法再问一次
        if (!gate.status().blocked && !items.length && (firstErr || wantsTool(userText))) {
            try { const calls = await task.wait(() => callApiText(api, base, tools, task.signal), '等待模型兼容模式选择工具', MODEL_TIMEOUT); task.decisionFailed = false; for (const call of calls.slice(0, 5)) { await runCall(call); if (gate.status().blocked) break; } }
            catch (e) { if (e.gyMcpStopped) throw e; task.decisionFailed = true; console.warn('[MCP] 换文字问法也没问成：', e, firstErr || ''); }
        }
        // 兜底②：她明明说了「锁 XX」，上面还是没锁成 → 直接照她说的锁
        try {
            if (!gate.status().blocked && env.asked && !items.some(i => i.name === 'lock_apps' && !i.bad)) {
                const lk = tools.find(t => t.s.kind === 'builtin' && t.t.name === 'lock_apps');
                const g = lk && window.gysPh && gysPh.mcp && gysPh.mcp.guess ? gysPh.mcp.guess(userText) : null;
                if (g && g.lock && g.apps.length) await runCall({ id: 'fb' + Date.now(), fn: lk.fn, args: { apps: g.apps, minutes: g.minutes || 30 } });
            }
        } catch (e) { if (e.gyMcpStopped) throw e; console.warn('[MCP] 兜底锁软件出错：', e); }
        task.check();
        if (!items.length) return null;
        saveLog();
        if (TASK_LATEST.get(String(c.id)) === task.id) CTX[String(c.id)] = { at: Date.now(), items };
        // 聊天里一行小字，点了看详情
        try {
            const sid = String(sessionId);
            if (typeof globalChats !== 'undefined') {
                globalChats[sid] = globalChats[sid] || [];
                const names = Array.from(new Set(items.map(i => i.tool)));
                globalChats[sid].push({ sender: 'system', text: `<span class="gymcp-sys" onclick="gyMcpOpen('log')">🧰 ${esc(c.name)} ${pick(['用了', '查了一下', '翻了翻'])}「${names.map(esc).join('」「')}」</span>`, timestamp: Date.now(), gyMcp: 1 });
                if (typeof renderChatMessages === 'function' && String(typeof currentChatSessionId !== 'undefined' ? currentChatSessionId : '') === sid) renderChatMessages();
                if (typeof saveAllData === 'function') saveAllData();
            }
        } catch (e) {}
        return items;
    }
    async function gyMcpDecide(sessionId, triggerText, invocation) {
        const c = charOf(sessionId);
        if (!on('mcpOn') || !c || !charAllowed(c) || !toolsNow().length) return null;
        const api = typeof getApiConfig === 'function' ? getApiConfig(C.api === 'sub') : null;
        if (!api || !api.key) return null;
        const store = window.gyMcpTasks;
        if (!store || !window.gyMcpExecution) { toast('任务模块未加载', '请重新打开或更新谷雨，工具暂不执行'); return null; }
        const gate = window.gyMcpExecution;
        if (gate.status().human) { CTX[String(c.id)] = { at: Date.now(), items: [{ tool: '人工接管', argsText: '', out: '用户正在人工处理外部软件，本次未执行工具；不能声称已完成操作。等待用户手动恢复后发送新消息，不自动重试。' }] }; toast('人工接管中', '工具已暂停，请处理完成后在最近任务里重新读屏恢复'); return null; }
        if (gate.status().blocked) { toast('有工具操作结果未确认', '请先在最近任务里核对并解除占用，暂不执行新任务'); return null; }
        const history = (typeof globalChats !== 'undefined' && globalChats[String(sessionId)]) || [];
        let messageIndex = -1;
        for (let i = history.length - 1; i >= 0; i--) if (history[i] && history[i].sender === 'me' && !history[i].isRecalled) { messageIndex = i; break; }
        const message = history[messageIndex];
        const key = message && (message.id || message.timestamp)
            ? JSON.stringify([String(c.id), String(message.id || ''), String(message.timestamp || ''), messageIndex]) : null;
        const ephemeralKey = JSON.stringify([String(c.id), String(triggerText || '')]);
        const prior = REQUEST_WINDOW.get(ephemeralKey);
        if (prior && prior.active && prior.messageKey === key) {
            if (invocation) invocation.duplicateActive = true;
            return null;
        }
        if ((key && !gate.claim(key)) || (!key && prior && (prior.active || Date.now() - prior.at < 10000))) {
            toast('重复工具请求已跳过', '同一条消息不会重复执行工具；需要重新操作时请发送新消息'); return null;
        }
        if (REQUEST_WINDOW.size >= 200) for (const [k, v] of REQUEST_WINDOW) if (!v.active) { REQUEST_WINDOW.delete(k); break; }
        const request = { active: true, at: Date.now(), messageKey: key }; REQUEST_WINDOW.set(ephemeralKey, request);
        const task = store.create(c.id, c.name);
        task.history = lastMsgs(String(sessionId), 12).map(m => ({ sender: m.sender, text: String(m.text) }));
        let live = true, reason = '', stopNote = '', timer;
        task.externalCalls = 0;
        let rejectStop;
        const stopPromise = new Promise((_, reject) => { rejectStop = reject; });
        stopPromise.catch(() => {}); // Cancellation can occur synchronously during the running-state event.
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const deadline = Date.now() + TASK_TIMEOUT;
        task.signal = ctrl && ctrl.signal;
        const stop = (why, phase) => {
            if (!live || reason) return false;
            reason = why;
            gate.cancelQueued(task.id);
            stopNote = (why === 'handed_over' ? '已交给用户操作' : why === 'timed_out' ? (phase || task.phase || '任务执行') + '超时' : '任务已取消')
                + (why === 'handed_over' ? '；请先手动恢复，旧任务不会重放。' : task.externalCalls ? '；已发出外部工具请求，结果需核对，不会自动重试。' : '；尚未发出外部工具操作，可重新发起。');
            store.transition(task.id, why, stopNote);
            rejectStop(stoppedError());
            if (ctrl) ctrl.abort();
            return true;
        };
        task.check = () => {
            if (live && !reason && gate.status().human) stop('handed_over');
            if (live && !reason && Date.now() >= deadline) stop('timed_out');
            if (!live || reason) throw stoppedError();
        };
        task.wait = async (op, phase, timeout) => {
            task.check();
            let phaseTimer;
            if (phase) {
                task.phase = phase;
                if (store.progress) store.progress(task.id, phase + '，最长 ' + Math.round(timeout / 1000) + ' 秒。');
                task.check();
                phaseTimer = setTimeout(() => stop('timed_out', phase), timeout);
            }
            try { const value = await Promise.race([Promise.resolve().then(() => { task.check(); return op(); }), stopPromise]); task.check(); return value; }
            catch (e) { task.check(); throw e; }
            finally { if (phaseTimer) clearTimeout(phaseTimer); }
        };
        TASK_RUNS.set(task.id, { stop });
        timer = setTimeout(() => stop('timed_out', '任务总时限（180秒）'), TASK_TIMEOUT);
        TASK_LATEST.set(String(c.id), task.id);
        delete CTX[String(c.id)];
        store.transition(task.id, 'running', '等待本实例的工具执行占用。');
        store.transition(task.id, 'waiting', '其他任务执行期间排队等待；等待也受超时限制。');
        try {
            await task.wait(() => gate.acquire(task.id), '等待工具执行占用', QUEUE_TIMEOUT);
            task.check();
            store.transition(task.id, 'running', '正在判断并调用工具。');
            const items = await task.wait(() => executeMcp(sessionId, triggerText, task));
            if (task.decisionFailed || (items || []).some(i => i.bad))
                store.transition(task.id, 'failed', '工具或模型请求失败，部分操作可能已执行，请核对调用记录。');
            else if (task.limitReached)
                store.transition(task.id, 'paused', '达到本轮工具次数上限，未确认目标完成；不会自动继续。');
            else store.transition(task.id, 'completed', items && items.length
                ? '工具调用流程结束；外部订单等业务结果仍需核验。' : '工具判断结束，本次未执行工具。');
            return items;
        } catch (e) {
            if (e.gyMcpStopped) {
                if (TASK_LATEST.get(String(c.id)) === task.id) CTX[String(c.id)] = { at: Date.now(), items: [{ tool: '任务停止', argsText: '', out:
                    stopNote + '不得声称目标已经完成，不自动重试。' }] };
                return null;
            }
            store.transition(task.id, 'failed', '执行异常，部分操作可能已执行，请核对调用记录。');
            throw e;
        } finally {
            live = false;
            try { clearTimeout(timer); } catch (e) {}
            TASK_RUNS.delete(task.id);
            gate.release(task.id);
            request.active = false; request.at = Date.now();
            const ended = store.list().find(t => t.id === task.id);
            if (!task.externalCalls && ended && ['failed', 'timed_out', 'cancelled'].includes(ended.state)
                && gate.releaseUnsent && gate.releaseUnsent(key) && REQUEST_WINDOW.get(ephemeralKey) === request)
                REQUEST_WINDOW.delete(ephemeralKey);
        }
    }
    window.gyMcpDecide = gyMcpDecide;
    function hookReply() {
        const o = window.triggerAIBatchReply;
        if (typeof o !== 'function' || o.__gyMcp) return;
        const w = async function (sessionId, triggerText) {
            const invocation = {};
            try {
                if (on('mcpOn') && sessionId && !String(sessionId).startsWith('g_') && charOf(sessionId))
                    await gyMcpDecide(sessionId, triggerText, invocation);
            } catch (e) { console.warn('[MCP] 判断要不要用工具时出错，照常回复：', e); }
            if (invocation.duplicateActive) return;
            return o.apply(this, arguments);
        };
        w.__gyMcp = true; window.triggerAIBatchReply = w;
    }

    /* ---------------- 页面（整页） ---------------- */
    const V = { view: 'list', id: null, draft: null };
    function go(v, id) { V.view = v; V.id = id || null; mount();
        // 从「合集」里打开时，底下那层合集页会留着（MCP 自己是一整页），顺手关掉，免得露出半截
        try { if (typeof window.gyHubClose === 'function' && document.getElementById('gyHubOv')) window.gyHubClose(); } catch (e) {}
        document.getElementById('gyMcpPage').classList.add('on'); paint(); }
    window.gyMcpOpen = v => go(v === 'log' ? 'log' : 'list');
    window.gyMcpClose = function () { if (V.view !== 'list') { V.draft = null; return go('list'); } const m = document.getElementById('gyMcpPage'); if (m) m.classList.remove('on'); };
    window.gyMcpGo = (v, id) => go(v, id);
    window.gyMcpNew = function (kind) { V.draft = { id: uid(), name: '', kind: kind === 'local' ? 'local' : 'http', url: '', headers: '', command: '', args: '', env: '', on: true, tools: [], __new: true }; go('edit', V.draft.id); };
    const get = id => C.servers.find(x => x.id === id) || (V.draft && V.draft.id === id ? V.draft : null);
    function readForm(s) {
        const g = k => { const e = document.getElementById('gymcpE_' + k); return e ? e.value : ''; };
        Object.assign(s, { name: g('name').trim(), url: g('url').trim(), headers: g('headers'), command: g('command').trim(), args: g('args'), env: g('env') });
    }
    window.gyMcpSave = function (id, quiet) {
        const s = get(id); if (!s) return;
        readForm(s);
        if (s.kind !== 'builtin' && (s.kind === 'local' ? !s.command : !s.url)) { toast('🧰 还没填完', s.kind === 'local' ? '要填命令' : '要填网址'); return false; }
        if (!s.name) s.name = s.kind === 'builtin' ? '📱 这台手机（内置）' : s.kind === 'local' ? s.command.split(/[\\/]/).pop() : (s.url.replace(/^https?:\/\//, '').split('/')[0]);
        if (s.__new) { delete s.__new; C.servers.push(s); V.draft = null; }
        save(); if (!quiet) { toast('🧰 存好了', pick(['点「🔌 测试连接」看看连不连得上', '存了，记得测一下'])); go('edit', id); }
        return true;
    };
    window.gyMcpTestBtn = async function (id, btn) { if (window.gyMcpSave(id, true) === false) return; if (typeof gyApiTest === 'function') await gyApiTest('mcp', id, btn); else { const r = await window.gyMcpTest(id); toast(r.ok ? '✅ 连上了' : '❌ 连不上', r.err || ''); } paint(); };
    window.gyMcpDel = async function (id) {
        const s = C.servers.find(x => x.id === id); if (!s) return go('list');
        if (typeof appConfirm === 'function' && !(await appConfirm(`删掉「${s.name}」？`))) return;
        try { if (CONN[id]) CONN[id].close(); } catch (e) {} delete CONN[id];
        C.servers = C.servers.filter(x => x.id !== id); save(); go('list');
    };
    window.gyMcpToggle = function (id, v) { const s = C.servers.find(x => x.id === id); if (s) { s.on = !!v; save(); paint(); } };
    window.gyMcpToolToggle = function (id, name, v) { const s = get(id); const t = s && (s.tools || []).find(x => x.name === name); if (t) { t.on = !!v; save(); } };
    window.gyMcpSet = function (k, v) {
        if (k === 'api') C.api = v === 'sub' ? 'sub' : 'main';
        if (k === 'rounds') C.rounds = Math.max(1, Math.min(6, parseInt(v) || 3));
        if (k === 'keep') { C.keep = Math.max(0, parseInt(v) || 0); saveLog(); }
        if (k === 'charsAll') C.chars = v ? 'all' : [];
        if (k === 'char') { let a = Array.isArray(C.chars) ? C.chars.slice() : chars().map(c => String(c.id)); const [id, onv] = v; a = a.filter(x => x !== String(id)); if (onv) a.push(String(id)); C.chars = a; }
        save(); paint();
    };
    window.gyMcpTurnOn = function () { if (typeof setAutoFeature === 'function') setAutoFeature('mcpOn', true, true); paint(); };
    window.gyMcpClearLog = async function () { if (typeof appConfirm === 'function' && !(await appConfirm('清空全部调用记录？'))) return; L = []; saveLog(); paint(); };
    window.gyMcpExport = function () {
        const t = L.map(x => `[${new Date(x.at).toLocaleString()}] ${x.who} 用了「${x.tool}」（${x.server}）${x.err ? ' ❌' : ''}\n参数：${x.args}\n结果：${x.out}\n`).join('\n');
        const name = '谷雨-MCP调用记录-' + new Date().toISOString().slice(0, 10) + '.txt';
        try { if (typeof saveTextFileForApp === 'function' && window.plus) return saveTextFileForApp(name, t); } catch (e) {}
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain;charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    // 📱 接上这台手机：连 Termux 里跑的 phone-mcp/guyu_phone_mcp.py，不用原生插件、不用重新打包
    const PHONE_URL = 'http://127.0.0.1:8765/mcp';
    const PHONE_INSTALL = 'curl -fsSL https://cdn.jsdelivr.net/gh/Piwp1003/my-ai-twitter@main/phone-mcp/install.sh | bash';
    window.gyMcpPhoneCopy = function () {
        try { navigator.clipboard.writeText(PHONE_INSTALL).then(() => toast('📋 复制好了', '去 Termux 里粘贴回车')); } catch (e) { try { (window.appPrompt || window.prompt)('复制这行到 Termux', PHONE_INSTALL); } catch (e2) {} }
    };
    window.gyMcpBuiltin = async function () {
        let s = C.servers.find(x => x.kind === 'builtin');
        if (!s) { s = { id: uid(), name: '📱 这台手机（内置）', kind: 'builtin', on: true, tools: [] }; C.servers.push(s); save(); }
        go('edit', s.id);
        if (isApp()) await window.gyMcpTestBtn(s.id, document.querySelector('#gyMcpBody .gy-apitest-main'));
        else toast('📱 加好了', '要在安卓 App 里才能用；网页 / 电脑上调不了手机');
    };
    window.gyMcpPhone = async function () {
        let s = C.servers.find(x => x.kind !== 'local' && /\/\/(127\.0\.0\.1|localhost):8765\//.test(x.url || ''));
        const tip = '先在手机的 Termux 里敲 guyu-phone 把它开起来，再把它显示的「口令」粘进来。\n还没装的话：去「🧰 我的 MCP」点「📋 复制安装命令」，在 Termux 里粘贴回车。';
        const old = s ? ((/Bearer\s+(\S+)/.exec(s.headers || '') || [])[1] || '') : '';
        const tok = typeof appPrompt === 'function' ? await appPrompt(tip, old) : prompt(tip, old);
        if (tok == null) return;
        const headers = String(tok).trim() ? 'Authorization: Bearer ' + String(tok).trim().replace(/^Bearer\s+/i, '') : '';
        if (!s) { s = { id: uid(), name: '📱 这台手机', kind: 'http', url: PHONE_URL, headers, on: true, tools: [] }; C.servers.push(s); }
        else s.headers = headers;
        save(); go('edit', s.id);
        await window.gyMcpTestBtn(s.id, document.querySelector('#gyMcpBody .gy-apitest-main'));
    };
    // 粘贴 Claude 桌面版 / Cursor 那种 JSON 配置：{"mcpServers": {...}}
    window.gyMcpImport = async function () {
        const raw = typeof appPrompt === 'function' ? await appPrompt('把 MCP 配置粘进来（{"mcpServers": {…}} 那种，Claude 桌面版、Cursor 的都行）', '') : prompt('粘贴 MCP 配置');
        if (!raw) return;
        let j; try { j = JSON.parse(raw); } catch (e) { return toast('🧰 读不懂', '不是 JSON：' + String(e.message).slice(0, 40)); }
        const M = j.mcpServers || j.servers || j;
        let n = 0;
        Object.keys(M || {}).forEach(name => {
            const x = M[name]; if (!x || typeof x !== 'object') return;
            const s = { id: uid(), name, on: true, tools: [] };
            if (x.url || x.serverUrl) { s.kind = 'http'; s.url = x.url || x.serverUrl; s.headers = Object.entries(x.headers || {}).map(([k, v]) => k + ': ' + v).join('\n'); }
            else if (x.command) { s.kind = 'local'; s.command = x.command; s.args = (x.args || []).join('\n'); s.env = Object.entries(x.env || {}).map(([k, v]) => k + '=' + v).join('\n'); s.cwd = x.cwd || ''; }
            else return;
            C.servers.push(s); n++;
        });
        save(); paint();
        toast('🧰 导进来 ' + n + ' 个', isDesk() ? '挨个点进去测一下' : (C.servers.some(s => s.kind === 'local') ? '本地的那几个要在桌面版里才能用' : '挨个点进去测一下'));
    };

    window.gyMcpOrderReviewOpen = () => window.gyMeituanOrders ? window.gyMeituanOrders.open() : toast('订单核验模块未加载');
    window.gyMcpCheckoutOpen = () => window.gyMeituanCheckout ? window.gyMeituanCheckout.open() : toast('结算摘要模块未加载', '请更新谷雨');
    window.gyMcpDeviceAcknowledge = function () {
        if (window.gyMcpExecution && !window.gyMcpExecution.acknowledge()) toast('暂不能解除占用', '仍有任务或工具请求在途，请等待返回并核对外部软件');
        paintTasks();
    };
    function paintTasks() {
        const box = document.getElementById('gyMcpTasks'); if (!box) return;
        const store = window.gyMcpTasks;
        if (!store) { box.textContent = '任务模块未加载，工具暂不执行。'; return; }
        const device = window.gyMcpExecution && window.gyMcpExecution.status();
        const labels = { created: '已创建', running: '运行中', waiting: '等待中', paused: '已暂停', completed: '调用流程结束', failed: '失败', interrupted: '已中断', cancelled: '已取消', timed_out: '已超时', handed_over: '人工接管' };
        box.innerHTML = (store.storageOk() ? '' : '<div>任务记录未能保存，重新打开后可能丢失。</div>')
            + (device ? '<div>本实例工具队列：' + device.queued + ' 个等待 · ' + device.pending + ' 个工具请求在途</div>' + (device.blocked && !device.human ? '<div>上次工具操作结果未确认，请先核对外部软件。<button class="gymcp-btn ghost" data-mcp-ack>已核对结果，解除占用</button></div>' : '') : '')
            + (device && device.human ? '<div><b>人工接管中</b><p>' + (device.pending || device.owner ? '仍有请求在途，请等待返回后再操作外部软件。' : '工具已暂停。请手动处理登录、验证码、支付等步骤；旧任务不会续跑。')
                + '</p>' + (device.blocked ? '<p>存在未确认的外部操作，请先核对结果；接管不等于撤销已发送的请求。</p>' : '') + '<p>恢复时可能打开选定的美团软件重新读屏，不会重放旧任务。</p><select data-mcp-human-package aria-label="恢复时打开的软件"><option value="">上次操作的软件 / 自动识别</option><option value="com.sankuai.meituan.takeoutnew">美团外卖</option><option value="com.sankuai.meituan">美团</option></select><br><label><input type="checkbox" data-mcp-human-confirm> 我已处理并核对外部操作结果</label><br><button class="gymcp-btn ghost" data-mcp-human-resume>' + (resumeHumanBusy ? '正在重新读屏…' : '重新读屏并恢复工具') + '</button></div>'
                : isApp() ? '<button class="gymcp-btn ghost" data-mcp-takeover>我要接管手机操作</button>' : '<div>手机人工接管需在 Android 版使用。</div>')
            + '<div>仅记录工具执行状态，不代表购买或下单成功。未完成任务不会在重启后自动执行。</div>'
            + store.list().slice(0, 10).map(t => '<div class="gymcp-log"><b>' + esc(t.who) + ' · ' + esc(labels[t.state] || t.state)
                + '</b><div>' + t.steps + ' 次调用 · ' + t.failures + ' 次失败或未确认</div><div>' + esc(t.note)
                + '</div><small>' + esc(new Date(t.updatedAt).toLocaleString()) + '</small>'
                + (['created', 'running', 'waiting', 'paused'].includes(t.state) ? '<button class="gymcp-btn ghost" data-mcp-cancel="' + esc(t.id) + '">取消任务</button>' : '') + '</div>').join('');
        box.onclick = e => { if (e.target.closest('[data-mcp-takeover]')) { window.gyMcpTakeover('user'); return; } if (e.target.closest('[data-mcp-human-resume]')) { window.gyMcpResumeHuman(!!box.querySelector('[data-mcp-human-confirm]')?.checked, box.querySelector('[data-mcp-human-package]')?.value); return; } if (e.target.closest('[data-mcp-ack]')) { window.gyMcpDeviceAcknowledge(); return; } const button = e.target.closest('[data-mcp-cancel]'); if (button && box.contains(button)) window.gyMcpCancel(button.getAttribute('data-mcp-cancel')); };
        if (!store.list().length) box.innerHTML += '<div>还没有工具任务。</div>';
    }
    try { window.addEventListener('gy-mcp-task-change', paintTasks); window.addEventListener('gy-mcp-device-change', paintTasks); } catch (e) {}
    function paintList() {
        const b = document.getElementById('gyMcpBody'); if (!b) return;
        const allOn = C.chars === 'all';
        b.innerHTML = `
          ${on('mcpOn') ? '' : `<div class="gymcp-note warn">「我的 MCP」总开关还关着：服务器能加能测，但 TA 回你的时候不会用。<span class="gymcp-op" onclick="gyMcpTurnOn()">打开</span></div>`}
          <div class="gymcp-note">MCP 是给 AI 用的「工具箱」：查天气、搜网页、读写你的笔记、记忆库……接上以后，你给 TA 发消息，TA 回你之前会先想想要不要用工具，用了就把结果带进回复里。<br>
          <b>网址形式</b>的网页、App、桌面版都能用（网页版要对面允许跨域）；<b>本地形式</b>（command + args）只有桌面版能用。${isDesk() ? '<br>✅ 你现在用的是桌面版，两种都能用。' : ''}<br><span style="opacity:.75">每次判断要不要用工具会多调一次模型；只在私聊里用。</span></div>
          <div class="gymcp-acts"><button class="gymcp-btn" onclick="gyMcpNew('http')">＋ 网址形式</button><button class="gymcp-btn ghost" onclick="gyMcpNew('local')">＋ 本地形式${isDesk() ? '' : '（桌面版）'}</button><button class="gymcp-btn ghost" onclick="gyMcpImport()">📋 粘贴 JSON 配置</button><button class="gymcp-btn ghost" onclick="gyMcpGo('log')">📜 调用记录（${L.length}）</button></div>
          <div class="gymcp-note"><b>📱 让 TA 用你的手机</b>（电量、屏幕时间、正在用什么、弹通知 / 提醒、设闹钟、震动、手电筒、音量亮度、剪贴板、打开软件、位置）：<b>不用装别的软件、不用插件、不用重新打包</b>，安卓 App 里点一下就有。
            <div class="gymcp-acts" style="margin:6px 0 0;"><button class="gymcp-btn" onclick="gyMcpBuiltin()">📱 用这台手机（内置）</button></div>
            <details style="margin-top:4px;"><summary style="cursor:pointer;">还想读通知、读短信、念出来？（要装 Termux，备用）</summary>手机装 Termux + Termux:API（F-Droid），在 Termux 里跑一行安装命令，再敲 <code>guyu-phone</code> 开起来。
            <div class="gymcp-acts" style="margin:6px 0 0;"><button class="gymcp-btn ghost" onclick="gyMcpPhone()">📱 接上 Termux 版</button><button class="gymcp-btn ghost" onclick="gyMcpPhoneCopy()">📋 复制安装命令</button></div></details></div>
          ${C.servers.length ? C.servers.map(s => `<div class="gymcp-row${s.on === false ? ' off' : ''}" onclick="gyMcpGo('edit','${s.id}')">
              <span class="gymcp-ico">${s.kind === 'builtin' ? '📱' : s.kind === 'local' ? '💻' : '🌐'}</span>
              <div class="gymcp-b"><b>${esc(s.name || '（没名字）')}</b><em>${esc(s.kind === 'builtin' ? '内置：App 自己调手机，不用装别的' : s.kind === 'local' ? s.command + ' ' + String(s.args || '').split('\n').join(' ') : s.url)}</em>
              <div class="gymcp-d">${s.err ? '❌ ' + esc(s.err.slice(0, 60)) : s.ok ? '✅ ' + (s.tools || []).filter(t => t.on !== false).length + ' / ' + (s.tools || []).length + ' 个工具开着' : '还没测过'}${s.kind === 'local' && !isDesk() ? '　·　要在桌面版里用' : ''}${s.kind === 'builtin' && !isApp() ? '　·　要在安卓 App 里用' : ''}</div></div>
              <label class="gymcp-sw" onclick="event.stopPropagation()"><input type="checkbox" ${s.on === false ? '' : 'checked'} onchange="gyMcpToggle('${s.id}', this.checked)"></label><span class="gymcp-more">›</span></div>`).join('') : '<div class="gymcp-hint" style="text-align:center;padding:20px 0;">还没有。点上面加一个。</div>'}
          <div class="gymcp-note"><b>真实手机操作 · 能力自检</b><div class="gymcp-acts"><button class="gymcp-btn" onclick="gyMcpPhoneCheck()">检查美团操作条件</button></div><div id="gyMcpPhoneCheck" role="status" aria-live="polite">尚未检查。仅检测当前设备，不会打开或操作美团。</div></div>
          <div class="gymcp-note"><button class="gymcp-btn ghost" onclick="gyMcpCheckoutOpen()">查看本机结算摘要</button> <button class="gymcp-btn ghost" onclick="gyMcpOrderReviewOpen()">核验当前订单结果</button><div>完整配送地址和联系方式仅在本机核对；先核对摘要；提交需本机确认，不会自动操作支付。</div></div>
          <h4 class="gymcp-h">最近任务</h4><div id="gyMcpTasks" class="gymcp-note" role="status" aria-live="polite"></div>
          <h4 class="gymcp-h">谁能用</h4>
          <label class="gymcp-ck"><input type="checkbox" ${allOn ? 'checked' : ''} onchange="gyMcpSet('charsAll', this.checked)"> 所有角色</label>
          ${allOn ? '' : `<div class="gymcp-cks">${chars().map(c => `<label class="gymcp-ck"><input type="checkbox" ${(C.chars || []).map(String).includes(String(c.id)) ? 'checked' : ''} onchange="gyMcpSet('char', ['${c.id}', this.checked])"> ${esc(c.name)}</label>`).join('')}</div>`}
          <h4 class="gymcp-h">怎么判断</h4>
          <div class="gymcp-f"><span>判断要不要用工具用哪个 API</span><select onchange="gyMcpSet('api', this.value)"><option value="main" ${C.api !== 'sub' ? 'selected' : ''}>主 API（更聪明）</option><option value="sub" ${C.api === 'sub' ? 'selected' : ''}>副 API（更省）</option></select></div>
          <div class="gymcp-f"><span>一次最多连着用几轮工具</span><input type="number" min="1" max="6" value="${Number(C.rounds) || 3}" onchange="gyMcpSet('rounds', this.value)"></div>
          <div class="gymcp-hint">要用的 API 得支持「工具调用 / function calling」（DeepSeek、GPT、Claude、Gemini、Qwen 都支持）。</div>`;
    }
    function paintEdit() {
        const b = document.getElementById('gyMcpBody'); if (!b) return;
        const s = get(V.id); if (!s) return go('list');
        const f = (k, label, ph, v, rows) => `<label class="gymcp-f"><span>${label}</span>${rows ? `<textarea id="gymcpE_${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(v || '')}</textarea>` : `<input id="gymcpE_${k}" placeholder="${esc(ph)}" value="${esc(v || '')}">`}</label>`;
        b.innerHTML = `
          ${f('name', '名字', '比如：天气、我的笔记', s.name)}
          ${s.kind === 'builtin' ? `<div class="gymcp-note">不连服务器、不靠别的软件：谷雨 App 自己用 Native.js 调手机（装了「谷雨守护」插件的话走插件）。${isApp() ? '' : '<br><b>现在不是在安卓 App 里，测不了；装好的 App 里再点测试。</b>'}<br>有些工具要先在系统设置里给谷雨开权限：屏幕时间 →「使用情况访问权限」，亮度 →「修改系统设置」，位置 → 定位权限。</div>`
          : s.kind === 'local' ? `${isDesk() ? '' : '<div class="gymcp-note warn">本地 MCP 只有桌面版（exe）能起，这里能先填好，到桌面版里用。</div>'}
            ${f('command', '命令', '比如：npx 或 uvx 或 node', s.command)}
            ${f('args', '参数（一行一个）', '-y\n@modelcontextprotocol/server-memory', s.args, 3)}
            ${f('env', '环境变量（一行一个 KEY=值，可不填）', 'API_KEY=xxx', s.env, 2)}`
          : `${f('url', '网址', 'https://example.com/mcp', s.url)}
            ${f('headers', '请求头（一行一个，可不填）', 'Authorization: Bearer 你的密钥', s.headers, 2)}`}
          <div class="gymcp-acts">
            <button class="gymcp-btn" onclick="gyMcpSave('${s.id}')">保存</button>
            <button class="gymcp-btn ghost gy-apitest-main" onclick="gyMcpTestBtn('${s.id}', this)">🔌 测试连接</button>
            <button class="gymcp-btn ghost" onclick="gyMcpClose()">返回</button>
            ${s.__new ? '' : `<button class="gymcp-btn bad" onclick="gyMcpDel('${s.id}')">删掉</button>`}
          </div>
          ${s.err ? `<div class="gymcp-note warn">上次没连上：${esc(s.err)}</div>` : ''}
          ${(() => {
              const tools = s.tools || [];
              if (!tools.length) return '<div class="gymcp-hint">测试连接成功后，这里会列出它有哪些工具。</div>';
              const row = t => `<label class="gymcp-tool"><input type="checkbox" ${t.on === false ? '' : 'checked'} onchange="gyMcpToolToggle('${s.id}', ${esc(JSON.stringify(t.name))}, this.checked)"><div><b>${esc(t.title || t.name)}</b>${t.title ? `<em>${esc(t.name)}</em>` : ''}<span>${esc(String(t.description || '').slice(0, 160))}</span></div></label>`;
              // 内置版：要「谷雨守护」插件的（读屏 / 页面操作 / 读通知 / 拉回 / 锁软件）单独分一组，其余不用插件
              if (s.kind === 'builtin') {
                  const NEED = { meituan_order_status: 1, meituan_prepare_checkout: 1, meituan_checkout_summary: 1, meituan_menu: 1, meituan_item_options: 1, meituan_cart: 1, meituan_add_item: 1, meituan_inspect: 1, meituan_search: 1, meituan_choose_store: 1, read_screen: 1, read_notifications: 1, inspect_screen: 1, wait_screen: 1, tap_element: 1, set_text: 1, scroll_screen: 1, press_back: 1, pull_back: 1, lock_apps: 1 };
                  const base = tools.filter(t => !NEED[t.name]), plug = tools.filter(t => NEED[t.name]);
                  return `<h4 class="gymcp-h">工具（关掉的 TA 就不会用）</h4>`
                      + `<div class="gymcp-hint" style="margin:2px 0 6px;">✅ 下面这些不用装插件，直接能用：</div>${base.map(row).join('')}`
                      + (plug.length ? `<div class="gymcp-hint" style="margin:14px 0 6px;">🛡️ 下面这些要装了「谷雨守护」插件、并在真手机设置里开了对应权限才用得了：</div>${plug.map(row).join('')}` : '');
              }
              return `<h4 class="gymcp-h">工具（关掉的 TA 就不会用）</h4>${tools.map(row).join('')}`;
          })()}`;
    }
    function paintLog() {
        const b = document.getElementById('gyMcpBody'); if (!b) return;
        b.innerHTML = `
          <div class="gymcp-acts"><button class="gymcp-btn ghost" onclick="gyMcpExport()">📤 导出 TXT</button><button class="gymcp-btn ghost" onclick="gyMcpClearLog()">清空</button>
            <label class="gymcp-f inline"><span>最多存</span><select onchange="gyMcpSet('keep', this.value)">${[50, 200, 500, 2000, 0].map(n => `<option value="${n}" ${Number(C.keep) === n ? 'selected' : ''}>${n ? n + ' 次' : '不限'}</option>`).join('')}</select></label></div>
          ${L.length ? L.map(x => `<details class="gymcp-log${x.err ? ' bad' : ''}"><summary><b>${esc(x.who)}</b> 用了「${esc(x.tool)}」<em>${new Date(x.at).toLocaleString()} · ${(x.ms / 1000).toFixed(1)} 秒${x.err ? ' · 失败' : ''}</em></summary><div><i>服务器</i>${esc(x.server)}</div><div><i>参数</i><code>${esc(x.args)}</code></div><div><i>结果</i><pre>${esc(x.out)}</pre></div></details>`).join('') : '<div class="gymcp-hint" style="text-align:center;padding:20px 0;">还没有调用过。</div>'}`;
    }
    function paint() {
        const p = document.getElementById('gyMcpPage'); if (!p || !p.classList.contains('on')) return;
        const s = V.view === 'edit' ? get(V.id) : null;
        document.getElementById('gyMcpTitle').textContent = V.view === 'log' ? '📜 工具调用记录' : s ? (s.name || (s.kind === 'builtin' ? '📱 这台手机（内置）' : s.kind === 'local' ? '新的本地 MCP' : '新的网址 MCP')) : '🧰 我的 MCP';
        if (V.view === 'edit') paintEdit(); else if (V.view === 'log') paintLog(); else { paintList(); paintTasks(); }
    }
    window.gyMcpPaint = paint;
    const CSS = `
    #gyMcpPage{position:fixed;inset:0;z-index:2147482000;background:var(--gy-bg,#fff);display:none;flex-direction:column;color:inherit;}
    body.dark-theme #gyMcpPage{background:#15202b;}
    #gyMcpPage.on{display:flex;}
    .gymcp-hd{padding:12px 14px;padding-top:calc(12px + env(safe-area-inset-top,0px));font-size:17px;font-weight:700;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--gy-line,#cfd9de);}
    .gymcp-hd .bk{cursor:pointer;font-size:22px;line-height:1;color:var(--gy-accent,#1d9bf0);padding:0 6px;}
    .gymcp-bd{padding:12px 16px calc(40px + env(safe-area-inset-bottom,0px));overflow-y:auto;flex:1 1 auto;min-height:0;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;max-width:720px;width:100%;margin:0 auto;box-sizing:border-box;}
    .gymcp-note{font-size:12.5px;color:#8b98a5;line-height:1.85;padding:10px 12px;margin-bottom:12px;border-radius:10px;background:rgba(var(--gy-accent-rgb),.06);border:1px dashed rgba(var(--gy-accent-rgb),.3);}
    .gymcp-note.warn{border-color:#f5a623;color:inherit;}
    .gymcp-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0;}
    .gymcp-btn{border:1px solid var(--gy-accent,#1d9bf0);color:#fff;background:var(--gy-accent,#1d9bf0);border-radius:999px;padding:7px 14px;font-size:13px;cursor:pointer;font-family:inherit;}
    .gymcp-btn.ghost{background:transparent;color:var(--gy-accent,#1d9bf0);}
    .gymcp-btn.bad{background:transparent;color:var(--gy-bad,#f4212e);border-color:var(--gy-bad,#f4212e);}
    .gymcp-btn[disabled]{opacity:.5;}
    .gymcp-row{display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:1px solid rgba(128,128,128,.14);cursor:pointer;}
    .gymcp-row.off{opacity:.45;}
    .gymcp-ico{font-size:22px;}
    .gymcp-b{flex:1;min-width:0;}.gymcp-b b{display:block;font-size:14px;}.gymcp-b em{display:block;font-style:normal;font-size:11.5px;color:#8b98a5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .gymcp-d{font-size:12px;color:#8b98a5;margin-top:2px;}
    .gymcp-more{color:#8b98a5;font-size:18px;}
    .gymcp-op{color:var(--gy-accent,#1d9bf0);cursor:pointer;font-weight:600;margin-left:6px;}
    .gymcp-hint{font-size:12px;color:#8b98a5;line-height:1.8;}
    .gymcp-h{margin:18px 0 6px;font-size:14px;}
    .gymcp-f{display:flex;flex-direction:column;gap:4px;font-size:12.5px;margin:8px 0;}.gymcp-f.inline{flex-direction:row;align-items:center;margin:0;}
    .gymcp-f>span{color:#8b98a5;}
    .gymcp-f input,.gymcp-f textarea,.gymcp-f select{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--gy-line,#cfd9de);border-radius:9px;background:transparent;color:inherit;font-size:13.5px;font-family:inherit;}
    .gymcp-f.inline select{width:auto;}
    .gymcp-ck{display:inline-flex;align-items:center;gap:5px;font-size:13px;padding:3px 8px;border:1px solid var(--gy-line,#cfd9de);border-radius:999px;cursor:pointer;margin:3px 4px 3px 0;}
    .gymcp-cks{display:flex;flex-wrap:wrap;}
    .gymcp-tool{display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(128,128,128,.12);font-size:13px;}
    .gymcp-tool b{display:block;}.gymcp-tool em{font-style:normal;font-size:11px;color:#8b98a5;margin-left:4px;}.gymcp-tool span{display:block;font-size:12px;color:#8b98a5;line-height:1.6;}
    .gymcp-log{border:1px solid var(--gy-line,#cfd9de);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:13px;}
    .gymcp-log.bad{border-color:var(--gy-bad,#f4212e);}
    .gymcp-log summary{cursor:pointer;}.gymcp-log summary em{display:block;font-style:normal;font-size:11.5px;color:#8b98a5;}
    .gymcp-log div{margin-top:6px;font-size:12px;}.gymcp-log i{font-style:normal;color:#8b98a5;margin-right:6px;}
    .gymcp-log pre,.gymcp-log code{white-space:pre-wrap;word-break:break-all;font-size:12px;}
    .gymcp-sys{cursor:pointer;}
    `;
    function mount() {
        if (document.getElementById('gyMcpPage')) return;
        if (!document.getElementById('gyMcpCss')) { const st = document.createElement('style'); st.id = 'gyMcpCss'; st.textContent = CSS; document.head.appendChild(st); }
        const m = document.createElement('div'); m.id = 'gyMcpPage'; m.setAttribute('data-gy-overlay', '1');
        m.innerHTML = `<div class="gymcp-hd"><span class="bk" onclick="gyMcpClose()">‹</span><span id="gyMcpTitle">🧰 我的 MCP</span></div><div class="gymcp-bd" id="gyMcpBody"></div>`;
        document.body.appendChild(m);
    }

    /* ---------------- 开关 / 入口 / 今天 / 记忆总览 ---------------- */
    function reg() {
        try {
            if (typeof AUTO_FEATURE_GROUPS !== 'undefined' && !AUTO_FEATURE_GROUPS.some(g => g.key === 'MCP'))
                AUTO_FEATURE_GROUPS.push({ key: 'MCP', icon: '🧰', title: '我的 MCP', note: '自己接的 MCP 工具。默认关着。' });
            if (typeof AUTO_FEATURE_DEFS !== 'undefined' && !AUTO_FEATURE_DEFS.some(f => f.key === 'mcpOn'))
                AUTO_FEATURE_DEFS.push({ key: 'mcpOn', label: 'TA 回你之前可以用 MCP 工具', group: 'MCP', defaultOff: true, desc: '你在「🧰 我的 MCP」里接的工具（查天气、搜网页、读写笔记、记忆库……）。打开后，你在私聊里给 TA 发消息，TA 回之前会先判断要不要用工具；用了的话聊天里会多一行小字，点开能看调用了什么、结果是什么。', cost: '每条消息多调一次模型（判断要不要用工具；用了的话每轮再一次）', where: '小功能 → 🧰 我的 MCP' });
        } catch (e) {}
        try { if (typeof GY_BOX_CTX !== 'undefined' && Array.isArray(GY_BOX_CTX) && !GY_BOX_CTX.some(x => x[0] === '__gyMcpCtxFor')) GY_BOX_CTX.push(['__gyMcpCtxFor', '我的 MCP']); } catch (e) {}
        try { if (typeof registerMiniFeature === 'function') registerMiniFeature({ id: 'mcp', icon: '🧰', title: '我的 MCP', desc: '接上 MCP 工具（网址的网页 / App / 桌面版都能用，本地的桌面版能用），TA 回你之前能用上', onOpen: () => window.gyMcpOpen() }); } catch (e) {}
        hookReply();
    }
    function regMem() {
        if (typeof window.gyMemExAdd !== 'function') return false;
        window.gyMemExAdd({ k: 'gyMcp', ico: '🧰', n: '用工具查过的（MCP）', d: '这个角色用 MCP 工具的记录，能改能删', on: () => on('mcpOn'),
            items: c => L.filter(x => x.cid === String(c.id)), text: x => `${x.tool}｜${x.out}`, edit: (x, v) => { const p = String(v).split('｜'); x.out = (p.slice(1).join('｜') || p[0]).trim(); },
            del: (c, i) => { const A = L.filter(x => x.cid === String(c.id)); const x = A[i]; if (x) L = L.filter(y => y !== x); },
            meta: x => new Date(x.at).toLocaleString() + (x.err ? ' · 失败' : ''), save: () => saveLog() });
        return true;
    }
    function todayHtml() {
        if (!on('mcpOn')) return '';
        const day = new Date().toDateString(); const T = L.filter(x => new Date(x.at).toDateString() === day);
        if (!T.length) return '';
        return `<div class="gyt-sec gymcp-tsec"><h4>🧰 我的 MCP</h4><div class="gyt-row click" onclick="gyMcpOpen('log')"><span class="gyt-x">今天用了 ${T.length} 次工具：${esc(Array.from(new Set(T.map(x => x.tool))).slice(0, 4).join('、'))}</span></div></div>`;
    }
    function hookToday() { const f = window.gyTodayRender; if (typeof f !== 'function' || f.__gyMcp) return; const w = function () { const r = f.apply(this, arguments); try { ['gyToday', 'gyTodayM'].forEach(id => { const b = document.getElementById(id); if (!b) return; b.querySelectorAll('.gymcp-tsec').forEach(x => x.remove()); const h = todayHtml(); if (h) b.insertAdjacentHTML('beforeend', h); }); } catch (e) {} return r; }; Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__gyMcp = true; window.gyTodayRender = w; }
    function regWidget() {
        const W = window.__gyPmW; if (!W || !W.WD) return false; if (W.WD.gyMcpW) return true;
        W.WD.gyMcpW = { n: '我的 MCP', sizes: ['s'], tap: () => window.gyMcpOpen('log'), r: () => `<div class="gynp-w s"><b>🧰</b><em>${L.length ? '用过 ' + L.length + ' 次' : '还没用过'}</em></div>` };
        return true;
    }
    let memOk = false, wOk = false;
    setTimeout(reg, 600); setTimeout(reg, 2500);
    setInterval(() => { hookReply(); hookToday(); if (!memOk) memOk = regMem(); if (!wOk) wOk = regWidget(); }, 3000);
    window.gyMcpState = () => ({ servers: C.servers, log: L, cfg: { chars: C.chars, api: C.api, rounds: C.rounds, keep: C.keep } });
})();
