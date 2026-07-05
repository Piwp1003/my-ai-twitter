let characters = JSON.parse(localStorage.getItem('myCharactersData')) || [];
let tempCropResults = {}; // 存储各类裁剪临时 Base64 数据
let siteLogoImg = null;   // 网站左上角 Logo 数据


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
// 修复：移动端长按(模拟右键)后，部分浏览器会紧接着补发一次 click 事件，
// 导致刚弹出的关注/星标菜单被外层 onclick 或全局关闭逻辑瞬间吞掉。用时间戳做个短暂的抑制窗口。
let suppressCardClickUntil = 0;
let memoryViewingCharId = null, currentSummaryCharId = null, chatContextMenuMsgIdx = null;
let currentDiaryCharId = null, currentDiaryTab = 'letter', tempGeneratedDiary = null, viewingDiaryId = null;

let currentUser = {
    id: 'me', name: "林", handle: "@my_account", bio: "这是我的个人签名...",persona: "", followers: 128, following: 50, location: "地球", website: "myblog.com", birthdate: "2000-01-01", verified: false, avatarImg: null, bgImg: null, avatarEmoji: "我", themeColor: "#1d9bf0", anonName: "匿名用户", anonId: Math.random().toString(36).substr(2,8).toUpperCase(), nudgeText: "的聪明脑袋", gender: "未知"
};
let tabloidAccount = {
    id: 'tabloid_admin', name: "X星圈内爆料", handle: "@tabloid_news", persona: "专业狗仔，娱乐圈纪委，看热闹不嫌事大", bio: "掌握全网第一手瓜。欢迎私信爆料。", followers: 99999, following: 0, location: "深渊暗网", website: "", birthdate: "2020-01-01", verified: true, avatarImg: null, bgImg: null, avatarEmoji: "📰", themeColor: "#f91880", isFollowing: false, isSpecialFollow: false
};

let globalPosts = [], globalNotifications = [], anonPosts = []; 
let trendingTags = ["#赛博朋克2026", "#科技改变生活", "#打工人的日常"];
let characterGroups = ["Vtuber", "程序员", "偶像", "校园", "都市"];
let worldbooks = [{ id: 1, title: "赛博纪元 2026", content: "这是一个高度发达但充满阶级矛盾的赛博朋克城市...", isGlobal: true }];
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

function formatPostText(text) {
if (!text) return '';
return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
                        <div class="stat-item">${likeSVG} ${formatStat(post.stats.likes)}</div>
                        <div class="stat-item">${viewSVG} ${formatStat(post.stats.views)}</div>
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
function openModal(id) { if (id === 'settingsModal' && typeof renderCharReplyToggleList === 'function') renderCharReplyToggleList(); document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function saveAllData() {
    const dataToSave = {
        myApiUrl, myApiKey, myModel, subApiUrl, subApiKey, subModel,
        myCharacters, globalPosts, anonPosts, characterGroups, globalEmoticons, worldbooks, globalChats, groupChats, currentUser, tabloidAccount, trendingTags,
        globalBgImage, globalBgOpacity, allowActionTags, chatWordLimit, postWordLimit, diaryWordLimit, letterWordLimit,
        globalNovels, novelCustomCSS, globalCustomCSS, tabloidPosts, siteLogoImg,
        forumThreads, // <--- 新增：保存论坛数据
        npcReplyProb, npcReplyMaxCount // <--- 修复：之前遗漏保存，导致NPC评论概率/条数设置刷新后失效
    };
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
                if (parsed.chatWordLimit !== undefined) chatWordLimit = parsed.chatWordLimit;
                if (parsed.postWordLimit !== undefined) postWordLimit = parsed.postWordLimit;
                if (parsed.diaryWordLimit !== undefined) diaryWordLimit = parsed.diaryWordLimit;
                if (parsed.letterWordLimit !== undefined) letterWordLimit = parsed.letterWordLimit;
                if (parsed.npcReplyProb !== undefined) npcReplyProb = parsed.npcReplyProb;
                if (parsed.npcReplyMaxCount !== undefined) npcReplyMaxCount = parsed.npcReplyMaxCount;
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
                const modelSelect = document.getElementById('modelSelect');
                if (modelSelect && myModel) { if (!Array.from(modelSelect.options).some(opt => opt.value === myModel)) modelSelect.innerHTML += `<option value="${myModel}">${myModel}</option>`; modelSelect.value = myModel; }
                const subModelSelect = document.getElementById('subModelSelect');
                if (subModelSelect && subModel) { if (!Array.from(subModelSelect.options).some(opt => opt.value === subModel)) subModelSelect.innerHTML += `<option value="${subModel}">${subModel}</option>`; subModelSelect.value = subModel; }
            } catch (e) { console.error("API 设置恢复出错:", e); }

            try { if (parsed.myCharacters) { myCharacters = parsed.myCharacters; myCharacters.forEach(c => { if (c.diaryData && typeof c.diaryData.letter === 'string') { c.diaryData = { letters: c.diaryData.letter ? [{ id: 'old_l', title: '往期信件', date: Date.now(), content: c.diaryData.letter }] : [], diaries: c.diaryData.diary ? [{ id: 'old_d', title: '往期日记', date: Date.now(), content: c.diaryData.diary }] : [] }; } }); } } catch (e) { console.error("角色数据恢复出错:", e); }
            try { if (parsed.globalPosts) globalPosts = parsed.globalPosts; } catch (e) { console.error(e); }
            try { if (parsed.anonPosts) anonPosts = parsed.anonPosts; } catch (e) { console.error(e); }
            try { if (parsed.characterGroups) characterGroups = parsed.characterGroups; } catch (e) { console.error(e); }
            try { if (parsed.globalEmoticons) globalEmoticons = parsed.globalEmoticons; } catch (e) { console.error(e); }
            try { if (parsed.worldbooks) worldbooks = parsed.worldbooks; } catch (e) { console.error(e); }
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
    const data = { myApiUrl, myApiKey, myModel, subApiUrl, subApiKey, subModel, currentUser, myCharacters, trendingTags, globalPosts, anonPosts, globalNotifications, characterGroups, worldbooks, globalEmoticons, globalChats, groupChats, globalBgImage, globalBgOpacity, allowActionTags, chatWordLimit, postWordLimit, diaryWordLimit, letterWordLimit, globalNovels, novelCustomCSS, globalCustomCSS, tabloidPosts, siteLogoImg };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = "twitter_ai_backup.json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}
function triggerImport() { document.getElementById('importFileInput').click(); }
function importData(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            ['myApiUrl','myApiKey','myModel','subApiUrl','subApiKey','subModel','trendingTags','globalPosts','anonPosts','globalNotifications','characterGroups','worldbooks','globalEmoticons','globalChats','groupChats','globalBgImage','globalBgOpacity','allowActionTags','chatWordLimit','postWordLimit','diaryWordLimit','letterWordLimit','globalNovels','novelCustomCSS','globalCustomCSS','tabloidPosts','siteLogoImg'].forEach(k => { if(data[k] !== undefined) eval(`${k} = data[k];`); });
            if(data.currentUser) { currentUser = { ...currentUser, ...data.currentUser }; if(!currentUser.gender) currentUser.gender = "未知"; }
            if(data.myCharacters) { myCharacters = data.myCharacters; myCharacters.forEach(c => { if(c.diaryData && typeof c.diaryData.letter === 'string') c.diaryData = { letters: c.diaryData.letter ? [{ id: 'old_l', title: '往期信件', date: Date.now(), content: c.diaryData.letter }] : [], diaries: c.diaryData.diary ? [{ id: 'old_d', title: '往期日记', date: Date.now(), content: c.diaryData.diary }] : [] }; }); }
            updateUserMiniProfile(); if(typeof renderTrends === 'function') renderTrends(); updateGlobalBgStyles(); applyGlobalCSS(); applyNovelCSS(); updateSiteLogo(); switchMainView('home'); updateCharSelects(); closeModal('settingsModal'); alert("数据恢复成功！欢迎回来。"); saveAllData();
        } catch(err) { alert("文件格式错误，恢复失败！"); }
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
    npcReplyProb = parseFloat(document.getElementById('npcProbInput').value); 
    if (isNaN(npcReplyProb)) npcReplyProb = 0.4; 
    npcReplyMaxCount = parseInt(document.getElementById('npcMaxCountInput').value); 
    if (isNaN(npcReplyMaxCount)) npcReplyMaxCount = 3;
    
    globalCustomCSS = document.getElementById('globalCSSInput').value;
    applyGlobalCSS();
    
    if(!myApiUrl || !myApiKey) return alert("请至少完整填写主 API 的接口地址和密钥！");
    saveAllData(); alert("设置保存成功！"); closeModal('settingsModal');
}

function openUserProfileModal() {
    ['myName','myHandle','myPersona','myBio','myFollowers','myFollowing','myLocation','myWebsite','myBirthdate','myAnonName','myAnonId','myNudgeText','myGender','myPersona'].forEach(id => {
        const prop = id.replace('my', '').charAt(0).toLowerCase() + id.replace('my', '').slice(1);
        if(document.getElementById(id)) document.getElementById(id).value = currentUser[prop] || '';
    });
    document.getElementById('myVerified').checked = currentUser.verified || false;
    
    if(currentUser.avatarImg) {
        document.getElementById('myAvatarPreview').src = currentUser.avatarImg;
        document.getElementById('myAvatarPreview').style.display = 'block';
    } else { document.getElementById('myAvatarPreview').style.display = 'none'; }
    
    if(currentUser.bgImg) {
        document.getElementById('myBgPreview').src = currentUser.bgImg;
        document.getElementById('myBgPreview').style.display = 'block';
    } else { document.getElementById('myBgPreview').style.display = 'none'; }
    
    tempCropResults.myAvatar = currentUser.avatarImg || null;
    tempCropResults.myBg = currentUser.bgImg || null;

    openModal('userProfileModal');
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
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div'); toast.className = `toast-item ${isAnon ? 'anon-toast' : ''}`;
    toast.onclick = () => {
        if (chatCharId) { switchMainView('chat'); switchChatSession(chatCharId); } 
        else if (postId && isAnon) { switchMainView('anonForum'); } else if (postId) { switchMainView('postDetail', postId); }
        toast.remove();
    };
    toast.innerHTML = `${avatarHtml}<div class="toast-content"><div class="toast-title">${titleText}</div>${contentText ? `<div class="toast-desc">${contentText}</div>` : ''}</div>`;
    container.appendChild(toast); setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5500);
}

