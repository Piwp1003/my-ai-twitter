// ===== 用户纪念日管理函数 =====
function renderUserAnniversaryList() {
    const container = document.getElementById('userAnniversaryList');
    if(!container) return;
    if(!currentUser.customAnniversaries || currentUser.customAnniversaries.length === 0) {
        container.innerHTML = '<span style="color:#8b98a5; font-size:12px;">还没有添加纪念日</span>';
        return;
    }
    container.innerHTML = currentUser.customAnniversaries.map((ann, idx) => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:6px; background:white; border:1px solid #eff3f4; border-radius:4px;">
            <span style="font-size:12px;">📅 ${ann.date} - ${ann.label}</span>
            <span onclick="deleteUserAnniversary(${idx})" style="cursor:pointer; color:#f91880; margin-left:8px; font-weight:bold;">×</span>
        </div>
    `).join('');
}

function addUserAnniversary() {
    const dateElem = document.getElementById('newUserAnniversaryDate');
    const labelElem = document.getElementById('newUserAnniversaryLabel');
    const date = dateElem ? dateElem.value.trim() : '';
    const label = labelElem ? labelElem.value.trim() : '';

    if(!date || !label) {
        alert('请输入日期和纪念日描述');
        return;
    }

    if(!currentUser.customAnniversaries) currentUser.customAnniversaries = [];
    if(currentUser.customAnniversaries.some(a => a.date === date && a.label === label)) {
        alert('这个纪念日已经存在了');
        return;
    }

    currentUser.customAnniversaries.push({ date, label });
    if(dateElem) dateElem.value = '';
    if(labelElem) labelElem.value = '';
    saveAllData();
    renderUserAnniversaryList();
}

function deleteUserAnniversary(idx) {
    if(!currentUser.customAnniversaries) return;
    currentUser.customAnniversaries.splice(idx, 1);
    saveAllData();
    renderUserAnniversaryList();
}


// ===================== 角色专属：纪念日 + 回忆相册（日历图标）=====================
let currentCalendarCharId = null; // 当前打开的纪念日弹窗对应的角色，供添加/删除纪念日直接使用，避免猜测
function openCharCalendarModal(charId) {
    const char = myCharacters.find(c => c.id == charId); if (!char) return;
    currentCalendarCharId = char.id;
    document.getElementById('charCalendarTitle').innerText = `📅 ${char.name} 的纪念日与回忆`;
    document.getElementById('charAnniversaryNoteText').style.display = 'none';
    document.getElementById('charAnniversaryNoteText').innerText = '';

    // 渲染真正的纪念日列表（含手动添加的纪念日 + AI记忆推断的纪念日），而不是只显示一句"认识天数"
    renderCharCalendarModalContent(char.id);

    openModal('charCalendarModal');
}

async function generateCharAnniversaryNote() {
    const charId = currentProfileId;
    const char = myCharacters.find(c => c.id == charId); if (!char) return;
    const api = getApiConfig(true); if (!api.key) return alert('请先在设置中配置 API 密钥！');

    const btn = document.getElementById('charAnniversaryNoteBtn');
    btn.disabled = true; btn.innerText = '生成中...';

    const history = globalChats[charId];
    const daysSince = history && history.length > 0 ? Math.floor((Date.now() - history[0].timestamp) / 86400000) : 0;
    const memories = memoryAlbum.filter(m => m.charId == charId).slice(0, 8).map(m => m.text).join('\n---\n');

    const prompt = `你是"${char.name}"，人设：${char.persona}。
你和用户已经认识 ${daysSince} 天了。
以下是你们之间被收藏下来的一些高光回忆片段：
${memories || '（暂时还没有被收藏的回忆）'}

请以你自己的口吻，写一段简短的纪念寄语给用户（不超过100字），可以回顾一下这段时间，也可以只是很自然地表达你此刻的心情，要符合你的人设和语气，不要写成正式的贺卡文案，就像你会亲口对用户说的话一样。直接输出内容，不要加引号或多余说明。`;

    try {
        const data = await sendChatRequest(api, prompt);
        if (data.error) throw new Error(data.error.message);
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text) throw new Error('生成内容为空');
        const noteEl = document.getElementById('charAnniversaryNoteText');
        noteEl.innerText = text; noteEl.style.display = 'block';
    } catch (e) { alert('生成失败：' + e.message); }
    btn.disabled = false; btn.innerText = '✨ 生成一段纪念寄语';
}

// ---------- 聊天联系人：排序/筛选/置顶 通用工具 ----------
function getLastMsgTime(sessionId) {
    const msgs = globalChats[sessionId];
    if (!msgs || msgs.length === 0) return 0;
    return msgs[msgs.length - 1].timestamp || 0;
}
function chatHasUnread(sessionId) {
    const msgs = globalChats[sessionId];
    return !!(msgs && msgs.some(m => m.sender !== 'me' && m.sender !== 'system' && (!m.readBy || !m.readBy.includes('me'))));
}
function getChatListItems() {
    return [...groupChats, ...myCharacters].map(x => ({
        id: x.id, name: x.name, raw: x, isGroup: !!x.members,
        group: x.members ? null : (x.group || null), // 群聊没有分组概念，统一按"未分组"处理
    }));
}
function sortChatListItems(items) {
    const isPinnedId = (id) => pinnedSessionIds.some(pid => pid == id);
    const pinned = items.filter(it => isPinnedId(it.id));
    const unpinned = items.filter(it => !isPinnedId(it.id));
    function cmp(a, b) {
        const aU = chatHasUnread(a.id), bU = chatHasUnread(b.id);
        if (aU !== bU) return aU ? -1 : 1;
        return getLastMsgTime(b.id) - getLastMsgTime(a.id);
    }
    pinned.sort(cmp); unpinned.sort(cmp);
    return [...pinned, ...unpinned];
}
function toggleChatPin(id) {
    const idx = pinnedSessionIds.findIndex(pid => pid == id);
    if (idx >= 0) pinnedSessionIds.splice(idx, 1); else pinnedSessionIds.push(id);
    saveAllData();
    renderChatCharList();
}
function toggleChatListViewMode() {
    chatListViewMode = chatListViewMode === 'row' ? 'list' : 'row';
    if (chatListViewMode === 'list') chatListShowingList = true;
    saveAllData();
    renderChatCharList();
}
function backToContactList() {
    chatListShowingList = true;
    renderChatCharList();
}

// ---------- 主入口：根据当前视图模式分派渲染 ----------
function renderChatCharList() {
    const toggleBtn = document.getElementById('chatListViewToggleBtn');
    if (toggleBtn) toggleBtn.textContent = chatListViewMode === 'row' ? '☰ 列表' : '▦ 头像条';

    const rowContainer = document.getElementById('chatCharRow');
    const listContainer = document.getElementById('chatListVertical');
    const backBtn = document.getElementById('chatListBackBtn');
    const messagesArea = document.getElementById('chatMessagesArea');
    const inputArea = document.getElementById('chatInputArea');

    if (chatListViewMode === 'row') {
        // 头像条模式：联系人条和聊天内容一直同时显示，跟以前一样
        if (rowContainer) rowContainer.style.display = 'flex';
        if (listContainer) listContainer.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';
        if (messagesArea) messagesArea.style.display = 'flex';
        renderChatCharRow();
    } else {
        // 竖排列表模式：列表和聊天内容二选一显示，点进某个联系人才看到聊天界面
        if (rowContainer) rowContainer.style.display = 'none';
        if (chatListShowingList) {
            if (listContainer) listContainer.style.display = 'flex';
            if (backBtn) backBtn.style.display = 'none';
            if (messagesArea) messagesArea.style.display = 'none';
            if (inputArea) inputArea.style.display = 'none';
            renderChatCharListVertical();
        } else {
            if (listContainer) listContainer.style.display = 'none';
            if (backBtn) backBtn.style.display = 'inline-block';
            if (messagesArea) messagesArea.style.display = 'flex';
            // inputArea 的显示由 switchChatSession 自己控制，这里不用管
        }
    }
}

// ---------- 视图一：横向头像条（原有样式，加了排序/筛选/置顶）----------
function renderChatCharRow() {
    const container = document.getElementById('chatCharRow');
    if (!container) return;
    let html = '';
    const items = sortChatListItems(getChatListItems());
    items.forEach(it => {
        const x = it.raw;
        let hasUnread = chatHasUnread(x.id);
        let unreadHtml = hasUnread ? `<div style="position:absolute; top:-2px; right:-2px; width:14px; height:14px; background:#f91880; border-radius:50%; border:2px solid white; z-index:2;"></div>` : '';
        let branchHtml = x.branchedFrom ? `<div style="position:absolute; bottom:-2px; left:-2px; font-size:12px; z-index:2;" title="分支自：${x.branchedFromName || '未知'}">🌳</div>` : '';
        const isGroupItem = !!x.members;
        // 👇这里加入了手机长按的支持；置顶操作收纳进右键/长按菜单，头像上不再显示图钉图标
        html += `<div class="chat-char-item ${currentChatSessionId == x.id ? 'active' : ''}" onclick="switchChatSession('${x.id}')">
            <div style="position:relative; display:inline-block;" ${isGroupItem ? `oncontextmenu="showGroupAvatarContextMenu(event, '${x.id}')" ontouchstart="groupAvatarTouchStart(event, '${x.id}')" ontouchend="groupAvatarTouchEnd(event)" ontouchmove="groupAvatarTouchEnd(event)"` : `oncontextmenu="showAvatarContextMenu(event, '${x.id}')" ontouchstart="avatarTouchStart(event, '${x.id}')" ontouchend="avatarTouchEnd(event)" ontouchmove="avatarTouchEnd(event)"`}>${x.members ? getGroupAvatarHTML(x, 50) : getAvatarHTML(x, 50)}${unreadHtml}${branchHtml}</div>
            <div class="chat-char-name" style="font-size:12px; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;">${x.name}</div>
        </div>`;
    });
    container.innerHTML = html;
}

// ---------- 视图二：竖排列表（头像+名字+最后消息预览+时间+未读点+置顶按钮）----------
function renderChatCharListVertical() {
    const container = document.getElementById('chatListVertical');
    if (!container) return;
    let html = '';
    const items = sortChatListItems(getChatListItems());
    items.forEach(it => {
        const x = it.raw;
        const isPinned = pinnedSessionIds.some(pid => pid == x.id);
        const hasUnread = chatHasUnread(x.id);
        const msgs = globalChats[x.id] || [];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        let previewText = '暂无消息';
        if (lastMsg) {
            if (lastMsg.sender === 'system') previewText = lastMsg.text;
            else if (lastMsg.sender === 'me') previewText = `我：${lastMsg.text}`;
            else {
                const senderChar = myCharacters.find(c => c.id == lastMsg.sender);
                previewText = x.members ? `${senderChar ? senderChar.name : '未知'}：${lastMsg.text}` : lastMsg.text;
            }
            previewText = String(previewText).replace(/\n/g, ' ').slice(0, 30);
        }
        const timeText = lastMsg ? timeAgo(lastMsg.timestamp) : '';
        const isGroupItem = !!x.members;
        // 置顶操作收纳进右键/长按菜单，行内不再显示图钉图标；长按沿用和头像条模式一样的手机端支持
        const ctxAttrs = isGroupItem
            ? `oncontextmenu="showGroupAvatarContextMenu(event, '${x.id}')" ontouchstart="groupAvatarTouchStart(event, '${x.id}')" ontouchend="groupAvatarTouchEnd(event)" ontouchmove="groupAvatarTouchEnd(event)"`
            : `oncontextmenu="showAvatarContextMenu(event, '${x.id}')" ontouchstart="avatarTouchStart(event, '${x.id}')" ontouchend="avatarTouchEnd(event)" ontouchmove="avatarTouchEnd(event)"`;
        html += `<div class="chat-list-row ${currentChatSessionId == x.id ? 'active' : ''} ${isPinned ? 'pinned' : ''}" onclick="switchChatSession('${x.id}')" ${ctxAttrs}>
            <div style="position:relative; flex-shrink:0;">${x.members ? getGroupAvatarHTML(x, 44) : getAvatarHTML(x, 44)}${hasUnread ? '<div class="chat-list-unread-dot"></div>' : ''}</div>
            <div class="chat-list-info">
                <div class="chat-list-top-row"><span class="chat-list-name">${isPinned ? '📌 ' : ''}${escapeHtml(x.name)}</span><span class="chat-list-time">${timeText}</span></div>
                <div class="chat-list-preview">${escapeHtml(previewText)}</div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function updateGroupSpeakOrder() {
    const g = groupChats.find(g => g.id === currentSummaryCharId);
    if (!g) return;
    g.speakOrder = document.getElementById('groupSpeakOrderSelect').value;
    saveAllData();
}

function exportChatTxt() {
    if(!currentSummaryCharId) return; let session = globalChats[currentSummaryCharId] || []; if(session.length === 0) return alert("当前聊天记录为空！");
    let txt = session.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender === 'me' ? currentUser.name : (m.sender === 'system' ? '系统' : (myCharacters.find(c=>c.id==m.sender)?.name || m.sender))}: ${m.text}`).join('\n');
    saveTextFileForApp(`chat_${currentSummaryCharId}.txt`, txt, 'text/plain');
}

function importChatTxt(event) {
    let file = event.target.files[0]; if(!file) return; let reader = new FileReader();
    reader.onload = function(e) {
        let lines = e.target.result.split('\n'); if(!globalChats[currentSummaryCharId]) globalChats[currentSummaryCharId] = [];
        let session = globalChats[currentSummaryCharId], nameMap = { [currentUser.name]: 'me', '用户': 'me', '我': 'me', '系统': 'system', 'system': 'system' };
        myCharacters.forEach(c => { nameMap[c.name] = c.id; });
        lines.forEach(line => {
            let match = line.trim().match(/^\[(.*?)\]\s*(.*?):\s*(.*)$/);
            if(match) { let senderId = nameMap[match[2].trim()] || 'system'; session.push({ sender: senderId, text: senderId === 'system' && match[2].trim() !== '系统' ? `${match[2]}: ${match[3]}` : match[3].trim(), timestamp: new Date(match[1]).getTime() || Date.now(), readBy: [] }); } 
            else if(line.trim()) { session.push({ sender: 'system', text: line.trim(), timestamp: Date.now() }); }
        });
        saveAllData(); if (currentChatSessionId === currentSummaryCharId) renderChatMessages(); alert("TXT导入成功！"); closeModal('chatTxtModal'); document.getElementById('importTxtInput').value = '';
    };
    reader.readAsText(file);
}

// ST的 send_date 常见是"April 26, 2026 6:06am"这种人写的格式（月份全称+逗号+12小时制，am/pm前面没有空格），
// 浏览器原生 Date.parse 认不出这种没空格的写法会直接返回NaN——实测在 am/pm 前面补一个空格就能正常解析了，
// 所以第一次解析失败时，再补个空格重试一次；两次都失败就说明格式实在太特殊，返回NaN让调用方自己兜底成当前时间。
function tryParseSendDate(str) {
    let parsed = Date.parse(str);
    if (!isNaN(parsed)) return parsed;
    const spaced = str.replace(/(\d)(am|pm)\b/i, '$1 $2');
    parsed = Date.parse(spaced);
    return isNaN(parsed) ? NaN : parsed;
}
// 导入 SillyTavern 的原生聊天记录文件(.jsonl)：这是ST每个角色单独的聊天日志格式，逐行都是一个独立JSON对象——
// 第一行是"头信息"(user_name/character_name/chat_metadata)，从第二行起才是一条条真正的消息。
// 消息行格式：{name, is_user, is_system(可选), send_date, mes, extra:{display_text?}, swipe_id?, swipes?}。
// 因为这个按钮是从"某个角色"的聊天选项弹窗里点开的，天然知道要导入到哪个角色身上，不用再额外选一次角色。
function importChatJsonl(event) {
    const file = event.target.files[0]; if (!file) return;
    const cleanReasoning = document.getElementById('jsonlImportCleanReasoning') ? document.getElementById('jsonlImportCleanReasoning').checked : true;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const rawLines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
            if (rawLines.length === 0) { alert('这个文件是空的，没有可以导入的内容。'); return; }

            // 第一行是头信息，不是消息——按ST的真实格式判断：包含 user_name / character_name / chat_metadata 这几个字段之一
            // 就当作头信息跳过；万一格式不标准（比如手动拼过的文件）导致第一行判断不出来，就干脆整份当消息处理，
            // 后面逐行解析失败的行会自动跳过，不会导致整个导入失败。
            let startIdx = 0;
            try {
                const first = JSON.parse(rawLines[0]);
                if (first && (first.user_name !== undefined || first.character_name !== undefined || first.chat_metadata !== undefined)) startIdx = 1;
            } catch (e2) { /* 第一行解析不了就当成普通消息处理，不跳过 */ }

            if (!globalChats[currentSummaryCharId]) globalChats[currentSummaryCharId] = [];
            const session = globalChats[currentSummaryCharId];
            let importedCount = 0, skippedCount = 0;

            for (let i = startIdx; i < rawLines.length; i++) {
                let msg;
                try { msg = JSON.parse(rawLines[i]); } catch (e3) { skippedCount++; continue; }
                if (!msg || typeof msg !== 'object') { skippedCount++; continue; }
                let text = (msg.extra && msg.extra.display_text) || msg.mes;
                // 用跟直播生成同一套"前缀/后缀可配置"规则处理（设置里的思维链格式列表+显示模式），
                // 而不是导入单独写死一套逻辑——这样以后加新格式/改折叠还是删除，两边行为自动保持一致。
                if (cleanReasoning && !msg.is_user && !msg.is_system) text = processReasoningInText(text);
                // 同理，导入的历史记录里如果带着MVU变量补丁块（状态栏那套），也要按当前会话的规则剥离+应用一次，
                // 不然老聊天记录导入进来照样是一堆裸JSON糊在气泡里。
                let mvuSnapshot = null;
                if (!msg.is_user && !msg.is_system) {
                    const mvuResult = processMvuPatchInText(text, currentSummaryCharId);
                    text = mvuResult.cleanText;
                    mvuSnapshot = mvuResult.snapshot;
                }
                if (!text) { skippedCount++; continue; } // 没有正文内容的行（比如只有系统元数据）没有导入的意义

                let sender;
                if (msg.is_system) sender = 'system';
                else if (msg.is_user) sender = 'me';
                else sender = currentSummaryCharId; // 非用户、非系统消息，一律算这个角色说的（ST的单角色聊天文件本来就是这么对应的）

                // send_date 这个字段在ST里格式很不统一：可能是"April 26, 2026 6:06am"这种人类可读格式，
                // 也可能是ISO字符串，甚至有些是数字形式的Unix毫秒时间戳——这里都试一遍，都解析不出来就用当前时间兜底。
                let timestamp = Date.now();
                if (typeof msg.send_date === 'number' && !isNaN(msg.send_date)) {
                    timestamp = msg.send_date;
                } else if (typeof msg.send_date === 'string' && msg.send_date.trim()) {
                    const parsed = tryParseSendDate(msg.send_date);
                    if (!isNaN(parsed)) timestamp = parsed;
                }

                session.push({ sender, text, timestamp, readBy: [], mvuSnapshot });
                importedCount++;
            }

            saveAllData();
            if (currentChatSessionId === currentSummaryCharId) renderChatMessages();
            alert(`SillyTavern聊天记录导入完成！\n成功导入 ${importedCount} 条消息${skippedCount > 0 ? `，跳过了 ${skippedCount} 条无法识别的行` : ''}。`);
            closeModal('chatTxtModal');
            document.getElementById('importJsonlInput').value = '';
        } catch (err) {
            console.error('导入jsonl聊天记录失败：', err);
            alert('导入失败：' + err.message + '\n请确认这是SillyTavern导出的.jsonl聊天文件。');
        }
    };
    reader.readAsText(file);
}

function getRecentChatContext(charId) {
    let session = globalChats[charId] || [];
    return session.slice(-chatHistoryTurns).filter(m => m.sender !== 'system').map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender === 'me' ? "用户" : "你"}: ${m.text}`).join('\n');
}

