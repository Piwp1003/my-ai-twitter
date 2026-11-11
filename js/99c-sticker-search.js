// =====================================================================
//  🔍 搜表情包（300）—— 跟微信那样：在「选表情 / 图片」里打关键词，网上搜到的直接能用、能存进表情库
//  · 入口：聊天输入框旁的 🖼️（还有发帖、回复里选表情的地方，用的是同一个窗口），窗口顶上多一个搜索框。
//  · 打字时先在你自己的表情库里按「含义描述」找；点「搜」/ 回车去网上搜（301 起用 360 图片，有动图；能切「只看动图」）。
//  · 点一张 = 这条消息就用它（跟选自己的表情一样），并顺手存进表情库（能关）；右上角 ＋ = 只存不发。
//    存进去的是图片本身（不是链接），以后来源没了也不会坏；含义描述自动填成你搜的词，TA 也就会用它。
//  · 搜索走哪：安卓 App 里手机直接去搜；网页 / 电脑版浏览器不让跨站，走 guyu.pw/api/stk（仓库里的 functions/api/stk.js，只是转一下搜索结果）。
//  · 存的是 360 的缩略图：动图存 240 像素那张（还会动），静态图存大一点的。没搜成会把每条路为什么不行写出来。
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

    /* ---------------- 搜（301：换成 360 图片，有动图；几条路挨个试，哪条为什么不行都记下来） ----------------
       来源：image.so.com/j（360 图片搜索的结果接口）。它的缩略图在 qhimgs1.com：动图还是会动的，允许跨域读，只是不能带着别的网站的来路（所以取图时不带来路）。
       三条路：
       · 手机直连（安卓 App）：plus.net 直接问 360，带电脑浏览器的身份和 360 自己的来路。
       · guyu.pw 转一下：guyu.pw/api/stk 替你去问（360 不行它再试必应）。
       · 网页直连：用 <script> 的方式直接问 360（网页版最后的退路）。
       每条路失败的原因记在 why 里，全不行时原样告诉你。 */
    function mapSo(j) {
        const L = (j && j.list) || []; const out = [];
        for (const x of L) {
            const th = x.thumb || x.thumb_bak || ''; if (!/^https:\/\//.test(th)) continue;
            const sm = x._thumb || x._thumb_bak || th;
            out.push({ t: sm, f: th, gif: /\.gif(\?|$)/i.test(th), d: String(x.title || '').replace(/<[^>]+>/g, '').slice(0, 60), k: 'so:' + (x.id || x.imgkey || th) });
        }
        return out;
    }
    const soUrl = (q, first, cb) => 'https://image.so.com/j?q=' + encodeURIComponent(q) + '&src=srp&pn=60&sn=' + (first || 0) + (cb ? '&callback=' + cb : '');
    function viaApp(q, first) {
        return new Promise((res, rej) => {
            try {
                const x = new plus.net.XMLHttpRequest(); x.timeout = 12000;
                x.onreadystatechange = () => {
                    if (x.readyState !== 4) return;
                    if (x.status !== 200) return rej(new Error(x.status ? '360 回了 ' + x.status : '连不上 360（手机没网，或者被拦了）'));
                    let j = null; try { j = JSON.parse(x.responseText || ''); } catch (e) {}
                    if (!j) return rej(new Error(/异常|ANTISPIDER/i.test(x.responseText || '') ? '360 把这次当成机器人拦了' : '360 回来的不是结果'));
                    const r = mapSo(j); r.length ? res(r) : rej(new Error('NONE'));
                };
                x.ontimeout = () => rej(new Error('等了 12 秒 360 没回话'));
                x.open('GET', soUrl(q, first));
                try { x.setRequestHeader('User-Agent', UA); x.setRequestHeader('Referer', 'https://image.so.com/'); x.setRequestHeader('Accept-Language', 'zh-CN,zh;q=0.9'); } catch (e) {}
                x.send();
            } catch (e) { rej(new Error('手机这边发不出请求：' + ((e && e.message) || e))); }
        });
    }
    function viaApi(q, first) {
        return fetch(API + '?q=' + encodeURIComponent(q) + '&first=' + (first || 0), { cache: 'no-store' })
            .then(r => r.json().catch(() => { throw new Error('guyu.pw 回了 ' + r.status + '，不是结果'); }), e => { throw new Error('连不上 guyu.pw（' + ((e && e.message) || '网络不通') + '）'); })
            .then(j => { if (!j || !j.ok) throw new Error(j && j.none ? 'NONE' : 'guyu.pw 去搜了但没成：' + ((j && j.err) || '没说原因')); return (j.items || []).map(x => Object.assign({ f: x.t }, x)); });
    }
    // 网页直连：用 <script> 的方式问 360（最后的退路，只有前面的路都不通才走）。放在一个看不见的小框（iframe）里跑，
    // 被拦时回来的出错页就不会被当成「谷雨页面报错」。360 要看「从哪个网站来的」才给结果，所以小框得算作谷雨自己的页面
    // （allow-same-origin）；本地文件打开的谷雨（电脑版 exe）没有这个来路，这条路走不通，只能靠 guyu.pw 转。
    let jpN = 0;
    function viaJsonp(q, first) {
        return new Promise((res, rej) => {
            const id = 'j' + (++jpN) + Date.now().toString(36); let done = false;
            const f = document.createElement('iframe');
            f.setAttribute('sandbox', 'allow-scripts allow-same-origin'); f.setAttribute('referrerpolicy', 'origin'); f.style.cssText = 'display:none;width:0;height:0;border:0;';
            const fin = (fn, v) => { if (done) return; done = true; window.removeEventListener('message', onMsg); clearTimeout(tm); try { f.remove(); } catch (e) {} fn(v); };
            const onMsg = ev => {
                const d = ev.data; if (!d || d.gyStk !== id || ev.source !== f.contentWindow) return;
                if (d.j) { const r = mapSo(d.j); return r.length ? fin(res, r) : fin(rej, new Error('NONE')); }
                fin(rej, new Error(d.net ? '连不上 360（网络不通，或者被浏览器拦了）' : '360 把这次当成机器人拦了'));
            };
            const tm = setTimeout(() => fin(rej, new Error('等了 10 秒 360 没回话')), 10000);
            window.addEventListener('message', onMsg);
            const P = "parent.postMessage({gyStk:'" + id + "',";
            f.srcdoc = '<!doctype html><meta charset="utf-8"><script>window.cb=function(j){' + P + 'j:j},"*")};window.onerror=function(){' + P + 'blocked:1},"*");return true};<\/script>'
                + '<script src="' + soUrl(q, first, 'cb').replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" onerror="' + P.replace(/"/g, '&quot;') + 'net:1},&quot;*&quot;)" onload="setTimeout(function(){' + P.replace(/"/g, '&quot;') + 'blocked:1},&quot;*&quot;)},80)"><\/script>';
            document.body.appendChild(f);
        });
    }
    // 关键词后面自动带上「表情包」（已经写了「表情」就不重复加）；只要动图再带上「动图」
    const fullQ = (q, gif) => (/表情|梗图|meme|sticker/i.test(q) ? q : q + '表情包') + (gif && !/动图|gif/i.test(q) ? ' 动图' : '');
    let why = [];   // 最近一次搜索每条路的结果：[{ way, ok, msg }]
    async function search(q, first, gif) {
        const Q = fullQ(q, gif);
        const ways = isApp() ? [['手机直连 360', viaApp], ['guyu.pw 转', viaApi], ['直接问 360', viaJsonp]] : [['guyu.pw 转', viaApi], ['直接问 360', viaJsonp]];
        why = []; let none = false;
        for (const [name, fn] of ways) {
            try { const r = await fn(Q, first); why.push({ way: name, ok: true, msg: r.length + ' 张' }); return gif ? r.filter(x => x.gif) : r; }
            catch (e) { const m = (e && e.message) || String(e); if (m === 'NONE') { none = true; why.push({ way: name, ok: false, msg: '通了，但这个词没有结果' }); break; } why.push({ way: name, ok: false, msg: m }); }
        }
        const err = new Error(none ? 'NONE' : 'FAIL'); err.why = why.slice(); throw err;
    }
    window.gyStkSearchRaw = search; window.gyStkWhy = () => why.slice(); window.__gyStkMap = mapSo;

    /* ---------------- 把图抓成本地的（存的是图片本身，不是链接） ---------------- */
    function toDataUrl(url) {
        return fetch(url, { mode: 'cors', cache: 'force-cache', referrerPolicy: 'no-referrer' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }).then(b => new Promise((res, rej) => {
            if (!/^image\//.test(b.type || 'image/jpeg')) return rej(new Error('不是图片'));
            const fr = new FileReader(); fr.onload = () => res({ data: String(fr.result), size: b.size }); fr.onerror = () => rej(new Error('读不出来')); fr.readAsDataURL(b);
        }));
    }
    // 动图存 240 那张（还会动，几十 KB）；静态图先拿大的，超过 400KB 就用小的
    async function fetchBest(it) {
        if (it.gif || !it.f || it.f === it.t) return (await toDataUrl(it.t)).data;
        try { const r = await toDataUrl(it.f); if (r.size <= 400 * 1024) return r.data; } catch (e) {}
        return (await toDataUrl(it.t)).data;
    }
    const saved = {};   // 这次打开里：结果 k → 已经存成的本地地址
    async function grab(it, desc) {
        if (saved[it.k]) return saved[it.k];
        const src = it.src || '';
        const hit = lib().find(e => e && e.gySrc === (it.k || src));
        if (hit) { saved[it.k] = hit.url; return hit.url; }
        const data = await fetchBest(it);
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
    let Q = '', items = [], first = 0, busy = false, mode = 'mine', err = '', gifOnly = false, errWhy = [];
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
#gyStkMsg .why{margin-top:8px;text-align:left;font-size:12.5px;line-height:1.7;background:rgba(0,0,0,.04);border-radius:8px;padding:8px 10px}
#gyStkMsg .why b{font-weight:600}
#gyStkGrid .stk i{position:absolute;left:3px;bottom:3px;padding:0 5px;border-radius:4px;background:rgba(0,0,0,.6);color:#fff;font-size:10px;font-style:normal;line-height:16px}
#gyStkRes .seg{display:inline-flex;border:1px solid var(--gy-accent,#1d9bf0);border-radius:999px;overflow:hidden}
#gyStkRes .seg span{padding:2px 10px;cursor:pointer;color:var(--gy-accent,#1d9bf0)}
#gyStkRes .seg span.on{background:var(--gy-accent,#1d9bf0);color:#fff}
</style><input id="gyStkQ" type="search" enterkeyhint="search" placeholder="搜表情包：开心、无语、猫猫…" autocomplete="off"><button type="button" id="gyStkGo">搜</button>`;
            gal.parentNode.insertBefore(bar, gal);
            const res = document.createElement('div'); res.id = 'gyStkRes';
            res.innerHTML = `<div class="stk-top"><a id="gyStkBack">‹ 我的表情</a><span class="seg" id="gyStkSeg"><span data-g="0">全部</span><span data-g="1">只看动图</span></span><span id="gyStkHint"></span><label><input type="checkbox" id="gyStkKeep"> 用过的存进表情库</label></div><div id="gyStkMsg"></div><div id="gyStkGrid"></div>`;
            gal.parentNode.insertBefore(res, gal.nextSibling);
            const q = $('gyStkQ');
            q.addEventListener('input', () => { localFilter(q.value.trim()); });
            q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
            q.addEventListener('search', () => { if (q.value.trim()) go(); });
            $('gyStkGo').onclick = go;
            $('gyStkBack').onclick = () => { showMine(); };
            $('gyStkKeep').onchange = e => { cfg.keep = !!e.target.checked; save(); };
            $('gyStkGrid').addEventListener('click', onGrid);
            $('gyStkSeg').addEventListener('click', e => { const g = e.target.closest('[data-g]'); if (!g) return; const v = g.dataset.g === '1'; if (v === gifOnly) return; gifOnly = v; cfg.gif = v; save(); if (Q) { $('gyStkQ').value = Q; go(); } else paint(); });
        }
        bar.style.display = '';
        $('gyStkKeep').checked = autoSave();
        gifOnly = !!cfg.gif;
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
    function whyHtml() {
        if (!errWhy.length) return '';
        return '<div class="why"><b>为什么没搜成</b>（挨个试过这几条路）<br>' + errWhy.map(w => (w.ok ? '✅ ' : '❌ ') + esc(w.way) + '：' + esc(w.msg)).join('<br>')
            + '<br><b>怎么办</b>：' + esc(/没网|连不上|网络不通|没回话/.test(errWhy.map(w => w.msg).join(' ')) ? '多半是网的问题：看看手机 / 电脑现在能不能上网，过一会儿再点一次「搜」' : '是搜索那边不给结果：过几分钟再试；一直这样就把上面这几行发给 Claude') + '</div>';
    }
    function paint() {
        const res = $('gyStkRes'); if (!res) return;
        res.querySelectorAll('#gyStkSeg span').forEach(sp => sp.classList.toggle('on', (sp.dataset.g === '1') === gifOnly));
        $('gyStkHint').textContent = Q ? '「' + Q + '」' + (items.length ? ' · 点图就用，右上 ＋ 只存不发' : '') : '';
        const msg = $('gyStkMsg');
        msg.style.display = (busy && !items.length) || err || (!busy && !items.length) ? '' : 'none';
        if (busy && !items.length) msg.textContent = pick(['正在搜…', '去网上翻翻…', '找表情包中…']);
        else if (err) msg.innerHTML = esc(err) + whyHtml();
        else msg.textContent = !items.length ? '没搜到，换个词试试' : '';
        $('gyStkGrid').innerHTML = items.map((it, i) => `<div class="stk${it.inLib ? ' ok' : ''}" data-i="${i}" title="${esc(it.d)}"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(it.t)}" alt="">${it.gif ? '<i>动图</i>' : ''}<b data-add="1">${it.inLib ? '✓' : '＋'}</b></div>`).join('')
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
        errWhy = [];
        try {
            const got = await search(Q, first, gifOnly);
            const have = {}; items.forEach(x => { have[x.k] = 1; });
            got.forEach(x => { if (!have[x.k]) { x.inLib = lib().some(e => e && e.gySrc === x.k); items.push(x); } });
            first += 60;
            if (!items.length) err = gifOnly ? '「' + Q + '」没找到会动的，点上面「全部」看看静态的' : '没搜到「' + Q + '」，换个词试试';
        } catch (e) {
            if (e && e.message === 'NONE') err = items.length ? '' : (gifOnly ? '「' + Q + '」没找到会动的，点上面「全部」看看静态的' : '没搜到「' + Q + '」，换个词试试（搜索是通的，只是这个词没有图）');
            else { err = items.length ? '后面的没加载出来' : '这次没搜成'; errWhy = (e && e.why) || [{ way: '搜索', ok: false, msg: (e && e.message) || '不知道哪里断了' }]; }
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
    window.gyStkState = () => ({ on: on(), mode, q: Q, n: items.length, busy, err, why: errWhy.slice(), gif: gifOnly, keep: autoSave() });

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