let pendingChatAttachment = null; let currentlyTypingChars = new Set();

function updateTypingIndicator() {
    let ind = document.getElementById('chatTypingIndicator');
    if (currentlyTypingChars.size > 0) { document.getElementById('typingCharName').innerText = Array.from(currentlyTypingChars).join(', '); ind.style.display = 'block'; } 
    else { ind.style.display = 'none'; }
}

function renderChatCharList() {
    const container = document.getElementById('chatCharRow');
    let html = `<div class="chat-char-item" onclick="openCreateGroupModal()"><div class="avatar" style="background:white; color:#1d9bf0; border:2px dashed #1d9bf0; font-size:24px; display:flex; justify-content:center; align-items:center; width:50px; height:50px;">+</div><div class="chat-char-name" style="font-size:12px; margin-top:5px;">建群</div></div>`;
    [...groupChats, ...myCharacters].forEach(x => {
        let hasUnread = globalChats[x.id] && globalChats[x.id].some(m => m.sender !== 'me' && m.sender !== 'system' && (!m.readBy || !m.readBy.includes('me')));
        let unreadHtml = hasUnread ? `<div style="position:absolute; top:-2px; right:-2px; width:14px; height:14px; background:#f91880; border-radius:50%; border:2px solid white; z-index:2;"></div>` : '';
        html += `<div class="chat-char-item ${currentChatSessionId == x.id ? 'active' : ''}" onclick="switchChatSession('${x.id}')">
            <div style="position:relative; display:inline-block;" onclick="openChatOptions('${x.id}', event)">${x.members ? getGroupAvatarHTML(x, 50) : getAvatarHTML(x, 50)}${unreadHtml}</div>
            <div class="chat-char-name" style="font-size:12px; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;">${x.name}</div>
        </div>`;
    });
    container.innerHTML = html;
}

function openChatOptions(id, event) { if (event) event.stopPropagation(); currentSummaryCharId = id; const isGroup = String(id).startsWith('g_'); document.getElementById('btnChatSummaryOption').style.display = isGroup ? 'none' : 'block'; openModal('chatTxtModal'); }

function exportChatTxt() {
    if(!currentSummaryCharId) return; let session = globalChats[currentSummaryCharId] || []; if(session.length === 0) return alert("当前聊天记录为空！");
    let txt = session.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender === 'me' ? currentUser.name : (m.sender === 'system' ? '系统' : (myCharacters.find(c=>c.id==m.sender)?.name || m.sender))}: ${m.text}`).join('\n');
    let blob = new Blob([txt], { type: 'text/plain' }); let url = URL.createObjectURL(blob); let a = document.createElement('a'); a.href = url; a.download = `chat_${currentSummaryCharId}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
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
    return session.slice(-10).filter(m => m.sender !== 'system').map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender === 'me' ? "用户" : "你"}: ${m.text}`).join('\n');
}

function openChatSummary(charId) {
    const char = myCharacters.find(c => c.id == charId); if (!char) return; document.getElementById('chatSummaryTitle').innerText = `💬 与 ${char.name} 的聊天总结`;
    document.getElementById('chatSummaryEditArea').value = char.chatSummary || ''; openModal('chatSummaryModal');
}

function saveChatSummaryManual() { const char = myCharacters.find(c => c.id == currentSummaryCharId); if (!char) return; char.chatSummary = document.getElementById('chatSummaryEditArea').value.trim(); saveAllData(); alert('聊天总结已保存！'); closeModal('chatSummaryModal'); }


function switchChatSession(id) { currentChatSessionId = id.toString(); renderChatCharList(); document.getElementById('chatInputArea').style.display = 'flex'; renderChatMessages(); }

async function triggerNudge(sessionId, targetId) {
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    let sysText = targetId === 'me' ? `"${currentUser.name}" 拍了拍 自己 ${currentUser.nudgeText || '的脑袋'}` : `"${currentUser.name}" 拍了拍 "${myCharacters.find(c => c.id == targetId).name}" ${myCharacters.find(c => c.id == targetId).nudgeText || '的肩膀'}`;
    globalChats[sessionId].push({ sender: 'system', text: sysText, timestamp: Date.now() }); renderChatMessages(); saveAllData();

    const api = getApiConfig(true);
    if (targetId !== 'me' && api.key) {
        let targetChar = myCharacters.find(c => c.id == targetId);
        let prompt = `${buildBasePrompt(targetChar, false)}刚刚用户在聊天中双击头像“拍了拍”你。\n系统提示：${sysText}\n你可以选择回复或者输出 [NUDGE] 来反击。字数${chatWordLimit}字以内。`;
        try {
            if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { currentlyTypingChars.add(targetChar.name); updateTypingIndicator(); }
            let res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) });
            let data = await res.json(); let repText = data.choices?.[0]?.message?.content?.trim() || "";
            currentlyTypingChars.delete(targetChar.name); updateTypingIndicator();
            
            if (repText.toUpperCase().startsWith("NO") && repText.length < 5) return;
            if (repText.includes("[NUDGE]")) { repText = repText.replace(/\[NUDGE\]/ig, '').trim(); globalChats[sessionId].push({ sender: 'system', text: `"${targetChar.name}" 拍了拍 "${currentUser.name}" ${currentUser.nudgeText || '的脑袋'}`, timestamp: Date.now() }); }
            if (repText) globalChats[sessionId].push({ sender: targetChar.id, text: repText, timestamp: Date.now(), readBy: [] });
            if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { renderChatMessages(); } else { renderChatCharList(); }
            saveAllData();
        } catch (e) { currentlyTypingChars.delete(targetChar.name); updateTypingIndicator(); }
    }
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
        if (isMe) {
            let readCount = Array.isArray(msg.readBy) ? msg.readBy.length : 0;
            if (isGroup) { let unreadCount = totalMembers - readCount; readStatusHtml = unreadCount > 0 ? `<div style="font-size:10px; color:#888; margin-top:2px;">${unreadCount}人未读</div>` : `<div style="font-size:10px; color:#1d9bf0; margin-top:2px;">全部已读</div>`; } 
            else { readStatusHtml = readCount > 0 ? `<div style="font-size:10px; color:#1d9bf0; margin-top:2px;">已读</div>` : `<div style="font-size:10px; color:#888; margin-top:2px;">未读</div>`; }
        }
        let avatarHtml = !isMe && senderChar ? `<div style="cursor:pointer;" ondblclick="triggerNudge('${currentChatSessionId}', '${senderChar.id}')" title="双击拍一拍">${getAvatarHTML(senderChar, 40)}</div>` : `<div style="cursor:pointer;" ondblclick="triggerNudge('${currentChatSessionId}', 'me')" title="双击拍一拍">${getAvatarHTML(currentUser, 40)}</div>`;
        return `
            <div class="chat-msg-row ${isMe ? 'me' : 'other'}">
                ${!isMe ? avatarHtml : ''}
                <div class="chat-bubble-wrapper" style="align-items: ${isMe ? 'flex-end' : 'flex-start'};">
                    <div class="chat-sender-name" style="font-size:10px;">${!isMe && isGroup ? senderChar?.name : ''} ${timeStr}</div>
                    <div class="chat-bubble ${isMe ? 'me' : 'other'}" oncontextmenu="showChatContextMenu(event, ${idx})">${msg.quote ? `<div class="chat-quote-bubble"><b>${msg.quote.name}</b>: ${msg.quote.text}</div>` : ''}${msg.text}${msg.mediaUrl ? `<img src="${msg.mediaUrl}">` : ''}</div>
                    ${isMe ? readStatusHtml : ''}
                </div>
                ${isMe ? avatarHtml : ''}
            </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

