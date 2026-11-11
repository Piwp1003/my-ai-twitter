/* =====================================================================
   js/00 —— 🫀 后台心跳（304）
   问题：安卓 App 切到后台 / 锁屏以后，系统会把网页里的定时器（setTimeout / setInterval）掐得很慢甚至停掉。
        谷雨里「TA 主动找你」「到点触发」「自主行动」「锁软件到点解开」……全靠定时器，所以以前只有把谷雨打开，它们才动。
   办法：安卓安装包 1.55 起，「谷雨守护」的后台常驻服务每隔几秒从原生那边戳一下网页：window.__gyBeat()。
        这里记着所有还没跑的定时器；被戳的时候看一眼——定时器要是还在自己走，就什么都不做；
        要是停了 / 慢了，就由这里替它们把「到点了的」跑掉。于是切到后台以后谷雨里的东西照常运转。
   · 只在安卓 App 里装（网页 / 电脑版完全不动）；localStorage.gyPumpOff = '1' 能整个关掉。
   · 同一个定时器不会跑两遍：这里替它跑过的 setTimeout 会把原来那个取消掉；setInterval 记着上次是什么时候跑的。
   · 必须排在所有脚本最前面（要赶在别人调 setTimeout 之前）。
   ===================================================================== */
(function () {
    if (window.__gyPump) return;
    var P = window.__gyPump = { on: false, beats: 0, ran: 0, last: 0, stalled: false, lag: 0 };
    var isApp = false, force = false;
    try { isApp = /Html5Plus/i.test(navigator.userAgent) || !!window.plus; } catch (e) {}
    try { force = localStorage.getItem('gyPumpForce') === '1'; if (localStorage.getItem('gyPumpOff') === '1') { isApp = false; force = false; } } catch (e) {}
    if (!isApp && !force) { window.__gyBeat = function () { P.beats++; P.last = Date.now(); }; return; }

    var _st = window.setTimeout, _si = window.setInterval, _ct = window.clearTimeout, _ci = window.clearInterval;
    var T = new Map(), I = new Map();   // 真定时器的 id → 记录
    var slice = Array.prototype.slice;
    window.setTimeout = function (fn, d) {
        if (typeof fn !== 'function') return _st.apply(window, arguments);
        var args = arguments.length > 2 ? slice.call(arguments, 2) : null;
        var rec = { fn: fn, args: args, due: Date.now() + (+d || 0), done: false, id: 0 };
        rec.id = _st.call(window, function () { if (rec.done) return; rec.done = true; T.delete(rec.id); fn.apply(window, args || []); }, d);
        T.set(rec.id, rec);
        return rec.id;
    };
    window.setInterval = function (fn, d) {
        if (typeof fn !== 'function') return _si.apply(window, arguments);
        var args = arguments.length > 2 ? slice.call(arguments, 2) : null;
        var rec = { fn: fn, args: args, per: Math.max(+d || 0, 4), last: Date.now(), id: 0 };
        rec.id = _si.call(window, function () { rec.last = Date.now(); fn.apply(window, args || []); }, d);
        I.set(rec.id, rec);
        return rec.id;
    };
    // 浏览器里两种定时器的 id 是通用的（clearTimeout 也能清 setInterval），所以两边都认
    function forget(id) { var r = T.get(id); if (r) { r.done = true; T.delete(id); } I.delete(id); }
    window.clearTimeout = function (id) { forget(id); return _ct.call(window, id); };
    window.clearInterval = function (id) { forget(id); return _ci.call(window, id); };
    P.on = true;

    // 金丝雀：一个每秒跳一次的真定时器。它好久没跳 = 定时器被系统停了 / 掐慢了
    var canary = Date.now();
    _si.call(window, function () { canary = Date.now(); }, 1000);

    function pump(now) {
        var due = [], n = 0;
        T.forEach(function (r) { if (!r.done && r.due <= now - 800) due.push(r); });
        due.sort(function (a, b) { return a.due - b.due; });
        for (var i = 0; i < due.length && i < 300; i++) {
            var r = due[i]; if (r.done) continue;
            r.done = true; T.delete(r.id); try { _ct.call(window, r.id); } catch (e) {}
            try { r.fn.apply(window, r.args || []); n++; } catch (e) { try { console.warn('[后台心跳] 定时任务出错：', e); } catch (e2) {} }
        }
        I.forEach(function (r) {
            if (now - r.last < r.per + Math.max(1500, r.per * 0.5)) return;
            r.last = now;
            try { r.fn.apply(window, r.args || []); n++; } catch (e) { try { console.warn('[后台心跳] 定时任务出错：', e); } catch (e2) {} }
        });
        return n;
    }
    // 原生每隔几秒调一次（谷雨守护 1.2.0 的 GuardKeep）；测试里也能手动调
    window.__gyBeat = function () {
        var now = Date.now();
        P.beats++; P.last = now; P.lag = now - canary;
        P.stalled = P.lag > 3500;
        if (!P.stalled) return 0;          // 定时器自己还在走：不插手
        var n = 0; try { n = pump(now); } catch (e) {}
        P.ran += n;
        return n;
    };
    P.info = function () { return { on: P.on, beats: P.beats, ran: P.ran, last: P.last, stalled: P.stalled, lag: P.lag, timeouts: T.size, intervals: I.size }; };
    P.__canary = function (t) { canary = t; };   // 测试用：假装定时器停了
})();
