/* 🫘 豆瓣：书影音（每部电影 / 书 / 音乐都有条目页：评分、几星占多少、简介、短评、长评；想看 / 在看 / 看过，打星写短评）、
   小组（建组、发帖、楼层回应、引用）、广播（友邻标记了什么、说了什么，赞 / 回应 / 转播）、日记、豆列、同城活动（约 TA 一起去）。
   真实世界的作品和按你们世界观编的作品都有；一起看电影 / 一起阅读 / 音乐盒能一键约 TA；TA 自己也会标记、写影评、在小组发帖、做豆列。 */
if (window.__gysDouban) return; window.__gysDouban = 1;
const G = window.GYS, APP = 'douban', esc = G.esc;
X.feat('gysDouban', { n: '🫘 豆瓣', desc: '书影音标记和评分、小组、广播、日记、豆列、同城活动；TA 也标记、写影评、在小组发帖' });
const ST = X.store('gysdouban');
let D = { items: {}, hot: { movie: [], book: [], music: [] }, hotAt: {}, srch: {}, marks: {}, groups: [], bc: [], diaries: [], lists: [], events: [], evAt: 0, xacc: {}, follow: null, last: {}, cfg: { keep: 400 } };
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();
const BUSY = {};
const B = window.gysDb = {};
const K = { movie: { n: '电影', ico: '🎬', want: '想看', doing: '在看', done: '看过', verb: '看', mini: 'watch_together', together: '一起看电影' }, book: { n: '读书', ico: '📖', want: '想读', doing: '在读', done: '读过', verb: '读', mini: 'reading_together', together: '一起阅读' }, music: { n: '音乐', ico: '🎵', want: '想听', doing: '在听', done: '听过', verb: '听', mini: 'music', together: '一起听歌' } };
const PASSER = ['苏打绿茶', '阿尔卑斯山的雪', '无聊的猫', '豆友' + G.rnd(10000, 99999), '一棵树', '我是马保国', '影迷小王', '今天也在读书', '失眠患者', '西瓜皮', '路边的石头', '老文青', '是阿蓝啊', 'Ryan'];

