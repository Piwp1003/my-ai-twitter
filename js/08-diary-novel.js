// ===== 信封与日记逻辑 =====
function renderDiaryCharList() {
    const container = document.getElementById('diaryCharList');
    if(myCharacters.length === 0) { container.innerHTML = '<div style="color:#888;">暂无角色，请先创建角色。</div>'; return; }
    container.innerHTML = myCharacters.map(c => `<div style="display:flex; flex-direction:column; align-items:center; cursor:pointer; opacity:${currentDiaryCharId == c.id ? '1' : '0.5'}; transition:0.2s;" onclick="selectDiaryChar('${c.id}')">${getAvatarHTML(c, 50)}<div style="font-size:12px; margin-top:5px;">${c.name}</div></div>`).join('');
    if(!currentDiaryCharId && myCharacters.length > 0) selectDiaryChar(myCharacters[0].id); else renderActiveDiaryTab();
}
function selectDiaryChar(id) { currentDiaryCharId = id; renderDiaryCharList(); }
// "我的日记"不是按角色分开看的（一篇日记可以同时被好几个角色偷看），跟另外两个tab不共用同一套渲染，
// 这里统一按当前tab分发到对应的渲染函数——避免"切角色头像"这个跟另外两个tab共用的操作，在"我的日记"tab下
// 误触发 renderDiaryContent() 把日记列表区域重新显示出来、把"我的日记"区域的显示状态搞乱。
function renderActiveDiaryTab() { if (currentDiaryTab === 'mydiary') { if (typeof renderMyDiaryArea === 'function') renderMyDiaryArea(); } else { renderDiaryContent(); } }
function switchDiaryTab(tab) {
    currentDiaryTab = tab;
    document.getElementById('diary-tab-letter').className = tab === 'letter' ? 'tab active' : 'tab';
    document.getElementById('diary-tab-diary').className = tab === 'diary' ? 'tab active' : 'tab';
    document.getElementById('diary-tab-mydiary').className = tab === 'mydiary' ? 'tab active' : 'tab';
    const isMyDiary = tab === 'mydiary';
    document.getElementById('diaryListArea').style.display = isMyDiary ? 'none' : 'block';
    document.getElementById('diaryActionBar').style.display = isMyDiary ? 'none' : 'block';
    document.getElementById('myDiaryArea').style.display = isMyDiary ? 'block' : 'none';
    document.getElementById('diaryTempArea').style.display = 'none';
    // 角色头像选择条只跟"寄来的信件"/"偷看日记"这两个按角色分开看的tab有关，"我的日记"是面向多个角色的，不需要选中某一个角色
    const charListWrapper = document.getElementById('diaryCharList');
    if (charListWrapper && charListWrapper.parentElement) charListWrapper.parentElement.style.display = isMyDiary ? 'none' : 'block';
    const composeLetterBtn = document.getElementById('btnOpenUserLetterCompose');
    if (composeLetterBtn) composeLetterBtn.style.display = (tab === 'letter') ? 'block' : 'none';
    renderActiveDiaryTab();
}

function renderDiaryContent() {
    document.getElementById('diaryTempArea').style.display = 'none'; document.getElementById('diaryListArea').style.display = 'block';
    const char = myCharacters.find(c => c.id == currentDiaryCharId); if(!char) return;
    if(!char.diaryData || typeof char.diaryData.letter === 'string') char.diaryData = { letters: [], diaries: [] };
    const list = currentDiaryTab === 'letter' ? char.diaryData.letters : char.diaryData.diaries;
    const container = document.getElementById('diaryCardsContainer');

    if(!list || list.length === 0) { container.innerHTML = `<div class=\"empty-state\">对方似乎还在构思${currentDiaryTab === 'letter' ? '信件' : '日记'}。<br>问一问Ta吧，或者${currentDiaryTab === 'letter' ? '自己写一封信寄过去' : '等等看'}！</div>`; return; }
    container.innerHTML = list.map(item => {
        let excerpts = item.content.split('\n').map(p=>p.trim()).filter(p=>p).slice(0, 2).join('<br><br>');
        // 信件这边多两种标记：author==='user'是用户自己写的信；有pendingLetterReplies条目说明回信还在"路上"，
        // 附带一个"立即回复"按钮，点了就不用等随机延迟了（stopPropagation避免顺带触发卡片本身的点击打开详情）。
        let badgeHtml = '';
        if (currentDiaryTab === 'letter') {
            if (item.author === 'user') {
                // 🆕 如果这封是用户特意针对角色某封来信回复的（而不是凭空新写），先标出回复了哪一封，
                // 方便在列表里一眼看出信件往来的脉络。
                let selfLabel = '✍️ 你写的信';
                if (item.replyToId) {
                    const original = list.find(l => l.id === item.replyToId);
                    selfLabel = `↩️ 回复了《${escapeHtml(original?.title || '无题')}》`;
                }
                const pending = (char.pendingLetterReplies || []).find(p => p.letterId === item.id);
                if (pending) {
                    badgeHtml = `<div class="diary-card-badge" style="color:#f9a825;">⏳ ${selfLabel}，等待回信中… <span style="color:#1d9bf0; cursor:pointer; text-decoration:underline;" onclick="event.stopPropagation(); forceReplyNowForLetter('${char.id}', '${item.id}')">⚡立即回复</span></div>`;
                } else {
                    badgeHtml = `<div class="diary-card-badge" style="color:#8b98a5;">${selfLabel}</div>`;
                }
            } else if (item.replyToId) {
                badgeHtml = `<div class="diary-card-badge" style="color:#17bf63;">↩️ Ta 的回信</div>`;
            }
        }
        return `<div class=\"diary-card\" onclick=\"openDiaryDetail('${item.id}')\">${badgeHtml}<div class=\"diary-card-title\">${item.title || '无题'}</div><div class=\"diary-card-date\">${new Date(item.date).toLocaleString()}</div><div class=\"diary-card-excerpt\">${excerpts}</div></div>`;
    }).join('');
}

let diaryUploadedTxtContent = '';
function handleDiaryTxtUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) { alert('请上传 .txt 文本文件！'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        diaryUploadedTxtContent = (e.target.result || '').toString();
        document.getElementById('diaryTxtFileName').innerText = `已上传：${file.name}（${diaryUploadedTxtContent.length}字）`;
        document.getElementById('diaryTxtFileName').style.display = 'inline';
        document.getElementById('diaryTxtClearBtn').style.display = 'inline';
    };
    reader.onerror = () => alert('读取文件失败，请重试。');
    reader.readAsText(file, 'UTF-8');
}
function clearDiaryTxtUpload() {
    diaryUploadedTxtContent = '';
    document.getElementById('diaryTxtUpload').value = '';
    document.getElementById('diaryTxtFileName').style.display = 'none';
    document.getElementById('diaryTxtClearBtn').style.display = 'none';
}

async function generateDiaryContent() {
    const api = getApiConfig(true); 
    if(!api.key) return alert("请先在设置中配置 API Key！");
    const char = myCharacters.find(c => c.id == currentDiaryCharId); if(!char) return;
    
    // 确保数据结构安全初始化
    if(!char.diaryData) char.diaryData = { letters: [], diaries: [] };
    if(!char.diaryData.letters) char.diaryData.letters = [];
    if(!char.diaryData.diaries) char.diaryData.diaries = [];

    const btn = document.getElementById('btnGenerateDiary'); btn.innerText = "思念自笔尖流出... "; btn.disabled = true;
    let recentChat = getRecentChatContext(char.id); 
    let recentPosts = getCharRecentPosts(char.id, 15).map(p => p.text).join('\n');
    let targetType = currentDiaryTab === 'letter' ? '寄给用户' + currentUser.name + '的信' : '私密的个人日记';
    let limit = currentDiaryTab === 'letter' ? letterWordLimit : diaryWordLimit;
    
    // 💡 处理用户上传的 TXT 素材
    let txtContext = diaryUploadedTxtContent ? `\n【用户上传的特殊参考素材，请仔细阅读并将其中的信息融入正文中】：\n${diaryUploadedTxtContent.slice(0, 6000)}` : '';

    // 💡 核心升级：调用 buildBasePrompt(char, true) 自动带入 [人设、全局世界书、局部世界书、20条推文记忆、20条聊天总结]
    let prompt = buildStructuredMessages(buildBasePrompt(char, true, recentChat + '\n' + recentPosts), [],
        `请你结合上述你的核心人设、世界观背景、推文记忆总结、历史聊天总结，以及以下近期的动态、聊天记录${diaryUploadedTxtContent ? '和用户上传的参考素材' : ''}，写一封${targetType}。字数${limit}字左右。${WORD_LIMIT_PRIORITY_NOTE}要深刻体现你的性格情感。
最近推文：\n${recentPosts || '暂无'}\n近期聊天记录：\n${recentChat || '暂无'}${txtContext}

【重要】：即使这次写的是日记/信件而不是一段正常对话，如果你的世界观设定/正则脚本里要求每次输出/每段情境结束时固定附带某种格式标签、状态栏或HTML卡片，也请把它们照常当作这段内容的一部分正常写出来，放在正文末尾即可，不要因为这次的体裁是日记/信件就跳过或省略这些规则。

${getFinalAnswerMarkerPromptNote()}

【极为严格的格式要求】：请仅返回合法 JSON 格式，决不要使用 \`\`\`json 包裹，也不要返回除 JSON 之外的任何说明废话！content字段里如果包含上述格式标签/HTML，换行请用\\n转义，这不违反JSON格式要求。
{"title":"这里写吸引人的标题","content":"这里写正文内容，段落之间用\\n分隔"}`);
    
    try {
        let data = await callChatCompletionAPI(api, prompt);
        let raw = data.choices?.[0]?.message?.content?.trim();
        if(raw) {
            raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
            let parsed = { title: currentDiaryTab === 'letter' ? '新信件' : '新日记', content: raw };
            let parsedJson = extractJsonObject(raw); if (parsedJson) parsed = parsedJson;
            // 修复：信件/日记这条生成路径之前也漏了正则烘焙，角色卡若强制要求每次输出都带一段状态栏JSON补丁，
            // 之前会原样糊进信/日记正文里。
            // 🐛 修复："角色卡自带的HTML（状态栏卡片等）在信件/日记里不生效"：这里以前用 innerText 纯文本展示
            // （不解析HTML/Markdown），角色卡自带的HTML组件会被当成纯文字原样糊出来。现在跟推文/论坛/续写
            // 用同一条渲染路径（formatPostText，内部会调用 renderMarkdownLite 保留合法HTML），详情展示见 openDiaryDetail。
            parsed.content = applyRegexScripts(parsed.content || raw, 'ai_output', char.id);
            tempGeneratedDiary = { id: 'd_' + Date.now(), title: parsed.title || (currentDiaryTab === 'letter' ? '新信件' : '新日记'), content: parsed.content || raw, date: Date.now() };
            document.getElementById('diaryListArea').style.display = 'none'; document.getElementById('diaryTempArea').style.display = 'block';
            document.getElementById('tempDiaryTitle').innerText = tempGeneratedDiary.title;
            document.getElementById('tempDiaryContent').innerHTML = namespaceInjectedIds(formatPostText(tempGeneratedDiary.content, char.id), tempGeneratedDiary.id);
            if (typeof enableChatScriptExecution !== 'undefined' && enableChatScriptExecution) { try { executeInjectedScripts(document.getElementById('tempDiaryContent')); } catch (e) { console.error('执行日记预览注入脚本时出错：', e); } }
        } else { throw new Error("生成返回为空"); }
    } catch(e) { alert("生成失败: " + e.message); } finally { btn.innerText = "好想对你说"; btn.disabled = false; }
}

