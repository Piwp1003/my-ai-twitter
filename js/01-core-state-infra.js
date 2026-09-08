// ============================================================================
// 🐛 原生弹窗（alert / confirm / prompt）关掉之后，把键盘焦点抢回来
// ----------------------------------------------------------------------------
// 病根：打包成 exe（Electron）之后，这三个是**系统级的模态窗口**，不是网页里画的。
// 它关闭时，Windows 不保证把键盘焦点还给网页那一层 —— 于是弹窗一关，
// 整个界面就再也打不了字、点了也没反应，非得把窗口切出去再切回来才恢复。
//
// 用户实测出来的触发条件是"导入备份之后"：importData 成功那一支最后会
// alert("数据恢复成功")，就是这一下把焦点弄丢的。但凡走 alert/confirm/prompt 的
// 地方都会中招，不止导入这一处，所以在这里统一包一层，而不是去改某个调用点。
//
// 做两件事：① 让窗口重新激活；② 把焦点还给弹窗之前那个正在用的元素
// （比如你正在聊天框里打字时弹了个确认框，关掉之后光标还在原来那个框里）。
// 普通浏览器里本来就没这个毛病，多做这两步也没有副作用。
// ============================================================================
(function () {
    if (typeof window === 'undefined') return;
    ['alert', 'confirm', 'prompt'].forEach(function (name) {
        const native = window[name];
        if (typeof native !== 'function') return;
        window[name] = function () {
            const prev = document.activeElement;
            try {
                return native.apply(window, arguments);
            } finally {
                // 放到下一个事件循环再抢：弹窗刚关的那一瞬间窗口还没完成激活，立刻调是空操作
                setTimeout(function () {
                    try {
                        window.focus();
                        if (prev && prev !== document.body && typeof prev.focus === 'function' && prev.isConnected) {
                            prev.focus();
                        }
                    } catch (e) {}
                }, 0);
            }
        };
    });
})();

let tempCropResults = {}; // 存储各类裁剪临时 Base64 数据
let pendingImportedGreetings = null; // 角色卡导入时读到的候选开场白，等角色保存后挂到角色身上
// 角色卡导入时顺带识别到的正则脚本（比如状态栏HTML组件），此时角色卡本身还没保存、拿不到真正的角色id，
// 先把这批脚本的id记下来，等saveCharacter()真正生成/确定角色id之后，再回头把charScope绑定成那个角色专属，
// 这样这些角色卡自带的正则默认就只对它自己的角色生效，不会一装上就影响到其它角色的内容。
let pendingImportedRegexScriptIds = [];
let siteLogoImg = null;   // 网站左上角 Logo 数据
let pendingQuotePostId = null; // 用户点击"引用"按钮后，待在发推框里一起提交的被引用推文id；发布/取消后清空

