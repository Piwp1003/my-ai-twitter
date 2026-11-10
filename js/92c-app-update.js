/* ⬆️ App / 电脑版里直接更新 + 📢 更新公告弹窗（292）
   · 新版本放在 guyu.pw/update/（Cloudflare Pages 每次部署时 tools/make_update.py 生成）：latest.json（版本号、公告、文件清单）、guyu.wgt（安卓资源包）。
   · 安卓 App（5+App）：下载 guyu.wgt → plus.runtime.install(force) → 重启。资源包换掉的是 App 自带的网页，角色和聊天记录不动。
   · 电脑版 exe：主进程按清单只下载变了的文件，放进存档目录的 hot-www，重启后优先读那里（main.js 的 gy-hot）。要先用一次新打包的 exe（有 gyDesk.hot 才行）。
   · 网页版：Service Worker 本来就会更新，这里只提示「有新版本，刷新一下」。
   · 开关（全部开关 / 插件开关里）：gyHotUpd 打开时检查更新（默认开）；gyUpdNote 更新后弹公告（默认开）。
   · 今天里有「有新版本」，小组件「谷雨版本」。 */
(function () {
    'use strict';
    var BASE = 'https://guyu.pw/';
    var VER = +(window.GY_VERSION || 0);
    var LK = 'gyUpd';
    var X = window.GYX;
    function rd() { try { return JSON.parse(localStorage.getItem(LK) || '{}') || {}; } catch (e) { return {}; } }
    function wr(o) { try { localStorage.setItem(LK, JSON.stringify(o)); } catch (e) {} }
    var S = rd();
    var LATEST = S.latest || null;   // 上次查到的（今天 / 小组件用）
    var isApp = function () { return !!(window.plus && plus.runtime && plus.downloader); };
    var isDesk = function () { return !!(window.gyDesk && typeof window.gyDesk.hot === 'function'); };
    var isWeb = function () { return !isApp() && !window.gyDesk && /^https?:/.test(location.protocol); };
    var on = function (k) { try { return !X || !X.on || X.on(k); } catch (e) { return true; } };
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function toast(t, d) { try { showToast('', '⬆️ ' + t, d || '', null, null, false); } catch (e) {} }
    // 297：自己点「检查更新」时，屏幕顶上挂一个小条「正在检查更新…」，查完自己收走（以前点了没反应，只能干等）
    var chkBusy = false;
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function chkShow() {
        chkHide();
        var b = document.createElement('div'); b.id = 'gyUpdChk'; b.setAttribute('data-gy-nopage', '1');
        b.style.cssText = 'position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:100001;display:flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:rgba(28,28,30,.92);color:#fff;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:86vw;';
        b.innerHTML = '<span style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;display:inline-block;animation:gyUpdSpin .8s linear infinite;flex:none;"></span><span id="gyUpdChkT"></span><style>@keyframes gyUpdSpin{to{transform:rotate(360deg)}}</style>';
        document.body.appendChild(b);
        document.getElementById('gyUpdChkT').textContent = pick(['正在检查更新…', '去看看有没有新版本…', '正在问服务器有没有新版…']);
        chkShow.t = setTimeout(function () { var t = document.getElementById('gyUpdChkT'); if (t) t.textContent = pick(['网有点慢，还在查…', '还在等服务器回话…']); }, 6000);
    }
    function chkHide() { try { clearTimeout(chkShow.t); } catch (e) {} var b = document.getElementById('gyUpdChk'); if (b) b.remove(); }

    /* ---------- 查最新版本 ---------- */
    function getJson(url) {
        if (isDesk()) return window.gyDesk.hot('latest', url);
        if (isApp() && plus.net && plus.net.XMLHttpRequest) return new Promise(function (res, rej) {   // App 里用原生请求，不受跨域限制
            var x = new plus.net.XMLHttpRequest(); x.timeout = 15000;
            x.onreadystatechange = function () { if (x.readyState !== 4) return; if (x.status === 200) { try { res(JSON.parse(x.responseText)); } catch (e) { rej(e); } } else rej(new Error('HTTP ' + x.status)); };
            x.open('GET', url); x.send();
        });
        return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    }
    function check(manual) {
        if (!manual && !on('gyHotUpd')) return Promise.resolve(null);
        if (manual) { if (chkBusy) return Promise.resolve(null); chkBusy = true; chkShow(); }
        var done = function () { if (manual) { chkBusy = false; chkHide(); } };
        return getJson(BASE + 'update/latest.json?fresh=' + Date.now()).then(function (L) {
            done();
            if (!L || !L.ver) throw new Error('没拿到版本信息');
            LATEST = { ver: L.ver, at: L.at, notes: L.notes || [] }; S.latest = LATEST; S.checked = Date.now(); wr(S);
            if (L.ver <= VER) { if (manual) toast('已经是最新的了', '现在是 v' + VER); return L; }
            if (!manual && S.skip === L.ver && Date.now() - (+S.skipAt || 0) < 12 * 3600e3) return L;   // 这一版点过「下次再说」：12 小时内不再自己问
            if (!manual && document.getElementById('gyUpd')) return L;   // 已经弹着了，别叠
            if (!manual && preCan()) { preGet(L, function () { if (!document.getElementById('gyUpd')) ask(L); }); return L; }   // 先悄悄下好再问，点了马上装
            ask(L);
            return L;
        }).catch(function (e) { done(); if (manual) toast('没查成', '连不上更新服务器（' + ((e && e.message) || 'guyu.pw 没回话') + '），过一会儿再点一次'); return null; });
    }

    /* ---------- 297：提前下好（安卓 App） ----------
       自动查到新版本时，连着 Wi-Fi 就先在后台把更新包下好，再弹窗问；这时点「现在更新」不用等下载，直接装、重启。
       开关 gyUpdPre（默认开；只在 Wi-Fi 下才提前下，不走流量）。下好的包记在 S.pre = { ver, file }。 */
    var preBusy = false;
    function onWifi() { try { return plus.networkinfo.getCurrentType() === plus.networkinfo.CONNECTION_WIFI; } catch (e) { return false; } }
    function preCan() { return isApp() && on('gyUpdPre') && onWifi(); }
    function preHas(L) { return !!(S.pre && S.pre.ver === L.ver && S.pre.file); }
    function cleanDir(cb) {   // 把以前下的更新包清掉（不清的话每更新一次就多占 5MB）
        try { plus.io.resolveLocalFileSystemURL('_doc/update/', function (d) { d.removeRecursively(function () { cb && cb(); }, function () { cb && cb(); }); }, function () { cb && cb(); }); } catch (e) { cb && cb(); }
    }
    // 通知栏那条进度（js/98b 的 gyNativeProgress；没有就安静跳过）
    var nLast = 0, nPct = -9;
    var mb = function (n) { return Math.round(n / 1048576 * 10) / 10; };
    var awayNow = function () { try { return typeof window.gyAway === 'function' ? window.gyAway() : document.visibilityState !== 'visible'; } catch (e) { return false; } };
    function nProg(L, a, t) {
        if (typeof window.gyNativeProgress !== 'function' || !on('gyUpdBar')) return;
        var p = t ? a / t * 100 : -1, now = Date.now();
        if (p >= 0 && p < 100 && now - nLast < 700 && Math.abs(p - nPct) < 4) return;   // 别刷太勤，系统会嫌烦
        nLast = now; nPct = p;
        window.gyNativeProgress('upd', '谷雨 v' + L.ver + ' 正在下载', t ? (mb(a) + ' / ' + mb(t) + ' MB') : '准备下载…', p, { ongoing: true });
    }
    function nDone(L) {   // 下好了：人不在就留一条「点一下装上」，人在就收掉
        if (typeof window.gyNativeProgress !== 'function') return;
        if (awayNow() && on('gyUpdBar')) window.gyNativeProgress('upd', '谷雨 v' + L.ver + ' 下好了', pick(['点一下回到谷雨，马上装好', '回到谷雨就能装上，几秒钟的事', '点这里装上新版本']), null, { ongoing: false, alert: true, jump: { fn: 'gyUpdResume' } });
        else nClear();
    }
    function nFail(L, why) { if (typeof window.gyNativeProgress === 'function' && on('gyUpdBar')) window.gyNativeProgress('upd', '谷雨 v' + L.ver + ' 没下完', String(why || '') + '，回到谷雨再点一次', null, { ongoing: false, jump: { fn: 'gyUpdResume' } }); }
    function nClear() { try { if (typeof window.gyNativeCancel === 'function') window.gyNativeCancel('upd'); } catch (e) {} }
    /* ---------- 299：差量更新（只下改过的那几个文件，试验中，开关 gyUpdDiff 默认关） ----------
       latest.json 里的 patches = { 旧网页版本: { u, size, basis } }。只有：开关开着 + 有「我这一版 → 最新版」的包 +
       这台 App 现在的资源版本号（manifest 的 version）正好等于包里的 basis，才用小包；别的情况一律下整包。
       小包装不上（格式不对 / 手机不认）会自动改下整包，并且这一版不再试小包（S.noDiff）。 */
    var CUR = '';
    function curVer(cb) {
        if (CUR) return cb(CUR);
        try { plus.runtime.getProperty(plus.runtime.appid, function (w) { CUR = String((w && w.version) || ''); cb(CUR); }); } catch (e) { cb(''); }
    }
    function diffOn() { try { return !!(X && X.on && X.FEATS && X.FEATS.some(function (f) { return f.id === 'gyUpdDiff'; }) && X.on('gyUpdDiff')); } catch (e) { return false; } }
    function patchOf(L) { var p = L && L.patches && L.patches[String(VER)]; return (p && p.u && p.basis && diffOn() && S.noDiff !== L.ver) ? p : null; }
    function pickSrc(L, cb) {
        var full = { url: BASE + (L.wgt || 'update/guyu.wgt') + '?v=' + L.ver, file: '_doc/update/guyu-' + L.ver + '.wgt', patch: false };
        var p = patchOf(L); if (!p) return cb(full);
        curVer(function (c) { cb(c && c === p.basis ? { url: BASE + p.u + '?v=' + L.ver, file: '_doc/update/guyu-' + VER + '-' + L.ver + '.wgtu', patch: true } : full); });
    }
    window.__gyUpdDiff = { on: diffOn, patchOf: patchOf, cur: function () { return CUR; } };
    try { document.addEventListener('plusready', function () { curVer(function () {}); }, false); if (window.plus) curVer(function () {}); } catch (e) {}

    var dlBusy = false, dlWait = [];
    function download(L, onProg, onOk, onFail) {
        if (dlBusy) { dlWait.push([onProg, onOk, onFail]); return; }   // 已经在下了（比如后台提前下的那次）：搭同一趟车
        dlBusy = true; dlWait = [[onProg, onOk, onFail]];
        var each = function (i, a, b) { var w = dlWait.slice(); for (var k = 0; k < w.length; k++) { try { if (w[k][i]) w[k][i](a, b); } catch (e) {} } };
        nLast = 0; nPct = -9; nProg(L, 0, 0);
        cleanDir(function () { pickSrc(L, function (src) {
            try {
                var dl = plus.downloader.createDownload(src.url, { filename: src.file, timeout: 30, retry: 3 }, function (d, st) {
                    dlBusy = false;
                    if (st !== 200) { nFail(L, '下载失败（' + st + '）'); return each(2, '下载失败（' + st + '）'); }
                    S.pre = { ver: L.ver, file: d.filename, patch: !!src.patch }; wr(S); nDone(L); each(1, d.filename);
                });
                dl.addEventListener('statechanged', function (d) { if (d.totalSize) { nProg(L, d.downloadedSize, d.totalSize); each(0, d.downloadedSize, d.totalSize); } });
                dl.start();
            } catch (e) { dlBusy = false; nFail(L, (e && e.message) || '下载没开始'); each(2, (e && e.message) || '下载没开始'); }
        }); });
    }
    function preGet(L, then) {
        if (preHas(L)) return then();
        if (preBusy) return; preBusy = true;
        download(L, null, function () { preBusy = false; then(); }, function () { preBusy = false; then(); });   // 没下成也照样问，点了再现下
    }
    window.__gyUpdPre = { can: preCan, has: preHas };

    /* ---------- 弹窗 ---------- */
    var CSS = '#gyUpd{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.38);display:flex;align-items:center;justify-content:center;padding:20px;font:15px/1.55 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}'
        + '#gyUpd .u-c{width:100%;max-width:380px;max-height:82vh;display:flex;flex-direction:column;background:#fff;color:#1c1c1e;border-radius:22px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25)}'
        + '#gyUpd .u-h{padding:22px 22px 8px}#gyUpd .u-h small{display:block;color:#8e8e93;font-size:12.5px;margin-bottom:4px}#gyUpd .u-h b{font-size:19px;line-height:1.35;display:block}'
        + '#gyUpd .u-b{padding:4px 22px 6px;overflow-y:auto;flex:1}#gyUpd .u-v{margin:12px 0 4px;font-size:12.5px;color:#8e8e93}#gyUpd .u-v b{color:#1c1c1e;font-size:14px;margin-right:6px}'
        + '#gyUpd ul{margin:0;padding-left:18px}#gyUpd li{margin:6px 0;font-size:14px;line-height:1.6}'
        + '#gyUpd .u-p{margin:10px 0 0;height:6px;border-radius:3px;background:#eee;overflow:hidden}#gyUpd .u-p i{display:block;height:100%;width:0;background:#34c759;transition:width .2s}#gyUpd .u-s{font-size:12.5px;color:#8e8e93;margin-top:6px;min-height:18px}'
        + '#gyUpd .u-f{display:flex;gap:10px;padding:14px 22px 20px}#gyUpd .u-f span{flex:1;text-align:center;padding:12px 0;border-radius:14px;background:#f2f2f7;cursor:pointer;font-weight:500}#gyUpd .u-f span.ok{background:#34c759;color:#fff}#gyUpd .u-f span.dis{opacity:.45;pointer-events:none}'
        + '@media (prefers-color-scheme:dark){#gyUpd .u-c{background:#1c1c1e;color:#f2f2f7}#gyUpd .u-v b{color:#f2f2f7}#gyUpd .u-f span{background:#2c2c2e}#gyUpd .u-p{background:#3a3a3c}}'
        + 'body.dark-theme #gyUpd .u-c{background:#1c1c1e;color:#f2f2f7}body.dark-theme #gyUpd .u-v b{color:#f2f2f7}body.dark-theme #gyUpd .u-f span{background:#2c2c2e}';
    function box(html) {
        if (!document.getElementById('gyUpdCss')) { var s = document.createElement('style'); s.id = 'gyUpdCss'; s.textContent = CSS; document.head.appendChild(s); }
        var b = document.getElementById('gyUpd'); if (!b) { b = document.createElement('div'); b.id = 'gyUpd'; b.setAttribute('data-gy-nopage', '1'); document.body.appendChild(b); }
        b.innerHTML = '<div class="u-c">' + html + '</div>';
        return b;
    }
    function close() { var b = document.getElementById('gyUpd'); if (b) b.remove(); }
    function notesHtml(L) {
        return (L || []).map(function (n) { return '<div class="u-v"><b>v' + esc(n.v) + '</b>' + esc(n.d || '') + (n.t ? ' · ' + esc(n.t) : '') + '</div><ul>' + (n.items || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>'; }).join('');
    }
    function ask(L) {
        var pz = isApp() ? patchOf(L) : null; if (pz && !(CUR && CUR === pz.basis)) pz = null;
        var how = (isApp() && preHas(L)) ? '更新包已经提前下好了，点「现在更新」马上装好、自动重启' : pz ? '只下改过的 ' + (pz.n || '几') + ' 个文件（约 ' + (pz.size > 1048576 ? Math.round(pz.size / 1048576 * 10) / 10 + ' MB' : Math.max(1, Math.round(pz.size / 1024)) + ' KB') + '），装好自动重启' : isApp() ? '下载更新包（约 ' + Math.max(1, Math.round((L.wgtSize || 5e6) / 1048576)) + ' MB），装好自动重启' : isDesk() ? '只下载变了的文件，下好重启一下' : isWeb() ? '刷新一下就是新版' : window.gyDesk ? '这个 exe 是旧的，还不能在里面更新：重新打包一次 exe（一键打包exe.bat）以后就可以了' : '这个版本还不能在里面更新，要去下新的安装包';
        box('<div class="u-h"><small>发现新版本 v' + esc(L.ver) + '（你现在是 v' + VER + '）</small><b>' + esc((L.notes && L.notes[0] && L.notes[0].t) || '谷雨有更新了') + '</b></div>'
            + '<div class="u-b">' + notesHtml((L.notes || []).filter(function (n) { return n.v > VER; })) + '<div class="u-s" id="gyUpdS">' + esc(how) + '</div><div class="u-p" id="gyUpdP" style="display:none"><i></i></div></div>'
            + '<div class="u-f"><span id="gyUpdLater">下次再说</span><span class="ok" id="gyUpdGo">' + (isWeb() ? '刷新' : (isApp() || isDesk()) ? '现在更新' : window.gyDesk ? '知道了' : '去下载') + '</span></div>');
        document.getElementById('gyUpdLater').onclick = function () { S.skip = L.ver; S.skipAt = Date.now(); wr(S); close(); };
        document.getElementById('gyUpdGo').onclick = function () { run(L); };
    }
    function prog(p, t) {
        var P = document.getElementById('gyUpdP'), s = document.getElementById('gyUpdS');
        if (P) { P.style.display = ''; P.firstChild.style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; }
        if (s && t) s.textContent = t;
    }
    function busy(b) { ['gyUpdGo', 'gyUpdLater'].forEach(function (id) { var e = document.getElementById(id); if (e) e.classList.toggle('dis', b); }); }
    function fail(e) { busy(false); var s = document.getElementById('gyUpdS'); if (s) s.textContent = '没更新成功：' + ((e && e.message) || e) + '（可以再点一次，或者去下安装包）'; }
    function run(L) {
        S.skip = 0; wr(S);
        if (isWeb()) {
            try { navigator.serviceWorker && navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.update(); }); }); } catch (e) {}
            setTimeout(function () { location.reload(); }, 600); return;
        }
        if (isApp()) return runApp(L);
        if (isDesk()) return runDesk(L);
        if (window.gyDesk) return close();
        try { (window.plus && plus.runtime) ? plus.runtime.openURL('https://github.com/Piwp1003/my-ai-twitter/releases/tag/apk') : window.open('https://github.com/Piwp1003/my-ai-twitter/releases/tag/apk', '_blank'); } catch (e) {}
    }
    // 299：装好以后重启。以前只用 plus.runtime.restart()——它是「先把自己关掉，再托系统过一会儿把谷雨叫起来」，
    //      OPPO / vivo / 小米这些手机会把「后台自己弹出来」拦掉，结果就是关掉以后再也不开。
    //      现在趁谷雨还在最前面，先让系统「重新打开谷雨」（这时候是允许的），再结束自己；系统会马上带着新版本把它开起来。
    //      这条路走不通（不是安卓 / 调用出错）才用老办法。
    function restartApp() {
        try {
            if (window.plus && plus.android && /android/i.test(navigator.userAgent)) {
                var act = plus.android.runtimeMainActivity();
                var pm = plus.android.invoke(act, 'getPackageManager');
                var it = plus.android.invoke(pm, 'getLaunchIntentForPackage', plus.android.invoke(act, 'getPackageName'));
                if (it) {
                    plus.android.invoke(it, 'addFlags', 0x10000000 | 0x00008000);   // NEW_TASK | CLEAR_TASK：整个重来，不留旧页面
                    plus.android.invoke(act, 'startActivity', it);
                    setTimeout(function () { try { plus.android.importClass('java.lang.System').exit(0); } catch (e) { try { plus.runtime.restart(); } catch (e2) {} } }, 250);
                    return;
                }
            }
        } catch (e) {}
        try { plus.runtime.restart(); } catch (e) {}
    }
    window.__gyUpdRestart = restartApp;

    var pendInst = null;   // 你点过「现在更新」、包也下好了，但当时人不在：回来就装
    function runApp(L) {
        busy(true);
        var inst = function (file, retry) {
            pendInst = null; nClear();
            if (!document.getElementById('gyUpd')) ask(L);
            busy(true); prog(1, '正在安装…');
            plus.runtime.install(file, { force: true }, function () {
                S.from = VER; S.lastWay = (S.pre && S.pre.patch) ? 'diff' : 'full'; S.pre = null; wr(S);
                prog(1, '装好了，马上重启…（要是关掉后没自己打开，点一下桌面上的谷雨就是新版）');
                setTimeout(restartApp, 900);
            }, function (e) {
                var wasPatch = !!(S.pre && S.pre.patch);
                if (wasPatch) { S.noDiff = L.ver; S.diffErr = String((e && e.message) || e || ''); S.pre = null; wr(S); prog(0, '小包没装上，改下完整的包…'); return fresh(); }   // 差量包这台手机不认：这一版改下整包
                if (retry) { S.pre = null; wr(S); return fresh(); }   // 提前下的包坏了 / 被清了：现下一份
                fail('安装失败：' + ((e && e.message) || ''));
            });
        };
        var fresh = function () {
            prog(0, '下载中…（可以切到别的软件，通知栏里能看到进度）');
            // 下载的时候「下次再说」变成「放到后台」：关掉这个窗口接着下，下好了再叫你
            var lt = document.getElementById('gyUpdLater');
            if (lt) { lt.classList.remove('dis'); lt.textContent = '放到后台'; lt.onclick = function () { close(); toast('在后台接着下', pick(['通知栏里能看到进度，下好了叫你', '你忙你的，下好了再问你装不装'])); }; }
            download(L, function (a, t) { prog(a / t, '下载中… ' + mb(a) + ' / ' + mb(t) + ' MB'); }, function (file) {
                if (awayNow()) { pendInst = { L: L, file: file }; return; }           // 人不在：不突然重启，等回来
                if (!document.getElementById('gyUpd')) { ask(L); return; }            // 你把窗口放到后台了：下好了问一声
                inst(file, false);
            }, fail);
        };
        if (preHas(L)) inst(S.pre.file, true); else fresh();
    }
    // 从通知点回来 / 切回谷雨：有等着装的就装，没有就看看要不要问
    function resumeUpd() {
        nClear();
        if (pendInst) { var p = pendInst; pendInst = null; if (!document.getElementById('gyUpd')) ask(p.L); return runApp(p.L); }
        if (LATEST && LATEST.ver > VER && !document.getElementById('gyUpd')) { S.checked = 0; check(false); }
    }
    window.gyUpdResume = resumeUpd;
    try { document.addEventListener('resume', function () { if (pendInst) setTimeout(resumeUpd, 400); }, false); } catch (e) {}
    try { document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && pendInst) setTimeout(resumeUpd, 400); }); } catch (e) {}
    function runDesk(L) {
        busy(true); prog(0, '对比文件…');
        var t = setInterval(function () { window.gyDesk.hot('progress').then(function (p) { if (p && p.total) prog(p.done / p.total, '下载中… ' + p.done + ' / ' + p.total + ' 个文件'); }).catch(function () {}); }, 400);
        window.gyDesk.hot('apply', { base: BASE, ver: L.ver }).then(function (r) {
            clearInterval(t);
            if (!r || !r.ok) return fail((r && r.err) || '没下完');
            S.from = VER; wr(S);
            prog(1, (r.n ? '下好了 ' + r.n + ' 个文件' : '文件都是新的') + '，马上重启…');
            setTimeout(function () { window.gyDesk.hot('restart'); }, 800);
        }).catch(function (e) { clearInterval(t); fail(e); });
    }

    /* ---------- 📢 更新公告 ---------- */
    function showNotes(all) {
        var N = (window.GY_NOTES || []).slice().sort(function (a, b) { return b.v - a.v; });
        var seen = +S.seen || 0;
        var L = all ? N.slice(0, 8) : N.filter(function (n) { return n.v > seen && n.v <= VER; }).slice(0, 3);
        if (!L.length) { if (all) toast('还没有公告', ''); return false; }
        box('<div class="u-h"><small>📢 更新公告 · 现在是 v' + VER + '</small><b>' + esc(L[0].t || '这次更新了什么') + '</b></div><div class="u-b">' + notesHtml(L) + '</div><div class="u-f"><span class="ok" id="gyUpdOk">知道了</span></div>');
        document.getElementById('gyUpdOk').onclick = close;
        S.seen = VER; wr(S);
        return true;
    }
    window.gyCheckUpdate = function () { return check(true); };
    window.gyShowNotes = function () { return showNotes(true); };
    window.gyUpdState = function () { return { ver: VER, latest: LATEST, seen: S.seen, app: isApp(), desk: isDesk(), web: isWeb() }; };

    /* ---------- 开关、今天、小组件 ---------- */
    try {
        if (X && X.feat) {
            X.feat('gyUpdDiff', { n: '🧪 更新只下改过的文件（试验，安卓 App）', def: false, desc: '打开后，App 内更新只下载这一版改过的那几个文件（一般几百 KB），比下整包快很多。还在试验：小包装不上会自动改下整包。默认关' });
            X.feat('gyUpdBar', { n: '📊 下载更新时通知栏显示进度条（安卓 App）', desc: '下载更新包的时候，通知栏里有一条带进度条的通知，切到别的软件也看得到下到哪了；下好了提醒你回来装。关掉就只在谷雨里的更新窗口显示进度' });
            X.feat('gyUpdPre', { n: '⬇️ 有新版本先悄悄下好（安卓 App，只在 Wi-Fi 下）', desc: '自动查到新版本时，连着 Wi-Fi 就先在后台把更新包下好再问你，点「现在更新」不用等下载。不连 Wi-Fi 不会提前下，不走流量。关掉就是点了才开始下' });
            X.feat('gyHotUpd', { n: '⬆️ 自动检查更新', desc: '打开谷雨时、切回谷雨时、开着每半小时自己查一次，有新版本会问你要不要更新；App 和电脑版点「现在更新」就在里面更新完重启，不用重新装安装包' });
            X.feat('gyUpdNote', { n: '📢 更新公告弹窗', desc: '每次更新后第一次打开，弹一下这次更新了什么（设置最下面「更新公告」随时能看）' });
        }
        if (X && X.today) X.today(function () { if (!LATEST || LATEST.ver <= VER) return null; return { title: '⬆️ 谷雨有新版本', rows: [{ t: 'v' + LATEST.ver, x: ((LATEST.notes && LATEST.notes[0] && LATEST.notes[0].t) || '') + ' · 去更新', go: 'gyCheckUpdate()' }] }; }, 'gyHotUpd');
        if (X && X.widget) X.widget('gyUpdW', { n: '谷雨版本', sizes: ['s'], tap: function () { check(true); }, r: function (w) { var nw = LATEST && LATEST.ver > VER; return X.gw ? X.gw(w, '⬆️', '谷雨版本', ['v' + VER, nw ? '新版 v' + LATEST.ver + ' · 点一下更新' : '已经是最新']) : '<div style="padding:10px;font-size:12px">谷雨 v' + VER + '</div>'; } }, 'gyHotUpd');
    } catch (e) {}

    /* ---------- 设置最下面版本号旁边：检查更新 / 更新公告 ---------- */
    function addBtns() {
        var el = document.getElementById('setVersionLine'); if (!el || el.querySelector('.gy-updbtn')) return;
        el.insertAdjacentHTML('beforeend', ' <a class="gy-updbtn" style="margin-left:8px;color:#34a853;cursor:pointer" onclick="gyCheckUpdate()">检查更新</a> <a class="gy-updbtn" style="margin-left:6px;color:#1d9bf0;cursor:pointer" onclick="gyShowNotes()">更新公告</a>');
    }
    try { if (typeof window.renderSettingsVersion === 'function' || typeof renderSettingsVersion === 'function') { var o = renderSettingsVersion; window.renderSettingsVersion = renderSettingsVersion = function () { var r = o.apply(this, arguments); addBtns(); return r; }; } } catch (e) {}
    setInterval(addBtns, 3000);

    /* ---------- 297：开着的时候也自己查（以前只在刚打开那一下查，谷雨一直挂在后台不重开就永远查不到） ----------
       切回谷雨时查一次、开着每 30 分钟查一次；两次之间至少隔 10 分钟。有新版本就弹那个「现在更新 / 下次再说」。 */
    function auto(force) {
        if (navigator.webdriver && !force) return;
        if (!force && Date.now() - (+S.checked || 0) < 10 * 60e3) return;
        return check(false);
    }
    window.__gyUpdAuto = auto;
    try { document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') setTimeout(auto, 1500); }); } catch (e) {}
    try { document.addEventListener('resume', function () { setTimeout(auto, 1500); }, false); } catch (e) {}
    setInterval(auto, 30 * 60e3);

    /* ---------- 开机 ---------- */
    var boot = function () {
        if (navigator.webdriver) return;   // 自动化测试不弹
        setTimeout(function () {
            var shown = false;
            if (on('gyUpdNote')) { if (S.seen == null) { S.seen = VER - 1; } if ((+S.seen || 0) < VER) shown = showNotes(false); } else { S.seen = VER; wr(S); }
            // 299：刚更新完，说一声这次是怎么装上的（试验差量更新时好知道成没成）
            try {
                if (S.lastWay && (+S.from || 0) < VER) {
                    if (S.lastWay === 'diff') toast('更新好了：这次只下了改过的文件', '小包装上了，现在是 v' + VER);
                    else if (S.diffErr) toast('更新好了：小包没装上，下的是完整的包', '手机说的是：' + S.diffErr + '（把这句告诉 Claude）');
                }
                if (S.lastWay) { S.lastWay = ''; if (S.diffErr) { S.diffErrLast = S.diffErr; S.diffErr = ''; } wr(S); }
            } catch (e) {}
            setTimeout(function () { check(false); }, shown ? 1500 : 0);
        }, 4000);
    };
    if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
})();
