/* 🧣 微博：把微博的生态搬进谷雨——首页（关注 / 推荐 / 同城 / 微博故事）、发微博（配图、#话题#、@人、可见范围、定位、投票）、
   评论区（热评 / 最新、楼中楼、博主赞过、精选、关闭评论）、转发、点赞、收藏、编辑记录、删博；
   🔥 热搜（实时榜 + 话题页，买热搜 / 撤热搜）、超话（签到升级、发帖）、找人（✨ 生成新账号，要求可填可空）；
   主页（头像背景能换能裁剪、简介能改、认证、IP 属地、挂别的软件的账号、置顶、相册、TA 赞过的）；
   私信、消息（@我 / 评论 / 赞 / 新粉丝）、小号（你的、TA 的）、bot（投稿 bot / 定时 bot / 自动回复 bot）、官宣。
   你、角色、NPC 列表里的人、营销号、路人都在上面；NPC 在评论里占多少看 NPC 列表 →「微博」那一档。 */
if (window.__gysWeibo) return; window.__gysWeibo = 1;
const G = window.GYS, APP = 'weibo', esc = G.esc;
X.feat('gysWeibo', { n: '🧣 微博', desc: '刷微博、发微博、热搜、超话、私信、小号、bot；TA 也在上面发微博、评论你、用小号' });
const ST = X.store('weibo');
let D = { posts: [], hot: { list: [], at: 0 }, supers: {}, bots: [], dms: {}, notes: [], stories: [], xacc: {}, fav: [], act: 'me', alts: [], follow: {}, videos: [], cfg: { refresh: 6, keep: 600 }, seenDel: {} };
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();
let BUSY = {};
const W = window.gysWb = {};
const DEVICES = ['iPhone 15 Pro', 'iPhone 14', 'iPhone客户端', '小米14 Ultra', 'HUAWEI Mate 60 Pro', 'vivo X100', 'OPPO Find X7', 'iPad', '微博网页版', '荣耀Magic6', '红米K70'];
const PROV = ['北京', '上海', '广东', '浙江', '江苏', '四川', '湖北', '湖南', '山东', '福建', '重庆', '天津', '陕西', '河南', '辽宁', '云南', '海外'];
const PASSER = ['今天也要早睡', '芝士就是力量', '路过的小猫咪', '不吃香菜联盟', '熬夜冠军本冠', '奶茶续命中', '一只咸鱼', '月亮不睡我不睡', '吃瓜群众甲', '摸鱼专业户', '快乐小狗', '云朵收集者', '柠檬精本精', '沙雕网友', '早八人', '打工人小王', '追星少女', '学习使我快乐', '干饭王', '橘子汽水'];
const MKT = [['x:mkt1', '娱乐圈吃瓜机', '🍉', '每天带你吃瓜 合作私信'], ['x:mkt2', '八卦狗仔小分队', '📸', '爆料请私信 保护投稿人'], ['x:mkt3', '热门话题君', '🔥', '全网热点第一时间']];

/* ---------------- 人和账号 ---------------- */
const isX = w => String(w).startsWith('x:');
function xacc(w) { return D.xacc[w] || null; }
function ensureMkt() { MKT.forEach(([w, n, e, bio]) => { if (!D.xacc[w]) D.xacc[w] = { kind: 'mkt', name: n }; if (!G.hasProf(APP, w)) G.prof(APP, w, { nick: n, emoji: e, bio, verify: { t: 'yellow', text: '娱乐博主' }, followers: G.rnd(80, 600) * 10000, following: G.rnd(200, 900), gen: true }); }); }
function passer(name) {   // 路人：同名就是同一个账号
    name = X.plain(name || G.pick(PASSER)).slice(0, 16) || G.pick(PASSER);
    const w = 'x:p_' + name;
    if (!D.xacc[w]) { D.xacc[w] = { kind: 'passer', name }; G.prof(APP, w, { nick: name, emoji: G.pick(['🐱', '🐶', '🐰', '🦊', '🐼', '🐻', '🐧', '🌸', '🍀', '🌙', '⭐', '🍑']), followers: G.rnd(12, 800), following: G.rnd(30, 500), loc: G.pick(PROV), gen: true }); }
    return w;
}
const nameOf = w => G.nick(APP, w);
const charWho = c => 'c:' + c.id;
const charOfW = w => G.charOf(w);
const cast = () => G.people().filter(w => w !== 'me');
const allChars = () => G.chars();
function whoByName(n) {   // 模型写的名字 → 账号
    n = String(n || '').trim().replace(/^@/, ''); if (!n) return null;
    if (n === G.meName() || n === nameOf('me')) return 'me';
    const all = G.people().concat(Object.keys(D.xacc));
    return all.find(w => nameOf(w) === n) || all.find(w => { const b = G.base(w); return b && b.name === n; }) || null;
}
const myAcc = () => D.act || 'me';          // 现在用哪个号（大号 / 小号）
const isMine = w => w === 'me' || (D.alts || []).includes(w);
const following = w => (D.follow[w] = D.follow[w] || (w === 'me' ? cast() : []));
const isFollow = (a, b) => a === 'me' || isMine(a) ? following('me').includes(b) : (G.base(a) && G.base(b)) ? true : (D.follow[a] || []).includes(b);
const vBadge = w => { const p = G.prof(APP, w); const t = p.verify && p.verify.t; return t ? `<i class="wb-v ${t}" title="${esc(p.verify.text || '')}">V</i>` : ''; };
const vipBadge = w => G.prof(APP, w).vip ? '<i class="wb-vip">👑</i>' : '';
function devOf(w) { const p = G.prof(APP, w); if (!p.dev) { p.dev = G.pick(DEVICES); G.save(); } return p.dev; }
function ipOf(w) { const p = G.prof(APP, w); if (!p.loc) { const b = G.base(w); p.loc = (b && b.loc && PROV.find(x => b.loc.indexOf(x) >= 0)) || G.pick(PROV); G.save(); } return p.loc; }

