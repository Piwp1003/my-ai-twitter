// ==========================================
// 修复与升级：通过 URL 批量导入表情包 (完美支持多行 + 防冲突)
// ==========================================
// 🐛 根因修复：表情包一旦被AI在帖子/评论/私聊里用过，实际图片地址会作为字符串原样直接存进
// 那一条帖子/评论/消息数据里（不是存表情包的id引用，是直接烤进去的url字符串）。之前这里
// 导入网络链接时只是把url原样存进表情库——很多来源（比如Discord CDN、各类临时图床）的链接
// 本身就带过期时间戳，短则一两天就会失效返回404。链接一过期，不仅表情库里这一张会显示失效，
// 之前所有用过它的帖子/评论/聊天记录也会全部变成加载失败的空白图（因为各自保存的都是那个
// 已经死掉的旧地址）。现在改成导入的当下就立刻把图片内容抓下来转成本地base64（效果等同于
// "本地文件上传"，永久存在本地数据里，不再依赖对方服务器持续在线）。少数图床不允许跨域抓取
// （fetch会被拦，但<img>标签展示不受此限制，所以之前感觉不出问题），这种情况下抓取会失败，
// 退回保存原始链接——至少当下还能正常显示，只是仍有链接过期后失效的风险，可以用旁边
// "检查失效链接"功能事后补救。
async function addEmoticonByUrl(evt) {
    const input = document.getElementById('emoUrlInput').value.trim();
    if (!input) return;

    // 按换行符分割，支持一次性粘贴多行
    let lines = input.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const btn = evt && evt.target ? evt.target : null;
    const btnOriginalText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ 导入中…'; }

    let addedCount = 0, convertedCount = 0, keptAsLinkCount = 0;

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        let desc = "";
        let url = line;

        // 智能匹配 "描述：http..." 或 "描述:http..." 或 "描述:data:image..." (支持冒号前后带有空格)
        const match = line.match(/^(.*?)\s*[：:]\s*(https?:\/\/.*|data:image\/.*)$/i);

        if (match) {
            desc = match[1].trim();  // 冒号前面的文字作为描述
            url = match[2].trim();   // 冒号后面的完整链接作为 URL
        } else if (line.includes('：')) {
            // 兜底处理：针对某些不带 http 前缀的特殊格式链接
            let parts = line.split('：');
            desc = parts[0].trim();
            url = parts.slice(1).join('：').trim();
        }

        let finalUrl = url;
        if (/^https?:\/\//i.test(url)) {
            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const blob = await resp.blob();
                if (!blob.type || !blob.type.startsWith('image/')) throw new Error('抓到的内容不是图片');
                const file = new File([blob], 'emo_' + index, { type: blob.type });
                const base64 = await fileToBase64(file);
                if (base64) { finalUrl = base64; convertedCount++; }
                else { keptAsLinkCount++; }
            } catch (err) {
                keptAsLinkCount++;
                console.warn('表情包转存本地失败（多半是来源服务器不允许跨域抓取），已保留原始链接：', url, err);
            }
        }

        // 核心修复：ID 中加入 index 索引，彻底防止批量导入时瞬间生成相同 ID 导致互相覆盖
        globalEmoticons.push({
            id: 'emo_' + Date.now() + '_' + index + '_' + Math.floor(Math.random() * 10000),
            url: finalUrl,
            desc: desc
        });
        addedCount++;
    }

    document.getElementById('emoUrlInput').value = '';
    renderEmoticonManagerGallery();
    saveAllData();

    if (btn) { btn.disabled = false; btn.textContent = btnOriginalText || '添加链接'; }

    // 增加一个贴心的成功提示
    if (addedCount > 0) {
        let msg = `✅ 成功导入了 ${addedCount} 个表情包`;
        if (convertedCount > 0) msg += `，其中 ${convertedCount} 个已转存为本地永久图片`;
        if (keptAsLinkCount > 0) msg += `，${keptAsLinkCount} 个因来源限制暂时只保留了原始链接（若该链接以后过期会导致对应表情失效，可用下方"检查失效链接"功能事后补救）`;
        alert(msg + '。');
    }
}

async function deleteEmoticon(idx) { if(!(await appConfirm('删除这张表情/图片？'))) return; globalEmoticons.splice(idx, 1); renderEmoticonManagerGallery(); saveAllData(); }

// ==========================================
// 🔧 修复：表情包外部链接失效后，一键找出并同步修复所有历史引用
// ==========================================
// 光把表情库里的新地址换掉是不够的：帖子/评论/私聊消息里保存的是当初生成那一刻的url字符串快照，
// 跟表情库不是实时联动的引用关系。要救回已经发出去的历史内容，必须把已经存进各处历史数据里的
// "旧地址"字符串也一起替换掉——这里深度遍历所有可能存过图片地址的数据区，把匹配到的旧url
// 原地替换成新url，返回一共修复了多少处引用，方便用户知道效果。
function deepReplaceUrl(node, oldUrl, newUrl, seen, counter) {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return; // 防止对象内部有循环引用导致死循环
    seen.add(node);
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            if (node[i] === oldUrl) { node[i] = newUrl; counter.n++; }
            else if (node[i] && typeof node[i] === 'object') deepReplaceUrl(node[i], oldUrl, newUrl, seen, counter);
        }
    } else {
        for (const key in node) {
            if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
            const val = node[key];
            if (val === oldUrl) { node[key] = newUrl; counter.n++; }
            else if (val && typeof val === 'object') deepReplaceUrl(val, oldUrl, newUrl, seen, counter);
        }
    }
}

function replaceMediaUrlEverywhere(oldUrl, newUrl) {
    if (!oldUrl || oldUrl === newUrl) return 0;
    // 覆盖所有可能存过图片地址的数据区：主页帖子（含帖子下的评论）、匿名树洞、私聊/群聊记录、
    // 小报纸、论坛帖子，以及回忆相册收藏
    const roots = [
        typeof globalPosts !== 'undefined' ? globalPosts : null,
        typeof anonPosts !== 'undefined' ? anonPosts : null,
        typeof globalChats !== 'undefined' ? globalChats : null,
        typeof groupChats !== 'undefined' ? groupChats : null,
        typeof tabloidPosts !== 'undefined' ? tabloidPosts : null,
        typeof forumThreads !== 'undefined' ? forumThreads : null,
        typeof memoryAlbum !== 'undefined' ? memoryAlbum : null,
    ];
    const seen = new Set();
    const counter = { n: 0 };
    roots.forEach(root => { if (root) deepReplaceUrl(root, oldUrl, newUrl, seen, counter); });
    return counter.n;
}

// 扫描表情库里所有"外部链接"型的表情（本地上传的都是data:base64，不受影响，跳过），
// 逐个用 Image() 实际尝试加载一次，加载失败（404/域名失效等）就判定为失效
async function scanBrokenEmoticons(evt) {
    const btn = evt && evt.target ? evt.target : document.getElementById('emoScanBtn');
    const btnOriginalText = btn ? btn.textContent : '';
    const candidates = globalEmoticons.filter(e => e.url && !e.url.startsWith('data:'));
    if (candidates.length === 0) { alert('当前表情包库里没有外部链接图片（都已是本地永久保存的），无需检查。'); return; }

    if (btn) { btn.disabled = true; }
    let checked = 0;
    const updateProgress = () => { if (btn) btn.textContent = `🔍 检查中…(${checked}/${candidates.length})`; };
    updateProgress();

    const broken = [];
    await Promise.all(candidates.map(e => new Promise(resolve => {
        const img = new Image();
        let settled = false;
        const finish = (isBroken) => {
            if (settled) return;
            settled = true;
            checked++; updateProgress();
            if (isBroken) broken.push(e);
            resolve();
        };
        const timer = setTimeout(() => finish(false), 10000); // 超时不判定为失效，避免网络慢时误伤正常图片
        img.onload = () => { clearTimeout(timer); finish(false); };
        img.onerror = () => { clearTimeout(timer); finish(true); };
        img.src = e.url;
    })));

    if (btn) { btn.disabled = false; btn.textContent = btnOriginalText || '🔍 检查失效链接'; }

    if (broken.length === 0) { alert(`✅ 检查完毕，${candidates.length} 个外部链接图片目前都能正常打开。`); return; }
    renderBrokenEmoticonReview(broken);
}

let currentBrokenEmoList = [];
let fixingEmoticonId = null;

function renderBrokenEmoticonReview(list) {
    const old = document.getElementById('brokenEmoOverlay');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'brokenEmoOverlay';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.style.zIndex = 3000;
    overlay.innerHTML = `
        <div class="modal-box" style="width: 500px; max-height: 80vh; overflow-y: auto;">
            <h2>⚠️ 发现 ${list.length} 个失效的表情包链接</h2>
            <div class="form-hint">这些图片的原始网络地址已经打不开了（比如临时图床/CDN链接过期）。已经用过这些表情包的帖子、评论、聊天记录目前也会显示成空白图片。给失效项重新上传一张图后，会自动同步替换所有已经发出去的历史引用；如果不想修，也可以直接删除，避免以后AI继续用它生成新的失效引用。</div>
            <div id="brokenEmoList" style="display:flex; flex-direction:column; gap:10px; margin:12px 0;"></div>
            <input type="file" id="emoFixFileInput" accept="image/*" style="display:none;" onchange="handleBrokenEmoticonFileChosen(event)">
            <button class="btn-cancel" onclick="document.getElementById('brokenEmoOverlay').remove()">关闭</button>
        </div>`;
    document.body.appendChild(overlay);
    renderBrokenEmoticonListItems(list);
}

function renderBrokenEmoticonListItems(list) {
    currentBrokenEmoList = list;
    const c = document.getElementById('brokenEmoList');
    if (!c) return;
    if (list.length === 0) { c.innerHTML = '<div style="color:#536471;">✅ 已全部处理完毕。</div>'; return; }
    c.innerHTML = list.map(e => `
        <div style="display:flex; align-items:center; gap:10px; border:1px solid #eff3f4; border-radius:8px; padding:8px;">
            <div style="width:44px; height:44px; flex-shrink:0; background:#f7f7f7; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:18px;">🚫</div>
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; color:#0f1419; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(e.desc || '(无描述)')}</div>
                <div style="font-size:11px; color:#536471; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(e.url)}</div>
            </div>
            <button class="btn-secondary" style="margin-top:0; flex-shrink:0; padding:6px 10px;" onclick="triggerFixBrokenEmoticon('${e.id}')">重新上传</button>
            <button class="btn-cancel" style="margin-top:0; flex-shrink:0; padding:6px 10px; color:#f4212e;" onclick="removeBrokenEmoticonEntry('${e.id}')">删除</button>
        </div>
    `).join('');
}

function triggerFixBrokenEmoticon(id) {
    fixingEmoticonId = id;
    const input = document.getElementById('emoFixFileInput');
    if (input) input.click();
}

async function handleBrokenEmoticonFileChosen(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file || !fixingEmoticonId) return;
    const id = fixingEmoticonId;
    fixingEmoticonId = null;
    const emo = globalEmoticons.find(e => e.id === id);
    if (!emo) return;

    const oldUrl = emo.url;
    const base64 = await fileToBase64(file);
    if (!base64) { alert('读取图片失败，请换一张试试。'); return; }

    const replacedCount = replaceMediaUrlEverywhere(oldUrl, base64);
    emo.url = base64;
    saveAllData();
    renderEmoticonManagerGallery();
    renderBrokenEmoticonListItems(currentBrokenEmoList.filter(e => e.id !== id));

    alert(`✅ 已替换为本地永久图片，同步修复了 ${replacedCount} 处已发出的帖子/评论/聊天记录引用。`);
}

function removeBrokenEmoticonEntry(id) {
    const idx = globalEmoticons.findIndex(e => e.id === id);
    if (idx !== -1) { globalEmoticons.splice(idx, 1); saveAllData(); renderEmoticonManagerGallery(); }
    renderBrokenEmoticonListItems(currentBrokenEmoList.filter(e => e.id !== id));
}

let emoticonPickerParentModal = null; // 修复：记录打开表情/图片选择器之前，是否有其他弹窗（如发推窗口）正开着

function openEmoticonPicker(target, param = null) {
    emoticonPickerTarget = target; emoticonPickerParam = param; const c = document.getElementById('emoticonPickerGallery');
    if(globalEmoticons.length === 0) { c.innerHTML = '<div style="grid-column:1/-1; color:#536471;">暂无表情/图片。请先从左侧菜单进入【表情】库上传。</div>'; } 
    else { c.innerHTML = globalEmoticons.map(e => `<div class="emo-item" onclick="selectEmoticon('${e.url}')"><img src="${e.url}"><div style="font-size:10px; color:#536471; text-align:center; padding:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-top:1px solid #eff3f4;">${e.desc || '无描述'}</div></div>`).join(''); }
    
    // 修复：发推窗口(postCreateModal)和表情/图片选择器都是全屏 modal-overlay，同时弹开会叠在一起，必须先关掉发推窗口才能选图。
    // 这里先把当前打开的发推窗口暂时隐藏，选完/取消后再恢复显示，而不是彻底关闭丢失已输入的内容。
    emoticonPickerParentModal = (target === 'post') ? 'postCreateModal' : null;
    if (emoticonPickerParentModal) { document.getElementById(emoticonPickerParentModal).style.display = 'none'; }
    
    openModal('emoticonPickerModal');
}

function closeEmoticonPicker() {
    closeModal('emoticonPickerModal');
    if (emoticonPickerParentModal) { document.getElementById(emoticonPickerParentModal).style.display = 'flex'; emoticonPickerParentModal = null; }
}

function selectEmoticon(url) {
    if (emoticonPickerTarget === 'post') { pendingPostAttachment = url; const pre = document.getElementById('postAttachmentPreview'); pre.innerHTML = `<img src="${url}" class="emo-preview-img"><button class="emo-clear-btn" onclick="clearAttachment('post')">×</button>`; pre.style.display = 'block'; } 
    else if (emoticonPickerTarget === 'reply') { pendingReplyAttachment = url; const pre = document.getElementById('replyAttachmentPreview'); pre.innerHTML = `<img src="${url}" class="emo-preview-img"><button class="emo-clear-btn" onclick="clearAttachment('reply')">×</button>`; pre.style.display = 'block'; } 
    else if (emoticonPickerTarget === 'inline') { pendingInlineAttachments[emoticonPickerParam] = url; const pre = document.getElementById(`inlineAttachmentPreview-${emoticonPickerParam}`); pre.innerHTML = `<img src="${url}" class="emo-preview-img"><button class="emo-clear-btn" onclick="clearAttachment('inline', '${emoticonPickerParam}')">×</button>`; pre.style.display = 'block'; } 
    else if (emoticonPickerTarget === 'chat') { pendingChatAttachment = url; const pre = document.getElementById('chatAttachmentPreview'); pre.innerHTML = `<img src="${url}" class="emo-preview-img"><button class="emo-clear-btn" onclick="clearAttachment('chat')">×</button>`; pre.style.display = 'block'; }
    closeEmoticonPicker();
}

function clearAttachment(target, param = null) {
    if (target === 'post') { 
        pendingPostAttachment = null; 
        let el = document.getElementById('postAttachmentPreview'); 
        if(el) el.style.display = 'none'; 
    }
    else if (target === 'reply') { 
        pendingReplyAttachment = null; 
        let el = document.getElementById('replyAttachmentPreview'); 
        if(el) el.style.display = 'none'; 
        let inputEl = document.getElementById('replyAttachmentInput');
        if(inputEl) inputEl.value = ''; 
    }
    else if (target === 'inline') { 
        pendingInlineAttachments[param] = null; 
        let el = document.getElementById(`inlineAttachmentPreview-${param}`); 
        if(el) el.style.display = 'none'; 
    }
    else if (target === 'chat') {
        pendingChatAttachment = null;
        let el = document.getElementById('chatAttachmentPreview');
        if(el) el.style.display = 'none';
    }
}

// 🆕 直接从相册/文件选一张图发送——不用像"添加表情/图片"按钮那样非得先去【表情】库预存过才能选。
// 选完文件立刻转base64、贴到跟"选表情"完全一样的预览框里（同一个 pending*Attachment 变量 + 同一套
// 预览/清除逻辑），发送/清除按钮什么的都不用另外处理。fileToBase64 内部已经会自动压缩大图，不用担心体积。
async function handleDirectImageUpload(inputEl, target, param = null) {
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    inputEl.value = ''; // 清空，方便连续选同一张图也能再次触发onchange
    if (!b64) return;
    if (target === 'post') { pendingPostAttachment = b64; const pre = document.getElementById('postAttachmentPreview'); pre.innerHTML = `<img src="${b64}" class="emo-preview-img"><button class="emo-clear-btn" onclick="clearAttachment('post')">×</button>`; pre.style.display = 'block'; }
    else if (target === 'reply') { pendingReplyAttachment = b64; const pre = document.getElementById('replyAttachmentPreview'); pre.innerHTML = `<img src="${b64}" class="emo-preview-img"><button class="emo-clear-btn" onclick="clearAttachment('reply')">×</button>`; pre.style.display = 'block'; }
    else if (target === 'inline') { pendingInlineAttachments[param] = b64; const pre = document.getElementById(`inlineAttachmentPreview-${param}`); pre.innerHTML = `<img src="${b64}" class="emo-preview-img"><button class="emo-clear-btn" onclick="clearAttachment('inline', '${param}')">×</button>`; pre.style.display = 'block'; }
    else if (target === 'chat') { pendingChatAttachment = b64; const pre = document.getElementById('chatAttachmentPreview'); pre.innerHTML = `<img src="${b64}" class="emo-preview-img"><button class="emo-clear-btn" onclick="clearAttachment('chat')">×</button>`; pre.style.display = 'block'; }
}

// ==========================================
// 升级：表情包智能分析与 25% 概率控制机制
// ==========================================
function getEmoticonPrompt() { 
    if (globalEmoticons.length === 0) return ''; 
    
    // 核心代码：通过前端 JS 强制进行精准的 25% 概率判定
    const isLucky = Math.random() < 0.25; 
    
    let baseList = `\n【你的表情包/图片库】：${globalEmoticons.map(e => `[ID: ${e.id}, 内涵描述: ${e.desc || '无'}]`).join(', ')}。`;
    
    if (isLucky) {
        // 如果命中 25% 的概率，赋予它使用表情包的权力，并要求宁缺毋滥
        return baseList + `\n【配图与回复规则】：请先深度分析上述表情包的内涵，结合当前情景思考你的回复话术。本次回复你被允许使用表情包。如果库中有极其符合当前语境、氛围和你人设的表情，请务必在文本的最末尾附上 [EMO:对应ID]。宁缺毋滥，若没有完美匹配的请不要强行使用！`;
    } else {
        // 如果没有命中 75% 的概率，只让它分析内涵，但严格禁止输出表情包
        return baseList + `\n【配图与回复规则】：请深度分析上述表情包的内涵，将其作为参考来辅助构思你此时的情感状态和回复话术。但注意：本次回复系统【严格禁止】你发送表情包。请专注于纯文字回复，绝对不要在文本中输出任何 [EMO:对应ID] 标记。`;
    }
}



// 核心底层 Prompt：无论生成推文、对话、还是日记，统统结合所有设定与记忆
// ===== 时间感知模块（依据用户提供的"驱逐报时鸟"规则精简而来）=====
// 每条历史消息前面打一个相对时间标记（刚刚/3分钟前/2小时前/昨天/3天前...），
// 让AI能从聊天记录本身就看出"这句话是很久以前说的还是刚刚说的"，而不是把整段记录当成同一时刻发生的事。
function formatRelativeTimeTag(ts) {
    const diffMs = Math.max(0, Date.now() - ts);
    if (diffMs < 60000) return '刚刚';
    if (diffMs < 3600000) return Math.floor(diffMs / 60000) + '分钟前';
    if (diffMs < 86400000) return Math.floor(diffMs / 3600000) + '小时前';
    const days = Math.floor(diffMs / 86400000);
    if (days === 1) return '昨天';
    if (days < 7) return days + '天前';
    return new Date(ts).toLocaleDateString('zh-CN');
}

// msgs: 已经截取好的消息数组（时间正序）；fallbackCharName: 找不到发送者角色名时的兜底显示
function buildTimeAwareHistoryText(msgs, fallbackCharName) {
    if (!msgs || msgs.length === 0) return '';
    let lines = [];
    let lastTs = null;
    msgs.forEach((m, idx) => {
        const ts = m.timestamp || Date.now();
        // 如果和上一条消息间隔超过4小时，插进一条分隔提示，让"中间跳过了一大段时间"这件事在文本里也直观可见
        if (lastTs !== null && (ts - lastTs) > 4 * 3600000) {
            lines.push(`——（中间过去了约 ${formatDurationZh(ts - lastTs)}）——`);
        }
        const tag = `[${formatRelativeTimeTag(ts)}]`;
        // 仅影响发给AI内容的正则脚本（promptOnly）在这里生效：不改动存档里的原文，只在拼进这次prompt时临时处理一下。
        // depth按酒馆的惯例算：最新一条消息是0，越往前的旧消息深度数字越大（msgs是按时间正序排列的，数组末尾才是最新）。
        const depth = msgs.length - 1 - idx;
        const textForPrompt = typeof applyPromptOnlyRegex === 'function' ? applyPromptOnlyRegex(m.text, depth) : m.text;
        if (m.sender === 'system') {
            lines.push(`${tag} ${textForPrompt}`);
        } else {
            const speaker = m.sender === 'me' ? currentUser.name : (myCharacters.find(c => c.id == m.sender)?.name || fallbackCharName || '未知');
            lines.push(`${tag} ${speaker}: ${quoteTag(m)}${textForPrompt}`);
        }
        lastTs = ts;
    });
    return lines.join('\n');
}

