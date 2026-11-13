// =====================================================================
//  📦 下载安装包（308）—— 谷雨里面就能拿到安卓安装包、电脑版
//  · 设置首页第三个（使用指南、客服下面）就是 📦 下载安装包；小功能「调整谷雨」那一类、搜「下载」「安装包」也能找到
//  · 点开是一张卡：安卓 / 电脑 / 网页版，各写着最新的版本号、日期、大小（从 guyu.pw/dl/info 拿）
//  · 正在用的那种设备排第一；安卓 App 里会对比一下自己装的版本，有新的就写「有新版」
//  · 下载走 guyu.pw/dl/android、guyu.pw/dl/pc（GitHub 打完包自己就是新的，国内也能下）
//  · App 里用系统浏览器打开（plus.runtime.openURL），电脑版里用默认浏览器打开（main.js 已经把 http 链接交给浏览器）
// =====================================================================
(function () {
    'use strict';
    var SITE = 'https://guyu.pw', QQ = '1106222317';
    var isApp = function () { return !!window.plus || /Html5Plus/i.test(navigator.userAgent); };
    var isPC = function () { return /Electron/i.test(navigator.userAgent); };
    var isAndroidWeb = function () { return /Android/i.test(navigator.userAgent); };
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function size(n) { n = +n || 0; if (!n) return ''; return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB'; }
    function day(t) { if (!t) return ''; var d = new Date(t); if (isNaN(d)) return String(t).slice(0, 10); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
    function go(url) {
        try { if (window.plus && plus.runtime && plus.runtime.openURL) return plus.runtime.openURL(url); } catch (e) {}
        try { var w = window.open(url, '_blank'); if (w) return; } catch (e) {}
        location.href = url;
    }
    function myApk(cb) {
        try { if (window.plus && plus.runtime) { plus.runtime.getProperty(plus.runtime.appid, function (p) { cb(p && p.version); }); return; } } catch (e) {}
        cb(null);
    }
    function newer(a, b) {   // a 比 b 新？
        var x = String(a || '').split('.').map(Number), y = String(b || '').split('.').map(Number);
        for (var i = 0; i < Math.max(x.length, y.length); i++) { var p = x[i] || 0, q = y[i] || 0; if (p !== q) return p > q; }
        return false;
    }

    var CSS = '#gyDl{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font:14px/1.6 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}'
        + '#gyDl .bx{width:100%;max-width:380px;max-height:88vh;overflow:auto;background:#fff;color:#1c1c1e;border-radius:18px;padding:20px 18px 14px;box-shadow:0 10px 40px rgba(0,0,0,.18)}'
        + '#gyDl h2{margin:0 0 4px;font-size:19px}#gyDl .sub{color:#6b7280;font-size:13px;margin-bottom:12px}'
        + '#gyDl .it{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:#f4f6f3;margin-bottom:10px}'
        + '#gyDl .it .ic{font-size:30px;line-height:1;width:40px;text-align:center}#gyDl .it .tx{flex:1;min-width:0}#gyDl .it b{font-size:15px}'
        + '#gyDl .it .mt{color:#6b7280;font-size:12px}#gyDl .it .tag{display:inline-block;font-size:11px;padding:0 6px;border-radius:6px;background:#dcfce7;color:#166534;margin-left:6px;vertical-align:1px}'
        + '#gyDl .it .tag.nw{background:#fee2e2;color:#991b1b}'
        + '#gyDl .it button{border:0;border-radius:10px;background:#3a7d5c;color:#fff;padding:8px 12px;font:600 13px inherit;font-family:inherit;cursor:pointer;white-space:nowrap}'
        + '#gyDl .it button.gh{background:#e5e7eb;color:#1c1c1e}'
        + '#gyDl .ft{color:#6b7280;font-size:12px;margin:6px 2px 8px}#gyDl .ft span{color:#3a7d5c;cursor:pointer;text-decoration:underline}'
        + '#gyDl .cl{display:block;width:100%;border:0;background:transparent;color:#8e8e93;font:14px inherit;font-family:inherit;padding:8px;cursor:pointer}'
        + '@media (prefers-color-scheme:dark){#gyDl .bx{background:#1c1c1e;color:#f2f2f7}#gyDl .it{background:#2c2c2e}#gyDl .it button.gh{background:#3a3a3c;color:#f2f2f7}}';

    function open() {
        var old = document.getElementById('gyDl'); if (old) old.remove();
        if (!document.getElementById('gyDlCss')) { var st = document.createElement('style'); st.id = 'gyDlCss'; st.textContent = CSS; document.head.appendChild(st); }
        var now = isApp() ? 'android' : isPC() ? 'pc' : 'web';
        var rows = [
            { k: 'android', ic: '🤖', t: '安卓安装包', d: '手机上装，能在后台跑、能锁软件', url: SITE + '/dl/android' },
            { k: 'pc', ic: '💻', t: '电脑版（Windows）', d: '下载下来双击就能用，不用安装', url: SITE + '/dl/pc' },
            { k: 'web', ic: '🌐', t: '网页版', d: '浏览器打开 guyu.pw，什么都不用装', url: SITE + '/' }
        ];
        // 正在用的排第一；网页版在安卓手机浏览器上，把安卓排第一
        var first = now === 'web' && isAndroidWeb() ? 'android' : now;
        rows.sort(function (a, b) { return (b.k === first) - (a.k === first); });
        var el = document.createElement('div'); el.id = 'gyDl';
        el.innerHTML = '<div class="bx"><h2>📦 下载安装包</h2><div class="sub">谷雨完全免费。每次更新完，这里就是最新的。</div>'
            + rows.map(function (r) {
                return '<div class="it" data-k="' + r.k + '"><div class="ic">' + r.ic + '</div><div class="tx"><b>' + esc(r.t) + '</b>' + (r.k === now ? '<span class="tag">你在用的</span>' : '')
                    + '<div class="mt">' + esc(r.d) + '</div><div class="mt v"></div></div>'
                    + '<button data-u="' + esc(r.url) + '"' + (r.k === now ? ' class="gh"' : '') + '>' + (r.k === 'web' ? '打开' : '下载') + '</button></div>';
            }).join('')
            + '<div class="ft">下不动或者装不上，去 QQ 群 <b>' + QQ + '</b> 的群文件里拿。也可以把下载页 <span data-u="' + SITE + '/download">guyu.pw/download</span> 发给朋友。</div>'
            + '<button class="cl">关上</button></div>';
        document.body.appendChild(el);
        el.addEventListener('click', function (e) {
            var u = e.target.closest && e.target.closest('[data-u]');
            if (u) { go(u.getAttribute('data-u')); return; }
            if (e.target === el || (e.target.classList && e.target.classList.contains('cl'))) el.remove();
        });
        var setV = function (k, html) { var v = el.querySelector('.it[data-k="' + k + '"] .v'); if (v) v.innerHTML = html; };
        var webV = typeof GY_VERSION !== 'undefined' ? GY_VERSION : '';
        if (webV) setV('web', '现在是 ' + esc(webV) + ' 版');
        setV('android', '正在看最新版本…'); setV('pc', '正在看最新版本…');
        var done = false;
        var t = setTimeout(function () { if (!done) { setV('android', '没连上 guyu.pw，点下载试试'); setV('pc', '没连上 guyu.pw，点下载试试'); } }, 8000);
        fetch(SITE + '/dl/info', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
            done = true; clearTimeout(t);
            var a = j && j.android, p = j && j.pc;
            var line = function (o) { return o ? esc([o.v ? o.v + ' 版' : '', day(o.at), size(o.size)].filter(Boolean).join(' · ')) : '还没打好，过一会儿再来'; };
            setV('android', line(a)); setV('pc', line(p));
            if (now === 'android' && a && a.v) myApk(function (mine) {
                if (!mine) return;
                var nw = newer(a.v, mine);
                var it = el.querySelector('.it[data-k="android"]');
                var tag = it && it.querySelector('.tag');
                if (tag) { tag.textContent = nw ? '有新版' : '你在用的 · 已经最新'; if (nw) tag.classList.add('nw'); }
                setV('android', line(a) + '<br>你装的是 ' + esc(mine) + ' 版');
                var b = it && it.querySelector('button'); if (b && nw) b.classList.remove('gh');
            });
        }).catch(function () { done = true; clearTimeout(t); setV('android', '没连上 guyu.pw，点下载试试'); setV('pc', '没连上 guyu.pw，点下载试试'); });
    }
    window.gyDownloadOpen = open;

    function reg() {
        try {
            if (typeof registerMiniFeature !== 'function') return false;
            if (typeof GY_MINI_FEATURES !== 'undefined' && GY_MINI_FEATURES.some(function (f) { return f.id === 'gyDownload'; })) return true;
            registerMiniFeature({ id: 'gyDownload', icon: '📦', title: '下载安装包', desc: '安卓安装包、电脑版、网页版——每次更新完这里就是最新的', onOpen: open });
            return true;
        } catch (e) { return false; }
    }
    if (!reg()) document.addEventListener('DOMContentLoaded', reg);

    // ⚙️ 设置首页：放在「📘 使用指南」「🛟 客服」下面第三个，一进设置就看得见（308：她说小功能里太隐蔽）
    function entry() {
        try {
            var menu = document.querySelector('#setIndex .set-menu'); if (!menu) return;
            var e = document.getElementById('gyDlEntry');
            if (!e) {
                e = document.createElement('button'); e.type = 'button'; e.className = 'set-entry'; e.id = 'gyDlEntry'; e.dataset.core = '1';
                e.innerHTML = '<span class="set-entry-ico">📦</span><span class="set-entry-main"><span class="set-entry-title">下载安装包</span><span class="set-entry-desc">安卓安装包、电脑版——每次更新完这里就是最新的</span></span><span class="set-entry-arrow">›</span>';
                e.onclick = open;
            }
            var h = document.getElementById('gyHelpEntry') || document.getElementById('gyGuideEntry');
            var want = h ? h.nextElementSibling : menu.firstElementChild;
            if (want !== e) menu.insertBefore(e, want);
        } catch (er) {}
    }
    window.gyDownloadEntry = entry;
    entry(); document.addEventListener('DOMContentLoaded', entry);
    var n = 0, t = setInterval(function () { entry(); if (++n > 20) { clearInterval(t); setInterval(entry, 5000); } }, 1000);
})();
