/* ⏳ 生成中提示：模型在写东西的时候，屏幕顶上浮出一个小条（按住能拖到别处）「正在生成 · 聊天回复 · 8 秒」，写完自己收回去；等不及了点 ■ 就停。小手机模式里不另弹，就挂在顶上的流体云（灵动岛）里。只提示你点出来的那些，还是后台自己跑的也提示，你来选 */
if (window.__gyxGen) return; window.__gyxGen = 1;
X.feat('gyxGen', { n: '⏳ 生成中提示', desc: '正在生成时弹个小条、能点停止；小手机模式显示在流体云里', auto: false });
const K = 'gyxGenCfg';
let C = { scope: 'mine', island: true, delay: 500, pos: null };   // pos：拖过的位置 {x, y}（占屏幕宽高的比例）；没拖过就在顶上正中
try { Object.assign(C, JSON.parse(localStorage.getItem(K) || '{}')); } catch (e) {}
const saveC = () => { try { localStorage.setItem(K, JSON.stringify(C)); } catch (e) {} };
const RUN = new Map(); let seq = 0, lastAct = 0, stopped = 0, LOG = { n: 0, stop: 0 };
const STOP_MSG = '⏹ 你停止了生成';
['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, e => { if (!e.target || !e.target.closest || !e.target.closest('#gyxGenBar,#gyPmIsl')) lastAct = Date.now(); }, true));
const isLLM = u => /\/chat\/completions|\/v1\/messages|:(stream)?generateContent|\/v1\/responses\b|\/completions\b/.test(String(u || ''));
const feature = () => { try { const f = typeof gyDetectFeature === 'function' ? gyDetectFeature() : ''; return f && f !== '其它' ? f : ''; } catch (e) { return ''; } };
// 是不是「你点出来的」：你刚点过 / 按过键（8 秒内），或者跟着你那一条连着发的
const mine = () => Date.now() - lastAct < 8000 || [...RUN.values()].some(r => r.mine);
function track(opts, isStream) {
    const ctrl = new AbortController(), id = ++seq, outer = opts && opts.signal;
    if (outer) { if (outer.aborted) ctrl.abort(outer.reason); else outer.addEventListener('abort', () => ctrl.abort(outer.reason), { once: true }); }
    const r = { id, ctrl, start: Date.now(), label: feature(), mine: mine(), stream: isStream };
    RUN.set(id, r); LOG.n++;
    // 刚点了停止、你还没再点别的：紧跟着冒出来的那几条（修 JSON、补一句……）是刚才那次的尾巴，一起停掉
    if (Date.now() - stopped < 1500 && lastAct <= stopped) { try { ctrl.abort(new Error(STOP_MSG)); } catch (e) {} }
    schedule(); return r;
}
function done(r) { if (!r || !RUN.has(r.id)) return; RUN.delete(r.id); schedule(); }
const streamy = o => { try { return /"stream"\s*:\s*true/.test(String(o && o.body || '')); } catch (e) { return false; } };
// 流式的：响应头回来了还没写完，要等正文读完才算结束
function wrapBody(res, r) {
    try {
        if (!res || !res.body || !r.stream || typeof TransformStream === 'undefined') { done(r); return res; }
        const ts = new TransformStream({ flush() { done(r); } });
        const body = res.body.pipeThrough(ts);
        r.ctrl.signal.addEventListener('abort', () => done(r), { once: true });
        const out = new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
        return out;
    } catch (e) { done(r); return res; }
}
function hook() {
    // smartFetch：谷雨大部分生成都走它（App 里走原生通道，没法真的掐断，就先把结果扔掉、让界面马上停）
    const sf = window.smartFetch;
    if (typeof sf === 'function' && !sf.__gyxGen) {
        const w = function (url, opts) {
            if (!X.on('gyxGen') || !isLLM(url)) return sf.apply(this, arguments);
            const r = track(opts, streamy(opts)); const o2 = Object.assign({}, opts || {}, { signal: r.ctrl.signal, __gyxGen: 1 });
            const stopP = new Promise((_, rej) => r.ctrl.signal.addEventListener('abort', () => rej(new Error(STOP_MSG)), { once: true }));
            return Promise.race([sf.call(this, url, o2), stopP]).then(res => wrapBody(res, r), e => { done(r); throw r.ctrl.signal.aborted ? new Error(STOP_MSG) : e; });
        };
        w.__gyxGen = true; window.smartFetch = w; try { (0, eval)('smartFetch = window.smartFetch'); } catch (e) {}
    }
    // 直接用 fetch 的（流式续写、同类软件桥接……）
    const f = window.fetch;
    if (typeof f === 'function' && !f.__gyxGen) {
        const w = function (url, opts) {
            const u = typeof url === 'string' ? url : (url && url.url);
            if (!X.on('gyxGen') || (opts && opts.__gyxGen) || !isLLM(u) || !opts || !opts.body) return f.apply(this, arguments);
            const r = track(opts, streamy(opts)); const o2 = Object.assign({}, opts, { signal: r.ctrl.signal });
            return f.call(this, url, o2).then(res => wrapBody(res, r), e => { done(r); throw r.ctrl.signal.aborted ? new Error(STOP_MSG) : e; });
        };
        Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__gyxGen = true; window.fetch = w;
    }
}
hook(); setInterval(hook, 3000);
const shown = () => [...RUN.values()].filter(r => C.scope === 'all' || r.mine);
window.gyxGenStop = () => { const L = shown(); if (!L.length) return; stopped = Date.now(); LOG.stop++; L.forEach(r => { try { r.ctrl.abort(new Error(STOP_MSG)); } catch (e) {} done(r); }); X.toast(X.v('⏹ 停下来了', '⏹ 不写了', '⏹ 已停止'), X.v('想要的话再点一次就行', '刚才那段不算数', '')); paint(); };
window.gyxGenStopped = () => stopped;
// 你自己停的，别再弹「API 报错」那种框
(() => { const A = window.alert; if (A && !A.__gyxGen) { const w = function (m) { if (/你停止了生成/.test(String(m))) return; return A.apply(this, arguments); }; w.__gyxGen = true; window.alert = w; } })();
let tmr = null, tick = null;
function schedule() { clearTimeout(tmr); tmr = setTimeout(paint, shown().length ? C.delay : 0); if (shown().length && !tick) tick = setInterval(paint, 1000); if (!shown().length && tick) { clearInterval(tick); tick = null; } }
const inPhone = () => document.body.classList.contains('gyphm') && C.island && window.gyPmIsland && window.gyPmIsland.gen;
let islOn = false;
// 📍 位置：默认在顶上正中；按住拖到哪儿就停在哪儿（记住，下次还在那）
function place(b) {
    if (!b) return; const p = C.pos;
    if (!p) { b.style.left = '50%'; b.style.top = ''; b.classList.remove('moved'); return; }
    const w = b.offsetWidth || 220, h = b.offsetHeight || 40;
    b.style.left = Math.max(w / 2 + 6, Math.min(innerWidth - w / 2 - 6, p.x * innerWidth)) + 'px';
    b.style.top = Math.max(6, Math.min(innerHeight - h - 6, p.y * innerHeight)) + 'px'; b.classList.add('moved');
}
function drag(b) {
    let d = null;
    b.addEventListener('pointerdown', e => { if (e.target.closest('b')) return; const r = b.getBoundingClientRect(); d = { x0: e.clientX, y0: e.clientY, cx: r.left + r.width / 2, top: r.top, moved: false, id: e.pointerId, on: e.target.closest('span') }; try { b.setPointerCapture(e.pointerId); } catch (er) {} });
    b.addEventListener('pointermove', e => {
        if (!d || e.pointerId !== d.id) return; const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
        if (!d.moved && Math.hypot(dx, dy) < 6) return; d.moved = true; b.classList.add('drag', 'moved');
        b.style.left = (d.cx + dx) + 'px'; b.style.top = Math.max(0, d.top + dy) + 'px';
    });
    const up = e => { if (!d) return; const g = d; d = null; b.classList.remove('drag'); if (g.moved) { const r = b.getBoundingClientRect(); C.pos = { x: (r.left + r.width / 2) / innerWidth, y: r.top / innerHeight }; saveC(); place(b); } else if (g.on) window.gyxGenOpen(); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', () => { d = null; b.classList.remove('drag'); });
}
addEventListener('resize', () => place(document.getElementById('gyxGenBar')));
window.gyxGenHome = () => { C.pos = null; saveC(); place(document.getElementById('gyxGenBar')); X.toast(X.v('📍 放回顶上了', '📍 回到顶上正中'), ''); window.gyxGenOpen(); };
function paint() {
    const L = shown().filter(r => Date.now() - r.start >= C.delay - 20), bar = document.getElementById('gyxGenBar');
    const txt = L.length > 1 ? `正在生成 ${L.length} 项` : L.length ? (L[0].label ? L[0].label + ' · 生成中' : X.v('正在生成', '正在写', 'TA 在想')) : '';
    const sec = L.length ? Math.round((Date.now() - Math.min(...L.map(r => r.start))) / 1000) + ' 秒' : '';
    if (!L.length || !X.on('gyxGen')) { if (bar) { bar.classList.remove('on'); setTimeout(() => { if (!bar.classList.contains('on')) bar.remove(); }, 260); } if (islOn) { try { window.gyPmIsland.gen(null); } catch (e) {} islOn = false; } return; }
    if (inPhone()) { if (bar) bar.remove(); try { window.gyPmIsland.gen({ text: txt, sub: sec, stop: window.gyxGenStop, tap: () => window.gyxGenOpen() }); islOn = true; } catch (e) {} return; }
    if (islOn) { try { window.gyPmIsland.gen(null); } catch (e) {} islOn = false; }
    let b = bar; if (!b) { b = document.createElement('div'); b.id = 'gyxGenBar'; document.body.appendChild(b); drag(b); place(b); requestAnimationFrame(() => b.classList.add('on')); } else b.classList.add('on');
    b.innerHTML = `<i class="gg-sp"></i><span>${X.esc(txt)}</span><em>${sec}</em><b onclick="gyxGenStop()" title="停止生成"><u></u>停止</b>`;
}
window.gyxGenCfg = (k, v) => { C[k] = v; saveC(); window.gyxGenOpen(); paint(); };
window.gyxGenState = () => ({ run: [...RUN.values()].map(r => ({ label: r.label, mine: r.mine, stream: r.stream, ms: Date.now() - r.start })), cfg: C, log: LOG });
window.gyxGenOpen = function () {
    const on = X.on('gyxGen'), chip = (k, v, n) => `<span class="gyx-chip${C[k] === v ? ' on' : ''}" onclick="gyxGenCfg('${k}','${v}')">${n}</span>`;
    X.panel('gyxGenOv', '⏳ 生成中提示', `<div class="gyx-row"><label class="gyx-tip" style="font-size:14px"><input type="checkbox" ${on ? 'checked' : ''} onchange="GYX.set('gyxGen',this.checked);gyxGenOpen()"> 正在生成时弹个小条（写完自己收回，点 ■ 停止）</label></div>
      <h4 style="font-size:14px;margin:12px 0 4px">提示哪些</h4><div class="gyx-row">${chip('scope', 'mine', '只提示我点出来的')}${chip('scope', 'all', '后台自己跑的也提示')}</div>
      <div class="gyx-tip">「我点出来的」= 你刚点了发送、重新生成、写日记、让 TA 发推……这一类。后台的（NPC 评论、日程、TA 自己做的事）很多，全提示会有点吵。</div>
      <div class="gyx-row"><label class="gyx-tip" style="font-size:13.5px"><input type="checkbox" ${C.island ? 'checked' : ''} onchange="gyxGenCfg('island',this.checked)"> 小手机模式里显示在流体云（灵动岛）上，不另弹小条</label></div>
      <div class="gyx-row gyx-tip">📍 提示条默认在屏幕顶上，按住能拖到别处，松手就停在那儿（下次还在那）。${C.pos ? `<button class="gyx-btn lite" onclick="gyxGenHome()">放回顶上</button>` : ''}</div>
      <div class="gyx-row gyx-tip">生成超过 <input class="gyx-who" type="number" min="0" max="5000" step="100" value="${C.delay}" style="width:70px" onchange="gyxGenCfg('delay',+this.value)"> 毫秒才弹（太快就写完的不闪一下）</div>
      <div class="gyx-tip">停止以后，那一段就不要了；聊天里会显示「${STOP_MSG}」，想要的话再点一次就行。打包的 App 里走的是手机自己的网络通道，没法从中间掐断——点停止会马上把界面停下、结果扔掉，但模型那边可能已经写完了（照样算钱）。</div>
      <div class="gyx-tip">这次打开以来：生成了 ${LOG.n} 次，你停了 ${LOG.stop} 次。这是纯提示，没有「TA 会自己做」、今天、小组件和记忆。</div>`);
};
X.css('gyxGenCss', `#gyxGenBar{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 10px);transform:translate(-50%,-16px);touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;opacity:0;z-index:99990;display:flex;align-items:center;gap:9px;padding:7px 7px 7px 14px;border-radius:999px;background:rgba(28,28,30,.92);color:#fff;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.22);backdrop-filter:blur(10px);transition:transform .22s,opacity .22s;max-width:calc(100vw - 32px)}
#gyxGenBar.on{transform:translate(-50%,0);opacity:1}#gyxGenBar span{cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}#gyxGenBar em{font-style:normal;color:#9a9aa0;font-size:12px;white-space:nowrap}
#gyxGenBar b{display:flex;align-items:center;gap:5px;background:#ff453a;border-radius:999px;padding:5px 11px;font-weight:600;font-size:12.5px;cursor:pointer;white-space:nowrap}#gyxGenBar b u{width:8px;height:8px;border-radius:2px;background:#fff;display:block}
.gg-sp{width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;animation:ggSp .8s linear infinite;flex-shrink:0}@keyframes ggSp{to{transform:rotate(360deg)}}
#gyxGenBar.moved{transform:translate(-50%,0) scale(.96)}#gyxGenBar.moved.on{transform:translate(-50%,0)}#gyxGenBar.drag{transition:none;cursor:grabbing;box-shadow:0 14px 34px rgba(0,0,0,.3)}`);
X.mini({ id: 'gyxGen', icon: '⏳', title: '生成中提示', desc: '正在生成时弹个小条、能停止；小手机里显示在流体云', cat: '生活', onOpen: () => window.gyxGenOpen() });