// 🐛🐛 修复"群里角色乱回复、记不住自己人设"——这是个存在很久的真 bug。
//
// 症状：群聊里角色会接别人的话茬、用别人的语气说话、忘记自己是谁。
//
// 原因就在下面这个函数里。以前不管群里有多少人，**每个角色说的话都被打上 role:'assistant'
// 塞进历史，而且正文里不带说话人是谁**。于是轮到角色A回复时，它看到的历史长这样：
//
//     assistant: [刚刚] 我觉得这主意不错
//     assistant: [刚刚] 你别听他的
//
// 在模型眼里，role:'assistant' 就是"**我自己**之前说过的话"。上面这两句其实是
// B 和 C 说的，但模型完全没有任何线索能分辨——它只能认为这全是自己说的。
// 结果就是：接着别人的话往下说（乱回复）、语气被别人带跑（记不住人设）。
//
// 更离谱的是，原来的代码**已经算出了说话人的名字**（下面那个 speaker 变量），
// 然后……算完就扔了，压根没拼进 content 里。
//
// 修法：群聊里给每条角色发言加上"名字："前缀，让模型能分清谁是谁；
// 并且明确告诉它哪个名字才是自己（见 05 里那段群聊身份说明）。
// 私聊只有一个角色，不存在分不清的问题，保持原样不加前缀，免得平白多出噪音。
// 引用统一写成"【引用｜X 说过：「……」】"这种明确带主语的形式。
// 原来写的是 `[回复 X: ...]`，"回复"这个词容易被理解成"我回复了X"，
// 而实际语义是"我引用了X说的话"——一字之差，模型认领错人的概率差很多。
function quoteTag(m) {
    if (!m || !m.quote || !m.quote.text) return '';
    const who = m.quote.name || '某人';
    const t = String(m.quote.text).slice(0, 120);
    return `【引用｜${who} 说过：「${t}」】`;
}

function buildTimeAwareHistoryTurns(msgs, fallbackCharName, options) {
    if (!msgs || msgs.length === 0) return [];
    const opts = options || {};
    const groupMode = !!opts.groupMode;
    let turns = [];
    let lastTs = null;
    msgs.forEach((m, idx) => {
        const ts = m.timestamp || Date.now();
        let gapPrefix = '';
        if (lastTs !== null && (ts - lastTs) > 4 * 3600000) {
            gapPrefix = `——（中间过去了约 ${formatDurationZh(ts - lastTs)}）——\n`;
        }
        const tag = `[${formatRelativeTimeTag(ts)}]`;
        // 仅影响发给AI内容的正则脚本（promptOnly）在这里生效：不改动存档里的原文，只在拼进这次prompt时临时处理一下
        const depth = msgs.length - 1 - idx;
        const textForPrompt = typeof applyPromptOnlyRegex === 'function' ? applyPromptOnlyRegex(m.text, depth) : m.text;
        if (m.sender === 'system') {
            turns.push({ role: 'assistant', content: `${gapPrefix}${tag} 【系统】${textForPrompt}` });
        } else if (m.sender === 'me') {
            // 群里用户也标上名字，跟角色发言格式一致，模型读起来才是一份完整的群聊记录
            const meName = groupMode ? `${(typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '用户'}：` : '';
            // 🐛🐛 修复"群聊里引用消息之后，所有角色都把被引用的那句当成自己说的"：
            // 用户消息带的 quote（手动点"引用回复"选中的那句）以前在这里**被整个丢掉了**——
            // 下面那行原本只拼 textForPrompt，压根没管 m.quote。
            //
            // 后果：用户引用了乙说的一句话、然后说"这句什么意思？"，AI 收到的只有
            // "这句什么意思？"，完全不知道"这句"指的是啥。它只能往上找最近的 assistant 内容来顶——
            // 而那就是它自己的上一句。于是每个角色都理解成"用户在问我刚才说的那句"，
            // 群里几个角色就会一起去解释一句根本不是自己说的话。
            //
            // 现在把引用原样带上，并且**写明是谁说的**，任何一个角色都不会再认领错。
            turns.push({ role: 'user', content: `${gapPrefix}${tag} ${meName}${quoteTag(m)}${textForPrompt}` });
        } else {
            const speaker = myCharacters.find(c => c.id == m.sender)?.name || fallbackCharName || '未知';
            // 群聊必须带说话人名字，否则模型分不清哪句是自己说的（见函数顶上的说明）
            const who = groupMode ? `${speaker}：` : '';
            turns.push({ role: 'assistant', content: `${gapPrefix}${tag} ${who}${quoteTag(m)}${textForPrompt}` });
        }
        lastTs = ts;
    });
    let merged = [];
    turns.forEach(t => {
        const last = merged[merged.length - 1];
        if (last && last.role === t.role) last.content += '\n' + t.content;
        else merged.push({ role: t.role, content: t.content });
    });
    return merged;
}

function buildStructuredMessages(systemText, historyTurns, finalUserText) {
    const messages = [{ role: 'system', content: systemText }];
    (historyTurns || []).forEach(t => messages.push(t));
    messages.push({ role: 'user', content: finalUserText });
    return messages;
}

function formatDurationZh(ms) {
    const min = Math.floor(ms / 60000);
    if (min < 1) return '不到1分钟';
    if (min < 60) return `${min}分钟`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}小时${min % 60 > 0 ? (min % 60) + '分钟' : ''}`;
    const day = Math.floor(hr / 24);
    return `${day}天${hr % 24 > 0 ? (hr % 24) + '小时' : ''}`;
}

// ===== 故事互动续写专用：自动汇总世界书（跟聊天同一套关键词触发逻辑，但支持一次传入多个角色）=====
// 跟"一键生成模式"里用户手动逐条勾选整本故事要用的世界书不一样，互动续写模式不需要手动挂载：
// 自动读取【全局世界书】+【当前参与剧情的每个角色各自挂载的专属世界书】，再按关键词雷达对照最近的剧情文本
// 触发（跟聊天里 getCharacterWorldbookText 的机制完全一致，只是这里要合并多个角色各自的专属世界书）。
// ===== 世界书匹配引擎（仿SillyTavern World Info）=====
// 共用于聊天(getCharacterWorldbookText)和互动续写(getStoryWorldbookText)两处，统一维护一份逻辑，避免各自为政。
//
// 1. 主关键词：留空＝无条件命中（原有语义完全不变）。
// 2. 次要关键词（secondaryKeywords + secondaryLogic）：可选的第二层过滤，三种模式：
//    - and_any（默认）：命中主关键词后，还需命中任意一个次要关键词才算真正触发
//    - and_all：命中主关键词后，必须命中全部次要关键词才算触发
//    - not_any：命中主关键词，但只要命中任意一个次要关键词就阻止触发（用来排除某些语境）
//    没配次要关键词的条目完全不受这层过滤影响，行为和以前一样。
function worldbookEntryMatchesText(w, text) {
    const primaryOk = (() => {
        if (!w.keywords || w.keywords.trim() === '') return true;
        const keys = w.keywords.split(/[,，]/).map(k => k.trim()).filter(Boolean);
        return keys.some(k => text.includes(k));
    })();
    if (!primaryOk) return false;

    const secKeys = (w.secondaryKeywords || '').split(/[,，]/).map(k => k.trim()).filter(Boolean);
    if (secKeys.length === 0) return true;
    const mode = w.secondaryLogic || 'and_any';
    if (mode === 'and_all') return secKeys.every(k => text.includes(k));
    if (mode === 'not_any') return !secKeys.some(k => text.includes(k));
    return secKeys.some(k => text.includes(k)); // and_any（默认）
}

// 运行时内存态（不持久化，跟酒馆一样只在当前会话周期内有意义）：记录每个"会话+世界书条目"组合最近一次的触发轮次，
// 用来支持 sticky（触发后维持N轮）/ cooldown（触发后N轮内不再重复）。key格式："sessionKey_条目id"
let worldbookTriggerState = {};

// combined: 候选世界书条目列表；text: 用来匹配关键词的文本；sessionKey: 会话标识（聊天用sessionId，互动续写用'novel_'+小说id，
// 不传则代表这次调用没有"轮次"概念——sticky/delay/cooldown/概率触发这些跟轮次绑定的机制会被静默跳过，只按纯关键词匹配，
// 保证"没session"的调用点（发推/评论/营销号等一次性生成场景）行为和以前完全一样）；turnIndex: 当前是第几轮（用于sticky/delay/cooldown判断）。
function resolveWorldbookActiveIds(combined, text, sessionKey, turnIndex) {
    const hasTurnInfo = typeof turnIndex === 'number';
    let activeIds = new Set();
    combined.forEach(w => {
        const stateKey = sessionKey ? (sessionKey + '_' + w.id) : null;
        const state = stateKey ? worldbookTriggerState[stateKey] : null;

        // sticky：上次触发后还在"维持轮次"内，直接算命中，不需要重新匹配关键词
        if (hasTurnInfo && state && w.stickyTurns > 0 && state.stickyUntil !== undefined && turnIndex <= state.stickyUntil) {
            activeIds.add(w.id);
            return;
        }
        // delay：会话轮次还没到条目要求的起始轮次，跳过
        if (hasTurnInfo && w.delayTurns > 0 && turnIndex < w.delayTurns) return;
        // cooldown：距离上次触发还没冷却完，跳过
        if (hasTurnInfo && state && w.cooldownTurns > 0 && state.lastTriggerAt !== undefined && (turnIndex - state.lastTriggerAt) < w.cooldownTurns) return;

        if (!worldbookEntryMatchesText(w, text)) return;

        // 概率触发：命中关键词后，再按设定的百分比抽一次，不足100%时不是每次都会触发
        const prob = (typeof w.probability === 'number') ? w.probability : 100;
        if (prob < 100 && Math.random() * 100 >= prob) return;

        activeIds.add(w.id);
        if (stateKey) {
            worldbookTriggerState[stateKey] = {
                lastTriggerAt: turnIndex,
                stickyUntil: (hasTurnInfo && w.stickyTurns > 0) ? turnIndex + w.stickyTurns : undefined
            };
        }
    });
    return activeIds;
}

function getStoryWorldbookText(charList, contextText = "", sessionKey = null, turnIndex = null) {
    if (!worldbooks || worldbooks.length === 0) return '';

    let globalWbs = worldbooks.filter(w => w.isGlobal && w.enabled !== false);
    let localIds = new Set();
    (charList || []).forEach(c => { if (c && c.worldbooks) c.worldbooks.forEach(id => localIds.add(id)); });
    let localWbs = worldbooks.filter(w => localIds.has(w.id) && !w.isGlobal && w.enabled !== false);

    let seen = new Set();
    let combined = [...globalWbs, ...localWbs].filter(w => { if (seen.has(w.id)) return false; seen.add(w.id); return true; }); // 去重：同一本可能被多个角色共同挂载
    if (combined.length === 0) return '';

    let activeIds = resolveWorldbookActiveIds(combined, contextText, sessionKey, turnIndex);

    for (let depth = 0; depth < 3; depth++) {
        let scanText = combined.filter(w => activeIds.has(w.id)).map(w => w.content).join('\n');
        let addedAny = false;
        combined.forEach(w => {
            if (activeIds.has(w.id) || !w.recursive) return;
            if (worldbookEntryMatchesText(w, scanText)) { activeIds.add(w.id); addedAny = true; }
        });
        if (!addedAny) break;
    }

    let activeWbs = combined.filter(w => activeIds.has(w.id));

    let finalWbs = [], byGroup = {};
    activeWbs.forEach(w => {
        const g = (w.group || '').trim();
        if (!g) { finalWbs.push(w); return; }
        const cur = byGroup[g];
        if (!cur || (w.priority ?? 0) > (cur.priority ?? 0) || ((w.priority ?? 0) === (cur.priority ?? 0) && (w.weight ?? 50) > (cur.weight ?? 50))) {
            byGroup[g] = w;
        }
    });
    finalWbs = finalWbs.concat(Object.values(byGroup));
    finalWbs.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || (b.weight ?? 50) - (a.weight ?? 50));
    if (finalWbs.length === 0) return '';

    let lines = [], usedLen = 0;
    finalWbs.forEach((w, idx) => {
        const line = `- [权重${w.weight ?? 50}] ${w.title}: ${w.content}`;
        if (idx === 0 || usedLen + line.length <= worldbookCharBudget) { lines.push(line); usedLen += line.length; }
    });
    return `【当前触发的世界观设定（请严格遵循）】：\n` + lines.join('\n') + `\n\n`;
}

// sessionId: 聊天会话id（角色id或群id）；char: 单人聊天时传入角色对象，用于状态延续；用于从聊天记录里找"上一次联系"的时间点
function getTimeAwarenessPrompt(sessionId, char) {
    const history = globalChats[sessionId] || [];
    // 本函数调用时，用户刚发的这条消息通常已经push进history了，所以真正的"上一次联系"要看倒数第二条
    const priorMsgs = history.length > 0 && history[history.length - 1].sender === 'me' ? history.slice(0, -1) : history;
    if (priorMsgs.length === 0) return ''; // 第一次开口，没有"上次"可比较，不需要时间感知

    const lastTs = priorMsgs[priorMsgs.length - 1].timestamp || Date.now();
    const now = Date.now();
    const elapsedMs = Math.max(0, now - lastTs);
    const elapsedText = formatDurationZh(elapsedMs);
    const nowStr = new Date(now).toLocaleString('zh-CN', { hour12: false });

    // 状态延续：如果之前记录过角色"上次在做什么"，把它作为这段空白期的起点告诉AI，而不是让角色凭空冒出来
    let lifeStateLine = '';
    if (char && char.lifeState && char.lifeState.activity) {
        const sinceUpdate = formatDurationZh(Math.max(0, now - (char.lifeState.updatedAt || lastTs)));
        const recentActivities = [...(char.lifeStateHistory || []), char.lifeState.activity];
        lifeStateLine = `\n- 你上一次被记录到的生活状态是："${char.lifeState.activity}"（约 ${sinceUpdate} 前记录的）。这段没有互动的时间里，你并不是静止在原地等待用户，而是从那个状态自然地继续生活、推进到现在——先在心里悄悄把这段空白接续完整，再决定要不要、以及怎样把它体现出来。⚠️最近记录过的状态依次是：${recentActivities.join(' → ')}。这一次的新状态必须比它们有实质性推进或变化，不能简单重复或在这几件事之间来回打转（比如反复说"洗澡""睡觉"却没有任何后续），要体现出时间确实在往前走。`;
    }
    if (char && char.schedule && char.schedule.text) {
        lifeStateLine += `\n- 你给自己安排的今日日程：\n${char.schedule.text}\n结合现在的真实时间，对照这份日程判断你此刻应该正处于哪个环节，让回复里透出的状态和这份日程保持一致，不要前后矛盾。`;
    }
    let anniversaryNote = '';
    if (char && char.pendingAnniversaryDays) {
        anniversaryNote = `\n- 今天是你和用户认识的第 ${char.pendingAnniversaryDays} 天，是个值得留意的日子。如果符合你的人设和当前关系状态，可以在这轮回复里很自然地提一句（不要生硬宣布、不要变成播报），也可以完全不提——取决于你的人设是否是那种会在意这种日子的角色。这一点提完之后就不用再重复。`;
        char.pendingAnniversaryDays = null; // 用完即清空，避免每轮都提
    }

    return applyMacros(`\n【时间感知与状态延续 — 仅供你内部判断，绝不能直接告诉用户或复述本段说明】：
- 现在的真实时间：${nowStr}；距离你们上一次互动，实际已经过去约 ${elapsedText}。${lifeStateLine}${anniversaryNote}
- 你要自己判断：以你的人设、细腻程度和当前关系阶段，面对这段间隔，你内心真实的反应是什么（也可能完全没反应）——这取决于人设本身，不是间隔长短决定的。冷淡疏离的角色对很长的间隔可能毫无反应；敏感粘人的角色哪怕间隔很短也可能有小情绪，两者都对。
- 绝对不能：主动追问用户这段时间在干嘛、报时间点或播报"已经过了几小时/现在几点"、把等待和被冷落当成抱怨阴阳怪气的素材、每次上线都套"你终于来了/你可算来了"这种老套开场（除非剧情确实支持）。
- 如果人设信息不足以支撑判断，默认"淡化处理"：不主动提这件事，正常接话即可；沉默好过报时。
- 即使确实要体现时间流逝，也只能借助你此刻正在做/刚做完的事情、状态，或很自然的一句话侧面带出，全程最多出现一次，不能是提问或播报语气。
- 这段间隔里你并不是静止等待用户，而是按人设过着自己的生活；回复时可以自然带入"我刚……"作为切入点，但不必每次都这样做。
- 额外任务（不外显）：请在返回的 JSON 里加一个 "stateUpdate" 字段，写一句20字以内的话，描述"回复完这轮之后你大概会去做什么/处于什么状态"，仅用于系统内部记录、给你自己下一次的状态延续做参考，绝不会展示给用户，所以不需要考虑对话自然度，纯粹是内部备忘。${char && char.lifeState && char.lifeState.activity ? `这次填的内容不能和最近记录过的这几条重复或雷同：${[...(char.lifeStateHistory || []), char.lifeState.activity].join('、')}，要体现出实际推进，不能在几件事之间循环打转。` : ''}${statusTypes.length > 0 ? `再加一个 "statusTypeLabel" 字段，从这些标签里选一个最贴近你此刻状态的：[${statusTypes.map(t => t.label).join('、')}]，如果都不太贴切就留空字符串。` : ''}`, char);
}

// ===== 真人聊天感模块（已按要求移除，保留空函数避免调用处报错）=====
function getChatNaturalnessPrompt() {
    return '';
}



function saveCharLifeState(char, stateUpdate, statusTypeLabel) {
    if (!char || !stateUpdate || typeof stateUpdate !== 'string') return;
    const clean = stateUpdate.trim().slice(0, 60);
    if (!clean) return;
    const resolvedType = statusTypeLabel && statusTypes.some(t => t.label === statusTypeLabel) ? statusTypeLabel : (char.lifeState && char.lifeState.statusTypeLabel) || null;
    char.lifeStateHistory = char.lifeStateHistory || [];
    if (char.lifeState && char.lifeState.activity) char.lifeStateHistory.push(char.lifeState.activity);
    if (char.lifeStateHistory.length > 4) char.lifeStateHistory = char.lifeStateHistory.slice(-4); // 只留最近几条，够用来判断"是不是又绕回来了"
    char.lifeState = { activity: clean, updatedAt: Date.now(), statusTypeLabel: resolvedType };
}

// sessionId：可选，传入聊天会话id后世界书条目的sticky(维持)/cooldown(冷却)/delay(延迟)/概率触发才会生效
// （需要"这是第几轮对话"这个概念，靠globalChats[sessionId].length换算），不传就跟以前一样只按关键词纯匹配，
// 兼容那些没有"session"概念的调用点（发推文/评论/营销号等一次性生成场景）。
// 返回的是筛选/排序/预算裁剪完毕的世界书条目数组（不是拼好的文本），每条自带 position 字段
// （'before_persona'/'after_persona'/'end'，未设置视为默认的 'after_persona'），
// 由调用方（目前是 buildBasePrompt）按 position 分桶插到prompt里的不同位置；
// 老的"不区分位置、整段一起塞"的用法见下面的 getCharacterWorldbookText() 包装函数。
function getCharacterWorldbookEntries(char, chatHistoryStr = "", sessionId = null) {
    if (!worldbooks || worldbooks.length === 0) return [];

    let globalWbs = worldbooks.filter(w => w.isGlobal && w.enabled !== false);
    let localWbs = char && char.worldbooks ? worldbooks.filter(w => char.worldbooks.includes(w.id) && !w.isGlobal && w.enabled !== false) : [];
    let combined = [...globalWbs, ...localWbs];
    if (combined.length === 0) return [];

    const turnIndex = sessionId ? (globalChats[sessionId] || []).length : null;

    // 🔑 第一轮：关键词雷达过滤（对照聊天记录），同时应用sticky/cooldown/delay/概率触发
    let activeIds = resolveWorldbookActiveIds(combined, chatHistoryStr, sessionId, turnIndex);

    // 🔁 递归触发：标记了"允许递归触发"的条目，还可以被【已生效条目的正文内容】里出现的关键词链式触发（最多3层，防止死循环）
    // 递归这一步只按关键词匹配，不再叠加sticky/cooldown/概率——保持递归链本身简单可预期
    for (let depth = 0; depth < 3; depth++) {
        let scanText = combined.filter(w => activeIds.has(w.id)).map(w => w.content).join('\n');
        let addedAny = false;
        combined.forEach(w => {
            if (activeIds.has(w.id) || !w.recursive) return;
            if (worldbookEntryMatchesText(w, scanText)) { activeIds.add(w.id); addedAny = true; }
        });
        if (!addedAny) break;
    }

    let activeWbs = combined.filter(w => activeIds.has(w.id));

    // 🔀 互斥分组：同一个分组内，只保留优先级最高（其次权重最高）的一条，其余自动排除
    let finalWbs = [], byGroup = {};
    activeWbs.forEach(w => {
        const g = (w.group || '').trim();
        if (!g) { finalWbs.push(w); return; }
        const cur = byGroup[g];
        if (!cur || (w.priority ?? 0) > (cur.priority ?? 0) || ((w.priority ?? 0) === (cur.priority ?? 0) && (w.weight ?? 50) > (cur.weight ?? 50))) {
            byGroup[g] = w;
        }
    });
    finalWbs = finalWbs.concat(Object.values(byGroup));

    finalWbs.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || (b.weight ?? 50) - (a.weight ?? 50));
    if (finalWbs.length === 0) return [];

    // ⚡ 字数预算：按优先级/权重顺序装入，超预算的低优先条目自动跳过（省token），但至少保证第一条不会被跳
    // 注意：预算是按【全部触发条目】统一计算的，跟每条最终插到人设前/后/末尾哪个位置无关，
    // 这样"世界书字数上限"这个设置的含义不会因为加了插入位置而发生变化。
    let picked = [], usedLen = 0;
    finalWbs.forEach((w, idx) => {
        const line = `- [权重${w.weight ?? 50}] ${w.title}: ${w.content}`;
        if (idx === 0 || usedLen + line.length <= worldbookCharBudget) { picked.push(w); usedLen += line.length; }
    });
    return picked;
}

// entries: getCharacterWorldbookEntries() 的返回值。positionFilter 传 'before_persona'/'after_persona'/'end' 时，
// 只取该插入位置的条目格式化成文本（配合 buildBasePrompt 的三段式拼装）；不传（null/undefined）则不筛选，
// 把全部触发条目合并成一段文本——给日记/小说/续写这类没有"人设锚点"概念的旧调用点用，保持原有的"整段一起塞"行为。
function formatWorldbookEntriesText(entries, positionFilter) {
    if (!entries || entries.length === 0) return '';
    const filtered = positionFilter ? entries.filter(w => (w.position || 'after_persona') === positionFilter) : entries;
    if (filtered.length === 0) return '';
    const lines = filtered.map(w => `- [权重${w.weight ?? 50}] ${w.title}: ${w.content}`);
    return `【当前触发的世界观设定（请严格遵循）】：\n` + lines.join('\n') + `\n\n`;
}

// 兼容旧调用点（日记/小说/续写等场景）：不区分插入位置，返回全部触发条目合并成的一段文本，行为跟改造前完全一致
function getCharacterWorldbookText(char, chatHistoryStr = "", sessionId = null) {
    return formatWorldbookEntriesText(getCharacterWorldbookEntries(char, chatHistoryStr, sessionId), null);
}

// 聊天回复主线路专用：从已经算好的世界书条目里，摘出选了"[系统/用户/AI]插入深度"的条目，
// 转换成 insertTextAtDepth() 能直接用的 {depth, role, content} 格式，按depth从大到小排序
// （深的先插、浅的后插，避免多条深度注入互相插入时打乱相对次序，跟预设的深度注入用同一套排序逻辑）。
// 只有真正有"聊天历史"概念的场景才用得上（buildStructuredMessages的historyTurns参数），
// 发推文/评论/论坛等一次性生成场景没有"第几轮"这个概念，这类场景里这些条目会由 buildBasePrompt 自动降级成固定展示，不会丢内容。
function getWorldbookDepthEntries(wbEntries) {
    return (wbEntries || []).filter(w => w.position === 'at_depth' && (w.depth || 0) > 0)
        .map(w => ({
            depth: w.depth || 4,
            role: (w.depthRole === 'user' || w.depthRole === 'assistant') ? w.depthRole : 'system',
            content: `[世界书·${w.title}]：${w.content}`
        }))
        .sort((a, b) => b.depth - a.depth);
}

// 聊天回复主线路专用：摘出选了"作者注释之前/之后"的世界书条目，格式化成两段文本，
// 由调用方（js/05 的聊天发送逻辑）拼接在"导演耳语(Author's Note)"文本的前后，一起按AN当前的深度/频率设置插入，
// 这样"紧挨着作者注释"这个位置才是真正精确的，而不是随便找个固定地方堆着。
function getWorldbookAnAnchorText(wbEntries) {
    const before = (wbEntries || []).filter(w => w.position === 'before_an').map(w => `- ${w.title}：${w.content}`).join('\n');
    const after = (wbEntries || []).filter(w => w.position === 'after_an').map(w => `- ${w.title}：${w.content}`).join('\n');
    return { before, after };
}

// ⚡ 历史聊天总结注入修复：char.chatSummary 是每聊20条就追加一条总结、最多攒20条的滚动数组，
// 之前是不分新旧、原封不动整段塞进每次prompt，跟"最近N条原始聊天"权重差不多，导致AI容易把早就翻篇的旧话题
// （比如"做饭"）当成还在聊的内容重新捞出来。这里只取最近几条总结，并且明确告诉AI这些是背景、不是当前话题。
function getRecentChatSummaryText(summaryStr, limit = 5) {
    if (!summaryStr) return '';
    let lines = summaryStr.split('\n').filter(l => l.trim());
    if (lines.length > limit) lines = lines.slice(-limit);
    return lines.join('\n');
}

// ===== 人味强化协议：反套路 / 反回声 / 情绪校准（整合自用户提供的多份协议文档，为节省token做了精简合并）=====
// 原则：置于角色人设之前，优先级高于人设本身，不因"角色习惯"或"语气需要"被绕开
function getHumanFeelPromptText() {
    if (!humanFeelEnabled) return '';
    return `【人味强化协议 · 优先于以下人设生效】：
