/* ===========================================================================
   js/90 —— 🍏 iOS 外观（小手机模式）
   ---------------------------------------------------------------------------
   · 桌面：液态玻璃图标 / 小组件 / Dock（一张 WebGL 画布，壁纸当纹理，所有玻璃块共用一个采样坐标系：
     圆角遮罩、全表面折射、左上强右下弱的边缘高光）；WebGL 不行 → CSS 毛玻璃兜底
   · 软件（微博 / 小红书 / 豆瓣 / iMessage …）和推特：浮动胶囊底栏、玻璃返回键、iMessage 浅蓝气泡、豆瓣条目页
   · 开关都在 小手机 → 美化 →「iOS 外观」：总开关、液态玻璃、状态栏（自动 / 显示 / 隐藏）、底部导航栏（显示 / 收起）
     浅色 / 深色就是美化最上面那一排（iOS 外观开着时，软件也跟着一起变深色）
   设置存本机 localStorage「gyIos」，不进存档。总开关关掉 = 完全是以前的样子。
   =========================================================================== */
(function () {
    'use strict';
    if (window.__gyIosLoaded) return;
    window.__gyIosLoaded = true;

    const KEY = 'gyIos';
    const DEF = { on: true, glass: true, sb: 'auto', tab: 'show', xcard: true, plug: true };   // plug：新玩法插件也换成 iOS 样子（js/91）
    let O = Object.assign({}, DEF);
    try { Object.assign(O, JSON.parse(localStorage.getItem(KEY) || '{}') || {}); } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(O)); } catch (e) {} };
    const B = () => document.body;
    const mob = () => B().classList.contains('gyphm-mob');
    const sbShown = () => O.sb === 'on' || (O.sb === 'auto' && !mob());

    function apply() {
        const b = B(); if (!b) return;
        const on = !!O.on;
        b.classList.toggle('gy-ios', on);
        b.classList.toggle('gy-ios-glass', on && O.glass !== false);
        b.classList.toggle('gy-ios-nosb', on && O.sb === 'off');
        b.classList.toggle('gy-ios-sbon', on && O.sb === 'on');
        b.classList.toggle('gy-ios-tabmini', on && O.tab === 'mini');
        hookSoft();
        glass.sync();
    }

    window.gyIos = {
        get: () => Object.assign({}, O),
        set(k, v) {
            O[k] = v; save(); apply(); if (k === 'xcard' || k === 'on') try { xpDecor(); } catch (e) {}
            try { document.querySelectorAll('.gys-root.on').forEach(r => window.GYS && GYS.paint(r.id.replace(/^gys_/, ''))); } catch (e) {}
            if (k === 'on' && v) syncDark();
            try { if (typeof window.gyPmHomeRender === 'function') window.gyPmHomeRender(); } catch (e) {}
            try { if (document.getElementById('gyPmSheet') && document.getElementById('gyPmSheet').classList.contains('on')) window.gyPmBeauty(); } catch (e) {}
        },
        refresh: () => glass.refresh()
    };

    /* ---------- 浅色 / 深色：iOS 外观开着时，美化里的「深色」也让软件（谷雨的深色模式）一起变 ---------- */
    function pmDark() { return B().classList.contains('pm-dark'); }
    function setAppDark(v) {
        try {
            if (typeof darkTheme === 'undefined' || !!darkTheme === !!v) return;
            darkTheme = !!v;
            const t = document.getElementById('darkThemeToggle'); if (t) t.checked = !!v;
            if (typeof applyDarkTheme === 'function') applyDarkTheme(); else B().classList.toggle('dark-theme', !!v);
            if (typeof saveAllData === 'function') saveAllData();
        } catch (e) {}
    }
    function syncDark() { if (O.on && B().classList.contains('gyphm')) setAppDark(pmDark()); }

    /* ---------- 包一层：美化抽屉加「iOS 外观」、改深浅色时同步、桌面重画后玻璃跟着刷新 ---------- */
    function wrap() {
        if (typeof window.gyPmBeauty === 'function' && !window.gyPmBeauty.__ios) {
            const orig = window.gyPmBeauty;
            window.gyPmBeauty = function () {
                const r = orig.apply(this, arguments);
                try {
                    const sh = document.getElementById('gyPmSheet'), h = sh && sh.querySelector('h4');
                    if (h && !sh.querySelector('.gy-ios-sec')) h.insertAdjacentHTML('afterend', beautyHtml());
                } catch (e) {}
                return r;
            };
            window.gyPmBeauty.__ios = 1;
        }
        if (typeof window.gyPmPref === 'function' && !window.gyPmPref.__ios) {
            const orig = window.gyPmPref;
            window.gyPmPref = function (k, v) { const r = orig.apply(this, arguments); if (k === 'dark' && O.on) setAppDark(!!v); if (k === 'style' || k === 'cols') glass.refreshSoon(); return r; };
            window.gyPmPref.__ios = 1;
        }
        if (typeof window.gyPmHomeRender === 'function' && !window.gyPmHomeRender.__ios) {
            const orig = window.gyPmHomeRender;
            window.gyPmHomeRender = function () { const r = orig.apply(this, arguments); glass.sync(); return r; };
            window.gyPmHomeRender.__ios = 1;
        }
        iosWidgets();
        if (typeof window.gyPmSet === 'function' && !window.gyPmSet.__ios) {
            const orig = window.gyPmSet;
            window.gyPmSet = function (on) { const r = orig.apply(this, arguments); setTimeout(() => { apply(); if (on) syncDark(); }, 60); return r; };
            window.gyPmSet.__ios = 1;
        }
    }
    function beautyHtml() {
        const c = (k, v, lab) => `<span class="chip${String(O[k]) === String(v) ? ' on' : ''}" onclick='gyIos.set("${k}",${JSON.stringify(v)})'>${lab}</span>`;
        return `<div class="gy-ios-sec"><div class="lbl">🍏 iOS 外观</div><div class="seg">${c('on', true, '开')}${c('on', false, '关（以前的样子）')}</div>
          ${O.on ? `<div class="lbl">液态玻璃（图标、小组件、Dock）</div><div class="seg">${c('glass', true, '开')}${c('glass', false, '关')}</div>
          <div class="lbl">状态栏</div><div class="seg">${c('sb', 'auto', '自动')}${c('sb', 'on', '显示')}${c('sb', 'off', '隐藏')}</div>
          <div class="lbl">底部导航栏</div><div class="seg">${c('tab', 'show', '显示')}${c('tab', 'mini', '收起（点一下展开）')}</div>
          <div class="lbl">推特个人主页</div><div class="seg">${c('xcard', true, '玻璃卡片（横幅模糊铺底）')}${c('xcard', false, '普通的')}</div>
          <div class="lbl">新玩法插件</div><div class="seg">${c('plug', true, 'iOS 样子')}${c('plug', false, '原来的样子')}</div>` : ''}</div>`;
    }

    /* ---------- 软件（GYS）：状态栏听这里的；收起的底栏点一下展开 ---------- */
    function hookSoft() {
        const S = window.GYS; if (!S || S.__iosHook) return; S.__iosHook = 1;
        const origSb = S.sbOn;
        S.sbOn = () => (O.on && O.sb !== 'auto') ? O.sb === 'on' : origSb();   // 自动 = 听「🍎 软件外观」那里的
        const origPaint = S.paint;
        S.paint = function (key) { const r = origPaint.apply(this, arguments); try { softDecor(key); } catch (e) {} return r; };
    }
    // 软件里每画一次页面之后：豆瓣作品页铺一层模糊的海报
    function softDecor(key) {
        const R = document.getElementById('gys_' + key); if (!R) return;
        if (key === 'douban') {
            const cv = O.on && R.querySelector('.gys-body.db-itb .db-ithc .db-cv');
            R.classList.toggle('gy-dbon', !!cv);
            if (cv && !R.querySelector(':scope>.gy-dbbg')) {
                const d = document.createElement('div'); d.className = 'gy-dbbg'; const i = document.createElement('i');
                i.setAttribute('style', cv.getAttribute('style') || ''); d.appendChild(i); R.prepend(d);
            }
        }
    }

    /* ---------- 推特个人主页：横幅模糊铺底 + 资料是一张玻璃卡片 ---------- */
    let XPK = '';
    function xpDecor() {
        const b = B(), vp = document.getElementById('view-profile');
        if (!vp || !b.classList.contains('gyphm-xp') || !O.on || O.xcard === false) { if (vp) vp.classList.remove('gy-xpon'); return; }
        const bn = document.getElementById('profBanner'); if (!bn) return;
        const cs = getComputedStyle(bn), bi = cs.backgroundImage, bc = cs.backgroundColor, key = bi.length + '|' + bi.slice(0, 120) + '|' + bc;
        let bg = vp.querySelector(':scope>.gy-xpbg');
        if (!bg) { bg = document.createElement('div'); bg.className = 'gy-xpbg'; bg.innerHTML = '<i></i>'; vp.prepend(bg); XPK = ''; }
        if (key !== XPK) { XPK = key; const i = bg.firstChild; i.style.backgroundImage = bi && bi !== 'none' ? bi : ''; i.style.backgroundColor = bc; }
        vp.classList.add('gy-xpon');
    }
    setInterval(() => { try { if (O.on && B().classList.contains('gyphm-xp')) xpDecor(); } catch (e) {} }, 700);
    const xpWatch = () => { try { new MutationObserver(() => { try { xpDecor(); } catch (e) {} }).observe(document.body, { attributes: true, attributeFilter: ['class'] }); } catch (e) {} };

    /* ---------- 小组件：iOS 排版（iOS 外观开着时换；关掉还是原来的） ---------- */
    function iosWidgets() {
        const W = window.__gyPmW; if (!W || W.__ios) return !!W; W.__ios = 1;
        const { WD, esc, pad, MSV, fmtT, WK } = W; const T = (w, k, d) => { try { return W.T(w, k, d); } catch (e) { return d; } };
        const dk = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const evs = d => {
            let x = { mine: [], anniv: [], birth: [] }; try { if (typeof window.gyMyCalDay === 'function') x = window.gyMyCalDay(dk(d)); } catch (e) {}
            return [].concat(x.mine.map(it => ({ t: it.text, s: [it.time, it.place].filter(Boolean).join(' '), c: '#ff9500' })), x.anniv.map(a => ({ t: a, s: '纪念日', c: '#ff2d55' })), x.birth.map(n => ({ t: n + ' 生日', s: '全天', c: '#af52de' })));
        };
        const evHtml = (L, n) => L.length ? L.slice(0, n).map(e => `<div class="ev" style="--c:${e.c}"><b>${esc(e.t)}</b>${e.s ? `<span>${esc(e.s)}</span>` : ''}</div>`).join('') : '<div class="no">今天没有日程</div>';
        const IOS = {
            clock(w) {
                const d = new Date();
                if (w.size === 's') return `<div class="gi-clk s"><em>星期${WK[d.getDay()]}</em><b>${pad(d.getHours())}:${pad(d.getMinutes())}</b><span>${d.getMonth() + 1}月${d.getDate()}日</span></div>`;
                return `<div class="gi-clk m"><div><em>星期${WK[d.getDay()]}</em><span>${d.getMonth() + 1}月${d.getDate()}日</span></div><b>${pad(d.getHours())}:${pad(d.getMinutes())}</b></div>`;
            },
            cal(w) {
                if (w.size === 's' && w.d && w.d.img) return null;   // 你放了照片的那种还是原来的
                const d = new Date(), L = evs(d);
                const head = `<em>星期${WK[d.getDay()]}</em><b>${d.getDate()}</b>`;
                if (w.size === 's') return `<div class="gi-cal s" data-day="${dk(d)}">${head}<div class="evs">${evHtml(L, 2)}</div></div>`;
                const first = new Date(d.getFullYear(), d.getMonth(), 1).getDay(), days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                let g = '日一二三四五六'.split('').map(x => `<i class="h">${x}</i>`).join('');
                for (let i = 0; i < first; i++) g += '<i></i>';
                for (let i = 1; i <= days; i++) { const x = new Date(d.getFullYear(), d.getMonth(), i); g += `<i class="${i === d.getDate() ? 'on' : ''}${evs(x).length ? ' has' : ''}" data-day="${dk(x)}">${i}</i>`; }
                return `<div class="gi-cal m"><div class="l">${head}<div class="evs">${evHtml(L, 2)}</div></div><div class="r"><span class="mo">${d.getMonth() + 1}月</span><div class="g">${g}</div></div></div>`;
            },
            music(w) {
                const m = typeof window.gymNowInfo === 'function' ? window.gymNowInfo() : null;
                const pct = m && m.d ? Math.min(100, m.t / m.d * 100) : 0;
                return `<div class="gi-mu"><div class="cv${m && m.cover ? '' : ' empty'}"${m && m.cover ? ` style="background-image:url('${esc(m.cover)}')"` : ''}>${m && m.cover ? '' : MSV.note}</div>
                  <div class="r"><span class="src">${m && m.playing ? '正在播放' : '音乐'}</span><b>${m ? esc(m.title) : T(w, 'none', '没有在放歌')}</b><span class="ar">${m ? esc(m.artist || '未知歌手') : T(w, 'none2', '轻点去音乐盒挑一首')}</span>
                  <div class="bar"><i><u style="width:${pct}%"></u></i><span>${fmtT(m && m.t)}</span></div>
                  <div class="ctl"><span data-mc="prev">${MSV.prev}</span><span data-mc="toggle" class="pp">${m && m.playing ? MSV.pause : MSV.play}</span><span data-mc="next">${MSV.next}</span></div></div></div>`;
            },
            weather(w) {
                const x = typeof window.gymapWeatherInfo === 'function' ? window.gymapWeatherInfo() : null; if (!x) return null;
                const now = x.now != null ? x.now : x.max;
                if (w.size === 's') return `<div class="gi-we s"><span class="ct">${T(w, 'city', x.city || '你这边')} <i>➤</i></span><b>${now}°</b><div class="ic">${x.icon || ''}</div><span class="ds">${esc(x.desc)}</span><span class="rg">最高 ${x.max}° 最低 ${x.min}°</span></div>`;
                return `<div class="gi-we m"><div class="l"><span class="ct">${T(w, 'city', x.city || '你这边')} <i>➤</i></span><b>${now}°</b></div><div class="r"><div class="ic">${x.icon || ''}</div><span class="ds">${esc(x.desc)}</span><span class="rg">最高 ${x.max}° 最低 ${x.min}°${x.rain != null ? `<br>降水 ${x.rain}%` : ''}</span></div></div>`;
            },
            todo(w) {
                const it = (w.d && w.d.items) || [], left = it.filter(x => !x.done).length;
                return `<div class="gi-todo"><div class="h"><span class="ico">≡</span><b>${left}</b><em data-todoadd="${w.id}">＋</em></div><span class="tt">${T(w, 'h', '今天')}</span>${it.slice(0, w.size === 's' ? 3 : 4).map((x, i) => `<div class="ti${x.done ? ' done' : ''}" data-todo="${w.id}|${i}"><i></i><span>${esc(x.t)}</span></div>`).join('') || '<div class="no">都做完了</div>'}</div>`;
            },
            unread(w) {
                const un = W.G().unread ? W.G().unread() : 0; let nn = 0; try { nn = unreadNotifs || 0; } catch (e) {}
                return `<div class="gi-un"><span class="h">${T(w, 'h', '等你回')}</span><b>${un}</b><span>${nn ? `还有 ${nn} 条通知` : '通知都看完了'}</span></div>`;
            }
        };
        Object.keys(IOS).forEach(k => {
            const def = WD[k]; if (!def || def.__ios) return; const orig = def.r; def.__ios = 1;
            def.r = function (w) { if (O.on && !(w && w.d && w.d.v)) {   // 你挑了别的款式（翻页时钟之类）就照你挑的
                try { const h = IOS[k].call(this, w); if (h != null) return h; } catch (e) {} } return orig.apply(this, arguments); };
        });
        return true;
    }
    document.addEventListener('click', e => {
        if (!O.on || O.tab !== 'mini') return;
        const bar = e.target.closest && e.target.closest('.gys-tabs,#gyPmX'); if (!bar) return;
        if (!bar.classList.contains('gy-open')) { e.preventDefault(); e.stopPropagation(); bar.classList.add('gy-open'); setTimeout(() => bar.classList.remove('gy-open'), 6000); }
        else setTimeout(() => bar.classList.remove('gy-open'), 50);
    }, true);

    /* ================= 液态玻璃（WebGL） ================= */
    const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const FS = (N) => `
precision highp float;
#define MAXN ${N}
uniform sampler2D T; uniform vec2 R; uniform float DPR; uniform float DK;
uniform vec4 BX[MAXN]; uniform float RD[MAXN]; uniform int N;
vec3 tex(vec2 p){ return texture2D(T,clamp(p/R,vec2(0.),vec2(1.))).rgb; }
float sdr(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
void main(){
  vec2 p=vec2(gl_FragCoord.x, R.y-gl_FragCoord.y);
  vec4 o=vec4(0.);
  for(int i=0;i<MAXN;i++){
    if(i>=N) break;
    vec2 h=BX[i].zw*.5; vec2 c=BX[i].xy+h; vec2 q=p-c;
    float d=sdr(q,h,RD[i]);
    if(d<6.*DPR){
      if(d>0.){ float sy=clamp((q.y+h.y*.2)/(h.y*1.2),0.,1.); o=max(o,vec4(0.,0.,0.,(.035+.05*sy)*exp(-d/(3.5*DPR)))); continue; }
      float m=min(h.x,h.y);
      float depth=clamp(-d/m,0.,1.);
      float bd=d/DPR;
      vec2 dir=q/max(length(q),.001);
      float bend=(pow(1.-depth,2.2)*14.3+(1.-depth)*5.)*DPR;
      vec2 sp=p-dir*bend;
      float k=1.6*DPR;
      vec3 g=tex(sp)*4.+tex(sp+vec2(k,0.))+tex(sp-vec2(k,0.))+tex(sp+vec2(0.,k))+tex(sp-vec2(0.,k));
      g/=8.;
      float ca=(1.-depth)*1.4*DPR;
      g.r=mix(g.r,tex(sp+dir*ca).r,.6); g.b=mix(g.b,tex(sp-dir*ca).b,.6);
      g=mix(g,vec3(1.-DK),DK>.5?.30:.12);
      /* 纯色壁纸上也要看得出是一块玻璃：上亮下暗一点点、右下内侧一圈淡淡的暗边 */
      g*=1.+(DK>.5?.05:.035)*(-q.y/h.y);
      float ang0=atan(q.y,q.x);
      float inner=exp(-pow((bd+3.2)/2.2,2.))*exp(-pow((ang0-1.2)/1.1,2.));
      g=mix(g,vec3(0.),inner*(DK>.5?.25:.07));
      float ang=atan(q.y,q.x);
      float hair=exp(-pow((bd+1.1)/1.15,2.));
      float ul=exp(-pow((ang+2.38)/.62,2.)), lr=exp(-pow((ang-.76)/.64,2.));
      float glint=hair*(ul*.66+lr*.48)*2.2+hair*.2;
      float top=(1.-clamp((q.y+h.y)/(h.y*1.2),0.,1.))*.06;
      g=mix(g,vec3(1.),clamp(glint+top,0.,.76));
      float a=1.-smoothstep(-.7*DPR,.3*DPR,d);
      o=vec4(mix(o.rgb,g,a),max(o.a,a));
    }
  }
  gl_FragColor=vec4(o.rgb*o.a,o.a);
}`;
    const SEL = '#gyPmHome .pm-page .pm-ic:not(.img), #gyPmHome .pm-dock .pm-ic:not(.img), #gyPmHome .pm-w.gy-lgw, #gyPmHome > .pm-dock';
    const glass = (() => {
        let cv = null, gl = null, U = null, tx = null, MAXN = 40, ok = null, src = '', ready = false, raf = 0, dpr = 1, home = null;
        function want() { const b = B(); return b && O.on && O.glass !== false && b.classList.contains('gyphm') && !b.classList.contains('gyphm-edit'); }
        function init() {
            if (ok === false) return false; if (gl) return true;
            cv = document.createElement('canvas'); cv.className = 'gy-lg';
            gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
            if (!gl) { ok = false; return false; }
            const maxV = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) || 0;
            MAXN = Math.max(0, Math.min(40, Math.floor((maxV - 12) / 2)));
            if (MAXN < 12) { ok = false; return false; }
            const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
            const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS(MAXN));
            if (!vs || !fs) { ok = false; return false; }
            const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
            if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { ok = false; return false; }
            gl.useProgram(pr);
            const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
            const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
            U = {}; ['R', 'DPR', 'DK', 'BX', 'RD', 'N'].forEach(n => { U[n] = gl.getUniformLocation(pr, n); });
            tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
            [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([a, b]) => gl.texParameteri(gl.TEXTURE_2D, a, b));
            cv.addEventListener('webglcontextlost', e => { e.preventDefault(); ok = false; gl = null; off(); });
            ok = true; return true;
        }
        function off() { if (cv && cv.parentNode) cv.remove(); ready = false; if (home) home.classList.remove('gy-lg-on'); }
        // 背后的「壁纸」画进一张同尺寸的画布：图片按 cover 铺；纯色 / 渐变照样画；视频 / 实况拿不到像素 → 退回 CSS
        function bgSource(cb) {
            const bgEl = home.querySelector('.pm-wall .bg'); const W = home.clientWidth, H = home.clientHeight;
            if (!bgEl || !W || !H) return cb(null);
            const cs = getComputedStyle(bgEl), bi = cs.backgroundImage || '', bc = cs.backgroundColor || '#f2f2f4';
            const blur = parseFloat((cs.filter || '').replace(/[^\d.]/g, '')) || 0;
            const key = [W, H, bi.slice(0, 200), bi.length, bc, blur].join('|');
            if (key === src && ready) return cb('same');
            const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
            const x = c.getContext('2d'); x.fillStyle = bc; x.fillRect(0, 0, c.width, c.height);
            const done = () => { src = key; cb(c); };
            const m = bi.match(/url\(["']?(.*?)["']?\)/);
            if (m && !/^gylive:/.test(m[1])) {
                const im = new Image(); im.crossOrigin = 'anonymous';
                im.onload = () => { try { const s = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s; if (blur) x.filter = `blur(${blur * dpr}px)`; x.drawImage(im, (c.width - w) / 2, (c.height - h) / 2, w, h); x.filter = 'none'; done(); } catch (e) { cb(null); } };
                im.onerror = () => cb(null); im.src = m[1]; return;
            }
            const g = bi.match(/linear-gradient\(([^)]*\)?[^)]*)\)/);
            if (g) {
                const cols = g[1].match(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/gi) || [];
                if (cols.length >= 2) { const lg = x.createLinearGradient(0, 0, c.width * .35, c.height); cols.forEach((cc, i) => lg.addColorStop(i / (cols.length - 1), cc)); x.fillStyle = lg; x.fillRect(0, 0, c.width, c.height); }
            } else if (bi && bi !== 'none') return cb(null);   // 别的（视频 / 实况）不画
            done();
        }
        function draw() {
            raf = 0;
            if (!want()) { off(); return; }
            home = document.getElementById('gyPmHome'); if (!home || !home.clientWidth) return;
            if (!init()) { off(); return; }
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            const wall = home.querySelector('.pm-wall');
            if (cv.parentNode !== home) { if (wall) wall.after(cv); else home.prepend(cv); }
            // 3D 视差时壁纸在动，折射对不上 → 这时候退回 CSS 玻璃
            if (home.classList.contains('pm-3d') || home.querySelector('.pm-wall video')) { off(); return; }
            bgSource(c => {
                if (!c) { off(); return; }
                if (c !== 'same') { gl.bindTexture(gl.TEXTURE_2D, tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); }
                ready = true; paint();
            });
        }
        function paint() {
            const hb = home.getBoundingClientRect(); if (!hb.width) return;
            const W = Math.round(hb.width * dpr), H = Math.round(hb.height * dpr);
            if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
            // 小组件：跟随 / 玻璃 两种主题才变液态玻璃（别的颜色是你自己挑的，不动）
            home.querySelectorAll('.pm-w').forEach(w => w.classList.toggle('gy-lgw', !/\bth-(?!glass)\w/.test(w.className)));
            const bx = [], rd = [];
            home.querySelectorAll(SEL).forEach(el => {
                if (rd.length >= MAXN) return;
                if (el.style && /background/.test(el.getAttribute('style') || '')) return;   // 你给这个图标换了底色
                const r = el.getBoundingClientRect();
                if (!r.width || r.right < hb.left || r.left > hb.right || r.bottom < hb.top || r.top > hb.bottom) return;
                const cs = getComputedStyle(el); let rr = cs.borderTopLeftRadius || '0';
                rr = /%/.test(rr) ? parseFloat(rr) / 100 * Math.min(r.width, r.height) : parseFloat(rr) || 0;
                bx.push((r.left - hb.left) * dpr, (r.top - hb.top) * dpr, r.width * dpr, r.height * dpr); rd.push(Math.min(rr, Math.min(r.width, r.height) / 2) * dpr);
            });
            const BX = new Float32Array(MAXN * 4), RD = new Float32Array(MAXN); BX.set(bx); RD.set(rd);
            gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(U.R, W, H); gl.uniform1f(U.DPR, dpr); gl.uniform1f(U.DK, B().classList.contains('pm-dark') ? 1 : 0);
            gl.uniform4fv(U.BX, BX); gl.uniform1fv(U.RD, RD); gl.uniform1i(U.N, rd.length);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            home.classList.add('gy-lg-on');
        }
        const refresh = () => { if (!raf) raf = requestAnimationFrame(draw); };
        // 滑页 / 滚动时只重画玻璃（不重新做壁纸纹理）
        const fast = () => { if (ready && home && cv && cv.parentNode === home && want()) { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); } };
        document.addEventListener('scroll', e => { if (e.target && e.target.closest && e.target.closest('#gyPmHome')) fast(); }, true);
        window.addEventListener('resize', refresh);
        try { new MutationObserver(refresh).observe(document.body, { attributes: true, attributeFilter: ['class'] }); } catch (e) {}
        return { sync: refresh, refresh, refreshSoon: () => setTimeout(refresh, 80), state: () => ({ ok, ready, n: MAXN }) };
    })();
    window.__gyIosGlass = glass;

    /* ================= 样式 ================= */
    const CSS = `
/* ---------- 桌面：液态玻璃图标 / 小组件 / Dock ---------- */
#gyPmHome .gy-lg{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;border-radius:inherit}
body.gy-ios.gyphm-edit #gyPmHome .gy-lg{display:none}
body.gy-ios #gyPmHome .pm-ic{border-radius:22.5%}
body.gy-ios-glass #gyPmHome .pm-ic:not(.img):not([style*=background]){background:rgba(255,255,255,.34)!important;backdrop-filter:blur(16px) saturate(170%);-webkit-backdrop-filter:blur(16px) saturate(170%);box-shadow:inset 0 0 0 .6px rgba(255,255,255,.7),inset 1px 1.5px 0 rgba(255,255,255,.55),0 4px 14px rgba(0,0,0,.06)!important;color:#1d1d1f}
body.gy-ios-glass.pm-dark #gyPmHome .pm-ic:not(.img):not([style*=background]){background:rgba(40,40,44,.42)!important;box-shadow:inset 0 0 0 .6px rgba(255,255,255,.18),inset 1px 1.5px 0 rgba(255,255,255,.14),0 4px 14px rgba(0,0,0,.25)!important;color:#fff}
body.gy-ios-glass #gyPmHome.has-wall .pm-ic:not(.img):not([style*=background]){color:#fff;filter:drop-shadow(0 1px 1px rgba(0,0,0,.12))}
body.gy-ios-glass #gyPmHome.dark-wall .pm-ic:not(.img):not([style*=background]){color:#fff}
body.gy-ios-glass #gyPmHome .pm-w.gy-lgw{background:rgba(255,255,255,.34)!important;backdrop-filter:blur(18px) saturate(170%);-webkit-backdrop-filter:blur(18px) saturate(170%);box-shadow:inset 0 0 0 .6px rgba(255,255,255,.7),inset 1px 1.5px 0 rgba(255,255,255,.5),0 6px 18px rgba(0,0,0,.06)!important;border-radius:24px}
body.gy-ios-glass.pm-dark #gyPmHome .pm-w.gy-lgw{background:rgba(40,40,44,.42)!important;box-shadow:inset 0 0 0 .6px rgba(255,255,255,.16),0 6px 18px rgba(0,0,0,.3)!important}
body.gy-ios-glass #gyPmHome.has-wall .pm-w.gy-lgw,body.gy-ios-glass #gyPmHome.dark-wall .pm-w.gy-lgw,body.gy-ios-glass.pm-dark #gyPmHome .pm-w.gy-lgw{--pm-card:transparent;--pm-text:#fff;--pm-sub:rgba(255,255,255,.72);--pm-fill:rgba(255,255,255,.18);--pm-accent:#fff;--pm-accent-fg:#111;color:#fff}
body.gy-ios-glass #gyPmHome .pm-w.gy-lgw{--pm-card:transparent;--pm-fill:rgba(255,255,255,.45)}
body.gy-ios-glass #gyPmHome>.pm-dock{background:rgba(255,255,255,.3);backdrop-filter:blur(20px) saturate(170%);-webkit-backdrop-filter:blur(20px) saturate(170%);box-shadow:inset 0 0 0 .6px rgba(255,255,255,.6),inset 1px 1.5px 0 rgba(255,255,255,.45);border-radius:36px}
body.gy-ios-glass.pm-dark #gyPmHome>.pm-dock{background:rgba(40,40,44,.38);box-shadow:inset 0 0 0 .6px rgba(255,255,255,.14)}
/* WebGL 画好了 → CSS 那层玻璃让开（不然叠两层） */
body.gy-ios-glass:not(.gyphm-edit) #gyPmHome.gy-lg-on .pm-ic:not(.img):not([style*=background]),
body.gy-ios-glass:not(.gyphm-edit) #gyPmHome.gy-lg-on .pm-w.gy-lgw,
body.gy-ios-glass:not(.gyphm-edit) #gyPmHome.gy-lg-on>.pm-dock{background:transparent!important;backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none!important}
body.gy-ios #gyPmHome .pm-dock .pm-ic{box-shadow:none}
body.gy-ios #gyPmHome .pm-lb{font-size:11.5px;font-weight:500;letter-spacing:-.1px}
/* 状态栏 */
body.gy-ios-nosb #gyPmHome>.pm-sb>*:not(.pm-ncgrab),body.gy-ios-nosb #gyPmSb2>*:not(.pm-ncgrab){visibility:hidden}
body.gy-ios-nosb #gyPmHome>.pm-sb{height:28px}
body.gy-ios-sbon.gyphm-mob .pm-sb>*:not(.pm-ncgrab){display:revert!important}
body.gy-ios-sbon.gyphm-mob .pm-sb .r{display:flex!important}

/* ---------- 软件：玻璃返回键、浮动胶囊底栏 ---------- */
body.gy-ios{--ios-glass:rgba(255,255,255,.72);--ios-line:rgba(255,255,255,.85);--ios-fg:#000;--ios-fill:rgba(120,120,128,.14);--ios-sh:0 6px 24px rgba(0,0,0,.10)}
body.gy-ios.dark-theme{--ios-glass:rgba(40,40,44,.66);--ios-line:rgba(255,255,255,.14);--ios-fg:#fff;--ios-fill:rgba(118,118,128,.28);--ios-sh:0 6px 24px rgba(0,0,0,.45)}
body.gy-ios .gys-root .gys-hd{border-bottom:0}
body.gy-ios .gys-root .gys-bk{width:36px;height:36px;border-radius:18px;justify-content:center;padding:0;color:var(--ios-fg);background:var(--ios-glass);backdrop-filter:blur(14px) saturate(180%);-webkit-backdrop-filter:blur(14px) saturate(180%);box-shadow:inset 0 0 0 .5px var(--ios-line),0 2px 10px rgba(0,0,0,.07);flex-shrink:0}
body.gy-ios .gys-root .gys-bk .gys-ic{width:19px;height:19px;margin-left:-2px}
body.gy-ios .gys-root .gys-hr:not(:empty){min-height:36px;padding:0 11px;border-radius:18px;background:var(--ios-glass);backdrop-filter:blur(14px) saturate(180%);-webkit-backdrop-filter:blur(14px) saturate(180%);box-shadow:inset 0 0 0 .5px var(--ios-line),0 2px 10px rgba(0,0,0,.07);gap:14px}
body.gy-ios .gys-root .gys-tabs{position:absolute;left:14px;right:14px;bottom:calc(10px + env(safe-area-inset-bottom,0px));height:60px;border-radius:30px;border:0!important;padding:4px!important;align-items:center;box-sizing:border-box;z-index:8;
  background:var(--ios-glass)!important;backdrop-filter:blur(20px) saturate(190%);-webkit-backdrop-filter:blur(20px) saturate(190%);box-shadow:inset 0 0 0 .5px var(--ios-line),inset 0 1px 0 rgba(255,255,255,.35),var(--ios-sh);transition:width .25s,left .25s}
body.gy-ios .gys-root .gys-tb{height:52px;border-radius:26px;padding:0!important;justify-content:center;font-size:10px;gap:1px;min-width:0}
body.gy-ios .gys-root .gys-tb i{height:26px}
body.gy-ios .gys-root .gys-tb.on{background:var(--ios-fill)}
body.gy-ios .gys-root:has(>.gys-tabs)>.gys-body{padding-bottom:86px}
/* 收起：只剩当前那个，点一下展开 */
body.gy-ios-tabmini .gys-root .gys-tabs:not(.gy-open){right:auto;width:60px}
body.gy-ios-tabmini .gys-root .gys-tabs:not(.gy-open) .gys-tb:not(.on){display:none}
body.gy-ios-tabmini .gys-root .gys-tabs:not(.gy-open) .gys-tb.on{background:none}
body.gy-ios-tabmini .gys-root .gys-tabs:not(.gy-open) .gys-tb em{display:none}
body.gy-ios-tabmini .gys-root:has(>.gys-tabs)>.gys-body{padding-bottom:40px}
/* 状态栏（软件里） */
body.gy-ios .gys-sb{background:inherit}
/* 弹窗 / 底部选择：更圆 */
body.gy-ios .gys-alert-in{border-radius:22px}
body.gy-ios .gys-sheet-g{border-radius:22px}

/* ---------- 推特（小手机）底栏 ---------- */
body.gy-ios #gyPmX{left:calc(var(--pm-sl) + 14px);width:calc(var(--pm-sw) - 28px);top:calc(var(--pm-st) + var(--pm-sh) - 74px);height:60px;border-radius:30px!important;border:0!important;padding:0 6px!important;align-items:center!important;
  background:var(--ios-glass)!important;backdrop-filter:blur(20px) saturate(190%);-webkit-backdrop-filter:blur(20px) saturate(190%);box-shadow:inset 0 0 0 .5px var(--ios-line),var(--ios-sh)}
body.gy-ios #gyPmX span{height:48px;display:flex;align-items:center;justify-content:center;border-radius:24px;flex:1;padding:0}
body.gy-ios #gyPmX span.on{background:var(--ios-fill)}
body.gy-ios-tabmini #gyPmX:not(.gy-open){width:60px}
body.gy-ios-tabmini #gyPmX:not(.gy-open) span:not(.on){display:none}

/* ---------- iMessage：浅蓝 / 灰 ---------- */
body.gy-ios .im-b.me:not(.sms):not(.sched){background:#cfe5fd;color:#0b2540}
body.gy-ios.dark-theme .im-b.me:not(.sms):not(.sched){background:#1f4f80;color:#eaf3ff}
body.gy-ios .im-b.me.ink.open{color:#0b2540}
body.gy-ios.dark-theme .im-b.me.ink.open{color:#eaf3ff}
body.gy-ios .im-b{border-radius:19px}
body.gy-ios .im-in .im-plus{background:var(--ios-glass);box-shadow:inset 0 0 0 .5px var(--ios-line),0 2px 10px rgba(0,0,0,.06)}

/* ---------- 豆瓣条目页：模糊海报底、金色评分卡 ---------- */
body.gy-ios .db-ith{background:linear-gradient(180deg,rgba(246,169,54,.12),transparent)}
body.gy-ios .db-score{margin:12px 16px;border-radius:18px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.07);background:rgba(255,255,255,.6)}
body.gy-ios.dark-theme .db-score{box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);background:rgba(255,255,255,.05)}
body.gy-ios .db-dist i{border-radius:3px;overflow:hidden}
body.gy-ios .db-dist u{background:#f6a936!important;border-radius:3px}
body.gy-ios .db-mbtn{border-radius:12px!important}
body.gy-ios .gys-root.gy-dbon{background:#f6f5f2}
body.gy-ios.dark-theme .gys-root.gy-dbon{background:#121014}
body.gy-ios .gys-root.gy-dbon>.gy-dbbg{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none}
body.gy-ios .gys-root.gy-dbon>.gy-dbbg>i{position:absolute;inset:-60px;background-size:cover!important;background-position:center!important;filter:blur(42px) saturate(150%);transform:scale(1.15)}
body.gy-ios .gys-root.gy-dbon>.gy-dbbg>i>*{display:none}
body.gy-ios .gys-root.gy-dbon>.gy-dbbg::after{content:"";position:absolute;inset:0;background:rgba(250,248,252,.7)}
body.gy-ios.dark-theme .gys-root.gy-dbon>.gy-dbbg::after{background:rgba(14,12,20,.6)}
body.gy-ios .gys-root.gy-dbon>.gys-hd,body.gy-ios .gys-root.gy-dbon>.gys-body,body.gy-ios .gys-root.gy-dbon>.gys-sb{position:relative;z-index:1;background:transparent!important}
body.gy-ios .gy-dbon .db-itb,body.gy-ios .gy-dbon .db-ith{background:transparent!important}
body.gy-ios .gy-dbon .db-ith h3{font-size:24px;font-weight:600;letter-spacing:-.4px}
body.gy-ios .gy-dbon .db-cv.big{border-radius:12px;box-shadow:0 10px 26px rgba(0,0,0,.28)}
body.gy-ios .gy-dbon .db-score{background:rgba(255,255,255,.55);box-shadow:inset 0 0 0 1px rgba(0,0,0,.06);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
body.gy-ios.dark-theme .gy-dbon .db-score{background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
body.gy-ios .gy-dbon .db-mbtn{background:rgba(255,255,255,.72);border:0!important;color:#34313b!important;font-weight:600;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.06)}
body.gy-ios.dark-theme .gy-dbon .db-mbtn{background:rgba(255,255,255,.1);color:#f7f5ff!important}
body.gy-ios .gy-dbon .db-mymk{background:rgba(255,255,255,.6)!important}
body.gy-ios.dark-theme .gy-dbon .db-mymk{background:rgba(255,255,255,.08)!important}
body.gy-ios .gy-dbon .db-itabs{background:rgba(250,248,252,.6)!important;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-color:rgba(0,0,0,.06)}
body.gy-ios.dark-theme .gy-dbon .db-itabs{background:rgba(20,18,26,.55)!important;border-color:rgba(255,255,255,.08)}
body.gy-ios .gy-dbon .db-short,body.gy-ios .gy-dbon .db-long{border-color:rgba(0,0,0,.06)}
body.gy-ios.dark-theme .gy-dbon .db-short,body.gy-ios.dark-theme .gy-dbon .db-long{border-color:rgba(255,255,255,.08)}
body.gy-ios .gy-dbon .db-intro{color:inherit;opacity:.85}
body.gy-ios .gy-dbon .db-dist i{background:rgba(0,0,0,.08)!important}
body.gy-ios.dark-theme .gy-dbon .db-dist i{background:rgba(255,255,255,.12)!important}

/* ---------- 推特：深色（iOS 外观开着、深色时推特也跟着变黑底；浅色还是白底） ---------- */
body.gy-ios.dark-theme.gyphm{--xb:#000;--xf:#e7e9ea;--xs:#71767b;--xl:#2f3336;--xbub:#2f3336;--xbar:rgba(0,0,0,.85);--xhov:rgba(231,233,234,.04)}
body.gy-ios.dark-theme.gyphm.gyphm-xk{--xa:#e7e9ea;--xaf:#000}
body.gy-ios.dark-theme.gyphm-xp #view-profile .profile-avatar-large{background-color:#2f3336!important;color:#e7e9ea!important}
/* ---------- 推特个人主页：横幅模糊铺底 + 玻璃资料卡 ---------- */
body.gy-ios.gyphm-xp #view-profile.gy-xpon{position:relative}
body.gy-ios.gyphm-xp #view-profile.gy-xpon>.gy-xpbg{position:absolute;left:0;right:0;top:0;height:620px;overflow:hidden;pointer-events:none;z-index:0;-webkit-mask-image:linear-gradient(#000 55%,transparent);mask-image:linear-gradient(#000 55%,transparent)}
body.gy-ios.gyphm-xp #view-profile.gy-xpon>.gy-xpbg>i{position:absolute;inset:-50px;background-size:cover;background-position:center;filter:blur(36px) saturate(140%);transform:scale(1.1);background-image:linear-gradient(125deg,#c7ccd2,#e7e9eb 45%,#afb6bd)}
body.gy-ios.gyphm-xp #view-profile.gy-xpon>*:not(.gy-xpbg){position:relative;z-index:1}
body.gy-ios.gyphm-xp #view-profile.gy-xpon .profile-banner{border-radius:0 0 18px 18px}
body.gy-ios.gyphm-xp #view-profile.gy-xpon .profile-details{margin:-26px 12px 4px!important;border-radius:20px;padding:12px 16px 14px!important;
  background:color-mix(in srgb,var(--xb,#fff) 62%,transparent)!important;backdrop-filter:blur(22px) saturate(160%);-webkit-backdrop-filter:blur(22px) saturate(160%);
  box-shadow:inset 0 0 0 .5px rgba(255,255,255,.7),inset 0 1px 0 rgba(255,255,255,.5),0 10px 30px rgba(0,0,0,.08)}
body.gy-ios.dark-theme.gyphm-xp #view-profile.gy-xpon .profile-details{box-shadow:inset 0 0 0 .5px rgba(255,255,255,.14),0 10px 30px rgba(0,0,0,.35)}
body.gy-ios.gyphm-xp #view-profile.gy-xpon .top-tabs{background:transparent!important}
body.gy-ios.dark-theme.gyphm-xp #view-profile .profile-banner:not([style*=url]){background-color:#2f3336!important}
body.gy-ios.dark-theme.gyphm-xp #view-profile.gy-xpon>.gy-xpbg>i{background-image:linear-gradient(125deg,#2c2f33,#3a3d42 45%,#1c1e21)}
body.gy-ios.gyphm-xp #view-profile.gy-xpon .feed-section,body.gy-ios.gyphm-xp #view-profile.gy-xpon .feed-section>*{background-color:transparent!important}

/* ---------- 小组件：iOS 排版 ---------- */
body.gy-ios .pm-w{--gi-red:#ff3b30}
body.gy-ios #gyPmHome.has-wall .pm-w.gy-lgw,body.gy-ios.pm-dark .pm-w{--gi-red:#ff6961}
.gi-clk,.gi-cal,.gi-mu,.gi-we,.gi-todo,.gi-un{height:100%;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC",sans-serif;color:var(--pm-text)}
.gi-clk.s{display:flex;flex-direction:column;justify-content:space-between}
.gi-clk em,.gi-cal em{font-style:normal;font-size:12px;font-weight:600;color:var(--gi-red);letter-spacing:.3px}
.gi-clk.s b{font-size:46px;font-weight:300;letter-spacing:-1.5px;line-height:1}
.gi-clk span{font-size:13px;color:var(--pm-sub);font-weight:500}
.gi-clk.m{display:flex;align-items:flex-end;justify-content:space-between}
.gi-clk.m>div{display:flex;flex-direction:column;gap:2px}
.gi-clk.m b{font-size:64px;font-weight:200;letter-spacing:-2px;line-height:.9}
.gi-cal{display:flex}
.gi-cal.s{flex-direction:column}
.gi-cal>b,.gi-cal .l>b{font-size:40px;font-weight:300;line-height:1.02;letter-spacing:-1px}
.gi-cal .evs{margin-top:auto;display:flex;flex-direction:column;gap:5px;min-width:0}
.gi-cal .ev{border-left:3px solid var(--c);padding-left:6px;min-width:0;line-height:1.2}
.gi-cal .ev b{display:block;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gi-cal .ev span{font-size:11px;color:var(--pm-sub)}
.gi-cal .no{font-size:12px;color:var(--pm-sub)}
.gi-cal.m{gap:14px}
.gi-cal.m .l{flex:1;display:flex;flex-direction:column;min-width:0}
.gi-cal.m .r{width:52%;display:flex;flex-direction:column}
.gi-cal .mo{font-size:12px;font-weight:600;color:var(--gi-red);margin-bottom:4px}
.gi-cal .g{display:grid;grid-template-columns:repeat(7,1fr);gap:2px 0;text-align:center}
.gi-cal .g i{font-style:normal;font-size:10px;font-weight:600;height:15px;line-height:15px;border-radius:8px;position:relative}
.gi-cal .g i.h{color:var(--pm-sub);font-size:9px}
.gi-cal .g i.on{background:var(--gi-red);color:#fff}
.gi-cal .g i.has:not(.on)::after{content:"";position:absolute;left:50%;bottom:-1px;width:3px;height:3px;border-radius:2px;background:var(--pm-sub);transform:translateX(-50%)}
.gi-mu{display:flex;gap:14px;align-items:stretch}
.gi-mu .cv{width:42%;aspect-ratio:1;border-radius:14px;background:var(--pm-fill) center/cover;display:flex;align-items:center;justify-content:center;flex-shrink:0;align-self:center;box-shadow:0 4px 14px rgba(0,0,0,.12)}
.gi-mu .cv.empty svg{width:40%;height:40%;opacity:.5}
.gi-mu .r{flex:1;min-width:0;display:flex;flex-direction:column}
.gi-mu .src{font-size:11.5px;color:var(--pm-sub);font-weight:500}
.gi-mu .r>b{margin-top:auto;font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gi-mu .ar{font-size:13px;color:var(--pm-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gi-mu .bar{display:flex;align-items:center;gap:6px;margin:8px 0 6px}
.gi-mu .bar i{flex:1;height:3px;border-radius:2px;background:var(--pm-fill);overflow:hidden;display:block}
.gi-mu .bar u{display:block;height:100%;background:currentColor;border-radius:2px}
.gi-mu .bar span{font-size:10px;color:var(--pm-sub);font-variant-numeric:tabular-nums}
.gi-mu .ctl{display:flex;justify-content:space-between;align-items:center;padding:0 4px}
.gi-mu .ctl span{width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.gi-mu .ctl svg{width:20px;height:20px}.gi-mu .ctl .pp svg{width:26px;height:26px}
.gi-we{display:flex;flex-direction:column}
.gi-we .ct{font-size:14px;font-weight:600}.gi-we .ct i{font-style:normal;font-size:9px;opacity:.7}
.gi-we b{font-size:44px;font-weight:300;line-height:1.05;letter-spacing:-1px}
.gi-we .ic{font-size:20px;margin-top:auto;line-height:1}
.gi-we .ds{font-size:12.5px;font-weight:600}
.gi-we .rg{font-size:12px;color:var(--pm-sub)}
.gi-we.m{flex-direction:row;justify-content:space-between}
.gi-we.m .l{display:flex;flex-direction:column}.gi-we.m b{font-size:52px}
.gi-we.m .r{display:flex;flex-direction:column;align-items:flex-end;text-align:right;gap:2px}
.gi-we.m .r .ic{margin-top:0;font-size:26px}
.gi-todo{display:flex;flex-direction:column;gap:5px}
.gi-todo .h{display:flex;align-items:center;gap:8px}
.gi-todo .ico{width:26px;height:26px;border-radius:13px;background:#ff9500;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700}
.gi-todo .h b{font-size:26px;font-weight:600;margin-left:auto;line-height:1}
.gi-todo .h em{font-style:normal;font-size:18px;color:#ff9500;cursor:pointer;margin-left:6px}
.gi-todo .tt{font-size:13px;font-weight:700;color:#ff9500;margin:2px 0}
.gi-todo .ti{display:flex;align-items:center;gap:7px;font-size:13px;min-width:0;cursor:pointer}
.gi-todo .ti i{width:13px;height:13px;border-radius:7px;box-shadow:inset 0 0 0 1.4px var(--pm-sub);flex-shrink:0}
.gi-todo .ti.done i{background:#ff9500;box-shadow:inset 0 0 0 3px var(--pm-card,#fff),0 0 0 1.4px #ff9500}
.gi-todo .ti.done span{color:var(--pm-sub)}
.gi-todo .ti span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gi-todo .no{font-size:12.5px;color:var(--pm-sub)}
.gi-un{display:flex;flex-direction:column}
.gi-un .h{font-size:13px;font-weight:600;color:var(--gi-red)}
.gi-un b{font-size:52px;font-weight:300;line-height:1.05;margin-top:auto}
.gi-un span:last-child{font-size:12px;color:var(--pm-sub)}
/* 原来那些小组件在 iOS 外观里也换成 SF 字体、iOS 字重 */
body.gy-ios #gyPmHome .pm-w{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",sans-serif}
`;
    function css() { if (document.getElementById('gyIosCss')) return; const s = document.createElement('style'); s.id = 'gyIosCss'; s.textContent = CSS; document.head.appendChild(s); }

    function boot() { css(); wrap(); apply(); xpWatch(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    // 小手机 / 软件 是后加载的：等它们出来再包一层
    let tries = 0; const iv = setInterval(() => { wrap(); hookSoft(); if ((window.gyPmBeauty && window.gyPmBeauty.__ios && window.GYS && GYS.__iosHook) || ++tries > 60) clearInterval(iv); }, 1000);
})();