// 🆕 给"AI自己主动引用一条最近说过的话"用：把最近几条消息编个号列出来，AI在这一轮回复时可以用编号
// 点名要引用哪条（不管是用户说的还是它自己之前说的）。消息本身一直没有稳定的id字段（手动"引用回复"
// 功能也是靠临时抓取当前这条消息的{name,text}快照实现的，不依赖id），这里用同样的思路：编号只在
// 这一次生成的prompt里临时有效，AI选完号，代码从同一份list数组里按下标精确取出对应的{name,text}。
function buildQuotableRecentMessages(sessionId, char, isGroup) {
    const msgs = (globalChats[sessionId] || []).slice(-12).filter(m => m.sender !== 'system' && m.text && m.text.trim());
    const list = msgs.map(m => ({
        name: m.sender === 'me' ? currentUser.name : (isGroup ? (myCharacters.find(c => c.id == m.sender)?.name || '未知') : char.name),
        text: m.text
    }));
    if (list.length === 0) return { promptText: '', list: [] };
    const linesText = list.map((m, i) => `${i + 1}. ${m.name}: ${m.text.slice(0, 60)}`).join('\n');
    const promptText = `\n【可引用的最近消息（可选功能，大部分时候不需要用）】：如果这一轮你想明确引用/回应最近说过的某一句话（不管是对方说的还是你自己之前说的），可以在其中一条回复的text最前面加上 [QUOTE:编号]（编号对照下面列表），没有特别想引用的就完全不要加这个标记：\n${linesText}\n`;
    return { promptText, list };
}


function switchChatSession(id) {
    currentChatSessionId = id.toString();
    chatListShowingList = false;
    renderChatCharList();
    const chatInput = document.getElementById('chatInputArea');
    if(chatInput) chatInput.style.display = 'flex';
    // 防御：开场白相关逻辑（角色数据/插件/宏都可能出岔子）如果在这里抛错，之前会导致下面的
    // renderChatMessages()整个都不执行——表现出来就是"新聊天开场白不显示"，其实是连聊天界面都没刷新。
    // 分开try/catch，保证不管开场白那边出不出错，聊天消息区始终会尝试渲染。
    try { sendFirstMessageIfNeeded(id.toString()); } catch (e) { console.error('生成开场白时出错，已跳过：', e); }
    try { renderChatMessages(); } catch (e) { console.error('渲染聊天消息时出错：', e); }
    checkAndAnnounceAnniversary(id.toString());
    refreshLifeStateOnChatEnter(id.toString());
    renderChatPluginActionsBar();
    refreshMiniGameIconBadge();

    // 修复：取消了原先的强制自动生成日程，现在完全由用户通过长按头像来手动生成
}

// 首次打开和某个角色的聊天（没有任何历史消息）时，如果设置了开场白，就自动发出来当第一条消息。
// 🐛 之前踩过两版坑：
// 1）多开场白时弹选择框——曾经因为触发时机在"跳转进聊天界面"之前，视觉上像是"点联系人没反应，只弹了个选择框"；
// 2）为了避开1，改成不管几个候选都直接用第一个——结果撞上不少酒馆卡的常见写法：first_mes本身写的是一份
//    "开场白目录/索引"（列出所有分支剧情的标题+简介，本身不是真的开场白正文，要靠用户从"候选开场白"里手动挑一个
//    真正的开场白），直接把这份索引当正文发出去，看起来就是"点开开场白还是一大段文字糊一脸"。
// 现在 switchChatSession 里已经先做了 currentChatSessionId赋值+renderChatCharList()把界面切到聊天页，
// 之后才会调用这个函数——也就是"跳转"这一步已经完成了，所以多候选时弹选择框不会再有当年"看起来没跳转"的问题，
// 可以放心恢复成"有多个候选就弹出来给用户挑"，避免盲目挑到像目录索引这种其实不该被直接使用的候选。
function sendFirstMessageIfNeeded(sessionId) {
    if (sessionId.startsWith('g_')) return; // 群聊不适用
    const char = myCharacters.find(c => c.id == sessionId);
    if (!char) return;
    if (globalChats[sessionId] && globalChats[sessionId].length > 0) return; // 已经聊过了就不重复发
    const options = getGreetingOptions(char);
    if (options.length === 0) return;
    // 💡 不管候选开场白有几个，统一弹出选择框——里面会带一张"不使用开场白"的卡片，
    // 用户可以自己决定要不要用、用哪个，不再对"只有一个候选"的情况静默自动帮用户选定。
    showGreetingPicker(sessionId);
}

// 汇总一个角色所有能用的开场白：自己填的开场白 + 角色卡带的候选开场白，去重后返回
function getGreetingOptions(char) {
    let options = [];
    try {
        if (char && typeof char.firstMessage === 'string' && char.firstMessage.trim()) options.push(char.firstMessage.trim());
        if (char && Array.isArray(char.alternateGreetings)) {
            char.alternateGreetings.forEach(g => {
                if (typeof g === 'string' && g.trim() && !options.includes(g.trim())) options.push(g.trim());
            });
        }
    } catch (e) { console.error('读取开场白候选列表时出错：', e); }
    return options;
}

