/* ===========================================================================
   js/28 —— 📨 邀请卡片：所有"一起做点什么"都发在私聊里
   ---------------------------------------------------------------------------
   以前几个一起做点什么的功能（一起看电影、一起听歌、一起阅读、约出去），
   邀请这件事是**在后台悄悄发生**的：点一下按钮 → 偷偷调一次 API → 弹个 toast
   说"TA 来了"。问题是：
     · 你在私聊里翻不到这段。明明是"你约了 TA、TA 答应了"这么具体的一件事，
       聊天记录里一个字都没有，下次 TA 也不记得
     · 拒绝了只剩一句 toast，八秒之后就没了
     · 每个功能各写各的，措辞、能不能拒绝、拒绝之后怎么办，四份代码四个样

   v105 起做成**聊天里的一张卡片**：
     · 你发出去的邀请 = 私聊里的一张卡，卡上写清楚是什么事、什么片子/哪首歌/哪个地方
     · TA 按人设决定去不去，答案写在同一张卡上（不是新开一条消息），
       并且带着 TA 自己那句话
     · TA 主动约你的时候，卡上是两个按钮：**你**来点「好啊 / 算了」
     · 答应之后卡片直接变成入口，点一下就进对应的功能页

   卡片的样子是自己画的（.gyiv-*），跟 app 的蓝 + 圆角 + 玻璃感一路，
   深色模式跟着变量走。不是气泡，也不套用任何现成的组件。

   💰 不额外花钱：邀请本来就要问 TA 一次，这里用的还是那一次。
   =========================================================================== */