function saveTempDiary() { 
    if(!tempGeneratedDiary) return; 
    const char = myCharacters.find(c => c.id == currentDiaryCharId); 
    if(!char) return; 
    
    if(currentDiaryTab === 'letter') {
        char.diaryData.letters.unshift(tempGeneratedDiary);
        showToast(getAvatarHTML(char, 40), `收到 ${char.name} 的信`, tempGeneratedDiary.title, null, null);
        globalNotifications.unshift({ text: `<b>${char.name}</b> 给你寄来了一封信：${tempGeneratedDiary.title}`, timestamp: Date.now() });
    } else {
        char.diaryData.diaries.unshift(tempGeneratedDiary);
        showToast(getAvatarHTML(char, 40), `${char.name} 的日记更新了`, "你偷看了 ta 的日记...", null, null);
        globalNotifications.unshift({ text: `<b>${char.name}</b> 更新了日记`, timestamp: Date.now() });
    }
    
    unreadNotifs++;
    if (typeof updateNotifBadge === 'function') updateNotifBadge();
    
    saveAllData(); 
    tempGeneratedDiary = null; 
    renderDiaryContent(); 
}
function discardTempDiary() { tempGeneratedDiary = null; renderDiaryContent(); }
function openDiaryDetail(id) {
    const char = myCharacters.find(c => c.id == currentDiaryCharId); if(!char) return;
    const list = currentDiaryTab === 'letter' ? char.diaryData.letters : char.diaryData.diaries; const item = list.find(i => i.id === id); if(!item) return;
    viewingDiaryId = id; document.getElementById('diaryDetailTitle').innerText = item.title || '无题'; document.getElementById('diaryDetailDate').innerText = new Date(item.date).toLocaleString();
    // 🐛 修复：跟上面 tempDiaryContent 同一个bug——详情页之前也是 innerText 纯文本展示，角色卡自带的HTML
    // （状态栏卡片等）显示不出来。改成跟推文/论坛/续写一致的 formatPostText+innerHTML 渲染路径。
    document.getElementById('diaryDetailContent').innerHTML = namespaceInjectedIds(formatPostText(item.content, char.id), item.id);
    if (typeof enableChatScriptExecution !== 'undefined' && enableChatScriptExecution) { try { executeInjectedScripts(document.getElementById('diaryDetailContent')); } catch (e) { console.error('执行日记详情注入脚本时出错：', e); } }
    // 🆕 只有"信件"tab里、且这封是角色寄来的（不是用户自己写的），回复才有意义——展示"↩️回复这封信"按钮
    const replyBtn = document.getElementById('btnReplyToThisLetter');
    if (replyBtn) replyBtn.style.display = (currentDiaryTab === 'letter' && item.author === 'char') ? 'inline-block' : 'none';
    openModal('diaryDetailModal');
}
async function deleteCurrentDiary() {
    if(!(await appConfirm("确定要删除这篇内容吗？此操作无法撤销。"))) return; const char = myCharacters.find(c => c.id == currentDiaryCharId);
    if(currentDiaryTab === 'letter') { char.diaryData.letters = char.diaryData.letters.filter(i => i.id !== viewingDiaryId); if (char.pendingLetterReplies) char.pendingLetterReplies = char.pendingLetterReplies.filter(p => p.letterId !== viewingDiaryId); } else { char.diaryData.diaries = char.diaryData.diaries.filter(i => i.id !== viewingDiaryId); }
    saveAllData(); closeModal('diaryDetailModal'); renderDiaryContent();
}

// ============================================================
// ✉️ 信件系统增强：① 角色按自定义频率主动写信（不用等用户点按钮）
//    ② 用户可以自己写信寄给角色，角色会在随机等待一段时间后回信（也可以点"立即回复"跳过等待）
// ============================================================

// 🆕 把一个角色和用户之间"目前为止所有的信件往来"按时间顺序拼成一段可读文本，供生成回信/主动写信时
// 当成上下文喂给AI——不这样做的话，AI每次都只能看到"当前手头这一封信"（回信时）或完全看不到信件历史
// （主动写信时），完全没法"记得"之前信里聊过什么，用户体感就是"AI回信像失忆一样"。
// 默认只取最近 maxLetters 封（按数量而不是天数限制，避免信件积攒很多年之后prompt无限膨胀）。
function buildLetterThreadContext(char, maxLetters = 12) {
    const letters = (char.diaryData && char.diaryData.letters) || [];
    if (letters.length === 0) return '';
    const sorted = letters.slice().sort((a, b) => a.date - b.date).slice(-maxLetters);
    return sorted.map(l => {
        const who = l.author === 'user' ? (currentUser.name || '用户') : char.name;
        return `【${who}】《${l.title || '无题'}》：\n${l.content}`;
    }).join('\n\n———\n\n');
}

// 抽取"发个请求、期待AI返回{title,content}这种JSON"的公共逻辑，信件的三种生成路径
// （用户手动点"好想对你说"、角色主动写信、角色回信）都共用这一份，避免每处都重复一遍解析/正则烘焙的代码。
async function generateTitledLetterContent(systemText, userText, charIdForRegex) {
    const api = getApiConfig(true);
    if (!api.key) return null;
    let prompt = buildStructuredMessages(systemText, [], userText);
    let data = await callChatCompletionAPI(api, prompt);
    let raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    let parsed = { title: '', content: raw };
    let parsedJson = extractJsonObject(raw); if (parsedJson) parsed = parsedJson;
    parsed.content = applyRegexScripts(parsed.content || raw, 'ai_output', charIdForRegex);
    return parsed;
}

// 角色"主动"写的信（不是回复谁），由 checkAndTriggerProactiveLetters() 按 letterFreq 频率定时调用，
// 不依赖任何页面DOM状态，可以在角色没被打开查看的情况下也正常在后台生成。
async function generateProactiveLetter(char) {
    if (!char.diaryData) char.diaryData = { letters: [], diaries: [] };
    if (!char.diaryData.letters) char.diaryData.letters = [];

    // ⚠️ 防御修复：跟推文那边同一类问题——prompt拼装（buildBasePrompt等）之前在try外面，
    // 一旦某个角色的世界书/预设数据触发异常就会抛出未捕获异常，导致调用方
    // checkAndTriggerProactiveLetters 里的 isProactiveLetterRunning 卡在true，
    // 此后所有角色的主动写信全部被静默挡住。现在整段拼装也纳入try/catch保护范围。
    try {
        let recentChat = getRecentChatContext(char.id);
        let recentPosts = getCharRecentPosts(char.id, 15).map(p => p.text).join('\n');
        const letterThread = buildLetterThreadContext(char);
        const systemText = buildBasePrompt(char, true, recentChat + '\n' + recentPosts);
        const userText = `请你结合上述你的核心人设、世界观背景、推文记忆总结、历史聊天总结，以及以下近期的动态、聊天记录，主动写一封寄给用户${currentUser.name}的信（是你自己想写就写的一封信，不是在回复谁的来信）。字数${letterWordLimit}字左右。${WORD_LIMIT_PRIORITY_NOTE}要深刻体现你的性格情感。
${letterThread ? `\n【你和${currentUser.name}之间目前为止的通信记录，供你了解已经聊过什么、避免重复或前后矛盾——不是每次都要接着信里的话题写，但要记得】：\n${letterThread}\n` : ''}
最近推文：\n${recentPosts || '暂无'}\n近期聊天记录：\n${recentChat || '暂无'}

【重要】：即使这次写的是信件而不是一段正常对话，如果你的世界观设定/正则脚本里要求每次输出/每段情境结束时固定附带某种格式标签、状态栏或HTML卡片，也请把它们照常当作这段内容的一部分正常写出来，放在正文末尾即可，不要因为这次的体裁是信件就跳过或省略这些规则。

${getFinalAnswerMarkerPromptNote()}

【极为严格的格式要求】：请仅返回合法 JSON 格式，决不要使用 \`\`\`json 包裹，也不要返回除 JSON 之外的任何说明废话！content字段里如果包含上述格式标签/HTML，换行请用\\n转义，这不违反JSON格式要求。
{"title":"这里写吸引人的标题","content":"这里写正文内容，段落之间用\\n分隔"}`;

        const parsed = await generateTitledLetterContent(systemText, userText, char.id);
        if (!parsed) return false;
        const letter = { id: 'd_' + Date.now() + '_' + Math.floor(Math.random() * 1000), title: parsed.title || '新信件', content: parsed.content || '', date: Date.now(), author: 'char' };
        char.diaryData.letters.unshift(letter);
        showToast(getAvatarHTML(char, 40), `收到 ${char.name} 的信`, letter.title, null, null);
        globalNotifications.unshift({ text: `<b>${char.name}</b> 给你寄来了一封信：${letter.title}`, timestamp: Date.now() });
        unreadNotifs++;
        if (typeof updateNotifBadge === 'function') updateNotifBadge();
        if (currentDiaryCharId == char.id && currentDiaryTab === 'letter' && document.getElementById('view-diary') && document.getElementById('view-diary').style.display !== 'none') renderDiaryContent();
        return true;
    } catch (e) {
        console.error('角色主动写信失败：', char.name, e);
        return false;
    }
}

// 随机抽一个延迟毫秒数（在设置里配置的最短/最长等待时间之间），用户写信的回信、日记被偷看的反应共用这同一套随机范围
function randomReplyDelayMs() {
    const minM = Math.max(1, parseInt(letterReplyDelayMin) || 60);
    const maxM = Math.max(minM, parseInt(letterReplyDelayMax) || 360);
    const mins = minM + Math.random() * (maxM - minM);
    return Math.round(mins * 60000);
}

// 用户在"寄来的信件"页面自己写一封信寄给当前选中的角色：立刻存档展示，角色的回信会隔一段随机时间后才出现
// （或者用户自己点"⚡立即回复"跳过等待），不是发出去马上就有回应——这是本次改造想要的"寄信等回信"的真实感。
// 🆕 replyToLetterId：如果是从某封角色来信的详情页点"↩️回复这封信"进来的，会带上那封信的id——
// 寄出后这封新信会记下 replyToId，回信生成时会明确提醒角色"这是在接你那封信"，不是凭空另起一个话题。
let userLetterReplyToId = null;
function openUserLetterCompose(replyToLetterId) {
    const char = myCharacters.find(c => c.id == currentDiaryCharId);
    if (!char) return alert('请先在上方选一个角色');
    userLetterReplyToId = replyToLetterId || null;
    document.getElementById('userLetterTitleInput').value = '';
    document.getElementById('userLetterContentInput').value = '';
    const hintEl = document.getElementById('userLetterReplyHint');
    if (hintEl) {
        if (userLetterReplyToId) {
            const original = (char.diaryData?.letters || []).find(l => l.id === userLetterReplyToId);
            hintEl.style.display = 'block';
            hintEl.innerHTML = `↩️ 正在回复：《${escapeHtml(original?.title || '无题')}》 <span style="color:#1d9bf0; cursor:pointer; text-decoration:underline;" onclick="userLetterReplyToId=null; document.getElementById('userLetterReplyHint').style.display='none';">取消，写新信</span>`;
        } else {
            hintEl.style.display = 'none';
            hintEl.innerHTML = '';
        }
    }
    openModal('userLetterComposeModal');
}
// 从信件详情页直接回复当前正在看的这封信（只对角色寄来的信有意义）
function replyToLetterFromDetail() {
    closeModal('diaryDetailModal');
    openUserLetterCompose(viewingDiaryId);
}
function sendUserLetter() {
    const char = myCharacters.find(c => c.id == currentDiaryCharId);
    if (!char) return;
    const title = document.getElementById('userLetterTitleInput').value.trim();
    const content = document.getElementById('userLetterContentInput').value.trim();
    if (!content) return alert('写点什么再寄出去吧～');
    if (!char.diaryData) char.diaryData = { letters: [], diaries: [] };
    if (!char.diaryData.letters) char.diaryData.letters = [];
    if (!char.pendingLetterReplies) char.pendingLetterReplies = [];

    const letter = { id: 'd_' + Date.now() + '_' + Math.floor(Math.random() * 1000), title: title || '（无题）', content, date: Date.now(), author: 'user', replyToId: userLetterReplyToId || undefined };
    char.diaryData.letters.unshift(letter);
    const dueAt = Date.now() + randomReplyDelayMs();
    char.pendingLetterReplies.push({ id: 'pr_' + Date.now(), letterId: letter.id, dueAt });

    userLetterReplyToId = null;
    closeModal('userLetterComposeModal');
    saveAllData();
    if (currentDiaryTab !== 'letter') switchDiaryTab('letter'); else renderDiaryContent();
    const waitText = formatDurationZh(dueAt - Date.now());
    appToast(`💌 信已经寄出，${char.name} 大概会在 ${waitText} 内给你回信`);
}