function applyGreetingAsFirstMessage(sessionId, greetingText) {
    const char = myCharacters.find(c => c.id == sessionId);
    if (!char) return;
    // 选好了具体是哪个候选之后，正文里就不需要再带 <!-- title -->/<!-- desc --> 这两行元数据注释了
    // （那是给挑选界面看的标签，不是真的开场白正文），发到聊天里/存进存档前先去掉，不然每次都得看着这两行注释。
    const meta = parseGreetingMeta(greetingText);
    let text = meta ? meta.body : greetingText;
    try { text = applyMacros(text, char); } catch (e) { console.error('开场白宏替换出错，改用原文：', e); }
    // 开场白是角色卡作者直接写死在卡里的文本，不是AI临场生成的，但同样可能带着正则脚本要处理的占位符语法，
    // 甚至（真实遇到过）作者直接把一份"状态栏JSON补丁"的示例文本焊在了开场白里——这些跟AI回复走的是两条
    // 不同的代码路径，之前只处理了AI回复那一条，开场白这边一直漏着，导致原始JSON会原样糊出来。
    text = applyRegexScripts(text, 'ai_output', char.id);
    const mvuResult = processMvuPatchInText(text, sessionId);
    text = mvuResult.cleanText;
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: char.id, text, timestamp: Date.now(), readBy: [], mvuSnapshot: mvuResult.snapshot });
    saveAllData();
    if (currentChatSessionId === sessionId) { try { renderChatMessages(); } catch (e) { console.error('渲染聊天消息时出错：', e); } }
}

// 统一的"重新开始聊天"入口（长按头像触发）：先问要不要保留现在这段对话——
// 保留的话会自动克隆一个角色副本把旧聊天记录存进去，当前角色再清空重新开始；
// 不保留就直接清空。无论角色有几个开场白（0个/1个/多个）都能用这个入口重新开始。
async function restartChatWithGreeting(charId) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;
    const hasHistory = globalChats[charId] && globalChats[charId].length > 0;

    if (hasHistory) {
        // 💡 修复：修改提示文案与逻辑，改为将旧对话收纳进历史记录
        const keepOld = await appConfirm(`要保留现在和${char.name}的这段对话吗？\n【确定】= 将旧对话收拢归档到历史记录中（可在右键菜单查看），当前清空重新开始\n【取消】= 直接彻底清空重新开始（旧记录会丢失）`);
        if (keepOld) {
            if (!char.archivedChats) char.archivedChats = [];
            char.archivedChats.push({
                id: Date.now(),
                timeStr: new Date().toLocaleString('zh-CN'),
                messages: JSON.parse(JSON.stringify(globalChats[charId]))
            });
            saveAllData();
        }
        globalChats[charId] = [];
    }

    const options = getGreetingOptions(char);
    if (options.length === 0) {
        saveAllData();
        if (currentChatSessionId === charId) renderChatMessages();
        else switchChatSession(charId);
        alert(hasHistory ? '已经清空并重新开始了（这个角色没有设置开场白，你可以先开口打个招呼）。' : '这个角色没有设置开场白，直接开口聊就行～');
    } else {
        // 💡 不管候选开场白有几个，统一走"先跳转过去→弹出选择框（含"不使用开场白"选项）"这条路径，
        // 不再对"只有一个候选"的情况自动帮用户选定——用户始终能自己决定要不要用、用哪个开场白。
        // 🐛 修复：这里之前漏了"如果当前不在这个角色的聊天里，先跳转过去"这一步
        // （options.length === 1 的分支上面就有这一句，多开场白这条分支却漏掉了）。
        // 不加这句的话，从别的角色的聊天页/联系人列表右键"重新开始聊天"选中一个有多开场白的角色时，
        // 选完开场白后画面还留在原来那个角色的聊天里，看起来就像"点了开场白但没跳转过去"。
        if (currentChatSessionId !== charId) {
            // switchChatSession 内部的 sendFirstMessageIfNeeded 会检测到"没有历史记录+多个候选开场白"
            // 并自动弹出选择框，这里不用再手动调一次 showGreetingPicker，不然会连续弹两次（虽然内容一样、无害，但没必要）。
            switchChatSession(charId);
        } else {
            showGreetingPicker(charId);
        }
    }
}

// 不少酒馆卡的候选开场白正文最前面会带 <!-- title: xxx --> / <!-- desc: xxx --> 这种HTML注释当"元数据标题/简介"
// （这正是这次踩坑的角色卡的写法——它的first_mes本身是把所有候选开场白的title/desc汇总成一份"目录页"）。
// 挑选框如果直接把带注释语法的原始正文糊一脸，用户还是得从一堆"<!-- title: -->"里自己找有用信息——
// 这里识别到就单独抽出来做成"标题+简介"展示，正文只留一段简短预览；没有这种注释头的普通开场白就还是老样子全文预览。
function parseGreetingMeta(text) {
    const m = text.match(/^\s*<!--\s*title:\s*([\s\S]*?)\s*-->\s*(?:\r?\n)?\s*<!--\s*desc:\s*([\s\S]*?)\s*-->\s*(?:\r?\n)?([\s\S]*)$/i);
    if (!m) return null;
    return { title: m[1].trim(), desc: m[2].trim(), body: m[3].trim() };
}

// 有些角色卡的 firstMessage 本身写的不是真开场白，而是一份"目录页/索引页"
// （标题带"目录"，正文是 <greetings>0. xxx\n1. xxx...</greetings> 这种编号列表，
// 真正能用的正文其实都在 alternateGreetings 里）。这种候选选中了就是一整段索引文字糊脸上，
// 所以挑选框里要能认出它、单独标红提醒，并且排在候选列表最后面，避免用户顺手点了第一张卡就中招。
function isMenuLikeGreeting(text) {
    if (!text) return false;
    const meta = parseGreetingMeta(text);
    const title = meta ? meta.title : (text.match(/^\s*<!--\s*title:\s*([\s\S]*?)\s*-->/i) || [])[1] || '';
    const body = meta ? meta.body : text;
    if (/目录|索引/.test(title)) return true;
    if (/<greetings>[\s\S]*<\/greetings>/i.test(body)) return true;
    return false;
}

// 把"候选开场白列表"渲染成挑选框里的卡片列表——聊天和续写两处挑选框长得一样、复用同一份渲染逻辑，
// labelFn(idx, item) 可以给每张卡片加一个额外的前缀标签（比如续写模式下要标出"这是哪个角色的开场白"）。
// 注意：这里的 idx 是渲染出来卡片的顺序，点击时会通过 onclick 里的 idx 去 window.__greetingPickerOptions 找原始数据，
// 所以排序（把目录页类选项放最后）必须在传进来之前就排好，这个函数本身只管渲染、不做排序。
function renderGreetingOptionCards(options, labelFn) {
    return options.map((item, idx) => {
        const g = typeof item === 'string' ? item : item.text;
        const meta = parseGreetingMeta(g);
        const isMenu = isMenuLikeGreeting(g);
        const esc = s => (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const bodyForPreview = meta ? meta.body : g;
        const preview = bodyForPreview.length > 200 ? bodyForPreview.slice(0, 200) + '……' : bodyForPreview;
        const extraLabel = labelFn ? labelFn(idx, item) : '';
        const warnHtml = isMenu ? `<div style="font-size:12px; font-weight:bold; color:#e0245e; margin-bottom:2px;">⚠️ 疑似目录/索引页，可能不是正式开场白，请谨慎选择</div>` : '';
        const titleColor = isMenu ? '#e0245e' : '#1d9bf0';
        const headerHtml = meta
            ? `<div style="font-size:14px; font-weight:bold; color:${titleColor}; margin-bottom:2px;">${extraLabel}${esc(meta.title) || `候选 ${idx + 1}`}</div>${meta.desc ? `<div style="font-size:12px; color:#536471; margin-bottom:6px;">${esc(meta.desc)}</div>` : ''}`
            : `${extraLabel ? `<div style="font-size:12px; font-weight:bold; color:${titleColor}; margin-bottom:2px;">${extraLabel}</div>` : ''}`;
        return `
        <div class="wb-card" style="min-width:0; max-width:none; width:100%; cursor:pointer; margin-bottom:8px; ${isMenu ? 'border:1px solid #e0245e;' : ''}" onclick="selectGreeting(${idx})">
            ${warnHtml}
            ${headerHtml}
            <div style="font-size:13px; color:#0f1419; white-space:pre-wrap; max-height:${meta ? '80px' : '150px'}; overflow-y:auto;">${esc(preview)}</div>
        </div>`;
    }).join('');
}

// 把候选开场白列表排序：目录页/索引类的排到最后面，避免顶在第一张卡被顺手点中；
// 其余选项保持原有的相对顺序（稳定排序）。item 可能是字符串，也可能是 {text, ...} 结构（续写模式）。
function sortGreetingOptionsMenuLast(options) {
    const getText = item => typeof item === 'string' ? item : item.text;
    return options.map((item, idx) => ({ item, idx, isMenu: isMenuLikeGreeting(getText(item)) }))
        .sort((a, b) => (a.isMenu === b.isMenu) ? (a.idx - b.idx) : (a.isMenu ? 1 : -1))
        .map(x => x.item);
}

function showGreetingPicker(charId) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;
    const options = sortGreetingOptionsMenuLast(getGreetingOptions(char));
    if (options.length === 0) return;
    window.__greetingPickerMode = 'chat';
    window.__greetingPickerCharId = charId;
    window.__greetingPickerOptions = options;

    document.getElementById('greetingPickerTitle').innerText = `💬 选择 ${char.name} 的开场白`;
    // 💡 聊天模式专属：最上面加一张"不使用开场白"的卡片，用户可以自己决定不用角色卡自带的开场白，
    // 直接自己先开口——续写模式(showNovelGreetingPicker)不需要这张卡，那边没有"跳过"这个概念。
    const skipCardHtml = `
        <div class="wb-card" style="min-width:0; max-width:none; width:100%; cursor:pointer; margin-bottom:8px; border:1px dashed #536471;" onclick="skipGreetingPicker()">
            <div style="font-size:14px; font-weight:bold; color:#536471; margin-bottom:2px;">🚫 不使用开场白</div>
            <div style="font-size:13px; color:#536471;">直接开始聊天，自己先开口说第一句</div>
        </div>`;
    document.getElementById('greetingPickerList').innerHTML = skipCardHtml + renderGreetingOptionCards(options);
    openModal('greetingPickerModal');
}

// 用户在聊天开场白选择框里点了"不使用开场白"：不推送任何角色消息，改成推送一条小的系统提示，
// 一是让用户清楚知道"跳过"生效了，二是让 globalChats[charId].length > 0，避免下次再进这个聊天时
// sendFirstMessageIfNeeded 发现历史仍是空的、又弹一次选择框（相当于用这条系统提示当"已经决定过了"的标记）。
function skipGreetingPicker() {
    const charId = window.__greetingPickerCharId;
    closeModal('greetingPickerModal');
    if (!charId) return;
    if (!globalChats[charId]) globalChats[charId] = [];
    if (globalChats[charId].length === 0) {
        globalChats[charId].push({ sender: 'system', text: '已跳过开场白，你可以先开口打个招呼～', timestamp: Date.now(), readBy: [] });
        saveAllData();
    }
    if (currentChatSessionId === charId) { try { renderChatMessages(); } catch (e) { console.error('渲染聊天消息时出错：', e); } }
    else switchChatSession(charId);
}

// 续写/小说模式的开场白挑选：把这个故事里"已勾选参与"的每个角色的候选开场白都汇总进来，
// 卡片上额外标出是哪个角色的（一个故事可能挂了好几个角色），选中后直接当第一轮"AI"内容插进续写记录，
// 不用调用AI接口——这就是一段已经写好的开场文字，没必要为它专门请求一次生成。
// forOutlineMode：true=从"一键生成模式"里调用（开场白会被当成一章内容，走预览区"保留/重新生成/放弃"流程）；
// 不传/false=从"互动续写模式"调用（开场白直接作为续写第一轮插入，原有行为不变）。
function showNovelGreetingPicker(forOutlineMode) {
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if (!novel) return;
    const selChars = Array.from(document.querySelectorAll('.novel-char-check:checked')).map(cb => cb.value);
    const combined = [];
    selChars.forEach(id => {
        if (id === 'me') return; // 用户自己没有"开场白"这个概念
        const char = myCharacters.find(c => c.id == id);
        if (!char) return;
        getGreetingOptions(char).forEach(text => combined.push({ charId: char.id, charName: char.name, text }));
    });
    if (combined.length === 0) { appAlert('已勾选参与的角色都没有设置开场白，直接手打第一句开个头就行～'); return; }

    // 互动续写已经独立成「续写工作台」，它有自己的挑选入口（js/16 的 showSsGreetingPicker，
    // mode='storyStudio'）。所以这个函数现在只服务小说编辑器的"一键生成模式"。
    window.__greetingPickerMode = 'novelOutline';
    const sortedCombined = sortGreetingOptionsMenuLast(combined);
    window.__greetingPickerOptions = sortedCombined;
    // 涉及多个角色时才需要在每张卡片上标注"这是谁的开场白"，只有一个角色就不用啰嗦重复标注
    const uniqueCharCount = new Set(combined.map(o => o.charId)).size;
    document.getElementById('greetingPickerTitle').innerText = `💬 选择开场白（作为一章内容）`;
    document.getElementById('greetingPickerList').innerHTML = renderGreetingOptionCards(sortedCombined, uniqueCharCount > 1 ? (idx, item) => `【${item.charName}】` : null);
    openModal('greetingPickerModal');
}

