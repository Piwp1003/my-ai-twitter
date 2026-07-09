let tempCropResults = {}; // 存储各类裁剪临时 Base64 数据
let pendingImportedGreetings = null; // 角色卡导入时读到的候选开场白，等角色保存后挂到角色身上
let siteLogoImg = null;   // 网站左上角 Logo 数据

// 视图历史栈，用于实现返回上一页功能
let viewHistory = ['home'];
function pushViewHistory(viewId) { if (viewHistory[viewHistory.length - 1] !== viewId) viewHistory.push(viewId); }
function popViewHistory() { if (viewHistory.length > 1) viewHistory.pop(); return viewHistory[viewHistory.length - 1]; }
function goBackToPreviousView() {
    const prevView = popViewHistory();
    switchMainView(prevView);
}

// 核心裁剪逻辑
let cropState = { scale: 1, startX: 0, startY: 0, imgX: 0, imgY: 0, isDragging: false, callback: null, aspect: 1, baseW: 0, baseH: 0 };

function handleImageCrop(file, aspect, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const cW = 300; const cH = 300;
            let cutW = 260; let cutH = 260 / aspect;
            if(cutH > 260) { cutH = 260; cutW = 260 * aspect; }
            
            const cutout = document.getElementById('cropCutout');
            cutout.style.width = cutW + 'px'; cutout.style.height = cutH + 'px';
            cutout.style.left = (cW - cutW)/2 + 'px'; cutout.style.top = (cH - cutH)/2 + 'px';
            
            const scaleX = cutW / img.width; const scaleY = cutH / img.height;
            const minScale = Math.max(scaleX, scaleY);
            
            cropState.baseW = img.width * minScale; cropState.baseH = img.height * minScale;
            cropState.scale = 1;
            cropState.imgX = (cW - cropState.baseW)/2; cropState.imgY = (cH - cropState.baseH)/2;
            cropState.aspect = aspect; cropState.callback = callback;
            
            const cropImgElem = document.getElementById('cropImg');
            cropImgElem.src = img.src;
            
            document.getElementById('cropZoom').value = 1;
            updateCropView();
            openModal('cropModal');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function updateCropView() {
    const cropImgElem = document.getElementById('cropImg');
    cropImgElem.style.width = (cropState.baseW * cropState.scale) + 'px';
    cropImgElem.style.height = (cropState.baseH * cropState.scale) + 'px';
    cropImgElem.style.left = cropState.imgX + 'px';
    cropImgElem.style.top = cropState.imgY + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
    const cropZoom = document.getElementById('cropZoom');
    if(cropZoom) {
        cropZoom.addEventListener('input', function(e) {
            let oldScale = cropState.scale; cropState.scale = parseFloat(this.value);
            let centerX = 150, centerY = 150;
            cropState.imgX = centerX - (centerX - cropState.imgX) * (cropState.scale / oldScale);
            cropState.imgY = centerY - (centerY - cropState.imgY) * (cropState.scale / oldScale);
            updateCropView();
        });
    }
    const cropContainer = document.getElementById('cropContainer');
    if(cropContainer) {
        const startDrag = (clientX, clientY) => { cropState.isDragging = true; cropState.startX = clientX - cropState.imgX; cropState.startY = clientY - cropState.imgY; };
        const moveDrag = (clientX, clientY) => { if(!cropState.isDragging) return; cropState.imgX = clientX - cropState.startX; cropState.imgY = clientY - cropState.startY; updateCropView(); };
        const endDrag = () => { cropState.isDragging = false; };
        cropContainer.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY)); window.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY)); window.addEventListener('mouseup', endDrag);
        cropContainer.addEventListener('touchstart', e => { if(e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY); }); window.addEventListener('touchmove', e => { if(e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false}); window.addEventListener('touchend', endDrag);
    }
});

function confirmCrop() {
    const cutout = document.getElementById('cropCutout');
    const cW = parseInt(cutout.style.width); const cH = parseInt(cutout.style.height);
    const cLeft = parseInt(cutout.style.left); const cTop = parseInt(cutout.style.top);
    
    const canvas = document.createElement('canvas');
    canvas.width = cW * 2; canvas.height = cH * 2; // 提升清晰度
    const ctx = canvas.getContext('2d'); ctx.scale(2, 2);
    
    const imgEl = document.getElementById('cropImg');
    const drawX = cropState.imgX - cLeft; const drawY = cropState.imgY - cTop;
    const drawW = cropState.baseW * cropState.scale; const drawH = cropState.baseH * cropState.scale;
    
    ctx.drawImage(imgEl, drawX, drawY, drawW, drawH);
    
    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    closeModal('cropModal');
    if(cropState.callback) cropState.callback(base64);
}

function updateSiteLogo() {
    const container = document.getElementById('siteLogoContainer');
    if (siteLogoImg) {
        container.innerHTML = `<img src="${siteLogoImg}" style="height:32px; width:auto; border-radius:4px; display:block; object-fit:contain; cursor:pointer;">`;
    } else {
        container.innerHTML = `<h2>𝕏 (AI版)</h2>`;
    }
}


const verifiedSVG = `<svg class="verified-badge blue-line-icon" viewBox="0 0 24 24"><polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"></polygon><polyline points="9 12 11 14 15 10"></polyline></svg>`;
const commentSVG = `<svg class="stat-icon blue-line-icon" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
const retweetSVG = `<svg class="stat-icon blue-line-icon" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`;
const likeSVG = `<svg class="stat-icon blue-line-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
const likeSVGFilled = `<svg class="stat-icon blue-line-icon" style="fill:#1d9bf0 !important;" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
const viewSVG = `<svg class="stat-icon blue-line-icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const locationSVG = `<svg class="blue-line-icon" style="width:18px;height:18px;" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
const websiteSVG = `<svg class="blue-line-icon" style="width:18px;height:18px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

// API配置
let myApiUrl = "https://api.deepseek.com", myApiKey = "", myModel = "deepseek-chat"; 
let subApiUrl = "", subApiKey = "", subModel = "";

// 设置及字数限制
let allowActionTags = false; // 控制是否允许动作描写
let memoryAlbum = []; // 回忆相册/高光时刻收藏：[{id, type:'chat'|'post', charId, charName, text, timestamp, note}]
let regexScripts = []; // 正则替换脚本：[{id, name, find, replace, flags, isRegex, target:'ai_output'|'user_input'|'both', enabled}]
let enableVectorMemory = false; // 向量记忆：语义检索历史聊天，而不是只看最近N条
let enableChatScriptExecution = false; // 允许聊天消息里的<script>标签真正执行（有安全风险，默认关闭）
let embeddingModel = 'text-embedding-3-small'; // 向量记忆/资料库共用的 embedding 模型名
let dataBank = []; // 角色专属资料库(RAG)：[{id, charId, title, chunks:[{text, embVec}], createdAt}]
let plugins = []; // 插件系统：[{id, name, description, type:'prompt'|'action'|'macro'|'script', scope:'global'|charId, enabled, promptText, actionLabel, actionPrompt, macroName, macroValue, code}]
let enableBrowserNotifications = false; // 浏览器系统级推送通知
let darkTheme = false; // 深色模式
// ⚡ 上下文预算管理：功能越加越多，prompt容易越滚越大，这几个数字用来控制每次请求塞给AI的字数上限，省token省钱
let worldbookCharBudget = 2000;   // 世界书正文最多占用的字数（超过预算的低优先级条目会被自动跳过，不影响关键设定）
let semanticCharBudget = 1200;    // 向量记忆 + 资料库检索结果最多占用的字数
let chatHistoryTurns = 20;        // 每次请求带入的最近聊天轮数（原来10条太短，跟每20条自动总结一次的周期对不上，容易在10条左右出现"原始上下文刚断层、总结里的旧话题却还杵在prompt里"导致话题跳回旧内容的问题，调大到20缓解断层）
let enableScheduleAutoCheck = true; // 日程每日自动检测过期并提醒续写
let enableAffinitySystem = false; // 好感度数值系统（现在由"好感度系统"插件驱动，这个变量仍会被插件读写）
let enableTypingIndicator = true; // 正在输入提示/已读状态
let enableAnniversary = true; // 纪念日系统
let chatWordLimit = 50, postWordLimit = 50, diaryWordLimit = 400, letterWordLimit = 400;
let npcReplyProb = 0.4, npcReplyMaxCount = 3;
let globalBgImage = null, globalBgOpacity = 1;

// 全局自定义CSS
let globalCustomCSS = "";
const defaultGlobalCSS = `/* 示例代码：您可以自定义全局界面外观 */
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.post-placeholder { background: rgba(255,255,255,0.4); border-radius: 8px; margin-bottom: 5px; border-bottom: 1px solid #eff3f4; }
.sidebar-left { background: rgba(255,255,255,0.8); }
`;

// 状态管理
let homeTab = "recommend", pendingReplyAttachment = null, pendingPostAttachment = null, pendingInlineAttachments = {};
let pendingChatQuote = null, chatContextMenuTarget = null, editingCharId = null, unreadNotifs = 0, isGenerating = false;
let contextMenuTargetId = null, currentProfileId = null, currentProfileTab = "posts", activeGroupFilter = null;
let editingPluginId = null; // 当前正在编辑的插件ID（null表示新建）
let activeWbCategoryFilter = null; // 世界书分类筛选：null表示"全部"
// 修复：移动端长按(模拟右键)后，部分浏览器会紧接着补发一次 click 事件，
// 导致刚弹出的关注/星标菜单被外层 onclick 或全局关闭逻辑瞬间吞掉。用时间戳做个短暂的抑制窗口。
let suppressCardClickUntil = 0;
let memoryViewingCharId = null, currentSummaryCharId = null, chatContextMenuMsgIdx = null;
let currentDiaryCharId = null, currentDiaryTab = 'letter', tempGeneratedDiary = null, viewingDiaryId = null;

let currentUser = {
    id: 'me', name: "林", handle: "@my_account", bio: "这是我的个人签名...",persona: "", followers: 128, following: 50, location: "地球", website: "myblog.com", birthdate: "2000-01-01", verified: false, avatarImg: null, bgImg: null, avatarEmoji: "我", themeColor: "#1d9bf0", anonName: "匿名用户", anonId: Math.random().toString(36).substr(2,8).toUpperCase(), nudgeText: "的聪明脑袋", gender: "未知", customAnniversaries: []
};
let tabloidAccount = {
    id: 'tabloid_admin', name: "X星圈内爆料", handle: "@tabloid_news", persona: "专业狗仔，娱乐圈纪委，看热闹不嫌事大", bio: "掌握全网第一手瓜。欢迎私信爆料。", followers: 99999, following: 0, location: "深渊暗网", website: "", birthdate: "2020-01-01", verified: true, avatarImg: null, bgImg: null, avatarEmoji: "📰", themeColor: "#f91880", isFollowing: false, isSpecialFollow: false
};

let globalPosts = [], globalNotifications = [], anonPosts = []; 
let trendingTags = ["#赛博朋克2026", "#科技改变生活", "#打工人的日常"];
let characterGroups = ["Vtuber", "程序员", "偶像", "校园", "都市"];
let factionColors = {}; // { 势力名: '#hex颜色' }，用户可在"势力总览"里自定义
let charRelationships = []; // [{id, fromId, toId, label, color}] 角色之间的关系连线
let relationshipTypePresets = [ { label: '友好', color: '#17bf63' }, { label: '敌对', color: '#f91880' } ]; // 用户可自定义增删的关系类型（含颜色）
let statusTypes = [
    { id: 'st_busy', label: '忙', color: '#f91880', opacity: 100 },
    { id: 'st_idle', label: '闲', color: '#17bf63', opacity: 100 },
    { id: 'st_sleep', label: '睡觉', color: '#7856ff', opacity: 100 },
    { id: 'st_social', label: '社交中', color: '#ffad1f', opacity: 100 }
]; // 角色状态气泡颜色，所有角色共用，可在用户资料编辑里增删
const FACTION_PALETTE = ['#1d9bf0','#f91880','#17bf63','#ffad1f','#7856ff','#ff7a45','#00b8d9','#eb5757'];
function getFactionColor(name) {
    if (!name) return '#8b98a5'; // 势力不明 固定灰色
    if (!factionColors[name]) factionColors[name] = FACTION_PALETTE[Object.keys(factionColors).length % FACTION_PALETTE.length];
    return factionColors[name];
}
let worldbooks = [{ id: 1, title: "赛博纪元 2026", content: "这是一个高度发达但充满阶级矛盾的赛博朋克城市...", isGlobal: true, category: "" }];
let worldbookCategories = []; // 世界书自定义分类标签，如 ["主线设定","势力","场景"]
let globalEmoticons = [], groupChats = [], globalChats = {}, currentChatSessionId = null;
let myCharacters = [];

// 故事相关数据结构
let globalNovels = [];
let novelCustomCSS = "";
let currentEditingNovelId = null;
let tempNovelChapter = null;

const defaultNovelCSS = `/* 示例代码：您可以修改故事的UI界面 */
#view-novel {
background-color: #faf8f5;
}
.diary-card.novel-card {
background: #ffffff;
border: 1px solid #e0e0e0;
box-shadow: 2px 4px 12px rgba(0,0,0,0.06);
border-radius: 8px;
}
.novel-chapter-item {
background: #ffffff;
border-left: 4px solid #1d9bf0;
padding: 15px;
margin-bottom: 10px;
box-shadow: 0 2px 8px rgba(0,0,0,0.05);
border-radius: 4px;
}
.novel-chapter-title {
font-size: 18px;
font-weight: bold;
color: #1d9bf0;
margin-bottom: 10px;
}`;


// ★ 智能分流API（保证按功能优雅降级）
function getApiConfig(isSubTask = false) {
    if (isSubTask && subApiKey && subApiUrl && subModel) return { url: subApiUrl, key: subApiKey, model: subModel };
    return { url: myApiUrl, key: myApiKey, model: myModel };
}

// ★ 修复"聊天时候代码/JSON原文直接显示在对话里"的bug：
// 之前用一个很粗暴的正则 /\{[\s\S]*\}/ 去从AI原始输出里"抓第一个{到全文最后一个}"，
// 一旦AI输出里字符串内部混进了没转义的真实换行符（很常见的小毛病）、多余的结尾逗号，
// 或者JSON前后跟了别的文字，JSON.parse就会直接报错，导致整段兜底原文（看起来就是一坨JSON）
// 被当成一条聊天气泡原样发出来。这里统一换成"逐字符找到与第一个{真正匹配的}"（识别字符串边界，
// 不会被字符串里的{}干扰），解析失败时再自动修一遍"字符串内裸换行/裸制表符"和"结尾多余逗号"这两种
// AI最常犯的小毛病后重试。全文所有解析AI返回JSON的地方都统一改用这个函数，而不是各自复制一份正则。
function extractJsonObject(rawText) {
    if (!rawText) return null;
    let text = String(rawText).replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    let start = text.indexOf('{');
    if (start === -1) return null;
    let depth = 0, inStr = false, strCh = '', esc = false, end = -1;
    for (let i = start; i < text.length; i++) {
        let ch = text[i];
        if (inStr) {
            if (esc) { esc = false; }
            else if (ch === '\\') { esc = true; }
            else if (ch === strCh) { inStr = false; }
            continue;
        }
        if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) return null;
    let candidate = text.slice(start, end + 1);
    try { return JSON.parse(candidate); } catch (e) {}
    let fixed = '';
    inStr = false; esc = false;
    for (let j = 0; j < candidate.length; j++) {
        let c = candidate[j];
        if (inStr) {
            if (esc) { fixed += c; esc = false; continue; }
            if (c === '\\') { fixed += c; esc = true; continue; }
            if (c === '"') { inStr = false; fixed += c; continue; }
            if (c === '\n') { fixed += '\\n'; continue; }
            if (c === '\r') { continue; }
            if (c === '\t') { fixed += '\\t'; continue; }
            fixed += c; continue;
        }
        if (c === '"') { inStr = true; fixed += c; continue; }
        fixed += c;
    }
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    try { return JSON.parse(fixed); } catch (e2) {}
    return null;
}

// ===================== 统一的底层API发送（同时支持 OpenAI 兼容接口 和 Anthropic 原生接口）=====================
// 全文件所有请求AI的地方，最终都会走到这一个函数——不管你在设置里填的是 DeepSeek/OpenAI/中转 这类
// OpenAI 兼容接口，还是 Anthropic 官方接口（api.anthropic.com），这里会自动识别并使用对应的
// 端点/请求头/请求体格式。不管走哪条路，返回值都统一包装成 OpenAI 那种
// { choices: [{ message: { content: "..." } }] } 或 { error: { message: "..." } } 形状，
// 所以文件里其它所有读 data.choices?.[0]?.message?.content 的代码完全不用改一行。
function isAnthropicApiUrl(url) {
    return /anthropic\.com/i.test(url || '');
}
// 把 OpenAI 格式的多模态 content（[{type:'text',...},{type:'image_url',image_url:{url:'data:...'}}])
// 转成 Anthropic 要求的格式（image 用 source:{type:'base64', media_type, data}，且 data 不能带 data: 前缀）
function convertContentForAnthropic(content) {
    if (!Array.isArray(content)) return content;
    return content.map(part => {
        if (part && part.type === 'image_url') {
            const dataUrl = (part.image_url && part.image_url.url) || '';
            const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
            if (!m) return null; // 非 base64 dataURL（比如普通图片链接）Anthropic 原生接口不支持，直接丢弃这一张
            return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
        }
        return part;
    }).filter(Boolean);
}
async function sendChatRequest(api, content, extraBody) {
    extraBody = extraBody || {};
    if (isAnthropicApiUrl(api.url)) {
        try {
            const res = await fetch(`${api.url}/v1/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': api.key, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify(Object.assign({ model: api.model, max_tokens: 4096, messages: [{ role: "user", content: convertContentForAnthropic(content) }] }, extraBody))
            });
            const data = await res.json();
            if (data.error) return { error: { message: (data.error && data.error.message) || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) } };
            const text = (data.content && data.content[0] && data.content[0].text) || '';
            return { choices: [{ message: { content: text } }] };
        } catch (e) {
            return { error: { message: e.message } };
        }
    }
    const res = await fetch(`${api.url}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` },
        body: JSON.stringify(Object.assign({ model: api.model, messages: [{ role: "user", content: content }] }, extraBody))
    });
    return await res.json();
}

// 聊天请求的共用封装：遇到"并发数超限/请稍后重试"这类临时性报错时自动重试几次，
// 而不是直接弹一个吓人的错误框——很多API服务商（尤其是中转/代理）会有较低的并发上限，
// 短暂重试一下往往就能成功，用户完全不需要知道发生过这回事。
// images：可选，传入 base64 图片 dataURL 数组（如 "data:image/jpeg;base64,..."）时，
// 会按 OpenAI 兼容的多模态格式把文字和图片一起发给模型，用于"看图/看视频截图"这类场景；
// 不传或传空数组时行为和以前完全一样（纯文字），前提是配置里填的模型本身支持识别图片，
// 不支持的模型通常会直接忽略图片部分或报错，这段代码不负责判断模型是否支持多模态。
async function callChatCompletionAPI(api, promptContent, maxRetries = 2, images = null) {
    let content = promptContent;
    if (images && images.length > 0) {
        content = [{ type: "text", text: promptContent }];
        images.forEach(imgUrl => { if (imgUrl) content.push({ type: "image_url", image_url: { url: imgUrl } }); });
    }
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const data = await sendChatRequest(api, content);
            if (data.error && attempt < maxRetries) {
                const msg = data.error.message || '';
                if (/concurrency|rate.?limit|too many requests|429/i.test(msg)) {
                    const waitMatch = msg.match(/after (\d+(\.\d+)?)\s*seconds?/i);
                    const waitMs = waitMatch ? Math.max(500, parseFloat(waitMatch[1]) * 1000) : 1500;
                    await new Promise(r => setTimeout(r, waitMs));
                    continue; // 重试
                }
            }
            return data;
        } catch (e) {
            if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 1500)); continue; }
            return { error: { message: e.message } };
        }
    }
}

// ===================== 宏系统（Macros）=====================
// 支持在人设、世界书、日程等文本里写 {{char}} {{user}} {{time}} {{date}} {{weekday}} {{random:a,b,c}} 这类占位符，
// 生成prompt时会自动替换成实际内容，方便写设定的时候不用每次手打角色名/用户名。
function applyMacros(text, char) {
    if (!text || typeof text !== 'string') return text;
    const now = new Date();
    return text
        .replace(/\{\{char\}\}/gi, (char && char.name) || '')
        .replace(/\{\{user\}\}/gi, (typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '')
        .replace(/\{\{time\}\}/gi, now.toLocaleTimeString('zh-CN', { hour12: false }))
        .replace(/\{\{date\}\}/gi, now.toLocaleDateString('zh-CN'))
        .replace(/\{\{weekday\}\}/gi, now.toLocaleDateString('zh-CN', { weekday: 'long' }))
        .replace(/\{\{random[:：]([^}]+)\}\}/gi, (m, list) => {
            const options = list.split(/[,，]/).map(s => s.trim()).filter(Boolean);
            return options.length ? options[Math.floor(Math.random() * options.length)] : '';
        })
        .replace(/\{\{roll[:：]?(\d+)?\}\}/gi, (m, sides) => {
            const n = parseInt(sides) || 100;
            return String(Math.floor(Math.random() * n) + 1);
        });
}

// ===================== 正则替换脚本（Regex Scripts）=====================
// 对AI输出/我方输入做文本清洗替换，比如过滤口头禅、统一格式、屏蔽敏感词等
// 兼容两种正则写法：既支持裸的 pattern（比如手动填写的），也支持 /pattern/flags 这种JS字面量格式
// （酒馆导出的正则脚本 findRegex 字段就是这种格式，比如 "/foo(bar)/gi"）
function parseRegexLiteral(str) {
    if (typeof str !== 'string') return { pattern: '', flags: 'g' };
    const m = str.match(/^\/(.*)\/([a-z]*)$/i);
    if (m) return { pattern: m[1], flags: m[2] || 'g' };
    return { pattern: str, flags: 'g' };
}

function applyRegexScripts(text, target) {
    if (!text || typeof text !== 'string' || !regexScripts || regexScripts.length === 0) return text;
    let result = text;
    regexScripts.filter(s => s.enabled !== false && (s.target === target || s.target === 'both')).forEach(s => {
        if (!s.find) return;
        try {
            if (s.isRegex) {
                const { pattern, flags } = parseRegexLiteral(s.find);
                const re = new RegExp(pattern, s.flags || flags);
                result = result.replace(re, s.replace || '');
            } else {
                result = result.split(s.find).join(s.replace || '');
            }
        } catch (e) { /* 正则写错了就跳过这一条，不影响其它脚本和聊天 */ }
    });
    return result;
}

// 把可能含有 <, >, & 的文本转成安全的显示文本，避免正则脚本里常见的HTML标签（比如美化卡片用的<div>）
// 被当成真的HTML解析，把设置页的结构撑坏
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


function renderRegexScriptsList() {
    const container = document.getElementById('regexScriptsList');
    if (!container) return;
    if (!regexScripts || regexScripts.length === 0) { container.innerHTML = '<div style="color:#8b98a5; font-size:13px;">暂无正则脚本</div>'; return; }
    const targetLabel = { ai_output: 'AI回复', user_input: '我的消息', both: '双向' };
    container.innerHTML = regexScripts.map(s => `
        <div style="display:flex; align-items:center; gap:8px; background:white; padding:8px; border-radius:6px; border:1px solid #eff3f4;">
            <input type="checkbox" ${s.enabled !== false ? 'checked' : ''} onchange="toggleRegexScriptEnabled('${s.id}')" title="启用/禁用">
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:bold;">${escapeHtml(s.name) || '未命名脚本'} <span style="font-weight:normal; font-size:11px; color:#8b98a5;">[${targetLabel[s.target] || s.target}]${s.isRegex ? ' 🔤正则' : ''}</span></div>
                <div style="font-size:12px; color:#536471; word-break:break-all; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; cursor:pointer;" title="点击展开/收起完整内容" onclick="toggleRegexPreviewExpand(this)">${escapeHtml(s.find)} → ${s.replace ? escapeHtml(s.replace) : '(删除)'}</div>
            </div>
            <span style="color:#f91880; cursor:pointer; flex-shrink:0;" onclick="deleteRegexScript('${s.id}')">删除</span>
        </div>`).join('');
}

// 正则列表的查找/替换预览默认只显示两行（超长的正则/替换HTML不会把卡片撑得巨高），点一下展开/收起完整内容
function toggleRegexPreviewExpand(el) {
    const isExpanded = el.dataset.expanded === '1';
    if (isExpanded) {
        el.style.webkitLineClamp = '2';
        el.style.display = '-webkit-box';
        el.dataset.expanded = '0';
    } else {
        el.style.webkitLineClamp = 'unset';
        el.style.display = 'block';
        el.dataset.expanded = '1';
    }
}

function addRegexScript() {
    const name = document.getElementById('newRegexName').value.trim();
    const find = document.getElementById('newRegexFind').value.trim();
    const replace = document.getElementById('newRegexReplace').value;
    const isRegex = document.getElementById('newRegexIsRegex').checked;
    const target = document.getElementById('newRegexTarget').value;
    if (!find) return alert('请填写"查找内容"');
    if (isRegex) { try { new RegExp(find); } catch (e) { return alert('正则表达式写法有误：' + e.message); } }
    regexScripts.push({ id: 'rx_' + Date.now(), name: name || '未命名脚本', find, replace, isRegex, target, enabled: true });
    document.getElementById('newRegexName').value = '';
    document.getElementById('newRegexFind').value = '';
    document.getElementById('newRegexReplace').value = '';
    document.getElementById('newRegexIsRegex').checked = false;
    saveAllData();
    renderRegexScriptsList();
}

function deleteRegexScript(id) {
    regexScripts = regexScripts.filter(s => s.id !== id);
    saveAllData();
    renderRegexScriptsList();
}

function toggleRegexScriptEnabled(id) {
    const s = regexScripts.find(s => s.id === id);
    if (s) { s.enabled = !(s.enabled !== false); saveAllData(); }
}


function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getEmbedding(text) {
    if (!text || !text.trim()) return null;
    const api = getApiConfig(true);
    if (!api.key) return null;
    try {
        const res = await fetch(`${api.url}/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` },
            body: JSON.stringify({ model: embeddingModel || 'text-embedding-3-small', input: text.slice(0, 3000) })
        });
        const data = await res.json();
        return data?.data?.[0]?.embedding || null;
    } catch (e) { return null; }
}


// 聊天消息发出去之后，后台悄悄给它算一个向量，不阻塞聊天体验，失败了也无所谓
async function embedMessageInBackground(msg) {
    if (!enableVectorMemory || !msg || !msg.text || msg.text.trim().length < 10) return; // 太短的消息（"在吗""哈哈"之类）检索价值低，不值得为它调一次embedding
    try {
        const vec = await getEmbedding(msg.text);
        if (vec) { msg.embVec = vec; saveAllData(); }
    } catch (e) { /* 静默失败 */ }
}

// 语义检索：从这个聊天/角色的历史消息 + 专属资料库里，找出和当前话题最相关的内容
async function getSemanticContext(sessionId, char, queryText) {
    const charHasDataBank = char && dataBank && dataBank.some(d => d.charId == char.id);
    if ((!enableVectorMemory && !charHasDataBank) || !queryText || !queryText.trim()) return '';
    const api = getApiConfig(true);
    if (!api.key) return '';

    let memoryPart = '', dataBankPart = '';
    const qVec = await getEmbedding(queryText);
    if (!qVec) return '';

    // 1. 向量记忆：从本聊天的历史消息里语义检索（排除掉最近10条，那些已经在常规上下文里了）
    if (enableVectorMemory) {
        const history = globalChats[sessionId] || [];
        const recentTimestamps = new Set(history.slice(-chatHistoryTurns).map(m => m.timestamp));
        const candidates = history.filter(m => m.embVec && !recentTimestamps.has(m.timestamp));
        if (candidates.length > 0) {
            const scored = candidates.map(m => ({ m, score: cosineSimilarity(qVec, m.embVec) }))
                .filter(s => s.score > 0.5)
                .sort((a, b) => b.score - a.score)
                .slice(0, 4)
                .sort((a, b) => a.m.timestamp - b.m.timestamp);
            if (scored.length > 0) {
                memoryPart = `\n【语义检索到的相关历史片段（不一定是最近的对话，但和当前话题相关）】：\n` + scored.map(s => `- ${new Date(s.m.timestamp).toLocaleDateString('zh-CN')}：${s.m.text}`).join('\n') + `\n`;
            }
        }
    }

    // 2. 资料库(RAG)：从这个角色专属的资料库文档片段里语义检索
    if (char && dataBank && dataBank.length > 0) {
        const banks = dataBank.filter(d => d.charId == char.id);
        let allChunks = [];
        banks.forEach(b => (b.chunks || []).forEach(c => { if (c.embVec) allChunks.push({ ...c, bankTitle: b.title }); }));
        if (allChunks.length > 0) {
            const scored = allChunks.map(c => ({ c, score: cosineSimilarity(qVec, c.embVec) }))
                .filter(s => s.score > 0.45)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);
            if (scored.length > 0) {
                dataBankPart = `\n【从${char.name}的专属资料库里检索到的相关内容】：\n` + scored.map(s => `- (来自《${s.c.bankTitle}》) ${s.c.text}`).join('\n') + `\n`;
            }
        }
    }
    let combinedResult = memoryPart + dataBankPart;
    if (combinedResult.length > semanticCharBudget) {
        combinedResult = combinedResult.slice(0, semanticCharBudget) + '\n（因字数预算限制，后续检索内容已省略）\n';
    }
    return combinedResult;
}

// ===================== 角色专属资料库 (Data Bank / RAG) =====================
function renderCharDataBankList() {
    const container = document.getElementById('charDataBankList');
    if (!container) return;
    if (!editingCharId) { container.innerHTML = '<span style="color:#536471; font-size:13px;">请先保存角色，再回来上传专属资料库</span>'; return; }
    const banks = dataBank.filter(d => d.charId == editingCharId);
    if (banks.length === 0) { container.innerHTML = '<span style="color:#536471; font-size:13px;">暂未上传任何资料</span>'; return; }
    container.innerHTML = banks.map(b => `
        <div style="display:flex; align-items:center; gap:8px; background:white; padding:8px; border-radius:6px; border:1px solid #eff3f4;">
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:bold;">📄 ${escapeHtml(b.title)}</div>
                <div style="font-size:11px; color:#8b98a5;">已切分 ${b.chunks.length} 个片段 · ${b.chunks.every(c => c.embVec) ? '✅ 已完成向量化' : '⏳ 向量化中...'}</div>
            </div>
            <span style="color:#f91880; cursor:pointer; flex-shrink:0;" onclick="deleteDataBankEntry('${b.id}')">删除</span>
        </div>`).join('');
}

function deleteDataBankEntry(id) {
    if (!confirm('确定要删除这份资料库文档吗？')) return;
    dataBank = dataBank.filter(d => d.id !== id);
    saveAllData();
    renderCharDataBankList();
}

// 简单按字数切分文档为片段（带一点重叠，避免切断上下文）
function chunkText(text, chunkSize = 600, overlap = 80) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + chunkSize));
        i += (chunkSize - overlap);
    }
    return chunks.filter(c => c.trim().length > 10);
}

async function handleDataBankFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!editingCharId) { alert('请先保存角色，再回来上传专属资料库！'); event.target.value = ''; return; }
    if (!enableVectorMemory) { alert('请先在"设置"里勾选"启用向量记忆与资料库语义检索"，并配置好 Embedding 模型！'); event.target.value = ''; return; }
    const api = getApiConfig(true);
    if (!api.key) { alert('请先配置 API Key！'); event.target.value = ''; return; }

    const ext = file.name.split('.').pop().toLowerCase();
    let extractedText = '';
    try {
        if (ext === 'txt') {
            extractedText = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(e);
                reader.readAsText(file, 'UTF-8');
            });
        } else if (ext === 'docx') {
            if (typeof mammoth === 'undefined') throw new Error('库加载失败，请检查网络');
            const arrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(e);
                reader.readAsArrayBuffer(file);
            });
            const result = await mammoth.extractRawText({ arrayBuffer });
            extractedText = result.value;
        } else {
            throw new Error('仅支持 .txt 和 .docx 文件');
        }
        if (!extractedText || !extractedText.trim()) throw new Error('文档内容为空！');
    } catch (err) {
        alert('文件读取失败：' + err.message);
        event.target.value = '';
        return;
    }

    const chunks = chunkText(extractedText);
    if (chunks.length === 0) { alert('文档内容过短，无法切分！'); event.target.value = ''; return; }

    const bankEntry = { id: 'db_' + Date.now(), charId: editingCharId, title: file.name, chunks: chunks.map(c => ({ text: c, embVec: null })), createdAt: Date.now() };
    dataBank.push(bankEntry);
    saveAllData();
    renderCharDataBankList();
    event.target.value = '';

    // 后台逐个片段计算向量，边算边刷新列表状态，不阻塞界面
    for (let c of bankEntry.chunks) {
        try { const vec = await getEmbedding(c.text); if (vec) c.embVec = vec; } catch (e) { /* 单个片段失败就跳过 */ }
    }
    saveAllData();
    renderCharDataBankList();
}

// ===================== 插件系统 (Plugins) =====================
// 目的：把"想要的AI行为/工具"做成可以导入导出的独立插件，而不是每次都要改代码加新功能。
// 支持四种类型：
//   prompt  -- 提示词规则插件：往prompt里注入一段固定指令（全局或指定角色生效），类似世界书但更适合"通用工具规则"
//   action  -- 快捷动作插件：在聊天输入框上方加一个按钮，点一下就发送预设的话（比如"掷骰子""生成天气"）
//   macro   -- 宏插件：扩展 {{xxx}} 占位符系统，可以在人设/世界书里直接用
//   script  -- 进阶：自定义JS钩子（高级选项，谨慎导入不信任来源的脚本，因为它和你自己写代码的权限一样大）

function pluginMatchesScope(p, charId) {
    if (!charId) return p.scope === 'global';
    if (p.scope === 'global') return true;
    if (Array.isArray(p.scope)) return p.scope.some(id => id == charId);
    return p.scope == charId; // 兼容旧版单选角色的插件数据
}

function getPluginPromptText(char) {
    if (!plugins || plugins.length === 0) return '';
    const applicable = plugins.filter(p => p.enabled !== false && p.type === 'prompt' && pluginMatchesScope(p, char && char.id));
    if (applicable.length === 0) return '';
    return '\n' + applicable.map(p => applyMacros(p.promptText || '', char)).join('\n') + '\n';
}

function runPluginScriptHooks(char, contextText) {
    if (!plugins || plugins.length === 0) return '';
    const applicable = plugins.filter(p => p.enabled !== false && p.type === 'script' && pluginMatchesScope(p, char && char.id));
    let out = '';
    applicable.forEach(p => {
        if (!p.code) return;
        try {
            const fn = new Function('char', 'context', 'applyMacros', p.code);
            const result = fn(char, contextText, applyMacros);
            if (typeof result === 'string' && result.trim()) out += '\n' + result;
        } catch (e) { console.error(`插件"${p.name}"执行出错：`, e); }
    });
    return out;
}

// 插件系统：AI回复解析完JSON之后的钩子。response 是同一个对象的引用，插件里对它的修改
// （比如 response.replies = [...]）会直接影响后续核心逻辑读到的内容，方便插件实现
// "读取AI返回的自定义字段、并据此改写这轮回复"这类需求（好感度、日程忙碌打断回复等）。
function runPluginResponseHooks(char, sessionId, response) {
    if (!plugins || plugins.length === 0) return;
    const applicable = plugins.filter(p => p.enabled !== false && p.type === 'script' && p.onResponse && pluginMatchesScope(p, char && char.id));
    applicable.forEach(p => {
        try {
            const fn = new Function('char', 'sessionId', 'response', 'applyMacros', p.onResponse);
            fn(char, sessionId, response, applyMacros);
        } catch (e) { console.error(`插件"${p.name}"的响应钩子执行出错：`, e); }
    });
}

// 插件系统：启动钩子（onLoad）—— 和 code/onResponse 不同，这个不依赖"正在聊天/生成"这类特定场景，
// 而是每次网页打开、数据读取完毕后就自动跑一次，用来让插件自己往页面里插入按钮、新页面、弹窗、样式，
// 实现"导入插件JSON就能直接用"，不需要我们手动改index.html/script.js/style.css。
// 代码里能直接访问 document/window，以及 myCharacters、plugins、saveAllData 等全局变量和函数——权限和手写代码一样大，只导入信任来源的插件。
function executePluginOnLoad(p) {
    if (!p || p.type !== 'script' || !p.onLoad) return;
    try {
        const fn = new Function('applyMacros', p.onLoad);
        fn(applyMacros);
    } catch (e) { console.error(`插件"${p.name}"的启动钩子执行出错：`, e); }
}
function runPluginOnLoadHooks() {
    if (!plugins || plugins.length === 0) return;
    plugins.filter(p => p.enabled !== false && p.type === 'script' && p.onLoad).forEach(executePluginOnLoad);
}

function applyPluginMacros(text, char) {
    if (!text || !plugins || plugins.length === 0) return text;
    let result = text;
    plugins.filter(p => p.enabled !== false && p.type === 'macro' && p.macroName).forEach(p => {
        const re = new RegExp(`\\{\\{${p.macroName}\\}\\}`, 'gi');
        result = result.replace(re, applyMacros(p.macroValue || '', char));
    });
    return result;
}

function getActivePluginActions(charId) {
    if (!plugins || plugins.length === 0) return [];
    return plugins.filter(p => p.enabled !== false && p.type === 'action' && pluginMatchesScope(p, charId));
}

function runPluginAction(actionId) {
    const p = plugins.find(x => x.id === actionId);
    if (!p || !currentChatSessionId) return;
    const char = myCharacters.find(c => c.id == currentChatSessionId);
    const input = document.getElementById('chatInput');
    if (input) { input.value = applyMacros(p.actionPrompt || '', char); sendChatMessage(); }
}

function renderChatPluginActionsBar() {
    const bar = document.getElementById('chatPluginActionsBar');
    if (!bar) return;
    if (!currentChatSessionId || currentChatSessionId.startsWith('g_')) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
    const actions = getActivePluginActions(currentChatSessionId);
    if (actions.length === 0) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    bar.innerHTML = actions.map(p => `<button type="button" class="btn-edit-small" style="margin:0; white-space:nowrap;" onclick="runPluginAction('${p.id}')">${p.actionLabel || p.name}</button>`).join('');
}

function renderPluginsList() {
    const container = document.getElementById('pluginsList');
    if (!container) return;
    if (!plugins || plugins.length === 0) { container.innerHTML = '<div class="empty-state">还没有安装任何插件，从下面导入或新建一个吧</div>'; return; }
    const typeLabel = { prompt: '📜 提示词规则', action: '⚡ 快捷动作', macro: '🔤 宏', script: '🧬 脚本钩子(进阶)' };
    container.innerHTML = plugins.map(p => {
        let scopeLabel;
        if (p.scope === 'global') scopeLabel = '全局生效';
        else if (Array.isArray(p.scope)) scopeLabel = `仅限：${p.scope.map(id => myCharacters.find(c => c.id == id)?.name || '未知角色').join('、') || '（未选择角色）'}`;
        else scopeLabel = `仅限：${myCharacters.find(c => c.id == p.scope)?.name || '未知角色'}`;
        const bodyText = p.promptText || p.actionPrompt || p.macroValue || p.code || '';
        const descHtml = p.description ? `<div class="plugin-clamp-wrap"><div class="plugin-clamp-text" style="font-size:12px; color:#8b98a5;">${escapeHtml(p.description)}</div><span class="plugin-expand-hint" onclick="togglePluginClamp(this)">展开 ▾</span></div>` : '';
        const bodyHtml = bodyText ? `<div class="plugin-clamp-wrap" style="margin-top:6px;"><div class="plugin-clamp-text" style="font-family:monospace; font-size:11px; color:#536471;">${escapeHtml(bodyText)}</div><span class="plugin-expand-hint" onclick="togglePluginClamp(this)">展开 ▾</span></div>` : '';
        return `<div class="wb-card" style="min-width:0; max-width:none; width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                <div style="flex:1; min-width:0;">
                    <div class="wb-title">${escapeHtml(p.name)} <span style="font-size:11px; font-weight:normal; color:#8b98a5;">[${typeLabel[p.type] || p.type}]</span></div>
                    <div style="font-size:12px; color:#8b98a5; margin-bottom:4px;">${scopeLabel}</div>
                    ${descHtml}
                </div>
                <input type="checkbox" ${p.enabled !== false ? 'checked' : ''} onchange="togglePluginEnabled('${p.id}')" title="启用/禁用">
            </div>
            ${bodyHtml}
            <div style="display:flex; gap:10px; margin-top:6px;">
                <span style="color:#1d9bf0; cursor:pointer; font-size:13px;" onclick="editPlugin('${p.id}')">✏️ 编辑</span>
                <span style="color:#f91880; cursor:pointer; font-size:13px;" onclick="deletePlugin('${p.id}')">删除</span>
            </div>
        </div>`;
    }).join('');
}

// 插件列表里描述/内容默认只显示两行，点"展开"切换显示全部（再点一次收起）
function togglePluginClamp(hintEl) {
    const textEl = hintEl && hintEl.previousElementSibling;
    if (!textEl) return;
    const expanded = textEl.classList.toggle('plugin-expanded');
    hintEl.textContent = expanded ? '收起 ▴' : '展开 ▾';
}

function togglePluginEnabled(id) {
    const p = plugins.find(p => p.id === id);
    if (p) { p.enabled = !(p.enabled !== false); saveAllData(); renderChatPluginActionsBar(); }
}

function deletePlugin(id) {
    if (!confirm('确定要删除这个插件吗？')) return;
    plugins = plugins.filter(p => p.id !== id);
    if (editingPluginId === id) cancelPluginEdit();
    saveAllData();
    renderPluginsList();
    renderChatPluginActionsBar();
}

function updatePluginFormFields() {
    const type = document.getElementById('newPluginType').value;
    ['prompt', 'action', 'macro', 'script'].forEach(t => {
        const el = document.getElementById(`pluginFields-${t}`);
        if (el) el.style.display = (t === type) ? 'block' : 'none';
    });
}

function populatePluginScopeSelect() {
    const box = document.getElementById('newPluginScopeCharsBox');
    if (!box) return;
    box.innerHTML = myCharacters.map(c => `<label style="display:flex; align-items:center; gap:4px; font-size:13px;"><input type="checkbox" value="${c.id}" class="plugin-scope-char-check"> ${c.name}</label>`).join('') || '<span style="color:#8b98a5; font-size:13px;">暂无角色</span>';
}

function togglePluginScopeGlobal() {
    const isGlobal = document.getElementById('newPluginScopeGlobal').checked;
    document.getElementById('newPluginScopeCharsBox').style.display = isGlobal ? 'none' : 'flex';
}

// 把某个已安装插件的数据填回"新建插件"表单，进入编辑模式（保存时会更新这一条，而不是新建一条）
function editPlugin(id) {
    const p = plugins.find(p => p.id === id);
    if (!p) return;
    editingPluginId = id;

    document.getElementById('newPluginName').value = p.name || '';
    document.getElementById('newPluginDesc').value = p.description || '';
    document.getElementById('newPluginType').value = p.type || 'prompt';
    updatePluginFormFields();

    populatePluginScopeSelect();
    const isGlobal = p.scope === 'global';
    document.getElementById('newPluginScopeGlobal').checked = isGlobal;
    togglePluginScopeGlobal();
    if (!isGlobal) {
        const scopeIds = Array.isArray(p.scope) ? p.scope.map(String) : [String(p.scope)];
        document.querySelectorAll('.plugin-scope-char-check').forEach(el => { el.checked = scopeIds.includes(el.value); });
    }

    document.getElementById('newPluginPromptText').value = p.promptText || '';
    document.getElementById('newPluginActionLabel').value = p.actionLabel || '';
    document.getElementById('newPluginActionPrompt').value = p.actionPrompt || '';
    document.getElementById('newPluginMacroName').value = p.macroName || '';
    document.getElementById('newPluginMacroValue').value = p.macroValue || '';
    document.getElementById('newPluginScriptCode').value = p.code || '';
    document.getElementById('newPluginScriptOnResponse').value = p.onResponse || '';
    document.getElementById('newPluginScriptOnLoad').value = p.onLoad || '';

    const titleEl = document.getElementById('pluginFormTitle'); if (titleEl) titleEl.innerText = '编辑插件';
    const saveBtn = document.getElementById('savePluginBtn'); if (saveBtn) saveBtn.innerText = '保存插件修改';
    const cancelBtn = document.getElementById('cancelPluginEditBtn'); if (cancelBtn) cancelBtn.style.display = 'block';

    const formSection = document.getElementById('pluginFormSection');
    if (formSection) formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelPluginEdit() {
    editingPluginId = null;
    ['newPluginName', 'newPluginDesc', 'newPluginPromptText', 'newPluginActionLabel', 'newPluginActionPrompt', 'newPluginMacroName', 'newPluginMacroValue', 'newPluginScriptCode', 'newPluginScriptOnResponse', 'newPluginScriptOnLoad'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('newPluginType').value = 'prompt';
    updatePluginFormFields();
    document.getElementById('newPluginScopeGlobal').checked = true;
    togglePluginScopeGlobal();
    document.querySelectorAll('.plugin-scope-char-check').forEach(el => el.checked = false);
    const titleEl = document.getElementById('pluginFormTitle'); if (titleEl) titleEl.innerText = '新建插件';
    const saveBtn = document.getElementById('savePluginBtn'); if (saveBtn) saveBtn.innerText = '添加插件';
    const cancelBtn = document.getElementById('cancelPluginEditBtn'); if (cancelBtn) cancelBtn.style.display = 'none';
}

function createPlugin() {
    const name = document.getElementById('newPluginName').value.trim();
    if (!name) return alert('请填写插件名称');
    const type = document.getElementById('newPluginType').value;
    const isGlobal = document.getElementById('newPluginScopeGlobal').checked;
    const scope = isGlobal ? 'global' : Array.from(document.querySelectorAll('.plugin-scope-char-check:checked')).map(el => el.value);
    if (!isGlobal && scope.length === 0) return alert('请至少勾选一个生效的角色，或者勾选"全局"');
    const description = document.getElementById('newPluginDesc').value.trim();

    // 编辑模式：更新已存在的插件；否则新建一条
    const existing = editingPluginId ? plugins.find(p => p.id === editingPluginId) : null;
    const p = existing || { id: 'plg_' + Date.now(), enabled: true };
    p.name = name; p.description = description; p.type = type; p.scope = scope;
    if (type === 'prompt') p.promptText = document.getElementById('newPluginPromptText').value.trim();
    if (type === 'action') { p.actionLabel = document.getElementById('newPluginActionLabel').value.trim(); p.actionPrompt = document.getElementById('newPluginActionPrompt').value.trim(); }
    if (type === 'macro') { p.macroName = document.getElementById('newPluginMacroName').value.trim().replace(/[^a-zA-Z0-9_]/g, ''); p.macroValue = document.getElementById('newPluginMacroValue').value.trim(); }
    if (type === 'script') { p.code = document.getElementById('newPluginScriptCode').value; p.onResponse = document.getElementById('newPluginScriptOnResponse').value; p.onLoad = document.getElementById('newPluginScriptOnLoad').value; }
    if (!existing) plugins.push(p);
    saveAllData();
    if (type === 'script' && p.onLoad) executePluginOnLoad(p); // 新建/编辑后立刻跑一次启动钩子，不用等刷新页面
    cancelPluginEdit();
    renderPluginsList();
    renderChatPluginActionsBar();
}

function exportPlugins() {
    if (!plugins || plugins.length === 0) return alert('还没有任何插件可以导出');
    saveTextFileForApp(`插件导出_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(plugins, null, 2), 'application/json');
}

function handlePluginImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const parsed = JSON.parse(e.target.result);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            let addedCount = 0;
            const newlyAdded = [];
            list.forEach(p => {
                if (!p.name || !p.type) return;
                const newPlugin = { ...p, id: 'plg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), enabled: p.enabled !== false };
                plugins.push(newPlugin);
                newlyAdded.push(newPlugin);
                addedCount++;
            });
            saveAllData();
            renderPluginsList();
            renderChatPluginActionsBar();
            // 即插即用：如果插件带有"网页打开时执行"的钩子，导入这一刻就立刻跑一次，不用等刷新页面
            newlyAdded.forEach(p => { if (p.enabled !== false && p.type === 'script' && p.onLoad) executePluginOnLoad(p); });
            alert(`成功导入 ${addedCount} 个插件！`);
        } catch (err) {
            alert('导入失败，文件不是合法的插件JSON：' + err.message);
        }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
}

function getUserContextPrompt() {
let context = '';
if (currentUser.gender && currentUser.gender !== '未知') {
    context += `\n【重要设定】：用户的性别是“${currentUser.gender}”。你在回复、心理描写和称呼中，绝对不能搞错用户的性别，必须严格遵循。`;
}
if (currentUser.persona) {
    context += `\n【用户设定】：与你互动的用户人设为“${currentUser.persona}”。在进行互动、聊天、回复以及心理描写时，你必须知晓并严格结合用户的这个设定背景。`;
}
return context;
}

// ===================== 轻量 Markdown 渲染（兼容酒馆角色卡常用的 *动作* **强调** `代码` 语法）=====================
// 很多角色卡自带的HTML卡片（比如状态栏）用的是写死的id（像id="o3-dr"这种），每次这个正则脚本
// 触发都会生成一模一样的id。同一个聊天里发过好几次这种卡片，页面上就会有一堆重复id——这是不合法的HTML，
// 会导致"点展开箭头没反应"（label的for=只会绑定到文档里第一个同名id，不一定是自己这张卡片里的那个），
// 也可能让后面的卡片意外继承前面卡片"展开/收起"的状态。这里给每条消息的卡片id都加上专属后缀，让它们互不干扰。
function namespaceInjectedIds(html, uniqueSuffix) {
    if (!html || html.indexOf('id=') === -1) return html; 
    const ids = [...new Set([...html.matchAll(/\s(?:id|for)=["']([\w-]+)["']/g)].map(m => m[1]))];
    if (ids.length === 0) return html;
    let result = html;
    ids.forEach(id => {
        // 1. 替换 HTML 标签上的 id="xxx" 或 for="xxx"
        result = result.replace(new RegExp(`\\b(id|for)=(["'])${id}\\2`, 'g'), (m, attr, quote) => `${attr}=${quote}${id}_${uniqueSuffix}${quote}`);
        
        // 2. 替换内嵌 <style> 里的 #xxx 选择器
        result = result.replace(new RegExp(`#${id}\\b`, 'g'), `#${id}_${uniqueSuffix}`);
        
        // 3. 🔥新增修复：同步替换 JS 脚本或 onclick 事件里被当做参数传递的旧 ID (例如 o3Tog('o3-dr'))
        result = result.replace(new RegExp(`(\\(\\s*)(["']|&quot;|&apos;)${id}\\2(\\s*\\))`, 'g'), (m, pre, quote, post) => `${pre}${quote}${id}_${uniqueSuffix}${quote}${post}`);
    });
    return result;
}
function renderMarkdownLite(text) {
    if (!text) return '';
    let t = String(text);

    // 💡 核心修复 1：提前把 <script> 和 <style> 标签整个“保护”起来，防止里面的代码被当成 Markdown 解析
    let protectedBlocks = [];
    t = t.replace(/<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/gi, (match) => {
        protectedBlocks.push(match);
        return `___BLOCK_PLACEHOLDER_${protectedBlocks.length - 1}___`;
    });

    // 代码块 ```lang\n...\n```：如果里面装的明显是HTML，直接原样渲染
    t = t.replace(/```[ \t]*([a-zA-Z0-9]*)[ \t]*\n?([\s\S]*?)```/g, (m, lang, code) => {
        const trimmed = code.trim();
        const looksLikeHtml = /^</.test(trimmed) || lang.toLowerCase() === 'html';
        if (looksLikeHtml) return trimmed;
        return `<pre class="md-codeblock"><code>${escapeHtml(trimmed)}</code></pre>`;
    });

    // 行内代码 `...`
    t = t.replace(/`([^`\n]+)`/g, (m, code) => {
        if (/^</.test(code.trim())) return code;
        return `<code class="md-inlinecode">${escapeHtml(code)}</code>`;
    });

    // 加粗 **text** / __text__
    t = t.replace(/\*\*([^\*\n]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    
    // 斜体动作描写 *text*（只处理星号）
    t = t.replace(/\*([^\*\n]+)\*/g, '<em class="md-action">$1</em>');

    // 💡 核心修复 2：Markdown 替换完成后，把之前保护起来的 <script> 和 <style> 标签毫发无损地放回去
    t = t.replace(/___BLOCK_PLACEHOLDER_(\d+)___/g, (match, idx) => {
        return protectedBlocks[idx];
    });

    return t;
}

function formatPostText(text) {
if (!text) return '';
return renderMarkdownLite(text)
           .replace(/#(\S+)/g, '<span class="clickable-tag" onclick="event.stopPropagation(); switchMainView(\'tag\', \'#$1\')">#$1</span>')
           .replace(/@(\S+)/g, '<span class="mention-tag" onclick="event.stopPropagation();">@$1</span>');
}

// ==========================================
// 修复：主页推文流渲染（完美限制评论预览长度）
// ==========================================
function generatePostHTML(posts) {
    return posts.map(post => {
        let char = post.char;
        let isMe = char.id === 'me';
        let verifiedIcon = char.verified ? verifiedSVG : '';
        let mediaHTML = post.mediaUrl ? `<div class="post-media" onclick="event.stopPropagation();"><img src="${post.mediaUrl}" loading="lazy"></div>` : '';
        let locationHTML = post.location ? `<div class="post-location">${locationSVG} ${post.location}</div>` : '';
        
        let replyPreview = '';
        if (post.replies && post.replies.length > 0) {
            let topReply = post.replies[post.replies.length - 1];
            
            // 💡核心修复：给最外层加 width:100%，给名字和内容加上 display:block; flex:1; min-width:0; 强制它在超长时显示省略号...
            replyPreview = `
            <div class="post-placeholder" style="border-bottom:none; padding:8px 0 0 0; margin-top:8px; border-top:1px solid #eff3f4; cursor:pointer;" onclick="event.stopPropagation(); switchMainView('postDetail', '${post.id}')">
                <div style="display:flex; gap:8px; width:100%; align-items:center;">
                    ${getAvatarHTML(topReply.char, 24)}
                    <div style="font-size:13px; color:#536471; display:flex; align-items:center; gap:4px; flex-grow:1; min-width:0;">
                        <b style="flex-shrink:0; max-width:100px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${topReply.char.name}</b> 
                        <span style="flex-shrink:0;">回复了：</span>
                        <span style="color:#0f1419; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; display:block; flex:1; min-width:0;">${topReply.text}</span>
                    </div>
                </div>
            </div>`;
        }

        return `
        <div class="post-placeholder" onclick="switchMainView('postDetail', '${post.id}')">
            <div style="cursor:pointer; flex-shrink:0;" onclick="event.stopPropagation(); switchMainView('profile', '${char.id}')">
                ${getAvatarHTML(char, 40)}
            </div>
            <div class="post-content" style="min-width:0; flex:1;">
                <div class="post-header">
                    <div class="post-header-info" onclick="event.stopPropagation(); switchMainView('profile', '${char.id}')">
                        <div class="post-name">${char.name} ${verifiedIcon}</div>
                        <div class="post-handle">${char.handle}</div>
                        <div style="color:#536471; font-size:15px; margin:0 4px;">·</div>
                        <div class="time-updater" style="color:#536471; font-size:15px;" data-timestamp="${post.timestamp}">${timeAgo(post.timestamp)}</div>
                    </div>
                   ${isMe ? `<button class="post-delete-btn" onclick="deletePost('${post.id}', event)" title="删除帖子">🗑️</button>` : `<button class="btn-edit-small btn-follow-${char.id} ${char.isFollowing ? 'following' : ''}" style="margin-left:8px;" onclick="toggleFollow('${char.id}', event)">${char.isFollowing ? '已关注' : '关注'}</button>`}
                </div>
                <div class="post-body" ondblclick="editPost('${post.id}', this); event.stopPropagation();" title="双击可直接修改此帖子">${formatPostText(post.text)}</div>
                ${locationHTML}
                ${mediaHTML}
                <div class="post-footer">
                    <div class="post-stats-group">
                        <div class="stat-item">${commentSVG} ${formatStat(post.stats.comments)}</div>
                        <div class="stat-item">${retweetSVG} ${formatStat(post.stats.retweets)}</div>
                        <div class="stat-item like-stat-item" style="cursor:pointer; color:${post.userLiked ? '#f91880' : 'inherit'};" onclick="event.stopPropagation(); toggleMainPostLike('${post.id}', event)"><span class="like-icon-wrap">${post.userLiked ? likeSVGFilled.replace(/#1d9bf0/g, '#f91880').replace('blue-line-icon', '') : likeSVG}</span> <span class="like-count">${formatStat(post.stats.likes)}</span></div>
                        <div class="stat-item">${viewSVG} ${formatStat(post.stats.views)}</div>
                        <div class="stat-item" style="cursor:pointer; color:${isInMemoryAlbum('post', post.id) ? '#ffad1f' : 'inherit'};" onclick="toggleMemoryStar(event, 'post', '${post.id}')" title="收藏进回忆相册">${isInMemoryAlbum('post', post.id) ? '⭐' : '☆'}</div>
                    </div>
                </div>
                ${replyPreview}
            </div>
        </div>`;
    }).join('');
}

function addNotification(text, postId, chatCharId, char, desc) {
globalNotifications.unshift({ text, postId, chatCharId, timestamp: Date.now() });
unreadNotifs++;
if (typeof updateNotifBadge === 'function') updateNotifBadge();
let avatarHtml = getAvatarHTML(char, 40);
showToast(avatarHtml, text.replace(/<[^>]+>/g, ''), desc, postId, chatCharId);
}

function updateNotifBadge() {
let mBadge = document.getElementById('mnavNotifBadge');
if (mBadge) { if (unreadNotifs > 0) { mBadge.style.display = 'block'; mBadge.innerText = unreadNotifs > 99 ? '99+' : unreadNotifs; } else { mBadge.style.display = 'none'; } }
let badge = document.getElementById('notifBadge');
if (badge) {
    if (unreadNotifs > 0) {
        badge.style.display = 'block';
        badge.innerText = unreadNotifs > 99 ? '99+' : unreadNotifs;
    } else {
        badge.style.display = 'none';
    }
}
}

function renderNotifications() {
const container = document.getElementById('notificationsSection');
if (!globalNotifications || globalNotifications.length === 0) {
    container.innerHTML = `<div class="empty-state">暂无新通知</div>`;
    return;
}
container.innerHTML = globalNotifications.map(n => {
    let actionAttr = '';
    if (n.chatCharId) actionAttr = `onclick="switchMainView('chat'); switchChatSession('${n.chatCharId}')"`;
    else if (n.postId) actionAttr = `onclick="switchMainView('postDetail', '${n.postId}')"`;
    
    return `
    <div class="notification-item" ${actionAttr}>
        <div style="flex-grow:1;">
            <div style="font-size:15px; color:#0f1419; margin-bottom:4px;">${n.text}</div>
            <div style="font-size:13px; color:#536471;" class="time-updater" data-timestamp="${n.timestamp}">${timeAgo(n.timestamp)}</div>
        </div>
    </div>`;
}).join('');
}

function renderTrends() {
const c = document.getElementById('trendListContainer');
if (!c) return;
c.innerHTML = trendingTags.map((t, i) => `
    <div class="trend-item" ondblclick="editTrend(${i}, this)">
        <div class="trend-meta">${i+1} · 趋势</div>
        <div class="trend-title" onclick="switchMainView('tag', '${t}')">${t}</div>
        <div class="trend-meta">${getRandomStat(50000) + 1000} 帖子</div>
    </div>
`).join('');
}

function addCustomTrend() {
const input = document.getElementById('customTrendInput');
let val = input.value.trim();
if(val) {
    if(!val.startsWith('#')) val = '#' + val;
    trendingTags.unshift(val);
    renderTrends();
    saveAllData();
    input.value = '';
}
}

function editTrend(idx, el) {
const oldVal = trendingTags[idx];
el.innerHTML = `<input type="text" class="trend-edit-input" value="${oldVal}" onblur="saveTrend(${idx}, this.value)" onkeypress="if(event.key==='Enter') this.blur()" autoFocus>`;
el.querySelector('input').focus();
}

function saveTrend(idx, val) {
val = val.trim();
if(val) {
    if(!val.startsWith('#')) val = '#' + val;
    trendingTags[idx] = val;
} else {
    trendingTags.splice(idx, 1);
}
renderTrends();
saveAllData();
}

window.onload = async function() { 
    await loadAllData();       
    updateGlobalBgStyles(); 
    applyGlobalCSS();
    updateCharSelects();
    updateSiteLogo();
    if (typeof renderPosts === "function") renderPosts(); 
    if (typeof renderTrends === "function") renderTrends(); 
    if (typeof renderCenterCharList === "function") renderCenterCharList(); 
    updateUserMiniProfile();
    startAutoPostTimer(); 
    startProactiveChatTimer();
    setInterval(updateAllRelativeTimes, 60000); 
    initMobileUI();
    initFAB(); // 初始化悬浮按钮拖拽逻辑
    if (typeof runPluginOnLoadHooks === 'function') runPluginOnLoadHooks(); // 插件系统：网页一打开就自动跑一遍"启动钩子"插件
};

// 悬浮按钮的自由拖拽逻辑
function initFAB() {
    const fab = document.getElementById('fabPost');
    if (!fab) return;
    
    let isDragging = false;
    let startX, startY, initialX, initialY;
    let hasMoved = false;

    const onDragStart = (e) => {
        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
            e.preventDefault(); // 阻止鼠标选中文字
        }
        const rect = fab.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        isDragging = true;
        hasMoved = false;
        
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchmove', onDragMove, {passive: false});
        document.addEventListener('touchend', onDragEnd);
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        let currentX, currentY;
        if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        } else {
            currentX = e.clientX;
            currentY = e.clientY;
        }
        
        const dx = currentX - startX;
        const dy = currentY - startY;
        
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMoved = true;
            if (e.cancelable) e.preventDefault(); // 滑动时阻止页面滚动
        }
        
        if (hasMoved) {
            let newX = initialX + dx;
            let newY = initialY + dy;
            
            // 边缘碰撞检测，限制在可视区内
            const maxX = window.innerWidth - fab.offsetWidth;
            const maxY = window.innerHeight - fab.offsetHeight;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            fab.style.left = newX + 'px';
            fab.style.top = newY + 'px';
            fab.style.bottom = 'auto'; // 清除默认样式的定位
            fab.style.right = 'auto';
        }
    };

    const onDragEnd = (e) => {
        isDragging = false;
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
        
        // 如果没有发生位移，则判定为点击事件，打开弹窗
        if (!hasMoved) {
            openModal('postCreateModal');
        }
    };

    fab.addEventListener('mousedown', onDragStart);
    fab.addEventListener('touchstart', onDragStart, {passive: false});
}

// ======== 移动端 / 安卓网页端 交互逻辑 (界面适配，功能与桌面端一致) ========
function initMobileUI() {
    // 抽屉菜单项点击后自动收起抽屉
    document.querySelectorAll('.mdrawer-item, .mdrawer-profile').forEach(el => {
        el.addEventListener('click', closeDrawer);
    });
}

function toggleDrawer() {
    const isOpen = document.getElementById('mobileDrawer').classList.contains('open');
    if (isOpen) closeDrawer(); else openDrawer();
}
function openDrawer() {
    document.getElementById('mobileDrawer').classList.add('open');
    document.getElementById('mobileDrawerOverlay').classList.add('open');
}
function closeDrawer() {
    document.getElementById('mobileDrawer').classList.remove('open');
    document.getElementById('mobileDrawerOverlay').classList.remove('open');
}

function openMobileTrendsView() {
    hideAllViews();
    closeDrawer();
    const mtEl = document.getElementById('mobileTopTitle'); if (mtEl) mtEl.innerText = '话题';
    document.getElementById('view-mobile-trends').style.display = 'block';
    const m = document.getElementById('mnav-search'); if (m) m.className = 'mnav-item active';
    renderMobileTrends();
}
let mobileTrendManageMode = false;
function toggleMobileTrendManage() {
    mobileTrendManageMode = !mobileTrendManageMode;
    const bar = document.getElementById('mobileTrendManageBar');
    if (bar) bar.style.display = mobileTrendManageMode ? 'flex' : 'none';
    renderMobileTrends();
}
function addMobileCustomTrend() {
    const input = document.getElementById('mobileCustomTrendInput');
    let val = input.value.trim();
    if (val) {
        if (!val.startsWith('#')) val = '#' + val;
        trendingTags.unshift(val);
        renderMobileTrends();
        saveAllData();
        input.value = '';
    }
}
function deleteMobileTrend(idx, event) {
    if (event) event.stopPropagation();
    if (!confirm('删除该话题标签？')) return;
    trendingTags.splice(idx, 1);
    renderMobileTrends();
    saveAllData();
}
let mobileTrendPressTimer = null;
let mobileTrendLongPressed = false;
function mobileTrendPressStart(idx) {
    mobileTrendLongPressed = false;
    mobileTrendPressTimer = setTimeout(() => { mobileTrendLongPressed = true; editMobileTrend(idx); }, 550);
}
function mobileTrendPressEnd() {
    if (mobileTrendPressTimer) { clearTimeout(mobileTrendPressTimer); mobileTrendPressTimer = null; }
}
function mobileTrendClick(idx, tag) {
    if (mobileTrendLongPressed) { mobileTrendLongPressed = false; return; }
    switchMainView('tag', tag);
}
function editMobileTrend(idx) {
    const oldVal = trendingTags[idx];
    const newVal = prompt('编辑话题标签（清空并确定则删除该标签）：', oldVal);
    if (newVal === null) return;
    let val = newVal.trim();
    if (val) {
        if (!val.startsWith('#')) val = '#' + val;
        trendingTags[idx] = val;
    } else {
        trendingTags.splice(idx, 1);
    }
    renderMobileTrends();
    saveAllData();
}
function renderMobileTrends() {
    const c = document.getElementById('mobileTrendsListContainer');
    if (!c) return;
    if (!trendingTags || trendingTags.length === 0) { c.innerHTML = '<div class="empty-state">暂无话题标签</div>'; return; }
    c.innerHTML = trendingTags.map((t, i) => `
        <div class="mobile-trend-item" onclick="mobileTrendClick(${i}, '${String(t).replace(/'/g, "\\'")}')" ontouchstart="mobileTrendPressStart(${i})" ontouchend="mobileTrendPressEnd()" ontouchmove="mobileTrendPressEnd()" onmousedown="mobileTrendPressStart(${i})" onmouseup="mobileTrendPressEnd()" onmouseleave="mobileTrendPressEnd()">
            <div style="flex:1; min-width:0;">
                <div class="mobile-trend-tag">${t}</div>
                <div class="mobile-trend-hint">查看相关推文${mobileTrendManageMode ? ' · 长按可编辑' : ''}</div>
            </div>
            ${mobileTrendManageMode ? `<div class="mtb-icon-btn" style="color:#f91880; flex-shrink:0;" onclick="deleteMobileTrend(${i}, event)">✕</div>` : ''}
        </div>
    `).join('');
}

function toggleMobileSearch() {
    const titleEl = document.getElementById('mtbCenterTitle');
    const searchEl = document.getElementById('mtbCenterSearch');
    const showingSearch = searchEl.style.display !== 'none';
    if (showingSearch) {
        searchEl.style.display = 'none'; titleEl.style.display = 'flex';
    } else {
        titleEl.style.display = 'none'; searchEl.style.display = 'flex';
        const input = document.getElementById('mobileSearchInput'); input.value = ''; setTimeout(() => input.focus(), 50);
    }
}


function formatStat(num) { if(typeof num === 'string') return num; if(num>=10000) return(num/10000).toFixed(1)+'万'; if(num>=1000) return(num/1000).toFixed(1)+'k'; return num; }
function parseStat(val) { if(typeof val === 'number') return val; let str=String(val).toLowerCase(); if(str.includes('k')) return parseFloat(str)*1000; if(str.includes('万')) return parseFloat(str)*10000; return parseInt(str)||0; }
function getRandomStat(max) { return Math.floor(Math.random() * max); }
function timeAgo(timestamp) { const s = Math.floor((Date.now()-timestamp)/1000); if(s<60) return"刚刚"; const m=Math.floor(s/60); if(m<60) return m+"分钟前"; const h=Math.floor(m/60); if(h<24) return h+"小时前"; const d=Math.floor(h/24); return d+"天前"; }
function updateAllRelativeTimes() { document.querySelectorAll('.time-updater').forEach(el => { const ts = parseInt(el.getAttribute('data-timestamp')); if(ts) el.innerText = timeAgo(ts); }); }

// 角色状态自动流动的后台守护代码
async function checkAndFlowSchedules() {
    const api = getApiConfig(true); 
    if (!api.key) return;
    const now = Date.now();
    for (let char of myCharacters) {
        if (char.schedule && char.schedule.text) {
            if (!char.lifeState || (now - char.lifeState.updatedAt > 2 * 3600000)) { 
                const prompt = `现在的真实时间是 ${new Date().toLocaleString('zh-CN', { hour12: false, weekday: 'long' })}。这是"${char.name}"的今日日程：\n${char.schedule.text}\n请根据现在的真实时间，对照ta的日程表，直接输出ta此刻正在做什么（20字以内，不要加引号）。`;
                try {
                    let text = (await sendChatRequest(api, prompt)).choices?.[0]?.message?.content?.trim();
                    if (text) saveCharLifeState(char, text, char.lifeState?.statusTypeLabel);
                } catch(e) {}
            }
        }
    }
    saveAllData();
}
setInterval(checkAndFlowSchedules, 15 * 60000);

function updateCharSelects() {
    const sel = document.getElementById('aiPostCharSelect');
    if(sel) {
        let oldVal = sel.value;
        sel.innerHTML = '<option value="random">随机角色</option>' + myCharacters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (oldVal && sel.querySelector(`option[value="${oldVal}"]`)) sel.value = oldVal;
    }
    const selRole = document.getElementById('userPostRoleSelect');
    if(selRole) {
        let oldVal = selRole.value;
        selRole.innerHTML = '<option value="me">我</option>' + myCharacters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (oldVal && selRole.querySelector(`option[value="${oldVal}"]`)) selRole.value = oldVal;
        updateUserPostAvatar();
    }
    const anonSel = document.getElementById('anonCharSelect');
    if(anonSel) {
        let oldVal = anonSel.value;
        anonSel.innerHTML = '<option value="random">随机角色</option>' + myCharacters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (oldVal && anonSel.querySelector(`option[value="${oldVal}"]`)) anonSel.value = oldVal;
    }
}
function updateUserPostAvatar() {
    let roleId = document.getElementById('userPostRoleSelect')?.value || 'me';
    let char = roleId === 'me' ? currentUser : myCharacters.find(c => c.id == roleId);
    if(char) {
        const div = document.getElementById('homeUserAvatar');
        if (char.avatarImg) { div.style.backgroundImage = `url('${char.avatarImg}')`; div.style.backgroundSize = 'cover'; div.style.backgroundPosition = 'center'; div.innerHTML = ""; }
        else { div.style.backgroundImage = 'none'; div.style.backgroundColor = 'white'; div.innerHTML = char.avatarEmoji || char.name?.[0] || '我'; }
    }
}

// ======== 召唤 AI 在主页随机或指定发帖 ========
function triggerManualAIPost() {
    if(!myApiKey) return alert("请先在左侧【设置】中配置主API Key！");
    if(isGenerating) return alert("已有生成任务正在进行，请稍候...");
    if(myCharacters.length === 0) return alert("请先在【角色中心】创建至少一个角色！");
    
    const selVal = document.getElementById('aiPostCharSelect').value;
    let charsToGen = [];
    if(selVal === 'random') {
        charsToGen = [myCharacters[Math.floor(Math.random() * myCharacters.length)]];
    } else {
        const c = myCharacters.find(x => x.id == selVal);
        if(c) charsToGen = [c];
    }
    
    if(charsToGen.length > 0 && typeof executeGeneration === 'function') {
        let customLimit = document.getElementById('aiPostCustomWordCount').value;
        executeGeneration(charsToGen, null, customLimit);
        closeModal('postCreateModal'); // 提交后自动关闭弹窗
    }
}

// ======== 全局 CSS 应用 ========
function applyGlobalCSS() {
    let el = document.getElementById('custom-global-style');
    if(!el) { el = document.createElement('style'); el.id = 'custom-global-style'; document.head.appendChild(el); }
    el.innerHTML = globalCustomCSS;
}

function toggleSettingsCollapse(id) {
    const el = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (!el) return;
    const isOpen = el.style.display === 'block';
    el.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.innerText = isOpen ? '▶' : '▼';
}

// 打开文件选择器前，先在 HBuilderX 打包的 APK（5+ Runtime）里申请存储读取权限——
// Android 6.0+ 光在 manifest 里声明权限是不够的，还需要运行时弹窗让用户授权，否则文件选择器可能打不开或选了没反应
function openFilePickerForApp(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (window.plus && plus.android) {
        try {
            plus.android.requestPermissions(
                ['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE'],
                function () { input.click(); },
                function () { input.click(); } // 就算授权被拒绝，也还是尝试打开，让系统自己处理弹窗
            );
            return;
        } catch (e) { /* 当前 HBuilderX/Android 版本没有这个API，直接走下面的默认逻辑 */ }
    }
    input.click();
}

function applyDarkTheme() {
    document.body.classList.toggle('dark-theme', !!darkTheme);
}

function toggleDarkTheme() {
    darkTheme = document.getElementById('darkThemeToggle')?.checked || false;
    applyDarkTheme();
    saveAllData();
}

// ===================== 浏览器系统级推送通知 =====================
function requestNotificationPermission() {
    const statusEl = document.getElementById('notifPermStatus');
    // HBuilderX 打包的 APK 环境：本地推送通常不需要单独申请网页那种权限弹窗，直接可用
    if (window.plus && plus.push) {
        if (statusEl) statusEl.innerText = '✅ 已在APK环境中就绪（原生推送）';
        return;
    }
    if (typeof Notification === 'undefined') { alert('你的浏览器不支持系统通知！'); return; }
    Notification.requestPermission().then(perm => {
        if (statusEl) statusEl.innerText = perm === 'granted' ? '✅ 已授权' : (perm === 'denied' ? '❌ 已被拒绝（需要去浏览器设置里手动开启）' : '⚠️ 未授权');
    });
}

function toggleBrowserNotifications() {
    enableBrowserNotifications = document.getElementById('enableBrowserNotifications')?.checked || false;
    if (enableBrowserNotifications && !(window.plus && plus.push) && typeof Notification !== 'undefined' && Notification.permission === 'default') requestNotificationPermission();
    saveAllData();
}

function sendBrowserNotification(title, body) {
    if (!enableBrowserNotifications) return;
    if (document.visibilityState === 'visible' && document.hasFocus()) return; // 用户正盯着看呢，不用再弹系统通知
    const plainTitle = (title || '').replace(/<[^>]+>/g, '').trim() || '新消息';
    const plainBody = (body || '').replace(/<[^>]+>/g, '').trim().slice(0, 200);

    // HBuilderX 打包的 APK（5+ Runtime）环境：用原生本地推送，这样才能在系统通知栏里真正弹出来
    if (window.plus && plus.push) {
        try { plus.push.createMessage(plainBody, {}, { title: plainTitle, cover: false }); } catch (e) { /* 静默失败 */ }
        return;
    }
    // 普通浏览器环境：走标准 Web Notification API
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
        new Notification(plainTitle, { body: plainBody, icon: siteLogoImg || undefined });
    } catch (e) { /* 静默失败 */ }
}

function clearGlobalBg() { globalBgImage = null; document.getElementById('globalBgFileInput').value = ''; updateGlobalBgStyles(); saveAllData(); }
function updateGlobalBgOpacity(val) { globalBgOpacity = parseFloat(val); updateGlobalBgStyles(); saveAllData(); }
function updateGlobalBgStyles() {
    if(globalBgImage) { document.body.style.backgroundImage = `url('${globalBgImage}')`; document.body.style.backgroundColor = 'transparent'; } 
    else { document.body.style.backgroundImage = 'none'; document.body.style.backgroundColor = '#ffffff'; }
    
    let styleTag = document.getElementById('dynamic-bg-style');
    if(!styleTag) { styleTag = document.createElement('style'); styleTag.id = 'dynamic-bg-style'; document.head.appendChild(styleTag); }
    let a = globalBgOpacity;
    styleTag.innerHTML = `.layout-container { background-color: rgba(255, 255, 255, ${a}); } .top-tabs, .header-title { background-color: rgba(255, 255, 255, ${Math.min(a + 0.1, 1)}); } #view-anon-forum { background-color: rgba(44, 44, 44, ${a}); } #view-anon-forum .header-title { background-color: rgba(44, 44, 44, ${Math.min(a + 0.1, 1)}); } .info-card, .search-box { background-color: rgba(255, 255, 255, ${Math.min(a + 0.2, 1)}); }`;
}

function toggleAdvancedPostOptions() { const el = document.getElementById('advancedPostOptions'); el.style.display = el.style.display === 'none' ? 'flex' : 'none'; }

function fileToBase64(file) {
    return new Promise((resolve) => {
        if (!file) { resolve(null); return; }
        if (!file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => resolve(null); reader.readAsDataURL(file); return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                if ((file.type === 'image/gif' && file.size < 500 * 1024) || file.size < 100 * 1024) { resolve(e.target.result); return; }
                const img = new Image();
                img.onload = function() {
                    try {
                        const canvas = document.createElement('canvas'); const MAX_WIDTH = 800; const MAX_HEIGHT = 800; let width = img.width; let height = img.height;
                        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                        canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.6));
                    } catch (err) { resolve(e.target.result); }
                };
                img.onerror = () => resolve(e.target.result);
                img.src = e.target.result;
            } catch (err) { resolve(e.target.result); }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

function getAvatarHTML(char, size = 40, extraClass = '') { 
    if(!char) char = { name:'未知', themeColor:'#1d9bf0', avatarEmoji:'?' };
    const style = `width:${size}px; height:${size}px;`; 
    if (char.avatarImg) return `<div class="avatar ${extraClass}" style="${style} background-image:url('${char.avatarImg}'); background-size:cover; background-position:center; border:2px solid transparent;"></div>`; 
    return `<div class="avatar ${extraClass}" style="${style} background-color:rgba(255,255,255,0.8); border:2px solid #1d9bf0; color:#1d9bf0; font-size:${size*0.4}px;">${char.avatarEmoji || char.name?.[0] || '?'}</div>`; 
}
function getGroupAvatarHTML(g, size=50, extraClass = '') {
    const style = `width:${size}px; height:${size}px;`;
    if(g && g.avatarImg) return `<div class="avatar ${extraClass}" style="${style} background-image:url('${g.avatarImg}'); background-size:cover; background-position:center; border:2px solid transparent;"></div>`;
    return `<div class="avatar ${extraClass}" style="${style} background:rgba(255,255,255,0.8); color:#1d9bf0; font-size:${size*0.4}px; border:2px solid #1d9bf0; display:flex; align-items:center; justify-content:center;">群</div>`;
}
function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (id === 'settingsModal' && typeof renderCharReplyToggleList === 'function') renderCharReplyToggleList();
    modal.style.display = 'flex';
    modal.style.zIndex = 2500;
    // 确保modal在顶层，防止被其他元素覆盖
    modal.style.position = 'fixed';
}
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function getFullDataSnapshot() {
    return {
        myApiUrl, myApiKey, myModel, subApiUrl, subApiKey, subModel,
        myCharacters, globalPosts, anonPosts, characterGroups, factionColors, charRelationships, relationshipTypePresets, statusTypes, globalEmoticons, worldbooks, worldbookCategories, globalChats, groupChats, currentUser, tabloidAccount, trendingTags,
        globalBgImage, globalBgOpacity, allowActionTags, enableScheduleAutoCheck, enableAffinitySystem, enableTypingIndicator, enableAnniversary, memoryAlbum, chatWordLimit, postWordLimit, diaryWordLimit, letterWordLimit,
        globalNovels, novelCustomCSS, globalCustomCSS, tabloidPosts, siteLogoImg,
        forumThreads,
        npcReplyProb, npcReplyMaxCount,
        regexScripts, enableVectorMemory, enableChatScriptExecution, embeddingModel, dataBank, darkTheme, enableBrowserNotifications,
        worldbookCharBudget, semanticCharBudget, chatHistoryTurns,
        plugins,
    };
}

function saveAllData() {
    const dataToSave = getFullDataSnapshot();
    localforage.setItem('myTwitterAppData', dataToSave).catch(function (e) { 
        console.error("存档失败", e); 
        alert("⚠️ 保存失败：设备硬盘空间可能已满！"); 
    });
}

async function loadAllData() {
    try {
        // 1. 优先尝试从全新的 IndexedDB 数据库读取
        let parsed = await localforage.getItem('myTwitterAppData');

        // 2. 💡 无缝迁移机制：如果新库没有数据，但旧的 localStorage 爆满的数据还在，就自动搬家！
        if (!parsed) {
            const oldSavedData = localStorage.getItem('myTwitterAppData');
            if (oldSavedData) {
                console.log("正在将您的数据从 localStorage 无缝迁移至大容量 IndexedDB...");
                try {
                    parsed = JSON.parse(oldSavedData);
                    await localforage.setItem('myTwitterAppData', parsed); // 存入新库
                    localStorage.removeItem('myTwitterAppData'); // 🔥 删除旧库，彻底释放那挤爆的 5MB 空间
                    console.log("✅ 迁移成功！浏览器旧内存已释放。");
                } catch (e) {
                    console.error("数据迁移失败:", e);
                }
            }
        }
// 💡 终极修复：全局存档清洗！彻底剿灭数据库中所有隐蔽的 Unsplash 旧链接
        if (parsed) {
            let originalStr = JSON.stringify(parsed);
            let newStr = originalStr;
            
            // 1. 替换带提示词的链接，例如 /800x400/?cyberpunk 或 /random/?city
            newStr = newStr.replace(/https?:\/\/source\.unsplash\.com\/(?:[a-z]+\/)?(?:(\d+)x(\d+)\/)?\?([^"'\s\>\]\)\\]+)/gi, (match, w, h, keyword) => {
                let url = `https://image.pollinations.ai/prompt/${keyword}?nologo=true`;
                if (w && h) url += `&width=${w}&height=${h}`;
                return url;
            });
            
            // 2. 兜底替换所有没带提示词的纯随机链接
            newStr = newStr.replace(/https?:\/\/source\.unsplash\.com\/(?:[a-z]+\/)?(?:(\d+)x(\d+))?[^"'\s\>\]\)\\]*/gi, (match, w, h) => {
                let url = `https://image.pollinations.ai/prompt/aesthetic_scenery?nologo=true`;
                if (w && h) url += `&width=${w}&height=${h}`;
                return url;
            });
            
            if (originalStr !== newStr) {
                parsed = JSON.parse(newStr);
                await localforage.setItem('myTwitterAppData', parsed); // 把洗净的数据重新存回数据库
                console.log("✅ 存档清洗完成：已将所有旧版 Unsplash 图片替换为新接口！");
            }
        }

        // 3. 开始恢复数据到页面（保持原有逻辑完全不变）
        if (parsed) {
            try {
                if (parsed.myApiUrl) myApiUrl = parsed.myApiUrl;
                if (parsed.myApiKey) myApiKey = parsed.myApiKey;
                if (parsed.myModel) myModel = parsed.myModel;
                if (parsed.subApiUrl !== undefined) subApiUrl = parsed.subApiUrl;
                if (parsed.subApiKey !== undefined) subApiKey = parsed.subApiKey;
                if (parsed.subModel !== undefined) subModel = parsed.subModel;
                if (parsed.allowActionTags !== undefined) allowActionTags = parsed.allowActionTags;
                if (parsed.enableScheduleAutoCheck !== undefined) enableScheduleAutoCheck = parsed.enableScheduleAutoCheck;
                if (parsed.enableAffinitySystem !== undefined) enableAffinitySystem = parsed.enableAffinitySystem;
                // 兼容旧版单开关
                if (parsed.enableTypingIndicator !== undefined) enableTypingIndicator = parsed.enableTypingIndicator;
                if (parsed.enableAnniversary !== undefined) enableAnniversary = parsed.enableAnniversary;
                if (parsed.memoryAlbum) memoryAlbum = parsed.memoryAlbum;
                if (parsed.chatWordLimit !== undefined) chatWordLimit = parsed.chatWordLimit;
                if (parsed.postWordLimit !== undefined) postWordLimit = parsed.postWordLimit;
                if (parsed.diaryWordLimit !== undefined) diaryWordLimit = parsed.diaryWordLimit;
                if (parsed.letterWordLimit !== undefined) letterWordLimit = parsed.letterWordLimit;
                if (parsed.npcReplyProb !== undefined) npcReplyProb = parsed.npcReplyProb;
                if (parsed.npcReplyMaxCount !== undefined) npcReplyMaxCount = parsed.npcReplyMaxCount;
                if (parsed.regexScripts) regexScripts = parsed.regexScripts;
                if (parsed.enableVectorMemory !== undefined) enableVectorMemory = parsed.enableVectorMemory;
                if (parsed.enableChatScriptExecution !== undefined) enableChatScriptExecution = parsed.enableChatScriptExecution;
                if (parsed.embeddingModel) embeddingModel = parsed.embeddingModel;
                if (parsed.dataBank) dataBank = parsed.dataBank;
                if (parsed.darkTheme !== undefined) darkTheme = parsed.darkTheme;
                if (parsed.enableBrowserNotifications !== undefined) enableBrowserNotifications = parsed.enableBrowserNotifications;
                if (parsed.worldbookCharBudget) worldbookCharBudget = parsed.worldbookCharBudget;
                if (parsed.semanticCharBudget) semanticCharBudget = parsed.semanticCharBudget;
                if (parsed.chatHistoryTurns) chatHistoryTurns = parsed.chatHistoryTurns;
                if (parsed.plugins) plugins = parsed.plugins;
                applyDarkTheme();
                if (parsed.globalBgImage !== undefined) globalBgImage = parsed.globalBgImage;
                if (parsed.globalBgOpacity !== undefined) globalBgOpacity = parsed.globalBgOpacity;
                if (parsed.siteLogoImg !== undefined) siteLogoImg = parsed.siteLogoImg;

                const uiSyncMap = {
                    apiUrlInput: myApiUrl, apiKeyInput: myApiKey,
                    subApiUrlInput: subApiUrl, subApiKeyInput: subApiKey,
                    limitChat: chatWordLimit, limitPost: postWordLimit,
                    limitDiary: diaryWordLimit, limitLetter: letterWordLimit,
                    globalBgOpacityInput: globalBgOpacity,
                    npcProbInput: npcReplyProb, npcMaxCountInput: npcReplyMaxCount
                };
                Object.keys(uiSyncMap).forEach(id => {
                    const el = document.getElementById(id);
                    if (el && uiSyncMap[id] !== undefined) el.value = uiSyncMap[id];
                });
                if (document.getElementById('allowActionTags')) document.getElementById('allowActionTags').checked = allowActionTags;
                if (document.getElementById('enableScheduleAutoCheck')) document.getElementById('enableScheduleAutoCheck').checked = enableScheduleAutoCheck;
                if (document.getElementById('enableAffinitySystem')) document.getElementById('enableAffinitySystem').checked = enableAffinitySystem;
                if (document.getElementById('enableTypingIndicator')) document.getElementById('enableTypingIndicator').checked = enableTypingIndicator;
                if (document.getElementById('enableAnniversary')) document.getElementById('enableAnniversary').checked = enableAnniversary;
                if (document.getElementById('enableVectorMemory')) document.getElementById('enableVectorMemory').checked = enableVectorMemory;
                if (document.getElementById('enableChatScriptExecution')) document.getElementById('enableChatScriptExecution').checked = enableChatScriptExecution;
                const embeddingModelSelectEl = document.getElementById('embeddingModelSelect');
                if (embeddingModelSelectEl && embeddingModel) {
                    if (!Array.from(embeddingModelSelectEl.options).some(opt => opt.value === embeddingModel)) {
                        embeddingModelSelectEl.innerHTML += `<option value="${embeddingModel}">${embeddingModel}</option>`;
                    }
                    embeddingModelSelectEl.value = embeddingModel;
                }
                if (document.getElementById('darkThemeToggle')) document.getElementById('darkThemeToggle').checked = darkTheme;
                if (document.getElementById('enableBrowserNotifications')) document.getElementById('enableBrowserNotifications').checked = enableBrowserNotifications;
                if (document.getElementById('worldbookCharBudgetInput')) document.getElementById('worldbookCharBudgetInput').value = worldbookCharBudget;
                if (document.getElementById('semanticCharBudgetInput')) document.getElementById('semanticCharBudgetInput').value = semanticCharBudget;
                if (document.getElementById('chatHistoryTurnsInput')) document.getElementById('chatHistoryTurnsInput').value = chatHistoryTurns;
                const modelSelect = document.getElementById('modelSelect');
                if (modelSelect && myModel) { if (!Array.from(modelSelect.options).some(opt => opt.value === myModel)) modelSelect.innerHTML += `<option value="${myModel}">${myModel}</option>`; modelSelect.value = myModel; }
                const subModelSelect = document.getElementById('subModelSelect');
                if (subModelSelect && subModel) { if (!Array.from(subModelSelect.options).some(opt => opt.value === subModel)) subModelSelect.innerHTML += `<option value="${subModel}">${subModel}</option>`; subModelSelect.value = subModel; }
            } catch (e) { console.error("API 设置恢复出错:", e); }

            try { if (parsed.myCharacters) { myCharacters = parsed.myCharacters; myCharacters.forEach(c => { if (c.diaryData && typeof c.diaryData.letter === 'string') { c.diaryData = { letters: c.diaryData.letter ? [{ id: 'old_l', title: '往期信件', date: Date.now(), content: c.diaryData.letter }] : [], diaries: c.diaryData.diary ? [{ id: 'old_d', title: '往期日记', date: Date.now(), content: c.diaryData.diary }] : [] }; }
                // 修复：老存档/异常渠道导入的角色可能缺失发帖频率等字段，导致自动发帖引擎里 char.postFreq.interval 报错、
                // 进而让"所有"角色都生成不了推文。这里统一兜底补全，防止一颗老鼠屎坏了一锅粥。
                if (!c.postFreq || typeof c.postFreq.interval !== 'number') c.postFreq = { interval: 1, unit: 'day', count: 1 };
                if (!c.chatFreq) c.chatFreq = { interval: 0, unit: 'hour' };
                if (!c.lastPostTime) c.lastPostTime = Date.now();
                if (c.replyToUser === undefined) c.replyToUser = true;
            }); } } catch (e) { console.error("角色数据恢复出错:", e); }
            try { if (parsed.globalPosts) globalPosts = parsed.globalPosts; } catch (e) { console.error(e); }
            try { if (parsed.anonPosts) anonPosts = parsed.anonPosts; } catch (e) { console.error(e); }
            try { if (parsed.characterGroups) characterGroups = parsed.characterGroups; } catch (e) { console.error(e); }
            try { if (parsed.factionColors) factionColors = parsed.factionColors; } catch (e) { console.error(e); }
            try { if (parsed.charRelationships) charRelationships = parsed.charRelationships; } catch (e) { console.error(e); }
            try { if (parsed.relationshipTypePresets) relationshipTypePresets = parsed.relationshipTypePresets; } catch (e) { console.error(e); }
            try { if (parsed.statusTypes) statusTypes = parsed.statusTypes; } catch (e) { console.error(e); }
            try { if (parsed.globalEmoticons) globalEmoticons = parsed.globalEmoticons; } catch (e) { console.error(e); }
            try { if (parsed.worldbooks) worldbooks = parsed.worldbooks; } catch (e) { console.error(e); }
            try { if (parsed.worldbookCategories) worldbookCategories = parsed.worldbookCategories; } catch (e) { console.error(e); }
            try { if (parsed.globalChats) globalChats = parsed.globalChats; } catch (e) { console.error(e); }
            try { if (parsed.groupChats) groupChats = parsed.groupChats; } catch (e) { console.error(e); }
            try { if (parsed.currentUser) { currentUser = { ...currentUser, ...parsed.currentUser }; if (!currentUser.gender) currentUser.gender = "未知"; } } catch (e) { console.error(e); }
            try { if (parsed.tabloidAccount) tabloidAccount = { ...tabloidAccount, ...parsed.tabloidAccount }; } catch (e) { console.error(e); }
            try { if (parsed.trendingTags) trendingTags = parsed.trendingTags; } catch (e) { console.error(e); }
            try { if (parsed.globalNovels) globalNovels = parsed.globalNovels; } catch (e) { console.error(e); }
            try { if (parsed.novelCustomCSS !== undefined) novelCustomCSS = parsed.novelCustomCSS; } catch (e) { console.error(e); }
            try { if (parsed.globalCustomCSS !== undefined) globalCustomCSS = parsed.globalCustomCSS; } catch (e) { console.error(e); }
            try { if (parsed.tabloidPosts) tabloidPosts = parsed.tabloidPosts; } catch (e) { console.error(e); }
            try { if (document.getElementById('globalCSSInput')) document.getElementById('globalCSSInput').value = globalCustomCSS || defaultGlobalCSS; } catch (e) { console.error(e); }
            try { applyNovelCSS(); } catch (e) { console.error(e); }
            try { if (parsed.forumThreads) forumThreads = parsed.forumThreads; else forumThreads = []; } catch (e) { console.error(e); forumThreads = []; }
        }
    } catch (e) {
        console.error("存档解析读取失败:", e);
        alert("⚠️ 存档数据读取失败！");
    }
}

function exportData() {
    const data = getFullDataSnapshot();
    saveTextFileForApp("twitter_ai_backup.json", JSON.stringify(data, null, 2), "application/json");
}
function triggerImport() { openFilePickerForApp('importFileInput'); }
async function importData(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            // 直接写入和自动存档同一个数据库，再用同一套（已经过充分测试的）加载逻辑来应用，
            // 这样备份恢复和日常自动存档永远读取的是同一份字段清单，不会再出现"恢复漏了什么"的问题
            await localforage.setItem('myTwitterAppData', data);
            await loadAllData();
            updateUserMiniProfile(); if(typeof renderTrends === 'function') renderTrends(); updateGlobalBgStyles(); applyGlobalCSS(); applyNovelCSS(); updateSiteLogo(); switchMainView('home'); updateCharSelects();
            alert("数据恢复成功！欢迎回来。");
        } catch(err) { alert("文件格式错误，恢复失败！" + err.message); }
    };
    reader.readAsText(file); document.getElementById('importFileInput').value = '';
}

async function fetchModels() {
    let urlInput = document.getElementById('apiUrlInput').value.trim(); const keyInput = document.getElementById('apiKeyInput').value.trim();
    if (!urlInput || !keyInput) return alert("请先填写接口地址和密钥！");
    if(urlInput.endsWith('/')) urlInput = urlInput.slice(0, -1);
    const btn = event.target; const oldText = btn.innerText; btn.innerText = "正在拉取模型中... ⏳"; btn.disabled = true;
    try {
        const res = await fetch(`${urlInput}/models`, { method: 'GET', headers: { 'Authorization': `Bearer ${keyInput}` } });
        if (!res.ok) throw new Error(`HTTP 错误代码: ${res.status}`);
        const data = await res.json();
        if (data && data.data && Array.isArray(data.data)) { document.getElementById('modelSelect').innerHTML = data.data.map(m => `<option value="${m.id}">${m.id}</option>`).join(''); alert(`成功拉取 ${data.data.length} 个模型！`); } 
        else { throw new Error("接口返回的数据格式不符合标准。"); }
    } catch (e) { alert("拉取失败：" + e.message); } finally { btn.innerText = oldText; btn.disabled = false; }
}

async function fetchSubModels() {
    let urlInput = document.getElementById('subApiUrlInput').value.trim(); const keyInput = document.getElementById('subApiKeyInput').value.trim();
    if (!urlInput || !keyInput) return alert("请先填写副 API 的接口地址和密钥！");
    if(urlInput.endsWith('/')) urlInput = urlInput.slice(0, -1);
    const btn = event.target; const oldText = btn.innerText; btn.innerText = "正在拉取模型中... ⏳"; btn.disabled = true;
    try {
        const res = await fetch(`${urlInput}/models`, { method: 'GET', headers: { 'Authorization': `Bearer ${keyInput}` } });
        if (!res.ok) throw new Error(`HTTP 错误代码: ${res.status}`);
        const data = await res.json();
        if (data && data.data && Array.isArray(data.data)) { document.getElementById('subModelSelect').innerHTML = data.data.map(m => `<option value="${m.id}">${m.id}</option>`).join(''); alert(`副 API 成功拉取 ${data.data.length} 个模型！`); }
        else { throw new Error("接口返回的数据格式不符合标准。"); }
    } catch (e) { alert("拉取失败：" + e.message); } finally { btn.innerText = oldText; btn.disabled = false; }
}

// 修复：向量记忆的 Embedding 模型改成"拉取模型"下拉选择，而不是手动填写模型名字。
// 默认优先用副API（如果配置了）去拉取，因为副API通常是专门配的轻量任务API；没配副API就用主API。
async function fetchEmbeddingModels() {
    const useSubApi = !!(subApiUrl && subApiKey);
    let urlInput = (useSubApi ? subApiUrl : myApiUrl) || '';
    const keyInput = (useSubApi ? subApiKey : myApiKey) || '';
    if (!urlInput || !keyInput) return alert("请先在上方填写主 API（或副 API）的接口地址和密钥！");
    if (urlInput.endsWith('/')) urlInput = urlInput.slice(0, -1);

    const btn = event.target; const oldText = btn.innerText; btn.innerText = "正在拉取模型中... ⏳"; btn.disabled = true;
    try {
        const res = await fetch(`${urlInput}/models`, { method: 'GET', headers: { 'Authorization': `Bearer ${keyInput}` } });
        if (!res.ok) throw new Error(`HTTP 错误代码: ${res.status}`);
        const data = await res.json();
        if (data && data.data && Array.isArray(data.data)) {
            const sel = document.getElementById('embeddingModelSelect');
            sel.innerHTML = data.data.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
            // 拉取成功后，优先保留之前选的模型；如果列表里有名字包含"embed"的，优先选中它，方便一眼找到向量模型
            const keepPrevious = data.data.find(m => m.id === embeddingModel);
            const guessEmbedding = data.data.find(m => /embed/i.test(m.id));
            const toSelect = keepPrevious || guessEmbedding;
            if (toSelect) sel.value = toSelect.id;
            embeddingModel = sel.value;
            saveAllData();
            alert(`成功拉取 ${data.data.length} 个模型！（使用了${useSubApi ? '副' : '主'}API）`);
        } else {
            throw new Error("接口返回的数据格式不符合标准。");
        }
    } catch (e) { alert("拉取失败：" + e.message); } finally { btn.innerText = oldText; btn.disabled = false; }
}

function saveEmbeddingModelSelection() {
    const sel = document.getElementById('embeddingModelSelect');
    if (!sel) return;
    embeddingModel = sel.value;
    saveAllData();
}

function autoSaveApiSettings() {
    myApiUrl = document.getElementById('apiUrlInput').value.trim(); if(myApiUrl.endsWith('/')) myApiUrl = myApiUrl.slice(0, -1);
    myApiKey = document.getElementById('apiKeyInput').value.trim();
    if(document.getElementById('modelSelect').value) myModel = document.getElementById('modelSelect').value;
    
    subApiUrl = document.getElementById('subApiUrlInput').value.trim(); if(subApiUrl.endsWith('/')) subApiUrl = subApiUrl.slice(0, -1);
    subApiKey = document.getElementById('subApiKeyInput').value.trim();
    if(document.getElementById('subModelSelect').value) subModel = document.getElementById('subModelSelect').value;
    
    saveAllData();
}

// 新增：角色是否回复用户 —— 设置面板列表渲染与即时保存
function renderCharReplyToggleList() {
    const box = document.getElementById('charReplyToggleList'); if (!box) return;
    if (!myCharacters || myCharacters.length === 0) { box.innerHTML = '<div style="font-size:13px; color:#536471;">暂无角色，请先创建 AI 角色。</div>'; return; }
    box.innerHTML = myCharacters.map(c => `
        <label style="display:flex; align-items:center; gap:8px; font-size:14px; cursor:pointer;">
            <input type="checkbox" ${c.replyToUser === false ? '' : 'checked'} onchange="toggleCharReplyToUser('${c.id}', this.checked)">
            <span>${c.name}</span>
            <span style="color:#536471; font-size:12px;">${c.handle || ''}</span>
        </label>
    `).join('');
}

function toggleCharReplyToUser(charId, checked) {
    const char = myCharacters.find(c => c.id == charId); if (!char) return;
    char.replyToUser = checked; // true = 正常回复用户；false = 该角色不再回复/点赞用户
    saveAllData();
}

function saveSettings() {
    myApiUrl = document.getElementById('apiUrlInput').value.trim(); if(myApiUrl.endsWith('/')) myApiUrl = myApiUrl.slice(0, -1);
    myApiKey = document.getElementById('apiKeyInput').value.trim(); myModel = document.getElementById('modelSelect').value;
    subApiUrl = document.getElementById('subApiUrlInput').value.trim(); if(subApiUrl.endsWith('/')) subApiUrl = subApiUrl.slice(0, -1);
    subApiKey = document.getElementById('subApiKeyInput').value.trim(); subModel = document.getElementById('subModelSelect').value;
    chatWordLimit = parseInt(document.getElementById('limitChat').value) || 50; postWordLimit = parseInt(document.getElementById('limitPost').value) || 50;
    diaryWordLimit = parseInt(document.getElementById('limitDiary').value) || 400; letterWordLimit = parseInt(document.getElementById('limitLetter').value) || 400;
    allowActionTags = document.getElementById('allowActionTags').checked;
    enableScheduleAutoCheck = document.getElementById('enableScheduleAutoCheck').checked;
    enableTypingIndicator = document.getElementById('enableTypingIndicator').checked;
    enableAnniversary = document.getElementById('enableAnniversary').checked;
    enableVectorMemory = document.getElementById('enableVectorMemory')?.checked || false;
    enableChatScriptExecution = document.getElementById('enableChatScriptExecution')?.checked || false;
    embeddingModel = document.getElementById('embeddingModelSelect')?.value.trim() || 'text-embedding-3-small';
    worldbookCharBudget = Math.max(200, parseInt(document.getElementById('worldbookCharBudgetInput')?.value) || 2000);
    semanticCharBudget = Math.max(200, parseInt(document.getElementById('semanticCharBudgetInput')?.value) || 1200);
    chatHistoryTurns = Math.max(2, parseInt(document.getElementById('chatHistoryTurnsInput')?.value) || 20);
    npcReplyProb = parseFloat(document.getElementById('npcProbInput').value); 
    if (isNaN(npcReplyProb)) npcReplyProb = 0.4; 
    npcReplyMaxCount = parseInt(document.getElementById('npcMaxCountInput').value); 
    if (isNaN(npcReplyMaxCount)) npcReplyMaxCount = 3;
    
    globalCustomCSS = document.getElementById('globalCSSInput').value;
    applyGlobalCSS();
    
    if(!myApiUrl || !myApiKey) return alert("请至少完整填写主 API 的接口地址和密钥！");
    saveAllData(); alert("设置保存成功！");
}

function openUserProfileModal() {
    try {
        ['myName','myHandle','myPersona','myBio','myFollowers','myFollowing','myLocation','myWebsite','myBirthdate','myAnonName','myAnonId','myNudgeText','myGender','myPersona'].forEach(id => {
            const elem = document.getElementById(id);
            if(elem) {
                const prop = id.replace('my', '').charAt(0).toLowerCase() + id.replace('my', '').slice(1);
                elem.value = currentUser[prop] || '';
            }
        });
        const verifiedElem = document.getElementById('myVerified');
        if(verifiedElem) verifiedElem.checked = currentUser.verified || false;

        const avatarPreview = document.getElementById('myAvatarPreview');
        if(currentUser.avatarImg && avatarPreview) {
            avatarPreview.src = currentUser.avatarImg;
            avatarPreview.style.display = 'block';
        } else if(avatarPreview) { avatarPreview.style.display = 'none'; }

        const bgPreview = document.getElementById('myBgPreview');
        if(currentUser.bgImg && bgPreview) {
            bgPreview.src = currentUser.bgImg;
            bgPreview.style.display = 'block';
        } else if(bgPreview) { bgPreview.style.display = 'none'; }

        tempCropResults.myAvatar = currentUser.avatarImg || null;
        tempCropResults.myBg = currentUser.bgImg || null;

        if(typeof renderStatusTypesList === 'function') renderStatusTypesList();
        if(typeof renderUserAnniversaryList === 'function') renderUserAnniversaryList();
        initColorPalette();

        const opacityInput = document.getElementById('newStatusTypeOpacity');
        if(opacityInput) {
            opacityInput.oninput = function() {
                const displayEl = document.getElementById('statusOpacityDisplay');
                if(displayEl) displayEl.innerText = this.value + '%';
            };
        }

        openModal('userProfileModal');
    } catch(err) {
        console.error('打开用户资料模态框出错:', err);
        alert('打开用户资料界面失败，请刷新页面重试。');
    }
}


async function saveUserProfile() {
    try {
        ['name','bio','followers','following','location','website','birthdate','anonName','anonId','nudgeText','gender','persona'].forEach(prop => {
            const elId = 'my' + prop.charAt(0).toUpperCase() + prop.slice(1);
            if(document.getElementById(elId)) currentUser[prop] = document.getElementById(elId).value.trim() || currentUser[prop];
        });
        let h = document.getElementById('myHandle').value.trim() || currentUser.handle; currentUser.handle = h.startsWith('@') ? h : '@' + h;
        currentUser.verified = document.getElementById('myVerified').checked;

        if (tempCropResults.myAvatar) currentUser.avatarImg = tempCropResults.myAvatar;
        if (tempCropResults.myBg) currentUser.bgImg = tempCropResults.myBg;

        globalPosts.forEach(p => { if (p.char.id === 'me') p.char = { ...currentUser }; p.replies.forEach(r => { if (r.char.id === 'me') r.char = { ...currentUser }; }); });
        updateUserMiniProfile(); closeModal('userProfileModal'); saveAllData(); alert("个人资料更新成功！");
        if (currentProfileId === 'me' && document.getElementById('view-profile').style.display !== 'none') renderProfilePage('me');
        if (document.getElementById('view-home').style.display !== 'none' && typeof renderPosts === 'function') renderPosts();
    } catch (err) {
        console.error('保存个人资料失败', err);
        alert("⚠️ 保存失败：" + (err && err.message ? err.message : '未知错误，请重试或更换一张图片'));
    }
}

function updateUserMiniProfile() {
    document.getElementById('mySidebarName').innerText = currentUser.name; document.getElementById('mySidebarHandle').innerText = currentUser.handle;
    const drawerNameEl = document.getElementById('drawerName'), drawerHandleEl = document.getElementById('drawerHandle');
    if (drawerNameEl) drawerNameEl.innerText = currentUser.name;
    if (drawerHandleEl) drawerHandleEl.innerText = currentUser.handle;
    const avatarTargets = [document.getElementById('mySidebarAvatar'), document.getElementById('drawerAvatar')].filter(Boolean);
    avatarTargets.forEach(div => {
        if (currentUser.avatarImg) { div.style.backgroundImage = `url('${currentUser.avatarImg}')`; div.style.backgroundSize = 'cover'; div.style.backgroundPosition = 'center'; div.innerHTML = ""; }
        else { div.style.backgroundImage = 'none'; div.style.backgroundColor = 'white'; div.innerHTML = currentUser.avatarEmoji || currentUser.name?.[0] || '我'; }
    });
    updateUserPostAvatar();
}

function showToast(avatarHtml, titleText, contentText, postId, chatCharId, isAnon = false) {
    sendBrowserNotification(titleText, contentText);
    const container = document.getElementById('toastContainer');
    if(!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item ${isAnon ? 'anon-toast' : ''}`;
    toast.innerHTML = `${avatarHtml}<div class="toast-content"><div class="toast-title">${titleText}</div>${contentText ? `<div class="toast-desc">${contentText}</div>` : ''}</div>`;

    let touchStartY = 0;
    let touchEndY = 0;

    // 触摸开始
    toast.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        container.style.overflowY = 'auto'; // 允许滚动
    }, false);

    // 触摸结束
    toast.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].clientY;
        const diff = touchStartY - touchEndY;

        if(diff > 50) { // 向上滑动 > 50px，移除通知
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => { if(toast.parentElement) toast.remove(); }, 300);
        } else if(diff < -50) { // 向下滑动 > 50px，展开所有通知
            container.style.maxHeight = 'none';
            container.style.overflowY = 'auto';
        }
    }, false);

    // 点击操作
    toast.onclick = () => {
        if (chatCharId) { switchMainView('chat'); switchChatSession(chatCharId); }
        else if (postId && isAnon) { switchMainView('anonForum'); }
        else if (postId) { switchMainView('postDetail', postId); }
        toast.remove();
    };

    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5500);
}

let pendingChatAttachment = null; let currentlyTypingChars = new Set();

function updateTypingIndicator() {
    let ind = document.getElementById('chatTypingIndicator');
    if (!enableTypingIndicator) { ind.style.display = 'none'; return; }
    if (currentlyTypingChars.size > 0) { document.getElementById('typingCharName').innerText = Array.from(currentlyTypingChars).join(', '); ind.style.display = 'block'; } 
    else { ind.style.display = 'none'; }
}

function showAvatarContextMenu(e, charId) {
    e.preventDefault(); e.stopPropagation();
    const menu = document.getElementById('chatContextMenu');
    const char = myCharacters.find(c => c.id == charId);
    const branches = getCharBranches(charId);
    let extraBtns = '';
    
    // 兼容以前生成的旧分支角色
    if (branches.length > 0) {
        extraBtns += `<button class="context-btn" style="color:#17bf63;" onclick="document.getElementById('chatContextMenu').style.display='none'; showBranchListModal('${charId}')">🌳 查看分支 (${branches.length})</button>`;
    }
    if (char && char.branchedFrom && myCharacters.some(c => c.id == char.branchedFrom)) {
        extraBtns += `<button class="context-btn" style="color:#17bf63;" onclick="document.getElementById('chatContextMenu').style.display='none'; switchChatSession('${char.branchedFrom}')">↩️ 回到原对话（${char.branchedFromName || ''}）</button>`;
    }
    
    // 💡 新增：集中展示旧聊天的入口
    if (char && char.archivedChats && char.archivedChats.length > 0) {
        extraBtns += `<button class="context-btn" style="color:#1d9bf0;" onclick="document.getElementById('chatContextMenu').style.display='none'; openArchivedChatsListModal('${charId}')">📜 查看历史聊天 (${char.archivedChats.length})</button>`;
    }

    menu.innerHTML = `<button class="context-btn" onclick="generateCharSchedule('${charId}')">🗓️ 生成/更新今日日程</button><button class="context-btn" onclick="document.getElementById('chatContextMenu').style.display='none'; openChatOptions('${charId}', event)">💬 聊天选项</button><button class="context-btn" onclick="document.getElementById('chatContextMenu').style.display='none'; restartChatWithGreeting('${charId}')">🔄 重新开始聊天</button>${extraBtns}`;
    
    menu.style.display = 'flex';
    let x = e.pageX, y = e.pageY; 
    if (x + 180 > window.innerWidth) x -= 180; 
    // 动态判断菜单高度，防止超出屏幕底部被遮挡
    if (y + menu.offsetHeight > window.innerHeight) y = window.innerHeight - menu.offsetHeight - 10; 
    if (y < 0) y = 10;
    menu.style.left = x + 'px'; 
    menu.style.top = y + 'px';
}

// 找出以 charId 为原型分出去的所有分支角色，按创建时间新到旧排列
function getCharBranches(charId) {
    return myCharacters.filter(c => c.branchedFrom == charId).sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
}

function showBranchListModal(charId) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;
    const branches = getCharBranches(charId);
    document.getElementById('branchListTitle').innerText = `🌳 ${char.name} 的所有分支 (${branches.length})`;
    document.getElementById('branchListContent').innerHTML = branches.map(b => {
        const msgCount = (globalChats[b.id] || []).length;
        const createdStr = isNaN(parseInt(b.id)) ? '' : new Date(parseInt(b.id)).toLocaleString('zh-CN');
        return `<div class="wb-card" style="min-width:0; max-width:none; width:100%; cursor:pointer; margin-bottom:8px; display:flex; align-items:center; gap:10px;" onclick="closeModal('branchListModal'); switchChatSession('${b.id}')">
            ${getAvatarHTML(b, 44)}
            <div style="flex:1; min-width:0;">
                <div style="font-weight:bold; font-size:14px;">${b.name}</div>
                <div style="font-size:12px; color:#8b98a5;">创建于 ${createdStr} · ${msgCount} 条消息</div>
            </div>
        </div>`;
    }).join('') || '<div class="empty-state">还没有任何分支</div>';
    openModal('branchListModal');
}

let pendingScheduleCharId = null;
let pendingScheduleResult = null;

function generateCharSchedule(charId) {
    document.getElementById('chatContextMenu').style.display = 'none';
    const char = myCharacters.find(c => c.id == charId); if (!char) return;
    const api = getApiConfig(true); if (!api.key) return alert('请先在设置中配置 API 密钥！');
    pendingScheduleCharId = charId;
    runScheduleGeneration(charId);
}

function regenerateSchedule() {
    if (!pendingScheduleCharId) return;
    runScheduleGeneration(pendingScheduleCharId);
}

async function runScheduleGeneration(charId) {
    pendingScheduleCharId = charId; // 👇修复：加入这一句，让系统知道要把日程保存给哪个角色
    const char = myCharacters.find(c => c.id == charId); if (!char) return;
    const api = getApiConfig(true); if (!api.key) { closeModal('schedulePreviewModal'); return alert('请先在设置中配置 API 密钥！'); }

    closeModal('schedulePreviewModal');
    document.getElementById('scheduleLoadingText').innerText = `正在为 ${char.name} 生成/更新日程...`;
    openModal('scheduleLoadingModal');
    // 日程要求AI一次性写完整一天的行程（比普通聊天回复长得多），生成本来就会比聊天慢一些，
    // 这里加个计时提示，至少能看出"还在生成中"而不是卡住了
    const scheduleLoadStart = Date.now();
    const scheduleLoadTimer = setInterval(() => {
        const el = document.getElementById('scheduleLoadingText');
        if (el) el.innerText = `正在为 ${char.name} 生成/更新日程...（已等待 ${Math.floor((Date.now() - scheduleLoadStart) / 1000)} 秒，日程内容较长，会比普通聊天回复慢一些）`;
    }, 1000);

    const recentChat = getRecentChatContext(charId);
    const recentPosts = globalPosts.filter(p => p.char.id == charId).slice(0, 5).map(p => p.text).join('\n---\n');
    const nowStr = new Date().toLocaleString('zh-CN', { hour12: false, weekday: 'long' });
    const typeAsk = statusTypes.length > 0 ? `，并从这些状态类型里选一个最贴近的填入 "statusTypeLabel" 字段：[${statusTypes.map(t => t.label).join('、')}]，都不贴切就留空字符串` : '';

    const prompt = `${buildBasePrompt(char, true, recentChat + '\n' + recentPosts)}
现在的真实时间：${nowStr}。

请结合你的人设、世界书设定，以及下面提供的参考信息，为自己规划一份"今天的日程"——从早到晚分成若干时间段，写出你这一天大概会做什么、在哪、状态如何，要符合你的身份、生活习惯和当前的关系/剧情状态，具体到有画面感，不要写"上午：工作，下午：休息"这种空洞流水账。

【你最近发的动态（如果有）】：
${recentPosts || '（暂无）'}

【你和用户最近的聊天记录（如果有）】：
${recentChat || '（暂无）'}

请严格按以下 JSON 格式输出，不要包含任何 Markdown 语法或多余说明：
{"schedule": "从早到晚的完整日程，按时间段分行，用\\n分隔", "currentStatus": "结合日程和现在的真实时间，你此刻正在做的事，20字以内，不含引号"${typeAsk ? ', "statusTypeLabel": "从给定列表里选的状态类型"' : ''}}`;

    try {
        const data = await callChatCompletionAPI(api, prompt);
        if (data.error) throw new Error(data.error.message);
        let rawText = data.choices?.[0]?.message?.content?.trim() || "";
        rawText = rawText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(rawText);
        if (!parsed.schedule) throw new Error('生成内容为空');

        clearInterval(scheduleLoadTimer);
        pendingScheduleResult = { text: parsed.schedule, currentStatus: parsed.currentStatus || '', statusTypeLabel: parsed.statusTypeLabel || '' };
        closeModal('scheduleLoadingModal');
        showSchedulePreview();
    } catch (e) {
        clearInterval(scheduleLoadTimer);
        closeModal('scheduleLoadingModal');
        alert('生成日程失败：' + e.message);
    }
}

function showSchedulePreview() {
    const r = pendingScheduleResult; if (!r) return;
    const typeColor = getStatusTypeColor(r.statusTypeLabel);
    const typeBadge = r.statusTypeLabel ? `<span style="background:${typeColor || '#1d9bf0'}; color:#fff; font-size:11px; padding:1px 8px; border-radius:8px; margin-right:6px;">${r.statusTypeLabel}</span>` : '';
    document.getElementById('schedulePreviewStatus').innerHTML = r.currentStatus ? `${typeBadge}💭 此刻状态：${r.currentStatus}` : '';
    document.getElementById('schedulePreviewText').innerText = r.text;
    openModal('schedulePreviewModal');
}

function confirmSaveSchedule() {
    const char = myCharacters.find(c => c.id == pendingScheduleCharId); const r = pendingScheduleResult;
    if (!char || !r) return;
    char.schedule = { text: r.text, generatedAt: Date.now() };
    if (r.currentStatus) saveCharLifeState(char, r.currentStatus, r.statusTypeLabel);
    saveAllData();
    closeModal('schedulePreviewModal');
    pendingScheduleResult = null;
}



function getStatusTypeColor(label) {
    if (!label) return null;
    const t = statusTypes.find(t => t.label === label);
    return t ? t.color : null;
}

function renderStatusTypesList() {
    const el = document.getElementById('statusTypesList');
    if (!el) return;
    if (statusTypes.length === 0) { el.innerHTML = '<span style="color:#8b98a5; font-size:12px;">暂无状态类型，添加一个吧</span>'; return; }
    el.innerHTML = statusTypes.map(t => {
        const opacity = Math.floor((t.opacity || 100) / 100 * 34);
        const opacityHex = opacity.toString(16).padStart(2, '0');
        const bgColor = t.color + opacityHex;
        return `<span style="background:${bgColor}; border:1px solid ${t.color}; color:${t.color}; padding:3px 10px; border-radius:12px; font-size:12px; display:inline-flex; align-items:center; gap:6px;">
            ${t.label} <span style="cursor:pointer; font-weight:bold;" onclick="deleteStatusType('${t.id}')">×</span>
        </span>`;
    }).join('');
}

function addStatusType() {
    const labelInput = document.getElementById('newStatusTypeLabel');
    const colorInput = document.getElementById('newStatusTypeColor');
    const opacityInput = document.getElementById('newStatusTypeOpacity');
    const label = labelInput.value.trim();
    if (!label) return alert('请输入状态名称');
    if (statusTypes.some(t => t.label === label)) return alert('这个状态类型已经存在了');
    statusTypes.push({ id: 'st_' + Date.now(), label, color: colorInput.value, opacity: parseInt(opacityInput.value) || 100 });
    labelInput.value = '';
    colorInput.value = '#1d9bf0';
    opacityInput.value = 100;
    document.getElementById('statusOpacityDisplay').innerText = '100%';
    saveAllData();
    renderStatusTypesList();
}

function deleteStatusType(id) {
    statusTypes = statusTypes.filter(t => t.id !== id);
    saveAllData();
    renderStatusTypesList();
}

const PRESET_COLORS = ['#1d9bf0', '#f91880', '#17bf63', '#ffad1f', '#7856ff', '#ff7a45', '#00b8d9', '#eb5757', '#a66dc6', '#58595b'];

function initColorPalette() {
    const palette = document.getElementById('colorPalette');
    if(!palette) return;
    palette.innerHTML = `<span style="font-size:11px; color:#8b98a5; width:100%;">常用色（点击左侧调色盘可选任意颜色）：</span>` + PRESET_COLORS.map(color => `
        <div style="width:28px; height:28px; background:${color}; border:2px solid #eff3f4; border-radius:4px; cursor:pointer; transition:0.2s;"
             onclick="selectStatusColor('${color}')"
             onmouseover="this.style.transform='scale(1.1)'; this.style.borderColor='${color}';"
             onmouseout="this.style.transform='scale(1)'; this.style.borderColor='#eff3f4';"
             title="${color}"></div>
    `).join('');
}

function selectStatusColor(color) {
    const elem = document.getElementById('newStatusTypeColor');
    if(elem) elem.value = color;
}

function updateStatusOpacityDisplay(value) {
    const displayElem = document.getElementById('statusOpacityDisplay');
    if(displayElem) displayElem.innerText = value + '%';
}

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

function renderChatCharList() {
    const container = document.getElementById('chatCharRow');
    let html = `<div class="chat-char-item" onclick="openCreateGroupModal()"><div class="avatar" style="background:white; color:#1d9bf0; border:2px dashed #1d9bf0; font-size:24px; display:flex; justify-content:center; align-items:center; width:50px; height:50px;">+</div><div class="chat-char-name" style="font-size:12px; margin-top:5px;">建群</div></div>`;
    [...groupChats, ...myCharacters].forEach(x => {
        let hasUnread = globalChats[x.id] && globalChats[x.id].some(m => m.sender !== 'me' && m.sender !== 'system' && (!m.readBy || !m.readBy.includes('me')));
        let unreadHtml = hasUnread ? `<div style="position:absolute; top:-2px; right:-2px; width:14px; height:14px; background:#f91880; border-radius:50%; border:2px solid white; z-index:2;"></div>` : '';
        let branchHtml = x.branchedFrom ? `<div style="position:absolute; bottom:-2px; left:-2px; font-size:12px; z-index:2;" title="分支自：${x.branchedFromName || '未知'}">🌳</div>` : '';
        const isGroupItem = !!x.members;
        // 👇这里加入了手机长按的支持
        html += `<div class="chat-char-item ${currentChatSessionId == x.id ? 'active' : ''}" onclick="switchChatSession('${x.id}')">
            <div style="position:relative; display:inline-block;" ${isGroupItem ? `oncontextmenu="openChatOptions('${x.id}', event)" ontouchstart="groupAvatarTouchStart(event, '${x.id}')" ontouchend="groupAvatarTouchEnd(event)" ontouchmove="groupAvatarTouchEnd(event)"` : `oncontextmenu="showAvatarContextMenu(event, '${x.id}')" ontouchstart="avatarTouchStart(event, '${x.id}')" ontouchend="avatarTouchEnd(event)" ontouchmove="avatarTouchEnd(event)"`}>${x.members ? getGroupAvatarHTML(x, 50) : getAvatarHTML(x, 50)}${unreadHtml}${branchHtml}</div>
            <div class="chat-char-name" style="font-size:12px; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;">${x.name}</div>
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

function getRecentChatContext(charId) {
    let session = globalChats[charId] || [];
    return session.slice(-chatHistoryTurns).filter(m => m.sender !== 'system').map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender === 'me' ? "用户" : "你"}: ${m.text}`).join('\n');
}


function switchChatSession(id) {
    currentChatSessionId = id.toString();
    renderChatCharList();
    const chatInput = document.getElementById('chatInputArea');
    if(chatInput) chatInput.style.display = 'flex';
    sendFirstMessageIfNeeded(id.toString());
    renderChatMessages();
    checkAndAnnounceAnniversary(id.toString());
    refreshLifeStateOnChatEnter(id.toString());
    renderChatPluginActionsBar();

    // 修复：取消了原先的强制自动生成日程，现在完全由用户通过长按头像来手动生成
}

// 首次打开和某个角色的聊天（没有任何历史消息）时，如果设置了开场白，就自动发出来当第一条消息
function sendFirstMessageIfNeeded(sessionId) {
    if (sessionId.startsWith('g_')) return; // 群聊不适用
    const char = myCharacters.find(c => c.id == sessionId);
    if (!char) return;
    if (globalChats[sessionId] && globalChats[sessionId].length > 0) return; // 已经聊过了就不重复发
    const options = getGreetingOptions(char);
    if (options.length === 0) return;
    if (options.length === 1) {
        applyGreetingAsFirstMessage(sessionId, options[0]);
    } else {
        // 有多个候选开场白，弹出来让用户自己选，而不是自动挑一个
        showGreetingPicker(sessionId);
    }
}

// 汇总一个角色所有能用的开场白：自己填的开场白 + 角色卡带的候选开场白，去重后返回
function getGreetingOptions(char) {
    let options = [];
    if (char.firstMessage && char.firstMessage.trim()) options.push(char.firstMessage.trim());
    if (Array.isArray(char.alternateGreetings)) {
        char.alternateGreetings.forEach(g => {
            if (g && g.trim() && !options.includes(g.trim())) options.push(g.trim());
        });
    }
    return options;
}

function applyGreetingAsFirstMessage(sessionId, greetingText) {
    const char = myCharacters.find(c => c.id == sessionId);
    if (!char) return;
    const text = applyMacros(greetingText, char);
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: char.id, text, timestamp: Date.now(), readBy: [] });
    saveAllData();
    if (currentChatSessionId === sessionId) renderChatMessages();
}

// 统一的"重新开始聊天"入口（长按头像触发）：先问要不要保留现在这段对话——
// 保留的话会自动克隆一个角色副本把旧聊天记录存进去，当前角色再清空重新开始；
// 不保留就直接清空。无论角色有几个开场白（0个/1个/多个）都能用这个入口重新开始。
function restartChatWithGreeting(charId) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;
    const hasHistory = globalChats[charId] && globalChats[charId].length > 0;

    if (hasHistory) {
        // 💡 修复：修改提示文案与逻辑，改为将旧对话收纳进历史记录
        const keepOld = confirm(`要保留现在和${char.name}的这段对话吗？\n【确定】= 将旧对话收拢归档到历史记录中（可在右键菜单查看），当前清空重新开始\n【取消】= 直接彻底清空重新开始（旧记录会丢失）`);
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
    } else if (options.length === 1) {
        applyGreetingAsFirstMessage(charId, options[0]);
        if (currentChatSessionId !== charId) switchChatSession(charId);
    } else {
        showGreetingPicker(charId);
    }
}

function showGreetingPicker(charId) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;
    const options = getGreetingOptions(char);
    if (options.length === 0) return;
    window.__greetingPickerCharId = charId;
    window.__greetingPickerOptions = options;

    document.getElementById('greetingPickerTitle').innerText = `💬 选择 ${char.name} 的开场白`;
    document.getElementById('greetingPickerList').innerHTML = options.map((g, idx) => `
        <div class="wb-card" style="min-width:0; max-width:none; width:100%; cursor:pointer; margin-bottom:8px;" onclick="selectGreeting(${idx})">
            <div style="font-size:13px; color:#0f1419; white-space:pre-wrap; max-height:150px; overflow-y:auto;">${(g.length > 300 ? g.slice(0, 300) + '……' : g).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>`).join('');
    openModal('greetingPickerModal');
}

function selectGreeting(idx) {
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

async function triggerNudge(sessionId, targetId) {
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    let sysText = targetId === 'me' ? `"${currentUser.name}" 拍了拍 自己 ${currentUser.nudgeText || '的脑袋'}` : `"${currentUser.name}" 拍了拍 "${myCharacters.find(c => c.id == targetId).name}" ${myCharacters.find(c => c.id == targetId).nudgeText || '的肩膀'}`;
    globalChats[sessionId].push({ sender: 'system', text: sysText, timestamp: Date.now() }); renderChatMessages(); saveAllData();

    const api = getApiConfig(true);
    if (targetId !== 'me' && api.key) {
        let targetChar = myCharacters.find(c => c.id == targetId);
        let prompt = `${buildBasePrompt(targetChar, false, sysText)}刚刚用户在聊天中双击头像"拍了拍"你。\n系统提示：${sysText}\n你可以选择回复或者输出 [NUDGE] 来反击。字数${chatWordLimit}字以内。`;
        try {
            if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { currentlyTypingChars.add(targetChar.name); updateTypingIndicator(); }
            let data = await callChatCompletionAPI(api, prompt);
            let repText = data.choices?.[0]?.message?.content?.trim() || "";
            currentlyTypingChars.delete(targetChar.name); updateTypingIndicator();
            
            if (repText.toUpperCase().startsWith("NO") && repText.length < 5) return;
            if (repText.includes("[NUDGE]")) { repText = repText.replace(/\[NUDGE\]/ig, '').trim(); globalChats[sessionId].push({ sender: 'system', text: `"${targetChar.name}" 拍了拍 "${currentUser.name}" ${currentUser.nudgeText || '的脑袋'}`, timestamp: Date.now() }); }
            repText = applyRegexScripts(repText, 'ai_output');
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

    container.innerHTML = history.map((msg, idx) => {
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

        return `
            <div class="chat-msg-row ${isMe ? 'me' : 'other'}">
                ${!isMe ? avatarHtml : ''}
                <div class="chat-bubble-wrapper" style="align-items: ${isMe ? 'flex-end' : 'flex-start'};">
                    <div class="chat-sender-name" style="font-size:10px;">${!isMe && isGroup ? senderChar?.name : ''} ${timeStr}</div>
                    <div class="chat-bubble ${isMe ? 'me' : 'other'}" oncontextmenu="showChatContextMenu(event, ${idx})" ontouchstart="chatBubbleTouchStart(event, ${idx})" ontouchend="chatBubbleTouchEnd(event)" ontouchmove="chatBubbleTouchEnd(event)">${msg.quote ? `<div class="chat-quote-bubble"><b>${msg.quote.name}</b>: ${namespaceInjectedIds(renderMarkdownLite(msg.quote.text), `q${idx}`)}</div>` : ''}${namespaceInjectedIds(renderMarkdownLite(msg.text), `${msg.timestamp || 0}_${idx}`)}${msg.mediaUrl ? `<img src="${msg.mediaUrl}">` : ''}${swipeHtml}</div>
                    ${isMe ? readStatusHtml : ''}
                </div>
                ${isMe ? avatarHtml : ''}
            </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
    if (enableChatScriptExecution) executeInjectedScripts(container);
}

// 浏览器出于安全考虑，不会执行通过 innerHTML 动态插入的 <script> 标签——很多角色卡自带的HTML卡片
// （比如状态栏的展开/收起按钮）依赖这类内嵌脚本才能工作，不然点了会报"xxx is not defined"。
// 这里手动把这些脚本"重新创建"一遍来强制执行。⚠️这意味着聊天内容里只要出现<script>标签就会真的运行，
// 只有在"设置 → AI增强功能"里手动打开对应开关、并且信任你导入的角色卡来源时才应该开启。
function executeInjectedScripts(container) {
    container.querySelectorAll('script').forEach(oldScript => {
        try {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);
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

        <button class="context-btn" onclick="contextActionAddToMemory()">⭐ 收藏进相册</button>
        <button class="context-btn" style="color:#f91880;" onclick="contextActionDeleteChat()">删除消息</button>
    `;
    menu.style.display = 'flex'; let x = e.pageX, y = e.pageY; if(x + 100 > window.innerWidth) x -= 100; if(y + 200 > window.innerHeight) y -= 200; menu.style.left = x + 'px'; menu.style.top = y + 'px';
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


function contextActionDeleteReply() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (!replyContextMenuTarget) return;
    const { postId, replyIdx } = replyContextMenuTarget; replyContextMenuTarget = null;
    let isTabloid = postId.startsWith('tb_');
    const post = isTabloid ? tabloidPosts.find(p => p.id == postId) : globalPosts.find(p => p.id == postId);
    if (!post || !post.replies || !post.replies[replyIdx]) return;
    if (!confirm('确定删除这条评论吗？该操作不可逆！')) return;
    post.replies.splice(replyIdx, 1);
    post.stats.comments = Math.max(0, (parseInt(post.stats.comments) || 1) - 1);
    saveAllData();
    if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
    if (isTabloid && document.getElementById('view-tabloid').style.display !== 'none') renderTabloidPosts();
}

function contextActionDeleteChat() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (chatContextMenuMsgIdx === null) return; const idx = chatContextMenuMsgIdx, sessionId = currentChatSessionId;
    if (!globalChats[sessionId] || !globalChats[sessionId][idx]) return;
    if (!confirm('确定删除这条消息吗？该操作不可逆！')) return;
    globalChats[sessionId].splice(idx, 1);
    renderChatMessages(); saveAllData();
    chatContextMenuMsgIdx = null;
}

async function contextActionEditChat() {
    if (chatContextMenuMsgIdx === null) return; const idx = chatContextMenuMsgIdx, sessionId = currentChatSessionId, msg = globalChats[sessionId][idx];
    document.getElementById('chatContextMenu').style.display = 'none';
    let newText = prompt("重新编辑您的消息：", msg.text); if (newText === null || newText.trim() === "") return;
    msg.text = newText.trim(); globalChats[sessionId].splice(idx + 1); renderChatMessages(); saveAllData();
    await triggerAIBatchReply(sessionId, msg.text);
}

// 🌳 开辟分支（保留旧对话）：复制一份角色和到目前为止的聊天记录，另开一条独立时间线
window.contextActionBranchChat = function() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (chatContextMenuMsgIdx === null || !currentChatSessionId) return;
    if (currentChatSessionId.startsWith('g_')) return alert("群聊暂不支持分支功能！");

    const char = myCharacters.find(c => c.id == currentChatSessionId);
    if (!char) return;

    const branchName = prompt("为这条新的分支起个名字吧（原角色和聊天记录都会保留不变）：", char.name + " (分支)");
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
    let multiReplyBlock = `\n【回复指令】\n输出格式【必须严格遵守JSON】，不要包含任何 Markdown 语法。格式示例：\n{\n  "replies": [\n    {"text": "你想回复的对话或动作"}\n  ],\n  "stateUpdate": "你的内部状态", "statusTypeLabel": "闲"\n}`;

    let prompt = `${buildBasePrompt(char, true, recentHistory)}${getRecentPostsAwarenessText(char)}${getTimeAwarenessPrompt(sessionId, char)}${getChatNaturalnessPrompt()}
以下是我们最近的聊天记录（每条前面的[时间标记]是真实发出时间，不是现在；时间是持续流动的，不要把很久以前的事当成刚发生的）：
${recentHistory}

请尝试一条全新的思路重新生成你的最新回复。
${emoPrompt}
${actionTagReminder}
${multiReplyBlock}`;

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
            repText = applyRegexScripts(repText, 'ai_output');

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

async function sendChatMessage() {
    if (!currentChatSessionId) return; const sessionId = currentChatSessionId; const input = document.getElementById('chatInput'); let text = input.value.trim();
    if (!text && !pendingChatAttachment) return;
    text = applyRegexScripts(text, 'user_input');
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    const myMsg = { sender: 'me', text: text, timestamp: Date.now(), mediaUrl: pendingChatAttachment, readBy: [], quote: pendingChatQuote };
    globalChats[sessionId].push(myMsg);
    let triggerText = text; input.value = ''; clearAttachment('chat'); clearChatQuote(); renderChatMessages(); saveAllData(); checkAndAutoSummarizeChat(sessionId);
    embedMessageInBackground(myMsg);
    await triggerAIBatchReply(sessionId, triggerText);
}

async function triggerAIBatchReply(sessionId, triggerText) {
    const api = getApiConfig(true); 
    if (!api.key) return alert("请先配置 API Key！");
    
    let emoPrompt = getEmoticonPrompt(), isGroup = sessionId.startsWith('g_'), targetChars = [];
    let groupObj = null, speakOrder = 'all';
    if (isGroup) {
        groupObj = groupChats.find(x => x.id === sessionId);
        if (groupObj) {
            targetChars = groupObj.members.map(id => myCharacters.find(c => c.id == id)).filter(Boolean);
            speakOrder = groupObj.speakOrder || 'all';
            if (speakOrder === 'random') { for (let i = targetChars.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [targetChars[i], targetChars[j]] = [targetChars[j], targetChars[i]]; } }
        }
    } 
    else { let c = myCharacters.find(c => c.id == sessionId); if (c) targetChars = [c]; }

    let currentBatchText = triggerText, anyCharReplied = false;
    let semanticContextCache = {}; // 按角色缓存，避免群聊里给每个角色重复请求 embedding

    for (let char of targetChars) {
        let isMentioned = isGroup ? (currentBatchText.includes('@所有人') || currentBatchText.includes('@' + char.name) || ((char.handle||'').replace('@','').toLowerCase() && currentBatchText.toLowerCase().includes('@' + (char.handle||'').replace('@','').toLowerCase()))) : true;
        if (isGroup && speakOrder === 'mentioned' && !isMentioned) continue; // 仅@到的人回复模式：没被@就完全跳过，不给AI判断机会
        
        let recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns));
        let replyRule = (isMentioned || (isGroup && speakOrder === 'sequential')) ? `你被艾特了（或这是私聊，或本群设置了轮流发言），你【必须】回复，不能输出"NO"。` : (isGroup ? `如果觉得群里没人理你且无需回复，直接输出"NO"。` : `如果不知道怎么回可以输出"NO"。`);
        if (semanticContextCache[char.id] === undefined) semanticContextCache[char.id] = await getSemanticContext(sessionId, char, triggerText);
        let semanticContext = semanticContextCache[char.id];
        
       // 📝 独家新增：抓取导演耳语，并赋予最高优先级
        let anInput = document.getElementById('chatAuthorsNote');
        let anText = (anInput && anInput.style.display !== 'none') ? anInput.value.trim() : '';
        let anPrompt = anText ? `\n\n【导演耳语 (Author's Note) - 最高优先级上帝指令】：\n${anText}\n` : '';

        // ⚠️ 修复"角色不看用户发了什么、一直重复旧话题"的bug：
        // 之前最新消息只是被埋在很长的历史记录文本中间，容易被模型忽略。这里把它单独提出来，
        // 放在prompt末尾（模型注意力通常更集中在结尾），并明确要求必须针对这条最新内容来回复。
        let latestMsgObj = globalChats[sessionId][globalChats[sessionId].length - 1];
        let latestMsgText = latestMsgObj ? (latestMsgObj.sender === 'system' ? latestMsgObj.text : `${latestMsgObj.sender === 'me' ? currentUser.name : (myCharacters.find(c=>c.id==latestMsgObj.sender)?.name || '未知')}: ${latestMsgObj.text}`) : triggerText;
        let latestEmphasis = `\n\n【⚠️最新消息 - 请务必围绕这一条来回复，不要无视它、也不要延续更早之前已经聊完的旧话题】：\n${latestMsgText}\n`;

        // ⚠️ 修复"开启了动作/心理描写开关，但角色还是没有动作描写"的bug：
        // 之前这条规则只在 buildBasePrompt 里出现一次，位置偏早，容易被后面"真人聊天铁律"里大段
        // 强调"短句为主、别写小说化描写"的内容盖过去。这里在prompt末尾再明确重申一次，位置越靠后模型越重视。
        let actionTagReminder = allowActionTags
            ? `\n【重要格式要求】：你可以且应该适度使用括号（如()或【】）穿插动作、神态、心理描写，让对话更有画面感——这和"像真人一样自然聊天"并不冲突，不要因为追求聊天感就完全省略掉这些描写。\n`
            : `\n【重要格式要求】：绝对不要有任何动作、神态或心理描写，不要使用括号()或【】，只输出你直接说出的话。\n`;
        
        let multiReplyBlock = `【多段回复指令】\n回复条数随机不固定，单条字数少。模仿真实的微信聊天，通过多条简短消息（随机发送1到5条）和随机的时间间隔发送。\n输出格式【必须严格遵守JSON】，不要包含任何 Markdown 语法、不要带有 \`\`\`json 前缀，不要有任何其他的说明文字。如果决定不回复，请直接返回 {"replies": []}。\n格式示例：\n{\n  "replies": [\n    {"delay": 2, "text": "你要这么说的话..."},\n    {"delay": 3, "text": "我可就不困了啊[EMO:emo_123]"}\n  ],\n  "stateUpdate": "打算回去继续睡回笼觉", "statusTypeLabel": "睡觉"\n}`;

        let historyBlock = recentHistory ? `\n【聊天记录 — 每条前面的[时间标记]是这条消息实际发出的真实时间，不是现在。时间是持续流动的：如果标记显示是几小时前、昨天甚至更早，说明那件事已经过去了，不要把过去的事当成刚发生的事来回应（比如对方昨晚说吃了面条，今天问吃什么不能说"我才给你做的面条"，而应该像"昨天做的面条怎么样""你今天吃了什么"这样自然地体现时间已经过去）】：\n${recentHistory}\n` : '';

        let prompt = `${buildBasePrompt(char, true, recentHistory)}${historyBlock}${semanticContext}${getRecentPostsAwarenessText(char)}${getTimeAwarenessPrompt(sessionId, char)}${getChatNaturalnessPrompt()}

${replyRule}
你可以通过输出 [NUDGE] 主动拍一拍用户。也可艾特别人。
${emoPrompt}
${anPrompt}
${latestEmphasis}
${actionTagReminder}
${multiReplyBlock}`;

        try {
            if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { currentlyTypingChars.add(char.name); updateTypingIndicator(); }
            let data = await callChatCompletionAPI(api, prompt);
            
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
                // 降级处理
                replies = [{ delay: 1, text: rawText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim() }];
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
                if (repText.includes("[NUDGE]")) { repText = repText.replace(/\[NUDGE\]/ig, '').trim(); globalChats[sessionId].push({ sender: 'system', text: `"${char.name}" 拍了拍 "${currentUser.name}" ${currentUser.nudgeText || '的脑袋'}`, timestamp: Date.now() }); anyCharReplied = true; }
                
                if (!repText && isMentioned) repText = char.autoReplyText?.trim() || "嗯。";
                repText = applyRegexScripts(repText, 'ai_output');

                if (repText || repMediaUrl) {
                    const aiMsg = { sender: char.id, text: repText, timestamp: Date.now(), mediaUrl: repMediaUrl, readBy: [] };
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

// ==========================================
// 修复与升级：通过 URL 批量导入表情包 (完美支持多行 + 防冲突)
// ==========================================
function addEmoticonByUrl() {
    const input = document.getElementById('emoUrlInput').value.trim(); 
    if(!input) return;
    
    // 按换行符分割，支持一次性粘贴多行
    let lines = input.split('\n');
    let addedCount = 0;

    lines.forEach((line, index) => {
        line = line.trim();
        if(!line) return; // 跳过空行

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

        // 核心修复：ID 中加入 index 索引，彻底防止批量导入时瞬间生成相同 ID 导致互相覆盖
        globalEmoticons.push({ 
            id: 'emo_' + Date.now() + '_' + index + '_' + Math.floor(Math.random()*10000), 
            url: url, 
            desc: desc 
        });
        addedCount++;
    });
    
    document.getElementById('emoUrlInput').value = ''; 
    renderEmoticonManagerGallery(); 
    saveAllData();
    
    // 增加一个贴心的成功提示
    if (addedCount > 0) {
        alert(`✅ 成功批量导入了 ${addedCount} 个带描述的表情包！`);
    }
}

function deleteEmoticon(idx) { if(!confirm('删除这张表情/图片？')) return; globalEmoticons.splice(idx, 1); renderEmoticonManagerGallery(); saveAllData(); }

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
    msgs.forEach(m => {
        const ts = m.timestamp || Date.now();
        // 如果和上一条消息间隔超过4小时，插进一条分隔提示，让"中间跳过了一大段时间"这件事在文本里也直观可见
        if (lastTs !== null && (ts - lastTs) > 4 * 3600000) {
            lines.push(`——（中间过去了约 ${formatDurationZh(ts - lastTs)}）——`);
        }
        const tag = `[${formatRelativeTimeTag(ts)}]`;
        if (m.sender === 'system') {
            lines.push(`${tag} ${m.text}`);
        } else {
            const speaker = m.sender === 'me' ? currentUser.name : (myCharacters.find(c => c.id == m.sender)?.name || fallbackCharName || '未知');
            const quotePart = m.quote ? `[回复 ${m.quote.name}: ${m.quote.text}] ` : '';
            lines.push(`${tag} ${speaker}: ${quotePart}${m.text}`);
        }
        lastTs = ts;
    });
    return lines.join('\n');
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

function getCharacterWorldbookText(char, chatHistoryStr = "") {
    if (!worldbooks || worldbooks.length === 0) return '';
    
    let globalWbs = worldbooks.filter(w => w.isGlobal);
    let localWbs = char && char.worldbooks ? worldbooks.filter(w => char.worldbooks.includes(w.id) && !w.isGlobal) : [];
    let combined = [...globalWbs, ...localWbs];
    if (combined.length === 0) return '';

    const matchesKeywords = (w, text) => {
        if (!w.keywords || w.keywords.trim() === '') return true; // 没写关键词，无条件生效
        const keys = w.keywords.split(/[,，]/).map(k => k.trim()).filter(k => k);
        return keys.some(k => text.includes(k));
    };

    // 🔑 第一轮：关键词雷达过滤（对照聊天记录）
    let activeIds = new Set();
    combined.forEach(w => { if (matchesKeywords(w, chatHistoryStr)) activeIds.add(w.id); });

    // 🔁 递归触发：标记了"允许递归触发"的条目，还可以被【已生效条目的正文内容】里出现的关键词链式触发（最多3层，防止死循环）
    for (let depth = 0; depth < 3; depth++) {
        let scanText = combined.filter(w => activeIds.has(w.id)).map(w => w.content).join('\n');
        let addedAny = false;
        combined.forEach(w => {
            if (activeIds.has(w.id) || !w.recursive) return;
            if (matchesKeywords(w, scanText)) { activeIds.add(w.id); addedAny = true; }
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
    if (finalWbs.length === 0) return '';

    // ⚡ 字数预算：按优先级/权重顺序装入，超预算的低优先条目自动跳过（省token），但至少保证第一条不会被跳
    let lines = [], usedLen = 0;
    finalWbs.forEach((w, idx) => {
        const line = `- [权重${w.weight ?? 50}] ${w.title}: ${w.content}`;
        if (idx === 0 || usedLen + line.length <= worldbookCharBudget) { lines.push(line); usedLen += line.length; }
    });
    return `【当前触发的世界观设定（请严格遵循）】：\n` + lines.join('\n') + `\n\n`;
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

function buildBasePrompt(char, includeChatSummary = true, chatHistoryStr = "") {
    let prompt = `你是"${char.name}"，你的核心人设：${char.persona}。\n`;
    prompt += getCharacterWorldbookText(char, chatHistoryStr); // 将聊天记录传给世界书雷达
    prompt += getUserContextPrompt();
    if (char.memorySummary) prompt += `\n【你的专属推文记忆总结】：\n${char.memorySummary}\n`;
    if (includeChatSummary && char.chatSummary) {
        const recentSummary = getRecentChatSummaryText(char.chatSummary, 5);
        if (recentSummary) prompt += `\n【与用户的历史聊天总结（仅供你了解背景，都是已经聊过、翻篇的旧话题，除非跟当前对话自然衔接，否则不要主动重提或把话题拉回去，优先跟着最近的对话内容走）】：\n${recentSummary}\n`;
    }
    const groupTopics = getCharGroupChatTopics(char);
    if (groupTopics) prompt += `\n【你参与的群聊最近话题（发帖/发言时可以自然提及）】：\n${groupTopics}\n`;
    prompt += getRelationshipContextPrompt(char);
    prompt += getPluginPromptText(char); // 插件系统：提示词规则插件注入
    prompt += runPluginScriptHooks(char, chatHistoryStr); // 插件系统：进阶脚本钩子注入
    let actionRule = allowActionTags ? "你可以使用括号(如()或【】)来进行动作描写和心理描写。" : "不要有多余的动作描写或心理描写，直接输出说话或正文内容。";
    prompt += `\n【格式规则】：${actionRule}\n`;
    return applyPluginMacros(applyMacros(prompt, char), char);
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
    if (!char || !charRelationships || charRelationships.length === 0) return '';
    const edges = charRelationships.filter(r => r.fromId == char.id || r.toId == char.id);
    if (edges.length === 0) return '';

    let lines = edges.map(r => {
        const otherId = (r.fromId == char.id) ? r.toId : r.fromId;
        const other = otherId === 'me' ? currentUser : myCharacters.find(c => c.id == otherId);
        if (!other) return null;
        return `- 你与${otherId === 'me' ? `用户"${other.name}"` : `"${other.name}"`}的关系：${r.label}`;
    }).filter(Boolean);
    if (lines.length === 0) return '';

    return `\n【你的人物关系网】（这是你一直记得的关系，请让它自然影响你的称呼、语气和态度，但不要生硬地把关系标签念出来）：\n${lines.join('\n')}\n`;
}



// ===== 关系网驱动的角色互动：推文/爆料/论坛提及时，让有关系的角色自己决定要不要来 =====
async function triggerRelatedCharacterReactions(sourceChar, contextText, target) {
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
            const prompt = `你是"${item.char.name}"，人设：${item.char.persona}。
你与"${sourceChar.name}"的关系是：${item.label}。
刚刚"${sourceChar.name}"${actionDesc}，内容是："${contextText}"。
请结合你的人设和你们之间的关系，判断你是否会主动过来互动（评论/回复）——关系友好可能会声援或调侃，关系敌对可能会阴阳怪气或拆台，也可能压根不关心，一切以人设为准。
如果不会主动过来，只输出"NO"。
如果会，直接输出你要说的话（不超过${typeof postWordLimit !== 'undefined' ? postWordLimit : 60}字，不要带引号，语气要体现你和ta的关系，不要直接把关系标签念出来）。${actionStrictRule}`;
            const data = await sendChatRequest(api, prompt);
            let repText = data.choices?.[0]?.message?.content?.trim();
            if (!repText || repText.toUpperCase().startsWith('NO')) continue;

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
                thread.replies.push({ floor: nextFloor, author: item.char.name, isOp: false, content: repText, quoteFloor: null, likes: 0, timestamp: Date.now() });
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
    const filtered = activeWbCategoryFilter ? worldbooks.filter(w => (w.category || '') === activeWbCategoryFilter) : worldbooks;
    if(filtered.length === 0) { container.innerHTML = `<div class="empty-state" style="padding:20px;">分类「${escapeHtml(activeWbCategoryFilter)}」下暂无世界书</div>`; return; }
    const sorted = [...filtered].sort((a, b) => (b.weight ?? 50) - (a.weight ?? 50));
    container.innerHTML = sorted.map((w, i) => `
        <div class="wb-card">
            <div style="position:absolute; top:4px; right:4px; display:flex; gap:8px;">
                <button style="background:none; border:none; color:#1d9bf0; cursor:pointer; font-size:14px;" onclick="editWorldbook(${w.id})">✏️</button>
                <button style="background:none; border:none; color:#f91880; cursor:pointer; font-size:16px;" onclick="deleteWorldbook(${w.id})">×</button>
            </div>
            <div class="wb-title">${escapeHtml(w.title)} <span style="font-size:11px; font-weight:normal; color:#8b98a5;">权重${w.weight ?? 50}</span></div>
            ${w.category && w.category.trim() ? `<div style="font-size:11px; margin:0 0 4px;"><span class="group-tag" style="margin-left:0; background:#7856ff;" onclick="filterWorldbookByCategory('${w.category.replace(/'/g, "\\'")}')">🏷️ ${escapeHtml(w.category)}</span></div>` : ''}
            ${w.keywords && w.keywords.trim() ? `<div style="font-size:11px; color:#f91880; margin:2px 0 4px;">🔑 关键词触发：${escapeHtml(w.keywords)}</div>` : `<div style="font-size:11px; color:#8b98a5; margin:2px 0 4px;">♾️ 无条件生效</div>`}
            ${(w.group && w.group.trim()) || w.recursive ? `<div style="font-size:11px; color:#7856ff; margin:0 0 4px;">${w.group && w.group.trim() ? `🔀 互斥分组：${escapeHtml(w.group)}（优先级${w.priority ?? 0}）` : ''}${w.recursive ? ' 🔁 可递归触发' : ''}</div>` : ''}
            <div class="wb-content">${escapeHtml(w.content)}</div>
            <div style="margin-top:auto; padding-top:8px; border-top:1px dashed #eff3f4; text-align:center;">
                <button class="btn-edit-small" style="width:100%; transition:0.2s; ${w.isGlobal ? 'background:#1d9bf0; color:white;' : 'background:rgba(255,255,255,0.8); color:#1d9bf0;'}" onclick="toggleWorldbookGlobal(${w.id})">
                    ${w.isGlobal ? '🌟 全局已生效' : '设为全局生效'}
                </button>
            </div>
        </div>`).join('');
}

// ===== 世界书分类：标题栏右侧的筛选条 + 自定义/删除标签管理 =====
function renderWorldbookCategoryBar() {
    const bar = document.getElementById('wbCategoryBar');
    if (!bar) return;
    const tags = [{ label: '全部', val: null }, ...worldbookCategories.map(cat => ({ label: cat, val: cat }))];
    bar.innerHTML = tags.map(t => `<span class="group-tag" style="margin-left:0; background:${activeWbCategoryFilter === t.val ? '#7856ff' : 'rgba(120,86,255,0.15)'}; color:${activeWbCategoryFilter === t.val ? 'white' : '#7856ff'};" onclick="filterWorldbookByCategory(${t.val === null ? 'null' : `'${t.val.replace(/'/g, "\\'")}'`})">${escapeHtml(t.label)}</span>`).join('')
        + `<span class="group-tag" style="margin-left:0; background:rgba(29,155,240,0.1); color:#1d9bf0;" onclick="openWbCategoryManagerModal()" title="新增/删除分类标签">🏷️ 管理</span>`;
}

function filterWorldbookByCategory(cat) {
    activeWbCategoryFilter = cat;
    renderWorldbookCards();
}

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

function deleteWbCategory(idx) {
    const catName = worldbookCategories[idx];
    if (!confirm(`删除分类"${catName}"？该分类下的世界书将变为无分类。`)) return;
    worldbooks.forEach(w => { if ((w.category || '') === catName) w.category = ''; });
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

    if(!title || !content) return alert("请完整填写标题和内容");

    if (id) {
        const wb = worldbooks.find(w => w.id == id);
        if (wb) { wb.title = title; wb.content = content; wb.weight = weight; wb.keywords = keywords; wb.priority = priority; wb.group = group; wb.recursive = recursive; wb.category = category; }
    } else {
        worldbooks.push({ id: Date.now(), title, content, isGlobal: false, weight, keywords, priority, group, recursive, category });
    }
    cancelEditWb(); renderWorldbookCards(); saveAllData();
}

function editWorldbook(id) {
    const wb = worldbooks.find(w => w.id === id);
    if(!wb) return;
    document.getElementById('editWbId').value = wb.id;
    document.getElementById('newWbTitle').value = wb.title;
    document.getElementById('newWbContent').value = wb.content;
    document.getElementById('newWbWeight').value = wb.weight ?? 50;
    if(document.getElementById('newWbKeywords')) document.getElementById('newWbKeywords').value = wb.keywords || '';
    if(document.getElementById('newWbPriority')) document.getElementById('newWbPriority').value = wb.priority ?? 0;
    if(document.getElementById('newWbGroup')) document.getElementById('newWbGroup').value = wb.group || '';
    if(document.getElementById('newWbRecursive')) document.getElementById('newWbRecursive').checked = !!wb.recursive;
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
    document.getElementById('newWbWeight').value = 50;
    if(document.getElementById('newWbKeywords')) document.getElementById('newWbKeywords').value = '';
    if(document.getElementById('newWbPriority')) document.getElementById('newWbPriority').value = 0;
    if(document.getElementById('newWbGroup')) document.getElementById('newWbGroup').value = '';
    if(document.getElementById('newWbRecursive')) document.getElementById('newWbRecursive').checked = false;
    if(document.getElementById('newWbCategory')) document.getElementById('newWbCategory').value = '';
    document.getElementById('wbFormTitle').innerText = "新增世界书设定";
    document.getElementById('saveWbBtn').innerText = "添加并保存";
    document.getElementById('cancelWbBtn').style.display = 'none';
}

function deleteWorldbook(id) { 
    if(!confirm("确定要删除这本世界书吗？")) return; 
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
    c.innerHTML = characterGroups.map((g, i) => `<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eff3f4;"><span style="font-size:15px; display:flex; align-items:center; gap:8px;"><svg class="blue-line-icon" style="width:16px;height:16px;" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> <input type="text" value="${g}" style="border:1px solid transparent; background:transparent; font-size:15px; width:150px; outline:none; color:#1d9bf0;" onfocus="this.style.border='1px solid #1d9bf0'; this.style.borderRadius='4px';" onblur="this.style.border='1px solid transparent'; editGroup(${i}, this.value)"><span style="color:#536471; font-size:12px;">(${myCharacters.filter(c=>c.group===g).length} 人)</span></span><button onclick="deleteGroup(${i})" style="background:none; border:none; color:#f91880; cursor:pointer; font-size:18px; padding:2px 6px;">×</button></div>`).join('');
}
function addGroup() { const val = document.getElementById('newGroupInput').value.trim(); if (!val) return; if (characterGroups.includes(val)) return alert("分组已存在！"); characterGroups.push(val); document.getElementById('newGroupInput').value = ''; renderGroupList(); saveAllData(); }
function editGroup(idx, newVal) { newVal = newVal.trim(); if (!newVal || newVal === characterGroups[idx]) { renderGroupList(); return; } if (characterGroups.includes(newVal)) { alert("分组名已存在"); renderGroupList(); return; } const oldGroup = characterGroups[idx]; characterGroups[idx] = newVal; myCharacters.forEach(c => { if (c.group === oldGroup) c.group = newVal; }); renderGroupList(); refreshGroupFilterBar(); saveAllData(); }
function deleteGroup(idx) { const groupName = characterGroups[idx]; if (!confirm(`删除分组"${groupName}"？该分组下的角色将变为无分组。`)) return; myCharacters.forEach(c => { if (c.group === groupName) c.group = ''; }); characterGroups.splice(idx, 1); renderGroupList(); saveAllData(); }
function filterByGroup(g) { activeGroupFilter = g; renderCenterCharList(); }
function refreshGroupFilterBar() {
    const bar = document.getElementById('groupFilterBar'); const tags = [{ label: '全部', val: null, color: 'white' }, ...characterGroups.map(g => ({ label: g, val: g, color: 'white' }))];
    bar.innerHTML = tags.map(t => `<span class="group-tag" style="background:${activeGroupFilter === t.val ? '#1d9bf0' : t.color}; color:${activeGroupFilter === t.val ? 'white' : '#1d9bf0'}; border:1px solid #1d9bf0;" onclick="filterByGroup(${t.val === null ? 'null' : `'${t.val}'`})">${t.label}</span>`).join('');
}
function refreshGroupSelect() { const sel = document.getElementById('charGroup'); sel.innerHTML = '<option value="">-- 无分组 --</option>' + characterGroups.map(g => `<option value="${g}">${g}</option>`).join(''); }

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


async function checkAndAutoSummarizeChat(sessionId) {
    if (sessionId.toString().startsWith('g_')) { checkAndAutoSummarizeGroupChat(sessionId); return; }
    let session = globalChats[sessionId]; if (!session || session.length === 0) return;
    
    let validMsgs = session.filter(m => m.sender !== 'system'); 
    if (validMsgs.length === 0 || validMsgs.length % 20 !== 0) return;
    
    let char = myCharacters.find(c => c.id == sessionId);
    const api = getApiConfig(true); if (!char || !api.key) return;

    let recent20 = validMsgs.slice(-20).map(m => (m.sender === 'me' ? "用户: " : char.name + ": ") + m.text).join('\n');
    let prompt = `请简要总结以下用户与"${char.name}"的最近20条对话内容，提取出关键信息、当前话题和双方的情感状态（100字以内）。\n\n对话记录：\n${recent20}`;

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
    let group = groupChats.find(g => g.id === sessionId); if (!group) return;
    let session = globalChats[sessionId]; if (!session || session.length === 0) return;

    let validMsgs = session.filter(m => m.sender !== 'system');
    if (validMsgs.length === 0 || validMsgs.length % 50 !== 0) return;

    const api = getApiConfig(true); if (!api.key) return;

    let recent50 = validMsgs.slice(-50).map(m => {
        if (m.sender === 'me') return `${currentUser.name}: ${m.text}`;
        let c = myCharacters.find(c => c.id == m.sender);
        return (c ? c.name : m.sender) + ': ' + m.text;
    }).join('\n');
    let prompt = `请简要总结以下群聊"${group.name}"最近50条对话内容，提取出当前热门话题、群里的氛围、以及各人的主要观点或立场（150字以内）。\n\n对话记录：\n${recent50}`;

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
    const api = getApiConfig(false); if (!api.key) return;
    const posts = getCharRecentPosts(char.id, 20); if (posts.length === 0) return;
    const prompt = `你是记忆管理AI。请用100字以内，总结推特用户"${char.name}"（人设：${char.persona}）最近20条帖子的关注点、情绪和经历规律：\n${posts.map((p, i) => `${i+1}. ${p.text}`).join('\n')}`;

    try {
        const data = await sendChatRequest(api, prompt, { max_tokens: 200 });
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

function startAutoPostTimer() {
    setInterval(async () => {
        if (!myApiKey || isGenerating) return; 
        let now = Date.now(), charsToPost = [];
        
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
          } catch (e) { console.error(`角色"${char && char.name}"的发帖计时器计算出错，已跳过：`, e); }
        }
        
        if (charsToPost.length > 0 && typeof executeGeneration === 'function') { 
            await executeGeneration(charsToPost.slice(0, 3)); 
        }
    }, 15000); // 每15秒轮询一次检测
}
// ====== 新的主动发消息与后台唤醒逻辑 ======
let isProactiveChatRunning = false;

async function checkAndTriggerProactiveChats() {
    const api = getApiConfig(true); 
    if (!api.key || isProactiveChatRunning) return;
    
    let now = Date.now();
    // 找出需要发消息的角色
    let due = myCharacters.filter(char => {
        // 如果没设置频率，直接跳过
        if (!char.chatFreq || !char.chatFreq.interval || char.chatFreq.interval <= 0) return false;
        
        // 计算间隔毫秒数
        let reqMs = char.chatFreq.interval * (char.chatFreq.unit === 'minute' ? 60000 : char.chatFreq.unit === 'hour' ? 3600000 : 86400000);
        
        // 核心：直接去聊天记录里找“最后一句话”的时间
        let sessionId = String(char.id);
        let chatHistory = globalChats[sessionId] || [];
        
        let lastTime = now;
        if (chatHistory.length > 0) {
            // 获取聊天记录里最后一条消息的时间（不管是你发的还是TA发的）
            lastTime = chatHistory[chatHistory.length - 1].timestamp || now;
        } 
        
        // 如果之前因为网络报错没发成功，用上一次尝试的时间兜底，防止无限死循环报错
        lastTime = Math.max(lastTime, char.lastChatProactiveTime || 0);
        
        // 如果当前时间 减去 最后一句话的时间，大于设定的间隔，就触发！
        return (now - lastTime) >= reqMs;
    });

    if (due.length === 0) return; 
    
    isProactiveChatRunning = true;
    for (let char of due.slice(0, 2)) { 
        // 触发前，更新一下时间记录
        char.lastChatProactiveTime = now; 
        await sendProactiveChatMessage(char); 
    }
    isProactiveChatRunning = false; 
    saveAllData();
}

function startProactiveChatTimer() {
    // 保留每20秒检查一次（用于你一直开着屏幕的时候）
    setInterval(checkAndTriggerProactiveChats, 20000);

}


// 🎯 黑科技 1：监听普通手机浏览器"从后台切回前台"
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'visible') {
        onAppForeground();
    }
});

// 🎯 黑科技 2：监听 HBuilderX 打包的 APK "从后台唤醒"
document.addEventListener("plusready", () => {
    document.addEventListener("resume", () => {
        onAppForeground();
    }, false);
});
// =====================================

// 手机后台时，系统会限流甚至暂停JS定时器和正在进行的请求，导致"挂后台就停止生成"——
// 这是安卓/WebView本身的省电机制，网页层面没法让后台无限期跑下去，只能在切回前台的
// 瞬间把该检查的都补一遍，尽量做到"回来就自动接上"，而不是干等着下一次触发。
function onAppForeground() {
    checkAndTriggerProactiveChats();
    if (typeof checkAndFlowSchedules === 'function') checkAndFlowSchedules();
    // 如果正在看着某个聊天，回到前台时重新渲染一下，避免停留在挂起前的旧画面
    if (currentChatSessionId && document.getElementById('view-chat') && document.getElementById('view-chat').style.display !== 'none') {
        renderChatMessages();
    }
}

async function sendProactiveChatMessage(char) {
    const api = getApiConfig(true); 
    if (!api.key) return;

    let sessionId = String(char.id);
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    
    let recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns), char.name);
    let emoPrompt = getEmoticonPrompt();
    let actionTagReminder = allowActionTags
        ? `\n【重要格式要求】：你可以且应该适度使用括号（如()或【】）穿插动作、神态、心理描写，让对话更有画面感——这和"像真人一样自然聊天"并不冲突。\n`
        : `\n【重要格式要求】：绝对不要有任何动作、神态或心理描写，不要使用括号()或【】，只输出你直接说出的话。\n`;
    
    let prompt = `${buildBasePrompt(char, true, recentHistory)}${getRecentPostsAwarenessText(char)}${getTimeAwarenessPrompt(sessionId, char)}${getChatNaturalnessPrompt()}
以下是你们最近的聊天记录（每条前面的[时间标记]是真实发出时间，不是现在；时间是持续流动的，不要把很久以前的事当成刚发生的）：
${recentHistory || '(暂无记录)'}
现在，请主动找用户开启一次对话。优先考虑聊你自己感兴趣、最近在琢磨的新鲜事（结合你的兴趣列表和人设），而不是重复或延续之前已经聊完的旧话题；只有当你的兴趣里确实没什么可聊、或者上次的话题明显没聊完时，才继续之前的话题。
你可以通过输出 [NUDGE] 主动拍一拍用户。
${emoPrompt}
${actionTagReminder}
【多段回复指令】
回复条数随机不固定，单条字数少。模仿真实的微信聊天，通过多条简短消息（随机发送1到5条）和随机的时间间隔发送。
输出格式【必须严格遵守JSON】，不要包含任何 Markdown 语法、不要带有 \`\`\`json 前缀。如果决定不发了，返回 {"replies": []}。
格式示例：
{
  "replies": [
    {"delay": 2, "text": "在吗？"},
    {"delay": 3, "text": "突然想起一件事[EMO:emo_123]"}
  ],
  "stateUpdate": "发完消息准备去洗澡", "statusTypeLabel": "闲"
}`;

    try {
        let data = await sendChatRequest(api, prompt);
        if (data.error) return;

        let rawText = data.choices?.[0]?.message?.content?.trim() || "";
        let replies = [];
        try {
            let parsed = extractJsonObject(rawText);
            if (!parsed) throw new Error("No JSON object found");
            runPluginResponseHooks(char, sessionId, parsed); // 插件系统：好感度/日程联动等行为现在由插件接管
            if (parsed.replies && Array.isArray(parsed.replies)) replies = parsed.replies;
            if (parsed.stateUpdate) saveCharLifeState(char, parsed.stateUpdate, parsed.statusTypeLabel);
        } catch (err) {
            replies = [{ delay: 1, text: rawText }];
        }
        if (replies.length === 0) return;

        for (let replyObj of replies) {
            let repText = replyObj.text || "";
            let delaySec = replyObj.delay || 1;

            if (!repText || (repText.toUpperCase().startsWith("NO") && repText.length < 5)) continue;

            // 核心：主动发消息时的打字停顿感
            if (delaySec > 0) {
                if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') {
                    currentlyTypingChars.add(char.name); updateTypingIndicator();
                }
                await new Promise(r => setTimeout(r, delaySec * 1000));
                currentlyTypingChars.delete(char.name); updateTypingIndicator();
            }

            let repMediaUrl = null; 
            let emoMatch = repText.match(/\[EMO:(emo_\w+)\]/i);
            if (emoMatch) { 
                let emo = globalEmoticons.find(e => e.id === emoMatch[1]); 
                if (emo) repMediaUrl = emo.url; 
                repText = repText.replace(emoMatch[0], '').trim(); 
            }
            
            if (repText.includes("[NUDGE]")) { 
                repText = repText.replace(/\[NUDGE\]/ig, '').trim(); 
                globalChats[sessionId].push({ sender: 'system', text: `"${char.name}" 拍了拍 "${currentUser.name}" ${currentUser.nudgeText || '的脑袋'}`, timestamp: Date.now() }); 
            }

            if (repText || repMediaUrl) {
                globalChats[sessionId].push({ sender: char.id, text: repText, timestamp: Date.now(), mediaUrl: repMediaUrl, readBy: [] });
                
                if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { 
                    renderChatMessages(); 
                } else {
                    let avatarHtml = getAvatarHTML(char, 80);
                    showToast(avatarHtml, `${char.name} 发来消息`, repText || "[图片/表情/拍一拍]", null, sessionId);
                    globalNotifications.unshift({ text: `<b>${char.name}</b> 给您发来消息`, postId: null, chatCharId: sessionId, timestamp: Date.now() }); 
                    unreadNotifs++; updateNotifBadge(); renderChatCharList();
                }
                saveAllData(); checkAndAutoSummarizeChat(sessionId);
            }
        }
    } catch(e) { console.error("主动发送消息网络请求失败:", e); }
}

document.addEventListener('click', () => { 
    document.getElementById('customContextMenu').style.display = 'none'; 
    document.getElementById('chatContextMenu').style.display = 'none'; 
    document.getElementById('novelContextMenu').style.display = 'none';
});

function showFollowingContextMenu(e, charId) {
    e.preventDefault(); e.stopPropagation();
    suppressCardClickUntil = Date.now() + 500; // 抑制紧随长按而来的幽灵 click，防止菜单被瞬间关闭/卡片被误触跳转
    contextMenuTargetId = charId; const char = myCharacters.find(c => c.id == charId); if(!char) return;
    const menu = document.getElementById('customContextMenu'); document.getElementById('ctxBtnStar').innerText = char.isSpecialFollow ? "取消星标" : "特别关注⭐";
    menu.style.display = 'flex'; let x = e.pageX, y = e.pageY; if(x + 160 > window.innerWidth) x -= 160; if(y + 100 > window.innerHeight) y -= 100; menu.style.left = x + 'px'; menu.style.top = y + 'px';
}

// 修复：已关注角色右键(长按)菜单——把跳转个人页的点击和弹出菜单的长按拆开，避免互相打断
function handleFollowingCardClick(e, charId) {
    if (Date.now() < suppressCardClickUntil) { e.stopPropagation(); return; }
    switchMainView('profile', charId);
}

let contextNovelId = null;
function showNovelContextMenu(e, id) {
    e.preventDefault();
    contextNovelId = id;
    const menu = document.getElementById('novelContextMenu');
    menu.style.display = 'flex'; 
    let x = e.pageX, y = e.pageY; 
    if(x + 150 > window.innerWidth) x -= 150; 
    if(y + 100 > window.innerHeight) y -= 100; 
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
}
function contextActionExportNovel() {
    if(!contextNovelId) return;
    const novel = globalNovels.find(n => n.id === contextNovelId);
    if(!novel) return;
    let txt = `《${novel.title || '未命名故事'}》\n\n【故事大纲】\n${novel.outline || '无'}\n\n`;
    novel.chapters.forEach(c => { txt += `=== 第 ${c.index} 章 ===\n${c.content}\n\n`; });
    saveTextFileForApp(`${(novel.title || '未命名故事').replace(/[\\/:*?"<>|]/g, "_")}.txt`, txt, 'text/plain');
    document.getElementById('novelContextMenu').style.display = 'none';
}
function contextActionDeleteNovel() {
    if(!contextNovelId) return;
    if(confirm('警告：确定要删除这部故事及所有章节吗？操作不可逆！')) {
        globalNovels = globalNovels.filter(n => n.id !== contextNovelId);
        saveAllData(); renderNovelList();
    }
    document.getElementById('novelContextMenu').style.display = 'none';
}

function contextActionStar() { if(!contextMenuTargetId) return; let char = myCharacters.find(c => c.id == contextMenuTargetId); if(char) { char.isSpecialFollow = !char.isSpecialFollow; renderFollowingList(); saveAllData(); } }
function contextActionUnfollow() { if(!contextMenuTargetId) return; let char = myCharacters.find(c => c.id == contextMenuTargetId); if(char) { char.isFollowing = false; char.isSpecialFollow = false; updateAllFollowButtons(char.id, false); renderFollowingList(); saveAllData(); } }

function toggleFollow(charId, event) {
    if (event) event.stopPropagation(); 
    let char = charId === 'tabloid_admin' ? tabloidAccount : myCharacters.find(c => c.id == charId);
    if (char) {
        char.isFollowing = !char.isFollowing; 
        updateAllFollowButtons(char.id, char.isFollowing); 
        saveAllData(); 
        if (document.getElementById('view-following-list').style.display !== 'none') {
            renderFollowingList();
        }
    }
}

function updateAllFollowButtons(charId, isFollowing) { document.querySelectorAll(`.btn-follow-${charId}`).forEach(btn => { btn.className = isFollowing ? `follow-btn following btn-follow-${charId}` : `follow-btn btn-follow-${charId}`; btn.innerText = isFollowing ? "已关注" : "关注"; }); }

function editPost(postId, el) {
    let post = globalPosts.find(p => p.id == postId); if (!post || el.querySelector('textarea')) return;
    el.innerHTML = `<textarea id="edit-post-input-${postId}" style="width:100%; min-height:80px; font-family:inherit; font-size:15px; padding:10px; border:1px solid #1d9bf0; border-radius:8px; outline:none; margin-bottom:8px; background:rgba(255,255,255,0.8);" onclick="event.stopPropagation()">${post.text}</textarea><div style="display:flex; align-items:center; gap:8px;">${locationSVG}<input type="text" id="edit-post-loc-${postId}" value="${post.location || ''}" placeholder="自定义定位名称 (选填)" style="flex:1; padding:6px 10px; border:1px solid #1d9bf0; border-radius:8px; outline:none; font-size:13px; background:rgba(255,255,255,0.8);" onclick="event.stopPropagation()"></div><div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;"><button class="btn-edit-small" onclick="savePostEdit('${postId}', event)">保存修改</button><button class="btn-edit-small" style="color:#536471; border-color:#cfd9de;" onclick="cancelPostEdit('${postId}', event)">取消</button></div>`;
}
function savePostEdit(postId, e) {
    e.stopPropagation(); let post = globalPosts.find(p => p.id == postId); 
    if (post) { post.text = document.getElementById(`edit-post-input-${postId}`).value; post.location = document.getElementById(`edit-post-loc-${postId}`).value.trim(); }
    saveAllData(); if (typeof renderPosts === "function" && document.getElementById('view-home').style.display !== 'none') renderPosts(); if (typeof renderProfileFeed === "function" && document.getElementById('view-profile').style.display !== 'none') renderProfileFeed(); if (typeof renderSinglePostDetail === "function" && document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
}
function cancelPostEdit(postId, e) {
    e.stopPropagation(); if (typeof renderPosts === "function" && document.getElementById('view-home').style.display !== 'none') renderPosts(); if (typeof renderProfileFeed === "function" && document.getElementById('view-profile').style.display !== 'none') renderProfileFeed(); if (typeof renderSinglePostDetail === "function" && document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
}
function deletePost(postId, event) {
    event.stopPropagation();
    if(confirm('确定要删除这条帖子吗？该操作不可逆！')) { globalPosts = globalPosts.filter(p => p.id != postId); saveAllData(); if(typeof renderPosts === "function" && document.getElementById('view-home').style.display !== 'none') renderPosts(); if(typeof renderProfileFeed === "function" && document.getElementById('view-profile').style.display !== 'none') renderProfileFeed(); }
}

function hideAllViews() {
    ['home','profile','tag','search','notifications','post-detail','following-list','chat','anon-forum','diary','novel','tabloid','mobile-trends','faction-network','faction-members','char-relations','faction-overview','memory-album','character-center','settings','worldbook','plugins','ai-enhance'].forEach(v => { const el = document.getElementById(`view-${v}`); if(el) el.style.display = 'none'; });
    ['nav-home','nav-following','nav-notif','nav-myprofile','nav-chat','nav-anon','nav-diary','nav-novel','nav-tabloid','nav-faction'].forEach(id => { const el = document.getElementById(id); if(el) el.className = 'nav-item'; });
    ['mnav-home','mnav-notif','mnav-chat','mnav-search'].forEach(id => { const el = document.getElementById(id); if(el) el.className = 'mnav-item'; });
    document.getElementById('rightPanelTrend').style.display = 'block'; document.getElementById('rightPanelProfile').style.display = 'none';
}

const mobileViewTitles = { home:'主页', anonForum:'匿名论坛', diary:'信件与日记', novel:'故事', tabloid:'营销号', profile:'个人资料', tag:'标签', search:'全站搜索', notifications:'通知', postDetail:'帖子', followingList:'我的关注', chat:'聊天', factionNetwork:'势力关系网', factionMembers:'势力成员', charRelations:'角色关系', factionOverview:'势力总览', characterCenter:'角色中心', settings:'系统设置', worldbook:'世界书', plugins:'插件', 'ai-enhance':'AI增强功能' };

function switchMainView(viewId, param = null) {
    pushViewHistory(viewId);
    hideAllViews();
    closeDrawer();
    const mtEl = document.getElementById('mobileTopTitle'); if (mtEl) mtEl.innerText = mobileViewTitles[viewId] || '谷雨';
    const mSearchCenter = document.getElementById('mtbCenterSearch'), mTitleCenter = document.getElementById('mtbCenterTitle');
    if (mSearchCenter && mSearchCenter.style.display !== 'none') { mSearchCenter.style.display = 'none'; if (mTitleCenter) mTitleCenter.style.display = 'flex'; }
    if (viewId === 'home') { document.getElementById('view-home').style.display = 'block'; document.getElementById('nav-home').className = 'nav-item active'; const m=document.getElementById('mnav-home'); if(m) m.className='mnav-item active'; if(typeof renderPosts === 'function') renderPosts(); }
    else if (viewId === 'anonForum') { document.getElementById('view-anon-forum').style.display = 'block'; document.getElementById('nav-anon').className = 'nav-item active'; if(typeof renderAnonPosts === 'function') renderAnonPosts(); }
    else if (viewId === 'diary') { document.getElementById('view-diary').style.display = 'block'; document.getElementById('nav-diary').className = 'nav-item active'; renderDiaryCharList(); }
    else if (viewId === 'novel') { document.getElementById('view-novel').style.display = 'block'; document.getElementById('nav-novel').className = 'nav-item active'; renderNovelList(); }
    else if (viewId === 'tabloid') { document.getElementById('view-tabloid').style.display = 'block'; document.getElementById('nav-tabloid').className = 'nav-item active'; renderTabloidCharPicker(); }
    else if (viewId === 'profile') { document.getElementById('view-profile').style.display = 'block'; if(param === 'me') document.getElementById('nav-myprofile').className = 'nav-item active'; renderProfilePage(param); }
    else if (viewId === 'tag') { document.getElementById('view-tag').style.display = 'block'; document.getElementById('currentTagTitle').innerText = param; if(typeof renderPosts === 'function') renderPosts(param); }
    else if (viewId === 'search') { document.getElementById('view-search').style.display = 'block'; document.getElementById('currentSearchTitle').innerText = param; document.getElementById('globalSearchInput').value = ''; const m=document.getElementById('mnav-search'); if(m) m.className='mnav-item active'; if(typeof renderSearchPosts === 'function') renderSearchPosts(param); }
    else if (viewId === 'notifications') { document.getElementById('view-notifications').style.display = 'block'; document.getElementById('nav-notif').className = 'nav-item active'; const m=document.getElementById('mnav-notif'); if(m) m.className='mnav-item active'; unreadNotifs = 0; if(typeof updateNotifBadge === 'function') updateNotifBadge(); if(typeof renderNotifications === 'function') renderNotifications(); }
    else if (viewId === 'postDetail') { document.getElementById('view-post-detail').style.display = 'block'; if(typeof renderSinglePostDetail === 'function') renderSinglePostDetail(param); }
    else if (viewId === 'followingList') { document.getElementById('view-following-list').style.display = 'block'; document.getElementById('nav-following').className = 'nav-item active'; renderFollowingList(); }
    else if (viewId === 'chat') { 
        document.getElementById('view-chat').style.display = 'flex'; document.getElementById('nav-chat').className = 'nav-item active'; const m=document.getElementById('mnav-chat'); if(m) m.className='mnav-item active'; renderChatCharList(); 
        if(!currentChatSessionId && myCharacters.length>0) switchChatSession(myCharacters[0].id); else if(currentChatSessionId) renderChatMessages();
    }
    else if (viewId === 'factionNetwork') { document.getElementById('view-faction-network').style.display = 'block'; document.getElementById('nav-faction').className = 'nav-item active'; renderFactionNetworkGrid(); }
    else if (viewId === 'factionMembers') { document.getElementById('view-faction-members').style.display = 'block'; renderFactionMembersGrid(param); }
    else if (viewId === 'charRelations') { document.getElementById('view-char-relations').style.display = 'block'; renderCharRelationsView(param); }
    else if (viewId === 'factionOverview') { document.getElementById('view-faction-overview').style.display = 'block'; renderFactionOverviewList(); }
    else if (viewId === 'characterCenter') {
        document.getElementById('view-character-center').style.display = 'block';
        const nav = document.getElementById('nav-charcenter'); if (nav) nav.className = 'nav-item active';
        refreshGroupFilterBar(); refreshGroupSelect(); renderCenterCharList(); renderStatusTypesList();
        document.getElementById('characterListView').style.display = 'block';
        document.getElementById('characterFormView').style.display = 'none';
    }
    else if (viewId === 'settings') {
        document.getElementById('view-settings').style.display = 'block';
        if(typeof renderCharReplyToggleList === 'function') renderCharReplyToggleList();
        if(typeof renderRegexScriptsList === 'function') renderRegexScriptsList();
    }
    else if (viewId === 'worldbook') {
        document.getElementById('view-worldbook').style.display = 'block';
        if(typeof refreshWbCategorySelect === 'function') refreshWbCategorySelect();
        if(typeof renderWorldbookCards === 'function') renderWorldbookCards();
    }
    else if (viewId === 'plugins') {
        document.getElementById('view-plugins').style.display = 'block';
        populatePluginScopeSelect();
        renderPluginsList();
    }
    else if (viewId === 'ai-enhance') {
        document.getElementById('view-ai-enhance').style.display = 'block';
        renderRegexScriptsList();
    }
}

// ===== 信封与日记逻辑 =====
function renderDiaryCharList() {
    const container = document.getElementById('diaryCharList');
    if(myCharacters.length === 0) { container.innerHTML = '<div style="color:#888;">暂无角色，请先创建角色。</div>'; return; }
    container.innerHTML = myCharacters.map(c => `<div style="display:flex; flex-direction:column; align-items:center; cursor:pointer; opacity:${currentDiaryCharId == c.id ? '1' : '0.5'}; transition:0.2s;" onclick="selectDiaryChar('${c.id}')">${getAvatarHTML(c, 50)}<div style="font-size:12px; margin-top:5px;">${c.name}</div></div>`).join('');
    if(!currentDiaryCharId && myCharacters.length > 0) selectDiaryChar(myCharacters[0].id); else renderDiaryContent();
}
function selectDiaryChar(id) { currentDiaryCharId = id; renderDiaryCharList(); }
function switchDiaryTab(tab) { currentDiaryTab = tab; document.getElementById('diary-tab-letter').className = tab === 'letter' ? 'tab active' : 'tab'; document.getElementById('diary-tab-diary').className = tab === 'diary' ? 'tab active' : 'tab'; renderDiaryContent(); }

function renderDiaryContent() {
    document.getElementById('diaryTempArea').style.display = 'none'; document.getElementById('diaryListArea').style.display = 'block';
    const char = myCharacters.find(c => c.id == currentDiaryCharId); if(!char) return;
    if(!char.diaryData || typeof char.diaryData.letter === 'string') char.diaryData = { letters: [], diaries: [] };
    const list = currentDiaryTab === 'letter' ? char.diaryData.letters : char.diaryData.diaries;
    const container = document.getElementById('diaryCardsContainer');

    if(!list || list.length === 0) { container.innerHTML = `<div class=\"empty-state\">对方似乎还在构思${currentDiaryTab === 'letter' ? '信件' : '日记'}。<br>问一问Ta吧！</div>`; return; }
    container.innerHTML = list.map(item => {
        let excerpts = item.content.split('\n').map(p=>p.trim()).filter(p=>p).slice(0, 2).join('<br><br>');
        return `<div class=\"diary-card\" onclick=\"openDiaryDetail('${item.id}')\"><div class=\"diary-card-title\">${item.title || '无题'}</div><div class=\"diary-card-date\">${new Date(item.date).toLocaleString()}</div><div class=\"diary-card-excerpt\">${excerpts}</div></div>`;
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
    let prompt = `${buildBasePrompt(char, true, recentChat + '\n' + recentPosts)}请你结合上述你的核心人设、世界观背景、推文记忆总结、历史聊天总结，以及以下近期的动态、聊天记录${diaryUploadedTxtContent ? '和用户上传的参考素材' : ''}，写一封${targetType}。字数${limit}字左右。要深刻体现你的性格情感。
最近推文：\n${recentPosts || '暂无'}\n近期聊天记录：\n${recentChat || '暂无'}${txtContext}

【极为严格的格式要求】：请仅返回合法 JSON 格式，决不要使用 \`\`\`json 包裹，也不要返回除 JSON 之外的任何说明废话！
{"title":"这里写吸引人的标题","content":"这里写正文内容，段落之间用\\n分隔"}`;
    
    try {
        let data = await callChatCompletionAPI(api, prompt);
        let raw = data.choices?.[0]?.message?.content?.trim();
        if(raw) {
            raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
            let parsed = { title: currentDiaryTab === 'letter' ? '新信件' : '新日记', content: raw };
            let parsedJson = extractJsonObject(raw); if (parsedJson) parsed = parsedJson;
            tempGeneratedDiary = { id: 'd_' + Date.now(), title: parsed.title || (currentDiaryTab === 'letter' ? '新信件' : '新日记'), content: parsed.content || raw, date: Date.now() };
            document.getElementById('diaryListArea').style.display = 'none'; document.getElementById('diaryTempArea').style.display = 'block';
            document.getElementById('tempDiaryTitle').innerText = tempGeneratedDiary.title; document.getElementById('tempDiaryContent').innerText = tempGeneratedDiary.content;
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
    viewingDiaryId = id; document.getElementById('diaryDetailTitle').innerText = item.title || '无题'; document.getElementById('diaryDetailDate').innerText = new Date(item.date).toLocaleString(); document.getElementById('diaryDetailContent').innerText = item.content; openModal('diaryDetailModal');
}
function deleteCurrentDiary() {
    if(!confirm("确定要删除这篇内容吗？此操作无法撤销。")) return; const char = myCharacters.find(c => c.id == currentDiaryCharId);
    if(currentDiaryTab === 'letter') { char.diaryData.letters = char.diaryData.letters.filter(i => i.id !== viewingDiaryId); } else { char.diaryData.diaries = char.diaryData.diaries.filter(i => i.id !== viewingDiaryId); }
    saveAllData(); closeModal('diaryDetailModal'); renderDiaryContent();
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
    let newNovel = { id: currentEditingNovelId, title: '', outline: '', chars: [], worldbooks: [], targetWordCount: 1000, chapters: [] };
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
    
    const wbBox = document.getElementById('novelWbCheckboxes');
    if (worldbooks.length === 0) { wbBox.innerHTML = '<span style="color:#888;">暂无世界书。</span>'; }
    else {
        wbBox.innerHTML = worldbooks.map(w => `
            <label style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.8); padding:5px 10px; border-radius:9999px; border:1px solid #1d9bf0; cursor:pointer;">
                <input type="checkbox" class="novel-wb-check" value="${w.id}" ${(novel.worldbooks||[]).includes(w.id) ? 'checked' : ''}>
                ${w.title}
            </label>`).join('');
    }
    
    document.getElementById('novelTempArea').style.display = 'none';
    tempNovelChapter = null;
    renderNovelChapters();
}

function openNovelReader() {
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if (!novel || novel.chapters.length === 0) return alert("我们的旅程还没有开启");

    document.getElementById('novelEditorWrapper').style.display = 'none';
    document.getElementById('novelReaderWrapper').style.display = 'block';

    document.getElementById('readerTitle').innerText = novel.title || '未命名故事';

    let contentHtml = '';
    novel.chapters.forEach(c => {
        contentHtml += `<h3 style="color:#1d9bf0; margin-top:40px; margin-bottom:20px; text-align:center;">第 ${c.index} 章</h3>`;
        contentHtml += `<div style="text-indent: 2em; margin-bottom: 40px;">${c.content}</div>`;
    });
    document.getElementById('readerContent').innerHTML = contentHtml;
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
        novel.worldbooks = Array.from(document.querySelectorAll('.novel-wb-check:checked')).map(cb => parseInt(cb.value));
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

    const title = document.getElementById('novelTitleInput').value.trim() || '未命名故事';
    const outline = document.getElementById('novelOutlineText').value.trim();
    const wordCount = document.getElementById('novelWordCount').value || 1000;
    const selChars = Array.from(document.querySelectorAll('.novel-char-check:checked')).map(cb=>cb.value);
    const selWbs = Array.from(document.querySelectorAll('.novel-wb-check:checked')).map(cb=>parseInt(cb.value));

    // 💡 增强：如果勾选了角色，把角色的推文记忆总结也顺带提取进去，实现“推特经历穿越到故事”
    let charContext = selChars.map(id => {
        let c = id === 'me' ? currentUser : myCharacters.find(x => x.id == id);
        let extraMemory = (c && c.memorySummary) ? `\n[该角色近期的经历记忆]: ${c.memorySummary}` : '';
        return c ? `角色【${c.name}】：${c.persona || '暂无设定'}${extraMemory}` : '';
    }).join('\n\n');

    let wbContext = worldbooks.filter(w => selWbs.includes(w.id)).map(w => `世界观设定【${w.title}】：${w.content}`).join('\n\n');

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
1. 目标字数：约 ${wordCount} 字左右，描写细腻，决不能过度敷衍跳跃。
2. 必须深度结合【核心故事大纲】中的主线、结合【世界观】的设定以及【角色】的性格特征进行推进。
3. 请直接输出当前章节的正文内容。不要输出“第X章”等标题，不要输出任何寒暄、自我解释或任何Markdown代码块前缀。`;

    try {
        let data = await sendChatRequest(api, prompt);
        if(data.error) throw new Error(data.error.message || "请求报错");

        let text = data.choices?.[0]?.message?.content?.trim();
        if(text) {
            tempNovelChapter = {
                id: 'c_' + Date.now(),
                index: currentChapterNum,
                content: text,
                timestamp: Date.now()
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
    
    container.innerHTML = novel.chapters.map((chap, idx) => `
        <div class="novel-chapter-item">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="novel-chapter-title">第 ${idx + 1} 章</div>
                <button class="btn-edit-small" style="color:#f91880; border-color:#f91880;" onclick="deleteChapter(${idx})">删除此章</button>
            </div>
            <div style="font-size:15px; color:#536471; margin-bottom:10px;">生成于 ${new Date(chap.timestamp).toLocaleString()} · 共 ${chap.content.length} 字</div>
            <div style="font-size:15px; line-height:1.8; white-space:pre-wrap; max-height:200px; overflow-y:auto; padding-right:10px; background:#f7f9f9; padding:15px; border-radius:8px;">${chap.content}</div>
        </div>
    `).join('');
}

function deleteChapter(idx) {
    if(!confirm('确定要删除这一章吗？')) return;
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if(novel && novel.chapters) {
        novel.chapters.splice(idx, 1);
        novel.chapters.forEach((c, i) => c.index = i + 1);
        saveAllData();
        renderNovelChapters();
    }
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
                let rChar = r.char || { name: r.name || '网友', handle: '@npc_user', avatarEmoji: '👤' };
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
                                ${r.replyTo ? `<span style="color:#1d9bf0;">回复 @${r.replyTo} </span>` : ''}${formatPostText(r.text)}
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
        return;
    }
    // === 混排结束 ===

    if (postsToShow.length === 0) { 
        container.innerHTML = `<div class="empty-state">这里空空如也</div>`; 
        return; 
    }
    if(typeof generatePostHTML === 'function') {
        container.innerHTML = generatePostHTML(postsToShow);
    }
}

function renderFollowingList() {
    const container = document.getElementById('followingListContainer'); let follows = myCharacters.filter(c => c.isFollowing).sort((a,b) => b.isSpecialFollow - a.isSpecialFollow);
    if(follows.length === 0) { container.innerHTML = `<div class=\"empty-state\">您还没有关注任何人哦。</div>`; return; }
    container.innerHTML = follows.map(char => `<div class="following-card" oncontextmenu="showFollowingContextMenu(event, '${char.id}')" onclick="handleFollowingCardClick(event, '${char.id}')">${getAvatarHTML(char, 60)}<div style="font-weight:bold; font-size:15px; margin-bottom:5px;">${char.name} ${char.verified ? verifiedSVG : ''} ${char.isSpecialFollow ? '<span class="special-star"><svg class="blue-line-icon" viewBox="0 0 24 24" style="width:16px;height:16px;vertical-align:middle;margin-top:-2px;"><polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"></polygon></svg></span>' : ''}</div><div style="color:#536471; font-size:13px;">${char.handle}</div>${char.group ? `<span style="display:inline-block; margin-top:4px; background:rgba(29,155,240,0.1); color:#1d9bf0; border-radius:9999px; font-size:11px; padding:1px 7px;">${char.group}</span>` : ''}</div>`).join('');
}

function renderPosts(filterTag = null) {
    const container = filterTag ? document.getElementById('tagFeedSection') : document.getElementById('feedSection');
    let postsToShow = filterTag ? globalPosts.filter(p => p.text.includes(filterTag)) : (homeTab === 'following' ? globalPosts.filter(p => p.char.id !== 'me' && myCharacters.find(c=>c.id==p.char.id)?.isFollowing) : globalPosts);
    if (postsToShow.length === 0) { container.innerHTML = `<div class="empty-state">这里空空如也...</div>`; return; }
    container.innerHTML = generatePostHTML(postsToShow);
}

// ===================== 回忆相册/高光时刻收藏 =====================
function isInMemoryAlbum(type, refId) {
    return memoryAlbum.some(m => m.type === type && m.refId == refId);
}

function toggleMemoryStar(event, type, refId) {
    if (event) event.stopPropagation();
    const idx = memoryAlbum.findIndex(m => m.type === type && m.refId == refId);
    let isStarred = false;

    if (idx > -1) {
        memoryAlbum.splice(idx, 1);
    } else if (type === 'post') {
        const post = globalPosts.find(p => p.id === refId); if (!post) return;
        memoryAlbum.unshift({ id: 'mem_' + Date.now(), type: 'post', refId, charId: post.char.id, charName: post.char.name, text: post.text, timestamp: post.timestamp, savedAt: Date.now() });
        isStarred = true;
    }
    
    saveAllData();

    // 🌟 核心修复：直接改变当前点击的那个按钮的文字和颜色，产生瞬间响应的视觉反馈！
    if (event && event.currentTarget) {
        event.currentTarget.innerHTML = isStarred ? '⭐' : '☆';
        event.currentTarget.style.color = isStarred ? '#ffad1f' : 'inherit';
        
        // 顺带增加一个漂亮的小动画提示
        event.currentTarget.style.transform = 'scale(1.3)';
        setTimeout(() => { event.currentTarget.style.transform = 'scale(1)'; }, 150);
    }

    // 后台偷偷刷新"收藏"页面数据（现在挂在个人资料的收藏标签下，用户和角色资料页都适用）
    if (document.getElementById('view-profile').style.display !== 'none' && currentProfileTab === 'highlights') renderMemoryAlbum();
}

function removeFromMemoryAlbum(memId) {
    memoryAlbum = memoryAlbum.filter(m => m.id !== memId);
    saveAllData();
    renderMemoryAlbum();
}

function jumpToMemorySource(mem) {
    if (mem.type === 'post') {
        switchMainView('postDetail', mem.refId);
    } else if (mem.type === 'chat') {
        switchMainView('chat');
        switchChatSession(mem.refId);
    }
}

function renderMemoryAlbum() {
    const container = document.getElementById('profileFeedSection');
    const list = currentProfileId === 'me' ? memoryAlbum : memoryAlbum.filter(m => m.charId == currentProfileId);
    if (list.length === 0) {
        container.innerHTML = currentProfileId === 'me'
            ? '<div class="empty-state">还没有收藏任何回忆～聊天消息右键、推文点☆号都可以收藏哦。</div>'
            : '<div class="empty-state">还没有收藏和ta有关的回忆～</div>';
        return;
    }
    container.innerHTML = list.map(m => {
        const char = myCharacters.find(c => c.id == m.charId);
        return `<div class="memory-card" onclick="jumpToMemorySource(${JSON.stringify(m).replace(/"/g, '&quot;')})">
            <div style="display:flex; gap:10px; align-items:flex-start;">
                ${char ? getAvatarHTML(char, 40) : '<div class="avatar" style="width:40px;height:40px;background:#8b98a5;"></div>'}
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:bold; font-size:14px;">${m.charName || '未知'} <span style="font-weight:normal; font-size:11px; color:#8b98a5;">${m.type === 'post' ? '· 推文' : '· 聊天'}</span></div>
                    <div style="font-size:13px; color:#0f1419; margin-top:2px; word-break:break-word;">${m.text}</div>
                    <div style="font-size:11px; color:#8b98a5; margin-top:4px;">${new Date(m.timestamp).toLocaleString('zh-CN', { hour12: false })}</div>
                </div>
                <span style="color:#f91880; cursor:pointer; font-size:18px; flex-shrink:0;" onclick="event.stopPropagation(); removeFromMemoryAlbum('${m.id}')">×</span>
            </div>
        </div>`;
    }).join('');
}

// ===================== 全站搜索 =====================
function renderSearchPosts(keyword) {
    const kw = (keyword || '').toLowerCase().trim();
    const container = document.getElementById('searchFeedSection');
    if (!kw) { container.innerHTML = '<div class="empty-state">输入关键词试试吧～</div>'; return; }

    // 1. 推文（含营销号爆料）
    const postRes = globalPosts.filter(p => p.text.toLowerCase().includes(kw) || p.char.name.toLowerCase().includes(kw) || (p.char.handle || '').toLowerCase().includes(kw));
    const tabloidRes = (tabloidPosts || []).filter(p => p.text.toLowerCase().includes(kw));

    // 2. 聊天记录（跨所有角色/群聊会话）
    let chatRes = [];
    Object.keys(globalChats || {}).forEach(sessionId => {
        (globalChats[sessionId] || []).forEach((m, idx) => {
            if (m.sender !== 'system' && m.text && m.text.toLowerCase().includes(kw)) {
                const senderName = m.sender === 'me' ? currentUser.name : (myCharacters.find(c => c.id == m.sender)?.name || '未知');
                chatRes.push({ sessionId, msgIdx: idx, senderName, text: m.text, timestamp: m.timestamp });
            }
        });
    });
    chatRes.sort((a, b) => b.timestamp - a.timestamp);

    // 3. 日记与信件（存在每个角色的 diaryData 里）
    let diaryRes = [];
    myCharacters.forEach(c => {
        if (!c.diaryData) return;
        ['letters', 'diaries'].forEach(kind => {
            (c.diaryData[kind] || []).forEach(item => {
                if ((item.title || '').toLowerCase().includes(kw) || (item.content || '').toLowerCase().includes(kw)) {
                    diaryRes.push({ charId: c.id, charName: c.name, kind, id: item.id, title: item.title, content: item.content, date: item.date });
                }
            });
        });
    });
    diaryRes.sort((a, b) => b.date - a.date);

    // 4. 小说
    const novelRes = (globalNovels || []).filter(n => (n.title || '').toLowerCase().includes(kw) || (n.outline || '').toLowerCase().includes(kw) || (n.chapters || []).some(ch => (ch.content || '').toLowerCase().includes(kw)));

    // 5. 论坛
    const forumRes = (typeof forumThreads !== 'undefined' ? forumThreads : []).filter(t => (t.title || '').toLowerCase().includes(kw) || (t.content || '').toLowerCase().includes(kw) || (t.replies || []).some(r => (r.content || '').toLowerCase().includes(kw)));

    const totalCount = postRes.length + tabloidRes.length + chatRes.length + diaryRes.length + novelRes.length + forumRes.length;
    if (totalCount === 0) { container.innerHTML = '<div class="empty-state">全站范围内都没有找到相关内容...</div>'; return; }

    let html = `<div style="padding:10px 15px; color:#536471; font-size:13px;">共找到 ${totalCount} 条相关结果</div>`;

    if (postRes.length > 0) {
        html += `<div class="search-section-title">📝 推文 (${postRes.length})</div>` + generatePostHTML(postRes);
    }
    if (tabloidRes.length > 0) {
        html += `<div class="search-section-title">📰 营销号爆料 (${tabloidRes.length})</div>` + tabloidRes.map(p => `
            <div class="post-placeholder" onclick="switchMainView('postDetail', '${p.id}')">
                <div class="post-content" style="min-width:0; flex:1;">
                    <div class="post-body">${formatPostText(p.text)}</div>
                </div>
            </div>`).join('');
    }
    if (chatRes.length > 0) {
        html += `<div class="search-section-title">💬 聊天记录 (${chatRes.length})</div>` + chatRes.slice(0, 30).map(r => `
            <div class="search-result-card" onclick="switchMainView('chat'); switchChatSession('${r.sessionId}');">
                <div style="font-weight:bold; font-size:13px;">${r.senderName}</div>
                <div style="font-size:13px; color:#536471; margin-top:2px;">${r.text}</div>
                <div style="font-size:11px; color:#8b98a5; margin-top:4px;">${new Date(r.timestamp).toLocaleString('zh-CN', { hour12: false })}</div>
            </div>`).join('');
    }
    if (diaryRes.length > 0) {
        html += `<div class="search-section-title">📔 日记与信件 (${diaryRes.length})</div>` + diaryRes.map(r => `
            <div class="search-result-card" onclick="openDiaryFromSearch('${r.charId}', '${r.kind}', '${r.id}')">
                <div style="font-weight:bold; font-size:13px;">${r.charName} · ${r.kind === 'letter' ? '信件' : '日记'}：${r.title}</div>
                <div style="font-size:13px; color:#536471; margin-top:2px; max-height:3em; overflow:hidden;">${r.content}</div>
            </div>`).join('');
    }
    if (novelRes.length > 0) {
        html += `<div class="search-section-title">📖 故事 (${novelRes.length})</div>` + novelRes.map(n => `
            <div class="search-result-card" onclick="switchMainView('novel'); openNovelDetail('${n.id}');">
                <div style="font-weight:bold; font-size:13px;">${n.title || '未命名故事'}</div>
                <div style="font-size:13px; color:#536471; margin-top:2px;">${(n.outline || '').slice(0, 60)}</div>
            </div>`).join('');
    }
    if (forumRes.length > 0) {
        html += `<div class="search-section-title">💭 论坛 (${forumRes.length})</div>` + forumRes.map(t => `
            <div class="search-result-card" onclick="openForumThread('${t.id}')">
                <div style="font-weight:bold; font-size:13px;">${t.title}</div>
                <div style="font-size:13px; color:#536471; margin-top:2px; max-height:3em; overflow:hidden;">${t.content}</div>
            </div>`).join('');
    }

    container.innerHTML = html;
}

function openDiaryFromSearch(charId, kind, itemId) {
    currentDiaryCharId = charId;
    switchMainView('diary');
    switchDiaryTab(kind === 'letters' ? 'letter' : 'diary');
    setTimeout(() => { if (typeof openDiaryDetail === 'function') openDiaryDetail(itemId); }, 100);
}

function renderSinglePostDetail(postId) {
    let isTabloid = postId.startsWith('tb_');
    let post = isTabloid ? tabloidPosts.find(p => p.id === postId) : globalPosts.find(p => p.id == postId); 
    if(!post) return; 
    let char = post.char || { name: '未知' };

    let actionAttr = isTabloid ? '' : `ondblclick="editPost('${post.id}', this); event.stopPropagation();" title="双击可直接修改此帖子"`;
    let followBtnHTML = (!isTabloid && char.id !== 'me') ? `<button class="${char.isFollowing ? "follow-btn following" : "follow-btn"} btn-follow-${char.id}" style="padding:4px 16px; min-height:32px; background:${char.isFollowing?'transparent':'#0f1419'}; color:${char.isFollowing?'#0f1419':'white'}; border:1px solid ${char.isFollowing?'#cfd9de':'transparent'};" onclick="toggleFollow('${char.id}', event)">${char.isFollowing ? "已关注" : "关注"}</button>` : '';
    
    // === 楼中楼树状结构核心逻辑 ===
    let repliesHTML = '';
    if (post.replies && post.replies.length > 0) {
        let replyMap = {};
        let roots = [];

        // 1. 初始化并建立索引
        post.replies.forEach((r, idx) => {
            if (!r.id) r.id = 'r_' + idx + '_' + Date.now(); // 兼容老数据
            r.originalIdx = idx; // 保存原始索引用于点赞和回复操作
            replyMap[r.id] = { ...r, children: [] };
        });

        // 2. 区分根评论和子评论
        post.replies.forEach(r => {
            if (r.parentId && replyMap[r.parentId]) {
                replyMap[r.parentId].children.push(replyMap[r.id]);
            } else {
                roots.push(replyMap[r.id]);
            }
        });

        // 3. 一级评论严格按时间倒序排列 (最新发布的在最上面)
        roots.sort((a, b) => b.timestamp - a.timestamp);

        // 4. 递归渲染函数 (限制最大可见树深 3 层)
        function buildReplyHTML(node, depth) {
            let r = node;
            let idx = r.originalIdx;
            let isMe = isTabloid ? (r.charId === 'me') : (r.char && r.char.id === 'me');
            let rChar = isTabloid ? (isMe ? currentUser : { name: r.name || '网友', handle: '@npc_user', avatarEmoji: '👤' }) : (r.char || { name: '未知' });

            let indentClass = depth > 0 ? 'reply-nested' : '';
            // 嵌套左侧缩进计算：前3层正常缩进，超过3层后不再继续向右无限缩进缩短空间
            let depthStyle = depth > 0 ? `margin-left: ${Math.min(depth, 3) * 35}px;` : '';
            
            // 获取用户当前对该条评论的点赞和收藏状态
            let isLiked = r.likedBy ? r.likedBy.includes('me') : (r.liked || false);
            let isFavorited = r.favorited || false;

            let html = `
            <div class="reply-item ${indentClass}" style="${depthStyle}" data-reply-idx="${idx}" data-post-id="${postId}" oncontextmenu="showReplyContextMenu(event, '${postId}', ${idx})">
                ${depth > 0 ? '<div class="reply-thread-line"></div>' : ''}
                <div class="reply-avatar-link" onclick="switchMainView('profile', '${rChar.id}')">
                    ${getAvatarHTML(rChar, depth > 0 ? 28 : 36)}
                </div>
                <div class="reply-content-box" style="flex: 1; min-width: 0;">
                    <div class="reply-header-row">
                        <span class="reply-user-name" onclick="switchMainView('profile', '${rChar.id}')">${rChar.name}</span>
                        <span class="reply-user-handle">${rChar.handle || ''}</span>
                        <span>·</span>
                        <span class="time-updater" data-timestamp="${r.timestamp}">${timeAgo(r.timestamp)}</span>
                    </div>
                    <div class="reply-text-body">
                        ${r.replyTo ? `<span style="color:#1d9bf0;">回复 @${r.replyTo} </span>` : ''}${formatPostText(r.text)}
                    </div>
                    ${r.mediaUrl ? `<div class="post-media" style="margin-top:8px;"><img src="${r.mediaUrl}" style="max-height:200px; border-radius:8px;"></div>` : ''}
                    ${getActionIconsHTML(r.likes || 0, isLiked, idx, postId, depth > 0, isFavorited)}
                </div>
            </div>`;

            // 递归向下处理子回复
            if (node.children && node.children.length > 0) {
                // 子回复内部按正常时间正序（旧到新）排列，符合正常的对话阅读流
                node.children.sort((a, b) => a.timestamp - b.timestamp);

                // 嵌套深度限制：depth从0开始。0=第一层，1=第二层，2=第三层。
                // 当 depth >= 2 时说明当前已是第3层，其子回复（第4层）将被归纳进折叠按钮中。
                if (depth >= 2) { 
                    html += `
                    <div class="view-more-replies" style="margin-left: ${Math.min(depth + 1, 3) * 35}px;" onclick="toggleExpandHiddenReplies(this)">
                        显示更多回复 (${node.children.length}条)
                    </div>
                    <div class="hidden-replies-container" style="display:none;">
                        ${node.children.map(child => buildReplyHTML(child, depth + 1)).join('')}
                    </div>`;
                } else {
                    node.children.forEach(child => {
                        html += buildReplyHTML(child, depth + 1);
                    });
                }
            }
            return html;
        }

        repliesHTML = `<div class="replies-container">` + roots.map(root => buildReplyHTML(root, 0)).join('') + `</div>`;
    }
    
    let mediaHTML = post.mediaUrl ? `<div class="post-media" style="margin: 12px 0;"><img src="${post.mediaUrl}"></div>` : '';
    let locationHTML = post.location ? `<div class="post-location" style="margin: 12px 0;">${locationSVG} ${post.location}</div>` : '';
    let d = new Date(post.timestamp);
    let yy = String(d.getFullYear()).slice(-2);
    let mo = d.getMonth() + 1;
    let dd = d.getDate();
    let hh = String(d.getHours()).padStart(2, '0');
    let mm = String(d.getMinutes()).padStart(2, '0');
    let dateStr = `${yy}年${mo}月${dd}日, ${hh}:${mm}`;

    let quotesCount = Math.floor(parseStat(post.stats.retweets) * 0.15) || 0;
    let bookmarksCount = Math.floor(parseStat(post.stats.likes) * 0.12) || 0;
    
    const imgIcon = `<svg viewBox="0 0 24 24" class="reply-toolbar-icon"><path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7C8.784 7 8 7.784 8 8.75s.784 1.75 1.75 1.75 1.75-.784 1.75-1.75S10.716 7 9.75 7z"></path></svg>`;
    const gifIcon = `<svg viewBox="0 0 24 24" class="reply-toolbar-icon"><path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v13c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-13c0-.276-.224-.5-.5-.5h-13zM7.5 14V9.5h3v1.5h-1.5v1.5h2v1.5h-3.5zm4.5 0V9.5h1.5v4.5H12zm3 0V9.5h3v1.5h-1.5v1h1v1.5h-2.5z"></path></svg>`;
    const locIcon = `<svg viewBox="0 0 24 24" class="reply-toolbar-icon"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg>`;

    document.getElementById('postDetailSection').innerHTML = `
        <div style="padding: 12px 16px 80px 16px; position: relative; min-height: 100vh;">
            <div class="post-detail-header-flex" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div style="display:flex; gap:12px; align-items:center; cursor:pointer;" onclick="switchMainView('profile', '${isTabloid ? 'tabloid_admin' : char.id}');">
                    ${getAvatarHTML(char, 44)}
                    <div>
                        <div class="detail-author-name">${char.name}</div>
                        <div class="detail-author-handle">${isTabloid ? '@tabloid_news' : char.handle}</div>
                    </div>
                </div>
                ${followBtnHTML}
            </div>
            <div class="post-body detail-post-body" ${actionAttr}>${formatPostText(post.text)}</div>
            ${locationHTML}
            ${mediaHTML}
            <div class="detail-time-row" style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom:1px solid #eff3f4;">
                <span>${dateStr}</span>
                <div style="display:flex; gap:16px; align-items:center;">
                    <span onclick="toggleDetailLike('${postId}')" style="cursor:pointer; display:flex; align-items:center; color:${post.userLiked ? '#f91880' : '#536471'}; transition:0.2s;" onmouseover="this.style.color='#f91880'" onmouseout="this.style.color='${post.userLiked ? '#f91880' : '#536471'}'" title="点赞">
                        ${post.userLiked ? 
                        '<svg style="width:20px;height:20px;fill:#f91880;" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' 
                        : 
                        '<svg style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'} 
                    </span>
                    <span onclick="deleteDetailPost('${postId}')" style="cursor:pointer; color:#f91880; font-size:17px; display:flex; align-items:center;" title="删除此推文">🗑️</span>
                </div>
            </div>
            
            <div class="post-detail-stats-row">
                <span><b>${formatStat(post.stats.retweets)}</b> 转帖</span>
                <span><b>${formatStat(quotesCount)}</b> 引用</span>
                <span><b>${formatStat(post.stats.likes)}</b> 喜欢</span>
                <span><b>${formatStat(bookmarksCount)}</b> 书签</span>
            </div>
            
            ${repliesHTML}

            <div class="twitter-reply-box">
                <div id="replyAttachmentPreview" class="emo-preview-box" style="display:none; padding:0; margin-bottom:10px;"></div>
                <input type="text" id="myCommentInput" placeholder="发布你的回复" onkeypress="if(event.key === 'Enter') postUserComment('${postId}')">
                <div class="toolbar-divider"></div>
                <div class="toolbar-actions">
                    <div class="toolbar-icons">
                        <span onclick="openEmoticonPicker('reply')">${imgIcon}</span>
                        <span>${gifIcon}</span>
                        <span>${locIcon}</span>
                    </div>
                    <button class="btn-reply-send" onclick="postUserComment('${postId}')">回复</button>
                </div>
            </div>
        </div>`;
}

// === 新增辅助函数：控制折叠栏目的实时展开与合拢 ===
function toggleExpandHiddenReplies(btnEl) {
    const container = btnEl.nextElementSibling;
    if (container && container.classList.contains('hidden-replies-container')) {
        if (container.style.display === 'none') {
            container.style.display = 'block';
            btnEl.innerText = '收起超长深度回复';
            btnEl.classList.add('expanded');
        } else {
            container.style.display = 'none';
            btnEl.innerText = '查看更多回复...';
            btnEl.classList.remove('expanded');
        }
    }
}

// 修复："有的角色怎么都不来互动"的问题之一：之前只要人设文本里【任何位置】出现过一个关键词
// （哪怕是"表面高冷但其实很粘人""小时候有点独来独往，长大后开朗多了"这种一笔带过、甚至被后文
// 反转掉的描述），就会被整体判定为"高冷"角色，从而在别人发帖时几乎只点赞不回复。
// 现在改成要求命中至少2个关键词，减少被单个偶然出现的词误伤的情况；真正高冷的人设通常会
// 不止一处强调这种气质，命中多个关键词更能反映这是角色的主要性格特征而不是背景故事里的一笔带过。
function isCoolPersona(persona) {
    if (!persona) return false;
    const coolKeywords = ['高冷', '内向', '冷淡', '寡言', '沉默寡言', '冷漠', '不善言辞', '独来独往', '不爱说话', '惜字如金', '话很少'];
    const hitCount = coolKeywords.filter(kw => persona.includes(kw)).length;
    return hitCount >= 2;
}

// 修复：主页用户发推功能 (userPost)
// ==========================================
async function userPost() {
    let input = document.getElementById('userPostInput'); 
    let text = input.value.trim(); 
    if (!text && !pendingPostAttachment) return;
    if (!myApiKey) return alert("请先在设置中配置密钥！");
    
    let locVal = document.getElementById('advLoc')?.value.trim();
    let rtVal = document.getElementById('advRT')?.value;
    let viewsVal = document.getElementById('advViews')?.value;
    let commentsVal = document.getElementById('advComments')?.value;
    let likesVal = document.getElementById('advLikes')?.value;
    
    let roleId = document.getElementById('userPostRoleSelect')?.value || 'me';
    let postChar = roleId === 'me' ? currentUser : myCharacters.find(c => c.id == roleId);
    if (!postChar) postChar = currentUser;

    let postLoc = postChar.location || '';
    let postStats = { comments: 0, retweets: 0, likes: 0, views: 0 };
    let needAI = (!locVal || !rtVal || !viewsVal || !commentsVal || !likesVal);
    
    if (needAI) {
        document.getElementById('loadingStatus').style.display = 'block';
        document.getElementById('loadingStatus').innerText = "正在分析并生成发帖数据... ";
        
        let prompt = `用户发布了一条推文："${text}"。请为这条推文生成合理的虚拟数据。
严格返回JSON格式，不能有其他文字：
{"location":"根据内容推测的地点，若没有填日常地点或空字符串","retweets":随机整数,"views":随机整数,"comments":随机整数,"likes":随机整数}`;
        try {
            let data = await sendChatRequest({ url: myApiUrl, key: myApiKey, model: myModel }, prompt);
            let aiStats = extractJsonObject(data.choices?.[0]?.message?.content);
            if (aiStats) {
                postLoc = locVal || aiStats.location || postLoc;
                postStats.retweets = rtVal !== '' ? parseInt(rtVal) : (aiStats.retweets || getRandomStat(100));
                postStats.views = viewsVal !== '' ? parseInt(viewsVal) : (aiStats.views || getRandomStat(5000));
                postStats.comments = commentsVal !== '' ? parseInt(commentsVal) : (aiStats.comments || getRandomStat(50));
                postStats.likes = likesVal !== '' ? parseInt(likesVal) : (aiStats.likes || getRandomStat(500));
            }
        } catch(e) { }
    } else {
        postLoc = locVal || postLoc;
        postStats.retweets = parseInt(rtVal) || getRandomStat(100);
        postStats.views = parseInt(viewsVal) || getRandomStat(5000);
        postStats.comments = parseInt(commentsVal) || getRandomStat(50);
        postStats.likes = parseInt(likesVal) || getRandomStat(500);
    }
    
    postStats.retweets = postStats.retweets || getRandomStat(100);
    postStats.views = postStats.views || getRandomStat(5000);
    postStats.comments = postStats.comments || getRandomStat(50);
    postStats.likes = postStats.likes || getRandomStat(500);

    let newPostId = 'u_' + Date.now();
    let newPost = { 
        id: newPostId, 
        char: JSON.parse(JSON.stringify(postChar)), 
        text: text, 
        timestamp: Date.now(), 
        replies: [], 
        mediaUrl: pendingPostAttachment, 
        stats: postStats, 
        isStory: false, 
        location: postLoc,
        likedBy: [] // 加入点赞记录数组，防止页面出错
    };
    
    globalPosts.unshift(newPost); 
    input.value = ''; 
    clearAttachment('post'); 
    
    ['advLoc', 'advRT', 'advViews', 'advComments', 'advLikes'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ''; });
    if(document.getElementById('advancedPostOptions')) document.getElementById('advancedPostOptions').style.display = 'none';
    closeModal('postCreateModal'); 
    
    if (typeof renderPosts === 'function') renderPosts();
    document.getElementById('loadingStatus').innerText = "角色们正在看您的帖子... ";
    document.getElementById('loadingStatus').style.display = 'block';
    saveAllData(); 
    
    let emoPrompt = getEmoticonPrompt();
    
    for (let char of myCharacters) {
        if (char.id === postChar.id) continue;
        if (char.replyToUser === false) continue; // 新增：设置里关闭了"回复用户"的角色，直接跳过不参与互动
        
        const isCool = isCoolPersona(char.persona);
        let wbContext = getCharacterWorldbookText(char);
        let chatSummaryContext = char.chatSummary ? `\n【历史聊天总结（仅背景了解，是已经聊过的旧话题，不要当成当前话题主动重提）】：${getRecentChatSummaryText(char.chatSummary, 5)}` : '';
        let genderContext = getUserContextPrompt();
        let actionStrictRule = allowActionTags ? "" : "\n【严格禁止】：绝对不要包含任何动作、神态或心理描写（不要用括号()或【】），只输出你直接说的话。";

        // 修复："所有角色都要围着用户转"：之前这里给了角色"NO"这个选项，会导致有的角色对用户的
        // 帖子完全零反应、什么都不做。现在不管人设冷不冷淡，都强制至少要有反应（点赞或说一句话），
        // 只是性格影响的是"倾向于只点赞"还是"更愿意多说几句"，而不是"要不要来"。
        let prompt = isCool
            ? `你是推特用户"${char.name}"，人设：${char.persona}。${wbContext}${genderContext}${chatSummaryContext}用户"${postChar.name}"发了推文："${text}"。你性格高冷，通常只点赞、很少主动多说话，但用户的动态你必须看到并作出反应，绝对不能完全无视。请输出"LIKE"，或者直接输出一句简短的话（不超过${chatWordLimit}字）。只能二选一，不允许输出其他内容（包括"NO"）。${actionStrictRule}`
            : `你是推特用户"${char.name}"，人设：${char.persona}。${wbContext}${genderContext}${chatSummaryContext}${emoPrompt}用户"${postChar.name}"发了推文："${text}"。你必须对这条动态作出反应，绝对不能完全无视。如果想认真回复，直接输出内容（不超过${chatWordLimit}字），若要在回复中带表情包，请在文本最后附上 [EMO:对应ID]；如果只是随手点个赞，输出"LIKE"。只能二选一，不允许输出"NO"或保持沉默。${actionStrictRule}`;
        try {
            let data = await sendChatRequest({ url: myApiUrl, key: myApiKey, model: myModel }, prompt);
            if (data.error) { console.error(`角色"${char.name}"回复推文失败：`, data.error); continue; }
            let repText = data.choices?.[0]?.message?.content?.trim() || "";

            let repMediaUrl = null; let emoMatch = repText.match(/\[EMO:(emo_\w+)\]/i);
            if (emoMatch) { let emo = globalEmoticons.find(e => e.id === emoMatch[1]); if (emo) repMediaUrl = emo.url; repText = repText.replace(emoMatch[0], '').trim(); }

            if (repText.toUpperCase() === 'LIKE') {
                newPost.stats.likes = parseStat(newPost.stats.likes) + 1;
                if (!newPost.likedBy) newPost.likedBy = [];
                if (!newPost.likedBy.includes(char.id)) newPost.likedBy.push(char.id); // 记录AI点赞
                if(typeof addNotification === 'function') addNotification(`<b>${char.name}</b> 赞了您的帖子 ❤️`, newPostId, null, char, ""); 
            }
            else if (!repText.toUpperCase().startsWith("NO") && repText !== "") { 
                // 添加标准的楼中楼格式回复
                newPost.replies.push({ 
                    id: 'r_' + Date.now() + Math.floor(Math.random()*100),
                    parentId: null, // 根层级标记
                    char: char, 
                    text: repText, 
                    timestamp: Date.now(), 
                    likes: 0, 
                    liked: false, 
                    likedBy: [],
                    mediaUrl: repMediaUrl 
                }); 
                newPost.stats.comments++; 
                if(typeof addNotification === 'function') addNotification(`<b>${char.name}</b> 评论了您的帖子`, newPostId, null, char, repText); 
            }
            if (document.getElementById('view-home').style.display !== 'none') renderPosts();
        } catch(e) { console.error(`角色"${char.name}"回复推文请求异常：`, e); }
    }
    document.getElementById('loadingStatus').style.display = 'none';
    saveAllData();
    spawnNpcComments(newPostId, false, { triggerName: postChar.name, triggerText: text });
}

// ==========================================
// 修复：推文下方的评论功能 (postUserComment)
// 【重要修复】：原来这里只会去 globalPosts 里找帖子，导致在"营销号"(tabloid)详情页的
// 评论框发言时，因为营销号帖子存在 tabloidPosts 数组里而不是 globalPosts，找不到帖子后
// 直接 return，评论发不出去、角色/NPC自然也不会有任何回应。现在改成和 renderSinglePostDetail /
// submitInlineReply 一致的写法：根据 postId 前缀（tb_）判断是不是营销号帖子，分别处理。
// ==========================================
async function postUserComment(postId) {
    const input = document.getElementById('myCommentInput'); if (!input) return;
    const text = input.value ? input.value.trim() : ""; if (!text && !pendingReplyAttachment) return alert("评论内容不能为空！");

    let isTabloid = postId.startsWith('tb_');
    let post = isTabloid ? tabloidPosts.find(p => p.id == postId) : globalPosts.find(p => p.id == postId);
    if (!post) return;

    const newReply = isTabloid ? {
        id: 'r_' + Date.now(),
        parentId: null,
        charId: 'me',
        name: currentUser.name,
        text: text,
        timestamp: Date.now(),
        likes: 0,
        liked: false,
        likedBy: [],
        mediaUrl: pendingReplyAttachment
    } : {
        id: 'r_' + Date.now(),
        parentId: null,
        char: { ...currentUser },
        text: text,
        timestamp: Date.now(),
        likes: 0,
        liked: false,
        likedBy: [], // 记录点赞记录
        mediaUrl: pendingReplyAttachment
    };

    if (!post.replies) post.replies = []; post.replies.push(newReply); post.stats.comments = (parseInt(post.stats.comments) || 0) + 1;
    input.value = ''; clearAttachment('reply'); if(typeof renderSinglePostDetail === 'function') renderSinglePostDetail(postId); saveAllData();

    if (!myApiKey) return;

    // 营销号帖子：没有"博主本人"这个概念（博主是营销号账号），走营销号自己的AI互动逻辑 + 随机路人NPC评论
    if (isTabloid) {
        rollTabloidAIParticipation(postId, text, currentUser.name);
        spawnNpcComments(postId, 'tabloid', { triggerName: currentUser.name, triggerText: text, triggerId: newReply.id });
        return;
    }

    let emoPrompt = getEmoticonPrompt();

    for (let char of myCharacters) {
        if (char.replyToUser === false) continue; // 新增：设置里关闭了"回复用户"的角色，直接跳过不参与互动
        let isPostAuthor = (char.id === post.char.id);

        let actionStrictRule = allowActionTags ? "" : "\n【严格禁止】：绝对不要在回复中包含任何动作、神态或心理描写（如括号内的动作），只能输出你直接说出的话！";
        let contextInfo = `\n【原推文内容】："${post.text}"\n【用户的评论】："${text}"\n`;

        let prompt = "";
        if (isPostAuthor) {
            prompt = `${buildBasePrompt(char, true, contextInfo)}${contextInfo}${emoPrompt}用户刚刚在你的推文下评论了。你必须互动！如果只需点赞请输出"LIKE"；若文字回复，请紧扣原推文和评论内容直接输出话术（不超过${postWordLimit}字）。绝对不能输出"NO"。若用表情附[EMO:ID]。${actionStrictRule}`;
        } else {
            // 修复："所有角色都要围着用户转"：即使不是这条推文的博主，只要用户发了评论，也不允许完全无视，
            // 高冷人设最多是"倾向于只点赞"，而不是可以彻底装看不见。
            prompt = isCoolPersona(char.persona) ? `${buildBasePrompt(char, true, contextInfo)}${contextInfo}这是别人的推文，用户刚刚评论了。你性格高冷，通常只点赞，但也必须对用户的评论有所反应，不能完全无视。请输出"LIKE"。${actionStrictRule}` : `${buildBasePrompt(char, true, contextInfo)}${contextInfo}${emoPrompt}针对上述推文和用户的评论，你必须插话反应一下，不能完全无视。如果想认真回复，请紧扣推文内容直接输出话术（不超过${postWordLimit}字），若用表情附[EMO:ID]；如果只是随手点赞，输出"LIKE"。只能二选一，不允许输出"NO"。${actionStrictRule}`;
        }
        try {
            let data = await sendChatRequest({ url: myApiUrl, key: myApiKey, model: myModel }, prompt);
            if (data.error) { console.error(`角色"${char.name}"回复评论失败：`, data.error); continue; }
            let repText = data.choices?.[0]?.message?.content?.trim() || "";

            let repMediaUrl = null; let emoMatch = repText.match(/\[EMO:(emo_\w+)\]/i);
            if (emoMatch) { let emo = globalEmoticons.find(e => e.id === emoMatch[1]); if (emo) repMediaUrl = emo.url; repText = repText.replace(emoMatch[0], '').trim(); }

            if (isPostAuthor && repText.toUpperCase().startsWith("NO") && repText.length < 5) repText = "LIKE";

            if (repText.toUpperCase() === 'LIKE') {
                newReply.likes = (newReply.likes || 0) + 1;
                if (!newReply.likedBy) newReply.likedBy = [];
                if (!newReply.likedBy.includes(char.id)) newReply.likedBy.push(char.id); // 记录AI点赞
                if(typeof addNotification === 'function') addNotification(`<b>${char.name}</b> 赞了您的评论 ❤️`, postId, null, char, "");
            }
            else if (!repText.toUpperCase().startsWith("NO") && repText !== "") {
                post.replies.push({
                    id: 'r_' + Date.now() + Math.floor(Math.random()*100),
                    parentId: newReply.id,
                    char: char,
                    text: repText,
                    timestamp: Date.now(),
                    likes: 0,
                    liked: false,
                    likedBy: [],
                    replyTo: currentUser.name,
                    mediaUrl: repMediaUrl
                });
                post.stats.comments++;
                if(typeof addNotification === 'function') addNotification(`<b>${char.name}</b> 回复了您的评论`, postId, null, char, repText);
            }
            if(typeof renderSinglePostDetail === 'function') renderSinglePostDetail(postId); saveAllData();
        } catch(e) { console.error(`角色"${char.name}"回复评论请求异常：`, e); }
    }
    if (Math.random() < npcReplyProb) spawnNpcComments(postId, false, { triggerName: currentUser.name, triggerText: text, triggerId: newReply.id });
}

// 1. 全新：支持无限极嵌套、3层自动折叠的深渊渲染器
window.renderAnonPosts = function() {
    const container = document.getElementById('anonFeedSection');
    if (!anonPosts || anonPosts.length === 0) {
        container.innerHTML = '<div class="empty-state" style="color:#aaa;">深渊里一片死寂...</div>';
        return;
    }

    // 预处理：确保所有旧评论都有唯一ID，防止树状图断裂
    let dataChanged = false;
    anonPosts.forEach(post => {
        if (post.replies) {
            post.replies.forEach(r => {
                if (!r.id) { r.id = 'ar_' + Date.now() + Math.random().toString(36).substr(2, 5); dataChanged = true; }
            });
        }
    });
    if(dataChanged && typeof saveAllData === 'function') saveAllData();

    container.innerHTML = anonPosts.map((post, pIdx) => {
        let repliesHtml = '';
        if (post.replies && post.replies.length > 0) {
            
            // 【核心算法】将扁平的评论数组转换为虚拟嵌套树
            const map = new Map();
            const roots = [];
            
            post.replies.forEach((r, idx) => {
                map.set(r.id, { data: r, originalIdx: idx, children: [] });
            });
            
            post.replies.forEach((r, idx) => {
                let node = map.get(r.id);
                let parentFound = false;
                
                if (r.parentId && map.has(r.parentId)) {
                    map.get(r.parentId).children.push(node);
                    parentFound = true;
                } else if (r.replyTo) {
                    // 兼容旧数据：如果只有回复名字，自动向前回溯寻找父节点
                    for (let i = idx - 1; i >= 0; i--) {
                        if (post.replies[i].anonName === r.replyTo) {
                            map.get(post.replies[i].id).children.push(node);
                            parentFound = true;
                            break;
                        }
                    }
                }
                if (!parentFound) roots.push(node); // 找不到父节点的归为顶层
            });

            // 【递归渲染函数】控制层级缩进与折叠
            function renderNode(node, depth) {
                let isMaxDepth = depth >= 2; // 0=第一层, 1=第二层, 2=第三层 (在此处折叠)
                let childrenHtml = '';
                
                if (node.children && node.children.length > 0) {
                    if (isMaxDepth) {
                        // 超过3层：隐藏子节点，显示查看更多按钮
                        childrenHtml += `<div id="anon-children-${node.data.id}" style="display:none; border-left: 2px solid #333; margin-left: 12px; padding-left: 10px; margin-top: 5px;">`;
                        node.children.forEach(child => childrenHtml += renderNode(child, depth + 1));
                        childrenHtml += `</div>`;
                        childrenHtml += `<div style="margin-left:12px; margin-top:5px; color:#1d9bf0; font-size:12px; cursor:pointer;" onclick="document.getElementById('anon-children-${node.data.id}').style.display='block'; this.style.display='none';"> ↳ 展开 ${node.children.length} 条隐藏回复...</div>`;
                    } else {
                        // 正常嵌套显示，带有左侧跟帖线
                        childrenHtml += `<div style="border-left: 2px solid #333; margin-left: 12px; padding-left: 10px; margin-top: 5px;">`;
                        node.children.forEach(child => childrenHtml += renderNode(child, depth + 1));
                        childrenHtml += `</div>`;
                    }
                }

                let nodeHtml = `
                    <div class="anon-reply-item" style="padding: 10px 0; border-bottom: ${depth === 0 && node.children.length === 0 ? '1px solid #222' : 'none'};" oncontextmenu="showAnonReplyContextMenu(event, '${post.id}', ${node.originalIdx})">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span style="font-weight:bold; color:#fff; font-size:13px;">${node.data.anonName}</span> 
                                <span style="color:#1d9bf0; font-size:12px; cursor:pointer; margin-left:10px;" onclick="window.triggerAnonReply('${post.id}', '${node.data.id}', '${node.data.anonName}')">💬 回复</span>
                            </div>
                        </div>
                        <div style="margin-top:4px; color:#ccc; font-size:14px; line-height:1.5;">${node.data.text}</div>
                    </div>
                `;
                return nodeHtml + childrenHtml;
            }

            repliesHtml = `<div class="anon-reply-section" style="margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">` 
                        + roots.map(root => renderNode(root, 0)).join('') 
                        + `</div>`;
        }

        return `
        <div class="anon-post-item">
            <div class="anon-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="anon-avatar">${post.anonName ? post.anonName[0] : '?'}</div>
                    <div>
                        <div class="anon-name">${post.anonName}</div>
                        <div class="anon-id">ID: ${post.anonId} · ${timeAgo(post.timestamp)}</div>
                    </div>
                </div>
                <button class="anon-action-btn" style="background:transparent; border:none; color:#f91880; font-size:16px; padding:0;" onclick="deleteAnonPost('${post.id}')" title="删除帖子">🗑️</button>
            </div>
            <div class="anon-body">${post.text}</div>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="anon-action-btn" onclick="likeAnonPost('${post.id}')">${post.userLiked ? '❤️ 已赞' : '🤍 赞'} ${post.stats.likes || 0}</button>
                <button class="anon-action-btn" onclick="window.triggerAnonReply('${post.id}', null, '')">💬 评论 ${post.stats.comments || 0}</button>
            </div>
            
            <div id="anon-reply-input-${post.id}" style="display:none; margin-top:15px; padding-top:15px; border-top:1px dashed #444;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <input type="text" id="anon-input-text-${post.id}" placeholder="发布你的匿名回复..." style="flex:1; background: #222; color: #fff; border: 1px solid #555; padding: 10px 15px; border-radius: 20px; outline: none; font-size: 14px;" onkeypress="if(event.key === 'Enter') submitAnonReplyBtn('${post.id}')">
                    <button style="background: #1d9bf0; color: #fff; border: none; padding: 8px 18px; border-radius: 20px; cursor: pointer; font-weight: bold; font-size: 14px;" onclick="submitAnonReplyBtn('${post.id}')">回复</button>
                </div>
            </div>
            
            ${repliesHtml}
        </div>
        `;
    }).join('');
};

// 2. 唤醒对应层级的回复输入框
window.triggerAnonReply = function(postId, parentId, replyToName) {
    const inputContainer = document.getElementById(`anon-reply-input-${postId}`);
    if (inputContainer.style.display === 'none' || inputContainer.dataset.parentId !== String(parentId)) {
        inputContainer.style.display = 'block';
        inputContainer.dataset.parentId = parentId || ''; // 记录父评论ID
        const inputEl = document.getElementById(`anon-input-text-${postId}`);
        inputEl.value = replyToName ? `回复 @${replyToName}：` : '';
        inputEl.focus();
    } else {
        inputContainer.style.display = 'none';
    }
};

// 3. 提交带层级记忆的评论
// 【重要修复】：之前这个函数只是把用户的评论存进数组里就完事了，从来没有触发过任何AI互动——
// 不管这条帖子是用户自己发的还是某个角色发的，评论之后角色和路人NPC都不会有任何反应。
// 现在补上：如果帖子是角色发的，让ta本人有几率亲自回应；然后再按概率随机召唤路人NPC围观。
window.submitAnonReplyBtn = async function(postId) {
    const inputContainer = document.getElementById(`anon-reply-input-${postId}`);
    const inputEl = document.getElementById(`anon-input-text-${postId}`);
    let text = inputEl.value.trim();
    if(!text) return;

    let parentId = inputContainer.dataset.parentId || null;
    let replyTo = '';

    // 如果用户没有删掉"回复 @xxx："前缀，剥离出真实文本
    if(text.startsWith('回复 @')) {
        const parts = text.split('：');
        if(parts.length > 1) {
            replyTo = parts[0].replace('回复 @', '');
            text = parts.slice(1).join('：').trim();
        }
    }

    const post = anonPosts.find(p => p.id === postId);
    if (!post) return;

    post.replies = post.replies || [];
    const anonProfile = { name: document.getElementById('myAnonName')?.value || '无名氏', id: document.getElementById('myAnonId')?.value || 'User123' };

    const newReply = {
        id: 'ar_' + Date.now() + Math.random().toString(36).substr(2, 5),
        parentId: parentId, // 绑定层级
        charId: 'user',
        anonName: anonProfile.name,
        anonId: anonProfile.id,
        replyTo: replyTo,
        text: text,
        timestamp: Date.now()
    };
    post.replies.push(newReply);

    post.stats.comments++;
    inputEl.value = '';
    inputContainer.style.display = 'none';
    if(typeof saveAllData === 'function') saveAllData();
    window.renderAnonPosts();

    if (!myApiKey) return;

    // 如果这条帖子是某个角色发的（不是用户自己），让发帖角色本人有机会亲自回应这条评论
    if (post.charId && post.charId !== 'me' && post.charId !== 'user') {
        const char = myCharacters.find(c => c.id == post.charId);
        if (char && char.replyToUser !== false) {
            try {
                const api = getApiConfig(true);
                if (api.key) {
                    const actionStrictRule = allowActionTags ? "" : "\n【严格禁止】：绝对不要包含任何动作、神态或心理描写（不要用括号()或【】），只输出你直接说的话。";
                    const genderContext = getUserContextPrompt();
                    const p = `你是"${char.name}"，人设：${char.persona}。你在匿名论坛（暗网、抽象、无底线氛围）发的帖子是："${post.text}"。刚刚有人评论道："${text}"。${genderContext}
这是你自己发的帖子，有人评论了就必须回应，不能装作没看见。直接输出你的回复内容（不超过${chatWordLimit}字，语气符合匿名论坛的恶劣氛围和你的隐藏性格），绝对不能输出"NO"。${actionStrictRule}`;
                    const data = await sendChatRequest(api, p);
                    if (data.error) { console.error(`角色"${char.name}"回应匿名评论失败：`, data.error); }
                    else {
                        const rep = data.choices?.[0]?.message?.content?.trim();
                        if (rep && !rep.toUpperCase().startsWith('NO')) {
                            post.replies.push({
                                id: 'ar_' + Date.now() + Math.random().toString(36).substr(2, 5),
                                parentId: newReply.id,
                                charId: char.id,
                                anonName: post.anonName,
                                anonId: post.anonId,
                                replyTo: anonProfile.name,
                                text: rep,
                                timestamp: Date.now()
                            });
                            post.stats.comments++;
                            saveAllData();
                            window.renderAnonPosts();
                        }
                    }
                }
            } catch (e) { console.error('匿名论坛角色回应评论异常：', e); }
        }
    }

    // 随机召唤路人NPC围观评论
    if (Math.random() < npcReplyProb) spawnNpcComments(postId, 'anon', { triggerName: anonProfile.name, triggerText: text, triggerId: newReply.id });
};
function deleteAnonPost(postId) {
    if (!confirm('警告：确定要彻底删除这条匿名帖子吗？')) return;
    anonPosts = anonPosts.filter(p => p.id !== postId);
    saveAllData();
    renderAnonPosts();
}

function likeAnonPost(postId) {
    let post = anonPosts.find(p => p.id === postId);
    if(!post) return;
    post.userLiked = !post.userLiked;
    post.stats.likes = Math.max(0, (post.stats.likes || 0) + (post.userLiked ? 1 : -1));
    renderAnonPosts();
    saveAllData();
}

async function userAnonPost() {
    const input = document.getElementById('userAnonInput');
    const text = input.value.trim();
    if (!text) return;
    if (!myApiKey) return alert("请先在设置中配置密钥！");

    const newPost = {
        id: 'anon_' + Date.now(),
        charId: 'me',
        anonName: currentUser.anonName || '匿名用户',
        anonId: currentUser.anonId || 'User',
        text: text,
        timestamp: Date.now(),
        replies: [],
        stats: { likes: 0, comments: 0 },
        userLiked: false
    };
    if(!anonPosts) anonPosts = [];
    anonPosts.unshift(newPost);
    input.value = '';
    renderAnonPosts();
    
    // ==========================================
    // 触发路人 NPC 在匿名论坛的评论
    spawnNpcComments(newPost.id, 'anon', { triggerName: newPost.anonName, triggerText: text });
    // ==========================================

    document.getElementById('anonLoadingStatus').style.display = 'block';
    let genderContext = getUserContextPrompt();

    for (let char of myCharacters) {
        if (char.replyToUser === false) continue; // 新增：设置里关闭了"回复用户"的角色，直接跳过不参与互动
        let actionStrictRule = allowActionTags ? "" : "\n【严格禁止】：绝对不要包含任何动作、神态或心理描写（不要用括号()或【】），只输出你直接说的话。";
        let p = `你处于一个完全匿名的暗网与抽象论坛。看到有人发帖："${text}"。你的人设是：${char.persona}。${genderContext}
在这里你可以卸下伪装，展现你内心真实、阴暗、极端、或者是极度发癫、抽象、逆天、神经质、色情的一面。不要有任何顾虑，不用保持礼貌。
你必须在下面回复，不能装作没看见。直接输出你的评论内容（不超过${chatWordLimit}字，语气要符合上述的匿名论坛恶劣环境和你的隐藏性格），绝对不能输出"NO"。${actionStrictRule}`;

        try {
            let data = await sendChatRequest({ url: myApiUrl, key: myApiKey, model: myModel }, p);
            let repText = data.choices?.[0]?.message?.content?.trim() || "";

            if (!repText.toUpperCase().startsWith("NO") && repText !== "") {
                newPost.replies.push({
                    charId: char.id,
                    anonName: char.anonName || '匿名者',
                    anonId: char.anonId || Math.random().toString(36).substr(2,6).toUpperCase(),
                    text: repText,
                    timestamp: Date.now()
                });
                newPost.stats.comments++;
                
                let avatarHtml = `<div class="avatar" style="background:#555; border:1px solid #777; color:#fff;">?</div>`;
                showToast(avatarHtml, `匿名用户 评论了你的帖子`, repText, newPost.id, null, true);
                renderAnonPosts();
            }
        } catch(e) { console.error(e); }
    }
    document.getElementById('anonLoadingStatus').style.display = 'none';
    saveAllData();
}

async function generateAnonPostForSelected() {
    if (!myApiKey) return alert("请先在设置中配置密钥！");
    if (myCharacters.length === 0) return alert("请先创建至少一个角色！");
    
    const selVal = document.getElementById('anonCharSelect').value;
    let selectedChar = selVal === 'random' ? myCharacters[Math.floor(Math.random() * myCharacters.length)] : (myCharacters.find(x => x.id == selVal) || myCharacters[0]);
    
    const btn = document.getElementById('btnGenerateAnon');
    btn.innerText = "处理中... ⏳"; btn.disabled = true;

    let genderContext = getUserContextPrompt();
    let actionStrictRule = allowActionTags ? "" : "\n【严格禁止】：绝对不要包含任何动作、神态或心理描写（不要用括号()或【】），只输出你直接想说的文字内容。";

    let p = `你是"${selectedChar.name}"，人设：${selectedChar.persona}。现在你处于一个完全匿名的暗网与抽象论坛。在这里你可以完全卸下伪装，展现你内心极度阴暗、或者极度发癫、抽象、逆天、色情、神经质的一面。${genderContext}
用第一人称发一条匿名帖子，不超过${postWordLimit}字。不要暴露你的真实身份。直接输出帖子内容，不要包含JSON或其他说明。${actionStrictRule}`;

    try {
        let data = await sendChatRequest({ url: myApiUrl, key: myApiKey, model: myModel }, p);
        if (data.error) { console.error("匿名帖生成失败：", data.error); alert("生成失败：" + (data.error.message || "API 返回了错误，请检查密钥/模型配置")); return; }
        let repText = data.choices?.[0]?.message?.content?.trim() || "";
        // 修复：强力清洗可能的 Markdown/JSON 污染符
        repText = repText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').replace(/^"/, '').replace(/"$/, '').trim();

        if (repText) {
            if (!Array.isArray(anonPosts)) anonPosts = [];
            let aName = selectedChar.anonName || '匿名者';
            let aId = selectedChar.anonId || Math.random().toString(36).substring(2, 8).toUpperCase();

            let newPost = {
                id: 'anon_' + Date.now(), charId: selectedChar.id, anonName: aName, anonId: aId,
                text: repText, timestamp: Date.now(), replies: [], stats: { likes: 0, comments: 0 }, userLiked: false
            };
            anonPosts.unshift(newPost);
            saveAllData();
            renderAnonPosts();
            // 角色发帖后，随机召唤 NPC 阴阳怪气
            spawnNpcComments(newPost.id, 'anon', { triggerName: aName, triggerText: repText });
        } else {
            alert("这次AI没有返回有效内容，请重试一次（可能是网络波动或模型拒答）。");
        }
    } catch(e) { console.error("匿名帖生成失败", e); alert("生成失败：" + e.message); }

    btn.innerText = "召唤角色发言"; btn.disabled = false;
}

// 修改内联回复框，与新版极简回复框保持一致
function toggleInlineReply(replyIdx, postId) {
    const areaId = `inline-reply-${postId}-${replyIdx}`; const existing = document.getElementById(areaId); if (existing) { existing.remove(); return; }
    const replyItem = document.querySelector(`[data-reply-idx="${replyIdx}"][data-post-id="${postId}"]`); if (!replyItem) return;
    const area = document.createElement('div'); area.className = 'inline-reply-area'; area.id = areaId;
    let isTabloid = postId.startsWith('tb_');
    const post = isTabloid ? tabloidPosts.find(p => p.id == postId) : globalPosts.find(p => p.id == postId);
    const targetReply = post?.replies[replyIdx];
    const targetDisplayName = isTabloid ? (targetReply?.name || '') : (targetReply?.char?.name || '');
    
    area.innerHTML = `
        <div style="display:flex; align-items:center; padding:10px 16px; gap:12px; margin-top:0; border-top:1px solid #eff3f4;">
            ${getAvatarHTML(currentUser, 40)}
            <input type="text" id="inline-input-${postId}-${replyIdx}" placeholder="回复 @${targetDisplayName}" style="flex:1; border:none; outline:none; font-size:15px; color:#0f1419; background:transparent;" onkeypress="if(event.key === 'Enter') submitInlineReply('${postId}', ${replyIdx})">
            <button onclick="submitInlineReply('${postId}', ${replyIdx})" style="background-color:rgba(29, 155, 240, 0.4); color:white; border:none; border-radius:9999px; padding:6px 16px; font-weight:bold; font-size:14px; cursor:pointer;">回复</button>
        </div>
        <div id="inlineAttachmentPreview-${postId}-${replyIdx}" class="emo-preview-box" style="display:none; padding-left:0;"></div>
    `;
    // 插入到对应的回复项之后，保证层级正确
    replyItem.parentNode.insertBefore(area, replyItem.nextSibling); document.getElementById(`inline-input-${postId}-${replyIdx}`).focus();
}

// ==========================================
// 修复：主页/推文的 NPC 跟帖系统 (增加弹窗提醒及楼中楼兼容)
// ==========================================
async function spawnNpcComments(postId, postType, opts = {}) {
    const { triggerName, triggerText, isShura, triggerId } = opts;
    let post;
    
    if (postType === true || postType === 'tabloid') post = tabloidPosts.find(p => p.id == postId);
    else if (postType === 'anon') post = anonPosts.find(p => p.id == postId);
    else post = globalPosts.find(p => p.id == postId);
    
    if (!post) return;
    const api = getApiConfig(true); if (!api.key) return;
    if (npcReplyMaxCount <= 0) return;
const count = Math.floor(Math.random() * npcReplyMaxCount) + 1; 
    
    let postCharContext = "当前被评论的推文博主是用户本人。";
    if (post.char && post.char.id !== 'me' && post.char.id !== 'tabloid_admin') {
        postCharContext = `当前被评论的推文博主是"${post.char.name}"，其人设为：${post.char.persona}。`;
    }
    
    const context = triggerText ? `刚才"${triggerName}"评论说："${triggerText}"。` : `帖子内容："${post.text}"。`;
    const toneHint = isShura ? '拱火、阴阳怪气、骂战' : '吃瓜、围观、玩梗';
    let forumHint = postType === 'anon' ? "注意：当前处于匿名、抽象且无底线的深渊论坛，请用非常暴躁、极端、抽象、不礼貌的网民语气。" : "";
    const actionStrictRule = allowActionTags ? "" : "评论内容里绝对不要有任何动作、神态或心理描写，不要用括号()或【】，只写路人会打出来的话。";

    const prompt = `你现在要模拟${count}个路人NPC网友进行网络评论。
【重要设定上下文】：
${postCharContext}
${getUserContextPrompt()}
生成NPC言论时，你必须严格记忆、区分并遵循上述博主和用户的性别与人设特征，绝不能搞错代词！
${forumHint}
${context}
请模拟${count}个路人NPC看到后的${toneHint}评论，各不相同，每条不超过30字。
【严格禁止】：评论内容必须是路人自己的原创发言，绝对不能照抄、复述或改写上面引用的原话，也不能和原帖内容重复！${actionStrictRule}
请严格返回JSON数组: [{"name":"网友昵称","text":"评论内容"}]，不要有其他任何说明文字。`;

    // 修复：AI 偶尔会把"刚才谁说了什么"的引用内容直接当成一条新评论抄回来，
    // 导致评论区里出现一条和角色/用户刚发的内容一模一样的"新评论"。这里做一层归一化去重兜底。
    const normalizeForCompare = (s) => (s || '').replace(/["“”'‘’，。！？~\s]/g, '');
    const bannedTexts = [triggerText, post.text].filter(Boolean).map(normalizeForCompare);
    const isEchoOfTrigger = (text) => {
        const t = normalizeForCompare(text);
        if (!t) return true;
        return bannedTexts.some(b => b && (t === b || (t.length > 6 && (b.includes(t) || t.includes(b)))));
    };

    try {
        const resData = await sendChatRequest(api, prompt);
        if (resData.error) { console.error("NPC 评论生成失败（API返回错误）：", resData.error); return; }
        const raw = resData.choices?.[0]?.message?.content?.match(/\[[\s\S]*\]/)?.[0] || "[]";
        const arr = JSON.parse(raw);
        let lastName = triggerName, lastText = triggerText;
        
        arr.forEach(c => {
            if (!c || !c.text) return;
            if (isEchoOfTrigger(c.text)) return; // 跳过照抄原话的"伪造评论"
            
            if (postType === true || postType === 'tabloid') {
                post.replies.push({ 
                    id: 'r_' + Date.now() + Math.floor(Math.random()*100),
                    parentId: triggerId || null, 
                    charId: 'npc', name: c.name || '路人网友', text: c.text, timestamp: Date.now(),
                    replyTo: triggerId ? triggerName : undefined
                });
                // 【新增：小报推文收到NPC回复的弹窗】
                if (opts.triggerName === currentUser.name) {
                    showToast(`<div class="avatar" style="background:#1d9bf0;color:white;font-size:20px;">📰</div>`, `${c.name || '路人网友'} 评论了你`, c.text, postId, null);
                }
            } else if (postType === 'anon') {
                post.replies.push({ 
                    id: 'ar_' + Date.now() + Math.floor(Math.random()*100),
                    parentId: triggerId || null,
                    charId: 'npc', anonName: c.name || '路人网友', anonId: 'NPC', text: c.text, timestamp: Date.now(),
                    replyTo: triggerId ? triggerName : undefined
                });
                // 【新增：匿名推文收到NPC回复的弹窗】
                if (post.charId === 'me' || opts.triggerName === (currentUser.anonName || '匿名用户')) {
                    showToast(`<div class="avatar" style="background:#555; border:1px solid #777; color:#fff;">?</div>`, `匿名网友 评论了你`, c.text, postId, null, true);
                }
            } else {
                const npcChar = { id: 'npc_' + Math.random().toString(36).slice(2, 8), name: c.name || '路人网友', handle: '@npc_user', avatarEmoji: '👤', themeColor: '#536471', verified: false };
                
                post.replies.push({ 
                    id: 'r_' + Date.now() + Math.floor(Math.random()*100),
                    // 修复：优先挂载到触发本轮NPC评论的那条评论下（角色/用户的评论），实现楼中楼嵌套；没有明确触发对象时才作为一级评论
                    parentId: triggerId || null, 
                    char: npcChar, 
                    text: c.text, 
                    timestamp: Date.now(), 
                    likes: 0, 
                    liked: false,
                    likedBy: [],
                    replyTo: triggerId ? triggerName : undefined
                });
                
                // 【新增：普通推文如果是用户的，或者用户刚刚参与了评论，就弹窗通知】
                if (post.char.id === 'me' || opts.triggerName === currentUser.name) {
                    showToast(getAvatarHTML(npcChar, 40), `${npcChar.name} 评论了你`, c.text, postId, null);
                }
            }
            post.stats.comments = (post.stats.comments || 0) + 1;
            lastName = c.name || '路人网友'; lastText = c.text;
        });
        saveAllData();
        
        const detailEl = document.getElementById('view-post-detail');
        if (detailEl && detailEl.style.display !== 'none') renderSinglePostDetail(postId);
        const tabloidEl = document.getElementById('view-tabloid');
        if ((postType === true || postType === 'tabloid') && tabloidEl && tabloidEl.style.display !== 'none') renderTabloidPosts();
        const anonEl = document.getElementById('view-anon-forum');
        if (postType === 'anon' && anonEl && anonEl.style.display !== 'none') renderAnonPosts();
        const homeEl = document.getElementById('view-home');
        if (!postType && homeEl && homeEl.style.display !== 'none' && typeof renderPosts === 'function') renderPosts();
        if (postType === 'tabloid' && arr.length > 0) rollTabloidAIParticipation(postId, lastText, lastName);

        // 🆕 角色是否要搭理这些路人NPC的评论，完全看人设自己判断（不像和真实用户互动那样强制要求回应）
        if (!postType && post.char && post.char.id !== 'me' && post.char.id !== 'tabloid_admin' && arr.length > 0) {
            maybeCharacterReactToNpcComments(post, arr, postId);
        }
    } catch (e) { console.error("NPC 评论生成失败：", e); }
}

// 🆕 NPC评论了角色自己的推文后，角色自己决定要不要搭理——高冷/懒得理人的人设完全可以选择无视，
// 这一点和"用户强制要求互动"是分开的两套逻辑，不会影响用户评论时角色必须回应的规则。
async function maybeCharacterReactToNpcComments(post, npcComments, postId) {
    const char = post.char;
    const api = getApiConfig(true); if (!api.key) return;
    const commentsText = npcComments.map(c => `${c.name || '路人网友'}: ${c.text}`).join('\n');
    const prompt = `${buildBasePrompt(char, true, commentsText)}\n【你发的推文】：\"${post.text}\"\n【刚刚有几个路人网友在你的推文下评论】：\n${commentsText}\n这些只是路人NPC，不是重要的人。请结合你的人设自行判断要不要搭理——高冷、懒得理人、只活在自己世界里的性格完全可以选择无视，不需要勉强互动。如果决定要回应，请紧扣评论内容直接输出话术（不超过${postWordLimit}字）；不想搭理就直接输出"NO"。`;
    try {
        let repText = (await sendChatRequest(api, prompt)).choices?.[0]?.message?.content?.trim() || "";
        repText = applyRegexScripts(repText, 'ai_output');
        if (!repText || repText.toUpperCase().startsWith("NO")) return; // 角色选择无视，符合人设自主判断，不强求
        post.replies.push({ id: 'r_' + Date.now() + Math.floor(Math.random() * 100), parentId: null, char, text: repText, timestamp: Date.now(), likes: 0, liked: false, likedBy: [] });
        post.stats.comments = (post.stats.comments || 0) + 1;
        saveAllData();
        if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
        if (document.getElementById('view-home').style.display !== 'none' && typeof renderPosts === 'function') renderPosts();
    } catch (e) {}
}

// ==========================================
// 修复：楼中楼内联回复系统 (增加 NPC 反击弹窗)
// ==========================================
async function submitInlineReply(postId, replyIdx) {
    const inputEl = document.getElementById(`inline-input-${postId}-${replyIdx}`); if (!inputEl) return;
    const paramKey = `${postId}-${replyIdx}`; const text = inputEl.value.trim(); if (!text && !pendingInlineAttachments[paramKey]) return;
    
    let isTabloid = postId.startsWith('tb_');
    let post = isTabloid ? tabloidPosts.find(p => p.id == postId) : globalPosts.find(p => p.id == postId); 
    if (!post) return; 
    
    const targetReply = post.replies[replyIdx];
    if (!targetReply.id) targetReply.id = 'r_legacy_' + Date.now();
    
    let targetName = isTabloid ? targetReply.name : targetReply.char.name;
    let targetId = isTabloid ? targetReply.charId : targetReply.char.id;

    const newReply = isTabloid 
        ? { id: 'r_' + Date.now(), parentId: targetReply.id, charId: 'me', name: currentUser.name, text: text, timestamp: Date.now() }
        : { id: 'r_' + Date.now(), parentId: targetReply.id, char: { ...currentUser }, text: text, timestamp: Date.now(), likes: 0, liked: false, likedBy: [], replyTo: targetName, mediaUrl: pendingInlineAttachments[paramKey] };

    if (!post.replies) post.replies = [];
    post.replies.push(newReply); post.stats.comments++; clearAttachment('inline', paramKey); 
    if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
    saveAllData();
    
    if (isTabloid) rollTabloidAIParticipation(postId, text, currentUser.name);
    else if (Math.random() < npcReplyProb) spawnNpcComments(postId, false, { triggerName: currentUser.name, triggerText: text, triggerId: newReply.id });
    
    const api = getApiConfig(true); 
    if (!api.key || targetId === 'me') return;

    if (String(targetId).startsWith('npc')) {
        let npcActionRule = allowActionTags ? "" : "不要有任何动作、神态或心理描写，不要用括号()或【】，只输出要说的话。";
        let p = `你是路人网友"${targetName}"。刚才用户"${currentUser.name}"针对你的评论回复道："${text}"。请你以路人网友的身份（八卦、吃瓜、拱火）简短回击，不超过50字。如果在扮演具体角色，注意带入角色的情绪。直接输出内容，不要带引号。${npcActionRule}`;
        try {
            let rep = (await sendChatRequest(api, p)).choices?.[0]?.message?.content?.trim();
            if (rep && !rep.toUpperCase().startsWith("NO")) {
                post.replies.push(isTabloid
                    ? { id: 'r_' + Date.now(), parentId: newReply.id, charId: targetId, name: targetName, text: rep, timestamp: Date.now() } 
                    : { id: 'r_' + Date.now(), parentId: newReply.id, char: { id: targetId, name: targetName, handle: '@npc_user', avatarEmoji: '👤', themeColor: '#536471', verified: false }, text: rep, timestamp: Date.now(), likes: 0, liked: false, likedBy: [], replyTo: currentUser.name });
                post.stats.comments++;
                if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
                saveAllData();

                // 【新增：如果 NPC 跟你吵起来了，也得跳出弹窗提醒你】
                let npcCharMock = { name: targetName, avatarEmoji: '👤', themeColor: '#536471' };
                showToast(getAvatarHTML(npcCharMock, 40), `${targetName} 回复了你`, rep, postId, null);
            }
        } catch(e) {}
        return;
    }

    const char = myCharacters.find(c => c.id === targetId); if (!char) return;
    if (char.replyToUser === false) return; // 新增：设置里关闭了"回复用户"的角色，用户直接@/回复它也不会再收到回应
    let wbContext = getCharacterWorldbookText(char); let emoPrompt = getEmoticonPrompt(); const isCool = isCoolPersona(char.persona);
    let genderContext = getUserContextPrompt();
    let chatSummaryContext = char.chatSummary ? `\n【历史聊天总结（仅背景了解，是已经聊过的旧话题，不要当成当前话题主动重提）】：${getRecentChatSummaryText(char.chatSummary, 5)}` : '';

    let targetText = targetReply.text || targetReply.content || '';
    let actionStrictRule = allowActionTags ? "" : "\n【严格禁止】：绝对不要在回复中包含任何动作、神态或心理描写（如括号内的动作），只能输出你直接说出的话！";
    let contextInfo = `\n【原推文内容】："${post.text}"\n【原评论/你想回的话】："${targetText}"\n`;
    
    // 修复："所有角色都要围着用户转"：用户是直接点名回复/@了这个角色，属于最强互动信号，
    // 不应该再给"NO"这个选项——高冷人设最多是回得简短冷淡，而不是不回。
    const prompt = isCool
        ? `你是"${char.name}"，人设：${char.persona}。${wbContext}${genderContext}${chatSummaryContext}${emoPrompt}${contextInfo}用户在上述对话中直接回复了你："${text}"。你性格高冷，但用户都直接找你说话了，你必须回应，哪怕只是简短冷淡的一两句。请紧扣上下文直接输出内容，绝对不能输出"NO"或保持沉默。若用表情包附上 [EMO:对应ID]。${actionStrictRule}`
        : `你是"${char.name}"，人设：${char.persona}。${wbContext}${genderContext}${chatSummaryContext}${emoPrompt}${contextInfo}用户在上述对话中@了你："${text}"。你必须回应，绝对不能输出"NO"或保持沉默。请紧扣前文对话直接输出回复内容（不超过${chatWordLimit}字）。若想使用表情，请附带 [EMO:对应ID]。${actionStrictRule}`;
        
    try {
        const data = await sendChatRequest(api, prompt);
        let repText = data.choices?.[0]?.message?.content?.trim() || "";
        let repMediaUrl = null; let emoMatch = repText.match(/\[EMO:(emo_\w+)\]/i);
        if (emoMatch) { let emo = globalEmoticons.find(e => e.id === emoMatch[1]); if (emo) repMediaUrl = emo.url; repText = repText.replace(emoMatch[0], '').trim(); }

        if (!repText.toUpperCase().startsWith("NO") && repText !== "") {
            const charReplyId = 'r_' + Date.now() + Math.floor(Math.random()*100);
            if(isTabloid) {
                post.replies.push({ id: charReplyId, parentId: newReply.id, charId: char.id, name: char.name, text: repText, timestamp: Date.now() });
            } else {
                post.replies.push({ id: charReplyId, parentId: newReply.id, char: char, text: repText, timestamp: Date.now(), likes: 0, liked: false, likedBy: [], mediaUrl: repMediaUrl, replyTo: currentUser.name }); 
            }
            post.stats.comments++; 
            addNotification(`<b>${char.name}</b> 回复了您`, postId, null, char, repText); 
            if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
            saveAllData();
            if (isTabloid) { generateAutoNpcReaction(postId, char.name, repText, charReplyId); rollTabloidAIParticipation(postId, repText, char.name); }
            else if (Math.random() < npcReplyProb) spawnNpcComments(postId, false, { triggerName: char.name, triggerText: repText, triggerId: charReplyId });
        }
    } catch(e) {}
}

function toggleMainPostLike(postId, event) {
    let isTabloid = postId.startsWith('tb_');
    let post = isTabloid ? tabloidPosts.find(p => p.id === postId) : globalPosts.find(p => p.id == postId);
    if (!post) return;
    if (!post.likedBy) post.likedBy = [];
    const pinkLikeSVG = likeSVGFilled.replace(/#1d9bf0/g, '#f91880').replace('blue-line-icon', '');
    const el = event.currentTarget;

    if (post.userLiked) {
        post.userLiked = false;
        post.stats.likes = Math.max(0, parseStat(post.stats.likes) - 1);
        post.likedBy = post.likedBy.filter(id => id !== 'me');
        el.style.color = 'inherit';
        el.querySelector('.like-icon-wrap').innerHTML = likeSVG;
    } else {
        post.userLiked = true;
        post.stats.likes = parseStat(post.stats.likes) + 1;
        if (!post.likedBy.includes('me')) post.likedBy.push('me');
        el.style.color = '#f91880';
        el.querySelector('.like-icon-wrap').innerHTML = pinkLikeSVG;
    }
    el.querySelector('.like-count').innerText = formatStat(post.stats.likes);

    let statsLikeEl = document.getElementById(`detail-stats-likes-${postId}`);
    if (statsLikeEl) statsLikeEl.innerText = formatStat(post.stats.likes);

    saveAllData();
}

async function executeGeneration(charsToPost, storyContext = null, customWordLimit = null) {
    isGenerating = true; 
    document.getElementById('loadingStatus').style.display = 'block'; 
    
    // 动态显示：(角色名) 正在发布推文...
    let charNames = charsToPost.map(c => c.name).join('、');
    document.getElementById('loadingStatus').innerText = `${charNames} 正在发布推文... `;
    
    let newPosts = [];
    let emoPrompt = getEmoticonPrompt();

    for (let char of charsToPost) {
        const storyPart = storyContext ? `\n【当前故事背景】：${storyContext}\n请结合故事背景从你的视角发表看法。` : '';
        const chatPart = `\n【最近对话上下文】：\n${getRecentChatContext(char.id)}`;
        
        let finalWordLimit = customWordLimit ? customWordLimit : postWordLimit;
        
        // 直接调用强大的 buildBasePrompt，自动包含所有设定和记忆
        let p = `${buildBasePrompt(char, true, (storyContext || '') + chatPart)}${storyPart}${chatPart}${emoPrompt}
发一条推文，分享你的见闻或看法，不超过${finalWordLimit}字。${trendingTags.length>0 ? `可以考虑加上标签：${trendingTags[0]}` : ""}
【强制要求】：请严格以如下JSON格式返回，不要有任何其他说明：
{"text":"你的推文内容","image":false,"location":"当前所在的具体地点，若没有可填空字符串","emoticonId":"如果有合适的可用表情包，可以填入其ID，若不需要表情包则填null"}
如果内容非常适合真实配图，可以返回：
{"text":"推文内容","image":true,"imageKeyword":"配图关键词英文","location":"具体地点","emoticonId":null}`;

        try {
            let data = await sendChatRequest({ url: myApiUrl, key: myApiKey, model: myModel }, p);
            if(data.error) continue;
            let raw = data.choices?.[0]?.message?.content?.trim() || "";
            if(!raw) continue;
            let parsed = extractJsonObject(raw);
            if(parsed && parsed.text) {
                let mediaUrl = null;
                if(parsed.emoticonId) {
                    let emo = globalEmoticons.find(e => e.id === parsed.emoticonId);
                    if(emo) mediaUrl = emo.url;
                } else if(parsed.image && parsed.imageKeyword) {
                    mediaUrl = `https://source.unsplash.com/800x400/?${encodeURIComponent(parsed.imageKeyword)}`;
                }
                let post = {
                    id: 'p_' + Date.now() + Math.floor(Math.random()*1000), char: char, text: parsed.text, timestamp: Date.now(),
                    replies: [], mediaUrl: mediaUrl,
                    stats: { retweets: getRandomStat(1000), likes: getRandomStat(5000), views: getRandomStat(50000), comments: 0 },
                    isStory: !!storyContext, location: parsed.location || ""
                };
                newPosts.push(post);
                char.postCount = (char.postCount || 0) + 1;
                if(char.postCount % 20 === 0) updateCharMemoryAsync(char);
                saveCharLifeState(char, parsed.text); // 顺手用推文内容记录角色当下状态，不额外耗费一次AI调用
            }
        } catch(e) {}
    }
    
    if (newPosts.length > 0) { 
        globalPosts = [...newPosts, ...globalPosts]; 
        saveAllData(); 
        if (document.getElementById('view-home').style.display !== 'none') renderPosts(); 
        
        // 后台发推通知逻辑
        newPosts.forEach(post => {
            let isFollowed = post.char.isFollowing;
            let isSpecialFollowed = post.char.isSpecialFollow;
            let shouldNotify = (isFollowed || isSpecialFollowed) ? true : Math.random() < 0.00;
            
            if (shouldNotify) {
                let notifText = isSpecialFollowed ? `⭐ 特别关注 <b>${post.char.name}</b> 发了新推文` : `<b>${post.char.name}</b> 发了新推文`;
                let avatarHtml = getAvatarHTML(post.char, 80);
                showToast(avatarHtml, notifText, post.text, post.id, null);
                globalNotifications.unshift({ text: notifText, postId: post.id, chatCharId: null, timestamp: Date.now() });
                unreadNotifs++;
                updateNotifBadge();
            }
            spawnNpcComments(post.id, false, { triggerName: post.char.name, triggerText: post.text });
            triggerRelatedCharacterReactions(post.char, post.text, { type: 'post', id: post.id });
        });
        renderChatCharList();
    }
    isGenerating = false; 
    document.getElementById('loadingStatus').style.display = 'none';
}

function renderCenterCharList() {
    const container = document.getElementById('centerCharListContainer');
    if(myCharacters.length === 0) { container.innerHTML = '<div class="empty-state">目前还没有创建任何角色。</div>'; return; }
    let charsToShow = activeGroupFilter ? myCharacters.filter(c => c.group === activeGroupFilter) : myCharacters;
    if(charsToShow.length === 0) { container.innerHTML = '<div class="empty-state">该分组下没有角色。</div>'; return; }

    container.innerHTML = charsToShow.map(char => `
        <div class="center-char-item">
            <div class="char-info-wrapper" onclick="openFormForEdit('${char.id}')" style="cursor:pointer; flex:1;">
                ${getAvatarHTML(char, 40)}
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:bold; font-size:15px; display:flex; align-items:center; gap:6px;">
                        ${char.name} ${char.verified ? verifiedSVG : ''} 
                        ${char.group ? `<span class="group-tag" onclick="event.stopPropagation(); filterByGroup('${char.group}')">${char.group}</span>` : ''}
                    </div>
                    <div style="color:#536471; font-size:13px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${char.persona}</div>
                    ${char.lifeState && char.lifeState.activity ? `<div style="color:#8b98a5; font-size:12px; font-style:italic; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">💭 ${char.lifeState.activity}</div>` : ''}
                </div>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn-edit-small" style="color:#536471; border-color:#cfd9de;" onclick="openMemoryModal('${char.id}')">记忆</button>
                <button class="btn-edit-small" style="color:#f91880; border-color:#f91880;" onclick="deleteCharacter('${char.id}')">删除</button>
            </div>
        </div>`).join('');
}

function openCharacterCenter() { switchMainView('characterCenter'); }
function showRoleList() { renderCenterCharList(); document.getElementById('characterListView').style.display = 'block'; document.getElementById('characterFormView').style.display = 'none'; }

function clearForm() {
    editingCharId = null;
    document.getElementById('formTitle').innerText = "创建新 AI 角色";
    ['charName', 'charHandle', 'charPersona', 'charBio', 'charFollowers', 'charFollowing', 'charLocation', 'charWebsite', 'charBirthdate', 'charAutoReply', 'charBusyAutoReply', 'charAnonName', 'charAnonId', 'charNudgeText', 'charFirstMessage'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('charVerified').checked = false;
    document.getElementById('charAvatar').value = '';
    document.getElementById('charBg').value = '';
    document.getElementById('charAvatarPreview').style.display = 'none';
    document.getElementById('charBgPreview').style.display = 'none';
    tempCropResults.charAvatar = null; tempCropResults.charBg = null;

    document.getElementById('charGroup').value = '';
    document.getElementById('freqInterval').value = 1; document.getElementById('freqUnit').value = 'day'; document.getElementById('freqCount').value = 1;
    document.getElementById('chatFreqInterval').value = 0; document.getElementById('chatFreqUnit').value = 'hour';

    const wbBox = document.getElementById('charWbCheckboxes');
    if(worldbooks.length === 0) wbBox.innerHTML = '<span style="color:#536471; font-size:13px;">暂无世界书</span>';
    else wbBox.innerHTML = worldbooks.map(w => `<label style="display:flex; align-items:center; gap:4px; font-size:13px;"><input type="checkbox" value="${w.id}" class="wb-check"> ${w.title}</label>`).join('');
    const dbBox = document.getElementById('charDataBankList');
    if (dbBox) dbBox.innerHTML = '<span style="color:#536471; font-size:13px;">请先保存角色，再回来上传专属资料库</span>';
}

function openFormForCreate() { clearForm(); document.getElementById('characterListView').style.display = 'none'; document.getElementById('characterFormView').style.display = 'block'; renderStatusTypesList(); }

function openFormForEdit(charId) {
    editingCharId = charId; let char = charId === 'tabloid_admin' ? tabloidAccount : myCharacters.find(c => c.id == charId); if (!char) return;
    document.getElementById('formTitle').innerText = "修改角色资料";
    document.getElementById('charName').value = char.name; document.getElementById('charHandle').value = char.handle; document.getElementById('charPersona').value = char.persona;
    document.getElementById('charBio').value = char.bio; document.getElementById('charFollowers').value = char.followers; document.getElementById('charFollowing').value = char.following;
    document.getElementById('charLocation').value = char.location || ''; document.getElementById('charWebsite').value = char.website || ''; document.getElementById('charBirthdate').value = char.birthdate || '';
    document.getElementById('charVerified').checked = char.verified || false;
    document.getElementById('charGroup').value = char.group || '';
    document.getElementById('charAutoReply').value = char.autoReplyText || '';
    document.getElementById('charBusyAutoReply').value = char.busyAutoReplyText || '';
    document.getElementById('charAnonName').value = char.anonName || '';
    document.getElementById('charAnonId').value = char.anonId || '';
    document.getElementById('charNudgeText').value = char.nudgeText || '';
    if (document.getElementById('charFirstMessage')) document.getElementById('charFirstMessage').value = char.firstMessage || '';
    renderStatusTypesList();
    
    if (char.avatarImg) { document.getElementById('charAvatarPreview').src = char.avatarImg; document.getElementById('charAvatarPreview').style.display = 'block'; } else { document.getElementById('charAvatarPreview').style.display = 'none'; }
    if (char.bgImg) { document.getElementById('charBgPreview').src = char.bgImg; document.getElementById('charBgPreview').style.display = 'block'; } else { document.getElementById('charBgPreview').style.display = 'none'; }
    
    tempCropResults.charAvatar = char.avatarImg || null;
    tempCropResults.charBg = char.bgImg || null;

    const wbBox = document.getElementById('charWbCheckboxes');
    if(worldbooks.length === 0) wbBox.innerHTML = '<span style="color:#536471; font-size:13px;">暂无世界书</span>';
    else wbBox.innerHTML = worldbooks.map(w => `<label style="display:flex; align-items:center; gap:4px; font-size:13px;"><input type="checkbox" value="${w.id}" class="wb-check" ${(char.worldbooks||[]).includes(w.id) ? 'checked' : ''}> ${w.title}</label>`).join('');
    renderCharDataBankList();
    
    if (char.postFreq) { document.getElementById('freqInterval').value = char.postFreq.interval; document.getElementById('freqUnit').value = char.postFreq.unit; document.getElementById('freqCount').value = char.postFreq.count; }
    if (char.chatFreq) { document.getElementById('chatFreqInterval').value = char.chatFreq.interval || 0; document.getElementById('chatFreqUnit').value = char.chatFreq.unit || 'hour'; } else { document.getElementById('chatFreqInterval').value = 0; document.getElementById('chatFreqUnit').value = 'hour'; }

    document.getElementById('characterListView').style.display = 'none'; document.getElementById('characterFormView').style.display = 'block';
}

function deleteCharacter(charId) {
    if (!confirm('确定要删除这个角色吗？相关的推文也会被全部清理！')) return;
    myCharacters = myCharacters.filter(c => c.id != charId);
    globalPosts = globalPosts.filter(p => p.char.id != charId);
    groupChats.forEach(g => { g.members = g.members.filter(m => m != charId); });
    groupChats = groupChats.filter(g => g.members.length >= 2);
    charRelationships = charRelationships.filter(r => r.fromId != charId && r.toId != charId); // 同步清理关系网中的连线
    saveAllData(); renderCenterCharList(); renderPosts();
    if (currentProfileId == charId && document.getElementById('view-profile').style.display !== 'none') switchMainView('home');
    if (currentChatSessionId == charId && document.getElementById('view-chat').style.display !== 'none') switchChatSession(myCharacters.length > 0 ? myCharacters[0].id : null);
}

async function saveCharacter() {
    let name = document.getElementById('charName').value; let handle = document.getElementById('charHandle').value; let persona = document.getElementById('charPersona').value;
    if (!name || !handle || !persona) return alert('角色名字、ID和人设为必填项！');
    if (!handle.startsWith('@')) handle = '@' + handle;
    
    const btn = document.getElementById('saveCharBtn'); btn.innerText = "保存中..."; btn.disabled = true;

    let selectedWbs = Array.from(document.querySelectorAll('.wb-check:checked')).map(cb => parseInt(cb.value));

    let freqInterval = parseInt(document.getElementById('freqInterval').value) || 1;
    let freqUnit = document.getElementById('freqUnit').value;
    let freqCount = parseInt(document.getElementById('freqCount').value) || 1;
    let chatFreqInterval = parseInt(document.getElementById('chatFreqInterval').value) || 0;
    let chatFreqUnit = document.getElementById('chatFreqUnit').value;

    if (editingCharId) {
        let char = myCharacters.find(c => c.id == editingCharId);
        if (char) {
            char.name = name; char.handle = handle; char.persona = persona;
            char.bio = document.getElementById('charBio').value; char.followers = document.getElementById('charFollowers').value || char.followers;
            char.following = document.getElementById('charFollowing').value || char.following; char.location = document.getElementById('charLocation').value;
            char.website = document.getElementById('charWebsite').value; char.birthdate = document.getElementById('charBirthdate').value;
            char.verified = document.getElementById('charVerified').checked; char.group = document.getElementById('charGroup').value;
            
            if (tempCropResults.charAvatar) char.avatarImg = tempCropResults.charAvatar;
            if (tempCropResults.charBg) char.bgImg = tempCropResults.charBg;

            char.postFreq = { interval: freqInterval, unit: freqUnit, count: freqCount };
            char.chatFreq = { interval: chatFreqInterval, unit: chatFreqUnit };
            char.autoReplyText = document.getElementById('charAutoReply').value;
            char.busyAutoReplyText = document.getElementById('charBusyAutoReply').value;
            char.anonName = document.getElementById('charAnonName').value || '匿名者';
            char.anonId = document.getElementById('charAnonId').value || Math.random().toString(36).substr(2,6).toUpperCase();
            char.nudgeText = document.getElementById('charNudgeText').value;
            char.firstMessage = document.getElementById('charFirstMessage')?.value.trim() || '';
            if (pendingImportedGreetings) { char.alternateGreetings = pendingImportedGreetings; pendingImportedGreetings = null; }
            char.worldbooks = selectedWbs;

            globalPosts.forEach(p => { if (p.char.id == char.id) { Object.assign(p.char, char); } p.replies.forEach(r => { if (r.char.id == char.id) { Object.assign(r.char, char); } }); });
        }
    } else {
        let newId = Date.now();
        let newChar = {
            id: newId, name: name, handle: handle, persona: persona, bio: document.getElementById('charBio').value,
            followers: document.getElementById('charFollowers').value || "1万", following: document.getElementById('charFollowing').value || "100",
            location: document.getElementById('charLocation').value, website: document.getElementById('charWebsite').value, birthdate: document.getElementById('charBirthdate').value,
            isFollowing: true, isSpecialFollow: false, verified: document.getElementById('charVerified').checked, avatarEmoji: name[0] || 'A', themeColor: "#1d9bf0",
            avatarImg: tempCropResults.charAvatar || null, bgImg: tempCropResults.charBg || null,
            group: document.getElementById('charGroup').value,
            postFreq: { interval: freqInterval, unit: freqUnit, count: freqCount }, lastPostTime: Date.now(),
            chatFreq: { interval: chatFreqInterval, unit: chatFreqUnit }, lastChatProactiveTime: Date.now(), autoReplyText: document.getElementById('charAutoReply').value, busyAutoReplyText: document.getElementById('charBusyAutoReply').value,
            memorySummary: "", chatSummary: "", diaryData: { letters: [], diaries: [] },
            anonName: document.getElementById('charAnonName').value || '匿名者', anonId: document.getElementById('charAnonId').value || Math.random().toString(36).substr(2,6).toUpperCase(), nudgeText: document.getElementById('charNudgeText').value,
            firstMessage: document.getElementById('charFirstMessage')?.value.trim() || '',
            alternateGreetings: pendingImportedGreetings || [],
            worldbooks: selectedWbs, postCount: 0
        };
        pendingImportedGreetings = null;
        myCharacters.push(newChar);
    }

    saveAllData(); 
    if (document.getElementById('view-home').style.display !== 'none') renderPosts(); 
    btn.innerText = "保存并生成角色"; btn.disabled = false;
    showRoleList(); renderDiaryCharList();
    updateCharSelects();
}


// ================= NPC 小报及修罗场核心逻辑 =================
let tabloidPosts = []; 

function renderTabloidCharPicker() {
    const picker = document.getElementById('tabloidCharPicker');
    const allChars = [currentUser, ...myCharacters];
    if (allChars.length === 0) {
        picker.innerHTML = '<span style="color:#888;">暂无角色，请先创建角色！</span>';
        return;
    }
    picker.innerHTML = allChars.map(c => `
        <label style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.8); padding:5px 10px; border-radius:9999px; border:1px solid #1d9bf0; cursor:pointer;">
            <input type="checkbox" class="tabloid-char-check" value="${c.id}">
            ${getAvatarHTML(c, 24)} ${c.name}
        </label>
    `).join('');
    renderTabloidPosts();
}

async function generateTabloidPost() {
    const api = getApiConfig(true);
    if(!api.key) return alert("请先在设置中配置 API Key！");
    const selectedIds = Array.from(document.querySelectorAll('.tabloid-char-check:checked')).map(cb => cb.value);
    if (selectedIds.length === 0) return alert("请至少选择一个角色！");

    const selectedChars = selectedIds.map(id => id === 'me' ? currentUser : myCharacters.find(c => c.id == id));
    const isShura = document.getElementById('shuraCheck').checked;
    const customWordCount = document.getElementById('tabloidWordCount').value || 150;
    const customLikes = document.getElementById('tabloidCustomLikes').value;
    const customComments = document.getElementById('tabloidCustomComments').value;
    const customTopic = document.getElementById('tabloidCustomTopic').value.trim();
    const btn = document.getElementById('btnGenTabloid');
    
    btn.innerText = "营销号正在疯狂编造... ⏳"; btn.disabled = true;

    let charPersonas = selectedChars.map(c => `${c.name}(人设：${c.persona})`).join('；');
    
    // 修复: 优化提示词，防止大模型胡言乱语
    let prompt = `你是一个唯恐天下不乱的娱乐营销号。请根据以下角色生成一条爆料推文：${charPersonas}。
${customTopic ? `要求一定要包含这个主题或情节：${customTopic}。` : ''}
${isShura ? "强制开启修罗场模式：狠狠制造多角恋、矛盾与抓马冲突。" : "语气必须极其夸张、震惊体，充满吃瓜感。"}
目标字数：${customWordCount}字左右。
【重要要求】：请直接输出爆料的推文正文，千万不要加上前缀说明、不要使用任何引号包裹，不要输出任何与爆料无关的内容。`;

    try {
        let data = await callChatCompletionAPI(api, prompt);
        let text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
            let post = { id: 'tb_' + Date.now(), char: { ...tabloidAccount }, text: text, timestamp: Date.now(), replies: [], stats: { likes: customLikes !== '' ? parseInt(customLikes) : Math.floor(Math.random()*10000)+1000, comments: customComments !== '' ? parseInt(customComments) : 0 } };
            tabloidPosts.unshift(post);
            renderTabloidPosts(); saveAllData();
            showToast(`<div class="avatar" style="background:#1d9bf0;color:white;font-size:20px;">📰</div>`, `新的八卦爆料！`, text, post.id, null);
            generateNpcCommentsForTabloid(post.id, isShura);
            selectedChars.filter(c => c && c.id !== 'me').forEach(c => triggerRelatedCharacterReactions(c, text, { type: 'tabloid', id: post.id }));
        }
    } catch(e) { alert("生成失败: " + e.message); } finally { btn.innerText = "✨ AI 智能爆料"; btn.disabled = false; }
}

function manualTabloidPost() {
    const text = document.getElementById('tabloidCustomTopic').value.trim();
    if(!text) return alert("请先填写爆料内容！");
    const customLikes = document.getElementById('tabloidCustomLikes').value;
    const customComments = document.getElementById('tabloidCustomComments').value;

    let post = { id: 'tb_' + Date.now(), char: { ...tabloidAccount }, text: text, timestamp: Date.now(), replies: [], stats: { likes: customLikes !== '' ? parseInt(customLikes) : 100, comments: customComments !== '' ? parseInt(customComments) : 0 } };
    tabloidPosts.unshift(post);
    document.getElementById('tabloidCustomTopic').value = ''; renderTabloidPosts(); saveAllData();
}


async function rollTabloidAIParticipation(postId, contextText, contextName) {
    if (Math.random() >= 0.5) return;
    const post = tabloidPosts.find(p => p.id === postId); if (!post) return;
    const api = getApiConfig(true); if (!api.key) return;
    const actionStrictRule = allowActionTags ? "" : "不要有任何动作、神态或心理描写，不要用括号()或【】，只输出你要说的话。";
    const prompt = `你是娱乐营销号"${tabloidAccount.name}"，人设：${tabloidAccount.persona}。你发布的爆料下，"${contextName}"刚刚评论道："${contextText}"。请你以营销号的口吻（吃瓜、拱火、玩梗）追加一条简短评论，不超过40字。直接输出内容，不要加引号。${actionStrictRule}`;
    try {
        const data = await sendChatRequest(api, prompt);
        const repText = data.choices?.[0]?.message?.content?.trim();
        if (repText) {
            post.replies.push({ charId: 'tabloid_admin', name: tabloidAccount.name, text: repText, timestamp: Date.now() });
            post.stats.comments++;
            if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
            if (document.getElementById('view-tabloid').style.display !== 'none') renderTabloidPosts();
            saveAllData();
        }
    } catch (e) {}
}

function generateAutoNpcReaction(postId, triggerName, triggerText, triggerId) {
    spawnNpcComments(postId, true, { triggerName, triggerText, triggerId });
}

function generateNpcCommentsForTabloid(postId, isShura) {
    spawnNpcComments(postId, true, { isShura });
}

function renderTabloidPosts() {
    const container = document.getElementById('tabloidFeedSection');
    if (tabloidPosts.length === 0) { container.innerHTML = '<div class="empty-state">目前还没有爆料。</div>'; return; }
    container.innerHTML = tabloidPosts.map(post => `
        <div class="post-placeholder" style="cursor:pointer;" onclick="switchMainView('postDetail', '${post.id}')">
            <div style="flex-shrink:0;">${getAvatarHTML(post.char, 40)}</div>
            <div class="post-content">
                <div class="post-header">
                    <div class="post-header-info"><div class="post-name">${post.char.name}</div><div class="post-handle">@tabloid_news</div></div>
                    <span style="background:#1d9bf0; color:white; font-size:10px; padding:2px 6px; border-radius:4px;">小报爆料</span>
                </div>
                <div class="post-body">${formatPostText(post.text)}</div>
                <div class="post-footer"><div class="post-stats-group" style="gap:40px;"><div>${commentSVG} ${post.stats.comments}</div><div class="like-stat-item" style="cursor:pointer; color:${post.userLiked ? '#f91880' : 'inherit'}; display:flex; align-items:center; gap:4px;" onclick="event.stopPropagation(); toggleMainPostLike('${post.id}', event)"><span class="like-icon-wrap">${post.userLiked ? likeSVGFilled.replace(/#1d9bf0/g, '#f91880').replace('blue-line-icon', '') : likeSVG}</span> <span class="like-count">${post.stats.likes}</span></div></div></div>
            </div>
        </div>`).join('');
}

function openTabloidProfileModal() {
    document.getElementById('tbName').value = tabloidAccount.name || ''; document.getElementById('tbHandle').value = tabloidAccount.handle || '';
    document.getElementById('tbPersona').value = tabloidAccount.persona || ''; document.getElementById('tbBio').value = tabloidAccount.bio || '';
    
    if (tabloidAccount.avatarImg) { document.getElementById('tbAvatarPreview').src = tabloidAccount.avatarImg; document.getElementById('tbAvatarPreview').style.display = 'block'; } else { document.getElementById('tbAvatarPreview').style.display = 'none'; }
    if (tabloidAccount.bgImg) { document.getElementById('tbBgPreview').src = tabloidAccount.bgImg; document.getElementById('tbBgPreview').style.display = 'block'; } else { document.getElementById('tbBgPreview').style.display = 'none'; }
    
    tempCropResults.tbAvatar = tabloidAccount.avatarImg || null;
    tempCropResults.tbBg = tabloidAccount.bgImg || null;

    openModal('tabloidProfileModal');
}

async function saveTabloidProfile() {
    tabloidAccount.name = document.getElementById('tbName').value.trim() || tabloidAccount.name;
    tabloidAccount.handle = document.getElementById('tbHandle').value.trim();
    tabloidAccount.persona = document.getElementById('tbPersona').value.trim();
    tabloidAccount.bio = document.getElementById('tbBio').value.trim();
    
    if (tempCropResults.tbAvatar) tabloidAccount.avatarImg = tempCropResults.tbAvatar;
    if (tempCropResults.tbBg) tabloidAccount.bgImg = tempCropResults.tbBg;

    saveAllData(); closeModal('tabloidProfileModal'); alert("保存成功！");
}
function getActionIconsHTML(likes, isLiked, replyIdx, postId, isSubReply, isFavorited) {
    const iconStyle = `width:${isSubReply ? 16 : 18.75}px; height:${isSubReply ? 16 : 18.75}px; fill:currentColor;`;
    const itemStyle = 'display:flex; align-items:center; gap:6px; cursor:pointer; color:#536471; font-size:13px; transition:0.2s; user-select:none;';
    const likeColor = isLiked ? '#f91880' : 'inherit';
    const favColor = isFavorited ? '#ffad1f' : 'inherit';
    const currentLikeSVG = isLiked ? likeSVGFilled.replace(/#1d9bf0/g, '#f91880') : likeSVG;
    const favorSVG = isFavorited ? '<svg style="width:18.75px; height:18.75px; fill:#ffad1f;" viewBox="0 0 24 24"><polygon points="12 2 15.09 10.26 23.77 11.25 17.88 17.15 19.54 25.88 12 21.77 4.46 25.88 6.12 17.15 0.23 11.25 8.91 10.26 12 2"/></svg>' : '<svg style="width:18.75px; height:18.75px; fill:none; stroke:currentColor; stroke-width:1.5;" viewBox="0 0 24 24"><polygon points="12 2 15.09 10.26 23.77 11.25 17.88 17.15 19.54 25.88 12 21.77 4.46 25.88 6.12 17.15 0.23 11.25 8.91 10.26 12 2"/></svg>';

    return `
        <div style="display:flex; justify-content:flex-start; max-width:425px; margin-top:8px; gap:32px;">
            <div style="${itemStyle}" onclick="event.stopPropagation(); toggleInlineReply(${replyIdx}, '${postId}')" onmouseover="this.style.color='#1d9bf0'" onmouseout="this.style.color='#536471'">
                ${commentSVG}
                <span>回复</span>
            </div>
            <div style="${itemStyle}; color: ${likeColor};" onclick="event.stopPropagation(); likeReply(${replyIdx}, '${postId}', event)" onmouseover="this.style.color='#f91880'" onmouseout="this.style.color='${likeColor}'">
                ${currentLikeSVG}
                <span class="reply-like-count">${likes || 0}</span>
            </div>
            <div style="${itemStyle}; color: ${favColor};" onclick="event.stopPropagation(); favoriteReply(${replyIdx}, '${postId}', event)" onmouseover="this.style.color='#ffad1f'" onmouseout="this.style.color='${favColor}'">
                ${favorSVG}
            </div>
        </div>
    `;
}

// ===== 新增：详情页专用的点赞和删除功能 =====
function toggleDetailLike(postId) {
    let isTabloid = postId.startsWith('tb_');
    let post = isTabloid ? tabloidPosts.find(p => p.id === postId) : globalPosts.find(p => p.id == postId);
    if (!post) return;
    
    // 切换点赞状态，并更新点赞数
    post.userLiked = !post.userLiked;
    post.stats.likes = Math.max(0, parseStat(post.stats.likes) + (post.userLiked ? 1 : -1));
    
    saveAllData(); // 保存数据
    renderSinglePostDetail(postId); // 重新渲染页面，刷新红心状态和数字
}

function deleteDetailPost(postId) {
    if (!confirm('确定要彻底删除这条推文吗？该操作不可逆！')) return;
    
    let isTabloid = postId.startsWith('tb_');
    if (isTabloid) {
        tabloidPosts = tabloidPosts.filter(p => p.id != postId);
    } else {
        globalPosts = globalPosts.filter(p => p.id != postId);
    }
    
    saveAllData(); // 保存数据
    switchMainView('home'); // 删除后自动弹回主页
    if (typeof renderPosts === 'function') renderPosts(); // 刷新主页列表
}
function likeReply(replyIdx, postId, event) {
    if (event) event.stopPropagation();

    let isTabloid = postId.startsWith('tb_');
    let post = isTabloid ? tabloidPosts.find(p => p.id === postId) : globalPosts.find(p => p.id == postId);

    if (post && post.replies && post.replies[replyIdx]) {
        let reply = post.replies[replyIdx];
        if (!reply.likedBy) reply.likedBy = [];

        let hasLiked = reply.likedBy.includes('me');
        if (hasLiked) {
            reply.liked = false;
            reply.likedBy = reply.likedBy.filter(id => id !== 'me');
            reply.likes = Math.max(0, (reply.likes || 1) - 1);
        } else {
            reply.liked = true;
            if (!reply.likedBy.includes('me')) reply.likedBy.push('me');
            reply.likes = (reply.likes || 0) + 1;
        }

        saveAllData();
        if (document.getElementById('view-post-detail').style.display !== 'none') {
            renderSinglePostDetail(postId);
        }
    }
}

function favoriteReply(replyIdx, postId, event) {
    if (event) event.stopPropagation();

    let isTabloid = postId.startsWith('tb_');
    let post = isTabloid ? tabloidPosts.find(p => p.id === postId) : globalPosts.find(p => p.id == postId);

    if (post && post.replies && post.replies[replyIdx]) {
        let reply = post.replies[replyIdx];
        reply.favorited = !reply.favorited;

        saveAllData();
        if (document.getElementById('view-post-detail').style.display !== 'none') {
            renderSinglePostDetail(postId);
        }
    }
}
// ==========================================
// 核心引擎：故事与论坛双模式切换及渲染 (终极完整版)
// ==========================================

// 1. 防冲突变量声明
var currentNovelTab = 'novel';
var forumThreads = typeof forumThreads !== 'undefined' ? forumThreads : []; 
var currentForumFilter = 'all'; 
var currentQuoteFloor = null;

// 2. 辅助功能：劫持顶部标题栏返回键，实现层级后退
function initNovelHeader() {
    const novelHeader = document.querySelector('#view-novel .header-title');
    if (novelHeader && !novelHeader.dataset.bound) {
        novelHeader.innerHTML = `<div class="back-btn" onclick="handleGlobalNovelBack()">←</div> 我们的故事`;
        novelHeader.dataset.bound = "true";
    }
}

function handleGlobalNovelBack() {
    if (document.getElementById('current-forum-wrap')) {
        // 如果在论坛详情页 -> 返回论坛列表
        renderForumList();
    } else if (document.getElementById('novelEditorWrapper') && document.getElementById('novelEditorWrapper').style.display !== 'none') {
        // 如果在故事编辑页 -> 返回故事列表
        closeNovelEditor();
    } else if (document.getElementById('novelReaderWrapper') && document.getElementById('novelReaderWrapper').style.display !== 'none') {
        // 如果在沉浸阅读页 -> 返回故事编辑页
        closeNovelReader();
    } else {
        // 如果在列表页 -> 返回首页
        switchMainView('home');
    }
}

// 3. 辅助功能：论坛真实头像获取器
function getForumAvatar(authorName) {
    if (authorName === currentUser.name || authorName === '楼主') return getAvatarHTML(currentUser, 36);
    let char = myCharacters.find(c => c.name === authorName);
    if (char) return getAvatarHTML(char, 36);
    return getAvatarHTML({name: authorName, avatarEmoji: '👤', themeColor: '#536471'}, 36);
}

// 4. 动态插入顶部 Tab 标签
function initNovelTabsIfNeeded() {
    initNovelHeader(); // 绑定返回键
    const viewNovel = document.getElementById('view-novel');
    if (!document.getElementById('novelTabContainer')) {
        const tabsHTML = `
        <div id="novelTabContainer" class="novel-top-tabs">
            <div id="tab-novel" class="novel-tab active" onclick="switchNovelTab('novel')">故事</div>
            <div id="tab-forum" class="novel-tab" onclick="switchNovelTab('forum')">论坛</div>
        </div>
        <div id="novelForumWrapper" style="display:none;"></div>`;
        
        // 确保标签栏紧紧贴在标题栏的正下方
        const header = viewNovel.querySelector('.header-title');
        if (header) {
            header.insertAdjacentHTML('afterend', tabsHTML);
        } else {
            viewNovel.insertAdjacentHTML('afterbegin', tabsHTML);
        }
    }
}

// 5. 标签切换逻辑
function switchNovelTab(tab) {
    currentNovelTab = tab;
    document.getElementById('tab-novel').className = tab === 'novel' ? 'novel-tab active' : 'novel-tab';
    document.getElementById('tab-forum').className = tab === 'forum' ? 'novel-tab active' : 'novel-tab';
    
    if (tab === 'novel') {
        document.getElementById('novelForumWrapper').style.display = 'none';
        if (typeof currentEditingNovelId !== 'undefined' && currentEditingNovelId && document.getElementById('novelEditorWrapper') && document.getElementById('novelEditorWrapper').style.display !== 'none') {
            // 保持编辑器开启
        } else if (document.getElementById('novelReaderWrapper') && document.getElementById('novelReaderWrapper').style.display !== 'none') {
            // 保持阅读器开启
        } else {
            renderNovelListBase();
        }
    } else {
        if(document.getElementById('novelListWrapper')) document.getElementById('novelListWrapper').style.display = 'none';
        if(document.getElementById('novelEditorWrapper')) document.getElementById('novelEditorWrapper').style.display = 'none';
        if(document.getElementById('novelReaderWrapper')) document.getElementById('novelReaderWrapper').style.display = 'none';
        
        document.getElementById('novelForumWrapper').style.display = 'block';
        renderForumList();
    }
}

// 6. 重写原先的入口函数
function renderNovelList() {
    initNovelTabsIfNeeded();
    switchNovelTab('novel');
}

function renderNovelListBase() {
    document.getElementById('novelListWrapper').style.display = 'block';
    if(document.getElementById('novelEditorWrapper')) document.getElementById('novelEditorWrapper').style.display = 'none';
    if(document.getElementById('novelReaderWrapper')) document.getElementById('novelReaderWrapper').style.display = 'none';
    
    const container = document.getElementById('novelCardsContainer');
    if (typeof globalNovels === 'undefined' || globalNovels.length === 0) {
        container.innerHTML = '<div class="empty-state" style="width:100%;">还未开启我们的旅程</div>'; return;
    }
    container.innerHTML = globalNovels.map(n => {
        let outlinePrev = n.outline ? n.outline.substring(0, 55) + '...' : '暂无大纲';
        return `
        <div class="diary-card novel-card" onclick="openNovelDetail('${n.id}')" oncontextmenu="showNovelContextMenu(event, '${n.id}')">
            <div class="diary-card-title" style="font-size:18px;">${n.title || '未命名故事'}</div>
            <div class="diary-card-date" style="color:#f91880; font-weight:bold;">已写 ${n.chapters ? n.chapters.length : 0} 章</div>
            <div class="diary-card-excerpt" style="color:#536471;">${outlinePrev}</div>
        </div>`;
    }).join('');
}

// 7. 渲染论坛帖子列表
function renderForumList() {
    let wrapper = document.getElementById('novelForumWrapper');
    let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 16px; background:#f7f9f9; border-bottom:1px solid #eff3f4;">
        <span style="font-size:14px; font-weight:bold; color:#536471;">热点讨论</span>
        <button onclick="openCreateForumModal()" style="padding:6px 16px; background:#1d9bf0; color:white; border:none; border-radius:9999px; cursor:pointer; font-size:14px; font-weight:bold;">发布新帖</button>
    </div>`;

    if (forumThreads.length === 0) {
        html += '<div class="empty-state">当前没有任何帖子，快来抢首杀吧！</div>';
    } else {
        forumThreads.forEach(thread => {
            let authorName = thread.author || '楼主';
            let avatarHtml = getForumAvatar(authorName);
            let replyCount = thread.replies ? thread.replies.length : 0;
            let totalLikes = (thread.likes || 0) + (thread.replies ? thread.replies.reduce((sum, r) => sum + (r.likes || 0), 0) : 0);
            let timeStr = timeAgo(thread.timestamp || Date.now());

            html += `
            <div class="forum-card-v2" onclick="openForumThread('${thread.id}')">
                <div class="forum-card-header">
                    ${avatarHtml}
                    <span class="forum-card-author">${authorName}</span>
                    <span class="forum-card-time">${timeStr}</span>
                </div>
                <div class="forum-card-title">${thread.title}</div>
                <div class="forum-card-preview">${thread.content}</div>
                <div class="forum-card-footer">
                    <div class="forum-card-icon">👍 ${totalLikes}</div>
                    <div class="forum-card-icon">💬 ${replyCount}</div>
                </div>
            </div>`;
        });
    }
    wrapper.innerHTML = html;
}

// 8. 渲染帖子详情页
function openForumThread(threadId) {
    let thread = forumThreads.find(t => t.id === threadId);
    if (!thread) return;

    let wrapper = document.getElementById('novelForumWrapper');
    let repliesToShow = thread.replies || [];
    
    if (currentForumFilter === 'op') repliesToShow = repliesToShow.filter(r => r.isOp);
    else if (currentForumFilter === 'hot') repliesToShow = [...repliesToShow].sort((a, b) => b.likes - a.likes);

    let allFloors = [];
    if (currentForumFilter !== 'hot') {
        allFloors.push({ floor: 1, author: thread.author || '楼主', isOp: true, content: thread.content, likes: thread.likes || 0, timestamp: thread.timestamp || Date.now(), isMainPost: true });
    }
    allFloors = allFloors.concat(repliesToShow);

    let html = `
    <div style="background:rgba(255,255,255,0.95); backdrop-filter:blur(12px); border-bottom:1px solid #eff3f4; padding:10px 16px; position:sticky; top:96px; z-index:40; display:flex; justify-content:flex-end;">
        <div style="display:flex; gap:6px;">
            <button style="padding:4px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px; cursor:pointer; background:${currentForumFilter==='all'?'#1d9bf0':'white'}; color:${currentForumFilter==='all'?'white':'#333'};" onclick="setForumFilter('${threadId}', 'all')">全部</button>
            <button style="padding:4px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px; cursor:pointer; background:${currentForumFilter==='op'?'#1d9bf0':'white'}; color:${currentForumFilter==='op'?'white':'#333'};" onclick="setForumFilter('${threadId}', 'op')">只看楼主</button>
            <button style="padding:4px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px; cursor:pointer; background:${currentForumFilter==='hot'?'#1d9bf0':'white'}; color:${currentForumFilter==='hot'?'white':'#333'};" onclick="setForumFilter('${threadId}', 'hot')">热评</button>
        </div>
    </div>
    
    <div class="forum-detail-v2" id="current-forum-wrap">
        <div class="forum-detail-title-box">
            <div class="forum-detail-title editable-text" data-type="title" style="cursor:text;" title="双击/长按修改">${thread.title}</div>
        </div>
    `;

    allFloors.forEach(r => {
        let opTag = r.isOp ? `<span class="forum-op-badge">楼主</span>` : '';
        let avatarHtml = getForumAvatar(r.author); 
        let timeStr = timeAgo(r.timestamp);
        
        let quoteHtml = '';
        if (r.quoteFloor) {
            let quoteTarget = thread.replies.find(x => x.floor === r.quoteFloor) || { author: thread.author || '楼主', content: thread.content };
            quoteHtml = `<div class="forum-quote-box"><span style="font-weight:bold; color:#0f1419;">${r.quoteFloor}楼 ${quoteTarget.author}：</span>${quoteTarget.content}</div>`;
        }

        html += `
        <div class="forum-floor" oncontextmenu="showForumReplyContextMenu(event, '${threadId}', ${r.floor})">
            <div class="forum-floor-header">
                <div class="forum-floor-userinfo">
                    ${avatarHtml}
                    <div>
                        <div class="forum-floor-name">${r.author} ${opTag}</div>
                        <div class="forum-floor-time">${timeStr}</div>
                    </div>
                </div>
                <div class="forum-floor-meta">#${r.floor}</div>
            </div>
            ${quoteHtml}
            <div class="forum-floor-content editable-text" data-floor="${r.floor}" style="cursor:text;">${r.content}</div>
            <div class="forum-floor-actions">
                <span onclick="likeForumReply('${threadId}', ${r.floor}, ${r.isMainPost})" style="cursor:pointer;">👍 ${r.likes || 0}</span>
                <span onclick="replyForumFloor('${threadId}', ${r.floor})" style="cursor:pointer;">💬 引用回复</span>
            </div>
        </div>`;
    });

    html += `
    <div class="forum-reply-box-wrapper">
        <input type="text" id="forumReplyInput" placeholder="发布回复 (@角色名 可召唤回复)..." style="flex:1; padding:10px 16px; border:1px solid #cfd9de; border-radius:9999px; outline:none; font-size:15px; background:#f7f9f9;">
        <button onclick="submitForumReply('${threadId}')" style="background:#1d9bf0; color:white; border:none; padding:8px 20px; border-radius:9999px; margin-left:12px; font-weight:bold; font-size:15px; cursor:pointer;">发送</button>
    </div>
    </div>`;

    wrapper.innerHTML = html;
    window.scrollTo(0, 0); 
    bindEditableEvents(threadId);
}

function setForumFilter(threadId, type) { currentForumFilter = type; openForumThread(threadId); }

function bindEditableEvents(threadId) {
    const els = document.querySelectorAll('#novelForumWrapper .editable-text');
    els.forEach(el => {
        let pressTimer;
        el.addEventListener('touchstart', (e) => { pressTimer = setTimeout(() => triggerEdit(el, threadId), 800); });
        el.addEventListener('touchend', () => clearTimeout(pressTimer));
        el.addEventListener('touchmove', () => clearTimeout(pressTimer));
        el.addEventListener('dblclick', (e) => { e.stopPropagation(); triggerEdit(el, threadId); });
    });
}

function triggerEdit(el, threadId) {
    let oldText = el.innerText;
    let newText = prompt("修改内容：", oldText);
    if (newText !== null && newText !== oldText && newText.trim() !== '') {
        let thread = forumThreads.find(t => t.id === threadId);
        let type = el.getAttribute('data-type');
        let floor = parseInt(el.getAttribute('data-floor'));
        
        if (type === 'title') thread.title = newText;
        else if (floor === 1) thread.content = newText;
        else {
            let reply = thread.replies.find(r => r.floor === floor);
            if (reply) reply.content = newText;
        }
        saveAllData(); openForumThread(threadId);
    }
}


// 9. 用户回复与 AI 推演逻辑 (@角色回复核心)
async function submitForumReply(threadId) {
    const input = document.getElementById('forumReplyInput');
    const text = input.value.trim();
    if(!text) return;

    let thread = forumThreads.find(t => t.id === threadId);
    let nextFloor = thread.replies.length > 0 ? thread.replies[thread.replies.length - 1].floor + 1 : 2;

    thread.replies.push({ floor: nextFloor, author: currentUser.name || '楼主', isOp: true, content: text, quoteFloor: currentQuoteFloor, likes: 0, timestamp: Date.now() });

    input.value = ''; currentQuoteFloor = null; input.placeholder = "发布回复 (@角色名 可召唤回复)...";
    saveAllData(); openForumThread(threadId);

    const btn = input.nextElementSibling;
    let oldTxt = btn.innerText; btn.innerText = "生成中..."; btn.disabled = true;

    // 强化艾特检测
    let mentionedChars = myCharacters.filter(c => text.includes('@' + c.name) || text.includes('＠' + c.name));
    
    if (mentionedChars.length > 0) {
        let lastRepText = text;
        for (let char of mentionedChars) {
            // 让角色进行回复，并记录角色回复的文本
            lastRepText = await triggerForumCharReply(thread, char, text) || lastRepText;
        }
        // 🎯 核心修改：角色回复完毕后，继续召唤路人NPC对角色的发言跟帖推进！
        await generateNpcForumReplies(thread, nextFloor, lastRepText);
    } else {
        // 没有艾特角色时，直接触发路人NPC跟帖
        await generateNpcForumReplies(thread, nextFloor, text);
    }

    btn.innerText = oldTxt; btn.disabled = false;
}

// ==========================================
// 11. 论坛专属新消息弹窗提醒器 (居中滑下、支持点击跳转)
// ==========================================
function showForumToast(title, content, avatarHtml, threadId) {
    // 使用专属的容器，避免与原先推特风格右上角弹窗冲突
    let container = document.getElementById('forumToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'forumToastContainer';
        document.body.appendChild(container);
    }
    
    // 强制位于页面顶部水平居中
    container.style.position = 'fixed';
    container.style.top = '65px'; 
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '999999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center'; // 内部卡片居中
    container.style.pointerEvents = 'none';

    let toast = document.createElement('div');
    toast.style.cssText = `
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
        border-left: 4px solid #1d9bf0;
        border-radius: 8px;
        padding: 14px 18px;
        margin-bottom: 12px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.12);
        display: flex;
        gap: 12px;
        align-items: center;
        width: calc(100vw - 32px); /* 手机端自适应占满屏 */
        max-width: 680px; /* 电脑端和详情页主流宽度一致 */
        transform: translateY(-150%); /* 动画初始位置：从上方视口外 */
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        pointer-events: auto;
        box-sizing: border-box;
        cursor: ${threadId ? 'pointer' : 'default'};
    `;
    
    // 核心跳转逻辑：如果传入了 threadId，点击则直接跳转并打开帖子
    if (threadId) {
        toast.onclick = () => {
            switchMainView('novel'); // 强制跳转到大板块
            switchNovelTab('forum'); // 切到论坛 Tab
            openForumThread(threadId); // 渲染详情页
            
            // 点击后立即消失
            toast.style.transform = 'translateY(-150%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        };
    }

    let avatarPart = '';
    if (avatarHtml) {
        if (avatarHtml.startsWith('<')) avatarPart = `<div style="flex-shrink:0;">${avatarHtml}</div>`;
        else avatarPart = `<div style="font-size:24px; flex-shrink:0;">${avatarHtml}</div>`;
    }

    toast.innerHTML = `
        ${avatarPart}
        <div style="flex:1; min-width:0;">
            <div style="font-size:15px; font-weight:bold; color:#0f1419; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</div>
            <div style="font-size:14px; color:#536471; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.4;">${content}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // 触发向下浮现动画 (translateY)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });
    });
    
    // 5秒后自动向上滑出并销毁
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.transform = 'translateY(-150%)';
            toast.style.opacity = '0';
            setTimeout(() => { if (toast.parentElement) toast.remove(); }, 400);
        }
    }, 5000);
}


// === 专属角色在论坛收到 @ 时的回复 ===
async function triggerForumCharReply(thread, char, userText) {
    const api = getApiConfig(true); 
    if (!api.key) { alert("⚠️ 请先在设置中配置 API Key！"); return null; }
    
    let recentReplies = thread.replies.slice(-5).map(r => `${r.floor}楼 [${r.author}]: ${r.content}`).join('\n');
    let prompt = `你是"${char.name}"，人设：${char.persona}。你正在逛中文论坛。
    【主帖标题】：《${thread.title}》
    【最近讨论】：\n${recentReplies}
    
    刚刚楼主(用户)艾特了你："${userText}"。
    请结合你的人设，直接输出你要回复的话（不超过100字，不要带引号，符合论坛互动语气）。警告：既然用户主动@了你，你【必须】立刻进行回复，绝对不能忽略或输出"NO"。`;

    try {
        let data = await callChatCompletionAPI(api, prompt);
        
        let repText = data.choices?.[0]?.message?.content?.trim();
        if (repText && !repText.toUpperCase().startsWith("NO")) {
            let nextFloor = thread.replies.length > 0 ? thread.replies[thread.replies.length - 1].floor + 1 : 2;
            thread.replies.push({
                floor: nextFloor, author: char.name, isOp: false, content: repText, quoteFloor: null, likes: 0, timestamp: Date.now()
            });
            saveAllData();
            if (document.getElementById('current-forum-wrap')) openForumThread(thread.id);
            
            // 🎯 触发弹窗并传入 thread.id 支持点击跳转
            showForumToast(`收到 ${char.name} 的回复`, repText, getForumAvatar(char.name), thread.id);
            triggerRelatedCharacterReactions(char, repText, { type: 'forum', thread: thread });
            return repText;
        }
    } catch(e) { 
        console.error("角色回复失败", e); 
    }
    return null;
}

// === AI 生成普通 NPC 论坛言论 ===
async function generateNpcForumReplies(thread, targetFloor, userText) {
    const api = getApiConfig(true); 
    if (!api.key) return;

    let recentReplies = thread.replies.slice(-6).map(r => `${r.floor}楼 [${r.author}]: ${r.content}`).join('\n');
    let wbContext = typeof globalWorldbook !== 'undefined' ? globalWorldbook : ''; 
    let txtContext = thread.txtContext ? `【附加参考背景】：${thread.txtContext.substring(0, 1500)}` : ''; 

    let prompt = `你现在是一个活跃在中文互联网论坛的资深吃瓜网友群体。请结合以下背景，生成 2 到 4 条路人网友跟帖。
    【背景设定】：${wbContext} ${txtContext}
    【主帖】标题：《${thread.title}》
    【最近跟帖】：\n${recentReplies}
    ${userText ? `【刚刚前排回复了】：${userText}` : ''}

    要求：
    1. 语气贴近真实论坛网民（使用吃瓜、离谱、楼主等口癖）。
    2. 可以引用之前的楼层（quoteFloor填数字，如不引用填null）。
    必须且只能返回纯 JSON 数组格式：
    [{"author": "网友ID", "content": "回复文本", "quoteFloor": null, "likes": 23}]`;

    try {
        let rawText = (await sendChatRequest(api, prompt)).choices?.[0]?.message?.content?.trim() || "[]";
        let startIndex = rawText.indexOf('['); let endIndex = rawText.lastIndexOf(']');
        if(startIndex !== -1 && endIndex !== -1) {
            let jsonArr = JSON.parse(rawText.substring(startIndex, endIndex + 1));
            
            let newRepliesCount = 0;
            jsonArr.forEach(npcReply => {
                let currentMaxFloor = thread.replies.length > 0 ? thread.replies[thread.replies.length - 1].floor : 1;
                thread.replies.push({
                    floor: currentMaxFloor + 1, author: npcReply.author || '热心网友',
                    isOp: false, content: npcReply.content || '...', quoteFloor: npcReply.quoteFloor || null,
                    likes: npcReply.likes || Math.floor(Math.random() * 50), timestamp: Date.now()
                });
                newRepliesCount++;
            });
            saveAllData(); 
            if (document.getElementById('current-forum-wrap')) openForumThread(thread.id);
            
            // 🎯 触发弹窗并传入 thread.id 支持点击跳转
            if (newRepliesCount > 0) {
                showForumToast('论坛新动态', `新增了 ${newRepliesCount} 条路人跟帖，快去看看吧！`, '💬', thread.id);
            }
        }
    } catch(e) {}
}


// 10. 发布新帖弹窗
function openCreateForumModal() {
    let modal = document.getElementById('createForumModal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'createForumModal';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
        <div class="modal-box" style="width: 550px;">
            <h2 style="color:#1d9bf0; margin-top:0;">📝 发布新帖</h2>
            <div class="input-group full-width">
                <label>帖子标题</label>
                <input type="text" id="newForumTitle" placeholder="输入吸引人的标题...">
            </div>
            <div class="input-group full-width">
                <label>首楼正文</label>
                <textarea id="newForumContent" rows="4" placeholder="说点什么吧..."></textarea>
            </div>
            <div class="input-group full-width">
                <label>📖 故事大纲 / 剧本设定 (选填)</label>
                <textarea id="newForumOutline" rows="2" placeholder="AI将根据此大纲推进后续NPC回帖走向..."></textarea>
            </div>
            <div class="input-group full-width">
                <label>📥 导入 TXT 作为背景参考 (选填)</label>
                <input type="file" id="newForumTxt" accept="*/*" style="display:block; padding:8px 0; font-size: 13px;">
            </div>
            <div class="input-group full-width">
                <label>🎭 重点关注角色 (选填)</label>
                <div class="form-hint" style="margin-bottom:8px;">选中的角色将有极高概率在下方回复中露面与你互动。</div>
                <div id="newForumChars" style="display:flex; gap:10px; flex-wrap:wrap; border:1px solid #1d9bf0; padding:10px; border-radius:8px; max-height:120px; overflow-y:auto;"></div>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-primary" style="margin-top:0;" onclick="submitCreateForumModal(event)">发布帖子</button>
                <button class="btn-cancel" style="margin-top:0;" onclick="closeModal('createForumModal')">取消</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
    }
    
    const charBox = document.getElementById('newForumChars');
    if (typeof myCharacters !== 'undefined') {
        charBox.innerHTML = myCharacters.map(c => `
            <label style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.8); padding:5px 10px; border-radius:9999px; border:1px solid #1d9bf0; cursor:pointer;">
                <input type="checkbox" class="forum-char-check" value="${c.id}">
                ${getAvatarHTML(c, 24)} ${c.name}
            </label>`).join('');
    }
        
    document.getElementById('newForumTitle').value = '';
    document.getElementById('newForumContent').value = '';
    document.getElementById('newForumOutline').value = '';
    document.getElementById('newForumTxt').value = '';
    
    document.getElementById('createForumModal').style.display = 'flex';
}

async function submitCreateForumModal(event) {
    let title = document.getElementById('newForumTitle').value.trim();
    let content = document.getElementById('newForumContent').value.trim();
    let outline = document.getElementById('newForumOutline').value.trim();
    let fileInput = document.getElementById('newForumTxt');
    
    if(!title || !content) return alert("标题和正文为必填项！");
    
    let btn = event.target;
    btn.innerText = "处理中..."; btn.disabled = true;
    
    let txtContext = "";
    if (fileInput.files.length > 0) {
        txtContext = await new Promise(resolve => {
            let reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsText(fileInput.files[0]);
        });
    }
    
    let selectedCharNames = Array.from(document.querySelectorAll('.forum-char-check:checked')).map(cb => {
        let c = myCharacters.find(x => x.id == cb.value);
        return c ? c.name : '';
    }).filter(Boolean);
    
    let finalContext = outline ? `【故事大纲】：${outline}\n` : '';
    finalContext += txtContext ? `【附加TXT背景】：${txtContext.substring(0, 2000)}\n` : '';
    finalContext += selectedCharNames.length > 0 ? `【优先发言角色】：必须安排 ${selectedCharNames.join('、')} 参与回复讨论。\n` : '';
    
    let newThread = {
        id: 'ft_' + Date.now(), title: title, content: content,
        author: currentUser.name || '楼主', txtContext: finalContext, replies: [],
        timestamp: Date.now(), likes: 0 
    };
    
    if(typeof forumThreads === 'undefined') forumThreads = [];
    forumThreads.unshift(newThread);
    saveAllData(); 
    
    document.getElementById('createForumModal').style.display = 'none';
    btn.innerText = "发布帖子"; btn.disabled = false;
    
    renderForumList();
    setTimeout(() => { generateNpcForumReplies(newThread, 1, ""); }, 500);
}

function likeForumReply(threadId, floor, isMainPost = false) {
    let thread = forumThreads.find(t => t.id === threadId);
    if(isMainPost) thread.likes = (thread.likes || 0) + 1;
    else {
        let reply = thread.replies.find(r => r.floor === floor);
        if(reply) reply.likes = (reply.likes || 0) + 1;
    }
    saveAllData(); openForumThread(threadId);
}
// ==========================================
// 11. 论坛专属新消息弹窗提醒器
// ==========================================

// ==========================================
// 世界书：TXT / JSON 自动导入逻辑（不再调用AI，读到什么就直接添加）
// ==========================================

async function handleWbFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const btn = document.getElementById('btnWbImport');
    const originalText = btn.innerText;
    btn.innerText = "读取文件中... ⏳";
    btn.disabled = true;

    const ext = file.name.split('.').pop().toLowerCase();

    try {
        if (ext === 'json') {
            const rawText = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(e);
                reader.readAsText(file, 'UTF-8');
            });

            let parsed;
            try { parsed = JSON.parse(rawText); } catch (e) { throw new Error("不是合法的 JSON 文件"); }

            // 兼容多种常见结构：数组 / 单个对象 / {entries:[...]} / {entries:{uid:{...}}}（类似酒馆世界书导出格式）
            let list;
            if (Array.isArray(parsed)) list = parsed;
            else if (parsed.entries && Array.isArray(parsed.entries)) list = parsed.entries;
            else if (parsed.entries && typeof parsed.entries === 'object') list = Object.values(parsed.entries);
            else list = [parsed];

            let addedCount = 0;
            list.forEach(item => {
                if (!item || typeof item !== 'object') return;
                const title = (item.title || item.comment || item.name || item.key || '未命名设定').toString().trim() || '未命名设定';
                const content = (item.content || item.text || item.value || item.entry || '').toString().trim();
                if (!content) return;
                const keywordsRaw = item.keywords || (Array.isArray(item.keys) ? item.keys.join(',') : (Array.isArray(item.key) ? item.key.join(',') : ''));
                const category = (item.category || '').toString().trim();
                if (category && !worldbookCategories.includes(category)) worldbookCategories.push(category);
                worldbooks.push({
                    id: Date.now() + Math.floor(Math.random() * 100000),
                    title,
                    content,
                    isGlobal: !!(item.isGlobal || item.constant),
                    weight: typeof item.weight === 'number' ? item.weight : 50,
                    keywords: (keywordsRaw || '').toString(),
                    priority: typeof item.priority === 'number' ? item.priority : 0,
                    group: (item.group || '').toString(),
                    recursive: !!item.recursive,
                    category
                });
                addedCount++;
            });

            if (addedCount === 0) throw new Error("JSON 里没有找到可用的世界书条目（至少需要 title/content 或等价字段）");

            refreshWbCategorySelect();
            renderWorldbookCards();
            saveAllData();
            alert(`✅ 已从 JSON 自动添加 ${addedCount} 条世界书设定！`);

        } else if (ext === 'txt') {
            const text = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(e);
                reader.readAsText(file, 'UTF-8');
            });
            if (!text || !text.trim()) throw new Error("文件内容为空！");

            const title = file.name.replace(/\.txt$/i, '').trim() || '导入的设定';
            worldbooks.push({
                id: Date.now(),
                title,
                content: text.trim(),
                isGlobal: false,
                weight: 50,
                keywords: '',
                priority: 0,
                group: '',
                recursive: false,
                category: ''
            });

            renderWorldbookCards();
            saveAllData();
            alert(`✅ 已自动添加 TXT 设定「${title}」，可以在下方卡片里点✏️继续编辑细节（权重/关键词/分类等）。`);

        } else {
            throw new Error("只支持导入 .txt 或 .json 格式文件");
        }
    } catch (err) {
        alert("导入失败：" + err.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        event.target.value = ''; // 无论成功失败，清空 input 以允许重复上传同一文件
    }
}
function downloadTxt(text, filename) {
    // 过滤掉文件名中可能导致错误的非法字符
    const safeFilename = filename.replace(/[\\/:*?"<>|]/g, "_");
    saveTextFileForApp(safeFilename, text, "text/plain;charset=utf-8");
}

// 通用文件保存：兼容普通浏览器 和 HBuilderX 打包后的 APK（5+ Runtime）。
// HBuilderX 的 WebView 壳子不一定支持 <a download>，所以检测到 window.plus 时改用 plus.io 写入手机公共文档目录。
function saveTextFileForApp(filename, content, mimeType) {
    if (window.plus && plus.io) {
        try {
            plus.io.resolveLocalFileSystemURL(plus.io.PUBLIC_DOCUMENTS, (entry) => {
                entry.getFile(filename, { create: true }, (fileEntry) => {
                    fileEntry.createWriter((writer) => {
                        writer.onwrite = () => { alert(`✅ 已保存到手机"文档"目录：${filename}\n可以用手机自带的文件管理器找到它。`); };
                        writer.onerror = () => fallbackBrowserDownload(filename, content, mimeType);
                        writer.write(content);
                    }, () => fallbackBrowserDownload(filename, content, mimeType));
                }, () => fallbackBrowserDownload(filename, content, mimeType));
            }, () => fallbackBrowserDownload(filename, content, mimeType));
        } catch (e) { fallbackBrowserDownload(filename, content, mimeType); }
    } else {
        fallbackBrowserDownload(filename, content, mimeType);
    }
}
function fallbackBrowserDownload(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}// ==========================
// 📥 导出日记与信件
// ==========================
function exportCurrentDiary() {
    // 获取详情弹窗中的内容
    const title = document.getElementById('diaryDetailTitle').innerText || '未命名信件';
    const date = document.getElementById('diaryDetailDate').innerText || '';
    const content = document.getElementById('diaryDetailContent').innerText || '';

    // 拼接成适合阅读的文本格式
    const textToSave = `【${title}】\n${date}\n\n${content}`;
    
    // 调用下载
    downloadTxt(textToSave, `${title}.txt`);
}

// ==========================================
// 角色对线系统：右键菜单、AI 代打与 NPC 自动反击
// ==========================================

// 1. 覆盖原有的推文/营销号评论右键菜单
window.showReplyContextMenu = function(e, postId, replyIdx) {
    e.preventDefault(); e.stopPropagation();
    replyContextMenuTarget = { postId: postId, replyIdx: replyIdx, type: postId.startsWith('tb_') ? 'tabloid' : 'global' };
    const menu = document.getElementById('chatContextMenu');
    menu.innerHTML = `
        <button class="context-btn" onclick="openCustomCharReplyModal()">滴滴代打</button>
        <button class="context-btn" style="color:#f91880;" onclick="contextActionDeleteReply()">🗑️ 删除评论</button>
    `;
    menu.style.display = 'flex'; 
    let x = e.pageX, y = e.pageY; 
    if(x + 150 > window.innerWidth) x -= 150; 
    if(y + 100 > window.innerHeight) y -= 100; 
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
};

// 2. 故事论坛专用的评论右键菜单
window.showForumReplyContextMenu = function(e, threadId, floor) {
    e.preventDefault(); e.stopPropagation();
    replyContextMenuTarget = { threadId: threadId, floor: floor, type: 'forum' };
    const menu = document.getElementById('chatContextMenu');
    menu.innerHTML = `<button class="context-btn" onclick="openCustomCharReplyModal()">滴滴代打</button>`;
    menu.style.display = 'flex';
    let x = e.pageX, y = e.pageY; 
    if(x + 150 > window.innerWidth) x -= 150; 
    if(y + 100 > window.innerHeight) y -= 100; 
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
};

// 3. 匿名论坛专用的评论右键菜单
window.showAnonReplyContextMenu = function(e, postId, replyIdx) {
    e.preventDefault(); e.stopPropagation();
    replyContextMenuTarget = { postId: postId, replyIdx: replyIdx, type: 'anon' };
    const menu = document.getElementById('chatContextMenu');
    menu.innerHTML = `<button class="context-btn" onclick="openCustomCharReplyModal()">滴滴代打</button>`;
    menu.style.display = 'flex';
    let x = e.pageX, y = e.pageY; 
    if(x + 150 > window.innerWidth) x -= 150; 
    if(y + 100 > window.innerHeight) y -= 100; 
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
};

// 4. 打开回复面板并渲染数据 (防错加强版 + 随机选项)
window.openCustomCharReplyModal = function() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (!replyContextMenuTarget) return;

    if (!myCharacters || myCharacters.length === 0) return alert("请先创建至少一个角色！");

    const modal = document.getElementById('customCharReplyModal');
    if (!modal) return alert("⚠️ 找不到弹窗界面，请确保 index.html 中已经正确添加了对应代码！");

    const t = replyContextMenuTarget;
    let targetName = '未知', targetText = '';

    try {
        if (t.type === 'global' || t.type === 'tabloid') {
            const post = t.type === 'tabloid' ? tabloidPosts.find(p => p.id == t.postId) : globalPosts.find(p => p.id == t.postId);
            if (!post) throw new Error("找不到原帖数据");
            const reply = post.replies[t.replyIdx];
            if (!reply) throw new Error("找不到原评论数据");
            targetName = t.type === 'tabloid' ? (reply.name || '未知') : (reply.char ? reply.char.name : '未知');
            targetText = reply.text || reply.content || '';
        } else if (t.type === 'forum') {
            const thread = forumThreads.find(th => th.id === t.threadId);
            if (!thread) throw new Error("找不到原论坛帖");
            const reply = thread.replies.find(r => r.floor === t.floor);
            if(reply) { targetName = reply.author || '未知'; targetText = reply.content || ''; }
            else { targetName = thread.author || '未知'; targetText = thread.content || ''; }
        } else if (t.type === 'anon') {
            const post = anonPosts.find(p => p.id === t.postId);
            if (!post) throw new Error("找不到匿名帖");
            const reply = post.replies[t.replyIdx];
            if (!reply) throw new Error("找不到匿名评论");
            targetName = reply.anonName || '匿名者';
            targetText = reply.text || reply.content || '';
        }

        document.getElementById('ccrTargetInfo').innerHTML = `<b>正在回复 ${targetName}：</b><br>${targetText.substring(0, 80)}...`;
        
        // 渲染选项，加入“随机角色”
        let optionsHtml = '<option value="random">随机角色</option>';
        optionsHtml += myCharacters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        document.getElementById('ccrCharSelect').innerHTML = optionsHtml;
        
        // 清空并设置占位符提示 AI 代打
        const inputEl = document.getElementById('ccrInput');
        inputEl.value = '';
        inputEl.placeholder = "请输入文本...\n(留空则召唤角色自动代打)";
        
        openModal('customCharReplyModal');
    } catch(e) {
        console.error("打开回复面板出错:", e);
        alert("获取数据失败: " + e.message);
    }
};

// 5. 核心引擎：提交回复 (包含 AI 留空代打、随机角色抓取、NPC 自动反击)
window.submitCustomCharReply = async function() {
    let charId = document.getElementById('ccrCharSelect').value;
    let text = document.getElementById('ccrInput').value.trim();
    if (!charId) return;

    // 解析随机角色
    if (charId === 'random') {
        if (!myCharacters || myCharacters.length === 0) return;
        const randomChar = myCharacters[Math.floor(Math.random() * myCharacters.length)];
        charId = randomChar.id;
    }

    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;

    const t = replyContextMenuTarget;
    const btn = document.getElementById('ccrSubmitBtn');
    btn.innerText = "处理中..."; btn.disabled = true;

    let targetId = '', targetName = '', postId = '', targetText = '';

    // 提取目标信息 (为 AI 代打和反击提供上下文)
    try {
        if (t.type === 'global' || t.type === 'tabloid') {
            postId = t.postId;
            const post = t.type === 'tabloid' ? tabloidPosts.find(p => p.id == t.postId) : globalPosts.find(p => p.id == t.postId);
            const targetReply = post.replies[t.replyIdx];
            targetName = t.type === 'tabloid' ? (targetReply.name || '未知') : (targetReply.char ? targetReply.char.name : '未知');
            targetId = t.type === 'tabloid' ? targetReply.charId : (targetReply.char ? targetReply.char.id : 'npc');
            targetText = targetReply.text || targetReply.content || '';
        } else if (t.type === 'forum') {
            postId = t.threadId;
            const thread = forumThreads.find(th => th.id === t.threadId);
            let targetReply = thread.replies.find(r => r.floor === t.floor);
            targetName = targetReply ? targetReply.author : thread.author;
            targetId = 'npc';
            targetText = targetReply ? targetReply.content : thread.content;
        } else if (t.type === 'anon') {
            postId = t.postId;
            const post = anonPosts.find(p => p.id === t.postId);
            const targetReply = post.replies[t.replyIdx];
            targetName = targetReply.anonName || '匿名者';
            targetId = targetReply.charId || 'npc';
            targetText = targetReply.text || targetReply.content || '';
        }
    } catch(e) {
        console.error("提交时提取目标信息失败", e);
        btn.innerText = "你等着吧我现在就找人弄你"; btn.disabled = false;
        return;
    }

    const api = getApiConfig(true); 

    // A. 文本框留空 -> 触发 AI 角色自动代打
    if (!text) {
        if (!api.key) {
            alert("请先在设置中配置 API Key，或手动输入文本！");
            btn.innerText = "你等着吧我现在就找人弄你"; btn.disabled = false;
            return;
        }
        
        btn.innerText = "摇人中...";
        let promptStr = "";
        
        if (t.type === 'anon') {
            promptStr = `你的人设：${char.persona}。你现在处于极端的匿名深渊论坛，ID是"${char.anonName || '匿名者'}"。\n刚刚看到网友"${targetName}"评论说："${targetText}"。\n请直接输出你要回怼或回复的话（不超过50字，不要带引号，符合你的隐藏性格和论坛恶劣环境）。`;
        } else if (t.type === 'forum') {
            promptStr = `你是"${char.name}"，人设：${char.persona}。你现在在逛中文论坛。\n刚刚看到楼主或层主"${targetName}"说："${targetText}"。\n请结合你的人设，直接输出你要回复的话（不超过50字，不要带引号）。`;
        } else {
            promptStr = `你是"${char.name}"，人设：${char.persona}。你正在浏览社交推文。\n刚才网友"${targetName}"评论说："${targetText}"。\n请结合你的人设，直接输出你要回复的话（不超过50字，不要带引号）。`;
        }
        
        try {
            text = (await sendChatRequest(api, promptStr)).choices?.[0]?.message?.content?.trim() || "";
            text = text.replace(/^"|"$/g, '');
        } catch(e) {
            console.error("生成代打回复失败:", e);
            alert("AI 生成代打失败，请重试或手动输入。");
            btn.innerText = "你等着吧我现在就找人弄你"; btn.disabled = false;
            return;
        }
        if (!text || text.toUpperCase().startsWith("NO")) text = "呃...";
    }

    // B. 将角色生成的回复写入页面
    if (t.type === 'global' || t.type === 'tabloid') {
        const post = t.type === 'tabloid' ? tabloidPosts.find(p => p.id == t.postId) : globalPosts.find(p => p.id == t.postId);
        const targetReply = post.replies[t.replyIdx];

        const newReply = t.type === 'tabloid' 
            ? { id: 'r_' + Date.now(), parentId: targetReply.id, charId: char.id, name: char.name, text: text, timestamp: Date.now() }
            : { id: 'r_' + Date.now(), parentId: targetReply.id, char: char, text: text, timestamp: Date.now(), likes: 0, liked: false, likedBy: [], replyTo: targetName };
        
        post.replies.push(newReply); post.stats.comments++; saveAllData();
        if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(t.postId);
        if (t.type === 'tabloid' && document.getElementById('view-tabloid').style.display !== 'none') renderTabloidPosts();

    } else if (t.type === 'forum') {
        const thread = forumThreads.find(th => th.id === t.threadId);
        let nextFloor = thread.replies.length > 0 ? thread.replies[thread.replies.length - 1].floor + 1 : 2;
        thread.replies.push({ floor: nextFloor, author: char.name, isOp: false, content: text, quoteFloor: t.floor, likes: 0, timestamp: Date.now() });
        saveAllData();
        if (document.getElementById('current-forum-wrap')) openForumThread(t.threadId);

    } else if (t.type === 'anon') {
        const post = anonPosts.find(p => p.id === t.postId);
        post.replies.push({ charId: char.id, anonName: char.anonName || '匿名者', anonId: char.anonId || 'OP', replyTo: targetName, text: text, timestamp: Date.now() });
        post.stats.comments++; saveAllData(); renderAnonPosts();
    }

    closeModal('customCharReplyModal');
    btn.innerText = "你等着吧我现在就找人弄你"; btn.disabled = false;

    // C. 触发 NPC 自动反击逻辑
    if (!api.key) return;

    if (String(targetId).startsWith('npc') || t.type === 'forum' || targetId === 'tabloid_admin') {
        let p2 = "";
        let npcActionRule2 = allowActionTags ? "" : "不要有任何动作、神态或心理描写，不要用括号()或【】，只输出要说的话。";
        if (t.type === 'anon') {
            p2 = `你是匿名路人网友"${targetName}"。刚才匿名论坛用户(其实是角色)"${char.anonName || '匿名者'}"(人设:${char.persona})针对你的评论回复道："${text}"。请你以暴躁、阴暗、抽象的路人网友身份简短回击，不超过50字。直接输出内容，不要带引号。${npcActionRule2}`;
        } else {
            p2 = `你是路人网友"${targetName}"。刚才论坛/推特用户(角色)"${char.name}"(人设:${char.persona})针对你的评论回复道："${text}"。请你以路人网友的身份（八卦、吃瓜、拱火、或者反击）简短回击，不超过50字。直接输出内容，不要带引号。${npcActionRule2}`;
        }

        try {
            let rep = (await sendChatRequest(api, p2)).choices?.[0]?.message?.content?.trim();
            if (rep && !rep.toUpperCase().startsWith("NO")) {
                rep = rep.replace(/^"|"$/g, '');

                // 写入 NPC 的回击
                if (t.type === 'global' || t.type === 'tabloid') {
                    const post = t.type === 'tabloid' ? tabloidPosts.find(p => p.id == t.postId) : globalPosts.find(p => p.id == t.postId);
                    let replyParentId = post.replies[post.replies.length-1].id;
                    
                    post.replies.push(t.type === 'tabloid' 
                        ? { id: 'r_' + Date.now(), parentId: replyParentId, charId: targetId, name: targetName, text: rep, timestamp: Date.now() } 
                        : { id: 'r_' + Date.now(), parentId: replyParentId, char: { id: targetId, name: targetName, handle: '@npc_user', avatarEmoji: '👤', themeColor: '#536471', verified: false }, text: rep, timestamp: Date.now(), likes: 0, liked: false, likedBy: [], replyTo: char.name });
                    post.stats.comments++; saveAllData();
                    if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(t.postId);
                    showToast(getAvatarHTML({name: targetName, avatarEmoji: '👤', themeColor: '#536471'}, 40), `${targetName} 回复了 ${char.name}`, rep, t.postId, null);
                    
                } else if (t.type === 'forum') {
                    const thread = forumThreads.find(th => th.id === t.threadId);
                    let nextFloor = thread.replies.length > 0 ? thread.replies[thread.replies.length - 1].floor + 1 : 2;
                    let quoteFloor = thread.replies[thread.replies.length - 1].floor;
                    
                    thread.replies.push({ floor: nextFloor, author: targetName, isOp: false, content: rep, quoteFloor: quoteFloor, likes: 0, timestamp: Date.now() });
                    saveAllData();
                    if (document.getElementById('current-forum-wrap')) openForumThread(t.threadId);
                    if(typeof showForumToast === 'function') showForumToast(`${targetName} 回击了 ${char.name}`, rep, '👤', t.threadId);
                    
                } else if (t.type === 'anon') {
                    const post = anonPosts.find(p => p.id === t.postId);
                    post.replies.push({ charId: targetId, anonName: targetName, anonId: 'NPC', replyTo: char.anonName || '匿名者', text: rep, timestamp: Date.now() });
                    post.stats.comments++; saveAllData(); renderAnonPosts();
                    showToast(`<div class="avatar" style="background:#555; border:1px solid #777; color:#fff;">?</div>`, `匿名网友 回复了 ${char.anonName || '匿名者'}`, rep, t.postId, null, true);
                }
            }
        } catch(e) { console.error("NPC 反击生成失败:", e); }
    }
};// ==========================================
// 升级版群聊功能：邀请拉人与群成员智能迎新/修罗场
// ==========================================

// 1. 覆盖原有的 openChatOptions，为群聊自动注入“邀请角色”按钮
window.openChatOptions = function(id, event) {
    if (event) event.stopPropagation(); 
    currentSummaryCharId = id; 
    const isGroup = String(id).startsWith('g_'); 
    
    // 隐藏或显示原有的聊天总结按钮
    const summaryBtn = document.getElementById('btnChatSummaryOption');
    if (summaryBtn) summaryBtn.style.display = isGroup ? 'none' : 'block';

    // 一键清空聊天记录：只在群聊里显示（个人聊天已经有"重新开始聊天"，会自动帮你归档旧记录，更安全）
    const clearGroupBtn = document.getElementById('btnClearGroupChatOption');
    if (clearGroupBtn) clearGroupBtn.style.display = isGroup ? 'block' : 'none';

    // 群聊发言顺序设置（顺序/随机/仅@回复）—— 这块之前被本函数的群聊邀请覆盖版本漏掉了，补回来
    const orderSection = document.getElementById('groupSpeakOrderSection');
    if (orderSection) {
        orderSection.style.display = isGroup ? 'block' : 'none';
        if (isGroup) {
            const g = groupChats.find(g => g.id === id);
            const orderSelect = document.getElementById('groupSpeakOrderSelect');
            if (orderSelect) orderSelect.value = (g && g.speakOrder) || 'all';
        }
    }
    
    // 动态查找或创建邀请按钮
    let inviteBtn = document.getElementById('btnChatInviteOption');
    if (!inviteBtn) {
        const txtModal = document.getElementById('chatTxtModal');
        if (txtModal) {
            const box = txtModal.querySelector('.modal-box');
            inviteBtn = document.createElement('button');
            inviteBtn.id = 'btnChatInviteOption';
            inviteBtn.className = 'btn-primary';
            inviteBtn.style.marginTop = '10px';
            inviteBtn.style.width = '100%';
            inviteBtn.innerHTML = '➕ 邀请新角色进群';
            inviteBtn.onclick = window.openInviteGroupModal;
            
            const cancelBtn = box.querySelector('.btn-cancel');
            if (cancelBtn) box.insertBefore(inviteBtn, cancelBtn);
            else box.appendChild(inviteBtn);
        }
    }
    if (inviteBtn) inviteBtn.style.display = isGroup ? 'block' : 'none';

    // 动态查找或创建"编辑群聊话题总结"按钮（群聊专属，个人聊天用原来的"编辑记忆"）
    let summaryTopicBtn = document.getElementById('btnGroupSummaryOption');
    if (!summaryTopicBtn) {
        const txtModal = document.getElementById('chatTxtModal');
        if (txtModal) {
            const box = txtModal.querySelector('.modal-box');
            summaryTopicBtn = document.createElement('button');
            summaryTopicBtn.id = 'btnGroupSummaryOption';
            summaryTopicBtn.className = 'btn-primary';
            summaryTopicBtn.style.marginTop = '10px';
            summaryTopicBtn.style.width = '100%';
            summaryTopicBtn.innerHTML = '🗨️ 编辑群聊话题总结';
            summaryTopicBtn.onclick = window.openGroupSummaryModal;

            const cancelBtn = box.querySelector('.btn-cancel');
            if (cancelBtn) box.insertBefore(summaryTopicBtn, cancelBtn);
            else box.appendChild(summaryTopicBtn);
        }
    }
    if (summaryTopicBtn) summaryTopicBtn.style.display = isGroup ? 'block' : 'none';

    openModal('chatTxtModal');
};

// 3. 打开/保存群聊话题总结
window.openGroupSummaryModal = function() {
    closeModal('chatTxtModal');
    const group = groupChats.find(g => g.id === currentSummaryCharId);
    if (!group) return;
    document.getElementById('groupSummaryModalTitle').innerText = `🗨️ ${group.name} 的话题总结`;
    document.getElementById('groupSummaryEditArea').value = group.summary || '';
    openModal('groupSummaryModal');
};
window.saveGroupSummary = function() {
    const group = groupChats.find(g => g.id === currentSummaryCharId);
    if (!group) return;
    group.summary = document.getElementById('groupSummaryEditArea').value.trim();
    saveAllData();
    alert('群聊话题总结已保存！');
    closeModal('groupSummaryModal');
};

// 一键清空群聊的全部聊天记录（右键头像 -> 聊天选项里触发）。
// 直接彻底清空、不做归档，操作前用 confirm 二次确认并报出具体消息条数，避免手滑误删。
window.clearGroupChatHistory = function() {
    const groupId = currentSummaryCharId;
    const group = groupChats.find(g => g.id === groupId);
    if (!group) return;
    const msgCount = (globalChats[groupId] || []).length;
    if (msgCount === 0) { alert(`"${group.name}"目前还没有聊天记录。`); return; }
    const confirmClear = confirm(`确定要清空"${group.name}"的全部聊天记录吗？\n共 ${msgCount} 条消息，清空后无法恢复，请谨慎操作。`);
    if (!confirmClear) return;
    globalChats[groupId] = [];
    saveAllData();
    if (currentChatSessionId === groupId) renderChatMessages();
    alert('已清空该群聊的所有聊天记录。');
};

// 2. 打开邀请弹窗
window.openInviteGroupModal = function() {
    closeModal('chatTxtModal');
    const group = groupChats.find(g => g.id === currentSummaryCharId);
    if (!group) return;
    
    // 找出还不在群里的角色
    const availableChars = myCharacters.filter(c => !group.members.includes(c.id));
    if (availableChars.length === 0) {
        return alert("你创建的所有角色都已经在这个群里了！");
    }
    
    const select = document.getElementById('inviteGroupCharSelect');
    if (select) {
        select.innerHTML = availableChars.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
    openModal('inviteGroupModal');
};

// 3. 确认邀请并触发 AI 连环反应
window.confirmInviteToGroup = async function() {
    const select = document.getElementById('inviteGroupCharSelect');
    const charId = select ? parseInt(select.value) : null;
    if (!charId) return;
    
    const group = groupChats.find(g => g.id === currentSummaryCharId);
    const newChar = myCharacters.find(c => c.id === charId);
    if (!group || !newChar) return;
    
    const btn = document.getElementById('btnConfirmInvite');
    btn.innerText = "成员拉取中..."; btn.disabled = true;
    
    // 将角色加入群数据
    group.members.push(charId);
    saveAllData();
    
    closeModal('inviteGroupModal');
    btn.innerText = "立即邀请"; btn.disabled = false;
    
    // 写入系统消息
    if (!globalChats[group.id]) globalChats[group.id] = [];
    globalChats[group.id].push({ sender: 'system', text: `"${newChar.name}" 被邀请加入了群聊`, timestamp: Date.now() });
    
    renderChatCharList();
    if (currentChatSessionId === group.id) renderChatMessages();
    
    // 触发连环 AI 反应机制
    await triggerGroupWelcomeSequence(group.id, newChar.id);
};

// 4. 核心引擎：老成员表态 -> 新成员回应
window.triggerGroupWelcomeSequence = async function(groupId, newCharId) {
    const api = getApiConfig(true);
    if (!api.key) return;
    
    const group = groupChats.find(g => g.id === groupId);
    const newChar = myCharacters.find(c => c.id === newCharId);
    if (!group || !newChar) return;

    // 抓取目前在群里的老成员（排除本人和刚进来的新人）
    let existingMembers = group.members
        .filter(id => id !== newCharId && id !== 'me')
        .map(id => myCharacters.find(c => c.id == id))
        .filter(Boolean);

    // 为了防止群太大导致 API 报错或时间过长，随机挑选最多 3 个活跃老成员来表态
    if (existingMembers.length > 3) {
        existingMembers = existingMembers.sort(() => 0.5 - Math.random()).slice(0, 3);
    }

    let welcomeContext = ""; // 用于记录老成员说的话，发给新人看
    const indicator = document.getElementById('chatTypingIndicator');
    const typingNameEl = document.getElementById('typingCharName');
    
    // A. 老成员依次表态
    for (let member of existingMembers) {
        if (indicator) { indicator.style.display = 'block'; typingNameEl.innerText = member.name; }
        
        let prompt = `${buildBasePrompt(member, false, newChar.name + ' ' + newChar.persona)}\n【系统强制事件】：新成员 "${newChar.name}" (人设: ${newChar.persona}) 刚刚被拉入了本群。\n请严格结合你自身的人设，直接输出你在群里对新人的第一句话（可以热烈欢迎、高冷无视、阴阳怪气、或者敌意，必须符合你的性格）。不超过50字。不要带引号。`;
        
        try {
            let rep = (await sendChatRequest(api, prompt)).choices?.[0]?.message?.content?.trim();
            if (rep && !rep.toUpperCase().startsWith("NO")) {
                rep = rep.replace(/^"|"$/g, '');
                globalChats[groupId].push({ sender: member.id, text: rep, timestamp: Date.now(), readBy: [] });
                welcomeContext += `${member.name} 对新人的态度：${rep}\n`;
                if (currentChatSessionId === groupId) renderChatMessages();
                saveAllData();
            }
        } catch(e) { console.error("老成员表态失败:", e); }
    }

    // B. 新人看完态度后给出回应
    if (indicator) { indicator.style.display = 'block'; typingNameEl.innerText = newChar.name; }
    
    let newCharPrompt = `${buildBasePrompt(newChar, false, welcomeContext)}\n【系统强制事件】：你刚刚被邀请加入了一个新群聊。\n群里的其他老成员对你的到来做出了如下表态：\n${welcomeContext ? welcomeContext : '(大家似乎都在冷场，没有说话)'}\n请结合你的人设和别人对你的态度，直接输出你在群里的第一句回应（不超过50字）。不要带引号。`;
    
    try {
        let rep2 = (await sendChatRequest(api, newCharPrompt)).choices?.[0]?.message?.content?.trim();
        if (rep2 && !rep2.toUpperCase().startsWith("NO")) {
            rep2 = rep2.replace(/^"|"$/g, '');
            globalChats[groupId].push({ sender: newChar.id, text: rep2, timestamp: Date.now(), readBy: [] });
            if (currentChatSessionId === groupId) renderChatMessages();
            saveAllData();
        }
    } catch(e) { console.error("新成员回应失败:", e); }

    if (indicator) indicator.style.display = 'none';
};


// ===================== 关系网功能（势力分组 + 角色关系图）=====================
let currentRelationsFactionName = null; // 记录当前正在浏览的势力，供角色关系页返回时使用
let currentRelationCharId = null;

function getCharFaction(c) { return c.group && c.group.trim() ? c.group : '势力不明'; }

function renderFactionNetworkGrid() {
    const grid = document.getElementById('factionNetworkGrid');
    const unknownCount = myCharacters.filter(c => !c.group || !c.group.trim()).length;
    const cards = characterGroups.map(g => {
        const count = myCharacters.filter(c => c.group === g).length;
        return { name: g, count, color: getFactionColor(g), deletable: true };
    });
    cards.push({ name: '势力不明', count: unknownCount, color: getFactionColor(null), deletable: false });
    if (cards.every(c => c.count === 0)) {
        grid.innerHTML = '<div class="empty-state">暂无角色，请先去"角色中心"创建角色，再来这里分配势力吧！</div>';
        return;
    }
    grid.innerHTML = cards.map(c => `
        <div class="faction-card" style="border-color:${c.color};" onclick="switchMainView('factionMembers', '${c.name.replace(/'/g,"\\'")}')">
            <div class="faction-card-badge" style="background:${c.color};"></div>
            <div class="faction-card-name">${c.name}</div>
            <div class="faction-card-count">${c.count} 位角色</div>
        </div>
    `).join('');
}

function renderFactionMembersGrid(factionName) {
    currentRelationsFactionName = factionName;
    document.getElementById('factionMembersTitle').innerText = factionName;
    document.getElementById('factionMembersColorDot').style.background = getFactionColor(factionName === '势力不明' ? null : factionName);
    const members = myCharacters.filter(c => getCharFaction(c) === factionName);
    const grid = document.getElementById('factionMembersGrid');
    if (members.length === 0) { grid.innerHTML = '<div class="empty-state">该势力暂无角色。</div>'; return; }
    grid.innerHTML = members.map(c => `
        <div class="faction-member-card" onclick="switchMainView('charRelations', '${c.id}')">
            ${getAvatarHTML(c, 64)}
            <div class="faction-member-name">${c.name}</div>
        </div>
    `).join('');
}

function backFromCharRelations() {
    if (currentRelationsFactionName) switchMainView('factionMembers', currentRelationsFactionName);
    else switchMainView('factionNetwork');
}

function renderCharRelationsView(charId) {
    currentRelationCharId = charId;
    const centerChar = myCharacters.find(c => c.id == charId);
    if (!centerChar) { switchMainView('factionNetwork'); return; }

    const edges = charRelationships.filter(r => r.fromId == charId || r.toId == charId);
    const relatedChars = edges.map(r => {
        const otherId = r.fromId == charId ? r.toId : r.fromId;
        const other = otherId === 'me' ? currentUser : myCharacters.find(c => c.id == otherId);
        return { char: other, isUser: otherId === 'me', edge: r };
    }).filter(x => x.char);

    const wrap = document.getElementById('relationsGraphWrap');
    const nodesEl = document.getElementById('relationsGraphNodes');
    const svg = document.getElementById('relationsGraphSvg');
    const w = wrap.clientWidth || 600, h = 380;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const cx = w / 2, cy = h / 2;

    let nodesHtml = `<div class="relation-node relation-node-center" style="left:${cx}px; top:${cy}px;">${getAvatarHTML(centerChar, 72)}<div class="relation-node-name">${centerChar.name}</div></div>`;
    let linesHtml = '';
    const radius = Math.min(w, h) / 2 - 70;
    const n = relatedChars.length;
    relatedChars.forEach((item, i) => {
        const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
        const nx = cx + radius * Math.cos(angle);
        const ny = cy + radius * Math.sin(angle);
        const color = item.edge.color || '#1d9bf0';
        const nodeClick = item.isUser ? `openUserProfileModal()` : `switchMainView('charRelations','${item.char.id}')`;
        const affinityBadge = (item.isUser && enableAffinitySystem) ? `<div style="font-size:11px; color:${(centerChar.affinity||0) >= 0 ? '#17bf63' : '#f91880'};">💗${(centerChar.affinity||0) > 0 ? '+' : ''}${centerChar.affinity||0}</div>` : '';
        nodesHtml += `<div class="relation-node" style="left:${nx}px; top:${ny}px;" onclick="${nodeClick}">${getAvatarHTML(item.char, 56)}<div class="relation-node-name">${item.char.name}</div>${affinityBadge}</div>`;
        // 箭头线：从中心指向对方
        const dx = nx - cx, dy = ny - cy, dist = Math.sqrt(dx*dx + dy*dy);
        const shrink = 40; // 避免箭头戳进头像里
        const ex = cx + dx * (1 - shrink / dist), ey = cy + dy * (1 - shrink / dist);
        const sx = cx + dx * (shrink / dist), sy = cy + dy * (shrink / dist);
        const midX = (sx + ex) / 2, midY = (sy + ey) / 2;
        // 好感度开启时，线的粗细随好感度绝对值变化，更直观地体现关系深浅
        const strokeWidth = (item.isUser && enableAffinitySystem) ? Math.max(1.5, Math.min(7, 2 + Math.abs(centerChar.affinity || 0) / 20)) : 2.5;
        linesHtml += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${color}" stroke-width="${strokeWidth}" marker-end="url(#relArrow${i})"></line>
            <text x="${midX}" y="${midY - 6}" fill="${color}" font-size="12" text-anchor="middle">${item.edge.label}</text>`;
    });
    // marker 定义（每条线独立颜色需要各自的 marker）
    let defs = '<defs>' + relatedChars.map((item, i) => `<marker id="relArrow${i}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="${item.edge.color || '#1d9bf0'}"></path></marker>`).join('') + '</defs>';

    svg.innerHTML = defs + linesHtml;
    nodesEl.innerHTML = nodesHtml;

    if (edges.length === 0) {
        document.getElementById('relationsListArea').innerHTML = '<div class="empty-state">暂无关系，点击右上角"＋ 添加关系"来建立吧！</div>';
    } else {
        document.getElementById('relationsListArea').innerHTML = '<div style="font-weight:bold; margin-bottom:8px; color:#536471;">关系列表</div>' + edges.map(r => {
            const otherId = r.fromId == charId ? r.toId : r.fromId;
            const other = otherId === 'me' ? currentUser : myCharacters.find(c => c.id == otherId);
            return `<div class="rel-chip" style="border-color:${r.color};">
                <span style="color:${r.color}; font-weight:bold;">${r.label}</span>
                <span>与 ${other ? other.name : '未知角色'}${otherId === 'me' ? '（用户）' : ''}</span>
                <button type="button" class="rel-chip-del" onclick="deleteRelationship('${r.id}')" title="删除这条关系">🗑 删除</button>
            </div>`;
        }).join('');
    }
}

function openAddRelationshipModal() {
    const targetSel = document.getElementById('relTargetCharSelect');
    const others = myCharacters.filter(c => c.id != currentRelationCharId);
    const userOptionHtml = `<option value="me">${currentUser.name}（用户）</option>`;
    if (others.length === 0) { targetSel.innerHTML = userOptionHtml; }
    else { targetSel.innerHTML = userOptionHtml + others.map(c => `<option value="${c.id}">${c.name}</option>`).join(''); }
    const typeSel = document.getElementById('relTypeSelect');
    typeSel.innerHTML = relationshipTypePresets.map((t, i) => `<option value="${i}">${t.label}</option>`).join('') + '<option value="custom">自定义...</option>';
    onRelTypeChange();
    openModal('addRelationshipModal');
}
function onRelTypeChange() {
    const val = document.getElementById('relTypeSelect').value;
    document.getElementById('relCustomFields').style.display = val === 'custom' ? 'block' : 'none';
}
function submitAddRelationship() {
    const targetId = document.getElementById('relTargetCharSelect').value;
    if (!targetId) return;
    const typeVal = document.getElementById('relTypeSelect').value;
    let label, color;
    if (typeVal === 'custom') {
        label = document.getElementById('relCustomLabel').value.trim();
        color = document.getElementById('relCustomColor').value;
        if (!label) return alert('请填写自定义标签！');
        // 用户自定义的新关系类型顺带存进预设列表，方便下次直接选用
        if (!relationshipTypePresets.some(t => t.label === label)) relationshipTypePresets.push({ label, color });
    } else {
        const preset = relationshipTypePresets[Number(typeVal)];
        label = preset.label; color = preset.color;
    }
    charRelationships.push({ id: 'rel_' + Date.now() + Math.floor(Math.random()*1000), fromId: currentRelationCharId, toId: targetId, label, color });
    saveAllData();
    closeModal('addRelationshipModal');
    renderCharRelationsView(currentRelationCharId);
}
function deleteRelationship(relId) {
    if (!confirm('确定删除这条关系吗？')) return;
    charRelationships = charRelationships.filter(r => r.id !== relId);
    saveAllData();
    renderCharRelationsView(currentRelationCharId);
}

// ---- 势力总览（CRUD 管理页）----
function renderFactionOverviewList() {
    const container = document.getElementById('factionOverviewList');
    let html = characterGroups.map(g => {
        const members = myCharacters.filter(c => c.group === g);
        return `
        <div class="faction-overview-row">
            <div class="faction-overview-row-head">
                <span class="faction-overview-del" onclick="deleteFactionOverview('${g.replace(/'/g,"\\'")}')">×</span>
                <input type="text" value="${g}" class="faction-overview-name-input" style="border-left:4px solid ${getFactionColor(g)};"
                    onblur="renameFactionOverview('${g.replace(/'/g,"\\'")}', this.value)">
                <span style="font-size:12px; color:#536471;">${members.length} 人</span>
            </div>
            <div class="faction-overview-members">
                ${members.map(c => `<div class="faction-overview-member" title="点击移出该势力" onclick="removeCharFromFaction('${c.id}')">${getAvatarHTML(c, 48)}<div class="faction-overview-member-name">${c.name}</div></div>`).join('')}
                <div class="faction-overview-add" onclick="openFactionCharPicker('${g.replace(/'/g,"\\'")}')">＋</div>
            </div>
        </div>`;
    }).join('');

    // 势力不明：不可删除
    const unknownMembers = myCharacters.filter(c => !c.group || !c.group.trim());
    html += `
        <div class="faction-overview-row">
            <div class="faction-overview-row-head">
                <span style="width:20px; display:inline-block;"></span>
                <div class="faction-overview-name-input" style="border-left:4px solid ${getFactionColor(null)}; display:flex; align-items:center; color:#536471;">势力不明</div>
                <span style="font-size:12px; color:#536471;">${unknownMembers.length} 人</span>
            </div>
            <div class="faction-overview-members">
                ${unknownMembers.map(c => `<div class="faction-overview-member">${getAvatarHTML(c, 48)}<div class="faction-overview-member-name">${c.name}</div></div>`).join('')}
            </div>
        </div>`;
    container.innerHTML = html;
}

function addFactionOverview() {
    const name = prompt('请输入新势力的名称：'); if (!name || !name.trim()) return;
    const val = name.trim();
    if (characterGroups.includes(val)) return alert('该势力已存在！');
    if (val === '势力不明') return alert('该名称已被保留，请换一个名字。');
    characterGroups.push(val); getFactionColor(val); saveAllData(); renderFactionOverviewList();
}
function renameFactionOverview(oldName, newVal) {
    newVal = newVal.trim();
    if (!newVal || newVal === oldName) { renderFactionOverviewList(); return; }
    if (newVal === '势力不明' || characterGroups.includes(newVal)) { alert('名称无效或已存在'); renderFactionOverviewList(); return; }
    const idx = characterGroups.indexOf(oldName); if (idx === -1) return;
    characterGroups[idx] = newVal;
    if (factionColors[oldName]) { factionColors[newVal] = factionColors[oldName]; delete factionColors[oldName]; }
    myCharacters.forEach(c => { if (c.group === oldName) c.group = newVal; });
    saveAllData(); renderFactionOverviewList();
}
function deleteFactionOverview(name) {
    if (!confirm(`确定删除势力"${name}"吗？该势力下的角色将归入"势力不明"，角色本身不会被删除。`)) return;
    myCharacters.forEach(c => { if (c.group === name) c.group = ''; });
    characterGroups = characterGroups.filter(g => g !== name);
    delete factionColors[name];
    saveAllData(); renderFactionOverviewList();
}
function removeCharFromFaction(charId) {
    const c = myCharacters.find(x => x.id == charId); if (!c) return;
    c.group = ''; saveAllData(); renderFactionOverviewList();
}
let factionPickerTarget = null;
function openFactionCharPicker(factionName) {
    factionPickerTarget = factionName;
    const list = document.getElementById('factionCharPickerList');
    const candidates = myCharacters.filter(c => c.group !== factionName);
    if (candidates.length === 0) { list.innerHTML = '<div style="color:#536471; font-size:13px;">已经没有其他角色可以添加了。</div>'; }
    else {
        list.innerHTML = candidates.map(c => `
            <div style="display:flex; align-items:center; gap:10px; padding:8px; border-radius:8px; cursor:pointer;" onmouseover="this.style.background='#f7f9f9'" onmouseout="this.style.background='transparent'" onclick="assignCharToFaction('${c.id}')">
                ${getAvatarHTML(c, 36)}<span>${c.name}</span><span style="margin-left:auto; font-size:12px; color:#536471;">${getCharFaction(c)}</span>
            </div>`).join('');
    }
    openModal('factionCharPickerModal');
}
function assignCharToFaction(charId) {
    const c = myCharacters.find(x => x.id == charId); if (!c || !factionPickerTarget) return;
    c.group = factionPickerTarget;
    saveAllData(); closeModal('factionCharPickerModal'); renderFactionOverviewList();
}
// ====== 手机端长按呼出菜单专用代码 ======
let avatarTouchTimer = null;
function avatarTouchStart(e, charId) {
    if (avatarTouchTimer) clearTimeout(avatarTouchTimer);
    const touch = e.touches ? e.touches[0] : e;
    const pageX = touch.pageX, pageY = touch.pageY;
    avatarTouchTimer = setTimeout(() => {
        showAvatarContextMenu({ preventDefault: () => {}, pageX, pageY }, charId);
        avatarTouchTimer = null;
    }, 600); // 触控按住 0.6秒 后呼出菜单
}
function avatarTouchEnd(e) {
    if (avatarTouchTimer) {
        clearTimeout(avatarTouchTimer);
        avatarTouchTimer = null;
    }
}

// 群聊头像长按 → 打开聊天选项（发言顺序等），修复移动端无法长按呼出群聊选项的问题
let groupAvatarTouchTimer = null;
function groupAvatarTouchStart(e, groupId) {
    if (groupAvatarTouchTimer) clearTimeout(groupAvatarTouchTimer);
    groupAvatarTouchTimer = setTimeout(() => {
        openChatOptions(groupId, { preventDefault: () => {}, stopPropagation: () => {} });
        groupAvatarTouchTimer = null;
    }, 600);
}
function groupAvatarTouchEnd(e) {
    if (groupAvatarTouchTimer) {
        clearTimeout(groupAvatarTouchTimer);
        groupAvatarTouchTimer = null;
    }
}

// 🔄 侧滑/回档等聊天气泡长按菜单：修复移动端触屏无法呼出右键菜单的问题
let chatBubbleTouchTimer = null;
function chatBubbleTouchStart(e, msgIdx) {
    if (chatBubbleTouchTimer) clearTimeout(chatBubbleTouchTimer);
    const touch = e.touches ? e.touches[0] : e;
    const pageX = touch.pageX, pageY = touch.pageY;
    chatBubbleTouchTimer = setTimeout(() => {
        showChatContextMenu({ preventDefault: () => {}, pageX, pageY }, msgIdx);
        chatBubbleTouchTimer = null;
    }, 500); // 触控按住 0.5秒 后呼出菜单（含侧滑重新生成、重新编辑、开辟分支等操作）
}
function chatBubbleTouchEnd(e) {
    if (chatBubbleTouchTimer) {
        clearTimeout(chatBubbleTouchTimer);
        chatBubbleTouchTimer = null;
    }
}
// ====== 1. 角色专属纪念日：添加逻辑 ======
function addCharAnniversaryWithSync() {
    const dateInput = document.getElementById('newAnniversaryDate');
    const eventInput = document.getElementById('newAnniversaryEvent');
    const dateVal = dateInput ? dateInput.value : '';
    const eventVal = eventInput ? eventInput.value.trim() : '';

    if (!dateVal || !eventVal) return alert("请先点击日历选择日期，并填写纪念日名称！");

    let charId = currentCalendarCharId || currentProfileId || currentChatSessionId || null;
    let char = null;
    
    if (charId) char = myCharacters.find(c => c.id == charId);
    else {
        const nameEl = document.getElementById('characterCenterName') || document.getElementById('profileName');
        if (nameEl) char = myCharacters.find(c => c.name === nameEl.innerText.trim());
        if (!char && myCharacters.length > 0) char = myCharacters[0]; 
    }

    if (!char) return alert("未能定位当前角色，请重新打开资料页重试。");
    if (!char.anniversaries) char.anniversaries = [];

    char.anniversaries.push({
        id: "anniv_" + Date.now().toString(),
        date: dateVal,
        event: eventVal
    });

    if (typeof saveAllData === 'function') saveAllData();
    dateInput.value = "";
    eventInput.value = "";

    // 🌟 添加后瞬间刷新画面 🌟
    renderCharCalendarModalContent(char.id);
}


// ====== 2. 智能显示列表（修复计算Bug + 提取AI记忆） ======
function renderCharCalendarModalContent(charId) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;

    const listDiv = document.getElementById('charCalendarAnniversary');
    if (!listDiv) return;

    let allAnniversaries = [];
    if (char.anniversaries && char.anniversaries.length > 0) allAnniversaries = [...char.anniversaries];

    if (char.memories && char.memories.length > 0) {
        char.memories.forEach(m => {
            const titleMatch = m.title && (m.title.includes('纪念') || m.title.includes('天') || m.title.includes('相识'));
            if ((m.dateStr || titleMatch) && !allAnniversaries.find(a => a.id === m.id)) {
                let dStr = m.dateStr;
                if (!dStr) {
                    const d = new Date(m.timestamp || Date.now());
                    dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                }
                if (!allAnniversaries.find(a => a.date === dStr && a.event.includes(m.title.replace(/🗓️.*：/, '').trim()))) {
                    allAnniversaries.push({ id: m.id, date: dStr, event: m.title.replace(/🗓️.*：/, '').trim() || m.title, isAiMemory: true });
                }
            }
        });
    }

    // --- 修复版天数计算引擎（绝对对齐日历天数） ---
    let baseTs = null;
    let baseLabel = "我们相识";

    const meetEvent = allAnniversaries.find(a => !a.isAiMemory && (a.event.includes('相识') || a.event.includes('认识') || a.event.includes('相遇') || a.event.includes('见面') || a.event.includes('初见')));
    
    if (meetEvent) {
        baseTs = new Date(meetEvent.date).getTime();
        baseLabel = meetEvent.event;
    } else {
        baseTs = char.createTime;
        if (!baseTs && !isNaN(char.id) && char.id.toString().length >= 13) baseTs = parseInt(char.id);
        if (!baseTs) baseTs = Date.now();
    }

    // 强行把时分秒清零，只比对“日期”
    let baseDateObj = new Date(baseTs);
    baseDateObj.setHours(0, 0, 0, 0);
    let todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    
    // (今天的毫秒 - 起点的毫秒) 除以一天的毫秒，再 +1 (代表认识的当天就是第 1 天)
    let displayDays = Math.floor((todayObj.getTime() - baseDateObj.getTime()) / 86400000) + 1;
    if (displayDays < 1) displayDays = 1; 

    const baseDateStr = `${baseDateObj.getFullYear()}-${String(baseDateObj.getMonth()+1).padStart(2,'0')}-${String(baseDateObj.getDate()).padStart(2,'0')}`;

    let htmlStr = `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:6px; background:linear-gradient(to right, #e8f5fd, #f0f8ff); color:#0f1419; margin-bottom:8px; border-left:4px solid #1d9bf0;">
        <div style="flex:1; font-size:13px; color:#1d9bf0;">
            ⏳ <strong>${baseDateStr}</strong> — ${baseLabel}的第 <strong style="font-size:16px; color:#f91880;">${displayDays}</strong> 天！
        </div>
    </div>`;

    if (allAnniversaries.length > 0) {
        allAnniversaries.sort((a, b) => new Date(a.date) - new Date(b.date));
        allAnniversaries.forEach(a => {
            const aiBadge = a.isAiMemory ? `<span style="font-size:10px; background:#e8f5fd; color:#1d9bf0; padding:2px 6px; border-radius:4px; margin-left:6px;">🤖 AI记忆</span>` : '';
            htmlStr += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed #eff3f4; color:#0f1419;">
                <div style="flex:1; font-size:13px;">🗓️ <strong>${a.date}</strong> — ${a.event} ${aiBadge}</div>
                ${a.isAiMemory ? '' : `<button onclick="deleteCharAnniversary('${char.id}', '${a.id}')" style="background:#fff0f4; border:1px solid #f91880; color:#f91880; border-radius:4px; cursor:pointer; font-size:12px; padding:4px 8px; margin-left:10px; transition:0.2s;">🗑️ 删除</button>`}
            </div>`;
        });
    } else {
        htmlStr += '<div style="color:#8b98a5; font-size:12px; text-align:center; margin-top:10px;">暂无其他纪念日，在上方添加吧~</div>';
    }

    listDiv.innerHTML = htmlStr;
}


// ====== 3. 纪念日删除功能 ======
function deleteCharAnniversary(charId, annivId) {
    if (!confirm("确定要删除这条记录吗？")) return;
    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;
    if (char.anniversaries) char.anniversaries = char.anniversaries.filter(a => a.id !== annivId);
    if (char.memories) char.memories = char.memories.filter(m => m.id !== annivId);
    if (typeof saveAllData === 'function') saveAllData();
    renderCharCalendarModalContent(charId);
}


// ====== 4. 终极防洗屏监听器：只要弹窗一出来，立刻夺回画面控制权 ======
if (typeof window.hasInjectedCalendarObserver === 'undefined') {
    window.hasInjectedCalendarObserver = true;
    
    // 我们派一个“暗哨”盯着纪念日弹窗
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style') {
                const modal = document.getElementById('charCalendarModal');
                if (modal && window.getComputedStyle(modal).display !== 'none') {
                    // 当发现弹窗从隐藏变成显示时，延迟50毫秒（等原系统把错误数据画完），我们再强行用正确数据覆盖
                    setTimeout(() => {
                        let charId = currentCalendarCharId || currentProfileId || currentChatSessionId || null;
                        if (!charId) {
                            const nameEl = document.getElementById('characterCenterName') || document.getElementById('profileName');
                            if (nameEl) {
                                let c = myCharacters.find(x => x.name === nameEl.innerText.trim());
                                if (c) charId = c.id;
                            }
                        }
                        if (charId) renderCharCalendarModalContent(charId);
                    }, 50);
                }
            }
        });
    });

    // 页面加载完成后立刻开始盯梢
    document.addEventListener("DOMContentLoaded", () => {
        const modal = document.getElementById('charCalendarModal');
        if (modal) observer.observe(modal, { attributes: true });
    });
    
    // 如果网页没刷新就跑了这段代码，也直接挂上盯梢
    const modal = document.getElementById('charCalendarModal');
    if (modal) observer.observe(modal, { attributes: true });
}
// ==========================================
// 📥 智能导入 Silly Tavern 角色卡引擎 (支持 PNG/WEBP/JSON)
// ==========================================
async function handleCharCardImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 清空 input 允许重复选择同一个文件
    event.target.value = '';

    const fileName = file.name.toLowerCase();
    let charData = null;
    let b64Image = null;

    try {
        if (fileName.endsWith('.json')) {
            const text = await file.text();
            charData = JSON.parse(text);
        } 
        else if (fileName.endsWith('.png')) {
            b64Image = await fileToBase64(file);
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            
            // 深入解析 PNG 的 tEXt 数据块
            if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
                let offset = 8;
                while (offset < bytes.length) {
                    const length = (bytes[offset] << 24) | (bytes[offset+1] << 16) | (bytes[offset+2] << 8) | bytes[offset+3];
                    const type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
                    if (type === 'tEXt') {
                        let i = offset + 8;
                        let keyword = "";
                        while (bytes[i] !== 0 && i < offset + 8 + length) {
                            keyword += String.fromCharCode(bytes[i]);
                            i++;
                        }
                        if (keyword === 'chara') {
                            i++; // 跳过 Null 分隔符
                            const textBytes = bytes.slice(i, offset + 8 + length);
                            const textStr = new TextDecoder('utf-8').decode(textBytes);
                            try {
                                // 处理 Base64 解码中的 UTF-8 中文乱码
                                const binaryString = atob(textStr);
                                const binBytes = new Uint8Array(binaryString.length);
                                for (let j = 0; j < binaryString.length; j++) {
                                    binBytes[j] = binaryString.charCodeAt(j);
                                }
                                const jsonString = new TextDecoder('utf-8').decode(binBytes);
                                charData = JSON.parse(jsonString);
                            } catch(e) { console.error("PNG 数据解析失败", e); }
                            break;
                        }
                    }
                    offset += 8 + length + 4;
                }
            }
        } 
        else if (fileName.endsWith('.webp') || fileName.endsWith('.jpg')) {
            b64Image = await fileToBase64(file);
            const text = await file.text();
            // 暴力提取引擎：通过正则表达式在图片二进制文本中寻找被 Base64 编码的 JSON
            // (JSON 开头都是 {"name" -> 对应 Base64 的 eyJ)
            const base64Regex = /(eyJ[A-Za-z0-9+/=]+)/g;
            let matches = text.match(base64Regex);
            if (matches) {
                for (let m of matches) {
                    if (m.length > 200) { 
                        try {
                            const decoded = new TextDecoder('utf-8').decode(Uint8Array.from(atob(m), c => c.charCodeAt(0)));
                            if (decoded.includes('"name"') && (decoded.includes('"description"') || decoded.includes('"data"'))) {
                                charData = JSON.parse(decoded);
                                break;
                            }
                        } catch(e) {}
                    }
                }
            }
        }
    } catch(e) {
        console.error("读取文件异常:", e);
    }

    if (!charData) {
        alert("⚠️ 未能从该图片中读取到有效的角色卡数据！\n这可能是一张普通的图片。目前支持自带设定的酒馆(SillyTavern)角色卡(PNG/WEBP) 或 原生 JSON 文件。");
        return;
    }

    // 兼容 V1 和 V2 格式规范
    const data = charData.data || charData;

    // 1. 打开新建角色表单
    openFormForCreate();

    // 2. 自动填入名字
    document.getElementById('charName').value = data.name || '';
    
    // 3. 智能拼接人设 (Persona)
    let personaArr = [];
    if (data.description) personaArr.push(`【背景描述】\n${data.description}`);
    if (data.personality) personaArr.push(`【性格特点】\n${data.personality}`);
    if (data.scenario) personaArr.push(`【当前情景】\n${data.scenario}`);
    if (data.system_prompt) personaArr.push(`【角色专属系统指令】\n${data.system_prompt}`);
    if (data.post_history_instructions) personaArr.push(`【行为准则/后置指令】\n${data.post_history_instructions}`);
    if (data.extensions?.depth_prompt?.prompt) personaArr.push(`【重要提醒事项】\n${data.extensions.depth_prompt.prompt}`);
    if (data.mes_example) personaArr.push(`【对话风格范例】\n${data.mes_example}`);
    if (data.creator_notes) personaArr.push(`【作者备注】\n${data.creator_notes}`);
    
    const fullPersona = personaArr.join('\n\n');
    document.getElementById('charPersona').value = fullPersona;

    // 🌟 独家新增：让 AI 自动为你浓缩“短简介”、起好“匿名昵称”和“拍一拍文案” 🌟
    const api = getApiConfig(true); 
    if (api.key && fullPersona.length > 10) {
        const bioInput = document.getElementById('charBio');
        if (bioInput) bioInput.placeholder = "AI正在根据几千字人设，疯狂为您提炼短简介中... ⏳";
        
        const prompt = `你是一个出色的设定提取助手。请根据下面这段长篇角色人设，提炼出以下三项精简内容：
1. 一段适合放在社交平台主页的“个人简介（Bio）”，要求符合角色的性格特征与说话语气，千万不要超过 40 个字。
2. 一个适合该角色在匿名论坛发帖用的“马甲昵称”（如：魔法少女、暴躁老哥、打工人，2-6字）。
3. 当别人在微信里“拍了拍”该角色时，显示的动作或部位（必须以“的”字开头，如：的肩膀、的机械臂，不超过6字）。

【角色人设】：
${fullPersona.substring(0, 1500)}

必须且只能返回合法的 JSON 格式，不要加任何废话和前缀：
{"bio": "提取的短简介", "anonName": "提取的昵称", "nudgeText": "拍一拍文本"}`;

        sendChatRequest(api, prompt).then(resData => {
            let text = resData.choices?.[0]?.message?.content?.trim() || "";
            text = text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            try {
                let parsed = JSON.parse(text);
                // 等AI想好了，瞬间自动填入格子中！
                if (parsed.bio && !bioInput.value) bioInput.value = parsed.bio;
                if (parsed.anonName && !document.getElementById('charAnonName').value) document.getElementById('charAnonName').value = parsed.anonName;
                if (parsed.nudgeText && !document.getElementById('charNudgeText').value) document.getElementById('charNudgeText').value = parsed.nudgeText;
            } catch(e) {}
        }).catch(e => console.log("AI提炼资料失败", e));
    }
    // 4. 将第一句话(First Message)完美无损提取
    // 有些卡的 first_mes 只是个占位标签（比如字面意思就是"【开场白】"这几个字），
    // 真正的开场白正文其实放在 alternate_greetings 里——不加判断直接用 first_mes 会导致
    // 聊天里显示的是这个占位文字本身，而不是真正的开场白。
    function looksLikePlaceholder(text) {
        if (!text) return true;
        const stripped = text.replace(/[【】\[\]()（）\s：:]/g, '');
        return stripped.length <= 6; // 去掉括号/空白后几乎没剩什么字，大概率只是个标签
    }
    let fm = data.first_mes || '';
    const altGreetings = Array.isArray(data.alternate_greetings) ? data.alternate_greetings.filter(g => g && g.trim()) : [];
    let usedAlternateFallback = false;
    if (looksLikePlaceholder(fm) && altGreetings.length > 0) {
        fm = altGreetings[0];
        usedAlternateFallback = true;
    }
    if (fm && fm.trim()) {
        // 智能探测你网页中实际使用的“开场白”输入框 ID
        const targetEl = document.getElementById('charGreeting') 
                      || document.getElementById('charFirstMessage') 
                      || document.getElementById('charFirstMes') 
                      || document.getElementById('charOpening')
                      || document.getElementById('charAutoReply');
                      
        if (targetEl) {
            targetEl.value = fm;
        } else {
            // 💡 终极兜底：如果你发现自己的编辑界面根本没有“开场白”这个格子，
            // 它会自动把开场白拼接到“人设/Persona”框的最下面，保证数据绝对不丢失！
            const personaEl = document.getElementById('charPersona');
            if (personaEl) {
                personaEl.value += `\n\n【角色开场白 / First Message】\n${fm}`;
            }
        }
    }
    // 保存全部候选开场白（哪怕这次用的是兜底逻辑选出来的那条），角色存好后可以在聊天里长按头像切换
    if (altGreetings.length > 0) {
        pendingImportedGreetings = altGreetings;
        if (usedAlternateFallback && altGreetings.length > 1) {
            setTimeout(() => alert(`💡 这张角色卡的"开场白"字段只是个占位标签，已自动改用卡里的候选开场白之一（一共有${altGreetings.length}个）。保存角色后，长按ta的头像可以随时切换成其它候选开场白重新开始。`), 400);
        }
    }

    // 5. 自动将读取到的图片做成头像！
    if (b64Image) {
        tempCropResults.charAvatar = b64Image;
        const preview = document.getElementById('charAvatarPreview');
        if (preview) { preview.src = b64Image; preview.style.display = 'block'; }
    }

    // 6. 智能侦测并挂载【世界书 Lorebook】—— 每条词条单独导入一本世界书，保留各自的关键词/优先级/递归设置，
    //    而不是把所有条目合并成一大坨（合并会丢失"哪条关键词触发哪段内容"的精确对应关系，还容易被字数上限截断）。
    let importedWbCount = 0, importedWbIds = [];
    if (data.character_book && data.character_book.entries && data.character_book.entries.length > 0) {
        const totalEntries = data.character_book.entries.length;
        if (confirm(`🎉 角色读取成功！\n系统检测到该角色卡内嵌了 ${totalEntries} 条世界观设定(Lorebook)。\n是否自动将其逐条导入到谷雨的世界书中并为其绑定？`)) {
            data.character_book.entries.forEach(entry => {
                if (entry.enabled === false || !entry.content) return; // 跳过被禁用或空内容的词条
                const keys = Array.isArray(entry.keys) ? entry.keys.filter(Boolean) : [];
                const wbId = Date.now() + Math.floor(Math.random() * 1000000);
                worldbooks.push({
                    id: wbId,
                    title: entry.comment || (keys[0] ? `关于"${keys[0]}"` : `${data.name || '导入角色'}的设定`),
                    content: entry.content,
                    isGlobal: false,
                    weight: typeof entry.insertion_order === 'number' ? Math.max(0, Math.min(100, entry.insertion_order)) : 50,
                    keywords: entry.constant ? '' : keys.join(','), // constant=true 代表原卡里就是"无条件生效"
                    priority: entry.insertion_order || 0,
                    group: entry.extensions?.group || '',
                    recursive: entry.extensions ? !entry.extensions.exclude_recursion : false
                });
                importedWbIds.push(wbId);
                importedWbCount++;
            });
        }
    }

    // 7. 智能侦测并导入【正则脚本 Regex Scripts】—— 部分角色卡/导出工具会把正则脚本一起塞进 data.extensions.regex_scripts
    let importedRegexCount = 0;
    const embeddedRegex = data.extensions?.regex_scripts;
    if (Array.isArray(embeddedRegex) && embeddedRegex.length > 0) {
        if (confirm(`🎉 还检测到该角色卡内嵌了 ${embeddedRegex.length} 条正则脚本。\n是否一并导入？`)) {
            embeddedRegex.forEach(rs => {
                if (!rs || !rs.findRegex) return;
                // 酒馆的 placement: 1=用户输入, 2=AI输出（不同工具编号可能略有差异，这里两个都勾上以防漏处理）
                const placements = Array.isArray(rs.placement) ? rs.placement : [];
                const target = placements.length === 0 ? 'both' : (placements.includes(1) && placements.includes(2) ? 'both' : (placements.includes(1) ? 'user_input' : 'ai_output'));
                const { pattern, flags } = parseRegexLiteral(rs.findRegex);
                regexScripts.push({
                    id: 'rx_' + Date.now() + Math.floor(Math.random() * 1000000),
                    name: rs.scriptName || '导入的正则脚本',
                    find: pattern,
                    flags: flags,
                    replace: rs.replaceString || '',
                    isRegex: true,
                    target,
                    enabled: rs.disabled !== true
                });
                importedRegexCount++;
            });
        }
    }

    if (importedWbCount > 0 || importedRegexCount > 0) {
        saveAllData();
        // 自动在多选框里把这些新诞生的世界书勾选上
        setTimeout(() => {
            const wbBox = document.getElementById('charWbCheckboxes');
            if (wbBox) wbBox.innerHTML = worldbooks.map(w => `<label style="display:flex; align-items:center; gap:4px; font-size:13px;"><input type="checkbox" value="${w.id}" class="wb-check" ${importedWbIds.includes(w.id) ? 'checked' : ''}> ${w.title}</label>`).join('');
            if (typeof renderRegexScriptsList === 'function') renderRegexScriptsList();
        }, 300);
        alert(`✅ 导入成功：${importedWbCount > 0 ? `${importedWbCount} 条世界书词条` : ''}${importedWbCount > 0 && importedRegexCount > 0 ? '、' : ''}${importedRegexCount > 0 ? `${importedRegexCount} 条正则脚本` : ''}。\n世界书已自动为这个角色勾选；正则脚本在"设置 → AI增强功能"里能看到。\n请浏览下方表格，没问题后点击最底部的【保存并生成角色】即可。`);
        return;
    }
    
    alert("🎉 角色卡读取成功！请浏览下方表格，没问题后点击最底部的【保存并生成角色】即可。");
}
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
    let relatedPairs = [];
    for (let char of myCharacters) {
        if (char.relations && char.relations.length > 0) {
            for (let rel of char.relations) {
                // 找到关系网里的目标角色
                let targetChar = myCharacters.find(c => c.id == rel.targetId || c.name === rel.targetName);
                if (targetChar && targetChar.id !== char.id) {
                    relatedPairs.push({ charA: char, charB: targetChar, relation: rel.relationText || '认识' });
                }
            }
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
                    <div class="chat-bubble ${isMe ? 'me' : 'other'}" style="pointer-events:none;">${msg.quote ? `<div class="chat-quote-bubble"><b>${msg.quote.name}</b>: ${renderMarkdownLite(msg.quote.text)}</div>` : ''}${renderMarkdownLite(msg.text)}${msg.mediaUrl ? `<img src="${msg.mediaUrl}" style="max-width:100%; border-radius:8px; margin-top:5px;">` : ''}</div>
                </div>
                ${isMe ? avatarHtml : ''}
            </div>`;
    }).join('');
    
    openModal('archivedChatViewModal');
}

// 💡 新增核心函数：把选中的旧聊天恢复为当前的主流聊天，同时把目前的聊天打包置换进档案库
function restoreArchivedChatToActive(charId, idx) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char || !char.archivedChats || !char.archivedChats[idx]) return;

    const confirmRestore = confirm(`确定要恢复这条历史时间线吗？\n\n温馨提示：你【目前正在聊】的这段对话会自动打包存入历史档案库，绝不会丢失。两边时间线会完成互换。`);
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

function deleteArchivedChat(charId, idx, e) {
    if (e) e.stopPropagation();
    if (!confirm('确定要删除这份历史聊天记录吗？删除后无法恢复！')) return;
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