1. 特质有刻度不是开关：人设写的每个特质只演到写明的程度，不准往极端方向加码（"护短"不能演成"控制欲"，"直率"不能演成"故意伤人"）。角色是多维的，多个特质互相拉扯，不能让某一个特质垄断所有行为。
2. 反应要配得上事件：小事只给小反应，大事才给大反应，反应强度要跟事件分量匹配，不要什么都反应过度。
3. 先有自己，再有用户：写之前先想清楚这个角色此刻自己在忙什么、烦什么、惦记什么——这些跟用户无关。用户的话是撞进这条已有的思路里，不是从零触发的按钮。角色会主导话题、追问、突然改变话题，只回应自己在意的部分，其余可以没听见，情绪状态是累积的，不会每轮重置。
4. 不要对用户默认警惕或讨好：角色对用户的态度完全由人设和剧情决定，不能凭空带上无理由的敌意或猜忌，也不能无缘无故突然升温，态度转变要有剧情支撑。
5. 禁止回声式复述：不准把用户刚说的词语摘出来复述、点名或当引子（如"小煤球啊""关于X……""疲惫吗？"）。收到用户的话之后跳过"复述"这一步，直接处理意图、直接反应、直接推进。唯一例外：需要澄清用户话里的具体所指时可以引用原话。
6. 线上线下是同一个人：发消息的风格由性格决定——急性子发消息短、可能不回；毛躁的人打字快容易打错字、话说一半就发；敏感的人打了又删，最后发一句谨慎的话。
7. 写作避免套路：禁用"不是A，是/而是B"这类先否定再肯定的句式（角色在对话里纠正对方理解除外）；微微/轻轻/缓缓/静静一类词整段最多出现一次；不使用破折号"——"；不要靠"温度"做亲密接触的万能修辞；同一个意象或细节用过一次就不再反复强调；同一场对话里某个短语或描写模式出现过两次就必须换一种说法。
8. 人是有毛边的：角色不一定知道自己为什么有某种情绪，只是感觉到了，不用每次都做自我心理分析；对话可以有说岔、改口、跑题、笑错时机、用废话填补沉默，但不要为了显得真实而刻意堆砌，只写这个角色此刻真正在意的东西。
9. 绝对边界：不允许替用户写想法、感受、台词或关键决定性动作。
`;
}

// ===== TPES 时间感知增强系统（精简版，整合自用户提供的 TPES 2.0 协议文档）=====
// 去重说明：原版里"别报时间点/别播报已过多久/时间要自然带出"这些规则，跟下面 getTimeAwarenessPrompt()
// 已有的、更细致的聊天专属版本（结合关系阶段、lifeState、纪念日）是重复的——聊天场景两者会拼在同一条
// prompt 里，重复讲会显得啰嗦。这里只保留 getTimeAwarenessPrompt 覆盖不到的部分：绝对时间基准（推文/日记/
// 小说/新聊天首条消息都用得到，getTimeAwarenessPrompt 只在有历史消息的聊天里才生效）、线上线下三种状态各自
// 的时间流速模型、时间与环境的绑定、睡眠时段。
// ⏰ 睡眠时段这一行以前在提示词里写死成"约22:00-08:00"。
// 问题有两个：一是这个时间段在设置里本来就能改（设置 → 休息时间段），写死等于用户改了也没用，
// 角色照样按 22:00 睡；二是它连本app自己的默认值（23:00-08:00）都对不上。
// 现在直接读设置里的值；用户没开启"休息时间段"就不写死任何钟点，只说"按你的人设有自己的作息"，
// 让角色自己按人设决定几点睡——毕竟一个昼伏夜出的角色本来就不该被塞一个 22:00 的作息。
function getSleepWindowPromptLine() {
    const on = (typeof quietHoursEnabled !== 'undefined') && quietHoursEnabled
        && (typeof quietHoursStart !== 'undefined') && quietHoursStart
        && (typeof quietHoursEnd !== 'undefined') && quietHoursEnd
        && quietHoursStart !== quietHoursEnd;
    if (!on) {
        return '- 你有自己的作息（几点睡、几点醒由你的人设决定，夜猫子和早睡的人不一样），在你该睡觉的时段被找，会自然表现出刚睡醒的状态（前提是这之前没有一直在聊天）。';
    }
    return `- 你的睡眠时段是 ${quietHoursStart}-${quietHoursEnd}，这段时间被找会自然表现出刚睡醒的状态（前提是这之前没有一直在聊天）。`;
}
// 💰 省钱改造（把"每分钟都在变的那一句"从提示词开头挪到最末尾）：
//
// 各家 API 的输入缓存都是**按前缀逐字比对**命中的——前缀相同的那一段可以按 1~2 折计费，
// 一旦某个字符对不上，从那里往后全部按全价重算。
// 改造前，当前时间就写在 TPES 这一段的第一行，位置在整份系统提示词的第 894 个字符：
// 它后面那 5,363 字（人设、世界书、预设、关系网……占系统提示词的 85%）每过一分钟就整体失效一次，
// 能稳定命中的只剩前面那 894 字 ≈ 497 token，连 OpenAI 自动缓存 1024 token 的门槛都够不着，
// 等于每条消息都在按全价重付那 5000 多字。
//
// 现在把这一行拆出来（getTpesNowLine），由 buildBasePrompt 放到整份系统提示词的**最后**，
// 前面几千字就成了逐字稳定的前缀，缓存能正常命中。对模型没有影响——时间信息还在，只是位置换了，
// 而且放在最后离"这一轮要干什么"更近，反而更不容易被忽略。
// ===== 🗓️ 日程记忆 =====
// 以前日程是"一次性"的：生成一份今天的，明天覆盖掉，昨天干了什么谁也不知道。
// 结果就是角色永远活在今天——你问"你昨天不是说要去医院复查吗"，它一脸茫然。
//
// 现在每次日程被换掉之前，先把旧的那份归档进 char.scheduleHistory；攒够几天之后
// 总结成一段 char.scheduleMemory（"这几天ta大致在过什么日子"）。
// 两样东西都拼进 buildBasePrompt，所以聊天/发推/评论/日记信件/论坛/营销号全都能用上。
//
// ⚠️ 刻意**不**给小说和续写用：那两个功能有自己的 prompt 构造（generateNovelChapter /
// buildSsSystemPrompt 都没走 buildBasePrompt），它们写的是独立故事线，塞进"角色现实里今天几点干嘛"
// 只会跟剧情打架。这也正是用户要的"除了小说和续写，其他功能都加上"。
// 保留天数在「记忆总览」页里可以自己调（scheduleHistoryKeep，见 js/01）。
// 留得多 = 日历上能往回翻得远、总结素材更全，但存档也更大；留得少反过来。
function getScheduleHistoryKeep() {
    const n = (typeof scheduleHistoryKeep === 'number') ? scheduleHistoryKeep : 14;
    return (n > 0 && isFinite(n)) ? Math.min(365, Math.round(n)) : 14;
}
function archiveCharSchedule(char) {
    if (!char || !char.schedule || !char.schedule.text) return;
    if (!Array.isArray(char.scheduleHistory)) char.scheduleHistory = [];
    const day = new Date(char.schedule.generatedAt || Date.now()).toDateString();
    // 同一天重复生成只保留最后一份，不要把一天塞进去好几条
    char.scheduleHistory = char.scheduleHistory.filter(h => h && h.day !== day);
    char.scheduleHistory.push({ day, at: char.schedule.generatedAt || Date.now(), text: char.schedule.text });
    while (char.scheduleHistory.length > getScheduleHistoryKeep()) char.scheduleHistory.shift();
}
// 拼进 prompt 的那一段：今天的日程 + 前几天的记忆。两个都没有就返回空字符串，不占位置。
function getScheduleContextPrompt(char) {
    if (!char) return '';
    let out = '';
    if (char.schedule && char.schedule.text) {
        const stale = (typeof isScheduleStale === 'function') && isScheduleStale(char);
        out += `\n【你今天的日程安排${stale ? '（注意：这份是之前某天生成的，可能已经过期，按现在的实际时间灵活理解，别把日期说死）' : ''}】：\n${String(char.schedule.text).slice(0, 900)}\n`;
    }
    if (char.scheduleMemory) {
        out += `\n【你最近这些天大致是怎么过的（你自己记得，不用刻意汇报，自然带出即可）】：\n${String(char.scheduleMemory).slice(0, 600)}\n`;
    }
    // ✅ 待办清单：还没办的事。这是"角色为什么会突然想起点什么"的依据——
    // 比如答应过的东西买到了、约好的日子快到了，都可能自然地被提起。
    // 只给没办完的，办完的没必要再占 prompt。过期的单独标一下，语气上才对得上。
    const todos = Array.isArray(char.todos) ? char.todos.filter(t => t && !t.done) : [];
    if (todos.length) {
        const today = new Date();
        const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        const lines = todos.slice(0, 12).map(t => {
            const when = t.date ? (t.date < todayKey ? `${t.date}（已经过了，还没办）` : (t.date === todayKey ? '就是今天' : t.date)) : '没定日子';
            return `- ${String(t.text).slice(0, 60)}（${when}）`;
        }).join('\n');
        out += `\n【你还惦记着没办的事】：\n${lines}\n（这些是你自己心里记着的，不用刻意汇报或一条条念出来；只有当聊到相关的事、或者时间正好对上时，才自然地提一句或者去做。）\n`;
    }
    return out;
}
// 把归档的日程总结成一段"最近的生活轨迹"。攒够 3 天才值得总结一次，省得天天调 API。
async function updateScheduleMemoryAsync(char) {
    if (typeof isAutoOn === 'function' && !isAutoOn('scheduleMemory')) return;   // 🔌 设置里关掉了「日程记忆总结」
    if (!char || !Array.isArray(char.scheduleHistory) || char.scheduleHistory.length < 3) return;
    const lastSummarized = char.scheduleMemoryAt || 0;
    const fresh = char.scheduleHistory.filter(h => h && h.at > lastSummarized);
    if (fresh.length < 3) return;   // 上次总结之后又过了至少 3 天才重新总结
    const api = getApiConfig(false); if (!api.key) return;
    const days = char.scheduleHistory.slice(-7)
        .map(h => `【${new Date(h.at).toLocaleDateString('zh-CN')}】\n${String(h.text).slice(0, 500)}`).join('\n\n');
    const prompt = `下面是"${char.name}"最近几天的日程记录。请用第二人称（"你……"）把这几天概括成一段**生活轨迹记忆**，
写ta这段时间在忙什么、生活节奏怎么样、有没有反复出现的习惯或牵挂，200字以内，像一个人自己回想最近过得如何，
不要逐日复述流水账，也不要编日程里没有的事。只输出这段话本身，不要标题、不要解释。

${days}`;
    try {
        // 1800 而不是 600：有些中转会把推理模型的思考过程直接塞进正文，那段同样占额度，
        // 600 经常是「思考写完了、总结一个字还没写」就到顶了。这只是上限，写多少算多少。
        const data = await sendChatRequest(api, prompt, { max_tokens: 1800 });
        if (data.error) return;
        let text = (data.choices?.[0]?.message?.content || '').trim();
        if (typeof extractAfterFinalMarker === 'function') text = extractAfterFinalMarker(text).trim();
        if (typeof stripPairedReasoningAnywhere === 'function') { try { text = stripPairedReasoningAnywhere(text); } catch (e) {} }
        text = text.trim();
        if (!text) return;
        char.scheduleMemory = text;
        char.scheduleMemoryAt = Date.now();
        if (typeof saveAllData === 'function') saveAllData();
        console.info('[日程记忆] 已更新', char.name, '的生活轨迹记忆');
    } catch (e) { console.warn('[日程记忆] 总结失败（下次再试）：', e); }
}

// ===== 🎭 小剧场记忆 =====
// 角色参与过的小剧场（跟别的角色私下发生的事）总结成一段"我最近跟谁发生了什么"。
// 跟日程记忆一样拼进 buildBasePrompt，所以聊天/发推/评论/日记信件/论坛都能用上，
// 而小说和续写天然不受影响（那两个功能不走 buildBasePrompt）。
// 效果是：角色会自然地提起一件你不在场的事——"昨天跟霍司爵吃饭，他又阴阳我"。
function getCharTheaterLogs(charId) {
    if (typeof globalTheaterLogs === 'undefined' || !Array.isArray(globalTheaterLogs)) return [];
    return globalTheaterLogs.filter(l => l && (String(l.charAId) === String(charId) || String(l.charBId) === String(charId)));
}
function getTheaterContextPrompt(char) {
    if (!char || !char.theaterMemory) return '';
    return `\n【你最近跟其他人私下发生过的事（你自己记得，用户未必知道；不用刻意汇报，聊到相关的才自然提起）】：\n${String(char.theaterMemory).slice(0, 600)}\n`;
}
async function updateTheaterMemoryAsync(char) {
    if (typeof isAutoOn === 'function' && !isAutoOn('theaterMemory')) return;   // 🔌 设置里关掉了「小剧场记忆总结」
    if (!char) return;
    const logs = getCharTheaterLogs(char.id);
    if (logs.length < 3) return;
    const lastAt = char.theaterMemoryAt || 0;
    if (logs.filter(l => l.at > lastAt).length < 3) return;   // 上次总结之后又攒够 3 场才重新总结
    const api = getApiConfig(false); if (!api.key) return;
    const text = logs.slice(-8).map(l => {
        const other = String(l.charAId) === String(char.id) ? l.charBName : l.charAName;
        return `【${new Date(l.at).toLocaleDateString('zh-CN')} · 和${other}】${l.summary}${l.scene ? '：' + String(l.scene).slice(0, 200) : ''}`;
    }).join('\n');
    const prompt = `下面是"${char.name}"最近跟其他人私下发生的一些事。请用第二人称（"你……"）把它们概括成一段**你自己的记忆**，
写清楚跟谁、大致发生了什么、你对这些事什么态度，200字以内。像一个人自己回想最近和身边人的往来，
不要逐条复述，也不要编没写到的事。只输出这段话本身，不要标题、不要解释。

${text}`;
    try {
        // 1800 而不是 600：有些中转会把推理模型的思考过程直接塞进正文，那段同样占额度，
        // 600 经常是「思考写完了、总结一个字还没写」就到顶了。这只是上限，写多少算多少。
        const data = await sendChatRequest(api, prompt, { max_tokens: 1800 });
        if (data.error) return;
        let out = (data.choices?.[0]?.message?.content || '').trim();
        if (typeof extractAfterFinalMarker === 'function') out = extractAfterFinalMarker(out).trim();
        if (typeof stripPairedReasoningAnywhere === 'function') { try { out = stripPairedReasoningAnywhere(out); } catch (e) {} }
        out = out.trim();
        if (!out) return;
        char.theaterMemory = out;
        char.theaterMemoryAt = Date.now();
        if (typeof saveAllData === 'function') saveAllData();
        console.info('[小剧场记忆] 已更新', char.name);
    } catch (e) { console.warn('[小剧场记忆] 总结失败（下次再试）：', e); }
}

function getTpesNowLine() {
    if (!tpesEnabled) return '';
    const now = new Date();
    const nowStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const weekdayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `\n【当前真实时间】：${nowStr}（${weekdayNames[now.getDay()]}），生成时以这个时间为准（对应上面的时间感知协议 TPES）。\n`;
}
function getTpesPromptText() {
    if (!tpesEnabled) return '';
    return `【时间感知协议 TPES】（具体的当前时间写在这份设定的最后一行）：
