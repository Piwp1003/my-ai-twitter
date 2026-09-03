/* ===========================================================================
   js/26 —— 🛒 商城
   原来是插件（全能商城插件.json），v101 起内置。装过旧插件的可以在「🔌 插件」页删掉，
   老插件存在 localStorage 里的商品和订单会自动搬过来，一件都不会丢。
   ---------------------------------------------------------------------------
   跟插件版比，内置版改了四件事：

   1. **不是右下角那个圆按钮了，是一整页**。悬浮球在手机上正好压在输入框和
      发帖按钮上，而且商品列表塞进一个小弹窗里根本看不清。现在入口在
      设置 → 🧩 小功能 → 商城。
   2. **商品能分享**：发成推文，或者直接分享到某个角色的私聊——分享是跳到
      私聊页面、把话填进输入框，发不发、怎么说由你决定，TA 按人设回你。
   3. **买给角色的东西会真的进 TA 的随身物**（js/25）。以前包裹签收就完了，
      角色转头就忘；现在那件东西会带着"谁买的、什么时候"进清单，
      以后 TA 提起它是真的记得。
   4. **开关收进统一的开关页**。插件版自己藏了两个 checkbox，
      跟设置 → ⚙️ 自动化功能那一页各说各的。现在归到「🛒 购物」那一组里。

   💰 花钱的地方就三处，都有开关：角色自己随机网购、物流文案按世界观生成、
      快递到角色手上时 TA 来找你说一句。全关掉之后这一页纯手动，一次都不调。
   =========================================================================== */