// 通用拖拽调高度手柄：CSS原生的 resize:vertical 拖拽把手在手机触屏上很难精确抓到，体验很差。
// 用 Pointer Events（同一套API自动兼容鼠标拖拽和手指触屏拖拽，不用分别写mousedown/touchstart两套）
// 实现一个真正好按住拖的手柄——用法：在目标文本框/内容框后面紧跟着放一个手柄元素，
// 手柄上写 onpointerdown="startDragResize(event, this)"，函数会去操作它的上一个兄弟元素（previousElementSibling）。
function startDragResize(e, handleEl, minHeight, maxHeight) {
    e.preventDefault();
    const targetEl = handleEl.previousElementSibling;
    if (!targetEl) return;
    const min = minHeight || 60, max = maxHeight || 600;
    const startHeight = targetEl.getBoundingClientRect().height;
    const startY = e.clientY;
    handleEl.setPointerCapture && handleEl.setPointerCapture(e.pointerId);

    function onMove(moveEvent) {
        const dy = moveEvent.clientY - startY;
        targetEl.style.height = Math.max(min, Math.min(max, startHeight + dy)) + 'px';
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

// 修复安卓App里键盘弹出后，聊天界面因为固定100vh高度不会跟着收缩、
// 底部输入框和键盘之间出现一大截空白的问题。
// 原理：100vh在很多安卓WebView里是"锁死"的初始屏幕高度，键盘弹出并不会让它变小，
// 所以这里改用JS实时量出"当前真正看得见的高度"(visualViewport优先，更准)，
// 写成一个CSS变量--app-vh，样式表里用它代替写死的100vh。
(function () {
    var baseH = 0; // 记下"键盘没弹出来时"的可视高度，用来判断键盘是不是弹出来了

    function setAppVH() {
        var h = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('--app-vh', (h * 0.01) + 'px');

        // 键盘检测：可视高度比"正常高度"矮了 15% 以上，就认为软键盘顶上来了。
        // 用比例而不是固定像素，是因为各机型屏幕高度差很多；15% 这个阈值能躲开
        // 浏览器地址栏收起/展开那种几十像素的小变化，只有真键盘才会让高度掉这么多。
        if (h > baseH) baseH = h;
        var kb = baseH > 0 && h < baseH * 0.85;
        document.body.classList.toggle('keyboard-open', kb);
    }

    // 顶栏上方的安全区高度。
    // 🐛 修复"顶部栏上面白了一大条"：CSS 里原来直接吃 env(safe-area-inset-top)，
    // 但打包成 App 之后，5+ 的 WebView 在**非沉浸式**状态栏下本来就已经从状态栏下面开始画了，
    // 这时候 env() 有些机型还会照报一个状态栏高度，于是白边被算了两遍。
    // 5+ 自己有准确答案：isImmersedStatusbar() 告诉我们要不要让位，getStatusbarHeight() 给出真实高度。
    // 拿到就写进 --app-safe-top，CSS 优先用它；网页/PWA 环境没有 plus，回落到 env()，行为不变。
    // 底部导航栏的真实高度。CSS 里它是 56px+安全区，但聊天页和 .main-content 一直按 68px 预留，
    // 差的这 12px 就是"聊天页底下露出一条页面背景"的原因。与其到处写死数字、改一处忘一处，
    // 不如直接量出来写进 --app-nav-h，样式里统一引用。
    function setNavHeight() {
        try {
            const nav = document.getElementById('mobileBottomNav');
            if (!nav) return;
            const h = nav.getBoundingClientRect().height;
            if (h > 0) document.documentElement.style.setProperty('--app-nav-h', h + 'px');
        } catch (e) { /* 量不到就用 CSS 里的默认值 */ }
    }

    function setSafeTop() {
        try {
            if (!window.plus || !plus.navigator) return;
            var immersed = plus.navigator.isImmersedStatusbar ? plus.navigator.isImmersedStatusbar() : false;
            var top = immersed && plus.navigator.getStatusbarHeight ? plus.navigator.getStatusbarHeight() : 0;
            document.documentElement.style.setProperty('--app-safe-top', top + 'px');
        } catch (e) { /* 拿不到就维持 CSS 里 env() 的默认行为 */ }
    }

    setAppVH();
    setSafeTop();
    setNavHeight();
    window.addEventListener('load', setNavHeight); // 首屏样式还没算完时量出来是 0，load 之后再量一次
    window.addEventListener('resize', setAppVH);
    window.addEventListener('orientationchange', function () { setAppVH(); setSafeTop(); setNavHeight(); });
    document.addEventListener('plusready', setSafeTop); // App 环境下 plus 是异步就绪的，这里再补一次
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', setAppVH);
        window.visualViewport.addEventListener('scroll', setAppVH);
    }
})();

// ★ 全局适配修复：之前排查"导出没反应"的bug时发现，打包后的安卓App(5+ Runtime)里网页原生的
// alert() 有时候压根不会弹出来（某些机型/安卓版本对WebView里 alert 的支持不稳定），当时是单独给
// 导出功能改用了 plus.nativeUI.alert 才解决。但代码里其它一百多处提示（删除成功、保存成功、各种
// 报错提示等）用的都还是普通 alert()，同样可能在手机上"点了没反应"，静默失败。
// 与其把这一百多处调用一个个改掉（改动面太大、容易漏改也容易改错），这里直接把全局的 window.alert
// 本身替换掉：在打包后的App环境里自动改用更可靠的 plus.nativeUI.alert 弹出，网页版环境完全不受影响、
// 行为和原来一模一样。这样现有代码里所有 alert(...) 调用不用改一个字，都会自动变得可靠。
(function () {
    // 注意：这里不能用"if(window.plus)才覆盖"来做前置判断——window.plus这个对象本身虽然在
    // 5+ Runtime里通常很早就存在，但要严谨起见，判断逻辑放到每次真正调用alert的时候再做（跟
    // appAlert用的是同一个套路），不管此刻plus是否已经就绪，都不影响后面用户点按钮时的判断结果。
    var nativeAlert = window.alert.bind(window);
    window.alert = function (msg) {
        if (window.plus && plus.nativeUI && plus.nativeUI.alert) {
            try { plus.nativeUI.alert(String(msg)); return; } catch (e) {}
        }
        nativeAlert(msg);
    };
})();

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
    // ⚠️ 防御修复：之前这整条 FileReader→Image→打开裁剪弹窗 的链路完全没有错误处理，
    // 中间任何一步失败（读文件失败、图片解码失败、或者取裁剪相关DOM元素时出意外）都会
    // 直接静默卡死在半路——裁剪弹窗自然就"根本不出现"，而且完全没有任何提示或报错，
    // 没法判断到底卡在哪一步。这里给读取失败、图片加载失败都加上可见提示，
    // 并把打开弹窗前的逻辑包一层try/catch，出问题至少能看到具体报错，而不是死一样的沉默。
    reader.onerror = () => { console.error('[图片裁剪] 文件读取失败', reader.error); appAlert('图片读取失败，换一张图片再试试？'); };
    reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => { console.error('[图片裁剪] 图片解码失败'); appAlert('这张图片打不开（可能格式不支持或文件损坏），换一张试试？'); };
        img.onload = () => {
            try {
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
            } catch (err) {
                console.error('[图片裁剪] 打开裁剪弹窗失败', err);
                appAlert('打开裁剪窗口失败：' + (err && err.message ? err.message : err));
            }
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
    const signatureHTML = `<div class="app-signature" style="margin:0;">由 林 制作</div>`;
    // onerror：logo 图片取不到时把自己藏掉，只留下面那行署名。
    // 打包进 App / 拷到别的目录时 icons/ 偶尔会漏带，少一张装饰图不该留个裂图占位，
    // 也不该在控制台里反复刷"资源加载失败"。自定义 logo 同理（用户可能删了那张图）。
    const imgStyle = `height:126px; width:auto; display:block; object-fit:contain; cursor:pointer;`;
    const onErr = `this.style.display='none'`;
    const src = siteLogoImg || './icons/icon-192.png';
    container.innerHTML = `<img src="${src}" alt="谷雨" style="${imgStyle}" onerror="${onErr}">${signatureHTML}`;
}


// 蓝V：以前是个"描边五角星 + 勾"，缩到 15px 就是一坨看不清的线，很多人以为是收藏。
// 换成 X 那种实心花瓣底 + 白色勾，小尺寸下也认得出来。
const verifiedSVG = `<svg class="verified-badge" viewBox="0 0 24 24" aria-label="已认证"><path fill="#1d9bf0" d="M12 1.5l2.3 2.05 3.05-.36 1.06 2.9 2.9 1.06-.36 3.05L23 12l-2.05 2.3.36 3.05-2.9 1.06-1.06 2.9-3.05-.36L12 22.5l-2.3-2.05-3.05.36-1.06-2.9-2.9-1.06.36-3.05L1 12l2.05-2.3-.36-3.05 2.9-1.06 1.06-2.9 3.05.36L12 1.5z"></path><path fill="#fff" d="M10.9 15.6l-3-3 1.27-1.27 1.73 1.73 4.03-4.03 1.27 1.27-5.3 5.3z"></path></svg>`;
/* ===== 🐦 推文操作栏的图标：换成 X 那一套实心图形 =====
   以前用的是通用线框图标（对话框、循环箭头、心、眼睛），缩到 18px 之后几个都糊成一团，
   而且"眼睛"很容易被当成"可见性/隐私"。X 那套是**实心路径**，小尺寸下形状还认得出来。
   这些用 fill:currentColor（.x-icon），不是 stroke，所以别再套 .blue-line-icon。 */
const commentSVG = `<svg class="stat-icon x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></svg>`;
const retweetSVG = `<svg class="stat-icon x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></svg>`;
const likeSVG = `<svg class="stat-icon x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></svg>`;
const likeSVGFilled = `<svg class="stat-icon x-icon liked" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.505.29-.505-.29C7.117 18.31 4.467 15.67 3.116 13.19c-1.376-2.53-1.415-5.01-.255-6.86 1.16-1.85 3.13-2.83 5.07-2.83 1.55 0 3.09.62 4.07 1.94.98-1.32 2.52-1.94 4.07-1.94 1.94 0 3.91.98 5.07 2.83 1.16 1.85 1.12 4.33-.256 6.86z"></path></svg>`;
// 浏览量：X 用的是三根柱子，不是眼睛（眼睛容易被当成"隐私/可见性"）
const viewSVG = `<svg class="stat-icon x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"></path></svg>`;
const viewsBarSVG = viewSVG;
// 分享：截图里那个是**三个点用两条线连起来**的那种（安卓/Material 的 share），
// 不是"方框+上箭头"。这里按截图来。
const shareOutSVG = `<svg class="stat-icon x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"></path></svg>`;
// ⋮ 更多
const moreDotsSVG = `<svg class="stat-icon x-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="12" cy="19" r="1.8"></circle></svg>`;
// ⚠️ 这一条是 v107 换图标时被误删过一次的（推文带定位时整页报 locationSVG is not defined）。
const locationSVG = `<svg class="blue-line-icon" style="width:18px;height:18px;" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
const quoteSVG = `<svg class="stat-icon blue-line-icon" viewBox="0 0 24 24"><path d="M9 7H4v6h3l-2 4h3l3-6V7zm10 0h-5v6h3l-2 4h3l3-6V7z"></path></svg>`;
const websiteSVG = `<svg class="blue-line-icon" style="width:18px;height:18px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

// API配置
let myApiUrl = "https://api.deepseek.com", myApiKey = "", myModel = "deepseek-chat"; 
let subApiUrl = "", subApiKey = "", subModel = "";
let vecApiUrl = "", vecApiKey = ""; // 🎯 v107 起：主 API / 副 API 按「重要 / 不重要」分（方案 A）
//   主 API（贵的好模型）：私聊、群聊、故事章节、续写、日记、信件、日记反应
//        —— 这些是你会**逐字读**的内容，值得用好模型
//   副 API（便宜的小模型）：其余全部——评论区、路人、状态、日程、记忆总结、
//        游戏决策、小功能里的各种一句话，这些多半是扫一眼就过
//
// 以前全项目 60 多处取 API，56 处传 true（= 副 API 优先），
// 结果副 API 一填全就接管了几乎一切，主 API 只剩四件事在用。
// 现在"重要"的那批改走 getApiMain()。
//
// ⚠️ 两边都会兜底：主的没配全就用副的，副的没配全就用主的，
//    只填一个 API 的用户完全无感。
function getApiMain() {
    if (myApiKey && myApiUrl && myModel) return { url: myApiUrl, key: myApiKey, model: myModel, isSub: false };
    return getApiConfig(true);
}

// 向量记忆专用API（选填）：填了就专用于 /embeddings 请求（跟主API、副API完全独立），不填则自动走主API
let lastWorkingModel = "", lastWorkingSubModel = ""; // 主/副API各自最近一次成功用过的模型，供"模型不可用自动兜底"使用
let quietHoursEnabled = false, quietHoursStart = "23:00", quietHoursEnd = "08:00"; // 休息时间段：这段时间内不触发主动消息（本地+云端）
// 采样参数（sampler）：全部留空字符串＝不发送该字段，使用服务商默认值；用户在设置页填了才会真的带上。
let samplerTemperature = "", samplerTopP = "", samplerFrequencyPenalty = "", samplerPresencePenalty = "", samplerTopK = "";
let samplerMaxTokens = "";   // 单次输出上限；留空＝不发送这个参数，用服务商默认
// 把当前设置里的采样参数拼成请求体要合并的对象；forAnthropic=true时只带temperature/top_p/top_k（Anthropic /v1/messages 支持的），
// 不带 frequency_penalty/presence_penalty（Anthropic 接口不认识这两个字段，带了大概率会直接报错）。
function getSamplerExtraBody(forAnthropic) {
    const body = {};
    const t = parseFloat(samplerTemperature); if (!isNaN(t)) body.temperature = t;
    const tp = parseFloat(samplerTopP); if (!isNaN(tp)) body.top_p = tp;
    if (forAnthropic) {
        const tk = parseInt(samplerTopK); if (!isNaN(tk)) body.top_k = tk;
    } else {
        const fp = parseFloat(samplerFrequencyPenalty); if (!isNaN(fp)) body.frequency_penalty = fp;
        const pp = parseFloat(samplerPresencePenalty); if (!isNaN(pp)) body.presence_penalty = pp;
    }
    // 用户在设置里填了输出上限就带上。注意这里放在 body 里、会被调用点自己的 extraBody 覆盖
    // （比如日程记忆总结那种明确只要 600 token 的短任务），那是有意的：
    // 用户设的是"通用上限"，个别短任务自己更清楚要多少。
    const mt = parseInt(samplerMaxTokens);
    if (!isNaN(mt) && mt > 0) body.max_tokens = mt;
    return body;
}

// ✂️ 撞上 max_tokens 被硬切断时给一条明确提示。
// 不提示的话用户只能看到一句写到一半的话，完全不知道是模型的问题还是 app 的问题——
// "为什么一直截断"就是这么来的。同一分钟内只提醒一次，免得连着几条都断时刷屏。
let __gyLastTruncateNotice = 0;
function gyNoticeIfTruncated(data) {
    try {
        const fr = data && data.choices && data.choices[0] && data.choices[0].finish_reason;
        if (fr !== 'length') return;
        const now = Date.now();
        if (now - __gyLastTruncateNotice < 60000) return;
        __gyLastTruncateNotice = now;
        const cur = parseInt(samplerMaxTokens);
        const where = (!isNaN(cur) && cur > 0)
            ? `你把「单次输出上限」设成了 ${cur}，这次写满就被切断了。调大一点（比如 ${Math.min(65536, cur * 2)}）再试。`
            : '这次写到服务商的默认上限就被切断了。去「设置 → 🎚️ 生成参数 → 单次输出上限 max_tokens」填个大一点的值（比如 8192）。';
        console.warn('[输出被截断] finish_reason=length');
        if (typeof showToast === 'function') {
            showToast('<div class="avatar" style="width:40px;height:40px;background:#ffad1f;color:#fff;font-size:20px;">✂️</div>',
                '这条被截断了', where + '（用推理模型时，思考过程也可能占掉这个额度）', null, null, false);
        }
    } catch (e) { /* 提示失败不影响正文 */ }
}

// 设置及字数限制
let allowActionTags = false; // 控制是否允许动作描写
// 关闭（默认）=现有逻辑：角色对用户评论/推文互动必须按原有规则回应（评论/点赞/NO等）。
// 开启后：角色在这些场景下多一个选择——可以自主判断"这事儿更适合私下聊"，转而主动发一条私聊消息去找用户聊，
// 而不是老老实实在推文底下评论。目前接入了"用户评论互动"和"角色对用户新帖子的反应"这两个最主要的场景。
let enableCharMoveToChat = false;
// 小说功能展示项开关：默认都开，关掉哪项就不显示对应内容。三项各自独立，互不影响。
let showNovelReasoning = true; // 是否把AI输出里识别到的思维链渲染成可折叠区块（关掉=不管全局思维链设置，续写/章节这边一律直接剥掉不展示）
let showNovelFloorNumber = true; // 互动续写每一轮是否显示"第N层"楼层号（论坛楼层式编号）
let showNovelThinkingTime = true; // 是否显示这一轮/这一章从发起请求到生成完毕耗费的时间
// "用已有内容生成小说"弹窗的临时勾选状态，只在弹窗打开期间使用，不需要持久化存档，每次打开弹窗都会重置。
// key是分类，value是Set：continuation/memory/chat存的是id（小说id/角色id/角色id），diary存"charId::kind::entryId"，
// tweet存postId，comment存"postId::replyId"。
let novelSourceSelection = { continuation: new Set(), diary: new Set(), chat: new Set(), tweet: new Set(), comment: new Set(), memory: new Set() };
let humanFeelEnabled = true; // 人味强化协议：反套路/反回声/情绪校准，注入所有角色生成的系统提示词最前面
let tpesEnabled = true; // TPES 时间感知增强系统：让角色对真实时间流逝有感知
let autoRenderStatusChips = true; // 通用方括号状态栏识别：把 [标签|值...] 格式的AI输出自动渲染成好看的状态行，不区分具体标签名
// 状态栏分场景开关：总开关 autoRenderStatusChips 之下，再按「推文 / 评论」分别控制。
// 有些角色卡的状态栏字段特别多（脑内、想舔哪、搜索记录……），刷在时间线上太挤，
// 但在聊天/日记里又想留着，所以拆成三个开关而不是一刀切。
let showStatusInPosts = true;     // 推文正文里是否渲染状态栏
let showStatusInComments = true;  // 评论/跟帖里是否渲染状态栏
let showStatusInDiary = true;     // 日记/信件里是否渲染状态栏
// 故事功能 / 角色专属世界书选择列表：各自独立的"当前分类筛选值"+"待保存勾选集合"。
// 用Set单独跟踪勾选状态而不是直接读DOM的:checked，是因为这两处列表现在也能像世界书主页一样按分类筛选，
// 切换分类会重新渲染列表、把不在当前分类下的世界书从DOM里隐藏掉——如果还是保存时才去读DOM :checked，
// 那些"已经勾选但因为切换了分类筛选而暂时不在页面上"的世界书就会被当成没勾选，保存时就会丢失选择。
let novelWbCategoryFilter = null, novelWbPendingSelection = new Set();
let novelViewMode = 'outline'; // 故事编辑器当前子模式：'outline'=一键生成模式，'interactive'=互动续写模式（类酒馆聊天）
let charFormWbCategoryFilter = null, charFormWbPendingSelection = new Set();

let memoryAlbum = []; // 回忆相册/高光时刻收藏：[{id, type:'chat'|'post', charId, charName, text, timestamp, note}]
let regexScripts = []; // 正则替换脚本：[{id, name, find, replace, flags, isRegex, target:'ai_output'|'user_input'|'both', enabled}]
let enableVectorMemory = false; // 向量记忆：语义检索历史聊天，而不是只看最近N条
let enableChatScriptExecution = false; // 允许聊天消息里的<script>标签真正执行（有安全风险，默认关闭）
let embeddingModel = 'text-embedding-3-small'; // 向量记忆/资料库共用的 embedding 模型名
let dataBank = []; // 角色专属资料库(RAG)：[{id, charId, title, chunks:[{text, embVec}], createdAt}]
let plugins = []; // 插件系统：[{id, name, description, type:'prompt'|'action'|'macro'|'script', scope:'global'|charId, enabled, promptText, actionLabel, actionPrompt, macroName, macroValue, code}]
// AI预设系统（仿SillyTavern的"Chat Completion 预设"）：每个预设是一整套可整体切换的提示词模块+采样参数。
// [{id, name, enabled(同一时间只有一个预设enabled=true，切换时互斥), prompts:[{id,name,role,content,enabled}], samplerParams:{temperature?,top_p?,frequency_penalty?,presence_penalty?,top_k?}}]
let aiPresets = [];
// 多用户人设（仿SillyTavern的Persona管理）：保存多份"我"的资料快照，可随时另存/切换，
// 切换时会把快照里的字段整体覆盖进 currentUser（跟原有到处使用 currentUser.xxx 的代码完全兼容，不用改任何引用点）。
// [{id, label, data:{name,handle,persona,bio,gender,avatarImg,bgImg,...currentUser的其它字段}}]
let userPersonas = [];
// 路人NPC的身份表：{ 昵称: {id, name, handle, avatarEmoji, themeColor} }
// 存起来是为了让同一个路人在不同帖子、不同天里都是**同一个账号**——
// 评论区才像个有熟脸的地方，而不是每次刷出一堆一次性的陌生人。见 js/10 的 getNpcIdentity。
let npcIdentities = {};
let enableBrowserNotifications = false; // 浏览器系统级推送通知
let darkTheme = false; // 深色模式
// ====== 云端主动消息唤醒（网页锁屏/关闭后，靠Cloudflare Worker代为检测+推送ntfy通知）======
let cloudSyncEnabled = false; // 总开关
let cloudWorkerUrl = ''; // 你部署的 Cloudflare Worker 地址，例如 https://xxx.workers.dev
let cloudAuthToken = ''; // 与Worker约定的共享密钥（同一个字符串要填在Worker的Secret里）
let ntfyTopic = ''; // ntfy.sh 的推送topic名（建议用一长串随机字符，越难猜越安全）
let lastCloudSyncTime = 0; // 节流：避免同步请求发得太频繁
const CLOUD_SYNC_MIN_INTERVAL = 3 * 60000; // 两次同步之间至少间隔3分钟
// ⚡ 上下文预算管理：功能越加越多，prompt容易越滚越大，这几个数字用来控制每次请求塞给AI的字数上限，省token省钱
let worldbookCharBudget = 2000;   // 世界书正文最多占用的字数（超过预算的低优先级条目会被自动跳过，不影响关键设定）
let semanticCharBudget = 1200;    // 向量记忆 + 资料库检索结果最多占用的字数
// 🫀 活人感的各项参数（开关本身在 AUTO_FEATURE_DEFS / autoFeatureSwitches 里）
let aliveSettings = {
    sleepStart: 1,        // 几点之后算睡着了（没日程的角色按这个）
    sleepEnd: 8,          // 几点算醒
    minDelay: 5,          // 忙完之后再随机等 minDelay~maxDelay 分钟才回，别掐着秒回
    maxDelay: 30,
    urgentWords: '急,出事,救命,医院,别不理我',  // 消息里带这些词就立刻回，不挂起
    moodHalfLife: 8,      // 情绪多少小时衰减一半
    maxHold: 12,          // 最多挂多久（小时），超了强制回，防止日程写错把人锁死
    // 🫀 记忆褪色
    fadeClear: 3,         // 几天之内算"记得清楚"（全文给）
    fadeBlur: 14,         // 几天之内算"大概记得"（压到 60 字），再往前只剩印象（26 字）
    fadeDepth: 8,         // 往回翻几条总结（老的压过，比原来的 5 条全文还省）
    // 🔗 补齐"存了但一直没接上"的那几块（默认都开，这是补洞不是加功能）
    knowProfile: true,    // 角色知道自己资料页上写了什么
    knowFaction: true,    // 角色知道自己属于哪个势力
    knowDiary: true,      // 角色记得自己写过的日记
    useBusyReply: true,   // 消息被挂起时，用角色资料页里那句"忙碌自动回复"
    knowAnniv: true       // 角色知道今天是你记在日历里的什么日子
};
let aliveHeld = {};       // { sessionId: {charId, texts:[], since, until, kind, why} } 挂起的消息
let scheduleHistoryKeep = 14;     // 🗓️ 日程归档保留天数（记忆总览页里可调）：留得多能往回翻得更远、总结素材更全，存档也更大
let chatHistoryTurns = 20;        // 每次请求带入的最近聊天轮数（原来10条太短，跟每20条自动总结一次的周期对不上，容易在10条左右出现"原始上下文刚断层、总结里的旧话题却还杵在prompt里"导致话题跳回旧内容的问题，调大到20缓解断层）
// 💰 每条帖子最多让几个角色来互动。0 = 不限（改造前的行为）。
// 这是整个app里最影响 API 花费的一个数字：发推/发论坛贴那条路以前是 `for (let char of myCharacters)`，
// 角色库里有几个角色就发几次请求，每次都要带上那个角色的完整人设+世界书+预设（实测单次约 5900 字）。
// 27 个角色时，发一条推文＝30 次调用、约 9 万 token，其中 98% 花在这个循环上，而且角色越多越贵、线性增长。
let charInteractMaxCount = 5;

// 从候选角色里按"跟这条内容的相关度"挑最多 n 个出来互动。
// 排序思路是"谁最该出现在这条帖子的评论区"：
//   1) 正文里点名/@到的（名字或handle出现在文本里）—— 明确被叫到的人绝对不能被挤掉
//   2) 关系网里跟发帖人有连线的 —— 有关系的人才会关注彼此的动态
//   3) 最近跟用户聊过天的 —— 正在热络的人自然更活跃
//   4) 已关注的
//   5) 其余随机（每次随机，保证冷门角色也轮得到，不会永远是同几个人刷屏）
// 同一档次内部随机打散，避免每次都是角色列表里靠前的那几个。
function pickInteractingChars(candidates, contextText, authorId) {
    const list = (candidates || []).filter(Boolean);
    const n = (typeof charInteractMaxCount === 'number') ? charInteractMaxCount : 0;
    if (!n || n <= 0 || list.length <= n) return list;   // 0＝不限；本来就不超额也不用挑
    const text = String(contextText || '');
    const now = Date.now();
    const scored = list.map(c => {
        let score = 0;
        try {
            const handle = String(c.handle || '').replace('@', '');
            if (c.name && text.indexOf(c.name) !== -1) score += 1000;
            if (handle && text.toLowerCase().indexOf('@' + handle.toLowerCase()) !== -1) score += 1000;
            if (typeof charRelationships !== 'undefined' && Array.isArray(charRelationships) && authorId !== undefined) {
                if (charRelationships.some(r => (String(r.fromId) === String(c.id) && String(r.toId) === String(authorId))
                                             || (String(r.toId) === String(c.id) && String(r.fromId) === String(authorId)))) score += 300;
            }
            const chat = (typeof globalChats !== 'undefined' && globalChats) ? globalChats[c.id] : null;
            if (chat && chat.length) {
                const last = chat[chat.length - 1].timestamp || 0;
                const days = (now - last) / 86400000;
                if (days < 1) score += 200; else if (days < 3) score += 120; else if (days < 7) score += 60;
            }
            if (c.isFollowing) score += 40;
            if (c.isSpecialFollow) score += 30;
        } catch (e) { /* 单个角色数据异常不影响整体挑选 */ }
        return { c, score, r: Math.random() };
    });
    scored.sort((a, b) => (b.score - a.score) || (a.r - b.r));
    return scored.slice(0, n).map(x => x.c);
}
let enableScheduleAutoCheck = true; // 日程每日自动检测过期并提醒续写
let enableAffinitySystem = false; // 好感度数值系统（现在由"好感度系统"插件驱动，这个变量仍会被插件读写）
let enableTypingIndicator = true; // 正在输入提示/已读状态
let enableMiniGameCharSpeech = true; // 小游戏中角色是否发言的总开关（关闭后玩游戏时全程只有系统状态消息，角色不再评论/吐槽）
let chatListViewMode = 'row'; // 聊天联系人展示模式：'row'=横向头像条（原样式），'list'=竖排列表（头像+名字+最后消息预览+时间）
let pinnedSessionIds = []; // 置顶的角色/群聊会话id列表（可置顶多个）
let chatListShowingList = true; // 仅在 list 视图模式下有意义：true=正在浏览联系人列表，false=正在查看某个聊天内容
let enableAnniversary = true; // 纪念日系统
let chatWordLimit = 50, postWordLimit = 50, diaryWordLimit = 400, letterWordLimit = 400, commentWordLimit = 30;
// ✉️🗒️ 用户写信收到回信、日记被偷看后角色反应，这两处"随机等多久才有动静"的范围（单位：分钟），用户可以在设置里自己调；
// 到点前也可以直接点"立即回复"跳过等待。
let letterReplyDelayMin = 60, letterReplyDelayMax = 360;
// 🗒️ "我写日记选角色偷看"这个新玩法的数据：跟角色自己写的日记(char.diaryData.diaries，用户偷看那种)是完全独立的两套数据，
// 一条记录 {id, title, content, date, targetCharIds:[...], reactions:[{charId, status:'pending'|'peeked'|'not_peeked', dueAt, resultText}]}
let globalUserDiaries = [];
// 标记"旧版Unsplash链接清洗"是否已经彻底跑过一遍——只需要跑一次，跑过之后要跟着存档持久化下来，
// 否则每次 saveAllData() 都会把这个标记连同其它数据一起原样存回去，标记没了，下次打开app又会重新
// 触发一遍整个存档的 JSON.stringify+全局正则扫描，白白多占内存（详见 loadAllData 里的清洗逻辑）。
let unsplashCleaned = false;
// 💡 聊天多段回复的"条数"范围：AI一次回复可能拆成好几条消息分开发（模拟真人连发微信），
// 之前这个范围写死是"1到5条"，现在开放成可以自己调——chatWordLimit 同时也从"每条的上限"
// 改成了"这几条加起来的总字数预算"，由AI自己在这个总预算里，按 chatMsgCountMin~chatMsgCountMax
// 条的范围内自行决定要发几条、每条怎么分配字数。
let chatMsgCountMin = 1, chatMsgCountMax = 5;
// 💬 聊天回复条数/长度模式：'limited'=现在这套（chatMsgCountMin~Max条范围+chatWordLimit总字数硬上限，默认），
// 'classic'=旧版本聊天体验（条数固定随机1~4条、单条不限字数，没有总字数上限）——有用户喜欢现在这套省字数/更可控，
// 也有用户觉得被总字数卡得不自然、更喜欢旧版本那种想写多长写多长的聊天感觉，所以做成可以随时切换，不用二选一锁死。
let chatReplyStyleMode = 'limited';

// 💡 自动总结触发频率：以前"每聊几条消息自动总结一次"是写死的（单聊20条/群聊50条/推文记忆20条），
// 现在开放成可以自己调——数字越小总结越勤（更省心但更耗token/请求），越大越省但可能有段时间的
// 空窗期没被总结进去。这几个数字同时也决定"每次总结时截取最近多少条素材"（跟触发间隔保持一致）。
let chatSummaryInterval = 20;   // 单聊：每N条消息自动总结一次
let groupSummaryInterval = 50;  // 群聊：每N条消息自动总结一次
let postMemoryInterval = 20;    // 推文记忆：每N条帖子自动总结一次

// 💡 字数要求优先级声明：预设(AI预设系统)里的提示词模块可能自带自己的字数要求（比如某些酒馆预设的
// "文风模块"会写"控制在300-500字"），这段文字会跟着预设一起被塞进系统提示词里；而这里（聊天/推文/
// 日记/信件/续写/论坛等）用户自己设置的字数上限，是在那之后另外拼接、发给AI的。两条字数指令同时出现在
// 同一次请求里时，模型不一定100%听更靠后那条——这里统一加一句明确的优先级声明，附在每处"硬性字数上限"
// 提示词后面，把"听谁的"直接挑明说给AI听，避免被预设自带的字数描述带偏。
const WORD_LIMIT_PRIORITY_NOTE = '如果前文人设、世界书或预设内容里提到了不同的字数要求，一律以这里的字数要求为准。';

// 🐛 经典模式专用的同款声明。
// 上面那句只挂在"有字数上限"的场景后面，于是经典模式（本来就不设上限）反而成了唯一没人把话挑明的地方：
// prompt 里前面还留着预设/世界书自带的"控制在xxx字"，后面只有一句"单条不限制字数"跟它对着干，
// 模型每轮自己挑一个听——这轮听预设的写得又短又碎（看着就像切回了可控字数模式），下轮听经典的又放开写。
// 用户的体感就是"正常聊天时模式自己在新旧之间来回跳"，而且因为世界书是按关键词触发的，
// 有时候还真的是聊到某个话题才开始跳，更像"聊着聊着变了"。
// 这里给经典模式补上对称的一句，把"谁说了算"同样挑明。
const NO_WORD_LIMIT_PRIORITY_NOTE = '如果前文人设、世界书或预设内容里提到了任何字数要求或字数上限，在这里一律不适用、不要遵守——本条指令优先，这一轮回复不设任何字数上限。';

// 聊天"多段回复指令"文案：主聊天(js/05 triggerAIBatchReply)和角色主动发消息(js/07 sendProactiveChatMessage)
// 两处原来是各自复制一份几乎一样的长文案，现在收成这一个共享函数——顺便借这个机会实现"回复条数/长度模式"切换：
// 'classic' 分支的文案是直接照搬旧版本script.js里 triggerAIBatchReply 的原文（条数固定随机1~4条、单条不限字数、
// 没有总字数上限，还带着旧版本那段"打破机械化段落结构/替换平淡词汇"的人性化文风要求），一个字都没改，
// 保证选了经典模式的用户拿到的确实是他们怀念的那个版本的行为，不是我自己按理解重新写的一份。
function getChatMultiReplyBlock() {
    if (chatReplyStyleMode === 'classic') {
        // 🐛 修复"切换经典模式后回复里混进别的角色人设"：旧版原文里"保留原文核心信息与核心意图"这类措辞，
        // 本意是"让AI自己的话别写得太规整机械"，但字面上很像"改写/复述某段既有原文"的指令——而prompt里
        // 世界书/关系网经常会附带其它角色的人设简介作为背景信息，模型偶尔会把"离这段指令最近的一段人物描述"
        // 误当成要"保留/复述"的那个"原文"，导致回复里混进别的角色人设（1对1和群聊都会中招，因为关系网/世界书
        // 描述其他角色这件事跟是不是群聊无关）。这里在旧版原文前面加一句身份锚点澄清，不改动原文一个字，
        // 只是明确"要保留意图的是你自己想说的话，不是别人的设定"。
        return `【多段回复指令】\n你自始至终只以你自己的人设身份来回复，不要代入或复述聊天记录、世界书、人物关系网里提到的任何其他角色的人设/口吻/设定——下面这些关于"怎么把话写得自然"的要求，指的是把你自己要说的内容写得更真实自然，不是要你改写、复述或代入别的什么"原文"。\n回复条数随机不固定，单条不限制字数。${NO_WORD_LIMIT_PRIORITY_NOTE}动作描写必须真实详尽，回复贴近人类自然表达，并保留原文核心信息与核心意图，减少过于规整的完美句式，适当加入不规则表达；融入个性化语言风格，穿插少量口语化表述；打破机械化的段落结构，让整体读起来更真实自然。替换平淡词汇，选用更精准、生动的表达；调整句式结构，让行文更流畅自然，同时强化语言韵律感；统一语言风格并契合使用场景；修正语法、拼写等细节错误，全程保留原文核心信息与核心意图。模仿真实的微信聊天，通过多条消息（随机发送1到4条）和随机的时间间隔发送。\n输出格式【必须严格遵守JSON】，不要包含任何 Markdown 语法、不要带有 \`\`\`json 前缀，不要有任何其他的说明文字；text字段内部如果要出现双引号（比如引用/复述一句话），必须写成转义的 \\" ，不能直接写裸的 " ，否则JSON会解析失败、导致整段代码原样显示出来。如果决定不回复，请直接返回 {"replies": []}。\n格式示例：\n{\n  "replies": [\n    {"delay": 2, "text": "你要这么说的话..."},\n    {"delay": 3, "text": "我可就不困了啊[EMO:emo_123]"}\n  ],\n  "stateUpdate": "打算回去继续睡回笼觉", "statusTypeLabel": "睡觉"\n}`;
    }
    return `【多段回复指令】\n回复条数在${chatMsgCountMin}到${chatMsgCountMax}条之间自己决定（不固定，别每次都卡最大值），这几条加起来的总字数不超过${chatWordLimit}字（这是硬性上限，不是必须写满）——自己按内容需要把这个总字数分配到每一条里，可以有长有短，不要求条条都写满。${WORD_LIMIT_PRIORITY_NOTE}模仿真实的微信聊天，通过多条简短消息和随机的时间间隔发送。\n输出格式【必须严格遵守JSON】，不要包含任何 Markdown 语法、不要带有 \`\`\`json 前缀，不要有任何其他的说明文字；text字段内部如果要出现双引号（比如引用/复述一句话），必须写成转义的 \\" ，不能直接写裸的 " ，否则JSON会解析失败、导致整段代码原样显示出来。如果决定不回复，请直接返回 {"replies": []}。\n格式示例：\n{\n  "replies": [\n    {"delay": 2, "text": "你要这么说的话..."},\n    {"delay": 3, "text": "我可就不困了啊[EMO:emo_123]"}\n  ],\n  "stateUpdate": "打算回去继续睡回笼觉", "statusTypeLabel": "睡觉"\n}`;
}

// 「🔄 侧滑重新生成」单条回复用的指令。它和 getChatMultiReplyBlock 一样，必须跟着
// "聊天回复条数/长度模式"走。
// 🐛 修复"聊着聊着模式自己在新旧之间来回跳"：这段文案以前不管什么模式都写死
// "回复字数不超过 chatWordLimit 字"，于是选了经典模式的用户会看到——正常聊天是旧版那种
// 想写多长写多长，一旦侧滑重新生成，这一条突然被砍成几十字的短回复，再发下一条又变回旧版。
// 用户感受到的就是"模式自己在切换"，其实是这一条路径漏掉了模式判断。
// 注意：重新生成替换的是**一条**气泡，所以这里不套用经典模式"随机发1~4条"的分条要求，
// 只把"不限字数、写得自然"这部分对齐（真返回多条的话，调用处会用 \n 合并进同一条，不会出错）。
function getChatRegenReplyBlock() {
    const lengthRule = chatReplyStyleMode === 'classic'
        ? NO_WORD_LIMIT_PRIORITY_NOTE + '这一条不限制字数，想写多长写多长；动作描写真实详尽，贴近人类自然表达，少用过于规整的完美句式，适当加入不规则表达和少量口语化表述。'
        : `回复字数不超过${chatWordLimit}字（这是硬性上限，不是必须写满）。${WORD_LIMIT_PRIORITY_NOTE}`;
    return `\n【回复指令】\n${lengthRule}输出格式【必须严格遵守JSON】，不要包含任何 Markdown 语法。格式示例：\n{\n  "replies": [\n    {"text": "你想回复的对话或动作"}\n  ],\n  "stateUpdate": "你的内部状态", "statusTypeLabel": "闲"\n}`;
}

let npcReplyProb = 0.4, npcReplyMaxCount = 3;
// 路人之间互相接话/吵架的概率。评论区里网友互相搭话本来就比"各说各的"常见得多，
// 但也不能每轮都吵，不然角色的话会被路人吵架刷没。
let npcArgueProb = 0.5;
// 角色回应是否延迟（不秒回）。关掉就是老行为——测试和"我就想立刻看到效果"时有用。
let charReplyDelayEnabled = true;
// 流式输出（边生成边显示）开关。开着更有"正在写"的实时感；
// 关掉就整段生成完再一次性显示——有些中转服务商的流式通道不稳定（吞字、卡住、直接报错），
// 遇到这种情况关掉它更省心。
//
// 这个开关现在管三个地方：
//   1. 续写工作台（互动续写/小说）—— 逐字往正文里贴，最细的那种流式。
//   2. 酒馆桥接的 generate（给角色卡里的脚本用）—— 同上，逐字回调。
//   3. 聊天 / 群聊 —— **按气泡**流式，不是按字。原因是聊天要求模型返回一整段
//      {"replies":[...]} 的JSON，半截JSON贴到气泡里就是一堆乱码；但"数组里已经写完的
//      那几条"是可以提前发出来的。所以这里一边收一边扫，扫到一个闭合的 {...} 就立刻发一条，
//      模型还在写第二条的时候第一条气泡已经出来了（见 extractStreamingReplies）。
//      关掉就退回老行为：整段收完再一条条发，功能完全一样，只是第一条要多等一会儿。
// 表情包/图片/引用/转私聊这些标记的解析在两条路上是同一段代码，不会因为开不开流式而不一样。
let enableStreaming = true;
// 群聊转私聊：角色看完群里的对话，可以自己决定要不要私下来找用户说。
// 跟推特评论区那个"转私聊"是同一套机制（[MOVETOCHAT] 标记 + deliverCharMoveToChatMessage），
// 但开关分开——群里当着大家的面不好说的话转私聊，跟评论区那个场景是两回事，
// 有人想要群聊安静点、只在评论区用，得能分别关。
let enableGroupMoveToChat = true;
let globalBgImage = null, globalBgOpacity = 1;

// 全局自定义CSS
let globalCustomCSS = "";
// 这段CSS会被注入到<head>里的<style>标签，对整个App所有界面生效（不是只对某一页）。
// 页面里大量元素直接写了内联 style="..."，内联样式的优先级天生比这里的任何选择器都高，
// 想覆盖那些效果，规则后面加 !important 就行。留空则用默认外观。

// 🖱️ 自定义点击特效：点击页面任意位置弹出一个小动画（爪印/爱心/星星/自定义图片...），纯装饰，默认关闭。
// clickEffectStyle 可选值：'paw'(爪印) / 'heart'(爱心) / 'sparkle'(星星) / 'custom'(用户自己上传的图片)
let clickEffectEnabled = false;
let clickEffectStyle = 'paw';
let clickEffectCustomImage = null; // 'custom' 模式下用的自定义图片，base64 dataURL

// 🧮 聊天变量存储（兼容SillyTavern的 {{getvar::x}}/{{setvar::x::y}} 系列宏，以及EJS模板里调用的getvar/setvar函数）：
// 按"作用域key"分桶——正常聊天传sessionId（角色id或群聊id"g_xxx"），没有sessionId的场景（比如群聊拉新人的欢迎语、
// 评论区回复这类一次性生成）就退化用char.id兜底，保证宏至少有个稳定落点，不会每次生成都读到空值。
let chatVariables = {}; // { [scopeId]: { 变量名: 值 } }
// 全局变量（跨聊天共享），对应ST里的 {{getglobalvar::x}}/{{setglobalvar::x::y}}
let globalVariables = {};

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
let currentMemoryHubTargetId = null; // "记忆总览"独立页面里当前选中查看的角色/群聊id
let currentDiaryCharId = null, currentDiaryTab = 'letter', tempGeneratedDiary = null, viewingDiaryId = null;

// ⚠️ 这里是**新装时的默认资料**，不是谁的名字写死在这里。
// 以前默认名字是作者本人的名字，别人装上这个网站，一进来自己的账号就叫那个名字，
// 而且所有提示词里都会出现它（"用户XXX给你寄来一封信"…）——等于把作者的名字硬塞给了每一个用户。
// 改成中性的"我"，用户在"编辑资料"里改成自己的名字之后，全站提示词自动跟着变。
let currentUser = {
    id: 'me', name: "我", handle: "@my_account", bio: "这是我的个人签名...",persona: "", followers: 128, following: 50, location: "地球", website: "myblog.com", birthdate: "2000-01-01", verified: false, avatarImg: null, bgImg: null, avatarEmoji: "我", themeColor: "#1d9bf0", anonName: "匿名用户", anonId: Math.random().toString(36).substr(2,8).toUpperCase(), nudgeText: "的聪明脑袋", gender: "未知", customAnniversaries: []
};

// 提示词里要写"用户叫什么"的地方统一走这个函数，不要直接拼 currentUser.name。
// 两个作用：
//   1) 名字被清空/存档里没有这个字段时，不会拼出"用户 给你寄来一封信"这种断句；
//   2) 名字还是默认的"我"时，在提示词里写"我给你寄来一封信"会让模型分不清是谁——
//      这种情况下换成"用户"这个中性称呼，模型不会误解，界面上显示的仍然是用户自己设的名字。
function userDisplayName(char) {
    // 传了角色就用"在这个角色面前我是谁"，没传就是当前正在用的那份资料（老调用点行为不变）
    const u = (char && typeof resolveUserPersonaFor === 'function') ? resolveUserPersonaFor(char) : currentUser;
    const n = ((u && u.name) || '').trim();
    if (!n || n === '我') return '用户';
    return n;
}

// ===================== 👤 多人设绑定 =====================
// 你在不同角色、不同势力面前可以是不同的人：在医院同事眼里是"实习生小林"，
// 在匿名论坛马甲那边是"夜猫"，在某个势力里又是另一重身份。
//
// 实现上**只影响拼给 AI 的那段"用户是谁"**，绝不去改 currentUser 本身——
// 全项目有上百处直接读 currentUser.xxx（头像、昵称、界面显示、存档结构），
// 真去切换 currentUser 的话，界面会跟着一起变，那是"换号"不是"换人设"，
// 而且一旦哪条链路漏了还原，所有角色的"你是谁"就会全乱套。
//
// 绑定关系单独存两张表，不动 userPersonas 本身：
//   charUserPersona    = { 角色id: 人设id }
//   factionUserPersona = { 势力名: 人设id }
// 优先级：角色单独绑的 > 它所属势力绑的（按角色的势力列表顺序取第一个命中的）> 当前资料。
let globalTheaterLogs = [];   // 🎭 小剧场记录：角色私下发生的事。默认不限条数，上限在「记忆总览」里可调（见 js/14）
let theaterLogKeep = 0;       // 0 ＝ 不限；填了正数就只保留最近这么多场
let charUserPersona = {};
let factionUserPersona = {};

function getUserPersonaById(id) {
    if (!id) return null;
    const p = (typeof userPersonas !== 'undefined' && Array.isArray(userPersonas))
        ? userPersonas.find(x => x && x.id === id) : null;
    return (p && p.data) ? p.data : null;
}
// 返回一个"用户资料对象"（可能是某份保存的人设快照，也可能就是 currentUser）。
// char 可以传角色对象或角色id；传不出来就退回 currentUser。
function resolveUserPersonaFor(char) {
    try {
        let c = char;
        if (c !== null && typeof c !== 'object') c = (myCharacters || []).find(x => String(x.id) === String(char));
        if (!c) return currentUser;
        const byChar = getUserPersonaById(charUserPersona[String(c.id)]);
        if (byChar) return byChar;
        const factions = (typeof getCharFactions === 'function') ? getCharFactions(c) : (c.group ? [c.group] : []);
        for (const g of factions) {
            const byFaction = getUserPersonaById(factionUserPersona[g]);
            if (byFaction) return byFaction;
        }
        return currentUser;
    } catch (e) { return currentUser; }
}
// 这个角色/势力现在用的是哪份人设（给界面显示用），没绑定返回 null
function getBoundPersonaLabel(char) {
    try {
        let c = char;
        if (c !== null && typeof c !== 'object') c = (myCharacters || []).find(x => String(x.id) === String(char));
        if (!c) return null;
        const pid = charUserPersona[String(c.id)];
        if (pid) {
            const p = userPersonas.find(x => x && x.id === pid);
            if (p) return { label: p.label || '未命名人设', from: 'char' };
        }
        const factions = (typeof getCharFactions === 'function') ? getCharFactions(c) : [];
        for (const g of factions) {
            const fid = factionUserPersona[g];
            if (!fid) continue;
            const p = userPersonas.find(x => x && x.id === fid);
            if (p) return { label: p.label || '未命名人设', from: 'faction', faction: g };
        }
        return null;
    } catch (e) { return null; }
}
let tabloidAccount = {
    id: 'tabloid_admin', name: "X星圈内爆料", handle: "@tabloid_news", persona: "专业狗仔，娱乐圈纪委，看热闹不嫌事大", bio: "掌握全网第一手瓜。欢迎私信爆料。", followers: 99999, following: 0, location: "深渊暗网", website: "", birthdate: "2020-01-01", verified: true, avatarImg: null, bgImg: null, avatarEmoji: "📰", themeColor: "#f91880", isFollowing: false, isSpecialFollow: false
};

let globalPosts = [], globalNotifications = [], anonPosts = []; 
let trendingTags = ["#赛博朋克2026", "#科技改变生活", "#打工人的日常"];
let characterGroups = ["Vtuber", "程序员", "偶像", "校园", "都市"];
// ===================== 🏴 势力（角色分组）=====================
// 一个角色**可以同时属于多个势力**（原来只能填一个 char.group）。
//
// 存储上保留了 char.group 这个老字段当"主势力"：全项目有几十处只需要一个值的地方
// （头像旁边的色点、关注卡上的小标签、导出格式、云端同步……），继续读 char.group 就行，
// 不用一处处改成"取数组第一个"。真正的完整列表在 char.groups 里。
// 两边永远由 setCharFactions 一起写，不会出现"数组里有、主势力却是空"这种半拉状态。
//
// 老存档里只有 char.group 没有 char.groups —— getCharFactions 读的时候顺手补上，
// 不需要专门写一次全量数据迁移（也就不存在"迁移脚本跑一半失败"的风险）。
function getCharFactions(c) {
    if (!c) return [];
    if (!Array.isArray(c.groups)) {
        c.groups = (c.group && String(c.group).trim()) ? [String(c.group).trim()] : [];
    }
    return c.groups;
}
function charInFaction(c, name) {
    if (!c || !name) return false;
    return getCharFactions(c).some(g => g === name);
}
function setCharFactions(c, list) {
    if (!c) return;
    const arr = Array.from(new Set((list || []).map(x => String(x || '').trim()).filter(Boolean)));
    c.groups = arr;
    c.group = arr[0] || '';   // 主势力＝列表第一个，供只认单值的老代码使用
}
// 势力被改名/删除时，把每个角色的列表一起更新（主势力也会跟着重算）
function renameFactionEverywhere(oldName, newName) {
    (myCharacters || []).forEach(c => {
        const arr = getCharFactions(c);
        if (!arr.includes(oldName)) return;
        setCharFactions(c, arr.map(g => (g === oldName ? newName : g)));
    });
}
function removeFactionEverywhere(name) {
    (myCharacters || []).forEach(c => {
        const arr = getCharFactions(c);
        if (!arr.includes(name)) return;
        setCharFactions(c, arr.filter(g => g !== name));
    });
}

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
    if (isSubTask && subApiKey && subApiUrl && subModel) return { url: subApiUrl, key: subApiKey, model: subModel, isSub: true };
    return { url: myApiUrl, key: myApiKey, model: myModel, isSub: false };
}