function selectGreeting(idx) {
    const mode = window.__greetingPickerMode || 'chat';
    // 续写工作台（js/16）：宏替换、正则、MVU、记忆召回那一整套后处理都在 applySsGreeting 里做，
    // 跟它自己正常生成的一轮走完全同一条链路，这里只负责把选中的候选转交过去。
    if (mode === 'storyStudio') {
        const item = (window.__greetingPickerOptions || [])[idx];
        closeModal('greetingPickerModal');
        if (item && typeof applySsGreeting === 'function') applySsGreeting(item);
        return;
    }
    if (mode === 'novelOutline') {
        const item = (window.__greetingPickerOptions || [])[idx];
        if (!item) return;
        closeModal('greetingPickerModal');
        const novel = globalNovels.find(n => n.id === currentEditingNovelId);
        if (!novel) return;
        const char = myCharacters.find(c => c.id == item.charId);
        const meta = parseGreetingMeta(item.text);
        let text = meta ? meta.body : item.text;
        try { text = applyMacros(text, char); } catch (e) { console.error('开场白宏替换出错，改用原文：', e); }
        // 跟聊天模式的开场白一样，续写这边选中的开场白也要过一遍正则脚本+MVU剥离，避免角色卡里焊死的状态栏JSON漏出来。
        // 这里明确知道是哪个角色的开场白（item.charId），直接传给正则，charScope限定的显示/输出脚本才能正常触发。
        text = applyRegexScripts(text, 'ai_output', item.charId);
        const mvuResult = processMvuPatchInText(text, currentEditingNovelId);
        text = mvuResult.cleanText;

        // 一键生成模式：开场白不直接落地存档，而是丢进跟AI生成章节完全一样的预览区，
        // 用户还能"保留/重新生成/放弃"，跟正常生成的章节体验一致，不搞特殊。
        const chapterNum = (novel.chapters ? novel.chapters.length : 0) + 1;
        tempNovelChapter = { id: 'c_' + Date.now(), index: chapterNum, content: text, timestamp: Date.now() };
        const tempArea = document.getElementById('novelTempArea'), tempContentEl = document.getElementById('novelTempContent');
        if (tempContentEl) tempContentEl.value = text;
        if (tempArea) { tempArea.style.display = 'block'; tempArea.scrollIntoView({ behavior: 'smooth' }); }
        return;
    }
    const charId = window.__greetingPickerCharId;
    const options = window.__greetingPickerOptions || [];
    if (!options[idx]) return;
    closeModal('greetingPickerModal');
    applyGreetingAsFirstMessage(charId, options[idx]);
    if (currentChatSessionId !== charId) switchChatSession(charId);
}

// 每次点进角色的聊天界面，就结合ta的日程和当前真实时间，刷新一次状态气泡（char.lifeState）
let lastScheduleBubbleRefresh = {};
async function refreshLifeStateOnChatEnter(charId) {
    if (!charId || charId.startsWith('g_')) return; // 群聊暂不处理
    const char = myCharacters.find(c => c.id == charId);
    if (!char || !char.schedule || !char.schedule.text) return; // 没有日程就没有可结合的信息

    const now = Date.now();
    if (lastScheduleBubbleRefresh[charId] && now - lastScheduleBubbleRefresh[charId] < 60000) return; // 1分钟内重复进入同一个聊天不重复请求
    lastScheduleBubbleRefresh[charId] = now;

    const api = getApiConfig(true);
    if (!api.key) return;

    const typeAsk = statusTypes.length > 0 ? `，并从这些状态类型里选一个最贴近的填入 "statusTypeLabel" 字段：[${statusTypes.map(t => t.label).join('、')}]，都不贴切就填空字符串` : '';
    const prompt = `现在的真实时间是 ${new Date().toLocaleString('zh-CN', { hour12: false, weekday: 'long' })}。这是"${char.name}"的今日日程：\n${char.schedule.text}\n请根据现在的真实时间，对照ta的日程表，判断ta此刻正在做什么（20字以内，不要加引号）${typeAsk}。请严格只输出 JSON，不要包含任何 Markdown 语法或多余说明：{"activity": "此刻在做的事"${typeAsk ? ', "statusTypeLabel": "从给定列表里选的状态类型"' : ''}}`;

    try {
        const data = await sendChatRequest(api, prompt);
        let rawText = data.choices?.[0]?.message?.content?.trim() || "";
        rawText = rawText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(rawText);
        if (parsed.activity) {
            saveCharLifeState(char, parsed.activity, parsed.statusTypeLabel || (char.lifeState && char.lifeState.statusTypeLabel));
            saveAllData();
        }
    } catch (e) { /* 静默失败，不打断进入聊天的体验 */ }
}

function checkAndAnnounceAnniversary(sessionId) {
    if (!enableAnniversary || sessionId.startsWith('g_')) return; // 群聊暂不支持纪念日
    const char = myCharacters.find(c => c.id == sessionId); if (!char) return;
    const history = globalChats[sessionId];
    if (!history || history.length === 0) return;
    const firstTs = history[0].timestamp;
    const daysSince = Math.floor((Date.now() - firstTs) / 86400000);
    if (daysSince < 1) return;
    const isMilestone = [1, 7, 30, 100, 200].includes(daysSince) || (daysSince >= 365 && daysSince % 365 === 0) || (daysSince >= 100 && daysSince % 100 === 0 && daysSince < 365);
    if (!isMilestone) return;
    const todayKey = new Date().toDateString();
    if (char.lastAnniversaryShownDate === todayKey) return; // 今天已经提示过，不重复刷屏

    char.lastAnniversaryShownDate = todayKey;
    char.pendingAnniversaryDays = daysSince; // 下次生成回复时会自然提一句，用完即清空
    globalChats[sessionId].push({ sender: 'system', text: `✨ 今天是你和 ${char.name} 认识的第 ${daysSince} 天`, timestamp: Date.now() });
    saveAllData();
    renderChatMessages();
}

// "转私聊"功能：角色本来该在推文/评论下公开回应，但（在设置里打开这个选项后）判断这件事更适合私下聊时，
// 会调用这个函数把消息直接送进跟用户的1v1私聊里，而不是发公开评论——因为这种消息不会出现在推文流/评论区，
// 容易被用户错过，所以额外弹一条通知提醒（复用 addNotification 的 chatCharId 参数，点通知能直接跳转到对应聊天）。
// quotedPost：可选，{name, text} —— 跟Twitter"分享推文到私信"一样，把触发这次转私聊的那条推文/评论内容
// 一起带过去，而不是只留一句凭空冒出来的话。复用聊天气泡本来就支持的 msg.quote 结构（引用消息那个功能），
// 不用另外再造一套UI。
function deliverCharMoveToChatMessage(char, messageText, quotedPost) {
    if (!char || !messageText) return;
    const sessionId = char.id;
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    const quote = (quotedPost && quotedPost.text) ? { name: quotedPost.name || '未知', text: quotedPost.text, type: 'tweet' } : null;
    globalChats[sessionId].push({ sender: char.id, text: messageText, timestamp: Date.now(), readBy: [], quote });
    saveAllData();
    if (currentChatSessionId === sessionId && document.getElementById('view-chat') && document.getElementById('view-chat').style.display !== 'none') {
        renderChatMessages();
    } else if (typeof renderChatCharList === 'function') {
        renderChatCharList();
    }
    if (typeof addNotification === 'function') addNotification(`<b>${char.name}</b> 想私下跟你聊聊`, null, char.id, char, messageText);
}

async function triggerNudge(sessionId, targetId) {
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    let sysText = targetId === 'me' ? `"${currentUser.name}" 拍了拍 自己 ${currentUser.nudgeText || '的脑袋'}` : `"${currentUser.name}" 拍了拍 "${myCharacters.find(c => c.id == targetId).name}" ${myCharacters.find(c => c.id == targetId).nudgeText || '的肩膀'}`;
    globalChats[sessionId].push({ sender: 'system', text: sysText, timestamp: Date.now() }); renderChatMessages(); saveAllData();

    const api = getApiConfig(true);
    if (targetId !== 'me' && api.key) {
        let targetChar = myCharacters.find(c => c.id == targetId);
        let prompt = buildStructuredMessages(buildBasePrompt(targetChar, false, sysText), [],
            `刚刚用户在聊天中双击头像"拍了拍"你。\n系统提示：${sysText}\n你可以选择回复或者输出 [NUDGE] 来反击。字数${chatWordLimit}字以内。${WORD_LIMIT_PRIORITY_NOTE}`);
        try {
            if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { currentlyTypingChars.add(targetChar.name); updateTypingIndicator(); }
            let data = await callChatCompletionAPI(api, prompt);
            let repText = data.choices?.[0]?.message?.content?.trim() || "";
            currentlyTypingChars.delete(targetChar.name); updateTypingIndicator();
            
            if (repText.toUpperCase().startsWith("NO") && repText.length < 5) return;
            if (repText.includes("[NUDGE]")) { repText = repText.replace(/\[NUDGE\]/ig, '').trim(); globalChats[sessionId].push({ sender: 'system', text: `"${targetChar.name}" 拍了拍 "${currentUser.name}" ${currentUser.nudgeText || '的脑袋'}`, timestamp: Date.now() }); }
            repText = applyRegexScripts(repText, 'ai_output', targetChar.id);
            if (repText) globalChats[sessionId].push({ sender: targetChar.id, text: repText, timestamp: Date.now(), readBy: [] });
            if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { renderChatMessages(); } else { renderChatCharList(); }
            saveAllData();
        } catch (e) { currentlyTypingChars.delete(targetChar.name); updateTypingIndicator(); }
    }
}

function isScheduleStale(char) {
    if (!char.schedule || !char.schedule.generatedAt) return false;
    return new Date(char.schedule.generatedAt).toDateString() !== new Date().toDateString();
}

function showCharLifeStatePopup(charId, event) {
    const char = myCharacters.find(c => c.id == charId); if (!char) return;
    const bubble = document.getElementById('charStatusBubble');
    document.getElementById('charStatusPopupAvatar').innerHTML = getAvatarHTML(char, 44);
    document.getElementById('charStatusPopupName').innerText = char.name;
    const textEl = document.getElementById('charStatusPopupText');
    let statusHtml = '';
    const typeColor = char.lifeState ? getStatusTypeColor(char.lifeState.statusTypeLabel) : null;
    if (typeColor) {
        bubble.style.background = typeColor + '1a'; // 淡色背景，保证文字可读
        bubble.style.borderLeft = `4px solid ${typeColor}`;
    } else {
        bubble.style.background = '#fff';
        bubble.style.borderLeft = 'none';
    }
    if (char.lifeState && char.lifeState.activity) {
        const ago = formatDurationZh(Math.max(0, Date.now() - (char.lifeState.updatedAt || Date.now())));
        const typeBadge = char.lifeState.statusTypeLabel ? `<span style="background:${typeColor}; color:#fff; font-size:10px; padding:1px 8px; border-radius:8px; margin-right:6px;">${char.lifeState.statusTypeLabel}</span>` : '';
        statusHtml = `${typeBadge}💭 ${char.lifeState.activity}<br><span style="font-size:11px; color:#8b98a5;">（${ago}前）</span>`;
    } else {
        statusHtml = `暂时还不知道ta在做什么，多聊聊看吧～`;
    }
    if (enableAffinitySystem) {
        const aff = char.affinity || 0;
        statusHtml += `<br><span style="font-size:12px; color:${aff >= 0 ? '#17bf63' : '#f91880'};">💗 好感度 ${aff > 0 ? '+' : ''}${aff}</span>`;
    }
    if (enableScheduleAutoCheck && isScheduleStale(char)) {
        statusHtml += `<br><span style="font-size:11px; color:#f91880;">⚠️ 日程是之前生成的，可能已过期，右键头像可更新</span>`;
    }
    textEl.innerHTML = statusHtml;
    const scheduleToggle = document.getElementById('charStatusScheduleToggle');
    const scheduleText = document.getElementById('charStatusScheduleText');
    scheduleText.style.display = 'none'; scheduleText.dataset.expanded = '0';
    scheduleToggle.innerText = '📅 查看今日日程';
    if (char.schedule && char.schedule.text) {
        scheduleToggle.style.display = 'inline-block';
        scheduleToggle.dataset.charId = char.id;
    } else {
        scheduleToggle.style.display = 'none';
    }

    // 先展示出来才能测量气泡自身尺寸，用于自适应定位
    bubble.style.display = 'block';
    bubble.style.visibility = 'hidden';
    const targetEl = (event && (event.currentTarget || event.target)) || null;
    const rect = targetEl ? targetEl.getBoundingClientRect() : { left: window.innerWidth/2, right: window.innerWidth/2, top: 100, bottom: 100, width: 0 };
    const bubbleRect = bubble.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - bubbleRect.width / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - bubbleRect.width - 10));
    let top = rect.bottom + 10;
    let isArrowUp = true;
    if (top + bubbleRect.height > window.innerHeight - 10) {
        top = rect.top - bubbleRect.height - 10;
        isArrowUp = false;
    }
    bubble.style.left = left + 'px';
    bubble.style.top = Math.max(10, top) + 'px';

    const arrowEl = bubble.querySelector('.char-status-bubble-arrow');
    const arrowLeft = Math.max(14, Math.min(rect.left + rect.width / 2 - left - 6, bubbleRect.width - 26));
    arrowEl.style.left = arrowLeft + 'px';
    arrowEl.className = 'char-status-bubble-arrow ' + (isArrowUp ? 'arrow-up' : 'arrow-down');
    arrowEl.style.background = typeColor ? typeColor + '1a' : '#fff';
    bubble.style.visibility = 'visible';

    if (event) event.stopPropagation();
    setTimeout(() => { document.addEventListener('click', closeStatusBubbleOnOutsideClick); }, 0);
}

