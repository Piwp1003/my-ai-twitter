/* 🎵 网易云音乐：照着网易云做的整页音乐软件——每日推荐、私人 FM（漫游）、笔记、歌单、排行榜、黑胶播放页、热评区（楼中楼）、笔记、听歌排行、一起听；能放的歌走「音乐盒」（你上传 / 填直链的那些），TA 写给你的歌、共享歌单、深夜电台都接在里面 */
if (window.__gysMusic) return; window.__gysMusic = 1;
const G = window.GYS, APP = 'music', esc = G.esc;
X.feat('gysMusic', { n: '🎵 网易云音乐', desc: '网易云：每日推荐、私人 FM、歌单、排行榜、黑胶播放页、热评、笔记、听歌排行、一起听；能放的歌用音乐盒里的；TA 也会分享歌、写热评、给你做歌单' });
const ST = X.store('gysmusic');
let D = { songs: {}, likes: {}, lists: [], plays: {}, hist: [], rank: {}, daily: null, posts: [], now: {}, fm: [], cfg: { keep: 300 }, last: {}, seq: 1 };
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();
const M = window.gysMu = {};
const BUSY = {};
const P = (id, def, vars) => X.pl(id, def, vars);
const nameOf = w => G.nick(APP, w);
const meW = 'me';
const charW = c => 'c:' + c.id;
const cast = () => G.chars().map(c => 'c:' + c.id);