function showChatContextMenu(e, msgIdx) {
    e.preventDefault(); let msg = globalChats[currentChatSessionId][msgIdx]; if (!msg || msg.sender === 'system') return;
    chatContextMenuTarget = { name: msg.sender === 'me' ? currentUser.name : (myCharacters.find(c => c.id == msg.sender)?.name || '未知'), text: msg.text }; chatContextMenuMsgIdx = msgIdx; 
    const menu = document.getElementById('chatContextMenu');
    menu.innerHTML = `<button class="context-btn" onclick="contextActionReplyChat()">引用回复</button>${msg.sender === 'me' ? '<button class="context-btn" onclick="contextActionEditChat()">重新编辑</button>' : '<button class="context-btn" onclick="contextActionRegenerateChat()">重新生成</button>'}<button class="context-btn" style="color:#f91880;" onclick="contextActionDeleteChat()">删除消息</button>`;
    menu.style.display = 'flex'; let x = e.pageX, y = e.pageY; if(x + 100 > window.innerWidth) x -= 100; if(y + 100 > window.innerHeight) y -= 100; menu.style.left = x + 'px'; menu.style.top = y + 'px';
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

async function contextActionRegenerateChat() {
    if (chatContextMenuMsgIdx === null) return; const idx = chatContextMenuMsgIdx, sessionId = currentChatSessionId;
    document.getElementById('chatContextMenu').style.display = 'none'; globalChats[sessionId].splice(idx);
    let lastUserText = "用户发来了消息"; for (let i = globalChats[sessionId].length - 1; i >= 0; i--) { if (globalChats[sessionId][i].sender === 'me') { lastUserText = globalChats[sessionId][i].text; break; } }
    renderChatMessages(); saveAllData(); await triggerAIBatchReply(sessionId, lastUserText);
}

function contextActionReplyChat() { if (!chatContextMenuTarget) return; pendingChatQuote = chatContextMenuTarget; document.getElementById('chatQuoteName').innerText = pendingChatQuote.name; document.getElementById('chatQuoteText').innerText = pendingChatQuote.text; document.getElementById('chatQuotePreview').style.display = 'flex'; document.getElementById('chatInput').focus(); chatContextMenuTarget = null; document.getElementById('chatContextMenu').style.display = 'none'; }
function clearChatQuote() { pendingChatQuote = null; document.getElementById('chatQuotePreview').style.display = 'none'; }

async function sendChatMessage() {
    if (!currentChatSessionId) return; const sessionId = currentChatSessionId; const input = document.getElementById('chatInput'); const text = input.value.trim();
    if (!text && !pendingChatAttachment) return;
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: 'me', text: text, timestamp: Date.now(), mediaUrl: pendingChatAttachment, readBy: [], quote: pendingChatQuote });
    let triggerText = text; input.value = ''; clearAttachment('chat'); clearChatQuote(); renderChatMessages(); saveAllData(); checkAndAutoSummarizeChat(sessionId);
    await triggerAIBatchReply(sessionId, triggerText);
}

async function triggerAIBatchReply(sessionId, triggerText) {
    const api = getApiConfig(true); 
    if (!api.key) return alert("请先配置 API Key！");
    
    let emoPrompt = getEmoticonPrompt(), isGroup = sessionId.startsWith('g_'), targetChars = [];
    if (isGroup) { let groupObj = groupChats.find(x => x.id === sessionId); if (groupObj) targetChars = groupObj.members.map(id => myCharacters.find(c => c.id == id)).filter(Boolean); } 
    else { let c = myCharacters.find(c => c.id == sessionId); if (c) targetChars = [c]; }

    let currentBatchText = triggerText, anyCharReplied = false;
    
    for (let char of targetChars) {
        let isMentioned = isGroup ? (currentBatchText.includes('@所有人') || currentBatchText.includes('@' + char.name) || ((char.handle||'').replace('@','').toLowerCase() && currentBatchText.toLowerCase().includes('@' + (char.handle||'').replace('@','').toLowerCase()))) : true;
        
        let recentHistory = globalChats[sessionId].slice(-10).map(m => m.sender === 'system' ? m.text : `${m.sender === 'me' ? currentUser.name : (myCharacters.find(c=>c.id==m.sender)?.name || '未知')}: ${m.quote ? `[回复 ${m.quote.name}: ${m.quote.text}] ` : ''}${m.text}`).join('\n');
        let replyRule = isMentioned ? `你被艾特了（或这是私聊），你【必须】回复，不能输出"NO"。如果不想理人就用简短敷衍的话。` : (isGroup ? `如果觉得群里没人理你且无需回复，直接输出"NO"。` : `如果不知道怎么回可以输出"NO"。`);
        
        let prompt = `${buildBasePrompt(char, true)}以下是我们${isGroup?'群里':''}最近的聊天记录：\n${recentHistory}\n请根据你的性格直接回复最新消息。${replyRule}\n你可以通过输出 [NUDGE] 主动拍一拍用户。也可艾特别人。\n${emoPrompt}\n字数${chatWordLimit}字以内。`;

        try {
            if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { currentlyTypingChars.add(char.name); updateTypingIndicator(); }
            let res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) });
            let data = await res.json(); 
            
            // 🛑 修复：直接拦截 API 报错并提示，而不是默默地变成“嗯”
            if (data.error) {
                currentlyTypingChars.delete(char.name); updateTypingIndicator();
                console.error("API 报错:", data.error);
                alert(`⚠️ 聊天 API 报错（${char.name} 回复失败）:\n${data.error.message || JSON.stringify(data.error)}\n请检查 API 余额或接口地址！`);
                continue; 
            }

            let repText = data.choices?.[0]?.message?.content?.trim() || "";
            currentlyTypingChars.delete(char.name); updateTypingIndicator();

            if (isMentioned && repText.toUpperCase().startsWith("NO") && repText.length < 5) repText = char.autoReplyText?.trim() || "嗯，我看到了。";
            else if (!isMentioned && repText.toUpperCase().startsWith("NO") && repText.length < 5) continue;

            let repMediaUrl = null, emoMatch = repText.match(/\[EMO:(emo_\w+)\]/i);
            if (emoMatch) { let emo = globalEmoticons.find(e => e.id === emoMatch[1]); if (emo) repMediaUrl = emo.url; repText = repText.replace(emoMatch[0], '').trim(); }
            if (repText.includes("[NUDGE]")) { repText = repText.replace(/\[NUDGE\]/ig, '').trim(); globalChats[sessionId].push({ sender: 'system', text: `"${char.name}" 拍了拍 "${currentUser.name}" ${currentUser.nudgeText || '的脑袋'}`, timestamp: Date.now() }); anyCharReplied = true; }
            
            if (!repText && isMentioned) repText = char.autoReplyText?.trim() || "嗯。";

            if (repText || repMediaUrl) {
                globalChats[sessionId].push({ sender: char.id, text: repText, timestamp: Date.now(), mediaUrl: repMediaUrl, readBy: [] }); anyCharReplied = true; currentBatchText += `\n${char.name}: ${repText}`;
                if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { renderChatMessages(); } 
                else {
                    let avatarHtml = isGroup ? getGroupAvatarHTML(groupChats.find(x=>x.id===sessionId), 80) : getAvatarHTML(char, 80);
                    let titleText = isGroup ? `[${groupChats.find(x=>x.id===sessionId).name}] ${char.name}` : `${char.name} 发来消息`;
                    showToast(avatarHtml, titleText, repText || "[图片/表情/拍一拍]", null, sessionId);
                    globalNotifications.unshift({ text: `<b>${char.name}</b> ${isGroup ? '在群聊中' : ''}给您发来消息`, postId: null, chatCharId: sessionId, timestamp: Date.now() }); unreadNotifs++; updateNotifBadge(); renderChatCharList();
                }
                saveAllData(); checkAndAutoSummarizeChat(sessionId);
            }
        } catch(e) { 
            // 🛑 修复：网络请求失败也弹窗提示
            currentlyTypingChars.delete(char.name); updateTypingIndicator(); 
            console.error("网络/解析错误:", e);
            alert(`⚠️ 网络请求失败（${char.name}）:\n${e.message}\n请检查 API 地址(如跨域问题)或网络连接。`);
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
    
    let newG = { id: 'g_' + Date.now(), name: name, members: selected, avatarImg: tempCropResults.groupAvatar || null };
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
function buildBasePrompt(char, includeChatSummary = true) {
    let prompt = `你是"${char.name}"，你的核心人设：${char.persona}。\n`;
    
    // 1. 结合全局与局部世界书
    prompt += getCharacterWorldbookText(char);
    // 2. 结合用户的性别与人设
    prompt += getUserContextPrompt();
    
    // 3. 结合该角色的推文总结记忆
    if (char.memorySummary) {
        prompt += `\n【你的专属推文记忆总结】：\n${char.memorySummary}\n`;
    }
    
    // 4. 结合该角色与用户的聊天记录总结
    if (includeChatSummary && char.chatSummary) {
        prompt += `\n【与用户的历史聊天总结】：\n${char.chatSummary}\n`;
    }
    
    let actionRule = allowActionTags ? "你可以使用括号(如()或【】)来进行动作描写和心理描写。" : "不要有多余的动作描写或心理描写，直接输出说话或正文内容。";
    prompt += `\n【格式规则】：${actionRule}\n`;
    
    return prompt;
}

function getCharacterWorldbookText(char) {
    if (!worldbooks) return '';
    // 获取自选生效的全局世界书（排除了被手动关闭的）
    let globalWbs = worldbooks.filter(w => w.isGlobal);
    // 获取该角色单人挂载的局部世界书
    let localWbs = char && char.worldbooks ? worldbooks.filter(w => char.worldbooks.includes(w.id) && !w.isGlobal) : [];
    let combined = [...globalWbs, ...localWbs];
    
    if (combined.length === 0) return '';
    return `【必须强制结合的世界书背景】：\n` + combined.map(w => `- ${w.title}: ${w.content}`).join('\n') + `\n你在生成任何内容时都必须严格基于上述世界观。\n\n`;
}

function renderWorldbookCards() {
    const container = document.getElementById('worldbookContainer');
    if(worldbooks.length === 0) { container.innerHTML = '<div class="empty-state" style="padding:20px;">暂无世界书，请添加设定</div>'; return; }
    container.innerHTML = worldbooks.map((w, i) => `
        <div class="wb-card">
            <div style="position:absolute; top:4px; right:4px; display:flex; gap:8px;">
                <button style="background:none; border:none; color:#1d9bf0; cursor:pointer; font-size:14px;" onclick="editWorldbook(${w.id})">✏️</button>
                <button style="background:none; border:none; color:#f91880; cursor:pointer; font-size:16px;" onclick="deleteWorldbook(${w.id})">×</button>
            </div>
            <div class="wb-title">${w.title}</div>
            <div class="wb-content">${w.content}</div>
            <div style="margin-top:auto; padding-top:8px; border-top:1px dashed #eff3f4; text-align:center;">
                <button class="btn-edit-small" style="width:100%; transition:0.2s; ${w.isGlobal ? 'background:#1d9bf0; color:white;' : 'background:rgba(255,255,255,0.8); color:#1d9bf0;'}" onclick="toggleWorldbookGlobal(${w.id})">
                    ${w.isGlobal ? '🌟 全局已生效' : '设为全局生效'}
                </button>
            </div>
        </div>`).join('');
}

function toggleWorldbookGlobal(id) {
    let wb = worldbooks.find(w => w.id === id);
    if(wb) { 
        wb.isGlobal = !wb.isGlobal; 
        saveAllData(); 
        renderWorldbookCards();
    }
}

function editWorldbook(id) {
    const wb = worldbooks.find(w => w.id === id);
    if(!wb) return;
    document.getElementById('editWbId').value = wb.id;
    document.getElementById('newWbTitle').value = wb.title;
    document.getElementById('newWbContent').value = wb.content;
    document.getElementById('wbFormTitle').innerText = "编辑世界书设定";
    document.getElementById('saveWbBtn').innerText = "保存修改";
    document.getElementById('cancelWbBtn').style.display = 'block';
}

function cancelEditWb() {
    document.getElementById('editWbId').value = '';
    document.getElementById('newWbTitle').value = '';
    document.getElementById('newWbContent').value = '';
    document.getElementById('wbFormTitle').innerText = "新增世界书设定";
    document.getElementById('saveWbBtn').innerText = "添加并保存";
    document.getElementById('cancelWbBtn').style.display = 'none';
}

function saveWorldbook() {
    const id = document.getElementById('editWbId').value;
    const title = document.getElementById('newWbTitle').value.trim();
    const content = document.getElementById('newWbContent').value.trim();
    
    if(!title || !content) return alert("请完整填写标题和内容");
    
    if (id) {
        const wb = worldbooks.find(w => w.id == id);
        if (wb) { wb.title = title; wb.content = content; } // 保留原来的 isGlobal 状态
    } else {
        // 新增世界书默认不全局生效
        worldbooks.push({ id: Date.now(), title, content, isGlobal: false });
    }
    
    cancelEditWb();
    renderWorldbookCards(); 
    saveAllData();
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

function openGroupManagerModal() { renderGroupList(); closeModal('characterCenterModal'); openModal('groupManagerModal'); }
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
    const char = myCharacters.find(c => c.id == charId); if (!char) return; memoryViewingCharId = charId;
    document.getElementById('memoryModalTitle').innerText = `📖 ${char.name} 的记忆总结`;
    document.getElementById('memoryContentWrapper').innerHTML = `<textarea id="memoryEditArea" class="memory-edit-area" placeholder="在此输入...">${char.memorySummary || ''}</textarea>`; openModal('memoryModal');
}
function saveCharMemory() { const char = myCharacters.find(c => c.id == memoryViewingCharId); if (!char) return; char.memorySummary = document.getElementById('memoryEditArea').value.trim(); saveAllData(); alert('记忆已成功保存！'); closeModal('memoryModal'); }


async function checkAndAutoSummarizeChat(sessionId) {
    if (sessionId.toString().startsWith('g_')) return;
    let session = globalChats[sessionId]; if (!session || session.length === 0) return;
    
    let validMsgs = session.filter(m => m.sender !== 'system'); 
    if (validMsgs.length === 0 || validMsgs.length % 20 !== 0) return;
    
    let char = myCharacters.find(c => c.id == sessionId);
    const api = getApiConfig(true); if (!char || !api.key) return;

    let recent20 = validMsgs.slice(-20).map(m => (m.sender === 'me' ? "用户: " : char.name + ": ") + m.text).join('\n');
    let prompt = `请简要总结以下用户与"${char.name}"的最近20条对话内容，提取出关键信息、当前话题和双方的情感状态（100字以内）。\n\n对话记录：\n${recent20}`;

    try {
        let res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) });
        let data = await res.json(); if(data.error) return; 
        let newSummary = data.choices?.[0]?.message?.content?.trim() || ""; if(!newSummary) return;
        
        // 数组化存储，加入时间戳，最多保留 20 轮
        let summaryArr = char.chatSummary ? char.chatSummary.split('\n').filter(line => line.trim()) : [];
        summaryArr.push(`[${new Date().toLocaleString()}] ${newSummary}`);
        if (summaryArr.length > 20) {
            summaryArr = summaryArr.slice(summaryArr.length - 20); // 剔除最早的记忆
        }
        char.chatSummary = char.chatSummary.join('\n');
        saveAllData();
    } catch(e) { console.error("聊天总结失败", e); }
}

