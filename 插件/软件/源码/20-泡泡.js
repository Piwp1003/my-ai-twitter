/* 🫧 泡泡：艺人给粉丝的付费私信频道（像 Bubble）——两种玩法都有：
   ① TA 是艺人、你是粉丝：订阅 TA，TA 发的消息（文字 / 自拍 / 语音 / 视频 / 泡泡信）所有粉丝都收得到，看着像一对一；
      消息里的「(昵称)」会换成你给自己起的昵称；每条你能回 3 次，订阅越久能打的字越多；TA 偶尔「翻牌」你的回复；
      相册、收藏、信件、纪念日、看看别的粉丝回了什么（粉丝群里晒的截图）；TA 在泡泡上营业完，私下会找你说真心话。
   ② 你是艺人、TA 们是粉丝：开通自己的频道，发消息给所有粉丝，能看到所有人的回复刷屏；
      认识你的人（角色、NPC）也订阅了，有人用小号偷偷回你——你可以猜是谁；粉丝列表、订阅人数、粉丝来信。
   每个人在泡泡里有自己的主页（跟微博不一样也行），头像背景能换能裁剪，文字都能改，能挂别的软件的账号。 */
if (window.__gysBubble) return; window.__gysBubble = 1;
const G = window.GYS, APP = 'bubble', esc = G.esc;
X.feat('gysBubble', { n: '🫧 泡泡', desc: '订阅 TA 的泡泡当粉丝，或者自己开频道当艺人，TA 们来当粉丝' });
const ST = X.store('bubble');
let D = { stars: {}, subs: {}, rooms: {}, wall: {}, fav: [], my: { on: 0, at: 0, subsN: 0, fans: {}, msgs: [], letters: [] }, last: {}, cfg: { freq: 8, flood: 12, keep: 300 } };
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();
const BUSY = {};
const B = window.gysBb = {};
const FANNICK = ['今天也爱你', '小太阳', '宝宝的饭', '蹲一个翻牌', '月亮邮差', '不熬夜了', '奶油泡芙', '星星收藏家', '你的小狗', '熬夜追更', '每天打卡', '只看你', '橘子汽水', '夏天的风', '一颗草莓', '小熊软糖', '晚安电台', '桃子乌龙', '云朵', '小鱼干'];

