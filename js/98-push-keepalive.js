// =====================================================================
//  📲 谷雨自己的通知 + 🎵 后台保活（247）
//  · 网页 / 加到主屏幕的谷雨：Web Push。订阅交给云端 Worker（/vapid 拿公钥，/sync 带上订阅），
//    TA 到点了 Worker 直接推给手机，弹的是「谷雨」的通知，点了打开谷雨、跳到 TA 的聊天。
//  · 安卓 App（HBuilderX 5+App）：WebView 里没有 Web Push，走 uni-push 1.0（个推）。
//    在 DCloud 开发者中心开通后填 AppID / AppKey / MasterSecret，这台手机的 cid 自己读。
//  · 后台保活：循环放一段很轻的声音（几乎听不到的底噪 / 轻轻的雨声），让手机别把谷雨冻住。
//    默认关，开关在 设置 → 通知与云端，也在「全部开关 → 🔔 通知与后台」。
//  这几样都不是「角色的功能」，所以没有自主行动、今天、小组件这些（纯工具）。
// =====================================================================
(function () {
    const LS = 'gyPushCfg';
    const isApp = () => !!(window.plus && plus.push);
    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { cfg = {}; }
    const save = () => { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} };
    const toast = (t, d) => { try { if (typeof showToast === 'function') showToast('', t, d || '', null, null, false); } catch (e) {} };
    const worker = () => ({ url: (typeof cloudWorkerUrl !== 'undefined' ? cloudWorkerUrl : '') || '', tok: (typeof cloudAuthToken !== 'undefined' ? cloudAuthToken : '') || '' });
    const b64uToBytes = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), o = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; };
    const pick = a => a[Math.floor(Math.random() * a.length)];

    /* ---------------- 📲 网页：Web Push ---------------- */
    function webPushWhyNot() {
        if (isApp()) return '在 App 里用下面的「安卓 App 通知（uni-push）」';
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
            const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            if (ios) return '苹果手机要先把谷雨「添加到主屏幕」，再从桌面图标打开谷雨，才能开这个（iOS 16.4 以上）';
            return '这个浏览器不支持推送（试试手机 Chrome / Edge，或者电脑 Chrome / Edge）';
        }
        const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (!secure) return '要用 https 网址打开谷雨（GitHub Pages 那个网址就是），本地文件打开不行';
        return '';
    }
    async function swReady() {
        return Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error('Service Worker 没准备好（刷新一下再试）')), 6000))]);
    }
    async function webPushOn() {
        const why = webPushWhyNot(); if (why) throw new Error(why);
        const w = worker(); if (!w.url || !w.tok) throw new Error('先在上面填好 Worker 地址和共享密钥');
        if (typeof cloudSyncEnabled !== 'undefined' && !cloudSyncEnabled) throw new Error('先把上面的「☁️ 云端主动消息唤醒」勾上');
        const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
        if (perm !== 'granted') throw new Error(perm === 'denied' ? '通知权限被拒绝了：去浏览器的网站设置里把「通知」改成允许' : '没有允许通知');
        const reg = await swReady();
        const r = await fetch(w.url + '/vapid', { headers: { Authorization: 'Bearer ' + w.tok } });
        if (r.status === 401) throw new Error('共享密钥对不上（跟 Cloudflare 里的 AUTH_TOKEN 不一样）');
        if (r.status === 404) throw new Error('Worker 是旧版的：把谷雨文件夹里最新的 worker.js 重新粘到 Cloudflare 部署一次');
        if (!r.ok) throw new Error('Worker 回了 HTTP ' + r.status);
        const { publicKey } = await r.json();
        let sub = await reg.pushManager.getSubscription();
        if (sub && cfg.vapid && cfg.vapid !== publicKey) { try { await sub.unsubscribe(); } catch (e) {} sub = null; }
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(publicKey) });
        const j = sub.toJSON();
        cfg.web = true; cfg.vapid = publicKey;
        cfg.sub = { endpoint: j.endpoint, keys: j.keys, label: deviceLabel() };
        cfg.drop = (cfg.drop || []).filter(e => e !== j.endpoint);
        save();
        if (typeof syncStateToCloud === 'function') await syncStateToCloud(true);
        return cfg.sub;
    }
    async function webPushOff() {
        cfg.web = false;
        if (cfg.sub && cfg.sub.endpoint) cfg.drop = Array.from(new Set([...(cfg.drop || []), cfg.sub.endpoint])).slice(-8);
        try { const reg = await swReady(); const s = await reg.pushManager.getSubscription(); if (s) await s.unsubscribe(); } catch (e) {}
        cfg.sub = null; save();
        if (typeof syncStateToCloud === 'function') syncStateToCloud(true);
    }
    function deviceLabel() {
        const u = navigator.userAgent;
        const os = /Android/i.test(u) ? '安卓' : /iPhone|iPad/i.test(u) ? '苹果' : /Windows/i.test(u) ? 'Windows' : /Mac/i.test(u) ? 'Mac' : '设备';
        const br = /Edg\//.test(u) ? 'Edge' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : /Firefox\//.test(u) ? 'Firefox' : '浏览器';
        return os + ' · ' + br;
    }
    window.gyWebPushSet = async function (on, el) {
        try {
            if (on) { await webPushOn(); toast('📲 开好了', pick(['以后 TA 找你，手机会直接弹「谷雨」的通知', '关了网页也能收到 TA 的消息了', '这台设备记下了，点下面「测试连接」试一条'])); }
            else { await webPushOff(); toast('📲 关掉了', '这台设备不再收谷雨的推送'); }
        } catch (e) {
            cfg.web = false; save();
            if (el) el.checked = false;
            toast('📲 没开成', String(e && e.message || e));
        }
        paint();
    };

    /* ---------------- 📲 安卓 App：uni-push（个推） ---------------- */
    function appCid() {
        try {
            const i = plus.push.getClientInfo && plus.push.getClientInfo();
            if (i && i.clientid && i.clientid !== 'null') { cfg.cid = i.clientid; save(); return i.clientid; }
        } catch (e) {}
        return cfg.cid || '';
    }
    function appCidAsync() {
        return new Promise(res => {
            try {
                if (plus.push.getClientInfoAsync) plus.push.getClientInfoAsync(i => { if (i && i.clientid) { cfg.cid = i.clientid; save(); } res(cfg.cid || appCid()); }, () => res(appCid()));
                else res(appCid());
            } catch (e) { res(appCid()); }
        });
    }
    window.gyUniPushSave = function () {
        const g = cfg.getui = cfg.getui || {};
        g.on = !!($('gyUniOn') && $('gyUniOn').checked);
        g.appId = ($('gyUniAppId') && $('gyUniAppId').value || '').trim();
        g.appKey = ($('gyUniAppKey') && $('gyUniAppKey').value || '').trim();
        g.masterSecret = ($('gyUniSecret') && $('gyUniSecret').value || '').trim();
        save(); paint();
        if (typeof syncStateToCloud === 'function') syncStateToCloud(true);
    };
    function getuiForSync() {
        if (!isApp()) return undefined;              // 网页那边不碰 App 的设置
        const g = cfg.getui || {};
        if (!g.on || !g.appId || !g.appKey || !g.masterSecret) return null;
        const cid = appCid(); if (!cid) return null;
        return { appId: g.appId, appKey: g.appKey, masterSecret: g.masterSecret, cid };
    }

    // 给 js/07 的 syncStateToCloud 用：同步时顺手带上这台设备的推送订阅
    window.gyPushSyncExtra = function () {
        const o = { selfUrl: worker().url || '' };
        setTimeout(avatarSync, 400);   // 🖼️ 头像变了的顺手传上去
        if (!isApp()) { o.webPushSubs = cfg.web && cfg.sub ? [cfg.sub] : []; if (cfg.drop && cfg.drop.length) o.webPushDrop = cfg.drop.slice(); }
        const g = getuiForSync(); if (g !== undefined) o.getui = g;
        return o;
    };
    // 给 🔌 测试连接用
    window.gyPushTestBody = function () {
        const o = window.gyPushSyncExtra();
        o.ntfyTopic = (typeof ntfyTopic !== 'undefined' ? ntfyTopic : '') || '';
        o.title = '🔔 ' + pick(['谷雨测试通知', '测试一下：能看到吗', '这是一条测试通知']);
        o.body = pick(['能看到这条，就说明关了网页也能收到 TA 的消息啦', '通了！以后 TA 找你就是这样弹出来的', '收到这条就没问题了，点一下回到谷雨']);
        o.jump = { view: 'notifications' };
        const c0 = allChars()[0]; if (c0) { o.iconId = String(c0.id); o.title = '🔔 ' + c0.name + '：' + pick(['测试一下，能看到我的头像吗', '这是一条测试通知']); }
        return o;
    };
    window.gyPushState = () => ({ isApp: isApp(), web: !!cfg.web, sub: cfg.sub || null, getui: Object.assign({}, cfg.getui || {}), cid: isApp() ? appCid() : '', keep: keepOn(), keepSound: cfg.keepSound || 'quiet', why: webPushWhyNot() });

    /* ---------------- 点通知回来：先把云端攒的消息拉回来，再跳过去 ---------------- */
    async function goJump(j) {
        try { if (typeof fetchPendingFromCloud === 'function') await Promise.race([fetchPendingFromCloud(), new Promise(r => setTimeout(r, 4000))]); } catch (e) {}
        if (!j) return;
        if (j.view === 'notifications') { try { switchMainView('notifications'); } catch (e) {} return; }
        if (j.view === 'home') { try { switchMainView('home'); } catch (e) {} return; }
        if (typeof window.gyJump === 'function') window.gyJump(j);
    }
    window.gyPushGo = goJump;
    if ('serviceWorker' in navigator) {
        try {
            navigator.serviceWorker.addEventListener('message', ev => {
                const d = ev.data || {};
                if (d.gyPushClick !== undefined) goJump(d.gyPushClick);
                else if (d.gyPush) { try { if (typeof fetchPendingFromCloud === 'function') fetchPendingFromCloud(); } catch (e) {} }
            });
        } catch (e) {}
    }
    // 通知点开的是一个新页面：地址里带着 ?gyjump=…
    function jumpFromUrl() {
        try {
            const u = new URL(location.href), s = u.searchParams.get('gyjump');
            if (s == null) return;
            u.searchParams.delete('gyjump'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
            let j = null; try { j = JSON.parse(s); } catch (e) {}
            const t0 = Date.now();
            (function wait() {   // 等谷雨把存档读完（角色都在了）再跳
                if ((typeof myCharacters !== 'undefined' && myCharacters && myCharacters.length) || Date.now() - t0 > 8000) goJump(j);
                else setTimeout(wait, 300);
            })();
        } catch (e) {}
    }
    // App：个推的通知点开
    function hookAppPush() {
        if (!isApp() || hookAppPush.done) return; hookAppPush.done = true;
        const parse = m => { let p = m && m.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = null; } } return p; };
        try {
            plus.push.addEventListener('click', m => { const p = parse(m); if (p && p.gy) goJump(p.jump || null); }, false);
            plus.push.addEventListener('receive', m => { const p = parse(m); if (p && p.gy) { try { if (typeof fetchPendingFromCloud === 'function') fetchPendingFromCloud(); } catch (e) {} } }, false);
        } catch (e) {}
        appCidAsync().then(() => paint());
    }

    /* ---------------- 🖼️ 通知上显示 TA 的头像（248） ----------------
       本地弹的通知：现画一张 128px 的圆头像（dataURL；App 里另外写成文件给 plus.push 用）。
       云端推的通知：头像缩成 96px 的小 jpg 交给 Worker 存着（/avatars），通知里带 Worker 上的图片地址。 */
    const ICON = {};   // charId → { h, dataUrl, appPath }
    const hashStr = s => { s = String(s || ''); let h = 5381; for (let i = 0; i < s.length; i += Math.max(1, Math.floor(s.length / 4000))) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + s.length.toString(36); };
    const allChars = () => (typeof myCharacters !== 'undefined' && Array.isArray(myCharacters) ? myCharacters : []);
    function whoOf(opt, title) {
        opt = opt || {};
        const n = opt.notif && typeof opt.notif === 'object' ? opt.notif : null;
        const id = opt.charId != null ? opt.charId : n ? (n.chatCharId != null ? n.chatCharId : n.charId) : null;
        let c = id != null ? allChars().find(x => String(x.id) === String(id)) : null;
        if (!c && typeof tabloidAccount !== 'undefined' && String(id) === 'tabloid_admin') c = tabloidAccount;
        if (!c && title) c = allChars().slice().sort((a, b) => String(b.name || '').length - String(a.name || '').length).find(x => x.name && String(title).indexOf(x.name) >= 0) || null;
        if (c) return { key: String(c.id), img: c.avatarImg || '', txt: c.avatarEmoji || String(c.name || '?')[0], color: c.themeColor || '#1d9bf0' };
        const m = /url\(['"]?(data:image[^'")]+)/.exec(opt.avatarHtml || '');
        if (m) return { key: 'h' + hashStr(m[1]), img: m[1], txt: '', color: '#1d9bf0' };
        return null;
    }
    function drawCircle(src, txt, color, size, type) {
        return new Promise(res => {
            const cv = document.createElement('canvas'); cv.width = cv.height = size;
            const g = cv.getContext('2d');
            const fin = () => { try { res(cv.toDataURL(type || 'image/png', 0.82)); } catch (e) { res(''); } };
            const plain = () => {
                g.fillStyle = color || '#1d9bf0'; g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.fill();
                g.fillStyle = '#fff'; g.font = `${Math.round(size * 0.5)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
                g.fillText(String(txt || '?').slice(0, 2), size / 2, size / 2 + size * 0.03); fin();
            };
            if (!src) return plain();
            const im = new Image();
            im.onload = () => {
                if (type !== 'image/jpeg') { g.save(); g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.clip(); }
                else { g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); }
                const k = Math.max(size / im.width, size / im.height), w = im.width * k, h = im.height * k;
                g.drawImage(im, (size - w) / 2, (size - h) / 2, w, h); fin();
            };
            im.onerror = plain; im.src = src;
        });
    }
    function writeAppIcon(key, dataUrl) {
        return new Promise(res => {
            try {
                if (!(isApp() && plus.io)) return res('');
                const dir = '_doc/gyavatar/', name = key.replace(/[^\w-]/g, '_') + '.png';
                plus.io.resolveLocalFileSystemURL('_doc/', root => root.getDirectory('gyavatar', { create: true }, () => {
                    plus.io.resolveLocalFileSystemURL(dir, d => d.getFile(name, { create: true }, fe => fe.createWriter(w => {
                        if (typeof w.writeAsBinary !== 'function') return res('');
                        w.onwrite = () => res(dir + name); w.onerror = () => res('');
                        w.writeAsBinary(dataUrl.split(',')[1]);
                    }, () => res('')), () => res('')), () => res(''));
                }, () => res('')), () => res(''));
            } catch (e) { res(''); }
        });
    }
    window.gyNotifIcon = async function (opt, title) {
        const w = whoOf(opt, title); if (!w) return null;
        const h = hashStr(w.img || w.txt + w.color);
        const c = ICON[w.key];
        if (c && c.h === h) return c;
        const dataUrl = await drawCircle(w.img, w.txt, w.color, 128, 'image/png');
        if (!dataUrl) return null;
        const o = { h, dataUrl, appPath: await writeAppIcon(w.key, dataUrl) };
        ICON[w.key] = o; return o;
    };
    // 云端：把头像的小图交给 Worker（只传变了的）
    let avBusy = false;
    async function avatarSync() {
        if (avBusy) return; const wk = worker(); if (!wk.url || !wk.tok) return;
        if (typeof cloudSyncEnabled !== 'undefined' && !cloudSyncEnabled) return;
        if (!(cfg.web || (cfg.getui && cfg.getui.on) || (typeof ntfyTopic !== 'undefined' && ntfyTopic))) return;
        avBusy = true;
        try {
            cfg.avSync = cfg.avSync || {};
            const items = [];
            for (const c of allChars()) {
                const h = hashStr((c.avatarImg || '') + '|' + (c.avatarEmoji || '') + '|' + (c.themeColor || '') + '|' + (c.name || ''));
                if (cfg.avSync[String(c.id)] === h) continue;
                const d = await drawCircle(c.avatarImg || '', c.avatarEmoji || String(c.name || '?')[0], c.themeColor || '#1d9bf0', 96, 'image/jpeg');
                if (d) items.push({ id: String(c.id), h, d });
                if (items.length >= 10) break;
            }
            if (!items.length) return;
            const r = await fetch(wk.url + '/avatars', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + wk.tok }, body: JSON.stringify({ items, base: wk.url }) });
            if (r.ok) { items.forEach(it => { cfg.avSync[it.id] = it.h; }); save(); }
        } catch (e) {} finally { avBusy = false; }
    }
    window.gyPushAvatarSync = avatarSync;

    /* ---------------- 🎵 后台保活 ---------------- */
    const KEEP = 'gyKeepAlive';
    const keepOn = () => (typeof isAutoOn === 'function' ? isAutoOn(KEEP) : !!cfg.keep);
    const SOUNDS = { quiet: { f: 'media/gy-keepalive-quiet.wav', n: '几乎听不到的底噪（推荐）' }, rain: { f: 'media/gy-keepalive-rain.wav', n: '轻轻的雨声（听得见）' } };
    let audio = null, plusPlayer = null, playing = false, waitingTap = false;
    const soundUrl = () => new URL((SOUNDS[cfg.keepSound] || SOUNDS.quiet).f, location.href).href;
    function keepStart() {
        if (!keepOn()) return;
        if (isApp() && plus.audio) {
            try {
                if (!plusPlayer) {
                    plusPlayer = plus.audio.createPlayer({ src: soundUrl(), loop: true, volume: 1, backgroundControl: false });
                    try { plusPlayer.setStyles && plusPlayer.setStyles({ loop: true }); } catch (e) {}
                    try { plusPlayer.addEventListener('ended', () => { if (keepOn()) try { plusPlayer.play(); } catch (e) {} }, false); } catch (e) {}
                }
                plusPlayer.play(() => {}, () => {});
                playing = true;
                try { plus.device.setWakelock(true); } catch (e) {}
            } catch (e) { playing = false; }
            paint(); return;
        }
        if (!audio) { audio = new Audio(); audio.loop = true; audio.preload = 'auto'; audio.setAttribute('playsinline', ''); }
        if (audio.src !== soundUrl()) audio.src = soundUrl();
        audio.volume = 1;
        const p = audio.play();
        if (p && p.then) p.then(() => { playing = true; waitingTap = false; setMedia(); paint(); }).catch(() => { playing = false; waitingTap = true; paint(); armTap(); });
        else { playing = true; setMedia(); }
        paint();
    }
    function keepStop() {
        try { if (audio) { audio.pause(); } } catch (e) {}
        try { if (plusPlayer) { plusPlayer.stop(); plusPlayer.close && plusPlayer.close(); plusPlayer = null; } } catch (e) {}
        try { if (isApp()) plus.device.setWakelock(false); } catch (e) {}
        try { if (navigator.mediaSession) navigator.mediaSession.metadata = null; } catch (e) {}
        playing = false; waitingTap = false; paint();
    }
    function setMedia() {
        try {
            if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
            const c = (typeof myCharacters !== 'undefined' && myCharacters && myCharacters[0]) || null;
            navigator.mediaSession.metadata = new MediaMetadata({ title: '谷雨在后台陪着你', artist: c ? c.name + ' 有消息会叫你' : '有消息会叫你', album: '谷雨 · 后台保活', artwork: /^https?:/.test(location.protocol) ? [{ src: new URL('icons/icon-192.png', location.href).href, sizes: '192x192', type: 'image/png' }] : [] });
            navigator.mediaSession.setActionHandler && navigator.mediaSession.setActionHandler('pause', () => { setKeep(false); });
        } catch (e) {}
    }
    function armTap() {   // 浏览器不许没点过页面就出声：等你下一次点页面再开始
        if (armTap.on) return; armTap.on = true;
        const go = () => { armTap.on = false; document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); if (keepOn() && !playing) keepStart(); };
        document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true);
    }
    function setKeep(on) {
        if (typeof setAutoFeature === 'function') setAutoFeature(KEEP, !!on, true);
        else { cfg.keep = !!on; save(); }
        on ? keepStart() : keepStop();
        paint();
    }
    window.gyKeepAliveSet = function (on) {
        setKeep(on);
        toast(on ? '🎵 后台保活开了' : '🎵 后台保活关了', on ? pick(['谷雨会一直放一段很轻的声音，手机就不容易把它冻住', '开着的时候会抢别的 App 的音乐，听歌时记得先关', '有点费电，不需要的时候记得关掉']) : '不再放声音了');
    };
    window.gyKeepAliveSound = function (v) { cfg.keepSound = SOUNDS[v] ? v : 'quiet'; save(); if (playing) { keepStop(); setTimeout(keepStart, 50); } else paint(); };
    window.gyKeepAliveState = () => ({ on: keepOn(), playing, waitingTap, sound: cfg.keepSound || 'quiet' });

    // 全部开关里也有一份；从那边开关时这边跟着动
    function regSwitch() {
        try {
            if (typeof AUTO_FEATURE_GROUPS !== 'undefined' && !AUTO_FEATURE_GROUPS.some(g => g.key === '通知'))
                AUTO_FEATURE_GROUPS.push({ key: '通知', icon: '🔔', title: '通知与后台', note: '让手机别把谷雨冻住、关了也能收到 TA 的消息。' });
            if (typeof AUTO_FEATURE_DEFS !== 'undefined' && !AUTO_FEATURE_DEFS.some(f => f.key === KEEP))
                AUTO_FEATURE_DEFS.push({ key: KEEP, label: '后台保活：一直放一段很轻的声音', group: '通知', defaultOff: true, desc: '手机切到后台以后会把网页 / App 冻住，TA 到点了也说不了话。打开后谷雨会循环放一段很轻的声音（可以选「几乎听不到的底噪」或「轻轻的雨声」），手机把它当成在放歌，就不容易冻住。代价：多耗电；会抢别的 App 的音乐（听歌时先关掉）；网页版要你先点一下页面才开始放。', cost: '不调用 API（耗电多一点）', where: '设置 → 通知与云端' });
        } catch (e) {}
        try {
            if (typeof window.setAutoFeature === 'function' && !window.setAutoFeature.__gyKeep) {
                const o = window.setAutoFeature;
                const w = function (key, on, quiet) { const r = o.apply(this, arguments); if (key === KEEP) { on ? keepStart() : keepStop(); } return r; };
                w.__gyKeep = true; window.setAutoFeature = w;
            }
        } catch (e) {}
    }

    /* ---------------- 设置面板（设置 → 通知与云端） ---------------- */
    function ensurePanel() {
        const host = $('setPanel-notify'); if (!host || $('gyPushBox')) return;
        const box = document.createElement('div');
        box.id = 'gyPushBox';
        box.innerHTML = `
<div style="margin-bottom:15px; padding:10px; background:rgba(29,155,240,0.05); border-radius:8px; border:1px solid #1d9bf0;">
  <div style="font-size:15px; font-weight:600; margin-bottom:4px;">📲 谷雨自己的通知（关了也能收到，不用 ntfy）</div>
  <div class="form-hint" style="margin-bottom:8px;">要先配好上面的「☁️ 云端主动消息唤醒」（Worker 地址和密钥）。配好以后 TA 找你，手机直接弹「谷雨」的通知，点一下回到谷雨、跳到 TA 的聊天。ntfy 可以留着也可以不填。</div>
  <div id="gyPushWeb">
    <div class="input-group checkbox-group" style="margin-bottom:4px;"><input type="checkbox" id="gyWebPushOn" onchange="gyWebPushSet(this.checked, this)"><label style="margin:0;">🌐 这台设备接收推送（网页 / 加到主屏幕的谷雨）</label></div>
    <div id="gyWebPushSt" class="form-hint"></div>
  </div>
  <div id="gyPushApp" style="display:none;">
    <div class="input-group checkbox-group" style="margin-bottom:4px;"><input type="checkbox" id="gyUniOn" onchange="gyUniPushSave()"><label style="margin:0;">🤖 安卓 App 通知（uni-push）</label></div>
    <div class="form-hint" style="margin-bottom:6px;">去 DCloud 开发者中心开通 uni-push 1.0，把「消息推送 → 应用配置」里的三样粘过来；打包时要勾上 Push 模块（步骤在使用指南）。</div>
    <div class="input-group"><label>AppID</label><input type="text" id="gyUniAppId" onchange="gyUniPushSave()" placeholder="个推 AppID"></div>
    <div class="input-group"><label>AppKey</label><input type="text" id="gyUniAppKey" onchange="gyUniPushSave()" placeholder="个推 AppKey"></div>
    <div class="input-group"><label>MasterSecret</label><input type="password" id="gyUniSecret" onchange="gyUniPushSave()" placeholder="个推 MasterSecret"></div>
    <div id="gyUniSt" class="form-hint"></div>
  </div>
  <button type="button" class="btn-secondary gy-apitest-main" style="margin-top:6px; padding:8px;" onclick="gyApiTest('push', '', this)">🔌 测试连接（发一条测试通知）</button>
</div>
<div style="margin-bottom:15px; padding:10px; background:rgba(29,155,240,0.05); border-radius:8px; border:1px solid #1d9bf0;">
  <div class="input-group checkbox-group" style="margin-bottom:4px;"><input type="checkbox" id="gyKeepOn" onchange="gyKeepAliveSet(this.checked)"><label style="margin:0; font-size:15px;">🎵 后台保活（一直放一段很轻的声音）</label></div>
  <div class="form-hint" style="margin-bottom:6px;">手机切到后台会把谷雨冻住；放着声音，手机会当它在放歌，就不容易冻住，TA 到点了能照常说话、弹通知。<b>默认关</b>，要不要用你自己定：会多耗一点电；会抢别的 App 的音乐（听歌时先关掉）；网页版要先点一下页面才开始放；手机实在要省电时还是可能被杀掉。</div>
  <div class="input-group"><label>放什么</label><select id="gyKeepSound" onchange="gyKeepAliveSound(this.value)">${Object.keys(SOUNDS).map(k => `<option value="${k}">${SOUNDS[k].n}</option>`).join('')}</select></div>
  <div id="gyKeepSt" class="form-hint"></div>
</div>`;
        host.appendChild(box);
        paint();
    }
    function paint() {
        if (!$('gyPushBox')) return;
        const app = isApp();
        $('gyPushWeb').style.display = app ? 'none' : '';
        $('gyPushApp').style.display = app ? '' : 'none';
        if (!app) {
            $('gyWebPushOn').checked = !!cfg.web;
            const why = webPushWhyNot();
            $('gyWebPushSt').innerHTML = cfg.web && cfg.sub ? `✅ 这台设备（${esc(cfg.sub.label || '')}）已经接上了` : why ? '⚠️ ' + esc(why) : (typeof Notification !== 'undefined' && Notification.permission === 'denied' ? '❌ 通知权限被拒绝了，要去浏览器的网站设置里改成允许' : '还没开');
        } else {
            const g = cfg.getui || {};
            $('gyUniOn').checked = !!g.on;
            if (document.activeElement !== $('gyUniAppId')) $('gyUniAppId').value = g.appId || '';
            if (document.activeElement !== $('gyUniAppKey')) $('gyUniAppKey').value = g.appKey || '';
            if (document.activeElement !== $('gyUniSecret')) $('gyUniSecret').value = g.masterSecret || '';
            const cid = appCid();
            $('gyUniSt').innerHTML = cid ? '这台手机的 cid：<code style="user-select:all">' + esc(cid) + '</code>' : '⚠️ 还没读到这台手机的 cid：打包时没勾 Push 模块，或者 uni-push 还没开通';
        }
        $('gyKeepOn').checked = keepOn();
        $('gyKeepSound').value = SOUNDS[cfg.keepSound] ? cfg.keepSound : 'quiet';
        $('gyKeepSt').textContent = !keepOn() ? '关着' : playing ? '▶ 正在放' + (app ? '（App 里还会让手机别睡死）' : '') : waitingTap ? '⏸ 点一下页面任意地方就开始放' : '准备中…';
    }
    window.gyPushPaint = paint;

    function boot() {
        regSwitch();
        ensurePanel();
        hookAppPush();
        jumpFromUrl();
        if (keepOn()) keepStart();
        try { const o = window.openSettingsPanel; if (typeof o === 'function' && !o.__gyPush) { const w = function (k) { const r = o.apply(this, arguments); if (k === 'notify') { ensurePanel(); paint(); } return r; }; w.__gyPush = true; window.openSettingsPanel = w; } } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    document.addEventListener('plusready', () => { hookAppPush(); paint(); if (keepOn() && !playing) keepStart(); }, false);
})();