async function updateCharMemoryAsync(char) {
    if (!myApiKey) return; 
    const posts = getCharRecentPosts(char.id, 20); if (posts.length === 0) return; 
    const prompt = `你是记忆管理AI。请用100字以内，总结推特用户"${char.name}"（人设：${char.persona}）最近20条帖子的关注点、情绪和经历规律：\n${posts.map((p, i) => `${i+1}. ${p.text}`).join('\n')}`;
    
    try {
        const res = await fetch(`${myApiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${myApiKey}` }, body: JSON.stringify({ model: myModel, messages: [{ role: "user", content: prompt }], max_tokens: 200 }) });
        const data = await res.json(); let newSum = data.choices?.[0]?.message?.content?.trim();
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
                for(let k = 0; k < char.postFreq.count; k++) charsToPost.push(char); 
            }
        }
        
        if (charsToPost.length > 0 && typeof executeGeneration === 'function') { 
            await executeGeneration(charsToPost.slice(0, 3)); 
        }
    }, 15000); // 每15秒轮询一次检测
}
let isProactiveChatRunning = false;
function startProactiveChatTimer() {
    setInterval(async () => {
        const api = getApiConfig(true); if (!api.key || isProactiveChatRunning) return;
        let now = Date.now(), due = myCharacters.filter(char => {
            if (!char.chatFreq || !char.chatFreq.interval || char.chatFreq.interval <= 0) return false;
            let reqMs = char.chatFreq.interval * (char.chatFreq.unit === 'minute' ? 60000 : char.chatFreq.unit === 'hour' ? 3600000 : 86400000);
            if (!char.lastChatProactiveTime) char.lastChatProactiveTime = now; return now - char.lastChatProactiveTime >= reqMs;
        });
        if (due.length === 0) return; isProactiveChatRunning = true;
        for (let char of due.slice(0, 2)) { char.lastChatProactiveTime = now; await sendProactiveChatMessage(char); }
        isProactiveChatRunning = false; saveAllData();
    }, 20000);
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
    let blob = new Blob([txt], { type: 'text/plain' });
    let url = URL.createObjectURL(blob); let a = document.createElement('a'); a.href = url; a.download = `${novel.title || '未命名故事'}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
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

function deleteTabloid(postId, event) {
    if (event) event.stopPropagation();
    if (confirm('确定要删除这条爆料吗？该操作不可逆！')) {
        tabloidPosts = tabloidPosts.filter(p => p.id != postId);
        saveAllData();
        if (document.getElementById('view-tabloid').style.display !== 'none') renderTabloidPosts();
        if (document.getElementById('view-post-detail').style.display !== 'none') switchMainView('tabloid');
        if (currentProfileId === 'tabloid_admin' && document.getElementById('view-profile').style.display !== 'none' && typeof renderProfileFeed === 'function') renderProfileFeed();
    }
}

function hideAllViews() {
    ['home','profile','tag','search','notifications','post-detail','following-list','chat','anon-forum','diary','novel','tabloid','mobile-trends'].forEach(v => { const el = document.getElementById(`view-${v}`); if(el) el.style.display = 'none'; });
    ['nav-home','nav-following','nav-notif','nav-myprofile','nav-chat','nav-anon','nav-diary','nav-novel','nav-tabloid'].forEach(id => { const el = document.getElementById(id); if(el) el.className = 'nav-item'; });
    ['mnav-home','mnav-notif','mnav-chat','mnav-search'].forEach(id => { const el = document.getElementById(id); if(el) el.className = 'mnav-item'; });
    document.getElementById('rightPanelTrend').style.display = 'block'; document.getElementById('rightPanelProfile').style.display = 'none';
}

const mobileViewTitles = { home:'主页', anonForum:'匿名论坛', diary:'信件与日记', novel:'故事', tabloid:'营销号', profile:'个人资料', tag:'标签', search:'搜索', notifications:'通知', postDetail:'帖子', followingList:'我的关注', chat:'聊天' };

function switchMainView(viewId, param = null) {
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

    const btn = document.getElementById('btnGenerateDiary'); btn.innerText = "思念自笔尖流出 "; btn.disabled = true;
    let recentChat = getRecentChatContext(char.id); 
    let recentPosts = getCharRecentPosts(char.id, 15).map(p => p.text).join('\n');
    let targetType = currentDiaryTab === 'letter' ? '寄给用户' + currentUser.name + '的信' : '私密的个人日记';
    let limit = currentDiaryTab === 'letter' ? letterWordLimit : diaryWordLimit;
    
    // 💡 处理用户上传的 TXT 素材
    let txtContext = diaryUploadedTxtContent ? `\n【用户上传的特殊参考素材，请仔细阅读并将其中的信息融入正文中】：\n${diaryUploadedTxtContent.slice(0, 6000)}` : '';

    // 💡 核心升级：调用 buildBasePrompt(char, true) 自动带入 [人设、全局世界书、局部世界书、20条推文记忆、20条聊天总结]
    let prompt = `${buildBasePrompt(char, true)}请你结合上述你的核心人设、世界观背景、推文记忆总结、历史聊天总结，以及以下近期的动态、聊天记录${diaryUploadedTxtContent ? '和用户上传的参考素材' : ''}，写一封${targetType}。字数${limit}字左右。要深刻体现你的性格情感。
最近推文：\n${recentPosts || '暂无'}\n近期聊天记录：\n${recentChat || '暂无'}${txtContext}

【极为严格的格式要求】：请仅返回合法 JSON 格式，决不要使用 \`\`\`json 包裹，也不要返回除 JSON 之外的任何说明废话！
{"title":"这里写吸引人的标题","content":"这里写正文内容，段落之间用\\n分隔"}`;
    
    try {
        let res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) });
        let data = await res.json(); let raw = data.choices?.[0]?.message?.content?.trim();
        if(raw) {
            raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
            let parsed = { title: currentDiaryTab === 'letter' ? '新信件' : '新日记', content: raw };
            try { let jsonMatch = raw.match(/\{[\s\S]*\}/); if(jsonMatch) parsed = JSON.parse(jsonMatch[0]); } catch(e) {}
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
    if (!novel || novel.chapters.length === 0) return alert("还没有生成任何章节，快去生成吧！");

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
    btn.innerText = "笔耕不辍中... "; btn.disabled = true;

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
        let res = await fetch(`${api.url}/chat/completions`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, 
            body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) 
        });
        let data = await res.json();
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
        btn.innerText = "🪄 生成下一章"; btn.disabled = false;
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
    else if (currentProfileTab === 'highlights') postsToShow = globalPosts.filter(p => p.char.id == currentProfileId && parseStat(p.stats.views) >= 100000);
    
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

