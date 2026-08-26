// ==========================================
// ⚙️ 全局角色互动设置与后台定时小剧场引擎
// ==========================================

// 1. 初始化并读取设置
function loadGlobalInteractionSettings() {
    const enabled = localStorage.getItem('settingEnableCharInteraction');
    const notify = localStorage.getItem('settingNotifyCharInteraction');
    // 默认开启互动，默认关闭弹窗
    const cbEnable = document.getElementById('settingEnableCharInteraction');
    const cbNotify = document.getElementById('settingNotifyCharInteraction');
    if (cbEnable) cbEnable.checked = enabled !== 'false'; 
    if (cbNotify) cbNotify.checked = notify === 'true';

    // 这两个都默认开启——"不秒回"和"路人会互相接话"是更像真人的行为，
    // 想要老的即时反馈随时能在这里关掉。
    const cbDelay = document.getElementById('settingCharReplyDelay');
    if (cbDelay) {
        cbDelay.checked = localStorage.getItem('settingCharReplyDelay') !== 'false';
        if (typeof charReplyDelayEnabled !== 'undefined') charReplyDelayEnabled = cbDelay.checked;
    }
    const cbArgue = document.getElementById('settingNpcArgue');
    if (cbArgue) {
        cbArgue.checked = localStorage.getItem('settingNpcArgue') !== 'false';
        if (typeof npcArgueProb !== 'undefined') npcArgueProb = cbArgue.checked ? 0.5 : 0;
    }
    // 流式输出默认开着（逐字显示体验更好）；接口流式不稳的用户可以关掉。
    const cbStream = document.getElementById('settingEnableStreaming');
    if (cbStream) {
        cbStream.checked = localStorage.getItem('settingEnableStreaming') !== 'false';
        if (typeof enableStreaming !== 'undefined') enableStreaming = cbStream.checked;
    }
}
// 网页加载时自动读取
document.addEventListener("DOMContentLoaded", loadGlobalInteractionSettings);
setTimeout(loadGlobalInteractionSettings, 1000); // 兜底执行

// 2. 保存设置
function saveGlobalInteractionSettings() {
    const cbEnable = document.getElementById('settingEnableCharInteraction');
    const cbNotify = document.getElementById('settingNotifyCharInteraction');
    if (cbEnable) localStorage.setItem('settingEnableCharInteraction', cbEnable.checked);
    if (cbNotify) localStorage.setItem('settingNotifyCharInteraction', cbNotify.checked);
    // 角色评论是否延迟（不秒回）——存进 localStorage 的同时也同步到那个全局变量，
    // 改完立刻生效，不用刷新页面。
    const cbDelay = document.getElementById('settingCharReplyDelay');
    if (cbDelay) {
        localStorage.setItem('settingCharReplyDelay', cbDelay.checked);
        if (typeof charReplyDelayEnabled !== 'undefined') charReplyDelayEnabled = cbDelay.checked;
    }
    const cbArgue = document.getElementById('settingNpcArgue');
    if (cbArgue) {
        localStorage.setItem('settingNpcArgue', cbArgue.checked);
        // 关掉就是概率 0；打开恢复默认的一半概率（每轮都吵会把角色的话刷没）
        if (typeof npcArgueProb !== 'undefined') npcArgueProb = cbArgue.checked ? 0.5 : 0;
    }
    const cbStream = document.getElementById('settingEnableStreaming');
    if (cbStream) {
        localStorage.setItem('settingEnableStreaming', cbStream.checked);
        if (typeof enableStreaming !== 'undefined') enableStreaming = cbStream.checked;
    }
}

// 3. 全局状态检查器（供推文、爆料等系统调用）
function isGlobalCharInteractionEnabled() {
    const cb = document.getElementById('settingEnableCharInteraction');
    return cb ? cb.checked : (localStorage.getItem('settingEnableCharInteraction') !== 'false');
}

