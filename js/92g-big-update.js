// =====================================================================
//  📦 大更新也推到每个人手上（308）
//  平时的更新（网页内容）本来就是 js/92c 推的：App / 电脑版里点「现在更新」就换好了，不用重新下。
//  但有些东西网页更新换不到，以前只能自己去下新安装包：
//    · 安卓：谷雨守护（锁软件、后台常驻）、新权限 —— 要换 APK
//    · 电脑版：main.js（桌面上的 TA、MCP、热更新本身）—— 要换 exe
//  现在谷雨自己看 guyu.pw/dl/info：
//    · 安卓：GitHub 上的安装包 versionCode 比手机上装的大 → 弹「这次是大更新」→ 在谷雨里下好 → 叫出系统的安装界面，点「安装」就行（同一个签名，覆盖安装，角色和聊天记录都在）
//    · 电脑版：GitHub 上的 exe 版本比自己的新 → 下好新 exe → 谷雨关掉、自动换上、重新打开（main.js 的 gy-self）
//      老 exe 还没有 gy-self：只能用浏览器把新 exe 下下来，告诉她换掉旧的（只会遇到这一次）
//  跟着「⬆️ 自动检查更新」开关（gyHotUpd）；「下次再说」3 天内这一版不再问。
// =====================================================================
(function () {
    'use strict';
    var SITE = 'https://guyu.pw', LK = 'gyBigUpd';
    var isApp = function () { return !!(window.plus && plus.runtime && plus.downloader); };
    var isDesk = function () { return !!window.gyDesk; };
    var on = function () { try { return !window.GYX || !GYX.on || GYX.on('gyHotUpd'); } catch (e) { return true; } };
    function rd() { try { return JSON.parse(localStorage.getItem(LK) || '{}') || {}; } catch (e) { return {}; } }
    function wr(o) { try { localStorage.setItem(LK, JSON.stringify(o)); } catch (e) {} }
    var S = rd();
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function mb(n) { return (n / 1048576).toFixed(1); }
    function newer(a, b) {
        var x = String(a || '').split('.').map(Number), y = String(b || '').split('.').map(Number);
        for (var i = 0; i < Math.max(x.length, y.length); i++) { var p = x[i] || 0, q = y[i] || 0; if (p !== q) return p > q; }
        return false;
    }
    function getInfo() {
        var url = SITE + '/dl/info?t=' + Date.now();
        if (isApp() && plus.net && plus.net.XMLHttpRequest) return new Promise(function (res, rej) {
            var x = new plus.net.XMLHttpRequest(); x.timeout = 15000;
            x.onreadystatechange = function () { if (x.readyState !== 4) return; if (x.status === 200) { try { res(JSON.parse(x.responseText)); } catch (e) { rej(e); } } else rej(new Error('HTTP ' + x.status)); };
            x.open('GET', url); x.send();
        });
        return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    }
    // 手机上装的安装包是第几版（versionCode；热更新不会改它）
    function apkCode() {
        try {
            var act = plus.android.runtimeMainActivity();
            var pm = plus.android.invoke(act, 'getPackageManager');
            var pi = plus.android.invoke(pm, 'getPackageInfo', plus.android.invoke(act, 'getPackageName'), 0);
            var c = +plus.android.getAttribute(pi, 'versionCode');
            return c > 0 ? c : null;
        } catch (e) { return null; }
    }
    function deskVer() {
        try { if (window.gyDesk && typeof gyDesk.self === 'function') return gyDesk.self('ver').then(function (r) { return r; }); } catch (e) {}
        return Promise.resolve(null);   // 老 exe：没有 gy-self
    }
    function openUrl(u) {
        try { if (window.plus && plus.runtime && plus.runtime.openURL) return plus.runtime.openURL(u); } catch (e) {}
        try { window.open(u, '_blank'); } catch (e) { location.href = u; }
    }

    /* ---------------- 弹窗 ---------------- */
    var CSS = '#gyBig{position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font:14px/1.65 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}'
        + '#gyBig .bx{width:100%;max-width:360px;background:#fff;color:#1c1c1e;border-radius:18px;padding:20px 18px 12px;box-shadow:0 10px 40px rgba(0,0,0,.18)}'
        + '#gyBig h2{margin:0 0 6px;font-size:18px}#gyBig p{margin:0 0 8px;color:#3c3c43}#gyBig .s{color:#6b7280;font-size:13px;min-height:20px}'
        + '#gyBig .pg{height:6px;border-radius:3px;background:#e5e7eb;overflow:hidden;margin:6px 0 4px;display:none}#gyBig .pg i{display:block;height:100%;width:0;background:#3a7d5c;transition:width .3s}'
        + '#gyBig .ft{display:flex;gap:10px;margin-top:10px}#gyBig .ft span{flex:1;text-align:center;padding:11px;border-radius:12px;cursor:pointer;background:#f2f2f7}'
        + '#gyBig .ft .ok{background:#3a7d5c;color:#fff;font-weight:600}#gyBig .ft .dis{opacity:.45;pointer-events:none}'
        + '@media (prefers-color-scheme:dark){#gyBig .bx{background:#1c1c1e;color:#f2f2f7}#gyBig p{color:#d1d1d6}#gyBig .ft span{background:#2c2c2e}#gyBig .pg{background:#3a3a3c}}';
    function box(kind, info, go, goText) {
        if (document.getElementById('gyBig')) return;
        if (document.getElementById('gyUpd')) { setTimeout(function () { box(kind, info, go, goText); }, 20000); return; }   // 网页更新的窗口还开着：等它关了再问
        if (!document.getElementById('gyBigCss')) { var st = document.createElement('style'); st.id = 'gyBigCss'; st.textContent = CSS; document.head.appendChild(st); }
        var what = kind === 'android' ? '安卓安装包' : '电脑版';
        var el = document.createElement('div'); el.id = 'gyBig'; el.setAttribute('data-gy-nopage', '1');
        el.innerHTML = '<div class="bx"><h2>📦 这次是大更新</h2>'
            + '<p>谷雨出了新的' + what + (info.v ? ' ' + esc(info.v) + ' 版' : '') + '。有些新东西（' + (kind === 'android' ? '锁软件、后台常驻、新权限这类' : '桌面上的 TA、工具这类') + '）平时的更新换不到，要换一下' + (kind === 'android' ? '安装包' : ' exe') + '。</p>'
            + '<p><b>角色、聊天记录、设置都不会丢。</b>' + (kind === 'android' ? '下好以后手机会弹出安装界面，点「安装」就行。' : '下好以后谷雨会关掉、换好、自己重新打开。') + '</p>'
            + '<div class="pg"><i></i></div><div class="s"></div>'
            + '<div class="ft"><span class="no">下次再说</span><span class="ok">' + esc(goText || '现在更新') + '</span></div></div>';
        document.body.appendChild(el);
        el.querySelector('.no').onclick = function () { S['skip_' + kind] = String(info.v || info.code); S['skipAt_' + kind] = Date.now(); wr(S); el.remove(); };
        var ok = el.querySelector('.ok');
        ok.onclick = function () { ok.classList.add('dis'); go(ui(el)); };
    }
    function ui(el) {
        return {
            prog: function (p, t) { var g = el.querySelector('.pg'); g.style.display = 'block'; g.firstChild.style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; if (t) el.querySelector('.s').textContent = t; },
            say: function (t) { el.querySelector('.s').textContent = t; },
            again: function (t) { el.querySelector('.s').textContent = t; el.querySelector('.ok').classList.remove('dis'); el.querySelector('.ok').textContent = '再试一次'; },
            later: function (t) { var n = el.querySelector('.no'); n.textContent = t || '放到后台'; n.onclick = function () { el.remove(); }; },
            close: function () { el.remove(); }
        };
    }

    /* ---------------- 安卓：下 APK → 系统安装界面 ---------------- */
    function goAndroid(info, U) {
        var file = '_downloads/guyu-' + (info.code || 'new') + '.apk';
        var note = function (p, t) { try { window.gyNativeProgress && gyNativeProgress('bigupd', '谷雨大更新', t, p == null ? null : Math.round(p * 100), { ongoing: p != null && p < 1 }); } catch (e) {} };
        U.later('放到后台');
        var d = plus.downloader.createDownload(SITE + '/dl/android', { filename: file, timeout: 30, retry: 3 }, function (dl, st) {
            if (st !== 200) { note(null, '没下下来'); return U.again('没下下来（' + st + '），网好一点再试；也可以去 guyu.pw/download 下'); }
            note(1, '下好了，点一下安装'); U.prog(1, '下好了，正在打开安装界面…');
            plus.runtime.install(plus.io.convertLocalFileSystemURL(dl.filename), {}, function () {
                try { window.gyNativeCancel && gyNativeCancel('bigupd'); } catch (e) {}
                U.say('在弹出来的界面里点「安装」。装好以后打开谷雨就是新的。');
            }, function (e) {
                // 没有「安装未知应用」权限、或者手机拦了：交给浏览器下载页
                U.again('手机没让谷雨直接装（' + ((e && e.message) || '被拦了') + '）。去设置里允许谷雨「安装未知应用」再试，或者点下面去下载页。');
                var ok = document.querySelector('#gyBig .ok'); if (ok) { ok.textContent = '去下载页'; ok.onclick = function () { openUrl(SITE + '/download'); }; }
            });
        });
        var last = 0;
        d.addEventListener('statechanged', function (t) {
            if (t.state !== 3 || !t.totalSize) return;
            var p = t.downloadedSize / t.totalSize; U.prog(p, '下载中… ' + mb(t.downloadedSize) + ' / ' + mb(t.totalSize) + ' MB（可以切到别的软件）');
            if (Date.now() - last > 800) { last = Date.now(); note(p, '下载新安装包 ' + Math.round(p * 100) + '%'); }
        }, false);
        d.start(); U.prog(0, '开始下载…');
    }

    /* ---------------- 电脑版：下 exe → 关掉换上 → 重新打开 ---------------- */
    function goDesk(info, U, canSwap) {
        if (!canSwap) {   // 老 exe：只能浏览器下
            openUrl(SITE + '/dl/pc');
            U.say('浏览器已经开始下载新的电脑版了。下好以后关掉谷雨，用新的 exe 把旧的换掉（存档在 exe 旁边的文件夹里，不会丢）。以后的大更新就能自己换了。');
            U.later('知道了'); return;
        }
        U.later('先不了');
        try { gyDesk.onSelf(function (p) { if (p && p.total) U.prog(p.got / p.total, p.done ? '下好了，谷雨马上关掉、换好、自己重新打开…' : '下载中… ' + mb(p.got) + ' / ' + mb(p.total) + ' MB'); }); } catch (e) {}
        U.prog(0, '开始下载…');
        gyDesk.self('update', SITE + '/dl/pc').then(function () { U.say('换好以后会自己打开。要是几十秒后还没打开，双击原来那个 exe 就是新版。'); })
            .catch(function (e) { U.again('没换成：' + ((e && e.message) || e) + '。也可以去 guyu.pw/download 下了自己换。'); });
    }

    /* ---------------- 什么时候查 ---------------- */
    var busy = false, lastAt = 0;
    function check(force) {
        if (busy || (!force && !on())) return Promise.resolve(null);
        if (!isApp() && !isDesk()) return Promise.resolve(null);
        if (!force && Date.now() - lastAt < 10 * 60e3) return Promise.resolve(null);
        busy = true; lastAt = Date.now();
        return getInfo().then(function (j) {
            busy = false;
            var skipped = function (k, id) { return !force && S['skip_' + k] === String(id) && Date.now() - (+S['skipAt_' + k] || 0) < 3 * 86400e3; };
            if (isApp()) {
                var a = j && j.android, mine = apkCode();
                if (!a || !a.code || !mine || +a.code <= mine) return { kind: 'android', need: false, mine: mine, remote: a && a.code };
                if (skipped('android', a.v || a.code)) return { kind: 'android', need: true, skipped: true };
                box('android', a, function (U) { goAndroid(a, U); });
                return { kind: 'android', need: true };
            }
            var p = j && j.pc;
            return deskVer().then(function (me) {
                var myV = (me && me.v) || '1.0.0';   // 还没有 gy-self 的老 exe 都是 1.0.0
                if (!p || !p.v || !newer(p.v, myV)) return { kind: 'pc', need: false, mine: myV, remote: p && p.v };
                if (skipped('pc', p.v)) return { kind: 'pc', need: true, skipped: true };
                var can = !!(me && me.canSwap);
                box('pc', p, function (U) { goDesk(p, U, can); }, can ? '现在更新' : '去下载新版');
                return { kind: 'pc', need: true, canSwap: can };
            });
        }).catch(function () { busy = false; return null; });
    }
    window.gyBigUpdCheck = check;
    // 开机 25 秒后（等 92c 的网页更新先问完）、切回来、每 30 分钟
    setTimeout(function () { check(false); }, 25000);
    setInterval(function () { check(false); }, 30 * 60e3);
    try { document.addEventListener('resume', function () { setTimeout(function () { check(false); }, 3000); }, false); } catch (e) {}
    try { document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') setTimeout(function () { check(false); }, 3000); }); } catch (e) {}
})();
