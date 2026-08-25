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
    function setAppVH() {
        var h = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('--app-vh', (h * 0.01) + 'px');
    }
    setAppVH();
    window.addEventListener('resize', setAppVH);
    window.addEventListener('orientationchange', setAppVH);
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
    if (siteLogoImg) {
        container.innerHTML = `<img src="${siteLogoImg}" style="height:126px; width:auto; display:block; object-fit:contain; cursor:pointer;">${signatureHTML}`;
    } else {
        container.innerHTML = `<img src="./icons/icon-192.png" alt="谷雨" style="height:126px; width:auto; display:block; object-fit:contain; cursor:pointer;">${signatureHTML}`;
    }
}


const verifiedSVG = `<svg class="verified-badge blue-line-icon" viewBox="0 0 24 24"><polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"></polygon><polyline points="9 12 11 14 15 10"></polyline></svg>`;
const commentSVG = `<svg class="stat-icon blue-line-icon" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
const retweetSVG = `<svg class="stat-icon blue-line-icon" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`;
const likeSVG = `<svg class="stat-icon blue-line-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
const likeSVGFilled = `<svg class="stat-icon blue-line-icon" style="fill:#1d9bf0 !important;" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
const viewSVG = `<svg class="stat-icon blue-line-icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const locationSVG = `<svg class="blue-line-icon" style="width:18px;height:18px;" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
const quoteSVG = `<svg class="stat-icon blue-line-icon" viewBox="0 0 24 24"><path d="M9 7H4v6h3l-2 4h3l3-6V7zm10 0h-5v6h3l-2 4h3l3-6V7z"></path></svg>`;
const websiteSVG = `<svg class="blue-line-icon" style="width:18px;height:18px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

// API配置
let myApiUrl = "https://api.deepseek.com", myApiKey = "", myModel = "deepseek-chat"; 
let subApiUrl = "", subApiKey = "", subModel = "";
let vecApiUrl = "", vecApiKey = ""; // 向量记忆专用API（选填）：填了就专用于 /embeddings 请求（跟主API、副API完全独立），不填则自动走主API
let lastWorkingModel = "", lastWorkingSubModel = ""; // 主/副API各自最近一次成功用过的模型，供"模型不可用自动兜底"使用
let quietHoursEnabled = false, quietHoursStart = "23:00", quietHoursEnd = "08:00"; // 休息时间段：这段时间内不触发主动消息（本地+云端）
// 采样参数（sampler）：全部留空字符串＝不发送该字段，使用服务商默认值；用户在设置页填了才会真的带上。
let samplerTemperature = "", samplerTopP = "", samplerFrequencyPenalty = "", samplerPresencePenalty = "", samplerTopK = "";
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
    return body;
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
let chatHistoryTurns = 20;        // 每次请求带入的最近聊天轮数（原来10条太短，跟每20条自动总结一次的周期对不上，容易在10条左右出现"原始上下文刚断层、总结里的旧话题却还杵在prompt里"导致话题跳回旧内容的问题，调大到20缓解断层）
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
        return `【多段回复指令】\n你自始至终只以你自己的人设身份来回复，不要代入或复述聊天记录、世界书、人物关系网里提到的任何其他角色的人设/口吻/设定——下面这些关于"怎么把话写得自然"的要求，指的是把你自己要说的内容写得更真实自然，不是要你改写、复述或代入别的什么"原文"。\n回复条数随机不固定，单条不限制字数。动作描写必须真实详尽，回复贴近人类自然表达，并保留原文核心信息与核心意图，减少过于规整的完美句式，适当加入不规则表达；融入个性化语言风格，穿插少量口语化表述；打破机械化的段落结构，让整体读起来更真实自然。替换平淡词汇，选用更精准、生动的表达；调整句式结构，让行文更流畅自然，同时强化语言韵律感；统一语言风格并契合使用场景；修正语法、拼写等细节错误，全程保留原文核心信息与核心意图。模仿真实的微信聊天，通过多条消息（随机发送1到4条）和随机的时间间隔发送。\n输出格式【必须严格遵守JSON】，不要包含任何 Markdown 语法、不要带有 \`\`\`json 前缀，不要有任何其他的说明文字；text字段内部如果要出现双引号（比如引用/复述一句话），必须写成转义的 \\" ，不能直接写裸的 " ，否则JSON会解析失败、导致整段代码原样显示出来。如果决定不回复，请直接返回 {"replies": []}。\n格式示例：\n{\n  "replies": [\n    {"delay": 2, "text": "你要这么说的话..."},\n    {"delay": 3, "text": "我可就不困了啊[EMO:emo_123]"}\n  ],\n  "stateUpdate": "打算回去继续睡回笼觉", "statusTypeLabel": "睡觉"\n}`;
    }
    return `【多段回复指令】\n回复条数在${chatMsgCountMin}到${chatMsgCountMax}条之间自己决定（不固定，别每次都卡最大值），这几条加起来的总字数不超过${chatWordLimit}字（这是硬性上限，不是必须写满）——自己按内容需要把这个总字数分配到每一条里，可以有长有短，不要求条条都写满。${WORD_LIMIT_PRIORITY_NOTE}模仿真实的微信聊天，通过多条简短消息和随机的时间间隔发送。\n输出格式【必须严格遵守JSON】，不要包含任何 Markdown 语法、不要带有 \`\`\`json 前缀，不要有任何其他的说明文字；text字段内部如果要出现双引号（比如引用/复述一句话），必须写成转义的 \\" ，不能直接写裸的 " ，否则JSON会解析失败、导致整段代码原样显示出来。如果决定不回复，请直接返回 {"replies": []}。\n格式示例：\n{\n  "replies": [\n    {"delay": 2, "text": "你要这么说的话..."},\n    {"delay": 3, "text": "我可就不困了啊[EMO:emo_123]"}\n  ],\n  "stateUpdate": "打算回去继续睡回笼觉", "statusTypeLabel": "睡觉"\n}`;
}