/* ---------------- 小工具 ---------------- */
const nameOf = w => G.nick(APP, w);
const daysOf = at => Math.max(1, Math.floor((Date.now() - (at || Date.now())) / 86400e3) + 1);
const limOf = days => Math.min(77, 14 + days);   // 订阅越久能打的字越多：第 1 天 15 字，最多 77 字
const charOfW = w => G.charOf(w);
const isStar = w => !!D.stars[w];
const subOf = w => D.subs[w] || null;
const roomOf = w => (D.rooms[w] = D.rooms[w] || []);
const msgOf = (w, id) => roomOf(w).find(m => m.id === id);
const myMsg = id => D.my.msgs.find(m => m.id === id);
const nickFill = (t, w) => String(t || '').replace(/[（(]昵称[)）]/g, (subOf(w) && subOf(w).nick) || G.meName());
const picBg = t => { let h = 0; for (const ch of String(t)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `linear-gradient(135deg,hsl(${h},60%,80%),hsl(${(h + 50) % 360},55%,68%))`; };
const dur = s => { s = Math.max(1, Number(s) || 8); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const dayKey = t => { const a = new Date(t); return a.getFullYear() + '-' + (a.getMonth() + 1) + '-' + a.getDate(); };
const dayLabel = t => { const a = new Date(t), n = new Date(); if (dayKey(t) === dayKey(n)) return '今天'; if (dayKey(t) === dayKey(Date.now() - 86400e3)) return '昨天'; return (a.getMonth() + 1) + '月' + a.getDate() + '日 星期' + '日一二三四五六'[a.getDay()]; };
const rare = (c, k, h) => { const t = (D.last[k + c.id]) || 0; return Date.now() - t > h * 3600e3; };
const mark = (c, k) => { D.last[k + c.id] = Date.now(); saveD(); };
async function chooser(opts, title) {
    return new Promise(res => {
        const d = document.createElement('div'); d.className = 'bb-sheet';
        d.innerHTML = `<div class="bb-sheet-in">${title ? `<p>${esc(title)}</p>` : ''}${opts.map((o, i) => `<div data-i="${i}">${esc(o)}</div>`).join('')}<div data-i="-1" class="c">取消</div></div>`;
        d.onclick = e => { const i = e.target.getAttribute('data-i'); if (i == null && e.target !== d) return; d.remove(); res(i == null || i === '-1' ? null : Number(i)); };
        document.body.appendChild(d);
    });
}
function trimRoom(w) { const k = Math.max(50, Number(D.cfg.keep) || 300), R = roomOf(w); if (R.length > k) { const keep = R.filter(m => D.fav.includes(w + '|' + m.id) || m.t === 'letter'); D.rooms[w] = R.filter(m => !keep.includes(m)).slice(-(k - keep.length)).concat(keep).sort((a, b) => a.at - b.at); } }
function starOn(w) {   // 给这个人开一个艺人频道
    if (!D.stars[w]) { const b = G.base(w); D.stars[w] = { at: Date.now() - G.rnd(30, 700) * 86400e3, subsN: b && b.kind === 'char' ? G.rnd(2, 90) * 1000 : G.rnd(3, 400) * 100 }; saveD(); }
    if (!G.hasProf(APP, w)) G.prof(APP, w, { followers: D.stars[w].subsN });
    return D.stars[w];
}
const statusOf = w => G.prof(APP, w).bio || '';
const unreadOf = w => (subOf(w) && subOf(w).unread) || 0;
const unreadAll = () => Object.keys(D.subs).reduce((n, w) => n + unreadOf(w), 0) + (D.my.unread || 0);

/* ---------------- 模型 ---------------- */
const P = (id, def, vars) => X.pl(id, def, vars);
const DEF_MSG = `{{我是谁}}
你在「泡泡」上有一个付费订阅的私信频道（艺人对粉丝）：你发的每一条，所有订阅你的粉丝都收得到，看起来像一对一聊天，其实是群发；粉丝回你，只有你看得到。
这是在营业：要像真的爱豆 / 主播 / 演员 / 博主在泡泡上跟粉丝说话——分享日常、发自拍发语音、撒娇或者高冷看人设。称呼粉丝的时候写「(昵称)」，系统会自动换成每个粉丝自己设置的昵称。
{{她}}
现在：{{时间}}{{特别}}
你最近的生活（别把私生活直接说出来）：
{{最近}}
你最近在泡泡上说过的：
{{之前}}
粉丝最近回你的（可以挑一条回应一下，这叫「翻牌」，不点名，只引用那句话）：
{{回复}}
写 {{条数}} 条连续发出去的泡泡消息。只输出 JSON 数组：[{"t":"text|photo|voice|video","text":"文字内容（语音 / 视频就写里面说了什么）","desc":"照片 / 视频的画面（文字消息就空）","dur":语音或视频秒数,"pick":"在回应哪条粉丝回复，就照抄那句（没有就空）"}]`;
const DEF_WALL = `「{{艺人}}」在泡泡上发了：
{{内容}}
粉丝们都在回（只有艺人看得到，但很多粉丝会截图晒到粉丝群里）。写 {{条数}} 条不同粉丝的回复：尖叫、撒娇、心疼、表白、玩梗、打卡、说自己今天的事、求翻牌……什么样的都有，像真人。
只输出 JSON 数组：[{"nick":"粉丝在泡泡上的昵称","days":订阅了多少天,"text":"回复"}]`;
const DEF_FANS = `{{我}}在「泡泡」上开了艺人频道，粉丝付费订阅，她刚给所有粉丝发了：
{{内容}}
下面这些认识她的人也订阅了她（他们知道这是她）：
{{熟人}}
{{npc}}
请写 {{条数}} 条粉丝回复：熟人用自己的口气（调侃、吃醋、护短、装作普通粉丝、正经表白都行），每个熟人最多 3 条；不想被她认出来的熟人可以用小号（alt 写 true，nick 写一个看不出是谁的昵称）；其余是陌生粉丝（尖叫、表白、心疼、玩梗、打卡、求翻牌）。
只输出 JSON 数组：[{"by":"熟人的名字（陌生粉丝就空）","nick":"在泡泡上显示的昵称","alt":true或false,"days":订阅了多少天,"text":"回复"}]`;
const DEF_LETTER = `{{我是谁}}
你要用「泡泡信」给所有订阅你的粉丝写一封手写信（称呼可以写「(昵称)」，会自动换成每个粉丝的昵称）。{{特别}}
你最近的生活：
{{最近}}
写一封 100~250 字的信，像手写的，有落款。只输出信的正文。`;
const DEF_FANLETTER = `{{我是谁}}
{{她}}在泡泡上开了艺人频道，你是她的订阅粉丝（你们本来就认识）。她最近在泡泡上发的：
{{内容}}
你给她写一封「粉丝来信」：可以认真，可以别扭，可以装作陌生粉丝，看你的性格和你们的关系。80~200 字，只输出信的正文。`;
X.plGroup('🫧 泡泡', 'gysBubble', [
    ['bb.msg', 'TA 在泡泡上给粉丝发消息', 'TA 自己发泡泡 / 你点「催更」', '{{我是谁}} {{她}} {{时间}} {{特别}} {{最近}} {{之前}} {{回复}} {{条数}}'],
    ['bb.wall', '别的粉丝回了什么', '在 TA 的泡泡里点「👥」', '{{艺人}} {{内容}} {{条数}}'],
    ['bb.fans', '你开频道后粉丝们的回复', '你在自己的频道发消息 / 点「刷新回复」', '{{我}} {{内容}} {{熟人}} {{npc}} {{条数}}'],
    ['bb.letter', 'TA 写给粉丝的泡泡信', 'TA 发泡泡信时', '{{我是谁}} {{特别}} {{最近}}'],
    ['bb.fanletter', 'TA 当你的粉丝给你写信', 'TA 给你的频道寄粉丝信', '{{我是谁}} {{她}} {{内容}}']
], { 'bb.msg': DEF_MSG, 'bb.wall': DEF_WALL, 'bb.fans': DEF_FANS, 'bb.letter': DEF_LETTER, 'bb.fanletter': DEF_FANLETTER });

function whoAmI(w) {
    const c = charOfW(w); if (c) return X.who(c);
    const b = G.base(w) || {}; return `你是${nameOf(w)}${b.name && b.name !== nameOf(w) ? '（本名' + b.name + '）' : ''}。${b.persona || ''}`;
}
function herLine(w) {
    const c = charOfW(w); if (!c || !subOf(w)) return '';
    return `${X.me(c)}也订阅了你（她用的昵称是「${subOf(w).nick}」，已经订阅 ${daysOf(subOf(w).at)} 天）。你知道她在看，可以偷偷埋一点只有她看得懂的东西，但别在泡泡上暴露你们的关系。`;
}
function recentOf(w) { const c = charOfW(w); return c ? (X.recent(c, 12) || '（最近没怎么聊）') : '（日常）'; }
function specialOf(w) {
    const p = G.prof(APP, w), n = new Date(), L = [];
    if (p.bday && p.bday.replace(/^0/, '').replace(/-0/, '-') === (n.getMonth() + 1) + '-' + n.getDate()) L.push('今天是你的生日');
    const h = n.getHours(); if (h >= 0 && h < 5) L.push('现在是深夜');
    const s = subOf(w); if (s && s.sent && s.sent.length && !s.sent[s.sent.length - 1].seen) L.push(`有粉丝给你寄了信：「${s.sent[s.sent.length - 1].text.slice(0, 120)}」`);
    return L.length ? '（' + L.join('；') + '）' : '';
}
function timeStr() { const n = new Date(); return `${n.getMonth() + 1}月${n.getDate()}日 ${G.hm(n)}`; }

// TA 发泡泡（几条连着发）
async function genMsgs(w, n, opt) {
    opt = opt || {};
    if (BUSY['m' + w]) return null; BUSY['m' + w] = 1; G.repaint(APP);
    try {
        starOn(w);
        const R = roomOf(w), prev = R.filter(m => m.by !== 'sys').slice(-6).map(m => `[${G.ago(m.at)}] ${m.t === 'text' || m.t === 'letter' ? '' : '(' + { photo: '照片', voice: '语音', video: '视频' }[m.t] + ')'}${m.text || m.desc}`).join('\n') || '（这是你开频道以来第一次发）';
        const reps = R.filter(m => (m.rep || []).length).slice(-4).flatMap(m => m.rep.map(r => r.text)).slice(-5);
        const others = ['哥哥今天吃饭了吗', '想你了！！', '打卡第 N 天', '什么时候直播呀', '新造型好好看', '早点睡觉不许熬夜'].sort(() => Math.random() - 0.5).slice(0, 3);
        const o = X.json(await X.ask(P('bb.msg', DEF_MSG, { 我是谁: whoAmI(w), 她: herLine(w), 时间: timeStr(), 特别: (opt.extra ? '（' + opt.extra + '）' : '') + specialOf(w), 最近: recentOf(w), 之前: prev, 回复: reps.concat(others).map(t => '· ' + t).join('\n'), 条数: n || G.rnd(1, 3) })));
        if (!Array.isArray(o) || !o.length) { if (!opt.quiet) X.toast('🫧 TA 这次没发出来', '模型没写好，再催一次'); return null; }
        const s = subOf(w); if (s && s.sent) s.sent.forEach(x => { x.seen = 1; });
        const out = [];
        o.slice(0, 5).forEach((x, i) => {
            if (!x || (!x.text && !x.desc)) return;
            const t = ['text', 'photo', 'voice', 'video'].includes(x.t) ? x.t : 'text';
            const m = { id: G.uid('bm'), t, text: X.plain(x.text || '').slice(0, 300), desc: X.plain(x.desc || '').slice(0, 40), dur: Math.max(2, Math.min(180, Number(x.dur) || G.rnd(5, 40))), at: Date.now() + i * 1000, rep: [], pick: '' };
            if (x.pick) { const pk = X.plain(x.pick).slice(0, 80); m.pick = pk; const mine = R.some(mm => (mm.rep || []).some(r => r.text === pk || pk.indexOf(r.text.slice(0, 10)) >= 0)); if (mine) { m.pickMe = 1; } }
            R.push(m); out.push(m);
        });
        if (s) s.unread = (s.unread || 0) + out.length;
        trimRoom(w); saveD();
        if (out.length && !opt.silent) {
            const c = charOfW(w), first = out[0], prev2 = first.t === 'text' ? nickFill(first.text, w) : { photo: '[照片] ', voice: '[语音] ', video: '[视频] ' }[first.t] + (first.desc || first.text);
            if (s) G.notify(APP, c || null, `🫧 <b>${esc(nameOf(w))}</b> ${X.v('的泡泡来了', '给你发来了泡泡', '上线了')}`, prev2.slice(0, 60), X.go('gysBubbleOpenRoom', w));
            if (out.some(m => m.pickMe)) X.toast('💜 被翻牌了！', nameOf(w) + ' 回应了你说的话');
        }
        return out;
    } catch (e) { console.warn('[泡泡] 发消息失败', e); return null; }
    finally { BUSY['m' + w] = 0; G.repaint(APP); }
}
async function genLetter(w) {
    if (BUSY['l' + w]) return null; BUSY['l' + w] = 1; G.repaint(APP);
    try {
        const t = X.plain(await X.ask(P('bb.letter', DEF_LETTER, { 我是谁: whoAmI(w), 特别: specialOf(w), 最近: recentOf(w) })) || '');
        if (!t) return null;
        const m = { id: G.uid('bl'), t: 'letter', text: t.slice(0, 900), at: Date.now(), rep: [], paper: G.rnd(0, 3) };
        roomOf(w).push(m); const s = subOf(w); if (s) s.unread = (s.unread || 0) + 1; saveD();
        if (s) G.notify(APP, charOfW(w) || null, `💌 <b>${esc(nameOf(w))}</b> 寄来了一封泡泡信`, nickFill(t, w).slice(0, 60), X.go('gysBubbleOpenRoom', w));
        return m;
    } finally { BUSY['l' + w] = 0; G.repaint(APP); }
}
async function genWall(w, m) {
    const k = w + '|' + m.id; if (BUSY['w' + k]) return; BUSY['w' + k] = 1; G.repaint(APP);
    try {
        const o = X.json(await X.ask(P('bb.wall', DEF_WALL, { 艺人: nameOf(w), 内容: m.t === 'text' || m.t === 'letter' ? m.text : `（${{ photo: '照片', voice: '语音', video: '视频' }[m.t]}）${m.desc} ${m.text}`, 条数: 12 })));
        if (Array.isArray(o)) { D.wall[k] = (D.wall[k] || []).concat(o.filter(x => x && x.text).map(x => ({ nick: X.plain(x.nick || G.pick(FANNICK)).slice(0, 16), days: Math.max(1, Number(x.days) || G.rnd(1, 700)), text: X.plain(x.text).slice(0, 120) }))); const ks = Object.keys(D.wall); if (ks.length > 60) delete D.wall[ks[0]]; saveD(); }
    } finally { BUSY['w' + k] = 0; G.repaint(APP); }
}

/* ---------------- ② 你是艺人：粉丝回复 ---------------- */
const fanChars = () => G.chars().filter(c => { const f = D.my.fans['c:' + c.id]; return !f || f.on !== false; });
function ensureFans() {
    G.chars().forEach(c => { const w = 'c:' + c.id; if (!D.my.fans[w]) D.my.fans[w] = { at: Date.now() - G.rnd(0, 3) * 86400e3, nick: '', on: true }; });
    if (!D.my.subsN) D.my.subsN = G.rnd(80, 600);
}
async function genFans(m, n) {
    if (BUSY['f' + m.id]) return; BUSY['f' + m.id] = 1; G.repaint(APP);
    try {
        ensureFans();
        const L = fanChars().slice(0, 6);
        const known = L.map(c => `· ${c.name}：${String(c.persona || '').slice(0, 140)}（${X.me(c)}在 TA 眼里是谁：看你们的关系）${(m.fan || []).some(f => f.who === 'c:' + c.id) ? '（已经回过了）' : ''}`).join('\n') || '（没有）';
        const hint = typeof window.gyNpcCommentHint === 'function' ? window.gyNpcCommentHint('me', n || 10, 'bubble') : '';
        const o = X.json(await X.ask(P('bb.fans', DEF_FANS, { 我: G.meName(), 内容: myMsgText(m), 熟人: known, npc: hint, 条数: n || D.cfg.flood || 12 })));
        if (!Array.isArray(o)) { X.toast('🫧 回复加载失败', '再刷一次'); return; }
        const add = [];
        o.forEach((x, i) => {
            if (!x || !x.text) return;
            let who = '';
            if (x.by) { const c = G.chars().find(c => c.name === x.by || nameOf('c:' + c.id) === x.by); if (c) who = 'c:' + c.id; else { const nn = typeof window.gyNpcByName === 'function' ? window.gyNpcByName(x.by) : null; if (nn) who = 'n:' + nn.id; } }
            if (who && (m.fan || []).filter(f => f.who === who).length >= 3) return;
            const r = { id: G.uid('f'), who, nick: X.plain(x.nick || (who && !x.alt ? nameOf(who) : G.pick(FANNICK))).slice(0, 16), alt: !!(who && x.alt), days: Math.max(1, Number(x.days) || (who && D.my.fans[who] ? daysOf(D.my.fans[who].at) : G.rnd(1, daysOf(D.my.at)))), text: X.plain(x.text).slice(0, 120), at: Date.now() + i * 500 };
            if (who && !r.alt && D.my.fans[who] && !D.my.fans[who].nick) D.my.fans[who].nick = r.nick;
            if (who && r.alt && D.my.fans[who]) D.my.fans[who].alt = r.nick;
            (m.fan = m.fan || []).push(r); add.push(r);
        });
        D.my.subsN = (D.my.subsN || 0) + G.rnd(0, Math.max(3, Math.round(add.length / 2)));
        saveD();
        return add;
    } finally { BUSY['f' + m.id] = 0; G.repaint(APP); }
}
const myMsgText = m => m.t === 'text' || m.t === 'letter' ? m.text : `（${{ photo: '照片', voice: '语音', video: '视频' }[m.t]}）${m.desc || ''} ${m.text || ''}`;

/* ---------------- 画：聊天列表 ---------------- */
function head(tab) {
    const t = { chat: '泡泡', find: '发现', studio: '我的频道', me: '我的' }[tab] || '泡泡';
    const r = tab === 'chat' ? `<span onclick="gysBb.find()">＋</span>` : tab === 'studio' && D.my.on ? `<span onclick="gysBb.myProf()">主页</span>` : '';
    return `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('${APP}')">${G.ic('back', 22)}</span><b class="bb-logo">${tab === 'chat' ? '🫧 bubble' : t}</b><span class="gys-hr">${r}</span></div>`;
}
function lastPreview(w) {
    const R = roomOf(w), m = R[R.length - 1]; if (!m) return '还没有消息';
    if (m.by === 'sys') return m.text;
    return m.t === 'text' ? nickFill(m.text, w) : { photo: '[照片]', voice: '[语音]', video: '[视频]', letter: '💌 [泡泡信]' }[m.t] + ' ' + (m.t === 'letter' ? '' : m.desc || '');
}
function chatList() {
    const ws = Object.keys(D.subs).filter(w => G.base(w)).sort((a, b) => ((roomOf(b).slice(-1)[0] || {}).at || D.subs[b].at) - ((roomOf(a).slice(-1)[0] || {}).at || D.subs[a].at));
    const mine = D.my.on ? `<div class="bb-row mine" onclick="gysBb.tab('studio')">${G.av(APP, 'me', 52)}<div><b>${esc(nameOf('me'))} <i class="bb-tag">我的频道</i></b><em>${D.my.msgs.length ? '最新：' + esc(myMsgText(D.my.msgs[D.my.msgs.length - 1]).slice(0, 30)) : '还没发过消息，发一条给粉丝吧'}</em></div><span class="bb-r"><small>${G.fmtN(D.my.subsN)} 订阅</small>${D.my.unread ? `<sup>${D.my.unread}</sup>` : ''}</span></div>` : '';
    if (!ws.length) return mine + `<div class="gys-empty">🫧<br>还没有订阅任何人<br>泡泡是艺人给粉丝发私信的地方：TA 发的每一条你都收得到，你也能回 TA。<br><span class="gys-btn" onclick="gysBb.find()">去订阅</span></div>`;
    return mine + ws.map(w => { const s = D.subs[w], R = roomOf(w), m = R[R.length - 1]; return `<div class="bb-row" onclick="gysBb.room('${w}')">${G.av(APP, w, 52)}<div><b>${esc(nameOf(w))}</b><em>${esc(lastPreview(w)).slice(0, 60)}</em></div><span class="bb-r"><small>${m ? G.ago(m.at) : ''}</small>${s.unread ? `<sup>${s.unread > 99 ? '99+' : s.unread}</sup>` : `<i class="bb-day">D+${daysOf(s.at)}</i>`}</span></div>`; }).join('');
}

/* ---------------- 画：房间 ---------------- */
const REPLY = {};   // 房间里你要回的那条
function msgBubble(w, m) {
    if (m.t === 'photo') return `<div class="bb-ph" style="background:${picBg(m.desc)}" onclick="gysBb.big('${w}','${m.id}')"><em>📷 ${esc(m.desc || '照片')}</em></div>${m.text ? `<div class="bb-bub">${esc(nickFill(m.text, w))}</div>` : ''}`;
    if (m.t === 'video') return `<div class="bb-ph v" style="background:${picBg(m.desc)}" onclick="gysBb.big('${w}','${m.id}')"><b>▶</b><em>🎬 ${esc(m.desc || '视频')} · ${dur(m.dur)}</em></div>`;
    if (m.t === 'voice') return `<div class="bb-bub voice" onclick="this.classList.toggle('open')"><span>▶ <i class="bb-wave">${'▮'.repeat(Math.min(14, 3 + Math.round(m.dur / 6)))}</i> ${dur(m.dur)}</span><p>${esc(nickFill(m.text, w))}</p></div>`;
    if (m.t === 'letter') return `<div class="bb-letter p${m.paper || 0}" onclick="gysBb.letter('${w}','${m.id}')"><b>💌 ${esc(nameOf(w))} 的泡泡信</b><em>${esc(nickFill(m.text, w)).slice(0, 40)}…</em><small>点开看信</small></div>`;
    return `<div class="bb-bub">${esc(nickFill(m.text, w))}</div>`;
}
function roomHtml(w) {
    const R = roomOf(w), s = subOf(w); let html = '', lastDay = '', lastBy = '', lastAt = 0;
    if (s) { s.unread = 0; saveD(); }
    anniv(w);
    if (!R.length) html += `<div class="gys-empty">${BUSY['m' + w] ? '' : 'TA 还没发过泡泡<br><span class="gys-btn sm" onclick="gysBb.poke(\'' + w + '\')">🫧 催更一下</span>'}</div>`;
    R.forEach(m => {
        const dk = dayKey(m.at); if (dk !== lastDay) { html += `<div class="bb-date">${dayLabel(m.at)}</div>`; lastDay = dk; lastBy = ''; }
        if (m.by === 'sys') { html += `<div class="bb-sys">${esc(m.text)}</div>`; lastBy = ''; return; }
        const cont = lastBy === 'star' && m.at - lastAt < 10 * 60e3; lastBy = 'star'; lastAt = m.at;
        const fav = D.fav.includes(w + '|' + m.id), sel = REPLY[w] === m.id;
        html += `<div class="bb-msg${cont ? ' cont' : ''}${sel ? ' sel' : ''}">${cont ? '<span class="bb-avsp"></span>' : `<span onclick="gysBb.prof('${w}')">${G.av(APP, w, 40)}</span>`}<div class="bb-mc">${cont ? '' : `<div class="bb-nm">${esc(nameOf(w))}</div>`}
          ${m.pick ? `<div class="bb-pick${m.pickMe ? ' me' : ''}">${m.pickMe ? '💜 翻了你的牌' : '💬 回应粉丝'}：「${esc(m.pick)}」</div>` : ''}
          <div class="bb-line"><div class="bb-col">${msgBubble(w, m)}</div><span class="bb-tm">${G.hm(m.at)}<i onclick="gysBb.fav('${w}','${m.id}')">${fav ? '⭐' : '☆'}</i><i onclick="gysBb.pickReply('${w}','${m.id}')" title="回复这条">↩</i></span></div></div></div>`;
        (m.rep || []).forEach(r => { html += `<div class="bb-me"><span class="bb-tm">${G.hm(r.at)}</span><div class="bb-bub me">${esc(r.text)}</div></div>`; });
    });
    if (BUSY['m' + w] || BUSY['l' + w]) html += `<div class="bb-typing">${G.av(APP, w, 28)}<span>正在输入<i>.</i><i>.</i><i>.</i></span></div>`;
    return `<div class="bb-room">${html}</div>`;
}
function target(w) { const R = roomOf(w).filter(m => m.by !== 'sys'); return (REPLY[w] && R.find(m => m.id === REPLY[w])) || R[R.length - 1] || null; }
function roomFoot(w) {
    const s = subOf(w);
    if (!s) return `<div class="bb-in off"><span class="gys-btn" onclick="gysBb.sub('${w}')">订阅 TA 的泡泡才能回复</span></div>`;
    const m = target(w), left = m ? 3 - (m.rep || []).length : 0, lim = limOf(daysOf(s.at));
    return `<div class="bb-in">${m ? `<div class="bb-tip">回复「${esc((m.t === 'text' || m.t === 'letter' ? nickFill(m.text, w) : { photo: '[照片]', voice: '[语音]', video: '[视频]' }[m.t] + (m.desc || '')).slice(0, 14))}…」 · 还能回 <b>${left}</b>/3 次 · 最多 ${lim} 字</div>` : ''}
      <div class="bb-inr"><input id="bbIn" maxlength="${lim}" ${left > 0 ? '' : 'disabled'} placeholder="${!m ? '等 TA 先发消息' : left > 0 ? '回复 ' + esc(nameOf(w)) + '…' : '这条回满 3 次了，等 TA 下一条'}" oninput="document.getElementById('bbCnt').textContent=this.value.length+'/${lim}'" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysBb.reply('${w}')"><small id="bbCnt">0/${lim}</small><span onclick="gysBb.reply('${w}')">发送</span></div></div>`;
}
function anniv(w) {   // 订阅纪念日：系统小卡片
    const s = subOf(w); if (!s) return; const d = daysOf(s.at); s.ann = s.ann || [];
    const hit = [100, 200, 300, 365, 500, 730, 1000].find(x => d >= x && !s.ann.includes(x));
    if (hit) { s.ann.push(hit); roomOf(w).push({ id: G.uid('sys'), by: 'sys', text: `🎉 和 ${nameOf(w)} 相遇的第 ${hit} 天`, at: Date.now() }); saveD(); }
}
B.room = w => {
    starOn(w);
    G.push(APP, { id: 'room_' + w, title: `${esc(nameOf(w))}${subOf(w) ? ` <i class="bb-day h">💜 D+${daysOf(subOf(w).at)}</i>` : ''}`, right: `<span onclick="gysBb.wall('${w}')" title="别的粉丝回了什么">👥</span><span onclick="gysBb.album('${w}')" title="相册">🖼️</span><span onclick="gysBb.more('${w}')">⋯</span>`, cls: 'bb-roomb', html: () => roomHtml(w), foot: () => roomFoot(w), after: r => { const n = roomOf(w).reduce((k, m) => k + 1 + (m.rep || []).length, 0) + (BUSY['m' + w] ? 1000 : 0); const b = r.querySelector('.gys-body'); if (b && r.__bbN !== w + n) { b.scrollTop = b.scrollHeight; r.__bbN = w + n; } } });
};
B.pickReply = (w, id) => { REPLY[w] = REPLY[w] === id ? null : id; G.repaint(APP); };
B.reply = w => {
    const inp = document.getElementById('bbIn'); if (!inp) return; const t = inp.value.trim(); if (!t) return;
    const s = subOf(w), m = target(w); if (!s || !m) return;
    if ((m.rep || []).length >= 3) return X.toast('这条已经回满 3 次了', '等 TA 发下一条');
    const lim = limOf(daysOf(s.at)); (m.rep = m.rep || []).push({ id: G.uid('r'), text: t.slice(0, lim), at: Date.now() }); REPLY[w] = null; saveD(); G.repaint(APP);
    const c = charOfW(w); if (c && Math.random() < 0.15 && !BUSY['m' + w]) setTimeout(() => genMsgs(w, 1, { extra: '刚好看到有粉丝回你：「' + t + '」，忍不住回应一下（翻牌）', quiet: true }), G.rnd(20, 90) * 1000);
};
B.poke = w => genMsgs(w, G.rnd(1, 3));
B.fav = (w, id) => { const k = w + '|' + id, i = D.fav.indexOf(k); if (i >= 0) D.fav.splice(i, 1); else D.fav.push(k); saveD(); G.repaint(APP); };
B.big = (w, id) => { const m = msgOf(w, id); if (!m) return; G.push(APP, { title: m.t === 'video' ? '视频' : '照片', cls: 'bb-dark', html: () => `<div class="bb-bigph" style="background:${picBg(m.desc)}">${m.t === 'video' ? '<b>▶</b>' : ''}<em>${esc(m.desc)}</em></div>${m.text ? `<p class="bb-cap">${esc(nickFill(m.text, w))}</p>` : ''}<p class="bb-cap dim">${esc(nameOf(w))} · ${new Date(m.at).toLocaleString()}</p>` }); };
B.letter = (w, id) => { const m = msgOf(w, id); if (!m) return; G.push(APP, { title: '泡泡信', html: () => `<div class="bb-paper p${m.paper || 0}"><pre>${esc(nickFill(m.text, w))}</pre><small>${new Date(m.at).toLocaleDateString()}</small></div>` }); };
B.wall = w => {
    const R = roomOf(w).filter(m => m.by !== 'sys'), m = R[R.length - 1];
    if (!m) return X.toast('TA 还没发消息', '');
    const k = w + '|' + m.id;
    if (!D.wall[k]) genWall(w, m);
    G.push(APP, { id: 'wall_' + k, title: '粉丝们回了什么', html: () => `<div class="bb-walltip">📸 这些是粉丝群里大家晒的截图（泡泡上别的粉丝的回复只有 TA 看得到）</div><div class="bb-quote">${esc(nameOf(w))}：${esc(m.t === 'text' ? nickFill(m.text, w) : '[' + ({ photo: '照片', voice: '语音', video: '视频', letter: '泡泡信' }[m.t]) + '] ' + (m.desc || ''))}</div>${BUSY['w' + k] ? '<div class="gys-busy">⏳ 正在翻粉丝群…</div>' : ''}${(D.wall[k] || []).map(x => `<div class="bb-wall"><span class="gys-av e" style="width:34px;height:34px;font-size:14px;background:${picBg(x.nick)}">${esc(x.nick[0] || '粉')}</span><div><b>${esc(x.nick)} <i class="bb-day">D+${x.days}</i></b><p>${esc(x.text)}</p></div></div>`).join('')}<div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysBb.moreWall('${w}','${m.id}')">再翻翻</span></div>` });
};
B.moreWall = (w, id) => { const m = msgOf(w, id); if (m) genWall(w, m); };
B.album = w => {
    let f = 'photo';
    const draw = () => { const L = roomOf(w).filter(m => f === 'photo' ? m.t === 'photo' || m.t === 'video' : m.t === f).slice().reverse(); return `<div class="bb-atabs">${[['photo', '照片 · 视频'], ['voice', '语音'], ['letter', '信件']].map(([k, n]) => `<span class="${f === k ? 'on' : ''}" onclick="gysBb.__af('${k}')">${n}</span>`).join('')}</div>${!L.length ? '<div class="gys-empty">还没有</div>' : f === 'photo' ? `<div class="bb-album">${L.map(m => `<span style="background:${picBg(m.desc)}" onclick="gysBb.big('${w}','${m.id}')">${m.t === 'video' ? '<b>▶</b>' : ''}<em>${esc(m.desc)}</em></span>`).join('')}</div>` : L.map(m => `<div class="bb-arow" onclick="${f === 'letter' ? `gysBb.letter('${w}','${m.id}')` : ''}">${f === 'voice' ? `<b>▶ ${dur(m.dur)}</b>` : '<b>💌</b>'}<div><p>${esc(nickFill(m.text, w)).slice(0, f === 'voice' ? 200 : 50)}</p><small>${new Date(m.at).toLocaleString()}</small></div></div>`).join('')}`; };
    B.__af = k => { f = k; G.repaint(APP); };
    G.push(APP, { title: '相册', html: draw });
};
B.more = async w => {
    const s = subOf(w);
    const ops = s ? ['👤 TA 的泡泡主页', '🫧 催更（让 TA 发一条）', '💌 让 TA 写一封泡泡信', '✍️ 给 TA 写信', '🏷️ 改我的昵称（现在：' + s.nick + '）', '⭐ 收藏的消息', '💔 取消订阅'] : ['👤 TA 的泡泡主页', '💜 订阅'];
    const i = await chooser(ops); if (i == null) return;
    const op = ops[i];
    if (op.startsWith('👤')) B.prof(w);
    else if (op.startsWith('🫧')) B.poke(w);
    else if (op.startsWith('💌')) genLetter(w);
    else if (op.startsWith('✍️')) B.writeLetter(w);
    else if (op.startsWith('🏷️')) B.setNick(w);
    else if (op.startsWith('⭐')) B.favs(w);
    else if (op.startsWith('💔')) B.unsub(w);
    else if (op.startsWith('💜')) B.sub(w);
};
B.setNick = async w => { const s = subOf(w); if (!s) return; const n = await G.input('TA 在消息里叫你什么？（就是「(昵称)」那里显示的）', s.nick); if (!n) return; s.nick = X.plain(n).slice(0, 12); saveD(); G.repaint(APP); };
B.writeLetter = async w => { const s = subOf(w); if (!s) return; const t = await G.input('给 ' + nameOf(w) + ' 写信（TA 下次发泡泡时可能会看到）', ''); if (!t) return; (s.sent = s.sent || []).push({ text: X.plain(t).slice(0, 600), at: Date.now() }); saveD(); X.toast('💌 寄出去了', X.v('TA 会看到的', '等 TA 看信吧')); };
B.favs = w => G.push(APP, { title: '收藏的消息', html: () => { const L = D.fav.filter(k => !w || k.startsWith(w + '|')).map(k => { const [ww, id] = [k.slice(0, k.lastIndexOf('|')), k.slice(k.lastIndexOf('|') + 1)]; const m = msgOf(ww, id); return m ? [ww, m] : null; }).filter(Boolean); return L.length ? L.map(([ww, m]) => `<div class="bb-arow" onclick="gysBb.room('${ww}')">${G.av(APP, ww, 36)}<div><p>${esc(m.t === 'text' || m.t === 'letter' ? nickFill(m.text, ww) : '[' + m.t + '] ' + m.desc).slice(0, 80)}</p><small>${esc(nameOf(ww))} · ${G.ago(m.at)}</small></div></div>`).join('') : '<div class="gys-empty">点消息旁边的 ☆ 就能收藏</div>'; } });

/* ---------------- 订阅 ---------------- */
B.sub = async w => {
    starOn(w);
    const ok = await G.confirm(`订阅 ${nameOf(w)} 的泡泡？\n（只是装个样子，不花钱）\n订阅后 TA 发的消息你都收得到，每条能回 3 次，订阅越久能打的字越多。`); if (!ok) return;
    const n = await G.input('TA 在消息里会怎么叫你？（给自己起个昵称）', G.meName()); if (n === null || n === undefined) return;
    D.subs[w] = { at: Date.now(), nick: X.plain(n || G.meName()).slice(0, 12), unread: 0, sent: [], ann: [] };
    D.stars[w].subsN = (D.stars[w].subsN || 0) + 1; G.prof(APP, w).followers = D.stars[w].subsN; saveD();
    X.toast('💜 订阅好了', X.v('D+1，开始了', '从今天开始数天数')); G.repaint(APP);
    if (!roomOf(w).length) genMsgs(w, G.rnd(1, 2), { extra: '刚好有新粉丝订阅，你随手发了几条' });
    const c = charOfW(w); if (c && Math.random() < 0.5) setTimeout(() => X.reach(c, `你发现她订阅了你的泡泡（昵称「${D.subs[w].nick}」）`), G.rnd(1, 5) * 60e3);
};
B.unsub = async w => { if (!(await G.confirm('取消订阅以后天数会清零，消息还留着。确定吗？'))) return; delete D.subs[w]; if (D.stars[w]) D.stars[w].subsN = Math.max(0, (D.stars[w].subsN || 1) - 1); saveD(); G.back(APP); X.toast('已取消订阅', ''); };

/* ---------------- 主页 ---------------- */
B.prof = w => {
    starOn(w);
    G.push(APP, { id: 'prof_' + w, title: '', cls: 'bb-pfb', html: () => {
        const p = G.prof(APP, w), s = subOf(w), st = D.stars[w] || {}, links = G.linksOf(APP, w);
        return `<div class="bb-pf"><div class="bb-cover" style="${p.bg ? `background-image:url('${p.bg}')` : `background:${picBg(p.nick)}`}"></div>
          <div class="bb-pfav">${G.av(APP, w, 92)}</div>
          <div class="bb-pfnm">${esc(p.nick)}${p.verify && p.verify.t ? ` <i class="bb-v">✔</i>` : ''}</div>
          ${p.handle ? `<div class="bb-pfid">@${esc(p.handle)}</div>` : ''}
          <div class="bb-pfst">${esc(statusOf(w) || '（还没写状态）')}</div>
          <div class="bb-pfn"><span><b>${G.fmtN(p.followers || st.subsN || 0)}</b>订阅</span><span><b>${roomOf(w).filter(m => m.by !== 'sys').length}</b>消息</span><span><b>${daysOf(st.at)}</b>开通天数</span></div>
          ${s ? `<div class="bb-pfd">💜 我们已经相遇 <b>D+${daysOf(s.at)}</b> · 我的昵称「${esc(s.nick)}」</div>` : ''}
          ${p.bday ? `<div class="bb-pfm">🎂 生日 ${esc(p.bday)}</div>` : ''}${p.loc ? `<div class="bb-pfm">📍 ${esc(p.loc)}</div>` : ''}
          ${links.length ? `<div class="bb-links">${links.map(([k, h]) => `<span>${G.APPS[k].ico} ${G.APPS[k].n}：${esc(h)}</span>`).join('')}</div>` : ''}
          ${(p.tags || []).length ? `<div class="bb-links">${p.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}
          <div class="gys-acts c">${s ? `<span class="gys-btn" onclick="gysBb.room('${w}')">💬 进入聊天</span>` : `<span class="gys-btn" onclick="gysBb.sub('${w}')">💜 订阅</span>`}<span class="gys-btn ghost" onclick="gysBb.editProf('${w}')">✏️ 编辑主页</span></div>
          <div class="bb-pfnote">${G.base(w) && G.base(w).kind === 'char' ? '同一个人在不同软件里的主页可以不一样（昵称、头像、简介都能改）' : ''}</div></div>`;
    } });
};
B.editProf = w => G.editProf(APP, w, [['bday', '生日', '比如 3-14（这天 TA 会在泡泡上过生日）']], () => { if (D.stars[w] && G.prof(APP, w).followers) D.stars[w].subsN = G.prof(APP, w).followers; if (w === 'me') D.my.subsN = G.prof(APP, 'me').followers || D.my.subsN; saveD(); });

/* ---------------- 发现：订阅谁 ---------------- */
function starRow(w) {
    const p = G.prof(APP, w), s = subOf(w);
    return `<div class="bb-row" onclick="gysBb.prof('${w}')">${G.av(APP, w, 48)}<div><b>${esc(p.nick)}</b><em>${esc(statusOf(w) || (G.base(w) || {}).name || '')}</em></div><span class="bb-sbtn${s ? ' on' : ''}" onclick="event.stopPropagation();${s ? `gysBb.room('${w}')` : `gysBb.sub('${w}')`}">${s ? 'D+' + daysOf(s.at) : '订阅'}</span></div>`;
}
function findTab() {
    const cs = G.chars().map(c => 'c:' + c.id), ns = G.npcs().map(n => 'n:' + n.id);
    return `<div class="bb-banner"><b>🫧 泡泡</b><em>订阅喜欢的人，收到 TA 只发给粉丝的消息</em></div>
      <div class="gys-acts"><span class="gys-btn sm" onclick="gysBb.genStars()">✨ 生成新艺人</span><span class="gys-btn sm ghost" onclick="gysBb.genProfs()">✍️ 让大家把泡泡主页补全</span></div>
      ${BUSY.ppl ? '<div class="gys-busy">⏳ 正在生成…</div>' : ''}
      <div class="bb-sech">角色</div>${cs.map(starRow).join('') || '<div class="gys-empty">还没有角色</div>'}
      <div class="bb-sech">NPC 列表里的人</div>${ns.map(starRow).join('') || '<div class="gys-empty">NPC 列表里还没人，点上面 ✨ 生成</div>'}`;
}
B.find = () => G.tab(APP, 'find');
B.tab = t => G.tab(APP, t);
B.genProfs = async () => { BUSY.ppl = 1; G.repaint(APP); try { const L = G.people().filter(w => w !== 'me' && !G.prof(APP, w).gen); for (let i = 0; i < L.length; i += 8) await G.genProfiles(APP, L.slice(i, i + 8), STYLE); } finally { BUSY.ppl = 0; G.repaint(APP); } };
const STYLE = '- 这是「泡泡」：艺人给粉丝的付费私信频道。主页很简单：昵称、一句状态消息（bio 写这个，像艺人随手写的签名，可以是一句歌词、一个表情、近况）；followers 写订阅人数（按名气给）';
B.genStars = async () => {
    if (typeof window.gyNpcGen !== 'function') return X.toast('要先有 NPC 列表', '');
    const wish = await G.input('想要什么样的艺人？（可以空着，空着就照着大家的人设随便生成）\n比如：刚出道的男团成员 / 游戏主播 / 话剧演员', ''); if (wish === null || wish === undefined) return;
    const L = G.chars();
    const bind = await chooser(['🌐 通用（谁都认识）', '绑给我'].concat(L.map(c => '绑给 ' + c.name)), '这些人跟谁有关系？');
    if (bind == null) return;
    BUSY.ppl = 1; G.repaint(APP);
    try {
        const add = await window.gyNpcGen({ me: true, charIds: L.slice(0, 4).map(c => String(c.id)), wbIds: [], n: 4, wish: (wish ? wish + '；' : '') + '这些人在泡泡上开了艺人频道（爱豆、主播、演员、歌手、博主之类）', owners: bind === 0 ? [] : bind === 1 ? ['me'] : [String(L[bind - 2].id)], all: bind === 0, from: 'gen' });
        if (add && add.length) { add.forEach(n => starOn('n:' + n.id)); await G.genProfiles(APP, add.map(n => 'n:' + n.id), STYLE); X.toast('✨ 来了 ' + add.length + ' 位艺人', '他们也在 NPC 列表里'); }
    } finally { BUSY.ppl = 0; G.repaint(APP); }
};

/* ---------------- ② 我的频道（你是艺人） ---------------- */
let DRAFT = { t: 'text', text: '', desc: '', img: '', dur: 15 };
function studio() {
    if (!D.my.on) return `<div class="bb-open"><b>🎤 开通我的泡泡频道</b><p>在这里你是艺人：发消息给所有订阅你的粉丝，能看到所有人的回复刷屏。<br>认识你的人（角色、NPC 列表里的人）也订阅了你——有人会用小号偷偷回你，你可以猜是谁。</p><span class="gys-btn" onclick="gysBb.openMine()">开通</span></div>`;
    ensureFans();
    const today = D.my.msgs.filter(m => dayKey(m.at) === dayKey(Date.now())).reduce((n, m) => n + (m.fan || []).length, 0);
    return `<div class="bb-stu" onclick="gysBb.myProf()">${G.av(APP, 'me', 56)}<div><b>${esc(nameOf('me'))}</b><em>${esc(statusOf('me') || '点这里改主页')}</em></div><span>›</span></div>
      <div class="bb-stat"><span onclick="gysBb.fans()"><b>${G.fmtN(D.my.subsN)}</b>订阅</span><span><b>${today}</b>今日回复</span><span><b>${D.my.msgs.length}</b>发过</span><span onclick="gysBb.fanLetters()"><b>${D.my.letters.length}</b>粉丝来信</span></div>
      <div class="bb-cmp">
        <div class="bb-ctype">${[['text', '💬 文字'], ['photo', '📷 照片'], ['voice', '🎙️ 语音'], ['video', '🎬 视频'], ['letter', '💌 泡泡信']].map(([k, n]) => `<span class="${DRAFT.t === k ? 'on' : ''}" onclick="gysBb.__dt('${k}')">${n}</span>`).join('')}</div>
        ${DRAFT.t === 'photo' ? `<div class="bb-cimg" onclick="gysBb.__dimg()">${DRAFT.img ? `<img src="${DRAFT.img}">` : '＋ 选一张照片（能裁剪）'}</div><input id="bbDesc" placeholder="或者用文字描述照片（比如：今天的自拍）" value="${esc(DRAFT.desc)}">` : ''}
        ${DRAFT.t === 'video' ? `<input id="bbDesc" placeholder="视频画面（比如：练习室跳舞）" value="${esc(DRAFT.desc)}">` : ''}
        <textarea id="bbMy" rows="${DRAFT.t === 'letter' ? 7 : 3}" placeholder="${{ text: '想对粉丝说什么？', photo: '配一句话（可以不写）', voice: '语音里说了什么', video: '视频里说了什么（可以不写）', letter: '写一封给所有粉丝的信' }[DRAFT.t]}">${esc(DRAFT.text)}</textarea>
        <div class="bb-ctool"><span onclick="gysBb.__nick()">＋(昵称)</span><em>写「(昵称)」会变成每个粉丝自己的昵称</em><span class="gys-btn sm" onclick="gysBb.sendMine()">发送</span></div>
      </div>
      <div class="bb-sech">发过的消息</div>
      ${D.my.msgs.slice().reverse().map(m => `<div class="bb-mym" onclick="gysBb.mine('${m.id}')"><div><p>${m.img ? '<span class="bb-thumb" style="background-image:url(\'' + m.img + '\')"></span>' : ''}${esc(myMsgText(m)).slice(0, 80)}</p><small>${G.ago(m.at)}</small></div><span>${BUSY['f' + m.id] ? '⏳' : '💬 ' + (m.fan || []).length}</span></div>`).join('') || '<div class="gys-empty">还没发过</div>'}
      <div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysBb.closeMine()">关闭频道</span></div>`;
}
const saveDraft = () => { const a = document.getElementById('bbMy'), b = document.getElementById('bbDesc'); if (a) DRAFT.text = a.value; if (b) DRAFT.desc = b.value; };
B.__dt = k => { saveDraft(); DRAFT.t = k; G.repaint(APP); };
B.__dimg = () => { saveDraft(); G.pickImg(1, url => { DRAFT.img = url; G.repaint(APP); }); };
B.__nick = () => { const a = document.getElementById('bbMy'); if (!a) return; const s = a.selectionStart || a.value.length; a.value = a.value.slice(0, s) + '(昵称)' + a.value.slice(s); a.focus(); };
B.openMine = async () => { D.my.on = 1; D.my.at = D.my.at || Date.now(); ensureFans(); G.prof(APP, 'me', { followers: D.my.subsN }); saveD(); G.repaint(APP); X.toast('🎤 频道开好了', X.v('粉丝已经在等你的第一条了', '发第一条吧')); };
B.closeMine = async () => { if (!(await G.confirm('关掉你的频道？（发过的消息和回复都留着，随时能再开）'))) return; D.my.on = 0; saveD(); G.repaint(APP); };
B.myProf = () => B.prof('me');
B.sendMine = async () => {
    saveDraft();
    if (!DRAFT.text.trim() && !DRAFT.desc.trim() && !DRAFT.img) return X.toast('写点什么吧', '');
    const m = { id: G.uid('my'), t: DRAFT.t, text: X.plain(DRAFT.text).slice(0, 900), desc: X.plain(DRAFT.desc).slice(0, 40), img: DRAFT.img || '', dur: G.rnd(5, 40), at: Date.now(), fan: [] };
    D.my.msgs.push(m); if (D.my.msgs.length > (Number(D.cfg.keep) || 300)) D.my.msgs.shift();
    DRAFT = { t: 'text', text: '', desc: '', img: '', dur: 15 }; saveD();
    B.mine(m.id);
    await genFans(m, D.cfg.flood || 12);
    // 认识的人看到了，可能私下找你
    const c = fanChars().sort(() => Math.random() - 0.5)[0];
    if (c && Math.random() < 0.45) setTimeout(() => X.reach(c, `你订阅了她的泡泡，刚收到她发给所有粉丝的：「${myMsgText(m).slice(0, 100)}」`), G.rnd(1, 6) * 60e3);
};
B.mine = id => {
    let f = 'all';
    B.__ff = k => { f = k; G.repaint(APP); };
    G.push(APP, { id: 'mine_' + id, title: '粉丝回复', html: () => {
        const m = myMsg(id); if (!m) return '<div class="gys-empty">消息没了</div>';
        D.my.unread = 0;
        const all = (m.fan || []).slice().reverse(), L = all.filter(r => f === 'all' || (f === 'known' ? r.who && (!r.alt || r.found) : f === 'alt' ? r.alt && !r.found : false));
        return `<div class="bb-mine">${m.img ? `<img src="${m.img}">` : m.t !== 'text' && m.t !== 'letter' ? `<div class="bb-ph" style="background:${picBg(m.desc)}"><em>${esc(m.desc || m.t)}</em></div>` : ''}<p>${esc(m.text)}</p><small>${new Date(m.at).toLocaleString()} · 发给了 ${G.fmtN(D.my.subsN)} 位粉丝</small></div>
          <div class="bb-atabs">${[['all', '全部 ' + all.length], ['known', '认识的人'], ['alt', '🕵️ 可疑小号']].map(([k, n]) => `<span class="${f === k ? 'on' : ''}" onclick="gysBb.__ff('${k}')">${n}</span>`).join('')}</div>
          ${BUSY['f' + id] ? '<div class="gys-busy">⏳ 回复刷屏中…</div>' : ''}
          ${L.map(r => fanRow(m, r)).join('') || (BUSY['f' + id] ? '' : '<div class="gys-empty">还没有回复</div>')}
          <div class="gys-acts"><span class="gys-btn sm" onclick="gysBb.moreFans('${id}')">🔄 刷新看新回复</span><span class="gys-btn sm ghost" onclick="gysBb.delMine('${id}')">删掉这条</span></div>`;
    } });
};
function fanRow(m, r) {
    const known = r.who && (!r.alt || r.found);
    const av = known ? G.av(APP, r.who, 38) : `<span class="gys-av e" style="width:38px;height:38px;font-size:15px;background:${picBg(r.nick)}">${esc(r.nick[0] || '粉')}</span>`;
    return `<div class="bb-fan${known ? ' known' : ''}">${av}<div><b>${esc(r.nick)} <i class="bb-day">D+${r.days}</i>${known ? ` <i class="bb-kn">${r.alt ? '🕵️ 小号 · ' : '💜 '}${esc((G.base(r.who) || {}).name || '')}</i>` : ''}</b><p>${esc(r.text)}</p><small>${G.hm(r.at)}${r.alt && !r.found ? ` · <a onclick="gysBb.guess('${m.id}','${r.id}')">🕵️ 这是谁？</a>` : ''}</small></div></div>`;
}
B.moreFans = id => { const m = myMsg(id); if (m) genFans(m, Math.max(6, Math.round((D.cfg.flood || 12) / 2))); };
B.delMine = async id => { if (!(await G.confirm('删掉这条？'))) return; D.my.msgs = D.my.msgs.filter(m => m.id !== id); saveD(); G.back(APP); };
B.guess = async (mid, rid) => {
    const m = myMsg(mid), r = m && (m.fan || []).find(x => x.id === rid); if (!r) return;
    const cs = G.chars(); const i = await chooser(cs.map(c => c.name).concat(['都不像，是陌生人']), `「${r.nick}」是谁的小号？`); if (i == null) return;
    const c = cs[i];
    if (c && 'c:' + c.id === r.who) { r.found = 1; (m.fan || []).forEach(x => { if (x.who === r.who && x.alt) x.found = 1; }); saveD(); G.repaint(APP); X.toast('🕵️ 抓到了！', `「${r.nick}」就是 ${c.name}`); X.reach(c, `她认出了你在她泡泡频道里用的小号「${r.nick}」，你回她的那句是「${r.text}」`); }
    else X.toast(X.v('不是哦', '再猜猜', '好像不是 TA'), '');
};
B.fans = () => G.push(APP, { title: '我的粉丝', html: () => {
    ensureFans();
    const ks = Object.keys(D.my.fans).filter(w => G.base(w));
    return `<div class="bb-walltip">一共 ${G.fmtN(D.my.subsN)} 位订阅，下面是认识你的人（点开关决定 TA 有没有订阅你）</div>${ks.map(w => { const f = D.my.fans[w]; return `<div class="bb-row">${G.av(APP, w, 44)}<div><b>${esc((G.base(w) || {}).name)} ${f.on !== false ? `<i class="bb-day">D+${daysOf(f.at)}</i>` : ''}</b><em>${f.on === false ? '没订阅' : (f.nick ? '泡泡昵称「' + esc(f.nick) + '」' : '还没回过你') + (f.alt && Object.values(D.my.msgs).some(m => (m.fan || []).some(r => r.who === w && r.alt && r.found)) ? ' · 小号「' + esc(f.alt) + '」' : '')}</em></div><span class="bb-sbtn${f.on !== false ? ' on' : ''}" onclick="gysBb.fanTog('${w}')">${f.on !== false ? '已订阅' : '让 TA 订阅'}</span></div>`; }).join('')}`;
} });
B.fanTog = w => { const f = D.my.fans[w]; if (!f) return; f.on = f.on === false; if (f.on) f.at = Date.now(); saveD(); G.repaint(APP); };
B.fanLetters = () => G.push(APP, { title: '粉丝来信', html: () => `${D.my.letters.slice().reverse().map((l, i) => `<div class="bb-paper p${i % 4}"><b>${l.alt ? '一位匿名粉丝' : esc((G.base(l.who) || {}).name || l.nick || '粉丝')}</b><pre>${esc(l.text)}</pre><small>${new Date(l.at).toLocaleString()}</small></div>`).join('') || '<div class="gys-empty">还没有来信</div>'}<div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysBb.askLetter()">📮 看看信箱</span></div>` });
async function fanLetter(c) {
    const last = D.my.msgs.slice(-3).map(myMsgText).join('\n') || '（还没发过）';
    const t = X.plain(await X.ask(P('bb.fanletter', DEF_FANLETTER, { 我是谁: X.who(c), 她: X.me(c), 内容: last })) || ''); if (!t) return null;
    const l = { who: 'c:' + c.id, text: t.slice(0, 800), at: Date.now() }; D.my.letters.push(l); if (D.my.letters.length > 100) D.my.letters.shift(); D.my.unread = (D.my.unread || 0) + 1; saveD(); G.repaint(APP);
    G.notify(APP, c, `💌 有一封粉丝来信`, t.slice(0, 50), X.go('gysBubbleOpen', 'studio'));
    return l;
}
B.askLetter = async () => { const c = fanChars().sort(() => Math.random() - 0.5)[0]; if (!c) return X.toast('还没有认识的人订阅你', ''); BUSY.lt = 1; X.toast('📮 去信箱看看…', ''); try { const l = await fanLetter(c); if (!l) X.toast('信箱空空的', ''); } finally { BUSY.lt = 0; } };

/* ---------------- 我的 ---------------- */
function meTab() {
    const ws = Object.keys(D.subs).filter(w => G.base(w));
    return `<div class="bb-sech">我的订阅（${ws.length}）</div>${ws.map(w => { const s = D.subs[w]; return `<div class="bb-row" onclick="gysBb.room('${w}')">${G.av(APP, w, 44)}<div><b>${esc(nameOf(w))} <i class="bb-day">D+${daysOf(s.at)}</i></b><em>我的昵称「${esc(s.nick)}」 · 现在能打 ${limOf(daysOf(s.at))} 字</em></div><span class="bb-r">›</span></div>`; }).join('') || '<div class="gys-empty">还没订阅</div>'}
      <div class="bb-menu"><div onclick="gysBb.favs()">⭐ 收藏的消息<em>${D.fav.length}</em></div>
      <div onclick="gysBb.tab('studio')">🎤 我的频道<em>${D.my.on ? '开着' : '没开'}</em></div>
      <div onclick="gysBb.settings()">⚙️ 设置</div>
      <div onclick="gysBb.export()">📤 导出泡泡记录（TXT）</div></div>
      <div class="bb-help"><b>泡泡怎么玩</b><br>· TA 发的消息所有粉丝都收得到，看着像只发给你一个人<br>· 消息里的「(昵称)」会换成你自己起的昵称<br>· 每条你能回 3 次；订阅第 1 天能打 15 个字，每多一天多一个字，最多 77 字<br>· TA 偶尔会「翻牌」，回应粉丝说过的话——说不定就是你的<br>· 👥 能看到别的粉丝回了什么（粉丝群晒的截图）<br>· 自己开频道当艺人：所有人的回复你都看得到，熟人可能用小号</div>`;
}
B.settings = () => G.push(APP, { title: '泡泡设置', html: () => `
  <label class="gys-f"><span>TA 大概隔几个小时会发一次泡泡（自主行动里用）</span><input id="bbC_freq" type="number" min="1" value="${D.cfg.freq}"></label>
  <label class="gys-f"><span>你发消息后，一次刷出多少条粉丝回复</span><input id="bbC_flood" type="number" min="4" max="30" value="${D.cfg.flood}"></label>
  <label class="gys-f"><span>每个聊天最多留多少条消息（收藏的和信不会被删）</span><input id="bbC_keep" type="number" min="50" value="${D.cfg.keep}"></label>
  <div class="gys-acts"><button class="gys-btn" onclick="gysBb.saveCfg()">保存</button><button class="gys-btn ghost" onclick="GYS.uiPage('bubble')">🍎 苹果外观</button></div>` });
B.saveCfg = () => { const g = k => Number((document.getElementById('bbC_' + k) || {}).value) || 0; D.cfg.freq = Math.max(1, g('freq') || 8); D.cfg.flood = Math.max(4, Math.min(30, g('flood') || 12)); D.cfg.keep = Math.max(50, g('keep') || 300); saveD(); X.toast('💾 存好了', ''); G.back(APP); };
B.export = () => {
    const L = [];
    Object.keys(D.rooms).forEach(w => { if (!G.base(w)) return; L.push(`===== ${nameOf(w)} 的泡泡 =====`); roomOf(w).forEach(m => { L.push(`[${new Date(m.at).toLocaleString()}] ${m.by === 'sys' ? '' : nameOf(w) + '：'}${m.t !== 'text' && m.by !== 'sys' ? '[' + m.t + '] ' + (m.desc || '') + ' ' : ''}${nickFill(m.text, w)}`); (m.rep || []).forEach(r => L.push(`    ↳ 我：${r.text}`)); }); L.push(''); });
    if (D.my.msgs.length) { L.push('===== 我的频道 ====='); D.my.msgs.forEach(m => { L.push(`[${new Date(m.at).toLocaleString()}] 我：${myMsgText(m)}`); (m.fan || []).forEach(r => L.push(`    ↳ ${r.nick}${r.who && (!r.alt || r.found) ? '（' + (G.base(r.who) || {}).name + '）' : ''}：${r.text}`)); }); }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\n')], { type: 'text/plain' })); a.download = '泡泡记录.txt'; a.click();
};

/* ---------------- 外壳 ---------------- */
G.app(APP, {
    tabs: [['chat', 'i:chat', '聊天', () => unreadAll() || ''], ['find', 'i:search', '发现'], ['studio', 'i:mic', '我的频道'], ['me', 'i:person', '我的']],
    head, render: t => t === 'find' ? findTab() : t === 'studio' ? studio() : t === 'me' ? meTab() : chatList(),
    onOpen: () => { const L = G.people().filter(w => w !== 'me' && !G.prof(APP, w).gen && (isStar(w) || G.charOf(w))); if (L.length) G.genProfiles(APP, L.slice(0, 8), STYLE).then(() => G.repaint(APP)); }
});
window.gysBubbleOpen = tab => G.open(APP, tab);
window.gysBubbleOpenRoom = w => { G.open(APP, 'chat'); B.room(w); };
window.gysBubbleOpenMine = id => { G.open(APP, 'studio'); if (id) B.mine(id); };

/* ---------------- 谷雨这边：开关、自主行动、今天、小组件、记忆总览、注入 ---------------- */
X.mini({ id: 'gysBubble', icon: '🫧', title: '泡泡', desc: '订阅 TA 当粉丝，或者自己开频道当艺人', cat: '软件', onOpen: () => G.open(APP) }, 'gysBubble');
const lastStarMsg = c => { const R = roomOf('c:' + c.id).filter(m => m.by !== 'sys'); return R[R.length - 1] || null; };
X.action({ key: 'gys_bb_msg', label: '在泡泡上给粉丝发消息', hint: '营业：日常、自拍、语音，她也订阅了', need: c => !!subOf('c:' + c.id) && rare(c, 'm', D.cfg.freq || 8), run: async c => { mark(c, 'm'); const L = await genMsgs('c:' + c.id, G.rnd(1, 3)); return L && L.length ? { text: '在泡泡上发了：' + nickFill(L[0].text || L[0].desc, 'c:' + c.id).slice(0, 40), selfNotified: true, jump: X.go('gysBubbleOpenRoom', 'c:' + c.id) } : null; } }, 'gysBubble');
X.action({ key: 'gys_bb_letter', label: '给粉丝写一封泡泡信', hint: '手写信，所有粉丝都收到', need: c => !!subOf('c:' + c.id) && rare(c, 'l', 96), run: async c => { mark(c, 'l'); const m = await genLetter('c:' + c.id); return m ? { text: '写了一封泡泡信', selfNotified: true } : null; } }, 'gysBubble');
X.action({ key: 'gys_bb_real', label: '泡泡营业完，私下找她', hint: '刚才那是给所有人的，这句只给她', need: c => { const m = lastStarMsg(c); return !!subOf('c:' + c.id) && m && !m.real && Date.now() - m.at < 3 * 3600e3 && rare(c, 'r', 12); }, run: async c => { mark(c, 'r'); const m = lastStarMsg(c); m.real = 1; saveD(); const ok = await X.reach(c, `你刚在泡泡上（对所有粉丝营业）发了「${nickFill(m.text || m.desc, 'c:' + c.id).slice(0, 80)}」，现在私下跟她说点只给她的、更真实的话`); return ok ? { text: '泡泡营业完，私下找她说了真心话', selfNotified: true } : null; } }, 'gysBubble');
X.action({ key: 'gys_bb_fan', label: '去她的泡泡频道回她', hint: '她开了频道，TA 也订阅了', need: c => { if (!D.my.on) return false; const f = D.my.fans['c:' + c.id]; if (f && f.on === false) return false; const m = D.my.msgs[D.my.msgs.length - 1]; return m && Date.now() - m.at < 2 * 86400e3 && !(m.fan || []).some(r => r.who === 'c:' + c.id); }, run: async c => { const m = D.my.msgs[D.my.msgs.length - 1]; const alt = Math.random() < 0.3; const t = X.plain(await X.ask(`${X.who(c)}\n${X.me(c)}在泡泡上开了艺人频道，你订阅了。她刚给所有粉丝发了：「${myMsgText(m).slice(0, 200)}」\n你回她一句（她看得到所有粉丝的回复${alt ? '；你这次用的是小号，不想被她认出来' : ''}）。只写回复，不超过 60 字。`) || ''); if (!t) return null; const r = { id: G.uid('f'), who: 'c:' + c.id, nick: alt ? (D.my.fans['c:' + c.id] || {}).alt || G.pick(FANNICK) : nameOf('c:' + c.id), alt, days: daysOf((D.my.fans['c:' + c.id] || {}).at), text: t.slice(0, 77), at: Date.now() }; if (alt && D.my.fans['c:' + c.id]) D.my.fans['c:' + c.id].alt = r.nick; (m.fan = m.fan || []).push(r); D.my.unread = (D.my.unread || 0) + 1; saveD(); if (!alt) G.notify(APP, c, `🫧 <b>${X.esc(c.name)}</b> 回复了你的泡泡`, t, X.go('gysBubbleOpenMine', m.id)); return alt ? { text: '用小号回了她的泡泡（没告诉她）', selfNotified: true, secret: true } : { text: '回了她的泡泡', selfNotified: true }; } }, 'gysBubble');
X.action({ key: 'gys_bb_fanletter', label: '给她的泡泡频道寄粉丝信', hint: '当她的粉丝写一封信', need: c => D.my.on && D.my.msgs.length > 0 && (!D.my.fans['c:' + c.id] || D.my.fans['c:' + c.id].on !== false) && rare(c, 'fl', 120), run: async c => { mark(c, 'fl'); const l = await fanLetter(c); return l ? { text: '给她寄了一封粉丝信', selfNotified: true } : null; } }, 'gysBubble');
X.today(() => {
    const d = X.day(), rows = [];
    Object.keys(D.rooms).forEach(w => { if (!subOf(w)) return; const L = roomOf(w).filter(m => m.by !== 'sys' && X.day(new Date(m.at)) === d); if (L.length) rows.push({ t: nameOf(w), x: `发了 ${L.length} 条泡泡：` + nickFill(L[L.length - 1].text || L[L.length - 1].desc, w).slice(0, 30), go: X.go('gysBubbleOpenRoom', w) }); });
    const mine = D.my.msgs.filter(m => X.day(new Date(m.at)) === d); if (mine.length) rows.push({ t: '我的频道', x: `发了 ${mine.length} 条，收到 ${mine.reduce((n, m) => n + (m.fan || []).length, 0)} 条回复`, go: X.go('gysBubbleOpen', 'studio') });
    return rows.length ? { title: '🫧 泡泡', rows: rows.slice(0, 4) } : null;
}, 'gysBubble');
X.widget('gysBbLast', { n: '泡泡', sizes: ['m'], tap: () => G.open(APP), r: () => { let best = null; Object.keys(D.subs).forEach(w => { const m = roomOf(w).filter(x => x.by !== 'sys').slice(-1)[0]; if (m && (!best || m.at > best[1].at)) best = [w, m]; }); return `<div style="padding:10px;font-size:12px;line-height:1.6"><b>🫧 泡泡</b>${unreadAll() ? ` <span style="color:#8b5cf6">${unreadAll()} 条未读</span>` : ''}<br>${best ? `${esc(nameOf(best[0]))}：${esc(nickFill(best[1].text || best[1].desc, best[0])).slice(0, 40)}` : '还没订阅谁'}</div>`; } }, 'gysBubble');
X.mem({ k: 'gysBb', ico: '🫧', n: 'TA 的泡泡', d: '这个角色在泡泡上给粉丝发过的消息（改了就是改内容，删了就没了）', items: c => roomOf('c:' + c.id).filter(m => m.by !== 'sys'), text: m => m.text || m.desc, edit: (m, v) => { if (m.t === 'photo' || m.t === 'video') m.desc = String(v).slice(0, 40); else m.text = String(v); }, del: (c, i) => { const L = roomOf('c:' + c.id).filter(m => m.by !== 'sys'); const m = L[i]; if (m) D.rooms['c:' + c.id] = roomOf('c:' + c.id).filter(x => x !== m); }, meta: m => G.ago(m.at) + ' · ' + ({ text: '文字', photo: '照片', voice: '语音', video: '视频', letter: '泡泡信' }[m.t] || '') + ((m.rep || []).length ? ' · 她回了 ' + m.rep.length + ' 句' : ''), save: () => saveD() }, 'gysBubble');
X.ctx(id => {
    const c = X.char(id); if (!c) return '';
    const w = 'c:' + c.id, L = [];
    const s = subOf(w);
    if (s) {
        const R = roomOf(w).filter(m => m.by !== 'sys').slice(-3);
        if (R.length) L.push('你在泡泡上（对所有粉丝营业）最近发了：' + R.map(m => (m.t === 'text' || m.t === 'letter' ? '' : '[' + m.t + ']') + nickFill(m.text || m.desc, w).slice(0, 40)).join(' / '));
        const reps = roomOf(w).slice(-6).flatMap(m => (m.rep || []).map(r => r.text)).slice(-3);
        L.push(`她订阅了你的泡泡 ${daysOf(s.at)} 天，昵称「${s.nick}」` + (reps.length ? '，她在泡泡上回你：' + reps.join(' / ') : ''));
    }
    if (D.my.on) {
        const m = D.my.msgs[D.my.msgs.length - 1];
        if (m) { const mine = (m.fan || []).filter(r => r.who === w); L.push(`她自己也开了泡泡频道，最近给粉丝发了：「${myMsgText(m).slice(0, 50)}」` + (mine.length ? `，你${mine.some(r => r.alt) ? '（用小号「' + mine.find(r => r.alt).nick + '」' + (mine.some(r => r.alt && r.found) ? '，已经被她认出来了' : '，她还不知道是你') + '）' : ''}回了：${mine.map(r => r.text).join(' / ')}` : '')); }
    }
    return L.length ? `【泡泡】${L.join('；')}。泡泡上那是营业，私下跟她说话可以不一样。` : '';
}, 'gysBubble');
X.inj('gysBubble', [['泡泡', '泡泡：TA 营业发的消息、她回 TA 的、她自己的频道', '让 TA 知道泡泡上发生了什么，私下可以跟营业时不一样']]);

X.css('gys-bubble-css', `
.gys-bubble{--gys-accent:#8b5cf6;background:#f6f4fb}
body.dark-theme .gys-bubble{background:#0d0b14}
.gys-bubble .gys-hd{background:#fff}body.dark-theme .gys-bubble .gys-hd{background:#16131f}
.bb-logo{font-family:"Avenir Next","Helvetica Neue",sans-serif;letter-spacing:.5px;color:#8b5cf6}
.gys-bubble .gys-hr span{font-size:20px;color:#8b5cf6}
.gys-bubble .gys-tabs{background:#fff}body.dark-theme .gys-bubble .gys-tabs{background:#16131f}
.bb-row{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fff;cursor:pointer;border-bottom:.5px solid #f0edf7}body.dark-theme .bb-row{background:#16131f;border-color:#221d30}
.bb-row>div{flex:1;min-width:0}.bb-row b{display:flex;align-items:center;gap:6px;font-size:16px;font-weight:600}.bb-row em{display:block;font-style:normal;font-size:13px;color:#8e8a99;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
.bb-row.mine{background:linear-gradient(90deg,#f3edff,#fff)}body.dark-theme .bb-row.mine{background:linear-gradient(90deg,#2a2140,#16131f)}
.bb-r{display:flex;flex-direction:column;align-items:flex-end;gap:4px}.bb-r small{font-size:11.5px;color:#aaa6b5}.bb-r sup{background:#8b5cf6;color:#fff;border-radius:999px;font-size:11px;padding:1px 7px}
.bb-day{font-style:normal;font-size:11px;color:#8b5cf6;background:#f1ebff;border-radius:999px;padding:1px 7px;font-weight:600}.bb-day.h{font-size:11px;margin-left:4px;vertical-align:middle}
body.dark-theme .bb-day{background:#2a2140}
.bb-tag{font-style:normal;font-size:10.5px;color:#fff;background:#8b5cf6;border-radius:4px;padding:0 5px;font-weight:500}
.bb-sbtn{font-size:13px;color:#fff;background:#8b5cf6;border-radius:999px;padding:5px 14px;cursor:pointer;white-space:nowrap}.bb-sbtn.on{background:#f1ebff;color:#8b5cf6}
.bb-sech{padding:16px 16px 8px;font-size:13px;color:#8e8a99;font-weight:600}
.bb-banner{margin:12px 16px;padding:18px;border-radius:16px;background:linear-gradient(135deg,#a78bfa,#8b5cf6 55%,#6d28d9);color:#fff}.bb-banner b{font-size:20px;display:block}.bb-banner em{font-style:normal;font-size:13px;opacity:.9}
.bb-roomb{background:#f6f4fb}body.dark-theme .bb-roomb{background:#0d0b14}
.bb-room{padding:8px 0 16px}
.bb-date{text-align:center;font-size:12px;color:#aaa6b5;margin:14px 0 6px}
.bb-sys{text-align:center;margin:10px auto;font-size:12.5px;color:#8b5cf6;background:#f1ebff;border-radius:999px;padding:5px 14px;width:fit-content}
.bb-msg{display:flex;gap:8px;padding:4px 12px;align-items:flex-start}.bb-msg.cont{padding-top:2px}.bb-msg.sel .bb-bub{box-shadow:0 0 0 2px #8b5cf6}
.bb-avsp{width:40px;flex-shrink:0}
.bb-mc{max-width:76%;min-width:0}
.bb-nm{font-size:12.5px;color:#6b6778;margin:0 0 4px 2px;font-weight:600}
.bb-line{display:flex;align-items:flex-end;gap:6px}
.bb-col{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}
.bb-bub{background:#fff;border-radius:4px 18px 18px 18px;padding:9px 13px;font-size:15px;line-height:1.55;white-space:pre-wrap;word-break:break-word;box-shadow:0 1px 1px rgba(0,0,0,.04)}body.dark-theme .bb-bub{background:#221d30}
.bb-bub.me{background:#8b5cf6;color:#fff;border-radius:18px 4px 18px 18px}
.bb-bub.voice{cursor:pointer;min-width:120px}.bb-bub.voice span{color:#8b5cf6;font-weight:600}.bb-bub.voice p{display:none;margin:6px 0 0;font-size:14px;color:#6b6778;border-top:.5px dashed #ddd;padding-top:6px}.bb-bub.voice.open p{display:block}
.bb-wave{font-style:normal;letter-spacing:-1px;font-size:10px;opacity:.6}
.bb-tm{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10.5px;color:#aaa6b5;flex-shrink:0}.bb-tm i{font-style:normal;cursor:pointer;font-size:13px}
.bb-me{display:flex;justify-content:flex-end;align-items:flex-end;gap:6px;padding:3px 12px 3px 60px}
.bb-ph{width:200px;max-width:100%;aspect-ratio:3/4;border-radius:14px;display:flex;align-items:flex-end;position:relative;cursor:pointer;margin-bottom:4px}.bb-ph.v{aspect-ratio:16/10}.bb-ph em{font-style:normal;font-size:12px;color:#fff;padding:8px 10px;text-shadow:0 1px 3px rgba(0,0,0,.4)}.bb-ph b{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#fff;font-size:30px;text-shadow:0 1px 6px rgba(0,0,0,.3)}
.bb-letter{width:210px;border-radius:12px;padding:14px;cursor:pointer;background:#fff8ec;border:1px solid #f3e1c0;color:#6b4f2a}.bb-letter b{display:block;font-size:14px}.bb-letter em{display:block;font-style:normal;font-size:13px;margin:6px 0;line-height:1.5}.bb-letter small{color:#b08a55;font-size:11.5px}
.bb-letter.p1,.bb-paper.p1{background:#f1f7ff;border-color:#cfe1fb;color:#2c4a75}.bb-letter.p2,.bb-paper.p2{background:#fff1f5;border-color:#fbd0dd;color:#7a2f47}.bb-letter.p3,.bb-paper.p3{background:#f3fbef;border-color:#d0ecc3;color:#365a2a}
.bb-paper{margin:14px;padding:22px 20px;border-radius:12px;background:#fff8ec;border:1px solid #f3e1c0;color:#6b4f2a;background-image:repeating-linear-gradient(transparent,transparent 31px,rgba(0,0,0,.06) 32px)}.bb-paper pre{white-space:pre-wrap;font-family:"Kaiti SC","STKaiti","KaiTi",serif;font-size:16.5px;line-height:32px;margin:0}.bb-paper small{display:block;text-align:right;margin-top:10px;opacity:.7}.bb-paper b{display:block;margin-bottom:8px}
.bb-pick{font-size:12px;color:#8e8a99;background:#ece8f5;border-radius:8px;padding:5px 9px;margin-bottom:4px;line-height:1.5}.bb-pick.me{background:#ede4ff;color:#7c3aed;font-weight:600}body.dark-theme .bb-pick{background:#221d30}
.bb-typing{display:flex;gap:8px;align-items:center;padding:6px 12px;font-size:13px;color:#8e8a99}.bb-typing i{font-style:normal;animation:bbDot 1.2s infinite}.bb-typing i:nth-child(2){animation-delay:.2s}.bb-typing i:nth-child(3){animation-delay:.4s}
@keyframes bbDot{0%,60%,100%{opacity:.2}30%{opacity:1}}
.bb-in{background:#fff;border-top:.5px solid #ece8f5;padding:6px 10px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))}body.dark-theme .bb-in{background:#16131f;border-color:#221d30}
.bb-in.off{text-align:center;padding:12px}
.bb-tip{font-size:11.5px;color:#8e8a99;padding:2px 4px 6px}.bb-tip b{color:#8b5cf6}
.bb-inr{display:flex;align-items:center;gap:8px}.bb-inr input{flex:1;border:none;background:#f3f0fa;border-radius:999px;padding:10px 14px;font-size:15px;color:inherit;outline:none;min-width:0}body.dark-theme .bb-inr input{background:#221d30}.bb-inr small{font-size:11px;color:#aaa6b5}.bb-inr span{color:#fff;background:#8b5cf6;border-radius:999px;padding:7px 14px;font-size:14px;cursor:pointer}
.bb-walltip{margin:10px 14px;font-size:12.5px;color:#8e8a99;background:#fff;border-radius:10px;padding:8px 12px}body.dark-theme .bb-walltip{background:#16131f}
.bb-quote{margin:0 14px 8px;padding:10px 12px;border-left:3px solid #8b5cf6;background:#fff;border-radius:6px;font-size:14px}body.dark-theme .bb-quote{background:#16131f}
.bb-wall,.bb-fan{display:flex;gap:10px;padding:10px 14px;background:#fff;border-bottom:.5px solid #f0edf7}body.dark-theme .bb-wall,body.dark-theme .bb-fan{background:#16131f;border-color:#221d30}
.bb-wall>div,.bb-fan>div{flex:1;min-width:0}.bb-wall b,.bb-fan b{font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:5px;flex-wrap:wrap}.bb-wall p,.bb-fan p{margin:3px 0;font-size:14.5px;line-height:1.5}.bb-fan small{font-size:11.5px;color:#aaa6b5}.bb-fan small a{color:#8b5cf6;cursor:pointer}
.bb-fan.known{background:#faf7ff}body.dark-theme .bb-fan.known{background:#1d1829}
.bb-kn{font-style:normal;font-size:11px;color:#7c3aed;background:#ede4ff;border-radius:4px;padding:0 5px}
.bb-atabs{display:flex;gap:18px;padding:10px 16px;background:#fff;font-size:14px;color:#8e8a99;position:sticky;top:0;z-index:1}body.dark-theme .bb-atabs{background:#16131f}.bb-atabs span{cursor:pointer;padding-bottom:4px}.bb-atabs span.on{color:#8b5cf6;font-weight:700;border-bottom:2px solid #8b5cf6}
.bb-album{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:2px}.bb-album span{aspect-ratio:1;display:flex;align-items:flex-end;position:relative;cursor:pointer}.bb-album em{font-style:normal;font-size:11px;color:#fff;padding:4px 6px;text-shadow:0 1px 2px rgba(0,0,0,.4)}.bb-album b{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#fff}
.bb-arow{display:flex;gap:12px;align-items:center;padding:12px 16px;background:#fff;border-bottom:.5px solid #f0edf7;cursor:pointer}body.dark-theme .bb-arow{background:#16131f;border-color:#221d30}.bb-arow>b{color:#8b5cf6;white-space:nowrap;font-size:14px}.bb-arow>div{flex:1;min-width:0}.bb-arow p{margin:0;font-size:14.5px;line-height:1.5}.bb-arow small{font-size:11.5px;color:#aaa6b5}
.bb-dark{background:#000;color:#fff}
.bb-bigph{margin:0;aspect-ratio:3/4;display:flex;align-items:flex-end;position:relative}.bb-bigph em{font-style:normal;padding:16px;font-size:15px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.5)}.bb-bigph b{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:48px;color:#fff}
.bb-cap{padding:6px 16px;font-size:15px;line-height:1.6}.bb-cap.dim{font-size:12px;opacity:.6}
.bb-pfb{background:#f6f4fb}body.dark-theme .bb-pfb{background:#0d0b14}
.bb-pf{background:#fff;min-height:100%;text-align:center;padding-bottom:20px}body.dark-theme .bb-pf{background:#16131f}
.bb-cover{height:180px;background-size:cover;background-position:center}
.bb-pfav{margin-top:-50px;display:inline-block;border:4px solid #fff;border-radius:50%}body.dark-theme .bb-pfav{border-color:#16131f}
.bb-pfnm{font-size:22px;font-weight:700;margin-top:6px}.bb-v{font-style:normal;color:#fff;background:#8b5cf6;border-radius:50%;font-size:11px;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle}
.bb-pfid{font-size:13px;color:#8e8a99}
.bb-pfst{margin:10px 24px;font-size:14.5px;color:#4a4657;line-height:1.6}body.dark-theme .bb-pfst{color:#c9c4d6}
.bb-pfn{display:flex;justify-content:center;gap:28px;margin:12px 0;font-size:12px;color:#8e8a99}.bb-pfn span{display:flex;flex-direction:column}.bb-pfn b{font-size:18px;color:inherit}body.dark-theme .bb-pfn b{color:#eee}.bb-pfn b{color:#1f1f1f}
.bb-pfd{margin:8px 20px;background:#f1ebff;color:#7c3aed;border-radius:12px;padding:10px;font-size:14px}body.dark-theme .bb-pfd{background:#2a2140}
.bb-pfm{font-size:13px;color:#8e8a99;margin:4px}
.bb-links{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:8px 16px}.bb-links span{font-size:12px;background:#f3f0fa;border-radius:999px;padding:3px 10px;color:#6b6778}body.dark-theme .bb-links span{background:#221d30;color:#c9c4d6}
.gys-acts.c{justify-content:center}
.bb-pfnote{font-size:11.5px;color:#aaa6b5;margin:0 20px}
.bb-open{margin:30px 20px;text-align:center;background:#fff;border-radius:18px;padding:28px 20px}body.dark-theme .bb-open{background:#16131f}.bb-open b{font-size:20px}.bb-open p{font-size:14px;color:#6b6778;line-height:1.8}
.bb-stu{display:flex;align-items:center;gap:12px;padding:16px;background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#fff;cursor:pointer}.bb-stu>div{flex:1;min-width:0}.bb-stu b{font-size:18px}.bb-stu em{display:block;font-style:normal;font-size:13px;opacity:.9}.bb-stu>span{font-size:22px}
.bb-stat{display:flex;background:#fff;padding:12px 0;margin-bottom:8px}body.dark-theme .bb-stat{background:#16131f}.bb-stat span{flex:1;display:flex;flex-direction:column;align-items:center;font-size:12px;color:#8e8a99;cursor:pointer}.bb-stat b{font-size:18px;color:#8b5cf6}
.bb-cmp{background:#fff;margin:0 0 8px;padding:12px 14px}body.dark-theme .bb-cmp{background:#16131f}
.bb-ctype{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}.bb-ctype span{font-size:13px;padding:5px 11px;border-radius:999px;background:#f3f0fa;cursor:pointer}.bb-ctype span.on{background:#8b5cf6;color:#fff}body.dark-theme .bb-ctype span{background:#221d30}body.dark-theme .bb-ctype span.on{background:#8b5cf6}
.bb-cmp textarea,.bb-cmp input{width:100%;box-sizing:border-box;border:1px solid #ece8f5;border-radius:12px;padding:10px 12px;font-size:15px;font-family:inherit;background:transparent;color:inherit;margin-bottom:8px;resize:vertical}
.bb-cimg{border:1px dashed #c4b5fd;border-radius:12px;padding:16px;text-align:center;color:#8b5cf6;cursor:pointer;margin-bottom:8px;font-size:14px}.bb-cimg img{max-width:100%;max-height:200px;border-radius:8px}
.bb-ctool{display:flex;align-items:center;gap:10px}.bb-ctool>span:first-child{color:#8b5cf6;font-size:13px;cursor:pointer;white-space:nowrap}.bb-ctool em{flex:1;font-style:normal;font-size:11.5px;color:#aaa6b5}
.bb-mym{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#fff;border-bottom:.5px solid #f0edf7;cursor:pointer}body.dark-theme .bb-mym{background:#16131f;border-color:#221d30}.bb-mym>div{flex:1;min-width:0}.bb-mym p{margin:0;font-size:14.5px;line-height:1.5;display:flex;gap:8px;align-items:center}.bb-mym small{font-size:11.5px;color:#aaa6b5}.bb-mym>span{color:#8b5cf6;font-size:13px;white-space:nowrap}
.bb-thumb{width:36px;height:36px;border-radius:6px;background-size:cover;background-position:center;flex-shrink:0;display:inline-block}
.bb-mine{background:#fff;padding:14px 16px;margin-bottom:8px}body.dark-theme .bb-mine{background:#16131f}.bb-mine img{max-width:60%;border-radius:10px}.bb-mine p{font-size:15.5px;line-height:1.6;white-space:pre-wrap;margin:8px 0}.bb-mine small{font-size:12px;color:#aaa6b5}
.bb-menu{background:#fff;margin-top:12px}body.dark-theme .bb-menu{background:#16131f}.bb-menu div{padding:15px 16px;border-bottom:.5px solid #f0edf7;font-size:15px;cursor:pointer}body.dark-theme .bb-menu div{border-color:#221d30}.bb-menu em{float:right;font-style:normal;color:#aaa6b5;font-size:13px}
.bb-help{margin:14px 16px 30px;font-size:13px;color:#6b6778;line-height:1.9;background:#fff;border-radius:14px;padding:14px}body.dark-theme .bb-help{background:#16131f;color:#c9c4d6}
.bb-sheet{position:fixed;inset:0;z-index:99980;background:rgba(0,0,0,.35);display:flex;align-items:flex-end}.bb-sheet-in{width:100%;background:#fff;border-radius:16px 16px 0 0;padding-bottom:env(safe-area-inset-bottom,0px);max-height:70vh;overflow-y:auto}body.dark-theme .bb-sheet-in{background:#1c1a24;color:#eee}
.bb-sheet-in p{margin:0;padding:12px;text-align:center;font-size:13px;color:#8e8a99}
.bb-sheet-in div{padding:15px;text-align:center;border-bottom:.5px solid #f0edf7;font-size:16px;cursor:pointer}.bb-sheet-in div.c{color:#8e8a99;border-top:6px solid #f3f0fa}
`);
(async () => {
    await G.ready(); const d = await ST.get('d', {}); D = Object.assign(D, d || {});
    ['stars', 'subs', 'rooms', 'wall', 'last'].forEach(k => { if (!D[k] || typeof D[k] !== 'object') D[k] = {}; });
    if (!Array.isArray(D.fav)) D.fav = [];
    D.my = Object.assign({ on: 0, at: 0, subsN: 0, fans: {}, msgs: [], letters: [] }, D.my || {});
    D.cfg = Object.assign({ freq: 8, flood: 12, keep: 300 }, D.cfg || {});
})();
window.gysBbState = () => D;

try { G.badge.bubble = unreadAll; } catch (e) {}