function renderSearchPosts(keyword) {
    let kw = keyword.toLowerCase(); let searchRes = globalPosts.filter(p => p.text.toLowerCase().includes(kw) || p.char.name.toLowerCase().includes(kw) || p.char.handle.toLowerCase().includes(kw));
    document.getElementById('searchFeedSection').innerHTML = searchRes.length ? generatePostHTML(searchRes) : '<div class="empty-state">未找到相关帖子</div>';
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
            
            // 获取用户当前对该条评论的点赞状态
            let isLiked = r.likedBy ? r.likedBy.includes('me') : (r.liked || false);

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
                    ${getActionIconsHTML(r.likes || 0, isLiked, idx, postId, depth > 0)}
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

function isCoolPersona(persona) { const coolKeywords = ['高冷', '内向', '冷淡', '寡言', '沉默', '冷漠', '不善言辞', '宅', '独来独往', '不爱说话']; return coolKeywords.some(kw => persona.includes(kw)); }

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
            let res = await fetch(`${myApiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${myApiKey}` }, body: JSON.stringify({ model: myModel, messages: [{ role: "user", content: prompt }] }) });
            let data = await res.json();
            let match = data.choices?.[0]?.message?.content?.match(/\{[\s\S]*\}/);
            if (match) {
                let aiStats = JSON.parse(match[0]);
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
        let chatSummaryContext = char.chatSummary ? `\n【历史聊天总结】：${char.chatSummary}` : '';
        let genderContext = getUserContextPrompt();

        let prompt = isCool
            ? `你是推特用户"${char.name}"，人设：${char.persona}。${wbContext}${genderContext}${chatSummaryContext}用户"${postChar.name}"发了推文："${text}"。你性格高冷，通常只点赞不回复。输出"LIKE"或直接输出一句话（概率很低）。不要输出其他。`
            : `你是推特用户"${char.name}"，人设：${char.persona}。${wbContext}${genderContext}${chatSummaryContext}${emoPrompt}用户"${postChar.name}"发了推文："${text}"。如果回复直接输出内容（不超过${chatWordLimit}字），若要在回复中带表情包，请在文本最后附上 [EMO:对应ID]。不回复输出"NO"。`;
        try {
            let res = await fetch(`${myApiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${myApiKey}` }, body: JSON.stringify({ model: myModel, messages: [{ role: "user", content: prompt }] }) });
            let data = await res.json(); let repText = data.choices?.[0]?.message?.content?.trim() || "";
            
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
        } catch(e) {}
    }
    document.getElementById('loadingStatus').style.display = 'none';
    saveAllData();
    spawnNpcComments(newPostId, false, { triggerName: postChar.name, triggerText: text });
}