/* ---------------- 歌 ---------------- */
// 一首歌：{ id, t 歌名, a 歌手, al 专辑, bid 音乐盒里的那首（能真放）, ta 'c:id'（TA 原创，接「TA写给你的歌」）, sgid, cmts, cmtGen, likeN, cmtN, at }
const songOf = id => D.songs[id];
const keyOf = (t, a) => 'k' + String(t || '').replace(/[《》「」"'“”\s]/g, '').toLowerCase() + '|' + String(a || '').replace(/\s/g, '').toLowerCase();
function mkSong(o) {
    const t = X.plain(o.t || o.title || '').replace(/[《》]/g, '').slice(0, 40); if (!t) return null;
    const a = X.plain(o.a || o.artist || '').slice(0, 30);
    const k = keyOf(t, a); const hit = Object.values(D.songs).find(s => keyOf(s.t, s.a) === k);
    if (hit) { if (o.bid && !hit.bid) hit.bid = o.bid; if (o.al && !hit.al) hit.al = X.plain(o.al).slice(0, 30); return hit; }
    const s = { id: 's' + (D.seq++).toString(36) + Date.now().toString(36).slice(-3), t, a, al: X.plain(o.al || '').slice(0, 30), bid: o.bid || '', ta: o.ta || '', sgid: o.sgid || '', cmts: [], cmtGen: 0, likeN: o.likeN || G.rnd(200, 90000), cmtN: o.cmtN || 0, at: Date.now(), tag: X.plain(o.tag || '').slice(0, 10) };
    D.songs[s.id] = s; saveD(); return s;
}
// 音乐盒里的歌（能真放）
const box = () => { try { return window.gymState ? window.gymState() : null; } catch (e) { return null; } };
function syncBox() {
    const B = box(); if (!B || !Array.isArray(B.tracks)) return [];
    return B.tracks.map(tr => mkSong({ t: tr.title || '未命名', a: tr.artist || '', bid: tr.id })).filter(Boolean);
}
const playable = s => !!(s && (s.bid && box() && box().tracks.some(x => x.id === s.bid)));
const coverBg = s => { let h = 0; for (const ch of String((s && (s.al || s.t)) || 'x')) h = (h * 31 + ch.charCodeAt(0)) % 360; return `linear-gradient(135deg,hsl(${h},48%,52%),hsl(${(h + 50) % 360},55%,34%))`; };
const coverImg = s => { try { const B = box(); const tr = s && s.bid && B && B.tracks.find(x => x.id === s.bid); return tr && tr.cover ? tr.cover : ''; } catch (e) { return ''; } };
const cover = (s, sz, r) => { const im = coverImg(s); return `<span class="mu-cv" style="width:${sz}px;height:${sz}px;border-radius:${r == null ? 8 : r}px;${im ? `background-image:url('${im}')` : `background:${coverBg(s)}`}">${im ? '' : `<i style="font-size:${Math.round(sz * 0.42)}px">${s && s.ta ? '✍️' : '♪'}</i>`}</span>`; };
const liked = (w, id) => (D.likes[w] || []).includes(id);
const plays = (w, id) => ((D.plays[w] || {})[id]) || 0;
function addPlay(w, s) { D.plays[w] = D.plays[w] || {}; D.plays[w][s.id] = (D.plays[w][s.id] || 0) + 1; if (w === meW) { D.hist.unshift({ id: s.id, at: Date.now() }); const k = Math.max(50, Number(D.cfg.keep) || 300); if (D.hist.length > k) D.hist.length = k; } saveD(); }
// 正在一起听的角色（音乐盒的一起听）
const listening = () => { try { const B = box(); return ((B && B.listen && B.listen.chars) || []).map(String); } catch (e) { return []; } };

/* ---------------- 提示词 ---------------- */
const DEF_DAILY = `你在给网易云音乐写「每日推荐」。用户：{{我}}
她最近在听 / 喜欢的：
{{听过}}
她身边的人（他们的口味可以影响推荐）：
{{人}}
推荐 {{条数}} 首歌（真实存在的歌和歌手都行，华语为主，也可以有欧美日韩；别全是最火的那几首，要像算法真的懂她）。每首写一句推荐理由（网易云那种：「根据你喜欢的 XX 推荐」「你可能会喜欢的冷门好歌」「和 TA 一起听过的风格」）。不要写歌词。
只输出 JSON 数组：[{"t":"歌名","a":"歌手","al":"专辑（可空）","why":"推荐理由"}]`;
const DEF_CMT = `网易云音乐，歌曲《{{歌名}}》- {{歌手}} 的评论区。
已有的评论：
{{已有}}
会出现在这里的人：
{{人}}
写 {{条数}} 条新评论：大多是网友（网易云评论区那种：有故事的、伤感的「网抑云」、玩梗的、考古「2026 年还有人在听吗」、乐理分析、说想起某个人……），偶尔有上面认识的人（按各自性格，认识的人不一定每次都出现）。可以有一两条是回复别人的。不要引用或改写真实歌词。
只输出 JSON 数组：[{"by":"昵称（认识的人用他的名字）","text":"评论","likes":点赞数,"re":"回复的是哪条评论的作者（不是回复就空）"}]`;
const DEF_RANK = `{{我是谁}}
按你的性格、年纪、经历和最近的心情，写出你在网易云音乐上的「听歌排行」——最近一周你单曲循环最多的 {{条数}} 首（真实存在的歌就行，也可以有你世界里的歌），再说一句你最近在听什么。最近你们聊的：
{{最近}}
只输出 JSON：{"week":[{"t":"歌名","a":"歌手","n":这周听了几次}],"all":[{"t":"歌名","a":"歌手"}],"say":"一句话"}`;
const DEF_SEARCH = `网易云音乐里，用户搜了「{{词}}」。给出最像真搜索结果的 {{条数}} 首歌（真实存在的歌优先；搜的是人名就给这个人的歌，搜的是心情 / 场景就给适合的歌）。不要写歌词。
只输出 JSON 数组：[{"t":"歌名","a":"歌手","al":"专辑"}]`;
const DEF_LIST = `{{我是谁}}
你在网易云音乐上给她做一个歌单（{{要求}}）。起一个像真人起的歌单名、写一段歌单简介（可以藏点只有你们懂的话），放 {{条数}} 首歌（真实存在的歌），每首写一句你为什么放它。不要写歌词。
你们最近聊的：
{{最近}}
只输出 JSON：{"name":"歌单名","desc":"简介","songs":[{"t":"歌名","a":"歌手","why":"为什么放这首"}]}`;
const DEF_POST = `{{我是谁}}
你在网易云的「笔记」发一篇（图文笔记，配一首歌），分享一首歌（真实存在的歌，按你此刻的心情 / 今天发生的事 / 想到她），配一段话（像真人发动态：可以很短、可以暗戳戳）。不要写歌词。你们最近聊的：
{{最近}}
只输出 JSON：{"t":"歌名","a":"歌手","text":"动态文字"}`;
const DEF_FM = `网易云音乐「私人 FM」，给用户 {{我}} 推 {{条数}} 首歌。她喜欢的：
{{听过}}
{{模式}}
真实存在的歌，风格可以跳一点，像电台一样有惊喜。只输出 JSON 数组：[{"t":"歌名","a":"歌手","al":"专辑"}]`;
X.plGroup('🎵 网易云音乐', 'gysMusic', [
    ['mu.daily', '每日推荐', '每天第一次打开 / 点刷新时', '{{我}} {{听过}} {{人}} {{条数}}'],
    ['mu.cmt', '歌的评论区', '打开一首歌的评论时', '{{歌名}} {{歌手}} {{已有}} {{人}} {{条数}}'],
    ['mu.rank', 'TA 的听歌排行', '第一次看 TA 的主页 / 刷新时', '{{我是谁}} {{条数}} {{最近}}'],
    ['mu.search', '搜歌', '搜索时', '{{词}} {{条数}}'],
    ['mu.list', 'TA 给你做歌单', 'TA 自己想做 / 你叫 TA 做时', '{{我是谁}} {{要求}} {{条数}} {{最近}}'],
    ['mu.post', 'TA 写网易云笔记', 'TA 自己想分享歌时', '{{我是谁}} {{最近}}'],
    ['mu.fm', '私人 FM', '漫游页没歌了时', '{{我}} {{听过}} {{模式}} {{条数}}']
], { 'mu.daily': DEF_DAILY, 'mu.cmt': DEF_CMT, 'mu.rank': DEF_RANK, 'mu.search': DEF_SEARCH, 'mu.list': DEF_LIST, 'mu.post': DEF_POST, 'mu.fm': DEF_FM });

const myTaste = n => { const L = Object.entries(D.plays[meW] || {}).sort((a, b) => b[1] - a[1]).map(([id]) => songOf(id)).filter(Boolean); const lk = (D.likes[meW] || []).map(songOf).filter(Boolean); return Array.from(new Set(lk.concat(L))).slice(0, n || 12).map(s => `《${s.t}》${s.a}`).join('、') || '（还没听过什么）'; };
const peopleLines = () => G.chars().slice(0, 6).map(c => `· ${c.name}：${String(c.persona || '').slice(0, 80)}`).join('\n') || '（没有）';
const whoByName = n => { n = String(n || '').trim(); return G.people().find(w => nameOf(w) === n || (G.base(w) || {}).name === n) || ''; };
function passer(name) { name = X.plain(name || '').slice(0, 16) || G.pick(['云村村民', '深夜emo选手', '耳机里的海', '一只鲸鱼', '晚风', '单曲循环中', '不想上班']) + G.rnd(10, 999); const w = 'x:mp_' + name; if (!G.hasProf(APP, w)) G.prof(APP, w, { nick: name, emoji: G.pick(['🐳', '🌙', '🎧', '🌊', '🍃', '🐱', '⭐', '🌧️']), followers: G.rnd(3, 800), gen: true }); return w; }

/* ---------------- 生成 ---------------- */
async function genDaily(force) {
    if (BUSY.daily) return; const d = X.day(); if (!force && D.daily && D.daily.day === d && D.daily.ids.length) return;
    BUSY.daily = 1; G.repaint(APP);
    try {
        const o = X.json(await X.ask(P('mu.daily', DEF_DAILY, { 我: G.meName(), 听过: myTaste(), 人: peopleLines(), 条数: 12 })));
        if (Array.isArray(o)) { const why = {}; const ids = o.map(x => { const s = x && mkSong(x); if (s && x.why) why[s.id] = X.plain(x.why).slice(0, 40); return s && s.id; }).filter(Boolean); if (ids.length) D.daily = { day: d, ids, why }; saveD(); }
    } catch (e) {} finally { BUSY.daily = 0; G.repaint(APP); }
}
function cmtFlat(s) { const L = []; (s.cmts || []).forEach(c => { L.push(c); (c.kids || []).forEach(k => L.push(k)); }); return L; }
async function genCmts(s, n) {
    if (!s || BUSY['c' + s.id]) return; BUSY['c' + s.id] = 1; G.repaint(APP);
    try {
        const ex = cmtFlat(s).slice(0, 10).map(c => `${nameOf(c.by)}：${c.text}`).join('\n') || '（还没有）';
        const ppl = ['me'].concat(cast(), G.npcs().slice(0, 6).map(x => 'n:' + x.id)).filter(w => w !== 'me').map(w => `· ${nameOf(w)}：${String((G.base(w) || {}).persona || '').slice(0, 60)}`).join('\n');
        const o = X.json(await X.ask(P('mu.cmt', DEF_CMT, { 歌名: s.t, 歌手: s.a || '未知', 已有: ex, 人: ppl || '（没有）', 条数: n || 8 })));
        if (Array.isArray(o)) o.slice(0, 12).forEach(x => { if (!x || !x.text) return; let w = whoByName(x.by); if (!w || w === 'me') w = passer(x.by); const c = { id: G.uid('mc'), by: w, text: X.plain(x.text).slice(0, 300), at: Date.now() - G.rnd(1, 900) * 86400e3 / 30, likeN: Math.max(0, parseInt(x.likes, 10) || G.rnd(0, 3000)), likes: [], kids: [] }; const re = x.re && s.cmts.find(k => nameOf(k.by) === x.re); if (re) { c.to = re.by; re.kids.push(c); } else s.cmts.push(c); });
        s.cmtGen = Date.now(); s.cmtN = Math.max(s.cmtN || 0, cmtFlat(s).length + G.rnd(50, 9000)); saveD();
    } catch (e) {} finally { BUSY['c' + s.id] = 0; G.repaint(APP); }
}
async function genRank(w, force) {
    const c = G.charOf(w); if (!c || BUSY['r' + w]) return; if (!force && D.rank[w] && Date.now() - D.rank[w].at < 3 * 86400e3) return;
    BUSY['r' + w] = 1; G.repaint(APP);
    try {
        const o = X.json(await X.ask(P('mu.rank', DEF_RANK, { 我是谁: X.who(c), 条数: 10, 最近: X.recent(c, 8) || '（最近没怎么聊）' })));
        if (o && Array.isArray(o.week)) {
            const week = o.week.map(x => { const s = mkSong(x); return s ? { id: s.id, n: Math.max(1, parseInt(x.n, 10) || G.rnd(3, 40)) } : null; }).filter(Boolean);
            const all = (o.all || []).map(x => { const s = mkSong(x); return s && s.id; }).filter(Boolean);
            D.rank[w] = { week, all: all.length ? all : week.map(x => x.id), say: X.plain(o.say || '').slice(0, 60), at: Date.now() };
            if (week[0]) D.now[w] = { id: week[0].id, at: Date.now() };
            saveD();
        }
    } catch (e) {} finally { BUSY['r' + w] = 0; G.repaint(APP); }
}
async function genSearch(q) {
    if (BUSY.s) return; BUSY.s = 1; G.repaint(APP);
    try { const o = X.json(await X.ask(P('mu.search', DEF_SEARCH, { 词: q, 条数: 10 }))); if (Array.isArray(o)) SRCH = { q, ids: o.map(x => { const s = x && mkSong(x); return s && s.id; }).filter(Boolean) }; } catch (e) {} finally { BUSY.s = 0; G.repaint(APP); }
}
async function genFm() {
    if (BUSY.fm) return; BUSY.fm = 1; G.repaint(APP);
    try { const o = X.json(await X.ask(P('mu.fm', DEF_FM, { 我: G.meName(), 听过: myTaste(), 模式: FMMODE === 'heart' ? '现在是「心动模式」：跟她最近红心的歌风格接近。' : '普通模式：可以跳出她的舒适区。', 条数: 8 }))); if (Array.isArray(o)) { o.forEach(x => { const s = x && mkSong(x); if (s && !D.fm.includes(s.id)) D.fm.push(s.id); }); saveD(); } } catch (e) {} finally { BUSY.fm = 0; G.repaint(APP); }
}
async function taList(c, req) {
    const o = X.json(await X.ask(P('mu.list', DEF_LIST, { 我是谁: X.who(c), 要求: req || '按你自己想给她听的来', 条数: 8, 最近: X.recent(c, 8) || '（最近没怎么聊）' })));
    if (!o || !Array.isArray(o.songs)) return null;
    const why = {}; const ids = o.songs.map(x => { const s = x && mkSong(x); if (s && x.why) why[s.id] = X.plain(x.why).slice(0, 60); return s && s.id; }).filter(Boolean); if (!ids.length) return null;
    const l = { id: G.uid('ml'), by: charW(c), name: X.plain(o.name || '给你的歌').slice(0, 30), desc: X.plain(o.desc || '').slice(0, 200), ids, why, at: Date.now(), plays: G.rnd(0, 30), forMe: 1 };
    D.lists.unshift(l); saveD(); return l;
}
async function taPost(c) {
    const o = X.json(await X.ask(P('mu.post', DEF_POST, { 我是谁: X.who(c), 最近: X.recent(c, 8) || '（最近没怎么聊）' }))); if (!o || !o.t) return null;
    const s = mkSong(o); if (!s) return null;
    const p = { id: G.uid('mp'), by: charW(c), sid: s.id, text: X.plain(o.text || '').slice(0, 300), at: Date.now(), likes: [], likeN: G.rnd(0, 60), cmts: [] };
    D.posts.unshift(p); if (D.posts.length > 300) D.posts.length = 300; D.now[charW(c)] = { id: s.id, at: Date.now() }; saveD(); return p;
}

/* ---------------- 播放 ---------------- */
let NOW = null;   // { id, t0, dur, real }
let SRCH = null, FMMODE = 'normal', LYR = 0, CMTSORT = 'hot', REPLY = null;
M.play = async (id, quiet) => {
    const s = songOf(id); if (!s) return;
    if (s.ta && s.sgid && typeof window.gyxSongPlay === 'function') { window.gyxSongPlay(s.sgid); NOW = { id, t0: Date.now(), dur: 90e3, real: 1 }; }
    else if (playable(s) && window.gymPlayTrackId) { window.gymPlayTrackId(s.bid); NOW = { id, t0: Date.now(), dur: 0, real: 1 }; }
    else { const tr = window.gymFindTrack && window.gymFindTrack(s.t); if (tr && window.gymPlayTrackId) { s.bid = tr.id; window.gymPlayTrackId(tr.id); NOW = { id, t0: Date.now(), dur: 0, real: 1 }; } else { NOW = { id, t0: Date.now(), dur: G.rnd(180, 290) * 1000, real: 0 }; if (!quiet && !M.__warned) { M.__warned = 1; X.toast(X.v('这首还没有音源', '在「听」这首（没有声音）'), X.v('能在音乐盒里加上它的音频，就能真的放', '播放页里点「加到音乐盒」')); } } }
    addPlay(meW, s); listening().forEach(cid => addPlay('c:' + cid, s));
    if (!quiet) G.push(APP, { id: 'player', title: '', cls: 'mu-pb', html: () => playerHtml(), after: () => tick() });
};
function nowInfo() {
    const s = NOW && songOf(NOW.id); if (!s) return null;
    const bi = s.bid && window.gymNowInfo ? window.gymNowInfo() : null;
    if (bi && bi.id === s.bid) return { s, t: bi.t, d: bi.d, playing: bi.playing };
    const d = NOW.dur || 200e3, t = Math.min(d, Date.now() - NOW.t0);
    return { s, t: t / 1000, d: d / 1000, playing: !NOW.paused && t < d };
}
let TK = null;
function tick() { clearInterval(TK); TK = setInterval(() => { const r = document.querySelector('#gys_music .mu-player'); if (!r) { clearInterval(TK); return; } const n = nowInfo(); if (!n) return; const pr = r.querySelector('.mu-prog i'); if (pr) pr.style.width = (n.d ? Math.min(100, n.t / n.d * 100) : 0) + '%'; const tt = r.querySelector('.mu-tm'); if (tt) tt.innerHTML = `<span>${mmss(n.t)}</span><span>${mmss(n.d)}</span>`; r.classList.toggle('paused', !n.playing); if (!n.playing && NOW && !NOW.real && n.t >= n.d && !NOW.ended) { NOW.ended = 1; M.next(); } }, 1000); }
const mmss = s => { s = Math.max(0, Math.round(s || 0)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
M.toggle = () => { const n = nowInfo(); if (!n) return; if (NOW.real && window.gymToggle) window.gymToggle(); else { if (NOW.paused) { NOW.t0 = Date.now() - NOW.pausedAt; NOW.paused = 0; } else { NOW.pausedAt = Date.now() - NOW.t0; NOW.paused = 1; } } G.repaint(APP); };
function queue() { return (QUEUE && QUEUE.length) ? QUEUE : Object.keys(D.songs); }
let QUEUE = [];
M.playIn = (ids, i) => { QUEUE = ids.slice(); M.play(ids[i]); };
M.next = () => { const Q = queue(); if (!Q.length || !NOW) return; const i = Q.indexOf(NOW.id); const nx = Q[(i + 1) % Q.length]; if (G.top(APP) && G.top(APP).id === 'player') { G.back(APP); } M.play(nx); };
M.prev = () => { const Q = queue(); if (!Q.length || !NOW) return; const i = Q.indexOf(NOW.id); const nx = Q[(i - 1 + Q.length) % Q.length]; if (G.top(APP) && G.top(APP).id === 'player') G.back(APP); M.play(nx); };
M.like = id => { const L = D.likes[meW] = D.likes[meW] || []; const i = L.indexOf(id); if (i >= 0) L.splice(i, 1); else { L.unshift(id); X.toast(X.v('❤️ 已添加到我喜欢的音乐', '收进「我喜欢的音乐」了', '红心了'), ''); } saveD(); G.repaint(APP); };
M.toBox = () => { if (typeof window.gymOpenMgr === 'function') { window.gymOpenMgr(); X.toast('在音乐盒里加这首的音频', '传文件或填直链，名字写一样就能认出来'); } else X.toast('音乐盒没开', '设置 → 全部开关 里打开音乐盒'); };
M.together = async () => { const cs = G.chars(); if (!cs.length) return; let c = cs[0]; if (cs.length > 1) { const i = await G.sheet(cs.map(x => (listening().includes(String(x.id)) ? '✓ ' : '🎧 ') + x.name), '和谁一起听？'); if (i == null) return; c = cs[i]; } if (typeof window.gymToggleListener === 'function') { await window.gymToggleListener(c.id); G.repaint(APP); } else X.toast('音乐盒没开', '一起听要用音乐盒'); };
M.share = id => { const s = songOf(id); if (s) G.share({ app: APP, kind: '单曲', by: '', byName: '', title: '《' + s.t + '》', text: (s.a || '') + (s.al ? ' · ' + s.al : ''), img: G.cardImg(coverImg(s)), at: Date.now(), go: X.go('gysMusicOpenSong', s.id) }); };
M.toList = async id => { const mine = D.lists.filter(l => l.by === meW); const opts = mine.map(l => '📁 ' + l.name).concat(['＋ 新建歌单']); const i = await G.sheet(opts, '收藏到歌单'); if (i == null) return; let l = mine[i]; if (!l) { const n = await G.input('歌单名', ''); if (!n) return; l = { id: G.uid('ml'), by: meW, name: X.plain(n).slice(0, 30), desc: '', ids: [], at: Date.now(), plays: 0 }; D.lists.unshift(l); } if (!l.ids.includes(id)) l.ids.unshift(id); saveD(); X.toast('收藏到「' + l.name + '」了', ''); };
M.menu = async id => { const s = songOf(id); if (!s) return; const ops = ['➕ 收藏到歌单', '↗ 分享给 TA', '💬 评论', playable(s) ? '🎧 和 TA 一起听' : '📥 加到音乐盒（加了音频才能真放）', '👤 歌手：' + (s.a || '未知')]; const i = await G.sheet(ops, '《' + s.t + '》'); if (i == null) return; [() => M.toList(id), () => M.share(id), () => M.cmts(id), () => (playable(s) ? M.together() : M.toBox()), () => M.search(s.a)][i](); };

/* ---------------- 页面 ---------------- */
const ICO = { home: 'i:home', fm: '📻', post: '🌐', me: 'i:person' };
function head(tab) {
    const n = nowInfo();
    return `<div class="gys-hd mu-hd"><span class="gys-bk" onclick="GYS.close('${APP}')">${G.ic('back', 22)}</span>${tab === 'home' || tab === 'find' ? `<div class="mu-sb" onclick="gysMu.searchPage()">🔍 ${esc(D.daily && D.daily.ids[0] && songOf(D.daily.ids[0]) ? songOf(D.daily.ids[0]).t : '搜索歌曲、歌手')}</div>` : `<b>${{ fm: '漫游', post: '笔记', me: '我的' }[tab] || '网易云音乐'}</b>`}${n ? `<span class="mu-nowb${n.playing ? ' on' : ''}" onclick="gysMu.openPlayer()">${cover(n.s, 28, 14)}</span>` : ''}</div>`;
}
const songRow = (s, i, opt) => { opt = opt || {}; const L = opt.ids || []; return `<div class="mu-row${NOW && NOW.id === s.id ? ' cur' : ''}" onclick="gysMu.playIn(${esc(JSON.stringify(L))},${i})">${opt.num ? `<em class="mu-n${i < 3 ? ' top' : ''}">${i + 1}</em>` : cover(s, 44)}<div class="mu-ri"><b>${esc(s.t)}${s.ta ? ' <u>原创</u>' : ''}${playable(s) ? ' <u class="ok">可播放</u>' : ''}</b><small>${esc(s.a || '未知歌手')}${s.al ? ' - ' + esc(s.al) : ''}${opt.why && opt.why[s.id] ? ` · <i>${esc(opt.why[s.id])}</i>` : ''}${opt.n ? ` · ${opt.n}次` : ''}</small></div><span class="mu-more" onclick="event.stopPropagation();gysMu.menu('${s.id}')">⋮</span></div>`; };
const rows = (ids, opt) => { const L = ids.map(songOf).filter(Boolean); const I = L.map(s => s.id); return L.map((s, i) => songRow(s, i, Object.assign({ ids: I }, opt))).join(''); };
function home() {
    if (!D.daily || D.daily.day !== X.day()) genDaily();
    syncBox();
    const d = new Date(), rec = D.lists.filter(l => l.by !== meW).slice(0, 6);
    const cs = cast().filter(w => D.now[w] && songOf(D.now[w].id));
    const pl = window.gyxListData ? (window.gyxListData().songs || []) : null, sg = window.gyxSongData ? (window.gyxSongData().list || []) : null;
    return `<div class="mu-home">
      <div class="mu-ent">${[['📅', '每日推荐', 'gysMu.daily()'], ['📻', '私人FM', "GYS.tab('music','fm')"], ['📑', '歌单', 'gysMu.listsAll()'], ['📊', '排行榜', 'gysMu.charts()'], window.gyxRadioOpen ? ['🎙️', '电台', 'gyxRadioOpen()'] : null, ['🎧', '一起听', 'gysMu.together()']].filter(Boolean).map(([i, n, f]) => `<span onclick="${f}"><i>${i}</i><em>${n}</em></span>`).join('')}</div>
      <div class="mu-dcard" onclick="gysMu.daily()"><div><b>${d.getDate()}</b><small>${d.getMonth() + 1}月</small></div><div class="mu-dci"><b>每日推荐</b><p>${BUSY.daily ? '⏳ 正在为你挑歌…' : D.daily && D.daily.ids.length ? D.daily.ids.slice(0, 3).map(songOf).filter(Boolean).map(s => esc(s.t)).join(' / ') : '根据你的口味生成，每天 0 点更新'}</p></div><span>▶</span></div>
      ${cs.length ? `<div class="mu-sec">🎧 TA 们在听</div><div class="mu-hs">${cs.map(w => { const s = songOf(D.now[w].id); return `<div class="mu-tal" onclick="gysMu.prof('${w}')">${G.av(APP, w, 46)}<b>${esc(nameOf(w))}</b><small>${esc(s.t)}</small></div>`; }).join('')}</div>` : ''}
      ${sg && sg.length ? `<div class="mu-sec">✍️ TA 写给你的歌<a onclick="gysMu.taSongs()">全部 ›</a></div><div class="mu-hs">${sg.slice(-6).reverse().map(x => { const s = taSong(x); return s ? `<div class="mu-lc" onclick="gysMu.playIn(['${s.id}'],0)">${cover(s, 104)}<b>${esc(s.t)}</b><small>${esc(nameOf(s.ta))}</small></div>` : ''; }).join('')}</div>` : ''}
      <div class="mu-sec">📑 推荐歌单<a onclick="gysMu.listsAll()">更多 ›</a></div>
      <div class="mu-hs">${pl ? `<div class="mu-lc" onclick="gysMu.shared()"><span class="mu-cv" style="width:104px;height:104px;background:linear-gradient(135deg,#ffb3c1,#ff5f7e)"><i style="font-size:40px">🎶</i></span><b>我们的共享歌单</b><small>${pl.length} 首</small></div>` : ''}${rec.map(l => listCard(l)).join('') || (pl ? '' : '<div class="gys-empty" style="padding:20px">TA 给你做的歌单会出现在这里<br><a onclick="gysMu.askList()">叫 TA 做一个 ›</a></div>')}</div>
      ${D.hist.length ? `<div class="mu-sec">🕘 最近播放</div>${rows(Array.from(new Set(D.hist.slice(0, 20).map(h => h.id))).slice(0, 5))}` : ''}
    </div>`;
}
const listCard = l => { const s = songOf(l.ids[0]); return `<div class="mu-lc" onclick="gysMu.list('${l.id}')">${l.cover ? `<span class="mu-cv" style="width:104px;height:104px;background-image:url('${l.cover}')"></span>` : cover(s, 104)}<em>▶ ${G.fmtN(l.plays || 0)}</em><b>${esc(l.name)}</b><small>${esc(nameOf(l.by))}</small></div>`; };
function taSong(x) { if (!x) return null; let s = Object.values(D.songs).find(v => v.sgid === x.id); if (!s) { s = mkSong({ t: x.title || '无题', a: nameOf('c:' + x.cid), ta: 'c:' + x.cid, sgid: x.id, likeN: G.rnd(1, 30) }); } return s; }
M.taSongs = () => { const L = (window.gyxSongData ? window.gyxSongData().list || [] : []).slice().reverse().map(taSong).filter(Boolean); G.push(APP, { title: 'TA 写给你的歌', html: () => `<div class="mu-tip">TA 把你们的事写成的歌，用小合成器哼给你听（在「🎵 TA写给你的歌」里写的都在这）。${window.gyxSongOpen ? `<a onclick="gyxSongOpen()">去歌本 ›</a>` : ''}</div>${rows(L.map(s => s.id)) || '<div class="gys-empty">还没有</div>'}` }); };
M.daily = () => { genDaily(); G.push(APP, { id: 'daily', title: '每日推荐', html: () => `<div class="mu-dhd"><b>${new Date().getDate()}</b><small>${new Date().getMonth() + 1}月 · 根据你的音乐口味生成，每天更新</small><span class="gys-btn sm" onclick="gysMu.playIn(${esc(JSON.stringify(D.daily ? D.daily.ids : []))},0)">▶ 播放全部</span><span class="gys-btn sm ghost" onclick="gysMu.__daily()">${BUSY.daily ? '⏳' : '↻ 换一批'}</span></div>${D.daily ? rows(D.daily.ids, { why: D.daily.why }) : '<div class="gys-busy">⏳ 正在为你挑歌…</div>'}` }); };
M.__daily = () => genDaily(1);
M.charts = () => {
    const all = Object.values(D.songs);
    const hot = all.slice().sort((a, b) => (b.likeN || 0) - (a.likeN || 0)).slice(0, 20).map(s => s.id);
    const up = all.slice().sort((a, b) => ((plays(meW, b.id) + cast().reduce((n, w) => n + plays(w, b.id), 0)) - (plays(meW, a.id) + cast().reduce((n, w) => n + plays(w, a.id), 0))) || (b.at - a.at)).slice(0, 20).map(s => s.id);
    const ori = all.filter(s => s.ta).map(s => s.id);
    G.push(APP, { title: '排行榜', html: () => `<div class="mu-chart"><div class="mu-ch" style="background:linear-gradient(135deg,#ff6a6a,#c62828)"><b>飙升榜</b><small>你和 TA 们最近在听的</small></div>${rows(up, { num: 1 }) || '<div class="gys-empty">多听几首就有了</div>'}<div class="mu-ch" style="background:linear-gradient(135deg,#ff9a3c,#e65100)"><b>热歌榜</b></div>${rows(hot, { num: 1 })}${ori.length ? `<div class="mu-ch" style="background:linear-gradient(135deg,#7f7fd5,#5b3cc4)"><b>原创榜</b><small>TA 写给你的歌</small></div>${rows(ori, { num: 1 })}` : ''}</div>` });
};
M.listsAll = () => G.push(APP, { title: '歌单广场', right: `<span onclick="gysMu.askList()">✨ 叫 TA 做</span>`, html: () => `<div class="mu-grid">${D.lists.map(listCard).join('') || '<div class="gys-empty">还没有歌单<br>点右上角「叫 TA 做」</div>'}</div>` });
M.askList = async () => { const cs = G.chars(); if (!cs.length) return; let c = cs[0]; if (cs.length > 1) { const i = await G.sheet(cs.map(x => x.name), '叫谁给你做歌单？'); if (i == null) return; c = cs[i]; } const req = await G.input('想要什么样的歌单？（可以空着）', ''); if (req === null || req === undefined) return; X.toast(X.v('⏳ TA 在挑歌', 'TA 在做了'), ''); const l = await taList(c, String(req || '')); if (!l) return X.toast('没做出来', '再试一次'); G.repaint(APP); M.list(l.id); };
M.list = id => { const l = D.lists.find(x => x.id === id); if (!l) return; G.push(APP, { id: 'list_' + id, title: '歌单', html: () => { const s = songOf(l.ids[0]); return `<div class="mu-lh" style="background:${coverBg(s)}"><div>${l.cover ? `<span class="mu-cv" style="width:120px;height:120px;background-image:url('${l.cover}')"></span>` : cover(s, 120)}</div><div class="mu-lhi"><b>${esc(l.name)}</b><span onclick="gysMu.prof('${l.by}')">${G.av(APP, l.by, 22)} ${esc(nameOf(l.by))} ›</span><p>${esc(l.desc || '')}</p></div></div><div class="mu-lops"><span onclick="gysMu.playIn(${esc(JSON.stringify(l.ids))},0)">▶ 播放全部 (${l.ids.length})</span>${l.by === meW ? `<span onclick="gysMu.listEdit('${id}')">✏️ 编辑</span>` : ''}<span onclick="gysMu.listShare('${id}')">↗ 分享</span></div>${rows(l.ids, { why: l.why })}` + (l.by === meW ? `<div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysMu.listDel('${id}')">删掉歌单</span></div>` : ''); } }); l.plays = (l.plays || 0) + 1; saveD(); };
M.listShare = id => { const l = D.lists.find(x => x.id === id); if (l) G.share({ app: APP, kind: '歌单', by: l.by, byName: nameOf(l.by), title: l.name, text: l.ids.slice(0, 4).map(songOf).filter(Boolean).map(s => s.t).join(' / '), img: l.cover || '', at: l.at, go: X.go('gysMusicOpenList', l.id) }); };
M.listEdit = async id => { const l = D.lists.find(x => x.id === id); if (!l) return; const i = await G.sheet(['改名字', '改简介', '换封面（能裁剪）'], l.name); if (i === 0) { const v = await G.input('歌单名', l.name); if (v) l.name = X.plain(v).slice(0, 30); } else if (i === 1) { const v = await G.input('简介', l.desc || ''); if (v !== null && v !== undefined) l.desc = String(v).slice(0, 200); } else if (i === 2) { G.pickImg(1, url => { l.cover = url; saveD(); G.repaint(APP); }); } saveD(); G.repaint(APP); };
M.listDel = async id => { if (!(await G.confirm('删掉这个歌单？（歌不会删）'))) return; D.lists = D.lists.filter(x => x.id !== id); saveD(); G.back(APP); };
M.shared = () => { const d = window.gyxListData && window.gyxListData(); if (!d) return; const L = (d.songs || []).map(x => { const s = mkSong({ t: x.t, a: x.a }); return s ? { s, x } : null; }).filter(Boolean); const ids = L.map(o => o.s.id), why = {}; L.forEach(o => { why[o.s.id] = (o.x.by === 'me' ? '你' : nameOf('c:' + o.x.by)) + '加的' + (o.x.why ? '：' + o.x.why : ''); }); G.push(APP, { title: '我们的共享歌单', right: window.gyxListOpen ? `<span onclick="gyxListOpen()">管理</span>` : '', html: () => `<div class="mu-tip">你们俩一起往里加歌的歌单（「🎶 共享歌单」），TA 也会时不时塞一首进来。</div><div class="mu-lops"><span onclick="gysMu.playIn(${esc(JSON.stringify(ids))},0)">▶ 播放全部 (${ids.length})</span></div>${rows(ids, { why })}` }); };

function playerHtml() {
    const n = nowInfo(); if (!n) return '<div class="gys-empty">没有在放的歌</div>'; const s = n.s;
    const im = coverImg(s), ls = listening().map(id => 'c:' + id);
    const lrc = lyricsOf(s);
    return `<div class="mu-player${n.playing ? '' : ' paused'}"><div class="mu-pbg" style="${im ? `background-image:url('${im}')` : `background:${coverBg(s)}`}"></div>
      <div class="mu-ph"><span onclick="GYS.back('music')">⌄</span><div><b>${esc(s.t)}</b><small onclick="gysMu.search('${esc(s.a || '').replace(/'/g, '')}')">${esc(s.a || '未知歌手')} ›</small></div><span onclick="gysMu.share('${s.id}')">↗</span></div>
      ${LYR ? `<div class="mu-lyr" onclick="gysMu.lyr()">${lrc.length ? lrc.map(l => `<p>${esc(l)}</p>`).join('') : `<p class="dim">${s.ta ? '这首没有歌词' : playable(s) ? '这首没有歌词<br>在音乐盒里给它传 .lrc 就有了' : '暂无歌词'}</p>`}</div>` : `<div class="mu-disc" onclick="gysMu.lyr()"><i class="mu-needle"></i><div class="mu-vinyl">${cover(s, 190, 95)}</div></div>`}
      ${ls.length ? `<div class="mu-tg">${ls.map(w => G.av(APP, w, 26)).join('')}<em>正在和 ${ls.map(nameOf).map(esc).join('、')} 一起听</em></div>` : ''}
      ${!n.s.ta && !playable(s) && !(window.gymFindTrack && window.gymFindTrack(s.t)) ? `<div class="mu-nosrc">🔇 这首没有音源，只是假装在放 · <a onclick="gysMu.toBox()">加到音乐盒</a></div>` : ''}
      <div class="mu-pops"><span class="${liked(meW, s.id) ? 'on' : ''}" onclick="gysMu.like('${s.id}')">${liked(meW, s.id) ? '❤️' : '🤍'}</span><span onclick="gysMu.together()">🎧</span><span onclick="gysMu.cmts('${s.id}')">💬<sup>${s.cmtN ? G.fmtN(s.cmtN) : ''}</sup></span>${timerOn() ? `<span class="${TMR ? 'on' : ''}" onclick="gysMu.timer()">⏰${TMR ? `<sup>${TMR.after ? '本首' : Math.ceil((TMR.end - Date.now()) / 60000)}</sup>` : ''}</span>` : ''}<span onclick="gysMu.menu('${s.id}')">⋯</span></div>
      <div class="mu-prog"><i style="width:${n.d ? Math.min(100, n.t / n.d * 100) : 0}%"></i></div><div class="mu-tm"><span>${mmss(n.t)}</span><span>${mmss(n.d)}</span></div>
      <div class="mu-ctl"><span onclick="gysMu.prev()">⏮</span><span class="pp" onclick="gysMu.toggle()">${n.playing ? '⏸' : '▶'}</span><span onclick="gysMu.next()">⏭</span></div></div>`;
}
function lyricsOf(s) {
    if (s.ta && window.gyxSongData) { const x = (window.gyxSongData().list || []).find(v => v.id === s.sgid); return x ? (x.lyrics || []).map(String) : []; }
    try { const B = box(), tr = s.bid && B && B.tracks.find(x => x.id === s.bid); if (tr && tr.lrc) return String(tr.lrc).split('\n').map(l => l.replace(/\[[^\]]*\]/g, '').trim()).filter(Boolean); } catch (e) {}
    return [];
}
M.lyr = () => { LYR = !LYR; G.repaint(APP); };
M.openPlayer = () => { if (!NOW) return; G.push(APP, { id: 'player', title: '', cls: 'mu-pb', html: () => playerHtml(), after: () => tick() }); tick(); };

/* ---------------- 评论 ---------------- */
M.cmts = id => { const s = songOf(id); if (!s) return; REPLY = null; if (!s.cmtGen) genCmts(s, 8); G.push(APP, { id: 'cmt_' + id, title: `评论(${G.fmtN(s.cmtN || cmtFlat(s).length)})`, html: () => cmtHtml(s), foot: () => `<div class="mu-cin"><input id="muCin" placeholder="${REPLY ? '回复 ' + esc(nameOf(REPLY.by)) : '听说爱评论的人粉丝多'}" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysMu.send('${id}')"><span onclick="gysMu.send('${id}')">发送</span></div>` }); };
function cmtHtml(s) {
    const L = s.cmts.slice().sort((a, b) => CMTSORT === 'hot' ? (b.likeN + b.likes.length) - (a.likeN + a.likes.length) : b.at - a.at);
    const one = (c, kid) => `<div class="mu-c${kid ? ' kid' : ''}">${G.av(APP, c.by, kid ? 26 : 34)}<div><div class="mu-ch2"><b onclick="gysMu.prof('${c.by}')">${esc(nameOf(c.by))}</b><span class="${c.likes.includes('me') ? 'on' : ''}" onclick="gysMu.cLike('${s.id}','${c.id}')">${G.fmtN(c.likeN + c.likes.length)} 👍</span></div><small>${G.ago(c.at)}</small><p onclick="gysMu.replyTo('${s.id}','${c.id}')">${c.to ? `回复 <a>@${esc(nameOf(c.to))}</a>：` : ''}${esc(c.text)}</p>${(c.kids || []).map(k => one(k, 1)).join('')}</div></div>`;
    return `<div class="mu-cs">${cover(s, 48)}<div><b>${esc(s.t)}</b><small>${esc(s.a)}</small></div></div><div class="mu-csort"><span class="${CMTSORT === 'hot' ? 'on' : ''}" onclick="gysMu.cs('hot')">最热</span><span class="${CMTSORT === 'new' ? 'on' : ''}" onclick="gysMu.cs('new')">最新</span><a onclick="gysMu.moreC('${s.id}')">${BUSY['c' + s.id] ? '⏳' : '↻ 更多'}</a></div>${L.map(c => one(c)).join('') || (BUSY['c' + s.id] ? '<div class="gys-busy">⏳ 评论加载中…</div>' : '<div class="gys-empty">还没有评论，来抢沙发</div>')}`;
}
M.cs = v => { CMTSORT = v; G.repaint(APP); };
M.moreC = id => genCmts(songOf(id), 6);
const findC = (s, cid) => cmtFlat(s).find(c => c.id === cid);
M.cLike = (sid, cid) => { const c = findC(songOf(sid), cid); if (!c) return; const i = c.likes.indexOf('me'); if (i >= 0) c.likes.splice(i, 1); else c.likes.push('me'); saveD(); G.repaint(APP); };
M.replyTo = (sid, cid) => { const s = songOf(sid), c = findC(s, cid); REPLY = c && c.by !== 'me' ? c : null; G.repaint(APP); setTimeout(() => { const i = document.getElementById('muCin'); if (i) i.focus(); }, 50); };
M.send = async id => {
    const s = songOf(id), inp = document.getElementById('muCin'); if (!s || !inp) return; const t = inp.value.trim(); if (!t) return; inp.value = '';
    const c = { id: G.uid('mc'), by: 'me', text: t.slice(0, 300), at: Date.now(), likeN: 0, likes: [], kids: [] };
    let top = null; if (REPLY) { top = s.cmts.find(k => k === REPLY || (k.kids || []).includes(REPLY)); c.to = REPLY.by; }
    if (top) top.kids.push(c); else s.cmts.unshift(c);
    const rp = REPLY; REPLY = null; s.cmtN = (s.cmtN || 0) + 1; saveD(); G.repaint(APP);
    // 被回复的是角色 / 或者认识你的角色刷到了
    const target = rp && G.charOf(rp.by) ? G.charOf(rp.by) : (Math.random() < 0.5 ? G.pick(G.chars()) : null);
    if (target) setTimeout(async () => { const r = X.plain(await X.ask(`${X.who(target)}\n在网易云音乐《${s.t}》- ${s.a} 的评论区，她${rp && rp.by === charW(target) ? '回复了你的评论「' + rp.text + '」' : '写了一条评论'}：「${t}」。你看到了，回她一句（评论区里的口吻，短）。只写那一句。`) || '').slice(0, 200); if (!r) return; (top || c).kids = (top || c).kids || []; (top || c).kids.push({ id: G.uid('mc'), by: charW(target), text: r, to: 'me', at: Date.now(), likeN: 0, likes: [], kids: [] }); saveD(); G.repaint(APP); G.notify(APP, target, `🎵 <b>${X.esc(target.name)}</b> 回复了你的评论`, r, X.go('gysMusicOpenCmt', s.id)); }, G.rnd(3, 12) * 1000);
};

/* ---------------- 搜索 ---------------- */
M.searchPage = () => G.push(APP, { id: 'search', title: '搜索', html: () => `<div class="mu-sbox"><input id="muQ" placeholder="搜歌、歌手、心情" value="${esc(SRCH ? SRCH.q : '')}" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysMu.search(this.value)"><span onclick="gysMu.search(document.getElementById('muQ').value)">搜索</span></div>${SRCH ? searchRes() : `<div class="mu-sec">🔥 热搜</div><div class="mu-chips">${['适合下雨天听的', '失恋', '周杰伦', '深夜', '学习专注', '甜到发齁'].concat(cast().slice(0, 3).map(nameOf)).map(q => `<span onclick="gysMu.search('${esc(q).replace(/'/g, '')}')">${esc(q)}</span>`).join('')}</div>`}` });
function searchRes() { const q = SRCH.q.toLowerCase(); const loc = Object.values(D.songs).filter(s => (s.t + s.a).toLowerCase().includes(q)).map(s => s.id); const ids = Array.from(new Set(loc.concat(SRCH.ids || []))); const users = G.people().filter(w => w !== 'me' && nameOf(w).toLowerCase().includes(q)); return `${users.length ? `<div class="mu-sec">用户</div>${users.map(w => `<div class="mu-row" onclick="gysMu.prof('${w}')">${G.av(APP, w, 40)}<div class="mu-ri"><b>${esc(nameOf(w))}</b><small>${esc(G.prof(APP, w).bio || '')}</small></div></div>`).join('')}` : ''}<div class="mu-sec">单曲</div>${rows(ids) || ''}${BUSY.s ? '<div class="gys-busy">⏳ 搜索中…</div>' : ''}`; }
M.search = q => { q = String(q || '').trim(); if (!q) return; SRCH = { q, ids: [] }; if (!G.top(APP) || G.top(APP).id !== 'search') M.searchPage(); else G.repaint(APP); genSearch(q); };

/* ---------------- 漫游（私人 FM） ---------------- */
function fmTab() {
    if (D.fm.length < 2) genFm(); const s = songOf(D.fm[0]);
    return `<div class="mu-fm"><div class="mu-fmm"><span class="${FMMODE === 'normal' ? 'on' : ''}" onclick="gysMu.fmMode('normal')">私人 FM</span><span class="${FMMODE === 'heart' ? 'on' : ''}" onclick="gysMu.fmMode('heart')">❤️ 心动模式</span></div>
      ${s ? `<div class="mu-fmc" style="background:${coverBg(s)}">${cover(s, 220, 16)}<b>${esc(s.t)}</b><small>${esc(s.a)}</small></div>
      <div class="mu-fmo"><span onclick="gysMu.fmDrop()">🗑</span><span class="${liked(meW, s.id) ? 'on' : ''}" onclick="gysMu.like('${s.id}')">${liked(meW, s.id) ? '❤️' : '🤍'}</span><span class="pp" onclick="gysMu.play('${s.id}')">▶</span><span onclick="gysMu.fmNext()">⏭</span><span onclick="gysMu.cmts('${s.id}')">💬</span></div>` : `<div class="gys-busy" style="color:#fff">${BUSY.fm ? '⏳ 电台调频中…' : '没有歌了'}<br><a onclick="gysMu.__fm()">再来一批</a></div>`}</div>`;
}
M.fmMode = m => { FMMODE = m; D.fm = []; saveD(); G.repaint(APP); };
M.fmNext = () => { D.fm.shift(); saveD(); G.repaint(APP); };
M.fmDrop = () => { D.fm.shift(); saveD(); X.toast(X.v('以后少推这类', '不喜欢，跳过'), ''); G.repaint(APP); };
M.__fm = () => genFm();

/* ---------------- 笔记（以前叫云村 / 动态） ---------------- */
function postHtml(p) { const s = songOf(p.sid); return `<div class="mu-post">${G.av(APP, p.by, 40)}<div class="mu-pi"><b onclick="gysMu.prof('${p.by}')">${esc(nameOf(p.by))}</b><small>${G.ago(p.at)} 分享单曲</small>${p.text ? `<p>${esc(p.text)}</p>` : ''}${s ? `<div class="mu-ps" onclick="gysMu.playIn(['${s.id}'],0)">${cover(s, 42)}<div><b>${esc(s.t)}</b><small>${esc(s.a)}</small></div><i>▶</i></div>` : ''}<div class="mu-pa"><span class="${p.likes.includes('me') ? 'on' : ''}" onclick="gysMu.pLike('${p.id}')">👍 ${(p.likeN || 0) + p.likes.length || ''}</span><span onclick="gysMu.pCmt('${p.id}')">💬 ${p.cmts.length || ''}</span>${s ? `<span onclick="gysMu.share('${s.id}')">↗</span>` : ''}</div>${p.cmts.length ? `<div class="mu-pc">${p.cmts.map(c => `<p><b>${esc(nameOf(c.by))}</b>${c.to ? ' 回复 ' + esc(nameOf(c.to)) : ''}：${esc(c.text)}</p>`).join('')}</div>` : ''}</div></div>`; }
// 发现：搜索 + 排行榜 + 歌单广场 + 电台（推荐页放每日推荐、雷达、TA 在听）
function findTab() {
    const all = Object.values(D.songs);
    const top3 = L => L.slice(0, 3).map((s, i) => `<p>${i + 1} ${esc(s.t)} <i>- ${esc(s.a || '')}</i></p>`).join('');
    const hot = all.slice().sort((a, b) => (b.likeN || 0) - (a.likeN || 0)), up = all.slice().sort((a, b) => b.at - a.at), ori = all.filter(s => s.ta);
    return `<div class="mu-home"><div class="mu-sec">排行榜<a onclick="gysMu.charts()">更多 ›</a></div>
      <div class="mu-chs">${[['飙升榜', up, '#ff6a6a,#c62828'], ['热歌榜', hot, '#ff9a3c,#e65100'], ['原创榜', ori, '#7f7fd5,#5b3cc4']].map(([n, L, c]) => `<div class="mu-chc" onclick="gysMu.charts()" style="background:linear-gradient(135deg,${c})"><b>${n}</b>${top3(L) || '<p>还没有</p>'}</div>`).join('')}</div>
      <div class="mu-sec">歌单广场<a onclick="gysMu.askList()">✨ 叫 TA 做</a></div><div class="mu-grid">${D.lists.map(listCard).join('') || '<div class="gys-empty">还没有歌单</div>'}</div>
      ${window.gyxRadioOpen ? `<div class="mu-sec">播客 / 电台</div><div class="mu-row" onclick="gyxRadioOpen()"><span class="mu-cv" style="width:44px;height:44px;background:linear-gradient(135deg,#334,#556)"><i style="font-size:20px">🎙️</i></span><div class="mu-ri"><b>TA 的深夜电台</b><small>只给你一个人开的电台</small></div></div>` : ''}</div>`;
}
// 笔记：双列图文卡片（网易云「笔记」取代了以前的「动态」）：上面图、下面一段话、作者，点进去是大图 + 文字 + 配的歌
function noteCard(p) { const s = songOf(p.sid); return `<div class="mu-nc" onclick="gysMu.note('${p.id}')">${p.img ? `<span class="mu-ncimg" style="background-image:url('${p.img}')"></span>` : `<span class="mu-ncimg" style="background:${coverBg(s)}"><i>${s ? '♪ ' + esc(s.t) : '♪'}</i></span>`}<p>${esc(p.text || (s ? '分享单曲《' + s.t + '》' : ''))}</p><div class="mu-nca">${G.av(APP, p.by, 18)}<em>${esc(nameOf(p.by))}</em><small class="${p.likes.includes('me') ? 'on' : ''}">♡ ${(p.likeN || 0) + p.likes.length || ''}</small></div></div>`; }
M.note = id => { const p = D.posts.find(x => x.id === id); if (!p) return; G.push(APP, { id: 'note_' + id, title: '笔记', html: () => `${p.img ? `<img class="mu-nimg" src="${p.img}" onclick="GYS.imgView(this.src)">` : ''}${postHtml(p)}` }); };
function postTab() { const L = D.posts; const a = L.filter((x, i) => i % 2 === 0), b = L.filter((x, i) => i % 2 === 1); return `<div class="mu-pbar"><span class="gys-btn sm" onclick="gysMu.newPost()">✏️ 写笔记</span></div>${L.length ? `<div class="mu-ncols"><div>${a.map(noteCard).join('')}</div><div>${b.map(noteCard).join('')}</div></div>` : '<div class="gys-empty">还没有笔记<br>你和 TA 分享的歌会在这里</div>'}`; }
function postTabOld() { return `<div class="mu-pbar"><span class="gys-btn sm" onclick="gysMu.newPost()">✏️ 发动态</span></div>${D.posts.map(postHtml).join('') || '<div class="gys-empty">云村还没有动态<br>你和 TA 分享的歌会在这里</div>'}`; }
M.pLike = id => { const p = D.posts.find(x => x.id === id); if (!p) return; const i = p.likes.indexOf('me'); if (i >= 0) p.likes.splice(i, 1); else p.likes.push('me'); saveD(); G.repaint(APP); };
M.pCmt = async id => {
    const p = D.posts.find(x => x.id === id); if (!p) return; const t = await G.input('评论', ''); if (!t) return; p.cmts.push({ by: 'me', text: X.plain(t).slice(0, 200), at: Date.now(), to: p.by === 'me' ? '' : p.by }); saveD(); G.repaint(APP);
    const c = G.charOf(p.by); if (c) { const s = songOf(p.sid); const r = X.plain(await X.ask(`${X.who(c)}\n你在网易云笔记里分享了《${s ? s.t : ''}》，配的话是「${p.text}」。她评论：「${t}」。回她一句（短）。只写那一句。`) || '').slice(0, 200); if (r) { p.cmts.push({ by: charW(c), text: r, at: Date.now(), to: 'me' }); saveD(); G.repaint(APP); } }
};
M.newPost = async () => {
    const L = Array.from(new Set((D.likes[meW] || []).concat(D.hist.map(h => h.id)))).map(songOf).filter(Boolean).slice(0, 20);
    let s = null; const i = await G.sheet(L.map(x => '♪ ' + x.t + ' - ' + (x.a || '')).concat(['🔍 自己填一首']), '分享哪首？'); if (i == null) return;
    if (i < L.length) s = L[i]; else { const t = await G.input('歌名', ''); if (!t) return; const a = await G.input('歌手（可空）', '') || ''; s = mkSong({ t, a }); }
    if (!s) return; const text = await G.input('说点什么（可以空着）', ''); if (text === null || text === undefined) return;
    const img = await new Promise(res => { G.sheet(['🖼️ 配一张图（能裁剪）', '不配图'], '').then(k => { if (k === 0) G.pickImg(3 / 4, url => res(url)); else res(''); }); });
    const p = { id: G.uid('mp'), by: 'me', sid: s.id, img: img || '', text: X.plain(text).slice(0, 300), at: Date.now(), likes: [], likeN: 0, cmts: [] }; D.posts.unshift(p); saveD(); G.repaint(APP);
    X.toast(X.v('📝 笔记发布了', '分享出去了'), '');
    for (const c of G.chars()) { if (Math.random() < 0.6) setTimeout(async () => { const r = X.plain(await X.ask(`${X.who(c)}\n她在网易云写了篇笔记，分享了《${s.t}》- ${s.a}，配的话是「${p.text || '（没写）'}」。你刷到了，在下面评论一句（短，按你们的关系）。只写那一句。`) || '').slice(0, 200); if (!r) return; p.cmts.push({ by: charW(c), text: r, at: Date.now(), to: '' }); saveD(); G.repaint(APP); G.notify(APP, c, `🎵 <b>${X.esc(c.name)}</b> 评论了你的笔记`, r, X.go('gysMusicOpen', 'post')); }, G.rnd(5, 40) * 1000); }
};

/* ---------------- 音乐匹配度（258）：TA 主页上那个「你们的音乐匹配度」，点进去是共同喜欢的歌 ---------------- */
X.feat('gysMuMatch', { n: '💞 网易云音乐匹配度', desc: 'TA 的网易云主页上显示你们的音乐匹配度（按你们都听过、都喜欢的歌和歌手算），点进去是共同喜欢的歌；TA 偶尔会看到然后跟你说一句' });
X.feat('gysMuTimer', { n: '⏰ 网易云定时关闭', desc: '播放页里的定时关闭（10 / 20 / 30 / 60 分钟、播完这首）；深夜你还在听的时候 TA 可能会帮你定一个，让你早点睡' });
const matchOn = () => X.on('gysMuMatch'), timerOn = () => X.on('gysMuTimer');
function songSet(w) { const S = new Set(Object.keys(D.plays[w] || {}).concat(D.likes[w] || [])); const r = D.rank[w]; if (r) { (r.week || []).forEach(x => S.add(x.id)); (r.all || []).forEach(id => S.add(id)); } return Array.from(S).filter(id => songOf(id)); }
function matchOf(w) {
    const a = songSet(meW), b = songSet(w); if (a.length < 2 || b.length < 2) return null;
    const B = new Set(b), common = a.filter(id => B.has(id));
    const ar = s => String((songOf(s) || {}).a || '').split(/[\/、,&]/)[0].trim(); const A1 = new Set(a.map(ar).filter(Boolean)), A2 = new Set(b.map(ar).filter(Boolean)); const ca = Array.from(A1).filter(x => A2.has(x));
    const score = (common.length * 2 + ca.length) / Math.max(4, Math.min(a.length, b.length) + Math.min(A1.size, A2.size) / 2);
    const pct = Math.max(12, Math.min(99, Math.round(35 + 64 * Math.min(1, score))));
    return { pct, common, artists: ca };
}
M.match = w => { const m = matchOf(w); if (!m) return X.toast(X.v('还算不出来', '多听几首再看'), '你们都多听点歌，匹配度就出来了'); D.match = D.match || {}; G.push(APP, { id: 'match_' + w, title: '音乐匹配度', html: () => { const L = (D.match[w] || []); return `<div class="mu-mt"><div class="mu-mtav">${G.av(APP, meW, 64)}<i>${m.pct}%</i>${G.av(APP, w, 64)}</div><b>你和 ${esc(nameOf(w))} 的音乐匹配度</b><small>${m.pct >= 85 ? '灵魂乐友' : m.pct >= 65 ? '品味相近' : m.pct >= 45 ? '有共同语言' : '可以互相安利'}</small>${L[0] && L[0].say ? `<p>「${esc(L[0].say)}」—— ${esc(nameOf(w))}</p>` : ''}</div>
  ${m.artists.length ? `<div class="mu-sec">你们都爱听的歌手</div><div class="mu-tip">${m.artists.slice(0, 10).map(esc).join(' · ')}</div>` : ''}
  <div class="mu-sec">你们都听过的歌（${m.common.length}）${m.common.length ? `<a onclick="gysMu.playIn(${esc(JSON.stringify(m.common))},0)">▶ 播放全部</a>` : ''}</div>${rows(m.common) || '<div class="mu-tip">还没有重合的歌，去 TA 的听歌排行里听几首</div>'}`; } }); };
async function taMatchSay(c) {
    const w = charW(c), m = matchOf(w); if (!m) return null;
    const say = X.plain(await X.ask(`${X.who(c)}\n你在网易云上看到你和她的音乐匹配度是 ${m.pct}%。${m.common.length ? '你们都听过：' + m.common.slice(0, 6).map(id => '《' + songOf(id).t + '》').join('') : '你们几乎没听过一样的歌'}${m.artists.length ? '，都喜欢的歌手：' + m.artists.slice(0, 4).join('、') : ''}。对这个数字说一句（像你平时说话）。只写那一句。`) || '').slice(0, 80); if (!say) return null;
    D.match = D.match || {}; (D.match[w] = D.match[w] || []).unshift({ at: Date.now(), pct: m.pct, say }); D.match[w] = D.match[w].slice(0, 30); saveD(); return { m, say };
}

/* ---------------- 定时关闭（258） ---------------- */
let TMR = null;   // { end, after:1 播完这首, by }
function timerFire() { if (!TMR) return; const by = TMR.by; TMR = null; try { const n = nowInfo(); if (n && n.playing) M.toggle(); } catch (e) {} G.repaint(APP); X.toast(by ? X.v(`${nameOf(by)} 帮你定的时间到了，停了`, '到点了，晚安') : X.v('定时关闭：已暂停', '到点了，音乐停了', '⏰ 时间到，已停止播放'), ''); }
setInterval(() => { if (!TMR) return; if (TMR.after) { const n = nowInfo(); if (!n || !n.playing || (n.d && n.t >= n.d - 1.5) || (TMR.sid && NOW && NOW.id !== TMR.sid)) timerFire(); } else if (Date.now() >= TMR.end) timerFire(); }, 1000);
const tmrLeft = () => TMR ? (TMR.after ? '播完这首' : Math.max(1, Math.ceil((TMR.end - Date.now()) / 60000)) + ' 分钟') : '';
M.timer = async () => {
    if (!timerOn()) return X.toast('定时关闭没开', '设置 → 全部开关 →「网易云定时关闭」');
    const O = [['10 分钟', 10], ['20 分钟', 20], ['30 分钟', 30], ['45 分钟', 45], ['60 分钟', 60], ['90 分钟', 90], ['播完当前歌曲', -1]];
    const i = await G.sheet(O.map(o => o[0]).concat(TMR ? ['不开启（现在还剩 ' + tmrLeft() + '）'] : []), '定时关闭'); if (i == null) return;
    if (i === O.length) { TMR = null; X.toast(X.v('定时关闭取消了', '不定时了'), ''); }
    else { const v = O[i][1]; TMR = v < 0 ? { after: 1, sid: NOW && NOW.id } : { end: Date.now() + v * 60e3 }; X.toast(X.v('定好了', '⏰ 设置成功'), v < 0 ? '这首播完就停' : `${v} 分钟后停止播放`); }
    G.repaint(APP);
};
window.gysMuTimerLeft = tmrLeft;
/* ---------------- 我的 / 主页 ---------------- */
function lv(w) { const n = Object.values(D.plays[w] || {}).reduce((a, b) => a + b, 0); return Math.min(10, 1 + Math.floor(Math.sqrt(n / 3))); }
function meTab() {
    syncBox(); const p = G.prof(APP, meW), mine = D.lists.filter(l => l.by === meW), others = D.lists.filter(l => l.by !== meW);
    const B = box();
    return `<div class="mu-me"><div class="mu-mh" onclick="gysMu.prof('me')">${G.av(APP, meW, 64)}<div><b>${esc(p.nick)}</b><small>Lv.${lv(meW)} · ${G.fmtN(p.followers)} 粉丝</small></div><span>›</span></div>
      <div class="mu-mgrid"><span onclick="gysMu.likedList()"><i>❤️</i>我喜欢的音乐<em>${(D.likes[meW] || []).length}</em></span><span onclick="gysMu.recent()"><i>🕘</i>最近播放<em>${D.hist.length}</em></span><span onclick="gysMu.local()"><i>💽</i>本地（音乐盒）<em>${B ? (B.tracks || []).length : '没开'}</em></span><span onclick="gysMu.rankPage('me')"><i>📊</i>听歌排行</span><span onclick="gysMu.report()"><i>🎞️</i>年度听歌报告</span>${window.gyxListData ? `<span onclick="gysMu.shared()"><i>🎶</i>共享歌单</span>` : ''}</div>
      <div class="mu-sec">创建的歌单（${mine.length}）<a onclick="gysMu.newList()">＋ 新建</a></div>${mine.map(l => `<div class="mu-row" onclick="gysMu.list('${l.id}')">${cover(songOf(l.ids[0]), 48)}<div class="mu-ri"><b>${esc(l.name)}</b><small>${l.ids.length} 首</small></div></div>`).join('') || '<div class="mu-tip">还没有，点「＋ 新建」</div>'}
      <div class="mu-sec">TA 们给你的 / 收藏的歌单（${others.length}）<a onclick="gysMu.askList()">✨ 叫 TA 做</a></div>${others.map(l => `<div class="mu-row" onclick="gysMu.list('${l.id}')">${cover(songOf(l.ids[0]), 48)}<div class="mu-ri"><b>${esc(l.name)}</b><small>${l.ids.length} 首 · by ${esc(nameOf(l.by))}</small></div></div>`).join('')}
      <div class="mu-menu"><div onclick="gysMu.editMe()">🪪 编辑资料（头像、背景、简介）</div><div onclick="GYS.uiPage('music')">🍎 软件外观</div><div onclick="gysMu.settings()">⚙️ 设置</div></div></div>`;
}
M.likedList = () => G.push(APP, { title: '我喜欢的音乐', html: () => `<div class="mu-lops"><span onclick="gysMu.playIn(${esc(JSON.stringify(D.likes[meW] || []))},0)">▶ 播放全部</span></div>${rows(D.likes[meW] || []) || '<div class="gys-empty">点播放页的 🤍 就收进来了</div>'}` });
M.recent = () => G.push(APP, { title: '最近播放', html: () => rows(Array.from(new Set(D.hist.map(h => h.id)))) || '<div class="gys-empty">还没听过</div>' });
M.local = () => { const ids = syncBox().map(s => s.id); G.push(APP, { title: '本地音乐（音乐盒）', right: window.gymOpenMgr ? `<span onclick="gymOpenMgr()">管理</span>` : '', html: () => `<div class="mu-tip">这些是你在「🎵 音乐盒」里传的 / 填直链的歌，能真的放出声音。在音乐盒里加的歌这里自动有。</div>${rows(ids) || '<div class="gys-empty">音乐盒里还没有歌</div>'}` }); };
M.newList = async () => { const n = await G.input('歌单名', ''); if (!n) return; D.lists.unshift({ id: G.uid('ml'), by: meW, name: X.plain(n).slice(0, 30), desc: '', ids: [], at: Date.now(), plays: 0 }); saveD(); G.repaint(APP); X.toast('建好了', '在歌的 ⋮ 里「收藏到歌单」'); };
M.editMe = () => G.editProf(APP, meW);
M.prof = w => {
    if (w !== 'me' && G.charOf(w)) genRank(w);
    G.push(APP, { id: 'prof_' + w, title: '', html: () => {
        const p = G.prof(APP, w), L = D.lists.filter(l => l.by === w), Ps = D.posts.filter(x => x.by === w), now = D.now[w] && songOf(D.now[w].id), r = D.rank[w];
        const sg = G.charOf(w) && window.gyxSongData ? (window.gyxSongData().list || []).filter(x => 'c:' + x.cid === w).map(taSong).filter(Boolean) : [];
        return `<div class="mu-pf" style="${p.bg ? `background-image:url('${p.bg}')` : ''}">${G.av(APP, w, 76)}<b>${esc(p.nick)}</b><small>Lv.${G.charOf(w) ? Math.max(lv(w), 6) : lv(w)} · ${G.fmtN(p.following || 0)} 关注 · ${G.fmtN(p.followers)} 粉丝</small><p>${esc(p.bio || '')}</p>${G.linksOf(APP, w).map(([k, h]) => `<em>${G.APPS[k].ico} ${esc(h)}</em>`).join('')}<div class="gys-acts" style="justify-content:center">${w === 'me' ? `<span class="gys-btn sm ghost" onclick="gysMu.editMe()">编辑资料</span>` : `<span class="gys-btn sm ghost" onclick="GYS.editProf('music','${w}')">✏️ 改 TA 的主页</span>`}</div></div>
          ${w !== 'me' && matchOn() ? (() => { const m = matchOf(w); return `<div class="mu-mtb" onclick="gysMu.match('${w}')"><i>💞</i><span>你们的音乐匹配度</span><b>${m ? m.pct + '%' : '--'}</b><em>›</em></div>`; })() : ''}
          ${now && w !== 'me' ? `<div class="mu-nowp" onclick="gysMu.playIn(['${now.id}'],0)">🎧 正在听：<b>${esc(now.t)}</b> - ${esc(now.a)}</div>` : ''}
          ${r && r.say ? `<div class="mu-tip">「${esc(r.say)}」</div>` : ''}
          <div class="mu-sec">听歌排行<a onclick="gysMu.rankPage('${w}')">全部 ›</a></div>${w === 'me' ? rows(myRank().slice(0, 5).map(x => x.id), { num: 1 }) : r ? rows(r.week.slice(0, 5).map(x => x.id), { num: 1 }) : (BUSY['r' + w] ? '<div class="gys-busy">⏳ 正在看 TA 听了什么…</div>' : '<div class="mu-tip">还看不到</div>')}
          ${sg.length ? `<div class="mu-sec">✍️ 原创（写给你的）</div>${rows(sg.map(s => s.id))}` : ''}
          ${L.length ? `<div class="mu-sec">创建的歌单</div>${L.map(l => `<div class="mu-row" onclick="gysMu.list('${l.id}')">${cover(songOf(l.ids[0]), 48)}<div class="mu-ri"><b>${esc(l.name)}</b><small>${l.ids.length} 首</small></div></div>`).join('')}` : ''}
          ${Ps.length ? `<div class="mu-sec">动态</div>${Ps.slice(0, 10).map(postHtml).join('')}` : ''}`;
    } });
};
const myRank = () => Object.entries(D.plays[meW] || {}).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n })).filter(x => songOf(x.id));
M.rankPage = w => G.push(APP, { title: (w === 'me' ? '我' : nameOf(w)) + '的听歌排行', right: w !== 'me' && G.charOf(w) ? `<span onclick="gysMu.__rank('${w}')">↻</span>` : '', html: () => { if (w === 'me') { const L = myRank(); return L.length ? L.slice(0, 50).map((x, i) => songRow(songOf(x.id), i, { num: 1, ids: L.map(y => y.id), n: x.n })).join('') : '<div class="gys-empty">多听几首就有了</div>'; } const r = D.rank[w]; if (!r) return '<div class="gys-busy">⏳</div>'; return `<div class="mu-sec">最近一周</div>${r.week.map((x, i) => songRow(songOf(x.id), i, { num: 1, ids: r.week.map(y => y.id), n: x.n })).join('')}<div class="mu-sec">所有时间</div>${rows(r.all, { num: 1 })}`; } });
M.__rank = w => genRank(w, 1);
M.report = () => {
    const y = new Date().getFullYear(), t0 = new Date(y, 0, 1).getTime(), H = D.hist.filter(h => h.at >= t0);
    const cnt = {}; H.forEach(h => { cnt[h.id] = (cnt[h.id] || 0) + 1; }); const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ s: songOf(id), n })).filter(x => x.s);
    const art = {}; top.forEach(x => { if (x.s.a) art[x.s.a] = (art[x.s.a] || 0) + x.n; }); const ta = Object.entries(art).sort((a, b) => b[1] - a[1])[0];
    const late = H.filter(h => { const hr = new Date(h.at).getHours(); return hr >= 0 && hr < 5; }).sort((a, b) => { const f = t => (new Date(t).getHours() * 60 + new Date(t).getMinutes()); return f(b.at) - f(a.at); })[0];
    const tog = (() => { try { const B = box(); return B && B.stats ? Object.entries(B.stats.byChar || {}).map(([k, v]) => ({ k, v })).sort((a, b) => b.v.ms - a.v.ms)[0] : null; } catch (e) { return null; } })();
    G.push(APP, { title: '', cls: 'mu-rpb', html: () => `<div class="mu-rp"><h2>${y} 年度听歌报告</h2>
      <div class="mu-rpc"><small>今年你听了</small><b>${H.length}</b><small>次歌，${Object.keys(cnt).length} 首不同的歌</small></div>
      ${top[0] ? `<div class="mu-rpc"><small>你最爱的一首</small><b class="t">《${esc(top[0].s.t)}》</b><small>听了 ${top[0].n} 次</small></div>` : ''}
      ${ta ? `<div class="mu-rpc"><small>你最常听的歌手</small><b class="t">${esc(ta[0])}</b></div>` : ''}
      ${late ? `<div class="mu-rpc"><small>${new Date(late.at).getMonth() + 1}月${new Date(late.at).getDate()}日，你很晚还没睡</small><b class="t">${G.hm(late.at)}</b><small>还在听《${esc((songOf(late.id) || {}).t || '')}》</small></div>` : ''}
      ${tog ? `<div class="mu-rpc"><small>陪你一起听最久的人</small><b class="t">${esc(nameOf('c:' + tog.k))}</b><small>一起听了 ${Math.round(tog.v.ms / 60000)} 分钟</small></div>` : ''}
      <div class="mu-rpc"><small>最常听的</small>${top.slice(0, 5).map((x, i) => `<p>${i + 1}. ${esc(x.s.t)} · ${x.n} 次</p>`).join('') || '<p>今年还没听歌</p>'}</div></div>` });
};
M.settings = () => G.push(APP, { title: '设置', html: () => `<label class="gys-f"><span>最近播放记几条（${D.cfg.keep}）</span><select onchange="gysMu.__keep(this.value)">${[100, 300, 1000, 5000].map(n => `<option ${+D.cfg.keep === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label><div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysMu.export()">导出（.txt）</span><span class="gys-btn sm ghost" onclick="gysMu.__clrHist()">清空最近播放</span></div>` });
M.__keep = v => { D.cfg.keep = +v; saveD(); };
M.__clrHist = async () => { if (await G.confirm('清空最近播放？')) { D.hist = []; saveD(); G.repaint(APP); } };
M.export = () => { const L = ['🎵 网易云音乐 导出 ' + new Date().toLocaleString(), '', '【我喜欢的音乐】'].concat((D.likes[meW] || []).map(songOf).filter(Boolean).map(s => `${s.t} - ${s.a}`), ['', '【歌单】']).concat(D.lists.map(l => `${l.name}（${nameOf(l.by)}）：` + l.ids.map(songOf).filter(Boolean).map(s => s.t).join(' / ')), ['', '【笔记】']).concat(D.posts.map(p => `${nameOf(p.by)}：${p.text}（${(songOf(p.sid) || {}).t || ''}）`)); const t = L.join('\n'); try { if (typeof saveTextFileForApp === 'function') return saveTextFileForApp(t, '网易云音乐.txt'); } catch (e) {} const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = '网易云音乐.txt'; a.click(); };

G.app(APP, {
    tabs: [['home', 'i:disc', '推荐'], ['find', 'i:compass', '发现'], ['fm', 'i:roam', '漫游'], ['post', 'i:note', '笔记'], ['me', 'i:person', '我的']],
    head, render: t => t === 'fm' ? fmTab() : t === 'post' ? postTab() : t === 'me' ? meTab() : t === 'find' ? findTab() : home()
});
window.gysMusicOpen = tab => G.open(APP, tab);
window.gysMusicOpenSong = id => { G.open(APP); if (songOf(id)) M.play(id, 1), M.openPlayer(); };
window.gysMusicOpenList = id => { G.open(APP); M.list(id); };
window.gysMusicOpenCmt = id => { G.open(APP); M.cmts(id); };
window.gysMusicOpenProf = w => { G.open(APP); M.prof(w); };

/* ---------------- 谷雨这边 ---------------- */
X.mini({ id: 'gysMusic', icon: '🎵', title: '网易云音乐', desc: '每日推荐、私人 FM、歌单、排行榜、黑胶播放页、热评、笔记、听歌排行、一起听、音乐匹配度、定时关闭', cat: '软件', onOpen: () => G.open(APP) }, 'gysMusic');
const rare = (c, k, h) => Date.now() - ((D.last[k + c.id]) || 0) > h * 3600e3;
const mark = (c, k) => { D.last[k + c.id] = Date.now(); saveD(); };
X.action({ key: 'gys_mu_post', label: '在网易云写一篇笔记分享一首歌', hint: '此刻的心情 / 想到她', need: c => rare(c, 'p', 20), run: async c => { mark(c, 'p'); const p = await taPost(c); if (!p) return null; const s = songOf(p.sid); G.notify(APP, c, `🎵 <b>${X.esc(c.name)}</b> 发了一篇笔记`, `《${s.t}》${p.text ? '：' + p.text.slice(0, 30) : ''}`, X.go('gysMusicOpen', 'post')); return { text: `在网易云分享了《${s.t}》：${p.text}`, selfNotified: true, jump: X.go('gysMusicOpen', 'post') }; } }, 'gysMusic');
X.action({ key: 'gys_mu_list', label: '在网易云给她做一个歌单', hint: '挑一堆想让她听的歌', need: c => rare(c, 'l', 120), run: async c => { mark(c, 'l'); const l = await taList(c); if (!l) return null; G.notify(APP, c, `🎵 <b>${X.esc(c.name)}</b> 给你做了一个歌单`, `「${l.name}」${l.ids.length} 首`, X.go('gysMusicOpenList', l.id)); return { text: `在网易云给她做了个歌单「${l.name}」`, selfNotified: true, jump: X.go('gysMusicOpenList', l.id) }; } }, 'gysMusic');
X.action({ key: 'gys_mu_cmt', label: '去她最近在听的歌下面写一条评论', hint: '网易云评论区，她看得到', need: c => D.hist.length > 0 && rare(c, 'c', 30), run: async c => {
    mark(c, 'c'); const s = songOf(D.hist[0].id); if (!s) return null;
    const t = X.plain(await X.ask(`${X.who(c)}\n她最近在网易云听《${s.t}》- ${s.a}。你去这首歌的评论区写一条评论（网易云评论区的口吻，可以是写给她的、也可以暗戳戳，不要引用歌词）。只写那一条。`) || '').slice(0, 300); if (!t) return null;
    s.cmts.unshift({ id: G.uid('mc'), by: charW(c), text: t, at: Date.now(), likeN: G.rnd(0, 20), likes: [], kids: [] }); s.cmtN = (s.cmtN || 0) + 1; saveD();
    G.notify(APP, c, `🎵 <b>${X.esc(c.name)}</b> 在《${X.esc(s.t)}》下面评论了`, t, X.go('gysMusicOpenCmt', s.id)); return { text: `在网易云《${s.t}》下面评论：${t}`, selfNotified: true, jump: X.go('gysMusicOpenCmt', s.id) };
} }, 'gysMusic');
X.action({ key: 'gys_mu_listen', label: '自己听会儿网易云（换了首在听的歌）', hint: '她点开你主页能看到你在听什么', need: c => rare(c, 'n', 8), run: async c => { mark(c, 'n'); await genRank(charW(c), 1); const s = D.now[charW(c)] && songOf(D.now[charW(c)].id); return s ? { text: `在网易云听《${s.t}》- ${s.a}`, selfNotified: true } : null; } }, 'gysMusic');
X.today(() => { const d = X.day(); const h = D.hist.filter(x => X.day(new Date(x.at)) === d); const ps = D.posts.filter(p => p.by !== 'me' && X.day(new Date(p.at)) === d); const ls = D.lists.filter(l => l.by !== 'me' && X.day(new Date(l.at)) === d); const rows = []; if (h.length) rows.push({ t: '你', x: `听了 ${h.length} 首 · 最近：${(songOf(h[0].id) || {}).t || ''}`, go: X.go('gysMusicOpen', 'me') }); ps.slice(0, 2).forEach(p => rows.push({ t: nameOf(p.by), x: '分享了《' + ((songOf(p.sid) || {}).t || '') + '》', go: X.go('gysMusicOpen', 'post') })); ls.slice(0, 1).forEach(l => rows.push({ t: nameOf(l.by), x: '给你做了歌单「' + l.name + '」', go: X.go('gysMusicOpenList', l.id) })); return rows.length ? { title: '🎵 网易云', rows } : null; }, 'gysMusic');
X.widget('gysMuW', { n: '网易云', sizes: ['s', 'm'], tap: () => { if (NOW) { G.open(APP); M.openPlayer(); } else G.open(APP); }, r: () => { const n = nowInfo(); const s = n ? n.s : (D.daily && songOf(D.daily.ids[0])); return `<div style="padding:10px;font-size:12px;line-height:1.6"><b style="color:#e33">🎵 ${n ? '正在播放' : '每日推荐'}</b><br>${s ? `${esc(s.t)}<br><span style="opacity:.6">${esc(s.a || '')}</span>` : '打开网易云看看'}</div>`; } }, 'gysMusic');
X.mem({ k: 'gysMuPost', ico: '🎵', n: 'TA 在网易云分享的歌', d: 'TA 在网易云写过的笔记（改了就是改那段话，删了就没了）', items: c => D.posts.filter(p => p.by === 'c:' + c.id), text: p => `《${(songOf(p.sid) || {}).t || ''}》${p.text}`, edit: (p, v) => { p.text = String(v).replace(/^《[^》]*》/, '').slice(0, 300); }, del: (c, i) => { const L = D.posts.filter(p => p.by === 'c:' + c.id); if (L[i]) D.posts = D.posts.filter(x => x !== L[i]); }, meta: p => G.ago(p.at), save: () => saveD() }, 'gysMusic');
X.mem({ k: 'gysMuList', ico: '📑', n: 'TA 给你做的歌单', d: 'TA 在网易云给你做的歌单（改了就是改歌单名，删了就没了）', items: c => D.lists.filter(l => l.by === 'c:' + c.id), text: l => l.name, edit: (l, v) => { l.name = String(v).slice(0, 30); }, del: (c, i) => { const L = D.lists.filter(l => l.by === 'c:' + c.id); if (L[i]) D.lists = D.lists.filter(x => x !== L[i]); }, meta: l => l.ids.length + ' 首 · ' + G.ago(l.at), save: () => saveD() }, 'gysMusic');
X.ctx(id => {
    const c = X.char(id); if (!c) return ''; const w = charW(c), L = [];
    const h = Array.from(new Set(D.hist.slice(0, 8).map(x => x.id))).map(songOf).filter(Boolean).slice(0, 3); if (h.length) L.push('她最近在网易云听：' + h.map(s => `《${s.t}》`).join(''));
    const n = D.now[w] && songOf(D.now[w].id); if (n) L.push(`你最近在听《${n.t}》- ${n.a}`);
    const lk = (D.likes[meW] || []).slice(0, 3).map(songOf).filter(Boolean); if (lk.length) L.push('她红心了：' + lk.map(s => `《${s.t}》`).join(''));
    return L.length ? `【网易云音乐】${L.join('；')}` : '';
}, 'gysMusic');
X.inj('gysMusic', [['网易云音乐', '网易云：她最近在听什么、TA 在听什么、她红心了哪些', '让 TA 知道你们俩最近在网易云上听的歌']]);
G.feedReg('music', () => D.posts.filter(p => Date.now() - p.at < 5 * 86400e3).slice(0, 3).map(p => { const s = songOf(p.sid); return s ? { app: APP, kind: '单曲', by: p.by, byName: nameOf(p.by), title: '《' + s.t + '》', text: (s.a || '') + (p.text ? ' · ' + p.text : ''), img: '', at: p.at, go: X.go('gysMusicOpenSong', s.id) } : null; }).filter(Boolean));
G.badge.music = () => 0;

X.css('gys-music-css', `
.gys-music{--gys-accent:#ec4141;background:#f7f7f9;color:#222}body.dark-theme .gys-music{background:#13131a;color:#eee}
.mu-hd .mu-sb{flex:1;background:rgba(0,0,0,.05);border-radius:999px;padding:7px 14px;font-size:13.5px;color:#999;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}body.dark-theme .mu-hd .mu-sb{background:#22222a}
.mu-nowb{margin-left:auto;cursor:pointer;z-index:1}.mu-nowb.on .mu-cv{animation:muSpin 8s linear infinite}
.mu-cv{display:inline-flex;align-items:center;justify-content:center;background-size:cover;background-position:center;flex-shrink:0;color:rgba(255,255,255,.9)}.mu-cv i{font-style:normal}
.mu-home{padding-bottom:20px}.mu-ent{display:flex;justify-content:space-around;padding:12px 6px}.mu-ent span{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;font-size:12px}.mu-ent i{font-style:normal;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#ff6b6b,#e33);display:flex;align-items:center;justify-content:center;font-size:21px}.mu-ent em{font-style:normal}
.mu-dcard{display:flex;align-items:center;gap:14px;margin:4px 14px 6px;padding:14px;border-radius:14px;background:linear-gradient(135deg,#ff7b7b,#d91f2d);color:#fff;cursor:pointer}.mu-dcard>div:first-child{text-align:center}.mu-dcard>div:first-child b{display:block;font-size:30px;line-height:1}.mu-dcard small{opacity:.85}.mu-dci{flex:1;min-width:0}.mu-dci b{font-size:16px}.mu-dci p{margin:3px 0 0;font-size:12.5px;opacity:.9;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.mu-dcard>span{font-size:22px}
.mu-sec{display:flex;justify-content:space-between;align-items:center;padding:16px 16px 8px;font-weight:600;font-size:16px}.mu-sec a{font-weight:400;font-size:12.5px;color:#999;cursor:pointer}
.mu-hs{display:flex;gap:12px;overflow-x:auto;padding:0 16px 4px;scrollbar-width:none}.mu-hs::-webkit-scrollbar{display:none}
.mu-lc{position:relative;width:104px;flex-shrink:0;cursor:pointer}.mu-lc b{display:block;font-size:12.5px;font-weight:400;line-height:1.35;margin-top:5px;max-height:2.7em;overflow:hidden}.mu-lc small{font-size:11px;color:#999}.mu-lc em{position:absolute;right:5px;top:5px;font-style:normal;font-size:10.5px;color:#fff;background:rgba(0,0,0,.3);border-radius:8px;padding:0 5px}
.mu-tal{display:flex;flex-direction:column;align-items:center;gap:3px;width:72px;flex-shrink:0;cursor:pointer;text-align:center}.mu-tal b{font-size:12.5px;font-weight:500}.mu-tal small{font-size:11px;color:#999;max-width:72px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.mu-row{display:flex;align-items:center;gap:12px;padding:8px 16px;cursor:pointer}.mu-row.cur b{color:#ec4141}.mu-ri{flex:1;min-width:0}.mu-ri b{display:block;font-size:15px;font-weight:400;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.mu-ri u{text-decoration:none;font-size:10px;border:1px solid #ec4141;color:#ec4141;border-radius:3px;padding:0 3px;vertical-align:2px}.mu-ri u.ok{border-color:#2fb36a;color:#2fb36a}.mu-ri small{font-size:12px;color:#999;display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.mu-ri small i{font-style:normal;color:#c98a3a}
.mu-n{width:26px;text-align:center;font-style:normal;color:#999;font-size:16px}.mu-n.top{color:#ec4141;font-weight:700}.mu-more{color:#bbb;padding:0 4px;font-size:18px}
.mu-tip{padding:10px 16px;font-size:12.5px;color:#999;line-height:1.6}.mu-tip a{color:#ec4141;cursor:pointer}
.mu-dhd{padding:20px 16px 12px;background:linear-gradient(135deg,#ff7b7b,#d91f2d);color:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:8px}.mu-dhd b{font-size:40px;line-height:1;width:100%}.mu-dhd small{width:100%;opacity:.85}.mu-dhd .gys-btn{background:#fff;color:#e33}.mu-dhd .gys-btn.ghost{background:transparent;color:#fff;border-color:#fff}
.mu-ch{color:#fff;padding:16px;margin:10px 12px 4px;border-radius:12px}.mu-ch b{font-size:18px;display:block}.mu-ch small{opacity:.85}
.mu-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:12px 16px}.mu-grid .mu-lc{width:auto}.mu-grid .mu-cv{width:100%!important;height:auto!important;aspect-ratio:1}
.mu-lh{display:flex;gap:14px;padding:18px 16px;color:#fff}.mu-lhi{flex:1;min-width:0}.mu-lhi b{font-size:18px;display:block}.mu-lhi span{display:inline-flex;align-items:center;gap:5px;font-size:13px;margin:8px 0;cursor:pointer;opacity:.9}.mu-lhi p{font-size:12.5px;opacity:.8;margin:0;max-height:4.2em;overflow:hidden}
.mu-lops{display:flex;gap:16px;padding:12px 16px;border-bottom:.5px solid rgba(0,0,0,.06);font-size:14px}.mu-lops span{cursor:pointer}.mu-lops span:first-child{font-weight:600}
.gys-root.gys-music .mu-pb,.mu-pb{background:#111!important}
.mu-player{position:relative;min-height:100%;color:#fff;display:flex;flex-direction:column;overflow:hidden;padding-bottom:30px}.mu-pbg{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(40px) brightness(.55);z-index:0}.mu-player>*:not(.mu-pbg){position:relative;z-index:1}
.mu-ph{display:flex;align-items:center;gap:10px;padding:10px 14px}.mu-ph>span{font-size:24px;cursor:pointer;width:30px;text-align:center}.mu-ph>div{flex:1;text-align:center;min-width:0}.mu-ph b{display:block;font-size:16.5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.mu-ph small{opacity:.7;font-size:12.5px;cursor:pointer}
.mu-disc{position:relative;height:330px;display:flex;align-items:center;justify-content:center;cursor:pointer}.mu-vinyl{width:270px;height:270px;border-radius:50%;background:radial-gradient(circle,#2a2a2a 0 55%,#111 56% 58%,#222 59% 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 10px rgba(255,255,255,.08);animation:muSpin 20s linear infinite}.mu-player.paused .mu-vinyl{animation-play-state:paused}
.mu-needle{position:absolute;top:-6px;left:50%;width:90px;height:130px;margin-left:-14px;background:linear-gradient(170deg,#ddd 0 6%,transparent 6%),linear-gradient(#ccc,#999);clip-path:polygon(10% 0,24% 0,24% 70%,70% 100%,60% 100%,12% 74%);transform-origin:14px 14px;transform:rotate(-4deg);transition:transform .5s;z-index:2}.mu-player.paused .mu-needle{transform:rotate(-30deg)}
@keyframes muSpin{to{transform:rotate(360deg)}}
.mu-lyr{height:330px;overflow-y:auto;text-align:center;padding:20px 24px;box-sizing:border-box;cursor:pointer}.mu-lyr p{margin:12px 0;font-size:15px;opacity:.85}.mu-lyr p.dim{opacity:.5;margin-top:120px}
.mu-tg{display:flex;align-items:center;justify-content:center;gap:4px;font-size:12.5px;opacity:.9}.mu-tg em{font-style:normal;margin-left:4px}
.mu-nosrc{text-align:center;font-size:12px;opacity:.75;margin-top:8px}.mu-nosrc a{color:#ff9a9a;cursor:pointer}
.mu-pops{display:flex;justify-content:space-around;padding:18px 30px 6px;font-size:22px}.mu-pops span{cursor:pointer;position:relative}.mu-pops sup{position:absolute;left:70%;top:-6px;font-size:10px;opacity:.8}
.mu-prog{margin:10px 26px 0;height:3px;background:rgba(255,255,255,.25);border-radius:2px}.mu-prog i{display:block;height:100%;background:#fff;border-radius:2px;transition:width .9s linear}
.mu-tm{display:flex;justify-content:space-between;margin:4px 26px 0;font-size:11px;opacity:.6}
.mu-ctl{display:flex;justify-content:center;align-items:center;gap:44px;padding:18px 0;font-size:26px}.mu-ctl span{cursor:pointer}.mu-ctl .pp{width:62px;height:62px;border:1.5px solid rgba(255,255,255,.8);border-radius:50%;display:flex;align-items:center;justify-content:center}
.mu-cs{display:flex;gap:12px;align-items:center;padding:12px 16px;border-bottom:8px solid rgba(0,0,0,.04)}.mu-cs b{display:block}.mu-cs small{color:#999}
.mu-csort{display:flex;gap:16px;padding:10px 16px;font-size:14px;color:#999}.mu-csort span{cursor:pointer}.mu-csort span.on{color:inherit;font-weight:600}.mu-csort a{margin-left:auto;cursor:pointer}
.mu-c{display:flex;gap:10px;padding:10px 16px 6px}.mu-c>div{flex:1;min-width:0;border-bottom:.5px solid rgba(0,0,0,.06);padding-bottom:8px}.mu-c.kid{padding:8px 0 0}.mu-c.kid>div{border:none}.mu-ch2{display:flex;justify-content:space-between}.mu-ch2 b{font-size:13.5px;font-weight:400;color:#666;cursor:pointer}body.dark-theme .mu-ch2 b{color:#aaa}.mu-ch2 span{font-size:12px;color:#999;cursor:pointer}.mu-ch2 span.on{color:#ec4141}.mu-c small{font-size:11px;color:#bbb}.mu-c p{margin:4px 0 0;font-size:15px;line-height:1.55;cursor:pointer}.mu-c p a{color:#507daf}
.mu-cin{display:flex;gap:8px;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));border-top:.5px solid rgba(0,0,0,.08);background:inherit}.mu-cin input{flex:1;border:none;background:rgba(0,0,0,.05);border-radius:999px;padding:9px 14px;font-size:14px;color:inherit;outline:none}.mu-cin span{color:#ec4141;align-self:center;cursor:pointer}
.mu-sbox{display:flex;gap:8px;padding:10px 16px}.mu-sbox input{flex:1;border:none;background:rgba(0,0,0,.05);border-radius:999px;padding:9px 14px;font-size:14px;color:inherit;outline:none}.mu-sbox span{align-self:center;color:#ec4141;cursor:pointer}
.mu-chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px}.mu-chips span{background:rgba(0,0,0,.05);border-radius:999px;padding:5px 12px;font-size:13px;cursor:pointer}
.mu-fm{min-height:100%;background:linear-gradient(#3a2a3a,#1a1420);color:#fff;padding:14px 20px 30px;box-sizing:border-box}.mu-fmm{display:flex;justify-content:center;gap:24px;font-size:15px;opacity:.7}.mu-fmm span{cursor:pointer}.mu-fmm span.on{opacity:1;font-weight:600;border-bottom:2px solid #ec4141}
.mu-fmc{margin:26px auto 0;border-radius:20px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:8px;max-width:300px;box-shadow:0 20px 50px rgba(0,0,0,.4)}.mu-fmc b{font-size:20px;margin-top:8px}.mu-fmc small{opacity:.8}
.mu-fmo{display:flex;justify-content:space-around;align-items:center;margin:26px 10px 0;font-size:24px}.mu-fmo span{cursor:pointer}.mu-fmo .pp{width:58px;height:58px;border-radius:50%;background:#ec4141;display:flex;align-items:center;justify-content:center}
.mu-pbar{padding:10px 16px}.mu-ncols{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 6px 20px}.mu-ncols>div{display:flex;flex-direction:column;gap:6px}
.mu-nc{background:#fff;border-radius:8px;overflow:hidden;cursor:pointer}body.dark-theme .mu-nc{background:#1d1d24}.mu-ncimg{display:flex;align-items:flex-end;aspect-ratio:3/4;background:#ddd center/cover no-repeat;padding:8px;box-sizing:border-box}.mu-ncimg i{font-style:normal;color:#fff;font-size:12px;text-shadow:0 1px 3px rgba(0,0,0,.4)}
.mu-nc p{margin:6px 8px;font-size:13.5px;line-height:1.4;max-height:2.8em;overflow:hidden}.mu-nca{display:flex;align-items:center;gap:5px;padding:0 8px 8px;font-size:11.5px;color:#888}.mu-nca em{font-style:normal;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.mu-nca small.on{color:#ec4141}
.mu-nimg{width:100%;display:block}.mu-chs{display:flex;gap:10px;overflow-x:auto;padding:0 16px}.mu-chc{flex:0 0 240px;border-radius:12px;padding:12px;color:#fff;cursor:pointer}.mu-chc b{font-size:16px}.mu-chc p{margin:5px 0 0;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.mu-chc i{font-style:normal;opacity:.75}.mu-post{display:flex;gap:10px;padding:12px 16px;border-bottom:.5px solid rgba(0,0,0,.06)}.mu-pi{flex:1;min-width:0}.mu-pi>b{font-size:14.5px;color:#507daf;cursor:pointer}.mu-pi>small{display:block;font-size:11.5px;color:#999}.mu-pi>p{margin:6px 0;font-size:15px;line-height:1.55}
.mu-ps{display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.04);border-radius:8px;padding:7px;cursor:pointer}.mu-ps>div{flex:1;min-width:0}.mu-ps b{display:block;font-size:14px;font-weight:400}.mu-ps small{font-size:12px;color:#999}.mu-ps i{font-style:normal;color:#ec4141}
.mu-pa{display:flex;gap:26px;margin-top:8px;font-size:13px;color:#999}.mu-pa span{cursor:pointer}.mu-pa span.on{color:#ec4141}.mu-pc{background:rgba(0,0,0,.035);border-radius:6px;padding:6px 10px;margin-top:8px}.mu-pc p{margin:3px 0;font-size:13.5px}.mu-pc b{color:#507daf;font-weight:400}
.mu-me{padding-bottom:20px}.mu-mh{display:flex;align-items:center;gap:12px;padding:18px 16px;cursor:pointer}.mu-mh>div{flex:1}.mu-mh b{font-size:19px;display:block}.mu-mh small{color:#999}
.mu-mgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px}.mu-mgrid span{background:#fff;border-radius:12px;padding:12px;display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer}body.dark-theme .mu-mgrid span{background:#1d1d24}.mu-mgrid i{font-style:normal;font-size:20px}.mu-mgrid em{margin-left:auto;font-style:normal;color:#999;font-size:12px}
.mu-menu{margin:16px;background:#fff;border-radius:12px;overflow:hidden}body.dark-theme .mu-menu{background:#1d1d24}.mu-menu div{padding:13px 14px;border-bottom:.5px solid rgba(0,0,0,.06);cursor:pointer;font-size:14.5px}
.mu-pf{display:flex;flex-direction:column;align-items:center;gap:4px;padding:26px 16px 8px;text-align:center;background:linear-gradient(#ffd9d9,transparent) center/cover no-repeat}.mu-pf b{font-size:20px}.mu-pf small{color:#888}.mu-pf p{margin:4px 0;font-size:13px;color:#777}.mu-pf em{font-style:normal;font-size:12px;color:#888}
.mu-nowp{margin:6px 16px;padding:10px 12px;border-radius:10px;background:rgba(236,65,65,.08);font-size:13.5px;cursor:pointer}
.mu-rpb{background:linear-gradient(160deg,#2b1055,#7597de)!important}.mu-rp{color:#fff;padding:20px 18px 40px}.mu-rp h2{font-size:24px;margin:6px 0 18px}.mu-rpc{background:rgba(255,255,255,.12);border-radius:16px;padding:16px;margin-bottom:12px}.mu-rpc small{display:block;opacity:.8;font-size:13px}.mu-rpc b{display:block;font-size:40px;margin:4px 0}.mu-rpc b.t{font-size:22px}.mu-rpc p{margin:4px 0;font-size:14px}
`);

(async () => { await G.ready(); D = Object.assign(D, await ST.get('d', {}) || {}); ['songs', 'likes', 'plays', 'rank', 'now', 'last'].forEach(k => { if (!D[k] || typeof D[k] !== 'object' || Array.isArray(D[k])) D[k] = {}; }); ['lists', 'hist', 'posts', 'fm'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; }); D.cfg = Object.assign({ keep: 300 }, D.cfg || {}); })();
window.gysMuState = () => D;
// 💞 匹配度 / ⏰ 定时关闭（258）
X.action({ key: 'gys_mu_match', label: '看到你们网易云的音乐匹配度，跟她说一句', hint: '「我们居然有 87%」', need: c => matchOn() && !!matchOf(charW(c)) && rare(c, 'mt', 72), run: async c => { mark(c, 'mt'); const r = await taMatchSay(c); if (!r) return null; G.notify(APP, c, `💞 <b>${X.esc(c.name)}</b> 看了你们的音乐匹配度`, `${r.m.pct}% ·「${r.say}」`, X.go('gysMusicOpenMatch', charW(c))); return { text: `看到你们网易云音乐匹配度 ${r.m.pct}%，说：${r.say}`, selfNotified: true, jump: X.go('gysMusicOpenMatch', charW(c)) }; } }, 'gysMuMatch');
X.action({ key: 'gys_mu_timer', label: '看她深夜还在听歌，帮她定个定时关闭', hint: '让她早点睡', need: c => { if (!timerOn() || TMR || !NOW) return false; const h = new Date().getHours(); const n = nowInfo(); return (h >= 23 || h < 4) && n && n.playing && rare(c, 'tm', 20); }, run: async c => { mark(c, 'tm'); const v = G.pick([15, 20, 30]); TMR = { end: Date.now() + v * 60e3, by: charW(c) }; const note = X.plain(await X.ask(`${X.who(c)}\n已经很晚了，她还在网易云听歌。你帮她把定时关闭设成了 ${v} 分钟。跟她说一句（哄她睡 / 叮嘱 / 撒娇都行）。只写那一句。`) || '').slice(0, 60) || '早点睡'; D.timers = (D.timers || []).concat([{ at: Date.now(), by: charW(c), min: v, note }]).slice(-50); saveD(); G.repaint(APP); G.notify(APP, c, `⏰ <b>${X.esc(c.name)}</b> 帮你定了 ${v} 分钟后关闭`, note, X.go('gysMusicOpenPlayer')); return { text: `她深夜还在听歌，你帮她把网易云定时关闭设成 ${v} 分钟，说：${note}`, selfNotified: true }; } }, 'gysMuTimer');
window.gysMusicOpenMatch = w => { G.open(APP); M.prof(w); M.match(w); };
window.gysMusicOpenPlayer = () => { G.open(APP); if (NOW) M.openPlayer(); };
X.today(() => { if (!matchOn()) return null; const L = cast().map(w => ({ w, m: matchOf(w) })).filter(x => x.m); if (!L.length) return null; return { title: '💞 音乐匹配度', rows: L.slice(0, 3).map(x => { const s = ((D.match || {})[x.w] || [])[0]; return { t: nameOf(x.w), x: `${x.m.pct}% · 一起听过 ${x.m.common.length} 首${s && X.day(new Date(s.at)) === X.day() ? ' ·「' + s.say + '」' : ''}`, go: X.go('gysMusicOpenMatch', x.w) }; }) }; }, 'gysMuMatch');
X.today(() => { if (!timerOn()) return null; const T = (D.timers || []).filter(t => X.day(new Date(t.at)) === X.day()); if (!TMR && !T.length) return null; return { title: '⏰ 定时关闭', rows: (TMR ? [{ t: TMR.by ? nameOf(TMR.by) + ' 定的' : '我', x: '还剩 ' + tmrLeft(), go: X.go('gysMusicOpenPlayer') }] : []).concat(T.slice(-2).map(t => ({ t: nameOf(t.by), x: `帮你定了 ${t.min} 分钟 ·「${t.note}」`, go: X.go('gysMusicOpenPlayer') }))) }; }, 'gysMuTimer');
X.widget('gysMuMatchW', { n: '音乐匹配度', sizes: ['s'], tap: () => { const w = cast()[0]; if (w) window.gysMusicOpenMatch(w); else G.open(APP); }, r: () => { const w = cast()[0], m = w && matchOf(w); return `<div style="padding:10px;font-size:12px;line-height:1.6"><b style="color:#fc3d49">💞 音乐匹配度</b><br>${m ? `和 ${esc(nameOf(w))}<br><span style="font-size:22px;font-weight:700">${m.pct}%</span>` : '多听几首再看'}</div>`; } }, 'gysMuMatch');
X.widget('gysMuTimerW', { n: '定时关闭', sizes: ['s'], tap: () => { G.open(APP); if (NOW) { M.openPlayer(); M.timer(); } }, r: () => `<div style="padding:10px;font-size:12px;line-height:1.6"><b style="color:#fc3d49">⏰ 定时关闭</b><br>${TMR ? '还剩 ' + tmrLeft() + (TMR.by ? '<br>' + esc(nameOf(TMR.by)) + ' 定的' : '') : NOW ? '没开 · 点一下设' : '没在放歌'}</div>` }, 'gysMuTimer');
X.mem({ k: 'gysMuMatch', ico: '💞', n: 'TA 说过的音乐匹配度', d: 'TA 看到你们音乐匹配度时说的话（改了就是改那句，删了就没了）', items: c => ((D.match || {})['c:' + c.id] || []), text: x => `${x.pct}%：${x.say}`, edit: (x, v) => { x.say = String(v).replace(/^\d+%：/, '').slice(0, 80); }, del: (c, i) => { const L = (D.match || {})['c:' + c.id] || []; L.splice(i, 1); }, meta: x => G.ago(x.at), save: () => saveD() }, 'gysMuMatch');
X.mem({ k: 'gysMuTimer', ico: '⏰', n: 'TA 帮你定的睡前定时', d: '深夜 TA 帮你定的网易云定时关闭和那句话（改了就是改那句，删了就没了）', items: c => (D.timers || []).filter(t => t.by === 'c:' + c.id), text: t => `${t.min} 分钟：${t.note}`, edit: (t, v) => { t.note = String(v).replace(/^\d+ 分钟：/, '').slice(0, 60); }, del: (c, i) => { const L = (D.timers || []).filter(t => t.by === 'c:' + c.id); D.timers = (D.timers || []).filter(t => t !== L[i]); }, meta: t => G.ago(t.at), save: () => saveD() }, 'gysMuTimer');
X.css('gys-music-258-css', `
.mu-mtb{display:flex;align-items:center;gap:8px;margin:10px 16px;padding:12px 14px;border-radius:12px;background:linear-gradient(90deg,#fff0f1,#fff);cursor:pointer;font-size:14px}body.dark-theme .mu-mtb{background:linear-gradient(90deg,#3a1f22,#1d1d1d)}
.mu-mtb i{font-style:normal}.mu-mtb span{flex:1}.mu-mtb b{color:#fc3d49;font-size:18px}.mu-mtb em{font-style:normal;color:#aaa}
.mu-mt{display:flex;flex-direction:column;align-items:center;gap:6px;padding:26px 16px 14px;text-align:center}
.mu-mtav{display:flex;align-items:center;gap:14px}.mu-mtav i{font-style:normal;font-size:26px;font-weight:800;color:#fc3d49}
.mu-mt>b{font-size:16px;margin-top:8px}.mu-mt>small{color:#fc3d49;border:1px solid #fc3d49;border-radius:999px;padding:1px 10px;font-size:12px}.mu-mt>p{color:#666;font-size:14px;margin:8px 0 0;line-height:1.6}
.mu-pops span.on{color:#fc3d49}.mu-pops sup{font-size:10px}
`);