function closeStatusBubbleOnOutsideClick(e) {
    const bubble = document.getElementById('charStatusBubble');
    if (bubble && !bubble.contains(e.target)) {
        bubble.style.display = 'none';
        document.removeEventListener('click', closeStatusBubbleOnOutsideClick);
    }
}

function toggleScheduleInBubble() {
    const scheduleToggle = document.getElementById('charStatusScheduleToggle');
    const char = myCharacters.find(c => c.id == scheduleToggle.dataset.charId);
    if (!char || !char.schedule) return;

    // 在弹窗中显示日程
    document.getElementById('scheduleViewTitle').innerText = `${char.name}的今日日程`;
    const typeColor = getStatusTypeColor(char.schedule.currentStatus ? getScheduleStatusType(char.schedule) : '');
    const typeBadge = char.schedule.currentStatus ? `<span style="background:${typeColor || '#1d9bf0'}; color:#fff; font-size:12px; padding:2px 8px; border-radius:8px; margin-right:6px; display:inline-block; margin-bottom:10px;">${getScheduleStatusType(char.schedule)}</span>` : '';
    document.getElementById('scheduleViewStatus').innerHTML = char.schedule.currentStatus ? `${typeBadge}💭 当前状态：${char.schedule.currentStatus}` : '';
    document.getElementById('scheduleViewText').innerText = char.schedule.text;
    openModal('scheduleViewModal');
}

function getScheduleStatusType(schedule) {
    return schedule.statusTypeLabel || '未设置';
}

function renderChatMessages() {
    const container = document.getElementById('chatMessagesArea'); if (!currentChatSessionId) return;
    let history = globalChats[currentChatSessionId] || [], isGroup = currentChatSessionId.startsWith('g_');
    let groupData = isGroup ? groupChats.find(g => g.id === currentChatSessionId) : null, totalMembers = isGroup ? (groupData?.members.length || 1) : 1;

    // 防御：单条消息渲染出错（比如内容含有异常字符/宏替换失败）之前会导致 .map() 整体抛错，
    // container.innerHTML 完全不会被赋值——表现出来就是"聊天区一片空白/开场白不显示"，其实是有一条消息渲染炸了拖累了全部。
    // 改成逐条 try/catch，单条出错就跳过那一条（控制台留错误方便排查），不影响其它消息正常显示。
    container.innerHTML = history.map((msg, idx) => {
        try {
            if (msg.sender === 'system') return `<div class="chat-system-msg"><span>${msg.text}</span></div>`;
            let isMe = msg.sender === 'me', senderChar = isMe ? currentUser : myCharacters.find(c => c.id == msg.sender), timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (!isMe && (!msg.readBy || !msg.readBy.includes('me'))) { if(!msg.readBy) msg.readBy=[]; msg.readBy.push('me'); saveAllData(); }

            let readStatusHtml = '';
            if (isMe && enableTypingIndicator) {
                let readCount = Array.isArray(msg.readBy) ? msg.readBy.length : 0;
                if (isGroup) { let unreadCount = totalMembers - readCount; readStatusHtml = unreadCount > 0 ? `<div style="font-size:10px; color:#888; margin-top:2px;">${unreadCount}人未读</div>` : `<div style="font-size:10px; color:#1d9bf0; margin-top:2px;">全部已读</div>`; } 
                else { readStatusHtml = readCount > 0 ? `<div style="font-size:10px; color:#1d9bf0; margin-top:2px;">已读</div>` : `<div style="font-size:10px; color:#888; margin-top:2px;">未读</div>`; }
            }
            let avatarHtml = !isMe && senderChar ? `<div style="cursor:pointer;" onclick="showCharLifeStatePopup('${senderChar.id}', event)" ondblclick="triggerNudge('${currentChatSessionId}', '${senderChar.id}')" title="左键查看状态·双击拍一拍">${getAvatarHTML(senderChar, 40)}</div>` : `<div style="cursor:pointer;" ondblclick="triggerNudge('${currentChatSessionId}', 'me')" title="双击拍一拍">${getAvatarHTML(currentUser, 40)}</div>`;
            
            // 🌟 核心渲染：侧滑抽卡控件 🌟
            let swipeHtml = '';
            if (!isMe && msg.swipes && msg.swipes.length > 1) {
                let cIdx = msg.currentSwipe || 0;
                swipeHtml = `
                <div style="display:flex; justify-content:center; align-items:center; gap:12px; margin-top:6px; font-size:12px; color:#536471; user-select:none;">
                    <span style="cursor:pointer; padding:2px 10px; background:rgba(255,255,255,0.4); border-radius:4px;" onclick="swipeMessage('${currentChatSessionId}', ${idx}, -1)">◀</span>
                    <span>${cIdx + 1} / ${msg.swipes.length}</span>
                    <span style="cursor:pointer; padding:2px 10px; background:rgba(255,255,255,0.4); border-radius:4px;" onclick="swipeMessage('${currentChatSessionId}', ${idx}, 1)">▶</span>
                </div>`;
            }

            // 💡 聊天气泡改为【纯文本显示】：不再渲染MVU状态栏卡片、记忆召回面板，也不再把
            // renderMarkdownLite（会保留卡/正则里原样的HTML标签）用在聊天正文上——统一换成
            // renderPlainChatText，只剥离标签取纯文字。注意：mvuSnapshot/recallHtml 等后台数据
            // 处理（变量追踪、记忆库更新）完全不受影响，只是不再画出来。
            return `
                <div class="chat-msg-row ${isMe ? 'me' : 'other'}">
                    ${!isMe ? avatarHtml : ''}
                    <div class="chat-bubble-wrapper" style="align-items: ${isMe ? 'flex-end' : 'flex-start'};">
                        <div class="chat-sender-name" style="font-size:10px;">${!isMe && isGroup ? senderChar?.name : ''} ${timeStr}</div>
                        <div class="chat-bubble ${isMe ? 'me' : 'other'}" oncontextmenu="showChatContextMenu(event, ${idx})" ontouchstart="chatBubbleTouchStart(event, ${idx})" ontouchend="chatBubbleTouchEnd(event)" ontouchmove="chatBubbleTouchEnd(event)">${msg.quote ? `<div class="chat-quote-bubble${msg.quote.type === 'tweet' ? ' tweet-quote-card' : ''}">${msg.quote.type === 'tweet' ? '<div class="tweet-quote-label">🐦 分享的推文</div>' : ''}<b>${msg.quote.name}</b>: ${renderPlainChatText(msg.quote.text)}</div>` : ''}${renderPlainChatText(msg.text)}${msg.mediaUrl ? `<img src="${msg.mediaUrl}">` : ''}${swipeHtml}</div>
                        ${isMe ? readStatusHtml : ''}
                    </div>
                    ${isMe ? avatarHtml : ''}
                </div>`;
        } catch (e) {
            console.error('渲染某条聊天消息时出错，已跳过：', idx, msg, e);
            return '';
        }
    }).join('');
    container.scrollTop = container.scrollHeight;
    // 💡 聊天气泡现在统一是纯文本渲染（renderPlainChatText），不会再有真实HTML/<script>标签进到DOM里，
    // 这里以前的"聊天注入脚本执行"调用已经是死代码了，去掉。脚本执行开关(enableChatScriptExecution)本身
    // 还留着——推文/评论/小报这些地方仍然正常渲染HTML，那些地方还用得到，见 08/09/11 号文件里的调用。
}

// 浏览器出于安全考虑，不会执行通过 innerHTML 动态插入的 <script> 标签——很多角色卡自带的HTML卡片
// （比如状态栏的展开/收起按钮）依赖这类内嵌脚本才能工作，不然点了会报"xxx is not defined"。
// 这里手动把这些脚本"重新创建"一遍来强制执行。⚠️这意味着聊天内容里只要出现<script>标签就会真的运行，
// 只有在"设置 → AI增强功能"里手动打开对应开关、并且信任你导入的角色卡来源时才应该开启。
//
// 🐛 根因修复：不少"手机截图/聊天美化"类角色卡HTML组件，是照搬SillyTavern里"每条消息用一个独立
// <iframe>文档渲染"的写法习惯，内部初始化逻辑全部挂在 document.addEventListener('DOMContentLoaded', fn)
// 上——这个假设只有在"这段HTML/JS是被浏览器当成一份全新文档从头加载"时才成立。但本app不是用iframe
// 渲染这些卡片的，而是把<script>直接重新创建、追加到当前这个早就"加载完毕"的页面里：'DOMContentLoaded'
// 事件在页面刚打开那一刻就已经触发过一次了，不会再触发第二次。结果就是这些卡片里"等页面加载完成后
// 才去初始化/往容器里填充正文内容"的代码永远不会运行——表现出来就是卡片的外壳（状态栏、边框、背景）
// 能看到，里面本该动态填充的聊天气泡/正文内容却是一片空白，点卡片自带的设置按钮也没反应（同样卡在
// 这个从没触发过的监听器里）。
//
// 这里给每个注入脚本生成一个独一无二、不会跟真正的'DOMContentLoaded'重名的"替身事件名"，把脚本源码里
// 所有监听 DOMContentLoaded 的地方偷梁换柱成监听这个替身事件；<script>标签插入DOM后是同步执行的，
// 这时脚本自己的addEventListener已经注册完毕，插入后立刻手动派发一次这个替身事件，等效于帮它从头
// 触发一次"页面加载完成"。全程只是替换脚本文本里的一个事件名字符串，完全不影响本app自己真正挂在
// 原生'DOMContentLoaded'上的启动逻辑（那些监听的字符串没有被替换过）。
function executeInjectedScripts(container) {
    container.querySelectorAll('script').forEach(oldScript => {
        try {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            let code = oldScript.textContent || '';
            const usesDCL = /DOMContentLoaded/.test(code);
            const fakeEventName = usesDCL ? ('__injectedCardReady_' + Date.now() + '_' + Math.floor(Math.random() * 1e6) + '__') : null;
            if (usesDCL) code = code.replace(/DOMContentLoaded/g, fakeEventName);
            newScript.textContent = code;
            oldScript.parentNode.replaceChild(newScript, oldScript);
            if (usesDCL) document.dispatchEvent(new Event(fakeEventName));
        } catch (e) { /* 单个脚本出错不影响其它内容 */ }
    });
}
function showChatContextMenu(e, msgIdx) {
    e.preventDefault(); let msg = globalChats[currentChatSessionId][msgIdx]; if (!msg || msg.sender === 'system') return;
    chatContextMenuTarget = { name: msg.sender === 'me' ? currentUser.name : (myCharacters.find(c => c.id == msg.sender)?.name || '未知'), text: msg.text }; chatContextMenuMsgIdx = msgIdx; 
    const menu = document.getElementById('chatContextMenu');
    menu.innerHTML = `
        <button class="context-btn" onclick="contextActionReplyChat()">引用回复</button>
        ${msg.sender === 'me' ? '<button class="context-btn" onclick="contextActionEditChat()">重新编辑</button>' : '<button class="context-btn" onclick="contextActionRegenerateChat()">🔄 侧滑重新生成</button>'}
        ${!currentChatSessionId.startsWith('g_') ? '<button class="context-btn" style="color:#17bf63;" onclick="contextActionBranchChat()">🌳 从此处开辟分支（保留旧对话）</button>' : ''}
        <button class="context-btn" onclick="contextActionSpeakChat()">🔊 朗读这条消息</button>
        <button class="context-btn" onclick="contextActionAddToMemory()">⭐ 收藏进相册</button>
        <button class="context-btn" style="color:#f91880;" onclick="contextActionDeleteChat()">删除消息</button>
    `;
    menu.style.display = 'flex'; let x = e.pageX, y = e.pageY; if(x + 100 > window.innerWidth) x -= 100; if(y + 200 > window.innerHeight) y -= 200; menu.style.left = x + 'px'; menu.style.top = y + 'px';
}

