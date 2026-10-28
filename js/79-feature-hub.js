/* ===========================================================================
   js/79 —— 🧩 小功能整理：分组标签 + 合并入口
   ---------------------------------------------------------------------------
   两种合并：
     ① 「家」：已经有一个像样页面的，把别的入口挂在它顶上一排（图库→相册、我们的日子、钱包、开场动画）
     ② 「合集」：没有现成的家的，做一个新入口，点进去上面一排标签，插件的面板直接显示在标签下面
        （插件用 X.panel 画面板，_common.js 里会先问 gyHubHost：正在合集里打开就画进合集，不另弹窗）
        内置的功能是整页的，标签下面放一张卡片「打开 ›」。
   你在「谷雨功能盘点」里选的 22 组都在下面 FOLDERS / HOSTS 里。
   被合进去的功能**一个都没删**：搜索照样搜得到；页面顶上有开关，关掉就回到原来平铺的样子。
   插件也可以在 X.mini 里带 cat:'陪伴' 之类自己归类。
   =========================================================================== */
(function () {
    'use strict';
    if (window.__gyFeatureHub) return; window.__gyFeatureHub = true;
    const K = 'gyHubOn';
    const on = () => { try { return localStorage.getItem(K) !== '0'; } catch (e) { return true; } };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const CATS = [['all', '全部'], ['陪伴', '💗 陪伴'], ['一起做', '🎈 一起做'], ['回忆', '📚 回忆'], ['生活', '🌆 生活']];
    const CAT = {
        gyxPet: '陪伴', gyxRadio: '陪伴', gyxWake: '陪伴', gyxNight: '陪伴', gyxHug: '陪伴', gyxDream: '陪伴', gyxDraft: '陪伴', gyxMakeup: '陪伴', gyxSecret: '陪伴', moodbook: '陪伴', period: '陪伴',
        music: '一起做', webMedia: '一起做', watch_together: '一起做', reading_together: '一起做', gyxStudy: '一起做', gyxCook: '一起做', gyxQuiz: '一起做', gyxGrow: '一起做', gyxJournal: '一起做', gyxWorld: '一起做', gyxTheater: '一起做', gyxGame: '一起做', gyxDoodle: '一起做',
        gallery: '回忆', days: '回忆', gyxCapsule: '回忆', emoticon: '回忆', relations: '回忆',
        map: '生活', mall: '生活', now: '生活', kit: '生活', gossip: '生活', grapevine: '生活', factionNetwork: '生活', npc: '生活', web_explore: '生活', gyxMystic: '生活', gyxLang: '陪伴', gyxNotes: '回忆'
    };
    // ① 家：挂在已有页面顶上的一排入口
    const HOSTS = [
        { host: 'gallery', name: '相册', kids: ['emoticon', 'charPhoto', 'gyxAlbum', 'gyxMoment', 'gyxMeme', 'gyxDuo', 'gyxAvatar'], at: () => document.querySelector('#gyGalleryBody') },
        { host: 'days', name: '我们的日子', kids: ['gyxAnniv', 'gyxBday', 'gyxFest'], at: () => { const m = document.querySelector('#gydayModal .gyday-box'); return m && m.children[1]; } },
        { host: 'wallet', name: '钱包', kids: ['gyxBook'], at: () => { const b = document.getElementById('upWalletBox'); return b && b.firstElementChild; } },
        { host: 'intro', name: '开场动画', kids: ['gyxIntro'], at: () => { const t = document.querySelector('.gymd-tabs'); return t && t.querySelector('span.on') && /开场/.test(t.querySelector('span.on').textContent) ? t.nextElementSibling : null; } }
    ];
    // 不是「小功能」但也要放进合集的内置东西（@ 开头）
    const curChar = () => { try { const L = (typeof myCharacters !== 'undefined' ? myCharacters : []).filter(c => c && !c.members); return L.find(c => String(c.id) === String(window.currentChatSessionId)) || L[0]; } catch (e) { return null; } };
    const PSEUDO = {
        '@inner': { icon: '💭', title: 'TA 的心声', desc: '心声、身体感受、情绪气泡、好感为什么变', open: () => window.gyInnerOpen((curChar() || {}).id), ok: () => typeof window.gyInnerOpen === 'function' },
        '@letters': { icon: '✉️', title: '信件与日记', desc: 'TA 寄来的信、TA 的日记', open: () => switchMainView('diary'), ok: () => typeof switchMainView === 'function' && !!document.getElementById('view-diary') },
        '@phone': { icon: '📱', title: 'TA 的手机', desc: '翻翻 TA 的手机：聊天、相册、备忘录、浏览记录', open: () => window.gyPhoneOpen((curChar() || {}).id), ok: () => typeof window.gyPhoneOpen === 'function' },
        '@allsw': { icon: '🎛️', title: '全部开关', desc: '谷雨所有开关在一页：搜索、一键预设', open: () => window.gyOpenAllSwitches(), ok: () => typeof window.gyOpenAllSwitches === 'function' }
    };
    // ② 合集
    const FOLDERS = [
        { id: 'hub_together', icon: '🎧', title: '一起听 · 看 · 读', desc: '一起阅读（一起听在网易云、一起看在抖音；把它们关了会回到这里）', cat: '一起做', kids: ['music', 'webMedia', 'watch_together', 'reading_together', 'gyxLive'] },
        { id: 'hub_rel', icon: '💞', title: '我们的关系', desc: '关系账本、心里和面上两层好感、关系四条线、等级、成就、反向攻略、我们的小习惯、TA 被你影响、TA 的成长日志', cat: '回忆', kids: ['relations', 'gyxDual', 'gyxAxes', 'gyxLevel', 'gyxBadge', 'gyxWoo', 'gyxRitual', 'gyxInfl', 'gyxEvolve'] },
        { id: 'hub_recap', icon: '📚', title: '回顾', desc: '手帐时间线、我们的书、星图、周报、回忆放映、TA 眼中的你、时光机、记忆潜行；多久总结一次你来定', cat: '回忆', kids: ['gyxRecapCfg', 'gyxHandbook', 'gyxOurBook', 'gyxStar', 'gyxWeekly', 'gyxReel', 'gyxEye', 'gyxTime', 'gyxDive'] },
        { id: 'hub_promise', icon: '🤙', title: '我们的约定', desc: '小约定、兑换券、恋爱审批、愿望清单、一百件小事', cat: '陪伴', kids: ['gyxPromise', 'gyxCoupon', 'gyxOA', 'gyxWish', 'gyx100'] },
        { id: 'hub_night', icon: '🌙', title: '早安晚安', desc: '早安简报、叫醒和哄睡、熬夜管家、睡前三件好事', cat: '陪伴', kids: ['gyxBrief', 'gyxWake', 'gyxNight', 'gyxGood'] },
        { id: 'hub_qa', icon: '💬', title: '问答', desc: '每日一问、默契问答、心电感应光谱、调查问卷、提问箱、TA 的人生选择题', cat: '一起做', kids: ['gyxDaily', 'gyxQuiz', 'gyxWave', 'gyxSurvey', 'gyxAskBox', 'gyxDilemma'] },
        { id: 'hub_letters', icon: '💌', title: '信', desc: '信件与日记、拆信、交换日记本、时间胶囊、有条件才能拆的信、明信片、漂流瓶', cat: '回忆', kids: ['@letters', 'gyxLetter', 'gyxJournal', 'gyxCapsule', 'gyxSeal', 'gyxPost', 'gyxBottle'] },
        { id: 'hub_home', icon: '🏠', title: '我们的小屋', desc: '小屋、随机掉落的收藏、一起养的小生命、存钱罐、TA 的旧物箱、窗台来客', cat: '回忆', kids: ['gyxHome', 'gyxDrop', 'gyxGrow', 'gyxJar', 'gyxBox', 'gyxSill'] },
        { id: 'hub_voice', icon: '🗣️', title: 'TA 怎么说话', desc: '相处模式、风格调料、平视、口头禅、听取模式（一句句听 TA 说）、你打了又删、你让 TA 重说了', cat: '陪伴', kids: ['gyxBond', 'gyxSpice', 'gyxFair', 'gyxEcho', 'gyxListen', 'gyxErase', 'gyxRegen'] },
        { id: 'hub_comfort', icon: '🫂', title: '哄', desc: '你不开心（抱抱）、TA 不开心（轮到你哄）、吵架了、秘密树洞', cat: '陪伴', kids: ['gyxHug', 'gyxCoax', 'gyxMakeup', 'gyxSecret'] },
        { id: 'hub_with', icon: '🚶', title: '陪你', desc: '散步、现实小任务、一起安静待着、做饭、自习、运动、旅行、TA 养你（反向养成）', cat: '一起做', kids: ['gyxWalk', 'gyxMis', 'gyxStill', 'gyxCook', 'gyxStudy', 'gyxCoach', 'gyxTrip', 'gyxCare'] },
        { id: 'hub_touch', icon: '💓', title: '贴贴', desc: '听心跳、摇一摇贴贴', cat: '陪伴', kids: ['gyxBeat', 'gyxShake'] },
        { id: 'hub_unsaid', icon: '🤐', title: 'TA 没说出口的', desc: '心声、TA 的往事、TA 的录像带、思维链收纳盒、草稿箱、情绪皮肤', cat: '陪伴', kids: ['@inner', 'gyxPast', 'gyxTapes', 'gyReasoningVault', 'gyxDraft', 'gyxMoodSkin'] },
        { id: 'hub_phone', icon: '📱', title: '小手机', desc: 'TA 的手机、备忘录、AI 小程序、来电（画面铃声、拒接理由、语音留言）、桌面小组件、桌面上的 TA、角标和分享', cat: '生活', kids: ['@phone', 'gyxMemo', 'gyxApps', 'gyxCall', 'gyxPhoneW', 'gyxPet', 'gyxPing'] },
        { id: 'hub_life', icon: '🧺', title: '生活', desc: '行程与天气、随身物、商城、装扮商店、经期记录、心情手账、生活小档案', cat: '生活', kids: ['map', 'kit', 'mall', 'gyxShop', 'period', 'moodbook', 'gyxNotes'] },
        { id: 'hub_people', icon: '👥', title: 'TA 身边的人', desc: '日常、关系网、NPC 列表、营销号自己爆料、准点群聊', cat: '生活', kids: ['grapevine', 'factionNetwork', 'npc', 'gyxScoop', 'gyxOnTime'] },
        { id: 'hub_gift', icon: '🎁', title: 'TA 给你的', desc: 'TA 的秘密计划、TA 的梦、涂鸦互传、占卜', cat: '陪伴', kids: ['gyxPlan', 'gyxDream', 'gyxDoodle', 'gyxMystic'] },
        { id: 'hub_alt', icon: '🪐', title: '换个世界玩', desc: '平行世界、换个世界、互换身份一天、番外隔离', cat: '一起做', kids: ['gyxWorld', 'gyxTheater', 'gyxSwap', 'gyxSide'] },
        { id: 'hub_chat', icon: '💭', title: '聊天细节', desc: '时间感知、内置提示词、总结滚雪球、外语和翻译、气泡表情回应', cat: '陪伴', kids: ['timePlace', 'promptLib', 'gyxRoll', 'gyxLang', 'gyxReact'] },
        { id: 'hub_soft', icon: '📱', title: '软件', desc: '微信、iMessage、微博、泡泡、小红书、豆瓣、网易云、抖音——整页的真软件界面；同一个人在每个软件里的主页都可以不一样', cat: '生活', kids: ['gysWechat', 'gysWeibo', 'gysBubble', 'gysRed', 'gysDouban', 'gysImsg', 'gysMusic', 'gysDouyin', 'gysUi'] },
        { id: 'hub_world', icon: '🌐', title: '外面的世界', desc: '此刻、联网探索、真实热搜、站内微博热搜榜——TA 知道外面在发生什么', cat: '生活', kids: ['now', 'web_explore', 'gyxHot', 'gyxHotList'] },
        { id: 'hub_look', icon: '🎨', title: '美化', desc: '气泡工坊、导入酒馆主题、日夜主题和动态壁纸、跟手返回', set: true, kids: ['gyxBubble', 'gyxStTheme', 'gyxDayNight', 'gyxSwipe'] },
        { id: 'hub_set', icon: '🎛️', title: '开关和后台', desc: '全部开关、插件开关中心、省电模式、文案不重样、生成中提示', set: true, kids: ['@allsw', 'gyxSwitch', 'gyxSaver', 'gyxVary', 'gyxGen'] },
        // ⚙️ 设置里那几样，小功能里也放一份（两边都能进）
        { id: 'hub_custom', icon: '⚙️', title: '个性化', desc: '皮肤、手机文件夹、TA 的声音、聊天统计、开场动画、美化、开关和后台（设置 → 🧰 功能设置里也有）', cat: '生活', kids: ['gySkinBox', 'folder', 'voice', 'chatstat', 'intro', 'hub_look', 'hub_set'] }
    ];
    // 直接不在小功能里出现的：八卦网（「日常」里已经有）；进了聊天 🎮 的游戏
    const HIDE0 = ['gossip'];
    // 🎵 10/28：音乐类都塞进网易云了（音乐盒 = 网易云「本地」，深夜电台 / 共享歌单 / 留声机 / TA写给你的歌 都在网易云里）——网易云开着就不单独出图标；把网易云关了它们会回来
    const MUSIC_IN = ['music', 'gyxRadio', 'gyxList', 'gyxSong', 'gyxTape'];
    const muOn = () => { try { return !!(window.GYS && window.GYS.APPS && window.GYS.APPS.music) && (!window.GYX || !window.GYX.on || window.GYX.on('gysMusic')); } catch (e) { return false; } };
    // 🎬 277：一起看（贴链接一起看、一起看电影）挪进了抖音首页顶上「一起看」——抖音和那一栏开着就不单独出图标
    const WATCH_IN = ['webMedia', 'watch_together'];
    const dyOn = () => { try { return !!(window.GYS && window.GYS.APPS && window.GYS.APPS.douyin) && (!window.GYX || !window.GYX.on || (window.GYX.on('gysDouyin') && window.GYX.on('gysDyWatch'))); } catch (e) { return false; } };
    const hideNow = () => HIDE0.concat(muOn() ? MUSIC_IN : [], dyOn() ? WATCH_IN : []);
    const HIDE = { forEach: f => hideNow().forEach(f), [Symbol.iterator]: function* () { yield* hideNow(); } };
    const GAME_IDS = ['gyxQuest', 'gyxHunt', 'gyxPick', 'gyxTrpg', 'gyxFish', 'gyxReal', 'gyxSeek', 'gyxLoop', 'gyxRoom', 'gyxFate', 'gyxSoup', 'gyxShow', 'gyxCase', 'gyxStuck', 'gyxWave'];
    // 设置类：从小功能挪到「设置 → 🧰 功能设置」
    const SET_IDS = ['voice', 'gySkinBox', 'chatstat', 'intro', 'folder', 'hub_look', 'hub_set'];

    const feats = () => (typeof GY_MINI_FEATURES !== 'undefined' ? GY_MINI_FEATURES : []);
    const featOf = id => feats().find(f => f.id === id);
    const memberOf = id => { if (id[0] === '@') { const p = PSEUDO[id]; try { return p && p.ok() ? Object.assign({ id }, p) : null; } catch (e) { return null; } } const f = featOf(id); return f ? { id, icon: f.icon, title: f.title, desc: f.desc, open: f.onOpen, plugin: /^gyx/.test(id) } : null; };
    const membersOf = F => { const h = new Set(HIDE); return F.kids.filter(k => !h.has(k)).map(memberOf).filter(Boolean); };
    const liveFolder = F => membersOf(F).length >= 2;     // 只剩一个的话就不套合集了，直接平铺
    const catOf = f => { const c = f.cat || CAT[f.id] || '生活'; return CATS.some(x => x[0] === c) ? c : '陪伴'; };
    const hiddenIds = () => {
        const s = new Set(HIDE);
        HOSTS.forEach(h => h.kids.forEach(k => s.add(k)));
        FOLDERS.forEach(F => { if (liveFolder(F)) F.kids.forEach(k => s.add(k)); });
        try { const G = typeof registeredMiniGames !== 'undefined' ? registeredMiniGames : []; GAME_IDS.forEach(k => { if (G.some(g => g.id === k)) s.add(k); }); } catch (e) {}
        return s;
    };
    let TAB = 'all';
    try { TAB = localStorage.getItem('gyHubTab') || 'all'; } catch (e) {}

    /* ---------- 合集登记进小功能 ---------- */
    function syncFolders() {
        if (typeof registerMiniFeature !== 'function') return;
        FOLDERS.forEach(F => {
            const live = on() && liveFolder(F), i = feats().findIndex(f => f.id === F.id);
            if (live && i < 0) registerMiniFeature({ id: F.id, icon: F.icon, title: F.title, desc: F.desc, cat: F.cat, hub: 1, onOpen: () => window.gyHubOpen(F.id) });
            if (!live && i >= 0) feats().splice(i, 1);
        });
    }

    /* ---------- 小功能页：分组标签 + 隐藏被合并 / 挪走的 ---------- */
    function wrapRender() {
        const r = window.renderMiniFeaturePanel;
        if (typeof r !== 'function' || r.__gyHub) return false;
        const w = function () {
            syncFolders();
            if (!on()) { const x = r.apply(this, arguments); bar(); return x; }
            const all = feats(), keep = all.slice(), hid = hiddenIds();
            const shown = all.filter(f => !hid.has(f.id) && !SET_IDS.includes(f.id) && !(FOLDERS.find(F => F.id === f.id) || {}).set && (TAB === 'all' || catOf(f) === TAB));
            all.length = 0; shown.forEach(f => all.push(f));
            let x; try { x = r.apply(this, arguments); } finally { all.length = 0; keep.forEach(f => all.push(f)); }
            bar(); return x;
        };
        Object.keys(r).forEach(k => { try { w[k] = r[k]; } catch (e) {} });
        w.__gyHub = true; window.renderMiniFeaturePanel = w; try { (0, eval)('renderMiniFeaturePanel = window.renderMiniFeaturePanel'); } catch (e) {}
        return true;
    }
    function bar() {
        const box = document.getElementById('miniFeatureList'); if (!box) return;
        let b = document.getElementById('gyHubBar'); if (b) b.remove();
        b = document.createElement('div'); b.id = 'gyHubBar';
        b.innerHTML = (on() ? `<div class="gyhub-tabs">${CATS.map(([k, n]) => `<span class="${TAB === k ? 'on' : ''}" onclick="gyHubTab('${k}')">${n}</span>`).join('')}</div>` : '')
            + `<label class="gyhub-sw"><input type="checkbox" ${on() ? 'checked' : ''} onchange="gyHubSet(this.checked)"> 整理过的样子（同类的合成一个入口、设置类挪去设置）；关掉＝原来平铺</label>`
            + (on() ? `<div class="gyhub-tip">同一类的合成了一个入口，点进去是一列，点哪个就直接打开哪个。照片类在 🖼️ 相册顶上；纪念日 / 生日在 📅 我们的日子；记账在钱包；🎮 文字冒险、寻宝、帮我选在聊天的游戏里；声音、皮肤、开场、🎛️ 开关和后台在 设置 →「功能设置」</div>` : '');
        box.insertBefore(b, box.firstChild);
    }
    window.gyHubTab = k => { TAB = k; try { localStorage.setItem('gyHubTab', k); } catch (e) {} if (typeof renderMiniFeaturePanel === 'function') renderMiniFeaturePanel(); };
    window.gyHubSet = v => { try { localStorage.setItem(K, v ? '1' : '0'); } catch (e) {} syncFolders(); if (typeof renderMiniFeaturePanel === 'function') renderMiniFeaturePanel(); setEntries(); rename(); };

    /* ---------- 合集页 ---------- */
    let HUB = null;                // { F, tab, body, claim: Set, cap: 时间戳 }
    const lastTab = id => { try { return localStorage.getItem('gyHubLast_' + id) || ''; } catch (e) { return ''; } };
    // v245：点进合集先是一列（竖着排，图标 + 名字 + 一句话）；点哪一行就直接打开那个功能——
    //       插件的面板画在合集里（顶上有「‹ 返回」回到这一列），谷雨自带的整页功能直接跳过去，不再多一张「打开 ›」卡片。
    //       gyHubOpen(合集id) ＝ 打开那一列；gyHubOpen(合集id, 成员id) ＝ 直接打开那一个（指南「去看看」、通知用）。
    window.gyHubHiddenIds = () => on() ? hiddenIds() : new Set();
    // 小手机「每个功能一个图标」用：真的不要出现的（八卦网，「日常」里已经有）、合集里那几个 @ 开头的内置东西
    window.gyHubHideIds = () => new Set(HIDE);
    window.gyHubPseudo = () => { const out = []; FOLDERS.forEach(F => F.kids.forEach(k => { if (k[0] !== '@' || out.some(o => o.id === k)) return; const m = memberOf(k); if (m) out.push({ id: k, fid: F.id, icon: m.icon, title: m.title }); })); return out; };
    window.gyHubOpen = function (fid, tab) {
        const F = FOLDERS.find(x => x.id === fid); if (!F) return;
        if (F.open && !tab) { try { if (F.open()) return; } catch (e) {} }   // 自己有一整页的合集（📱 软件 = 手机桌面）
        const M = membersOf(F); if (!M.length) return;
        const m = tab ? M.find(x => x.id === tab) : null;
        // 谷雨自带的整页功能：直接打开，不经过合集
        if (m && !m.plugin) { window.gyHubLaunch(m.id); return; }
        let ov = document.getElementById('gyHubOv');
        if (!ov || !HUB || HUB.F !== F || getComputedStyle(ov).display === 'none') {
            if (ov) ov.remove();
            ov = document.createElement('div'); ov.id = 'gyHubOv'; ov.className = 'gyhb-ov'; ov.setAttribute('data-gy-overlay', '1'); ov.setAttribute('data-gy-page', '1');   // 合集一律当一整页
            ov.innerHTML = `<div class="gyhb-box"><div class="gyhb-hd"><span class="gyhb-back" onclick="gyHubBack()" style="display:none">‹</span><b class="gyhb-ttl"></b><span class="gyhb-x" onclick="gyHubClose()">✕</span></div><div class="gyhb-body" id="gyHubBody"></div></div>`;
            ov.addEventListener('click', e => { if (e.target === ov) window.gyHubClose(); });
            document.body.appendChild(ov);
            HUB = { F, tab: null, body: ov.querySelector('#gyHubBody'), claim: new Map(), quiet: 0 };
            // 插件自己把面板关了（比如点了「去聊天」）＝整个合集一起关，跟原来单独打开时一样
            new MutationObserver(ms => {
                if (!HUB || HUB.quiet) return;
                ms.forEach(mm => mm.removedNodes.forEach(n => { if (n.nodeType === 1 && !n.__gyHubGone && HUB && HUB.claim.has(n.id) && !n.isConnected) window.gyHubClose(); }));
            }).observe(HUB.body, { childList: true });
        }
        const ttl = ov.querySelector('.gyhb-ttl'), back = ov.querySelector('.gyhb-back');
        clearBody();
        if (!m) {
            // 一列
            HUB.tab = null;
            ttl.textContent = `${F.icon} ${F.title}`; back.style.display = 'none';
            HUB.body.innerHTML = `<div class="gyhb-list">${M.map(x => `<button type="button" class="gyhb-row" onclick="gyHubOpen('${F.id}','${x.id}')">
                <span class="gyhb-ri">${x.icon || '🧩'}</span><span class="gyhb-rm"><b>${esc(x.title)}</b>${x.desc ? `<em>${esc(x.desc)}</em>` : ''}</span><span class="gyhb-ra">›</span></button>`).join('')}</div>`;
            try { const b = ov.querySelector('.gyhb-box'); if (b) b.scrollTop = 0; } catch (e) {}
            return;
        }
        // 打开插件那一项：面板画进合集
        HUB.tab = m.id; try { localStorage.setItem('gyHubLast_' + fid, m.id); } catch (e) {}
        ttl.textContent = `${m.icon || '🧩'} ${m.title}`; back.style.display = '';
        HUB.cap = Date.now();
        try { const r = m.open(); if (r && r.then) r.then(() => { if (HUB) HUB.cap = 0; }, () => { if (HUB) HUB.cap = 0; }); } catch (e) { console.warn('[合集] 打开出错：', e); }
        setTimeout(() => {
            if (!HUB) return;
            if (HUB.cap && Date.now() - HUB.cap >= 1400) HUB.cap = 0;
            // 这个插件没往合集里画（自己开了整页 / 弹窗）：合集退回一列，别留一块空白
            if (!HUB.body.children.length && HUB.tab === m.id) window.gyHubOpen(F.id);
        }, 1500);
    };
    window.gyHubBack = function () { if (HUB) window.gyHubOpen(HUB.F.id); };
    // 我们自己清掉的（换标签、重画）先做个记号，观察者看到就不当成「插件把自己关了」
    function clearBody() { if (!HUB) return; [...HUB.body.children].forEach(c => { c.__gyHubGone = 1; }); HUB.body.innerHTML = ''; }
    window.gyHubLaunch = function (mid) {
        const m = memberOf(mid); window.gyHubClose(); if (m) try { m.open(); } catch (e) { console.warn(e); }
    };
    window.gyHubClose = function () { const ov = document.getElementById('gyHubOv'); HUB = null; if (ov) ov.remove(); };
    // 给 _common.js 的 X.panel 用：这个面板要不要画进合集？要的话返回容器
    window.gyHubHost = function (id) {
        const ov = document.getElementById('gyHubOv');
        if (!HUB || !HUB.body.isConnected || !ov || getComputedStyle(ov).display === 'none') { HUB = null; return null; }   // 合集被返回键藏起来了：不往里画
        const capturing = HUB.cap && Date.now() - HUB.cap < 1400;
        const mine = HUB.claim.get(id) === HUB.tab;
        if (!capturing && !mine) return null;
        if (capturing) { HUB.cap = 0; HUB.claim.set(id, HUB.tab); }
        clearBody();
        try { const b = ov.querySelector('.gyp-box') || ov.querySelector('.gyhb-box'); if (b && capturing) b.scrollTop = 0; } catch (e) {}
        return HUB.body;
    };
    window.gyHubFolders = () => FOLDERS.map(F => ({ id: F.id, title: F.title, kids: F.kids, live: liveFolder(F), members: membersOf(F).map(m => m.id) }));

    /* ---------- 「家」里的入口条 ---------- */
    function chips() {
        if (!on()) { document.querySelectorAll('.gyhub-in').forEach(e => e.remove()); return; }
        HOSTS.forEach(h => {
            const at = h.at(); if (!at || !at.parentNode) return;
            const kids = h.kids.map(featOf).filter(Boolean);
            const cur = at.parentNode.querySelector(':scope > .gyhub-in');
            if (!kids.length) { if (cur) cur.remove(); return; }
            const sig = kids.map(k => k.id).join(',');
            if (cur && cur.dataset.sig === sig) return;
            if (cur) cur.remove();
            const d = document.createElement('div'); d.className = 'gyhub-in'; d.dataset.sig = sig;
            d.innerHTML = `<em>${h.host === 'intro' ? '更多开场' : '这里也有'}</em>` + kids.map(k => `<button type="button" onclick="gyOpenMiniFeature('${k.id}')">${k.icon || '🧩'} ${esc(k.title)}</button>`).join('');
            at.parentNode.insertBefore(d, at);
        });
    }
    // 改名：「日子」→「我们的日子」、「图库」→「相册」
    const RENAME = { days: ['我们的日子', '认识第几天、纪念日、生日——还有纪念日惊喜、给 TA 过生日'], gallery: ['相册', '图库、表情包、角色发图片、TA 的相册、表情包工坊、合照、情侣头像——图片都在这一个地方'] };
    function rename() {
        Object.keys(RENAME).forEach(id => {
            const f = featOf(id); if (!f) return;
            if (on() && f.title !== RENAME[id][0]) { f.__t = f.title; f.__d = f.desc; f.title = RENAME[id][0]; f.desc = RENAME[id][1]; }
            if (!on() && f.__t) { f.title = f.__t; f.desc = f.__d; delete f.__t; delete f.__d; }
        });
        const hd = document.querySelector('#gydayModal .gyday-hd'); if (hd && hd.firstChild && hd.firstChild.nodeType === 3) { const want = on() ? '📅 我们的日子' : '📅 日子'; if (hd.firstChild.textContent !== want) hd.firstChild.textContent = want; }
    }
    /* ---------- 设置目录：🧰 功能设置 ---------- */
    function setEntries() {
        const menu = document.querySelector('#setIndex .set-menu'); if (!menu) return;
        menu.querySelectorAll('[data-gyhub]').forEach(e => e.remove());
        if (!on()) return;
        const L = SET_IDS.map(featOf).filter(Boolean); if (!L.length) return;
        const sep = document.createElement('div'); sep.className = 'set-menu-sep'; sep.dataset.gyhub = '1'; sep.textContent = '🧰 功能设置（从小功能挪过来的设置类）';
        menu.appendChild(sep);
        L.forEach(f => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'set-entry'; b.dataset.core = '1'; b.dataset.gyhub = '1';
            b.innerHTML = `<span class="set-entry-ico">${f.icon || '🧩'}</span><span class="set-entry-main"><span class="set-entry-title">${esc(f.title)}</span><span class="set-entry-desc">${esc(f.desc || '')}</span></span><span class="set-entry-arrow">›</span>`;
            b.onclick = () => window.gyOpenMiniFeature(f.id);
            menu.appendChild(b);
        });
    }
    /* ---------- 插件合并：装了合并版，就把旧的单个插件从列表里拿掉（数据不动）；不要了的两个也拿掉 ---------- */
    const BUN = /*GYX_BUNDLES*/{"bundles": {"🖼️ 相册里的插件": [["📸 TA的相册", ["gyxAlbum"]], ["🎨 表情包工坊", ["gyxMeme"]], ["📸 和TA合照", ["gyxDuo"]], ["💑 情侣头像", ["gyxAvatar"]], ["📸 同一秒", ["gyxMoment"]]], "💞 我们的关系": [["💞 好感两层", ["gyxDual"]], ["📊 关系四条线", ["gyxAxes"]], ["📈 我们的等级", ["gyxLevel"]], ["🏅 我们的成就", ["gyxBadge"]], ["🎯 反向攻略", ["gyxWoo"]], ["🔁 我们的小习惯", ["gyxRitual"]], ["🎁 TA的秘密计划", ["gyxPlan"]], ["📜 TA的往事", ["gyxPast"]], ["🪴 TA的成长日志", ["gyxEvolve"]], ["📼 TA的录像带", ["gyxTapes"]]], "📚 回顾": [["📒 手帐时间线", ["gyxHandbook"]], ["📖 我们的书", ["gyxOurBook"]], ["✨ 我们的星图", ["gyxStar"]], ["🗞️ 我们的周报", ["gyxWeekly"]], ["🎞️ 回忆放映", ["gyxReel"]], ["👀 TA眼中的你", ["gyxEye"]], ["⏳ 时光机", ["gyxTime"]], ["🕹️ 记忆潜行", ["gyxDive"]]], "🎉 纪念日和生日": [["🎉 纪念日惊喜", ["gyxAnniv"]], ["🎂 给TA过生日", ["gyxBday"]], ["🏮 一起过节", ["gyxFest"]]], "🤙 我们的约定": [["🤙 小约定", ["gyxPromise"]], ["🎟️ 兑换券", ["gyxCoupon"]], ["🧾 恋爱审批", ["gyxOA"]], ["🎁 愿望清单", ["gyxWish"]], ["💯 一百件小事", ["gyx100"]]], "🌙 早安晚安": [["☀️ 早安简报", ["gyxBrief"]], ["⏰🌙 叫醒与哄睡", ["gyxWake"]], ["🌙 熬夜管家", ["gyxNight"]], ["🕯️ 睡前三件好事", ["gyxGood"]]], "💬 问答": [["🌅 每日一问", ["gyxDaily"]], ["💞 默契问答", ["gyxQuiz"]], ["📋 调查问卷", ["gyxSurvey"]], ["📮 提问箱", ["gyxAskBox"]], ["🗳️ TA的人生选择题", ["gyxDilemma"]], ["📡 心电感应光谱", ["gyxWave"]]], "🎮 游戏": [["🎮 一起玩", ["gyxGame"]], ["🧭 文字冒险", ["gyxQuest"]], ["🗺️ TA布置的寻宝", ["gyxHunt"]], ["🎡 帮我选", ["gyxPick"]], ["🎲 跑团", ["gyxTrpg"]], ["🎣 一起钓鱼", ["gyxFish"]], ["📍 现实捉迷藏", ["gyxSeek"]], ["🔁 时间循环", ["gyxLoop"]], ["🗝️ 双人密室", ["gyxRoom"]], ["🃏 命运卡牌", ["gyxFate"]], ["🆘 TA被困了", ["gyxStuck"]]], "🕵️ 推理和综艺": [["🎭 谁是真的TA", ["gyxReal"]], ["🐢 海龟汤", ["gyxSoup"]], ["🔍 剧本杀", ["gyxCase"]], ["💘 我们的恋综", ["gyxShow"]]], "📰 主页和社交": [["📰 营销号自己爆料", ["gyxScoop"]], ["🔥 微博热搜榜", ["gyxHotList"]], ["⏰ 准点群聊", ["gyxOnTime"]]], "💌 信": [["💌 拆信仪式", ["gyxLetter"]], ["📓 交换日记本", ["gyxJournal"]], ["⏳ 时间胶囊", ["gyxCapsule"]], ["🏞️ 明信片墙", ["gyxPost"]], ["🍾 漂流瓶", ["gyxBottle"]], ["💌 有条件才能拆的信", ["gyxSeal"]]], "🏠 我们的小屋": [["🏠 我们的小屋", ["gyxHome"]], ["🧊 3D小屋", ["gyx3dRoom"]], ["🍁 随机掉落收藏册", ["gyxDrop"]], ["🌱 一起养小生命", ["gyxGrow"]], ["🐷 一起存钱罐", ["gyxJar"]], ["📦 TA的旧物箱", ["gyxBox"]], ["🪟 窗台来客", ["gyxSill"]]], "🗣️ TA怎么说话": [["🫂 相处模式", ["gyxBond"]], ["🧂 风格调料", ["gyxSpice"]], ["🛡️ 平视", ["gyxFair"]], ["🗣️ 口头禅传染", ["gyxEcho"]], ["🎬 听取模式", ["gyxListen"]], ["🌱 TA被你影响", ["gyxInfl"]], ["⌨️ 你打了又删", ["gyxErase"]], ["🔁 你让TA重说了", ["gyxRegen"]], ["🛡️ 别把她写弱", ["gyxFair"]]], "🫂 哄": [["🫂 抱抱", ["gyxHug"]], ["🥺 轮到你哄TA", ["gyxCoax"]], ["🌧️ 吵架和好", ["gyxMakeup"]], ["🌳 秘密树洞", ["gyxSecret"]]], "🚶 陪你": [["🚶 陪你散步", ["gyxWalk"]], ["🍳 一起做饭", ["gyxCook"]], ["📚 一起自习室", ["gyxStudy"]], ["🏃 TA是你的私教", ["gyxCoach"]], ["✈️ 一起旅行", ["gyxTrip"]], ["📮 现实小任务", ["gyxMis"]], ["🕯️ 一起安静待着", ["gyxStill"]]], "💓 贴贴": [["💓 听心跳", ["gyxBeat"]], ["📳 摇一摇贴贴", ["gyxShake"]]], "🎛️ 开关和后台": [["🎛️ 功能开关中心", ["gyxSwitch", "gyxWebInvite", "gyxMystic"]], ["🔋 省电模式", ["gyxSaver"]], ["💬 文案不重样", ["gyxVary"]], ["⏳ 生成中提示", ["gyxGen"]]], "📱 小手机": [["📝 TA的备忘录", ["gyxMemo"]], ["🧩 AI小程序", ["gyxApps"]], ["📞 来电", ["gyxRing", "gyxCallPlus"]], ["📲 手机桌面小组件", ["gyxPhoneW"]], ["🧸 桌面上的TA", ["gyxPet"]], ["🧊 3D小人", ["gyx3d", "gyx3dPage"]], ["📤 角标和分享", ["gyxPing"]], ["📞 来电动画和铃声", ["gyxRing", "gyxCallPlus"]], ["📞 来电增强", ["gyxRing", "gyxCallPlus"]]], "🎨 美化": [["🫧 气泡工坊", ["gyxBubble"]], ["🎨 酒馆主题", ["gyxStTheme"]], ["🌗 日夜主题", ["gyxDayNight"]], ["👉 跟手返回", ["gyxSwipe"]], ["🛍️ 装扮商店", ["gyxShop"]]]}, "retired": ["📺 追剧进度", "🔐 我们的暗号", "📱 软件全家桶", "🧣 微博", "🫧 泡泡", "📕 小红书", "🫘 豆瓣", "💬 iMessage", "📲 真手机", "🎵 网易云", "🎵 网易云音乐", "🎶 抖音", "💚 微信", "📺 直播间", "📻 深夜电台", "🎶 共享歌单", "📼 留声机", "🎵 TA写给你的歌"]}/*END*/;
    function prune(boot) {
        try {
            if (typeof plugins === 'undefined' || !Array.isArray(plugins) || !plugins.length) return 0;
            const nm = p => String(p && p.name || '').trim(), has = new Set(plugins.map(nm));
            const drop = new Map();   // 旧名 → 合并版名
            Object.keys(BUN.bundles || {}).forEach(b => { if (!has.has(b)) return; BUN.bundles[b].forEach(([o, fids]) => { if (o !== b && has.has(o)) drop.set(o, { b, fids }); }); });
            (BUN.retired || []).forEach(o => { if (has.has(o)) drop.set(o, { b: '' }); });
            if (!drop.size) return 0;
            let FS = {}; try { FS = JSON.parse(localStorage.getItem('gyxFeat') || '{}') || {}; } catch (e) {}
            for (let i = plugins.length - 1; i >= 0; i--) {
                const d = drop.get(nm(plugins[i])); if (!d) continue;
                if (plugins[i].enabled === false && d.fids) d.fids.forEach(f => { FS[f] = false; });   // 你原来关着的，合并后那一项也关着
                plugins.splice(i, 1);
            }
            try { localStorage.setItem('gyxFeat', JSON.stringify(FS)); } catch (e) {}
            try { saveAllData(); } catch (e) {}
            try { if (typeof renderPluginsList === 'function') renderPluginsList(); } catch (e) {}
            if (!boot) {
                const n = drop.size, old = [...drop.keys()].filter(o => !drop.get(o).b), merged = n - old.length;
                try { showToast('', '🧩', (merged ? `合并版装好了，拿掉了旧的 ${merged} 个单独插件` : '') + (old.length ? `${merged ? '；' : ''}${old.join('、')} 已经不要了` : '') + '——刷新一下就换成新的（数据都还在）', null, null, false); } catch (e) {}
            }
            return drop.size;
        } catch (e) { return 0; }
    }
    window.gyHubPrune = prune;
    window.__gyHubBundles = BUN;   // js/94 客服体检用：看新旧版是不是同时装着
    (function hookBoot() {
        const f = window.runPluginOnLoadHooks;
        if (typeof f !== 'function' || f.__gyPrune) return;
        const w = function () { prune(true); return f.apply(this, arguments); };
        Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__gyPrune = true;
        window.runPluginOnLoadHooks = w; try { (0, eval)('runPluginOnLoadHooks = window.runPluginOnLoadHooks'); } catch (e) {}
    })();

    let lastSig = '';
    function tick() {
        if (window.__guyuBooted) prune(false);
        syncFolders(); wrapRender(); chips(); rename();
        const sig = on() + ':' + SET_IDS.filter(featOf).join(',');
        if (sig !== lastSig || !document.querySelector('#setIndex [data-gyhub]') === on()) { lastSig = sig; setEntries(); }
    }
    const css = document.createElement('style'); css.textContent = `
#gyHubBar{margin-bottom:10px}.gyhub-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.gyhub-tabs span{padding:6px 13px;border-radius:999px;background:rgba(128,128,128,.12);font-size:13px;cursor:pointer}.gyhub-tabs span.on{background:#1d9bf0;color:#fff}
.gyhub-sw{display:block;font-size:12px;color:#8b98a5;margin:4px 0}.gyhub-tip{font-size:11.5px;color:#8b98a5;line-height:1.7;margin:2px 0 6px}
.gyhub-in{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0 10px;padding:8px 10px;border-radius:14px;background:rgba(29,155,240,.07)}.gyhub-in em{font-style:normal;font-size:12px;color:#8b98a5;margin-right:2px}
.gyhub-in button{border:1px solid rgba(128,128,128,.25);background:rgba(255,255,255,.7);color:inherit;border-radius:999px;padding:5px 11px;font-size:12.5px;cursor:pointer;font-family:inherit}.gyhub-in button:hover{border-color:#1d9bf0;color:#1d9bf0}
.gyhb-ov{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.32);display:flex;align-items:center;justify-content:center;padding:14px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Microsoft YaHei",sans-serif}
.gyhb-box{background:#fff;color:#1d1d1f;border-radius:22px;width:min(600px,100%);max-height:92vh;overflow:auto;box-sizing:border-box;box-shadow:0 24px 60px rgba(0,0,0,.2)}
.gyhb-hd{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:8px;padding:14px 18px 10px;font-size:17px;background:rgba(255,255,255,.94);backdrop-filter:blur(12px)}.gyhb-ttl{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gyhb-x{cursor:pointer;color:#999;padding:2px 6px}.gyhb-back{cursor:pointer;font-size:24px;line-height:1;color:#1d9bf0;padding:0 8px 2px 0}
.gyhb-list{display:flex;flex-direction:column;padding:2px 12px 16px}.gyhb-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:none;background:transparent;color:inherit;font-family:inherit;padding:12px 8px;border-radius:14px;cursor:pointer;border-bottom:1px solid rgba(128,128,128,.12)}.gyhb-row:last-child{border-bottom:none}.gyhb-row:hover,.gyhb-row:active{background:rgba(128,128,128,.08)}.gyhb-ri{flex:0 0 40px;height:40px;border-radius:12px;background:#f2f2f4;display:flex;align-items:center;justify-content:center;font-size:21px}.gyhb-rm{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}.gyhb-rm b{font-size:15px;font-weight:600}.gyhb-rm em{font-style:normal;font-size:12.5px;color:#8e8e93;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.gyhb-ra{flex:0 0 auto;color:#c7c7cc;font-size:20px}
body.dark-theme .gyhb-box{background:#16181c;color:#e7e9ea}body.dark-theme .gyhb-hd{background:rgba(22,24,28,.94)}body.dark-theme .gyhb-ri{background:#2f3336}
.gyhb-tabs{position:sticky;top:0;z-index:3;display:flex;gap:6px;overflow-x:auto;padding:6px 18px 10px;background:rgba(255,255,255,.94);backdrop-filter:blur(12px);scrollbar-width:none}.gyhb-tabs::-webkit-scrollbar{display:none}
.gyhb-tabs button{flex:none;border:none;background:#f2f2f4;color:#1d1d1f;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer;font-family:inherit;white-space:nowrap}.gyhb-tabs button.on{background:#1d1d1f;color:#fff}
.gyhb-tabs button:focus-visible,.gyhb-go:focus-visible{outline:2px solid #1d9bf0;outline-offset:2px}
.gyhb-body{min-height:120px}
.gyhb-body .gyx-inhub>.gyx-box{width:auto;max-height:none;overflow:visible;box-shadow:none;border-radius:0;background:transparent;color:inherit}
.gyhb-card{text-align:center;padding:26px 22px 30px}.gyhb-card .gyhb-ci{font-size:40px;line-height:1.2}.gyhb-card b{display:block;font-size:16px;margin:6px 0 4px}.gyhb-card p{margin:0 auto 14px;max-width:34em;font-size:13px;color:#8e8e93;line-height:1.7}
.gyhb-go{padding:9px 18px;border-radius:14px;border:none;background:#1d1d1f;color:#fff;cursor:pointer;font-family:inherit;font-size:14px}`;
    document.head.appendChild(css);
    window.gyHubInfo = () => ({ on: on(), HOSTS: HOSTS.map(h => ({ host: h.host, kids: h.kids })), FOLDERS: window.gyHubFolders(), SET_IDS, CAT, HIDE: [...HIDE] });
    tick(); setInterval(tick, 800);
})();