// ==========================================
// 修复：推文下方的评论功能 (postUserComment)
// ==========================================
async function postUserComment(postId) {
    const input = document.getElementById('myCommentInput'); if (!input) return;
    const text = input.value ? input.value.trim() : ""; if (!text && !pendingReplyAttachment) return alert("评论内容不能为空！");
    let post = globalPosts.find(p => p.id == postId); if (!post) return;

    const newReply = { 
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
    let emoPrompt = getEmoticonPrompt();
    
    for (let char of myCharacters) {
        if (char.replyToUser === false) continue; // 新增：设置里关闭了"回复用户"的角色，直接跳过不参与互动
        let isPostAuthor = (char.id === post.char.id); 
        
        let actionStrictRule = allowActionTags ? "" : "\n【严格禁止】：绝对不要在回复中包含任何动作、神态或心理描写（如括号内的动作），只能输出你直接说出的话！";
        let contextInfo = `\n【原推文内容】："${post.text}"\n【用户的评论】："${text}"\n`;

        let prompt = "";
        if (isPostAuthor) { 
            prompt = `${buildBasePrompt(char, true)}${contextInfo}${emoPrompt}用户刚刚在你的推文下评论了。你必须互动！如果只需点赞请输出"LIKE"；若文字回复，请紧扣原推文和评论内容直接输出话术（不超过${postWordLimit}字）。绝对不能输出"NO"。若用表情附[EMO:ID]。${actionStrictRule}`; 
        } else { 
            prompt = char.persona.includes('高冷') ? `${buildBasePrompt(char, true)}${contextInfo}这是别人的推文和用户的评论。是否点赞？只输出"LIKE"或"NO"。"NO"代表无视。${actionStrictRule}` : `${buildBasePrompt(char, true)}${contextInfo}${emoPrompt}针对上述推文和评论，你是否要插话回复？如果回复，请紧扣推文内容直接输出话术（不超过${postWordLimit}字），若用表情附[EMO:ID]。不回复输出"NO"。${actionStrictRule}`; 
        }
        try {
            let res = await fetch(`${myApiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${myApiKey}` }, body: JSON.stringify({ model: myModel, messages: [{ role: "user", content: prompt }] }) });
            let data = await res.json(); let repText = data.choices?.[0]?.message?.content?.trim() || "";
            
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
        } catch(e) {}
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
window.submitAnonReplyBtn = function(postId) {
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
    if(post) {
        post.replies = post.replies || [];
        const anonProfile = { name: document.getElementById('myAnonName')?.value || '无名氏', id: document.getElementById('myAnonId')?.value || 'User123' };
        
        post.replies.push({ 
            id: 'ar_' + Date.now() + Math.random().toString(36).substr(2, 5), 
            parentId: parentId, // 绑定层级
            charId: 'user', 
            anonName: anonProfile.name, 
            anonId: anonProfile.id, 
            replyTo: replyTo, 
            text: text, 
            timestamp: Date.now() 
        });
        
        post.stats.comments++;
        if(typeof saveAllData === 'function') saveAllData();
        window.renderAnonPosts();
    }
};
function deleteAnonPost(postId) {
    if (!confirm('警告：确定要彻底删除这条匿名帖子吗？')) return;
    anonPosts = anonPosts.filter(p => p.id !== postId);
    saveAllData();
    renderAnonPosts();
}

function toggleAnonReply(postId) {
    const el = document.getElementById(`anon-reply-input-${postId}`);
    if(el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
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
        let p = `你处于一个完全匿名的暗网与抽象论坛。看到有人发帖："${text}"。你的人设是：${char.persona}。${genderContext}
在这里你可以卸下伪装，展现你内心真实、阴暗、极端、或者是极度发癫、抽象、逆天、神经质、色情的一面。不要有任何顾虑，不用保持礼貌。
请决定是否要在下面回复。如果要回复，直接输出你的评论内容（不超过${chatWordLimit}字，语气要符合上述的匿名论坛恶劣环境和你的隐藏性格）。如果不回复，严格输出"NO"。`;

        try {
            let res = await fetch(`${myApiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${myApiKey}` }, body: JSON.stringify({ model: myModel, messages: [{ role: "user", content: p }] }) });
            let data = await res.json();
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

async function postUserAnonComment(postId) {
    const input = document.getElementById(`anon-input-text-${postId}`);
    if (!input) return; const text = input.value.trim(); if (!text) return;
    if (!myApiKey) return alert("请先在设置中配置密钥！");

    let post = anonPosts.find(p => p.id === postId); if(!post) return;

    post.replies.push({ charId: 'me', anonName: currentUser.anonName || '匿名用户', anonId: currentUser.anonId || 'User', text: text, timestamp: Date.now() });
    post.stats.comments++; input.value = ''; renderAnonPosts();
    
    let targetCharId = post.charId; 
    let targetMatch = text.match(/回复 @([^：:]+)[：:]/); 
    if(targetMatch) {
        let targetName = targetMatch[1];
        let r = post.replies.find(x => x.anonName === targetName);
        if(r && r.charId) targetCharId = r.charId;
    }

    if (targetCharId !== 'me') {
        document.getElementById('anonLoadingStatus').style.display = 'block';
        
        // 如果回复的是 NPC，让 NPC 继续反击
        if (targetCharId === 'npc') {
            let p = `你是匿名路人网友"${targetMatch ? targetMatch[1] : 'NPC'}"。刚才用户"${currentUser.anonName || '匿名用户'}"在匿名论坛针对你的评论回复道："${text}"。请你以暴躁、抽象路人网友的身份简短回击，不超过30字。`;
            try {
                let res = await fetch(`${myApiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${myApiKey}` }, body: JSON.stringify({ model: myModel, messages: [{ role: "user", content: p }] }) });
                let rep = (await res.json()).choices?.[0]?.message?.content?.trim();
                if (rep && !rep.toUpperCase().startsWith("NO")) {
                    post.replies.push({ charId: 'npc', anonName: targetMatch ? targetMatch[1] : '路人网友', anonId: 'NPC', replyTo: currentUser.anonId || 'User', text: rep, timestamp: Date.now() });
                    post.stats.comments++;
                    renderAnonPosts();
                }
            } catch(e) {}
        } else {
            // 如果回复的是具体的 AI 角色
            let opChar = myCharacters.find(c => c.id === targetCharId);
            if (opChar) {
                let p = `你在匿名与抽象论坛参与了讨论，或者是你的帖子。有人回复了你："${text}"。你的人设：${opChar.persona}。${getUserContextPrompt()}
                你现在必须回复这个人，不能不理。直接输出你的回复内容（不超过${chatWordLimit}字，展现你极度发癫、抽象、色情、阴暗或神经质的一面，符合匿名环境）。`;
                try {
                    let res = await fetch(`${myApiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${myApiKey}` }, body: JSON.stringify({ model: myModel, messages: [{ role: "user", content: p }] }) });
                    let repText = (await res.json()).choices?.[0]?.message?.content?.trim() || "知道了。";
                    
                    post.replies.push({ charId: opChar.id, anonName: opChar.anonName || '匿名者', anonId: opChar.anonId || 'OP', replyTo: currentUser.anonId || 'User', text: repText, timestamp: Date.now() });
                    post.stats.comments++;
                    showToast(`<div class="avatar" style="background:#555; border:1px solid #777; color:#fff;">?</div>`, `匿名用户 回复了你`, repText, post.id, null, true);
                    renderAnonPosts();
                } catch(e) {}
            }
        }
        document.getElementById('anonLoadingStatus').style.display = 'none';
    }
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

    let p = `你是"${selectedChar.name}"，人设：${selectedChar.persona}。现在你处于一个完全匿名的暗网与抽象论坛。在这里你可以完全卸下伪装，展现你内心极度阴暗、或者极度发癫、抽象、逆天、色情、神经质的一面。${genderContext}
用第一人称发一条匿名帖子，不超过${postWordLimit}字。不要暴露你的真实身份。直接输出帖子内容，不要包含JSON或其他说明。`;

    try {
        let res = await fetch(`${myApiUrl}/chat/completions`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${myApiKey}` }, 
            body: JSON.stringify({ model: myModel, messages: [{ role: "user", content: p }] }) 
        });
        let data = await res.json();
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
        }
    } catch(e) { console.error("匿名帖生成失败", e); }
    
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
    
    const prompt = `你现在要模拟${count}个路人NPC网友进行网络评论。
【重要设定上下文】：
${postCharContext}
${getUserContextPrompt()}
生成NPC言论时，你必须严格记忆、区分并遵循上述博主和用户的性别与人设特征，绝不能搞错代词！
${forumHint}
${context}
请模拟${count}个路人NPC看到后的${toneHint}评论，各不相同，每条不超过30字。
【严格禁止】：评论内容必须是路人自己的原创发言，绝对不能照抄、复述或改写上面引用的原话，也不能和原帖内容重复！
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
        const res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) });
        const raw = (await res.json()).choices?.[0]?.message?.content?.match(/\[[\s\S]*\]/)?.[0] || "[]";
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
        let p = `你是路人网友"${targetName}"。刚才用户"${currentUser.name}"针对你的评论回复道："${text}"。请你以路人网友的身份（八卦、吃瓜、拱火）简短回击，不超过50字。如果在扮演具体角色，注意带入角色的情绪。直接输出内容，不要带引号。`;
        try {
            let res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: p }] }) });
            let rep = (await res.json()).choices?.[0]?.message?.content?.trim();
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
    let chatSummaryContext = char.chatSummary ? `\n【历史聊天总结】：${char.chatSummary}` : '';

    let targetText = targetReply.text || targetReply.content || '';
    let actionStrictRule = allowActionTags ? "" : "\n【严格禁止】：绝对不要在回复中包含任何动作、神态或心理描写（如括号内的动作），只能输出你直接说出的话！";
    let contextInfo = `\n【原推文内容】："${post.text}"\n【原评论/你想回的话】："${targetText}"\n`;
    
    const prompt = isCool 
        ? `你是"${char.name}"，人设：${char.persona}。${wbContext}${genderContext}${chatSummaryContext}${emoPrompt}${contextInfo}用户在上述对话中回复了你："${text}"。是否回复？请紧扣上下文直接输出内容或"NO"。若用表情包附上 [EMO:对应ID]。${actionStrictRule}` 
        : `你是"${char.name}"，人设：${char.persona}。${wbContext}${genderContext}${chatSummaryContext}${emoPrompt}${contextInfo}用户在上述对话中@了你："${text}"。请紧扣前文对话回复（不超过${chatWordLimit}字）或输出"NO"。若想使用表情，请附带 [EMO:对应ID]。${actionStrictRule}`;
        
    try {
        const res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) });
        const data = await res.json(); let repText = data.choices?.[0]?.message?.content?.trim() || "";
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

