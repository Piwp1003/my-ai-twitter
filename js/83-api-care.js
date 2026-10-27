/* ============================================================
   🛠️ 出错时的补救 + 「聊天里的约定≠已经发生」（v210）
   ------------------------------------------------------------
   1. 接口报错说人话：以前只翻译 HTTP 状态码，「上下文太长」「内容被拦」「余额不够」
      「模型名不对」「超时」这些看报错文字才认得出的，一律原样甩出来。这里按报错文字分类，
      每类给一句怎么办。
   2. 修一个老 bug：js/01 里那个「接口报错就弹一句提示」的包装，跑的时候 callChatCompletionAPI
      和 sendChatRequest 还没定义（它们在 js/01b），所以从来没生效过。这里在它们定义好之后再套一次。
   3. 回复格式坏了自动修一次：聊天要模型回一段 JSON，有时引号没转义、括号没闭合，
      以前就把整坨原文当一条消息发出来。现在先请模型把那段原样修成合法 JSON 再解析（多一次调用，可关）。
   4. 「聊天里说好的事 ≠ 已经发生」：TA 在聊天里说「明天去接你」，那只是约定；
      写日记、写小说、写推文时不能当成已经接过了。进 prompt 骨架（注入内容管理里能关）。
   ============================================================ */
(function () {
    'use strict';
    if (window.__gyApiCare) return;
    window.__gyApiCare = true;
    const on = k => { try { return typeof isAutoOn === 'function' ? isAutoOn(k) : true; } catch (e) { return true; } };
    const toast = (a, b) => { try { showToast('', a, b || '', null, null, false); } catch (e) {} };

    // ---------- 开关 ----------
    try {
        if (typeof AUTO_FEATURE_GROUPS !== 'undefined' && !AUTO_FEATURE_GROUPS.some(g => g.key === '补救'))
            AUTO_FEATURE_GROUPS.push({ key: '补救', icon: '🛠️', title: '出错时的补救', note: '模型回得不对、接口报错的时候怎么兜底。' });
        if (typeof AUTO_FEATURE_DEFS !== 'undefined' && !AUTO_FEATURE_DEFS.some(f => f.key === 'jsonRepair'))
            AUTO_FEATURE_DEFS.push({ key: 'jsonRepair', label: '聊天回复格式坏了自动修一次', group: '补救',
                desc: '聊天要模型回一段 JSON。模型偶尔会把引号、括号写坏，以前就把整坨原文当成一条消息发出来（满屏 {"replies":…}）。打开后先请模型把那段原样修好再发，内容一个字不改；修不好才按老办法兜底。只在不是流式输出时生效。',
                cost: '只有格式坏了的那一轮多一次调用', where: '私聊 / 群聊回复' });
    } catch (e) {}

    // ---------- 1) 报错分类 ----------
    const RULES = [
        ['上下文太长', /context.?length|maximum context|context_length_exceeded|too many tokens|token limit|prompt is too long|input is too long|reduce the length|上下文.*(长|超)|超出.*(长度|上下文)|413/i,
            '发过去的内容超过了这个模型能装下的长度。在「注入内容管理」里关掉几段、把聊天历史条数或总结条数调小，或者换个上下文更长的模型。'],
        ['内容被拦截', /content.?filter|content_policy|safety|blocked|moderation|prohibited|PROHIBITED_CONTENT|SAFETY|recitation|违规|审核|敏感|不合规|拒绝生成/i,
            '这一轮的内容被模型或中转站的审核拦下了。换个说法再试，或者换个审核没那么严的模型 / 中转。'],
        ['余额或额度不够', /insufficient_quota|quota|余额|balance|credit|billing|欠费|exceeded your current|payment required|402/i,
            '这个 key 的余额或额度用完了。去服务商后台充值或换一个 key。'],
        ['密钥不对', /invalid.?api.?key|incorrect api key|unauthorized|authentication|invalid token|无效的令牌|令牌.*(无效|过期)|api key not valid|401/i,
            '密钥不对或者过期了。重新复制一遍 key（注意别带空格），确认填在对应的那一栏。'],
        ['模型或渠道不对', /model.*(not.?found|does not exist|not exist|unavailable|not supported)|no available channel|无可用渠道|模型.*(不存在|不可用)|unknown model/i,
            '这家中转没有这个模型，或者模型名写错了。点「拉取模型」从列表里选一个。'],
        ['被限流', /rate.?limit|too many requests|concurrency|429|请求过于频繁/i,
            '请求太密被限流了。等一两分钟再试；自动功能开得多的话，关掉几个后台自己跑的。'],
        ['超时', /timeout|timed out|超时|ETIMEDOUT|ESOCKETTIMEDOUT|524|408/i,
            '对面太久没回。换个响应快的模型，或者过一会儿再试；思考型模型本来就慢。'],
        ['回复格式不对', /JSON|格式不对|Unexpected token|Unexpected end|parse/i,
            '接口回了内容，但格式不是要的那样（可能被截断了，或者模型只回了思考过程）。把「最大回复长度」调大一点再试。']
    ];
    function classify(msg) { for (const [n, re, tip] of RULES) if (re.test(msg)) return { n, tip }; return null; }
    window.gyClassifyApiError = m => classify(String(m || ''));
    function hookEnhance() {
        const f = window.enhanceNetworkErrorMessage; if (typeof f !== 'function' || f.__gyCare) return;
        const w = function (raw) {
            const msg = String(raw || '');
            if (/💡/.test(msg)) return msg;
            const c = classify(msg);
            if (c && !/^(Failed to fetch|Load failed)/i.test(msg)) return msg + '\n\n💡【' + c.n + '】' + c.tip;
            return f.apply(this, arguments);
        };
        Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__gyCare = true; window.enhanceNetworkErrorMessage = w; try { enhanceNetworkErrorMessage = w; } catch (e) {}
    }

    // ---------- 2) 补上「接口报错就提示一句」 ----------
    let lastMsg = '', lastAt = 0;
    function notice(d) {
        try {
            if (!d || !d.error || d.aborted) return;
            // 🛟 客服在盯着报错的话，由客服来提醒（带大白话解释），这里就不再弹一遍了
            try { if (typeof window.gyHelpApiErr === 'function' && (typeof isAutoOn !== 'function' || isAutoOn('helpWatch'))) return; } catch (e) {}
            let scene = ''; try { scene = typeof window.gyInjectScene === 'function' ? window.gyInjectScene() : ''; } catch (e) {}
            if (scene === 'chat' || scene === 'group') return;   // 私聊 / 群聊自己会弹详细的
            const raw = String(d.error.message || d.error.type || d.error).slice(0, 160);
            const now = Date.now(); if (raw === lastMsg && now - lastAt < 30000) return; lastMsg = raw; lastAt = now;
            const full = typeof window.enhanceNetworkErrorMessage === 'function' ? window.enhanceNetworkErrorMessage(raw) : raw;
            const c = classify(raw);
            console.warn('[接口]', full);
            toast('接口报错' + (c ? ' · ' + c.n : ''), (c ? c.tip : full.split('\n')[0]).slice(0, 120));
        } catch (e) {}
    }
    function hookNotice() {
        ['callChatCompletionAPI', 'sendChatRequest'].forEach(name => {
            const orig = window[name]; if (typeof orig !== 'function' || orig.__gyErrNotice || orig.__gyCare) return;
            const w = async function () { const r = await orig.apply(this, arguments); notice(r); return r; };
            Object.keys(orig).forEach(k => { try { w[k] = orig[k]; } catch (e) {} }); w.__gyErrNotice = true; w.__gyCare = true; w.__gyOrig = orig;
            window[name] = w; try { if (name === 'callChatCompletionAPI') callChatCompletionAPI = w; else sendChatRequest = w; } catch (e) {}
        });
    }

    // ---------- 3) 聊天 JSON 坏了：修一次（js/05b 调这个） ----------
    window.gyRepairChatJson = async function (api, data, char) {
        try {
            if (!on('jsonRepair') || !data || data.error || data.aborted) return data;
            const raw = String((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
            if (!raw) return data;
            if (typeof extractJsonObject === 'function') { const p = extractJsonObject(raw); if (p && (Array.isArray(p.replies) || p.stateUpdate)) return data; }
            if (!/"replies"\s*:|^\s*(```(json)?\s*)?\{/.test(raw)) return data;   // 本来就不是 JSON（模型直接说了话）：不修
            const prompt = [{ role: 'system', content: '你是 JSON 修复工具，只输出修好的 JSON 本身。' }, { role: 'user', content:
                `下面这段本来应该是一个 JSON 对象（大致格式：{"replies":[{"delay":秒数,"text":"话"}], 其它字段…}），但格式坏了解析不了。\n把它修成合法的 JSON：字符串里的英文双引号和换行要转义，字段之间用英文逗号，括号都要闭合；如果末尾被截断了，就在最后一个完整的句子处收尾闭合。\n里面的内容一个字都不要改、不要删、不要加，不要解释，不要用 \`\`\` 包起来，只输出修好的 JSON。\n\n原文：\n${raw.slice(0, 12000)}` }];
            const f = window.callChatCompletionAPI;
            const r = await f(api, prompt, 1);
            const fixed = String((r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content) || '').trim();
            const p2 = fixed && typeof extractJsonObject === 'function' ? extractJsonObject(fixed) : null;
            if (p2 && Array.isArray(p2.replies) && p2.replies.length) {
                toast('🔧 回复格式坏了，自动修了一次', (char && char.name ? char.name + ' · ' : '') + '内容没改');
                return Object.assign({}, data, { choices: [{ message: { content: fixed } }], __gyRepaired: true });
            }
        } catch (e) { console.warn('[补救] 修 JSON 失败，按老办法兜底', e); }
        return data;
    };

    // ---------- 4) 约定 ≠ 已经发生 ----------
    const GY_PL_PROMISE = `\n【约定不等于已经发生】手机聊天里说好的事（"明天去接你""周末一起去看海""等下给你打电话"）只是约定和打算。除非后来的记录里写明它真的发生了（一起出去的记录、小剧场、她确认了），否则不要把它当成已经做过的事来写——写日记、推文、信、小说时也一样：可以写期待、惦记、准备，不要写成"今天去接了她"。\n`;
    window.gyPromiseRule = function () {
        return typeof gyPL === 'function' ? gyPL('core.promise', GY_PL_PROMISE) : GY_PL_PROMISE;
    };

    function hookAll() { hookEnhance(); hookNotice(); }
    hookAll(); setInterval(hookAll, 4000);
})();

/* ============================================================
   🔒 API 保护（v271）：怀疑 key 泄露 / 被盗刷时保护你
   ① 一键紧急停用：本地拦下所有模型调用 + 关云同步 + 尽力擦掉云端 Worker KV 里存的 key；
      并提醒你去模型服务商后台把 key 删掉重置（那才是根治）。
   ② 用量异常自动暂停：盯最近一段时间的 token 用量，短时间内超过你设的阈值就自动停掉并弹提醒
      （key 被别人刷的典型症状就是用量突然暴涨）。
   入口在「设置 → 📊 Token 用量」页最上面那条。停用后所有调用返回一句「已紧急停用」，解除后恢复。
   ============================================================ */
(function () {
    if (window.__gyApiGuard) return; window.__gyApiGuard = 1;
    const LS = 'gyApiGuard';
    let G = { killed: false, reason: '', watch: true, winMin: 10, maxTok: 200000 };
    try { G = Object.assign(G, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
    const save = () => { try { localStorage.setItem(LS, JSON.stringify(G)); } catch (e) {} };
    const toast = (t, d) => { try { showToast('', t, d || '', null, null, false); } catch (e) {} };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.gyApiGuardState = () => G;
    const blockMsg = () => '🔒 已紧急停用 API：' + (G.reason || '你手动停的') + '。处理好后在「设置 → 📊 Token 用量」页顶上点「解除」就恢复。';
    window.gyApiBlocked = () => G.killed ? blockMsg() : '';

    /* —— 总闸门：停用时拦下所有模型调用 —— */
    function wrapObj(name) { const f = window[name]; if (typeof f !== 'function' || f.__guard) return; const w = async function () { if (G.killed) return { error: { message: blockMsg() } }; return f.apply(this, arguments); }; try { Object.keys(f).forEach(k => { w[k] = f[k]; }); } catch (e) {} w.__guard = 1; window[name] = w; }
    function wrapNull(name) { const f = window[name]; if (typeof f !== 'function' || f.__guard) return; const w = async function () { if (G.killed) return null; return f.apply(this, arguments); }; try { Object.keys(f).forEach(k => { w[k] = f[k]; }); } catch (e) {} w.__guard = 1; window[name] = w; }
    function wrapThrow(name) { const f = window[name]; if (typeof f !== 'function' || f.__guard) return; const w = async function () { if (G.killed) throw new Error(blockMsg()); return f.apply(this, arguments); }; try { Object.keys(f).forEach(k => { w[k] = f[k]; }); } catch (e) {} w.__guard = 1; window[name] = w; }
    function hookAll() { ['sendChatRequestRaw', 'sendChatRequest', 'callChatCompletionAPI'].forEach(wrapObj); wrapNull('getEmbedding'); wrapThrow('streamCompletionText'); }
    hookAll(); setTimeout(hookAll, 1500); setTimeout(hookAll, 5000);

    /* —— 紧急停用 / 解除 —— */
    window.gyApiKill = async function (reason, quiet) {
        G.killed = true; G.reason = reason || '手动紧急停用'; save(); hookAll();
        try { if (typeof cloudSyncEnabled !== 'undefined') cloudSyncEnabled = false; } catch (e) {}
        try { localStorage.setItem('cloudSyncEnabled', 'false'); } catch (e) {}
        let wiped = false;
        try {
            const url = (typeof cloudWorkerUrl !== 'undefined' && cloudWorkerUrl) || localStorage.getItem('cloudWorkerUrl') || '';
            const tok = (typeof cloudAuthToken !== 'undefined' && cloudAuthToken) || localStorage.getItem('cloudAuthToken') || '';
            if (url && tok) { const r = await fetch(url.replace(/\/+$/, '') + '/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ apiUrl: '', apiKey: '', model: '', characters: [] }) }); wiped = !!(r && r.ok); }
        } catch (e) {}
        try { gyApiGuardRepaint(); } catch (e) {}
        const msg = '🔒 已紧急停用：\n· 本地所有模型调用已拦下\n· 云同步已关闭' + (wiped ? '\n· 云端存的 key 已擦掉' : '') + '\n\n⚠️ 这不能撤销泄露本身——请务必去你的模型服务商后台把这个 key 删掉 / 重置，再填新的 key。';
        if (!quiet) { try { appAlert(msg); } catch (e) { toast('🔒 已紧急停用', '去服务商重置 key'); } } else toast('🔒 用量异常，已自动停用', G.reason);
    };
    window.gyApiUnkill = async function () {
        const ask = typeof appConfirm === 'function' ? appConfirm : m => Promise.resolve(confirm(m));
        if (!(await ask('确认已经去服务商重置过 key（或确认是误报）了吗？解除后模型调用会恢复。'))) return;
        G.killed = false; G.reason = ''; save(); try { gyApiGuardRepaint(); } catch (e) {} toast('✅ 已解除', 'API 恢复可用');
    };
    window.gyApiGuardSet = (k, v) => { if (k === 'watch') G.watch = !!v; else G[k] = Math.max(0, parseInt(v, 10) || 0); save(); };

    /* —— 用量异常自动暂停 —— */
    let win = [];
    window.gyApiGuardNote = function (tok) {
        if (!G.watch || G.killed || !(tok > 0)) return;
        const now = Date.now(), ms = (+G.winMin || 10) * 60000;
        win.push({ t: now, k: tok }); win = win.filter(x => now - x.t < ms);
        const sum = win.reduce((a, x) => a + x.k, 0);
        if (G.maxTok > 0 && sum > G.maxTok) { win = []; window.gyApiKill('最近 ' + G.winMin + ' 分钟用了约 ' + sum + ' token，超过阈值 ' + G.maxTok + '（怀疑被盗刷）', true); }
    };

    /* —— Token 用量页顶上的那条 —— */
    window.gyApiGuardBar = function () {
        if (G.killed) return `<div class="gyag gyag-off"><b>🔒 API 已紧急停用</b><div class="gyag-sub">${esc(G.reason)}</div><div class="gyag-sub">所有模型调用都被拦着。去服务商重置 key、填好新 key 后点下面解除。</div><button class="gyag-btn danger" onclick="gyApiUnkill()">解除停用</button></div>`;
        return `<div class="gyag"><div class="gyag-row"><b>🔒 API 保护</b><button class="gyag-btn danger" onclick="if(confirm('确定紧急停用？会拦下所有模型调用、关云同步、并尽力擦掉云端存的 key。'))gyApiKill()">🚨 一键紧急停用</button></div>
        <label class="gyag-ck"><input type="checkbox" ${G.watch ? 'checked' : ''} onchange="gyApiGuardSet('watch',this.checked);gyApiGuardRepaint()"> 用量异常自动暂停</label>
        ${G.watch ? `<div class="gyag-sub">最近 <input class="gyag-in" type="number" min="1" max="120" value="${G.winMin}" onchange="gyApiGuardSet('winMin',this.value)"> 分钟内，用量超过 <input class="gyag-in w" type="number" min="0" step="10000" value="${G.maxTok}" onchange="gyApiGuardSet('maxTok',this.value)"> token 就自动停（0 = 不限）。怀疑 key 泄露 / 被盗刷时能兜住。</div>` : ''}</div>`;
    };
    window.gyApiGuardRepaint = function () { try { if (typeof gyTokRepaint === 'function') gyTokRepaint('m'); } catch (e) {} try { if (typeof gyTokRepaint === 'function') gyTokRepaint('now'); } catch (e) {} };
    if (!document.getElementById('gyagCss')) { const st = document.createElement('style'); st.id = 'gyagCss'; st.textContent = `
        .gyag{border:1px solid rgba(249,24,128,.3);background:rgba(249,24,128,.06);border-radius:12px;padding:12px 14px;margin:4px 0 14px}
        .gyag-off{border-color:#e0245e;background:rgba(224,36,94,.1)}
        .gyag-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.gyag-row b{font-size:15px}
        .gyag b{font-weight:700}.gyag-sub{font-size:12.5px;color:#8b98a5;margin-top:6px;line-height:1.7}
        .gyag-ck{display:flex;align-items:center;gap:6px;font-size:13.5px;margin-top:10px;cursor:pointer}
        .gyag-in{width:64px;border:1px solid rgba(128,128,128,.4);border-radius:6px;padding:2px 6px;font:inherit;background:transparent;color:inherit}.gyag-in.w{width:96px}
        .gyag-btn{border:0;border-radius:8px;padding:7px 12px;font:inherit;font-weight:600;cursor:pointer;background:rgba(128,128,128,.15);color:inherit}
        .gyag-btn.danger{background:#e0245e;color:#fff}`; document.head.appendChild(st); }
})();