// ==========================================
// 🎤🔊 语音输入(STT) 与 朗读(TTS) —— 纯浏览器原生 Web Speech API，不依赖任何后端/第三方服务，
// 所以"没有后端也能用"这条底线不受影响；不支持的浏览器/环境会提示，不影响其它功能。
// ==========================================
let activeSpeechRecognition = null; // 同一时间只允许一路语音识别在录，按钮上会切换成"聆听中"的样式

function isSpeechRecognitionSupported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
function isSpeechSynthesisSupported() { return !!window.speechSynthesis; }

// 点击麦克风按钮：开始/再点一次＝停止。识别出的文字直接追加进目标输入框，不会覆盖已经打好的内容。
function toggleVoiceInput(targetInputId, btnEl) {
    if (!isSpeechRecognitionSupported()) return alert('当前浏览器/环境不支持语音输入（Web Speech API）。安卓上换系统自带的浏览器内核（比如Chrome）试试看。');

    if (activeSpeechRecognition) { activeSpeechRecognition.stop(); return; } // 正在录 -> 这次点击当"停止"处理

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognitionCtor();
    rec.lang = 'zh-CN'; rec.continuous = false; rec.interimResults = false;

    const input = document.getElementById(targetInputId);
    const originalBtnHtml = btnEl ? btnEl.innerHTML : '';
    if (btnEl) { btnEl.innerHTML = '🔴'; btnEl.title = '正在聆听...点击停止'; }

    rec.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
        if (input && text) { input.value = (input.value ? input.value + ' ' : '') + text; input.focus(); }
    };
    rec.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
            alert('语音识别出错：' + event.error + (event.error === 'not-allowed' ? '\n（请检查是否已授权麦克风权限）' : ''));
        }
    };
    rec.onend = () => { activeSpeechRecognition = null; if (btnEl) { btnEl.innerHTML = originalBtnHtml || '🎤'; btnEl.title = '语音输入'; } };

    activeSpeechRecognition = rec;
    try { rec.start(); } catch (e) { alert('启动语音识别失败：' + e.message); activeSpeechRecognition = null; if (btnEl) btnEl.innerHTML = originalBtnHtml || '🎤'; }
}

// 朗读一段文字：自动剥掉Markdown符号/HTML标签/代码块，只念纯文本，不然会把 **、<div> 这些符号也念出来
function speakText(text) {
    if (!isSpeechSynthesisSupported()) return alert('当前浏览器/环境不支持语音朗读（Web Speech API）。');
    speechSynthesis.cancel(); // 先打断上一条还没读完的，避免声音叠在一起

    let plain = String(text || '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/[*_~`#>]/g, '')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .trim();
    if (!plain) return;

    const utter = new SpeechSynthesisUtterance(plain);
    utter.lang = 'zh-CN'; utter.rate = 1.0;
    speechSynthesis.speak(utter);
}
function stopSpeaking() { if (isSpeechSynthesisSupported()) speechSynthesis.cancel(); }

// 聊天气泡右键菜单里的"朗读这条消息"入口
function contextActionSpeakChat() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (!chatContextMenuTarget) return;
    speakText(chatContextMenuTarget.text);
}

function contextActionAddToMemory() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (!chatContextMenuTarget) return;
    const msg = globalChats[currentChatSessionId] ? globalChats[currentChatSessionId][chatContextMenuMsgIdx] : null;
    const charForAvatar = myCharacters.find(c => c.id == currentChatSessionId);
    memoryAlbum.unshift({
        id: 'mem_' + Date.now(), type: 'chat', refId: currentChatSessionId,
        charId: currentChatSessionId, charName: chatContextMenuTarget.name,
        text: chatContextMenuTarget.text, timestamp: msg ? msg.timestamp : Date.now(), savedAt: Date.now()
    });
    saveAllData();
    if (typeof showToast === 'function' && charForAvatar) showToast(getAvatarHTML(charForAvatar, 40), '已收藏', '这条聊天已经存进回忆相册啦～', null, null);
}

let replyContextMenuTarget = null;


async function contextActionDeleteReply() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (!replyContextMenuTarget) return;
    const target = replyContextMenuTarget; replyContextMenuTarget = null;

    // 论坛的删除目标形状是 {threadId, floor}，不是 {postId, replyIdx}，跟下面推文评论的删除逻辑分开处理
    if (target.type === 'forum') {
        const thread = forumThreads.find(t => t.id === target.threadId);
        if (!thread) return;
        if (target.floor === 1) {
            if (!(await appConfirm('确定要删除整个帖子（含所有回复）吗？该操作不可逆！'))) return;
            forumThreads = forumThreads.filter(t => t.id !== target.threadId);
            saveAllData();
            if (typeof renderForumList === 'function') renderForumList();
        } else {
            if (!(await appConfirm('确定删除这条回复吗？该操作不可逆！'))) return;
            thread.replies = (thread.replies || []).filter(r => r.floor !== target.floor);
            saveAllData();
            if (typeof openForumThread === 'function') openForumThread(target.threadId);
        }
        return;
    }

    const { postId, replyIdx } = target;
    let isTabloid = postId.startsWith('tb_');
    const post = isTabloid ? tabloidPosts.find(p => p.id == postId) : globalPosts.find(p => p.id == postId);
    if (!post || !post.replies || !post.replies[replyIdx]) return;
    if (!(await appConfirm('确定删除这条评论吗？该操作不可逆！'))) return;
    post.replies.splice(replyIdx, 1);
    post.stats.comments = Math.max(0, (parseInt(post.stats.comments) || 1) - 1);
    saveAllData();
    if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
    if (isTabloid && document.getElementById('view-tabloid').style.display !== 'none') renderTabloidPosts();
}

async function contextActionDeleteChat() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (chatContextMenuMsgIdx === null) return; const idx = chatContextMenuMsgIdx, sessionId = currentChatSessionId;
    if (!globalChats[sessionId] || !globalChats[sessionId][idx]) return;
    if (!(await appConfirm('确定删除这条消息吗？该操作不可逆！'))) return;
    globalChats[sessionId].splice(idx, 1);
    renderChatMessages(); saveAllData();
    chatContextMenuMsgIdx = null;
}

async function contextActionEditChat() {
    if (chatContextMenuMsgIdx === null) return; const idx = chatContextMenuMsgIdx, sessionId = currentChatSessionId, msg = globalChats[sessionId][idx];
    document.getElementById('chatContextMenu').style.display = 'none';
    let newText = await appPrompt("重新编辑您的消息：", msg.text); if (newText === null || newText.trim() === "") return;
    msg.text = newText.trim(); globalChats[sessionId].splice(idx + 1); renderChatMessages(); saveAllData();
    await triggerAIBatchReply(sessionId, msg.text);
}

// 🌳 开辟分支（保留旧对话）：复制一份角色和到目前为止的聊天记录，另开一条独立时间线
window.contextActionBranchChat = async function() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (chatContextMenuMsgIdx === null || !currentChatSessionId) return;
    if (currentChatSessionId.startsWith('g_')) return alert("群聊暂不支持分支功能！");

    const char = myCharacters.find(c => c.id == currentChatSessionId);
    if (!char) return;

    const branchName = await appPrompt("为这条新的分支起个名字吧（原角色和聊天记录都会保留不变）：", char.name + " (分支)");
    if (!branchName) return;

    // 克隆出一个属于这条新分支的角色副本
    const newChar = JSON.parse(JSON.stringify(char));
    newChar.id = Date.now().toString();
    newChar.name = branchName;
    newChar.branchedFrom = char.id;
    newChar.branchedFromName = char.name;
    myCharacters.unshift(newChar); // 放在列表最前面

    // 把当前聊天记录复制到断点处，分支和原对话各自独立，谁都不会被覆盖
    const chatClone = JSON.parse(JSON.stringify(globalChats[currentChatSessionId].slice(0, chatContextMenuMsgIdx + 1)));
    globalChats[newChar.id] = chatClone;

    saveAllData();
    renderChatCharList();
    switchChatSession(newChar.id);
    alert(`🌳 分支创建成功！当前处于【${branchName}】，原来的对话还在【${char.name}】里，两边互不影响。`);
};

// 🔄 侧滑重新生成
window.contextActionRegenerateChat = async function() {
    if (chatContextMenuMsgIdx === null) return;
    const idx = chatContextMenuMsgIdx, sessionId = currentChatSessionId;
    document.getElementById('chatContextMenu').style.display = 'none';

    const msg = globalChats[sessionId][idx];
    if (msg.sender === 'me' || msg.sender === 'system') return alert("只能重新生成角色的回复！");

    const char = myCharacters.find(c => c.id == msg.sender);
    if (!char) return;

    const historyForPrompt = globalChats[sessionId].slice(0, idx);
    const recentHistory = buildTimeAwareHistoryText(historyForPrompt.slice(-chatHistoryTurns));
    const historyTurns = buildTimeAwareHistoryTurns(historyForPrompt.slice(-chatHistoryTurns), char.name);

    const api = getApiConfig(true);
    if (!api.key) return alert("请先配置 API Key！");

    let oldText = msg.text;
    msg.text = "🔄 尝试新路线中...";
    renderChatMessages();

    let emoPrompt = typeof getEmoticonPrompt === 'function' ? getEmoticonPrompt() : '';
    let actionTagReminder = allowActionTags
        ? `\n【重要格式要求】：你可以且应该适度使用括号（如()或【】）穿插动作、神态、心理描写，让对话更有画面感。\n`
        : `\n【重要格式要求】：绝对不要有任何动作、神态或心理描写，不要使用括号()或【】，只输出你直接说出的话。\n`;
        
    // 💡 修复：让重新生成的提示词也严格遵守 JSON 格式
    let multiReplyBlock = `\n【回复指令】\n回复字数不超过${chatWordLimit}字（这是硬性上限，不是必须写满）。${WORD_LIMIT_PRIORITY_NOTE}输出格式【必须严格遵守JSON】，不要包含任何 Markdown 语法。格式示例：\n{\n  "replies": [\n    {"text": "你想回复的对话或动作"}\n  ],\n  "stateUpdate": "你的内部状态", "statusTypeLabel": "闲"\n}`;

    // 结构化消息改造：历史记录改成独立的user/assistant轮次，不再拼进正文文本里
    let systemText = `${buildBasePrompt(char, true, recentHistory)}${getRecentPostsAwarenessText(char)}${getTimeAwarenessPrompt(sessionId, char)}${getChatNaturalnessPrompt()}`;
    let finalUserText = `请尝试一条全新的思路重新生成你的最新回复。
${emoPrompt}
${actionTagReminder}
${multiReplyBlock}`;
    let prompt = buildStructuredMessages(systemText, historyTurns, finalUserText);

    try {
        let data = await callChatCompletionAPI(api, prompt);
        let rawText = data.choices?.[0]?.message?.content?.trim() || "";
        
        let repText = "";
        let repMediaUrl = null;
        
        // 💡 修复：加入 JSON 解析逻辑（改用 extractJsonObject，能容错AI输出里常见的裸换行/多余逗号等小毛病）
        try {
            let parsed = extractJsonObject(rawText);
            if (parsed) {
                runPluginResponseHooks(char, sessionId, parsed);
                if (parsed.stateUpdate) saveCharLifeState(char, parsed.stateUpdate, parsed.statusTypeLabel);

                if (parsed.replies && Array.isArray(parsed.replies) && parsed.replies.length > 0) {
                    repText = parsed.replies.map(r => r.text).join('\n');
                } else if (parsed.stateUpdate) {
                    repText = `(${parsed.stateUpdate})`;
                } else {
                    repText = rawText;
                }
            } else {
                repText = rawText;
            }
        } catch (err) {
            repText = rawText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        }

        if (repText && !repText.toUpperCase().startsWith("NO")) {
            let emoMatch = repText.match(/\[EMO:(emo_\w+)\]/i);
            if (emoMatch && typeof globalEmoticons !== 'undefined') {
                let emo = globalEmoticons.find(e => e.id === emoMatch[1]);
                if (emo) repMediaUrl = emo.url;
                repText = repText.replace(emoMatch[0], '').trim();
            }
            repText = applyRegexScripts(repText, 'ai_output', char.id);

            if (!msg.swipes) { msg.swipes = [oldText]; msg.currentSwipe = 0; }
            msg.swipes.push(repText);
            msg.currentSwipe = msg.swipes.length - 1;
            msg.text = repText;
            if (repMediaUrl) msg.mediaUrl = repMediaUrl;

            saveAllData(); renderChatMessages();
        } else {
            msg.text = oldText; renderChatMessages();
        }
    } catch(e) { msg.text = oldText; renderChatMessages(); alert("生成失败：" + e.message); }
};