// 向量记忆专用API：填了就用这个（跟主API、副API完全独立，专门服务 /embeddings 请求），
// 没填就自动兜底回主API——不会自动去用副API，避免"副API"被悄悄挪作它用。
function getVectorApiConfig() {
    if (vecApiUrl && vecApiKey) return { url: vecApiUrl, key: vecApiKey, isVec: true };
    return { url: myApiUrl, key: myApiKey, isVec: false };
}

// ===== 模型不可用兜底：识别"模型不存在/服务商没开通这个模型"这类报错 =====
// 典型报错例子：{"error":{"code":"model_not_found","message":"No available channel for model xxx under group default (distributor)"}}
// 这类报错换个模型基本必现（不是网络抖动，重试原模型没用），所以要单独识别出来，跟"并发超限稍后重试"分开处理。
function isModelUnavailableError(msg) {
    if (!msg) return false;
    return /model_not_found|no available channel|model[^a-z0-9]{0,12}(not[^a-z0-9]{0,4}found|not[^a-z0-9]{0,4}available|does not exist|unavailable)|invalid model|unknown model|该模型(不存在|未开通|不可用)|模型不存在/i.test(String(msg));
}

// ★ 修复"聊天时候代码/JSON原文直接显示在对话里"的bug：
// 之前用一个很粗暴的正则 /\{[\s\S]*\}/ 去从AI原始输出里"抓第一个{到全文最后一个}"，
// 一旦AI输出里字符串内部混进了没转义的真实换行符（很常见的小毛病）、多余的结尾逗号，
// 或者JSON前后跟了别的文字，JSON.parse就会直接报错，导致整段兜底原文（看起来就是一坨JSON）
// 被当成一条聊天气泡原样发出来。这里统一换成"逐字符找到与第一个{真正匹配的}"（识别字符串边界，
// 不会被字符串里的{}干扰），解析失败时再自动修一遍"字符串内裸换行/裸制表符"和"结尾多余逗号"这两种
// AI最常犯的小毛病后重试。全文所有解析AI返回JSON的地方都统一改用这个函数，而不是各自复制一份正则。
// 🐛 修复"部分推理模型不显示HTML/思考过程混进正文"：有些模型（尤其是没有走标准reasoning_content分离、
// 靠prompt自己"想清楚再回答"的模型）会把一整段思维过程原样写在最终JSON前面，中间往往还会顺手写一两个
// 不完整的"草稿JSON"（比如举例子、打草稿），如果只找"第一个{到匹配的}"，抓到的经常是这种草稿/半成品，
// 而不是文本最后那个才是模型真正想返回的完整答案。这里改成：先找出文本里所有"顶层{...}"候选片段，
// 从最后一个往前试解析，第一个能成功解析（且修复常见小毛病后也能解析）的就用它——最后一个通常才是
// 模型思考完之后给出的正式结论，比"第一个"更可靠。
function findTopLevelJsonSpans(text) {
    let spans = [];
    let depth = 0, inStr = false, strCh = '', esc = false, start = -1;
    for (let i = 0; i < text.length; i++) {
        let ch = text[i];
        if (inStr) {
            if (esc) { esc = false; }
            else if (ch === '\\') { esc = true; }
            else if (ch === strCh) { inStr = false; }
            continue;
        }
        if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
        if (ch === '{') { if (depth === 0) start = i; depth++; }
        else if (ch === '}') { depth--; if (depth === 0 && start !== -1) { spans.push([start, i]); start = -1; } else if (depth < 0) depth = 0; }
    }
    return spans;
}
function tryParseJsonCandidate(candidate) {
    try { return JSON.parse(candidate); } catch (e) {}
    let fixed = '', inStr = false, esc = false;
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
    // 🆕 再兜底一层，专治"整段JSON原样显示在聊天里没被解析"这个最常见的成因：模型写对话内容时，
    // 引用/复述一句话经常会顺手在text字段值内部再打一对引号（比如 "text": "他说"接收我的指令"。"），
    // 这对人类阅读没问题，但对JSON来说，内部这对没转义的引号会被判定成字符串提前结束，后面的内容
    // 变成裸露在字符串外面的非法字符，直接解析失败。这里重新扫一遍：进入字符串后遇到"，往后跳过空白
    // 看紧跟的下一个字符——是 , : } ] 或者已经到末尾，才当作真正的结束引号；否则判定是文本里没转义的
    // 内部引号，补上转义(\")继续留在字符串里。判断依据是启发式，有极小概率误判，所以放在最后一道兜底，
    // 前面两轮常规修复都失败了才会走到这里。
    try { return JSON.parse(repairUnescapedInnerQuotes(fixed)); } catch (e3) {}
    return null;
}
function repairUnescapedInnerQuotes(candidate) {
    let fixed = '', inStr = false, esc = false;
    for (let i = 0; i < candidate.length; i++) {
        let c = candidate[i];
        if (!inStr) {
            fixed += c;
            if (c === '"') inStr = true;
            continue;
        }
        if (esc) { fixed += c; esc = false; continue; }
        if (c === '\\') { fixed += c; esc = true; continue; }
        if (c === '"') {
            let j = i + 1;
            while (j < candidate.length && /\s/.test(candidate[j])) j++;
            let nextCh = candidate[j];
            if (nextCh === undefined || ',:}]'.includes(nextCh)) { fixed += c; inStr = false; continue; } // 真正的结束引号
            fixed += '\\"'; continue; // 内部没转义的引号，补上转义继续留在字符串里
        }
        fixed += c;
    }
    return fixed;
}

