/* 📰 营销号自己爆料：营销号不再等你点按钮，隔一阵自己去挖料、在主页发爆料帖——料都来自谷雨里真实发生的事（日程、行踪、关系网、恋综、秘密计划露的破绽、公开的互动……；私聊内容要你自己勾上才挖）。被爆的人会来评论区回应，路人吵成一片。能选爆谁：只爆你和角色 / 只爆角色之间 / 都爆；每次被爆几个人随机。你「谁都别知道」的日程和私聊内容，永远挖不到 */
if (window.__gyxScoop) return; window.__gyxScoop = 1;
X.feat('gyxScoop', { n: '📰 营销号自己爆料', desc: '营销号隔一阵自己在主页爆料，被爆的人会来回应' });
const S = X.store('scoop');
let D = { list: [], cfg: { mode: 'all', cnt: 'rand', num: 2, freq: 'auto', hours: 6, max: 3, night: false, src: {}, want: '' }, next: 0, day: '', n: 0 };   // list: {id, postId, at, who:[ids], text, tags:[], tip}
const P = (id, def, vars) => { let t = def; try { if (typeof gyPL === 'function') return gyPL(id, def, vars); } catch (e) {} Object.keys(vars || {}).forEach(k => { t = t.split('{{' + k + '}}').join(vars[k] == null ? '' : String(vars[k])); }); return t; };
const DEF_POST = `你是娱乐营销号「{{账号}}」（{{账号人设}}）。唯恐天下不乱，说话震惊体、吃瓜感，爱用 #话题#。
这次要爆料的人：
{{人物}}
你挖到的「料」——都是公开或半公开能看到的蛛丝马迹。你可以添油加醋、捕风捉影、用"疑似""知情人透露"，但不能凭空编违法犯罪、不能人身攻击、不能写露骨内容：
{{料}}
{{要求}}
写一条爆料帖，100~200 字，带 1~2 个 #话题#（像「#某某疑似恋情曝光#」）。直接输出正文，不要前缀、不要引号。`;
const DEF_REACT = `营销号刚在主页发了一条爆料，牵扯到你：
「{{爆料}}」
你会在评论区回应——澄清、嘴硬、装傻、阴阳怪气、反手吃瓜、或者干脆认了，按你的性格和这件事的真假来。一句话，40 字以内。不想理就只输出 NO。`;
const DEF_TIP = `你想偷偷给营销号递点料，爆一下 {{对象}}。根据你知道的（别编太离谱），用一两句话写下你要递的料，30 字以内。只输出这句。`;
P('scoop.post', DEF_POST); P('scoop.react', DEF_REACT); P('scoop.tip', DEF_TIP);
const regPL = () => { if (typeof window.gyPLGroupAdd !== 'function') return false; window.gyPLGroupAdd({ g: '📰 营销号自动爆料', plug: 'gyxScoop', items: [['scoop.post', '营销号写爆料帖', '营销号自己爆料 / TA 递料之后', '{{账号}} {{账号人设}}：营销号资料；{{人物}}：这次被爆的人；{{料}}：挖到的蛛丝马迹；{{要求}}：你在设置里写的「想让营销号爆什么」'], ['scoop.react', '被爆的人怎么回应', '爆料发出后，被爆的角色在评论区', '{{爆料}}：那条爆料正文'], ['scoop.tip', '角色偷偷递料', '自主模式里 TA 给营销号递料', '{{对象}}：要爆的人']] }); return true; };
if (!regPL()) { let n = 0; const iv = setInterval(() => { if (regPL() || ++n > 40) clearInterval(iv); }, 500); }
const save = () => S.set('d', D);
const ME = () => (typeof currentUser !== 'undefined' && currentUser) || { id: 'me', name: '我' };
const meName = () => { try { return typeof userDisplayName === 'function' ? userDisplayName() : ME().name; } catch (e) { return ME().name || '我'; } };
const acct = () => (typeof tabloidAccount !== 'undefined' && tabloidAccount) || { id: 'tabloid_admin', name: 'X星圈内爆料', handle: '@tabloid_news', persona: '专业狗仔', avatarEmoji: '📰' };
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const MODES = { user: '只爆你和角色', char: '只爆角色之间', all: '你和角色都爆' };
// 挑这次爆谁：人数随机
// 人数：随机＝爆角色时 1~3 个、爆到你时你 + 1~2 个；自己定＝一共 N 个人（爆到你时你也算一个）
function pickWho(mode, force) {
    const cs = shuf(X.chars()); if (!cs.length) return null;
    mode = mode === 'all' ? (Math.random() < .45 ? 'user' : 'char') : mode;
    if (force) mode = force;
    const fix = D.cfg.cnt === 'fix' ? Math.max(1, Math.min(8, Math.round(+D.cfg.num || 2))) : 0;
    if (mode === 'user') { const k = fix ? Math.max(1, fix - 1) : 1 + Math.floor(Math.random() * 2); return { me: true, chars: cs.slice(0, Math.min(cs.length, k)) }; }
    const k = Math.min(cs.length, fix || 1 + Math.floor(Math.random() * 3)); return { me: false, chars: cs.slice(0, k) };
}
// 料从哪儿挖：每一样都能在设置里关
const SRC = { chat: '私聊内容（默认不勾）', now: '此刻在做什么', sched: '今天的行程', plan: '秘密计划露的破绽', show: '恋综', posts: '自己发的帖子', rel: '关系网', mine: '你的帖子和谁在你帖子下评论', myday: '你公开的日程' };
const srcOn = k => D.cfg.src[k] === undefined ? k !== 'chat' : !!D.cfg.src[k];   // 私聊默认不挖，要你自己勾
// 挖料：默认只用公开 / 半公开的东西；私聊要她自己勾上才挖；她「谁都别知道」的日程一律不碰
function dig(w) {
    const L = [];
    w.chars.forEach(c => {
        const n = X.name(c);
        if (srcOn('now')) try { if (c.lifeState && c.lifeState.activity) L.push(`${n} 此刻：${X.plain(c.lifeState.activity).slice(0, 40)}`); } catch (e) {}
        if (srcOn('sched')) try { if (c.schedule && c.schedule.text) { const ln = String(c.schedule.text).split('\n').filter(Boolean); L.push(`${n} 今天的行程里有：${X.pick(ln).slice(0, 40)}`); } } catch (e) {}
        if (srcOn('plan')) try { const P0 = (window.gyxPlanData ? window.gyxPlanData().plans : []).find(p => p.cid === String(c.id) && !p.done && p.hints.length); if (P0) L.push(`${n} 最近有点反常：${P0.hints.slice(-1)[0].t.slice(0, 40)}`); } catch (e) {}
        if (srcOn('show')) try { const sh = (window.gyxShowData ? window.gyxShowData().seasons : []).find(s => s.cids.includes(String(c.id))); if (sh) L.push(`${n} 参加了恋爱综艺，同期嘉宾：${sh.cids.filter(x => x !== String(c.id)).map(x => X.name(X.char(x))).join('、')}`); } catch (e) {}
        if (srcOn('posts')) try { const posts = (typeof globalPosts !== 'undefined' ? globalPosts : []).filter(p => p.char && String(p.char.id) === String(c.id)).slice(0, 2); posts.forEach(p => L.push(`${n} 最近发的帖子：${X.plain(p.text).slice(0, 50)}`)); } catch (e) {}
    });
    if (srcOn('rel')) try { const R = (typeof charRelationships !== 'undefined' ? charRelationships : []); const ids = w.chars.map(c => String(c.id)); R.filter(r => ids.includes(String(r.fromId)) && ids.includes(String(r.toId))).slice(0, 3).forEach(r => L.push(`关系网上：${X.name(X.char(r.fromId))} 和 ${X.name(X.char(r.toId))} 是「${r.label || '有关系'}」`)); } catch (e) {}
    // 私聊：只有你勾了才挖；只挖你和这次被爆的角色之间的，当成「知情人截图 / 有人听到」
    if (w.me && srcOn('chat')) w.chars.forEach(c => { try {
        const H = ((typeof globalChats !== 'undefined' && globalChats[c.id]) || []).filter(m => m && m.sender !== 'system' && X.plain(m.text).length >= 4).slice(-30);
        shuf(H).slice(0, 2).forEach(m => L.push(`知情人透露 ${m.sender === 'me' ? meName() : X.name(c)} 私下跟 ${m.sender === 'me' ? X.name(c) : meName()} 说过：「${X.plain(m.text).slice(0, 50)}」`));
    } catch (e) {} });
    if (w.me) {
        if (srcOn('mine')) try { const mine = (typeof globalPosts !== 'undefined' ? globalPosts : []).filter(p => p.char && p.char.id === 'me'); mine.slice(0, 2).forEach(p => L.push(`博主 ${meName()} 最近发的帖子：${X.plain(p.text).slice(0, 50)}`)); w.chars.forEach(c => { const n = mine.reduce((a, p) => a + (p.replies || []).filter(r => r.char && String(r.char.id) === String(c.id)).length, 0); if (n) L.push(`${X.name(c)} 在 ${meName()} 的帖子底下评论了 ${n} 次`); }); } catch (e) {}
        if (srcOn('myday')) try { (window.gyMyDayAll ? window.gyMyDayAll() : []).filter(i => i.who === 'all').slice(-2).forEach(i => L.push(`${meName()} 公开过的行程：${[i.date, i.time, i.place, i.text].filter(Boolean).join(' ')}`)); } catch (e) {}
    }
    if (!L.length && !D.cfg.want) L.push('没挖到什么具体的，只有"有人看到他们走得很近"这种传言');
    return shuf(L).slice(0, 6);
}
async function scoop(opt) {
    opt = opt || {}; const w = opt.who || pickWho(D.cfg.mode); if (!w) return null;
    const A = acct(), who = w.chars.map(c => `${X.name(c)}（${X.persona(c).slice(0, 80)}）`);
    if (w.me) who.unshift(`博主「${meName()}」（就是正在看这条帖子的她本人；只写公开能看到的东西）`);
    const material = dig(w).concat(opt.tip ? [`有人匿名递料：${opt.tip}`] : []);
    const want = String(D.cfg.want || '').trim(), req = want ? `看帖的她对这次爆料的要求（照着来，比上面的料优先）：${want}` : '';
    let pr = P('scoop.post', DEF_POST, { 账号: A.name, 账号人设: A.persona || '', 人物: who.join('\n'), 料: material.map(x => '· ' + x).join('\n') || '（没挖到具体的，按她的要求写）', 要求: req });
    if (req && !pr.includes(want)) pr += '\n' + req;   // 你改过提示词、删了 {{要求}} 也照样带上
    let text = X.bailu() ? null : await X.ask(pr);
    text = X.plain(text || '') ? String(text).trim() : `【独家】${w.me ? '某博主' : X.name(w.chars[0])}${w.chars.length > (w.me ? 0 : 1) ? '与' + w.chars.slice(w.me ? 0 : 1).map(X.name).join('、') : ''}近日被拍到频繁同框，知情人透露两人关系"不一般"……#疑似恋情曝光#`;
    if (typeof globalPosts === 'undefined') return null;
    const post = { id: 'p_sc' + Date.now().toString(36), char: JSON.parse(JSON.stringify(A)), text, timestamp: Date.now(), replies: [], mediaUrl: null, stats: { retweets: 500 + Math.floor(Math.random() * 9000), likes: 2000 + Math.floor(Math.random() * 50000), views: 50000 + Math.floor(Math.random() * 900000), comments: 0 }, isStory: false, location: '', likedBy: [], gyScoop: 1 };
    globalPosts.unshift(post);
    // 话题顺手收进趋势榜
    try { const tags = (text.match(/#[^#\s]{2,20}#?/g) || []).map(t => t.replace(/#$/, '')).slice(0, 2); tags.forEach(t => { if (typeof trendingTags !== 'undefined' && !trendingTags.includes(t)) { trendingTags.unshift(t); if (trendingTags.length > 20) trendingTags.pop(); } }); post.gyTags = tags; } catch (e) {}
    const rec = { id: 'sc' + Date.now().toString(36), postId: post.id, at: Date.now(), who: (w.me ? ['me'] : []).concat(w.chars.map(c => String(c.id))), text, tip: opt.tipBy || '' };
    D.list.unshift(rec); D.list = D.list.slice(0, 200); await save();
    try { saveAllData(); } catch (e) {} try { if (typeof renderPosts === 'function') renderPosts(); } catch (e) {} try { if (typeof renderTrends === 'function') renderTrends(); } catch (e) {}
    try { addNotification(w.me ? `📰 <b>${X.esc(A.name)}</b> 爆了<b>你</b>的料！` : `📰 <b>${X.esc(A.name)}</b> 发了新爆料`, post.id, null, A, text.slice(0, 120)); } catch (e) {}
    X.toast(w.me ? X.v('📰 你被爆料了！', '📰 你上新闻了……', '📰 营销号盯上你了') : X.v('📰 新瓜！', '📰 营销号又在搞事', '📰 爆料来了'), text.slice(0, 60));
    // 被爆的人来评论区回应；路人跟上
    for (const c of w.chars) {
        let t = X.bailu() ? null : await X.ask(`${X.who(c)}\n${P('scoop.react', DEF_REACT, { 爆料: text })}`);
        t = X.plain(t || ''); if (!t || /^NO\b/i.test(t)) continue;
        post.replies.push({ id: 'r_' + Date.now() + Math.floor(Math.random() * 100), parentId: null, char: c, text: t, timestamp: Date.now(), likes: Math.floor(Math.random() * 3000), liked: false, likedBy: [] }); post.stats.comments++;
    }
    try { if (typeof spawnNpcComments === 'function') spawnNpcComments(post.id, false, { triggerName: A.name, triggerText: text }); } catch (e) {}
    try { saveAllData(); if (typeof renderPosts === 'function') renderPosts(); } catch (e) {}
    return rec;
}
// 什么时候爆下一条：自定义＝每 N 小时；交给营销号＝3~10 小时随机，主页越热闹越勤
function planNext() {
    const now = Date.now();
    if (D.cfg.freq === 'custom') D.next = now + Math.max(1, +D.cfg.hours || 6) * 36e5;
    else { const busy = (typeof globalPosts !== 'undefined' ? globalPosts : []).filter(p => now - p.timestamp < 864e5).length; D.next = now + (busy > 15 ? X.rnd(2.5, 5) : busy > 5 ? X.rnd(4, 8) : X.rnd(6, 12)) * 36e5; }
    save();
}
setInterval(() => { try {
    if (!X.on('gyxScoop') || !X.on('gyxScoop.auto')) return;
    if (!D.next) return planNext();
    const h = new Date().getHours(); if (!D.cfg.night && h < 8) return;
    if (D.day !== X.day()) { D.day = X.day(); D.n = 0; }
    if (Date.now() < D.next || (D.cfg.freq === 'custom' && D.n >= (+D.cfg.max || 3))) return;
    D.n++; planNext(); scoop();
} catch (e) {} }, 5 * 60000);
window.gyxScoopNow = async (force, btn) => { if (btn) { btn.disabled = true; btn.textContent = '营销号正在疯狂编造… ⏳'; } const w = force ? pickWho(D.cfg.mode, force) : null; const r = await scoop(w ? { who: w } : {}); if (btn) { btn.disabled = false; btn.textContent = '现在爆一条'; } if (!r) X.toast('没爆成', '还没有角色，或者接口没接上'); window.gyxScoopOpen(); return r; };
window.gyxScoopCfg = (k, v) => { D.cfg[k] = v; if (k === 'freq' || k === 'hours') planNext(); save(); window.gyxScoopOpen(); };
window.gyxScoopSrc = (k, v) => { D.cfg.src[k] = !!v; save(); };
window.gyxScoopDel = async id => { D.list = D.list.filter(x => x.id !== id); await save(); window.gyxScoopOpen(); };
window.gyxScoopGo = postId => { try { switchMainView('postDetail', postId); } catch (e) {} document.getElementById('gyxScoopOv')?.remove(); };
window.gyxScoopData = () => D; window.gyxScoopDig = dig; window.gyxScoopPick = pickWho;
window.gyxScoopOpen = function () {
    const c = D.cfg, chip = (k, v, n) => `<span class="gyx-chip${String(c[k]) === String(v) ? ' on' : ''}" onclick="gyxScoopCfg('${k}','${v}')">${n}</span>`;
    X.panel('gyxScoopOv', '📰 营销号自己爆料', `<div class="gyx-tip">营销号「${X.esc(acct().name)}」会隔一阵自己去挖料、发在主页。料从下面勾的那几样里挖。<b>私聊内容默认不挖</b>，你勾上才会；勾上也只挖你和这次被爆的那个角色之间的。<b>你「谁都别知道」的日程永远挖不到。</b></div>
      <h4 class="sc-h">爆谁</h4><div class="gyx-row">${Object.keys(MODES).map(k => chip('mode', k, MODES[k])).join('')}</div><h4 class="sc-h">每次爆几个人</h4><div class="gyx-row">${chip('cnt', 'rand', '随机')}${chip('cnt', 'fix', '我来定')}${c.cnt === 'fix' ? ` <span class="gyx-tip">一共 <input class="gyx-who" type="number" min="1" max="8" value="${c.num}" style="width:50px" onchange="gyxScoopCfg('num',+this.value)"> 个人（爆到你时你也算一个）</span>` : ''}</div>
      <div class="gyx-tip">${c.cnt === 'fix' ? '角色不够这么多的时候，有几个爆几个。' : '随机：只爆角色时 1~3 个，爆到你时是你加 1~2 个角色。'}</div>
      <h4 class="sc-h">爆什么</h4><div class="gyx-row sc-src">${Object.keys(SRC).map(k => `<label><input type="checkbox" ${c.src[k] !== false ? 'checked' : ''} onchange="gyxScoopSrc('${k}',this.checked)"> ${SRC[k]}</label>`).join('')}</div>
      <textarea class="gyx-in" rows="2" placeholder="想让营销号爆什么方向？比如：多爆感情线、别碰工作、专挑修罗场……也可以直接写一条你编的料，营销号会拿去用" onchange="gyxScoopCfg('want',this.value.trim())">${X.esc(c.want || '')}</textarea>
      <div class="gyx-tip">勾掉的那几样营销号就不去挖了。「私聊内容」勾上以后，只有爆到你的时候才会用（营销号会写成「知情人透露」）。爆料帖的整段提示词可以在「设置 → 内置提示词 → 📰 营销号自动爆料」里改。</div>
      <h4 class="sc-h">多久爆一次</h4><div class="gyx-row">${chip('freq', 'auto', '让营销号自己决定')}${chip('freq', 'custom', '我来定')}</div>
      ${c.freq === 'custom' ? `<div class="gyx-row gyx-tip">每 <input class="gyx-who" type="number" min="1" value="${c.hours}" style="width:56px" onchange="gyxScoopCfg('hours',+this.value)"> 小时一条，一天最多 <input class="gyx-who" type="number" min="1" value="${c.max}" style="width:50px" onchange="gyxScoopCfg('max',+this.value)"> 条</div>` : `<div class="gyx-tip">主页越热闹营销号越勤快（大概 3~12 小时一条）。</div>`}
      <div class="gyx-row gyx-tip"><label><input type="checkbox" ${c.night ? 'checked' : ''} onchange="gyxScoopCfg('night',this.checked)"> 半夜也爆（默认 0~8 点不发）</label>${D.next ? ' · 下一条大概 ' + new Date(D.next).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
      <div class="gyx-row"><button class="gyx-btn" onclick="gyxScoopNow(null,this)">现在爆一条</button></div>
      <h4 class="sc-h">爆过的（${D.list.length}）</h4>${D.list.slice(0, 30).map(x => `<div class="sc-r" onclick="gyxScoopGo('${x.postId}')"><b>${x.who.map(id => id === 'me' ? '你' : X.esc(X.name(X.char(id)))).join(' × ')}</b>${x.tip ? `<em>有人递料</em>` : ''}<span>${X.esc(x.text.slice(0, 70))}…</span><i onclick="event.stopPropagation();gyxScoopDel('${x.id}')">删</i></div>`).join('') || '<div class="gyx-tip">还没爆过。</div>'}`);
};
X.ctx(id => { const x = D.list.find(r => Date.now() - r.at < 864e5 && (r.who.includes(String(id)) || r.tip === String(id))); if (!x) return ''; if (x.tip === String(id) && !x.who.includes(String(id))) return `【你干的好事】你偷偷给营销号递了料，营销号据此爆了：「${x.text.slice(0, 80)}」。别说是你递的。`; return `【营销号刚在主页爆了你的料】「${x.text.slice(0, 100)}」${x.who.includes('me') ? '——爆的是你和她。' : ''}这事全网都在吃瓜，你可以自然提起、吐槽或解释。`; }, 'gyxScoop');
X.inj('gyxScoop', [['营销号刚在主页爆了你的料', '营销号刚爆了 TA 的料', '一天之内被爆过的角色会带着这件事聊天，可以吐槽或解释。'], ['你干的好事', 'TA 偷偷给营销号递过料', '只有递料的那个角色知道，提醒 TA 别说漏。']]);
X.action({ key: 'gyx_scoop_tip', label: '偷偷给营销号递料，爆一下别人', hint: '营销号自己爆料', need: c => X.chars().length >= 2 && !D.list.some(x => x.tip === String(c.id) && Date.now() - x.at < 3 * 864e5),
    run: async c => {
        const others = X.chars().filter(x => String(x.id) !== String(c.id)); if (!others.length) return null;
        const mode = D.cfg.mode, meToo = mode !== 'char' && Math.random() < (mode === 'user' ? 1 : .3);
        const target = { me: meToo, chars: shuf(others).slice(0, meToo ? 1 : 1 + Math.floor(Math.random() * Math.min(2, others.length))) };
        let tip = X.bailu() ? null : await X.ask(`${X.who(c)}\n${P('scoop.tip', DEF_TIP, { 对象: (meToo ? ['她（' + meName() + '）'] : []).concat(target.chars.map(X.name)).join('、') })}`);
        tip = X.plain(tip || '') || '他们俩最近走得很近';
        const r = await scoop({ who: target, tip, tipBy: String(c.id) }); return r ? '偷偷给营销号递了料' : null;
    } }, 'gyxScoop');
X.today(() => ({ title: '📰 营销号', rows: D.list.filter(x => X.day(new Date(x.at)) === X.day()).slice(0, 4).map(x => ({ t: x.who.includes('me') ? '爆了你' : '新瓜', x: X.esc(x.text.slice(0, 26)), go: `gyxScoopGo('${x.postId}')` })) }), 'gyxScoop');
X.widget('gyxScoopW', { n: '营销号爆料', sizes: ['s', 'm'], tap: () => window.gyxScoopOpen(), r: w => { const x = D.list[0]; return X.gw(w, '📰', '营销号', x ? [x.who.map(id => id === 'me' ? '你' : X.esc(X.name(X.char(id)))).join('×'), X.esc(x.text.slice(0, 16))] : ['还没爆过']); } }, 'gyxScoop');
X.memArr({ k: 'gyxScoop', ico: '📰', n: '营销号爆过的料', d: '营销号爆过谁、爆了什么（被爆的角色会记得；删了就当没发生过）', arr: () => D.list, cid: x => (x.who.find(id => id !== 'me') || x.tip || ''), field: 'text', text: x => x.text, meta: x => new Date(x.at).toLocaleString() + (x.who.includes('me') ? ' · 爆了你' : ''), save }, 'gyxScoop');
// 「营销号」那一页也放个入口：现在它会自己在主页爆料了
setInterval(() => { try { const f = document.getElementById('tabloidFeedSection'); if (!f || document.getElementById('gyxScoopBar') || !X.on('gyxScoop')) return; const b = document.createElement('div'); b.id = 'gyxScoopBar'; b.style.cssText = 'margin:10px 0;padding:10px 12px;border-radius:12px;background:rgba(249,24,128,.08);font-size:13px;display:flex;align-items:center;gap:8px;flex-wrap:wrap'; b.innerHTML = '📰 营销号现在会<b>自己在主页爆料</b>（爆谁、多久一次你来定）<button type="button" class="btn-edit-small" style="margin-left:auto" onclick="gyxScoopOpen()">设置 / 现在爆一条</button>'; f.parentNode.insertBefore(b, f); } catch (e) {} }, 2000);
X.css('gyxScoopCss', `.sc-h{font-size:14px;margin:14px 0 4px}.sc-r{position:relative;padding:9px 30px 9px 0;border-bottom:1px solid #f2f2f4;cursor:pointer;font-size:13.5px}.sc-r b{margin-right:6px}.sc-r em{font-style:normal;font-size:11px;background:#fff0f4;color:#f91880;border-radius:6px;padding:0 5px;margin-right:6px}.sc-r span{display:block;color:#666;margin-top:2px}.sc-r i{position:absolute;right:0;top:10px;font-style:normal;font-size:11px;color:#aaa}.sc-src{flex-wrap:wrap;gap:4px 12px;font-size:13.5px}.sc-src label{display:flex;align-items:center;gap:4px}`);
X.mini({ id: 'gyxScoop', icon: '📰', title: '营销号自己爆料', desc: '营销号隔一阵自己在主页爆料', cat: '生活', onOpen: () => window.gyxScoopOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.list = D.list || []; D.cfg = Object.assign({ mode: 'all', cnt: 'rand', num: 2, freq: 'auto', hours: 6, max: 3, night: false, src: {}, want: '' }, D.cfg || {}); D.cfg.src = D.cfg.src || {}; })();
