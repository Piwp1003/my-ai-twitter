/* 📕 小红书：整页的真小红书——首页（关注 / 发现 / 附近，发现下面分频道，双列瀑布流）、笔记页（多图左右滑、#话题#、地点、编辑于、
   评论楼中楼、作者回复）、发笔记（多图、标题、正文、话题、@、地点、谁能看）、收藏夹分专辑、搜索（热搜词 + 搜什么刷什么）、
   消息（赞和收藏 / 新增关注 / 评论和@ / 私信）、主页（小红书号、IP、签名、标签、获赞与收藏，笔记 / 收藏 / 赞过）。
   TA 发笔记、来评论你、偷偷收藏（附 TA 心里想的）、用小号发求问帖；现实小红书（一键去真的搜 / 粘真笔记进来）；TA 手机里的笔记也在这。
   以前「主页和社交」里的老小红书的数据会自动搬过来。 */
if (window.__gysRed) return; window.__gysRed = 1;
const G = window.GYS, APP = 'red', esc = G.esc;
X.feat('gysRed', { n: '📕 小红书', desc: '刷笔记、发笔记、收藏夹、搜索、私信；TA 发笔记、偷偷收藏、用小号发求问帖' });
const ST = X.store('gysred');
let D = { notes: [], boards: [], xacc: {}, follow: null, acts: [], dms: {}, hot: { list: [], at: 0 }, search: {}, hist: [], last: {}, lives: [], cfg: { keep: 500, feedN: 6 }, migrated: 0, phoneSeen: {} };
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();
const BUSY = {};
const R = window.gysRd = {};
const CH = ['推荐', '穿搭', '美食', '彩妆', '情感', '旅行', '家居', '学习', '职场', '影视', '萌宠', '健身', '摄影', '游戏'];
const PROV = ['北京', '上海', '广东', '浙江', '江苏', '四川', '湖北', '湖南', '山东', '福建', '重庆', '天津', '陕西', '河南', '云南'];
const PASSER = ['是小番茄呀', '今天吃什么鸭', '一只快乐的薯', '奶油草莓', 'momo', '芝芝桃桃', '不想上班的猫', '早睡失败选手', '橘子味的风', '小鹿乱撞', '甜度超标', '晚风与你', '路过的小红薯', '用户' + G.rnd(1000, 9999)];
const EMO = ['🍰', '🌷', '📷', '☕', '🧸', '🌙', '🍜', '👗', '💄', '✈️', '🏠', '📚', '🐱', '🎧', '🌊', '🍓'];

/* ---------------- 人 ---------------- */
const nameOf = w => G.nick(APP, w);
const isX = w => String(w).startsWith('x:');
const cast = () => G.people().filter(w => w !== 'me');
const charOfW = w => G.charOf(w);
function passer(name, emo) {
    name = X.plain(name || G.pick(PASSER)).slice(0, 16) || G.pick(PASSER);
    const w = 'x:p_' + name;
    if (!D.xacc[w]) { D.xacc[w] = { kind: 'passer', name }; G.prof(APP, w, { nick: name, emoji: emo || G.pick(['🐱', '🐰', '🌸', '🍀', '🌙', '⭐', '🍑', '🦊', '🐻', '🌈']), followers: G.rnd(5, 3000), following: G.rnd(10, 300), loc: G.pick(PROV), gen: true }); }
    return w;
}
function whoByName(n) {
    n = String(n || '').trim().replace(/^@/, ''); if (!n) return null;
    if (n === G.meName() || n === nameOf('me')) return 'me';
    const all = G.people().concat(Object.keys(D.xacc));
    return all.find(w => nameOf(w) === n) || all.find(w => { const b = G.base(w); return b && b.name === n; }) || null;
}
const following = () => (D.follow = D.follow || cast().filter(w => w.startsWith('c:')));
const isFollow = w => following().includes(w);
const altOwner = w => (D.xacc[w] && D.xacc[w].owner) || '';
function ipOf(w) { const p = G.prof(APP, w); if (!p.loc) { p.loc = G.pick(PROV); G.save(); } return p.loc; }
function redId(w) { const p = G.prof(APP, w); if (!p.rid) { p.rid = String(G.rnd(10000000, 99999999)) + (G.rnd(0, 9)); G.save(); } return p.handle || p.rid; }
const myTags = w => { const p = G.prof(APP, w); return (p.tagstr ? p.tagstr.split(/[\s,，、]+/) : p.tags || []).filter(Boolean).slice(0, 6); };