/* ---------------- 人 ---------------- */
const nameOf = w => G.nick(APP, w);
const isX = w => String(w).startsWith('x:');
const cast = () => G.people().filter(w => w !== 'me');
const charOfW = w => G.charOf(w);
function passer(name) { name = X.plain(name || G.pick(PASSER)).slice(0, 16) || G.pick(PASSER); const w = 'x:p_' + name; if (!D.xacc[w]) { D.xacc[w] = { kind: 'passer', name }; G.prof(APP, w, { nick: name, emoji: G.pick(['🌿', '🍂', '☁️', '🐈', '📼', '🎞️', '🍵', '🌙']), followers: G.rnd(3, 800), following: G.rnd(10, 300), gen: true }); } return w; }
function whoByName(n) { n = String(n || '').trim().replace(/^@/, ''); if (!n) return null; if (n === G.meName() || n === nameOf('me')) return 'me'; const all = G.people().concat(Object.keys(D.xacc)); return all.find(w => nameOf(w) === n) || all.find(w => { const b = G.base(w); return b && b.name === n; }) || null; }
const following = () => (D.follow = D.follow || cast().filter(w => w.startsWith('c:')));
const isFollow = w => following().includes(w);
const joinedAt = w => { const p = G.prof(APP, w); if (!p.joined) { p.joined = Date.now() - G.rnd(200, 3600) * 86400e3; G.save(); } return p.joined; };
const city = w => G.prof(APP, w).loc || (w === 'me' ? '' : '');
async function chooser(opts, title) {
    return new Promise(res => {
        const d = document.createElement('div'); d.className = 'db-sheet';
        d.innerHTML = `<div class="db-sheet-in">${title ? `<p>${esc(title)}</p>` : ''}${opts.map((o, i) => `<div data-i="${i}">${esc(o)}</div>`).join('')}<div data-i="-1" class="c">取消</div></div>`;
        d.onclick = e => { const i = e.target.getAttribute('data-i'); if (i == null && e.target !== d) return; d.remove(); res(i == null || i === '-1' ? null : Number(i)); };
        document.body.appendChild(d);
    });
}
const picBg = t => { let h = 0; for (const ch of String(t)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `linear-gradient(170deg,hsl(${h},35%,42%),hsl(${(h + 30) % 360},40%,25%))`; };
const stars = (s5, cls) => `<span class="db-st ${cls || ''}">${[1, 2, 3, 4, 5].map(i => `<i class="${s5 >= i ? 'on' : s5 >= i - 0.5 ? 'half' : ''}">★</i>`).join('')}</span>`;
const SLAB = ['', '很差', '较差', '还行', '推荐', '力荐'];

/* ---------------- 条目 ---------------- */
const itemOf = id => D.items[id];
const keyOf = (kind, title) => kind + '|' + String(title || '').replace(/[《》\s]/g, '').toLowerCase();
function mkItem(o, kind) {
    if (!o || !o.title) return null;
    kind = K[o.kind] ? o.kind : kind || 'movie';
    const title = X.plain(o.title).replace(/[《》]/g, '').slice(0, 30);
    const ex = Object.values(D.items).find(x => keyOf(x.kind, x.title) === keyOf(kind, title));
    if (ex) return ex;
    const score = Math.max(2, Math.min(9.8, Number(o.score) || +(5.5 + Math.random() * 3.5).toFixed(1)));
    const it = { id: G.uid('it'), kind, title, sub: X.plain(o.sub || '').slice(0, 40), year: X.plain(String(o.year || '')).slice(0, 6), meta: X.plain(o.meta || '').slice(0, 120), intro: X.plain(o.intro || '').slice(0, 500), score: +score.toFixed(1), n: Math.max(30, Number(o.n) || G.rnd(200, 600000)), real: !!o.real, emo: X.plain(o.emo || '').slice(0, 4) || K[kind].ico, shorts: [], longs: [], at: Date.now(), img: '' };
    it.dist = distOf(it.score);
    D.items[it.id] = it; saveD(); return it;
}
function distOf(sc) { const m = sc / 2; const w = [1, 2, 3, 4, 5].map(i => Math.exp(-Math.pow(i - m, 2) / 1.3)); const t = w.reduce((a, b) => a + b, 0); return w.map(x => Math.round(x / t * 1000) / 10).reverse(); }
function cover(it, big) { return it.img ? `<span class="db-cv${big ? ' big' : ''}" style="background-image:url('${it.img}')"></span>` : `<span class="db-cv t${big ? ' big' : ''}" style="background:${picBg(it.title)}"><b>${esc(it.emo)}</b><em>${esc(it.title)}</em></span>`; }
const markOf = (w, id) => ((D.marks[w] || {})[id]) || null;
const marksOf = w => Object.entries(D.marks[w] || {}).map(([id, m]) => Object.assign({ id }, m)).filter(m => itemOf(m.id));
function setMark(w, id, m) {
    const it = itemOf(id); if (!it) return;
    D.marks[w] = D.marks[w] || {};
    if (!m) { delete D.marks[w][id]; saveD(); return; }
    const old = D.marks[w][id];
    D.marks[w][id] = Object.assign({ st: 'done', star: 0, text: '', at: Date.now(), tags: [] }, old || {}, m, { at: Date.now() });
    if (m.text && !it.shorts.some(s => s.by === w)) it.shorts.unshift({ id: G.uid('s'), by: w, star: m.star || 0, text: m.text, at: Date.now(), useful: [], uN: 0 });
    else if (m.text) { const s = it.shorts.find(s => s.by === w); s.text = m.text; s.star = m.star || s.star; s.at = Date.now(); }
    if (m.star) it.n++;
    saveD();
}
function itemRow(it, extra) {
    const m = markOf('me', it.id);
    return `<div class="db-row" onclick="gysDb.item('${it.id}')">${cover(it)}<div><b>${esc(it.title)}${it.year ? ` <i>(${esc(it.year)})</i>` : ''}</b><div class="db-sc">${stars(it.score / 2)} <em>${it.score.toFixed(1)}</em></div><small>${esc(it.meta || it.sub).slice(0, 60)}</small>${extra || ''}</div>${m ? `<span class="db-mk">${K[it.kind][m.st]}</span>` : ''}</div>`;
}

/* ---------------- 模型 ---------------- */
const P = (id, def, vars) => X.pl(id, def, vars);
const world = () => { try { const wb = (typeof worldbooks !== 'undefined' ? worldbooks : []).slice(0, 2).map(w => (w.name || w.title || '')).filter(Boolean).join('、'); return (wb ? '世界书：' + wb + '；' : '') + '主要人物：' + G.chars().slice(0, 4).map(c => X.name(c) + '（' + X.persona(c).slice(0, 30) + '）').join('、'); } catch (e) { return '现代都市'; } };
function castLines(ws) { return ws.map(w => { const b = G.base(w), p = G.prof(APP, w); return `· ${p.nick}${b && b.name !== p.nick ? '（本名' + b.name + '）' : ''}：${b ? String(b.persona).slice(0, 110) : '豆友'}`; }).join('\n'); }
function whoAmI(w) { const c = charOfW(w); if (c) return X.who(c); const b = G.base(w) || {}; return `你是${b.name || nameOf(w)}。${b.persona || ''}`; }
const ITEM_JSON = '{"kind":"movie|book|music","title":"名字（不带书名号）","sub":"原名 / 作者 / 歌手","year":"年份","meta":"导演 / 主演 / 类型 / 出版社 / 流派这类一行","intro":"简介 80~150 字","score":豆瓣评分(0~10，一位小数),"n":评分人数,"real":true或false（是不是真实世界存在的作品）,"emo":"一个代表它的 emoji"}';
const DEF_HOT = `你在模拟「豆瓣」的{{类型}}频道。这个世界的背景：{{世界}}
列出 {{条数}} 部现在大家在{{动词}}的{{类型}}：一半是真实世界里真的存在的作品（名字、年份、导演 / 作者、评分都要对，不确定就别写），一半是这个世界观里会有的作品（按世界观编，real 写 false）。如果世界观不是现代（古代、奇幻、未来），就多编一些。
只输出 JSON 数组：[${ITEM_JSON}]`;
const DEF_SEARCH = `在「豆瓣」搜「{{词}}」（{{类型}}）。这个世界的背景：{{世界}}
列出最多 {{条数}} 个匹配的条目：真实世界真有的就照实写；没有的就按这个世界观编一个合理的（real 写 false）。
只输出 JSON 数组：[${ITEM_JSON}]`;
const DEF_REV = `豆瓣上的{{类型}}《{{名字}}》（{{信息}}）。评分 {{评分}}。
下面这些人可能来写评价：
{{人}}
{{熟人}}
写 {{条数}} 条「短评」（豆瓣味：有的一针见血、有的玩梗、有的很长很真诚、有的给一星骂、有的说自己当时的心情），再写 1 篇「长评」（有标题，300 字左右，有观点）。大多是路人豆友（起豆瓣式的网名），偶尔是上面的人。
只输出 JSON：{"short":[{"by":"名字","star":1到5,"text":"短评","useful":有用数}],"long":[{"by":"名字","star":1到5,"title":"标题","text":"正文"}]}`;
const DEF_MARK = `{{我是谁}}
你最近：
{{最近}}
你在豆瓣上标记一部{{类型}}（按你的口味和最近的生活；可以是真实世界的作品，也可以是这个世界里的作品；可能是你们一起看过 / 聊过的，也可能是你自己的）。{{要求}}
只输出 JSON：{"kind":"movie|book|music","title":"名字","sub":"原名 / 作者 / 歌手","year":"年份","meta":"一行信息","intro":"简介","score":豆瓣评分,"real":true或false,"st":"want|doing|done","star":你打的星（1~5，想看就 0）,"text":"你的短评（想看可以写为什么想看）"}`;
const DEF_LONG = `{{我是谁}}
你在豆瓣上给《{{名字}}》（{{信息}}）写一篇长评，按你的性格和看法写，300~500 字，可以有私心（想到她）但别点名。
只输出 JSON：{"title":"标题","text":"正文","star":1到5}`;
const DEF_GROUPS = `你在模拟「豆瓣小组」。这个世界的背景：{{世界}}
写 {{条数}} 个这个世界里会有的豆瓣小组（像「八卦来了」「丧心病狂省钱」「我们都是失眠的人」「XX 研究会」这种，有的跟主要人物有关）。
只输出 JSON 数组：[{"name":"小组名","ico":"emoji","intro":"小组介绍 40 字内","n":成员数}]`;
const DEF_GPOST = `豆瓣小组「{{小组}}」：{{介绍}}
组里会出现的人：
{{人}}
{{熟人}}
写 {{条数}} 个新帖子（豆瓣小组风：标题直接、正文口语、有求助 / 分享 / 吐槽 / 八卦 / 投票），每个帖子带 3~6 条回应（回应里有「顶」「mark」「楼主后来呢」、互怼、认真回答）。
只输出 JSON 数组：[{"by":"名字","title":"标题","body":"正文","replies":[{"by":"名字","text":"回应","quote":"引用的楼层号（没有就 0）"}]}]`;
const DEF_REPLY = `豆瓣小组「{{小组}}」的帖子《{{标题}}》（楼主 {{楼主}}）：
{{正文}}
已有回应：
{{已有}}
会来回应的人：
{{人}}
接着写 {{条数}} 条回应（豆瓣味，可以引用楼上）。只输出 JSON 数组：[{"by":"名字","text":"回应","quote":楼层号或0}]`;
const DEF_EVENT = `豆瓣「同城」：{{城市}} 最近的活动。这个世界的背景：{{世界}}
写 {{条数}} 个活动（展览、话剧、livehouse、读书会、电影放映、市集、讲座），像真的同城页。
只输出 JSON 数组：[{"title":"活动名","kind":"展览|话剧|音乐|读书|放映|市集|讲座","place":"地点","time":"时间（比如 本周六 19:30）","intro":"介绍 60 字内","price":"票价"}]`;
const DEF_CMT = `豆瓣上，{{作者}}{{什么}}：
「{{内容}}」
下面这些人可能来回应：
{{人}}
{{熟人}}
写 {{条数}} 条回应（豆瓣味，短）。认识作者的人用熟人的口气。只输出 JSON 数组：[{"by":"名字","text":"回应"}]`;
X.plGroup('🫘 豆瓣', 'gysDouban', [
    ['db.hot', '书影音热门', '打开 / 刷新书影音时', '{{类型}} {{动词}} {{世界}} {{条数}}'],
    ['db.search', '搜条目', '你搜一个词时', '{{词}} {{类型}} {{世界}} {{条数}}'],
    ['db.rev', '条目的短评和长评', '第一次打开一个条目 / 点「更多评价」', '{{类型}} {{名字}} {{信息}} {{评分}} {{人}} {{熟人}} {{条数}}'],
    ['db.mark', 'TA 标记一部作品', 'TA 自己在豆瓣标记时', '{{我是谁}} {{最近}} {{类型}} {{要求}}'],
    ['db.long', 'TA 写长评', 'TA 写影评 / 书评时', '{{我是谁}} {{名字}} {{信息}}'],
    ['db.groups', '小组', '第一次打开小组 / 发现更多小组', '{{世界}} {{条数}}'],
    ['db.gpost', '小组里的新帖子', '刷新小组时', '{{小组}} {{介绍}} {{人}} {{熟人}} {{条数}}'],
    ['db.reply', '帖子里的回应', '打开帖子 / 你发帖 / 回帖时', '{{小组}} {{标题}} {{楼主}} {{正文}} {{已有}} {{人}} {{条数}}'],
    ['db.event', '同城活动', '刷新同城时', '{{城市}} {{世界}} {{条数}}'],
    ['db.cmt', '广播 / 日记 / 长评的回应', '你发了广播、日记、长评时', '{{作者}} {{什么}} {{内容}} {{人}} {{熟人}} {{条数}}']
], { 'db.hot': DEF_HOT, 'db.search': DEF_SEARCH, 'db.rev': DEF_REV, 'db.mark': DEF_MARK, 'db.long': DEF_LONG, 'db.groups': DEF_GROUPS, 'db.gpost': DEF_GPOST, 'db.reply': DEF_REPLY, 'db.event': DEF_EVENT, 'db.cmt': DEF_CMT });
const hintFor = (owner, n) => typeof window.gyNpcCommentHint === 'function' ? window.gyNpcCommentHint(owner || 'me', n, 'douban') : '';
const ownerOf = w => w === 'me' ? 'me' : String(w).startsWith('c:') ? w.slice(2) : 'me';

async function genHot(kind) {
    if (BUSY['h' + kind]) return; BUSY['h' + kind] = 1; G.repaint(APP);
    try { const o = X.json(await X.ask(P('db.hot', DEF_HOT, { 类型: K[kind].n, 动词: K[kind].verb, 世界: world(), 条数: 8 }))); if (Array.isArray(o)) { const ids = o.map(x => mkItem(x, kind)).filter(Boolean).map(i => i.id); D.hot[kind] = Array.from(new Set(ids.concat(D.hot[kind] || []))).slice(0, 40); D.hotAt[kind] = Date.now(); saveD(); } else X.toast('🫘 没刷出来', '再试一次'); }
    finally { BUSY['h' + kind] = 0; G.repaint(APP); }
}
async function genRev(it, n) {
    if (BUSY['r' + it.id]) return; BUSY['r' + it.id] = 1; G.repaint(APP);
    try {
        const pool = cast().sort(() => Math.random() - 0.5).slice(0, 5);
        const o = X.json(await X.ask(P('db.rev', DEF_REV, { 类型: K[it.kind].n, 名字: it.title, 信息: [it.sub, it.year, it.meta].filter(Boolean).join(' / '), 评分: it.score, 人: castLines(pool), 熟人: hintFor('me', n || 5), 条数: n || 6 })));
        if (o) {
            (o.short || []).forEach(x => { if (!x || !x.text) return; let w = whoByName(x.by); if (!w || w === 'me') w = passer(x.by); if (it.shorts.some(s => s.by === w)) return; it.shorts.push({ id: G.uid('s'), by: w, star: Math.max(1, Math.min(5, +x.star || 3)), text: X.plain(x.text).slice(0, 350), at: Date.now() - G.rnd(1, 900) * 86400e3 / 10, useful: [], uN: Math.max(0, +x.useful || G.rnd(0, 3000)) }); if (G.base(w)) { D.marks[w] = D.marks[w] || {}; if (!D.marks[w][it.id]) D.marks[w][it.id] = { st: 'done', star: +x.star || 3, text: X.plain(x.text).slice(0, 350), at: Date.now(), tags: [] }; } });
            (o.long || []).forEach(x => { if (!x || !x.text) return; let w = whoByName(x.by); if (!w || w === 'me') w = passer(x.by); it.longs.push({ id: G.uid('l'), by: w, star: Math.max(1, Math.min(5, +x.star || 4)), title: X.plain(x.title || '').slice(0, 30), text: X.plain(x.text).slice(0, 3000), at: Date.now() - G.rnd(1, 300) * 86400e3, useful: [], uN: G.rnd(10, 5000), cmts: [] }); });
            it.revGen = Date.now(); saveD();
        }
    } finally { BUSY['r' + it.id] = 0; G.repaint(APP); }
}
async function genCmts(target, author, what, content, n) {
    const pool = cast().filter(w => w !== author).sort(() => Math.random() - 0.5).slice(0, 5);
    const o = X.json(await X.ask(P('db.cmt', DEF_CMT, { 作者: nameOf(author) + (author === 'me' ? '（就是用户本人）' : ''), 什么: what, 内容: String(content).slice(0, 400), 人: castLines(pool), 熟人: hintFor(ownerOf(author), n || 4), 条数: n || 4 })));
    if (!Array.isArray(o)) return [];
    const out = o.filter(x => x && x.text).map(x => { let w = whoByName(x.by); if (!w || w === author) w = passer(w === author ? '' : x.by); return { id: G.uid('c'), by: w, text: X.plain(x.text).slice(0, 200), at: Date.now() }; });
    target.cmts = (target.cmts || []).concat(out); saveD(); G.repaint(APP);
    const c = out.map(x => charOfW(x.by)).find(Boolean); if (c && author === 'me') G.notify(APP, c, `🫘 <b>${X.esc(c.name)}</b> 在豆瓣回应了你`, out.find(x => charOfW(x.by) === c).text, X.go('gysDoubanOpen', 'me'));
    return out;
}

/* ---------------- 首页：广播 ---------------- */
function bcAdd(o) { const b = Object.assign({ id: G.uid('bc'), by: 'me', kind: 'say', text: '', ref: '', at: Date.now(), likes: [], cmts: [], rs: '' }, o); D.bc.unshift(b); if (D.bc.length > 400) D.bc.length = 400; saveD(); return b; }
function bcHtml(b) {
    const it = b.ref && itemOf(b.ref), rs = b.rs && D.bc.find(x => x.id === b.rs);
    const what = b.kind === 'mark' && it ? `${K[it.kind][(markOf(b.by, it.id) || {}).st || 'done']}` : b.kind === 'diary' ? '写了日记' : b.kind === 'list' ? '创建了豆列' : b.kind === 'long' ? '写了评论' : b.kind === 'group' ? '在小组发了帖子' : b.rs ? '转播' : '说';
    const m = it ? markOf(b.by, it.id) : null;
    return `<div class="db-bc">${G.av(APP, b.by, 40)}<div class="db-bcb"><div class="db-bch"><b onclick="gysDb.prof('${b.by}')">${esc(nameOf(b.by))}</b> ${what}${m && m.star ? ' ' + stars(m.star, 's') : ''}<em>${G.ago(b.at)}</em></div>
      ${b.text ? `<div class="db-bct">${esc(b.text)}</div>` : ''}
      ${it ? `<div class="db-bcref" onclick="gysDb.item('${it.id}')">${cover(it)}<div><b>${esc(it.title)}</b><small>${esc(it.meta || it.sub).slice(0, 40)}</small></div></div>` : ''}
      ${b.link ? `<div class="db-bcref" onclick="${b.link}"><div><b>${esc(b.linkT || '')}</b></div></div>` : ''}
      ${rs ? `<div class="db-bcrs"><b>${esc(nameOf(rs.by))}</b>：${esc(rs.text)}</div>` : ''}
      <div class="db-bca"><span class="${b.likes.includes('me') ? 'on' : ''}" onclick="gysDb.bcLike('${b.id}')">👍 ${b.likes.length || '赞'}</span><span onclick="gysDb.bcCmt('${b.id}')">💬 ${b.cmts.length || '回应'}</span><span onclick="gysDb.bcRs('${b.id}')">↻ 转播</span></div>
      ${b.cmts.length ? `<div class="db-bccm">${b.cmts.slice(-4).map(c => `<div><b>${esc(nameOf(c.by))}</b>：${esc(c.text)}</div>`).join('')}</div>` : ''}</div></div>`;
}
function home() {
    const L = D.bc.filter(b => b.by === 'me' || isFollow(b.by)).slice(0, 80);
    const hot = Object.values(K).length ? (D.hot.movie || []).slice(0, 8).map(itemOf).filter(Boolean) : [];
    return `<div class="db-say" onclick="gysDb.say()">${G.av(APP, 'me', 32)}<span>说句话…</span></div>
      ${hot.length ? `<div class="db-sech">正在热映 · 热门<a onclick="gysDb.sub('movie')">全部 ›</a></div><div class="db-strip">${hot.map(it => `<div onclick="gysDb.item('${it.id}')">${cover(it)}<b>${esc(it.title)}</b><em>${stars(it.score / 2, 's')} ${it.score.toFixed(1)}</em></div>`).join('')}</div>` : ''}
      <div class="db-sech">友邻广播 <a onclick="gysDb.feedPoke()">${BUSY.poke ? '⏳' : '↻ 看看大家在干嘛'}</a></div>
      ${L.map(bcHtml).join('') || '<div class="gys-empty">还没有广播<br>去书影音标记一部，或者说句话</div>'}`;
}
B.say = async () => { const t = await G.input('说句话（会出现在友邻的广播里）', ''); if (!t) return; const b = bcAdd({ by: 'me', text: X.plain(t).slice(0, 300) }); G.repaint(APP); genCmts(b, 'me', '发了一条广播', b.text, 3); };
B.bcLike = id => { const b = D.bc.find(x => x.id === id); if (!b) return; const i = b.likes.indexOf('me'); if (i >= 0) b.likes.splice(i, 1); else b.likes.push('me'); saveD(); G.repaint(APP); };
B.bcCmt = async id => { const b = D.bc.find(x => x.id === id); if (!b) return; const t = await G.input('回应：', ''); if (!t) return; b.cmts.push({ id: G.uid('c'), by: 'me', text: X.plain(t).slice(0, 200), at: Date.now() }); saveD(); G.repaint(APP); const c = charOfW(b.by); if (c) { const r = X.plain(await X.ask(`${X.who(c)}\n你在豆瓣广播里${b.text ? '说：「' + b.text + '」' : '标记了一部作品'}，${X.me(c)}回应你：「${t}」。回她一句（豆瓣广播回应，短）。只写回应。`) || ''); if (r) { b.cmts.push({ id: G.uid('c'), by: b.by, text: r.slice(0, 200), at: Date.now() }); saveD(); G.repaint(APP); } } };
B.bcRs = async id => { const b = D.bc.find(x => x.id === id); if (!b) return; const t = await G.input('转播时说点什么（可以不写）', ''); if (t === null || t === undefined) return; bcAdd({ by: 'me', text: X.plain(t || '转播').slice(0, 200), rs: b.id }); G.repaint(APP); X.toast('↻ 转播了', ''); };
B.feedPoke = async () => { const cs = G.chars(); if (!cs.length || BUSY.poke) return; BUSY.poke = 1; G.repaint(APP); try { await taMark(G.pick(cs)); } finally { BUSY.poke = 0; G.repaint(APP); } };

/* ---------------- 书影音 ---------------- */
let SK = 'movie';
function subTab() {
    if (SK === 'event') return eventsHtml();
    const ids = (D.hot[SK] || []).filter(itemOf);
    if (!ids.length && !BUSY['h' + SK]) setTimeout(() => genHot(SK), 0);
    const mine = marksOf('me').filter(m => itemOf(m.id).kind === SK);
    return `<div class="db-sbox"><input id="dbQ" placeholder="搜${K[SK].n}" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysDb.search(this.value)"><span onclick="gysDb.search(document.getElementById('dbQ').value)">搜索</span></div>
      ${mine.length ? `<div class="db-sech">我的${K[SK].n}<a onclick="gysDb.myMarks('me','${SK}')">全部 ›</a></div><div class="db-strip">${mine.slice(0, 10).map(m => { const it = itemOf(m.id); return `<div onclick="gysDb.item('${it.id}')">${cover(it)}<b>${esc(it.title)}</b><em>${K[SK][m.st]}${m.star ? ' ' + '★'.repeat(m.star) : ''}</em></div>`; }).join('')}</div>` : ''}
      <div class="db-sech">${SK === 'movie' ? '正在热映 · 热门电影' : SK === 'book' ? '新书速递 · 热门图书' : '新碟榜 · 热门音乐'}<a onclick="gysDb.hotMore()">${BUSY['h' + SK] ? '⏳ 正在刷…' : '↻ 换一批'}</a></div>
      ${ids.map(id => itemRow(itemOf(id))).join('') || (BUSY['h' + SK] ? '<div class="gys-busy">⏳ 正在刷…</div>' : '')}
      <div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysDb.addItem()">＋ 自己加一个条目</span></div>`;
}
B.sub = k => { SK = k; G.tab(APP, 'sub'); };
B.sk = k => { SK = k; G.repaint(APP); if (k === 'event' && !D.events.length) genEvents(); };
B.hotMore = () => genHot(SK);
B.search = q => {
    q = X.plain(q || '').trim().slice(0, 20); if (!q) return;
    const k = SK + '|' + q; if (!D.srch[k]) runSearch(q, SK);
    G.push(APP, { title: '搜「' + esc(q) + '」', html: () => { const L = Object.values(D.items).filter(it => it.kind === SK && ((D.srch[k] || []).includes(it.id) || (it.title + it.sub).indexOf(q) >= 0)); return (BUSY['s' + k] ? '<div class="gys-busy">⏳ 正在搜…</div>' : '') + (L.map(it => itemRow(it)).join('') || (BUSY['s' + k] ? '' : '<div class="gys-empty">没搜到</div>')); } });
};
async function runSearch(q, kind) { const k = kind + '|' + q; BUSY['s' + k] = 1; G.repaint(APP); try { const o = X.json(await X.ask(P('db.search', DEF_SEARCH, { 词: q, 类型: K[kind].n, 世界: world(), 条数: 5 }))); if (Array.isArray(o)) { D.srch[k] = o.map(x => mkItem(x, kind)).filter(Boolean).map(i => i.id); saveD(); } } finally { BUSY['s' + k] = 0; G.repaint(APP); } }
B.addItem = async () => {
    const t = await G.input(`${K[SK].n}叫什么？`, ''); if (!t) return;
    const it = mkItem({ title: t, kind: SK, real: false, n: G.rnd(50, 3000) }, SK); if (!it) return;
    const by = await G.input('导演 / 作者 / 歌手是谁？（可以不写）', ''); if (by) it.sub = X.plain(by).slice(0, 40);
    saveD(); B.item(it.id);
};

/* ---------------- 条目页 ---------------- */
let IT_TAB = {};
// 🔗 分享（255）：条目 / 小组帖子 → iMessage 卡片或平时聊天
const itCard = it => ({ app: 'douban', kind: K[it.kind] ? K[it.kind].n : '条目', by: '', byName: '', title: '《' + it.title + '》' + (it.score ? ' ' + Number(it.score).toFixed(1) + '分' : ''), text: [it.sub, it.intro].filter(Boolean).join(' · ').slice(0, 260), img: G.cardImg(it.img || ''), at: it.at || 0, go: X.go('gysDoubanOpenItem', it.id) });
const gpCard = (g, p) => ({ app: 'douban', kind: '小组·' + g.name, by: p.by, byName: nameOf(p.by), title: p.title, text: String(p.body || '').slice(0, 260), img: '', at: p.at, go: X.go('gysDoubanOpenPost', g.id, p.id) });
B.share = id => { const it = itemOf(id); if (it) G.share(itCard(it)); };
B.pShare = (gid, pid) => { const g = gOf(gid), p = g && g.posts.find(x => x.id === pid); if (p) G.share(gpCard(g, p)); };
G.feedReg('douban', () => { const L = []; (D.groups || []).forEach(g => (g.posts || []).slice(0, 3).forEach(p => { if (Date.now() - p.at < 5 * 86400e3) L.push(gpCard(g, p)); })); D.bc.filter(b => b.kind === 'mark' && b.by !== 'me' && b.ref && itemOf(b.ref) && Date.now() - b.at < 5 * 86400e3).slice(0, 3).forEach(b => { const c = itCard(itemOf(b.ref)); c.at = b.at; c.by = b.by; c.byName = nameOf(b.by); c.text = (b.text ? '「' + b.text + '」 ' : '') + c.text; L.push(c); }); return L.sort((a, b) => b.at - a.at).slice(0, 4); });
B.item = id => {
    const it = itemOf(id); if (!it) return;
    if (!it.revGen && !BUSY['r' + id]) genRev(it, 6);
    IT_TAB[id] = IT_TAB[id] || 'short';
    G.push(APP, { id: 'item_' + id, title: K[it.kind].ico + ' ' + K[it.kind].n, cls: 'db-itb', html: () => itemHtml(id) });
};
function itemHtml(id) {
    const it = itemOf(id); if (!it) return ''; const k = K[it.kind], m = markOf('me', id);
    const fr = cast().concat(['me']).filter(w => w !== 'me' && markOf(w, id) && isFollow(w));
    const tab = IT_TAB[id];
    const shorts = it.shorts.slice().sort((a, b) => (b.uN + b.useful.length) - (a.uN + a.useful.length));
    return `<div class="db-ith"><div class="db-ithc" onclick="gysDb.itemImg('${id}')">${cover(it, 1)}</div><div class="db-ithi"><h3>${esc(it.title)}${it.year ? ` <i>(${esc(it.year)})</i>` : ''}</h3><p>${esc(it.sub)}</p><p>${esc(it.meta)}</p>${!it.real ? '<p class="db-wtag">🌐 这个世界里的作品</p>' : ''}</div></div>
      <div class="db-score"><div><b>${it.score.toFixed(1)}</b>${stars(it.score / 2)}<em>${G.fmtN(it.n)} 人评价</em></div><div class="db-dist">${it.dist.map((p, i) => `<div><span>${5 - i}星</span><i><u style="width:${p}%"></u></i><em>${p}%</em></div>`).join('')}</div></div>
      <div class="db-mkbar">${m ? `<div class="db-mymk" onclick="gysDb.mark('${id}')">我${k[m.st]}${m.star ? ' ' + stars(m.star, 's') + ' ' + SLAB[m.star] : ''}<em>${m.text ? '「' + esc(m.text.slice(0, 30)) + '」' : ''} ✏️ 修改</em></div>` : `<span class="db-mbtn" onclick="gysDb.mark('${id}','want')">♡ ${k.want}</span><span class="db-mbtn" onclick="gysDb.mark('${id}','doing')">${k.doing}</span><span class="db-mbtn" onclick="gysDb.mark('${id}','done')">☆ ${k.done}</span>`}</div>
      <div class="db-itops"><a onclick="gysDb.together('${id}')">💞 约 TA ${k.together}</a><a onclick="gysDb.toList('${id}')">＋ 添加到豆列</a><a onclick="gysDb.writeLong('${id}')">✍️ 写${it.kind === 'movie' ? '影评' : it.kind === 'book' ? '书评' : '乐评'}</a>${G.shareOn() ? `<a onclick="gysDb.share('${id}')">↗ 分享</a>` : ''}</div>
      ${it.intro ? `<div class="db-sech">简介</div><div class="db-intro">${esc(it.intro)}</div>` : ''}
      ${fr.length ? `<div class="db-sech">友邻${k.done}（${fr.length}）</div>${fr.map(w => { const mm = markOf(w, id); return `<div class="db-fr" onclick="gysDb.prof('${w}')">${G.av(APP, w, 28)}<b>${esc(nameOf(w))}</b> ${k[mm.st]}${mm.star ? ' ' + stars(mm.star, 's') : ''}<em>${esc(mm.text || '').slice(0, 40)}</em></div>`; }).join('')}` : ''}
      <div class="db-itabs"><span class="${tab === 'short' ? 'on' : ''}" onclick="gysDb.itab('${id}','short')">短评 ${it.shorts.length}</span><span class="${tab === 'long' ? 'on' : ''}" onclick="gysDb.itab('${id}','long')">${it.kind === 'movie' ? '影评' : it.kind === 'book' ? '书评' : '乐评'} ${it.longs.length}</span></div>
      ${BUSY['r' + id] ? '<div class="gys-busy">⏳ 评价加载中…</div>' : ''}
      ${tab === 'short' ? shorts.map(s => `<div class="db-short"><div class="db-sh">${G.av(APP, s.by, 24)}<b onclick="gysDb.prof('${s.by}')">${esc(nameOf(s.by))}</b>${s.star ? stars(s.star, 's') : `<i>${k.want}</i>`}<em>${new Date(s.at).toLocaleDateString()}</em></div><p>${esc(s.text)}</p><span class="db-use${s.useful.includes('me') ? ' on' : ''}" onclick="gysDb.useful('${id}','${s.id}')">👍 有用 ${s.uN + s.useful.length}</span></div>`).join('') : it.longs.map(l => `<div class="db-long" onclick="gysDb.long('${id}','${l.id}')"><div class="db-sh">${G.av(APP, l.by, 24)}<b>${esc(nameOf(l.by))}</b>${stars(l.star, 's')}</div><h4>${esc(l.title)}</h4><p>${esc(l.text.slice(0, 90))}… <a>展开</a></p><small>${l.uN + l.useful.length} 有用 · ${(l.cmts || []).length} 回应</small></div>`).join('')}
      <div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysDb.moreRev('${id}')">更多评价</span></div>`;
}
B.itab = (id, t) => { IT_TAB[id] = t; G.repaint(APP); };
B.moreRev = id => { const it = itemOf(id); if (it) genRev(it, 5); };
B.itemImg = id => { const it = itemOf(id); if (!it) return; G.pickImg(it.kind === 'music' ? 1 : 2 / 3, url => { it.img = url; saveD(); G.repaint(APP); }); };
B.useful = (id, sid) => { const it = itemOf(id), s = it && it.shorts.find(x => x.id === sid); if (!s) return; const i = s.useful.indexOf('me'); if (i >= 0) s.useful.splice(i, 1); else s.useful.push('me'); saveD(); G.repaint(APP); };
let MK = null;
B.mark = (id, st) => {
    const it = itemOf(id); if (!it) return; const k = K[it.kind], m = markOf('me', id);
    MK = { id, st: st || (m && m.st) || 'done', star: (m && m.star) || 0, text: (m && m.text) || '', tags: ((m && m.tags) || []).join(' '), bc: true };
    G.push(APP, { title: '标记', html: () => `<div class="db-mkp"><h4>${esc(it.title)}</h4>
      <div class="db-mst">${['want', 'doing', 'done'].map(s => `<span class="${MK.st === s ? 'on' : ''}" onclick="gysDb.__mk('st','${s}')">${k[s]}</span>`).join('')}</div>
      ${MK.st !== 'want' ? `<div class="db-pick">${[1, 2, 3, 4, 5].map(i => `<i class="${MK.star >= i ? 'on' : ''}" onclick="gysDb.__mk('star',${i})">★</i>`).join('')}<em>${SLAB[MK.star] || '点星星打分'}</em></div>` : ''}
      <label class="gys-f"><span>标签（空格隔开）</span><input id="dbMkTag" value="${esc(MK.tags)}" placeholder="比如：和他一起看的 治愈 下雨天"></label>
      <label class="gys-f"><span>短评（350 字内，可以不写）</span><textarea id="dbMkT" rows="4" maxlength="350" placeholder="写几句…">${esc(MK.text)}</textarea></label>
      <label class="gys-ck" style="margin:0 16px"><input type="checkbox" id="dbMkBc" ${MK.bc ? 'checked' : ''}> 分享到广播</label>
      <div class="gys-acts"><button class="gys-btn" onclick="gysDb.saveMark()">保存</button>${m ? `<button class="gys-btn ghost" onclick="gysDb.unmark('${id}')">删除标记</button>` : ''}</div></div>` });
};
B.__mk = (k, v) => { const t = document.getElementById('dbMkT'), g = document.getElementById('dbMkTag'); if (t) MK.text = t.value; if (g) MK.tags = g.value; MK[k] = v; G.repaint(APP); };
B.saveMark = () => {
    const t = document.getElementById('dbMkT'), g = document.getElementById('dbMkTag'), bc = document.getElementById('dbMkBc');
    const m = { st: MK.st, star: MK.st === 'want' ? 0 : MK.star, text: X.plain(t ? t.value : MK.text).slice(0, 350), tags: (g ? g.value : MK.tags).split(/\s+/).filter(Boolean).slice(0, 6) };
    setMark('me', MK.id, m);
    if (bc && bc.checked) { const b = bcAdd({ by: 'me', kind: 'mark', ref: MK.id, text: m.text }); if (Math.random() < 0.7) genCmts(b, 'me', `在豆瓣${K[itemOf(MK.id).kind][m.st]}《${itemOf(MK.id).title}》`, m.text || '（没写短评）', 2); }
    X.toast(X.v('🫘 标记好了', '记下了', '好了'), ''); G.back(APP);
};
B.unmark = async id => { if (!(await G.confirm('删掉这个标记？'))) return; setMark('me', id, null); const it = itemOf(id); it.shorts = it.shorts.filter(s => s.by !== 'me'); saveD(); G.back(APP); };
B.together = async id => {
    const it = itemOf(id); if (!it) return; const k = K[it.kind];
    const cs = G.chars(); if (!cs.length) return; const i = cs.length === 1 ? 0 : await chooser(cs.map(c => c.name), `约谁一起${k.verb}《${it.title}》？`); if (i == null) return;
    const c = cs[i];
    setMark('me', id, { st: markOf('me', id) ? markOf('me', id).st : 'want' });
    X.reach(c, `她在豆瓣上看到《${it.title}》（${k.n}，${it.sub || ''}），想约你一起${k.verb}`);
    X.toast('💞 约 TA 了', X.v('等 TA 回你', `去「${k.together}」就能一起${k.verb}`));
    if (typeof gyOpenMiniFeature === 'function' && await G.confirm(`现在打开「${k.together}」吗？`)) { G.close(APP); gyOpenMiniFeature(k.mini); }
};
B.writeLong = id => {
    const it = itemOf(id); if (!it) return; let star = (markOf('me', id) || {}).star || 4;
    B.__ls = v => { star = v; const e = document.querySelectorAll('#dbLs i'); e.forEach((x, i) => x.classList.toggle('on', i < v)); };
    G.push(APP, { title: '写' + (it.kind === 'movie' ? '影评' : it.kind === 'book' ? '书评' : '乐评'), html: () => `<div class="db-mkp"><h4>${esc(it.title)}</h4><div class="db-pick" id="dbLs">${[1, 2, 3, 4, 5].map(i => `<i class="${star >= i ? 'on' : ''}" onclick="gysDb.__ls(${i})">★</i>`).join('')}</div>
      <label class="gys-f"><span>标题</span><input id="dbLt" placeholder="一句话标题"></label><label class="gys-f"><span>正文</span><textarea id="dbLb" rows="12" placeholder="写你的看法…"></textarea></label>
      <div class="gys-acts"><button class="gys-btn" onclick="gysDb.saveLong('${id}')">发布</button></div></div>`, after: () => { B.__star = () => star; } });
};
B.saveLong = async id => {
    const it = itemOf(id), t = (document.getElementById('dbLt') || {}).value || '', b = (document.getElementById('dbLb') || {}).value || ''; if (!b.trim()) return X.toast('写点什么吧', '');
    const star = B.__star ? B.__star() : 4;
    const l = { id: G.uid('l'), by: 'me', star, title: X.plain(t || it.title + ' 的一点想法').slice(0, 30), text: b.trim().slice(0, 5000), at: Date.now(), useful: [], uN: 0, cmts: [] };
    it.longs.unshift(l); if (!markOf('me', id)) setMark('me', id, { st: 'done', star }); bcAdd({ by: 'me', kind: 'long', ref: id, text: l.title }); saveD();
    G.back(APP); IT_TAB[id] = 'long'; G.repaint(APP); X.toast('✍️ 发布了', '');
    genCmts(l, 'me', `给《${it.title}》写了一篇长评《${l.title}》`, l.text, 4);
};
B.long = (id, lid) => {
    const it = itemOf(id), l = it && it.longs.find(x => x.id === lid); if (!l) return;
    if (!(l.cmts || []).length && l.by !== 'me' && !BUSY['lc' + lid]) { BUSY['lc' + lid] = 1; genCmts(l, l.by, `给《${it.title}》写了一篇长评《${l.title}》`, l.text, 3).finally(() => { BUSY['lc' + lid] = 0; }); }
    G.push(APP, { title: esc(l.title), html: () => `<div class="db-art"><h3>${esc(l.title)}</h3><div class="db-sh">${G.av(APP, l.by, 28)}<b onclick="gysDb.prof('${l.by}')">${esc(nameOf(l.by))}</b> 评论 《${esc(it.title)}》 ${stars(l.star, 's')}</div><div class="db-artt">${esc(l.text)}</div>
      <div class="db-bca"><span class="${l.useful.includes('me') ? 'on' : ''}" onclick="gysDb.lUse('${id}','${lid}')">👍 有用 ${l.uN + l.useful.length}</span><span onclick="gysDb.lCmt('${id}','${lid}')">💬 回应</span></div>
      <div class="db-sech">回应</div>${(l.cmts || []).map(c => `<div class="db-reply"><b>${esc(nameOf(c.by))}</b><p>${esc(c.text)}</p></div>`).join('') || '<div class="gys-empty">还没有回应</div>'}</div>` });
};
B.lUse = (id, lid) => { const l = itemOf(id).longs.find(x => x.id === lid); const i = l.useful.indexOf('me'); if (i >= 0) l.useful.splice(i, 1); else l.useful.push('me'); saveD(); G.repaint(APP); };
B.lCmt = async (id, lid) => { const l = itemOf(id).longs.find(x => x.id === lid); const t = await G.input('回应：', ''); if (!t) return; (l.cmts = l.cmts || []).push({ id: G.uid('c'), by: 'me', text: X.plain(t).slice(0, 300), at: Date.now() }); saveD(); G.repaint(APP); };

/* ---------------- 豆列 ---------------- */
B.toList = async id => {
    const mine = D.lists.filter(l => l.by === 'me');
    const i = await chooser(mine.map(l => '📋 ' + l.name).concat(['＋ 新建豆列']), '添加到哪个豆列？'); if (i == null) return;
    let l = mine[i];
    if (!l) { const nm = await G.input('豆列叫什么？（比如：和他一起看过的电影）', ''); if (!nm) return; l = { id: G.uid('dl'), by: 'me', name: X.plain(nm).slice(0, 30), intro: '', ids: [], at: Date.now(), fans: G.rnd(0, 20) }; D.lists.unshift(l); bcAdd({ by: 'me', kind: 'list', text: l.name, link: `gysDb.list('${l.id}')`, linkT: '📋 ' + l.name }); }
    if (!l.ids.includes(id)) l.ids.push(id); saveD(); X.toast('📋 加进「' + l.name + '」了', '');
};
B.list = id => { const l = D.lists.find(x => x.id === id); if (!l) return; G.push(APP, { title: '豆列', html: () => `<div class="db-lh"><h3>${esc(l.name)}</h3><p>${esc(nameOf(l.by))} 创建 · ${l.ids.length} 个条目 · ${l.fans || 0} 人关注</p>${l.intro ? `<p>${esc(l.intro)}</p>` : ''}${l.by === 'me' ? `<a onclick="gysDb.listEdit('${id}')">✏️ 改名字 / 简介</a>` : ''}</div>${l.ids.map(itemOf).filter(Boolean).map((it, i) => itemRow(it, l.notes && l.notes[it.id] ? `<p class="db-ln">${esc(nameOf(l.by))}：${esc(l.notes[it.id])}</p>` : '')).join('') || '<div class="gys-empty">还是空的，在条目页点「＋ 添加到豆列」</div>'}` }); };
B.listEdit = async id => { const l = D.lists.find(x => x.id === id); const nm = await G.input('豆列名字', l.name); if (nm) l.name = X.plain(nm).slice(0, 30); const it = await G.input('简介（可以不写）', l.intro); if (it !== null && it !== undefined) l.intro = X.plain(it).slice(0, 200); saveD(); G.repaint(APP); };

/* ---------------- 小组 ---------------- */
const gOf = id => D.groups.find(g => g.id === id);
function groupTab() {
    if (!D.groups.length && !BUSY.groups) setTimeout(() => genGroups(5), 0);
    const mine = D.groups.filter(g => g.members.me), other = D.groups.filter(g => !g.members.me);
    const posts = mine.flatMap(g => g.posts.map(p => [g, p])).sort((a, b) => (b[1].last || b[1].at) - (a[1].last || a[1].at)).slice(0, 30);
    return `<div class="db-sech">我加入的小组<a onclick="gysDb.newGroup()">＋ 建小组</a></div>
      <div class="db-gstrip">${mine.map(g => `<div onclick="gysDb.group('${g.id}')"><span class="db-gico" style="${g.img ? `background-image:url('${g.img}')` : ''}">${g.img ? '' : esc(g.ico)}</span><b>${esc(g.name)}</b></div>`).join('') || '<em>还没加入小组，下面挑一个吧</em>'}</div>
      ${posts.length ? `<div class="db-sech">我的小组话题</div>${posts.map(([g, p]) => postRow(g, p, 1)).join('')}` : ''}
      <div class="db-sech">发现小组<a onclick="gysDb.moreGroups()">${BUSY.groups ? '⏳' : '↻ 再看看'}</a></div>
      ${other.map(g => `<div class="db-grow" onclick="gysDb.group('${g.id}')"><span class="db-gico" style="${g.img ? `background-image:url('${g.img}')` : ''}">${g.img ? '' : esc(g.ico)}</span><div><b>${esc(g.name)}</b><em>${esc(g.intro)}</em><small>${G.fmtN(g.n)} 个成员</small></div><span class="db-jbtn" onclick="event.stopPropagation();gysDb.join('${g.id}')">加入</span></div>`).join('') || (BUSY.groups ? '<div class="gys-busy">⏳ 正在找小组…</div>' : '')}`;
}
const postRow = (g, p, showG) => `<div class="db-prow" onclick="gysDb.post('${g.id}','${p.id}')"><div><b>${p.top ? '<i class="db-top">置顶</i>' : ''}${p.elite ? '<i class="db-el">精</i>' : ''}${esc(p.title)}</b><small>${esc(nameOf(p.by))}${showG ? ' · ' + esc(g.name) : ''} · ${G.ago(p.last || p.at)}</small></div><span>${p.replies.length}</span></div>`;
async function genGroups(n) {
    BUSY.groups = 1; G.repaint(APP);
    try { const o = X.json(await X.ask(P('db.groups', DEF_GROUPS, { 世界: world(), 条数: n || 5 }))); if (Array.isArray(o)) { o.forEach(x => { if (!x || !x.name || D.groups.some(g => g.name === x.name)) return; D.groups.push({ id: G.uid('g'), name: X.plain(x.name).slice(0, 20), ico: X.plain(x.ico || '').slice(0, 4) || '👥', intro: X.plain(x.intro || '').slice(0, 80), n: Math.max(10, +x.n || G.rnd(300, 200000)), members: {}, posts: [], owner: '', at: Date.now() }); }); saveD(); } }
    finally { BUSY.groups = 0; G.repaint(APP); }
}
B.moreGroups = () => genGroups(4);
B.join = id => { const g = gOf(id); if (!g) return; if (g.members.me) { delete g.members.me; g.n--; X.toast('退出了小组', ''); } else { g.members.me = Date.now(); g.n++; X.toast('👥 加入了「' + g.name + '」', ''); } saveD(); G.repaint(APP); };
B.newGroup = async () => { const nm = await G.input('小组叫什么？', ''); if (!nm) return; const intro = await G.input('小组介绍（可以不写）', ''); const g = { id: G.uid('g'), name: X.plain(nm).slice(0, 20), ico: '🌱', intro: X.plain(intro || '').slice(0, 80), n: 1, members: { me: Date.now() }, posts: [], owner: 'me', at: Date.now() }; D.groups.unshift(g); saveD(); B.group(g.id); };
B.group = id => {
    const g = gOf(id); if (!g) return;
    if (!g.posts.length && !BUSY['gp' + id]) genGPosts(g, 4);
    G.push(APP, { id: 'grp_' + id, title: '', cls: 'db-gb', html: () => `<div class="db-gh"><span class="db-gico big" style="${g.img ? `background-image:url('${g.img}')` : ''}" ${g.owner === 'me' ? `onclick="gysDb.gImg('${id}')"` : ''}>${g.img ? '' : esc(g.ico)}</span><div><h3>${esc(g.name)}</h3><p>${esc(g.intro)}</p><small>${G.fmtN(g.n)} 个成员${g.owner === 'me' ? ' · 我是组长' : ''}</small></div></div>
      <div class="gys-acts"><span class="gys-btn sm${g.members.me ? ' ghost' : ''}" onclick="gysDb.join('${id}')">${g.members.me ? '已加入' : '加入小组'}</span><span class="gys-btn sm" onclick="gysDb.gPost('${id}')">✏️ 发言</span><span class="gys-btn sm ghost" onclick="gysDb.gRefresh('${id}')">${BUSY['gp' + id] ? '⏳ 刷新中' : '↻ 刷新'}</span>${g.owner === 'me' ? `<span class="gys-btn sm ghost" onclick="gysDb.gEdit('${id}')">管理</span>` : ''}</div>
      ${g.posts.slice().sort((a, b) => (b.top ? 1 : 0) - (a.top ? 1 : 0) || (b.last || b.at) - (a.last || a.at)).map(p => postRow(g, p)).join('') || (BUSY['gp' + id] ? '<div class="gys-busy">⏳ 正在加载…</div>' : '<div class="gys-empty">还没有帖子</div>')}` });
};
B.gImg = id => G.pickImg(1, url => { gOf(id).img = url; saveD(); G.repaint(APP); });
B.gEdit = async id => { const g = gOf(id); const nm = await G.input('小组名字', g.name); if (nm) g.name = X.plain(nm).slice(0, 20); const it = await G.input('小组介绍', g.intro); if (it !== null && it !== undefined) g.intro = X.plain(it).slice(0, 80); saveD(); G.repaint(APP); };
B.gRefresh = id => { const g = gOf(id); if (g) genGPosts(g, 3); };
async function genGPosts(g, n) {
    if (BUSY['gp' + g.id]) return; BUSY['gp' + g.id] = 1; G.repaint(APP);
    try {
        const pool = cast().sort(() => Math.random() - 0.5).slice(0, 6);
        const o = X.json(await X.ask(P('db.gpost', DEF_GPOST, { 小组: g.name, 介绍: g.intro, 人: castLines(pool), 熟人: hintFor('me', n * 3), 条数: n || 3 })));
        if (Array.isArray(o)) o.forEach(x => { if (!x || !x.title) return; let w = whoByName(x.by); if (!w || w === 'me') w = passer(x.by); const p = { id: G.uid('gp'), by: w, title: X.plain(x.title).slice(0, 40), body: X.plain(x.body || '').slice(0, 1500), at: Date.now() - G.rnd(5, 600) * 60e3, replies: [], likes: [] }; addReplies(p, x.replies); p.last = p.replies.length ? p.replies[p.replies.length - 1].at : p.at; g.posts.unshift(p); });
        if (g.posts.length > 80) g.posts.length = 80; saveD();
    } finally { BUSY['gp' + g.id] = 0; G.repaint(APP); }
}
function addReplies(p, arr) { (Array.isArray(arr) ? arr : []).forEach(x => { if (!x || !x.text) return; let w = whoByName(x.by); if (!w) w = passer(x.by); p.replies.push({ id: G.uid('r'), by: w, text: X.plain(x.text).slice(0, 400), quote: Math.max(0, Math.min(p.replies.length, +x.quote || 0)), at: Date.now() - G.rnd(0, 300) * 60e3 }); }); p.replies.sort((a, b) => a.at - b.at); }
let QUOTE = 0;
B.post = (gid, pid) => {
    const g = gOf(gid), p = g && g.posts.find(x => x.id === pid); if (!p) return; QUOTE = 0;
    G.push(APP, { id: 'post_' + pid, title: esc(g.name), cls: 'db-pb', html: () => `<div class="db-art"><h3>${esc(p.title)}</h3><div class="db-sh">${G.av(APP, p.by, 28)}<b onclick="gysDb.prof('${p.by}')">${esc(nameOf(p.by))}</b><em>${new Date(p.at).toLocaleString()}</em></div><div class="db-artt">${esc(p.body)}</div>
      <div class="db-bca"><span class="${p.likes.includes('me') ? 'on' : ''}" onclick="gysDb.pLike('${gid}','${pid}')">👍 ${p.likes.length || '赞'}</span>${p.by === 'me' || g.owner === 'me' ? `<span onclick="gysDb.pMenu('${gid}','${pid}')">⋯ 管理</span>` : ''}${G.shareOn() ? `<span onclick="gysDb.pShare('${gid}','${pid}')">↗ 分享</span>` : ''}</div>
      <div class="db-sech">回应（${p.replies.length}）<a onclick="gysDb.moreReplies('${gid}','${pid}')">${BUSY['rp' + pid] ? '⏳' : '↻ 刷新'}</a></div>
      ${p.replies.map((r, i) => `<div class="db-reply">${G.av(APP, r.by, 28)}<div><div class="db-rh"><b onclick="gysDb.prof('${r.by}')">${esc(nameOf(r.by))}</b>${r.by === p.by ? '<i class="db-lz">楼主</i>' : ''}<em>#${i + 1} · ${G.ago(r.at)}</em></div>${r.quote && p.replies[r.quote - 1] ? `<div class="db-quote">${esc(nameOf(p.replies[r.quote - 1].by))}：${esc(p.replies[r.quote - 1].text.slice(0, 60))}</div>` : ''}<p>${esc(r.text)}</p><a onclick="gysDb.quote(${i + 1})">回应</a></div></div>`).join('') || '<div class="gys-empty">还没有回应</div>'}</div>`,
        foot: () => `<div class="db-bar">${QUOTE ? `<small onclick="gysDb.quote(0)">引用 #${QUOTE} ✕</small>` : ''}<input id="dbRp" placeholder="添加回应" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysDb.reply('${gid}','${pid}')"><span onclick="gysDb.reply('${gid}','${pid}')">发送</span></div>` });
};
B.quote = i => { QUOTE = i; G.repaint(APP); setTimeout(() => { const e = document.getElementById('dbRp'); if (e) e.focus(); }, 30); };
B.pLike = (gid, pid) => { const p = gOf(gid).posts.find(x => x.id === pid); const i = p.likes.indexOf('me'); if (i >= 0) p.likes.splice(i, 1); else p.likes.push('me'); saveD(); G.repaint(APP); };
B.pMenu = async (gid, pid) => { const g = gOf(gid), p = g.posts.find(x => x.id === pid); const ops = g.owner === 'me' ? [p.top ? '取消置顶' : '📌 置顶', p.elite ? '取消精华' : '⭐ 加精', '🗑️ 删除'] : ['🗑️ 删除']; const i = await chooser(ops); if (i == null) return; const op = ops[i]; if (op.includes('置顶')) p.top = !p.top; else if (op.includes('精')) p.elite = !p.elite; else { g.posts = g.posts.filter(x => x !== p); saveD(); return G.back(APP); } saveD(); G.repaint(APP); };
B.reply = async (gid, pid) => {
    const g = gOf(gid), p = g.posts.find(x => x.id === pid), inp = document.getElementById('dbRp'); if (!inp) return; const t = inp.value.trim(); if (!t) return;
    p.replies.push({ id: G.uid('r'), by: 'me', text: t.slice(0, 600), quote: QUOTE, at: Date.now() }); p.last = Date.now(); QUOTE = 0; saveD(); G.repaint(APP);
    if (Math.random() < 0.8) genReplies(g, p, 2);
};
B.moreReplies = (gid, pid) => { const g = gOf(gid), p = g.posts.find(x => x.id === pid); if (p) genReplies(g, p, 3); };
async function genReplies(g, p, n) {
    if (BUSY['rp' + p.id]) return; BUSY['rp' + p.id] = 1; G.repaint(APP);
    try { const pool = cast().sort(() => Math.random() - 0.5).slice(0, 5); const o = X.json(await X.ask(P('db.reply', DEF_REPLY, { 小组: g.name, 标题: p.title, 楼主: nameOf(p.by) + (p.by === 'me' ? '（用户本人）' : ''), 正文: p.body.slice(0, 600), 已有: p.replies.slice(-10).map((r, i) => `#${p.replies.length - Math.min(10, p.replies.length) + i + 1} ${nameOf(r.by)}：${r.text}`).join('\n') || '（还没有）', 人: castLines(pool), 条数: n || 3 }))); if (Array.isArray(o)) { const k = p.replies.length; addReplies(p, o.map(x => Object.assign({}, x, { at: 0 }))); p.replies.slice(k).forEach(r => { r.at = Date.now(); }); p.last = Date.now(); saveD(); const c = p.replies.slice(k).map(r => charOfW(r.by)).find(Boolean); if (c && p.by === 'me') G.notify(APP, c, `🫘 <b>${X.esc(c.name)}</b> 在豆瓣小组回应了你`, p.title, X.go('gysDoubanOpenPost', g.id, p.id)); } }
    finally { BUSY['rp' + p.id] = 0; G.repaint(APP); }
}
B.gPost = gid => G.push(APP, { title: '发言', html: () => `<label class="gys-f"><span>标题</span><input id="dbGt" placeholder="标题"></label><label class="gys-f"><span>正文</span><textarea id="dbGb" rows="10" placeholder="说点什么…"></textarea></label><div class="gys-acts"><button class="gys-btn" onclick="gysDb.gSend('${gid}')">发布</button></div>` });
B.gSend = async gid => {
    const g = gOf(gid), t = (document.getElementById('dbGt') || {}).value || '', b = (document.getElementById('dbGb') || {}).value || ''; if (!t.trim()) return X.toast('写个标题吧', '');
    if (!g.members.me) { g.members.me = Date.now(); g.n++; }
    const p = { id: G.uid('gp'), by: 'me', title: X.plain(t).slice(0, 40), body: b.trim().slice(0, 3000), at: Date.now(), last: Date.now(), replies: [], likes: [] }; g.posts.unshift(p); bcAdd({ by: 'me', kind: 'group', text: p.title, link: `gysDb.post('${gid}','${p.id}')`, linkT: '👥 ' + g.name + '：' + p.title }); saveD();
    G.back(APP); B.post(gid, p.id); genReplies(g, p, 4);
};

/* ---------------- 同城 ---------------- */
function eventsHtml() {
    return `<div class="db-sech">📍 ${esc(G.prof(APP, 'me').loc || '你的城市')} · 同城活动<a onclick="gysDb.evRefresh()">${BUSY.ev ? '⏳' : '↻ 换一批'}</a></div>
      ${D.events.map(e => `<div class="db-ev"><span class="db-evk">${esc({ 展览: '🖼️', 话剧: '🎭', 音乐: '🎸', 读书: '📚', 放映: '🎞️', 市集: '🛍️', 讲座: '🎤' }[e.kind] || '📍')}</span><div><b>${esc(e.title)}</b><small>${esc(e.time)} · ${esc(e.place)}${e.price ? ' · ' + esc(e.price) : ''}</small><p>${esc(e.intro)}</p><div class="db-evb"><span class="${e.want ? 'on' : ''}" onclick="gysDb.evWant('${e.id}')">${e.want ? '★ 感兴趣' : '☆ 感兴趣'}</span><span onclick="gysDb.evAsk('${e.id}')">💞 约 TA 一起去</span></div></div></div>`).join('') || (BUSY.ev ? '<div class="gys-busy">⏳ 正在找活动…</div>' : '<div class="gys-empty">还没有活动<br>先在「我的 → 编辑资料」里填你的城市</div>')}`;
}
async function genEvents() {
    if (BUSY.ev) return; BUSY.ev = 1; G.repaint(APP);
    try { const o = X.json(await X.ask(P('db.event', DEF_EVENT, { 城市: G.prof(APP, 'me').loc || '你所在的城市', 世界: world(), 条数: 6 }))); if (Array.isArray(o)) { D.events = o.filter(x => x && x.title).map(x => ({ id: G.uid('ev'), title: X.plain(x.title).slice(0, 30), kind: X.plain(x.kind || '').slice(0, 4), place: X.plain(x.place || '').slice(0, 30), time: X.plain(x.time || '').slice(0, 20), intro: X.plain(x.intro || '').slice(0, 120), price: X.plain(x.price || '').slice(0, 12), want: 0 })).concat(D.events.filter(e => e.want)).slice(0, 20); D.evAt = Date.now(); saveD(); } }
    finally { BUSY.ev = 0; G.repaint(APP); }
}
B.evRefresh = () => genEvents();
B.evWant = id => { const e = D.events.find(x => x.id === id); if (!e) return; e.want = e.want ? 0 : 1; saveD(); G.repaint(APP); };
B.evAsk = async id => { const e = D.events.find(x => x.id === id); if (!e) return; const cs = G.chars(); if (!cs.length) return; const i = cs.length === 1 ? 0 : await chooser(cs.map(c => c.name), '约谁一起去？'); if (i == null) return; e.want = 1; saveD(); X.reach(cs[i], `她在豆瓣同城看到「${e.title}」（${e.kind}，${e.time}，${e.place}），想约你一起去`); X.toast('💞 约 TA 了', X.v('等 TA 回你', '看 TA 去不去')); };

/* ---------------- 日记 ---------------- */
B.diaries = w => G.push(APP, { title: (w === 'me' ? '我' : esc(nameOf(w))) + '的日记', html: () => `${w === 'me' ? '<div class="gys-acts"><span class="gys-btn sm" onclick="gysDb.writeDiary()">✏️ 写日记</span></div>' : ''}${D.diaries.filter(d => d.by === w && (w === 'me' || d.vis !== 'self')).map(d => `<div class="db-prow" onclick="gysDb.diary('${d.id}')"><div><b>${esc(d.title)}</b><small>${new Date(d.at).toLocaleDateString()}${d.vis === 'self' ? ' · 🔒 仅自己可见' : ''} · ${(d.cmts || []).length} 回应</small></div></div>`).join('') || '<div class="gys-empty">还没有日记</div>'}` });
B.writeDiary = () => G.push(APP, { title: '写日记', html: () => `<label class="gys-f"><span>标题</span><input id="dbDt" placeholder="今天"></label><label class="gys-f"><span>正文</span><textarea id="dbDb" rows="12"></textarea></label><label class="gys-ck" style="margin:0 16px"><input type="checkbox" id="dbDs"> 仅自己可见</label><div class="gys-acts"><button class="gys-btn" onclick="gysDb.saveDiary()">发布</button></div>` });
B.saveDiary = () => {
    const t = (document.getElementById('dbDt') || {}).value || '', b = (document.getElementById('dbDb') || {}).value || '', self = (document.getElementById('dbDs') || {}).checked; if (!b.trim()) return X.toast('写点什么吧', '');
    const d = { id: G.uid('dy'), by: 'me', title: X.plain(t || new Date().toLocaleDateString() + ' 的日记').slice(0, 30), body: b.trim().slice(0, 8000), at: Date.now(), vis: self ? 'self' : 'public', cmts: [] }; D.diaries.unshift(d);
    if (!self) { bcAdd({ by: 'me', kind: 'diary', text: d.title, link: `gysDb.diary('${d.id}')`, linkT: '📔 ' + d.title }); genCmts(d, 'me', `写了一篇日记《${d.title}》`, d.body, 3); }
    saveD(); G.back(APP); X.toast('📔 发布了', self ? '只有你看得到' : '');
};
B.diary = id => { const d = D.diaries.find(x => x.id === id); if (!d) return; G.push(APP, { title: '日记', html: () => `<div class="db-art"><h3>${esc(d.title)}</h3><div class="db-sh">${G.av(APP, d.by, 28)}<b>${esc(nameOf(d.by))}</b><em>${new Date(d.at).toLocaleString()}</em></div><div class="db-artt">${esc(d.body)}</div><div class="db-sech">回应</div>${(d.cmts || []).map(c => `<div class="db-reply"><b>${esc(nameOf(c.by))}</b><p>${esc(c.text)}</p></div>`).join('') || '<div class="gys-empty">还没有回应</div>'}${d.by === 'me' ? `<div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysDb.delDiary('${id}')">删掉</span></div>` : ''}</div>` }); };
B.delDiary = async id => { if (!(await G.confirm('删掉这篇日记？'))) return; D.diaries = D.diaries.filter(x => x.id !== id); saveD(); G.back(APP); };

/* ---------------- 我的 / 主页 ---------------- */
function profHtml(w) {
    const p = G.prof(APP, w), me = w === 'me', ms = marksOf(w);
    const cnt = (k, st) => ms.filter(m => itemOf(m.id).kind === k && m.st === st).length;
    const lists = D.lists.filter(l => l.by === w), recent = ms.sort((a, b) => b.at - a.at).slice(0, 8);
    const links = G.linksOf(APP, w);
    return `<div class="db-pf"><div class="db-pfh" style="${p.bg ? `background-image:url('${p.bg}')` : ''}"></div><div class="db-pfi">${G.av(APP, w, 72)}<div><h3>${esc(p.nick)}</h3><small>${p.loc ? '常居：' + esc(p.loc) + ' · ' : ''}${new Date(joinedAt(w)).getFullYear()} 年加入</small></div></div>
      <div class="db-pfbio">${esc(p.bio || (me ? '还没写签名' : '（这个人没有签名）'))}</div>
      ${links.length ? `<div class="db-pftags">${links.map(([k, h]) => `<span>${G.APPS[k].ico} ${esc(h)}</span>`).join('')}</div>` : ''}
      <div class="db-pfops">${me ? `<span class="gys-btn sm ghost" onclick="gysDb.editMe('me')">编辑资料</span>` : `<span class="gys-btn sm${isFollow(w) ? ' ghost' : ''}" onclick="gysDb.follow('${w}')">${isFollow(w) ? '已关注' : '＋ 关注'}</span><span class="gys-btn sm ghost" onclick="gysDb.editMe('${w}')">改 TA 的豆瓣主页</span>`}</div>
      <div class="db-cnt">${Object.keys(K).map(k => ['want', 'done'].map(st => `<span onclick="gysDb.myMarks('${w}','${k}','${st}')"><b>${cnt(k, st)}</b>${K[k][st]}</span>`).join('')).join('')}</div>
      ${recent.length ? `<div class="db-sech">最近标记</div><div class="db-strip">${recent.map(m => { const it = itemOf(m.id); return `<div onclick="gysDb.item('${it.id}')">${cover(it)}<b>${esc(it.title)}</b><em>${K[it.kind][m.st]}${m.star ? ' ' + '★'.repeat(m.star) : ''}</em></div>`; }).join('')}</div>` : ''}
      <div class="db-menu">
        <div onclick="gysDb.lists('${w}')">📋 ${me ? '我' : 'TA'}的豆列<em>${lists.length}</em></div>
        <div onclick="gysDb.diaries('${w}')">📔 ${me ? '我' : 'TA'}的日记<em>${D.diaries.filter(d => d.by === w && (me || d.vis !== 'self')).length}</em></div>
        <div onclick="gysDb.bcOf('${w}')">📢 ${me ? '我' : 'TA'}的广播<em>${D.bc.filter(b => b.by === w).length}</em></div>
        ${me ? `<div onclick="gysDb.calendar()">📅 打卡日历<em>连续 ${markStreak()} 天</em></div><div onclick="gysDb.yearly()">🎞️ 年度总结<em>${new Date().getFullYear()}</em></div><div onclick="gysDb.sk2('event')">📍 同城活动<em>${D.events.filter(e => e.want).length} 个感兴趣</em></div><div onclick="gysDb.settings()">⚙️ 设置</div><div onclick="gysDb.export()">📤 导出豆瓣记录（TXT）</div>` : ''}
      </div></div>`;
}
B.prof = w => { if (!w) return; if (w !== 'me' && G.base(w) && !G.prof(APP, w).gen) G.genProfiles(APP, [w], STYLE).then(() => G.repaint(APP)); G.push(APP, { id: 'prof_' + w, title: esc(nameOf(w)), html: () => profHtml(w) }); };
B.editMe = w => G.editProf(APP, w);
B.follow = w => { const L = following(), i = L.indexOf(w); if (i >= 0) L.splice(i, 1); else L.push(w); saveD(); G.repaint(APP); };
B.sk2 = k => { SK = k; G.tab(APP, 'sub'); if (k === 'event' && !D.events.length) genEvents(); };
B.myMarks = (w, k, st) => G.push(APP, { title: (w === 'me' ? '我' : esc(nameOf(w))) + '的' + K[k].n, html: () => { let L = marksOf(w).filter(m => itemOf(m.id).kind === k); return `<div class="db-itabs">${['want', 'doing', 'done'].map(s => `<span class="${(st || 'done') === s ? 'on' : ''}" onclick="gysDb.__mm('${w}','${k}','${s}')">${K[k][s]} ${L.filter(m => m.st === s).length}</span>`).join('')}</div>${L.filter(m => m.st === (st || 'done')).sort((a, b) => b.at - a.at).map(m => itemRow(itemOf(m.id), m.text ? `<p class="db-ln">${m.star ? stars(m.star, 's') + ' ' : ''}${esc(m.text)}</p>` : '')).join('') || '<div class="gys-empty">还没有</div>'}`; } });
B.__mm = (w, k, s) => { G.back(APP); B.myMarks(w, k, s); };
B.lists = w => G.push(APP, { title: '豆列', html: () => D.lists.filter(l => l.by === w).map(l => `<div class="db-prow" onclick="gysDb.list('${l.id}')"><div><b>📋 ${esc(l.name)}</b><small>${l.ids.length} 个条目</small></div></div>`).join('') || `<div class="gys-empty">还没有豆列${w === 'me' ? '<br>在条目页点「＋ 添加到豆列」就能建' : ''}</div>` });
B.bcOf = w => G.push(APP, { title: '广播', html: () => D.bc.filter(b => b.by === w).map(bcHtml).join('') || '<div class="gys-empty">还没有广播</div>' });
B.settings = () => G.push(APP, { title: '豆瓣设置', html: () => `<label class="gys-f"><span>最多留多少个条目（标记过的、豆列里的不会被删）</span><input id="dbC_keep" type="number" min="100" value="${D.cfg.keep}"></label><div class="gys-acts"><button class="gys-btn" onclick="gysDb.saveCfg()">保存</button><button class="gys-btn ghost" onclick="GYS.uiPage('douban')">🍎 苹果外观</button></div>` });
B.saveCfg = () => { D.cfg.keep = Math.max(100, Number((document.getElementById('dbC_keep') || {}).value) || 400); trimItems(); saveD(); X.toast('💾 存好了', ''); G.back(APP); };
function trimItems() { const ids = Object.keys(D.items); const k = D.cfg.keep || 400; if (ids.length <= k) return; const used = new Set(); Object.values(D.marks).forEach(m => Object.keys(m).forEach(id => used.add(id))); D.lists.forEach(l => l.ids.forEach(id => used.add(id))); D.bc.forEach(b => b.ref && used.add(b.ref)); ids.sort((a, b) => D.items[a].at - D.items[b].at).filter(id => !used.has(id)).slice(0, ids.length - k).forEach(id => { delete D.items[id]; Object.keys(D.hot).forEach(t => { D.hot[t] = D.hot[t].filter(x => x !== id); }); }); }
B.export = () => {
    const L = []; ['me'].concat(G.chars().map(c => 'c:' + c.id)).forEach(w => { const ms = marksOf(w); if (!ms.length) return; L.push(`===== ${nameOf(w)} 的书影音 =====`); ms.forEach(m => { const it = itemOf(m.id); L.push(`[${K[it.kind][m.st]}] 《${it.title}》${m.star ? ' ' + '★'.repeat(m.star) : ''}${m.text ? '  ' + m.text : ''}`); }); L.push(''); });
    D.diaries.filter(d => d.by === 'me').forEach(d => L.push(`📔 ${d.title}（${new Date(d.at).toLocaleString()}）\n${d.body}\n`));
    D.lists.forEach(l => L.push(`📋 ${l.name}（${nameOf(l.by)}）：${l.ids.map(id => (itemOf(id) || {}).title).filter(Boolean).join('、')}`));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\n')], { type: 'text/plain' })); a.download = '豆瓣记录.txt'; a.click();
};

/* ---------------- TA 做的事 ---------------- */
async function taMark(c, req) {
    const w = 'c:' + c.id, kind = G.pick(['movie', 'movie', 'book', 'music']);
    const had = marksOf(w).map(m => itemOf(m.id).title).slice(0, 12).join('、');
    const o = X.json(await X.ask(P('db.mark', DEF_MARK, { 我是谁: X.who(c), 最近: X.recent(c, 10) || '（最近没怎么聊）', 类型: K[kind].n, 要求: (req || '') + (had ? `（你标记过：${had}，换一部）` : '') })));
    if (!o || !o.title) return null;
    const it = mkItem(o, kind); if (!it) return null;
    const st = ['want', 'doing', 'done'].includes(o.st) ? o.st : 'done';
    setMark(w, it.id, { st, star: st === 'want' ? 0 : Math.max(1, Math.min(5, +o.star || 4)), text: X.plain(o.text || '').slice(0, 350) });
    const b = bcAdd({ by: w, kind: 'mark', ref: it.id, text: X.plain(o.text || '').slice(0, 350) });
    return { it, b };
}
async function taLong(c) {
    const w = 'c:' + c.id; const m = marksOf(w).find(m => m.st === 'done' && !itemOf(m.id).longs.some(l => l.by === w)); if (!m) return null;
    const it = itemOf(m.id);
    const o = X.json(await X.ask(P('db.long', DEF_LONG, { 我是谁: X.who(c), 名字: it.title, 信息: [it.sub, it.year, it.meta].filter(Boolean).join(' / ') })));
    if (!o || !o.text) return null;
    const l = { id: G.uid('l'), by: w, star: Math.max(1, Math.min(5, +o.star || m.star || 4)), title: X.plain(o.title || '').slice(0, 30) || '一点想法', text: X.plain(o.text).slice(0, 5000), at: Date.now(), useful: [], uN: G.rnd(0, 80), cmts: [] };
    it.longs.unshift(l); bcAdd({ by: w, kind: 'long', ref: it.id, text: l.title }); saveD();
    return { it, l };
}
async function taGroup(c) {
    const g = D.groups.length ? G.pick(D.groups) : null; if (!g) return null;
    const o = X.json(await X.ask(`${X.who(c)}\n你在豆瓣小组「${g.name}」（${g.intro}）发一个帖子（豆瓣小组风，可以匿名一点，别点名她）。最近：\n${X.recent(c, 8)}\n只输出 JSON：{"title":"标题","body":"正文"}`));
    if (!o || !o.title) return null;
    const p = { id: G.uid('gp'), by: 'c:' + c.id, title: X.plain(o.title).slice(0, 40), body: X.plain(o.body || '').slice(0, 1500), at: Date.now(), last: Date.now(), replies: [], likes: [] }; g.posts.unshift(p); g.members['c:' + c.id] = Date.now(); saveD();
    genReplies(g, p, 3); return { g, p };
}
async function taList(c) {
    const w = 'c:' + c.id; const ms = marksOf(w).filter(m => m.st === 'done'); const mine = marksOf('me').filter(m => m.st === 'done');
    const pool = Array.from(new Set(ms.concat(mine).map(m => m.id))).slice(0, 12); if (pool.length < 2) return null;
    const o = X.json(await X.ask(`${X.who(c)}\n你在豆瓣上做一个「豆列」（自己整理的片单 / 书单），可以跟她有关（比如「想和她一起看的」「她推荐给我的」），从下面挑几个放进去，每个写一句你的话：\n${pool.map((id, i) => `${i}. 《${itemOf(id).title}》`).join('\n')}\n只输出 JSON：{"name":"豆列名","intro":"简介","pick":[{"i":序号,"note":"一句话"}]}`));
    if (!o || !o.name || !Array.isArray(o.pick)) return null;
    const l = { id: G.uid('dl'), by: w, name: X.plain(o.name).slice(0, 30), intro: X.plain(o.intro || '').slice(0, 200), ids: [], notes: {}, at: Date.now(), fans: G.rnd(0, 50) };
    o.pick.forEach(p => { const id = pool[+p.i]; if (id && !l.ids.includes(id)) { l.ids.push(id); l.notes[id] = X.plain(p.note || '').slice(0, 60); } });
    if (!l.ids.length) return null; D.lists.unshift(l); bcAdd({ by: w, kind: 'list', text: l.name, link: `gysDb.list('${l.id}')`, linkT: '📋 ' + l.name }); saveD();
    return l;
}

/* ---------------- 外壳 ---------------- */
const STYLE = '- 这是「豆瓣」：昵称多半文艺、冷淡或者无厘头，签名常是一句书里 / 电影里的话、一句丧丧的话或者干脆没有；loc 写常居城市；粉丝数一般不多';
function head(tab) {
    const t = { home: '豆瓣', sub: '书影音', group: '小组', me: '我的' }[tab];
    return `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('${APP}')">${G.ic('back', 22)}</span><b class="${tab === 'home' ? 'db-logo' : ''}">${t}</b><span class="gys-hr">${tab === 'home' ? '<span onclick="gysDb.say()">' + G.ic('compose', 22) + '</span>' : ''}</span></div>${tab === 'sub' ? `<div class="db-stabs">${[['movie', '电影'], ['book', '读书'], ['music', '音乐'], ['event', '同城']].map(([k, n]) => `<span class="${SK === k ? 'on' : ''}" onclick="gysDb.sk('${k}')">${n}</span>`).join('')}</div>` : ''}`;
}
G.app(APP, {
    tabs: [['home', 'i:home', '首页'], ['sub', 'i:film', '书影音'], ['group', 'i:people', '小组'], ['me', 'i:person', '我的']],
    head, render: t => t === 'sub' ? subTab() : t === 'group' ? groupTab() : t === 'me' ? profHtml('me') : home(),
    onOpen: () => { if (!(D.hot.movie || []).length) genHot('movie'); const L = cast().filter(w => !G.prof(APP, w).gen); if (L.length) G.genProfiles(APP, L.slice(0, 8), STYLE).then(() => G.repaint(APP)); }
});
/* ---------------- 📅 打卡日历 + 🎞️ 年度总结 ---------------- */
const dayKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
function markDays() { const by = {}; marksOf('me').forEach(m => { if (!m.at) return; (by[dayKey(new Date(m.at))] = by[dayKey(new Date(m.at))] || []).push(m); }); return by; }
function markStreak() { const by = markDays(); let n = 0, i = 0; const key = k => { const d = new Date(); d.setDate(d.getDate() - k); return dayKey(d); }; if (!by[key(0)]) i = 1; for (; ; i++) { if (by[key(i)]) n++; else break; } return n; }
B.calendar = () => { G.push(APP, { title: '打卡日历', cls: 'db-calb', html: () => { const by = markDays(); const now = new Date(), Y = now.getFullYear(), M = now.getMonth(); const first = new Date(Y, M, 1).getDay(), days = new Date(Y, M + 1, 0).getDate(), td = now.getDate(); let cells = ''; for (let i = 0; i < first; i++) cells += '<i></i>'; for (let d = 1; d <= days; d++) { const k = Y + '-' + (M + 1) + '-' + d, n = (by[k] || []).length; cells += `<i class="${n ? 'on' : ''}${d === td ? ' td' : ''}" title="${n ? n + ' 条' : ''}">${d}${n ? '<u></u>' : ''}</i>`; } const monN = marksOf('me').filter(m => { const x = new Date(m.at); return x.getFullYear() === Y && x.getMonth() === M; }).length; return `<div class="db-cal"><div class="db-calhead"><b>🔥 连续打卡 ${markStreak()} 天</b><em>${Y} 年 ${M + 1} 月 · 标记了 ${monN} 条</em></div><div class="db-calwk">${'日一二三四五六'.split('').map(d => `<span>${d}</span>`).join('')}</div><div class="db-calgrid">${cells}</div><p class="db-caltip">在书影音里标「想看 / 看过」就会记上今天。绿点＝那天标过。</p></div>`; } }); };
B.yearly = () => { const y = new Date().getFullYear(); const mk = marksOf('me').filter(m => new Date(m.at).getFullYear() === y && m.st !== 'want'); const byK = {}; Object.keys(K).forEach(k => byK[k] = mk.filter(m => (itemOf(m.id) || {}).kind === k).length); const stars = [0, 0, 0, 0, 0, 0]; mk.forEach(m => { if (m.star >= 1 && m.star <= 5) stars[m.star]++; }); const smx = Math.max(1, ...stars); const top = mk.filter(m => m.star === 5).map(m => itemOf(m.id)).filter(Boolean).slice(0, 8); const chs = G.chars ? G.chars() : []; const taN = mk.filter(m => chs.some(c => (D.marks['c:' + c.id] || {})[m.id])).length;
    G.push(APP, { title: y + ' 年度总结', cls: 'db-yrb', html: () => `<div class="db-yr"><div class="db-yrhead"><em>我的豆瓣</em><h1>${y} 年度总结</h1></div><div class="db-yrbig"><b>${mk.length}</b><span>部作品标记为看过 / 读过 / 听过</span></div><div class="db-yrk">${Object.keys(K).map(k => `<div><b>${byK[k]}</b><em>${K[k].n}</em></div>`).join('')}</div><div class="db-sech">我打的分</div><div class="db-yrstars">${[5, 4, 3, 2, 1].map(s => `<div><span>${'★'.repeat(s)}</span><u style="width:${Math.round(stars[s] / smx * 100)}%"></u><em>${stars[s]}</em></div>`).join('')}</div>${top.length ? `<div class="db-sech">今年的五星</div><div class="db-strip">${top.map(it => `<div onclick="gysDb.item('${it.id}')">${cover(it)}<b>${esc(it.title)}</b></div>`).join('')}</div>` : ''}${taN ? `<p class="db-yrline">有 ${taN} 部，你和 TA 都标记过 💗</p>` : ''}</div>` }); };

window.gysDoubanOpen = tab => G.open(APP, tab);
window.gysDoubanOpenItem = id => { G.open(APP, 'sub'); B.item(id); };
window.gysDoubanOpenPost = (gid, pid) => { G.open(APP, 'group'); B.post(gid, pid); };
window.gysDoubanOpenList = id => { G.open(APP, 'me'); B.list(id); };

/* ---------------- 谷雨这边 ---------------- */
X.mini({ id: 'gysDouban', icon: '🫘', title: '豆瓣', desc: '书影音标记、小组、广播、日记、豆列、同城；TA 也标记、写影评', cat: '软件', onOpen: () => G.open(APP) }, 'gysDouban');
const rare = (c, k, h) => Date.now() - ((D.last[k + c.id]) || 0) > h * 3600e3;
const mark = (c, k) => { D.last[k + c.id] = Date.now(); saveD(); };
X.action({ key: 'gys_db_mark', label: '在豆瓣上标记一部电影 / 书 / 音乐', hint: '打星、写短评', need: c => rare(c, 'm', 20), run: async c => { mark(c, 'm'); const r = await taMark(c); if (!r) return null; const m = markOf('c:' + c.id, r.it.id); G.notify(APP, c, `🫘 <b>${X.esc(c.name)}</b> 在豆瓣${K[r.it.kind][m.st]}《${X.esc(r.it.title)}》`, m.text || '', X.go('gysDoubanOpenItem', r.it.id)); return { text: `在豆瓣${K[r.it.kind][m.st]}《${r.it.title}》`, selfNotified: true }; } }, 'gysDouban');
X.action({ key: 'gys_db_long', label: '在豆瓣写一篇影评 / 书评', hint: '看过的东西写长一点的感想', need: c => rare(c, 'l', 96) && marksOf('c:' + c.id).some(m => m.st === 'done' && !itemOf(m.id).longs.some(l => l.by === 'c:' + c.id)), run: async c => { mark(c, 'l'); const r = await taLong(c); if (!r) return null; G.notify(APP, c, `🫘 <b>${X.esc(c.name)}</b> 写了一篇《${X.esc(r.it.title)}》的评论`, r.l.title, X.go('gysDoubanOpenItem', r.it.id)); return { text: `给《${r.it.title}》写了长评`, selfNotified: true }; } }, 'gysDouban');
X.action({ key: 'gys_db_group', label: '在豆瓣小组发个帖', hint: '求助、吐槽、分享，小组里没人知道是你', need: c => D.groups.length > 0 && rare(c, 'g', 48), run: async c => { mark(c, 'g'); const r = await taGroup(c); return r ? { text: `在豆瓣小组「${r.g.name}」发了帖：${r.p.title}`, selfNotified: true, secret: true } : null; } }, 'gysDouban');
X.action({ key: 'gys_db_list', label: '在豆瓣做一个豆列', hint: '整理片单 / 书单，可能跟她有关', need: c => rare(c, 'dl', 120) && marksOf('c:' + c.id).length + marksOf('me').length >= 2, run: async c => { mark(c, 'dl'); const l = await taList(c); if (!l) return null; G.notify(APP, c, `🫘 <b>${X.esc(c.name)}</b> 做了一个豆列「${X.esc(l.name)}」`, l.intro || '', X.go('gysDoubanOpenList', l.id)); return { text: '做了一个豆列：' + l.name, selfNotified: true }; } }, 'gysDouban');
X.action({ key: 'gys_db_cmt', label: '回应她在豆瓣上的广播 / 日记', hint: '她标记了什么、写了什么，你去说一句', need: c => D.bc.some(b => b.by === 'me' && Date.now() - b.at < 3 * 86400e3 && !b.cmts.some(k => k.by === 'c:' + c.id)), run: async c => { const b = D.bc.find(b => b.by === 'me' && !b.cmts.some(k => k.by === 'c:' + c.id)); if (!b) return null; const it = b.ref && itemOf(b.ref); const t = X.plain(await X.ask(`${X.who(c)}\n${X.me(c)}在豆瓣广播里${it ? '标记了《' + it.title + '》' : ''}${b.text ? '说：「' + b.text + '」' : ''}。你去回应一句（公开的，友邻都看得到）。只写回应。`) || ''); if (!t) return null; b.cmts.push({ id: G.uid('c'), by: 'c:' + c.id, text: t.slice(0, 200), at: Date.now() }); if (!b.likes.includes('c:' + c.id)) b.likes.push('c:' + c.id); saveD(); G.notify(APP, c, `🫘 <b>${X.esc(c.name)}</b> 回应了你的豆瓣广播`, t, X.go('gysDoubanOpen', 'home')); return { text: '回应了她的豆瓣广播', selfNotified: true }; } }, 'gysDouban');
X.today(() => { const d = X.day(); const L = D.bc.filter(b => X.day(new Date(b.at)) === d && (b.by === 'me' || charOfW(b.by))); if (!L.length) return null; return { title: '🫘 豆瓣', rows: L.slice(0, 3).map(b => { const it = b.ref && itemOf(b.ref); return { t: nameOf(b.by), x: it ? `${K[it.kind][(markOf(b.by, it.id) || {}).st || 'done']}《${it.title}》` : b.text.slice(0, 30), go: it ? X.go('gysDoubanOpenItem', it.id) : X.go('gysDoubanOpen', 'home') }; }) }; }, 'gysDouban');
X.widget('gysDbW', { n: '豆瓣', sizes: ['m'], tap: () => G.open(APP), r: () => { const L = D.bc.filter(b => b.ref && (b.by === 'me' || charOfW(b.by))).slice(0, 3); return `<div style="padding:10px;font-size:12px;line-height:1.7"><b style="color:#2e963d">🫘 豆瓣</b><br>${L.map(b => `${esc(nameOf(b.by))}：${esc((itemOf(b.ref) || {}).title || '')}`).join('<br>') || '标记一部电影吧'}</div>`; } }, 'gysDouban');
X.mem({ k: 'gysDb', ico: '🫘', n: 'TA 的豆瓣', d: 'TA 标记过的书影音和短评（改了就是改短评，删了就是删标记）', items: c => marksOf('c:' + c.id).map(m => Object.assign(m, { w: 'c:' + c.id })), text: m => m.text || '', edit: (m, v) => { setMark(m.w, m.id, { text: String(v).slice(0, 350) }); }, del: (c, i) => { const L = marksOf('c:' + c.id); const m = L[i]; if (m) setMark('c:' + c.id, m.id, null); }, meta: m => '《' + itemOf(m.id).title + '》' + K[itemOf(m.id).kind][m.st] + (m.star ? ' ' + '★'.repeat(m.star) : '') + ' · ' + G.ago(m.at), save: () => saveD() }, 'gysDouban');
X.ctx(id => {
    const c = X.char(id); if (!c) return ''; const w = 'c:' + c.id, L = [];
    marksOf(w).sort((a, b) => b.at - a.at).slice(0, 3).forEach(m => { const it = itemOf(m.id); L.push(`你${K[it.kind][m.st]}《${it.title}》${m.star ? '（' + m.star + '星）' : ''}`); });
    marksOf('me').sort((a, b) => b.at - a.at).slice(0, 3).forEach(m => { const it = itemOf(m.id); L.push(`她${K[it.kind][m.st]}《${it.title}》${m.text ? '：' + m.text.slice(0, 30) : ''}`); });
    const l = D.lists.find(l => l.by === w); if (l) L.push(`你做过豆列「${l.name}」`);
    return L.length ? `【豆瓣】${L.join('；')}` : '';
}, 'gysDouban');
X.inj('gysDouban', [['豆瓣', '豆瓣：TA 和她最近标记的书影音、TA 的豆列', '让 TA 知道你们最近在看什么、读什么、听什么']]);

X.css('gys-douban-css', `
.db-cal{padding:16px}.db-calhead{text-align:center;margin-bottom:14px}.db-calhead b{font-size:18px;color:#2e963d}.db-calhead em{display:block;font-style:normal;color:#999;font-size:13px;margin-top:4px}
.db-calwk{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;color:#999;font-size:12px;margin-bottom:6px}
.db-calgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.db-calgrid i{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:13px;font-style:normal;border-radius:8px;color:#444}body.dark-theme .db-calgrid i{color:#bbb}
.db-calgrid i.on{background:rgba(46,150,61,.14);color:#2e963d;font-weight:600}.db-calgrid i.td{outline:1.5px solid #2e963d}.db-calgrid i u{position:absolute;bottom:3px;width:4px;height:4px;border-radius:50%;background:#2e963d}
.db-caltip{color:#999;font-size:12.5px;margin-top:14px;line-height:1.6}
.db-yr{padding:18px 16px;text-align:center}.db-yrhead em{color:#2e963d;font-style:normal;font-size:14px}.db-yrhead h1{font-size:28px;margin:4px 0 16px}
.db-yrbig{background:linear-gradient(135deg,#2e963d,#59c06a);color:#fff;border-radius:16px;padding:20px;margin-bottom:14px}.db-yrbig b{font-size:40px;display:block}.db-yrbig span{font-size:13px;opacity:.9}
.db-yrk{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.db-yrk>div{background:#fff;border-radius:12px;padding:12px 4px}body.dark-theme .db-yrk>div{background:#17191a}.db-yrk b{display:block;font-size:20px;color:#2e963d}.db-yrk em{font-style:normal;font-size:11.5px;color:#999}
.db-yrstars{padding:0 4px}.db-yrstars>div{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:12px}.db-yrstars span{color:#f90;width:62px;text-align:left}.db-yrstars u{flex:1;height:8px;background:#2e963d;border-radius:4px;min-width:2px}.db-yrstars em{font-style:normal;color:#999;width:28px;text-align:right}
.db-yrline{color:#555;font-size:14px;margin-top:14px}body.dark-theme .db-yrline{color:#bbb}
.gys-douban{--gys-accent:#2e963d;background:#f5f5f5}
body.dark-theme .gys-douban{background:#0d0f0d}
.gys-douban .gys-hd,.gys-douban .gys-tabs{background:#fff}body.dark-theme .gys-douban .gys-hd,body.dark-theme .gys-douban .gys-tabs{background:#141714}
.gys-douban .gys-tb.on{color:#2e963d}
.db-logo{color:#2e963d;font-family:"Songti SC","STSong",serif;font-weight:800}
.db-stabs{display:flex;gap:24px;padding:10px 16px;background:#fff;font-size:15px;color:#999;flex-shrink:0;border-bottom:.5px solid #eee}body.dark-theme .db-stabs{background:#141714;border-color:#222}.db-stabs span{cursor:pointer;padding-bottom:4px}.db-stabs span.on{color:#2e963d;font-weight:700;box-shadow:inset 0 -2px 0 #2e963d}
.db-say{display:flex;align-items:center;gap:10px;background:#fff;margin:8px 0;padding:10px 14px;color:#999;cursor:pointer}body.dark-theme .db-say{background:#141714}
.db-sech{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 8px;font-size:15px;font-weight:600}.db-sech a{font-weight:400;font-size:12.5px;color:#2e963d;cursor:pointer}
.db-strip{display:flex;gap:10px;overflow-x:auto;padding:0 16px 10px;scrollbar-width:none}.db-strip>div{flex:0 0 90px;cursor:pointer}.db-strip b{display:block;font-size:12.5px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px}.db-strip em{font-style:normal;font-size:11px;color:#e09015}
.db-cv{display:inline-flex;width:64px;height:90px;border-radius:4px;background-size:cover;background-position:center;flex-shrink:0;flex-direction:column;align-items:center;justify-content:center;gap:4px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.15)}.db-strip .db-cv{width:90px;height:126px}.db-cv.t b{font-size:24px}.db-cv.t em{font-style:normal;font-size:10.5px;color:#fff;text-align:center;padding:0 4px;line-height:1.3;max-height:2.6em;overflow:hidden}.db-cv.big{width:110px;height:154px}.db-cv.big.t b{font-size:36px}.db-cv.big.t em{font-size:13px}
.db-st{color:#ddd;letter-spacing:-1px;font-size:13px}.db-st i{font-style:normal}.db-st i.on{color:#ffac2d}.db-st i.half{background:linear-gradient(90deg,#ffac2d 50%,#ddd 50%);-webkit-background-clip:text;color:transparent}.db-st.s{font-size:11px}
.db-row{display:flex;gap:12px;padding:12px 16px;background:#fff;border-bottom:.5px solid #f0f0f0;cursor:pointer;align-items:flex-start}body.dark-theme .db-row{background:#141714;border-color:#222}.db-row>div{flex:1;min-width:0}.db-row b{font-size:15px;font-weight:600}.db-row b i{font-style:normal;color:#999;font-weight:400;font-size:13px}.db-row small{display:block;font-size:12px;color:#888;margin-top:4px;line-height:1.5}
.db-sc{display:flex;align-items:center;gap:4px;margin-top:4px}.db-sc em{font-style:normal;font-size:12px;color:#e09015}
.db-mk{font-size:11.5px;color:#2e963d;border:1px solid #2e963d;border-radius:4px;padding:1px 6px;white-space:nowrap}
.db-ln{font-size:12.5px;color:#666;margin:4px 0 0;line-height:1.5}
.db-sbox{display:flex;gap:8px;margin:10px 16px;align-items:center}.db-sbox input{flex:1;min-width:0;border:none;background:#fff;border-radius:6px;padding:9px 12px;font-size:14px;color:inherit;outline:none}body.dark-theme .db-sbox input{background:#1c201c}.db-sbox span{color:#2e963d;cursor:pointer}
.db-bc{display:flex;gap:10px;padding:12px 16px;background:#fff;border-bottom:.5px solid #f0f0f0}body.dark-theme .db-bc{background:#141714;border-color:#222}.db-bcb{flex:1;min-width:0}
.db-bch{font-size:13.5px;color:#666}.db-bch b{color:#2e963d;font-weight:500;cursor:pointer}.db-bch em{font-style:normal;float:right;font-size:11.5px;color:#aaa}
.db-bct{font-size:15px;line-height:1.6;margin:6px 0;white-space:pre-wrap}
.db-bcref{display:flex;gap:10px;align-items:center;background:#f7f7f7;border-radius:6px;padding:8px;margin:6px 0;cursor:pointer}body.dark-theme .db-bcref{background:#1c201c}.db-bcref .db-cv{width:40px;height:56px}.db-bcref .db-cv.t em{display:none}.db-bcref b{font-size:14px}.db-bcref small{display:block;font-size:12px;color:#999}
.db-bcrs{background:#f7f7f7;border-radius:6px;padding:8px;font-size:13.5px;margin:6px 0}body.dark-theme .db-bcrs{background:#1c201c}
.db-bca{display:flex;gap:22px;font-size:12.5px;color:#888;margin-top:6px}.db-bca span{cursor:pointer}.db-bca span.on{color:#2e963d}
.db-bccm{margin-top:8px;font-size:13px;line-height:1.7;background:#fafafa;border-radius:6px;padding:6px 10px}body.dark-theme .db-bccm{background:#1c201c}.db-bccm b{color:#2e963d;font-weight:500}
.db-itb{background:#fff}body.dark-theme .db-itb{background:#141714}
.db-ith{display:flex;gap:14px;padding:16px;background:linear-gradient(#f4f1ea,#fff)}body.dark-theme .db-ith{background:linear-gradient(#1f241f,#141714)}.db-ithc{cursor:pointer}.db-ithi{flex:1;min-width:0}.db-ithi h3{margin:0 0 6px;font-size:19px}.db-ithi h3 i{font-style:normal;font-weight:400;color:#999;font-size:15px}.db-ithi p{margin:3px 0;font-size:12.5px;color:#666;line-height:1.5}.db-wtag{color:#2e963d!important}
.db-score{display:flex;gap:16px;align-items:center;padding:12px 16px;margin:0 16px;background:#f7f7f7;border-radius:8px}body.dark-theme .db-score{background:#1c201c}.db-score>div:first-child{display:flex;flex-direction:column;align-items:center;min-width:90px}.db-score b{font-size:30px;color:#1f1f1f;font-weight:700}body.dark-theme .db-score b{color:#eee}.db-score em{font-style:normal;font-size:11px;color:#999}
.db-dist{flex:1}.db-dist div{display:flex;align-items:center;gap:6px;font-size:11px;color:#999;height:15px}.db-dist span{width:22px}.db-dist i{flex:1;height:6px;background:#eee;border-radius:3px;overflow:hidden}.db-dist u{display:block;height:100%;background:#ffac2d}.db-dist em{width:36px}
.db-mkbar{display:flex;gap:8px;padding:14px 16px}.db-mbtn{flex:1;text-align:center;border:1px solid #2e963d;color:#2e963d;border-radius:6px;padding:8px 0;font-size:14px;cursor:pointer}
.db-mymk{flex:1;background:#eef7ef;border-radius:6px;padding:10px 12px;font-size:14px;color:#2e963d;cursor:pointer}body.dark-theme .db-mymk{background:#1d2b1f}.db-mymk em{display:block;font-style:normal;font-size:12px;color:#666;margin-top:4px}
.db-itops{display:flex;gap:16px;flex-wrap:wrap;padding:0 16px 8px;font-size:13px}.db-itops a{color:#2e963d;cursor:pointer}
.db-intro{padding:0 16px;font-size:14px;line-height:1.75;color:#444;white-space:pre-wrap}body.dark-theme .db-intro{color:#ccc}
.db-fr{display:flex;align-items:center;gap:8px;padding:6px 16px;font-size:13px;cursor:pointer;flex-wrap:wrap}.db-fr b{font-weight:500}.db-fr em{font-style:normal;color:#888;font-size:12.5px;flex-basis:100%;padding-left:36px}
.db-itabs{display:flex;gap:22px;padding:12px 16px;border-bottom:.5px solid #eee;font-size:14px;color:#999;position:sticky;top:0;background:inherit;z-index:1}body.dark-theme .db-itabs{border-color:#222}.db-itabs span{cursor:pointer}.db-itabs span.on{color:#1f1f1f;font-weight:700}body.dark-theme .db-itabs span.on{color:#fff}
.db-short{padding:12px 16px;border-bottom:.5px solid #f2f2f2}body.dark-theme .db-short{border-color:#222}.db-sh{display:flex;align-items:center;gap:6px;font-size:13px;flex-wrap:wrap}.db-sh b{font-weight:500;color:#2e963d;cursor:pointer}.db-sh i{font-style:normal;font-size:11px;color:#999}.db-sh em{font-style:normal;font-size:11.5px;color:#aaa;margin-left:auto}.db-short p{font-size:14.5px;line-height:1.65;margin:6px 0}.db-use{font-size:12px;color:#999;cursor:pointer}.db-use.on{color:#2e963d}
.db-long{padding:12px 16px;border-bottom:.5px solid #f2f2f2;cursor:pointer}body.dark-theme .db-long{border-color:#222}.db-long h4{margin:6px 0 4px;font-size:16px}.db-long p{font-size:13.5px;color:#666;line-height:1.6;margin:0}.db-long a{color:#2e963d}.db-long small{font-size:11.5px;color:#aaa}
.db-mkp{padding:6px 0}.db-mkp h4{padding:0 16px;margin:10px 0}
.db-mst{display:flex;gap:8px;padding:0 16px}.db-mst span{flex:1;text-align:center;border:1px solid #ddd;border-radius:6px;padding:8px 0;cursor:pointer;font-size:14px}.db-mst span.on{border-color:#2e963d;background:#2e963d;color:#fff}
.db-pick{display:flex;align-items:center;gap:6px;padding:14px 16px}.db-pick i{font-style:normal;font-size:32px;color:#ddd;cursor:pointer}.db-pick i.on{color:#ffac2d}.db-pick em{font-style:normal;font-size:13px;color:#999;margin-left:8px}
.db-art{background:#fff;padding:16px;min-height:100%}body.dark-theme .db-art{background:#141714}.db-art h3{margin:0 0 10px;font-size:20px;line-height:1.4}.db-artt{font-size:15.5px;line-height:1.9;margin:14px 0;white-space:pre-wrap;word-break:break-word}
.db-reply{display:flex;gap:10px;padding:12px 0;border-bottom:.5px solid #f2f2f2}body.dark-theme .db-reply{border-color:#222}.db-reply>div{flex:1;min-width:0}.db-reply b{font-size:13.5px;font-weight:500;color:#2e963d;cursor:pointer}.db-reply p{font-size:14.5px;line-height:1.65;margin:4px 0}.db-reply a{font-size:12px;color:#999;cursor:pointer}
.db-rh{display:flex;gap:6px;align-items:center}.db-rh em{font-style:normal;font-size:11.5px;color:#aaa;margin-left:auto}.db-lz{font-style:normal;font-size:10px;color:#fff;background:#2e963d;border-radius:3px;padding:0 4px}
.db-quote{background:#f5f5f5;border-left:3px solid #ccc;padding:5px 8px;font-size:12.5px;color:#777;margin:4px 0}body.dark-theme .db-quote{background:#1c201c}
.db-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 12px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));background:#fff;border-top:.5px solid #eee}body.dark-theme .db-bar{background:#141714;border-color:#222}.db-bar small{flex-basis:100%;font-size:12px;color:#2e963d;cursor:pointer}.db-bar input{flex:1;min-width:0;border:none;background:#f5f5f5;border-radius:6px;padding:9px 12px;font-size:14px;color:inherit;outline:none}body.dark-theme .db-bar input{background:#1c201c}.db-bar span{color:#fff;background:#2e963d;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:14px}
.db-gstrip{display:flex;gap:14px;overflow-x:auto;padding:4px 16px 10px}.db-gstrip>div{flex:0 0 70px;text-align:center;cursor:pointer}.db-gstrip b{display:block;font-size:12px;font-weight:500;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.db-gstrip>em{font-style:normal;font-size:13px;color:#999}
.db-gico{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:10px;background:#eef7ef center/cover;font-size:26px;flex-shrink:0}.db-gico.big{width:72px;height:72px;font-size:36px;cursor:pointer}body.dark-theme .db-gico{background-color:#1d2b1f}
.db-grow{display:flex;gap:12px;align-items:center;padding:12px 16px;background:#fff;border-bottom:.5px solid #f0f0f0;cursor:pointer}body.dark-theme .db-grow{background:#141714;border-color:#222}.db-grow>div{flex:1;min-width:0}.db-grow b{font-size:15px}.db-grow em{display:block;font-style:normal;font-size:12.5px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.db-grow small{font-size:11.5px;color:#aaa}.db-jbtn{color:#2e963d;border:1px solid #2e963d;border-radius:4px;padding:3px 10px;font-size:12.5px}
.db-prow{display:flex;gap:10px;align-items:center;padding:12px 16px;background:#fff;border-bottom:.5px solid #f0f0f0;cursor:pointer}body.dark-theme .db-prow{background:#141714;border-color:#222}.db-prow>div{flex:1;min-width:0}.db-prow b{font-size:15px;font-weight:500;line-height:1.45}.db-prow small{display:block;font-size:12px;color:#999;margin-top:3px}.db-prow>span{font-size:12px;color:#fff;background:#bbb;border-radius:999px;padding:0 7px;min-width:12px;text-align:center}
.db-top,.db-el{font-style:normal;font-size:10.5px;color:#fff;border-radius:3px;padding:0 4px;margin-right:4px;vertical-align:2px}.db-top{background:#e45c5c}.db-el{background:#ffac2d}
.db-gh{display:flex;gap:14px;align-items:center;padding:16px;background:#fff}body.dark-theme .db-gh{background:#141714}.db-gh h3{margin:0;font-size:19px}.db-gh p{margin:4px 0;font-size:13px;color:#666}.db-gh small{font-size:12px;color:#999}
.db-gb,.db-pb{background:#f5f5f5}body.dark-theme .db-gb,body.dark-theme .db-pb{background:#0d0f0d}
.db-ev{display:flex;gap:12px;padding:14px 16px;background:#fff;border-bottom:.5px solid #f0f0f0}body.dark-theme .db-ev{background:#141714;border-color:#222}.db-evk{width:50px;height:50px;border-radius:8px;background:#eef7ef;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}.db-ev>div{flex:1;min-width:0}.db-ev b{font-size:15px}.db-ev small{display:block;font-size:12px;color:#2e963d;margin:3px 0}.db-ev p{margin:0;font-size:13px;color:#666;line-height:1.5}.db-evb{display:flex;gap:16px;margin-top:8px;font-size:13px}.db-evb span{color:#888;cursor:pointer}.db-evb span.on{color:#ffac2d}
.db-lh{background:#fff;padding:16px}body.dark-theme .db-lh{background:#141714}.db-lh h3{margin:0 0 6px}.db-lh p{margin:4px 0;font-size:13px;color:#666}.db-lh a{font-size:13px;color:#2e963d;cursor:pointer}
.db-pf{background:#fff;min-height:100%}body.dark-theme .db-pf{background:#141714}
.db-pfh{height:110px;background:linear-gradient(135deg,#9ccf9f,#2e963d) center/cover}
.db-pfi{display:flex;gap:12px;align-items:flex-end;padding:0 16px;margin-top:-30px}.db-pfi .gys-av{border:3px solid #fff}.db-pfi h3{margin:0;font-size:19px}.db-pfi small{font-size:12px;color:#999}
.db-pfbio{padding:10px 16px 4px;font-size:14px;color:#555;line-height:1.6;white-space:pre-wrap}body.dark-theme .db-pfbio{color:#bbb}
.db-pftags{display:flex;flex-wrap:wrap;gap:6px;padding:4px 16px}.db-pftags span{font-size:12px;background:#f2f2f2;border-radius:4px;padding:2px 8px;color:#666}
.db-pfops{display:flex;gap:8px;padding:8px 16px}
.db-cnt{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#eee;margin:8px 16px;border-radius:8px;overflow:hidden}body.dark-theme .db-cnt{background:#222}.db-cnt span{background:#fff;display:flex;flex-direction:column;align-items:center;padding:10px 0;font-size:12px;color:#888;cursor:pointer}body.dark-theme .db-cnt span{background:#141714}.db-cnt b{font-size:17px;color:#1f1f1f}body.dark-theme .db-cnt b{color:#eee}
.db-menu{margin-top:8px}.db-menu div{padding:14px 16px;border-top:.5px solid #f2f2f2;font-size:15px;cursor:pointer}body.dark-theme .db-menu div{border-color:#222}.db-menu em{float:right;font-style:normal;color:#aaa;font-size:13px}
.db-sheet{position:fixed;inset:0;z-index:99980;background:rgba(0,0,0,.35);display:flex;align-items:flex-end}.db-sheet-in{width:100%;background:#fff;border-radius:14px 14px 0 0;padding-bottom:env(safe-area-inset-bottom,0px);max-height:70vh;overflow-y:auto}body.dark-theme .db-sheet-in{background:#1c1c1e;color:#eee}
.db-sheet-in p{margin:0;padding:12px;text-align:center;font-size:13px;color:#999}.db-sheet-in div{padding:15px;text-align:center;border-bottom:.5px solid #f2f2f2;font-size:16px;cursor:pointer}.db-sheet-in div.c{color:#999;border-top:6px solid #f5f5f5}
`);
(async () => {
    await G.ready(); D = Object.assign(D, await ST.get('d', {}) || {});
    ['groups', 'bc', 'diaries', 'lists', 'events'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; });
    ['items', 'srch', 'marks', 'xacc', 'last', 'hotAt'].forEach(k => { if (!D[k] || typeof D[k] !== 'object') D[k] = {}; });
    D.hot = Object.assign({ movie: [], book: [], music: [] }, D.hot || {}); D.cfg = Object.assign({ keep: 400 }, D.cfg || {});
})();
window.gysDbState = () => D;
