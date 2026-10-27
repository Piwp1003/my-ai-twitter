/* =====================================================================
   js/39 —— 👥 NPC 列表（248 重做；以前叫「世界里的人」，只能从世界书里抽、只能绑一个角色）
   ---------------------------------------------------------------------
   所有 NPC 放在一张列表里：
     · 来源：从某个角色的世界书里抽 / 按「你的人设 + 角色人设 + 世界书」生成 / 自己加
     · 绑给谁：你自己、某几个角色、或者「通用」（谁都认识）——一个 NPC 可以同时绑好几个人
     · 头像、背景图都能换，换的时候能裁剪
     · 评论区里 NPC 和路人各占多少：总的一个比例，每个地方（推文、匿名区、论坛、小红书、直播弹幕…）还能单独调
     · 删角色的时候问一句：TA 带着的 NPC 要不要一起删
   别处用的接口照旧：gyNpcPool(角色id) / gyNpcCommentHint(主人, 条数, 场景) / __gyNpcCtxFor / gyNpcAll / gyNpcFor
   ⚠️ 只要人。地名、门派本身、物件、规则都不要。
   ===================================================================== */
(function () {
    if (window.__gyNpcLoaded) return;
    window.__gyNpcLoaded = true;

    const LF = (typeof window.gyStore === 'function')
        ? window.gyStore('gyNpcBox', 'npcs')
        : ((typeof localforage !== 'undefined') ? localforage.createInstance({ name: 'gyNpcBox', storeName: 'npcs' }) : null);
    const KEY = 'gyNpc_state';

    // 评论区的场景：键 → 名字（每个都能单独调比例；null＝跟着总的走）
    const SCENES = [
        ['tweet', '🐦 推文评论', '首页推文、营销号爆料底下的评论'],
        ['anon', '🕳️ 匿名区', '匿名论坛的跟帖'],
        ['tabloid', '📰 八卦网', '八卦网 / 营销号帖子底下'],
        ['forum', '📋 论坛跟帖', '小说论坛的路人跟帖'],
        ['xhs', '📕 小红书', '小红书笔记底下的评论'],
        ['live', '📺 直播弹幕', 'TA 开直播时的观众弹幕'],
        ['weibo', '🧣 微博', '软件 → 微博的评论区、刷到的微博'],
        ['bubble', '🫧 泡泡', '软件 → 泡泡：你开频道后粉丝的回复']
    ];
    let S = {
        npcs: [],     // [{id, name, handle, ico, who, persona, tie, tone, avatarImg, bgImg, owners:['me'|角色id], all, from:'wb'|'gen'|'manual', wb, at, edited, on, charId}]
        inject: 5,    // 注进 prompt 的最多几个
        mix: { def: 55, sc: {} },   // 评论里多少比例是 NPC（%）
        log: []
    };

    const esc = s => (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s))
        : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const chars = () => (typeof myCharacters !== 'undefined' ? myCharacters : []);
    const charOf = id => chars().find(c => String(c.id) === String(id)) || null;
    const meName = () => (typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '我';
    const uid = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const on = k => (typeof isAutoOn === 'function') ? isAutoOn(k) : false;
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const toast = m => { try { if (typeof showToast === 'function') showToast('', '👥 NPC 列表', m, null, null, false); } catch (e) {} };
    const forget = () => { try { if (typeof window.gyPhoneForgetThreads === 'function') window.gyPhoneForgetThreads(); } catch (e) {} };

    async function save() { try { if (LF) await LF.setItem(KEY, JSON.parse(JSON.stringify(S))); } catch (e) {} }
    function migrate() {
        if (!Array.isArray(S.npcs)) S.npcs = [];
        S.npcs.forEach(n => {
            if (!Array.isArray(n.owners)) n.owners = n.ownerId != null && n.ownerId !== '' ? [String(n.ownerId)] : [];
            n.owners = n.owners.map(String);
            delete n.ownerId;
        });
        if (!S.mix || typeof S.mix !== 'object') S.mix = { def: 55, sc: {} };
        if (S.cmtPct != null) { S.mix.def = Math.max(0, Math.min(100, Number(S.cmtPct) || 0)); delete S.cmtPct; }
        if (!S.mix.sc) S.mix.sc = {};
    }
    async function load() {
        try { if (LF) { const d = await LF.getItem(KEY); if (d && typeof d === 'object') S = Object.assign(S, d); } } catch (e) {}
        migrate();
    }

    /* ---------- 谁认识谁 ---------- */
    const firstChar = n => (n.owners || []).find(o => o !== 'me' && charOf(o)) || null;
    const boundTo = (n, id) => n.all || (n.owners || []).includes(String(id));
    const listOf = id => S.npcs.filter(n => n.on !== false && boundTo(n, id));
    const bindLabel = n => {
        if (n.all) return '通用';
        const L = (n.owners || []).map(o => o === 'me' ? meName() + '（我）' : (charOf(o) || {}).name).filter(Boolean);
        return L.length ? L.join('、') : '没绑人';
    };
    window.gyNpcFor = id => listOf(id).map(n => JSON.parse(JSON.stringify(n)));
    window.gyNpcAll = () => S.npcs.slice();
    window.gyNpcById = id => S.npcs.find(n => n.id === id) || null;
    window.gyNpcByName = name => { name = String(name || '').trim(); return name ? (S.npcs.find(n => n.on !== false && n.name === name) || null) : null; };
    // 这个人（角色 id 或 'me'）身边的人，给别的模块当素材用（手机、评论区都走这个）
    window.gyNpcPool = function (id) {
        if (!on('npcOn')) return [];
        return listOf(id).map(n => ({ id: n.id, name: n.name, handle: n.handle || '', who: n.who || '', persona: n.persona || '', tie: n.tie || '', tone: n.tone || '', ico: n.ico || '👤', avatarImg: n.avatarImg || '' }));
    };

    /* ---------- 评论里 NPC 和路人的比例 ---------- */
    const mixPct = scene => {
        const v = S.mix.sc && S.mix.sc[scene];
        return Math.max(0, Math.min(100, v == null || v === '' ? Number(S.mix.def) || 0 : Number(v) || 0));
    };
    window.gyNpcMixPct = mixPct;
    // 按比例挑人：返回 {npcs, n}（n＝这次有几条该是 NPC 说的）
    window.gyNpcPick = function (scene, ownerId, count) {
        if (!on('npcOn') || !on('npcInComments')) return { npcs: [], n: 0 };
        const pool = listOf(ownerId == null ? 'me' : ownerId);
        const pct = mixPct(scene || 'tweet');
        if (!pool.length || !pct) return { npcs: [], n: 0 };
        let n = Math.round((count || 1) * pct / 100);
        if (n < 1 && Math.random() * 100 < pct * (count || 1)) n = 1;   // 只有一两条的时候按概率来
        n = Math.min(n, pool.length);
        if (!n) return { npcs: [], n: 0 };
        return { npcs: pool.slice().sort(() => Math.random() - 0.5).slice(0, n), n };
    };
    window.gyNpcCommentHint = function (ownerId, count, scene) {
        const p = window.gyNpcPick(scene || 'tweet', ownerId, count);
        if (!p.n) return '';
        const owner = ownerId === 'me' ? meName() : ((charOf(ownerId) || {}).name || '博主');
        const allNpc = p.n >= (count || 1);
        return `\n【这一次里有 ${p.n} 条是${owner}身边真认识的人说的，不是路人】\n`
            + p.npcs.map(x => `· ${x.name}${x.handle ? '（@' + x.handle + '）' : ''}：${x.who || ''}${x.tie ? '，' + x.tie : ''}${x.tone ? '。说话' + x.tone : ''}`).join('\n')
            + `\n请让其中 ${p.n} 条用上面这几个人的名字和账号（作者名字必须一字不差；handle 为空的就别编账号名，直接用名字），`
            + `说的话要像**熟人**而不是吃瓜路人——可以调侃、可以担心、可以拆台，因为他们知道内情。`
            + (allNpc ? '这一次全部都是熟人，不要路人。\n' : `剩下的还是陌生路人。\n`);
    };

    /* ---------- 生成 / 抽人 ---------- */
    const SRC_DEFS = [
        { k: 'wbLocal', label: '这个角色自己的世界书', desc: '角色卡带进来的那几本。NPC 主要从这里来。' },
        { k: 'wbGlobal', label: '全局世界书', desc: '所有角色共享的那几本。里面的人多半是"这个世界的人"，不一定跟这个角色有来往。', defaultOff: true },
        { k: 'persona', label: '人设正文', desc: '人设里常常直接写着"师父""他哥"这种人。' },
        { k: 'known', label: '已经存在的角色名', desc: '给模型一份黑名单，免得把你已有的角色又抽成一个 NPC。' },
        { k: 'fac', label: '所属势力', desc: '同一个势力里该有什么位置的人。' }
    ];
    const srcOn = k => { try { return !window.gyInjectSrc || window.gyInjectSrc.on('npc', k); } catch (e) { return true; } };
    const wbAll = () => ((typeof worldbooks !== 'undefined' ? worldbooks : []) || []);
    let busy = false;

    // opt: { me:bool, charIds:[], wbIds:[], n:数量, wish:'', owners:[], all:bool, from:'gen'|'wb' }
    window.gyNpcGen = async function (opt) {
        opt = opt || {};
        if (busy) return null;
        const api = (typeof getApiConfig === 'function') ? getApiConfig(true) : null;
        if (!api || !api.key) { toast('还没配 API Key'); return null; }
        busy = true; paint();
        try {
            let info = '';
            if (opt.me && typeof currentUser !== 'undefined' && currentUser) info += `【${meName()}（就是用户本人）的人设】${String(currentUser.persona || currentUser.bio || '（没写）').slice(0, 1200)}\n`;
            (opt.charIds || []).map(charOf).filter(Boolean).forEach(c => {
                if (opt.from !== 'wb' || srcOn('persona')) info += `【角色 ${c.name} 的人设】${String(c.persona || '').slice(0, 1200)}\n`;
                if (opt.from === 'wb' && srcOn('fac')) {
                    let f = ''; try { f = (typeof getCharFactions === 'function') ? (getCharFactions(c) || []).join('、') : (c.group || ''); } catch (e) { f = c.group || ''; }
                    if (f) info += `【${c.name} 所属势力】${f}\n`;
                }
            });
            const wbs = wbAll().filter(w => (opt.wbIds || []).map(String).includes(String(w.id)));
            if (wbs.length) info += `【世界书】\n` + wbs.map(w => `《${w.title}》：${String(w.content || '').replace(/\s+/g, ' ').slice(0, 900)}`).join('\n') + '\n';
            if (!info.trim()) { toast('没有可用的材料：至少勾一样（你的人设 / 角色 / 世界书）'); return null; }
            const names = chars().map(x => x.name).concat([meName()]).filter(Boolean);
            const have = S.npcs.map(n => n.name);
            const N = Math.max(1, Math.min(10, Number(opt.n) || 5));
            const fromWb = opt.from === 'wb';
            const ask = `${fromWb ? '下面是一个角色的设定材料。请把里面**真正出现过的人**抽出来，做成 TA 身边的 NPC 名单。' : '下面是一个故事世界的材料。请按这些材料，生成住在这个世界里、跟这些人有来往的 NPC。'}
${info}
【已经存在的角色，别再做成 NPC】${names.join('、')}
${have.length ? `【已经有这些 NPC，别重复】${have.slice(-60).join('、')}\n` : ''}${opt.wish ? `【她的要求】${String(opt.wish).slice(0, 300)}\n` : ''}
规矩：
1. **只要人**。地名、门派/组织本身、物件、功法、规则、名词解释——一律不要。
2. ${fromWb ? '材料里**没写名字但明确存在**的人可以抽（"他师父""隔壁卖馄饨的"），给一个符合这个世界的名字或称呼。宁可少，不要凑数；材料里确实一个人都没有就返回空数组。' : '要符合这个世界的时代、地点、语言习惯（古代就别有网名，现代就像真人）。跟上面的人要有具体的来往（同事、邻居、老同学、对头……），不要凭空的路人。'}
3. 最多 ${N} 个。
4. tie 写清楚跟谁什么关系（写名字），现在还来往吗。
5. tone 写这个人说话什么调调（"话少，一句顶一句""爱说教""油嘴滑舌"）。
6. handle 是网络账号名（英文/拼音/数字）。如果这个世界根本没有网络，handle 留空。
只输出 JSON，不要解释：
{"npcs":[{"name":"名字或称呼","ico":"一个emoji","who":"他是谁，12字以内","tie":"跟谁什么关系，24字以内","persona":"这人什么样，40字以内","tone":"说话调调，12字以内","handle":"账号名或空","wb":"出自哪本世界书（没有就空）"}]}`;
            const msgs = (typeof buildStructuredMessages === 'function')
                ? buildStructuredMessages(fromWb ? '你在读一份角色设定，把里面出现的人整理成名单。' : '你在给一个故事世界补充配角。', [], ask)
                : [{ role: 'user', content: ask }];
            const d = await callChatCompletionAPI(api, msgs);
            let t = (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content || '').trim();
            if (typeof extractAfterFinalMarker === 'function') t = extractAfterFinalMarker(t).trim();
            t = t.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            const o = (typeof extractJsonObject === 'function') ? extractJsonObject(t) : JSON.parse(t);
            const arr = (o && Array.isArray(o.npcs)) ? o.npcs : null;
            if (!arr) { toast('没读出来，回头再试'); return null; }
            if (!arr.length) { toast('材料里没写到什么人——可以自己加一个'); return []; }
            const known = new Set(names.concat(have));
            const add = [];
            arr.slice(0, N).forEach(x => {
                const name = String(x.name || '').trim().slice(0, 14);
                if (!name || known.has(name)) return;
                known.add(name);
                add.push({
                    id: uid(), name, owners: (opt.owners || []).map(String), all: !!opt.all,
                    ico: String(x.ico || '👤').slice(0, 4), who: String(x.who || '').slice(0, 20), tie: String(x.tie || '').slice(0, 40),
                    persona: String(x.persona || '').slice(0, 80), tone: String(x.tone || '').slice(0, 20),
                    handle: String(x.handle || '').replace(/^@/, '').slice(0, 20), wb: String(x.wb || '').slice(0, 20),
                    from: fromWb ? 'wb' : 'gen', at: Date.now(), on: true, avatarImg: '', bgImg: ''
                });
            });
            if (!add.length) { toast('生成出来的都跟已有的重了'); return []; }
            S.npcs = S.npcs.concat(add);
            S.log.unshift({ at: Date.now(), t: '新来了 ' + add.map(x => x.name).join('、') }); S.log = S.log.slice(0, 60);
            await save(); forget();
            V.fresh = new Set(add.map(x => x.id));
            toast(pick(['来了 ' + add.length + ' 个：', '找到 ' + add.length + ' 个：', '新认识了 ' + add.length + ' 个人：']) + add.map(x => x.name).join('、'));
            return add;
        } catch (e) { toast('没生成出来：' + String(e.message || e).slice(0, 40)); return null; }
        finally { busy = false; paint(); }
    };
    // 老入口：从某个角色的世界书里抽（按「注入内容管理 → 👥」里勾的材料）
    window.gyNpcMake = async function (charId) {
        const c = charOf(charId); if (!c) return null;
        const wbIds = wbAll().filter(w => (srcOn('wbLocal') && (c.worldbooks || []).indexOf(w.id) >= 0 && !w.isGlobal) || (srcOn('wbGlobal') && w.isGlobal)).map(w => w.id);
        return window.gyNpcGen({ charIds: [String(c.id)], wbIds, n: 8, owners: [String(c.id)], from: 'wb' });
    };

    /* ---------- 增删改 ---------- */
    window.gyNpcNew = function (pre) {
        const n = Object.assign({ id: uid(), name: '', owners: [], all: false, ico: '👤', who: '', tie: '', persona: '', tone: '', handle: '', wb: '', from: 'manual', at: Date.now(), on: true, avatarImg: '', bgImg: '', __new: true }, pre || {});
        V.draft = n; go('edit', n.id);
    };
    window.gyNpcAdd = async function (charId, o) {   // 兼容老调用 / 给别处直接加一个
        const n = Object.assign({ id: uid(), name: '', owners: charId != null ? [String(charId)] : [], all: false, ico: '👤', who: '', tie: '', persona: '', tone: '', handle: '', wb: '', from: 'manual', at: Date.now(), on: true, avatarImg: '', bgImg: '' }, o || {});
        if (!n.name) return null;
        S.npcs.push(n); await save(); forget(); paint(); return n;
    };
    // ➕ 把「已经出现过、但不在列表里」的人补成 NPC 并加入：报名字，模型照他们出现时的样子补全
    window.gyNpcGrab = async function () {
        if (busy) return;
        const ask = typeof appPrompt === 'function' ? appPrompt : (m, d) => Promise.resolve(prompt(m, d));
        const raw = await ask('把出现过的人加进来——报名字（多个用逗号隔开）：\n比如推文/评论里冒出来的人、剧情里提到的人', '');
        if (raw == null) return;
        const names = String(raw).split(/[，,、\n]/).map(x => x.trim()).filter(Boolean).slice(0, 10);
        if (!names.length) return;
        const api = (typeof getApiConfig === 'function') ? getApiConfig(true) : null;
        if (!api || !api.key) { toast('还没配 API Key'); return; }
        busy = true; paint();
        try {
            const want = names.filter(nm => !S.npcs.some(n => n.name === nm) && !chars().some(c => c.name === nm));
            if (!want.length) { toast('这些人要么已经在列表里，要么本来就是角色'); return; }
            const existing = chars().map(c => `${c.name}：${String(c.persona || '').slice(0, 200)}`).join('\n');
            const askP = `下面这些人已经在剧情 / 推文 / 评论里出现过了，现在把他们补成 NPC 卡（照他们出现时的样子，别改设定、别换人）。
【要补的人】${want.join('、')}
${existing ? `【已有角色（参考他们之间的关系）】\n${existing}\n` : ''}每个人给：ico(一个emoji)、who(他是谁,12字内)、tie(跟谁什么关系,写名字,24字内)、persona(什么样,40字内)、tone(说话调调,12字内)、handle(网络账号名,没有就空)。
只输出 JSON，不要解释：{"npcs":[{"name":"","ico":"","who":"","tie":"","persona":"","tone":"","handle":""}]}`;
            const msgs = (typeof buildStructuredMessages === 'function') ? buildStructuredMessages('你在把剧情里出现过的人整理成 NPC 卡。', [], askP) : [{ role: 'user', content: askP }];
            const d = await callChatCompletionAPI(api, msgs);
            let t = (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content || '').trim();
            if (typeof extractAfterFinalMarker === 'function') t = extractAfterFinalMarker(t).trim();
            t = t.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            const o = (typeof extractJsonObject === 'function') ? extractJsonObject(t) : JSON.parse(t);
            const arr = (o && Array.isArray(o.npcs)) ? o.npcs : [];
            const byName = {}; arr.forEach(x => { const nm = String(x.name || '').trim(); if (nm) byName[nm] = x; });
            const add = [];
            want.forEach(nm => {
                const x = byName[nm] || {};
                add.push({ id: uid(), name: nm.slice(0, 14), owners: [], all: true, ico: String(x.ico || '👤').slice(0, 4), who: String(x.who || '').slice(0, 20), tie: String(x.tie || '').slice(0, 40), persona: String(x.persona || '').slice(0, 80), tone: String(x.tone || '').slice(0, 20), handle: String(x.handle || '').replace(/^@/, '').slice(0, 20), wb: '', from: 'gen', at: Date.now(), on: true, avatarImg: '', bgImg: '' });
            });
            S.npcs = S.npcs.concat(add);
            S.log.unshift({ at: Date.now(), t: '补进来 ' + add.map(x => x.name).join('、') }); S.log = S.log.slice(0, 60);
            await save(); forget(); V.fresh = new Set(add.map(x => x.id));
            toast('加好了 ' + add.length + ' 个：' + add.map(x => x.name).join('、') + '（默认绑「通用」，点进去能改绑定和设定）');
        } catch (e) { toast('没加成：' + String(e.message || e).slice(0, 40)); }
        finally { busy = false; paint(); }
    };
    window.gyNpcDel = async function (id, quiet) {
        const n = S.npcs.find(x => x.id === id); if (!n) return;
        if (!quiet && typeof appConfirm === 'function' && !(await appConfirm(`删掉「${n.name}」？删了就找不回来了。`))) return;
        S.npcs = S.npcs.filter(x => x.id !== id);
        S.log.unshift({ at: Date.now(), t: '删了 ' + n.name }); S.log = S.log.slice(0, 60);
        await save(); forget();
        if (V.view === 'edit') go('list'); else paint();
    };
    window.gyNpcToggle = async function (id, v) {
        const n = S.npcs.find(x => x.id === id); if (!n) return;
        n.on = !!v; await save(); forget(); paint();
    };
    window.gyNpcSet = async function (k, v) { if (k === 'inject') S.inject = Math.max(0, parseInt(v) || 0); if (k === 'cmtPct') S.mix.def = Math.max(0, Math.min(100, parseInt(v) || 0)); await save(); paint(); };
    window.gyNpcMixSet = async function (scene, v) {
        if (scene === 'def') S.mix.def = Math.max(0, Math.min(100, parseInt(v) || 0));
        else if (v === '' || v == null || v === 'def') delete S.mix.sc[scene];
        else S.mix.sc[scene] = Math.max(0, Math.min(100, parseInt(v) || 0));
        await save(); paint();
    };
    window.gyNpcEdit = function (id) { if (id) go('edit', id); else go('list'); };
    window.gyNpcSave = async function (id) {
        const g = k => { const e = document.getElementById('gynpE_' + k); return e ? e.value.trim() : ''; };
        let n = S.npcs.find(x => x.id === id);
        const isNew = !n && V.draft && V.draft.id === id;
        if (isNew) n = V.draft;
        if (!n) return;
        const name = g('name'); if (!name) return toast('名字不能空着');
        const dup = S.npcs.find(x => x.id !== id && x.name === name);
        if (dup && typeof appConfirm === 'function' && !(await appConfirm(`已经有一个叫「${name}」的 NPC 了，还要这样存吗？（评论区里同名的会被当成同一个人）`))) return;
        const all = !!(document.getElementById('gynpE_all') || {}).checked;
        const owners = Array.from(document.querySelectorAll('.gynpE-own:checked')).map(x => String(x.value));
        Object.assign(n, { name, ico: g('ico') || '👤', who: g('who'), tie: g('tie'), persona: g('persona'), tone: g('tone'), handle: g('handle').replace(/^@/, ''), all, owners, edited: Date.now() });
        if (V.img && V.img.id === id) { if (V.img.avatarImg !== undefined) n.avatarImg = V.img.avatarImg; if (V.img.bgImg !== undefined) n.bgImg = V.img.bgImg; }
        delete n.__new;
        if (isNew) { S.npcs.push(n); V.draft = null; }
        S.log.unshift({ at: Date.now(), t: (isNew ? '加了 ' : '改了 ') + name }); S.log = S.log.slice(0, 60);
        V.img = null; await save(); forget();
        toast(pick(['存好了', '记下了：' + name, '好']));
        go('list');
    };
    // 🖼️ 换头像 / 背景：选图 → 裁剪（跟角色头像同一个裁剪框）
    window.gyNpcPickImg = function (id, kind) {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => {
            const f = inp.files && inp.files[0]; if (!f) return;
            const done = url => { V.img = Object.assign({ id }, V.img && V.img.id === id ? V.img : {}); V.img[kind] = url; paint(); };
            if (typeof handleImageCrop === 'function') handleImageCrop(f, kind === 'bgImg' ? 3 : 1, done);
            else { const r = new FileReader(); r.onload = () => done(r.result); r.readAsDataURL(f); }
        };
        inp.click();
    };
    window.gyNpcClearImg = function (id, kind) { V.img = Object.assign({ id }, V.img && V.img.id === id ? V.img : {}); V.img[kind] = ''; paint(); };

    window.gyNpcPromote = async function (id) {
        const n = S.npcs.find(x => x.id === id); if (!n) return null;
        if (n.charId && charOf(n.charId)) { toast(n.name + ' 已经是角色了'); return charOf(n.charId); }
        const owner = charOf(firstChar(n));
        if (chars().some(c => c.name === n.name) && !(typeof confirm === 'function' && confirm(`已经有一个叫「${n.name}」的角色了，还要再建一个吗？`))) return null;
        const persona = [`${n.name}${n.who ? '，' + n.who : ''}。`, n.persona ? n.persona + '。' : '', owner && n.tie ? `跟${owner.name}的关系：${n.tie}。` : '', n.tone ? `说话：${n.tone}。` : '',
            owner ? `（来自${owner.name}的世界：和${owner.name}在同一个世界里，世界观、时代、身边的人都跟${owner.name}的设定一致。）` : ''].join('');
        const now = Date.now(), cid = now;
        const c = { id: cid, name: n.name, handle: n.handle || ('npc' + String(now).slice(-5)), persona, bio: n.who || '', followers: '1000', following: '100',
            location: owner ? (owner.location || '') : '', website: '', birthdate: '', isFollowing: true, isSpecialFollow: false, verified: false,
            avatarEmoji: (n.ico && n.ico !== '👤') ? n.ico : n.name[0], themeColor: '#1d9bf0', avatarImg: null, bgImg: null,
            group: owner ? (owner.group || '') : '', groups: owner && Array.isArray(owner.groups) ? owner.groups.slice() : [],
            postFreq: { interval: 2, unit: 'day', count: 1 }, lastPostTime: now, chatFreq: { interval: 1, unit: 'day' }, lastChatProactiveTime: now,
            letterFreq: { interval: 14, unit: 'day' }, lastLetterProactiveTime: now, forumPostFreq: { interval: 7, unit: 'day' }, lastForumPostTime: now,
            anonPostFreq: { interval: 7, unit: 'day' }, lastAnonPostTime: now, actMode: 'fixed', autonomyMinMinutes: 30, autonomyMaxHours: 8,
            webMode: 'default', webGapMin: 0, webPerDay: 0, ownDaysMode: 'default', lastAutonomyTime: now, nextAutonomyAt: 0, autonomyLog: [], todos: [],
            autoReplyText: '', busyAutoReplyText: '', memorySummary: '', chatSummary: '', diaryData: { letters: [], diaries: [] }, pendingLetterReplies: [],
            anonName: '匿名者', anonId: Math.random().toString(36).substr(2, 6).toUpperCase(), firstMessage: '', alternateGreetings: [],
            worldbooks: owner && Array.isArray(owner.worldbooks) ? owner.worldbooks.slice() : [], postCount: 0, fromNpc: n.id, fromNpcOwner: String(firstChar(n) || '') };
        myCharacters.push(c);
        try { if (owner && typeof charRelationships !== 'undefined' && Array.isArray(charRelationships) && n.tie) charRelationships.push({ id: 'rel_' + now + Math.floor(Math.random() * 1000), fromId: owner.id, toId: cid, label: String(n.tie).slice(0, 12), color: '#8b98a5' }); } catch (e) {}
        n.charId = cid;
        S.log.unshift({ at: now, t: n.name + ' 变成了角色' }); S.log = S.log.slice(0, 60);
        await save();
        try { if (typeof saveAllData === 'function') saveAllData(); } catch (e) {}
        try { if (typeof renderChatCharList === 'function') renderChatCharList(); } catch (e) {}
        paint();
        toast(['✨ ' + n.name + ' 现在能直接聊天了', n.name + ' 成了一个完整的角色', '去聊天页就能找到 ' + n.name][Math.floor(Math.random() * 3)]);
        return c;
    };
    window.gyNpcChat = function (id) {
        const n = S.npcs.find(x => x.id === id); if (!n || !n.charId) return;
        try { const m = document.getElementById('gyNpcPage'); if (m) m.classList.remove('on'); switchMainView('chat'); switchChatSession(String(n.charId)); } catch (e) {}
    };


    /* ---------- 删角色时问一句 ---------- */
    function hookDelete() {
        const o = window.deleteCharacter;
        if (typeof o !== 'function' || o.__gyNpc) return;
        const w = async function (charId) {
            const before = !!charOf(charId);
            const r = await o.apply(this, arguments);
            if (!before || charOf(charId)) return r;   // 没删成（点了取消）
            const id = String(charId);
            const mine = S.npcs.filter(n => (n.owners || []).includes(id));
            if (!mine.length) return r;
            const only = mine.filter(n => !n.all && n.owners.length === 1);
            const shared = mine.filter(n => !only.includes(n));
            const yes = typeof appConfirm === 'function' ? await appConfirm(`TA 身边还有 ${mine.length} 个 NPC：${mine.slice(0, 6).map(n => n.name).join('、')}${mine.length > 6 ? '……' : ''}\n\n要一起删掉吗？\n· 删掉：只认识 TA 的 ${only.length} 个会删掉${shared.length ? `；还认识别人的 ${shared.length} 个留着，只是不再绑 TA` : ''}\n· 留着：都留在 NPC 列表里，之后可以改绑给别人`) : false;
            mine.forEach(n => { n.owners = n.owners.filter(x => x !== id); });
            if (yes) S.npcs = S.npcs.filter(n => !only.includes(n));
            S.log.unshift({ at: Date.now(), t: yes ? `删角色时一起删了 ${only.length} 个 NPC` : `删角色时留下了 ${mine.length} 个 NPC` }); S.log = S.log.slice(0, 60);
            await save(); forget(); paint();
            toast(yes ? pick(['一起删掉了', '删好了']) : pick(['都留着，在 NPC 列表里「没绑人」那一栏', '留下了，想改绑给谁去 NPC 列表']));
            return r;
        };
        w.__gyNpc = true;
        window.deleteCharacter = w;
    }

    /* ---------- 评论区里 NPC 的头像：跟着 NPC 列表走（换了头像，旧评论也跟着换） ---------- */
    function hookIdentity() {
        const gi = window.getNpcIdentity;
        if (typeof gi === 'function' && !gi.__gyNpc) {
            const w = function (name, handle) {
                const r = gi.apply(this, arguments);
                try {
                    const n = window.gyNpcByName(name);
                    if (n && r) { r.npcRef = n.id; if (n.handle) r.handle = '@' + n.handle; if (n.ico) r.avatarEmoji = n.ico; }
                } catch (e) {}
                return r;
            };
            w.__gyNpc = true; window.getNpcIdentity = w;
        }
        const ga = window.getAvatarHTML;
        if (typeof ga === 'function' && !ga.__gyNpc) {
            const w2 = function (c) {
                try {
                    if (c && (c.npcRef || c.isNpc) && !c.avatarImg) {
                        const n = (c.npcRef && window.gyNpcById(c.npcRef)) || window.gyNpcByName(c.name);
                        if (n && n.avatarImg) { const args = Array.from(arguments); args[0] = Object.assign({}, c, { avatarImg: n.avatarImg, id: 'npcl_' + n.id }); return ga.apply(this, args); }
                    }
                } catch (e) {}
                return ga.apply(this, arguments);
            };
            w2.__gyNpc = true; window.getAvatarHTML = w2;
        }
    }

    /* ---------- prompt 注入 ---------- */
    const NUDGE = {};
    window.__gyNpcCtxFor = function (charId) {
        try {
            if (NUDGE[String(charId)]) return `\n【这次主动找她的由头】${NUDGE[String(charId)]}\n` + window.__gyNpcCtxBase(charId);
            return window.__gyNpcCtxBase(charId);
        } catch (e) { return ''; }
    };
    window.__gyNpcCtxBase = function (charId) {
        try {
            if (!on('npcOn') || !on('npcInject')) return '';
            const max = Math.max(0, Math.round(typeof gyNum === 'function' ? gyNum(S.inject, 5) : (Number(S.inject) || 5)));
            const own = listOf(charId).filter(n => !n.all), pub = listOf(charId).filter(n => n.all);
            const arr = own.concat(pub).slice(0, max);
            if (!arr.length) return '';
            return `\n【你身边的这些人（是真的存在，不是设定里一笔带过的名字）】\n`
                + arr.map(n => `· ${n.name}${n.who ? '，' + n.who : ''}${n.tie ? '——' + n.tie : ''}${n.all ? '（大家都认识）' : ''}`).join('\n')
                + `\n提到他们的时候你是真的认识，前后要对得上；没聊到就别硬往外拉人。\n`;
        } catch (e) { return ''; }
    };

    /* ---------- 页面（整页） ---------- */
    const V = { view: 'list', id: null, f: 'all', q: '', draft: null, img: null, fresh: new Set(), gen: null };
    function go(view, id) { V.view = view; V.id = id || null; mount(); document.getElementById('gyNpcPage').classList.add('on'); paint(); const b = document.getElementById('gyNpcBody'); if (b) b.scrollTop = 0; }
    window.gyNpcOpen = function (who) {
        if (who != null && who !== '') V.f = String(who) === 'me' ? 'me' : 'c:' + String(who);
        go('list');
    };
    window.gyNpcClose = function () {
        if (V.view !== 'list') { V.draft = null; V.img = null; return go('list'); }
        const m = document.getElementById('gyNpcPage'); if (m) m.classList.remove('on');
    };
    window.gyNpcFilter = function (f) { V.f = f; paint(); };
    window.gyNpcSearch = function (q) { V.q = String(q || ''); paintList(true); };

    const avHtml = (n, size) => n.avatarImg
        ? `<span class="gynp-avi" style="width:${size}px;height:${size}px;background-image:url('${n.avatarImg}')"></span>`
        : `<span class="gynp-avi e" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px">${esc(n.ico || '👤')}</span>`;

    function filtered() {
        const q = V.q.trim().toLowerCase();
        return S.npcs.filter(n => {
            if (V.f === 'all') { /* 全部 */ }
            else if (V.f === 'pub') { if (!n.all) return false; }
            else if (V.f === 'none') { if (n.all || (n.owners || []).some(o => o === 'me' || charOf(o))) return false; }
            else if (V.f === 'me') { if (!(n.owners || []).includes('me')) return false; }
            else if (V.f.startsWith('c:')) { if (!(n.owners || []).includes(V.f.slice(2))) return false; }
            if (q && ![n.name, n.handle, n.who, n.tie, n.persona].join(' ').toLowerCase().includes(q)) return false;
            return true;
        }).sort((a, b) => (V.fresh.has(b.id) - V.fresh.has(a.id)) || (b.at - a.at));
    }
    function chips() {
        const cnt = f => { const s = V.f; V.f = f; const q = V.q; V.q = ''; const n = filtered().length; V.f = s; V.q = q; return n; };
        const L = [['all', '全部'], ['pub', '🌐 通用'], ['me', '🙋 ' + meName()]].concat(chars().map(c => ['c:' + c.id, c.name])).concat([['none', '没绑人']]);
        return L.map(([k, t]) => { const n = cnt(k); if (!n && k !== 'all' && k !== V.f && k !== 'pub' && k !== 'me') return ''; return `<span class="gynp-chip${V.f === k ? ' on' : ''}" onclick="gyNpcFilter('${esc(k)}')">${esc(t)} <i>${n}</i></span>`; }).join('');
    }
    function rowHtml(n) {
        const pc = n.charId && charOf(n.charId);
        return `<div class="gynp-row${n.on === false ? ' off' : ''}${V.fresh.has(n.id) ? ' fresh' : ''}" onclick="gyNpcEdit('${n.id}')">
          ${avHtml(n, 42)}
          <div class="gynp-b">
            <div class="gynp-t"><b>${esc(n.name)}</b>${n.handle ? `<em>@${esc(n.handle)}</em>` : ''}${pc ? '<span class="gynp-tag ok">已经是角色</span>' : ''}${n.on === false ? '<span class="gynp-tag">关着</span>' : ''}</div>
            <div class="gynp-d">${esc(n.who || '')}${n.tie ? '　·　' + esc(n.tie) : ''}</div>
            <div class="gynp-d"><span class="gynp-tag b">${n.all ? '🌐 ' : '🔗 '}${esc(bindLabel(n))}</span><span class="gynp-tag">${n.from === 'wb' ? '世界书' + (n.wb ? '·' + esc(n.wb) : '') : n.from === 'gen' ? '生成的' : '我加的'}</span></div>
          </div>
          <span class="gynp-more">›</span>
        </div>`;
    }
    function paintList(onlyRows) {
        const box = document.getElementById('gyNpcBody'); if (!box) return;
        const L = filtered();
        const rows = L.length ? L.map(rowHtml).join('') : `<div class="gynp-hint" style="text-align:center;padding:26px 0;">${S.npcs.length ? '这一栏还没有人。' : '还没有 NPC。点上面「✨ 生成」让模型照着人设和世界书生成一批，或者「＋ 自己加」。'}</div>`;
        if (onlyRows) { const r = document.getElementById('gynpRows'); if (r) { r.innerHTML = rows; return; } }
        box.innerHTML = `
          ${on('npcOn') ? '' : `<div class="gynp-note warn">「NPC 列表」的总开关还关着：列表能看能改，但评论区、通讯录、聊天里都还不会用到他们。<span class="gynp-op go" onclick="gyNpcTurnOn()">打开</span></div>`}
          <div class="gynp-acts">
            <button class="gynp-btn" onclick="gyNpcGo('gen')" ${busy ? 'disabled' : ''}>${busy ? '⏳ 正在生成…' : '✨ 生成'}</button>
            <button class="gynp-btn ghost" onclick="gyNpcNew()">＋ 自己加</button>
            <button class="gynp-btn ghost" onclick="gyNpcGrab()" ${busy ? 'disabled' : ''}>➕ 报名字加入</button>
            <button class="gynp-btn ghost" onclick="gyNpcGo('mix')">⚖️ 评论里的比例</button>
          </div>
          <div class="gynp-chips">${chips()}</div>
          <input class="gynp-q" placeholder="搜名字、账号、是谁…" value="${esc(V.q)}" oninput="gyNpcSearch(this.value)">
          <div id="gynpRows">${rows}</div>`;
    }
    window.gyNpcGo = v => go(v);
    window.gyNpcTurnOn = function () { try { if (typeof setAutoFeature === 'function') { setAutoFeature('npcOn', true, true); setAutoFeature('npcInComments', true, true); } } catch (e) {} toast('打开了'); paint(); };

    function paintEdit() {
        const box = document.getElementById('gyNpcBody'); if (!box) return;
        const n = S.npcs.find(x => x.id === V.id) || (V.draft && V.draft.id === V.id ? V.draft : null);
        if (!n) return go('list');
        const img = Object.assign({}, { avatarImg: n.avatarImg || '', bgImg: n.bgImg || '' }, V.img && V.img.id === n.id ? V.img : {});
        const f = (k, label, ph, v, area) => `<label class="gynp-f"><span>${label}</span>${area ? `<textarea id="gynpE_${k}" placeholder="${esc(ph)}" rows="2">${esc(v || '')}</textarea>` : `<input id="gynpE_${k}" placeholder="${esc(ph)}" value="${esc(v || '')}">`}</label>`;
        const pc = n.charId && charOf(n.charId);
        const ownBox = (val, label, checked) => `<label class="gynp-ck"><input type="checkbox" class="gynpE-own" value="${esc(val)}" ${checked ? 'checked' : ''}> ${esc(label)}</label>`;
        box.innerHTML = `
          <div class="gynp-cover" style="${img.bgImg ? `background-image:url('${img.bgImg}')` : ''}">
            <div class="gynp-cover-ops"><span onclick="gyNpcPickImg('${n.id}','bgImg')">🖼️ ${img.bgImg ? '换背景' : '加背景'}</span>${img.bgImg ? `<span onclick="gyNpcClearImg('${n.id}','bgImg')">去掉</span>` : ''}</div>
            <div class="gynp-cover-av" onclick="gyNpcPickImg('${n.id}','avatarImg')" title="换头像">${avHtml(Object.assign({}, n, { avatarImg: img.avatarImg }), 76)}<i>📷</i></div>
          </div>
          <div class="gynp-under">${img.avatarImg ? `<span class="gynp-op" onclick="gyNpcClearImg('${n.id}','avatarImg')">去掉头像（用 emoji）</span>` : '<span class="gynp-hint">点头像换成图片，能裁剪</span>'}</div>
          <div class="gynp-form">
            <div class="gynp-2">${f('ico', 'emoji', '👤', n.ico)}${f('name', '名字或称呼', '名字', n.name)}</div>
            ${f('handle', '网络账号', '没有网络的世界就空着', n.handle)}
            ${f('who', '他是谁', '比如：楼下面馆老板', n.who)}
            ${f('tie', '跟谁什么关系', '比如：看着立夏长大的', n.tie)}
            ${f('persona', '这人什么样', '性格、经历、现在在干嘛', n.persona, true)}
            ${f('tone', '说话调调', '比如：嘴硬心软', n.tone)}
            <div class="gynp-f"><span>绑给谁（可以多选）</span>
              <label class="gynp-ck strong"><input type="checkbox" id="gynpE_all" ${n.all ? 'checked' : ''}> 🌐 通用：谁都认识（所有角色和你）</label>
              <div class="gynp-cks">${ownBox('me', '🙋 ' + meName() + '（我）', (n.owners || []).includes('me'))}${chars().map(c => ownBox(String(c.id), c.name, (n.owners || []).includes(String(c.id)))).join('')}</div>
              <div class="gynp-hint">绑给谁，谁发的帖子底下就可能出现 TA，谁的聊天里就知道有这么个人；绑给你，你发的推文、论坛帖底下也会有 TA。</div>
            </div>
          </div>
          <div class="gynp-acts">
            <button class="gynp-btn" onclick="gyNpcSave('${n.id}')">保存</button>
            <button class="gynp-btn ghost" onclick="gyNpcClose()">取消</button>
            ${n.__new ? '' : `<label class="gynp-ck"><input type="checkbox" ${n.on === false ? '' : 'checked'} onchange="gyNpcToggle('${n.id}', this.checked)"> 用着</label>`}
          </div>
          ${n.__new ? '' : `<div class="gynp-acts">
            ${pc ? `<span class="gynp-tag ok">已经是角色</span><button class="gynp-btn ghost" onclick="gyNpcChat('${n.id}')">💬 去聊天</button>` : `<button class="gynp-btn ghost" onclick="gyNpcPromote('${n.id}')" title="能私聊、能拉进群、有自己的资料页">✨ 变成完整的角色</button>`}
            <button class="gynp-btn bad" onclick="gyNpcDel('${n.id}')">删掉</button>
          </div>`}`;
    }
    window.gyNpcGenRun = async function () {
        const ck = id => !!(document.getElementById(id) || {}).checked;
        const vals = cls => Array.from(document.querySelectorAll('.' + cls + ':checked')).map(x => x.value);
        const bind = (document.querySelector('input[name="gynpG_bind"]:checked') || {}).value || 'src';
        const charIds = vals('gynpG-c'), me = ck('gynpG_me');
        let owners = [], all = false;
        if (bind === 'all') all = true;
        else if (bind === 'src') owners = (me ? ['me'] : []).concat(charIds);
        else if (bind === 'pick') owners = vals('gynpG-o');
        V.gen = { me, charIds, wbIds: vals('gynpG-w'), n: (document.getElementById('gynpG_n') || {}).value || 5, wish: (document.getElementById('gynpG_wish') || {}).value || '', bind, owners: vals('gynpG-o') };
        const add = await window.gyNpcGen({ me, charIds, wbIds: V.gen.wbIds, n: V.gen.n, wish: V.gen.wish, owners, all, from: 'gen' });
        if (add && add.length) { V.f = 'all'; go('list'); }
    };
    function paintGen() {
        const box = document.getElementById('gyNpcBody'); if (!box) return;
        const g = V.gen || { me: true, charIds: [], wbIds: [], n: 5, wish: '', bind: 'src', owners: [] };
        const ck = (cls, v, label, on_, sub) => `<label class="gynp-ck"><input type="checkbox" class="${cls}" value="${esc(v)}" ${on_ ? 'checked' : ''}> ${esc(label)}${sub ? `<em>${esc(sub)}</em>` : ''}</label>`;
        const wbs = wbAll();
        box.innerHTML = `
          <div class="gynp-note">挑好材料，模型照着这些人和这个世界，生成跟他们有来往的配角（同事、邻居、老同学、对头……）。生成完就在列表里，哪里不对点进去改。<br><span style="opacity:.75">走副 API，生成一次调一次。</span></div>
          <div class="gynp-f"><span>① 照着谁</span>
            <div class="gynp-cks">${ck('', 'me', '🙋 ' + meName() + '的人设', g.me, '').replace('class=""', 'id="gynpG_me"')}${chars().map(c => ck('gynpG-c', String(c.id), c.name, g.charIds.includes(String(c.id)))).join('')}</div></div>
          <div class="gynp-f"><span>② 用哪些世界书</span>
            ${wbs.length ? `<div class="gynp-cks col">${wbs.map(w => ck('gynpG-w', String(w.id), w.title || '（没名字）', g.wbIds.includes(String(w.id)), w.isGlobal ? '全局' : '')).join('')}</div>` : '<div class="gynp-hint">还没有世界书。</div>'}</div>
          <div class="gynp-f"><span>③ 要几个</span><input id="gynpG_n" type="number" min="1" max="10" value="${esc(g.n)}"></div>
          <div class="gynp-f"><span>④ 还有什么要求（可不填）</span><textarea id="gynpG_wish" rows="2" placeholder="比如：要一个跟立夏不对付的同事、一个总来蹭饭的邻居">${esc(g.wish)}</textarea></div>
          <div class="gynp-f"><span>⑤ 生成出来绑给谁</span>
            <label class="gynp-ck"><input type="radio" name="gynpG_bind" value="src" ${g.bind === 'src' ? 'checked' : ''}> 绑给上面勾的人</label>
            <label class="gynp-ck"><input type="radio" name="gynpG_bind" value="all" ${g.bind === 'all' ? 'checked' : ''}> 🌐 通用（谁都认识）</label>
            <label class="gynp-ck"><input type="radio" name="gynpG_bind" value="pick" ${g.bind === 'pick' ? 'checked' : ''}> 我来挑：</label>
            <div class="gynp-cks">${ck('gynpG-o', 'me', '🙋 ' + meName(), g.owners.includes('me'))}${chars().map(c => ck('gynpG-o', String(c.id), c.name, g.owners.includes(String(c.id)))).join('')}</div>
          </div>
          <div class="gynp-acts"><button class="gynp-btn" onclick="gyNpcGenRun()" ${busy ? 'disabled' : ''}>${busy ? '⏳ 正在生成…' : '✨ 生成'}</button><button class="gynp-btn ghost" onclick="gyNpcClose()">返回</button></div>
          ${chars().length ? `<div class="gynp-f"><span>或者：从某个角色的世界书里把写到的人抽出来（绑给那个角色）</span><div class="gynp-cks">${chars().map(c => `<span class="gynp-chip" onclick="gyNpcMake('${c.id}').then(a=>{if(a&&a.length)gyNpcGo('list')})">${esc(c.name)}</span>`).join('')}</div></div>` : ''}`;
    }
    function paintMix() {
        const box = document.getElementById('gyNpcBody'); if (!box) return;
        const def = Number(S.mix.def) || 0;
        box.innerHTML = `
          <div class="gynp-note">评论区里有多少条换成 NPC（熟人）说的，剩下的是陌生路人。只会用到绑给帖子主人的 NPC 和「通用」的 NPC；一个都没有的话还是全是路人。${on('npcInComments') ? '' : '<br><b>「评论区用上 NPC」开关现在关着</b>，这里调了也不生效。<span class="gynp-op go" onclick="gyNpcTurnOn()">打开</span>'}</div>
          <div class="gynp-mix main"><div><b>总的</b><em>没单独调的地方都按这个</em></div>
            <input type="range" min="0" max="100" step="5" value="${def}" oninput="this.nextElementSibling.textContent=this.value+'% NPC · '+(100-this.value)+'% 路人'" onchange="gyNpcMixSet('def', this.value)"><span>${def}% NPC · ${100 - def}% 路人</span></div>
          ${SCENES.map(([k, t, d]) => { const v = S.mix.sc[k]; const own = v != null; const val = own ? v : def; return `<div class="gynp-mix">
            <div><b>${esc(t)}</b><em>${esc(d)}</em></div>
            <label class="gynp-ck"><input type="checkbox" ${own ? '' : 'checked'} onchange="gyNpcMixSet('${k}', this.checked ? 'def' : ${def})"> 跟着总的</label>
            ${own ? `<input type="range" min="0" max="100" step="5" value="${val}" oninput="this.nextElementSibling.textContent=this.value+'% NPC · '+(100-this.value)+'% 路人'" onchange="gyNpcMixSet('${k}', this.value)"><span>${val}% NPC · ${100 - val}% 路人</span>` : `<span class="gynp-hint">现在 ${val}% NPC</span>`}
          </div>`; }).join('')}
          <div class="gynp-mix"><div><b>🧩 聊天里提到几个</b><em>告诉 TA「你身边有这些人」时最多写几个</em></div><input type="number" min="0" max="20" value="${Number(S.inject) || 5}" onchange="gyNpcSet('inject', this.value)"></div>
          <div class="gynp-acts"><button class="gynp-btn ghost" onclick="gyNpcClose()">返回</button></div>`;
    }
    function paint() {
        const page = document.getElementById('gyNpcPage'); if (!page || !page.classList.contains('on')) return;
        const T = { list: '👥 NPC 列表', edit: (S.npcs.find(x => x.id === V.id) || {}).name || '新 NPC', gen: '✨ 生成 NPC', mix: '⚖️ 评论里的比例' };
        document.getElementById('gyNpcTitle').textContent = T[V.view] || T.list;
        if (V.view === 'edit') paintEdit(); else if (V.view === 'gen') paintGen(); else if (V.view === 'mix') paintMix(); else paintList();
    }
    window.gyNpcPaint = paint;

    const CSS = `
    #gyNpcPage{position:fixed;inset:0;z-index:2600;background:var(--gy-bg,#fff);display:none;flex-direction:column;color:inherit;}
    body.dark-theme #gyNpcPage{background:#15202b;}
    #gyNpcPage.on{display:flex;}
    .gynp-hd{padding:12px 14px;font-size:17px;font-weight:700;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--gy-line,#cfd9de);padding-top:calc(12px + env(safe-area-inset-top,0px));}
    .gynp-hd .bk{cursor:pointer;font-size:22px;line-height:1;color:var(--gy-accent,#1d9bf0);padding:0 6px;}
    .gynp-bd{padding:12px 16px 40px;overflow-y:auto;flex:1 1 auto;max-width:720px;width:100%;margin:0 auto;box-sizing:border-box;}
    .gynp-note{font-size:12.5px;color:#8b98a5;line-height:1.85;padding:10px 12px;margin-bottom:12px;border-radius:10px;background:rgba(var(--gy-accent-rgb),.06);border:1px dashed rgba(var(--gy-accent-rgb),.3);}
    .gynp-note.warn{border-color:#f5a623;color:inherit;}
    .gynp-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0;}
    .gynp-chips,.gynp-cks{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;}
    .gynp-cks.col{flex-direction:column;}
    .gynp-chip{font-size:12.5px;padding:4px 11px;border:1px solid var(--gy-line,#cfd9de);border-radius:999px;cursor:pointer;}
    .gynp-chip i{font-style:normal;opacity:.6;}
    .gynp-chip.on{background:var(--gy-accent,#1d9bf0);border-color:var(--gy-accent,#1d9bf0);color:#fff;}
    .gynp-q{width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--gy-line,#cfd9de);border-radius:999px;background:transparent;color:inherit;font-size:13.5px;margin:4px 0 8px;font-family:inherit;}
    .gynp-row{display:flex;align-items:center;gap:11px;padding:11px 4px;border-bottom:1px solid rgba(128,128,128,.14);cursor:pointer;}
    .gynp-row:hover{background:rgba(var(--gy-accent-rgb),.05);}
    .gynp-row.off{opacity:.45;} .gynp-row.fresh{background:rgba(245,166,35,.1);}
    .gynp-avi{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background-size:cover;background-position:center;flex-shrink:0;}
    .gynp-avi.e{background:rgba(var(--gy-accent-rgb),.12);}
    .gynp-b{flex:1;min-width:0;}
    .gynp-t{font-size:14px;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;}
    .gynp-t em{font-style:normal;font-size:11.5px;color:#8b98a5;}
    .gynp-tag{font-size:10.5px;border:1px solid var(--gy-line,#cfd9de);border-radius:4px;padding:0 5px;color:#8b98a5;margin-right:4px;}
    .gynp-tag.b{color:var(--gy-accent,#1d9bf0);border-color:rgba(var(--gy-accent-rgb),.4);}
    .gynp-tag.ok{color:#17bf63;border-color:#17bf63;}
    .gynp-d{font-size:12px;color:#8b98a5;line-height:1.7;margin-top:2px;}
    .gynp-more{color:#8b98a5;font-size:18px;}
    .gynp-op{font-size:12.5px;color:var(--gy-accent,#1d9bf0);cursor:pointer;margin-left:6px;}.gynp-op.go{font-weight:600;}
    .gynp-hint{font-size:12px;color:#8b98a5;line-height:1.8;}
    .gynp-btn{border:1px solid var(--gy-accent,#1d9bf0);color:#fff;background:var(--gy-accent,#1d9bf0);border-radius:999px;padding:7px 16px;font-size:13px;cursor:pointer;font-family:inherit;}
    .gynp-btn.ghost{background:transparent;color:var(--gy-accent,#1d9bf0);}
    .gynp-btn.bad{background:transparent;color:var(--gy-bad,#f4212e);border-color:var(--gy-bad,#f4212e);}
    .gynp-btn[disabled]{opacity:.5;cursor:default;}
    .gynp-cover{position:relative;height:130px;border-radius:14px;background:rgba(var(--gy-accent-rgb),.12) center/cover no-repeat;margin-bottom:46px;}
    .gynp-cover-ops{position:absolute;right:8px;top:8px;display:flex;gap:6px;}
    .gynp-cover-ops span{font-size:12px;background:rgba(0,0,0,.45);color:#fff;border-radius:999px;padding:3px 10px;cursor:pointer;}
    .gynp-cover-av{position:absolute;left:16px;bottom:-38px;cursor:pointer;border-radius:50%;border:3px solid var(--gy-bg,#fff);}
    .gynp-cover-av i{position:absolute;right:-2px;bottom:-2px;font-style:normal;font-size:14px;background:var(--gy-bg,#fff);border-radius:50%;padding:2px;}
    .gynp-under{min-height:18px;margin:-6px 0 8px 104px;}
    .gynp-form{display:flex;flex-direction:column;gap:8px;}
    .gynp-2{display:grid;grid-template-columns:76px 1fr;gap:8px;}
    .gynp-f{display:flex;flex-direction:column;gap:4px;font-size:12.5px;margin:6px 0;}
    .gynp-f>span{color:#8b98a5;}
    .gynp-f input:not([type=checkbox]):not([type=radio]),.gynp-f textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--gy-line,#cfd9de);border-radius:9px;background:transparent;color:inherit;font-size:13.5px;font-family:inherit;}
    .gynp-ck{display:inline-flex;align-items:center;gap:5px;font-size:13px;padding:3px 8px;border:1px solid var(--gy-line,#cfd9de);border-radius:999px;cursor:pointer;}
    .gynp-ck em{font-style:normal;font-size:11px;color:#8b98a5;}
    .gynp-ck.strong{border-color:var(--gy-accent,#1d9bf0);}
    .gynp-mix{display:grid;grid-template-columns:1fr;gap:6px;padding:10px 0;border-bottom:1px solid rgba(128,128,128,.14);font-size:13px;}
    .gynp-mix b{display:block;}.gynp-mix em{font-style:normal;font-size:11.5px;color:#8b98a5;}
    .gynp-mix input[type=range]{width:100%;}
    .gynp-mix input[type=number]{width:80px;padding:5px 8px;border:1px solid var(--gy-line,#cfd9de);border-radius:8px;background:transparent;color:inherit;}
    .gynp-mix.main{background:rgba(var(--gy-accent-rgb),.05);border-radius:10px;padding:10px;}
    .gynp-w{height:100%;display:flex;flex-direction:column;justify-content:center;padding:10px;box-sizing:border-box}
    .gynp-w.s{align-items:center;gap:4px}.gynp-w.s b{font-size:24px}.gynp-w.s em{font-style:normal;font-size:12px}
    .gynp-w.m .h{display:flex;gap:6px;align-items:center;font-size:12px;opacity:.8}.gynp-w.m em{font-style:normal;font-size:13px;margin-top:6px;line-height:1.6}
    `;
    function mount() {
        if (document.getElementById('gyNpcPage')) return;
        if (!document.getElementById('gyNpcCss')) { const st = document.createElement('style'); st.id = 'gyNpcCss'; st.textContent = CSS; document.head.appendChild(st); }
        const m = document.createElement('div');
        m.id = 'gyNpcPage'; m.setAttribute('data-gy-overlay', '1');
        m.innerHTML = `<div class="gynp-hd"><span class="bk" onclick="gyNpcClose()">‹</span><span id="gyNpcTitle">👥 NPC 列表</span></div><div class="gynp-bd" id="gyNpcBody"></div>`;
        document.body.appendChild(m);
    }

    /* ---------- 开关 / 挂钩 ---------- */
    function addSwitches() {
        try {
            if (typeof AUTO_FEATURE_DEFS === 'undefined' || !Array.isArray(AUTO_FEATURE_DEFS)) return;
            if (typeof AUTO_FEATURE_GROUPS !== 'undefined' && Array.isArray(AUTO_FEATURE_GROUPS) && !AUTO_FEATURE_GROUPS.some(g => g.key === 'NPC'))
                AUTO_FEATURE_GROUPS.push({ key: 'NPC', icon: '👥', title: 'NPC 列表', note: '所有 NPC 放在一张列表里：照着人设和世界书生成、绑给你 / 角色 / 通用。整组默认关着。' });
            const defs = [
                { key: 'npcOn', label: 'NPC 列表（总开关）', desc: '打开以后，NPC 列表里的人会出现在评论区、手机通讯录、聊天里（按下面几个开关）。列表本身关着也能看能改。', cost: '生成 / 抽人一次一次调用（手动点才调）', defaultOff: true, group: 'NPC', where: '小功能 → 👥 NPC 列表' },
                { key: 'npcInject', label: '让角色知道身边有这些人', desc: '把绑给 TA 的 NPC（和通用的）写进 prompt（名字、是谁、什么关系）。角色提起"我师父"的时候前后对得上。', cost: '不调 API（只是接进本来就要发的 prompt）', group: 'NPC', where: '注入内容管理里能逐条关' },
                { key: 'npcInComments', label: '评论区用上 NPC', desc: '推文、匿名区、八卦网、论坛、小红书、直播弹幕里，按比例把一部分路人换成绑给帖子主人的 NPC 来说话——熟人知道内情，会调侃、会担心、会拆台。比例在 NPC 列表 →「⚖️ 评论里的比例」里调，每个地方能单独调。', cost: '不额外调 API（跟着原来那次评论一起生成）', group: 'NPC', where: '👥 NPC 列表 → ⚖️ 评论里的比例' },
                { key: 'npcInPhone', label: '手机通讯录优先用这些人', desc: '开了「通讯录照人设开」之后，生成时会先把这些人递过去，让模型优先把他们放进通讯录里，而不是另外编一批。', cost: '不额外调 API', group: 'NPC', where: '手机侧栏 → 📇 通讯录' }
            ];
            defs.forEach(d => { const o = AUTO_FEATURE_DEFS.find(x => x.key === d.key); if (!o) AUTO_FEATURE_DEFS.push(d); else Object.assign(o, d); });
        } catch (e) {}
    }
    function hookCtx() {
        try { if (typeof GY_BOX_CTX !== 'undefined' && Array.isArray(GY_BOX_CTX) && !GY_BOX_CTX.some(x => x[0] === '__gyNpcCtxFor')) GY_BOX_CTX.push(['__gyNpcCtxFor', 'NPC 列表']); } catch (e) {}
    }
    function hookMini() {
        try {
            if (typeof registerMiniFeature !== 'function') return;
            registerMiniFeature({ id: 'npc', icon: '👥', title: 'NPC 列表', desc: '所有 NPC 都在这：照着你的人设、角色人设和世界书生成，绑给你 / 角色 / 通用；评论区里 NPC 和路人的比例也在这调。', onOpen: () => window.gyNpcOpen() });
        } catch (e) {}
    }
    function hookProfMenu() {
        try {
            if (typeof window.gyProfMenuAdd !== 'function') return;
            window.gyProfMenuAdd({ id: 'npc', icon: '👥', label: 'TA 身边的人', sub: 'NPC 列表里绑给 TA 的', show: id => on('npcOn') && id && String(id) !== 'me' && !!charOf(id), run: id => window.gyNpcOpen(id) });
        } catch (e) {}
    }
    function regSrc() {
        try {
            if (!window.gyInjectSrc || typeof window.gyInjectSrc.def !== 'function') return;
            window.gyInjectSrc.def({ feat: 'npc', icon: '👥', title: '从世界书里抽 NPC', note: '点某个角色「从世界书里抽」时递给模型的材料。（「✨ 生成」用的是你在生成页里勾的材料。）', items: SRC_DEFS });
        } catch (e) {}
    }

    /* ---------- 今天 / 小组件 / 记忆总览 / 自主行动 ---------- */
    function todayHtml() {
        if (!on('npcOn')) return '';
        const day = new Date().toDateString();
        const L = S.npcs.filter(n => new Date(n.at).toDateString() === day || (n.edited && new Date(n.edited).toDateString() === day));
        const P = (S.log || []).filter(x => new Date(x.at).toDateString() === day && /变成了角色|聊了/.test(x.t));
        if (!L.length && !P.length) return '';
        return `<div class="gyt-sec gynp-tsec"><h4>👥 NPC 列表</h4>${L.slice(0, 3).map(n => `<div class="gyt-row click" onclick="gyNpcEdit('${n.id}')"><span class="gyt-t">${esc(bindLabel(n))}</span><span class="gyt-x">${esc(n.ico || '👤')} ${esc(n.name)}${n.who ? '，' + esc(n.who) : ''}</span></div>`).join('')}${P.slice(0, 2).map(x => `<div class="gyt-row"><span class="gyt-x">${esc(x.t)}</span></div>`).join('')}</div>`;
    }
    function paintToday() { ['gyToday', 'gyTodayM'].forEach(id => { const b = document.getElementById(id); if (!b) return; b.querySelectorAll('.gynp-tsec').forEach(x => x.remove()); const h = todayHtml(); if (h) b.insertAdjacentHTML('beforeend', h); }); }
    function hookToday() { const f = window.gyTodayRender; if (typeof f !== 'function' || f.__gyNpc) return; const w = function () { const r = f.apply(this, arguments); try { paintToday(); } catch (e) {} return r; }; Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__gyNpc = true; window.gyTodayRender = w; }
    function regWidget() {
        const W = window.__gyPmW; if (!W || !W.WD) return false; if (W.WD.gyNpcW) return true;
        W.WD.gyNpcW = { n: 'TA 身边的人', sizes: ['s', 'm'], tap: () => window.gyNpcOpen(window.currentChatSessionId), r: w => {
            const c = charOf(window.currentChatSessionId) || chars().find(x => listOf(x.id).length) || null; const L = c ? listOf(c.id) : [];
            if (w.size === 's') return `<div class="gynp-w s"><b>👥</b><em>${L.length ? L.length + ' 个人' : '还没有'}</em></div>`;
            return `<div class="gynp-w m"><div class="h"><b>👥</b><span>${c ? esc(c.name) + ' 身边的人' : 'TA 身边的人'}</span></div><em>${L.length ? L.slice(0, 4).map(n => esc(n.ico || '👤') + esc(n.name)).join('　') : '去「NPC 列表」生成几个'}</em></div>`;
        } };
        return true;
    }
    function regMem() {
        if (typeof window.gyMemExAdd !== 'function') return false;
        window.gyMemExAdd({ k: 'gyNpc', ico: '👥', n: '身边的人（NPC）', d: '格式：名字｜他是谁｜什么关系，改了就是改这个人；全部 NPC 在「👥 NPC 列表」里', on: () => on('npcOn'),
            items: c => S.npcs.filter(n => (n.owners || []).includes(String(c.id))), text: n => [n.name, n.who || '', n.tie || ''].join('｜'),
            edit: (n, v) => { const p = String(v).split('｜'); if (p[0] && p[0].trim()) n.name = p[0].trim(); if (p.length > 1) n.who = (p[1] || '').trim(); if (p.length > 2) n.tie = (p[2] || '').trim(); n.edited = Date.now(); },
            del: (c, i) => { const L = S.npcs.filter(n => (n.owners || []).includes(String(c.id))); const x = L[i]; if (!x) return; if (x.owners.length > 1 || x.all) x.owners = x.owners.filter(o => o !== String(c.id)); else S.npcs = S.npcs.filter(n => n !== x); },
            meta: n => (n.from === 'wb' ? '世界书里抽的' : n.from === 'gen' ? '生成的' : '我加的') + ' · ' + bindLabel(n) + (n.charId && charOf(n.charId) ? ' · 已经是角色' : '') + (n.on === false ? ' · 关着' : ''), save: () => save() });
        return true;
    }
    function regAction() {
        try {
            if (typeof GY_AUTONOMY_ACTIONS === 'undefined') return;
            const a = GY_AUTONOMY_ACTIONS.find(x => x.key === 'npc_gossip');
            const def = { key: 'npc_gossip', label: '跟她讲讲身边某个人的事（NPC 列表里的熟人）', hint: '师父又怎样了、同事闹了什么笑话——像跟对象聊八卦那样',
                need: c => on('npcOn') && listOf(c.id).length > 0 && typeof sendProactiveChatMessage === 'function',
                run: async c => {
                    const L = listOf(c.id); const n = L[Math.floor(Math.random() * L.length)]; if (!n) return null;
                    NUDGE[String(c.id)] = `你身边的「${n.name}」（${[n.who, n.tie].filter(Boolean).join('，')}）最近有点事，你想跟她说说——吐槽、八卦、担心、或者觉得好笑都行，按你们的关系和你的性格来，自然地开口，不要说"我想跟你聊聊某某"这种开场。`;
                    try { await sendProactiveChatMessage(c); S.log.unshift({ at: Date.now(), t: c.name + ' 跟你聊了 ' + n.name }); S.log = S.log.slice(0, 60); save(); return '跟她聊了聊' + n.name; }
                    catch (e) { return null; } finally { delete NUDGE[String(c.id)]; }
                } };
            if (a) Object.assign(a, def); else GY_AUTONOMY_ACTIONS.push(def);
        } catch (e) {}
    }
    let memOk = false, wOk = false;
    setInterval(() => { hookToday(); regAction(); hookDelete(); hookIdentity(); if (!memOk) memOk = regMem(); if (!wOk) wOk = regWidget(); }, 3000);

    (async function init() {
        addSwitches();
        hookCtx();
        await load();
        hookDelete(); hookIdentity();
        setTimeout(() => { hookMini(); hookProfMenu(); regSrc(); hookCtx(); hookDelete(); hookIdentity(); }, 900);
        setTimeout(() => { hookMini(); hookProfMenu(); regSrc(); }, 2600);
    })();
})();