// 🌟 4. 核心：每5分钟触发的后台抽奖小剧场引擎 🌟
setInterval(async () => {
    // 检查总开关是否开启
    if (!isGlobalCharInteractionEnabled()) return;

    // 低概率触发机制（设定为 30% 概率触发，避免太频繁显得不真实，你可以自己改 0.3 的数字）
    if (Math.random() > 0.3) return;

    const api = getApiConfig(true); 
    if (!api.key) return;

    // 寻找存在人物关系的角色对
    // ⚠️ 修复：关系数据实际存在全局 charRelationships 数组里（fromId/toId/label），
    // 之前这里错读了一个从没被赋值过的 char.relations 字段，导致这个功能条件永远为空、从没真正触发过。
    let relatedPairs = [];
    for (let rel of charRelationships) {
        let charA = myCharacters.find(c => c.id == rel.fromId);
        let charB = myCharacters.find(c => c.id == rel.toId);
        if (charA && charB && charA.id !== charB.id) {
            relatedPairs.push({ charA, charB, relation: rel.label || '认识' });
        }
    }

    if (relatedPairs.length === 0) return;

    // 随机抽一对幸运儿
    const pair = relatedPairs[Math.floor(Math.random() * relatedPairs.length)];
    const charA = pair.charA;
    const charB = pair.charB;

    // 构建给 AI 的剧本要求
    const prompt = `现在的真实时间是 ${new Date().toLocaleString('zh-CN', { hour12: false })}。
系统中设定这两个角色有如下关系：
${charA.name} 的人设：${charA.persona}
${charB.name} 的人设：${charB.persona}
他们之间的关系是：${pair.relation}。

他们现在背着用户正在私下发生一件小事（比如一起喝奶茶、线上拌嘴、讨论工作、意外偶遇等）。
请根据他们的性格和关系，生成他们此刻各自的状态（正在做什么、心情如何）。
请直接输出 JSON 格式，不要有任何多余字符，严格遵循：
{"charA_status": "20字以内，${charA.name}的状态", "charB_status": "20字以内，${charB.name}的状态", "event_summary": "15字以内，概括发生了什么事"}`;

    try {
        let data = await sendChatRequest(api, prompt);
        let text = data.choices?.[0]?.message?.content?.trim() || "";
        text = text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        let parsed = JSON.parse(text);

        if (parsed.charA_status && parsed.charB_status) {
            // 自动更新到角色的状态气泡里
            if (typeof saveCharLifeState === 'function') {
                saveCharLifeState(charA, parsed.charA_status, '私下互动');
                saveCharLifeState(charB, parsed.charB_status, '私下互动');
            }

            // 如果开启了弹窗提醒，就通知用户
            const cbNotify = document.getElementById('settingNotifyCharInteraction');
            if (cbNotify && cbNotify.checked) {
                // 假设你有 showToast 提示框功能，如果没有会降级为 alert
                if (typeof showToast === 'function') {
                    showToast(`👀 发现私下互动：${charA.name} 和 ${charB.name} ${parsed.event_summary || '正在互动'}！`);
                } else {
                    alert(`👀 发现私下互动：${charA.name} 和 ${charB.name} ${parsed.event_summary || '正在互动'}！`);
                }
            }
        }
    } catch(e) { console.log("后台自动互动生成跳过：", e); }

}, 5 * 60000); // 5分钟 = 300,000毫秒
// ===================== 旧聊天归档弹窗与阅览功能（含一键复活线功能） =====================
function ensureArchivedChatsModals() {
    if (!document.getElementById('archivedChatsListModal')) {
        const div1 = document.createElement('div');
        div1.className = 'modal-overlay';
        div1.id = 'archivedChatsListModal';
        div1.style.zIndex = '3000';
        div1.innerHTML = `
            <div class="modal-box" style="width: 400px; max-height:80vh; display:flex; flex-direction:column;">
                <h3 style="margin-top:0; color:#1d9bf0;" id="archivedChatsListTitle">📜 历史聊天记录</h3>
                <div id="archivedChatsListContent" style="flex:1; overflow-y:auto; margin-bottom:15px; padding-right:5px;"></div>
                <button class="btn-cancel" onclick="closeModal('archivedChatsListModal')">关闭</button>
            </div>
        `;
        document.body.appendChild(div1);
    }
    if (!document.getElementById('archivedChatViewModal')) {
        const div2 = document.createElement('div');
        div2.className = 'modal-overlay';
        div2.id = 'archivedChatViewModal';
        div2.style.zIndex = '3005';
        div2.innerHTML = `
            <div class="modal-box" style="width: 500px; height: 85vh; max-height: 85vh; display:flex; flex-direction:column; padding:0; overflow:hidden;">
                <div style="padding:15px; border-bottom:1px solid #eff3f4; display:flex; justify-content:space-between; align-items:center; z-index:10;">
                    <div class="back-btn" onclick="closeModal('archivedChatViewModal'); openModal('archivedChatsListModal')" style="margin:0; background:rgba(29,155,240,0.1);">←</div>
                    <h3 style="margin:0; color:#1d9bf0; font-size:16px;" id="archivedChatViewTitle">旧聊天</h3>
                    <!-- 💡 新增：一键恢复并继续聊天的复活按钮 -->
                    <button class="btn-edit-small" id="btnRestoreArchivedChat" style="margin:0; background:#17bf63; color:white; border:none;">⚡ 恢复此线</button>
                </div>
                <div id="archivedChatViewContent" class="chat-messages" style="flex:1; overflow-y:auto; padding:15px; background:transparent;"></div>
            </div>
        `;
        document.body.appendChild(div2);
    }
}