(function () {
    if (window.__gyInviteLoaded) return;
    window.__gyInviteLoaded = true;

    const on = () => (typeof isAutoOn === 'function') ? isAutoOn('inviteInChat') : true;
    const charOf = id => (typeof myCharacters !== 'undefined' ? myCharacters : [])
        .find(c => String(c.id) === String(id)) || null;
    const esc = s => (typeof escapeHtml === 'function') ? escapeHtml(s || '')
        : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ---------- 每种邀请：图标、说法、答应之后干什么 ----------
       模块想加自己的类型，往 window.GY_INVITE_KINDS 里塞一条就行。 */
    const KINDS = {
        film: {
            ico: '🎬', name: '一起看电影', verb: '一起看',
            go: '进放映厅', accept(inv) {
                try { if (typeof fbToggleWatcher === 'function') fbToggleWatcher(inv.charId, true); } catch (e) {}
                try { if (typeof switchMainView === 'function') switchMainView('watchTogether'); } catch (e) {}
            }
        },
        music: {
            ico: '🎧', name: '一起听歌', verb: '一起听',
            go: '去听', accept(inv) {
                try { if (typeof window.gymJoinListener === 'function') window.gymJoinListener(inv.charId); } catch (e) {}
                try { if (typeof gyOpenFeaturePage === 'function') gyOpenFeaturePage('music'); } catch (e) {}
            }
        },
        read: {
            ico: '📖', name: '一起阅读', verb: '一起读',
            go: '去读', accept(inv) {
                try { if (typeof window.rtSetCompanion === 'function') window.rtSetCompanion(inv.charId); } catch (e) {}
                try { if (typeof gyOpenFeaturePage === 'function') gyOpenFeaturePage('reading_together'); } catch (e) {}
            }
        },
        date: {
            ico: '🤝', name: '约出去', verb: '一起去',
            go: '看地图', accept() {
                try { if (typeof gyOpenFeaturePage === 'function') gyOpenFeaturePage('map'); } catch (e) {}
            }
        },
        other: { ico: '💌', name: '邀请', verb: '一起', go: '看看', accept() {} }
    };
    window.GY_INVITE_KINDS = KINDS;
    const kindOf = k => KINDS[k] || KINDS.other;

    /* ---------- 存 / 找 ---------- */
    function pushCard(charId, sender, inv) {
        if (typeof globalChats === 'undefined') return null;
        const sid = String(charId);
        if (!globalChats[sid]) globalChats[sid] = [];
        // text 是给模型和消息列表预览看的纯文字版——卡片本身不参与 prompt 拼装，
        // 但历史里得留一句人话，不然 TA 回头翻记录只看到一条空消息。
        const msg = {
            sender, type: 'invite', invite: inv, timestamp: Date.now(), readBy: [],
            text: `［${kindOf(inv.kind).name}］${inv.title || ''}${inv.sub ? '　' + inv.sub : ''}`
        };
        globalChats[sid].push(msg);
        return msg;
    }
    function findCard(id) {
        if (typeof globalChats === 'undefined') return null;
        for (const sid in globalChats) {
            const arr = globalChats[sid] || [];
            for (let i = 0; i < arr.length; i++) {
                if (arr[i] && arr[i].type === 'invite' && arr[i].invite && arr[i].invite.id === id) {
                    return { sid, idx: i, msg: arr[i] };
                }
            }
        }
        return null;
    }
    function refresh(charId) {
        try { if (typeof saveAllData === 'function') saveAllData(); } catch (e) {}
        try {
            const open = typeof currentChatSessionId !== 'undefined'
                && String(currentChatSessionId) === String(charId)
                && document.getElementById('view-chat')
                && document.getElementById('view-chat').style.display !== 'none';
            if (open && typeof renderChatMessages === 'function') renderChatMessages();
            else if (typeof renderChatCharList === 'function') renderChatCharList();
        } catch (e) {}
    }
    function jumpTo(charId) {
        try {
            if (typeof switchMainView === 'function') switchMainView('chat');
            if (typeof switchChatSession === 'function') switchChatSession(charId);
        } catch (e) {}
    }

    /* ================= 卡片长什么样 ================= */
    window.gyInviteCardHtml = function (msg, idx) {
        const inv = msg.invite || {};
        const K = kindOf(inv.kind);
        const c = charOf(inv.charId);
        const me = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : { name: '我' };
        const av = (x, n) => (typeof getAvatarHTML === 'function') ? getAvatarHTML(x, n || 38) : '';
        const byMe = inv.from === 'me';
        const who = byMe ? me : (c || { name: '对方' });
        const target = byMe ? (c || { name: '对方' }) : me;

        // 中间那条线：等回话时是虚线 + 心跳，答应了是实线，拒绝了断开
        const linkCls = inv.status === 'yes' ? 'ok' : inv.status === 'no' ? 'no' : 'wait';

        let foot = '';
        if (inv.status === 'pending') {
            foot = byMe
                ? `<div class="gyiv-wait"><span class="gyiv-dots"><i></i><i></i><i></i></span>等 ${esc(target.name)} 回话…</div>`
                : `<div class="gyiv-acts">
                       <button type="button" class="gyiv-btn yes" onclick="gyInviteAnswer('${inv.id}',true)">好啊</button>
                       <button type="button" class="gyiv-btn no" onclick="gyInviteAnswer('${inv.id}',false)">算了</button>
                   </div>`;
        } else if (inv.status === 'yes') {
            foot = `<div class="gyiv-said ok">${inv.line ? esc(inv.line) : '说定了。'}</div>
                    <div class="gyiv-acts"><button type="button" class="gyiv-btn go" onclick="gyInviteGo('${inv.id}')">${esc(K.go)} ›</button></div>`;
        } else {
            foot = `<div class="gyiv-said no">${inv.line ? esc(inv.line) : '这次算了。'}</div>`;
        }

        return `
        <div class="gyiv-row">
          <div class="gyiv-card ${linkCls}" data-kind="${esc(inv.kind || 'other')}">
            <div class="gyiv-tag">${K.ico} ${esc(K.name)}</div>
            <div class="gyiv-people">
              <div class="gyiv-p">${av(who, 38)}<span>${esc(who.name)}</span></div>
              <div class="gyiv-link"><i></i><b>${K.ico}</b><i></i></div>
              <div class="gyiv-p">${av(target, 38)}<span>${esc(target.name)}</span></div>
            </div>
            <div class="gyiv-title">${inv.say ? esc(inv.say)
                : `${esc(who.name)}想跟${esc(target.name)}${esc(K.verb)}${inv.title ? `「${esc(inv.title)}」` : ''}`}</div>
            ${inv.sub ? `<div class="gyiv-sub">${esc(inv.sub)}</div>` : ''}
            ${foot}
          </div>
        </div>`;
    };

    /* ================= 你约 TA ================= */
    // gyInviteSend({char, kind, title, sub, ask, onYes, onNo, jump})
    // ask 不传就用默认措辞。onYes/onNo 是这次邀请谈成/谈崩之后各自要做的事。
    const pendingCb = {};   // { 邀请id: {onYes, onNo} } —— 回调不进存档，只在这次会话里有效
    window.gyInviteSend = async function ({ char, kind = 'other', title = '', sub = '', ask, say = '', onYes, onNo, jump = true } = {}) {
        const c = (typeof char === 'object') ? char : charOf(char);
        if (!c) return null;
        const K = kindOf(kind);

        if (!on()) {
            // 开关关了：退回老样子——后台问一句，只弹个提示，不动聊天记录
            const r = await window.gyInviteAsk(c, ask || defaultAsk(c, K, title, sub), true);
            if (typeof showToast === 'function') showToast('', c.name, r.line || (r.ok ? '好啊。' : '这次算了。'), null, c.id, false);
            try { r.ok ? (onYes && onYes(r)) : (onNo && onNo(r)); } catch (e) {}
            return r;
        }

        // say：整句自己写（借看手机那种"请求"不是"一起做点什么"，套不进默认句式）
        const inv = { id: 'iv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
                      kind, title, sub, say, charId: String(c.id), from: 'me', status: 'pending', line: '' };
        pendingCb[inv.id] = { onYes, onNo };
        pushCard(c.id, 'me', inv);
        refresh(c.id);
        if (jump) jumpTo(c.id);

        const r = await window.gyInviteAsk(c, ask || defaultAsk(c, K, title, sub), true);
        inv.status = r.ok ? 'yes' : 'no';
        inv.line = r.line || (r.ok ? '好啊。' : '这次算了。');
        refresh(c.id);
        if (typeof addNotification === 'function') {
            addNotification(`<b>${c.name}</b> ${r.ok ? '答应了' : '婉拒了'}你的邀请（${K.name}）`, null, c.id, c, inv.line);
        }
        try { r.ok ? (onYes && onYes(r)) : (onNo && onNo(r)); } catch (e) {}
        return r;
    };

    function defaultAsk(c, K, title, sub) {
        const uname = (typeof userDisplayName === 'function') ? userDisplayName(c) : '对方';
        return `${uname}想约你${K.verb}${title ? `「${title}」` : ''}${sub ? `（${sub}）` : ''}。
按你自己的性格决定去不去——在忙、没心情、不喜欢这个、闹着别扭，都可以直接拒绝，不用勉强自己迎合。
只输出 JSON，不要 markdown：{"ok": true或false, "line": "你要说的一句话，30字以内，像人说话，不要引号"}`;
    }

    /* ================= TA 约你 ================= */
    // 卡片上是两个按钮，等**你**来点。TA 主动发起的功能（比如「角色主动约你出去」）走这里。
    window.gyInviteFromChar = function ({ char, kind = 'other', title = '', sub = '', line = '', say = '', onYes, onNo, notify = true } = {}) {
        const c = (typeof char === 'object') ? char : charOf(char);
        if (!c) return null;
        const K = kindOf(kind);
        const inv = { id: 'iv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
                      kind, title, sub, say, charId: String(c.id), from: 'char', status: 'pending', line: '', ask: line };
        pendingCb[inv.id] = { onYes, onNo };
        if (line) {
            // TA 开口那句话单独作为一条正常消息，卡片跟在后面——像真人先说一句再发个邀请
            if (!globalChats[String(c.id)]) globalChats[String(c.id)] = [];
            globalChats[String(c.id)].push({ sender: c.id, text: line, timestamp: Date.now(), readBy: [] });
        }
        pushCard(c.id, c.id, inv);
        refresh(c.id);
        if (notify && typeof addNotification === 'function') {
            addNotification(`<b>${c.name}</b> 约你${K.verb}${title ? `「${title}」` : ''} ${K.ico}`, null, c.id, c, line || '等你回话');
        }
        return inv;
    };

    // 你点了「好啊 / 算了」
    window.gyInviteAnswer = async function (id, yes) {
        const found = findCard(id);
        if (!found) return;
        const inv = found.msg.invite;
        if (inv.status !== 'pending') return;
        inv.status = yes ? 'yes' : 'no';
        inv.line = yes ? '（你答应了）' : '（你拒绝了）';
        refresh(inv.charId);

        const cb = pendingCb[id] || {};
        try { yes ? (cb.onYes && cb.onYes()) : (cb.onNo && cb.onNo()); } catch (e) {}

        // 让 TA 对你的回答接一句（用的是已有的那条投递通道，不额外弹窗）
        const c = charOf(inv.charId);
        const api = (typeof getApiConfig === 'function') ? getApiConfig(true) : null;
        if (c && api && api.key) {
            try {
                const K = kindOf(inv.kind);
                const p = `你刚才约${(typeof userDisplayName === 'function') ? userDisplayName(c) : '对方'}${K.verb}${inv.title ? `「${inv.title}」` : ''}，`
                    + (yes ? '对方答应了。' : '对方拒绝了。')
                    + `\n按你的性格接一句（高兴、松口气、有点失落、无所谓都行），20 字以内，不要引号不要旁白。不想说就只输出 NO。`;
                const msgs = (typeof buildStructuredMessages === 'function')
                    ? buildStructuredMessages(buildBasePrompt(c, false, ''), [], p) : [{ role: 'user', content: p }];
                const data = await callChatCompletionAPI(api, msgs);
                let t = (data.choices?.[0]?.message?.content || '').trim().replace(/^["'“”「」]+|["'“”「」]+$/g, '');
                if (typeof stripReasoningBlocks === 'function') t = stripReasoningBlocks(t);
                if (t && !(t.toUpperCase().startsWith('NO') && t.length < 5)) {
                    globalChats[String(c.id)].push({ sender: c.id, text: t, timestamp: Date.now(), readBy: [] });
                    refresh(c.id);
                }
            } catch (e) { console.warn('[邀请] TA 对回答的反应没拿到：', e); }
        }
    };

    // 卡片上的「进放映厅 ›」这类入口
    window.gyInviteGo = function (id) {
        const found = findCard(id);
        if (!found) return;
        const inv = found.msg.invite;
        try { kindOf(inv.kind).accept(inv); } catch (e) { console.warn('[邀请] 打开对应功能失败：', e); }
    };

    /* ================= 老接口（只记一来一回，不出卡片）================= */
    // 给"结果已经定了、只想把这段留在私聊里"的地方用，比如约出去谈成之后的落地。
    window.gyInviteInChat = function ({ char, myText, reply, ok, jump = true, what } = {}) {
        try {
            const c = (typeof char === 'object') ? char : charOf(char);
            if (!c) return;
            if (!on()) {
                if (typeof showToast === 'function') showToast('', c.name, reply || myText, null, c.id, false);
                return;
            }
            if (!globalChats[String(c.id)]) globalChats[String(c.id)] = [];
            if (myText) globalChats[String(c.id)].push({ sender: 'me', text: myText, timestamp: Date.now(), readBy: [] });
            if (reply) globalChats[String(c.id)].push({ sender: c.id, text: reply, timestamp: Date.now(), readBy: [] });
            refresh(c.id);
            if (reply && typeof addNotification === 'function') {
                addNotification(`<b>${c.name}</b> 回了你的邀请${what ? '（' + what + '）' : ''}`, null, c.id, c, reply);
            }
            if (jump) jumpTo(c.id);
        } catch (e) { console.warn('[邀请] 写进私聊时出错，已跳过：', e); }
    };

    /* 统一的"问 TA 去不去"。返回 {ok, line}。 */
    window.gyInviteAsk = async function (char, ask, fallbackYes = true) {
        const out = { ok: fallbackYes, line: '' };
        try {
            const c = (typeof char === 'object') ? char : charOf(char);
            if (!c) return out;
            const api = (typeof getApiConfig === 'function') ? getApiConfig(true) : null;
            if (!api || !api.key) return out;
            const base = (typeof buildBasePrompt === 'function') ? buildBasePrompt(c, false, '') : '';
            const msgs = (typeof buildStructuredMessages === 'function')
                ? buildStructuredMessages(base, [], ask) : [{ role: 'user', content: ask }];
            const data = await callChatCompletionAPI(api, msgs);
            const raw = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
            let r = (typeof extractJsonObject === 'function') ? extractJsonObject(raw) : null;
            if (Array.isArray(r)) r = r[0];
            if (r && typeof r === 'object') {
                out.ok = (r.ok !== undefined) ? r.ok !== false : (r.yes !== undefined ? !!r.yes : fallbackYes);
                out.line = String(r.line || r.text || '').trim();
            } else {
                out.line = raw.slice(0, 60);
            }
            out.line = out.line.replace(/^["'“”「」]+|["'“”「」]+$/g, '');
            if (typeof applyRegexScripts === 'function') {
                try { out.line = applyRegexScripts(out.line, 'ai_output', c.id); } catch (e) {}
            }
        } catch (e) { console.warn('[邀请] 问 TA 出错：', e); }
        return out;
    };

    /* =====================================================================
       💌 聊天里的「跟 TA 一起」
       ---------------------------------------------------------------------
       约听歌在音乐盒里、约看片在放映厅里、约出去在地图里、借手机在资料页上——
       每样都得先离开聊天、翻到那一页、再把人找出来。可这些事本来就是
       "正跟 TA 说着话，顺口约一句"，绕这么一圈很奇怪。

       所以统一收到聊天输入框左边那颗 ⋮ 里：往 GY_CHAT_ACTIONS 里塞一条就行。
         { id, icon, label, sub, show(charId)->bool, run(charId) }
       show 返回 false（功能没开、没加载、群聊里用不了）的就不画，
       不会出现点了没反应的死按钮。
       ===================================================================== */
    window.GY_CHAT_ACTIONS = window.GY_CHAT_ACTIONS || [];
    window.gyChatActionAdd = function (item) {
        if (!item || !item.id) return;
        if (window.GY_CHAT_ACTIONS.some(x => x.id === item.id)) return;
        window.GY_CHAT_ACTIONS.push(item);
    };
    const curChat = () => {
        try {
            const id = (typeof currentChatSessionId !== 'undefined') ? currentChatSessionId : null;
            if (!id || String(id).indexOf('g_') === 0) return null;    // 群聊不算
            return charOf(id) ? String(id) : null;
        } catch (e) { return null; }
    };
    window.gyChatActRun = function (id) {
        const cid = curChat(); if (!cid) return;
        const it = (window.GY_CHAT_ACTIONS || []).find(x => x.id === id);
        const m = document.getElementById('chatMoreMenu');
        if (m) m.classList.remove('on');
        if (it && typeof it.run === 'function') { try { it.run(cid); } catch (e) { console.warn('[跟 TA 一起] ' + id, e); } }
    };
    window.gyChatActsRender = function () {
        const menu = document.getElementById('chatMoreMenu');
        if (!menu) return;
        let box = document.getElementById('gyChatActs');
        const cid = curChat();
        const items = !cid ? [] : (window.GY_CHAT_ACTIONS || []).filter(x => {
            try { return typeof x.show !== 'function' || x.show(cid); } catch (e) { return false; }
        });
        if (!items.length) { if (box) box.remove(); return; }
        if (!box) {
            box = document.createElement('div');
            box.id = 'gyChatActs';
            menu.insertBefore(box, menu.firstChild);
        }
        const name = (charOf(cid) || {}).name || 'TA';
        box.innerHTML = `<div class="gyca-hd">跟 ${esc(name)} 一起</div>
          <div class="gyca-grid">${items.map(x => `<button type="button" onclick="gyChatActRun('${x.id}')">
            <span class="gyca-i">${x.icon || '·'}</span>
            <span class="gyca-b"><b>${esc(x.label || '')}</b>${x.sub ? `<em>${esc(x.sub)}</em>` : ''}</span>
          </button>`).join('')}</div>`;
    };

    /* 内置这几条：功能本来就在，只是以前得绕到各自的页面去 */
    const has = n => typeof window[n] === 'function';
    window.gyChatActionAdd({
        id: 'music', icon: '🎧', label: '约 TA 一起听歌', sub: '正在放的这首',
        show: () => has('gymToggleListener'),
        run: id => window.gymToggleListener(id)
    });
    window.gyChatActionAdd({
        id: 'film', icon: '🎬', label: '约 TA 一起看片', sub: '放映厅里那部',
        show: () => has('fbToggleWatcher'),
        run: id => window.fbToggleWatcher(id, true)
    });
    window.gyChatActionAdd({
        id: 'read', icon: '📖', label: '约 TA 一起读书', sub: '去挑一本',
        show: () => has('gyOpenFeaturePage') && has('rtSetCompanion'),
        run: () => window.gyOpenFeaturePage('reading_together')
    });
    window.gyChatActionAdd({
        id: 'date', icon: '🤝', label: '约 TA 出去', sub: '在地图上挑个地方',
        show: () => has('gyOpenFeaturePage') && has('__gyMapCtxFor'),
        run: () => window.gyOpenFeaturePage('map')
    });
})();