// 后台定时检查：所有角色的 pendingLetterReplies 里，到点(dueAt<=now)的就触发生成回信
let isResolvingLetterReplies = false;
async function resolveDueLetterReplies() {
    if (isResolvingLetterReplies) return;
    const api = getApiConfig(true);
    if (!api.key) return;
    const now = Date.now();
    let dueList = [];
    myCharacters.forEach(char => {
        (char.pendingLetterReplies || []).forEach(p => { if (p.dueAt <= now) dueList.push({ char, pending: p }); });
    });
    if (dueList.length === 0) return;
    isResolvingLetterReplies = true;
    for (const { char, pending } of dueList.slice(0, 2)) {
        await resolveLetterReply(char, pending);
    }
    isResolvingLetterReplies = false;
    saveAllData();
}

// 立即回复按钮：不等随机延迟了，直接触发这一封信的回信
async function forceReplyNowForLetter(charId, letterId) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;
    const pending = (char.pendingLetterReplies || []).find(p => p.letterId === letterId);
    if (!pending) return;
    appToast(`${char.name} 正在回信...`);
    await resolveLetterReply(char, pending);
    saveAllData();
    renderDiaryContent();
}

// 真正生成一封回信：读用户当初写的那封信的内容，让角色针对性地回复，而不是随便写一封不相干的信
async function resolveLetterReply(char, pending) {
    try {
        const userLetter = (char.diaryData.letters || []).find(l => l.id === pending.letterId);
        if (!userLetter) { char.pendingLetterReplies = (char.pendingLetterReplies || []).filter(p => p.id !== pending.id); return; }

        let recentChat = getRecentChatContext(char.id);
        const systemText = buildBasePrompt(char, true, recentChat);
        // 🆕 如果用户这封信是"针对性回复"你之前寄的某一封信（而不是凭空新写的），把那封原信也明确指出来，
        // 避免AI把这次回信当成一个全新话题来写，实际上用户是在接着你们俩之前的通信往下聊。
        const repliedToLetter = userLetter.replyToId ? (char.diaryData.letters || []).find(l => l.id === userLetter.replyToId) : null;
        const replyContextNote = repliedToLetter
            ? `\n【注意】：这封信是用户特意针对你之前寄出的那封《${repliedToLetter.title || '无题'}》写的回信，请确保你的回信真的接得上、记得自己之前信里说了什么，不要答非所问。\n`
            : '';
        const letterThread = buildLetterThreadContext(char);
        const userText = `用户${currentUser.name}给你寄来了一封信，标题是《${userLetter.title || '无题'}》，正文如下：
「${userLetter.content}」
${replyContextNote}
${letterThread ? `\n【你和${currentUser.name}之间目前为止完整的通信记录，供你回忆前因后果、确保这次回信和以前说过的话保持一致，不会前后矛盾或"失忆"】：\n${letterThread}\n` : ''}
请你结合上述你的核心人设、世界观背景，认真读完这封信，然后给用户写一封回信。回信要针对信里具体提到的内容来回应，不能是一封答非所问、随便写写的信。字数${letterWordLimit}字左右。${WORD_LIMIT_PRIORITY_NOTE}要深刻体现你的性格情感。

【重要】：即使这次写的是信件而不是一段正常对话，如果你的世界观设定/正则脚本里要求每次输出/每段情境结束时固定附带某种格式标签、状态栏或HTML卡片，也请把它们照常当作这段内容的一部分正常写出来，放在正文末尾即可，不要因为这次的体裁是信件就跳过或省略这些规则。

${getFinalAnswerMarkerPromptNote()}

【极为严格的格式要求】：请仅返回合法 JSON 格式，决不要使用 \`\`\`json 包裹，也不要返回除 JSON 之外的任何说明废话！content字段里如果包含上述格式标签/HTML，换行请用\\n转义，这不违反JSON格式要求。
{"title":"这里写回信标题","content":"这里写回信正文，段落之间用\\n分隔"}`;

        const parsed = await generateTitledLetterContent(systemText, userText, char.id);
        if (!parsed) return; // 生成失败：先留在待回信队列里，下次定时检查会自动重试，不会悄悄丢掉这封信
        char.pendingLetterReplies = (char.pendingLetterReplies || []).filter(p => p.id !== pending.id);

        const reply = { id: 'd_' + Date.now() + '_' + Math.floor(Math.random() * 1000), title: parsed.title || `回信：${userLetter.title || '无题'}`, content: parsed.content || '', date: Date.now(), author: 'char', replyToId: userLetter.id };
        char.diaryData.letters.unshift(reply);
        showToast(getAvatarHTML(char, 40), `${char.name} 回信了`, reply.title, null, null);
        globalNotifications.unshift({ text: `<b>${char.name}</b> 回了你一封信：${reply.title}`, timestamp: Date.now() });
        unreadNotifs++;
        if (typeof updateNotifBadge === 'function') updateNotifBadge();
        if (currentDiaryCharId == char.id && currentDiaryTab === 'letter' && document.getElementById('view-diary') && document.getElementById('view-diary').style.display !== 'none') renderDiaryContent();
    } catch (e) {
        console.error('生成回信失败：', char.name, e);
    }
}

// ============================================================
// 🗒️ "我的日记"：用户自己写日记，选角色（可多选）允许偷看。每个被选中的角色各自独立、随机延迟一段时间后
// 决定要不要看、看了要不要批注；不看的话在下面写一句符合人设的话。跟角色自己写日记(char.diaryData.diaries，
// 用户偷看那种)是完全独立的两套东西，数据存在顶层的 globalUserDiaries 里，不挂在具体某个角色身上。
// ============================================================

function renderMyDiaryArea() {
    const charBox = document.getElementById('myDiaryCharCheckboxes');
    if (charBox) {
        charBox.innerHTML = myCharacters.length === 0
            ? '<span style="color:#536471; font-size:13px;">暂无角色，请先创建角色。</span>'
            : myCharacters.map(c => `<label style="display:flex; align-items:center; gap:5px; cursor:pointer; font-size:13px;"><input type="checkbox" class="my-diary-char-check" value="${c.id}"> ${escapeHtml(c.name)}</label>`).join('');
    }

    const listBox = document.getElementById('myDiaryListContainer');
    if (!listBox) return;
    if (!globalUserDiaries || globalUserDiaries.length === 0) {
        listBox.innerHTML = '<div class="empty-state">还没写过日记，写一篇试试吧～</div>';
        return;
    }
    const sorted = [...globalUserDiaries].sort((a, b) => b.date - a.date);
    listBox.innerHTML = sorted.map(entry => {
        const reactionsHtml = (entry.reactions || []).map(r => {
            const char = myCharacters.find(c => c.id == r.charId);
            const name = char ? char.name : '（角色已删除）';
            if (r.status === 'pending') {
                return `<div class="my-diary-reaction" style="color:#f9a825;">⏳ ${escapeHtml(name)} 还没反应 <span style="color:#1d9bf0; cursor:pointer; text-decoration:underline;" onclick="forceReplyNowForDiary('${entry.id}', '${r.charId}')">⚡立即回复</span></div>`;
            }
            const icon = r.status === 'peeked' ? (entry.mode === 'invite' ? '📖' : '👀') : '🙈';
            const label = r.status === 'peeked' ? (entry.mode === 'invite' ? '看完了并留下批注' : '偷看了并留下批注') : '没有去看，说';
            return `<div class="my-diary-reaction" style="color:#0f1419;">
                <b>${icon} ${escapeHtml(name)} ${label}：</b>${escapeHtml(r.resultText || '').replace(/\n/g, '<br>')}
                <span style="color:#1d9bf0; cursor:pointer; font-size:12px; margin-left:4px; white-space:nowrap;" onclick="regenerateDiaryReaction('${entry.id}', '${r.charId}')">🔄 重新生成</span>
            </div>`;
        }).join('');
        return `<div class="my-diary-entry" style="border:2px solid #1d9bf0; border-radius:12px; padding:15px; background:rgba(255,255,255,0.8);">
            <div class="diary-card-title" style="font-size:17px;">${escapeHtml(entry.title || '无题')} ${entry.mode === 'invite' ? '<span style="font-size:11px; font-weight:normal; color:#1d9bf0; background:rgba(29,155,240,0.1); padding:1px 8px; border-radius:9999px;">📖 主动邀请观看</span>' : ''}</div>
            <div class="diary-card-date">${new Date(entry.date).toLocaleString()}</div>
            <div style="font-size:14px; line-height:1.6; color:#0f1419; white-space:pre-wrap; margin-bottom:10px;">${escapeHtml(entry.content)}</div>
            <div style="border-top:1px solid #eff3f4; padding-top:8px; display:flex; flex-direction:column; gap:6px;">${reactionsHtml || '<span style="color:#8b98a5; font-size:12px;">没有选任何角色偷看</span>'}</div>
            <div style="margin-top:8px; text-align:right;"><span style="color:#f91880; cursor:pointer; font-size:12px;" onclick="deleteUserDiaryEntry('${entry.id}')">🗑️ 删除</span></div>
        </div>`;
    }).join('');
}

// 写日记表单上"可能被偷看/主动邀请观看"单选切换时，顺手把上面那行小字说明也换成对应的措辞
function updateMyDiaryModeLabel() {
    const mode = document.querySelector('input[name="myDiaryMode"]:checked')?.value || 'peek';
    const label = document.getElementById('myDiaryTargetLabel');
    if (label) label.innerText = mode === 'invite' ? '邀请谁来看这篇日记：' : '谁可以偷看这篇日记：';
}