- 时间流速：线上聊天时间随对话内容/动作自然推进，不是一问一答就等于一瞬间；线下场景（约会/外出等）按场景动作估算耗时，比如吃饭1-2小时、看电影2小时；用户不在线时角色按人设过自己的生活，时间等同现实流逝，期间可能发生的无关紧要小事不用主动汇报，自然带出即可。
- 时间要和环境绑定：光线天色、疲惫和饥饿感、街上人多不多、当前季节天气都要跟这个时间对得上，工作日/周末/节日的活动安排也不一样。
${getSleepWindowPromptLine()}
- 用户话里提到的时间线索（"刚下班""好困""早上好"）优先于上面这个系统时间判断。
`;
}

// 📮 让角色在【聊天/发推/评论】里也记得"我们通过信"。
//
// 信件系统本身早就有完整的往来记忆（buildLetterThreadContext），但那份上下文**只在写信/回信时**才喂给模型。
// 结果就是：用户刚寄了一封长信，转头去聊天页找角色说话，角色完全不知道有这回事——
// 用户体感是"信白写了""角色转脸就忘"。
//
// 这里补一段**很短**的信件感知，拼进 buildBasePrompt，所有走 buildBasePrompt 的场景
// （聊天、群聊、发推、评论、日记、主动找茬…）都能看到。
// 刻意只给标题 + 一小段摘要，不给全文：全文有 buildLetterThreadContext 在写信时负责，
// 这里的目的只是让角色"知道有这件事、大概聊了什么"，不该占掉聊天上下文的预算。
function getLetterAwarenessPrompt(char, maxLetters = 4, perLetterChars = 90) {
    if (!char || !char.diaryData) return '';
    const letters = (char.diaryData.letters || []).filter(l => l && l.content);
    const pendingCount = (char.pendingLetterReplies || []).length;
    if (letters.length === 0) return '';

    const sorted = letters.slice().sort((a, b) => (a.date || 0) - (b.date || 0)).slice(-maxLetters);
    const lines = sorted.map(l => {
        const who = l.author === 'user' ? userDisplayName() : '你';
        const when = (typeof timeAgo === 'function' && l.date) ? timeAgo(l.date) : '之前';
        const body = String(l.content).replace(/\s+/g, ' ').trim();
        const snip = body.slice(0, perLetterChars) + (body.length > perLetterChars ? '…' : '');
        return `· ${when}，${who}寄出《${l.title || '无题'}》：${snip}`;
    });

    let txt = `\n【你和${userDisplayName()}之间的通信（你记得这些信，聊天时可以自然提起，但不要每次都把话题硬拽到信上）】：\n${lines.join('\n')}\n`;
    if (pendingCount > 0) {
        // 这一条最要紧：用户刚寄了信、角色还没回，这时候在聊天里装作不知道是最出戏的
        txt += `你收到了${pendingCount > 1 ? `${pendingCount}封` : '一封'}${userDisplayName()}寄来的信，还没来得及回。你心里是记着这件事的——聊天时可以顺口提一句"你信我看了""还没想好怎么回你"之类，符合你性格就行，不用刻意。\n`;
    }
    return txt;
}

// options（可选，都不传就是老行为，完全兼容现有的一堆调用点）：
// - sessionId：传入聊天会话id后，世界书的sticky/cooldown/delay/概率触发才会生效（需要"第几轮"这个概念）
// - excludeDepthPresetEntries：true时，当前启用预设里设置了"深度注入"的模块不会被塞进这段固定文本，
//   调用方需要自己用 getActivePresetDepthEntries() 取出来，插到聊天历史里对应的深度位置（只有聊天回复这条主线路会这样做）
// - excludeWorldbookPositions：字符串数组，比如 ['at_depth','before_an','after_an']，这几个位置的世界书条目
//   不会被塞进这段固定文本里——调用方需要自己用 getWorldbookDepthEntries()/getWorldbookAnAnchorText() 取出来，
//   精确插到聊天历史的深度位置 / 作者注释前后（只有聊天回复这条主线路会这样做，因为只有那里才有"历史轮次"和
//   "作者注释"这两个概念）。不传这个参数（比如发推文/评论/论坛等一次性生成场景）时，这几个位置的条目
//   会自动降级成固定摊平展示在prompt里合理的位置，不会因为选了这些"聊天专属"位置就丢内容。
function buildBasePrompt(char, includeChatSummary = true, chatHistoryStr = "", options = null) {
    const opts = options || {};
    // 世界书条目和预设模块都各自能设置"插入位置"，这里先各自算好一份数据/文本，再按位置分段拼进最终prompt里，
    // 默认位置（人设之后）的拼装顺序跟改造前完全一致，不影响没设置过插入位置的老数据。
    // precomputedWbEntries：调用方如果已经自己算过一遍 getCharacterWorldbookEntries()（比如聊天回复主线路，
    // 需要先摘出深度/作者注释类条目再精确插入），就把结果传进来复用，不要在这里重新算一遍——世界书触发有
    // "按百分比概率触发"这种带随机数的条件，重新算一遍可能摇出跟外面不一样的结果，导致同一条世界书在
    // "要不要插入深度位置"和"是否出现在这段固定文本里"两处判断不一致。
    const wbEntries = opts.precomputedWbEntries || getCharacterWorldbookEntries(char, chatHistoryStr, opts.sessionId); // 将聊天记录传给世界书雷达
    const excludeWb = new Set(opts.excludeWorldbookPositions || []);
    const wbText = (pos) => excludeWb.has(pos) ? '' : formatWorldbookEntriesText(wbEntries, pos);

    let prompt = getHumanFeelPromptText();
    prompt += getTpesPromptText();
    prompt += wbText('before_persona');
    prompt += getActivePresetPromptText(char, !!opts.excludeDepthPresetEntries, opts.sessionId, 'before_persona');
    prompt += `你是"${char.name}"，你的核心人设：${char.persona}。\n`;
    prompt += wbText('after_persona'); // 默认插入位置，未设置position的条目都在这里，等价于改造前的行为
    // 本app没有把"示例对话"从人设里单独拆出来存（角色卡导入时mes_example会直接并进人设文本），
    // 所以"示例消息之前/之后"这两个位置目前只能就近落在人设块的外侧，跟人设紧挨着，不是完全独立的一段。
    prompt += wbText('before_example');
    prompt += wbText('after_example');
    prompt += getUserContextPrompt(char);   // 👤 按“在这个角色面前我是谁”取用户人设
    prompt += aliveVoicePrompt(char);       // 🫀 语言指纹（静态，放前面对缓存友好）
    if (char.memorySummary) prompt += `\n【你的专属推文记忆总结】：\n${char.memorySummary}\n`;
    if (includeChatSummary && char.chatSummary) {
        // 🫀 开了「久远的记忆会褪色」就换成分层褪色版；没开就还是原来那段全文
        const faded = (typeof aliveFadedSummaryBlock === 'function') ? aliveFadedSummaryBlock(char) : null;
        if (faded) prompt += faded;
        else {
            const recentSummary = getRecentChatSummaryText(char.chatSummary, 5);
            if (recentSummary) prompt += `\n【与用户的历史聊天总结（仅供你了解背景，都是已经聊过、翻篇的旧话题，除非跟当前对话自然衔接，否则不要主动重提或把话题拉回去，优先跟着最近的对话内容走）】：\n${recentSummary}\n`;
        }
    }
    const groupTopics = getCharGroupChatTopics(char);
    if (groupTopics) prompt += `\n【你参与的群聊最近话题（发帖/发言时可以自然提及）】：\n${groupTopics}\n`;
    prompt += getScheduleContextPrompt(char);   // 🗓️ 今天的日程 + 最近几天的生活轨迹记忆（小说/续写不走这条路，天然排除）
    prompt += getTheaterContextPrompt(char);    // 🎭 跟别的角色私下发生过的事（同上，小说/续写天然排除）
    prompt += getLetterAwarenessPrompt(char);   // 📮 让角色在聊天/发推时也记得你们通过信
    prompt += getDiaryAwarenessPrompt(char);    // 📔 角色自己写过的日记（信件一直有，日记一直漏着）
    if (typeof getAnniversaryAwarenessPrompt === 'function') prompt += getAnniversaryAwarenessPrompt(char);   // 🗓️ 用户手记在日历里的纪念日
    if (typeof getReadingNotesPrompt === 'function') prompt += getReadingNotesPrompt(char);   // 📖 一起读过的书（js/20）
    if (typeof getFilmPrompt === 'function') prompt += getFilmPrompt(char);   // 🎬 一起看过的电影 + 观后感（js/21）
    prompt += getBoxPrompt(char);   // 🧩 内置小功能（js/22~25）各自的注入
    prompt += getProfileSelfPrompt(char);       // 🪪 资料页上的简介/所在地/网站/生日
    prompt += getFactionSelfPrompt(char);       // 🏳️ 自己属于哪个势力、同一边还有谁
    prompt += getRelationshipContextPrompt(char);
    prompt += aliveMoodPrompt(char);            // 🫀 上一轮留下来的情绪，还没散干净
    prompt += aliveBodyPrompt(char);            // 🫀 累/困/饿/上头，本地按日程推的
    // "作者注释前/后"和"插入深度"这两类默认在这里摊平兜底展示；聊天回复主线路会传 excludeWorldbookPositions
    // 把它们排除在外，改成精确插到作者注释旁边/聊天历史的深度位置（见 js/05 里对应的调用）。
    prompt += wbText('before_an');
    prompt += wbText('after_an');
    prompt += wbText('at_depth');
    prompt += getActivePresetPromptText(char, !!opts.excludeDepthPresetEntries, opts.sessionId, 'after_persona'); // 默认插入位置，等价于改造前的行为
    prompt += getPluginPromptText(char); // 插件系统：提示词规则插件注入
    prompt += runPluginScriptHooks(char, chatHistoryStr); // 插件系统：进阶脚本钩子注入
    prompt += wbText('end');
    prompt += getActivePresetPromptText(char, !!opts.excludeDepthPresetEntries, opts.sessionId, 'end');
    let actionRule = allowActionTags ? "你可以使用括号(如()或【】)来进行动作描写和心理描写。" : "不要有多余的动作描写或心理描写，直接输出说话或正文内容。";
    prompt += `\n【格式规则】：${actionRule}\n`;
    // 💰 当前时间必须是这份系统提示词里的**最后一段**——它每分钟都在变，放在前面会让它后面
    //    所有内容的输入缓存全部失效（详见 getTpesNowLine 上面的说明）。往这后面再加任何东西之前，
    //    先确认那段内容是不是也会每次都变；固定不变的内容一律加在这一行**之前**。
    if (typeof getTpesNowLine === 'function') prompt += getTpesNowLine();
    return applyPluginMacros(applyMacros(prompt, char, opts.sessionId), char);
}

// ===== Token/字数预算估算（仿SillyTavern顶部的"当前prompt大小"提示）=====
// 粗略估算：中文等CJK字符基本"一个字≈一个token"，英文单词通常几个字符对应一个token，混合文本没法精确计算
// （除非真的接入对应模型的tokenizer），这里用"字符数 ÷ 1.8"作为一个通用折中估计值，只用来给个大致概念、
// 判断会不会明显超出上下文上限，不是精确计费依据（真实token数以服务商实际计费为准）。
function estimateTokenCount(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 1.8);
}

function estimateCurrentPromptSize() {
    let char = null, sessionId = currentChatSessionId;
    if (sessionId) {
        if (sessionId.startsWith('g_')) {
            const g = groupChats.find(x => x.id === sessionId);
            if (g && g.members && g.members.length > 0) char = myCharacters.find(c => c.id == g.members[0]);
        } else {
            char = myCharacters.find(c => c.id == sessionId);
        }
    }
    if (!char) { appAlert('请先打开一个聊天会话再估算（会按当前角色的人设+世界书+预设+插件来计算）'); return; }

    const recentHistory = buildTimeAwareHistoryText((globalChats[sessionId] || []).slice(-chatHistoryTurns));
    const systemText = buildBasePrompt(char, true, recentHistory, { sessionId });
    const totalText = systemText + recentHistory;

    const sysChars = systemText.length, historyChars = recentHistory.length, totalChars = totalText.length;
    const sysTokens = estimateTokenCount(systemText), totalTokens = estimateTokenCount(totalText);

    appAlert(`📊 当前角色「${char.name}」的prompt体积估算（仅供参考，非精确计费）：\n\n系统提示词（人设+世界书+预设+插件等）：约 ${sysChars} 字 / 约 ${sysTokens} token\n最近${chatHistoryTurns}轮聊天记录：约 ${historyChars} 字\n合计：约 ${totalChars} 字 / 约 ${totalTokens} token\n\n💡 粗略估算（字符数÷1.8），不同模型的真实tokenizer会有出入，仅用来大致判断是否明显超出上下文上限。`);
}

// ===== 关系网上下文：让角色"记得"自己与用户、与其他角色的关系 =====
// 让角色在聊天时，对"最近发生的推文动态"有个大概了解——包括用户自己发的、以及关系网里相关角色发的，
// 而不是完全脱节（现在聊天默认对这些一无所知，除非你亲口在聊天里提起）
function getRecentPostsAwarenessText(char) {
    if (!char || !globalPosts || globalPosts.length === 0) return '';
    const now = Date.now();
    const recencyWindow = 3 * 86400000; // 只看最近3天内的，太久远的动态不提，避免显得像过时新闻
    let lines = [];

    // 1. 用户自己发的推文（最多3条）
    const myRecentPosts = globalPosts.filter(p => p.char && p.char.id === 'me' && (now - p.timestamp) < recencyWindow)
        .sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
    myRecentPosts.forEach(p => lines.push(`- 用户发了："${(p.text || '').slice(0, 60)}"`));

    // 2. 和这个角色有关系的其他角色发的推文（每人最多2条）
    if (charRelationships && charRelationships.length > 0) {
        const relatedIds = charRelationships.filter(r => r.fromId == char.id || r.toId == char.id)
            .map(r => (r.fromId == char.id) ? r.toId : r.fromId)
            .filter(id => id !== 'me' && id != char.id);
        [...new Set(relatedIds)].forEach(relId => {
            const relChar = myCharacters.find(c => c.id == relId);
            if (!relChar) return;
            globalPosts.filter(p => p.char && p.char.id == relId && (now - p.timestamp) < recencyWindow)
                .sort((a, b) => b.timestamp - a.timestamp).slice(0, 2)
                .forEach(p => lines.push(`- ${relChar.name}发了："${(p.text || '').slice(0, 60)}"`));
        });
    }

    if (lines.length === 0) return '';
    let text = lines.join('\n');
    if (text.length > 800) text = text.slice(0, 800) + '……';
    return `\n【最近的推文动态 — 你大概知道最近发生了这些事，可以自然地在聊天里提起或回应，但不用刻意汇报】：\n${text}\n`;
}

function getRelationshipContextPrompt(char) {
    if (!char) return '';
    // 陌生人规则：不管关系网里有没有条目，这条提醒都必须在——之前空关系网/关系网里没列到的角色时
    // 完全没有任何"你们不认识"的提示，AI很容易凭感觉当成"反正是熟人"来演，导致角色对明明没关系记录的人
    // 表现得莫名熟络（乱用昵称、编造根本没发生过的共同经历等）。
    const strangerRule = '\n【关于人物关系的重要规则】：本段里列出的是你现在真实认识、有实际关系的人物，仅限这份名单。如果接下来的对话/情节里出现了不在这份名单里的角色——哪怕对方表现得很熟络、或者名字听起来眼熟——说明你们其实并不认识对方，你应该表现得像第一次见面的陌生人：保持礼貌但有距离感，不要用亲昵的称呼，不要表现出"我们很熟"的语气，也不要凭空编造过去的交集或互动历史，除非你的人设/世界书里明确写了你认识对方。\n';
    if (!charRelationships || charRelationships.length === 0) return strangerRule + '（你目前没有任何被记录下来的人物关系，所以理论上你现在谁都不认识。）\n';
    const edges = charRelationships.filter(r => r.fromId == char.id || r.toId == char.id);
    if (edges.length === 0) return strangerRule + '（你目前没有任何被记录下来的人物关系，所以理论上你现在谁都不认识。）\n';

    // 🐛 「角色跟用户是情侣，但人设写着不爱回消息，结果就真的不出现了」——这是"不活人"的典型成因。
    //
    // 关系数据其实一直都进了提示词，问题出在**形态**：它以前只是名单里平铺直叙的一行
    // 「- 你与用户"XX"的关系：情侣」，紧跟着却是一大段写得很具体的"陌生人规则"
    // （怎么保持距离、不要用亲昵称呼……）。模型读下来，写得细的那段压过了那一行，
    // 加上人设里"高冷/不爱回消息"这种硬设定，最后的结果就是干脆不出声。
    //
    // 所以这里做两件事，都不是新增大段提示词：
    //   ① 把「你和用户的关系」从名单里单独拎出来放最前面 —— 它是每一轮都用得上的那条，
    //      不该跟一堆 NPC 关系混在一起排队。
    //   ② 补一句关键的话：人设里的高冷是**对外人**说的。对亲近的人，
    //      "不爱说话"应该表现成回得短/回得慢/嘴硬，而不是彻底消失。
    //      沉默不是性格刻画，是缺席 —— 这正是"不活人"的根源。
    //      这句只在跟用户**确实有关系记录**时才加，没关系的角色一个字都不多花。
    const userEdge = edges.find(r => r.fromId === 'me' || r.toId === 'me');
    let userLine = '';
    if (userEdge) {
        // ⚠️ 这段话必须对**任何**关系标签都成立：情侣、朋友、师徒、上司下属、债主、前任、
        // 敌对、宿敌、萍水相逢…… 而且标签是用户自己能随便新建的（见 relationshipTypePresets 的
        // "自定义"选项），所以这里**绝对不能**去猜标签是"亲近"还是"敌对"，
        // 更不能按关键词分支——自定义标签一来就全废了。
        // 能对所有关系都成立的只有两条：
        //   ① 对这个人什么态度，由这份关系决定，不是由"我平时是什么性格"决定；
        //   ② 不管哪种关系，都不该表现成"完全不出现"。冷淡有冷淡的说法，
        //      敌意有敌意的说法，客气有客气的说法——沉默不是任何一种，沉默只是缺席。
        userLine = `\n【你和${userDisplayName()}的关系】：${userEdge.label}\n`
            + `这条关系是你们之间所有互动的底色。你对${userDisplayName()}是什么态度，由这份关系决定，`
            + `而不是由"我这个人平时什么性格"决定——同一个人对不同关系的人本来就是两副面孔。\n`
            + `⚠️ 你人设里那些"高冷/话少/懒得理人/不爱回消息"之类的设定，写的是你面对**泛泛之交**时的默认状态。`
            + `面对一个有明确关系的人，它该怎么落地要看这份关系是什么：可能是嘴硬、回得短、别扭、答非所问，`
            + `也可能是呛回去、冷嘲、明确表示不想理——**具体是哪种，你自己按这份关系判断**。\n`
            + `但不论哪一种，都不该是"干脆不出现"。人可以冷淡，可以不耐烦，可以敌意很重，但不会凭空消失。`
            + `真的一个字都不出声，那不叫性格，那叫这个人不在场。\n`;
    }

    let lines = edges.filter(r => r !== userEdge).map(r => {
        const otherId = (r.fromId == char.id) ? r.toId : r.fromId;
        const other = otherId === 'me' ? currentUser : myCharacters.find(c => c.id == otherId);
        if (!other) return null;
        return `- 你与"${other.name}"的关系：${r.label}`;
    }).filter(Boolean);

    if (!userLine && lines.length === 0) return strangerRule + '（你目前没有任何被记录下来的人物关系，所以理论上你现在谁都不认识。）\n';

    const othersBlock = lines.length > 0
        ? `\n【你和其他人的关系】（这些是你一直记得的关系，请让它自然影响你的称呼、语气和态度，但不要生硬地把关系标签念出来）：\n${lines.join('\n')}\n`
        : '';
    return `${userLine}${othersBlock}${strangerRule}`;
}



// ===== 关系网驱动的角色互动：推文/爆料/论坛提及时，让有关系的角色自己决定要不要来 =====
async function triggerRelatedCharacterReactions(sourceChar, contextText, target) {
    if (typeof isAutoOn === 'function' && !isAutoOn('relatedReaction')) return;   // 🔌 设置里关掉了「关联角色连锁反应」
    if (!isGlobalCharInteractionEnabled()) return; // 未开启互动开关时，不主动触发关系网联动
    if (!sourceChar || sourceChar.id === 'me' || !charRelationships || charRelationships.length === 0) return;
    const edges = charRelationships.filter(r => r.fromId == sourceChar.id || r.toId == sourceChar.id);
    if (edges.length === 0) return;

    const related = edges.map(r => {
        const otherId = (r.fromId == sourceChar.id) ? r.toId : r.fromId;
        if (otherId === 'me') return null; // 用户不参与自动互动，只作为聊天里的关系感知
        const other = myCharacters.find(c => c.id == otherId);
        return other ? { char: other, label: r.label } : null;
    }).filter(Boolean);
    if (related.length === 0) return;

    const api = getApiConfig(true); if (!api.key) return;
    const actionDesc = target.type === 'tabloid' ? '被营销号爆料提到' : (target.type === 'forum' ? '在论坛被提及/回复' : '发了一条新动态');

    for (let item of related) {
        if (item.char.replyToUser === false) continue; // 复用现有的"不参与互动"开关
        try {
            const actionStrictRule = allowActionTags ? "" : "\n【严格禁止】：绝对不要包含任何动作、神态或心理描写（不要用括号()或【】），只输出你直接说的话。";
            // 修复：补齐世界书/关系网/预设上下文，避免关系联动互动这条路径OOC（之前只塞了人设+单条关系标签）
            const prompt = `${buildBasePrompt(item.char, false, contextText)}