// ◀ ▶ 控制侧滑翻页
window.swipeMessage = function(sessionId, msgIdx, direction) {
    let msg = globalChats[sessionId][msgIdx];
    if (!msg || !msg.swipes || msg.swipes.length <= 1) return;
    let cIdx = msg.currentSwipe || 0;
    cIdx += direction;
    if (cIdx < 0) cIdx = msg.swipes.length - 1;
    if (cIdx >= msg.swipes.length) cIdx = 0;
    msg.currentSwipe = cIdx;
    msg.text = msg.swipes[cIdx];
    saveAllData();
    renderChatMessages();
};
function contextActionReplyChat() { if (!chatContextMenuTarget) return; pendingChatQuote = chatContextMenuTarget; document.getElementById('chatQuoteName').innerText = pendingChatQuote.name; document.getElementById('chatQuoteText').innerText = pendingChatQuote.text; document.getElementById('chatQuotePreview').style.display = 'flex'; document.getElementById('chatInput').focus(); chatContextMenuTarget = null; document.getElementById('chatContextMenu').style.display = 'none'; }
function clearChatQuote() { pendingChatQuote = null; document.getElementById('chatQuotePreview').style.display = 'none'; }

// 用户短时间内连续发好几条消息时，等一小会儿再统一触发AI回复、把这几条一起回应，而不是每发一条就立刻触发一次、
// 角色逐条分别回复（那样容易显得很割裂，也容易让角色只顾着回最新一条、前面几句等于白发）。
// 按会话id分别计时：连续发消息会不断重置这个计时器，真正停下来不再发之后，稍等一下才会统一触发。
let pendingBatchReplyTimers = {};
let pendingBatchReplyTexts = {};
const CHAT_BATCH_REPLY_DELAY_MS = 5000; // 用户5秒内连发的消息会合并成一次触发AI回复

async function sendChatMessage() {
    if (!currentChatSessionId) return; const sessionId = currentChatSessionId; const input = document.getElementById('chatInput'); let text = input.value.trim();
    if (!text && !pendingChatAttachment) return;
    text = applyRegexScripts(text, 'user_input');
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    const myMsg = { sender: 'me', text: text, timestamp: Date.now(), mediaUrl: pendingChatAttachment, readBy: [], quote: pendingChatQuote };
    globalChats[sessionId].push(myMsg);
    let triggerText = text; input.value = ''; clearAttachment('chat'); clearChatQuote(); renderChatMessages(); saveAllData(); checkAndAutoSummarizeChat(sessionId);
    embedMessageInBackground(myMsg);

    // 累积这一条到"待发送批次"里，重置计时器；真正停下来不再连发之后才会统一触发一次AI回复
    if (!pendingBatchReplyTexts[sessionId]) pendingBatchReplyTexts[sessionId] = [];
    pendingBatchReplyTexts[sessionId].push(triggerText);
    if (pendingBatchReplyTimers[sessionId]) clearTimeout(pendingBatchReplyTimers[sessionId]);
    pendingBatchReplyTimers[sessionId] = setTimeout(() => {
        const batchTexts = pendingBatchReplyTexts[sessionId] || [];
        pendingBatchReplyTexts[sessionId] = [];
        pendingBatchReplyTimers[sessionId] = null;
        if (batchTexts.length === 0) return;
        const combinedText = batchTexts.join('\n');
        triggerAIBatchReply(sessionId, combinedText);
    }, CHAT_BATCH_REPLY_DELAY_MS);
}