function publishUserDiary() {
    const title = document.getElementById('myDiaryTitleInput').value.trim();
    const content = document.getElementById('myDiaryContentInput').value.trim();
    if (!content) return alert('写点什么再保存吧～');
    const selectedCharIds = Array.from(document.querySelectorAll('.my-diary-char-check:checked')).map(cb => cb.value);
    // 'peek'=可能被偷看（角色自己决定看不看，默认）；'invite'=主动邀请观看（都会看，都要写批注，没有"没看"这个分支）
    const mode = document.querySelector('input[name="myDiaryMode"]:checked')?.value === 'invite' ? 'invite' : 'peek';

    const entry = {
        id: 'ud_' + Date.now(), title: title || '（无题）', content, date: Date.now(),
        targetCharIds: selectedCharIds, mode,
        reactions: selectedCharIds.map(charId => ({ charId, status: 'pending', dueAt: Date.now() + randomReplyDelayMs() }))
    };
    if (!globalUserDiaries) globalUserDiaries = [];
    globalUserDiaries.unshift(entry);

    document.getElementById('myDiaryTitleInput').value = '';
    document.getElementById('myDiaryContentInput').value = '';
    document.querySelectorAll('.my-diary-char-check').forEach(cb => cb.checked = false);
    const peekRadio = document.querySelector('input[name="myDiaryMode"][value="peek"]');
    if (peekRadio) { peekRadio.checked = true; updateMyDiaryModeLabel(); }

    saveAllData();
    renderMyDiaryArea();
    appToast(selectedCharIds.length > 0
        ? (mode === 'invite' ? '📖 日记写好了，邀请的角色都会来看并留下批注' : '📔 日记写好了，选中的角色会陆续来看')
        : '📔 日记已保存（没有选角色偷看）');
}

async function deleteUserDiaryEntry(id) {
    if (!(await appConfirm('确定要删除这篇日记吗？此操作无法撤销。'))) return;
    globalUserDiaries = (globalUserDiaries || []).filter(e => e.id !== id);
    saveAllData();
    renderMyDiaryArea();
}

// 后台定时检查：所有用户日记条目里，到点(dueAt<=now)还没反应过来的角色反应，触发生成
let isResolvingDiaryReactions = false;
async function resolveDueDiaryReactions() {
    if (isResolvingDiaryReactions) return;
    const api = getApiConfig(true);
    if (!api.key) return;
    const now = Date.now();
    let dueList = [];
    (globalUserDiaries || []).forEach(entry => {
        (entry.reactions || []).forEach(r => { if (r.status === 'pending' && r.dueAt <= now) dueList.push({ entry, reaction: r }); });
    });
    if (dueList.length === 0) return;
    isResolvingDiaryReactions = true;
    for (const { entry, reaction } of dueList.slice(0, 2)) {
        await resolveDiaryReaction(entry, reaction);
    }
    isResolvingDiaryReactions = false;
    saveAllData();
}

// 立即回复按钮：不等随机延迟了，直接让这个角色对这篇日记表态
async function forceReplyNowForDiary(entryId, charId) {
    const entry = (globalUserDiaries || []).find(e => e.id === entryId);
    if (!entry) return;
    const reaction = (entry.reactions || []).find(r => String(r.charId) === String(charId));
    if (!reaction || reaction.status !== 'pending') return;
    const char = myCharacters.find(c => c.id == charId);
    appToast(`${char ? char.name : '角色'} 正在看你的日记...`);
    await resolveDiaryReaction(entry, reaction);
    saveAllData();
    renderMyDiaryArea();
}

// 立即重新生成：已经有结果的反应，丢掉旧的resultText，按原来的模式(偷看/邀请)重新生成一次，
// 覆盖掉原来那条批注——跟"立即回复"共用同一个真正生成函数，只是这里不要求reaction原来是pending状态。
async function regenerateDiaryReaction(entryId, charId) {
    const entry = (globalUserDiaries || []).find(e => e.id === entryId);
    if (!entry) return;
    const reaction = (entry.reactions || []).find(r => String(r.charId) === String(charId));
    if (!reaction) return;
    const char = myCharacters.find(c => c.id == charId);
    appToast(`${char ? char.name : '角色'} 正在重新想怎么写...`);
    await resolveDiaryReaction(entry, reaction);
    saveAllData();
    renderMyDiaryArea();
}

// 真正让角色对某篇用户日记表态：
// - entry.mode==='peek'（默认，可能被偷看）：角色自己先判断要不要凑过去翻开日记，再按结果分别产出批注或"没看"的理由。
// - entry.mode==='invite'（主动邀请观看）：用户是直接把日记递给角色看的，不存在"要不要看"这个悬念，
//   角色一定会看、也一定要写批注，prompt不再提供"没看"这个分支，语气上也更像"被正式邀请阅读后给出回应"，
//   而不是"悄悄瞥了一眼"，跟偷看模式那种带点心虚/窥探感的语气应该是不一样的。
async function resolveDiaryReaction(entry, reaction) {
    const char = myCharacters.find(c => c.id == reaction.charId);
    if (!char) { reaction.status = 'not_peeked'; reaction.resultText = ''; reaction.resolvedAt = Date.now(); return; }
    const api = getApiConfig(true);
    if (!api.key) return; // 留在pending里，下次再重试
    const isInvite = entry.mode === 'invite';

    try {
        const systemText = buildBasePrompt(char, false);
        const noteMaxLen = Math.min(diaryWordLimit || 100, 120);
        const userText = isInvite ? `用户${currentUser.name}把自己写的一篇日记直接拿给你看，明确邀请你阅读——这不是偷看，Ta知道你会看到全部内容，你也清楚这是Ta主动给你看的。日记标题《${entry.title || '无题'}》，正文如下：
「${entry.content}」

请结合你的人设和你们之间的关系，认真读完之后给出你的批注/感想/回应（不超过${noteMaxLen}字），要紧扣日记里具体写了什么来回应，不能是一句空话或者跟内容不相关的场面话。因为是Ta主动给你看的，语气可以更直接、更坦率，不需要带偷看那种心虚或窥探感——不管是感动、心疼、吐槽、说教还是不以为然，就以你的真实反应来写。

${getFinalAnswerMarkerPromptNote()}

【极为严格的格式要求】：请仅返回合法 JSON 格式，不要用 \`\`\`json 包裹，不要有任何多余说明文字：
{"text": "这里写你的批注内容"}` : `用户${currentUser.name}写了一篇日记，放在你能"偷看"到的地方（Ta允许你看，但这不代表Ta主动拿给你看，要不要真的凑过去翻开这篇日记，由你自己的性格和这段关系决定）。日记标题《${entry.title || '无题'}》，正文如下：
「${entry.content}」

请你先自己判断：以你的性格和现在的心情/状态，这种情况下你会不会真的去看这篇日记？
- 如果会看：看完之后，用你的语气在日记本上留一句批注/吐槽/感想（不超过${noteMaxLen}字），要紧扣日记里具体写了什么来回应，不能是一句空话或者跟内容不相关的场面话。
- 如果不会看（比如觉得偷看不太好、没兴趣、正在忙别的事）：绝对不能提到日记里的具体内容（因为设定上你没看），只需要写一句符合你人设、解释你此刻在干嘛/为什么没去看的话（不超过50字）。

${getFinalAnswerMarkerPromptNote()}

【极为严格的格式要求】：请仅返回合法 JSON 格式，不要用 \`\`\`json 包裹，不要有任何多余说明文字：
{"peeked": true或false, "text": "这里写批注内容，或者没看的理由"}`;

        const prompt = buildStructuredMessages(systemText, [], userText);
        const data = await callChatCompletionAPI(api, prompt);
        let raw = data.choices?.[0]?.message?.content?.trim();
        if (!raw) return; // 留在pending里，下次再重试

        raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
        let parsed = extractJsonObject(raw);
        let peeked = isInvite ? true : ((parsed && typeof parsed.peeked === 'boolean') ? parsed.peeked : true);
        // 🐛 修复"日记批注显示出一整段没解析出来的JSON代码"：以前这里解析失败就直接把原始raw文本（包含
        // 【正式输出开始】标记和裸露的{...}结构）整段当成批注内容显示出来。现在解析失败时，先试着用正则
        // 单独把"text"字段的字符串值抠出来（extractStringFieldLoose，八成情况下够用），实在抠不出来
        // 才退而求其次剥掉标记文字（至少不会露出【正式输出开始】这行），都不行才用原始raw兜底。
        let text = (parsed && parsed.text) ? String(parsed.text)
            : (extractStringFieldLoose(raw, 'text') || (typeof extractAfterFinalMarker === 'function' ? extractAfterFinalMarker(raw) : raw));
        text = applyRegexScripts(text, 'ai_output', char.id);

        reaction.status = peeked ? 'peeked' : 'not_peeked';
        reaction.resultText = text;
        reaction.resolvedAt = Date.now();

        showToast(getAvatarHTML(char, 40), peeked ? (isInvite ? `${char.name} 看完了你的日记` : `${char.name} 偷看了你的日记`) : `${char.name} 对你的日记有反应了`, text.slice(0, 40), null, null);
        globalNotifications.unshift({ text: `<b>${char.name}</b> ${peeked ? (isInvite ? '认真看完了你邀请Ta看的日记，还留了句话' : '偷看了你的日记，还留了句话') : '路过你的日记，但没有翻开'}`, timestamp: Date.now() });
        unreadNotifs++;
        if (typeof updateNotifBadge === 'function') updateNotifBadge();
        if (currentDiaryTab === 'mydiary' && document.getElementById('view-diary') && document.getElementById('view-diary').style.display !== 'none') renderMyDiaryArea();
    } catch (e) {
        console.error('生成日记反应失败：', reaction.charId, e);
    }
}

// ===== 故事生成相关功能逻辑 =====

function applyNovelCSS() {
    let el = document.getElementById('custom-novel-style');
    if(!el) { el = document.createElement('style'); el.id = 'custom-novel-style'; document.head.appendChild(el); }
    el.innerHTML = novelCustomCSS;
}

function openNovelCSSModal(e) {
    e.preventDefault(); 
    document.getElementById('novelCSSInput').value = novelCustomCSS || defaultNovelCSS;
    openModal('novelCSSModal');
}

function saveNovelCSS() {
    novelCustomCSS = document.getElementById('novelCSSInput').value;
    applyNovelCSS();
    saveAllData();
    closeModal('novelCSSModal');
}

function openCreateNovelView() {
    currentEditingNovelId = 'n_' + Date.now();
    let newNovel = { id: currentEditingNovelId, title: '', outline: '', chars: [], worldbooks: [], targetWordCount: 1000, chapters: [], secondPerson: true, __ssMigrated: true };
    globalNovels.unshift(newNovel);
    saveAllData();
    openNovelDetail(currentEditingNovelId);
}

function openNovelDetail(id) {
    currentEditingNovelId = id;
    const novel = globalNovels.find(n => n.id === id);
    if (!novel) return;

    document.getElementById('novelListWrapper').style.display = 'none';
    document.getElementById('novelEditorWrapper').style.display = 'block';
    
    document.getElementById('novelTitleInput').value = novel.title;
    document.getElementById('novelOutlineText').value = novel.outline;
    document.getElementById('novelWordCount').value = novel.targetWordCount || 1000;
    const secondPersonInput = document.getElementById('novelSecondPerson');
    if (secondPersonInput) secondPersonInput.checked = novel.secondPerson !== false; // 老故事没这个字段时，默认按"开启"处理

    const charBox = document.getElementById('novelCharCheckboxes');
    const allChars = [currentUser, ...myCharacters]; 
    
    if (allChars.length === 0) { 
        charBox.innerHTML = '<span style="color:#888;">暂无角色，请先创建。</span>'; 
    } else {
        charBox.innerHTML = allChars.map(c => `
            <label style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.8); padding:5px 10px; border-radius:9999px; border:1px solid #1d9bf0; cursor:pointer;">
                <input type="checkbox" class="novel-char-check" value="${c.id}" ${(novel.chars||[]).includes(c.id) ? 'checked' : ''}>
                ${getAvatarHTML(c, 24)} ${c.name}
            </label>`).join('');
    }
    
    novelWbCategoryFilter = null;
    novelWbPendingSelection = new Set(novel.worldbooks || []);
    renderNovelWbCheckboxes();
    
    document.getElementById('novelTempArea').style.display = 'none';
    tempNovelChapter = null;
    renderNovelChapters();

    renderNovelTheaterBox();
}