// extractJsonObject 三轮修复全部失败之后的最后一道保险：不追求解析出完整合法的JSON对象了，
// 只用正则单独把某个字段（比如"text"）的字符串值抠出来——很多调用点(日记批注/聊天多段回复等)
// 在彻底解析失败时，此前的兜底做法是把没解析成功的原始JSON/【正式输出开始】标记文字整段甩给用户看，
// 体验很差；能用正则单独抠出目标字段的话，至少能让用户看到"AI本来想说的那句话"，而不是一坨代码。
// 只能处理"字段值是双引号包裹的字符串"这一种最常见情况，抠不出来就返回null，调用方自己决定兜底成什么样。
function extractStringFieldLoose(text, fieldName) {
    if (!text || typeof text !== 'string') return null;
    const re = new RegExp('"' + fieldName + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"');
    const m = text.match(re);
    if (!m) return null;
    try { return JSON.parse('"' + m[1] + '"'); } // 借用JSON.parse本身处理\n \" \\ 这些转义序列，不用自己再写一遍反转义逻辑
    catch (e) { return m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\'); } // JSON.parse也失败就退化成手动简单反转义
}

// 🔖 统一的"正式输出"分界标记：部分模型（尤其没有走标准reasoning_content通道的"思考型"模型）会把
// 整段思考过程原样写在最终答案前面，不带任何<think>之类的标签，导致思维链识别/JSON提取都可能认错内容。
// 治本的办法是在prompt里明确要求模型思考完之后用这个标记单独另起一行，标记之后才是真正要用的内容——
// 有了这个标记，不用再靠"猜JSON边界""猜最后一段"这类启发式，直接精确切割。没有出现这个标记时
// （模型没遵循，或者本来就没有思考过程），下面这个函数原样返回全文，不影响任何现有行为。
const FINAL_ANSWER_MARKER = '【正式输出开始】';
function getFinalAnswerMarkerPromptNote() {
    return `如果你需要先想清楚再回答（比如组织措辞、检查设定是否符合），可以在正式内容之前自由思考，但必须在思考结束、正式内容开始之前单独另起一行，写上"${FINAL_ANSWER_MARKER}"这个标记（原样照抄，不要加引号），标记之后紧跟的才是你要真正输出的正式内容；如果你不需要思考，也请直接以这个标记开头再接正式内容。这个标记本身不算正式内容的一部分。`;
}
// 🐛 修复"点赞变成发了'点赞'两个字"：prompt 里让角色"只想点赞就输出 LIKE"，
// 但代码判断写的是 `repText.toUpperCase() === 'LIKE'` —— 严格全等。
// 模型实际会输出 "LIKE。" / "[LIKE]" / "【点赞】" / "[已赞]" / "赞" / "*点赞*" 等等一大堆变体，
// 一个都对不上，于是全都落到"当成一条评论发出去"那条分支，评论区里就出现了「[已赞]」这种东西。
// 这里统一成"宽松识别"：把标点、方括号、书名号、星号、引号都剥掉之后再比。
// 只认**整条内容就是一个点赞**的情况——正文里顺带提到"赞"字的正常评论不会被误判。
function looksLikeALikeOnly(text) {
    if (!text) return false;
    let t = String(text).trim();
    if (t.length > 12) return false;                       // 超过这个长度肯定是在说话，不是点赞
    t = t.replace(/[\s\[\]【】（）()《》"'"'`*_~。．.,，!！]/g, '');
    if (!t) return false;
    return /^(LIKE|LIKED|已赞|点赞|已点赞|赞|赞了|👍|❤️|❤)$/i.test(t);
}
function extractAfterFinalMarker(text) {
    if (!text || typeof text !== 'string') return text;
    const idx = text.lastIndexOf(FINAL_ANSWER_MARKER);
    if (idx === -1) return text;
    return text.slice(idx + FINAL_ANSWER_MARKER.length).replace(/^\s+/, '');
}

// 🧹 剥掉模型的"思考过程"：推理模型（deepseek-reasoner、QwQ、各种带 thinking 的中转）经常在正文前面
// 先吐一段 <think>...</think>。之前好几处是直接 JSON.parse(rawText)，碰上这种就炸：
//     生成日程失败：Unexpected token '<', "<think>好的，"... is not valid JSON
// 这里统一处理三种情况：
//   1) 完整成对的 <think>…</think> / <thinking> / <reasoning> / <thought>：整段删掉
//   2) 只有开标签没有闭标签（流式被截断、或者模型忘了闭）：从标签开始一直删到末尾——
//      但只有在后面还能找到 JSON 的时候才这么干，否则宁可原样返回让上层去猜
//   3) ```json 围栏
function stripReasoningBlocks(text) {
    if (!text || typeof text !== 'string') return text;
    let t = text;
    // 成对的先删（贪婪匹配到最后一个闭标签，避免思考里自己又写了个 <think> 导致只删掉一半）
    t = t.replace(/<(think|thinking|reasoning|thought|reason)\b[^>]*>[\s\S]*<\/\1>/gi, '');
    // 只有开标签的：从它开始砍到末尾，但砍之前确认剩下的还有 { 或 [，不然等于把答案也砍没了
    const openOnly = /<(think|thinking|reasoning|thought|reason)\b[^>]*>/i.exec(t);
    if (openOnly) {
        const head = t.slice(0, openOnly.index);
        if (/[\{\[]/.test(head)) t = head;                    // 答案在前面，后面是思考 → 留前面
        else {
            // 答案在后面：把开标签之后的部分留下来（模型忘了闭标签的典型情况）
            const tail = t.slice(openOnly.index + openOnly[0].length);
            if (/[\{\[]/.test(tail)) t = tail;
        }
    }
    // ⚠️ 顺序很重要：先 trim 再剥 ``` 围栏。
    // 剥完 <think>…</think> 之后开头通常剩一个换行，这时 /^```json/ 是匹配不上的，
    // 围栏留在里面就会让后面的 JSON.parse 全部失败（我第一版就踩了这个）。
    t = t.trim();
    t = t.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
    return t.trim();
}

// 统一的"把模型输出解析成 JSON"入口：先剥思考过程，再走 extractJsonObject 那套
// （它会优先看正式输出标记、并从最后一个 JSON 块往前试）。全都失败才返回 null。
// ⚠️ 凡是要 JSON.parse 模型输出的地方都该用这个，不要再裸调 JSON.parse——
//    模型只要多吐一个字符，裸调就是一个用户看得见的报错。
function parseModelJson(rawText) {
    if (!rawText) return null;
    const cleaned = stripReasoningBlocks(String(rawText));
    // 先按最理想的情况直接试一把，省得每次都走扫描
    try {
        const direct = JSON.parse(cleaned);
        if (direct && typeof direct === 'object') return direct;
    } catch (e) { /* 落到下面的容错路径 */ }
    // 先看这段文本整体更像数组还是对象：谁的开括号在前就先试谁。
    // 不判断的话，一个 [{"text":"a"},{"text":"b"}] 会被 extractJsonObject 拆出最后那个
    // {"text":"b"} 当成答案返回——调用方拿到的是个对象，Array.isArray 一判就挂。
    const iArr = cleaned.indexOf('[');
    const iObj = cleaned.indexOf('{');
    const arrayFirst = iArr !== -1 && (iObj === -1 || iArr < iObj);
    const tryArray = () => (typeof extractJsonArray === 'function') ? extractJsonArray(cleaned) : null;
    const tryObject = () => (typeof extractJsonObject === 'function') ? extractJsonObject(cleaned) : null;
    const first = arrayFirst ? tryArray() : tryObject();
    if (first) return first;
    const second = arrayFirst ? tryObject() : tryArray();
    if (second) return second;
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
    return null;
}

function extractJsonObject(rawText) {
    if (!rawText) return null;
    // 如果模型遵循了"正式输出标记"的要求，优先只在标记之后的内容里找JSON——比"猜最后一个JSON块"更精确，
    // 彻底避免思考过程里出现的任何草稿/示例JSON片段被误当成正式答案。
    // 先剥掉 <think>…</think> 这类思考过程再找 JSON：不剥的话，思考里随手写的草稿 JSON
    // 会跟正式答案混在一起被当成候选。这样一改，所有用到这两个提取函数的老调用点
    // （日记/信件、角色资料自动填写、状态更新、开场白生成……）都一并对推理模型免疫了。
    let text = String(extractAfterFinalMarker(rawText));
    if (typeof stripReasoningBlocks === 'function') text = stripReasoningBlocks(text);
    text = text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    let spans = findTopLevelJsonSpans(text);
    if (spans.length === 0) return null;
    // 从最后一个候选片段开始试，最后一个解析成功的即为最终答案；全部解析失败时兜底退回"第一个"的老行为。
    for (let k = spans.length - 1; k >= 0; k--) {
        let [s, e] = spans[k];
        let parsed = tryParseJsonCandidate(text.slice(s, e + 1));
        if (parsed !== null) return parsed;
    }
    return null;
}
// 跟 findTopLevelJsonSpans 是同一套思路，只不过找的是顶层"[...]"（JSON数组）而不是"{...}"（JSON对象）——
// 供"AI应该返回一个JSON数组"这类场景使用（比如NPC批量评论）。之前这类地方各自用一个简单粗暴的
// /\[[\s\S]*\]/ 正则（从第一个[贪婪匹配到最后一个]），一旦AI在数组前后多写了任何带方括号的说明文字
// （哪怕只是"参考格式：[...]"这种），就会把不相关的内容也吞进来，拼出语法错误的"JSON"，
// 报错"Unexpected non-whitespace character after JSON"。改成跟对象一样"找出所有顶层候选片段，
// 从最后一个开始试解析"，从根源上避免这个问题，且不需要每个调用点各自维护一份提取逻辑。
function findTopLevelJsonArraySpans(text) {
    let spans = [];
    let depth = 0, inStr = false, strCh = '', esc = false, start = -1;
    for (let i = 0; i < text.length; i++) {
        let ch = text[i];
        if (inStr) {
            if (esc) { esc = false; }
            else if (ch === '\\') { esc = true; }
            else if (ch === strCh) { inStr = false; }
            continue;
        }
        if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
        if (ch === '[') { if (depth === 0) start = i; depth++; }
        else if (ch === ']') { depth--; if (depth === 0 && start !== -1) { spans.push([start, i]); start = -1; } else if (depth < 0) depth = 0; }
    }
    return spans;
}
function extractJsonArray(rawText) {
    if (!rawText) return null;
    // 先剥掉 <think>…</think> 这类思考过程再找 JSON：不剥的话，思考里随手写的草稿 JSON
    // 会跟正式答案混在一起被当成候选。这样一改，所有用到这两个提取函数的老调用点
    // （日记/信件、角色资料自动填写、状态更新、开场白生成……）都一并对推理模型免疫了。
    let text = String(extractAfterFinalMarker(rawText));
    if (typeof stripReasoningBlocks === 'function') text = stripReasoningBlocks(text);
    text = text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    let spans = findTopLevelJsonArraySpans(text);
    if (spans.length === 0) return null;
    // 跟 extractJsonObject 反过来，这里从第一个候选片段开始试：这类调用点的prompt通常明确要求
    // "只返回一个JSON数组，不要有其它说明文字"，所以真正的答案几乎总是文本里第一个完整的顶层数组，
    // 后面如果还跟着别的方括号内容，大概率是模型自己画蛇添足的举例/备注，不是要用的那份数据。
    for (let k = 0; k < spans.length; k++) {
        let [s, e] = spans[k];
        let parsed = tryParseJsonArrayLoose(text.slice(s, e + 1));
        if (parsed !== null && Array.isArray(parsed)) return parsed;
    }
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
// ★ 打包成App后角色互动/发推全部失效的修复：
// 网页版里 fetch() 请求第三方API是正常的浏览器同源页面发起的，很多API/中转服务器不会拦；
// 但打包成Android App后（HBuilderX / 5+ Runtime），页面通常是以 file:// 方式加载的本地文件，
// 此时 fetch() 发出的请求 Origin 是 "null"，不少API服务商/自建中转会因为校验不到合法来源
// 直接拒绝这个请求（或者干脆连不上），JS这边看到的就是一个笼统的网络错误，界面上表现为
// "转了一下圈就没了、什么都不发生"。5+ Runtime 官方提供了 plus.net.XMLHttpRequest，
// 这是走原生网络层发起的请求，不经过WebView的跨域限制，是这类问题的标准解法。
// 这里做特性检测：只有真的跑在打包后的App环境里（window.plus 存在）才会走这条路，
// 网页版完全不受影响、行为和以前一模一样。
function plusNetRequest(url, options) {
    return new Promise((resolve, reject) => {
        try {
            const xhr = new plus.net.XMLHttpRequest();
            xhr.open(options.method || 'GET', url);
            if (options.headers) {
                Object.keys(options.headers).forEach(k => xhr.setRequestHeader(k, options.headers[k]));
            }
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve({ ok: true, status: xhr.status, json: async () => JSON.parse(xhr.responseText), text: async () => xhr.responseText });
                    } else {
                        reject(new Error(`HTTP ${xhr.status}: ${(xhr.responseText || '').slice(0, 200)}`));
                    }
                }
            };
            xhr.onerror = function () { reject(new Error('plus.net.XMLHttpRequest 网络请求失败（可能是域名不可达、证书问题或网络未连接）')); };
            xhr.ontimeout = function () { reject(new Error('plus.net.XMLHttpRequest 请求超时')); };
            xhr.send(options.body);
        } catch (e) { reject(e); }
    });
}
// ⚠️ 修复"调用某些API/中转站报HTTP 0"：HTTP状态码0一般表示请求在拿到任何服务器响应之前就
// 失败了（DNS解析不到、SSL证书问题、连接被拒绝/超时等），这种情况不一定是plus.net.XMLHttpRequest
// 这条原生网络通道本身有问题——它和WebView自带的fetch()走的是两套完全不同的底层网络实现，
// 对DNS/证书/代理的处理方式可能不一样，很可能出现"这条路走不通、换一条路就通了"的情况。
// 这里改成两条路都试一遍：优先走原生plus.net.XMLHttpRequest（避免file://页面的跨域限制），
// 失败了（不管什么原因，包括HTTP 0）就自动退一步试原生WebView的fetch()兜底；
// 两条路都失败，才把两边真实的错误信息都亮出来，方便判断到底是哪一层的问题。
function smartFetch(url, options) {
    if (typeof window !== 'undefined' && window.plus && plus.net && plus.net.XMLHttpRequest) {
        return plusNetRequest(url, options).catch((err1) => {
            console.error('[smartFetch] plus.net.XMLHttpRequest 失败，尝试改用WebView自带fetch()兜底：', err1);
            return fetch(url, options).catch((err2) => {
                throw new Error(`两种网络请求方式都失败了。\n方式一(原生plus.net)：${err1 && err1.message ? err1.message : err1}\n方式二(WebView fetch)：${err2 && err2.message ? err2.message : err2}`);
            });
        });
    }
    return fetch(url, options);
}
// 浏览器出于安全考虑，遇到跨域(CORS)请求被拦截时，JS这边看到的永远是一个语焉不详的通用报错
// （Chrome是"Failed to fetch"，Safari是"Load failed"，Firefox是"NetworkError when attempting to fetch resource"），
// 规范上就是不允许网页脚本知道"具体是不是CORS、卡在哪一步"，所以这里只能是"像不像"的模糊匹配——
// 命中了就顺手在报错后面加一句人话提示，没命中就原样返回，不影响其它报错信息本身。
// 打包成APK后走的是原生网络通道，不受CORS限制，这种情况不加这段提示，避免误导。
function enhanceNetworkErrorMessage(rawMessage) {
    const msg = String(rawMessage || '');
    const isNativeApp = typeof window !== 'undefined' && window.plus && window.plus.net && window.plus.net.XMLHttpRequest;
    if (!isNativeApp && /Failed to fetch|NetworkError when attempting to fetch|Load failed|network request failed/i.test(msg)) {
        return msg + '\n\n💡这种笼统的网络错误，网页版最常见的原因是CORS跨域被浏览器拦截了（出于安全规范，浏览器不会告诉网页"具体是不是CORS"，看着都一样）。可以打开浏览器控制台（F12→Console）确认报错里是否有"CORS"字样；如果是，换一家支持CORS的API/中转服务商，或者用打包好的APK版本（走手机原生网络通道，不受此限制）。';
    }
    return msg;
}
function isStructuredMessages(content) {
    return Array.isArray(content) && content.length > 0 && content.every(m => m && typeof m === 'object' && typeof m.role === 'string');
}

// ===================== 📊 Token 用量统计 =====================
// 记的是**服务商实际返回的 usage**（不是估算），所以跟账单能对得上。
// 没返回 usage 的服务商（少数中转会吞掉这个字段）才退回按字数估算，并在界面上标出来。
//
// 归类靠调用栈：每个功能最终都汇聚到 sendChatRequestRaw / streamCompletionText 这两个出口，
// 在出口处抓一次调用栈、从里面找出是哪个功能函数发起的。好处是不用去改那 50 多个调用点
// （改漏一个就统计不到，而且以后新增功能还得记得加），坏处是压缩/内联可能让函数名对不上——
// 对不上就归到「其它」，不会丢数据、也不会算错总量。
// 📌 当前版本号。跟 index.html 里 <script src="...?v=86"> 和 service-worker.js 的 CACHE_VERSION 是同一个数字。
// 它显示在「设置」目录页最下面——改完代码看不到效果时，先看这里是不是新版本：
// 如果还是旧数字，说明浏览器读的是缓存里的旧 js（file:// 打开时 Service Worker 根本不会注册，
// 只能靠 ?v= 和强制刷新），Ctrl+F5 一下就好。
// 故事点评最多让几个角色说（js/08 的 runNovelReviews 读它）
let novelReviewMax = 3;
// 🔕 同时最多弹几条通知气泡：0=全部弹（老行为），>0=最多这么多条，其余合并成"还有 N 条"，
// -1=一条都不弹，只进通知页。设置 → 🎨 外观里可改。
let toastMaxVisible = 2;
// 🎨 配色主题：'blue' = 原来的蓝白，'mono' = 黑白。深色模式是另一个开关，两者可以叠加。
let uiTheme = 'blue';
// v107 版式：
//   tweetTimeAbs  推文时间显示成绝对时间（上午9:13 · 2018年3月19日）还是相对时间（3小时前）。
//                 点一下时间就来回切，不用进设置。
//   gyMainWidth   中间那一栏的宽度（px）。默认 600 = X 自己的宽度；
//                 拖右边那条缝可以自己调，双击那条缝恢复默认。
//   gyLeftWidth   左边导航栏的宽度（px），默认 275，同样可以拖。
//   gyFontSize    全站正文字号的基准值（px），默认 15。css 里所有正文类字号都写成
//                 calc(var(--gy-fs) * n)，所以改这一个数字整站的字一起变，不是只改推文。
let tweetTimeAbs = false;
let gyMainWidth = 600;
let gyLeftWidth = 275;
let gyFontSize = 15;
const GY_APP_VERSION = 'v108';

const GY_FEATURE_MAP = {
    // 聊天
    triggerAIBatchReply: '聊天', retriggerLastReply: '聊天', contextActionEditCharMsg: '聊天',
    triggerNudge: '聊天', sendProactiveChatMessage: '主动找你聊天',
    refreshLifeStateOnChatEnter: '角色状态/日程', checkAndFlowSchedules: '角色状态/日程',
    runScheduleGeneration: '角色状态/日程', generateCharAnniversaryNote: '纪念日',
    checkAndAutoSummarizeChat: '聊天自动总结', checkAndAutoSummarizeGroupChat: '聊天自动总结',
    // 推文 / 评论
    userPost: '发推文', executeGenerationInner: '发推文', postCharacterTweet: '发推文',
    triggerRelatedCharacterReactions: '推文连锁反应', updateCharMemoryAsync: '推文记忆总结',
    runCharRepliesToComment: '评论区', submitInlineReply: '评论区', retriggerCharComments: '评论区',
    maybeCharsReactToNpcComments: '评论区', pickInterestedChars: '评论区',
    spawnNpcComments: 'NPC路人跟帖', npcArgueWithEachOther: 'NPC路人跟帖',
    // 论坛 / 营销号
    runCharRepliesToAnonPost: '匿名论坛', autoGenerateAnonPostForChar: '匿名论坛',
    userAnonPost: '匿名论坛',
    triggerForumCharReply: '小说论坛', generateNpcForumReplies: '小说论坛',
    autoGenerateForumThreadForChar: '小说论坛',
    generateTabloidPost: '营销号', rollTabloidAIParticipation: '营销号', triggerTabloidReactToQuote: '营销号',
    // 长文本
    generateNovelChapter: '小说', generateNovelFromSources: '小说',
    sendSsTurn: '续写', regenSsTurn: '续写',
    generateDiaryContent: '日记', generateTitledLetterContent: '信件', resolveDiaryReaction: '日记',
    // 杂项
    generateRandomGreeting: '随机开场白', aiCompleteCharProfile: '角色资料自动填写',
    askCharGameInvite: '小游戏', askCharGameEndComment: '小游戏',
    getSemanticContext: '向量记忆检索', embedMessageInBackground: '向量记忆检索',
    // 待办 / 自主模式
    generateCharTodosAI: '待办清单', generateCharTodosForChar: '待办清单',
    runAutonomyTurn: 'TA自己决定', autonomyWriteDiary: 'TA自己决定',
    autonomyCommentOnSomePost: 'TA自己决定', autonomyFeedTabloid: 'TA自己决定',
    runTheaterScene: '角色小剧场', updateTheaterMemoryAsync: '小剧场记忆总结'
};
let gyTokenStats = { total: { calls: 0, in: 0, out: 0, cached: 0, estimated: 0 }, byFeature: {}, byDay: {}, since: 0 };

// ===================== 🔌 自动功能开关 =====================
// 这个 app 里有一批功能是**不用你点任何按钮、自己就会去调 API** 的：定时器到点了、
// 进某个页面了、发完帖之后连锁触发……好处是"活的"，坏处是钱在你不知道的时候就花出去了。
// 这里把它们全部列出来，每一项一个独立开关，你想留哪个留哪个。
//
// 默认全开＝跟改造前的行为完全一致，不会因为升级就悄悄少了什么。
// cost 那一栏是实测的量级，只作参考——真实花费还要看你的角色数量、人设长度和世界书大小。
const AUTO_FEATURE_DEFS = [
    { key: 'autoPost',        label: '角色自动发帖',         desc: '按每个角色设置的发帖频率，定时自己发推文 / 小说论坛帖 / 匿名论坛帖。', cost: '每次一条帖子一次调用，角色多、频率高就很可观', group: '主动', where: '资料页 → 发帖频率；效果在首页时间线 / 小说论坛 / 匿名论坛' },
    { key: 'proactiveChat',   label: '角色主动找你聊天',     desc: '按每个角色设置的主动频率，隔一段时间自己发消息过来。', cost: '每条主动消息一次调用', group: '主动', where: '资料页 → 主动聊天频率；效果在私聊列表' },
    { key: 'proactiveLetter', label: '角色主动给你写信',     desc: '角色隔一段时间自己写一封信寄给你。', cost: '每封信一次调用，信件比聊天长很多', group: '主动', where: '资料页 → 写信频率；效果在「信箱」' },
    { key: 'letterReply',     label: '信件到点自动回信',     desc: '你寄出去的信，等设定的延迟时间到了自动生成回信。', cost: '每封回信一次调用，信件比聊天长很多', group: '主动', where: '你在「信箱」寄信时设的延迟；效果在「信箱」' },
    { key: 'diaryReaction',   label: '角色对你日记的反应',   desc: '你写了日记之后，角色到点自动看到并作出反应。', cost: '每次反应一次调用', group: '主动', where: '你在「我的日记」写完之后；效果在私聊 / 评论' },
    { key: 'scheduleFlow',    label: '角色状态跟日程流动',   desc: '每 15 分钟检查一次，按今日日程更新每个角色"此刻在做什么"。', cost: '每个有日程的角色各一次调用，15 分钟一轮', group: '日程', where: '角色的「今日日程」；效果在头像状态气泡、聊天页顶栏' },
    { key: 'scheduleAutoRenew', label: '日程每天自动更新',   desc: '到了第二天，把过期的日程自动重新生成一份。关掉就退回原来的做法——只在角色状态气泡里提示"日程可能过期了"，等你自己右键头像更新。', cost: '每个角色每天一次，日程比聊天长很多；一轮最多续 2 个角色，分几轮慢慢来', group: '日程', where: '角色的「今日日程」；效果在日历页和状态气泡' },
    { key: 'lifeStateEnter',  label: '进聊天页刷新角色状态', desc: '每次点进一个角色的聊天，自动更新一次 TA 此刻在做什么。', cost: '每次进聊天页一次调用', group: '日程', where: '点进某个角色聊天时；效果在聊天页顶栏' },
    // ⚠️ defaultOff：这一项默认**关**。它是后台自己跑的、你不点任何按钮它也会花钱，
    // 所以做成"主动打开才有"，而不是"发现了再去关"。
    { key: 'charTheater',     label: '角色之间的后台小剧场', desc: '每 5 分钟有 30% 概率，让有关系的两个角色在背后自己演一段，存进「我们的故事 → Ta们在做什么」。默认关着——不打开的话一次 API 都不会调。', cost: '触发一次一次调用', defaultOff: true, group: '背后', where: '「我们的故事 → Ta们在做什么」' },
    { key: 'theaterMemory',   label: '小剧场记忆总结',       desc: '把角色参与过的小剧场总结成一段记忆，让 TA 记得"我前几天跟谁发生过什么"。聊天/发推/评论/日记信件/论坛都会用上（小说和续写不用）。', cost: '每个角色攒够 3 场才总结一次', group: '记忆', where: '小剧场记录；效果在「记忆总览」' },
    { key: 'chatSummary',     label: '聊天自动总结',         desc: '聊天记录攒够设定条数后，自动总结一次存进记忆，防止聊久了失忆。', cost: '每次总结一次调用，但能省下后续每轮的历史长度', group: '记忆', where: '设置 → 基本设置 → 聊天总结条数；效果在「记忆总览」' },
    { key: 'postMemory',      label: '推文记忆自动总结',     desc: '角色发够设定条数的推文后，自动总结成"专属推文记忆"。', cost: '每次总结一次调用', group: '记忆', where: '设置 → 基本设置 → 推文记忆条数；效果在「记忆总览」' },
    { key: 'scheduleMemory',  label: '日程记忆总结',         desc: '把过去几天的日程归档、总结成一段"最近的生活轨迹"，让角色记得自己前几天在忙什么。聊天/发推/评论/日记信件/论坛都会用上这段记忆（小说和续写不用，那两个有自己的剧情线）。', cost: '攒够 3 天才总结一次，每次一次调用', group: '记忆', where: '日程归档（保留天数在「记忆总览」里调）' },
    { key: 'relatedReaction', label: '关联角色连锁反应',     desc: '一个角色发言后，关系网里跟 TA 有关的角色自动跟着有反应。', cost: '每个被牵动的角色各一次调用', group: '连锁', where: '「关系网」里连着的角色；效果在评论区' },
    { key: 'npcArgue',        label: 'NPC 路人互掐',         desc: 'NPC 路人跟帖之后，让他们之间再互相吵一轮。', cost: '每次一次调用', group: '连锁', where: 'NPC 路人之间；效果在评论区' },
    { key: 'charReactNpc',    label: '角色回应 NPC 评论',    desc: '路人评论出现后，角色自动下场回应路人。', cost: '挑人一次 + 每个下场的角色各一次', group: '连锁', where: 'NPC 路人评论出现之后；效果在评论区' },
    { key: 'tabloidAuto',     label: '营销号自动参与',       desc: '营销号（小报）账号自动跟进、转发、评论热闹事件。', cost: '每次参与一次调用', group: '连锁', where: '营销号（小报）账号；效果在时间线 / 评论区' },
    { key: 'postReactions',   label: '发帖后角色自动来互动', desc: '你发完推文/匿名论坛帖之后，角色自动过来评论或点赞。关掉之后帖子就只是安静地发出去，谁也不会自动出现。', cost: '按上面「每条帖子最多几个角色互动」的人数，每人一次调用——这是整个 app 里最贵的一项', group: '连锁', where: '你发推文或匿名帖之后；效果在该帖的评论区' },
    { key: 'autoTodoGen',     label: '角色自己写待办清单',   desc: '角色待办快办完的时候，结合人设、今天的日程、你们的聊天和 TA 发过的推文，自己再记几件惦记的事。资料页里手动点「让 TA 自己写」不受这个开关影响。', cost: '每个角色每天最多一次', group: '日程', where: '角色资料页 → 待办清单；效果在资料页和日历' },
    // ⚠️ defaultOff：自主模式是后台自己跑、而且真的会替你发推文/发消息/写信的，
    // 所以跟小剧场一样做成"主动打开才有"。
    // 🫀 活人感三件套：都默认关，打开之前 app 行为跟以前一模一样。
    //    ⚠️ 第一项是**唯一一个会让调用变少的开关**——忙碌期里的好几条消息合成一次回复。
    { key: 'aliveOffline',    label: 'TA 不总是在线',       desc: '角色在睡觉或者在忙（按 TA 的日程和状态判断）的时候，你发的消息**不会立刻触发回复**，先挂在那儿；等 TA 那段忙完，再一次性看完、一起回你，并且会自己交代这段时间差（"刚下台"/"刚醒"）。急事豁免词、作息时间、忙完等多久，在「🫀 活人感」里调。', cost: '省钱：忙碌期里连发的好几条合成一次调用，而不是每条一次', defaultOff: true, group: '活人感', where: '设置 → 🫀 活人感（作息 / 急事豁免词 / 等多久 都在那儿调）' },
    { key: 'aliveMood',       label: '情绪会留到下一轮',     desc: '角色回复时顺带给出这一轮结束时对你的情绪和原因，本地按小时慢慢衰减，下一轮再注入回去——吵完架半小时内语气还是硬的，不会下一句就若无其事。', cost: '不额外调用，只在回复的 JSON 里多两个字段', defaultOff: true, group: '活人感', where: '设置 → 🫀 活人感（衰减半衰期在那儿调）' },
    { key: 'aliveVoice',      label: '按 TA 自己的打字习惯说话', desc: '从角色已经写过的推文/聊天/日记里提炼一份"打字指纹"（句子长短、标点习惯、口头禅、用不用表情），之后每次生成都照着来，不同角色不再是同一个模型腔。提取是手动点的，提完永久复用。', cost: '提取时一次调用，之后完全免费', defaultOff: true, group: '活人感', where: '设置 → 🫀 活人感（在那儿手动点「提取指纹」）' },
    { key: 'aliveFade',       label: '久远的记忆会褪色',     desc: '聊天总结按时间分层注入：这几天的记得清清楚楚，两周前的只剩大概，更久的只剩一个印象——而且角色**知道自己记不清**，会说"好像是…吧"，被你纠正也会接受，不再拿一个月前的细节当确凿事实讲。顺便能往回记更多轮（老的压缩过，不怎么占字数）。', cost: '不额外调用。会多一段「你记不清了」的说明，实测比原来多 70~160 字——换来的是记忆能往回够到两三个月前，而且角色不会再拿模糊的事当确凿的讲', defaultOff: true, group: '活人感', where: '设置 → 🫀 活人感（清晰/模糊的天数在那儿调）' },
    { key: 'aliveBody',       label: '身上的状态会累积',     desc: '按 TA 的日程和当前时间在本地推算累/困/饿/刚喝过酒/刚运动完，注入成"自己感觉到的状态"。累的时候话就短、耐心差；饿和困会让人烦躁。不是让 TA 报告"我好累"，是让这些渗进语气里。', cost: '完全不调用，纯本地推算', defaultOff: true, group: '活人感', where: '设置 → 🫀 活人感（可预览每个角色此刻的状态）' },
    { key: 'readComment',     label: '一起阅读：翻页时角色自动评论',     desc: '每翻到新的一段，角色读一遍这段原文，挑真有感触的句子写评论，评论显示在原文对应句子下面。没感触就不写。', cost: '**每翻一页一次调用**——这一项以前没有开关，翻得快的时候很容易不知不觉花掉一堆', group: '观影阅读', where: '设置 → 🧩 小功能 → 一起阅读' },
    { key: 'filmScene',       label: '一起看电影：看到有想法的地方开口',   desc: '每隔几分钟把这一段字幕给角色看一眼，有感触才说，没有就不说。没导字幕的片子完全不触发（纯陪看）。', cost: '每隔几分钟一次调用（间隔在一起看电影的设置里调，默认 5 分钟）', group: '观影阅读', where: '设置 → 🧩 小功能 → 一起看电影 → ⚙️ 设置' },
    { key: 'filmPause',       label: '一起看电影：你一暂停 TA 接一句',     desc: '按下暂停时角色说一句，像真的在旁边被打断了那样。', cost: '每次暂停一次调用', group: '观影阅读', where: '设置 → 🧩 小功能 → 一起看电影 → ⚙️ 设置' },
    { key: 'filmEnd',         label: '一起看电影：看完给个感想',           desc: '片子放完时角色说一句看完的第一反应，并把这次一起看总结进记忆。', cost: '每部片子结束时，每个一起看的角色各一次', group: '观影阅读', where: '设置 → 🧩 小功能 → 一起看电影 → ⚙️ 设置' },
    { key: 'webExplore',      label: '角色自己上网看东西',                 desc: '角色按自己的人设挑一个此刻真想了解的东西，去网上搜一遍，读完用自己的口吻写一段感想，存进探索记录并进 prompt——以后聊到相关话题时 TA 是真的知道。取内容的方式（读取代理 / 你自己的接口 / 完全不联网）在功能页里选。默认关。', cost: '一次探索 2 次调用（挑题目 + 写感想）+ 一次网络请求；间隔在功能页里调，默认 3 小时', defaultOff: true, group: '背后', where: '设置 → 🧩 小功能 → 联网探索；记录在记忆总览' },
    { key: 'webExploreShare', label: '看到有意思的主动发给你',               desc: '探索完之后，TA 把那段感想直接私聊发给你（"我今天看到个东西……"）。关掉的话记录照样存、prompt 照样进，只是不会主动来找你。功能页里手动点的时候可以单独勾选这次要不要发。', cost: '不额外调用（跟着上面那次一起）', defaultOff: true, group: '背后', where: '设置 → 🧩 小功能 → 联网探索' },
    { key: 'charOwnDays',     label: '日子：角色自己把某天记成纪念日',       desc: '在「TA 自己决定」的自主模式里多一个动作：TA 可以给今天（或者最近某一天）画个圈，写进自己的纪念日，以后每年都会惦记。只有真发生了值得记的事才记，平常的一天不会硬记。默认关，不打开一次 API 都不会调。', cost: '跟着自主模式走，选中这个动作时一次调用', defaultOff: true, group: '背后', where: '角色资料页 → 切到「TA 自己决定」；结果在 🧩 小功能 → 日子' },
    { key: 'diaryReaction',   label: '日记：挂上的角色到点自己来看',       desc: '你写一篇日记、挂上几个角色，过一阵 TA 们会自己去看一眼并写下反应（偷看到了/没看到/看到了假装没看到）。以前这一项没有开关，一篇日记挂三个人就是三次调用，在后台悄悄发生。关掉之后日记照写、人照挂，只是不会自动来看——日记上的「立即回复」按钮不受影响，那是你主动点的。', cost: '一篇日记 × 挂上的角色数，后台定时跑', group: '主动', where: '信件与日记 → 写日记时挂角色' },
    { key: 'novelReview',     label: '故事：角色读完这一章说几句',         desc: '一章存下来之后，被勾进这个故事的角色各自读一遍，以当事人的口吻说几句——不是评文笔，是说"我在那件事里是什么感受"。带着前面章节的梗概，所以接得上上文。点评跟着章节一起显示。默认关；关着也可以在章节上点「💬 让 TA 们说说」手动来一次。', cost: '一章 × 参与角色数 次调用（人数上限在故事页里调，默认 3）', defaultOff: true, group: '连锁', where: '故事 → 打开一本 → 章节列表' },
    { key: 'relLedger',       label: '关系账本：用不用这套好感度',         desc: '关掉之后，账本不再往角色的 prompt 里注入任何东西，也不再自动记账——你和 TA 走到哪一步，回到"由你自己心里有数"。已经记下的流水不会删，随时开回来还在。（记账本身不额外调 API，它是蹭已有回复里的字段。）', cost: '不额外调用', group: '活人感', where: '设置 → 🧩 小功能 → 关系账本' },
    { key: 'inviteInChat',    label: '邀请写进私聊并跳过去',               desc: '一起看电影 / 一起听歌 / 一起阅读 / 约出去，这四个邀请会作为一条消息发进私聊，TA 的回答也在私聊里，发完自动跳过去看 TA 怎么回。关掉就退回老样子：后台悄悄问一句，只弹个提示。', cost: '不额外调用（问 TA 的那一次本来就要发）', group: '活人感', where: '各功能的邀请按钮' },
    { key: 'mallAutoBuy',     label: '商城：角色自己随机网购',             desc: '每 5 分钟掷一次骰子，中了就有个角色心血来潮下单——给自己买，或者给你点份外卖/送样东西，理由由 TA 自己说。默认关着，不打开一次 API 都不会调。', cost: '中了一次一次调用（写下单理由）；概率在商城的设置里调，默认 8%', defaultOff: true, group: '购物', where: '设置 → 🧩 小功能 → 商城 → 设置' },
    { key: 'mallCharSell',    label: '商城：角色自己上架东西卖',           desc: '角色会往货架上摆自己的东西——二手的、自己做的、多买的、用不上的，或者干脆是一份手艺（"帮你写一封信"）。商品名和描述都是 TA 自己的口吻，不是商家话术。上架什么本身就是一条人设信息。默认关；商城设置页里也能手动点一次（手动不看开关）。', cost: '触发一次一次调用，概率是随机购物的一半', defaultOff: true, group: '购物', where: '设置 → 🧩 小功能 → 商城 → 商品页' },
    { key: 'mallTimeline',    label: '商城：物流文案按世界观生成',           desc: '按收货人的世界书写四句物流跟踪文案，古代就是驿站快马，赛博就是无人机。关掉之后时间线照常走，只是四个节点用通用文案。', cost: '每笔订单一次调用（只在下单时生成一次，之后一直用）', group: '购物', where: '设置 → 🧩 小功能 → 商城 → 设置' },
    { key: 'mallReact',       label: '商城：快递到角色手上，TA 可能来找你说一句', desc: '包裹签收时角色自己判断要不要提这件事——惊喜、吐槽、道谢都可能，也可能什么都不说。只有"东西是买给角色的"才触发。', cost: '每个送到角色手上的包裹一次调用', group: '购物', where: '设置 → 🧩 小功能 → 商城 → 设置' },
    { key: 'charAutonomy',    label: '角色自己决定要做什么', desc: '把某个角色切到「TA 自己决定」之后，TA 会结合日程、待办、小剧场记忆和此刻的处境，自己挑一件事去做——发推文、私聊你、写信、写日记、发论坛帖、评论别人、拍你一下、换个状态、划掉一条待办、拉别人演一场……也可能什么都不做。默认关着，不打开一次 API 都不会调。', cost: '决定一次一次调用，真动手了再加那个动作本身的一次', defaultOff: true, group: '背后', where: '角色资料页 → 切到「TA 自己决定」；效果散在全 app' }
];
// 📂 开关分类。以前 25 个开关是一条大长列表，从头翻到尾也不知道哪个管哪儿；
//    现在按"这个开关管的是什么"分成 6 组，每组一句话说清它管的是哪一块。
//    顺序就是下面这个数组的顺序。
const AUTO_FEATURE_GROUPS = [
    { key: '主动',   icon: '📮', title: '角色主动找你',
      note: '你什么都不做，角色自己发起的。关掉之后角色不会再自己冒出来，但你主动去找 TA 一切照旧。' },
    { key: '连锁',   icon: '💬', title: '你发帖之后的连锁反应',
      note: '你发完推文 / 匿名帖之后，评论区自己热闹起来。这一组是整个 app 最花钱的地方。' },
    { key: '日程',   icon: '🗓️', title: '日程与"此刻在做什么"',
      note: '维持"角色现在正在干嘛"这件事。关光了角色状态就会停在你上次手动更新的那一刻。' },
    { key: '记忆',   icon: '🧠', title: '记忆自动总结',
      note: '把聊久了的记录压成一段记忆，防失忆。这一组多数时候**反而省钱**——总结一次，换掉后面每一轮都要带的长历史。' },
    { key: '背后',   icon: '🎭', title: '背着你发生的事',
      note: '不是冲你来的，是角色之间自己在动。两项都默认关着，不打开一次 API 都不会调。' },
    { key: '观影阅读', icon: '📺', title: '一起看 / 一起读',
      note: '这两个功能里角色会自己开口。**一起阅读以前没有开关**——每翻一页就自动调一次，翻二十页就是二十次，谁都不知道。现在能关了。' },
    { key: '购物',   icon: '🛒', title: '商城与快递',
      note: '角色也会网购。买给角色的东西签收后会真的进 TA 的**随身物**，以后提起来是记得来历的。三项全关掉之后这一页纯手动。' },
    { key: '活人感', icon: '🫀', title: '活人感',
      note: '不新增功能，改的是角色"像不像个人"。全部默认关着；参数在 设置 → 🫀 活人感 里调。' }
];

let autoFeatureSwitches = {};   // { key: false } 才算关；没记录过的一律当开着（＝改造前行为）
function isAutoOn(key) {
    try {
        if (autoFeatureSwitches && autoFeatureSwitches[key] === true) return true;    // 用户明确打开过
        if (autoFeatureSwitches && autoFeatureSwitches[key] === false) return false;  // 用户明确关过
        // 没记录过：看这一项是不是"默认关"的（后台自己跑、又特别费钱的那几项）
        const def = (typeof AUTO_FEATURE_DEFS !== 'undefined') ? AUTO_FEATURE_DEFS.find(f => f.key === key) : null;
        return !(def && def.defaultOff);
    }
    catch (e) { return true; }   // 读取出错宁可让功能照常运行，也不要莫名其妙全哑掉
}

function gyDetectFeature() {
    try {
        const stack = (new Error()).stack || '';
        const lines = stack.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(/at\s+(?:async\s+)?([A-Za-z_$][\w$]*)/);
            if (!m) continue;
            const label = GY_FEATURE_MAP[m[1]];
            if (label) return label;
        }
    } catch (e) { /* 拿不到调用栈就归到其它，不影响统计总量 */ }
    return '其它';
}

// data：服务商返回的原始响应；fallbackChars：拿不到 usage 时用来估算的 {inChars,outChars}
// feature：功能名。**必须在发请求之前（同步地）用 gyDetectFeature() 取好再传进来**——
// 等 await 回来之后再抓调用栈，栈已经被异步边界截断了，只会看到一堆 async 内部帧，全都归到「其它」。
function recordTokenUsage(data, fallbackChars, feature) {
    try {
        if (!gyTokenStats || !gyTokenStats.total) gyTokenStats = { total: { calls: 0, in: 0, out: 0, cached: 0, estimated: 0 }, byFeature: {}, byDay: {}, since: 0 };
        if (!gyTokenStats.since) gyTokenStats.since = Date.now();
        const u = (data && data.usage) || {};
        // OpenAI 兼容：prompt_tokens / completion_tokens，缓存命中在 prompt_tokens_details.cached_tokens
        // Anthropic：input_tokens / output_tokens，缓存命中在 cache_read_input_tokens
        let inTok = u.prompt_tokens != null ? u.prompt_tokens : (u.input_tokens != null ? u.input_tokens : null);
        let outTok = u.completion_tokens != null ? u.completion_tokens : (u.output_tokens != null ? u.output_tokens : null);
        let cached = (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) || u.cache_read_input_tokens || 0;
        // Anthropic 的 input_tokens 不含缓存命中的部分，要加回去才是"这次一共读了多少输入"
        if (u.input_tokens != null && (u.cache_read_input_tokens || u.cache_creation_input_tokens)) {
            inTok = u.input_tokens + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
        }
        let estimated = 0;
        if (inTok == null && outTok == null) {
            if (!fallbackChars) return;   // 报错的请求既没 usage 也没内容，不记
            inTok = Math.ceil((fallbackChars.inChars || 0) / 1.8);
            outTok = Math.ceil((fallbackChars.outChars || 0) / 1.8);
            estimated = 1;
        }
        if (!feature) feature = gyDetectFeature();
        const day = new Date().toISOString().slice(0, 10);
        const bump = (o) => { o.calls++; o.in += (inTok || 0); o.out += (outTok || 0); o.cached += cached; o.estimated += estimated; };
        const blank = () => ({ calls: 0, in: 0, out: 0, cached: 0, estimated: 0 });
        bump(gyTokenStats.total);
        if (!gyTokenStats.byFeature[feature]) gyTokenStats.byFeature[feature] = blank();
        bump(gyTokenStats.byFeature[feature]);
        if (!gyTokenStats.byDay[day]) gyTokenStats.byDay[day] = blank();
        bump(gyTokenStats.byDay[day]);
        // 只留最近 60 天，不然存档会一直涨
        const days = Object.keys(gyTokenStats.byDay).sort();
        while (days.length > 60) delete gyTokenStats.byDay[days.shift()];
        // 统计本身不值得为它单独写一次存档（saveAllData 是全量结构化克隆，很重），
        // 攒够一批再落盘；真正的存档时机由各功能自己的 saveAllData 顺带带走。
        gyTokenStats.__dirty = (gyTokenStats.__dirty || 0) + 1;
        if (gyTokenStats.__dirty >= 10 && typeof saveAllData === 'function') { gyTokenStats.__dirty = 0; saveAllData(); }
    } catch (e) { console.warn('[Token统计] 记录失败（不影响正常使用）：', e); }
}
function gyContentChars(content) {
    try {
        if (typeof content === 'string') return content.length;
        if (Array.isArray(content)) return content.reduce((s, m) => s + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content || '').length), 0);
        return 0;
    } catch (e) { return 0; }
}
async function sendChatRequestRaw(api, content, extraBody) {
    extraBody = extraBody || {};
    // 📊 功能归类必须在这里同步取——下面一 await，调用栈就断了（见 recordTokenUsage 的说明）
    const __gyFeature = gyDetectFeature();
    const messages = isStructuredMessages(content) ? content : [{ role: "user", content: content }];
    if (isAnthropicApiUrl(api.url)) {
        try {
            const systemText = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
            let restMsgs = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: convertContentForAnthropic(m.content) }));
            if (restMsgs.length === 0) restMsgs = [{ role: 'user', content: '（请继续。）' }];
            const anthropicBody = Object.assign({ model: api.model, max_tokens: 4096, messages: restMsgs }, getSamplerExtraBody(true), extraBody);
            // 💰 提示词缓存：system 块（人设+世界书+预设，动辄五六千字）每次请求都一模一样地重发一遍。
            // Anthropic 支持显式标记要缓存的部分，命中之后这一段的输入价格只要 1 折。
            // 用数组形式的 system 才能挂 cache_control；纯字符串是挂不上的。
            // 太短的内容不值得（也达不到服务商的最小缓存长度），所以只在够长时才标记。
            if (systemText) {
                anthropicBody.system = (systemText.length >= 2000)
                    ? [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }]
                    : systemText;
            }
            const res = await smartFetch(`${api.url}/v1/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': api.key, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify(anthropicBody)
            });
            const data = await res.json();
            if (data.error) return { error: { message: (data.error && data.error.message) || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) } };
            // 扩展思考(extended thinking)模式下，data.content 是多个内容块的数组，思考正文在 type:'thinking' 的块里，
            // 真正的回复文字在 type:'text' 的块里，两者是分开的——不像"文本里自带<think>标签"那样天然混在一起。
            // 这里把思考内容包成<think>标签拼在正文最前面，复用下面 extractLeadingReasoning/processReasoningInText
            // 那一整套"识别思维链→按设置折叠/隐藏/保留"的逻辑，不用再另外维护一套。
            const blocks = data.content || [];
            const textBlock = blocks.find(b => b && b.type === 'text') || blocks[0] || {};
            const thinkingText = blocks.filter(b => b && b.type === 'thinking' && b.thinking).map(b => b.thinking).join('\n\n');
            let text = textBlock.text || '';
            if (thinkingText) text = `<think>${thinkingText}</think>${text}`;
            recordTokenUsage(data, { inChars: gyContentChars(content), outChars: text.length }, __gyFeature);
            return { choices: [{ message: { content: text } }] };
        } catch (e) {
            return { error: { message: enhanceNetworkErrorMessage(e.message) } };
        }
    }
    try {
        const res = await smartFetch(`${api.url}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` },
            body: JSON.stringify(Object.assign({ model: api.model, messages: messages }, getSamplerExtraBody(false), extraBody))
        });
        const raw = await res.json();
        // 不少支持"推理模型"的服务商（DeepSeek-R1、Qwen-QwQ等）不是把思维链直接写在content里，而是单独
        // 放在 message.reasoning_content（少数用 message.reasoning）字段里返回——之前完全没读这个字段，
        // 导致这些模型的思维链在这个app里从来没有出现过（不是"渲染坏了"，是压根没被读到）。
        // 这里读出来后同样包成<think>标签拼进content最前面，跟上面Anthropic分支、以及下面流式那边保持一致。
        try {
            const msg = raw && raw.choices && raw.choices[0] && raw.choices[0].message;
            const reasoningText = msg && (msg.reasoning_content || msg.reasoning);
            if (msg && reasoningText) msg.content = `<think>${reasoningText}</think>${msg.content || ''}`;
        } catch (e) { /* 拼接失败就算了，不影响正文本身的返回 */ }
        try {
            const outText = (raw && raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content) || '';
            if (!raw || !raw.error) recordTokenUsage(raw, { inChars: gyContentChars(content), outChars: String(outText).length }, __gyFeature);
        } catch (e) { /* 统计失败不影响返回 */ }
        return raw;
    } catch (e) {
        return { error: { message: enhanceNetworkErrorMessage(e.message) } };
    }
}

// 对外真正调用的入口：在 sendChatRequestRaw 外面包一层"模型不可用自动兜底"。
// 逻辑：请求失败且报错像是"这个模型服务商没开通/不存在"，就自动换成上次成功用过的模型重试一次；
// 重试成功的话，顺手把设置里的模型也同步切过去并保存，这样用户不用自己再去设置里手动改一遍。
// 每次请求成功，也会记录这次用的模型，作为以后的"上次可用模型"。
// 🧹 统一在这里把思维链剥掉。
// 为什么必须放在这一层：全 app 有四十多处 data.choices[0].message.content 的取值点，
// 靠一处一处记得调 processReasoningInText 是不现实的——漏一个，用户就会在营销号爆料里
// 看到一整段 <think>好的，我来梳理一下这个爆料推文的创作要点…</think>（这就是实际发生过的）。
// 放在响应层，所有调用点自动干净，以后新加功能也不用再操心这件事。
// 唯一要保留思维链的是【小说】和【续写】——那两个会把思考过程折叠成一个框给用户看，
// 它们在调用时传 __keepReasoning: true 明确opt out。
function gyStripReasoningFromResponse(data) {
    try {
        if (!data || !Array.isArray(data.choices)) return data;
        for (const ch of data.choices) {
            if (ch && ch.message && typeof ch.message.content === 'string' && ch.message.content) {
                const before = ch.message.content;
                let after = before;
                if (typeof processReasoningInText === 'function') after = processReasoningInText(after);
                // processReasoningInText 只处理"成对标签"和"开头的思维链块"。
                // 推理模型被 max_tokens 截断时会留下一个没有闭合的 <think>，那种情况正文本来就没生成出来，
                // 剥了会变成空字符串——所以只在剥完还有内容时才采用，宁可原样返回让调用方自己判断。
                if (after && after.trim()) ch.message.content = after;
            }
        }
    } catch (e) { console.warn('[思维链剥离] 出错，按原样返回：', e); }
    return data;
}

async function sendChatRequest(api, content, extraBody) {
    // __keepReasoning 是给小说/续写用的内部标记，不能真的发给 API，取出来就删掉
    let keepReasoning = false;
    if (extraBody && extraBody.__keepReasoning) {
        keepReasoning = true;
        extraBody = Object.assign({}, extraBody);
        delete extraBody.__keepReasoning;
    }
    let data = await sendChatRequestRaw(api, content, extraBody);

    if (data && data.error && isModelUnavailableError(data.error.message)) {
        const fallbackModel = api.isSub ? lastWorkingSubModel : lastWorkingModel;
        if (fallbackModel && fallbackModel !== api.model) {
            console.warn(`[模型兜底] "${api.model}" 当前不可用，自动切回上次可用模型 "${fallbackModel}" 重试一次。原始报错：`, data.error.message);
            const fallbackApi = Object.assign({}, api, { model: fallbackModel });
            const retryData = await sendChatRequestRaw(fallbackApi, content, extraBody);
            if (retryData && !retryData.error) {
                if (api.isSub) {
                    subModel = fallbackModel;
                    if (document.getElementById('subModelSelect')) document.getElementById('subModelSelect').value = fallbackModel;
                } else {
                    myModel = fallbackModel;
                    if (document.getElementById('modelSelect')) document.getElementById('modelSelect').value = fallbackModel;
                }
                if (typeof saveAllData === 'function') saveAllData();
                if (typeof showToast === 'function') showToast('', '⚠️ 模型自动切换', `"${api.model}" 当前不可用，已自动切回"${fallbackModel}"继续使用`, null, null, false);
            }
            return retryData;
        }
    }

    if (data && !data.error && api.model) {
        if (api.isSub) {
            if (lastWorkingSubModel !== api.model) { lastWorkingSubModel = api.model; if (typeof saveAllData === 'function') saveAllData(); }
        } else {
            if (lastWorkingModel !== api.model) { lastWorkingModel = api.model; if (typeof saveAllData === 'function') saveAllData(); }
        }
    }

    gyNoticeIfTruncated(data);
    return keepReasoning ? data : gyStripReasoningFromResponse(data);
}

// 聊天请求的共用封装：遇到"并发数超限/请稍后重试"这类临时性报错时自动重试几次，
// 而不是直接弹一个吓人的错误框——很多API服务商（尤其是中转/代理）会有较低的并发上限，
// 短暂重试一下往往就能成功，用户完全不需要知道发生过这回事。
// images：可选，传入 base64 图片 dataURL 数组（如 "data:image/jpeg;base64,..."）时，
// 会按 OpenAI 兼容的多模态格式把文字和图片一起发给模型，用于"看图/看视频截图"这类场景；
// 不传或传空数组时行为和以前完全一样（纯文字），前提是配置里填的模型本身支持识别图片，
// 不支持的模型通常会直接忽略图片部分或报错，这段代码不负责判断模型是否支持多模态。
async function callChatCompletionAPI(api, promptContent, maxRetries = 2, images = null, opts = null) {
    // opts.keepReasoning：小说/续写专用，保留思维链交给它们自己折叠展示
    const extraBody = (opts && opts.keepReasoning) ? { __keepReasoning: true } : undefined;
    let content = promptContent;
    if (images && images.length > 0) {
        if (isStructuredMessages(promptContent)) {
            content = promptContent.map(m => ({ role: m.role, content: m.content }));
            for (let i = content.length - 1; i >= 0; i--) {
                if (content[i].role === 'user') {
                    const parts = [{ type: "text", text: content[i].content }];
                    images.forEach(imgUrl => { if (imgUrl) parts.push({ type: "image_url", image_url: { url: imgUrl } }); });
                    content[i].content = parts;
                    break;
                }
            }
        } else {
            content = [{ type: "text", text: promptContent }];
            images.forEach(imgUrl => { if (imgUrl) content.push({ type: "image_url", image_url: { url: imgUrl } }); });
        }
    }
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const data = await sendChatRequest(api, content, extraBody);
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
            return { error: { message: enhanceNetworkErrorMessage(e.message) } };
        }
    }
}

// ===================== 流式生成（Streaming / 打字机效果）=====================
// 只适合"一次性拿一整段纯文本"的场景（比如互动续写）——流式期间收到的是半成品文字，
// 直接展示没问题；但聊天/群聊要求AI返回一整段JSON（多气泡+延迟那套格式），流式期间的
// 半成品是"半截JSON"，直接显示出来是乱码，所以聊天那边目前继续用上面的非流式 callChatCompletionAPI，
// 不受这个函数影响。
// onDelta(fullTextSoFar, isDone) 会在每收到一点新内容、以及最终结束时被调用，调用方自己决定怎么更新界面。
// 打包成App后（window.plus存在）用的是原生plus.net.XMLHttpRequest通道，这条通道只能在整个响应
// 结束时一次性拿到全部内容、没有"边收边读"的能力，这种情况下自动退化成普通请求，拿到完整文字后
// 一次性调用一次 onDelta(text, true)，界面不会报错，只是没有逐字效果。
// signal：可选，传入 AbortController.signal 时支持中途取消（比如续写"取消"按钮）——原生App通道
// (plus.net.XMLHttpRequest) 不支持真正中断，取消功能在那种环境下不生效，只在普通浏览器/webview里有效。
async function streamCompletionText(api, promptContent, onDelta, images = null, signal = null) {
    const __gyFeature = gyDetectFeature();   // 同上：必须在任何 await 之前取
    const isNativeApp = typeof window !== 'undefined' && window.plus && window.plus.net && window.plus.net.XMLHttpRequest;
    // 用户在设置里关掉了流式：走跟原生App壳子完全一样的那条路——发普通请求，
    // 拿到完整文字后一次性回调一次。所有调用方（续写工作台、酒馆桥接的 generate）
    // 都不用改，界面上的区别只是"没有逐字效果"，功能一样。
    const streamOff = (typeof enableStreaming !== 'undefined') && !enableStreaming;
    if (isNativeApp || streamOff) {
        const data = await callChatCompletionAPI(api, promptContent, 2, images);
        const text = (!data.error && data.choices?.[0]?.message?.content) || '';
        if (text) onDelta(text, true);
        return data;
    }

    let content = promptContent;
    if (images && images.length > 0) {
        if (isStructuredMessages(promptContent)) {
            content = promptContent.map(m => ({ role: m.role, content: m.content }));
            for (let i = content.length - 1; i >= 0; i--) {
                if (content[i].role === 'user') {
                    const parts = [{ type: "text", text: content[i].content }];
                    images.forEach(imgUrl => { if (imgUrl) parts.push({ type: "image_url", image_url: { url: imgUrl } }); });
                    content[i].content = parts;
                    break;
                }
            }
        } else {
            content = [{ type: "text", text: promptContent }];
            images.forEach(imgUrl => { if (imgUrl) content.push({ type: "image_url", image_url: { url: imgUrl } }); });
        }
    }
    const messages = isStructuredMessages(content) ? content : [{ role: "user", content: content }];

    try {
        const isAnthropic = isAnthropicApiUrl(api.url);
        let res;
        if (isAnthropic) {
            const systemText = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
            let restMsgs = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: convertContentForAnthropic(m.content) }));
            if (restMsgs.length === 0) restMsgs = [{ role: 'user', content: '（请继续。）' }];
            const anthropicBody = Object.assign({ model: api.model, max_tokens: 4096, messages: restMsgs, stream: true }, getSamplerExtraBody(true));
            // 跟非流式那条分支保持一致：system 块够长就打上缓存标记，命中后这一段输入只按 1 折计费
            if (systemText) {
                anthropicBody.system = (systemText.length >= 2000)
                    ? [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }]
                    : systemText;
            }
            res = await fetch(`${api.url}/v1/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': api.key, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify(anthropicBody),
                signal: signal || undefined
            });
        } else {
            res = await fetch(`${api.url}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.key}` },
    // stream_options.include_usage：OpenAI 兼容接口在流式模式下**默认不返回 usage**，
                // 加上这个才会在最后多推一个只带 usage 的分片，Token 统计才能拿到真实用量
                // （不支持这个字段的中转会直接忽略它，不影响正常返回；拿不到就退回按字数估算）。
                body: JSON.stringify(Object.assign({ model: api.model, messages: messages, stream: true, stream_options: { include_usage: true } }, getSamplerExtraBody(false))),
                signal: signal || undefined
            });
        }

        if (!res.ok || !res.body || !res.body.getReader) {
            // 有些中转/代理服务商不支持 stream:true 或者干脆返回非200——自动退回普通(非流式)请求兜底，
            // 避免"这家服务商流式支持不完整"直接导致功能整个用不了
            const data = await callChatCompletionAPI(api, promptContent, 2, images);
            const text = (!data.error && data.choices?.[0]?.message?.content) || '';
            if (text) onDelta(text, true);
            return data;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '', fullText = '', fullReasoning = '', rawAll = '';
        let streamUsage = null;   // 流式的真实用量：OpenAI 在最后一个分片给，Anthropic 分两次给（message_start / message_delta）
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            rawAll += chunk;   // 原样留一份：有些服务商收到 stream:true 也照样返回整段普通JSON，见下面
            buffer += chunk;
            let lines = buffer.split('\n');
            buffer = lines.pop(); // 最后一行可能被截断在中间，留到下一轮再和新数据拼在一起
            for (let line of lines) {
                line = line.trim();
                if (!line.startsWith('data:')) continue;
                const dataStr = line.slice(5).trim();
                if (!dataStr || dataStr === '[DONE]') continue;
                let evt;
                try { evt = JSON.parse(dataStr); } catch (e) { continue; } // 个别心跳/不完整行直接跳过，不影响后面正常的数据
                let deltaText = '';
                // 📊 用量分片：Anthropic 在 message_start 里给输入、message_delta 里给输出；
                // OpenAI 兼容接口是在最后单独推一个 choices 为空、只带 usage 的分片。
                if (evt.usage || (evt.message && evt.message.usage)) {
                    const u = evt.usage || evt.message.usage;
                    streamUsage = Object.assign({}, streamUsage || {}, u);
                }
                if (isAnthropic) {
                    if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') deltaText = evt.delta.text || '';
                    // 扩展思考模式下，流式返回里思考内容是单独一种 delta（thinking_delta），跟正文的 text_delta 分开推送
                    if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'thinking_delta') fullReasoning += evt.delta.thinking || '';
                } else {
                    const d = evt.choices && evt.choices[0] && evt.choices[0].delta;
                    deltaText = (d && d.content) || '';
                    // DeepSeek-R1/Qwen-QwQ等"推理模型"流式返回时，思维链在delta.reasoning_content（少数用delta.reasoning）
                    // 里单独推送，不在delta.content里——之前完全没读这两个字段，思维链就凭空消失了，界面上从来没出现过。
                    if (d && (d.reasoning_content || d.reasoning)) fullReasoning += (d.reasoning_content || d.reasoning);
                }
                if (deltaText) { fullText += deltaText; onDelta(fullReasoning ? `<think>${fullReasoning}</think>${fullText}` : fullText, false); }
            }
        }
        if (!fullText.trim()) {
            // 一个字都没从 SSE 里解析出来。先别急着重发——很多中转服务商压根不支持 stream，
            // 收到 stream:true 也照样返回一整段普通的 JSON 响应。这种情况下内容其实**已经拿到手了**，
            // 再请求一次纯属白花一次钱、还多等一轮。先试着按普通响应解析，解析得出来就直接用。
            try {
                const asPlain = JSON.parse(rawAll);
                const plainText = asPlain && asPlain.choices && asPlain.choices[0] &&
                    ((asPlain.choices[0].message && asPlain.choices[0].message.content) || asPlain.choices[0].text);
                if (plainText && String(plainText).trim()) {
                    onDelta(String(plainText), true);
                    return { choices: [{ message: { content: String(plainText) } }] };
                }
                if (asPlain && asPlain.error) return asPlain; // 人家已经明确报错了，重发也是一样的结果
            } catch (e) { /* 不是完整JSON，继续走下面的重发兜底 */ }
            // 真的什么都没拿到（返回格式和预期完全对不上）——兜底重新用非流式请求一次，避免直接"生成了个寂寞"
            const data = await callChatCompletionAPI(api, promptContent, 2, images);
            const text = (!data.error && data.choices?.[0]?.message?.content) || '';
            if (text) onDelta(text, true);
            return data;
        }
        // 思维链拼进正文最前面（跟非流式的两个分支保持同样的<think>包裹格式），交给下游统一的
        // extractLeadingReasoning/processReasoningInText 处理，折叠展示/直接删除都按当前设置来。
        const finalText = fullReasoning ? `<think>${fullReasoning}</think>${fullText}` : fullText;
        recordTokenUsage(streamUsage ? { usage: streamUsage } : null, { inChars: gyContentChars(messages), outChars: finalText.length }, __gyFeature);
        onDelta(finalText, true);
        return { choices: [{ message: { content: finalText } }] };
    } catch (e) {
        if (e.name === 'AbortError') return { aborted: true }; // 用户主动点了"取消"，不是真的报错，调用方要区分对待
        return { error: { message: enhanceNetworkErrorMessage(e.message) } };
    }
}

