// =====================================================================
//  🔍 搜表情包（300）—— 跟微信那样：在「选表情 / 图片」里打关键词，网上搜到的直接能用、能存进表情库
//  · 入口：聊天输入框旁的 🖼️（还有发帖、回复里选表情的地方，用的是同一个窗口），窗口顶上多一个搜索框。
//  · 打字时先在你自己的表情库里按「含义描述」找；点「搜」/ 回车去网上搜（必应图片搜「关键词 表情包」）。
//  · 点一张 = 这条消息就用它（跟选自己的表情一样），并顺手存进表情库（能关）；右上角 ＋ = 只存不发。
//    存进去的是图片本身（不是链接），以后来源没了也不会坏；含义描述自动填成你搜的词，TA 也就会用它。
//  · 搜索走哪：安卓 App 里手机直接去搜；网页 / 电脑版浏览器不让跨站，走 guyu.pw/api/stk（仓库里的 functions/api/stk.js，只是转一下搜索结果）。
//  · 图片是必应的缩略图（静态图，动图会变成一帧）。
//  · 开关 gyStkSearch（默认开，关掉就没有搜索框，跟以前一样）。纯工具，没有自主行动 / 今天 / 小组件 / 记忆总览。
// =====================================================================
(function () {
    const X = window.GYX;
    const LS = 'gyStkCfg';
    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const toast = (t, d) => { try { if (typeof showToast === 'function') showToast('', t, d || '', null, null, false); } catch (e) {} };
    let cfg = {}; try { cfg = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { cfg = {}; }
    const save = () => { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} };
    const on = () => { try { return !X || !X.on || X.on('gyStkSearch'); } catch (e) { return true; } };
    const autoSave = () => cfg.keep !== false;
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
    const API = 'https://guyu.pw/api/stk';
    const isApp = () => !!(window.plus && plus.net && plus.net.XMLHttpRequest);
    const lib = () => (typeof globalEmoticons !== 'undefined' && Array.isArray(globalEmoticons)) ? globalEmoticons : [];

    /* ---------------- 搜 ---------------- */
    // 把必应图片搜索那一页里的结果抠出来：每张图一个 m="{…}"，里面 turl = 缩略图、murl = 原图、t = 标题
    function parseBing(html) {
        const out = [], seen = {};
        const re = /\bm="(\{[^"]+\})"/g; let m;
        const un = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        while ((m = re.exec(html))) {
            try {
                const j = JSON.parse(un(m[1]));
                if (!j.turl || seen[j.turl]) continue; seen[j.turl] = 1;
                out.push({ t: j.turl, m: j.murl || '', d: String(j.t || '').replace(/[]/g, '').slice(0, 60), k: j.mid || j.md5 || j.turl });
            } catch (e) {}
        }
        return out;
    }
    function bingUrl(q, first) { return 'https://cn.bing.com/images/async?q=' + encodeURIComponent(q) + '&first=' + (first || 0) + '&count=35&mmasync=1'; }
    function viaApp(q, first) {
        return new Promise((res, rej) => {
            try {
                const x = new plus.net.XMLHttpRequest(); x.timeout = 15000;
                x.onreadystatechange = () => { if (x.readyState !== 4) return; if (x.status === 200) { const r = parseBing(x.responseText || ''); r.length ? res(r) : rej(new Error('没搜到')); } else rej(new Error('HTTP ' + x.status)); };
                x.open('GET', bingUrl(q, first));
                try { x.setRequestHeader('User-Agent', UA); x.setRequestHeader('Accept-Language', 'zh-CN,zh;q=0.9'); } catch (e) {}
                x.send();
            } catch (e) { rej(e); }
        });
    }
    function viaApi(q, first) {
        return fetch(API + '?q=' + encodeURIComponent(q) + '&first=' + (first || 0), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(j => { if (!j || !j.ok) throw new Error((j && j.err) || '没搜到'); return j.items || []; });
    }
    // 关键词后面自动带上「表情包」（已经写了「表情」就不重复加）
    const fullQ = q => /表情|梗图|meme|sticker/i.test(q) ? q : q + ' 表情包';
    function search(q, first) {
        const Q = fullQ(q);
        if (isApp()) return viaApp(Q, first).catch(() => viaApi(Q, first));
        return viaApi(Q, first);
    }
    window.gyStkSearchRaw = search; window.__gyStkParse = parseBing;

    /* ---------------- 把图抓成本地的（存的是图片本身，不是链接） ---------------- */
    function toDataUrl(url) {
        return fetch(url, { mode: 'cors', cache: 'force-cache' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }).then(b => new Promise((res, rej) => {
            if (!/^image\//.test(b.type || 'image/jpeg')) return rej(new Error('不是图片'));
            const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = () => rej(new Error('读不出来')); fr.readAsDataURL(b);
        }));
    }
    const saved = {};   // 这次打开里：结果 k → 已经存成的本地地址
    async function grab(it, desc) {
        if (saved[it.k]) return saved[it.k];
        const src = it.src || '';
        const hit = lib().find(e => e && e.gySrc === (it.k || src));
        if (hit) { saved[it.k] = hit.url; return hit.url; }
        const data = await toDataUrl(it.t);
        saved[it.k] = data; it.data = data;
        return data;
    }
    function addToLib(it, data, desc) {
        if (lib().some(e => e && (e.url === data || e.gySrc === it.k))) return false;
        globalEmoticons.push({ id: 'emo_' + Date.now() + Math.floor(Math.random() * 1000), url: data, desc: String(desc || '').slice(0, 30), gySrc: it.k });
        try { if (typeof saveAllData === 'function') saveAllData(); } catch (e) {}
        try { if (typeof renderEmoticonManagerGallery === 'function' && $('emoticonManagerGallery')) renderEmoticonManagerGallery(); } catch (e) {}
        return true;
    }

    /* ---------------- 界面：塞进「选择一个表情 / 图片」那个窗口 ---------------- */
    let Q = '', items = [], first = 0, busy = false, mode = 'mine', err = '';
    function ensureUi() {
        const modal = $('emoticonPickerModal'); if (!modal) return false;
        const gal = $('emoticonPickerGallery'); if (!gal) return false;
        let bar = $('gyStkBar');
        if (!on()) { if (bar) bar.style.display = 'none'; const r = $('gyStkRes'); if (r) r.style.display = 'none'; gal.style.display = ''; return false; }
        if (!bar) {
            bar = document.createElement('div'); bar.id = 'gyStkBar';
            bar.innerHTML = `<style>
#gyStkBar{display:flex;gap:6px;align-items:center;margin-bottom:6px}
#gyStkBar input{flex:1;min-width:0;padding:8px 12px;border-radius:999px;border:1px solid var(--gy-accent,#1d9bf0);outline:none;font-size:14px;background:transparent;color:inherit}
#gyStkBar button{flex:none;padding:8px 14px;border-radius:999px;border:0;background:var(--gy-accent,#1d9bf0);color:#fff;font-size:14px;cursor:pointer}
#gyStkRes{display:none}
#gyStkRes .stk-top{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#536471;margin:2px 0 4px;flex-wrap:wrap}
#gyStkRes .stk-top a{color:var(--gy-accent,#1d9bf0);cursor:pointer}
#gyStkRes .stk-top label{margin-left:auto;display:flex;align-items:center;gap:4px;cursor:pointer}
#gyStkGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;max-height:300px;overflow-y:auto;-webkit-overflow-scrolling:touch}
#gyStkGrid .stk{position:relative;aspect-ratio:1/1;border-radius:8px;overflow:hidden;background:#f2f4f5;cursor:pointer}
#gyStkGrid .stk img{width:100%;height:100%;object-fit:cover;display:block}
#gyStkGrid .stk b{position:absolute;right:3px;top:3px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:15px;line-height:22px;text-align:center;font-weight:400}
#gyStkGrid .stk.ok b{background:#34a853}
#gyStkGrid .stk.ing{opacity:.5}
#gyStkGrid .more{grid-column:1/-1;text-align:center;padding:8px;color:var(--gy-accent,#1d9bf0);cursor:pointer;font-size:13px}
#gyStkMsg{font-size:13px;color:#536471;padding:14px 4px;text-align:center}
</style><input id="gyStkQ" type="search" enterkeyhint="search" placeholder="搜表情包：开心、无语、猫猫…" autocomplete="off"><button type="button" id="gyStkGo">搜</button>`;
            gal.parentNode.insertBefore(bar, gal);
            const res = document.createElement('div'); res.id = 'gyStkRes';
            res.innerHTML = `<div class="stk-top"><a id="gyStkBack">‹ 我的表情</a><span id="gyStkHint"></span><label><input type="checkbox" id="gyStkKeep"> 用过的存进表情库</label></div><div id="gyStkMsg"></div><div id="gyStkGrid"></div>`;
            gal.parentNode.insertBefore(res, gal.nextSibling);
            const q = $('gyStkQ');
            q.addEventListener('input', () => { localFilter(q.value.trim()); });
            q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
            q.addEventListener('search', () => { if (q.value.trim()) go(); });
            $('gyStkGo').onclick = go;
            $('gyStkBack').onclick = () => { showMine(); };
            $('gyStkKeep').onchange = e => { cfg.keep = !!e.target.checked; save(); };
            $('gyStkGrid').addEventListener('click', onGrid);
        }
        bar.style.display = '';
        $('gyStkKeep').checked = autoSave();
        return true;
    }
    function showMine() {
        mode = 'mine';
        const gal = $('emoticonPickerGallery'), res = $('gyStkRes');
        if (res) res.style.display = 'none'; if (gal) gal.style.display = '';
        const q = $('gyStkQ'); if (q) localFilter(q.value.trim());
    }
    // 打字时：先在自己的表情库里按含义描述找
    function localFilter(k) {
        if (mode !== 'mine') return;
        const gal = $('emoticonPickerGallery'); if (!gal) return;
        const cells = gal.querySelectorAll('.emo-item'); let n = 0;
        const L = lib();
        cells.forEach((c, i) => { const d = String((L[i] && L[i].desc) || ''); const hit = !k || d.toLowerCase().indexOf(k.toLowerCase()) >= 0; c.style.display = hit ? '' : 'none'; if (hit) n++; });
        let tip = $('gyStkLocalTip');
        if (!tip) { tip = document.createElement('div'); tip.id = 'gyStkLocalTip'; tip.style.cssText = 'font-size:12.5px;color:#536471;margin:2px 0 0;'; gal.parentNode.insertBefore(tip, gal); }
        tip.textContent = k ? (n ? '你的表情库里有 ' + n + ' 张对得上；点「搜」去网上找更多' : '你的表情库里没有「' + k + '」，点「搜」去网上找') : '';
    }
    function paint() {
        const res = $('gyStkRes'); if (!res) return;
        $('gyStkHint').textContent = Q ? '「' + Q + '」' + (items.length ? ' · 点图就用，右上 ＋ 只存不发' : '') : '';
        const msg = $('gyStkMsg');
        msg.style.display = (busy && !items.length) || err || (!busy && !items.length) ? '' : 'none';
        msg.textContent = busy && !items.length ? pick(['正在搜…', '去网上翻翻…', '找表情包中…']) : err ? err : (!items.length ? '没搜到，换个词试试' : '');
        $('gyStkGrid').innerHTML = items.map((it, i) => `<div class="stk${saved[it.k] && it.inLib ? ' ok' : ''}" data-i="${i}" title="${esc(it.d)}"><img loading="lazy" src="${esc(it.t)}" alt=""><b data-add="1">${it.inLib ? '✓' : '＋'}</b></div>`).join('')
            + (items.length ? `<div class="more" data-more="1">${busy ? '正在加载…' : '再来一些'}</div>` : '');
    }
    async function go(more) {
        const q = $('gyStkQ'); const k = (q && q.value || '').trim();
        if (!k) { toast('🔍 先打个关键词', pick(['比如：开心、无语、猫猫、摸鱼', '想找什么样的表情包？打两个字'])); return; }
        if (busy) return;
        if (more !== true) { Q = k; items = []; first = 0; }
        mode = 'web'; err = ''; busy = true;
        $('emoticonPickerGallery').style.display = 'none'; const tip = $('gyStkLocalTip'); if (tip) tip.textContent = '';
        $('gyStkRes').style.display = 'block'; paint();
        try {
            const got = await search(Q, first);
            const have = {}; items.forEach(x => { have[x.k] = 1; });
            got.forEach(x => { if (!have[x.k]) { x.inLib = lib().some(e => e && e.gySrc === x.k); items.push(x); } });
            first += 35;
            if (!items.length) err = '没搜到「' + Q + '」，换个词试试';
        } catch (e) {
            err = pick(['没搜成：', '这次没连上：']) + ((e && e.message) || '网络不通') + '。' + (isApp() ? '看看手机能不能上网，再点一次「搜」' : '过一会儿再点一次「搜」');
        }
        busy = false; paint();
    }
    async function onGrid(ev) {
        const more = ev.target.closest('[data-more]'); if (more) { go(true); return; }
        const cell = ev.target.closest('.stk'); if (!cell) return;
        const it = items[+cell.dataset.i]; if (!it || cell.classList.contains('ing')) return;
        const onlyAdd = !!ev.target.closest('[data-add]');
        cell.classList.add('ing');
        try {
            const data = await grab(it, Q);
            if (onlyAdd || autoSave()) { const added = addToLib(it, data, Q); it.inLib = true; if (onlyAdd) toast(added ? '🖼️ 存进表情库了' : '🖼️ 表情库里已经有这张了', added ? pick(['含义写的是「' + Q + '」，TA 以后也会用它', '在「表情」库里能改它的含义描述']) : ''); }
            cell.classList.remove('ing');
            if (onlyAdd) { cell.classList.add('ok'); const b = cell.querySelector('b'); if (b) b.textContent = '✓'; return; }
            if (typeof selectEmoticon === 'function') selectEmoticon(data);
        } catch (e) {
            cell.classList.remove('ing');
            toast('🖼️ 这张没拿下来', pick(['图片那头不给下，换一张试试', '这张打不开，点别的']));
        }
    }
    window.gyStkGo = go;
    window.gyStkState = () => ({ on: on(), mode, q: Q, n: items.length, busy, err, keep: autoSave() });

    /* ---------------- 接上 ---------------- */
    function hook() {
        try {
            if (typeof openEmoticonPicker !== 'function' || openEmoticonPicker.__gyStk) return;
            const o = openEmoticonPicker;
            const w = function () { const r = o.apply(this, arguments); try { if (ensureUi()) { const q = $('gyStkQ'); if (q) q.value = ''; showMine(); } } catch (e) {} return r; };
            w.__gyStk = true; openEmoticonPicker = w;
        } catch (e) {}
    }
    function boot() {
        try { if (X && X.feat) X.feat('gyStkSearch', { n: '🔍 聊天里搜表情包', desc: '选表情 / 图片的窗口顶上多一个搜索框：打关键词先在你自己的表情库里找，点「搜」去网上找；点图就用，还能存进表情库（含义自动填成你搜的词）。关掉就跟以前一样只有自己的表情库' }); } catch (e) {}
        hook();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    setTimeout(hook, 1500);
})();
