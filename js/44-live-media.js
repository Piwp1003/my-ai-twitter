/* ============================================================
   js/44 —— 动图和视频（让头像/背景/表情包/配图动起来）
   ------------------------------------------------------------
   开关：设置 → 外观 →「🎞️ 动图和视频」，**默认开**。
   关掉之后立刻退回原样：GIF 还是被压成静止图，视频不让传。

   能动的地方：凡是走「上传图片」那条路的，全都能——
   角色头像、我的头像、群头像、资料页背景图、主页大图、全局背景图、
   表情包、聊天里发的图、帖子配图、故事工坊插图……
   因为这里没有一处一处去改，而是把**两个总入口**包了一层：
     · handleImageCrop()  —— 头像/背景那一路（原来会打开裁剪弹窗）
     · fileToBase64()     —— 表情包/配图那一路（原来会压成 jpeg）
   传的是 GIF 或视频就绕开裁剪/压缩，原样存下来；别的照旧。

   存法（你选的那种）：视频/动图**单独存一个库**（IndexedDB 里的 guyuLiveMedia），
   存档里只留一个 `gylive:<编号>` 的短字符串。所以：
     · 存档不会被撑大，每次保存也不会因为一个 20MB 的视频变慢
     · 导出存档时会自动把用到的媒体一起打包进 json，换设备/恢复不会丢
   视频一律**循环播放、静音、不显示控件**（浏览器只允许静音视频自动播放；
   想要声音可以在设置里打开，但多数浏览器会拒绝自动播，得点一下才响）。

   显示原理：页面里看到 `gylive:xxx` 就现场换掉——
     · GIF：直接换成本地地址，原生就会动
     · 视频：先垫上**第一帧**（上传时抓的封面），再在上面盖一个 <video> 铺满
   所以就算这个模块没跑起来，你看到的也是一张静止的封面图，不会变成裂图。
   ============================================================ */