你与"${sourceChar.name}"的关系是：${item.label}。
刚刚"${sourceChar.name}"${actionDesc}，内容是："${contextText}"。
请结合你的人设和你们之间的关系，判断你是否会主动过来互动（评论/回复）——关系友好可能会声援或调侃，关系敌对可能会阴阳怪气或拆台，也可能压根不关心，一切以人设为准。
如果不会主动过来，只输出"NO"。
如果会，直接输出你要说的话（不超过${typeof commentWordLimit !== 'undefined' ? commentWordLimit : 30}字，不要带引号，语气要体现你和ta的关系，不要直接把关系标签念出来）。即使这只是一条简短互动而不是完整对话，如果你的世界观设定/正则脚本里要求每次输出固定附带某种格式标签、状态栏或HTML卡片，也请照常带上，不要因为内容短就省略。${typeof WORD_LIMIT_PRIORITY_NOTE !== 'undefined' ? WORD_LIMIT_PRIORITY_NOTE : ''}${actionStrictRule}
${getFinalAnswerMarkerPromptNote()}`;
            const data = await sendChatRequest(api, prompt);
            let repText = data.choices?.[0]?.message?.content?.trim();
            // 去掉可能混进来的思维链前缀（比如<think>...</think>），评论只应该显示真正的回复内容。
            if (repText) repText = stripLeadingReasoningBlocks(repText).rest.trim();
            if (repText) repText = stripUndelimitedReasoningIfOverLength(repText, typeof commentWordLimit !== 'undefined' ? commentWordLimit : 30);
            if (!repText || repText.toUpperCase().startsWith('NO')) continue;
            repText = repText.replace(/^["“]|["”]$/g, '').trim();
            // 关系网联动互动没有匿名分支（target.type 只会是 post/tabloid/forum），直接烘焙该角色的生成后正则脚本，
            // 让状态栏/卡片等HTML跟推文/日记/论坛保持一致地生效。
            repText = applyRegexScripts(repText, 'ai_output', item.char.id);

            if (target.type === 'post') {
                const post = globalPosts.find(p => p.id === target.id); if (!post) continue;
                post.replies.push({ id: 'r_' + Date.now() + Math.floor(Math.random()*1000), parentId: null, char: item.char, text: repText, timestamp: Date.now(), likes: 0, liked: false });
                post.stats.comments = (parseStat(post.stats.comments) || 0) + 1;
            } else if (target.type === 'tabloid') {
                const post = tabloidPosts.find(p => p.id === target.id); if (!post) continue;
                post.replies.push({ id: 'r_' + Date.now() + Math.floor(Math.random()*1000), parentId: null, charId: item.char.id, name: item.char.name, text: repText, timestamp: Date.now() });
                post.stats.comments = (post.stats.comments || 0) + 1;
            } else if (target.type === 'forum' && target.thread) {
                const thread = target.thread;
                const nextFloor = thread.replies.length > 0 ? thread.replies[thread.replies.length - 1].floor + 1 : 2;
                thread.replies.push({ floor: nextFloor, author: item.char.name, charId: item.char.id, isOp: false, content: repText, quoteFloor: null, likes: 0, timestamp: Date.now() });
            }
            saveAllData();
        } catch (e) { console.error('关系网角色互动生成失败:', e); }
    }

    if (target.type === 'post' && document.getElementById('view-home').style.display !== 'none') renderPosts();
    else if (target.type === 'tabloid' && document.getElementById('view-tabloid').style.display !== 'none') renderTabloidPosts();
    else if (target.type === 'forum' && target.thread && document.getElementById('current-forum-wrap')) openForumThread(target.thread.id);
}

function renderWorldbookCards() {
    renderWorldbookCategoryBar();
    const container = document.getElementById('worldbookContainer');
    if(worldbooks.length === 0) { container.innerHTML = '<div class="empty-state" style="padding:20px;">暂无世界书，请添加设定</div>'; return; }
    // "未分类"是纯视图层的虚拟筛选值，不写进 worldbookCategories，专门用来把 category 为空的世界书统一归到一起，方便查找
    const filtered = !activeWbCategoryFilter ? worldbooks
        : (activeWbCategoryFilter === '__uncategorized__' ? worldbooks.filter(w => !(w.category || '').trim())
        : worldbooks.filter(w => (w.category || '') === activeWbCategoryFilter));
    if(filtered.length === 0) {
        const filterLabel = activeWbCategoryFilter === '__uncategorized__' ? '未分类' : activeWbCategoryFilter;
        container.innerHTML = `<div class="empty-state" style="padding:20px;">分类「${escapeHtml(filterLabel)}」下暂无世界书</div>`;
        return;
    }
    const sorted = [...filtered].sort((a, b) => {
        const ag = a.isGlobal ? 1 : 0, bg = b.isGlobal ? 1 : 0;
        if (bg !== ag) return bg - ag; // 全局生效的世界书置顶
        return (b.weight ?? 50) - (a.weight ?? 50);
    });
    container.innerHTML = sorted.map((w, i) => {
        const hasCategory = w.category && w.category.trim();
        const catLabel = hasCategory ? w.category : '未分类';
        const catFilterVal = hasCategory ? w.category.replace(/'/g, "\\'") : '__uncategorized__';
        const catBadge = `<div style="font-size:11px; margin:0 0 4px;"><span class="group-tag" style="margin-left:0; background:${hasCategory ? '#7856ff' : '#8b98a5'};" onclick="filterWorldbookByCategory('${catFilterVal}')">🏷️ ${escapeHtml(catLabel)}</span></div>`;
        return `
        <div class="wb-card">
            <div style="position:absolute; top:4px; right:4px; display:flex; gap:8px;">
                <button style="background:none; border:none; color:#1d9bf0; cursor:pointer; font-size:14px;" onclick="editWorldbook(${w.id})">✏️</button>
                <button style="background:none; border:none; color:#f91880; cursor:pointer; font-size:16px;" onclick="deleteWorldbook(${w.id})">×</button>
            </div>
            <div class="wb-title">${escapeHtml(w.title)} <span style="font-size:11px; font-weight:normal; color:#8b98a5;">权重${w.weight ?? 50}</span></div>
            ${catBadge}
            ${w.keywords && w.keywords.trim() ? `<div style="font-size:11px; color:#f91880; margin:2px 0 4px;">🔑 关键词触发：${escapeHtml(w.keywords)}</div>` : `<div style="font-size:11px; color:#8b98a5; margin:2px 0 4px;">♾️ 无条件生效</div>`}
            ${(w.group && w.group.trim()) || w.recursive ? `<div style="font-size:11px; color:#7856ff; margin:0 0 4px;">${w.group && w.group.trim() ? `🔀 互斥分组：${escapeHtml(w.group)}（优先级${w.priority ?? 0}）` : ''}${w.recursive ? ' 🔁 可递归触发' : ''}</div>` : ''}
            <div class="wb-content">${escapeHtml(w.content)}</div>
            <div style="margin-top:auto; padding-top:8px; border-top:1px dashed #eff3f4; text-align:center;">
                <button class="btn-edit-small" style="width:100%; transition:0.2s; ${w.isGlobal ? 'background:#1d9bf0; color:white;' : 'background:rgba(255,255,255,0.8); color:#1d9bf0;'}" onclick="toggleWorldbookGlobal(${w.id})">
                    ${w.isGlobal ? '🌟 全局已生效' : '设为全局生效'}
                </button>
            </div>
        </div>`;
    }).join('');
}

// ===== 世界书分类：标题栏右侧的筛选条 + 自定义/删除标签管理 =====
function renderWorldbookCategoryBar() {
    const bar = document.getElementById('wbCategoryBar');
    if (!bar) return;
    const uncategorizedCount = worldbooks.filter(w => !(w.category || '').trim()).length;
    const tags = [{ label: '全部', val: null }, ...worldbookCategories.map(cat => ({ label: cat, val: cat }))];
    if (uncategorizedCount > 0) tags.push({ label: `未分类(${uncategorizedCount})`, val: '__uncategorized__' });
    bar.innerHTML = tags.map(t => `<span class="group-tag" style="margin-left:0; background:${activeWbCategoryFilter === t.val ? '#7856ff' : 'rgba(120,86,255,0.15)'}; color:${activeWbCategoryFilter === t.val ? 'white' : '#7856ff'};" onclick="filterWorldbookByCategory(${t.val === null ? 'null' : `'${String(t.val).replace(/'/g, "\\'")}'`})">${escapeHtml(t.label)}</span>`).join('')
        + `<span class="group-tag" style="margin-left:0; background:rgba(29,155,240,0.1); color:#1d9bf0;" onclick="openWbCategoryManagerModal()" title="新增/删除分类标签">🏷️ 管理</span>`;
}

function filterWorldbookByCategory(cat) {
    activeWbCategoryFilter = cat;
    renderWorldbookCards();
}

// 世界书页面上面"卡片列表"和下面"新增/编辑表单"之间那条蓝色分界线的拖拽手柄：往上拖表单区变高
// （列表区相应变矮），往下拖表单区变矮。用 Pointer Events（同一套API自动兼容鼠标和触屏拖拽）实现。
function startWbFormResize(e, handleEl) {
    e.preventDefault();
    const dockEl = handleEl.nextElementSibling; // .wb-edit-form-dock，紧跟在这个手柄后面
    if (!dockEl) return;
    const startHeight = dockEl.getBoundingClientRect().height;
    const startY = e.clientY;
    // 拖拽期间不再受默认 55vh 上限约束，改由下面 Math.min 里的 85vh 接管，拖拽结束后这个临时提高的上限
    // 不影响什么（用户没继续拖，高度就停在当前这个像素值，不会自己再变回55vh）
    dockEl.style.maxHeight = '85vh';
    handleEl.setPointerCapture && handleEl.setPointerCapture(e.pointerId);

    function onMove(moveEvent) {
        const dy = moveEvent.clientY - startY; // 往上拖(dy为负)表单区变高，往下拖(dy为正)表单区变矮
        const newHeight = Math.max(120, Math.min(window.innerHeight * 0.85, startHeight - dy));
        dockEl.style.height = newHeight + 'px';
    }
    function onUp() {
        handleEl.removeEventListener('pointermove', onMove);
        handleEl.removeEventListener('pointerup', onUp);
        handleEl.removeEventListener('pointercancel', onUp);
    }
    handleEl.addEventListener('pointermove', onMove);
    handleEl.addEventListener('pointerup', onUp);
    handleEl.addEventListener('pointercancel', onUp);
}

// ===== 通用工具：给"故事"和"角色专属世界书"这两处的选择列表复用世界书主页同款的分类筛选条 =====
function getWorldbooksFilteredByCategory(categoryFilter) {
    if (!categoryFilter) return worldbooks;
    if (categoryFilter === '__uncategorized__') return worldbooks.filter(w => !(w.category || '').trim());
    return worldbooks.filter(w => (w.category || '') === categoryFilter);
}
function buildWbCategoryFilterTagsHtml(categoryFilter, onClickFnName) {
    const uncategorizedCount = worldbooks.filter(w => !(w.category || '').trim()).length;
    const tags = [{ label: '全部', val: null }, ...worldbookCategories.map(cat => ({ label: cat, val: cat }))];
    if (uncategorizedCount > 0) tags.push({ label: `未分类(${uncategorizedCount})`, val: '__uncategorized__' });
    return tags.map(t => `<span class="group-tag" style="margin-left:0; background:${categoryFilter === t.val ? '#7856ff' : 'rgba(120,86,255,0.15)'}; color:${categoryFilter === t.val ? 'white' : '#7856ff'}; cursor:pointer;" onclick="${onClickFnName}(${t.val === null ? 'null' : `'${String(t.val).replace(/'/g, "\\'")}'`})">${escapeHtml(t.label)}</span>`).join('');
}

// ---------- 故事功能：世界书选择 ----------
function renderNovelWbCheckboxes() {
    const bar = document.getElementById('novelWbCategoryBar');
    if (bar) bar.innerHTML = worldbooks.length > 0 ? buildWbCategoryFilterTagsHtml(novelWbCategoryFilter, 'filterNovelWbByCategory') : '';
    const wbBox = document.getElementById('novelWbCheckboxes');
    if (!wbBox) return;
    if (worldbooks.length === 0) { wbBox.innerHTML = '<span style="color:#888;">暂无世界书。</span>'; return; }
    const filtered = getWorldbooksFilteredByCategory(novelWbCategoryFilter);
    if (filtered.length === 0) { wbBox.innerHTML = '<span style="color:#888;">该分类下暂无世界书。</span>'; return; }
    wbBox.innerHTML = filtered.map(w => `
        <label style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.8); padding:5px 10px; border-radius:9999px; border:1px solid #1d9bf0; cursor:pointer;">
            <input type="checkbox" class="novel-wb-check" value="${w.id}" ${novelWbPendingSelection.has(w.id) ? 'checked' : ''} onchange="toggleNovelWbPending(${w.id}, this.checked)">
            ${escapeHtml(w.title)}
        </label>`).join('');
}
function filterNovelWbByCategory(cat) { novelWbCategoryFilter = cat; renderNovelWbCheckboxes(); }
function toggleNovelWbPending(id, checked) { if (checked) novelWbPendingSelection.add(id); else novelWbPendingSelection.delete(id); }

// ---------- 角色表单：专属世界书选择 ----------
function renderCharFormWbCheckboxes() {
    const bar = document.getElementById('charWbCategoryBar');
    if (bar) bar.innerHTML = worldbooks.length > 0 ? buildWbCategoryFilterTagsHtml(charFormWbCategoryFilter, 'filterCharFormWbByCategory') : '';
    const wbBox = document.getElementById('charWbCheckboxes');
    if (!wbBox) return;
    if (worldbooks.length === 0) { wbBox.innerHTML = '<span style="color:#536471; font-size:13px;">暂无世界书</span>'; return; }
    const filtered = getWorldbooksFilteredByCategory(charFormWbCategoryFilter);
    if (filtered.length === 0) { wbBox.innerHTML = '<span style="color:#536471; font-size:13px;">该分类下暂无世界书</span>'; return; }
    wbBox.innerHTML = filtered.map(w => `<label style="display:flex; align-items:center; gap:4px; font-size:13px;"><input type="checkbox" value="${w.id}" class="wb-check" ${charFormWbPendingSelection.has(w.id) ? 'checked' : ''} onchange="toggleCharFormWbPending(${w.id}, this.checked)"> ${escapeHtml(w.title)}</label>`).join('');
}
function filterCharFormWbByCategory(cat) { charFormWbCategoryFilter = cat; renderCharFormWbCheckboxes(); }
function toggleCharFormWbPending(id, checked) { if (checked) charFormWbPendingSelection.add(id); else charFormWbPendingSelection.delete(id); }

function openWbCategoryManagerModal() { renderWbCategoryList(); openModal('wbCategoryManagerModal'); }

function renderWbCategoryList() {
    const c = document.getElementById('wbCategoryListContainer');
    if (!c) return;
    if (worldbookCategories.length === 0) { c.innerHTML = '<div style="color:#536471; font-size:13px; padding:8px 0;">暂无分类，添加一个吧！</div>'; return; }
    c.innerHTML = worldbookCategories.map((cat, i) => `<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eff3f4;">
        <span style="font-size:15px; display:flex; align-items:center; gap:8px;">
            🏷️ <input type="text" value="${escapeHtml(cat)}" style="border:1px solid transparent; background:transparent; font-size:15px; width:150px; outline:none; color:#7856ff;" onfocus="this.style.border='1px solid #7856ff'; this.style.borderRadius='4px';" onblur="this.style.border='1px solid transparent'; editWbCategory(${i}, this.value)">
            <span style="color:#536471; font-size:12px;">(${worldbooks.filter(w => (w.category || '') === cat).length} 条)</span>
        </span>
        <button onclick="deleteWbCategory(${i})" style="background:none; border:none; color:#f91880; cursor:pointer; font-size:18px; padding:2px 6px;">×</button>
    </div>`).join('');
}

function addWbCategory() {
    const input = document.getElementById('newWbCategoryInput');
    const val = input.value.trim();
    if (!val) return;
    if (worldbookCategories.includes(val)) return alert("该分类已存在！");
    worldbookCategories.push(val);
    input.value = '';
    renderWbCategoryList();
    renderWorldbookCategoryBar();
    refreshWbCategorySelect();
    saveAllData();
}

function editWbCategory(idx, newVal) {
    newVal = newVal.trim();
    if (!newVal || newVal === worldbookCategories[idx]) { renderWbCategoryList(); return; }
    if (worldbookCategories.includes(newVal)) { alert("分类名已存在"); renderWbCategoryList(); return; }
    const oldCat = worldbookCategories[idx];
    worldbookCategories[idx] = newVal;
    worldbooks.forEach(w => { if ((w.category || '') === oldCat) w.category = newVal; });
    if (activeWbCategoryFilter === oldCat) activeWbCategoryFilter = newVal;
    renderWbCategoryList();
    renderWorldbookCategoryBar();
    refreshWbCategorySelect();
    renderWorldbookCards();
    saveAllData();
}

async function deleteWbCategory(idx) {
    const catName = worldbookCategories[idx];
    const affected = worldbooks.filter(w => (w.category || '') === catName);
    if (!(await appConfirm(`删除分类"${catName}"？`))) return;

    // 分类下如果还挂着世界书，多问一步：只删标签、世界书本身保留变回"无分类"（老行为，默认更安全），
    // 还是连这些世界书本身也一起删掉（适合"这个分类整个不要了、里面的设定也不需要了"的场景）。
    let alsoDeleteEntries = false;
    if (affected.length > 0) {
        alsoDeleteEntries = await appConfirm(
            `这个分类下还有 ${affected.length} 本世界书，要连世界书本身也一起删除吗？\n选"一起删除"会把这些世界书彻底删掉，不可恢复；选"仅删分类"只是去掉分类标签，世界书本身完整保留（变回"无分类"）。`,
            '一起删除世界书', '仅删分类，保留世界书'
        );
    }

    if (alsoDeleteEntries) {
        const idsToRemove = new Set(affected.map(w => w.id));
        worldbooks = worldbooks.filter(w => !idsToRemove.has(w.id));
        myCharacters.forEach(c => { if (c.worldbooks) c.worldbooks = c.worldbooks.filter(wid => !idsToRemove.has(wid)); });
    } else {
        worldbooks.forEach(w => { if ((w.category || '') === catName) w.category = ''; });
    }

    if (activeWbCategoryFilter === catName) activeWbCategoryFilter = null;
    worldbookCategories.splice(idx, 1);
    renderWbCategoryList();
    renderWorldbookCategoryBar();
    refreshWbCategorySelect();
    renderWorldbookCards();
    saveAllData();
}

function refreshWbCategorySelect() {
    const sel = document.getElementById('newWbCategory');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">-- 无分类 --</option>' + worldbookCategories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
    if (worldbookCategories.includes(cur)) sel.value = cur;
}

function toggleWorldbookGlobal(id) {
    let wb = worldbooks.find(w => w.id === id);
    if(wb) { 
        wb.isGlobal = !wb.isGlobal; 
        saveAllData(); 
        renderWorldbookCards();
    }
}

// 世界书表单的"插入位置"下拉框改成"插入深度(@Depth)"时，才需要显示身份/深度这两个额外输入框
function onWbPositionChange() {
    const posEl = document.getElementById('newWbPosition');
    const box = document.getElementById('newWbDepthBox');
    if (!posEl || !box) return;
    box.style.display = (posEl.value === 'at_depth') ? 'inline-flex' : 'none';
}

function saveWorldbook() {
    const id = document.getElementById('editWbId').value;
    const title = document.getElementById('newWbTitle').value.trim();
    const content = document.getElementById('newWbContent').value.trim();
    const weight = Math.max(0, Math.min(100, parseInt(document.getElementById('newWbWeight').value) || 50));
    // 抓取关键词
    const keywords = document.getElementById('newWbKeywords') ? document.getElementById('newWbKeywords').value.trim() : '';
    const priority = parseInt(document.getElementById('newWbPriority')?.value) || 0;
    const group = document.getElementById('newWbGroup')?.value.trim() || '';
    const recursive = !!document.getElementById('newWbRecursive')?.checked;
    const category = document.getElementById('newWbCategory')?.value || '';
    const validPositions = ['before_persona', 'after_persona', 'before_example', 'after_example', 'before_an', 'after_an', 'end', 'at_depth'];
    const positionRaw = document.getElementById('newWbPosition')?.value;
    const position = validPositions.includes(positionRaw) ? positionRaw : 'after_persona';
    const depthRoleRaw = document.getElementById('newWbDepthRole')?.value;
    const depthRole = (depthRoleRaw === 'user' || depthRoleRaw === 'assistant') ? depthRoleRaw : 'system';
    const depth = Math.max(0, parseInt(document.getElementById('newWbDepth')?.value) || 0);
    // 次要关键词/触发节奏（仿SillyTavern World Info的sticky/cooldown/delay/概率触发），只在聊天里真正生效
    const secondaryKeywords = document.getElementById('newWbSecondaryKeywords')?.value.trim() || '';
    const secondaryLogic = document.getElementById('newWbSecondaryLogic')?.value || 'and_any';
    const stickyTurns = Math.max(0, parseInt(document.getElementById('newWbSticky')?.value) || 0);
    const cooldownTurns = Math.max(0, parseInt(document.getElementById('newWbCooldown')?.value) || 0);
    const delayTurns = Math.max(0, parseInt(document.getElementById('newWbDelay')?.value) || 0);
    const probability = Math.max(0, Math.min(100, parseInt(document.getElementById('newWbProbability')?.value) ?? 100));

    if(!title || !content) return alert("请完整填写标题和内容");

    if (id) {
        const wb = worldbooks.find(w => w.id == id);
        if (wb) { wb.title = title; wb.content = content; wb.weight = weight; wb.keywords = keywords; wb.priority = priority; wb.group = group; wb.recursive = recursive; wb.category = category; wb.secondaryKeywords = secondaryKeywords; wb.secondaryLogic = secondaryLogic; wb.stickyTurns = stickyTurns; wb.cooldownTurns = cooldownTurns; wb.delayTurns = delayTurns; wb.probability = probability; wb.position = position; wb.depthRole = depthRole; wb.depth = depth; }
    } else {
        worldbooks.push({ id: Date.now(), title, content, isGlobal: false, weight, keywords, priority, group, recursive, category, secondaryKeywords, secondaryLogic, stickyTurns, cooldownTurns, delayTurns, probability, position, depthRole, depth });
    }
    cancelEditWb(); renderWorldbookCards(); saveAllData();
}

function editWorldbook(id) {
    const wb = worldbooks.find(w => w.id === id);
    if(!wb) return;
    document.getElementById('editWbId').value = wb.id;
    document.getElementById('newWbTitle').value = wb.title;
    document.getElementById('newWbContent').value = wb.content;
    // 打开编辑已有条目时，先按内容量给个还算合适的初始高度（封顶380px，避免正文特别长时把表单其它部分挤到很远），
    // 之后用户还是可以用下面那个拖拽手柄自己再调，两者不冲突。
    const wbContentEl = document.getElementById('newWbContent');
    wbContentEl.style.height = Math.max(90, Math.min(380, wbContentEl.scrollHeight)) + 'px';
    document.getElementById('newWbWeight').value = wb.weight ?? 50;
    if(document.getElementById('newWbKeywords')) document.getElementById('newWbKeywords').value = wb.keywords || '';
    if(document.getElementById('newWbPriority')) document.getElementById('newWbPriority').value = wb.priority ?? 0;
    if(document.getElementById('newWbGroup')) document.getElementById('newWbGroup').value = wb.group || '';
    if(document.getElementById('newWbRecursive')) document.getElementById('newWbRecursive').checked = !!wb.recursive;
    if(document.getElementById('newWbPosition')) document.getElementById('newWbPosition').value = ['before_persona', 'before_example', 'after_example', 'before_an', 'after_an', 'end', 'at_depth'].includes(wb.position) ? wb.position : 'after_persona';
    if(document.getElementById('newWbDepthRole')) document.getElementById('newWbDepthRole').value = (wb.depthRole === 'user' || wb.depthRole === 'assistant') ? wb.depthRole : 'system';
    if(document.getElementById('newWbDepth')) document.getElementById('newWbDepth').value = wb.depth ?? 4;
    onWbPositionChange();
    if(document.getElementById('newWbSecondaryKeywords')) document.getElementById('newWbSecondaryKeywords').value = wb.secondaryKeywords || '';
    if(document.getElementById('newWbSecondaryLogic')) document.getElementById('newWbSecondaryLogic').value = wb.secondaryLogic || 'and_any';
    if(document.getElementById('newWbSticky')) document.getElementById('newWbSticky').value = wb.stickyTurns ?? 0;
    if(document.getElementById('newWbCooldown')) document.getElementById('newWbCooldown').value = wb.cooldownTurns ?? 0;
    if(document.getElementById('newWbDelay')) document.getElementById('newWbDelay').value = wb.delayTurns ?? 0;
    if(document.getElementById('newWbProbability')) document.getElementById('newWbProbability').value = wb.probability ?? 100;
    refreshWbCategorySelect();
    if(document.getElementById('newWbCategory')) document.getElementById('newWbCategory').value = wb.category || '';
    document.getElementById('wbFormTitle').innerText = "编辑世界书设定";
    document.getElementById('saveWbBtn').innerText = "保存修改";
    document.getElementById('cancelWbBtn').style.display = 'block';
}