(function () {
    if (window.__gyMallLoaded) return;
    window.__gyMallLoaded = true;

    const LF = (typeof localforage !== 'undefined')
        ? localforage.createInstance({ name: 'gyMallBox', storeName: 'mall' })
        : null;
    const KEY = 'gyMall_state';
    const OLD_KEY = 'mallPluginState_v2';   // 插件版的存档位置，只读一次然后搬过来
    const KEEP_ORDERS = 200;                // 订单最多留这么多条，再老的自己掉队

    let S = {
        products: [],
        orders: [],
        settings: {
            minDeliveryMin: 20,
            maxDeliveryMin: 180,
            buyProbabilityPerRoll: 0.08,
            courierCharId: ''
        },
        lastRandomCheckAt: 0
    };

    // ---------- 小工具 ----------
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const chars = () => (typeof myCharacters !== 'undefined' ? myCharacters : []);
    const charOf = id => chars().find(c => String(c.id) === String(id)) || null;
    const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const meName = () => (typeof currentUser !== 'undefined' && currentUser && currentUser.name) ? currentUser.name : '我';
    const nameOf = id => id === 'me' ? meName() : ((charOf(id) || {}).name || '未知');
    const on = k => (typeof isAutoOn === 'function') ? isAutoOn(k) : true;
    const fmt = t => new Date(t).toLocaleString('zh-CN', { hour12: false });

    async function save() {
        try {
            if (S.orders.length > KEEP_ORDERS) S.orders = S.orders.slice(0, KEEP_ORDERS);
            if (LF) await LF.setItem(KEY, JSON.parse(JSON.stringify(S)));
            else localStorage.setItem(KEY, JSON.stringify(S));
        } catch (e) { console.warn('[商城] 存档失败：', e); }
    }
    async function load() {
        let d = null;
        try { d = LF ? await LF.getItem(KEY) : JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
        if (!d) {
            // 老插件的存档搬过来（只搬一次，搬完写进新位置，老的原样留着不动，卸插件也不影响）
            try {
                const raw = localStorage.getItem(OLD_KEY);
                if (raw) {
                    d = JSON.parse(raw);
                    console.info('[商城] 从插件版存档搬来了 ' + ((d.products || []).length) + ' 个商品、' + ((d.orders || []).length) + ' 个订单');
                }
            } catch (e) {}
        }
        if (d && typeof d === 'object') {
            if (Array.isArray(d.products)) S.products = d.products;
            if (Array.isArray(d.orders)) S.orders = d.orders;
            if (d.settings) S.settings = Object.assign(S.settings, d.settings);
            if (d.lastRandomCheckAt) S.lastRandomCheckAt = d.lastRandomCheckAt;
        }
        if (!S.lastRandomCheckAt) S.lastRandomCheckAt = Date.now();
    }

    // ---------- 物流：时间线 / 进度 ----------
    function checkpoints(o) {
        const t3 = o.status === 'delivered' ? (o.deliveredAt || (o.orderedAt + o.etaMs)) : (o.orderedAt + o.etaMs);
        return [
            { time: o.orderedAt, label: '已下单', ico: '📝' },
            { time: o.orderedAt + o.etaMs * 0.25, label: '仓库已发出', ico: '📦' },
            { time: o.orderedAt + o.etaMs * 0.66, label: '运输途中', ico: '🚚' },
            { time: t3, label: '已签收', ico: '✅' }
        ];
    }
    function progress(o) {
        if (o.status === 'delivered') return 1;
        return Math.max(0, Math.min(1, (Date.now() - o.orderedAt) / o.etaMs));
    }
    function stageLabel(o) {
        if (o.status === 'delivered') return '已签收';
        const p = progress(o);
        return p >= 0.66 ? '派送中' : p >= 0.25 ? '运输途中' : '仓库处理中';
    }
    function etaLabel(o) {
        if (o.status === 'delivered') return '签收于 ' + fmt(o.deliveredAt || o.orderedAt + o.etaMs);
        const mins = Math.round(Math.max(0, (o.orderedAt + o.etaMs) - Date.now()) / 60000);
        if (mins <= 0) return '马上就到';
        if (mins < 60) return '预计 ' + mins + ' 分钟后送达';
        return '预计 ' + Math.round(mins / 60 * 10) / 10 + ' 小时后送达';
    }

    // 按收货人/下单人的世界书写四句物流文案（一单一次调用，开关：mallTimeline）
    function worldbookTextOf(char) {
        try {
            if (!char || typeof getWorldbookForChar !== 'function') return '';
            const t = getWorldbookForChar(char);
            return typeof t === 'string' ? t.slice(0, 1200) : '';
        } catch (e) { return ''; }
    }
    async function genTimeline(order, refChar) {
        if (!on('mallTimeline')) return;
        if (order.timelineFlavor || order.timelineGenerating) return;
        order.timelineGenerating = true;
        try {
            const api = (typeof getApiConfig === 'function') ? getApiConfig(true) : null;
            if (!api || !api.key) { order.timelineGenerating = false; return; }
            const wb = worldbookTextOf(refChar);
            const p = '请你结合下面的世界观设定，为一次网购"从下单到签收"的物流全过程编写 4 句简短的物流跟踪文案' +
                '（每句不超过 20 字，符合这个世界观的氛围/科技水平/物流行业习惯；如果设定里没有特别提到物流/快递相关的内容，' +
                '就写贴近现实生活的真实物流用语即可，不要生硬编造）：\n' +
                '商品：' + order.productSnapshot.name + '\n' +
                '收货人：' + nameOf(order.forWhom) + '\n' +
                (wb ? '世界观设定：\n' + wb + '\n' : '') +
                '严格只输出一个 JSON 数组，四个字符串，依次对应【已下单 / 仓库已发出 / 运输途中 / 已签收】，不要任何其他文字。';
            const msgs = (typeof buildStructuredMessages === 'function') ? buildStructuredMessages('', [], p) : [{ role: 'user', content: p }];
            const data = await callChatCompletionAPI(api, msgs);
            const raw = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
            const m = raw.match(/\[[\s\S]*\]/);
            const arr = JSON.parse(m ? m[0] : raw);
            if (Array.isArray(arr) && arr.length >= 4) order.timelineFlavor = arr.slice(0, 4).map(x => String(x).slice(0, 40));
        } catch (e) { console.warn('[商城] 物流文案生成失败：', e); }
        order.timelineGenerating = false;
        await save();
        if (detailId === order.id) openDetail(order.id);
    }

    function timelineHtml(o) {
        const now = Date.now();
        const cps = checkpoints(o);
        const rows = cps.map((cp, i) => {
            const reached = (i === 3) ? (o.status === 'delivered') : (now >= cp.time);
            const flavor = (o.timelineFlavor && o.timelineFlavor[i]) ? o.timelineFlavor[i]
                : (o.timelineGenerating ? '（文案生成中…）' : '');
            return `<div class="gymall-tl-row ${reached ? 'on' : ''}">
                <div class="gymall-tl-dot">${reached ? cp.ico : ''}</div>
                <div class="gymall-tl-body">
                    <div class="gymall-tl-label">${cp.label}${flavor ? ' <span class="gymall-tl-flavor">' + esc(flavor) + '</span>' : ''}</div>
                    <div class="gymall-tl-time">${reached ? '' : '预计 '}${fmt(cp.time)}</div>
                </div></div>`;
        }).join('');
        return `<div class="gymall-tl">${rows}</div>`;
    }

    // ---------- 心跳 ----------
    async function tick() {
        let changed = false;
        const arrived = [];
        S.orders.forEach(o => {
            if (o.status !== 'delivered' && Date.now() - o.orderedAt >= o.etaMs) {
                o.status = 'delivered';
                o.deliveredAt = o.orderedAt + o.etaMs;
                changed = true;
                arrived.push(o);
            }
        });
        if (changed) await save();
        for (const o of arrived) await onDelivered(o);

        // 角色自己随机网购
        const five = 5 * 60 * 1000;
        const since = Date.now() - (S.lastRandomCheckAt || Date.now());
        if (on('mallAutoBuy') && since >= five) {
            const rolls = Math.min(6, Math.floor(since / five));   // 离开太久最多补滚 6 次，回来时不会突然一堆订单
            for (let i = 0; i < rolls; i++) {
                if (Math.random() < (parseFloat(S.settings.buyProbabilityPerRoll) || 0)) randomPurchase();
            }
            S.lastRandomCheckAt = Date.now();
            await save();
        }
        paintBadge();
        if (viewOpen()) { if (tab === 'orders') renderOrders(); }
        if (detailId && isDetailOpen()) openDetail(detailId);
    }

    async function onDelivered(o) {
        o.notifiedAt = Date.now();
        const who = o.forWhom === 'me' ? '你' : nameOf(o.forWhom);
        const body = who + '的包裹到了：' + (o.productSnapshot.emoji || '📦') + ' ' + o.productSnapshot.name;
        // 通知页也留一条，别只弹个 toast 就没了（弹窗错过了就再也找不回来）
        try {
            if (typeof addNotification === 'function') {
                // 送给角色的 → 点通知进那个人的私聊；给自己的 → 点通知直接进商城
                addNotification('📦 <b>快递到了</b>', null, o.forWhom === 'me' ? null : o.forWhom,
                    charOf(o.forWhom), body, o.forWhom === 'me' ? { view: 'mall' } : null);
            }
        } catch (e) {}
        try { if (typeof sendBrowserNotification === 'function') sendBrowserNotification('📦 快递到了！', body); } catch (e) {}
        try { if (typeof showToast === 'function') showToast('', '📦 快递到了', body, null, null, false); } catch (e) {}
        await save();
        await putIntoKit(o);
        reactToDelivery(o);
    }

    // 🎒 买给角色的东西真的进 TA 的随身物（js/25），带着来历
    async function putIntoKit(o) {
        try {
            if (o.kitAdded) return;
            if (!o || o.forWhom === 'me') return;
            if (!window.gyKit || typeof window.gyKit.add !== 'function') return;
            const from = o.boughtBy === 'me' ? 'user' : (o.boughtBy === o.forWhom ? 'self' : 'char:' + o.boughtBy);
            const fromName = o.boughtBy === 'me' ? meName() : nameOf(o.boughtBy);
            await window.gyKit.add(o.forWhom, o.productSnapshot.name, o.productSnapshot.description || '', from, fromName);
            o.kitAdded = true;
            await save();
        } catch (e) { console.warn('[商城] 写进随身物失败：', e); }
    }

    // 快递到角色手上，TA 自己决定要不要来说一句（开关：mallReact）
    async function reactToDelivery(o) {
        try {
            if (!on('mallReact')) return;
            if (!o || o.forWhom === 'me') return;
            const c = charOf(o.forWhom);
            if (!c) return;
            const api = (typeof getApiConfig === 'function') ? getApiConfig(true) : null;
            if (!api || !api.key) return;
            const byText = o.boughtBy === 'me' ? '用户' : (o.boughtBy === o.forWhom ? '你自己' : nameOf(o.boughtBy));
            const base = (typeof buildBasePrompt === 'function') ? buildBasePrompt(c, false) : ('你是' + c.name + '，人设：' + (c.persona || ''));
            const p = base + '\n刚刚你的一个快递到了：' + (o.productSnapshot.emoji || '📦') + ' ' + o.productSnapshot.name +
                '（' + (o.productSnapshot.description || '无描述') + '），是' + byText + '买的' +
                (o.reasonText ? '，当时的说法是："' + o.reasonText + '"' : '') + '。' +
                '\n请结合你的人设，判断你现在要不要主动找用户聊几句提一下这件事（惊喜、吐槽、道谢、"这是啥"都行，' +
                '也可以选择不提——比如你本来话就不多，或者这东西对你来说没什么大不了）。' +
                '\n不想提就只输出 NO。想说就直接输出你要说的话（不超过 60 字，不要引号，不要任何多余说明）。';
            const msgs = (typeof buildStructuredMessages === 'function') ? buildStructuredMessages('', [], p) : [{ role: 'user', content: p }];
            const data = await callChatCompletionAPI(api, msgs);
            const raw = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
            if (!raw || raw.toUpperCase().indexOf('NO') === 0) return;
            const text = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').replace(/^["「]|["」]$/g, '').trim();
            if (text && typeof deliverCharMoveToChatMessage === 'function') deliverCharMoveToChatMessage(c, text, null);
        } catch (e) { console.warn('[商城] 角色对到货的反应失败：', e); }
    }

    // ---------- 下单 ----------
    function newOrder(product, forWhom, boughtBy, reasonText) {
        const min = (parseInt(S.settings.minDeliveryMin) || 20) * 60000;
        const max = (parseInt(S.settings.maxDeliveryMin) || 180) * 60000;
        return {
            id: uid('mo_'),
            productId: product.id,
            productSnapshot: { name: product.name, price: product.price, emoji: product.emoji || '📦', description: product.description || '' },
            forWhom, boughtBy,
            status: 'shipping', orderedAt: Date.now(), etaMs: min + Math.random() * Math.max(0, max - min),
            deliveredAt: null, notifiedAt: null, opened: false, kitAdded: false,
            reasonText: reasonText || '', complaints: [], timelineFlavor: null, timelineGenerating: false
        };
    }

    async function randomPurchase() {
        if (!S.products.length || !chars().length) return;
        const buyer = chars()[Math.floor(Math.random() * chars().length)];
        const product = S.products[Math.floor(Math.random() * S.products.length)];
        const forWhom = Math.random() < 0.5 ? buyer.id : 'me';

        let reason = '';
        try {
            const api = (typeof getApiConfig === 'function') ? getApiConfig(true) : null;
            if (api && api.key) {
                const p = '你是"' + buyer.name + '"，人设：' + (buyer.persona || '') + '。你刚刚心血来潮，网购/点了"' + product.name + '"（' +
                    (product.description || '无描述') + '），' + (forWhom === 'me' ? '打算送给用户/给用户点的外卖，当作一份心意' : '是买给你自己的') +
                    '。请用第一人称写一句简短的内心独白，说说此刻为什么想买这个、当下的心情或场景，不超过 40 字。只输出这句话本身，不要引号。';
                const msgs = (typeof buildStructuredMessages === 'function') ? buildStructuredMessages('', [], p) : [{ role: 'user', content: p }];
                const data = await callChatCompletionAPI(api, msgs);
                reason = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '')
                    .trim().replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').replace(/^["「]|["」]$/g, '').slice(0, 100);
            }
        } catch (e) {}
        if (!reason) reason = forWhom === 'me' ? (buyer.name + '给你点了份「' + product.name + '」～') : (buyer.name + '给自己买了「' + product.name + '」。');

        const o = newOrder(product, forWhom, buyer.id, reason);
        S.orders.unshift(o);
        await save();
        genTimeline(o, buyer);

        try {
            if (typeof globalChats !== 'undefined' && globalChats[buyer.id]) {
                globalChats[buyer.id].push({ sender: buyer.id, text: '[下单] ' + reason, timestamp: Date.now(), readBy: [] });
                if (typeof currentChatSessionId !== 'undefined' && currentChatSessionId == buyer.id && typeof renderChatMessages === 'function') renderChatMessages();
                if (typeof saveAllData === 'function') saveAllData();
            }
        } catch (e) {}
        paintBadge();
        if (viewOpen() && tab === 'orders') renderOrders();
    }

    async function buyManually(productId, forWhom) {
        const product = S.products.find(p => p.id === productId);
        if (!product) return;
        const o = newOrder(product, forWhom, 'me',
            forWhom === 'me' ? '你自己下单买的。' : ('你给 ' + nameOf(forWhom) + ' 买了一份心意。'));
        S.orders.unshift(o);
        await save();
        paintBadge();
        genTimeline(o, forWhom === 'me' ? null : charOf(forWhom));
        toast('下单成功 · ' + etaLabel(o));
        tab = 'orders'; renderAll();
    }

    const toast = m => { try { if (typeof showToast === 'function') showToast('', '🛒 商城', m, null, null, false); } catch (e) {} };

    // ---------- 分享商品 ----------
    // 分享到私聊 = 跳到私聊页面，把话填进输入框。发不发、改不改由你，TA 按人设回你。
    function shareToChat(productId, charId) {
        const p = S.products.find(x => x.id === productId);
        const c = charOf(charId);
        if (!p || !c) return;
        closeModal_();
        try {
            if (typeof switchMainView === 'function') switchMainView('chat');
            if (typeof switchChatSession === 'function') switchChatSession(c.id);
        } catch (e) {}
        setTimeout(() => {
            const input = document.getElementById('chatInput');
            if (!input) return;
            input.value = `[分享商品] ${p.emoji || '📦'} ${p.name}（￥${p.price}）${p.description ? ' —— ' + p.description : ''}　你看这个怎么样？`;
            input.focus();
            try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
        }, 260);
    }

    // 分享成推文：直接进主页时间线，跟你自己发的一条一样（角色照常来评论）
    async function shareToFeed(productId) {
        const p = S.products.find(x => x.id === productId);
        if (!p) return;
        if (typeof globalPosts === 'undefined') return toast('时间线还没准备好');
        const me = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : { name: '我' };
        globalPosts.unshift({
            id: 'u_' + Date.now(),
            char: JSON.parse(JSON.stringify(me)),
            text: `${p.emoji || '📦'} ${p.name}（￥${p.price}）\n${p.description || ''}`.trim(),
            timestamp: Date.now(), replies: [], mediaUrl: null,
            stats: { comments: 0, retweets: 0, likes: 0, views: 0 },
            isStory: false, location: me.location || '', likedBy: [], quotedPostId: null
        });
        try { if (typeof saveAllData === 'function') saveAllData(); } catch (e) {}
        closeModal_();
        toast('已经发到主页了');
        try { if (typeof switchMainView === 'function') switchMainView('home'); } catch (e) {}
    }

    // ---------- prompt 注入 ----------
    window.__gyMallCtxFor = function (charId) {
        try {
            const c = charOf(charId);
            if (!c) return '';
            let mine = S.orders.filter(o => String(o.boughtBy) === String(charId) || String(o.forWhom) === String(charId));
            if (!mine.length) return '';
            mine = mine.sort((a, b) => b.orderedAt - a.orderedAt).slice(0, 3);
            const st = o => {
                if (o.status === 'delivered') return '已签收' + (o.opened ? '（已经拆开看过了）' : '（还没来得及拆开）');
                const p = progress(o);
                return p >= 0.66 ? '派送中，快到了' : p >= 0.25 ? '运输途中' : '仓库处理中，商家还在打包';
            };
            const lines = mine.map(o => {
                const role = String(o.boughtBy) === String(charId)
                    ? (String(o.forWhom) === String(charId) ? '你自己买的' : ('你买来送给' + nameOf(o.forWhom) + '的'))
                    : (nameOf(o.boughtBy) + '买来送给你的');
                return '- ' + role + '「' + o.productSnapshot.name + '」：' + st(o);
            });
            return '\n【你的购物/包裹动态（真实发生过的事，符合当下情境时可以自然提一句，不用每次都刻意聊，不提也没关系）】：\n' + lines.join('\n') + '\n';
        } catch (e) { return ''; }
    };

    // ===================== 页面 =====================
    const CSS = `
    #view-mall{padding:0;}
    .gymall{--mc:#ff7a45;--mc2:#ffb37a;--mbg:var(--gy-game-box-bg,#fff7f2);--mfg:var(--gy-game-box-fg,#3b2a20);}
    .gymall-top{padding:18px 18px 0;}
    .gymall-mark{font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.28em;color:var(--mc);text-transform:uppercase;}
    .gymall-title{font-size:22px;font-weight:800;margin:6px 0 2px;display:flex;align-items:center;gap:8px;}
    .gymall-sub{font-size:12.5px;color:#8b98a5;line-height:1.7;}
    .gymall-badge{background:#f91880;color:#fff;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;}
    .gymall-tabs{display:flex;gap:6px;padding:14px 18px 0;border-bottom:1px solid rgba(128,128,128,.18);}
    .gymall-tab{padding:9px 16px;font-size:14px;cursor:pointer;border-radius:10px 10px 0 0;color:#8b98a5;border:1px solid transparent;border-bottom:none;user-select:none;}
    .gymall-tab.on{color:var(--mc);font-weight:700;background:var(--mbg);border-color:rgba(255,122,69,.3);}
    .gymall-body{padding:16px 18px 90px;}
    .gymall-card{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid rgba(128,128,128,.2);border-radius:14px;margin-bottom:10px;background:var(--mbg);color:var(--mfg);}
    .gymall-emoji{font-size:30px;width:46px;height:46px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(255,122,69,.12);flex-shrink:0;}
    .gymall-nm{font-weight:700;font-size:14.5px;}
    .gymall-price{color:var(--mc);font-weight:700;font-size:12.5px;margin-left:6px;}
    .gymall-dim{font-size:12px;color:#8b98a5;}
    .gymall-btn{border:1px solid var(--mc);color:var(--mc);background:transparent;border-radius:999px;padding:5px 12px;font-size:12.5px;cursor:pointer;white-space:nowrap;}
    .gymall-btn.solid{background:var(--mc);color:#fff;}
    .gymall-btn.ghost{border-color:rgba(128,128,128,.4);color:#8b98a5;}
    .gymall-acts{display:flex;flex-direction:column;gap:6px;flex-shrink:0;}
    .gymall-order{padding:12px 14px;border:1px solid rgba(128,128,128,.2);border-radius:14px;margin-bottom:10px;cursor:pointer;background:var(--mbg);color:var(--mfg);}
    .gymall-order:hover{border-color:var(--mc);}
    .gymall-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#f91880;margin-right:6px;}
    .gymall-bar{height:4px;border-radius:99px;background:rgba(128,128,128,.2);margin-top:8px;overflow:hidden;}
    .gymall-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--mc2),var(--mc));}
    .gymall-form{border:1px dashed rgba(128,128,128,.35);border-radius:14px;padding:14px;margin-top:14px;}
    .gymall-form input,.gymall-form textarea,.gymall-form select{width:100%;padding:9px;border:1px solid rgba(128,128,128,.35);border-radius:9px;box-sizing:border-box;margin-bottom:8px;background:transparent;color:inherit;font-size:13px;}
    .gymall-row{display:flex;gap:8px;}
    .gymall-empty{color:#8b98a5;text-align:center;padding:32px 12px;font-size:13.5px;line-height:1.9;}
    .gymall-tl{margin:12px 0;padding-left:4px;}
    .gymall-tl-row{display:flex;gap:10px;position:relative;padding-bottom:14px;}
    .gymall-tl-row:not(:last-child):before{content:'';position:absolute;left:11px;top:22px;bottom:0;width:2px;background:rgba(128,128,128,.25);}
    .gymall-tl-dot{width:24px;height:24px;border-radius:50%;background:rgba(128,128,128,.18);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;z-index:1;}
    .gymall-tl-row.on .gymall-tl-dot{background:var(--mc);}
    .gymall-tl-label{font-size:13px;font-weight:600;}
    .gymall-tl-row:not(.on) .gymall-tl-label{color:#8b98a5;font-weight:400;}
    .gymall-tl-flavor{font-weight:400;color:#8b98a5;font-size:12px;}
    .gymall-tl-time{font-size:11px;color:#8b98a5;}
    .gymall-msg{max-width:80%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.6;}
    .gymall-set-row{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:1px solid rgba(128,128,128,.15);}
    @media(max-width:600px){.gymall-body{padding:14px 12px 110px;}.gymall-top{padding:14px 12px 0;}.gymall-tabs{padding:12px 12px 0;}}
    `;

    let tab = 'products';
    let detailId = null;
    const viewOpen = () => { const v = document.getElementById('view-mall'); return v && v.style.display !== 'none'; };
    const isDetailOpen = () => { const m = document.getElementById('gymallModal'); return m && m.style.display === 'flex'; };

    function mountView() {
        if (document.getElementById('view-mall')) return;
        const st = document.createElement('style'); st.id = 'gymallStyle'; st.textContent = CSS; document.head.appendChild(st);
        const host = document.querySelector('.main-content') || document.body;
        const v = document.createElement('div');
        v.id = 'view-mall';
        v.className = 'gymall';
        v.style.display = 'none';
        v.innerHTML = `
            <div class="gymall-top">
                <div class="gymall-mark">Marketplace</div>
                <div class="gymall-title">🛒 商城 <span class="gymall-badge" id="gymallBadge" style="display:none">0</span></div>
                <div class="gymall-sub">你和角色都能上架东西。买给角色的会真的进 TA 的<b>随身物</b>，TA 以后提起来是记得来历的。</div>
            </div>
            <div class="gymall-tabs">
                <div class="gymall-tab" id="gymallTab-products" onclick="gymallTab('products')">商品</div>
                <div class="gymall-tab" id="gymallTab-orders" onclick="gymallTab('orders')">我的订单</div>
                <div class="gymall-tab" id="gymallTab-settings" onclick="gymallTab('settings')">设置</div>
            </div>
            <div class="gymall-body" id="gymallBody"></div>`;
        host.appendChild(v);
    }

    function renderAll() {
        ['products', 'orders', 'settings'].forEach(t => {
            const el = document.getElementById('gymallTab-' + t);
            if (el) el.className = 'gymall-tab' + (t === tab ? ' on' : '');
        });
        if (tab === 'products') renderProducts();
        else if (tab === 'orders') renderOrders();
        else renderSettings();
        paintBadge();
    }
    window.gymallTab = t => { tab = t || 'products'; renderAll(); };

    function paintBadge() {
        const n = S.orders.filter(o => o.status === 'delivered' && !o.opened).length;
        const b = document.getElementById('gymallBadge');
        if (b) { b.style.display = n > 0 ? '' : 'none'; b.innerText = n > 9 ? '9+' : String(n); }
    }

    const charOpts = (sel, prefix) => chars().map(c =>
        `<option value="${c.id}"${String(sel) === String(c.id) ? ' selected' : ''}>${(prefix || '') + esc(c.name)}</option>`).join('');

    function renderProducts() {
        const body = document.getElementById('gymallBody');
        if (!body) return;
        const list = !S.products.length
            ? `<div class="gymall-empty">货架是空的。<br>在下面加一样东西吧——一杯咖啡、一条围巾、一份深夜外卖都行。</div>`
            : S.products.map(p => `
            <div class="gymall-card">
                <div class="gymall-emoji">${esc(p.emoji || '📦')}</div>
                <div style="flex:1;min-width:0;">
                    <div class="gymall-nm">${esc(p.name)}<span class="gymall-price">￥${esc(p.price)}</span></div>
                    <div class="gymall-dim">${esc(p.description || '')}</div>
                    <div class="gymall-dim" style="margin-top:2px;opacity:.8;">${p.ownerId === 'me' ? '你上架的' : esc(nameOf(p.ownerId)) + ' 上架的'}</div>
                </div>
                <div class="gymall-acts">
                    <button type="button" class="gymall-btn solid" onclick="gymallBuyPicker('${p.id}')">购买</button>
                    <button type="button" class="gymall-btn" onclick="gymallSharePicker('${p.id}')">分享</button>
                    <button type="button" class="gymall-btn ghost" onclick="gymallDelProduct('${p.id}')">删除</button>
                </div>
            </div>`).join('');
        body.innerHTML = list + `
            <div class="gymall-form">
                <div style="font-weight:700;font-size:13px;margin-bottom:10px;">➕ 上架一样东西</div>
                <input type="text" id="gymallPName" placeholder="叫什么" maxlength="30">
                <div class="gymall-row">
                    <input type="text" id="gymallPEmoji" value="📦" style="width:76px;flex:none;" maxlength="4">
                    <input type="number" id="gymallPPrice" placeholder="多少钱">
                </div>
                <textarea id="gymallPDesc" rows="2" placeholder="描述（选填，角色会看到）"></textarea>
                <div class="gymall-row" style="align-items:center;">
                    <label class="gymall-dim" style="white-space:nowrap;">上架人</label>
                    <select id="gymallPOwner"><option value="me">你（公共货架）</option>${charOpts()}</select>
                </div>
                <button type="button" class="gymall-btn solid" style="width:100%;padding:9px;" onclick="gymallAddProduct()">上架</button>
            </div>`;
    }

    window.gymallAddProduct = async function () {
        const g = id => (document.getElementById(id) || {}).value || '';
        const name = g('gymallPName').trim();
        if (!name) return toast('先给它起个名字');
        S.products.unshift({
            id: uid('mp_'), name,
            price: g('gymallPPrice').trim() || '0',
            emoji: g('gymallPEmoji').trim() || '📦',
            description: g('gymallPDesc').trim(),
            ownerId: g('gymallPOwner') || 'me',
            createdAt: Date.now()
        });
        await save();
        renderProducts();
    };
    window.gymallDelProduct = async function (id) {
        S.products = S.products.filter(p => p.id !== id);
        await save();
        renderProducts();
    };

    // ---------- 通用小弹窗 ----------
    function modal(html) {
        let m = document.getElementById('gymallModal');
        if (!m) { m = document.createElement('div'); m.id = 'gymallModal'; m.className = 'modal-overlay'; document.body.appendChild(m); }
        m.innerHTML = html;
        m.style.display = 'flex';
        return m;
    }
    function closeModal_() {
        const m = document.getElementById('gymallModal');
        if (m) m.style.display = 'none';
        detailId = null;
    }
    window.gymallClose = closeModal_;

    window.gymallBuyPicker = function (pid) {
        const p = S.products.find(x => x.id === pid);
        if (!p) return;
        modal(`<div class="modal-box gymall" style="width:92%;max-width:340px;">
            <h3 style="margin:0 0 4px;">买给谁？</h3>
            <div class="gymall-dim" style="margin-bottom:12px;">${esc(p.emoji || '📦')} ${esc(p.name)}　买给角色的东西签收后会进 TA 的随身物。</div>
            <select id="gymallBuyFor" style="width:100%;padding:9px;border:1px solid rgba(128,128,128,.35);border-radius:9px;background:transparent;color:inherit;margin-bottom:14px;">
                <option value="me">给我自己</option>${charOpts(null, '送给：')}
            </select>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button type="button" class="gymall-btn ghost" onclick="gymallClose()">再想想</button>
                <button type="button" class="gymall-btn solid" onclick="gymallConfirmBuy('${pid}')">下单</button>
            </div></div>`);
    };
    window.gymallConfirmBuy = function (pid) {
        const sel = document.getElementById('gymallBuyFor');
        const forWhom = sel ? sel.value : 'me';
        closeModal_();
        buyManually(pid, forWhom);
    };

    window.gymallSharePicker = function (pid) {
        const p = S.products.find(x => x.id === pid);
        if (!p) return;
        modal(`<div class="modal-box gymall" style="width:92%;max-width:360px;">
            <h3 style="margin:0 0 4px;">分享「${esc(p.name)}」</h3>
            <div class="gymall-dim" style="margin-bottom:14px;line-height:1.8;">
                分享到私聊会<b>跳到那个人的聊天页、把话填进输入框</b>——发不发、怎么改由你，TA 收到之后按人设回你。
            </div>
            <select id="gymallShareTo" style="width:100%;padding:9px;border:1px solid rgba(128,128,128,.35);border-radius:9px;background:transparent;color:inherit;margin-bottom:12px;">
                ${chars().length ? charOpts(null, '私聊：') : '<option value="">（还没有角色）</option>'}
            </select>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                <button type="button" class="gymall-btn ghost" onclick="gymallClose()">取消</button>
                <button type="button" class="gymall-btn" onclick="gymallShareFeed('${pid}')">发成推文</button>
                <button type="button" class="gymall-btn solid" onclick="gymallShareChat('${pid}')">去私聊分享</button>
            </div></div>`);
    };
    window.gymallShareChat = function (pid) {
        const sel = document.getElementById('gymallShareTo');
        const id = sel ? sel.value : '';
        if (!id) return toast('先去角色中心搓一个角色');
        shareToChat(pid, id);
    };
    window.gymallShareFeed = pid => shareToFeed(pid);

    // ---------- 订单 ----------
    function renderOrders() {
        const body = document.getElementById('gymallBody');
        if (!body) return;
        if (!S.orders.length) {
            body.innerHTML = `<div class="gymall-empty">还没有订单。<br>去「商品」买一样试试，或者打开<b>角色自己随机网购</b>，让 TA 们自己去逛。</div>`;
            return;
        }
        body.innerHTML = S.orders.map(o => {
            const unread = (o.status === 'delivered' && !o.opened) ? '<span class="gymall-dot"></span>' : '';
            const pct = Math.round(progress(o) * 100);
            return `<div class="gymall-order" onclick="gymallDetail('${o.id}')">
                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
                    <div style="font-weight:700;font-size:13.5px;min-width:0;">${unread}${esc(o.productSnapshot.emoji)} ${esc(o.productSnapshot.name)}</div>
                    <div style="font-size:12px;color:${o.status === 'delivered' ? '#17bf63' : 'var(--mc)'};white-space:nowrap;">${stageLabel(o)}</div>
                </div>
                <div class="gymall-dim" style="margin-top:4px;">收货：${esc(nameOf(o.forWhom))} · 下单：${esc(nameOf(o.boughtBy))}</div>
                <div class="gymall-dim" style="margin-top:2px;">${etaLabel(o)}</div>
                <div class="gymall-bar"><i style="width:${pct}%"></i></div>
            </div>`;
        }).join('');
    }

    window.gymallDetail = id => openDetail(id);
    function openDetail(id) {
        const o = S.orders.find(x => x.id === id);
        if (!o) return;
        detailId = id;
        const canOpen = o.status === 'delivered';
        let unbox = '';
        if (canOpen) {
            unbox = o.opened
                ? `<div style="background:rgba(23,191,99,.09);border:1px solid #17bf63;border-radius:12px;padding:12px;margin:10px 0;text-align:center;">
                     <div style="font-size:34px;">${esc(o.productSnapshot.emoji)}</div>
                     <div style="font-weight:700;margin-top:4px;">${esc(o.productSnapshot.name)}</div>
                     <div class="gymall-dim">${esc(o.productSnapshot.description || '')}</div>
                     ${o.forWhom !== 'me' && o.kitAdded ? '<div class="gymall-dim" style="margin-top:6px;">🎒 已经进了 ' + esc(nameOf(o.forWhom)) + ' 的随身物</div>' : ''}
                   </div>`
                : `<button type="button" class="gymall-btn solid" style="width:100%;padding:10px;margin:10px 0;" onclick="gymallUnbox('${o.id}')">📦 拆开看看</button>`;
        }
        const complaints = (o.complaints || []).map(c => {
            const me = c.from === 'me';
            return `<div style="display:flex;justify-content:${me ? 'flex-end' : 'flex-start'};margin:6px 0;">
                <div class="gymall-msg" style="background:${me ? 'var(--mc)' : 'rgba(128,128,128,.15)'};color:${me ? '#fff' : 'inherit'};">${esc(c.text)}</div></div>`;
        }).join('') || `<div class="gymall-dim" style="text-align:center;padding:10px 0;">还没有投诉记录</div>`;

        modal(`<div class="modal-box gymall" style="width:92%;max-width:440px;max-height:84vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 style="margin:0;">订单详情</h3>
                <span style="cursor:pointer;font-size:20px;color:#8b98a5;" onclick="gymallClose()">×</span>
            </div>
            <div style="font-size:14px;line-height:1.9;">
                <div>${esc(o.productSnapshot.emoji)} <b>${esc(o.productSnapshot.name)}</b>（￥${esc(o.productSnapshot.price)}）</div>
                <div class="gymall-dim">收货：${esc(nameOf(o.forWhom))} · 下单：${esc(nameOf(o.boughtBy))}</div>
                <div class="gymall-dim">下单时间：${fmt(o.orderedAt)}</div>
                <div style="color:var(--mc);font-size:13px;font-weight:700;">${stageLabel(o)} · ${etaLabel(o)}</div>
                ${o.reasonText ? `<div class="gymall-dim" style="font-style:italic;margin-top:4px;">"${esc(o.reasonText)}"</div>` : ''}
            </div>
            ${timelineHtml(o)}
            ${unbox}
            <div style="border-top:1px dashed rgba(128,128,128,.35);margin-top:12px;padding-top:10px;">
                <div style="font-weight:700;font-size:13px;margin-bottom:6px;">📮 投诉物流</div>
                <div>${complaints}</div>
                <div style="display:flex;gap:6px;margin-top:8px;">
                    <input type="text" id="gymallComplaint" placeholder="哪儿不对劲…" style="flex:1;padding:9px;border:1px solid rgba(128,128,128,.35);border-radius:9px;background:transparent;color:inherit;" onkeypress="if(event.key==='Enter') gymallComplain('${o.id}')">
                    <button type="button" class="gymall-btn solid" onclick="gymallComplain('${o.id}')">发送</button>
                </div>
                <div class="gymall-dim" style="margin-top:6px;">由你在「设置」里指定的物流/客服角色用 TA 自己的口吻回你。</div>
            </div></div>`);
    }

    window.gymallUnbox = async function (id) {
        const o = S.orders.find(x => x.id === id);
        if (!o || o.status !== 'delivered') return;
        o.opened = true;
        await putIntoKit(o);
        await save();
        paintBadge();
        openDetail(id);
        if (tab === 'orders') renderOrders();
    };

    window.gymallComplain = async function (id) {
        const input = document.getElementById('gymallComplaint');
        const text = input ? input.value.trim() : '';
        if (!text) return;
        const o = S.orders.find(x => x.id === id);
        if (!o) return;
        o.complaints = o.complaints || [];
        o.complaints.push({ from: 'me', text, timestamp: Date.now() });
        await save();
        input.value = '';
        openDetail(id);

        const courier = charOf(S.settings.courierCharId);
        if (!courier) {
            o.complaints.push({ from: 'courier', text: '（还没指定物流/客服角色，去「设置」里选一个吧）', timestamp: Date.now() });
            await save(); openDetail(id); return;
        }
        try {
            const api = getApiConfig(true);
            if (!api.key) throw new Error('没配 API Key');
            const history = o.complaints.map(c => (c.from === 'me' ? '用户' : courier.name) + '：' + c.text).join('\n');
            const sys = (typeof buildBasePrompt === 'function') ? buildBasePrompt(courier, false, '') : ('你是' + courier.name + '，人设：' + (courier.persona || ''));
            const user = '你现在的身份是物流/客服人员，用户正在投诉一个包裹。\n包裹：' + o.productSnapshot.name +
                '，下单于 ' + fmt(o.orderedAt) + '，当前状态：' + stageLabel(o) + '。\n对话记录：\n' + history +
                '\n请以你的人设身份回应用户最新这条投诉（道歉、解释、敷衍、甩锅、意外热情帮忙都行，完全看你的性格，不用真说客服话术），不超过 80 字。只输出回复本身。';
            const msgs = (typeof buildStructuredMessages === 'function') ? buildStructuredMessages(sys, [], user) : [{ role: 'system', content: sys }, { role: 'user', content: user }];
            const data = await callChatCompletionAPI(api, msgs);
            const raw = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
            const reply = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').replace(/^["「]|["」]$/g, '').slice(0, 200) || '（客服没有回应……）';
            o.complaints.push({ from: 'courier', text: reply, timestamp: Date.now() });
        } catch (e) {
            o.complaints.push({ from: 'courier', text: '（客服请求失败：' + e.message + '）', timestamp: Date.now() });
        }
        await save();
        openDetail(id);
    };

    // ---------- 设置 ----------
    function renderSettings() {
        const body = document.getElementById('gymallBody');
        if (!body) return;
        const hint = k => (typeof gyNeedSwitchHint === 'function') ? gyNeedSwitchHint(k, '') : '';
        const sw = (k, label) => {
            const isOn = on(k);
            return `<div class="gymall-set-row">
                <div style="flex:1;">
                    <div style="font-size:14px;font-weight:600;">${label}</div>
                    <div class="gymall-dim" style="margin-top:2px;">${isOn ? '现在是开着的' : '现在是关着的'}</div>
                </div>
                <button type="button" class="gymall-btn ${isOn ? 'solid' : 'ghost'}" onclick="gyJumpToSwitch('${k}')">${isOn ? '开' : '关'} · 去改</button>
            </div>`;
        };
        body.innerHTML = `
            <div class="gymall-dim" style="line-height:1.9;margin-bottom:6px;">
                三个花钱的开关统一收在 设置 → ⚙️ 自动化功能 的「🛒 购物」那一组里，这儿只是快捷入口。<br>
                全关掉之后这一页纯手动：你不点，一次 API 都不会调。
            </div>
            ${sw('mallAutoBuy', '角色自己随机网购')}
            ${sw('mallTimeline', '物流文案按世界观生成')}
            ${sw('mallReact', '快递到角色手上，TA 可能来找你说一句')}

            <div class="gymall-form" style="margin-top:18px;">
                <div style="font-weight:700;font-size:13px;margin-bottom:10px;">⚙️ 参数</div>
                <label class="gymall-dim">每 5 分钟触发一次随机购物的概率（0~1，0.08 就是 8%）</label>
                <input type="number" id="gymallProb" step="0.01" min="0" max="1" value="${S.settings.buyProbabilityPerRoll}">
                <div class="gymall-row">
                    <div style="flex:1;"><label class="gymall-dim">最快送达（分钟）</label><input type="number" id="gymallMin" value="${S.settings.minDeliveryMin}"></div>
                    <div style="flex:1;"><label class="gymall-dim">最慢送达（分钟）</label><input type="number" id="gymallMax" value="${S.settings.maxDeliveryMin}"></div>
                </div>
                <label class="gymall-dim">物流/客服角色（投诉时由 TA 回你。去角色中心搓一个物流人设再回来选）</label>
                <select id="gymallCourier"><option value="">— 没指定 —</option>${charOpts(S.settings.courierCharId)}</select>
                <button type="button" class="gymall-btn solid" style="width:100%;padding:9px;margin-top:4px;" onclick="gymallSaveSettings()">保存</button>
            </div>`;
    }
    window.gymallSaveSettings = async function () {
        const g = id => (document.getElementById(id) || {}).value;
        S.settings.buyProbabilityPerRoll = Math.max(0, Math.min(1, parseFloat(g('gymallProb')) || 0));
        S.settings.minDeliveryMin = parseInt(g('gymallMin')) || 20;
        S.settings.maxDeliveryMin = Math.max(S.settings.minDeliveryMin, parseInt(g('gymallMax')) || 180);
        S.settings.courierCharId = g('gymallCourier') || '';
        await save();
        toast('设置已保存');
        renderSettings();
    };

    // ---------- 入口 ----------
    function openView() {
        mountView();
        if (typeof switchMainView === 'function') switchMainView('mall');
        renderAll();
    }
    window.gymallOpen = openView;
    window.gymallOnEnterView = renderAll;   // js/07 的 mall 分支进来时调

    // 排查/自测用的把手。业务代码别用它——正经入口都在上面挂着了。
    window.__gyMall = { get S() { return S; }, tick, putIntoKit, genTimeline, randomPurchase };

    (async function init() {
        await load();
        mountView();
        if (typeof registerMiniFeature === 'function') {
            registerMiniFeature({
                id: 'mall', icon: '🛒', title: '商城',
                desc: '你和角色都能上架东西。买给角色的会真的进 TA 的随身物，快递按真实时间在路上走',
                onOpen: openView
            });
        }
        try { if (typeof mobileViewTitles !== 'undefined') mobileViewTitles.mall = '商城'; } catch (e) {}
        tick();
        if (!window.__gyMallTimer) window.__gyMallTimer = setInterval(tick, 60000);
        console.info('[商城] 已加载：' + S.products.length + ' 个商品，' + S.orders.length + ' 个订单');
    })();
})();