// 聊天/群聊专用的"半截JSON里捞出已经写完的那几条回复"。
//
// 为什么需要它：聊天让模型返回的是 {"replies":[{"text":"..."},{"text":"..."}]}，
// 流式收到一半是 {"replies":[{"text":"我刚 ——这种半截货直接显示就是乱码。
// 但数组里**已经闭合的那几个对象**是完整可用的，可以立刻发出去，不用等整段写完。
// 这个函数就负责扫出这些完整对象，扫到第一个没写完的就停手（后面的等下一波数据再说）。
//
// 刻意保守：任何一处不确定（花括号没配对、JSON.parse 失败、对象里没有 text 字段）
// 就直接停在那儿，把剩下的交给流式结束后那次完整解析。宁可少发一条晚点补上，
// 也不能猜错了发出去——发出去的消息是收不回来的。
function extractStreamingReplies(text) {
    if (!text) return [];
    // 思维链先剥掉：推理模型会把 <think> 拼在正文最前面，里面可能出现花括号
    let s = String(text).replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    const keyIdx = s.search(/["']?replies["']?\s*:\s*\[/);
    if (keyIdx < 0) return [];
    let i = s.indexOf('[', keyIdx) + 1;
    const out = [];
    while (i < s.length) {
        while (i < s.length && /[\s,]/.test(s[i])) i++;
        if (s[i] !== '{') break;              // 数组结束（']'）或者还没开始写下一条
        let depth = 0, inStr = false, esc = false, closed = -1;
        for (let j = i; j < s.length; j++) {
            const c = s[j];
            if (inStr) {
                if (esc) esc = false;
                else if (c === '\\') esc = true;
                else if (c === '"') inStr = false;
                continue;
            }
            if (c === '"') inStr = true;
            else if (c === '{') depth++;
            else if (c === '}') { depth--; if (depth === 0) { closed = j; break; } }
        }
        if (closed < 0) break;                // 这条还没写完，等下一波
        const objText = s.slice(i, closed + 1);
        let obj = null;
        try { obj = JSON.parse(objText); }
        catch (e) {
            // 模型经常在字符串里直接敲回车（裸换行在JSON里是非法的），跟 extractJsonObject 一样修一下
            try { obj = JSON.parse(objText.replace(/([^\\])\n/g, '$1\\n')); } catch (e2) { obj = null; }
        }
        if (!obj || typeof obj.text !== 'string') break;
        out.push(obj);
        i = closed + 1;
    }
    return out;
}

// ===================== 变量系统（兼容SillyTavern的聊天变量/全局变量）=====================
// chatVariables 按"作用域key"分桶存放，getVarScopeStore 保证桶不存在时自动建一个空对象，
// 这样 {{getvar::x}} 在从没 setvar 过的情况下也不会报错，只是读到空字符串（跟ST行为一致）。
function getVarScopeStore(scopeId) {
    const key = scopeId || '__default__';
    if (!chatVariables[key]) chatVariables[key] = {};
    return chatVariables[key];
}
// 🆕 支持 {{getvar::神乐光.好感度}} 这种点号路径。
//
// 起因：酒馆的变量表是**任意嵌套的对象**（角色卡组件普遍这么写，
// insertOrAssignVariables({神乐光:{好感度:5}})），而谷雨原来的宏只能读一层扁平的 key，
// 同一个变量名一边存着对象、一边被 String() 成 "[object Object]"，两套对不上。
// 现在按 . 逐级往下取，取到最后一层再转字符串——嵌套结构原样保留，宏也能读到里面的值，
// 卡片和 {{getvar}} 从此是同一份数据。
// 没有点号的老写法完全不受影响（split 出来就一段，行为跟以前一模一样）。
function macroVarPathGet(store, name) {
    const parts = String(name == null ? '' : name).split('.');
    let cur = store;
    for (const part of parts) {
        if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
        if (!(part in cur)) return undefined;
        cur = cur[part];
    }
    return cur;
}
function macroVarPathSet(store, name, value) {
    const parts = String(name == null ? '' : name).split('.');
    let cur = store;
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        // 中途遇到非对象（比如原来存的是个字符串）就换成对象，否则没法往下挂
        if (!cur[k] || typeof cur[k] !== 'object' || Array.isArray(cur[k])) cur[k] = {};
        cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
}
function macroGetVar(scopeId, name) {
    const store = getVarScopeStore(scopeId);
    const v = macroVarPathGet(store, name);
    if (v === undefined) return '';
    // 取到的还是个对象（比如 {{getvar::神乐光}} 而底下还有好几个字段）——
    // 转成 JSON 而不是 "[object Object]"，至少让人能看出里面有什么
    if (v !== null && typeof v === 'object') {
        try { return JSON.stringify(v); } catch (e) { return ''; }
    }
    return String(v);
}
function macroSetVar(scopeId, name, value) {
    macroVarPathSet(getVarScopeStore(scopeId), name, value);
    return ''; // setvar是纯副作用宏，跟ST一样不在正文里输出任何东西
}
// {{addvar::name::增量}} / {{incvar::name}} / {{decvar::name}} 共用的数值累加逻辑：
// 变量当前值/增量只要有一个不是合法数字就当0处理，避免脏数据直接把整条prompt计算搞崩。
function macroAddVar(scopeId, name, delta) {
    const store = getVarScopeStore(scopeId);
    const cur = parseFloat(macroVarPathGet(store, name));
    const d = parseFloat(delta);
    const next = (isNaN(cur) ? 0 : cur) + (isNaN(d) ? 0 : d);
    macroVarPathSet(store, name, String(next));
    return '';
}
function macroGetGlobalVar(name) { return (name in globalVariables) ? String(globalVariables[name]) : ''; }
function macroSetGlobalVar(name, value) { globalVariables[name] = value; return ''; }

// ===================== 宏系统（Macros）=====================
// 支持在人设、世界书、日程等文本里写 {{char}} {{user}} {{time}} {{date}} {{weekday}} {{random:a,b,c}} 这类占位符，
// 生成prompt时会自动替换成实际内容，方便写设定的时候不用每次手打角色名/用户名。
// scopeId：变量宏({{getvar}}/{{setvar}}等)的作用域key，一般传当前聊天会话id（角色id或群聊id"g_xxx"），
// 不传就退化到char.id、再不行退化到一个固定桶——保证怎么调用都有地方读写，不会报错。
function applyMacros(text, char, scopeId) {
    if (!text || typeof text !== 'string') return text;
    const now = new Date();
    const scope = scopeId || (char && char.id) || '__default__';
    // 先过一遍EJS模板引擎（只有文本里真的有 <% 才会实际执行），这样EJS里用getvar/setvar操作的
    // 变量和下面 {{getvar::x}} 这种原生宏用的是同一份存储、同一个作用域，两套语法可以混用不冲突。
    text = renderEjsTemplate(text, char, scope);
    return text
        .replace(/\{\{char\}\}/gi, (char && char.name) || '')
        // ⚠️ 这里以前是 currentUser.name || ''：名字被清空时，{{user}} 会被替换成**空字符串**，
        // 人设里写的"{{user}}走进书店"就变成"走进书店"，主语没了。跟别处统一走 userDisplayName()：
        // 名字空着或者还是默认的"我"时，兜底成中性的"用户"。
        .replace(/\{\{user\}\}/gi, (typeof userDisplayName === 'function') ? userDisplayName() : ((typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '用户'))
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
        })
        // {{//这是注释}}：跟ST一样，注释宏整体替换成空字符串，用来在预设/世界书里写不希望进prompt的说明文字
        .replace(/\{\{\/\/[^}]*\}\}/g, '')
        // 副作用类变量宏要放在 getvar 前面处理：同一段prompt里"先setvar、后面别的地方getvar"是常见写法，
        // 这里用两次独立的.replace()整体扫描，等价于"先把所有写操作都应用一遍，再统一读"，结果更符合预期。
        .replace(/\{\{setvar[:：]{2}([^:}]+)[:：]{2}([^}]*)\}\}/gi, (m, name, value) => macroSetVar(scope, name.trim(), value))
        .replace(/\{\{setglobalvar[:：]{2}([^:}]+)[:：]{2}([^}]*)\}\}/gi, (m, name, value) => macroSetGlobalVar(name.trim(), value))
        .replace(/\{\{addvar[:：]{2}([^:}]+)[:：]{2}([^}]*)\}\}/gi, (m, name, value) => macroAddVar(scope, name.trim(), value))
        .replace(/\{\{incvar[:：]{2}([^}]+)\}\}/gi, (m, name) => macroAddVar(scope, name.trim(), 1))
        .replace(/\{\{decvar[:：]{2}([^}]+)\}\}/gi, (m, name) => macroAddVar(scope, name.trim(), -1))
        .replace(/\{\{getvar[:：]{2}([^}]+)\}\}/gi, (m, name) => macroGetVar(scope, name.trim()))
        .replace(/\{\{getglobalvar[:：]{2}([^}]+)\}\}/gi, (m, name) => macroGetGlobalVar(name.trim()));
}