function cancelEditWb() {
    document.getElementById('editWbId').value = '';
    document.getElementById('newWbTitle').value = '';
    document.getElementById('newWbContent').value = '';
    document.getElementById('newWbContent').style.height = '';
    document.getElementById('newWbWeight').value = 50;
    if(document.getElementById('newWbKeywords')) document.getElementById('newWbKeywords').value = '';
    if(document.getElementById('newWbPriority')) document.getElementById('newWbPriority').value = 0;
    if(document.getElementById('newWbGroup')) document.getElementById('newWbGroup').value = '';
    if(document.getElementById('newWbRecursive')) document.getElementById('newWbRecursive').checked = false;
    if(document.getElementById('newWbPosition')) document.getElementById('newWbPosition').value = 'after_persona';
    if(document.getElementById('newWbDepthRole')) document.getElementById('newWbDepthRole').value = 'system';
    if(document.getElementById('newWbDepth')) document.getElementById('newWbDepth').value = 4;
    onWbPositionChange();
    if(document.getElementById('newWbSecondaryKeywords')) document.getElementById('newWbSecondaryKeywords').value = '';
    if(document.getElementById('newWbSecondaryLogic')) document.getElementById('newWbSecondaryLogic').value = 'and_any';
    if(document.getElementById('newWbSticky')) document.getElementById('newWbSticky').value = 0;
    if(document.getElementById('newWbCooldown')) document.getElementById('newWbCooldown').value = 0;
    if(document.getElementById('newWbDelay')) document.getElementById('newWbDelay').value = 0;
    if(document.getElementById('newWbProbability')) document.getElementById('newWbProbability').value = 100;
    if(document.getElementById('newWbCategory')) document.getElementById('newWbCategory').value = '';
    document.getElementById('wbFormTitle').innerText = "新增世界书设定";
    document.getElementById('saveWbBtn').innerText = "添加并保存";
    document.getElementById('cancelWbBtn').style.display = 'none';
}

async function deleteWorldbook(id) {
    if(!(await appConfirm("确定要删除这本世界书吗？"))) return;
    worldbooks = worldbooks.filter(w => w.id !== id); 
    myCharacters.forEach(c => {
        if(c.worldbooks) c.worldbooks = c.worldbooks.filter(wid => wid !== id);
    });
    renderWorldbookCards(); 
    saveAllData(); 
}

function openGroupManagerModal() { renderGroupList(); openModal('groupManagerModal'); }
function renderGroupList() {
    const c = document.getElementById('groupListContainer');
    if (characterGroups.length === 0) { c.innerHTML = '<div style="color:#536471; font-size:13px; padding:8px 0;">暂无分组，添加一个吧！</div>'; return; }
    c.innerHTML = characterGroups.map((g, i) => `<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eff3f4;"><span style="font-size:15px; display:flex; align-items:center; gap:8px;"><svg class="blue-line-icon" style="width:16px;height:16px;" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> <input type="text" value="${g}" style="border:1px solid transparent; background:transparent; font-size:15px; width:150px; outline:none; color:#1d9bf0;" onfocus="this.style.border='1px solid #1d9bf0'; this.style.borderRadius='4px';" onblur="this.style.border='1px solid transparent'; editGroup(${i}, this.value)"><span style="color:#536471; font-size:12px;">(${myCharacters.filter(c=>charInFaction(c,g)).length} 人)</span></span><button onclick="deleteGroup(${i})" style="background:none; border:none; color:#f91880; cursor:pointer; font-size:18px; padding:2px 6px;">×</button></div>`).join('');
}
function addGroup() { const val = document.getElementById('newGroupInput').value.trim(); if (!val) return; if (characterGroups.includes(val)) return alert("分组已存在！"); characterGroups.push(val); document.getElementById('newGroupInput').value = ''; renderGroupList(); saveAllData(); }
function editGroup(idx, newVal) { newVal = newVal.trim(); if (!newVal || newVal === characterGroups[idx]) { renderGroupList(); return; } if (characterGroups.includes(newVal)) { alert("分组名已存在"); renderGroupList(); return; } const oldGroup = characterGroups[idx]; characterGroups[idx] = newVal; renameFactionEverywhere(oldGroup, newVal); renderGroupList(); refreshGroupFilterBar(); saveAllData(); }
async function deleteGroup(idx) { const groupName = characterGroups[idx]; if (!(await appConfirm(`删除分组"${groupName}"？该分组下的角色会被移出这个势力（如果还属于别的势力，那些不受影响）。`))) return; removeFactionEverywhere(groupName); characterGroups.splice(idx, 1); renderGroupList(); saveAllData(); }
function filterByGroup(g) { activeGroupFilter = g; renderCenterCharList(); }
function refreshGroupFilterBar() {
    const bar = document.getElementById('groupFilterBar'); const tags = [{ label: '全部', val: null, color: 'white' }, ...characterGroups.map(g => ({ label: g, val: g, color: 'white' }))];
    bar.innerHTML = tags.map(t => `<span class="group-tag" style="background:${activeGroupFilter === t.val ? '#1d9bf0' : t.color}; color:${activeGroupFilter === t.val ? 'white' : '#1d9bf0'}; border:1px solid #1d9bf0;" onclick="filterByGroup(${t.val === null ? 'null' : `'${t.val}'`})">${t.label}</span>`).join('');
}
// 🏴 角色表单里的势力选择：从单选下拉换成多选复选框（一个角色可以同时属于多个势力）。
// selected 是当前应该勾上的势力名数组；不传就保留界面上已经勾着的（重画分组列表时不丢用户的选择）。
function refreshGroupSelect(selected) {
    const box = document.getElementById('charGroupChecks');
    if (!box) return;
    const keep = selected || Array.from(box.querySelectorAll('input:checked')).map(i => i.value);
    if (characterGroups.length === 0) {
        box.innerHTML = '<div style="font-size:12px; color:#8b98a5;">还没有创建任何势力。可以先去「势力总览」建一个，或者留空（＝势力不明）。</div>';
        return;
    }
    box.innerHTML = characterGroups.map(g => `
        <label class="gy-faction-check">
            <input type="checkbox" value="${escapeHtml(g)}" ${keep.includes(g) ? 'checked' : ''}>
            <span>${escapeHtml(g)}</span>
        </label>`).join('');
}
// 读表单里勾了哪些势力
function readCharFormFactions() {
    const box = document.getElementById('charGroupChecks');
    if (!box) return [];
    return Array.from(box.querySelectorAll('input:checked')).map(i => i.value);
}

function getCharRecentPosts(charId, limit = 20) { return globalPosts.filter(p => p.char.id == charId && !p.isStory).slice(0, limit); }
function openMemoryModal(charId) {
    const char = myCharacters.find(c => c.id == charId); if (!char) return;
    memoryViewingCharId = charId;
    currentSummaryCharId = charId; // 两个变量保持一致，避免其它入口（比如聊天选项）读取的时候对不上角色
    document.getElementById('memoryModalTitle').innerText = `${char.name} 的记忆管理`;
    document.getElementById('memoryEditArea').value = char.memorySummary || '';
    document.getElementById('chatSummaryEditArea').value = char.chatSummary || '';
    openModal('memoryModal');
}
function saveCharMemory() {
    const char = myCharacters.find(c => c.id == memoryViewingCharId); if (!char) return;
    char.memorySummary = document.getElementById('memoryEditArea').value.trim();
    char.chatSummary = document.getElementById('chatSummaryEditArea').value.trim();
    saveAllData();
    alert('记忆已成功保存！');
    closeModal('memoryModal');
}

// 打开"记忆总览"页面并直接定位到指定角色/群聊——取代原来那个小弹窗(openMemoryModal)，
// 展示的数据也从"聊天总结+推文记忆总结"两块扩到了全部记忆相关数据。
function openMemoryHub(targetId) {
    switchMainView('memoryHub');
    const sel = document.getElementById('memoryHubTargetSelect');
    if (sel && targetId) { sel.value = targetId; }
    selectMemoryHubTarget(targetId);
}

// ===================== 🧠 记忆总览（独立页面，不放在设置里）=====================
// 把角色/群聊身上所有"AI自动记了什么、总结了什么"的数据——聊天总结、推文记忆总结、群聊总结、
// 向量记忆（哪些消息已经被embedding、可以被语义检索到）、记忆召回库、专属资料库、MVU状态快照——
// 集中在这一个页面查看，不用再东一块（设置里的AI增强功能）西一块（角色卡的记忆小弹窗）地翻。
function renderMemoryHubTargetOptions() {
    const sel = document.getElementById('memoryHubTargetSelect');
    if (!sel) return;
    const emptyState = document.getElementById('memoryHubEmptyState');
    const content = document.getElementById('memoryHubContent');
    if (myCharacters.length === 0 && (!groupChats || groupChats.length === 0)) {
        if (emptyState) emptyState.style.display = 'block';
        if (content) content.style.display = 'none';
        sel.innerHTML = '';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';
    let optionsHtml = '';
    if (myCharacters.length > 0) optionsHtml += `<optgroup label="角色">` + myCharacters.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('') + `</optgroup>`;
    if (groupChats && groupChats.length > 0) optionsHtml += `<optgroup label="群聊">` + groupChats.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('') + `</optgroup>`;
    sel.innerHTML = optionsHtml;
    // 保持上次选中的目标（如果还存在），否则默认选第一个
    const stillExists = currentMemoryHubTargetId && (myCharacters.some(c => c.id == currentMemoryHubTargetId) || (groupChats || []).some(g => g.id === currentMemoryHubTargetId));
    const targetId = stillExists ? currentMemoryHubTargetId : (myCharacters[0]?.id || (groupChats[0] && groupChats[0].id));
    if (targetId) { sel.value = targetId; selectMemoryHubTarget(targetId); }
}

function selectMemoryHubTarget(id) {
    currentMemoryHubTargetId = id;
    const content = document.getElementById('memoryHubContent');
    if (!id) { if (content) content.style.display = 'none'; return; }
    if (content) content.style.display = 'block';
    renderMemoryHubContent();
}

function renderMemoryHubContent() {
    const id = currentMemoryHubTargetId;
    if (!id) return;
    const isGroup = id.toString().startsWith('g_');
    const char = isGroup ? null : myCharacters.find(c => c.id == id);
    const group = isGroup ? groupChats.find(g => g.id === id) : null;

    // 聊天总结：群聊存的是 group.summary，单聊是 char.chatSummary，共用同一个文本框
    const chatSummaryArea = document.getElementById('memHubChatSummaryArea');
    if (chatSummaryArea) chatSummaryArea.value = isGroup ? (group?.summary || '') : (char?.chatSummary || '');

    // 推文记忆总结：只有角色才有（群聊不发推文），是群聊就整块隐藏
    const postWrap = document.getElementById('memHubPostMemoryWrap');
    if (postWrap) postWrap.style.display = isGroup ? 'none' : '';
    const postArea = document.getElementById('memHubPostSummaryArea');
    if (postArea) postArea.value = (!isGroup && char) ? (char.memorySummary || '') : '';

    // 所在群聊的总结：只有查看角色时才展示（列出这个角色所在的每个群聊各自的总结）
    const groupWrap = document.getElementById('memHubGroupSummaryWrap');
    const groupList = document.getElementById('memHubGroupSummaryList');
    if (groupWrap && groupList) {
        if (isGroup) { groupWrap.style.display = 'none'; }
        else {
            const myGroups = (groupChats || []).filter(g => Array.isArray(g.members) && g.members.includes(id) && g.summary);
            if (myGroups.length === 0) { groupWrap.style.display = 'none'; }
            else {
                groupWrap.style.display = '';
                groupList.innerHTML = myGroups.map(g => `
                    <div style="background:white; padding:10px; border-radius:6px; border:1px solid #eff3f4;">
                        <div style="font-size:13px; font-weight:bold; color:#1d9bf0; margin-bottom:4px;">${escapeHtml(g.name)}</div>
                        <div style="font-size:12px; color:#536471; white-space:pre-wrap;">${escapeHtml(g.summary)}</div>
                    </div>`).join('');
            }
        }
    }

    renderMemoryHubVectorMemory(id, isGroup);
    if (typeof renderMemoryEntriesList === 'function') renderMemoryEntriesList(id);
    renderMemoryHubDataBank(id, isGroup);
    renderMemoryHubMvuSnapshot(id);
}

function saveMemoryHubSummaries() {
    const id = currentMemoryHubTargetId;
    if (!id) return;
    const isGroup = id.toString().startsWith('g_');
    const chatSummaryArea = document.getElementById('memHubChatSummaryArea');
    if (isGroup) {
        const group = groupChats.find(g => g.id === id);
        if (group && chatSummaryArea) group.summary = chatSummaryArea.value.trim();
    } else {
        const char = myCharacters.find(c => c.id == id);
        if (char) {
            if (chatSummaryArea) char.chatSummary = chatSummaryArea.value.trim();
            const postArea = document.getElementById('memHubPostSummaryArea');
            if (postArea) char.memorySummary = postArea.value.trim();
        }
    }
    saveAllData();
    alert('记忆已保存！');
}

function saveMemoryHubIntervals() {
    chatSummaryInterval = Math.max(1, parseInt(document.getElementById('memHubChatSummaryInterval')?.value) || 20);
    groupSummaryInterval = Math.max(1, parseInt(document.getElementById('memHubGroupSummaryInterval')?.value) || 50);
    postMemoryInterval = Math.max(1, parseInt(document.getElementById('memHubPostMemoryInterval')?.value) || 20);
    // 🗓️ 日程归档保留天数：改小了不会立刻删掉已有记录，下一次归档时才会裁到新长度
    const keepEl = document.getElementById('memHubScheduleKeep');
    if (keepEl) scheduleHistoryKeep = Math.min(365, Math.max(1, parseInt(keepEl.value) || 14));
    // 🎭 小剧场保留条数：0 ＝ 不限（默认）。跟日程一样，改小了不会立刻删，下次写入新记录时才裁。
    const thKeepEl = document.getElementById('memHubTheaterKeep');
    if (thKeepEl) {
        const raw = parseInt(thKeepEl.value);
        theaterLogKeep = (isNaN(raw) || raw <= 0) ? 0 : Math.min(100000, raw);
    }
    saveAllData();
    alert('总结频率已保存！');
}

// 向量记忆浏览：这个角色/群聊的聊天记录里，哪些消息被打上了 embVec（说明已经进了语义检索库），
// 直接列出来，比"完全看不见记了什么"直观得多；也支持单条"忘记"（清掉embVec，下次检索就不会再命中它）。
// 除了聊天消息，日记/信件/小说/论坛/匿名论坛这些"角色自己写的内容"（走 collectCharVectorCandidates 收集，
// 跟 getSemanticContext 检索时用的是同一份逻辑）也在这里一起展示，不用切来切去分别确认好几处有没有生效。
async function renderMemoryHubVectorMemory(sessionId, isGroup) {
    const statsEl = document.getElementById('memHubVectorStats');
    const listEl = document.getElementById('memHubVectorList');
    if (!statsEl || !listEl) return;
    const history = globalChats[sessionId] || [];
    const embedded = history.map((m, idx) => ({ m, idx })).filter(x => x.m.embVec);

    const char = isGroup ? null : myCharacters.find(c => c.id == sessionId);
    const charCandidates = (char && typeof collectCharVectorCandidates === 'function') ? await collectCharVectorCandidates(char) : [];
    const charEmbedded = charCandidates.filter(it => it.ref.embVec);
    // 缓存这一轮收集到的候选列表，供下面"忘记"按钮按下标定位对应条目
    window.__memHubCharVectorCandidatesCache = window.__memHubCharVectorCandidatesCache || {};
    window.__memHubCharVectorCandidatesCache[sessionId] = charCandidates;

    if (!enableVectorMemory) {
        statsEl.innerHTML = `⚪ 向量记忆总开关当前是关闭的（上面可以打开），已经存过的向量还在，只是不会再被检索使用。`;
    } else {
        statsEl.innerHTML = `已向量化 ${embedded.length} / ${history.length} 条聊天消息` + (char ? `　·　日记/信件/小说/论坛等：已向量化 ${charEmbedded.length} / ${charCandidates.length} 条（还没算过的会在下次聊天/续写时自动补算，不用手动操作）` : '');
    }
    if (embedded.length === 0 && charEmbedded.length === 0) {
        listEl.innerHTML = '<div style="color:#8b98a5; font-size:13px;">还没有任何内容被记入向量记忆（内容太短，或者还没触发向量化）</div>';
        return;
    }
    const kindLabel = { diary: '📔 日记', letter: '✉️ 信件', novel: '📖 小说', forum: '💬 论坛', anon: '🕶️ 匿名论坛' };
    let html = embedded.slice().reverse().map(x => {
        const senderName = x.m.sender === 'me' ? (currentUser?.name || '我') : (x.m.sender === 'system' ? '系统' : (myCharacters.find(c => c.id == x.m.sender)?.name || x.m.sender));
        const timeStr = x.m.timestamp ? new Date(x.m.timestamp).toLocaleString('zh-CN') : '';
        const preview = (x.m.text || '').length > 150 ? x.m.text.slice(0, 150) + '……' : (x.m.text || '');
        return `<div style="background:white; padding:8px; border-radius:6px; border:1px solid #eff3f4;">
            <div style="font-size:11px; color:#8b98a5; margin-bottom:2px;">💬 聊天 · ${escapeHtml(senderName)} · ${timeStr}</div>
            <div style="font-size:13px; color:#0f1419; white-space:pre-wrap; word-break:break-all;">${escapeHtml(preview)}</div>
            <div style="text-align:right; margin-top:4px;"><span style="color:#f91880; font-size:12px; cursor:pointer;" onclick="forgetVectorMemoryEntry('${sessionId}', ${x.idx})">🗑️ 忘记</span></div>
        </div>`;
    }).join('');
    html += charEmbedded.slice().reverse().map(it => {
        const preview = it.text.length > 150 ? it.text.slice(0, 150) + '……' : it.text;
        const idx = charCandidates.indexOf(it);
        return `<div style="background:white; padding:8px; border-radius:6px; border:1px solid #eff3f4;">
            <div style="font-size:11px; color:#8b98a5; margin-bottom:2px;">${kindLabel[it.kind] || it.kind} · ${escapeHtml(it.label)}</div>
            <div style="font-size:13px; color:#0f1419; white-space:pre-wrap; word-break:break-all;">${escapeHtml(preview)}</div>
            <div style="text-align:right; margin-top:4px;"><span style="color:#f91880; font-size:12px; cursor:pointer;" onclick="forgetCharVectorEntry('${sessionId}', ${idx})">🗑️ 忘记</span></div>
        </div>`;
    }).join('');
    listEl.innerHTML = html;
}
function forgetVectorMemoryEntry(sessionId, idx) {
    const history = globalChats[sessionId];
    if (!history || !history[idx]) return;
    delete history[idx].embVec;
    saveAllData();
    renderMemoryHubVectorMemory(sessionId, sessionId.toString().startsWith('g_'));
}
function forgetCharVectorEntry(sessionId, idx) {
    const cache = window.__memHubCharVectorCandidatesCache && window.__memHubCharVectorCandidatesCache[sessionId];
    if (!cache || !cache[idx]) return;
    delete cache[idx].ref.embVec;
    saveAllData();
    renderMemoryHubVectorMemory(sessionId, false);
}

// 专属资料库汇总查看：跟角色编辑页里那份是同一份数据(dataBank)，这里只做只读汇总+删除，上传入口还在角色编辑页
function renderMemoryHubDataBank(charId, isGroup) {
    const wrap = document.getElementById('memHubDataBankWrap');
    const listEl = document.getElementById('memHubDataBankList');
    if (!wrap || !listEl) return;
    if (isGroup) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    const banks = (dataBank || []).filter(d => d.charId == charId);
    if (banks.length === 0) { listEl.innerHTML = '<div style="color:#8b98a5; font-size:13px;">这个角色还没有上传专属资料库文档</div>'; return; }
    listEl.innerHTML = banks.map(b => `
        <div style="display:flex; align-items:center; gap:8px; background:white; padding:8px; border-radius:6px; border:1px solid #eff3f4;">
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:bold;">📄 ${escapeHtml(b.title)}</div>
                <div style="font-size:11px; color:#8b98a5;">已切分 ${b.chunks.length} 个片段 · ${b.chunks.every(c => c.embVec) ? '✅ 已完成向量化' : '⏳ 向量化中...'}</div>
            </div>
            <span style="color:#f91880; cursor:pointer; flex-shrink:0;" onclick="deleteMemHubDataBankEntry('${b.id}')">删除</span>
        </div>`).join('');
}
async function deleteMemHubDataBankEntry(id) {
    if (!(await appConfirm('确定要删除这份资料库文档吗？'))) return;
    dataBank = dataBank.filter(d => d.id !== id);
    saveAllData();
    renderMemoryHubDataBank(currentMemoryHubTargetId, false);
    if (typeof renderCharDataBankList === 'function') renderCharDataBankList(); // 顺手同步一下角色编辑页那份列表，避免过期
}

function renderMemoryHubMvuSnapshot(sessionId) {
    const el = document.getElementById('memHubMvuSnapshot');
    if (!el) return;
    const snapshot = (typeof getMvuStatsScope === 'function') ? getMvuStatsScope(sessionId) : null;
    if (!snapshot || Object.keys(snapshot).length === 0) { el.innerHTML = '<div style="color:#8b98a5; font-size:13px;">还没有识别到任何状态更新数据</div>'; return; }
    el.innerHTML = (typeof renderMvuStatusBarHtml === 'function') ? renderMvuStatusBarHtml(snapshot) : '';
}


async function checkAndAutoSummarizeChat(sessionId) {
    if (typeof isAutoOn === 'function' && !isAutoOn('chatSummary')) return;   // 🔌 设置里关掉了「聊天自动总结」
    if (sessionId.toString().startsWith('g_')) { checkAndAutoSummarizeGroupChat(sessionId); return; }
    let session = globalChats[sessionId]; if (!session || session.length === 0) return;
    
    let validMsgs = session.filter(m => m.sender !== 'system');
    const interval = chatSummaryInterval || 20;
    if (validMsgs.length === 0 || validMsgs.length % interval !== 0) return;

    let char = myCharacters.find(c => c.id == sessionId);
    const api = getApiConfig(true); if (!char || !api.key) return;

    let recent20 = validMsgs.slice(-interval).map(m => (m.sender === 'me' ? "用户: " : char.name + ": ") + m.text).join('\n');
    let prompt = buildStructuredMessages('你是一个擅长提炼对话要点的助手，只输出总结本身，不要任何多余说明。',
        [], `请简要总结以下用户与"${char.name}"的最近${interval}条对话内容，提取出关键信息、当前话题和双方的情感状态（100字以内）。\n\n对话记录：\n${recent20}`);

    try {
        let data = await callChatCompletionAPI(api, prompt);
        if(data.error) return; 
        let newSummary = data.choices?.[0]?.message?.content?.trim() || ""; if(!newSummary) return;
        
        // 数组化存储，加入时间戳，最多保留 20 轮
        let summaryArr = char.chatSummary ? char.chatSummary.split('\n').filter(line => line.trim()) : [];
        summaryArr.push(`[${new Date().toLocaleString()}] ${newSummary}`);
        if (summaryArr.length > 20) {
            summaryArr = summaryArr.slice(summaryArr.length - 20); // 剔除最早的记忆
        }
        char.chatSummary = summaryArr.join('\n');
        saveAllData();
    } catch(e) { console.error("聊天总结失败", e); }
}

// 群聊版的"聊天总结"：配置方式和角色个人聊天总结一样（数组化+时间戳+上限20条），
// 区别只是触发频率改成每50条消息一次（群聊人多话多，20条太频繁），总结存在群聊对象自己的 summary 字段上，
// 不属于任何单个角色，这样群里每个成员发推文时都能读到同一份"群聊话题"。
async function checkAndAutoSummarizeGroupChat(sessionId) {
    if (typeof isAutoOn === 'function' && !isAutoOn('chatSummary')) return;   // 🔌 跟单聊共用「聊天自动总结」这一个开关
    let group = groupChats.find(g => g.id === sessionId); if (!group) return;
    let session = globalChats[sessionId]; if (!session || session.length === 0) return;

    let validMsgs = session.filter(m => m.sender !== 'system');
    const gInterval = groupSummaryInterval || 50;
    if (validMsgs.length === 0 || validMsgs.length % gInterval !== 0) return;

    const api = getApiConfig(true); if (!api.key) return;

    let recent50 = validMsgs.slice(-gInterval).map(m => {
        if (m.sender === 'me') return `${currentUser.name}: ${m.text}`;
        let c = myCharacters.find(c => c.id == m.sender);
        return (c ? c.name : m.sender) + ': ' + m.text;
    }).join('\n');
    let prompt = buildStructuredMessages('你是一个擅长提炼对话要点的助手，只输出总结本身，不要任何多余说明。',
        [], `请简要总结以下群聊"${group.name}"最近${gInterval}条对话内容，提取出当前热门话题、群里的氛围、以及各人的主要观点或立场（150字以内）。\n\n对话记录：\n${recent50}`);

    try {
        let data = await callChatCompletionAPI(api, prompt);
        if (data.error) return;
        let newSummary = data.choices?.[0]?.message?.content?.trim() || ""; if (!newSummary) return;

        // 数组化存储，加入时间戳，最多保留 20 条
        let summaryArr = group.summary ? group.summary.split('\n').filter(line => line.trim()) : [];
        summaryArr.push(`[${new Date().toLocaleString()}] ${newSummary}`);
        if (summaryArr.length > 20) {
            summaryArr = summaryArr.slice(summaryArr.length - 20);
        }
        group.summary = summaryArr.join('\n');
        saveAllData();
    } catch (e) { console.error("群聊总结失败", e); }
}

// 角色在群聊里参与的话题，拼进发帖/发言的prompt里，让角色"记得"群里最近在聊什么
function getCharGroupChatTopics(char) {
    if (!char || !groupChats || groupChats.length === 0) return '';
    let myGroups = groupChats.filter(g => Array.isArray(g.members) && g.members.includes(char.id) && g.summary);
    if (myGroups.length === 0) return '';
    return myGroups.map(g => {
        let entries = g.summary.split('\n').filter(l => l.trim());
        let lastEntry = entries[entries.length - 1] || '';
        let cleanEntry = lastEntry.replace(/^\[[^\]]*\]\s*/, ''); // 去掉时间戳前缀，prompt里不需要
        return `在群聊"${g.name}"里，最近大家在聊：${cleanEntry}`;
    }).join('\n');
}

