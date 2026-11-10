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
    function toast(t, d) { try { showToast('', '⬆️', t, d || '', null, false); } catch (e) {} }

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
        return getJson(BASE + 'update/latest.json?fresh=' + Date.now()).then(function (L) {
            if (!L || !L.ver) throw new Error('没拿到版本信息');
            LATEST = { ver: L.ver, at: L.at, notes: L.notes || [] }; S.latest = LATEST; S.checked = Date.now(); wr(S);
            if (L.ver <= VER) { if (manual) toast('已经是最新的了', '现在是 v' + VER); return L; }
            if (!manual && S.skip === L.ver) return L;   // 这一版点过「下次再说」
            ask(L);
            return L;
        }).catch(function (e) { if (manual) toast('没查到新版本', (e && e.message) || '连不上 guyu.pw'); return null; });
    }

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
        var how = isApp() ? '下载更新包（约 ' + Math.max(1, Math.round((L.wgtSize || 5e6) / 1048576)) + ' MB），装好自动重启' : isDesk() ? '只下载变了的文件，下好重启一下' : isWeb() ? '刷新一下就是新版' : window.gyDesk ? '这个 exe 是旧的，还不能在里面更新：重新打包一次 exe（一键打包exe.bat）以后就可以了' : '这个版本还不能在里面更新，要去下新的安装包';
        box('<div class="u-h"><small>发现新版本 v' + esc(L.ver) + '（你现在是 v' + VER + '）</small><b>' + esc((L.notes && L.notes[0] && L.notes[0].t) || '谷雨有更新了') + '</b></div>'
            + '<div class="u-b">' + notesHtml((L.notes || []).filter(function (n) { return n.v > VER; })) + '<div class="u-s" id="gyUpdS">' + esc(how) + '</div><div class="u-p" id="gyUpdP" style="display:none"><i></i></div></div>'
            + '<div class="u-f"><span id="gyUpdLater">下次再说</span><span class="ok" id="gyUpdGo">' + (isWeb() ? '刷新' : (isApp() || isDesk()) ? '现在更新' : window.gyDesk ? '知道了' : '去下载') + '</span></div>');
        document.getElementById('gyUpdLater').onclick = function () { S.skip = L.ver; wr(S); close(); };
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
    function runApp(L) {
        busy(true); prog(0, '下载中…');
        var dl = plus.downloader.createDownload(BASE + (L.wgt || 'update/guyu.wgt') + '?v=' + L.ver, { filename: '_doc/update/', timeout: 30, retry: 2 }, function (d, st) {
            if (st !== 200) return fail('下载失败（' + st + '）');
            prog(1, '下载好了，正在安装…');
            plus.runtime.install(d.filename, { force: true }, function () {
                S.from = VER; wr(S);
                prog(1, '装好了，马上重启…');
                setTimeout(function () { plus.runtime.restart(); }, 800);
            }, function (e) { fail('安装失败：' + ((e && e.message) || '')); });
        });
        dl.addEventListener('statechanged', function (d) { if (d.totalSize) prog(d.downloadedSize / d.totalSize, '下载中… ' + Math.round(d.downloadedSize / 1048576 * 10) / 10 + ' / ' + Math.round(d.totalSize / 1048576 * 10) / 10 + ' MB'); });
        dl.start();
    }
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
            X.feat('gyHotUpd', { n: '⬆️ 打开谷雨时检查更新', desc: '有新版本会问你要不要更新；App 和电脑版点「现在更新」就在里面更新完重启，不用重新装安装包' });
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

    /* ---------- 开机 ---------- */
    var boot = function () {
        if (navigator.webdriver) return;   // 自动化测试不弹
        setTimeout(function () {
            var shown = false;
            if (on('gyUpdNote')) { if (S.seen == null) { S.seen = VER - 1; } if ((+S.seen || 0) < VER) shown = showNotes(false); } else { S.seen = VER; wr(S); }
            setTimeout(function () { check(false); }, shown ? 1500 : 0);
        }, 4000);
    };
    if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
})();