// ===================== EJS模板引擎（兼容酒馆"提示词模板/ST-Prompt-Template"扩展的 <% %> 高级语法）=====================
// 只有文本里真的出现 <% 时才会进入EJS渲染——绝大多数人设/世界书/预设根本不会用这种高级语法，
// 没必要每次生成prompt都额外过一遍模板引擎，这样对没用到这个功能的人完全零开销、零风险。
// 世界书查找辅助：按"条目标题"在这个角色能用到的世界书里查（全局的 + 挂在这个角色身上的），
// 找不到就返回空字符串——跟酒馆的getwi()语义一致（查不到不报错，静默返回空）。
function findWorldbookEntryByTitle(char, nameOrTitle) {
    if (!worldbooks || worldbooks.length === 0 || !nameOrTitle) return null;
    const localIds = new Set((char && char.worldbooks) || []);
    const candidates = worldbooks.filter(w => w.isGlobal || localIds.has(w.id));
    return candidates.find(w => (w.title || '').trim().toLowerCase() === String(nameOrTitle).trim().toLowerCase()) || null;
}
function renderEjsTemplate(text, char, scopeId) {
    if (!text || typeof text !== 'string' || text.indexOf('<%') === -1) return text;
    if (typeof ejs === 'undefined' || !ejs.render) return text; // 模板引擎脚本没加载成功（比如极端情况下vendor文件丢失）时直接降级返回原文，不让整条prompt生成中断
    const scope = scopeId || (char && char.id) || '__default__';
    const store = getVarScopeStore(scope);
    const context = {
        variables: store, // 支持 <%- variables.好感度 %> 这种直接属性访问写法（跟函数式getvar二选一都行）
        getvar: (name, opts) => (name in store) ? store[name] : ((opts && opts.defaults !== undefined) ? opts.defaults : ''),
        setvar: (name, value) => { store[name] = value; return ''; },
        addvar: (name, delta) => {
            const cur = parseFloat(store[name]), d = parseFloat(delta);
            const next = (isNaN(cur) ? 0 : cur) + (isNaN(d) ? 0 : d);
            store[name] = next; return next;
        },
        getGlobalVar: (name, opts) => (name in globalVariables) ? globalVariables[name] : ((opts && opts.defaults !== undefined) ? opts.defaults : ''),
        setGlobalVar: (name, value) => { globalVariables[name] = value; return ''; },
        getchar: (field) => (char && char[field] !== undefined && char[field] !== null) ? char[field] : '',
        getwi: (nameOrTitle) => { const wb = findWorldbookEntryByTitle(char, nameOrTitle); return wb ? (wb.content || '') : ''; },
        char: (char && char.name) || '',
        user: (typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '',
    };
    try {
        return ejs.render(text, context, { delimiter: '%', strict: false, rmWhitespace: false });
    } catch (e) {
        console.error('EJS模板渲染出错，已跳过、按原文输出：', e);
        return text; // 模板本身写错了（比如漏写括号）也不能让整条prompt生成失败，降级用原文本兜底
    }
}

// ===================== 兼容层：window.TavernHelper（酒馆"酒馆助手/JS-Slash-Runner"的部分API兼容） =====================
// ⚠️ 这不是酒馆助手的完整移植，只是照着它文档里最常用的那几个函数(变量读写/取聊天记录/取角色信息)
// 做了个"尽量兼容调用方式"的简化实现——参数、返回值细节不一定跟原版100%一致，只是让"照着酒馆助手API写的脚本"
// 有更大机会在这里也能跑起来，跑不起来的复杂功能(比如触发slash命令、iframe通信)不在这个兼容范围内。
// 这里只是"定义了这些函数"，本身不会执行任何东西——真正的风险点在"允许脚本执行"这个开关控制的
// executeInjectedScripts()，那边才是把消息/帖子里的<script>标签变成真的会跑起来的代码。
// 因为聊天消息里插入的<script>是被当成真正的全局<script>标签重新创建、追加到页面上执行的（不是沙箱iframe），
// 所以脚本里能直接访问 window.TavernHelper，也能直接调用下面这两个裸函数：
function getvar(name, defaultValue) {
    return macroGetVar(currentChatSessionId, name) || (defaultValue !== undefined ? defaultValue : '');
}
function setvar(name, value) {
    macroSetVar(currentChatSessionId, name, value);
    try { saveAllData(); } catch (e) {}
    return value;
}
// 跟 getvar/setvar 一样，很多角色卡的状态栏模板不走 window.TavernHelper.xxx 这种带命名空间的写法，
// 而是直接裸调用 getChatMessages(...)/setChatMessages(...)——之前只在 window.TavernHelper 对象上挂了
// getChatMessages 一个只读版本，裸的全局函数、以及可写的 setChatMessages 都没有，模板脚本一旦调用
// 就直接报 "xxx is not defined" 崩掉，通常是在某个展开/交互按钮的onclick里，导致点了卡片没反应/展不开。
// message_id 用"在当前聊天数组里的下标"表示，支持负数（-1=最后一条，兼容SillyTavern的习惯写法）。
function getChatMessages(count) {
    const session = (typeof globalChats !== 'undefined' && globalChats[currentChatSessionId]) || [];
    const slice = typeof count === 'number' ? session.slice(-count) : session.slice();
    const offset = session.length - slice.length;
    return slice.map((m, i) => ({
        role: m.sender === 'me' ? 'user' : (m.sender === 'system' ? 'system' : 'assistant'),
        name: m.sender === 'me' ? ((typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '我') : m.sender,
        message: m.text,
        message_id: offset + i,
        data: m.data || {},
        timestamp: m.timestamp
    }));
}
function setChatMessages(messages, options) {
    try {
        const session = (typeof globalChats !== 'undefined') ? globalChats[currentChatSessionId] : null;
        if (!session || !Array.isArray(messages)) return false;
        messages.forEach(item => {
            if (!item || typeof item !== 'object' || typeof item.message_id !== 'number') return;
            let idx = item.message_id;
            if (idx < 0) idx = session.length + idx; // 兼容"-1"表示最后一条这种写法
            const target = session[idx];
            if (!target) return;
            if (typeof item.message === 'string') target.text = item.message;
            if (item.data && typeof item.data === 'object') target.data = Object.assign(target.data || {}, item.data);
        });
        if (typeof saveAllData === 'function') saveAllData();
        if (typeof renderChatMessages === 'function' && document.getElementById('view-chat') && document.getElementById('view-chat').style.display !== 'none') renderChatMessages();
        return true;
    } catch (e) { console.error('setChatMessages 出错：', e); return false; }
}
window.TavernHelper = {
    // 变量：跟{{getvar}}/{{setvar}}宏、EJS里的getvar/setvar是同一份存储，作用域是"当前打开的聊天"
    getVariables: () => Promise.resolve({ ...getVarScopeStore(currentChatSessionId) }),
    setVariables: (obj) => {
        const store = getVarScopeStore(currentChatSessionId);
        Object.assign(store, obj || {});
        try { saveAllData(); } catch (e) {}
        return Promise.resolve(true);
    },
    getVariable: (name, defaultValue) => Promise.resolve(getvar(name, defaultValue)),
    setVariable: (name, value) => Promise.resolve(setvar(name, value)),
    // 聊天记录：读/写都复用上面定义好的裸全局函数(getChatMessages/setChatMessages)，避免两份重复实现
    getChatMessages: (count) => Promise.resolve(getChatMessages(count)),
    setChatMessages: (messages, options) => Promise.resolve(setChatMessages(messages, options)),
    // 当前角色信息：只暴露安全的、脚本大概率会用到的几个字段，不是整个角色对象（避免意外改动内部数据结构）
    getCharData: () => {
        const char = (myCharacters || []).find(c => c.id == currentChatSessionId);
        if (!char) return Promise.resolve(null);
        return Promise.resolve({ id: char.id, name: char.name, persona: char.persona, bio: char.bio });
    },
    // 酒馆助手真正的slash命令系统(比如/gen /sys这类)在这里没有对应实现，调用了只会警告一声、不会报错崩溃
    triggerSlash: (cmd) => { console.warn('TavernHelper.triggerSlash 在谷雨里没有对应实现，已忽略：', cmd); return Promise.resolve(''); },
};
// 🛡️ 兜底代理：这个兼容层明确不是完整移植，角色卡模板难免会调用到没实现的函数（比如这次的setChatMessages）。
// 之前的行为是直接报 "xxx is not defined"/"xxx is not a function" 崩掉——如果这行代码恰好在某个展开/交互按钮
// 的onclick里，崩溃点之后的代码（比如真正负责"切换展开状态"的那一行）就永远不会执行，卡片表现就是"点了没反应"。
// 用Proxy包一层：访问任何没在上面明确实现的方法名，都返回一个"打印警告、什么都不做"的兜底函数而不是undefined，
// 这样即使某个具体API没实现，也只是这一步功能不生效，不会连累同一段脚本里后面本来能正常执行的代码。
window.TavernHelper = new Proxy(window.TavernHelper, {
    get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop === 'symbol') return undefined;
        return (...args) => {
            console.warn(`TavernHelper.${prop} 在谷雨里没有对应实现，已忽略这次调用。参数：`, args);
            return Promise.resolve(undefined);
        };
    }
});

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