async function updateCharMemoryAsync(char) {
    if (typeof isAutoOn === 'function' && !isAutoOn('postMemory')) return;   // 🔌 设置里关掉了「推文记忆自动总结」
    const api = getApiConfig(false); if (!api.key) return;
    const interval = postMemoryInterval || 20;
    const posts = getCharRecentPosts(char.id, interval); if (posts.length === 0) return;
    const prompt = `你是记忆管理AI。请用100字以内，总结推特用户"${char.name}"（人设：${char.persona}）最近${interval}条帖子的关注点、情绪和经历规律：\n${posts.map((p, i) => `${i+1}. ${p.text}`).join('\n')}`;

    try {
        const data = await sendChatRequest(api, prompt, { max_tokens: 1200 });
        let newSum = data.choices?.[0]?.message?.content?.trim();
        if(newSum) {
            // 数组化存储，加入时间戳，最多保留 20 轮
            let memoryArr = char.memorySummary ? char.memorySummary.split('\n').filter(line => line.trim()) : [];
            memoryArr.push(`[${new Date().toLocaleString()}] ${newSum}`);
            if (memoryArr.length > 20) {
                memoryArr = memoryArr.slice(memoryArr.length - 20);
            }
            char.memorySummary = memoryArr.join('\n');
            saveAllData();
        }
    } catch(e) { console.error("推文总结失败", e); }
}

// 频率字段（{interval, unit, count}）→ 加了随机抖动的实际毫秒间隔。interval<=0 或没配置时表示"不启用这项自动行为"。
function calcDynamicFreqMs(freq) {
    if (!freq || typeof freq.interval !== 'number' || freq.interval <= 0) return null;
    let baseReqMs = freq.interval * (freq.unit === 'minute' ? 60000 : freq.unit === 'hour' ? 3600000 : 86400000);
    let jitter = (Math.random() - 0.5) * 0.4 * baseReqMs; // +/- 20% 随机波动，避免每次都卡在同一时间点触发
    return baseReqMs + jitter;
}

function startAutoPostTimer() {
    setInterval(async () => {
        if (!myApiKey || isGenerating) return;
        if (typeof isAutoOn === 'function' && !isAutoOn('autoPost')) return;   // 🔌 设置里关掉了「角色自动发帖」
        let now = Date.now(), charsToPost = [], charsToForumPost = [], charsToAnonPost = [];

        for (let char of myCharacters) {
          try {
            // 0. 兜底：防止个别角色（老存档/角色卡导入等）缺失发帖频率字段时，这里抛出异常
            //    导致整个 for 循环中断，进而让"所有"角色都生成不了推文。
            if (!char.postFreq || typeof char.postFreq.interval !== 'number') char.postFreq = { interval: 1, unit: 'day', count: 1 };

            // 1. 计算基础毫秒间隔
            let baseReqMs = char.postFreq.interval * (char.postFreq.unit === 'minute' ? 60000 : char.postFreq.unit === 'hour' ? 3600000 : 86400000);

            // 2. 引入随机抖动 (Random Jitter)
            // 这里设置 +/- 20% 的随机波动范围，使每次发帖时间都不固定
            let jitter = (Math.random() - 0.5) * 0.4 * baseReqMs;
            let dynamicReqMs = baseReqMs + jitter;

            if (!char.lastPostTime) char.lastPostTime = now;

            // 3. 使用动态计算的间隔进行判断
            if (now - char.lastPostTime >= dynamicReqMs) {
                char.lastPostTime = now;
                for(let k = 0; k < (char.postFreq.count || 1); k++) charsToPost.push(char);
            }

            // 4. 论坛(forumThreads)自主发帖：跟首页推文同一套"到点了就发"的判定逻辑，只是频率字段/时间戳分开各自独立计时，
            //    interval配成0（默认值）就是没开启这个角色的这项行为，理论上原来的角色不会平白多出这个动作。
            if (char.forumPostFreq) {
                let forumDynamicMs = calcDynamicFreqMs(char.forumPostFreq);
                if (forumDynamicMs !== null) {
                    if (!char.lastForumPostTime) char.lastForumPostTime = now;
                    if (now - char.lastForumPostTime >= forumDynamicMs) {
                        char.lastForumPostTime = now;
                        charsToForumPost.push(char);
                    }
                }
            }

            // 5. 匿名论坛自主发帖：同上，独立的频率字段和时间戳
            if (char.anonPostFreq) {
                let anonDynamicMs = calcDynamicFreqMs(char.anonPostFreq);
                if (anonDynamicMs !== null) {
                    if (!char.lastAnonPostTime) char.lastAnonPostTime = now;
                    if (now - char.lastAnonPostTime >= anonDynamicMs) {
                        char.lastAnonPostTime = now;
                        charsToAnonPost.push(char);
                    }
                }
            }
          } catch (e) { console.error(`角色"${char && char.name}"的发帖计时器计算出错，已跳过：`, e); }
        }

        if (charsToPost.length > 0 && typeof executeGeneration === 'function') {
            await executeGeneration(charsToPost.slice(0, 3));
        }
        // 论坛/匿名论坛这两项各自最多同时处理2个角色，避免某一轮刚好一堆角色同时到点、一次性糊一堆请求出去
        if (charsToForumPost.length > 0 && typeof autoGenerateForumThreadForChar === 'function') {
            for (const char of charsToForumPost.slice(0, 2)) { await autoGenerateForumThreadForChar(char); }
            saveAllData();
        }
        if (charsToAnonPost.length > 0 && typeof autoGenerateAnonPostForChar === 'function') {
            for (const char of charsToAnonPost.slice(0, 2)) { await autoGenerateAnonPostForChar(char); }
            saveAllData();
        }
    }, 15000); // 每15秒轮询一次检测
}
// ===================== 🫀 活人感：不总是在线 / 情绪惯性 / 语言指纹 =====================
// 三件事各有各的开关（AUTO_FEATURE_DEFS 里的 aliveOffline / aliveMood / aliveVoice），
// **默认全关**——一个都不打开的话，app 的行为跟加这段代码之前一模一样。
//
// 设计上的一个反直觉点：第一项（不总是在线）是**省钱**的。以前"用户发一条 → 调一次 API"，
// 开了之后角色忙碌期里你发的十条会攒成一次调用。真实感和账单在这一项上是同向的。

const ALIVE_BUSY_RE = /手术|开会|会议|上课|讲课|上班|工作|加班|值班|夜班|出诊|查房|坐诊|开车|赶路|在路上|通勤|演出|拍摄|排练|录制|训练|比赛|考试|应酬|谈判|出差|执勤|巡逻|洗澡|健身|做饭|面试|加课|实验|写稿|赶稿|闭关/;
const ALIVE_SLEEP_RE = /睡|眠|午休|打盹|躺下|休息中|歇着/;

// 今天的日程解析成 [{min, text}]（min = 从 00:00 起的分钟数），跟行程插件里那套是同一个思路
function aliveScheduleLines(char) {
    const t = (char && char.schedule && char.schedule.text) || '';
    if (!t) return [];
    const out = [];
    t.split('\n').forEach(line => {
        const m = line.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
        if (!m) return;
        const h = parseInt(m[1]), mi = parseInt(m[2]);
        if (isNaN(h) || isNaN(mi) || h > 23 || mi > 59) return;
        out.push({ min: h * 60 + mi, text: line.replace(/^[^\d]*\d{1,2}\s*[:：]\s*\d{2}\s*/, '').trim() || line.trim() });
    });
    return out.sort((a, b) => a.min - b.min);
}
// 此刻处在日程的哪一行，以及这一行大概什么时候结束
function aliveNowLine(char) {
    const lines = aliveScheduleLines(char);
    if (!lines.length) return null;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    let idx = -1;
    for (let i = 0; i < lines.length; i++) if (lines[i].min <= cur) idx = i;
    if (idx < 0) return null;
    const endMin = lines[idx + 1] ? lines[idx + 1].min : 24 * 60;
    const end = new Date(now); end.setHours(0, 0, 0, 0);
    return { text: lines[idx].text, end: end.getTime() + endMin * 60000 };
}
function aliveInSleepWindow(now) {
    const h = now.getHours();
    const s = Math.min(23, Math.max(0, parseInt(aliveSettings.sleepStart)));
    const e = Math.min(23, Math.max(0, parseInt(aliveSettings.sleepEnd)));
    if (s === e) return false;
    return s < e ? (h >= s && h < e) : (h >= s || h < e);
}
function aliveWakeTime(now) {
    const e = Math.min(23, Math.max(0, parseInt(aliveSettings.sleepEnd)));
    const d = new Date(now);
    if (now.getHours() < e) d.setHours(e, 0, 0, 0);
    else { d.setDate(d.getDate() + 1); d.setHours(e, 0, 0, 0); }
    // 不是闹钟一响就摸手机，随机赖床 0~40 分钟
    return d.getTime() + Math.floor(Math.random() * 40) * 60000;
}

// 这个角色此刻在不在？返回 null ＝ 有空，能立刻回
function aliveStateOf(char) {
    if (!char) return null;
    const now = new Date();
    const ls = char.lifeState || {};
    // 状态气泡超过 3 小时没更新就不作数了，免得拿半天前的"在手术"把人锁到晚上
    const fresh = ls.updatedAt && (Date.now() - ls.updatedAt < 3 * 3600000);
    const label = fresh ? (ls.statusTypeLabel || '') : '';
    const act = fresh ? (ls.activity || '') : '';
    const line = aliveNowLine(char);
    const lineTxt = line ? line.text : '';
    const lineBusy = lineTxt && ALIVE_BUSY_RE.test(lineTxt) && !ALIVE_SLEEP_RE.test(lineTxt);

    // 1）睡着了。日程明写着这会儿在忙（比如夜班）就不算睡——日程比时钟可信。
    if (!lineBusy && (label === '睡觉' || ALIVE_SLEEP_RE.test(act) || ALIVE_SLEEP_RE.test(lineTxt) || aliveInSleepWindow(now))) {
        return { kind: 'sleep', why: act || lineTxt || '在睡觉', until: aliveWakeTime(now) };
    }
    // 2）在忙
    if (label === '忙' || ALIVE_BUSY_RE.test(act) || lineBusy) {
        const until = line ? line.end : Date.now() + Math.round(20 + Math.random() * 70) * 60000;
        return { kind: 'busy', why: act || lineTxt || '在忙', until };
    }
    return null;
}

function aliveIsUrgent(text) {
    const raw = String(aliveSettings.urgentWords || '');
    const words = raw.split(/[,，;；\s]+/).map(w => w.trim()).filter(Boolean);
    if (!words.length) return false;
    const t = String(text || '');
    return words.some(w => t.includes(w));
}

// 主聊天回复入口的门卫。返回：
//   {hold:true}                        → 这一轮别调 API，消息挂起
//   {hold:false, text, catchUp}        → 照常回，但可能是"补回"（把挂起的一起带上）
function aliveGate(sessionId, triggerText) {
    try {
        if (typeof isAutoOn !== 'function' || !isAutoOn('aliveOffline')) return null;
        if (String(sessionId).startsWith('g_')) return null;   // 群聊不挂起：一个人忙就整群卡住太怪
        const char = myCharacters.find(c => c.id == sessionId);
        if (!char) return null;
        if (char.aliveAlwaysOn) return null;                   // 这个角色单独设了"永远在线"

        const q = aliveHeld[sessionId];
        // 急事：把之前挂着的一起翻出来，立刻回
        if (aliveIsUrgent(triggerText)) {
            if (q && q.texts.length) {
                const all = q.texts.concat([triggerText]);
                const mins = Math.round((Date.now() - q.since) / 60000);
                delete aliveHeld[sessionId];
                aliveSyncUI(sessionId);
                return { hold: false, text: all.join('\n'), catchUp: { kind: q.kind, why: q.why, mins, n: all.length, urgent: true } };
            }
            return null;
        }
        // 已经挂着了，就继续往里堆，别再判断一次状态（免得状态刚好翻篇导致半截回复）
        if (q) {
            q.texts.push(triggerText);
            if (typeof saveAllData === 'function') saveAllData();
            aliveSyncUI(sessionId);
            return { hold: true };
        }
        const st = aliveStateOf(char);
        if (!st) return null;
        const min = Math.max(0, parseFloat(aliveSettings.minDelay) || 0);
        const max = Math.max(min, parseFloat(aliveSettings.maxDelay) || min);
        const pad = (min + Math.random() * (max - min)) * 60000;
        const cap = Date.now() + Math.max(1, parseFloat(aliveSettings.maxHold) || 12) * 3600000;
        aliveHeld[sessionId] = {
            charId: char.id, texts: [triggerText], since: Date.now(),
            until: Math.min(cap, st.until + pad), kind: st.kind, why: st.why
        };
        // 💤 角色资料页里那句「忙碌自动回复」——这个字段一直存着，但**从来没有任何代码读过它**
        //    （数据体检时用运行时探针测出来的）。挂起消息正是它本来该干的事：像微信自动回复
        //    那样先顶一句，人回来了再真的回。一条挂起周期只发一次，字段留空就完全没有这回事。
        try {
            const auto = String(char.busyAutoReplyText || '').trim();
            if (auto && aliveSettings.useBusyReply !== false && typeof globalChats !== 'undefined') {
                if (!globalChats[sessionId]) globalChats[sessionId] = [];
                globalChats[sessionId].push({ sender: char.id, text: auto, timestamp: Date.now(), readBy: [], isBusyAuto: true });
                aliveHeld[sessionId].autoSent = true;
                if (typeof renderChatMessages === 'function') renderChatMessages();
            }
        } catch (e) {}
        if (typeof saveAllData === 'function') saveAllData();
        aliveSyncUI(sessionId);
        return { hold: true };
    } catch (e) { console.warn('[活人感] 判断在不在线出错，按"在线"处理：', e); return null; }
}

// 每分钟看一眼有没有该补回的（纯本地，不花钱）
function aliveTick() {
    try {
        if (typeof isAutoOn !== 'function' || !isAutoOn('aliveOffline')) return;
        const now = Date.now();
        Object.keys(aliveHeld).forEach(sid => {
            const q = aliveHeld[sid];
            if (!q || !q.texts || !q.texts.length) { delete aliveHeld[sid]; return; }
            if (q.until > now) return;
            const texts = q.texts.slice();
            const mins = Math.round((now - q.since) / 60000);
            delete aliveHeld[sid];
            if (typeof saveAllData === 'function') saveAllData();
            aliveSyncUI(sid);
            if (typeof triggerAIBatchReply === 'function')
                triggerAIBatchReply(sid, texts.join('\n'), { kind: q.kind, why: q.why, mins, n: texts.length, autoSent: !!q.autoSent });
        });
    } catch (e) { console.warn('[活人感] 补回检查出错：', e); }
}

// 「让 TA 现在就回」——不等了，立刻补回
function aliveReplyNow(sessionId) {
    const q = aliveHeld[sessionId];
    if (!q) return;
    q.until = 0;
    aliveTick();
}
// 这个角色单独设成"永远在线"（不受挂起影响）
function aliveToggleAlwaysOn(charId, on) {
    const c = myCharacters.find(x => x.id == charId);
    if (!c) return;
    c.aliveAlwaysOn = !!on;
    if (on && aliveHeld[String(charId)]) aliveReplyNow(String(charId));
    if (typeof saveAllData === 'function') saveAllData();
    aliveSyncUI(String(charId));
    if (typeof renderAlivePanel === 'function') renderAlivePanel();
}

// 补回时那段"你刚才不在"的说明
function aliveCatchUpPrompt(cu) {
    if (!cu) return '';
    const auto = cu.autoSent ? '刚才对方只收到了你设的那句自动回复，不是你本人在说话——现在是你真的回话。\n' : '';
    const dur = cu.mins >= 60 ? '大概 ' + (Math.round(cu.mins / 6) / 10) + ' 小时'
              : cu.mins >= 3 ? '大概 ' + cu.mins + ' 分钟'
              : '有一会儿';
    return `\n【⚠️ 你刚才不在】：你刚才${cu.kind === 'sleep' ? '在睡觉' : '在忙'}（${cu.why}），${dur}没看手机。
下面那${cu.n > 1 ? cu.n + ' 条' : '条'}消息是你不在的这段时间里对方陆续发来的，你**现在才第一次看到**。
${cu.urgent ? '而且对方这条听着像有急事，你是被这条叫回来的。\n' : ''}${auto}按真人的样子回：先把这段时间差自然地交代一下（"刚下台"/"刚醒"/"开完会才看到"这种），然后一起回应这段时间里的内容——不要一条一条机械地答，人是整体看完再说话的。
交代多少、要不要解释、要不要道歉，完全由你的性格和你们的关系决定；冷淡的人可能一个字都不解释。
不要装作这些消息是刚刚才发来的。\n`;
}