let npcReplyProb = 0.4, npcReplyMaxCount = 3;
// 路人之间互相接话/吵架的概率。评论区里网友互相搭话本来就比"各说各的"常见得多，
// 但也不能每轮都吵，不然角色的话会被路人吵架刷没。
let npcArgueProb = 0.5;
// 角色回应是否延迟（不秒回）。关掉就是老行为——测试和"我就想立刻看到效果"时有用。
let charReplyDelayEnabled = true;
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
function extractAfterFinalMarker(text) {
    if (!text || typeof text !== 'string') return text;
    const idx = text.lastIndexOf(FINAL_ANSWER_MARKER);
    if (idx === -1) return text;
    return text.slice(idx + FINAL_ANSWER_MARKER.length).replace(/^\s+/, '');
}

function extractJsonObject(rawText) {
    if (!rawText) return null;
    // 如果模型遵循了"正式输出标记"的要求，优先只在标记之后的内容里找JSON——比"猜最后一个JSON块"更精确，
    // 彻底避免思考过程里出现的任何草稿/示例JSON片段被误当成正式答案。
    let text = String(extractAfterFinalMarker(rawText)).replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
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
    let text = String(extractAfterFinalMarker(rawText)).replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
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
async function sendChatRequestRaw(api, content, extraBody) {
    extraBody = extraBody || {};
    const messages = isStructuredMessages(content) ? content : [{ role: "user", content: content }];
    if (isAnthropicApiUrl(api.url)) {
        try {
            const systemText = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
            let restMsgs = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: convertContentForAnthropic(m.content) }));
            if (restMsgs.length === 0) restMsgs = [{ role: 'user', content: '（请继续。）' }];
            const anthropicBody = Object.assign({ model: api.model, max_tokens: 4096, messages: restMsgs }, getSamplerExtraBody(true), extraBody);
            if (systemText) anthropicBody.system = systemText;
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
        return raw;
    } catch (e) {
        return { error: { message: enhanceNetworkErrorMessage(e.message) } };
    }
}