(function () {
    'use strict';

    const LSK = 'gy_live_media_cfg';
    const S = { on: true, sound: false, maxMB: 30 };
    try { Object.assign(S, JSON.parse(localStorage.getItem(LSK) || '{}') || {}); } catch (e) {}
    const saveCfg = () => { try { localStorage.setItem(LSK, JSON.stringify(S)); } catch (e) {} };

    const store = (typeof localforage !== 'undefined' && localforage.createInstance)
        ? localforage.createInstance({ name: 'guyuLiveMedia', storeName: 'media' }) : null;

    // 编号 → { mime, url(本地地址), poster(第一帧), bytes }
    const MAP = Object.create(null);
    const TOKRE = /gylive:([A-Za-z0-9]+)/;
    const isVideo = mime => /^video\//.test(String(mime || ''));
    const isLiveFile = f => !!f && (/^video\//.test(f.type || '') || /^image\/gif$/i.test(f.type || ''));

    // ⚠️ showToast 的签名是 (头像, 标题, 正文, …)——只传一个参数弹出来会是"undefined"
    const toast = m => { try { if (typeof showToast === 'function') showToast('', '🎞️ 动图视频', m, null, null, false); else console.info(m); } catch (e) {} };
    const alertBox = m => { try { if (typeof appAlert === 'function') appAlert(m); else alert(m); } catch (e) {} };

    /* ---------- 抓视频第一帧当封面 ---------- */
    function firstFrame(file) {
        return new Promise(resolve => {
            let url = '';
            try { url = URL.createObjectURL(file); } catch (e) { resolve(''); return; }
            const v = document.createElement('video');
            v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = url;
            const done = (r) => { try { URL.revokeObjectURL(url); } catch (e) {} resolve(r); };
            const grab = () => {
                try {
                    const w = Math.min(480, v.videoWidth || 480);
                    const h = Math.round((v.videoHeight || 270) * (w / (v.videoWidth || 480)));
                    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
                    cv.getContext('2d').drawImage(v, 0, 0, w, h);
                    done(cv.toDataURL('image/jpeg', 0.7));
                } catch (e) { done(''); }
            };
            v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, (v.duration || 1) / 10); } catch (e) { grab(); } };
            v.onseeked = grab;
            v.onerror = () => done('');
            setTimeout(() => done(''), 8000);       // 再慢也不能一直挂着
        });
    }

    /* ---------- 存一份，拿回一个短字符串 ---------- */
    async function put(file) {
        if (!store) { alertBox('这个浏览器不支持本地媒体库，动图/视频存不下。'); return null; }
        if (file.size > S.maxMB * 1024 * 1024)
            throw new Error('这个文件 ' + (file.size / 1048576).toFixed(1) + 'MB，超过了上限 ' + S.maxMB + 'MB。可以在 设置 → 外观 →「🎞️ 动图和视频」里把上限调大，或者先压一下。');
        const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const poster = isVideo(file.type) ? await firstFrame(file) : '';
        await store.setItem(id, { mime: file.type, blob: file, poster, bytes: file.size, at: Date.now() });
        MAP[id] = { mime: file.type, url: URL.createObjectURL(file), poster, bytes: file.size };
        return 'gylive:' + id;
    }
    window.gyLivePut = put;

    /* ---------- 把 gylive: 换成真东西 ---------- */
    function mkVideo(rec) {
        const v = document.createElement('video');
        v.className = 'gylive-v';
        v.src = rec.url; v.loop = true; v.autoplay = true; v.controls = false;
        v.muted = !S.sound; v.playsInline = true;
        v.setAttribute('playsinline', ''); v.setAttribute('loop', '');
        if (!S.sound) v.setAttribute('muted', '');
        return v;
    }
    // ⚠️ play() 必须**挂进页面之后**再叫，脱离文档的 <video> 调 play 会被直接拒掉——
    //    这就是之前"视频盖上了但一直不动"的原因。
    const kickPlay = v => { try { const r = v.play(); if (r && r.catch) r.catch(() => {}); } catch (e) {} };
    // 带声音时浏览器多半不让自动播，用户第一次点页面的时候补一次
    let unlocked = false;
    function unlock() {
        if (unlocked) return; unlocked = true;
        document.querySelectorAll('.gylive-v').forEach(kickPlay);
    }
    try { ['pointerdown', 'keydown', 'touchstart'].forEach(e => document.addEventListener(e, unlock, { once: true, passive: true })); } catch (e) {}
    function mountVideo(host, id) {
        const rec = MAP[id]; if (!rec) return;
        const old = host.querySelector(':scope > .gylive-v');
        if (old) { if (old.dataset.gyid === id) return; old.remove(); }
        try {
            const cs = getComputedStyle(host);
            if (cs.position === 'static') host.style.position = 'relative';
            if (cs.overflow === 'visible') host.style.overflow = 'hidden';
        } catch (e) {}
        const v = mkVideo(rec); v.dataset.gyid = id;
        host.appendChild(v);
        kickPlay(v);
        unlocked = false;   // 新盖上的这颗要是被拦了，下次点页面再补一次
        try { ['pointerdown', 'keydown', 'touchstart'].forEach(e => document.addEventListener(e, unlock, { once: true, passive: true })); } catch (e) {}
    }
    function fixBg(el) {
        const st = el.getAttribute('style') || '';
        const m = st.match(TOKRE); if (!m) return;
        const id = m[1], rec = MAP[id];
        // 媒体已经被清掉了：把地址抹掉，免得每次扫描都撞上它
        if (!rec) { el.setAttribute('style', st.replace('gylive:' + id, '')); return; }
        if (isVideo(rec.mime)) {
            el.setAttribute('style', st.replace('gylive:' + id, rec.poster || ''));
            mountVideo(el, id);
        } else {
            el.setAttribute('style', st.replace('gylive:' + id, rec.url));
        }
    }
    function fixImg(img) {
        const m = String(img.getAttribute('src') || '').match(TOKRE); if (!m) return;
        const id = m[1], rec = MAP[id];
        if (!rec) { img.removeAttribute('src'); return; }
        if (!isVideo(rec.mime)) { img.src = rec.url; return; }
        img.src = rec.poster || '';
        // 视频盖在原来那张 img 上：包一层壳，img 留着（别的代码还会读它）
        let wrap = img.parentNode;
        if (!wrap || !wrap.classList || !wrap.classList.contains('gylive-wrap')) {
            wrap = document.createElement('span');
            wrap.className = 'gylive-wrap';
            img.parentNode.insertBefore(wrap, img);
            wrap.appendChild(img);
        }
        mountVideo(wrap, id);
    }
    function sweep() {
        if (!S.on) return;
        try {
            document.querySelectorAll('[style*="gylive:"]').forEach(fixBg);
            document.querySelectorAll('img[src*="gylive:"]').forEach(fixImg);
        } catch (e) {}
    }
    window.gyLiveSweep = sweep;

    let t = null;
    const kick = () => { if (t) return; t = setTimeout(() => { t = null; sweep(); }, 120); };

    /* ---------- 文件选择框也得放行视频 ---------- */
    const ACCEPT = 'image/*,image/gif,video/mp4,video/webm,video/quicktime';
    function widenInputs() {
        try {
            document.querySelectorAll('input[type="file"][accept]').forEach(i => {
                const a = i.getAttribute('accept') || '';
                if (!/^image\//.test(a)) return;
                if (S.on) { if (a !== ACCEPT) { i.dataset.gyAccept0 = i.dataset.gyAccept0 || a; i.setAttribute('accept', ACCEPT); } }
                else if (i.dataset.gyAccept0) i.setAttribute('accept', i.dataset.gyAccept0);
            });
        } catch (e) {}
    }

    /* ---------- 两个总入口包一层 ---------- */
    const crop0 = window.handleImageCrop;
    if (crop0 && crop0.call && !crop0.__gyLive) {
        window.handleImageCrop = function (file, aspect, callback) {
            if (S.on && isLiveFile(file)) {
                put(file).then(tok => {
                    if (!tok) return;
                    try { callback(tok); } catch (e) { console.error('[动图视频] 回调出错', e); }
                    kick();
                    toast(/^video\//.test(file.type) ? '视频设好了，循环播放中' : '动图设好了');
                }).catch(err => alertBox(String(err && err.message || err)));
                return;
            }
            return crop0.apply(this, arguments);
        };
        window.handleImageCrop.__gyLive = true;
    }
    const f2b0 = window.fileToBase64;
    if (f2b0 && f2b0.call && !f2b0.__gyLive) {
        window.fileToBase64 = function (file) {
            if (S.on && isLiveFile(file)) {
                return put(file).then(tok => { kick(); return tok; })
                    .catch(err => { alertBox(String(err && err.message || err)); return null; });
            }
            return f2b0.apply(this, arguments);
        };
        window.fileToBase64.__gyLive = true;
    }

    /* ---------- 导出存档时把用到的媒体一起打包 ---------- */
    const blobToB64 = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(null); fr.readAsDataURL(b); });
    const ex0 = window.exportData;
    if (ex0 && ex0.call && !ex0.__gyLive) {
        window.exportData = async function () {
            if (!store) return ex0.apply(this, arguments);
            try {
                const data = getFullDataSnapshot();
                const used = new Set();
                (JSON.stringify(data).match(/gylive:[A-Za-z0-9]+/g) || []).forEach(x => used.add(x.slice(7)));
                const pack = {};
                for (const id of used) {
                    const rec = await store.getItem(id);
                    if (rec && rec.blob) pack[id] = { mime: rec.mime, poster: rec.poster || '', b64: await blobToB64(rec.blob) };
                }
                if (Object.keys(pack).length) data.__gyLiveMedia = pack;
                saveTextFileForApp('twitter_ai_backup.json', JSON.stringify(data, null, 2), 'application/json');
                if (Object.keys(pack).length) toast('存档里带上了 ' + Object.keys(pack).length + ' 个动图/视频');
                return;
            } catch (e) { console.error('[动图视频] 打包失败，退回普通导出', e); }
            return ex0.apply(this, arguments);
        };
        window.exportData.__gyLive = true;
    }
    // 恢复存档之后：把随存档带过来的媒体收进本地库
    async function absorb() {
        if (!store || typeof localforage === 'undefined') return;
        let rec = null;
        try { rec = await localforage.getItem('myTwitterAppData'); } catch (e) { return; }
        if (!rec || !rec.__gyLiveMedia) return;
        const pack = rec.__gyLiveMedia; let n = 0;
        for (const id of Object.keys(pack)) {
            try {
                if (MAP[id]) continue;
                const blob = await (await fetch(pack[id].b64)).blob();
                await store.setItem(id, { mime: pack[id].mime, blob, poster: pack[id].poster || '', bytes: blob.size, at: Date.now() });
                MAP[id] = { mime: pack[id].mime, url: URL.createObjectURL(blob), poster: pack[id].poster || '', bytes: blob.size };
                n++;
            } catch (e) {}
        }
        try { delete rec.__gyLiveMedia; await localforage.setItem('myTwitterAppData', rec); } catch (e) {}
        if (n) { toast('从存档里恢复了 ' + n + ' 个动图/视频'); kick(); }
    }
    const load0 = window.loadAllData;
    if (load0 && load0.call && !load0.__gyLive) {
        window.loadAllData = async function () {
            const r = await load0.apply(this, arguments);
            try { await absorb(); } catch (e) {}
            kick();
            return r;
        };
        window.loadAllData.__gyLive = true;
    }

    /* ---------- 设置里那一块 ---------- */
    window.gyLiveSet = function (k, v) {
        S[k] = v; saveCfg();
        if (k === 'on') {
            widenInputs();
            if (!v) { document.querySelectorAll('.gylive-v').forEach(x => x.remove()); }
            else kick();
        }
        if (k === 'sound') document.querySelectorAll('.gylive-v').forEach(x => { x.muted = !v; });
        gyLiveStatus();
    };
    window.gyLiveRead = () => ({ on: S.on, sound: S.sound, maxMB: S.maxMB });

    window.gyLiveStatus = async function () {
        const el = document.getElementById('gyLiveStat'); if (!el || !store) return;
        let n = 0, bytes = 0;
        try { await store.iterate(v => { n++; bytes += (v && v.bytes) || 0; }); } catch (e) {}
        el.innerText = n ? ('本地媒体库：' + n + ' 个，占 ' + (bytes / 1048576).toFixed(1) + ' MB') : '本地媒体库：还是空的';
    };
    // 清掉没人用的：把整份存档搜一遍，没被引用的就删
    window.gyLiveClean = async function () {
        if (!store) return;
        let used = new Set();
        try { (JSON.stringify(getFullDataSnapshot()).match(/gylive:[A-Za-z0-9]+/g) || []).forEach(x => used.add(x.slice(7))); } catch (e) {}
        const dead = [];
        try { await store.iterate((v, k) => { if (!used.has(k)) dead.push(k); }); } catch (e) {}
        for (const k of dead) { try { await store.removeItem(k); } catch (e) {} delete MAP[k]; }
        toast(dead.length ? ('清掉了 ' + dead.length + ' 个没在用的' ) : '没有可清的，全都在用');
        gyLiveStatus();
    };

    /* ---------- 样式 ---------- */
    try {
        const st = document.createElement('style');
        st.id = 'gyLiveCss';
        st.textContent =
            '.gylive-v{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' +
            'border-radius:inherit;pointer-events:none;z-index:0;display:block;background:transparent;}' +
            '.gylive-wrap{position:relative;display:inline-block;line-height:0;max-width:100%;}' +
            '.gylive-wrap>img{display:block;max-width:100%;}';
        document.head.appendChild(st);
    } catch (e) {}

    // 设置页里那三个控件回填（刷新之后也得是你上次选的样子）
    function fillUI() {
        try {
            const a = document.getElementById('gyLiveOn'); if (a) a.checked = !!S.on;
            const b = document.getElementById('gyLiveSound'); if (b) b.checked = !!S.sound;
            const c = document.getElementById('gyLiveMaxMB'); if (c) c.value = S.maxMB;
        } catch (e) {}
        gyLiveStatus();
    }
    const op0 = window.openSettingsPanel;
    if (op0 && op0.call && !op0.__gyLive) {
        window.openSettingsPanel = function (k) {
            const r = op0.apply(this, arguments);
            if (k === 'appearance') setTimeout(fillUI, 60);
            return r;
        };
        window.openSettingsPanel.__gyLive = true;
    }

    /* ---------- 起飞 ---------- */
    async function boot() {
        if (store) {
            try {
                await store.iterate((v, k) => {
                    try { MAP[k] = { mime: v.mime, url: URL.createObjectURL(v.blob), poster: v.poster || '', bytes: v.bytes || 0 }; } catch (e) {}
                });
            } catch (e) {}
        }
        widenInputs();
        fillUI();
        sweep();
        try {
            new MutationObserver(kick).observe(document.body,
                { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'src'] });
        } catch (e) {}
        gyLiveStatus();
    }
    if (document.readyState === 'complete') setTimeout(boot, 900);
    else window.addEventListener('load', () => setTimeout(boot, 900));

    console.info('[动图视频] 已加载。开关：设置 → 外观 →「🎞️ 动图和视频」（默认开）');
})();