/* ---------------- 笔记 ---------------- */
const noteOf = id => D.notes.find(n => n.id === id);
function mkNote(o) {
    const n = Object.assign({ id: G.uid('rn'), by: 'me', title: '', body: '', tags: [], imgs: [], pics: [], emo: G.pick(EMO), loc: '', at: Date.now(), likes: [], likeN: 0, favs: [], favN: 0, cmts: [], cmtN: 0, ch: '推荐', favBy: {}, vis: 'public', ip: '', edited: 0 }, o);
    n.ip = n.ip || ipOf(n.by);
    n.tags = Array.from(new Set((n.tags || []).map(t => X.plain(t).replace(/^#/, '').slice(0, 14)).filter(Boolean).concat((n.body.match(/#([^#\s]{1,14})/g) || []).map(x => x.slice(1))))).slice(0, 8);
    D.notes.unshift(n); trim(); saveD(); return n;
}
function trim() { const k = Math.max(100, Number(D.cfg.keep) || 500); if (D.notes.length > k) { const keep = D.notes.filter(n => n.by === 'me' || n.favs.includes('me') || Object.keys(n.favBy || {}).length); D.notes = D.notes.filter(n => !keep.includes(n)).slice(0, Math.max(0, k - keep.length)).concat(keep).sort((a, b) => b.at - a.at); } }
const liked = n => n.likes.includes('me');
const faved = n => n.favs.includes('me');
const likeAll = n => (n.likeN || 0) + n.likes.length;
const favAll = n => (n.favN || 0) + n.favs.length;
const countC = arr => arr.reduce((k, c) => k + 1 + countC(c.kids || []), 0);
const cmtAll = n => (n.cmtN || 0) + countC(n.cmts || []);
const flat = arr => arr.reduce((a, c) => a.concat([c], flat(c.kids || [])), []);
const picBg = t => { let h = 0; for (const ch of String(t)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `linear-gradient(160deg,hsl(${h},70%,86%),hsl(${(h + 40) % 360},60%,74%))`; };
const ratio = n => { let h = 0; for (const ch of String(n.id)) h = (h * 7 + ch.charCodeAt(0)) % 3; return ['3/4', '4/5', '1/1'][h]; };
function cover(n, big) {
    const src = (n.imgs || [])[0];
    if (src) return `<div class="rd-cv" style="aspect-ratio:${big ? '3/4' : ratio(n)};background-image:url('${src}')"></div>`;
    const t = (n.pics || [])[0] || n.title;
    return `<div class="rd-cv t" style="aspect-ratio:${big ? '3/4' : ratio(n)};background:${n.cover && n.cover.bg ? n.cover.bg : picBg(t)}"><b>${esc(n.emo || (n.cover && n.cover.emo) || '📕')}</b><em>${esc(String(t).slice(0, 18))}</em></div>`;
}
function richText(t) {
    return esc(t).replace(/#([^#\s<]{1,14})/g, (m, k) => `<a class="rd-tg" onclick="event.stopPropagation();gysRd.search('${esc(k).replace(/'/g, '')}')">#${k}</a>`)
        .replace(/@([一-龥\w-]{1,20})/g, (m, k) => `<a class="rd-tg" onclick="event.stopPropagation();gysRd.atName('${k}')">@${k}</a>`);
}
const card = n => `<div class="rd-card" onclick="gysRd.open('${n.id}')">${cover(n)}${n.from === 'phone' ? '<i class="rd-flag">📱 TA 手机里的</i>' : n.by === 'x:real' ? '<i class="rd-flag">📎 真小红书</i>' : n.vis === 'self' ? '<i class="rd-flag">🔒 仅自己可见</i>' : ''}<div class="rd-ct">${esc(n.title || n.body.slice(0, 20))}</div><div class="rd-cb">${G.av(APP, n.by, 18)}<span>${esc(nameOf(n.by))}</span><i class="${liked(n) ? 'on' : ''}" onclick="event.stopPropagation();gysRd.like('${n.id}')">${liked(n) ? '❤️' : '🤍'} ${likeAll(n) ? G.fmtN(likeAll(n)) : ''}</i></div></div>`;
const grid = L => L.length ? `<div class="rd-grid">${L.map(card).join('')}</div>` : '';
function act(k, by, nid, text) { if (by === 'me') return; D.acts.unshift({ k, by, nid, text: String(text || '').slice(0, 80), at: Date.now(), seen: 0 }); if (D.acts.length > 300) D.acts.length = 300; saveD(); }
const unread = () => D.acts.filter(a => !a.seen).length + Object.values(D.dms).reduce((k, t) => k + (t.unread || 0), 0);
async function chooser(opts, title) {
    return new Promise(res => {
        const d = document.createElement('div'); d.className = 'rd-sheet';
        d.innerHTML = `<div class="rd-sheet-in">${title ? `<p>${esc(title)}</p>` : ''}${opts.map((o, i) => `<div data-i="${i}">${esc(o)}</div>`).join('')}<div data-i="-1" class="c">取消</div></div>`;
        d.onclick = e => { const i = e.target.getAttribute('data-i'); if (i == null && e.target !== d) return; d.remove(); res(i == null || i === '-1' ? null : Number(i)); };
        document.body.appendChild(d);
    });
}

/* ---------------- 模型 ---------------- */
const P = (id, def, vars) => X.pl(id, def, vars);
const world = () => { try { const wb = (typeof worldbooks !== 'undefined' ? worldbooks : []).slice(0, 2).map(w => (w.name || w.title || '')).filter(Boolean).join('、'); return (wb ? '世界书：' + wb + '；' : '') + '主要人物：' + G.chars().slice(0, 4).map(c => X.name(c) + '（' + X.persona(c).slice(0, 30) + '）').join('、'); } catch (e) { return '现代都市'; } };
function castLines(ws) { return ws.map(w => { const b = G.base(w), p = G.prof(APP, w); return `· ${p.nick}${b && b.name !== p.nick ? '（本名' + b.name + '）' : ''}：${b ? String(b.persona).slice(0, 110) : '路人'}${p.bio ? '｜签名：' + p.bio.slice(0, 30) : ''}`; }).join('\n'); }
const DEF_FEED = `你在模拟一个真实的「小红书」App。这个世界的背景：{{世界}}
现在刷的是「{{频道}}」{{附近}}。下面这些人也在用小红书（有时会刷到他们的笔记）：
{{人}}
刷出 {{条数}} 篇不同的笔记，大多是这个世界里的普通人发的（起像小红书用户的昵称），偶尔是上面的人发的。类型混着来：攻略 / 种草 / 日常 / 情感求问 / 吐槽 / 探店 / 好物 / 教程。
标题要有小红书味（emoji、「姐妹们」「救命」「谁懂啊」「绝绝子」这种口吻），20 字内；正文 60~160 字，分段、带 emoji；2~4 个标签；配图用文字描述 1~4 张。每篇带 2~4 条评论。
只输出 JSON 数组：[{"by":"作者名字","emo":"一个代表这篇的 emoji","title":"标题","body":"正文","tags":["标签"],"pics":["图片描述"],"loc":"地点（没有就空）","likes":数字,"favs":数字,"cmts":[{"by":"名字","text":"评论"}]}]`;
const DEF_CMT = `小红书上有一篇笔记：
作者：{{作者}}
标题：{{标题}}
正文：{{正文}}
{{已有}}
下面这些人可能会来评论：
{{人}}
{{熟人}}
写 {{条数}} 条评论，像真的小红书评论（短、口语、可以玩梗、问链接、「蹲」「马住」「已三刷」）。认识作者的人可以认出来、调侃一句；路人就按路人的口气。作者可能会回复其中一两条（by 写作者，replyTo 写被回的人）。
只输出 JSON 数组：[{"by":"名字（路人写网名）","text":"评论","likes":数字,"replyTo":"回复谁（没有就空）"}]`;
const DEF_TA = `{{我是谁}}
你最近：
{{最近}}
你要在小红书上发一篇笔记。按你的身份、性格和最近的生活来写（日常、攻略、种草、碎碎念都行，可以偷偷写一点跟她有关的但不点名）。{{要求}}
标题有小红书味，20 字内；正文 60~160 字；2~4 个标签；配图用文字描述 1~4 张。
只输出 JSON：{"emo":"一个 emoji","title":"标题","body":"正文","tags":["标签"],"pics":["图片描述"],"loc":"地点（没有就空）"}`;
const DEF_FAV = `{{我是谁}}
你在刷小红书，下面是刷到的几篇笔记：
{{笔记}}
挑一篇你会偷偷收藏的（多半是因为想到了她：约会攻略、她可能喜欢的东西、想学来哄她的……），也可以都不收。
只输出 JSON：{"i":序号（从 0 开始，不收就写 -1）,"why":"你收藏时心里想的，20字内，她看不到"}`;
const DEF_HOT = `这是「小红书」的搜索页「猜你想搜」和热搜。这个世界的背景：{{世界}}
写 {{条数}} 个现在大家在搜的词（季节、节日、穿搭、美食、情感、热门话题，混一点跟上面人物有关的）。只输出 JSON 数组：["词1","词2"]`;
const DEF_SEARCH = `在「小红书」里搜「{{词}}」。这个世界的背景：{{世界}}
刷出 {{条数}} 篇跟这个词有关的笔记（不同的人写的、角度不同：攻略、测评、避雷、分享、求问）。
只输出 JSON 数组：[{"by":"作者昵称","emo":"emoji","title":"标题","body":"正文","tags":["标签"],"pics":["图片描述"],"loc":"","likes":数字,"favs":数字}]`;
const DEF_DM = `{{我是谁}}
你们在小红书私信里聊天（不是平时的聊天软件）。最近的私信：
{{记录}}
接着回 1~3 句，只写你说的话，每句一行。`;
X.plGroup('📕 小红书', 'gysRed', [
    ['red.feed', '刷首页（发现 / 附近 / 频道）', '点「刷新」/ 切频道时', '{{世界}} {{频道}} {{附近}} {{人}} {{条数}}'],
    ['red.cmt', '一篇笔记的评论区', '打开笔记 / 你发了笔记时', '{{作者}} {{标题}} {{正文}} {{已有}} {{人}} {{熟人}} {{条数}}'],
    ['red.ta', 'TA 发一篇笔记', 'TA 自己发 / 用小号发求问帖', '{{我是谁}} {{最近}} {{要求}}'],
    ['red.fav', 'TA 偷偷收藏一篇', 'TA 刷小红书时', '{{我是谁}} {{笔记}}'],
    ['red.hot', '搜索页的热搜词', '打开搜索时', '{{世界}} {{条数}}'],
    ['red.search', '搜什么刷出什么', '你搜一个词时', '{{词}} {{世界}} {{条数}}'],
    ['red.dm', '小红书私信里回你', '你私信 TA / NPC 时', '{{我是谁}} {{记录}}']
], { 'red.feed': DEF_FEED, 'red.cmt': DEF_CMT, 'red.ta': DEF_TA, 'red.fav': DEF_FAV, 'red.hot': DEF_HOT, 'red.search': DEF_SEARCH, 'red.dm': DEF_DM });
function whoAmI(w) { const c = charOfW(w); if (c) return X.who(c); const b = G.base(w) || {}; return `你是${b.name || nameOf(w)}。${b.persona || ''}`; }
function fromJson(x, extra) {
    if (!x || (!x.title && !x.body)) return null;
    let w = whoByName(x.by); if (!w || w === 'me') w = passer(x.by, x.emo);
    const n = mkNote(Object.assign({ by: w, emo: X.plain(x.emo || '').slice(0, 4) || G.pick(EMO), title: X.plain(x.title || '').slice(0, 30), body: X.plain(x.body || '').slice(0, 800), tags: Array.isArray(x.tags) ? x.tags : [], pics: (x.pics || []).filter(Boolean).slice(0, 6).map(t => X.plain(t).slice(0, 16)), loc: X.plain(x.loc || '').slice(0, 16), likeN: Math.max(0, Number(x.likes) || G.rnd(3, 3000)), favN: Math.max(0, Number(x.favs) || G.rnd(0, 800)), at: Date.now() - G.rnd(5, 3000) * 60e3 }, extra || {}));
    addCmts(n, x.cmts);
    return n;
}
function addCmts(n, arr) {
    const out = [];
    (Array.isArray(arr) ? arr : []).forEach(x => {
        if (!x || !x.text) return;
        let w = whoByName(x.by); if (!w) w = passer(x.by);
        const c = { id: G.uid('c'), by: w, text: X.plain(x.text).slice(0, 200), at: Date.now() - G.rnd(0, 600) * 60e3, likeN: Math.max(0, Number(x.likes) || G.rnd(0, 60)), likes: [], kids: [] };
        const to = x.replyTo ? flat(n.cmts).find(k => nameOf(k.by) === x.replyTo || (G.base(k.by) || {}).name === x.replyTo) : null;
        if (to) { c.toWho = to.by; const top = n.cmts.find(t => t === to || flat(t.kids).includes(to)) || to; top.kids.push(c); } else n.cmts.push(c);
        out.push(c);
        if (n.by === 'me' && w !== 'me') act(to && to.by === 'me' ? 'at' : 'cmt', w, n.id, c.text);
        if (n.by === 'me' && w !== 'me' && Math.random() < 0.5 && !n.likes.includes(w)) { n.likes.push(w); act(Math.random() < 0.3 ? 'fav' : 'like', w, n.id, n.title); }
    });
    return out;
}
async function genFeed(ch, near) {
    const k = 'f' + ch + (near ? 'n' : ''); if (BUSY[k]) return; BUSY[k] = 1; G.repaint(APP);
    try {
        const pool = cast().sort(() => Math.random() - 0.5).slice(0, 8);
        await G.genProfiles(APP, pool, STYLE);
        const o = X.json(await X.ask(P('red.feed', DEF_FEED, { 世界: world(), 频道: ch, 附近: near ? `（附近：都在${ipOf('me')}，写本地的店、本地的事）` : '', 人: castLines(pool), 条数: D.cfg.feedN || 6 })));
        if (!Array.isArray(o)) { X.toast('📕 没刷出来', X.v('再下拉一次试试', '模型这次没写好')); return; }
        o.forEach(x => { const n = fromJson(x, { ch: near ? '附近' : ch }); if (n && near) n.ip = ipOf('me'); });
        D.last['feed' + k] = Date.now(); saveD();
    } finally { BUSY[k] = 0; G.repaint(APP); }
}
async function genCmts(n, cnt, opt) {
    if (BUSY['c' + n.id]) return; BUSY['c' + n.id] = 1; G.repaint(APP);
    try {
        const owner = n.by === 'me' || altOwner(n.by) === 'me' ? 'me' : n.by.startsWith('c:') ? n.by.slice(2) : 'me';
        const pool = cast().filter(w => w !== n.by).sort(() => Math.random() - 0.5).slice(0, 6);
        const hint = typeof window.gyNpcCommentHint === 'function' ? window.gyNpcCommentHint(owner, cnt || 5, 'xhs') : '';
        const exist = countC(n.cmts) ? '已经有的评论：\n' + flat(n.cmts).slice(-8).map(c => `${nameOf(c.by)}：${c.text}`).join('\n') : '';
        const au = nameOf(n.by) + (n.by === 'me' ? '（就是用户本人，认识她的人可能认得出来）' : isX(n.by) && altOwner(n.by) === 'me' ? '（其实是用户的小号，大家不知道）' : '');
        const o = X.json(await X.ask(P('red.cmt', DEF_CMT, { 作者: au, 标题: n.title, 正文: n.body.slice(0, 400), 已有: exist, 人: castLines(pool), 熟人: hint, 条数: cnt || 5 })));
        if (Array.isArray(o)) { addCmts(n, o); n.cmtGen = Date.now(); saveD(); }
    } finally { BUSY['c' + n.id] = 0; G.repaint(APP); }
}

/* ---------------- 首页 ---------------- */
let TOP = 'find', CHN = '推荐';
function head(tab) {
    if (tab === 'home') return `<div class="gys-hd rd-hd"><span class="gys-bk" onclick="GYS.close('${APP}')">${G.ic('back', 22)}</span><div class="rd-top">${[['follow', '关注'], ['find', '发现'], ['near', '附近']].map(([k, n]) => `<span class="${TOP === k ? 'on' : ''}" onclick="gysRd.top('${k}')">${n}</span>`).join('')}</div><span class="gys-hr"><span onclick="gysRd.searchPage()">${G.ic('search', 22)}</span></span></div>`;
    const t = { post: '发布笔记', msg: '消息', me: '' }[tab];
    return `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('${APP}')">${G.ic('back', 22)}</span><b>${t}</b><span class="gys-hr">${tab === 'me' ? '<span onclick="gysRd.menu()">' + G.ic('more', 24) + '</span>' : ''}</span></div>`;
}
R.top = k => { TOP = k; G.repaint(APP); const b = document.querySelector('#gys_red .gys-body'); if (b) b.scrollTop = 0; if (k === 'near' && !D.notes.some(n => n.ch === '附近')) genFeed('推荐', true); };
R.ch = k => { CHN = k; G.repaint(APP); if (!D.notes.some(n => n.ch === k) && k !== '推荐') genFeed(k); };
R.refresh = () => TOP === 'near' ? genFeed('推荐', true) : genFeed(CHN);
const visible = n => n.vis !== 'self' || n.by === 'me';
function home() {
    let L, bar = '';
    if (TOP === 'follow') L = D.notes.filter(n => visible(n) && (isFollow(n.by) || n.by === 'me'));
    else if (TOP === 'near') L = D.notes.filter(n => visible(n) && (n.ch === '附近' || n.ip === ipOf('me')) && n.by !== 'me');
    else { bar = `<div class="rd-chs">${CH.map(c => `<span class="${CHN === c ? 'on' : ''}" onclick="gysRd.ch('${c}')">${c}</span>`).join('')}</div>`; L = D.notes.filter(n => visible(n) && n.by !== 'me' && (CHN === '推荐' || n.ch === CHN || (n.tags || []).some(t => t.indexOf(CHN) >= 0))); }
    const busy = BUSY['f' + CHN] || BUSY['f推荐n'];
    return `${bar}${TOP === 'find' ? liveTop() : ''}${TOP === 'near' ? `<div class="rd-near">📍 ${esc(ipOf('me'))} · 附近的笔记</div>` : ''}<div class="rd-pull" onclick="gysRd.refresh()">${busy ? '⏳ 正在刷新…' : '↻ 点这里刷新'}</div>${grid(L) || `<div class="gys-empty">${TOP === 'follow' ? '关注的人还没发笔记<br>去发现页逛逛吧' : busy ? '' : '还没有笔记，点上面刷新一下'}</div>`}`;
}

/* ---------------- 笔记页 ---------------- */
let REPLY = null;
R.open = id => {
    const n = noteOf(id); if (!n) return X.toast('这篇笔记不见了', '');
    REPLY = null;
    if (!n.cmtGen && !countC(n.cmts) && n.vis !== 'self') genCmts(n, 5);
    G.push(APP, { id: 'note_' + id, title: '', cls: 'rd-nb', right: `<span onclick="gysRd.share('${id}')">↗</span><span onclick="gysRd.noteMenu('${id}')">⋯</span>`, html: () => noteHtml(id), foot: () => noteFoot(id), after: r => { const h = r.querySelector('.gys-hd'); if (h && !h.querySelector('.rd-au')) { const b = h.querySelector('b'); if (b) b.outerHTML = `<div class="rd-au" onclick="gysRd.prof('${n.by}')">${G.av(APP, n.by, 30)}<span>${esc(nameOf(n.by))}</span></div>${n.by !== 'me' ? `<span class="rd-fbtn${isFollow(n.by) ? ' on' : ''}" onclick="gysRd.follow('${n.by}')">${isFollow(n.by) ? '已关注' : '关注'}</span>` : ''}`; } } });
};
function noteHtml(id) {
    const n = noteOf(id); if (!n) return '<div class="gys-empty">笔记没了</div>';
    const imgs = (n.imgs || []).map(s => `<div class="rd-sl" style="background-image:url('${s}')" onclick="GYS.imgView('${s}')"></div>`), pics = (n.pics || []).map(t => `<div class="rd-sl t" style="background:${picBg(t)}"><b>${esc(n.emo || '📕')}</b><em>${esc(t)}</em></div>`);
    const sl = imgs.concat(pics); if (!sl.length) sl.push(`<div class="rd-sl t" style="background:${n.cover && n.cover.bg ? n.cover.bg : picBg(n.title)}"><b>${esc(n.emo || (n.cover && n.cover.emo) || '📕')}</b><em>${esc(n.title)}</em></div>`);
    const favBy = Object.keys(n.favBy || {}).filter(id => X.char(id));
    const cs = (n.cmts || []).slice().sort((a, b) => (b.likeN + b.likes.length) - (a.likeN + a.likes.length));
    return `<div class="rd-note">
      <div class="rd-slides" onscroll="const d=this.nextElementSibling;if(d){const i=Math.round(this.scrollLeft/this.clientWidth);[...d.children].forEach((x,j)=>x.classList.toggle('on',i===j))}">${sl.join('')}</div>${sl.length > 1 ? `<div class="rd-dots">${sl.map((x, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}
      <div class="rd-nt">${esc(n.title)}</div>
      <div class="rd-nx">${richText(n.body)}</div>
      ${n.tags.filter(t => n.body.indexOf('#' + t) < 0).length ? `<div class="rd-tags">${n.tags.filter(t => n.body.indexOf('#' + t) < 0).map(t => `<a class="rd-tg" onclick="gysRd.search('${esc(t).replace(/'/g, '')}')">#${esc(t)}</a>`).join(' ')}</div>` : ''}
      ${n.url ? `<div class="rd-meta"><a href="${esc(n.url)}" target="_blank" rel="noopener">🔗 真小红书原帖</a></div>` : ''}
      <div class="rd-meta">${n.edited ? '编辑于 ' : ''}${G.ago(n.edited || n.at)} · ${esc(n.ip)}${n.loc ? ` · 📍 ${esc(n.loc)}` : ''}${n.from === 'phone' ? ' · 📱 来自 TA 的手机' : ''}${n.vis === 'self' ? ' · 🔒 仅自己可见' : ''}</div>
      ${favBy.map(id => `<div class="rd-favby">⭐ ${esc(X.name(X.char(id)))} 偷偷收藏了这篇<em>（TA 心里想：${esc(n.favBy[id])}）</em></div>`).join('')}
      <div class="rd-ch">共 ${cmtAll(n)} 条评论</div>
      ${BUSY['c' + n.id] ? '<div class="gys-busy">⏳ 评论加载中…</div>' : ''}
      ${cs.map(c => cmtHtml(n, c)).join('') || (BUSY['c' + n.id] ? '' : '<div class="gys-empty">还没有评论，来抢沙发吧</div>')}
      ${n.vis !== 'self' ? `<div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysRd.moreCmts('${n.id}')">展开更多评论</span></div>` : ''}
    </div>`;
}
function cmtHtml(n, c, kid) {
    const au = c.by === n.by ? '<i class="rd-au-t">作者</i>' : '';
    return `<div class="rd-cm${kid ? ' kid' : ''}">${G.av(APP, c.by, kid ? 24 : 32)}<div class="rd-cmb"><div class="rd-cn" onclick="gysRd.prof('${c.by}')">${esc(nameOf(c.by))}${au}</div>
      <div class="rd-cx" onclick="gysRd.replyTo('${n.id}','${c.id}')">${c.toWho && kid ? `回复 <b>${esc(nameOf(c.toWho))}</b>：` : ''}${richText(c.text)}</div>
      <div class="rd-cmeta">${G.ago(c.at)} ${esc(ipOf(c.by))} <a onclick="gysRd.replyTo('${n.id}','${c.id}')">回复</a><i class="${c.likes.includes('me') ? 'on' : ''}" onclick="gysRd.cLike('${n.id}','${c.id}')">${c.likes.includes('me') ? '❤️' : '🤍'} ${c.likeN + c.likes.length || ''}</i></div>
      ${(c.kids || []).length ? `<div class="rd-kids">${c.kids.map(k => cmtHtml(n, k, 1)).join('')}</div>` : ''}</div></div>`;
}
function noteFoot(id) {
    const n = noteOf(id); if (!n) return '';
    return `<div class="rd-bar"><input id="rdCmt" placeholder="${REPLY ? '回复 ' + esc(nameOf(REPLY.by)) : '说点什么…'}" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysRd.sendCmt('${id}')"><span class="${liked(n) ? 'on' : ''}" onclick="gysRd.like('${id}')">${liked(n) ? '❤️' : '🤍'}<em>${G.fmtN(likeAll(n))}</em></span><span class="${faved(n) ? 'on' : ''}" onclick="gysRd.fav('${id}')">${faved(n) ? '⭐' : '☆'}<em>${G.fmtN(favAll(n))}</em></span><span onclick="document.getElementById('rdCmt').focus()">💬<em>${G.fmtN(cmtAll(n))}</em></span></div>`;
}
R.like = id => { const n = noteOf(id); if (!n) return; const i = n.likes.indexOf('me'); if (i >= 0) n.likes.splice(i, 1); else n.likes.push('me'); saveD(); G.repaint(APP); };
R.cLike = (id, cid) => { const n = noteOf(id), c = n && flat(n.cmts).find(x => x.id === cid); if (!c) return; const i = c.likes.indexOf('me'); if (i >= 0) c.likes.splice(i, 1); else c.likes.push('me'); saveD(); G.repaint(APP); };
R.replyTo = (id, cid) => { const n = noteOf(id), c = n && flat(n.cmts).find(x => x.id === cid); if (!c) return; REPLY = c; G.repaint(APP); setTimeout(() => { const e = document.getElementById('rdCmt'); if (e) e.focus(); }, 30); };
R.moreCmts = id => { const n = noteOf(id); if (n) genCmts(n, 5); };
R.sendCmt = async id => {
    const n = noteOf(id), inp = document.getElementById('rdCmt'); if (!n || !inp) return; const t = inp.value.trim(); if (!t) return;
    const c = { id: G.uid('c'), by: 'me', text: t.slice(0, 300), at: Date.now(), likeN: 0, likes: [], kids: [] };
    if (REPLY) { c.toWho = REPLY.by; const top = n.cmts.find(x => x === REPLY || flat(x.kids).includes(REPLY)) || REPLY; top.kids.push(c); } else n.cmts.push(c);
    const to = REPLY; REPLY = null; saveD(); G.repaint(APP);
    // 被回的人 / 作者 回你
    const target = to ? to.by : n.by; if (target === 'me' || isX(target) && D.xacc[target].kind === 'real') return;
    if (Math.random() < (charOfW(target) ? 0.9 : 0.6)) setTimeout(async () => {
        const r = X.plain(await X.ask(`${whoAmI(target)}\n小红书上${to ? '你的评论' : '你的笔记「' + n.title + '」'}下面，${charOfW(target) ? X.me(charOfW(target)) + '（网名「' + nameOf('me') + '」）' : '一个叫「' + nameOf('me') + '」的网友'}回你：「${t}」${to ? '\n（你原来说的是：「' + to.text + '」）' : ''}\n回她一句（小红书评论区，短）。只写回复。`) || '');
        if (!r) return; const k = { id: G.uid('c'), by: target, text: r.slice(0, 200), at: Date.now(), likeN: 0, likes: [], kids: [], toWho: 'me' };
        const top = n.cmts.find(x => x === c || flat(x.kids).includes(c)) || c; top.kids.push(k); act('at', target, n.id, r); saveD(); G.repaint(APP);
        const ch = charOfW(target); if (ch) G.notify(APP, ch, `📕 <b>${X.esc(ch.name)}</b> 在小红书回复了你`, r, X.go('gysRedOpenNote', n.id));
    }, G.rnd(3, 15) * 1000);
};
R.follow = w => { const L = following(), i = L.indexOf(w); if (i >= 0) L.splice(i, 1); else { L.push(w); G.prof(APP, w).followers = (G.prof(APP, w).followers || 0) + 1; G.save(); } saveD(); G.repaint(APP); };
R.atName = n => { const w = whoByName(n); if (w) R.prof(w); else X.toast('没找到 @' + n, ''); };
R.fav = async id => {
    const n = noteOf(id); if (!n) return;
    if (faved(n)) { n.favs = n.favs.filter(x => x !== 'me'); D.boards.forEach(b => { b.ids = b.ids.filter(x => x !== id); }); saveD(); G.repaint(APP); return X.toast('已取消收藏', ''); }
    n.favs.push('me'); saveD(); G.repaint(APP);
    const opts = ['就放默认收藏'].concat(D.boards.map(b => '📁 ' + b.name), ['＋ 新建专辑']);
    const i = await chooser(opts, '⭐ 收藏好了，放进哪个专辑？'); if (i == null || i === 0) return;
    if (i === opts.length - 1) { const nm = await G.input('专辑叫什么？（比如：约会攻略 / 想买的）', ''); if (!nm) return; D.boards.push({ id: G.uid('bd'), name: X.plain(nm).slice(0, 16), ids: [id] }); }
    else { const b = D.boards[i - 1]; if (!b.ids.includes(id)) b.ids.push(id); }
    saveD(); X.toast('📁 放好了', '');
};
// 🔗 分享（255）：开了「软件之间分享」走公用的分享（iMessage 卡片 / 平时聊天 / 复制）；关了还是以前那样只发到平时聊天
const rdCard = n => ({ app: 'red', kind: '笔记', by: n.by, byName: nameOf(n.by), title: X.plain(n.title || '').slice(0, 40), text: X.plain(n.body || '').slice(0, 300), img: G.cardImg((n.imgs || [])[0] || ''), at: n.at, go: X.go('gysRedOpenNote', n.id) });
G.feedReg('red', () => D.notes.filter(n => n.vis !== 'self' && Date.now() - n.at < 5 * 86400e3 && (n.title || n.body)).slice(0, 4).map(rdCard));
R.share = async id => {
    const n = noteOf(id); if (!n) return; if (G.shareOn()) return G.share(rdCard(n));
    const cs = G.chars(); if (!cs.length) return;
    const i = await chooser(cs.map(c => '💬 分享给 ' + c.name), '把这篇分享给谁？'); if (i == null) return;
    const c = cs[i]; X.toast('↗ 分享过去了', X.v('等 TA 看看', 'TA 会看的'));
    X.reach(c, `她从小红书分享了一篇笔记给你：「${n.title}」——${n.body.slice(0, 200)}${n.by === 'me' ? '（是她自己发的）' : ''}`);
};
R.noteMenu = async id => {
    const n = noteOf(id); if (!n) return; const mine = n.by === 'me' || altOwner(n.by) === 'me';
    const ops = mine ? ['✏️ 编辑', n.vis === 'self' ? '🌐 改成公开' : '🔒 改成仅自己可见', n.pin ? '📌 取消置顶' : '📌 置顶到主页', '🗑️ 删除'] : ['↗ 分享给 TA', '🚫 不感兴趣（以后少推）', '👤 看作者主页'];
    const i = await chooser(ops); if (i == null) return; const op = ops[i];
    if (op.includes('编辑')) R.compose(n);
    else if (op.includes('仅自己') || op.includes('公开')) { n.vis = n.vis === 'self' ? 'public' : 'self'; saveD(); G.repaint(APP); }
    else if (op.includes('置顶')) { n.pin = !n.pin; saveD(); X.toast(n.pin ? '📌 置顶了' : '取消置顶', ''); }
    else if (op.includes('删除')) { if (!(await G.confirm('删掉这篇笔记？'))) return; D.notes = D.notes.filter(x => x !== n); saveD(); G.back(APP); }
    else if (op.includes('分享')) R.share(id);
    else if (op.includes('不感兴趣')) { n.hide = 1; D.notes = D.notes.filter(x => x !== n); saveD(); G.back(APP); X.toast('好的，以后少推这类', ''); }
    else R.prof(n.by);
};

/* ---------------- 发笔记 ---------------- */
let DR = null;
function draftNew(n) { return n ? { did: '', edit: n.id, imgs: n.imgs.slice(), title: n.title, body: n.body, loc: n.loc, vis: n.vis, ch: n.ch, as: n.by } : { did: G.uid('dr'), edit: '', imgs: [], title: '', body: '', loc: '', vis: 'public', ch: '推荐', as: 'me' }; }
function composeHtml() {
    const d = DR || (DR = draftNew());
    const nd = (D.drafts || []).filter(x => x.did !== d.did).length;
    return `<div class="rd-cmp">${!d.edit && G.draftOn() ? `<div class="rd-drbar" onclick="gysRd.drafts()">📝 草稿箱${nd ? ` <b>${nd}</b>` : ''}<em>写到一半会自动存 ›</em></div>` : ''}
      <div class="rd-cimgs">${d.imgs.map((s, i) => `<span style="background-image:url('${s}')"><b onclick="gysRd.__rm(${i})">✕</b></span>`).join('')}${d.imgs.length < 9 ? `<span class="add" onclick="gysRd.__img()">＋<em>${d.imgs.length ? '' : '加图（能裁剪）'}</em></span>` : ''}</div>
      <input id="rdT" maxlength="20" placeholder="填写标题会有更多赞哦～" value="${esc(d.title)}" oninput="gysRd.__d('title',this.value);document.getElementById('rdTc').textContent=this.value.length+'/20'"><small id="rdTc" class="rd-tc">${d.title.length}/20</small>
      <textarea id="rdB" rows="7" placeholder="添加正文" oninput="gysRd.__d('body',this.value)">${esc(d.body)}</textarea>
      <div class="rd-ctool"><span onclick="gysRd.__ins('#')"># 话题</span><span onclick="gysRd.__at()">@ 用户</span></div>
      <div class="rd-crow" onclick="gysRd.__loc()">📍 ${d.loc ? esc(d.loc) : '添加地点'}<em>›</em></div>
      <div class="rd-crow" onclick="gysRd.__ch()">🏷️ 频道：${esc(d.ch)}<em>›</em></div>
      <div class="rd-crow" onclick="gysRd.__vis()">${d.vis === 'self' ? '🔒 仅自己可见' : '🌐 公开可见'}<em>›</em></div>
      <div class="rd-crow" onclick="gysRd.__as()">👤 用 ${esc(nameOf(d.as))} 发${d.as !== 'me' ? '（小号）' : ''}<em>›</em></div>
      <div class="gys-acts"><button class="gys-btn rd-pub" onclick="gysRd.publish()">${d.edit ? '保存修改' : '发布笔记'}</button></div></div>`;
}
const keep = () => { const t = document.getElementById('rdT'), b = document.getElementById('rdB'); if (DR) { if (t) DR.title = t.value; if (b) DR.body = b.value; } };
R.__d = (k, v) => { if (DR) { DR[k] = v; clearTimeout(R.__dt); R.__dt = setTimeout(() => keepDraft(), 800); } };
/* ---------- 📝 草稿箱（255）：新笔记写着写着就自动存（改旧笔记不存）；发布页顶上点进去接着写 ---------- */
function keepDraft() {
    if (!DR || DR.edit || !G.draftOn()) return; keep(); D.drafts = D.drafts || [];
    const i = D.drafts.findIndex(x => x.did === DR.did), has = String(DR.title || '').trim() || String(DR.body || '').trim() || (DR.imgs || []).length;
    if (!has) { if (i >= 0) { D.drafts.splice(i, 1); saveD(); } return; }
    const o = Object.assign({}, DR, { imgs: (DR.imgs || []).slice(), at: Date.now() });
    if (i >= 0) D.drafts[i] = o; else D.drafts.unshift(o); if (D.drafts.length > 50) D.drafts.length = 50; saveD();
}
const dropDraft = did => { if (!did || !D.drafts) return; D.drafts = D.drafts.filter(x => x.did !== did); saveD(); };
R.drafts = () => { keepDraft(); G.push(APP, { title: '草稿箱', id: 'drafts', html: () => { const L = D.drafts || []; return L.length ? `<div class="rd-drgrid">${L.map(d => `<div class="rd-dr" onclick="gysRd.draftOpen('${d.did}')">${d.imgs && d.imgs[0] ? `<span style="background-image:url('${d.imgs[0]}')"></span>` : `<span class="t">${esc((d.title || d.body || '').slice(0, 14))}</span>`}<b>${esc(d.title || String(d.body || '').slice(0, 20) || '无标题')}</b><small>${G.ago(d.at)}<i onclick="event.stopPropagation();gysRd.draftDel('${d.did}')">删除</i></small></div>`).join('')}</div>` : '<div class="gys-empty">草稿箱是空的<br>写到一半切走了，会自动存在这里</div>'; } }); };
R.draftOpen = did => { const d = (D.drafts || []).find(x => x.did === did); if (!d) return; keepDraft(); DR = Object.assign(draftNew(), d, { imgs: (d.imgs || []).slice() }); G.tab(APP, 'post'); };
R.draftDel = async did => { if (!(await G.confirm('删掉这篇草稿？'))) return; dropDraft(did); if (DR && DR.did === did) DR = null; G.repaint(APP); };
R.__img = () => { keep(); G.pickImg(3 / 4, url => { DR.imgs.push(url); keepDraft(); G.repaint(APP); }); };
R.__rm = i => { keep(); DR.imgs.splice(i, 1); keepDraft(); G.repaint(APP); };
R.__ins = s => { const t = document.getElementById('rdB'); if (!t) return; const p = t.selectionStart || t.value.length; t.value = t.value.slice(0, p) + s + t.value.slice(p); DR.body = t.value; t.focus(); t.selectionStart = t.selectionEnd = p + s.length; };
R.__at = async () => { keep(); const L = cast(); const i = await chooser(L.map(nameOf)); if (i != null) R.__ins('@' + nameOf(L[i]) + ' '); };
R.__loc = async () => { keep(); const v = await G.input('在哪儿？（空着就不显示）', DR.loc || ipOf('me')); if (v !== null && v !== undefined) { DR.loc = X.plain(v).slice(0, 16); G.repaint(APP); } };
R.__ch = async () => { keep(); const L = CH.slice(1); const i = await chooser(L); if (i != null) { DR.ch = L[i]; G.repaint(APP); } };
R.__vis = () => { keep(); DR.vis = DR.vis === 'self' ? 'public' : 'self'; G.repaint(APP); };
R.__as = async () => { keep(); const L = ['me'].concat(Object.keys(D.xacc).filter(w => D.xacc[w].kind === 'myalt')); const i = await chooser(L.map(w => (w === 'me' ? '大号：' : '小号：') + nameOf(w)).concat(['＋ 注册一个小号'])); if (i == null) return; if (i === L.length) { const nm = await G.input('小号叫什么？', '匿名小薯' + G.rnd(100, 999)); if (!nm) return; const w = 'x:alt_me' + Date.now().toString(36); D.xacc[w] = { kind: 'myalt', owner: 'me', name: nm }; G.prof(APP, w, { nick: X.plain(nm).slice(0, 16), emoji: '🫥', followers: G.rnd(0, 20), gen: true }); DR.as = w; } else DR.as = L[i]; G.repaint(APP); };
R.compose = n => { keepDraft(); DR = draftNew(n); if (n) G.push(APP, { title: '编辑笔记', html: composeHtml }); else G.tab(APP, 'post'); };
R.publish = async () => {
    keep(); const d = DR; if (!d) return;
    if (!d.title.trim() && !d.body.trim() && !d.imgs.length) return X.toast('写点什么吧', '');
    if (d.edit) { const n = noteOf(d.edit); if (n) { Object.assign(n, { imgs: d.imgs, title: X.plain(d.title).slice(0, 20), body: d.body.trim(), loc: d.loc, vis: d.vis, ch: d.ch, edited: Date.now() }); n.tags = Array.from(new Set((n.body.match(/#([^#\s]{1,14})/g) || []).map(x => x.slice(1)))); saveD(); } DR = null; G.back(APP); return X.toast('✏️ 改好了', ''); }
    const n = mkNote({ by: d.as || 'me', imgs: d.imgs, title: X.plain(d.title).slice(0, 20), body: d.body.trim(), loc: d.loc, vis: d.vis, ch: d.ch, emo: G.pick(EMO) });
    dropDraft(d.did); DR = null; X.toast(X.v('📕 发布成功', '笔记发出去了', '发好啦'), n.vis === 'self' ? '仅自己可见' : '');
    G.tab(APP, 'me'); R.open(n.id);
    if (n.vis !== 'self') { n.likeN = G.rnd(0, 30); await genCmts(n, 5); }
};

/* ---------------- 搜索 ---------------- */
R.searchPage = () => {
    if (!D.hot.list.length || Date.now() - D.hot.at > 6 * 3600e3) genHot();
    G.push(APP, { title: '搜索', id: 'search', html: () => `<div class="rd-sbox"><input id="rdQ" placeholder="搜索笔记、用户" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysRd.search(this.value)"><span onclick="gysRd.search(document.getElementById('rdQ').value)">搜索</span></div>
      ${D.hist.length ? `<div class="rd-sech">历史记录 <a onclick="gysRd.clrHist()">清空</a></div><div class="rd-chips">${D.hist.map(h => `<span onclick="gysRd.search('${esc(h).replace(/'/g, '')}')">${esc(h)}</span>`).join('')}</div>` : ''}
      <div class="rd-sech">猜你想搜 ${BUSY.hot ? '⏳' : ''}</div><div class="rd-hot">${D.hot.list.map((h, i) => `<div onclick="gysRd.search('${esc(h).replace(/'/g, '')}')"><b class="${i < 3 ? 'r' : ''}">${i + 1}</b>${esc(h)}${i < 2 ? ' <i>热</i>' : ''}</div>`).join('')}</div>` });
};
async function genHot() { if (BUSY.hot) return; BUSY.hot = 1; try { const o = X.json(await X.ask(P('red.hot', DEF_HOT, { 世界: world(), 条数: 10 }))); if (Array.isArray(o)) { D.hot = { list: o.map(x => X.plain(x).slice(0, 16)).filter(Boolean).slice(0, 10), at: Date.now() }; saveD(); } } finally { BUSY.hot = 0; G.repaint(APP); } }
R.clrHist = () => { D.hist = []; saveD(); G.repaint(APP); };
R.search = q => {
    q = X.plain(q || '').trim().slice(0, 20); if (!q) return;
    D.hist = [q].concat(D.hist.filter(x => x !== q)).slice(0, 12); saveD();
    const users = G.people().concat(Object.keys(D.xacc)).filter(w => w !== 'me' && (nameOf(w).indexOf(q) >= 0 || ((G.base(w) || {}).name || '').indexOf(q) >= 0)).slice(0, 6);
    const ids = D.search[q] || []; if (!ids.length) runSearch(q);
    G.push(APP, { title: '「' + esc(q) + '」', id: 'sr_' + q, html: () => { const L = D.notes.filter(n => visible(n) && ((D.search[q] || []).includes(n.id) || (n.title + n.body + n.tags.join(' ')).indexOf(q) >= 0)); return `${users.length ? `<div class="rd-sech">用户</div>${users.map(w => `<div class="rd-urow" onclick="gysRd.prof('${w}')">${G.av(APP, w, 40)}<div><b>${esc(nameOf(w))}</b><em>小红书号：${esc(redId(w))} · 粉丝 ${G.fmtN(G.prof(APP, w).followers)}</em></div></div>`).join('')}` : ''}<div class="rd-sech">笔记 ${BUSY['s' + q] ? '⏳ 正在搜…' : ''}</div>${grid(L) || (BUSY['s' + q] ? '' : '<div class="gys-empty">没搜到</div>')}<div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysRd.moreSearch('${esc(q).replace(/'/g, '')}')">再多搜一些</span><span class="gys-btn sm ghost" onclick="gysRd.real('${esc(q).replace(/'/g, '')}')">去真的小红书搜</span></div>`; } });
};
R.moreSearch = q => runSearch(q);
async function runSearch(q) {
    if (BUSY['s' + q]) return; BUSY['s' + q] = 1; G.repaint(APP);
    try { const o = X.json(await X.ask(P('red.search', DEF_SEARCH, { 词: q, 世界: world(), 条数: 6 }))); if (Array.isArray(o)) { const ids = o.map(x => fromJson(x, { ch: '推荐' })).filter(Boolean).map(n => n.id); D.search[q] = (D.search[q] || []).concat(ids); const ks = Object.keys(D.search); if (ks.length > 40) delete D.search[ks[0]]; saveD(); } }
    finally { BUSY['s' + q] = 0; G.repaint(APP); }
}

/* ---------------- 主页 ---------------- */
let PT = {};
R.prof = w => {
    if (!w) return; PT[w] = PT[w] || 'notes';
    if (!G.prof(APP, w).gen && w !== 'me' && G.base(w)) G.genProfiles(APP, [w], STYLE).then(() => G.repaint(APP));
    G.push(APP, { id: 'prof_' + w, title: '', cls: 'rd-pfb', html: () => profHtml(w) });
};
function profStats(w) {
    const mine = D.notes.filter(n => n.by === w);
    const got = mine.reduce((k, n) => k + likeAll(n) + favAll(n), 0) + (G.prof(APP, w).likes || 0);
    return { notes: mine, got };
}
function profHtml(w) {
    const p = G.prof(APP, w), me = w === 'me', s = profStats(w), links = G.linksOf(APP, w), c = charOfW(w);
    const tabs = me ? [['notes', '笔记'], ['favs', '收藏'], ['likes', '赞过']] : [['notes', '笔记'], ['favs', c ? '收藏（偷看）' : '收藏']];
    const t = PT[w] || 'notes';
    let body = '';
    if (t === 'notes') { const L = s.notes.filter(n => me || n.vis !== 'self').sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.at - a.at); body = grid(L) || `<div class="gys-empty">${me ? '还没发过笔记<br><span class="gys-btn sm" onclick="gysRd.compose()">去发一篇</span>' : 'TA 还没发过笔记'}</div>`; }
    else if (t === 'favs') {
        if (me) body = `<div class="rd-boards"><div onclick="gysRd.board('')"><b>⭐ 全部收藏</b><em>${D.notes.filter(faved).length} 篇</em></div>${D.boards.map(b => `<div onclick="gysRd.board('${b.id}')"><b>📁 ${esc(b.name)}</b><em>${b.ids.length} 篇</em></div>`).join('')}<div onclick="gysRd.newBoard()"><b>＋ 新建专辑</b></div></div>`;
        else if (c) { const L = D.notes.filter(n => (n.favBy || {})[c.id]); body = `<div class="rd-tip">${X.v('偷看一下 TA 收藏了什么……', 'TA 收藏的东西，往往跟你有关。')}</div>${L.map(n => `<div class="rd-favrow" onclick="gysRd.open('${n.id}')"><b>${esc(n.title)}</b><em>TA 心里想：${esc(n.favBy[c.id])}</em></div>`).join('') || '<div class="gys-empty">TA 还没收藏过</div>'}<div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysRd.taFav('${c.id}')">${BUSY['fav' + c.id] ? '⏳ TA 在刷…' : '让 TA 刷一会儿'}</span></div>`; }
        else body = '<div class="gys-empty">🔒 TA 的收藏没有公开</div>';
    } else body = grid(D.notes.filter(liked)) || '<div class="gys-empty">还没赞过</div>';
    const tags = myTags(w).concat(p.gender ? [p.gender === '女' ? '♀' : '♂'] : []);
    return `<div class="rd-pf"><div class="rd-pfbg" style="${p.bg ? `background-image:url('${p.bg}')` : `background:${picBg(p.nick)}`}"><div class="rd-pfin">
        <div class="rd-pfr">${G.av(APP, w, 76)}<div><b>${esc(p.nick)}</b><em>小红书号：${esc(redId(w))}　IP属地：${esc(ipOf(w))}</em></div></div>
        <div class="rd-pfbio">${esc(p.bio || (me ? '还没有简介，点「编辑资料」写一句' : '这个人很懒，什么都没写'))}</div>
        ${tags.length ? `<div class="rd-pftags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
        ${links.length ? `<div class="rd-pftags">${links.map(([k, h]) => `<span>${G.APPS[k].ico} ${esc(h)}</span>`).join('')}</div>` : ''}
        <div class="rd-pfn"><span><b>${G.fmtN(me ? following().length : p.following)}</b>关注</span><span><b>${G.fmtN(p.followers)}</b>粉丝</span><span><b>${G.fmtN(s.got)}</b>获赞与收藏</span>
          <i>${me ? `<span class="rd-pbtn" onclick="gysRd.editMe('me')">编辑资料</span><span class="rd-pbtn" onclick="gysRd.yearReport()">📊 年度报告</span>` : `<span class="rd-pbtn${isFollow(w) ? ' on' : ''}" onclick="gysRd.follow('${w}')">${isFollow(w) ? '已关注' : '关注'}</span><span class="rd-pbtn" onclick="gysRd.dm('${w}')">💬</span>`}</i></div>
        ${!me ? `<div class="rd-pfops"><a onclick="gysRd.editMe('${w}')">✏️ 改 TA 的小红书主页</a>${isX(w) && D.xacc[w].kind === 'alt' && !D.xacc[w].found ? ` <a onclick="gysRd.guess('${w}')">🕵️ 猜猜是谁的小号</a>` : ''}</div>` : ''}
      </div></div>
      <div class="rd-ptabs">${tabs.map(([k, n]) => `<span class="${t === k ? 'on' : ''}" onclick="gysRd.pt('${w}','${k}')">${n}</span>`).join('')}</div>${body}</div>`;
}
R.pt = (w, k) => { PT[w] = k; G.repaint(APP); };
R.editMe = w => G.editProf(APP, w, [['tagstr', '标签', '比如：射手座 上海 摄影 INFP（空格隔开）']]);
R.board = id => { const b = D.boards.find(x => x.id === id); G.push(APP, { title: b ? '📁 ' + esc(b.name) : '⭐ 全部收藏', html: () => grid(D.notes.filter(n => b ? b.ids.includes(n.id) : faved(n))) + (b ? `<div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysRd.renBoard('${id}')">改名</span><span class="gys-btn sm ghost" onclick="gysRd.delBoard('${id}')">删掉专辑</span></div>` : '') || '<div class="gys-empty">空的</div>' }); };
R.newBoard = async () => { const nm = await G.input('专辑叫什么？', ''); if (!nm) return; D.boards.push({ id: G.uid('bd'), name: X.plain(nm).slice(0, 16), ids: [] }); saveD(); G.repaint(APP); };
R.renBoard = async id => { const b = D.boards.find(x => x.id === id); if (!b) return; const nm = await G.input('新名字', b.name); if (!nm) return; b.name = X.plain(nm).slice(0, 16); saveD(); G.back(APP); };
R.delBoard = async id => { if (!(await G.confirm('删掉这个专辑？（笔记还在「全部收藏」里）'))) return; D.boards = D.boards.filter(x => x.id !== id); saveD(); G.back(APP); };
R.taFav = async cid => { const c = X.char(cid); if (c) { BUSY['fav' + cid] = 1; G.repaint(APP); try { await taFav(c); } finally { BUSY['fav' + cid] = 0; G.repaint(APP); } } };
R.guess = async w => {
    const cs = G.chars(); const i = await chooser(cs.map(c => c.name).concat(['都不是']), `「${nameOf(w)}」是谁的小号？`); if (i == null) return;
    const c = cs[i]; if (c && D.xacc[w].owner === 'c:' + c.id) { D.xacc[w].found = 1; saveD(); G.repaint(APP); X.toast('🕵️ 被你认出来了！', c.name + ' 的小号'); X.reach(c, `她发现了你在小红书上的小号「${nameOf(w)}」，还看到了你用小号发的求问帖`); }
    else X.toast(X.v('不是哦', '再猜猜', '好像不是'), '');
};

/* ---------------- 消息 ---------------- */
function msgTab() {
    const cnt = k => D.acts.filter(a => !a.seen && (k === 'like' ? a.k === 'like' || a.k === 'fav' : k === 'cmt' ? a.k === 'cmt' || a.k === 'at' : a.k === k)).length;
    const ths = Object.keys(D.dms).filter(k => D.dms[k].msgs.length).sort((a, b) => D.dms[b].at - D.dms[a].at);
    return `<div class="rd-mtop">${[['like', '❤️', '赞和收藏'], ['follow', '👤', '新增关注'], ['cmt', '💬', '评论和@']].map(([k, i, n]) => `<span onclick="gysRd.acts('${k}')"><i>${i}</i>${n}${cnt(k) ? `<sup>${cnt(k)}</sup>` : ''}</span>`).join('')}</div>
      <div class="rd-sech">私信 <a onclick="gysRd.dmNew()">＋ 发私信</a></div>
      ${ths.map(k => { const t = D.dms[k], m = t.msgs[t.msgs.length - 1]; return `<div class="rd-urow" onclick="gysRd.dm('${t.who}')">${G.av(APP, t.who, 44)}<div><b>${esc(nameOf(t.who))}</b><em>${esc(m.t).slice(0, 30)}</em></div><small>${G.ago(m.at)}${t.unread ? `<sup>${t.unread}</sup>` : ''}</small></div>`; }).join('') || '<div class="gys-empty">还没有私信</div>'}`;
}
R.acts = k => {
    const L = D.acts.filter(a => k === 'like' ? a.k === 'like' || a.k === 'fav' : k === 'cmt' ? a.k === 'cmt' || a.k === 'at' : a.k === k);
    L.forEach(a => { a.seen = 1; }); saveD();
    G.push(APP, { title: { like: '赞和收藏', follow: '新增关注', cmt: '评论和@' }[k], html: () => L.map(a => { const n = noteOf(a.nid); return `<div class="rd-urow" onclick="${n ? `gysRd.open('${a.nid}')` : `gysRd.prof('${a.by}')`}">${G.av(APP, a.by, 40)}<div><b>${esc(nameOf(a.by))}</b><em>${{ like: '赞了你的笔记', fav: '收藏了你的笔记', follow: '开始关注你了', cmt: '评论了你的笔记：', at: '回复了你：' }[a.k]}${esc(a.text)}</em></div><small>${G.ago(a.at)}</small></div>`; }).join('') || '<div class="gys-empty">还没有</div>' });
};
const thOf = w => (D.dms[w] = D.dms[w] || { who: w, msgs: [], at: Date.now(), unread: 0 });
R.dmNew = async () => { const L = cast(); const i = await chooser(L.map(nameOf), '私信谁？'); if (i != null) R.dm(L[i]); };
R.dm = w => { const th = thOf(w); th.unread = 0; saveD(); G.push(APP, { id: 'dm_' + w, title: esc(nameOf(w)), cls: 'rd-dmb', html: () => `${thOf(w).msgs.map(m => `<div class="rd-dm${m.from === 'me' ? ' me' : ''}">${m.from === 'me' ? '' : G.av(APP, w, 32)}<span>${esc(m.t)}</span></div>`).join('') || '<div class="gys-empty">打个招呼吧</div>'}${BUSY['dm' + w] ? '<div class="gys-busy">对方正在输入…</div>' : ''}`, foot: () => `<div class="rd-bar"><input id="rdDm" placeholder="发私信…" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysRd.dmSend('${w}')"><span class="rd-send" onclick="gysRd.dmSend('${w}')">发送</span></div>`, after: r => { const b = r.querySelector('.gys-body'); if (b) b.scrollTop = b.scrollHeight; } }); };
R.dmSend = async w => {
    const inp = document.getElementById('rdDm'); if (!inp) return; const t = inp.value.trim(); if (!t) return;
    const th = thOf(w); th.msgs.push({ from: 'me', t: t.slice(0, 500), at: Date.now() }); th.at = Date.now(); saveD(); G.repaint(APP);
    if (!G.base(w)) return;
    BUSY['dm' + w] = 1; G.repaint(APP);
    try {
        const c = charOfW(w);
        const r = await X.ask(P('red.dm', DEF_DM, { 我是谁: whoAmI(w) + (c ? '' : `\n给你发私信的人在小红书上叫「${nameOf('me')}」`), 记录: th.msgs.slice(-12).map(m => (m.from === 'me' ? (c ? X.me(c) : nameOf('me')) : '你') + '：' + m.t).join('\n') }));
        X.plain(r || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3).forEach(s => th.msgs.push({ from: w, t: s.slice(0, 300), at: Date.now() }));
        th.at = Date.now(); saveD();
    } finally { BUSY['dm' + w] = 0; G.repaint(APP); }
};

/* ---------------- 我 / 菜单 / 现实小红书 / 设置 ---------------- */
R.menu = async () => {
    const ops = ['📎 现实小红书（去真的搜 / 粘真笔记进来）', '🕵️ 偷看 TA 们的收藏', '⚙️ 设置', '📤 导出小红书记录（TXT）'];
    const i = await chooser(ops); if (i == null) return;
    if (i === 0) R.realPage(); else if (i === 1) R.taFavs(); else if (i === 2) R.settings(); else R.export();
};
R.real = q => {
    q = String(q || '').trim(); const web = 'https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(q || '约会');
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) { const t = Date.now(); location.href = 'xhsdiscover://search/result?keyword=' + encodeURIComponent(q || '约会'); setTimeout(() => { if (Date.now() - t < 2500 && !document.hidden) window.open(web, '_blank'); }, 1500); } else window.open(web, '_blank');
};
R.realPage = () => G.push(APP, { title: '现实小红书', html: () => `<div class="rd-tip">现实里的小红书要登录、也不让别的网页直接读，所以没法直接刷进谷雨。可以：</div>
  <div class="rd-box"><b>🔍 去真的小红书搜</b><div class="rd-sbox"><input id="rdRq" placeholder="想搜什么"><span onclick="gysRd.real(document.getElementById('rdRq').value)">去搜</span></div><small>手机上会打开小红书 App，没装就打开网页。</small></div>
  <div class="rd-box"><b>📎 把看到的笔记贴进来</b><small>在小红书里点「分享 → 复制链接」，或者长按复制正文，粘到这里。贴进来以后能分享给 TA、大家会来评论。</small><textarea id="rdPaste" rows="5" placeholder="第一行当标题，后面是正文；链接会自动认出来"></textarea><div class="gys-acts"><span class="gys-btn" onclick="gysRd.paste()">贴进来</span></div></div>` });
R.paste = () => {
    const t = document.getElementById('rdPaste'), v = t && t.value.trim(); if (!v) return X.toast('先把笔记内容粘贴进来', '在小红书里点「分享 → 复制链接」或者直接复制正文');
    const lines = v.split('\n').map(s => s.trim()).filter(Boolean), url = (v.match(/https?:\/\/\S+/) || [''])[0];
    if (!D.xacc['x:real']) { D.xacc['x:real'] = { kind: 'real', name: '真小红书' }; G.prof(APP, 'x:real', { nick: '从真小红书贴来的', emoji: '📎', gen: true }); }
    const n = mkNote({ by: 'x:real', emo: '📎', title: lines[0].replace(/https?:\/\/\S+/, '').slice(0, 30) || '从小红书贴过来的', body: lines.slice(1).join('\n').replace(/https?:\/\/\S+/g, '').trim() || v.replace(/https?:\/\/\S+/g, '').trim(), tags: (v.match(/#([^#\s]+)/g) || []).map(x => x.slice(1)), url, likeN: 0, favN: 0 });
    t.value = ''; G.back(APP); R.open(n.id);
};
R.taFavs = () => G.push(APP, { title: '🕵️ TA 们偷偷收藏的', html: () => G.chars().map(c => { const L = D.notes.filter(n => (n.favBy || {})[c.id]); return `<div class="rd-sech">${esc(c.name)}（${L.length}）<a onclick="gysRd.taFav('${c.id}')">${BUSY['fav' + c.id] ? '⏳' : '让 TA 刷一会儿'}</a></div>${L.map(n => `<div class="rd-favrow" onclick="gysRd.open('${n.id}')"><b>${esc(n.title)}</b><em>TA 心里想：${esc(n.favBy[c.id])}</em></div>`).join('')}`; }).join('') || '<div class="gys-empty">还没有角色</div>' });
R.settings = () => G.push(APP, { title: '小红书设置', html: () => `
  <label class="gys-f"><span>最多留多少篇笔记（你的、收藏的、TA 收藏的不会被删）</span><input id="rdC_keep" type="number" min="100" value="${D.cfg.keep}"></label>
  <label class="gys-f"><span>每次刷新刷出几篇</span><input id="rdC_feedN" type="number" min="2" max="12" value="${D.cfg.feedN}"></label>
  <div class="gys-acts"><button class="gys-btn" onclick="gysRd.saveCfg()">保存</button><button class="gys-btn ghost" onclick="GYS.uiPage('red')">🍎 苹果外观</button></div>` });
R.saveCfg = () => { const g = k => Number((document.getElementById('rdC_' + k) || {}).value) || 0; D.cfg.keep = Math.max(100, g('keep') || 500); D.cfg.feedN = Math.max(2, Math.min(12, g('feedN') || 6)); saveD(); X.toast('💾 存好了', ''); G.back(APP); };
R.export = () => {
    const L = D.notes.filter(n => n.by === 'me' || faved(n) || charOfW(n.by) || Object.keys(n.favBy || {}).length).map(n => `【${n.title}】${nameOf(n.by)} · ${new Date(n.at).toLocaleString()}\n${n.body}\n${n.tags.map(t => '#' + t).join(' ')}\n${flat(n.cmts).map(c => '  · ' + nameOf(c.by) + '：' + c.text).join('\n')}${Object.keys(n.favBy || {}).map(id => '\n  ⭐ ' + ((X.char(id) || {}).name || '') + ' 偷偷收藏：' + n.favBy[id]).join('')}`);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\n\n')], { type: 'text/plain' })); a.download = '小红书记录.txt'; a.click();
};
function meTab() { PT.me = PT.me || 'notes'; return profHtml('me'); }

/* ---------------- TA 做的事 ---------------- */
async function taPost(c, req, alt) {
    let by = 'c:' + c.id;
    if (alt) { by = Object.keys(D.xacc).find(w => D.xacc[w].kind === 'alt' && D.xacc[w].owner === by); if (!by) { by = 'x:alt_c' + c.id; D.xacc[by] = { kind: 'alt', owner: 'c:' + c.id, name: '' }; const nm = G.pick(['匿名小薯', '不想说名字', '一个普通人', '求助的小熊', 'momo' + G.rnd(10, 99)]) ; D.xacc[by].name = nm; G.prof(APP, by, { nick: nm, emoji: '🫥', followers: G.rnd(0, 30), gen: true }); } }
    const o = X.json(await X.ask(P('red.ta', DEF_TA, { 我是谁: X.who(c), 最近: X.recent(c, 10) || '（最近没怎么聊）', 要求: alt ? '这次用的是不让她知道的小号，发一篇匿名的「求问」帖：关于你们的事想问问网友的意见（比如怎么哄她、送什么礼物、她说的某句话是什么意思），不能暴露身份。' + (req || '') : (req || '') })));
    if (!o || (!o.title && !o.body)) return null;
    const n = mkNote({ by, emo: X.plain(o.emo || '').slice(0, 4) || G.pick(EMO), title: X.plain(o.title || '').slice(0, 30), body: X.plain(o.body || '').slice(0, 800), tags: o.tags || [], pics: (o.pics || []).filter(Boolean).slice(0, 6).map(t => X.plain(t).slice(0, 16)), loc: X.plain(o.loc || '').slice(0, 16), likeN: G.rnd(5, 400), favN: G.rnd(0, 120), ch: alt ? '情感' : '推荐' });
    genCmts(n, 4);
    if (!alt) G.notify(APP, c, `📕 <b>${X.esc(c.name)}</b> 发了一篇小红书`, n.title, X.go('gysRedOpenNote', n.id));
    return n;
}
async function taFav(c) {
    const L = D.notes.filter(n => n.by !== 'c:' + c.id && !(n.favBy || {})[c.id]).slice(0, 8); if (L.length < 2) return null;
    const o = X.json(await X.ask(P('red.fav', DEF_FAV, { 我是谁: X.who(c), 笔记: L.map((n, i) => `${i}. 「${n.title}」${n.body.slice(0, 50)}`).join('\n') })));
    if (!o || o.i == null || o.i < 0 || !L[o.i]) return null;
    const n = L[o.i]; n.favBy = n.favBy || {}; n.favBy[c.id] = X.plain(o.why || '').slice(0, 40) || '先存着'; n.favN = (n.favN || 0) + 1; saveD(); G.repaint(APP);
    return n;
}

/* ---------------- 老小红书搬家 + TA 手机里的笔记 ---------------- */
async function migrate() {
    if (D.migrated) return; D.migrated = 1;
    try {
        const old = await X.store('red').get('d', null);
        const L = old && Array.isArray(old.notes) ? old.notes : [];
        const wOf = by => { by = String(by || ''); if (by === 'me') return 'me'; if (by === 'real') { if (!D.xacc['x:real']) { D.xacc['x:real'] = { kind: 'real', name: '真小红书' }; G.prof(APP, 'x:real', { nick: '从真小红书贴来的', emoji: '📎', gen: true }); } return 'x:real'; } if (X.char(by)) return 'c:' + by; if (by.startsWith('npc:')) return passer(by.slice(4)); return passer(by); };
        L.slice().reverse().forEach(o => {
            if (!o || D.notes.some(n => n.id === o.id)) return;
            const by = o.by === 'npc' ? passer((o.npc || {}).name, (o.npc || {}).emo) : wOf(o.by);
            const n = { id: o.id || G.uid('rn'), by, title: o.title || '', body: o.body || '', tags: o.tags || [], imgs: [], pics: [], emo: (o.cover || {}).emo || '📕', cover: o.cover || null, loc: '', at: o.at || Date.now(), likes: o.liked ? ['me'] : [], likeN: Math.max(0, (o.likes || 0) - (o.liked ? 1 : 0)), favs: o.faved ? ['me'] : [], favN: Math.max(0, (o.favs || 0) - (o.faved ? 1 : 0)), cmts: (o.cmts || []).map(c => ({ id: G.uid('c'), by: wOf(c.who), text: c.t || '', at: c.at || o.at || Date.now(), likeN: 0, likes: [], kids: [] })), cmtN: 0, ch: '推荐', favBy: o.favBy || {}, vis: 'public', ip: '', url: o.url || '', from: o.from || '', cmtGen: 1 };
            n.ip = ipOf(by); D.notes.unshift(n);
        });
        saveD();
        if (L.length) X.toast('📕 老小红书搬过来了', `${L.length} 篇笔记、收藏和 TA 偷偷收藏的都在`);
    } catch (e) { console.warn('[小红书] 搬家失败', e); }
}
function syncPhone() {
    try {
        if (typeof window.gyPhoneNotes !== 'function') return;
        G.chars().forEach(c => window.gyPhoneNotes(c.id).forEach(x => {
            const key = c.id + '|' + (x.title || '') + '|' + String(x.body || '').slice(0, 20); if (D.phoneSeen[key]) return; D.phoneSeen[key] = 1;
            const n = mkNote({ by: 'c:' + c.id, from: 'phone', title: X.plain(x.title || '无题').slice(0, 30), body: String(x.body || '').replace(/\[img-([^\]]+)\]/gi, '🖼️$1').slice(0, 800), likeN: +x.likes || G.rnd(0, 200), favN: +x.favs || 0, cmtGen: 1 });
            addCmts(n, (x.comments || []).map(cm => ({ by: cm.by || '路人', text: cm.t })));
        }));
    } catch (e) {}
}

/* ---------------- 🛍️ 市集（256，小红书底栏第二个）：双列商品流，买了从钱包扣；能买给 TA；TA 也会在市集给你下单 ---------------- */
const DEF_MALL = `你在模拟小红书「市集」的商品推荐流。逛的人是 {{我}}，她身边的人：
{{人}}
她最近在小红书上看的：{{看过}}
写 {{条数}} 件商品（小红书市集那种：买手店、小众设计、好物、手作、零食、穿搭、家居、美妆……像真实在卖的，价格合理）。
只输出 JSON 数组：[{"name":"商品名（带点小红书味）","shop":"店铺 / 买手名","price":价格,"emo":"一个代表商品的 emoji","desc":"卖点（一两句）","sold":已售数量,"tags":["标签"]}]`;
X.plGroup('📕 小红书市集', 'gysRed', [['red.mall', '市集商品流', '打开市集 / 刷新时', '{{我}} {{人}} {{看过}} {{条数}}']], { 'red.mall': DEF_MALL });
async function genMall() {
    if (BUSY.mall) return; BUSY.mall = 1; G.repaint(APP);
    try {
        const seen = D.notes.filter(n => n.by !== 'me').slice(0, 8).map(n => n.title).join('、') || '（还没看什么）';
        const o = X.json(await X.ask(P('red.mall', DEF_MALL, { 我: G.meName(), 人: G.chars().slice(0, 4).map(c => c.name + '：' + String(c.persona || '').slice(0, 60)).join('\n') || '（没有）', 看过: seen, 条数: 10 })));
        if (Array.isArray(o)) { D.goods = (o.filter(x => x && x.name).map(x => ({ id: G.uid('rg'), name: X.plain(x.name).slice(0, 40), shop: X.plain(x.shop || '').slice(0, 20), price: Math.max(1, Math.round((+x.price || 59) * 100) / 100), emo: X.plain(x.emo || '🛍️').slice(0, 4), desc: X.plain(x.desc || '').slice(0, 120), sold: +x.sold || G.rnd(10, 9999), tags: (x.tags || []).slice(0, 3).map(t => X.plain(t).slice(0, 8)), at: Date.now() }))).concat((D.goods || []).filter(g => g.keep)).slice(0, 60); D.mallAt = Date.now(); saveD(); }
    } catch (e) {} finally { BUSY.mall = 0; G.repaint(APP); }
}
const gOf = id => (D.goods || []).find(g => g.id === id);
const gBg = g => { let h = 0; for (const ch of String(g.name)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `linear-gradient(160deg,hsl(${h},60%,92%),hsl(${(h + 30) % 360},55%,82%))`; };
function mallTab() {
    if (!D.goods || !D.goods.length || Date.now() - (D.mallAt || 0) > 12 * 3600e3) setTimeout(genMall, 50);
    const L = D.goods || [], a = L.filter((x, i) => i % 2 === 0), b = L.filter((x, i) => i % 2 === 1);
    const card = g => `<div class="rd-gc" onclick="gysRd.good('${g.id}')"><span class="rd-gimg" style="${g.img ? `background-image:url('${g.img}')` : `background:${gBg(g)}`}">${g.img ? '' : `<i>${esc(g.emo)}</i>`}</span><b>${esc(g.name)}</b><div class="rd-gp"><em>¥<u>${g.price}</u></em><small>已售 ${G.fmtN(g.sold)}</small></div><small class="rd-gs" onclick="event.stopPropagation();gysRd.shop('${esc(g.shop || '小红书市集').replace(/'/g, '')}')">${esc(g.shop)} ›</small></div>`;
    return `<div class="rd-mall"><div class="rd-mtop"><span onclick="gysRd.orders()">📦 我的订单${(D.orders || []).length ? ' ' + D.orders.length : ''}</span>${cartOn() ? `<span onclick="gysRd.cart()">🛒 购物车${cartN() ? ' ' + cartN() : ''}</span>` : ''}<span onclick="gysRd.__mall()">${BUSY.mall ? '⏳' : '↻ 换一批'}</span></div>${L.length ? `<div class="rd-gcols"><div>${a.map(card).join('')}</div><div>${b.map(card).join('')}</div></div>` : `<div class="gys-busy">${BUSY.mall ? '⏳ 正在上新…' : '还没有商品'}</div>`}</div>`;
}
R.__mall = () => genMall();
R.good = id => { const g = gOf(id); if (!g) return; G.push(APP, { id: 'good_' + id, title: '', html: () => `<div class="rd-gd"><div class="rd-gdimg" style="${g.img ? `background-image:url('${g.img}')` : `background:${gBg(g)}`}" onclick="gysRd.gImg('${id}')">${g.img ? '' : `<i>${esc(g.emo)}</i>`}<small>换图</small></div><div class="rd-gdp">¥<b>${g.price}</b><small>已售 ${G.fmtN(g.sold)}</small></div><h3>${esc(g.name)}</h3><p>${esc(g.desc)}</p><div class="rd-chips">${g.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div><div class="rd-gshop" onclick="gysRd.shop('${esc(g.shop || '小红书市集').replace(/'/g, '')}')">🏪 ${esc(g.shop)} <em>进店 ›</em></div></div>`, foot: () => `<div class="rd-gbar"><i onclick="gysRd.shop('${esc(g.shop || '小红书市集').replace(/'/g, '')}')"><b>🏪</b>店铺</i>${cartOn() ? `<i onclick="gysRd.cart()"><b>🛒${cartN() ? `<sup>${cartN()}</sup>` : ''}</b>购物车</i><span class="c" onclick="gysRd.addCart('${id}')">加入购物车</span>` : ''}<span onclick="gysRd.buy('${id}','me')">立即购买</span><span class="g" onclick="gysRd.buy('${id}','ta')">🎁 送 TA</span></div>` }); };
R.gImg = id => { const g = gOf(id); G.pickImg(1, url => { g.img = url; g.keep = 1; saveD(); G.repaint(APP); }); };
R.buy = async (id, to) => {
    const g = gOf(id); if (!g) return; let c = null;
    if (to === 'ta') { const cs = G.chars(); if (!cs.length) return; c = cs[0]; if (cs.length > 1) { const i = await G.sheet(cs.map(x => x.name), '买给谁？'); if (i == null) return; c = cs[i]; } }
    if (!(await G.confirm(`${to === 'ta' ? '买给 ' + c.name : '购买'}「${g.name}」\n¥${g.price}${window.gyWallet ? '（从钱包扣）' : ''}`))) return;
    const W = window.gyWallet; if (W && W.spend) { try { await W.spend('me', g.price, '小红书市集：' + g.name + (c ? '（送 ' + c.name + '）' : '')); } catch (e) {} }
    (D.orders = D.orders || []).unshift({ id: G.uid('ro'), gid: id, name: g.name, emo: g.emo, price: g.price, to: c ? 'c:' + c.id : 'me', from: 'me', at: Date.now() }); g.keep = 1; g.sold++; saveD();
    X.toast(X.v('📦 下单成功', '买好了'), c ? '会寄给 ' + c.name : '');
    if (c) X.reach(c, `她在小红书市集给你买了「${g.name}」（¥${g.price}），你收到了。`);
};
R.orders = () => G.push(APP, { title: '我的订单', html: () => (D.orders || []).map(o => `<div class="rd-urow" onclick="${gOf(o.gid) ? `gysRd.good('${o.gid}')` : ''}"><span class="rd-oico">${esc(o.emo)}</span><div><b>${esc(o.name)}</b><em>¥${o.price} · ${o.from === 'me' ? (o.to === 'me' ? '自己买的' : '送给 ' + esc(nameOf(o.to))) : esc(nameOf(o.from)) + ' 送你的'}</em></div><small>${G.ago(o.at)}</small></div>`).join('') || '<div class="gys-empty">还没有订单</div>' });
/* ---------------- 购物车 / 店铺页（258） ---------------- */
X.feat('gysRedCart', { n: '🛒 小红书购物车', desc: '小红书市集的购物车：加购、改数量、按店铺勾选结算（走钱包）；TA 偶尔会偷看你的购物车，悄悄把其中一件买给你' });
const cartOn = () => X.on('gysRedCart');
const cart = () => (D.cart = (D.cart || []).filter(x => gOf(x.gid)));
const cartN = () => cart().reduce((n, x) => n + x.n, 0);
R.addCart = id => { if (!cartOn()) return X.toast('购物车没开', '设置 → 全部开关 →「小红书购物车」'); const g = gOf(id); if (!g) return; g.keep = 1; const x = cart().find(y => y.gid === id); if (x) x.n = Math.min(99, x.n + 1); else D.cart.unshift({ gid: id, n: 1, sel: true, at: Date.now() }); saveD(); G.repaint(APP); X.toast(X.v('已加入购物车', '加购成功', '在购物车等你'), ''); };
R.cart = () => G.push(APP, { id: 'cart', title: `购物车(${cartN()})`, html: () => {
    const L = cart(); if (!L.length) return '<div class="gys-empty">购物车是空的<br>去市集逛逛吧</div>';
    const shops = Array.from(new Set(L.map(x => gOf(x.gid).shop || '小红书市集')));
    return `<div class="rd-cart">${shops.map(sh => { const its = L.filter(x => (gOf(x.gid).shop || '小红书市集') === sh); const all = its.every(x => x.sel); return `<div class="rd-cs"><div class="rd-csh"><i class="rd-ck${all ? ' on' : ''}" onclick="gysRd.cartSelShop('${esc(sh).replace(/'/g, '')}')"></i><b onclick="gysRd.shop('${esc(sh).replace(/'/g, '')}')">🏪 ${esc(sh)} ›</b></div>${its.map(x => { const g = gOf(x.gid); return `<div class="rd-ci"><i class="rd-ck${x.sel ? ' on' : ''}" onclick="gysRd.cartSel('${g.id}')"></i><span class="rd-cimg" onclick="gysRd.good('${g.id}')" style="${g.img ? `background-image:url('${g.img}')` : `background:${gBg(g)}`}">${g.img ? '' : esc(g.emo)}</span><div><b onclick="gysRd.good('${g.id}')">${esc(g.name)}</b><div class="rd-cp"><em>¥<u>${g.price}</u></em><span class="rd-qty"><a onclick="gysRd.cartN('${g.id}',-1)">−</a><i>${x.n}</i><a onclick="gysRd.cartN('${g.id}',1)">＋</a></span></div></div></div>`; }).join('')}</div>`; }).join('')}</div>`;
}, foot: () => { const L = cart(); if (!L.length) return ''; const sel = L.filter(x => x.sel); const sum = sel.reduce((s, x) => s + gOf(x.gid).price * x.n, 0); return `<div class="rd-cbar"><i class="rd-ck${sel.length === L.length ? ' on' : ''}" onclick="gysRd.cartAll()"></i><span>全选</span><em>合计：<b>¥${sum.toFixed(2)}</b></em><a class="${sel.length ? '' : 'off'}" onclick="gysRd.cartPay()">结算(${sel.reduce((n, x) => n + x.n, 0)})</a></div>`; } });
R.cartSel = id => { const x = cart().find(y => y.gid === id); if (x) { x.sel = !x.sel; saveD(); G.repaint(APP); } };
R.cartSelShop = sh => { const its = cart().filter(x => (gOf(x.gid).shop || '小红书市集') === sh); const v = !its.every(x => x.sel); its.forEach(x => { x.sel = v; }); saveD(); G.repaint(APP); };
R.cartAll = () => { const L = cart(); const v = !L.every(x => x.sel); L.forEach(x => { x.sel = v; }); saveD(); G.repaint(APP); };
R.cartN = async (id, d) => { const x = cart().find(y => y.gid === id); if (!x) return; if (x.n + d <= 0) { if (await G.confirm('从购物车删掉这件？')) D.cart = D.cart.filter(y => y !== x); } else x.n = Math.min(99, x.n + d); saveD(); G.repaint(APP); };
R.cartPay = async () => {
    const sel = cart().filter(x => x.sel); if (!sel.length) return; const sum = sel.reduce((s, x) => s + gOf(x.gid).price * x.n, 0);
    if (!(await G.confirm(`结算 ${sel.length} 件，共 ¥${sum.toFixed(2)}${window.gyWallet ? '（从钱包扣）' : ''}`))) return;
    const W = window.gyWallet; if (W && W.spend) { try { const ok = await W.spend('me', Math.round(sum * 100) / 100, '小红书购物车结算：' + sel.map(x => gOf(x.gid).name).join('、').slice(0, 40)); if (ok === false) return X.toast('钱包里钱不够', ''); } catch (e) { return X.toast('钱包里钱不够', ''); } }
    sel.forEach(x => { const g = gOf(x.gid); g.sold += x.n; (D.orders = D.orders || []).unshift({ id: G.uid('ro'), gid: g.id, name: g.name + (x.n > 1 ? ' ×' + x.n : ''), emo: g.emo, price: Math.round(g.price * x.n * 100) / 100, to: 'me', from: 'me', at: Date.now() }); });
    D.cart = cart().filter(x => !x.sel); saveD(); G.repaint(APP); X.toast(X.v('📦 支付成功', '下单了', '买好了，等快递'), '');
};
// 店铺页：头像、店名、粉丝 / 已售、关注店铺，下面是这家店的商品；可以让它「上新」
const DEF_SHOP = `你在模拟小红书市集里的一家店「{{店}}」。已有的商品：{{已有}}
再写 {{条数}} 件这家店会卖的商品（风格一致，像真实在卖的，价格合理）。
只输出 JSON 数组：[{"name":"商品名","price":价格,"emo":"一个 emoji","desc":"卖点","sold":已售数量,"tags":["标签"]}]`;
X.plGroup('📕 小红书店铺', 'gysRed', [['red.shop', '店铺上新', '打开一家店点「上新」时', '{{店}} {{已有}} {{条数}}']], { 'red.shop': DEF_SHOP });
R.shop = name => { name = String(name || '小红书市集'); D.shops = D.shops || {}; const S = D.shops[name] = D.shops[name] || { fans: G.rnd(800, 90000), score: (4.6 + Math.random() * 0.39).toFixed(2), f: false };
    G.push(APP, { id: 'shop_' + name, title: '', html: () => { const L = (D.goods || []).filter(g => g.shop === name); const sold = L.reduce((n, g) => n + (g.sold || 0), 0); const a = L.filter((x, i) => i % 2 === 0), b = L.filter((x, i) => i % 2 === 1);
        const card = g => `<div class="rd-gc" onclick="gysRd.good('${g.id}')"><span class="rd-gimg" style="${g.img ? `background-image:url('${g.img}')` : `background:${gBg(g)}`}">${g.img ? '' : `<i>${esc(g.emo)}</i>`}</span><b>${esc(g.name)}</b><div class="rd-gp"><em>¥<u>${g.price}</u></em><small>已售 ${G.fmtN(g.sold)}</small></div></div>`;
        return `<div class="rd-shop"><div class="rd-shh"><span class="rd-shav" style="background:${gBg({ name })}">${esc((L[0] || {}).emo || '🏪')}</span><div><b>${esc(name)}</b><small>${G.fmtN(S.fans + (S.f ? 1 : 0))} 粉丝 · 已售 ${G.fmtN(sold)} · 店铺评分 ${S.score}</small></div><a class="${S.f ? 'on' : ''}" onclick="gysRd.shopF('${esc(name).replace(/'/g, '')}')">${S.f ? '已关注' : '关注'}</a></div>
          <div class="rd-shtab"><b>商品 ${L.length}</b><span onclick="gysRd.shopMore('${esc(name).replace(/'/g, '')}')">${BUSY['sh' + name] ? '⏳ 上新中' : '✨ 上新'}</span></div>
          ${L.length ? `<div class="rd-gcols"><div>${a.map(card).join('')}</div><div>${b.map(card).join('')}</div></div>` : '<div class="gys-empty">这家店还没有商品</div>'}</div>`; } }); };
R.shopF = name => { const S = (D.shops || {})[name]; if (!S) return; S.f = !S.f; saveD(); G.repaint(APP); X.toast(S.f ? X.v('关注了这家店', '已关注店铺') : '取消关注', ''); };
R.shopMore = async name => { if (BUSY['sh' + name]) return; BUSY['sh' + name] = 1; G.repaint(APP); try { const have = (D.goods || []).filter(g => g.shop === name).map(g => g.name).join('、') || '（还没有）'; const o = X.json(await X.ask(P('red.shop', DEF_SHOP, { 店: name, 已有: have, 条数: 6 }))); if (Array.isArray(o)) { o.filter(x => x && x.name).forEach(x => (D.goods = D.goods || []).push({ id: G.uid('rg'), name: X.plain(x.name).slice(0, 40), shop: name, price: Math.max(1, Math.round((+x.price || 59) * 100) / 100), emo: X.plain(x.emo || '🛍️').slice(0, 4), desc: X.plain(x.desc || '').slice(0, 120), sold: +x.sold || G.rnd(10, 9999), tags: (x.tags || []).slice(0, 3).map(t => X.plain(t).slice(0, 8)), at: Date.now(), keep: 1 })); saveD(); } } catch (e) {} finally { BUSY['sh' + name] = 0; G.repaint(APP); } };
window.gysRedOpenCart = () => { G.open(APP, 'mall'); R.cart(); };
/* ---------------- 外壳 ---------------- */
const STYLE = '- 这是「小红书」：昵称多半带 emoji 或「是xx呀」「xx酱」这种；简介写星座、城市、职业、爱好、「日常分享」「不定期更新」；tags 写 2~4 个（星座、城市、学校、MBTI 之类）；粉丝数按身份给';
G.app(APP, {
    tabs: [['home', 'i:home', '首页'], ['mall', 'i:bag', '市集'], ['post', 'i:plus', ''], ['msg', 'i:chat', '消息', () => unread() || ''], ['me', 'i:person', '我']],
    head, render: t => t === 'post' ? composeHtml() : t === 'mall' ? mallTab() : t === 'msg' ? msgTab() : t === 'me' ? meTab() : home(),
    onOpen: async () => { await migrate(); syncPhone(); if (!D.notes.some(n => n.by !== 'me') && !BUSY['f推荐']) genFeed('推荐'); else if (Date.now() - (D.last['feedf推荐'] || 0) > 4 * 3600e3 && !BUSY['f推荐']) genFeed('推荐'); const L = cast().filter(w => !G.prof(APP, w).gen); if (L.length) G.genProfiles(APP, L.slice(0, 8), STYLE).then(() => G.repaint(APP)); }
});
window.gysRedOpen = tab => G.open(APP, tab);
window.gysRedOpenNote = id => { G.open(APP); R.open(id); };
window.gysRedLive = () => { G.open(APP); R.liveList(); };
window.gysRedOpenOrders = () => { G.open(APP, 'mall'); R.orders(); };
// 老小红书的入口 / 通知还能用
window.gyxRedOpen = () => G.open(APP);
window.gyxRedView = id => window.gysRedOpenNote(id);

/* ---------------- 谷雨这边 ---------------- */
X.mini({ id: 'gysRed', icon: '📕', title: '小红书', desc: '刷笔记、发笔记、收藏夹、市集、购物车；TA 发笔记、偷偷收藏', cat: '软件', onOpen: () => G.open(APP) }, 'gysRed');
const rare = (c, k, h) => Date.now() - ((D.last[k + c.id]) || 0) > h * 3600e3;
const mark = (c, k) => { D.last[k + c.id] = Date.now(); saveD(); };
/* ---------------- 🔴 直播 ---------------- */
const liveTop = () => { const L = (D.lives || []).filter(x => x.on); return `<div class="rd-livebar" onclick="gysRd.liveList()">${L.length ? `<span class="rd-livedot"></span><b>${L.length}</b> 个直播间正在直播 · 点进去看` : '🔴 看看谁在直播'}</div>`; };
R.liveList = () => { if (!(D.lives || []).some(x => x.on) && !BUSY.live) genLives(); G.push(APP, { title: '直播', right: '<span onclick="gysRd.liveGen()">' + G.ic('film', 22) + '</span>', html: () => `${BUSY.live ? '<div class="gys-busy">⏳ 正在找直播间…</div>' : ''}<div class="rd-livegrid">${(D.lives || []).filter(x => x.on).map(v => `<div class="rd-lcard" onclick="gysRd.liveOpen('${v.id}')"><div class="rd-lcover" style="background:${picBg(v.title)}"><b>${esc(v.cover || '🔴')}</b><i class="rd-ltag">🔴 直播中</i><em>${G.fmtN(v.viewers)}人</em></div><b>${esc(v.title)}</b><small>${esc(nameOf(v.host))}</small></div>`).join('') || '<div class="gys-empty">现在没人直播，点右上角刷新</div>'}</div>` }); };
R.liveOpen = id => { const v = (D.lives || []).find(x => x.id === id); if (!v) return; G.push(APP, { id: 'live_' + id, title: '', cls: 'rd-liveb', html: () => liveHtml(v), foot: () => `<div class="rd-lfoot"><input id="rd-ldm" placeholder="说点什么…"><span class="gys-btn sm" onclick="gysRd.liveSay('${id}')">发</span><span class="rd-lheart" onclick="gysRd.liveHeart('${id}')">❤️</span></div>` }); };
function liveHtml(v) { return `<div class="rd-lstage" style="background:linear-gradient(160deg,${picBg(v.title)},#1a1a1a)"><span class="rd-lbig">${esc(v.cover || '🔴')}</span><div class="rd-lhost">${G.av(APP, v.host, 34)}<b>${esc(nameOf(v.host))}</b><i class="rd-ltag">🔴 ${G.fmtN(v.viewers)}</i></div><h3 class="rd-ltitle">${esc(v.title)}</h3></div>${(v.goods || []).length ? `<div class="rd-lgoods">${v.goods.map((g, i) => `<div class="rd-lgood"><b>${i + 1}</b><span>${esc(g.name)}</span><em>¥${esc(g.price)}</em></div>`).join('')}</div>` : ''}<div class="rd-ldanmu">${(v.danmu || []).slice(-40).map(d => `<div class="${d.by === 'me' ? 'me' : ''}"><b>${esc(nameOf(d.by) || d.by)}</b>${d.heart ? ' 送出 ❤️' : '：' + esc(d.text)}</div>`).join('') || '<div class="rd-ltip">抢个前排~</div>'}</div>`; }
R.liveSay = async id => { const v = (D.lives || []).find(x => x.id === id); if (!v) return; const el = document.getElementById('rd-ldm'); const t = el && el.value.trim(); if (!t) return; el.value = ''; (v.danmu = v.danmu || []).push({ by: 'me', text: X.plain(t).slice(0, 100) }); saveD(); G.repaint(APP); liveReact(v, t); };
R.liveHeart = id => { const v = (D.lives || []).find(x => x.id === id); if (!v) return; (v.danmu = v.danmu || []).push({ by: 'me', heart: 1 }); saveD(); G.repaint(APP); };
async function liveReact(v, t) { const host = charOfW(v.host); if (!host || BUSY['lr' + v.id]) return; BUSY['lr' + v.id] = 1; try { const o = X.json(await X.ask(`${X.who(host)}\n你正在小红书直播「${v.title}」。有观众发弹幕：「${t}」，还有一堆观众也在刷。写主播（你）回应这条的一句话，再加 2~3 条别的观众弹幕。只输出 JSON：{"host":"你的回应","danmu":[{"by":"网名","text":"弹幕"}]}`)); if (o) { if (o.host) v.danmu.push({ by: v.host, text: X.plain(o.host).slice(0, 120) }); (o.danmu || []).slice(0, 3).forEach(d => v.danmu.push({ by: whoByName(d.by) || d.by, text: X.plain(d.text || '').slice(0, 80) })); if (v.danmu.length > 60) v.danmu = v.danmu.slice(-60); saveD(); G.repaint(APP); } } finally { delete BUSY['lr' + v.id]; } }
async function genLives() { if (BUSY.live) return; BUSY.live = 1; G.repaint(APP); try { const pool = cast().sort(() => Math.random() - 0.5).slice(0, 4); const o = X.json(await X.ask(`小红书「直播」页。可能开播的人：\n${castLines(pool)}\n还有陌生主播（起网名）。写 3 个正在直播的直播间：标题、封面 emoji、在线人数、2~3 件带货商品（名字+价格）、4~6 条开场弹幕。只输出 JSON 数组：[{"host":"名字","cover":"emoji","title":"直播标题","viewers":数字,"goods":[{"name":"商品","price":"99"}],"danmu":[{"by":"网名","text":"弹幕"}]}]`)); (D.lives || []).forEach(x => x.on = false); (Array.isArray(o) ? o : []).forEach(x => { if (!x || !x.title) return; const h = whoByName(x.host) || passer(x.host); (D.lives = D.lives || []).unshift({ id: G.uid('lv'), host: h, cover: String(x.cover || '🔴').slice(0, 2), title: X.plain(x.title).slice(0, 50), viewers: Math.max(1, Number(x.viewers) || G.rnd(50, 9999)), goods: (x.goods || []).slice(0, 4).map(g => ({ name: X.plain(g.name || '').slice(0, 30), price: String(g.price || '').slice(0, 10) })), danmu: (x.danmu || []).slice(0, 6).map(d => ({ by: whoByName(d.by) || d.by, text: X.plain(d.text || '').slice(0, 80) })), on: true, at: Date.now() }); }); if (D.lives.length > 30) D.lives.length = 30; saveD(); } finally { delete BUSY.live; G.repaint(APP); } }
R.liveGen = () => genLives();

/* ---------------- 📊 年度报告 ---------------- */
R.yearReport = () => { const y = new Date().getFullYear(), mine = D.notes.filter(n => n.by === 'me'); const got = mine.reduce((a, n) => a + (n.likes || []).length + Object.keys(n.favBy || {}).length, 0); const favN = D.notes.filter(n => (n.favs || []).includes('me')).length, likeN = D.notes.filter(n => (n.likes || []).includes('me')).length, foll = following().length; const chT = {}; mine.forEach(n => { if (n.ch) chT[n.ch] = (chT[n.ch] || 0) + 1; }); const topCh = Object.entries(chT).sort((a, b) => b[1] - a[1])[0]; const taFav = D.notes.filter(n => Object.keys(n.favBy || {}).length).length;
    G.push(APP, { title: y + ' 年度报告', cls: 'rd-yrb', html: () => `<div class="rd-yr"><div class="rd-yrhead"><em>我的小红书</em><h1>${y} 年度报告</h1></div><div class="rd-yrgrid"><div><b>${mine.length}</b><em>篇笔记</em></div><div><b>${G.fmtN(got)}</b><em>获赞与收藏</em></div><div><b>${favN}</b><em>收藏过</em></div><div><b>${likeN}</b><em>点赞过</em></div><div><b>${foll}</b><em>关注</em></div><div><b>${taFav}</b><em>被 TA 收藏</em></div></div>${topCh ? `<p class="rd-yrline">这一年你最常逛「${esc(topCh[0])}」</p>` : ''}${taFav ? `<p class="rd-yrline">有 ${taFav} 篇笔记，被 TA 悄悄收藏过 💗</p>` : ''}<div class="gys-acts"><span class="gys-btn" onclick="gysRd.yearWord()">💌 让 TA 写句年度寄语</span></div><div id="rd-yrword"></div></div>` }); };
R.yearWord = async () => { const c = X.cur() || G.chars()[0]; if (!c) return; const box = document.getElementById('rd-yrword'); if (box) box.innerHTML = '<div class="gys-busy">⏳ TA 在想…</div>'; const t = X.plain(await X.ask(`${X.who(c)}\n看着她这一年的小红书（发了 ${D.notes.filter(n => n.by === 'me').length} 篇笔记），给她写一句年度寄语，暖一点、像你会说的。只写那一句。`) || ''); const b2 = document.getElementById('rd-yrword'); if (b2) b2.innerHTML = t ? `<div class="rd-yrword">${esc(t)}<em>—— ${esc(c.name)}</em></div>` : ''; };

X.action({ key: 'gys_red_live', label: '在小红书开直播，叫她来看', hint: '带货 / 唠嗑 / 才艺', need: c => rare(c, 'lv', 36), run: async c => { mark(c, 'lv'); const o = X.json(await X.ask(`${X.who(c)}\n你在小红书开了个直播。只输出 JSON：{"cover":"emoji","title":"直播标题","goods":[{"name":"商品","price":"99"}]}`)); if (!o || !o.title) return null; (D.lives || []).forEach(x => x.on = false); (D.lives = D.lives || []).unshift({ id: G.uid('lv'), host: 'c:' + c.id, cover: String(o.cover || '🔴').slice(0, 2), title: X.plain(o.title).slice(0, 50), viewers: G.rnd(20, 3000), goods: (o.goods || []).slice(0, 4).map(g => ({ name: X.plain(g.name || '').slice(0, 30), price: String(g.price || '').slice(0, 10) })), danmu: [], on: true, at: Date.now() }); saveD(); G.notify(APP, c, `📕 <b>${X.esc(c.name)}</b> 开直播了`, o.title, X.go('gysRedLive')); return { text: '在小红书开了直播：' + o.title, selfNotified: true }; } }, 'gysRed');

X.action({ key: 'gys_red_buy', label: '在小红书市集偷偷给她买了个东西', hint: '刷到觉得她会喜欢的', need: c => rare(c, 'buy', 120) && (D.goods || []).length > 0, run: async c => {
    mark(c, 'buy'); const L = (D.goods || []).slice(0, 10); const o = X.json(await X.ask(`${X.who(c)}\n你在逛小红书市集，看到：\n${L.map((g, i) => `${i + 1}. ${g.name}（¥${g.price}）${g.desc}`).join('\n')}\n挑一件想买给她的（按你的性格和对她的了解，不想买就 {"i":0}），再写一句附言。只输出 JSON：{"i":序号,"say":"附言"}`)); const k = o && Number(o.i); const g = k && L[k - 1]; if (!g) return null;
    (D.orders = D.orders || []).unshift({ id: G.uid('ro'), gid: g.id, name: g.name, emo: g.emo, price: g.price, to: 'me', from: 'c:' + c.id, say: X.plain(o.say || '').slice(0, 80), at: Date.now() }); g.keep = 1; saveD();
    G.notify(APP, c, `📦 <b>${X.esc(c.name)}</b> 在小红书市集给你买了东西`, g.name + (o.say ? '：' + o.say : ''), X.go('gysRedOpenOrders'));
    return { text: `在小红书市集给她买了「${g.name}」${o.say ? '，附言：' + o.say : ''}`, selfNotified: true };
} }, 'gysRed');
X.action({ key: 'gys_red_post', label: '发一篇小红书', hint: '日常、攻略、种草，偶尔偷偷写点跟她有关的', need: c => rare(c, 'p', 10), run: async c => { mark(c, 'p'); const n = await taPost(c); return n ? { text: '发了一篇小红书：' + n.title, selfNotified: true, jump: X.go('gysRedOpenNote', n.id) } : null; } }, 'gysRed');
X.action({ key: 'gys_red_fav', label: '刷小红书，偷偷收藏一篇（多半跟她有关）', hint: '她看得到你收藏了什么，但你不会说', need: c => D.notes.length >= 3 && rare(c, 'f', 12), run: async c => { mark(c, 'f'); const n = await taFav(c); return n ? { text: '偷偷收藏了一篇小红书', selfNotified: true, secret: true } : null; } }, 'gysRed');
X.action({ key: 'gys_red_cmt', label: '去评论她的小红书', hint: '她发了笔记，你去评论区说一句', need: c => D.notes.some(n => n.by === 'me' && n.vis !== 'self' && Date.now() - n.at < 3 * 86400e3 && !flat(n.cmts).some(k => k.by === 'c:' + c.id)), run: async c => { const n = D.notes.find(n => n.by === 'me' && n.vis !== 'self' && !flat(n.cmts).some(k => k.by === 'c:' + c.id)); if (!n) return null; const t = X.plain(await X.ask(`${X.who(c)}\n${X.me(c)}在小红书上发了一篇笔记「${n.title}」：${n.body.slice(0, 200)}\n你在评论区说一句（公开场合，别人也看得到）。只写评论。`) || ''); if (!t) return null; n.cmts.push({ id: G.uid('c'), by: 'c:' + c.id, text: t.slice(0, 200), at: Date.now(), likeN: 0, likes: [], kids: [] }); if (!n.likes.includes('c:' + c.id)) n.likes.push('c:' + c.id); act('cmt', 'c:' + c.id, n.id, t); saveD(); G.notify(APP, c, `📕 <b>${X.esc(c.name)}</b> 评论了你的小红书`, t, X.go('gysRedOpenNote', n.id)); return { text: '评论了她的小红书', selfNotified: true }; } }, 'gysRed');
X.action({ key: 'gys_red_alt', label: '用小红书小号发一篇求问帖', hint: '关于她的事想问问网友，匿名的', need: c => rare(c, 'a', 72), run: async c => { mark(c, 'a'); const n = await taPost(c, '', true); return n ? { text: '用小号在小红书发了一篇求问帖（没告诉她）', selfNotified: true, secret: true } : null; } }, 'gysRed');
X.today(() => { const d = X.day(); const L = D.notes.filter(n => X.day(new Date(n.at)) === d && (n.by === 'me' || charOfW(n.by))); if (!L.length) return null; return { title: '📕 小红书', rows: L.slice(0, 3).map(n => ({ t: nameOf(n.by), x: n.title || n.body.slice(0, 30), go: X.go('gysRedOpenNote', n.id) })) }; }, 'gysRed');
X.widget('gysRedW', { n: '小红书', sizes: ['m'], tap: () => G.open(APP), r: () => { const L = D.notes.filter(n => n.vis !== 'self').slice(0, 3); return `<div style="padding:10px;font-size:12px;line-height:1.7"><b style="color:#ff2442">📕 小红书</b>${unread() ? ` <span style="color:#ff2442">${unread()}</span>` : ''}<br>${L.map(n => esc(n.title || n.body).slice(0, 18)).join('<br>') || '打开刷一刷'}</div>`; } }, 'gysRed');
X.mem({ k: 'gysRed', ico: '📕', n: 'TA 的小红书', d: 'TA 发的笔记（含小号）和偷偷收藏的（改了就是改内容，删了就没了）', items: c => D.notes.filter(n => n.by === 'c:' + c.id || altOwner(n.by) === 'c:' + c.id || (n.favBy || {})[c.id]), text: n => n.title + '｜' + n.body, edit: (n, v) => { const [t, ...b] = String(v).split('｜'); n.title = t.slice(0, 30); if (b.length) n.body = b.join('｜'); }, del: (c, i) => { const L = D.notes.filter(n => n.by === 'c:' + c.id || altOwner(n.by) === 'c:' + c.id || (n.favBy || {})[c.id]); const n = L[i]; if (!n) return; if ((n.favBy || {})[c.id] && n.by !== 'c:' + c.id) delete n.favBy[c.id]; else D.notes = D.notes.filter(x => x !== n); }, meta: n => G.ago(n.at) + (isX(n.by) ? ' · 小号' : '') + (n.by.startsWith('c:') ? '' : ' · 收藏的'), save: () => saveD() }, 'gysRed');
X.ctx(id => {
    const c = X.char(id); if (!c) return ''; const w = 'c:' + c.id, L = [];
    D.notes.filter(n => n.by === w).slice(0, 2).forEach(n => L.push('你发的：' + n.title));
    D.notes.filter(n => (n.favBy || {})[c.id]).slice(0, 2).forEach(n => L.push(`你偷偷收藏了「${n.title}」（${n.favBy[c.id]}；别主动说出来）`));
    D.notes.filter(n => n.by === 'me' && n.vis !== 'self').slice(0, 2).forEach(n => L.push('她发的：' + n.title));
    const alt = D.notes.find(n => altOwner(n.by) === w); if (alt) L.push(`你用小号发过求问帖「${alt.title}」${D.xacc[alt.by].found ? '（她已经发现是你了）' : '（她不知道）'}`);
    return L.length ? `【小红书】${L.join('；')}` : '';
}, 'gysRed');
X.inj('gysRed', [['小红书', '小红书：TA 发的 / 偷偷收藏的 / 用小号发的 / 她最近发的', 'TA 偷偷收藏的那条会叮嘱 TA 别主动说出来']]);

X.css('gys-red-css', `
.rd-livebar{margin:10px 12px;padding:10px 14px;border-radius:12px;background:linear-gradient(90deg,#ff2442,#ff6b4a);color:#fff;font-size:13.5px;display:flex;align-items:center;gap:6px;cursor:pointer}.rd-livebar b{font-size:15px}
.rd-livedot{width:8px;height:8px;border-radius:50%;background:#fff;animation:rdblink 1s infinite}@keyframes rdblink{50%{opacity:.3}}
.rd-livegrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px}
.rd-lcard{cursor:pointer}.rd-lcover{position:relative;height:150px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:46px;color:#fff;margin-bottom:6px}
.rd-ltag{position:absolute;left:6px;top:6px;font-size:11px;font-style:normal;background:rgba(255,36,66,.9);color:#fff;border-radius:6px;padding:1px 6px}
.rd-lcover em{position:absolute;right:6px;bottom:6px;font-style:normal;font-size:11px;background:rgba(0,0,0,.4);border-radius:6px;padding:1px 6px}
.rd-lcard b{font-size:14px;display:block}.rd-lcard small{color:#999}
.rd-lstage{height:260px;color:#fff;position:relative;display:flex;align-items:center;justify-content:center}.rd-lbig{font-size:84px}
.rd-lhost{position:absolute;left:12px;top:12px;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.3);border-radius:20px;padding:4px 12px 4px 4px}.rd-lhost b{font-size:13px}.rd-lhost .rd-ltag{position:static}
.rd-ltitle{position:absolute;left:14px;bottom:12px;margin:0;font-size:16px;text-shadow:0 1px 4px rgba(0,0,0,.5)}
.rd-lgoods{padding:8px 12px;display:flex;flex-direction:column;gap:6px}.rd-lgood{display:flex;align-items:center;gap:10px;background:#fff;border-radius:10px;padding:8px 12px;font-size:14px}body.dark-theme .rd-lgood{background:#1c1c1e}.rd-lgood b{width:20px;height:20px;border-radius:50%;background:#ff2442;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.rd-lgood span{flex:1}.rd-lgood em{color:#ff2442;font-style:normal;font-weight:700}
.rd-ldanmu{padding:8px 14px 70px;display:flex;flex-direction:column;gap:6px}.rd-ldanmu>div{font-size:13.5px;background:rgba(0,0,0,.05);border-radius:12px;padding:5px 10px;align-self:flex-start;max-width:85%}body.dark-theme .rd-ldanmu>div{background:rgba(255,255,255,.08)}.rd-ldanmu>div.me{align-self:flex-end;background:rgba(255,36,66,.12)}.rd-ldanmu b{color:#ff2442;margin-right:4px}.rd-ltip{color:#999;align-self:center!important;background:none!important}
.rd-lfoot{position:absolute;left:0;right:0;bottom:0;display:flex;gap:8px;align-items:center;padding:8px 12px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));background:var(--gys-bg,#fff)}body.dark-theme .rd-lfoot{background:#111}.rd-lfoot input{flex:1;border:1px solid rgba(0,0,0,.12);border-radius:18px;padding:8px 14px;font-size:14px;background:transparent;color:inherit}.rd-lheart{font-size:24px;cursor:pointer}
.rd-yr{padding:20px 16px;text-align:center}.rd-yrhead em{color:#ff2442;font-style:normal;font-size:14px}.rd-yrhead h1{font-size:30px;margin:4px 0 18px}
.rd-yrgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.rd-yrgrid>div{background:#fff;border-radius:14px;padding:14px 6px}body.dark-theme .rd-yrgrid>div{background:#1c1c1e}.rd-yrgrid b{display:block;font-size:24px;color:#ff2442}.rd-yrgrid em{font-style:normal;font-size:12px;color:#999}
.rd-yrline{color:#555;font-size:14px;margin:14px 0 0}body.dark-theme .rd-yrline{color:#bbb}
.rd-yrword{margin-top:12px;background:#fff;border-radius:14px;padding:14px;font-size:15px;line-height:1.7;text-align:left}body.dark-theme .rd-yrword{background:#1c1c1e}.rd-yrword em{display:block;text-align:right;color:#999;font-style:normal;margin-top:6px}
.gys-red{--gys-accent:#ff2442;background:#f5f5f5}
body.dark-theme .gys-red{background:#0b0b0b}
.gys-red .gys-hd,.gys-red .gys-tabs{background:#fff}body.dark-theme .gys-red .gys-hd,body.dark-theme .gys-red .gys-tabs{background:#141414}
.gys-red .gys-tb.on{color:#1f1f1f}body.dark-theme .gys-red .gys-tb.on{color:#fff}
.gys-red .gys-tb:nth-child(2) i{background:#ff2442;color:#fff;border-radius:8px;width:40px;height:28px;line-height:28px;text-align:center;font-size:18px}
.rd-top{position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:22px;font-size:16px;color:#999}.rd-top span{cursor:pointer;padding-bottom:4px}.rd-top span.on{color:#1f1f1f;font-weight:700;box-shadow:inset 0 -2px 0 #ff2442}body.dark-theme .rd-top span.on{color:#fff}
.gys-red .gys-hr span{font-size:20px}
.rd-chs{display:flex;gap:16px;overflow-x:auto;padding:10px 12px;background:#fff;font-size:14px;color:#666;white-space:nowrap;scrollbar-width:none}body.dark-theme .rd-chs{background:#141414;color:#aaa}.rd-chs span{cursor:pointer}.rd-chs span.on{color:#1f1f1f;font-weight:700}body.dark-theme .rd-chs span.on{color:#fff}
.rd-near{padding:10px 14px;font-size:13px;color:#666}
.rd-pull{text-align:center;font-size:12px;color:#999;padding:8px;cursor:pointer}
.rd-grid{columns:2;column-gap:6px;padding:0 6px 20px}
.rd-card{break-inside:avoid;background:#fff;border-radius:8px;overflow:hidden;margin-bottom:6px;cursor:pointer;position:relative;display:inline-block;width:100%}body.dark-theme .rd-card{background:#1a1a1a}
.rd-cv{width:100%;background-size:cover;background-position:center}.rd-cv.t{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px;box-sizing:border-box}.rd-cv.t b{font-size:34px}.rd-cv.t em{font-style:normal;font-size:13px;color:#4a3b3b;text-align:center;font-weight:600;line-height:1.4}
.rd-flag{position:absolute;top:6px;left:6px;font-style:normal;font-size:10.5px;background:rgba(0,0,0,.45);color:#fff;border-radius:4px;padding:1px 6px}
.rd-ct{font-size:13.5px;line-height:1.45;padding:7px 8px 4px;font-weight:500;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rd-cb{display:flex;align-items:center;gap:5px;padding:2px 8px 9px;font-size:11.5px;color:#666}.rd-cb span:not(.gys-av){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rd-cb i{font-style:normal;cursor:pointer;white-space:nowrap}
.rd-nb{background:#fff}body.dark-theme .rd-nb{background:#141414}
.rd-au{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:500;cursor:pointer;min-width:0}.rd-au span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px}
.rd-fbtn{margin-left:auto;font-size:13px;color:#ff2442;border:1px solid #ff2442;border-radius:999px;padding:3px 14px;cursor:pointer;white-space:nowrap}.rd-fbtn.on{color:#999;border-color:#ddd}
.rd-slides{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.rd-slides::-webkit-scrollbar{display:none}
.rd-sl{flex:0 0 100%;aspect-ratio:3/4;max-height:70vh;scroll-snap-align:start;background-size:cover;background-position:center}.rd-sl.t{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}.rd-sl.t b{font-size:60px}.rd-sl.t em{font-style:normal;font-size:16px;color:#4a3b3b;font-weight:600;padding:0 20px;text-align:center}
.rd-dots{display:flex;justify-content:center;gap:5px;padding:8px}.rd-dots i{width:6px;height:6px;border-radius:50%;background:#ddd}.rd-dots i.on{background:#ff2442}
.rd-nt{font-size:17px;font-weight:700;padding:6px 16px;line-height:1.5}
.rd-nx{font-size:15px;line-height:1.75;padding:0 16px;white-space:pre-wrap;word-break:break-word}
.rd-tags{padding:8px 16px}.rd-tg{color:#13386c;cursor:pointer}body.dark-theme .rd-tg{color:#7aa7e8}
.rd-meta{font-size:12px;color:#999;padding:6px 16px}.rd-meta a{color:#13386c}
.rd-favby{margin:8px 16px;padding:8px 12px;background:#fff6e5;border-radius:8px;font-size:13px;color:#b5651d}.rd-favby em{font-style:normal;display:block;font-size:12px;opacity:.8}
.rd-ch{font-size:13px;color:#666;padding:14px 16px 4px;border-top:.5px solid #eee;margin-top:10px}body.dark-theme .rd-ch{border-color:#222}
.rd-cm{display:flex;gap:10px;padding:10px 16px 0}.rd-cm.kid{padding:8px 0 0}
.rd-cmb{flex:1;min-width:0;border-bottom:.5px solid #f2f2f2;padding-bottom:10px}.rd-cm.kid .rd-cmb{border:0;padding-bottom:0}body.dark-theme .rd-cmb{border-color:#222}
.rd-cn{font-size:13px;color:#999;cursor:pointer}.rd-au-t{font-style:normal;font-size:10px;color:#fff;background:#ff2442;border-radius:3px;padding:0 4px;margin-left:4px}
.rd-cx{font-size:14.5px;line-height:1.55;margin:3px 0;cursor:pointer}
.rd-cmeta{display:flex;gap:10px;align-items:center;font-size:12px;color:#aaa}.rd-cmeta a{cursor:pointer}.rd-cmeta i{font-style:normal;margin-left:auto;cursor:pointer}
.rd-bar{display:flex;align-items:center;gap:12px;padding:8px 12px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));border-top:.5px solid #eee;background:#fff}body.dark-theme .rd-bar{background:#141414;border-color:#222}
.rd-bar input{flex:1;min-width:0;border:none;background:#f5f5f5;border-radius:999px;padding:9px 14px;font-size:14px;color:inherit;outline:none}body.dark-theme .rd-bar input{background:#222}
.rd-bar>span{display:flex;flex-direction:column;align-items:center;font-size:18px;cursor:pointer}.rd-bar em{font-style:normal;font-size:10.5px;color:#666}.rd-send{font-size:14px!important;color:#fff;background:#ff2442;border-radius:999px;padding:6px 14px}
.rd-mall{padding-bottom:20px}.rd-mtop{display:flex;justify-content:space-between;padding:10px 14px;font-size:13.5px;color:#666}.rd-mtop span{cursor:pointer}.rd-gcols{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 6px}.rd-gcols>div{display:flex;flex-direction:column;gap:6px}
.rd-gc{background:#fff;border-radius:8px;overflow:hidden;cursor:pointer}body.dark-theme .rd-gc{background:#1c1c1c}.rd-gimg{display:flex;align-items:center;justify-content:center;aspect-ratio:1;background:#eee center/cover}.rd-gimg i{font-style:normal;font-size:56px}.rd-gc b{display:block;margin:6px 8px 2px;font-size:13.5px;font-weight:500;line-height:1.35;max-height:2.7em;overflow:hidden}.rd-gp{display:flex;align-items:baseline;justify-content:space-between;padding:0 8px}.rd-gp em{font-style:normal;color:#ff2442;font-size:12px}.rd-gp u{text-decoration:none;font-size:16px;font-weight:600}.rd-gp small,.rd-gs{font-size:11px;color:#999}.rd-gs{display:block;padding:2px 8px 8px}
.rd-gd{padding-bottom:20px}.rd-gdimg{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:#eee center/cover;cursor:pointer}.rd-gdimg i{font-style:normal;font-size:120px}.rd-gdimg small{position:absolute;right:10px;bottom:10px;background:rgba(0,0,0,.4);color:#fff;font-size:11px;border-radius:9px;padding:2px 8px}.rd-gdp{padding:12px 16px 0;color:#ff2442;font-size:14px}.rd-gdp b{font-size:24px}.rd-gdp small{color:#999;margin-left:10px;font-size:12px}.rd-gd h3{margin:6px 16px;font-size:17px}.rd-gd p{margin:4px 16px;color:#555;font-size:14px;line-height:1.6}.rd-gshop{margin:12px 16px;padding:10px;border-radius:8px;background:#f6f6f6;font-size:14px}body.dark-theme .rd-gshop{background:#222}
.rd-gbar{display:flex;gap:8px;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));border-top:.5px solid #eee;background:inherit}.rd-gbar span{flex:1;text-align:center;padding:11px;border-radius:999px;background:#ff2442;color:#fff;font-weight:600;cursor:pointer}.rd-gbar span.g{background:#ffb300}.rd-oico{width:44px;height:44px;border-radius:8px;background:#f6f6f6;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.rd-drbar{display:flex;align-items:center;gap:6px;margin:-4px 0 10px;padding:9px 12px;border-radius:10px;background:#f6f6f6;font-size:14px;cursor:pointer}body.dark-theme .rd-drbar{background:#222}.rd-drbar b{background:#ff2442;color:#fff;border-radius:9px;padding:0 6px;font-size:11px}.rd-drbar em{margin-left:auto;font-style:normal;color:#999;font-size:12px}
.rd-drgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px}.rd-dr{background:#fff;border-radius:8px;overflow:hidden;cursor:pointer}body.dark-theme .rd-dr{background:#1c1c1c}.rd-dr>span{display:flex;align-items:center;justify-content:center;aspect-ratio:3/4;background:#eee center/cover no-repeat;font-size:15px;padding:10px;box-sizing:border-box;text-align:center;color:#555}.rd-dr>span.t{background:linear-gradient(135deg,#ffe3e3,#ffd0d8)}.rd-dr b{display:block;padding:7px 9px 2px;font-size:13.5px;font-weight:500;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.rd-dr small{display:flex;justify-content:space-between;padding:0 9px 8px;color:#999;font-size:11.5px}.rd-dr small i{font-style:normal;color:#ff2442}
.rd-cmp{background:#fff;min-height:100%;padding:12px 16px}body.dark-theme .rd-cmp{background:#141414}
.rd-cimgs{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px}.rd-cimgs span{flex:0 0 86px;height:110px;border-radius:8px;background:#f5f5f5 center/cover;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#bbb;font-size:28px;cursor:pointer}.rd-cimgs span em{font-style:normal;font-size:11px}.rd-cimgs b{position:absolute;top:3px;right:3px;background:rgba(0,0,0,.5);color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center}
.rd-cmp input,.rd-cmp textarea{width:100%;box-sizing:border-box;border:none;border-bottom:.5px solid #eee;padding:12px 0;font-size:16px;background:transparent;color:inherit;outline:none;font-family:inherit;resize:vertical}.rd-cmp #rdT{font-weight:700;font-size:17px}
.rd-tc{display:block;text-align:right;font-size:11px;color:#bbb}
.rd-ctool{display:flex;gap:10px;padding:10px 0}.rd-ctool span{font-size:13px;background:#f5f5f5;border-radius:999px;padding:4px 12px;cursor:pointer}body.dark-theme .rd-ctool span{background:#222}
.rd-crow{display:flex;justify-content:space-between;padding:13px 0;border-bottom:.5px solid #f2f2f2;font-size:14.5px;cursor:pointer}.rd-crow em{font-style:normal;color:#ccc}body.dark-theme .rd-crow{border-color:#222}
.rd-pub{width:100%;padding:12px}
.rd-sbox{display:flex;gap:8px;align-items:center;margin:10px 14px}.rd-sbox input{flex:1;min-width:0;border:none;background:#fff;border-radius:999px;padding:9px 14px;font-size:14px;color:inherit;outline:none}body.dark-theme .rd-sbox input{background:#1a1a1a}.rd-sbox span{color:#ff2442;cursor:pointer;font-size:14px;white-space:nowrap}
.rd-sech{display:flex;justify-content:space-between;padding:14px 16px 6px;font-size:14px;font-weight:600}.rd-sech a{font-weight:400;color:#999;font-size:12.5px;cursor:pointer}
.rd-chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px}.rd-chips span{background:#fff;border-radius:999px;padding:4px 12px;font-size:13px;cursor:pointer}body.dark-theme .rd-chips span{background:#1a1a1a}
.rd-hot{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;padding:0 16px;font-size:14px}.rd-hot div{padding:7px 0;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rd-hot b{display:inline-block;width:20px;color:#999}.rd-hot b.r{color:#ff2442}.rd-hot i{font-style:normal;font-size:10px;color:#fff;background:#ff2442;border-radius:3px;padding:0 3px}
.rd-urow{display:flex;align-items:center;gap:12px;padding:11px 16px;background:#fff;cursor:pointer;border-bottom:.5px solid #f2f2f2}body.dark-theme .rd-urow{background:#141414;border-color:#222}.rd-urow>div{flex:1;min-width:0}.rd-urow b{font-size:15px;font-weight:500}.rd-urow em{display:block;font-style:normal;font-size:12.5px;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rd-urow small{font-size:11px;color:#bbb;display:flex;flex-direction:column;align-items:flex-end;gap:3px}.rd-urow sup{background:#ff2442;color:#fff;border-radius:999px;padding:0 6px;font-size:10px}
.rd-pfb{background:#fff}body.dark-theme .rd-pfb{background:#141414}
.rd-pfbg{background-size:cover;background-position:center}
.rd-pfin{background:linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.55));color:#fff;padding:20px 16px 14px}
.rd-pfr{display:flex;align-items:center;gap:14px}.rd-pfr b{font-size:20px}.rd-pfr em{display:block;font-style:normal;font-size:11.5px;opacity:.85;margin-top:4px}
.rd-pfbio{font-size:13.5px;margin:12px 0 6px;line-height:1.6;white-space:pre-wrap}
.rd-pftags{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.rd-pftags span{font-size:11.5px;background:rgba(255,255,255,.2);border-radius:999px;padding:2px 9px}
.rd-pfn{display:flex;gap:18px;align-items:center;margin-top:12px;font-size:12px;opacity:.95}.rd-pfn span{display:flex;flex-direction:column;align-items:center}.rd-pfn b{font-size:16px}.rd-pfn i{margin-left:auto;display:flex;gap:8px;font-style:normal}
.rd-pbtn{border:1px solid rgba(255,255,255,.8);border-radius:999px;padding:5px 14px;font-size:13px;cursor:pointer}.rd-pbtn.on{opacity:.7}
.rd-pfops{margin-top:10px;font-size:12px;display:flex;gap:14px}.rd-pfops a{color:#fff;opacity:.85;cursor:pointer;text-decoration:underline}
.rd-ptabs{display:flex;justify-content:center;gap:30px;padding:12px;font-size:15px;color:#999;border-bottom:.5px solid #f2f2f2;position:sticky;top:0;background:inherit;z-index:1}.rd-ptabs span{cursor:pointer;padding-bottom:4px}.rd-ptabs span.on{color:#1f1f1f;font-weight:700;box-shadow:inset 0 -2px 0 #ff2442}body.dark-theme .rd-ptabs span.on{color:#fff}
.rd-boards{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px}.rd-boards div{background:#f7f7f7;border-radius:10px;padding:18px 12px;cursor:pointer}body.dark-theme .rd-boards div{background:#1f1f1f}.rd-boards b{display:block;font-size:14px}.rd-boards em{font-style:normal;font-size:12px;color:#999}
.rd-tip{font-size:12.5px;color:#999;padding:10px 16px;line-height:1.7}
.rd-favrow{padding:12px 16px;border-bottom:.5px solid #f2f2f2;cursor:pointer;background:#fff}body.dark-theme .rd-favrow{background:#141414;border-color:#222}.rd-favrow b{font-size:14.5px}.rd-favrow em{display:block;font-style:normal;font-size:12.5px;color:#b5651d;margin-top:3px}
.rd-mtop{display:flex;background:#fff;padding:18px 0}body.dark-theme .rd-mtop{background:#141414}.rd-mtop span{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;cursor:pointer;position:relative}.rd-mtop i{font-style:normal;font-size:22px;width:48px;height:48px;border-radius:16px;background:#fff0f2;display:flex;align-items:center;justify-content:center}.rd-mtop sup{position:absolute;top:-2px;right:28%;background:#ff2442;color:#fff;border-radius:999px;font-size:10px;padding:0 6px}
.rd-dmb{background:#f5f5f5;padding:10px 0}body.dark-theme .rd-dmb{background:#0b0b0b}
.rd-dm{display:flex;gap:8px;align-items:flex-start;padding:5px 14px}.rd-dm span{max-width:70%;background:#fff;border-radius:12px;padding:8px 12px;font-size:15px;line-height:1.5;white-space:pre-wrap;word-break:break-word}.rd-dm.me{justify-content:flex-end}.rd-dm.me span{background:#ff2442;color:#fff}body.dark-theme .rd-dm span{background:#222}
.rd-box{background:#fff;margin:10px 14px;border-radius:12px;padding:14px}body.dark-theme .rd-box{background:#1a1a1a}.rd-box b{display:block;margin-bottom:6px}.rd-box small{display:block;font-size:12px;color:#999;line-height:1.6}.rd-box .rd-sbox{margin:8px 0}.rd-box .rd-sbox input{background:#f5f5f5}.rd-box textarea{width:100%;box-sizing:border-box;margin-top:8px;border:1px solid #eee;border-radius:10px;padding:10px;font-size:14px;font-family:inherit;background:transparent;color:inherit}
.rd-sheet{position:fixed;inset:0;z-index:99980;background:rgba(0,0,0,.35);display:flex;align-items:flex-end}.rd-sheet-in{width:100%;background:#fff;border-radius:16px 16px 0 0;padding-bottom:env(safe-area-inset-bottom,0px);max-height:70vh;overflow-y:auto}body.dark-theme .rd-sheet-in{background:#1c1c1e;color:#eee}
.rd-sheet-in p{margin:0;padding:12px;text-align:center;font-size:13px;color:#999}.rd-sheet-in div{padding:15px;text-align:center;border-bottom:.5px solid #f2f2f2;font-size:16px;cursor:pointer}.rd-sheet-in div.c{color:#999;border-top:6px solid #f5f5f5}
`);
(async () => {
    await G.ready(); D = Object.assign(D, await ST.get('d', {}) || {});
    ['notes', 'boards', 'acts', 'hist', 'lives'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; });
    ['xacc', 'dms', 'search', 'last', 'phoneSeen'].forEach(k => { if (!D[k] || typeof D[k] !== 'object') D[k] = {}; });
    D.hot = D.hot || { list: [], at: 0 }; D.cfg = Object.assign({ keep: 500, feedN: 6 }, D.cfg || {});
    migrate();
})();
window.gysRedState = () => D;
// 💬 互通（256）：小红书私信别处也知道
try { G.chatReg(APP, { all: c => { const th = D.dms['c:' + c.id]; return th ? th.msgs.map(m => ({ at: m.at, t: (m.from === 'me' ? '她' : '你') + '：' + m.t })) : []; }, lines: c => { const th = D.dms['c:' + c.id]; return th ? th.msgs.slice(-6).map(m => ({ at: m.at, t: (m.from === 'me' ? '她' : '你（' + c.name + '）') + '：' + m.t })) : []; }, lastMe: c => { const th = D.dms['c:' + c.id]; const m = th && th.msgs.filter(x => x.from === 'me').slice(-1)[0]; return m ? m.at : 0; } }); } catch (e) {}
// 🛍️ 市集：今天 TA 给你买的
X.today(() => { const d = X.day(); const L = (D.orders || []).filter(o => o.from !== 'me' && X.day(new Date(o.at)) === d); return L.length ? { title: '🛍️ 小红书市集', rows: L.slice(0, 3).map(o => ({ t: nameOf(o.from), x: '给你买了「' + o.name + '」', go: X.go('gysRedOpenOrders') })) } : null; }, 'gysRed');
// 🛒 购物车（258）：TA 偷看你的购物车
X.action({ key: 'gys_red_cart', label: '偷看她的小红书购物车，悄悄买下一件', hint: '她加购了一直没买的', need: c => cartOn() && cart().length > 0 && rare(c, 'cart', 96), run: async c => {
    mark(c, 'cart'); const L = cart().slice(0, 10); const o = X.json(await X.ask(`${X.who(c)}\n你偷偷看到她小红书购物车里放着：\n${L.map((x, i) => `${i + 1}. ${gOf(x.gid).name}（¥${gOf(x.gid).price}）`).join('\n')}\n挑一件悄悄买给她（不想买就 {"i":0}），写一句附言。只输出 JSON：{"i":序号,"say":"附言"}`)); const k = o && Number(o.i); const x = k && L[k - 1]; if (!x) return null; const g = gOf(x.gid);
    (D.orders = D.orders || []).unshift({ id: G.uid('ro'), gid: g.id, name: g.name, emo: g.emo, price: g.price, to: 'me', from: 'c:' + c.id, say: X.plain(o.say || '').slice(0, 80), cart: 1, at: Date.now() }); D.cart = cart().filter(y => y !== x); g.sold++; saveD(); G.repaint(APP);
    G.notify(APP, c, `🛒 <b>${X.esc(c.name)}</b> 把你购物车里的东西买了`, g.name + (o.say ? '：' + o.say : ''), X.go('gysRedOpenOrders'));
    return { text: `偷看了她的小红书购物车，悄悄把「${g.name}」买给了她${o.say ? '，附言：' + o.say : ''}`, selfNotified: true };
} }, 'gysRedCart');
X.today(() => { if (!cartOn()) return null; const n = cartN(); const T = (D.orders || []).filter(o => o.cart && X.day(new Date(o.at)) === X.day()); if (!n && !T.length) return null; return { title: '🛒 小红书购物车', rows: (n ? [{ t: '购物车', x: `${n} 件 · ¥${cart().reduce((s, x) => s + gOf(x.gid).price * x.n, 0).toFixed(2)}`, go: X.go('gysRedOpenCart') }] : []).concat(T.map(o => ({ t: nameOf(o.from), x: `从你购物车买了「${o.name}」`, go: X.go('gysRedOpenOrders') }))) }; }, 'gysRedCart');
X.widget('gysRedCartW', { n: '小红书购物车', sizes: ['s'], tap: () => window.gysRedOpenCart(), r: () => `<div style="padding:10px;font-size:12px;line-height:1.6"><b style="color:#ff2442">🛒 购物车</b><br><span style="font-size:22px;font-weight:700">${cartN()}</span> 件${cart()[0] ? '<br>' + esc(gOf(cart()[0].gid).name.slice(0, 12)) : ''}</div>` }, 'gysRedCart');
X.mem({ k: 'gysRedCart', ico: '🛒', n: 'TA 从你购物车里买的', d: 'TA 偷看你小红书购物车后悄悄买给你的（改了就是改附言，删了就没了）', items: c => (D.orders || []).filter(o => o.cart && o.from === 'c:' + c.id), text: o => `${o.name}${o.say ? '：' + o.say : ''}`, edit: (o, v) => { o.say = String(v).replace(/^[^：]*：/, '').slice(0, 80); }, del: (c, i) => { const L = (D.orders || []).filter(o => o.cart && o.from === 'c:' + c.id); D.orders = D.orders.filter(o => o !== L[i]); }, meta: o => G.ago(o.at), save: () => saveD() }, 'gysRedCart');
X.css('gys-red-258-css', `
.rd-gbar{display:flex;align-items:center;gap:8px}.rd-gbar>i{font-style:normal;display:flex;flex-direction:column;align-items:center;font-size:10.5px;color:#666;cursor:pointer;min-width:38px}.rd-gbar>i b{position:relative;font-size:19px;font-weight:400;line-height:1.2}.rd-gbar>i sup{position:absolute;top:-4px;right:-10px;background:#ff2442;color:#fff;border-radius:8px;font-size:10px;padding:0 4px;line-height:14px}
.rd-gbar span.c{background:#fff3f4!important;color:#ff2442!important}.rd-gbar span{padding:10px 4px!important;font-size:14px;white-space:nowrap}
.rd-gshop{cursor:pointer}.rd-gshop em{font-style:normal;color:#999;float:right}.rd-gs{cursor:pointer}
.rd-cart{padding:8px 10px 20px}.rd-cs{background:#fff;border-radius:12px;padding:10px 12px;margin-bottom:10px}body.dark-theme .rd-cs{background:#1a1a1a}
.rd-csh{display:flex;align-items:center;gap:10px;padding-bottom:6px}.rd-csh b{font-size:14px;cursor:pointer}
.rd-ck{width:18px;height:18px;border-radius:50%;border:1.5px solid #ccc;flex-shrink:0;cursor:pointer;box-sizing:border-box;position:relative}.rd-ck.on{background:#ff2442;border-color:#ff2442}.rd-ck.on::after{content:"";position:absolute;left:5px;top:2px;width:4px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.rd-ci{display:flex;align-items:center;gap:10px;padding:8px 0}.rd-cimg{width:84px;height:84px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:36px;background:#eee center/cover;flex-shrink:0;cursor:pointer}
.rd-ci>div{flex:1;min-width:0}.rd-ci b{display:block;font-size:14px;font-weight:400;line-height:1.4;max-height:2.8em;overflow:hidden;cursor:pointer}.rd-cp{display:flex;align-items:center;justify-content:space-between;margin-top:10px}.rd-cp em{font-style:normal;color:#ff2442;font-size:12px}.rd-cp em u{text-decoration:none;font-size:17px;font-weight:600}
.rd-qty{display:flex;align-items:center;border:.5px solid #ddd;border-radius:4px}.rd-qty a{width:24px;text-align:center;cursor:pointer;color:#333}.rd-qty i{font-style:normal;min-width:26px;text-align:center;border-left:.5px solid #ddd;border-right:.5px solid #ddd;font-size:13px}
.rd-cbar{display:flex;align-items:center;gap:8px;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));background:#fff;border-top:.5px solid #eee;font-size:13px}body.dark-theme .rd-cbar{background:#141414;border-color:#222}.rd-cbar em{margin-left:auto;font-style:normal}.rd-cbar em b{color:#ff2442;font-size:17px}.rd-cbar a{background:#ff2442;color:#fff;border-radius:999px;padding:9px 18px;cursor:pointer;font-weight:600}.rd-cbar a.off{opacity:.4}
.rd-shh{display:flex;align-items:center;gap:12px;padding:20px 16px 14px;background:linear-gradient(180deg,#fff5f6,transparent)}body.dark-theme .rd-shh{background:none}.rd-shav{width:56px;height:56px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:30px;flex-shrink:0}
.rd-shh>div{flex:1;min-width:0}.rd-shh b{display:block;font-size:17px}.rd-shh small{color:#999;font-size:12px}.rd-shh a{background:#ff2442;color:#fff;border-radius:999px;padding:6px 16px;font-size:13px;cursor:pointer}.rd-shh a.on{background:#f2f2f2;color:#999}
.rd-shtab{display:flex;justify-content:space-between;align-items:center;padding:8px 16px 10px;font-size:14px}.rd-shtab span{color:#666;font-size:13px;cursor:pointer}
`);
window.gysRdState = () => D;