// 对外真正调用的入口：在 sendChatRequestRaw 外面包一层"模型不可用自动兜底"。
// 逻辑：请求失败且报错像是"这个模型服务商没开通/不存在"，就自动换成上次成功用过的模型重试一次；
// 重试成功的话，顺手把设置里的模型也同步切过去并保存，这样用户不用自己再去设置里手动改一遍。
// 每次请求成功，也会记录这次用的模型，作为以后的"上次可用模型"。
async function sendChatRequest(api, content, extraBody) {
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

    return data;
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
    const isNativeApp = typeof window !== 'undefined' && window.plus && window.plus.net && window.plus.net.XMLHttpRequest;
    if (isNativeApp) {
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
            if (systemText) anthropicBody.system = systemText;
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
                body: JSON.stringify(Object.assign({ model: api.model, messages: messages, stream: true }, getSamplerExtraBody(false))),
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
        let buffer = '', fullText = '', fullReasoning = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
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
            // 流式没解析出任何内容（比如接口返回格式和预期不一致）——兜底重新用非流式请求一次，避免直接"生成了个寂寞"
            const data = await callChatCompletionAPI(api, promptContent, 2, images);
            const text = (!data.error && data.choices?.[0]?.message?.content) || '';
            if (text) onDelta(text, true);
            return data;
        }
        // 思维链拼进正文最前面（跟非流式的两个分支保持同样的<think>包裹格式），交给下游统一的
        // extractLeadingReasoning/processReasoningInText 处理，折叠展示/直接删除都按当前设置来。
        const finalText = fullReasoning ? `<think>${fullReasoning}</think>${fullText}` : fullText;
        onDelta(finalText, true);
        return { choices: [{ message: { content: finalText } }] };
    } catch (e) {
        if (e.name === 'AbortError') return { aborted: true }; // 用户主动点了"取消"，不是真的报错，调用方要区分对待
        return { error: { message: enhanceNetworkErrorMessage(e.message) } };
    }
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
    const plain = stripHtmlKeepPlainText(raw);
    return escapeHtml(plain).replace(/\n/g, '<br>');
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
function processReasoningInText(text) {
    if (!text || typeof text !== 'string') return text;
    const { collapsedBlocks, rest } = stripLeadingReasoningBlocks(text);
    if (collapsedBlocks.length === 0) return text;
    return rest;
}

// 🐛 修复"评论/回帖里混入一整段思考过程"：部分模型（尤其没有走标准reasoning_content通道、只是被prompt
// 要求"想清楚再回答"的模型）会把整段思考过程原样写在最终回复前面，不带任何<think>之类的标签——这种情况
// stripLeadingReasoningBlocks 认不出来（它靠配置好的前后缀标签匹配），思考过程就会原样变成"回复正文"。
// 经验规律：这类文本里，模型思考完之后给出的真正答案几乎总是全文最后一段（往往就是一两句话），
// 前面大段的分析/草稿都在这段之前。这里只在明显超出预期字数（超过expectedMaxLen的2.5倍）时才生效，
// 退化成"只取最后一段"、把前面的思考过程扔掉；长度正常的普通回复完全不受影响，避免误伤。
function stripUndelimitedReasoningIfOverLength(text, expectedMaxLen) {
    if (!text) return text;
    // 优先用"正式输出标记"精确切割（如果模型遵循了prompt里的要求），比长度启发式准得多。
    const marked = extractAfterFinalMarker(text);
    if (marked !== text) return marked.trim();
    const t = String(text).trim();
    const limit = (typeof expectedMaxLen === 'number' && expectedMaxLen > 0) ? expectedMaxLen : 100;
    if (t.length <= limit * 2.5) return t;
    const paragraphs = t.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length <= 1) return t; // 没法按段落拆分，没有更好的办法，原样返回
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