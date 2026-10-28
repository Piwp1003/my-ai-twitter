/* 🎶 抖音：照着抖音做的整页短视频软件——上下滑的推荐流（推荐 / 关注 / 同城）、双击点赞、评论区、发作品（配乐接网易云）、直播（弹幕、礼物、连着钱包）、朋友、消息和私信、个人主页；TA 会发视频、开直播叫你、给你点赞评论、私信转视频给你。原来的「📺 直播间」插件并进来了 */
if (window.__gysDouyin) return; window.__gysDouyin = 1;
const G = window.GYS, APP = 'douyin', esc = G.esc;
X.feat('gysDouyin', { n: '🎶 抖音', desc: '抖音：上下滑刷视频、双击点赞、评论、发作品、直播（弹幕礼物）、朋友、私信、主页；TA 会发视频、开直播、点赞评论你、私信转视频给你' });
const ST = X.store('gysdouyin');
let D = { vids: [], lives: [], dms: {}, follow: ['me'], notes: [], cfg: { auto: 1 }, last: {}, migrated: 0 };
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();
window.__gyxLive = 1;   // 278：挡住老合集里的旧直播间（86）
const Y = window.gysDy = {};
const BUSY = {};
const P = (id, def, vars) => X.pl(id, def, vars);
const nameOf = w => G.nick(APP, w);
const charW = c => 'c:' + c.id;
const cast = () => G.chars().map(c => 'c:' + c.id);
const vidOf = id => D.vids.find(v => v.id === id);
const liveOf = id => D.lives.find(v => v.id === id);
const isFollow = w => w === 'me' || (D.follow || []).includes(w) || !!G.charOf(w);
const SCENES = ['🌆', '🍜', '🐱', '🎸', '🏀', '📚', '🌊', '🎮', '💄', '🍰', '🚴', '🌸', '🎤', '🧋', '🏕️', '🐶', '🌃', '👗', '🎨', '☕'];
const bgOf = s => { let h = 0; for (const ch of String(s || 'x')) h = (h * 31 + ch.charCodeAt(0)) % 360; return `linear-gradient(160deg,hsl(${h},45%,30%),hsl(${(h + 60) % 360},50%,14%))`; };
function passer(name) { name = X.plain(name || '').slice(0, 16) || G.pick(['用户' + G.rnd(10000, 99999), '今天也要开心', '干饭人', '小鹿乱撞', '一颗柠檬', '夜猫子']); const w = 'x:dp_' + name; if (!G.hasProf(APP, w)) G.prof(APP, w, { nick: name, emoji: G.pick(['🐼', '🐰', '🦊', '🐨', '🐯', '🌻', '🍓', '⭐']), followers: G.rnd(10, 30000), gen: true }); return w; }
const whoByName = n => { n = String(n || '').trim(); return G.people().find(w => nameOf(w) === n || (G.base(w) || {}).name === n) || ''; };
// 一条视频：{ id, by, ico, img, scene 画面, cap 文案, tags, music, dur, loc, at, likes:[], likeN, favs:[], shareN, cmts, cmtN, cmtGen, vis, plays }
function mkVid(o) {
    const v = Object.assign({ id: G.uid('dv'), by: 'me', ico: G.pick(SCENES), img: '', scene: '', cap: '', tags: [], music: '', dur: G.rnd(8, 60), loc: '', at: Date.now(), likes: [], likeN: 0, favs: [], shareN: 0, cmts: [], cmtN: 0, cmtGen: 0, vis: 'public', plays: 0 }, o);
    v.tags = Array.from(new Set((v.tags || []).map(t => X.plain(t).replace(/^#/, '').slice(0, 14)).filter(Boolean).concat((v.cap.match(/#([^#\s]{1,14})/g) || []).map(x => x.slice(1))))).slice(0, 6);
    if (!v.music) v.music = '原声 - ' + nameOf(v.by);
    D.vids.unshift(v); if (D.vids.length > 400) { const keep = D.vids.filter(x => x.by === 'me' || G.charOf(x.by)); D.vids = D.vids.slice(0, 300).concat(keep.filter(x => D.vids.indexOf(x) >= 300)); } saveD(); return v;
}
const pickMusic = () => { try { const M = window.gysMuState && window.gysMuState(); const L = M ? Object.values(M.songs || {}) : []; if (L.length && Math.random() < 0.6) { const s = G.pick(L); return s.t + ' - ' + (s.a || ''); } } catch (e) {} return ''; };

/* ---------------- 提示词 ---------------- */
const DEF_FEED = `你在模拟抖音的「{{栏目}}」推荐流。会出现在这里的人：
{{人}}
{{要求}}
写 {{条数}} 条短视频：大多是网友 / 博主（搞笑、美食、萌宠、颜值、vlog、知识、情感、剧情、才艺、探店……要像真的抖音那样五花八门），偶尔有上面认识的人发的（按各自性格）。每条写「画面」（这个视频里在发生什么，一两句，像在描述你刷到的画面）、「文案」（发布者写的标题，可以带 #话题#）、背景音乐（真实存在的歌或「原声」）。
只输出 JSON 数组：[{"by":"发布者昵称（认识的人用他的名字）","ico":"一个代表画面的 emoji","scene":"画面","cap":"文案","music":"背景音乐","dur":秒数,"likes":点赞数,"loc":"同城的话写城市，不是就空"}]`;
const DEF_CMT = `抖音上，{{作者}}发了一条视频。画面：{{画面}}；文案：{{文案}}
已有的评论：
{{已有}}
会出现在这里的人：
{{人}}
写 {{条数}} 条评论：大多是网友（抖音评论区那种：玩梗、「来了来了」、@朋友、神评论、问链接、「这是我不花钱就能看的吗」……），偶尔有认识的人（按性格；作者是认识的人时，熟人更可能出现）。可以有回复别人的。
只输出 JSON 数组：[{"by":"昵称","text":"评论","likes":点赞数,"re":"回复的是哪条评论的作者（不是就空）"}]`;
const DEF_TA = `{{我是谁}}
你要发一条抖音（{{要求}}）。按你的性格、生活、最近的事来：拍了什么、配什么文案和音乐。最近你们聊的：
{{最近}}
只输出 JSON：{"ico":"一个代表画面的 emoji","scene":"画面（视频里拍的是什么）","cap":"文案（可以带 #话题#）","music":"背景音乐（真实的歌或「原声」）","dur":秒数,"loc":"在哪（可空）"}`;
const DEF_LIVE = `{{我是谁}}
你正在抖音直播《{{标题}}》（{{画面}}）。直播间里现在有 {{人数}} 人。最近的弹幕和你说过的话：
{{记录}}
{{情况}}
接着播：先说你（主播）要说的话（对着镜头，口语，1~3 句；她在直播间时你认得出她，会特别回她，但别太露骨让观众起哄就好），再写 3~6 条观众弹幕（网友的口吻，也可能有人刷礼物）。
只输出 JSON：{"host":"你说的话","danmu":[{"by":"昵称","text":"弹幕","gift":"送的礼物（没有就空）"}]}`;
const DEF_DM = `{{我是谁}}
你们在抖音私信里聊天（抖音私信：短、常常甩视频、表情多）。最近平时聊的：
{{平时}}
抖音私信里最近的：
{{记录}}
回她 1~3 条。只输出 JSON 数组：[{"text":"消息"}]`;
const DEF_LIVES = `你在模拟抖音的「直播」广场。写 {{条数}} 个正在直播的直播间（带货、唱歌、打游戏、聊天、户外、才艺、学习陪伴……）。
只输出 JSON 数组：[{"host":"主播昵称","ico":"emoji","title":"直播标题","scene":"画面","viewers":在线人数}]`;
X.plGroup('🎶 抖音', 'gysDouyin', [
    ['dy.feed', '刷新推荐流', '刷到底 / 点刷新 / 搜索时', '{{栏目}} {{人}} {{要求}} {{条数}}'],
    ['dy.cmt', '视频的评论区', '打开评论时', '{{作者}} {{画面}} {{文案}} {{已有}} {{人}} {{条数}}'],
    ['dy.ta', 'TA 发一条抖音', 'TA 自己想发时', '{{我是谁}} {{要求}} {{最近}}'],
    ['dy.live', 'TA / 主播直播中', '直播间里每隔一会儿', '{{我是谁}} {{标题}} {{画面}} {{人数}} {{记录}} {{情况}}'],
    ['dy.dm', '抖音私信里 TA 回你', '你在抖音私信 TA 时', '{{我是谁}} {{平时}} {{记录}}'],
    ['dy.lives', '直播广场', '打开直播栏目时', '{{条数}}']
], { 'dy.feed': DEF_FEED, 'dy.cmt': DEF_CMT, 'dy.ta': DEF_TA, 'dy.live': DEF_LIVE, 'dy.dm': DEF_DM, 'dy.lives': DEF_LIVES });

const peopleLines = () => cast().concat(G.npcs().slice(0, 6).map(n => 'n:' + n.id)).map(w => `· ${(G.base(w) || {}).name}（抖音昵称「${nameOf(w)}」）：${String((G.base(w) || {}).persona || '').slice(0, 70)}`).join('\n') || '（没有）';
async function genFeed(ch, req) {
    if (BUSY.f) return; BUSY.f = 1; G.repaint(APP);
    try {
        const o = X.json(await X.ask(P('dy.feed', DEF_FEED, { 栏目: { rec: '推荐', follow: '关注', city: '同城' }[ch] || '推荐', 人: peopleLines(), 要求: req || (ch === 'city' ? '都是同城的（写上城市）' : ch === 'follow' ? '都是上面认识的人发的' : ''), 条数: 8 })));
        if (Array.isArray(o)) o.slice(0, 10).forEach(x => { if (!x || (!x.scene && !x.cap)) return; let w = whoByName(x.by); if (!w || w === 'me') w = passer(x.by); if (D.vids.some(v => v.by === w && v.scene === X.plain(x.scene || '').slice(0, 200) && v.cap === X.plain(x.cap || '').slice(0, 200))) return; mkVid({ by: w, ico: X.plain(x.ico || '').slice(0, 4) || G.pick(SCENES), scene: X.plain(x.scene || '').slice(0, 200), cap: X.plain(x.cap || '').slice(0, 200), music: X.plain(x.music || '').slice(0, 40), dur: Math.max(5, Math.min(180, parseInt(x.dur, 10) || 20)), likeN: Math.max(0, parseInt(x.likes, 10) || G.rnd(10, 90000)), shareN: G.rnd(0, 3000), loc: X.plain(x.loc || '').slice(0, 10), at: Date.now() - G.rnd(1, 600) * 60e3, feed: ch }); });
    } catch (e) {} finally { BUSY.f = 0; G.repaint(APP); }
}
const flat = v => { const L = []; (v.cmts || []).forEach(c => { L.push(c); (c.kids || []).forEach(k => L.push(k)); }); return L; };
async function genCmts(v, n) {
    if (!v || BUSY['c' + v.id]) return; BUSY['c' + v.id] = 1; G.repaint(APP);
    try {
        const o = X.json(await X.ask(P('dy.cmt', DEF_CMT, { 作者: nameOf(v.by) + (v.by === 'me' ? '（就是用户本人）' : ''), 画面: v.scene, 文案: v.cap, 已有: flat(v).slice(0, 8).map(c => `${nameOf(c.by)}：${c.text}`).join('\n') || '（还没有）', 人: peopleLines(), 条数: n || 8 })));
        if (Array.isArray(o)) o.slice(0, 12).forEach(x => { if (!x || !x.text) return; let w = whoByName(x.by); if (!w || w === 'me') w = passer(x.by); const c = { id: G.uid('dc'), by: w, text: X.plain(x.text).slice(0, 200), at: Date.now() - G.rnd(1, 300) * 60e3, likeN: Math.max(0, parseInt(x.likes, 10) || G.rnd(0, 2000)), likes: [], kids: [] }; const re = x.re && v.cmts.find(k => nameOf(k.by) === x.re); if (re) { c.to = re.by; re.kids.push(c); } else v.cmts.push(c); });
        v.cmtGen = Date.now(); v.cmtN = Math.max(v.cmtN || 0, flat(v).length); saveD();
    } catch (e) {} finally { BUSY['c' + v.id] = 0; G.repaint(APP); }
}
async function taVid(c, req) {
    const o = X.json(await X.ask(P('dy.ta', DEF_TA, { 我是谁: X.who(c), 要求: req || '日常', 最近: X.recent(c, 8) || '（最近没怎么聊）' }))); if (!o || (!o.scene && !o.cap)) return null;
    const v = mkVid({ by: charW(c), ico: X.plain(o.ico || '').slice(0, 4) || G.pick(SCENES), scene: X.plain(o.scene || '').slice(0, 200), cap: X.plain(o.cap || '').slice(0, 200), music: X.plain(o.music || '').slice(0, 40), dur: Math.max(5, Math.min(180, parseInt(o.dur, 10) || 20)), loc: X.plain(o.loc || '').slice(0, 10), likeN: G.rnd(20, 3000), shareN: G.rnd(0, 50) });
    genCmts(v, 5); return v;
}

/* ---------------- 首页：上下滑 ---------------- */
let LASTV = '', CH = 'rec', IDX = { rec: 0, follow: 0, city: 0 }, CMT = null, REPLY = null;
const feedOf = ch => D.vids.filter(v => v.vis !== 'self' && (ch === 'follow' ? (v.by !== 'me' && isFollow(v.by)) : ch === 'city' ? !!v.loc : v.by !== 'me' || true));
function vidHtml(v, i) {
    const lk = v.likes.includes('me'), fv = v.favs.includes('me');
    return `<div class="dy-v" data-i="${i}" style="background:${v.img ? `url('${v.img}') center/cover` : bgOf(v.scene + v.id)}" ondblclick="gysDy.dbl(event,'${v.id}')">
      ${v.img ? '' : `<div class="dy-scene"><i>${esc(v.ico)}</i><p>${esc(v.scene)}</p></div>`}
      <div class="dy-rail"><span class="dy-ra" onclick="gysDy.prof('${v.by}')">${G.av(APP, v.by, 46)}${!isFollow(v.by) ? `<b onclick="event.stopPropagation();gysDy.follow('${v.by}')">＋</b>` : ''}</span>
        <span class="${lk ? 'on' : ''}" onclick="gysDy.like('${v.id}')"><i>${lk ? '❤️' : '🤍'}</i>${G.fmtN(v.likeN + v.likes.length)}</span>
        <span onclick="gysDy.cmts('${v.id}')"><i>💬</i>${G.fmtN(v.cmtN || flat(v).length)}</span>
        <span class="${fv ? 'on' : ''}" onclick="gysDy.fav('${v.id}')"><i>${fv ? '⭐' : '☆'}</i>${G.fmtN(v.favs.length + Math.round(v.likeN / 20))}</span>
        <span onclick="gysDy.share('${v.id}')"><i>↪</i>${G.fmtN(v.shareN || 0)}</span>
        <span class="dy-disc">${G.av(APP, v.by, 30)}</span></div>
      <div class="dy-info">${v.loc ? `<em>📍 ${esc(v.loc)}</em>` : ''}<b onclick="gysDy.prof('${v.by}')">@${esc(nameOf(v.by))}</b> <small>· ${G.ago(v.at)}</small><p>${esc(v.cap).replace(/#([^#\s]{1,14})/g, '<u>#$1</u>')}</p><div class="dy-mu">♪ <span><i>${esc(v.music)}</i></span></div></div>
      <div class="dy-prog"><i style="animation-duration:${v.dur}s"></i></div></div>`;
}
// 🎬 一起看（277）：「一起听 · 一起看」（贴链接 / 官方网页）和「一起看电影」（本地片子 + 字幕）都从这里进
X.feat('gysDyWatch', { n: '🎬 抖音 · 一起看', desc: '抖音首页顶上多一栏「一起看」：贴视频链接 / 开视频网站和 TA 一起看，或者打开本地电影一起看。关掉就没有这一栏（一起看还在小功能里）' });
const watchOn = () => X.on('gysDyWatch');
const TOPS = () => [['live', '直播'], ['city', '同城'], ['follow', '关注'], ['rec', '推荐']].concat(watchOn() ? [['watch', '一起看']] : []);
const wmNow = () => { try { return window.gyWmNow ? window.gyWmNow() : null; } catch (e) { return null; } };
function watchHtml() {
    const n = wmNow(), c = X.cur();
    const tile = (ico, t, f, bg) => `<div class="dy-wt" onclick="${f}" style="background:${bg}"><i>${ico}</i><b>${t}</b></div>`;
    return `<div class="dy-home dy-lp dy-wp"><div class="dy-top"><span onclick="GYS.close('douyin')">‹</span>${TOPS().map(([k, nm]) => `<b class="${CH === k ? 'on' : ''}" onclick="gysDy.ch('${k}')">${nm}</b>`).join('')}<span onclick="gysDy.searchPage()">🔍</span></div>
      ${n ? `<div class="dy-wnow" onclick="gysDy.wmGo()"><div class="dy-wpl"><span>▶</span></div><div class="dy-wni"><b>${esc(n.title || '正在看')}</b><small>${esc(n.artist || '')}</small></div></div>` : ''}
      ${c ? `<div class="dy-wwith">${G.av(APP, 'me', 36)}${G.av(APP, 'c:' + c.id, 36)}<div><b>和${esc(c.name)}一起看</b></div></div>` : ''}
      <div class="dy-wts">${window.gyWmOpen ? tile('🔗', '贴链接 / 视频网站', 'gysDy.wmGo()', 'linear-gradient(135deg,#fe2c55,#ff7a45)') : ''}${typeof gyOpenMiniFeature === 'function' ? tile('🎬', '本地电影', 'gysDy.film()', 'linear-gradient(135deg,#25f4ee,#3a7bd5)') : ''}</div></div>`;
}
Y.wmGo = () => { G.close(APP); try { window.gyWmOpen(); } catch (e) {} };
Y.film = () => { G.close(APP); try { gyOpenMiniFeature('watch_together'); } catch (e) {} };
window.gysDouyinWatch = () => { G.open(APP, 'home'); CH = 'watch'; G.repaint(APP); };
function homeHtml() {
    if (CH === 'live') return livesHtml();
    if (CH === 'watch') { if (watchOn()) return watchHtml(); CH = 'rec'; }
    const L = feedOf(CH); let i = Math.min(IDX[CH] || 0, Math.max(0, L.length - 1));
    if (L.length - i < 3 && !BUSY.f) setTimeout(() => genFeed(CH), 50);
    const v = L[i]; if (v && LASTV !== v.id) { LASTV = v.id; v.plays = (v.plays || 0) + 1; }
    return `<div class="dy-home"><div class="dy-top"><span onclick="GYS.close('douyin')">‹</span>${TOPS().map(([k, n]) => `<b class="${CH === k ? 'on' : ''}" onclick="gysDy.ch('${k}')">${n}</b>`).join('')}<span onclick="gysDy.searchPage()">🔍</span></div>
      <div class="dy-stage" id="dyStage">${v ? vidHtml(v, i) : `<div class="dy-empty">${BUSY.f ? '⏳ 正在加载…' : CH === 'follow' ? '关注的人还没发视频' : '刷新一下'}<br><a onclick="gysDy.__feed()">刷新</a></div>`}</div>
      <div class="dy-nav"><span onclick="gysDy.go(-1)">⌃</span><span onclick="gysDy.go(1)">⌄</span></div></div>`;
}
Y.ch = k => { CH = k; G.repaint(APP); };
Y.__feed = () => genFeed(CH);
Y.go = d => { const L = feedOf(CH); IDX[CH] = Math.max(0, Math.min(L.length - 1, (IDX[CH] || 0) + d)); G.repaint(APP); };
Y.dbl = (e, id) => { const v = vidOf(id); if (!v) return; if (!v.likes.includes('me')) v.likes.push('me'); saveD(); const h = document.createElement('i'); h.className = 'dy-heart'; h.textContent = '❤️'; const r = e.currentTarget.getBoundingClientRect(); h.style.left = (e.clientX - r.left - 40) + 'px'; h.style.top = (e.clientY - r.top - 40) + 'px'; e.currentTarget.appendChild(h); setTimeout(() => { h.remove(); G.repaint(APP); }, 700); reactLike(v); };
Y.like = id => { const v = vidOf(id); if (!v) return; const i = v.likes.indexOf('me'); if (i >= 0) v.likes.splice(i, 1); else { v.likes.push('me'); reactLike(v); } saveD(); G.repaint(APP); };
function reactLike(v) { const c = G.charOf(v.by); if (!c || v.__lk) return; v.__lk = 1; D.notes.unshift({ t: 'like', by: 'me', vid: v.id, at: Date.now(), seen: 1 }); }
Y.fav = id => { const v = vidOf(id); if (!v) return; const i = v.favs.indexOf('me'); if (i >= 0) v.favs.splice(i, 1); else { v.favs.push('me'); X.toast(X.v('⭐ 收藏了', '已收藏'), ''); } saveD(); G.repaint(APP); };
Y.follow = w => { D.follow = D.follow || []; if (!D.follow.includes(w)) D.follow.push(w); G.prof(APP, w).followers = (G.prof(APP, w).followers || 0) + 1; saveD(); X.toast(X.v('关注了', '已关注'), ''); G.repaint(APP); };
const vCard = v => ({ app: APP, kind: '视频', by: v.by, byName: nameOf(v.by), title: '', text: (v.cap || v.scene || '').slice(0, 200), img: G.cardImg(v.img), at: v.at, go: X.go('gysDouyinOpenVid', v.id) });
Y.share = async id => { const v = vidOf(id); if (!v) return; const opts = ['💬 私信发给 TA（抖音里）', '↗ 发到别的地方（iMessage / 平时聊天）', '📋 复制链接']; const i = await G.sheet(opts, '分享给朋友'); if (i == null) return; v.shareN = (v.shareN || 0) + 1; saveD(); if (i === 0) { const cs = G.chars(); if (!cs.length) return; let c = cs[0]; if (cs.length > 1) { const k = await G.sheet(cs.map(x => x.name), '发给谁？'); if (k == null) return; c = cs[k]; } const t = dmOf(charW(c)); t.msgs.push({ id: G.uid('dm'), from: 'me', t: 'vid', vid: v.id, at: Date.now() }); t.at = Date.now(); saveD(); X.toast('发过去了', ''); setTimeout(() => dmReply(t), G.rnd(1500, 4000)); } else if (i === 1) G.share(vCard(v)); else { try { navigator.clipboard.writeText('抖音：' + (v.cap || v.scene)); X.toast('复制了', ''); } catch (e) {} } };
// 触屏上下滑 / 滚轮
function bindSwipe() {
    const st = document.getElementById('dyStage'); if (!st || st.__b) return; st.__b = 1; let y0 = null, t0 = 0;
    st.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; t0 = Date.now(); }, { passive: true });
    st.addEventListener('touchend', e => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; if (Math.abs(dy) > 60 && Date.now() - t0 < 800) Y.go(dy < 0 ? 1 : -1); y0 = null; }, { passive: true });
    let wl = 0; st.addEventListener('wheel', e => { if (Date.now() - wl < 600 || Math.abs(e.deltaY) < 30) return; wl = Date.now(); Y.go(e.deltaY > 0 ? 1 : -1); }, { passive: true });
}

/* ---------------- 评论（底下弹上来那种） ---------------- */
Y.cmts = id => { const v = vidOf(id); if (!v) return; CMT = id; REPLY = null; if (!v.cmtGen) genCmts(v, 8); G.push(APP, { id: 'cmt_' + id, title: '评论', cls: 'dy-cb', html: () => cmtHtml(v), foot: () => `<div class="dy-cin"><input id="dyCin" placeholder="${REPLY ? '回复 @' + esc(nameOf(REPLY.by)) : '善语结善缘，恶言伤人心'}" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysDy.send('${id}')"><span onclick="gysDy.send('${id}')">发送</span></div>` }); };
function cmtHtml(v) {
    const one = (c, kid) => `<div class="dy-c${kid ? ' kid' : ''}">${G.av(APP, c.by, kid ? 24 : 34)}<div onclick="gysDy.replyTo('${v.id}','${c.id}')"><small>${esc(nameOf(c.by))}${c.by === v.by ? ' <u>作者</u>' : ''}${c.to ? ' ▸ ' + esc(nameOf(c.to)) : ''}</small><p>${esc(c.text)}</p><em>${G.ago(c.at)} · 回复${c.authorLike ? ' · <i>作者赞过</i>' : ''}</em></div><span class="${c.likes.includes('me') ? 'on' : ''}" onclick="gysDy.cLike('${v.id}','${c.id}')">${c.likes.includes('me') ? '❤️' : '🤍'}<br>${G.fmtN(c.likeN + c.likes.length)}</span></div>${(c.kids || []).map(k => one(k, 1)).join('')}`;
    return `${v.cmts.slice().sort((a, b) => (b.likeN + b.likes.length) - (a.likeN + a.likes.length)).map(c => one(c)).join('') || (BUSY['c' + v.id] ? '<div class="gys-busy">⏳</div>' : '<div class="gys-empty">还没有评论</div>')}<div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysDy.moreC('${v.id}')">${BUSY['c' + v.id] ? '⏳' : '展开更多评论'}</span></div>`;
}
Y.moreC = id => genCmts(vidOf(id), 6);
const findC = (v, cid) => flat(v).find(c => c.id === cid);
Y.cLike = (vid, cid) => { const c = findC(vidOf(vid), cid); if (!c) return; const i = c.likes.indexOf('me'); if (i >= 0) c.likes.splice(i, 1); else c.likes.push('me'); saveD(); G.repaint(APP); };
Y.replyTo = (vid, cid) => { const c = findC(vidOf(vid), cid); REPLY = c && c.by !== 'me' ? c : null; G.repaint(APP); setTimeout(() => { const i = document.getElementById('dyCin'); if (i) i.focus(); }, 50); };
Y.send = async id => {
    const v = vidOf(id), inp = document.getElementById('dyCin'); if (!v || !inp) return; const t = inp.value.trim(); if (!t) return; inp.value = '';
    const c = { id: G.uid('dc'), by: 'me', text: t.slice(0, 200), at: Date.now(), likeN: 0, likes: [], kids: [] }; let top = null; const rp = REPLY;
    if (rp) { top = v.cmts.find(k => k === rp || (k.kids || []).includes(rp)); c.to = rp.by; }
    if (top) top.kids.push(c); else v.cmts.unshift(c); REPLY = null; v.cmtN = (v.cmtN || 0) + 1; saveD(); G.repaint(APP);
    const ta = (rp && G.charOf(rp.by)) || G.charOf(v.by); if (!ta) return;
    setTimeout(async () => { const r = X.plain(await X.ask(`${X.who(ta)}\n抖音上${v.by === charW(ta) ? '你发的视频（' + (v.cap || v.scene) + '）' : nameOf(v.by) + ' 的视频'}下面，她${rp && rp.by === charW(ta) ? '回复你' : '评论'}：「${t}」。你回她一句（评论区口吻，短）。只写那一句。`) || '').slice(0, 150); if (!r) return; (top || c).kids = (top || c).kids || []; (top || c).kids.push({ id: G.uid('dc'), by: charW(ta), text: r, to: 'me', at: Date.now(), likeN: G.rnd(0, 50), likes: [], kids: [] }); c.authorLike = v.by === charW(ta); saveD(); G.repaint(APP); G.notify(APP, ta, `🎶 <b>${X.esc(ta.name)}</b> 回复了你的评论`, r, X.go('gysDouyinOpenCmt', v.id)); }, G.rnd(3, 10) * 1000);
};

/* ---------------- 直播 ---------------- */
// 直播：{ id, host, title, scene, ico, viewers, lines:[{by,t,gift,me,host}], at, end, sum, gifts, likes, ta }
async function genLives() { if (BUSY.lv) return; BUSY.lv = 1; G.repaint(APP); try { const o = X.json(await X.ask(P('dy.lives', DEF_LIVES, { 条数: 6 }))); if (Array.isArray(o)) { D.lives = D.lives.filter(l => l.ta || l.by === 'me' || !l.gen || !!l.end); o.forEach(x => { if (!x || !x.title) return; D.lives.unshift({ id: G.uid('dl'), host: passer(x.host), title: X.plain(x.title).slice(0, 30), scene: X.plain(x.scene || '').slice(0, 120), ico: X.plain(x.ico || '').slice(0, 4) || '🎤', viewers: Math.max(1, parseInt(x.viewers, 10) || G.rnd(50, 20000)), lines: [], at: Date.now() - G.rnd(1, 120) * 60e3, end: 0, gifts: 0, likes: 0, gen: 1 }); }); D.livesAt = Date.now(); saveD(); } } catch (e) {} finally { BUSY.lv = 0; G.repaint(APP); } }
const onAir = () => D.lives.filter(l => !l.end);
function livesHtml() {
    if (!D.livesAt || Date.now() - D.livesAt > 3 * 3600e3) setTimeout(genLives, 50);
    const ta = onAir().filter(l => l.ta), oth = onAir().filter(l => !l.ta), rec = D.lives.filter(l => l.end && l.ta).slice(0, 10);
    const card = l => `<div class="dy-lc" onclick="gysDy.room('${l.id}')" style="background:${bgOf(l.title)}"><em>🔴 直播中 · ${G.fmtN(l.viewers)}</em><i>${esc(l.ico || '🎤')}</i><b>${esc(l.title)}</b><small>${G.av(APP, l.host, 18)} ${esc(nameOf(l.host))}</small></div>`;
    return `<div class="dy-home dy-lp"><div class="dy-top"><span onclick="GYS.close('douyin')">‹</span>${TOPS().map(([k, n]) => `<b class="${CH === k ? 'on' : ''}" onclick="gysDy.ch('${k}')">${n}</b>`).join('')}<span onclick="gysDy.myLive()">📡</span></div>
      <div class="dy-lgrid">${ta.map(card).join('')}${oth.map(card).join('') || (BUSY.lv ? '<div class="gys-busy" style="color:#aaa">⏳</div>' : '')}</div>
      ${rec.length ? `<div class="dy-sec">TA 播过的</div>${rec.map(l => `<div class="dy-rec" onclick="gysDy.room('${l.id}')">${G.av(APP, l.host, 34)}<div><b>${esc(l.title)}</b><small>${new Date(l.at).toLocaleDateString()} · ${esc(l.sum || '')}</small></div></div>`).join('')}` : ''}
      <div class="gys-acts"><span class="gys-btn sm ghost" style="color:#fff;border-color:#555" onclick="gysDy.__lives()">${BUSY.lv ? '⏳' : '↻ 换一批'}</span>${G.chars().length ? `<span class="gys-btn sm ghost" style="color:#fff;border-color:#555" onclick="gysDy.askLive()">📣 叫 TA 开播</span>` : ''}</div></div>`;
}
Y.__lives = () => genLives();
const GIFTS = [['🌹', '玫瑰', 1], ['❤️', '小心心', 1], ['🍭', '棒棒糖', 9], ['💌', '情书', 52], ['🚀', '火箭', 520], ['🏰', '嘉年华', 3000]];
let RT = null;
Y.room = id => { const l = liveOf(id); if (!l) return; G.push(APP, { id: 'room_' + id, title: '', cls: 'dy-rb', html: () => roomHtml(l), foot: () => l.end ? '' : `<div class="dy-rin"><input id="dyRin" placeholder="说点什么…" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysDy.say('${id}')">${G.charOf(l.host) && micOn() ? (l.mic ? `<span class="mic on" onclick="gysDy.micEnd('${id}')">挂断</span>` : `<span class="mic" onclick="gysDy.micAsk('${id}')">连麦</span>`) : ''}<span onclick="gysDy.giftMenu('${id}')">🎁</span><span onclick="gysDy.heart('${id}')">❤️</span></div>` }); clearInterval(RT); if (!l.end) { if (!l.lines.length) step(l, '刚有人进来，招呼一下。'); RT = setInterval(() => { if (!document.querySelector('#gys_douyin .dy-room[data-id="' + id + '"]')) { clearInterval(RT); return; } l.viewers = Math.max(1, l.viewers + G.rnd(-20, 40)); step(l, ''); }, 25e3); } };
function roomHtml(l) {
    return `<div class="dy-room" data-id="${l.id}" style="background:${l.bg ? `url('${l.bg}') center/cover` : bgOf(l.title)}"><div class="dy-rh">${G.av(APP, l.host, 34)}<div><b>${esc(nameOf(l.host))}</b><small>${G.fmtN(l.likes || 0)} 本场点赞</small></div>${!isFollow(l.host) ? `<span onclick="gysDy.follow('${l.host}')">关注</span>` : ''}<em>${G.fmtN(l.viewers)} 人</em><i onclick="GYS.back('douyin')">✕</i></div>
      <div class="dy-rt">${esc(l.title)}${l.end ? ' · 已结束' : ''}</div>
      ${l.mic ? `<div class="dy-mic"><div style="background:${bgOf(l.title)}">${G.av(APP, l.host, 46)}<b>${esc(nameOf(l.host))}</b><small>${esc(l.ico || '🎤')} ${esc((l.scene || '').slice(0, 24))}</small></div><div style="background:${bgOf(nameOf('me'))}">${G.av(APP, 'me', 46)}<b>${esc(nameOf('me'))}</b><small class="wv">🎙️ 连麦中 · ${G.hm(l.mic.at)}</small></div></div>` : `<div class="dy-rscene"><i>${esc(l.ico || '🎤')}</i><p>${esc(l.scene || '')}</p></div>`}
      <div class="dy-dm" id="dyDm">${l.lines.slice(-40).map(x => `<p class="${x.host ? 'h' : x.me ? 'm' : ''}">${x.host ? '🎙️ ' : x.mic ? '🎙️ ' : ''}<b>${esc(x.host ? nameOf(l.host) : x.me ? nameOf('me') : x.by)}</b>${x.gift ? ` 送出了 ${esc(x.gift)}` : '：' + esc(x.t)}</p>`).join('')}</div>
      <div class="dy-fx" id="dyFx"></div>
      ${l.end ? `<div class="dy-rend">直播已结束${l.sum ? `<p>「${esc(l.sum)}」</p>` : ''}</div>` : ''}
      ${l.by === 'me' && !l.end ? `<div class="gys-acts"><span class="gys-btn sm" onclick="gysDy.endMine('${l.id}')">下播</span></div>` : ''}</div>`;
}
async function step(l, why) {
    if (BUSY['l' + l.id] || l.end) return; BUSY['l' + l.id] = 1;
    try {
        const c = G.charOf(l.host), who = c ? X.who(c) : `你是抖音主播「${nameOf(l.host)}」。`;
        const o = X.json(await X.ask(P('dy.live', DEF_LIVE, { 我是谁: who, 标题: l.title, 画面: l.scene || '', 人数: l.viewers, 记录: l.lines.slice(-12).map(x => `${x.host ? '（你）' : x.me ? G.meName() + '（她）' : x.by}：${x.gift ? '送了' + x.gift : x.t}`).join('\n') || '（刚开播）', 情况: why || '' })));
        if (o) { if (o.host) l.lines.push({ host: 1, t: X.plain(o.host).slice(0, 200), at: Date.now() }); (o.danmu || []).slice(0, 6).forEach(d => { if (d && (d.text || d.gift)) l.lines.push({ by: X.plain(d.by || '路人').slice(0, 12), t: X.plain(d.text || '').slice(0, 60), gift: X.plain(d.gift || '').slice(0, 10), at: Date.now() }); }); if (l.lines.length > 300) l.lines.splice(0, l.lines.length - 300); saveD(); paintRoom(l); }
    } catch (e) {} finally { BUSY['l' + l.id] = 0; }
}
function paintRoom(l) { const r = document.querySelector('#gys_douyin .dy-room[data-id="' + l.id + '"]'); if (r) { G.repaint(APP); const d = document.getElementById('dyDm'); if (d) d.scrollTop = d.scrollHeight; } }
Y.say = async id => { const l = liveOf(id), inp = document.getElementById('dyRin'); if (!l || !inp) return; const t = inp.value.trim(); if (!t) return; inp.value = ''; l.lines.push({ me: 1, t: t.slice(0, l.mic ? 200 : 60), mic: l.mic ? 1 : 0, at: Date.now() }); saveD(); paintRoom(l); await step(l, l.mic ? `你们正在连麦，她刚对着麦说：「${t}」。直接回她（是在直播里说话，直播间的人都听得到，弹幕会起哄）。` : `她刚发了弹幕：「${t}」。${G.charOf(l.host) ? '你认得出是她，先回她。' : '挑着回一下。'}`); };
Y.heart = id => { const l = liveOf(id); if (!l) return; l.likes = (l.likes || 0) + G.rnd(1, 8); saveD(); const fx = document.getElementById('dyFx'); if (fx) { const i = document.createElement('i'); i.textContent = G.pick(['❤️', '💕', '💗', '💖']); i.style.left = G.rnd(60, 85) + '%'; fx.appendChild(i); setTimeout(() => i.remove(), 1800); } };
Y.giftMenu = async id => {
    const l = liveOf(id); if (!l) return; const i = await G.sheet(GIFTS.map(g => `${g[0]} ${g[1]} · ${g[2]} 抖币（¥${(g[2] / 10).toFixed(1)}）`), '送礼物（从钱包扣）'); if (i == null) return; const g = GIFTS[i];
    const W = window.gyWallet; if (W && W.spend) { try { const ok = await W.spend('me', g[2] / 10, '抖音直播礼物：' + g[1] + ' → ' + nameOf(l.host)); if (ok === false) return X.toast('钱包里钱不够', ''); } catch (e) { return X.toast('钱包里钱不够', ''); } }
    l.lines.push({ me: 1, gift: g[0] + ' ' + g[1], at: Date.now() }); l.gifts = (l.gifts || 0) + g[2]; saveD();
    const fx = document.getElementById('dyFx'); if (fx) fx.innerHTML = Array.from({ length: 12 }, () => `<b style="left:${G.rnd(5, 85)}%;animation-delay:${Math.random() * .8}s">${g[0]}</b>`).join(''); setTimeout(() => { const f = document.getElementById('dyFx'); if (f) f.innerHTML = ''; }, 2600);
    paintRoom(l); await step(l, `她刚送了你 ${g[1]}（${g[2]} 抖币）。${G.charOf(l.host) ? '你认出是她，有反应。' : '感谢一下。'}`);
};
async function taLive(c, why) {
    const o = X.json(await X.ask(`${X.who(c)}\n你要在抖音开一场直播（${why || '弹琴、做饭、打游戏、学习、随便聊聊都行'}）。只输出 JSON：{"title":"直播标题","scene":"直播画面是什么样","ico":"一个 emoji"}`)); if (!o || !o.title) return null;
    onAir().filter(l => l.host === charW(c)).forEach(l => { l.end = Date.now(); });
    const l = { id: G.uid('dl'), host: charW(c), ta: 1, title: X.plain(o.title).slice(0, 30), scene: X.plain(o.scene || '').slice(0, 120), ico: X.plain(o.ico || '').slice(0, 4) || '🎤', viewers: G.rnd(30, 3000), lines: [], at: Date.now(), end: 0, gifts: 0, likes: 0 };
    D.lives.unshift(l); saveD(); await step(l, '刚开播，跟大家打招呼，也想她来看。');
    setTimeout(() => taEnd(l), G.rnd(40, 90) * 60e3); return l;
}
async function taEnd(l) { if (!l || l.end) return; if (l.mic) Y.micEnd(l.id); l.end = Date.now(); const c = G.charOf(l.host); const ms = l.lines.filter(x => x.me).map(x => x.gift ? '送了' + x.gift : x.t).join('；'); if (c) l.sum = X.plain(await X.ask(`${X.who(c)}\n你刚播完抖音直播《${l.title}》。她在直播间：${ms || '（没来 / 只是看着）'}。用一句话（30 字以内）写下这场直播你最想记住的事。只输出这一句。`) || '').slice(0, 60) || `播了《${l.title}》`; saveD(); G.repaint(APP); }
Y.askLive = async () => { const cs = G.chars(); if (!cs.length) return; let c = cs[0]; if (cs.length > 1) { const i = await G.sheet(cs.map(x => x.name), '叫谁开播？'); if (i == null) return; c = cs[i]; } X.toast(X.v('📣 叫了', 'TA 在准备开播'), ''); const l = await taLive(c, '她叫你开一场'); if (l) { G.repaint(APP); Y.room(l.id); } };
Y.myLive = async () => { const t = await G.input('直播标题', '随便聊聊'); if (!t) return; const sc = await G.input('直播画面是什么（可以空着）', ''); const l = { id: G.uid('dl'), host: 'me', by: 'me', title: X.plain(t).slice(0, 30), scene: X.plain(sc || '').slice(0, 120), ico: '📡', viewers: G.rnd(5, 60), lines: [], at: Date.now(), end: 0, gifts: 0, likes: 0 }; D.lives.unshift(l); saveD(); Y.room(l.id); G.chars().forEach(c => { if (Math.random() < 0.8) setTimeout(() => { if (l.end) return; l.lines.push({ by: nameOf(charW(c)), t: X.v('来了来了', '我来看你了', '前排'), at: Date.now() }); l.viewers++; saveD(); paintRoom(l); }, G.rnd(3, 30) * 1000); }); };
Y.endMine = async id => { const l = liveOf(id); if (!l) return; l.end = Date.now(); l.sum = `你播了《${l.title}》，${G.fmtN(l.likes || 0)} 个赞`; saveD(); G.repaint(APP); };

/* ---------------- 发作品 ---------------- */
let DR = null;
function postTab() {
    DR = DR || { img: '', scene: '', cap: '', music: pickMusic(), loc: '', vis: 'public' };
    return `<div class="dy-pub"><div class="dy-pimg" onclick="gysDy.__img()" style="${DR.img ? `background-image:url('${DR.img}')` : ''}">${DR.img ? '' : '＋<small>选封面图（能裁剪，可不选）</small>'}</div>
      <label class="gys-f"><span>画面（这个视频拍的是什么）</span><textarea id="dyPs" rows="3" placeholder="比如：下班路上的晚霞，镜头慢慢拉远">${esc(DR.scene)}</textarea></label>
      <label class="gys-f"><span>作品描述</span><textarea id="dyPc" rows="2" placeholder="添加作品描述… #话题 @朋友">${esc(DR.cap)}</textarea></label>
      <label class="gys-f"><span>♪ 配乐（网易云里听过的会自动推荐）</span><input id="dyPm" value="${esc(DR.music)}" placeholder="原声"></label>
      <label class="gys-f"><span>📍 位置</span><input id="dyPl" value="${esc(DR.loc)}" placeholder="可不填"></label>
      <div class="gys-f"><span>谁可以看</span><select id="dyPv"><option value="public">公开</option><option value="friends" ${DR.vis === 'friends' ? 'selected' : ''}>朋友</option><option value="self" ${DR.vis === 'self' ? 'selected' : ''}>仅自己</option></select></div>
      <div class="gys-acts"><button class="gys-btn" onclick="gysDy.publish()">发布</button></div></div>`;
}
const keepDr = () => { if (!DR) return; const g = id => (document.getElementById(id) || {}).value; const s = g('dyPs'); if (s != null) { DR.scene = s; DR.cap = g('dyPc') || ''; DR.music = g('dyPm') || ''; DR.loc = g('dyPl') || ''; DR.vis = g('dyPv') || 'public'; } };
Y.__img = () => { keepDr(); G.pickImg(9 / 16, url => { DR.img = url; G.repaint(APP); }); };
Y.publish = () => {
    keepDr(); if (!DR.scene.trim() && !DR.cap.trim() && !DR.img) return X.toast('拍点什么吧', '');
    const v = mkVid({ by: 'me', img: DR.img, scene: X.plain(DR.scene).slice(0, 200), cap: X.plain(DR.cap).slice(0, 200), music: X.plain(DR.music).slice(0, 40) || '原声 - ' + nameOf('me'), loc: X.plain(DR.loc).slice(0, 10), vis: DR.vis, likeN: G.rnd(0, 20) });
    DR = null; X.toast(X.v('🎶 发布成功', '作品发出去了'), v.vis === 'self' ? '仅自己可见' : '');
    G.tab(APP, 'me');
    if (v.vis !== 'self') { genCmts(v, 5); G.chars().forEach(c => { if (Math.random() < 0.85) setTimeout(() => { if (!v.likes.includes(charW(c))) v.likes.push(charW(c)); D.notes.unshift({ t: 'like', by: charW(c), vid: v.id, at: Date.now() }); saveD(); G.repaint(APP); }, G.rnd(5, 60) * 1000); }); }
};

/* ---------------- 朋友 / 消息 / 私信 ---------------- */
function friendTab() {
    const L = D.vids.filter(v => G.charOf(v.by) && v.vis !== 'self');
    return `<div class="dy-fr">${dailyRow()}<div class="dy-sec">朋友</div><div class="dy-frs">${cast().map(w => `<span onclick="gysDy.prof('${w}')">${G.av(APP, w, 52)}<i>${esc(nameOf(w))}</i>${onAir().some(l => l.host === w) ? '<em>直播中</em>' : ''}</span>`).join('') || '<div class="gys-empty">还没有朋友</div>'}</div>
      <div class="dy-sec">朋友的作品</div><div class="dy-grid">${L.map(gridCell).join('') || '<div class="gys-empty">朋友还没发作品</div>'}</div></div>`;
}
const gridCell = v => `<div class="dy-cell" onclick="gysDy.openVid('${v.id}')" style="background:${v.img ? `url('${v.img}') center/cover` : bgOf(v.scene + v.id)}">${v.img ? '' : `<i>${esc(v.ico)}</i>`}<small>▷ ${G.fmtN((v.plays || 0) * 13 + v.likeN * 3)}</small>${v.vis === 'self' ? '<em>🔒</em>' : ''}</div>`;
Y.openVid = id => { const v = vidOf(id); if (!v) return; G.push(APP, { id: 'vid_' + id, title: '', cls: 'dy-vb', html: () => `<div class="dy-one">${vidHtml(v, 0)}<span class="dy-x" onclick="GYS.back('douyin')">‹</span></div>` }); };
function dmOf(w) { D.dms[w] = D.dms[w] || { id: w, who: w, msgs: [], at: Date.now(), unread: 0 }; return D.dms[w]; }
const unread = () => Object.values(D.dms).reduce((n, t) => n + (t.unread || 0), 0) + D.notes.filter(n => !n.seen).length;
function msgTab() {
    const N = D.notes.slice(0, 40); N.forEach(n => { n.seen = 1; }); saveD();
    const T = Object.values(D.dms).filter(t => t.msgs.length).sort((a, b) => b.at - a.at);
    return `<div class="dy-msg">${dailyRow()}<div class="dy-sec">互动消息</div>${N.map(n => { const v = vidOf(n.vid); return `<div class="dy-row" onclick="${v ? `gysDy.openVid('${v.id}')` : ''}">${G.av(APP, n.by, 38)}<div><b>${esc(nameOf(n.by))}</b><small>${n.t === 'like' ? '赞了你的作品' : n.t === 'cmt' ? '评论了：' + esc(n.text || '') : '关注了你'} · ${G.ago(n.at)}</small></div></div>`; }).join('') || '<div class="dy-tip">还没有</div>'}
      <div class="dy-sec">私信 <a onclick="gysDy.dmNew()">＋</a></div>${T.map(t => { const m = t.msgs[t.msgs.length - 1]; return `<div class="dy-row" onclick="gysDy.dm('${t.id}')">${G.av(APP, t.who, 44)}<div><b>${esc(nameOf(t.who))}</b><small>${esc(m.t === 'vid' ? '[视频]' : m.text || '')}</small></div>${t.unread ? `<sup>${t.unread}</sup>` : ''}</div>`; }).join('') || '<div class="dy-tip">在 TA 的主页点「私信」</div>'}</div>`;
}
Y.dmNew = async () => { const cs = G.chars(); if (!cs.length) return; const i = await G.sheet(cs.map(x => x.name), '私信谁？'); if (i != null) Y.dm(charW(cs[i])); };
Y.dm = w => { const t = dmOf(w); t.unread = 0; saveD(); G.push(APP, { id: 'dm_' + w, title: esc(nameOf(w)), html: () => `<div class="dy-dms">${t.msgs.map(m => { const me = m.from === 'me'; const v = m.t === 'vid' && vidOf(m.vid); return `<div class="dy-dmr ${me ? 'me' : ''}">${me ? '' : G.av(APP, w, 32)}${v ? `<div class="dy-dmv" onclick="gysDy.openVid('${v.id}')" style="background:${v.img ? `url('${v.img}') center/cover` : bgOf(v.scene + v.id)}"><i>${esc(v.ico)}</i><small>@${esc(nameOf(v.by))}<br>${esc((v.cap || v.scene).slice(0, 30))}</small></div>` : `<p>${esc(m.text)}</p>`}</div>`; }).join('')}${BUSY['d' + w] ? '<div class="dy-tip">对方正在输入…</div>' : ''}</div>`, foot: () => `<div class="dy-cin"><input id="dyDmIn" placeholder="发送消息" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysDy.dmSend('${w}')"><span onclick="gysDy.dmSend('${w}')">发送</span></div>`, after: r => { const b = r.querySelector('.gys-body'); if (b) b.scrollTop = b.scrollHeight; } }); };
Y.dmSend = w => { const inp = document.getElementById('dyDmIn'); if (!inp) return; const t = inp.value.trim(); if (!t) return; inp.value = ''; const th = dmOf(w); th.msgs.push({ id: G.uid('dm'), from: 'me', text: t.slice(0, 500), at: Date.now() }); th.at = Date.now(); saveD(); G.repaint(APP); setTimeout(() => dmReply(th), G.rnd(1200, 3000)); };
async function dmReply(t) {
    const c = G.charOf(t.who); if (!c || BUSY['d' + t.who]) return; BUSY['d' + t.who] = 1; G.repaint(APP);
    try {
        const rec = t.msgs.slice(-14).map(m => `${m.from === 'me' ? X.me(c) : '你'}：${m.t === 'vid' ? '[分享了一个视频：' + ((vidOf(m.vid) || {}).cap || (vidOf(m.vid) || {}).scene || '') + ']' : m.text}`).join('\n');
        const o = X.json(await X.ask(P('dy.dm', DEF_DM, { 我是谁: X.who(c), 平时: G.recentAll(c, APP), 记录: rec })));
        (Array.isArray(o) ? o : []).slice(0, 3).forEach(x => { if (x && x.text) t.msgs.push({ id: G.uid('dm'), from: t.who, text: X.plain(x.text).slice(0, 500), at: Date.now() }); });
        t.at = Date.now(); const viewing = G.isOpen(APP) && G.top(APP) && G.top(APP).id === 'dm_' + t.who; if (!viewing) { t.unread = (t.unread || 0) + 1; G.notify(APP, c, `🎶 <b>${X.esc(c.name)}</b>`, (t.msgs[t.msgs.length - 1] || {}).text || '', X.go('gysDouyinOpenDm', t.who)); } saveD();
    } catch (e) {} finally { BUSY['d' + t.who] = 0; G.repaint(APP); }
}

/* ---------------- 我 / 主页 ---------------- */
let PT = {};
function profHtml(w) {
    const p = G.prof(APP, w), L = D.vids.filter(v => v.by === w && (w === 'me' || v.vis === 'public')), tab = PT[w] || 'works';
    const likesGot = L.reduce((n, v) => n + v.likeN + v.likes.length, 0);
    const list = tab === 'like' ? D.vids.filter(v => v.likes.includes(w)) : tab === 'fav' ? D.vids.filter(v => v.favs.includes(w)) : L;
    const live = onAir().find(l => l.host === w);
    return `<div class="dy-pf"><div class="dy-pfbg" style="${p.bg ? `background-image:url('${p.bg}')` : ''}"></div><div class="dy-pfh">${G.av(APP, w, 84)}<div><b>${esc(p.nick)}</b><small>抖音号：${esc(p.handle || ('dy' + String(Math.abs([...w].reduce((a, c) => a * 31 + c.charCodeAt(0), 7))).slice(0, 9)))}</small></div></div>
      <div class="dy-pfn"><span><b>${G.fmtN(likesGot)}</b> 获赞</span><span><b>${G.fmtN(p.following || 0)}</b> 关注</span><span><b>${G.fmtN(p.followers)}</b> 粉丝</span></div>
      <p class="dy-bio">${esc(p.bio || (w === 'me' ? '点击添加介绍，让大家认识你…' : ''))}</p>${G.linksOf(APP, w).map(([k, h]) => `<em class="dy-lk">${G.APPS[k].ico} ${esc(h)}</em>`).join('')}
      ${live ? `<div class="dy-onair" onclick="gysDy.room('${live.id}')">🔴 正在直播：${esc(live.title)} ›</div>` : ''}
      <div class="dy-pfo">${w === 'me' ? `<span onclick="GYS.editProf('douyin','me')">编辑资料</span><span onclick="gysDy.settings()">设置</span>` : `<span class="r" onclick="gysDy.follow('${w}')">${isFollow(w) ? '已关注' : '＋ 关注'}</span>${G.charOf(w) ? `<span onclick="gysDy.dm('${w}')">私信</span>` : ''}<span onclick="GYS.editProf('douyin','${w}')">✏️</span>`}</div>
      <div class="dy-pft">${[['works', '作品 ' + L.length], ['like', '喜欢'], ['fav', '收藏']].map(([k, n]) => `<span class="${tab === k ? 'on' : ''}" onclick="gysDy.pt('${w}','${k}')">${n}</span>`).join('')}</div>
      <div class="dy-grid">${list.map(gridCell).join('') || '<div class="gys-empty">还没有</div>'}</div></div>`;
}
Y.pt = (w, k) => { PT[w] = k; G.repaint(APP); };
Y.prof = w => G.push(APP, { id: 'prof_' + w, title: '', html: () => profHtml(w) });
Y.settings = () => G.push(APP, { title: '设置', html: () => `<div class="gys-acts"><span class="gys-btn sm ghost" onclick="GYS.uiPage('douyin')">🍎 软件外观</span><span class="gys-btn sm ghost" onclick="gysDy.export()">导出（.txt）</span><span class="gys-btn sm ghost" onclick="gysDy.__clr()">清空刷到的视频（自己和 TA 的留着）</span></div>` });
Y.__clr = async () => { if (!(await G.confirm('清空刷到的视频？'))) return; D.vids = D.vids.filter(v => v.by === 'me' || G.charOf(v.by)); saveD(); G.repaint(APP); };
Y.export = () => { const L = ['🎶 抖音 导出 ' + new Date().toLocaleString(), '', '【作品】'].concat(D.vids.filter(v => v.by === 'me' || G.charOf(v.by)).map(v => `${nameOf(v.by)}：${v.cap}（画面：${v.scene}）`), ['', '【直播】']).concat(D.lives.filter(l => l.ta || l.by === 'me').map(l => `${nameOf(l.host)}《${l.title}》 ${l.sum || ''}`)); const t = L.join('\n'); try { if (typeof saveTextFileForApp === 'function') return saveTextFileForApp(t, '抖音.txt'); } catch (e) {} const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = '抖音.txt'; a.click(); };
Y.searchPage = () => G.push(APP, { id: 'search', title: '搜索', html: () => `<div class="dy-sbox"><input id="dyQ" placeholder="搜索" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysDy.search(this.value)"><span onclick="gysDy.search(document.getElementById('dyQ').value)">搜索</span></div>${SQ ? `<div class="dy-grid">${D.vids.filter(v => (v.cap + v.scene + nameOf(v.by)).includes(SQ)).map(gridCell).join('')}</div>${BUSY.f ? '<div class="gys-busy">⏳</div>' : ''}` : hotHtml()}` });
let SQ = '';
Y.search = q => { SQ = String(q || '').trim(); if (!SQ) return; G.repaint(APP); genFeed('rec', `都跟「${SQ}」有关（搜索结果），文案里带上这个词`); };

/* ---------------- 日常（258）：24 小时后消失的「日常」，朋友 / 消息页顶上一排头像，有彩圈的是没看过的 ---------------- */
X.feat('gysDyDaily', { n: '🌀 抖音日常', desc: '抖音的「日常」：24 小时就消失的随手拍；你发了 TA 会看、点赞、私信你，TA 也会发自己的日常' });
X.feat('gysDyMic', { n: '🎙️ 抖音直播连麦', desc: '在 TA 的直播间申请连麦，或者 TA 邀请你连麦：屏幕一分为二，你说话 TA 当着直播间回你' });
const dailyOn = () => X.on('gysDyDaily'), micOn = () => X.on('gysDyMic');
const DEF_DAILY = `{{我是谁}}
你要发一条抖音「日常」（24 小时后消失，只有朋友看得到，比正经作品随意得多：手边的东西、窗外、吃的、路上、一句心情）。最近你们聊的：
{{最近}}
只输出 JSON：{"scene":"画面是什么（一句）","cap":"配的一句话（可以很短，也可以空）","ico":"一个 emoji"}`;
const DEF_HOT = `你在模拟抖音的「抖音热榜」（现在是 {{时间}}）。写 {{条数}} 条此刻最热的话题（社会、娱乐、生活、节日、天气、梗……像真热榜那样的短标题，不要编造真实名人的负面新闻）。
只输出 JSON 数组：[{"t":"话题标题（20 字以内）","heat":热度（万，数字，比如 1234.5）,"tag":"新 / 热 / 爆 / 空"}]`;
X.plGroup('🎶 抖音 · 日常 / 热榜 / 连麦', 'gysDouyin', [
    ['dy.daily', 'TA 发日常', 'TA 自己想发时', '{{我是谁}} {{最近}}'],
    ['dy.hot', '抖音热榜', '打开搜索页 / 刷新热榜时', '{{时间}} {{条数}}']
], { 'dy.daily': DEF_DAILY, 'dy.hot': DEF_HOT });
const DAY = 24 * 3600e3;
const dailies = () => (D.daily = (D.daily || []).filter(d => Date.now() - d.at < DAY || d.keep || G.charOf(d.by)).slice(-200));   // TA 的过期日常不在抖音里显示，但留给记忆总览
const liveDaily = () => dailies().filter(d => Date.now() - d.at < DAY);
const dailyOf = w => liveDaily().filter(d => d.by === w).sort((a, b) => a.at - b.at);
const dailySeen = w => dailyOf(w).every(d => (d.views || []).includes('me'));
function dailyRow() {
    if (!dailyOn()) return '';
    const ws = Array.from(new Set(liveDaily().filter(d => d.by !== 'me').sort((a, b) => b.at - a.at).map(d => d.by))).sort((a, b) => dailySeen(a) - dailySeen(b));
    const mine = dailyOf('me');
    return `<div class="dy-dly"><span onclick="${mine.length ? "gysDy.dailyView('me')" : 'gysDy.dailyPost()'}"><b class="${mine.length ? 'ring seen' : ''}">${G.av(APP, 'me', 54)}${mine.length ? '' : '<u>＋</u>'}</b><i>${mine.length ? '我的日常' : '发日常'}</i></span>${ws.map(w => `<span onclick="gysDy.dailyView('${w}')"><b class="ring${dailySeen(w) ? ' seen' : ''}">${G.av(APP, w, 54)}</b><i>${esc(nameOf(w))}</i></span>`).join('')}</div>`;
}
let DV = null;   // { w, i }
Y.dailyView = (w, i) => { const L = dailyOf(w); if (!L.length) return; DV = { w, i: i || Math.max(0, L.findIndex(d => !(d.views || []).includes('me'))) }; G.push(APP, { id: 'daily', title: '', cls: 'dy-dvb', html: () => dailyHtml() }); };
function dailyHtml() {
    const L = dailyOf(DV.w); const d = L[DV.i]; if (!d) return '<div class="dy-empty">没有了</div>';
    d.views = d.views || []; if (!d.views.includes('me') && DV.w !== 'me') { d.views.push('me'); saveD(); }
    const lk = (d.likes || []).includes('me');
    return `<div class="dy-dv" style="background:${d.img ? `url('${d.img}') center/cover` : bgOf(d.scene + d.id)}" onclick="gysDy.dailyNext(event)">
      <div class="dy-dvbar">${L.map((x, k) => `<i class="${k < DV.i ? 'done' : k === DV.i ? 'cur' : ''}"></i>`).join('')}</div>
      <div class="dy-dvh">${G.av(APP, d.by, 32)}<b>${esc(nameOf(d.by))}</b><small>${G.ago(d.at)}</small><em onclick="event.stopPropagation();GYS.back('douyin')">✕</em></div>
      ${d.img ? '' : `<div class="dy-scene"><i>${esc(d.ico || '📷')}</i><p>${esc(d.scene)}</p></div>`}
      ${d.cap ? `<div class="dy-dvc">${esc(d.cap)}</div>` : ''}
      <div class="dy-dvf" onclick="event.stopPropagation()">${d.by === 'me' ? `<span class="v">👁 ${(d.views || []).length} 人看过${(d.views || []).length ? '：' + d.views.map(x => esc(nameOf(x))).join('、') : ''}</span><span onclick="gysDy.dailyDel('${d.id}')">🗑</span>` : `<input id="dyDvIn" placeholder="发送消息" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysDy.dailyReply('${d.id}')"><span class="${lk ? 'on' : ''}" onclick="gysDy.dailyLike('${d.id}')">${lk ? '❤️' : '🤍'}</span>`}</div></div>`;
}
Y.dailyNext = e => { const L = dailyOf(DV.w); const r = e.currentTarget.getBoundingClientRect(); const back = e.clientX - r.left < r.width / 3; DV.i += back ? -1 : 1; if (DV.i < 0) DV.i = 0; if (DV.i >= L.length) return G.back(APP); G.repaint(APP); };
Y.dailyLike = id => { const d = dailies().find(x => x.id === id); if (!d) return; d.likes = d.likes || []; const i = d.likes.indexOf('me'); if (i >= 0) d.likes.splice(i, 1); else d.likes.push('me'); saveD(); G.repaint(APP); };
Y.dailyReply = id => { const d = dailies().find(x => x.id === id), inp = document.getElementById('dyDvIn'); if (!d || !inp) return; const t = inp.value.trim(); if (!t) return; inp.value = ''; const th = dmOf(d.by); th.msgs.push({ id: G.uid('dm'), from: 'me', text: `回复了日常「${(d.cap || d.scene).slice(0, 16)}」：${t.slice(0, 300)}`, at: Date.now() }); th.at = Date.now(); saveD(); X.toast(X.v('发过去了', '已发送', '私信发出去了'), ''); setTimeout(() => dmReply(th), G.rnd(1500, 4000)); };
Y.dailyDel = async id => { if (!(await G.confirm('删掉这条日常？'))) return; D.daily = dailies().filter(x => x.id !== id); saveD(); G.back(APP); G.repaint(APP); };
Y.dailyPost = async () => {
    const i = await G.sheet(['🖼️ 从相册选（可以裁）', '✏️ 用文字写画面'], '发日常（24 小时后消失）'); if (i == null) return;
    const done = async (img, scene) => { const cap = await G.input('配一句话（可空）', ''); if (cap === null || cap === undefined) return; const d = { id: G.uid('dd'), by: 'me', img: img || '', scene: X.plain(scene || '').slice(0, 80), ico: G.pick(SCENES), cap: X.plain(cap).slice(0, 60), at: Date.now(), views: [], likes: [] }; dailies().push(d); saveD(); G.repaint(APP); X.toast(X.v('日常发出去了', '发好了，24 小时后消失'), ''); taSeeDaily(d); };
    if (i === 0) G.pickImg(9 / 16, src => done(src, '')); else { const s = await G.input('画面是什么？', ''); if (s) done('', s); }
};
function taSeeDaily(d) {
    G.chars().forEach(c => { setTimeout(async () => { const x = dailies().find(y => y.id === d.id); if (!x) return; const w = charW(c); if (!x.views.includes(w)) x.views.push(w); if (Math.random() < 0.6 && !x.likes.includes(w)) x.likes.push(w); saveD(); G.repaint(APP);
        if (Math.random() < 0.45) { const r = X.plain(await X.ask(`${X.who(c)}\n她刚在抖音发了一条日常：${x.img ? '一张照片' : '画面「' + x.scene + '」'}${x.cap ? '，配的话「' + x.cap + '」' : ''}。你看到了，私信她一句（像真的私信，短）。只写那一句。`) || '').slice(0, 120); if (!r) return; const th = dmOf(w); th.msgs.push({ id: G.uid('dm'), from: w, text: r, at: Date.now() }); th.at = Date.now(); th.unread = (th.unread || 0) + 1; saveD(); G.repaint(APP); G.notify(APP, c, `🎶 <b>${X.esc(c.name)}</b> 回复了你的日常`, r, X.go('gysDouyinOpenDm', w)); }
    }, G.rnd(20, 240) * 1000); });
}
async function taDaily(c) {
    const o = X.json(await X.ask(P('dy.daily', DEF_DAILY, { 我是谁: X.who(c), 最近: X.recent(c, 8) || '（最近没怎么聊）' }))); if (!o || !o.scene) return null;
    const d = { id: G.uid('dd'), by: charW(c), img: '', scene: X.plain(o.scene).slice(0, 80), ico: X.plain(o.ico || '').slice(0, 4) || G.pick(SCENES), cap: X.plain(o.cap || '').slice(0, 60), at: Date.now(), views: [], likes: [] }; dailies().push(d); saveD(); G.repaint(APP); return d;
}
window.gysDouyinOpenDaily = w => { G.open(APP, 'friend'); Y.dailyView(w); };

/* ---------------- 抖音热榜（258）：搜索页里，一个小时换一次 ---------------- */
async function genHot(force) {
    if (BUSY.hot) return; if (!force && D.hot && Date.now() - D.hot.at < 3600e3) return; BUSY.hot = 1; G.repaint(APP);
    try { const n = new Date(); const o = X.json(await X.ask(P('dy.hot', DEF_HOT, { 时间: `${n.getMonth() + 1}月${n.getDate()}日 ${n.getHours()}点`, 条数: 15 }))); if (Array.isArray(o) && o.length) D.hot = { at: Date.now(), L: o.filter(x => x && x.t).slice(0, 30).map(x => ({ t: X.plain(x.t).slice(0, 24), heat: Math.max(1, Number(x.heat) || G.rnd(50, 1200)), tag: /新|热|爆/.test(x.tag || '') ? x.tag.match(/新|热|爆/)[0] : '' })) }; saveD(); }
    catch (e) {} finally { BUSY.hot = 0; G.repaint(APP); }
}
function hotHtml() {
    if (!D.hot) setTimeout(() => genHot(), 50);
    const L = (D.hot && D.hot.L) || [];
    return `<div class="dy-hot"><div class="dy-hoth"><b>抖音热榜</b><small>${D.hot ? G.hm(D.hot.at) + ' 更新' : ''}</small><a onclick="gysDy.__hot()">${BUSY.hot ? '⏳' : '↻ 换一换'}</a></div>${L.map((x, i) => `<div class="dy-hr" onclick="document.getElementById('dyQ').value='${esc(x.t).replace(/'/g, '')}';gysDy.search('${esc(x.t).replace(/'/g, '')}')"><em class="r${i < 3 ? i + 1 : ''}">${i + 1}</em><b>${esc(x.t)}</b>${x.tag ? `<i class="t${'新热爆'.indexOf(x.tag)}">${x.tag}</i>` : ''}<small>${x.heat >= 10000 ? (x.heat / 10000).toFixed(1) + '亿' : x.heat.toFixed(1) + '万'}</small></div>`).join('') || (BUSY.hot ? '<div class="gys-busy">⏳</div>' : '')}</div>`;
}
Y.__hot = () => genHot(true);

/* ---------------- 直播连麦（258） ---------------- */
Y.micAsk = async id => { const l = liveOf(id); if (!l || l.end) return; if (!micOn()) return X.toast('连麦没开', '设置 → 全部开关 →「抖音直播连麦」'); if (!G.charOf(l.host)) return X.toast(X.v('主播没理你', '主播还没通过', '申请发出去了，主播没看到'), ''); X.toast(X.v('已申请连麦，等主播同意', '申请发过去了'), ''); setTimeout(() => micStart(l, 'ask'), G.rnd(1500, 4000)); };
function micStart(l, why) { if (!l || l.end) return; l.mic = { at: Date.now(), lines: [] }; l.lines.push({ by: '系统', t: `${nameOf('me')} 和主播连麦了`, at: Date.now() }); saveD(); paintRoom(l); step(l, why === 'invite' ? '她接受了你的连麦邀请，现在你们在连麦（直播间的人都看得到听得到）。先跟她说句话。' : '她申请连麦，你同意了，现在你们在连麦（直播间的人都看得到听得到）。先跟她说句话。'); }
Y.micEnd = id => { const l = liveOf(id); if (!l || !l.mic) return; const sec = Math.round((Date.now() - l.mic.at) / 1000); (l.micLog = l.micLog || []).push({ at: l.mic.at, sec, said: l.lines.filter(x => x.me && x.at >= l.mic.at).map(x => x.t).slice(-6) }); l.mic = null; l.lines.push({ by: '系统', t: `连麦结束 · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, at: Date.now() }); saveD(); paintRoom(l); step(l, '你们刚结束连麦，跟直播间说一句。'); };
window.gysDouyinMicInvite = async id => { const l = liveOf(id); if (!l || l.end) return X.toast('直播已经结束了', ''); G.open(APP, 'home'); CH = 'live'; Y.room(id); setTimeout(async () => { if (await G.confirm(`${nameOf(l.host)} 邀请你连麦`)) micStart(l, 'invite'); }, 600); };
function head(t) { return t === 'home' ? '' : `<div class="gys-hd dy-hd"><span class="gys-bk" onclick="GYS.close('douyin')">${G.ic('back', 22)}</span><b>${{ friend: '朋友', post: '发作品', msg: '消息', me: nameOf('me') }[t] || '抖音'}</b></div>`; }
G.app(APP, {
    tabs: [['home', '首页', ''], ['friend', '朋友', ''], ['post', '＋', ''], ['msg', '消息', '', () => unread() || ''], ['me', '我', '']],
    head, render: t => { setTimeout(bindSwipe, 30); return t === 'friend' ? friendTab() : t === 'post' ? postTab() : t === 'msg' ? msgTab() : t === 'me' ? profHtml('me') : homeHtml(); },
    onOpen: () => { if (!D.vids.some(v => v.by !== 'me' && !G.charOf(v.by))) genFeed('rec'); }
});
window.gysDouyinOpen = tab => G.open(APP, tab);
window.gysDouyinOpenVid = id => { G.open(APP); Y.openVid(id); };
window.gysDouyinOpenCmt = id => { G.open(APP); Y.cmts(id); };
window.gysDouyinOpenLive = id => { G.open(APP, 'home'); CH = 'live'; G.repaint(APP); if (liveOf(id)) Y.room(id); };
window.gysDouyinOpenDm = w => { G.open(APP, 'msg'); Y.dm(w); };
window.gysDouyinOpenProf = w => { G.open(APP); Y.prof(w); };
// 老「📺 直播间」插件的入口还能用（老通知点了也能跳过来）
if (typeof window.gyxLiveOpen !== 'function') window.gyxLiveOpen = id => { const l = D.lives.find(x => x.oldId === id || x.id === id) || D.lives.find(x => x.ta && !x.end) || D.lives.find(x => x.ta); if (l) window.gysDouyinOpenLive(l.id); else { G.open(APP, 'home'); CH = 'live'; G.repaint(APP); } };
window.gyxLiveStart = async cid => { const c = X.char(cid) || X.cur(); if (!c) return; const l = await taLive(c); if (l) window.gysDouyinOpenLive(l.id); return l; };

/* ---------------- 谷雨这边 ---------------- */
X.mini({ id: 'gysDouyin', icon: '🎶', title: '抖音', desc: '上下滑刷视频、评论、发作品、直播连麦、日常、热榜、私信', cat: '软件', onOpen: () => G.open(APP) }, 'gysDouyin');
const rare = (c, k, h) => Date.now() - ((D.last[k + c.id]) || 0) > h * 3600e3;
const mark = (c, k) => { D.last[k + c.id] = Date.now(); saveD(); };
X.action({ key: 'gys_dy_post', label: '发一条抖音', hint: '随手拍的日常 / 才艺 / vlog', need: c => rare(c, 'p', 24), run: async c => { mark(c, 'p'); const v = await taVid(c); if (!v) return null; G.notify(APP, c, `🎶 <b>${X.esc(c.name)}</b> 发布了新作品`, v.cap || v.scene, X.go('gysDouyinOpenVid', v.id)); return { text: '发了一条抖音：' + (v.cap || v.scene), selfNotified: true, jump: X.go('gysDouyinOpenVid', v.id) }; } }, 'gysDouyin');
X.action({ key: 'gys_dy_live', label: '在抖音开一场直播，叫她来看', hint: '弹琴、做饭、打游戏、随便聊聊都行', need: c => rare(c, 'l', 48) && !onAir().some(l => l.host === charW(c)), run: async c => { mark(c, 'l'); const l = await taLive(c); if (!l) return null; G.notify(APP, c, `🔴 <b>${X.esc(c.name)}</b> 正在直播`, l.title, X.go('gysDouyinOpenLive', l.id)); return { text: `在抖音开了直播《${l.title}》，想她来看`, selfNotified: true, jump: X.go('gysDouyinOpenLive', l.id) }; } }, 'gysDouyin');
X.action({ key: 'gys_dy_like', label: '刷到她的抖音，点赞评论', hint: '她发的作品', need: c => D.vids.some(v => v.by === 'me' && v.vis !== 'self' && !flat(v).some(k => k.by === charW(c))), run: async c => {
    const v = D.vids.find(v => v.by === 'me' && v.vis !== 'self' && !flat(v).some(k => k.by === charW(c))); if (!v) return null;
    const t = X.plain(await X.ask(`${X.who(c)}\n你刷到她发的抖音：画面「${v.scene}」，文案「${v.cap}」。你点了赞，在评论区写一句（评论区的口吻，别人也看得到）。只写那一句。`) || '').slice(0, 150); if (!t) return null;
    if (!v.likes.includes(charW(c))) v.likes.push(charW(c)); v.cmts.unshift({ id: G.uid('dc'), by: charW(c), text: t, at: Date.now(), likeN: G.rnd(0, 30), likes: [], kids: [] }); v.cmtN = (v.cmtN || 0) + 1; D.notes.unshift({ t: 'cmt', by: charW(c), vid: v.id, text: t, at: Date.now() }); saveD();
    G.notify(APP, c, `🎶 <b>${X.esc(c.name)}</b> 评论了你的作品`, t, X.go('gysDouyinOpenCmt', v.id)); return { text: '在她的抖音下面评论：' + t, selfNotified: true, jump: X.go('gysDouyinOpenCmt', v.id) };
} }, 'gysDouyin');
X.action({ key: 'gys_dy_send', label: '在抖音私信甩一个视频给她', hint: '「你看这个」「好像你」', need: c => rare(c, 's', 20) && D.vids.some(v => v.by !== 'me' && v.by !== charW(c)), run: async c => {
    mark(c, 's'); const L = D.vids.filter(v => v.by !== 'me' && v.by !== charW(c)).slice(0, 8); if (!L.length) return null;
    const o = X.json(await X.ask(`${X.who(c)}\n你在刷抖音，刷到了：\n${L.map((v, i) => `${i + 1}. @${nameOf(v.by)}：${v.cap}（画面：${v.scene}）`).join('\n')}\n挑一条最想甩给她的，在抖音私信发给她，再说一句。都不想就 {"i":0}。只输出 JSON：{"i":序号,"say":"一句话"}`)); const k = o && Number(o.i); if (!k || !L[k - 1]) return null;
    const t = dmOf(charW(c)); t.msgs.push({ id: G.uid('dm'), from: charW(c), t: 'vid', vid: L[k - 1].id, at: Date.now() }); if (o.say) t.msgs.push({ id: G.uid('dm'), from: charW(c), text: X.plain(o.say).slice(0, 200), at: Date.now() }); t.unread = (t.unread || 0) + 1; t.at = Date.now(); saveD();
    G.notify(APP, c, `🎶 <b>${X.esc(c.name)}</b> 分享了一个视频`, o.say || '', X.go('gysDouyinOpenDm', charW(c))); return { text: '在抖音私信给她甩了个视频：' + (L[k - 1].cap || ''), selfNotified: true };
} }, 'gysDouyin');
X.today(() => { const d = X.day(); const rows = []; onAir().filter(l => l.ta).forEach(l => rows.push({ t: nameOf(l.host), x: '🔴 正在直播：' + l.title, go: X.go('gysDouyinOpenLive', l.id) })); D.vids.filter(v => G.charOf(v.by) && X.day(new Date(v.at)) === d).slice(0, 2).forEach(v => rows.push({ t: nameOf(v.by), x: '发了作品：' + (v.cap || v.scene).slice(0, 30), go: X.go('gysDouyinOpenVid', v.id) })); const u = Object.values(D.dms).reduce((n, t) => n + (t.unread || 0), 0); if (u) rows.push({ t: '私信', x: u + ' 条没看', go: X.go('gysDouyinOpen', 'msg') }); return rows.length ? { title: '🎶 抖音', rows: rows.slice(0, 4) } : null; }, 'gysDouyin');
X.widget('gysDyW', { n: '抖音', sizes: ['s', 'm'], tap: () => { const l = onAir().find(x => x.ta); if (l) window.gysDouyinOpenLive(l.id); else G.open(APP); }, r: () => { const l = onAir().find(x => x.ta); const v = D.vids.find(v => G.charOf(v.by)); return `<div style="padding:10px;font-size:12px;line-height:1.6;background:#111;color:#fff;height:100%;box-sizing:border-box"><b>🎶 抖音</b><br>${l ? `🔴 ${esc(nameOf(l.host))} 正在直播<br>${esc(l.title)}` : v ? `${esc(nameOf(v.by))}：${esc((v.cap || v.scene).slice(0, 26))}` : '打开刷一会儿'}</div>`; } }, 'gysDouyin');
X.mem({ k: 'gysDyVid', ico: '🎶', n: 'TA 的抖音作品', d: 'TA 在抖音发过的视频（改了就是改文案，删了就没了）', items: c => D.vids.filter(v => v.by === 'c:' + c.id), text: v => v.cap || v.scene, edit: (v, x) => { v.cap = String(x).slice(0, 200); }, del: (c, i) => { const L = D.vids.filter(v => v.by === 'c:' + c.id); if (L[i]) D.vids = D.vids.filter(x => x !== L[i]); }, meta: v => G.ago(v.at), save: () => saveD() }, 'gysDouyin');
X.mem({ k: 'gysDyLive', ico: '🔴', n: 'TA 的直播', d: 'TA 在抖音播过的直播（改了就是改 TA 记住的那句，删了就没了）', items: c => D.lives.filter(l => l.host === 'c:' + c.id), text: l => `《${l.title}》${l.sum || ''}`, edit: (l, x) => { l.sum = String(x).replace(/^《[^》]*》/, '').slice(0, 60); }, del: (c, i) => { const L = D.lives.filter(l => l.host === 'c:' + c.id); if (L[i]) D.lives = D.lives.filter(x => x !== L[i]); }, meta: l => new Date(l.at).toLocaleString() + (l.end ? '' : ' · 直播中'), save: () => saveD() }, 'gysDouyin');
X.mem({ k: 'gysDyDm', ico: '💬', n: 'TA 在抖音私信说的', d: 'TA 在抖音私信里发给你的（改了就是改内容，删了就没了）', items: c => (D.dms['c:' + c.id] || { msgs: [] }).msgs.filter(m => m.from === 'c:' + c.id && m.text), text: m => m.text, edit: (m, x) => { m.text = String(x).slice(0, 500); }, del: (c, i) => { const t = D.dms['c:' + c.id]; if (!t) return; const L = t.msgs.filter(m => m.from === 'c:' + c.id && m.text); if (L[i]) t.msgs = t.msgs.filter(x => x !== L[i]); }, meta: m => G.ago(m.at), save: () => saveD() }, 'gysDouyin');
X.ctx(id => {
    const c = X.char(id); if (!c) return ''; const w = charW(c), L = [];
    const l = onAir().find(x => x.host === w); if (l) L.push(`你正在抖音直播《${l.title}》`); else { const e = D.lives.find(x => x.host === w && x.end && Date.now() - x.end < 864e5); if (e) L.push(`你今天 / 昨天在抖音播过《${e.title}》${e.sum ? '：' + e.sum : ''}`); }
    const mv = D.vids.find(v => v.by === w); if (mv && Date.now() - mv.at < 3 * 864e5) L.push('你最近发的抖音：' + (mv.cap || mv.scene).slice(0, 40));
    const hv = D.vids.find(v => v.by === 'me' && v.vis !== 'self'); if (hv && Date.now() - hv.at < 3 * 864e5) L.push('她最近发的抖音：' + (hv.cap || hv.scene).slice(0, 40));
    const t = D.dms[w]; if (t && t.msgs.length) L.push('抖音私信里最近：' + t.msgs.slice(-4).map(m => (m.from === 'me' ? '她' : '你') + '：' + (m.t === 'vid' ? '[视频]' : m.text)).join(' / '));
    return L.length ? `【抖音】${L.join('；')}` : '';
}, 'gysDouyin');
X.inj('gysDouyin', [['抖音', '抖音：TA 在不在直播、最近发的作品、她发的作品、抖音私信', '让 TA 知道你们在抖音上的事']]);
G.feedReg('douyin', () => D.vids.filter(v => v.by !== 'me' && v.vis !== 'self' && Date.now() - v.at < 3 * 864e5).slice(0, 3).map(vCard));
G.badge.douyin = unread;

X.css('gys-douyin-css', `
.gys-douyin{--gys-accent:#fe2c55;background:#161823;color:#fff}.gys-douyin .gys-tabs{background:#000!important;color:#aaa}.gys-douyin .gys-tb.on{color:#fff}.gys-douyin .gys-tb i{font-size:15px;font-style:normal;font-weight:600}
.gys-douyin .gys-tb:nth-child(3) i{width:42px;height:28px;border-radius:8px;background:#fff;color:#000;box-shadow:-3px 0 0 #25f4ee,3px 0 0 #fe2c55;font-size:22px}
.dy-hd{background:#161823!important;color:#fff;border-color:#222!important}.dy-hd .gys-bk{color:#fff}
.dy-home{position:relative;height:100%;background:#000}.dy-top{position:absolute;top:0;left:0;right:0;z-index:5;display:flex;align-items:center;justify-content:center;gap:18px;padding:calc(12px + env(safe-area-inset-top,0px)) 14px 8px;background:linear-gradient(rgba(0,0,0,.5),transparent)}.dy-top b{font-size:16.5px;opacity:.65;cursor:pointer;font-weight:500}.dy-top b.on{opacity:1;font-weight:700;border-bottom:2px solid #fff;padding-bottom:3px}.dy-top>span{position:absolute;font-size:20px;cursor:pointer}.dy-top>span:first-child{left:14px;font-size:30px}.dy-top>span:last-child{right:14px}
.dy-stage{position:absolute;inset:0}.dy-v{position:absolute;inset:0;overflow:hidden;user-select:none}.dy-scene{position:absolute;top:28%;left:0;right:70px;text-align:center;padding:0 24px}.dy-scene i{display:block;font-style:normal;font-size:96px;line-height:1.2;filter:drop-shadow(0 6px 20px rgba(0,0,0,.4))}.dy-scene p{font-size:14px;opacity:.75;line-height:1.6;margin-top:10px}
.dy-rail{position:absolute;right:8px;bottom:110px;display:flex;flex-direction:column;align-items:center;gap:16px;z-index:3}.dy-rail>span{display:flex;flex-direction:column;align-items:center;font-size:12px;cursor:pointer;text-shadow:0 1px 3px rgba(0,0,0,.5)}.dy-rail i{font-style:normal;font-size:30px;line-height:1.15}.dy-ra{position:relative;margin-bottom:6px}.dy-ra .gys-av{border:2px solid #fff}.dy-ra b{position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);width:20px;height:20px;border-radius:50%;background:#fe2c55;color:#fff;font-size:14px;line-height:20px;text-align:center}
.dy-disc .gys-av{border:7px solid #222;animation:dySpin 6s linear infinite}@keyframes dySpin{to{transform:rotate(360deg)}}
.dy-info{position:absolute;left:12px;right:80px;bottom:22px;z-index:3;text-shadow:0 1px 3px rgba(0,0,0,.6)}.dy-info em{font-style:normal;font-size:12px;background:rgba(255,255,255,.18);border-radius:4px;padding:2px 6px;display:inline-block;margin-bottom:6px}.dy-info b{font-size:16px;cursor:pointer}.dy-info small{opacity:.7}.dy-info p{margin:5px 0;font-size:14.5px;line-height:1.5}.dy-info u{text-decoration:none;font-weight:600}
.dy-mu{font-size:13px;display:flex;gap:6px;overflow:hidden;white-space:nowrap}.dy-mu span{overflow:hidden;width:180px}.dy-mu i{display:inline-block;font-style:normal;animation:dyMq 8s linear infinite;padding-left:100%}@keyframes dyMq{to{transform:translateX(-100%)}}
.dy-prog{position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(255,255,255,.15);z-index:3}.dy-prog i{display:block;height:100%;background:rgba(255,255,255,.75);animation:dyProg linear infinite}@keyframes dyProg{from{width:0}to{width:100%}}
.dy-heart{position:absolute;font-style:normal;font-size:80px;z-index:6;pointer-events:none;animation:dyHeart .7s ease-out forwards}@keyframes dyHeart{0%{transform:scale(.4) rotate(-12deg);opacity:0}30%{transform:scale(1.2) rotate(-12deg);opacity:1}100%{transform:scale(1.6) translateY(-60px);opacity:0}}
.dy-nav{position:absolute;right:14px;top:45%;z-index:4;display:flex;flex-direction:column;gap:10px;opacity:.35}.dy-nav span{cursor:pointer;font-size:20px;background:rgba(255,255,255,.12);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center}@media (pointer:coarse){.dy-nav{display:none}}
.dy-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#888;gap:10px}.dy-empty a{color:#fe2c55;cursor:pointer}
.dy-lp{overflow-y:auto;padding-top:60px}.dy-lgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px}.dy-lc{position:relative;aspect-ratio:3/4;border-radius:8px;overflow:hidden;cursor:pointer;display:flex;flex-direction:column;justify-content:flex-end;padding:8px;box-sizing:border-box}.dy-lc em{position:absolute;top:6px;left:6px;font-style:normal;font-size:11px;background:#fe2c55;border-radius:4px;padding:1px 5px}.dy-lc i{position:absolute;top:30%;left:0;right:0;text-align:center;font-style:normal;font-size:46px}.dy-lc b{font-size:13.5px;line-height:1.3}.dy-lc small{font-size:11.5px;opacity:.8;display:flex;align-items:center;gap:4px;margin-top:3px}
.dy-sec{padding:14px 14px 6px;font-weight:600;font-size:15px;display:flex;justify-content:space-between;color:#fff}.dy-sec a{cursor:pointer;color:#aaa}.dy-tip{padding:8px 14px;color:#888;font-size:13px}
.dy-rec,.dy-row{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;position:relative}.dy-rec b,.dy-row b{font-size:14.5px;display:block}.dy-rec small,.dy-row small{font-size:12px;color:#999}.dy-rec>div,.dy-row>div{flex:1;min-width:0}.dy-row sup{background:#fe2c55;border-radius:9px;padding:0 6px;font-size:11px}
.gys-root.gys-douyin .dy-rb{background:#000!important}.dy-room{position:relative;min-height:100%;overflow:hidden;padding-bottom:20px}.dy-rh{display:flex;align-items:center;gap:8px;padding:12px 12px 6px}.dy-rh>div{background:rgba(0,0,0,.3);border-radius:999px;padding:2px 12px 2px 4px}.dy-rh b{font-size:13.5px;display:block}.dy-rh small{font-size:10.5px;opacity:.8}.dy-rh span{background:#fe2c55;border-radius:999px;padding:4px 10px;font-size:12.5px;cursor:pointer}.dy-rh em{margin-left:auto;font-style:normal;font-size:12px;background:rgba(0,0,0,.3);border-radius:999px;padding:3px 9px}.dy-rh i{font-style:normal;font-size:20px;cursor:pointer;padding:0 4px}
.dy-rt{margin:0 14px;font-size:12.5px;opacity:.85}.dy-rscene{text-align:center;padding:30px 20px}.dy-rscene i{font-style:normal;font-size:80px}.dy-rscene p{font-size:13px;opacity:.75}
.dy-dm{max-height:260px;overflow-y:auto;padding:0 12px;mask-image:linear-gradient(transparent,#000 20%)}.dy-dm p{margin:5px 0;font-size:13.5px;background:rgba(0,0,0,.28);display:table;border-radius:12px;padding:3px 10px}.dy-dm b{color:#9fd4ff;font-weight:500}.dy-dm p.h{background:rgba(254,44,85,.35)}.dy-dm p.h b{color:#fff}.dy-dm p.m b{color:#ffd54f}
.dy-fx{position:absolute;inset:0;pointer-events:none}.dy-fx i,.dy-fx b{position:absolute;bottom:80px;font-style:normal;font-size:26px;animation:dyUp 1.8s ease-out forwards}.dy-fx b{font-size:40px;animation-duration:2.4s}@keyframes dyUp{to{transform:translateY(-320px) scale(1.3);opacity:0}}
.dy-rend{text-align:center;padding:20px;font-size:15px;opacity:.85}.dy-rin{display:flex;gap:10px;align-items:center;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));background:#000}.dy-rin input{flex:1;border:none;background:rgba(255,255,255,.12);border-radius:999px;padding:9px 14px;color:#fff;font-size:14px;outline:none}.dy-rin span{font-size:24px;cursor:pointer}
.gys-root.gys-douyin .dy-cb{background:#fff!important;color:#222}body.dark-theme .gys-root.gys-douyin .dy-cb{background:#1c1c1e!important;color:#eee}
.dy-c{display:flex;gap:10px;padding:10px 14px}.dy-c.kid{padding:6px 14px 6px 58px}.dy-c>div{flex:1;min-width:0;cursor:pointer}.dy-c small{font-size:12.5px;color:#8a8a8a}.dy-c small u{text-decoration:none;background:#fe2c55;color:#fff;border-radius:3px;font-size:10px;padding:0 3px}.dy-c p{margin:3px 0;font-size:14.5px;line-height:1.5}.dy-c em{font-style:normal;font-size:11.5px;color:#aaa}.dy-c em i{font-style:normal;color:#fe2c55}.dy-c>span{text-align:center;font-size:11px;color:#999;cursor:pointer}
.dy-cin{display:flex;gap:8px;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));border-top:.5px solid rgba(128,128,128,.25);background:inherit}.dy-cin input{flex:1;border:none;background:rgba(128,128,128,.14);border-radius:999px;padding:9px 14px;font-size:14px;color:inherit;outline:none}.dy-cin span{color:#fe2c55;align-self:center;cursor:pointer}
.dy-pub{padding:12px 4px 30px}.dy-pub .gys-f span{color:#aaa}.dy-pub .gys-f input,.dy-pub .gys-f textarea,.dy-pub .gys-f select{border-color:#333;color:#fff;background:#1f2030}.dy-pimg{margin:6px 16px;width:120px;aspect-ratio:9/16;border-radius:10px;background:#1f2030 center/cover no-repeat;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:30px;cursor:pointer;color:#888;text-align:center}.dy-pimg small{font-size:11px;padding:0 8px}.dy-pub .gys-btn{background:#fe2c55;width:100%}
.dy-frs{display:flex;gap:14px;overflow-x:auto;padding:4px 14px}.dy-frs span{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;position:relative;flex-shrink:0}.dy-frs i{font-style:normal;font-size:12px}.dy-frs em{position:absolute;top:38px;font-style:normal;font-size:9.5px;background:#fe2c55;border-radius:3px;padding:0 3px}
.dy-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}.dy-cell{position:relative;aspect-ratio:3/4;cursor:pointer;display:flex;align-items:center;justify-content:center}.dy-cell i{font-style:normal;font-size:38px}.dy-cell small{position:absolute;left:5px;bottom:4px;font-size:11.5px}.dy-cell em{position:absolute;right:4px;top:4px;font-style:normal;font-size:11px}
.gys-root.gys-douyin .dy-vb{background:#000!important}.dy-one{position:relative;height:calc(100vh - 140px);min-height:480px}.dy-x{position:absolute;top:10px;left:12px;font-size:30px;z-index:6;cursor:pointer}
.dy-pf{padding-bottom:20px}.dy-pfbg{height:130px;background:linear-gradient(135deg,#2b2d42,#55305b) center/cover}.dy-pfh{display:flex;align-items:flex-end;gap:12px;padding:0 16px;margin-top:-36px}.dy-pfh .gys-av{border:3px solid #161823}.dy-pfh b{font-size:20px;display:block}.dy-pfh small{font-size:12px;color:#999}
.dy-pfn{display:flex;gap:20px;padding:14px 16px 4px;font-size:13px;color:#aaa}.dy-pfn b{color:#fff;font-size:16px;margin-right:3px}.dy-bio{padding:4px 16px;margin:0;font-size:13.5px;color:#ccc}.dy-lk{font-style:normal;font-size:12px;color:#aaa;margin:0 0 0 16px}
.dy-onair{margin:8px 16px;padding:9px 12px;border-radius:8px;background:rgba(254,44,85,.2);font-size:13.5px;cursor:pointer}
.dy-pfo{display:flex;gap:8px;padding:10px 16px}.dy-pfo span{flex:1;text-align:center;background:#2f3040;border-radius:6px;padding:8px;font-size:14px;cursor:pointer}.dy-pfo span.r{background:#fe2c55}
.dy-pft{display:flex;border-bottom:.5px solid #333;margin-top:6px}.dy-pft span{flex:1;text-align:center;padding:10px;color:#888;cursor:pointer}.dy-pft span.on{color:#fff;border-bottom:2px solid #fe2c55}
.dy-dms{padding:12px}.dy-dmr{display:flex;gap:8px;margin:10px 0;align-items:flex-start}.dy-dmr.me{justify-content:flex-end}.dy-dmr p{margin:0;max-width:70%;background:#2f3040;border-radius:12px;padding:8px 12px;font-size:14.5px;line-height:1.5}.dy-dmr.me p{background:#3a7afe}
.dy-dmv{width:130px;aspect-ratio:3/4;border-radius:10px;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer}.dy-dmv i{font-style:normal;font-size:40px}.dy-dmv small{position:absolute;left:6px;right:6px;bottom:6px;font-size:11px;line-height:1.35}
.dy-sbox{display:flex;gap:8px;padding:10px 14px}.dy-sbox input{flex:1;border:none;background:#2f3040;border-radius:8px;padding:9px 12px;color:#fff;font-size:14px;outline:none}.dy-sbox span{align-self:center;color:#fe2c55;cursor:pointer}
`);

(async () => {
    await G.ready(); D = Object.assign(D, await ST.get('d', {}) || {});
    ['vids', 'lives', 'notes', 'follow'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; }); ['dms', 'last', 'cfg'].forEach(k => { if (!D[k] || typeof D[k] !== 'object') D[k] = {}; });
    // 老「📺 直播间」插件的直播记录搬过来（只搬一次，老的数据不删）
    if (!D.migrated) { try { const old = await X.store('live').get('d', null); if (old && Array.isArray(old.lives)) { old.lives.forEach(L => { if (!L || D.lives.some(x => x.oldId === L.id)) return; D.lives.push({ id: G.uid('dl'), oldId: L.id, host: 'c:' + L.cid, ta: 1, title: L.title || '直播', scene: L.scene || '', ico: '🎤', viewers: L.viewers || G.rnd(50, 500), lines: (L.lines || []).map(x => x.me ? { me: 1, t: x.t || '', gift: x.gift || '', at: x.at } : x.ta || x.who === 'host' ? { host: 1, t: x.t || '', at: x.at } : { by: x.who || '路人', t: x.t || '', gift: x.gift || '', at: x.at }), at: L.at || Date.now(), end: L.end || Date.now(), sum: L.sum || '', gifts: L.gifts || 0, likes: 0 }); }); } } catch (e) {} D.migrated = 1; saveD(); }
})();
window.gysDyState = () => D;
// 💬 互通（256）
try { G.chatReg(APP, { all: c => { const t = D.dms['c:' + c.id]; return t ? t.msgs.map(m => ({ at: m.at, t: (m.from === 'me' ? '她' : '你') + '：' + (m.t === 'vid' ? '[分享了一个视频]' : m.text) })) : []; }, lines: c => { const t = D.dms['c:' + c.id]; return t ? t.msgs.slice(-6).map(m => ({ at: m.at, t: (m.from === 'me' ? '她' : '你（' + c.name + '）') + '：' + (m.t === 'vid' ? '[分享了一个视频]' : m.text) })) : []; }, lastMe: c => { const t = D.dms['c:' + c.id]; const m = t && t.msgs.filter(x => x.from === 'me').slice(-1)[0]; return m ? m.at : 0; }, proactive: async c => { const t = dmOf('c:' + c.id); const n = t.msgs.length; await dmReply(t); return t.msgs.length > n; } }); } catch (e) {}
// 🌀 日常 / 🎙️ 连麦（258）
X.action({ key: 'gys_dy_daily', label: '在抖音发一条日常', hint: '24 小时消失的随手拍', need: c => dailyOn() && rare(c, 'dd', 10), run: async c => { mark(c, 'dd'); const d = await taDaily(c); if (!d) return null; return { text: `在抖音发了条日常：${d.scene}${d.cap ? '「' + d.cap + '」' : ''}`, jump: X.go('gysDouyinOpenDaily', d.by) }; } }, 'gysDyDaily');
X.action({ key: 'gys_dy_daily_see', label: '看她的抖音日常，回一句', hint: '她 24 小时内发的', need: c => dailyOn() && dailyOf('me').some(d => !(d.views || []).includes(charW(c))), run: async c => { const d = dailyOf('me').find(x => !(x.views || []).includes(charW(c))); if (!d) return null; d.views.push(charW(c)); d.likes = d.likes || []; if (!d.likes.includes(charW(c))) d.likes.push(charW(c)); saveD(); const r = X.plain(await X.ask(`${X.who(c)}\n她在抖音发了一条日常：${d.img ? '一张照片' : '画面「' + d.scene + '」'}${d.cap ? '，配的话「' + d.cap + '」' : ''}。你私信她一句。只写那一句。`) || '').slice(0, 120); if (!r) return { text: '看了她的抖音日常，点了个赞' }; const th = dmOf(charW(c)); th.msgs.push({ id: G.uid('dm'), from: charW(c), text: r, at: Date.now() }); th.at = Date.now(); th.unread = (th.unread || 0) + 1; saveD(); G.notify(APP, c, `🎶 <b>${X.esc(c.name)}</b> 回复了你的日常`, r, X.go('gysDouyinOpenDm', charW(c))); return { text: '看了她的抖音日常，私信她：' + r, selfNotified: true }; } }, 'gysDyDaily');
X.action({ key: 'gys_dy_mic', label: '在直播里邀请她连麦', hint: '你正在直播的时候', need: c => micOn() && onAir().some(l => l.host === charW(c) && !l.mic), run: async c => { const l = onAir().find(x => x.host === charW(c) && !x.mic); if (!l) return null; l.lines.push({ host: 1, t: X.v('我想叫一个人上来连麦…', '等一下，我邀请个人连麦', '连麦位给一个特别的人'), at: Date.now() }); saveD(); G.notify(APP, c, `🎙️ <b>${X.esc(c.name)}</b> 邀请你连麦`, '《' + l.title + '》', X.go('gysDouyinMicInvite', l.id)); return { text: `在直播《${l.title}》里邀请她连麦`, selfNotified: true, jump: X.go('gysDouyinMicInvite', l.id) }; } }, 'gysDyMic');
X.today(() => { if (!dailyOn()) return null; const L = liveDaily().filter(d => G.charOf(d.by)); const mine = dailyOf('me'); if (!L.length && !mine.length) return null; return { title: '🌀 抖音日常', rows: L.slice(-3).reverse().map(d => ({ t: nameOf(d.by), x: (d.cap || d.scene).slice(0, 30) + ((d.views || []).includes('me') ? '' : ' · 没看'), go: X.go('gysDouyinOpenDaily', d.by) })).concat(mine.length ? [{ t: '我', x: `${mine.length} 条日常 · ${new Set(mine.flatMap(d => d.views || [])).size} 人看过`, go: X.go('gysDouyinOpenDaily', 'me') }] : []) }; }, 'gysDyDaily');
X.today(() => { if (!micOn()) return null; const d = X.day(); const L = D.lives.filter(l => (l.micLog || []).some(m => X.day(new Date(m.at)) === d) || l.mic); if (!L.length) return null; return { title: '🎙️ 抖音连麦', rows: L.slice(0, 3).map(l => ({ t: nameOf(l.host), x: l.mic ? '正在连麦：' + l.title : `连麦 ${(l.micLog || []).length} 次 ·《${l.title}》`, go: X.go('gysDouyinOpenLive', l.id) })) }; }, 'gysDyMic');
X.widget('gysDyDailyW', { n: '抖音日常', sizes: ['s', 'm'], tap: () => { const d = liveDaily().filter(x => x.by !== 'me' && !(x.views || []).includes('me'))[0]; if (d) window.gysDouyinOpenDaily(d.by); else G.open(APP, 'friend'); }, r: () => { const L = liveDaily().filter(x => x.by !== 'me'); const un = L.filter(x => !(x.views || []).includes('me')); return `<div style="padding:10px;font-size:12px;line-height:1.6;background:#161823;color:#fff;height:100%;box-sizing:border-box"><b>🌀 日常</b><br>${un.length ? `${esc(nameOf(un[0].by))} 等 ${un.length} 条没看<br>${esc((un[0].cap || un[0].scene).slice(0, 20))}` : L.length ? '都看过了' : '24 小时内没人发'}</div>`; } }, 'gysDyDaily');
X.widget('gysDyMicW', { n: '抖音连麦', sizes: ['s'], tap: () => { const l = onAir().find(x => x.ta); if (l) window.gysDouyinOpenLive(l.id); else G.open(APP); }, r: () => { const l = onAir().find(x => x.ta); return `<div style="padding:10px;font-size:12px;line-height:1.6;background:#161823;color:#fff;height:100%;box-sizing:border-box"><b>🎙️ 连麦</b><br>${l ? (l.mic ? `正在和 ${esc(nameOf(l.host))} 连麦` : `${esc(nameOf(l.host))} 在播，可以申请连麦`) : '没人在播'}</div>`; } }, 'gysDyMic');
X.mem({ k: 'gysDyDaily', ico: '🌀', n: 'TA 的抖音日常', d: 'TA 发过的日常（24 小时后在抖音里消失，这里留着；改了就是改那句话，删了就没了）', items: c => (D.daily || []).filter(d => d.by === 'c:' + c.id), text: d => (d.cap ? d.cap + ' · ' : '') + d.scene, edit: (d, v) => { d.cap = String(v).split(' · ')[0].slice(0, 60); }, del: (c, i) => { const L = (D.daily || []).filter(d => d.by === 'c:' + c.id); D.daily = (D.daily || []).filter(d => d !== L[i]); }, meta: d => G.ago(d.at), save: () => saveD() }, 'gysDyDaily');
X.mem({ k: 'gysDyMic', ico: '🎙️', n: '和 TA 连过的麦', d: 'TA 直播时你们连麦的记录（改了就是改你说过的话，删了就没了）', items: c => D.lives.filter(l => l.host === 'c:' + c.id).flatMap(l => (l.micLog || []).map(m => Object.assign(m, { __l: l.title }))), text: m => `《${m.__l}》连麦 ${Math.round(m.sec / 60)} 分钟：${(m.said || []).join(' / ')}`, edit: (m, v) => { m.said = String(v).replace(/^.*?：/, '').split(' / ').slice(0, 6); }, del: (c, i) => { let k = 0; D.lives.filter(l => l.host === 'c:' + c.id).forEach(l => { l.micLog = (l.micLog || []).filter(() => k++ !== i); }); }, meta: m => G.ago(m.at), save: () => saveD() }, 'gysDyMic');
X.css('gys-douyin-258-css', `
.dy-dly{display:flex;gap:14px;overflow-x:auto;padding:12px 14px 8px;scrollbar-width:none}.dy-dly::-webkit-scrollbar{display:none}
.dy-dly>span{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;flex-shrink:0;width:62px}
.dy-dly b{position:relative;display:block;padding:3px;border-radius:50%}.dy-dly b.ring{background:conic-gradient(#fe2c55,#ff8a00,#25f4ee,#fe2c55)}.dy-dly b.ring.seen{background:#3a3a46}
.dy-dly b>.gys-av{border:2px solid #161823;display:block}.dy-dly u{position:absolute;right:0;bottom:0;width:18px;height:18px;border-radius:50%;background:#fe2c55;color:#fff;text-decoration:none;font-size:14px;line-height:17px;text-align:center;border:2px solid #161823}
.dy-dly i{font-style:normal;font-size:11.5px;color:rgba(255,255,255,.75);max-width:62px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.gys-root.gys-douyin .dy-dvb{background:#000!important;padding:0!important}
.dy-dv{position:relative;min-height:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer}
.dy-dvbar{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);left:8px;right:8px;display:flex;gap:3px}.dy-dvbar i{flex:1;height:2px;border-radius:1px;background:rgba(255,255,255,.3)}.dy-dvbar i.done{background:#fff}.dy-dvbar i.cur{background:linear-gradient(90deg,#fff 50%,rgba(255,255,255,.3) 50%);background-size:200% 100%;animation:dyDvP 5s linear forwards}
@keyframes dyDvP{from{background-position:100% 0}to{background-position:0 0}}
.dy-dvh{position:absolute;top:calc(env(safe-area-inset-top,0px) + 20px);left:12px;right:12px;display:flex;align-items:center;gap:8px}.dy-dvh small{color:rgba(255,255,255,.6)}.dy-dvh em{margin-left:auto;font-style:normal;font-size:20px;padding:4px}
.dy-dvc{position:absolute;left:16px;right:16px;bottom:90px;font-size:16px;text-shadow:0 1px 3px rgba(0,0,0,.5)}
.dy-dvf{position:absolute;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);display:flex;gap:10px;align-items:center}
.dy-dvf input{flex:1;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:22px;padding:10px 14px;color:#fff;outline:none;font-size:14px}.dy-dvf span{font-size:24px;cursor:pointer}.dy-dvf .v{font-size:13px;flex:1;color:rgba(255,255,255,.8)}
.dy-hot{padding:6px 0}.dy-hoth{display:flex;align-items:baseline;gap:8px;padding:10px 16px}.dy-hoth b{font-size:17px;color:#fff}.dy-hoth small{color:#888}.dy-hoth a{margin-left:auto;color:#aaa;font-size:13px;cursor:pointer}
.dy-hr{display:flex;align-items:center;gap:10px;padding:11px 16px;cursor:pointer}.dy-hr em{width:20px;font-style:normal;font-weight:700;color:#888;text-align:center}.dy-hr em.r1{color:#fe2c55}.dy-hr em.r2{color:#ff6a00}.dy-hr em.r3{color:#ffb800}
.dy-hr b{flex:1;font-weight:400;color:#fff;font-size:15px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.dy-hr small{color:#888;font-size:12px}
.dy-hr i{font-style:normal;font-size:11px;color:#fff;border-radius:3px;padding:0 4px;line-height:16px}.dy-hr i.t0{background:#2e82ff}.dy-hr i.t1{background:#ff6a00}.dy-hr i.t2{background:#fe2c55}
.dy-mic{display:grid;grid-template-columns:1fr 1fr;gap:2px;margin:10px 0}.dy-mic>div{height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#fff;border-radius:4px}.dy-mic small{font-size:11.5px;color:rgba(255,255,255,.75);padding:0 6px;text-align:center}.dy-mic .wv{color:#25f4ee}
.dy-rin .mic{font-size:13px!important;background:rgba(255,255,255,.15);border-radius:14px;padding:4px 10px}.dy-rin .mic.on{background:#fe2c55}
`);
X.css('gys-douyin-277-css', `
.dy-wp{padding-bottom:30px}.dy-wnow{display:flex;align-items:center;gap:12px;margin:16px 12px 0;padding:12px;border-radius:16px;background:#1c1c22;cursor:pointer}
.dy-wpl{width:92px;height:56px;border-radius:10px;background:linear-gradient(135deg,#2c3e50,#4a6b8a);display:flex;align-items:center;justify-content:center}.dy-wpl span{width:28px;height:28px;border-radius:14px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:12px}
.dy-wni{flex:1;min-width:0}.dy-wni b{display:block;font-size:15px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.dy-wni small{opacity:.5;font-size:12px}
.dy-wwith{display:flex;align-items:center;margin:16px 12px 0;padding:12px;border-radius:16px;background:#1c1c22}.dy-wwith>.gys-av+.gys-av{margin-left:-10px;border:2px solid #1c1c22}.dy-wwith>div{margin-left:10px;font-size:15px}
.dy-wts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 12px 0}.dy-wt{height:150px;border-radius:18px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;color:#fff}.dy-wt i{font-style:normal;font-size:34px}.dy-wt b{font-size:16px}
`);
