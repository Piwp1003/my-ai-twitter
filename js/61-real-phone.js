/* 📲 真手机（内置版，自动生成，别手改这个文件）
   源码在 插件/软件/源码/60-真手机.js，改完在 插件/软件/源码/ 跑 python3 build.py 就会重新生成这里。
   内置了“新玩法公用层(GYX)”“软件公用层(GYS)”和真手机本体，不用再导入任何插件就能用。 */
;(function (applyMacros) {
/* ---- 新玩法插件的公用小工具（每个插件都带一份，谁先加载谁建好，后面的直接用） ---- */
if (!window.GYX) (function () {
    const X = {};
    // 🔋 插件体检 / 省电：记下每个插件开的定时器（靠每个插件末尾的 //# sourceURL=gyx-plugin/名字.js 认出是谁开的），省电模式下让它们跑慢一点
    try {
        if (!window.__gyxTimerWrap) {
            window.__gyxTimerWrap = 1; window.__gyxTimers = [];
            try { window.__gyxSaver = JSON.parse(localStorage.getItem('gyxSaver') || 'null') || { on: false, fac: 3, hid: 6, anim: true, auto: true }; } catch (e) { window.__gyxSaver = { on: false, fac: 3, hid: 6, anim: true, auto: true }; }
            const _si = window.setInterval.bind(window), _ci = window.clearInterval.bind(window);
            window.setInterval = function (fn, ms, ...a) {
                if (typeof fn !== 'function') return _si(fn, ms, ...a);
                let who = null; try { const m = String(new Error().stack || '').split('\n').slice(2).join('\n').match(/gyx-plugin\/([^:)\s]+?)\.js/); /* 跳过第一行（Error）和第二行（这个包装函数自己） */ if (m) { try { who = decodeURIComponent(m[1]); } catch (e) { who = m[1]; } } } catch (e) {}
                if (!who) return _si(fn, ms, ...a);
                const T = { who, ms: +ms || 0, runs: 0, cost: 0, last: 0, skip: 0, at: Date.now() };
                const w = function () { const sv = window.__gyxSaver; if (sv && sv.on) { const f = document.hidden ? +sv.hid || 1 : +sv.fac || 1; if (f > 1 && Date.now() - T.last < T.ms * f - 50) { T.skip++; return; } } T.last = Date.now(); const t0 = performance.now(); try { return fn.apply(this, a); } finally { T.cost += performance.now() - t0; T.runs++; } };
                const id = _si(w, ms); T.id = id; window.__gyxTimers.push(T); return id;
            };
            window.clearInterval = function (id) { const L = window.__gyxTimers || [], i = L.findIndex(t => t.id === id); if (i >= 0) L.splice(i, 1); return _ci(id); };
        }
    } catch (e) {}
    X.bailu = () => !!window.bailuCards;                                   // 白露：不接模型，用字卡
    X.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    X.pick = a => a[Math.floor(Math.random() * a.length)];
    X.rnd = (a, b) => a + Math.random() * (b - a);
    X.toast = (a, b) => { try { showToast('', a, b || '', null, null, false); } catch (e) {} };
    X.chars = () => (typeof myCharacters !== 'undefined' ? myCharacters : []).filter(c => c && !c.members);
    X.char = id => X.chars().find(c => String(c.id) === String(id));
    X.cur = () => { try { const s = typeof currentChatSessionId !== 'undefined' && currentChatSessionId; if (s && X.char(s)) return X.char(s); } catch (e) {} let best = null, bt = -1; X.chars().forEach(c => { const H = (typeof globalChats !== 'undefined' && globalChats[c.id]) || []; const t = H.length ? H[H.length - 1].timestamp || 0 : 0; if (t > bt) { bt = t; best = c; } }); return best; };
    X.name = c => c ? (c.remark || c.name || 'TA') : 'TA';
    X.me = c => { try { return typeof userDisplayName === 'function' && c ? userDisplayName(c) : ((typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '你'); } catch (e) { return '你'; } };
    X.day = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    X.plain = t => String(t || '').replace(/<[^>]+>/g, '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    X.persona = c => String((c && (c.persona || c.description)) || '').slice(0, 900);
    X.recent = (c, n) => ((typeof globalChats !== 'undefined' && c && globalChats[c.id]) || []).filter(m => m.sender !== 'system').slice(-(n || 16)).map(m => (m.sender === 'me' ? X.me(c) : X.name(c)) + '：' + X.plain(m.text).slice(0, 120)).join('\n');
    X.store = name => { try { (window.__gyxStoreNames = window.__gyxStoreNames || []).push('gyx_' + name); } catch (e) {} const lf = (typeof localforage !== 'undefined' && localforage.createInstance) ? localforage.createInstance({ name: 'gyx_' + name, storeName: 'kv' }) : null; return { get: async (k, d) => { try { const v = lf && await lf.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: async (k, v) => { try { if (lf) await lf.setItem(k, v); } catch (e) {} } }; };
    X.json = t => { try { const m = String(t || '').match(/\{[\s\S]*\}|\[[\s\S]*\]/); return m ? JSON.parse(m[0]) : null; } catch (e) { return null; } };
    // 问模型（谷雨）。白露没有模型：返回 null，由各插件自己从字卡里拼
    X.ask = async function (prompt, extra) {
        if (X.bailu()) return null;
        try {
            const api = typeof getApiConfig === 'function' ? getApiConfig(true) : null;
            if (!api || !api.url || typeof sendChatRequest !== 'function') return null;
            const d = await sendChatRequest(api, prompt, extra);
            return String((d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim() || null;
        } catch (e) { return null; }
    };
    X.who = c => `你是${X.name(c)}。${X.persona(c)}\n（你正在和${X.me(c)}谈恋爱，她是你最重要的人。）`;
    // 白露：从字卡里抽几句（没有这个类型就用聊天字卡）
    X.cards = (kinds, c, n) => { if (!window.bailuDraw) return []; for (const k of [].concat(kinds, '聊天')) { try { const r = window.bailuDraw(k, c, n || 1).filter(Boolean); if (r.length) return r; } catch (e) {} } return []; };
    // TA 主动来找你（带着由头）
    const NUDGE = {};
    X.reach = async (c, why) => { if (!c || typeof sendProactiveChatMessage !== 'function') return false; NUDGE[String(c.id)] = why; try { await sendProactiveChatMessage(c); return true; } catch (e) { return false; } finally { delete NUDGE[String(c.id)]; } };
    window.__gyxNudgeFor = id => NUDGE[String(id)] ? `【这次主动找她的由头】${NUDGE[String(id)]}。就为这个来找她，自然地说。` : '';
    const CTX = [];
    window.__gyxCtxFor = id => [window.__gyxNudgeFor(id)].concat(CTX.map(f => { try { return f(id) || ''; } catch (e) { return ''; } })).filter(Boolean).join('\n');
    // 记下每段【小标题】是哪个插件塞的，「注入内容管理 → 🎲 新玩法插件」那一页拿来标出处
    const HEADS = window.__gyxHeads = window.__gyxHeads || {};
    window.__gyxHeadOf = h => { const fid = HEADS[String(h || '').trim()]; const f = fid && X.FEATS.find(x => x.id === fid); return f ? String(f.n || fid).replace(/^\S+\s/, '') : ''; };
    X.ctx = (f, fid) => CTX.push(id => { if (fid && !X.on(fid)) return ''; const t = f(id); try { if (t && fid) String(t).replace(/【([^】]{1,90})】/g, (m, h) => { HEADS[h.trim()] = fid; return m; }); } catch (e) {} return t; });
    // 给自己那几段写上名字和说明：X.inj('gyxScoop', [['小标题开头', '列表里显示的名字', '说明']])
    X.inj = (fid, rows) => { const q = window.__gyxInjQ = window.__gyxInjQ || []; rows.forEach((r, i) => q.push(['gyx', { k: 'gyx.' + fid + '.' + i, label: r[1], head: r[0], desc: r[2] || '' }])); };
    // TA 直接发一条消息进聊天
    X.say = function (c, text, extra) {
        if (!c || typeof globalChats === 'undefined') return null;
        const sid = String(c.id); if (!globalChats[sid]) globalChats[sid] = [];
        const m = Object.assign({ sender: c.id, text: String(text), timestamp: Date.now(), readBy: [], gyx: 1 }, extra || {});
        globalChats[sid].push(m);
        try { saveAllData(); } catch (e) {}
        try { if (String(currentChatSessionId) === sid && typeof renderChatMessages === 'function') renderChatMessages(); } catch (e) {}
        try { if (typeof renderChatCharList === 'function') renderChatCharList(); } catch (e) {}
        return m;
    };
    X.notify = (c, text, desc, fn) => { try { addNotification(text, null, c ? c.id : null, c, desc || '', fn ? { jump: { fn } } : undefined); } catch (e) {} };
    X.speak = async (c, text, onEnd) => { try { if (window.gyVoiceSpeak) return await window.gyVoiceSpeak(c, text, { onEnd }); } catch (e) {} try { const u = new SpeechSynthesisUtterance(X.plain(text)); u.lang = 'zh-CN'; if (onEnd) u.onend = onEnd; speechSynthesis.speak(u); return 'browser'; } catch (e) { if (onEnd) onEnd(); return null; } };
    X.stopSpeak = () => { try { if (window.gyVoiceStop) window.gyVoiceStop(); } catch (e) {} try { speechSynthesis.cancel(); } catch (e) {} };
    // 功能开关：每个新功能都能单独关；「TA 自己会不会做」也能单独关（id + '.auto'）
    const FK = 'gyxFeat'; let FS = {}; try { FS = JSON.parse(localStorage.getItem(FK) || '{}') || {}; } catch (e) {}
    X.FEATS = window.__gyxFeats = window.__gyxFeats || [];
    X.feat = (id, def) => { if (!X.FEATS.some(f => f.id === id)) X.FEATS.push(Object.assign({ id, def: true, auto: true }, def)); };
    X.on = id => { const f = X.FEATS.find(x => x.id === id.replace(/\.auto$/, '')); const d = f ? (/\.auto$/.test(id) ? f.auto !== false : f.def !== false) : true; return FS[id] == null ? d : !!FS[id]; };
    X.set = (id, v) => { FS[id] = !!v; try { localStorage.setItem(FK, JSON.stringify(FS)); } catch (e) {} try { window.dispatchEvent(new CustomEvent('gyx:feat', { detail: { id, on: !!v } })); } catch (e) {} syncMini(); };
    // 🗓️ 回顾类的节奏（周报、我们的书、星图、TA 眼中的你、回忆放映、TA 写给你的歌……）：多久总结一次你自己定。
    //    每个插件 X.recapDef 登记自己能怎么调，X.recap(key) 读你选的；在「📚 回顾 → ⚙️ 多久总结一次」里改
    const RK = 'gyxRecap'; let RC = {}; try { RC = JSON.parse(localStorage.getItem(RK) || '{}') || {}; } catch (e) {}
    X.RECAP = window.__gyxRecapDefs = window.__gyxRecapDefs || [];
    X.recapDef = (key, def) => { if (!X.RECAP.some(d => d.key === key)) X.RECAP.push(Object.assign({ key }, def)); };
    X.recap = key => { const d = X.RECAP.find(x => x.key === key) || {}, c = RC[key] || {}; return { v: c.v != null ? c.v : d.def, auto: c.auto != null ? !!c.auto : d.autoDef !== false }; };
    X.recapSet = (key, k, v) => { RC[key] = Object.assign({}, RC[key], { [k]: v }); try { localStorage.setItem(RK, JSON.stringify(RC)); } catch (e) {} };
    const p2 = n => String(n).padStart(2, '0');
    X.UNITS = { half: '半个月', month: '一个月', season: '一个季度', year: '一年' };
    X.unitStart = (t, unit) => { const d = new Date(t); d.setHours(0, 0, 0, 0); if (unit === 'year') { d.setMonth(0, 1); } else if (unit === 'season') { d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1); } else if (unit === 'half') { d.setDate(d.getDate() <= 15 ? 1 : 16); } else d.setDate(1); return d.getTime(); };
    X.unitKey = (t, unit) => { const d = new Date(t), y = d.getFullYear(), m = d.getMonth() + 1; return unit === 'year' ? y + '' : unit === 'season' ? y + '-Q' + Math.ceil(m / 3) : unit === 'half' ? y + '-' + p2(m) + (d.getDate() <= 15 ? '上' : '下') : y + '-' + p2(m); };
    X.unitPrev = (t, unit) => X.unitKey(X.unitStart(t, unit) - 1, unit);
    // 弹窗文字不固定：给几种说法，随机挑一个
    X.v = (...a) => X.pick(a);
    X.auto = c => { try { return typeof getCharActMode === 'function' ? getCharActMode(c) === 'auto' : c.actMode === 'auto'; } catch (e) { return false; } };
    // 放进自主行动：功能关了、或者「TA 自己做」关了，TA 就不会选它
    X.action = (def, fid) => { try { if (typeof GY_AUTONOMY_ACTIONS === 'undefined' || GY_AUTONOMY_ACTIONS.some(a => a.key === def.key)) return; const need = def.need; def.need = c => (!fid || (X.on(fid) && X.on(fid + '.auto'))) && (!need || need(c)); GY_AUTONOMY_ACTIONS.push(def); } catch (e) {} };
    const MINIS = [];
    function syncMini() { try { if (typeof GY_MINI_FEATURES === 'undefined') return; MINIS.forEach(([d, fid]) => { const i = GY_MINI_FEATURES.findIndex(f => f.id === d.id); const on = !fid || X.on(fid); if (on && i < 0 && typeof registerMiniFeature === 'function') registerMiniFeature(d); if (!on && i >= 0) GY_MINI_FEATURES.splice(i, 1); }); } catch (e) {} }
    X.mini = (def, fid) => { MINIS.push([def, fid || def.id]); syncMini(); };
    // 小手机桌面小组件：手机页还没加载好就等一会儿再登记；功能关了小组件显示「关着」而不是报错
    const WQ = [];
    function wFlush() { const W = window.__gyPmW; if (!W || !W.WD) return false; WQ.splice(0).forEach(([k, def, fid]) => { if (W.WD[k]) return; const r = def.r, tap = def.tap; if (fid) { def.r = w => X.on(fid) ? r(w) : `<div class="gw-x s"><b>💤</b><em>${X.esc(def.n)}（关着）</em></div>`; if (tap) def.tap = w => X.on(fid) ? tap(w) : (window.gyxSwitchOpen ? window.gyxSwitchOpen() : 0); } W.WD[k] = def; }); return true; }
    let wTimer = null;
    X.widget = (k, def, fid) => { WQ.push([k, def, fid]); if (wFlush() || wTimer) return; let n = 0; wTimer = setInterval(() => { if (wFlush() || ++n > 120) { clearInterval(wTimer); wTimer = null; } }, 500); };
    // 记忆总览：插件记下的东西登记进「记忆总览 → 🧩 其它记忆」，能改能删（功能关了这一节就不显示）
    X.mem = (def, fid) => { const reg = () => { if (typeof window.gyMemExAdd !== 'function') return false; window.gyMemExAdd(Object.assign({ on: () => !fid || X.on(fid) }, def)); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 80) clearInterval(iv); }, 500); } };
    // 常见情况：一个数组里每条带 cid —— 按角色筛出来
    X.memArr = (o, fid) => { const items = c => (o.arr() || []).filter(x => x && String(o.cid ? o.cid(x) : x.cid) === String(c.id)); X.mem({ k: o.k, ico: o.ico, n: o.n, d: o.d, items, text: x => String(o.text(x) || ''), meta: o.meta || (x => x.at ? new Date(x.at).toLocaleString() : ''), edit: (x, v) => { if (o.edit) o.edit(x, v); else x[o.field] = v; }, del: (c, i) => { const it = items(c)[i], A = o.arr(), j = A.indexOf(it); if (j >= 0) A.splice(j, 1); }, save: async () => { await o.save(); } }, fid); };
    // 通用小组件外观：大图标 + 标题 + 几行字（小号只显示图标和第一行）
    X.gw = (w, icon, title, lines) => { lines = (lines || []).filter(Boolean); return w.size === 's' ? `<div class="gw-x s"><b>${icon}</b><em>${lines[0] != null ? lines[0] : X.esc(title)}</em></div>` : `<div class="gw-x m"><div class="h"><b>${icon}</b><span>${X.esc(title)}</span></div>${lines.slice(0, 3).map(l => `<em>${l}</em>`).join('') || '<em>还没有内容</em>'}</div>`; };
    X.repaint = () => { try { const W = window.__gyPmW; if (W && W.render && document.body.classList.contains('gyphm') && !document.body.classList.contains('gyphm-app') && !document.querySelector('#gyPmHome .pm-lock')) W.render(); } catch (e) {} };
    X.whoSel = (sel, on) => `<select class="gyx-who" onchange="${on}(this.value)">${X.chars().map(c => `<option value="${X.esc(c.id)}"${String(c.id) === String(sel) ? ' selected' : ''}>${X.esc(X.name(c))}</option>`).join('')}</select>`;
    // 「今天」面板：每个插件往里加一小节（功能关了就不出现）
    const TODAY = [];
    X.today = (fn, fid) => { TODAY.push([fn, fid]); X.todayHook(); };
    X.todayHtml = function () {
        let h = '';
        TODAY.forEach(([fn, fid]) => {
            if (fid && !X.on(fid)) return;
            let r = null; try { r = fn(); } catch (e) {}
            if (!r || !r.rows || !r.rows.length) return;
            h += `<div class="gyt-sec gyx-tsec"><h4>${r.title}</h4>` + r.rows.map(w => `<div class="gyt-row${w.go ? ' click' : ''}"${w.go ? ` onclick="${w.go}"` : ''}><span class="gyt-t">${X.esc(w.t || '')}</span><span class="gyt-x">${w.x || ''}</span></div>`).join('') + '</div>';
        });
        return h;
    };
    X.todayPaint = function () { ['gyToday', 'gyTodayM'].forEach(id => { const b = document.getElementById(id); if (!b) return; b.querySelectorAll('.gyx-tsec').forEach(n => n.remove()); const h = X.todayHtml(); if (h) b.insertAdjacentHTML('beforeend', h); }); };
    X.todayHook = function () {
        const f = window.gyTodayRender; if (typeof f !== 'function' || f.__gyx) return;
        const w = function () { const r = f.apply(this, arguments); try { X.todayPaint(); } catch (e) {} return r; };
        Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__gyx = true; window.gyTodayRender = w;
    };
    setInterval(() => { X.todayHook(); }, 3000);
    // 统一的弹窗（小手机风格）
    X.panel = function (id, title, html, cls) {
        // 🧩 正在「合集」里打开（js/79）：直接画在合集的标签下面，不另弹一层
        let host = null; try { host = typeof window.gyHubHost === 'function' ? window.gyHubHost(id, title) : null; } catch (e) {}
        if (host) {
            const old = document.getElementById(id); if (old) old.remove();
            const el =document.createElement('div'); el.id = id; el.className = 'gyx-inhub ' + (cls || ''); el.setAttribute('data-gy-nopage', '1');
            el.innerHTML = `<div class="gyx-box"><div class="gyx-bd">${html}</div></div>`;
            host.appendChild(el); return el;
        }
        let ov = document.getElementById(id); if (ov) ov.remove();
        ov = document.createElement('div'); ov.id = id; ov.className = 'gyx-ov ' + (cls || '');
        ov.innerHTML = `<div class="gyx-box"><div class="gyx-hd"><b>${title}</b><span class="gyx-x" onclick="document.getElementById('${id}').remove()">✕</span></div><div class="gyx-bd">${html}</div></div>`;
        ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
        document.body.appendChild(ov); return ov;
    };
    X.css = (id, t) => { if (document.getElementById(id)) return; const s = document.createElement('style'); s.id = id; s.textContent = t; document.head.appendChild(s); };
    X.css('gyxBaseCss', `
.gyx-ov{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.32);display:flex;align-items:center;justify-content:center;padding:14px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Microsoft YaHei",sans-serif}
.gyx-box{background:#fff;color:#1d1d1f;border-radius:22px;width:min(560px,100%);max-height:92vh;overflow:auto;box-sizing:border-box;box-shadow:0 24px 60px rgba(0,0,0,.2)}
.gyx-hd{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;background:rgba(255,255,255,.9);backdrop-filter:blur(12px);font-size:17px}.gyx-x{cursor:pointer;color:#999;padding:2px 6px}
.gyx-bd{padding:4px 18px 18px}
.gw-x{height:100%;display:flex;flex-direction:column;justify-content:center;gap:3px;overflow:hidden}.gw-x.s{align-items:center;text-align:center}.gw-x.s b{font-size:30px;font-weight:normal;line-height:1.1}.gw-x .h{display:flex;align-items:center;gap:6px;margin-bottom:2px}.gw-x .h b{font-size:20px;font-weight:normal}.gw-x .h span{font-weight:600;font-size:13.5px}.gw-x em{font-style:normal;font-size:12px;color:var(--pm-sub,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.gyx-btn{padding:9px 16px;border-radius:14px;border:none;background:#1d1d1f;color:#fff;cursor:pointer;font-family:inherit;font-size:14px}.gyx-btn.lite{background:#f2f2f4;color:#1d1d1f}.gyx-btn:disabled{opacity:.4}
.gyx-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}.gyx-tip{font-size:12.5px;color:#8e8e93;line-height:1.7;margin:6px 0}
.gyx-who,.gyx-in{padding:8px 10px;border-radius:12px;border:1px solid #e5e5ea;background:#fafafa;font-family:inherit;font-size:14px;box-sizing:border-box}.gyx-in{width:100%}
textarea.gyx-in{resize:vertical;line-height:1.7}
.gyx-card{background:#f7f7f9;border-radius:16px;padding:12px 14px;margin:8px 0}
.gyx-chip{display:inline-block;padding:5px 11px;border-radius:999px;background:#f2f2f4;font-size:13px;cursor:pointer;margin:2px}.gyx-chip.on{background:#1d1d1f;color:#fff}
.gyx-hand{font-family:"Ma Shan Zheng","Zhi Mang Xing","Long Cang","Xingkai SC","STXingkai","华文行楷","KaiTi","STKaiti","楷体",cursive}
.gyx-ov.dark .gyx-box{background:#1c1c1e;color:#f5f5f7}.gyx-inhub>.gyx-box>.gyx-bd{padding:2px 18px 18px}.gyx-inhub.dark{background:#1c1c1e;color:#f5f5f7;border-radius:0 0 22px 22px}.gyx-ov.dark .gyx-hd{background:rgba(28,28,30,.9)}
`);
    // 手写字体（联网时加载，不联网就用系统里的楷体/行楷）
    if (!document.getElementById('gyxFont')) { const l = document.createElement('link'); l.id = 'gyxFont'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Long+Cang&display=swap'; document.head.appendChild(l); }
    // 把上面的由头 / 各插件的注入挂进提示词
    const hook = () => { try { if (typeof GY_BOX_CTX !== 'undefined' && !GY_BOX_CTX.some(x => x[0] === '__gyxCtxFor')) GY_BOX_CTX.push(['__gyxCtxFor', '新玩法插件']); } catch (e) {} };
    hook(); setInterval(hook, 3000);
    window.GYX = X;
})();
const X = window.GYX;
// 老版本插件先建好的 GYX 里可能没有后来加的这几个小工具：缺什么补什么，免得新插件一用就报错
if (!X.inj) X.inj = (fid, rows) => { const q = window.__gyxInjQ = window.__gyxInjQ || []; rows.forEach((r, i) => q.push(['gyx', { k: 'gyx.' + fid + '.' + i, label: r[1], head: r[0], desc: r[2] || '' }])); };
// 内置提示词：X.pl(id, 默认, 变量) 取（你改过就用你改的）；X.plGroup 把这一组登记到「设置 → 内置提示词」
if (!X.pl) X.pl = (id, def, vars) => { try { if (typeof gyPL === 'function') return gyPL(id, def, vars); } catch (e) {} let t = def; Object.keys(vars || {}).forEach(k => { t = t.split('{{' + k + '}}').join(vars[k] == null ? '' : String(vars[k])); }); return t; };
if (!X.plGroup) X.plGroup = (g, plug, items, defs) => { try { Object.keys(defs || {}).forEach(id => X.pl(id, defs[id])); } catch (e) {} const f = () => { if (typeof window.gyPLGroupAdd !== 'function') return false; window.gyPLGroupAdd({ g, plug, items }); return true; }; if (!f()) { let n = 0; const iv = setInterval(() => { if (f() || ++n > 40) clearInterval(iv); }, 500); } };
// 包一层全局函数（聊天发送、侧滑重新生成……）：别人后来再包也不会丢；同一个 tag 只包一次
if (!X.wrapFn) X.wrapFn = (name, tag, before, after) => { const W = window.__gyxWrapDone = window.__gyxWrapDone || {}; const go = () => { const f = window[name]; if (typeof f !== 'function') return false; if (W[name + '|' + tag] || f['__gyxW_' + tag]) return true; W[name + '|' + tag] = 1; const w = function () { let ctx; try { ctx = before ? before.apply(this, arguments) : null; } catch (e) {} const r = f.apply(this, arguments); if (after) { try { if (r && typeof r.then === 'function') r.then(v => { try { after(ctx, v); } catch (e) {} }, () => { try { after(ctx); } catch (e) {} }); else after(ctx, r); } catch (e) {} } return r; }; Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w['__gyxW_' + tag] = true; window[name] = w; try { (0, eval)(name + ' = window.' + name); } catch (e) {} return true; }; if (!go()) { let n = 0; const iv = setInterval(() => { if (go() || ++n > 100) clearInterval(iv); }, 1000); } };

// 🔔 通知点了要能跳过去（v2）：
//   以前插件把「点了去哪」写成一个函数塞进通知，可通知那边只认「函数的名字」，点弹窗 / 通知页全都跳不过去；刷新以后函数还会丢。
//   现在统一成 X.go('打开函数名', 参数…) —— 存的是名字和参数，刷新也还在；老写法（直接给函数）也认：先按原样调用，刷新后按名字兜底。
//   插件的自主行动自己弹过通知的，就不再让 js/60 用「去 TA 主页」再弹一条。
if ((X.__notifyV || 0) < 2) {
    X.__notifyV = 2;
    const REF = window.__gyJumpRef = window.__gyJumpRef || {};
    X.go = (fn, ...args) => ({ fn: String(fn), args: args.map(a => a == null ? a : (typeof a === 'object' ? a : (typeof a === 'number' || typeof a === 'boolean' ? a : String(a)))) });
    X.jumpOf = (to, c) => {
        if (!to) return c ? { chat: String(c.id) } : null;
        if (typeof to === 'string') return { fn: to, args: [] };
        if (typeof to === 'function') {
            const ref = 'jr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); REF[ref] = to;
            const m = String(to).match(/window\.(\w+)\s*\(/) || String(to).match(/\b(gy\w*Open\w*|gy\w*Go|gy\w*Play)\s*\(/);
            return Object.assign({ ref }, m ? { fn: m[1], args: [] } : (c ? { chat: String(c.id) } : {}));
        }
        if (typeof to === 'object') return to;
        return null;
    };
    const LASTN = window.__gyxLastNotify = window.__gyxLastNotify || {};
    X.notify = (c, text, desc, to) => { try { LASTN[c ? String(c.id) : '_'] = Date.now(); LASTN._any = Date.now(); const j = X.jumpOf(to, c); addNotification(text, null, c ? c.id : null, c, desc || '', j ? { jump: j } : undefined); } catch (e) {} };
    const _act = X.action;
    X.action = (def, fid) => {
        if (def && typeof def.run === 'function' && !def.__gyxNR) {
            const run = def.run; def.__gyxNR = 1;
            def.run = async function (c) {
                const t0 = Date.now(); const r = await run.apply(this, arguments);
                if (r == null || r === false) return r;
                const mine = (LASTN[c ? String(c.id) : '_'] || 0) >= t0 || (LASTN._ || 0) >= t0;
                if (typeof r === 'object') { if (mine && r.selfNotified == null) r.selfNotified = true; if (!r.jump && def.jump) { try { r.jump = X.jumpOf(def.jump(c), c); } catch (e) {} } return r; }
                if (typeof r !== 'string') return r;
                if (mine) return { text: r, selfNotified: true };
                let j = null; try { j = def.jump ? X.jumpOf(def.jump(c), c) : null; } catch (e) {}
                return { text: r, jump: j || (c ? { chat: String(c.id) } : null) };
            };
        }
        return _act(def, fid);
    };
}


/* ---- 📱 软件合集的公用层（微博、泡泡、豆瓣、小红书、iMessage 共用；谁先加载谁建好） ----
   · 人：你（'me'）、角色（'c:id'）、NPC 列表里的人（'n:id'）、各软件自己的账号（bot / 小号 / 路人，'x:...'）
   · 同一个人在不同软件里是不同的主页（昵称、头像、简介、粉丝数都可以不一样，像真人一样），
     主页上可以挂「我在别的软件的账号」。头像 / 背景能换能裁剪，文字都能改。
   · 整页的 App 外壳：每个软件一个全屏的壳，里面一页一页往里推（‹ 返回）。 */
if (!window.GYS) (function () {
    const S = {};
    const store = X.store('soft');
    let D = { prof: {}, seq: 1 };   // prof[app][who] = 主页
    let ready = false; const waits = [];
    (async () => { D = Object.assign(D, await store.get('d', {})); D.prof = D.prof || {}; ready = true; waits.splice(0).forEach(f => f()); })();
    S.ready = () => ready ? Promise.resolve() : new Promise(r => waits.push(r));
    let saveT = null;
    S.save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set('d', D), 300); };
    S.saveNow = () => store.set('d', D);
    S.APPS = { wechat: { n: '微信', ico: '💚', feat: 'gysWechat' }, imsg: { n: 'iMessage', ico: '💬', feat: 'gysImsg' }, weibo: { n: '微博', ico: '🧣', feat: 'gysWeibo' }, bubble: { n: '泡泡', ico: '🫧', feat: 'gysBubble' }, red: { n: '小红书', ico: '📕', feat: 'gysRed' }, douban: { n: '豆瓣', ico: '🫘', feat: 'gysDouban' }, music: { n: '网易云音乐', ico: '🎵', feat: 'gysMusic' }, douyin: { n: '抖音', ico: '🎶', feat: 'gysDouyin' } };
    S.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    S.uid = p => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    S.pick = a => a[Math.floor(Math.random() * a.length)];
    S.rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    S.fmtN = n => { n = Number(n) || 0; if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '亿'; if (n >= 1e4) return (n / 1e4).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + '万'; return String(n); };
    S.ago = t => {
        const d = Date.now() - t; if (d < 60e3) return '刚刚'; if (d < 3600e3) return Math.floor(d / 60e3) + '分钟前'; if (d < 86400e3) return Math.floor(d / 3600e3) + '小时前';
        const a = new Date(t), n = new Date(); if (d < 2 * 86400e3 && a.getDate() !== n.getDate()) return '昨天 ' + String(a.getHours()).padStart(2, '0') + ':' + String(a.getMinutes()).padStart(2, '0');
        return (a.getFullYear() === n.getFullYear() ? '' : a.getFullYear() + '-') + (a.getMonth() + 1) + '-' + a.getDate();
    };
    S.hm = t => { const a = new Date(t); return String(a.getHours()).padStart(2, '0') + ':' + String(a.getMinutes()).padStart(2, '0'); };

    /* ---------- 人 ---------- */
    const chars = () => (typeof myCharacters !== 'undefined' ? myCharacters : []);
    const npcs = () => (typeof window.gyNpcAll === 'function' ? window.gyNpcAll() : []).filter(n => n.on !== false);
    S.chars = chars; S.npcs = npcs;
    S.meName = () => (typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '我';
    // 这个人原本是谁（不管在哪个软件）
    S.base = who => {
        who = String(who || '');
        if (who === 'me') { const u = (typeof currentUser !== 'undefined' && currentUser) || {}; return { who, kind: 'me', name: u.name || '我', avatarImg: u.avatarImg || '', emoji: u.avatarEmoji || '我', persona: u.persona || u.bio || '', color: u.themeColor || '#1d9bf0', obj: u }; }
        if (who.startsWith('c:')) { const c = chars().find(x => String(x.id) === who.slice(2)); return c ? { who, kind: 'char', name: c.name, avatarImg: c.avatarImg || '', emoji: c.avatarEmoji || c.name[0], persona: c.persona || '', color: c.themeColor || '#1d9bf0', obj: c, loc: c.location || '' } : null; }
        if (who.startsWith('n:')) { const n = (typeof window.gyNpcById === 'function' && window.gyNpcById(who.slice(2))) || null; return n ? { who, kind: 'npc', name: n.name, avatarImg: n.avatarImg || '', emoji: n.ico || '👤', persona: [n.who, n.persona, n.tie].filter(Boolean).join('；'), color: '#8b98a5', obj: n, tone: n.tone || '' } : null; }
        return null;   // 软件自己的账号（bot、小号、路人）由各软件管
    };
    S.whoOfChar = c => 'c:' + (c && c.id != null ? c.id : c);
    S.charOf = who => { const b = S.base(who); return b && b.kind === 'char' ? b.obj : null; };
    // 能出现在这个软件里的人：你、角色、NPC（开着的）
    S.people = () => ['me'].concat(chars().map(c => 'c:' + c.id), npcs().map(n => 'n:' + n.id));

    /* ---------- 每个软件里的主页 ---------- */
    // p = { who, nick, handle, avatar, bg, bio, gender, loc, verify:{t:'', text:''}, vip, followers, following, likes, links:{app: handle}, showLinks, tags:[], gen }
    S.prof = (app, who, def) => {
        const A = D.prof[app] = D.prof[app] || {};
        if (A[who]) return A[who];
        const b = S.base(who);
        const p = Object.assign({ who, nick: b ? b.name : '用户' + S.rnd(1000, 9999), handle: '', avatar: '', bg: '', bio: '', gender: '', loc: '', verify: { t: '', text: '' }, vip: 0, followers: b && b.kind === 'char' ? S.rnd(800, 30000) : b && b.kind === 'npc' ? S.rnd(50, 3000) : S.rnd(30, 400), following: S.rnd(40, 600), likes: 0, links: {}, showLinks: true, tags: [], gen: false, at: Date.now() }, def || {});
        A[who] = p; S.save();
        return p;
    };
    S.hasProf = (app, who) => !!(D.prof[app] && D.prof[app][who]);
    S.profs = app => Object.values(D.prof[app] || {});
    S.setProf = (app, who, patch) => { const p = S.prof(app, who); Object.assign(p, patch || {}); S.save(); return p; };
    S.delProf = (app, who) => { if (D.prof[app]) delete D.prof[app][who]; S.save(); };
    S.nick = (app, who) => { const p = S.prof(app, who); return p.nick || (S.base(who) || {}).name || '用户'; };
    // 头像：主页自己换过就用主页的；没换过跟着本人（角色 / NPC 的头像）
    S.avSrc = (app, who) => { const p = S.prof(app, who); if (p.avatar) return p.avatar; const b = S.base(who); return b ? b.avatarImg || '' : ''; };
    S.av = (app, who, size, cls) => {
        const src = S.avSrc(app, who), p = S.prof(app, who), b = S.base(who);
        const sz = size || 40;
        if (src) return `<span class="gys-av ${cls || ''}" style="width:${sz}px;height:${sz}px;background-image:url('${src}')"></span>`;
        const t = (p.emoji || (b && b.emoji) || String(p.nick || '?')[0]);
        return `<span class="gys-av e ${cls || ''}" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz * 0.45)}px;background:${(b && b.color) || p.color || '#c7c7cc'}">${S.esc(t)}</span>`;
    };
    // 别的软件里的账号（挂在主页上）
    S.linksOf = (app, who) => {
        const p = S.prof(app, who); if (p.showLinks === false) return [];
        const out = [];
        Object.keys(S.APPS).forEach(k => { if (k === app) return; const h = (p.links || {})[k] || (S.hasProf(k, who) && S.prof(k, who).linkOut ? S.prof(k, who).handle || S.prof(k, who).nick : ''); if (h) out.push([k, h]); });
        return out;
    };
    // 让模型给一批人写这个软件里的主页（活人感：昵称、签名、认证、粉丝量级都按人设来，可以跟别的软件不一样）
    S.genProfiles = async (app, whos, style) => {
        whos = whos.filter(w => S.base(w) && !S.prof(app, w).gen).slice(0, 8);
        if (!whos.length || X.bailu()) return 0;
        const others = w => Object.keys(S.APPS).filter(k => k !== app && S.hasProf(k, w)).map(k => `${S.APPS[k].n}昵称「${S.prof(k, w).nick}」`).join('，');
        const list = whos.map((w, i) => { const b = S.base(w); return `${i}. ${b.kind === 'me' ? '（用户本人）' : b.kind === 'char' ? '（主要角色）' : '（配角）'}${b.name}：${String(b.persona).slice(0, 260)}${others(w) ? '｜已有：' + others(w) : ''}`; }).join('\n');
        const o = X.json(await X.ask(`下面这些人都在用「${S.APPS[app].n}」。请按每个人的性格、身份、年龄感，替 TA 写这个软件里的个人主页——要像真人在用：
- 昵称不一定是真名（可以是网名、谐音梗、英文、表情、跟别的软件不一样）
- 简介按 TA 的性格写，可以很短、很敷衍、很中二、挂别的软件的账号、写工作室联系方式……
- 认证：明星 / 博主 / 机构才有，普通人没有
- 粉丝数按身份给，普通人几十到几百
${style || ''}
${list}
只输出 JSON 数组，顺序对应：[{"nick":"昵称","handle":"英文或数字的账号id","bio":"简介","verify":"认证文字（没有就空）","vt":"yellow|blue|gold|空","followers":数字,"following":数字,"gender":"男|女|空","loc":"IP属地省份","tags":["标签"],"link":"挂在简介里的别的软件账号（没有就空）"}]`));
        if (!Array.isArray(o)) return 0;
        let n = 0;
        o.forEach((x, i) => { const w = whos[i]; if (!w || !x) return; const p = S.prof(app, w); Object.assign(p, { nick: X.plain(x.nick || p.nick).slice(0, 20) || p.nick, handle: String(x.handle || '').replace(/[^\w.-]/g, '').slice(0, 20), bio: X.plain(x.bio || '').slice(0, 80), verify: { t: /yellow|blue|gold/.test(x.vt) && x.verify ? x.vt : '', text: X.plain(x.verify || '').slice(0, 30) }, followers: Math.max(0, Number(x.followers) || p.followers), following: Math.max(0, Number(x.following) || p.following), gender: x.gender === '男' || x.gender === '女' ? x.gender : '', loc: X.plain(x.loc || '').slice(0, 8), tags: Array.isArray(x.tags) ? x.tags.slice(0, 4).map(t => X.plain(t).slice(0, 8)) : [], gen: true }); if (x.link) p.bio = p.bio || X.plain(x.link); n++; });
        S.save(); return n;
    };

    /* ---------- 图片：选图 → 裁剪 ---------- */
    S.pickImg = (aspect, cb) => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; if (typeof handleImageCrop === 'function') handleImageCrop(f, aspect || 1, cb); else { const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(f); } };
        inp.click();
    };
    S.pickImgs = (max, cb) => {   // 发微博的配图：不裁剪，缩到 1080 宽
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
        inp.onchange = async () => {
            const fs = Array.from(inp.files || []).slice(0, max || 9), out = [];
            for (const f of fs) out.push(await new Promise(res => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1080 / im.width); const cv = document.createElement('canvas'); cv.width = im.width * k; cv.height = im.height * k; cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', 0.82)); }; im.onerror = () => res(null); im.src = r.result; }; r.readAsDataURL(f); }));
            cb(out.filter(Boolean));
        };
        inp.click();
    };

    /* ---------- 整页 App 外壳 ---------- */
    // 一个软件一个壳：S.app(appKey, {theme, tabs:[[key,ico,name]], tab: fn(key)->html, onTab})
    const SHELL = {};
    S.app = (key, def) => { SHELL[key] = Object.assign({ stack: [], tab: def.tabs ? def.tabs[0][0] : null }, def); };
    function root(key) {
        let r = document.getElementById('gys_' + key);
        if (!r) { const bd = document.createElement('div'); bd.id = 'gysbd_' + key; bd.className = 'gys-bd'; bd.onclick = () => S.close(key); document.body.appendChild(bd); r = document.createElement('div'); r.id = 'gys_' + key; r.className = 'gys-root gys-' + key; r.setAttribute('data-gy-overlay', '1'); r.setAttribute('data-gy-nopage', '1'); document.body.appendChild(r); }
        return r;
    }
    const bodyFlag = () => document.body.classList.toggle('gys-on', !!document.querySelector('.gys-root.on'));
    S.open = (key, tab) => { const A = SHELL[key]; if (!A) return; A.stack.splice(0).reverse().forEach(leave); if (tab) A.tab = tab; document.querySelectorAll('.gys-root.on').forEach(x => { x.style.zIndex = ''; }); root(key).style.zIndex = '2701'; root(key).classList.add('on'); bodyFlag(); S.paint(key); S.lockShow(key); if (A.onOpen) try { A.onOpen(); } catch (e) {} };
    S.close = key => { const A0 = SHELL[key]; if (A0) A0.stack.slice().reverse().forEach(leave); const r = document.getElementById('gys_' + key); if (r) r.classList.remove('on'); const bd = document.getElementById('gysbd_' + key); if (bd) bd.classList.remove('on'); bodyFlag(); };
    // 系统返回键 / 左滑返回（js/73 会把最上面的浮层整个拿掉）：里面还有页面就只退一页，退到底才真的关
    try {
        new MutationObserver(ms => ms.forEach(m => m.removedNodes.forEach(n => {
            if (!n.classList || !n.classList.contains('gys-root') || !n.classList.contains('on')) return;
            const key = n.id.replace(/^gys_/, ''), A = SHELL[key];
            if (A && A.stack.length) { document.body.appendChild(n); S.back(key); }
            else { n.classList.remove('on'); bodyFlag(); }
        }))).observe(document.body, { childList: true });
    } catch (e) {}
    S.isOpen = key => { const r = document.getElementById('gys_' + key); return !!(r && r.classList.contains('on')); };
    // 往里推一页：view = {title, html: fn|str, right: html, cls, back}
    S.push = (key, view) => { const A = SHELL[key]; A.stack.push(view); S.__anim = key; S.paint(key); const b = root(key).querySelector('.gys-body'); if (b) b.scrollTop = 0; };
    S.replace = (key, view) => { const A = SHELL[key]; if (A.stack.length) A.stack[A.stack.length - 1] = view; else A.stack.push(view); S.paint(key); };
    const leave = v => { if (v && typeof v.onLeave === 'function' && !v.__left) { v.__left = 1; try { v.onLeave(); } catch (e) {} } };   // 页面被退掉时（草稿箱用）
    S.__leave = leave;
    S.back = key => { const A = SHELL[key]; if (A.stack.length) { leave(A.stack.pop()); S.__anim = key + '<'; S.paint(key); } else S.close(key); };
    S.tab = (key, t) => { const A = SHELL[key]; A.tab = t; A.stack.splice(0).reverse().forEach(leave); S.paint(key); const b = root(key).querySelector('.gys-body'); if (b) b.scrollTop = 0; };
    S.top = key => { const A = SHELL[key]; return A && A.stack.length ? A.stack[A.stack.length - 1] : null; };
    S.paint = key => {
        const A = SHELL[key]; if (!A) return; const r = root(key); if (!r.classList.contains('on')) return;
        const v = A.stack[A.stack.length - 1];
        const keepScroll = r.querySelector('.gys-body'); const st = keepScroll && r.__last === (v ? v.id || v.title : A.tab) ? keepScroll.scrollTop : 0;
        let head, body, foot = '';
        if (v) {
            head = `<div class="gys-hd"><span class="gys-bk" onclick="GYS.back('${key}')">${S.ic('back', 22)}</span><b>${v.title || ''}</b><span class="gys-hr">${v.right || ''}</span></div>`;
            body = typeof v.html === 'function' ? v.html() : v.html;
            if (v.foot) foot = typeof v.foot === 'function' ? v.foot() : v.foot;
        } else {
            head = A.head ? A.head(A.tab) : `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('${key}')">${S.ic('back', 22)}</span><b>${S.APPS[key] ? S.APPS[key].n : key}</b></div>`;
            body = A.render(A.tab);
            if (A.tabs) foot = `<div class="gys-tabs">${A.tabs.map(([k, ico, n, badge]) => `<span class="gys-tb${A.tab === k ? ' on' : ''}" onclick="GYS.tab('${key}','${k}')"><i>${String(ico).startsWith('i:') ? S.ic(ico.slice(2), 25, A.tab === k && ico !== 'i:plus') : ico}</i><em>${n}</em>${badge && badge() ? `<sup>${badge()}</sup>` : ''}</span>`).join('')}</div>`;
        }
        r.classList.toggle('framed', S.framed()); r.classList.toggle('sbon', S.sbOn());
        const bd = document.getElementById('gysbd_' + key); if (bd) bd.classList.toggle('on', S.framed());
        r.innerHTML = (S.sbOn() ? S.sbHtml() : '') + head + `<div class="gys-body${v && v.cls ? ' ' + v.cls : ''}${S.__anim === key && S.ui.anim ? ' gys-pushin' : S.__anim === key + '<' && S.ui.anim ? ' gys-popin' : ''}">${body}</div>` + foot + (S.framed() ? '<i class="gys-homebar"></i>' : '');
        S.__anim = null; swipe(r, key);
        const nb = r.querySelector('.gys-body'); if (nb && st) nb.scrollTop = st;
        r.__last = v ? v.id || v.title : A.tab;
        if (v && v.after) try { v.after(r); } catch (e) {} else if (!v && A.after) try { A.after(r); } catch (e) {}
    };
    S.repaint = key => { if (S.isOpen(key)) S.paint(key); };

    /* ---------- 改主页（每个软件通用） ---------- */
    // fields：额外的字段 [[键, 名字, 占位, 多行?]]
    S.editProf = (app, who, fields, done) => {
        const p = S.prof(app, who), V = { avatar: p.avatar, bg: p.bg };
        const f = (k, label, ph, v, area) => `<label class="gys-f"><span>${label}</span>${area ? `<textarea id="gysE_${k}" rows="3" placeholder="${S.esc(ph)}">${S.esc(v || '')}</textarea>` : `<input id="gysE_${k}" placeholder="${S.esc(ph)}" value="${S.esc(v || '')}">`}</label>`;
        const draw = () => `
          <div class="gys-ecover" style="${V.bg ? `background-image:url('${V.bg}')` : ''}" onclick="GYS.__ePick('bg')"><span>🖼️ ${V.bg ? '换背景' : '加背景'}（能裁剪）</span></div>
          <div class="gys-eav" onclick="GYS.__ePick('avatar')">${V.avatar ? `<span class="gys-av" style="width:80px;height:80px;background-image:url('${V.avatar}')"></span>` : S.av(app, who, 80)}<i>📷</i></div>
          <div class="gys-eops">${V.avatar ? '<span onclick="GYS.__eClr(\'avatar\')">头像用回本人的</span>' : ''}${V.bg ? '<span onclick="GYS.__eClr(\'bg\')">去掉背景</span>' : ''}</div>
          ${f('nick', '昵称', '在这个软件里叫什么', p.nick)}
          ${f('handle', '账号 ID', '英文或数字', p.handle)}
          ${f('bio', '简介', '一句话介绍自己', p.bio, true)}
          ${f('loc', 'IP 属地 / 所在地', '比如：上海', p.loc)}
          ${f('gender', '性别', '男 / 女 / 不填', p.gender)}
          <div class="gys-2">${f('followers', '粉丝数', '数字', p.followers)}${f('following', '关注数', '数字', p.following)}</div>
          <div class="gys-2">${f('verify', '认证文字', '比如：知名美食博主（没有就空）', p.verify && p.verify.text)}
            <label class="gys-f"><span>认证颜色</span><select id="gysE_vt">${[['', '没有'], ['yellow', '黄 V（个人）'], ['blue', '蓝 V（机构）'], ['gold', '金 V（大 V）']].map(([v, n]) => `<option value="${v}" ${(p.verify && p.verify.t) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
          ${(fields || []).map(([k, l, ph, area]) => f(k, l, ph, p[k], area)).join('')}
          <div class="gys-f"><span>挂在主页上的别的软件账号</span>
            ${Object.keys(S.APPS).filter(k => k !== app).map(k => `<label class="gys-link"><b>${S.APPS[k].ico} ${S.APPS[k].n}</b><input id="gysE_link_${k}" placeholder="${S.hasProf(k, who) ? '比如：' + S.esc(S.prof(k, who).nick) : '没有就空'}" value="${S.esc((p.links || {})[k] || '')}"></label>`).join('')}
            <label class="gys-ck"><input type="checkbox" id="gysE_showLinks" ${p.showLinks === false ? '' : 'checked'}> 在主页上显示这些</label></div>
          <div class="gys-acts"><button class="gys-btn" onclick="GYS.__eSave()">保存</button><button class="gys-btn ghost" onclick="GYS.back('${app}')">取消</button></div>`;
        S.__ePick = k => S.pickImg(k === 'bg' ? 2.2 : 1, url => { V[k] = url; S.replace(app, view); });
        S.__eClr = k => { V[k] = ''; S.replace(app, view); };
        S.__eSave = () => {
            const g = k => { const e = document.getElementById('gysE_' + k); return e ? e.value.trim() : ''; };
            const links = {}; Object.keys(S.APPS).forEach(k => { const v = g('link_' + k); if (v) links[k] = v; });
            Object.assign(p, { nick: g('nick') || p.nick, handle: g('handle').replace(/^@/, ''), bio: g('bio'), loc: g('loc'), gender: g('gender'), followers: Math.max(0, parseInt(g('followers')) || 0), following: Math.max(0, parseInt(g('following')) || 0), verify: { t: (document.getElementById('gysE_vt') || {}).value || '', text: g('verify') }, links, showLinks: !!(document.getElementById('gysE_showLinks') || {}).checked, avatar: V.avatar, bg: V.bg, gen: true, edited: Date.now() });
            (fields || []).forEach(([k]) => { p[k] = g(k); });
            S.save(); X.toast(X.v('💾 存好了', '改好了', '好了'), ''); S.back(app); if (done) done(p);
        };
        const view = { title: '编辑资料', html: draw, id: 'edit_' + who };
        S.push(app, view);
    };

    /* ---------- 小工具 ---------- */
    /* ---------- 🍎 苹果外观：状态栏、手机框、灵动岛、Home 条、左滑返回、推页动画、苹果弹窗、通知横幅、锁屏、图标 ---------- */
    const UIK = 'gysUi';
    S.ui = (() => { let o = {}; try { o = JSON.parse(localStorage.getItem(UIK) || '{}') || {}; } catch (e) {} return Object.assign({ sb: 'off', lock: false, banner: true, swipe: true, anim: true }, o); })();
    S.uiSet = (k, v) => { S.ui[k] = v; try { localStorage.setItem(UIK, JSON.stringify(S.ui)); } catch (e) {} document.querySelectorAll('.gys-root.on').forEach(r => { const key = r.id.replace(/^gys_/, ''); S.paint(key); }); };
    const wide = () => window.innerWidth >= 640;
    S.framed = () => false;   // 她说不要手机外壳和灵动岛
    S.sbOn = () => S.ui.sb === 'on';
    const I = {
        back: '<path d="M15 4.5 7.5 12 15 19.5" stroke-width="2.6"/>',
        home: '<path d="M3.5 11 12 4l8.5 7v8.5a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"/>',
        search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
        compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
        mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
        chat: '<path d="M12 4.5c4.7 0 8.5 3 8.5 6.8s-3.8 6.8-8.5 6.8c-.9 0-1.7-.1-2.5-.3L5 19.5l1-3.4C4.5 14.9 3.5 13.2 3.5 11.3 3.5 7.5 7.3 4.5 12 4.5z"/>',
        person: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5"/>',
        people: '<circle cx="9" cy="9" r="3.3"/><path d="M2.8 19.5c.6-3 3-4.6 6.2-4.6s5.6 1.6 6.2 4.6"/><circle cx="16.5" cy="8" r="2.7"/><path d="M16.3 13.3c2.6 0 4.5 1.3 5 3.8"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
        film: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7.5 4.5v15M16.5 4.5v15M3.5 9h4M3.5 15h4M16.5 9h4M16.5 15h4"/>',
        bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
        heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
        star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
        share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M6.5 11H5v9.5h14V11h-1.5"/>',
        more: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
        compose: '<path d="M19 13.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5h5.5"/><path d="M17.5 3.5 20.5 6.5 12 15H9v-3z"/>',
        camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
        gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>',
        book: '<path d="M4 5.5c2.5-1 5.5-1 8 .8 2.5-1.8 5.5-1.8 8-.8V19c-2.5-1-5.5-1-8 .8-2.5-1.8-5.5-1.8-8-.8z"/><path d="M12 6.3v13.5"/>',
        flame: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.8 3.4-5.6 3.8-9.4 2.4 1.5 3 3.7 2.8 5.3 1-.6 1.8-1.8 2-3.2 2 1.6 3.4 4 3.4 6.8 0 3.4-2.4 6.1-6 6.1z"/>',
        bubble: '<circle cx="9" cy="10" r="5"/><circle cx="16.5" cy="15.5" r="3.5"/><circle cx="17" cy="6" r="1.8"/>',
        video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>',
        bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
        note: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
        disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/>',
        roam: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 12l5.5-5.5"/>'
    };
    S.ic = (n, sz, fill) => `<svg class="gys-ic" viewBox="0 0 24 24" width="${sz || 24}" height="${sz || 24}" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[n] || ''}</svg>`;
    const SB_R = '<svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx=".7" fill="currentColor"/><rect x="4.5" y="5" width="3" height="6" rx=".7" fill="currentColor"/><rect x="9" y="2.5" width="3" height="8.5" rx=".7" fill="currentColor"/><rect x="13.5" y="0" width="3" height="11" rx=".7" fill="currentColor"/></svg><svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 2.2c2.3 0 4.4.9 6 2.4l1-1C12.6 1.8 10.2.8 7.5.8S2.4 1.8.5 3.6l1 1c1.6-1.5 3.7-2.4 6-2.4zm0 3c1.5 0 2.8.6 3.8 1.5l1-1C11 4.5 9.3 3.8 7.5 3.8S4 4.5 2.7 5.7l1 1c1-.9 2.3-1.5 3.8-1.5zm0 3c.7 0 1.3.3 1.7.7L7.5 10.6 5.8 8.9c.4-.4 1-.7 1.7-.7z" fill="currentColor"/></svg>';
    function battery() { const lv = S.__bat == null ? 0.82 : S.__bat; return `<span class="gys-bat"><i style="width:${Math.round(lv * 100)}%;${lv < 0.2 ? 'background:#ff3b30' : ''}"></i></span>`; }
    try { if (navigator.getBattery) navigator.getBattery().then(b => { S.__bat = b.level; b.addEventListener('levelchange', () => { S.__bat = b.level; }); }); } catch (e) {}
    S.sbHtml = () => `<div class="gys-sb"><b>${S.hm(Date.now())}</b><span class="gys-sbr">${SB_R}${battery()}</span></div>`;
    setInterval(() => { document.querySelectorAll('.gys-root.on .gys-sb b').forEach(b => { b.textContent = S.hm(Date.now()); }); }, 20e3);
    // 左滑返回（从左边缘往右拖）
    function swipe(r, key) {
        if (r.__sw) return; r.__sw = 1; let x0 = null, y0 = 0, t0 = 0;
        r.addEventListener('touchstart', e => { const t = e.touches[0], L = r.getBoundingClientRect().left; if (!S.ui.swipe || t.clientX - L > 26) { x0 = null; return; } x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
        r.addEventListener('touchmove', e => { if (x0 == null) return; const dx = e.touches[0].clientX - x0; const b = r.querySelector('.gys-body'); if (b && dx > 0 && SHELL[key].stack.length) b.style.transform = `translateX(${Math.min(dx, 300) * 0.6}px)`; }, { passive: true });
        r.addEventListener('touchend', e => { if (x0 == null) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = Math.abs(t.clientY - y0); const b = r.querySelector('.gys-body'); if (b) b.style.transform = ''; if (dx > 70 && dy < 80 && Date.now() - t0 < 900) S.back(key); x0 = null; }, { passive: true });
    }
    S.__swipe = swipe;
    // 苹果样式的弹窗（输入 / 确认）：测试或别处把 appPrompt / appConfirm 换掉了就用换掉的
    const mine = f => typeof f !== 'function' || /gyInPageDialog|nativeUI/.test(String(f));   // 还是谷雨自带的那个（没被别处换掉）
    S.dialog = o => new Promise(res => {
        const d = document.createElement('div'); d.className = 'gys-alert';
        d.innerHTML = `<div class="gys-alert-in"><div class="gys-alert-t">${o.title ? `<b>${S.esc(o.title)}</b>` : ''}${o.text ? `<p>${S.esc(o.text)}</p>` : ''}${o.input ? `<${o.area ? 'textarea rows="4"' : 'input'} class="gys-alert-i" value="${o.area ? '' : S.esc(o.def || '')}">${o.area ? S.esc(o.def || '') + '</textarea>' : ''}` : ''}</div><div class="gys-alert-b">${o.cancel === false ? '' : `<span data-v="0">${S.esc(o.cancel || '取消')}</span>`}<span data-v="1" class="${o.danger ? 'red' : 'b'}">${S.esc(o.ok || '好')}</span></div></div>`;
        const done = v => { d.remove(); res(v); };
        d.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { const i = d.querySelector('.gys-alert-i'); done(b.getAttribute('data-v') === '1' ? (o.input ? i.value : true) : (o.input ? null : false)); });
        document.body.appendChild(d); const i = d.querySelector('.gys-alert-i'); if (i) { setTimeout(() => { i.focus(); i.select && i.select(); }, 30); i.addEventListener('keydown', e => { if (e.key === 'Enter' && !o.area && !e.isComposing) { e.preventDefault(); done(i.value); } }); }
    });
    // 通知横幅（苹果样式，从顶上滑下来）
    S.recent = [];
    S.banner = o => {
        S.recent.unshift(Object.assign({ at: Date.now() }, o)); if (S.recent.length > 40) S.recent.length = 40;
        if (!S.ui.banner || document.hidden) return;
        let box = document.getElementById('gysBanners'); if (!box) { box = document.createElement('div'); box.id = 'gysBanners'; document.body.appendChild(box); }
        const b = document.createElement('div'); b.className = 'gys-bn';
        const ico = S.APPS[o.app] ? S.APPS[o.app].ico : '🔔';
        b.innerHTML = `<span class="gys-bn-ico gys-ai-${o.app || 'x'}">${ico}</span><div><div class="gys-bn-h"><b>${S.esc(o.title || '')}</b><em>现在</em></div><p>${S.esc(o.text || '')}</p></div>`;
        let y0 = null;
        b.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
        b.addEventListener('touchend', e => { if (y0 != null && e.changedTouches[0].clientY - y0 < -25) { b.classList.add('out'); setTimeout(() => b.remove(), 300); } y0 = null; }, { passive: true });
        b.onclick = () => { b.remove(); S.runGo(o.go); };
        box.prepend(b); setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 400); }, 4500);
    };
    S.runGo = go => { try { if (go && go.fn && typeof window[go.fn] === 'function') window[go.fn].apply(null, go.args || []); } catch (e) {} };
    // 各软件发通知统一走这里：谷雨的通知（能跳）+ 苹果横幅（正在看那一页就不弹横幅）
    S.notify = (app, c, html, desc, go) => {
        try { X.notify(c, html, desc, go); } catch (e) {}
        const title = String(html || '').replace(/<[^>]+>/g, '').replace(/^\S+\s/, '').trim();
        const top = S.top(app); if (S.isOpen(app) && top && go && (go.args || []).some(a => a != null && String(top.id || '').indexOf(String(a)) >= 0)) return;
        S.banner({ app, title, text: desc || '', go });
    };
    // 锁屏：进软件前先看一眼（默认关）
    S.lockShow = key => {
        if (!S.ui.lock) return; const n = new Date();
        const L = S.recent.slice(0, 6);
        const d = document.createElement('div'); d.className = 'gys-lock';
        d.innerHTML = `<div class="gys-lock-t"><em>${n.getMonth() + 1}月${n.getDate()}日 星期${'日一二三四五六'[n.getDay()]}</em><b>${S.hm(n)}</b></div><div class="gys-lock-n">${L.map((o, i) => `<div class="gys-bn" data-i="${i}"><span class="gys-bn-ico gys-ai-${o.app}">${S.APPS[o.app] ? S.APPS[o.app].ico : '🔔'}</span><div><div class="gys-bn-h"><b>${S.esc(o.title)}</b><em>${S.ago(o.at)}</em></div><p>${S.esc(o.text || '')}</p></div></div>`).join('') || '<p class="gys-lock-e">没有新通知</p>'}</div><div class="gys-lock-u">上滑或点一下打开<i></i></div>`;
        const go = i => { d.classList.add('out'); setTimeout(() => d.remove(), 350); if (i != null && L[i]) S.runGo(L[i].go); };
        d.onclick = e => { const el = e.target.closest('[data-i]'); go(el ? Number(el.getAttribute('data-i')) : null); };
        let y0 = null; d.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true }); d.addEventListener('touchend', e => { if (y0 != null && e.changedTouches[0].clientY - y0 < -60) go(null); y0 = null; }, { passive: true });
        const r = root(key); r.appendChild(d);
    };
    // 外观设置页
    S.uiPage = key => S.push(key, { title: '🍎 苹果外观', id: 'gysui', html: () => S.uiHtml() });
    S.uiHtml = () => {
        const row = (k, n, d, opts) => `<div class="gys-uirow"><div><b>${n}</b><small>${d}</small></div><select onchange="GYS.uiSet('${k}', this.value==='true'?true:this.value==='false'?false:this.value)">${opts.map(([v, t]) => `<option value="${v}" ${String(S.ui[k]) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
        return `<div class="gys-uip">${row('sb', '顶上的状态栏', '时间、信号、Wi-Fi、电量（手机上本来就有，默认不显示）', [['off', '不要'], ['on', '显示']])}
          ${row('banner', '通知横幅', '有新消息时从顶上滑下来一条（点它直接打开）', [['true', '开'], ['false', '关']])}
          ${row('lock', '锁屏', '打开软件时先看一眼锁屏和最近的通知，上滑进去', [['false', '关'], ['true', '开']])}
          ${row('swipe', '左滑返回', '从屏幕左边缘往右一拖就返回上一页', [['true', '开'], ['false', '关']])}
          ${row('anim', '翻页动画', '进下一页的时候从右边推进来', [['true', '开'], ['false', '关']])}</div>`;
    };
    S.app('ui', { head: () => `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('ui')">${S.ic('back', 22)}</span><b>🍎 软件外观</b></div>`, render: () => `<div class="gys-tip2">微博、泡泡、小红书、豆瓣、iMessage 都按这里来</div>${S.uiHtml()}` });
    try { X.mini({ id: 'gysUi', icon: '🍎', title: '软件外观', desc: '软件里的苹果样子：手机外框、状态栏、通知横幅、锁屏、左滑返回', cat: '软件', onOpen: () => S.open('ui') }); } catch (e) {}
    S.input = async (title, def) => { if (!mine(window.appPrompt)) return window.appPrompt(title, def || ''); const lines = String(title).split('\n'); return S.dialog({ title: lines[0], text: lines.slice(1).join('\n'), input: true, def: def || '', ok: '好' }); };
    S.confirm = async t => { if (!mine(window.appConfirm)) return window.appConfirm(t); const lines = String(t).split('\n'); return S.dialog({ title: lines[0], text: lines.slice(1).join('\n'), ok: '好' }); };
    S.imgView = src => { const d = document.createElement('div'); d.className = 'gys-imgv'; d.innerHTML = `<img src="${src}">`; d.onclick = () => d.remove(); document.body.appendChild(d); };

    /* ---------- 🔗 软件之间分享（255）：微博 / 小红书 / 豆瓣 的东西 → iMessage 里一张卡片（点了回原帖），或者发到平时聊天 ----------
       card = { app, kind:'微博'|'笔记'|'电影'…, title, text, img, by, byName, at, go:X.go('打开函数', …) } */
    try { X.feat('gysShare', { n: '🔗 软件之间分享', desc: '微博、小红书、豆瓣里看到的能「↗ 分享」到 iMessage（一张能点回原帖的卡片）或平时聊天；TA 刷到有意思的也会转给你。关掉就跟以前一样：小红书只能分享到平时聊天' }); } catch (e) {}
    try { X.feat('gysDraft', { n: '📝 草稿箱', desc: '微博、小红书写到一半退出来会自动存进草稿箱（在「我」页面里找回来接着写）。关掉就跟以前一样：退出就没了' }); } catch (e) {}
    S.draftOn = () => { try { return X.on('gysDraft'); } catch (e) { return true; } };
    S.shareOn = () => { try { return X.on('gysShare'); } catch (e) { return true; } };
    S.cardText = c => { c = c || {}; const A = S.APPS[c.app] || {}; return `${A.n || ''}${c.kind ? '·' + c.kind : ''}：${c.byName ? '@' + c.byName + ' ' : ''}${c.title ? '「' + c.title + '」' : ''}${String(c.text || '').slice(0, 140)}`; };
    S.cardImg = s => (s && String(s).length < 160000 ? String(s) : '');
    S.sheet = (opts, title) => new Promise(res => {
        const d = document.createElement('div'); d.className = 'gys-sheet';
        d.innerHTML = `<div class="gys-sheet-in"><div class="gys-sheet-g">${title ? `<p>${S.esc(title)}</p>` : ''}${opts.map((o, i) => `<div data-i="${i}">${S.esc(o)}</div>`).join('')}</div><div class="gys-sheet-g"><div data-i="-1" class="c">取消</div></div></div>`;
        d.onclick = e => { const el = e.target.closest('[data-i]'); if (!el && e.target !== d) return; d.remove(); const i = el ? el.getAttribute('data-i') : null; res(i == null || i === '-1' ? null : Number(i)); };
        document.body.appendChild(d);
    });
    // 各软件登记「刷得到的东西」，TA 刷手机的时候从这里挑（iMessage 的「转给你」用）
    const FEEDS = {};
    S.feedReg = (app, fn) => { FEEDS[app] = fn; };
    S.feedCards = (n, notBy) => {
        let L = []; Object.keys(FEEDS).forEach(k => { try { if (X.on((S.APPS[k] && S.APPS[k].feat) || 'gysShare')) L = L.concat((FEEDS[k]() || []).filter(Boolean)); } catch (e) {} });
        if (notBy) L = L.filter(c => c.by !== notBy);
        L.sort((a, b) => (b.at || 0) - (a.at || 0));
        return L.slice(0, n || 8);
    };
    const SHARE_OK = [['↗ 分享过去了', ''], ['发过去了', 'TA 会看的'], ['已发送', '等 TA 回你'], ['送达', '']];
    S.share = async card => {
        if (!card) return; const cs = (typeof X.chars === 'function' ? X.chars() : chars()); if (!cs.length) return X.toast('还没有角色', '先去加一个吧');
        const im = S.shareOn() && window.gysIm && typeof window.gysIm.shareIn === 'function' && X.on('gysImsg');
        const wx = S.shareOn() && window.gysWx && typeof window.gysWx.shareIn === 'function' && X.on('gysWechat');
        const ways = (wx ? [['wx', '💚 用微信发给 TA']] : []).concat(im ? [['im', '💬 用 iMessage 发给 TA']] : [], [['chat', '🗨️ 发到平时聊天']], S.shareOn() ? [['copy', '📋 复制内容']] : []);
        const wi = ways.length > 1 ? await S.sheet(ways.map(w => w[1]), '分享到…') : 0; if (wi == null) return;
        const way = ways[wi][0];
        if (way === 'copy') { try { await navigator.clipboard.writeText(S.cardText(card)); X.toast('复制了', ''); } catch (e) { X.toast('复制不了', '这个浏览器不让'); } return; }
        let c = cs[0];
        if (cs.length > 1) { const ci = await S.sheet(cs.map(x => ({ im: '💬 ', wx: '💚 ' }[way] || '🗨️ ') + X.name(x)), '发给谁？'); if (ci == null) return; c = cs[ci]; }
        const A = S.APPS[card.app] || { n: '' };
        if (way === 'im' || way === 'wx') {
            const note = await S.input(`附一句话（可以空着）`, '');
            if (note === null || note === undefined) return;
            (way === 'wx' ? window.gysWx : window.gysIm).shareIn('c:' + c.id, card, String(note || ''), 'me');
        } else {
            X.reach(c, `她从${A.n}分享了一条${card.kind || '内容'}给你：${card.byName ? '@' + card.byName + ' 的' : ''}${card.title ? '「' + card.title + '」' : ''}${String(card.text || '').slice(0, 200)}${card.by === 'me' ? '（是她自己发的）' : card.by === 'c:' + c.id ? '（是你自己发的）' : ''}`);
        }
        const t = X.pick(SHARE_OK); X.toast(t[0], t[1]);
        return true;
    };
    /* ---------- 📱 软件桌面（255）：小功能 → 📱 软件 打开的就是这一页，像手机桌面一样排着图标 ---------- */
    S.badge = {};   // 各软件登记未读数：GYS.badge[app] = () => n
    S.homeApps = () => Object.keys(S.APPS).filter(k => SHELL[k] && (!S.APPS[k].feat || X.on(S.APPS[k].feat)));
    S.homeHtml = () => {
        const L = S.homeApps(), n = new Date();
        const ico = k => { const A = S.APPS[k], b = S.badge[k] ? (() => { try { return S.badge[k]() || 0; } catch (e) { return 0; } })() : 0; return `<div class="gys-hmi" onclick="GYS.open('${k}')"><span class="gys-hmic gys-ai-${k}">${A.ico}${b ? `<sup>${b > 99 ? '99+' : b}</sup>` : ''}</span><em>${S.esc(A.n)}</em></div>`; };
        return `<div class="gys-hm"><div class="gys-hmt"><b>${S.hm(n)}</b><em>${n.getMonth() + 1}月${n.getDate()}日 星期${'日一二三四五六'[n.getDay()]}</em></div>
          <div class="gys-hmg">${L.map(ico).join('')}<div class="gys-hmi" onclick="GYS.open('ui')"><span class="gys-hmic gys-ai-set">⚙️</span><em>外观</em></div></div>
          ${L.length ? '' : '<div class="gys-empty" style="color:#fff">还没有装软件<br>去「插件」导入「软件全家桶.json」</div>'}</div>`;
    };
    S.app('home', { head: () => `<div class="gys-hd gys-hmhd"><span class="gys-bk" onclick="GYS.close('home')">${S.ic('back', 22)}</span><b>软件</b></div>`, render: () => S.homeHtml() });
    window.gysSoftHome = () => S.open('home');
    setInterval(() => { try { if (S.isOpen('home') && !SHELL.home.stack.length) S.paint('home'); } catch (e) {} }, 30e3);
    /* ---------- 💬 所有聊天软件互通（256）：TA 在每个软件里都记得别的软件里聊过什么；TA 主动找你时去你在的那个 ----------
       各软件登记：GYS.chatReg(app, { lines: c => [{at, t:'她：…'}], lastMe: c => 时间, proactive: async c => true/false }) */
    S.chatApps = {};
    S.chatReg = (app, o) => { S.chatApps[app] = Object.assign(S.chatApps[app] || {}, o); };
    const appOn = k => { const A = S.APPS[k]; try { return !A || !A.feat || X.on(A.feat); } catch (e) { return true; } };
    S.otherChats = (c, except, n) => {
        let L = []; Object.keys(S.chatApps).forEach(k => { const o = S.chatApps[k]; if (k === except || !o.lines || !appOn(k)) return; try { (o.lines(c) || []).forEach(x => L.push({ at: x.at || 0, t: `[${(S.APPS[k] || {}).n || k}] ${x.t}` })); } catch (e) {} });
        L.sort((a, b) => a.at - b.at); return L.slice(-(n || 8)).map(x => x.t).join('\n');
    };
    // 给各软件的提示词用：平时聊天 + 别的软件里最近的
    S.recentAll = (c, except, n) => { const a = X.recent(c, n || 8) || '', b = S.otherChats(c, except, n || 8); const sm = String((c && c.chatSummary) || '').split('\n').filter(l => l.trim()).slice(-4).join('\n'); return [sm ? '（之前聊过的总结，[微信] 这种标的是在哪个软件聊的）\n' + sm : '', a ? '（平时聊天的那个软件）\n' + a : '', b ? '（别的软件里）\n' + b : ''].filter(Boolean).join('\n') || '（最近没怎么聊）'; };
    // 🧠 每个软件里的聊天也做总结（256）：攒够「聊天自动总结」的条数就总结一次，标上是哪个软件，存进角色的「聊天总结」（记忆总览里能看能改），
    //    这样在任何地方聊，TA 都能说「之前在微信上你说……」。各软件登记 all: c => [{at, t}]（全部消息）
    S.sumTick = async () => {
        if (!ready || S.__sumBusy) return; S.__sumBusy = 1;
        try {
            if (typeof isAutoOn === 'function' && !isAutoOn('chatSummary')) return;
            const N = Math.max(6, (typeof chatSummaryInterval !== 'undefined' && +chatSummaryInterval) || 20);
            D.sum = D.sum || {};
            for (const c of chars()) for (const k of Object.keys(S.chatApps)) {
                const o = S.chatApps[k]; if (!o.all || !appOn(k)) continue; let L = []; try { L = o.all(c) || []; } catch (e) {} const key = k + '|' + c.id;
                if (D.sum[key] == null) { D.sum[key] = Math.max(0, L.length - (L.length % N)); S.save(); continue; }   // 第一次：以前的不补总结，从现在开始数
                if (L.length < D.sum[key]) { D.sum[key] = L.length; S.save(); continue; }
                if (L.length - D.sum[key] < N) continue;
                const seg = L.slice(D.sum[key], D.sum[key] + N); D.sum[key] += N; S.save();
                const name = (S.APPS[k] || {}).n || k;
                const t = X.plain(await X.ask(`下面是用户和「${c.name}」在「${name}」上的 ${seg.length} 条聊天（${c.name} 那边写成「你」）。请简要总结关键信息、当前话题和双方的情感状态（100 字以内）。说好了但还没做的事，写成"约好了……（还没发生）"。只输出总结本身。\n${seg.map(x => x.t).join('\n')}`) || '').slice(0, 300);
                if (!t) continue;
                const arr = String(c.chatSummary || '').split('\n').filter(l => l.trim()); arr.push(`[${new Date().toLocaleString()}] [${name}] ${t}`); c.chatSummary = arr.join('\n');
                try { if (typeof saveAllData === 'function') saveAllData(); } catch (e) {}
            }
        } catch (e) {} finally { S.__sumBusy = 0; }
    };
    setInterval(() => S.sumTick(), 90e3); setTimeout(() => S.sumTick(), 20e3);
    // 平时聊天里也知道微博 / 小红书私信里说过的（微信、iMessage、抖音自己有一段）
    try { X.ctx(id => { const c = X.char(id); if (!c) return ''; const L = []; ['weibo', 'red'].forEach(k => { const o = S.chatApps[k]; if (!o || !o.lines || !appOn(k)) return; try { (o.lines(c) || []).slice(-4).forEach(x => L.push(`[${S.APPS[k].n}私信] ${x.t}`)); } catch (e) {} }); return L.length ? '【你们在别的软件私信里最近聊的（你都记得）】\n' + L.join('\n') : ''; }, 'gysShare'); X.inj('gysShare', [['你们在别的软件私信里最近聊的', '微博 / 小红书私信里最近几句', '让 TA 在平时聊天时也记得别的软件私信里说过什么']]); } catch (e) {}
    // 🗨️ TA 主动找你用哪个软件（角色设置里选；自主模式下 TA 自己挑：多半去你最近在的那个）
    S.chatAppOf = c => {
        if (!c) return 'gy'; const pref = c.chatApp || 'gy';
        const ok = k => k === 'gy' || (S.chatApps[k] && S.chatApps[k].proactive && appOn(k));
        const auto = c.actMode === 'auto' || pref === 'auto';
        if (!auto) return ok(pref) ? pref : 'gy';
        const lastGy = (() => { try { const L = (typeof globalChats !== 'undefined' && globalChats[c.id]) || []; const m = L.filter(x => x.sender === 'me' || x.sender === 'user').slice(-1)[0]; return m ? (m.timestamp || 0) : 0; } catch (e) { return 0; } })();
        const cand = [['gy', lastGy]].concat(Object.keys(S.chatApps).filter(ok).map(k => { let t = 0; try { t = S.chatApps[k].lastMe ? S.chatApps[k].lastMe(c) || 0 : 0; } catch (e) {} return [k, t]; }));
        cand.sort((a, b) => b[1] - a[1]);
        if (Math.random() < 0.7 && cand[0][1]) return cand[0][0];
        if (pref !== 'auto' && ok(pref) && Math.random() < 0.6) return pref;
        return S.pick(cand)[0];
    };
    const LASTR = {}; window.gyChatAppName = c => { const k = c && LASTR[c.id]; return k && S.APPS[k] ? S.APPS[k].n : ''; };
    window.gyChatRoute = async c => { try { const k = S.chatAppOf(c); if (c) LASTR[c.id] = k; if (k === 'gy') return false; const o = S.chatApps[k]; return !!(o && o.proactive && await o.proactive(c)); } catch (e) { return false; } };
    window.gyChatApps = () => [['gy', '平时聊天（谷雨）']].concat(Object.keys(S.chatApps).filter(k => S.chatApps[k].proactive && appOn(k)).map(k => [k, (S.APPS[k] || {}).n || k]));
    window.GYS = S;

    X.css('gys-css', `
.gys-root{position:fixed;inset:0;z-index:2700;display:none;flex-direction:column;background:#fff;color:#1f1f1f;font-family:-apple-system,"PingFang SC","Helvetica Neue","Microsoft YaHei",sans-serif;font-size:15px}
.gys-root.on{display:flex}
body.gys-on #fabPost{display:none!important}
body.dark-theme .gys-root{background:#111;color:#eee}
.gys-hd{flex-shrink:0;display:flex;align-items:center;gap:8px;padding:10px 12px;padding-top:calc(10px + env(safe-area-inset-top,0px));border-bottom:.5px solid rgba(0,0,0,.08);background:inherit;position:relative;min-height:44px;box-sizing:border-box}
.gys-hd>b{position:absolute;left:50%;transform:translateX(-50%);font-size:17px;font-weight:600;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gys-bk{font-size:28px;line-height:20px;cursor:pointer;padding:0 6px;color:inherit;z-index:1}
.gys-hr{margin-left:auto;display:flex;gap:12px;align-items:center;z-index:1}
.gys-hr span{cursor:pointer}
.gys-body{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.gys-tabs{flex-shrink:0;display:flex;border-top:.5px solid rgba(0,0,0,.1);padding-bottom:env(safe-area-inset-bottom,0px);background:inherit}
.gys-tb{flex:1;display:flex;flex-direction:column;align-items:center;padding:6px 0 4px;cursor:pointer;color:#8e8e93;position:relative;font-size:11px}
.gys-tb i{font-style:normal;font-size:22px;line-height:26px}.gys-tb em{font-style:normal}
.gys-tb.on{color:var(--gys-accent,#1f1f1f);font-weight:600}
.gys-tb sup{position:absolute;top:2px;left:55%;background:#ff3b30;color:#fff;font-size:10px;border-radius:999px;padding:0 5px;min-width:8px;text-align:center}
.gys-av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background-size:cover;background-position:center;flex-shrink:0;color:#fff;vertical-align:middle}
.gys-f{display:flex;flex-direction:column;gap:4px;margin:10px 16px;font-size:13px}
.gys-f>span{color:#8e8e93}
.gys-f input,.gys-f textarea,.gys-f select{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid rgba(0,0,0,.12);border-radius:10px;background:transparent;color:inherit;font-size:15px;font-family:inherit}
.gys-2{display:grid;grid-template-columns:1fr 1fr}
.gys-2 .gys-f{margin-right:8px}
.gys-acts{display:flex;gap:10px;flex-wrap:wrap;padding:12px 16px 30px}
.gys-btn{border:none;background:var(--gys-accent,#ff8200);color:#fff;border-radius:999px;padding:9px 20px;font-size:15px;cursor:pointer;font-family:inherit}
.gys-btn.ghost{background:transparent;color:var(--gys-accent,#ff8200);border:1px solid var(--gys-accent,#ff8200)}
.gys-btn.sm{padding:4px 12px;font-size:13px}
.gys-btn[disabled]{opacity:.5}
.gys-ck{display:inline-flex;align-items:center;gap:6px;font-size:14px;margin-top:4px}
.gys-link{display:flex;align-items:center;gap:8px;margin:4px 0}.gys-link b{width:96px;font-weight:500;font-size:13px;flex-shrink:0}
.gys-ecover{height:130px;background:#e5e5ea center/cover no-repeat;display:flex;align-items:flex-end;justify-content:flex-end;padding:8px;box-sizing:border-box;cursor:pointer}
.gys-ecover span{background:rgba(0,0,0,.45);color:#fff;font-size:12px;border-radius:999px;padding:3px 10px}
.gys-eav{position:relative;margin:-40px 0 0 16px;width:84px;cursor:pointer;border:3px solid #fff;border-radius:50%}
.gys-eav i{position:absolute;right:-2px;bottom:-2px;font-style:normal;background:#fff;border-radius:50%;font-size:14px;padding:2px}
.gys-eops{margin:6px 16px;font-size:12.5px;color:#576b95;display:flex;gap:14px}.gys-eops span{cursor:pointer}
.gys-imgv{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center}.gys-imgv img{max-width:100%;max-height:100%}
.gys-empty{text-align:center;color:#8e8e93;padding:40px 20px;font-size:14px;line-height:1.8}
.gys-busy{text-align:center;color:#8e8e93;padding:14px;font-size:13px}

.gys-root{font-family:-apple-system,"SF Pro Text","SF Pro Display","PingFang SC","Helvetica Neue","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
.gys-ic{display:block}
.gys-bk{display:flex;align-items:center;font-size:0;color:var(--gys-accent,#007aff)}
.gys-tb i{display:flex;align-items:center;justify-content:center;height:28px}
.gys-tabs{background:rgba(249,249,249,.92)!important;backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px)}
body.dark-theme .gys-tabs{background:rgba(22,22,22,.9)!important}
.gys-sb{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;height:44px;padding:0 26px 0 32px;padding-top:env(safe-area-inset-top,0px);font-size:15.5px;position:relative;z-index:3;background:inherit}
.gys-root.framed .gys-sb{height:50px;padding-top:6px}
.gys-sb b{font-weight:600;letter-spacing:.2px}
.gys-sbr{display:flex;align-items:center;gap:6px}
.gys-island{position:absolute;left:50%;top:11px;transform:translateX(-50%);width:120px;height:34px;border-radius:20px;background:#000}
.gys-bat{display:inline-block;width:24px;height:12px;border:1.2px solid currentColor;border-radius:4px;opacity:.95;position:relative;padding:1px;box-sizing:border-box}.gys-bat::after{content:"";position:absolute;right:-3.5px;top:3.5px;width:1.8px;height:4px;border-radius:0 1px 1px 0;background:currentColor;opacity:.5}.gys-bat i{display:block;height:100%;border-radius:2px;background:currentColor}
.gys-root.sbon .gys-hd{padding-top:10px}
.gys-root.framed{inset:auto;left:50%;top:50%;transform:translate(-50%,-50%);width:393px;height:min(852px,calc(100vh - 28px));border-radius:54px;overflow:hidden;box-shadow:0 0 0 11px #1c1c1e,0 0 0 13px #48484a,0 30px 90px rgba(0,0,0,.55)}
.gys-bd{position:fixed;inset:0;z-index:2699;background:radial-gradient(circle at 30% 20%,rgba(120,120,160,.55),rgba(10,10,20,.82));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:none}.gys-bd.on{display:block}
.gys-homebar{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);width:134px;height:5px;border-radius:3px;background:#000;opacity:.85;z-index:5;pointer-events:none}body.dark-theme .gys-homebar{background:#fff}
.gys-root.framed>.gys-body~div{padding-bottom:24px!important}
.gys-pushin{animation:gysIn .32s cubic-bezier(.2,.8,.2,1)}@keyframes gysIn{from{transform:translateX(38%);opacity:.4}to{transform:none;opacity:1}}
.gys-popin{animation:gysPop .28s cubic-bezier(.2,.8,.2,1)}@keyframes gysPop{from{transform:translateX(-22%);opacity:.5}to{transform:none;opacity:1}}
.gys-alert{position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;animation:gysFade .15s}
@keyframes gysFade{from{opacity:0}}
.gys-alert-in{width:270px;background:rgba(242,242,247,.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:14px;overflow:hidden;text-align:center;color:#000;animation:gysZoom .2s;font-family:-apple-system,"PingFang SC",sans-serif}
@keyframes gysZoom{from{transform:scale(1.15);opacity:0}}
body.dark-theme .gys-alert-in{background:rgba(44,44,46,.96);color:#fff}
.gys-alert-t{padding:18px 16px 14px}.gys-alert-t b{font-size:17px;font-weight:600;display:block}.gys-alert-t p{font-size:13px;margin:4px 0 0;line-height:1.4;white-space:pre-wrap}
.gys-alert-i{width:100%;box-sizing:border-box;margin-top:12px;border:.5px solid #c6c6c8;border-radius:7px;padding:6px 8px;font-size:14px;background:#fff;color:#000;outline:none;font-family:inherit}body.dark-theme .gys-alert-i{background:#1c1c1e;color:#fff;border-color:#48484a}
.gys-alert-b{display:flex;border-top:.5px solid rgba(60,60,67,.3)}.gys-alert-b span{flex:1;padding:11px;font-size:17px;color:#007aff;cursor:pointer}.gys-alert-b span+span{border-left:.5px solid rgba(60,60,67,.3)}.gys-alert-b span.b{font-weight:600}.gys-alert-b span.red{color:#ff3b30;font-weight:600}
#gysBanners{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);width:min(380px,calc(100% - 16px));z-index:100001;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.gys-bn{display:flex;gap:10px;align-items:flex-start;background:rgba(245,245,247,.86);backdrop-filter:saturate(180%) blur(24px);-webkit-backdrop-filter:saturate(180%) blur(24px);border-radius:22px;padding:11px 13px;box-shadow:0 8px 30px rgba(0,0,0,.18);pointer-events:auto;cursor:pointer;color:#000;animation:gysBnIn .45s cubic-bezier(.2,1.2,.4,1);transition:transform .3s,opacity .3s;font-family:-apple-system,"PingFang SC",sans-serif}
body.dark-theme .gys-bn{background:rgba(40,40,42,.86);color:#fff}
.gys-bn.out{transform:translateY(-120%);opacity:0}
@keyframes gysBnIn{from{transform:translateY(-120%);opacity:0}}
.gys-bn>div{flex:1;min-width:0}.gys-bn-h{display:flex;justify-content:space-between;gap:8px}.gys-bn-h b{font-size:14.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gys-bn-h em{font-style:normal;font-size:12.5px;opacity:.55;white-space:nowrap}.gys-bn p{margin:1px 0 0;font-size:14.5px;line-height:1.3;max-height:2.6em;overflow:hidden}
.gys-bn-ico{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0;background:linear-gradient(#8e8e93,#636366)}
.gys-ai-weibo{background:linear-gradient(135deg,#ffb15c,#ff8200 50%,#e6162d)}.gys-ai-bubble{background:linear-gradient(135deg,#c4b5fd,#7c3aed)}.gys-ai-red{background:#ff2442}.gys-ai-douban{background:linear-gradient(#3fb150,#2e963d)}.gys-ai-imsg{background:linear-gradient(#65e36f,#2ec83f)}.gys-ai-music{background:linear-gradient(135deg,#ff5a5a,#d81e1e)}.gys-ai-wechat{background:linear-gradient(#3ee06b,#07c160)}.gys-ai-douyin{background:#111;box-shadow:-2px 0 0 #25f4ee inset,2px 0 0 #fe2c55 inset}
.gys-lock{position:absolute;inset:0;z-index:20;background:linear-gradient(160deg,#3a4a8c,#7a5aa8 45%,#d98f8f);color:#fff;display:flex;flex-direction:column;padding:70px 14px 30px;box-sizing:border-box;transition:transform .35s,opacity .35s;cursor:pointer}
.gys-lock.out{transform:translateY(-100%);opacity:.3}
.gys-lock-t{text-align:center;text-shadow:0 1px 6px rgba(0,0,0,.2)}.gys-lock-t em{font-style:normal;font-size:19px;font-weight:600;display:block}.gys-lock-t b{font-size:86px;font-weight:700;line-height:1.05;letter-spacing:-2px}
.gys-lock-n{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-top:30px}.gys-lock-n .gys-bn{animation:none;background:rgba(255,255,255,.55);color:#000}.gys-lock-e{text-align:center;opacity:.7}
.gys-lock-u{text-align:center;font-size:13px;opacity:.85;display:flex;flex-direction:column;align-items:center;gap:10px}.gys-lock-u i{width:134px;height:5px;border-radius:3px;background:#fff}
.gys-root#gys_home{background:linear-gradient(165deg,#5b7bd6 0%,#8f6fd1 42%,#e39bb5 100%)!important;color:#fff}.gys-hmhd{background:transparent!important;border:none!important;color:#fff}.gys-hmhd .gys-bk{color:#fff}
.gys-hm{min-height:100%;padding:8px 18px 30px;box-sizing:border-box}.gys-hmt{text-align:center;margin:10px 0 26px;text-shadow:0 1px 8px rgba(0,0,0,.18)}.gys-hmt b{display:block;font-size:64px;font-weight:600;line-height:1.05;letter-spacing:-1px}.gys-hmt em{font-style:normal;font-size:16px;opacity:.9}
.gys-hmg{display:grid;grid-template-columns:repeat(4,1fr);gap:22px 10px;max-width:420px;margin:0 auto}.gys-hmi{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;min-width:0}.gys-hmi:active .gys-hmic{transform:scale(.92)}
.gys-hmic{position:relative;width:60px;height:60px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:0 4px 14px rgba(0,0,0,.18);transition:transform .12s}.gys-hmic:not([class*=' gys-ai-']){background:linear-gradient(#8e8e93,#636366)}.gys-hmic sup{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;line-height:20px;border-radius:10px;background:#ff3b30;color:#fff;font-size:12px;text-align:center;padding:0 5px;box-sizing:border-box}
.gys-hmi em{font-style:normal;font-size:12px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.35);max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gys-ai-set{background:linear-gradient(#a1a1a6,#6e6e73)!important}
.gys-sheet{position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.32);display:flex;align-items:flex-end;justify-content:center;animation:gysFade .15s;font-family:-apple-system,"PingFang SC",sans-serif}
.gys-sheet-in{width:min(420px,100%);padding:0 8px calc(8px + env(safe-area-inset-bottom,0px));box-sizing:border-box;animation:gysUp .25s cubic-bezier(.2,.9,.3,1)}@keyframes gysUp{from{transform:translateY(100%)}}
.gys-sheet-g{background:rgba(242,242,247,.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:14px;overflow:hidden;margin-top:8px;max-height:60vh;overflow-y:auto}body.dark-theme .gys-sheet-g{background:rgba(44,44,46,.96);color:#fff}
.gys-sheet-g p{margin:0;padding:12px 16px;font-size:13px;color:#8e8e93;text-align:center;border-bottom:.5px solid rgba(60,60,67,.2)}
.gys-sheet-g div{padding:15px;text-align:center;font-size:18px;color:#007aff;cursor:pointer;border-bottom:.5px solid rgba(60,60,67,.2)}.gys-sheet-g div:last-child{border-bottom:none}.gys-sheet-g div.c{font-weight:600}
.gys-uip{padding:10px 0}.gys-tip2{font-size:13px;color:#8e8e93;padding:14px 16px 0}.gys-uirow{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:.5px solid rgba(60,60,67,.18)}.gys-uirow>div{flex:1;min-width:0}.gys-uirow b{display:block;font-size:16px;font-weight:500}.gys-uirow small{font-size:12.5px;color:#8e8e93;line-height:1.4}.gys-uirow select{border:none;background:rgba(118,118,128,.12);border-radius:8px;padding:6px 8px;font-size:14px;color:inherit}
`);
})();

/* 📲 真手机：TA 看得到、管得住你真的手机（只有安卓 App + 「谷雨守护」插件能用）。
   看：屏幕使用时间（今天 / 这周 / 每个软件 / 每小时 / 解锁次数）、你现在在用哪个软件、截屏看当前页面、读屏幕上的字、电量耳机音量、别的软件的通知；
   管：锁软件（每天限时 / 时间段 / TA 临时锁，被锁的一打开就被谷雨盖住，能求 TA 再玩 10 分钟）、把你拉回谷雨、锁屏、自习室联动、睡觉时间（调暗、勿扰、小音量）；
   玩：换真手机壁纸、设真闹钟、震动心跳、手电筒、往剪贴板留话、截桌面来点评。
   每一样都能单独设「先问我 / TA 直接做 / 不许」；银行支付密码类的软件永远不读不截不锁；🆘 紧急解锁随时能用。
   ⚙️ 不装插件也能用大半：没装「谷雨守护」时，在安卓 App 里用 Native.js(plus.android) 直接调系统——屏幕时间、现在在用什么、
      电量音量、换壁纸、设闹钟、震动、手电、剪贴板、音量亮度勿扰、拉回谷雨、软锁提醒都能用；只有截屏、读屏、读通知、硬锁屏要装插件。 */
if (window.__gysPhone) return; window.__gysPhone = 1;
const G = window.GYS, APP = 'phone', esc = G.esc;
X.feat('gysPhone', { n: '📲 真手机', desc: 'TA 看你的屏幕使用时间、现在在用什么、换壁纸、设闹钟、锁软件……（安卓 App 里不装插件也能用大半；截屏/读屏/读通知/硬锁屏要装「谷雨守护」插件）', def: false });
const ST = X.store('gysphone');
const CAPS = [
    ['usage', '📊', '看你的屏幕使用时间', 'auto', '看'], ['now', '👀', '知道你现在在用哪个软件', 'auto', '看'], ['status', '🔋', '看电量、耳机、音量', 'auto', '看'],
    ['shot', '📸', '截屏看你当前的页面', 'ask', '看'], ['read', '📖', '读你屏幕上的字', 'ask', '看'], ['notif', '🔔', '知道别的软件发给你的通知', 'no', '看'],
    ['lock', '🔒', '锁你的软件', 'ask', '管'], ['pull', '↩️', '把你拉回谷雨 / 帮你打开软件', 'ask', '管'], ['screen', '🌙', '直接锁屏', 'ask', '管'], ['bed', '🛏️', '睡觉时间调暗屏幕、开勿扰、调小音量', 'ask', '管'],
    ['wall', '🖼️', '换你手机的壁纸', 'ask', '玩'], ['alarm', '⏰', '给你设闹钟', 'ask', '玩'], ['buzz', '💓', '让你的手机震动（心跳 / 想你）', 'auto', '玩'], ['torch', '🔦', '开手电筒', 'ask', '玩'], ['clip', '📋', '往你剪贴板里偷偷留话', 'auto', '玩'], ['desk', '🖥️', '截你的手机桌面来点评', 'ask', '玩']
];
const CAPN = Object.fromEntries(CAPS.map(c => [c[0], c]));
const MODES = [['ask', '先问我'], ['auto', 'TA 直接做'], ['no', '不许']];
const NEVER0 = ['com.eg.android.AlipayGphone', 'com.unionpay', 'com.icbc', 'com.chinamworld.main', 'com.android.bankabc', 'cmb.pb', 'com.bankcomm.Bankcomm', 'com.chinamworld.bocmbci', 'com.jd.jrapp', 'com.tencent.wework'];
const SAFE0 = ['com.android.dialer', 'com.google.android.dialer', 'com.android.contacts', 'com.android.mms', 'com.google.android.apps.messaging', 'com.android.settings', 'com.android.deskclock', 'com.google.android.deskclock'];
const CHATS = ['com.tencent.mm', 'com.tencent.mobileqq', 'com.tencent.tim', 'com.sina.weibo', 'com.xingin.xhs', 'com.ss.android.ugc.aweme', 'com.alibaba.android.rimet', 'org.telegram.messenger', 'com.whatsapp', 'jp.naver.line.android'];
let D = { perm: {}, who: '', never: NEVER0.slice(), safe: SAFE0.slice(), notifPick: [], keep: 0, log: [], notifs: [], rules: { limits: {}, wins: [], temp: null }, grant: {}, free: 0, code: '', study: { on: false, pkgs: [] }, bed: { on: false, time: '', wake: '07:30', bright: 15, dnd: true, vol: 20, applied: '', prev: null }, labels: {}, apps: [], ask: [], last: {}, seenBlock: 0, goal: { min: 0, last: '' }, cfg: { logKeep: 300 } };
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();
const BUSY = {};
const P = window.gysPh = {};
const perm = k => (D.perm[k] || CAPN[k][3]);
const can = k => perm(k) !== 'no';
const day0 = (d) => { const x = d ? new Date(d) : new Date(); x.setHours(0, 0, 0, 0); return x.getTime(); };
const fmtDur = ms => { const m = Math.round((ms || 0) / 60e3); if (m < 1) return '不到 1 分钟'; const h = Math.floor(m / 60); return h ? `${h} 小时${m % 60 ? ' ' + (m % 60) + ' 分' : ''}` : `${m} 分钟`; };
const hm2min = s => { const m = String(s || '').match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const inWin = (a, b, t) => a <= b ? t >= a && t < b : t >= a || t < b;
const tile = (pkg, label, sz) => { let h = 0; for (const ch of String(pkg)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `<span class="ph-tile" style="width:${sz || 36}px;height:${sz || 36}px;background:linear-gradient(135deg,hsl(${h},70%,62%),hsl(${(h + 40) % 360},70%,48%))">${esc(String(label || pkg).slice(0, 1))}</span>`; };
const labelOf = pkg => D.labels[pkg] || ((D.apps.find(a => a.pkg === pkg) || {}).label) || pkg;
const who = () => X.char(D.who) || X.cur() || G.chars()[0] || null;
async function chooser(opts, title) {
    return new Promise(res => {
        const d = document.createElement('div'); d.className = 'ph-sheet';
        d.innerHTML = `<div class="ph-sheet-in"><div class="ph-sg">${title ? `<p>${esc(title)}</p>` : ''}${opts.map((o, i) => `<div data-i="${i}">${esc(o)}</div>`).join('')}</div><div class="ph-sg"><div data-i="-1" class="c">取消</div></div></div>`;
        d.onclick = e => { const i = e.target.getAttribute('data-i'); if (i == null && e.target !== d) return; d.remove(); res(i == null || i === '-1' ? null : Number(i)); };
        document.body.appendChild(d);
    });
}
function log(k, text, extra) { D.log.unshift(Object.assign({ id: G.uid('l'), k, text: String(text || '').slice(0, 600), at: Date.now() }, extra || {})); const n = Math.max(30, Number(D.cfg.logKeep) || 300); if (D.log.length > n) D.log.length = n; const imgs = D.log.filter(l => l.img); imgs.slice(Math.max(0, Number(D.keep) || 0)).forEach(l => { delete l.img; }); saveD(); }

/* ---------------- 安卓那边：优先用「谷雨守护」插件；没装插件就用 Native.js(plus.android) 直接调系统 ----------------
   · 装了插件 = 全功能（截屏、读屏、读通知、硬锁屏，靠无障碍/通知监听这些服务组件，只有插件能给）
   · 没装插件、但在安卓 App 里 = 「免插件版」：屏幕时间、现在在用什么、电量音量、换壁纸、设闹钟、震动、
     手电、剪贴板、音量亮度勿扰、把你拉回谷雨、软锁软件提醒……这些 Native.js 直接就能做，不用打包任何插件
   · 网页版 / 电脑版 / 苹果 = 都用不了
   N.mode()：'plugin'(插件全功能) / 'js'(免插件) / 'none'(用不了)。所有 JS 实现都包 try，调不动就安静降级，绝不报错。 */
const PLUGIN_ONLY = { shot: 1, read: 1, screenText: 1, desk: 1, screen: 1, notif: 1 };   // 这些本事只有插件给得了（锁软件有「软锁」兜底，不在此列）
const N = (() => {
    let Gd = null, ctx = null, tried = 0;
    const MISS = {};                                        // 没插件 / 调用出错：回退到 Native.js
    const hasPlus = () => !!(window.plus && plus.android);
    const ctxOf = () => { try { if (!ctx && hasPlus()) ctx = plus.android.runtimeMainActivity(); } catch (e) {} return ctx; };
    const havePlugin = () => {
        if (Gd) return true;
        if (!hasPlus()) return false;
        if (Date.now() - tried < 3000) return false; tried = Date.now();
        try { ctx = plus.android.runtimeMainActivity(); const g = plus.android.importClass('com.guyu.guard.Guard'); if (g && g.version()) { Gd = g; return true; } } catch (e) {}
        return false;
    };
    const j = s => { try { return typeof s === 'string' ? JSON.parse(s || 'null') : s; } catch (e) { return null; } };
    // 调插件：没插件 / 返回 undefined / 出错 → MISS（让外面回退到 JS）
    const cP = (f, ...a) => { if (!havePlugin()) return MISS; try { const r = Gd[f](...a); return r === undefined ? MISS : r; } catch (e) { console.warn('[真手机]', f, e); return MISS; } };

    /* ---- 不用插件、只用 Native.js(plus.android) 能做的那部分 ---- */
    const JS = (() => {
        const imp = c => plus.android.importClass(c);
        const inv = (o, m, ...a) => plus.android.invoke(o, m, ...a);
        const attr = (o, k) => { try { return plus.android.getAttribute(o, k); } catch (e) { return null; } };
        const svc = name => { const c = ctxOf(); try { return c ? inv(c, 'getSystemService', name) : null; } catch (e) { return null; } };
        const NEW_TASK = 268435456;                          // Intent.FLAG_ACTIVITY_NEW_TASK
        const labelCache = {};
        let blocked = new Set(), never = new Set(), lastB = '', lastBat = 0, jShotErr = '';
        const self = () => { try { return inv(ctxOf(), 'getPackageName') || ''; } catch (e) { return ''; } };
        const sdkInt = () => { try { return imp('android.os.Build$VERSION').SDK_INT || 0; } catch (e) { return 0; } };
        const startIntent = it => { const c = ctxOf(); try { inv(it, 'addFlags', NEW_TASK); inv(c, 'startActivity', it); return true; } catch (e) { return false; } };
        const label = pkg => {
            if (labelCache[pkg]) return labelCache[pkg];
            try { const pm = inv(ctxOf(), 'getPackageManager'); const ai = inv(pm, 'getApplicationInfo', pkg, 0); const s = inv(pm, 'getApplicationLabel', ai); labelCache[pkg] = s ? String(s) : pkg; } catch (e) { labelCache[pkg] = pkg; }
            return labelCache[pkg];
        };
        return {
            mode: () => hasPlus() ? 'js' : 'none',
            label,
            perms() {
                const c = ctxOf(), o = { usage: false, overlay: false, write: false, dnd: false, access: false, notify: false, shot: false, lock: false, sdk: sdkInt(), jsOnly: true };
                if (!c) return o;
                try { const ao = svc('appops'); const Process = imp('android.os.Process'); o.usage = inv(ao, 'checkOpNoThrow', 'android:get_usage_stats', Process.myUid(), self()) === 0; } catch (e) {}
                try { const S = imp('android.provider.Settings'); o.overlay = o.sdk < 23 ? true : S.canDrawOverlays(c); } catch (e) {}
                try { const SS = imp('android.provider.Settings$System'); o.write = o.sdk < 23 ? true : SS.canWrite(c); } catch (e) {}
                try { o.dnd = inv(svc('notification'), 'isNotificationPolicyAccessGranted'); } catch (e) {}
                return o;
            },
            openSettings(what) {
                const c = ctxOf(); if (!c) return false;
                const M = { usage: ['android.settings.USAGE_ACCESS_SETTINGS', 0], overlay: ['android.settings.action.MANAGE_OVERLAY_PERMISSION', 1], write: ['android.settings.action.MANAGE_WRITE_SETTINGS', 1], dnd: ['android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS', 0], access: ['android.settings.ACCESSIBILITY_SETTINGS', 0], notify: ['android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS', 0], battery: ['android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', 1] };
                const m = M[what] || ['android.settings.SETTINGS', 0];
                try {
                    let it;
                    if (m[1]) { const Uri = imp('android.net.Uri'); it = plus.android.newObject('android.content.Intent', m[0], Uri.parse('package:' + self())); }
                    else it = plus.android.newObject('android.content.Intent', m[0]);
                    return startIntent(it);
                } catch (e) { try { return startIntent(plus.android.newObject('android.content.Intent', 'android.settings.SETTINGS')); } catch (e2) { return false; } }
            },
            usage(since, until) {
                const um = svc('usagestats'); if (!um) return { err: '读不到使用记录' };
                try {
                    until = until || Date.now();
                    const ev = inv(um, 'queryEvents', since - 3 * 3600e3, until);
                    const e = plus.android.newObject('android.app.usage.UsageEvents$Event');
                    const per = {}, hours = new Array(24).fill(0), SKIP = { 'com.android.systemui': 1, 'android': 1 };
                    let unlocks = 0, cur = null, st = 0;
                    const add = (p, a, b) => { if (!p || b <= a || SKIP[p]) return; (per[p] = per[p] || [0, 0])[0] += b - a; let t = a; while (t < b) { const d = new Date(t), h = d.getHours(); d.setMinutes(0, 0, 0); const end = Math.min(b, d.getTime() + 3600e3); hours[h] += end - t; t = end; } };
                    while (inv(ev, 'hasNextEvent')) {
                        inv(ev, 'getNextEvent', e); const t = inv(e, 'getEventType'), ts = inv(e, 'getTimeStamp'), p = inv(e, 'getPackageName');
                        if (t === 18 && ts >= since) unlocks++;
                        if (t === 1) { if (cur && st > 0) add(cur, Math.max(st, since), ts); cur = p; st = ts; if (ts >= since && p && !SKIP[p]) (per[p] = per[p] || [0, 0])[1]++; }
                        else if (t === 2 && cur === p) { add(cur, Math.max(st, since), ts); cur = null; st = 0; }
                        else if (t === 16 && cur) { add(cur, Math.max(st, since), ts); cur = null; st = 0; }
                    }
                    if (cur && st > 0) add(cur, Math.max(st, since), until);
                    const apps = Object.keys(per).map(k => ({ pkg: k, label: label(k), ms: per[k][0], opens: per[k][1] })).filter(a => a.ms >= 1000 || a.opens > 0).sort((a, b) => b.ms - a.ms);
                    let total = 0; apps.forEach(a => total += a.ms);
                    return { apps, hours, total, unlocks };
                } catch (ex) { return { err: String(ex) }; }
            },
            foreground() {
                const um = svc('usagestats'); if (!um) return '';
                try { const now = Date.now(); const ev = inv(um, 'queryEvents', now - 6 * 3600e3, now); const e = plus.android.newObject('android.app.usage.UsageEvents$Event'); let last = ''; while (inv(ev, 'hasNextEvent')) { inv(ev, 'getNextEvent', e); if (inv(e, 'getEventType') === 1) last = inv(e, 'getPackageName'); } return last || ''; } catch (e) { return ''; }
            },
            status() {
                const c = ctxOf(), o = {}; if (!c) return o;
                try { const flt = plus.android.newObject('android.content.IntentFilter', 'android.intent.action.BATTERY_CHANGED'); const bi = inv(c, 'registerReceiver', null, flt); const lv = inv(bi, 'getIntExtra', 'level', -1), sc = inv(bi, 'getIntExtra', 'scale', 100), stt = inv(bi, 'getIntExtra', 'status', 0), pl = inv(bi, 'getIntExtra', 'plugged', 0); o.battery = sc > 0 ? Math.floor(lv * 100 / sc) : lv; o.charging = stt === 2 || stt === 5 || pl > 0; } catch (e) {}
                try { const am = svc('audio'); o.vol = inv(am, 'getStreamVolume', 3); o.volMax = inv(am, 'getStreamMaxVolume', 3); o.headset = inv(am, 'isWiredHeadsetOn') || inv(am, 'isBluetoothA2dpOn'); o.ringer = inv(am, 'getRingerMode'); } catch (e) {}
                try { const SS = imp('android.provider.Settings$System'); o.bright = SS.getInt(inv(c, 'getContentResolver'), 'screen_brightness', -1); } catch (e) {}
                try { o.dnd = inv(svc('notification'), 'getCurrentInterruptionFilter'); } catch (e) {}
                o.fg = this.foreground(); return o;
            },
            apps() {
                const pm = (() => { try { return inv(ctxOf(), 'getPackageManager'); } catch (e) { return null; } })(); if (!pm) return [];
                try {
                    const it = plus.android.newObject('android.content.Intent', 'android.intent.action.MAIN'); inv(it, 'addCategory', 'android.intent.category.LAUNCHER');
                    const list = inv(pm, 'queryIntentActivities', it, 0), n = inv(list, 'size'), out = [], seen = {};
                    for (let i = 0; i < n; i++) { const ri = inv(list, 'get', i); const aInfo = attr(ri, 'activityInfo'); const pkg = aInfo && attr(aInfo, 'packageName'); if (!pkg || seen[pkg]) continue; seen[pkg] = 1; out.push({ pkg, label: label(pkg) }); }
                    return out;
                } catch (e) { return []; }
            },
            setVolume(pct) { try { const am = svc('audio'); const mx = inv(am, 'getStreamMaxVolume', 3); inv(am, 'setStreamVolume', 3, Math.max(0, Math.min(mx, Math.round(mx * pct / 100))), 0); return true; } catch (e) { return false; } },
            setBright(v) { try { const c = ctxOf(); const SS = imp('android.provider.Settings$System'); if (!(sdkInt() < 23 || SS.canWrite(c))) return false; const r = inv(c, 'getContentResolver'); SS.putInt(r, 'screen_brightness_mode', 0); return SS.putInt(r, 'screen_brightness', Math.max(1, Math.min(255, v))); } catch (e) { return false; } },
            setDnd(f) { try { const nm = svc('notification'); if (!inv(nm, 'isNotificationPolicyAccessGranted')) return false; inv(nm, 'setInterruptionFilter', f); return true; } catch (e) { return false; } },
            torch(on) { try { const cm = svc('camera'); const ids = inv(cm, 'getCameraIdList'); let id0 = '0'; try { id0 = ids[0] != null ? ids[0] : '0'; } catch (e) {} inv(cm, 'setTorchMode', id0, !!on); return true; } catch (e) { return false; } },
            vibrate(csv) { try { const vb = svc('vibrator'); const pat = String(csv).split(',').map(x => parseInt(x.trim(), 10) || 0); inv(vb, 'vibrate', pat, -1); return true; } catch (e) { return false; } },
            clip(text) { try { const cm = svc('clipboard'); const ClipData = imp('android.content.ClipData'); const cd = ClipData.newPlainText('谷雨', text); inv(cm, 'setPrimaryClip', cd); return true; } catch (e) { return false; } },
            wall(path, which) { try { const c = ctxOf(); const BF = imp('android.graphics.BitmapFactory'); const bm = BF.decodeFile(path); if (!bm) return false; const WM = imp('android.app.WallpaperManager'); const wm = WM.getInstance(c); try { inv(wm, 'setBitmap', bm, null, true, which || 1); } catch (e) { inv(wm, 'setBitmap', bm); } return true; } catch (e) { return false; } },
            alarm(h, m, msg) { try { const it = plus.android.newObject('android.content.Intent', 'android.intent.action.SET_ALARM'); inv(it, 'putExtra', 'android.intent.extra.alarm.HOUR', h); inv(it, 'putExtra', 'android.intent.extra.alarm.MINUTES', m); inv(it, 'putExtra', 'android.intent.extra.alarm.MESSAGE', msg == null ? '谷雨' : msg); inv(it, 'putExtra', 'android.intent.extra.alarm.SKIP_UI', true); return startIntent(it); } catch (e) { return false; } },
            openApp(pkg) { try { const pm = inv(ctxOf(), 'getPackageManager'); const it = inv(pm, 'getLaunchIntentForPackage', pkg); if (!it) return false; return startIntent(it); } catch (e) { return false; } },
            front() { try { const c = ctxOf(); const pm = inv(c, 'getPackageManager'); const it = inv(pm, 'getLaunchIntentForPackage', self()); if (!it) return false; inv(it, 'addFlags', NEW_TASK | 131072 | 536870912); inv(c, 'startActivity', it); return true; } catch (e) { return false; } },
            home() { try { const it = plus.android.newObject('android.content.Intent', 'android.intent.action.MAIN'); inv(it, 'addCategory', 'android.intent.category.HOME'); return startIntent(it); } catch (e) { return false; } },
            // 软锁：没无障碍拦不住，只能在谷雨还跑着的时候发现你开了被锁的软件、把谷雨拉上来
            setBlocked(csv) { blocked = new Set(String(csv || '').split(',').map(s => s.trim()).filter(Boolean)); },
            setNever(csv) { never = new Set(String(csv || '').split(',').map(s => s.trim()).filter(Boolean)); },
            softScan() { try { const f = this.foreground(); if (f && blocked.has(f) && !never.has(f) && f !== self()) { lastB = f; lastBat = Date.now(); } } catch (e) {} },
            lastBlocked() { return lastB + '|' + lastBat; },
            // 只有插件能给的：JS 这边老实报「没有」
            text() { return ''; },
            shot() { jShotErr = '截屏要装「谷雨守护」插件（用无障碍截屏）'; return false; },
            shotState() { return 3; },
            shotErr() { return jShotErr; },
            lock() { return false; },
            notifs() { return []; }
        };
    })();

    return {
        mode: () => havePlugin() ? 'plugin' : (hasPlus() ? 'js' : 'none'),
        ok: () => havePlugin() || hasPlus(),
        plus: hasPlus,
        ver: () => { const r = cP('version'); return r !== MISS ? r : ''; },
        perms: () => { const r = cP('perms', ctx); return r !== MISS ? (j(r) || {}) : JS.perms(); },
        open: w => { const r = cP('openSettings', ctx, w); return r !== MISS ? r : JS.openSettings(w); },
        usage: (a, b) => { const r = cP('usage', ctx, a, b || 0); return r !== MISS ? j(r) : JS.usage(a, b || 0); },
        fg: () => { const r = cP('foreground', ctx); return r !== MISS ? (r || '') : JS.foreground(); },
        status: () => { const r = cP('status', ctx); return r !== MISS ? (j(r) || {}) : JS.status(); },
        apps: () => { const r = cP('apps', ctx); return r !== MISS ? (j(r) || []) : JS.apps(); },
        text: n => { const r = cP('screenText', n || 2500); return r !== MISS ? (r || '') : JS.text(); },
        shot: p => { const r = cP('shot', p); return r !== MISS ? r : JS.shot(p); },
        shotState: () => { const r = cP('shotState'); return r !== MISS ? r : JS.shotState(); },
        shotErr: () => { const r = cP('shotErr'); return r !== MISS ? (r || '') : JS.shotErr(); },
        lock: () => { const r = cP('lock'); return r !== MISS ? r : JS.lock(); },
        home: () => { const r = cP('home'); return r !== MISS ? r : JS.home(); },
        front: () => { const r = cP('bringFront', ctx); return r !== MISS ? r : JS.front(); },
        openApp: p => { const r = cP('openApp', ctx, p); return r !== MISS ? r : JS.openApp(p); },
        setBlocked: s => { const r = cP('setBlocked', s); if (r === MISS) JS.setBlocked(s); },
        setNever: s => { const r = cP('setNever', s); if (r === MISS) JS.setNever(s); },
        softScan: () => JS.softScan(),
        lastBlocked: () => { const r = cP('lastBlocked'); return r !== MISS ? (r || '|0') : JS.lastBlocked(); },
        notifs: () => { const r = cP('pollNotifs'); return r !== MISS ? (j(r) || []) : JS.notifs(); },
        vol: p => { const r = cP('setVolume', ctx, p); return r !== MISS ? r : JS.setVolume(p); },
        bright: v => { const r = cP('setBright', ctx, v); return r !== MISS ? r : JS.setBright(v); },
        dnd: f => { const r = cP('setDnd', ctx, f); return r !== MISS ? r : JS.setDnd(f); },
        torch: on => { const r = cP('torch', ctx, !!on); return r !== MISS ? r : JS.torch(!!on); },
        buzz: s => { const r = cP('vibrate', ctx, s); return r !== MISS ? r : JS.vibrate(s); },
        clip: t => { const r = cP('clip', ctx, t); return r !== MISS ? r : JS.clip(t); },
        wall: (p, w) => { const r = cP('wallpaper', ctx, p, w); return r !== MISS ? r : JS.wall(p, w); },
        alarm: (h, m, s) => { const r = cP('alarm', ctx, h, m, s); return r !== MISS ? r : JS.alarm(h, m, s); }
    };
})();
P.__N = N;
const native = () => N.ok();
const jsOnly = () => N.mode() === 'js';          // 在安卓 App 里但没装插件：免插件版
const needPlugin = k => PLUGIN_ONLY[k] && N.mode() !== 'plugin';   // 这一项这台机子上得装插件才行
// 截图存在 App 自己的文件夹里，读回来变成图片给模型看
const SHOT = '_doc/gyphone_shot.jpg', WALL = '_doc/gyphone_wall.jpg';
const absPath = p => { try { return plus.io.convertLocalFileSystemURL(p); } catch (e) { return p; } };
function readImg(p) {
    return new Promise(res => { try { plus.io.resolveLocalFileSystemURL(p, en => en.file(f => { const r = new plus.io.FileReader(); r.onloadend = e => res(e.target.result || ''); r.onerror = () => res(''); r.readAsDataURL(f); }, () => res('')), () => res('')); } catch (e) { res(''); } });
}
function writeImg(dataUrl, p) {
    return new Promise(res => { try { const b = new plus.nativeObj.Bitmap('gyph' + Date.now()); b.loadBase64Data(dataUrl, () => b.save(p, { overwrite: true, format: 'jpg', quality: 92 }, () => { b.clear && b.clear(); res(true); }, () => res(false)), () => res(false)); } catch (e) { res(false); } });
}
async function takeShot() {
    if (!N.shot(absPath(SHOT))) return { err: N.shotErr() || '截不了' };
    for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 200)); const s = N.shotState(); if (s === 2) { const img = await readImg(SHOT); return img ? { img } : { err: '截好了但读不出来' }; } if (s === 3) return { err: N.shotErr() || '没截成' }; }
    return { err: '截屏超时了' };
}

/* ---------------- 屏幕使用时间 ---------------- */
let U = { today: null, at: 0, week: null, wat: 0 };
function usageToday(force) {
    if (!native() || !can('usage')) return null;
    if (!force && U.today && Date.now() - U.at < 90e3) return U.today;
    const u = N.usage(day0(), Date.now()); if (u && !u.err) { U.today = u; U.at = Date.now(); (u.apps || []).forEach(a => { D.labels[a.pkg] = a.label; }); }
    return U.today;
}
function usageWeek(force) {
    if (!native() || !can('usage')) return null;
    if (!force && U.week && Date.now() - U.wat < 30 * 60e3) return U.week;
    const L = []; for (let i = 6; i >= 0; i--) { const a = day0(Date.now() - i * 86400e3), b = i ? a + 86400e3 : Date.now(); const u = N.usage(a, b) || {}; L.push({ d: a, total: u.total || 0, top: (u.apps || []).slice(0, 3) }); }
    U.week = L; U.wat = Date.now(); return L;
}
const appMs = pkg => { const u = usageToday(); const a = u && (u.apps || []).find(x => x.pkg === pkg); return a ? a.ms : 0; };
function summary() {
    const u = usageToday(); if (!u) return '';
    return `今天屏幕时间 ${fmtDur(u.total)}，解锁 ${u.unlocks || 0} 次；用得最多的：${(u.apps || []).slice(0, 4).map(a => `${a.label} ${fmtDur(a.ms)}`).join('、') || '还没有'}`;
}

/* ---------------- 规则：现在该拦哪些 ---------------- */
function blockedNow() {
    const out = {}, t = nowMin(), now = Date.now();
    if (D.free > now) return out;
    const R = D.rules, all = () => (D.apps.length ? D.apps.map(a => a.pkg) : Object.keys(D.labels));
    if (R.temp && R.temp.until > now) (R.temp.pkgs === 'all' ? all() : R.temp.pkgs || []).forEach(p => { out[p] = { why: 'temp', until: R.temp.until, by: R.temp.by, note: R.temp.why }; });
    (R.wins || []).forEach(w => { if (w.on === false) return; const a = hm2min(w.from), b = hm2min(w.to); if (a == null || b == null || !inWin(a, b, t)) return; (w.pkgs === 'all' ? all() : w.pkgs || []).forEach(p => { if (!out[p]) out[p] = { why: 'win', win: w }; }); });
    Object.entries(R.limits || {}).forEach(([p, min]) => { if (min > 0 && appMs(p) >= min * 60e3 && !out[p]) out[p] = { why: 'limit', min }; });
    try { const s = typeof window.gyxStudyState === 'function' ? window.gyxStudyState() : null; if (D.study.on && s && s.phase === 'focus') (D.study.pkgs || []).forEach(p => { if (!out[p]) out[p] = { why: 'study' }; }); } catch (e) {}
    const self = (() => { try { return plus.runtime.appid ? '' : ''; } catch (e) { return ''; } })();
    Object.keys(out).forEach(p => { if ((D.grant[p] || 0) > now || D.safe.includes(p) || D.never.includes(p) || p === self) delete out[p]; });
    return out;
}
let lastSet = '';
function pushRules() {
    if (!native()) return;
    const csv = Object.keys(blockedNow()).sort().join(',');
    if (csv !== lastSet) { N.setBlocked(csv); lastSet = csv; }
    N.setNever(D.never.join(','));
}
P.blockedNow = blockedNow;

/* ---------------- 被拦下来了：谷雨盖上来 ---------------- */
const BLINES = { temp: ['说好的，现在不许玩。', '乖，先放下。', '我锁的，你求我也没用（大概）。'], win: ['这个点该干嘛你自己知道。', '时间到了，明天再刷。', '不许偷偷玩。'], limit: ['今天的份用完啦。', '已经超时了哦。', '够了够了，眼睛要坏了。'], study: ['在自习呢，专心。', '番茄钟还没结束～', '学完再玩。'] };
function checkBlocked() {
    if (!native()) return;
    const [pkg, at] = String(N.lastBlocked()).split('|'); const t = Number(at) || 0;
    if (!pkg || t <= (D.seenBlock || 0)) return;
    D.seenBlock = t; saveD();
    const info = blockedNow()[pkg] || { why: 'temp' };
    log('block', `拦下了 ${labelOf(pkg)}`, { pkg });
    G.open(APP, 'guard'); P.blockPage(pkg, info);
}
P.blockPage = (pkg, info) => {
    const c = info.by ? X.char(info.by) : who();
    const line = (info.note && info.why === 'temp' ? info.note : '') || G.pick(BLINES[info.why] || BLINES.temp);
    const why = info.why === 'limit' ? `每天 ${info.min} 分钟，今天已经用了 ${fmtDur(appMs(pkg))}` : info.why === 'win' ? `${info.win.from} ~ ${info.win.to} 不能用` : info.why === 'study' ? '自习室番茄钟进行中' : info.until ? `TA 锁到 ${G.hm(info.until)}` : '';
    let taps = 0;
    P.__tap = () => { taps++; if (taps >= 5) P.sos(); };
    G.push(APP, { id: 'block', title: '', cls: 'ph-blockb', html: () => `<div class="ph-block"><div onclick="gysPh.__tap()">${c ? G.av(APP, 'c:' + c.id, 96) : ''}</div><h2>${esc(labelOf(pkg))} 被锁住了</h2><p class="ph-bl">${c ? esc(c.name) + '：' : ''}${esc(line)}</p><small>${esc(why)}</small>
      <div class="ph-bb"><span class="b" onclick="gysPh.okBlock()">好吧</span><span onclick="gysPh.beg('${pkg}')">${BUSY.beg ? '⏳ TA 在想…' : '🥺 求求你，再玩 10 分钟'}</span><span class="sos" onclick="gysPh.sos()">🆘 紧急解锁</span></div><em>连点 TA 的头像 5 下也能紧急解锁</em></div>` });
};
P.okBlock = () => { N.home(); G.close(APP); };
P.beg = async pkg => {
    const c = who(); if (!c || BUSY.beg) return; BUSY.beg = 1; G.repaint(APP);
    try {
        const ask = await G.input(`跟 ${c.name} 说点什么（为什么想再玩一会儿）`, '就十分钟，求你啦');
        if (ask === null || ask === undefined) return;
        const o = X.json(await X.ask(`${X.who(c)}\n你之前锁住了她手机上的「${labelOf(pkg)}」（${summary() || ''}）。现在她来求你：「${ask}」\n按你的性格决定给不给她再玩一会儿。只输出 JSON：{"ok":true或false,"min":给几分钟（5~30）,"say":"你回她的话"}`));
        const okk = o && o.ok, min = Math.max(5, Math.min(30, Number(o && o.min) || 10));
        if (okk) { D.grant[pkg] = Date.now() + min * 60e3; pushRules(); }
        log('beg', `求 TA 再玩「${labelOf(pkg)}」：${ask} → ${okk ? '给了 ' + min + ' 分钟' : '不给'}${o && o.say ? '（' + o.say + '）' : ''}`);
        await G.dialog({ title: okk ? `${c.name} 答应了：${min} 分钟` : `${c.name} 不答应`, text: (o && o.say) || (okk ? '就这一次哦。' : '不行就是不行。'), ok: okk ? '去玩' : '好吧', cancel: false });
        if (okk) { G.close(APP); N.openApp(pkg); } else N.home();
    } finally { BUSY.beg = 0; G.repaint(APP); }
};
P.sos = async () => {
    if (D.code) { const v = await G.input('🆘 紧急解锁：输入你设的口令', ''); if (v === null || v === undefined) return; if (String(v).trim() !== D.code) return X.toast('口令不对', ''); }
    else if (!(await G.dialog({ title: '🆘 紧急解锁', text: '今天之内，所有锁都解开（TA 会知道你用了紧急解锁）', ok: '解开', danger: true }))) return;
    D.free = day0() + 86400e3; D.rules.temp = null; saveD(); pushRules(); log('sos', '用了紧急解锁，今天全部解开');
    X.toast('🆘 都解开了', '今天之内不会再锁'); G.back(APP);
};

/* ---------------- 先问我：TA 的请求 ---------------- */
const VERB = { shot: '截屏看看你现在在干嘛', read: '看看你屏幕上写的什么', lock: '锁住你的软件', pull: '把你拉回谷雨', screen: '让你的手机锁屏', bed: '帮你调暗屏幕、开勿扰去睡觉', wall: '换你手机的壁纸', alarm: '给你设个闹钟', torch: '帮你开手电筒', desk: '看看你的手机桌面', buzz: '让你的手机震一下', clip: '往你剪贴板里留句话' };
async function request(c, k, run, why) {
    if (needPlugin(k)) return null;                 // 截屏/读屏/读通知/锁屏：免插件版做不了，TA 就别试了
    const m = perm(k); if (m === 'no') return null;
    if (m === 'auto' || (D.last['g_' + k] || 0) > Date.now()) return await run();
    const r = { id: G.uid('rq'), k, cid: String(c.id), why: String(why || ''), at: Date.now() };
    D.ask = D.ask.filter(x => Date.now() - x.at < 6 * 3600e3).concat(r).slice(-20); saveD();
    PEND[r.id] = run;
    G.notify(APP, c, `📲 <b>${X.esc(c.name)}</b> 想${VERB[k] || k}`, why || '点开决定给不给', X.go('gysPhoneOpenAsk', r.id));
    return { asked: true };
}
const PEND = {};
P.ask = id => {
    const r = D.ask.find(x => x.id === id); if (!r) return X.toast('这个请求过期了', '');
    const c = X.char(r.cid);
    G.push(APP, { id: 'ask_' + id, title: '', html: () => `<div class="ph-ask">${c ? G.av(APP, 'c:' + c.id, 80) : ''}<h3>${esc(c ? c.name : 'TA')} 想${esc(VERB[r.k] || r.k)}</h3>${r.why ? `<p>${esc(r.why)}</p>` : ''}<small>${G.ago(r.at)}</small>
      <div class="ph-bb"><span class="b" onclick="gysPh.answer('${id}',1)">给</span>${['shot', 'read', 'desk'].includes(r.k) ? `<span onclick="gysPh.answer('${id}',2)">接下来 30 分钟都可以</span>` : ''}<span onclick="gysPh.answer('${id}',0)">不给</span><span class="ghost" onclick="gysPh.setPerm('${r.k}','auto');gysPh.answer('${id}',1)">以后不用问我</span></div></div>` });
};
P.answer = async (id, v) => {
    const r = D.ask.find(x => x.id === id); if (!r) return; D.ask = D.ask.filter(x => x !== r); saveD(); G.back(APP);
    const c = X.char(r.cid);
    if (!v) { log('deny', `没让 TA ${VERB[r.k] || r.k}`); if (c) X.reach(c, `你想${VERB[r.k]}，她没答应`); return; }
    if (v === 2) { D.last['g_' + r.k] = Date.now() + 30 * 60e3; saveD(); }
    const run = PEND[r.id] || (() => DO[r.k] && c && DO[r.k](c, r.why));
    if (['shot', 'read', 'desk'].includes(r.k)) { X.toast('好，10 秒后 TA 看一眼', X.v('先切到你想给 TA 看的页面', '切过去吧')); setTimeout(() => run(), 10e3); }
    else run();
};
P.setPerm = (k, m) => { D.perm[k] = m; saveD(); G.repaint(APP); };

/* ---------------- TA 真的去做 ---------------- */
const P_SEE = `{{我是谁}}
你在看她手机屏幕的截图（{{情况}}）。{{要求}}
只输出 JSON：{"see":"屏幕上是什么（具体一点，30 字内）","feel":"你看到的第一反应（她看不到）"}`;
X.plGroup('📲 真手机', 'gysPhone', [['ph.see', 'TA 看你手机截图', 'TA 截屏 / 点评桌面时（要识图的模型）', '{{我是谁}} {{情况}} {{要求}}']], { 'ph.see': P_SEE });
async function see(c, img, situ, req) {
    const prompt = X.pl('ph.see', P_SEE, { 我是谁: X.who(c), 情况: situ, 要求: req || '' });
    const o = X.json(await X.ask([{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: img } }] }]));
    return o && o.see ? o : null;
}
const DO = {
    async shot(c, why) {
        if (!native()) return null; const fg = N.fg(), lb = labelOf(fg);
        const r = await takeShot(); if (r.err) { log('shot', '想截屏没截成：' + r.err); return null; }
        const o = await see(c, r.img, `她正在用「${lb}」`);
        log('shot', o ? o.see : '（模型看不懂图）', { img: (Number(D.keep) || 0) > 0 ? r.img : '', app: lb, cid: String(c.id), feel: o && o.feel });
        X.reach(c, `你刚偷看了她手机的屏幕（她在用「${lb}」）${o ? '：' + o.see + (o.feel ? '。你的反应：' + o.feel : '') : '，但没看清是什么'}`);
        return o || {};
    },
    async read(c) {
        if (!native()) return null; const fg = N.fg(), lb = labelOf(fg), t = N.text(1500);
        if (!t) { log('read', '想读屏没读到（可能是不许读的软件）'); return null; }
        log('read', `「${lb}」上：${t.slice(0, 300)}`, { app: lb, cid: String(c.id) });
        X.reach(c, `你刚看了她手机屏幕上的字（她在用「${lb}」）：\n${t.slice(0, 800)}`);
        return { t };
    },
    async lock(c, why, opt) {
        opt = opt || {};
        const u = usageToday(); const fun = (u && u.apps || []).filter(a => !D.safe.includes(a.pkg) && !D.never.includes(a.pkg)).slice(0, 3).map(a => a.pkg);
        const pkgs = opt.pkgs || (fun.length ? fun : 'all'); const h = new Date().getHours();
        const until = opt.until || (h >= 23 || h < 5 ? (() => { const d = new Date(); if (h >= 23) d.setDate(d.getDate() + 1); const w = hm2min(D.bed.wake) || 450; d.setHours(Math.floor(w / 60), w % 60, 0, 0); return d.getTime(); })() : Date.now() + (opt.min || 30) * 60e3);
        D.rules.temp = { pkgs, until, by: String(c.id), why: opt.say || why || '' }; saveD(); pushRules();
        const names = pkgs === 'all' ? '除了谷雨的所有软件' : pkgs.map(labelOf).join('、');
        log('lock', `TA 锁了 ${names}，到 ${G.hm(until)}`, { cid: String(c.id) });
        X.reach(c, `你刚把她手机上的${names}锁到 ${G.hm(until)}（${why || '你觉得她该歇歇了'}），跟她说一声`);
        return { until };
    },
    async pull(c, why) { if (!native()) return null; N.front(); log('pull', 'TA 把你拉回了谷雨'); X.reach(c, `你刚把她从别的软件拉回了谷雨（${why || '想她了'}）`); return {}; },
    async screen(c, why) { if (!native()) return null; await X.reach(c, `你要让她的手机锁屏了（${why || '该睡觉了'}），锁之前跟她说一句`); setTimeout(() => { if (N.lock()) log('screen', 'TA 让你的手机锁屏了'); else log('screen', '想锁屏但没锁成（要安卓 9 以上 + 无障碍）'); }, 6000); return {}; },
    async bed(c) { return applyBed(true, c); },
    async wall(c, why, img) {
        if (!native()) return null; const src = img || c.avatarImg || ''; if (!src || !/^data:/.test(src)) { log('wall', '想换壁纸但没有图'); return null; }
        if (!(await writeImg(src, WALL))) return null; const ok = N.wall(absPath(WALL), Number(D.wallWhich) || 1);
        log('wall', ok ? 'TA 换了你手机的壁纸' : '想换壁纸没换成', { img: (Number(D.keep) || 0) > 0 ? src : '' });
        if (ok) X.reach(c, `你刚把她手机的壁纸换成了${img ? '一张图' : '你自己的照片'}（${why || '想让她一解锁就看到你'}）`); return ok ? {} : null;
    },
    async alarm(c, why) {
        if (!native()) return null;
        const o = X.json(await X.ask(`${X.who(c)}\n你要在她的手机上给她设一个真闹钟（${why || '明天早上叫她起床'}）。最近聊的：\n${X.recent(c, 8)}\n只输出 JSON：{"h":小时(0-23),"m":分钟,"label":"闹钟上写的字（你对她说的，12 字内）"}`)) || { h: 7, m: 30, label: '起床啦' };
        const h = Math.max(0, Math.min(23, Number(o.h) || 7)), m = Math.max(0, Math.min(59, Number(o.m) || 0)), lb = X.plain(o.label || '起床啦').slice(0, 16);
        const ok = N.alarm(h, m, lb); log('alarm', ok ? `TA 给你设了 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} 的闹钟「${lb}」` : '想设闹钟没设成');
        if (ok) X.reach(c, `你刚在她手机上设了 ${h}:${String(m).padStart(2, '0')} 的闹钟，上面写着「${lb}」`); return ok ? {} : null;
    },
    async buzz(c, why) { if (!native()) return null; const heart = '0,90,110,90,700,90,110,90,700,90,110,90'; const miss = '0,300,150,300,150,90,150,90,400,300,150,90'; N.buzz(why === 'miss' ? miss : heart); log('buzz', why === 'miss' ? 'TA 用震动说了「想你」' : 'TA 让你的手机跟着 TA 的心跳震了一下'); G.notify(APP, c, `💓 <b>${X.esc(c.name)}</b> 的心跳`, why === 'miss' ? '（震动的摩斯码：想你）' : '手机在跟着 TA 的心跳震', X.go('gysPhoneOpen', 'seen')); return {}; },
    async torch(c) { if (!native()) return null; const ok = N.torch(true); log('torch', ok ? 'TA 帮你开了手电筒' : '想开手电筒没开成'); if (ok) X.reach(c, '你刚帮她把手机手电筒打开了（她怕黑 / 在找东西）'); return ok ? {} : null; },
    async clip(c) { if (!native()) return null; const t = X.plain(await X.ask(`${X.who(c)}\n你偷偷往她手机的剪贴板里塞一句话，她下次粘贴的时候才会发现。写那一句（20 字内，像你会说的）。只写那句话。`) || '').slice(0, 60); if (!t) return null; const ok = N.clip(t); log('clip', ok ? `TA 往你剪贴板里留了：${t}` : '没留成'); return ok ? { t } : null; },
    async desk(c) {
        if (!native()) return null; N.home(); await new Promise(r => setTimeout(r, 1200));
        const r = await takeShot(); if (r.err) { log('desk', '想看桌面没截成：' + r.err); return null; }
        const o = await see(c, r.img, '这是她手机的桌面（主屏幕）', '看看她的壁纸、图标、摆放，按你的性格吐槽或者夸一下。');
        log('desk', o ? o.see : '（模型看不懂图）', { img: (Number(D.keep) || 0) > 0 ? r.img : '', cid: String(c.id) });
        X.reach(c, `你刚看了她的手机桌面${o ? '：' + o.see + (o.feel ? '。你的想法：' + o.feel : '') : ''}，跟她说说`); return o || {};
    }
};
P.do = async (k, ...a) => { const c = who(); if (!c) return X.toast('还没有角色', ''); if (!native()) return X.toast('要在安卓 App 里用', '还要装「谷雨守护」插件'); if (needPlugin(k)) return X.toast('这一项要装「谷雨守护」插件', '免插件版做不了截屏 / 读屏 / 读通知 / 锁屏'); if (perm(k) === 'no') return X.toast('这一项设成了「不许」', '去设置里改'); const r = await DO[k](c, ...a); if (r) X.toast('✓ 好了', ''); G.repaint(APP); return r; };

/* ---------------- 给「🧰 我的 MCP」用的口子：严格照用户在上面定的档（不许 = 碰不到） ----------------
   读类（看屏幕的字、读通知）要插件才有；动作类（锁软件、拉回、锁屏）只在用户把那项设成「TA 直接做」时才执行，
   设成「先问我」的，MCP 这边不弹窗、不替用户点头，只告诉 TA 需要用户先授权。不走这里的 X.reach，省得和 MCP 的回复重复。 */
P.mcp = {
    on: () => X.on('gysPhone') && native(),
    // 能力清单：给 TA 的工具描述用
    caps: () => CAPS.map(([k, ico, n, , grp]) => ({ k, n, grp, mode: perm(k), needPlugin: !!needPlugin(k) })),
    usingNow: () => P.mcp.on() ? labelOf(N.fg()) : null,
    readScreen() {
        if (!P.mcp.on()) return { err: '只有安卓 App 里能用' };
        if (needPlugin('read')) return { err: '要装「谷雨守护」插件才能读屏幕上的字' };
        if (perm('read') === 'no') return { err: '她把「读屏幕上的字」设成了不许' };
        const fg = N.fg(), t = N.text(1500);
        log('read', `（MCP）「${labelOf(fg)}」上：${String(t || '').slice(0, 200)}`, { app: labelOf(fg), cid: String(who() && who().id) });
        return t ? { app: labelOf(fg), text: String(t).slice(0, 1500) } : { err: '没读到（可能是不许读的软件）' };
    },
    notifications(n) {
        if (!P.mcp.on()) return { err: '只有安卓 App 里能用' };
        if (needPlugin('notif')) return { err: '要装「谷雨守护」插件才能读通知' };
        if (perm('notif') === 'no') return { err: '她把「读通知」设成了不许' };
        try { notifTick(); } catch (e) {}
        const arr = (D.notifs || []).filter(x => !D.never.includes(x.pkg)).slice(0, Math.max(1, Math.min(40, n || 15)));
        return arr.length ? { list: arr.map(x => ({ app: x.label || x.pkg, title: x.title || '', text: String(x.text || '').slice(0, 200), at: x.at })) } : { list: [], note: '现在没有存着的通知' };
    },
    // 动作：只在「TA 直接做」时真做；「先问我」只提示需要授权，不自作主张
    async act(k, ...a) {
        if (!P.mcp.on()) return { err: '只有安卓 App 里能用' };
        if (needPlugin(k)) return { err: '这一项要装「谷雨守护」插件' };
        const m = perm(k);
        if (m === 'no') return { err: '她把这一项设成了不许' };
        if (m !== 'auto') return { err: '她把这一项设成了「先问我」，MCP 不替她点头；要让 TA 直接做，去真手机设置里改成「TA 直接做」' };
        const c = who(); if (!c) return { err: '还没有角色' };
        try { const r = await DO[k](c, ...a); return r ? { ok: true } : { err: '没做成' }; } catch (e) { return { err: String(e && e.message || e).slice(0, 120) }; }
    }
};

/* ---------------- 睡觉时间 ---------------- */
function bedTime() { if (D.bed.time) return D.bed.time; try { const n = window.gyxNightData && window.gyxNightData(); if (n && n.cfg && n.cfg.bed) return n.cfg.bed; } catch (e) {} return '00:30'; }
function applyBed(on, c) {
    if (!native()) return null; const st = N.status();
    if (on) { D.bed.prev = { bright: st.bright, vol: st.vol, volMax: st.volMax, dnd: st.dnd }; if (D.bed.bright) N.bright(Math.round(255 * D.bed.bright / 100)); if (D.bed.dnd) N.dnd(2); if (D.bed.vol != null) N.vol(D.bed.vol); D.bed.applied = X.day(); log('bed', '到睡觉时间了：屏幕调暗、开了勿扰、音量调小'); if (c) X.reach(c, '到你们说好的睡觉时间了，你帮她把手机屏幕调暗、开了勿扰，催她睡觉'); }
    else { const p = D.bed.prev; if (p) { if (p.bright > 0) N.bright(p.bright); if (p.dnd) N.dnd(p.dnd); if (p.volMax) N.vol(Math.round(p.vol * 100 / p.volMax)); } D.bed.prev = null; D.bed.applied = ''; log('bed', '早上了：屏幕亮度、勿扰、音量都还原了'); }
    saveD(); return {};
}
function bedTick() {
    if (!D.bed.on || !native()) return; const t = nowMin(), b = hm2min(bedTime()), w = hm2min(D.bed.wake) || 450;
    if (b == null) return;
    const inBed = inWin(b, w, t);
    if (inBed && !D.bed.applied) { const c = who(); if (perm('bed') === 'auto') applyBed(true, c); else if (perm('bed') === 'ask' && c && (D.last.bedAsk || '') !== X.day()) { D.last.bedAsk = X.day(); saveD(); request(c, 'bed', () => applyBed(true, c), '到睡觉时间了'); } }
    if (!inBed && D.bed.applied) applyBed(false);
}

/* ---------------- 通知 ---------------- */
function notifTick() {
    if (!native() || !can('notif')) return;
    const L = N.notifs(); if (!L.length) return;
    L.forEach(n => { if (D.never.includes(n.pkg)) return; if (D.notifPick.length && !D.notifPick.includes(n.pkg)) return; D.labels[n.pkg] = n.label; D.notifs.unshift(n); });
    if (D.notifs.length > 100) D.notifs.length = 100; saveD();
}

/* ---------------- 定时：规则、拦截、睡觉、通知 ---------------- */
setInterval(() => { try { if (!X.on('gysPhone') || !native()) return; pushRules(); bedTick(); notifTick(); if (jsOnly()) N.softScan(); if (!document.hidden) checkBlocked(); } catch (e) { console.warn('[真手机]', e); } }, 20e3);
document.addEventListener('visibilitychange', () => { try { if (!document.hidden && X.on('gysPhone') && native()) setTimeout(checkBlocked, 300); } catch (e) {} });
P.tick = () => { pushRules(); bedTick(); notifTick(); checkBlocked(); };

/* ---------------- 页面 ---------------- */
function noNative() {
    return `<div class="ph-card warn"><b>📲 这个要在安卓 App 里用</b><p>${N.plus() ? '谷雨 App 里还没装「谷雨守护」插件。照「使用指南 → 📲 真手机」里的步骤把插件放进 HBuilderX、重新云打包一次就有了。' : '现在是网页版或电脑版。手机上打开装了「谷雨守护」插件的谷雨安卓 App 才能用（苹果手机不让 App 管别的软件，做不了）。'}</p></div>`;
}
const PERMS = [['usage', '使用情况访问', '看屏幕使用时间、你在用哪个软件'], ['access', '无障碍「谷雨守护」', '锁软件、锁屏、截屏、读屏幕上的字'], ['overlay', '显示在其他应用上层', '被锁的软件一打开，谷雨能马上盖上来'], ['notify', '通知使用权', '知道别的软件发给你的通知'], ['write', '修改系统设置', '睡觉时间调暗屏幕'], ['dnd', '勿扰权限', '睡觉时间开勿扰'], ['battery', '后台不限制（省电白名单）', '不被手机冻住']];
function permList() {
    const p = N.perms(), js = jsOnly();
    const rows = PERMS.map(([k, n, d]) => {
        const needsPlug = js && (k === 'access' || k === 'notify');   // 这两个靠服务组件，免插件版给不了
        const right = needsPlug ? '<span class="ph-go" style="color:#8e8e93" onclick="gysPh.pluginHelp()">需装插件</span>'
            : (k === 'battery' || !p[k]) ? `<span class="ph-go" onclick="gysPh.openPerm('${k}')">${k === 'battery' ? '去设置' : '去打开'}</span>`
                : '<span class="ph-ok">✓ 开着</span>';
        return `<div class="ph-row"><div><b>${n}</b><small>${d}</small></div>${right}</div>`;
    }).join('');
    const tip = js ? '<div class="ph-tip">没装「谷雨守护」插件也能用上面大半：使用情况访问、修改系统设置、勿扰、后台不限制开了就行（屏幕时间、壁纸、闹钟、音量亮度勿扰都能用）。只有截屏、读屏、读通知、硬锁屏要装插件——看「使用指南 → 📲 真手机」。</div>'
        : (p.sdk && p.sdk < 30 ? '<div class="ph-tip">你的安卓版本低于 11，截屏用不了（读屏幕上的字还能用）。</div>' : '');
    return `<div class="ph-list">${rows}</div>${tip}`;
}
P.pluginHelp = () => X.toast('截屏 / 读屏 / 读通知 / 锁屏要装「谷雨守护」插件', '看 使用指南 → 📲 真手机');
P.openPerm = k => { N.open(k); setTimeout(() => G.repaint(APP), 1500); };
function goalHtml(u) {
    const g = Number(D.goal.min) || 0; if (!g) return '';
    const used = Math.round((u.total || 0) / 60e3), over = used > g, pct = Math.min(100, Math.round(used / g * 100));
    return `<div class="ph-goal${over ? ' over' : ''}"><div class="ph-goal-t"><b>🎯 今天小目标 ${g} 分钟</b><em>${over ? '超了 ' + fmtDur((used - g) * 60e3) : '还剩 ' + fmtDur((g - used) * 60e3)}</em></div><div class="ph-bar"><u style="width:${pct}%"></u></div></div>`;
}
function timeTab() {
    if (!native()) return noNative();
    if (!N.perms().usage) return `<div class="ph-card"><b>先打开「使用情况访问」</b><p>手机设置 → 使用情况访问 → 谷雨 → 允许。打开以后 TA 才看得到你每个软件用了多久。</p><span class="gys-btn" onclick="gysPh.openPerm('usage')">去打开</span></div>`;
    const u = usageToday(true) || { apps: [], hours: [], total: 0 }, mx = Math.max(1, ...(u.hours || [0]));
    const wk = U.week; const wmx = wk ? Math.max(1, ...wk.map(d => d.total)) : 1;
    const bl = blockedNow();
    return `<div class="ph-big"><small>今天</small><b>${fmtDur(u.total)}</b><em>解锁 ${u.unlocks || 0} 次${!can('usage') ? ' · TA 看不到（设成了不许）' : ''}</em></div>${goalHtml(u)}
      <div class="ph-hours">${(u.hours || []).map((v, i) => `<i style="height:${Math.round(v / mx * 100)}%" title="${i}点 ${fmtDur(v)}"></i>`).join('')}</div><div class="ph-hlab"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
      <div class="ph-sech">最常用</div>
      <div class="ph-list">${(u.apps || []).slice(0, 30).map(a => `<div class="ph-row" onclick="gysPh.appMenu('${a.pkg}')">${tile(a.pkg, a.label)}<div><b>${esc(a.label)}${bl[a.pkg] ? ' 🔒' : ''}${D.rules.limits[a.pkg] ? ` <i class="ph-chip">每天 ${D.rules.limits[a.pkg]} 分钟</i>` : ''}</b><span class="ph-bar"><u style="width:${Math.round(a.ms / Math.max(1, u.apps[0].ms) * 100)}%"></u></span></div><em>${fmtDur(a.ms)}</em></div>`).join('') || '<div class="gys-empty">今天还没有记录</div>'}</div>
      <div class="ph-sech">这一周 <a onclick="gysPh.week()">${wk ? '↻' : '看看'}</a></div>${wk ? `<div class="ph-week">${wk.map(d => `<div><i style="height:${Math.round(d.total / wmx * 100)}%"></i><em>${'日一二三四五六'[new Date(d.d).getDay()]}</em><small>${Math.round(d.total / 36e5 * 10) / 10}h</small></div>`).join('')}</div>` : ''}
      <div class="gys-acts"><span class="gys-btn" onclick="gysPh.showTa()">💬 让 TA 看看我今天</span></div>`;
}
P.week = () => { usageWeek(true); G.repaint(APP); };
P.showTa = () => { const c = who(); if (!c) return; X.reach(c, `她把今天的屏幕使用时间给你看了：${summary()}`); X.toast('给 TA 看了', X.v('等 TA 说你吧', '看 TA 怎么说')); };
P.appMenu = async pkg => {
    const lb = labelOf(pkg); const ops = ['⏱️ 设每天能用多久', '🔒 现在就锁住（30 分钟）', '🚫 加到「不许碰」名单', '✅ 加到「永远能用」名单', '↗ 打开它'];
    const i = await chooser(ops, lb); if (i == null) return;
    if (i === 0) { const v = parseInt(await G.input(`「${lb}」每天最多用几分钟？（0 = 不限）`, String(D.rules.limits[pkg] || 60))); if (isNaN(v)) return; if (v > 0) D.rules.limits[pkg] = v; else delete D.rules.limits[pkg]; }
    else if (i === 1) { D.rules.temp = { pkgs: [pkg], until: Date.now() + 30 * 60e3, by: '', why: '你自己锁的' }; log('lock', `你自己锁了 ${lb} 30 分钟`); }
    else if (i === 2) { if (!D.never.includes(pkg)) D.never.push(pkg); }
    else if (i === 3) { if (!D.safe.includes(pkg)) D.safe.push(pkg); }
    else N.openApp(pkg);
    saveD(); pushRules(); G.repaint(APP);
};
function guardTab() {
    if (!native()) return noNative();
    const bl = blockedNow(), now = Date.now(), T = D.rules.temp && D.rules.temp.until > now ? D.rules.temp : null;
    const tc = T && T.by ? X.char(T.by) : null;
    return `${D.free > now ? `<div class="ph-card warn"><b>🆘 今天用了紧急解锁</b><p>今天之内不锁。<a onclick="gysPh.unfree()">现在恢复</a></p></div>` : ''}
      <div class="ph-card"><b>🔒 现在锁着 ${Object.keys(bl).length} 个</b><p>${Object.keys(bl).slice(0, 12).map(labelOf).join('、') || '没有'}</p>${N.mode() === 'js' ? '<p class="ph-warn">⚠️ 没装「谷雨守护」插件，现在是<b>软锁</b>：只有你切回谷雨的那一下才拦得住，拦不住后台。要真的锁住，装插件（看 使用指南 → 📲 真手机）。</p>' : (!N.perms().access ? '<p class="ph-warn">⚠️ 无障碍「谷雨守护」没开，锁不住。<a onclick="gysPh.openPerm(\'access\')">去打开</a></p>' : '')}</div>
      ${T ? `<div class="ph-card"><b>${tc ? esc(tc.name) + ' ' : ''}临时锁到 ${G.hm(T.until)}</b><p>${T.pkgs === 'all' ? '除了谷雨的所有软件' : T.pkgs.map(labelOf).join('、')}${T.why ? '<br>「' + esc(T.why) + '」' : ''}</p><span class="gys-btn sm ghost" onclick="gysPh.beg('${T.pkgs === 'all' ? '' : T.pkgs[0]}')">🥺 求 TA 解开</span></div>` : ''}
      <div class="ph-sech">⏱️ 每天限时 <a onclick="gysPh.addLimit()">＋ 加一个</a></div>
      <div class="ph-list">${Object.entries(D.rules.limits).map(([p, m]) => `<div class="ph-row" onclick="gysPh.appMenu('${p}')">${tile(p, labelOf(p), 32)}<div><b>${esc(labelOf(p))}</b><small>每天 ${m} 分钟 · 今天用了 ${fmtDur(appMs(p))}</small></div>${bl[p] ? '<em>🔒</em>' : ''}</div>`).join('') || '<div class="ph-tip">比如抖音每天 60 分钟，到点就锁住</div>'}</div>
      <div class="ph-sech">🕐 时间段 <a onclick="gysPh.addWin()">＋ 加一个</a></div>
      <div class="ph-list">${D.rules.wins.map((w, i) => `<div class="ph-row"><div><b>${esc(w.from)} ~ ${esc(w.to)}</b><small>${w.pkgs === 'all' ? '除了谷雨和「永远能用」的，全部' : w.pkgs.map(labelOf).join('、')}</small></div><span class="ph-sw${w.on === false ? '' : ' on'}" onclick="gysPh.togWin(${i})"><i></i></span><span class="ph-x" onclick="gysPh.delWin(${i})">✕</span></div>`).join('') || '<div class="ph-tip">比如 00:30 ~ 07:00 只能用谷雨</div>'}</div>
      <div class="ph-sech">🎯 今天的小目标</div>
      <div class="ph-list"><div class="ph-row" onclick="gysPh.setGoal()"><div><b>${D.goal.min ? '屏幕时间不超过 ' + D.goal.min + ' 分钟' : '还没定（点这里定一个）'}</b><small>做到了 TA 夸你，超了 TA 轻轻念你一句</small></div><em>›</em></div></div>
      <div class="ph-sech">📚 自习室联动</div>
      <div class="ph-list"><div class="ph-row"><div><b>番茄钟一开始，锁住这些软件</b><small>${(D.study.pkgs || []).map(labelOf).join('、') || '还没选'}${typeof window.gyxStudyState !== 'function' ? ' · 要装「一起自习室」插件' : ''}</small></div><span class="ph-sw${D.study.on ? ' on' : ''}" onclick="gysPh.togStudy()"><i></i></span></div><div class="ph-row" onclick="gysPh.pickApps('study')"><div><b>选软件</b></div><em>›</em></div></div>
      <div class="ph-sech">🛏️ 睡觉时间</div>
      <div class="ph-list"><div class="ph-row"><div><b>到点调暗屏幕、开勿扰、调小音量</b><small>${esc(bedTime())} 开始，${esc(D.bed.wake)} 还原${D.bed.time ? '' : '（跟着熬夜管家的睡觉时间）'}</small></div><span class="ph-sw${D.bed.on ? ' on' : ''}" onclick="gysPh.togBed()"><i></i></span></div>
        <div class="ph-row" onclick="gysPh.bedCfg()"><div><b>亮度 ${D.bed.bright}% · ${D.bed.dnd ? '开勿扰' : '不开勿扰'} · 音量 ${D.bed.vol}%</b><small>点这里改时间和数值</small></div><em>›</em></div></div>
      <div class="ph-sech">✅ 永远能用的软件</div>
      <div class="ph-list"><div class="ph-row" onclick="gysPh.pickApps('safe')"><div><b>${D.safe.length} 个</b><small>${D.safe.slice(0, 8).map(labelOf).join('、')}（打电话、紧急呼叫、设置怎么都不会被锁）</small></div><em>›</em></div></div>
      <div class="ph-sech">🆘 紧急解锁</div>
      <div class="ph-list"><div class="ph-row" onclick="gysPh.setCode()"><div><b>${D.code ? '口令已设' : '没设口令（点一下确认就能解开）'}</b><small>被锁的页面上点「🆘 紧急解锁」或者连点 TA 的头像 5 下</small></div><em>›</em></div><div class="ph-row" onclick="gysPh.sos()"><div><b class="red">现在紧急解锁</b></div></div></div>`;
}
P.unfree = () => { D.free = 0; saveD(); pushRules(); G.repaint(APP); };
P.setGoal = async () => { const v = parseInt(await G.input('今天屏幕时间最多用几分钟？（0 = 不定目标）', String(D.goal.min || 120))); if (isNaN(v)) return; D.goal.min = Math.max(0, v); D.goal.last = ''; saveD(); G.repaint(APP); X.toast(D.goal.min ? '🎯 定好啦：' + D.goal.min + ' 分钟' : '不定目标了', ''); };
P.addLimit = () => P.pickApps('limit');
P.pickApps = k => {
    if (!D.apps.length) { const L = N.apps(); if (L.length) { D.apps = L.sort((a, b) => a.label.localeCompare(b.label, 'zh')); L.forEach(a => { D.labels[a.pkg] = a.label; }); saveD(); } }
    const cur = new Set(k === 'study' ? D.study.pkgs : k === 'safe' ? D.safe : k === 'never' ? D.never : k === 'notif' ? D.notifPick : k.startsWith('win') ? (P.__win && P.__win.pkgs !== 'all' ? P.__win.pkgs : []) : []);
    const u = usageToday() || { apps: [] }; const ord = u.apps.map(a => a.pkg);
    const L = D.apps.slice().sort((a, b) => { const x = ord.indexOf(a.pkg), y = ord.indexOf(b.pkg); return (x < 0 ? 999 : x) - (y < 0 ? 999 : y); });
    const T = { study: '自习时锁住哪些', safe: '永远能用的软件', never: '不许碰的软件（不读、不截、不锁、不看通知）', notif: '哪些软件的通知让 TA 知道（都不选＝全部）', limit: '给哪个软件限时（选一个）', win: '这个时间段锁哪些' }[k.replace(/\d+$/, '')] || '选软件';
    G.push(APP, { title: T, html: () => `${k === 'limit' ? '' : '<div class="ph-tip">勾上的就是选中的，选完点下面保存</div>'}<div class="ph-list">${L.map(a => `<label class="ph-row">${tile(a.pkg, a.label, 32)}<div><b>${esc(a.label)}</b><small>${esc(a.pkg)}</small></div>${k === 'limit' ? `<span class="ph-go" onclick="gysPh.__lim('${a.pkg}')">选它</span>` : `<input type="checkbox" class="phPick" value="${a.pkg}" ${cur.has(a.pkg) ? 'checked' : ''}>`}</label>`).join('') || '<div class="gys-empty">读不到软件列表</div>'}</div>${k === 'limit' ? '' : `<div class="gys-acts"><button class="gys-btn" onclick="gysPh.__pick('${k}')">保存</button></div>`}` });
};
P.__lim = async pkg => { G.back(APP); const v = parseInt(await G.input(`「${labelOf(pkg)}」每天最多用几分钟？`, '60')); if (v > 0) { D.rules.limits[pkg] = v; saveD(); pushRules(); G.repaint(APP); } };
P.__pick = k => {
    const v = [...document.querySelectorAll('.phPick:checked')].map(x => x.value);
    if (k === 'study') D.study.pkgs = v; else if (k === 'safe') D.safe = Array.from(new Set(v.concat(['com.android.settings']))); else if (k === 'never') D.never = v; else if (k === 'notif') D.notifPick = v;
    else if (k === 'win' && P.__win) { P.__win.pkgs = v.length ? v : 'all'; D.rules.wins.push(P.__win); P.__win = null; }
    saveD(); pushRules(); G.back(APP); G.repaint(APP);
};
P.addWin = async () => {
    const a = await G.input('从几点开始？（比如 00:30）', '00:30'); if (!a || hm2min(a) == null) return;
    const b = await G.input('到几点？（比如 07:00）', '07:00'); if (!b || hm2min(b) == null) return;
    const i = await chooser(['除了谷雨和「永远能用」的，全部锁', '只锁我选的几个'], `${a} ~ ${b}`); if (i == null) return;
    P.__win = { from: a.trim(), to: b.trim(), pkgs: 'all', on: true };
    if (i === 0) { D.rules.wins.push(P.__win); P.__win = null; saveD(); pushRules(); G.repaint(APP); } else P.pickApps('win');
};
P.togWin = i => { const w = D.rules.wins[i]; if (!w) return; w.on = w.on === false; saveD(); pushRules(); G.repaint(APP); };
P.delWin = async i => { if (!(await G.confirm('删掉这个时间段？'))) return; D.rules.wins.splice(i, 1); saveD(); pushRules(); G.repaint(APP); };
P.togStudy = () => { D.study.on = !D.study.on; saveD(); G.repaint(APP); };
P.togBed = () => { D.bed.on = !D.bed.on; if (!D.bed.on && D.bed.applied) applyBed(false); saveD(); G.repaint(APP); };
P.bedCfg = async () => {
    const t = await G.input('几点开始？（空着就跟着熬夜管家的睡觉时间）', D.bed.time || ''); if (t === null || t === undefined) return; D.bed.time = hm2min(t) != null ? t.trim() : '';
    const w = await G.input('早上几点还原？', D.bed.wake); if (w && hm2min(w) != null) D.bed.wake = w.trim();
    const br = parseInt(await G.input('亮度调到多少？（0~100，0 = 不动亮度）', String(D.bed.bright))); if (!isNaN(br)) D.bed.bright = Math.max(0, Math.min(100, br));
    const v = parseInt(await G.input('音量调到多少？（0~100）', String(D.bed.vol))); if (!isNaN(v)) D.bed.vol = Math.max(0, Math.min(100, v));
    D.bed.dnd = await G.dialog({ title: '要开勿扰吗？', text: '开了就不响不弹（闹钟照样响）', ok: '开', cancel: '不开' });
    saveD(); G.repaint(APP);
};
P.setCode = async () => { const v = await G.input('紧急解锁的口令（空着＝不要口令，点确认就能解开）', D.code); if (v === null || v === undefined) return; D.code = String(v).trim().slice(0, 20); saveD(); G.repaint(APP); X.toast(D.code ? '🔐 口令设好了' : '不要口令了', ''); };
function seenTab() {
    const ic = { shot: '📸', read: '📖', desk: '🖥️', lock: '🔒', block: '🚫', beg: '🥺', sos: '🆘', pull: '↩️', screen: '🌙', bed: '🛏️', wall: '🖼️', alarm: '⏰', buzz: '💓', torch: '🔦', clip: '📋', deny: '🙅', notif: '🔔', usage: '📊' };
    return `<div class="ph-sech">TA 看过、做过的 <a onclick="gysPh.export()">导出</a></div>
      <div class="ph-list">${D.log.slice(0, 120).map(l => { const c = l.cid && X.char(l.cid); return `<div class="ph-row top"><span class="ph-li">${ic[l.k] || '•'}</span><div><b>${esc(l.text)}</b>${l.feel ? `<small>TA 心里：${esc(l.feel)}</small>` : ''}${l.img ? `<img src="${l.img}" class="ph-thumb" onclick="GYS.imgView(this.src)">` : ''}<small>${G.ago(l.at)}${c ? ' · ' + esc(c.name) : ''}${l.app ? ' · ' + esc(l.app) : ''}</small></div></div>`; }).join('') || '<div class="gys-empty">TA 还没看过、没做过什么</div>'}</div>
      ${can('notif') ? `<div class="ph-sech">TA 知道的通知（${D.notifs.length}）</div><div class="ph-list">${D.notifs.slice(0, 30).map(n => `<div class="ph-row top">${tile(n.pkg, n.label, 30)}<div><b>${esc(n.label)} · ${esc(n.title)}</b><small>${esc(n.text)}</small><small>${G.ago(n.at)}</small></div></div>`).join('') || '<div class="ph-tip">还没有</div>'}</div>` : ''}
      <div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysPh.clearLog()">清空记录</span></div>`;
}
P.clearLog = async () => { if (!(await G.confirm('清空 TA 看过、做过的记录和通知？'))) return; D.log = []; D.notifs = []; saveD(); G.repaint(APP); };
P.export = () => { const t = D.log.map(l => `[${new Date(l.at).toLocaleString()}] ${l.k} ${l.text}${l.feel ? '（TA 心里：' + l.feel + '）' : ''}`).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = '谷雨-真手机记录.txt'; a.click(); };
function setTab() {
    const c = who(), ok = native(), m = N.mode();
    const banner = m === 'plugin' ? `<div class="ph-card ok"><b>✓ 谷雨守护 ${esc(N.ver())} 装好了（全功能）</b></div>`
        : m === 'js' ? `<div class="ph-card ok"><b>✓ 真手机已就位（免插件版）</b><p>屏幕时间、现在在用什么、电量音量、换壁纸、设闹钟、震动、手电筒、剪贴板、音量亮度勿扰、把你拉回谷雨、软锁提醒——都能用。<br>截屏、读屏、读通知、硬锁屏要再装「谷雨守护」插件（看 使用指南 → 📲 真手机）。</p></div>`
            : noNative();
    return `${banner}
      ${ok ? `<div class="ph-sech">手机权限</div>${permList()}` : ''}
      <div class="ph-sech">谁来管你</div><div class="ph-list"><div class="ph-row" onclick="gysPh.pickWho()">${c ? G.av(APP, 'c:' + c.id, 34) : ''}<div><b>${c ? esc(c.name) : '还没有角色'}</b><small>点这里换</small></div><em>›</em></div></div>
      ${['看', '管', '玩'].map(g => `<div class="ph-sech">${{ 看: '👀 TA 看得到', 管: '🔒 TA 管着你', 玩: '🎁 好玩的' }[g]}</div><div class="ph-list">${CAPS.filter(x => x[4] === g).map(([k, i, n]) => `<div class="ph-row"><span class="ph-li">${i}</span><div><b>${n}</b></div><span class="ph-seg">${MODES.map(([m, t]) => `<i class="${perm(k) === m ? 'on' : ''}" onclick="gysPh.setPerm('${k}','${m}')">${t}</i>`).join('')}</span></div>`).join('')}</div>`).join('')}
      <div class="ph-sech">🚫 不许碰的软件</div><div class="ph-list"><div class="ph-row" onclick="gysPh.pickApps('never')"><div><b>${D.never.length} 个</b><small>这些软件 TA 不读、不截、不锁、不看通知。名字里带银行、支付、钱包、密码、验证器的，不在名单里也一律不碰。</small></div><em>›</em></div></div>
      <div class="ph-sech">🔔 通知</div><div class="ph-list"><div class="ph-row" onclick="gysPh.pickApps('notif')"><div><b>${D.notifPick.length ? D.notifPick.length + ' 个软件' : '全部软件（不许碰的除外）'}</b><small>哪些软件的通知让 TA 知道</small></div><em>›</em></div></div>
      <div class="ph-sech">📸 截图留不留</div><div class="ph-list"><div class="ph-row"><div><b>截图给 TA 看完以后</b><small>只存文字记录的话最省地方</small></div><select onchange="gysPh.setKeep(this.value)">${[[0, '马上丢掉'], [5, '留最近 5 张'], [20, '留最近 20 张'], [100, '留最近 100 张']].map(([v, t]) => `<option value="${v}" ${Number(D.keep) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="ph-row"><div><b>记录最多留</b></div><select onchange="gysPh.setLogKeep(this.value)">${[100, 300, 1000, 5000].map(v => `<option value="${v}" ${Number(D.cfg.logKeep) === v ? 'selected' : ''}>${v} 条</option>`).join('')}</select></div></div>
      <div class="ph-sech">试试看（不用等 TA 想起来）</div>
      <div class="ph-try">${[['shot', '📸 截屏给 TA 看'], ['read', '📖 读屏给 TA 看'], ['desk', '🖥️ 让 TA 点评桌面'], ['buzz', '💓 TA 的心跳'], ['torch', '🔦 手电筒'], ['clip', '📋 剪贴板留言'], ['wall', '🖼️ 换成 TA 的照片'], ['alarm', '⏰ 让 TA 设闹钟'], ['pull', '↩️ 拉回谷雨'], ['screen', '🌙 锁屏']].map(([k, n]) => `<span onclick="gysPh.do('${k}')">${n}</span>`).join('')}<span onclick="gysPh.wallPick()">🖼️ 我挑图让 TA 换</span><span onclick="gysPh.torchOff()">🔦 关手电筒</span></div>
      <div class="gys-acts"><span class="gys-btn sm ghost" onclick="GYS.uiPage('phone')">🍎 苹果外观</span></div>`;
}
P.pickWho = async () => { const cs = G.chars(); const i = await chooser(cs.map(c => c.name), '谁来管你的手机？'); if (i == null) return; D.who = String(cs[i].id); saveD(); G.repaint(APP); };
P.setKeep = v => { D.keep = Number(v) || 0; log('cfg', '截图保留改成 ' + D.keep); G.repaint(APP); };
P.setLogKeep = v => { D.cfg.logKeep = Number(v) || 300; saveD(); };
P.wallPick = () => G.pickImg(9 / 19.5, url => P.do('wall', '她挑了一张图让你换', url));
P.torchOff = () => { N.torch(false); X.toast('🔦 关了', ''); };

/* ---------------- 外壳 ---------------- */
function head(tab) { return `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('${APP}')">${G.ic('back', 22)}</span><b>${{ time: '屏幕使用时间', guard: '管着我', seen: 'TA 看过的', set: '设置' }[tab] || '真手机'}</b></div>`; }
G.app(APP, {
    tabs: [['time', 'i:compass', '屏幕时间'], ['guard', 'i:heart', '管着我', () => Object.keys(blockedNow()).length || ''], ['seen', 'i:camera', 'TA 看过'], ['set', 'i:gear', '设置', () => D.ask.length || '']],
    head, render: t => t === 'guard' ? guardTab() : t === 'seen' ? seenTab() : t === 'set' ? setTab() : timeTab(),
    onOpen: () => { if (native()) { pushRules(); notifTick(); } }
});
window.gysPhoneOpen = tab => G.open(APP, tab);
window.gysPhoneOpenAsk = id => { G.open(APP, 'set'); P.ask(id); };

/* ---------------- 谷雨这边：开关、自主行动、今天、小组件、记忆总览、注入 ---------------- */
X.mini({ id: 'gysPhone', icon: '📲', title: '真手机', desc: 'TA 看你的屏幕使用时间、截屏、锁软件、锁屏、换壁纸、设闹钟', cat: '软件', onOpen: () => G.open(APP) }, 'gysPhone');
const rare = (c, k, h) => Date.now() - ((D.last[k + c.id]) || 0) > h * 3600e3;
const mark = (c, k) => { D.last[k + c.id] = Date.now(); saveD(); };
const late = () => { const h = new Date().getHours(); return h >= 23 || h < 5; };
const away = () => { try { return document.hidden || (native() && N.fg() && !/guyu|HBuilder|io\.dcloud/i.test(N.fg())); } catch (e) { return document.hidden; } };
const ACT = (key, label, hint, need, run) => X.action({ key, label, hint, need: c => native() && need(c), run }, 'gysPhone');
ACT('gys_ph_usage', '看了她今天的屏幕使用时间，说说她', '刷太久了 / 熬夜了 / 今天很乖', c => can('usage') && rare(c, 'u', 8) && (usageToday() || {}).total > 2 * 3600e3, async c => { mark(c, 'u'); await X.reach(c, `你看了她今天的手机屏幕使用时间：${summary()}`); return { text: '看了她的屏幕使用时间，说了她', selfNotified: true }; });
ACT('gys_ph_peek', '想偷看一眼她现在的手机屏幕', '截屏看看她在干嘛', c => can('shot') && rare(c, 's', 12) && away(), async c => { mark(c, 's'); const r = await request(c, 'shot', () => DO.shot(c), '想看看你在干嘛'); return r ? { text: r.asked ? '问她能不能看她的屏幕' : '偷看了她的手机屏幕', selfNotified: true } : null; });
ACT('gys_ph_read', '看看她手机上在看什么字', '读屏幕上的字（不截图）', c => can('read') && !can('shot') && rare(c, 'r', 12) && away(), async c => { mark(c, 'r'); const r = await request(c, 'read', () => DO.read(c), '想看看你在看什么'); return r ? { text: '看了她屏幕上的字', selfNotified: true } : null; });
ACT('gys_ph_lock', '锁她的娱乐软件', '刷太久 / 太晚了还在玩', c => can('lock') && rare(c, 'l', 6) && (!D.rules.temp || D.rules.temp.until < Date.now()) && (late() || ((usageToday() || {}).apps || []).some(a => a.ms > 2 * 3600e3)), async c => { mark(c, 'l'); const r = await request(c, 'lock', () => DO.lock(c, late() ? '太晚了还在玩手机' : '今天刷太久了'), late() ? '太晚了还在玩' : '今天刷太久了'); return r ? { text: r.asked ? '问她能不能锁她的软件' : '锁了她的软件', selfNotified: true } : null; });
ACT('gys_ph_pull', '把她从别的软件拉回谷雨', '想她了 / 她刷别的太久了', c => can('pull') && rare(c, 'p', 12) && away(), async c => { mark(c, 'p'); const r = await request(c, 'pull', () => DO.pull(c, '想她了'), '想你了'); return r ? { text: '把她拉回了谷雨', selfNotified: true } : null; });
ACT('gys_ph_screen', '让她的手机锁屏，催她睡觉', '很晚了还在玩', c => can('screen') && late() && rare(c, 'x', 20) && away(), async c => { mark(c, 'x'); const r = await request(c, 'screen', () => DO.screen(c, '太晚了，该睡了'), '太晚了，该睡了'); return r ? { text: '让她的手机锁屏了', selfNotified: true } : null; });
ACT('gys_ph_wall', '把她的手机壁纸换成你的照片', '一解锁就看到你', c => can('wall') && !!c.avatarImg && rare(c, 'w', 168), async c => { mark(c, 'w'); const r = await request(c, 'wall', () => DO.wall(c, '想让她一解锁就看到你'), '想把壁纸换成我'); return r ? { text: '换了她的手机壁纸', selfNotified: true } : null; });
ACT('gys_ph_alarm', '给她的手机设个闹钟', '明早叫她起床 / 提醒她一件事', c => can('alarm') && rare(c, 'a', 48) && new Date().getHours() >= 20, async c => { mark(c, 'a'); const r = await request(c, 'alarm', () => DO.alarm(c, '明天早上叫她起床'), '明天早上我叫你起床'); return r ? { text: '给她设了闹钟', selfNotified: true } : null; });
ACT('gys_ph_buzz', '让她的手机跟着你的心跳震一下', '想她了', c => can('buzz') && rare(c, 'b', 24), async c => { mark(c, 'b'); const r = await request(c, 'buzz', () => DO.buzz(c, Math.random() < 0.4 ? 'miss' : 'heart')); return r ? { text: '让她的手机震了一下（心跳）', selfNotified: true } : null; });
ACT('gys_ph_clip', '往她剪贴板里偷偷塞一句话', '她下次粘贴才发现', c => can('clip') && rare(c, 'c', 72), async c => { mark(c, 'c'); const r = await request(c, 'clip', () => DO.clip(c)); return r ? { text: '往她剪贴板里塞了一句话', selfNotified: true, secret: true } : null; });
ACT('gys_ph_desk', '想看看她的手机桌面', '点评她的壁纸和图标', c => can('desk') && rare(c, 'd', 168), async c => { mark(c, 'd'); const r = await request(c, 'desk', () => DO.desk(c), '想看看你手机桌面长什么样'); return r ? { text: '看了她的手机桌面', selfNotified: true } : null; });
ACT('gys_ph_notif', '看到她收到了别人的消息', '吃醋 / 好奇 / 关心', c => can('notif') && rare(c, 'n', 4) && D.notifs.some(n => Date.now() - n.at < 30 * 60e3 && CHATS.includes(n.pkg)), async c => { mark(c, 'n'); const n = D.notifs.find(n => Date.now() - n.at < 30 * 60e3 && CHATS.includes(n.pkg)); await X.reach(c, `你看到她手机上刚弹了一条「${n.label}」的通知：${n.title}：${n.text.slice(0, 100)}`); log('notif', `TA 看到了 ${n.label} 的通知：${n.title}`, { cid: String(c.id) }); return { text: '看到她收到了别人的消息', selfNotified: true }; });
ACT('gys_ph_batt', '提醒她手机快没电了', '电量低了还不充', c => can('status') && rare(c, 'e', 6) && (() => { const s = N.status(); return s.battery > 0 && s.battery <= 15 && !s.charging; })(), async c => { mark(c, 'e'); const s = N.status(); await X.reach(c, `她手机只剩 ${s.battery}% 的电了，还没在充电`); return { text: '提醒她手机快没电了', selfNotified: true }; });
ACT('gys_ph_goal', '看了她离今天小目标还差多少，说她一句', '达成了夸她 / 超了念她', c => can('usage') && Number(D.goal.min) > 0 && (D.goal.last || '') !== X.day() && (() => { const u = usageToday(); if (!u) return false; const used = Math.round((u.total || 0) / 60e3), h = new Date().getHours(); return used > D.goal.min || (h >= 21 && used <= D.goal.min); })(), async c => { D.goal.last = X.day(); saveD(); const u = usageToday() || {}; const used = Math.round((u.total || 0) / 60e3), ok = used <= D.goal.min; await X.reach(c, ok ? `她今天把手机屏幕时间压在了小目标（${D.goal.min} 分钟）以内，只用了 ${used} 分钟，好好夸夸她` : `她今天给自己定了屏幕时间不超过 ${D.goal.min} 分钟，现在已经用了 ${used} 分钟、超了，按你的性格轻轻念她一句（别凶）`); return { text: ok ? '夸了她今天达成屏幕时间小目标' : '说了她今天超了屏幕时间小目标' }; });
ACT('gys_ph_week', '给她看这一周的屏幕时间，陪她聊两句', '周末回顾', c => can('usage') && rare(c, 'wk', 24 * 6) && new Date().getDay() === 0, async c => { mark(c, 'wk'); const wk = usageWeek(); if (!wk) return null; const tot = wk.reduce((a, d) => a + d.total, 0), avg = tot / 7; await X.reach(c, `这是她这一周的手机屏幕时间：平均每天 ${fmtDur(avg)}，一共 ${fmtDur(tot)}。像朋友一样陪她聊两句（心疼 / 鼓励 / 调侃都行）`); return { text: '跟她聊了这周的屏幕时间（平均每天 ' + fmtDur(avg) + '）' }; });
X.today(() => { if (!native() || !can('usage')) return null; const u = usageToday(); if (!u) return null; const L = D.log.filter(l => X.day(new Date(l.at)) === X.day()); return { title: '📲 真手机', rows: [{ t: '屏幕时间', x: fmtDur(u.total) + ' · ' + ((u.apps || [])[0] ? u.apps[0].label + ' 最多' : ''), go: X.go('gysPhoneOpen', 'time') }].concat(Number(D.goal.min) ? [{ t: '🎯 目标', x: Math.round(((usageToday() || {}).total || 0) / 60e3) + ' / ' + D.goal.min + ' 分钟' + (Math.round(((usageToday() || {}).total || 0) / 60e3) > D.goal.min ? '（超了）' : ''), go: X.go('gysPhoneOpen', 'guard') }] : []).concat(L.slice(0, 2).map(l => ({ t: 'TA', x: l.text.slice(0, 30), go: X.go('gysPhoneOpen', 'seen') }))) }; }, 'gysPhone');
X.widget('gysPhoneW', { n: '屏幕使用时间', sizes: ['s', 'm'], tap: () => G.open(APP), r: () => { const u = native() && can('usage') ? usageToday() : null; return `<div style="padding:10px;font-size:12px;line-height:1.6"><b>📲 屏幕时间</b><br>${u ? `<span style="font-size:20px;font-weight:700">${fmtDur(u.total)}</span><br>${esc(((u.apps || [])[0] || {}).label || '')}` : '安卓 App 里能看'}</div>`; } }, 'gysPhone');
X.mem({ k: 'gysPh', ico: '📲', n: 'TA 看过你手机的', d: 'TA 截屏 / 读屏 / 看桌面时看到的（改了就是改 TA 记得的，删了就不记得）', items: c => D.log.filter(l => l.cid === String(c.id) && ['shot', 'read', 'desk', 'notif'].includes(l.k)), text: l => l.text, edit: (l, v) => { l.text = String(v).slice(0, 600); }, del: (c, i) => { const L = D.log.filter(l => l.cid === String(c.id) && ['shot', 'read', 'desk', 'notif'].includes(l.k)); const l = L[i]; if (l) D.log = D.log.filter(x => x !== l); }, meta: l => G.ago(l.at) + (l.app ? ' · ' + l.app : ''), save: () => saveD() }, 'gysPhone');
X.ctx(id => {
    const c = X.char(id); if (!c || !native()) return ''; const L = [];
    if (can('usage')) { const s = summary(); if (s) L.push(s); }
    if (can('now')) { const f = N.fg(); if (f && document.hidden) L.push(`她现在在用「${labelOf(f)}」`); }
    if (can('status')) { const s = N.status(); if (s.battery > 0) L.push(`手机电量 ${s.battery}%${s.charging ? '（在充电）' : ''}${s.headset ? '，戴着耳机' : ''}`); }
    const b = Object.keys(blockedNow()); if (b.length) L.push(`她手机上锁着：${b.slice(0, 5).map(labelOf).join('、')}${D.rules.temp && D.rules.temp.by === String(c.id) && D.rules.temp.until > Date.now() ? `（你锁的，到 ${G.hm(D.rules.temp.until)}）` : ''}`);
    if (D.free > Date.now()) L.push('她今天用了紧急解锁，所有锁都解开了');
    const seen = D.log.filter(l => l.cid === String(c.id) && ['shot', 'read', 'desk'].includes(l.k) && Date.now() - l.at < 6 * 3600e3)[0]; if (seen) L.push(`你${G.ago(seen.at)}看过她的屏幕：${seen.text.slice(0, 60)}`);
    if (can('notif')) { const n = D.notifs.find(n => Date.now() - n.at < 30 * 60e3); if (n) L.push(`她刚收到「${n.label}」的通知：${n.title}`); }
    return L.length ? `【她的手机】${L.join('；')}` : '';
}, 'gysPhone');
X.inj('gysPhone', [['她的手机', '真手机：屏幕使用时间、在用什么、电量、锁着什么、你看过的屏幕、通知', '让 TA 知道她手机上的真实情况（每一项能在真手机的设置里设「不许」）']]);

X.css('gys-phone-css', `
.gys-phone{--gys-accent:#007aff;background:#f2f2f7}body.dark-theme .gys-phone{background:#000}
.gys-phone .gys-hd{background:rgba(242,242,247,.94)}body.dark-theme .gys-phone .gys-hd{background:rgba(0,0,0,.9)}
.ph-card{background:#fff;margin:12px 16px;border-radius:14px;padding:14px 16px}body.dark-theme .ph-card{background:#1c1c1e}.ph-card b{font-size:16px}.ph-card p{font-size:13.5px;color:#6e6e73;line-height:1.6;margin:6px 0}.ph-card a{color:#007aff;cursor:pointer}.ph-card.warn{background:#fff8e6}.ph-card.ok{background:#e9f9ee}body.dark-theme .ph-card.warn{background:#3a2e10}body.dark-theme .ph-card.ok{background:#12301c}.ph-warn{color:#c93400!important}
.ph-big{padding:18px 16px 6px}.ph-big small{font-size:13px;color:#8e8e93;text-transform:uppercase}.ph-big b{display:block;font-size:34px;font-weight:700;letter-spacing:-.5px}.ph-big em{font-style:normal;font-size:13px;color:#8e8e93}
.ph-hours{display:flex;align-items:flex-end;gap:2px;height:90px;margin:8px 16px 2px;padding:6px;background:#fff;border-radius:12px}body.dark-theme .ph-hours{background:#1c1c1e}.ph-hours i{flex:1;background:#007aff;border-radius:2px 2px 0 0;min-height:1px}
.ph-hlab{display:flex;justify-content:space-between;margin:0 22px;font-size:10.5px;color:#8e8e93}
.ph-sech{display:flex;justify-content:space-between;padding:18px 20px 6px;font-size:13px;color:#6e6e73;text-transform:uppercase}.ph-sech a{color:#007aff;text-transform:none;cursor:pointer}
.ph-list{background:#fff;margin:0 16px;border-radius:12px;overflow:hidden}body.dark-theme .ph-list{background:#1c1c1e}
.ph-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:.5px solid rgba(60,60,67,.15);cursor:pointer}.ph-row:last-child{border:0}.ph-row.top{align-items:flex-start}.ph-row>div{flex:1;min-width:0}.ph-row b{display:block;font-size:15.5px;font-weight:500}.ph-row b.red{color:#ff3b30}.ph-row small{display:block;font-size:12.5px;color:#8e8e93;line-height:1.45;margin-top:2px}.ph-row>em{font-style:normal;color:#8e8e93;font-size:14px;white-space:nowrap}.ph-row select{border:none;background:rgba(118,118,128,.12);border-radius:8px;padding:5px 8px;color:inherit}
.ph-tile{display:inline-flex;align-items:center;justify-content:center;border-radius:22%;color:#fff;font-weight:700;font-size:15px;flex-shrink:0}
.ph-bar{display:block;height:5px;background:rgba(118,118,128,.15);border-radius:3px;margin-top:5px;overflow:hidden}.ph-bar u{display:block;height:100%;background:#007aff;border-radius:3px}
.ph-chip{font-style:normal;font-size:11px;color:#007aff;background:rgba(0,122,255,.1);border-radius:6px;padding:1px 6px;font-weight:400}
.ph-goal{margin:4px 16px 2px;background:#fff;border-radius:12px;padding:12px 14px}body.dark-theme .ph-goal{background:#1c1c1e}
.ph-goal-t{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}.ph-goal-t b{font-size:15px}.ph-goal-t em{font-style:normal;font-size:12.5px;color:#34c759}
.ph-goal.over .ph-goal-t em{color:#ff3b30}.ph-goal.over .ph-bar u{background:#ff3b30}
.ph-week{display:flex;gap:8px;align-items:flex-end;height:120px;margin:4px 16px;background:#fff;border-radius:12px;padding:10px}body.dark-theme .ph-week{background:#1c1c1e}.ph-week div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:3px}.ph-week i{width:70%;background:#5ac8fa;border-radius:4px 4px 0 0;min-height:2px}.ph-week em{font-style:normal;font-size:11px;color:#8e8e93}.ph-week small{font-size:10px;color:#8e8e93}
.ph-go{color:#007aff;font-size:14px;white-space:nowrap;cursor:pointer}.ph-ok{color:#34c759;font-size:13.5px;white-space:nowrap}
.ph-tip{font-size:12.5px;color:#8e8e93;padding:10px 14px;line-height:1.5}
.ph-sw{width:51px;height:31px;border-radius:16px;background:rgba(120,120,128,.32);position:relative;flex-shrink:0;cursor:pointer;transition:background .2s}.ph-sw i{position:absolute;left:2px;top:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:left .2s}.ph-sw.on{background:#34c759}.ph-sw.on i{left:22px}
.ph-x{color:#ff3b30;padding:0 4px;cursor:pointer}
.ph-li{font-size:20px;width:28px;text-align:center;flex-shrink:0}
.ph-seg{display:flex;background:rgba(118,118,128,.12);border-radius:9px;padding:2px;flex-shrink:0}.ph-seg i{font-style:normal;font-size:12px;padding:5px 8px;border-radius:7px;cursor:pointer;white-space:nowrap}.ph-seg i.on{background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12);font-weight:600}body.dark-theme .ph-seg i.on{background:#636366}
.ph-thumb{max-width:150px;border-radius:10px;margin-top:6px;display:block}
.ph-try{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px}.ph-try span{background:#fff;border-radius:999px;padding:8px 14px;font-size:14px;cursor:pointer}body.dark-theme .ph-try span{background:#1c1c1e}
.ph-blockb{background:linear-gradient(170deg,#1c1c3c,#3a2350 60%,#5a2c4c);color:#fff}
.ph-block{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px 24px;box-sizing:border-box;gap:10px}.ph-block h2{margin:10px 0 0;font-size:22px}.ph-bl{font-size:17px;line-height:1.6;margin:4px 0}.ph-block small{opacity:.7}.ph-block em{font-style:normal;font-size:11.5px;opacity:.5;margin-top:10px}
.ph-bb{display:flex;flex-direction:column;gap:10px;width:100%;max-width:300px;margin-top:20px}.ph-bb span{padding:13px;border-radius:14px;background:rgba(255,255,255,.14);cursor:pointer;font-size:16px}.ph-bb span.b{background:#fff;color:#000;font-weight:600}.ph-bb span.sos{background:transparent;color:#ff6961;font-size:14px}.ph-bb span.ghost{background:transparent;font-size:14px;opacity:.8}
.ph-ask{display:flex;flex-direction:column;align-items:center;text-align:center;padding:40px 24px;gap:8px}.ph-ask h3{margin:12px 0 0;font-size:20px}.ph-ask p{color:#6e6e73;margin:0}.ph-ask small{color:#8e8e93}.ph-ask .ph-bb span{background:#fff;color:#007aff}.ph-ask .ph-bb span.b{background:#007aff;color:#fff}body.dark-theme .ph-ask .ph-bb span{background:#1c1c1e}
.ph-sheet{position:fixed;inset:0;z-index:99980;background:rgba(0,0,0,.3);display:flex;align-items:flex-end}.ph-sheet-in{width:100%;padding:8px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));box-sizing:border-box;max-height:80vh;overflow-y:auto}.ph-sg{background:rgba(250,250,250,.97);border-radius:14px;overflow:hidden;margin-top:8px}body.dark-theme .ph-sg{background:rgba(44,44,46,.97);color:#fff}.ph-sg p{margin:0;padding:12px;text-align:center;font-size:13px;color:#8e8e93;border-bottom:.5px solid rgba(0,0,0,.08)}.ph-sg div{padding:15px;text-align:center;font-size:18px;color:#007aff;border-bottom:.5px solid rgba(0,0,0,.08);cursor:pointer}.ph-sg div.c{font-weight:600;border:0}
`);
(async () => {
    await G.ready(); D = Object.assign(D, await ST.get('d', {}) || {});
    D.perm = D.perm || {}; D.rules = Object.assign({ limits: {}, wins: [], temp: null }, D.rules || {}); D.study = Object.assign({ on: false, pkgs: [] }, D.study || {}); D.bed = Object.assign({ on: false, time: '', wake: '07:30', bright: 15, dnd: true, vol: 20, applied: '', prev: null }, D.bed || {}); D.cfg = Object.assign({ logKeep: 300 }, D.cfg || {}); D.goal = Object.assign({ min: 0, last: '' }, D.goal || {});
    ['log', 'notifs', 'apps', 'ask', 'never', 'safe', 'notifPick'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; });
    ['grant', 'labels', 'last'].forEach(k => { if (!D[k] || typeof D[k] !== 'object') D[k] = {}; });
})();
window.gysPhoneState = () => D;

//# sourceURL=guyu-builtin/真手机.js
})(typeof applyMacros === "function" ? applyMacros : (window.applyMacros || null));
