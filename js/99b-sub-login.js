// =====================================================================
//  🎫 会员 / 一键登录（248）：设置 → API 与模型 最上面那一块
//  · ChatGPT Plus / Pro 会员：OpenAI 官方的「Sign in with ChatGPT」（2026-09 开放给开源 / 个人本地项目）。
//    登录要在电脑上起一个 127.0.0.1 的回调，所以只有桌面版（exe）能登。登好以后照常聊天，花的是会员额度。
//    谷雨里的接口地址会变成一个假地址 https://chatgpt.sub.guyu/v1，这里把它翻译成 OpenAI 的 Responses API。
//  · OpenRouter：官方 OAuth（PKCE）一键拿 Key。网页版跳过去再跳回来；桌面版走本机回调；App 里复制授权码粘回来。
//  · Gemini：去 Google AI Studio 拿免费 Key，填进来自动配好地址。
//  · Claude / Gemini 会员登录：官方条款明确禁止第三方应用用会员登录（会封号），不做，只写清楚为什么。
// =====================================================================
(function () {
    if (window.__gySubLoaded) return; window.__gySubLoaded = true;
    const LS = 'gySubCfg';
    const CG_BASE = 'https://chatgpt.sub.guyu/v1', CG_KEY = 'chatgpt-plan';
    const OA = { auth: 'https://auth.openai.com/api/accounts/authorize', token: 'https://auth.openai.com/api/accounts/oauth/token', revoke: 'https://auth.openai.com/api/accounts/oauth/revoke', jwks: 'https://auth.openai.com/.well-known/jwks.json', iss: 'https://auth.openai.com', res: 'https://api.openai.com/v1', api: 'https://api.openai.com/v1' };
    const SCOPE = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
    const isDesk = () => !!(window.gyDesk && window.gyDesk.isDesk && window.gyDesk.oauthLoopback);
    const isApp = () => !!(window.plus && plus.runtime);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const toast = (t, d) => { try { if (typeof showToast === 'function') showToast('', t, d || '', null, null, false); } catch (e) {} };
    let cfg = {}; try { cfg = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { cfg = {}; }
    const save = () => { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} };
    const b64u = buf => { const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
    const b64uDec = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), o = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; };
    const rand = n => b64u(crypto.getRandomValues(new Uint8Array(n || 32)));
    const sha256 = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
    const of = window.fetch.bind(window);
    const form = o => Object.keys(o).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(o[k])).join('&');

    /* =================== ChatGPT 会员 =================== */
    async function verifyIdToken(idt, clientId, nonce) {
        const [h, p, s] = String(idt || '').split('.');
        if (!h || !p || !s) throw new Error('ID token 格式不对');
        const head = JSON.parse(new TextDecoder().decode(b64uDec(h))), pay = JSON.parse(new TextDecoder().decode(b64uDec(p)));
        if (pay.iss !== OA.iss) throw new Error('ID token 不是 OpenAI 发的');
        const aud = Array.isArray(pay.aud) ? pay.aud : [pay.aud];
        if (!aud.includes(clientId)) throw new Error('ID token 不是发给谷雨的');
        if (nonce && pay.nonce !== nonce) throw new Error('nonce 对不上');
        if (pay.exp && pay.exp * 1000 < Date.now() - 300000) throw new Error('ID token 过期了');
        const jw = await (await of(OA.jwks)).json();
        const k = (jw.keys || []).find(x => x.kid === head.kid) || (jw.keys || [])[0];
        if (!k) throw new Error('拿不到 OpenAI 的公钥');
        const key = await crypto.subtle.importKey('jwk', k, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
        const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uDec(s), new TextEncoder().encode(h + '.' + p));
        if (!ok) throw new Error('ID token 签名验不过');
        return pay;
    }
    window.gyCgLogin = async function (target) {
        if (!isDesk()) throw new Error('ChatGPT 会员登录只能在桌面版（exe）里登：OpenAI 要求回调到电脑本机 127.0.0.1');
        const c = cfg.cg = cfg.cg || {};
        c.hostId = c.hostId || ('gy-' + rand(12));
        const verifier = rand(48), challenge = b64u(await sha256(verifier)), state = rand(16), nonce = rand(16);
        const clientId = c.clientId || 'dynamic_agent_client';
        const port = 1455, redirect = `http://127.0.0.1:${port}/auth/callback`;
        const q = { client_id: clientId, ext_agent_host_id: c.hostId, response_type: 'code', redirect_uri: redirect, scope: SCOPE, resource: OA.res, state, nonce, code_challenge_method: 'S256', code_challenge: challenge };
        if (!c.clientId) q.agent_name_hint = '谷雨';
        if (c.email) q.login_hint = c.email;
        const r = await window.gyDesk.oauthLoopback({ authUrl: OA.auth + '?' + form(q), port, path: '/auth/callback', timeoutMs: 300000, okHtml: '<h2 style="font-family:sans-serif">登录好了 ✅</h2><p style="font-family:sans-serif">可以关掉这个页面，回谷雨了。</p>' });
        if (!r || !r.ok) throw new Error((r && r.err) || '没等到登录结果');
        const a = r.query || {};
        if (a.error) throw new Error(a.error === 'access_denied' ? '你在登录页点了拒绝' : '登录出错：' + a.error + (a.error_description ? '（' + a.error_description + '）' : ''));
        if (a.state !== state) throw new Error('state 对不上，这次登录作废了，再点一次');
        if (clientId !== 'dynamic_agent_client' && a.client_id && a.client_id !== clientId) throw new Error('返回的 client_id 对不上');
        const cid = a.client_id || (clientId !== 'dynamic_agent_client' ? clientId : '');
        if (!cid) throw new Error('OpenAI 没给谷雨发 client_id');
        const tr = await of(OA.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ grant_type: 'authorization_code', client_id: cid, code: a.code, code_verifier: verifier, redirect_uri: redirect, resource: OA.res }) });
        const tj = await tr.json().catch(() => ({}));
        if (!tr.ok || !tj.access_token) throw new Error('换 token 失败：' + (tj.error_description || tj.error || 'HTTP ' + tr.status));
        const idp = await verifyIdToken(tj.id_token, cid, nonce);
        if (c.sub && idp.sub && c.sub !== idp.sub && typeof appConfirm === 'function' && !(await appConfirm(`这次登的是另一个账号（${idp.email || idp.sub}），要换成它吗？`))) throw new Error('没换账号');
        const sc = String(tj.scope || '');
        if (!/chatgpt\.tokens\.use\.direct/.test(sc)) throw new Error('你在授权页没勾「用我的 ChatGPT 额度」，谷雨用不了会员额度。再登一次，把那项勾上');
        Object.assign(c, { clientId: cid, access: tj.access_token, refresh: tj.refresh_token, exp: Date.now() + (Number(tj.expires_in) || 3600) * 1000, email: idp.email || '', sub: idp.sub || '', at: Date.now() });
        save();
        if (target) applyTo(target, CG_BASE, CG_KEY, c.model || 'gpt-5');
        return c;
    };
    async function cgToken() {
        const c = cfg.cg; if (!c || !c.refresh) throw new Error('还没用 ChatGPT 会员登录（设置 → API 与模型 → 🎫 会员 / 一键登录）');
        if (c.access && c.exp - 90000 > Date.now()) return c.access;
        const tr = await of(OA.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ grant_type: 'refresh_token', client_id: c.clientId, refresh_token: c.refresh, resource: OA.res }) });
        const tj = await tr.json().catch(() => ({}));
        if (!tr.ok || !tj.access_token) { if (tr.status === 400 || tr.status === 401) { c.access = ''; save(); } throw new Error('ChatGPT 登录过期了，去设置里重新登一次（' + (tj.error || tr.status) + '）'); }
        c.access = tj.access_token; if (tj.refresh_token) c.refresh = tj.refresh_token; c.exp = Date.now() + (Number(tj.expires_in) || 3600) * 1000; save();
        return c.access;
    }
    window.gyCgLogout = async function () {
        const c = cfg.cg; if (!c) return;
        try { if (c.refresh) await of(OA.revoke, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ token: c.refresh, client_id: c.clientId }) }); } catch (e) {}
        cfg.cg = { hostId: c.hostId, clientId: c.clientId }; save(); paint();
        toast('🎫 退出了', '谷雨不再用你的 ChatGPT 会员额度');
    };

    // chat/completions → Responses
    function toResponses(body) {
        const msgs = Array.isArray(body.messages) ? body.messages : [];
        const instr = msgs.filter(m => m.role === 'system').map(m => typeof m.content === 'string' ? m.content : (m.content || []).map(p => p.text || '').join('\n')).join('\n\n');
        const input = [];
        msgs.filter(m => m.role !== 'system').forEach(m => {
            if (m.role === 'tool') { input.push({ type: 'function_call_output', call_id: m.tool_call_id, output: String(m.content || '') }); return; }
            const asst = m.role === 'assistant';
            const parts = typeof m.content === 'string' ? (m.content ? [{ type: asst ? 'output_text' : 'input_text', text: m.content }] : [])
                : (m.content || []).map(p => p.type === 'text' ? { type: asst ? 'output_text' : 'input_text', text: p.text } : p.type === 'image_url' && !asst ? { type: 'input_image', image_url: (p.image_url && p.image_url.url) || p.image_url } : null).filter(Boolean);
            if (parts.length) input.push({ role: asst ? 'assistant' : 'user', content: parts });
            if (asst && Array.isArray(m.tool_calls)) m.tool_calls.forEach(tc => input.push({ type: 'function_call', call_id: tc.id, name: tc.function.name, arguments: tc.function.arguments || '{}' }));
        });
        if (!input.length) input.push({ role: 'user', content: [{ type: 'input_text', text: '（请继续。）' }] });
        const o = { model: body.model, input, stream: true, store: false };
        if (instr) o.instructions = instr;
        if (Array.isArray(body.tools) && body.tools.length) { o.tools = body.tools.filter(t => t.type === 'function').map(t => ({ type: 'function', name: t.function.name, description: t.function.description || '', parameters: t.function.parameters || { type: 'object', properties: {} } })); o.tool_choice = 'auto'; }
        return o;
    }
    async function* sse(stream) {
        const rd = stream.getReader(), dec = new TextDecoder(); let buf = '';
        for (;;) {
            const { value, done } = await rd.read(); if (done) break;
            buf += dec.decode(value, { stream: true });
            let i; while ((i = buf.search(/\r?\n\r?\n/)) >= 0) {
                const block = buf.slice(0, i); buf = buf.slice(i).replace(/^\r?\n\r?\n/, '');
                const data = block.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).replace(/^ /, '')).join('\n');
                if (!data || data === '[DONE]') continue;
                try { yield JSON.parse(data); } catch (e) {}
            }
        }
    }
    const cnErr = (status, j) => {
        const code = (j && j.error && (j.error.code || j.error.type)) || '';
        if (/usage_limit/.test(code) || status === 429) return 'ChatGPT 会员这一档的额度用完了（Plus 是 5 小时一档、Pro 看每周额度），过一会儿再聊，或者先换回 API。';
        if (/not_eligible/.test(code)) return '这个 ChatGPT 账号 / 工作区不允许把会员额度给别的应用用（重新登录也没用）。';
        if (status === 401) return 'ChatGPT 登录过期了，去设置里重新登一次。';
        return (j && j.error && j.error.message) || ('HTTP ' + status);
    };
    async function cgFetch(path, opt) {
        let tok;
        try { tok = await cgToken(); } catch (e) { return new Response(JSON.stringify({ error: { message: String(e.message || e) } }), { status: 401, headers: { 'Content-Type': 'application/json' } }); }
        if (/^\/models/.test(path)) {
            const r = await of(OA.api + '/models', { headers: { Authorization: 'Bearer ' + tok } });
            return r;
        }
        if (!/^\/chat\/completions/.test(path)) return new Response(JSON.stringify({ error: { message: 'ChatGPT 会员只能聊天（' + path + ' 不支持）' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        let body = {}; try { body = JSON.parse(opt.body || '{}'); } catch (e) {}
        const wantStream = !!body.stream;
        const res = await of(OA.api + '/responses', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify(toResponses(body)), signal: opt.signal });
        if (!res.ok || !res.body) {
            let j = null; try { j = await res.json(); } catch (e) {}
            return new Response(JSON.stringify({ error: { message: cnErr(res.status, j), code: j && j.error && j.error.code } }), { status: res.status || 500, headers: { 'Content-Type': 'application/json' } });
        }
        const enc = new TextEncoder();
        const chunk = o => enc.encode('data: ' + JSON.stringify(o) + '\n\n');
        if (wantStream) {
            const it = sse(res.body);
            let ti = 0;
            return new Response(new ReadableStream({
                async pull(ctrl) {
                    try {
                        const { value: ev, done } = await it.next();
                        if (done) { ctrl.enqueue(enc.encode('data: [DONE]\n\n')); ctrl.close(); return; }
                        const t = ev.type || '';
                        if (t === 'response.output_text.delta') ctrl.enqueue(chunk({ object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content: ev.delta } }] }));
                        else if (t === 'response.reasoning_summary_text.delta' || t === 'response.reasoning_text.delta') ctrl.enqueue(chunk({ object: 'chat.completion.chunk', choices: [{ index: 0, delta: { reasoning_content: ev.delta } }] }));
                        else if (t === 'response.output_item.done' && ev.item && ev.item.type === 'function_call') ctrl.enqueue(chunk({ object: 'chat.completion.chunk', choices: [{ index: 0, delta: { tool_calls: [{ index: ti++, id: ev.item.call_id, type: 'function', function: { name: ev.item.name, arguments: ev.item.arguments || '{}' } }] } }] }));
                        else if (t === 'response.completed') { const u = (ev.response && ev.response.usage) || {}; ctrl.enqueue(chunk({ object: 'chat.completion.chunk', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })); ctrl.enqueue(chunk({ object: 'chat.completion.chunk', choices: [], usage: { prompt_tokens: u.input_tokens || 0, completion_tokens: u.output_tokens || 0 } })); }
                        else if (t === 'response.failed' || t === 'error') ctrl.enqueue(chunk({ error: { message: cnErr(0, { error: (ev.response && ev.response.error) || ev.error || ev }) } }));
                    } catch (e) { ctrl.error(e); }
                },
                cancel() { try { it.return(); } catch (e) {} }
            }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
        }
        let text = '', reason = '', calls = [], usage = null, err = null, completed = false;
        for await (const ev of sse(res.body)) {
            const t = ev.type || '';
            if (t === 'response.output_text.delta') text += ev.delta || '';
            else if (t === 'response.reasoning_summary_text.delta') reason += ev.delta || '';
            else if (t === 'response.output_item.done' && ev.item && ev.item.type === 'function_call') calls.push({ id: ev.item.call_id, type: 'function', function: { name: ev.item.name, arguments: ev.item.arguments || '{}' } });
            else if (t === 'response.completed') { completed = true; const u = (ev.response && ev.response.usage) || {}; usage = { prompt_tokens: u.input_tokens || 0, completion_tokens: u.output_tokens || 0 }; }
            else if (t === 'response.failed' || t === 'error') err = cnErr(0, { error: (ev.response && ev.response.error) || ev.error || ev });
        }
        if (err || !completed) return new Response(JSON.stringify({ error: { message: err || 'ChatGPT 这次没写完（可能额度到了），再试一次' } }), { status: 502, headers: { 'Content-Type': 'application/json' } });
        const msg = { role: 'assistant', content: (reason ? `<think>${reason}</think>` : '') + text };
        if (calls.length) msg.tool_calls = calls;
        return new Response(JSON.stringify({ choices: [{ index: 0, message: msg, finish_reason: calls.length ? 'tool_calls' : 'stop' }], usage }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    window.fetch = function (url, opt) {
        const u = typeof url === 'string' ? url : (url && url.url) || '';
        if (u.indexOf(CG_BASE) === 0) return cgFetch(u.slice(CG_BASE.length), opt || {});
        return of(url, opt);
    };
    window.gyCgFetch = cgFetch;

    /* =================== OpenRouter =================== */
    const OR = { auth: 'https://openrouter.ai/auth', keys: 'https://openrouter.ai/api/v1/auth/keys', base: 'https://openrouter.ai/api/v1' };
    async function orExchange(code, verifier) {
        const f = typeof smartFetch === 'function' ? smartFetch : of;
        const r = await f(OR.keys, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.key) throw new Error(r.status === 403 ? '授权码不对或者过期了（10 分钟内有效），再来一次' : '拿 Key 失败：' + ((j.error && j.error.message) || 'HTTP ' + r.status));
        return j.key;
    }
    window.gyOrLogin = async function (target) {
        target = target === 'sub' ? 'sub' : 'main';
        const verifier = rand(48), challenge = b64u(await sha256(verifier)), state = rand(12);
        if (isDesk()) {
            const port = 3000 + Math.floor(Math.random() * 2000), cb = `http://localhost:${port}/callback`;
            const r = await window.gyDesk.oauthLoopback({ authUrl: OR.auth + '?' + form({ callback_url: cb, code_challenge: challenge, code_challenge_method: 'S256', state }), port, path: '/callback', both: true, timeoutMs: 300000, okHtml: '<h2 style="font-family:sans-serif">OpenRouter 连好了 ✅</h2><p style="font-family:sans-serif">可以关掉这个页面，回谷雨了。</p>' });
            if (!r || !r.ok) throw new Error((r && r.err) || '没等到授权');
            if (r.query.state && r.query.state !== state) throw new Error('state 对不上，再来一次');
            if (!r.query.code) throw new Error('没拿到授权码');
            const key = await orExchange(r.query.code, verifier);
            applyTo(target, OR.base, key, 'openrouter/auto'); return key;
        }
        if (!isApp() && /^https:/.test(location.protocol)) {
            cfg.orPending = { verifier, state, target, at: Date.now() }; save();
            const cb = location.origin + location.pathname + '?gyor=1';
            location.href = OR.auth + '?' + form({ callback_url: cb, code_challenge: challenge, code_challenge_method: 'S256', state });
            return null;
        }
        // App / 本地打开的网页：不带回调，OpenRouter 会把授权码显示在页面上，复制回来
        const url = OR.auth + '?' + form({ code_challenge: challenge, code_challenge_method: 'S256' });
        try { if (isApp()) plus.runtime.openURL(url); else window.open(url, '_blank'); } catch (e) { window.open(url, '_blank'); }
        const code = typeof appPrompt === 'function' ? await appPrompt('在打开的 OpenRouter 页面登录、点「Authorize」，页面上会显示一串授权码。复制回来粘在这里：', '') : prompt('粘贴授权码');
        if (!code || !String(code).trim()) throw new Error('没粘授权码');
        const key = await orExchange(String(code).trim(), verifier);
        applyTo(target, OR.base, key, 'openrouter/auto'); return key;
    };
    async function orReturn() {   // 网页版从 OpenRouter 跳回来
        try {
            const u = new URL(location.href); if (!u.searchParams.get('gyor')) return;
            const code = u.searchParams.get('code'), st = u.searchParams.get('state');
            ['gyor', 'code', 'state'].forEach(k => u.searchParams.delete(k)); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
            const p = cfg.orPending; delete cfg.orPending; save();
            if (!p || !code) return;
            if (p.state && st && p.state !== st) return toast('🎫 OpenRouter 没连上', 'state 对不上，再点一次');
            const t0 = Date.now(); while (typeof autoSaveApiSettings !== 'function' && Date.now() - t0 < 8000) await new Promise(r => setTimeout(r, 200));
            const key = await orExchange(code, p.verifier);
            applyTo(p.target, OR.base, key, 'openrouter/auto');
            toast('🎫 OpenRouter 连好了', pick(['Key 已经填进去了，去「拉取模型」挑一个', '连上了，模型先用 openrouter/auto（它自己挑）']));
        } catch (e) { toast('🎫 OpenRouter 没连上', String(e.message || e)); }
    }

    /* =================== Gemini 免费 Key =================== */
    const GM = { base: 'https://generativelanguage.googleapis.com/v1beta/openai', keyPage: 'https://aistudio.google.com/apikey' };
    window.gyGmOpen = function () { try { if (isApp()) plus.runtime.openURL(GM.keyPage); else window.open(GM.keyPage, '_blank'); } catch (e) { window.open(GM.keyPage, '_blank'); } };
    window.gyGmFill = async function (target) {
        const key = typeof appPrompt === 'function' ? await appPrompt('把 Google AI Studio 里复制的 API Key 粘进来（AIza 开头）：', '') : prompt('粘贴 Key');
        if (!key || !String(key).trim()) return;
        let model = 'gemini-2.5-flash';
        try { if (typeof fetchModelListFrom === 'function') { const L = await fetchModelListFrom(GM.base, key.trim()); const ids = L.map(x => String(x.id || '').replace(/^models\//, '')); model = ids.find(x => /flash/.test(x) && !/lite|image|tts|live|embed/.test(x)) || ids[0] || model; } } catch (e) {}
        applyTo(target === 'sub' ? 'sub' : 'main', GM.base, key.trim(), model);
        toast('🎫 Gemini 填好了', '模型先用 ' + model + '，可以「拉取模型」换');
    };

    /* =================== 填进 API 设置 =================== */
    function applyTo(target, url, key, model) {
        const sub = target === 'sub';
        const $ = id => document.getElementById(id);
        const u = $(sub ? 'subApiUrlInput' : 'apiUrlInput'), k = $(sub ? 'subApiKeyInput' : 'apiKeyInput'), m = $(sub ? 'subModelSelect' : 'modelSelect');
        if (u) u.value = url; if (k) k.value = key;
        if (m && model) { if (!Array.from(m.options).some(o => o.value === model)) { const o = document.createElement('option'); o.value = model; o.textContent = model; m.appendChild(o); } m.value = model; }
        try { if (typeof autoSaveApiSettings === 'function') autoSaveApiSettings(); } catch (e) {}
        paint();
    }
    window.gySubApply = applyTo;
    window.gySubState = () => ({ desk: isDesk(), app: isApp(), cg: cfg.cg ? { email: cfg.cg.email || '', on: !!cfg.cg.refresh, clientId: cfg.cg.clientId || '' } : null, cgBase: CG_BASE });
    const run = async (fn, label) => { try { const r = await fn(); if (r) toast('🎫 ' + label, pick(['连好了，可以点「🔌 测试连接」试一句', '好了，去「拉取模型」挑一个也行'])); } catch (e) { toast('🎫 ' + label + '没成', String(e.message || e)); } paint(); };
    window.gySubDo = function (what, target) {
        if (what === 'cg') return run(() => window.gyCgLogin(target), 'ChatGPT 会员');
        if (what === 'or') return run(() => window.gyOrLogin(target), 'OpenRouter');
        if (what === 'gm') return window.gyGmFill(target);
    };

    /* =================== 面板（设置 → API 与模型 最上面） =================== */
    function paint() {
        const host = document.getElementById('setPanel-api'); if (!host) return;
        let box = document.getElementById('gySubBox');
        if (!box) { box = document.createElement('div'); box.id = 'gySubBox'; const first = host.querySelector('div[style*="rgba(29, 155, 240, 0.05)"]'); host.insertBefore(box, first || host.firstChild); }
        const cg = cfg.cg || {}, using = (typeof myApiUrl !== 'undefined' && myApiUrl === CG_BASE) ? '主 API' : (typeof subApiUrl !== 'undefined' && subApiUrl === CG_BASE) ? '副 API' : '';
        const two = (what, label, dis) => `<button class="btn-secondary gysub-b" ${dis ? 'disabled' : ''} onclick="gySubDo('${what}','main')">${label}到主 API</button><button class="btn-secondary gysub-b" ${dis ? 'disabled' : ''} onclick="gySubDo('${what}','sub')">${label}到副 API</button>`;
        box.innerHTML = `<details class="gysub" ${cfg.open ? 'open' : ''} ontoggle="gySubOpenMark(this.open)"><summary>🎫 会员 / 一键登录（不想自己找 Key 看这里）</summary>
          <div class="gysub-it"><b>ChatGPT Plus / Pro 会员</b><span>用 OpenAI 官方的「用 ChatGPT 登录」，花你会员里的额度，不另外买 API。${isDesk() ? '' : '<br>⚠️ 只能在<b>桌面版（exe）</b>里登：OpenAI 要求回调到电脑本机。网页版和手机 App 用不了。'}${cg.refresh ? `<br>✅ 已登录：${esc(cg.email || '你的账号')}${using ? '（正用在' + using + '）' : ''}` : ''}<br><em>不支持：画图、上传文件、语音转文字；温度、最大字数这些参数也不起作用。额度跟你在 ChatGPT 里用的是同一份。</em></span>
            <div>${two('cg', cg.refresh ? '重新登录 / 换' : '登录', !isDesk())}${cg.refresh ? '<button class="btn-secondary gysub-b" onclick="gyCgLogout()">退出</button>' : ''}</div></div>
          <div class="gysub-it"><b>OpenRouter</b><span>一个账号用很多家的模型（GPT、Claude、Gemini、DeepSeek……）。点一下跳到 OpenRouter 登录授权，Key 自动填回来。${isApp() ? '<br>App 里：授权完页面上会显示一串授权码，复制回来粘进去。' : ''}</span><div>${two('or', '连')}</div></div>
          <div class="gysub-it"><b>Gemini（免费 Key）</b><span>用谷歌账号在 Google AI Studio 免费拿一个 API Key（有免费额度，超了才收费）。先点「去拿 Key」，复制回来再点「填进来」。</span><div><button class="btn-secondary gysub-b" onclick="gyGmOpen()">去拿 Key</button><button class="btn-secondary gysub-b" onclick="gySubDo('gm','main')">填进来（主）</button><button class="btn-secondary gysub-b" onclick="gySubDo('gm','sub')">填进来（副）</button></div></div>
          <div class="gysub-it"><b>中转站的包月套餐</b><span>包月 / 按次的中转站，给你的也是「地址 + Key」，直接填在下面的主 API / 副 API 里就行，跟普通中转站一样（怎么挑见使用指南「🛒 中转站」）。</span></div>
          <div class="gysub-it no"><b>Claude 会员（Pro / Max）、Gemini 会员（Google One AI）</b><span>不做：Anthropic 和 Google 都明确规定，会员登录只能用在他们自己的产品里，第三方应用拿去用算违规，会被封号。想用 Claude 就去 console.anthropic.com 买 API Key（或者走 OpenRouter / 中转站）；想用 Gemini 用上面的免费 Key。</span></div>
        </details>`;
    }
    window.gySubOpenMark = v => { cfg.open = !!v; save(); };
    window.gySubExpire = () => { if (cfg.cg) { cfg.cg.exp = 0; save(); } };   // 测试用：假装 token 到期
    window.gySubPaint = paint;
    if (!document.getElementById('gySubCss')) { const st = document.createElement('style'); st.id = 'gySubCss'; st.textContent = `.gysub{border:1px solid #1d9bf0;border-radius:8px;padding:10px 14px;margin-bottom:15px;background:rgba(29,155,240,.04)}.gysub summary{cursor:pointer;font-weight:600;color:#1d9bf0}.gysub-it{padding:10px 0;border-bottom:1px dashed rgba(128,128,128,.25);font-size:13px}.gysub-it:last-child{border:0}.gysub-it b{display:block}.gysub-it span{display:block;color:#536471;line-height:1.7;margin:3px 0 6px}.gysub-it em{font-style:normal;opacity:.8}.gysub-it.no b{color:#8b98a5}.gysub-b{margin:3px 6px 3px 0!important;padding:6px 10px!important;width:auto!important;display:inline-block!important}`; document.head.appendChild(st); }
    function boot() {
        paint(); orReturn();
        try { const o = window.openSettingsPanel; if (typeof o === 'function' && !o.__gySub) { const w = function (k) { const r = o.apply(this, arguments); if (k === 'api') paint(); return r; }; Object.keys(o).forEach(k => { try { w[k] = o[k]; } catch (e) {} }); w.__gySub = true; window.openSettingsPanel = w; } } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
})();
