// Meituan browsing only. Unknown layouts stop; no checkout, payment, or coordinate fallback.
(function () {
    'use strict';
    if (window.gyMeituan) return;
    const APPS = ['com.sankuai.meituan.takeoutnew', 'com.sankuai.meituan'];
    const titleId = id => /(?:poi|shop|store|restaurant)[_a-z/]*(?:name|title)|(?:name|title)[_a-z/]*(?:poi|shop|store|restaurant)/i.test(String(id || ''));
    const label = n => String(n.text || n.desc || '').trim();
    let last = null;
    function classify(s) {
        if (!s || !s.ok || s.snapshotSchema !== 2 || !s.fingerprint || !APPS.includes(s.pkg) || !Array.isArray(s.nodes)) return { page: 'unknown', stores: [] };
        const nodes = s.nodes, words = nodes.map(label);
        if (words.some(t => /^(?:立即登录|登录后继续|请输入验证码|安全验证|确认支付|提交订单|立即支付)$/.test(t))) return { page: 'human_required', stores: [] };
        const byRef = new Map(nodes.map(n => [n.ref, n]));
        function below(n, ancestor) {
            const seen = new Set();
            while (n && !seen.has(n.ref)) { if (n.ref === ancestor) return true; seen.add(n.ref); n = byRef.get(n.parentRef); }
            return false;
        }
        const titles = nodes.filter(n => n.enabled && titleId(n.id) && label(n) && label(n).length <= 80);
        const stores = [];
        for (const n of titles) {
            let row = n;
            for (let depth = 0; row && depth < 4; depth++, row = byRef.get(row.parentRef)) {
                if (!Number.isInteger(row.parentRef) || row.parentRef < 0) break;
                const members = nodes.filter(x => below(x, row.ref));
                if (members.filter(x => titles.includes(x)).length !== 1) break;
                const evidence = members.map(label).filter(t => /月售|配送|起送|评分|评价|人均/.test(t));
                if (evidence.length && (n.clickable || row.clickable)) {
                    stores.push({ ref: n.clickable ? n.ref : row.ref, name: label(n), evidence: evidence.slice(0, 4).map(t => t.slice(0, 80)) }); break;
                }
            }
        }
        const menu = words.includes('点菜') && (words.includes('评价') || words.includes('商家'));
        const submit = nodes.filter(n => n.enabled && n.clickable && label(n) === '搜索');
        const inputs = nodes.filter(n => n.enabled && n.editable);
        const entry = nodes.filter(n => n.enabled && n.clickable && /^(?:搜索|搜索商家|搜索店铺|搜索商家、商品)$/.test(label(n)));
        const takeout = nodes.filter(n => n.enabled && n.clickable && label(n) === '外卖');
        return { page: menu ? 'store' : stores.length ? 'results' : inputs.length === 1 && submit.length === 1 ? 'search' : entry.length === 1 || takeout.length === 1 ? 'home' : 'unknown',
            stores, titles: titles.map(label), input: inputs.length === 1 ? inputs[0].ref : null,
            submit: submit.length === 1 ? submit[0].ref : null, entry: entry.length === 1 ? entry[0].ref : null,
            takeout: takeout.length === 1 ? takeout[0].ref : null, truncated: !!s.truncated };
    }
    function phone() { const p = window.gysPh; if (!p || !p.mcp) throw new Error('真手机桥接未加载'); return p; }
    const pause = () => new Promise(resolve => setTimeout(resolve, 200));
    const guard = check => { if (typeof check === 'function') check(); };
    function failure(error, text, accepted) { return { ok: false, error, err: text, actionAccepted: !!accepted }; }
    function remember(s, info, query) {
        const visible = info.stores.slice(0, 6);
        last = { token: s.token, fingerprint: s.fingerprint, at: Date.now(), stores: visible };
        return { ok: true, page: info.page, token: s.token, query: query || '', stores: visible, visibleCandidateCount: info.stores.length, truncated: !!info.truncated || info.stores.length > visible.length,
            note: '候选名称和指标均来自屏幕；不代表实时库存、最终价格或已下单' };
    }
    function ready() {
        const c = phone().mcp.capabilities();
        return c && c.mode === 'plugin' && c.featureEnabled && c.readPermission === 'auto' && c.native && c.native.pageSafety === 2;
    }
    async function inspect(args, check) {
        guard(check); const s = await phone().mcp.inspectScreen(160); guard(check);
        if (!s || !s.ok) return failure('page_unavailable', (s && s.err) || '读不到美团页面，请先打开美团外卖', false);
        const info = classify(s); if (info.page === 'human_required') return failure('human_required', '当前需要登录、验证或涉及交易，请手动处理后重新发起', false);
        if (info.page === 'unknown') return failure('unknown_layout', '无法可靠识别当前页面，请手动进入美团外卖搜索页', false);
        return remember(s, info);
    }
    async function search(args, check) {
        const query = typeof args.query === 'string' ? args.query.trim() : '';
        if (!query || query.length > 80) return failure('bad_query', '搜索词需要 1～80 个字符', false);
        guard(check); if (!ready()) return failure('permission_required', '需要新版谷雨守护，并开启真手机和页面操作权限', false);
        let accepted = false, submitted = false, s = await phone().mcp.inspectScreen(160); guard(check);
        if (!s || !s.ok) {
            // Only package names in this adapter's allowlist may be launched.
            if (!s || s.error !== 'not_meituan') return failure('page_unavailable', (s && s.err) || '页面不可用', false);
            const n = phone().__N, apps = n.apps(); guard(check);
            const pkg = APPS.find(p => apps.some(a => a.pkg === p));
            if (!pkg) return failure('app_missing', '未找到可启动的美团或美团外卖', false);
            if (!n.openApp(pkg)) return failure('open_failed', '没有打开美团，请手动打开后再试', false);
            accepted = true;
            for (let i = 0; i < 3; i++) { await pause(); guard(check); s = await phone().mcp.inspectScreen(160); guard(check); if (s && s.ok) break; }
        }
        for (let step = 0; step < 7; step++) {
            guard(check); if (!s || !s.ok) return failure('page_unavailable', '页面不可用，请手动检查美团', accepted);
            const info = classify(s);
            if (info.page === 'human_required') return failure('human_required', '请先手动处理登录、验证或交易页面', accepted);
            if (info.page === 'results') {
                if (!submitted) return failure('query_unverified', '当前已经是结果页，但无法确认属于本次搜索；请手动回到搜索页', false);
                return remember(s, info, query);
            }
            let r;
            if (info.page === 'search') {
                if (s.nodes.find(n => n.ref === info.input).text !== query) r = await phone().mcp.setText(s.token, info.input, query, check);
                else { r = await phone().mcp.tapElement(s.token, info.submit, check); submitted = !!(r && r.ok); }
            } else if (info.page === 'home') {
                const ref = info.entry != null ? info.entry : info.takeout;
                r = await phone().mcp.tapElement(s.token, ref, check);
            } else return failure('unknown_layout', '没有识别到唯一的搜索入口或输入框，请手动进入搜索页', accepted);
            guard(check); accepted = accepted || !!(r && r.actionAccepted);
            if (!r || !r.ok || !r.snapshot) return failure((r && r.error) || 'action_unverified', (r && r.err) || '操作结果未确认，请核对美团，不会重复点击', accepted);
            s = r.snapshot;
        }
        return failure('step_limit', '搜索步骤已达上限，请手动检查页面', accepted);
    }
    async function chooseStore(args, check) {
        guard(check); if (!ready()) return failure('permission_required', '页面操作未授权或插件需要升级', false);
        const saved = last;
        if (!saved || args.token !== saved.token || Date.now() - saved.at > 30000) return failure('stale_snapshot', '店铺候选已过期，请重新查看美团页面', false);
        const matches = saved.stores.filter(x => x.ref === args.ref && x.name === args.name);
        if (matches.length !== 1) return failure('store_not_identified', '只能选择当前候选中名称和 ref 一致的店铺', false);
        const s = await phone().mcp.inspectScreen(160); guard(check);
        if (!s || !s.ok || s.fingerprint !== saved.fingerprint) return failure('screen_changed', '候选页面已经变化，请重新读取店铺列表', false);
        last = null; const r = await phone().mcp.tapElement(s.token, args.ref, check); guard(check);
        if (!r || !r.ok || !r.snapshot) return failure((r && r.error) || 'action_unverified', (r && r.err) || '进店结果未确认', !!(r && r.actionAccepted));
        const info = classify(r.snapshot);
        if (info.page !== 'store' || info.titles.length !== 1 || info.titles[0] !== args.name) return failure('store_unverified', '已点击，但未确认进入指定店铺，请手动核对，不会再次点击', true);
        return { ok: true, page: 'store', name: args.name, token: r.snapshot.token, actionAccepted: true, note: '已观察到指定店名与菜单页，尚未加购或下单' };
    }
    window.gyMeituan = Object.freeze({ inspect, search, chooseStore, classify, invalidate: () => { last = null; } });
})();
