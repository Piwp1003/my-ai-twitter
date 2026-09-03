/* ===========================================================================
   js/28 —— 📨 所有"邀请"统一走私聊
   ---------------------------------------------------------------------------
   以前几个一起做点什么的功能（一起看电影、一起听歌、一起阅读、约出去），
   邀请这件事是**在后台悄悄发生**的：点一下按钮 → 偷偷调一次 API → 弹个 toast
   说"TA 来了"。问题是：
     · 你在私聊里翻不到这段。明明是"你约了 TA、TA 答应了"这么具体的一件事，
       聊天记录里一个字都没有，下次 TA 也不记得
     · 拒绝了只剩一句 toast，八秒之后就没了
     · 每个功能各写各的，措辞、能不能拒绝、拒绝之后怎么办，四份代码四个样

   现在统一成一件事：**邀请是发在私聊里的一条消息，TA 的回答也是私聊里的一条消息**，
   发完自动跳到那个人的聊天页，你能看着 TA 回。答应/拒绝还是由模型按人设决定，
   跟以前一样，只是这一来一回真的留下来了——以后 TA 提起"上次你叫我一起看的那个"
   是真的能在历史里翻到。

   💰 不额外花钱：邀请本来就要问 TA 一次，这里用的还是那一次。
   =========================================================================== */
(function () {
    if (window.__gyInviteLoaded) return;
    window.__gyInviteLoaded = true;

    const on = () => (typeof isAutoOn === 'function') ? isAutoOn('inviteInChat') : true;
    const charOf = id => (typeof myCharacters !== 'undefined' ? myCharacters : [])
        .find(c => String(c.id) === String(id)) || null;

    function pushMsg(charId, sender, text) {
        if (typeof globalChats === 'undefined' || !text) return;
        const sid = String(charId);
        if (!globalChats[sid]) globalChats[sid] = [];
        globalChats[sid].push({ sender, text, timestamp: Date.now(), readBy: [] });
    }

    function refresh(charId) {
        try { if (typeof saveAllData === 'function') saveAllData(); } catch (e) {}
        try {
            const chatOpen = typeof currentChatSessionId !== 'undefined'
                && String(currentChatSessionId) === String(charId)
                && document.getElementById('view-chat')
                && document.getElementById('view-chat').style.display !== 'none';
            if (chatOpen && typeof renderChatMessages === 'function') renderChatMessages();
            else if (typeof renderChatCharList === 'function') renderChatCharList();
        } catch (e) {}
    }

    /* 把一次邀请写进私聊并跳过去。
       char    ：邀请谁
       myText  ：你发出去的那句话（作为你的消息进聊天）
       reply   ：TA 的回答（作为 TA 的消息进聊天）；没有就只记你发的那句
       jump    ：默认 true，跳到那个人的聊天页
       notice  ：TA 拒绝时在通知里也留一条，免得你没在看聊天页就错过了      */
    window.gyInviteInChat = function ({ char, myText, reply, ok, jump = true, what } = {}) {
        try {
            const c = (typeof char === 'object') ? char : charOf(char);
            if (!c) return;
            if (!on()) {                      // 开关关了就退回老样子：只弹个提示，不动聊天记录
                if (typeof showToast === 'function') showToast('', c.name, reply || myText, null, c.id, false);
                return;
            }
            if (myText) pushMsg(c.id, 'me', myText);
            if (reply) pushMsg(c.id, c.id, reply);
            refresh(c.id);
            if (reply && typeof addNotification === 'function') {
                addNotification(`<b>${c.name}</b> 回了你的邀请${what ? '（' + what + '）' : ''}`, null, c.id, c, reply);
            }
            if (jump && typeof switchMainView === 'function') {
                switchMainView('chat');
                if (typeof switchChatSession === 'function') switchChatSession(c.id);
            }
        } catch (e) { console.warn('[邀请] 写进私聊时出错，已跳过：', e); }
    };

    /* 统一的"问 TA 去不去"。返回 {ok, line}。
       各功能自己拼 ask，这里只负责调用 + 解析 + 兜底，省得四份代码四种解析。 */
    window.gyInviteAsk = async function (char, ask, fallbackYes = true) {
        const out = { ok: fallbackYes, line: '' };
        try {
            const c = (typeof char === 'object') ? char : charOf(char);
            if (!c) return out;
            const api = (typeof getApiConfig === 'function') ? getApiConfig(true) : null;
            if (!api || !api.key) { out.line = ''; return out; }
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
})();
