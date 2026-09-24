/* ===========================================================================
   js/63 —— 📱 小手机的桌面：跟真手机一样能自己摆
   ---------------------------------------------------------------------------
   · 好几页，左右滑；最后一页是「App 资源库」（所有 App 都在这，收起来的也在）
   · 长按（电脑上也可以右键）进「编辑桌面」：图标抖起来——
       拖着换位置 / 拖进拖出 Dock / 拖到别的页；左上角「−」收起来（App 进资源库，小组件删掉）；
       点一下改：App 可以改名字、换底色、换成自己的图片；小组件可以换大小、改内容
       顶上「＋」加小组件，「完成」退出
   · 小组件：时钟、日历、最近在聊、联系人、便签、倒数日、相片、未读、TA 说过的话
   · 「美化」：壁纸、图标风格（彩色手绘 / 线稿 / 极简）、字体、图标名字显示与否、锁屏、重置桌面
   · 锁屏：进小手机时先是锁屏（时间 + 最近几条通知），轻点解锁；可以在「美化」里关
   布局只存在本机（localforage: gyPhoneMode），不进存档、不动任何角色数据。
   =========================================================================== */
(function () {
    'use strict';
    if (window.__gyPmHomeLoaded) return;
    window.__gyPmHomeLoaded = true;

    const G = () => window.__gyPm || {};
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pad = n => String(n).padStart(2, '0');
    const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const HAND = '"LXGW WenKai","霞鹜文楷","KaiTi","STKaiti","楷体",serif';
    const toast = (a, b) => { try { showToast('', a, b || '', null, null, false); } catch (e) {} };
    const ago = t => { try { return t ? timeAgo(t) : ''; } catch (e) { return ''; } };

    /* ---------------- 布局（存本机） ---------------- */
    const DEF = () => ({
        v: 2,
        pages: [
            [{ id: uid(), t: 'w', k: 'aclock', size: 's' }, { id: uid(), t: 'w', k: 'cal', size: 's' }, { id: uid(), t: 'w', k: 'music', size: 'm' },
             ...['diary', 'theater', 'today', 'forum', 'gossip', 'music', 'film', 'beauty'].map(k => ({ id: uid(), t: 'app', k }))],
            [{ id: uid(), t: 'w', k: 'week', size: 'm' }, { id: uid(), t: 'w', k: 'todo', size: 's', d: { items: [{ t: '起床喝一杯热水', done: false }, { t: '回 TA 的消息', done: false }, { t: '午睡二十分钟', done: false }] } },
             { id: uid(), t: 'w', k: 'photo', size: 's', d: { cap: '今天' } },
             ...['calendar', 'book', 'mall', 'map', 'anon', 'photos', 'wallet', 'kit', 'days', 'rel', 'now', 'emo', 'mini', 'chars', 'mem'].map(k => ({ id: uid(), t: 'app', k }))]
        ],
        dock: ['chat', 'notif', 'home', 'set'],
        names: {}, colors: {}, imgs: {},
        style: 'white', font: 'sys', labels: true, lock: true, dark: false,
        wall: null, wallColor: null
    });
    let C = DEF();
    let cur = 0;                 // 现在在第几页
    let locked = false;
    let q = '';                  // 资源库搜索
    const store = () => G().store;
    async function save() { try { if (store()) await store().setItem('cfg', C); } catch (e) {} }
    window.gyPmHomeLoad = async function () {
        try {
            const s = store(); if (!s) return;
            const c = await s.getItem('cfg');
            if (c && c.pages && c.v >= 2) C = Object.assign(DEF(), c);
            else if (c && c.pages) {   // 上一版（手绘风）的布局：换成新的默认摆法，自己改过的名字/图标/壁纸留着
                C = Object.assign(DEF(), { names: c.names || {}, colors: c.colors || {}, imgs: c.imgs || {}, wall: c.wall || null, wallColor: c.wallColor || null, lock: c.lock !== false, labels: c.labels !== false });
                save();
            }
            else {  // 老版本只存了壁纸
                const w = await s.getItem('wall');
                if (w) { C.wall = w.img || null; C.wallColor = w.color || null; }
            }
        } catch (e) {}
        applyPrefs();
    };

    /* ---------------- App 的样子（可改名/换色/换图） ---------------- */
    const appDef = k => (G().APPS || []).find(a => a[0] === k);
    const appName = k => C.names[k] || (appDef(k) || [])[1] || k;
    function iconHtml(k, where, p, i) {
        const a = appDef(k); if (!a) return '';
        const svg = G().svg;
        let badge = '';
        if (k === 'chat') { const n = G().unread ? G().unread() : 0; if (n) badge = `<span class="pm-badge">${n > 99 ? '99+' : n}</span>`; }
        if (k === 'notif') { let n = 0; try { n = unreadNotifs || 0; } catch (e) {} if (n) badge = `<span class="pm-badge">${n > 99 ? '99+' : n}</span>`; }
        const img = C.imgs[k];
        const bg = C.colors[k] || (C.style === 'hand' ? a[3] : '');
        const fg = bg && isDark(bg) ? ';color:#fff' : (bg ? ';color:#111' : '');
        const inner = img ? `<img src="${img}" alt="">` : svg(a[2], 1.6);
        const pos = where === 'lib' ? `data-where="lib"` : `data-where="${where}" data-p="${p}" data-i="${i}"${where === 'page' && C.pages[p] && C.pages[p][i] ? ` data-id="${C.pages[p][i].id}"` : ''}`;
        return `<div class="pm-app pm-item" data-pmapp="${k}" ${pos}><i class="pm-del" data-del="1">−</i><div class="pm-ic${img ? ' img' : ''}"${bg ? ` style="background:${bg}!important${fg}"` : ''}>${inner}</div><span class="pm-lb">${esc(appName(k))}</span>${badge}</div>`;
    }

    const isDark = c => { const m = String(c).match(/^#([0-9a-f]{6})$/i); if (!m) return false; const n = parseInt(m[1], 16); return (((n >> 16) & 255) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114) < 140; };
    const WK = '日一二三四五六', WKE = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    // 指针表盘（SVG）：tz 为空就是本地时间
    function dial(tz, dark, size) {
        let d = new Date();
        if (tz) { try { const s = d.toLocaleString('en-US', { timeZone: tz, hour12: false }); d = new Date(s.replace(/(\d+)\/(\d+)\/(\d+),/, '$3/$1/$2')); } catch (e) {} }
        const h = d.getHours() % 12, m = d.getMinutes();
        const ha = (h + m / 60) * 30, ma = m * 6;
        const fg = dark ? '#fff' : '#111', bg = dark ? '#111' : '#fff', tk = dark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.35)';
        let nums = '';
        for (let i = 1; i <= 12; i++) { const a = i * 30 * Math.PI / 180; nums += `<text x="${50 + 36 * Math.sin(a)}" y="${50 - 36 * Math.cos(a) + 3.6}" text-anchor="middle" font-size="10" font-weight="500" fill="${fg}" font-family="-apple-system,Helvetica,sans-serif">${i}</text>`; }
        let ticks = '';
        for (let i = 0; i < 60; i++) { if (i % 5 === 0) continue; const a = i * 6 * Math.PI / 180; ticks += `<line x1="${50 + 45 * Math.sin(a)}" y1="${50 - 45 * Math.cos(a)}" x2="${50 + 43 * Math.sin(a)}" y2="${50 - 43 * Math.cos(a)}" stroke="${tk}" stroke-width=".8"/>`; }
        return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="dial"><circle cx="50" cy="50" r="48" fill="${bg}"/>${ticks}${nums}
            <line x1="50" y1="50" x2="${50 + 22 * Math.sin(ha * Math.PI / 180)}" y2="${50 - 22 * Math.cos(ha * Math.PI / 180)}" stroke="${fg}" stroke-width="3.4" stroke-linecap="round"/>
            <line x1="50" y1="50" x2="${50 + 33 * Math.sin(ma * Math.PI / 180)}" y2="${50 - 33 * Math.cos(ma * Math.PI / 180)}" stroke="${fg}" stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="50" cy="50" r="2.6" fill="${fg}"/><circle cx="50" cy="50" r="1.1" fill="#ff9500"/></svg>`;
    }
    const tzOff = tz => { try { const a = new Date(new Date().toLocaleString('en-US', { timeZone: tz })), b = new Date(); return Math.round((a - b) / 3600000); } catch (e) { return 0; } };
    const fmtT = s => { s = Math.max(0, Math.floor(s || 0)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
    const MSV = { prev: '<svg viewBox="0 0 24 24"><path d="M7 6v12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M18 6.5v11L9 12z" fill="currentColor"/></svg>', next: '<svg viewBox="0 0 24 24"><path d="M17 6v12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M6 6.5v11L15 12z" fill="currentColor"/></svg>', play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13L19 12z" fill="currentColor"/></svg>', pause: '<svg viewBox="0 0 24 24"><rect x="6.5" y="5.5" width="3.8" height="13" rx="1.2" fill="currentColor"/><rect x="13.7" y="5.5" width="3.8" height="13" rx="1.2" fill="currentColor"/></svg>', note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>' };

    /* ---------------- 小组件 ---------------- */
    const firstChar = () => { const c = (G().chars ? G().chars() : [])[0]; return c ? c.id : null; };
    const charOf = id => (G().chars ? G().chars() : []).find(c => String(c.id) === String(id));
    function nextBirthday() {
        try {
            const b = (typeof currentUser !== 'undefined' && currentUser.birthdate) || '';
            const m = String(b).match(/(\d{1,2})-(\d{1,2})$/);
            if (m) { const n = new Date(); let d = new Date(n.getFullYear(), +m[1] - 1, +m[2]); if (d < new Date(n.getFullYear(), n.getMonth(), n.getDate())) d.setFullYear(d.getFullYear() + 1); return { title: '我的生日', date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }; }
        } catch (e) {}
        const d = new Date(Date.now() + 30 * 864e5); return { title: '纪念日', date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
    }
    function lastOf(cid) {
        const msgs = (typeof globalChats !== 'undefined' && globalChats[cid]) || [];
        for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i] && msgs[i].sender !== 'system') return msgs[i];
        return null;
    }
    const plain = (t, cid) => (G().plain ? G().plain(t, cid) : String(t || ''));
    const WD = {
        clock: { n: '数字时钟', sizes: ['s', 'm'], tap: () => window.gyPmOpen('now'), r(w) {
            const d = new Date(), wk = WK[d.getDay()];
            if (w.size === 's') return `<div class="wg-clock s"><span class="k">${WKE[d.getDay()]} · ${MON[d.getMonth()]} ${d.getDate()}</span><b class="pm-hf">${pad(d.getHours())}:${pad(d.getMinutes())}</b><span>星期${wk}</span></div>`;
            const un = G().unread ? G().unread() : 0;
            const hi = d.getHours() < 5 ? '夜深了，早点睡' : d.getHours() < 11 ? '早上好' : d.getHours() < 14 ? '记得吃午饭' : d.getHours() < 18 ? '下午也要好好的' : '晚上好';
            return `<div class="pm-clock"><span class="t pm-hf" id="gyPmClock">${pad(d.getHours())}:${pad(d.getMinutes())}</span><span class="d"><b>${d.getMonth() + 1}月${d.getDate()}日</b>星期${wk}</span></div>
                <div class="pm-note">${un ? `<span class="dot"></span>有 ${un} 个人在等你回` : hi}</div>`;
        } },
        aclock: { n: '指针时钟', sizes: ['s', 'm'], tap: () => window.gyPmOpen('now'), r(w) {
            if (w.size === 's') { const d = new Date(); return `<div class="wg-ac s">${dial('', w.d && w.d.dark, 118)}</div>`; }
            const cities = [['', '本地'], ['Europe/London', '伦敦'], ['America/New_York', '纽约']];
            const d = new Date();
            return `<div class="wg-ac m">${cities.map(([tz, n], i) => `<div class="c">${dial(tz, i === 1, 78)}<b>${n}</b><span>${tz ? `${tzOff(tz) >= 0 ? '+' : ''}${tzOff(tz)}小时` : `${d.getMonth() + 1}月${d.getDate()}日`}</span></div>`).join('')}</div>`;
        }, edit: w => w.size === 's' ? `<div class="lbl">表盘</div><div class="chips"><span class="chip${!(w.d && w.d.dark) ? ' on' : ''}" onclick="gyPmWSet('${w.id}','dark',false)">白</span><span class="chip${w.d && w.d.dark ? ' on' : ''}" onclick="gyPmWSet('${w.id}','dark',true)">黑</span></div>` : '' },
        cal: { n: '日历', sizes: ['s', 'm'], tap: () => window.gyPmCalendar(), r(w) {
            const d = new Date(), wk = WK[d.getDay()];
            if (w.size === 's') {
                const img = w.d && w.d.img;
                return `<div class="wg-cal-s"><div class="ph${img ? '' : ' empty'}"${img ? ` style="background-image:url('${img}')"` : ''}>${img ? '' : '<span>编辑桌面时点我放张照片</span>'}</div>
                    <div class="bt"><b class="pm-hf">${d.getDate()}</b><span>周${wk}<br>${d.getMonth() + 1}月</span></div></div>`;
            }
            const first = new Date(d.getFullYear(), d.getMonth(), 1).getDay(), days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            let g = 'SMTWTFS'.split('').map(x => `<i class="h">${x}</i>`).join('');
            for (let i = 0; i < first; i++) g += '<i></i>';
            for (let i = 1; i <= days; i++) g += `<i class="${i === d.getDate() ? 'on' : ''}${calHas(d.getFullYear(), d.getMonth(), i) ? ' has' : ''}" data-day="${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(i)}">${i}</i>`;
            return `<div class="wg-cal-m"><div class="big"><em>${MON[d.getMonth()]}</em><b class="pm-hf">${d.getDate()}</b><span>星期${wk}</span></div><div class="wg-cal-g">${g}</div></div>`;
        }, edit: w => w.size === 's' ? `<label class="it">上面放一张照片<input type="file" accept="image/*" style="display:none" onchange="gyPmWPhoto('${w.id}',this)"></label>${w.d && w.d.img ? `<button class="it muted" onclick="gyPmWSet('${w.id}','img','')">去掉照片</button>` : ''}` : '' },
        week: { n: '本周', sizes: ['m'], r() {
            const d = new Date(), mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
            let h = '';
            for (let i = 0; i < 7; i++) { const x = new Date(mon); x.setDate(mon.getDate() + i); const on = x.toDateString() === d.toDateString(); h += `<div class="dy${on ? ' on' : ''}${calHas(x.getFullYear(), x.getMonth(), x.getDate()) ? ' has' : ''}" data-day="${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}"><em>${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i]}</em><b>${x.getDate()}</b><i></i></div>`; }
            return `<div class="wg-week">${h}</div>`;
        } },
        music: { n: '正在播放', sizes: ['m'], tap: () => window.gyPmOpen('music'), r() {
            const m = typeof window.gymNowInfo === 'function' ? window.gymNowInfo() : null;
            const cov = m && m.cover ? `<div class="cv" style="background-image:url('${esc(m.cover)}')"></div>` : `<div class="cv empty">${MSV.note}</div>`;
            const pct = m && m.d ? Math.min(100, m.t / m.d * 100) : 0;
            return `<div class="wg-mu"><div class="top">${cov}<div class="tt"><b>${esc(m ? m.title : '没有在放歌')}</b><span>${esc(m ? (m.artist || '未知歌手') : '轻点去音乐盒挑一首')}</span></div></div>
                <div class="ctl"><span data-mc="prev">${MSV.prev}</span><span data-mc="toggle" class="pp">${m && m.playing ? MSV.pause : MSV.play}</span><span data-mc="next">${MSV.next}</span></div>
                <div class="bar"><span>${fmtT(m && m.t)}</span><i><u style="width:${pct}%"></u></i><span>${fmtT(m && m.d)}</span></div></div>`;
        } },
        weather: { n: '天气', sizes: ['s', 'm'], tap: () => window.gyPmOpen('map'), r(w) {
            const x = typeof window.gymapWeatherInfo === 'function' ? window.gymapWeatherInfo() : null;
            if (!x) return `<div class="wg-empty">还没有天气<br><small>去「地图 → 天气」填个城市</small></div>`;
            const now = x.now != null ? x.now : x.max;
            if (w.size === 's') return `<div class="wg-we s"><span class="ct">${esc(x.city || '你这边')}</span><b class="pm-hf">${now}°</b><div class="ic">${x.icon || ''}</div><span>${esc(x.desc)}</span><span class="rg">最高${x.max}° 最低${x.min}°</span></div>`;
            return `<div class="wg-we m"><div><span class="ct">${esc(x.city || '你这边')}</span><b class="pm-hf">${now}°</b></div><div class="r"><div class="ic">${x.icon || ''}</div><span>${esc(x.desc)}</span><span class="rg">${x.min}° ~ ${x.max}°${x.rain != null ? ` · 降水 ${x.rain}%` : ''}</span></div></div>`;
        } },
        battery: { n: '电量', sizes: ['s'], tap: () => window.gyPmSaver(), r() {
            const b = typeof window.gyPmBattery === 'function' ? window.gyPmBattery() : null;
            const lv = b ? b.lv : 100, sv = saverOn();
            const C2 = 2 * Math.PI * 34, off = C2 * (1 - lv / 100);
            const col = sv ? '#ffcc00' : (lv <= 20 ? 'var(--pm-red)' : 'currentColor');
            return `<div class="wg-bt${sv ? ' sv' : ''}"><svg viewBox="0 0 80 80" width="88" height="88"><circle cx="40" cy="40" r="34" fill="none" stroke="var(--pm-fill)" stroke-width="7"/><circle cx="40" cy="40" r="34" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C2}" stroke-dashoffset="${off}" transform="rotate(-90 40 40)"/></svg><div class="in"><b>${b ? lv + '%' : '—'}</b><span>${b && b.ch ? '充电中' : '本机'}</span></div><em class="svl">${sv ? '省电模式 · 开' : '点一下省电'}</em></div>`;
        } },
        todo: { n: '待办', sizes: ['s', 'm'], tap: () => {}, r(w) {
            const it = (w.d && w.d.items) || [];
            return `<div class="wg-todo"><div class="h"><b>今天</b><span>${it.filter(x => x.done).length}/${it.length}<em data-todoadd="${w.id}">＋</em></span></div>${it.length ? it.slice(0, w.size === 's' ? 4 : 5).map((x, i) => `<div class="ti${x.done ? ' done' : ''}" data-todo="${w.id}|${i}"><i></i><span>${esc(x.t)}</span></div>`).join('') : '<div class="wg-empty">还没写待办</div>'}</div>`;
        }, edit: w => `<div class="lbl">一行一件事</div><textarea class="ta" rows="5" oninput="gyPmTodoText('${w.id}',this.value)">${esc(((w.d && w.d.items) || []).map(x => x.t).join('\n'))}</textarea>` },
        recent: { n: '最近在聊', sizes: ['m'], tap: () => { const lc = G().lastChat && G().lastChat(); if (lc) window.gyPmOpenChat(lc.x.id); else window.gyPmOpen('chat'); }, r() {
            const lc = G().lastChat && G().lastChat();
            if (!lc) return `<div class="wg-empty pm-hf">还没有人跟你聊天</div>`;
            const av = G().av;
            return `<div class="wg-h">最近在聊</div><div class="pm-last"><div class="av">${av(lc.x, 44)}</div>
                <div class="m"><div class="n pm-hf">${esc(lc.x.remark || lc.x.name)}</div><div class="p">${esc((lc.m.sender === 'me' ? '我：' : '') + (plain(lc.m.text, lc.x.members ? lc.m.sender : lc.x.id) || '[图片]'))}</div></div>
                <span class="k">${esc(ago(lc.m.timestamp))}</span></div>`;
        } },
        contact: { n: '联系人', sizes: ['s'], tap: w => { const id = (w.d && w.d.cid) || firstChar(); if (id != null) window.gyPmOpenChat(id); }, r(w) {
            const id = (w.d && w.d.cid) || firstChar(), c = charOf(id);
            if (!c) return `<div class="wg-empty pm-hf">还没有角色</div>`;
            const m = lastOf(c.id);
            let red = false; try { red = chatHasUnread(c.id); } catch (e) {}
            return `<div class="wg-ct"><div class="av">${G().av(c, 56)}${red ? '<i class="dot"></i>' : ''}</div><b class="pm-hf">${esc(c.remark || c.name)}</b><span>${esc(m ? plain(m.text, c.id) || '[图片]' : '点一下说句话')}</span></div>`;
        }, edit: w => `<div class="lbl">放谁</div><div class="chips">${(G().chars ? G().chars() : []).map(c => `<span class="chip${String((w.d && w.d.cid) || firstChar()) === String(c.id) ? ' on' : ''}" onclick="gyPmWSet('${w.id}','cid','${esc(c.id)}')">${esc(c.remark || c.name)}</span>`).join('')}</div>` },
        note: { n: '便签', sizes: ['s', 'm'], tap: w => window.gyPmItemSheet(w.id), r(w) {
            const t = (w.d && w.d.text) || '写点什么……';
            return `<div class="wg-note pm-hf">${esc(t).replace(/\n/g, '<br>')}</div>`;
        }, edit: w => `<div class="lbl">便签内容</div><textarea class="ta pm-hf" rows="4" oninput="gyPmWSet('${w.id}','text',this.value,1)">${esc((w.d && w.d.text) || '')}</textarea>` },
        count: { n: '纪念日', sizes: ['s', 'm'], tap: w => window.gyPmItemSheet(w.id), r(w) {
            const d0 = Object.assign(nextBirthday(), w.d || {});
            const t = new Date(d0.date + 'T00:00:00'), now = new Date(); now.setHours(0, 0, 0, 0);
            const n = Math.round((t - now) / 864e5);
            const lab = n > 0 ? '还有' : n === 0 ? '就是' : '已经';
            if (w.size === 'm') return `<div class="wg-count m"><div><span class="tt">♥ ${esc(d0.title)} ♥</span><div class="nn"><b class="pm-hf">${n === 0 ? '今天' : Math.abs(n)}</b>${n === 0 ? '' : '<em>天</em>'}</div><span class="dd">${esc(d0.date.replace(/-/g, '/'))}</span></div><span class="lb">${lab}</span></div>`;
            return `<div class="wg-count s"><span class="tt">${esc(d0.title)}</span><div class="nn"><em>${lab}</em><b class="pm-hf">${n === 0 ? '今天' : Math.abs(n)}</b>${n === 0 ? '' : '<em>天</em>'}</div><span class="dd">${esc(d0.date.replace(/-/g, '/'))}</span></div>`;
        }, edit: w => { const d0 = Object.assign(nextBirthday(), w.d || {}); return `<div class="lbl">叫什么</div><input class="in" value="${esc(d0.title)}" oninput="gyPmWSet('${w.id}','title',this.value,1)"><div class="lbl">哪一天（过去的日子就算「已经 N 天」）</div><input class="in" type="date" value="${esc(d0.date)}" onchange="gyPmWSet('${w.id}','date',this.value,1)">`; } },
        photo: { n: '相片', sizes: ['s', 'm', 'l'], tap: w => {
            const L = photosOf(w); if (!L.length) { window.gyPmItemSheet(w.id); return; }
            w.d.i = ((w.d.i || 0) + 1) % L.length; save(); render();      // 点一下换下一张
        }, r(w) {
            const L = photosOf(w), img = L.length ? L[(w.d.i || 0) % L.length] : null;
            const cap = w.d && w.d.cap ? `<span class="cap pm-hf">${esc(w.d.cap)}</span>` : '';
            const dots = L.length > 1 ? `<span class="pdots">${L.map((_, k) => `<i class="${k === (w.d.i || 0) % L.length ? 'on' : ''}"></i>`).join('')}</span>` : '';
            return img ? `<div class="wg-photo" style="background-image:url('${img}')">${cap}${dots}</div>` : `<div class="wg-photo empty"><span class="cam"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span>${cap}</div>`;
        }, edit: w => { const L = photosOf(w); return `<div class="lbl">照片（最多 9 张，点小组件轮着换）</div><div class="pm-thumbs">${L.map((u, k) => `<span style="background-image:url('${u}')"><i onclick="gyPmPhotoDel('${w.id}',${k})">×</i></span>`).join('')}<label class="add">＋<input type="file" accept="image/*" multiple style="display:none" onchange="gyPmWPhoto('${w.id}',this)"></label></div><div class="lbl">角落的小字（可以不写）</div><input class="in" value="${esc((w.d && w.d.cap) || '')}" oninput="gyPmWSet('${w.id}','cap',this.value,1)">`; } },
        unread: { n: '未读', sizes: ['s'], tap: () => window.gyPmOpen('chat'), r() {
            const un = G().unread ? G().unread() : 0; let nn = 0; try { nn = unreadNotifs || 0; } catch (e) {}
            return `<div class="wg-un"><span class="h">等你回</span><b class="pm-hf">${un}</b><span>${nn ? `还有 ${nn} 条通知` : '通知都看完了'}</span></div>`;
        } },
        say: { n: 'TA 说过的话', sizes: ['m'], tap: w => { const m = pickSay(w); if (m) window.gyPmOpenChat(m.cid); }, r(w) {
            const m = pickSay(w);
            if (!m) return `<div class="wg-empty pm-hf">等 TA 跟你说几句话，这里会随机挑一句</div>`;
            return `<div class="wg-say"><span class="q pm-hf">「${esc(m.t.slice(0, 60))}${m.t.length > 60 ? '…' : ''}」</span><span class="by">—— ${esc(m.name)}</span></div>`;
        }, edit: w => `<div class="lbl">挑谁说过的话</div><div class="chips"><span class="chip${!(w.d && w.d.cid) ? ' on' : ''}" onclick="gyPmWSet('${w.id}','cid','')">谁都行</span>${(G().chars ? G().chars() : []).map(c => `<span class="chip${String(w.d && w.d.cid) === String(c.id) ? ' on' : ''}" onclick="gyPmWSet('${w.id}','cid','${esc(c.id)}')">${esc(c.remark || c.name)}</span>`).join('')}</div>` }
    };
    // 挑一句：按小时换一次（别每 30 秒刷新一下就变）
    function pickSay(w) {
        const pool = [];
        (G().chars ? G().chars() : []).forEach(c => {
            if (w.d && w.d.cid && String(w.d.cid) !== String(c.id)) return;
            const msgs = (typeof globalChats !== 'undefined' && globalChats[c.id]) || [];
            msgs.slice(-60).forEach(m => { if (m && String(m.sender) === String(c.id)) { const t = plain(m.text, c.id); if (t && t.length >= 4) pool.push({ t, cid: c.id, name: c.remark || c.name }); } });
        });
        if (!pool.length) return null;
        const h = Math.floor(Date.now() / 3600000) + (w.id || '').length;
        return pool[h % pool.length];
    }
    // 🔋 省电模式：把「角色自己会去调 API」的那些自动功能先全关掉，再点一下原样恢复（只恢复它关掉的那些）
    const SAVER = 'gyPmSaver';
    const saverOn = () => { try { return !!localStorage.getItem(SAVER); } catch (e) { return false; } };
    window.gyPmSaverOn = saverOn;
    window.gyPmSaver = function () {
        if (typeof setAutoFeature !== 'function' || typeof AUTO_FEATURE_DEFS === 'undefined') { toast('这里开不了省电模式'); return; }
        if (saverOn()) {
            let keys = []; try { keys = JSON.parse(localStorage.getItem(SAVER)) || []; } catch (e) {}
            keys.forEach(k => { try { setAutoFeature(k, true, true); } catch (e) {} });
            try { localStorage.removeItem(SAVER); } catch (e) {}
            toast('🔋 省电模式关了', `${keys.length} 个自动功能恢复了`);
        } else {
            const spends = d => d && d.key && d.cost && !/不额外调用|完全不调用|不调用|省钱/.test(d.cost);
            const keys = [...new Set(AUTO_FEATURE_DEFS.filter(d => spends(d) && (typeof isAutoOn !== 'function' || isAutoOn(d.key))).map(d => d.key))];
            keys.forEach(k => { try { setAutoFeature(k, false, true); } catch (e) {} });
            try { localStorage.setItem(SAVER, JSON.stringify(keys)); } catch (e) {}
            toast('🔋 省电模式开了', keys.length ? `先关掉了 ${keys.length} 个会自己调 API 的功能（主动发帖、主动找你、小剧场……），再点一下电量就原样恢复` : '本来就没有开着的自动功能');
        }
        render(); try { G().tickSb && G().tickSb(); } catch (e) {}
    };
    const photosOf = w => { w.d = w.d || {}; if (!Array.isArray(w.d.imgs)) w.d.imgs = w.d.img ? [w.d.img] : []; return w.d.imgs; };
    window.gyPmPhotoDel = function (id, k) { const w = findW(id); if (!w) return; photosOf(w).splice(k, 1); w.d.i = 0; save(); render(); window.gyPmItemSheet(id); };
    // 日历上有没有东西（小圆点）
    function calHas(y, m, d) {
        try { if (typeof window.gyMyCalDay !== 'function') return false; const x = window.gyMyCalDay(`${y}-${pad(m + 1)}-${pad(d)}`); return !!(x.mine.length || x.anniv.length || x.birth.length); } catch (e) { return false; }
    }
    function widgetHtml(w, p, i) {
        const def = WD[w.k]; if (!def) return '';
        let body = ''; try { body = def.r(w); } catch (e) { body = '<div class="wg-empty">这个小组件出错了</div>'; }
        return `<div class="pm-w pm-item wg wk-${w.k} sz-${w.size}" data-id="${w.id}" data-wid="${w.id}" data-where="page" data-p="${p}" data-i="${i}"><i class="pm-del" data-del="1">−</i>${body}</div>`;
    }

    /* ---------------- 画桌面 ---------------- */
    function applyPrefs() {
        const b = document.body.classList;
        ['black', 'glass', 'hand'].forEach(x => b.toggle('pm-st-' + x, C.style === x));
        b.toggle('pm-font-serif', C.font === 'serif'); b.toggle('pm-font-hand', C.font === 'hand');
        b.toggle('pm-nolabel', C.labels === false); b.toggle('pm-dark', !!C.dark);
    }
    // 音乐小组件：歌在放的时候每几秒刷一下进度（只刷它自己，不整页重画）
    function tickMusic() {
        if (!document.body.classList.contains('gyphm') || document.body.classList.contains('gyphm-app')) return;
        document.querySelectorAll('#gyPmHome .wk-music').forEach(el => {
            const w = findW(el.dataset.wid); if (!w) return;
            const del = el.querySelector('.pm-del'); el.innerHTML = ''; if (del) el.appendChild(del);
            el.insertAdjacentHTML('beforeend', WD.music.r(w));
        });
    }
    setInterval(() => { try { const m = window.gymNowInfo && window.gymNowInfo(); if (m && m.playing) tickMusic(); } catch (e) {} }, 3000);
    window.gyPmHomeRender = function () {
        const home = document.getElementById('gyPmHome'); if (!home) return;
        applyPrefs();
        const keepX = (() => { const el = home.querySelector('.pm-pages'); return el ? el.scrollLeft : null; })();
        const keepY = [...home.querySelectorAll('.pm-page')].map(e => e.scrollTop);
        home.classList.toggle('has-wall', !!C.wall);
        home.style.backgroundImage = C.wall ? `url('${C.wall}')` : '';
        home.style.background = C.wall ? '' : (C.wallColor || '');
        if (C.wall) { home.style.backgroundImage = `url('${C.wall}')`; home.style.backgroundSize = 'cover'; home.style.backgroundPosition = 'center'; }
        home.classList.toggle('dark-wall', !C.wall && /#1c1c1e|#000000|#2c2c2e/.test(C.wallColor || ''));
        const pages = C.pages.map((pg, p) => `<div class="pm-page" data-page="${p}"><div class="pm-grid">${pg.map((it, i) => it.t === 'app' ? iconHtml(it.k, 'page', p, i) : widgetHtml(it, p, i)).join('')}</div></div>`).join('');
        const nP = C.pages.length;
        home.innerHTML = `<div class="pm-sb">${G().sbHtml ? G().sbHtml() : ''}</div>
            <div class="pm-editbar"><span class="add" onclick="gyPmAddWidget()" title="加小组件">＋</span><span class="lib" onclick="gyPmLibrary()">资源库</span><span class="done" onclick="gyPmEdit(false)">完成</span></div>
            <div class="pm-pages">${pages}</div>
            <div class="pm-pg">${Array.from({ length: nP }, (_, i) => `<i class="${i === cur ? 'on' : ''}" onclick="gyPmPage(${i})"></i>`).join('')}<i class="newpg" onclick="gyPmNewPage()" title="加一页">＋</i></div>
            <div class="pm-dock" data-where="dockbox">${C.dock.map((k, i) => iconHtml(k, 'dock', 0, i)).join('')}</div>
            ${locked ? lockHtml() : ''}`;
        const box = home.querySelector('.pm-pages');
        if (box) {
            box.scrollLeft = keepX != null ? keepX : cur * box.clientWidth;
            [...home.querySelectorAll('.pm-page')].forEach((e, i) => { if (keepY[i]) e.scrollTop = keepY[i]; });
            box.onscroll = () => { const n = Math.round(box.scrollLeft / Math.max(1, box.clientWidth)); if (n !== cur) { cur = n; home.querySelectorAll('.pm-pg i:not(.newpg)').forEach((d, i) => d.classList.toggle('on', i === cur)); } };
        }
        home.scrollTop = 0; home.scrollLeft = 0;   // 桌面本身不许被「滚」走（overflow:hidden 的元素也能被代码滚动）
        if (!home.__pmBound) { home.__pmBound = true; bind(home); home.addEventListener('scroll', () => { if (home.scrollTop || home.scrollLeft) { home.scrollTop = 0; home.scrollLeft = 0; } }); }
        if (D.srcId) { const el = home.querySelector(`[data-id="${D.srcId}"]`); if (el) { el.classList.add('pm-src'); D.src = el; } }
    };
    const render = () => window.gyPmHomeRender();
    window.gyPmPage = function (n) {
        const box = document.querySelector('#gyPmHome .pm-pages'); if (!box) return;
        cur = n; box.scrollTo({ left: n * box.clientWidth, behavior: 'smooth' });
    };
    window.gyPmNewPage = function () { C.pages.push([]); save(); cur = C.pages.length - 1; render(); window.gyPmPage(cur); window.gyPmEdit(true); };

    // 📚 App 资源库：不占桌面一页，做成从底下拉上来的一张（编辑时顶上「资源库」、美化里、页码旁边的小方格都能打开）
    function libGrid() {
        const all = (G().APPS || []).filter(a => !q || a[1].includes(q) || appName(a[0]).includes(q));
        const onDesk = new Set([...C.dock, ...C.pages.flat().filter(x => x.t === 'app').map(x => x.k)]);
        return all.map(a => iconHtml(a[0], 'lib').replace('class="pm-app pm-item"', `onclick="gyPmLibTap('${a[0]}')" class="pm-app pm-item${onDesk.has(a[0]) ? '' : ' off'}"`)).join('');
    }
    window.gyPmLibrary = function () {
        window.gyPmSheet(`<h4>App 资源库</h4>
            <label class="pm-lib-s">⌕<input placeholder="搜一下" value="${esc(q)}" oninput="gyPmLibQ(this.value)"></label>
            <div class="pm-grid lib" id="gyPmLibGrid">${libGrid()}</div>
            <div class="pm-lib-tip">淡一点的是没摆在桌面上的。${editing ? '现在点它就放回桌面。' : '点一下打开；想放回桌面，先长按桌面进编辑再来点。'}</div>
            <button class="it muted" onclick="gyPmCloseSheet()">好了</button>`);
    };
    window.gyPmLibQ = function (v) { q = String(v || ''); const g = document.getElementById('gyPmLibGrid'); if (g) g.innerHTML = libGrid(); };
    window.gyPmLibTap = function (k) {
        if (editing) { addBack(k); const g = document.getElementById('gyPmLibGrid'); if (g) g.innerHTML = libGrid(); return; }
        G().closeSheet(); window.gyPmOpen(k);
    };

    /* ---------------- 锁屏 ---------------- */
    function lockHtml() {
        const d = new Date(), wk = '日一二三四五六'[d.getDay()];
        let ns = []; try { ns = (globalNotifications || []).slice(0, 4); } catch (e) {}
        const lw = C.lockWall || (!C.lockColor && C.wall), lc = C.lockColor || (!C.lockWall && C.wallColor);
        const bg = lw ? `background-image:url('${lw}')` : (lc ? `background:${lc}` : '');
        return `<div class="pm-lock${lw || /#1c1c1e|#000000|#2c2c2e/.test(lc || '') ? ' has-wall' : ''}" style="${bg}" onclick="gyPmUnlock()">
            <div class="pm-sb">${G().sbHtml ? G().sbHtml() : ''}</div>
            <div class="lk-d pm-hf">${d.getMonth() + 1}月${d.getDate()}日 星期${wk}</div>
            <div class="lk-t pm-hf">${pad(d.getHours())}:${pad(d.getMinutes())}</div>
            <div class="lk-ns">${ns.map(n => `<div class="lk-n"><b>${esc(String(n.text || '').replace(/<[^>]+>/g, '').slice(0, 60))}</b><span>${esc(ago(n.timestamp))}</span></div>`).join('')}</div>
            <div class="lk-u">︿<br>轻点解锁</div></div>`;
    }
    window.gyPmLockNow = function () { locked = C.lock !== false; render(); };
    window.gyPmUnlock = function () {
        const el = document.querySelector('#gyPmHome .pm-lock');
        locked = false;
        if (el) { el.classList.add('out'); setTimeout(() => { el.remove(); }, 380); } else render();
    };

    /* ---------------- 编辑桌面：长按、拖动、删除 ---------------- */
    let editing = false, suppress = false;
    window.gyPmEdit = function (on) {
        editing = !!on;
        document.body.classList.toggle('gyphm-edit', editing);
        if (!editing) { G().closeSheet && G().closeSheet(); render(); }
    };
    function itemAt(x, y) {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        return el.closest('#gyPmHome .pm-item, #gyPmHome .pm-dock, #gyPmHome .pm-page');
    }
    // 拖动的状态放外面：拖的过程中桌面会重画（图标自动让位），不能跟着重画丢掉
    const D = { t: null, sx: 0, sy: 0, src: null, srcId: null, ghost: null, drag: false, edgeT: null, hot: null, lastMove: 0 };
    function bind(home) {
        const clear = () => { clearTimeout(D.t); D.t = null; };
        home.onpointerdown = e => {
            if (locked || e.button === 2) return;
            if (e.target.closest('.pm-editbar,.pm-pg,.pm-lib-s,input,textarea,[data-mc],[data-todo],[data-todoadd],.pm-sb')) return;
            D.sx = e.clientX; D.sy = e.clientY; D.drag = false;
            D.src = e.target.closest('.pm-item');
            if (!editing) { clear(); D.t = setTimeout(() => { suppress = true; window.gyPmEdit(true); }, 520); return; }
            if (D.src && (D.src.dataset.where === 'lib' || e.target.closest('[data-del]'))) D.src = null;
        };
        home.onpointermove = e => {
            if (!editing) { if (D.t && (Math.abs(e.clientX - D.sx) > 8 || Math.abs(e.clientY - D.sy) > 8)) clear(); return; }
            if (!D.src) return;
            if (!D.drag && Math.hypot(e.clientX - D.sx, e.clientY - D.sy) > 6) {
                D.drag = true;
                try { home.setPointerCapture(e.pointerId); } catch (er) {}
                const r = D.src.getBoundingClientRect();
                D.ghost = D.src.cloneNode(true); D.ghost.classList.add('pm-ghost');
                D.ghost.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:2020;pointer-events:none;`;
                document.body.appendChild(D.ghost); D.src.classList.add('pm-src');
                D.ghost.__dx = D.sx - r.left; D.ghost.__dy = D.sy - r.top;
                D.srcId = D.src.dataset.id || null;
            }
            if (!D.drag) return;
            D.ghost.style.left = (e.clientX - D.ghost.__dx) + 'px'; D.ghost.style.top = (e.clientY - D.ghost.__dy) + 'px';
            const tg = itemAt(e.clientX, e.clientY);
            if (D.hot && D.hot !== tg) D.hot.classList.remove('pm-hot');
            D.hot = tg && tg !== D.src ? tg : null;
            // 在桌面上拖：碰到谁就马上挤进它的位置，其他图标自动让开（跟真手机一样）
            if (D.hot && D.srcId && D.hot.classList.contains('pm-item') && D.hot.dataset.where === 'page' && D.src.dataset.where === 'page' && Date.now() - D.lastMove > 170) {
                const s0 = posOf(D.src), t0 = posOf(D.hot);
                if (s0 && t0) {
                    const it = C.pages[s0.p].splice(s0.i, 1)[0];
                    C.pages[t0.p].splice(Math.min(t0.i, C.pages[t0.p].length), 0, it);
                    D.lastMove = Date.now(); D.hot = null; render();
                }
            } else if (D.hot) D.hot.classList.add('pm-hot');
            // 拖到屏幕左右边上停一下：翻页
            const box = home.querySelector('.pm-pages'), br = box.getBoundingClientRect();
            const edge = e.clientX > br.right - 22 ? 1 : e.clientX < br.left + 22 ? -1 : 0;
            if (edge && !D.edgeT) D.edgeT = setTimeout(() => { D.edgeT = null; const n = Math.max(0, Math.min(C.pages.length - 1, cur + edge)); if (n !== cur) window.gyPmPage(n); }, 550);
            if (!edge && D.edgeT) { clearTimeout(D.edgeT); D.edgeT = null; }
        };
        home.onpointerup = e => {
            clear(); clearTimeout(D.edgeT); D.edgeT = null;
            if (D.hot) D.hot.classList.remove('pm-hot');
            if (D.drag) {
                const tg = itemAt(e.clientX, e.clientY);
                if (D.ghost) D.ghost.remove(); D.ghost = null;
                const src = D.src; if (src) src.classList.remove('pm-src');
                // 桌面上已经边拖边排好了；这里只管「拖进 / 拖出 Dock」和「拖到别的页的空地」
                if (src && tg && tg !== src && (tg.classList.contains('pm-dock') || tg.dataset.where === 'dock' || src.dataset.where === 'dock' || tg.classList.contains('pm-page'))) dropOn(src, tg);
                else if (src && tg && tg !== src && tg.classList.contains('pm-item') && tg.dataset.where === 'page' && src.dataset.where === 'page') {
                    // 拖得太快、边拖边让位没跟上：松手时落在谁上面就放到谁的位置
                    const s0 = posOf(src), t0 = posOf(tg);
                    if (s0 && t0) { const it = C.pages[s0.p].splice(s0.i, 1)[0]; C.pages[t0.p].splice(Math.min(t0.i, C.pages[t0.p].length), 0, it); }
                    save(); render();
                }
                else { save(); render(); }
                suppress = true; setTimeout(() => { suppress = false; }, 50);
            }
            D.src = null; D.srcId = null; D.drag = false; D.hot = null;
        };
        home.onpointercancel = () => { clear(); if (D.ghost) D.ghost.remove(); D.ghost = null; if (D.src) D.src.classList.remove('pm-src'); D.src = null; D.srcId = null; D.drag = false; };
        home.oncontextmenu = e => { if (locked) return; e.preventDefault(); if (!editing) window.gyPmEdit(true); };
        home.onclick = e => {
            if (locked) return;
            if (suppress) { suppress = false; return; }
            const it = e.target.closest('.pm-item');
            if (!it) return;
            if (editing) {
                if (e.target.closest('[data-del]')) { removeItem(it); return; }
                window.gyPmItemSheet(it.dataset.wid || null, it.dataset.wid ? null : it.dataset.pmapp, it.dataset.where === 'dock');
                return;
            }
            const mc = e.target.closest('[data-mc]');
            if (mc) {
                try { ({ prev: window.gymPrev, next: window.gymNext, toggle: window.gymToggle }[mc.dataset.mc] || (() => {}))(); } catch (er) {}
                setTimeout(tickMusic, 250); setTimeout(tickMusic, 900); return;
            }
            const ta = e.target.closest('[data-todoadd]');
            if (ta) { window.gyPmTodoAdd(ta.dataset.todoadd); return; }
            const td = e.target.closest('[data-todo]');
            if (td) {
                const [wid, ix] = td.dataset.todo.split('|'); const w = findW(wid);
                if (w && w.d && w.d.items && w.d.items[+ix]) { w.d.items[+ix].done = !w.d.items[+ix].done; save(); render(); }
                return;
            }
            const wd = e.target.closest('[data-day]');
            if (wd) { window.gyPmCalendar(wd.dataset.day); return; }
            if (it.dataset.wid) {
                const w = findW(it.dataset.wid); const def = w && WD[w.k];
                if (def && def.tap) def.tap(w);
                return;
            }
            if (it.dataset.pmapp) window.gyPmOpen(it.dataset.pmapp);
        };
    }
    const findW = id => { for (const pg of C.pages) { const w = pg.find(x => x.id === id); if (w) return w; } return null; };
    function posOf(el) {
        if (!el) return null;
        if (el.classList.contains('pm-dock')) return { where: 'dock', i: C.dock.length };
        if (el.classList.contains('pm-page')) return el.dataset.page === 'lib' ? null : { where: 'page', p: +el.dataset.page, i: C.pages[+el.dataset.page].length };
        const w = el.dataset.where;
        if (w === 'page') return { where: 'page', p: +el.dataset.p, i: +el.dataset.i };
        if (w === 'dock') return { where: 'dock', i: +el.dataset.i };
        return null;
    }
    function dropOn(srcEl, tgEl) {
        const s = posOf(srcEl), t = posOf(tgEl);
        if (!s || !t) return;
        const isW = !!srcEl.dataset.wid;
        if (t.where === 'dock' && isW) { toast('小组件放不进 Dock'); return; }
        // 取出来
        let item;
        if (s.where === 'page') item = C.pages[s.p].splice(s.i, 1)[0];
        else { const k = C.dock.splice(s.i, 1)[0]; item = { id: uid(), t: 'app', k }; }
        let ti = t.i;
        if (s.where === t.where && (t.where === 'dock' || s.p === t.p) && s.i < ti && tgEl.classList.contains('pm-item')) ti = ti;   // 往后拖：落到目标后面
        if (t.where === 'dock') {
            if (C.dock.length >= 5) {   // 满了：跟目标换
                const k2 = C.dock.splice(Math.min(ti, C.dock.length - 1), 1)[0];
                if (s.where === 'page') C.pages[s.p].splice(s.i, 0, { id: uid(), t: 'app', k: k2 }); else C.dock.push(k2);
            }
            C.dock.splice(Math.min(ti, C.dock.length), 0, item.k);
        } else {
            const pg = C.pages[t.p];
            pg.splice(Math.min(ti, pg.length), 0, item);
        }
        save(); render();
    }
    function removeItem(el) {
        const s = posOf(el); if (!s) return;
        if (s.where === 'dock') { C.dock.splice(s.i, 1); toast('已从 Dock 拿下来', '在「App 资源库」里还能找到（编辑时顶上的「资源库」）'); }
        else {
            const it = C.pages[s.p].splice(s.i, 1)[0];
            if (it && it.t === 'app') toast(`「${appName(it.k)}」收进了 App 资源库`, '编辑时点顶上的「资源库」，再点它就放回来');
        }
        save(); render();
    }
    function addBack(k) {
        let p = C.pages.findIndex(pg => pg.length < 24); if (p < 0) { C.pages.push([]); p = C.pages.length - 1; }
        C.pages[p].push({ id: uid(), t: 'app', k }); save(); toast(`「${appName(k)}」放回了第 ${p + 1} 页`); render();
    }

    /* ---------------- 编辑单个：App / 小组件 ---------------- */
    const SWATCH = ['#ffffff', '#f2f2f4', '#d1d1d6', '#8e8e93', '#3a3a3c', '#111111', '#f6e7e7', '#e7eef6', '#eaf2e6', '#f6f0e1'];
    window.gyPmItemSheet = function (wid, appKey, inDock) {
        if (wid) {
            const w = findW(wid); if (!w) return; const def = WD[w.k];
            const page = C.pages.findIndex(pg => pg.includes(w));
            window.gyPmSheet(`<h4>${esc(def.n)}</h4>
                ${def.sizes.length > 1 ? `<div class="lbl">大小</div><div class="seg">${def.sizes.map(z => `<span class="chip${w.size === z ? ' on' : ''}" onclick="gyPmWSize('${w.id}','${z}')">${{ s: '小', m: '中', l: '大' }[z]}</span>`).join('')}</div>` : ''}
                ${def.edit ? def.edit(w) : ''}
                ${C.pages.length > 1 ? `<div class="lbl">放到</div><div class="chips">${C.pages.map((_, i) => `<span class="chip${i === page ? ' on' : ''}" onclick="gyPmMoveTo('${w.id}',null,${i})">第 ${i + 1} 页</span>`).join('')}</div>` : ''}
                <button class="it danger" onclick="gyPmWDel('${w.id}')">删掉这个小组件</button>
                <button class="it pri" onclick="gyPmCloseSheet();gyPmHomeRender()">好了</button>`);
            return;
        }
        const k = appKey, a = appDef(k); if (!a) return;
        const page = C.pages.findIndex(pg => pg.some(x => x.t === 'app' && x.k === k));
        window.gyPmSheet(`<h4>${esc(appName(k))}</h4>
            <div class="lbl">名字</div><input class="in" value="${esc(appName(k))}" oninput="gyPmAppSet('${k}','name',this.value)">
            <div class="lbl">底色</div><div class="sw">${SWATCH.map(c => `<span style="background:${c}" onclick="gyPmAppSet('${k}','color','${c}')"></span>`).join('')}</div>
            <div class="lbl">图标</div>
            <label class="it">换成自己的图片<input type="file" accept="image/*" style="display:none" onchange="gyPmAppImg('${k}',this)"></label>
            <button class="it muted" onclick="gyPmAppSet('${k}','reset')">恢复原来的样子</button>
            ${inDock ? `<button class="it" onclick="gyPmDock('${k}',false)">从 Dock 拿下来放到桌面</button>` : (page >= 0 ? `<button class="it" onclick="gyPmDock('${k}',true)">放进 Dock</button>` : '')}
            ${!inDock && C.pages.length > 1 && page >= 0 ? `<div class="lbl">放到</div><div class="chips">${C.pages.map((_, i) => `<span class="chip${i === page ? ' on' : ''}" onclick="gyPmMoveTo(null,'${k}',${i})">第 ${i + 1} 页</span>`).join('')}</div>` : ''}
            <button class="it pri" onclick="gyPmCloseSheet();gyPmHomeRender()">好了</button>`);
    };
    window.gyPmWSet = function (id, key, val, quiet) {
        const w = findW(id); if (!w) return; w.d = Object.assign({}, w.d || {}, { [key]: val }); save();
        if (!quiet) window.gyPmItemSheet(id);
        render();
    };
    window.gyPmTodoAdd = function (id) {
        window.gyPmSheet(`<h4>加一件事</h4><input class="in" id="gyPmTodoIn" placeholder="比如：给 TA 回个电话" onkeydown="if(event.key==='Enter')gyPmTodoAddGo('${id}')"><button class="it pri" onclick="gyPmTodoAddGo('${id}')">加上</button><button class="it muted" onclick="gyPmCloseSheet()">算了</button>`);
        setTimeout(() => { const i = document.getElementById('gyPmTodoIn'); if (i) i.focus(); }, 80);
    };
    window.gyPmTodoAddGo = function (id) {
        const w = findW(id), v = ((document.getElementById('gyPmTodoIn') || {}).value || '').trim(); if (!w || !v) return;
        w.d = w.d || {}; w.d.items = (w.d.items || []).concat([{ t: v.slice(0, 40), done: false }]).slice(-12); save(); G().closeSheet(); render();
    };
    window.gyPmTodoText = function (id, v) {
        const w = findW(id); if (!w) return;
        const old = (w.d && w.d.items) || [];
        w.d = Object.assign({}, w.d || {}, { items: String(v || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12).map(t => ({ t, done: !!(old.find(o => o.t === t) || {}).done })) });
        save(); render();
    };
    window.gyPmWSize = function (id, z) { const w = findW(id); if (!w) return; w.size = z; save(); render(); window.gyPmItemSheet(id); };
    window.gyPmWDel = function (id) { C.pages.forEach(pg => { const i = pg.findIndex(x => x.id === id); if (i >= 0) pg.splice(i, 1); }); save(); G().closeSheet(); render(); };
    window.gyPmMoveTo = function (wid, k, p) {
        let it = null;
        C.pages.forEach(pg => { const i = pg.findIndex(x => wid ? x.id === wid : (x.t === 'app' && x.k === k)); if (i >= 0 && !it) it = pg.splice(i, 1)[0]; });
        if (it) C.pages[p].push(it);
        save(); G().closeSheet(); cur = p; render(); window.gyPmPage(p);
    };
    window.gyPmDock = function (k, into) {
        if (into) {
            if (C.dock.length >= 5) { toast('Dock 满了', '最多放 5 个，先拿下来一个'); return; }
            C.pages.forEach(pg => { const i = pg.findIndex(x => x.t === 'app' && x.k === k); if (i >= 0) pg.splice(i, 1); });
            C.dock.push(k);
        } else {
            C.dock = C.dock.filter(x => x !== k);
            (C.pages[cur] || C.pages[0]).push({ id: uid(), t: 'app', k });
        }
        save(); G().closeSheet(); render();
    };
    window.gyPmAppSet = function (k, what, v) {
        if (what === 'name') { if (v && v.trim()) C.names[k] = v.trim().slice(0, 8); else delete C.names[k]; save(); render(); return; }
        if (what === 'color') C.colors[k] = v;
        if (what === 'reset') { delete C.colors[k]; delete C.imgs[k]; delete C.names[k]; }
        if (what === 'resetimg') { delete C.imgs[k]; save(); render(); window.gyPmIcons(); return; }
        save(); render(); window.gyPmItemSheet(null, k, C.dock.includes(k));
    };
    function shrink(file, W, H, cb, q) {
        const img = new Image(), url = URL.createObjectURL(file);
        img.onload = () => {
            const r = Math.max(W / img.width, H / img.height);
            const c = document.createElement('canvas'); c.width = W; c.height = H;
            c.getContext('2d').drawImage(img, (W - img.width * r) / 2, (H - img.height * r) / 2, img.width * r, img.height * r);
            URL.revokeObjectURL(url); cb(c.toDataURL('image/jpeg', q || .85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); toast('这张图打不开'); };
        img.src = url;
    }
    window.gyPmAppImg = function (k, inp, fromList) {
        const f = inp && inp.files && inp.files[0]; if (!f) return;
        shrink(f, 144, 144, u => { C.imgs[k] = u; save(); render(); if (fromList) window.gyPmIcons(); else window.gyPmItemSheet(null, k, C.dock.includes(k)); });
    };
    window.gyPmWPhoto = function (id, inp) {
        const w = findW(id); if (!w || !inp || !inp.files || !inp.files.length) return;
        const files = [...inp.files];
        if (w.k === 'photo') {
            const L = photosOf(w);
            files.slice(0, Math.max(0, 9 - L.length)).forEach(f => shrink(f, 640, 640, u => { L.push(u); save(); render(); window.gyPmItemSheet(id); }));
            return;
        }
        shrink(files[0], 640, 640, u => { w.d = Object.assign({}, w.d || {}, { img: u }); save(); render(); window.gyPmItemSheet(id); });
    };

    /* ---------------- 加小组件 ---------------- */
    // ＋ 小组件：一张一张带预览，看得见长什么样再挑大小
    window.gyPmAddWidget = function () {
        const card = k => {
            const def = WD[k], z0 = def.sizes.includes('m') ? 'm' : def.sizes[0];
            let pv = ''; try { pv = def.r({ id: 'pv_' + k, k, size: z0, d: k === 'todo' ? { items: [{ t: '起床喝一杯热水', done: true }, { t: '回 TA 的消息', done: false }] } : (k === 'note' ? { text: '今天也要好好的。' } : {}) }); } catch (e) {}
            return `<div class="pm-wg-card"><div class="pv sz-${z0}"><div class="pm-w wk-${k} sz-${z0}">${pv}</div></div>
                <div class="nm"><b>${def.n}</b><span>${def.sizes.map(z => `<span class="chip" onclick="gyPmAddW('${k}','${z}')">${{ s: '小', m: '中', l: '大' }[z]}</span>`).join('')}</span></div></div>`;
        };
        window.gyPmSheet(`<h4>小组件</h4><div class="pm-wg-tip">挑一个，点大小就放到当前这页最上面；放上去以后长按能拖到任何位置，图标会自己让开。</div>
            <div class="pm-wg-list">${Object.keys(WD).map(card).join('')}</div>
            <button class="it muted" onclick="gyPmCloseSheet()">好了</button>`);
    };
    window.gyPmAddW = function (k, z) {
        const p = Math.min(cur, C.pages.length - 1);
        C.pages[p].unshift({ id: uid(), t: 'w', k, size: z, d: {} }); save(); G().closeSheet(); render();
        const pg = document.querySelector(`#gyPmHome .pm-page[data-page="${p}"]`); if (pg) pg.scrollTop = 0;
    };

    /* ---------------- 美化 ---------------- */
    const WALLS = ['#f2f2f4', '#ffffff', '#e9e6e1', '#e6e9ee', '#1c1c1e', '#000000', 'linear-gradient(160deg,#f5f5f7,#d9d9de)', 'linear-gradient(160deg,#e8e8ea,#bfc0c6)', 'linear-gradient(160deg,#2c2c2e,#0b0b0c)'];
    window.gyPmBeauty = function () {
        const opt = (key, val, lab) => `<span class="chip${C[key] === val ? ' on' : ''}" onclick="gyPmPref('${key}',${JSON.stringify(val).replace(/"/g, '&quot;')})">${lab}</span>`;
        window.gyPmSheet(`<h4>美化</h4>
            <div class="lbl">外观</div><div class="seg">${opt('dark', false, '浅色')}${opt('dark', true, '深色')}</div>
            <div class="lbl">壁纸</div><div class="sw">${WALLS.map((c, i) => `<span style="background:${c}" onclick="gyPmWall('color',${i})"></span>`).join('')}</div>
            <label class="it">从相册选一张桌面壁纸<input type="file" accept="image/*" style="display:none" onchange="gyPmWallFile(this)"></label>
            <div class="lbl">锁屏壁纸</div><div class="sw"><span class="same${!C.lockWall && !C.lockColor ? ' on' : ''}" title="跟桌面一样" onclick="gyPmLockWall('same')">同</span>${WALLS.map((c, i) => `<span style="background:${c}" onclick="gyPmLockWall('color',${i})"></span>`).join('')}</div>
            <label class="it">从相册选一张锁屏壁纸<input type="file" accept="image/*" style="display:none" onchange="gyPmLockWallFile(this)"></label>
            <button class="it" onclick="gyPmIcons()">换图标（每个 App 都能换成自己的图片）</button>
            <div class="lbl">图标</div><div class="seg">${opt('style', 'white', '白')}${opt('style', 'black', '黑')}${opt('style', 'glass', '玻璃')}${opt('style', 'hand', '手绘')}</div>
            <div class="lbl">字体</div><div class="seg">${opt('font', 'sys', '系统')}${opt('font', 'serif', '衬线')}${opt('font', 'hand', '手写')}</div>
            <div class="lbl">图标名字</div><div class="seg">${opt('labels', true, '显示')}${opt('labels', false, '不显示')}</div>
            <div class="lbl">锁屏</div><div class="seg">${opt('lock', true, '进来先锁屏')}${opt('lock', false, '不要锁屏')}</div>
            <button class="it" onclick="gyPmAddWidget()">小组件</button>
            <button class="it" onclick="gyPmLibrary()">App 资源库</button>
            <button class="it pri" onclick="gyPmCloseSheet();gyPmEdit(true)">编辑桌面</button>
            <button class="it" onclick="gyPmResetLayout()">桌面恢复默认摆法</button>
            <button class="it muted" onclick="gyPmCloseSheet()">好了</button>`);
    };
    window.gyPmLockWall = function (kind, v) {
        if (kind === 'same') { C.lockWall = null; C.lockColor = null; } else { C.lockWall = null; C.lockColor = WALLS[v]; }
        save(); window.gyPmBeauty();
    };
    window.gyPmLockWallFile = function (inp) {
        const f = inp && inp.files && inp.files[0]; if (!f) return;
        shrink(f, 780, 1688, u => { C.lockWall = u; C.lockColor = null; save(); window.gyPmBeauty(); }, .86);
    };
    // 🎨 换图标：所有 App 一张表，每个都能换图片 / 还原
    window.gyPmIcons = function () {
        window.gyPmSheet(`<h4>换图标</h4><div class="pm-wg-tip">点「换图片」挑一张，会自动裁成方的；「还原」回到原来的样子。改名字、换底色在编辑桌面时点图标。</div>
            <div class="pm-ic-list">${(G().APPS || []).map(a => `<div class="row">${iconHtml(a[0], 'lib')}<b>${esc(appName(a[0]))}</b>
                <label class="mini">换图片<input type="file" accept="image/*" style="display:none" onchange="gyPmAppImg('${a[0]}',this,1)"></label>${C.imgs[a[0]] ? `<span class="mini" onclick="gyPmAppSet('${a[0]}','resetimg')">还原</span>` : ''}</div>`).join('')}</div>
            <button class="it muted" onclick="gyPmBeauty()">返回美化</button>`);
    };
    window.gyPmPref = function (k, v) { C[k] = v; save(); applyPrefs(); render(); window.gyPmBeauty(); };
    window.gyPmWall = function (kind, v) {
        if (kind === 'color') { C.wall = null; C.wallColor = typeof v === 'number' ? WALLS[v] : v; } else { C.wall = null; C.wallColor = null; }
        save(); render(); window.gyPmBeauty();
    };
    window.gyPmWallFile = function (inp) {
        const f = inp && inp.files && inp.files[0]; if (!f) return;
        shrink(f, 780, 1688, u => { C.wall = u; C.wallColor = null; save(); render(); window.gyPmBeauty(); }, .86);
    };
    window.gyPmResetLayout = function () {
        if (!confirm('桌面恢复成默认的摆法？（壁纸和美化设置不变，小组件和自己改的图标会还原）')) return;
        const keep = { wall: C.wall, wallColor: C.wallColor, lockWall: C.lockWall, lockColor: C.lockColor, style: C.style, font: C.font, labels: C.labels, lock: C.lock, dark: C.dark, imgs: C.imgs };
        C = Object.assign(DEF(), keep); cur = 0; save(); G().closeSheet(); render();
    };

    /* ---------------- 📅 日历 App：你的日程、纪念日、角色生日、那天写的日记，画在同一个月里 ---------------- */
    const CAL = { y: 0, m: 0, sel: null };
    const dkey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
    function calDay(k) {
        let x = { mine: [], anniv: [], birth: [] };
        try { if (typeof window.gyMyCalDay === 'function') x = window.gyMyCalDay(k); } catch (e) {}
        const diaries = [];
        try {
            (typeof globalUserDiaries !== 'undefined' ? globalUserDiaries : []).forEach(d => {
                const t = new Date(d.date || d.timestamp || 0); if (isNaN(t)) return;
                if (dkey(t.getFullYear(), t.getMonth(), t.getDate()) === k) diaries.push(d.title || '无题');
            });
        } catch (e) {}
        return Object.assign({}, x, { diaries });
    }
    function calHtml() {
        const now = new Date(), tk = dkey(now.getFullYear(), now.getMonth(), now.getDate());
        const first = new Date(CAL.y, CAL.m, 1).getDay(), days = new Date(CAL.y, CAL.m + 1, 0).getDate();
        let cells = '';
        for (let i = 0; i < first; i++) cells += '<span></span>';
        for (let d = 1; d <= days; d++) {
            const k = dkey(CAL.y, CAL.m, d), x = calDay(k);
            const dots = [x.mine.length ? '<i class="a"></i>' : '', x.anniv.length ? '<i class="b"></i>' : '', x.birth.length ? '<i class="c"></i>' : '', x.diaries.length ? '<i class="d"></i>' : ''].join('');
            cells += `<span class="c${k === tk ? ' today' : ''}${k === CAL.sel ? ' sel' : ''}" onclick="gyPmCalPick('${k}')"><b>${d}</b><em>${dots}</em></span>`;
        }
        const k = CAL.sel || tk, x = calDay(k), dd = new Date(k + 'T00:00:00');
        const rows = [
            ...x.mine.map(it => `<div class="ev"><i class="a"></i><div><b>${esc(it.text || '')}</b><span>${esc([it.time, it.place].filter(Boolean).join(' · ') || '我的日程')}</span></div></div>`),
            ...x.anniv.map(t => `<div class="ev"><i class="b"></i><div><b>${esc(t)}</b><span>纪念日</span></div></div>`),
            ...x.birth.map(t => `<div class="ev"><i class="c"></i><div><b>${esc(t)} 的生日</b><span>生日</span></div></div>`),
            ...x.diaries.map(t => `<div class="ev"><i class="d"></i><div><b>《${esc(t)}》</b><span>那天写的日记</span></div></div>`)
        ];
        return `<div class="pmc">
            <div class="pmc-hd"><div><em>${CAL.y}年</em><b>${CAL.m + 1}月</b></div><span class="nav"><i onclick="gyPmCalMove(-1)">‹</i><i class="t" onclick="gyPmCalMove(0)">今天</i><i onclick="gyPmCalMove(1)">›</i></span></div>
            <div class="pmc-wk">${'日一二三四五六'.split('').map(x => `<span>${x}</span>`).join('')}</div>
            <div class="pmc-grid">${cells}</div>
            <div class="pmc-lg"><span><i class="a"></i>我的日程</span><span><i class="b"></i>纪念日</span><span><i class="c"></i>生日</span><span><i class="d"></i>日记</span></div>
            <div class="pmc-day"><h5>${dd.getMonth() + 1}月${dd.getDate()}日 星期${WK[dd.getDay()]}${k === tk ? ' · 今天' : ''}</h5>
                ${rows.length ? rows.join('') : '<div class="none">这一天什么都没有</div>'}
                <button class="pmc-add" onclick="gyPmCalAdd('${k}')">＋ 在这一天记一条</button></div></div>`;
    }
    function calPaint() { const n = document.getElementById('gyPmApp'); if (n && document.body.classList.contains('gyphm-native')) n.innerHTML = calHtml(); }
    window.gyPmCalendar = function (k) {
        const d = k ? new Date(k + 'T00:00:00') : new Date();
        CAL.y = d.getFullYear(); CAL.m = d.getMonth(); CAL.sel = k || null;
        window.gyPmNative('日历', calHtml());
    };
    window.gyPmCalPick = function (k) { CAL.sel = k; calPaint(); };
    window.gyPmCalMove = function (n) {
        if (!n) { const d = new Date(); CAL.y = d.getFullYear(); CAL.m = d.getMonth(); CAL.sel = null; }
        else { CAL.m += n; if (CAL.m < 0) { CAL.m = 11; CAL.y--; } if (CAL.m > 11) { CAL.m = 0; CAL.y++; } CAL.sel = null; }
        calPaint();
    };
    // 记一条：开谷雨原来的「我的日程」（在手机屏幕里弹出来），日期先填好
    window.gyPmCalAdd = function (k) {
        try {
            if (typeof openUserProfileModal === 'function') openUserProfileModal(); else if (typeof openModal === 'function') openModal('userProfileModal');
            if (typeof openUserPanel === 'function') openUserPanel('myday');
            setTimeout(() => { const e = document.getElementById('gymdDate'); if (e) e.value = k; }, 150);
        } catch (e) {}
        // 关掉弹窗回来时刷新一下日历
        const iv = setInterval(() => { const m = document.getElementById('userProfileModal'); if (!m || getComputedStyle(m).display === 'none') { clearInterval(iv); calPaint(); render(); } }, 600);
    };

    /* ---------------- 样式 ---------------- */
    const CSS = `
#gyPmHome{position:fixed;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#gyPmHome .pm-pages{flex:1;min-height:0;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain}
#gyPmHome .pm-pages::-webkit-scrollbar{display:none}
#gyPmHome .pm-page{flex:0 0 100%;scroll-snap-align:start;overflow-y:auto;overflow-x:hidden;padding:8px 20px 12px;box-sizing:border-box;scrollbar-width:none}
#gyPmHome .pm-page::-webkit-scrollbar{display:none}
#gyPmHome .pm-grid{grid-auto-rows:76px;gap:14px 10px;grid-auto-flow:row dense;min-height:100%;align-content:start;padding-top:2px}
#gyPmHome .pm-app{justify-content:flex-start}
#gyPmHome .pm-w{margin:0;padding:14px 15px;overflow:hidden;box-sizing:border-box;cursor:pointer;position:relative;border-radius:22px}
#gyPmHome .sz-s{grid-column:span 2;grid-row:span 2}
#gyPmHome .sz-m{grid-column:span 4;grid-row:span 2}
#gyPmHome .sz-l{grid-column:span 4;grid-row:span 4}
.wg-h{font-size:11px;color:var(--pm-sub);margin-bottom:9px;letter-spacing:1.5px;font-weight:600;text-transform:uppercase}
.wg-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--pm-sub);font-size:13.5px;line-height:1.6}
.wg-empty small{font-size:11.5px;opacity:.8}
#gyPmHome .wk-recent{display:flex;flex-direction:column;justify-content:center}
.wg-clock.s{height:100%;display:flex;flex-direction:column;justify-content:center;gap:2px}
.wg-clock.s .k{font-size:11px;letter-spacing:1.5px;color:var(--pm-sub);font-weight:600}
.wg-clock.s b{font-family:var(--pm-num);font-size:50px;font-weight:200;line-height:1.05;letter-spacing:-1px}
.wg-clock.s span:last-child{font-size:13px;color:var(--pm-sub)}
#gyPmHome .wk-aclock.sz-s{padding:10px}
.wg-ac.s{height:100%;display:flex;align-items:center;justify-content:center}
.wg-ac .dial{filter:drop-shadow(0 4px 10px rgba(0,0,0,.08));border-radius:50%}
.wg-ac.m{height:100%;display:flex;justify-content:space-around;align-items:center}
.wg-ac.m .c{display:flex;flex-direction:column;align-items:center;gap:3px}
.wg-ac.m b{font-size:15px;font-weight:700;margin-top:4px}
.wg-ac.m span{font-size:11px;color:var(--pm-sub)}
#gyPmHome .wk-cal.sz-s{padding:8px}
.wg-cal-s{height:100%;display:flex;flex-direction:column;gap:6px}
.wg-cal-s .ph{flex:1;border-radius:16px;background:var(--pm-fill) center/cover;display:flex;align-items:center;justify-content:center}
.wg-cal-s .ph.empty span{font-size:11px;color:var(--pm-sub)}
.wg-cal-s .bt{display:flex;justify-content:space-between;align-items:flex-end;padding:0 6px 2px}
.wg-cal-s .bt b{font-family:var(--pm-num);font-size:36px;font-weight:700;line-height:1;letter-spacing:-1px}
.wg-cal-s .bt span{font-size:11.5px;color:var(--pm-sub);text-align:right;line-height:1.35;font-weight:500}
.wg-cal-m{display:flex;gap:14px;height:100%}
.wg-cal-m .big{flex:0 0 34%;display:flex;flex-direction:column;justify-content:center}
.wg-cal-m .big em{font-style:normal;color:var(--pm-red);font-size:12px;font-weight:700;letter-spacing:1.5px}
.wg-cal-m .big b{font-family:var(--pm-num);font-size:52px;font-weight:300;line-height:1.05}
.wg-cal-m .big span{font-size:12px;color:var(--pm-sub)}
.wg-cal-g{flex:1;display:grid;grid-template-columns:repeat(7,1fr);font-size:10.5px;text-align:center;align-content:center;gap:1px 0;font-family:var(--pm-num)}
.wg-cal-g i{font-style:normal;line-height:19px;border-radius:50%;width:19px;justify-self:center}
.wg-cal-g i.h{color:var(--pm-sub);font-weight:600}
.wg-cal-g i.on{background:var(--pm-accent);color:var(--pm-accent-fg);font-weight:700}
.wg-week{height:100%;display:grid;grid-template-columns:repeat(7,1fr);align-items:center}
.wg-week .dy{display:flex;flex-direction:column;align-items:center;gap:7px;padding:9px 0;border-radius:14px}
.wg-week em{font-style:normal;font-size:10px;letter-spacing:1px;color:var(--pm-sub);font-weight:600}
.wg-week b{font-family:var(--pm-num);font-size:19px;font-weight:500}
.wg-week i{width:4px;height:4px;border-radius:50%;background:transparent}
.wg-week .dy.on{background:var(--pm-accent);color:var(--pm-accent-fg)}
.wg-week .dy.on em{color:var(--pm-accent-fg);opacity:.7}.wg-week .dy.on i{background:var(--pm-accent-fg)}
.wg-mu{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.wg-mu .top{display:flex;gap:12px;align-items:center}
.wg-mu .cv{width:50px;height:50px;border-radius:12px;background:var(--pm-fill) center/cover;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--pm-sub);box-shadow:0 4px 10px rgba(0,0,0,.08)}
.wg-mu .cv svg{width:24px;height:24px}
.wg-mu .tt{min-width:0;flex:1}
.wg-mu .tt b{display:block;font-size:15.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wg-mu .tt span{display:block;font-size:12.5px;color:var(--pm-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.wg-mu .ctl{display:flex;justify-content:center;gap:34px;align-items:center}
.wg-mu .ctl span{width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--pm-text)}
.wg-mu .ctl span svg{width:22px;height:22px}
.wg-mu .ctl .pp svg{width:30px;height:30px}
.wg-mu .bar{display:flex;align-items:center;gap:9px;font-size:10.5px;color:var(--pm-sub);font-family:var(--pm-num)}
.wg-mu .bar i{flex:1;height:3px;border-radius:2px;background:var(--pm-fill);overflow:hidden}
.wg-mu .bar u{display:block;height:100%;background:var(--pm-text);text-decoration:none}
.wg-we{height:100%;display:flex}
.wg-we.s{flex-direction:column;justify-content:space-between}
.wg-we .ct{font-size:13px;font-weight:600}
.wg-we b{font-family:var(--pm-num);font-size:44px;font-weight:300;line-height:1}
.wg-we .ic{width:26px;height:26px;color:var(--pm-text)}.wg-we .ic svg{width:100%;height:100%}
.wg-we span{font-size:12px;color:var(--pm-sub)}
.wg-we.s .rg{font-size:11px}
.wg-we.m{justify-content:space-between;align-items:center}
.wg-we.m>div:first-child{display:flex;flex-direction:column;gap:6px}
.wg-we.m .r{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.wg-bt{height:100%;display:flex;align-items:center;justify-content:center;position:relative;color:var(--pm-text)}
.wg-bt .in{position:absolute;display:flex;flex-direction:column;align-items:center}
.wg-bt .in b{font-family:var(--pm-num);font-size:20px;font-weight:600}
.wg-bt .in span{font-size:10.5px;color:var(--pm-sub)}
.wg-bt{flex-direction:column}.wg-bt .in{top:calc(50% - 30px)}.wg-bt .svl{font-style:normal;font-size:10.5px;color:var(--pm-sub);margin-top:4px}.wg-bt.sv .svl{color:#b38f00;font-weight:600}
.wg-todo{height:100%;display:flex;flex-direction:column;gap:7px}
.wg-todo .h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.wg-todo .h b{font-size:16px;font-weight:700}
.wg-todo .h span{font-size:11.5px;color:var(--pm-sub);font-family:var(--pm-num)}
.wg-todo .ti{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;min-width:0}
.wg-todo .ti i{width:15px;height:15px;border-radius:50%;box-shadow:inset 0 0 0 1.4px var(--pm-sub);flex-shrink:0;position:relative}
.wg-todo .ti.done i{background:var(--pm-accent);box-shadow:none}
.wg-todo .ti.done i::after{content:"";position:absolute;left:5px;top:2.5px;width:3.5px;height:7px;border:solid var(--pm-accent-fg);border-width:0 1.6px 1.6px 0;transform:rotate(45deg)}
.wg-todo .ti span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wg-todo .ti.done span{color:var(--pm-sub);text-decoration:line-through}
.wg-ct{height:100%;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px;min-width:0}
.wg-ct .av{width:58px;height:58px;border-radius:50%;overflow:hidden;display:flex;position:relative;box-shadow:0 4px 12px rgba(0,0,0,.1)}
.wg-ct .av>*:not(.dot){width:100%!important;height:100%!important;border-radius:50%!important;border:none!important;box-shadow:none!important;margin:0!important}
.wg-ct .dot{position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;background:var(--pm-red);border:2px solid var(--pm-card)}
.wg-ct b{font-size:16px;font-weight:600}
.wg-ct span{font-size:12px;color:var(--pm-sub);width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wg-note{height:100%;font-size:15px;line-height:1.7;overflow:hidden;color:var(--pm-text)}
.wg-note::before{content:"NOTE";display:block;font-family:var(--pm-font);font-size:10.5px;letter-spacing:2px;color:var(--pm-sub);font-weight:700;margin-bottom:4px}
.wg-count{height:100%;display:flex;flex-direction:column;justify-content:center;gap:3px}
.wg-count .tt{font-size:13px;color:var(--pm-sub);font-weight:500}
.wg-count .nn{display:flex;align-items:baseline;gap:4px}
.wg-count em{font-style:normal;font-size:13px;color:var(--pm-sub)}
.wg-count b{font-family:var(--pm-num);font-size:46px;font-weight:300;line-height:1.05;letter-spacing:-1px}
.wg-count .dd{font-size:11px;color:var(--pm-sub);font-family:var(--pm-num)}
.wg-count.m{flex-direction:row;align-items:center;justify-content:space-between}
.wg-count.m .lb{font-size:12px;padding:5px 12px;border-radius:999px;background:var(--pm-fill);color:var(--pm-text);font-weight:600}
#gyPmHome .wg-photo{position:absolute;inset:0;background-size:cover;background-position:center}
#gyPmHome .wg-photo.empty{display:flex;align-items:center;justify-content:center;background:var(--pm-fill);color:var(--pm-sub)}
#gyPmHome .wg-photo .cam svg{width:34px;height:34px}
#gyPmHome .wg-photo .cap{position:absolute;left:14px;bottom:10px;font-size:22px;font-weight:600;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.3)}
#gyPmHome .wg-photo.empty .cap{color:var(--pm-text);text-shadow:none}
.wg-un{height:100%;display:flex;flex-direction:column;justify-content:center}
.wg-un .h{font-size:12px;color:var(--pm-sub);font-weight:600;letter-spacing:1px}
.wg-un b{font-family:var(--pm-num);font-size:54px;font-weight:300;line-height:1.05}
.wg-un span{font-size:12px;color:var(--pm-sub)}
.wg-say{height:100%;display:flex;flex-direction:column;justify-content:center;gap:10px}
.wg-say .q{font-size:16px;line-height:1.6;font-weight:500}
.wg-say .by{font-size:12px;color:var(--pm-sub);text-align:right}
#gyPmHome .pm-pg{flex-shrink:0;align-items:center;margin:4px 0 10px}
#gyPmHome .pm-pg i{cursor:pointer}
#gyPmHome .pm-pg i.lib{border-radius:2px}
#gyPmHome .pm-pg .newpg{display:none;width:auto;height:auto;background:none;opacity:.8;font-style:normal;font-size:14px;line-height:1;margin-left:6px;color:var(--pm-text)}
body.gyphm-edit #gyPmHome .pm-pg .newpg{display:inline}
#gyPmHome.has-wall .pm-pg i,#gyPmHome.dark-wall .pm-pg i{background:#fff}
#gyPmHome .pm-dock{grid-template-columns:repeat(auto-fit,minmax(0,1fr));min-height:64px}
.pm-lib-h{font-size:30px;font-weight:700;margin:6px 2px 12px;letter-spacing:-.5px}
.pm-lib-s{display:flex;align-items:center;gap:6px;height:38px;border-radius:12px;background:var(--pm-card);padding:0 12px;margin-bottom:16px;box-shadow:0 0 0 .5px var(--pm-hair)}
.pm-lib-s input{border:none;outline:none;background:transparent;flex:1;font-size:15px;color:var(--pm-text);padding:0;box-shadow:none;font-family:inherit}
#gyPmHome .pm-grid.lib{min-height:0}
#gyPmHome .pm-app.off{opacity:.4}
.pm-lib-tip{font-size:11.5px;color:var(--pm-sub);text-align:center;margin:16px 0 8px}
#gyPmHome.has-wall .pm-lib-h,#gyPmHome.has-wall .pm-lib-tip,#gyPmHome.dark-wall .pm-lib-h,#gyPmHome.dark-wall .pm-lib-tip,#gyPmHome.dark-wall .pm-page .pm-lb{color:#fff}
#gyPmHome.dark-wall .pm-sb{color:#fff}#gyPmHome.dark-wall .pm-sb .pm-bat b{color:#333}
/* 编辑 */
#gyPmHome .pm-editbar{display:none;position:absolute;top:10px;left:16px;right:16px;height:34px;z-index:5;align-items:center;justify-content:space-between}
body.gyphm-edit #gyPmHome .pm-editbar{display:flex}
body.gyphm-edit #gyPmHome .pm-sb{visibility:hidden}
.pm-editbar span{cursor:pointer}
.pm-editbar .add,.pm-editbar .done{height:32px;min-width:32px;padding:0 16px;border-radius:16px;background:var(--pm-glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;color:var(--pm-text);box-shadow:0 0 0 .5px var(--pm-hair),0 4px 12px rgba(0,0,0,.08)}
.pm-editbar .add{font-size:20px;padding:0 10px;font-weight:400}
.pm-editbar .done{background:var(--pm-accent);color:var(--pm-accent-fg)}
#gyPmHome.has-wall .pm-editbar .mid{color:#fff}
.pm-del{display:none;position:absolute;top:-7px;left:-5px;width:22px;height:22px;border-radius:50%;background:rgba(120,120,128,.85);backdrop-filter:blur(8px);font-style:normal;font-size:17px;line-height:20px;text-align:center;z-index:3;cursor:pointer;color:#fff;font-weight:600}
#gyPmHome .pm-app .pm-del{left:calc(50% - 38px)}
body.gyphm-edit #gyPmHome .pm-item:not([data-where="lib"]) .pm-del{display:block}
body.gyphm-edit #gyPmHome .pm-item:not([data-where="lib"]){animation:pmJig .3s ease-in-out infinite alternate;touch-action:none}
body.gyphm-edit #gyPmHome .pm-item:nth-child(2n){animation-delay:-.15s;animation-direction:alternate-reverse}
body.gyphm-edit #gyPmHome .pm-w.pm-item{animation-name:pmJigW}
@keyframes pmJig{from{transform:rotate(-1.6deg)}to{transform:rotate(1.6deg)}}
@keyframes pmJigW{from{transform:rotate(-.5deg)}to{transform:rotate(.5deg)}}
#gyPmHome .pm-src{opacity:.2}
#gyPmHome .pm-hot{outline:2px solid var(--pm-text);outline-offset:4px;border-radius:20px}
#gyPmHome .pm-dock.pm-hot{outline-offset:-4px;border-radius:32px}
.pm-ghost{opacity:.95;transform:scale(1.08);filter:drop-shadow(0 12px 20px rgba(0,0,0,.18))}
.pm-ghost .pm-del{display:none!important}
/* 图标风格 */
.pm-ic.img{padding:0;overflow:hidden}.pm-ic.img img{width:100%;height:100%;object-fit:cover;display:block}
body.pm-st-black{--pm-ic-bg:#111;--pm-ic-fg:#fff}
body.pm-st-black.pm-dark{--pm-ic-bg:#f5f5f7;--pm-ic-fg:#111}
body.pm-st-glass .pm-ic{background:rgba(255,255,255,.38)!important;backdrop-filter:blur(18px) saturate(1.5);-webkit-backdrop-filter:blur(18px) saturate(1.5);box-shadow:inset 0 0 0 .5px rgba(255,255,255,.6),0 6px 16px rgba(0,0,0,.08)!important}
body.pm-st-glass.pm-dark .pm-ic{background:rgba(60,60,64,.45)!important}
body.pm-st-hand .pm-ic{box-shadow:inset 0 0 0 1.6px #34302b,2px 3px 0 rgba(52,48,43,.18)!important;color:#34302b;border-radius:17px}
body.pm-nolabel #gyPmHome .pm-page .pm-lb{visibility:hidden}
body.pm-font-serif .pm-hf,body.pm-font-serif .pm-clock .t,body.pm-font-serif .pm-lock .lk-t,body.pm-font-serif .pm-lib-h,body.pm-font-serif #gyPmBar .nav{font-family:"Songti SC","STSong","Noto Serif SC","Source Han Serif SC",Georgia,serif!important;font-weight:400!important}
body.pm-font-hand .pm-hf,body.pm-font-hand .pm-clock .t,body.pm-font-hand .pm-lock .lk-t,body.pm-font-hand .pm-lib-h,body.pm-font-hand #gyPmBar .nav{font-family:"LXGW WenKai","霞鹜文楷","KaiTi","STKaiti","楷体",serif!important;font-weight:400!important}
/* 锁屏 */
.pm-lock{position:absolute;inset:0;z-index:30;background:var(--pm-bg);background-size:cover;background-position:center;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform .42s cubic-bezier(.4,0,.2,1),opacity .42s;color:var(--pm-text)}
.pm-lock.out{transform:translateY(-100%);opacity:.4}
.pm-lock .pm-sb{align-self:stretch}
.pm-lock .lk-d{margin-top:34px;font-size:18px;font-weight:600;opacity:.85}
.pm-lock .lk-t{font-family:var(--pm-num);font-size:92px;line-height:1.02;font-weight:600;letter-spacing:-2px}
.pm-lock .lk-ns{width:calc(100% - 28px);margin-top:28px;display:flex;flex-direction:column;gap:8px}
.pm-lock .lk-n{background:var(--pm-glass);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);border-radius:20px;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;font-size:13.5px;box-shadow:0 0 0 .5px var(--pm-hair)}
.pm-lock .lk-n b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pm-lock .lk-n span{flex-shrink:0;font-size:11.5px;color:var(--pm-sub)}
.pm-lock .lk-u{margin-top:auto;margin-bottom:calc(20px + env(safe-area-inset-bottom));font-size:12.5px;text-align:center;line-height:1.6;opacity:.7;animation:pmUp 1.8s ease-in-out infinite}
.pm-lock .lk-u::after{content:"";display:block;width:134px;height:5px;border-radius:3px;background:currentColor;margin:10px auto 0}
@keyframes pmUp{50%{transform:translateY(-5px)}}
.pm-lock.has-wall,.pm-lock.has-wall .pm-sb{color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.25)}
/* 日历 App */
.pmc{padding:6px 16px 20px}
.pmc-hd{display:flex;justify-content:space-between;align-items:flex-end;margin:6px 2px 14px}
.pmc-hd em{display:block;font-style:normal;color:var(--pm-red);font-size:15px;font-weight:600}
.pmc-hd b{font-size:32px;font-weight:700;letter-spacing:-.5px}
.pmc-hd .nav{display:flex;gap:6px}
.pmc-hd .nav i{font-style:normal;min-width:32px;height:32px;padding:0 10px;border-radius:16px;background:var(--pm-card);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:17px;box-shadow:0 0 0 .5px var(--pm-hair);box-sizing:border-box}
.pmc-hd .nav i.t{font-size:13px;font-weight:600}
.pmc-wk,.pmc-grid{display:grid;grid-template-columns:repeat(7,1fr);text-align:center}
.pmc-wk span{font-size:11.5px;color:var(--pm-sub);font-weight:600;padding-bottom:6px}
.pmc-grid{row-gap:4px;padding-bottom:12px;border-bottom:.5px solid var(--pm-hair)}
.pmc-grid .c{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;padding:3px 0}
.pmc-grid .c b{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:400;font-family:var(--pm-num)}
.pmc-grid .c.today b{color:var(--pm-red);font-weight:600}
.pmc-grid .c.sel b{background:var(--pm-accent);color:var(--pm-accent-fg);font-weight:600}
.pmc-grid .c.today.sel b{background:var(--pm-red);color:#fff}
.pmc-grid .c em{display:flex;gap:2px;height:5px}
.pmc i.a,.pmc-lg i.a,.pmc-grid i.a{background:var(--pm-text)}
.pmc i.b{background:#ff2d55}.pmc i.c{background:#ff9500}.pmc i.d{background:#8e8e93}
.pmc-grid .c em i{width:5px;height:5px;border-radius:50%;display:block}
.pmc-lg{display:flex;gap:12px;justify-content:center;font-size:11px;color:var(--pm-sub);padding:10px 0 4px}
.pmc-lg span{display:flex;align-items:center;gap:4px}.pmc-lg i{width:6px;height:6px;border-radius:50%;display:inline-block}
.pmc-day h5{margin:14px 2px 10px;font-size:16px;font-weight:700}
.pmc-day .ev{display:flex;gap:10px;align-items:flex-start;background:var(--pm-card);border-radius:14px;padding:11px 13px;margin-bottom:8px;box-shadow:0 0 0 .5px var(--pm-hair)}
.pmc-day .ev>i{width:4px;align-self:stretch;border-radius:2px;flex-shrink:0}
.pmc-day .ev b{display:block;font-size:15px;font-weight:500}
.pmc-day .ev span{font-size:12px;color:var(--pm-sub)}
.pmc-day .none{color:var(--pm-sub);font-size:13.5px;text-align:center;padding:18px 0}
.pmc-add{display:block;width:100%;margin-top:6px;padding:12px;border:none;border-radius:14px;background:var(--pm-accent);color:var(--pm-accent-fg);font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}
.wg-cal-g i{cursor:pointer}.wg-cal-g i.has:not(.on){box-shadow:inset 0 -2px 0 var(--pm-red)}
.wg-week .dy{cursor:pointer}.wg-week .dy.has i{background:var(--pm-red)}
.wg-todo .h em{font-style:normal;margin-left:8px;width:20px;height:20px;border-radius:50%;background:var(--pm-fill);display:inline-flex;align-items:center;justify-content:center;color:var(--pm-text);cursor:pointer;font-size:14px}
#gyPmHome .wg-photo .pdots{position:absolute;right:10px;bottom:10px;display:flex;gap:4px}
#gyPmHome .wg-photo .pdots i{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.5)}#gyPmHome .wg-photo .pdots i.on{background:#fff}
.pm-thumbs{display:flex;flex-wrap:wrap;gap:8px}
.pm-thumbs span,.pm-thumbs .add{width:64px;height:64px;border-radius:12px;background:var(--pm-card) center/cover;position:relative;box-shadow:0 0 0 .5px var(--pm-hair)}
.pm-thumbs .add{display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--pm-sub);cursor:pointer}
.pm-thumbs i{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-style:normal;font-size:13px;line-height:20px;text-align:center;cursor:pointer}
/* 小组件挑选页（带预览） */
.pm-wg-tip{font-size:12.5px;color:var(--pm-sub);line-height:1.6;margin:-4px 4px 12px;text-align:center}
.pm-wg-list{display:flex;flex-direction:column;gap:12px}
.pm-wg-card{background:var(--pm-fill);border-radius:20px;padding:12px;display:flex;flex-direction:column;gap:10px}
.pm-wg-card .pv{height:110px;display:flex;align-items:center;justify-content:center;pointer-events:none;overflow:hidden}
.pm-wg-card .pv .pm-w{transform:scale(.62);transform-origin:center;flex-shrink:0;margin:0;overflow:hidden;box-sizing:border-box;position:relative}
.pm-wg-card .pv.sz-s .pm-w{width:170px;height:170px}
.pm-wg-card .pv.sz-m .pm-w,.pm-wg-card .pv.sz-l .pm-w{width:350px;height:170px}
.pm-wg-card .pv .wg-photo{position:absolute;inset:0;background-size:cover}
.pm-wg-card .pv .wg-photo.empty{display:flex;align-items:center;justify-content:center;color:var(--pm-sub)}.pm-wg-card .pv .cam svg{width:34px;height:34px}
.pm-wg-card .nm{display:flex;justify-content:space-between;align-items:center}
.pm-wg-card .nm b{font-size:15px;font-weight:600}
.pm-wg-card .nm>span{display:flex;gap:6px}
/* 资源库（抽屉里）、换图标 */
#gyPmSheet .pm-grid.lib{display:grid;grid-template-columns:repeat(4,1fr);gap:14px 6px;margin-bottom:6px}
#gyPmSheet .pm-app.off{opacity:.4}
#gyPmSheet .pm-app .pm-del,#gyPmSheet .pm-badge{display:none}
#gyPmSheet .pm-lib-tip{font-size:12px;color:var(--pm-sub);text-align:center;margin:10px 0 4px}
.pm-ic-list .row{display:flex;align-items:center;gap:12px;padding:8px 4px;border-bottom:.5px solid var(--pm-hair)}
.pm-ic-list .row .pm-app{flex-shrink:0}.pm-ic-list .row .pm-lb{display:none}
.pm-ic-list .row .pm-ic{width:44px;height:44px;border-radius:12px}.pm-ic-list .row .pm-ic svg{width:22px;height:22px}
.pm-ic-list .row b{flex:1;font-size:15px;font-weight:500}
.pm-ic-list .mini{font-size:13px;padding:6px 12px;border-radius:999px;background:var(--pm-card);cursor:pointer;box-shadow:0 0 0 .5px var(--pm-hair)}
#gyPmSheet .sw span.same{display:flex;align-items:center;justify-content:center;font-size:12px;background:var(--pm-card);color:var(--pm-text)}
#gyPmSheet .sw span.same.on{background:var(--pm-accent);color:var(--pm-accent-fg)}
.pm-editbar .lib{height:32px;padding:0 14px;border-radius:16px;background:var(--pm-glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;align-items:center;font-size:13.5px;font-weight:600;color:var(--pm-text);box-shadow:0 0 0 .5px var(--pm-hair)}
/* 抽屉里的表单：分段控件、输入框 */
#gyPmSheet .box{max-height:84%;overflow-y:auto}
#gyPmSheet .lbl{font-size:12px;color:var(--pm-sub);margin:14px 4px 7px;letter-spacing:.5px;text-transform:uppercase;font-weight:600}
#gyPmSheet .chips{display:flex;flex-wrap:wrap;gap:7px}
#gyPmSheet .chip{padding:7px 14px;border-radius:999px;font-size:13.5px;cursor:pointer;background:var(--pm-card);color:var(--pm-text);box-shadow:0 0 0 .5px var(--pm-hair)}
#gyPmSheet .chip.on{background:var(--pm-accent);color:var(--pm-accent-fg);box-shadow:none}
#gyPmSheet .seg{display:flex;padding:3px;border-radius:12px;background:rgba(118,118,128,.14);gap:2px}
#gyPmSheet .seg .chip{flex:1;text-align:center;background:transparent;box-shadow:none;border-radius:9px;padding:7px 4px}
#gyPmSheet .seg .chip.on{background:var(--pm-card);color:var(--pm-text);box-shadow:0 3px 8px rgba(0,0,0,.12),0 0 0 .5px rgba(0,0,0,.04);font-weight:600}
#gyPmSheet .in,#gyPmSheet .ta{width:100%;box-sizing:border-box;border:none;border-radius:12px;padding:11px 13px;font-size:15px;background:var(--pm-card);color:var(--pm-text);outline:none;resize:vertical;font-family:inherit;box-shadow:0 0 0 .5px var(--pm-hair)}
#gyPmSheet .sw{flex-wrap:wrap;justify-content:flex-start}
#gyPmSheet .it{margin-top:10px}
#gyPmSheet .it.danger{color:var(--pm-red)}
.pm-wg-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--pm-card);border-radius:14px;margin-bottom:7px;box-shadow:0 0 0 .5px var(--pm-hair)}
.pm-wg-row b{font-weight:600;font-size:15px}
.pm-wg-row>span{display:flex;gap:6px}

`;
    function css() { if (document.getElementById('gyPmHomeCss')) return; const s = document.createElement('style'); s.id = 'gyPmHomeCss'; s.textContent = CSS; document.head.appendChild(s); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', css); else css();
})();
