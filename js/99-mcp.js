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
    async function connect(s, fresh) {
        if (!fresh && CONN[s.id]) return CONN[s.id];
        if (CONN[s.id]) { try { CONN[s.id].close(); } catch (e) {} delete CONN[s.id]; }
        let c;
        if (s.kind === 'local') c = await localConn(s);
        else {
            try { c = await httpConn(s); }
            catch (e) { if (e && (e.status === 404 || e.status === 405 || e.status === 400)) c = await sseConn(s); else throw e; }
        }
        // 工具清单（可能分页）
        let tools = [], cursor;
        for (let i = 0; i < 10; i++) {
            const r = await c.rpc('tools/list', cursor ? { cursor } : {});
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
        rows.push(['服务器', s.name || s.url || s.command], ['类型', s.kind === 'local' ? '本地（桌面版起进程）' : '网址']);
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
            if (out.length >= 48) return;
            const fn = ('s' + C.servers.indexOf(s) + '__' + t.name).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
            out.push({ fn, s, t });
        }));
        return out;
    }
    const lastMsgs = (sid, n) => ((typeof globalChats !== 'undefined' && globalChats[sid]) || []).filter(m => m && m.text && !m.isRecalled).slice(-n);
    async function callApi(api, msgs, tools) {
        const anth = typeof isAnthropicApiUrl === 'function' && isAnthropicApiUrl(api.url);
        const __gyCall = typeof gyDetectCall === 'function' ? gyDetectCall() : null, t0 = Date.now();
        if (anth) {
            const sys = msgs.filter(m => m.role === 'system').map(m => m.content).join('\n');
            const body = { model: api.model, max_tokens: 1024, system: sys, messages: msgs.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })), tools: tools.map(x => ({ name: x.fn, description: (x.t.title ? x.t.title + '：' : '') + x.t.description, input_schema: x.t.inputSchema })) };
            const res = await doFetch(`${api.url}/v1/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': api.key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body) });
            const d = await res.json();
            if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
            try { if (typeof recordTokenUsage === 'function') recordTokenUsage(d, { inChars: JSON.stringify(body).length, outChars: 50 }, __gyCall, { api, t0, kind: 'chat' }); } catch (e) {}
            const calls = (d.content || []).filter(b => b.type === 'tool_use').map(b => ({ id: b.id, fn: b.name, args: b.input || {} }));
            return { calls, append: calls.length ? [{ role: 'assistant', content: d.content }] : [], result: (outs) => ({ role: 'user', content: outs.map(o => ({ type: 'tool_result', tool_use_id: o.id, content: o.out })) }) };
        }
        const body = { model: api.model, messages: msgs, tools: tools.map(x => ({ type: 'function', function: { name: x.fn, description: ((x.t.title ? x.t.title + '：' : '') + x.t.description).slice(0, 1000), parameters: x.t.inputSchema && x.t.inputSchema.type ? x.t.inputSchema : { type: 'object', properties: {} } } })), tool_choice: 'auto' };
        const res = await doFetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.key}` }, body: JSON.stringify(body) });
        const d = await res.json().catch(() => ({ error: { message: 'HTTP ' + res.status } }));
        if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
        try { if (typeof recordTokenUsage === 'function') recordTokenUsage(d, { inChars: JSON.stringify(body).length, outChars: 50 }, __gyCall, { api, t0, kind: 'chat' }); } catch (e) {}
        const m = (d.choices && d.choices[0] && d.choices[0].message) || {};
        const calls = (m.tool_calls || []).map(tc => { let a = {}; try { a = JSON.parse(tc.function.arguments || '{}'); } catch (e) {} return { id: tc.id, fn: tc.function.name, args: a }; });
        return { calls, append: calls.length ? [{ role: 'assistant', content: m.content || '', tool_calls: m.tool_calls }] : [], result: outs => outs.map(o => ({ role: 'tool', tool_call_id: o.id, content: o.out })) };
    }
    async function gyMcpDecide(sessionId, triggerText) {
        const c = charOf(sessionId);
        if (!on('mcpOn') || !c || !charAllowed(c)) return null;
        const tools = toolsNow(); if (!tools.length) return null;
        const api = typeof getApiConfig === 'function' ? getApiConfig(C.api === 'sub') : null;
        if (!api || !api.key) return null;
        const me = (typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '她';
        const msgs = [{ role: 'system', content: `你是${c.name}。${String(c.persona || '').slice(0, 800)}\n现在${me}给你发了消息。你手边有一些工具。只有回她真的用得上工具的时候才调用（查资料、看日程、读写记忆……），用不上就直接回一个字：无。工具结果会交给你，之后你再正常回她——这一步不用写回复。现在是 ${new Date().toLocaleString()}。` }];
        lastMsgs(String(sessionId), 12).forEach(m => { if (m.sender === 'system') return; msgs.push({ role: m.sender === 'me' ? 'user' : 'assistant', content: String(m.text).slice(0, 800) }); });
        if (triggerText && !(msgs.length > 1 && msgs[msgs.length - 1].content === triggerText)) msgs.push({ role: 'user', content: String(triggerText).slice(0, 1500) });
        if (msgs[msgs.length - 1].role !== 'user') msgs.push({ role: 'user', content: '（她刚发了消息，看上面）' });
        const items = [];
        for (let round = 0; round < Math.max(1, Math.min(6, Number(C.rounds) || 3)); round++) {
            const r = await callApi(api, msgs, tools);
            if (!r.calls.length) break;
            const outs = [];
            for (const call of r.calls.slice(0, 5)) {
                const x = tools.find(t => t.fn === call.fn);
                let out;
                const t0 = Date.now();
                if (!x) out = '［没有这个工具］';
                else {
                    try { const conn = await connect(x.s); out = toolText(await conn.rpc('tools/call', { name: x.t.name, arguments: call.args || {} })); }
                    catch (e) { out = '［调用失败：' + String(e && e.message || e).slice(0, 160) + '］'; try { delete CONN[x.s.id]; } catch (e2) {} }
                }
                out = String(out).slice(0, 4000);
                const argsText = JSON.stringify(call.args || {}).slice(0, 300);
                const item = { id: call.id, tool: x ? (x.t.title || x.t.name) : call.fn, server: x ? (x.s.name || x.s.url || x.s.command) : '', argsText, out, ms: Date.now() - t0 };
                items.push(item); outs.push({ id: call.id, out });
                L.unshift({ at: Date.now(), cid: String(c.id), who: c.name, tool: item.tool, server: item.server, args: argsText, out: out.slice(0, 800), ms: item.ms, err: /^［(调用失败|工具报错|没有这个工具)/.test(out) });
            }
            msgs.push(...r.append);
            const res = r.result(outs); if (Array.isArray(res)) msgs.push(...res); else msgs.push(res);
        }
        if (!items.length) return null;
        saveLog();
        CTX[String(c.id)] = { at: Date.now(), items };
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
    window.gyMcpDecide = gyMcpDecide;
    function hookReply() {
        const o = window.triggerAIBatchReply;
        if (typeof o !== 'function' || o.__gyMcp) return;
        const w = async function (sessionId, triggerText) {
            try {
                if (on('mcpOn') && sessionId && !String(sessionId).startsWith('g_') && charOf(sessionId))
                    await Promise.race([gyMcpDecide(sessionId, triggerText), new Promise(r => setTimeout(r, 45000))]);
            } catch (e) { console.warn('[MCP] 判断要不要用工具时出错，照常回复：', e); }
            return o.apply(this, arguments);
        };
        w.__gyMcp = true; window.triggerAIBatchReply = w;
    }

    /* ---------------- 页面（整页） ---------------- */
    const V = { view: 'list', id: null, draft: null };
    function go(v, id) { V.view = v; V.id = id || null; mount(); document.getElementById('gyMcpPage').classList.add('on'); paint(); }
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
        if (s.kind === 'local' ? !s.command : !s.url) { toast('🧰 还没填完', s.kind === 'local' ? '要填命令' : '要填网址'); return false; }
        if (!s.name) s.name = s.kind === 'local' ? s.command.split(/[\\/]/).pop() : (s.url.replace(/^https?:\/\//, '').split('/')[0]);
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

    function paintList() {
        const b = document.getElementById('gyMcpBody'); if (!b) return;
        const allOn = C.chars === 'all';
        b.innerHTML = `
          ${on('mcpOn') ? '' : `<div class="gymcp-note warn">「我的 MCP」总开关还关着：服务器能加能测，但 TA 回你的时候不会用。<span class="gymcp-op" onclick="gyMcpTurnOn()">打开</span></div>`}
          <div class="gymcp-note">MCP 是给 AI 用的「工具箱」：查天气、搜网页、读写你的笔记、记忆库……接上以后，你给 TA 发消息，TA 回你之前会先想想要不要用工具，用了就把结果带进回复里。<br>
          <b>网址形式</b>的网页、App、桌面版都能用（网页版要对面允许跨域）；<b>本地形式</b>（command + args）只有桌面版能用。${isDesk() ? '<br>✅ 你现在用的是桌面版，两种都能用。' : ''}<br><span style="opacity:.75">每次判断要不要用工具会多调一次模型；只在私聊里用。</span></div>
          <div class="gymcp-acts"><button class="gymcp-btn" onclick="gyMcpNew('http')">＋ 网址形式</button><button class="gymcp-btn ghost" onclick="gyMcpNew('local')">＋ 本地形式${isDesk() ? '' : '（桌面版）'}</button><button class="gymcp-btn ghost" onclick="gyMcpImport()">📋 粘贴 JSON 配置</button><button class="gymcp-btn ghost" onclick="gyMcpGo('log')">📜 调用记录（${L.length}）</button></div>
          ${C.servers.length ? C.servers.map(s => `<div class="gymcp-row${s.on === false ? ' off' : ''}" onclick="gyMcpGo('edit','${s.id}')">
              <span class="gymcp-ico">${s.kind === 'local' ? '💻' : '🌐'}</span>
              <div class="gymcp-b"><b>${esc(s.name || '（没名字）')}</b><em>${esc(s.kind === 'local' ? s.command + ' ' + String(s.args || '').split('\n').join(' ') : s.url)}</em>
              <div class="gymcp-d">${s.err ? '❌ ' + esc(s.err.slice(0, 60)) : s.ok ? '✅ ' + (s.tools || []).filter(t => t.on !== false).length + ' / ' + (s.tools || []).length + ' 个工具开着' : '还没测过'}${s.kind === 'local' && !isDesk() ? '　·　要在桌面版里用' : ''}</div></div>
              <label class="gymcp-sw" onclick="event.stopPropagation()"><input type="checkbox" ${s.on === false ? '' : 'checked'} onchange="gyMcpToggle('${s.id}', this.checked)"></label><span class="gymcp-more">›</span></div>`).join('') : '<div class="gymcp-hint" style="text-align:center;padding:20px 0;">还没有。点上面加一个。</div>'}
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
          ${s.kind === 'local' ? `${isDesk() ? '' : '<div class="gymcp-note warn">本地 MCP 只有桌面版（exe）能起，这里能先填好，到桌面版里用。</div>'}
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
          ${(s.tools || []).length ? `<h4 class="gymcp-h">工具（关掉的 TA 就不会用）</h4>${s.tools.map(t => `<label class="gymcp-tool"><input type="checkbox" ${t.on === false ? '' : 'checked'} onchange="gyMcpToolToggle('${s.id}', ${esc(JSON.stringify(t.name))}, this.checked)"><div><b>${esc(t.title || t.name)}</b>${t.title ? `<em>${esc(t.name)}</em>` : ''}<span>${esc(t.description.slice(0, 160))}</span></div></label>`).join('')}` : '<div class="gymcp-hint">测试连接成功后，这里会列出它有哪些工具。</div>'}`;
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
        document.getElementById('gyMcpTitle').textContent = V.view === 'log' ? '📜 工具调用记录' : s ? (s.name || (s.kind === 'local' ? '新的本地 MCP' : '新的网址 MCP')) : '🧰 我的 MCP';
        if (V.view === 'edit') paintEdit(); else if (V.view === 'log') paintLog(); else paintList();
    }
    window.gyMcpPaint = paint;
    const CSS = `
    #gyMcpPage{position:fixed;inset:0;z-index:2600;background:var(--gy-bg,#fff);display:none;flex-direction:column;color:inherit;}
    body.dark-theme #gyMcpPage{background:#15202b;}
    #gyMcpPage.on{display:flex;}
    .gymcp-hd{padding:12px 14px;padding-top:calc(12px + env(safe-area-inset-top,0px));font-size:17px;font-weight:700;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--gy-line,#cfd9de);}
    .gymcp-hd .bk{cursor:pointer;font-size:22px;line-height:1;color:var(--gy-accent,#1d9bf0);padding:0 6px;}
    .gymcp-bd{padding:12px 16px 40px;overflow-y:auto;flex:1 1 auto;max-width:720px;width:100%;margin:0 auto;box-sizing:border-box;}
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