window.likeMainPost = function(postId, el) {
    let isTabloid = postId.startsWith('tb_');
    let post = isTabloid ? tabloidPosts.find(p => p.id === postId) : globalPosts.find(p => p.id == postId); 
    if(!post) return;
    
    if (!post.likedBy) post.likedBy = [];
    const pinkLikeSVG = likeSVGFilled.replace(/#1d9bf0/g, '#f91880').replace('blue-line-icon', '');
    
    if (post.userLiked) {
        post.userLiked = false;
        post.stats.likes = Math.max(0, parseStat(post.stats.likes) - 1);
        post.likedBy = post.likedBy.filter(id => id !== 'me');
        el.querySelector('.like-icon-wrap').innerHTML = likeSVG;
        el.querySelector('.like-icon-wrap').style.color = 'inherit';
        el.querySelector('.like-count').style.color = 'inherit';
    } else {
        post.userLiked = true;
        post.stats.likes = parseStat(post.stats.likes) + 1;
        if (!post.likedBy.includes('me')) post.likedBy.push('me');
        el.querySelector('.like-icon-wrap').innerHTML = pinkLikeSVG;
        el.querySelector('.like-icon-wrap').style.color = '#f91880';
        el.querySelector('.like-count').style.color = '#f91880';
    }
    el.querySelector('.like-count').innerText = formatStat(post.stats.likes);
    
    let statsLikeEl = document.getElementById(`detail-stats-likes-${postId}`);
    if(statsLikeEl) statsLikeEl.innerText = formatStat(post.stats.likes);
    
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
        let p = `${buildBasePrompt(char, true)}${storyPart}${chatPart}${emoPrompt}
发一条推文，分享你的见闻或看法，不超过${finalWordLimit}字。${trendingTags.length>0 ? `可以考虑加上标签：${trendingTags[0]}` : ""}
【强制要求】：请严格以如下JSON格式返回，不要有任何其他说明：
{"text":"你的推文内容","image":false,"location":"当前所在的具体地点，若没有可填空字符串","emoticonId":"如果有合适的可用表情包，可以填入其ID，若不需要表情包则填null"}
如果内容非常适合真实配图，可以返回：
{"text":"推文内容","image":true,"imageKeyword":"配图关键词英文","location":"具体地点","emoticonId":null}`;

        try {
            let res = await fetch(`${myApiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${myApiKey}` }, body: JSON.stringify({ model: myModel, messages: [{ role: "user", content: p }] }) });
            let data = await res.json(); if(data.error) continue;
            let raw = data.choices?.[0]?.message?.content?.trim() || "";
            if(!raw) continue;
            let parsed; try { const m = raw.match(/\{[\s\S]*\}/); if(m) parsed = JSON.parse(m[0]); } catch(e) {}
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
                </div>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn-edit-small" style="color:#536471; border-color:#cfd9de;" onclick="openMemoryModal('${char.id}')">记忆</button>
                <button class="btn-edit-small" style="color:#f91880; border-color:#f91880;" onclick="deleteCharacter('${char.id}')">删除</button>
            </div>
        </div>`).join('');
}

function openCharacterCenter() { refreshGroupFilterBar(); refreshGroupSelect(); renderCenterCharList(); document.getElementById('characterListView').style.display = 'block'; document.getElementById('characterFormView').style.display = 'none'; openModal('characterCenterModal'); }
function showRoleList() { renderCenterCharList(); document.getElementById('characterListView').style.display = 'block'; document.getElementById('characterFormView').style.display = 'none'; }
function clearForm() {
    editingCharId = null; document.getElementById('formTitle').innerText = "创建新 AI 角色";
    ['charName', 'charHandle', 'charPersona', 'charBio', 'charFollowers', 'charFollowing', 'charLocation', 'charWebsite', 'charBirthdate', 'charAutoReply', 'charAnonName', 'charAnonId', 'charNudgeText'].forEach(id => document.getElementById(id).value = '');
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
}

function openFormForCreate() { clearForm(); document.getElementById('characterListView').style.display = 'none'; document.getElementById('characterFormView').style.display = 'block'; }

function openFormForEdit(charId) {
    editingCharId = charId; let char = charId === 'tabloid_admin' ? tabloidAccount : myCharacters.find(c => c.id == charId); if (!char) return;
    document.getElementById('formTitle').innerText = "修改角色资料";
    document.getElementById('charName').value = char.name; document.getElementById('charHandle').value = char.handle; document.getElementById('charPersona').value = char.persona;
    document.getElementById('charBio').value = char.bio; document.getElementById('charFollowers').value = char.followers; document.getElementById('charFollowing').value = char.following;
    document.getElementById('charLocation').value = char.location || ''; document.getElementById('charWebsite').value = char.website || ''; document.getElementById('charBirthdate').value = char.birthdate || '';
    document.getElementById('charVerified').checked = char.verified || false;
    document.getElementById('charGroup').value = char.group || '';
    document.getElementById('charAutoReply').value = char.autoReplyText || '';
    document.getElementById('charAnonName').value = char.anonName || '';
    document.getElementById('charAnonId').value = char.anonId || '';
    document.getElementById('charNudgeText').value = char.nudgeText || '';
    
    if (char.avatarImg) { document.getElementById('charAvatarPreview').src = char.avatarImg; document.getElementById('charAvatarPreview').style.display = 'block'; } else { document.getElementById('charAvatarPreview').style.display = 'none'; }
    if (char.bgImg) { document.getElementById('charBgPreview').src = char.bgImg; document.getElementById('charBgPreview').style.display = 'block'; } else { document.getElementById('charBgPreview').style.display = 'none'; }
    
    tempCropResults.charAvatar = char.avatarImg || null;
    tempCropResults.charBg = char.bgImg || null;

    const wbBox = document.getElementById('charWbCheckboxes');
    if(worldbooks.length === 0) wbBox.innerHTML = '<span style="color:#536471; font-size:13px;">暂无世界书</span>';
    else wbBox.innerHTML = worldbooks.map(w => `<label style="display:flex; align-items:center; gap:4px; font-size:13px;"><input type="checkbox" value="${w.id}" class="wb-check" ${(char.worldbooks||[]).includes(w.id) ? 'checked' : ''}> ${w.title}</label>`).join('');
    
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
            char.anonName = document.getElementById('charAnonName').value || '匿名者';
            char.anonId = document.getElementById('charAnonId').value || Math.random().toString(36).substr(2,6).toUpperCase();
            char.nudgeText = document.getElementById('charNudgeText').value;
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
            chatFreq: { interval: chatFreqInterval, unit: chatFreqUnit }, lastChatProactiveTime: Date.now(), autoReplyText: document.getElementById('charAutoReply').value,
            memorySummary: "", chatSummary: "", diaryData: { letters: [], diaries: [] }, 
            anonName: document.getElementById('charAnonName').value || '匿名者', anonId: document.getElementById('charAnonId').value || Math.random().toString(36).substr(2,6).toUpperCase(), nudgeText: document.getElementById('charNudgeText').value,
            worldbooks: selectedWbs, postCount: 0
        };
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
        let res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) });
        let data = await res.json();
        let text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
            let post = { id: 'tb_' + Date.now(), char: { ...tabloidAccount }, text: text, timestamp: Date.now(), replies: [], stats: { likes: customLikes !== '' ? parseInt(customLikes) : Math.floor(Math.random()*10000)+1000, comments: customComments !== '' ? parseInt(customComments) : 0 } };
            tabloidPosts.unshift(post);
            renderTabloidPosts(); saveAllData();
            showToast(`<div class="avatar" style="background:#1d9bf0;color:white;font-size:20px;">📰</div>`, `新的八卦爆料！`, text, post.id, null);
            generateNpcCommentsForTabloid(post.id, isShura);
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
    const prompt = `你是娱乐营销号"${tabloidAccount.name}"，人设：${tabloidAccount.persona}。你发布的爆料下，"${contextName}"刚刚评论道："${contextText}"。请你以营销号的口吻（吃瓜、拱火、玩梗）追加一条简短评论，不超过40字。直接输出内容，不要加引号。`;
    try {
        const res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) });
        const data = await res.json();
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
                <div class="post-footer"><div class="post-stats-group" style="gap:40px;"><div>${commentSVG} ${post.stats.comments}</div><div>${likeSVG} ${post.stats.likes}</div></div></div>
            </div>
        </div>`).join('');
}

async function userReplyTabloid(postId) {
    const input = document.getElementById(`tabloid-reply-${postId}`); 
    const text = input.value.trim(); 
    // 💡 修复：允许纯表情包发送
    if(!text && !pendingReplyAttachment) return;
    
    const post = tabloidPosts.find(p => p.id === postId); if(!post) return;
    
    // 💡 写入用户暂存的表情数据
    const userReplyId = 'r_' + Date.now() + Math.floor(Math.random()*100);
    post.replies.push({ id: userReplyId, parentId: null, charId: 'me', name: currentUser.name, text: text, timestamp: Date.now(), mediaUrl: pendingReplyAttachment });
    post.stats.comments++; input.value = ''; 
    
    clearAttachment('reply'); // 💡 发送完毕后清除预览区
    saveAllData();
    
    if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
    
    const api = getApiConfig(true); if(!api.key) return;
    rollTabloidAIParticipation(postId, text, currentUser.name);
    // 修复：NPC 跟评挂载到用户刚发的评论下面，实现楼中楼嵌套
    spawnNpcComments(postId, true, { triggerName: currentUser.name, triggerText: text, triggerId: userReplyId });
    let mentioned = myCharacters.filter(c => text.includes('@' + c.name) && c.replyToUser !== false);
    
    if (mentioned.length > 0) {
        for(let char of mentioned) {
            let p = `用户"${currentUser.name}"艾特了你："${text}"。人设：${char.persona}。直接回复，不超过50字。`;
            try {
                let res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: p }] }) });
                let rep = (await res.json()).choices?.[0]?.message?.content?.trim();
                if(rep && !rep.toUpperCase().startsWith("NO")) {
                    const charReplyId = 'r_' + Date.now() + Math.floor(Math.random()*100);
                    post.replies.push({ id: charReplyId, parentId: userReplyId, charId: char.id, name: char.name, text: `回复 @${currentUser.name}：${rep}`, timestamp: Date.now() }); post.stats.comments++;
                    showToast(getAvatarHTML(char,40), `${char.name} 回复了你`, rep, post.id, null);
                    if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
                    generateAutoNpcReaction(postId, char.name, rep, charReplyId);
                    rollTabloidAIParticipation(postId, rep, char.name);
                }
            } catch(e){}
        }
    }
    saveAllData();
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
function getActionIconsHTML(likes, isLiked, replyIdx, postId, isSubReply) {
    const iconStyle = `width:${isSubReply ? 16 : 18.75}px; height:${isSubReply ? 16 : 18.75}px; fill:currentColor;`;
    const itemStyle = 'display:flex; align-items:center; gap:6px; cursor:pointer; color:#536471; font-size:13px; transition:0.2s; user-select:none;';
    const likeColor = isLiked ? '#f91880' : 'inherit';
    const currentLikeSVG = isLiked ? likeSVGFilled.replace(/#1d9bf0/g, '#f91880') : likeSVG;
    
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
        container.innerHTML = '<div class="empty-state" style="width:100%;">暂无故事，快去创建你的第一部大作吧！</div>'; return;
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
        let res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) });
        let data = await res.json();
        
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
        const res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) });
        let rawText = (await res.json()).choices?.[0]?.message?.content?.trim() || "[]";
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
                <input type="file" id="newForumTxt" accept=".txt" style="display:block; padding:8px 0; font-size: 13px;">
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
// 世界书：文档导入与 AI 智能总结逻辑
// ==========================================

