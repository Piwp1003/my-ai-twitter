/* =====================================================================
   js/92b —— 🎵 一起听 · 在线曲库（网易云 / QQ 音乐）
   · 搜歌、放歌、歌词：通过社区服务器转一下（/mu/*，谁都能用，不用自己部署）。
     放进「音乐盒」的曲库里放，所以一起听、TA 跟着歌词接话、听歌统计都照旧。
   · 登录：每个人登录**自己的**音乐账号（扫码）。登录信息只存在这台设备里，
     每次随请求带给服务器、服务器原样转给音乐网站，不存。没登录也能搜、能看歌词，免费歌能放；会员歌要会员账号。
   · TA 也会挑一首真的能放的歌发给你（自主行动），点一下就一起听。
   ===================================================================== */
(function () {
    if (window.gyMu) return;
    const LK = 'gyMuCk', SRC = { ne: '网易云', qq: 'QQ 音乐' };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rd = () => { try { return JSON.parse(localStorage.getItem(LK) || '{}') || {}; } catch (e) { return {}; } };
    const wr = o => { try { localStorage.setItem(LK, JSON.stringify(o)); } catch (e) {} };
    const acc = src => rd()[src] || null;
    const toast = (t, d) => { try { showToast('', '🎵', t, d || '', null, false); } catch (e) {} };
    const base = () => (window.gyGate && window.gyGate.url) || '';
    let ST = { src: 'ne', q: '', list: [], busy: '', err: '', qr: null };
    try { const o = JSON.parse(localStorage.getItem('gyMuUi') || '{}'); if (o.src) ST.src = o.src; } catch (e) {}

    async function api(path, body, src) {
        if (!base()) throw new Error('要先连上社区（开屏登录用的那个）才能用在线曲库');
        const h = { 'Content-Type': 'application/json' };
        if (window.gyGate.tok) h['X-Gy-Token'] = window.gyGate.tok;
        const a = acc(src || body.src); if (a && a.ck) h['X-Mu-Ck'] = a.ck;
        const r = await window.gyGate.fetch(path, { method: 'POST', headers: h, body: JSON.stringify(body || {}) });   /* 291：连不上会自动换备用地址 */
        const j = await r.json().catch(() => ({}));
        if (!j.ok) throw new Error(j.err || ('服务器返回 ' + r.status));
        return j;
    }
    const M = window.gyMu = {
        on: () => !window.GYX || !window.GYX.on || window.GYX.on('gyMuOnline'),
        search: (src, q) => api('/mu/search', { src, q }, src).then(j => j.list || []),
        url: (src, id) => api('/mu/url', { src, id }, src),
        lyric: (src, id) => api('/mu/lyric', { src, id }, src),
        daily: src => api('/mu/daily', { src }, src).then(j => j.list || []),
        lists: src => api('/mu/lists', { src }, src).then(j => j.list || []),
        list: (src, id) => api('/mu/list', { src, id }, src).then(j => j.list || []),
        acc,
        logout: src => { const o = rd(); delete o[src]; wr(o); paint(); toast('退出了 ' + SRC[src], '这台设备上的登录信息删掉了'); }
    };

    /* ---------------- 播放（放进音乐盒） ---------------- */
    // 287：放 = 交给网易云（它会建一首歌、挂上音源、打开播放页）；网易云没开才直接丢进音乐盒
    M.play = async (it, play) => {
        if (window.gysMu && typeof window.gysMu.playOnline === 'function') { if (play !== false && window.gysMusicOpen && !(window.GYS && window.GYS.isOpen && window.GYS.isOpen('music'))) window.gysMusicOpen(); return window.gysMu.playOnline(it, play === false); }
        if (typeof window.gymAddOnline !== 'function') return toast('音乐盒没开', '在 设置 → 全部开关 里打开音乐盒');
        return window.gymAddOnline(it, play !== false);
    };
    window.gyMuPlayIdx = (i, add) => { const it = ST.list[i]; if (!it) return; M.play(it, !add); };
    // 按歌名找一首能放的（TA 点歌、聊天里提到的歌用）：先网易云，再 QQ 音乐
    M.find = async (q, prefer) => {
        for (const s of prefer === 'qq' ? ['qq', 'ne'] : ['ne', 'qq']) { try { const L = await M.search(s, q); const hit = L.find(x => !x.vip || (acc(s) || {}).vip !== false) || L[0]; if (hit) return hit; } catch (e) {} }
        return null;
    };
    window.gyMuPlayQ = async (q, src) => { const it = await M.find(q, src); if (!it) return toast('没找到能放的', q); M.play(it, true); toast('一起听：' + it.name, it.ar || ''); };

    /* ---------------- 页面 ---------------- */
    function rowHtml(it, i) {
        const g = ['#ff6b6b,#ee5a24', '#48dbfb,#0abde3', '#feca57,#ff9f43', '#a29bfe,#6c5ce7', '#55efc4,#00b894'][i % 5];
        const mm = it.dur ? Math.floor(it.dur / 60000) + ':' + String(Math.floor(it.dur / 1000) % 60).padStart(2, '0') : '';
        return `<div class="gymu-r"><span class="gymu-cv" style="background:linear-gradient(135deg,${g})">${esc((it.name || '♪').slice(0, 1))}</span><div class="gymu-m" onclick="gyMuPlayIdx(${i})"><b>${esc(it.name)}${it.vip ? '<em>会员</em>' : ''}</b><small>${esc(it.ar)}${it.al ? ' · ' + esc(it.al) : ''}${mm ? ' · ' + mm : ''}</small></div><span class="gymu-b" onclick="gyMuPlayIdx(${i},1)" title="加进曲库">＋</span><span class="gymu-b p" onclick="gyMuPlayIdx(${i})" title="放">▶</span></div>`;
    }
    function body() {
        const a = acc(ST.src);
        if (ST.qr) return qrHtml();
        return `<div class="gymu-pills">${Object.keys(SRC).map(k => `<span class="${ST.src === k ? 'on' : ''}" onclick="gyMuSrc('${k}')">${SRC[k]}</span>`).join('')}</div>
          <div class="gymu-acc">${a && a.ck ? `已登录 ${esc(SRC[ST.src])}${a.nick ? '：<b>' + esc(a.nick) + '</b>' : ''}<span onclick="gyMu.logout('${ST.src}')">退出</span>` : `没登录：能搜、能看歌词，免费歌能放；会员歌要登录<span onclick="gyMuLogin('${ST.src}')">扫码登录</span>`}</div>
          <div class="gymu-sb"><input id="gyMuQ" placeholder="搜歌名、歌手" value="${esc(ST.q)}" onkeydown="if(event.key==='Enter'&&!event.isComposing)gyMuGo(this.value)"><span onclick="gyMuGo(document.getElementById('gyMuQ').value)">搜索</span></div>
          ${ST.err ? `<div class="gymu-err">${esc(ST.err)}</div>` : ''}
          ${ST.busy ? '<div class="gymu-tip">⏳ 在找…</div>' : ST.list.length ? ST.list.map(rowHtml).join('') : `<div class="gymu-tip">${ST.q ? '没搜到' : '搜到的歌点一下就放进音乐盒开始放；在一起听的话，TA 会跟着一起听、跟着歌词说话。'}</div>`}
          <div class="gymu-foot">登录信息只存在这台手机里，换手机要重新登录。歌和歌词来自${esc(SRC[ST.src])}。</div>`;
    }
    function paint() { const b = document.getElementById('gyMuBody'); if (b) { b.classList.add('gymu-in'); b.innerHTML = body(); } }
    // 287：在网易云里打开（网易云 → 我的 →「能真的放的歌」/ 搜索页里「去登录」）
    window.gyMuMount = (q, src) => { if (src && src !== ST.src) { ST.src = src; ST.list = []; } paint(); if (q && q !== ST.q) window.gyMuGo(q); };
    window.gyMuOpen = function (q, src) {
        if (window.gysMu && window.gysMu.onlinePage && window.gysMusicOpen) { window.gysMusicOpen(); window.gysMu.onlinePage(q, src); return; }   // 287：都在网易云里
        if (src) ST.src = src;
        let ov = document.getElementById('gyMuOv');
        if (!ov) {
            ov = document.createElement('div'); ov.id = 'gyMuOv'; ov.setAttribute('data-gy-overlay', '1'); ov.setAttribute('data-gy-page', '1');
            ov.innerHTML = `<div class="gymu-box"><div class="gymu-hd"><span onclick="gyMuClose()">‹</span><b>🌐 在线的歌</b><span onclick="gyMuClose()">✕</span></div><div id="gyMuBody"></div></div>`;
            ov.addEventListener('click', e => { if (e.target === ov) window.gyMuClose(); });
            document.body.appendChild(ov);
        }
        paint();
        if (q) window.gyMuGo(q);
    };
    window.gyMuClose = () => { const o = document.getElementById('gyMuOv'); if (o) o.remove(); stopQr(); };
    window.gyMuSrc = k => { ST.src = k; ST.list = []; ST.err = ''; try { localStorage.setItem('gyMuUi', JSON.stringify({ src: k })); } catch (e) {} paint(); if (ST.q) window.gyMuGo(ST.q); };
    window.gyMuGo = async q => {
        q = String(q || '').trim(); if (!q) return; ST.q = q; ST.busy = 's'; ST.err = ''; paint();
        try { ST.list = await M.search(ST.src, q); } catch (e) { ST.list = []; ST.err = e.message || String(e); }
        ST.busy = ''; paint();
    };

    /* ---------------- 扫码登录 ---------------- */
    let QT = null;
    function stopQr() { clearTimeout(QT); QT = null; ST.qr = null; }
    function loadQrLib() { return new Promise(res => { if (window.qrcode) return res(true); const s = document.createElement('script'); s.src = './js/vendor/qrcode.min.js'; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); }); }
    function qrHtml() {
        const q = ST.qr, lab = { wait: '等你扫码', scanned: '扫到了，在手机上点「确认登录」', expired: '二维码过期了', fail: '没登录上', ok: '登录好了' }[q.st] || '';
        const how = q.src === 'qq' ? '用 <b>QQ</b>（或者 QQ 音乐）扫一扫' : '用 <b>网易云音乐 App</b> 扫一扫（首页左上角 ≡ 旁边的扫码）';
        return `<div class="gymu-qr"><b>登录${SRC[q.src]}</b><div class="gymu-qrim">${q.img ? `<img src="${q.img}" alt="二维码">` : q.svg || '<div class="gymu-tip">⏳</div>'}</div><div>${how}</div><div class="gymu-st">${esc(lab)}${q.msg ? '：' + esc(q.msg) : ''}</div>
          ${q.st === 'expired' || q.st === 'fail' ? `<span class="gymu-btn" onclick="gyMuLogin('${q.src}')">换一个二维码</span>` : ''}<span class="gymu-btn g" onclick="gyMuQrCancel()">先不登录了</span>
          <div class="gymu-foot">手机上只有这一台手机时：截图保存二维码，再用 ${SRC[q.src]} / QQ 的扫一扫从相册里选这张图。</div></div>`;
    }
    window.gyMuQrCancel = () => { stopQr(); paint(); };
    window.gyMuLogin = async src => {
        stopQr(); ST.qr = { src, st: 'wait' }; paint();
        try {
            const j = await api('/mu/qr', { src }, '__none');
            ST.qr.key = j.key;
            if (j.img) ST.qr.img = j.img;
            else if (await loadQrLib() && window.qrcode) { const qr = window.qrcode(0, 'M'); qr.addData(j.text); qr.make(); ST.qr.svg = qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); }
            else { ST.qr.st = 'fail'; ST.qr.msg = '二维码画不出来'; }
            paint(); poll();
        } catch (e) { ST.qr = { src, st: 'fail', msg: e.message || String(e) }; paint(); }
    };
    function poll() {
        clearTimeout(QT); const q = ST.qr; if (!q || !q.key) return;
        QT = setTimeout(async () => {
            if (ST.qr !== q) return;
            try {
                const j = await api('/mu/qrcheck', { src: q.src, key: q.key }, '__none');
                q.st = j.st; q.msg = j.msg || (j.nick ? j.nick : '');
                if (j.st === 'ok') {
                    const o = rd(); o[q.src] = { ck: j.ck, nick: j.nick || '', at: Date.now() }; wr(o);
                    try { const me = await api('/mu/me', { src: q.src }, q.src); if (me.nick) { o[q.src].nick = me.nick; o[q.src].vip = me.vip; wr(o); } } catch (e) {}
                    stopQr(); ST.src = q.src; paint(); toast('登录好了', SRC[q.src] + (rd()[q.src].nick ? '：' + rd()[q.src].nick : ''));
                    if (q.src === 'ne' && window.gysMu && window.gysMu.askSync) setTimeout(() => window.gysMu.askSync(), 400);   // 287：问她要同步账号还是让 AI 生成
                    return;
                }
                paint(); if (j.st === 'wait' || j.st === 'scanned') poll();
            } catch (e) { q.st = 'fail'; q.msg = e.message || String(e); paint(); }
        }, 2000);
    }

    /* ---------------- 样子 ---------------- */
    const css = document.createElement('style'); css.id = 'gyMuCss';
    css.textContent = `#gyMuOv{position:fixed;inset:0;z-index:2700;background:rgba(0,0,0,.35);display:flex;align-items:flex-end;justify-content:center}
.gymu-in{--mk:rgba(127,127,127,.12);--ms:#8e8e93;--mf:rgba(127,127,127,.18);padding-top:10px}
.gymu-box{--mk:#fff;--ms:#8e8e93;--mf:rgba(120,120,128,.12);background:#f2f2f7;color:#1c1c1e;width:min(560px,100%);height:min(92vh,100%);border-radius:16px 16px 0 0;overflow:auto;padding-bottom:30px;box-sizing:border-box}
body.dark-theme .gymu-box{--mk:#1c1c1e;--mf:rgba(120,120,128,.24);background:#000;color:#f2f2f7}
.gymu-hd{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:inherit;font-size:17px}.gymu-hd span{cursor:pointer;color:#ff2d55;font-size:20px;width:30px}.gymu-hd span:last-child{text-align:right;font-size:16px;color:var(--ms)}
.gymu-pills{display:flex;gap:8px;padding:0 16px 10px}.gymu-pills span{padding:6px 14px;border-radius:16px;background:var(--mk);font-size:14px;font-weight:600;cursor:pointer}.gymu-pills span.on{background:#ff2d55;color:#fff}
.gymu-acc{margin:0 16px 10px;background:var(--mk);border-radius:12px;padding:10px 14px;font-size:13px;color:var(--ms);display:flex;align-items:center;gap:8px}.gymu-acc b{color:inherit}.gymu-acc span{margin-left:auto;color:#ff2d55;font-weight:600;cursor:pointer;white-space:nowrap}
.gymu-sb{display:flex;gap:8px;margin:0 16px 12px}.gymu-sb input{flex:1;min-width:0;border:0;border-radius:18px;padding:9px 14px;background:var(--mk);color:inherit;font-size:15px;outline:0}.gymu-sb span{background:#ff2d55;color:#fff;border-radius:18px;padding:8px 16px;cursor:pointer;font-size:14px}
.gymu-r{display:flex;align-items:center;gap:10px;margin:0 16px;padding:9px 0;border-bottom:.5px solid rgba(120,120,128,.2)}.gymu-cv{width:44px;height:44px;border-radius:8px;color:#fff;display:grid;place-items:center;font-weight:700;font-size:17px;flex:none}
.gymu-m{flex:1;min-width:0;cursor:pointer}.gymu-m b{display:block;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gymu-m b em{font-style:normal;font-size:10px;color:#ff2d55;border:1px solid #ff2d55;border-radius:3px;padding:0 3px;margin-left:5px;vertical-align:2px}.gymu-m small{display:block;font-size:12.5px;color:var(--ms);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gymu-b{width:32px;height:32px;border-radius:50%;background:var(--mf);display:grid;place-items:center;cursor:pointer;flex:none;font-size:15px}.gymu-b.p{background:#ff2d55;color:#fff;font-size:12px}
.gymu-tip{text-align:center;color:var(--ms);font-size:13.5px;padding:24px 20px;line-height:1.7}.gymu-err{margin:0 16px 10px;color:#ff3b30;font-size:13px}.gymu-foot{text-align:center;color:var(--ms);font-size:12px;padding:16px 20px 0;line-height:1.6}
.gymu-qr{text-align:center;padding:10px 20px;font-size:14px;line-height:1.8}.gymu-qr>b{font-size:18px}.gymu-qrim{width:200px;height:200px;margin:14px auto;background:#fff;border-radius:12px;padding:8px;box-sizing:border-box;display:grid;place-items:center}.gymu-qrim img,.gymu-qrim svg{width:100%;height:100%;image-rendering:pixelated}
.gymu-st{font-weight:600;margin:6px 0 12px}.gymu-btn{display:inline-block;margin:4px;padding:7px 18px;border-radius:18px;background:#ff2d55;color:#fff;cursor:pointer}.gymu-btn.g{background:var(--mf);color:inherit}`;
    document.head.appendChild(css);

    /* ---------------- 谷雨这边：开关、TA 点歌、今天、小组件 ---------------- */
    (function reg(n) {
        const X = window.GYX; if (!X || !X.feat) { if ((n || 0) < 100) setTimeout(() => reg((n || 0) + 1), 300); return; }
        X.feat('gyMuOnline', { n: '🌐 在线的歌（网易云 / QQ 音乐）', desc: '音乐盒里能搜网易云、QQ 音乐的歌直接放，有歌词；TA 也会挑一首真的能放的歌发给你' });
        const LAST = 'gyMuTaPick';
        const picks = () => { try { return JSON.parse(localStorage.getItem(LAST) || '[]') || []; } catch (e) { return []; } };
        const savePicks = L => { try { localStorage.setItem(LAST, JSON.stringify(L.slice(0, 60))); } catch (e) {} };
        X.action({ key: 'gy_mu_pick', label: '挑一首真的能放的歌发给她，叫她一起听', hint: '想到一首歌、跟今天的心情或者你们的事有关', need: c => !!base() && !picks().some(p => p.cid === String(c.id) && Date.now() - p.at < 20 * 3600e3), run: async c => {
            const o = X.json(await X.ask(`${X.who(c)}\n你想发一首歌给她，叫她跟你一起听。挑一首真实存在、网易云或 QQ 音乐上能搜到的歌（按你的性格和你们最近的事）。只输出 JSON：{"song":"歌名","artist":"歌手","line":"发给她的一句话（口语，不要书名号以外的引号）"}`));
            if (!o || !o.song) return null;
            const it = await M.find(o.song + ' ' + (o.artist || '')); if (!it) return null;
            const L = picks(); L.unshift({ cid: String(c.id), at: Date.now(), src: it.src, id: it.id, name: it.name, ar: it.ar, line: X.plain(o.line || '') }); savePicks(L);
            return { text: `${X.plain(o.line || '一起听这首？')}（🎵 ${it.name} - ${it.ar}）`, jump: { fn: 'gyMuPlayQ', args: [it.name + ' ' + it.ar, it.src] } };
        } }, 'gyMuOnline');
        X.today(() => { const L = picks().filter(p => X.day(new Date(p.at)) === X.day()); if (!L.length) return null; return { title: '🎵 TA 想跟你听', rows: L.slice(0, 3).map(p => ({ t: X.name(X.char(p.cid)) || 'TA', x: p.name + ' - ' + p.ar + ' · 去听', go: `gyMuPick(${picks().indexOf(p)})` })) }; }, 'gyMuOnline');
        window.gyMuPick = i => { const p = picks()[i]; if (p) M.play({ src: p.src, id: p.id, name: p.name, ar: p.ar }, true); };
        X.widget('gyMuW', { n: '在线的歌', sizes: ['s', 'm'], tap: () => window.gyMuOpen(), r: w => { const p = picks()[0]; return X.gw(w, '🌐', '在线的歌', p ? [X.esc(p.name), X.esc((X.name(X.char(p.cid)) || 'TA') + ' 想跟你听')] : ['搜一首来听', X.esc(['网易云', 'QQ 音乐'].filter(k => acc(k === '网易云' ? 'ne' : 'qq')).join(' · ') || '还没登录')]); } }, 'gyMuOnline');
        X.mem({ k: 'gyMuOnline', ico: '🎵', n: 'TA 发给你的歌', d: 'TA 挑了发给你一起听的歌（删了就是忘了发过）', items: c => picks().filter(p => p.cid === String(c.id)), text: p => p.name + ' - ' + p.ar + (p.line ? '：' + p.line : ''), del: (c, i) => { const mine = picks().filter(p => p.cid === String(c.id)); const x = mine[i]; if (x) savePicks(picks().filter(p => p !== x && !(p.at === x.at && p.cid === x.cid))); } }, 'gyMuOnline');
        X.ctx(id => { const p = picks().find(x => x.cid === String(id)); return p && Date.now() - p.at < 3 * 86400e3 ? `【你最近发给她一起听的歌】${p.name} - ${p.ar}` : ''; });
    })();
})();
