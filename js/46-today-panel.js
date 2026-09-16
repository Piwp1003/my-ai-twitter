/* ============================================================
   js/46 —— 右边那块「今天」
   ------------------------------------------------------------
   开关：设置 → 外观 →「📅 右边放一块「今天」」，**默认关**——
   不开就一个节点都不建，右侧栏还是项目原来的样子。

   起因：微信皮肤把正文收成固定一栏之后，宽屏上右边空出来一大片。
   这块面板把**项目里本来就有、但散在各处的东西**汇到一页：
     · 今天几号、星期几
     · 今天和明天的日程（js/38「我的日程」里记的）
     · 最近要到的纪念日/生日（你自己记的 + 每个角色的，按"每年同月同日"算）
     · 谁有未读消息（点一下直接进那个聊天）
     · TA 们刚发的几条（点一下进帖子详情）
   全是读现成数据，不生成、不请求接口、不写任何存档。

   放哪儿：挂在**原来的右侧栏里**（.sidebar-right-content 的最前面）。
   所以不贴皮肤时它就是右侧栏顶上多一张卡；贴了微信皮肤，皮肤会认
   body 上的 gytoday-on，把那条被收掉的右栏重新放出来专门装它。
   ============================================================ */
(function () {
    'use strict';

    const LSK = 'gy_today_cfg';
    const S = { on: false };
    try { Object.assign(S, JSON.parse(localStorage.getItem(LSK) || '{}') || {}); } catch (e) {}
    const saveCfg = () => { try { localStorage.setItem(LSK, JSON.stringify(S)); } catch (e) {} };

    const ID = 'gyToday';
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const arr = x => Array.isArray(x) ? x : [];
    const pad = n => (n < 10 ? '0' : '') + n;
    const keyOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

    /* ---------- 今天的日程 ---------- */
    function days() {
        let items = [];
        try { if (typeof gyMyDayAll === 'function') items = arr(gyMyDayAll()); } catch (e) {}
        const today = keyOf(new Date());
        const tm = new Date(); tm.setDate(tm.getDate() + 1);
        const tomorrow = keyOf(tm);
        const pick = k => items.filter(x => x && x.date === k)
            .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
        return { today: pick(today), tomorrow: pick(tomorrow) };
    }

    /* ---------- 最近的纪念日（含生日），按"每年同月同日" ---------- */
    function annivs() {
        const out = [];
        const now = new Date(); now.setHours(0, 0, 0, 0);
        const push = (dateStr, label, who) => {
            if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return;
            const [y, m, d] = String(dateStr).split('-').map(Number);
            let next = new Date(now.getFullYear(), m - 1, d);
            if (next < now) next = new Date(now.getFullYear() + 1, m - 1, d);
            const left = Math.round((next - now) / 86400000);
            if (left > 366) return;
            out.push({ left, label, who, years: next.getFullYear() - y });
        };
        try {
            arr(currentUser && currentUser.customAnniversaries).forEach(a => push(a.date, a.label, ''));
            if (currentUser && currentUser.birthdate) push(currentUser.birthdate, '生日', '我');
            arr(typeof myCharacters !== 'undefined' ? myCharacters : []).forEach(c => {
                arr(c.anniversaries).forEach(a => push(a.date, a.event || a.label || '纪念日', c.name));
                if (c.birthdate) push(c.birthdate, '生日', c.name);
            });
        } catch (e) {}
        return out.sort((a, b) => a.left - b.left).slice(0, 4);
    }

    /* ---------- 谁有未读 ---------- */
    function unread() {
        const out = [];
        try {
            if (typeof chatHasUnread !== 'function') return out;
            const all = [...arr(typeof groupChats !== 'undefined' ? groupChats : []),
                         ...arr(typeof myCharacters !== 'undefined' ? myCharacters : [])];
            all.forEach(x => { if (x && chatHasUnread(x.id)) out.push({ id: x.id, name: x.name }); });
        } catch (e) {}
        return out.slice(0, 6);
    }

    /* ---------- TA 们刚发的 ---------- */
    function fresh() {
        try {
            return arr(typeof globalPosts !== 'undefined' ? globalPosts : [])
                .slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 3)
                .map(p => ({ id: p.id, name: (p.char && p.char.name) || '', text: String(p.text || '').slice(0, 38), at: p.timestamp }));
        } catch (e) { return []; }
    }
    const ago = t => {
        if (!t) return '';
        const m = Math.round((Date.now() - t) / 60000);
        if (m < 1) return '刚刚';
        if (m < 60) return m + ' 分钟前';
        if (m < 1440) return Math.round(m / 60) + ' 小时前';
        return Math.round(m / 1440) + ' 天前';
    };

    /* ---------- 画 ---------- */
    const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    function html() {
        const d = new Date();
        const dd = days(), an = annivs(), un = unread(), fr = fresh();
        let h = `<div class="gyt-head">
              <div class="gyt-day">${d.getDate()}</div>
              <div class="gyt-md"><b>${d.getFullYear()} 年 ${d.getMonth() + 1} 月</b><span>${WD[d.getDay()]}</span></div>
            </div>`;

        if (dd.today.length || dd.tomorrow.length) {
            h += `<div class="gyt-sec"><h4>🗓️ 日程</h4>`;
            dd.today.forEach(it => h += `<div class="gyt-row"><span class="gyt-t">${esc(it.time || '今天')}</span>
                <span class="gyt-x">${esc(it.text)}${it.place ? `<em>在${esc(it.place)}</em>` : ''}</span></div>`);
            dd.tomorrow.forEach(it => h += `<div class="gyt-row dim"><span class="gyt-t">明天${it.time ? ' ' + esc(it.time) : ''}</span>
                <span class="gyt-x">${esc(it.text)}</span></div>`);
            h += `</div>`;
        }

        if (an.length) {
            h += `<div class="gyt-sec"><h4>💗 快到的日子</h4>`;
            an.forEach(a => h += `<div class="gyt-row"><span class="gyt-t">${a.left === 0 ? '就是今天' : '还有 ' + a.left + ' 天'}</span>
                <span class="gyt-x">${a.who ? esc(a.who) + '的' : ''}${esc(a.label)}${a.years > 0 && a.left === 0 ? `<em>第 ${a.years} 年</em>` : ''}</span></div>`);
            h += `</div>`;
        }

        if (un.length) {
            h += `<div class="gyt-sec"><h4>💬 有人在等你回</h4>`;
            un.forEach(x => h += `<div class="gyt-row click" data-chat="${esc(x.id)}">
                <span class="gyt-dot"></span><span class="gyt-x">${esc(x.name)}</span></div>`);
            h += `</div>`;
        }

        if (fr.length) {
            h += `<div class="gyt-sec"><h4>📝 TA 们刚发的</h4>`;
            fr.forEach(p => h += `<div class="gyt-row click col" data-post="${esc(p.id)}">
                <span class="gyt-x"><b>${esc(p.name)}</b> ${esc(p.text)}</span>
                <span class="gyt-ago">${esc(ago(p.at))}</span></div>`);
            h += `</div>`;
        }

        if (!dd.today.length && !dd.tomorrow.length && !an.length && !un.length && !fr.length)
            h += `<div class="gyt-empty">今天还没什么事。<br>记一条日程、或者去跟谁说句话。</div>`;
        return h;
    }

    function ensure() {
        const host = document.querySelector('.sidebar-right-content');
        if (!host) return null;
        let box = document.getElementById(ID);
        if (!box) {
            box = document.createElement('div');
            box.id = ID; box.className = 'gyt-box';
            // 放在右栏最前面（搜索框后面），不动原来那些卡片
            const sb = host.querySelector('.search-box');
            if (sb && sb.nextSibling) host.insertBefore(box, sb.nextSibling);
            else host.insertBefore(box, host.firstChild);
            box.addEventListener('click', ev => {
                const row = ev.target.closest('.gyt-row.click'); if (!row) return;
                try {
                    if (row.dataset.chat) {
                        switchMainView('chat');
                        setTimeout(() => { try { switchChatSession(row.dataset.chat); } catch (e) {} }, 60);
                    } else if (row.dataset.post) switchMainView('postDetail', row.dataset.post);
                } catch (e) {}
            });
        }
        return box;
    }

    function render() {
        // ⚠️ 关着的时候**一个节点都不建**——先判开关再 ensure，
        //    不然刷新之后页面上还是会多出一块空的 #gyToday。
        if (!S.on) {
            const old = document.getElementById(ID); if (old) old.remove();
            document.body.classList.remove('gytoday-on');
            return;
        }
        const box = ensure(); if (!box) return;
        box.style.display = '';
        document.body.classList.add('gytoday-on');
        box.innerHTML = html();
    }
    window.gyTodayRender = render;
    window.gyTodaySet = function (on) {
        S.on = !!on; saveCfg();
        const box = document.getElementById(ID);
        if (!S.on) { if (box) box.remove(); document.body.classList.remove('gytoday-on'); }
        else render();
    };
    window.gyTodayRead = () => ({ on: S.on });

    // 切页、切主题都重画一次；再挂一个 5 分钟的慢刷新（跨零点也能跟上）
    const sw0 = window.switchMainView;
    if (sw0 && sw0.call && !sw0.__gyToday) {
        window.switchMainView = function () { const r = sw0.apply(this, arguments); try { setTimeout(render, 0); } catch (e) {} return r; };
        window.switchMainView.__gyToday = true;
    }
    setInterval(() => { try { if (S.on) render(); } catch (e) {} }, 300000);

    function fillUI() { try { const el = document.getElementById('gyTodayOn'); if (el) el.checked = !!S.on; } catch (e) {} }
    const op0 = window.openSettingsPanel;
    if (op0 && op0.call && !op0.__gyToday) {
        window.openSettingsPanel = function (k) { const r = op0.apply(this, arguments); if (k === 'appearance') setTimeout(fillUI, 60); return r; };
        window.openSettingsPanel.__gyToday = true;
    }

    /* ---------- 样式：走项目自己的变量，深色/黑白都跟着变 ---------- */
    try {
        const st = document.createElement('style');
        st.id = 'gyTodayCss';
        st.textContent = `
#${ID}.gyt-box { padding: 4px 0 16px; font-size: 14px; }
#${ID} .gyt-head { display: flex; align-items: center; gap: 12px; padding: 14px 4px 10px; }
#${ID} .gyt-day { font-size: 40px; font-weight: 700; line-height: 1; color: var(--gy-accent, #1d9bf0); }
#${ID} .gyt-md { display: flex; flex-direction: column; gap: 2px; }
#${ID} .gyt-md b { font-size: 14px; }
#${ID} .gyt-md span { font-size: 13px; opacity: .6; }
#${ID} .gyt-sec { margin-top: 14px; }
#${ID} .gyt-sec h4 { margin: 0 0 6px; font-size: 13px; font-weight: 600; opacity: .55; }
#${ID} .gyt-row { display: flex; align-items: baseline; gap: 8px; padding: 6px 4px;
                  border-radius: 6px; line-height: 1.45; }
#${ID} .gyt-row.col { flex-direction: column; gap: 2px; }
#${ID} .gyt-row.dim { opacity: .55; }
#${ID} .gyt-row.click { cursor: pointer; }
#${ID} .gyt-row.click:hover { background: rgba(var(--gy-accent-rgb, 29,155,240), .08); }
#${ID} .gyt-t { flex: 0 0 auto; font-size: 12px; opacity: .6; min-width: 56px; }
#${ID} .gyt-x { flex: 1 1 auto; min-width: 0; word-break: break-word; }
#${ID} .gyt-x em { font-style: normal; opacity: .5; margin-left: 6px; font-size: 12px; }
#${ID} .gyt-ago { font-size: 12px; opacity: .45; }
#${ID} .gyt-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 7px;
                  background: var(--gy-bad, #f91880); align-self: center; }
#${ID} .gyt-empty { padding: 18px 4px; font-size: 13px; opacity: .5; line-height: 1.7; }
@media (max-width: 1100px) { #${ID}.gyt-box { display: none !important; } }
`;
        document.head.appendChild(st);
    } catch (e) {}

    const boot = () => { try { fillUI(); render(); } catch (e) {} };
    if (document.readyState === 'complete') setTimeout(boot, 1100);
    else window.addEventListener('load', () => setTimeout(boot, 1100));

    console.info('[今天] 已加载。开关：设置 → 外观 →「📅 右边放一块「今天」」（默认关）');
})();