async function triggerAIBatchReply(sessionId, triggerText) {
    const api = getApiConfig(true); 
    if (!api.key) return alert("请先配置 API Key！");
    
    let emoPrompt = getEmoticonPrompt(), isGroup = sessionId.startsWith('g_'), targetChars = [];
    let groupObj = null, speakOrder = 'all';
    if (isGroup) {
        groupObj = groupChats.find(x => x.id === sessionId);
        if (groupObj) {
            // 临时禁言成员（mutedMembers）：被禁言的成员这一轮完全跳过，不参与AI回复判断，等于暂时把TA从"会说话的人"里摘出去，
            // 跟踢出群/删除角色不是一回事——群聊列表、历史消息、角色本身都完全不受影响，随时可以在群聊选项里取消禁言。
            const muted = new Set(groupObj.mutedMembers || []);
            targetChars = groupObj.members.filter(id => !muted.has(id)).map(id => myCharacters.find(c => c.id == id)).filter(Boolean);
            speakOrder = groupObj.speakOrder || 'all';
            if (speakOrder === 'random') { for (let i = targetChars.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [targetChars[i], targetChars[j]] = [targetChars[j], targetChars[i]]; } }
        }
    } 
    else { let c = myCharacters.find(c => c.id == sessionId); if (c) targetChars = [c]; }

    let currentBatchText = triggerText, anyCharReplied = false;
    let semanticContextCache = {}; // 按角色缓存，避免群聊里给每个角色重复请求 embedding

    // 🆕 识图：把这一批用户刚发的消息里带的图片（不管是拍的照片还是从表情/图片库选的）一并收集起来，
    // 交给支持识图的模型（callChatCompletionAPI 的 images 参数），让角色能真正"看到"图里是什么再回复，
    // 而不是完全无视图片、只根据文字瞎猜。只往前找连续的"me"消息（这一批还没被回复的），不翻查更早的历史。
    let batchImages = [];
    {
        const msgs = globalChats[sessionId] || [];
        for (let i = msgs.length - 1; i >= 0 && msgs[i].sender === 'me'; i--) {
            if (msgs[i].mediaUrl) batchImages.unshift(msgs[i].mediaUrl);
        }
    }

    for (let char of targetChars) {
        let isMentioned = isGroup ? (currentBatchText.includes('@所有人') || currentBatchText.includes('@' + char.name) || ((char.handle||'').replace('@','').toLowerCase() && currentBatchText.toLowerCase().includes('@' + (char.handle||'').replace('@','').toLowerCase()))) : true;
        if (isGroup && speakOrder === 'mentioned' && !isMentioned) continue; // 仅@到的人回复模式：没被@就完全跳过，不给AI判断机会
        
        // 结构化消息改造：以前是把人设/世界书/聊天记录/各种指令全部拼成一整段文本塞进一条user消息；
        // 现在拆成 system（人设+世界书+语义上下文+时间感知等"背景设定"部分）+ 按发言人分开的历史轮次
        // （user/assistant交替，不再是一整段夹在中间的文本）+ 最后一条user消息（"这一轮到底要AI做什么"
        // 的任务指令）。recentHistory这个文本版本仍然保留：buildBasePrompt内部要靠它做世界书关键词
        // 触发判断，这个用途和"要不要把历史拼进prompt正文"是两回事，不能删。
        let recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns));
        // groupMode 一定要传：群聊的历史必须带上说话人名字，否则模型分不清哪句是自己说的
        // （这正是"群里角色乱回复、记不住人设"的根源，详见 js/06 那个函数顶上的说明）
        let historyTurns = buildTimeAwareHistoryTurns(globalChats[sessionId].slice(-chatHistoryTurns), char.name, { groupMode: isGroup });

        // 预设系统的"深度注入"模块：不跟着系统提示词固定堆在最前面，而是插到聊天历史里对应的深度位置
        // （比如"倒数第4条消息前"），效果更接近真正打断/介入对话，而不是一股脑全塞在开头容易被后面内容盖过去。
        if (typeof getActivePresetDepthEntries === 'function' && typeof insertTextAtDepth === 'function') {
            getActivePresetDepthEntries(char, sessionId).forEach(entry => insertTextAtDepth(historyTurns, entry.depth, entry.content));
        }

        // 世界书条目里选了"[系统/用户/AI]插入深度"的，同理精确插到聊天历史对应深度位置（可以指定用哪个身份说这句话）；
        // 选了"作者注释之前/之后"的，先摘出来，等下跟导演耳语文本拼在一起、按同一个深度/位置一起插入，见下方。
        let wbEntriesForChat = (typeof getCharacterWorldbookEntries === 'function') ? getCharacterWorldbookEntries(char, recentHistory, sessionId) : [];
        if (typeof getWorldbookDepthEntries === 'function' && typeof insertTextAtDepth === 'function') {
            getWorldbookDepthEntries(wbEntriesForChat).forEach(entry => insertTextAtDepth(historyTurns, entry.depth, entry.content, entry.role));
        }
        let wbAnAnchor = (typeof getWorldbookAnAnchorText === 'function') ? getWorldbookAnAnchorText(wbEntriesForChat) : { before: '', after: '' };

        let replyRule = (isMentioned || (isGroup && speakOrder === 'sequential')) ? `你被艾特了（或这是私聊，或本群设置了轮流发言），你【必须】回复，不能输出"NO"。` : (isGroup ? `如果觉得群里没人理你且无需回复，直接输出"NO"。` : `如果不知道怎么回可以输出"NO"。`);
        if (semanticContextCache[char.id] === undefined) semanticContextCache[char.id] = await getSemanticContext(sessionId, char, triggerText);
        let semanticContext = semanticContextCache[char.id];

       // 📝 导演耳语（Author's Note）：支持"每隔N条消息才提醒一次"（频率）和"插到倒数第几条消息位置"（深度）两个设置，
       // 不再是每次都无条件原样塞在prompt末尾。频率=1或没填时每轮都生效，跟以前行为一样；深度=0或没填时也还是老位置（prompt末尾）。
        let anInput = document.getElementById('chatAuthorsNote');
        let anBox = document.getElementById('chatAuthorsNoteBox');
        let anText = (anInput && anBox && anBox.style.display !== 'none') ? anInput.value.trim() : '';
        let anFreq = Math.max(1, parseInt(document.getElementById('anFrequencyInput')?.value) || 1);
        let anDepth = Math.max(0, parseInt(document.getElementById('anDepthInput')?.value) || 0);
        let turnCountNow = (globalChats[sessionId] || []).length;
        let anShouldFire = !!anText && (anFreq <= 1 || turnCountNow % anFreq === 0);
        let anPrompt = '';
        // 世界书"作者注释之前/之后"的内容，不管这一轮导演耳语本身有没有触发，都跟着作者注释这个锚点位置一起插入
        // （锚点本身是个位置概念，不依赖这一轮到底有没有填耳语文本），避免选了这个位置的世界书条目因为耳语没触发就白白丢失。
        const anBodyParts = [wbAnAnchor.before, anShouldFire ? `【导演耳语 (Author's Note) - 最高优先级上帝指令】：\n${anText}` : '', wbAnAnchor.after].filter(Boolean);
        if (anBodyParts.length > 0) {
            const anFullText = anBodyParts.join('\n\n');
            if (anDepth > 0) { insertTextAtDepth(historyTurns, anDepth, anFullText); }
            else { anPrompt = `\n\n${anFullText}\n`; }
        }

        // ⚠️ 修复"角色不看用户发了什么、一直重复旧话题"的bug：
        // 之前最新消息只是被埋在很长的历史记录文本中间，容易被模型忽略。这里把它单独提出来，
        // 放在prompt末尾（模型注意力通常更集中在结尾），并明确要求必须针对这条最新内容来回复。
        // 结构化消息里历史记录本身已经是独立的轮次了，这条提醒依然有价值（防止模型只盯着更早的话题），继续保留。
        // 修复"用户连发好几条消息，角色只回应最后一条"：triggerText 现在可能是"用户短时间内连发的好几条消息
        // 合并后的内容"（见 sendChatMessage 的合并发送去抖逻辑），不再只取 globalChats 最后一条——
        // 不然合并逻辑再怎么做，这里最终提醒AI的还是只有最后一句，等于白合并。
        let latestMsgText = `${currentUser.name}：${triggerText}`;
        let latestEmphasis = `\n\n【⚠️最新消息 - 请务必围绕这些来回复（如果是好几条连着发的，说明用户是一口气说完的，要整体理解、一起回应，不要只挑最后一句），不要无视它、也不要延续更早之前已经聊完的旧话题】：\n${latestMsgText}\n`;

        // ⚠️ 修复"开启了动作/心理描写开关，但角色还是没有动作描写"的bug：
        // 之前这条规则只在 buildBasePrompt 里出现一次，位置偏早，容易被后面"真人聊天铁律"里大段
        // 强调"短句为主、别写小说化描写"的内容盖过去。这里在prompt末尾再明确重申一次，位置越靠后模型越重视。
        let actionTagReminder = allowActionTags
            ? `\n【重要格式要求】：你可以且应该适度使用括号（如()或【】）穿插动作、神态、心理描写，让对话更有画面感——这和"像真人一样自然聊天"并不冲突，不要因为追求聊天感就完全省略掉这些描写。\n`
            : `\n【重要格式要求】：绝对不要有任何动作、神态或心理描写，不要使用括号()或【】，只输出你直接说出的话。\n`;
        
        let multiReplyBlock = getChatMultiReplyBlock();

        // 🆕 AI自主引用最近消息：给一份编号列表，AI自己判断这一轮要不要引用、引用哪条
        let quotable = buildQuotableRecentMessages(sessionId, char, isGroup);

        // 注：这里原来加过一大段「群聊身份说明」，已经删掉了。
        // 删的原因不是它没用，是它把别的功能弄坏了：那段里写着"你只输出你自己要说的话"，
        // 跟上面 actionTagReminder 里"你可以且应该适度使用括号穿插动作、神态、心理描写"
        // 直接冲突——模型只能二选一，结果就是**开着动作描写开关，群聊里角色却不写动作了**。
        //
        // "群里角色分不清谁说的话"这个问题不靠加提示词解决，靠的是
        // buildTimeAwareHistoryTurns 在群聊历史里给每条发言加上"名字："前缀
        // （见 js/06 那个函数顶上的说明）。那是**数据格式**层面的修复，不占提示词、
        // 不跟任何设定打架，效果也更稳。

        let systemText = `${buildBasePrompt(char, true, recentHistory, { sessionId, excludeDepthPresetEntries: true, excludeWorldbookPositions: ['at_depth', 'before_an', 'after_an'], precomputedWbEntries: wbEntriesForChat })}${semanticContext}${getRecentPostsAwarenessText(char)}${getTimeAwarenessPrompt(sessionId, char)}${getChatNaturalnessPrompt()}`;
        let finalUserText = `${replyRule}
你可以通过输出 [NUDGE] 主动拍一拍用户。也可艾特别人。
${emoPrompt}
${quotable.promptText}
${anPrompt}
${latestEmphasis}
${actionTagReminder}
${multiReplyBlock}`;
        let prompt = buildStructuredMessages(systemText, historyTurns, finalUserText);

        try {
            if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { currentlyTypingChars.add(char.name); updateTypingIndicator(); }
            let data = await callChatCompletionAPI(api, prompt, 2, batchImages.length > 0 ? batchImages : null);
            
            if (data.error) {
                currentlyTypingChars.delete(char.name); updateTypingIndicator();
                alert(`⚠️ 聊天 API 报错（${char.name} 回复失败）:\n${data.error.message || JSON.stringify(data.error)}`);
                continue; 
            }

            let rawText = data.choices?.[0]?.message?.content?.trim() || "";
            let replies = [];
            
             // 解析 JSON（改用 extractJsonObject：逐字符找匹配的花括号+自动修复裸换行/多余逗号，
             // 不再是"截图里代码原文整段被当成消息发出来"背后那个粗暴正则）
            try {
                let parsed = extractJsonObject(rawText);
                if (!parsed) throw new Error("No JSON object found");

                runPluginResponseHooks(char, sessionId, parsed);
                if (parsed.stateUpdate) saveCharLifeState(char, parsed.stateUpdate, parsed.statusTypeLabel);

                if (parsed.replies && Array.isArray(parsed.replies) && parsed.replies.length > 0) {
                    replies = parsed.replies;
                } else if (parsed.stateUpdate) {
                    // 💡 强力兜底：如果 AI 忘了写对话，只写了动作/状态，就直接把动作发出来！
                    replies = [{ delay: 1, text: `(${parsed.stateUpdate})` }];
                } else {
                    throw new Error("Invalid structure");
                }
            } catch (err) {
                // 降级处理：模型没按格式吐JSON，直接把原始文本当一整条回复发出来——这种情况下更容易夹带
                // 没被JSON结构"天然过滤掉"的思维链前缀，这里顺手处理一次（关闭/折叠/删除按当前设置来）
                replies = [{ delay: 1, text: processReasoningInText(rawText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim()) }];
            }

            currentlyTypingChars.delete(char.name); updateTypingIndicator();
            if (replies.length === 0) continue;

            for (let replyObj of replies) {
                let repText = replyObj.text || "";
                let delaySec = replyObj.delay || 1;

                if (isMentioned && repText.toUpperCase().startsWith("NO") && repText.length < 5) repText = char.autoReplyText?.trim() || "嗯，我看到了。";
                else if (!isMentioned && repText.toUpperCase().startsWith("NO") && repText.length < 5) continue;

                // 核心：模拟打字延迟
                if (delaySec > 0) {
                    if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') {
                        currentlyTypingChars.add(char.name); updateTypingIndicator();
                    }
                    await new Promise(r => setTimeout(r, delaySec * 1000));
                    currentlyTypingChars.delete(char.name); updateTypingIndicator();
                }

                let repMediaUrl = null, emoMatch = repText.match(/\[EMO:(emo_\w+)\]/i);
                if (emoMatch) { let emo = globalEmoticons.find(e => e.id === emoMatch[1]); if (emo) repMediaUrl = emo.url; repText = repText.replace(emoMatch[0], '').trim(); }

                // 🆕 解析AI自己选的[QUOTE:编号]标记：编号对照的是这一轮prompt里给它的quotable.list，
                // 拿到手就是原始{name,text}快照，跟手动"引用回复"存的数据结构完全一样，渲染那边不用另外改。
                let repQuote = null, quoteMatch = repText.match(/^\[QUOTE:(\d+)\]\s*/i);
                if (quoteMatch) {
                    const qIdx = parseInt(quoteMatch[1], 10) - 1;
                    const qTarget = quotable.list[qIdx];
                    if (qTarget) repQuote = { name: qTarget.name, text: qTarget.text };
                    repText = repText.replace(quoteMatch[0], '').trim();
                }

                if (repText.includes("[NUDGE]")) { repText = repText.replace(/\[NUDGE\]/ig, '').trim(); globalChats[sessionId].push({ sender: 'system', text: `"${char.name}" 拍了拍 "${currentUser.name}" ${currentUser.nudgeText || '的脑袋'}`, timestamp: Date.now() }); anyCharReplied = true; }
                
                if (!repText && isMentioned) {
                    // 诊断日志：AI这一轮实际解析出的回复内容是空的，才会走到这条兜底"嗯。"。
                    // 之前这里完全没有痕迹，出现"角色只回一个嗯"的时候没法判断是AI真的没写内容、
                    // 内容被安全策略拦了、还是JSON格式没对上导致解析漏了字段——现在把原始返回和
                    // 解析结果都打到控制台，方便对着实际报错/内容排查，不用再靠猜。
                    console.warn(`[空回复兜底] "${char.name}" 这一轮AI解析出的文本是空的，已用兜底文案"${char.autoReplyText?.trim() || '嗯。'}"代替。原始AI返回：`, rawText);
                    repText = char.autoReplyText?.trim() || "嗯。";
                }
                repText = applyRegexScripts(repText, 'ai_output', char.id);
                // MVU变量补丁块（酒馆"状态栏"预设常见格式）：识别+剥离，并把应用后的状态快照挂在这条消息上，
                // 渲染时读快照画一个真正的状态栏卡片，而不是把原始JSON糊在气泡里。
                const mvuResult = processMvuPatchInText(repText, sessionId);
                repText = mvuResult.cleanText;
                // 记忆召回块（酒馆"数据库"类预设常见格式）：同样识别+剥离，渲染成本地的召回面板。
                const recallResult = processRecallBlockInText(repText, sessionId);
                repText = recallResult.cleanText;

                if (repText || repMediaUrl) {
                    const aiMsg = { sender: char.id, text: repText, timestamp: Date.now(), mediaUrl: repMediaUrl, readBy: [], mvuSnapshot: mvuResult.snapshot, recallHtml: recallResult.recallHtml, quote: repQuote };
                    globalChats[sessionId].push(aiMsg); anyCharReplied = true; currentBatchText += `\n${char.name}: ${repText}`;
                    embedMessageInBackground(aiMsg);
                    if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { renderChatMessages(); } 
                    else {
                        let avatarHtml = isGroup ? getGroupAvatarHTML(groupChats.find(x=>x.id===sessionId), 80) : getAvatarHTML(char, 80);
                        showToast(avatarHtml, isGroup ? `[${groupChats.find(x=>x.id===sessionId).name}] ${char.name}` : `${char.name} 发来消息`, repText || "[图片/表情/拍一拍]", null, sessionId);
                        globalNotifications.unshift({ text: `<b>${char.name}</b> 给您发来消息`, postId: null, chatCharId: sessionId, timestamp: Date.now() }); unreadNotifs++; updateNotifBadge(); renderChatCharList();
                    }
                    saveAllData(); checkAndAutoSummarizeChat(sessionId);
                }
            }
        } catch(e) { 
            currentlyTypingChars.delete(char.name); updateTypingIndicator(); 
        }
    }

    if (anyCharReplied) {
        let myMsgsToMark = isGroup ? targetChars.map(c => String(c.id)) : [String(targetChars[0]?.id)].filter(Boolean);
        globalChats[sessionId].forEach(m => { if (m.sender === 'me') { if (!m.readBy) m.readBy = []; myMsgsToMark.forEach(cid => { if (!m.readBy.includes(cid)) m.readBy.push(cid); }); } });
        if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') renderChatMessages(); saveAllData();
    }
}

function openCreateGroupModal() {
    document.getElementById('groupChatCharPicker').innerHTML = myCharacters.map(char => `<div class="char-checkbox-item"><input type="checkbox" id="gpick_${char.id}" value="${char.id}"><label for="gpick_${char.id}">${getAvatarHTML(char, 28)} ${char.name}</label></div>`).join('');
    document.getElementById('newGroupChatName').value = ''; 
    document.getElementById('newGroupAvatarFile').value = '';
    document.getElementById('groupAvatarPreview').style.display = 'none';
    tempCropResults.groupAvatar = null;
    openModal('createGroupChatModal');
}

async function saveGroupChat() {
    let name = document.getElementById('newGroupChatName').value.trim(), selected = [...document.querySelectorAll('#groupChatCharPicker input[type=checkbox]:checked')].map(cb => parseInt(cb.value));
    if(!name) return alert("请输入群聊名称"); if(selected.length < 2) return alert("群聊至少需要选择两个角色");
    
    let newG = { id: 'g_' + Date.now(), name: name, members: selected, avatarImg: tempCropResults.groupAvatar || null, speakOrder: 'all' };
    groupChats.push(newG); closeModal('createGroupChatModal'); saveAllData(); renderChatCharList(); switchChatSession(newG.id);
}

function renderEmoticonManagerGallery() {
    const c = document.getElementById('emoticonManagerGallery');
    if(globalEmoticons.length === 0) { c.innerHTML = '<div style="grid-column:1/-1; color:#536471;">暂无表情/图片，快去上传吧~</div>'; return; }
    c.innerHTML = globalEmoticons.map((e, idx) => `<div class="emo-item"><img src="${e.url}"><button class="emo-del-btn" onclick="deleteEmoticon(${idx})">×</button><input type="text" value="${e.desc || ''}" placeholder="添加含义描述" onchange="updateEmoticonDesc(${idx}, this.value)" onclick="event.stopPropagation()"></div>`).join('');
}

function updateEmoticonDesc(idx, val) { globalEmoticons[idx].desc = val.trim(); saveAllData(); }

async function handleEmoticonUpload(event) {
    const files = Array.from(event.target.files); if (!files.length) return;
    if (files.length > 99) alert('单次最多只能添加99张图片！已自动截取前99张。');
    for(let file of files.slice(0, 99)) { globalEmoticons.push({ id: 'emo_' + Date.now() + Math.floor(Math.random()*1000), url: await fileToBase64(file), desc: "" }); }
    renderEmoticonManagerGallery(); event.target.value = ''; saveAllData();
}