// 🎭 小剧场面板：只在"当前启用的预设"里确实检测到名字带"剧场"的模块时才显示这个区块，没有就整块隐藏，
// 不会给没用到这个玩法的用户平白多一块空面板。
function renderNovelTheaterBox() {
    const box = document.getElementById('novelTheaterBox');
    const list = document.getElementById('novelTheaterCheckboxes');
    if (!box || !list) return;
    const theaterPrompts = (typeof getTheaterPresetPrompts === 'function') ? getTheaterPresetPrompts() : [];
    if (theaterPrompts.length === 0) { box.style.display = 'none'; list.innerHTML = ''; return; }
    box.style.display = 'block';
    list.innerHTML = theaterPrompts.map(p => `
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:13px;">
            <input type="checkbox" ${p.enabled !== false ? 'checked' : ''} onchange="toggleActivePresetPromptEnabled('${p.id}', this.checked)">
            ${escapeHtml(p.name || '未命名模块')}
        </label>`).join('');
}

function openNovelReader() {
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if (!novel || novel.chapters.length === 0) return alert("我们的旅程还没有开启");

    document.getElementById('novelEditorWrapper').style.display = 'none';
    document.getElementById('novelReaderWrapper').style.display = 'block';

    document.getElementById('readerTitle').innerText = novel.title || '未命名故事';

    let contentHtml = '';
    novel.chapters.forEach((c, __i) => {
        contentHtml += `<h3 style="color:#1d9bf0; margin-top:40px; margin-bottom:20px; text-align:center;">第 ${c.index} 章</h3>`;
        // 🐛 修复"沉浸阅读里角色自带的HTML显示成代码"：这里之前是把 c.content 原文直接拼进innerHTML，
        // 没有经过 formatPostText/renderMarkdownLite 这条统一渲染链路——章节正文里的[STATUS_START]这类
        // 方括号标记、或需要靠角色专属正则脚本转换成卡片的标签，压根没被转换，只能原样当纯文字糊出来。
        // 跟章节列表(renderNovelChapters)保持同一套渲染方式：markdown+角色专属正则都在这一步生效。
        contentHtml += `<div style="text-indent: 2em; margin-bottom: 40px;" class="post-body">${namespaceInjectedIds(renderMarkdownLite(c.content, c.charId || null, novel.chapters.length - 1 - __i), c.id || ('reader_' + c.index))}</div>`;
    });
    document.getElementById('readerContent').innerHTML = contentHtml;
    if (typeof enableChatScriptExecution !== 'undefined' && enableChatScriptExecution) { try { executeInjectedScripts(document.getElementById('readerContent')); } catch (e) { console.error('执行沉浸阅读注入脚本时出错：', e); } }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeNovelReader() {
    document.getElementById('novelReaderWrapper').style.display = 'none';
    document.getElementById('novelEditorWrapper').style.display = 'block';
}

function closeNovelEditor() {
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if (novel) {
        novel.title = document.getElementById('novelTitleInput').value.trim();
        novel.outline = document.getElementById('novelOutlineText').value.trim();
        novel.targetWordCount = parseInt(document.getElementById('novelWordCount').value) || 1000;
        novel.chars = Array.from(document.querySelectorAll('.novel-char-check:checked')).map(cb => cb.value === 'me' ? 'me' : parseInt(cb.value));
        novel.worldbooks = Array.from(novelWbPendingSelection);
        const secondPersonInput = document.getElementById('novelSecondPerson');
        if (secondPersonInput) novel.secondPerson = secondPersonInput.checked;
        if (!novel.title && !novel.outline && novel.chapters.length === 0) {
            globalNovels = globalNovels.filter(n => n.id !== currentEditingNovelId);
        }
        saveAllData();
    }
    currentEditingNovelId = null;
    renderNovelList();
}

function importNovelOutline(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('novelOutlineText').value = e.target.result;
        document.getElementById('novelOutlineFile').value = '';
    };
    reader.readAsText(file);
}

async function generateNovelChapter(isRegenerate = false) {
    const api = getApiConfig(true); 
    if(!api.key) return alert("请先在设置中配置 API Key (主API或副API)！");
    
    const btn = document.getElementById('btnGenNovelChapter');
    btn.innerText = "之后会发生什么... "; btn.disabled = true;
    const genStartTime = Date.now(); // 展示"思考耗时"用

    const title = document.getElementById('novelTitleInput').value.trim() || '未命名故事';
    const outline = document.getElementById('novelOutlineText').value.trim();
    const wordCount = document.getElementById('novelWordCount').value || 1000;
    const secondPersonEl = document.getElementById('novelSecondPerson');
    const secondPerson = secondPersonEl ? secondPersonEl.checked : true;
    const selChars = Array.from(document.querySelectorAll('.novel-char-check:checked')).map(cb=>cb.value);
    const selWbs = Array.from(novelWbPendingSelection);

    // 💡 增强：如果勾选了角色，把角色的推文记忆总结也顺带提取进去，实现“推特经历穿越到故事”
    let charContext = selChars.map(id => {
        let c = id === 'me' ? currentUser : myCharacters.find(x => x.id == id);
        let extraMemory = (c && c.memorySummary) ? `\n[该角色近期的经历记忆]: ${c.memorySummary}` : '';
        return c ? `角色【${c.name}】：${c.persona || '暂无设定'}${extraMemory}` : '';
    }).join('\n\n');

    let wbContext = worldbooks.filter(w => selWbs.includes(w.id)).map(w => `世界观设定【${w.title}】：${w.content}`).join('\n\n');

    // 🐛 修复："角色卡自带的状态栏/格式规则完全没传给AI"：wbContext之前只来自用户在UI上手动勾选的世界书(selWbs)，
    // 如果用户压根没把角色自己的世界书手动挂到这本小说上（很常见——角色卡导入时世界书是挂在角色身上的，
    // 不会自动出现在这里的勾选列表里），那么"必须始终输出XX标签"这类硬性指令就完全没进过prompt，
    // 跟渲染修没修都没关系，AI从一开始就没看到这条要求。这里跟互动续写(buildStoryModeSystemPrompt)一样，
    // 对每个勾选参与的角色额外补一份"该角色自己的世界书"（含其constant:true常驻条目），自动挂载、不用用户手动选。
    let charWbContext = (typeof getCharacterWorldbookText === 'function') ? selChars.filter(id => id !== 'me').map(id => {
        let c = myCharacters.find(x => x.id == id);
        return c ? getCharacterWorldbookText(c, outline || '') : '';
    }).filter(Boolean).join('\n') : '';
    if (charWbContext) wbContext = (wbContext ? wbContext + '\n\n' : '') + charWbContext;

    let previousContext = '';
    let novel = globalNovels.find(n => n.id === currentEditingNovelId);
    let currentChapterNum = 1;
    
    if (novel && novel.chapters && novel.chapters.length > 0) {
        currentChapterNum = novel.chapters.length + 1;
        let lastChapter = novel.chapters[novel.chapters.length - 1];
        let summaryChaps = novel.chapters.slice(-3, -1); 

        let summaryText = summaryChaps.map(c => `[第${c.index}章提要]: ${c.content.substring(0, 200)}...`).join('\n');
        let lastChapterText = lastChapter.content.length > 1500 ? `...(前略)\n${lastChapter.content.substring(lastChapter.content.length - 1500)}` : lastChapter.content;

        previousContext = `${summaryText}\n\n【上一章（第${lastChapter.index}章）结尾内容，请严格紧接着这里的剧情、对话和场景往下续写，不要重头开始】：\n${lastChapterText}`;
    }

    // 🎭 小剧场：当前启用预设里勾选了的"剧场"模块，追加成正文之后的番外指令
    // （scopeId传novel.id，让{{setvar}}/{{getvar}}这类变量宏在同一本小说的历次生成之间保持连续）
    const theaterCharForMacro = selChars.filter(id => id !== 'me').map(id => myCharacters.find(x => x.id == id)).find(Boolean) || null;
    const theaterInjection = (typeof getTheaterPromptInjection === 'function') ? getTheaterPromptInjection(theaterCharForMacro, currentEditingNovelId) : '';

    // 💡 核心修改：大幅强化故事大纲、世界观的提示词优先级
    let prompt = `你是一个才华横溢的网络故事作家。请根据以下资料，撰写故事《${title}》的【第${currentChapterNum}章】。

【核心故事大纲与走向】(⚠️必须严格围绕此大纲发展剧情)：
${outline || '无大纲，请自由发挥想象力推进剧情'}

【强行挂载的世界观】：
${wbContext || '无特定世界观，贴近现实'}

【主要登场角色与设定】：
${charContext || '无特定登场角色'}

【前文剧情回顾】：
${previousContext || '这是第一章，故事的起点。'}

【创作硬性要求】：
1. 目标字数：约 ${wordCount} 字左右，描写细腻，决不能过度敷衍跳跃。${WORD_LIMIT_PRIORITY_NOTE}
2. 必须深度结合【核心故事大纲】中的主线、结合【世界观】的设定以及【角色】的性格特征进行推进。
3. 请直接输出当前章节的正文内容。不要输出“第X章”等标题，不要输出任何寒暄、自我解释或任何Markdown代码块前缀。${secondPerson ? '\n4. 采用第二人称视角写作：把"你"当作这个故事的主角/视角人物，叙述和心理描写都用"你"来指代主角本人（例如"你推开门，心里一紧"），不要用"我"的第一人称、也不要用角色名字或"他/她"的第三人称来写主角视角的内容；其他配角正常按人称描写即可，对话引号内的台词不受此限制。' : ''}
5. 即使这次写的是小说章节而不是一段对话，如果【世界观】设定/正则脚本里要求每次输出/每段情境结束时固定附带某种格式标签或HTML（比如状态栏、卡片等），也请把它照常写进正文末尾，不用因为这是章节正文就跳过或省略这些规则。
${theaterInjection ? `\n【附加环节：小剧场】\n正文写完之后，请紧接着按下面的规则再追加生成一段小剧场番外内容：\n${theaterInjection}\n` : ''}
${getFinalAnswerMarkerPromptNote()}`;

    try {
        let data = await sendChatRequest(api, prompt);
        if(data.error) throw new Error(data.error.message || "请求报错");

        let text = data.choices?.[0]?.message?.content?.trim();
        if(text) {
            text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
            const chapterCharIdRaw = selChars.find(v => v !== 'me');
            const chapterCharId = chapterCharIdRaw ? (parseInt(chapterCharIdRaw) || chapterCharIdRaw) : null;
            // 🐛 关键修复"状态栏卡片还是不显示"：不少角色卡自带的状态栏正则脚本在原始数据里标了markdownOnly
            // （导入时映射成本app的displayOnly=true），意思是"只在界面渲染那一刻生效，不烘焙进存档"——这类脚本
            // 根本不会走下面的applyRegexScripts（它只处理没标displayOnly的脚本），而是渲染时由
            // renderMarkdownLite→applyDisplayOnlyRegex处理。之前把思维链折叠框HTML直接拼进chapter.content存档，
            // 等到渲染时renderMarkdownLite对"整段content"跑applyDisplayOnlyRegex，状态栏正则如果是从文本开头^锚定
            // 匹配的，一样会被堵在最前面的思维链HTML挡住——不管烘焙阶段的处理顺序怎么调都没用，因为这类脚本压根
            // 不在烘焙阶段跑。真正的修复：思维链折叠框跟mvuSnapshot/recallHtml一样单独存成一个字段，完全不拼进
            // chapter.content，渲染时在renderMarkdownLite(chapter.content,...)外面单独拼接。
            const { rest: textNoReasoning, reasoningHtml } = extractReasoningForNovel(text);
            text = applyRegexScripts(textNoReasoning, 'ai_output', chapterCharId);
            const mvuResult = processMvuPatchInText(text, currentEditingNovelId);
            text = mvuResult.cleanText;
            const recallResult = processRecallBlockInText(text, currentEditingNovelId);
            text = recallResult.cleanText;
            tempNovelChapter = {
                id: 'c_' + Date.now(),
                index: currentChapterNum,
                content: text,
                timestamp: Date.now(),
                genTimeMs: Date.now() - genStartTime,
                charId: chapterCharId,
                reasoningHtml: reasoningHtml,
                mvuSnapshot: mvuResult.snapshot,
                recallHtml: recallResult.recallHtml
            };
            document.getElementById('novelTempContent').value = text;
            document.getElementById('novelTempArea').style.display = 'block';
            document.getElementById('novelTempArea').scrollIntoView({behavior: 'smooth'});
        }
    } catch(e) {
        alert("生成失败：" + e.message);
    } finally {
        btn.innerText = " 接下来你想怎么发展剧情呢"; btn.disabled = false;
    }
}