/* ---------------- 帖子 ---------------- */
const postOf = id => D.posts.find(p => p.id === id);
function mkPost(o) {
    const p = Object.assign({ id: G.uid('wb'), by: 'me', text: '', imgs: [], pics: [], at: Date.now(), vis: 'public', topics: [], st: '', rp: null, likes: [], likeN: 0, rpN: 0, cmts: [], cmtOff: false, pin: false, edits: [], del: 0, loc: '', poll: null, from: '', ip: '' }, o);
    p.from = p.from || devOf(p.by); p.ip = p.ip || ipOf(p.by);
    p.topics = Array.from(new Set((p.topics || []).concat((p.text.match(/#([^#\s]{1,30})#/g) || []).map(x => x.slice(1, -1)))));
    D.posts.unshift(p); trim(); saveD();
    return p;
}
function trim() { const k = Math.max(100, Number(D.cfg.keep) || 600); if (D.posts.length > k) { const keep = D.posts.filter(p => isMine(p.by) || p.pin || D.fav.includes(p.id)); D.posts = D.posts.filter(p => !keep.includes(p)).slice(0, k - keep.length).concat(keep).sort((a, b) => b.at - a.at); } }
const visibleTo = (p, viewer) => {
    if (p.del && !(D.seenDel[p.id])) return false;
    if (p.vis === 'public') return true;
    if (isMine(p.by)) return true;
    if (p.vis === 'self') return false;
    if (p.vis === 'fans') return following('me').includes(p.by);
    if (p.vis === 'friends') return following('me').includes(p.by);
    return true;
};
const likedByMe = p => (p.likes || []).includes(myAcc());
const totalLikes = p => (p.likeN || 0) + (p.likes || []).length;
const cmtCount = p => (p.cmtN || 0) + countC(p.cmts || []);
const countC = arr => arr.reduce((n, c) => n + 1 + countC(c.kids || []), 0);
function richText(t) {
    return esc(t).replace(/#([^#\s]{1,30})#/g, (m, k) => `<a class="wb-tp" onclick="event.stopPropagation();gysWb.topic('${esc(k).replace(/'/g, '')}')">#${k}#</a>`)
        .replace(/@([一-龥\w-]{1,20})/g, (m, n) => `<a class="wb-at" onclick="event.stopPropagation();gysWb.atName('${n}')">@${n}</a>`)
        .replace(/\[([一-龥a-z]{1,4})\]/g, (m, e) => ({ 笑哭: '😂', 允悲: '🥲', 心: '❤️', 哭: '😭', 偷笑: '🤭', 抱抱: '🫂', doge: '🐶', 赞: '👍', 怒: '😠', 吃瓜: '🍉', 酷: '😎', 害羞: '😳', 可怜: '🥺' }[e] || m));
}
function picsHtml(p) {
    const imgs = (p.imgs || []).map(src => ({ src })), pics = (p.pics || []).map(t => ({ t }));
    const all = imgs.concat(pics); if (!all.length) return '';
    const cls = all.length === 1 ? 'one' : all.length === 2 || all.length === 4 ? 'two' : 'three';
    return `<div class="wb-pics ${cls}">${all.slice(0, 9).map(x => x.src ? `<span class="wb-pic" style="background-image:url('${x.src}')" onclick="event.stopPropagation();GYS.imgView(this.style.backgroundImage.slice(5,-2))"></span>` : `<span class="wb-pic t" style="background:${picBg(x.t)}"><em>📷 ${esc(x.t)}</em></span>`).join('')}</div>`;
}
const picBg = t => { let h = 0; for (const ch of String(t)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `linear-gradient(135deg,hsl(${h},55%,78%),hsl(${(h + 40) % 360},60%,68%))`; };
function pollHtml(p) {
    if (!p.poll) return ''; const P = p.poll, tot = P.opts.reduce((n, o) => n + o.n, 0) || 1, mine = P.mine;
    return `<div class="wb-poll" onclick="event.stopPropagation()"><b>📊 ${esc(P.q)}</b>${P.opts.map((o, i) => `<div class="wb-po${mine === i ? ' on' : ''}" onclick="gysWb.vote('${p.id}',${i})"><span style="width:${mine != null ? Math.round(o.n / tot * 100) : 0}%"></span><em>${esc(o.t)}</em>${mine != null ? `<i>${Math.round(o.n / tot * 100)}%</i>` : ''}</div>`).join('')}<small>${G.fmtN(tot)} 人参与</small></div>`;
}
function card(p, opt) {
    opt = opt || {};
    if (p.del && D.seenDel[p.id] && !opt.detail) return `<div class="wb-card del" onclick="gysWb.open('${p.id}')"><div class="wb-deltip">这条微博已经被作者删除了 · 你之前刷到过</div>${miniBody(p)}</div>`;
    const rp = p.rp ? postOf(p.rp) : null;
    const vis = { fans: '仅粉丝可见', friends: '好友圈', self: '仅自己可见' }[p.vis];
    return `<div class="wb-card${opt.detail ? ' detail' : ''}" onclick="${opt.detail ? '' : `gysWb.open('${p.id}')`}">
      ${p.pin && opt.inProfile ? '<div class="wb-pin">📌 置顶</div>' : ''}
      <div class="wb-hd">${`<span onclick="event.stopPropagation();gysWb.prof('${p.by}')">${G.av(APP, p.by, 40)}</span>`}
        <div class="wb-hm"><div class="wb-nm" onclick="event.stopPropagation();gysWb.prof('${p.by}')">${esc(nameOf(p.by))}${vBadge(p.by)}${vipBadge(p.by)}</div>
        <div class="wb-meta">${G.ago(p.at)}${p.from ? ' · 来自 ' + esc(p.from) : ''}${p.edits && p.edits.length ? ' · <a onclick="event.stopPropagation();gysWb.edits(\'' + p.id + '\')">已编辑</a>' : ''}${vis ? ' · 🔒' + vis : ''}</div></div>
        ${!isMine(p.by) && !following('me').includes(p.by) && !opt.noFollow ? `<span class="wb-fbtn" onclick="event.stopPropagation();gysWb.follow('${p.by}')">+ 关注</span>` : `<span class="wb-more" onclick="event.stopPropagation();gysWb.menu('${p.id}')">⋯</span>`}</div>
      <div class="wb-tx">${richText(p.text)}${p.st ? ` <a class="wb-st" onclick="event.stopPropagation();gysWb.superOpen('${esc(p.st)}')">💎${esc((D.supers[p.st] || {}).name || p.st)}超话</a>` : ''}</div>
      ${picsHtml(p)}${pollHtml(p)}${lotHtml(p)}
      ${rp ? `<div class="wb-rp" onclick="event.stopPropagation();gysWb.open('${rp.id}')">${rp.del ? '<em>原微博已被删除</em>' : `<b>@${esc(nameOf(rp.by))}</b>：${richText(rp.text)}${picsHtml(rp)}`}</div>` : ''}
      ${p.loc ? `<div class="wb-loc">📍 ${esc(p.loc)}</div>` : ''}
      <div class="wb-ip">发布于 ${esc(p.ip || '')}</div>
      <div class="wb-bar" onclick="event.stopPropagation()"><span onclick="gysWb.repost('${p.id}')">↗ ${p.rpN ? G.fmtN(p.rpN) : '转发'}</span><span onclick="gysWb.open('${p.id}',1)">💬 ${cmtCount(p) ? G.fmtN(cmtCount(p)) : '评论'}</span><span class="${likedByMe(p) ? 'on' : ''}" onclick="gysWb.like('${p.id}')">${likedByMe(p) ? '❤️' : '🤍'} ${totalLikes(p) ? G.fmtN(totalLikes(p)) : '赞'}</span></div>
    </div>`;
}
const miniBody = p => `<div class="wb-tx dim">${richText(p.text).slice(0, 200)}</div>`;

/* ---------------- 模型 ---------------- */
const P = (id, def, vars) => X.pl(id, def, vars);
const DEF_FEED = `你在模拟一个真实的微博时间线。下面是会出现在这里的人：
{{人}}
{{最近}}
请写 {{条数}} 条这些人最近会发的微博（混着来：日常碎碎念、晒图、吐槽、转发、追星、工作、深夜emo、营销号的瓜、路人的段子）。要像真人发的：口语、错别字也行、带话题 #xx#、表情 [笑哭][允悲][doge]、有长有短。
角色发的要符合人设和最近发生的事，可以暗戳戳提到{{我}}，但别每条都提。配图用文字描述（比如「晚霞」「猫」「咖啡和电脑」），没有就空。
每条带 2~5 条评论（评论的人从上面挑，或者路人），评论要接这条微博的内容。
只输出 JSON 数组：[{"by":"发的人的名字（路人就写一个网名）","text":"正文","pics":["图片描述"],"topics":["话题"],"likes":数字,"cmts":[{"by":"名字","text":"评论"}]}]`;
const DEF_CMT = `微博上，{{作者}}发了一条：
「{{正文}}」{{配图}}
{{已有}}
下面这些人可能会来评论：
{{人}}
{{熟人}}
请写 {{条数}} 条评论（有的接博主、有的回别的评论、有的吵起来）。认识博主的人用熟人的口气，路人用路人的口气（吃瓜、玩梗、彩虹屁、阴阳怪气都行）。
如果博主会回复某条，就在那条后面加一条 by 是博主的回复（replyTo 写被回复的人）。
只输出 JSON 数组：[{"by":"名字（路人写网名）","text":"评论","likes":数字,"replyTo":"回复谁（没有就空）","authorLike":true或false}]`;
const DEF_HOT = `这是微博热搜榜。下面是谷雨里最近发生的事（角色和用户发的微博、聊天里的大事）：
{{素材}}
请生成 {{条数}} 条热搜（一半跟上面的事有关，一半是这个世界里正常会上热搜的事：天气、节日、娱乐圈、社会新闻、梗）。标题像微博热搜那样起（「XX 深夜现身」「XX 回应了」「原来 XX 才是真的」）。
只输出 JSON 数组：[{"title":"热搜词","tag":"爆|沸|热|新|空","heat":热度数字,"desc":"导语一句话","about":"跟谁有关（名字，没有就空）"}]`;
const DEF_DM = `{{我是谁}}
你们在微博私信里聊天（不是平时的聊天软件），微博私信比较随意。最近的私信：
{{记录}}
接着回 1~3 句，只写你说的话，每句一行。`;
const DEF_LOT = `{{我是谁}}
你要在微博上发一个「转发抽奖」（转发这条就能参加，到点开奖）。按你的人设和最近的事来定抽什么（奶茶、周边、签名照、红包、你做的东西……），文案像真人发抽奖那样。
你们最近聊的：
{{最近}}
只输出 JSON：{"text":"微博正文（写清楚转发抽几位送什么）","prize":"奖品（几个字）","n":抽几个人}`;
X.plGroup('🧣 微博', 'gysWeibo', [['wb.feed', '刷新首页：写一批微博', '点「刷新」时', '{{人}} {{最近}} {{条数}} {{我}}'], ['wb.cmt', '一条微博的评论区', '打开一条微博 / 你发了微博时', '{{作者}} {{正文}} {{配图}} {{已有}} {{人}} {{熟人}} {{条数}}'], ['wb.hot', '热搜榜', '刷新热搜时', '{{素材}} {{条数}}'], ['wb.dm', '微博私信里 TA 回你', '你在微博私信里找 TA 时', '{{我是谁}} {{记录}}'], ['wb.lot', 'TA 发转发抽奖', 'TA 自己想在微博抽奖时', '{{我是谁}} {{最近}}']], { 'wb.lot': DEF_LOT, 'wb.feed': DEF_FEED, 'wb.cmt': DEF_CMT, 'wb.hot': DEF_HOT, 'wb.dm': DEF_DM });

function castLines(whos) {
    return whos.map(w => { const b = G.base(w), p = G.prof(APP, w); return `· ${p.nick}${b && b.name !== p.nick ? '（本名' + b.name + '）' : ''}：${b ? String(b.persona).slice(0, 120) : (xacc(w) || {}).kind === 'mkt' ? '营销号' : '路人'}${p.bio ? '｜简介：' + p.bio.slice(0, 30) : ''}`; }).join('\n');
}
function recentCtx() {
    const mine = D.posts.filter(p => isMine(p.by) && !p.del).slice(0, 3).map(p => `${G.meName()}发了：${p.text.slice(0, 60)}`);
    const chats = allChars().slice(0, 4).map(c => { const r = X.recent(c, 4); return r ? `${c.name}和${X.me(c)}最近聊天：${r.replace(/\n/g, ' / ').slice(0, 160)}` : ''; }).filter(Boolean);
    return mine.concat(chats).length ? '最近发生的事：\n' + mine.concat(chats).join('\n') : '';
}
function addCmts(p, arr, opt) {
    opt = opt || {};
    const out = [];
    (arr || []).forEach(x => {
        if (!x || !x.text) return;
        let w = whoByName(x.by); if (!w) w = /营销|吃瓜|八卦|热门/.test(x.by || '') ? 'x:mkt1' : passer(x.by);
        if (w === 'me' && !opt.allowMe) return;
        const c = { id: G.uid('c'), by: w, text: X.plain(x.text).slice(0, 200), at: Date.now() - G.rnd(0, 20) * 60e3, likeN: Math.max(0, Number(x.likes) || G.rnd(0, 50)), likes: [], kids: [], authorLiked: !!x.authorLike };
        const to = x.replyTo ? whoByName(x.replyTo) : null;
        const parent = to ? [...p.cmts].reverse().find(k => k.by === to) : null;
        if (parent && parent.kids.length < 20) { c.toWho = to; parent.kids.push(c); } else p.cmts.push(c);
        out.push(c);
    });
    return out;
}
async function genFeed(n) {
    if (BUSY.feed) return; BUSY.feed = 1; G.repaint(APP);
    try {
        ensureMkt();
        const pool = cast().sort(() => Math.random() - 0.5).slice(0, 10).concat(MKT.map(m => m[0]));
        await G.genProfiles(APP, pool.filter(w => !isX(w)));
        const o = X.json(await X.ask(P('wb.feed', DEF_FEED, { 人: castLines(pool) + '\n· 还有一些路人（你给他们起网名）', 最近: recentCtx(), 条数: n || 8, 我: G.meName() })));
        if (!Array.isArray(o)) { X.toast('🧣 刷不出来', '模型这次没写好，再刷一次'); return; }
        o.reverse().forEach((x, i) => {
            if (!x || !x.text) return;
            let w = whoByName(x.by); if (!w) w = passer(x.by); if (w === 'me') return;
            const p = mkPost({ by: w, text: X.plain(x.text).slice(0, 500), pics: (x.pics || []).filter(Boolean).slice(0, 9).map(t => X.plain(t).slice(0, 12)), topics: x.topics || [], likeN: Math.max(0, Number(x.likes) || G.rnd(0, 300)), rpN: G.rnd(0, 30), at: Date.now() - (o.length - i) * G.rnd(3, 25) * 60e3 });
            addCmts(p, x.cmts);
            p.cmtN = G.rnd(0, Math.max(2, Math.round(p.likeN / 8)));
        });
        D.lastFeed = Date.now(); saveD();
    } finally { BUSY.feed = 0; G.repaint(APP); }
}
async function genCmts(p, n, opt) {
    if (BUSY['c' + p.id]) return; BUSY['c' + p.id] = 1; G.repaint(APP);
    try {
        const author = p.by, ownerKey = isMine(author) ? 'me' : author.startsWith('c:') ? author.slice(2) : 'me';
        const pool = cast().filter(w => w !== author).sort(() => Math.random() - 0.5).slice(0, 8);
        const hint = typeof window.gyNpcCommentHint === 'function' ? window.gyNpcCommentHint(ownerKey, n || 6, 'weibo') : '';
        const exist = countC(p.cmts) ? '已经有的评论：\n' + p.cmts.slice(-8).map(c => `${nameOf(c.by)}：${c.text}`).join('\n') : '';
        const o = X.json(await X.ask(P('wb.cmt', DEF_CMT, { 作者: nameOf(author) + (author === 'me' || isMine(author) ? '（就是用户本人' + (author !== 'me' ? '的小号，大家不知道是她' : '') + '）' : ''), 正文: p.text, 配图: (p.pics.length || p.imgs.length) ? `（配了 ${p.pics.length + p.imgs.length} 张图${p.pics.length ? '：' + p.pics.join('、') : ''}）` : '', 已有: exist, 人: castLines(pool), 熟人: hint, 条数: n || 6 })));
        if (!Array.isArray(o)) return;
        const add = addCmts(p, o);
        if (!opt || !opt.quiet) add.forEach(c => { if (isMine(author) && c.by !== author) note('cmt', c.by, p.id, c.text); });
        p.cmtGen = Date.now(); saveD();
        return add;
    } finally { delete BUSY['c' + p.id]; G.repaint(APP); }
}
async function genHot() {
    if (BUSY.hot) return; BUSY.hot = 1; G.repaint(APP);
    try {
        const src = D.posts.filter(p => !p.del && p.vis === 'public').slice(0, 14).map(p => `${nameOf(p.by)}：${p.text.slice(0, 50)}`).join('\n') + '\n' + recentCtx();
        const o = X.json(await X.ask(P('wb.hot', DEF_HOT, { 素材: src, 条数: 15 })));
        if (!Array.isArray(o)) return X.toast('🔥 热搜没刷出来', '再试一次');
        const old = D.hot.list.filter(h => h.bought);
        D.hot = { at: Date.now(), list: old.concat(o.filter(h => h && h.title).map(h => ({ id: G.uid('h'), title: X.plain(h.title).slice(0, 30), tag: /爆|沸|热|新/.test(h.tag) ? h.tag : '', heat: Math.max(10000, Number(h.heat) || G.rnd(10, 400) * 10000), desc: X.plain(h.desc || '').slice(0, 80), about: h.about ? whoByName(h.about) : null, at: Date.now() }))).slice(0, 30) };
        D.hot.list.sort((a, b) => b.heat - a.heat); saveD();
    } finally { BUSY.hot = 0; G.repaint(APP); }
}
async function charPost(c, why) {
    const w = charWho(c);
    await G.genProfiles(APP, [w]);
    const o = X.json(await X.ask(`${X.who(c)}\n你在玩微博，微博名叫「${nameOf(w)}」，简介「${G.prof(APP, w).bio}」。\n最近的聊天：\n${X.recent(c, 10)}\n${why ? '这次想发：' + why + '\n' : ''}发一条你会发的微博（按你的性格：可能很短、可能只有一个表情、可能是深夜碎碎念、可能晒图、可能暗戳戳说她）。只输出 JSON：{"text":"正文","pics":["图片描述"],"vis":"public|fans|self","topics":[]}`));
    const t = o && X.plain(o.text); if (!t) return null;
    const p = mkPost({ by: w, text: t.slice(0, 500), pics: (o.pics || []).filter(Boolean).slice(0, 9).map(x => X.plain(x).slice(0, 12)), vis: /fans|self|public/.test(o.vis) ? o.vis : 'public', topics: o.topics || [], likeN: G.rnd(10, Math.max(20, Math.round(G.prof(APP, w).followers / 50))), rpN: G.rnd(0, 20) });
    if (p.vis !== 'self') { genCmts(p, 5, { quiet: true }); G.notify(APP, c, `🧣 <b>${X.esc(c.name)}</b> 发了一条微博`, t.slice(0, 80), X.go('gysWeiboOpenPost', p.id)); }
    return p;
}
async function charReact(p) {   // 你发了微博，TA 们来点赞 / 评论
    const L = allChars().filter(c => X.on('gysWeibo') && Math.random() < 0.8);
    if (!L.length) return;
    for (const c of L.slice(0, 4)) {
        const w = charWho(c);
        if (Math.random() < 0.7 && !p.likes.includes(w)) p.likes.push(w);
        note('like', w, p.id);
    }
    await genCmts(p, 6);
}
function note(t, from, pid, text) { if (isMine(from)) return; D.notes.unshift({ id: G.uid('n'), t, from, pid, text: text || '', at: Date.now(), read: false }); D.notes = D.notes.slice(0, 300); saveD(); }

/* ---------------- 动作 ---------------- */
W.open = (id, toCmt) => { const p = postOf(id); if (!p) return X.toast('🧣 找不到这条了', ''); if (p.del) D.seenDel[p.id] = 1; G.push(APP, { title: '微博正文', id: 'p_' + id, html: () => detail(id), foot: () => cmtBar(id), after: r => { if (toCmt) { const e = r.querySelector('.wb-cmts'); if (e) e.scrollIntoView(); } } }); if (!p.cmtGen && !p.del && (countC(p.cmts) < 3)) genCmts(p, 6, { quiet: !isMine(p.by) }); };
window.gysWeiboOpenPost = id => { G.open(APP); W.open(id); };
window.gysWeiboOpen = tab => G.open(APP, tab);
W.like = id => { const p = postOf(id); if (!p) return; const me = myAcc(), i = p.likes.indexOf(me); if (i >= 0) p.likes.splice(i, 1); else { p.likes.push(me); const c = charOfW(p.by); if (c && Math.random() < 0.35) X.ctxNote && 0; } saveD(); G.repaint(APP); };
W.follow = w => { const L = following('me'); if (L.includes(w)) L.splice(L.indexOf(w), 1); else { L.push(w); G.prof(APP, w).followers++; } saveD(); G.repaint(APP); };
W.vote = (id, i) => { const p = postOf(id); if (!p || !p.poll || p.poll.mine != null) return; p.poll.mine = i; p.poll.opts[i].n++; saveD(); G.repaint(APP); };
W.fav = id => { const i = D.fav.indexOf(id); if (i >= 0) D.fav.splice(i, 1); else D.fav.unshift(id); saveD(); X.toast(i >= 0 ? '取消收藏' : '⭐ 收藏了', ''); };
/* ---------- 🎁 转发抽奖（255）：转发就算参加，到点自动开奖；TA 发的抽奖可能偷偷让你中 ---------- */
X.feat('gysWbLot', { n: '🎁 微博转发抽奖', desc: '你和 TA 都能发「转发抽奖」，转发就算参加，到点自动开奖、公布中奖名单；TA 发抽奖的时候可能会偷偷想让你中' });
const lotOn = () => X.on('gysWbLot');
const LOT_H = [['1 小时后', 1], ['6 小时后', 6], ['明天这个时候', 24], ['3 天后', 72], ['1 周后', 168]];
function lotHtml(p) {
    const L = p.lot; if (!L || !lotOn()) return '';
    const me = myAcc(), inn = (L.ents || []).includes(me), mineP = isMine(p.by), tot = (L.ents || []).length + (L.fake || 0);
    const st = L.done ? `已开奖 · 中奖：${(L.wins || []).map(w => '@' + esc(nameOf(w))).join(' ') || '没人'}` : `${new Date(L.end).getMonth() + 1}月${new Date(L.end).getDate()}日 ${G.hm(L.end)} 开奖 · ${G.fmtN(tot)} 人参与`;
    const won = L.done && (L.wins || []).some(isMine);
    return `<div class="wb-lot${L.done ? ' done' : ''}${won ? ' won' : ''}" onclick="event.stopPropagation();gysWb.lotOpen('${p.id}')"><b>🎁 抽奖 · ${esc(L.prize)}</b><small>${L.n} 名 · ${st}</small>${won ? '<em>🎉 你中奖了</em>' : !L.done && !mineP ? `<span onclick="event.stopPropagation();gysWb.repost('${p.id}',1)">${inn ? '✓ 已参与' : '转发参与'}</span>` : ''}</div>`;
}
W.lotOpen = id => {
    const p = postOf(id); if (!p || !p.lot) return; const L = p.lot;
    G.push(APP, { title: '抽奖详情', id: 'lot_' + id, html: () => `<div class="wb-lotp"><div class="wb-lotb">🎁</div><h3>${esc(L.prize)}</h3><p>${L.n} 名 · ${L.done ? '已开奖' : new Date(L.end).toLocaleString() + ' 开奖'}</p><p>发起人 @${esc(nameOf(p.by))} · ${G.fmtN((L.ents || []).length + (L.fake || 0))} 人参与</p>
      ${L.done ? `<div class="wb-lots">中奖名单</div>${(L.wins || []).map(w => `<div class="wb-lotw" onclick="gysWb.prof('${w}')">${G.av(APP, w, 30)}<b>${esc(nameOf(w))}</b>${isMine(w) ? '<em>（你）</em>' : ''}</div>`).join('')}` : ''}
      ${(L.ents || []).length ? `<div class="wb-lots">参与的人（认识的）</div><div class="wb-lote">${L.ents.map(w => `<span onclick="gysWb.prof('${w}')">${G.av(APP, w, 28)}<i>${esc(nameOf(w))}</i></span>`).join('')}</div>` : ''}
      <div class="gys-acts">${!L.done && isMine(p.by) ? `<span class="gys-btn sm" onclick="gysWb.lotDraw('${id}')">现在就开奖</span>` : ''}${!L.done && !isMine(p.by) && !(L.ents || []).includes(myAcc()) ? `<span class="gys-btn sm" onclick="gysWb.repost('${id}',1)">转发参与</span>` : ''}<span class="gys-btn sm ghost" onclick="gysWb.open('${id}')">看原微博</span></div></div>` });
};
W.__lot = async () => {
    if (!DRAFT) return; if (DRAFT.lot) { DRAFT.lot = null; return G.repaint(APP); }
    const prize = await G.input('抽什么？（比如：一杯奶茶 / 签名照 / 红包 66 元）', ''); if (!prize) return;
    const n = Math.max(1, Math.min(50, parseInt(await G.input('抽几个人？', '1'), 10) || 1));
    const hi = await chooser(LOT_H.map(x => '⏰ ' + x[0] + '开奖')); if (hi == null) return;
    DRAFT.lot = { prize: X.plain(prize).slice(0, 40), n, end: Date.now() + LOT_H[hi][1] * 3600e3, ents: [], fake: 0, wins: [], done: 0 }; keepDraft(); G.repaint(APP);
};
// 开奖：认识的人（转发了的角色 / NPC / 你）+ 一堆路人里抽
const WIN_SAY = ['恭喜这位幸运儿 🎉', '中奖的私信我地址～', '恭喜恭喜！奖品马上安排', '开奖啦，没中的别灰心，下次还抽'];
function lotDraw(p, force) {
    const L = p.lot; if (!L || L.done || (!force && Date.now() < L.end)) return false;
    const pool = (L.ents || []).slice(), by = p.by, C = G.charOf(by), meIn = pool.some(isMine);
    const wins = [];
    // TA 发的抽奖：你参加了就多半让你中（暗箱）
    if (C && meIn && Math.random() < 0.65) { wins.push(pool.find(isMine)); L.rig = 1; }
    let guard = 0;
    while (wins.length < L.n && guard++ < 200) {
        const rest = pool.filter(w => !wins.includes(w)), fakeLeft = Math.max(0, (L.fake || 0) - wins.filter(w => String(w).startsWith('x:p_')).length);
        if (!rest.length && !fakeLeft) break;
        const realP = rest.length ? Math.min(0.6, rest.length * 4 / (rest.length * 4 + fakeLeft)) : 0;
        if (rest.length && Math.random() < realP) wins.push(G.pick(rest)); else { const w = passer(); if (!wins.includes(w)) wins.push(w); }
    }
    L.wins = wins; L.done = Date.now(); saveD();
    (p.cmts = p.cmts || []).unshift({ id: G.uid('c'), by, text: `【开奖】${wins.map(w => '@' + nameOf(w)).join(' ')} ${G.pick(WIN_SAY)}`, at: Date.now(), likeN: G.rnd(0, 40), likes: [], kids: [] });
    const meWon = wins.some(isMine);
    if (meWon) G.notify(APP, C, `🎁 你中奖了！`, `${C ? X.esc(nameOf(by)) + ' 的' : ''}抽奖「${L.prize}」`, X.go('gysWeiboOpenPost', p.id));
    else if (isMine(by)) G.notify(APP, null, `🎁 你的抽奖开奖了`, `「${L.prize}」：${wins.map(nameOf).join('、')}`, X.go('gysWeiboOpenPost', p.id));
    else if (meIn) G.notify(APP, C, `🎁 抽奖开奖了`, X.v('这次没中', '差一点点', '没抽到你') + `：「${L.prize}」`, X.go('gysWeiboOpenPost', p.id));
    // 角色中了你的抽奖 / 你中了 TA 的：TA 在评论区说一句（不花 API）
    wins.filter(w => G.charOf(w) && isMine(by)).forEach(w => p.cmts[0].kids.push({ id: G.uid('c'), by: w, text: X.pick(['！！我中了？？', '这是不是内定 😏', '谢谢老板，地址私你了', '我就知道是我']), at: Date.now() + 1000, likeN: 0, likes: [], toWho: by }));
    if (C && meWon) p.cmts[0].kids.push({ id: G.uid('c'), by, text: L.rig ? X.pick(['纯随机的，真的（', '运气好而已', '别问，问就是天意']) : X.pick(['恭喜啊', '这么巧？']), at: Date.now() + 1500, likeN: 0, likes: [], toWho: myAcc() });
    return true;
}
W.lotDraw = async id => { const p = postOf(id); if (!p || !p.lot || p.lot.done) return; if (!(await G.confirm('现在就开奖？'))) return; lotDraw(p, 1); G.repaint(APP); };
function lotTick() { if (!lotOn()) return; let n = 0; D.posts.forEach(p => { if (p.lot && !p.lot.done && Date.now() >= p.lot.end && lotDraw(p)) n++; }); if (n) G.repaint(APP); }
// 你发了抽奖：角色们（大多会）转发参加，路人涨一波
function lotJoinChars(p) {
    if (!p.lot) return; p.lot.fake = G.rnd(20, 300) + Math.round((G.prof(APP, p.by).followers || 0) / 50);
    G.chars().forEach(c => { if (Math.random() < 0.8) setTimeout(() => { const w = 'c:' + c.id; if (p.lot.done || p.lot.ents.includes(w)) return; p.lot.ents.push(w); mkPost({ by: w, text: X.pick(['求中！', '转发抽奖 许愿', '冲冲冲', '我要我要', '这个奖必须是我的']), rp: p.id }); p.rpN++; saveD(); G.repaint(APP); }, G.rnd(5, 90) * 1000); });
}
W.__lotTick = lotTick; W.__lotDraw = (id) => { const p = postOf(id); return p ? lotDraw(p, 1) : false; };
setInterval(() => { try { if (X.on('gysWeibo')) lotTick(); } catch (e) {} }, 60e3);
// 🔗 分享（255）：一条微博变成能发到 iMessage / 平时聊天的卡片
const wbCard = p => ({ app: 'weibo', kind: '微博', by: p.by, byName: nameOf(p.by), title: '', text: X.plain(p.text || '').slice(0, 300) + (p.rp && postOf(p.rp) ? ' //转发 @' + nameOf(postOf(p.rp).by) + '：' + X.plain(postOf(p.rp).text || '').slice(0, 80) : ''), img: G.cardImg((p.imgs || [])[0] || ''), at: p.at, go: X.go('gysWeiboOpenPost', p.id) });
W.share = id => { const p = postOf(id); if (p) G.share(wbCard(p)); };
G.feedReg('weibo', () => D.posts.filter(p => !p.del && p.vis === 'public' && Date.now() - p.at < 5 * 86400e3 && p.text).slice(0, 4).map(wbCard));
W.repost = async (id, direct) => {
    const p = postOf(id); if (!p) return;
    if (!direct && G.shareOn()) { const k = await chooser(['↗ 转发到我的微博', '💬 分享给 TA（iMessage / 平时聊天）']); if (k == null) return; if (k === 1) return W.share(id); }
    const t = await G.input(`转发 @${nameOf(p.by)} 的微博，说点什么（可以空着）`, ''); if (t === null || t === undefined) return;
    const q = mkPost({ by: myAcc(), text: String(t || (p.lot && !p.lot.done ? '转发抽奖，求中！' : '转发微博')), rp: p.rp || p.id });
    if (p.lot && !p.lot.done && lotOn() && !p.lot.ents.includes(myAcc())) { p.lot.ents.push(myAcc()); X.toast(X.v('🎁 参与抽奖了', '转发成功，等开奖', '许愿中奖'), ''); }
    p.rpN++; saveD(); X.toast('↗ 转发了', ''); G.repaint(APP);
    setTimeout(() => charReact(q), 800);
};
W.menu = async id => {
    const p = postOf(id); if (!p) return; const mine = isMine(p.by);
    const opts = (mine ? ['置顶 / 取消置顶', '编辑', '改可见范围', p.cmtOff ? '打开评论' : '关闭评论', '删除', '收藏'] : ['收藏', '复制正文', '不看 TA 的微博']).concat(G.shareOn() ? ['↗ 分享给 TA'] : []);
    const pick = await chooser(opts); if (pick == null) return;
    const o = opts[pick];
    if (o === '收藏') W.fav(id);
    else if (o === '复制正文') { try { navigator.clipboard.writeText(p.text); X.toast('复制了', ''); } catch (e) {} }
    else if (o.startsWith('置顶')) { D.posts.forEach(x => { if (x.by === p.by && x !== p) x.pin = false; }); p.pin = !p.pin; }
    else if (o === '编辑') { const t = await G.input('改成：', p.text); if (t && t !== p.text) { p.edits.push({ at: Date.now(), text: p.text }); p.text = t; } }
    else if (o === '改可见范围') { const v = await chooser(['公开', '仅粉丝可见', '好友圈（互相关注的人）', '仅自己可见']); if (v != null) p.vis = ['public', 'fans', 'friends', 'self'][v]; }
    else if (o.endsWith('评论')) p.cmtOff = !p.cmtOff;
    else if (o === '删除') { if (await G.confirm('删掉这条微博？')) { D.posts = D.posts.filter(x => x !== p); G.back(APP); } }
    else if (o === '不看 TA 的微博') { (D.mute = D.mute || []).push(p.by); }
    else if (o === '↗ 分享给 TA') return W.share(id);
    saveD(); G.repaint(APP);
};
async function chooser(opts) {
    return new Promise(res => {
        const d = document.createElement('div'); d.className = 'wb-sheet';
        d.innerHTML = `<div class="wb-sheet-in">${opts.map((o, i) => `<div data-i="${i}">${esc(o)}</div>`).join('')}<div data-i="-1" class="c">取消</div></div>`;
        d.onclick = e => { const i = e.target.getAttribute('data-i'); d.remove(); res(i == null || i === '-1' ? null : Number(i)); };
        document.body.appendChild(d);
    });
}
W.edits = id => { const p = postOf(id); if (!p) return; G.push(APP, { title: '编辑记录', html: () => `<div class="wb-list">${p.edits.concat([{ at: p.at, text: p.text, now: 1 }]).reverse().map(e => `<div class="wb-edit"><em>${e.now ? '现在' : G.ago(e.at)}</em>${richText(e.text)}</div>`).join('')}</div>` }); };
W.atName = n => { const w = whoByName(n); if (w) W.prof(w); };
W.cmtLike = (pid, cid) => { const p = postOf(pid); const c = p && findC(p.cmts, cid); if (!c) return; const me = myAcc(), i = c.likes.indexOf(me); if (i >= 0) c.likes.splice(i, 1); else c.likes.push(me); saveD(); G.repaint(APP); };
const findC = (arr, id) => { for (const c of arr) { if (c.id === id) return c; const k = findC(c.kids || [], id); if (k) return k; } return null; };
let REPLY = null;
W.replyTo = (pid, cid) => { const p = postOf(pid), c = p && findC(p.cmts, cid); REPLY = c ? { pid, cid, who: c.by } : null; const i = document.getElementById('wbCmtIn'); if (i) { i.placeholder = c ? '回复 @' + nameOf(c.by) : '写评论…'; i.focus(); } };
W.sendCmt = async pid => {
    const p = postOf(pid); const i = document.getElementById('wbCmtIn'); const t = i && i.value.trim(); if (!p || !t) return;
    if (p.cmtOff && !isMine(p.by)) return X.toast('博主关闭了评论', '');
    const c = { id: G.uid('c'), by: myAcc(), text: t, at: Date.now(), likeN: 0, likes: [], kids: [] };
    if (REPLY && REPLY.pid === pid) { const par = findC(p.cmts, REPLY.cid); const top = p.cmts.find(x => x === par || findC(x.kids || [], REPLY.cid)) || par; c.toWho = REPLY.who; (top ? top.kids : p.cmts).push(c); } else p.cmts.push(c);
    REPLY = null; saveD(); G.repaint(APP);
    // 有人回你
    const ac = charOfW(p.by), tc = c.toWho && charOfW(c.toWho);
    const who = tc || ac;
    if (who && !isMine(p.by === 'me' ? '' : p.by)) {
        const o = X.json(await X.ask(`${X.who(who)}\n微博上${p.by === charWho(who) ? '你发的' : nameOf(p.by) + '发的'}一条微博：「${p.text.slice(0, 200)}」\n${myAcc() === 'me' ? X.me(who) + '（就是她）' : '一个叫「' + nameOf(myAcc()) + '」的网友（其实是她的小号，你不一定认得出）'}在评论区说：「${t}」\n你会在评论区回什么？（按你的性格，公开场合说话；不回就写空）只输出 JSON：{"text":"回复，没有就空","like":true或false}`));
        if (o && o.like) { c.likes.push(charWho(who)); if (p.by === charWho(who)) c.authorLiked = true; }
        if (o && o.text) { const r = { id: G.uid('c'), by: charWho(who), text: X.plain(o.text).slice(0, 200), at: Date.now(), likeN: 0, likes: [], kids: [], toWho: c.by }; const top = p.cmts.find(x => x === c || (x.kids || []).includes(c)); (top ? top.kids : p.cmts).push(r); note('cmt', r.by, p.id, r.text); G.notify(APP, who, `🧣 <b>${X.esc(who.name)}</b> 在微博回复了你`, r.text, X.go('gysWeiboOpenPost', p.id)); }
        saveD(); G.repaint(APP);
    } else if (Math.random() < 0.5) setTimeout(() => genCmts(p, 2, { quiet: false }), 1500);
};
W.prof = w => {
    if (!w) return;
    if (!G.prof(APP, w).gen && G.base(w)) G.genProfiles(APP, [w]).then(() => G.repaint(APP));
    G.push(APP, { title: '', id: 'u_' + w, cls: 'wb-pf-body', html: () => profile(w), right: isMine(w) ? `<span onclick="gysWb.editMe('${w}')">编辑</span>` : `<span onclick="gysWb.profMenu('${w}')">⋯</span>` });
};
W.editMe = w => G.editProf(APP, w, [['school', '学校 / 公司', '可不填']]);
W.profMenu = async w => {
    const b = G.base(w); const opts = ['编辑 TA 的主页（换头像、改简介）', '私信', following('me').includes(w) ? '取消关注' : '关注', '把 TA 设成特别关注'];
    if (b && b.kind === 'char') opts.push('和 TA 官宣');
    const i = await chooser(opts); if (i == null) return;
    const o = opts[i];
    if (o.startsWith('编辑')) G.editProf(APP, w);
    else if (o === '私信') W.dm(w);
    else if (o.endsWith('关注')) W.follow(w);
    else if (o.startsWith('把 TA')) { (D.star = D.star || []).includes(w) || D.star.push(w); saveD(); X.toast('⭐ 特别关注了', 'TA 一发微博你就会收到提醒'); }
    else if (o === '和 TA 官宣') W.announce(w);
};
W.tabP = (w, t) => { PT[w] = t; G.repaint(APP); };
const PT = {};
function profile(w) {
    const p = G.prof(APP, w), b = G.base(w), x = xacc(w);
    const tab = PT[w] || 'posts';
    const mine = isMine(w);
    const L = D.posts.filter(q => q.by === w && (mine || (visibleTo(q, 'me') && q.vis !== 'self'))).sort((a, b2) => (b2.pin - a.pin) || (b2.at - a.at));
    const selfN = !mine ? D.posts.filter(q => q.by === w && q.vis === 'self').length : 0;
    const likesL = D.posts.filter(q => (q.likes || []).includes(w) && q.by !== w).slice(0, 40);
    const links = G.linksOf(APP, w);
    const stKey = b && b.kind === 'char' ? 'c' + b.obj.id : '';
    return `<div class="wb-pf">
      <div class="wb-cover" style="${p.bg ? `background-image:url('${p.bg}')` : ''}"></div>
      <div class="wb-pf-top">${G.av(APP, w, 76, 'wb-pf-av')}
        <div class="wb-pf-btns">${mine ? `<span class="wb-pbtn" onclick="gysWb.editMe('${w}')">编辑资料</span>` : `<span class="wb-pbtn${following('me').includes(w) ? ' on' : ''}" onclick="gysWb.follow('${w}')">${following('me').includes(w) ? (isFollow(w, 'me') ? '互相关注' : '已关注') : '+ 关注'}</span><span class="wb-pbtn" onclick="gysWb.dm('${w}')">私信</span>`}</div></div>
      <div class="wb-pf-nm">${esc(p.nick)}${vBadge(w)}${vipBadge(w)}${p.gender === '男' ? ' <i class="wb-g m">♂</i>' : p.gender === '女' ? ' <i class="wb-g f">♀</i>' : ''}</div>
      ${p.verify && p.verify.text ? `<div class="wb-pf-v">${p.verify.t === 'blue' ? '🔵' : '🟡'} ${esc(p.verify.text)}</div>` : ''}
      <div class="wb-pf-bio">${esc(p.bio || '这个人很懒，什么都没写')}</div>
      <div class="wb-pf-meta">${p.handle ? 'ID：' + esc(p.handle) + ' · ' : ''}IP属地：${esc(ipOf(w))}${p.school ? ' · ' + esc(p.school) : ''}</div>
      ${links.length ? `<div class="wb-pf-links">${links.map(([k, h]) => `<span>${G.APPS[k].ico} ${G.APPS[k].n}：${esc(h)}</span>`).join('')}</div>` : ''}
      <div class="wb-pf-n"><span><b>${G.fmtN(p.following + (mine ? following('me').length : 0))}</b> 关注</span><span><b>${G.fmtN(p.followers)}</b> 粉丝</span><span><b>${G.fmtN(L.reduce((n, q) => n + totalLikes(q), 0) + (p.likes || 0))}</b> 转评赞</span></div>
      ${stKey ? `<div class="wb-pf-st" onclick="gysWb.superOpen('${stKey}')">💎 ${esc(p.nick)}超话 ›</div>` : ''}
      ${x && x.kind === 'alt' && x.owner && !mine ? `<div class="wb-pf-alt">🕵️ 这个号有点眼熟……<span onclick="gysWb.guessAlt('${w}')">我知道是谁</span></div>` : ''}
      ${x && x.kind === 'bot' ? `<div class="wb-pf-alt">🤖 这是你建的 bot <span onclick="gysWb.botEdit('${x.id}')">管理</span></div>` : ''}
      <div class="wb-ptabs">${[['posts', '微博 ' + L.length], ['pics', '相册'], ['likes', mine ? '赞过' : 'TA 赞过的'], ['super', '超话']].map(([k, n]) => `<span class="${tab === k ? 'on' : ''}" onclick="gysWb.tabP('${w}','${k}')">${n}</span>`).join('')}</div>
      ${tab === 'posts' ? (L.length ? L.map(q => card(q, { inProfile: true, noFollow: true })).join('') : '<div class="gys-empty">还没发过微博</div>') + (selfN ? `<div class="gys-empty">🔒 还有 ${selfN} 条「仅自己可见」，只有翻 TA 的手机才看得到</div>` : '')
        : tab === 'pics' ? `<div class="wb-album">${L.flatMap(q => (q.imgs || []).map(s => `<span style="background-image:url('${s}')" onclick="GYS.imgView('${s}')"></span>`).concat((q.pics || []).map(t => `<span class="t" style="background:${picBg(t)}" onclick="gysWb.open('${q.id}')"><em>${esc(t)}</em></span>`))).join('') || '<div class="gys-empty">没有图片</div>'}</div>`
        : tab === 'likes' ? (likesL.length ? likesL.map(q => card(q)).join('') : '<div class="gys-empty">还没赞过别人</div>')
        : superList(w)}
    </div>`;
}
function superList(w) {
    const L = Object.entries(D.supers).filter(([k, s]) => (s.members || {})[w]);
    return L.length ? L.map(([k, s]) => `<div class="wb-row" onclick="gysWb.superOpen('${k}')"><span class="wb-sico">💎</span><div><b>${esc(s.name)}超话</b><em>Lv.${lvOf(s.members[w].exp)} · 已签到 ${s.members[w].days || 0} 天</em></div></div>`).join('') : '<div class="gys-empty">没加入超话</div>';
}

/* ---------------- 发微博 ---------------- */
let DRAFT = null;
W.compose = (pre) => {
    DRAFT = Object.assign({ text: '', imgs: [], vis: 'public', loc: '', st: '', poll: null, rp: null, lot: null }, pre || {}); DRAFT.did = DRAFT.did || G.uid('dr'); DRAFT.imgs = (DRAFT.imgs || []).slice();
    G.push(APP, { title: '发微博', id: 'compose', html: composeHtml, right: `<span class="wb-send" onclick="gysWb.send()">发送</span>`, onLeave: () => { if (DRAFT) keepDraft(1); DRAFT = null; } });
};
/* ---------- 📝 草稿箱（255）：写到一半退出来自动存；「我」→ 草稿箱 里接着写 ---------- */
const DRAFT_SAVED = [['📝 存进草稿箱了', '在「我」→ 草稿箱 里接着写'], ['草稿存好了', '下次接着写'], ['已保存到草稿箱', '']];
function keepDraft(toast) {
    if (!DRAFT || !G.draftOn()) return; const el = document.getElementById('wbCmpT'); if (el) DRAFT.text = el.value;
    D.drafts = D.drafts || []; const i = D.drafts.findIndex(x => x.did === DRAFT.did);
    const has = String(DRAFT.text || '').trim() || (DRAFT.imgs || []).length || DRAFT.poll;
    if (!has) { if (i >= 0) { D.drafts.splice(i, 1); saveD(); } return; }
    const o = { did: DRAFT.did, text: DRAFT.text, imgs: (DRAFT.imgs || []).slice(), vis: DRAFT.vis, loc: DRAFT.loc, st: DRAFT.st, poll: DRAFT.poll, rp: DRAFT.rp, lot: DRAFT.lot || null, at: Date.now() };
    if (i >= 0) D.drafts[i] = o; else D.drafts.unshift(o); if (D.drafts.length > 50) D.drafts.length = 50; saveD();
    if (toast) { const t = X.pick(DRAFT_SAVED); X.toast(t[0], t[1]); }
}
const dropDraft = did => { if (!D.drafts) return; D.drafts = D.drafts.filter(x => x.did !== did); saveD(); };
W.drafts = () => G.push(APP, { title: '草稿箱', id: 'drafts', html: () => (D.drafts || []).length ? `<div class="wb-drafts">${D.drafts.map(d => `<div class="wb-draft" onclick="gysWb.draftOpen('${d.did}')"><div><p>${esc(String(d.text || '').slice(0, 80)) || '（只有图片）'}</p><small>${G.ago(d.at)}${d.imgs && d.imgs.length ? ' · 🖼️ ' + d.imgs.length : ''}${d.poll ? ' · 📊 投票' : ''}${d.vis && d.vis !== 'public' ? ' · 🔒' : ''}</small></div><span onclick="event.stopPropagation();gysWb.draftDel('${d.did}')">删除</span></div>`).join('')}</div>` : '<div class="gys-empty">草稿箱是空的<br>写到一半退出来，会自动存在这里</div>' });
W.draftOpen = did => { const d = (D.drafts || []).find(x => x.did === did); if (d) W.compose(Object.assign({}, d)); };
W.draftDel = async did => { if (!(await G.confirm('删掉这条草稿？'))) return; dropDraft(did); G.repaint(APP); };
function composeHtml() {
    const d = DRAFT;
    return `<div class="wb-cmp">
      <div class="wb-cmp-who" onclick="gysWb.switchAcc()">${G.av(APP, myAcc(), 28)} <b>${esc(nameOf(myAcc()))}</b>${myAcc() !== 'me' ? '<em>（小号）</em>' : ''} <i>切换 ›</i></div>
      <textarea id="wbCmpT" placeholder="分享新鲜事…" oninput="gysWb.__d('text', this.value)">${esc(d.text)}</textarea>
      ${d.imgs.length ? `<div class="wb-pics three">${d.imgs.map((s, i) => `<span class="wb-pic" style="background-image:url('${s}')"><b onclick="gysWb.__rmImg(${i})">✕</b></span>`).join('')}</div>` : ''}
      ${d.poll ? `<div class="wb-poll"><b>📊 ${esc(d.poll.q)}</b>${d.poll.opts.map(o => `<div class="wb-po"><em>${esc(o.t)}</em></div>`).join('')}<small onclick="gysWb.__d('poll', null);GYS.repaint('weibo')">去掉投票</small></div>` : ''}
      <div class="wb-cmp-tags">${d.loc ? `<span>📍 ${esc(d.loc)}</span>` : ''}${d.st ? `<span>💎 ${esc((D.supers[d.st] || {}).name || d.st)}超话</span>` : ''}<span>${{ public: '🌐 公开', fans: '👥 仅粉丝可见', friends: '🤝 好友圈', self: '🔒 仅自己可见' }[d.vis]}</span>${d.lot ? `<span>🎁 抽「${esc(d.lot.prize)}」${d.lot.n} 名 · ${G.hm(d.lot.end)} 开奖</span>` : ''}</div>
      <div class="wb-cmp-tools">
        <span onclick="gysWb.__img()">🖼️ 图片</span><span onclick="gysWb.__ins('#','#')">＃ 话题</span><span onclick="gysWb.__at()">@ 好友</span><span onclick="gysWb.__emo()">😀 表情</span>
        <span onclick="gysWb.__loc()">📍 位置</span><span onclick="gysWb.__poll()">📊 投票</span><span onclick="gysWb.__vis()">🔒 谁能看</span><span onclick="gysWb.__st()">💎 超话</span>${lotOn() ? `<span onclick="gysWb.__lot()">🎁 ${d.lot ? '去掉抽奖' : '抽奖'}</span>` : ''}</div>
    </div>`;
}
W.__d = (k, v) => { if (DRAFT) { DRAFT[k] = v; clearTimeout(W.__dt); W.__dt = setTimeout(() => keepDraft(), 800); } };
W.__img = () => G.pickImgs(9 - DRAFT.imgs.length, a => { DRAFT.imgs = DRAFT.imgs.concat(a).slice(0, 9); keepDraft(); G.repaint(APP); });
W.__rmImg = i => { DRAFT.imgs.splice(i, 1); keepDraft(); G.repaint(APP); };
W.__ins = (a, b) => { const t = document.getElementById('wbCmpT'); if (!t) return; const s = t.selectionStart || t.value.length; t.value = t.value.slice(0, s) + a + b + t.value.slice(s); DRAFT.text = t.value; t.focus(); t.selectionStart = t.selectionEnd = s + a.length; };
W.__at = async () => { const L = G.people().filter(w => w !== 'me'); const i = await chooser(L.map(nameOf)); if (i != null) W.__ins('@' + nameOf(L[i]) + ' ', ''); };
W.__emo = async () => { const E = ['[笑哭]', '[允悲]', '[心]', '[哭]', '[偷笑]', '[抱抱]', '[doge]', '[赞]', '[吃瓜]', '[害羞]', '[可怜]']; const i = await chooser(E.map(e => e + ' ' + richText(e))); if (i != null) W.__ins(E[i], ''); };
W.__loc = async () => { const v = await G.input('在哪儿？（空着就是不显示位置）', DRAFT.loc); if (v !== null && v !== undefined) { DRAFT.loc = v.trim(); G.repaint(APP); } };
W.__vis = async () => { const v = await chooser(['🌐 公开', '👥 仅粉丝可见', '🤝 好友圈（互相关注的人）', '🔒 仅自己可见']); if (v != null) { DRAFT.vis = ['public', 'fans', 'friends', 'self'][v]; G.repaint(APP); } };
W.__poll = async () => { const q = await G.input('投票问题：', ''); if (!q) return; const o = await G.input('选项，用空格隔开：', '是 否'); if (!o) return; DRAFT.poll = { q, opts: o.split(/\s+/).filter(Boolean).slice(0, 6).map(t => ({ t, n: 0 })), mine: null }; G.repaint(APP); };
W.__st = async () => { ensureSupers(); const K = Object.keys(D.supers); const i = await chooser(['不发到超话'].concat(K.map(k => D.supers[k].name + '超话'))); if (i != null) { DRAFT.st = i ? K[i - 1] : ''; G.repaint(APP); } };
W.send = async () => {
    const d = DRAFT; const t = (document.getElementById('wbCmpT') || {}).value || d.text;
    if (!t.trim() && !d.imgs.length) return X.toast('写点什么吧', '');
    const p = mkPost({ by: myAcc(), text: t.trim(), imgs: d.imgs, vis: d.vis, loc: d.loc, st: d.st, poll: d.poll, rp: d.rp, from: devOf(myAcc()), lot: d.lot && lotOn() ? Object.assign({}, d.lot, { ents: [], wins: [], done: 0 }) : null });
    if (p.lot && p.vis !== 'self') lotJoinChars(p);
    if (p.poll) p.poll.opts.forEach(o => { o.n = G.rnd(3, 80); });
    if (p.st) joinSuper(p.st, myAcc(), 3);
    dropDraft(d.did); DRAFT = null; G.back(APP); X.toast(X.v('🧣 发出去了', '发好了', '已发送'), p.vis === 'self' ? '仅自己可见，别人看不到' : '');
    if (p.vis !== 'self') setTimeout(() => charReact(p), 1200);
};
W.switchAcc = async () => {
    const L = ['me'].concat(D.alts || []);
    const i = await chooser(L.map(w => (w === 'me' ? '大号：' : '小号：') + nameOf(w)).concat(['＋ 注册一个小号']));
    if (i == null) return;
    if (i === L.length) return W.newAlt();
    D.act = L[i]; saveD(); G.repaint(APP); X.toast('现在用：' + nameOf(L[i]), '');
};
W.newAlt = async () => {
    const n = await G.input('小号叫什么？', G.pick(['一只不知名网友', '今天也在潜水', '路人甲乙丙', 'momo_' + G.rnd(100, 999)])); if (!n) return;
    const w = 'x:alt_' + Date.now().toString(36); D.xacc[w] = { kind: 'myalt', name: n }; D.alts = (D.alts || []).concat(w);
    G.prof(APP, w, { nick: n, emoji: G.pick(['🌚', '🫥', '👻', '🐾', '🍃']), followers: G.rnd(0, 20), following: G.rnd(5, 40), gen: true });
    D.act = w; saveD(); G.repaint(APP); X.toast('🕵️ 小号注册好了', '现在用小号发、评论，TA 们不知道是你（聪明的可能认得出）');
};

/* ---------------- 页面 ---------------- */
let FT = 'follow';
W.ft = t => { FT = t; G.repaint(APP); };
function feed() {
    const mute = D.mute || [];
    let L = D.posts.filter(p => visibleTo(p, 'me') && !mute.includes(p.by) && !(p.vis === 'self' && !isMine(p.by)));
    if (FT === 'follow') L = L.filter(p => isMine(p.by) || following('me').includes(p.by));
    else if (FT === 'near') { const me = ipOf('me'); L = L.filter(p => p.ip === me); }
    else L = L.filter(p => !isMine(p.by));
    const stories = FT === 'follow' ? storyBar() : '';
    return `${stories}${BUSY.feed ? '<div class="gys-busy">⏳ 正在刷新…</div>' : ''}${L.length ? L.slice(0, 80).map(p => card(p)).join('') : `<div class="gys-empty">${FT === 'near' ? '同城还没有人发微博' : '还没有微博'}<br><span class="gys-btn sm" onclick="gysWb.refresh()">🔄 刷新一下</span></div>`}`;
}
W.refresh = () => genFeed(8);
function head(tab) {
    if (tab === 'home') return `<div class="gys-hd wb-hd0"><span class="gys-bk" onclick="GYS.close('weibo')">${G.ic('back', 22)}</span><div class="wb-ft">${[['follow', '关注'], ['hot', '推荐'], ['near', '同城']].map(([k, n]) => `<span class="${FT === k ? 'on' : ''}" onclick="gysWb.ft('${k}')">${n}</span>`).join('')}</div><span class="gys-hr"><span onclick="gysWb.refresh()">${G.ic('flame', 22)}</span><span onclick="gysWb.compose()">${G.ic('compose', 22)}</span></span></div>`;
    const T = { video: '视频', find: '发现', msg: '消息', me: '我' };
    return `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('weibo')">${G.ic('back', 22)}</span><b>${T[tab] || '微博'}</b><span class="gys-hr">${tab === 'msg' ? '' : tab === 'video' ? '<span onclick="gysWb.videoGen()">' + G.ic('film', 22) + '</span>' : tab === 'find' ? '<span onclick="gysWb.hotRefresh()">' + G.ic('flame', 22) + '</span>' : ''}</span></div>`;
}
function find() {
    const H = D.hot.list.slice(0, 10);
    return `<div class="wb-search" onclick="gysWb.search()">🔍 搜索微博、找人、话题</div>
      <div class="wb-sec"><div class="wb-sech"><b>🔥 微博热搜</b><span onclick="gysWb.hotList()">更多 ›</span></div>
      ${BUSY.hot ? '<div class="gys-busy">⏳ 正在刷新热搜…</div>' : H.length ? H.map((h, i) => hotRow(h, i)).join('') : '<div class="gys-empty">还没有热搜 <span class="gys-btn sm" onclick="gysWb.hotRefresh()">刷新热搜</span></div>'}</div>
      <div class="wb-sec"><div class="wb-sech"><b>💎 超话社区</b><span onclick="gysWb.superAll()">全部 ›</span></div>${superTop()}</div>
      <div class="wb-sec"><div class="wb-sech"><b>📹 视频号</b><span onclick="gysWb.videoAll()">更多 ›</span></div>${videoTop()}</div>
      <div class="wb-sec"><div class="wb-sech"><b>👀 找人</b><span onclick="gysWb.people()">全部 ›</span></div>${cast().slice(0, 6).map(w => personRow(w)).join('')}</div>
      <div class="wb-sec"><div class="wb-sech"><b>🤖 我的 bot</b><span onclick="gysWb.bots()">管理 ›</span></div>${(D.bots || []).slice(0, 3).map(b => personRow(b.who)).join('') || '<div class="gys-empty" style="padding:12px">建一个 bot：投稿 bot、每日一句 bot、自动回复 bot……<br><span class="gys-btn sm" onclick="gysWb.botEdit()">＋ 新建 bot</span></div>'}</div>`;
}
const hotTag = t => t ? `<i class="wb-ht ${{ 爆: 'b', 沸: 'f', 热: 'r', 新: 'n' }[t] || ''}">${t}</i>` : '';
const hotRow = (h, i) => `<div class="wb-hot" onclick="gysWb.topic('${esc(h.title).replace(/'/g, '')}')"><span class="wb-hn n${i < 3 ? i + 1 : ''}">${i + 1}</span><b>${esc(h.title)}</b>${h.bought ? '<i class="wb-ht ad">荐</i>' : hotTag(h.tag)}<em>${G.fmtN(h.heat)}</em></div>`;
W.hotRefresh = () => genHot();
W.hotList = () => G.push(APP, { title: '微博热搜', html: () => `<div class="wb-hottabs"><span class="on">实时热搜</span></div>${BUSY.hot ? '<div class="gys-busy">⏳ 正在刷新…</div>' : ''}${D.hot.list.map(hotRow).join('') || '<div class="gys-empty">还没有热搜</div>'}<div class="gys-acts"><span class="gys-btn" onclick="gysWb.hotRefresh()">🔄 刷新热搜</span><span class="gys-btn ghost" onclick="gysWb.buyHot()">💰 买个热搜</span></div><div class="gys-empty" style="padding:6px 20px 30px;font-size:12px">热搜每次刷新调一次模型（副 API）。「买个热搜」：你写一个词，它会挂在榜上（带「荐」字），大家都看得到。</div>`, right: '<span onclick="gysWb.hotRefresh()">' + G.ic('flame', 22) + '</span>' });
W.buyHot = async () => { const t = await G.input('想让什么上热搜？', '#' + G.meName() + '今天好可爱#'); if (!t) return; D.hot.list.unshift({ id: G.uid('h'), title: X.plain(t).replace(/#/g, '').slice(0, 30), tag: '', heat: G.rnd(200, 900) * 10000, desc: '', bought: true, at: Date.now() }); saveD(); G.repaint(APP); X.toast('💰 买好了', '挂在热搜榜上了'); const c = allChars()[0]; if (c && Math.random() < 0.6) X.reach(c, `你刷微博看到热搜上挂着「${t}」，好像是她买的热搜`); };
W.topic = k => {
    k = String(k || '').replace(/#/g, '');
    const h = D.hot.list.find(x => x.title === k);
    G.push(APP, { title: '#' + k + '#', html: () => {
        const L = D.posts.filter(p => visibleTo(p, 'me') && p.vis === 'public' && ((p.topics || []).includes(k) || p.text.indexOf(k) >= 0 || (h && h.about && p.by === h.about)));
        return `<div class="wb-topic"><b>#${esc(k)}#</b>${h ? `<em>阅读 ${G.fmtN(h.heat * 13)} · 讨论 ${G.fmtN(Math.round(h.heat / 40))}</em><p>${esc(h.desc || '')}</p>` : ''}
          <div class="gys-acts"><span class="gys-btn sm" onclick="gysWb.compose({text:'#${esc(k)}# '})">参与话题</span>${h ? `<span class="gys-btn sm ghost" onclick="gysWb.dropHot('${h.id}')">${h.bought ? '撤掉这个热搜' : '🤫 撤热搜'}</span>` : ''}<span class="gys-btn sm ghost" onclick="gysWb.topicGen('${esc(k)}')">看看大家在说什么</span></div></div>
          ${BUSY['t' + k] ? '<div class="gys-busy">⏳ 正在加载…</div>' : ''}${L.map(p => card(p)).join('') || '<div class="gys-empty">还没人在这个话题下发微博</div>'}`;
    } });
    if (h && !D.posts.some(p => (p.topics || []).includes(k))) W.topicGen(k);
};
W.dropHot = async id => { const h = D.hot.list.find(x => x.id === id); if (!h) return; D.hot.list = D.hot.list.filter(x => x !== h); saveD(); X.toast('🤫 撤掉了', X.v('热搜上找不到它了', '公关成功')); G.back(APP); };
W.topicGen = async k => {
    if (BUSY['t' + k]) return; BUSY['t' + k] = 1; G.repaint(APP);
    try {
        const h = D.hot.list.find(x => x.title === k);
        const pool = cast().sort(() => Math.random() - 0.5).slice(0, 8).concat(MKT.map(m => m[0]));
        const o = X.json(await X.ask(`微博热搜「#${k}#」${h && h.desc ? '，导语：' + h.desc : ''}${h && h.about ? '，跟' + nameOf(h.about) + '有关' : ''}。\n可能来发微博的人：\n${castLines(pool)}\n· 还有营销号和路人\n写 5 条这个话题下的微博（营销号带节奏、粉丝控评、路人吃瓜、当事人可能回应），每条带 2~4 条评论。只输出 JSON 数组：[{"by":"名字","text":"正文（带 #${k}#）","pics":[],"likes":数字,"cmts":[{"by":"名字","text":"评论"}]}]`));
        (Array.isArray(o) ? o : []).reverse().forEach(x => { if (!x || !x.text) return; let w = whoByName(x.by) || (/营销|吃瓜|八卦/.test(x.by || '') ? 'x:mkt1' : passer(x.by)); if (w === 'me') return; const p = mkPost({ by: w, text: X.plain(x.text).slice(0, 400), pics: (x.pics || []).slice(0, 6), topics: [k], likeN: Math.max(0, Number(x.likes) || G.rnd(50, 5000)), rpN: G.rnd(5, 500) }); addCmts(p, x.cmts); p.cmtN = G.rnd(20, 900); });
        saveD();
    } finally { delete BUSY['t' + k]; G.repaint(APP); }
};
W.search = async () => {
    const q = await G.input('搜什么？（人、话题、微博里的字）', ''); if (!q) return;
    G.push(APP, { title: '搜「' + q + '」', html: () => {
        const ppl = G.people().concat(Object.keys(D.xacc)).filter(w => nameOf(w).indexOf(q) >= 0 || (G.base(w) && G.base(w).name.indexOf(q) >= 0));
        const L = D.posts.filter(p => visibleTo(p, 'me') && p.vis !== 'self' && p.text.indexOf(q) >= 0).slice(0, 40);
        return `${ppl.length ? '<div class="wb-sech"><b>用户</b></div>' + ppl.slice(0, 10).map(personRow).join('') : ''}<div class="wb-sech"><b>微博</b></div>${L.map(p => card(p)).join('') || '<div class="gys-empty">没搜到</div>'}`;
    } });
};
function personRow(w) {
    const p = G.prof(APP, w);
    return `<div class="wb-row" onclick="gysWb.prof('${w}')">${G.av(APP, w, 44)}<div><b>${esc(p.nick)}${vBadge(w)}</b><em>${esc((p.verify && p.verify.text) || p.bio || '')}</em><small>粉丝 ${G.fmtN(p.followers)}</small></div>${isMine(w) ? '' : `<span class="wb-fbtn${following('me').includes(w) ? ' on' : ''}" onclick="event.stopPropagation();gysWb.follow('${w}')">${following('me').includes(w) ? '已关注' : '+ 关注'}</span>`}</div>`;
}
W.people = () => G.push(APP, { title: '找人', html: () => `<div class="gys-acts"><span class="gys-btn sm" onclick="gysWb.genPeople()">✨ 生成新账号</span><span class="gys-btn sm ghost" onclick="gysWb.genProfs()">✍️ 让大家把主页补全</span></div>${BUSY.ppl ? '<div class="gys-busy">⏳ 正在生成…</div>' : ''}<div class="wb-sech"><b>认识的人</b></div>${cast().map(personRow).join('')}<div class="wb-sech"><b>营销号 · 路人 · bot</b></div>${Object.keys(D.xacc).filter(w => !isMine(w) && (D.xacc[w].kind !== 'alt')).slice(0, 40).map(personRow).join('')}` });
W.genProfs = async () => { BUSY.ppl = 1; G.repaint(APP); try { const L = cast().filter(w => !G.prof(APP, w).gen); for (let i = 0; i < L.length; i += 8) await G.genProfiles(APP, L.slice(i, i + 8)); } finally { BUSY.ppl = 0; G.repaint(APP); } };
// ✨ 生成新账号：进 NPC 列表（要求可填可空），绑给你挑的人
W.genPeople = async () => {
    if (typeof window.gyNpcGen !== 'function') return X.toast('要先有 NPC 列表', '');
    const wish = await G.input('想要什么样的人？（可以空着，空着就照着大家的人设随便生成）', ''); if (wish === null || wish === undefined) return;
    const L = allChars();
    const bind = await chooser(['🌐 通用（谁都认识）', '绑给我'].concat(L.map(c => '绑给 ' + c.name)));
    if (bind == null) return;
    BUSY.ppl = 1; G.repaint(APP);
    try {
        const add = await window.gyNpcGen({ me: true, charIds: L.slice(0, 4).map(c => String(c.id)), wbIds: [], n: 5, wish: (wish ? wish + '；' : '') + '这些人都玩微博', owners: bind === 0 ? [] : bind === 1 ? ['me'] : [String(L[bind - 2].id)], all: bind === 0, from: 'gen' });
        if (add && add.length) { await G.genProfiles(APP, add.map(n => 'n:' + n.id)); add.forEach(n => following('me').push('n:' + n.id)); saveD(); X.toast('✨ 来了 ' + add.length + ' 个人', '他们也在 NPC 列表里'); }
    } finally { BUSY.ppl = 0; G.repaint(APP); }
};

/* ---------------- 超话 ---------------- */
function ensureSupers() { allChars().forEach(c => { const k = 'c' + c.id; if (!D.supers[k]) D.supers[k] = { name: nameOf('c:' + c.id), owner: 'c:' + c.id, members: {}, intro: '' }; else D.supers[k].name = nameOf('c:' + c.id); }); }
const lvOf = exp => exp >= 300 ? 10 : exp >= 200 ? 8 : exp >= 120 ? 6 : exp >= 60 ? 4 : exp >= 20 ? 2 : 1;
function joinSuper(k, w, exp) { const s = D.supers[k]; if (!s) return; const m = s.members[w] = s.members[w] || { exp: 0, days: 0, last: '' }; m.exp += exp || 0; saveD(); }
function superTop() { ensureSupers(); return Object.entries(D.supers).slice(0, 4).map(([k, s]) => `<div class="wb-row" onclick="gysWb.superOpen('${k}')"><span class="wb-sico">💎</span><div><b>${esc(s.name)}超话</b><em>${Object.keys(s.members).length + G.rnd(0, 0)} 位粉丝 · ${D.posts.filter(p => p.st === k).length} 条帖子</em></div></div>`).join('') || '<div class="gys-empty">还没有超话</div>'; }
W.superAll = () => G.push(APP, { title: '超话社区', html: () => `${superTop()}<div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysWb.superNew()">＋ 建一个超话</span></div>` });
W.superNew = async () => { const n = await G.input('超话叫什么？（不用写「超话」两个字）', ''); if (!n) return; const k = 's' + Date.now().toString(36); D.supers[k] = { name: X.plain(n).slice(0, 20), owner: 'me', members: {}, intro: '' }; joinSuper(k, 'me', 0); saveD(); W.superOpen(k); };
W.superOpen = k => {
    ensureSupers(); const s = D.supers[k]; if (!s) return;
    G.push(APP, { title: s.name + '超话', html: () => {
        const me = s.members[myAcc()], L = D.posts.filter(p => p.st === k && visibleTo(p, 'me'));
        const day = X.day();
        return `<div class="wb-sup" style="${s.owner && G.avSrc(APP, s.owner) ? `--bgi:url('${G.avSrc(APP, s.owner)}')` : ''}"><b>💎 ${esc(s.name)}超话</b><em>${Object.keys(s.members).length} 位成员 · ${L.length} 条帖子</em>
          ${me ? `<div class="wb-lv">Lv.${lvOf(me.exp)} · 经验 ${me.exp} · 连续签到 ${me.days} 天</div>` : ''}
          <div class="gys-acts"><span class="gys-btn sm" onclick="gysWb.sign('${k}')">${me && me.last === day ? '✅ 今天签过了' : '签到'}</span><span class="gys-btn sm ghost" onclick="gysWb.compose({st:'${k}'})">发帖</span><span class="gys-btn sm ghost" onclick="gysWb.superGen('${k}')">看看粉丝在聊什么</span></div></div>
          ${BUSY['s' + k] ? '<div class="gys-busy">⏳ 正在加载…</div>' : ''}${L.map(p => card(p)).join('') || '<div class="gys-empty">还没人发帖</div>'}`;
    } });
    if (!D.posts.some(p => p.st === k)) W.superGen(k);
};
W.sign = k => { const s = D.supers[k]; if (!s) return; const w = myAcc(); const m = s.members[w] = s.members[w] || { exp: 0, days: 0, last: '' }; const day = X.day(); if (m.last === day) return X.toast('今天签过了', ''); const y = new Date(Date.now() - 86400e3); const yd = X.day(y); m.days = m.last === yd ? m.days + 1 : 1; m.last = day; m.exp += 4 + Math.min(10, m.days); saveD(); G.repaint(APP); X.toast('💎 签到成功', `经验 +${4 + Math.min(10, m.days)}，连续 ${m.days} 天`); };
W.superGen = async k => {
    const s = D.supers[k]; if (!s || BUSY['s' + k]) return; BUSY['s' + k] = 1; G.repaint(APP);
    try {
        const ob = s.owner && G.base(s.owner);
        const pool = cast().filter(w => w !== s.owner).sort(() => Math.random() - 0.5).slice(0, 6);
        const hint = typeof window.gyNpcCommentHint === 'function' && s.owner && s.owner.startsWith('c:') ? window.gyNpcCommentHint(s.owner.slice(2), 5, 'weibo') : '';
        const o = X.json(await X.ask(`微博「${s.name}超话」${ob ? `（${ob.name} 的粉丝社区，${ob.name}：${String(ob.persona).slice(0, 200)}）` : ''}。\n可能出现的人：\n${castLines(pool)}\n${hint}\n还有很多粉丝（起网名）。写 6 条超话里的帖子：打卡、安利、饭拍描述、吹彩虹屁、考古、偶尔有对家或黑粉来捣乱被骂走。${ob && ob.kind === 'char' ? `${ob.name}本人偶尔也会潜水回一句。` : ''}每条带 2~4 条评论。只输出 JSON 数组：[{"by":"名字","text":"正文","pics":["图片描述"],"likes":数字,"cmts":[{"by":"名字","text":"评论"}]}]`));
        (Array.isArray(o) ? o : []).reverse().forEach(x => { if (!x || !x.text) return; let w = whoByName(x.by) || passer(x.by); if (w === 'me') return; const p = mkPost({ by: w, text: X.plain(x.text).slice(0, 400), pics: (x.pics || []).slice(0, 6), st: k, likeN: Math.max(0, Number(x.likes) || G.rnd(5, 300)) }); joinSuper(k, w, G.rnd(5, 120)); addCmts(p, x.cmts); });
        saveD();
    } finally { delete BUSY['s' + k]; G.repaint(APP); }
};

/* ---------------- 📹 视频号 ---------------- */
const vThumb = v => `<span class="wb-vt" style="background:linear-gradient(135deg,hsl(${(String(v.id).length * 47) % 360},60%,55%),hsl(${(String(v.id).length * 47 + 50) % 360},60%,42%))">${esc(v.cover || '🎬')}<i>${esc(v.dur || '0:15')}</i></span>`;
function videoTop() {
    const L = (D.videos || []).slice(0, 3);
    return L.length ? L.map(v => `<div class="wb-row" onclick="gysWb.videoOpen('${v.id}')">${vThumb(v)}<div><b>${esc(v.title)}</b><em>@${esc(nameOf(v.by))} · ❤️ ${G.fmtN(v.likes)}</em></div></div>`).join('')
        : `<div class="gys-empty" style="padding:12px">还没有视频 ${BUSY.vid ? '<span class="gys-busy">⏳ 刷新中…</span>' : '<span class="gys-btn sm" onclick="gysWb.videoGen()">刷一批</span>'}</div>`;
}
function videoTab() { if (!(D.videos || []).length && !BUSY.vid) setTimeout(() => W.videoGen(), 50); return `${BUSY.vid ? '<div class="gys-busy">⏳ 正在刷新…</div>' : ''}<div class="wb-vgrid">${(D.videos || []).map(v => `<div class="wb-vcard" onclick="gysWb.videoOpen('${v.id}')">${vThumb(v)}<b>${esc(v.title)}</b><em>@${esc(nameOf(v.by))}</em></div>`).join('') || '<div class="gys-empty">还没有视频</div>'}</div><div class="gys-acts"><span class="gys-btn" onclick="gysWb.videoGen()">🔄 刷一批</span><span class="gys-btn ghost" onclick="gysWb.videoPost()">＋ 发个视频</span></div>`; }
W.videoAll = () => G.tab(APP, 'video');
W.videoOpen = id => { const v = (D.videos || []).find(x => x.id === id); if (!v) return; G.push(APP, { title: '视频号', html: () => `<div class="wb-vplay">${esc(v.cover || '🎬')}<b class="wb-vdur">${esc(v.dur || '0:15')}</b></div>
    <div class="wb-vmeta">${G.av(APP, v.by, 42)}<div><b>@${esc(nameOf(v.by))}</b><small>${G.ago(v.at)}</small></div><span class="gys-btn sm ${v.liked ? '' : 'ghost'}" onclick="gysWb.videoLike('${v.id}')">❤️ ${G.fmtN(v.likes)}</span></div>
    <div class="wb-vdesc"><b>${esc(v.title)}</b><p>${esc(v.desc || '')}</p></div>
    <div class="wb-sech"><b>评论 ${(v.cmts || []).length}</b></div>${(v.cmts || []).map(c => `<div class="wb-row sm">${G.av(APP, c.by === 'me' ? 'me' : (whoByName(c.by) || c.by), 34)}<div><b>${esc(nameOf(c.by) || c.by)}</b><em>${esc(c.text)}</em></div></div>`).join('') || '<div class="gys-empty">抢个沙发</div>'}<div class="gys-acts"><span class="gys-btn" onclick="gysWb.videoCmt('${v.id}')">写评论</span></div>` }); };
W.videoLike = id => { const v = (D.videos || []).find(x => x.id === id); if (!v) return; v.liked = !v.liked; v.likes = Math.max(0, (v.likes || 0) + (v.liked ? 1 : -1)); saveD(); G.repaint(APP); };
W.videoCmt = async id => { const v = (D.videos || []).find(x => x.id === id); if (!v) return; const t = await G.input('说点什么', ''); if (!t) return; (v.cmts = v.cmts || []).push({ by: 'me', text: X.plain(t).slice(0, 200) }); saveD(); G.repaint(APP); };
W.videoPost = async () => { const title = await G.input('视频标题（你拍了什么）', ''); if (!title) return; const desc = await G.input('配一句文案（可空）', '') || ''; (D.videos = D.videos || []).unshift({ id: G.uid('v'), by: myAcc(), title: X.plain(title).slice(0, 60), desc: X.plain(desc).slice(0, 200), cover: '🎬', dur: '0:' + G.rnd(10, 59), likes: 0, cmts: [], at: Date.now() }); saveD(); G.repaint(APP); X.toast('发出去啦', ''); };
async function genVideos() {
    if (BUSY.vid) return; BUSY.vid = 1; G.repaint(APP);
    try {
        const pool = cast().sort(() => Math.random() - 0.5).slice(0, 6);
        const o = X.json(await X.ask(`微博「视频号」的推荐流（短视频）。可能出现的人：\n${castLines(pool)}\n还有很多陌生博主（起网名）。写 6 条短视频：日常 vlog、随手拍、才艺、吃播、风景、搞笑段子都行，有的平淡有的很火。每条给封面 emoji、标题、一句文案、时长、点赞数、1~3 条评论。只输出 JSON 数组：[{"by":"名字","cover":"一个emoji","title":"标题","desc":"文案","dur":"0:30","likes":数字,"cmts":[{"by":"名字","text":"评论"}]}]`));
        (Array.isArray(o) ? o : []).reverse().forEach(x => { if (!x || !x.title) return; const w = whoByName(x.by) || passer(x.by); (D.videos = D.videos || []).unshift({ id: G.uid('v'), by: w, cover: String(x.cover || '🎬').slice(0, 2), title: X.plain(x.title).slice(0, 60), desc: X.plain(x.desc || '').slice(0, 200), dur: String(x.dur || '0:' + G.rnd(10, 59)).slice(0, 6), likes: Math.max(0, Number(x.likes) || G.rnd(10, 5000)), liked: false, cmts: (x.cmts || []).slice(0, 3).map(c => ({ by: whoByName(c.by) || c.by, text: X.plain(c.text || '').slice(0, 200) })), at: Date.now() }); });
        if (D.videos.length > 60) D.videos.length = 60; saveD();
    } finally { delete BUSY.vid; G.repaint(APP); }
}
W.videoGen = () => genVideos();

/* ---------------- 消息 / 私信 ---------------- */
let MT = 'all';
W.mt = t => { MT = t; D.notes.forEach(n => { if (t === 'all' || n.t === t) n.read = true; }); saveD(); G.repaint(APP); };
const unread = () => D.notes.filter(n => !n.read).length + Object.values(D.dms).filter(th => th.unread).length;
function msg() {
    const N = D.notes.filter(n => MT === 'all' || n.t === MT);
    const icons = { at: '@', cmt: '💬', like: '❤️', fan: '👤', rp: '↗' };
    const T = Object.entries(D.dms).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
    return `<div class="wb-mtop">${[['at', '@我的', '🔔'], ['cmt', '评论', '💬'], ['like', '赞', '❤️']].map(([k, n, i]) => `<span onclick="gysWb.mt('${k}')" class="${MT === k ? 'on' : ''}"><i>${i}</i>${n}${D.notes.some(x => x.t === k && !x.read) ? '<sup></sup>' : ''}</span>`).join('')}</div>
      ${MT !== 'all' ? `<div class="wb-sech"><b>${{ at: '@我的', cmt: '评论', like: '赞' }[MT]}</b><span onclick="gysWb.mt('all')">私信 ›</span></div>${N.map(n => `<div class="wb-row" onclick="gysWb.open('${n.pid}')">${G.av(APP, n.from, 40)}<div><b>${esc(nameOf(n.from))}</b><em>${icons[n.t] || ''} ${esc(n.text || ({ like: '赞了你的微博', fan: '关注了你', at: '提到了你' }[n.t] || ''))}</em><small>${G.ago(n.at)}</small></div></div>`).join('') || '<div class="gys-empty">还没有</div>'}`
        : `<div class="wb-sech"><b>私信</b><span onclick="gysWb.dmNew()">＋ 发私信</span></div>${T.map(([k, th]) => `<div class="wb-row" onclick="gysWb.dm('${th.with}')">${G.av(APP, th.with, 44)}<div><b>${esc(nameOf(th.with))}</b><em>${esc(((th.msgs || []).slice(-1)[0] || {}).t || '')}</em></div><small>${th.at ? G.ago(th.at) : ''}${th.unread ? ' <sup class="wb-dot"></sup>' : ''}</small></div>`).join('') || '<div class="gys-empty">还没有私信</div>'}`}`;
}
W.dmNew = async () => { const L = G.people().filter(w => w !== 'me').concat(Object.keys(D.xacc).filter(w => !isMine(w))); const i = await chooser(L.map(nameOf)); if (i != null) W.dm(L[i]); };
const thKey = (a, b) => [a, b].sort().join('|');
W.dm = w => {
    const k = thKey(myAcc(), w); const th = D.dms[k] = D.dms[k] || { with: w, me: myAcc(), msgs: [], at: 0 }; th.unread = false; saveD();
    G.push(APP, { title: nameOf(w), id: 'dm_' + k, cls: 'wb-dmb', html: () => `${!isFollow(w, myAcc()) && !G.base(w) ? '<div class="gys-empty" style="padding:8px">对方没有关注你，你的消息会进 TA 的「陌生人消息」</div>' : ''}${th.msgs.map(m => `<div class="wb-dm${m.from === w ? '' : ' me'}">${m.from === w ? G.av(APP, w, 34) : ''}<span>${esc(m.t)}</span></div>`).join('')}${BUSY['d' + k] ? '<div class="gys-busy">对方正在输入…</div>' : ''}`, foot: () => `<div class="wb-cin"><input id="wbDmIn" placeholder="发私信…" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysWb.dmSend('${w}')"><span onclick="gysWb.dmSend('${w}')">发送</span></div>`, after: r => { const b = r.querySelector('.gys-body'); if (b) b.scrollTop = b.scrollHeight; } });
};
W.dmSend = async w => {
    const i = document.getElementById('wbDmIn'); const t = i && i.value.trim(); if (!t) return;
    const k = thKey(myAcc(), w), th = D.dms[k]; th.msgs.push({ from: myAcc(), t, at: Date.now() }); th.at = Date.now(); saveD(); G.repaint(APP);
    const c = charOfW(w), b = G.base(w);
    let who = c ? X.who(c) : b ? `你是${b.name}。${String(b.persona).slice(0, 300)}` : xacc(w) && xacc(w).kind === 'bot' ? null : `你是微博用户「${nameOf(w)}」，${G.prof(APP, w).bio || '一个普通网友'}`;
    const x = xacc(w);
    if (x && x.kind === 'bot') { const bot = D.bots.find(z => z.who === w); if (bot) return botInbox(bot, myAcc(), t); }
    if (myAcc() !== 'me' && c) who += `\n（给你发私信的是一个叫「${nameOf(myAcc())}」的陌生网友——其实是${X.me(c)}的小号，你不知道。）`;
    BUSY['d' + k] = 1; G.repaint(APP);
    try {
        const r = await X.ask(P('wb.dm', DEF_DM, { 我是谁: who, 记录: th.msgs.slice(-12).map(m => (m.from === w ? nameOf(w) : nameOf(myAcc())) + '：' + m.t).join('\n') }));
        String(r || '').split('\n').map(X.plain).filter(Boolean).slice(0, 3).forEach(s => th.msgs.push({ from: w, t: s.replace(/^[^：:]{1,12}[：:]/, '').slice(0, 200), at: Date.now() }));
        th.at = Date.now(); if (!G.isOpen(APP)) th.unread = true; saveD();
    } finally { delete BUSY['d' + k]; G.repaint(APP); }
};

/* ---------------- bot ---------------- */
// 投稿 bot：大家私信投稿，bot 匿名发出来；定时 bot：按你写的要求定时发；自动回复 bot：有人 @ 它 / 私信它就回
W.bots = () => G.push(APP, { title: '我的 bot', html: () => `<div class="gys-empty" style="padding:12px 20px;text-align:left">bot 就是自动发微博的账号。<br>· <b>投稿 bot</b>：大家私信投稿，它匿名发出来（「XX 投稿 bot」「XX 树洞」那种）<br>· <b>定时 bot</b>：按你写的要求定时发一条（每日一句、每日猫猫、天气播报……）<br>· <b>自动回复 bot</b>：有人私信它就按你写的规矩回</div>${(D.bots || []).map(b => `<div class="wb-row" onclick="gysWb.botEdit('${b.id}')">${G.av(APP, b.who, 44)}<div><b>${esc(nameOf(b.who))}</b><em>${{ sub: '📮 投稿 bot', timer: '⏰ 定时 bot', reply: '💬 自动回复 bot' }[b.kind]} · ${b.on ? '开着' : '关着'}</em><small>${b.kind === 'sub' ? '收到 ' + (b.inbox || []).length + ' 条投稿' : b.lastAt ? '上次发 ' + G.ago(b.lastAt) : '还没发过'}</small></div></div>`).join('')}<div class="gys-acts"><span class="gys-btn" onclick="gysWb.botEdit()">＋ 新建 bot</span></div>` });
W.botEdit = id => {
    const b = id ? D.bots.find(x => x.id === id) : { id: G.uid('bot'), kind: 'sub', name: '', rule: '', every: 6, on: true, inbox: [], lastAt: 0, autoSub: true };
    const isNew = !id;
    G.push(APP, { title: isNew ? '新建 bot' : '管理 bot', html: () => `
      ${b.who ? `<div class="gys-acts">${G.av(APP, b.who, 56)}<span class="gys-btn sm ghost" onclick="GYS.editProf('weibo','${b.who}')">换头像 / 改主页</span><span class="gys-btn sm ghost" onclick="gysWb.prof('${b.who}')">去主页</span></div>` : ''}
      <label class="gys-f"><span>bot 叫什么</span><input id="wbB_name" value="${esc(b.name)}" placeholder="比如：立夏的投稿bot / 每日一只猫bot"></label>
      <label class="gys-f"><span>哪一种</span><select id="wbB_kind">${[['sub', '📮 投稿 bot（大家投稿，它匿名发）'], ['timer', '⏰ 定时 bot（按要求定时发）'], ['reply', '💬 自动回复 bot（有人私信就回）']].map(([k, n]) => `<option value="${k}" ${b.kind === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="gys-f"><span>规矩 / 要发什么（写给模型看的）</span><textarea id="wbB_rule" rows="3" placeholder="投稿 bot：发出来的格式、要不要打码……\n定时 bot：每次发什么（比如：一句治愈的晚安话 + 一个emoji）\n自动回复 bot：怎么回">${esc(b.rule)}</textarea></label>
      <label class="gys-f"><span>多久发一次（小时，投稿 / 定时 bot 用）</span><input id="wbB_every" type="number" min="1" value="${b.every}"></label>
      <label class="gys-ck" style="margin:0 16px"><input type="checkbox" id="wbB_on" ${b.on ? 'checked' : ''}> 开着</label>
      ${b.kind === 'sub' ? `<label class="gys-ck" style="margin:6px 16px"><input type="checkbox" id="wbB_auto" ${b.autoSub !== false ? 'checked' : ''}> 角色和 NPC 也会来投稿</label>` : ''}
      <div class="gys-acts"><span class="gys-btn" onclick="gysWb.botSave('${b.id}', ${isNew})">保存</span>${isNew ? '' : `<span class="gys-btn ghost" onclick="gysWb.botRun('${b.id}', 1)">现在发一条</span><span class="gys-btn ghost" onclick="gysWb.botDel('${b.id}')">删掉</span>`}</div>
      ${b.kind === 'sub' && (b.inbox || []).length ? `<div class="wb-sech"><b>收到的投稿</b></div>${b.inbox.slice(0, 30).map(m => `<div class="wb-edit"><em>${esc(nameOf(m.from))} · ${G.ago(m.at)}${m.done ? ' · 已发' : ''}</em>${esc(m.t)}</div>`).join('')}` : ''}` });
    W.__botDraft = b;
};
W.botSave = (id, isNew) => {
    const b = W.__botDraft; if (!b || b.id !== id) return;
    const g = k => (document.getElementById('wbB_' + k) || {});
    b.name = (g('name').value || '').trim() || '我的bot'; b.kind = g('kind').value || 'sub'; b.rule = g('rule').value || ''; b.every = Math.max(1, parseInt(g('every').value) || 6); b.on = !!g('on').checked; if (g('auto').checked !== undefined) b.autoSub = !!g('auto').checked;
    if (!b.who) { b.who = 'x:bot_' + b.id; D.xacc[b.who] = { kind: 'bot', id: b.id, name: b.name }; G.prof(APP, b.who, { nick: b.name, emoji: '🤖', bio: { sub: '投稿请私信 · 匿名发出 · 不保证全发', timer: '定时更新中', reply: '有事私信，自动回复' }[b.kind], followers: G.rnd(100, 5000), following: 0, gen: true }); }
    else G.setProf(APP, b.who, { nick: b.name });
    D.xacc[b.who].name = b.name;
    if (isNew) D.bots.push(b);
    saveD(); X.toast('🤖 存好了', b.kind === 'sub' ? '大家可以私信它投稿了' : ''); G.back(APP);
};
W.botDel = async id => { if (!(await G.confirm('删掉这个 bot？（它发过的微博还在）'))) return; D.bots = D.bots.filter(b => b.id !== id); saveD(); G.back(APP); };
async function botInbox(bot, from, t) {
    const k = thKey(from, bot.who), th = D.dms[k];
    if (bot.kind === 'sub') { (bot.inbox = bot.inbox || []).unshift({ from, t, at: Date.now() }); th.msgs.push({ from: bot.who, t: X.v('收到投稿啦，排队中～', '已收到，会匿名发出', '投稿成功 🤖'), at: Date.now() }); saveD(); G.repaint(APP); return; }
    const r = await X.ask(`你是微博上的自动回复 bot「${nameOf(bot.who)}」。规矩：${bot.rule || '礼貌简短地回复'}\n有人私信你：「${t}」\n按规矩回一句。`);
    th.msgs.push({ from: bot.who, t: X.plain(r || '自动回复：收到～').slice(0, 200), at: Date.now() }); saveD(); G.repaint(APP);
}
W.botRun = async (id, force) => {
    const b = D.bots.find(x => x.id === id); if (!b || (!b.on && !force)) return;
    if (b.kind === 'reply') return force && X.toast('自动回复 bot 不自己发微博', '有人私信它才回');
    let text = null;
    if (b.kind === 'sub') {
        let m = (b.inbox || []).find(x => !x.done);
        if (!m && b.autoSub !== false) {   // 没投稿：找个角色 / NPC 投一条
            const w = G.pick(cast()); const bb = G.base(w);
            const t = X.plain(await X.ask(`你是${bb.name}。${String(bb.persona).slice(0, 300)}\n微博上有个投稿 bot「${nameOf(b.who)}」（${b.rule || '大家匿名投稿'}）。你偷偷投一条稿（匿名的，想说又不敢署名的话、吐槽、心事、求助都行）。只写投稿内容。`) || '');
            if (t) { m = { from: w, t: t.slice(0, 300), at: Date.now() }; (b.inbox = b.inbox || []).unshift(m); }
        }
        if (!m) return force && X.toast('📮 还没有投稿', '私信它投一条，或者等角色们来投');
        text = X.plain(await X.ask(`你是微博投稿 bot「${nameOf(b.who)}」。规矩：${b.rule || '把投稿匿名发出来，前面加【投稿】'}\n收到的投稿：「${m.t}」\n按规矩把它整理成一条要发的微博（匿名，别透露投稿人）。只写微博正文。`) || '') || '【投稿】' + m.t;
        m.done = 1;
        const p = mkPost({ by: b.who, text: text.slice(0, 500), likeN: G.rnd(20, 800), rpN: G.rnd(0, 50) });
        b.lastAt = Date.now(); saveD(); genCmts(p, 6, { quiet: true });
        if (m.from === 'me' || isMine(m.from)) X.toast('📮 你的投稿被发出来了', '');
        return p;
    }
    text = X.plain(await X.ask(`你是微博上的定时 bot「${nameOf(b.who)}」。每次要发的：${b.rule || '一句温柔的话'}\n今天是 ${new Date().toLocaleDateString()}，${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()]}。写这一次的微博（别跟上次一样：上次是「${(D.posts.find(p => p.by === b.who) || {}).text || '没有'}」）。只写正文。`) || '');
    if (!text) return;
    const p = mkPost({ by: b.who, text: text.slice(0, 500), likeN: G.rnd(10, 400), rpN: G.rnd(0, 30) });
    b.lastAt = Date.now(); saveD(); genCmts(p, 4, { quiet: true }); G.repaint(APP);
    return p;
};
function botTick() { (D.bots || []).forEach(b => { if (b.on && b.kind !== 'reply' && Date.now() - (b.lastAt || 0) > b.every * 3600e3) W.botRun(b.id).catch(() => {}); }); }

/* ---------------- 小号（TA 的）/ 官宣 / 故事 ---------------- */
function altOf(c) { const w = 'x:alt_c' + c.id; if (!D.xacc[w]) { D.xacc[w] = { kind: 'alt', owner: 'c:' + c.id, name: '' }; } return w; }
async function charAltPost(c) {
    const w = altOf(c);
    if (!G.hasProf(APP, w) || !G.prof(APP, w).gen) {
        const o = X.json(await X.ask(`${X.who(c)}\n你偷偷开了一个微博小号，只关注了${X.me(c)}一个人，没人知道是你。给小号起昵称、简介（不能让人一眼认出是你，但可以留一点只有她懂的小破绽）。只输出 JSON：{"nick":"","bio":"","clue":"你留的那个小破绽（自己知道就行）"}`));
        G.prof(APP, w, {}); G.setProf(APP, w, { nick: X.plain((o && o.nick) || '一个普通人').slice(0, 16), bio: X.plain((o && o.bio) || '').slice(0, 60), emoji: G.pick(['🌫️', '🌑', '🪐', '🫧', '🕯️']), followers: G.rnd(0, 6), following: 1, gen: true, clue: o && o.clue || '' });
        D.xacc[w].name = G.nick(APP, w);
    }
    const t = X.plain(await X.ask(`${X.who(c)}\n你在用你的微博小号「${nameOf(w)}」（没人知道是你）。最近的聊天：\n${X.recent(c, 8)}\n发一条小号微博——大号不敢说的话，多半跟她有关：想她、吃醋、后悔说错的话、偷偷开心。不要提她的名字。只写正文。`) || '');
    if (!t) return null;
    return mkPost({ by: w, text: t.slice(0, 300), likeN: G.rnd(0, 3), from: devOf('c:' + c.id), ip: ipOf('c:' + c.id) });
}
W.guessAlt = async w => {
    const x = xacc(w); if (!x || !x.owner) return;
    const L = allChars(); const i = await chooser(L.map(c => '是 ' + c.name).concat(['不知道']));
    if (i == null || i === L.length) return;
    const c = L[i];
    if ('c:' + c.id === x.owner) { x.found = 1; saveD(); X.toast('🕵️ 被你认出来了！', c.name + ' 的小号'); X.reach(c, `她发现了你的微博小号「${nameOf(w)}」，还看到了你在上面发的那些话`); }
    else X.toast('🤔 好像不是', '再看看 TA 发的东西');
};
W.announce = async w => {
    const c = charOfW(w); if (!c) return;
    if (!(await G.confirm(`和 ${c.name} 在微博官宣？（你们俩各发一条，会上热搜，评论区会炸）`))) return;
    const t = await G.input('你的官宣微博写什么？', '是的，我们在一起了 [心]'); if (!t) return;
    const mine = mkPost({ by: 'me', text: t, topics: ['官宣'] });
    const r = X.plain(await X.ask(`${X.who(c)}\n${X.me(c)}刚在微博官宣了你们的恋情：「${t}」，还@了你。你用你的微博也发一条官宣（转发她的或者自己发，按你的性格：高调 / 害羞 / 一个字 / 一大段）。只写正文。`) || '[心]');
    mkPost({ by: charWho(c), text: r.slice(0, 300), rp: mine.id, topics: ['官宣'] }); mine.rpN += G.rnd(1000, 50000);
    D.hot.list.unshift({ id: G.uid('h'), title: nameOf(charWho(c)) + '官宣', tag: '爆', heat: G.rnd(800, 3000) * 10000, desc: `${nameOf(charWho(c))}和${nameOf('me')}官宣恋情`, about: charWho(c), at: Date.now() });
    D.official = D.official || {}; D.official[c.id] = Date.now(); saveD();
    genCmts(mine, 10); X.toast('💍 官宣了！', '上热搜了，去评论区看看');
};
function storyBar() {
    const now = Date.now(); D.stories = (D.stories || []).filter(s => now - s.at < 86400e3);
    const by = {}; D.stories.forEach(s => { (by[s.by] = by[s.by] || []).push(s); });
    const L = Object.keys(by); if (!L.length && !(D.stories || []).length) return `<div class="wb-stories"><div class="wb-story me" onclick="gysWb.storyNew()"><span class="plus">＋</span><em>发故事</em></div></div>`;
    return `<div class="wb-stories"><div class="wb-story me" onclick="gysWb.storyNew()"><span class="plus">＋</span><em>发故事</em></div>${L.map(w => `<div class="wb-story${by[w].every(s => (s.seen || []).includes('me')) ? ' seen' : ''}" onclick="gysWb.storyView('${w}')">${G.av(APP, w, 52)}<em>${esc(nameOf(w))}</em></div>`).join('')}</div>`;
}
W.storyNew = async () => { const t = await G.input('故事写什么？（24 小时后自己消失）', ''); if (!t) return; (D.stories = D.stories || []).push({ id: G.uid('s'), by: myAcc(), t, at: Date.now(), seen: [] }); saveD(); G.repaint(APP); setTimeout(() => { D.stories.filter(s => isMine(s.by)).forEach(s => allChars().forEach(c => { if (Math.random() < 0.7 && !s.seen.includes('c:' + c.id)) s.seen.push('c:' + c.id); })); saveD(); }, 20000); };
W.storyView = w => {
    const L = (D.stories || []).filter(s => s.by === w); if (!L.length) return;
    L.forEach(s => { s.seen = s.seen || []; if (!s.seen.includes('me')) s.seen.push('me'); }); saveD();
    G.push(APP, { title: nameOf(w) + ' 的故事', cls: 'wb-storyb', html: () => L.map(s => `<div class="wb-storyc" style="background:${picBg(s.t)}"><b>${esc(s.t)}</b><em>${G.ago(s.at)}${isMine(w) ? ' · 👀 ' + (s.seen || []).filter(x => x !== 'me').map(nameOf).join('、') + ' 看过' : ''}</em></div>`).join('') });
};
async function charStory(c) { const t = X.plain(await X.ask(`${X.who(c)}\n发一条微博故事（24 小时消失的那种，一句话就行，比如在干嘛、心情、一张图的描述）。只写内容。`) || ''); if (!t) return null; (D.stories = D.stories || []).push({ id: G.uid('s'), by: charWho(c), t: t.slice(0, 80), at: Date.now(), seen: [] }); saveD(); return t; }

/* ---------------- 我 ---------------- */
function meTab() {
    const w = myAcc(), p = G.prof(APP, w);
    const L = D.posts.filter(q => q.by === w).length;
    return `<div class="wb-me" onclick="gysWb.prof('${w}')">${G.av(APP, w, 60)}<div><b>${esc(p.nick)}${vBadge(w)}</b><em>${esc(p.bio || '简介：还没写')}</em><small>${w === 'me' ? '大号' : '小号'} · 点开看主页</small></div><span>›</span></div>
      <div class="wb-pf-n"><span><b>${L}</b> 微博</span><span><b>${following('me').length}</b> 关注</span><span><b>${G.fmtN(p.followers)}</b> 粉丝</span></div>
      <div class="wb-menu">
        <div onclick="gysWb.compose()">✏️ 发微博</div>
        <div onclick="gysWb.switchAcc()">🔁 切换账号（大号 / 小号）<em>现在：${esc(nameOf(w))}</em></div>
        <div onclick="gysWb.editMe('${w}')">🪪 编辑资料（头像、背景、简介、挂别的软件账号）</div>
        ${G.draftOn() ? `<div onclick="gysWb.drafts()">📝 草稿箱${(D.drafts || []).length ? `<em>${D.drafts.length}</em>` : ''}</div>` : ''}
        <div onclick="gysWb.favs()">⭐ 我的收藏</div>
        <div onclick="gysWb.bots()">🤖 我的 bot</div>
        <div onclick="gysWb.people()">👀 找人 / ✨ 生成新账号</div>
        <div onclick="gysWb.settings()">⚙️ 设置</div>
      </div>`;
}
W.favs = () => G.push(APP, { title: '我的收藏', html: () => D.fav.map(postOf).filter(Boolean).map(p => card(p)).join('') || '<div class="gys-empty">还没收藏</div>' });
W.settings = () => G.push(APP, { title: '设置', html: () => `
  <label class="gys-f"><span>TA 们大概多少小时自己发一次微博（「TA 会自己做」打开时）</span><input type="number" min="1" value="${D.cfg.refresh}" onchange="gysWb.__cfg('refresh', this.value)"></label>
  <label class="gys-f"><span>最多存多少条微博（你自己的、置顶的、收藏的不删）</span><select onchange="gysWb.__cfg('keep', this.value)">${[200, 600, 1500, 5000].map(n => `<option value="${n}" ${Number(D.cfg.keep) === n ? 'selected' : ''}>${n} 条</option>`).join('')}</select></label>
  <div class="gys-acts"><span class="gys-btn ghost" onclick="gysWb.exportTxt()">📤 导出我的微博（TXT）</span><span class="gys-btn ghost" onclick="GYS.uiPage('weibo')">🍎 苹果外观</span></div>
  <div class="gys-empty" style="text-align:left;padding:8px 20px">评论里 NPC 和路人各占多少：去「👥 NPC 列表 → ⚖️ 评论里的比例 → 🧣 微博」调。<br>刷新首页 / 热搜 / 评论区每次调一次副 API。</div>` });
W.__cfg = (k, v) => { D.cfg[k] = Math.max(1, parseInt(v) || 1); saveD(); };
W.exportTxt = () => {
    const t = D.posts.filter(p => isMine(p.by)).map(p => `[${new Date(p.at).toLocaleString()}] ${nameOf(p.by)}${p.vis !== 'public' ? '（' + p.vis + '）' : ''}\n${p.text}\n${countC(p.cmts) ? '评论：\n' + flat(p.cmts).map(c => '  ' + nameOf(c.by) + '：' + c.text).join('\n') + '\n' : ''}`).join('\n');
    const name = '谷雨-我的微博-' + X.day() + '.txt';
    try { if (typeof saveTextFileForApp === 'function' && window.plus) return saveTextFileForApp(name, t); } catch (e) {}
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain;charset=utf-8' })); a.download = name; a.click();
};
const flat = arr => arr.flatMap(c => [c].concat(flat(c.kids || [])));

/* ---------------- 正文页 ---------------- */
let CS = 'hot';
W.cs = s => { CS = s; G.repaint(APP); };
function cmtHtml(p, c, kid) {
    return `<div class="wb-cmt${kid ? ' kid' : ''}">${kid ? '' : `<span onclick="gysWb.prof('${c.by}')">${G.av(APP, c.by, 32)}</span>`}<div class="wb-cb"><div class="wb-cn"><b onclick="gysWb.prof('${c.by}')">${esc(nameOf(c.by))}</b>${c.by === p.by ? '<i class="wb-au">作者</i>' : ''}${vBadge(c.by)}${c.toWho ? ` 回复 <b>${esc(nameOf(c.toWho))}</b>` : ''}</div>
      <div class="wb-ct">${richText(c.text)}</div>
      <div class="wb-cm"><span>${G.ago(c.at)} · ${esc(ipOf(c.by))}</span><span onclick="gysWb.replyTo('${p.id}','${c.id}')">回复</span><span class="${c.likes.includes(myAcc()) ? 'on' : ''}" onclick="gysWb.cmtLike('${p.id}','${c.id}')">${c.likes.includes(myAcc()) ? '❤️' : '🤍'} ${(c.likeN || 0) + c.likes.length || ''}</span>${c.authorLiked || c.likes.includes(p.by) ? '<i class="wb-al">博主赞过</i>' : ''}</div>
      ${!kid && (c.kids || []).length ? `<div class="wb-kids">${c.kids.slice(0, 3).map(k => cmtHtml(p, k, 1)).join('')}${c.kids.length > 3 ? `<a onclick="gysWb.moreKids('${p.id}','${c.id}')">共 ${c.kids.length} 条回复 ›</a>` : ''}</div>` : ''}</div></div>`;
}
W.moreKids = (pid, cid) => { const p = postOf(pid), c = p && findC(p.cmts, cid); if (!c) return; G.push(APP, { title: '评论详情', html: () => cmtHtml(p, Object.assign({}, c, { kids: [] })) + c.kids.map(k => cmtHtml(p, k, 1)).join(''), foot: () => cmtBar(pid) }); W.replyTo(pid, cid); };
function detail(id) {
    const p = postOf(id); if (!p) return '<div class="gys-empty">没有了</div>';
    if (p.del && !isMine(p.by)) return `<div class="gys-empty">⚠️ 这条微博已经被作者删除<br><small>你之前看到的内容：</small></div>${card(p, { detail: true })}`;
    const cs = CS === 'new' ? p.cmts.slice().sort((a, b) => b.at - a.at) : p.cmts.slice().sort((a, b) => ((b.likeN || 0) + b.likes.length + (b.authorLiked ? 500 : 0)) - ((a.likeN || 0) + a.likes.length + (a.authorLiked ? 500 : 0)));
    return `${card(p, { detail: true })}
      <div class="wb-dtabs"><span>转发 ${p.rpN}</span><span class="on">评论 ${cmtCount(p)}</span><span>赞 ${totalLikes(p)}</span><em><a class="${CS === 'hot' ? 'on' : ''}" onclick="gysWb.cs('hot')">按热度</a> · <a class="${CS === 'new' ? 'on' : ''}" onclick="gysWb.cs('new')">按时间</a></em></div>
      ${p.likes.length ? `<div class="wb-likers">❤️ ${p.likes.map(nameOf).map(esc).join('、')} 赞了</div>` : ''}
      <div class="wb-cmts">${p.cmtOff ? '<div class="gys-empty">博主已关闭评论</div>' : ''}${BUSY['c' + p.id] ? '<div class="gys-busy">⏳ 评论加载中…</div>' : ''}${cs.map(c => cmtHtml(p, c)).join('')}${!cs.length && !BUSY['c' + p.id] ? '<div class="gys-empty">还没有评论，快来抢沙发</div>' : ''}
      ${!p.del ? `<div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysWb.moreCmts('${p.id}')">再看看大家怎么说</span></div>` : ''}</div>`;
}
W.moreCmts = id => { const p = postOf(id); if (p) genCmts(p, 5, { quiet: !isMine(p.by) }); };
function cmtBar(id) { return `<div class="wb-cin"><span class="wb-cin-who" onclick="gysWb.switchAcc()">${G.av(APP, myAcc(), 26)}</span><input id="wbCmtIn" placeholder="${REPLY ? '回复 @' + esc(nameOf(REPLY.who)) : '写评论…'}" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysWb.sendCmt('${id}')"><span onclick="gysWb.sendCmt('${id}')">发送</span></div>`; }

/* ---------------- 外壳 ---------------- */
G.app(APP, {
    tabs: [['home', 'i:home', '首页'], ['video', 'i:video', '视频'], ['find', 'i:compass', '发现'], ['msg', 'i:mail', '消息', () => unread() || ''], ['me', 'i:person', '我']],
    head, render: t => t === 'video' ? videoTab() : t === 'find' ? find() : t === 'msg' ? msg() : t === 'me' ? meTab() : feed(),
    onOpen: () => { ensureMkt(); ensureSupers(); if (!D.posts.length && !BUSY.feed) genFeed(8); else if (Date.now() - (D.lastFeed || 0) > 3 * 3600e3 && !BUSY.feed) genFeed(6); if (!D.hot.list.length || Date.now() - D.hot.at > 6 * 3600e3) genHot(); const L = cast().filter(w => !G.prof(APP, w).gen); if (L.length) G.genProfiles(APP, L.slice(0, 8)).then(() => G.repaint(APP)); }
});

/* ---------------- 谷雨这边：开关、自主行动、今天、小组件、记忆总览、注入 ---------------- */
X.mini({ id: 'gysWeibo', icon: '🧣', title: '微博', desc: '刷微博、热搜、超话、私信、小号、bot；TA 也在上面', cat: '软件', onOpen: () => G.open(APP) }, 'gysWeibo');
const rare = (c, k, h) => { const t = ((D.last = D.last || {})[k + c.id]) || 0; return Date.now() - t > h * 3600e3; };
const mark = (c, k) => { (D.last = D.last || {})[k + c.id] = Date.now(); saveD(); };
X.action({ key: 'gys_wb_post', label: '发一条微博', hint: '日常、碎碎念、晒图、暗戳戳说她', need: c => rare(c, 'p', D.cfg.refresh || 6), run: async c => { mark(c, 'p'); const p = await charPost(c); return p ? '发了一条微博：' + p.text.slice(0, 40) : null; }, jump: c => X.go('gysWeiboOpen', 'home') }, 'gysWeibo');
X.action({ key: 'gys_wb_cmt', label: '去微博评论她最近发的', hint: '看到她发的微博，去评论区说一句', need: c => D.posts.some(p => isMine(p.by) && p.vis !== 'self' && Date.now() - p.at < 3 * 86400e3 && !flat(p.cmts).some(k => k.by === 'c:' + c.id)), run: async c => { const p = D.posts.find(p => isMine(p.by) && p.vis !== 'self' && !flat(p.cmts).some(k => k.by === 'c:' + c.id)); if (!p) return null; const t = X.plain(await X.ask(`${X.who(c)}\n${p.by === 'me' ? X.me(c) : '一个叫「' + nameOf(p.by) + '」的网友'}在微博上发了：「${p.text.slice(0, 200)}」\n你在评论区说一句（公开场合）。只写评论。`) || ''); if (!t) return null; p.cmts.push({ id: G.uid('c'), by: 'c:' + c.id, text: t.slice(0, 200), at: Date.now(), likeN: 0, likes: [], kids: [] }); if (!p.likes.includes('c:' + c.id)) p.likes.push('c:' + c.id); note('cmt', 'c:' + c.id, p.id, t); saveD(); G.notify(APP, c, `🧣 <b>${X.esc(c.name)}</b> 评论了你的微博`, t, X.go('gysWeiboOpenPost', p.id)); return '评论了她的微博'; } }, 'gysWeibo');
X.action({ key: 'gys_wb_alt', label: '用微博小号发一条', hint: '大号不敢说的话', need: c => rare(c, 'a', 24), run: async c => { mark(c, 'a'); const p = await charAltPost(c); return p ? { text: '用小号发了一条（没告诉她）', selfNotified: true } : null; } }, 'gysWeibo');
X.action({ key: 'gys_wb_story', label: '发一条微博故事', hint: '24 小时消失的那种', need: c => rare(c, 's', 18), run: async c => { mark(c, 's'); const t = await charStory(c); return t ? '发了条微博故事：' + t.slice(0, 30) : null; }, jump: c => X.go('gysWeiboOpen', 'home') }, 'gysWeibo');
X.action({ key: 'gys_wb_video', label: '发一条视频号', hint: '随手拍的 vlog / 日常短视频', need: c => rare(c, 'v', 30), run: async c => { mark(c, 'v'); const o = X.json(await X.ask(`${X.who(c)}\n你在微博「视频号」发一条短视频（随手拍的日常 / vlog / 才艺）。只输出 JSON：{"cover":"一个emoji","title":"标题","desc":"文案","dur":"0:30"}`)); if (!o || !o.title) return null; (D.videos = D.videos || []).unshift({ id: G.uid('v'), by: 'c:' + c.id, cover: String(o.cover || '🎬').slice(0, 2), title: X.plain(o.title).slice(0, 60), desc: X.plain(o.desc || '').slice(0, 200), dur: String(o.dur || '0:30').slice(0, 6), likes: G.rnd(10, 2000), cmts: [], at: Date.now() }); saveD(); G.notify(APP, c, `🧣 <b>${X.esc(c.name)}</b> 发了条视频号`, o.title, X.go('gysWeiboOpen', 'find')); return { text: '发了条视频号：' + o.title, selfNotified: true }; } }, 'gysWeibo');
X.action({ key: 'gys_wb_del', label: '半夜发了条微博又删了', hint: '深夜冲动，第二天后悔', need: c => { const h = new Date().getHours(); return (h >= 23 || h < 3) && rare(c, 'd', 72); }, run: async c => { mark(c, 'd'); const p = await charPost(c, '深夜冲动想说的一句心里话（发完就后悔）'); if (!p) return null; setTimeout(() => { p.del = Date.now(); saveD(); }, G.rnd(3, 12) * 60e3); return { text: '半夜发了条微博，几分钟后删了', selfNotified: true }; } }, 'gysWeibo');
X.action({ key: 'gys_wb_lottery', label: '在微博发一个转发抽奖', hint: '抽奶茶 / 周边 / 红包——说不定偷偷想让她中', need: c => lotOn() && rare(c, 'lt', 96) && !D.posts.some(p => p.by === 'c:' + c.id && p.lot && !p.lot.done), run: async c => {
    mark(c, 'lt'); const o = X.json(await X.ask(P('wb.lot', DEF_LOT, { 我是谁: X.who(c), 最近: X.recent(c, 6) || '（最近没怎么聊）' }))); if (!o || !o.prize) return null;
    const hrs = G.pick([6, 24, 24, 48, 72]), w = 'c:' + c.id;
    const p = mkPost({ by: w, text: X.plain(o.text || '转发抽奖').slice(0, 300), lot: { prize: X.plain(o.prize).slice(0, 40), n: Math.max(1, Math.min(20, parseInt(o.n, 10) || 1)), end: Date.now() + hrs * 3600e3, ents: [], fake: G.rnd(80, 2000), wins: [], done: 0 } });
    genCmts(p, 4, { quiet: true });
    G.notify(APP, c, `🎁 <b>${X.esc(c.name)}</b> 发了个微博抽奖`, `抽「${p.lot.prize}」，转发就能参加`, X.go('gysWeiboOpenPost', p.id));
    return { text: `在微博发了个转发抽奖：抽${p.lot.prize}`, selfNotified: true, jump: X.go('gysWeiboOpenPost', p.id) };
} }, 'gysWeibo');
X.today(() => { if (!lotOn()) return null; const d = X.day(); const L = D.posts.filter(p => p.lot && (!p.lot.done ? (isMine(p.by) || p.lot.ents.some(isMine) || G.charOf(p.by)) : X.day(new Date(p.lot.done)) === d)); if (!L.length) return null; return { title: '🎁 微博抽奖', rows: L.slice(0, 3).map(p => ({ t: nameOf(p.by), x: `「${p.lot.prize}」` + (p.lot.done ? (p.lot.wins.some(isMine) ? ' · 🎉 你中了' : ' · 已开奖') : ` · ${G.hm(p.lot.end)} 开奖${p.lot.ents.some(isMine) ? ' · 你参加了' : ''}`), go: X.go('gysWeiboOpenPost', p.id) })) }; }, 'gysWeibo');
X.widget('gysWbLotW', { n: '微博抽奖', sizes: ['s', 'm'], tap: () => { const p = D.posts.find(p => p.lot && !p.lot.done); if (p) window.gysWeiboOpenPost(p.id); else G.open(APP); }, r: () => { const L = D.posts.filter(p => p.lot && !p.lot.done).sort((a, b) => a.lot.end - b.lot.end); const p = L[0]; return `<div style="padding:10px;font-size:12px;line-height:1.6"><b style="color:#ff8200">🎁 微博抽奖</b><br>${p ? `${esc(nameOf(p.by))}：${esc(p.lot.prize)}<br>${G.hm(p.lot.end)} 开奖${p.lot.ents.some(isMine) ? ' · 已参与' : ''}` : '现在没有进行中的抽奖'}</div>`; } }, 'gysWeibo');
X.mem({ k: 'gysWbLot', ico: '🎁', n: 'TA 的微博抽奖', d: 'TA 在微博发过的抽奖（改了就是改奖品，删了就是去掉这个抽奖，微博还在）', items: c => D.posts.filter(p => p.by === 'c:' + c.id && p.lot), text: p => p.lot.prize + (p.lot.done ? '（中奖：' + (p.lot.wins || []).map(nameOf).join('、') + '）' : ''), edit: (p, v) => { p.lot.prize = String(v).replace(/（中奖：.*$/, '').slice(0, 40); }, del: (c, i) => { const L = D.posts.filter(p => p.by === 'c:' + c.id && p.lot); if (L[i]) L[i].lot = null; }, meta: p => G.ago(p.at), save: () => saveD() }, 'gysWeibo');
X.today(() => { const d = X.day(); const L = D.posts.filter(p => X.day(new Date(p.at)) === d && (isMine(p.by) || G.charOf(p.by))); if (!L.length) return null; return { title: '🧣 微博', rows: L.slice(0, 3).map(p => ({ t: nameOf(p.by), x: p.text.slice(0, 40), go: X.go('gysWeiboOpenPost', p.id) })) }; }, 'gysWeibo');
X.widget('gysWbHot', { n: '微博热搜', sizes: ['m'], tap: () => G.open(APP, 'find'), r: () => `<div style="padding:10px;font-size:12px;line-height:1.7"><b>🔥 微博热搜</b><br>${D.hot.list.slice(0, 4).map((h, i) => `${i + 1}. ${esc(h.title)}`).join('<br>') || '打开微博刷新一下'}</div>` }, 'gysWeibo');
X.mem({ k: 'gysWb', ico: '🧣', n: 'TA 的微博', d: '这个角色发过的微博（改了就是改正文，删了就没了）', items: c => D.posts.filter(p => p.by === 'c:' + c.id || (xacc(p.by) && xacc(p.by).owner === 'c:' + c.id)), text: p => p.text, edit: (p, v) => { p.text = String(v); }, del: (c, i) => { const L = D.posts.filter(p => p.by === 'c:' + c.id || (xacc(p.by) && xacc(p.by).owner === 'c:' + c.id)); const p = L[i]; if (p) D.posts = D.posts.filter(x => x !== p); }, meta: p => G.ago(p.at) + (p.del ? ' · 已删' : '') + (isX(p.by) ? ' · 小号' : '') + (p.vis !== 'public' ? ' · ' + p.vis : ''), save: () => saveD() }, 'gysWeibo');
X.ctx(id => {
    const c = X.char(id); if (!c) return '';
    const w = 'c:' + c.id;
    const mine = D.posts.filter(p => p.by === w && !p.del).slice(0, 2).map(p => '你发的：' + p.text.slice(0, 50));
    const hers = D.posts.filter(p => isMine(p.by) && p.vis !== 'self' && (p.by === 'me')).slice(0, 2).map(p => '她发的：' + p.text.slice(0, 50));
    const off = D.official && D.official[c.id] ? ['你们已经在微博上官宣了'] : [];
    const L = mine.concat(hers, off);
    return L.length ? `【你们最近在微博上】${L.join('；')}` : '';
}, 'gysWeibo');
X.inj('gysWeibo', [['你们最近在微博上', '微博：TA 最近发的、她最近发的、官宣了没', '让 TA 知道你们俩最近在微博上发了什么']]);
setInterval(() => { try { if (X.on('gysWeibo')) botTick(); } catch (e) {} }, 10 * 60e3);

X.css('gys-weibo-css', `
.wb-vt{position:relative;width:54px;height:54px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;color:#fff}
.wb-vt i{position:absolute;right:3px;bottom:2px;font-style:normal;font-size:10px;background:rgba(0,0,0,.45);border-radius:4px;padding:0 3px}
.wb-vgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px}
.wb-vcard{display:flex;flex-direction:column;gap:6px;cursor:pointer}.wb-vcard .wb-vt{width:100%;height:150px;border-radius:12px;font-size:46px}.wb-vcard b{font-size:14px;line-height:1.3}.wb-vcard em{font-style:normal;color:#999;font-size:12px}
.wb-vplay{height:300px;background:linear-gradient(160deg,#222,#000);display:flex;align-items:center;justify-content:center;font-size:90px;position:relative}
.wb-vdur{position:absolute;right:12px;bottom:10px;font-size:12px;color:#fff;background:rgba(0,0,0,.4);border-radius:6px;padding:1px 7px;font-weight:400}
.wb-vmeta{display:flex;align-items:center;gap:10px;padding:12px 16px}.wb-vmeta>div{flex:1}.wb-vmeta b{font-size:15px}.wb-vmeta small{color:#999;display:block}
.wb-vdesc{padding:0 16px 10px}.wb-vdesc b{font-size:15.5px}.wb-vdesc p{color:#555;font-size:14px;margin:4px 0}body.dark-theme .wb-vdesc p{color:#aaa}
.wb-row.sm{padding:8px 16px}
.gys-weibo{--gys-accent:#ff8200;background:#f2f2f2}
body.dark-theme .gys-weibo{background:#000}
.gys-weibo .gys-hd{background:#fff}body.dark-theme .gys-weibo .gys-hd{background:#151515}
.gys-weibo .gys-tabs{background:#fff}body.dark-theme .gys-weibo .gys-tabs{background:#151515}
.gys-weibo .gys-tb.on{color:#ff8200}
.wb-hd0 .wb-ft{position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:22px;font-size:16px}
.wb-ft span{cursor:pointer;color:#8e8e93;padding:2px 0}.wb-ft span.on{color:inherit;font-weight:700;border-bottom:3px solid #ff8200}
.wb-card{background:#fff;margin-bottom:8px;padding:12px 14px 0;cursor:pointer}
body.dark-theme .wb-card{background:#151515}
.wb-card.detail{cursor:default;margin-bottom:8px}
.wb-card.del{opacity:.7}.wb-deltip{font-size:12px;color:#e6162d;margin-bottom:6px}
.wb-pin{font-size:12px;color:#ff8200;margin-bottom:6px}
.wb-hd{display:flex;align-items:center;gap:10px}
.wb-hm{flex:1;min-width:0}
.wb-nm{font-size:15px;font-weight:600;color:#ff8200;display:flex;align-items:center;gap:3px}
body.dark-theme .wb-nm{color:#ff9a2e}
.wb-meta{font-size:12px;color:#939393;margin-top:2px}.wb-meta a{color:#507daf}
.wb-v{font-style:normal;font-size:10px;font-weight:700;color:#fff;border-radius:50%;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;background:#ffa500}
.wb-v.blue{background:#2d9cf0}.wb-v.gold{background:#ff4f00}
.wb-vip{font-style:normal;font-size:12px}
.wb-g{font-style:normal;font-size:12px}.wb-g.m{color:#2d9cf0}.wb-g.f{color:#ff6699}
.wb-fbtn{font-size:12.5px;color:#ff8200;border:1px solid #ff8200;border-radius:999px;padding:2px 10px;cursor:pointer;white-space:nowrap}
.wb-fbtn.on{color:#939393;border-color:#ddd}
.wb-more{color:#939393;font-size:18px;cursor:pointer;padding:0 4px}
.wb-tx{font-size:15px;line-height:1.65;margin:8px 0;white-space:pre-wrap;word-break:break-word}.wb-tx.dim{color:#939393}
.wb-tp,.wb-at,.wb-st{color:#507daf;cursor:pointer}
.wb-pics{display:grid;gap:4px;margin:6px 0}.wb-pics.one{grid-template-columns:1fr;max-width:70%}.wb-pics.two{grid-template-columns:1fr 1fr;max-width:80%}.wb-pics.three{grid-template-columns:repeat(3,1fr)}
.wb-pic{position:relative;aspect-ratio:1;background:#eee center/cover no-repeat;border-radius:4px;overflow:hidden}
.wb-pics.one .wb-pic{aspect-ratio:4/3}
.wb-pic.t{display:flex;align-items:flex-end}.wb-pic.t em{font-style:normal;font-size:11px;color:#fff;padding:4px 6px;text-shadow:0 1px 2px rgba(0,0,0,.4)}
.wb-pic b{position:absolute;right:3px;top:3px;background:rgba(0,0,0,.5);color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.wb-rp{background:#f7f7f7;padding:8px 10px;border-radius:4px;font-size:14px;line-height:1.6;margin:6px 0}body.dark-theme .wb-rp{background:#222}
.wb-rp b{color:#507daf;font-weight:500}
.wb-loc{font-size:12px;color:#507daf;margin:4px 0}
.wb-ip{font-size:11px;color:#b2b2b2;margin:4px 0}
.wb-bar{display:flex;border-top:.5px solid #eee;margin-top:6px}body.dark-theme .wb-bar{border-color:#2a2a2a}
.wb-bar span{flex:1;text-align:center;padding:10px 0;font-size:13px;color:#636363;cursor:pointer}.wb-bar span.on{color:#ff8200}
.wb-poll{border:1px solid #eee;border-radius:8px;padding:10px;margin:6px 0;font-size:14px}.wb-poll b{display:block;margin-bottom:6px}.wb-poll small{color:#939393;font-size:12px;cursor:pointer}
.wb-po{position:relative;border:1px solid #ffd2a6;border-radius:6px;padding:7px 10px;margin:5px 0;cursor:pointer;overflow:hidden}.wb-po span{position:absolute;left:0;top:0;bottom:0;background:#fff1e0}.wb-po em,.wb-po i{position:relative;font-style:normal}.wb-po i{float:right;color:#ff8200}.wb-po.on{border-color:#ff8200}
.wb-stories{display:flex;gap:12px;overflow-x:auto;background:#fff;padding:12px 14px;margin-bottom:8px}body.dark-theme .wb-stories{background:#151515}
.wb-story{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;width:60px;flex-shrink:0}.wb-story .gys-av{border:2px solid #ff8200;padding:2px;box-sizing:content-box}.wb-story.seen .gys-av{border-color:#ddd}
.wb-story em{font-style:normal;font-size:11px;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-story .plus{width:52px;height:52px;border-radius:50%;background:#f2f2f2;display:flex;align-items:center;justify-content:center;font-size:26px;color:#ff8200;border:2px dashed #ff8200}
.wb-storyb{background:#111}.wb-storyc{min-height:60vh;margin:10px;border-radius:14px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:30px;text-align:center;color:#fff}.wb-storyc b{font-size:22px;line-height:1.6}.wb-storyc em{font-style:normal;margin-top:20px;font-size:12px;opacity:.85}
.wb-search{margin:10px 14px;background:#fff;border-radius:999px;padding:9px 16px;color:#939393;font-size:14px;cursor:pointer}body.dark-theme .wb-search{background:#1e1e1e}
.wb-sec{background:#fff;margin-bottom:8px;padding-bottom:6px}body.dark-theme .wb-sec{background:#151515}
.wb-sech{display:flex;justify-content:space-between;align-items:center;padding:12px 14px 6px;font-size:15px}.wb-sech span{color:#939393;font-size:13px;cursor:pointer}
.wb-hot{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;background:#fff;border-bottom:.5px solid #f2f2f2}body.dark-theme .wb-hot{background:#151515;border-color:#222}
.wb-hot b{flex:1;font-weight:400;font-size:15px}.wb-hot em{font-style:normal;font-size:12px;color:#939393}
.wb-hn{width:20px;text-align:center;color:#ff8200;font-weight:700;font-style:italic}.wb-hn.n1{color:#fe2d46}.wb-hn.n2{color:#ff6600}.wb-hn.n3{color:#faa90e}
.wb-ht{font-style:normal;font-size:11px;color:#fff;border-radius:3px;padding:0 3px;background:#ff9406}.wb-ht.b{background:#bd0000}.wb-ht.f{background:#f86400}.wb-ht.r{background:#ff9406}.wb-ht.n{background:#ff3852}.wb-ht.ad{background:#2d9cf0}
.wb-hottabs{display:flex;gap:18px;padding:10px 14px;background:#fff}.wb-hottabs span.on{font-weight:700;border-bottom:3px solid #ff8200}
.wb-topic{background:#fff;padding:16px 14px;margin-bottom:8px}.wb-topic b{font-size:20px}.wb-topic em{display:block;font-style:normal;font-size:12px;color:#939393;margin-top:6px}.wb-topic p{font-size:14px;color:#636363}
body.dark-theme .wb-topic{background:#151515}
.wb-row{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;cursor:pointer;border-bottom:.5px solid #f2f2f2}body.dark-theme .wb-row{background:#151515;border-color:#222}
.wb-row>div{flex:1;min-width:0}.wb-row b{display:flex;align-items:center;gap:3px;font-size:15px;font-weight:500}.wb-row em{display:block;font-style:normal;font-size:12.5px;color:#939393;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wb-row small{font-size:11.5px;color:#b2b2b2}
.wb-sico{font-size:28px}
.wb-pf-body{background:#f2f2f2}
.wb-pf{background:#fff;min-height:100%}body.dark-theme .wb-pf{background:#151515}
.wb-cover{height:150px;background:linear-gradient(135deg,#ffb36b,#ff8200) center/cover no-repeat}
.wb-pf-top{display:flex;justify-content:space-between;align-items:flex-end;padding:0 14px;margin-top:-38px}
.wb-pf-av{border:3px solid #fff}
.wb-pf-btns{display:flex;gap:8px;padding-bottom:4px}.wb-pbtn{border:1px solid #ff8200;color:#ff8200;border-radius:999px;padding:4px 14px;font-size:13px;cursor:pointer;background:#fff}.wb-pbtn.on{color:#939393;border-color:#ddd}
.wb-pf-nm{font-size:20px;font-weight:700;padding:8px 14px 0;display:flex;align-items:center;gap:4px}
.wb-pf-v{font-size:12.5px;color:#ff8200;padding:2px 14px}
.wb-pf-bio{font-size:14px;color:#636363;padding:4px 14px;line-height:1.6}
.wb-pf-meta{font-size:12px;color:#939393;padding:0 14px}
.wb-pf-links{display:flex;flex-wrap:wrap;gap:8px;padding:6px 14px}.wb-pf-links span{font-size:12px;background:#f7f7f7;border-radius:4px;padding:2px 8px;color:#507daf}
.wb-pf-n{display:flex;gap:20px;padding:10px 14px;font-size:13px;color:#939393;background:#fff}body.dark-theme .wb-pf-n{background:#151515}.wb-pf-n b{color:#1f1f1f;font-size:16px;margin-right:2px}body.dark-theme .wb-pf-n b{color:#eee}
.wb-pf-st{margin:0 14px 8px;padding:8px 12px;background:#fff6ec;border-radius:8px;font-size:13.5px;color:#ff8200;cursor:pointer}
.wb-pf-alt{margin:0 14px 8px;font-size:12.5px;color:#939393}.wb-pf-alt span{color:#507daf;cursor:pointer;margin-left:6px}
.wb-ptabs{display:flex;border-bottom:.5px solid #eee;margin-top:6px;position:sticky;top:0;background:inherit;z-index:1}.wb-ptabs span{flex:1;text-align:center;padding:10px 0;font-size:14px;color:#636363;cursor:pointer}.wb-ptabs span.on{color:#1f1f1f;font-weight:700;box-shadow:inset 0 -3px 0 #ff8200}body.dark-theme .wb-ptabs span.on{color:#fff}
.wb-album{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:2px}.wb-album span{aspect-ratio:1;background:#eee center/cover;cursor:pointer;display:flex;align-items:flex-end}.wb-album span em{font-style:normal;font-size:11px;color:#fff;padding:4px}
.wb-dtabs{display:flex;gap:18px;align-items:center;background:#fff;padding:10px 14px;font-size:14px;color:#939393;border-bottom:.5px solid #eee}body.dark-theme .wb-dtabs{background:#151515;border-color:#222}.wb-dtabs .on{color:inherit;font-weight:700}.wb-dtabs em{margin-left:auto;font-style:normal;font-size:12px}.wb-dtabs a{cursor:pointer}.wb-dtabs a.on{color:#ff8200}
.wb-likers{background:#fff;padding:8px 14px;font-size:12.5px;color:#507daf}body.dark-theme .wb-likers{background:#151515}
.wb-cmts{background:#fff;padding-bottom:20px}body.dark-theme .wb-cmts{background:#151515}
.wb-cmt{display:flex;gap:10px;padding:12px 14px 0}.wb-cmt.kid{padding:6px 0 0}
.wb-cb{flex:1;min-width:0;border-bottom:.5px solid #f2f2f2;padding-bottom:10px}.wb-cmt.kid .wb-cb{border:0;padding-bottom:4px}
.wb-cn{font-size:13px;color:#939393}.wb-cn b{color:#507daf;font-weight:500;cursor:pointer}
.wb-au{font-style:normal;font-size:10px;color:#ff8200;border:1px solid #ff8200;border-radius:3px;padding:0 3px;margin:0 3px}
.wb-ct{font-size:14.5px;line-height:1.6;margin:3px 0}
.wb-cm{display:flex;gap:14px;font-size:12px;color:#b2b2b2;align-items:center}.wb-cm span{cursor:pointer}.wb-cm span.on{color:#ff8200}
.wb-al{font-style:normal;font-size:11px;color:#ff8200;background:#fff6ec;border-radius:3px;padding:0 4px}
.wb-kids{background:#f7f7f7;border-radius:4px;padding:2px 10px 8px;margin-top:6px}body.dark-theme .wb-kids{background:#222}.wb-kids a{font-size:12.5px;color:#507daf;cursor:pointer;display:block;padding-top:6px}
.wb-cin{display:flex;align-items:center;gap:8px;padding:8px 12px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));border-top:.5px solid #eee;background:#fff}body.dark-theme .wb-cin{background:#151515;border-color:#222}
.wb-cin input{flex:1;border:none;background:#f2f2f2;border-radius:999px;padding:9px 14px;font-size:14px;color:inherit;outline:none}body.dark-theme .wb-cin input{background:#222}
.wb-cin span{color:#ff8200;cursor:pointer;font-size:15px}
.wb-cmp{background:#fff;min-height:100%;padding:12px 14px}body.dark-theme .wb-cmp{background:#151515}
.wb-cmp-who{display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer}.wb-cmp-who em,.wb-cmp-who i{font-style:normal;color:#939393;font-size:12px}
.wb-cmp textarea{width:100%;min-height:160px;border:none;outline:none;font-size:16px;line-height:1.6;resize:vertical;background:transparent;color:inherit;font-family:inherit;margin-top:10px}
.wb-cmp-tags{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.wb-cmp-tags span{font-size:12px;color:#507daf;background:#f2f6fb;border-radius:999px;padding:3px 10px}
.wb-cmp-tools{display:flex;flex-wrap:wrap;gap:14px;border-top:.5px solid #eee;padding-top:12px;font-size:14px;color:#636363}.wb-cmp-tools span{cursor:pointer}
.wb-send{background:#ff8200;color:#fff;border-radius:999px;padding:4px 14px;font-size:14px}
.wb-mtop{display:flex;background:#fff;padding:16px 0}body.dark-theme .wb-mtop{background:#151515}.wb-mtop span{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;cursor:pointer;position:relative}.wb-mtop i{font-style:normal;font-size:24px;width:46px;height:46px;border-radius:50%;background:#fff1e0;display:flex;align-items:center;justify-content:center}.wb-mtop span.on i{background:#ff8200}.wb-mtop sup,.wb-dot{width:8px;height:8px;border-radius:50%;background:#ff3b30;position:absolute;top:0;right:30%;display:inline-block}
.wb-dmb{background:#f2f2f2;padding:10px 0}
.wb-dm{display:flex;gap:8px;align-items:flex-start;padding:6px 14px}.wb-dm span{max-width:70%;background:#fff;border-radius:12px;padding:8px 12px;font-size:15px;line-height:1.5;white-space:pre-wrap;word-break:break-word}.wb-dm.me{justify-content:flex-end}.wb-dm.me span{background:#ff8200;color:#fff}
body.dark-theme .wb-dm span{background:#222}
.wb-me{display:flex;align-items:center;gap:12px;background:#fff;padding:16px 14px;cursor:pointer}body.dark-theme .wb-me{background:#151515}.wb-me>div{flex:1;min-width:0}.wb-me b{display:flex;gap:4px;align-items:center;font-size:18px}.wb-me em{display:block;font-style:normal;font-size:13px;color:#939393;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wb-me small{font-size:12px;color:#b2b2b2}.wb-me>span{color:#c7c7cc;font-size:20px}
.wb-lot{position:relative;margin:8px 0 2px;padding:11px 12px;border-radius:10px;background:linear-gradient(135deg,#fff4e6,#ffe1e1);cursor:pointer}body.dark-theme .wb-lot{background:linear-gradient(135deg,#3a2a18,#3a1c1c)}.wb-lot b{display:block;font-size:14.5px;color:#e6162d}.wb-lot small{display:block;margin-top:3px;color:#8a6d55;font-size:12px;padding-right:76px}.wb-lot span{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:#ff8200;color:#fff;border-radius:999px;padding:4px 11px;font-size:12.5px}.wb-lot.done{filter:saturate(.5)}.wb-lot.won{filter:none;box-shadow:0 0 0 1.5px #ff8200 inset}.wb-lot em{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-style:normal;color:#e6162d;font-weight:600;font-size:13px}
.wb-lotp{text-align:center;padding:24px 16px}.wb-lotb{font-size:64px}.wb-lotp h3{margin:6px 0;font-size:20px}.wb-lotp p{margin:4px 0;color:#888;font-size:13.5px}.wb-lots{text-align:left;margin:18px 0 6px;font-weight:600;font-size:14px}.wb-lotw{display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer}.wb-lotw em{font-style:normal;color:#ff8200}.wb-lote{display:flex;flex-wrap:wrap;gap:10px}.wb-lote span{display:flex;flex-direction:column;align-items:center;gap:3px;width:56px;cursor:pointer}.wb-lote i{font-style:normal;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:56px}.wb-lotp .gys-acts{justify-content:center}
.wb-draft{display:flex;align-items:center;gap:10px;padding:13px 14px;border-bottom:.5px solid rgba(0,0,0,.08);cursor:pointer}.wb-draft>div{flex:1;min-width:0}.wb-draft p{margin:0;font-size:15px;line-height:1.45;overflow:hidden;max-height:2.9em}.wb-draft small{color:#939393;font-size:12px}.wb-draft span{color:#ff3b30;font-size:13px;flex-shrink:0}
.wb-menu{background:#fff;margin-top:8px}body.dark-theme .wb-menu{background:#151515}.wb-menu div{padding:14px;border-bottom:.5px solid #f2f2f2;font-size:15px;cursor:pointer}.wb-menu em{float:right;font-style:normal;color:#939393;font-size:13px}
.wb-sup{background:linear-gradient(135deg,#ffb36b,#ff8200);background-image:linear-gradient(rgba(255,130,0,.75),rgba(255,130,0,.9)),var(--bgi,none);background-size:cover;color:#fff;padding:20px 14px 6px}.wb-sup b{font-size:20px;display:block}.wb-sup em{font-style:normal;font-size:12.5px;opacity:.9}.wb-lv{margin-top:6px;font-size:13px}
.wb-sup .gys-btn{background:#fff;color:#ff8200}.wb-sup .gys-btn.ghost{background:transparent;color:#fff;border-color:#fff}
.wb-edit{background:#fff;padding:12px 14px;border-bottom:.5px solid #f2f2f2;font-size:14.5px;line-height:1.6}.wb-edit em{display:block;font-style:normal;font-size:12px;color:#939393;margin-bottom:4px}
.wb-list{padding-bottom:20px}
.wb-sheet{position:fixed;inset:0;z-index:99980;background:rgba(0,0,0,.35);display:flex;align-items:flex-end}.wb-sheet-in{width:100%;background:#fff;border-radius:14px 14px 0 0;padding-bottom:env(safe-area-inset-bottom,0px);max-height:70vh;overflow-y:auto}body.dark-theme .wb-sheet-in{background:#1c1c1e;color:#eee}
.wb-sheet-in div{padding:15px;text-align:center;border-bottom:.5px solid #eee;font-size:16px;cursor:pointer}.wb-sheet-in div.c{color:#8e8e93;border-top:6px solid #f2f2f2}
`);
(async () => { await G.ready(); D = Object.assign(D, await ST.get('d', {})); ['posts', 'bots', 'notes', 'stories', 'fav', 'alts', 'videos'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; }); ['supers', 'dms', 'xacc', 'follow', 'seenDel'].forEach(k => { if (!D[k] || typeof D[k] !== 'object') D[k] = {}; }); D.hot = D.hot || { list: [], at: 0 }; D.cfg = Object.assign({ refresh: 6, keep: 600 }, D.cfg || {}); ensureMkt(); })();
window.gysWbState = () => D;
// 💬 互通（256）：微博私信别处也知道
try { G.chatReg(APP, { all: c => { const th = D.dms[thKey('me', 'c:' + c.id)]; return th ? th.msgs.map(m => ({ at: m.at, t: (m.from === 'me' ? '她' : '你') + '：' + m.t })) : []; }, lines: c => { const th = D.dms[thKey('me', 'c:' + c.id)]; return th ? th.msgs.slice(-6).map(m => ({ at: m.at, t: (m.from === 'me' ? '她' : '你（' + c.name + '）') + '：' + m.t })) : []; }, lastMe: c => { const th = D.dms[thKey('me', 'c:' + c.id)]; const m = th && th.msgs.filter(x => x.from === 'me').slice(-1)[0]; return m ? m.at : 0; } }); } catch (e) {}
