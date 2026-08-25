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
async function deleteMobileTrend(idx, event) {
    if (event) event.stopPropagation();
    if (!(await appConfirm('删除该话题标签？'))) return;
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
async function editMobileTrend(idx) {
    const oldVal = trendingTags[idx];
    const newVal = await appPrompt('编辑话题标签（清空并确定则删除该标签）：', oldVal);
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
// 用户没保存过自定义CSS时就是空字符串，不套用任何默认示例样式，保持最朴素的默认外观。
function applyGlobalCSS() {
    let el = document.getElementById('custom-global-style');
    if(!el) { el = document.createElement('style'); el.id = 'custom-global-style'; document.head.appendChild(el); }
    el.innerHTML = (globalCustomCSS !== undefined && globalCustomCSS !== null) ? globalCustomCSS : '';
}

// ======== 🖱️ 点击特效 ========
// 每次点击页面就在鼠标/手指点到的位置冒出一个小图标，原地停留、慢慢缩小消失（不飞、不飘），纯装饰。
// 用一个"全局只挂一次"的click监听器 + 每次点击时才检查开关状态的写法，而不是"开启时才挂监听器/
// 关闭时再摘掉"，这样切换开关本身不用操心监听器有没有重复挂载/漏摘的问题，逻辑更不容易出错。
const CLICK_EFFECT_EMOJI = { paw: '🐾', heart: '💗', sparkle: '✨' };
function spawnClickEffect(x, y) {
    const el = document.createElement('span');
    el.className = 'click-effect-particle';
    if (clickEffectStyle === 'custom' && clickEffectCustomImage) {
        const img = document.createElement('img');
        img.src = clickEffectCustomImage;
        img.style.cssText = 'width:28px; height:28px; object-fit:cover; border-radius:6px; display:block;';
        el.appendChild(img);
    } else {
        el.textContent = CLICK_EFFECT_EMOJI[clickEffectStyle] || CLICK_EFFECT_EMOJI.paw;
    }
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    // 动画放在CSS里跑（见 style.css 的 .click-effect-particle / @keyframes clickEffectPop），
    // 这里只负责动画结束后把这个临时元素清理掉，避免点得越多、DOM里堆的垃圾节点越多
    el.addEventListener('animationend', () => el.remove());
    setTimeout(() => { if (el.parentNode) el.remove(); }, 1200); // 兜底：万一某些环境不触发animationend事件，1.2秒后强制清理
}
document.addEventListener('click', function (e) {
    if (!clickEffectEnabled) return;
    // 点在输入框/文本域/下拉框/按钮上时不弹，减少对正常操作的视觉干扰（尤其是打字时不会一直闪东西）
    const tag = (e.target && e.target.tagName) || '';
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return;
    spawnClickEffect(e.clientX, e.clientY);
});

function saveClickEffectSettings() {
    clickEffectEnabled = document.getElementById('clickEffectEnabledInput').checked;
    clickEffectStyle = document.getElementById('clickEffectStyleSelect').value;
    saveAllData();
}
// 切到"自定义图片"这个选项时把上传框露出来，切到别的预设样式就收起去，不用同时占地方
function onClickEffectStyleChange() {
    updateClickEffectCustomPreview();
    saveClickEffectSettings();
}
function updateClickEffectCustomPreview() {
    const sel = document.getElementById('clickEffectStyleSelect');
    const box = document.getElementById('clickEffectCustomImageBox');
    const preview = document.getElementById('clickEffectCustomPreview');
    if (!sel || !box) return;
    box.style.display = sel.value === 'custom' ? 'flex' : 'none';
    if (preview) preview.style.backgroundImage = clickEffectCustomImage ? `url('${clickEffectCustomImage}')` : 'none';
}

function toggleSettingsCollapse(id) {
    const el = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (!el) return;
    const isOpen = el.style.display === 'block';
    el.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.innerText = isOpen ? '▶' : '▼';
}

// 打包成APK后"只能拍照、选不了相册/文件"的根本原因：Android 6.0+ 光在 manifest 里声明权限是不够的，
// 还需要运行时弹窗让用户授权存储/媒体权限；没有这个授权时，系统的文件选择器弹出的可用选项通常只剩"拍照"这一项
// （因为读取相册/文件管理器都需要存储权限，唯独拍照不需要，所以看起来就是"只能访问相机"）。
// 这里列出全部可能用到的权限：老版本安卓用 READ/WRITE_EXTERNAL_STORAGE，Android 13+（API 33）分区存储改用
// READ_MEDIA_IMAGES/VIDEO/AUDIO 这几个更细分的权限——两套都请求一遍，系统会自动忽略当前版本不认识的权限名，不会报错。
const APP_STORAGE_PERMISSIONS = [
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_MEDIA_AUDIO',
    'android.permission.CAMERA'
];
function openFilePickerForApp(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (window.plus && plus.android) {
        try {
            plus.android.requestPermissions(
                APP_STORAGE_PERMISSIONS,
                function () { input.click(); },
                function () { input.click(); } // 就算授权被拒绝，也还是尝试打开，让系统自己处理弹窗
            );
            return;
        } catch (e) { /* 当前 HBuilderX/Android 版本没有这个API，直接走下面的默认逻辑 */ }
    }
    input.click();
}

// ★ 关键补充：不是所有文件选择器都是通过 openFilePickerForApp() 触发的——像头像/背景图这些
// <input type="file"> 有些直接暴露在页面上让用户点（没有套一层按钮走 openFilePickerForApp），
// 这些地方点击时不会提前申请权限，在没有权限的情况下同样会出现"只能拍照"的问题。
// 与其挨个改造成按钮触发，更省事也更稳妥的做法是：APK启动、进入首页时就主动申请一次全部存储/媒体权限，
// 这样不管用户点的是哪个文件输入框，系统这时候都已经有权限了，行为跟普通网页版一致。
function requestAllAppPermissionsOnLaunch() {
    if (window.plus && plus.android) {
        try { plus.android.requestPermissions(APP_STORAGE_PERMISSIONS, function () {}, function () {}); } catch (e) {}
    }
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
// 安卓Chrome等移动浏览器规范上不允许网页直接 new Notification() 弹通知（会直接抛错），
// 必须通过注册好的 Service Worker 调 registration.showNotification() 才行。
// 这里在页面加载时尝试注册；file:// 本地文件和普通 http:// 不支持 Service Worker
// （浏览器要求安全上下文：https 或 localhost），注册失败就静默忽略，走后面的兜底方案。
function registerServiceWorkerForNotifications() {
    if (!('serviceWorker' in navigator)) return;
    const secureEnough = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    // 打包成APK（window.plus存在）时也尝试注册一下：不确定 5+Runtime 的 file:// 环境是否允许，
    // 但试一下不会报错也不会有副作用，注册失败会被下面的catch静默吃掉。
    if (!secureEnough && !(window.plus && plus.push)) return;
    navigator.serviceWorker.register('./service-worker.js').catch(e => console.warn('Service Worker 注册失败（不影响其它功能，但系统通知在部分安卓浏览器/APK上可能无法弹出）：', e));
}

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

// 云端主动消息唤醒设置：勾选/填写后立即保存，并强制触发一次同步（方便你马上测试Worker是否配对成功）
function saveCloudSyncSettings() {
    cloudSyncEnabled = document.getElementById('cloudSyncEnabledToggle')?.checked || false;
    cloudWorkerUrl = (document.getElementById('cloudWorkerUrlInput')?.value || '').trim().replace(/\/$/, '');
    cloudAuthToken = (document.getElementById('cloudAuthTokenInput')?.value || '').trim();
    ntfyTopic = (document.getElementById('ntfyTopicInput')?.value || '').trim();
    saveAllData();
    if (cloudSyncEnabled && cloudWorkerUrl && cloudAuthToken && typeof syncStateToCloud === 'function') {
        syncStateToCloud(true);
    }
}

function sendBrowserNotification(title, body) {
    if (!enableBrowserNotifications) return;
    if (document.visibilityState === 'visible' && document.hasFocus()) return; // 用户正盯着看呢，不用再弹系统通知
    const plainTitle = (title || '').replace(/<[^>]+>/g, '').trim() || '新消息';
    const plainBody = (body || '').replace(/<[^>]+>/g, '').trim().slice(0, 200);

    // HBuilderX 打包的 APK（5+ Runtime）环境：先试一次原生本地推送。
    // 注意：这里不再 return——plus.push.createMessage 如果因为manifest里push渠道没配对（uni-push/个推没弄好）
    // 而"静默不生效"（不报错，就是不显示），我们没法从JS里检测到，所以下面继续尝试 Service Worker 通知
    // 作为并行兜底，两条路都试一遍，只要有一条成功就能收到提醒。
    if (window.plus && plus.push) {
        try { plus.push.createMessage(plainBody, {}, { title: plainTitle, cover: false }); } catch (e) { /* 静默失败，继续往下试其它方式 */ }
    }
    // 普通浏览器环境 / APK内置WebView：走标准 Web Notification API
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const fallbackDirectNotification = () => {
        try {
            new Notification(plainTitle, { body: plainBody, icon: siteLogoImg || undefined });
        } catch (e) {
            // 安卓Chrome等移动浏览器会在这里直接抛"Illegal constructor"——
            // 这就是"开关开了但从来没弹过"的真正原因。打个log方便排查，而不是彻底静默。
            console.warn('系统通知发送失败（安卓浏览器需要Service Worker才能弹通知，请确认注册成功且是https访问）：', e);
        }
    };

    // 优先走 Service Worker 通知：安卓Chrome等移动浏览器强制要求这样才能真正弹出系统通知栏。
    // 注意：navigator.serviceWorker.ready 在"从没成功注册过SW"的情况下会永远pending不resolve也不reject，
    // 所以这里必须先自己判断一下环境是否支持（跟注册时用的判断条件保持一致），不满足就直接走兜底，
    // 不能无脑丢给 .ready 去等，否则会导致通知彻底哑火。
    // window.plus 环境（打包的APK）也放进来一起试——不确定 5+Runtime 的WebView 在 file:// 下是否支持
    // Service Worker，但反正 plus.push 那条路已经不保证成功了，多试一种方式没有坏处。
    const swEnvOk = 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || (window.plus && plus.push));
    if (swEnvOk) {
        // 万一SW注册出了什么意外没成功，.ready 可能永远pending——加个超时兜底，别让通知彻底哑火
        const readyOrTimeout = Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('service worker ready超时')), 3000)),
        ]);
        readyOrTimeout.then(reg => {
            reg.showNotification(plainTitle, { body: plainBody, icon: siteLogoImg || undefined }).catch(fallbackDirectNotification);
        }).catch(fallbackDirectNotification);
    } else {
        fallbackDirectNotification();
    }
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
    // ⚠️ 找到了"上传头像/背景不弹裁剪框"的真正病根：这里不管modal自己有没有单独设置过z-index，
    // 一律强制盖成2500。像 cropModal 这种需要"叠在其他已经打开的modal上面"的弹窗，HTML里
    // 单独写了 z-index:99999，结果一open就被这行摁回2500，跟其他modal（也都是2500）变成同一层级，
    // 层级一样时按DOM顺序堆叠，而cropModal在HTML里定义得比userProfileModal靠前，就被压在了
    // 后开的userProfileModal下面——看起来就是"选完图片裁剪框没反应"，其实它已经弹出来了，
    // 只是被编辑资料那个弹窗盖住看不见，关掉编辑资料弹窗以后才露出来（还因为编辑资料弹窗已经
    // 关了，没法点保存）。这里改成只在modal没有自己指定过z-index时才用默认值2500，
    // 已经自己指定了（比如cropModal的99999）就尊重它，不要覆盖。
    if (!modal.style.zIndex) modal.style.zIndex = 2500;
    // 确保modal在顶层，防止被其他元素覆盖
    modal.style.position = 'fixed';
}
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function getFullDataSnapshot() {
    return {
        myApiUrl, myApiKey, myModel, subApiUrl, subApiKey, subModel, vecApiUrl, vecApiKey, lastWorkingModel, lastWorkingSubModel, quietHoursEnabled, quietHoursStart, quietHoursEnd, samplerTemperature, samplerTopP, samplerFrequencyPenalty, samplerPresencePenalty, samplerTopK,
        myCharacters, globalPosts, anonPosts, characterGroups, factionColors, charRelationships, relationshipTypePresets, statusTypes, globalEmoticons, worldbooks, worldbookCategories, globalChats, groupChats, currentUser, tabloidAccount, trendingTags,
        globalBgImage, globalBgOpacity, allowActionTags, humanFeelEnabled, tpesEnabled, autoRenderStatusChips, enableScheduleAutoCheck, enableAffinitySystem, enableTypingIndicator, enableMiniGameCharSpeech, enableAnniversary, memoryAlbum, chatWordLimit, postWordLimit, diaryWordLimit, letterWordLimit, commentWordLimit, chatMsgCountMin, chatMsgCountMax, chatReplyStyleMode, chatSummaryInterval, groupSummaryInterval, postMemoryInterval, chatListViewMode, pinnedSessionIds,
        letterReplyDelayMin, letterReplyDelayMax, globalUserDiaries,
        globalNovels, storySessions, novelCustomCSS, globalCustomCSS, tabloidPosts, siteLogoImg,
        forumThreads,
        npcReplyProb, npcReplyMaxCount,
        regexScripts, enableVectorMemory, enableChatScriptExecution, embeddingModel, dataBank, darkTheme, enableBrowserNotifications, enableCharMoveToChat, showNovelReasoning, showNovelFloorNumber, showNovelThinkingTime,
        worldbookCharBudget, semanticCharBudget, chatHistoryTurns,
        plugins, aiPresets, userPersonas, npcIdentities,
        cloudSyncEnabled, cloudWorkerUrl, cloudAuthToken, ntfyTopic,
        clickEffectEnabled, clickEffectStyle, clickEffectCustomImage,
        chatVariables, globalVariables,
        reasoningFormats, reasoningDisplayMode,
        mvuStats, memoryEntries,
        __unsplashCleaned: unsplashCleaned,
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
        // 🐛 性能/内存修复：这个清洗只需要对"确实还带着旧链接的老存档"做一次，之前完全没有"做过一次就不用再做"
        // 的标记，导致每次刷新/打开app都会：把整个存档 JSON.stringify 成一整条字符串（存档越大，角色/聊天记录/
        // 图片越多，这条字符串可能几十上百MB）、再跑两遍全局正则扫描、经常还要整个 JSON.parse 一次——存档小的时候
        // 感觉不出来，但存档大了之后，这几步在每次加载时都会瞬间占用大量内存，是"浏览器内存不够/卡顿"的一个
        // 常见诱因。这里加一个"洗过一次就打标记"的开关，标记过的存档直接跳过整套清洗流程，不用每次都重新扫一遍。
        if (parsed && parsed.__unsplashCleaned) unsplashCleaned = true;
        if (parsed && !unsplashCleaned) {
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

            parsed = JSON.parse(newStr);
            unsplashCleaned = true; // 不管这次有没有实际替换到内容，都打上标记，保证只彻底扫这一次
            parsed.__unsplashCleaned = true;
            await localforage.setItem('myTwitterAppData', parsed); // 把洗净+打好标记的数据重新存回数据库
            if (originalStr !== newStr) console.log("✅ 存档清洗完成：已将所有旧版 Unsplash 图片替换为新接口！");
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
                if (parsed.vecApiUrl !== undefined) vecApiUrl = parsed.vecApiUrl;
                if (parsed.vecApiKey !== undefined) vecApiKey = parsed.vecApiKey;
                if (parsed.lastWorkingModel !== undefined) lastWorkingModel = parsed.lastWorkingModel;
                if (parsed.lastWorkingSubModel !== undefined) lastWorkingSubModel = parsed.lastWorkingSubModel;
                if (parsed.quietHoursEnabled !== undefined) quietHoursEnabled = parsed.quietHoursEnabled;
                if (parsed.quietHoursStart !== undefined) quietHoursStart = parsed.quietHoursStart;
                if (parsed.quietHoursEnd !== undefined) quietHoursEnd = parsed.quietHoursEnd;
                if (parsed.samplerTemperature !== undefined) samplerTemperature = parsed.samplerTemperature;
                if (parsed.samplerTopP !== undefined) samplerTopP = parsed.samplerTopP;
                if (parsed.samplerFrequencyPenalty !== undefined) samplerFrequencyPenalty = parsed.samplerFrequencyPenalty;
                if (parsed.samplerPresencePenalty !== undefined) samplerPresencePenalty = parsed.samplerPresencePenalty;
                if (parsed.samplerTopK !== undefined) samplerTopK = parsed.samplerTopK;
                if (parsed.allowActionTags !== undefined) allowActionTags = parsed.allowActionTags;
                if (parsed.enableCharMoveToChat !== undefined) enableCharMoveToChat = parsed.enableCharMoveToChat;
                if (parsed.showNovelReasoning !== undefined) showNovelReasoning = parsed.showNovelReasoning;
                if (parsed.showNovelFloorNumber !== undefined) showNovelFloorNumber = parsed.showNovelFloorNumber;
                if (parsed.showNovelThinkingTime !== undefined) showNovelThinkingTime = parsed.showNovelThinkingTime;
                if (parsed.humanFeelEnabled !== undefined) humanFeelEnabled = parsed.humanFeelEnabled;
                if (parsed.tpesEnabled !== undefined) tpesEnabled = parsed.tpesEnabled;
                if (parsed.autoRenderStatusChips !== undefined) autoRenderStatusChips = parsed.autoRenderStatusChips;
                if (parsed.enableScheduleAutoCheck !== undefined) enableScheduleAutoCheck = parsed.enableScheduleAutoCheck;
                if (parsed.enableAffinitySystem !== undefined) enableAffinitySystem = parsed.enableAffinitySystem;
                // 兼容旧版单开关
                if (parsed.enableTypingIndicator !== undefined) enableTypingIndicator = parsed.enableTypingIndicator;
                if (parsed.enableMiniGameCharSpeech !== undefined) enableMiniGameCharSpeech = parsed.enableMiniGameCharSpeech;
                if (parsed.chatListViewMode !== undefined) chatListViewMode = parsed.chatListViewMode;
                if (parsed.pinnedSessionIds !== undefined) pinnedSessionIds = parsed.pinnedSessionIds;
                if (parsed.enableAnniversary !== undefined) enableAnniversary = parsed.enableAnniversary;
                if (parsed.memoryAlbum) memoryAlbum = parsed.memoryAlbum;
                if (parsed.chatWordLimit !== undefined) chatWordLimit = parsed.chatWordLimit;
                if (parsed.postWordLimit !== undefined) postWordLimit = parsed.postWordLimit;
                if (parsed.diaryWordLimit !== undefined) diaryWordLimit = parsed.diaryWordLimit;
                if (parsed.letterWordLimit !== undefined) letterWordLimit = parsed.letterWordLimit;
                if (parsed.commentWordLimit !== undefined) commentWordLimit = parsed.commentWordLimit;
                if (parsed.letterReplyDelayMin !== undefined) letterReplyDelayMin = parsed.letterReplyDelayMin;
                if (parsed.letterReplyDelayMax !== undefined) letterReplyDelayMax = parsed.letterReplyDelayMax;
                if (parsed.globalUserDiaries !== undefined) globalUserDiaries = parsed.globalUserDiaries;
                if (parsed.chatMsgCountMin !== undefined) chatMsgCountMin = parsed.chatMsgCountMin;
                if (parsed.chatMsgCountMax !== undefined) chatMsgCountMax = parsed.chatMsgCountMax;
                if (parsed.chatReplyStyleMode !== undefined) chatReplyStyleMode = parsed.chatReplyStyleMode;
                if (parsed.chatSummaryInterval !== undefined) chatSummaryInterval = parsed.chatSummaryInterval;
                if (parsed.groupSummaryInterval !== undefined) groupSummaryInterval = parsed.groupSummaryInterval;
                if (parsed.postMemoryInterval !== undefined) postMemoryInterval = parsed.postMemoryInterval;
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
                if (parsed.aiPresets) aiPresets = parsed.aiPresets;
                if (parsed.userPersonas) userPersonas = parsed.userPersonas;
                if (parsed.npcIdentities) npcIdentities = parsed.npcIdentities;
                if (parsed.cloudSyncEnabled !== undefined) cloudSyncEnabled = parsed.cloudSyncEnabled;
                if (parsed.cloudWorkerUrl !== undefined) cloudWorkerUrl = parsed.cloudWorkerUrl;
                if (parsed.cloudAuthToken !== undefined) cloudAuthToken = parsed.cloudAuthToken;
                if (parsed.ntfyTopic !== undefined) ntfyTopic = parsed.ntfyTopic;
                applyDarkTheme();
                if (parsed.globalBgImage !== undefined) globalBgImage = parsed.globalBgImage;
                if (parsed.globalBgOpacity !== undefined) globalBgOpacity = parsed.globalBgOpacity;
                if (parsed.siteLogoImg !== undefined) siteLogoImg = parsed.siteLogoImg;

                const uiSyncMap = {
                    apiUrlInput: myApiUrl, apiKeyInput: myApiKey,
                    subApiUrlInput: subApiUrl, subApiKeyInput: subApiKey,
                    vecApiUrlInput: vecApiUrl, vecApiKeyInput: vecApiKey,
                    limitChat: chatWordLimit, limitPost: postWordLimit,
                    limitDiary: diaryWordLimit, limitLetter: letterWordLimit, limitComment: commentWordLimit,
                    limitChatMsgCountMin: chatMsgCountMin, limitChatMsgCountMax: chatMsgCountMax,
                    letterReplyDelayMinInput: letterReplyDelayMin, letterReplyDelayMaxInput: letterReplyDelayMax,
                    globalBgOpacityInput: globalBgOpacity,
                    npcProbInput: npcReplyProb, npcMaxCountInput: npcReplyMaxCount,
                    samplerTemperature: samplerTemperature, samplerTopP: samplerTopP,
                    samplerFrequencyPenalty: samplerFrequencyPenalty, samplerPresencePenalty: samplerPresencePenalty,
                    samplerTopK: samplerTopK
                };
                Object.keys(uiSyncMap).forEach(id => {
                    const el = document.getElementById(id);
                    if (el && uiSyncMap[id] !== undefined) el.value = uiSyncMap[id];
                });
                if (document.getElementById('allowActionTags')) document.getElementById('allowActionTags').checked = allowActionTags;
                if (document.getElementById('enableCharMoveToChat')) document.getElementById('enableCharMoveToChat').checked = enableCharMoveToChat;
                if (document.getElementById('showNovelReasoning')) document.getElementById('showNovelReasoning').checked = showNovelReasoning;
                if (document.getElementById('showNovelFloorNumber')) document.getElementById('showNovelFloorNumber').checked = showNovelFloorNumber;
                if (document.getElementById('showNovelThinkingTime')) document.getElementById('showNovelThinkingTime').checked = showNovelThinkingTime;
                if (document.getElementById('humanFeelEnabled')) document.getElementById('humanFeelEnabled').checked = humanFeelEnabled;
                if (document.getElementById('tpesEnabled')) document.getElementById('tpesEnabled').checked = tpesEnabled;
                if (document.getElementById('autoRenderStatusChips')) document.getElementById('autoRenderStatusChips').checked = autoRenderStatusChips;
                if (document.getElementById('enableScheduleAutoCheck')) document.getElementById('enableScheduleAutoCheck').checked = enableScheduleAutoCheck;
                if (document.getElementById('enableAffinitySystem')) document.getElementById('enableAffinitySystem').checked = enableAffinitySystem;
                if (document.getElementById('enableTypingIndicator')) document.getElementById('enableTypingIndicator').checked = enableTypingIndicator;
                if (document.getElementById('enableMiniGameCharSpeech')) document.getElementById('enableMiniGameCharSpeech').checked = enableMiniGameCharSpeech;
                if (document.getElementById('quietHoursEnabled')) document.getElementById('quietHoursEnabled').checked = quietHoursEnabled;
                if (document.getElementById('quietHoursStart')) document.getElementById('quietHoursStart').value = quietHoursStart;
                if (document.getElementById('quietHoursEnd')) document.getElementById('quietHoursEnd').value = quietHoursEnd;
                if (document.getElementById('enableAnniversary')) document.getElementById('enableAnniversary').checked = enableAnniversary;
                if (document.getElementById('chatReplyStyleModeSelect')) { document.getElementById('chatReplyStyleModeSelect').value = chatReplyStyleMode; if (typeof toggleChatReplyStyleFieldsVisibility === 'function') toggleChatReplyStyleFieldsVisibility(); }
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
                if (document.getElementById('cloudSyncEnabledToggle')) document.getElementById('cloudSyncEnabledToggle').checked = cloudSyncEnabled;
                if (document.getElementById('cloudWorkerUrlInput')) document.getElementById('cloudWorkerUrlInput').value = cloudWorkerUrl || '';
                if (document.getElementById('cloudAuthTokenInput')) document.getElementById('cloudAuthTokenInput').value = cloudAuthToken || '';
                if (document.getElementById('ntfyTopicInput')) document.getElementById('ntfyTopicInput').value = ntfyTopic || '';
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
            try { if (parsed.storySessions) storySessions = parsed.storySessions; } catch (e) { console.error(e); }
            try { if (parsed.novelCustomCSS !== undefined) novelCustomCSS = parsed.novelCustomCSS; } catch (e) { console.error(e); }
            try { if (parsed.globalCustomCSS !== undefined) globalCustomCSS = parsed.globalCustomCSS; } catch (e) { console.error(e); }
            try {
                if (parsed.clickEffectEnabled !== undefined) clickEffectEnabled = parsed.clickEffectEnabled;
                if (parsed.clickEffectStyle) clickEffectStyle = parsed.clickEffectStyle;
                if (parsed.clickEffectCustomImage !== undefined) clickEffectCustomImage = parsed.clickEffectCustomImage;
                if (document.getElementById('clickEffectEnabledInput')) document.getElementById('clickEffectEnabledInput').checked = clickEffectEnabled;
                if (document.getElementById('clickEffectStyleSelect')) document.getElementById('clickEffectStyleSelect').value = clickEffectStyle;
                updateClickEffectCustomPreview();
            } catch (e) { console.error(e); }
            try { if (parsed.tabloidPosts) tabloidPosts = parsed.tabloidPosts; } catch (e) { console.error(e); }
            try { if (parsed.chatVariables) chatVariables = parsed.chatVariables; } catch (e) { console.error(e); }
            try { if (parsed.globalVariables) globalVariables = parsed.globalVariables; } catch (e) { console.error(e); }
            try { if (parsed.mvuStats) mvuStats = parsed.mvuStats; } catch (e) { console.error(e); }
            try { if (parsed.memoryEntries) memoryEntries = parsed.memoryEntries; } catch (e) { console.error(e); }
            try {
                if (Array.isArray(parsed.reasoningFormats)) reasoningFormats = parsed.reasoningFormats;
                if (parsed.reasoningDisplayMode) reasoningDisplayMode = parsed.reasoningDisplayMode;
                if (typeof renderReasoningFormatsList === 'function') renderReasoningFormatsList();
                if (document.getElementById('reasoningDisplayModeSelect')) document.getElementById('reasoningDisplayModeSelect').value = reasoningDisplayMode;
            } catch (e) { console.error(e); }
            try { if (document.getElementById('globalCSSInput')) document.getElementById('globalCSSInput').value = globalCustomCSS || ''; } catch (e) { console.error(e); }
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

// 「拉取模型」的核心逻辑单独抽出来：三个拉取按钮（主API/副API/向量）本来各写了一遍
// 一模一样的 fetch+解析，现在共用这一份；角色卡组件调 getModelList() 时走的也是它，
// 保证"卡片看到的模型列表"跟你在设置页点拉取看到的完全一致。
async function fetchModelListFrom(url, key) {
    let u = String(url || '').trim();
    const k = String(key || '').trim();
    if (!u || !k) throw new Error('接口地址和密钥都要填');
    if (u.endsWith('/')) u = u.slice(0, -1);
    const res = await smartFetch(`${u}/models`, { method: 'GET', headers: { 'Authorization': `Bearer ${k}` } });
    if (!res.ok) throw new Error(`HTTP 错误代码: ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.data)) throw new Error('接口返回的数据格式不符合标准。');
    return data.data;
}

async function fetchModels() {
    let urlInput = document.getElementById('apiUrlInput').value.trim(); const keyInput = document.getElementById('apiKeyInput').value.trim();
    if (!urlInput || !keyInput) return alert("请先填写接口地址和密钥！");
    if(urlInput.endsWith('/')) urlInput = urlInput.slice(0, -1);
    const btn = event.target; const oldText = btn.innerText; btn.innerText = "正在拉取模型中... ⏳"; btn.disabled = true;
    try {
        const list = await fetchModelListFrom(urlInput, keyInput);
        document.getElementById('modelSelect').innerHTML = list.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
        alert(`成功拉取 ${list.length} 个模型！`);
    } catch (e) { alert("拉取失败：" + (typeof enhanceNetworkErrorMessage === 'function' ? enhanceNetworkErrorMessage(e.message) : e.message)); } finally { btn.innerText = oldText; btn.disabled = false; }
}

async function fetchSubModels() {
    let urlInput = document.getElementById('subApiUrlInput').value.trim(); const keyInput = document.getElementById('subApiKeyInput').value.trim();
    if (!urlInput || !keyInput) return alert("请先填写副 API 的接口地址和密钥！");
    if(urlInput.endsWith('/')) urlInput = urlInput.slice(0, -1);
    const btn = event.target; const oldText = btn.innerText; btn.innerText = "正在拉取模型中... ⏳"; btn.disabled = true;
    try {
        const res = await smartFetch(`${urlInput}/models`, { method: 'GET', headers: { 'Authorization': `Bearer ${keyInput}` } });
        if (!res.ok) throw new Error(`HTTP 错误代码: ${res.status}`);
        const data = await res.json();
        if (data && data.data && Array.isArray(data.data)) { document.getElementById('subModelSelect').innerHTML = data.data.map(m => `<option value="${m.id}">${m.id}</option>`).join(''); alert(`副 API 成功拉取 ${data.data.length} 个模型！`); }
        else { throw new Error("接口返回的数据格式不符合标准。"); }
    } catch (e) { alert("拉取失败：" + (typeof enhanceNetworkErrorMessage === 'function' ? enhanceNetworkErrorMessage(e.message) : e.message)); } finally { btn.innerText = oldText; btn.disabled = false; }
}

// 修复：向量记忆的 Embedding 模型改成"拉取模型"下拉选择，而不是手动填写模型名字。
// 拉取用的接口地址/密钥优先读取"向量记忆专用API"输入框里当前填的内容（哪怕还没点保存）；
// 如果这两个框都是空的，就自动兜底改用主API——不会去动副API，两者互相独立。
async function fetchEmbeddingModels() {
    const vecUrlBox = (document.getElementById('vecApiUrlInput')?.value || '').trim();
    const vecKeyBox = (document.getElementById('vecApiKeyInput')?.value || '').trim();
    const useVecApi = !!(vecUrlBox && vecKeyBox);
    let urlInput = (useVecApi ? vecUrlBox : myApiUrl) || '';
    const keyInput = (useVecApi ? vecKeyBox : myApiKey) || '';
    if (!urlInput || !keyInput) return alert("请先填写向量记忆专用API（或主API）的接口地址和密钥！");
    if (urlInput.endsWith('/')) urlInput = urlInput.slice(0, -1);

    const btn = event.target; const oldText = btn.innerText; btn.innerText = "正在拉取模型中... ⏳"; btn.disabled = true;
    try {
        const res = await smartFetch(`${urlInput}/models`, { method: 'GET', headers: { 'Authorization': `Bearer ${keyInput}` } });
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
            alert(`成功拉取 ${data.data.length} 个模型！（使用了${useVecApi ? '向量记忆专用' : '主'}API）`);
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

// 向量记忆专用API的接口地址/密钥保存（跟主API、副API的输入框是分开的，互不影响）
function saveVectorApiSettings() {
    vecApiUrl = document.getElementById('vecApiUrlInput').value.trim(); if (vecApiUrl.endsWith('/')) vecApiUrl = vecApiUrl.slice(0, -1);
    vecApiKey = document.getElementById('vecApiKeyInput').value.trim();
    saveAllData();
}

function autoSaveApiSettings() {
    myApiUrl = document.getElementById('apiUrlInput').value.trim(); if(myApiUrl.endsWith('/')) myApiUrl = myApiUrl.slice(0, -1);
    myApiKey = document.getElementById('apiKeyInput').value.trim();
    if(document.getElementById('modelSelect').value) myModel = document.getElementById('modelSelect').value;
    
    subApiUrl = document.getElementById('subApiUrlInput').value.trim(); if(subApiUrl.endsWith('/')) subApiUrl = subApiUrl.slice(0, -1);
    subApiKey = document.getElementById('subApiKeyInput').value.trim();
    if(document.getElementById('subModelSelect').value) subModel = document.getElementById('subModelSelect').value;

    if (document.getElementById('vecApiUrlInput')) { vecApiUrl = document.getElementById('vecApiUrlInput').value.trim(); if (vecApiUrl.endsWith('/')) vecApiUrl = vecApiUrl.slice(0, -1); }
    if (document.getElementById('vecApiKeyInput')) vecApiKey = document.getElementById('vecApiKeyInput').value.trim();

    if (document.getElementById('samplerTemperature')) samplerTemperature = document.getElementById('samplerTemperature').value.trim();
    if (document.getElementById('samplerTopP')) samplerTopP = document.getElementById('samplerTopP').value.trim();
    if (document.getElementById('samplerFrequencyPenalty')) samplerFrequencyPenalty = document.getElementById('samplerFrequencyPenalty').value.trim();
    if (document.getElementById('samplerPresencePenalty')) samplerPresencePenalty = document.getElementById('samplerPresencePenalty').value.trim();
    if (document.getElementById('samplerTopK')) samplerTopK = document.getElementById('samplerTopK').value.trim();

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

// 切换"聊天回复条数/长度模式"时，经典模式下"最少~最多条数"这两个输入框不生效，直接隐藏掉，
// 免得用户以为调了这两个数字就能影响经典模式的行为（经典模式条数是写死的随机1~4条，不受这两个设置控制）。
function toggleChatReplyStyleFieldsVisibility() {
    const sel = document.getElementById('chatReplyStyleModeSelect');
    const fields = document.getElementById('chatReplyLimitedFields');
    if (!sel || !fields) return;
    fields.style.display = sel.value === 'classic' ? 'none' : '';
}

function saveSettings() {
    myApiUrl = document.getElementById('apiUrlInput').value.trim(); if(myApiUrl.endsWith('/')) myApiUrl = myApiUrl.slice(0, -1);
    myApiKey = document.getElementById('apiKeyInput').value.trim(); myModel = document.getElementById('modelSelect').value;
    subApiUrl = document.getElementById('subApiUrlInput').value.trim(); if(subApiUrl.endsWith('/')) subApiUrl = subApiUrl.slice(0, -1);
    subApiKey = document.getElementById('subApiKeyInput').value.trim(); subModel = document.getElementById('subModelSelect').value;
    if (document.getElementById('vecApiUrlInput')) { vecApiUrl = document.getElementById('vecApiUrlInput').value.trim(); if (vecApiUrl.endsWith('/')) vecApiUrl = vecApiUrl.slice(0, -1); }
    if (document.getElementById('vecApiKeyInput')) vecApiKey = document.getElementById('vecApiKeyInput').value.trim();
    chatWordLimit = parseInt(document.getElementById('limitChat').value) || 50; postWordLimit = parseInt(document.getElementById('limitPost').value) || 50;
    diaryWordLimit = parseInt(document.getElementById('limitDiary').value) || 400; letterWordLimit = parseInt(document.getElementById('limitLetter').value) || 400;
    commentWordLimit = parseInt(document.getElementById('limitComment').value) || 30;
    letterReplyDelayMin = Math.max(1, parseInt(document.getElementById('letterReplyDelayMinInput')?.value) || 60);
    letterReplyDelayMax = Math.max(letterReplyDelayMin, parseInt(document.getElementById('letterReplyDelayMaxInput')?.value) || 360);
    chatMsgCountMin = Math.max(1, parseInt(document.getElementById('limitChatMsgCountMin')?.value) || 1);
    chatMsgCountMax = Math.max(chatMsgCountMin, parseInt(document.getElementById('limitChatMsgCountMax')?.value) || 5);
    allowActionTags = document.getElementById('allowActionTags').checked;
    enableCharMoveToChat = document.getElementById('enableCharMoveToChat') ? document.getElementById('enableCharMoveToChat').checked : enableCharMoveToChat;
    showNovelReasoning = document.getElementById('showNovelReasoning') ? document.getElementById('showNovelReasoning').checked : showNovelReasoning;
    showNovelFloorNumber = document.getElementById('showNovelFloorNumber') ? document.getElementById('showNovelFloorNumber').checked : showNovelFloorNumber;
    showNovelThinkingTime = document.getElementById('showNovelThinkingTime') ? document.getElementById('showNovelThinkingTime').checked : showNovelThinkingTime;
    humanFeelEnabled = document.getElementById('humanFeelEnabled').checked;
    tpesEnabled = document.getElementById('tpesEnabled').checked;
    autoRenderStatusChips = document.getElementById('autoRenderStatusChips') ? document.getElementById('autoRenderStatusChips').checked : true;
    enableScheduleAutoCheck = document.getElementById('enableScheduleAutoCheck').checked;
    enableTypingIndicator = document.getElementById('enableTypingIndicator').checked;
    enableMiniGameCharSpeech = document.getElementById('enableMiniGameCharSpeech')?.checked ?? true;
    quietHoursEnabled = document.getElementById('quietHoursEnabled')?.checked ?? false;
    quietHoursStart = document.getElementById('quietHoursStart')?.value || '23:00';
    quietHoursEnd = document.getElementById('quietHoursEnd')?.value || '08:00';
    enableAnniversary = document.getElementById('enableAnniversary').checked;
    enableVectorMemory = document.getElementById('enableVectorMemory')?.checked || false;
    enableChatScriptExecution = document.getElementById('enableChatScriptExecution')?.checked || false;
    embeddingModel = document.getElementById('embeddingModelSelect')?.value.trim() || 'text-embedding-3-small';
    worldbookCharBudget = Math.max(200, parseInt(document.getElementById('worldbookCharBudgetInput')?.value) || 2000);
    semanticCharBudget = Math.max(200, parseInt(document.getElementById('semanticCharBudgetInput')?.value) || 1200);
    chatHistoryTurns = Math.max(2, parseInt(document.getElementById('chatHistoryTurnsInput')?.value) || 20);
    chatReplyStyleMode = document.getElementById('chatReplyStyleModeSelect')?.value === 'classic' ? 'classic' : 'limited';
    npcReplyProb = parseFloat(document.getElementById('npcProbInput').value);
    if (isNaN(npcReplyProb)) npcReplyProb = 0.4; 
    npcReplyMaxCount = parseInt(document.getElementById('npcMaxCountInput').value); 
    if (isNaN(npcReplyMaxCount)) npcReplyMaxCount = 3;
    
    globalCustomCSS = document.getElementById('globalCSSInput').value;
    applyGlobalCSS();
    
    if (document.getElementById('samplerTemperature')) samplerTemperature = document.getElementById('samplerTemperature').value.trim();
    if (document.getElementById('samplerTopP')) samplerTopP = document.getElementById('samplerTopP').value.trim();
    if (document.getElementById('samplerFrequencyPenalty')) samplerFrequencyPenalty = document.getElementById('samplerFrequencyPenalty').value.trim();
    if (document.getElementById('samplerPresencePenalty')) samplerPresencePenalty = document.getElementById('samplerPresencePenalty').value.trim();
    if (document.getElementById('samplerTopK')) samplerTopK = document.getElementById('samplerTopK').value.trim();

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
        if(typeof renderPersonaSwitchSelect === 'function') renderPersonaSwitchSelect();
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

// ===================== 多用户人设（Persona）管理 =====================
// 设计：每个人设是一份 currentUser 的完整快照（名字/账号/头像/性别/人设简介等），随时可以另存/切换/删除。
// 切换时直接把快照字段整体覆盖进 currentUser 这同一个对象（不新建对象、不改变引用），
// 这样App里其它到处写死的 currentUser.xxx 用法完全不用改，天然兼容。
function renderPersonaSwitchSelect() {
    const sel = document.getElementById('personaSwitchSelect');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">-- 未保存为人设（当前是临时资料）--</option>' + userPersonas.map(p => `<option value="${p.id}">${escapeHtml(p.label || '未命名人设')}</option>`).join('');
    if (userPersonas.some(p => p.id === cur)) sel.value = cur;
}

async function saveCurrentAsPersona() {
    const label = ((await appPrompt('给这份人设起个名字（方便以后辨认，比如"本体""马甲小号"）：', currentUser.name || '新人设')) || '').trim();
    if (!label) return;
    const snapshot = JSON.parse(JSON.stringify(currentUser));
    userPersonas.push({ id: 'persona_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), label, data: snapshot });
    saveAllData();
    renderPersonaSwitchSelect();
    const sel = document.getElementById('personaSwitchSelect');
    if (sel) sel.value = userPersonas[userPersonas.length - 1].id;
    appToast('✅ 已保存人设「' + label + '」');
}

function switchToPersona(id) {
    if (!id) return; // 选了"未保存为人设"这个占位项，什么都不做
    const persona = userPersonas.find(p => p.id === id);
    if (!persona) return;
    // 整体覆盖 currentUser 的字段（不是替换整个对象，其它地方持有的 currentUser 引用不会失效）
    Object.keys(persona.data).forEach(k => { currentUser[k] = persona.data[k]; });
    openUserProfileModal(); // 重新用最新的 currentUser 内容刷新表单里的所有输入框
    updateUserMiniProfile();
    saveAllData();
    appToast('✅ 已切换到人设「' + (persona.label || '') + '」');
}

async function renameCurrentPersona() {
    const sel = document.getElementById('personaSwitchSelect');
    const persona = sel && userPersonas.find(p => p.id === sel.value);
    if (!persona) return appAlert('请先在上面选择一个已保存的人设');
    const newLabel = ((await appPrompt('重命名这个人设：', persona.label || '')) || '').trim();
    if (!newLabel) return;
    persona.label = newLabel;
    saveAllData();
    renderPersonaSwitchSelect();
}

async function deleteCurrentPersona() {
    const sel = document.getElementById('personaSwitchSelect');
    const persona = sel && userPersonas.find(p => p.id === sel.value);
    if (!persona) return appAlert('请先在上面选择一个已保存的人设');
    if (!(await appConfirm(`确定删除人设「${persona.label}」？（只删除这份保存的快照，不影响当前正在使用的资料）`))) return;
    userPersonas = userPersonas.filter(p => p.id !== persona.id);
    saveAllData();
    renderPersonaSwitchSelect();
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

    const isPinned = pinnedSessionIds.some(pid => pid == charId);
    const pinBtn = `<button class="context-btn" onclick="document.getElementById('chatContextMenu').style.display='none'; toggleChatPin('${charId}')">📌 ${isPinned ? '取消置顶' : '置顶'}</button>`;
    menu.innerHTML = `<button class="context-btn" onclick="generateCharSchedule('${charId}')">🗓️ 生成/更新今日日程</button><button class="context-btn" onclick="document.getElementById('chatContextMenu').style.display='none'; openChatOptions('${charId}', event)">💬 聊天选项</button>${pinBtn}<button class="context-btn" onclick="document.getElementById('chatContextMenu').style.display='none'; restartChatWithGreeting('${charId}')">🔄 重新开始聊天</button>${extraBtns}`;
    
    menu.style.display = 'flex';
    let x = e.pageX, y = e.pageY; 
    if (x + 180 > window.innerWidth) x -= 180; 
    // 动态判断菜单高度，防止超出屏幕底部被遮挡
    if (y + menu.offsetHeight > window.innerHeight) y = window.innerHeight - menu.offsetHeight - 10; 
    if (y < 0) y = 10;
    menu.style.left = x + 'px'; 
    menu.style.top = y + 'px';
}

// 群聊头像的右键/长按小菜单：聊天选项 + 置顶/取消置顶（跟角色头像的小菜单保持一致体验）
function showGroupAvatarContextMenu(e, groupId) {
    e.preventDefault(); e.stopPropagation();
    const menu = document.getElementById('chatContextMenu');
    const isPinned = pinnedSessionIds.some(pid => pid == groupId);
    menu.innerHTML = `<button class="context-btn" onclick="document.getElementById('chatContextMenu').style.display='none'; openChatOptions('${groupId}', event)">💬 聊天选项</button><button class="context-btn" onclick="document.getElementById('chatContextMenu').style.display='none'; toggleChatPin('${groupId}')">📌 ${isPinned ? '取消置顶' : '置顶'}</button>`;
    menu.style.display = 'flex';
    let x = e.pageX, y = e.pageY;
    if (x + 180 > window.innerWidth) x -= 180;
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

    const prompt = buildStructuredMessages(buildBasePrompt(char, true, recentChat + '\n' + recentPosts), [],
        `现在的真实时间：${nowStr}。

请结合你的人设、世界书设定，以及下面提供的参考信息，为自己规划一份"今天的日程"——从早到晚分成若干时间段，写出你这一天大概会做什么、在哪、状态如何，要符合你的身份、生活习惯和当前的关系/剧情状态，具体到有画面感，不要写"上午：工作，下午：休息"这种空洞流水账。

【你最近发的动态（如果有）】：
${recentPosts || '（暂无）'}

【你和用户最近的聊天记录（如果有）】：
${recentChat || '（暂无）'}

请严格按以下 JSON 格式输出，不要包含任何 Markdown 语法或多余说明：
{"schedule": "从早到晚的完整日程，按时间段分行，用\\n分隔", "currentStatus": "结合日程和现在的真实时间，你此刻正在做的事，20字以内，不含引号"${typeAsk ? ', "statusTypeLabel": "从给定列表里选的状态类型"' : ''}}`);

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