function openArchivedChatsListModal(charId) {
    ensureArchivedChatsModals();
    const char = myCharacters.find(c => c.id == charId);
    if (!char || !char.archivedChats || char.archivedChats.length === 0) return;
    
    document.getElementById('archivedChatsListTitle').innerText = `📜 ${char.name} 的历史聊天`;
    const listHtml = [...char.archivedChats].reverse().map((arc, rIdx) => {
        const trueIdx = char.archivedChats.length - 1 - rIdx;
        return `<div class="wb-card" style="min-width:0; max-width:none; width:100%; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1; min-width:0; cursor:pointer;" onclick="closeModal('archivedChatsListModal'); viewArchivedChat('${charId}', ${trueIdx})">
                <div style="font-weight:bold; font-size:14px; color:#1d9bf0;">📅 ${arc.timeStr}</div>
                <div style="font-size:12px; color:#8b98a5;">共 ${arc.messages.length} 条消息</div>
            </div>
            <button class="btn-edit-small" style="color:#f91880; border-color:#f91880; margin:0 0 0 10px; padding:4px 8px; flex-shrink:0;" onclick="deleteArchivedChat('${charId}', ${trueIdx}, event)">删除</button>
        </div>`;
    }).join('');
    
    document.getElementById('archivedChatsListContent').innerHTML = listHtml;
    openModal('archivedChatsListModal');
}

function viewArchivedChat(charId, idx) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char || !char.archivedChats || !char.archivedChats[idx]) return;
    const arc = char.archivedChats[idx];
    document.getElementById('archivedChatViewTitle').innerText = `📅 ${arc.timeStr}`;
    
    // 💡 新增：动态绑定“恢复此线”按钮的点击事件
    const restoreBtn = document.getElementById('btnRestoreArchivedChat');
    restoreBtn.onclick = () => {
        restoreArchivedChatToActive(charId, idx);
    };

    const container = document.getElementById('archivedChatViewContent');
    container.innerHTML = arc.messages.map((msg, i) => {
        if (msg.sender === 'system') return `<div class="chat-system-msg"><span>${msg.text}</span></div>`;
        let isMe = msg.sender === 'me';
        let senderChar = isMe ? currentUser : char;
        let timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let avatarHtml = getAvatarHTML(senderChar, 36);
        
        return `
            <div class="chat-msg-row ${isMe ? 'me' : 'other'}" style="margin-bottom:15px;">
                ${!isMe ? avatarHtml : ''}
                <div class="chat-bubble-wrapper" style="align-items: ${isMe ? 'flex-end' : 'flex-start'};">
                    <div class="chat-sender-name" style="font-size:10px;">${timeStr}</div>
                    <div class="chat-bubble ${isMe ? 'me' : 'other'}" style="pointer-events:none;">${msg.quote ? `<div class="chat-quote-bubble${msg.quote.type === 'tweet' ? ' tweet-quote-card' : ''}">${msg.quote.type === 'tweet' ? '<div class="tweet-quote-label">🐦 分享的推文</div>' : ''}<b>${msg.quote.name}</b>: ${renderMarkdownLite(msg.quote.text)}</div>` : ''}${renderMarkdownLite(msg.text)}${msg.mediaUrl ? `<img src="${msg.mediaUrl}" style="max-width:100%; border-radius:8px; margin-top:5px;">` : ''}</div>
                </div>
                ${isMe ? avatarHtml : ''}
            </div>`;
    }).join('');
    
    openModal('archivedChatViewModal');
}

// 💡 新增核心函数：把选中的旧聊天恢复为当前的主流聊天，同时把目前的聊天打包置换进档案库
async function restoreArchivedChatToActive(charId, idx) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char || !char.archivedChats || !char.archivedChats[idx]) return;

    const confirmRestore = await appConfirm(`确定要恢复这条历史时间线吗？\n\n温馨提示：你【目前正在聊】的这段对话会自动打包存入历史档案库，绝不会丢失。两边时间线会完成互换。`);
    if (!confirmRestore) return;

    // 1. 抓取被选中的旧会话数据
    const targetSnapshot = JSON.parse(JSON.stringify(char.archivedChats[idx]));
    
    // 2. 将当前正在聊的活跃会话做成一个新归档
    const currentActiveMessages = globalChats[charId] || [];
    const currentActiveSnapshot = {
        id: Date.now(),
        timeStr: new Date().toLocaleString('zh-CN') + "（切线前留在主窗口的记录）",
        messages: JSON.parse(JSON.stringify(currentActiveMessages))
    };

    // 3. 时间线大互换：把旧线的消息砸回当前主窗口，把目前的消息塞进原本的档案位置
    globalChats[charId] = targetSnapshot.messages;
    char.archivedChats[idx] = currentActiveSnapshot;

    // 4. 保存并刷新页面
    saveAllData();
    closeModal('archivedChatViewModal');
    
    // 5. 让聊天窗口重新刷新，并震憾提示
    if (currentChatSessionId == charId) {
        renderChatMessages();
    } else {
        switchChatSession(charId);
    }
    alert(`⚡ 时间线跳转成功！已切回至【${targetSnapshot.timeStr}】的聊天记录，你可以直接在这里继续输入消息和 TA 畅聊了！`);
}

async function deleteArchivedChat(charId, idx, e) {
    if (e) e.stopPropagation();
    if (!(await appConfirm('确定要删除这份历史聊天记录吗？删除后无法恢复！'))) return;
    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;
    char.archivedChats.splice(idx, 1);
    saveAllData();
    if (char.archivedChats.length === 0) {
        closeModal('archivedChatsListModal');
    } else {
        openArchivedChatsListModal(charId);
    }
}