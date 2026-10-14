/* 👉 跟手返回：谷雨本来就能「从左边缘往右滑返回」，但松手才跳。这个插件让页面跟着手指走（像 iPhone）：拖到一半能看到底下那一层，松手过半就滑走返回，不够就弹回去；还能开「右边缘往左滑也返回」（单手用），切页的时候淡入，不闪白。纯手势，没有自主行动 */
if (window.__gyxSwipe) return; window.__gyxSwipe = 1;
X.feat('gyxSwipe', { n: '👉 跟手返回', desc: '从边缘滑动返回时页面跟着手指走；切页淡入不闪白', auto: false });
const K = 'gyxSwipeCfg';
let C = { edge: 26, need: 33, right: false, fade: true, shade: true };
try { Object.assign(C, JSON.parse(localStorage.getItem(K) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(K, JSON.stringify(C)); } catch (e) {} };
const vis = el => { if (!el) return false; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 40 && r.height > 40; };
// 松手以后会被关掉 / 退掉的那一层
function target() {
    const sh = document.getElementById('gyPmSheet'); if (sh && sh.classList.contains('on') && document.body.classList.contains('gyphm') && vis(sh.firstElementChild || sh)) return sh.firstElementChild || sh;
    const z = el => parseInt(getComputedStyle(el).zIndex, 10) || 0;
    const ov = [...document.querySelectorAll('.gyx-ov, .modal-overlay, [data-gy-overlay], .gy-aspage, #gyHubOv')].filter(vis).sort((a, b) => z(b) - z(a))[0];
    if (ov) return ov.querySelector('.gyx-box, .modal-content, .gyhb-box, .gyg-box') || ov;
    if (document.body.classList.contains('gyphm')) { const a = document.querySelector('#gyPm .pm-app.on, #gyPm .pm-app:last-child'); if (a && vis(a)) return a; }
    return [...document.querySelectorAll('[id^="view-"]')].find(vis) || null;
}
let G = null;
window.addEventListener('touchstart', e => {
    G = null; if (!X.on('gyxSwipe') || e.touches.length !== 1) return; const t = e.touches[0], W = innerWidth;
    const side = t.clientX <= C.edge ? 1 : (C.right && t.clientX >= W - C.edge ? -1 : 0); if (!side) return;
    G = { x: t.clientX, y: t.clientY, t: Date.now(), side, el: null, on: false };
}, { capture: true, passive: true });
window.addEventListener('touchmove', e => {
    if (!G) return; const t = e.touches[0], dx = (t.clientX - G.x) * G.side, dy = Math.abs(t.clientY - G.y);
    if (!G.on) { if (dy > 30 && dy > dx) { G = null; return; } if (dx < 10) return; G.el = target(); if (!G.el) { G = null; return; } G.on = true; G.el.classList.add('gyx-sw-drag'); }
    e.stopPropagation();   // 不让谷雨自带的那套「松手才跳」同时动
    const x = Math.max(0, dx) * G.side; G.el.style.transform = `translateX(${x}px)`; G.dx = Math.max(0, dx);
    if (C.shade) G.el.style.boxShadow = `${-G.side * 8}px 0 30px rgba(0,0,0,${.25 * (1 - Math.min(1, G.dx / innerWidth))})`;
}, { capture: true, passive: true });
function end(e, cancel) {
    if (!G) return; const g = G; G = null; if (!g.on) return; if (e) e.stopPropagation();
    const el = g.el, w = innerWidth, ok = !cancel && (g.dx > w * C.need / 100 || (g.dx > 60 && Date.now() - g.t < 260));
    el.classList.remove('gyx-sw-drag'); el.classList.add('gyx-sw-anim');
    el.style.transform = ok ? `translateX(${w * g.side}px)` : 'translateX(0)';
    setTimeout(() => {
        el.classList.remove('gyx-sw-anim'); el.style.transform = ''; el.style.boxShadow = '';
        if (ok) { try { if (typeof window.gyBack === 'function') window.gyBack('swipe'); } catch (err) {} }
    }, 220);
}
window.addEventListener('touchend', e => end(e), { capture: true, passive: true });
window.addEventListener('touchcancel', e => end(e, true), { capture: true, passive: true });
// 切页淡入
function hookView() {
    const f = window.switchMainView; if (typeof f !== 'function' || f.__gyxSw) return;
    const w = function () { const r = f.apply(this, arguments); try { if (X.on('gyxSwipe') && C.fade) { const v = [...document.querySelectorAll('[id^="view-"]')].find(vis); if (v) { v.classList.remove('gyx-pg-in'); void v.offsetWidth; v.classList.add('gyx-pg-in'); setTimeout(() => v.classList.remove('gyx-pg-in'), 320); } } } catch (e) {} return r; };
    Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__gyxSw = true; window.switchMainView = w; try { (0, eval)('switchMainView = window.switchMainView'); } catch (e) {}
}
window.gyxSwipeSet = (k, v) => { C[k] = v; save(); window.gyxSwipeOpen(); };
window.gyxSwipeOpen = function () {
    X.panel('gyxSwpOv', '👉 跟手返回', `<div class="gyx-tip">从屏幕左边缘往右拖：页面跟着手指走，拖过一段距离松手就返回，不够就弹回去。快速一划也算。</div>
        <div class="gyx-row">边缘多宽算数 <input type="range" min="12" max="60" value="${C.edge}" onchange="gyxSwipeSet('edge',+this.value)"> ${C.edge}px</div>
        <div class="gyx-row">拖过屏幕的 <input type="range" min="15" max="60" value="${C.need}" onchange="gyxSwipeSet('need',+this.value)"> ${C.need}% 松手才返回</div>
        <label class="gyx-row"><input type="checkbox" ${C.right ? 'checked' : ''} onchange="gyxSwipeSet('right',this.checked)"> 右边缘往左滑也返回（单手用）</label>
        <label class="gyx-row"><input type="checkbox" ${C.shade ? 'checked' : ''} onchange="gyxSwipeSet('shade',this.checked)"> 拖的时候边上有影子</label>
        <label class="gyx-row"><input type="checkbox" ${C.fade ? 'checked' : ''} onchange="gyxSwipeSet('fade',this.checked)"> 切页的时候淡入（不闪白）</label>
        <div class="gyx-tip">这是纯手势，所以没有「TA 会自己做」、今天、小组件和记忆。</div>`);
};
window.gyxSwipeCfg = () => C;
window.gyxSwipeTarget = target;
window.gyxSwipeState = () => G;
X.css('gyxSwpCss', `.gyx-sw-drag{transition:none!important;will-change:transform}.gyx-sw-anim{transition:transform .22s cubic-bezier(.2,.8,.2,1)!important}
.gyx-pg-in{animation:gyxPgIn .28s ease-out}@keyframes gyxPgIn{from{opacity:.35;transform:translateX(14px)}to{opacity:1;transform:none}}`);
X.mini({ id: 'gyxSwipe', icon: '👉', title: '跟手返回', desc: '滑动返回时页面跟着手指走；切页淡入', cat: '生活', onOpen: () => window.gyxSwipeOpen() });
hookView(); setInterval(hookView, 3000);
