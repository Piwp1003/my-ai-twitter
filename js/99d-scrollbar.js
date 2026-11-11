/* =====================================================================
   js/99d —— 🫥 透明滑动条（304）
   她说的：「所有页面都做透明滑动条，不要有侧边滑动栏，鼠标停留在页面上移动时显示。」
   · 平时：滑动条完全透明，旁边那条灰色的槽也没有。
   · 鼠标在页面上动（或者正在滚、手指在划）的时候：浮出一条细细的半透明滑块，停下 1.2 秒后又隐掉。
   · 所有页面、弹窗、软件、小手机里都一样（角色卡自己带的网页框除外，那是别人的页面）。
   · 全部开关 →「🫥 透明滑动条」能关，关了就回到原来的样子。
   ===================================================================== */
(function () {
    if (window.__gyScrollbar) return; window.__gyScrollbar = 1;
    const KEY = 'gyGhostScroll';
    const on = () => { try { return typeof isAutoOn === 'function' ? isAutoOn(KEY) : true; } catch (e) { return true; } };
    const CSS = `
html.gy-gsb *::-webkit-scrollbar{width:6px!important;height:6px!important;background:transparent!important}
html.gy-gsb *::-webkit-scrollbar-track,html.gy-gsb *::-webkit-scrollbar-track-piece,html.gy-gsb *::-webkit-scrollbar-corner,html.gy-gsb *::-webkit-scrollbar-button{background:transparent!important;border:0!important;box-shadow:none!important;display:block;width:0;height:0}
html.gy-gsb *::-webkit-scrollbar-thumb{background:transparent!important;border:0!important;border-radius:6px!important;box-shadow:none!important}
html.gy-gsb.gy-gsb-show *::-webkit-scrollbar-thumb{background:rgba(128,128,128,.42)!important}
html.gy-gsb.gy-gsb-show *::-webkit-scrollbar-thumb:hover{background:rgba(128,128,128,.62)!important}
html.gy-gsb::-webkit-scrollbar,html.gy-gsb body::-webkit-scrollbar{width:6px!important;height:6px!important;background:transparent!important}
@supports not selector(::-webkit-scrollbar){
html.gy-gsb,html.gy-gsb *{scrollbar-width:thin!important;scrollbar-color:transparent transparent!important}
html.gy-gsb.gy-gsb-show,html.gy-gsb.gy-gsb-show *{scrollbar-color:rgba(128,128,128,.45) transparent!important}
}`;
    function mount() {
        let st = document.getElementById('gyGhostScrollCss');
        if (!st) { st = document.createElement('style'); st.id = 'gyGhostScrollCss'; st.textContent = CSS; }
        (document.head || document.documentElement).appendChild(st);   // 放到最后面，压过各页面自己写的滑动条样式
        document.documentElement.classList.toggle('gy-gsb', on());
    }
    let t = 0;
    function show() {
        const h = document.documentElement;
        if (!h.classList.contains('gy-gsb')) return;
        h.classList.add('gy-gsb-show');
        clearTimeout(t); t = setTimeout(() => h.classList.remove('gy-gsb-show'), 1200);
    }
    ['mousemove', 'wheel', 'touchmove'].forEach(ev => { try { window.addEventListener(ev, show, { passive: true, capture: true }); } catch (e) {} });
    try { window.addEventListener('scroll', show, { passive: true, capture: true }); } catch (e) {}
    function reg() {
        try {
            if (typeof AUTO_FEATURE_DEFS === 'undefined' || AUTO_FEATURE_DEFS.some(f => f.key === KEY)) return;
            AUTO_FEATURE_DEFS.push({ key: KEY, label: '🫥 透明滑动条', group: (AUTO_FEATURE_DEFS.find(f => f.key === 'gyNotifFg') || {}).group || '通知', desc: '所有页面的滑动条平时看不见，旁边也没有那条灰色的槽；鼠标在页面上动、或者正在滚的时候才浮出一条细细的半透明滑块，停下来又隐掉。关掉就回到原来的样子。', cost: '不调用 API', where: '所有页面' });
            if (typeof window.setAutoFeature === 'function' && !window.setAutoFeature.__gyGsb) {
                const o = window.setAutoFeature;
                const w = function (key) { const r = o.apply(this, arguments); if (key === KEY) setTimeout(mount, 30); return r; };
                Object.keys(o).forEach(k => { try { w[k] = o[k]; } catch (e) {} });
                w.__gyGsb = true; window.setAutoFeature = w;
            }
        } catch (e) {}
    }
    function boot() { reg(); mount(); setTimeout(() => { reg(); mount(); }, 2500); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    window.gyGhostScroll = { on, refresh: mount, show };
})();
