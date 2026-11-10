// =====================================================================
//  📣 手机横幅弹窗 + 📌 后台常驻（296）
//  为什么要有这个：以前 App 里弹通知走的是 plus.push.createMessage，它用的通知渠道是「普通」级别，
//  大多数手机只在通知栏里安静地多一条、不会从屏幕顶上弹下来；而且谷雨开在最前面时故意不弹，
//  所以看起来就是「只有刚打开那一下会弹」。
//  · 横幅：用 Native.js 直接调安卓系统，自己建一个「重要」级别的通知渠道（会弹横幅、会响、锁屏上显示），
//    带 TA 的头像，点了回到谷雨、跳到对应的地方。不用重新装 App（跟着 App 内更新走）。
//  · 正在用谷雨时也弹：开关 gyNotifFg（App 里默认开，网页 / 电脑默认关）。
//  · 后台常驻：开关 gyKeepSvc（默认关，会多耗一点电）。通知栏挂一条「谷雨在后台陪着你」，
//    手机把谷雨当成正在干活的软件，不容易冻住；要「谷雨守护」1.1.0（App 1.52 起自带）。不放声音、不抢音乐。
//  · 各牌子手机怎么设：自动认牌子，把步骤和「一键跳到那一页」的按钮放在 设置 → 通知与云端。
//  纯工具，不是角色的功能，所以没有自主行动 / 今天 / 小组件 / 记忆总览。
// =====================================================================
(function () {
    const CH = 'gy_msg_v1';                       // 消息渠道（重要：会弹横幅）
    const ACT = 'com.guyu.NOTIFY';                // 点通知时带的动作名（跟点桌面图标区分开，系统才会把「跳到哪」交给我们）
    const FG = 'gyNotifFg', SVC = 'gyKeepSvc';
    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const toast = (t, d) => { try { if (typeof showToast === 'function') showToast('', t, d || '', null, null, false); } catch (e) {} };
    const uaApp = /Html5Plus/i.test(navigator.userAgent);
    const isApp = () => !!(window.plus && plus.android);
    const A = () => plus.android;
    const inv = (o, m, ...a) => plus.android.invoke(o, m, ...a);
    const imp = c => plus.android.importClass(c);
    let act = null, nm = null, sdk = 0, chanOk = false, lastErr = '';
    const ctx = () => { try { if (!act && isApp()) act = plus.android.runtimeMainActivity(); } catch (e) {} return act; };
    const sdkInt = () => { if (sdk) return sdk; try { sdk = imp('android.os.Build$VERSION').SDK_INT || 0; } catch (e) {} return sdk; };
    const mgr = () => { try { if (!nm && ctx()) nm = inv(ctx(), 'getSystemService', 'notification'); } catch (e) {} return nm; };
    const pkg = () => { try { return String(inv(ctx(), 'getPackageName') || ''); } catch (e) { return ''; } };
    const isOn = k => { try { return typeof isAutoOn === 'function' ? isAutoOn(k) : false; } catch (e) { return false; } };

    /* ---------------- 渠道 ---------------- */
    function ensureChannel() {
        if (chanOk) return true;
        const m = mgr(); if (!m) return false;
        try {
            if (sdkInt() >= 26) {
                const ch = A().newObject('android.app.NotificationChannel', CH, 'TA 的消息', 4);   // 4 = IMPORTANCE_HIGH：弹横幅 + 响
                try { inv(ch, 'setDescription', 'TA 发来消息、发了新帖时从屏幕顶上弹出来。想安静一点可以在这里把「横幅 / 声音」关掉。'); } catch (e) {}
                try { inv(ch, 'enableVibration', true); } catch (e) {}
                try { inv(ch, 'enableLights', true); } catch (e) {}
                try { inv(ch, 'setShowBadge', true); } catch (e) {}
                try { inv(ch, 'setLockscreenVisibility', 1); } catch (e) {}                       // 1 = 锁屏上显示内容
                inv(m, 'createNotificationChannel', ch);
            }
            chanOk = true;
        } catch (e) { lastErr = String(e && e.message || e); }
        return chanOk;
    }
    // 现在的状态：{ app, allowed 通知总开关, imp 渠道级别(4 才会弹横幅), sdk }
    function state() {
        const o = { app: isApp(), allowed: null, imp: null, sdk: 0, brand: brandKey(), fg: fgOn(), svc: isOn(SVC), svcHas: svcHas(), svcOn: svcRunning(), err: lastErr };
        if (!o.app) return o;
        o.sdk = sdkInt();
        try { const m = mgr(); if (m && o.sdk >= 24) o.allowed = !!inv(m, 'areNotificationsEnabled'); } catch (e) {}
        try { ensureChannel(); const m = mgr(); if (m && o.sdk >= 26) { const ch = inv(m, 'getNotificationChannel', CH); if (ch) o.imp = inv(ch, 'getImportance'); } } catch (e) {}
        return o;
    }
    function askPerm(cb) {
        try {
            if (!isApp() || sdkInt() < 33) return cb && cb(true);
            plus.android.requestPermissions(['android.permission.POST_NOTIFICATIONS'], r => cb && cb(!(r && r.deniedAlways && r.deniedAlways.length) && !(r && r.deniedPresent && r.deniedPresent.length)), () => cb && cb(false));
        } catch (e) { cb && cb(false); }
    }

    /* ---------------- 弹一条 ---------------- */
    const idOf = key => { let h = 7; const s = String(key || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return 1000 + (Math.abs(h) % 900000); };
    let seq = 0;
    function jumpOf(opt) {
        opt = opt || {};
        if (opt.jump) return opt.jump;
        const j = {};
        const n = opt.notif;
        if (n != null) j.nid = typeof n === 'object' ? n.id : n;
        const cid = opt.charId != null ? opt.charId : (n && typeof n === 'object' ? (n.chatCharId != null ? n.chatCharId : n.charId) : null);
        if (cid != null) j.chat = cid;
        if (j.nid == null && j.chat == null) j.view = 'notifications';
        return j;
    }
    // 返回 true = 已经交给系统弹了；false = 这台弹不了（外面接着用老办法）
    function nativeNotify(title, body, opt) {
        opt = opt || {};
        if (!isApp()) return false;
        try {
            const c = ctx(), m = mgr(); if (!c || !m) return false;
            if (!ensureChannel()) return false;
            const s = sdkInt();
            const b = s >= 26 ? A().newObject('android.app.Notification$Builder', c, CH) : A().newObject('android.app.Notification$Builder', c);
            let icon = 0;
            try { icon = plus.android.getAttribute(inv(c, 'getApplicationInfo'), 'icon') || 0; } catch (e) {}
            inv(b, 'setSmallIcon', icon || 17301659);
            inv(b, 'setContentTitle', String(title || '新消息'));
            inv(b, 'setContentText', String(body || ''));
            inv(b, 'setAutoCancel', true);
            try { inv(b, 'setTicker', String(title || '') + (body ? '：' + body : '')); } catch (e) {}
            try { inv(b, 'setShowWhen', true); } catch (e) {}
            if (s < 26) { try { inv(b, 'setPriority', 1); inv(b, 'setDefaults', -1); } catch (e) {} }   // 老系统：高优先级 + 默认声音震动 才会弹
            if (s >= 21) { try { inv(b, 'setVisibility', 1); } catch (e) {} try { inv(b, 'setCategory', 'msg'); } catch (e) {} }
            // 长一点的内容：下拉能看全
            try { if (body && String(body).length > 30) { const st = A().newObject('android.app.Notification$BigTextStyle'); inv(st, 'bigText', String(body)); inv(b, 'setStyle', st); } } catch (e) {}
            // TA 的头像
            try {
                if (opt.appPath && plus.io && plus.io.convertLocalFileSystemURL) {
                    let p = plus.io.convertLocalFileSystemURL(opt.appPath); if (/^file:\/\//.test(p)) p = decodeURIComponent(p.replace(/^file:\/\//, ''));
                    const bmp = imp('android.graphics.BitmapFactory').decodeFile(p);
                    if (bmp) inv(b, 'setLargeIcon', bmp);
                }
            } catch (e) {}
            // 点了回到谷雨，并且知道该跳到哪
            const key = opt.key != null ? opt.key : (opt.charId != null ? 'c:' + catOf(title, body, opt) + ':' + opt.charId : 'n:' + (++seq) + ':' + Date.now());
            const id = idOf(key);
            try {
                const it = inv(inv(c, 'getPackageManager'), 'getLaunchIntentForPackage', pkg());
                if (it) {
                    inv(it, 'setAction', ACT);
                    inv(it, 'putExtra', 'gyJump', JSON.stringify(jumpOf(opt)));
                    inv(it, 'addFlags', 0x10000000 | 0x20000000);   // NEW_TASK | SINGLE_TOP
                    const PI = imp('android.app.PendingIntent');
                    const pi = PI.getActivity(c, id, it, s >= 23 ? 0x0C000000 : 0x08000000);   // UPDATE_CURRENT | IMMUTABLE
                    if (pi) inv(b, 'setContentIntent', pi);
                }
            } catch (e) {}
            const n = inv(b, 'build');
            inv(m, 'notify', id, n);
            lastErr = '';
            return true;
        } catch (e) { lastErr = String(e && e.message || e); console.warn('[横幅通知]', e); return false; }
    }
    window.gyNativeNotify = nativeNotify;


    /* ---------------- 297：带进度条的通知（后台更新用，跟应用商店更新时通知栏那条一样） ----------------
       gyNativeProgress(key, 标题, 说明, 百分比, { ongoing, jump, alert })：百分比 0~100 画进度条，-1 = 来回滚动的那种，null = 不画（下好了 / 失败了）。
       用单独的安静渠道 gy_update（不响、不弹横幅，只在通知栏里走进度）；alert:true 的那一条（下好了）走「重要」渠道弹一下。
       gyNativeCancel(key) 收掉。返回 false = 这台弹不了。 */
    const CH_UPD = 'gy_update';
    let updChanOk = false;
    function ensureUpdChannel() {
        if (updChanOk) return true;
        const m = mgr(); if (!m) return false;
        try {
            if (sdkInt() >= 26) {
                const ch = A().newObject('android.app.NotificationChannel', CH_UPD, '更新进度', 2);   // 2 = IMPORTANCE_LOW：不响不弹
                try { inv(ch, 'setDescription', '谷雨在后台下载更新时，在通知栏显示进度条。'); } catch (e) {}
                try { inv(ch, 'setShowBadge', false); } catch (e) {}
                inv(m, 'createNotificationChannel', ch);
            }
            updChanOk = true;
        } catch (e) { lastErr = String(e && e.message || e); }
        return updChanOk;
    }
    function nativeProgress(key, title, text, pct, opt) {
        opt = opt || {};
        if (!isApp()) return false;
        try {
            const c = ctx(), m = mgr(); if (!c || !m) return false;
            const loud = !!opt.alert;
            if (loud ? !ensureChannel() : !ensureUpdChannel()) return false;
            const s = sdkInt(), chId = loud ? CH : CH_UPD;
            const b = s >= 26 ? A().newObject('android.app.Notification$Builder', c, chId) : A().newObject('android.app.Notification$Builder', c);
            let icon = 0;
            try { icon = plus.android.getAttribute(inv(c, 'getApplicationInfo'), 'icon') || 0; } catch (e) {}
            inv(b, 'setSmallIcon', pct == null ? (icon || 17301634) : 17301633);   // 下载中用系统的「下载」小箭头（会动）
            inv(b, 'setContentTitle', String(title || '谷雨更新'));
            inv(b, 'setContentText', String(text || ''));
            inv(b, 'setOngoing', !!opt.ongoing);
            inv(b, 'setAutoCancel', !opt.ongoing);
            try { inv(b, 'setOnlyAlertOnce', true); } catch (e) {}
            try { inv(b, 'setShowWhen', false); } catch (e) {}
            if (pct != null) { const p = Math.max(0, Math.min(100, Math.round(pct))); inv(b, 'setProgress', 100, pct < 0 ? 0 : p, pct < 0); if (s >= 24 && pct >= 0) { try { inv(b, 'setSubText', p + '%'); } catch (e) {} } }
            else { try { inv(b, 'setProgress', 0, 0, false); } catch (e) {} }
            if (s < 26) { try { inv(b, 'setPriority', loud ? 1 : -1); if (loud) inv(b, 'setDefaults', -1); } catch (e) {} }
            const id = idOf('p:' + key);
            try {
                const it = inv(inv(c, 'getPackageManager'), 'getLaunchIntentForPackage', pkg());
                if (it) {
                    if (opt.jump) { inv(it, 'setAction', ACT); inv(it, 'putExtra', 'gyJump', JSON.stringify(opt.jump)); }
                    inv(it, 'addFlags', 0x10000000 | 0x20000000);
                    const pi = imp('android.app.PendingIntent').getActivity(c, id, it, s >= 23 ? 0x0C000000 : 0x08000000);
                    if (pi) inv(b, 'setContentIntent', pi);
                }
            } catch (e) {}
            inv(m, 'notify', id, inv(b, 'build'));
            return true;
        } catch (e) { lastErr = String(e && e.message || e); return false; }
    }
    function nativeCancel(key) { try { const m = mgr(); if (m) inv(m, 'cancel', idOf('p:' + key)); return true; } catch (e) { return false; } }
    window.gyNativeProgress = nativeProgress; window.gyNativeCancel = nativeCancel;

    /* ---------------- 点通知回来 ---------------- */
    function go(j) {
        if (!j) return;
        try {
            if (j.fn && typeof window[j.fn] === 'function' && /^gyUpd/.test(j.fn)) return window[j.fn].apply(null, j.args || []);
            if (j.nid != null && typeof window.gyOpenNotif === 'function' && window.gyOpenNotif(j.nid) !== false) return;
            if (j.chat != null && typeof window.gyJump === 'function') return window.gyJump({ chat: j.chat });
            if (typeof window.gyPushGo === 'function') return window.gyPushGo(j);
            if (typeof window.gyJump === 'function') window.gyJump(j);
        } catch (e) {}
    }
    function takeIntent() {
        if (!isApp()) return;
        try {
            const it = inv(ctx(), 'getIntent'); if (!it) return;
            const s = inv(it, 'getStringExtra', 'gyJump'); if (!s) return;
            try { inv(it, 'removeExtra', 'gyJump'); } catch (e) {}
            let j = null; try { j = JSON.parse(String(s)); } catch (e) {}
            const t0 = Date.now();
            (function wait() {   // 刚启动时等存档读完（角色都在了）再跳
                if ((typeof myCharacters !== 'undefined' && myCharacters && myCharacters.length) || Date.now() - t0 > 8000) go(j);
                else setTimeout(wait, 300);
            })();
        } catch (e) {}
    }
    window.__gyNnGo = go;


    /* ---------------- 297：人不在的时候，正开着的那个聊天来了新消息也要弹 ----------------
       以前：你停在和 TA 的聊天页时，TA 回了话只刷新页面、不出气泡——所以「发完就切出去 / 锁屏」等回复，手机一声不响。
       现在：谷雨不在最前面（切走了、锁屏了、电脑上窗口不在前面）时，这个聊天里 TA 新说的话照样弹系统通知。
       做法：包一层 renderChatMessages（各条回复路径在聊天页开着时都会调它），不用一处处改。 */
    let paused = false;
    try { document.addEventListener('pause', () => { paused = true; }, false); document.addEventListener('resume', () => { paused = false; }, false); } catch (e) {}
    const away = () => paused || document.visibilityState !== 'visible' || !document.hasFocus();
    window.gyAway = away;
    window.__gyNnSetPaused = v => { paused = !!v; };   // 测试用
    const seenTs = {};
    function watchOpenChat() {
        try {
            if (typeof currentChatSessionId === 'undefined' || currentChatSessionId == null || typeof globalChats === 'undefined') return;
            const sid = currentChatSessionId, list = globalChats[sid];
            if (!Array.isArray(list) || !list.length) return;
            const vc = $('view-chat'); if (!vc || vc.style.display === 'none') return;
            const m = list[list.length - 1], ts = +m.timestamp || 0;
            const first = !(sid in seenTs), last = seenTs[sid] || 0;
            seenTs[sid] = Math.max(last, ts);
            if (first || ts <= last) return;                              // 第一次看到这个聊天只记位置，不补弹以前的
            if (!m || m.sender === 'me' || m.sender === 'system' || m.isSystem) return;
            if (Date.now() - ts > 20000) return;                          // 只管刚刚到的
            if (!away()) return;
            if (typeof sendBrowserNotification !== 'function') return;
            const c = (typeof myCharacters !== 'undefined' && myCharacters || []).find(x => String(x.id) === String(m.sender));
            let title = (c ? c.name : 'TA') + ' 发来消息';
            try { const g = typeof groupChats !== 'undefined' && groupChats && groupChats.find(x => String(x.id) === String(sid)); if (g && g.name) title = '[' + g.name + '] ' + (c ? c.name : ''); } catch (e) {}
            const body = String(m.text || '').replace(/<[^>]+>/g, '').trim() || '[图片/表情/拍一拍]';
            sendBrowserNotification(title, body, { charId: c ? c.id : sid, jump: { chat: sid }, key: 'c:chat:' + sid, cat: 'chat' });
        } catch (e) {}
    }
    function hookRender() {
        try {
            if (typeof renderChatMessages !== 'function' || renderChatMessages.__gyNn) return;
            const o = renderChatMessages;
            const w = function () { const r = o.apply(this, arguments); watchOpenChat(); return r; };
            w.__gyNn = true; renderChatMessages = w;
        } catch (e) {}
    }


    /* ---------------- 297：哪些弹、哪些不弹（按种类分开关） ----------------
       谷雨里出的每一条通知（进通知页的那种）都会走到 sendBrowserNotification；这里给它分个类，每类一个开关（默认都开）。
       只是「已收藏」「已修改」这种点完按钮的小回执（不进通知页、点了也没处去）不弹手机通知。 */
    const CATS = [
        ['chat', '💬', '聊天消息', 'TA 发来消息、群里说话、拍一拍'],
        ['post', '📝', '帖子', '评论、回复、点赞你的帖子和评论'],
        ['call', '📞', '来电', 'TA 打来电话、未接来电'],
        ['invite', '🤝', '邀请和约定', '约你出去、一起听歌看电影、想换头像这类要你回话的'],
        ['letter', '💌', '信和日记', 'TA 写了信、写了日记、回了你的信'],
        ['soft', '📱', '软件里的', '微信、微博、小红书、抖音、网易云、拼多多……里的动静'],
        ['play', '🎲', '小功能和新玩法', '商城快递外卖、行程天气、各种新玩法里的提醒'],
        ['life', '🌿', 'TA 自己做的事', 'TA 自己发了推、换了签名、去了哪……不属于上面几类的'],
        ['sys', '🛟', '谷雨的提醒', '客服发现的问题、接口测试结果、更新这类不是角色发的'],
    ];
    const catKey = k => 'gyNnCat_' + k;
    function catOf(title, body, opt) {
        opt = opt || {};
        if (opt.cat) return opt.cat;
        let n = opt.notif; if (n != null && typeof n !== 'object') { try { n = typeof window.gyNotifFind === 'function' ? window.gyNotifFind(n) : null; } catch (e) { n = null; } }
        n = n || {};
        const t = String(title || '') + ' ' + String(n.text || '').replace(/<[^>]+>/g, '');
        const j = n.jump || opt.jump || {}, fn = typeof j.fn === 'string' ? j.fn : '';
        const cid = opt.charId != null ? opt.charId : (n.chatCharId != null ? n.chatCharId : n.charId);
        if (/呼叫你|打过电话|来电|没接/.test(t)) return 'call';
        if (/^gys/i.test(fn) || j.app) return 'soft';
        if (n.postId != null || opt.postId != null || j.postId != null || /赞了您|评论了您|回复了您|赞了你|评论了你|回复了你/.test(t)) return 'post';
        if (j.diary != null || /^gyOpenMyDiary/.test(fn)) return 'letter';
        if (/约你|邀请|拉你一起|想换|婉拒|答应了|约在了/.test(t)) return 'invite';
        if (/发来消息|想私下跟你聊|说了句话|拍了拍/.test(t)) return 'chat';
        if (fn || n.feature || n.view || j.feature || j.view) return 'play';
        return cid != null ? 'life' : 'sys';
    }
    function allow(title, body, opt) {
        opt = opt || {};
        if (opt.__icon) return true;                                   // 第二趟（头像画好了）不用再判
        // 小回执：从气泡来的、既不是通知页里的一条、也没有帖子 / 聊天可去
        if (opt.toast && opt.notif == null && opt.postId == null && opt.charId == null && !opt.jump) return false;
        const k = catOf(title, body, opt); if (k === 'test') return true;
        return isOn(catKey(k));
    }
    window.gyNnAllow = allow; window.gyNnCatOf = catOf; window.gyNnCats = CATS;
    window.gyNnCatSet = function (k, on) { try { if (typeof setAutoFeature === 'function') setAutoFeature(catKey(k), !!on, true); } catch (e) {} paint(); };

    /* ---------------- 正在用谷雨时也弹 ---------------- */
    function fgOn() { return isOn(FG); }
    window.gyNotifFgOn = fgOn;
    window.gyNotifFgSet = function (on) {
        try { if (typeof setAutoFeature === 'function') setAutoFeature(FG, !!on, true); } catch (e) {}
        toast(on ? '📣 正在用谷雨时也会弹了' : '📣 正在用谷雨时不弹了', on ? pick(['就算谷雨开在最前面，TA 来消息也从屏幕顶上弹', '手机自带的横幅和谷雨里的小气泡会一起出现']) : pick(['只在你切走、锁屏的时候才弹', '谷雨开在最前面时只出谷雨里的小气泡']));
        paint();
    };

    /* ---------------- 📌 后台常驻（前台服务，要「谷雨守护」1.1.0） ---------------- */
    let Gd = null, gdTried = 0;
    function guard() {
        if (Gd) return Gd;
        if (!isApp() || Date.now() - gdTried < 3000) return null; gdTried = Date.now();
        try { const g = imp('com.guyu.guard.Guard'); const v = g && g.version(); if (v) { g.__v = String(v); Gd = g; } } catch (e) {}
        return Gd;
    }
    const verNum = v => String(v || '0').split('.').map(Number).reduce((a, n) => a * 1000 + (n || 0), 0);
    function svcHas() { const g = guard(); return !!(g && verNum(g.__v) >= verNum('1.1.0')); }
    function svcRunning() { try { return svcHas() ? !!Gd.keepOn() : false; } catch (e) { return false; } }
    function svcText() {
        let name = '';
        try { const c = typeof myCharacters !== 'undefined' && myCharacters && myCharacters[0]; if (c && c.name) name = c.name; } catch (e) {}
        return [pick(['谷雨在后台陪着你', '谷雨在后台开着', '谷雨还醒着']), name ? pick([name + ' 有消息会叫你', name + ' 找你的时候会弹出来', '这一条是为了不让手机把 ' + name + ' 冻住']) : pick(['TA 有消息会叫你', '这一条是为了不让手机把谷雨冻住'])];
    }
    function svcStart() {
        if (!isOn(SVC) || !svcHas()) return false;
        try { const t = svcText(); const ok = !!Gd.keepStart(ctx(), t[0], t[1]); if (!ok) { try { lastErr = String(Gd.keepError() || ''); } catch (e) {} } setTimeout(paint, 600); return ok; } catch (e) { lastErr = String(e && e.message || e); return false; }
    }
    function svcStop() { try { if (svcHas()) Gd.keepStop(ctx()); } catch (e) {} setTimeout(paint, 300); }
    window.gyKeepSvcSet = function (on) {
        try { if (typeof setAutoFeature === 'function') setAutoFeature(SVC, !!on, true); } catch (e) {}
        if (on) {
            if (!isApp()) toast('📌 后台常驻只有安卓 App 里有', '网页 / 电脑上用不了，可以用下面的「🎵 后台保活」');
            else if (!svcHas()) toast('📌 这个要新一点的 App', '要 1.52 以上的安卓安装包（里面带了新的谷雨守护）。装好新包以后它会自己开始');
            else askPerm(() => { const ok = svcStart(); toast(ok ? '📌 后台常驻开了' : '📌 没开起来', ok ? pick(['通知栏会一直挂着一条「谷雨在后台」，这是正常的，别划掉它', '手机会把谷雨当成正在干活的软件，不容易冻住了', '会多耗一点电，不需要的时候记得关']) : (lastErr || '手机没让开，看看下面各牌子手机的设置')); });
        } else { svcStop(); toast('📌 后台常驻关了', '通知栏那一条会消失'); }
        paint();
    };
    window.gyKeepSvcState = () => ({ on: isOn(SVC), has: svcHas(), running: svcRunning() });

    /* ---------------- 跳到手机的设置页 ---------------- */
    function startIntent(it) { try { inv(it, 'addFlags', 0x10000000); inv(ctx(), 'startActivity', it); return true; } catch (e) { return false; } }
    window.gyNnOpen = function (what) {
        if (!isApp()) { toast('只有安卓 App 里能直接跳过去', '网页版请到浏览器的「网站设置 → 通知」里看'); return false; }
        let ok = false;
        try {
            const Uri = imp('android.net.Uri'), p = pkg();
            if (what === 'channel' && sdkInt() >= 26) {
                ensureChannel();
                const it = A().newObject('android.content.Intent', 'android.settings.CHANNEL_NOTIFICATION_SETTINGS');
                inv(it, 'putExtra', 'android.provider.extra.APP_PACKAGE', p); inv(it, 'putExtra', 'android.provider.extra.CHANNEL_ID', CH);
                ok = startIntent(it);
            }
            if (!ok && (what === 'channel' || what === 'notify') && sdkInt() >= 26) {
                const it = A().newObject('android.content.Intent', 'android.settings.APP_NOTIFICATION_SETTINGS');
                inv(it, 'putExtra', 'android.provider.extra.APP_PACKAGE', p);
                ok = startIntent(it);
            }
            if (!ok && what === 'battery' && sdkInt() >= 23) {
                ok = startIntent(A().newObject('android.content.Intent', 'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', Uri.parse('package:' + p)));
                if (!ok) ok = startIntent(A().newObject('android.content.Intent', 'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'));
            }
            if (!ok) ok = startIntent(A().newObject('android.content.Intent', 'android.settings.APPLICATION_DETAILS_SETTINGS', Uri.parse('package:' + p)));
        } catch (e) { lastErr = String(e && e.message || e); }
        if (!ok) toast('没跳过去', '自己打开手机「设置 → 应用 → 谷雨」也是一样的');
        return ok;
    };
    function batteryFree() { try { if (!isApp() || sdkInt() < 23) return null; return !!inv(inv(ctx(), 'getSystemService', 'power'), 'isIgnoringBatteryOptimizations', pkg()); } catch (e) { return null; } }

    /* ---------------- 发一条测试 ---------------- */
    window.gyNnTest = function (delay) {
        const c0 = (typeof myCharacters !== 'undefined' && myCharacters && myCharacters[0]) || null;
        const title = c0 ? c0.name + pick(['：在吗', '：测试一下', ' 发来消息']) : pick(['谷雨测试横幅', '测试一下：能看到吗']);
        const body = pick(['看到这条从屏幕顶上弹下来，就说明横幅好了', '能弹出来就没问题了，点一下回到谷雨', '以后我找你就是这样弹出来的']);
        const fire = () => {
            const opt = { charId: c0 ? c0.id : null, jump: c0 ? { chat: c0.id } : { view: 'notifications' }, key: 'test', cat: 'test' };
            const send = ic => {
                if (isApp()) { const ok = nativeNotify(title, body, Object.assign({ appPath: ic && ic.appPath }, opt)); if (!ok) toast('📣 没弹出来', lastErr || '看看下面「通知总开关」是不是关着'); }
                else { try { const keep = window.__gyNnForce; window.__gyNnForce = true; if (typeof sendBrowserNotification === 'function') sendBrowserNotification(title, body, { charId: opt.charId }); window.__gyNnForce = keep; } catch (e) {} }
                paint();
            };
            if (typeof window.gyNotifIcon === 'function') Promise.race([window.gyNotifIcon({ charId: opt.charId }, title), new Promise(r => setTimeout(() => r(null), 1500))]).then(send, () => send(null));
            else send(null);
        };
        askPerm(ok => {
            if (!ok) toast('📣 手机没允许谷雨发通知', '点「⚙️ 通知设置」，把「允许通知」打开');
            if (delay) { toast('📣 ' + Math.round(delay / 1000) + ' 秒后弹', pick(['现在可以切到别的软件，或者按一下锁屏', '想看后台 / 锁屏时弹不弹，就现在切出去等着'])); setTimeout(fire, delay); }
            else fire();
        });
    };

    /* ---------------- 各牌子手机怎么设 ---------------- */
    const BRANDS = {
        oppo: { n: 'OPPO / 一加 / realme（ColorOS）', s: [
            '通知：点下面「⚙️ 通知设置」→「允许通知」打开 → 把「横幅通知」「锁屏通知」「声音 / 振动」都打开（这几个新装的软件默认是关的，所以以前不弹）',
            '电池：点「🔋 电池不限制」→ 允许；再点「📱 应用详情」→「耗电管理」→ 打开「允许完全后台行为」「允许自动启动」「允许关联启动」',
            '多任务：从屏幕底下往上滑停住，找到谷雨那张卡片，点右上角 ⋮ →「锁定」（卡片上出现小锁）',
            '手机「设置 → 电池」里如果开着「超级省电 / 睡眠待机优化」，夜里还是会被掐，介意就关掉' ] },
        vivo: { n: 'vivo / iQOO（OriginOS）', s: [
            '通知：点下面「⚙️ 通知设置」→「允许通知」打开 → 把「悬浮通知」「锁屏通知」「铃声 / 振动」都打开（悬浮通知就是从顶上弹下来的那种，默认是关的）',
            '电池：点「🔋 电池不限制」→ 允许；再到手机「设置 → 电池 → 后台耗电管理 → 谷雨」→ 选「允许后台高耗电」',
            '自启动：手机「设置 → 应用与权限 → 权限管理 → 权限 → 自启动」→ 把谷雨打开',
            '多任务：从屏幕底下往上滑停住，把谷雨那张卡片往下拉一下（或点 ⋮ → 锁定），出现小锁' ] },
        xiaomi: { n: '小米 / 红米 / POCO（澎湃 OS / MIUI）', s: [
            '通知：点下面「⚙️ 通知设置」→「允许通知」打开 → 把「悬浮通知」「锁屏通知」「声音」「振动」都打开',
            '电池：点「📱 应用详情」→「省电策略」→ 选「无限制」；同一页把「自启动」打开',
            '多任务：从屏幕底下往上滑停住，长按谷雨那张卡片 → 点小锁',
            '手机「设置 → 电池」里的「锁屏后断开数据 / 锁屏清理内存」如果开着，改成「从不」' ] },
        huawei: { n: '华为（鸿蒙 / EMUI）', s: [
            '通知：点下面「⚙️ 通知设置」→「允许通知」打开 → 把「横幅通知」「锁屏通知」打开，提醒方式选「铃声 / 振动」',
            '启动管理：手机「设置 → 应用和服务 → 应用启动管理 → 谷雨」→ 把自动管理关掉 → 弹出来的「允许自启动」「允许关联启动」「允许后台活动」三个都打开',
            '电池：点「🔋 电池不限制」→ 允许',
            '多任务：从屏幕底下往上滑停住，把谷雨那张卡片往下拉一下，出现小锁' ] },
        honor: { n: '荣耀（MagicOS）', s: [
            '通知：点下面「⚙️ 通知设置」→「允许通知」打开 → 把「横幅通知」「锁屏通知」打开，提醒方式选「铃声 / 振动」',
            '启动管理：手机「设置 → 应用和服务 → 应用启动管理 → 谷雨」→ 关掉自动管理 → 三个开关（自启动 / 关联启动 / 后台活动）都打开',
            '电池：点「🔋 电池不限制」→ 允许',
            '多任务：从屏幕底下往上滑停住，把谷雨那张卡片往下拉一下，出现小锁' ] },
        samsung: { n: '三星（One UI）', s: [
            '通知：点下面「⚙️ 通知设置」→「允许通知」打开 → 通知类型里把「弹出」「锁定屏幕」都勾上；「TA 的消息」那一类点进去选「提醒」而不是「静默」',
            '电池：点「📱 应用详情」→「电池」→ 选「不受限制」',
            '手机「设置 → 电池 → 后台使用限制」→ 把谷雨加进「从不自动休眠的应用程序」',
            '多任务：点谷雨卡片上面的图标 →「保持打开」' ] },
        meizu: { n: '魅族（Flyme）', s: [
            '通知：点下面「⚙️ 通知设置」→「允许通知」打开 → 把「悬浮通知」「锁屏通知」打开',
            '后台：手机「手机管家 → 权限管理 → 后台管理 → 谷雨」→ 选「允许后台运行」；「自启动管理」里把谷雨打开',
            '多任务：往下拉一下谷雨那张卡片，出现小锁' ] },
        other: { n: '别的牌子 / 原生安卓', s: [
            '通知：点下面「⚙️ 通知设置」→「允许通知」打开 →「TA 的消息」那一类点进去，选「提醒 / 在屏幕上弹出」，锁屏也选「显示」',
            '电池：点「🔋 电池不限制」→ 允许（或者「📱 应用详情」→ 电池 → 不受限制）',
            '如果有「自启动 / 后台活动」这种开关，也给谷雨打开',
            '多任务界面里如果能给卡片「加锁」，把谷雨锁上' ] },
    };
    function brandKey() {
        let s = '';
        try { if (isApp()) { const B = imp('android.os.Build'); s = String(B.MANUFACTURER || '') + ' ' + String(B.BRAND || ''); } } catch (e) {}
        s = (s + ' ' + navigator.userAgent).toLowerCase();
        if (/oppo|oneplus|realme|\bpacm|\bpbem|\bpg[a-z]{2}\d/.test(s)) return 'oppo';
        if (/vivo|iqoo/.test(s)) return 'vivo';
        if (/xiaomi|redmi|poco|\bmi \d/.test(s)) return 'xiaomi';
        if (/honor/.test(s)) return 'honor';
        if (/huawei|harmony/.test(s)) return 'huawei';
        if (/samsung|\bsm-[a-z]\d/.test(s)) return 'samsung';
        if (/meizu/.test(s)) return 'meizu';
        return 'other';
    }
    window.gyNnBrands = BRANDS;
    window.gyNnBrand = brandKey;
    let showBrand = '';
    window.gyNnPickBrand = function (k) { showBrand = BRANDS[k] ? k : ''; paint(); };

    /* ---------------- 开关登记（全部开关 → 🔔 通知与后台） ---------------- */
    function regSwitch() {
        try {
            if (typeof AUTO_FEATURE_GROUPS !== 'undefined' && !AUTO_FEATURE_GROUPS.some(g => g.key === '通知'))
                AUTO_FEATURE_GROUPS.push({ key: '通知', icon: '🔔', title: '通知与后台', note: '让手机别把谷雨冻住、关了也能收到 TA 的消息。' });
            if (typeof AUTO_FEATURE_DEFS === 'undefined') return;
            if (!AUTO_FEATURE_DEFS.some(f => f.key === FG))
                AUTO_FEATURE_DEFS.push({ key: FG, label: '正在用谷雨时也弹手机横幅', group: '通知', defaultOff: !(uaApp || window.plus), desc: '以前谷雨开在最前面时，TA 来消息只出谷雨里的小气泡，不弹手机自带的通知。打开以后不管你在不在谷雨里，都会从屏幕顶上弹一条。安卓 App 里默认开，网页 / 电脑默认关。', cost: '不调用 API', where: '设置 → 通知与云端' });
            if (!AUTO_FEATURE_DEFS.some(f => f.key === SVC))
                AUTO_FEATURE_DEFS.push({ key: SVC, label: '后台常驻：通知栏挂一条，别让手机冻住谷雨（安卓 App）', group: '通知', defaultOff: true, desc: '打开后通知栏会一直挂着一条「谷雨在后台陪着你」，手机就把谷雨当成正在干活的软件，切到后台、锁屏以后也不容易冻住，TA 到点了能照常说话、弹横幅。不放声音、不抢音乐，可以跟「后台保活」一起开。代价：多耗一点电。要 1.52 以上的安卓安装包。', cost: '不调用 API（耗电多一点）', where: '设置 → 通知与云端' });
            CATS.forEach(c => { if (!AUTO_FEATURE_DEFS.some(f => f.key === catKey(c[0]))) AUTO_FEATURE_DEFS.push({ key: catKey(c[0]), label: '手机通知：' + c[1] + ' ' + c[2], group: '通知', desc: c[3] + '。关掉以后这一类只在谷雨里出气泡、进通知页，不弹手机通知。', cost: '不调用 API', where: '设置 → 通知与云端' }); });
            if (typeof window.setAutoFeature === 'function' && !window.setAutoFeature.__gyNn) {
                const o = window.setAutoFeature;
                const w = function (key, on) { const r = o.apply(this, arguments); if (key === SVC) { on ? svcStart() : svcStop(); } if (key === SVC || key === FG || /^gyNnCat_/.test(String(key))) setTimeout(paint, 50); return r; };
                Object.keys(o).forEach(k => { try { w[k] = o[k]; } catch (e) {} });
                w.__gyNn = true; window.setAutoFeature = w;
            }
        } catch (e) {}
    }

    /* ---------------- 设置面板（设置 → 通知与云端） ---------------- */
    function ensurePanel() {
        const host = $('setPanel-notify'); if (!host || $('gyNnBox')) return;
        const box = document.createElement('div');
        box.id = 'gyNnBox';
        box.style.cssText = 'margin-bottom:15px; padding:10px; background:rgba(29,155,240,0.05); border-radius:8px; border:1px solid #1d9bf0;';
        box.innerHTML = `
<div style="font-size:15px; font-weight:600; margin-bottom:4px;">📣 手机横幅弹窗（从屏幕顶上弹下来的那种）</div>
<div class="form-hint" style="margin-bottom:8px;">要先把上面的「🔔 系统推送通知」勾上。安卓 App 里谷雨会用「重要」级别发通知：弹横幅、会响、锁屏上能看到、带 TA 的头像，点一下回到谷雨。</div>
<div class="input-group checkbox-group" style="margin-bottom:4px;"><input type="checkbox" id="gyNnFg" onchange="gyNotifFgSet(this.checked)"><label style="margin:0;">正在用谷雨时也弹</label></div>
<div class="form-hint" style="margin-bottom:8px;">关着：只有切到别的软件、锁屏时才弹。开着：谷雨开在最前面时也弹。</div>
<div style="font-size:14px; font-weight:600; margin:6px 0 2px;">哪些弹、哪些不弹</div>
<div class="form-hint" style="margin-bottom:4px;">谷雨里出的每一种通知都能弹到手机上；不想被哪一类打扰就把它的勾去掉（谷雨里的气泡和通知页不受影响）。</div>
<div id="gyNnCats" style="margin-bottom:8px;">${CATS.map(c => `<div class="input-group checkbox-group" style="margin-bottom:2px;"><input type="checkbox" id="gyNnCat_${c[0]}" onchange="gyNnCatSet('${c[0]}', this.checked)"><label style="margin:0;">${c[1]} ${esc(c[2])}<span class="form-hint" style="margin-left:6px;">${esc(c[3])}</span></label></div>`).join('')}</div>
<div id="gyNnSt" class="form-hint" style="margin-bottom:8px;"></div>
<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
  <button type="button" class="btn-secondary" style="padding:8px; flex:1 1 45%;" onclick="gyNnTest(0)">📣 现在弹一条试试</button>
  <button type="button" class="btn-secondary" style="padding:8px; flex:1 1 45%;" onclick="gyNnTest(6000)">⏱️ 6 秒后弹（切出去 / 锁屏试）</button>
</div>
<div id="gyNnApp">
  <div class="input-group checkbox-group" style="margin-bottom:4px;"><input type="checkbox" id="gyNnSvc" onchange="gyKeepSvcSet(this.checked)"><label style="margin:0; font-size:15px;">📌 后台常驻（通知栏挂一条，不放声音）</label></div>
  <div class="form-hint" style="margin-bottom:4px;">通知栏会一直有一条「谷雨在后台陪着你」，手机就不容易把谷雨冻住，切走、锁屏以后 TA 到点了也能说话、弹横幅。<b>默认关</b>：会多耗一点电。不抢别的 App 的音乐，可以和下面的「🎵 后台保活」一起开，也可以只开这个。</div>
  <div id="gyNnSvcSt" class="form-hint" style="margin-bottom:10px;"></div>
  <div style="font-size:15px; font-weight:600; margin-bottom:4px;">🧭 手机这边还要设一下（不设的话手机自己会拦）</div>
  <div class="input-group"><label>手机牌子</label><select id="gyNnBrandSel" onchange="gyNnPickBrand(this.value)">${Object.keys(BRANDS).map(k => `<option value="${k}">${esc(BRANDS[k].n)}</option>`).join('')}</select></div>
  <div id="gyNnSteps" class="form-hint" style="margin:6px 0 8px; line-height:1.7;"></div>
  <div style="display:flex; flex-wrap:wrap; gap:6px;">
    <button type="button" class="btn-secondary" style="padding:8px; flex:1 1 30%;" onclick="gyNnOpen('channel')">⚙️ 通知设置</button>
    <button type="button" class="btn-secondary" style="padding:8px; flex:1 1 30%;" onclick="gyNnOpen('battery')">🔋 电池不限制</button>
    <button type="button" class="btn-secondary" style="padding:8px; flex:1 1 30%;" onclick="gyNnOpen('app')">📱 应用详情</button>
  </div>
</div>`;
        // 放在「📲 谷雨自己的通知」前面（那块是 js/98 加的）；没有就放最后
        const pb = $('gyPushBox');
        if (pb && pb.parentElement === host) host.insertBefore(box, pb); else host.appendChild(box);
        paint();
    }
    function paint() {
        if (!$('gyNnBox')) return;
        const st = state();
        $('gyNnFg').checked = st.fg;
        $('gyNnSvc').checked = st.svc;
        CATS.forEach(c => { const el = $('gyNnCat_' + c[0]); if (el) el.checked = isOn(catKey(c[0])); });
        const on = typeof enableBrowserNotifications !== 'undefined' ? !!enableBrowserNotifications : true;
        const L = [];
        if (!on) L.push('⚠️ 上面的「🔔 系统推送通知」还没勾，勾上才会弹');
        if (st.app) {
            if (st.allowed === false) L.push('❌ 手机把谷雨的通知整个关掉了：点下面「⚙️ 通知设置」把「允许通知」打开');
            else if (st.allowed === true) L.push('✅ 手机允许谷雨发通知');
            if (st.imp != null) L.push(st.imp >= 4 ? '✅ 「TA 的消息」是「重要」级别（会弹横幅）' : '⚠️ 「TA 的消息」被手机调成了安静模式，不会弹：点「⚙️ 通知设置」改回「提醒 / 弹出」');
            const bf = batteryFree();
            if (bf === true) L.push('✅ 电池：不限制'); else if (bf === false) L.push('⚠️ 电池：手机还在限制谷雨的后台，点「🔋 电池不限制」');
            if (st.err) L.push('上一次没弹成：' + esc(st.err));
        } else L.push(uaApp ? '正在准备…' : '这里是网页 / 电脑：弹的是浏览器的通知，横幅样子跟着浏览器和系统走。下面「后台常驻」和手机设置只有安卓 App 里有。');
        $('gyNnSt').innerHTML = L.join('<br>');
        $('gyNnApp').style.display = st.app || uaApp ? '' : 'none';
        $('gyNnSvcSt').textContent = !st.app ? '' : !st.svcHas ? '⚠️ 这个安装包里还没有这项本事：要装 1.52 以上的安卓安装包（装好以后这里会自己变）' : !st.svc ? '关着' : st.svcOn ? '▶ 正挂在通知栏上（别把那一条划掉）' : '准备中…（没开起来的话把开关关了再开一次）';
        const k = showBrand || st.brand, b = BRANDS[k] || BRANDS.other;
        $('gyNnBrandSel').value = k;
        $('gyNnSteps').innerHTML = (showBrand ? '' : (st.app ? '看着像是：<b>' + esc(b.n) + '</b>（不对可以自己选）<br>' : '')) + b.s.map((x, i) => '①②③④⑤⑥'[i] + ' ' + esc(x)).join('<br>');
    }
    window.gyNnPaint = paint;
    window.gyNnState = state;

    function boot() {
        regSwitch();
        ensurePanel();
        hookRender(); setTimeout(hookRender, 1500);
        try { const o = window.openSettingsPanel; if (typeof o === 'function' && !o.__gyNn) { const w = function (k) { const r = o.apply(this, arguments); if (k === 'notify') { ensurePanel(); paint(); } return r; }; Object.keys(o).forEach(k => { try { w[k] = o[k]; } catch (e) {} }); w.__gyNn = true; window.openSettingsPanel = w; } } catch (e) {}
    }
    function plusBoot() {
        if (!isApp() || plusBoot.done) return; plusBoot.done = true;
        try { ensureChannel(); } catch (e) {}
        takeIntent();
        try { document.addEventListener('newintent', () => setTimeout(takeIntent, 50), false); } catch (e) {}
        try { document.addEventListener('resume', () => { setTimeout(takeIntent, 80); setTimeout(paint, 300); if (isOn(SVC) && svcHas() && !svcRunning()) svcStart(); }, false); } catch (e) {}
        // 开着「系统推送通知」但手机还没给权限（安卓 13 以上要问一次）
        try { if (typeof enableBrowserNotifications !== 'undefined' && enableBrowserNotifications) askPerm(() => paint()); } catch (e) {}
        setTimeout(() => { if (isOn(SVC)) svcStart(); paint(); }, 1500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    if (window.plus) plusBoot(); document.addEventListener('plusready', plusBoot, false);
})();
