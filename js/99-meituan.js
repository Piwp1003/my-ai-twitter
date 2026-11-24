// Meituan browsing only. Unknown layouts stop; no checkout, payment, or coordinate fallback.
(function () {
    'use strict';
    if (window.gyMeituan) return;
    const APPS = ['com.sankuai.meituan.takeoutnew', 'com.sankuai.meituan'];
    const APP = Object.freeze({ meituan: 'com.sankuai.meituan', takeout: 'com.sankuai.meituan.takeoutnew' });
    const titleId = id => /(?:poi|shop|store|restaurant)[_a-z/]*(?:name|title)|(?:name|title)[_a-z/]*(?:poi|shop|store|restaurant)/i.test(String(id || ''));
    const label = n => String(n.text || n.desc || '').trim();
    const searchHint = text => /^(?:搜索商家|搜索店铺|搜索商家[、，,\s]+商品(?:名称)?|搜索商品|搜索美食|搜索商家或商品|搜索店铺或商品)$/.test(String(text || '').trim());
    const searchFieldId = id => { const key = String(id || '').split('/').pop(); return /^[a-z0-9_]+$/i.test(key) && /(?:^|_)search(?:_|box|bar|input|edit|container|layout)/i.test(key) && /box|bar|input|edit|container|layout/i.test(key) && !/(?:^|_)(?:button|btn|history)(?:_|$)/i.test(key); };
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
        function controls(test) {
            const targets = new Map();
            for (const n of nodes.filter(n => n.enabled && test(n))) {
                let target = n;
                for (let depth = 0; target && depth < 4; depth++, target = byRef.get(target.parentRef)) {
                    if (target.enabled && target.clickable) {
                        const members = nodes.filter(x => below(x, target.ref));
                        if (target.ref !== 0 && members.length <= 12 && !members.some(x => x !== target && (x.clickable || x.editable || x.scrollable))
                            && !members.some(x => /提交订单|立即支付|确认支付|付款|验证码/.test(label(x)))) targets.set(target.ref, target);
                        break;
                    }
                    if (target.parentRef === target.ref) break;
                }
            }
            return Array.from(targets.values());
        }
        const submit = controls(n => label(n) === '搜索' || String(n.desc || '').trim() === '搜索');
        const inputs = nodes.filter(n => n.enabled && n.editable);
        const fields = controls(n => searchHint(n.text) || searchHint(n.desc) || (label(n) !== '搜索' && searchFieldId(n.id)));
        const entry = fields.length ? fields : submit;
        const takeout = controls(n => label(n) === '外卖');
        return { page: menu ? 'store' : stores.length ? 'results' : inputs.length === 1 && submit.length === 1 ? 'search' : entry.length === 1 || takeout.length === 1 ? 'home' : 'unknown',
            stores, titles: titles.map(label), input: inputs.length === 1 ? inputs[0].ref : null,
            submit: submit.length === 1 ? submit[0].ref : null, entry: entry.length === 1 ? entry[0].ref : null,
            takeout: takeout.length === 1 ? takeout[0].ref : null, truncated: !!s.truncated,
            diagnostics: { nodeCount: nodes.length, editableCount: inputs.length, submitCount: submit.length, entryCount: entry.length, takeoutEntryCount: takeout.length,
                searchNodes: nodes.filter(n => searchFieldId(n.id) || searchHint(n.text) || searchHint(n.desc) || label(n) === '搜索').slice(0, 8).map(n => ({ ref: n.ref, parentRef: n.parentRef,
                    id: String(n.id || '').length <= 160 && /^(?:[A-Za-z0-9_.:]+\/[A-Za-z0-9_]{1,80}|[A-Za-z_][A-Za-z0-9_]{0,79})$/.test(String(n.id || '')) ? String(n.id) : '', clickable: !!n.clickable, editable: !!n.editable, enabled: !!n.enabled })) } };
    }
    function phone() { const p = window.gysPh; if (!p || !p.mcp) throw new Error('真手机桥接未加载'); return p; }
    const pause = () => new Promise(resolve => setTimeout(resolve, 200));
    const guard = check => { if (typeof check === 'function') check(); };
    function failure(error, text, accepted) { return { ok: false, error, err: text, actionAccepted: !!accepted }; }
    function layoutFailure(s, info, accepted, stage) {
        return Object.assign(failure('unknown_layout', '无法确认唯一的搜索控件，请核对页面；本轮停止', accepted),
            { diagnostic: Object.assign({ stage, truncated: !!s.truncated }, info.diagnostics || {}) });
    }
    function channelMarker(s) {
        return (Array.isArray(s.nodes) ? s.nodes : []).some(n => n.enabled && ((n.selected === true && label(n) === '外卖')
            || (!n.clickable && label(n) === '美团外卖' && /(?:title|header)/i.test(String(n.id || '').split('/').pop()))
            || (/^(?:wm|waimai|takeout)_(?:search|home|main)(?:_|$)/i.test(String(n.id || '').split('/').pop()) && searchFieldId(n.id))));
    }
    function routeFailure(s, accepted, stage, target) {
        const info = classify(s), d = info.diagnostics || {};
        const nodes = Array.isArray(s.nodes) ? s.nodes : [];
        const safeField = (v, limit) => /^[A-Za-z0-9_.:/$-]*$/.test(String(v || '')) ? String(v || '').slice(0, limit) : '';
        const structure = nodes.slice(0, 160).map(n => ({ ref: n.ref, parentRef: n.parentRef, id: safeField(n.id, 96), cls: safeField(n.cls, 64),
            idTruncated: String(n.id || '').length > 96, clickable: !!n.clickable, editable: !!n.editable, enabled: !!n.enabled, selected: !!n.selected,
            semantic: ['外卖', '美团外卖', '搜索'].includes(label(n)) ? label(n) : 'other' }));
        const channelNodes = (Array.isArray(s.nodes) ? s.nodes : []).filter(n => label(n) === '外卖' || label(n) === '美团外卖').slice(0, 4)
            .map(n => ({ ref: n.ref, parentRef: n.parentRef, clickable: !!n.clickable, selected: !!n.selected, enabled: !!n.enabled }));
        return Object.assign(failure('channel_unverified', '尚未确认美团外卖频道，已停止；不会在主首页做全站搜索', accepted),
            { diagnostic: Object.assign({}, d, { searchNodes: (d.searchNodes || []).slice(0, 4), stage, targetPackage: target, observedPackage: APPS.includes(s.pkg) ? s.pkg : 'other', truncated: !!s.truncated, channelNodes,
                structure, structureCount: structure.length, structureTruncated: !!s.truncated || nodes.length > 160 }) });
    }
    const READ_ERRORS = Object.freeze({
        accessibility_off: '无障碍服务未连接，请在系统中重新启用谷雨守护无障碍',
        no_active_window: '无障碍没有取得活动窗口',
        not_meituan: '活动窗口未识别为美团，暂不能确认具体原因',
        package_unknown: '无法确认活动窗口所属软件',
        blocked_app: '当前窗口受保护，请手动处理后重新发起',
        screen_changed: '读取时页面持续变化，未取得稳定快照',
        inspect_failed: '原生读屏失败，未生成可验证的页面快照',
        read_timeout: '等待活动窗口超时，未继续读取或点击',
        read_unavailable: '页面读取条件未满足，请检查真手机和读屏权限',
        invalid_snapshot: '读屏接口未返回有效页面'
    });
    function readError(s) {
        return s && Object.prototype.hasOwnProperty.call(READ_ERRORS, s.error) ? s.error : s && s.err ? 'read_unavailable' : 'invalid_snapshot';
    }
    function pageFailure(s, accepted, detail = {}) {
        const cause = readError(s);
        return Object.assign(failure('page_unavailable', cause + '：' + READ_ERRORS[cause], accepted),
            { diagnostic: Object.assign({ cause }, detail) });
    }
    function foregroundSignal() {
        try {
            const n = phone().__N, pkg = n && typeof n.fg === 'function' ? n.fg() : '';
            return pkg === APPS[0] ? 'takeout' : pkg === APPS[1] ? 'meituan' : pkg ? 'other' : 'unknown';
        } catch (e) { return 'unknown'; }
    }
    async function prepareLaunch(check) {
        const state = { inputReleased: false, keyboardHideRequested: false };
        guard(check);
        try {
            const element = window.document && document.activeElement;
            if (element && (['INPUT', 'TEXTAREA'].includes(element.tagName) || element.isContentEditable) && typeof element.blur === 'function') {
                element.blur(); state.inputReleased = document.activeElement !== element;
            }
        } catch (e) {}
        guard(check);
        try { if (window.plus && plus.key && typeof plus.key.hideSoftKeybord === 'function') { plus.key.hideSoftKeybord(); state.keyboardHideRequested = true; } } catch (e) {}
        if (state.inputReleased || state.keyboardHideRequested) { await pause(); guard(check); }
        return state;
    }
    async function awaitLaunchedPage(check, target) {
        const started = Date.now(), deadline = started + 8000;
        let snapshot = { ok: false, error: 'read_timeout' }, reads = 0;
        // Only read transient window states. Never relaunch or replay a tap here.
        while (reads < 40 && Date.now() < deadline) {
            guard(check); await pause(); guard(check);
            if (Date.now() >= deadline) break;
            snapshot = await phone().mcp.inspectScreen(160); reads++; guard(check);
            if (snapshot && snapshot.ok && snapshot.pkg !== target) snapshot = { ok: false, error: 'not_meituan' };
            if (Date.now() >= deadline && snapshot && snapshot.ok) { snapshot = { ok: false, error: 'read_timeout' }; break; }
            if (snapshot && snapshot.ok) break;
            if (!snapshot || !['not_meituan', 'no_active_window', 'screen_changed'].includes(snapshot.error)) break;
        }
        return { snapshot, reads, elapsedMs: Date.now() - started };
    }
    function remember(s, info, query) {
        const visible = info.stores.slice(0, 6);
        last = { token: s.token, pkg: s.pkg, fingerprint: s.fingerprint, at: Date.now(), stores: visible };
        return { ok: true, page: info.page, pkg: s.pkg, token: s.token, query: query || '', queryVerified: !!query, stores: visible, visibleCandidateCount: info.stores.length, truncated: !!info.truncated || info.stores.length > visible.length,
            note: '候选名称和指标均来自屏幕；不代表实时库存、最终价格或已下单' };
    }
    function ready() {
        const c = phone().mcp.capabilities();
        return c && c.mode === 'plugin' && c.featureEnabled && c.readPermission === 'auto' && c.native && c.native.pageSafety === 2;
    }
    async function inspect(args, check) {
        guard(check); const s = await phone().mcp.inspectScreen(160); guard(check);
        if (s && !s.ok && s.error === 'not_meituan') return {
            ok: true, page: 'unavailable', needsLaunch: true, nativeError: 'not_meituan', actionAccepted: false,
            note: '尚未取得美团窗口，本次没有打开软件或点击。用户已要求美团搜索时，可调用 meituan_search 并填写用户指定的 query；它会启动软件再读屏。若启动后仍失败则停止，不得推断搜索或购买已完成。'
        };
        if (!s || !s.ok) return pageFailure(s, false, { stage: 'inspect' });
        const info = classify(s); if (info.page === 'human_required') return failure('human_required', '当前需要登录、验证或涉及交易，请手动处理后重新发起', false);
        if (info.page === 'unknown') return layoutFailure(s, info, false, 'inspect');
        return remember(s, info);
    }
    async function search(args, check) {
        const app = args.app === undefined ? 'meituan' : args.app;
        if (!Object.prototype.hasOwnProperty.call(APP, app)) return failure('bad_app', '只支持美团主 App 或独立美团外卖', false);
        const target = APP[app];
        const query = typeof args.query === 'string' ? args.query.trim() : '';
        if (!query || query.length > 80) return failure('bad_query', '搜索词需要 1～80 个字符', false);
        guard(check); if (!ready()) return failure('permission_required', '需要新版谷雨守护，并开启真手机和页面操作权限', false);
        let accepted = false, submitted = false, s = await phone().mcp.inspectScreen(160); guard(check);
        if (!s || !s.ok || s.pkg !== target) {
            // Only package names in this adapter's allowlist may be launched.
            if (!s || (!s.ok && s.error !== 'not_meituan')) return pageFailure(s, false, { stage: 'before_launch' });
            const n = phone().__N, apps = n.apps(); guard(check);
            const pkg = apps.some(a => a.pkg === target) ? target : null;
            if (!pkg) return failure('app_missing', '未找到指定的软件，请检查安装情况或明确选择另一入口；不会自动切换软件', false);
            const launchPreparation = await prepareLaunch(check); guard(check);
            if (!n.openApp(pkg)) return failure('open_failed', '没有打开美团，请手动打开后再试', false);
            accepted = true;
            const waiting = await awaitLaunchedPage(check, target); s = waiting.snapshot;
            if (!s || !s.ok) {
                const signal = s && s.error === 'not_meituan' ? foregroundSignal() : 'unknown'; guard(check);
                return pageFailure(s, accepted, { stage: 'after_launch', openedPackage: pkg, foregroundSignal: signal, launchPreparation, reads: waiting.reads, elapsedMs: waiting.elapsedMs });
            }
        }
        if (target === APP.meituan) {
            const start = classify(s);
            if (start.page === 'human_required') return failure('human_required', '请先手动处理登录、验证或交易页面', accepted);
            if (!channelMarker(s)) {
                if (s.truncated || start.takeout == null || start.diagnostics?.takeoutEntryCount !== 1) return routeFailure(s, accepted, 'before_channel', target);
                const entered = await phone().mcp.tapElement(s.token, start.takeout, check); guard(check);
                accepted = accepted || !!entered?.actionAccepted;
                if (!entered || !entered.ok || !entered.snapshot) return failure(entered?.error || 'action_unverified', entered?.err || '进入外卖频道的结果未确认，不会重复点击', accepted);
                s = entered.snapshot;
                if (!s.ok || s.pkg !== target || !Array.isArray(s.nodes)) return failure('target_app_changed', '频道导航后未取得同一软件的页面，已停止，不切换目标', accepted);
                if (classify(s).page === 'human_required') return failure('human_required', '请手动处理当前登录、验证或交易页面', accepted);
                if (!channelMarker(s)) return routeFailure(s, accepted, 'after_channel', target);
            }
        }
        for (let step = 0; step < 7; step++) {
            guard(check); if (!s || !s.ok) return pageFailure(s, accepted, { stage: 'search' });
            if (s.pkg !== target) return failure('target_app_changed', '当前软件已改变，停止本轮搜索，不自动切换软件', accepted);
            const info = classify(s);
            if (info.page === 'human_required') return failure('human_required', '请先手动处理登录、验证或交易页面', accepted);
            if (info.page === 'results') {
                if (!submitted) return failure('query_unverified', '当前已经是结果页，但无法确认属于本次搜索；请手动回到搜索页', false);
                return Object.assign(remember(s, info, query), { app, channel: 'takeout' });
            }
            let r;
            if (info.page === 'search') {
                if (s.nodes.find(n => n.ref === info.input).text !== query) r = await phone().mcp.setText(s.token, info.input, query, check);
                else { r = await phone().mcp.tapElement(s.token, info.submit, check); submitted = !!(r && r.ok); }
            } else if (info.page === 'home') {
                const ref = info.entry != null ? info.entry : info.takeout;
                r = await phone().mcp.tapElement(s.token, ref, check);
            } else return layoutFailure(s, info, accepted, 'search_step_' + step);
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
        if (!s || !s.ok || s.pkg !== saved.pkg || s.fingerprint !== saved.fingerprint) return failure('screen_changed', '候选页面已经变化，请重新读取店铺列表', false);
        last = null; const r = await phone().mcp.tapElement(s.token, args.ref, check); guard(check);
        if (!r || !r.ok || !r.snapshot) return failure((r && r.error) || 'action_unverified', (r && r.err) || '进店结果未确认', !!(r && r.actionAccepted));
        const info = classify(r.snapshot);
        if (info.page !== 'store' || info.titles.length !== 1 || info.titles[0] !== args.name) return failure('store_unverified', '已点击，但未确认进入指定店铺，请手动核对，不会再次点击', true);
        return { ok: true, page: 'store', name: args.name, token: r.snapshot.token, actionAccepted: true, note: '已观察到指定店名与菜单页，尚未加购或下单' };
    }
    window.gyMeituan = Object.freeze({ inspect, search, chooseStore, classify, invalidate: () => { last = null; } });
})();
