/* ===========================================================================
   js/62 —— 📱 小手机模式（设置里一键切换，数据还是同一份）
   ---------------------------------------------------------------------------
   打开后整个谷雨变成一台手机（简约手绘风）：
   · 桌面：状态栏（时间/信号/电量）、时钟小组件、「最近在聊」小组件、一格格 App 图标、底下 Dock
   · 点图标 = 打开谷雨原来那个功能，就在这台手机的屏幕里显示；顶上「‹ 标题」、底下那条小横杠都回桌面
   · 电脑上：屏幕正中一台手机；手机上：整屏就是这台手机
   · 壁纸可以换（「壁纸」那个图标），存在本机，不进存档

   跟微信模式互斥（开一个另一个自动关）。所有样式都挂在 body.gyphm 上，关掉就原样回来，
   平时的谷雨一条不改。开关存在 localStorage('gyPhoneMode')。
   =========================================================================== */
(function () {
    'use strict';
    // 认出「安卓打包的 App」（HBuilderX 5+ 壳：有 window.plus，UA 里带 Html5Plus），下面有几条样式只在 App 里换个写法
    try { const mk = () => document.documentElement.classList.add('gy-apk'); if (window.plus || /Html5Plus/i.test(navigator.userAgent)) mk(); document.addEventListener('plusready', mk); } catch (e) {}
    if (window.__gyPmLoaded) return;
    window.__gyPmLoaded = true;

    const KEY = 'gyPhoneMode';
    const S = { app: false, view: null, title: '', wall: null, sheet: false };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const chars = () => (typeof myCharacters !== 'undefined' && Array.isArray(myCharacters)) ? myCharacters : [];
    const groups = () => (typeof groupChats !== 'undefined' && Array.isArray(groupChats)) ? groupChats : [];
    const sessOf = id => groups().find(g => String(g.id) === String(id)) || chars().find(c => String(c.id) === String(id));
    const av = (x, n) => { try { return x && x.members ? getGroupAvatarHTML(x, n) : getAvatarHTML(x, n); } catch (e) { return ''; } };
    const isOn = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
    const isDesk = () => window.innerWidth > 900;
    const pad = n => String(n).padStart(2, '0');
    const store = (() => { try { return localforage.createInstance({ name: 'gyPhoneMode', storeName: 'wall' }); } catch (e) { return null; } })();

    /* ---------------- 手绘线稿图标 ---------------- */
    const P = {
        chat: '<path d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4 3v-3H5A1.5 1.5 0 0 1 3.5 16V8A1.5 1.5 0 0 1 5 6.5z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>',
        home: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
        diary: '<path d="M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z"/><path d="M5 18a2 2 0 0 1 2-2h11M9 8h6M9 11h4"/>',
        forum: '<path d="M4 9h16M6 9v9M10 9v9M14 9v9M18 9v9M3 20h18M12 3l9 5H3z"/>',
        mask: '<path d="M4 6c3 1 13 1 16 0 0 7-3 12-8 12S4 13 4 6z"/><path d="M8 11c1-.8 2-.8 3 0M13 11c1-.8 2-.8 3 0M10 15c1.2.8 2.8.8 4 0"/>',
        theater: '<rect x="4" y="5" width="16" height="12" rx="2"/><path d="M10 9l5 2.5-5 2.5z"/><path d="M8 20h8"/>',
        cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17h.01M12 17h.01"/>',
        today: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M9.5 15.5l1.8 1.5 3.2-3.5"/>',
        music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
        film: '<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M3.5 10h17M8 6l-1.5 4M13 6l-1.5 4M18 6l-1.5 4"/>',
        book: '<path d="M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5c-3-.5-6 0-8 1.5z"/><path d="M12 6v14.5"/>',
        bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
        map: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
        web: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/>',
        puzzle: '<path d="M5 9h3a2 2 0 1 1 4 0h3v3a2 2 0 1 0 0 4v3H5v-3a2 2 0 1 0 0-4z"/>',
        people: '<circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.3"/><path d="M3.5 19c.5-3 2.7-5 5.5-5s5 2 5.5 5M14.5 14.5c2.8-.6 5.2 1 6 4.5"/>',
        bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
        gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M6 18l1.8-1.8M16.2 7.8L18 6"/>',
        image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4 3.5 3 2.5-2 3.5 3"/>',
        brain: '<path d="M9 5a3 3 0 0 0-3 3 3 3 0 0 0-1 5.5A3 3 0 0 0 9 19h1V5zM15 5a3 3 0 0 1 3 3 3 3 0 0 1 1 5.5A3 3 0 0 1 15 19h-1V5z"/>',
        gossip: '<circle cx="12" cy="12" r="2"/><circle cx="5" cy="6" r="1.6"/><circle cx="19" cy="6" r="1.6"/><circle cx="5" cy="18" r="1.6"/><circle cx="19" cy="18" r="1.6"/><path d="M6.3 7.2l4.2 3.6M17.7 7.2l-4.2 3.6M6.3 16.8l4.2-3.6M17.7 16.8l-4.2-3.6"/>',
        lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2"/>',
        apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
        wallet: '<rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M3.5 10h17M15.5 14.5h2"/>',
        kit: '<path d="M6 9h12l-1 11H7z"/><path d="M9 9a3 3 0 0 1 6 0M4 9h16"/>',
        cake: '<path d="M5 12h14v8H5z"/><path d="M5 15c2 1 3-1 5 0s3-1 5 0 3-1 4 0M12 12V8M12 5.5v.01"/>',
        heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
        smile: '<circle cx="12" cy="12" r="8"/><path d="M9 10h.01M15 10h.01M8.5 14c1.8 2 5.2 2 7 0"/>',
        brush: '<path d="M14.5 4.5l5 5-7.5 7.5-5-5z"/><path d="M7 12.5c-2 0-3.5 1.5-3.5 3.5 0 1.7-.5 3-1 3.5 3 0 7-.5 7-4.5"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
        wifi: '<path d="M4 9.5a12 12 0 0 1 16 0M7 12.8a7.5 7.5 0 0 1 10 0M10 16a3 3 0 0 1 4 0"/><path d="M12 19h.01"/>'
    };
    const svg = (k, sw) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 1.7}" stroke-linecap="round" stroke-linejoin="round">${P[k] || ''}</svg>`;

    // 所有 App：[key, 名字, 图标, 底色, 打开方式]。哪些摆在桌面、哪页、Dock 放哪几个，都在 js/63 的桌面布局里（能自己改）
    const APPS = [
        ['chat', '聊天', 'chat', '#dcefe0', { view: 'chat' }],
        ['home', '推特', 'home', '#e1e9fa', { view: 'home' }],
        ['diary', '信件日记', 'diary', '#fbe6d6', { view: 'diary' }],
        ['theater', 'TA们', 'theater', '#efe5fa', { view: 'theater' }],
        ['today', '今天', 'today', '#fff1c2', { today: 1 }],
        ['calendar', '日历', 'cal', '#fde8e8', { fn: 'gyPmCalendar', native: true }],
        ['forum', '论坛', 'forum', '#e5eef0', { view: 'novel' }],
        ['anon', '匿名区', 'mask', '#ececec', { view: 'anonForum' }],
        ['gossip', '八卦网', 'gossip', '#fbe1e8', { feature: 'gossip' }],
        ['music', '音乐', 'music', '#fde0e0', { feature: 'music' }],
        ['film', '电影', 'film', '#e0e6f5', { view: 'watchTogether' }],
        ['book', '阅读', 'book', '#f3ecd9', { feature: 'reading_together' }],
        ['mall', '购物', 'bag', '#ffe6cc', { view: 'mall' }],
        ['map', '地图', 'map', '#dff1ea', { feature: 'map' }],
        ['mini', '小功能', 'puzzle', '#e8f3d8', { view: 'miniHub' }],
        ['chars', '角色', 'people', '#e6e3f7', { view: 'characterCenter' }],
        ['mem', '记忆', 'brain', '#f7e3ef', { view: 'memoryHub' }],
        ['photos', '相册', 'image', '#e3f0f7', { fn: 'gyGalleryOpen' }],
        ['wallet', '账单', 'wallet', '#e9f1dc', { fn: 'gyBillOpen', args: ['me'] }],
        ['kit', '随身物', 'kit', '#f4e9dc', { feature: 'kit' }],
        ['days', '日子', 'cake', '#fde8ee', { feature: 'days' }],
        ['rel', '关系账本', 'heart', '#fbe3e3', { feature: 'relations' }],
        ['now', '此刻', 'web', '#e2eef7', { feature: 'now' }],
        ['emo', '表情', 'smile', '#fff4d6', { feature: 'emoticon' }],
        ['notif', '通知', 'bell', '#fff1c2', { view: 'notifications' }],
        ['set', '设置', 'gear', '#ececec', { view: 'settings' }],
        ['beauty', '美化', 'brush', '#f1e6fa', { sheet: 'beauty' }],
        ['lockscr', '锁屏', 'lock', '#e9e9eb', { fn: 'gyPmLockNow' }]
    ];

    /* ---------------- 样式 ---------------- */
    const HAND = '"LXGW WenKai","霞鹜文楷","KaiTi","STKaiti","楷体",serif';
    const CSS = `
/* ===== 小手机：iOS / ins 风（黑白灰、白卡、柔阴影、胶囊按钮）。颜色都走变量，深色外观只换变量 ===== */
body.gyphm{--pm-bg:#f2f2f4;--pm-card:#ffffff;--pm-text:#111111;--pm-sub:#8e8e93;--pm-hair:rgba(0,0,0,.08);--pm-fill:#f2f2f4;--pm-glass:rgba(255,255,255,.72);--pm-shadow:0 10px 28px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.05);--pm-ic-bg:#ffffff;--pm-ic-fg:#111111;--pm-accent:#111111;--pm-accent-fg:#ffffff;--pm-red:#ff3b30;--pm-font:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",sans-serif;--pm-num:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue","PingFang SC",sans-serif}
body.gyphm.pm-dark{--pm-bg:#0b0b0c;--pm-card:#1c1c1e;--pm-text:#f5f5f7;--pm-sub:#8e8e93;--pm-hair:rgba(255,255,255,.1);--pm-fill:#2c2c2e;--pm-glass:rgba(40,40,42,.72);--pm-shadow:0 10px 28px rgba(0,0,0,.4);--pm-ic-bg:#1c1c1e;--pm-ic-fg:#f5f5f7;--pm-accent:#f5f5f7;--pm-accent-fg:#111}
#gyPm,#gyPmBar,#gyPmHome,#gyPmInd,#gyPmSheet{display:none;font-family:var(--pm-font);color:var(--pm-text);-webkit-font-smoothing:antialiased}
body.gyphm #gyPm{display:block}
/* 电脑：屏幕中间一台 iPhone */
#gyPm{position:fixed;inset:0;z-index:1990;pointer-events:none}
#gyPm .pm-bg{position:absolute;inset:0;background:#ebebee;background-image:radial-gradient(rgba(0,0,0,.035) 1px,transparent 1.3px),radial-gradient(circle at 20% 10%,#fff 0,transparent 45%),radial-gradient(circle at 85% 90%,#f7f7f9 0,transparent 40%);background-size:22px 22px,100% 100%,100% 100%;pointer-events:auto}
body.pm-dark #gyPm .pm-bg{background-color:#151516;background-image:radial-gradient(rgba(255,255,255,.04) 1px,transparent 1.3px);background-size:22px 22px}
#gyPm .pm-frame{position:absolute;left:var(--pm-fl);top:var(--pm-ft);width:var(--pm-fw);height:var(--pm-fh);border-radius:56px;background:#161617;box-shadow:0 0 0 1.5px #3a3a3c inset,0 40px 90px rgba(0,0,0,.22),0 12px 30px rgba(0,0,0,.14);pointer-events:auto}
#gyPm .pm-btn{position:absolute;width:3px;border-radius:2px;background:#2c2c2e}
#gyPm .pm-btn.a{left:-3px;top:130px;height:30px}#gyPm .pm-btn.b{left:-3px;top:178px;height:58px}#gyPm .pm-btn.c{right:-3px;top:196px;height:86px}
#gyPm .pm-cap{position:absolute;left:50%;transform:translateX(-50%);bottom:-30px;font-size:12px;letter-spacing:3px;color:#a1a1a6;white-space:nowrap;text-transform:uppercase}
body.gyphm-mob #gyPm .pm-bg,body.gyphm-mob #gyPm .pm-frame{display:none}
/* 屏幕 */
#gyPmHome{position:fixed;left:var(--pm-sl);top:var(--pm-st);width:var(--pm-sw);height:var(--pm-sh);z-index:1995;border-radius:var(--pm-sr);overflow:hidden;background:var(--pm-bg);background-size:cover;background-position:center}
body.gyphm #gyPmHome{display:flex;flex-direction:column}
body.gyphm.gyphm-app #gyPmHome{display:none}
/* 状态栏 */
.pm-sb{height:50px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:4px 30px 0 34px;font-size:15px;font-weight:600;color:var(--pm-text);position:relative;letter-spacing:.2px;font-family:var(--pm-num)}
.pm-sb .r{display:flex;align-items:center;gap:6px}
.pm-sb svg{width:17px;height:17px}
.pm-sig{display:flex;align-items:flex-end;gap:1.6px;height:11px}.pm-sig i{width:3px;border-radius:1px;background:currentColor;display:block}
.pm-bat{min-width:26px;height:13px;border-radius:4px;background:currentColor;position:relative;display:flex;align-items:center;justify-content:center;padding:0 3px;box-sizing:border-box}
.pm-bat::after{content:"";position:absolute;right:-3px;top:4px;width:1.5px;height:5px;border-radius:0 1px 1px 0;background:currentColor;opacity:.5}
.pm-bat b{font-size:9.5px;font-weight:700;color:var(--pm-bg);line-height:1}
.pm-bat.low{background:var(--pm-red)}
.pm-bat.saver{background:#ffcc00}.pm-bat.saver b{color:#111}
.pm-isl{position:absolute;left:50%;top:11px;transform:translateX(-50%);width:108px;height:31px;border-radius:17px;background:#000}
body.gyphm-mob .pm-isl{display:none}
body.gyphm-mob .pm-sb{padding-top:env(safe-area-inset-top);height:calc(46px + env(safe-area-inset-top))}
#gyPmHome.has-wall .pm-sb{color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.25)}
#gyPmHome.has-wall .pm-sb .pm-bat b{color:#333}
/* 小组件卡片（共用） */
.pm-w{background:var(--pm-card);border-radius:24px;padding:14px 16px;margin-bottom:14px;box-shadow:var(--pm-shadow);color:var(--pm-text)}
.pm-clock{display:flex;align-items:flex-end;justify-content:space-between;gap:8px}
.pm-clock .t{font-family:var(--pm-num);font-size:56px;font-weight:200;line-height:.95;letter-spacing:-1px}
.pm-clock .d{text-align:right;font-size:13px;line-height:1.5;color:var(--pm-sub);font-weight:500}
.pm-clock .d b{display:block;font-size:17px;color:var(--pm-text);font-weight:600}
.pm-note{margin-top:12px;padding-top:10px;border-top:.5px solid var(--pm-hair);font-size:13px;display:flex;align-items:center;gap:7px;color:var(--pm-sub)}
.pm-note .dot{width:7px;height:7px;border-radius:50%;background:var(--pm-red);flex-shrink:0}
.pm-last{display:flex;align-items:center;gap:12px;cursor:pointer}
.pm-last .av{width:46px;height:46px;border-radius:50%;overflow:hidden;flex-shrink:0;display:flex;box-shadow:0 0 0 .5px var(--pm-hair)}
.pm-last .av>*{width:100%!important;height:100%!important;border-radius:50%!important;border:none!important;box-shadow:none!important;margin:0!important}
.pm-last .m{flex:1;min-width:0}
.pm-last .n{font-size:16px;font-weight:600}
.pm-last .p{font-size:13px;color:var(--pm-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
.pm-last .k{font-size:11.5px;color:var(--pm-sub);flex-shrink:0;align-self:flex-start;margin-top:4px}
/* 图标 */
.pm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px 8px;padding:4px 0 8px}
.pm-app{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent}
.pm-ic{width:60px;height:60px;border-radius:16px;display:flex;align-items:center;justify-content:center;color:var(--pm-ic-fg);background:var(--pm-ic-bg)!important;box-shadow:var(--pm-shadow);transition:transform .15s}
.pm-app:active .pm-ic{transform:scale(.9)}
.pm-ic .pm-emo{font-size:30px;line-height:1}
.pm-ic svg{width:28px;height:28px}
.pm-lb{font-size:11.5px;color:var(--pm-text);white-space:nowrap;font-weight:500;letter-spacing:.2px}
#gyPmHome.has-wall .pm-page .pm-lb{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.35)}
.pm-badge{position:absolute;top:-6px;right:calc(50% - 38px);min-width:20px;height:20px;border-radius:10px;background:var(--pm-red);color:#fff;font-size:11.5px;font-weight:600;line-height:20px;text-align:center;padding:0 6px;box-sizing:border-box;font-family:var(--pm-num)}
.pm-dock{flex-shrink:0;margin:0 12px 12px;padding:12px 8px;border-radius:32px;background:var(--pm-glass);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);display:grid;grid-template-columns:repeat(4,1fr);box-shadow:0 0 0 .5px var(--pm-hair)}
.pm-dock .pm-lb{display:none}
.pm-dock .pm-ic{box-shadow:0 2px 8px rgba(0,0,0,.06)}
body.gyphm-mob .pm-dock{margin-bottom:calc(12px + env(safe-area-inset-bottom))}
.pm-pg{display:flex;justify-content:center;gap:7px;margin:2px 0 8px}.pm-pg i{width:6px;height:6px;border-radius:50%;background:var(--pm-text);opacity:.2}.pm-pg i.on{opacity:.85}
/* 打开 App 之后：顶栏 */
#gyPmBar{position:fixed;left:var(--pm-sl);top:var(--pm-st);width:var(--pm-sw);z-index:2003;background:var(--pm-glass);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);border-bottom:.5px solid var(--pm-hair);border-radius:var(--pm-sr) var(--pm-sr) 0 0;overflow:hidden}
body.gyphm.gyphm-app #gyPmBar{display:block}
#gyPmBar .nav{height:44px;display:flex;align-items:center;justify-content:center;position:relative;font-size:17px;font-weight:600}
#gyPmBar .nav .t{max-width:62%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#gyPmBar .nav .l{position:absolute;left:4px;top:0;bottom:0;display:flex;align-items:center;gap:0;padding:0 8px;cursor:pointer;font-size:16px;font-weight:400;color:var(--pm-text)}
#gyPmBar .nav .l svg{width:24px;height:24px}
#gyPmBar .nav .r{position:absolute;right:8px;top:0;bottom:0;display:flex;align-items:center;padding:0 8px;cursor:pointer;color:var(--pm-text);opacity:.85}
#gyPmBar .nav .r svg{width:21px;height:21px}
/* 小窗：App 缩成一个能拖的小窗口浮在桌面上，里面照样能点 */
body.gyphm.gyphm-float #gyPmHome{display:flex!important}
body.gyphm.gyphm-float #gyPmInd,body.gyphm.gyphm-float .fab-btn{display:none!important}
body.gyphm-mob.gyphm-float .main-content{position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;overflow-y:auto!important;z-index:2002!important;background:var(--pm-card)!important}
body.gyphm.gyphm-float #gyPmBar,body.gyphm.gyphm-float .main-content,body.gyphm.gyphm-float #gyPmApp{transition:transform .38s cubic-bezier(.2,.85,.25,1)}
body.gyphm.gyphm-float.pm-fl-drag #gyPmBar,body.gyphm.gyphm-float.pm-fl-drag .main-content,body.gyphm.gyphm-float.pm-fl-drag #gyPmApp{transition:none}
#gyPmFloat{display:none;position:fixed;z-index:2006;pointer-events:none}
#gyPmPip{position:fixed;z-index:2007;border-radius:18px;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 18px 40px rgba(0,0,0,.28);background:var(--pm-card,#fff)}
#gyPmPip .scr{position:absolute;inset:0;border-radius:18px;overflow:hidden}
#gyPmPip .inner{transform-origin:0 0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;background:var(--pm-bg,#fff)}
#gyPmPip .inner>*{display:var(--pd)!important;flex:1 0 auto;min-height:100%}
#gyPmPip.snap .inner{pointer-events:none}#gyPmPip.snap .scr{cursor:pointer}
#gyPmPip .gb{position:absolute;left:0;right:0;top:-30px;height:28px;display:flex;align-items:center;justify-content:space-between;cursor:grab;touch-action:none;padding:0 4px}
#gyPmPip .gb i{font-style:normal;width:26px;height:26px;border-radius:50%;background:rgba(30,30,32,.72);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer}
#gyPmPip .gb b{font-size:11px;padding:3px 10px;border-radius:10px;background:rgba(30,30,32,.62);color:#fff;max-width:60%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:500}
body.gyphm-float #gyPmFloat{display:block}
#gyPmFloat .fr{position:absolute;inset:0;border-radius:18px;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 18px 40px rgba(0,0,0,.28)}
#gyPmFloat .gb{position:absolute;left:0;right:0;top:-30px;height:28px;display:flex;align-items:center;justify-content:space-between;pointer-events:auto;cursor:grab;touch-action:none;padding:0 4px}
#gyPmFloat .gb i{font-style:normal;width:26px;height:26px;border-radius:50%;background:rgba(30,30,32,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer}
#gyPmFloat .gb b{width:44px;height:5px;border-radius:3px;background:rgba(60,60,67,.55)}
#gyPmBar .nav .l.home .hm{width:30px;height:30px;border-radius:9px;background:var(--pm-fill);display:flex;align-items:center;justify-content:center}
#gyPmBar .nav .l.home svg{width:17px;height:17px}
body.gyphm-mob #gyPmBar{border-radius:0}
#gyPmInd{position:fixed;left:var(--pm-sl);width:var(--pm-sw);top:calc(var(--pm-st) + var(--pm-sh) - 22px);height:22px;z-index:2004;cursor:pointer;align-items:center;justify-content:center;pointer-events:none}
#gyPmInd i{pointer-events:auto;cursor:pointer}
#gyPmInd i{box-sizing:content-box;display:block;width:134px;height:5px;padding:8px 0;background-clip:content-box;border-radius:3px;background-color:var(--pm-text);opacity:.85}
body.gyphm-desk.gyphm-app #gyPmInd{display:flex}
/* 谷雨原来的页面塞进屏幕 */
body.gyphm .sidebar-left,body.gyphm .sidebar-right,body.gyphm .mobile-bottom-nav,body.gyphm .mobile-topbar{display:none!important}
body.gyphm-desk #mainLayoutContainer{display:block!important;max-width:none!important;margin:0!important}
body.gyphm-desk .main-content{position:fixed!important;left:var(--pm-sl)!important;top:calc(var(--pm-st) + var(--pm-top))!important;width:var(--pm-sw)!important;max-width:none!important;height:calc(var(--pm-sh) - var(--pm-top))!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;z-index:2002!important;border:none!important;padding:0!important;margin:0!important;background:var(--pm-card)!important;border-radius:0 0 var(--pm-sr) var(--pm-sr)}
body.gyphm-desk #view-chat .chat-input-area{padding-bottom:26px!important}
body.gyphm-desk #view-chat,body.gyphm-desk #view-worldbook{height:100%!important;position:relative!important;top:auto!important;bottom:auto!important}
body.gyphm-mob .main-content{padding-top:calc(62px + env(safe-area-inset-top))!important;padding-bottom:0!important}
body.gyphm-mob #view-chat,body.gyphm-mob #view-worldbook{top:calc(62px + env(safe-area-inset-top))!important;bottom:0!important}
body.gyphm .main-content .header-title:has(> .back-btn){display:none!important}
body.gyphm:not(.gyphm-app) .main-content{visibility:hidden!important}
body.gyphm-desk .fab-btn{position:fixed!important;left:calc(var(--pm-sl) + var(--pm-sw) - 74px)!important;right:auto!important;top:calc(var(--pm-st) + var(--pm-sh) - 100px)!important;bottom:auto!important;z-index:2003!important}
body.gyphm:not(.gyphm-app) .fab-btn{display:none!important}
/* 原生 App（日历之类）的画布：跟谷雨的页面放在同一块地方 */
#gyPmApp{display:none;position:fixed;left:var(--pm-sl);top:calc(var(--pm-st) + var(--pm-top));width:var(--pm-sw);height:calc(var(--pm-sh) - var(--pm-top));z-index:2002;overflow-y:auto;background:var(--pm-bg);border-radius:0 0 var(--pm-sr) var(--pm-sr);font-family:var(--pm-font);color:var(--pm-text);box-sizing:border-box;padding-bottom:28px}
body.gyphm.gyphm-app #gyPmApp.on{display:block}
body.gyphm.gyphm-native .main-content{visibility:hidden!important}
body.gyphm-mob #gyPmApp{top:calc(62px + env(safe-area-inset-top));height:calc(100% - 62px - env(safe-area-inset-top))}
/* 聊天页自己那条「‹ 名字」跟上面的顶栏重复了：收起来（返回交给顶栏） */
body.gyphm #gyChatHead{display:none!important}
/* 手机上也有底下那条小横杠（回桌面） */
body.gyphm-mob.gyphm-app #gyPmInd{display:flex;position:fixed;top:auto;bottom:0;left:0;width:100%;height:calc(22px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);box-sizing:border-box}
body.gyphm-mob .main-content{padding-bottom:26px!important}
body.gyphm-mob #view-chat{bottom:calc(20px + env(safe-area-inset-bottom))!important}
/* 弹窗：电脑上关进手机屏幕里，不再盖满整个窗口 */
body.gyphm-desk .modal-overlay{left:var(--pm-sl)!important;top:var(--pm-st)!important;width:var(--pm-sw)!important;height:var(--pm-sh)!important;border-radius:var(--pm-sr);overflow:hidden;backdrop-filter:blur(6px)}
body.gyphm-desk .modal-overlay .modal-box,body.gyphm-desk .modal-overlay .modal-content{max-width:calc(var(--pm-sw) - 24px)!important;max-height:calc(var(--pm-sh) - 80px)!important;overflow-y:auto}
body.gyphm-desk .toast-container{top:calc(var(--pm-st) + 50px)!important;max-width:calc(var(--pm-sw) - 20px)}
/* 📱 手机上不显示「时间 · 信号 · 电量」那一行（手机自己有），只留一条细细的、能往下拉出通知中心的把手 */
body.gyphm-mob #gyPmHome .pm-sb,body.gyphm-mob #gyPmBar .pm-sb,body.gyphm-mob .pm-lock .pm-sb,body.gyphm-mob #gyPmNC .nc-sb{height:calc(18px + env(safe-area-inset-top))!important;padding:env(safe-area-inset-top) 0 0!important;justify-content:center}
body.gyphm-mob .pm-sb>*:not(.pm-ncgrab),body.gyphm-mob #gyPmNC .nc-sb>*{display:none!important}
body.gyphm-mob .pm-ncgrab{position:static!important;transform:none!important;width:90px!important;height:18px!important}
/* 🔔 通知中心 */
#gyPmNC{display:none;position:fixed;left:var(--pm-sl);top:var(--pm-st);width:var(--pm-sw);height:var(--pm-sh);z-index:2012;border-radius:var(--pm-sr);overflow:hidden;background:rgba(242,242,244,.8);backdrop-filter:blur(30px) saturate(1.6);-webkit-backdrop-filter:blur(30px) saturate(1.6);transform:translateY(-100%);transition:transform .32s cubic-bezier(.2,.85,.25,1);font-family:var(--pm-font);color:var(--pm-text)}
body.pm-dark #gyPmNC{background:rgba(20,20,22,.8)}
body.gyphm #gyPmNC.on,body.gyphm #gyPmNC.drag{display:block}
#gyPmNC.on{transform:none}
#gyPmNC.drag{transition:none}
#gyPmNC .nc-in{height:100%;display:flex;flex-direction:column}
#gyPmNC .nc-sb .pm-isl{display:none}
#gyPmNC .nc-sb{height:50px;display:flex;align-items:center;justify-content:space-between;padding:4px 30px 0 34px;font-size:15px;font-weight:600;font-family:var(--pm-num)}
#gyPmNC .nc-sb .r{display:flex;align-items:center;gap:6px}#gyPmNC .nc-sb svg{width:17px;height:17px}
body.gyphm-mob #gyPmNC .nc-sb{padding-top:env(safe-area-inset-top);height:calc(46px + env(safe-area-inset-top))}
#gyPmNC .nc-top{text-align:center;padding:8px 0 14px}
#gyPmNC .nc-d{font-size:16px;font-weight:600;opacity:.8}
#gyPmNC .nc-t{font-family:var(--pm-num);font-size:64px;font-weight:600;letter-spacing:-1.5px;line-height:1.05}
#gyPmNC .nc-bar{display:flex;justify-content:space-between;align-items:center;padding:14px 18px 8px}
#gyPmNC .nc-bar b{font-size:20px;font-weight:700}
#gyPmNC .nc-bar span{display:flex;gap:8px}
#gyPmNC .nc-bar i svg{width:14px;height:14px;vertical-align:-2px}
#gyPmNC .nc-bar i{font-style:normal;font-size:13px;font-weight:600;padding:6px 12px;border-radius:999px;background:var(--pm-glass);cursor:pointer;box-shadow:0 0 0 .5px var(--pm-hair)}
#gyPmNC .nc-list{flex:1;overflow-y:auto;padding:0 12px 10px;overscroll-behavior:contain}
#gyPmNC .nc-h{font-size:12px;font-weight:600;color:var(--pm-sub);margin:10px 6px 6px;letter-spacing:.5px}
#gyPmNC .nc-n{display:flex;gap:11px;align-items:flex-start;background:var(--pm-glass);border-radius:18px;padding:11px 13px;margin-bottom:8px;cursor:pointer;box-shadow:0 0 0 .5px var(--pm-hair),0 4px 14px rgba(0,0,0,.05)}
#gyPmNC .nc-n:active{transform:scale(.98)}
#gyPmNC .nc-n .ic{width:34px;height:34px;border-radius:9px;background:var(--pm-card);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,.08)}
#gyPmNC .nc-n .ic svg{width:19px;height:19px}
#gyPmNC .nc-n .tx{min-width:0;flex:1}
#gyPmNC .nc-n .hd{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
#gyPmNC .nc-n b{display:block;font-size:14px;font-weight:600;line-height:1.45;word-break:break-word}
#gyPmNC .nc-n em{font-style:normal;font-size:11px;color:var(--pm-sub);flex-shrink:0}
#gyPmNC .nc-n p{margin:3px 0 0;font-size:13.5px;line-height:1.55;color:var(--pm-text);opacity:.85;white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
#gyPmNC .nc-empty{text-align:center;color:var(--pm-sub);font-size:14px;padding:50px 0}
#gyPmNC .nc-grab{touch-action:none;height:34px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;padding-bottom:env(safe-area-inset-bottom)}
#gyPmNC .nc-grab i{width:134px;height:5px;border-radius:3px;background:var(--pm-text);opacity:.8}
/* 状态栏可以拉：浏览器别抢这个手势；整页也别触发下拉刷新 */
body.gyphm #gyPmHome .pm-sb,body.gyphm #gyPmBar .pm-sb{touch-action:none;cursor:grab}
html:has(body.gyphm),body.gyphm{overscroll-behavior-y:none}
/* 安卓打包的 App（HBuilderX 壳）里，根上加 overscroll-behavior 会让 WebView 外面那层原生容器接不到滚动，整页和弹出来的页面都滑不动。
   App 里本来就没有浏览器的下拉刷新，所以这一条在 App 里撤掉 */
html.gy-apk:has(body.gyphm),html.gy-apk body.gyphm{overscroll-behavior-y:auto}
/* 手机上那层「电脑版手机外壳」根本不显示，整个拿掉，免得它盖在页面上面挡住手指 */
body.gyphm-mob #gyPm{display:none!important}
html.gy-apk body.gyphm-mob .main-content,html.gy-apk body.gyphm .gyx-box,html.gy-apk body.gyphm .gyx-bd,html.gy-apk body.gyphm .modal-content,html.gy-apk body.gyphm #gyPmApp{touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch}
/* 手机上状态栏下面那颗小横条：不用拉，点它也能打开通知 */
.pm-ncgrab{display:none}
body.gyphm-mob .pm-ncgrab{display:flex;position:absolute;left:50%;transform:translateX(-50%);bottom:-2px;width:60px;height:14px;align-items:center;justify-content:center;cursor:pointer;touch-action:none;z-index:3}
body.gyphm-mob .pm-ncgrab i{width:36px;height:4px;border-radius:2px;background:currentColor;opacity:.25}
/* 底部抽屉（iOS sheet） */
#gyPmSheet{position:fixed;left:var(--pm-sl);width:var(--pm-sw);top:var(--pm-st);height:var(--pm-sh);z-index:2010;border-radius:var(--pm-sr);overflow:hidden;background:rgba(0,0,0,.28);align-items:flex-end}
body.gyphm #gyPmSheet.on{display:flex}
#gyPmSheet .box{width:100%;background:var(--pm-bg);border-radius:26px 26px 0 0;padding:10px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.12);animation:pmSheetUp .28s cubic-bezier(.2,.8,.2,1)}
#gyPmSheet .box::before{content:"";display:block;width:38px;height:5px;border-radius:3px;background:var(--pm-sub);opacity:.4;margin:0 auto 12px}
@keyframes pmSheetUp{from{transform:translateY(40%);opacity:.4}}
#gyPmSheet .box.still{animation:none}
#gyPmSheet h4{margin:0 0 14px;font-size:17px;font-weight:600;text-align:center;color:var(--pm-text)}
#gyPmSheet .it{display:block;width:100%;padding:13px;margin-bottom:9px;border:none;border-radius:14px;background:var(--pm-card);font-size:15.5px;cursor:pointer;color:var(--pm-text);text-align:center;box-shadow:0 0 0 .5px var(--pm-hair);font-family:inherit;box-sizing:border-box}
#gyPmSheet .it.pri{background:var(--pm-accent);color:var(--pm-accent-fg);font-weight:600}
#gyPmSheet .it.muted{background:transparent;box-shadow:none;color:var(--pm-sub)}
#gyPmSheet .sw{display:flex;gap:10px;justify-content:center;margin-bottom:14px}
#gyPmSheet .sw span{width:36px;height:36px;border-radius:50%;cursor:pointer;box-shadow:0 0 0 .5px rgba(0,0,0,.15),0 2px 6px rgba(0,0,0,.08)}
/* 设置首页那条开关 */
#gyPmSetEntry .set-entry-ico{background:#111;color:#fff;border-radius:9px;display:inline-flex;align-items:center;justify-content:center}
#gyPmSetEntry .set-entry-ico svg{width:18px;height:18px}
.gypm-sw{width:51px;height:31px;border-radius:16px;background:#e9e9eb;position:relative;flex-shrink:0;transition:background .2s}
.gypm-sw::after{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.15),0 1px 1px rgba(0,0,0,.06);transition:left .2s}
.gypm-sw.on{background:#111}.gypm-sw.on::after{left:22px}

/* ===== 屏幕里的谷雨页面：ins 风黑白（只在小手机模式里） ===== */
body.gyphm{--gy-accent:#111111;--gy-accent-2:#000;--gy-accent-rgb:17,17,17;--gy-accent-fg:#fff;--gy-accent-soft:rgba(0,0,0,.05);--gy-accent-line:rgba(0,0,0,.12)}
body.gyphm.pm-dark{--gy-accent:#f5f5f7;--gy-accent-rgb:245,245,247;--gy-accent-fg:#111}
body.gyphm .main-content{color:var(--pm-text);font-family:var(--pm-font)}
body.gyphm [style*="color:#1d9bf0"],body.gyphm [style*="color: #1d9bf0"]{color:var(--pm-text)!important}
body.gyphm [style*="background:#1d9bf0"],body.gyphm [style*="background: #1d9bf0"],body.gyphm [style*="background-color:#1d9bf0"]{background:var(--pm-accent)!important;color:var(--pm-accent-fg)!important}
body.gyphm [style*="solid #1d9bf0"]{border-color:var(--pm-hair)!important}
body.gyphm [style*="rgba(29,155,240"],body.gyphm [style*="rgba(29, 155, 240"]{background-color:var(--pm-fill)!important}
body.gyphm .btn-post,body.gyphm .btn-primary{background:var(--pm-accent)!important;color:var(--pm-accent-fg)!important;border:none!important;border-radius:999px!important;box-shadow:none!important;font-weight:600!important}
body.gyphm .btn-edit-small,body.gyphm .btn-secondary,body.gyphm .follow-btn{background:var(--pm-card)!important;color:var(--pm-text)!important;border:none!important;border-radius:999px!important;box-shadow:0 0 0 .5px var(--pm-hair),0 2px 8px rgba(0,0,0,.05)!important}
body.gyphm .btn-cancel{background:var(--pm-fill)!important;color:var(--pm-text)!important;border:none!important;border-radius:999px!important}
body.gyphm .set-entry{background:var(--pm-card)!important;border:none!important;border-radius:18px!important;box-shadow:var(--pm-shadow)!important}
body.gyphm .set-entry-title{color:var(--pm-text)!important;font-weight:600!important}
body.gyphm .set-entry-desc,body.gyphm .set-entry-arrow{color:var(--pm-sub)!important}
body.gyphm .info-card,body.gyphm .memory-card,body.gyphm .up-panel{background:var(--pm-card)!important;border:none!important;border-radius:18px!important;box-shadow:var(--pm-shadow)!important}
body.gyphm .input-group input:not([type=checkbox]):not([type=radio]),body.gyphm .input-group select,body.gyphm .input-group textarea{background:var(--pm-fill)!important;border:none!important;border-radius:12px!important;color:var(--pm-text)!important}
body.gyphm input[type=checkbox],body.gyphm input[type=radio],body.gyphm input[type=range]{accent-color:#111}
body.gyphm .tab.active,body.gyphm .gy-tab.active{color:var(--pm-text)!important}
body.gyphm .tab.active::after{background:var(--pm-text)!important}
body.gyphm .post-placeholder{border-bottom:.5px solid var(--pm-hair)!important}
body.gyphm .post-name{color:var(--pm-text)!important}
body.gyphm .modal-box,body.gyphm .modal-content{border-radius:22px!important;border:none!important}
body.gyphm .fab-btn{background:var(--pm-accent)!important;color:var(--pm-accent-fg)!important;box-shadow:0 8px 20px rgba(0,0,0,.2)!important}
/* 聊天：像 ins / iMessage 黑白那种 */
body.gyphm #view-chat{background:var(--pm-card)!important}
body.gyphm #view-chat .chat-bubble{border-radius:20px!important;border:none!important;box-shadow:none!important;font-size:15px}
body.gyphm #view-chat .chat-bubble.me{background:var(--pm-accent)!important;color:var(--pm-accent-fg)!important}
body.gyphm #view-chat .chat-bubble.other{background:var(--pm-fill)!important;color:var(--pm-text)!important}
body.gyphm #view-chat .chat-input-area{background:var(--pm-card)!important;border-top:.5px solid var(--pm-hair)!important}
body.gyphm #view-chat .chat-input-row input{background:var(--pm-fill)!important;border:none!important;border-radius:999px!important;box-shadow:none!important;color:var(--pm-text)!important}
body.gyphm #chatSendBtn{background:var(--pm-accent)!important;color:var(--pm-accent-fg)!important;border:none!important;border-radius:999px!important}
body.gyphm #view-chat .chat-more{background:var(--pm-fill)!important;border:none!important;border-radius:50%!important;color:var(--pm-text)!important}
body.gyphm #chatTopBar{background:transparent!important}
body.gyphm .chat-list-row{border-radius:18px!important;margin:6px 10px!important;background:var(--pm-card)!important;box-shadow:var(--pm-shadow)!important;border:none!important}
body.gyphm .chat-char-row{background:transparent!important;border:none!important}
body.gyphm #gyChatHead{background:transparent!important;border-bottom:.5px solid var(--pm-hair)!important}

`;

    /* ---------------- 尺寸：电脑上是一台手机，手机上是整屏 ---------------- */
    function layout() {
        const on = document.body.classList.contains('gyphm');
        document.body.classList.toggle('gyphm-desk', on && isDesk());
        document.body.classList.toggle('gyphm-mob', on && !isDesk());
        const st = document.documentElement.style;
        if (isDesk()) {
            const fw = 402, fh = Math.min(860, window.innerHeight - 70);
            const fl = Math.round((window.innerWidth - fw) / 2), ft = Math.max(14, Math.round((window.innerHeight - fh) / 2) - 12);
            st.setProperty('--pm-fl', fl + 'px'); st.setProperty('--pm-ft', ft + 'px');
            st.setProperty('--pm-fw', fw + 'px'); st.setProperty('--pm-fh', fh + 'px');
            const b = 11;   // 屏幕跟外框之间那圈黑边
            st.setProperty('--pm-sl', (fl + b) + 'px'); st.setProperty('--pm-st', (ft + b) + 'px');
            st.setProperty('--pm-sw', (fw - b * 2) + 'px'); st.setProperty('--pm-sh', (fh - b * 2) + 'px');
            st.setProperty('--pm-sr', '45px'); st.setProperty('--pm-top', '94px');
        } else {
            st.setProperty('--pm-sl', '0px'); st.setProperty('--pm-st', '0px');
            st.setProperty('--pm-sw', '100vw'); st.setProperty('--pm-sh', (window.innerHeight) + 'px');
            st.setProperty('--pm-sr', '0px'); st.setProperty('--pm-top', '62px');
        }
    }

    function mount() {
        if (!document.getElementById('gyPmCss')) { const s = document.createElement('style'); s.id = 'gyPmCss'; s.textContent = CSS; document.head.appendChild(s); }
        const add = (id, html, tag) => { if (document.getElementById(id)) return; const d = document.createElement(tag || 'div'); d.id = id; d.innerHTML = html; document.body.appendChild(d); };
        add('gyPm', `<div class="pm-bg"></div><div class="pm-frame"><i class="pm-btn a"></i><i class="pm-btn b"></i><i class="pm-btn c"></i><div class="pm-cap">guyu · phone</div></div>`);
        add('gyPmHome', '');
        add('gyPmBar', `<div class="pm-sb" id="gyPmSb2"></div><div class="nav"><span class="l" onclick="gyPmBack()">${svg('back', 2.2)}</span><span class="t" id="gyPmT"></span><span class="r" onclick="gyPmFloat(true)" title="小窗"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="3"/><rect x="11.5" y="11" width="7" height="6" rx="1.6" fill="currentColor" stroke="none"/></svg></span></div>`);
        add('gyPmApp', '');
        add('gyPmNC', '');
        add('gyPmInd', '<i></i>');
        const ind = document.getElementById('gyPmInd'); if (ind) { ind.title = '回桌面'; ind.onclick = () => window.gyPmHome(); }
        add('gyPmSheet', '');
        const sh = document.getElementById('gyPmSheet'); if (sh && !sh.__b) { sh.__b = 1; sh.addEventListener('click', e => { if (e.target === sh) closeSheet(); }); }
    }

    /* ---------------- 状态栏 ---------------- */
    // 电量：浏览器给得出来就用真的（电脑 / 手机的真实电量），给不出来就按时间编一个
    let BAT = null;
    try { if (navigator.getBattery) navigator.getBattery().then(b => { const up = () => { BAT = { lv: Math.round(b.level * 100), ch: b.charging }; }; up(); b.addEventListener('levelchange', up); b.addEventListener('chargingchange', up); }).catch(() => {}); } catch (e) {}
    window.gyPmBattery = () => BAT;
    function sbHtml() {
        const d = new Date();
        const bat = BAT ? BAT.lv : 60 + (d.getHours() * 7 + d.getMinutes()) % 38;
        return `<span>${pad(d.getHours())}:${pad(d.getMinutes())}</span><i class="pm-isl"></i>
            <span class="pm-ncgrab" title="通知"><i></i></span><span class="r"><span class="pm-sig"><i style="height:4px"></i><i style="height:6px"></i><i style="height:8.5px"></i><i style="height:11px"></i></span>${svg('wifi', 2.2)}<span class="pm-bat${bat <= 20 && !(BAT && BAT.ch) ? ' low' : ''}${window.gyPmSaverOn && window.gyPmSaverOn() ? ' saver' : ''}"><b>${bat}</b></span></span>`;
    }
    function tickSb() {
        const a = document.querySelector('#gyPmHome .pm-sb'), b = document.getElementById('gyPmSb2');
        const h = sbHtml(); if (a) a.innerHTML = h; if (b) b.innerHTML = h;
    }

    /* ---------------- 桌面 ---------------- */
    function unread() {
        let n = 0;
        try { [...groups(), ...chars()].forEach(x => { if (typeof chatHasUnread === 'function' && chatHasUnread(x.id)) n++; }); } catch (e) {}
        return n;
    }
    function lastChat() {
        let best = null;
        [...groups(), ...chars()].forEach(x => {
            const msgs = (typeof globalChats !== 'undefined' && globalChats[x.id]) || [];
            for (let i = msgs.length - 1; i >= 0; i--) {
                const m = msgs[i]; if (!m || m.sender === 'system') continue;
                if (!best || (m.timestamp || 0) > (best.m.timestamp || 0)) best = { x, m };
                break;
            }
        });
        return best;
    }
    function plain(t, cid) {
        let s = String(t || '');
        try { if (typeof gyExtractChatStatus === 'function') s = gyExtractChatStatus(s, cid).rest || s; } catch (e) {}
        return s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }
    // 桌面怎么画在 js/63（能加小组件、换图标、拖着排、分好几页）
    function renderHome() { try { if (typeof window.gyPmHomeRender === 'function') window.gyPmHomeRender(); } catch (e) { console.warn('[小手机] 桌面画不出来：', e); } }

    /* ---------------- 打开 App ---------------- */
    // 🧩 小功能都变成桌面图标（256）：小功能页里看得到的每一项（合集算一个）都有一个图标，点了直接打开
    // 10/28：每个功能都能有自己的图标（她要的）——合集里的、软件里的（微博、小红书……）、挪进相册 / 设置 / 聊天 🎮 的，都单独一个图标；
    //        「美化 → 小功能图标」能改回以前「合集算一个」
    window.gyPmMiniApps = function () {
        const L = typeof GY_MINI_FEATURES !== 'undefined' ? GY_MINI_FEATURES : [];
        const each = typeof window.gyPmMfEach === 'function' ? window.gyPmMfEach() : true;
        const hid = each ? (typeof window.gyHubHideIds === 'function' ? window.gyHubHideIds() : new Set()) : (typeof window.gyHubHiddenIds === 'function' ? window.gyHubHiddenIds() : new Set());
        const fixed = new Set(APPS.map(a => a[4] && (a[4].feature || '')).filter(Boolean));
        const keys = [];
        const put = (k, title, icon, open) => {
            keys.push(k);
            const def = [k, String(title || k).replace(/^\S+\s(?=\S)/u, m => /\p{Extended_Pictographic}/u.test(m) ? '' : m).slice(0, 8), 'e:' + (icon || '🧩'), '', open];
            const i = APPS.findIndex(a => a[0] === k); if (i >= 0) APPS[i] = def; else APPS.push(def);
        };
        L.forEach(f => {
            if (!f || !f.id || hid.has(f.id) || fixed.has(f.id)) return;
            put('mf_' + f.id, f.title || f.id, f.icon, { mini: f.id });
        });
        // 合集里那几个不是「小功能」的内置东西（TA 的心声、信件与日记、TA 的手机、全部开关）
        if (each && typeof window.gyHubPseudo === 'function') window.gyHubPseudo().forEach(p => { if (!fixed.has(p.id)) put('mf_' + p.id.replace('@', 'at_'), p.title, p.icon, { fn: 'gyHubOpen', args: [p.fid, p.id] }); });
        // 改回「合集算一个」时，单独的那些图标先不画（摆的位置留着，改回来还在原地）
        const ks = new Set(keys); for (let i = APPS.length - 1; i >= 0; i--) if (/^mf_/.test(APPS[i][0]) && !ks.has(APPS[i][0])) APPS.splice(i, 1);
        return keys;
    };
    const appOf = k => APPS.find(a => a[0] === k);
    function setTitle(t) { S.title = t || ''; const el = document.getElementById('gyPmT'); if (el) el.textContent = S.title; }
    function viewTitle(v) {
        if (v === 'chat') {
            let sid = null; try { sid = currentChatSessionId; } catch (e) {}
            const s = sid != null && !(typeof chatListShowingList !== 'undefined' && chatListShowingList) ? sessOf(sid) : null;
            return s ? (s.remark || s.name) : '聊天';
        }
        try { if (typeof mobileViewTitles !== 'undefined' && mobileViewTitles[v]) return mobileViewTitles[v]; } catch (e) {}
        return '';
    }
    function enterApp() {
        document.body.classList.add('gyphm-app');
        tickSb();
    }
    /* ---- 像真的 App 一样：自己的返回栈；在最外层没有返回键，回桌面靠底下那条小横杠 ---- */
    S.stack = []; S.nav = false; S.native = null;
    const chatOpen = () => { const a = document.getElementById('chatInputArea'); return S.view === 'chat' && !!a && a.style.display !== 'none'; };
    function canBack() {
        if (S.native) return !!(S.native.back && S.native.back.can && S.native.back.can());
        if (chatOpen()) return true;
        return S.stack.length > 1;
    }
    function syncNav() {
        const l = document.querySelector('#gyPmBar .nav .l'); if (!l) return;
        // 能往回退就是「‹」；已经在最外层就换成回桌面的小方格——任何时候顶上都有出口
        const b = canBack();
        l.style.visibility = 'visible';
        l.classList.remove('home');
        l.innerHTML = svg('back', 2.2);   // 一直是「‹」：能往回退就退一层，已经在最外层就回桌面
        l.title = b ? '返回' : '回桌面';
        if (!S.native && S.view === 'chat') setTitle(viewTitle('chat'));
    }
    window.gyPmBack = function () {
        if (S.native) { if (S.native.back && S.native.back.can && S.native.back.can()) S.native.back.go(); else window.gyPmHome(); syncNav(); return; }
        if (chatOpen()) { try { if (typeof window.gyChatBack === 'function') window.gyChatBack(); else if (typeof backToContactList === 'function') backToContactList(); } catch (e) {} setTimeout(syncNav, 30); return; }
        if (S.stack.length > 1) {
            S.stack.pop(); const prev = S.stack[S.stack.length - 1];
            S.nav = true; try { switchMainView(prev.v, prev.p); } catch (e) {} S.nav = false;
            setTitle(prev.t || viewTitle(prev.v)); syncNav(); return;
        }
        window.gyPmHome();
    };
    // 打开的那一下：从图标的位置放大出来
    // 打开的那一下：动画可以在「美化 → 打开 App 的方式」里选
    const FX = {
        zoom: [[{ transform: 'scale(.12)', opacity: 0, borderRadius: '40px' }, { transform: 'none', opacity: 1 }], 340, 'cubic-bezier(.2,.85,.25,1)', 'icon'],
        slide: [[{ transform: 'translateY(100%)' }, { transform: 'none' }], 380, 'cubic-bezier(.2,.85,.25,1)', 'screen'],
        push: [[{ transform: 'translateX(100%)', boxShadow: '-12px 0 30px rgba(0,0,0,.12)' }, { transform: 'none', boxShadow: 'none' }], 360, 'cubic-bezier(.25,.8,.3,1)', 'screen'],
        fade: [[{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], 260, 'ease-out', 'center'],
        pop: [[{ opacity: 0, transform: 'scale(.55)' }, { opacity: 1, transform: 'scale(1.03)', offset: .7 }, { transform: 'none' }], 420, 'cubic-bezier(.3,1.3,.5,1)', 'center'],
        flip: [[{ opacity: 0, transform: 'perspective(1200px) rotateY(-80deg)' }, { opacity: 1, transform: 'perspective(1200px) rotateY(0)' }], 480, 'cubic-bezier(.2,.8,.25,1)', 'center'],
        card: [[{ opacity: 0, transform: 'translateY(60px) scale(.92)', borderRadius: '28px' }, { opacity: 1, transform: 'none' }], 380, 'cubic-bezier(.2,.85,.25,1)', 'center'],
        none: null
    };
    window.__gyPmFX = FX;
    function zoomFrom(key, fxName) {
        try {
            const fx = FX[fxName || (typeof window.gyPmOpenFx === 'function' ? window.gyPmOpenFx() : 'zoom')] || FX.zoom;
            if (!fx || !Element.prototype.animate) return;
            let cx, cy;
            const ic = document.querySelector(`#gyPmHome [data-pmapp="${key}"] .pm-ic`);
            if (fx[3] === 'icon' && ic && ic.offsetParent !== null) { const r = ic.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
            else { const r = scrRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
            requestAnimationFrame(() => {
                ['gyPmBar', 'gyPmApp'].map(id => document.getElementById(id)).concat([document.querySelector('.main-content')]).forEach(el => {
                    if (!el || el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;
                    const b = el.getBoundingClientRect(); if (!b.width) return;
                    el.style.transformOrigin = fx[3] === 'screen' ? '' : `${cx - b.left}px ${cy - b.top}px`;
                    el.animate(fx[0], { duration: fx[1], easing: fx[2] });
                });
            });
        } catch (e) {}
    }
    window.gyPmPreviewFx = function (name) { enterApp(); zoomFrom('set', name); setTimeout(() => { if (!S.app && !S.native && S.stack.length === 0) window.gyPmHome(); }, 900); };

    /* ---------------- 🪟 小窗：App 缩成小窗口浮在桌面上，可以拖，里面照样能点 ---------------- */
    const F = { on: false, x: 0, y: 0, s: .42 };
    const flEls = () => ['gyPmBar', 'gyPmApp'].map(id => document.getElementById(id)).concat([document.querySelector('.main-content')]).filter(el => el && getComputedStyle(el).display !== 'none');
    function scrRect() {
        const r = document.documentElement.style, n = k => parseFloat(r.getPropertyValue(k));
        const sl = n('--pm-sl') || 0, st = n('--pm-st') || 0, sw = n('--pm-sw') || 0, sh = n('--pm-sh') || 0;
        return { left: isDesk() ? sl : 0, top: isDesk() ? st : 0, width: isDesk() ? sw : innerWidth, height: isDesk() ? sh : innerHeight };
    }
    function flApply() {
        const r = scrRect(), w = r.width * F.s, h = r.height * F.s;
        F.x = Math.max(r.left + 6, Math.min(r.left + r.width - w - 6, F.x)); F.y = Math.max(r.top + 40, Math.min(r.top + r.height - h - 10, F.y));
        flEls().forEach(el => { el.style.transform = `translate(${F.x - r.left}px,${F.y - r.top}px) scale(${F.s})`; });
        const fl = document.getElementById('gyPmFloat');
        if (fl) Object.assign(fl.style, { left: F.x + 'px', top: F.y + 'px', width: w + 'px', height: h + 'px' });
    }
    function flClear() {
        flEls().concat([document.querySelector('.main-content')]).forEach(el => { if (el) { el.style.transform = ''; el.style.transformOrigin = ''; } });
    }
    window.gyPmFloat = function (on, instant) {
        if (!document.body.classList.contains('gyphm')) return;
        if (on) {
            if (!document.body.classList.contains('gyphm-app') || F.on) return;
            closeSheet();
            let fl = document.getElementById('gyPmFloat');
            if (!fl) {
                fl = document.createElement('div'); fl.id = 'gyPmFloat';
                fl.innerHTML = '<div class="fr"></div><div class="gb"><i data-fl="max" title="放大">⤢</i><b></b><i data-fl="x" title="关掉">✕</i></div>';
                document.body.appendChild(fl); flBind(fl);
            }
            const r = scrRect();
            flEls().forEach(el => { const b = el.getBoundingClientRect(); el.style.transformOrigin = `${r.left - b.left}px ${r.top - b.top}px`; el.style.transform = 'none'; });
            F.on = true; document.body.classList.add('gyphm-float');
            void document.body.offsetWidth;
            F.x = r.left + r.width * (1 - F.s) - 12; F.y = r.top + r.height * (1 - F.s) - 118;
            flApply(); renderHome();
            return;
        }
        if (!F.on) return;
        F.on = false;
        const done = () => { document.body.classList.remove('gyphm-float', 'pm-fl-drag'); flClear(); };
        if (instant) { done(); return; }
        flEls().forEach(el => { el.style.transform = 'none'; });
        setTimeout(done, 390);
    };
    window.gyPmFloatOn = () => F.on;
    // 小窗开着时点了别的 App：小窗不收，里面换成这个 App 接着浮着（想看大的点 ⤢）
    function flKeep() {
        if (!F.on) return;
        document.body.classList.add('gyphm-app', 'gyphm-float');
        const r = scrRect();
        flEls().forEach(el => { if (!el.style.transformOrigin) { const pt = el.style.transform; el.style.transform = 'none'; const b = el.getBoundingClientRect(); el.style.transformOrigin = `${r.left - b.left}px ${r.top - b.top}px`; el.style.transform = pt; } });
        flApply(); renderHome();
        requestAnimationFrame(() => { if (F.on) flApply(); });
    }
    function flBind(fl) {
        const gb = fl.querySelector('.gb'); let d = null;
        gb.addEventListener('pointerdown', e => { if (e.target.closest('[data-fl]')) return; d = { x: e.clientX - F.x, y: e.clientY - F.y, id: e.pointerId }; document.body.classList.add('pm-fl-drag'); try { gb.setPointerCapture(e.pointerId); } catch (er) {} });
        gb.addEventListener('pointermove', e => { if (!d || e.pointerId !== d.id) return; F.x = e.clientX - d.x; F.y = e.clientY - d.y; flApply(); });
        const up = () => { if (!d) return; d = null; document.body.classList.remove('pm-fl-drag'); const r = scrRect(), w = r.width * F.s; F.x = (F.x + w / 2 < r.left + r.width / 2) ? r.left + 12 : r.left + r.width - w - 12; flApply(); };
        gb.addEventListener('pointerup', up); gb.addEventListener('pointercancel', up);
        gb.addEventListener('click', e => { const b = e.target.closest('[data-fl]'); if (!b) return; if (b.dataset.fl === 'max') window.gyPmFloat(false); else { window.gyPmFloat(false, true); window.gyPmHome(); } });
        gb.addEventListener('dblclick', () => window.gyPmFloat(false));
    }
    function closeNative() { const n = document.getElementById('gyPmApp'); if (n) { n.innerHTML = ''; n.classList.remove('on'); } S.native = null; document.body.classList.remove('gyphm-native'); }
    // 小手机自己的「原生 App」（日历这种）：盖在屏幕里，跟谷雨的页面一样有顶栏和返回
    window.gyPmNative = function (title, html, opts) {
        const n = document.getElementById('gyPmApp'); if (!n) return null;
        const pp = F.on ? pipBegin() : null;
        enterApp(); document.body.classList.add('gyphm-native');
        S.native = { back: opts && opts.back };
        n.innerHTML = html; n.classList.add('on'); n.scrollTop = 0;
        setTitle(title); syncNav();
        if (pp) pipEnd(pp);
        return n;
    };
    window.gyPmOpen = function (key) {
        const a = appOf(key); if (!a) return;
        const j = a[4];
        // 开别的 App：小窗不收起来，里面换成新 App 接着浮着（以前是先收起来）
        if (j.sheet) { if (typeof window.gyPmBeauty === 'function') window.gyPmBeauty(); return; }
        // 弹窗类（相册、账单）：直接盖在桌面上，不用进 App
        if (j.fn && !j.native) { try { window[j.fn].apply(null, j.args || []); } catch (e) { console.warn('[小手机] 打开失败：', e); } return; }
        if (j.mini) { try { if (typeof gyOpenMiniFeature === 'function') gyOpenMiniFeature(j.mini); } catch (e) { console.warn('[小手机] 打开失败：', e); } return; }
        // 🪟 小窗开着时点了别的 App：原来那个留在小窗里（还能点），新的这个全屏打开
        const pp = F.on ? pipBegin() : null;
        closeNative();
        if (j.native) { try { window[j.fn].apply(null, j.args || []); } catch (e) { console.warn('[小手机] 打开失败：', e); } if (pp && !pp.done) pipEnd(pp); zoomFrom(key); return; }
        enterApp(); setTitle(a[1]); S.stack = []; S.app = key;
        S.nav = true;
        try {
            if (j.today) {
                if (typeof window.gyTodaySet === 'function' && !(window.gyTodayRead && window.gyTodayRead().on)) window.gyTodaySet(true);
                if (typeof window.gyTodayRender === 'function') window.gyTodayRender();
                if (typeof openMobileTrendsView === 'function') openMobileTrendsView();
                S.view = 'today';
            } else if (j.feature && typeof gyOpenFeaturePage === 'function') gyOpenFeaturePage(j.feature);
            else if (j.view === 'chat') {
                switchMainView('chat');
                // 聊天 App 从联系人那一层开始（跟真的打开一个 App 一样，不直接掉进上次那个人）
                if (chatOpen()) { try { if (typeof window.gyChatBack === 'function') window.gyChatBack(); } catch (e) {} }
            }
            else if (j.view) switchMainView(j.view, j.param);
        } catch (e) { console.warn('[小手机] 打开失败：', e); }
        S.nav = false;
        const t = j.today ? '今天' : (j.feature ? a[1] : (viewTitle(S.view) || a[1]));
        setTitle(t); S.stack = [{ v: j.today ? 'today' : (j.feature ? 'featurePage' : S.view), p: j.param, t }];
        syncNav();
        try { document.querySelector('.main-content').scrollTop = 0; } catch (e) {}
        if (pp) pipEnd(pp);
        zoomFrom(key);
    };
    window.gyPmOpenChat = function (id) {
        const pp = F.on ? pipBegin() : null;
        closeNative(); enterApp();
        S.nav = true;
        try { switchMainView('chat'); switchChatSession(String(id)); } catch (e) {}
        S.nav = false;
        S.stack = [{ v: 'chat', t: '聊天' }];
        const s = sessOf(id); setTitle(s ? (s.remark || s.name) : '聊天'); syncNav();
        if (pp) pipEnd(pp);
        zoomFrom('chat');
    };

    /* ---------------- 🪟 画中画：小窗里留着原来那个 App，屏幕上是新点开的 ----------------
       · 原来那页和新开的不是同一页（比如聊天 → 日记）：把原来那页**整个搬进小窗**，里面照样能点、能打字、会实时更新。
       · 是同一页（比如跟 A 聊着又点开跟 B 聊）：小窗里放一张原来那页的快照，点 ⤢ 就回到原来那个。
       · ⤢：回到小窗里那个 App（全屏）；✕：关掉小窗；拖顶上那条能挪，松手自己靠边。 */
    const PIP = { on: false };
    const viewEls = () => [...document.querySelectorAll('.main-content > [id^="view-"]')];
    const shown = el => !!el && getComputedStyle(el).display !== 'none';
    function pipBegin() {
        if (PIP.on) pipClose();
        const nat = !!S.native;
        const el = nat ? document.getElementById('gyPmApp') : viewEls().find(shown);
        const info = { el, native: nat, title: (document.getElementById('gyPmT') || {}).textContent || '', stack: S.stack.slice(), view: S.view, app: S.app,
            chat: (!nat && S.view === 'chat' && chatOpen() && typeof currentChatSessionId !== 'undefined') ? String(currentChatSessionId) : null,
            disp: el ? getComputedStyle(el).display : 'block', snap: null, parent: el && el.parentNode, next: el && el.nextSibling };
        if (el) { const c = el.cloneNode(true); c.querySelectorAll('[id]').forEach(x => x.removeAttribute('id')); c.removeAttribute('id'); c.querySelectorAll('input,textarea,button,select').forEach(x => { x.disabled = true; }); info.snap = c; }
        window.gyPmFloat(false, true);
        return info;
    }
    function pipEnd(info) {
        if (!info || info.done) return; info.done = true;
        if (!info.el) return;
        const live = !info.native && !shown(info.el) && info.el.parentNode;
        const r = scrRect();
        let pp = document.getElementById('gyPmPip');
        if (!pp) {
            pp = document.createElement('div'); pp.id = 'gyPmPip';
            pp.innerHTML = '<div class="gb"><i data-pp="max" title="回到这个 App">⤢</i><b></b><i data-pp="x" title="关掉小窗">✕</i></div><div class="scr"><div class="inner"></div></div>';
            document.body.appendChild(pp); pipBind(pp);
        }
        const inner = pp.querySelector('.inner');
        inner.innerHTML = '';
        Object.assign(inner.style, { width: r.width + 'px', height: r.height + 'px', transform: `scale(${F.s})` });
        inner.style.setProperty('--pd', info.disp === 'none' ? 'block' : info.disp);
        pp.querySelector('.gb b').textContent = info.title || '';
        if (live) { inner.appendChild(info.el); info.el.classList.add('gy-in-pip'); pp.classList.remove('snap'); }
        else { inner.appendChild(info.snap); pp.classList.add('snap'); }
        Object.assign(PIP, info, { on: true, live: !!live });
        const w = r.width * F.s, h = r.height * F.s;
        PIP.x = PIP.x != null ? PIP.x : r.left + r.width - w - 12; PIP.y = PIP.y != null ? PIP.y : r.top + r.height - h - 118;
        pipApply();
        document.body.classList.add('gyphm-pip');
    }
    function pipApply() {
        const pp = document.getElementById('gyPmPip'); if (!pp) return;
        const r = scrRect(), w = r.width * F.s, h = r.height * F.s;
        PIP.x = Math.max(r.left + 6, Math.min(r.left + r.width - w - 6, PIP.x)); PIP.y = Math.max(r.top + 40, Math.min(r.top + r.height - h - 10, PIP.y));
        Object.assign(pp.style, { left: PIP.x + 'px', top: PIP.y + 'px', width: w + 'px', height: h + 'px' });
    }
    // 把搬进小窗的那页放回原处
    function putBack() {
        if (PIP.live && PIP.el) {
            PIP.el.classList.remove('gy-in-pip');
            try { if (PIP.next && PIP.next.parentNode === PIP.parent) PIP.parent.insertBefore(PIP.el, PIP.next); else PIP.parent.appendChild(PIP.el); } catch (e) { try { document.querySelector('.main-content').appendChild(PIP.el); } catch (er) {} }
        }
    }
    function pipClose() {
        if (!PIP.on) return;
        const keep = PIP.live && PIP.el && PIP.el.style.display !== 'none';
        putBack();
        if (PIP.live && PIP.el && !keep) PIP.el.style.display = 'none';
        const pp = document.getElementById('gyPmPip'); if (pp) pp.remove();
        PIP.on = false; PIP.live = false; PIP.el = null;
        document.body.classList.remove('gyphm-pip');
    }
    window.gyPmPipOn = () => PIP.on;
    window.gyPmPipClose = pipClose;
    window.gyPmPipInfo = () => PIP.on ? { live: PIP.live, title: PIP.title, view: PIP.view, chat: PIP.chat, el: PIP.el && PIP.el.id } : null;
    // ⤢：回到小窗里那个 App
    window.gyPmPipMax = function () {
        if (!PIP.on) return;
        const info = { stack: PIP.stack, view: PIP.view, chat: PIP.chat, title: PIP.title, native: PIP.native };
        pipClose();
        closeSheet(); closeNative(); enterApp();
        S.nav = true;
        try {
            if (info.chat) { switchMainView('chat'); switchChatSession(info.chat); }
            else if (info.view === 'today') { if (typeof openMobileTrendsView === 'function') openMobileTrendsView(); }
            else { const top = info.stack[info.stack.length - 1]; if (top && top.v === 'featurePage' && S.app) window.gyPmOpen(S.app); else if (top) switchMainView(top.v, top.p); }
        } catch (e) {}
        S.nav = false;
        S.stack = info.stack.length ? info.stack : S.stack; S.view = info.view;
        setTitle(info.title); syncNav();
    };
    function pipBind(pp) {
        const gb = pp.querySelector('.gb'); let d = null;
        gb.addEventListener('pointerdown', e => { if (e.target.closest('[data-pp]')) return; d = { x: e.clientX - PIP.x, y: e.clientY - PIP.y, id: e.pointerId }; try { gb.setPointerCapture(e.pointerId); } catch (er) {} });
        gb.addEventListener('pointermove', e => { if (!d || e.pointerId !== d.id) return; PIP.x = e.clientX - d.x; PIP.y = e.clientY - d.y; pipApply(); });
        const up = () => { if (!d) return; d = null; const r = scrRect(), w = r.width * F.s; PIP.x = (PIP.x + w / 2 < r.left + r.width / 2) ? r.left + 12 : r.left + r.width - w - 12; pipApply(); };
        gb.addEventListener('pointerup', up); gb.addEventListener('pointercancel', up);
        gb.addEventListener('click', e => { const b = e.target.closest('[data-pp]'); if (!b) return; if (b.dataset.pp === 'max') window.gyPmPipMax(); else pipClose(); });
        // 快照模式：点里面任何地方都是「回到这个 App」
        pp.querySelector('.scr').addEventListener('click', () => { if (pp.classList.contains('snap')) window.gyPmPipMax(); });
    }
    // 别处又要显示小窗里那一页（比如从桌面又点开同一个 App）：先把它放回去，小窗收起
    function hookRouter() {
        if (typeof window.switchMainView !== 'function' || window.switchMainView.__gyPip) return;
        const f0 = window.switchMainView;
        window.switchMainView = function () {
            const r = f0.apply(this, arguments);
            try { if (PIP.on && PIP.live && PIP.el && PIP.el.style.display && PIP.el.style.display !== 'none') pipClose(); } catch (e) {}
            return r;
        };
        window.switchMainView.__gyPip = true;
    }
    hookRouter(); setTimeout(hookRouter, 1500);
    window.addEventListener('resize', () => { if (PIP.on) pipApply(); });
    window.gyPmHome = function () {
        if (F.on) window.gyPmFloat(false, true);
        closeSheet(); closeNative();
        const was = document.body.classList.contains('gyphm-app');
        document.body.classList.remove('gyphm-app');
        S.stack = [];
        renderHome();
        if (was) { try { const h = document.getElementById('gyPmHome'); h.animate([{ transform: 'scale(1.08)', opacity: .5 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.85,.25,1)' }); } catch (e) {} }
    };
    window.gyPmSyncNav = syncNav;

    function closeSheet() { const sh = document.getElementById('gyPmSheet'); if (sh) sh.classList.remove('on'); }
    window.gyPmCloseSheet = closeSheet;
    window.gyPmSheet = function (html) {
        const sh = document.getElementById('gyPmSheet'); if (!sh) return null;
        const again = sh.classList.contains('on');   // 已经开着（比如点了个选项又重画）就别再从底下弹一次
        sh.innerHTML = `<div class="box${again ? ' still' : ''}">${html}</div>`; sh.classList.add('on'); return sh;
    };

    /* ---------------- 🔔 通知中心：从顶上的状态栏往下拉（或点一下状态栏）----------------
       手机上为了不跟系统的下拉 / 浏览器的下拉刷新打架：
       · 只认从「小手机自己的状态栏」开始的下拉（它在系统状态栏下面，不在屏幕最顶上那条边）
       · 状态栏上关掉浏览器自己的手势（touch-action:none），整页也关掉下拉刷新（overscroll-behavior）
       · 还可以直接点一下状态栏，或者点状态栏下面那颗小横条，不用拉也能打开 */
    const NCI = { chat: 'chat', post: 'home', diary: 'diary', letter: 'diary', theater: 'theater', mall: 'bag', music: 'music', film: 'film', today: 'today', profile: 'people', forum: 'forum', anon: 'mask' };
    function ncIcon(n) {
        const j = n.jump || {};
        let k = 'bell';
        if (j.chat != null || n.chatCharId) k = 'chat';
        else if (n.postId || j.view === 'home' || j.view === 'postDetail') k = 'home';
        else if (j.diary != null || j.view === 'diary') k = 'diary';
        else if (j.view && NCI[j.view]) k = NCI[j.view];
        else if (j.view === 'novel') k = 'forum'; else if (j.view === 'anonForum') k = 'mask';
        else if (j.feature === 'music') k = 'music'; else if (j.today) k = 'today';
        else if (j.fn && /phone/i.test(j.fn)) k = 'chat';
        return svg(k, 1.8);
    }
    // 通知里只写了「谁做了什么」，这里把具体内容也带出来：聊天就是那句话、推文就是那条推文……
    function ncDetail(n) {
        try {
            const j = n.jump || {};
            const cid = n.chatCharId != null ? n.chatCharId : (j.chat != null ? j.chat : null);
            if (cid != null) {
                const msgs = (typeof globalChats !== 'undefined' && globalChats[cid]) || [];
                for (let k = msgs.length - 1; k >= 0; k--) { const m = msgs[k]; if (m && m.sender !== 'system' && m.sender !== 'me') return plain(m.text || (m.img || m.image ? '[图片]' : ''), cid).slice(0, 200); }
            }
            const pid = n.postId || (j.view === 'postDetail' ? j.param : null);
            if (pid) { const p = (typeof globalPosts !== 'undefined' ? globalPosts : []).find(x => String(x.id) === String(pid)); if (p) return plain(p.text, p.char && p.char.id).slice(0, 200); }
            if (n.desc) return String(n.desc).replace(/<[^>]+>/g, '').slice(0, 200);
        } catch (e) {}
        return '';
    }
    function ncHtml() {
        const d = new Date();
        try { if (typeof window.gyNotifEnsureIds === 'function') window.gyNotifEnsureIds(); } catch (e) {}
        let list = []; try { list = (typeof globalNotifications !== 'undefined' ? globalNotifications : []).slice(0, 60); } catch (e) {}
        const today0 = new Date(); today0.setHours(0, 0, 0, 0);
        const card = (n, i) => { const det = ncDetail(n); return `<div class="nc-n" data-nid="${esc(String(n.id || ''))}" onclick="gyPmNCGo('${String(n.id || '').replace(/[^\w-]/g, '')}')"><span class="ic">${ncIcon(n)}</span><div class="tx"><div class="hd"><b>${esc(String(n.text || '').replace(/<[^>]+>/g, ''))}</b><em>${(() => { try { return timeAgo(n.timestamp); } catch (e) { return ''; } })()}</em></div>${det ? `<p>${esc(det)}</p>` : ''}</div></div>`; };
        const tod = [], old = [];
        list.forEach((n, i) => ((n.timestamp || 0) >= today0.getTime() ? tod : old).push(card(n, i)));
        return `<div class="nc-in">
            <div class="nc-sb">${sbHtml()}</div>
            <div class="nc-bar"><b>通知中心</b><span><i onclick="gyPmNCAll()">全部</i><i onclick="gyPmNCRead()">已读</i><i onclick="gyPmNC(false);gyPmLockNow()" title="锁屏">${svg('lock', 2)}</i></span></div>
            <div class="nc-list">${list.length ? (tod.length ? `<div class="nc-h">今天</div>${tod.join('')}` : '') + (old.length ? `<div class="nc-h">更早</div>${old.join('')}` : '') : '<div class="nc-empty">没有新通知</div>'}</div>
            <div class="nc-grab" onclick="gyPmNC(false)"><i></i></div></div>`;
    }
    window.gyPmNC = function (open) {
        const nc = document.getElementById('gyPmNC'); if (!nc) return;
        if (open === false) { nc.classList.remove('on', 'drag'); nc.style.transform = ''; return; }
        nc.innerHTML = ncHtml(); nc.classList.remove('drag'); nc.style.transform = ''; nc.classList.add('on');
        try { unreadNotifs = 0; if (typeof updateNotifBadge === 'function') updateNotifBadge(); } catch (e) {}
    };
    // 按通知 id 找（不再按列表下标——通知中心开着时又来一条，下标全错位，点了跳到别人那儿去）。
    // 老调用传数字下标也还认。
    window.gyPmNCGo = function (key) {
        let n = null;
        try {
            const all = (typeof globalNotifications !== 'undefined' ? globalNotifications : []);
            if (typeof key === 'number') n = all[key];
            else n = (typeof window.gyNotifFind === 'function') ? window.gyNotifFind(key) : all.find(x => x && String(x.id) === String(key));
        } catch (e) {}
        window.gyPmNC(false);
        closeNative(); enterApp(); S.stack = [];
        try {
            if (!n) switchMainView('notifications');
            else if (typeof window.gyOpenNotif === 'function') window.gyOpenNotif(n);
            else if (n.jump && typeof window.gyJump === 'function') window.gyJump(n.jump);
            else if (n.chatCharId) { switchMainView('chat'); switchChatSession(String(n.chatCharId)); }
            else if (n.postId) switchMainView('postDetail', n.postId);
            else if (n.feature && typeof gyOpenFeaturePage === 'function') gyOpenFeaturePage(n.feature);
            else if (n.view) switchMainView(n.view, n.param);
            else switchMainView('notifications');
        } catch (e) {}
        setTimeout(syncNav, 80);
    };
    window.gyPmNCAll = function () { window.gyPmNC(false); closeNative(); enterApp(); S.stack = []; try { switchMainView('notifications'); } catch (e) {} setTitle('通知'); syncNav(); };
    window.gyPmNCRead = function () { try { unreadNotifs = 0; if (typeof updateNotifBadge === 'function') updateNotifBadge(); } catch (e) {} window.gyPmNC(true); renderHome(); };
    // 拉的手势：状态栏按下 → 往下拉，通知中心跟着手指下来；松手拉过一小段就打开，没拉够就缩回去；只点了一下也打开
    function ncGesture() {
        const D = { on: false, y: 0, t: 0, dy: 0, id: null };
        const H = () => (document.getElementById('gyPmNC') || {}).offsetHeight || 700;
        document.addEventListener('pointerdown', e => {
            if (!window.gyPmIsOn()) return;
            const sb = e.target.closest('#gyPmHome .pm-sb, #gyPmBar .pm-sb, .pm-ncgrab');
            if (!sb || e.target.closest('.pm-lock') || document.body.classList.contains('gyphm-edit')) return;
            D.on = true; D.y = e.clientY; D.t = Date.now(); D.dy = 0; D.id = e.pointerId;
            const nc = document.getElementById('gyPmNC'); nc.innerHTML = ncHtml(); nc.classList.add('drag');
            nc.style.transform = `translateY(-100%)`;
            try { sb.setPointerCapture(e.pointerId); } catch (er) {}
            e.preventDefault();
        }, true);
        document.addEventListener('pointermove', e => {
            if (!D.on || e.pointerId !== D.id) return;
            D.dy = Math.max(0, e.clientY - D.y);
            const nc = document.getElementById('gyPmNC'); if (nc) nc.style.transform = `translateY(${Math.min(0, -H() + D.dy)}px)`;
        }, true);
        const end = e => {
            if (!D.on || (e && e.pointerId !== D.id)) return;
            D.on = false;
            const tap = D.dy < 6 && Date.now() - D.t < 400;
            if (tap || D.dy > 60) window.gyPmNC(true); else window.gyPmNC(false);
        };
        document.addEventListener('pointerup', end, true);
        document.addEventListener('pointercancel', end, true);
        // 在通知中心里往上划：跟着手指往上收；划过一小段就收回去（在列表里的话，要列表已经滚到底才算）
        const U = { on: false, y: 0, dy: 0, moved: false, id: null };
        document.addEventListener('pointerdown', e => {
            const nc = e.target.closest && e.target.closest('#gyPmNC.on'); if (!nc) return;
            const list = e.target.closest('.nc-list');
            if (list && list.scrollTop + list.clientHeight < list.scrollHeight - 2) return;
            U.on = true; U.y = e.clientY; U.dy = 0; U.moved = false; U.id = e.pointerId;
        }, true);
        document.addEventListener('pointermove', e => {
            if (!U.on || e.pointerId !== U.id) return;
            U.dy = Math.min(0, e.clientY - U.y);
            if (U.dy < -8) { U.moved = true; const nc = document.getElementById('gyPmNC'); nc.classList.add('drag'); nc.style.transform = `translateY(${U.dy}px)`; }
        }, true);
        const upEnd = e => {
            if (!U.on || (e && e.pointerId !== U.id)) return;
            U.on = false; const nc = document.getElementById('gyPmNC'); if (!nc) return;
            nc.classList.remove('drag');
            if (U.moved) {
                if (U.dy < -70) window.gyPmNC(false); else nc.style.transform = '';
                // 划动之后别再当成点了一条通知
                const stop = ev => { ev.stopPropagation(); ev.preventDefault(); document.removeEventListener('click', stop, true); };
                document.addEventListener('click', stop, true); setTimeout(() => document.removeEventListener('click', stop, true), 60);
            }
        };
        document.addEventListener('pointerup', upEnd, true);
        document.addEventListener('pointercancel', upEnd, true);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('#gyPmNC.on')) { e.stopImmediatePropagation(); window.gyPmNC(false); } }, true);
    }

    // 给 js/63（桌面）用的一些小工具
    /* ---------- 🐦 推特（256）：小手机里「推特」= 谷雨的主页 + 私信（原来的聊天），照真的 X 的样子：
       顶上 头像 / X 标志（私信页是「私信」+ ⚙ ✉）、「为你推荐 / 正在关注」蓝色下划线、蓝色发帖按钮、
       底栏 主页 / 搜索 / 通知 / 私信 四个 X 图标；私信是 X 私信那种列表，进去是蓝色 / 灰色气泡。
       美化 →「聊天和推特」能改回分开两个图标；不开小手机时谷雨还是原来的样子 */
    const XI = {
        logo: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
        home: '<path d="M21.591 7.146L12.52 1.157c-.316-.21-.724-.21-1.04 0l-9.071 5.99c-.26.173-.409.456-.409.757v13.183c0 .502.418.913.929.913H9.14c.51 0 .929-.41.929-.913v-7.075h3.909v7.075c0 .502.417.913.928.913h6.165c.511 0 .929-.41.929-.913V7.904c0-.301-.158-.584-.408-.758z"/>',
        homeO: '<path d="M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z" fill="none"/><path d="M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h4.5v-7h4v7h4.5c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM19 19.5c0 .276-.224.5-.5.5H16v-7H8v7H5.5c-.276 0-.5-.224-.5-.5V8.429l7-4.375 7 4.375V19.5z"/>',
        search: '<path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"/>',
        bell: '<path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.236l-1.143-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z"/>',
        mail: '<path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z"/>',
        mailF: '<path d="M1.998 4.499c0-.828.671-1.499 1.5-1.499h17c.828 0 1.5.671 1.5 1.499v2.858l-10 4.545-10-4.547V4.499zm0 5.053V19.5c0 .828.671 1.5 1.5 1.5h17c.828 0 1.5-.672 1.5-1.5V9.554l-10 4.545-10-4.547z"/>',
        gear: '<path d="M10.54 1.75h2.92l1.57 2.36c.11.17.32.25.53.21l2.53-.59 2.17 2.17-.58 2.54c-.05.2.04.41.21.53l2.36 1.57v2.92l-2.36 1.57c-.17.12-.26.33-.21.53l.58 2.54-2.17 2.17-2.53-.59c-.21-.04-.42.04-.53.21l-1.57 2.36h-2.92l-1.58-2.36c-.11-.17-.32-.25-.52-.21l-2.54.59-2.17-2.17.58-2.54c.05-.2-.03-.41-.21-.53l-2.35-1.57v-2.92L4.1 8.97c.18-.12.26-.33.21-.53L3.73 5.9 5.9 3.73l2.54.59c.2.04.41-.04.52-.21l1.58-2.36zm1.07 2l-.98 1.47C10.05 6.08 9 6.5 7.99 6.27l-1.46-.34-.6.6.33 1.46c.24 1.01-.18 2.07-1.05 2.64l-1.46.98v.78l1.46.98c.87.57 1.29 1.63 1.05 2.64l-.33 1.46.6.6 1.46-.34c1.01-.23 2.06.19 2.64 1.05l.98 1.47h.78l.97-1.47c.58-.86 1.63-1.28 2.65-1.05l1.45.34.61-.6-.34-1.46c-.23-1.01.18-2.07 1.05-2.64l1.47-.98v-.78l-1.47-.98c-.87-.57-1.28-1.63-1.05-2.64l.34-1.46-.61-.6-1.45.34c-1.02.23-2.07-.19-2.65-1.05l-.97-1.47h-.78zM12 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5c.82 0 1.5-.67 1.5-1.5s-.68-1.5-1.5-1.5zM8.5 12c0-1.93 1.56-3.5 3.5-3.5 1.93 0 3.5 1.57 3.5 3.5s-1.57 3.5-3.5 3.5c-1.94 0-3.5-1.57-3.5-3.5z"/>',
        newmsg: '<path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5V12h-2v-1.537l-8 3.635-8-3.635V18.5c0 .276.224.5.5.5H13v2H4.498c-1.381 0-2.5-1.119-2.5-2.5v-13zm2 2.766l8 3.635 8-3.635V5.5c0-.276-.224-.5-.5-.5h-15c-.276 0-.5.224-.5.5v2.766zM19 18v-3h2v3h3v2h-3v3h-2v-3h-3v-2h3z"/>'
    };
    const xs = (k, sz) => `<svg viewBox="0 0 24 24" width="${sz || 26}" height="${sz || 26}" fill="currentColor" aria-hidden="true">${XI[k]}</svg>`;
    const xOn = () => document.body.classList.contains('gyphm') && typeof window.gyPmXOn === 'function' && window.gyPmXOn();
    let XPREV = null;   // 进推特前聊天列表是头像条还是列表（推特私信一律列表，出来还原）
    function xBar() {
        let b = document.getElementById('gyPmX'); const bd = document.body.classList;
        const inX = xOn() && bd.contains('gyphm-app') && !S.native && (S.view === 'home' || S.view === 'chat' || S.view === 'search') && (S.app === 'home' || S.app === 'chat' || S.app === 'x');
        const thread = inX && S.view === 'chat' && chatOpen();
        const show = inX && !thread;
        bd.toggle('gyphm-xa', inX); bd.toggle('gyphm-xs', inX && S.view === 'search'); bd.toggle('gyphm-xt', thread); bd.toggle('gyphm-x', show); bd.toggle('gyphm-xdm', inX && S.view === 'chat'); const inXP = xOn() && bd.contains('gyphm-app') && !S.native && (S.view === 'profile' || S.view === 'postDetail') && (S.app === 'home' || S.app === 'chat' || S.app === 'x'); bd.toggle('gyphm-xp', inXP); bd.toggle('gyphm-xk', (inX || inXP) && typeof window.gyPmXTheme === 'function' && window.gyPmXTheme() === 'black'); if (inX || inXP) { try { xBmButtons(); } catch (e) {} }
        if (!inX && XPREV != null) { try { chatListViewMode = XPREV; renderChatCharList(); } catch (e) {} XPREV = null; }
        if (!show) { if (b) b.style.display = 'none'; xHead(thread ? 'thread' : false); return; }
        if (!b) { b = document.createElement('div'); b.id = 'gyPmX'; document.body.appendChild(b); }
        const n = unread ? unread() : 0;
        const tab = S.view === 'chat' ? 'dm' : S.view === 'search' ? 'search' : 'home'; if (tab === 'search') { try { xExPaint(); } catch (e) {} }
        let nn = 0; try { nn = unreadNotifs || 0; } catch (e) {}
        const html = `<span class="${tab === 'home' ? 'on' : ''}" onclick="gyPmXGo('home')">${xs(tab === 'home' ? 'home' : 'homeO')}</span><span class="${tab === 'search' ? 'on' : ''}" onclick="gyPmXGo('search')">${xs('search')}</span><span onclick="gyPmXGo('notif')">${xs('bell')}${nn ? `<b>${nn > 99 ? '99+' : nn}</b>` : ''}</span><span class="${tab === 'dm' ? 'on' : ''}" onclick="gyPmXGo('dm')">${xs(tab === 'dm' ? 'mailF' : 'mail')}${n ? `<b>${n > 99 ? '99+' : n}</b>` : ''}</span>`;
        if (b.__h !== html) { b.innerHTML = html; b.__h = html; }
        b.style.display = 'flex'; xHead(tab);
    }
    function xHead(tab, force) {
        const nav = document.querySelector('#gyPmBar .nav'); if (!nav) return;
        let h = document.getElementById('gyPmXHead');
        if (!tab) { if (h) h.remove(); return; }
        if (!h) { h = document.createElement('div'); h.id = 'gyPmXHead'; nav.appendChild(h); }
        h.className = 'x-' + tab;
        let me = ''; try { me = getAvatarHTML(currentUser, 32); } catch (e) {}
        if (tab === 'search') { const key = 'search|' + me.length; if (h.__h === key && !force) return; if (h.__h !== key) { h.innerHTML = `<span class="xa" onclick="gyPmXDrawer()">${me}</span><label class="xq">${xs('search', 18)}<input id="gyPmXQ" placeholder="搜索" autocomplete="off" enterkeyhint="search" onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();gyPmXSearch(this.value);this.blur()}"><i onclick="event.preventDefault();gyPmXSearch('')" style="${XQ ? '' : 'display:none'}">${xs('close', 14)}</i></label><span class="xr"><i onclick="typeof openSettingsPanel==='function'&&openSettingsPanel()">${xs('gear', 22)}</i></span>`; h.__h = key; } const i = h.querySelector('#gyPmXQ'); if (i && document.activeElement !== i) i.value = XQ; const c = h.querySelector('.xq>i'); if (c) c.style.display = XQ ? '' : 'none'; return; }
        if (tab === 'thread') { let id = null; try { id = currentChatSessionId; } catch (e) {} const ss = sessOf(id) || {}; let av = ''; try { av = getAvatarHTML(ss, 26); } catch (e) {} const html = `<span class="xb" onclick="gyPmBack()">${xs('back', 22)}</span><span class="xm" onclick="switchMainView('profile', ${JSON.stringify(id).replace(/"/g, '&quot;')})">${av}<b>${xEsc(ss.remark || ss.name || '')}</b></span><span class="xr"><i onclick="switchMainView('profile', ${JSON.stringify(id).replace(/"/g, '&quot;')})">${xs('info', 22)}</i></span>`; if (h.__h !== html) { h.innerHTML = html; h.__h = html; } return; }
        const html = tab === 'dm' ? `<span class="xa" onclick="gyPmXDrawer()">${me}</span><b class="xt">私信</b><span class="xr"><i onclick="openSettingsPanel && openSettingsPanel('notify')">${xs('gear', 22)}</i><i onclick="gyPmXNew()">${xs('newmsg', 22)}</i></span>`
            : `<span class="xa" onclick="gyPmXDrawer()">${me}</span><span class="xl">${xs('logo', 26)}</span><span class="xr"></span>`;
        if (h.__h !== html) { h.innerHTML = html; h.__h = html; }
    }
    window.gyPmXNew = async function () { try { const L = chars(); if (!L.length) return; window.gyPmXGo('dm'); } catch (e) {} };
    window.gyPmXGo = function (k) {
        if (k === 'notif') { window.gyPmOpen('notif'); return; }
        S.nav = true;
        try {
            if (k === 'search') { XQ = ''; switchMainView(document.getElementById('view-search') ? 'search' : 'home', ''); }
            else if (k === 'dm') {
                switchMainView('chat');
                if (XPREV == null) { try { XPREV = chatListViewMode; chatListViewMode = 'list'; } catch (e) {} }
                try { chatListShowingList = true; renderChatCharList(); } catch (e) {}
                if (chatOpen() && typeof window.gyChatBack === 'function') window.gyChatBack();
            } else switchMainView('home');
        } catch (e) {}
        S.nav = false; S.app = 'home';
        const t = k === 'dm' ? '私信' : k === 'search' ? '搜索' : '推特'; setTitle(t); S.stack = [{ v: k === 'dm' ? 'chat' : k === 'search' ? 'search' : 'home', t }]; syncNav(); xBar(); if (k === 'search') { xExPaint(); if (!(XEX.L[XEX.tab] || []).length) xExGen(XEX.tab, 'refresh'); }
        try { document.querySelector('.main-content').scrollTop = 0; } catch (e) {}
    };
    setInterval(() => { try { if (document.body.classList.contains('gyphm')) xBar(); } catch (e) {} }, 400);
    /* ---------- 推特：左上头像 → 侧边抽屉（个人资料 / 书签 / 设置），书签 = 推文收藏（回忆相册里的推文） ---------- */
    XI.bm = '<path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"/>';
    XI.bmF = '<path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z"/>';
    XI.user = '<path d="M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4c-1.105 0-2 .9-2 2s.895 2 2 2 2-.9 2-2-.895-2-2-2zM8 6c0-2.21 1.791-4 4-4s4 1.79 4 4-1.791 4-4 4-4-1.79-4-4z"/>';
    XI.back = '<path d="M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z"/>';
    XI.more = '<path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>';
    const xEsc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const xPostOf = id => { try { return globalPosts.find(p => String(p.id) === String(id)); } catch (e) { return null; } };
    const xIsBm = id => { try { return typeof isInMemoryAlbum === 'function' && memoryAlbum.some(m => m.type === 'post' && String(m.refId) === String(id)); } catch (e) { return false; } };
    const XBM_SAY = ['已加入书签', '收进书签了', '书签 +1', '存好了，在左上头像 → 书签里'];
    const XBM_OFF = ['已从书签移除', '拿出书签了', '不收着了'];
    const xToast = (a) => { try { const t = a[Math.floor(Math.random() * a.length)]; if (typeof showToast === 'function') showToast('<span style="font-size:20px">🔖</span>', t, ''); else if (typeof toast === 'function') toast(t); } catch (e) {} };
    window.gyPmXBm = function (id, el) {
        const p = xPostOf(id); if (!p || typeof toggleMemoryStar !== 'function') return;
        const was = xIsBm(p.id); toggleMemoryStar(null, 'post', p.id);
        xToast(was ? XBM_OFF : XBM_SAY);
        if (el) { el.classList.toggle('on', !was); el.innerHTML = xs(was ? 'bm' : 'bmF', 19); }
        if (document.getElementById('gyPmXBmPg')) xBmPage(true);
    };
    // 推文操作栏里补一个书签键（真 X 就在分享键左边）——只在推特皮肤里看得见
    function xBmButtons() {
        if (!document.body.classList.contains('gyphm-xa') && !document.body.classList.contains('gyphm-xp')) return;
        document.querySelectorAll('#feedSection .post-actions, #profileFeedSection .post-actions, #postDetailSection .post-actions').forEach(bar => {
            if (bar.querySelector('.pa-bm')) return;
            const src = bar.innerHTML.match(/postDetail',\s*'([^']+)'/) || bar.innerHTML.match(/openShareToChatModal\('([^']+)'/); if (!src) return;
            const id = src[1]; const on = xIsBm(id);
            const d = document.createElement('div'); d.className = 'pa-item pa-bm' + (on ? ' on' : ''); d.title = '书签';
            d.innerHTML = xs(on ? 'bmF' : 'bm', 19);
            d.onclick = e => { e.stopPropagation(); window.gyPmXBm(id, d); };
            const sh = bar.querySelector('.pa-share'); sh ? bar.insertBefore(d, sh) : bar.appendChild(d);
        });
    }
    function xBox(id, cls) {
        let el = document.getElementById(id);
        if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
        el.className = 'gyPmXBox ' + (cls || '') + (document.body.classList.contains('gyphm-xk') ? ' xk' : ''); return el;
    }
    window.gyPmXDrawer = function (open) {
        if (open === false) { const d = document.getElementById('gyPmXDr'); if (d) { d.classList.remove('on'); setTimeout(() => d.remove(), 220); } return; }
        const u = (typeof currentUser !== 'undefined' && currentUser) || {};
        let me = ''; try { me = getAvatarHTML(currentUser, 40); } catch (e) {}
        let fing = 0; try { fing = chars().filter(c => c.isFollowing !== false).length; } catch (e) {}
        const nBm = (() => { try { return memoryAlbum.filter(m => m.type === 'post').length; } catch (e) { return 0; } })();
        const d = xBox('gyPmXDr', 'dr');
        d.innerHTML = `<div class="mask" onclick="gyPmXDrawer(false)"></div><div class="pane">
            <div class="who"><span onclick="gyPmXDrawer(false);switchMainView('profile','me')">${me}</span>
            <b>${xEsc(u.name || '我')}</b><em>${xEsc(u.handle || '@me')}</em>
            <p><b>${typeof formatStat === 'function' ? formatStat(u.following || fing) : (u.following || fing)}</b> 正在关注　<b>${typeof formatStat === 'function' ? formatStat(u.followers || 0) : (u.followers || 0)}</b> 关注者</p></div>
            <div class="li" onclick="gyPmXDrawer(false);switchMainView('profile','me')">${xs('user', 26)}<span>个人资料</span></div>
            <div class="li" onclick="gyPmXDrawer(false);gyPmXBookmarks()">${xs('bm', 26)}<span>书签</span>${nBm ? `<i>${nBm}</i>` : ''}</div>
            <div class="li" onclick="gyPmXDrawer(false);gyPmXGo('search')">${xs('search', 26)}<span>搜索</span></div>
            <div class="hr"></div>
            <div class="li sm" onclick="gyPmXDrawer(false);gyPmXThemeSheet()"><span>推特配色：${window.gyPmXTheme && window.gyPmXTheme() === 'black' ? '黑色' : '蓝色'}</span></div>
            <div class="li sm" onclick="gyPmXDrawer(false);typeof openSettingsPanel==='function'&&openSettingsPanel()"><span>设置和隐私</span></div>
        </div>`;
        requestAnimationFrame(() => d.classList.add('on'));
    };
    window.gyPmXThemeSheet = function () {
        const set = v => { try { if (typeof window.gyPmXThemeSet === 'function') window.gyPmXThemeSet(v); } catch (e) {} xToast(v === 'black' ? ['换成黑色了', '熄灯模式', '黑色版'] : ['换成蓝色了', '经典蓝', '蓝色版']); xBar(); const p = document.getElementById('gyPmXBmPg'); if (p) xBmPage(true); };
        try { if (window.GYS && GYS.sheet) { GYS.sheet(['蓝色（经典推特）', '黑色（黑白）'], '推特配色').then(i => { if (i === 0) set('blue'); else if (i === 1) set('black'); }); return; } } catch (e) {}
        set(window.gyPmXTheme && window.gyPmXTheme() === 'black' ? 'blue' : 'black');
    };
    function xBmPage(re) {
        let L = []; try { L = memoryAlbum.filter(m => m.type === 'post'); } catch (e) {}
        const u = (typeof currentUser !== 'undefined' && currentUser) || {};
        const row = m => {
            const p = xPostOf(m.refId); const c = (p && p.char) || { name: m.charName };
            let av = ''; try { av = getAvatarHTML(c, 40); } catch (e) {}
            const t = (p && p.timestamp) || m.timestamp; const ta = t && typeof timeAgo === 'function' ? timeAgo(t) : '';
            const img = p && p.mediaUrl && !/^gylive:/.test(p.mediaUrl) ? `<img src="${xEsc(p.mediaUrl)}" alt="">` : '';
            return `<div class="tw" onclick="gyPmXBookmarks(false);switchMainView('postDetail','${xEsc(m.refId)}')">${av}<div class="tb"><div class="th"><b>${xEsc(c.name || '')}</b><em>${xEsc(c.handle || '')} · ${ta}</em></div><div class="tx">${xEsc((p && p.text) || m.text || '（这条推文已经删了）')}</div>${img}
                <div class="ta"><span>${p && p.stats ? (typeof formatStat === 'function' ? formatStat(p.stats.comments) : p.stats.comments) : ''}</span><span>${p && p.stats ? (typeof formatStat === 'function' ? formatStat(p.stats.likes) : p.stats.likes) : ''}</span><i class="on" onclick="event.stopPropagation();gyPmXBm('${xEsc(m.refId)}')">${xs('bmF', 19)}</i></div></div></div>`;
        };
        const el = xBox('gyPmXBmPg', 'pg');
        el.innerHTML = `<div class="hd"><i onclick="gyPmXBookmarks(false)">${xs('back', 22)}</i><div><b>书签</b><em>${xEsc(u.handle || '@me')}</em></div><i class="r" onclick="gyPmXBmMore()">${xs('more', 22)}</i></div>
            <div class="bd">${L.length ? L.map(row).join('') : `<div class="emp"><b>把推文存进书签，以后回来看</b><p>在任意推文上点书签图标，它就会出现在这里，只有你看得见。</p></div>`}</div>`;
        if (!re) requestAnimationFrame(() => el.classList.add('on')); else el.classList.add('on');
    }
    window.gyPmXBookmarks = function (open) {
        if (open === false) { const e = document.getElementById('gyPmXBmPg'); if (e) e.remove(); return; }
        xBmPage(false);
    };
    window.gyPmXBmMore = async function () {
        let n = 0; try { n = memoryAlbum.filter(m => m.type === 'post').length; } catch (e) {}
        if (!n) return;
        const ok = typeof appConfirm === 'function' ? await appConfirm(`清空全部 ${n} 个书签？（回忆相册里的推文收藏也会一起拿掉，聊天收藏不动）`) : confirm('清空全部书签？');
        if (!ok) return;
        try { memoryAlbum = memoryAlbum.filter(m => m.type !== 'post'); saveAllData(); } catch (e) {}
        xToast(['书签清空了', '全部拿掉了']); xBmPage(true);
    };
    /* ---------- 推特「搜索」页（照真 X 的探索页）：顶上 头像 + 搜索框 + ⚙；为你推荐 / 趋势 / 新闻 / 体育 / 娱乐；下拉刷新、滑到底加载更多 ---------- */
    XI.close = '<path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z"/>';
    XI.info = '<path d="M13.5 8.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5S11.17 7 12 7s1.5.67 1.5 1.5zM13 17v-5h-2v5h2zm-1 5.25c5.66 0 10.25-4.59 10.25-10.25S17.66 1.75 12 1.75 1.75 6.34 1.75 12 6.34 22.25 12 22.25zM20.25 12c0 4.56-3.69 8.25-8.25 8.25S3.75 16.56 3.75 12 7.44 3.75 12 3.75s8.25 3.69 8.25 8.25z"/>';
    const XEX_TABS = [['rec', '为你推荐'], ['trend', '趋势'], ['news', '新闻'], ['sport', '体育'], ['ent', '娱乐']];
    const XEX_CAT = { rec: '为你推荐（什么都有：生活、网上热点、这些人身边的事）', trend: '趋势（此刻最多人在说的）', news: '新闻', sport: '体育', ent: '娱乐' };
    const XEX_DEF = `你在模拟推特（X）「搜索 / 探索」页的「{{分类}}」栏，现在是 {{时间}}。这个世界里的人：
{{人}}
写 {{条数}} 条此刻的趋势（像真推特：话题标签或短语；可以跟这些人的生活、他们最近发的推有关，也要有普通的网上热点；不要编造真实名人的负面新闻）。
只输出 JSON 数组：[{"cat":"上面那行灰色小字，比如「娱乐 · 趋势」「在中国的趋势」「体育 · 趋势」","t":"话题（可以带 #）","n":帖子数（数字）}]`;
    try { if (typeof gyPL === 'function') gyPL('x.explore', XEX_DEF); if (typeof window.gyPLGroupAdd === 'function') window.gyPLGroupAdd({ g: '🐦 推特搜索页', items: [['x.explore', '搜索页的趋势', '推特搜索页下拉刷新 / 滑到底时', '{{分类}}：哪一栏；{{时间}}：现在；{{人}}：角色和最近的推；{{条数}}']] }); } catch (e) {}
    const XEX_K = 'gyXEx';
    let XEX = (() => { try { return JSON.parse(localStorage.getItem(XEX_K) || '{}') || {}; } catch (e) { return {}; } })();
    XEX.tab = XEX.tab || 'rec'; XEX.L = XEX.L || {}; XEX.hide = XEX.hide || [];
    const xexSave = () => { try { Object.keys(XEX.L).forEach(k => { XEX.L[k] = (XEX.L[k] || []).slice(0, 120); }); localStorage.setItem(XEX_K, JSON.stringify(XEX)); } catch (e) {} };
    let XQ = '', XBUSY = 0, XPULL = 0;
    const fmtN = n => { n = Number(n) || 0; return n >= 1e4 ? (n / 1e4).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + '万' : String(n); };
    function xJson(t) { try { t = String(t || '').replace(/<think>[\s\S]*?<\/think>/g, ''); const a = t.indexOf('['), b = t.lastIndexOf(']'); return a >= 0 && b > a ? JSON.parse(t.slice(a, b + 1)) : null; } catch (e) { return null; } }
    async function xExGen(tab, mode) {
        if (XBUSY) return; XBUSY = mode === 'more' ? 2 : 1; xExPaint();
        try {
            const api = typeof getApiConfig === 'function' ? (getApiConfig(true) || getApiConfig()) : null;
            if (!api || !api.url || typeof sendChatRequest !== 'function') { xToast(['还没设 API，刷不出新的', '先去设置里填 API 才能刷新']); return; }
            let ppl = ''; try { ppl = chars().slice(0, 8).map(c => `· ${c.name}${c.handle ? '（' + c.handle + '）' : ''}：${String(c.persona || '').slice(0, 60)}`).join('\n'); const ps = (globalPosts || []).slice(0, 8).map(p => `· ${p.char && p.char.name}：${String(p.text || '').slice(0, 40)}`).join('\n'); if (ps) ppl += '\n最近的推：\n' + ps; } catch (e) {}
            const n = new Date(); const old = (XEX.L[tab] || []).slice(0, 30).map(x => x.t).join('、');
            const prompt = (typeof gyPL === 'function' ? gyPL('x.explore', XEX_DEF, { 分类: XEX_CAT[tab], 时间: `${n.getMonth() + 1}月${n.getDate()}日 ${n.getHours()}点`, 人: ppl || '（还没有人）', 条数: 10 }) : XEX_DEF) + (old ? `\n（这些已经有了，别重复：${old}）` : '');
            const d = await sendChatRequest(api, prompt);
            const o = xJson(d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
            if (!Array.isArray(o) || !o.length) { xToast(['没刷出来，再拉一下试试', '这次没生成出来']); return; }
            const got = o.filter(x => x && x.t).map(x => ({ id: 'xe' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), cat: String(x.cat || '趋势').slice(0, 20), t: String(x.t).slice(0, 40), n: Math.max(100, Math.round(Number(x.n) || (1000 + Math.random() * 90000))), at: Date.now() }));
            XEX.L[tab] = mode === 'more' ? (XEX.L[tab] || []).concat(got) : got.concat(XEX.L[tab] || []); xexSave();
        } catch (e) {} finally { XBUSY = 0; xExPaint(); }
    }
    function xExHtml() {
        const tab = XEX.tab; let L = (XEX.L[tab] || []).filter(x => !XEX.hide.includes(x.t));
        let local = []; if (tab === 'rec' || tab === 'trend') { try { local = (trendingTags || []).filter(t => !XEX.hide.includes(t)).slice(0, tab === 'rec' ? 4 : 10).map((t, i) => ({ id: 'tg' + i, cat: '在你的世界 · 趋势', t, n: 0, local: 1 })); } catch (e) {} }
        L = local.concat(L.filter(x => !local.some(y => y.t === x.t)));
        const row = (x, i) => `<div class="xr" onclick="gyPmXSearch(${JSON.stringify(x.t).replace(/"/g, '&quot;')})"><div><small>${tab === 'trend' ? (i + 1) + ' · ' : ''}${xEsc(x.cat)}</small><b>${xEsc(x.t)}</b>${x.n ? `<small>${fmtN(x.n)} 帖子</small>` : ''}</div><i onclick="event.stopPropagation();gyPmXExHide(${JSON.stringify(x.t).replace(/"/g, '&quot;')})">${xs('more', 18)}</i></div>`;
        let who = ''; if (tab === 'rec') { try { const cs = chars().slice().sort((a, b) => (a.isFollowing ? 1 : 0) - (b.isFollowing ? 1 : 0)).slice(0, 3); if (cs.length) who = `<div class="xh">推荐关注</div>${cs.map(c => { let av = ''; try { av = getAvatarHTML(c, 40); } catch (e) {} return `<div class="xw" onclick="switchMainView('profile', ${JSON.stringify(c.id).replace(/"/g, '&quot;')})"><span class="av">${av}</span><div><b>${xEsc(c.name)}</b><small>${xEsc(c.handle || '')}</small></div><a class="${c.isFollowing ? 'on' : ''}" onclick="event.stopPropagation();toggleFollow(${JSON.stringify(c.id).replace(/"/g, '&quot;')});gyPmXExPaint()">${c.isFollowing ? '正在关注' : '关注'}</a></div>`; }).join('')}`; } catch (e) {} }
        const rows = L.map(row); if (who && rows.length > 4) rows.splice(4, 0, who); else if (who) rows.push(who);
        return `<div class="xt">${XEX_TABS.map(([k, n]) => `<span class="${tab === k ? 'on' : ''}" onclick="gyPmXExTab('${k}')">${n}</span>`).join('')}</div>
          <div class="xp" style="height:${XBUSY === 1 ? 48 : XPULL}px">${XBUSY === 1 || XPULL > 0 ? `<i class="${XBUSY === 1 ? 'spin' : ''}" style="transform:rotate(${XPULL * 4}deg)"></i>` : ''}</div>
          ${rows.join('') || (XBUSY ? '' : '<div class="xe"><b>下拉刷新看看大家在聊什么</b><p>往下拉（电脑上在最上面往上滚轮）就会刷出新的趋势，滑到底会接着加载。</p></div>')}
          ${XBUSY === 2 ? '<div class="xp" style="height:48px"><i class="spin"></i></div>' : (L.length ? '<div class="xend"></div>' : '')}`;
    }
    function xExPaint() {
        const v = document.getElementById('view-search'); if (!v || !document.body.classList.contains('gyphm-xs')) return;
        let ex = document.getElementById('gyPmXEx'); if (!ex) { ex = document.createElement('div'); ex.id = 'gyPmXEx'; v.insertBefore(ex, v.firstChild); xExBind(ex); }
        ex.style.display = XQ ? 'none' : ''; const f = document.getElementById('searchFeedSection'); if (f) f.style.display = XQ ? '' : 'none';
        if (!XQ) ex.innerHTML = xExHtml();
    }
    window.gyPmXExPaint = xExPaint;
    window.gyPmXExTab = k => { XEX.tab = k; xexSave(); xExPaint(); if (!(XEX.L[k] || []).length) xExGen(k, 'refresh'); try { document.querySelector('.main-content').scrollTop = 0; } catch (e) {} };
    window.gyPmXExHide = t => { XEX.hide.push(t); XEX.hide = XEX.hide.slice(-200); xexSave(); xExPaint(); xToast(['好的，以后少给你看这种', '不感兴趣，已隐藏', '收到，不看这个了']); };
    window.gyPmXSearch = q => { XQ = String(q || '').trim(); const i = document.getElementById('gyPmXQ'); if (i) i.value = XQ; xHead('search', true); if (XQ) { try { document.getElementById('currentSearchTitle').innerText = XQ; } catch (e) {} try { renderSearchPosts(XQ); } catch (e) {} try { if (window.gyFeatSearchRender) window.gyFeatSearchRender(XQ); } catch (e) {} } xExPaint(); try { document.querySelector('.main-content').scrollTop = 0; } catch (e) {} };
    function xExBind(ex) {
        const sc = () => document.querySelector('.main-content');
        let y0 = null;
        ex.addEventListener('touchstart', e => { const s = sc(); y0 = s && s.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
        ex.addEventListener('touchmove', e => { if (y0 == null || XBUSY) return; const dy = e.touches[0].clientY - y0; XPULL = Math.max(0, Math.min(80, dy / 2)); const p = ex.querySelector('.xp'); if (p) { p.style.height = XPULL + 'px'; p.innerHTML = XPULL > 0 ? `<i style="transform:rotate(${XPULL * 4}deg)"></i>` : ''; } }, { passive: true });
        ex.addEventListener('touchend', () => { if (y0 == null) return; y0 = null; const go = XPULL >= 60; XPULL = 0; if (go) xExGen(XEX.tab, 'refresh'); else xExPaint(); });
        let wh = 0, wt = 0; ex.addEventListener('wheel', e => { const s = sc(); if (!s || s.scrollTop > 0 || e.deltaY >= 0 || XBUSY) { wh = 0; return; } if (Date.now() - wt > 600) wh = 0; wt = Date.now(); wh += -e.deltaY; if (wh > 260) { wh = 0; xExGen(XEX.tab, 'refresh'); } }, { passive: true });
    }
    // 滑到底：加载更多
    document.addEventListener('scroll', e => { try { if (!document.body.classList.contains('gyphm-xs') || XQ || XBUSY) return; const s = e.target; if (!s || !s.classList || !s.classList.contains('main-content')) return; if (s.scrollHeight - s.scrollTop - s.clientHeight < 80 && (XEX.L[XEX.tab] || []).length) xExGen(XEX.tab, 'more'); } catch (er) {} }, true);
    window.__gyPmXEx = { gen: xExGen, st: () => XEX };
    (function () {
        const st = document.createElement('style'); st.id = 'gyPmXCss';
        st.textContent = `
/* 推特配色：两版都是白底。蓝色 = 经典推特蓝点缀；黑色 = 黑白（按钮、我的气泡、角标都是黑的） */
body.gyphm{--xb:#fff;--xf:#0f1419;--xs:#536471;--xl:#eff3f4;--xa:#1d9bf0;--xaf:#fff;--xbub:#eff3f4;--xbar:rgba(255,255,255,.92);--xhov:#f7f9f9;--xlike:#f91880}
body.gyphm.gyphm-xk{--xa:#0f1419;--xaf:#fff}
/* 推特里整页底色跟着配色走；页面里原本写死的蓝色在推特里就用推特色 */
body.gyphm.gyphm-xa .main-content,body.gyphm.gyphm-xa #view-home,body.gyphm.gyphm-xa #feedSection,body.gyphm.gyphm-xdm #view-chat,body.gyphm.gyphm-xdm #chatListVertical{background:var(--xb)!important;color:var(--xf)}
body.gyphm.gyphm-xa [style*="color:#1d9bf0"],body.gyphm.gyphm-xa [style*="color: #1d9bf0"]{color:var(--xa)!important}
body.gyphm.gyphm-xa [style*="background:#1d9bf0"],body.gyphm.gyphm-xa [style*="background: #1d9bf0"],body.gyphm.gyphm-xa [style*="background-color:#1d9bf0"]{background:var(--xa)!important;color:var(--xaf)!important}
body.gyphm.gyphm-xa .btn-post,body.gyphm.gyphm-xa .btn-primary{background:var(--xa)!important;color:var(--xaf)!important}
body.gyphm.gyphm-xa #feedSection .pa-item.like.on,body.gyphm.gyphm-xa #feedSection .pa-item.liked{color:var(--xlike)!important}
/* 底栏：四个 X 图标，选中的是实心 */
#gyPmX{position:fixed;left:var(--pm-sl);width:var(--pm-sw);top:calc(var(--pm-st) + var(--pm-sh) - 56px);height:56px;z-index:2004;display:none;align-items:flex-start;justify-content:space-around;padding-top:9px;box-sizing:border-box;background:var(--xbar);border-top:1px solid var(--xl);border-radius:0 0 var(--pm-sr) var(--pm-sr);color:var(--xf)}
#gyPmX span{position:relative;cursor:pointer;padding:0 14px;line-height:0}
#gyPmX b{position:absolute;top:-6px;left:28px;min-width:18px;height:18px;line-height:18px;border-radius:9px;background:var(--xa);color:var(--xaf);font-size:11px;text-align:center;padding:0 5px;box-sizing:border-box;border:1.5px solid var(--xb)}
body.gyphm.gyphm-x .main-content{padding-bottom:64px!important}
/* 顶栏：左头像 / 中 X 标志（私信页：私信 + ⚙ ✉） */
body.gyphm.gyphm-xa #gyPmBar{background:var(--xbar)!important;color:var(--xf)!important;border-bottom:1px solid var(--xl)}
body.gyphm.gyphm-x #gyPmBar .nav .l,body.gyphm.gyphm-x #gyPmBar .nav .t{visibility:hidden}
#gyPmXHead{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 14px}
#gyPmXHead .xa{position:absolute;left:14px;cursor:pointer;line-height:0}#gyPmXHead .xa .avatar{width:32px!important;height:32px!important;font-size:13px!important;border:none!important}
#gyPmXHead .xl{line-height:0;color:var(--xf)}
#gyPmXHead .xt{font-size:17px;font-weight:700}
#gyPmXHead .xr{position:absolute;right:12px;display:flex;gap:18px;line-height:0}#gyPmXHead .xr i{cursor:pointer}
/* 主页：为你推荐 / 正在关注 —— 选中的粗体 + 蓝色圆角短条 */
body.gyphm.gyphm-xa #view-home .top-tabs{border-bottom:1px solid var(--xl)!important;background:var(--xbar)!important}
body.gyphm.gyphm-xa #view-home .top-tabs .tab{color:var(--xs)!important;font-weight:500!important;font-size:15px!important}
body.gyphm.gyphm-xa #view-home .top-tabs .tab.active{color:var(--xf)!important;font-weight:700!important}
body.gyphm.gyphm-xa #view-home .top-tabs .tab.active::after{background:var(--xa)!important;height:4px!important;border-radius:9999px!important;width:56px!important}
/* 推文：头像不描边，名字粗体，灰色 @ 和时间，操作栏灰色 */
body.gyphm.gyphm-xa #feedSection .post-placeholder{border-bottom:1px solid var(--xl)!important;padding:12px 16px!important;gap:8px}
body.gyphm.gyphm-xa #feedSection .avatar{border:none!important}
body.gyphm.gyphm-xa #feedSection .post-name{font-weight:700!important;color:var(--xf)!important;font-size:15px!important}
body.gyphm.gyphm-xa #feedSection .post-handle,body.gyphm.gyphm-xa #feedSection .post-dot,body.gyphm.gyphm-xa #feedSection .post-time{color:var(--xs)!important;font-size:15px!important}
body.gyphm.gyphm-xa #feedSection .post-body{font-size:15px!important;line-height:20px!important;color:var(--xf)!important}
body.gyphm.gyphm-xa #feedSection .post-body a,body.gyphm.gyphm-xa #feedSection .post-body .hashtag{color:var(--xa)!important}
body.gyphm.gyphm-xa #feedSection .post-actions{color:var(--xs)!important;max-width:100%}
body.gyphm.gyphm-xa #feedSection .pa-item{color:var(--xs)!important;font-size:13px!important}
body.gyphm.gyphm-xa #feedSection .pa-item svg{width:18.75px!important;height:18.75px!important;fill:currentColor!important}
body.gyphm.gyphm-xa #feedSection .pa-item.like.on,body.gyphm.gyphm-xa #feedSection .pa-item.liked{color:#f91880!important}
body.gyphm.gyphm-xa #feedSection img{border-radius:16px!important;border:1px solid var(--xl)}
/* 发帖：蓝色圆按钮 */
body.gyphm.gyphm-x .fab-btn,body.gyphm.gyphm-x #fabPost{background:var(--xa)!important;color:var(--xaf)!important;box-shadow:0 0 10px rgba(101,119,134,.2),0 1px 3px rgba(101,119,134,.15)!important;width:56px!important;height:56px!important;bottom:calc(100vh - var(--pm-st) - var(--pm-sh) + 72px)!important}
/* 私信列表：X 私信那样 —— 没有顶上那排按钮，一行：头像 / 名字 + 时间 / 最后一句 */
body.gyphm.gyphm-xdm #chatTopBar,body.gyphm.gyphm-xdm #chatCharRow{display:none!important}
body.gyphm.gyphm-xdm #chatListVertical{padding:0!important}
body.gyphm.gyphm-xdm .chat-list-row{padding:12px 16px!important;gap:12px!important;border:none!important;border-radius:0!important;background:transparent!important;margin:0!important}
body.gyphm.gyphm-xdm .chat-list-row:active{background:var(--xhov)!important}
body.gyphm.gyphm-xdm .chat-list-row .avatar{width:48px!important;height:48px!important;border:none!important}
body.gyphm.gyphm-xdm .chat-list-name{font-weight:700!important;font-size:15px!important;color:var(--xf)!important}
body.gyphm.gyphm-xdm .chat-list-time{color:var(--xs)!important;font-size:15px!important}
body.gyphm.gyphm-xdm .chat-list-time::before{content:"· ";}
body.gyphm.gyphm-xdm .chat-list-top-row{justify-content:flex-start!important;gap:4px}
body.gyphm.gyphm-xdm .chat-list-preview{color:var(--xs)!important;font-size:15px!important}
/* 私信里面：我是蓝色、对方是灰色，圆角，右下 / 左下一个小角；不显示我自己的头像 */
body.gyphm.gyphm-xt #chatMessagesArea{background:var(--xb)!important}
body.gyphm.gyphm-xt #chatMessagesArea .chat-bubble{border-radius:24px!important;padding:12px 16px!important;font-size:15px!important;line-height:20px!important;box-shadow:none!important;border:none!important;max-width:100%}
body.gyphm.gyphm-xt #chatMessagesArea .chat-bubble.me{background:var(--xa)!important;color:var(--xaf)!important;border-bottom-right-radius:4px!important}
body.gyphm.gyphm-xt #chatMessagesArea .chat-bubble.other{background:var(--xbub)!important;color:var(--xf)!important;border-bottom-left-radius:4px!important}
body.gyphm.gyphm-xt .chat-msg-row.me>div:last-child:not(.chat-bubble-wrapper){display:none!important}
body.gyphm.gyphm-xt .chat-msg-row .avatar{width:32px!important;height:32px!important;border:none!important;font-size:13px!important}
body.gyphm.gyphm-xt .chat-sender-name{color:var(--xs)!important}
body.gyphm.gyphm-xt .chat-input-area{border-top:1px solid var(--xl)!important;background:var(--xb)!important}
body.gyphm.gyphm-xt .chat-input-area textarea,body.gyphm.gyphm-xt .chat-input-area input[type=text]{background:var(--xbub)!important;color:var(--xf)!important;border:none!important;border-radius:16px!important}
body.gyphm.gyphm-xt #chatInputArea #chatSendBtn{font-size:0!important;width:40px!important;min-width:40px!important;height:40px!important;padding:0!important;border-radius:50%!important;background:var(--xa)!important;-webkit-mask:none;position:relative}body.gyphm.gyphm-xt #chatSendBtn::after{content:'';position:absolute;inset:10px;background:var(--xaf);-webkit-mask:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M2.504 21.866l.526-2.108C3.04 19.719 4 15.823 4 12s-.96-7.719-.97-7.757l-.527-2.109L22.236 12 2.504 21.866zM5.981 13c-.072 1.962-.34 3.833-.583 5.183L17.764 12 5.398 5.818c.242 1.349.51 3.221.583 5.183H10v2H5.981z'/></svg>\") center/contain no-repeat;mask:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M2.504 21.866l.526-2.108C3.04 19.719 4 15.823 4 12s-.96-7.719-.97-7.757l-.527-2.109L22.236 12 2.504 21.866zM5.981 13c-.072 1.962-.34 3.833-.583 5.183L17.764 12 5.398 5.818c.242 1.349.51 3.221.583 5.183H10v2H5.981z'/></svg>\") center/contain no-repeat}
`;
        st.textContent += `
/* 书签键（推文操作栏） */
.pa-bm{display:none!important}
body.gyphm.gyphm-xa .pa-bm,body.gyphm.gyphm-xp .pa-bm{display:flex!important;align-items:center;cursor:pointer}
body.gyphm .pa-bm.on{color:var(--xa)!important}
/* 抽屉 / 书签页：就在小手机屏幕里 */
.gyPmXBox{position:fixed;left:var(--pm-sl);top:var(--pm-st);width:var(--pm-sw);height:var(--pm-sh);z-index:2008;border-radius:var(--pm-sr);overflow:hidden;color:var(--xf);font-size:15px;font-family:-apple-system,"Segoe UI",Roboto,"PingFang SC",sans-serif}
.gyPmXBox .mask{position:absolute;inset:0;background:rgba(91,112,131,.4);opacity:0;transition:opacity .2s}
.gyPmXBox.xk .mask{background:rgba(91,112,131,.25)}
.gyPmXBox.dr .pane{position:absolute;left:0;top:0;bottom:0;width:80%;max-width:300px;background:var(--xb);transform:translateX(-100%);transition:transform .22s ease;padding:calc(env(safe-area-inset-top,0px) + 44px) 0 20px;box-sizing:border-box;overflow:auto;box-shadow:0 0 15px rgba(101,119,134,.2)}
.gyPmXBox.dr.on .mask{opacity:1}.gyPmXBox.dr.on .pane{transform:none}
.gyPmXBox .who{padding:0 16px 12px}.gyPmXBox .who .avatar{width:40px!important;height:40px!important;border:none!important;cursor:pointer}
.gyPmXBox .who>b{display:block;font-size:17px;font-weight:700;margin-top:8px}.gyPmXBox .who>em{display:block;font-style:normal;color:var(--xs)}
.gyPmXBox .who p{margin:12px 0 0;color:var(--xs);font-size:14px}.gyPmXBox .who p b{color:var(--xf)}
.gyPmXBox .li{display:flex;align-items:center;gap:20px;padding:14px 16px;font-size:20px;font-weight:700;cursor:pointer;line-height:0}
.gyPmXBox .li span{line-height:1.2}.gyPmXBox .li i{font-style:normal;margin-left:auto;font-size:13px;color:var(--xs);font-weight:400;line-height:1}
.gyPmXBox .li:active{background:var(--xhov)}.gyPmXBox .li.sm{font-size:16px;font-weight:500;padding:12px 16px}
.gyPmXBox .hr{height:1px;background:var(--xl);margin:8px 16px}
.gyPmXBox.pg{background:var(--xb);transform:translateX(100%);transition:transform .22s ease;display:flex;flex-direction:column}.gyPmXBox.pg.on{transform:none}
.gyPmXBox.pg .hd{display:flex;align-items:center;gap:24px;padding:calc(env(safe-area-inset-top,0px) + 40px) 16px 8px;border-bottom:1px solid var(--xl);background:var(--xbar);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.gyPmXBox.pg .hd i{cursor:pointer;line-height:0}.gyPmXBox.pg .hd .r{margin-left:auto}.gyPmXBox.pg .hd b{display:block;font-size:20px;font-weight:700}.gyPmXBox.pg .hd em{font-style:normal;color:var(--xs);font-size:13px}
.gyPmXBox.pg .bd{flex:1;overflow:auto}
.gyPmXBox .tw{display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid var(--xl);cursor:pointer}.gyPmXBox .tw:active{background:var(--xhov)}
.gyPmXBox .tw .avatar{width:40px!important;height:40px!important;border:none!important;flex-shrink:0}
.gyPmXBox .tb{flex:1;min-width:0}.gyPmXBox .th{display:flex;gap:4px;white-space:nowrap;overflow:hidden}.gyPmXBox .th em{font-style:normal;color:var(--xs);overflow:hidden;text-overflow:ellipsis}
.gyPmXBox .tx{line-height:20px;white-space:pre-wrap;word-break:break-word;margin-top:2px}
.gyPmXBox .tb img{width:100%;max-height:260px;object-fit:cover;border-radius:16px;border:1px solid var(--xl);margin-top:10px}
.gyPmXBox .ta{display:flex;gap:42px;color:var(--xs);font-size:13px;margin-top:10px;align-items:center}.gyPmXBox .ta i{margin-left:auto;line-height:0;color:var(--xa)}
.gyPmXBox .emp{padding:40px 32px}.gyPmXBox .emp b{display:block;font-size:31px;line-height:36px;font-weight:800}.gyPmXBox .emp p{color:var(--xs);margin-top:8px}
/* X 个人主页：3:1 横幅、头像压在横幅上带底色描边、「编辑个人资料」描边胶囊、灰色元信息、蓝色短下划线标签 */
body.gyphm.gyphm-xp #view-profile,body.gyphm.gyphm-xp #view-post-detail{background:var(--xb)!important;color:var(--xf)!important}
body.gyphm.gyphm-xp #view-profile .profile-banner{height:auto!important;aspect-ratio:3/1;border:none!important;background-color:#cfd9de!important}
body.gyphm.gyphm-xp #view-profile .profile-details{padding:12px 16px 0!important;border-bottom:none!important}
body.gyphm.gyphm-xp #view-profile #profAvatarWrap .profile-avatar-large{width:80px!important;height:80px!important;top:-46px!important;margin-top:0!important;border:4px solid var(--xb)!important;font-size:36px!important}
body.gyphm.gyphm-xp #view-profile .profile-actions{height:auto!important;min-height:36px;margin-bottom:12px!important}
body.gyphm.gyphm-xp #view-profile .follow-btn,body.gyphm.gyphm-xp #view-profile .btn-edit-small{background:transparent!important;color:var(--xf)!important;box-shadow:none!important;border:1px solid #cfd9de!important;border-radius:9999px!important;font-weight:700!important;font-size:14px!important;padding:0 16px!important;height:34px!important}
body.gyphm.gyphm-xp #view-profile #profFollowBtn:not(.following){background:var(--xf)!important;color:var(--xb)!important;border-color:var(--xf)!important}
body.gyphm.gyphm-xp #view-profile #profName{font-size:20px!important;font-weight:800!important;color:var(--xf)!important}
body.gyphm.gyphm-xp #view-profile #profHandle,body.gyphm.gyphm-xp #view-profile .profile-meta-item{color:var(--xs)!important;font-size:15px!important}
body.gyphm.gyphm-xp #view-profile .profile-meta-item svg{stroke:var(--xs)!important}
body.gyphm.gyphm-xp #view-profile .profile-bio{font-size:15px!important;line-height:20px!important;color:var(--xf)!important;margin:12px 0!important}
body.gyphm.gyphm-xp #view-profile .profile-stats{color:var(--xs)!important;font-size:14px!important;gap:20px!important}
body.gyphm.gyphm-xp #view-profile .profile-stats b{color:var(--xf)!important}
body.gyphm.gyphm-xp #view-profile .top-tabs{border-bottom:1px solid var(--xl)!important;background:var(--xb)!important}
body.gyphm.gyphm-xp #view-profile .top-tabs .tab{color:var(--xs)!important;font-weight:500!important;font-size:15px!important}
body.gyphm.gyphm-xp #view-profile .top-tabs .tab.active{color:var(--xf)!important;font-weight:700!important}
body.gyphm.gyphm-xp #view-profile .top-tabs .tab.active::after{background:var(--xa)!important;height:4px!important;border-radius:9999px!important}
body.gyphm.gyphm-xp .post-placeholder{border-bottom:1px solid var(--xl)!important;padding:12px 16px!important}
body.gyphm.gyphm-xp .post-name{font-weight:700!important;color:var(--xf)!important}
body.gyphm.gyphm-xp .post-handle,body.gyphm.gyphm-xp .post-time,body.gyphm.gyphm-xp .post-dot,body.gyphm.gyphm-xp .pa-item{color:var(--xs)!important}
body.gyphm.gyphm-xp .post-body{color:var(--xf)!important;font-size:15px!important;line-height:20px!important}
body.gyphm.gyphm-xp .fab-btn,body.gyphm.gyphm-xp #fabPost{background:var(--xa)!important;color:var(--xaf)!important}
body.gyphm.gyphm-xp #gyPmBar{background:var(--xbar)!important;color:var(--xf)!important;border-bottom:1px solid var(--xl)}
`;
        st.textContent += `
/* 推特里顶上原来的 ‹ 标题 小窗 都藏起来，换成推特自己的顶栏（修：头像压在返回键上） */
body.gyphm.gyphm-xa #gyPmBar .nav .l,body.gyphm.gyphm-xa #gyPmBar .nav .t,body.gyphm.gyphm-xa #gyPmBar .nav .r{visibility:hidden!important;pointer-events:none}
#gyPmXHead.x-thread{justify-content:center}#gyPmXHead .xb{position:absolute;left:10px;line-height:0;cursor:pointer;padding:6px}
#gyPmXHead .xm{display:flex;align-items:center;gap:8px;cursor:pointer;max-width:62%}#gyPmXHead .xm .avatar{width:26px!important;height:26px!important;font-size:11px!important;border:none!important;flex-shrink:0}#gyPmXHead .xm b{font-size:16px;font-weight:700;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#gyPmXHead.x-search{gap:12px;justify-content:flex-start}#gyPmXHead.x-search .xa{position:static}#gyPmXHead.x-search .xr{position:static}
#gyPmXHead .xq{flex:1;display:flex;align-items:center;gap:8px;height:36px;border-radius:9999px;background:var(--xbub);padding:0 12px;color:var(--xs);box-sizing:border-box;border:1px solid transparent}
#gyPmXHead .xq:focus-within{background:var(--xb);border-color:#1d9bf0;color:#1d9bf0}
#gyPmXHead .xq input{flex:1;min-width:0;border:none!important;outline:none;background:transparent!important;font-size:15px;color:var(--xf);box-shadow:none!important;padding:0}
#gyPmXHead .xq i{line-height:0;cursor:pointer;background:#1d9bf0;color:#fff;border-radius:50%;padding:3px}
body.gyphm.gyphm-xs #view-search>.header-title{display:none!important}
body.gyphm.gyphm-xs #view-search{background:var(--xb)!important;color:var(--xf)}
#gyPmXEx{color:var(--xf);font-size:15px;padding-bottom:20px}
#gyPmXEx .xt{display:flex;overflow-x:auto;border-bottom:1px solid var(--xl);scrollbar-width:none;position:sticky;top:0;background:var(--xbar);z-index:3;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}#gyPmXEx .xt::-webkit-scrollbar{display:none}
#gyPmXEx .xt span{flex:1 0 auto;text-align:center;padding:15px 16px;color:var(--xs);font-weight:500;cursor:pointer;position:relative;white-space:nowrap}
#gyPmXEx .xt span.on{color:var(--xf);font-weight:700}#gyPmXEx .xt span.on::after{content:"";position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:56px;height:4px;border-radius:9999px;background:var(--xa)}
#gyPmXEx .xp{display:flex;align-items:center;justify-content:center;overflow:hidden;transition:height .15s}
#gyPmXEx .xp i{width:22px;height:22px;border-radius:50%;border:3px solid var(--xl);border-top-color:#1d9bf0;box-sizing:border-box}#gyPmXEx .xp i.spin{animation:gyXspin .8s linear infinite}@keyframes gyXspin{to{transform:rotate(360deg)}}
#gyPmXEx .xr{display:flex;align-items:flex-start;gap:8px;padding:12px 16px;cursor:pointer}#gyPmXEx .xr:active{background:var(--xhov)}
#gyPmXEx .xr>div{flex:1;min-width:0}#gyPmXEx .xr small{display:block;color:var(--xs);font-size:13px;line-height:16px}#gyPmXEx .xr b{display:block;font-weight:700;font-size:15px;line-height:20px;margin:2px 0;word-break:break-word}
#gyPmXEx .xr>i{color:var(--xs);line-height:0;padding:2px;border-radius:50%}
#gyPmXEx .xh{font-size:20px;font-weight:800;padding:16px 16px 8px;border-top:1px solid var(--xl)}
#gyPmXEx .xw{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer}#gyPmXEx .xw .av{width:40px;height:40px;flex:0 0 40px;display:flex;overflow:hidden;border-radius:50%}#gyPmXEx .xw .av>*{width:40px!important;height:40px!important;min-width:0!important;max-width:40px!important;border:none!important;margin:0!important;box-shadow:none!important}
#gyPmXEx .xw>div{flex:1;min-width:0}#gyPmXEx .xw b{display:block;font-weight:700}#gyPmXEx .xw small{color:var(--xs)}
#gyPmXEx .xw a{background:var(--xf);color:var(--xb);border-radius:9999px;padding:7px 16px;font-weight:700;font-size:14px;cursor:pointer}#gyPmXEx .xw a.on{background:transparent;color:var(--xf);border:1px solid #cfd9de}
#gyPmXEx .xe{padding:40px 32px}#gyPmXEx .xe b{display:block;font-size:24px;line-height:30px;font-weight:800}#gyPmXEx .xe p{color:var(--xs);margin-top:8px}
#gyPmXEx .xend{height:60px}
`;
        document.head.appendChild(st);
    })();
    window.__gyPm = { S, APPS, svg, tickSb: () => tickSb(), esc, av, chars, groups, sessOf, unread, lastChat, plain, sbHtml, pad, store, isDesk, closeSheet, enterApp: () => enterApp(), setTitle: t => setTitle(t) };

    /* ---------------- 开关 ---------------- */
    function paintEntry() { const sw = document.querySelector('#gyPmSetEntry .gypm-sw'); if (sw) sw.classList.toggle('on', isOn()); }
    window.gyPmSet = function (on, quiet) {
        on = !!on;
        try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
        if (on && typeof window.gyWxIsOn === 'function' && window.gyWxIsOn()) { try { window.gyWxSet(false, true); } catch (e) {} }
        mount();
        document.body.classList.toggle('gyphm', on);
        document.body.classList.remove('gyphm-app');
        layout();
        try { if (on) { if (window.gymWxCollapse) window.gymWxCollapse(); } else if (window.gymWxRestore && !(window.gyWxIsOn && window.gyWxIsOn())) window.gymWxRestore(); } catch (e) {}
        if (on) { if (window.gyPmLockNow) window.gyPmLockNow(); else renderHome(); } else { closeSheet(); if (window.gyPmEdit) window.gyPmEdit(false); ['gyphm-desk', 'gyphm-mob'].forEach(c => document.body.classList.remove(c)); }
        paintEntry();
        if (!quiet && typeof showToast === 'function') { try { showToast('', on ? '📱 已切到小手机模式' : '🌾 已切回谷雨', on ? '点图标打开，底下小横杠回桌面' : '', null, null, false); } catch (e) {} }
    };
    window.gyPmIsOn = () => document.body.classList.contains('gyphm');

    function addEntry() {
        if (document.getElementById('gyPmSetEntry')) return;
        const anchor = document.querySelector('.set-entry[onclick*="openSettingsPanel(\'appearance\')"]');
        if (!anchor) return;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'set-entry'; b.id = 'gyPmSetEntry'; b.setAttribute('data-core', '1');
        b.innerHTML = `<span class="set-entry-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg></span>
            <span class="set-entry-main"><span class="set-entry-title">小手机模式</span><span class="set-entry-desc">整个谷雨变成一台手机：桌面、图标、小组件，点图标进功能（跟微信模式二选一）</span></span>
            <span class="gypm-sw"></span>`;
        b.onclick = () => window.gyPmSet(!isOn());
        anchor.parentNode.insertBefore(b, anchor);
        paintEntry();
    }

    /* ---------------- 跟着谷雨走 ---------------- */
    function hooks() {
        const wrap = (name, after) => {
            const f = window[name];
            if (typeof f !== 'function' || f.__gyPm) return;
            const w = function () { const r = f.apply(this, arguments); try { after.apply(null, arguments); } catch (e) {} return r; };
            w.__gyPm = true; window[name] = w;
        };
        wrap('switchMainView', (v, prm) => {
            S.view = v;
            if (v === 'settings') setTimeout(() => { addEntry(); paintEntry(); }, 0);
            if (!window.gyPmIsOn()) return;
            // 从通知 / 弹窗里跳到别的页面：直接进 App 状态，不然新页面被桌面挡着
            if (window.__gyPmReady && !document.body.classList.contains('gyphm-app')) { enterApp(); S.stack = []; }
            if (S.native) closeNative();
            const t = viewTitle(v); if (t && v !== 'featurePage') setTitle(t);
            // 在 App 里又点进了别的页面（主页点头像进资料、设置点进某一页……）：记一层，顶上出现「‹」
            if (!S.nav) { const top = S.stack[S.stack.length - 1]; if (!top || top.v !== v || String(top.p) !== String(prm)) S.stack.push({ v, p: prm, t: (v === 'featurePage' ? S.title : t) }); }
            syncNav();
        });
        wrap('switchChatSession', id => { if (window.gyPmIsOn()) { const s = sessOf(id); if (s) setTitle(s.remark || s.name); syncNav(); } });
        wrap('backToContactList', () => { if (window.gyPmIsOn()) { setTitle('聊天'); syncNav(); } });
        wrap('gyChatBack', () => { if (window.gyPmIsOn()) setTimeout(syncNav, 20); });
        wrap('renderChatCharList', () => { if (window.gyPmIsOn() && !document.body.classList.contains('gyphm-app') && !document.body.classList.contains('gyphm-edit')) renderHome(); });
    }

    async function boot() {
        mount(); hooks(); addEntry();
        try { if (typeof window.gyPmHomeLoad === 'function') await window.gyPmHomeLoad(); } catch (e) {}
        if (isOn()) {
            if (typeof window.gyWxIsOn === 'function' && window.gyWxIsOn()) { try { window.gyWxSet(false, true); } catch (e) {} }
            document.body.classList.add('gyphm'); layout(); if (window.gyPmLockNow) window.gyPmLockNow(); else renderHome();
            try { if (window.gymWxCollapse) window.gymWxCollapse(); } catch (e) {}
        }
        ncGesture();
        setTimeout(() => { window.__gyPmReady = true; }, 2500);
        // 电脑上按 Esc：跟点左上角一样（有上一层回上一层，没有就回桌面）
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape' || !window.gyPmIsOn() || !document.body.classList.contains('gyphm-app')) return;
            if ([...document.querySelectorAll('.modal-overlay')].some(m => getComputedStyle(m).display !== 'none')) return;
            window.gyPmBack();
        });
        let rt = null;
        window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (window.gyPmIsOn()) { layout(); if (!document.body.classList.contains('gyphm-app') && !document.body.classList.contains('gyphm-edit')) renderHome(); } }, 120); });
        setInterval(() => {
            if (!window.gyPmIsOn()) return;
            tickSb();
            if (!document.body.classList.contains('gyphm-app') && !document.body.classList.contains('gyphm-edit')) renderHome();
        }, 30000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