async function handleWbFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const btn = document.getElementById('btnWbImport');
    const originalText = btn.innerText;
    btn.innerText = "读取文件中... ⏳";
    btn.disabled = true;

    const ext = file.name.split('.').pop().toLowerCase();
    let extractedText = "";

    try {
        if (ext === 'txt') {
            // 纯文本读取
            extractedText = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(e);
                reader.readAsText(file, 'UTF-8');
            });
        } else if (ext === 'docx') {
            // DOCX 格式使用 mammoth.js 读取
            if (typeof mammoth === 'undefined') throw new Error("库加载失败，请检查网络");
            const arrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(e);
                reader.readAsArrayBuffer(file);
            });
            const result = await mammoth.extractRawText({arrayBuffer: arrayBuffer});
            extractedText = result.value;
        } else if (ext === 'doc') {
            // 浏览器环境极难直接解析二进制的老版 .doc，抛出友好提示
            throw new Error("旧版 .doc 格式前端不支持直接解析，请用 Word 另存为 .docx 或 .txt 后再上传！");
        } else {
            throw new Error("不支持的文件格式");
        }

        if (!extractedText || !extractedText.trim()) throw new Error("文档内容为空！");
        
        // 读取成功，进入 AI 提炼阶段
        await generateWorldbookFromText(extractedText, btn, originalText);

    } catch (err) {
        alert("文件读取失败：" + err.message);
        btn.innerText = originalText;
        btn.disabled = false;
    }
    
    event.target.value = ''; // 无论成功失败，清空 input 以允许重复上传同一文件
}

async function generateWorldbookFromText(text, btn, originalText) {
    const api = getApiConfig(true); 
    if (!api.key) {
        alert("请先在设置中配置 API Key！");
        btn.innerText = originalText;
        btn.disabled = false;
        return;
    }

    btn.innerText = "AI 提炼设定中... 🧠";

    // 截取前 200000 个字符（防止上传几百万字的巨型故事把 API Token 挤爆报错）
    const safeText = text.substring(0, 200000);
    
    const prompt = `你是一个专业的世界观设定提取助手。请阅读以下文档内容，提炼出其核心的世界观、背景架构、重要势力或规则，将其总结成一段精炼的【世界书设定】。
文档内容片段：
${safeText}

【强制要求】：必须且只能返回合法的 JSON 格式，绝不要包含任何额外的废话、问候语或 markdown 代码块语法 (\`\`\`json 等)。
{"title": "提取出的简短设定标题", "content": "提炼出的世界观详细设定正文(约2000-5000字左右)"}`;

    try {
        let res = await fetch(`${api.url}/chat/completions`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, 
            body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) 
        });
        
        let data = await res.json();
        if(data.error) throw new Error(data.error.message);
        
        let rawText = data.choices?.[0]?.message?.content?.trim() || "";
        // 清洗可能的 JSON 脏字符
        rawText = rawText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        
        let parsed = JSON.parse(rawText);
        
        // 自动将生成的数据填入世界书编辑框中
        document.getElementById('newWbTitle').value = parsed.title || "导入的设定";
        document.getElementById('newWbContent').value = parsed.content || rawText;
        
        // 聚焦提示
        document.getElementById('wbFormTitle').innerText = "文档提炼完成 (待保存)";
        document.getElementById('saveWbBtn').innerText = "确认并保存该设定";
        
        alert("✅ AI 提取成功！请在下方输入框核对文本，没问题后点击【确认并保存该设定】即可。");

    } catch (err) {
        console.error("解析 JSON 失败", err);
        alert("AI 生成失败，可能是模型返回格式错误或网络超时：" + err.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
function downloadTxt(text, filename) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // 过滤掉文件名中可能导致错误的非法字符
    const safeFilename = filename.replace(/[\\/:*?"<>|]/g, "_");
    a.download = safeFilename;
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
        <button class="context-btn" onclick="openCustomCharReplyModal()">摇人中...</button>
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
    menu.innerHTML = `<button class="context-btn" onclick="openCustomCharReplyModal()">摇人中...</button>`;
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
    menu.innerHTML = `<button class="context-btn" onclick="openCustomCharReplyModal()">摇人中...</button>`;
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
        btn.innerText = "立即回复并触发对线"; btn.disabled = false;
        return;
    }

    const api = getApiConfig(true); 

    // A. 文本框留空 -> 触发 AI 角色自动代打
    if (!text) {
        if (!api.key) {
            alert("请先在设置中配置 API Key，或手动输入文本！");
            btn.innerText = "立即回复并触发对线"; btn.disabled = false;
            return;
        }
        
        btn.innerText = "你等着吧我摇人弄你";
        let promptStr = "";
        
        if (t.type === 'anon') {
            promptStr = `你的人设：${char.persona}。你现在处于极端的匿名深渊论坛，ID是"${char.anonName || '匿名者'}"。\n刚刚看到网友"${targetName}"评论说："${targetText}"。\n请直接输出你要回怼或回复的话（不超过50字，不要带引号，符合你的隐藏性格和论坛恶劣环境）。`;
        } else if (t.type === 'forum') {
            promptStr = `你是"${char.name}"，人设：${char.persona}。你现在在逛中文论坛。\n刚刚看到楼主或层主"${targetName}"说："${targetText}"。\n请结合你的人设，直接输出你要回复的话（不超过50字，不要带引号）。`;
        } else {
            promptStr = `你是"${char.name}"，人设：${char.persona}。你正在浏览社交推文。\n刚才网友"${targetName}"评论说："${targetText}"。\n请结合你的人设，直接输出你要回复的话（不超过50字，不要带引号）。`;
        }
        
        try {
            let res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: promptStr }] }) });
            text = (await res.json()).choices?.[0]?.message?.content?.trim() || "";
            text = text.replace(/^"|"$/g, ''); 
        } catch(e) {
            console.error("生成代打回复失败:", e);
            alert("AI 生成代打失败，请重试或手动输入。");
            btn.innerText = "立即回复并触发对线"; btn.disabled = false;
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
    btn.innerText = "立即回复并触发对线"; btn.disabled = false;

    // C. 触发 NPC 自动反击逻辑
    if (!api.key) return;

    if (String(targetId).startsWith('npc') || t.type === 'forum' || targetId === 'tabloid_admin') {
        let p2 = "";
        if (t.type === 'anon') {
            p2 = `你是匿名路人网友"${targetName}"。刚才匿名论坛用户(其实是角色)"${char.anonName || '匿名者'}"(人设:${char.persona})针对你的评论回复道："${text}"。请你以暴躁、阴暗、抽象的路人网友身份简短回击，不超过50字。直接输出内容，不要带引号。`;
        } else {
            p2 = `你是路人网友"${targetName}"。刚才论坛/推特用户(角色)"${char.name}"(人设:${char.persona})针对你的评论回复道："${text}"。请你以路人网友的身份（八卦、吃瓜、拱火、或者反击）简短回击，不超过50字。直接输出内容，不要带引号。`;
        }
        
        try {
            let res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: p2 }] }) });
            let rep = (await res.json()).choices?.[0]?.message?.content?.trim();
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
    
    openModal('chatTxtModal'); 
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
        
        let prompt = `${buildBasePrompt(member, false)}\n【系统强制事件】：新成员 "${newChar.name}" (人设: ${newChar.persona}) 刚刚被拉入了本群。\n请严格结合你自身的人设，直接输出你在群里对新人的第一句话（可以热烈欢迎、高冷无视、阴阳怪气、或者敌意，必须符合你的性格）。不超过50字。不要带引号。`;
        
        try {
            let res = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: prompt }] }) });
            let rep = (await res.json()).choices?.[0]?.message?.content?.trim();
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
    
    let newCharPrompt = `${buildBasePrompt(newChar, false)}\n【系统强制事件】：你刚刚被邀请加入了一个新群聊。\n群里的其他老成员对你的到来做出了如下表态：\n${welcomeContext ? welcomeContext : '(大家似乎都在冷场，没有说话)'}\n请结合你的人设和别人对你的态度，直接输出你在群里的第一句回应（不超过50字）。不要带引号。`;
    
    try {
        let res2 = await fetch(`${api.url}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` }, body: JSON.stringify({ model: api.model, messages: [{ role: "user", content: newCharPrompt }] }) });
        let rep2 = (await res2.json()).choices?.[0]?.message?.content?.trim();
        if (rep2 && !rep2.toUpperCase().startsWith("NO")) {
            rep2 = rep2.replace(/^"|"$/g, '');
            globalChats[groupId].push({ sender: newChar.id, text: rep2, timestamp: Date.now(), readBy: [] });
            if (currentChatSessionId === groupId) renderChatMessages();
            saveAllData();
        }
    } catch(e) { console.error("新成员回应失败:", e); }

    if (indicator) indicator.style.display = 'none';
};

// 2. 核心：NPC 回复插入逻辑 (解决插入不到父评论下方的问题)
function appendNpcReply(parentReplyId, replyContent) {
    // 关键：通过 parentReplyId 寻找 DOM 中的目标容器
    // 请确保你的渲染函数生成的评论都有 id="reply-container-xxxx"
    const targetContainer = document.getElementById(`reply-container-${parentReplyId}`);
    
    const replyDiv = document.createElement('div');
    replyDiv.className = 'npc-reply-bubble';
    replyDiv.style.marginTop = "10px";
    replyDiv.innerHTML = `<div style="padding:10px; background:#f0f0f0; border-radius:8px;">${replyContent}</div>`;
    
    if (targetContainer) {
        targetContainer.appendChild(replyDiv);
    } else {
        // 如果找不到特定的父容器，就插到推文主内容下方
        document.getElementById('postDetailSection').appendChild(replyDiv);
    }
}
// ==========================================