function toggleNovelTempFull(btn) {
    const area = document.getElementById('novelTempContent');
    if(area.style.height === '80vh') {
        area.style.height = '300px';
        btn.innerText = '⛶';
    } else {
        area.style.height = '80vh';
        btn.innerText = '✖';
    }
}

function keepNovelChapter() {
    if(!tempNovelChapter) return;
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if(novel) {
        tempNovelChapter.content = document.getElementById('novelTempContent').value;
        novel.chapters.push(tempNovelChapter);
        saveAllData();
        document.getElementById('novelTempArea').style.display = 'none';
        tempNovelChapter = null;
        renderNovelChapters();

        let novelTitle = novel.title || '未命名故事';
        showToast(`<div class="avatar" style="background:#1d9bf0;color:white;font-size:20px;">📚</div>`, `新章节已保存完毕！`, `《${novelTitle}》第 ${novel.chapters.length} 章已存档。`, null, null);
        globalNotifications.unshift({ text: `<b>系统</b> 已完成故事《${novelTitle}》的新章节生成`, postId: null, chatCharId: null, timestamp: Date.now() });
        unreadNotifs++;
        if (typeof updateNotifBadge === 'function') updateNotifBadge();
    }
}

function discardNovelChapter() {
    document.getElementById('novelTempArea').style.display = 'none';
    tempNovelChapter = null;
}

function renderNovelChapters() {
    const container = document.getElementById('novelChaptersContainer');
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if(!novel || !novel.chapters || novel.chapters.length === 0) {
        container.innerHTML = '<div style="color:#888;">暂无生成的章节。</div>';
        return;
    }
    
    // 老章节（charId 这个字段是后来才加的）没记是哪个角色写的，
    // 退回按这本小说勾选的第一个非"me"角色兜底，否则角色专属的状态栏正则命中不了、卡片出不来。
    const fallbackCharId = (novel.chars && novel.chars.find(c => c !== 'me')) || null;

    container.innerHTML = novel.chapters.map((chap, idx) => `
        <div class="novel-chapter-item">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="novel-chapter-title">第 ${idx + 1} 章</div>
                <button class="btn-edit-small" style="color:#f91880; border-color:#f91880;" onclick="deleteChapter(${idx})">删除此章</button>
            </div>
            <div style="font-size:15px; color:#536471; margin-bottom:10px;">生成于 ${new Date(chap.timestamp).toLocaleString()} · 共 ${chap.content.length} 字${(typeof showNovelThinkingTime !== 'undefined' && showNovelThinkingTime && chap.genTimeMs) ? ` · 🕐 耗时 ${(chap.genTimeMs / 1000).toFixed(1)}s` : ''}</div>
            <div style="font-size:15px; line-height:1.8; white-space:pre-wrap; max-height:200px; overflow-y:auto; padding-right:10px; background:#f7f9f9; padding:15px; border-radius:8px;">${chap.reasoningHtml || ''}${chap.mvuSnapshot ? renderMvuStatusBarHtml(chap.mvuSnapshot) : ''}${chap.recallHtml || ''}${namespaceInjectedIds(renderMarkdownLite(chap.content, chap.charId || fallbackCharId, novel.chapters.length - 1 - idx), chap.id || ('c_idx_' + idx))}</div>
        </div>
    `).join('');
    if (typeof pruneCardWhitespace === 'function') {
        container.querySelectorAll('.novel-chapter-item > div:last-child').forEach(b => pruneCardWhitespace(b));
    }
    // 跟续写工作台(renderSsTurns)一样，补上注入脚本执行，不然角色状态栏卡片里靠JS实现的"点击展开"类交互点了没反应
    if (typeof enableChatScriptExecution !== 'undefined' && enableChatScriptExecution) { try { executeInjectedScripts(container); } catch (e) { console.error('执行章节列表注入脚本时出错：', e); } }
}

async function deleteChapter(idx) {
    if(!(await appConfirm('确定要删除这一章吗？'))) return;
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if(novel && novel.chapters) {
        novel.chapters.splice(idx, 1);
        novel.chapters.forEach((c, i) => c.index = i + 1);
        saveAllData();
        renderNovelChapters();
    }
}

// ===== 互动续写已独立成「续写工作台」=====
// 原本这里是寄生在小说编辑器里的"互动续写模式"（sendStoryTurn / renderStoryTurns 那一整套）。
// 它现在是左侧导航栏的一级入口，代码搬到了 js/16-story-studio.js，并且有了自己的会话列表、
// 独立设定、章节存档和楼层隐藏。旧存档里 novel.storyTurns 会在首次打开续写工作台时自动迁移过去
// （见 16 里的 migrateLegacyStoryTurns）。
//
// 下面这个开关是"一键生成模式"也在用的，所以留在这里没有一起搬走。

// "默认第二人称视角"：一改就立刻同步存档
function syncNovelSecondPerson(checked) {
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if (!novel) return;
    novel.secondPerson = checked;
    saveAllData();
}


function switchHomeTab(t) { homeTab = t; document.getElementById('tab-recommend').className = t === 'recommend' ? 'tab active' : 'tab'; document.getElementById('tab-following').className = t === 'following' ? 'tab active' : 'tab'; if(typeof renderPosts === 'function') renderPosts(); }
function clickHome() { switchMainView('home'); if(!isGenerating && myApiKey) { let c = myCharacters[Math.floor(Math.random() * myCharacters.length)]; if(c && typeof executeGeneration === 'function') { executeGeneration([c]); } } }
function switchProfileTab(t) { currentProfileTab = t; document.querySelectorAll('#view-profile .top-tabs .tab').forEach(el => el.classList.remove('active')); document.getElementById(`prof-tab-${t}`).classList.add('active'); renderProfileFeed(); }

function startChatFromProfile() {
    if (!currentProfileId || currentProfileId === 'me') return;
    switchMainView('chat');
    switchChatSession(currentProfileId);
}