// ---------- 情绪惯性 ----------
function aliveMoodValue(char) {
    const m = char && char.mood;
    if (!m || !m.at || typeof m.v !== 'number') return 0;
    const hrs = (Date.now() - m.at) / 3600000;
    const hl = Math.max(0.5, parseFloat(aliveSettings.moodHalfLife) || 8);
    const v = m.v * Math.pow(0.5, hrs / hl);
    return Math.abs(v) < 0.4 ? 0 : v;    // 衰减到快没了就当没了
}
function aliveCaptureMood(char, parsed) {
    try {
        if (typeof isAutoOn !== 'function' || !isAutoOn('aliveMood')) return;
        if (!char || !parsed) return;
        const raw = parsed.mood;
        if (raw === undefined || raw === null || raw === '') return;
        const v = parseFloat(raw);
        if (isNaN(v)) return;
        const why = String(parsed.moodWhy || '').trim().slice(0, 40);
        // 跟还没散掉的旧情绪加权混合，避免一轮一个极端来回甩
        const old = aliveMoodValue(char);
        const nv = Math.max(-5, Math.min(5, v * 0.7 + old * 0.3));
        char.mood = { v: nv, why: why || ((char.mood && char.mood.why) || ''), at: Date.now() };
    } catch (e) { /* 情绪没抓到不影响这一轮回复 */ }
}
function aliveMoodPrompt(char) {
    try {
        if (typeof isAutoOn !== 'function' || !isAutoOn('aliveMood')) return '';
        const v = aliveMoodValue(char);
        if (!v) return '';
        const m = char.mood || {};
        const hrs = (Date.now() - (m.at || 0)) / 3600000;
        const ago = hrs < 1 ? '刚才' : (hrs < 24 ? Math.round(hrs) + ' 小时前' : Math.round(hrs / 24) + ' 天前');
        const a = Math.abs(v);
        const lvl = a >= 3.5 ? '很' : a >= 2 ? '还挺' : '有点';
        const dir = v > 0 ? '高兴、心里舒服' : '不痛快、别扭';
        return `\n【你现在的情绪余温】：你${lvl}${dir}，这是${ago}留下来的${m.why ? '——起因是：' + m.why : ''}。
这股情绪还没散干净，它会不自觉地渗进你这一轮的语气、用词、耐心和回复长度里。不是要你把它说出来，也不是每句都提；是"人吵完架半小时内说话就是硬一点"这种自然的残留。
如果这一轮发生的事足以冲掉它（对方哄好了、或者又踩到了），就让它变，不用硬维持。\n`;
    } catch (e) { return ''; }
}
// 追加到聊天 JSON 格式说明后面的那两个字段
function aliveMoodFormatNote() {
    try {
        if (typeof isAutoOn !== 'function' || !isAutoOn('aliveMood')) return '';
        return `\n【额外字段·情绪】：在上面那个 JSON 里再多两个字段 "mood" 和 "moodWhy"。
"mood" 是 -5 到 5 的数字，表示**这一轮结束时你对对方的情绪**（-5 很不痛快，0 平静，5 很高兴）。按你的人设诚实给，不要一律给正数——被敷衍了就是负的。
"moodWhy" 用不超过 15 个字说明为什么。
例：{"replies":[...], "stateUpdate":"...", "mood": -2, "moodWhy": "又拿工作搪塞我"}\n`;
    } catch (e) { return ''; }
}

// ---------- 语言指纹 ----------
// 从角色**自己写过的东西**里收样本：推文、聊天里 TA 说的话、日记信件论坛小说
function aliveVoiceSamples(char) {
    const out = [];
    try {
        (typeof globalPosts !== 'undefined' ? globalPosts : []).forEach(p => {
            if (p && p.char && p.char.id == char.id && p.text) out.push(p.text);
        });
        const chat = (typeof globalChats !== 'undefined' ? globalChats[String(char.id)] : null) || [];
        chat.forEach(m => { if (m && m.sender !== 'me' && m.text) out.push(m.text); });
        if (char.diaryData) {
            (char.diaryData.diaries || []).forEach(d => { if (d.content) out.push(d.content); });
            (char.diaryData.letters || []).forEach(d => { if (d.content) out.push(d.content); });
        }
        (typeof forumThreads !== 'undefined' ? forumThreads : []).forEach(th => {
            if (th.authorCharId == char.id && th.content) out.push(th.content);
            (th.replies || []).forEach(r => { if (r.charId == char.id && r.content) out.push(r.content); });
        });
    } catch (e) {}
    // 太短的没有风格信息，且去重
    return [...new Set(out.map(t => String(t).trim()).filter(t => t.length >= 4))];
}
let aliveVoiceBusy = false;
async function aliveExtractVoice(charId) {
    const char = myCharacters.find(c => c.id == charId);
    const status = (msg) => { const el = document.getElementById('aliveVoiceStatus'); if (el) el.innerText = msg; };
    if (!char) return;
    if (aliveVoiceBusy) { status('还在提取上一个，等一下。'); return; }
    const samples = aliveVoiceSamples(char);
    if (samples.length < 8) { status(`${char.name} 自己写的东西还太少（只找到 ${samples.length} 条，至少要 8 条）。让 TA 多发点推文、多聊几句再来提。`); return; }
    const api = (typeof getApiConfig === 'function') ? getApiConfig(true) : null;
    if (!api || !api.key) { status('还没配 API Key。'); return; }

    aliveVoiceBusy = true;
    status(`正在读 ${char.name} 写过的 ${samples.length} 条……`);
    try {
        const body = samples.slice(-120).map((t, i) => `${i + 1}. ${t.replace(/\s+/g, ' ').slice(0, 160)}`).join('\n');
        const ask = `下面是"${char.name}"这个人自己写过的话（推文、聊天、日记、帖子）。
请**只分析形式，不分析内容**，总结出这个人打字长什么样，写成一份可以直接拿去照着写的说明。要具体到能照做：

1. 句子长度：一般多少字一句？会不会写长句？
2. 标点：句尾用不用句号？爱不爱用省略号/破折号/波浪号/感叹号？会不会连着好几个？用不用问号反问？
3. 断句和分条：一次说完还是拆成好几条短的？
4. 口头禅、常用词、语气词（"嗯""行吧""得了""……吧"这种），列出实际出现过的原词。
5. 称呼习惯：怎么称呼对方、怎么自称。
6. 表情/颜文字：用不用？用哪种？
7. 有没有什么固定的小毛病：爱打错字、爱用英文词、爱省主语、说话爱带停顿。
8. 最不像 TA 的写法是什么（比如"绝不会用感叹号""从不说'亲爱的'"）。

不要写人设分析、不要写性格评价、不要写"这体现了 TA 的……"，只写打字习惯本身。
300 字以内，分条写，直接输出，不要开场白。

【样本】
${body}`;
        const data = await callChatCompletionAPI(api, ask);
        if (data && data.error) { status('模型报错：' + (data.error.message || '未知')); return; }
        let txt = (data.choices?.[0]?.message?.content || '').trim();
        if (typeof stripReasoningBlocks === 'function') txt = stripReasoningBlocks(txt);
        if (!txt) { status('模型这次没给出东西，再点一次试试。'); return; }
        char.voicePrint = { text: txt.slice(0, 900), at: Date.now(), n: samples.length };
        if (typeof saveAllData === 'function') saveAllData();
        status(`${char.name} 的语言指纹提好了（读了 ${samples.length} 条）。`);
        if (typeof renderAlivePanel === 'function') renderAlivePanel();
    } catch (e) {
        status('提取失败：' + (e.message || e));
    } finally {
        aliveVoiceBusy = false;
    }
}
function aliveVoicePrompt(char) {
    try {
        if (typeof isAutoOn !== 'function' || !isAutoOn('aliveVoice')) return '';
        const vp = char && char.voicePrint;
        if (!vp || !vp.text) return '';
        return `\n【你的打字习惯（从你自己以前说过的话里总结出来的，务必照着来）】：\n${vp.text}\n这写的是"你打字长什么样"，不是内容要求——不管这一轮聊什么，句子长短、标点、断句、口头禅、要不要用表情，都保持成这个样子。\n`;
    } catch (e) { return ''; }
}
function aliveSaveVoice(charId) {
    const char = myCharacters.find(c => c.id == charId);
    const el = document.getElementById('aliveVoiceEdit');
    if (!char || !el) return;
    const t = el.value.trim();
    if (t) char.voicePrint = { text: t.slice(0, 900), at: Date.now(), n: (char.voicePrint && char.voicePrint.n) || 0 };
    else delete char.voicePrint;
    if (typeof saveAllData === 'function') saveAllData();
    if (typeof renderAlivePanel === 'function') renderAlivePanel();
    const st = document.getElementById('aliveVoiceStatus'); if (st) st.innerText = t ? '改好了。' : '已经清掉了。';
}

// 挂起状态变了就刷一下界面（聊天页顶上的提示条 + 活人感面板）
function aliveSyncUI(sessionId) {
    try {
        if (typeof renderAliveBar === 'function') renderAliveBar();
        if (typeof renderAlivePanel === 'function' && document.getElementById('setPanel-alive')
            && document.getElementById('setPanel-alive').style.display !== 'none') renderAlivePanel();
        if (typeof renderChatCharList === 'function') renderChatCharList();
    } catch (e) {}
}

// ---------- 🫀 记忆会褪色 ----------
// 现在的聊天总结是"永不褪色的完美档案"：一个月前的细节和昨天的一样清楚。
// 真人不是这样——近的清楚、远的模糊、情绪强的不容易忘。这里按时间分层压缩，
// 并且明确告诉角色"你确实记不清了"，让它敢说"好像是…吧"，而不是硬编一个细节出来。
// 副作用是省钱：老总结被压到 26 字，同样的字数能往回记更多轮。
const ALIVE_STRONG_RE = /吵|哭|生气|发火|冷战|翻脸|分手|告白|表白|喜欢你|爱你|第一次|答应|承诺|道歉|对不起|受伤|生病|住院|去世|走了|骗|吻|抱|留下来|别走|求你|发誓|后悔/;

function aliveSummaryLines(summaryStr) {
    return (summaryStr || '').split('\n').filter(l => l.trim()).map(line => {
        const m = line.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
        let at = null, body = line.trim();
        if (m) {
            body = m[2].trim();
            const t = Date.parse(m[1].replace(/\//g, '-').replace(/-(\d)-/g, '-0$1-'));
            const t2 = isNaN(t) ? Date.parse(m[1]) : t;
            if (!isNaN(t2)) at = t2;
        }
        return { at, body, raw: line.trim() };
    });
}
function aliveFadeOne(it, now) {
    // 没有时间戳的当"最近"处理，别把老存档里没戳的记忆一刀砍没
    const days = it.at ? (now - it.at) / 86400000 : 0;
    const strong = ALIVE_STRONG_RE.test(it.body);
    const clear = Math.max(0.5, parseFloat(aliveSettings.fadeClear) || 3);
    const blur = Math.max(clear + 1, parseFloat(aliveSettings.fadeBlur) || 14);
    // 情绪强的往"年轻"挪一档：吵过的架、说过的重话，隔很久也记得清
    const d = strong ? days / 3 : days;
    const when = it.at ? (() => { const x = new Date(it.at); return `${x.getMonth() + 1}月${x.getDate()}日`; })() : '记不清哪天';
    if (d < clear) return `· ${when}（清楚）${it.body}`;
    if (d < blur) return `· ${when}（大概记得）${it.body.slice(0, 60)}${it.body.length > 60 ? '…' : ''}`;
    return `· ${when}（只剩个印象）${it.body.slice(0, 26)}${it.body.length > 26 ? '…' : ''}`;
}
// 开着开关时用这一份替换原来那段"历史聊天总结"
function aliveFadedSummaryBlock(char) {
    try {
        if (typeof isAutoOn !== 'function' || !isAutoOn('aliveFade')) return null;
        if (!char || !char.chatSummary) return null;
        const depth = Math.max(1, Math.min(20, parseInt(aliveSettings.fadeDepth) || 8));
        let list = aliveSummaryLines(char.chatSummary);
        if (!list.length) return null;
        list = list.slice(-depth);
        const now = Date.now();
        const body = list.map(it => aliveFadeOne(it, now)).join('\n');
        const anyFaded = /（大概记得）|（只剩个印象）/.test(body);
        return `\n【你对你们聊过的事的记忆（越往前越模糊，这就是你真实的记忆状态）】：\n${body}\n`
            + (anyFaded ? `【关于这些记忆】：标着"大概记得""只剩个印象"的，你是**真的想不起细节了**。提到它们的时候要带着不确定——"好像是……吧""具体记不清了""是不是那次来着"——不要把模糊的当确凿的讲，更不要为了把话说圆自己补一个细节出来。对方要是纠正你，就接受纠正，记错本来就是正常的。标着"清楚"的那几条才是你有把握的。\n` : '')
            + `这些都是已经聊过、翻篇的旧事，除非跟当下自然衔接，否则别主动把话题拉回去。\n`;
    } catch (e) { return null; }
}

// ---------- 🫀 身上的状态 ----------
// 完全本地推算，一次 API 都不调：从日程和当前时间里推出累/困/饿/上头/刚动完。
const ALIVE_MEAL_RE = /吃|饭|餐|食堂|外卖|下馆子|早点|夜宵/;
const ALIVE_DRINK_RE = /酒|宴|应酬|喝一杯|酒局|庆功/;
const ALIVE_SPORT_RE = /跑步|健身|游泳|打球|训练|爬山|骑车/;
function aliveBodyState(char) {
    const out = [];
    try {
        if (typeof isAutoOn !== 'function' || !isAutoOn('aliveBody')) return out;
        const now = new Date();
        const cur = now.getHours() * 60 + now.getMinutes();
        const lines = (typeof aliveScheduleLines === 'function') ? aliveScheduleLines(char) : [];
        const past = lines.filter(l => l.min <= cur);

        // 累：今天从第一件事到现在过了多久 + 这中间有几段是"忙"的
        if (past.length) {
            const upHours = (cur - past[0].min) / 60;
            const busyN = past.filter(l => ALIVE_BUSY_RE.test(l.text)).length;
            if (upHours >= 10 || busyN >= 3) out.push({ k: 'tired', t: `很累（今天从 ${Math.floor(past[0].min / 60)} 点忙到现在，${busyN} 段是连轴的）` });
            else if (upHours >= 6 || busyN >= 2) out.push({ k: 'tired', t: `有点累（已经过了 ${Math.round(upHours)} 小时了）` });
        }
        // 饿：上一顿是什么时候
        const meals = past.filter(l => ALIVE_MEAL_RE.test(l.text));
        if (meals.length) {
            const gap = (cur - meals[meals.length - 1].min) / 60;
            if (gap >= 7) out.push({ k: 'hungry', t: `很饿（上一顿是 ${Math.round(gap)} 小时前）` });
            else if (gap >= 5) out.push({ k: 'hungry', t: `有点饿（上一顿是 ${Math.round(gap)} 小时前）` });
        } else if (lines.length && cur >= 13 * 60 && cur < 22 * 60) {
            out.push({ k: 'hungry', t: '今天还没正经吃过东西' });
        }
        // 困：快到平时睡的点了，或者已经过点还醒着
        const s = Math.min(23, Math.max(0, parseInt(aliveSettings.sleepStart)));
        const toSleep = ((s * 60 - cur) + 1440) % 1440;
        if (toSleep > 1200) out.push({ k: 'sleepy', t: `早就该睡了，硬撑着（比平时晚了 ${Math.round((1440 - toSleep) / 60)} 小时）` });
        else if (toSleep <= 60) out.push({ k: 'sleepy', t: '开始困了，快到平时睡觉的点' });
        // 刚喝过 / 刚动完
        const drink = past.filter(l => ALIVE_DRINK_RE.test(l.text)).pop();
        if (drink && (cur - drink.min) / 60 <= 4) out.push({ k: 'drunk', t: '刚喝过酒，还有点上头' });
        const sport = past.filter(l => ALIVE_SPORT_RE.test(l.text)).pop();
        if (sport && (cur - sport.min) / 60 <= 2) out.push({ k: 'sport', t: '刚运动完，喘着，身上是热的' });
    } catch (e) {}
    return out;
}
function aliveBodyPrompt(char) {
    try {
        const st = aliveBodyState(char);
        if (!st.length) return '';
        const has = k => st.some(x => x.k === k);
        let how = [];
        if (has('tired')) how.push('累的时候话会变短、懒得展开、耐心差，别人说什么都提不起劲');
        if (has('hungry')) how.push('饿会让人烦躁、注意力散、说话没头没尾');
        if (has('sleepy')) how.push('困的时候反应慢半拍，字会打错，可能说着说着就不回了');
        if (has('drunk')) how.push('喝过酒的人话会变多、界限变松、比平时直白');
        if (has('sport')) how.push('刚动完身上是热的、喘着，回消息短促');
        return `\n【你身上此刻的状态（自己感觉得到，但不用专门说出来）】：${st.map(x => x.t).join('；')}。
${how.join('；')}。
让这些自然地渗进你的语气、耐心和回复长度里——**不要专门报告"我好累""我好饿"**，除非对方问起、或者你这个人本来就爱抱怨。\n`;
    } catch (e) { return ''; }
}

// ===================== 🔗 补齐"存了但一直没接上"的那几块 =====================
// 这几个字段一直存在角色身上、也在界面上显示，但**从来没进过 prompt**——
// 是拿运行时探针（给每个字段塞独一无二的记号，再抓四条链路真正发出去的 prompt）
// 一个个测出来的，不是猜的。角色因此不知道自己的简介/所在地/网站/生日，
// 不知道自己属于哪个势力，也不知道自己写过的日记（信件倒是一直有）。
// 三块各有开关（aliveSettings 里），默认都开——这是补洞，不是加功能。

// ① 资料页上写着什么
function getProfileSelfPrompt(char) {
    try {
        if (!char || aliveSettings.knowProfile === false) return '';
        const bits = [];
        if (char.bio && String(char.bio).trim() && String(char.bio).trim() !== String(char.persona || '').trim())
            bits.push(`简介写的是「${String(char.bio).trim().slice(0, 80)}」`);
        if (char.location && String(char.location).trim()) bits.push(`所在地填的是「${String(char.location).trim().slice(0, 30)}」`);
        if (char.website && String(char.website).trim()) bits.push(`挂了一个链接：${String(char.website).trim().slice(0, 60)}`);
        if (char.birthdate && String(char.birthdate).trim()) bits.push(`生日填的是 ${String(char.birthdate).trim().slice(0, 20)}`);
        if (!bits.length) return '';
        return `\n【你账号资料页上是这么写的】：${bits.join('；')}。
这是你对外挂出来的样子——你自己当然知道上面写了什么。被问到、或者话赶话说到的时候答得上来，但别没事主动念一遍。\n`;
    } catch (e) { return ''; }
}

// ② 你属于哪个势力，同一个势力里还有谁
function getFactionSelfPrompt(char) {
    try {
        if (!char || aliveSettings.knowFaction === false) return '';
        const mine = (typeof getCharFactions === 'function') ? getCharFactions(char) : (char.group ? [char.group] : []);
        const facs = (mine || []).filter(Boolean);
        if (!facs.length) return '';
        const mates = (typeof myCharacters !== 'undefined' ? myCharacters : [])
            .filter(c => String(c.id) !== String(char.id))
            .filter(c => {
                const f = (typeof getCharFactions === 'function') ? getCharFactions(c) : (c.group ? [c.group] : []);
                return (f || []).some(x => facs.indexOf(x) >= 0);
            })
            .map(c => c.name).slice(0, 8);
        return `\n【你属于哪边】：${facs.join('、')}。${mates.length ? `同一边的还有：${mates.join('、')}。` : ''}
这是你的立场和归属，不用挂在嘴上，但你说话做事、对谁亲对谁远，本来就受它影响。\n`;
    } catch (e) { return ''; }
}

// ③ 你自己写过的日记（信件一直有，日记一直漏着）
function getDiaryAwarenessPrompt(char, maxN = 3, perChars = 70) {
    try {
        if (!char || !char.diaryData || aliveSettings.knowDiary === false) return '';
        const ds = (char.diaryData.diaries || []).filter(d => d && d.content);
        if (!ds.length) return '';
        const sorted = ds.slice().sort((a, b) => (a.timestamp || a.date || 0) - (b.timestamp || b.date || 0)).slice(-maxN);
        const lines = sorted.map(d => {
            const when = (typeof timeAgo === 'function' && (d.timestamp || d.date)) ? timeAgo(d.timestamp || d.date) : '之前';
            const body = String(d.content).replace(/\s+/g, ' ').trim();
            return `· ${when}：${body.slice(0, perChars)}${body.length > perChars ? '…' : ''}`;
        });
        return `\n【你自己写过的日记（只有你自己看得到）】\n${lines.join('\n')}
日记是你私下写给自己的，里面那些话你没跟任何人说过。它影响你此刻的心境，但**不要当成聊天素材主动端出来**——除非对方已经知道、或者你确实想说了。\n`;
    } catch (e) { return ''; }
}


// ===================== 🧩 内置小功能的 prompt 注入 =====================
// 音乐盒、行程与天气、关系账本、八卦网、随身物、日子、商城这几个原来是插件，
// 各自有一个 `code` 钩子（每次拼 prompt 都跑一遍，返回的字符串直接进 prompt）。
// 内置之后钩子没了，改成它们各自往 window 上挂一个 __gyXxxCtxFor(charId)，
// 这里统一调一遍。写法跟原来的钩子一模一样，只是换了个调用的地方。
//
// 哪个没加载（或者出错）就跳过哪个，不会连累别的——原来插件系统也是这么兜底的。
const GY_BOX_CTX = [
    ['__gymMemoryFor',   '音乐盒'],
    ['__gyMapCtxFor',    '行程与天气'],
    ['__gyRelCtxFor',    '关系账本'],
    ['__gyGossipCtxFor', '八卦网'],
    ['__gyKitCtxFor',    '随身物'],
    ['__gyDaysCtxFor',   '日子'],
    ['__gyMallCtxFor',   '商城'],
    ['__gyWebCtxFor',    '联网探索']
];
function getBoxPrompt(char) {
    if (!char) return '';
    let out = '';
    GY_BOX_CTX.forEach(([fn, name]) => {
        try {
            if (typeof window[fn] !== 'function') return;
            const t = window[fn](char.id);
            if (typeof t === 'string' && t.trim()) out += '\n' + t;
        } catch (e) { console.warn('[小功能] ' + name + ' 注入出错，已跳过：', e); }
    });
    return out;
}
