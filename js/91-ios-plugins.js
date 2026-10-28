/* =====================================================================
   js/91 —— 🍏 新玩法插件的 iOS 样子（277，她 10/28 定的原型：插件/预览-插件美化）
   · 所有新玩法插件都用同一套弹窗（X.panel → .gyx-ov / .gyx-box / .gyx-bd，合集里是 .gyx-inhub），
     这里不改插件本身，只在外面套一层：
       - 灰底 + 白色圆角分组卡片、实心的按钮、输入框是浅灰底、勾选框变成 iOS 开关；
       - 页面顶上一个大标题（导航栏里的小标题收起来）；
       - 「默认模式的 TA 每天有 xx% 的可能……」、勾选框那些设置项、长长的说明文字，
         收进右上角 ⋯ 弹出来的设置页（原样搬过去，点了照样生效）；
       - 合集列表：图标放进圆角方块，下面那行说明不要了。
   · 开关：小手机 → 美化 → iOS 外观 →「新玩法插件」（gyIos.plug，默认开；iOS 外观整个关了这里也不生效）。
     关掉就是原来的样子（搬走的设置会放回原处——重新打开那个功能就是原样）。
   ===================================================================== */
(function () {
    if (window.__gyIosPlugLoaded) return; window.__gyIosPlugLoaded = true;
    const B = () => document.body;
    const opt = () => { try { const o = window.gyIos ? window.gyIos.get() : JSON.parse(localStorage.getItem('gyIos') || '{}'); return { on: o.on !== false, plug: o.plug !== false }; } catch (e) { return { on: true, plug: true }; } };
    const isOn = () => { const o = opt(); return o.on && o.plug; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const stripEmo = t => String(t || '').replace(/^[\s\p{Extended_Pictographic}‍️⃣]+/u, '').trim() || String(t || '').trim();

    // 哪些是「设置项」：带勾选框的、写着「默认模式 / 自主模式 / 的可能」的
    const SETRE = /默认模式|自主模式|的可能|每天有|每天随机/;
    const textLen = el => (el.textContent || '').replace(/\s+/g, '').length;
    function isSetting(el) {
        if (!el || el.nodeType !== 1 || el.closest('.gy-ios-keep')) return false;
        if (el.querySelector('button,.gyx-btn,textarea,canvas,img,audio,video')) return false;
        if (textLen(el) > 160) return false;
        const cb = el.querySelector('input[type=checkbox]') || (el.matches('input[type=checkbox]') ? el : null);
        if (cb && el.tagName === 'LABEL') return true;
        if (SETRE.test(el.textContent || '') && (el.querySelector('input,select') || el.classList.contains('gyx-tip'))) return true;
        return false;
    }
    // 长长的纯说明（没有能点的）
    const isLongTip = el => el.classList && el.classList.contains('gyx-tip') && !el.querySelector('input,select,button,a,textarea') && textLen(el) > 30 && !el.closest('.gyx-card');

    function titleOf(ov, bd) {
        const t = ov && (ov.querySelector(':scope>.gyp-bar .gyp-title') || ov.querySelector('.gyx-hd b'));
        return t ? t.textContent : '';
    }

    function sheetOf(box, title) {
        let sh = box.querySelector(':scope>.gy-ips');
        if (!sh) {
            sh = document.createElement('div'); sh.className = 'gy-ips';
            sh.innerHTML = `<div class="gy-ips-in"><i class="gy-ips-grab"></i><div class="gy-ips-hd"><span></span><b></b><span class="gy-ips-ok">完成</span></div><div class="gy-ips-g gy-ips-set"></div><div class="gy-ips-hl">说明</div><div class="gy-ips-g gy-ips-tip"></div></div>`;
            sh.addEventListener('click', e => { if (e.target === sh || e.target.closest('.gy-ips-ok')) sh.classList.remove('on'); });
            box.appendChild(sh);
        }
        sh.querySelector('.gy-ips-hd b').textContent = stripEmo(title);
        return sh;
    }

    function moreBtn(ov, box, sh, has) {
        // 页面形式（小手机里）：⋯ 放进 js/85 的导航栏；弹窗形式：放进 .gyx-hd
        const bar = ov.querySelector(':scope>.gyp-bar') || box.querySelector(':scope>.gyx-hd');
        if (!bar) return;
        let m = bar.querySelector(':scope>.gy-ipm');
        if (!has) { if (m) m.remove(); return; }
        if (!m) { m = document.createElement('span'); m.className = 'gy-ipm'; m.textContent = '⋯'; m.title = '设置'; bar.appendChild(m); }
        m.onclick = e => { e.stopPropagation(); sh.classList.add('on'); };
    }

    function decorate(bd) {
        const inHub = !!bd.closest('.gyx-inhub');
        const box = bd.closest('.gyx-box'); if (!box) return;
        const ov = bd.closest('.gyx-ov') || bd.closest('.gyhb-ov');
        if (bd.querySelector(':scope>.gy-ipk')) return;            // 这一版内容已经处理过
        const mk = document.createElement('i'); mk.className = 'gy-ipk'; bd.prepend(mk);
        const title = titleOf(ov, bd);
        // 大标题
        if (!inHub && title) { const lt = document.createElement('div'); lt.className = 'gy-iplt'; lt.textContent = stripEmo(title); mk.after(lt); }
        // 设置项 / 长说明 → ⋯
        const all = Array.from(bd.querySelectorAll('label,.gyx-tip,.gyx-row,p,div'));
        const sets = all.filter(isSetting).filter((el, i, A) => !A.some(o => o !== el && o.contains(el)));
        const tips = all.filter(isLongTip).filter(el => !sets.some(s => s.contains(el) || el.contains(s)));
        // 挪走以后页面上就什么都不剩了（纯设置页，比如省电模式）：不挪，原地变 iOS 样子
        const left = Array.from(bd.querySelectorAll('button,.gyx-btn,textarea,input:not([type=checkbox]),select,[onclick]')).filter(x => !sets.some(s => s.contains(x)));
        const sh = sheetOf(inHub ? bd.closest('.gyx-inhub') : box, title);
        const G1 = sh.querySelector('.gy-ips-set'), G2 = sh.querySelector('.gy-ips-tip');
        G1.innerHTML = ''; G2.innerHTML = '';
        let has = false;
        if (sets.length && left.length) {
            sets.forEach(el => { const ph = document.createComment('gy-ip'); el.__gyPh = ph; el.parentNode.insertBefore(ph, el); el.classList.add('gy-ipr'); G1.appendChild(el); }); has = true;
        }
        if (tips.length && (left.length || sets.length)) {
            tips.forEach(el => { const ph = document.createComment('gy-ip'); el.__gyPh = ph; el.parentNode.insertBefore(ph, el); el.classList.add('gy-ipr'); G2.appendChild(el); }); has = true;
        }
        sh.classList.toggle('notip', !G2.children.length); sh.classList.toggle('noset', !G1.children.length);
        if (inHub) {
            // 合集里：⋯ 放在合集的导航栏
            const hov = bd.closest('.gyhb-ov'); const bar = hov && (hov.querySelector(':scope>.gyp-bar') || hov.querySelector('.gyhb-hd'));
            if (bar) { let m = bar.querySelector(':scope>.gy-ipm'); if (!has) { if (m) m.remove(); } else { if (!m) { m = document.createElement('span'); m.className = 'gy-ipm'; m.textContent = '⋯'; bar.appendChild(m); } m.onclick = e => { e.stopPropagation(); sh.classList.add('on'); }; } }
        } else if (ov) moreBtn(ov, box, sh, has);
    }

    // 合集首页：大标题
    function decorateHub(body) {
        if (!body || body.querySelector(':scope>.gy-ipk')) return;
        const list = body.querySelector(':scope>.gyhb-list'); if (!list) return;
        const mk = document.createElement('i'); mk.className = 'gy-ipk'; body.prepend(mk);
        const hov = body.closest('.gyhb-ov'); const t = hov && (hov.querySelector('.gyp-title') || hov.querySelector('.gyhb-ttl'));
        if (t && t.textContent) { const lt = document.createElement('div'); lt.className = 'gy-iplt'; lt.textContent = stripEmo(t.textContent); mk.after(lt); }
        // 图标方块底色：按名字算一个
        list.querySelectorAll('.gyhb-ri').forEach(ri => { let h = 0; for (const ch of (ri.parentNode.textContent || '')) h = (h * 31 + ch.charCodeAt(0)) % 360; ri.style.setProperty('--gy-ich', h); });
    }

    // 关掉：把搬走的放回原处
    function restoreAll() {
        document.querySelectorAll('.gy-ipr').forEach(el => { const ph = el.__gyPh; if (ph && ph.parentNode) { ph.parentNode.insertBefore(el, ph); ph.remove(); } el.classList.remove('gy-ipr'); });
        document.querySelectorAll('.gy-ips,.gy-ipm,.gy-iplt,.gy-ipk').forEach(e => e.remove());
    }

    // 深色时：插件自己画了浅色底的卡片（每日一问的粉卡、时间胶囊的米色卡……）里，字要换回深色，不然看不清
    const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    function lightBg(cs) {
        const m = cs.backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
        if (m && (m[4] == null || +m[4] > .5) && lum(+m[1], +m[2], +m[3]) > .72) return true;
        const bi = cs.backgroundImage; if (!bi || bi === 'none' || !/gradient/.test(bi)) return false;
        const C = [...bi.matchAll(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/g)].filter(x => x[4] == null || +x[4] > .5);
        return C.length > 0 && C.reduce((a, x) => a + lum(+x[1], +x[2], +x[3]), 0) / C.length > .72;
    }
    function lightFix(bd, force) {
        const dk = B().classList.contains('dark-theme');
        if (!force && bd.__ipDark === dk) return; bd.__ipDark = dk;
        bd.querySelectorAll('.gy-iplite').forEach(e => e.classList.remove('gy-iplite'));
        if (!dk) return;
        const L = bd.querySelectorAll('div,section,label,span,p,li,button:not(.gyx-btn)'); if (L.length > 1500) return;
        L.forEach(el => { if (el.closest('.gy-iplite')) return; try { if (lightBg(getComputedStyle(el))) el.classList.add('gy-iplite'); } catch (e) {} });
    }

    let pend = false;
    function scan() {
        pend = false;
        const on = isOn(); B().classList.toggle('gy-ios-plug', on);
        if (!on) { if (document.querySelector('.gy-ipk')) restoreAll(); return; }
        document.querySelectorAll('.gyx-ov .gyx-bd, .gyx-inhub .gyx-bd').forEach(bd => { try { const fresh = !bd.querySelector(':scope>.gy-ipk'); decorate(bd); lightFix(bd, fresh); } catch (e) {} });
        document.querySelectorAll('.gyhb-body').forEach(b => { try { decorateHub(b); } catch (e) {} });
    }
    const kick = () => { if (!pend) { pend = true; requestAnimationFrame(scan); } };
    window.gyIosPlugScan = scan;
    function boot() {
        try { new MutationObserver(ms => { for (const m of ms) { const t = m.target; if (t.nodeType === 1 && (t === document.body || t.closest && t.closest('.gyx-ov,.gyx-inhub,.gyhb-ov'))) { kick(); return; } } }).observe(document.body, { childList: true, subtree: true }); new MutationObserver(kick).observe(document.body, { attributes: true, attributeFilter: ['class'] }); } catch (e) {}
        // 开关变了（gyIos.set）
        try { const g = window.gyIos; if (g && !g.__plug) { const s = g.set; g.set = function (k, v) { const r = s.apply(this, arguments); if (k === 'plug' || k === 'on') { restoreAll(); setTimeout(scan, 30); } return r; }; g.__plug = 1; } } catch (e) {}
        scan();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

    const st = document.createElement('style'); st.id = 'gyIosPlugCss'; st.textContent = `
body.gy-ios-plug{--ipb:#f2f2f7;--ipc:#fff;--ipt:#000;--ips:#8e8e93;--ipl:rgba(60,60,67,.18);--ipf:rgba(120,120,128,.12);--ipk:#ff2d55}
body.gy-ios-plug.dark-theme{--ipb:#000;--ipc:#1c1c1e;--ipt:#fff;--ipl:rgba(84,84,88,.6);--ipf:rgba(120,120,128,.24)}
.gy-ipk{display:none}
body.gy-ios-plug.dark-theme .gy-iplite :is(.gyx-in,.gyx-who,input,select,textarea){color:#1d1d1f!important;background:rgba(255,255,255,.75)!important}
body.gy-ios-plug.dark-theme .gy-iplite{color:#1d1d1f!important}body.gy-ios-plug.dark-theme .gy-iplite :is(b,p,small,em,i,span,div,label):not(.gyx-btn):not(.gy-iplite *[style*=color]){color:inherit}
body.gy-ios-plug .gyx-ov,body.gy-ios-plug .gyhb-ov{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",sans-serif}
body.gy-ios-plug .gyx-box,body.gy-ios-plug .gyhb-box{background:var(--ipb)!important;color:var(--ipt)!important}
body.gy-ios-plug .gyx-ov.gy-aspage,body.gy-ios-plug .gyhb-ov.gy-aspage{--gyp-bg:var(--ipb)!important;background:var(--ipb)!important}
body.gy-ios-plug .gy-aspage>.gyp-bar{background:var(--ipb)!important;border:0!important;color:var(--ipk)}
body.gy-ios-plug .gy-aspage>.gyp-bar .gyp-back{color:var(--ipk)!important;font-size:30px}
body.gy-ios-plug .gy-aspage>.gyp-bar .gyp-title{opacity:0}
body.gy-ios-plug .gyx-hd{background:var(--ipb)!important;border:0;justify-content:flex-end;gap:8px;min-height:30px}
body.gy-ios-plug .gyx-hd>b{position:absolute;opacity:0;pointer-events:none}
body.gy-ios-plug .gyx-hd>.gyx-x{order:3;width:30px;height:30px;border-radius:15px;background:var(--ipf);color:var(--ips);display:inline-flex;align-items:center;justify-content:center;font-size:13px;padding:0}
.gy-ipm{margin-left:auto;width:30px;height:30px;border-radius:15px;background:var(--ipf);color:var(--ipk);display:inline-flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;cursor:pointer;line-height:1;flex:none;position:relative;z-index:3}
.gyx-hd .gy-ipm{margin:0}
.gy-iplt{font-size:32px;font-weight:700;letter-spacing:.2px;margin:2px 0 14px;color:var(--ipt);line-height:1.15}
body.gy-ios-plug .gyx-bd{padding:4px 16px 28px}
body.gy-ios-plug .gyx-inhub>.gyx-box>.gyx-bd{padding:6px 16px 24px}
body.gy-ios-plug .gyx-card{background:var(--ipc)!important;border-radius:12px;padding:12px 16px;margin:0 0 18px;box-shadow:none}
body.gy-ios-plug .gyx-tip{color:var(--ips);font-size:13px}
body.gy-ios-plug .gyx-btn{background:var(--ipk);color:#fff;border-radius:12px;padding:11px 18px;font-size:16px;font-weight:600}
body.gy-ios-plug .gyx-btn.lite{background:var(--ipf);color:var(--ipk)}
body.gy-ios-plug .gyx-in,body.gy-ios-plug .gyx-who{background:var(--ipf)!important;border:0!important;border-radius:10px;color:var(--ipt);font-size:16px;padding:9px 12px}
body.gy-ios-plug textarea.gyx-in{background:var(--ipc)!important;border-radius:12px;padding:12px 14px}
body.gy-ios-plug .gyx-chip{background:var(--ipf);color:var(--ipt);font-size:13px;font-weight:600;padding:6px 13px}
body.gy-ios-plug .gyx-chip.on{background:var(--ipt);color:var(--ipb)}
body.gy-ios-plug :is(.gyx-bd,.gy-ips) input[type=checkbox]{-webkit-appearance:none;appearance:none;width:51px;height:31px;border-radius:16px;background:var(--ipf);position:relative;flex:none;cursor:pointer;transition:background .2s;margin:0 0 0 auto;vertical-align:middle}
body.gy-ios-plug :is(.gyx-bd,.gy-ips) input[type=checkbox]::after{content:"";position:absolute;left:2px;top:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.15);transition:transform .2s}
body.gy-ios-plug :is(.gyx-bd,.gy-ips) input[type=checkbox]:checked{background:#34c759}
body.gy-ios-plug :is(.gyx-bd,.gy-ips) input[type=checkbox]:checked::after{transform:translateX(20px)}
body.gy-ios-plug :is(.gyx-bd,.gy-ips) input[type=checkbox]:disabled{opacity:.4}
body.gy-ios-plug .gyx-bd label:has(>input[type=checkbox]){display:flex;align-items:center;gap:10px;background:var(--ipc);border-radius:12px;padding:10px 16px;margin:0 0 8px;font-size:16px}
body.gy-ios-plug .gyx-bd label:has(>input[type=checkbox])>input[type=checkbox]{order:2}

/* 小手机（手机上）：不是居中的小弹窗，是 iOS 那种从底下升上来的整页卡片 */
body.gy-ios-plug.gyphm-mob :is(.gyx-ov,.gyhb-ov):not(.gy-aspage){align-items:flex-end!important;padding:0!important;background:rgba(0,0,0,.3)!important}
body.gy-ios-plug.gyphm-mob :is(.gyx-ov,.gyhb-ov):not(.gy-aspage)>:is(.gyx-box,.gyhb-box){width:100%!important;max-width:none!important;height:calc(100% - 48px)!important;max-height:none!important;border-radius:12px 12px 0 0!important;box-shadow:0 -6px 30px rgba(0,0,0,.15)!important;animation:gyIpUp .32s cubic-bezier(.2,.8,.2,1)}
@keyframes gyIpUp{from{transform:translateY(60%);opacity:.4}}
body.gy-ios-plug .gyhb-hd{background:var(--ipb)!important;border:0!important;justify-content:flex-end;gap:8px}
body.gy-ios-plug .gyhb-hd>.gyhb-ttl{position:absolute;opacity:0;pointer-events:none}
body.gy-ios-plug .gyhb-hd>.gyhb-back{margin-right:auto;color:var(--ipk);font-size:30px}
body.gy-ios-plug .gyhb-hd>.gyhb-x{order:3;width:30px;height:30px;border-radius:15px;background:var(--ipf);color:var(--ips);display:inline-flex;align-items:center;justify-content:center;font-size:13px;padding:0}
/* ⋯ 设置页（从底下升上来） */
.gy-ips{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,0);pointer-events:none;transition:background .25s}
.gyx-ov .gy-ips,.gyhb-ov .gy-ips{position:fixed}
.gy-ips.on{background:rgba(0,0,0,.25);pointer-events:auto}
.gy-ips-in{position:absolute;left:0;right:0;bottom:0;max-height:88%;overflow:auto;background:var(--ipb);color:var(--ipt);border-radius:12px 12px 0 0;padding:6px 0 calc(24px + env(safe-area-inset-bottom,0px));transform:translateY(105%);transition:transform .3s cubic-bezier(.2,.8,.2,1);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",sans-serif}
.gy-ips.on .gy-ips-in{transform:none}
.gy-ips-grab{display:block;width:36px;height:5px;border-radius:3px;background:var(--ipl);margin:0 auto}
.gy-ips-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 16px;font-size:17px}.gy-ips-hd span{width:44px}.gy-ips-ok{color:var(--ipk);font-weight:600;cursor:pointer;text-align:right}
.gy-ips-g{background:var(--ipc);border-radius:12px;margin:0 16px 22px;overflow:hidden}
.gy-ips-g>*{display:flex!important;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 16px!important;margin:0!important;font-size:15px!important;color:var(--ipt)!important;line-height:1.5;border-radius:0!important;background:none!important;position:relative}
.gy-ips-g>*+*::before{content:"";position:absolute;top:0;left:16px;right:0;border-top:.5px solid var(--ipl)}
.gy-ips-g>label>input[type=checkbox]{order:2}
.gy-ips-g input:not([type=checkbox]),.gy-ips-g select{background:var(--ipf)!important;border:0!important;border-radius:8px;padding:5px 8px;font-size:15px;color:var(--ipt)}
.gy-ips-tip>*{color:var(--ips)!important;font-size:13px!important;display:block!important}
.gy-ips-hl{font-size:13px;color:var(--ips);padding:0 32px 7px}
.gy-ips.notip .gy-ips-hl,.gy-ips.notip .gy-ips-tip,.gy-ips.noset .gy-ips-set{display:none}
/* 合集列表 */
body.gy-ios-plug .gyhb-list{background:var(--ipc);border-radius:12px;margin:0 16px 22px;padding:0!important;overflow:hidden}
body.gy-ios-plug .gyhb-body>.gy-iplt{padding:0 16px}
body.gy-ios-plug .gyhb-row{border-radius:0!important;border-bottom:0!important;padding:11px 16px!important;position:relative;gap:12px}
body.gy-ios-plug .gyhb-row+.gyhb-row::before{content:"";position:absolute;top:0;left:58px;right:0;border-top:.5px solid var(--ipl)}
body.gy-ios-plug .gyhb-ri{width:30px!important;height:30px!important;border-radius:7px!important;display:inline-flex;align-items:center;justify-content:center;font-size:17px!important;background:hsl(var(--gy-ich,210),70%,90%)!important;flex:none}
body.gy-ios-plug.dark-theme .gyhb-ri{background:hsl(var(--gy-ich,210),35%,26%)!important}
body.gy-ios-plug .gyhb-rm b{font-size:17px;font-weight:400}
body.gy-ios-plug .gyhb-rm em{display:none!important}
body.gy-ios-plug .gyhb-ra{color:#c4c4c7}
body.gy-ios-plug .gyhb-tabs{padding:4px 16px 10px}
`;
    (document.head || document.documentElement).appendChild(st);
})();