// 把一批脚本依次应用到文本上——applyRegexScripts / applyDisplayOnlyRegex / applyPromptOnlyRegex
// 三个入口共用这一份核心替换逻辑，区别只在于"用哪个筛选条件挑出这批脚本、在哪个时机调用"。
function applyRegexScriptList(text, list) {
    if (!text || typeof text !== 'string' || !list || list.length === 0) return text;
    let result = text;
    list.forEach(s => {
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

// 🆕 角色专属正则：很多正则脚本（尤其是角色卡自带的"状态栏"这类）本来就是为某一个角色量身定做的，
// find规则里认的标签名（比如<闻述状态>）、字段含义都是绑死给那一个角色的，压根不是通用格式。
// 之前 regexScripts 是全局唯一一份列表，不管谁生成的内容都会拿全部启用的脚本挨个试一遍——
// 没绑定角色的脚本当然要保持"全局生效"（不然一大堆通用的清理/格式化脚本全得挨个手动给每个角色都配一遍，
// 体验会很差），但如果一条脚本明确写了 charScope（专属角色id列表），就只应该在渲染"这几个角色自己的
// 内容"时才生效——发帖、评论、回信/日记、续写、小说、论坛，只要能确定这段内容是谁说的，就把charId
// 传进来做这层过滤。charId 传空/传了但脚本没设charScope，两种情况都按"全局脚本"处理，兼容老数据。
function regexScriptMatchesChar(s, charId) {
    if (!s.charScope || !Array.isArray(s.charScope) || s.charScope.length === 0) return true; // 没绑定角色＝全局脚本，谁的内容都生效
    if (charId === null || charId === undefined || charId === '') return false;
    // 🐛 修复"角色卡自带的状态栏卡片死活不显示"：这里以前是 charScope.includes(charId)，
    // 而 includes 用的是严格相等——偏偏本app里角色id的类型根本不统一：
    //   · 手动新建角色      id = Date.now()          → 数字
    //   · 导入角色卡        id = Date.now().toString() → 字符串
    //   · 正则编辑器存的 charScope 来自 <select>.value → 永远是字符串
    //   · 小说/续写传进来的 charId 走了 parseInt      → 数字
    // 于是 ["1699..."].includes(1699...) 恒为 false，绑定了角色的状态栏正则永远不触发，
    // 表现就是"状态栏不显示"（实际是被谷雨内置的通用状态块兜底渲染了，不是角色卡自己那张卡片）。
    // 统一转成字符串再比，历史存档里数字/字符串混着存的情况也能一起兼容，不需要做数据迁移。
    const target = String(charId);
    return s.charScope.some(id => String(id) === target);
}

// 默认的"处理并存档"模式：AI回复生成/用户消息发送的那一刻应用一次，结果直接写进存档，之后显示和发给AI用的都是这个结果。
// 标了 displayOnly 或 promptOnly 的脚本不走这条路（它们只在下面两个专门的时机生效，不会碰存档），
// 这样同一份 regexScripts 列表里可以混合三种完全独立生效时机的脚本，互不干扰。
// 🐛 修复"状态栏HTML卡片贴着```html代码围栏一起写，导致正则收尾标签对不上/围栏文字混进正文"：
// 有些模型喜欢"贴心"地把状态栏这类结构化标签块用```html ... ```包一层（当成一段代码在展示），
// 但这个标签块本来就是要被下面角色自己的正则脚本原样替换成一段真正要渲染成HTML的卡片——被围栏包住之后，
// ①正则的"收尾标签"经常因为围栏另起一行导致对不上，从根源上让整条替换失效，看起来就是"这个角色的HTML
// 死活显示不出来"；②就算侥幸对上了，残留的```html/```这两行围栏文字也会原样贴在卡片旁边一起显示，很难看。
// 这里只解开明确标了html语言的代码围栏（不带语言标记的普通```代码块可能是角色真的想展示一段引用/代码，
// 不去动它，避免误伤），把里面的内容原样掏出来、去掉围栏那两行本身，再交给下面的正则脚本处理。
function unwrapHtmlCodeFence(text) {
    if (!text || typeof text !== 'string') return text;
    // 优先处理围栏完整闭合的情况：中间内容原样掏出来，开头/收尾两行围栏整体去掉。
    let out = text.replace(/```html[ \t]*\r?\n([\s\S]*?)\r?\n?```/gi, '$1');
    // 兜底：字数限制把回复截断，导致模型这次根本没来得及写收尾的```——围栏只剩开头这一行，
    // 同样会干扰下面的正则匹配，这里单独再扫一遍，把落单的开头围栏行去掉，后面内容原样保留。
    out = out.replace(/```html[ \t]*\r?\n/gi, '');
    return out;
}
function applyRegexScripts(text, target, charId) {
    text = unwrapHtmlCodeFence(text);
    if (!regexScripts || regexScripts.length === 0) return text;
    const list = regexScripts.filter(s => s.enabled !== false && !s.displayOnly && !s.promptOnly && (s.target === target || s.target === 'both') && regexScriptMatchesChar(s, charId));
    const result = applyRegexScriptList(text, list);
    // 🩹 修复"文字和状态栏卡片之间空白特别大"：状态栏类正则脚本只会替换掉命中的标签块本身，AI在结构化
    // 状态块前后经常习惯性空出好几个空行做"视觉分隔"，这些空行不在正则匹配范围内，原样留在旁边的纯文字里，
    // 会被容器的 white-space:pre-wrap 原样保留、渲染成一大段可见空白。这里统一把连续3行及以上的换行
    // 收紧成1个空行，不影响正常的单空行分段，只是不让"AI随手多敲了几个回车"被放大成半屏空白。
    return result.replace(/\n{3,}/g, '\n\n');
}

// "仅影响界面显示"模式：不改动存档里的原文，只在渲染到屏幕的那一刻临时处理一下（renderMarkdownLite里调用），
// 适合"清理思维链标签""美化显示格式"这类只是想让界面好看、但又想保留原始AI输出以备万一的场景。
// depth 是"距离最新一条消息多少条"（最新=0），跟酒馆的"深度"概念一致。
// 🐛 修复：角色卡自带的状态栏正则里，minDepth/maxDepth 用得非常多——
//   · 高山仰止那张报纸状态栏是 maxDepth=0：**只在最新一楼**渲染
//   · 蔚野那张仿IG状态栏是 maxDepth=1：只在最近两楼渲染
//   · 沉沦法则的手账本是 maxDepth=3
// 卡片作者这么写是有道理的：这些状态栏一张就是几万到十几万字符的完整HTML，
// 每一楼都渲染一遍，页面会被几十份重复卡片撑爆、翻旧消息卡到动不了，
// 而且"当前状态"本来就只有最新那一楼才是对的，旧楼层显示旧状态纯属干扰。
// 之前这里完全没看 depth，等于把作者的限制全忽略了。现在跟 applyPromptOnlyRegex 用同一套判定。
function applyDisplayOnlyRegex(text, charId, depth) {
    if (!regexScripts || regexScripts.length === 0) return text;
    const hasDepth = typeof depth === 'number' && isFinite(depth);
    const list = regexScripts.filter(s => {
        if (s.enabled === false || s.displayOnly !== true) return false;
        if (!regexScriptMatchesChar(s, charId)) return false;
        // 调用方没告诉我们这段内容在第几楼时，不做深度过滤——宁可多渲染一次，
        // 也不能因为拿不到楼层号就把状态栏整个吞掉（那就又变回"状态栏不显示"了）
        if (hasDepth) {
            if (typeof s.minDepth === 'number' && depth < s.minDepth) return false;
            if (typeof s.maxDepth === 'number' && depth > s.maxDepth) return false;
        }
        return true;
    });
    return applyRegexScriptList(text, list);
}

// "仅影响发给AI的内容"模式：不改动存档、不改动界面显示，只在把历史记录拼进下一次prompt时临时处理一下
// （buildTimeAwareHistoryText/buildTimeAwareHistoryTurns里调用），适合"不想让AI看到某些内容但用户自己还想留着看"的场景。
// depth是"距离最新一条消息多少条"（最新=0，越往前越大，跟酒馆自己的"深度"概念一致）——不传就当0处理
// （老代码没传depth的调用点，行为等价于"永远当作最新消息"，不会因为加了这个参数就破坏原有效果）。
// 有些从酒馆导入的正则脚本专门用 minDepth/maxDepth 限定"只处理N条以前的旧消息"（比如隐藏很久之前的历史，
// 给AI省token，但最近几条不受影响），只有传了正确的depth这类脚本才能按预期只在该生效的范围内生效。
function applyPromptOnlyRegex(text, depth, charId) {
    if (!regexScripts || regexScripts.length === 0) return text;
    const d = typeof depth === 'number' ? depth : 0;
    const list = regexScripts.filter(s => {
        if (s.enabled === false || s.promptOnly !== true) return false;
        if (!regexScriptMatchesChar(s, charId)) return false;
        if (typeof s.minDepth === 'number' && d < s.minDepth) return false;
        if (typeof s.maxDepth === 'number' && d > s.maxDepth) return false;
        return true;
    });
    return applyRegexScriptList(text, list);
}

// 把可能含有 <, >, & 的文本转成安全的显示文本，避免正则脚本里常见的HTML标签（比如美化卡片用的<div>）
// 被当成真的HTML解析，把设置页的结构撑坏
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// escapeHtml 只处理 < > &，够用来做"显示文本"，但拿去填 HTML【属性值】还不够——
// 文本里一个引号就能把属性提前截断（value="老王's笔记" 会在撇号处断掉）。
// 这个版本额外把双引号和单引号也转成实体，专门用于 value="..." / title="..." 这类地方。
function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 最麻烦的一种：要把一段文本塞进 onclick="fn('这里')" 这种【属性里的 JS 字符串字面量】。
// 得转两层，顺序不能反：
//   1) 先按 JS 字符串转义（反斜杠和单引号加反斜杠），否则撇号会提前结束 JS 字符串；
//   2) 再按 HTML 属性转义，否则引号会提前结束 HTML 属性。
// 浏览器解析时正好反着来：先把实体解码回 \'，再交给 JS 解析成一个普通撇号。
function escapeJsArg(str) {
    if (str === null || str === undefined) return '';
    return escapeAttr(String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}

// ===================== 聊天/匿名论坛专用：纯文本渲染 =====================
// 需求背景：角色卡自带的HTML状态栏卡片、预设脚本/正则里写死的HTML代码，之前在聊天气泡和匿名论坛里
// 会被当成真的HTML直接渲染出来（有时候正则没处理干净，甚至原始JSON都会糊一脸）。用户明确要求：
// 聊天和匿名论坛这两个地方以后【只显示纯文字】，不管卡/正则里带了什么HTML都不要渲染出来；
// 其它地方（故事续写、推文、日记、信件、评论）不受影响，继续按原来的方式正常渲染HTML。
// 用一个"脱离文档"的<div>承接 innerHTML 再取 textContent 的方式来剥离标签——
// innerHTML 赋值本身就不会执行里面的<script>，这里额外把 <script>/<style> 整块先删掉是双保险，
// 也顺便避免这两种标签内部的原始代码文本被当成"正文"糊出来。
function stripHtmlKeepPlainText(raw) {
    if (raw === null || raw === undefined) return '';
    let t = String(raw);
    if (!t) return '';
    // 先整块删掉 <script>/<style>，避免里面的代码/CSS被当成正文文字
    t = t.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    // 常见的换行/分块标签先转成 \n，避免一整段HTML被拍扁成一行、看不出原来的段落结构
    t = t.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n');
    try {
        const container = document.createElement('div');
        container.innerHTML = t;
        t = container.textContent || container.innerText || '';
    } catch (e) {
        // 万一解析出错（极端情况），退回最朴素的"硬删标签"方式，保证起码不会整体崩掉
        t = t.replace(/<[^>]+>/g, '');
    }
    // 折叠连续多个空行，保持可读性
    return t.replace(/\n{3,}/g, '\n\n').trim();
}

// 聊天气泡/匿名论坛帖子最终用的渲染函数：先剥离所有HTML标签只留纯文字，再转义成安全文本，
// 最后把换行还原成 <br> 让多段文字看着不会挤成一坨——这一步不是"渲染HTML"，只是让纯文本能正常分行显示。
function renderPlainChatText(raw) {
    const plain = stripHtmlKeepPlainText(unwrapAiEnvelopeText(raw));
    return escapeHtml(plain).replace(/\n/g, '<br>');
}

// 🐛 "一整坨 ```json 原样发到聊天里"的统一兜底。
//
// 正常情况下模型返回的 {"replies":[...],"stateUpdate":"..."} 会被 extractJsonObject 解析、拆成
// 一条条气泡。但只要有一步没对上——模型多写了闭合花括号、字段名写错、思维链混在前面、
// 或者走的是某条没做解析的旧代码路径——整段原文就会被当成一条消息文本存进 globalChats，
// 之后每次渲染都原样显示，用户看到的就是截图里那坨 JSON。
//
// 这个函数做两件事，任何一层没命中都原样返回，不会误伤正常聊天内容：
//   1) 剥掉思维链标签和 ``` 代码围栏；
//   2) 如果剩下的东西整体就是一个带 replies/stateUpdate 的 JSON 信封，把里面的话拿出来。
//
// 关键是它**同时用在两个地方**：
//   · 写入侧（各处解析失败的兜底分支）——新消息不会再存成一坨 JSON；
//   · 渲染侧（renderPlainChatText）——**已经存坏在历史记录里的旧消息，这次打开就能正常显示了**，
//     不用用户自己去一条条删。
function unwrapAiEnvelopeText(raw) {
    if (raw === null || raw === undefined) return '';
    let t = String(raw);
    if (!t) return '';
    // 快速排除：正常聊天内容里既没有代码围栏也不会以 { 开头，直接原样返回，零开销
    if (t.indexOf('```') === -1 && t.trim()[0] !== '{' && t.indexOf('<think') === -1 && t.indexOf('<thinking') === -1) return t;

    let s = t;
    try { s = processReasoningInText(s); } catch (e) {}
    // 剥掉包裹整段内容的代码围栏（```json ... ``` / ``` ... ```），只在首尾成对时才剥
    const fence = s.trim().match(/^```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)\n?```$/);
    if (fence) s = fence[1];
    else s = s.trim().replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '').replace(/\n?```\s*$/, '');
    s = s.trim();

    if (s[0] !== '{') return s === t.trim() ? t : (s || t);

    let parsed = null;
    try { parsed = extractJsonObject(s); } catch (e) {}
    if (!parsed || typeof parsed !== 'object') return s || t;

    // 认得出来的信封才拆，别的 JSON（角色卡自己要展示的数据之类）原样留着
    const hasReplies = Array.isArray(parsed.replies);
    if (!hasReplies && !parsed.stateUpdate) return s || t;

    let out = '';
    if (hasReplies) {
        out = parsed.replies
            .map(r => (r && typeof r === 'object') ? String(r.text || '') : String(r || ''))
            .filter(x => x.trim())
            .join('\n');
    }
    if (!out.trim() && parsed.stateUpdate) out = '(' + String(parsed.stateUpdate) + ')';
    return out.trim() || s || t;
}

// ===================== 思维链识别与折叠展示 =====================
// 酒馆自己就是这么设计的：不同模型/API吐思维链用的包裹标签五花八门(DeepSeek是<think>，Gemma用别的标记...)，
// 酒馆没有写死几个标签名，而是做成"前缀+后缀"配置列表，命中哪条就按哪条解析——这里照搬同样的思路，
// 内置几条从真实数据里见过的常见格式，用户也可以自己在设置里加新的前缀/后缀组合来匹配自己预设的写法。
let reasoningFormats = [
    { id: 'rf_think', name: 'think', prefix: '<think>', suffix: '</think>', enabled: true },
    { id: 'rf_thinking', name: 'thinking', prefix: '<thinking>', suffix: '</thinking>', enabled: true },
    { id: 'rf_details', name: 'details/summary', prefix: '<details>', suffix: '</details>', enabled: true },
    { id: 'rf_customthink', name: 'custom_think', prefix: '<custom_think>', suffix: '</custom_think>', enabled: true },
    { id: 'rf_secret', name: 'SECRET/thought', prefix: '<SECRET>', suffix: '</SECRET>', enabled: true },
];
// 思维链在【小说】和【续写】里怎么处理（其它场景一律剥掉，不受这个设置影响，见 processReasoningInText）：
// 'collapse' 折叠展示（默认，做成可点开的"💭思考过程"框）/ 'strip' 直接删除 / 'off' 不处理，原样显示包括标签
let reasoningDisplayMode = 'collapse';

// 只在"文本最开头"尝试匹配前缀，避免正文中间偶然出现同名标签被误判成思维链、被错误剥掉。
// 命中就返回 {reasoning: 思维链正文, rest: 剩下的正文, formatName}；一条都没命中（包括"有前缀但找不到对应后缀"，
// 说明思维链没写完或者这不是这种格式）就返回 null，调用方原样保留文本，不强行猜测容易删错东西。
function extractLeadingReasoning(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.replace(/^\s+/, '');
    for (const fmt of reasoningFormats) {
        if (fmt.enabled === false || !fmt.prefix || !fmt.suffix) continue;
        if (!trimmed.startsWith(fmt.prefix)) continue;
        const suffixIdx = trimmed.indexOf(fmt.suffix, fmt.prefix.length);
        if (suffixIdx === -1) continue;
        const reasoning = trimmed.slice(fmt.prefix.length, suffixIdx);
        const rest = trimmed.slice(suffixIdx + fmt.suffix.length).replace(/^\s+/, '');
        return { reasoning, rest, formatName: fmt.name };
    }
    return null;
}

// 循环剥离文本开头所有能识别的思维链前缀（有的模型输出会把思维标签重复/嵌套，比如结尾多打了一层闭合标签），
// 直到剥不出新的一层为止（guard只是防止极端情况死循环，5轮足够覆盖常见情况）。
// 🧹 清理：之前 processReasoningInText / extractReasoningForNovel 两个函数各自拷贝了一份几乎一模一样的
// 剥离循环，容易改了一处忘了改另一处、行为悄悄跑偏——现在合并成这一个共享实现，下面两个函数都只是在这个
// 基础上包一层"要不要生成展示用的折叠框HTML"的逻辑。
function stripLeadingReasoningBlocks(text) {
    let collapsedBlocks = [];
    let rest = text;
    let guard = 0;
    while (guard < 5) {
        const found = extractLeadingReasoning(rest);
        if (found) { collapsedBlocks.push(found); rest = found.rest; guard++; continue; }
        // 清完一层完整的前缀+后缀之后，开头有时会剩一个孤立的多余闭合标签（真实数据里见过
        // </thinking>\n</thinking>这种重复关闭的情况），这里按配置的后缀列表顺手清掉，避免留下裸露的残余标签。
        let strayCleaned = false;
        for (const fmt of reasoningFormats) {
            if (fmt.enabled === false || !fmt.suffix) continue;
            const trimmed = rest.replace(/^\s+/, '');
            if (trimmed.startsWith(fmt.suffix)) { rest = trimmed.slice(fmt.suffix.length).replace(/^\s+/, ''); strayCleaned = true; break; }
        }
        if (!strayCleaned) break;
        guard++;
    }
    return { collapsedBlocks, rest };
}
// collapse模式：用原生<details>标签拼一段默认收起的折叠框——不用额外写JS，浏览器原生支持点击展开/收起。
// 思维链内容整个转义过，只当纯文本显示，不会被当成HTML/脚本解析。
function buildReasoningCollapseHtml(collapsedBlocks) {
    const combinedReasoning = collapsedBlocks.map(b => b.reasoning).join('\n\n---\n\n');
    return `<details class="msg-reasoning-block"><summary>💭 思考过程（点击展开）</summary><div class="msg-reasoning-content">${escapeHtml(combinedReasoning)}</div></details>`;
}

// 聊天、评论、推文、论坛、导入聊天记录……这些场景用这个：一律把思维链剥干净，不展示。
//
// 思维链的"可展开查看"只保留在【小说】和【续写工作台】两个地方（跟酒馆的做法一致）——
// 那两处走 extractReasoningForNovel，把折叠框单独存一个字段、渲染时拼在正文外面。
//
// 为什么别处不能折叠展示：collapse 模式是把 <details> 那段 HTML 直接拼到正文最前面再存档的，
// 而角色卡自带的状态栏卡片全靠正则脚本转换，很多正则是从文本开头 ^ 锚定匹配的——
// 一旦思维链 HTML 堵在最前面，锚点永远匹配不上，状态栏就再也出不来。
// 与其让一个全局开关同时影响两边（想在小说里看思维链就得打开 collapse，一打开聊天的状态栏就废），
// 不如按场景分开：别处永远剥掉，只有小说/续写保留。
// 🐛 "思维链偶尔会跑出来"的补漏。
// stripLeadingReasoningBlocks 只认**文本最开头**的思维链前缀。但模型经常不老实：
// 先客套一句"好的，我来想想。"再写 <think>…</think>，或者把思考塞在正文中间。
// 这种情况开头匹配不上，整段思考就原样留在正文里了——这就是"偶尔"跑出来的那个偶尔。
//
// 这里补一道：把正文里**任意位置**的**成对**思维链标签整块删掉。
// 只处理成对的（有头有尾，边界明确，不会误伤），不处理落单的标签。
// <details> 这条格式故意不参与：角色卡自己经常用 <details> 做折叠面板，
// 全文乱删会把卡片内容一起删掉，它继续只在开头匹配（老行为不变）。
const REASONING_ANYWHERE_SAFE = ['think', 'thinking', 'custom_think', 'SECRET/thought'];
function escapeRegExpLiteral(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function stripPairedReasoningAnywhere(text) {
    let t = text;
    for (const fmt of reasoningFormats) {
        if (fmt.enabled === false || !fmt.prefix || !fmt.suffix) continue;
        if (!REASONING_ANYWHERE_SAFE.includes(fmt.name)) continue;
        try {
            const re = new RegExp(escapeRegExpLiteral(fmt.prefix) + '[\\s\\S]*?' + escapeRegExpLiteral(fmt.suffix), 'gi');
            t = t.replace(re, '');
        } catch (e) { /* 用户自定义的前后缀拼不出合法正则就跳过这条 */ }
    }
    return t;
}
function processReasoningInText(text) {
    if (!text || typeof text !== 'string') return text;
    let t = stripPairedReasoningAnywhere(text);
    const { collapsedBlocks, rest } = stripLeadingReasoningBlocks(t);
    if (collapsedBlocks.length > 0) t = rest;
    // 全被当成思维链删光了说明判断有误（正文不该是空的），宁可原样显示也不要给用户一条空消息
    return t.trim() ? t : text;
}

// 🐛 修复"评论/回帖里混入一整段思考过程"：部分模型（尤其没有走标准reasoning_content通道、只是被prompt
// 要求"想清楚再回答"的模型）会把整段思考过程原样写在最终回复前面，不带任何<think>之类的标签——这种情况
// stripLeadingReasoningBlocks 认不出来（它靠配置好的前后缀标签匹配），思考过程就会原样变成"回复正文"。
// 经验规律：这类文本里，模型思考完之后给出的真正答案几乎总是全文最后一段（往往就是一两句话），
// 前面大段的分析/草稿都在这段之前。这里只在明显超出预期字数（超过expectedMaxLen的2.5倍）时才生效，
// 退化成"只取最后一段"、把前面的思考过程扔掉；长度正常的普通回复完全不受影响，避免误伤。
// 🐛 "[QUOTE:12] 原样出现在聊天气泡里" 的兜底。
//
// [QUOTE:N] / [MOVETOCHAT] / [NUDGE] / [EMO:xxx] 这几个方括号标记是**给代码看的暗号**，
// 各自的解析逻辑在前面都跑过了。能活到这一步的都是没被认出来的漏网之鱼，常见两种：
//   1. 模型把标记写在了句子**末尾**而不是开头（prompt里写了"加在最前面"也拦不住它）；
//   2. 预设/角色卡教了它一个当前场景根本没启用的标记（比如1v1聊天里写 [MOVETOCHAT]）。
// 不管哪种，原样显示给用户看都是"内部实现漏出来了"，跟那坨 ```json 是同一类事故。
//
// ⚠️ 这个函数只跑在 **AI 输出** 的清洗链路上，永远不碰用户自己打的字——
// 用户真想在消息里打 "[QUOTE:1]" 这几个字符，那是他的自由，不该被吃掉。
// 也刻意**没有**清理 [回复N]：论坛体/楼层小说的正文里本来就可能出现这种写法，
// 那是内容不是标记，只有评论区那条解析路径知道该不该处理它。
function stripLeftoverMarkers(text) {
    if (!text || typeof text !== 'string') return text;
    let t = text
        .replace(/\[\s*QUOTE\s*:\s*\d+\s*\]/ig, '')
        .replace(/\[\s*MOVETOCHAT\s*\]/ig, '')
        .replace(/\[\s*NUDGE\s*\]/ig, '')
        .replace(/\[\s*EMO\s*:\s*emo_[\w-]+\s*\]/ig, '');
    if (t === text) return text;
    // 只收拾标记留下的多余空格，不动正文本身的换行结构
    return t.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
}

// ⚠️ 别图省事把 stripLeftoverMarkers 塞进这个函数里当"公共清洗"。试过，会出事：
// 评论区那几条路径是**先**调这个函数、**后**才解析 [MOVETOCHAT] 和 [EMO:xxx] 的
// （见 js/09 和 js/10），标记在这里就被清掉的话，转私聊和表情包会直接失效——
// 而且是那种"功能没报错，只是再也不触发了"的哑火，最难发现。
// 标记的清理必须放在**各自解析完之后**，谁解析谁负责。
function stripUndelimitedReasoningIfOverLength(text, expectedMaxLen) {
    if (!text) return text;
    // 优先用"正式输出标记"精确切割（如果模型遵循了prompt里的要求），比长度启发式准得多。
    const marked = extractAfterFinalMarker(text);
    if (marked !== text) return marked.trim();

    // 🐛 修复"评论/推文里思维链跑出来"：这个函数原本只有一条"太长就取最后一段"的长度启发式，
    // 完全没走项目里那套成熟的思维链格式识别（<think>/<thinking>/<details>/SECRET 等）。
    // 于是模型只要用了这些标准写法，或者把整段思考写成**一整段不分段**的文字，
    // 就会原封不动地糊在评论区里（一整段的情况连"取最后一段"都救不了，因为只有一段）。
    // 这里先按已知格式精确剥一遍，再落到长度启发式兜底。
    let pre = String(text);
    if (typeof stripPairedReasoningAnywhere === 'function') {
        try { pre = stripPairedReasoningAnywhere(pre); } catch (e) { /* 剥离失败就用原文 */ }
    }
    if (typeof stripLeadingReasoningBlocks === 'function') {
        try {
            const r = stripLeadingReasoningBlocks(pre);
            // stripLeadingReasoningBlocks 在不同版本里可能返回字符串或 {text,...}，两种都兼容
            const got = (typeof r === 'string') ? r : (r && typeof r.text === 'string' ? r.text : null);
            if (got !== null && got.trim()) pre = got;
        } catch (e) { /* 同上 */ }
    }
    // 常见的"没有闭合标签"的中文思考开场：思考过程：/分析：/我的思路：…… 后面跟一大段，
    // 真正要说的话往往在最后一个空行之后。只在确实超长时才动手，避免误伤正常长评论。
    const t0 = pre.trim();
    const t = t0;
    const limit = (typeof expectedMaxLen === 'number' && expectedMaxLen > 0) ? expectedMaxLen : 100;
    if (t.length <= limit * 2.5) return t;
    const paragraphs = t.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length <= 1) {
        // 只有一整段、又长得离谱：多半是模型把思考和结论写成了一坨。
        // 试着按"思考类开场白"截断——找不到就只能原样返回（宁可多显示，也不敢乱切用户的正文）。
        const m = t.match(/(?:^|\n)\s*(?:思考过程|思路|分析|推理|我的思考|Reasoning|Thinking)\s*[:：][\s\S]*?(?:\n\s*(?:回复|输出|正式回复|最终回复|Answer|Response)\s*[:：]\s*)([\s\S]+)$/i);
        if (m && m[1] && m[1].trim()) return m[1].trim();
        return t;
    }
    return paragraphs[paragraphs.length - 1];
}

// 小说/续写场景专用的思维链展示：受 showNovelReasoning 开关控制——开着就沿用全局思维链设置
// （reasoningDisplayMode，默认'collapse'折叠展示），关掉则不管全局设置是什么，这里一律强制把思维链正文剥掉、
// 完全不显示（哪怕全局设成了'off'原样保留，小说这边开关关了也不展示，两个开关互不影响对方场景）。
// 拆成两步返回而不是直接拼好一个字符串：调用方要对"剥离后的正文"跑 applyRegexScripts（角色状态栏这类HTML
// 卡片全靠这一步正则脚本转换出来，很多正则是从文本开头^锚定匹配的，思维链如果已经堵在最前面会导致锚点
// 永远匹配不上）——而且不管是烘焙阶段的正则、还是渲染阶段的displayOnly正则，只要 reasoningHtml 曾经跟正文
// 拼在一起存过档，锚点问题就还会在渲染那一刻复发。所以调用方存档时也不要把两者拼死，reasoningHtml应该
// 单独存一个字段（参考 novel.storyTurns / novel.chapters 里的 reasoningHtml 字段），渲染时在
// renderMarkdownLite(text,...) 外面单独拼接，正文本身永远保持"从AI原始正文本该开始的地方开始"。
function extractReasoningForNovel(text) {
    if (!text || typeof text !== 'string') return { rest: text, reasoningHtml: '' };
    // 优先用"正式输出标记"精确切割——模型没有走<think>标签、只是把思考过程原样堆在正文前面时，
    // 靠这个标记能干净利落地拿到标记之后的正式内容，思考过程整个丢弃（小说场景不需要展示思考过程本身）。
    const marked = extractAfterFinalMarker(text);
    if (marked !== text) return { rest: marked.trim(), reasoningHtml: '' };
    const reasoningOff = typeof showNovelReasoning !== 'undefined' && !showNovelReasoning;
    if (reasoningOff || reasoningDisplayMode === 'off') {
        // 关闭展示：仍然要把思维链剥掉不让它进入正文，只是不生成展示用的折叠框HTML
        return { rest: stripLeadingReasoningBlocks(text).rest, reasoningHtml: '' };
    }
    const { collapsedBlocks, rest } = stripLeadingReasoningBlocks(text);
    if (collapsedBlocks.length === 0) return { rest: text, reasoningHtml: '' };
    if (reasoningDisplayMode === 'strip') return { rest, reasoningHtml: '' };
    return { rest, reasoningHtml: buildReasoningCollapseHtml(collapsedBlocks) };
}

function renderReasoningFormatsList() {
    const container = document.getElementById('reasoningFormatsList');
    if (!container) return;
    const modeSelect = document.getElementById('reasoningDisplayModeSelect');
    if (modeSelect) modeSelect.value = reasoningDisplayMode;
    if (!reasoningFormats || reasoningFormats.length === 0) { container.innerHTML = '<div style="color:#8b98a5; font-size:13px;">暂无思维链格式</div>'; return; }
    container.innerHTML = reasoningFormats.map(fmt => `
        <div style="display:flex; align-items:center; gap:8px; background:white; padding:8px; border-radius:6px; border:1px solid #eff3f4;">
            <input type="checkbox" ${fmt.enabled !== false ? 'checked' : ''} onchange="toggleReasoningFormat('${fmt.id}')" title="启用/禁用">
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:bold;">${escapeHtml(fmt.name) || '未命名格式'}</div>
                <div style="font-size:12px; color:#536471; word-break:break-all;"><code class="md-inlinecode">${escapeHtml(fmt.prefix)}</code> ... <code class="md-inlinecode">${escapeHtml(fmt.suffix)}</code></div>
            </div>
            <span style="color:#f91880; cursor:pointer; flex-shrink:0;" onclick="deleteReasoningFormat('${fmt.id}')">删除</span>
        </div>`).join('');
}
function toggleReasoningFormat(id) {
    const fmt = reasoningFormats.find(f => f.id === id);
    if (fmt) { fmt.enabled = fmt.enabled === false ? true : false; saveAllData(); renderReasoningFormatsList(); }
}
function deleteReasoningFormat(id) {
    reasoningFormats = reasoningFormats.filter(f => f.id !== id);
    saveAllData();
    renderReasoningFormatsList();
}
function addReasoningFormat() {
    const name = document.getElementById('newReasoningFormatName').value.trim();
    const prefix = document.getElementById('newReasoningFormatPrefix').value.trim();
    const suffix = document.getElementById('newReasoningFormatSuffix').value.trim();
    if (!prefix || !suffix) return alert('前缀和后缀都要填写，两个都不能为空。');
    reasoningFormats.push({ id: 'rf_' + Date.now(), name: name || '未命名格式', prefix, suffix, enabled: true });
    document.getElementById('newReasoningFormatName').value = '';
    document.getElementById('newReasoningFormatPrefix').value = '';
    document.getElementById('newReasoningFormatSuffix').value = '';
    saveAllData();
    renderReasoningFormatsList();
}
function saveReasoningDisplayMode() {
    const sel = document.getElementById('reasoningDisplayModeSelect');
    if (sel) reasoningDisplayMode = sel.value;
    saveAllData();
}

// ===================== MVU 变量更新块（状态栏）识别与应用 =====================
// 有些预设（比如"MoM"系列）会强制要求AI在每次回复里附上一段
// <UpdateVariable><Analysis>...</Analysis><JSONPatch>[ {op,path,value}, ... ]</JSONPatch></UpdateVariable>
// 这种"变量补丁"块，本来在酒馆里是由专门的插件解析掉、更新到一套隐藏的角色状态数值上，
// 再单独渲染成好看的状态栏——如果什么都不处理，这段本该被隐藏的JSON就会原样糊在聊天气泡最前面，
// 又长又难看（这正是"角色卡自带状态栏显示不出来"这个问题的根源）。这里做三件事：
// 1）无论这个块实际出现在正文开头还是结尾（不同预设/模型习惯不一样，不能假设固定位置），都识别出来并从可见正文里去掉；
// 2）把里面的 op（replace/delta/insert/remove/move）应用到按"聊天session"分桶的状态树上
//    （path是"/角色/谢云霄/疲劳度"这种斜杠分隔路径，delta是"在原有数值基础上加/减"，其余op按标准JSON Patch语义处理）；
// 3）把应用后的状态树快照存到这条消息对象上，渲染消息时读这个快照画一个真正的状态栏卡片出来
//    （存在消息自己身上而不是只存一份"最新状态"，这样翻旧消息/群聊分叉的时候，每条消息都能显示"当时那一刻"的数值，不会全部显示成最新值）。
let mvuStats = {}; // { [sessionId]: 任意深度的嵌套对象树，按 JSONPatch 的 path 逐级存放 }
function getMvuStatsScope(sessionId) {
    const key = sessionId || '__default__';
    if (!mvuStats[key]) mvuStats[key] = {};
    return mvuStats[key];
}

// 从 text 的 startIdx（必须是个 '[' ）开始，找跟它配对的那个 ']'，正确跳过字符串内部的转义字符/引号，
// 避免数组元素的字符串值里恰好带个 ] 就被提前截断——跟 extractJsonObject 找 {} 是同一套思路，这里换成找 []。
function extractBalancedJsonArray(text, startIdx) {
    let depth = 0, inStr = false, strCh = '', esc = false, end = -1;
    for (let i = startIdx; i < text.length; i++) {
        let ch = text[i];
        if (inStr) {
            if (esc) { esc = false; }
            else if (ch === '\\') { esc = true; }
            else if (ch === strCh) { inStr = false; }
            continue;
        }
        if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
        if (ch === '[') depth++;
        else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) return null;
    return text.slice(startIdx, end + 1);
}
// 跟 extractJsonObject 里同一套"宽松修复"逻辑：先直接尝试解析，失败再修一遍字符串内部的裸换行/多余逗号这些
// AI输出常见的小毛病，修完再试一次——两次都失败才彻底放弃，返回null（调用方会当成"没有补丁"处理，不影响正文显示）。
function tryParseJsonArrayLoose(candidate) {
    try { return JSON.parse(candidate); } catch (e) {}
    let fixed = '', inStr = false, esc = false;
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
    // 跟 tryParseJsonCandidate 共用同一个兜底修复：文本字段内部没转义的引号（对话里引用一句话时常见）
    try { return JSON.parse(repairUnescapedInnerQuotes(fixed)); } catch (e3) { return null; }
}

// 在文本里找变量补丁块：优先找标准的 <UpdateVariable>...</UpdateVariable> 包裹（块内通常还带一段
// <Analysis>分析说明文字</Analysis>，一起当成"要隐藏的部分"清掉）；找不到这层包裹时，再找
// 单独出现的 <JSONPatch>...</JSONPatch>（前面常紧跟着一段同样要隐藏的 <EventEval>...</EventEval>
// 人类可读小结，比如"疲劳-1，欲望+0..."这种）——这是另一种同样常见的写法，没有外层UpdateVariable包裹，
// 真实角色卡（作者直接把这段焊在开场白里）就是这么写的。这两种"有明确标签"的写法不要求出现在开头/结尾，
// 正文中间出现也认，因为标签名本身就足够独特，不会跟普通台词混淆。都找不到才退而求其次，
// 只在文本贴着开头或贴着结尾的位置找一段"数组元素都长得像{op,path,...}"的裸JSON数组——这种没有任何
// 标签包裹的情况没法这么自信，不敢在正文中间随便找，避免把角色台词里凑巧出现的普通方括号内容误判成这个格式。
function extractMvuPatchBlock(text) {
    if (!text || typeof text !== 'string') return null;
    const wrapped = text.match(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/i);
    if (wrapped) {
        const patchTagMatch = wrapped[0].match(/<JSONPatch>([\s\S]*?)<\/JSONPatch>/i);
        let patchArr = null;
        if (patchTagMatch) patchArr = tryParseJsonArrayLoose(patchTagMatch[1].trim());
        if (!patchArr) {
            const idx = wrapped[0].indexOf('[');
            if (idx !== -1) { const arr = extractBalancedJsonArray(wrapped[0], idx); if (arr) patchArr = tryParseJsonArrayLoose(arr); }
        }
        return { fullMatch: wrapped[0], patch: patchArr };
    }
    const standaloneEventPatch = text.match(/(?:<EventEval>[\s\S]*?<\/EventEval>\s*)?<JSONPatch>([\s\S]*?)<\/JSONPatch>/i);
    if (standaloneEventPatch) {
        const patchArr = tryParseJsonArrayLoose(standaloneEventPatch[1].trim());
        return { fullMatch: standaloneEventPatch[0], patch: patchArr };
    }
    const trimmed = text.trim();
    const tryBareArrayAt = (idx) => {
        if (idx === -1) return null;
        const arrText = extractBalancedJsonArray(trimmed, idx);
        if (!arrText) return null;
        const parsed = tryParseJsonArrayLoose(arrText);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(o => o && typeof o === 'object' && 'op' in o && 'path' in o)) {
            return { fullMatch: arrText, patch: parsed };
        }
        return null;
    };
    if (/^\s*\[/.test(trimmed)) {
        const res = tryBareArrayAt(trimmed.indexOf('['));
        if (res) return res;
    }
    const lastOpenIdx = trimmed.lastIndexOf('[');
    if (lastOpenIdx !== -1) {
        const arrText = extractBalancedJsonArray(trimmed, lastOpenIdx);
        if (arrText && trimmed.slice(lastOpenIdx + arrText.length).trim().length === 0) {
            const parsed = tryParseJsonArrayLoose(arrText);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(o => o && typeof o === 'object' && 'op' in o && 'path' in o)) {
                return { fullMatch: arrText, patch: parsed };
            }
        }
    }
    return null;
}

// 把一条JSONPatch操作应用到状态树上：path是"/角色/谢云霄/疲劳度"这种斜杠分隔路径，中间节点不存在就自动建空对象；
// 遇到未知/处理不了的op，宁可直接赋值兜底，也不抛错打断整个补丁的应用（调用方还会再包一层try/catch兜底）。
function applyMvuPathOp(root, op) {
    if (!op || typeof op.path !== 'string' || !op.path) return;
    const segs = op.path.split('/').filter(s => s.length > 0).map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'));
    if (segs.length === 0) return;
    let node = root;
    for (let i = 0; i < segs.length - 1; i++) {
        const key = segs[i];
        if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
        node = node[key];
    }
    const lastKey = segs[segs.length - 1];
    const action = (op.op || 'replace').toLowerCase();
    if (action === 'delta') {
        const cur = parseFloat(node[lastKey]);
        const d = parseFloat(op.value);
        node[lastKey] = (isNaN(cur) ? 0 : cur) + (isNaN(d) ? 0 : d);
    } else if (action === 'remove') {
        delete node[lastKey];
    } else if (action === 'move' && typeof op.from === 'string') {
        const fromSegs = op.from.split('/').filter(s => s.length > 0);
        let fromNode = root;
        for (let i = 0; i < fromSegs.length - 1; i++) { if (typeof fromNode[fromSegs[i]] !== 'object' || fromNode[fromSegs[i]] === null) fromNode[fromSegs[i]] = {}; fromNode = fromNode[fromSegs[i]]; }
        const fromKey = fromSegs[fromSegs.length - 1];
        node[lastKey] = fromNode[fromKey];
        delete fromNode[fromKey];
    } else if (action === 'insert' && Array.isArray(node[lastKey])) {
        node[lastKey].push(op.value);
    } else {
        node[lastKey] = op.value;
    }
}

// 处理一条AI回复文本：识别+剥离变量补丁块，把补丁应用到这个session的状态树上，
// 返回 { cleanText, snapshot }——snapshot只有在这条消息确实带了补丁块时才非null，是应用完这条补丁之后、
// 当时那一刻的状态树深拷贝（用来渲染这条消息专属的状态栏）。没有补丁块的普通消息原样返回，不受任何影响。
function processMvuPatchInText(text, sessionId) {
    if (!text || typeof text !== 'string') return { cleanText: text, snapshot: null };
    const found = extractMvuPatchBlock(text);
    if (!found) return { cleanText: text, snapshot: null };
    const cleanText = text.replace(found.fullMatch, '').trim();
    if (!found.patch || !Array.isArray(found.patch)) return { cleanText, snapshot: null };
    const root = getMvuStatsScope(sessionId);
    found.patch.forEach(op => { try { applyMvuPathOp(root, op); } catch (e) { console.error('应用MVU变量补丁的某一条操作时出错，已跳过：', op, e); } });
    let snapshot = null;
    try { snapshot = JSON.parse(JSON.stringify(root)); } catch (e) { snapshot = null; }
    return { cleanText, snapshot };
}

// 把状态快照渲染成状态栏卡片：按"倒数第二层"的路径分组当标题（比如"角色 / 谢云霄"），最后一层的key当字段名——
// 结构不确定（有的卡两层，有的卡三层）时按实际层数展开，不强行假设固定层数。数字字段额外按正负上色，
// 一眼就能看出这轮是涨了还是掉了，不用自己心算前后两次的差值。
function renderMvuStatusBarHtml(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return '';
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const groups = {};
    const walk = (node, pathSegs) => {
        if (node === null || typeof node !== 'object') return;
        const entries = Object.entries(node);
        const allLeaf = entries.every(([, v]) => v === null || typeof v !== 'object');
        const groupTitle = pathSegs.length > 0 ? pathSegs.join(' / ') : '状态';
        if (allLeaf) {
            if (entries.length === 0) return;
            groups[groupTitle] = groups[groupTitle] || [];
            entries.forEach(([k, v]) => groups[groupTitle].push({ label: k, value: v }));
            return;
        }
        entries.forEach(([k, v]) => {
            if (v !== null && typeof v === 'object') walk(v, [...pathSegs, k]);
            else { groups[groupTitle] = groups[groupTitle] || []; groups[groupTitle].push({ label: k, value: v }); }
        });
    };
    walk(snapshot, []);
    const groupKeys = Object.keys(groups);
    if (groupKeys.length === 0) return '';
    const fieldHtml = (label, value) => {
        const isNum = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)));
        const numVal = isNum ? Number(value) : null;
        const valClass = isNum ? (numVal > 0 ? 'mvu-stat-pos' : (numVal < 0 ? 'mvu-stat-neg' : '')) : '';
        return `<span class="mvu-stat-field"><b>${esc(label)}</b><span class="mvu-stat-value ${valClass}">${esc(value)}</span></span>`;
    };
    const bodyHtml = groupKeys.map(gk => `
        <div class="mvu-stat-group">
            <div class="mvu-stat-group-title">${esc(gk)}</div>
            <div class="mvu-stat-group-fields">${groups[gk].map(f => fieldHtml(f.label, f.value)).join('')}</div>
        </div>`).join('');
    return `<div class="mvu-status-bar">${bodyHtml}</div>`;
}

// ===================== 记忆召回面板（"数据库"类预设常见格式）本地轻量实现 =====================
// 有些预设（比如"星河璀璨数据库"）会让AI每轮在输出里带一段 <recall>AM001（标题）AM002（标题2）...</recall>
// （这轮用到的历史记忆编码）+ 可选的 <supplement>- [标签] 补充内容\n...</supplement>（旁支线索）。
// 酒馆那边真正的"数据库"扩展靠一个远程脚本（本app不会去加载运行来路不明的远程代码，这类脚本一律不执行）
// 维护一张可以被AI持续读写的"记忆表格"，命中编码后从表格里查出对应内容、渲染成好看的召回面板。
// 这里做一个本地、完全可审查的轻量平替：记忆表格由用户自己在设置里维护（增删改查，也可以配合正则/宏
// 让AI在文本里输出新的记忆条目、后续再手动登记），召回面板的渲染、编码识别、旁支解析这些"看得见"的部分
// 照着同样的思路自己实现，不依赖任何远程脚本；查不到的编码会显示"本地记忆库里还没有这条记录"，不会报错卡死。
let memoryEntries = {}; // { [sessionId]: [{code, title, content, source}] }
function getMemoryEntries(sessionId) {
    const key = sessionId || '__default__';
    if (!memoryEntries[key]) memoryEntries[key] = [];
    return memoryEntries[key];
}
function findMemoryEntry(sessionId, code) {
    const list = getMemoryEntries(sessionId);
    return list.find(e => (e.code || '').toUpperCase() === (code || '').toUpperCase()) || null;
}

// 识别文本里的 <recall>...</recall> / <supplement>...</supplement> 两种块（各自独立，出现任意一个就处理，
// 都没有就返回null）。这两个标签名足够独特，不限制只能出现在开头/结尾，正文中间出现也认。
function extractRecallSupplementBlock(text) {
    if (!text || typeof text !== 'string') return null;
    const recallMatch = text.match(/<recall>([\s\S]*?)<\/recall>/i);
    const supplementMatch = text.match(/<supplement>([\s\S]*?)<\/supplement>/i);
    if (!recallMatch && !supplementMatch) return null;
    const fullMatches = [];
    if (recallMatch) fullMatches.push(recallMatch[0]);
    if (supplementMatch) fullMatches.push(supplementMatch[0]);
    return { fullMatches, recallRaw: recallMatch ? recallMatch[1] : '', supplementRaw: supplementMatch ? supplementMatch[1] : '' };
}
// <recall>正文里形如 "AM001（初遇时的桥段）AM002（...）" 这种"编码+紧跟的括号标题"写法，
// 从原始文本里把编码列表（去重、保留首次出现顺序）和每个编码对应的行内标题分别抠出来。
function parseAmCodesFromRecall(raw) {
    const matches = (raw || '').match(/AM\d+/gi) || [];
    const seen = new Set(); const codes = [];
    matches.forEach(c => { const up = c.toUpperCase(); if (!seen.has(up)) { seen.add(up); codes.push(up); } });
    return codes;
}
function extractAmTitleFromRecall(raw, code) {
    try {
        const m = (raw || '').match(new RegExp(code + '[（(]([^）)]+)[）)]'));
        return m ? m[1].trim() : '';
    } catch (e) { return ''; }
}
// <supplement>正文是"- [标签] 内容\n（可能换行接着写更多内容）\n- [下一个标签] ..."这种列表写法
function parseSupplementItems(raw) {
    const lines = (raw || '').split('\n');
    const items = [];
    let current = null;
    lines.forEach(line => {
        const m = line.match(/^\s*-\s*\[([^\]]+)\]\s*(.*)/);
        if (m) { if (current) items.push(current); current = { tag: m[1].trim(), content: m[2].trim() }; }
        else if (current && line.trim()) current.content += '\n' + line.trim();
    });
    if (current) items.push(current);
    return items;
}
function renderRecallPanelHtml(sessionId, recallRaw, supplementRaw) {
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const codes = parseAmCodesFromRecall(recallRaw || '');
    const items = parseSupplementItems(supplementRaw || '');
    if (codes.length === 0 && items.length === 0) return '';
    const recallHtml = codes.map(code => {
        const inlineTitle = extractAmTitleFromRecall(recallRaw, code);
        const entry = findMemoryEntry(sessionId, code);
        const displayTitle = inlineTitle || (entry ? entry.title : '') || '无题';
        const body = entry ? entry.content : '（本地记忆库里还没有这条记录，可以在设置的"记忆库管理"里手动补上）';
        const source = entry ? entry.source : '';
        return `<div class="recall-item"><div class="recall-item-header"><span class="recall-item-code">${esc(code)}</span><span class="recall-item-title">${esc(displayTitle)}</span></div><div class="recall-item-body">${esc(body)}</div>${source ? `<div class="recall-item-source">来自：${esc(source)}</div>` : ''}</div>`;
    }).join('');
    const supplementHtml = items.map(it => `<div class="recall-item"><span class="recall-tag">${esc(it.tag)}</span><div class="recall-item-body">${esc(it.content)}</div></div>`).join('');
    const summary = `📖 记忆召回${codes.length ? `（${codes.length}）` : ''}${items.length ? ` · 旁支线索（${items.length}）` : ''}`;
    return `<details class="recall-panel"><summary>${summary}</summary>${recallHtml ? `<div class="recall-section-title">流转</div>${recallHtml}` : ''}${supplementHtml ? `<div class="recall-section-title">旁支</div>${supplementHtml}` : ''}</details>`;
}
// 处理一条AI回复文本：识别+剥离recall/supplement块，返回{cleanText, recallHtml}——recallHtml只有
// 确实识别到这类块时才非空字符串，调用方把它拼在正文前面展示；没有这类块的普通消息原样返回，不受影响。
function processRecallBlockInText(text, sessionId) {
    if (!text || typeof text !== 'string') return { cleanText: text, recallHtml: '' };
    const found = extractRecallSupplementBlock(text);
    if (!found) return { cleanText: text, recallHtml: '' };
    let cleanText = text;
    found.fullMatches.forEach(m => { cleanText = cleanText.replace(m, ''); });
    cleanText = cleanText.trim();
    const recallHtml = renderRecallPanelHtml(sessionId, found.recallRaw, found.supplementRaw);
    return { cleanText, recallHtml };
}

