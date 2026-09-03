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
function renderActiveDiaryTab() {
    applyDiaryTabVisibility();   // 不管从哪条路进来，按钮/标签的显示状态都得对上
    if (currentDiaryTab === 'mydiary') { if (typeof renderMyDiaryArea === 'function') renderMyDiaryArea(); } else { renderDiaryContent(); }
}
// 🐛 「✍️ 写信给TA」这个按钮找不到的原因就在这儿。
// 它在 index.html 里写死了 style="display:none"，而把它显示出来的代码**只在 switchDiaryTab 里**。
// 但从左边导航直接点进「信件与日记」是不走 switchDiaryTab 的
// （走的是 renderDiaryCharList → renderActiveDiaryTab → renderDiaryContent），
// 于是默认停在"信件"tab 上、按钮却一直是隐藏的 —— 非得手动再点一下"信件"那个标签才会冒出来。
// 现在把这段可见性逻辑单独抽出来，两条路都调一遍。
function applyDiaryTabVisibility() {
    const tab = currentDiaryTab;
    const setCls = (id, on) => { const el = document.getElementById(id); if (el) el.className = on ? 'tab active' : 'tab'; };
    setCls('diary-tab-letter', tab === 'letter');
    setCls('diary-tab-diary', tab === 'diary');
    setCls('diary-tab-mydiary', tab === 'mydiary');
    const isMyDiary = tab === 'mydiary';
    const show = (id, on, disp) => { const el = document.getElementById(id); if (el) el.style.display = on ? (disp || 'block') : 'none'; };
    show('diaryListArea', !isMyDiary);
    show('diaryActionBar', !isMyDiary);
    show('myDiaryArea', isMyDiary);
    show('diaryTempArea', false);
    // 角色头像选择条只跟"寄来的信件"/"偷看日记"这两个按角色分开看的tab有关，"我的日记"是面向多个角色的，不需要选中某一个角色
    const charListWrapper = document.getElementById('diaryCharList');
    if (charListWrapper && charListWrapper.parentElement) charListWrapper.parentElement.style.display = isMyDiary ? 'none' : 'block';
    show('btnOpenUserLetterCompose', tab === 'letter');
}
function switchDiaryTab(tab) {
    currentDiaryTab = tab;
    applyDiaryTabVisibility();
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
    let targetType = currentDiaryTab === 'letter' ? '寄给用户' + userDisplayName() + '的信' : '私密的个人日记';
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
            // author 必须带上：不带的话这封信在"回复这封信"的判断里认不出是角色写的，按钮就不显示
            tempGeneratedDiary = { id: 'd_' + Date.now(), title: parsed.title || (currentDiaryTab === 'letter' ? '新信件' : '新日记'), content: parsed.content || raw, date: Date.now(), author: 'char' };
            document.getElementById('diaryListArea').style.display = 'none'; document.getElementById('diaryTempArea').style.display = 'block';
            document.getElementById('tempDiaryTitle').innerText = tempGeneratedDiary.title;
            document.getElementById('tempDiaryContent').innerHTML = namespaceInjectedIds(formatPostText(tempGeneratedDiary.content, char.id, { statusContext: 'diary' }), tempGeneratedDiary.id);
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
    document.getElementById('diaryDetailContent').innerHTML = namespaceInjectedIds(formatPostText(item.content, char.id, { statusContext: 'diary' }), item.id);
    if (typeof enableChatScriptExecution !== 'undefined' && enableChatScriptExecution) { try { executeInjectedScripts(document.getElementById('diaryDetailContent')); } catch (e) { console.error('执行日记详情注入脚本时出错：', e); } }
    // 🆕 只有"信件"tab里、且这封是角色寄来的（不是用户自己写的），回复才有意义——展示"↩️回复这封信"按钮
    const replyBtn = document.getElementById('btnReplyToThisLetter');
    // 判断写成 !== 'user' 而不是 === 'char'：早期版本存下来的信件根本没有 author 这个字段，
    // 用 === 'char' 判的话那些老信件永远不显示回复按钮（用户反馈"找不到回信键"的另一半原因）。
    if (replyBtn) replyBtn.style.display = (currentDiaryTab === 'letter' && item.author !== 'user') ? 'inline-block' : 'none';
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
        const who = l.author === 'user' ? userDisplayName() : char.name;
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
    // 跟聊天那边用同一套清洗：剥思维链、剥 ``` 围栏。信件解析失败时正文会直接原样落地成一封信，
    // 不清洗的话思维链/代码围栏就会白纸黑字印在信里。
    raw = unwrapAiEnvelopeText(raw).trim();
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
        const userText = `请你结合上述你的核心人设、世界观背景、推文记忆总结、历史聊天总结，以及以下近期的动态、聊天记录，主动写一封寄给用户${userDisplayName()}的信（是你自己想写就写的一封信，不是在回复谁的来信）。字数${letterWordLimit}字左右。${WORD_LIMIT_PRIORITY_NOTE}要深刻体现你的性格情感。
${letterThread ? `\n【你和${userDisplayName()}之间目前为止的通信记录，供你了解已经聊过什么、避免重复或前后矛盾——不是每次都要接着信里的话题写，但要记得】：\n${letterThread}\n` : ''}
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
        // ⏰ 隔了多久才回这封信，是用户在设置里调的（最短/最长等待时间），可以是十分钟也可以是三天。
        // 提示词里不能写死一个时长、也不能什么都不说——什么都不说模型默认"刚收到就回"，
        // 于是设置里调成三天之后，角色还是写"刚收到你的信我就……"，跟界面上显示的时间对不上。
        // 这里直接把**实际过去的时间**算出来告诉它，用户怎么调都对得上。
        const elapsedSinceLetter = formatDurationZh(Math.max(0, Date.now() - (userLetter.date || Date.now())));
        const userText = `用户${userDisplayName()}给你寄来了一封信，标题是《${userLetter.title || '无题'}》，正文如下：
「${userLetter.content}」

【这封信是大约 ${elapsedSinceLetter} 前寄到你手上的】——你现在才提笔回信，中间隔了这么久。这段时间你在按自己的人设过日子，可能一直惦记着这封信、也可能忙忘了搁置到现在，由你的性格决定。不要写成"刚收到就立刻回"，也不要专门解释/道歉为什么这么晚才回（除非你的人设就是会在意这个），自然一点就好，别把时间当成播报。
${replyContextNote}
${letterThread ? `\n【你和${userDisplayName()}之间目前为止完整的通信记录，供你回忆前因后果、确保这次回信和以前说过的话保持一致，不会前后矛盾或"失忆"】：\n${letterThread}\n` : ''}
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
    // 🔌 这是**后台定时**跑的：你写一篇日记，挂上的每个角色到点都会自己去看一眼并生成反应，
    //    一篇 × 几个角色就是几次调用，以前一直没有开关，谁也不知道它在背后花钱。
    //    关掉之后日记照写、角色照挂，只是不会自动来看——章节页/日记页上的
    //    「立即回复」按钮不受影响，那是你主动点的。
    if (typeof isAutoOn === 'function' && !isAutoOn('diaryReaction')) return;
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
        // 跟回信同理：日记从写下到角色去看，隔了多久是用户在设置里调的（跟回信共用同一组时间设置），
        // 不告诉模型的话它默认"刚写完就被看到了"，跟界面上显示的时间对不上。
        const elapsedSinceDiary = formatDurationZh(Math.max(0, Date.now() - (entry.date || Date.now())));
        const timeNote = `\n【这篇日记是大约 ${elapsedSinceDiary} 前写下的】，你现在才看到/才有反应，不是刚写完就立刻被你翻开的。写批注时按这个时间差来，别写成"刚看到你写……"，也不用特意提隔了多久。\n`;
        const userText = isInvite ? `用户${userDisplayName()}把自己写的一篇日记直接拿给你看，明确邀请你阅读——这不是偷看，Ta知道你会看到全部内容，你也清楚这是Ta主动给你看的。日记标题《${entry.title || '无题'}》，正文如下：
「${entry.content}」
${timeNote}
请结合你的人设和你们之间的关系，认真读完之后给出你的批注/感想/回应（不超过${noteMaxLen}字），要紧扣日记里具体写了什么来回应，不能是一句空话或者跟内容不相关的场面话。因为是Ta主动给你看的，语气可以更直接、更坦率，不需要带偷看那种心虚或窥探感——不管是感动、心疼、吐槽、说教还是不以为然，就以你的真实反应来写。

${getFinalAnswerMarkerPromptNote()}

【极为严格的格式要求】：请仅返回合法 JSON 格式，不要用 \`\`\`json 包裹，不要有任何多余说明文字：
{"text": "这里写你的批注内容"}` : `用户${userDisplayName()}写了一篇日记，放在你能"偷看"到的地方（Ta允许你看，但这不代表Ta主动拿给你看，要不要真的凑过去翻开这篇日记，由你自己的性格和这段关系决定）。日记标题《${entry.title || '无题'}》，正文如下：
「${entry.content}」
${timeNote}
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
        // __keepReasoning：小说要把思考过程折叠成一个框给用户看，所以这条路不在响应层剥掉
        let data = await sendChatRequest(api, prompt, { __keepReasoning: true });
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
        // 💬 让参与这个故事的角色读一读这一章（开关：novelReview，默认关）
        try { runNovelReviews(novel, novel.chapters.length - 1); } catch (e) { console.warn('[故事点评] 出错：', e); }
    }
}

// ===================== 💬 角色点评这一章 =====================
// 故事一直是"生成出来给你一个人看"。参与故事的角色明明在里面演了一遍，
// 读完却什么反应都没有——下一章生成时也不知道上一章他们怎么想。
// 这里让每个被勾进这个故事的角色（不含"我"）读完这一章说几句：
//   · 带上**前面章节的梗概**，所以 TA 说的话是接着上文的，不是就事论事评一段
//   · 点评存在 chapter.reviews 里，跟着章节一起显示，也会在下一章的 prompt 里当上下文
// 🔌 开关：novelReview（默认关，不打开一次 API 都不会调）
// 💰 一章 × 参与角色数 次调用，所以还有一个"最多几个人点评"的上限（novelReviewMax，默认 3）
async function runNovelReviews(novel, chapIdx, manual) {
    if (!novel || !novel.chapters || !novel.chapters[chapIdx]) return;
    if (!manual && typeof isAutoOn === 'function' && !isAutoOn('novelReview')) return;
    const api = (typeof getApiConfig === 'function') ? getApiConfig(true) : null;
    if (!api || !api.key) return;
    const chap = novel.chapters[chapIdx];
    const max = Math.max(1, Math.min(8, parseInt(typeof novelReviewMax !== 'undefined' ? novelReviewMax : 3) || 3));
    const ids = (novel.chars || []).filter(id => id !== 'me').slice(0, max);
    if (!ids.length) return;

    // 上文：前面每一章的开头一段，够 TA 记得"故事到这儿之前发生了什么"
    const before = novel.chapters.slice(0, chapIdx).map((c, i) =>
        `第 ${i + 1} 章：${String(c.content || '').replace(/\s+/g, ' ').slice(0, 180)}…`).join('\n');
    const mine = String(chap.content || '').slice(0, 3000);
    chap.reviews = Array.isArray(chap.reviews) ? chap.reviews : [];

    for (const id of ids) {
        const c = (typeof myCharacters !== 'undefined' ? myCharacters : []).find(x => String(x.id) == String(id));
        if (!c) continue;
        if (chap.reviews.some(r => String(r.charId) === String(c.id))) continue;   // 已经点评过就不重复花钱
        try {
            const ask = `下面是《${novel.title || '这个故事'}》的第 ${chapIdx + 1} 章，你是里面的角色之一。
${before ? `【前面发生过什么】\n${before}\n` : ''}
【这一章】
${mine}

读完之后说几句你自己的话。注意：
· 你是**当事人**，不是读者也不是编辑——别评价"文笔""节奏""人物塑造"，说你在那件事里的感受、在意的点、想反驳的地方。
· 可以接着前面章节说（"上次那件事我到现在还……"）。
· 如果这一章里你根本没出场，就说你听说了这件事之后的反应。
· 60 字以内，像人说话，不要引号不要旁白。`;
            const messages = buildStructuredMessages(buildBasePrompt(c, false, ''), [], ask);
            const data = await callChatCompletionAPI(api, messages);
            let t = (data.choices?.[0]?.message?.content || '').trim().replace(/^["'“”「」]+|["'“”「」]+$/g, '');
            if (typeof stripReasoningBlocks === 'function') t = stripReasoningBlocks(t);
            if (typeof applyRegexScripts === 'function') { try { t = applyRegexScripts(t, 'ai_output', c.id); } catch (e) {} }
            if (!t) continue;
            chap.reviews.push({ charId: c.id, name: c.name, text: t.slice(0, 300), at: Date.now() });
            if (typeof saveAllData === 'function') saveAllData();
            if (typeof renderNovelChapters === 'function' && document.getElementById('novelChaptersContainer')) renderNovelChapters();
        } catch (e) { console.warn('[故事点评] ' + c.name + ' 没说成：', e); }
    }
    if (chap.reviews.length && typeof addNotification === 'function') {
        addNotification(`故事《${novel.title || '未命名'}》第 ${chapIdx + 1} 章，<b>${chap.reviews.length} 个人</b>说了点什么 💬`,
            null, null, null, chap.reviews[0].text, { view: 'novel' });
    }
}
window.gyNovelReviewNow = function (idx) {
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if (!novel) return;
    runNovelReviews(novel, idx, true);
};

function discardNovelChapter() {
    document.getElementById('novelTempArea').style.display = 'none';
    tempNovelChapter = null;
}

function renderNovelChapters() {
    // 顺手把"角色点评"那个开关现在是开是关写在旁边，并给一个直接去改的入口。
    // 不写的话最容易出的岔子是：生成完一章等半天没人说话，其实是开关根本没开。
    try {
        const hint = document.getElementById('novelReviewSwitchHint');
        if (hint) {
            const isOn = (typeof isAutoOn === 'function') ? isAutoOn('novelReview') : false;
            hint.innerHTML = isOn
                ? '· 自动点评<b style="color:#17bf63;">开着</b>　<a style="cursor:pointer;color:#1d9bf0;" onclick="gyJumpToSwitch(\'novelReview\')">去关</a>'
                : '· 自动点评<b>关着</b>（可以点每章上的「💬 让 TA 们说说」手动来一次）　<a style="cursor:pointer;color:#1d9bf0;" onclick="gyJumpToSwitch(\'novelReview\')">去开</a>';
        }
        const mx = document.getElementById('novelReviewMaxInput');
        if (mx && typeof novelReviewMax !== 'undefined') mx.value = novelReviewMax;
    } catch (e) {}
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
                <div style="display:flex;gap:6px;">
                    <button class="btn-edit-small" onclick="gyNovelReviewNow(${idx})" title="让参与这个故事的角色读完说几句（每人一次调用）">💬 让 TA 们说说</button>
                    <button class="btn-edit-small" style="color:#f91880; border-color:#f91880;" onclick="deleteChapter(${idx})">删除此章</button>
                </div>
            </div>
            <div style="font-size:15px; color:#536471; margin-bottom:10px;">生成于 ${new Date(chap.timestamp).toLocaleString()} · 共 ${chap.content.length} 字${(typeof showNovelThinkingTime !== 'undefined' && showNovelThinkingTime && chap.genTimeMs) ? ` · 🕐 耗时 ${(chap.genTimeMs / 1000).toFixed(1)}s` : ''}</div>
            <div style="font-size:15px; line-height:1.8; white-space:pre-wrap; max-height:200px; overflow-y:auto; padding-right:10px; background:#f7f9f9; padding:15px; border-radius:8px;">${chap.reasoningHtml || ''}${chap.mvuSnapshot ? renderMvuStatusBarHtml(chap.mvuSnapshot) : ''}${chap.recallHtml || ''}${namespaceInjectedIds(renderMarkdownLite(chap.content, chap.charId || fallbackCharId, novel.chapters.length - 1 - idx), chap.id || ('c_idx_' + idx))}</div>
            ${(Array.isArray(chap.reviews) && chap.reviews.length) ? `
            <div class="novel-reviews">
                <div class="novel-reviews-hd">💬 他们读完之后</div>
                ${chap.reviews.map(r => `<div class="novel-review"><b>${escapeHtml(r.name || '')}</b><span>${escapeHtml(r.text || '')}</span></div>`).join('')}
            </div>` : ''}
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
                                ${r.replyTo ? `<span style="color:#1d9bf0;">回复 @${r.replyTo} </span>` : ''}${formatPostText(r.text, r.charId || (r.char && r.char.id, { statusContext: 'comment' }) || null)}
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
            return `<div class="following-card" oncontextmenu="showFollowingContextMenu(event, '${char.id}')" onclick="handleFollowingCardClick(event, '${char.id}')">${getAvatarHTML(char, 60)}<div style="font-weight:bold; font-size:15px; margin-bottom:5px;">${char.name} ${char.verified ? verifiedSVG : ''} ${char.isSpecialFollow ? '<span class="special-star"><svg class="blue-line-icon" viewBox="0 0 24 24" style="width:16px;height:16px;vertical-align:middle;margin-top:-2px;"><polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"></polygon></svg></span>' : ''}</div><div style="color:#536471; font-size:13px;">${char.handle || ''}</div>${getCharFactions(char).map(g => `<span style="display:inline-block; margin-top:4px; margin-right:4px; background:rgba(29,155,240,0.1); color:#1d9bf0; border-radius:9999px; font-size:11px; padding:1px 7px;">${escapeHtml(g)}</span>`).join('')}</div>`;
        } catch (e) {
            console.error('渲染关注列表某一条时出错，已跳过：', char && char.id, e);
            return '';
        }
    }).join('');
    container.innerHTML = cardsHtml;
}

// ===== 右侧「你可能会喜欢」（仿 X 的推荐位）=====
// 只在个人资料页出现，挂在「有什么新鲜事」下面，不占额外宽度，页面尺寸不变。
// 挑的是**还没关注**的角色（关注完这一条就从列表里消失，跟 X 的行为一致）；
// 没关注的都关完了，就退回从全部角色里随机挑，免得这块永远空着。
// forceNew=true 是点「换一批」，会重新洗牌；否则同一次进页面保持稳定，不会每次重绘都跳来跳去。
let suggestedCharIds = [];
function pickSuggestedChars(n) {
    // 正在看谁的主页，就不要再推荐谁了（X 也是这个行为）。
    // 已关注的也照样进池子——这块现在更像"随机逛逛角色"，不只是"拉新关注"，
    // 已关注的会显示成「已关注」按钮，点一下可以取消关注。
    const pool = (myCharacters || []).filter(c => c && c.id && c.id !== 'me' && String(c.id) !== String(currentProfileId));
    // Fisher–Yates 洗牌，取前 n 个
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, n).map(c => c.id);
}
function renderSuggestedChars(forceNew) {
    const card = document.getElementById('rightPanelSuggest');
    const box = document.getElementById('suggestListContainer');
    if (!card || !box) return;
    if (forceNew || suggestedCharIds.length === 0) suggestedCharIds = pickSuggestedChars(3);
    // 只剔掉"已经不存在"和"正在看他主页"的，关注状态不再影响去留——
    // 关注完那一条会原地变成「已关注」，不会突然消失换一个人上来（那样点着很跳）
    suggestedCharIds = suggestedCharIds.filter(id => {
        const c = (myCharacters || []).find(x => x.id == id);
        return c && String(c.id) !== String(currentProfileId);
    });
    if (suggestedCharIds.length < 3) {
        pickSuggestedChars(6).forEach(id => {
            if (suggestedCharIds.length < 3 && suggestedCharIds.indexOf(id) === -1) suggestedCharIds.push(id);
        });
    }
    const list = suggestedCharIds.map(id => (myCharacters || []).find(c => c.id == id)).filter(Boolean);
    if (list.length === 0) { card.style.display = 'none'; return; }
    box.innerHTML = list.map(char => {
        try {
            const followed = !!char.isFollowing;
            return `<div class="suggest-row" onclick="switchMainView('profile', '${char.id}')">
                ${getAvatarHTML(char, 40)}
                <div class="suggest-meta">
                    <div class="suggest-name">${escapeHtml(char.name || '')}${char.verified ? verifiedSVG : ''}</div>
                    <div class="suggest-handle">${escapeHtml(char.handle || '')}</div>
                </div>
                <button class="follow-btn${followed ? ' following' : ''} btn-follow-${char.id} suggest-follow"
                        onclick="event.stopPropagation(); toggleFollow('${char.id}', event); renderSuggestedChars();">${followed ? '已关注' : '关注'}</button>
            </div>`;
        } catch (e) { console.error('渲染推荐角色某一条时出错，已跳过：', char && char.id, e); return ''; }
    }).join('');
    card.style.display = 'block';
}

// ===== 🎭 「Ta们在做什么」页面 =====
// 数据是 js/14 的小剧场引擎存下来的 globalTheaterLogs，这里只负责显示。
function renderTheaterPage(resetFilter) {
    const list = document.getElementById('theaterLogList');
    const sel = document.getElementById('theaterFilterChar');
    if (!list) return;
    const logs = (typeof globalTheaterLogs !== 'undefined' && Array.isArray(globalTheaterLogs)) ? globalTheaterLogs : [];

    // 筛选下拉：只列出真的在记录里出现过的角色，避免一长串跟这里无关的名字
    if (sel) {
        const cur = resetFilter ? '' : sel.value;
        const ids = [];
        logs.forEach(l => { [[l.charAId, l.charAName], [l.charBId, l.charBName]].forEach(([id, nm]) => {
            if (id != null && !ids.some(x => String(x[0]) === String(id))) ids.push([id, nm]);
        }); });
        sel.innerHTML = '<option value="">全部角色</option>'
            + ids.map(([id, nm]) => `<option value="${id}">${escapeHtml(nm || '未知')}</option>`).join('');
        sel.value = ids.some(x => String(x[0]) === String(cur)) ? cur : '';
    }
    // 开关关着的时候，页面顶部直接说明——比让用户点了「现在演一场」才发现要好
    let offHtml = '';
    const thOn = (typeof isAutoOn === 'function') ? isAutoOn('charTheater') : true;
    const interOn = (typeof isGlobalCharInteractionEnabled === 'function') ? isGlobalCharInteractionEnabled() : true;
    if (!thOn || !interOn) {
        offHtml = `<div class="theater-off-banner">\u26a0\ufe0f \u73b0\u5728${!thOn ? '\u300c\ud83c\udfad Ta\u4eec\u5728\u505a\u4ec0\u4e48\u300d\u5f00\u5173' : '\u300c\u89d2\u8272\u4e92\u52a8\u603b\u5f00\u5173\u300d'}\u662f\u5173\u7740\u7684\uff0c\u4e0d\u4f1a\u8c03\u7528 API\uff0c\u4e5f\u4e0d\u4f1a\u81ea\u5df1\u6f14\u3002<br>\u53bb\u300c\u8bbe\u7f6e \u2192 \ud83d\udd0c \u81ea\u52a8\u529f\u80fd\u5f00\u5173\u300d\u6253\u5f00\u5b83\u5c31\u884c\u3002</div>`;
    }
    const filter = sel ? sel.value : '';
    const shown = (filter ? logs.filter(l => String(l.charAId) === String(filter) || String(l.charBId) === String(filter)) : logs)
        .slice().sort((a, b) => (b.at || 0) - (a.at || 0));

    if (shown.length === 0) {
        list.innerHTML = offHtml + `<div class="empty-state">还没有记录。<br>小剧场需要角色之间<b>先有关系</b>才会发生——去「关系网」给两个角色连一条线，把开关打开，然后等它自己触发，或者点上面的「🎬 现在演一场」。</div>`;
        return;
    }
    // 角色各自的记忆摘要（如果已经总结过），放在最上面
    let memoHtml = '';
    if (filter) {
        const c = (myCharacters || []).find(x => String(x.id) === String(filter));
        if (c && c.theaterMemory) {
            memoHtml = `<div class="theater-memo"><div class="theater-memo-title">🧠 ${escapeHtml(c.name)} 自己记住的部分</div>
                <div>${escapeHtml(c.theaterMemory)}</div>
                <div class="theater-memo-hint">这段会跟着 TA 进聊天/发推/评论/日记信件/论坛，所以 TA 可能会主动提起。</div></div>`;
        }
    }
    list.innerHTML = offHtml + memoHtml + shown.map(l => `
        <div class="theater-card">
            <div class="theater-card-head">
                <span class="theater-who">${escapeHtml(l.charAName || '?')} <span class="theater-rel">×</span> ${escapeHtml(l.charBName || '?')}</span>
                <span class="theater-time">${new Date(l.at).toLocaleString('zh-CN', { hour12: false })}</span>
            </div>
            <div class="theater-summary">${escapeHtml(l.summary || '')}${l.relation ? `<span class="theater-rel-tag">${escapeHtml(l.relation)}</span>` : ''}</div>
            ${l.scene ? `<div class="theater-scene">${escapeHtml(l.scene)}</div>` : ''}
            <div class="theater-status">
                <span><i class="gy-dot" style="background:#1d9bf0;"></i>${escapeHtml(l.charAName || '')}：${escapeHtml(l.statusA || '')}</span>
                <span><i class="gy-dot" style="background:#f91880;"></i>${escapeHtml(l.charBName || '')}：${escapeHtml(l.statusB || '')}</span>
            </div>
        </div>`).join('');
}
async function manualRunTheater() {
    if (typeof runTheaterScene !== 'function') return;
    const btn = event && event.currentTarget;
    const old = btn ? btn.innerText : '';
    if (btn) { btn.innerText = '正在演...'; btn.disabled = true; }
    try {
        const r = await runTheaterScene(true);
        // runTheaterScene 会在被开关拦下时返回 {blocked:'...'}，这里把具体原因说清楚，
        // 不然用户点了没反应会以为是坏了，实际上是自己没开开关（这功能默认关，绝不偷偷调 API）。
        if (r && r.blocked === 'switch') {
            if (typeof appAlert === 'function') appAlert('🎭「Ta们在做什么」现在是关着的，所以不会调用 API。\n\n去「设置 → 🔌 自动功能开关」把「🎭 Ta们在做什么」打开就能演了。');
        } else if (r && r.blocked === 'interaction') {
            if (typeof appAlert === 'function') appAlert('「角色互动总开关」是关着的，角色之间不会有任何互动。\n\n去设置里把角色互动打开再试。');
        } else if (!r) {
            if (typeof appAlert === 'function') appAlert('这次没能演出来。可能是：还没给任何两个角色连过关系（去「关系网」连一条），或者 API 没配好 / 这次请求出错了。');
        }
    } finally {
        if (btn) { btn.innerText = old; btn.disabled = false; }
    }
    renderTheaterPage();
}
// 🎲 行为模式切换时的界面反馈：选了「自己决定」才露出间隔设置，
// 并且把"这会影响哪些原来的设置"直说，避免用户以为下面那堆频率还照旧生效。
function onCharActModeChange() {
    const sel = document.getElementById('charActMode');
    const row = document.getElementById('charAutonomyFreqRow');
    const hint = document.getElementById('charActModeHint');
    if (!sel) return;
    const auto = sel.value === 'auto';
    if (row) row.style.display = auto ? 'block' : 'none';
    if (hint) {
        hint.innerHTML = auto
            ? `由 TA 自己决定：每隔一段时间，TA 会看一眼现在几点、今天日程排了什么、待办上还欠着什么、前几天跟谁发生过什么、跟你聊到哪儿了，然后自己挑<b>一件</b>事去做——发推文 / 私聊你 / 写信 / 写日记 / 发论坛帖 / 发匿名帖 / 评论别人 / 点个赞 / 拍你一下 / 换个状态 / 办掉一条待办 / 记一件新的 / 去找关系网里的人 / 给营销号递料 / 什么都不做。<br>
               <b>连"隔多久做一次"也是 TA 自己定的</b>：每做完一件事，TA 会顺便决定"我大概多久之后会再想起点什么"——正忙着就隔久点，等着谁回话就隔短点，所以是忽长忽短的，不会像闹钟一样准时。下面那两个数字只是给这个随机数划个范围。<br>
               <b style="color:#e0245e;">这个模式整体默认关着</b>，还要去「设置 → 🔌 自动功能开关」把「角色自己决定要做什么」打开才会真的跑。下面那些固定频率在这个模式下不再各自到点触发。`
            : `按固定频率：到点了就发推文 / 主动找你 / 写信，各走各的时间表。`;
    }
}

// 手动让某个角色现在就自己拿一次主意（资料页/开关面板上的按钮用）
async function manualAutonomyTurn(charId) {
    const char = myCharacters.find(c => c.id == (charId != null ? charId : currentProfileId));
    if (!char) return;
    const btn = (typeof event !== 'undefined' && event) ? event.currentTarget : null;
    const old = btn ? btn.innerText : '';
    if (btn) { btn.innerText = '正在想…'; btn.disabled = true; }
    try {
        const r = await runAutonomyTurn(char, true);
        if (r && r.blocked === 'switch') {
            appAlert('「角色自己决定要做什么」现在是关着的，所以不会调用 API。\n\n去「设置 → 🔌 自动功能开关」打开它。');
        } else if (r && r.blocked === 'mode') {
            appAlert(`${char.name} 现在是「按固定频率」模式。\n\n去 TA 的编辑页里，「行为与AI能力设置 → 🎲 行为模式」改成「由 TA 自己决定」。`);
        } else if (r && r.blocked === 'api') {
            appAlert('还没配置 API Key。');
        } else if (r && r.blocked === 'busy') {
            appAlert('已经有一个角色正在拿主意了，等这一个完事再点。');
        } else if (r && r.blocked) {
            appAlert('这次没能进行：' + (r.raw ? `模型返回了看不懂的内容（${r.raw}）` : r.blocked));
        } else if (r && r.entry) {
            const e = r.entry;
            showToast(getAvatarHTML(char, 40), `${char.name} ${e.action === 'nothing' ? '想了想，没做什么' : '自己做了件事'}`,
                `${e.result || e.label}${e.reason ? ` —— ${e.reason}` : ''}`, null, null, false);
        }
    } finally {
        if (btn) { btn.innerText = old; btn.disabled = false; }
    }
    if (typeof renderTheaterPage === 'function'
        && document.getElementById('view-theater')?.style.display !== 'none') renderTheaterPage();
}

// 「Ta们在做什么」页的第二个标签：TA 自己决定做过的事
let theaterTab = 'scene';
function switchTheaterTab(tab) {
    theaterTab = tab;
    ['scene', 'auto'].forEach(t => {
        const el = document.getElementById('theaterTab-' + t);
        if (el) el.className = 'tab' + (t === tab ? ' active' : '');
    });
    const sceneBox = document.getElementById('theaterSceneBox');
    const autoBox = document.getElementById('theaterAutoBox');
    if (sceneBox) sceneBox.style.display = tab === 'scene' ? 'block' : 'none';
    if (autoBox) autoBox.style.display = tab === 'auto' ? 'block' : 'none';
    if (tab === 'auto') renderAutonomyPage();
}

const GY_AUTONOMY_ICONS = {
    post: '🐦', chat: '💬', letter: '✉️', diary: '📔', forum: '📋', anon: '🤐',
    comment: '💭', like: '❤️', nudge: '👋', status: '🔄', todo_done: '✅',
    todo_add: '📝', theater: '🎭', tabloid: '📰', nothing: '💤'
};
function renderAutonomyPage() {
    const box = document.getElementById('autonomyLogList');
    if (!box) return;
    const autoChars = (myCharacters || []).filter(c => c.actMode === 'auto');
    const on = (typeof isAutoOn === 'function') ? isAutoOn('charAutonomy') : true;

    let head = '';
    if (!on) {
        head += `<div class="theater-off-banner">⚠️ 「角色自己决定要做什么」开关是关着的，不会调用 API。<br>去「设置 → 🔌 自动功能开关」打开它。</div>`;
    }
    if (autoChars.length === 0) {
        head += `<div class="theater-off-banner" style="border-color:#ffad1f; background:rgba(255,173,31,0.07); color:#a56a00;">
            还没有任何角色切到「由 TA 自己决定」。<br>去角色编辑页 →「⚙️ 行为与AI能力设置」→「🎲 行为模式」里改。</div>`;
    } else {
        head += `<div class="autonomy-who">现在自己拿主意的：${autoChars.map(c => {
            // 下次时间是 TA 自己定的，显示出来才知道"是真没到点"而不是"坏了"
            let when = '还没定';
            if (c.nextAutonomyAt) {
                const left = c.nextAutonomyAt - Date.now();
                if (left <= 0) when = '随时';
                else if (left < 3600000) when = `约 ${Math.max(1, Math.round(left / 60000))} 分钟后`;
                else when = `约 ${(left / 3600000).toFixed(1)} 小时后`;
            }
            return `<span class="autonomy-who-chip">${escapeHtml(c.name)}
             <span class="autonomy-next">${when}</span>
             <button type="button" onclick="manualAutonomyTurn('${c.id}')">现在想一下</button></span>`;
        }).join('')}</div>`;
    }

    const all = [];
    (myCharacters || []).forEach(c => (c.autonomyLog || []).forEach(l => all.push({ ...l, charName: l.charName || c.name, _c: c })));
    all.sort((a, b) => (b.at || 0) - (a.at || 0));
    if (all.length === 0) {
        box.innerHTML = head + `<div class="empty-state">还没有记录。<br>把某个角色切到「由 TA 自己决定」、把开关打开，然后等 TA 自己动，或者点上面的「现在想一下」。</div>`;
        return;
    }
    box.innerHTML = head + all.slice(0, 120).map(l => `
        <div class="theater-card autonomy-card${l.action === 'nothing' ? ' quiet' : ''}">
            <div class="theater-card-head">
                <span class="theater-who">${GY_AUTONOMY_ICONS[l.action] || '·'} ${escapeHtml(l.charName || '?')}</span>
                <span class="theater-time">${new Date(l.at).toLocaleString('zh-CN', { hour12: false })}</span>
            </div>
            <div class="theater-summary">${escapeHtml(l.result || l.label || '')}${l.ok ? '' : `<span class="theater-rel-tag" style="background:rgba(249,24,128,0.1); color:#f91880;">没做成</span>`}</div>
            ${l.reason ? `<div class="autonomy-reason">TA 的理由：${escapeHtml(l.reason)}</div>` : ''}
            ${l.nextIn ? `<div class="autonomy-reason">做完之后 TA 自己定的下一次：约 ${l.nextIn} 分钟后</div>` : ''}
        </div>`).join('');
}
async function clearAutonomyLogs() {
    if (!(await appConfirm('清空所有「TA 自己决定」的记录？\n\n只是清掉这个列表，已经发出去的推文/消息/日记都还在。'))) return;
    (myCharacters || []).forEach(c => { c.autonomyLog = []; });
    saveAllData();
    renderAutonomyPage();
}

async function clearTheaterLogs() {
    if (typeof appConfirm === 'function' && !(await appConfirm('清空所有小剧场记录？\n\n角色已经总结进记忆里的那部分不会跟着删（那是他们"记得"的东西），只是这个列表清空。'))) return;
    globalTheaterLogs = [];
    if (typeof saveAllData === 'function') saveAllData();
    renderTheaterPage(true);
}

// ===== 🔌 自动功能开关面板 =====
// 定义在 js/01 的 AUTO_FEATURE_DEFS，这里只负责画出来 + 存开关状态。
// 开关说明里写了 **重点**，以前是 escapeHtml 完直接塞进去，页面上就露出一串星号。
// 先转义再把成对的 ** 变成 <b>，既不会被注入也能正常加粗。
function autoFeatText(s) {
    return escapeHtml(String(s || '')).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

let autoFeatFilter = 'all';        // all | on | off
function setAutoFeatFilter(v) { autoFeatFilter = v; renderAutoFeatureList(); }

// 整组一起开 / 关，省得一个一个点
function toggleAutoGroup(gkey, on) {
    (AUTO_FEATURE_DEFS || []).filter(f => f.group === gkey).forEach(f => {
        if (typeof setAutoFeature === 'function') setAutoFeature(f.key, on, true);   // true = 不逐条弹 toast
    });
    if (typeof showToast === 'function') {
        const g = (AUTO_FEATURE_GROUPS || []).find(x => x.key === gkey);
        showToast('', on ? '✅ 整组已开' : '🔌 整组已关', `${g ? g.icon + ' ' + g.title : gkey} 下面所有开关`, null, null, false);
    }
    renderAutoFeatureList();
}

function renderAutoFeatureList() {
    const box = document.getElementById('autoFeatureList');
    if (!box || typeof AUTO_FEATURE_DEFS === 'undefined') return;
    const groups = (typeof AUTO_FEATURE_GROUPS !== 'undefined') ? AUTO_FEATURE_GROUPS : [];
    const isOn = k => (typeof isAutoOn === 'function') ? isAutoOn(k) : true;

    const total = AUTO_FEATURE_DEFS.length;
    const onCount = AUTO_FEATURE_DEFS.filter(f => isOn(f.key)).length;

    const chip = (v, txt) => `<span onclick="setAutoFeatFilter('${v}')" style="cursor:pointer; user-select:none; font-size:12px; padding:5px 12px; border-radius:999px; border:1px solid ${autoFeatFilter === v ? '#1d9bf0' : '#cfd9de'}; background:${autoFeatFilter === v ? 'rgba(29,155,240,0.12)' : 'transparent'}; color:${autoFeatFilter === v ? '#1d9bf0' : '#536471'};">${txt}</span>`;

    let html = `<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
        <span style="font-size:12px; color:#8b98a5; margin-right:2px;">一共 ${total} 项，开着 <b style="color:#1d9bf0;">${onCount}</b> 项</span>
        ${chip('all', '全部')}${chip('on', '只看开着的')}${chip('off', '只看关着的')}
    </div>`;

    // 没归到任何一组的（以后新增忘了写 group 也不会凭空消失）
    const known = new Set(groups.map(g => g.key));
    const buckets = groups.map(g => ({ g, items: AUTO_FEATURE_DEFS.filter(f => f.group === g.key) }));
    const orphan = AUTO_FEATURE_DEFS.filter(f => !known.has(f.group));
    if (orphan.length) buckets.push({ g: { icon: '🔧', title: '其它', note: '' }, items: orphan });

    buckets.forEach(({ g, items }) => {
        if (!items.length) return;
        const gOn = items.filter(f => isOn(f.key)).length;
        const shown = items.filter(f => autoFeatFilter === 'all' || (autoFeatFilter === 'on') === isOn(f.key));
        if (!shown.length) return;
        html += `<div style="margin:20px 0 0;">
            <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; padding-bottom:6px; border-bottom:2px solid #1d9bf0;">
                <b style="font-size:14.5px; color:inherit;">${g.icon} ${escapeHtml(g.title)}</b>
                <span style="font-size:11.5px; color:#8b98a5;">${gOn}/${items.length} 开着</span>
                <span style="flex:1;"></span>
                ${g.key ? `<span onclick="toggleAutoGroup('${g.key}', true)" style="cursor:pointer; font-size:11.5px; color:#1d9bf0;">全开</span>
                <span onclick="toggleAutoGroup('${g.key}', false)" style="cursor:pointer; font-size:11.5px; color:#8b98a5;">全关</span>` : ''}
            </div>
            ${g.note ? `<div style="font-size:12px; color:#536471; line-height:1.7; margin:8px 0 4px;">${autoFeatText(g.note)}</div>` : ''}
        </div>`;
        html += shown.map(f => {
            const on = isOn(f.key);
            return `<label class="auto-feat-row">
                <input type="checkbox" ${on ? 'checked' : ''} onchange="setAutoFeature('${f.key}', this.checked)">
                <div class="auto-feat-body">
                    <div class="auto-feat-title">${escapeHtml(f.label)}${f.defaultOff ? '<span style="font-size:10.5px; color:#8b98a5; font-weight:normal; margin-left:6px; border:1px solid #cfd9de; border-radius:4px; padding:1px 5px;">默认关</span>' : ''}</div>
                    <div class="auto-feat-desc">${autoFeatText(f.desc)}</div>
                    ${f.where ? `<div class="auto-feat-where">📍 ${autoFeatText(f.where)}</div>` : ''}
                    <div class="auto-feat-cost">💰 ${autoFeatText(f.cost)}</div>
                </div>
            </label>`;
        }).join('');
    });

    // 指个路：还有一组开关不在这张表里（它们不调 API，所以不该混进"自动调用"列表）
    html += `<div style="margin-top:22px; padding:12px 14px; background:rgba(29,155,240,0.05); border:1px dashed #cfd9de; border-radius:8px; font-size:12px; color:#536471; line-height:1.8;">
        <b>🔗 另外还有 5 个开关不在这儿</b>——「角色知道自己资料页写了什么 / 属于哪个势力 / 写过的日记 / 今天是什么日子」和「忙碌自动回复」。
        它们<b>一次 API 都不调</b>（只是把你早就填好的内容接进 prompt），所以没放进这张"会自动花钱"的表里，
        在 <span onclick="openSettingsPanel('alive')" style="color:#1d9bf0; cursor:pointer; text-decoration:underline;">设置 → 🫀 活人感 → 🔗 补齐没接上的数据</span> 里。
    </div>`;

    box.innerHTML = html;
}
function setAutoFeature(key, on, quiet) {
    if (typeof autoFeatureSwitches === 'undefined' || !autoFeatureSwitches) autoFeatureSwitches = {};
    // 只把"关掉"记进存档，打开就是删掉这条记录——这样以后新增的自动功能默认都是开着的，
    // 不会因为存档里存着一份老的全量快照而出现"新功能莫名其妙是关着的"
    // 例外：本来就"默认关"的功能（比如小剧场），打开时必须显式存一个 true，
    // 否则删掉记录后 isAutoOn 又会退回 defaultOff，用户点了开关等于没点。
    const def = (typeof AUTO_FEATURE_DEFS !== 'undefined') ? AUTO_FEATURE_DEFS.find(f => f.key === key) : null;
    if (on) {
        if (def && def.defaultOff) autoFeatureSwitches[key] = true;
        else delete autoFeatureSwitches[key];
    } else {
        autoFeatureSwitches[key] = false;
    }
    if (typeof saveAllData === 'function') saveAllData();
    if (!quiet && typeof showToast === 'function' && def) {   // quiet：整组开关时别刷一串 toast
        showToast('', on ? '✅ 已开启' : '🔌 已关闭', `${def.label}${on ? ' 恢复自动运行' : ' 不会再自动调用 API 了'}`, null, null, false);
    }
}

// ===== 📊 Token 用量面板 =====
// 数据来自 js/01 的 recordTokenUsage（服务商真实返回的 usage）。这里只负责把它摊开给人看。
function gyFmtTok(n) {
    n = n || 0;
    if (n >= 100000000) return (n / 100000000).toFixed(2) + ' 亿';
    if (n >= 10000) return (n / 10000).toFixed(1) + ' 万';
    return String(n);
}
function showTokenStats() {
    const box = document.getElementById('tokenStatsBody');
    if (!box) return;
    const st = (typeof gyTokenStats !== 'undefined' && gyTokenStats && gyTokenStats.total) ? gyTokenStats : null;
    if (!st || !st.total.calls) {
        box.innerHTML = `<div class="empty-state">还没有记录。开始用起来之后，这里会按功能列出每一项花了多少 token。</div>`;
        openModal('tokenStatsModal');
        return;
    }
    const t = st.total;
    const sinceStr = st.since ? new Date(st.since).toLocaleString('zh-CN') : '—';
    const cachePct = t.in > 0 ? Math.round(t.cached / t.in * 100) : 0;

    const rows = Object.entries(st.byFeature)
        .map(([name, v]) => ({ name, v, sum: (v.in || 0) + (v.out || 0) }))
        .sort((a, b) => b.sum - a.sum);
    const maxSum = rows.length ? rows[0].sum : 1;
    const grand = rows.reduce((s, r) => s + r.sum, 0) || 1;

    const featureHtml = rows.map(r => {
        const pct = Math.round(r.sum / grand * 100);
        const bar = Math.max(2, Math.round(r.sum / maxSum * 100));
        const est = r.v.estimated ? `<span title="这部分是按字数估算的（服务商没返回用量）" style="color:#e0245e;">·估${r.v.estimated}</span>` : '';
        return `<div style="margin-bottom:10px;">
            <div style="display:flex; align-items:baseline; gap:8px; font-size:13px;">
                <span style="font-weight:bold; color:#0f1419; flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(r.name)}</span>
                <span style="color:#536471; flex:0 0 auto;">${r.v.calls} 次 · 入 ${gyFmtTok(r.v.in)} / 出 ${gyFmtTok(r.v.out)}${est}</span>
                <span style="color:#1d9bf0; font-weight:bold; flex:0 0 auto; width:38px; text-align:right;">${pct}%</span>
            </div>
            <div style="height:6px; background:rgba(29,155,240,0.12); border-radius:3px; margin-top:3px; overflow:hidden;">
                <div style="height:100%; width:${bar}%; background:#1d9bf0;"></div>
            </div>
            <div style="font-size:11px; color:#8b98a5; margin-top:2px;">平均每次 ${gyFmtTok(Math.round(r.sum / Math.max(1, r.v.calls)))} token</div>
        </div>`;
    }).join('');

    const days = Object.keys(st.byDay).sort().slice(-7).reverse();
    const dayHtml = days.map(d => {
        const v = st.byDay[d];
        return `<div style="display:flex; gap:10px; font-size:13px; padding:4px 0; border-bottom:1px dashed rgba(29,155,240,0.15);">
            <span style="flex:0 0 92px; color:#536471;">${d}</span>
            <span style="flex:0 0 70px; color:#536471;">${v.calls} 次</span>
            <span style="flex:1 1 auto; color:#0f1419;">入 ${gyFmtTok(v.in)} · 出 ${gyFmtTok(v.out)}</span>
        </div>`;
    }).join('') || '<div class="empty-state">暂无</div>';

    box.innerHTML = `
        <div style="background:rgba(29,155,240,0.06); border:1px solid #1d9bf0; border-radius:10px; padding:12px; margin-bottom:16px;">
            <div style="display:flex; flex-wrap:wrap; gap:14px 24px;">
                <div><div style="font-size:11px; color:#536471;">总调用</div><div style="font-size:20px; font-weight:bold; color:#1d9bf0;">${t.calls} 次</div></div>
                <div><div style="font-size:11px; color:#536471;">输入</div><div style="font-size:20px; font-weight:bold; color:#1d9bf0;">${gyFmtTok(t.in)}</div></div>
                <div><div style="font-size:11px; color:#536471;">输出</div><div style="font-size:20px; font-weight:bold; color:#1d9bf0;">${gyFmtTok(t.out)}</div></div>
                <div><div style="font-size:11px; color:#536471;">缓存命中</div><div style="font-size:20px; font-weight:bold; color:${cachePct > 0 ? '#00ba7c' : '#536471'};">${cachePct}%</div></div>
            </div>
            <div style="font-size:11px; color:#536471; margin-top:8px;">统计起点：${sinceStr}</div>
            ${cachePct === 0 ? `<div style="font-size:12px; color:#536471; margin-top:6px;">💡 缓存命中还是 0：可能是这家服务商不返回缓存字段，也可能是每次请求间隔太久（缓存一般只保留几分钟）。输入里能被缓存的那部分越大越省钱。</div>` : ''}
        </div>
        <div style="font-size:15px; font-weight:bold; color:#1d9bf0; margin-bottom:10px;">按功能</div>
        ${featureHtml}
        <div style="font-size:15px; font-weight:bold; color:#1d9bf0; margin:18px 0 6px;">最近 7 天</div>
        ${dayHtml}`;
    openModal('tokenStatsModal');
}
async function resetTokenStats() {
    if (typeof appConfirm === 'function' && !(await appConfirm('把 Token 统计清零重新开始记？已经花掉的钱不会因此退回来，只是这份记录归零。'))) return;
    gyTokenStats = { total: { calls: 0, in: 0, out: 0, cached: 0, estimated: 0 }, byFeature: {}, byDay: {}, since: Date.now() };
    if (typeof saveAllData === 'function') saveAllData();
    showTokenStats();
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
            block += `【和${c.name}的聊天】\n` + recent.map(m => `${m.sender === 'me' ? userDisplayName() : c.name}：${m.text || '[图片/表情]'}`).join('\n') + '\n\n';
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
        // 同上：小说这条路保留思维链，交给 extractReasoningForNovel 折叠展示
        let data = await sendChatRequest(api, prompt, { __keepReasoning: true });
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

// ============================================================================
// ⚙️ 设置页：索引 + 分页
// ----------------------------------------------------------------------------
// 原来整个设置页是一条几千像素的长滚动，什么都堆在一起，找一个开关要滚半天。
// 现在第一层只是目录，点一项进一张分页。
// ⚠️ 分页并没有从 DOM 里搬走，只是 display:none —— 这一点很关键：
//    saveSettings() 那类函数一口气读几十个 getElementById，元素只要还在文档里就读得到；
//    真把它们拆成独立 view 反而要改一大堆老代码，风险大得多。
// ============================================================================
const GY_SETTINGS_PANELS = {
    api:         '🌟 API 与模型',
    gen:         '🎚️ 生成参数',
    interaction: '💬 互动与描写',
    alive:       '🫀 活人感',
    auto:        '🔌 自动功能开关',
    appearance:  '🎨 外观与主题',
    notify:      '🔔 通知与云端',
    data:        '💾 数据备份与恢复'
};
let currentSettingsPanel = '';

function openSettingsPanel(key) {
    if (!GY_SETTINGS_PANELS[key]) return;
    currentSettingsPanel = key;
    const idx = document.getElementById('setIndex');
    if (idx) idx.style.display = 'none';
    document.querySelectorAll('.set-panel').forEach(p => { p.style.display = 'none'; });
    const panel = document.getElementById('setPanel-' + key);
    if (panel) panel.style.display = 'block';
    const title = document.getElementById('settingsTitle');
    if (title) title.innerText = GY_SETTINGS_PANELS[key];
    // 开关列表是空壳，进这一页才画（画一次不贵，但没必要在打开设置页时就画）
    if (key === 'auto' && typeof renderAutoFeatureList === 'function') renderAutoFeatureList();
    if (key === 'alive' && typeof renderAlivePanel === 'function') renderAlivePanel();
    // 手机顶栏中间的标题也跟着走，不然进了分页顶上还写着"系统设置"，分不清在哪一层
    const mt = document.getElementById('mtbCenterTitle');
    if (mt) mt.innerText = GY_SETTINGS_PANELS[key].replace(/^\S+\s*/, '');
    // 进分页从头看起，别继承上一页滚到一半的位置
    try {
        window.scrollTo(0, 0);
        const main = document.querySelector('.main-content');
        if (main) main.scrollTop = 0;
    } catch (e) {}
}

// 设置目录页最下面那行版本号。
// 它的用处很实在：改完代码看不到效果时，先看这里的数字对不对得上——
// 对不上就是浏览器在读缓存里的旧 js（用 file:// 打开时 Service Worker 根本不会注册，
// 只能靠 ?v= 加强制刷新），Ctrl+F5 一下就好；对得上说明代码是新的，那就是别的问题。
function renderSettingsVersion() {
    const el = document.getElementById('setVersionLine');
    if (!el) return;
    const v = (typeof GY_APP_VERSION !== 'undefined') ? GY_APP_VERSION : '未知';
    el.innerHTML = `谷雨 <b>${v}</b>　<span class="set-version-hint">看不到刚更新的功能？先看这个版本号对不对；不对就 Ctrl+F5 强制刷新一次。</span>`;
}

function closeSettingsPanel() {
    currentSettingsPanel = '';
    document.querySelectorAll('.set-panel').forEach(p => { p.style.display = 'none'; });
    const idx = document.getElementById('setIndex');
    if (idx) idx.style.display = 'block';
    renderSettingsVersion();
    const title = document.getElementById('settingsTitle');
    if (title) title.innerText = '系统设置';
    const mt = document.getElementById('mtbCenterTitle');
    if (mt) mt.innerText = '系统设置';
    try {
        window.scrollTo(0, 0);
        const main = document.querySelector('.main-content');
        if (main) main.scrollTop = 0;
    } catch (e) {}
}

// 左上角那个「←」：在分页里就退回目录，在目录里才是真的离开设置页。
// 这样手机上一路点回去的感觉跟系统设置一致，不会一下子被弹回首页。
function settingsBack() {
    if (currentSettingsPanel) closeSettingsPanel();
    else if (typeof goBackToPreviousView === 'function') goBackToPreviousView();
}

// 手机顶栏那个通用返回键：以前直接 goBackToPreviousView()，在设置分页里点一下会整页弹回上一个页面，
// 跟屏幕里那个「←」行为不一致（那个是退回目录）。统一成：设置分页里先退回目录，其余场合照旧。
function gyGlobalBack() {
    const settingsOpen = document.getElementById('view-settings')
        && document.getElementById('view-settings').style.display !== 'none';
    if (settingsOpen && typeof currentSettingsPanel !== 'undefined' && currentSettingsPanel) {
        closeSettingsPanel();
        return;
    }
    if (typeof goBackToPreviousView === 'function') goBackToPreviousView();
}

// ===================== 🫀 活人感设置页 =====================
// 三个开关本体在 AUTO_FEATURE_DEFS 里（跟别的自动功能一个待遇，也能在「自动功能开关」页里看到），
// 这一页把它们和各自的参数放在一起，免得"开关在这儿、参数在那儿"。
function aliveSwitchRow(key) {
    const def = (typeof AUTO_FEATURE_DEFS !== 'undefined') ? AUTO_FEATURE_DEFS.find(f => f.key === key) : null;
    if (!def) return '';
    const on = (typeof isAutoOn === 'function') ? isAutoOn(key) : false;
    return `<label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer; padding:12px 0;">
        <input type="checkbox" ${on ? 'checked' : ''} onchange="aliveSetSwitch('${key}', this.checked)" style="width:18px; height:18px; margin-top:2px; cursor:pointer; flex-shrink:0;">
        <span style="flex:1; min-width:0;">
          <b style="font-size:14px;">${escapeHtml(def.label)}</b>
          <div style="font-size:12px; color:#536471; line-height:1.7; margin-top:3px;">${autoFeatText(def.desc)}</div>
          ${def.where ? `<div style="font-size:11px; color:#1d9bf0; margin-top:3px; opacity:.85;">📍 ${autoFeatText(def.where)}</div>` : ''}
          <div style="font-size:11px; color:#8b98a5; margin-top:3px;">💰 ${autoFeatText(def.cost || '')}</div>
          <div style="font-size:10.5px; color:#8b98a5; margin-top:4px;">跟「设置 → 🔌 自动功能开关 → 🫀 活人感」里的<b>是同一个开关</b>，在哪儿点都一样。</div>
        </span></label>`;
}
function aliveSetSwitch(key, on) {
    if (typeof setAutoFeature === 'function') setAutoFeature(key, on);
    renderAlivePanel();
    if (typeof renderAliveBar === 'function') renderAliveBar();
}
function aliveNum(id, label, val, min, max, unit) {
    return `<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
        <span style="font-size:13px; color:#536471; min-width:120px;">${label}</span>
        <input id="${id}" type="number" min="${min}" max="${max}" value="${val}" style="width:88px; padding:6px 8px; border:1px solid #cfd9de; border-radius:6px; font-size:13px;">
        <span style="font-size:12px; color:#8b98a5;">${unit}</span></div>`;
}

function renderAlivePanel() {
    const box = document.getElementById('alivePanelBody');
    if (!box) return;
    const offOn = (typeof isAutoOn === 'function') && isAutoOn('aliveOffline');
    const moodOn = (typeof isAutoOn === 'function') && isAutoOn('aliveMood');
    const voiceOn = (typeof isAutoOn === 'function') && isAutoOn('aliveVoice');
    const fadeOn = (typeof isAutoOn === 'function') && isAutoOn('aliveFade');
    const bodyOn = (typeof isAutoOn === 'function') && isAutoOn('aliveBody');
    const sec = (t, body) => `<div style="margin-top:18px; padding:15px; background:rgba(29,155,240,0.05); border-radius:8px; border:1px solid #1d9bf0;">
        <div style="font-size:14px; font-weight:bold; color:#1d9bf0; margin-bottom:8px;">${t}</div>${body}</div>`;

    // —— 挂起中的消息 ——
    const heldKeys = Object.keys(aliveHeld || {}).filter(k => aliveHeld[k] && (aliveHeld[k].texts || []).length);
    const heldHtml = heldKeys.length ? heldKeys.map(sid => {
        const q = aliveHeld[sid];
        const c = myCharacters.find(x => x.id == q.charId);
        const left = Math.max(0, Math.round((q.until - Date.now()) / 60000));
        return `<div style="display:flex; align-items:center; gap:8px; background:white; padding:9px 10px; border-radius:6px; border:1px solid #eff3f4; margin-bottom:6px;">
            <div style="flex:1; min-width:0;">
              <div style="font-size:13px; font-weight:bold;">${q.kind === 'sleep' ? '💤' : '⏳'} ${escapeHtml(c ? c.name : '（角色已删）')}
                <span style="font-weight:normal; color:#536471;">${escapeHtml(q.why || '')}</span></div>
              <div style="font-size:12px; color:#8b98a5;">挂着 ${q.texts.length} 条，${left > 0 ? '大约 ' + (left >= 60 ? Math.round(left / 60) + ' 小时' : left + ' 分钟') + '后回你' : '马上就回'}</div>
            </div>
            <button type="button" class="btn-edit-small" onclick="aliveReplyNow('${sid}')">让 TA 现在就回</button>
        </div>`;
    }).join('') : '<div style="font-size:13px; color:#8b98a5;">现在没有挂起的消息。</div>';

    // —— 每个角色的语言指纹 ——
    const voiceRows = (myCharacters || []).map(c => {
        const vp = c.voicePrint;
        const n = (typeof aliveVoiceSamples === 'function') ? aliveVoiceSamples(c).length : 0;
        return `<div style="display:flex; align-items:center; gap:8px; background:white; padding:9px 10px; border-radius:6px; border:1px solid #eff3f4; margin-bottom:6px;">
            <div style="flex:1; min-width:0;">
              <div style="font-size:13px; font-weight:bold;">${escapeHtml(c.name)}
                <span style="font-weight:normal; color:${vp ? '#17bf63' : '#8b98a5'};">${vp ? '已有指纹' : '还没提'}</span></div>
              <div style="font-size:12px; color:#8b98a5;">TA 自己写过 ${n} 条${vp ? '　·　提取于 ' + new Date(vp.at).toLocaleDateString('zh-CN') : (n < 8 ? '（不够 8 条，提不了）' : '')}</div>
            </div>
            ${vp ? `<button type="button" class="btn-edit-small" onclick="aliveShowVoice(${c.id})">看/改</button>` : ''}
            <button type="button" class="btn-edit-small" onclick="aliveExtractVoice(${c.id})" ${n < 8 ? 'disabled style="opacity:.45;"' : ''}>${vp ? '重提' : '提取'}</button>
        </div>`;
    }).join('') || '<div style="font-size:13px; color:#8b98a5;">还没有角色。</div>';

    // —— 现在各角色的情绪 ——
    const moodRows = (myCharacters || []).map(c => {
        const v = (typeof aliveMoodValue === 'function') ? aliveMoodValue(c) : 0;
        if (!v) return '';
        const m = c.mood || {};
        return `<div style="display:flex; align-items:center; gap:8px; font-size:13px; padding:6px 0; border-bottom:1px dashed #eff3f4;">
            <b style="min-width:70px;">${escapeHtml(c.name)}</b>
            <span style="color:${v > 0 ? '#17bf63' : '#f91880'}; min-width:44px;">${v > 0 ? '+' : ''}${v.toFixed(1)}</span>
            <span style="color:#536471; flex:1; min-width:0;">${escapeHtml(m.why || '')}</span>
            <span style="color:#f91880; cursor:pointer;" onclick="aliveClearMood(${c.id})">消掉</span>
        </div>`;
    }).filter(Boolean).join('');

    box.innerHTML = `
      <div style="font-size:13px; color:#536471; line-height:1.7; padding:4px 2px 0;">
        下面这五项是让角色<b>更像个有自己生活的人</b>，不是加内容量。<b>默认全关</b>——一个都不开的话，行为跟以前完全一样。<br>
        再往下的「🔗 补齐没接上的数据」是另一回事：那几项<b>一次 API 都不调</b>，只是把你早就填好的东西接进去，所以默认是开的。
      </div>

      ${sec('💤 TA 不总是在线', aliveSwitchRow('aliveOffline') + (offOn ? `
        <div style="border-top:1px dashed #cfd9de; padding-top:12px; margin-top:6px;">
          ${aliveNum('aliveSleepStart', '几点之后算睡了', aliveSettings.sleepStart, 0, 23, '点（没日程的角色按这个；有日程的以日程为准）')}
          ${aliveNum('aliveSleepEnd', '几点算醒', aliveSettings.sleepEnd, 0, 23, '点（会随机赖床 0~40 分钟）')}
          ${aliveNum('aliveMinDelay', '忙完之后最少等', aliveSettings.minDelay, 0, 240, '分钟再回')}
          ${aliveNum('aliveMaxDelay', '最多等', aliveSettings.maxDelay, 0, 480, '分钟（在这两个数之间随机）')}
          ${aliveNum('aliveMaxHold', '最长挂多久', aliveSettings.maxHold, 1, 72, '小时（超了强制回，防止日程写错把人锁死）')}
          <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
            <span style="font-size:13px; color:#536471; min-width:120px;">急事豁免词</span>
            <input id="aliveUrgent" value="${escapeHtml(aliveSettings.urgentWords || '')}" style="flex:1; min-width:200px; padding:6px 8px; border:1px solid #cfd9de; border-radius:6px; font-size:13px;">
          </div>
          <div style="font-size:11.5px; color:#8b98a5; margin:-2px 0 10px;">消息里带上面任意一个词，就立刻把 TA 叫起来回你（半夜真有事的时候用），逗号分隔。</div>
          <button type="button" class="btn-edit-small" onclick="aliveSaveSettings()">💾 保存</button>
          <div id="aliveSaveStatus" style="font-size:12px; color:#8b98a5; margin-top:6px;"></div>
          <div style="margin-top:14px;">
            <div style="font-size:13px; font-weight:bold; margin-bottom:6px;">📥 现在挂着的消息</div>
            ${heldHtml}
          </div>
          <div style="margin-top:14px;">
            <div style="font-size:13px; font-weight:bold; margin-bottom:6px;">🔓 这几个角色永远在线（不受挂起影响）</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${(myCharacters || []).map(c => `<button type="button" class="btn-edit-small" style="${c.aliveAlwaysOn ? 'background:#1d9bf0;color:#fff;border-color:#1d9bf0;' : ''}" onclick="aliveToggleAlwaysOn(${c.id}, ${!c.aliveAlwaysOn})">${escapeHtml(c.name)}</button>`).join('') || '<span style="font-size:13px;color:#8b98a5;">还没有角色</span>'}
            </div>
          </div>
        </div>` : ''))}

      ${sec('🌡️ 情绪会留到下一轮', aliveSwitchRow('aliveMood') + (moodOn ? `
        <div style="border-top:1px dashed #cfd9de; padding-top:12px; margin-top:6px;">
          ${aliveNum('aliveHalfLife', '情绪多久淡一半', aliveSettings.moodHalfLife, 0.5, 72, '小时')}
          <button type="button" class="btn-edit-small" onclick="aliveSaveSettings()">💾 保存</button>
          <div style="margin-top:12px;">
            <div style="font-size:13px; font-weight:bold; margin-bottom:6px;">现在各角色心里还剩什么</div>
            ${moodRows || '<div style="font-size:13px; color:#8b98a5;">现在大家都挺平静的。</div>'}
          </div>
        </div>` : ''))}

      ${sec('🧠 久远的记忆会褪色', aliveSwitchRow('aliveFade') + (fadeOn ? `
        <div style="border-top:1px dashed #cfd9de; padding-top:12px; margin-top:6px;">
          ${aliveNum('aliveFadeClear', '几天之内记得清楚', aliveSettings.fadeClear, 0.5, 60, '天（这些给全文）')}
          ${aliveNum('aliveFadeBlur', '几天之内只剩大概', aliveSettings.fadeBlur, 1, 365, '天（压到 60 字，再往前只剩 26 字的印象）')}
          ${aliveNum('aliveFadeDepth', '往回翻几条总结', aliveSettings.fadeDepth, 1, 20, '条（原来固定 5 条全文；老的压过，翻到 8 条也只多一百多字）')}
          <button type="button" class="btn-edit-small" onclick="aliveSaveSettings()">💾 保存</button>
          <div style="font-size:11.5px; color:#8b98a5; margin-top:8px; line-height:1.7;">
            吵架、告白、道歉、生病这类<b>情绪重的记忆衰减慢三倍</b>——隔很久也还记得清，这跟真人一样。<br>
            没有时间戳的老总结一律按"最近"处理，不会因为升级把旧记忆一刀砍没。<br>
            <b>老实说字数：</b>会多一段"你记不清了"的说明。同样 5 条时比原来多 ~70 字，翻到 8 条多 ~160 字——不是省钱功能，是拿一点字数换"记忆有远近、而且知道自己记不清"。
          </div>
          <div style="margin-top:12px;">
            <div style="font-size:13px; font-weight:bold; margin-bottom:6px;">预览：现在注给角色的是什么样</div>
            <select id="aliveFadePick" onchange="alivePreviewFade()" style="padding:6px; border:1px solid #cfd9de; border-radius:6px; font-size:13px; max-width:200px;">
              ${(myCharacters || []).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('') || '<option value="">还没有角色</option>'}
            </select>
            <button type="button" class="btn-edit-small" onclick="alivePreviewFade()">看看</button>
            <pre id="aliveFadePreview" style="white-space:pre-wrap; word-break:break-all; font-size:12px; color:#536471; background:white; border:1px solid #eff3f4; border-radius:6px; padding:10px; margin-top:8px; max-height:240px; overflow:auto; font-family:inherit;"></pre>
          </div>
        </div>` : ''))}

      ${sec('🥱 身上的状态会累积', aliveSwitchRow('aliveBody') + (bodyOn ? `
        <div style="border-top:1px dashed #cfd9de; padding-top:12px; margin-top:6px;">
          <div style="font-size:12px; color:#536471; line-height:1.7; margin-bottom:10px;">
            全部按<b>日程</b>在本地推，一次 API 都不调。角色没有日程就推不出来——先去给 TA 生成一份日程。
            "几点睡"用的是上面「不总是在线」里那个作息设置。
          </div>
          ${(myCharacters || []).map(c => {
            const st = (typeof aliveBodyState === 'function') ? aliveBodyState(c) : [];
            return `<div style="display:flex; align-items:center; gap:8px; font-size:13px; padding:7px 0; border-bottom:1px dashed #eff3f4;">
              <b style="min-width:80px;">${escapeHtml(c.name)}</b>
              <span style="color:${st.length ? '#536471' : '#8b98a5'}; flex:1; min-width:0;">${st.length ? escapeHtml(st.map(x => x.t).join('；')) : (c.schedule && c.schedule.text ? '现在挺好的' : '还没有日程，推不出来')}</span>
            </div>`;
          }).join('') || '<div style="font-size:13px; color:#8b98a5;">还没有角色。</div>'}
        </div>` : ''))}

      ${sec('🔗 补齐没接上的数据（这一组一次 API 都不调）', `
        <div style="font-size:12px; color:#536471; line-height:1.8;">
          做了一次数据体检（给每个字段塞记号、再抓真正发出去的 prompt），发现有几样东西<b>你填了、界面上也显示、但从来没进过 prompt</b>——角色其实一直不知道。这里把它们接上了。<br>
          <span style="color:#8b98a5;">这是补洞不是加功能，所以默认都开。它们<b>不会多调一次 API</b>（只是把你早就填好的内容接进去），所以没放进「🔌 自动功能开关」那张"会自动花钱"的表里。加起来大概几十个字。</span>
        </div>
        <label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;cursor:pointer;padding:9px 0;">
          <input type="checkbox" ${aliveSettings.knowProfile !== false ? 'checked' : ''} onchange="aliveSetLink('knowProfile', this.checked)" style="width:16px;height:16px;margin-top:2px;cursor:pointer;flex-shrink:0;">
          <span><b>🪪 角色知道自己资料页上写了什么</b><br><span style="font-size:11.5px;color:#8b98a5;line-height:1.7;">简介、所在地、网站、生日——以前这四样只画在资料页上，角色被问到自己是哪儿人都答不上来。</span></span></label>
        <label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;cursor:pointer;padding:9px 0;">
          <input type="checkbox" ${aliveSettings.knowFaction !== false ? 'checked' : ''} onchange="aliveSetLink('knowFaction', this.checked)" style="width:16px;height:16px;margin-top:2px;cursor:pointer;flex-shrink:0;">
          <span><b>🏳️ 角色知道自己属于哪个势力</b><br><span style="font-size:11.5px;color:#8b98a5;line-height:1.7;">连同"同一边还有谁"。以前核心程序里<b>一条都没有</b>——除非你写进人设或世界书，否则角色不知道自己是哪派的。</span></span></label>
        <label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;cursor:pointer;padding:9px 0;">
          <input type="checkbox" ${aliveSettings.knowDiary !== false ? 'checked' : ''} onchange="aliveSetLink('knowDiary', this.checked)" style="width:16px;height:16px;margin-top:2px;cursor:pointer;flex-shrink:0;">
          <span><b>📔 角色记得自己写过的日记</b><br><span style="font-size:11.5px;color:#8b98a5;line-height:1.7;">信件一直是进 prompt 的，日记一直漏着。注入时会说明"这是私下写给自己的，别当聊天素材主动端出来"。</span></span></label>
        <label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;cursor:pointer;padding:9px 0;">
          <input type="checkbox" ${aliveSettings.useBusyReply !== false ? 'checked' : ''} onchange="aliveSetLink('useBusyReply', this.checked)" style="width:16px;height:16px;margin-top:2px;cursor:pointer;flex-shrink:0;">
          <span><b>💤 用上「忙碌自动回复」那个字段</b><br><span style="font-size:11.5px;color:#8b98a5;line-height:1.7;">
            角色资料页里那个"忙碌自动回复"输入框，<b>以前填了完全没用</b>——没有任何代码读它。现在接到上面的「TA 不总是在线」上：消息被挂起时先顶那一句（一个挂起周期只发一次），人回来的时候 prompt 里会说明"刚才只有自动回复顶着，不是你本人在说话"。留空就完全没这回事。</span></span></label>
        <label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;cursor:pointer;padding:9px 0;">
          <input type="checkbox" ${aliveSettings.knowAnniv !== false ? 'checked' : ''} onchange="aliveSetLink('knowAnniv', this.checked)" style="width:16px;height:16px;margin-top:2px;cursor:pointer;flex-shrink:0;">
          <span><b>🗓️ 角色知道今天是什么日子</b><br><span style="font-size:11.5px;color:#8b98a5;line-height:1.7;">
            你在日历里手记的纪念日（含周年）<b>一个字都没进过 prompt</b>——今天是你俩相识周年、角色也毫不知情。现在只把"今天这一天"的放进去，并且说明"要不要提看人设，别播报"。跟着总设置里的「纪念日系统」开关走。</span></span></label>
      `)}

      ${sec('✍️ 按 TA 自己的打字习惯说话', aliveSwitchRow('aliveVoice') + (voiceOn ? `
        <div style="border-top:1px dashed #cfd9de; padding-top:12px; margin-top:6px;">
          <div style="font-size:12px; color:#536471; line-height:1.7; margin-bottom:10px;">
            提取是<b>手动点的</b>，只花一次调用；提完之后每次生成都会带上，不再额外花钱。
            角色写的东西越多，提出来的指纹越准——建议聊过几十句、发过一些推文之后再提，之后想更新就点「重提」。
          </div>
          ${voiceRows}
          <div id="aliveVoiceStatus" style="font-size:12px; color:#8b98a5; margin-top:8px;"></div>
          <div id="aliveVoiceEditBox" style="display:none; margin-top:10px;">
            <textarea id="aliveVoiceEdit" rows="9" style="width:100%; box-sizing:border-box; padding:10px; border:1px solid #cfd9de; border-radius:6px; font-size:13px; font-family:inherit;"></textarea>
            <button type="button" class="btn-edit-small" style="margin-top:6px;" onclick="aliveSaveVoice(aliveVoiceEditingId)">💾 保存</button>
            <button type="button" class="btn-edit-small" style="margin-top:6px;" onclick="document.getElementById('aliveVoiceEditBox').style.display='none'">收起</button>
          </div>
        </div>` : ''))}
    `;
}
let aliveVoiceEditingId = null;
function aliveShowVoice(charId) {
    aliveVoiceEditingId = charId;
    const c = myCharacters.find(x => x.id == charId);
    const wrap = document.getElementById('aliveVoiceEditBox');
    const ta = document.getElementById('aliveVoiceEdit');
    if (!c || !wrap || !ta) return;
    ta.value = (c.voicePrint && c.voicePrint.text) || '';
    wrap.style.display = 'block';
    ta.focus();
}
function aliveClearMood(charId) {
    const c = myCharacters.find(x => x.id == charId);
    if (!c) return;
    delete c.mood;
    saveAllData();
    renderAlivePanel();
}
function aliveSaveSettings() {
    const num = (id, def, lo, hi) => {
        const el = document.getElementById(id);
        if (!el) return def;
        const v = parseFloat(el.value);
        return isNaN(v) ? def : Math.min(hi, Math.max(lo, v));
    };
    aliveSettings.sleepStart = Math.round(num('aliveSleepStart', aliveSettings.sleepStart, 0, 23));
    aliveSettings.sleepEnd = Math.round(num('aliveSleepEnd', aliveSettings.sleepEnd, 0, 23));
    aliveSettings.minDelay = num('aliveMinDelay', aliveSettings.minDelay, 0, 240);
    aliveSettings.maxDelay = Math.max(aliveSettings.minDelay, num('aliveMaxDelay', aliveSettings.maxDelay, 0, 480));
    aliveSettings.maxHold = num('aliveMaxHold', aliveSettings.maxHold, 1, 72);
    aliveSettings.moodHalfLife = num('aliveHalfLife', aliveSettings.moodHalfLife, 0.5, 72);
    aliveSettings.fadeClear = num('aliveFadeClear', aliveSettings.fadeClear, 0.5, 60);
    aliveSettings.fadeBlur = Math.max(aliveSettings.fadeClear + 1, num('aliveFadeBlur', aliveSettings.fadeBlur, 1, 365));
    aliveSettings.fadeDepth = Math.round(num('aliveFadeDepth', aliveSettings.fadeDepth, 1, 20));
    const u = document.getElementById('aliveUrgent');
    if (u) aliveSettings.urgentWords = u.value;
    saveAllData();
    const st = document.getElementById('aliveSaveStatus');
    if (st) st.innerText = '保存好了。';
    renderAlivePanel();
}

// 聊天页顶上那条"TA 这会儿不在"的提示
function renderAliveBar() {
    const bar = document.getElementById('aliveBar');
    if (!bar) return;
    const sid = (typeof currentChatSessionId !== 'undefined') ? currentChatSessionId : null;
    const q = sid ? (aliveHeld || {})[sid] : null;
    if (!q || !(q.texts || []).length || (typeof isAutoOn === 'function' && !isAutoOn('aliveOffline'))) {
        bar.style.display = 'none'; bar.innerHTML = ''; return;
    }
    const c = myCharacters.find(x => x.id == q.charId);
    const left = Math.max(0, Math.round((q.until - Date.now()) / 60000));
    const when = left <= 0 ? '马上就回' : (left >= 60 ? '大约 ' + (Math.round(left / 6) / 10) + ' 小时后回你' : '大约 ' + left + ' 分钟后回你');
    bar.style.display = 'block';
    bar.innerHTML = `<div style="display:flex; align-items:center; gap:8px; margin:6px 15px 0; padding:9px 12px; background:rgba(120,86,255,0.10); border:1px solid rgba(120,86,255,0.35); border-radius:10px;">
        <span style="font-size:16px; flex-shrink:0;">${q.kind === 'sleep' ? '💤' : '⏳'}</span>
        <span style="flex:1; min-width:0; font-size:12.5px; line-height:1.6; color:#536471;">
          <b style="color:#7856ff;">${escapeHtml(c ? c.name : 'TA')}</b> 这会儿${q.kind === 'sleep' ? '在睡觉' : '在忙'}${q.why ? '（' + escapeHtml(q.why) + '）' : ''}，
          你的 ${q.texts.length} 条消息先挂着，${when}。
        </span>
        <button type="button" class="btn-edit-small" style="flex-shrink:0;" onclick="aliveReplyNow('${sid}')">现在就回</button>
    </div>`;
}

// 记忆褪色的预览：直接把要注进 prompt 的那一段原样显示出来
function alivePreviewFade() {
    const sel = document.getElementById('aliveFadePick');
    const out = document.getElementById('aliveFadePreview');
    if (!out) return;
    const c = myCharacters.find(x => x.id == (sel && sel.value));
    if (!c) { out.innerText = '还没有角色。'; return; }
    if (!c.chatSummary) { out.innerText = `${c.name} 还没有聊天总结——聊够设定条数之后才会自动攒出来。`; return; }
    const t = (typeof aliveFadedSummaryBlock === 'function') ? aliveFadedSummaryBlock(c) : null;
    out.innerText = t || '（开关没开）';
}

// 🔗 那四个"补洞"开关：不走 AUTO_FEATURE_DEFS（那张表是"会自己调 API 的功能"，这几个不调），
//    直接存在 aliveSettings 里。
function aliveSetLink(key, on) {
    aliveSettings[key] = !!on;
    saveAllData();
    renderAlivePanel();
}

// ===================== 🧩 小功能（设置页收纳）=====================
// 背景：音乐盒、行程与天气、关系账本、八卦网、此刻、随身物、日子这些插件，
// 每一个都往「系统设置」的目录页里塞一个 .set-entry。装了七八个之后，
// 目录页上核心的 8 项和插件的 7 项混在一起，一眼看不出哪个是设置、哪个是功能。
//
// 收纳做法有两种：一是改每个插件让它们改注册到新地方（要重装 7 个插件），
// 二是**核心这边主动去认领**——目录页里凡是没标 data-core 的条目，
// 一律搬进「🧩 小功能」这一页。选了后者：老插件一行都不用改，
// 以后别人写的插件只要还按老办法塞条目，也会自动被收进来。
const GY_MINI_FEATURES = [];

// 内置功能走这个注册（插件不用管，靠下面的认领）
function registerMiniFeature(def) {
    if (!def || !def.id) return;
    const i = GY_MINI_FEATURES.findIndex(f => f.id === def.id);
    if (i >= 0) GY_MINI_FEATURES[i] = def; else GY_MINI_FEATURES.push(def);
}

// 认领来的插件条目**存在这个数组里**，不是存在页面上。
// ⚠️ 踩过的坑：一开始是直接把 DOM 搬进 #miniFeatureAdopted，结果第二次进这一页时
//    renderMiniFeaturePanel 会 innerHTML 重画，把搬进来的按钮连同容器一起清掉——
//    而它们早就从目录页里移走了，于是**永久消失**，插件功能再也点不到。
//    现在节点存在数组里（游离于文档之外也不会被回收），每次重画再挂回去。
const GY_ADOPTED_ENTRIES = [];

// 把目录页里"不是核心设置"的条目认领过来
function harvestMiniFeatureEntries() {
    try {
        const menu = document.querySelector('#setIndex .set-menu');
        if (!menu) return 0;
        let n = 0;
        menu.querySelectorAll('.set-entry').forEach(el => {
            if (el.dataset.core === '1') return;      // 核心那 13 项，留在目录页
            // js/27 已经把这几个做成正式页面并自己注册进小功能了，
            // 这里再认领一遍就会一个功能出现两次（一次是页面、一次是老弹窗）。
            if (window.GY_MINI_TAKEOVER && el.id && window.GY_MINI_TAKEOVER.has(el.id)) { el.remove(); return; }
            el.remove();                               // 从目录页摘下来
            const key = el.id || el.innerText.trim();
            if (!GY_ADOPTED_ENTRIES.some(x => (x.id || x.innerText.trim()) === key)) {
                GY_ADOPTED_ENTRIES.push(el);           // onclick 跟着节点一起带过来
                n++;
            }
        });
        mountAdoptedEntries();
        return n;
    } catch (e) { return 0; }
}

// 把认领到的节点挂回小功能页（重画之后要重新挂）
function mountAdoptedEntries() {
    const box = document.getElementById('miniFeatureAdopted');
    if (!box) return;
    GY_ADOPTED_ENTRIES.forEach(el => { if (el.parentElement !== box) box.appendChild(el); });
}

function renderMiniFeaturePanel() {
    const box = document.getElementById('miniFeatureList');
    if (!box) return;
    const rows = GY_MINI_FEATURES.map(f => `
        <button type="button" class="set-entry" onclick="gyOpenMiniFeature('${f.id}')">
            <span class="set-entry-ico">${f.icon || '🧩'}</span>
            <span class="set-entry-main"><span class="set-entry-title">${escapeHtml(f.title || f.id)}</span><span class="set-entry-desc">${escapeHtml(f.desc || '')}</span></span>
            <span class="set-entry-arrow">›</span>
        </button>`).join('');
    box.innerHTML = `
        <div style="font-size:12.5px; color:#536471; line-height:1.8; margin-bottom:14px;">
            这一页收的是<b>功能</b>，不是设置项——点进去是一个能用的东西（播放器、地图、账本、看板……），
            而不是一堆开关。内置的和你装的插件都会出现在这儿。<br>
            <span style="color:#8b98a5;">游戏不在这儿：游戏跟着聊天走，入口是聊天输入框上方那个 🎮。</span>
        </div>
        <div class="set-menu">${rows}</div>
        <div id="miniFeatureAdopted" class="set-menu" style="margin-top:0;"></div>
        <div id="miniFeatureEmpty" style="display:none; font-size:13px; color:#8b98a5; text-align:center; padding:24px 10px;">
            还没有小功能。装个插件试试，或者在「🔌 插件」页里看看已经装了什么。
        </div>`;
    mountAdoptedEntries();          // 先把以前认领过的挂回来
    harvestMiniFeatureEntries();    // 再看目录页有没有新冒出来的
    const empty = document.getElementById('miniFeatureEmpty');
    if (empty) empty.style.display = (GY_MINI_FEATURES.length + GY_ADOPTED_ENTRIES.length) === 0 ? 'block' : 'none';
}

function gyOpenMiniFeature(id) {
    const f = GY_MINI_FEATURES.find(x => x.id === id);
    if (f && typeof f.onOpen === 'function') { try { f.onOpen(); } catch (e) { console.warn('[小功能] 打开出错：', e); } }
}

// 插件是在 switchMainView 之后才把条目塞进目录页的，而且每次切页都会再塞一次。
// 所以这里盯着目录页：只要有新条目冒出来，就顺手收走。
(function watchSettingsMenu() {
    function attach() {
        const menu = document.querySelector('#setIndex .set-menu');
        if (!menu || menu.__gyMiniWatched) return;
        menu.__gyMiniWatched = true;
        try {
            // ⚠️ 以前这里有个 `if (miniFeatureAdopted 存在)` 的限制——意思是"没进过小功能页就先不收"。
            //    结果是：你不主动点进小功能，那 7 条就一直堆在设置目录页上，收纳等于没做。
            //    现在无条件收：节点先进 GY_ADOPTED_ENTRIES（游离在文档外也不会丢），
            //    等小功能页画出来时 mountAdoptedEntries 再挂回去。
            new MutationObserver(() => harvestMiniFeatureEntries()).observe(menu, { childList: true });
            harvestMiniFeatureEntries();   // 挂上观察者时先收一遍已经在里面的
        } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
    else attach();
    setTimeout(attach, 1500);
})();

// ===================== 🔗 跳到某个开关 / 某个功能 =====================
// 用在两个地方：
//  ① 「此刻」页里列出来的那些开关，点一下直接跳过去开/关
//  ② 某个功能需要先开别的开关才能用时，在它正下方给一句提醒 + 一个跳转
// 跳过去之后会把那一行高亮两秒，否则 29 个开关里你还得自己找。
function gyJumpToSwitch(key) {
    try {
        if (typeof switchMainView === 'function') switchMainView('settings');
        if (typeof openSettingsPanel === 'function') openSettingsPanel('auto');
        // 被跳转的那一项如果正好被"只看开着的/只看关着的"过滤掉了，就先切回全部
        if (typeof setAutoFeatFilter === 'function') setAutoFeatFilter('all');
        setTimeout(() => {
            const def = (typeof AUTO_FEATURE_DEFS !== 'undefined') ? AUTO_FEATURE_DEFS.find(f => f.key === key) : null;
            if (!def) return;
            const row = [...document.querySelectorAll('#autoFeatureList .auto-feat-row')]
                .find(r => r.innerText.includes(def.label));
            if (!row) return;
            row.scrollIntoView({ block: 'center', behavior: 'smooth' });
            row.classList.add('gy-flash');
            setTimeout(() => row.classList.remove('gy-flash'), 2200);
        }, 60);
    } catch (e) { console.warn('[跳转] 出错：', e); }
}

// 功能依赖提醒：某个功能得先打开别的开关才有用，就在它正下方挂一条。
// 返回一段 HTML，直接塞进面板里。已经开着的话返回空字符串——不唠叨。
function gyNeedSwitchHint(key, whatFor) {
    try {
        if (typeof isAutoOn === 'function' && isAutoOn(key)) return '';
        const def = (typeof AUTO_FEATURE_DEFS !== 'undefined') ? AUTO_FEATURE_DEFS.find(f => f.key === key) : null;
        if (!def) return '';
        return `<div class="gy-need-switch" onclick="gyJumpToSwitch('${key}')">
            ⚠️ ${escapeHtml(whatFor || '这个功能')}需要先打开「${escapeHtml(def.label)}」，现在是关着的。<b>点这里去开</b> ›
        </div>`;
    } catch (e) { return ''; }
}

// ===================== 🕸️ 日常：三合一（小剧场 / 八卦网 / 营销号）=====================
// 这三件事本来就是一条链：小剧场演了什么 → 八卦网就传什么 → 营销号跟进什么。
// 以前它们在侧边栏占三个位置，切来切去看不出是一回事。现在一个入口三个 tab。
//
// 实现上这一页只是个**壳**：真正的内容还是 #view-theater / #view-tabloid 这两块原来的
// DOM（里面的 id、事件、渲染函数一个没动），进哪个 tab 就把哪块搬进壳里。
// 八卦网本来就是个弹窗，暂时还开弹窗——它整套渲染都绑在 #gygsModal 上，
// 硬拆成页面风险太大，等"所有小功能都做成页面"那一轮一起改。
let gyGrapevineTab_ = 'theater';

function gyGrapevineTab(t) {
    gyGrapevineTab_ = t || 'theater';
    const body = document.getElementById('grapevineBody');
    if (!body) return;
    document.querySelectorAll('#grapevineTabs .gy-tab').forEach(b =>
        b.classList.toggle('on', b.dataset.tab === gyGrapevineTab_));

    // 先把两块视图都收回 .main-content（并藏起来），再把要用的那块搬进来
    const main = document.querySelector('.main-content') || document.body;
    ['view-theater', 'view-tabloid'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = 'none';
        if (el.parentElement !== main) main.appendChild(el);
    });

    if (gyGrapevineTab_ === 'gossip') {
        body.innerHTML = `<div style="padding:24px 20px;font-size:13px;color:#536471;line-height:1.9;">
            八卦网现在还是个弹窗（它整套渲染都绑在弹窗上，硬拆成页面容易出事）。<br>
            <button type="button" class="btn-edit-small" style="margin-top:10px;" onclick="if(typeof gygsOpen==='function')gygsOpen();else appAlert('八卦网还没加载好，刷新一下试试。')">🗣️ 打开八卦网</button>
        </div>`;
        return;
    }

    const id = gyGrapevineTab_ === 'tabloid' ? 'view-tabloid' : 'view-theater';
    const el = document.getElementById(id);
    if (!el) { body.innerHTML = '<div style="padding:24px;color:#8b98a5;">这一块还没加载好。</div>'; return; }
    body.innerHTML = '';
    body.appendChild(el);
    el.style.display = 'block';
    // 搬进来之后按各自原本的方式刷新一次内容
    try {
        if (id === 'view-theater') {
            if (typeof renderTheaterPage === 'function') renderTheaterPage(true);
            if (typeof switchTheaterTab === 'function') switchTheaterTab(typeof theaterTab !== 'undefined' ? theaterTab : 'scene');
        } else {
            // ⚠️ 这两个函数名别再写错了：营销号页的刷新入口是 renderTabloidCharPicker（它自己会调
            //    renderTabloidPosts），没有 renderTabloidPage 这个函数。写错了也不会报错——
            //    外面套着 typeof 判断，只是这一页永远不刷新，看起来像"内容没更新"。
            if (typeof renderTabloidCharPicker === 'function') renderTabloidCharPicker();
            else if (typeof renderTabloidPosts === 'function') renderTabloidPosts();
        }
    } catch (e) { console.warn('[日常] 刷新内容出错：', e); }
}
