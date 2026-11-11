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
        map: '生活', mall: '生活', now: '生活', kit: '生活', gossip: '生活', grapevine: '生活', factionNetwork: '生活', npc: '生活', web_explore: '生活', gyxMystic: '生活', gyxLang: '陪伴', gyxNotes: '回忆',
        hub_us: '回忆', hub_with: '陪伴', hub_ta: '陪伴', gameHall: '一起做', hub_life: '生活', hub_world: '生活', hub_soft: '生活'   // 283：8 个入口在「原来一列」里的分组
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
        '@play': { icon: '🧩', title: '新玩法', desc: '都在谷雨里了，不用导入插件；不想要哪个在这里关', open: () => window.gyPlayPage(), ok: () => !!window.__gyPlayBuiltin && typeof window.gyPlayPage === 'function' },
        '@allsw': { icon: '🎛️', title: '全部开关', desc: '谷雨所有开关在一页：搜索、一键预设', open: () => window.gyOpenAllSwitches(), ok: () => typeof window.gyOpenAllSwitches === 'function' }
    };
    // ② 合集
    // 283：小功能首页只剩 8 个入口（我们 / 陪你 / TA 的 / 游戏 / 生活 / 世界 / 软件 / 相册），
    //      每个入口里分几页（pages），顶上标签切页，一页里每个功能一张卡片。
    //      平时在后台起作用的（TA 的性格、记忆、时间感知……）挪去 设置 → 💬 聊天；美化、开关挪去 设置 → ⚙️ 个性化。
    const pg = (title, icon, kids) => ({ id: 'p_' + title, title, icon, kids });
    const FOLDERS = [
        { id: 'hub_us', icon: '💞', title: '我们', color: ['#ff6b8a', '#ff2d55'], desc: '关系、约定和愿望、日子、回顾', pages: [
            pg('关系', '💞', ['relations', 'gyxDual', 'gyxAxes', 'gyxLevel', 'gyxBadge', 'gyxWoo', 'gyxRitual']),
            pg('约定和愿望', '🤙', ['gyxPromise', 'gyxCoupon', 'gyxOA', 'gyxWish', 'gyx100']),
            pg('日子', '📅', ['days', 'gyxAnniv', 'gyxBday', 'gyxFest']),
            pg('回顾', '📚', ['gyxHandbook', 'gyxWeekly', 'gyxOurBook', 'gyxStar', 'gyxReel', 'gyxTime', 'gyxEye', 'gyxDive', 'gyxRecapCfg'])] },
        { id: 'hub_with', icon: '🚶', title: '陪你', color: ['#4cd964', '#2fa84f'], desc: '一起做、早晚、哄、贴贴和安静待着', pages: [
            pg('一起做', '🚶', ['gyxWalk', 'gyxStudy', 'gyxCook', 'gyxCoach', 'gyxTrip', 'gyxMis', 'reading_together']),
            pg('早晚', '🌅', ['gyxBrief', 'gyxWake', 'gyxNight', 'gyxGood']),
            pg('哄', '🫂', ['gyxHug', 'gyxCoax', 'gyxMakeup', 'gyxSecret']),
            pg('贴贴和安静', '💓', ['gyxBeat', 'gyxShake', 'gyxStill'])] },
        { id: 'hub_ta', icon: '💌', title: 'TA 的', color: ['#c27cf0', '#8e44ad'], desc: '信箱、问答、TA 给你的、TA 没说出口的', pages: [
            pg('信箱', '💌', ['@letters', 'gyxLetter', 'gyxSeal', 'gyxCapsule', 'gyxPost', 'gyxBottle', 'gyxJournal']),
            pg('问答', '💬', ['gyxDaily', 'gyxAskBox', 'gyxSurvey', 'gyxQuiz', 'gyxWave', 'gyxDilemma']),
            pg('TA 给你的', '🎁', ['gyxPlan', 'gyxDream', 'gyxDoodle', 'gyxMystic']),
            pg('没说出口的', '🤐', ['@inner', '@phone', 'gyxMemo', 'gyxPast', 'gyxTapes', 'gyReasoningVault', 'gyxDraft', 'gyxErase', 'gyxRegen'])] },
        { id: 'hub_life', icon: '🏠', title: '生活', color: ['#feca57', '#f39c12'], desc: '小屋、收藏、钱和商城、记录', pages: [
            pg('小屋', '🏠', ['gyxHome', 'gyx3dRoom', 'gyxGrow']),
            pg('收藏', '🍁', ['gyxDrop', 'gyxBox', 'gyxSill']),
            pg('钱和商城', '💰', ['gysPdd', 'gyxBook', 'gyxJar', 'mall', 'gyxShop']),
            pg('记录', '📔', ['map', 'kit', 'period', 'moodbook', 'gyxCare'])] },
        { id: 'hub_world', icon: '🌐', title: '世界', color: ['#48dbfb', '#0abde3'], desc: '身边的人、外面、换个世界', pages: [
            pg('身边的人', '👥', ['grapevine', 'factionNetwork', 'npc', 'gyxScoop', 'gyxOnTime']),
            pg('外面', '🌐', ['now', 'web_explore', 'gyxWeather', 'gyxHot', 'gyxHotList']),
            pg('换个世界', '🪐', ['gyxWorld', 'gyxTheater', 'gyxSwap', 'gyxSide'])] },
        { id: 'hub_soft', color: ['#576574', '#222f3e'], icon: '📱', title: '软件', desc: '微信、iMessage、微博、泡泡、小红书、豆瓣、网易云、抖音、拼多多、社区——整页的真软件界面；同一个人在每个软件里的主页都可以不一样', cat: '生活', kids: ['gysWechat', 'gysWeibo', 'gysBubble', 'gysRed', 'gysDouban', 'gysImsg', 'gysMusic', 'gysDouyin', 'gysPdd', 'gyComm', 'gyxApps'] },   // 287：云端备份、软件外观（苹果样子）她说去掉
        // ⚙️ 设置里的（不在小功能首页）
        { id: 'hub_chatset', icon: '💬', title: '聊天', set: true, desc: 'TA 的性格、TA 在变、听和看、记忆', pages: [
            pg('TA 的性格', '🫂', ['gyxBond', 'gyxSpice', 'gyxFair']),
            pg('TA 在变', '🌱', ['gyxEcho', 'gyxInfl', 'gyxEvolve']),
            pg('听和看', '🎬', ['gyxListen', 'timePlace', 'gyxLang', 'gyxReact']),
            pg('记忆', '❄️', ['gyxRoll', 'gyxNotes', 'promptLib'])] },
        { id: 'hub_custom', icon: '⚙️', title: '个性化', set: true, desc: '美化、小手机、声音和文件、开关和后台', pages: [
            pg('美化', '🎨', ['gySkinBox', 'gyxBubble', 'gyxStTheme', 'gyxDayNight', 'gyxMoodSkin', 'charSprite', 'gyxSwipe', 'intro']),
            pg('小手机', '📱', ['gyxPhoneW', 'gyxPet', 'gyx3d', 'gyx3dVoice', 'gyxCall', 'gyxPing']),
            pg('声音和文件', '🎙️', ['voice', 'folder', 'chatstat']),
            pg('开关和后台', '🎛️', ['@allsw', 'gyxSwitch', 'gyxSaver', 'gyxVary', 'gyxGen'])] }
    ];
    FOLDERS.forEach(F => { if (F.pages) F.kids = [].concat(...F.pages.map(p => p.kids)); });
    // 以前的合集 id（使用指南「去看看」、通知、老测试会用）→ 现在在哪个入口的哪一页
    const ALIAS = { hub_rel: ['hub_us', 'p_关系'], hub_promise: ['hub_us', 'p_约定和愿望'], hub_recap: ['hub_us', 'p_回顾'], hub_night: ['hub_with', 'p_早晚'], hub_comfort: ['hub_with', 'p_哄'], hub_touch: ['hub_with', 'p_贴贴和安静'],
        hub_letters: ['hub_ta', 'p_信箱'], hub_qa: ['hub_ta', 'p_问答'], hub_gift: ['hub_ta', 'p_TA 给你的'], hub_unsaid: ['hub_ta', 'p_没说出口的'], hub_home: ['hub_life', 'p_小屋'],
        hub_people: ['hub_world', 'p_身边的人'], hub_alt: ['hub_world', 'p_换个世界'], hub_voice: ['hub_chatset', 'p_TA 的性格'], hub_chat: ['hub_chatset', 'p_听和看'], hub_together: ['hub_with', 'p_一起做'],
        hub_look: ['hub_custom', 'p_美化'], hub_set: ['hub_custom', 'p_开关和后台'], hub_phone: ['hub_custom', 'p_小手机'] };
    // 首页 8 个入口的顺序（gameHall = 游戏厅，gallery = 相册：本来就是一整页）
    const HOME = ['hub_us', 'hub_with', 'hub_ta', 'gameHall', 'hub_life', 'hub_world', 'gallery'];   // 287：软件不再是一个合集，每个软件直接在首页下面一排图标
    const APP_COLOR = { gysWechat: ['#2dc100', '#07a35a'], gysImsg: ['#5ac8fa', '#007aff'], gysWeibo: ['#ff9500', '#e6162d'], gysBubble: ['#a0e9ff', '#5ac8fa'], gysRed: ['#ff5a5f', '#ff2442'], gysDouban: ['#4cd964', '#2e963d'], gysMusic: ['#ff5a5f', '#d33a31'], gysDouyin: ['#3a3a3c', '#000000'], gysPdd: ['#ff7a45', '#e02e24'], gyComm: ['#34c759', '#248a3d'], gyCloudBkApp: ['#64d2ff', '#0a84ff'], gyxApps: ['#bf5af2', '#5e5ce6'], gysUi: ['#8e8e93', '#48484a'] };
    const HOME_COLOR = { gameHall: ['#ff9f43', '#ee5a24'], gallery: ['#a29bfe', '#6c5ce7'] };
    const HOME_TITLE = { gameHall: ['🎮', '游戏'], gallery: ['🖼️', '相册'] };
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
    const GAME_IDS = ['gyxQuest', 'gyxHunt', 'gyxPick', 'gyxTrpg', 'gyxFish', 'gyxReal', 'gyxSeek', 'gyxLoop', 'gyxRoom', 'gyxFate', 'gyxSoup', 'gyxShow', 'gyxCase', 'gyxWave'];
    // 设置类：从小功能挪到「设置 → 🧰 功能设置」
    const SET_IDS = ['hub_chatset', 'hub_custom', '@play', 'gyHelp', 'mcp'];   // 283：这几个在 设置 → 🧰 功能设置，不在小功能首页

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
            bar(); try { homeTiles(); } catch (e) { console.warn('[小功能首页]', e); } return x;
        };
        Object.keys(r).forEach(k => { try { w[k] = r[k]; } catch (e) {} });
        w.__gyHub = true; window.renderMiniFeaturePanel = w; try { (0, eval)('renderMiniFeaturePanel = window.renderMiniFeaturePanel'); } catch (e) {}
        return true;
    }
    /* ---------- 283：小功能首页 = 8 个大方块 ---------- */
    function liveLine(id) {
        const F = FOLDERS.find(x => x.id === id), X = GX();
        if (F && X && X.cardOf) {
            for (const m of membersOf(F)) { const fid = fidOf(m); if (!fid) continue; try { const c = X.cardOf(fid); if (c && c.today && c.today.rows[0]) { const w = c.today.rows[0]; return String(w.t || '') + ' ' + String(w.x || '').replace(/<[^>]+>/g, ''); } } catch (e) {} }
        }
        const f = featOf(id); return String((F && F.desc) || (f && f.desc) || '').split(/[，。、；]/)[0];
    }
    function homeTiles() {
        const box = document.getElementById('miniFeatureList'); if (!box) return;
        box.querySelectorAll('.gyhm-grid,.gyhm-more').forEach(e => e.remove());
        if (!on() || !pageOn()) { box.classList.remove('gyhm-on'); return; }
        const ids = HOME.filter(id => featOf(id));
        if (!ids.length) return;
        box.classList.add('gyhm-on');
        const grid = document.createElement('div'); grid.className = 'gyhm-grid';
        grid.innerHTML = ids.map(id => { const f = featOf(id), F = FOLDERS.find(x => x.id === id), c = (F && F.color) || HOME_COLOR[id] || ['#8e8e93', '#636366'];
            return `<button type="button" class="gyhm-t" style="background:linear-gradient(150deg,${c[0]},${c[1]})" onclick="gyOpenMiniFeature('${id}')"><em>${(F && F.icon) || (HOME_TITLE[id] || [])[0] || f.icon || '🧩'}</em><b>${esc((F && F.title) || (HOME_TITLE[id] || [])[1] || f.title)}</b><span>${esc(liveLine(id).slice(0, 22))}</span></button>`; }).join('');
        box.insertBefore(grid, box.firstChild);
        // 287：软件一个个直接摆出来（像手机桌面），点了直接进那个软件
        const SF = FOLDERS.find(x => x.id === 'hub_soft'), apps = SF ? membersOf(SF) : [];
        box.querySelectorAll('.gyhm-apps,.gyhm-sh').forEach(e => e.remove());
        if (apps.length) {
            const sh = document.createElement('div'); sh.className = 'gyhm-sh'; sh.textContent = '📱 软件';
            const ag = document.createElement('div'); ag.className = 'gyhm-apps';
            ag.innerHTML = apps.map(m => { const c = APP_COLOR[m.id] || ['#8e8e93', '#636366']; return `<button type="button" class="gyhm-a" onclick="gyHomeApp('${m.id}')"><i style="background:linear-gradient(150deg,${c[0]},${c[1]})">${m.icon || '📱'}</i><span>${esc(m.title)}</span></button>`; }).join('');
            grid.after(sh); sh.after(ag);
        }
        // 首页上剩下的（别人写的插件之类）：放在大方块下面
        const menu = box.querySelector('.set-menu');
        if (menu) { menu.querySelectorAll('button.set-entry').forEach(b => { const m = /gyOpenMiniFeature\('([^']+)'\)/.exec(b.getAttribute('onclick') || ''); if (m && (HOME.includes(m[1]) || m[1] === 'hub_soft')) b.style.display = 'none'; }); }
        const rest = menu ? [...menu.querySelectorAll('button.set-entry')].filter(b => b.style.display !== 'none').length : 0;
        if (rest) { const h = document.createElement('div'); h.className = 'gyhm-more'; h.textContent = '更多'; menu.parentNode.insertBefore(h, menu); }
    }
    window.gyHomeTiles = homeTiles;
    window.gyHomeApp = id => { const m = memberOf(id); if (m && m.open) try { m.open(); } catch (e) { console.warn(e); } else window.gyOpenMiniFeature(id); };
    function bar() {
        const box = document.getElementById('miniFeatureList'); if (!box) return;
        let b = document.getElementById('gyHubBar'); if (b) b.remove();
        if (on() && pageOn()) {   // 283：首页是 8 个大方块，不要分类标签了；「原来的样子」放到最底下
            b = document.createElement('div'); b.id = 'gyHubBar'; b.className = 'gyhm-foot';
            b.innerHTML = `<span onclick="gyHubPageSet(false);renderMiniFeaturePanel()">换回原来一列的样子</span>`;
            box.appendChild(b); return;
        }
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
    /* ---------- 282：合集一页 ---------- */
    const PK = 'gyHubPage', CK = 'gyHubCfg';
    const pageOn = () => { try { return localStorage.getItem(PK) !== '0'; } catch (e) { return true; } };
    const cfgAll = () => { try { return JSON.parse(localStorage.getItem(CK) || '{}') || {}; } catch (e) { return {}; } };
    const cfgOf = F => Object.assign({ hide: [], order: [] }, cfgAll()[F.id] || {});
    const cfgSet = (F, c) => { const a = cfgAll(); a[F.id] = c; try { localStorage.setItem(CK, JSON.stringify(a)); } catch (e) {} };
    const hiddenCard = (F, id) => cfgOf(F).hide.includes(id);
    const ordered = (F, M) => { const o = cfgOf(F).order; return M.slice().sort((a, b) => { const i = o.indexOf(a.id), j = o.indexOf(b.id); return (i < 0 ? 999 + M.indexOf(a) : i) - (j < 0 ? 999 + M.indexOf(b) : j); }); };
    const GX = () => window.GYX || null;
    const fidOf = m => { const X = GX(); if (!X || m.id[0] === '@') return null; return (X.miniFid && X.miniFid(m.id)) || (X.FEATS && X.FEATS.some(f => f.id === m.id) ? m.id : null); };
    function cardBody(m) {
        const X = GX(), fid = fidOf(m); let c = null;
        try { c = fid && X && X.cardOf ? X.cardOf(fid) : null; } catch (e) {}
        if (c && c.today) return `<div class="gyhb-rows">${c.today.rows.slice(0, 4).map(w => `<div class="gyhb-tr${w.go ? ' go' : ''}"${w.go ? ` onclick="event.stopPropagation();${esc(w.go)}"` : ''}><span>${esc(w.t || '')}</span><em>${w.x || ''}</em></div>`).join('')}</div>`;
        if (c && c.widget && typeof c.widget.def.r === 'function') { try { const h = c.widget.def.r({ size: 'm', id: c.widget.k, k: c.widget.k }); if (h) return `<div class="gyhb-w" onclick="event.stopPropagation();gyHubTapW('${esc(c.widget.k)}')">${h}</div>`; } catch (e) {} }
        return m.desc ? `<p class="gyhb-d">${esc(m.desc)}</p>` : '';
    }
    function card(F, m) {
        return `<div class="gyhb-card2" onclick="gyHubOpen('${F.id}','${m.id}')"><div class="gyhb-ch"><span class="gyhb-ci">${m.icon || '🧩'}</span><b>${esc(m.title)}</b><span class="gyhb-ca">›</span></div>${cardBody(m)}</div>`;
    }
    /* ---------- 284：一页 = 一组小组件（像手机桌面那样拼起来；先做「陪你」，别的入口一批批跟上） ----------
       VIEWS[入口/页]：tint 这一页的主色；ask 顶上一个问题 + 几块大方块；groups 分几段（小标题 + 哪几个）；wide 哪几个占一整行。
       每一块的内容都从那个功能自己的小组件来（X.gw 画的：图标、名字、几行字），第一行里的数字放大。 */
    const VIEWS = {
        // 284 第二批：我们 / TA 的 / 生活 / 世界
        'hub_us/p_关系': { tint: '#ff2d55', wide: ['relations'] },
        'hub_us/p_约定和愿望': { tint: '#af52de' },
        'hub_us/p_日子': { tint: '#ff9500', wide: ['days'] },
        'hub_us/p_回顾': { tint: '#5856d6' },
        'hub_ta/p_信箱': { tint: '#af52de', wide: ['@letters'] },
        'hub_ta/p_问答': { tint: '#007aff' },
        'hub_ta/p_TA 给你的': { tint: '#ff9500' },
        'hub_ta/p_没说出口的': { tint: '#5856d6' },
        'hub_life/p_小屋': { tint: '#ff9500', wide: ['gyxHome'], hero: { gyxHome: '🏠' } },
        'hub_life/p_收藏': { tint: '#a2845e' },
        'hub_life/p_钱和商城': { tint: '#34c759' },
        'hub_life/p_记录': { tint: '#30b0c7' },
        'hub_world/p_身边的人': { tint: '#007aff' },
        'hub_world/p_外面': { tint: '#30b0c7' },
        'hub_world/p_换个世界': { tint: '#af52de' },
        'hub_with/p_一起做': { tint: '#34c759', hint: '点一张进那个功能' },
        'hub_with/p_早晚': { tint: '#ff9500', color: { gyxBrief: '#ff9500', gyxWake: '#007aff', gyxNight: '#5856d6', gyxGood: '#ff2d55' }, groups: [['早上', ['gyxBrief', 'gyxWake']], ['晚上', ['gyxNight', 'gyxGood']]], wide: ['gyxBrief'] },
        'hub_with/p_哄': { tint: '#ff2d55', ask: { q: '现在怎么了？', tiles: [['🫂', '我不开心', 'gyxHug', '#ff9a9e', '#ff2d55'], ['🥺', 'TA 不开心', 'gyxCoax', '#a18cd1', '#5856d6'], ['🌧️', '我们吵架了', 'gyxMakeup', '#f6d365', '#ff9500'], ['🌳', '有话想说', 'gyxSecret', '#84fab0', '#30b0c7']] }, more: '最近' },
        'hub_with/p_贴贴和安静': { tint: '#ff2d55', color: { gyxBeat: '#ff2d55', gyxShake: '#ff9500', gyxStill: '#5856d6' }, wide: ['gyxBeat', 'gyxStill'], hero: { gyxBeat: '❤️', gyxStill: '🕯️' } }
    };
    const PAL = ['#34c759', '#007aff', '#ff9500', '#ff2d55', '#30b0c7', '#af52de', '#ffcc00', '#5856d6'];
    const viewOf = (F, P) => P && VIEWS[F.id + '/' + P.id];
    function tileData(m) {
        const X = GX(), fid = fidOf(m); let c = null;
        try { c = fid && X && X.cardOf ? X.cardOf(fid) : null; } catch (e) {}
        let ic = m.icon || '🧩', nm = m.title, L = [];
        if (c && c.widget && typeof c.widget.def.r === 'function') {
            try { const d = document.createElement('div'); d.innerHTML = c.widget.def.r({ size: 'm', id: c.widget.k, k: c.widget.k }) || ''; const h = d.querySelector('.h');
                if (h) { const b = h.querySelector('b'), sp = h.querySelector('span'); if (b) ic = b.textContent; if (sp) nm = sp.textContent; }
                L = [...d.querySelectorAll('em')].map(e => e.textContent.trim()).filter(Boolean); } catch (e) {}
        } else if (c && c.today) L = c.today.rows.slice(0, 2).map(w => [w.t, w.x].filter(Boolean).join(' '));
        let ds = 0; if (!L.length && m.desc) { L = [m.desc]; ds = 1; }
        const live = nm !== m.title && /中$|在一起|不开心/.test(nm);
        return { ic, nm, L, live, ds };
    }
    function bigLine(t) {
        const x = /^([^\d]*?)\s*(\d[\d:.,/]*)\s*([^\d\s]{0,4})$/.exec(t || '');
        if (x && x[2].length <= 6) return { big: `${esc(x[2])}${x[3] ? `<small>${esc(x[3])}</small>` : ''}`, pre: x[1].replace(/[👣\s]+$/, '').trim(), n: 1 };
        return { big: esc(t || ''), pre: '', n: 0 };
    }
    function tile(F, m, i, V) {
        const d = tileData(m), b = d.ds ? { big: esc(d.L[0]), pre: '', n: 0 } : bigLine(d.L[0]), wide = (V.wide || []).includes(m.id) || (V.__odd && V.__odd === m.id), hero = V.hero && V.hero[m.id];
        const sub = [b.pre, ...d.L.slice(1)].filter(Boolean).slice(0, 2);
        return `<div class="gyv-t${wide ? ' w' : ''}${d.live ? ' live' : ''}${hero ? ' hero' : ''}" style="--a:${(V.color && V.color[m.id]) || PAL[i % PAL.length]}" onclick="gyHubOpen('${F.id}','${m.id}')">
          <div class="gyv-k">${d.ic} ${esc(d.nm)}</div>${hero ? `<div class="gyv-h">${hero}</div>` : ''}
          <div class="gyv-n${b.n ? '' : ' tx'}${d.ds ? ' ds' : ''}">${b.big}</div>${sub.map(t => `<div class="gyv-s">${esc(t)}</div>`).join('')}</div>`;
    }
    function view(F, P, L, V) {
        const by = id => L.find(m => m.id === id), used = new Set();
        let i = 0; const T = m => { used.add(m.id); return tile(F, m, i++, V); };
        const grid = G => { const sm = G.filter(m => !(V.wide || []).includes(m.id)); V.__odd = sm.length % 2 ? sm[sm.length - 1].id : null; const h = `<div class="gyv-g">${G.map(T).join('')}</div>`; V.__odd = null; return h; };   // 单出来一块就占一整行，别留半行空
        let h = `<div class="gyv" style="--tint:${V.tint || '#007aff'}">`;
        if (V.ask) {
            const A = V.ask.tiles.filter(x => by(x[2]));
            h += `<div class="gyv-q">${esc(V.ask.q)}</div><div class="gyv-g">${A.map(([e, t, id, c1, c2]) => `<div class="gyv-big" style="background:linear-gradient(160deg,${c1},${c2})" onclick="gyHubOpen('${F.id}','${id}')"><em>${e}</em>${esc(t)}</div>`).join('')}</div>`;
            if (V.more) h += `<div class="gyv-gh">${esc(V.more)}</div>`;
        }
        if (V.groups) V.groups.forEach(([t, ids]) => { const G = ids.map(by).filter(Boolean); if (G.length) h += `<div class="gyv-gh">${esc(t)}</div>` + grid(G); });
        const rest = L.filter(m => !used.has(m.id));
        if (rest.length) h += (V.groups ? '<div class="gyv-gh">还有</div>' : '') + grid(rest);
        if (V.hint) h += `<div class="gyv-hint">${esc(V.hint)}</div>`;
        return h + '</div>';
    }
    window.gyHubViews = () => Object.keys(VIEWS);
    /* ---------- 284：设置 → 🧩 新玩法（按入口和页分组，一页一个总开关，点开一个个关） ---------- */
    const PLAY_SECS = ['hub_us', 'hub_with', 'hub_ta', 'hub_life', 'hub_world', 'hub_chatset', 'hub_custom'];
    // 关掉的功能不在小功能里了，所以按页里写的 id 直接找开关（不然关了就找不回来）
    const fidsOfPage = (F, P) => { const X = GX(); if (!X || !X.FEATS) return []; const out = [], seen = new Set();
        (P ? P.kids : F.kids).forEach(k => { if (k[0] === '@') return; const fid = (X.miniFid && X.miniFid(k)) || (X.FEATS.some(f => f.id === k) ? k : null); if (!fid || seen.has(fid)) return; seen.add(fid);
            const f = X.FEATS.find(x => x.id === fid) || {}, m = memberOf(k), nm = String(f.n || (m && m.title) || fid); out.push({ fid, m: m || { title: nm.replace(/^\S+\s/, ''), icon: (nm.match(/^(\S+)\s/) || [])[1] || '🧩' } }); });
        return out; };
    let PLAY_OPEN = '';
    window.gyPlayPage = function (openKey) {
        const X = GX(); if (!X) return;
        if (openKey !== undefined) PLAY_OPEN = PLAY_OPEN === openKey ? '' : openKey;
        let ov = document.getElementById('gyPlayOv');
        if (!ov) {
            ov = document.createElement('div'); ov.id = 'gyPlayOv'; ov.className = 'gyhb-ov'; ov.setAttribute('data-gy-overlay', '1'); ov.setAttribute('data-gy-page', '1');
            ov.innerHTML = `<div class="gyhb-box" style="background:var(--hc)"><div class="gyhb-hd"><span class="gyhb-back" onclick="document.getElementById('gyPlayOv').remove()">‹</span><b class="gyhb-ttl"></b><span class="gyhb-x" onclick="document.getElementById('gyPlayOv').remove()">✕</span></div><div class="gyhb-lt">新玩法</div><div id="gyPlayBody"></div></div>`;
            document.body.appendChild(ov);
        }
        const row = (key, ic, col, title, L) => {
            const n = L.filter(x => X.on(x.fid)).length, open = PLAY_OPEN === key;
            return `<div class="gyhb-srow gyp-r" onclick="gyPlayPage('${esc(key)}')"><span class="gyp-ic" style="background:${col}">${ic}</span><span class="t">${esc(title)}<small>${L.length} 个${n < L.length ? ` · 开着 ${n} 个` : ''}</small></span><span class="gyp-chev">${open ? '⌄' : '›'}</span><input type="checkbox" ${n ? 'checked' : ''} onclick="event.stopPropagation()" onchange="gyPlaySetAll('${esc(key)}',this.checked)"></div>`
                + (open ? L.map(x => `<div class="gyhb-srow gyp-sub"><span class="gyhb-ci">${(x.m && x.m.icon) || '🧩'}</span><span class="t">${esc((x.m && x.m.title) || x.fid)}</span><input type="checkbox" ${X.on(x.fid) ? 'checked' : ''} onchange="GYX.set('${x.fid}',this.checked);gyPlayPage()"></div>`).join('') : '');
        };
        const KEYS = {}; let h = `<div class="gyhb-sgrp" style="padding:14px 16px;font-size:15px;line-height:1.6">所有新玩法都在谷雨里了，<b>不用再导入插件</b>。不想要哪个，在这里关掉；关掉的不会再出现在小功能里，TA 也不会再用它。</div>`;
        PLAY_SECS.forEach(id => {
            const F = FOLDERS.find(x => x.id === id); if (!F || !F.pages) return;
            const rows = F.pages.map(P => { const L = fidsOfPage(F, P); if (!L.length) return ''; const key = F.id + '/' + P.id; KEYS[key] = L; return row(key, P.icon, (F.color || ['#8e8e93'])[1] || '#8e8e93', P.title, L); }).filter(Boolean);
            if (rows.length) h += `<div class="gyhb-sgh">${F.icon} ${esc(F.title)}${/chatset|custom/.test(F.id) ? '（设置里）' : ''}</div><div class="gyhb-sgrp">${rows.join('')}</div>`;
        });
        const G = GAME_IDS.filter(fid => X.FEATS.some(f => f.id === fid)).map(fid => ({ fid, m: memberOf(fid) || { title: (X.FEATS.find(f => f.id === fid) || {}).n, icon: '🎮' } }));
        if (G.length) { KEYS.games = G; h += `<div class="gyhb-sgh">🎮 游戏</div><div class="gyhb-sgrp">${row('games', '🎮', '#5856d6', '游戏厅里的', G)}</div>`; }
        let pr = 0; try { pr = +localStorage.getItem('gyPlayPruned') || 0; } catch (e) {}
        h += `<div class="gyhb-sgh">以前装过的插件</div><div class="gyhb-sgrp"><div class="gyhb-srow"><span class="t">${pr ? `已经自动拿掉了 ${pr} 个` : '没有要拿掉的'}<small>数据都还在，开关跟原来一样</small></span></div></div>`;
        h += `<div class="gyhb-sgh">更多</div><div class="gyhb-sgrp"><div class="gyhb-srow gyp-r" onclick="gyPlaySwitches()"><span class="t">一个个看（插件开关中心）<small>自主行动、带进提示词的内容也在那里</small></span><span class="gyp-chev">›</span></div><div class="gyhb-srow gyp-r" onclick="document.getElementById('gyPlayOv').remove();switchMainView('plugins')"><span class="t" style="color:#007aff">导入别人写的插件…</span></div></div>`;
        window.__gyPlayKeys = KEYS;
        ov.querySelector('#gyPlayBody').innerHTML = h;
    };
    /* ---------- 284：角色编辑页里「🗣️ TA 怎么说话」——性格、在变、听取模式按这个角色看、点进去就是这个角色的 ---------- */
    const TALK = [['TA 的性格', ['gyxBond', 'gyxSpice', 'gyxFair']], ['TA 在变', ['gyxEcho', 'gyxInfl', 'gyxEvolve']], ['听 TA 说', ['gyxListen']]];
    function charTalk(id) {
        const btn = document.getElementById('saveCharBtn'); let box = document.getElementById('gyCharTalk');
        const X = GX(); if (!btn || !X || id == null || id === 'tabloid_admin') { if (box) box.remove(); return; }
        if (!box) { box = document.createElement('div'); box.id = 'gyCharTalk'; box.className = 'input-group full-width gyct'; btn.parentNode.insertBefore(box, btn); }
        const prev = window.currentChatSessionId; let h = `<label>🗣️ TA 怎么说话</label><div class="gyct-tip">这几样对这个角色起作用；点一行进去按 TA 调。也在 设置 → 💬 聊天。</div>`;
        TALK.forEach(([t, ids]) => {
            const L = ids.filter(f => X.FEATS.some(x => x.id === f)); if (!L.length) return;
            h += `<div class="gyct-h">${esc(t)}</div><div class="gyct-g">` + L.map(fid => {
                const nm = String((X.FEATS.find(x => x.id === fid) || {}).n || fid), m = memberOf(fid) || { id: fid, title: nm.replace(/^\S+\s/, ''), icon: (nm.match(/^(\S+)\s/) || [])[1] || '🧩' }; let line = '';
                try { window.currentChatSessionId = id; const d = tileData(m); line = d.ds ? '' : d.L.slice(0, 2).join(' · '); } catch (e) {} finally { window.currentChatSessionId = prev; }
                return `<div class="gyct-r" onclick="gyCharTalkGo('${fid}','${esc(String(id))}')"><span class="i">${m.icon || '🧩'}</span><span class="t">${esc(m.title)}${line ? `<small>${esc(line)}</small>` : ''}</span><input type="checkbox" ${X.on(fid) ? 'checked' : ''} onclick="event.stopPropagation()" onchange="GYX.set('${fid}',this.checked)"><span class="c">›</span></div>`;
            }).join('') + '</div>';
        });
        box.innerHTML = h;
    }
    window.gyCharTalkGo = (fid, id) => { const f = window[fid + 'Open']; if (typeof f !== 'function') return; try { fid === 'gyxFair' ? f() : f(id); } catch (e) { console.warn(e); } };
    window.gyCharTalk = charTalk;
    (function talkHook(n) {
        const f = window.openFormForEdit, g = window.openFormForCreate;
        if (typeof f !== 'function') { if ((n || 0) < 60) setTimeout(() => talkHook((n || 0) + 1), 500); return; }
        if (!f.__gyTalk) { const w = function (id) { const r = f.apply(this, arguments); try { charTalk(id); } catch (e) {} return r; }; w.__gyTalk = 1; window.openFormForEdit = w; try { (0, eval)('openFormForEdit = window.openFormForEdit'); } catch (e) {} }
        if (typeof g === 'function' && !g.__gyTalk) { const w = function () { const r = g.apply(this, arguments); try { const b = document.getElementById('gyCharTalk'); if (b) b.remove(); } catch (e) {} return r; }; w.__gyTalk = 1; window.openFormForCreate = w; try { (0, eval)('openFormForCreate = window.openFormForCreate'); } catch (e) {} }
    })();
    window.gyPlaySwitches = () => { const o = document.getElementById('gyPlayOv'); if (o) o.remove(); const f = window.gyxSwitchOpen; if (typeof f === 'function') f(); };
    window.gyPlaySetAll = (key, v) => { const L = (window.__gyPlayKeys || {})[key] || [], X = GX(); if (!X) return; L.forEach(x => X.set(x.fid, v)); window.gyPlayPage(); };

    window.gyHubTapW = k => { try { const W = window.__gyPmW, d = W && W.WD && W.WD[k]; if (d && d.tap) { window.gyHubClose(); d.tap({ size: 'm', id: k, k }); } } catch (e) {} };
    function pills(F, M, cur, P) {
        const box = document.getElementById('gyHubPills'), lt = document.getElementById('gyHubLt'); if (!box) return;
        if (lt) { lt.textContent = pageOn() ? F.title : ''; lt.style.display = pageOn() ? '' : 'none'; }
        if (!pageOn()) { box.innerHTML = ''; box.style.display = 'none'; return; }
        box.style.display = '';
        if (F.pages) {   // 283：分页的入口——标签是「页」
            const live = F.pages.filter(p => pageMembers(F, M, p).length);
            box.innerHTML = live.map(p => `<button type="button" class="${P && P.id === p.id ? 'on' : ''}" onclick="gyHubOpen('${F.id}','${esc(p.id)}')">${p.icon} ${esc(p.title)}</button>`).join('') + `<button type="button" class="gyhb-pm" onclick="gyHubMore()" aria-label="这一页显示什么">⋯</button>`;
            const on = box.querySelector('.on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {}
            return;
        }
        const L = ordered(F, M).filter(x => !hiddenCard(F, x.id));
        box.innerHTML = `<button type="button" class="${cur ? '' : 'on'}" onclick="gyHubOpen('${F.id}')">全部</button>` + L.map(x => `<button type="button" class="${cur === x.id ? 'on' : ''}" onclick="gyHubOpen('${F.id}','${x.id}')">${x.icon || ''} ${esc(x.title)}</button>`).join('') + `<button type="button" class="gyhb-pm" onclick="gyHubMore()" aria-label="这一页显示什么">⋯</button>`;
        const on = box.querySelector('.on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {}
    }
    // ⋯：这一页显示哪些、顺序、TA 会自己做
    window.gyHubMore = function () {
        if (!HUB) return; const F = HUB.F, M = ordered(F, HUB.page ? pageMembers(F, membersOf(F), HUB.page) : membersOf(F)), c = cfgOf(F), X = GX();
        let sh = document.getElementById('gyHubSheet'); if (sh) sh.remove();
        sh = document.createElement('div'); sh.id = 'gyHubSheet'; sh.className = 'gyhb-sheet';
        const auto = M.map(m => ({ m, fid: fidOf(m) })).filter(x => x.fid && X && X.FEATS && X.FEATS.some(f => f.id === x.fid && f.auto !== false));
        sh.innerHTML = `<div class="gyhb-sbox"><div class="gyhb-shd"><span onclick="gyHubMoreReset()">重置</span><b>${esc(HUB.page ? HUB.page.title : F.title)}</b><span class="k" onclick="document.getElementById('gyHubSheet').remove();gyHubBack()">完成</span></div>
          <div class="gyhb-sgh">这一页显示</div><div class="gyhb-sgrp">${M.map((m, i) => `<div class="gyhb-srow"><span class="gyhb-ci">${m.icon || '🧩'}</span><span class="t">${esc(m.title)}</span><span class="mv" onclick="gyHubMove('${m.id}',-1)">${i ? '↑' : ''}</span><span class="mv" onclick="gyHubMove('${m.id}',1)">${i < M.length - 1 ? '↓' : ''}</span><input type="checkbox" ${c.hide.includes(m.id) ? '' : 'checked'} onchange="gyHubShow('${m.id}',this.checked)"></div>`).join('')}</div>
          ${auto.length ? `<div class="gyhb-sgh">TA 会自己做</div><div class="gyhb-sgrp">${auto.map(x => `<div class="gyhb-srow"><span class="gyhb-ci">${x.m.icon || '🧩'}</span><span class="t">${esc(x.m.title)}</span><input type="checkbox" ${X.on(x.fid + '.auto') ? 'checked' : ''} onchange="GYX.set('${x.fid}.auto',this.checked)"></div>`).join('')}</div>` : ''}
          <div class="gyhb-sgh">样子</div><div class="gyhb-sgrp"><div class="gyhb-srow"><span class="t">合集做成一页（关掉＝原来的一列）</span><input type="checkbox" ${pageOn() ? 'checked' : ''} onchange="gyHubPageSet(this.checked)"></div></div></div>`;
        sh.addEventListener('click', e => { if (e.target === sh) { sh.remove(); window.gyHubOpen(F.id, HUB && HUB.page ? HUB.page.id : undefined); } });
        (document.getElementById('gyHubOv') || document.body).appendChild(sh);
    };
    window.gyHubShow = (id, v) => { if (!HUB) return; const c = cfgOf(HUB.F); c.hide = c.hide.filter(x => x !== id); if (!v) c.hide.push(id); cfgSet(HUB.F, c); };
    window.gyHubMove = (id, d) => { if (!HUB) return; const F = HUB.F, c = cfgOf(F), all = membersOf(F), L = ordered(F, all).map(m => m.id), PL = ordered(F, HUB.page ? pageMembers(F, all, HUB.page) : all).map(m => m.id), i = PL.indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= PL.length) return; const a = L.indexOf(PL[i]), b = L.indexOf(PL[j]); [L[a], L[b]] = [L[b], L[a]]; c.order = L; cfgSet(F, c); window.gyHubMore(); };
    window.gyHubMoreReset = () => { if (!HUB) return; cfgSet(HUB.F, { hide: [], order: [] }); window.gyHubMore(); };
    window.gyHubPageSet = v => { try { localStorage.setItem(PK, v ? '1' : '0'); } catch (e) {} };
    // 283：老的合集 id 从别处（指南、通知、桌面图标）打开 → 新入口的那一页
    (function aliasOpen() { const f = window.gyOpenMiniFeature; if (typeof f !== 'function' || f.__gyAlias) return; const w = function (id) { if (ALIAS[id] && on()) return window.gyHubOpen(id); return f.apply(this, arguments); }; w.__gyAlias = true; window.gyOpenMiniFeature = w; try { (0, eval)('gyOpenMiniFeature = window.gyOpenMiniFeature'); } catch (e) {} })();
    window.gyHubPageOn = pageOn;
    const pageOf = (F, M, id) => { if (!F.pages) return null; return F.pages.find(p => p.id === id) || F.pages.find(p => p.kids.includes(id)) || null; };
    const pageMembers = (F, M, P) => P ? M.filter(x => P.kids.includes(x.id)) : M;
    window.gyHubOpen = function (fid, tab) {
        if (ALIAS[fid]) { const [nf, np] = ALIAS[fid]; return window.gyHubOpen(nf, tab || np); }   // 283：老的合集 id → 新入口的那一页
        const F = FOLDERS.find(x => x.id === fid); if (!F) return;
        if (F.open && !tab) { try { if (F.open()) return; } catch (e) {} }   // 自己有一整页的合集（📱 软件 = 手机桌面）
        const M = membersOf(F); if (!M.length) return;
        const m = tab ? M.find(x => x.id === tab) : null;
        // 283：分页的入口——没说哪页就打开上次那页（没有就第一页）；只剩空页的跳过
        let P = null;
        if (F.pages && pageOn()) {
            const live = F.pages.filter(p => pageMembers(F, M, p).length);
            P = (tab && pageOf(F, M, tab)) || live.find(p => p.id === lastTab(fid + '_p')) || live[0] || null;
            if (P && !pageMembers(F, M, P).length) P = live[0] || null;
            if (P) try { localStorage.setItem('gyHubLast_' + fid + '_p', P.id); } catch (e) {}
        }
        // 谷雨自带的整页功能：直接打开，不经过合集
        if (m && !m.plugin) { window.gyHubLaunch(m.id); return; }
        let ov = document.getElementById('gyHubOv');
        if (!ov || !HUB || HUB.F !== F || getComputedStyle(ov).display === 'none') {
            if (ov) ov.remove();
            ov = document.createElement('div'); ov.id = 'gyHubOv'; ov.className = 'gyhb-ov'; ov.setAttribute('data-gy-overlay', '1'); ov.setAttribute('data-gy-page', '1');   // 合集一律当一整页
            ov.innerHTML = `<div class="gyhb-box"><div class="gyhb-hd"><span class="gyhb-back" onclick="gyHubBack()" style="display:none">‹</span><b class="gyhb-ttl"></b><span class="gyhb-x" onclick="gyHubClose()">✕</span></div><div class="gyhb-lt" id="gyHubLt"></div><div class="gyhb-pills" id="gyHubPills"></div><div class="gyhb-body" id="gyHubBody"></div></div>`;
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
        pills(F, M, m ? m.id : '', P);
        if (!m) {
            // 282：一整页——每个功能一张卡片（它「今天」的那几行 / 小组件 / 一句话），卡片头点进去；顶上一排标签切换
            HUB.tab = null;
            ttl.textContent = `${F.icon} ${F.title}`; back.style.display = 'none';
            if (!pageOn()) {   // 关了「一页」：还是原来的一列
                HUB.body.innerHTML = `<div class="gyhb-list">${M.map(x => `<button type="button" class="gyhb-row" onclick="gyHubOpen('${F.id}','${x.id}')">
                <span class="gyhb-ri">${x.icon || '🧩'}</span><span class="gyhb-rm"><b>${esc(x.title)}</b>${x.desc ? `<em>${esc(x.desc)}</em>` : ''}</span><span class="gyhb-ra">›</span></button>`).join('')}</div><div class="gyhb-more2" onclick="gyHubPageSet(true);gyHubOpen('${F.id}')">换成一页的样子 ›</div>`;
            } else { const PM = pageMembers(F, M, P), V = viewOf(F, P), SL = ordered(F, PM).filter(x => !hiddenCard(F, x.id)); HUB.page = P; HUB.body.innerHTML = (V ? view(F, P, SL, V) : SL.map(x => card(F, x)).join('')) + (ordered(F, PM).some(x => hiddenCard(F, x.id)) ? `<div class="gyhb-more2" onclick="gyHubMore()">还有 ${ordered(F, PM).filter(x => hiddenCard(F, x.id)).length} 个藏起来了 ›</div>` : ''); }
            try { const b = ov.querySelector('.gyhb-box'); if (b) b.scrollTop = 0; } catch (e) {}
            return;
        }
        // 打开插件那一项：面板画进合集
        HUB.tab = m.id; HUB.page = P; try { localStorage.setItem('gyHubLast_' + fid, m.id); } catch (e) {}
        ttl.textContent = `${m.icon || '🧩'} ${m.title}`; back.style.display = pageOn() ? 'none' : '';
        HUB.cap = Date.now();
        try { const r = m.open(); if (r && r.then) r.then(() => { if (HUB) HUB.cap = 0; }, () => { if (HUB) HUB.cap = 0; }); } catch (e) { console.warn('[合集] 打开出错：', e); }
        setTimeout(() => {
            if (!HUB) return;
            if (HUB.cap && Date.now() - HUB.cap >= 1400) HUB.cap = 0;
            // 这个插件没往合集里画（自己开了整页 / 弹窗）：合集退回一列，别留一块空白
            if (!HUB.body.children.length && HUB.tab === m.id) window.gyHubOpen(F.id, P ? P.id : undefined);
        }, 1500);
    };
    window.gyHubBack = function () { if (HUB) window.gyHubOpen(HUB.F.id, HUB.page ? HUB.page.id : undefined); };
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
            if (at.parentNode) at.parentNode.insertBefore(d, at);   // 293：分批启动时插入点可能刚被挪走
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
        const L = SET_IDS.map(id => featOf(id) || (PSEUDO[id] && (() => { try { return PSEUDO[id].ok(); } catch (e) { return false; } })() ? Object.assign({ id }, PSEUDO[id]) : null)).filter(Boolean); if (!L.length) return;
        const sep = document.createElement('div'); sep.className = 'set-menu-sep'; sep.dataset.gyhub = '1'; sep.textContent = '🧰 功能设置（从小功能挪过来的设置类）';
        menu.appendChild(sep);
        L.forEach(f => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'set-entry'; b.dataset.core = '1'; b.dataset.gyhub = '1';
            b.innerHTML = `<span class="set-entry-ico">${f.icon || '🧩'}</span><span class="set-entry-main"><span class="set-entry-title">${esc(f.title)}</span><span class="set-entry-desc">${esc(f.desc || '')}</span></span><span class="set-entry-arrow">›</span>`;
            b.onclick = () => (PSEUDO[f.id] ? PSEUDO[f.id].open() : window.gyOpenMiniFeature(f.id));
            menu.appendChild(b);
        });
    }
    /* ---------- 插件合并：装了合并版，就把旧的单个插件从列表里拿掉（数据不动）；不要了的两个也拿掉 ---------- */
    const BUN = /*GYX_BUNDLES*/{"bundles": {"🖼️ 相册里的插件": [["📸 TA的相册", ["gyxAlbum"]], ["🎨 表情包工坊", ["gyxMeme"]], ["📸 和TA合照", ["gyxDuo"]], ["💑 情侣头像", ["gyxAvatar"]], ["📸 同一秒", ["gyxMoment"]]], "💞 我们的关系": [["💞 好感两层", ["gyxDual"]], ["📊 关系四条线", ["gyxAxes"]], ["📈 我们的等级", ["gyxLevel"]], ["🏅 我们的成就", ["gyxBadge"]], ["🎯 反向攻略", ["gyxWoo"]], ["🔁 我们的小习惯", ["gyxRitual"]], ["🎁 TA的秘密计划", ["gyxPlan"]], ["📜 TA的往事", ["gyxPast"]], ["🪴 TA的成长日志", ["gyxEvolve"]], ["📼 TA的录像带", ["gyxTapes"]]], "📚 回顾": [["📒 手帐时间线", ["gyxHandbook"]], ["📖 我们的书", ["gyxOurBook"]], ["✨ 我们的星图", ["gyxStar"]], ["🗞️ 我们的周报", ["gyxWeekly"]], ["🎞️ 回忆放映", ["gyxReel"]], ["👀 TA眼中的你", ["gyxEye"]], ["⏳ 时光机", ["gyxTime"]], ["🕹️ 记忆潜行", ["gyxDive"]]], "🎉 纪念日和生日": [["🎉 纪念日惊喜", ["gyxAnniv"]], ["🎂 给TA过生日", ["gyxBday"]], ["🏮 一起过节", ["gyxFest"]]], "🤙 我们的约定": [["🤙 小约定", ["gyxPromise"]], ["🎟️ 兑换券", ["gyxCoupon"]], ["🧾 恋爱审批", ["gyxOA"]], ["🎁 愿望清单", ["gyxWish"]], ["💯 一百件小事", ["gyx100"]]], "🌙 早安晚安": [["☀️ 早安简报", ["gyxBrief"]], ["⏰🌙 叫醒与哄睡", ["gyxWake"]], ["🌙 熬夜管家", ["gyxNight"]], ["🕯️ 睡前三件好事", ["gyxGood"]]], "💬 问答": [["🌅 每日一问", ["gyxDaily"]], ["💞 默契问答", ["gyxQuiz"]], ["📋 调查问卷", ["gyxSurvey"]], ["📮 提问箱", ["gyxAskBox"]], ["🗳️ TA的人生选择题", ["gyxDilemma"]], ["📡 心电感应光谱", ["gyxWave"]]], "🎮 游戏": [["🎮 一起玩", ["gyxGame"]], ["🧭 文字冒险", ["gyxQuest"]], ["🗺️ TA布置的寻宝", ["gyxHunt"]], ["🎡 帮我选", ["gyxPick"]], ["🎲 跑团", ["gyxTrpg"]], ["🎣 一起钓鱼", ["gyxFish"]], ["📍 现实捉迷藏", ["gyxSeek"]], ["🔁 时间循环", ["gyxLoop"]], ["🗝️ 双人密室", ["gyxRoom"]], ["🃏 命运卡牌", ["gyxFate"]]], "🕵️ 推理和综艺": [["🎭 谁是真的TA", ["gyxReal"]], ["🐢 海龟汤", ["gyxSoup"]], ["🔍 剧本杀", ["gyxCase"]], ["💘 我们的恋综", ["gyxShow"]]], "📰 主页和社交": [["📰 营销号自己爆料", ["gyxScoop"]], ["🔥 微博热搜榜", ["gyxHotList"]], ["⏰ 准点群聊", ["gyxOnTime"]]], "💌 信": [["💌 拆信仪式", ["gyxLetter"]], ["📓 交换日记本", ["gyxJournal"]], ["⏳ 时间胶囊", ["gyxCapsule"]], ["🏞️ 明信片墙", ["gyxPost"]], ["🍾 漂流瓶", ["gyxBottle"]], ["💌 有条件才能拆的信", ["gyxSeal"]]], "🏠 我们的小屋": [["🏠 我们的小屋", ["gyxHome"]], ["🧊 3D小屋", ["gyx3dRoom"]], ["🍁 随机掉落收藏册", ["gyxDrop"]], ["🌱 一起养小生命", ["gyxGrow"]], ["🐷 一起存钱罐", ["gyxJar"]], ["📦 TA的旧物箱", ["gyxBox"]], ["🪟 窗台来客", ["gyxSill"]]], "🗣️ TA怎么说话": [["🫂 相处模式", ["gyxBond"]], ["🧂 风格调料", ["gyxSpice"]], ["🛡️ 平视", ["gyxFair"]], ["🗣️ 口头禅传染", ["gyxEcho"]], ["🎬 听取模式", ["gyxListen"]], ["🌱 TA被你影响", ["gyxInfl"]], ["⌨️ 你打了又删", ["gyxErase"]], ["🔁 你让TA重说了", ["gyxRegen"]], ["✏️ TA的草稿箱", ["gyxDraft"]], ["🛡️ 别把她写弱", ["gyxFair"]]], "🫂 哄": [["🫂 抱抱", ["gyxHug"]], ["🥺 轮到你哄TA", ["gyxCoax"]], ["🌧️ 吵架和好", ["gyxMakeup"]], ["🌳 秘密树洞", ["gyxSecret"]]], "🚶 陪你": [["🚶 陪你散步", ["gyxWalk"]], ["🍳 一起做饭", ["gyxCook"]], ["📚 一起自习室", ["gyxStudy"]], ["🏃 TA是你的私教", ["gyxCoach"]], ["✈️ 一起旅行", ["gyxTrip"]], ["📮 现实小任务", ["gyxMis"]], ["🕯️ 一起安静待着", ["gyxStill"]], ["💓 听心跳", ["gyxBeat"]], ["📳 摇一摇贴贴", ["gyxShake"]], ["💓 贴贴", ["gyxBeat"]]], "🎛️ 开关和后台": [["🎛️ 功能开关中心", ["gyxSwitch", "gyxWebInvite", "gyxMystic"]], ["🔋 省电模式", ["gyxSaver"]], ["💬 文案不重样", ["gyxVary"]], ["⏳ 生成中提示", ["gyxGen"]]], "📱 小手机": [["📝 TA的备忘录", ["gyxMemo"]], ["🧩 AI小程序", ["gyxApps"]], ["📞 来电", ["gyxRing", "gyxCallPlus"]], ["📲 手机桌面小组件", ["gyxPhoneW"]], ["🧸 桌面上的TA", ["gyxPet"]], ["🧊 3D小人", ["gyx3d", "gyx3dPage"]], ["📤 角标和分享", ["gyxPing"]], ["📞 来电动画和铃声", ["gyxRing", "gyxCallPlus"]], ["📞 来电增强", ["gyxRing", "gyxCallPlus"]]], "🎨 美化": [["🫧 气泡工坊", ["gyxBubble"]], ["🎨 酒馆主题", ["gyxStTheme"]], ["🌗 日夜主题", ["gyxDayNight"]], ["👉 跟手返回", ["gyxSwipe"]], ["🛍️ 装扮商店", ["gyxShop"]], ["🌈 情绪皮肤", ["gyxMoodSkin"]]], "🎁 TA给你的": [["🌙 TA的梦", ["gyxDream"]], ["🎨 涂鸦互传", ["gyxDoodle"]], ["🔮 神秘学加量", ["gyxMystic"]]], "🪐 换个世界玩": [["🪐 平行世界", ["gyxWorld"]], ["🎭 换个世界", ["gyxTheater"]], ["🔄 互换身份", ["gyxSwap"]], ["🎬 番外隔离", ["gyxSide"]]], "🧠 记忆": [["❄️ 总结滚雪球", ["gyxRoll"]], ["📇 生活小档案", ["gyxNotes"]]], "🌐 外面的世界": [["🌦️ 天气联动", ["gyxWeather"]], ["🔥 真实热搜", ["gyxHot"]]], "💭 聊天细节": [["🌐 外语和翻译", ["gyxLang"]], ["🫶 气泡表情回应", ["gyxReact"]]], "🧺 生活": [["🧾 一起记账", ["gyxBook"]], ["🍙 反向养成", ["gyxCare"]]]}, "retired": ["📺 追剧进度", "🔐 我们的暗号", "📱 软件全家桶", "🧣 微博", "🫧 泡泡", "📕 小红书", "🫘 豆瓣", "💬 iMessage", "📲 真手机", "🎵 网易云", "🎵 网易云音乐", "🎶 抖音", "💚 微信", "📺 直播间", "📻 深夜电台", "🎶 共享歌单", "📼 留声机", "🎵 TA写给你的歌", "🆘 TA被困了", "角色立绘差分"], "builtin": {"🖼️ 相册里的插件": ["gyxAlbum", "gyxAvatar", "gyxDuo", "gyxMeme", "gyxMoment"], "📸 TA的相册": ["gyxAlbum"], "🎨 表情包工坊": ["gyxMeme"], "📸 和TA合照": ["gyxDuo"], "💑 情侣头像": ["gyxAvatar"], "📸 同一秒": ["gyxMoment"], "💞 我们的关系": ["gyxAxes", "gyxBadge", "gyxDual", "gyxEvolve", "gyxLevel", "gyxPast", "gyxPlan", "gyxRitual", "gyxTapes", "gyxWoo"], "💞 好感两层": ["gyxDual"], "📊 关系四条线": ["gyxAxes"], "📈 我们的等级": ["gyxLevel"], "🏅 我们的成就": ["gyxBadge"], "🎯 反向攻略": ["gyxWoo"], "🔁 我们的小习惯": ["gyxRitual"], "🎁 TA的秘密计划": ["gyxPlan"], "📜 TA的往事": ["gyxPast"], "🪴 TA的成长日志": ["gyxEvolve"], "📼 TA的录像带": ["gyxTapes"], "📚 回顾": ["gyxDive", "gyxEye", "gyxHandbook", "gyxOurBook", "gyxReel", "gyxStar", "gyxTime", "gyxWeekly"], "📒 手帐时间线": ["gyxHandbook"], "📖 我们的书": ["gyxOurBook"], "✨ 我们的星图": ["gyxStar"], "🗞️ 我们的周报": ["gyxWeekly"], "🎞️ 回忆放映": ["gyxReel"], "👀 TA眼中的你": ["gyxEye"], "⏳ 时光机": ["gyxTime"], "🕹️ 记忆潜行": ["gyxDive"], "🎉 纪念日和生日": ["gyxAnniv", "gyxBday", "gyxFest"], "🎉 纪念日惊喜": ["gyxAnniv"], "🎂 给TA过生日": ["gyxBday"], "🏮 一起过节": ["gyxFest"], "🤙 我们的约定": ["gyx100", "gyxCoupon", "gyxOA", "gyxPromise", "gyxWish"], "🤙 小约定": ["gyxPromise"], "🎟️ 兑换券": ["gyxCoupon"], "🧾 恋爱审批": ["gyxOA"], "🎁 愿望清单": ["gyxWish"], "💯 一百件小事": ["gyx100"], "🌙 早安晚安": ["gyxBrief", "gyxGood", "gyxNight", "gyxWake"], "☀️ 早安简报": ["gyxBrief"], "⏰🌙 叫醒与哄睡": ["gyxWake"], "🌙 熬夜管家": ["gyxNight"], "🕯️ 睡前三件好事": ["gyxGood"], "💬 问答": ["gyxAskBox", "gyxDaily", "gyxDilemma", "gyxQuiz", "gyxSurvey", "gyxWave"], "🌅 每日一问": ["gyxDaily"], "💞 默契问答": ["gyxQuiz"], "📋 调查问卷": ["gyxSurvey"], "📮 提问箱": ["gyxAskBox"], "🗳️ TA的人生选择题": ["gyxDilemma"], "📡 心电感应光谱": ["gyxWave"], "🎮 游戏": ["gyxFate", "gyxFish", "gyxGame", "gyxHunt", "gyxLoop", "gyxPick", "gyxQuest", "gyxRoom", "gyxSeek", "gyxTrpg"], "🎮 一起玩": ["gyxGame"], "🧭 文字冒险": ["gyxQuest"], "🗺️ TA布置的寻宝": ["gyxHunt"], "🎡 帮我选": ["gyxPick"], "🎲 跑团": ["gyxTrpg"], "🎣 一起钓鱼": ["gyxFish"], "📍 现实捉迷藏": ["gyxSeek"], "🔁 时间循环": ["gyxLoop"], "🗝️ 双人密室": ["gyxRoom"], "🃏 命运卡牌": ["gyxFate"], "🕵️ 推理和综艺": ["gyxCase", "gyxReal", "gyxShow", "gyxSoup"], "🎭 谁是真的TA": ["gyxReal"], "🐢 海龟汤": ["gyxSoup"], "🔍 剧本杀": ["gyxCase"], "💘 我们的恋综": ["gyxShow"], "📰 主页和社交": ["gyxHotList", "gyxOnTime", "gyxScoop"], "📰 营销号自己爆料": ["gyxScoop"], "🔥 微博热搜榜": ["gyxHotList"], "⏰ 准点群聊": ["gyxOnTime"], "💌 信": ["gyxBottle", "gyxCapsule", "gyxJournal", "gyxLetter", "gyxPost", "gyxSeal"], "💌 拆信仪式": ["gyxLetter"], "📓 交换日记本": ["gyxJournal"], "⏳ 时间胶囊": ["gyxCapsule"], "🏞️ 明信片墙": ["gyxPost"], "🍾 漂流瓶": ["gyxBottle"], "💌 有条件才能拆的信": ["gyxSeal"], "🏠 我们的小屋": ["gyx3dRoom", "gyxBox", "gyxDrop", "gyxGrow", "gyxHome", "gyxJar", "gyxSill"], "🧊 3D小屋": ["gyx3dRoom"], "🍁 随机掉落收藏册": ["gyxDrop"], "🌱 一起养小生命": ["gyxGrow"], "🐷 一起存钱罐": ["gyxJar"], "📦 TA的旧物箱": ["gyxBox"], "🪟 窗台来客": ["gyxSill"], "🗣️ TA怎么说话": ["gyxBond", "gyxDraft", "gyxEcho", "gyxErase", "gyxFair", "gyxInfl", "gyxListen", "gyxRegen", "gyxSpice"], "🫂 相处模式": ["gyxBond"], "🧂 风格调料": ["gyxSpice"], "🛡️ 平视": ["gyxFair"], "🗣️ 口头禅传染": ["gyxEcho"], "🎬 听取模式": ["gyxListen"], "🌱 TA被你影响": ["gyxInfl"], "⌨️ 你打了又删": ["gyxErase"], "🔁 你让TA重说了": ["gyxRegen"], "✏️ TA的草稿箱": ["gyxDraft"], "🛡️ 别把她写弱": ["gyxFair"], "🫂 哄": ["gyxCoax", "gyxHug", "gyxMakeup", "gyxSecret"], "🫂 抱抱": ["gyxHug"], "🥺 轮到你哄TA": ["gyxCoax"], "🌧️ 吵架和好": ["gyxMakeup"], "🌳 秘密树洞": ["gyxSecret"], "🚶 陪你": ["gyxBeat", "gyxCoach", "gyxCook", "gyxMis", "gyxShake", "gyxStill", "gyxStudy", "gyxTrip", "gyxWalk"], "🚶 陪你散步": ["gyxWalk"], "🍳 一起做饭": ["gyxCook"], "📚 一起自习室": ["gyxStudy"], "🏃 TA是你的私教": ["gyxCoach"], "✈️ 一起旅行": ["gyxTrip"], "📮 现实小任务": ["gyxMis"], "🕯️ 一起安静待着": ["gyxStill"], "💓 听心跳": ["gyxBeat"], "📳 摇一摇贴贴": ["gyxShake"], "💓 贴贴": ["gyxBeat"], "🎛️ 开关和后台": ["gyxGen", "gyxMystic", "gyxSaver", "gyxSwitch", "gyxVary", "gyxWebInvite"], "🎛️ 功能开关中心": ["gyxMystic", "gyxSwitch", "gyxWebInvite"], "🔋 省电模式": ["gyxSaver"], "💬 文案不重样": ["gyxVary"], "⏳ 生成中提示": ["gyxGen"], "📱 小手机": ["gyx3d", "gyx3dPage", "gyxApps", "gyxCallPlus", "gyxMemo", "gyxPet", "gyxPhoneW", "gyxPing", "gyxRing"], "📝 TA的备忘录": ["gyxMemo"], "🧩 AI小程序": ["gyxApps"], "📞 来电": ["gyxCallPlus", "gyxRing"], "📲 手机桌面小组件": ["gyxPhoneW"], "🧸 桌面上的TA": ["gyxPet"], "🧊 3D小人": ["gyx3d", "gyx3dPage"], "📤 角标和分享": ["gyxPing"], "📞 来电动画和铃声": ["gyxCallPlus", "gyxRing"], "📞 来电增强": ["gyxCallPlus", "gyxRing"], "🎨 美化": ["gyxBubble", "gyxDayNight", "gyxMoodSkin", "gyxShop", "gyxStTheme", "gyxSwipe"], "🫧 气泡工坊": ["gyxBubble"], "🎨 酒馆主题": ["gyxStTheme"], "🌗 日夜主题": ["gyxDayNight"], "👉 跟手返回": ["gyxSwipe"], "🛍️ 装扮商店": ["gyxShop"], "🌈 情绪皮肤": ["gyxMoodSkin"], "🎁 TA给你的": ["gyxDoodle", "gyxDream", "gyxMystic"], "🌙 TA的梦": ["gyxDream"], "🎨 涂鸦互传": ["gyxDoodle"], "🔮 神秘学加量": ["gyxMystic"], "🪐 换个世界玩": ["gyxSide", "gyxSwap", "gyxTheater", "gyxWorld"], "🪐 平行世界": ["gyxWorld"], "🎭 换个世界": ["gyxTheater"], "🔄 互换身份": ["gyxSwap"], "🎬 番外隔离": ["gyxSide"], "🧠 记忆": ["gyxNotes", "gyxRoll"], "❄️ 总结滚雪球": ["gyxRoll"], "📇 生活小档案": ["gyxNotes"], "🌐 外面的世界": ["gyxHot", "gyxWeather"], "🌦️ 天气联动": ["gyxWeather"], "🔥 真实热搜": ["gyxHot"], "💭 聊天细节": ["gyxLang", "gyxReact"], "🌐 外语和翻译": ["gyxLang"], "🫶 气泡表情回应": ["gyxReact"], "🧺 生活": ["gyxBook", "gyxCare"], "🧾 一起记账": ["gyxBook"], "🍙 反向养成": ["gyxCare"], "🎬 开场动画合集": ["gyxIntro"]}}/*END*/;
    function prune(boot) {
        try {
            if (typeof plugins === 'undefined' || !Array.isArray(plugins) || !plugins.length) return 0;
            const nm = p => String(p && p.name || '').trim(), has = new Set(plugins.map(nm));
            const drop = new Map();   // 旧名 → 合并版名
            Object.keys(BUN.bundles || {}).forEach(b => { if (!has.has(b)) return; BUN.bundles[b].forEach(([o, fids]) => { if (o !== b && has.has(o)) drop.set(o, { b, fids }); }); });
            (BUN.retired || []).forEach(o => { if (has.has(o)) drop.set(o, { b: '' }); });
            // 283：新玩法都内置了（js/62）——装过的插件一律拿掉，关着的那几个功能照样关着
            if (window.__gyPlayBuiltin) Object.keys(BUN.builtin || {}).forEach(o => { if (has.has(o)) drop.set(o, { b: '内置', fids: BUN.builtin[o] }); });
            if (!drop.size) return 0;
            let FS = {}; try { FS = JSON.parse(localStorage.getItem('gyxFeat') || '{}') || {}; } catch (e) {}
            for (let i = plugins.length - 1; i >= 0; i--) {
                const d = drop.get(nm(plugins[i])); if (!d) continue;
                if (plugins[i].enabled === false && d.fids) d.fids.forEach(f => { FS[f] = false; });   // 你原来关着的，合并后那一项也关着
                plugins.splice(i, 1);
            }
            try { const bi = [...drop.values()].filter(d => d.b === '内置').length; if (bi) localStorage.setItem('gyPlayPruned', String((+localStorage.getItem('gyPlayPruned') || 0) + bi)); } catch (e) {}
            try { localStorage.setItem('gyxFeat', JSON.stringify(FS)); } catch (e) {}
            try { saveAllData(); } catch (e) {}
            try { if (typeof renderPluginsList === 'function') renderPluginsList(); } catch (e) {}
            if (!boot) {
                const n = drop.size, old = [...drop.keys()].filter(o => !drop.get(o).b), bi = [...drop.keys()].filter(o => drop.get(o).b === '内置').length, merged = n - old.length - bi;
                try { showToast('', '🧩', bi ? `新玩法已经内置进谷雨了，拿掉了装过的 ${bi} 个插件——数据和开关都还在，刷新一下就好` : (merged ? `合并版装好了，拿掉了旧的 ${merged} 个单独插件` : '') + (old.length ? `${merged ? '；' : ''}${old.join('、')} 已经不要了` : '') + '——刷新一下就换成新的（数据都还在）', null, null, false); } catch (e) {}
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
.gyhb-go{padding:9px 18px;border-radius:14px;border:none;background:#1d1d1f;color:#fff;cursor:pointer;font-family:inherit;font-size:14px}
/* 283 小功能首页 */
#miniFeatureList.gyhm-on>div:first-child:not(.gyhm-grid):not(#gyHubBar){display:none}
.gyhm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:4px 0 16px}
.gyhm-t{min-width:0;box-sizing:border-box;border:none;border-radius:22px;padding:14px;min-height:128px;color:#fff;display:flex;flex-direction:column;align-items:flex-start;text-align:left;cursor:pointer;font-family:inherit;box-shadow:0 6px 18px rgba(0,0,0,.08)}
.gyhm-t em{font-style:normal;font-size:30px;line-height:1}.gyhm-t b{font-size:18px;margin-top:auto}.gyhm-t span{font-size:12.5px;opacity:.88;margin-top:3px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gyhm-t:active{transform:scale(.97)}
.gyhm-grid>.gyhm-t:last-child:nth-child(odd){grid-column:span 2;min-height:104px}
.gyhm-sh{font-size:20px;font-weight:700;margin:2px 4px 10px}.gyhm-apps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px 6px;margin:0 0 18px}
.gyhm-a{border:0;background:none;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-family:inherit;color:inherit;min-width:0}.gyhm-a i{font-style:normal;width:58px;height:58px;border-radius:15px;display:grid;place-items:center;font-size:28px;box-shadow:0 4px 12px rgba(0,0,0,.1)}.gyhm-a span{font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gyhm-a:active i{transform:scale(.94)}
.gyhm-more{font-size:13px;color:#8b98a5;margin:4px 4px 8px}.gyhm-foot{text-align:center;margin:18px 0 6px}.gyhm-foot span{font-size:12.5px;color:#8b98a5;cursor:pointer;text-decoration:underline}
/* 282 合集一页 */
.gyhb-ov{--hc:#f2f2f7;--hk:#fff;--hs:#8e8e93;--hf:rgba(120,120,128,.12);--hl:rgba(60,60,67,.18)}
body.dark-theme .gyhb-ov{--hc:#000;--hk:#1c1c1e;--hl:rgba(84,84,88,.6);--hf:rgba(120,120,128,.24)}
.gyhb-box:has(.gyhb-pills:not(:empty)){background:var(--hc)}
.gyhb-more{cursor:pointer;width:30px;height:30px;border-radius:15px;background:var(--hf);display:inline-flex;align-items:center;justify-content:center;font-size:15px;color:#8e8e93;flex:none}
.gyhb-pills{position:sticky;top:0;z-index:2;display:flex;gap:8px;overflow-x:auto;padding:2px 16px 12px;background:inherit;scrollbar-width:none}.gyhb-pills::-webkit-scrollbar{display:none}.gyhb-pills:empty{display:none}
.gyhb-pills button{flex:none;border:none;height:32px;padding:0 13px;border-radius:16px;background:var(--hk);color:inherit;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap}
.gyhb-pills button.on{background:#1d1d1f;color:#fff}body.dark-theme .gyhb-pills button.on{background:#f2f2f7;color:#000}
.gyhb-lt{font-size:30px;font-weight:700;padding:2px 18px 12px;letter-spacing:.2px}.gyhb-lt:empty{display:none}.gyhb-pills .gyhb-pm{background:var(--hf);color:var(--hs);min-width:40px}
.gyhb-card2{background:var(--hk);border-radius:18px;margin:0 14px 12px;padding:13px 16px;cursor:pointer}
.gyhb-ch{display:flex;align-items:center;gap:8px;font-size:15.5px}.gyhb-ch b{flex:1;font-weight:600}.gyhb-ch .gyhb-ci{font-size:18px}.gyhb-ca{color:#c4c4c7}
.gyhb-rows{margin-top:8px}.gyhb-tr{display:flex;gap:10px;align-items:baseline;padding:5px 0;font-size:14.5px}.gyhb-tr span{flex:none;color:var(--hs);min-width:3.5em}.gyhb-tr em{font-style:normal;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}.gyhb-tr.go em{color:inherit}
.gyhb-w{margin-top:8px;background:var(--hf);border-radius:14px;padding:10px 12px;min-height:56px;--pm-sub:var(--hs)}.gyhb-w .gw-x{gap:4px}.gyhb-w .gw-x em{font-size:13px}
.gyhb-w .gw-x .h{display:none}.gyhb-w .gw-x.m em:first-of-type{font-size:14px;color:inherit}
/* 284 一页 = 一组小组件 */
.gyv{padding:0 14px 8px}.gyv-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:12px}
.gyv-t{--a:#007aff;min-width:0;box-sizing:border-box;border-radius:22px;padding:14px 15px;min-height:132px;cursor:pointer;display:flex;flex-direction:column;background:var(--hk);background:linear-gradient(160deg,color-mix(in srgb,var(--a) 16%,#fff),color-mix(in srgb,var(--a) 32%,#fff));color:color-mix(in srgb,var(--a) 55%,#000)}
body.dark-theme .gyv-t{background:var(--hk);background:linear-gradient(160deg,color-mix(in srgb,var(--a) 22%,#1c1c1e),color-mix(in srgb,var(--a) 38%,#1c1c1e));color:color-mix(in srgb,var(--a) 45%,#fff)}
.gyv-t:active,.gyv-big:active{transform:scale(.97)}.gyv-t.w{grid-column:span 2;min-height:0}
.gyv-t.live{background:linear-gradient(160deg,var(--a),color-mix(in srgb,var(--a) 70%,#000));color:#fff}
.gyv-k{font-size:13px;font-weight:600;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gyv-n{font-size:30px;font-weight:700;line-height:1.15;margin-top:auto;padding-top:10px;letter-spacing:-.3px}.gyv-n small{font-size:14px;font-weight:600;margin-left:3px;opacity:.75}
.gyv-n.tx{font-size:17px;line-height:1.35;letter-spacing:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.gyv-n.ds{font-size:13.5px;font-weight:500;line-height:1.5;-webkit-line-clamp:3;opacity:.9}
.gyv-s{font-size:12.5px;opacity:.8;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gyv-t.w .gyv-s{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.gyv-t.hero{text-align:center;align-items:center}.gyv-h{font-size:64px;line-height:1.2;margin-top:8px}.gyv-t.hero .gyv-n{margin-top:0;padding-top:4px}
.gyv-q{background:var(--hk);border-radius:22px;text-align:center;padding:20px 16px;font-size:17px;font-weight:600;margin-bottom:12px}
.gyv-big{border-radius:22px;height:110px;color:#fff;font-weight:600;font-size:16px;padding:14px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.08)}.gyv-big em{font-style:normal;font-size:30px;margin-bottom:auto}
.gyv-gh{font-size:20px;font-weight:700;margin:6px 4px 10px}.gyv-hint{text-align:center;color:var(--hs);font-size:13px;padding:2px 0 14px}
.gyp-ic{flex:none;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}.gyp-r{cursor:pointer}.gyp-r .t small,.gyhb-srow .t small{display:block;font-size:12.5px;color:var(--hs);margin-top:1px}.gyp-chev{color:#c4c4c7;font-size:17px;width:14px;text-align:center}.gyp-sub{padding-left:28px;font-size:14.5px}
.gyct-tip{font-size:12px;color:#536471;margin:-2px 0 8px}.gyct-h{font-size:13px;color:#8e8e93;margin:10px 4px 6px}.gyct-g{border-radius:12px;overflow:hidden;border:1px solid rgba(120,120,128,.18)}
.gyct-r{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-top:1px solid rgba(120,120,128,.14)}.gyct-r:first-child{border-top:0}.gyct-r .i{font-size:18px}.gyct-r .t{flex:1;min-width:0;font-size:14.5px}.gyct-r .t small{display:block;font-size:12px;color:#8e8e93;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gyct-r .c{color:#c4c4c7}.gyct-r input{flex:none}
.gyhb-d{margin:6px 0 0;font-size:13.5px;color:var(--hs);line-height:1.6}
.gyhb-more2{text-align:center;color:var(--hs);font-size:13.5px;padding:4px 0 20px;cursor:pointer}
.gyhb-body .gyx-inhub{background:var(--hk);border-radius:18px;margin:0 14px 14px}
.gyhb-sheet{position:absolute;inset:0;z-index:20;background:rgba(0,0,0,.3);display:flex;align-items:flex-end;justify-content:center}
.gyhb-ov .gyhb-sheet{position:fixed}
.gyhb-sbox{background:var(--hc);color:inherit;width:min(600px,100%);max-height:85vh;overflow:auto;border-radius:14px 14px 0 0;padding-bottom:26px}
.gyhb-shd{display:flex;justify-content:space-between;align-items:center;padding:16px;font-size:16px;position:sticky;top:0;background:var(--hc)}.gyhb-shd span{color:#007aff;cursor:pointer}.gyhb-shd .k{font-weight:600}
.gyhb-sgh{font-size:13px;color:var(--hs);padding:8px 32px 6px}
.gyhb-sgrp{background:var(--hk);border-radius:12px;margin:0 16px 16px;overflow:hidden}
.gyhb-srow{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:15.5px;border-top:.5px solid var(--hl)}.gyhb-srow:first-child{border-top:0}.gyhb-srow .t{flex:1;min-width:0}
.gyhb-srow .mv{width:24px;text-align:center;color:#007aff;cursor:pointer}
.gyhb-srow input{appearance:none;-webkit-appearance:none;width:51px;height:31px;border-radius:16px;background:var(--hf);position:relative;cursor:pointer;flex:none;margin:0;transition:background .2s}.gyhb-srow input::after{content:"";position:absolute;left:2px;top:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.15);transition:transform .2s}.gyhb-srow input:checked{background:#34c759}.gyhb-srow input:checked::after{transform:translateX(20px)}`;
    document.head.appendChild(css);
    window.gyHubInfo = () => ({ on: on(), HOSTS: HOSTS.map(h => ({ host: h.host, kids: h.kids })), FOLDERS: window.gyHubFolders(), SET_IDS, CAT, HIDE: [...HIDE] });
    tick(); setInterval(tick, 800);
})();
