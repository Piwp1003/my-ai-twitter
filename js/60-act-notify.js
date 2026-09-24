/* ===========================================================================
   js/60 —— 🔔 TA 自己做的每件事都弹通知，点一下跳过去
   ---------------------------------------------------------------------------
   自主模式里 TA 做的事（js/14 的动作表 + js/58 接上的各个小功能）、角色之间的来往（js/56）、
   随机事件（js/57）——做成了就弹一条，同时进「通知」页；点弹窗或通知，直接跳到那件事所在的地方：
   发的推 → 那条推文；写的日记信 → 信件与日记；网购 → 商城；听歌 → 音乐盒；改签名 → TA 的主页……

   有些动作自己本来就会弹、而且点了能跳（发消息、发推、各种邀请卡、来电、八卦……），这里不再重复弹。
   跳转目标：动作自己给了就用它的（js/58 的动作会带），没给就按下面这张表。
   =========================================================================== */
(function () {
    'use strict';
    if (window.__gyActNotifyLoaded) return;
    window.__gyActNotifyLoaded = true;

    const chars = () => (typeof myCharacters !== 'undefined' && Array.isArray(myCharacters)) ? myCharacters : [];
    const charOf = id => chars().find(c => String(c.id) === String(id)) || null;

    /* ---------- 跳 ---------- */
    window.gyJump = function (j) {
        if (!j) return;
        try {
            if (j.fn && typeof window[j.fn] === 'function') { window[j.fn].apply(null, j.args || []); return; }
            if (j.chat != null) { switchMainView('chat'); setTimeout(() => { try { switchChatSession(String(j.chat)); } catch (e) {} }, 60); return; }
            if (j.feature && typeof gyOpenFeaturePage === 'function') { gyOpenFeaturePage(j.feature); return; }
            if (j.diary != null) {
                switchMainView('diary');
                setTimeout(() => { try { if (typeof selectDiaryChar === 'function') selectDiaryChar(j.diary); if (j.tab && typeof switchDiaryTab === 'function') switchDiaryTab(j.tab); } catch (e) {} }, 60);
                return;
            }
            if (j.today) {
                if (typeof window.gyTodaySet === 'function' && !(window.gyTodayRead && window.gyTodayRead().on)) window.gyTodaySet(true);
                if (window.innerWidth <= 900 && typeof openMobileTrendsView === 'function') openMobileTrendsView();
                setTimeout(() => { try { const el = document.querySelector(`#gyToday [data-rh="${j.today}"], #gyTodayM [data-rh="${j.today}"]`); if (el) { el.open = true; el.scrollIntoView({ block: 'start', behavior: 'smooth' }); } } catch (e) {} }, 150);
                return;
            }
            if (j.view) { switchMainView(j.view, j.param); return; }
        } catch (e) { console.warn('[通知跳转] 失败：', e); }
    };

    // 动作 → 默认跳去哪（动作自己给了 jump 就用它的）
    const JUMP = {
        letter: c => ({ diary: c.id, tab: 'letter' }), diary: c => ({ diary: c.id, tab: 'diary' }),
        forum: () => ({ view: 'novel' }), anon: () => ({ view: 'anonForum' }),
        comment: () => ({ view: 'home' }), like: () => ({ view: 'home' }), tabloid: () => ({ view: 'home' }),
        status: c => ({ view: 'profile', param: String(c.id) }), todo_done: c => ({ view: 'profile', param: String(c.id) }), todo_add: c => ({ view: 'profile', param: String(c.id) }),
        theater: () => ({ view: 'theater' }), peer: () => ({ view: 'theater' }),
        group_talk: () => ({ view: 'chat' }),
        music_invite: c => ({ chat: c.id }), listen_self: () => ({ feature: 'music' }),
        watch_self: () => ({ view: 'watchTogether' }), read_self: () => ({ feature: 'reading_together' }),
        play_self: c => ({ view: 'profile', param: String(c.id) }),
        money_user: c => ({ chat: c.id }), photo_user: c => ({ chat: c.id }), takeout_user: () => ({ view: 'mall' }), gift_user: () => ({ view: 'mall' }),
        shop_self: () => ({ view: 'mall' }), sell_self: () => ({ view: 'mall' }), takeout_self: () => ({ view: 'mall' }),
        web_explore: c => ({ fn: 'gywebOpen', args: [String(c.id)] }), go_place: () => ({ fn: 'gymapOpen' }),
        kit_move: () => ({ fn: 'gykitOpen' }), day_mark: () => ({ fn: 'gydayOpen' }),
        dress_change: c => ({ view: 'profile', param: String(c.id) }), phone_peek: c => ({ chat: c.id })
    };
    // 这些动作自己就会弹通知、点了也能跳，不重复弹
    const SELF = new Set(['chat', 'nudge', 'post', 'film_invite', 'read_invite', 'game_invite', 'music_invite', 'invite_user', 'phone_peek', 'call_invite']);

    // 弹一条能点的通知（也进通知页）
    window.gyNotifyJump = function (char, title, desc, jump) {
        try {
            const text = String(title || '');
            if (typeof globalNotifications !== 'undefined' && Array.isArray(globalNotifications)) {
                globalNotifications.unshift({ text, postId: null, chatCharId: null, timestamp: Date.now(), jump: jump || null });
                if (typeof unreadNotifs !== 'undefined') unreadNotifs++;
                if (typeof updateNotifBadge === 'function') updateNotifBadge();
                try { const v = document.getElementById('view-notifications'); if (v && v.style.display !== 'none' && typeof renderNotifications === 'function') renderNotifications(); } catch (e) {}
            }
            if (typeof showToast !== 'function') return;
            const box = document.getElementById('toastContainer');
            const before = box ? box.children.length : 0;
            showToast(char && typeof getAvatarHTML === 'function' ? getAvatarHTML(char, 40) : '', text.replace(/<[^>]+>/g, ''), desc || '', null, null, false);
            if (box && box.children.length > before && jump) {
                const t = box.lastElementChild;
                if (t && t.classList.contains('toast-item')) t.onclick = () => { window.gyJump(jump); t.remove(); };
            }
        } catch (e) {}
    };

    const ICON = k => {
        try {
            const a = (typeof GY_AUTONOMY_ACTIONS !== 'undefined' ? GY_AUTONOMY_ACTIONS : []).find(x => x.key === k);
            if (a && a.icon) return a.icon;
        } catch (e) {}
        return { letter: '✉️', diary: '📔', forum: '🏛️', anon: '🎭', comment: '🗨️', like: '❤️', status: '🟢', todo_done: '✅', todo_add: '🗒️',
                 theater: '🎬', peer: '📨', tabloid: '📰', group_talk: '👥', go_place: '📍', kit_move: '🎒', day_mark: '🎂', web_explore: '🌐', dress_change: '🖼️' }[k] || '✨';
    };
    window.gyActNotify = function (char, act, entry) {
        if (!char || !act || !entry || !entry.ok) return;
        if (entry.selfNotified || SELF.has(act.key)) return;
        const jump = entry.jump || (JUMP[act.key] ? JUMP[act.key](char) : { view: 'profile', param: String(char.id) });
        // 匿名的事：通知里不写是谁
        if (entry.anonymous) { window.gyNotifyJump(null, `${ICON(act.key)} 有人${entry.result || act.label}`, '', jump); return; }
        window.gyNotifyJump(char, `${ICON(act.key)} ${char.name}${entry.queued ? '（之前说好的）' : ''}：${entry.result || act.label}`, entry.reason || '', jump);
    };
})();