function renderProfilePage(charId) {
    currentProfileId = charId; currentProfileTab = 'posts'; document.querySelectorAll('#view-profile .top-tabs .tab').forEach(el => el.classList.remove('active')); document.getElementById('prof-tab-posts').classList.add('active');
    let char = charId === 'me' ? currentUser : (charId === 'tabloid_admin' ? tabloidAccount : myCharacters.find(c => c.id == charId)); if (!char) return;
    let charPosts = charId === 'tabloid_admin' ? tabloidPosts : globalPosts.filter(p => p.char.id == charId); document.getElementById('profHeadName').innerHTML = `${char.name} ${char.verified ? verifiedSVG : ''}`; document.getElementById('profHeadPosts').innerText = `${charPosts.length} 帖子`;
    let bgStyle = char.bgImg ? `background-image:url('${char.bgImg}'); background-size:cover; background-position:center;` : `background-color:${char.themeColor || '#f0f8ff'};`;
    document.getElementById('profBanner').style.cssText = bgStyle; document.getElementById('profAvatarWrap').innerHTML = getAvatarHTML(char, 134, 'profile-avatar-large');
    let btn = document.getElementById('profFollowBtn');
    let chatBtn = document.getElementById('profChatBtn');
    if (charId === 'me') { btn.style.display = 'none'; } else { btn.style.display = 'block'; btn.className = char.isFollowing ? `follow-btn following btn-follow-${char.id}` : `follow-btn btn-follow-${char.id}`; btn.innerText = char.isFollowing ? "已关注" : "关注"; btn.onclick = (e) => { if(typeof toggleFollow === 'function') toggleFollow(char.id, e); }; }
    if (chatBtn) { chatBtn.style.display = (charId !== 'me' && charId !== 'tabloid_admin' && myCharacters.some(c => c.id == charId)) ? 'block' : 'none'; }
    const calBtn = document.getElementById('profCalendarBtn');
    if (calBtn) { calBtn.style.display = (charId !== 'me' && charId !== 'tabloid_admin' && myCharacters.some(c => c.id == charId)) ? 'block' : 'none'; }
    const highlightsTab = document.getElementById('prof-tab-highlights');
    if (highlightsTab) { highlightsTab.style.display = (charId === 'tabloid_admin') ? 'none' : 'block'; }
    document.getElementById('profName').innerHTML = `${char.name} ${char.verified ? verifiedSVG : ''} ${char.isSpecialFollow ? '<span class="special-star"><svg class="blue-line-icon" viewBox="0 0 24 24" style="width:16px;height:16px;vertical-align:middle;margin-top:-2px;"><polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"></polygon></svg></span>' : ''}`;
    document.getElementById('profHandle').innerText = char.handle; document.getElementById('profBio').innerText = char.bio || char.persona || "暂无签名";
    const locEl = document.getElementById('profLocation'); if (char.location) { locEl.style.display = 'flex'; locEl.innerHTML = `${locationSVG}<span>${char.location}</span>`; } else { locEl.style.display = 'none'; locEl.innerHTML = ''; }
    const webEl = document.getElementById('profWebsite'); if (char.website) { webEl.style.display = 'flex'; webEl.innerHTML = `${websiteSVG}<a href="#" style="color:#1d9bf0; text-decoration:none;">${char.website.replace(/^https?:\/\//, '')}</a>`; } else { webEl.style.display = 'none'; webEl.innerHTML = ''; }
    document.getElementById('profBirthdate').innerText = char.birthdate ? char.birthdate.substring(0, 4) + "年" : "未知时间";
    document.getElementById('profFollowing').innerText = char.following || 0; document.getElementById('profFollowers').innerText = char.followers || 0;
    renderProfileFeed();
}
function renderProfileFeed() {
    const container = document.getElementById('profileFeedSection'); let postsToShow = [];
    if (currentProfileId === 'tabloid_admin') { postsToShow = tabloidPosts; }
    else if (currentProfileTab === 'posts') postsToShow = globalPosts.filter(p => p.char.id == currentProfileId);
    else if (currentProfileTab === 'replies') postsToShow = globalPosts.filter(p => p.replies && p.replies.some(r => r.char.id == currentProfileId));
    else if (currentProfileTab === 'highlights') { renderMemoryAlbum(); return; }
    
    // === 核心改造：赞过 混排渲染面板 ===
    else if (currentProfileTab === 'media') {
        let items = [];
        
        // 1. 抓取该用户/角色点赞过的所有主帖子
        globalPosts.forEach(p => {
            if ((p.likedBy && p.likedBy.includes(currentProfileId)) || (currentProfileId === 'me' && p.userLiked)) {
                items.push({ type: 'post', data: p, timestamp: p.timestamp });
            }
        });
        
        // 2. 抓取该用户/角色点赞过的所有评论楼层
        globalPosts.forEach(p => {
            if (p.replies) {
                p.replies.forEach(r => {
                    if ((r.likedBy && r.likedBy.includes(currentProfileId)) || (currentProfileId === 'me' && r.liked)) {
                        items.push({ type: 'reply', data: r, postId: p.id, postText: p.text, postChar: p.char, timestamp: r.timestamp });
                    }
                });
            }
        });
        
        // 3. 混合后按时间由新到旧（倒序）排列
        items.sort((a, b) => b.timestamp - a.timestamp);
        
        if (items.length === 0) {
            container.innerHTML = `<div class="empty-state">还没有点赞过任何内容</div>`;
            return;
        }
        
        let currentProfileChar = currentProfileId === 'me' ? currentUser : (currentProfileId === 'tabloid_admin' ? tabloidAccount : myCharacters.find(c => c.id == currentProfileId));
        let profileName = currentProfileChar ? currentProfileChar.name : '该用户';

        // 4. 高级渲染视图布局
        container.innerHTML = items.map(item => {
            if (item.type === 'post') {
                return `
                <div class="liked-badge-header" style="padding: 10px 16px 0 52px; font-size: 13px; color: #536471; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                    <svg style="width:14px; height:14px; fill:#f91880;" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span>${profileName} 赞了该推文</span>
                </div>
                ` + generatePostHTML([item.data]);
            } else {
                let r = item.data;
                let rChar = r.char || (typeof getNpcIdentity === 'function' ? getNpcIdentity(r.name || '网友') : { name: r.name || '网友', handle: '@npc_user', avatarEmoji: '👤' });
                return `
                <div class="liked-comment-card" onclick="switchMainView('postDetail', '${item.postId}')" style="padding: 16px; border-bottom: 1px solid #eff3f4; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; gap: 4px;">
                    <div class="liked-badge-header" style="font-size: 13px; color: #536471; font-weight: bold; display: flex; align-items: center; gap: 4px; margin-bottom: 4px; padding-left: 40px;">
                        <svg style="width:14px; height:14px; fill:#f91880;" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        <span>${profileName} 赞了该回复</span>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <div>${getAvatarHTML(rChar, 40)}</div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 6px; font-size: 14px; color: #536471;">
                                <span style="font-weight: bold; color: #0f1419;">${rChar.name}</span>
                                <span>${rChar.handle || ''}</span>
                                <span>·</span>
                                <span>${timeAgo(item.timestamp)}</span>
                            </div>
                            <div style="font-size: 16px; color: #0f1419; margin-top: 4px; line-height: 1.5; white-space: pre-wrap; word-break: break-all;">
                                ${r.replyTo ? `<span style="color:#1d9bf0;">回复 @${r.replyTo} </span>` : ''}${formatPostText(r.text, r.charId || (r.char && r.char.id) || null)}
                            </div>
                            <div style="margin-top: 8px; font-size: 13px; color: #536471; background: rgba(0,0,0,0.03); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #cfd9de; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                                来自 @${item.postChar.name} 的推文: "${item.postText.substring(0, 45)}..."
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }
        }).join('');
        if (typeof enableChatScriptExecution !== 'undefined' && enableChatScriptExecution) { try { executeInjectedScripts(container); } catch (e) { console.error('执行"赞过"面板注入脚本时出错：', e); } }
        return;
    }
    // === 混排结束 ===

    if (postsToShow.length === 0) { 
        container.innerHTML = `<div class="empty-state">这里空空如也</div>`; 
        return; 
    }
    if(typeof generatePostHTML === 'function') {
        container.innerHTML = generatePostHTML(postsToShow);
        if (typeof enableChatScriptExecution !== 'undefined' && enableChatScriptExecution) { try { executeInjectedScripts(container); } catch (e) { console.error('执行主页资料流注入脚本时出错：', e); } }
    }
}

function renderFollowingList() {
    const container = document.getElementById('followingListContainer');
    if (!container) return; // 防御：如果这个容器元素因为其它原因暂时不存在，直接跳过而不是抛错卡住整个渲染流程
    let follows = (myCharacters || []).filter(c => c && c.isFollowing).sort((a, b) => (b.isSpecialFollow ? 1 : 0) - (a.isSpecialFollow ? 1 : 0));
    if (follows.length === 0) { container.innerHTML = `<div class=\"empty-state\">您还没有关注任何人哦。</div>`; return; }
    // 防御：单个角色数据异常（比如头像字段损坏）导致 map() 抛错时，之前会让 innerHTML 整体不更新，
    // 页面看起来就是"关注列表卡在旧数据不刷新"——改成逐条渲染，单条出错就跳过那一条，不影响其它人正常显示。
    const cardsHtml = follows.map(char => {
        try {
            return `<div class="following-card" oncontextmenu="showFollowingContextMenu(event, '${char.id}')" onclick="handleFollowingCardClick(event, '${char.id}')">${getAvatarHTML(char, 60)}<div style="font-weight:bold; font-size:15px; margin-bottom:5px;">${char.name} ${char.verified ? verifiedSVG : ''} ${char.isSpecialFollow ? '<span class="special-star"><svg class="blue-line-icon" viewBox="0 0 24 24" style="width:16px;height:16px;vertical-align:middle;margin-top:-2px;"><polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"></polygon></svg></span>' : ''}</div><div style="color:#536471; font-size:13px;">${char.handle || ''}</div>${char.group ? `<span style="display:inline-block; margin-top:4px; background:rgba(29,155,240,0.1); color:#1d9bf0; border-radius:9999px; font-size:11px; padding:1px 7px;">${char.group}</span>` : ''}</div>`;
        } catch (e) {
            console.error('渲染关注列表某一条时出错，已跳过：', char && char.id, e);
            return '';
        }
    }).join('');
    container.innerHTML = cardsHtml;
}

function renderPosts(filterTag = null) {
    const container = filterTag ? document.getElementById('tagFeedSection') : document.getElementById('feedSection');
    let postsToShow = filterTag ? globalPosts.filter(p => p.text.includes(filterTag)) : (homeTab === 'following' ? globalPosts.filter(p => p.char.id !== 'me' && myCharacters.find(c=>c.id==p.char.id)?.isFollowing) : globalPosts);
    if (postsToShow.length === 0) { container.innerHTML = `<div class="empty-state">这里空空如也...</div>`; return; }
    container.innerHTML = generatePostHTML(postsToShow);
    if (typeof enableChatScriptExecution !== 'undefined' && enableChatScriptExecution) { try { executeInjectedScripts(container); } catch (e) { console.error('执行首页信息流注入脚本时出错：', e); } }
}

// ===== "用已有内容生成小说"：从续写/日记信件/聊天/推文/评论/记忆里自选内容，AI总结改写成一章 =====

function openNovelSourceSummaryModal() {
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if (!novel) return;
    // 每次打开都清空上次的勾选，避免"以为没选，其实还带着上次残留的选择"这种误操作
    novelSourceSelection = { continuation: new Set(), diary: new Set(), chat: new Set(), tweet: new Set(), comment: new Set(), memory: new Set() };
    ['Continuation', 'Diary', 'Chat', 'Tweet', 'Comment', 'Memory'].forEach(suffix => {
        const cb = document.getElementById('srcCat' + suffix);
        if (cb) cb.checked = false;
        const list = document.getElementById('srcList' + suffix);
        if (list) { list.classList.remove('open'); list.innerHTML = ''; }
    });
    const extraEl = document.getElementById('novelSourceExtraInstruction');
    if (extraEl) extraEl.value = '';
    openModal('novelSourceSummaryModal');
}

const NOVEL_SRC_CAT_SUFFIX = { continuation: 'Continuation', diary: 'Diary', chat: 'Chat', tweet: 'Tweet', comment: 'Comment', memory: 'Memory' };

function toggleNovelSrcCategory(cat) {
    const suffix = NOVEL_SRC_CAT_SUFFIX[cat];
    const cb = document.getElementById('srcCat' + suffix);
    const list = document.getElementById('srcList' + suffix);
    if (!cb || !list) return;
    if (!cb.checked) {
        list.classList.remove('open');
        // 取消勾选这一整个分类时，把这个分类下已选的具体条目也一并清空，避免"分类没勾选，但底下条目其实还选着"的隐藏状态
        novelSourceSelection[cat] = new Set();
        return;
    }
    list.classList.add('open');
    if (list.dataset.rendered === '1') return; // 已经渲染过内容，不用每次展开都重新生成一遍
    list.dataset.rendered = '1';
    if (cat === 'continuation') renderNovelSrcListContinuation(list);
    else if (cat === 'diary') renderNovelSrcListDiary(list);
    else if (cat === 'chat') renderNovelSrcListChat(list);
    else if (cat === 'tweet') renderNovelSrcListTweet(list);
    else if (cat === 'comment') renderNovelSrcListComment(list);
    else if (cat === 'memory') renderNovelSrcListMemory(list);
}

function toggleNovelSrcItem(cat, key) {
    const set = novelSourceSelection[cat];
    if (!set) return;
    if (set.has(key)) set.delete(key); else set.add(key);
}

// 续写素材现在来自独立的「续写工作台」会话（storySessions），不再是 novel.storyTurns。
// 未存档的剧情楼层和已存档的章节都能当素材，所以两边的量一起算。
function renderNovelSrcListContinuation(container) {
    const sessions = (typeof storySessions !== 'undefined' ? storySessions : [])
        .filter(s => (s.turns && s.turns.length > 0) || (s.chapters && s.chapters.length > 0));
    if (sessions.length === 0) { container.innerHTML = '<div class="novel-src-empty">暂无续写记录（去左边"续写"里开一段）</div>'; return; }
    container.innerHTML = sessions.map(s => {
        const parts = [];
        if (s.turns && s.turns.length) parts.push(`${s.turns.length} 轮剧情`);
        if (s.chapters && s.chapters.length) parts.push(`${s.chapters.length} 章存档`);
        return `<label class="novel-src-item"><input type="checkbox" onchange="toggleNovelSrcItem('continuation','${s.id}')">《${escapeHtml(s.title || '未命名续写')}》· ${parts.join(' / ')}</label>`;
    }).join('');
}

function renderNovelSrcListDiary(container) {
    let items = [];
    (myCharacters || []).forEach(c => {
        if (!c.diaryData) return;
        (c.diaryData.diaries || []).forEach(d => items.push({ charId: c.id, charName: c.name, kind: 'diary', id: d.id, title: d.title, content: d.content, date: d.date }));
        (c.diaryData.letters || []).forEach(d => items.push({ charId: c.id, charName: c.name, kind: 'letter', id: d.id, title: d.title, content: d.content, date: d.date }));
    });
    items.sort((a, b) => (b.date || 0) - (a.date || 0));
    const truncated = items.length > 60;
    items = items.slice(0, 60);
    if (items.length === 0) { container.innerHTML = '<div class="novel-src-empty">暂无日记/信件</div>'; return; }
    container.innerHTML = items.map(it => {
        const key = `${it.charId}::${it.kind}::${it.id}`;
        const preview = (it.content || '').replace(/\n+/g, ' ').slice(0, 40);
        return `<label class="novel-src-item"><input type="checkbox" onchange="toggleNovelSrcItem('diary','${key}')">【${escapeHtml(it.charName)}】${it.kind === 'letter' ? '✉️' : '📔'} ${escapeHtml(it.title || '无标题')} - ${escapeHtml(preview)}${(it.content || '').length > 40 ? '...' : ''}</label>`;
    }).join('') + (truncated ? '<div class="novel-src-hint">仅显示最近60条，其余未显示的不会被选中</div>' : '');
}

function renderNovelSrcListChat(container) {
    const chars = (myCharacters || []).filter(c => globalChats[c.id] && globalChats[c.id].length > 0);
    if (chars.length === 0) { container.innerHTML = '<div class="novel-src-empty">暂无聊天记录</div>'; return; }
    container.innerHTML = chars.map(c => `<label class="novel-src-item"><input type="checkbox" onchange="toggleNovelSrcItem('chat','${c.id}')">💬【${escapeHtml(c.name)}】· 共 ${globalChats[c.id].length} 条消息</label>`).join('');
}

function renderNovelSrcListTweet(container) {
    const truncated = (globalPosts || []).length > 60;
    let posts = (globalPosts || []).slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 60);
    if (posts.length === 0) { container.innerHTML = '<div class="novel-src-empty">暂无推文</div>'; return; }
    container.innerHTML = posts.map(p => {
        const preview = (p.text || '').replace(/\n+/g, ' ').slice(0, 40);
        return `<label class="novel-src-item"><input type="checkbox" onchange="toggleNovelSrcItem('tweet','${p.id}')">【${escapeHtml((p.char && p.char.name) || '未知')}】${escapeHtml(preview)}${(p.text || '').length > 40 ? '...' : ''}</label>`;
    }).join('') + (truncated ? '<div class="novel-src-hint">仅显示最近60条，其余未显示的不会被选中</div>' : '');
}

function renderNovelSrcListComment(container) {
    let comments = [];
    (globalPosts || []).forEach(p => (p.replies || []).forEach(r => comments.push({ postId: p.id, replyId: r.id, name: (r.char && r.char.name) || r.name || '未知', text: r.text, timestamp: r.timestamp })));
    comments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const truncated = comments.length > 60;
    comments = comments.slice(0, 60);
    if (comments.length === 0) { container.innerHTML = '<div class="novel-src-empty">暂无评论</div>'; return; }
    container.innerHTML = comments.map(c => {
        const key = `${c.postId}::${c.replyId}`;
        const preview = (c.text || '').replace(/\n+/g, ' ').slice(0, 40);
        return `<label class="novel-src-item"><input type="checkbox" onchange="toggleNovelSrcItem('comment','${key}')">【${escapeHtml(c.name)}】${escapeHtml(preview)}${(c.text || '').length > 40 ? '...' : ''}</label>`;
    }).join('') + (truncated ? '<div class="novel-src-hint">仅显示最近60条，其余未显示的不会被选中</div>' : '');
}

function renderNovelSrcListMemory(container) {
    const chars = (myCharacters || []).filter(c => c.memorySummary && c.memorySummary.trim());
    if (chars.length === 0) { container.innerHTML = '<div class="novel-src-empty">暂无角色记忆摘要</div>'; return; }
    container.innerHTML = chars.map(c => `<label class="novel-src-item"><input type="checkbox" onchange="toggleNovelSrcItem('memory','${c.id}')">🧠【${escapeHtml(c.name)}】的记忆摘要</label>`).join('');
}

async function generateNovelFromSources() {
    const api = getApiConfig(true);
    if (!api.key) return alert("请先在设置中配置 API Key (主API或副API)！");
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if (!novel) return;

    const sel = novelSourceSelection;
    const totalSelected = sel.continuation.size + sel.diary.size + sel.chat.size + sel.tweet.size + sel.comment.size + sel.memory.size;
    if (totalSelected === 0) return appAlert('至少选一条内容，AI才有素材可以参考～');

    const sections = [];

    if (sel.continuation.size > 0) {
        let block = '';
        sel.continuation.forEach(sessionId => {
            const s = (typeof storySessions !== 'undefined' ? storySessions : []).find(x => x.id === sessionId);
            if (!s) return;
            let body = (s.chapters || []).map((c, i) => `第 ${i + 1} 章：\n${c.content}`).join('\n\n');
            const live = (s.turns || []).map(t => `${t.role === 'user' ? '用户' : '角色'}：${t.text}`).join('\n');
            if (live) body += (body ? '\n\n' : '') + live;
            if (body.trim()) block += `《${s.title || '未命名续写'}》：\n${body.trim()}\n\n`;
        });
        if (block.trim()) sections.push(`【续写内容】\n${block.trim()}`);
    }

    if (sel.diary.size > 0) {
        let block = '';
        sel.diary.forEach(key => {
            const [charId, kind, entryId] = key.split('::');
            const c = myCharacters.find(x => x.id == charId);
            if (!c || !c.diaryData) return;
            const list = kind === 'letter' ? c.diaryData.letters : c.diaryData.diaries;
            const item = (list || []).find(d => d.id === entryId);
            if (!item) return;
            block += `【${c.name}的${kind === 'letter' ? '信' : '日记'}·${item.title || '无标题'}】\n${item.content}\n\n`;
        });
        if (block.trim()) sections.push(`【日记与信件】\n${block.trim()}`);
    }

    if (sel.chat.size > 0) {
        let block = '';
        sel.chat.forEach(charId => {
            const c = myCharacters.find(x => x.id == charId);
            const msgs = globalChats[charId] || [];
            if (!c || msgs.length === 0) return;
            // 太长的聊天记录只取最近80条，避免prompt过大发不出去或者被截断
            const recent = msgs.slice(-80);
            block += `【和${c.name}的聊天】\n` + recent.map(m => `${m.sender === 'me' ? ((currentUser && currentUser.name) || '用户') : c.name}：${m.text || '[图片/表情]'}`).join('\n') + '\n\n';
        });
        if (block.trim()) sections.push(`【聊天记录】\n${block.trim()}`);
    }

    if (sel.tweet.size > 0) {
        let block = '';
        sel.tweet.forEach(postId => {
            const p = globalPosts.find(x => x.id === postId);
            if (!p) return;
            block += `【${(p.char && p.char.name) || '未知'}发的推文】${p.text}\n\n`;
        });
        if (block.trim()) sections.push(`【推文】\n${block.trim()}`);
    }

    if (sel.comment.size > 0) {
        let block = '';
        sel.comment.forEach(key => {
            const [postId, replyId] = key.split('::');
            const p = globalPosts.find(x => x.id === postId);
            const r = p && (p.replies || []).find(x => x.id === replyId);
            if (!p || !r) return;
            block += `【${(r.char && r.char.name) || r.name || '未知'}在"${(p.text || '').slice(0, 20)}..."下的评论】${r.text}\n\n`;
        });
        if (block.trim()) sections.push(`【评论】\n${block.trim()}`);
    }

    if (sel.memory.size > 0) {
        let block = '';
        sel.memory.forEach(charId => {
            const c = myCharacters.find(x => x.id == charId);
            if (!c || !c.memorySummary) return;
            block += `【${c.name}的记忆摘要】${c.memorySummary}\n\n`;
        });
        if (block.trim()) sections.push(`【角色记忆】\n${block.trim()}`);
    }

    if (sections.length === 0) return appAlert('勾选的内容好像都是空的，换一批试试～');

    const extraInstruction = (document.getElementById('novelSourceExtraInstruction').value || '').trim();
    const wordCount = document.getElementById('novelSourceWordCount').value || 1200;
    const secondPersonEl = document.getElementById('novelSecondPerson');
    const secondPerson = secondPersonEl ? secondPersonEl.checked : true;
    const title = document.getElementById('novelTitleInput').value.trim() || novel.title || '未命名故事';
    const currentChapterNum = (novel.chapters ? novel.chapters.length : 0) + 1;

    const prompt = `你是一个才华横溢的网络故事作家。下面这些是真实发生过的互动记录（可能包括聊天、推文、评论、日记信件、角色记忆、之前的互动续写剧情），请你把它们改写、揉合成一段有文采的小说正文，作为故事《${title}》的【第${currentChapterNum}章】。

${sections.join('\n\n')}

【创作要求】：
1. 不是简单罗列或复述以上内容，而是用小说笔法重新组织成完整、连贯、有画面感的叙事，可以适当补充过渡、心理描写、场景细节，但不能违背以上素材里体现出的人物性格与关系，不能凭空捏造素材里没有的重大情节。
2. 目标字数：约 ${wordCount} 字左右，描写细腻，不要过度敷衍跳跃。
3. 请直接输出正文内容，不要输出"第X章"等标题，不要输出任何寒暄、自我解释或Markdown代码块前缀。${extraInstruction ? `\n4. 用户的额外要求：${extraInstruction}` : ''}${secondPerson ? '\n5. 采用第二人称视角写作：把"你"当作故事的主角/视角人物来写，叙述和心理描写都用"你"来指代主角本人，不要用"我"的第一人称、也不要用角色名字或"他/她"的第三人称来写主角视角的内容；其他配角正常按人称描写即可，对话引号内的台词不受此限制。' : ''}`;

    const btn = document.getElementById('btnGenNovelFromSources');
    const originalText = btn.innerText;
    btn.innerText = '正在编织故事...'; btn.disabled = true;
    const genStartTime = Date.now();

    try {
        let data = await sendChatRequest(api, prompt);
        if (data.error) throw new Error(data.error.message || "请求报错");
        let text = data.choices?.[0]?.message?.content?.trim();
        if (!text) throw new Error("生成返回为空，可能是模型拒绝了这段内容，换个说法试试");
        text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
        // 思维链折叠框单独存字段、不拼进content——跟另外两种生成模式保持一致的原因见 generateNovelChapter 里的详细注释
        const { rest: textNoReasoning, reasoningHtml } = extractReasoningForNovel(text);
        text = textNoReasoning;

        tempNovelChapter = { id: 'c_' + Date.now(), index: currentChapterNum, content: text, timestamp: Date.now(), genTimeMs: Date.now() - genStartTime, reasoningHtml: reasoningHtml };
        closeModal('novelSourceSummaryModal');
        const tempArea = document.getElementById('novelTempArea'), tempContentEl = document.getElementById('novelTempContent');
        if (tempContentEl) tempContentEl.value = text;
        if (tempArea) { tempArea.style.display = 'block'; tempArea.scrollIntoView({ behavior: 'smooth' }); }
    } catch (e) {
        appAlert("生成失败：" + e.message);
    } finally {
        btn.innerText = originalText; btn.disabled = false;
    }
}