// 记忆库管理UI：跟正则脚本/思维链格式列表同一套风格，按当前打开的聊天/续写session分桶展示。
function renderMemoryEntriesList(sessionId) {
    const container = document.getElementById('memoryEntriesList');
    if (!container) return;
    const list = getMemoryEntries(sessionId);
    if (list.length === 0) { container.innerHTML = '<div style="color:#8b98a5; font-size:13px;">这个会话还没有登记任何记忆条目</div>'; return; }
    container.innerHTML = list.map((e, idx) => `
        <div style="display:flex; align-items:flex-start; gap:8px; background:white; padding:8px; border-radius:6px; border:1px solid #eff3f4;">
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:bold;">${escapeHtml(e.code)} <span style="font-weight:normal; color:#536471;">${escapeHtml(e.title || '')}</span></div>
                <div style="font-size:12px; color:#536471; white-space:pre-wrap; word-break:break-all;">${escapeHtml(e.content || '')}</div>
                ${e.source ? `<div style="font-size:11px; color:#8b98a5;">来源：${escapeHtml(e.source)}</div>` : ''}
            </div>
            <span style="color:#f91880; cursor:pointer; flex-shrink:0;" onclick="deleteMemoryEntry('${sessionId}', ${idx})">删除</span>
        </div>`).join('');
}
function addMemoryEntry(sessionId) {
    const code = document.getElementById('newMemoryCode')?.value.trim();
    const title = document.getElementById('newMemoryTitle')?.value.trim();
    const content = document.getElementById('newMemoryContent')?.value.trim();
    const source = document.getElementById('newMemorySource')?.value.trim();
    if (!code) return alert('请填写记忆编码（比如 AM001）');
    if (!content) return alert('请填写记忆内容');
    getMemoryEntries(sessionId).push({ code, title, content, source });
    ['newMemoryCode', 'newMemoryTitle', 'newMemoryContent', 'newMemorySource'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = ''; });
    saveAllData();
    renderMemoryEntriesList(sessionId);
}
function deleteMemoryEntry(sessionId, idx) {
    getMemoryEntries(sessionId).splice(idx, 1);
    saveAllData();
    renderMemoryEntriesList(sessionId);
}

// 给"添加脚本"表单里的角色下拉框填上当前所有角色，每次列表刷新都重新填一遍（角色可能是刚导入的新角色）
function populateRegexCharScopeOptions() {
    const sel = document.getElementById('newRegexCharScope');
    if (!sel) return;
    const prevValue = sel.value;
    const chars = (typeof myCharacters !== 'undefined' ? myCharacters : []) || [];
    sel.innerHTML = '<option value="">🌐 全局（不限定角色，默认）</option>' + chars.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    if (chars.some(c => c.id === prevValue)) sel.value = prevValue; // 保留用户已经选中的角色，避免每次刷新列表都被重置回"全局"
}

function renderNewRegexCharScopeHint() {
    const sel = document.getElementById('newRegexCharScope');
    const hint = document.getElementById('newRegexCharScopeHint');
    if (!sel || !hint) return;
    hint.innerText = sel.value ? '💡 已绑定角色：这条脚本只会在渲染该角色自己发的帖子/评论/回信/日记/续写/小说/论坛内容时生效，不会影响其它角色。' : '';
}

function renderRegexScriptsList() {
    populateRegexCharScopeOptions();
    const container = document.getElementById('regexScriptsList');
    if (!container) return;
    if (!regexScripts || regexScripts.length === 0) { container.innerHTML = '<div style="color:#8b98a5; font-size:13px;">暂无正则脚本</div>'; return; }
    const targetLabel = { ai_output: 'AI回复', user_input: '我的消息', both: '双向' };
    const charNameById = {};
    (typeof myCharacters !== 'undefined' ? myCharacters : []).forEach(c => { charNameById[c.id] = c.name; });
    container.innerHTML = regexScripts.map(s => {
        const scopeTag = s.displayOnly ? ' 👁️仅显示' : (s.promptOnly ? ' 🤖仅发AI' : ` [${targetLabel[s.target] || s.target}]`);
        const hasDepthLimit = typeof s.minDepth === 'number' || typeof s.maxDepth === 'number';
        const depthTag = hasDepthLimit ? ` 📏深度${typeof s.minDepth === 'number' ? s.minDepth : '0'}~${typeof s.maxDepth === 'number' ? s.maxDepth : '∞'}` : '';
        // 绑定了专属角色的脚本，标签上直接把角色名标出来，一眼能看出这条只对谁生效
        const charTag = (Array.isArray(s.charScope) && s.charScope.length > 0)
            ? ` 🎭${s.charScope.map(id => escapeHtml(charNameById[id] || '未知角色')).join('/')}专属`
            : '';
        return `
        <div style="display:flex; align-items:center; gap:8px; background:white; padding:8px; border-radius:6px; border:1px solid #eff3f4;">
            <input type="checkbox" ${s.enabled !== false ? 'checked' : ''} onchange="toggleRegexScriptEnabled('${s.id}')" title="启用/禁用">
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:bold;">${escapeHtml(s.name) || '未命名脚本'} <span style="font-weight:normal; font-size:11px; color:#8b98a5;">${scopeTag}${s.isRegex ? ' 🔤正则' : ''}${depthTag}${charTag}</span></div>
                <div style="font-size:12px; color:#536471; word-break:break-all; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; cursor:pointer;" title="点击展开/收起完整内容" onclick="toggleRegexPreviewExpand(this)">${escapeHtml(s.find)} → ${s.replace ? escapeHtml(s.replace) : '(删除)'}</div>
            </div>
            <span style="color:#f91880; cursor:pointer; flex-shrink:0;" onclick="deleteRegexScript('${s.id}')">删除</span>
        </div>`;
    }).join('');
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
    const displayOnly = document.getElementById('newRegexDisplayOnly')?.checked || false;
    const promptOnly = !displayOnly && (document.getElementById('newRegexPromptOnly')?.checked || false);
    const minDepthRaw = document.getElementById('newRegexMinDepth')?.value;
    const maxDepthRaw = document.getElementById('newRegexMaxDepth')?.value;
    const minDepth = minDepthRaw !== '' && minDepthRaw !== undefined ? parseInt(minDepthRaw) : null;
    const maxDepth = maxDepthRaw !== '' && maxDepthRaw !== undefined ? parseInt(maxDepthRaw) : null;
    const charScopeId = document.getElementById('newRegexCharScope')?.value || '';
    const charScope = charScopeId ? [charScopeId] : null; // 空＝全局脚本，选了角色就只绑定那一个（保留数组形式，以后想支持多选也不用改数据结构）
    if (!find) return alert('请填写"查找内容"');
    if (isRegex) { try { new RegExp(find); } catch (e) { return alert('正则表达式写法有误：' + e.message); } }
    regexScripts.push({ id: 'rx_' + Date.now(), name: name || '未命名脚本', find, replace, isRegex, target, enabled: true, displayOnly, promptOnly, minDepth: isNaN(minDepth) ? null : minDepth, maxDepth: isNaN(maxDepth) ? null : maxDepth, charScope });
    document.getElementById('newRegexName').value = '';
    document.getElementById('newRegexFind').value = '';
    document.getElementById('newRegexReplace').value = '';
    document.getElementById('newRegexIsRegex').checked = false;
    if (document.getElementById('newRegexDisplayOnly')) document.getElementById('newRegexDisplayOnly').checked = false;
    if (document.getElementById('newRegexPromptOnly')) document.getElementById('newRegexPromptOnly').checked = false;
    if (document.getElementById('newRegexCharScope')) document.getElementById('newRegexCharScope').value = '';
    if (document.getElementById('newRegexCharScopeHint')) document.getElementById('newRegexCharScopeHint').innerText = '';
    if (document.getElementById('newRegexMinDepth')) document.getElementById('newRegexMinDepth').value = '';
    if (document.getElementById('newRegexMaxDepth')) document.getElementById('newRegexMaxDepth').value = '';
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
    const api = getVectorApiConfig();
    if (!api.key) return null;
    try {
        const res = await smartFetch(`${api.url}/embeddings`, {
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
    const api = getVectorApiConfig();
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
    // 3. 角色相关的其它数据：日记/信件/小说续写与章节/论坛发帖跟帖/匿名论坛发言，只要是这个角色自己写的都算数。
    // 之前向量记忆只覆盖了聊天消息，这些内容完全没被检索到过——现在统一走 collectCharVectorCandidates 收集、
    // backfillCharVectorEmbeddings 懒加载补embedding（新内容第一次被检索到时才现算，算过一次就跟聊天消息
    // 一样把 embVec 缓存在条目本身上，不用在日记/信件/小说/论坛这几处各自的生成入口分别加一次背景embedding调用）。
    let charDataPart = '';
    if (enableVectorMemory && char) {
        const candidates = await collectCharVectorCandidates(char);
        if (candidates.length > 0) {
            await backfillCharVectorEmbeddings(candidates);
            const scored = candidates.filter(it => it.ref.embVec)
                .map(it => ({ it, score: cosineSimilarity(qVec, it.ref.embVec) }))
                .filter(s => s.score > 0.5)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);
            if (scored.length > 0) {
                charDataPart = `\n【语义检索到的相关日记/信件/小说/论坛发言】：\n` + scored.map(s => `- (${s.it.label}) ${s.it.text.length > 200 ? s.it.text.slice(0, 200) + '…' : s.it.text}`).join('\n') + `\n`;
            }
        }
    }

    let combinedResult = memoryPart + dataBankPart + charDataPart;
    if (combinedResult.length > semanticCharBudget) {
        combinedResult = combinedResult.slice(0, semanticCharBudget) + '\n（因字数预算限制，后续检索内容已省略）\n';
    }
    return combinedResult;
}

// ===================== 向量记忆：日记/信件/小说/论坛等"角色自己写过的内容"也纳入语义检索 =====================
// 跟聊天消息（走"发出去就后台embed"）是分开的一套策略：这些内容创建频率低很多、也分散在好几个不同的生成
// 入口（日记/信件生成、续写/一键生成小说、论坛发帖/跟帖、匿名论坛发帖/跟帖……），与其在每一处各自补一次
// "生成完毕后台embed"的调用（容易漏、也容易几处代码渐渐长得不一样），不如在真正检索的这一刻统一收集这个
// 角色名下所有相关内容、把还没算过embedding的条目现算一遍——算过的直接把 embVec 缓存在条目本身上（复用现有的
// 数据结构，不另外维护一份索引），下次检索直接命中缓存，不用重算。
async function collectCharVectorCandidates(char) {
    if (!char) return [];
    const items = [];
    if (char.diaryData) {
        (char.diaryData.diaries || []).forEach(d => { if (d.content) items.push({ kind: 'diary', label: '日记', text: d.content, ref: d }); });
        (char.diaryData.letters || []).forEach(d => { if (d.content) items.push({ kind: 'letter', label: '信件', text: d.content, ref: d }); });
    }
    (typeof globalNovels !== 'undefined' ? globalNovels : []).forEach(n => {
        (n.storyTurns || []).forEach(t => { if (t.charId == char.id && t.text) items.push({ kind: 'novel', label: `《${n.title || '故事'}》续写`, text: t.text, ref: t }); });
        (n.chapters || []).forEach(c => { if (c.charId == char.id && c.content) items.push({ kind: 'novel', label: `《${n.title || '故事'}》第${c.index}章`, text: c.content, ref: c }); });
    });
    (typeof forumThreads !== 'undefined' ? forumThreads : []).forEach(th => {
        if (th.authorCharId == char.id && th.content) items.push({ kind: 'forum', label: `论坛发帖《${th.title}》`, text: th.content, ref: th });
        (th.replies || []).forEach(r => { if (r.charId == char.id && r.content) items.push({ kind: 'forum', label: `论坛回帖《${th.title}》`, text: r.content, ref: r }); });
    });
    (typeof anonPosts !== 'undefined' ? anonPosts : []).forEach(p => {
        if (p.charId == char.id && p.text) items.push({ kind: 'anon', label: '匿名论坛发帖', text: p.text, ref: p });
        (p.replies || []).forEach(r => { if (r.charId == char.id && r.text) items.push({ kind: 'anon', label: '匿名论坛回复', text: r.text, ref: r }); });
    });
    // 太短的内容检索价值低（跟聊天消息的过滤标准保持一致），不值得为它调一次embedding
    return items.filter(it => it.text && it.text.trim().length >= 10);
}

// 找出候选里还没算过embedding的条目，补算（限制并发数，避免内容一多就同时炸出几十个embedding请求）
async function backfillCharVectorEmbeddings(candidates) {
    const pending = candidates.filter(it => !it.ref.embVec);
    if (pending.length === 0) return;
    const BATCH = 5;
    for (let i = 0; i < pending.length; i += BATCH) {
        const batch = pending.slice(i, i + BATCH);
        await Promise.all(batch.map(async it => {
            try { const vec = await getEmbedding(it.text); if (vec) it.ref.embVec = vec; } catch (e) { /* 静默失败，下次检索再试 */ }
        }));
    }
    saveAllData();
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

async function deleteDataBankEntry(id) {
    if (!(await appConfirm('确定要删除这份资料库文档吗？'))) return;
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
    const api = getVectorApiConfig();
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
// ============================================================================
// 🛟 全局错误兜底：让"点了没反应"变成"点了有提示"
// ----------------------------------------------------------------------------
// 内联 onclick 里抛出的异常，浏览器只会往控制台丢一条，界面上一点动静都没有——
// 用户看到的就是"这个按钮是坏的"，而且完全没有线索。这里统一捞一下：
//   · 同步异常走 window.onerror
//   · Promise 里的异常（async 处理器最常见）走 unhandledrejection
// 只弹一条不打断操作的 toast，并且同一条错误 5 秒内不重复弹，免得循环报错时刷屏。
// ============================================================================
(function installGlobalErrorNotice() {
    let lastMsg = '', lastAt = 0;
    function notice(what, err) {
        try {
            const msg = String((err && (err.message || err.reason || err)) || '未知错误').slice(0, 120);
            const now = Date.now();
            if (msg === lastMsg && now - lastAt < 5000) return;   // 同一条 5 秒内只提示一次
            lastMsg = msg; lastAt = now;
            console.error('[谷雨] ' + what + '：', err);
            if (typeof showToast === 'function') {
                showToast('<div class="avatar" style="width:40px;height:40px;background:#f91880;color:#fff;font-size:20px;">⚠️</div>',
                    '刚才那一下没成功', msg + '（详情在控制台 F12）', null, null, false);
            }
        } catch (e) { /* 兜底自己不能再炸 */ }
    }
    window.addEventListener('error', function (e) {
        // 图片/脚本加载失败也会走到这儿，但它们没有 error 对象，跳过——只管真正的 JS 异常
        if (!e || !e.error) return;
        notice('出错了', e.error);
    });
    window.addEventListener('unhandledrejection', function (e) {
        if (!e) return;
        notice('异步操作出错', e.reason);
    });
})();
