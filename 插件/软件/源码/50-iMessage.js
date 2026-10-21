/* 💬 iMessage：苹果「信息」——单独的一个聊天软件（记录跟私聊分开，TA 两边都知道）。蓝色气泡、已送达 / 已读、对方正在输入的「…」；
   长按（或右键）消息：贴 ❤️👍👎😂‼️❓（Tapback）、回复某一句（串成一条线）、2 分钟内撤回、15 分钟内编辑（「已编辑」）；
   发送特效（长按 ↑ 或点 ✨）：猛击 / 大声 / 轻声 / 隐形墨水，满屏的气球 / 五彩纸屑 / 爱心 / 激光 / 烟花 / 庆祝；
   ⊕：照片、位置、报平安（到点没到 TA 会着急）、稍后发送、贴纸；专注模式（「XX 已将通知静音」，仍要通知）；
   群聊（起群名、换群头像）、联系人名片（你给 TA 存的名字、TA 给你存的名字）、FaceTime（接谷雨的打电话）。 */
if (window.__gysImsg) return; window.__gysImsg = 1;
const G = window.GYS, APP = 'imsg', esc = G.esc;
X.feat('gysImsg', { n: '💬 iMessage', desc: '苹果「信息」：单独的聊天记录、Tapback、撤回编辑、发送特效、报平安、稍后发送、群聊；TA 也会在这里给你发' });
const ST = X.store('gysimsg');
let D = { th: {}, cfg: { keep: 600 }, focus: '', last: {} };
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();
const BUSY = {};
const M = window.gysIm = {};
const TAPS = ['❤️', '👍', '👎', '😂', '‼️', '❓'];
const BFX = [['slam', '猛击'], ['loud', '大声'], ['gentle', '轻声'], ['ink', '隐形墨水']];
const SFX = [['balloons', '🎈 气球'], ['confetti', '🎊 五彩纸屑'], ['love', '❤️ 爱心'], ['lasers', '🌈 激光'], ['fireworks', '🎆 烟花'], ['celebration', '✨ 庆祝']];
const FXN = Object.fromEntries(BFX.concat(SFX).map(([k, n]) => [k, n]));
const STICK = ['🥰', '😘', '🥺', '😭', '😤', '🤗', '😴', '🫶', '💕', '🌙', '☕', '🐱', '🐶', '🌸', '🎉', '👀'];
const FOCI = [['', '关闭'], ['dnd', '🌙 勿扰模式'], ['sleep', '🛏️ 睡眠'], ['work', '💼 工作'], ['personal', '👤 个人']];

/* ---------------- 人和会话 ---------------- */
const nameOf = w => w === 'me' ? '我' : G.nick(APP, w);
const charOfW = w => G.charOf(w);
const cast = () => G.people().filter(w => w !== 'me');
const thOf = id => D.th[id];
function dmOf(w) { if (!D.th[w]) { D.th[w] = { id: w, kind: 'dm', who: w, members: [w], name: '', photo: '', msgs: [], pin: false, mute: false, unread: 0, at: Date.now(), sched: [] }; saveD(); } return D.th[w]; }
const thName = t => t.kind === 'dm' ? nameOf(t.who) : (t.name || t.members.map(nameOf).join('、'));
const thAv = (t, sz) => t.kind === 'dm' ? G.av(APP, t.who, sz) : t.photo ? `<span class="gys-av" style="width:${sz}px;height:${sz}px;background-image:url('${t.photo}')"></span>` : `<span class="im-gav" style="width:${sz}px;height:${sz}px">${t.members.slice(0, 2).map(w => G.av(APP, w, Math.round(sz * 0.62))).join('')}</span>`;
function phoneOf(w) { const p = G.prof(APP, w); if (!p.phone) { p.phone = '+86 1' + G.pick(['38', '39', '58', '86', '77', '35']) + ' ' + G.rnd(1000, 9999) + ' ' + G.rnd(1000, 9999); G.save(); } return p.phone; }
const msgOf = (t, id) => t.msgs.find(m => m.id === id);
const lastReal = t => t.msgs.filter(m => m.from !== 'sys' && !m.unsent).slice(-1)[0];
const unreadAll = () => Object.values(D.th).reduce((k, t) => k + (t.unread || 0), 0);
function taFocus(w) {   // TA 现在开着专注模式吗（深夜睡觉 / 自己设的）
    const p = G.prof(APP, w); if (p.focusUntil && p.focusUntil > Date.now()) return p.focus || 'dnd';
    const h = new Date().getHours(); if (charOfW(w) && (h >= 2 && h < 7)) return 'sleep';
    return '';
}
const focusName = f => (FOCI.find(x => x[0] === f) || ['', ''])[1].replace(/^\S+\s/, '');
function addMsg(t, m) {
    const x = Object.assign({ id: G.uid('m'), from: 'me', t: 'text', text: '', at: Date.now(), st: 'delivered', react: {}, reply: '', fx: '' }, m);
    t.msgs.push(x); t.at = x.at;
    const k = Math.max(100, Number(D.cfg.keep) || 600); if (t.msgs.length > k) t.msgs.splice(0, t.msgs.length - k);
    saveD(); return x;
}
async function chooser(opts, title) {
    return new Promise(res => {
        const d = document.createElement('div'); d.className = 'im-sheet';
        d.innerHTML = `<div class="im-sheet-in"><div class="im-sheet-g">${title ? `<p>${esc(title)}</p>` : ''}${opts.map((o, i) => `<div data-i="${i}">${esc(o)}</div>`).join('')}</div><div class="im-sheet-g"><div data-i="-1" class="c">取消</div></div></div>`;
        d.onclick = e => { const i = e.target.getAttribute('data-i'); if (i == null && e.target !== d) return; d.remove(); res(i == null || i === '-1' ? null : Number(i)); };
        document.body.appendChild(d);
    });
}

/* ---------------- 模型 ---------------- */
const P = (id, def, vars) => X.pl(id, def, vars);
const DEF_REPLY = `{{我是谁}}
你们在用 iPhone 自带的「信息」（iMessage）聊天——跟你们平时聊天的那个软件是分开的两个地方，这里更像发短信：短、随手、一句一条，偶尔用 Tapback 贴个表情代替回复。
你们平时聊天软件里最近聊的（你都知道）：
{{平时}}
iMessage 里最近的：
{{记录}}
{{情况}}
接着回她 1~4 条。文字里可以用 **粗** *斜* ~~删除~~。偶尔（不是每次）可以发语音、拟我表情、手写字条、心跳，或者转钱、共享位置——看情况，像真人一样。
只输出 JSON 数组：[{"text":"一条消息（只贴表情不说话就空）","react":"给她最后那条贴的 Tapback（❤️ 👍 👎 😂 ‼️ ❓ 或者任意一个 emoji），不贴就空","reply":true或false（是不是在回复她某一句，会串成一条线）,"fx":"发送特效：slam / loud / gentle / ink / balloons / confetti / love / lasers / fireworks / celebration，一般空着","tfx":"动态文字：big / small / shake / nod / explode / ripple / bloom / jitter，一般空着","voice":true或false（这条用语音发，text 写语音里说的话）,"memoji":"发一个拟我表情贴纸就写一个 emoji（不发就空）","hand":"手写字条的内容（不写就空）","heart":true或false（发一个数字触感心跳）,"cash":给她转的钱（Apple Cash，数字，不转就 0）,"share":true或false（跟她共享你的实时位置）}]`;
const DEF_GROUP = `iPhone「信息」里的一个群聊「{{群名}}」，群里有：
{{成员}}
最近的：
{{记录}}
{{情况}}
群里接着聊 2~5 条（谁说话看谁的性格和话题，不用每个人都说；短、随手，像发短信）。只输出 JSON 数组：[{"by":"名字","text":"消息","react":"给最后一条贴的 Tapback（❤️ 👍 👎 😂 ‼️ ❓，不贴就空）"}]`;
const DEF_TEXT = `{{我是谁}}
你想在 iPhone 的「信息」（iMessage）上给她发几条（不是平时聊天的那个软件）：随手的那种——看到什么想到她、一张照片、一句「到家了吗」、一个链接、一句没头没尾的话。{{要求}}
最近平时聊的：
{{平时}}
iMessage 里上次聊到：
{{记录}}
只输出 JSON 数组：[{"text":"消息","photo":"如果是发照片，写照片的内容（不是就空）","fx":"发送特效，一般空着"}]`;
const DEF_POST = `{{我是谁}}
你在刷手机（微博 / 小红书 / 豆瓣），刷到了这些：
{{刷到的}}
挑一条你最想转给她看的——跟她有关、她会喜欢、好笑、或者让你想到你们俩的——用 iPhone 的「信息」（iMessage）分享给她，再随手说一两句（像真人转东西时那样：「你看这个」「好像你」「下次一起去」）。都不想转就输出 {"i":0}。
你们最近平时聊的：
{{平时}}
只输出 JSON：{"i":序号,"say":["一两条消息"]}`;
X.plGroup('💬 iMessage', 'gysImsg', [
    ['im.reply', 'TA 在 iMessage 回你', '你在 iMessage 里给 TA 发消息时', '{{我是谁}} {{平时}} {{记录}} {{情况}}'],
    ['im.group', 'iMessage 群聊', '你在群里说话 / 群里自己聊起来时', '{{群名}} {{成员}} {{记录}} {{情况}}'],
    ['im.text', 'TA 主动在 iMessage 给你发', 'TA 自己想发时', '{{我是谁}} {{要求}} {{平时}} {{记录}}'],
    ['im.post', 'TA 把刷到的东西转给你', 'TA 刷微博 / 小红书 / 豆瓣，挑一条分享给你时', '{{我是谁}} {{刷到的}} {{平时}}']
], { 'im.reply': DEF_REPLY, 'im.group': DEF_GROUP, 'im.text': DEF_TEXT, 'im.post': DEF_POST });
function whoAmI(w) { const c = charOfW(w); if (c) return X.who(c); const b = G.base(w) || {}; return `你是${b.name || nameOf(w)}。${b.persona || ''}\n（给你发信息的人：${G.meName()}）`; }
function lineOf(t, m, viewer) {
    const who = m.from === 'me' ? (charOfW(viewer) ? X.me(charOfW(viewer)) : G.meName()) : m.from === 'sys' ? '（系统）' : m.from === viewer ? '你' : nameOf(m.from);
    if (m.unsent) return `${who}：（撤回了一条消息${m.seenText ? '，你之前看到写的是「' + m.seenText + '」' : ''}）`;
    let s = m.t === 'img' ? '[照片]' + (m.desc ? '（' + m.desc + '）' : '') : m.t === 'loc' ? '[位置] ' + m.text : m.t === 'sticker' ? '[贴纸] ' + m.text : m.t === 'checkin' ? '[报平安] ' + m.text : m.t === 'voice' ? '[语音] ' + m.text : m.t === 'memoji' ? `[拟我表情 ${m.face}]` : m.t === 'hand' ? '[手写] ' + (m.text || '（一张手写的字条）') : m.t === 'touch' ? (m.kind === 'heart' ? '[数字触感：心跳]' : '[数字触感：画了一笔 / 轻点]') : m.t === 'cash' ? `[Apple Cash ¥${m.amt}${m.note ? ' ' + m.note : ''}]（${({ pending: '还没接受', accepted: '已接受', declined: '退回了' })[m.cst]}）` : m.t === 'live' ? `[共享位置：${m.place}]${liveOn(m) ? '' : '（已停止）'}` : m.t === 'locreq' ? '[请求查看你的位置]' : m.t === 'song' ? `[分享了一首歌：${m.title || ''}${m.artist ? ' - ' + m.artist : ''}]` : m.t === 'ftmsg' ? '[FaceTime 留言] ' + (m.text || '') : m.t === 'post' ? '[分享了一条' + G.cardText(m.card) + ']' : m.t === 'game' ? `[小游戏：${GAMES[m.kind]}${m.win ? '，' + (m.win === 'draw' ? '平局' : m.win === 'me' ? '她赢了' : '你赢了') : ''}]` : m.text;
    if (m.tfx) s += `〔动态文字：${TFXN[m.tfx]}〕`;
    const reply = m.reply && msgOf(t, m.reply); if (reply) s = `（回复「${(reply.text || '').slice(0, 20)}」）` + s;
    if (m.fx) s += `〔${FXN[m.fx] || m.fx}特效〕`; if (m.edited) s += '（已编辑）';
    const rs = Object.entries(m.react || {}).map(([w, e]) => `${w === 'me' ? '她' : w === viewer ? '你' : nameOf(w)}贴了${e}`).join('，');
    return `${who}：${s}${rs ? '　〔' + rs + '〕' : ''}`;
}
const recLines = (t, viewer, n) => t.msgs.slice(-(n || 16)).map(m => lineOf(t, m, viewer)).join('\n') || '（还没聊过）';
function situ(t, w) {
    const L = [];
    if (D.focus) L.push(`她开着「${focusName(D.focus)}」专注模式${D.focus === 'sleep' ? '（她在睡觉，别吵醒她）' : ''}`);
    if (D.cfg.rr === false) L.push('她关了已读回执，你看不到她读没读');
    if (t.sms) L.push('你们这次是用普通短信（绿色气泡）发的，没有已读和特效');
    const ck = t.msgs.filter(m => m.t === 'checkin' && m.from === 'me').slice(-1)[0];
    if (ck && ck.ck) L.push(ck.ck.state === 'on' ? `她开了「报平安」：去${ck.ck.dest}，预计 ${G.hm(ck.ck.due)} 到` : ck.ck.state === 'late' ? `她的「报平安」超时了，还没到${ck.ck.dest}（预计 ${G.hm(ck.ck.due)}）` : ck.ck.state === 'arrived' ? `她已经平安到了${ck.ck.dest}` : '');
    const n = new Date(); L.push(`现在是 ${n.getMonth() + 1}月${n.getDate()}日 ${G.hm(n)}`);
    return L.filter(Boolean).join('；');
}
async function taReply(t, extra) {
    if (BUSY[t.id]) { t.again = (t.again ? t.again + '；' : '') + (extra || '她又发了新消息'); return; } const w = t.who; if (!G.base(w)) return;
    BUSY[t.id] = 1; t.typing = 1; G.repaint(APP);
    try {
        const c = charOfW(w);
        await sleep(G.rnd(700, 1800)); readMine(t, w);
        const W0 = wallet(); for (const cm of t.msgs.filter(m => m.t === 'cash' && m.from === 'me' && m.cst === 'pending')) { cm.cst = Math.random() < 0.9 ? 'accepted' : 'declined'; const cc = charOfW(w); if (W0 && W0.earn && cc) { try { await W0.earn(cm.cst === 'accepted' ? cc.id : 'me', cm.amt, cm.cst === 'accepted' ? 'Apple Cash 来自' + G.meName() : 'Apple Cash 被退回'); } catch (e) {} } extra = (extra ? extra + '；' : '') + `她用 Apple Cash 给你转了 ¥${cm.amt}${cm.note ? '（' + cm.note + '）' : ''}，你${cm.cst === 'accepted' ? '收下了' : '退回去了'}`; }
        t.typing = 1; G.repaint(APP);
        const o = X.json(await X.ask(P('im.reply', DEF_REPLY, { 我是谁: whoAmI(w), 平时: c ? G.recentAll(c, APP) : '（没有）', 记录: recLines(t, w), 情况: situ(t, w) + (extra ? '；' + extra : '') })));
        if (!Array.isArray(o) || !o.length) return;
        const her = t.msgs.filter(m => m.from === 'me' && !m.unsent).slice(-1)[0];
        let first = null;
        const lr = t.msgs.filter(m => m.t === 'locreq' && m.from === 'me' && !m.done).slice(-1)[0];
        if (lr) { lr.done = 1; if (!o.some(x => x && x.share)) o.push({ share: true }); }
        for (const x of o.slice(0, 6)) {
            if (!x) continue;
            if (x.react && her && String(x.react).length <= 4 && !/^\w+$/.test(x.react)) { her.react = her.react || {}; her.react[w] = x.react; }
            const add = async (o2, ms) => { t.typing = 1; G.repaint(APP); await sleep(ms || 900); const m = addMsg(t, Object.assign({ from: w }, o2)); if (!first) first = m; if (!isViewing(t.id)) t.unread = (t.unread || 0) + 1; G.repaint(APP); return m; };
            if (x.memoji) await add({ t: 'memoji', face: X.plain(x.memoji).slice(0, 4) });
            if (x.hand) await add({ t: 'hand', text: X.plain(x.hand).slice(0, 60) }, 1500);
            if (x.heart) await add({ t: 'touch', kind: 'heart' });
            if (Number(x.cash) > 0) await add({ t: 'cash', amt: Math.round(Number(x.cash) * 100) / 100, note: '', cst: 'pending' });
            if (x.share) await add({ t: 'live', until: Date.now() + 3600e3, place: placeOf(w) });
            const tx = X.plain(x.text || '').slice(0, 500); if (!tx) continue;
            if (x.voice) { await add({ t: 'voice', text: tx, sec: Math.max(2, Math.round(tx.length / 4)) }, 1600); continue; }
            t.typing = 1; G.repaint(APP); await sleep(Math.min(2600, 400 + tx.length * 60));
            const m = addMsg(t, { from: w, text: tx, reply: x.reply && her ? her.id : '', fx: FXN[x.fx] ? x.fx : '', tfx: TFXN[x.tfx] ? x.tfx : '' });
            if (!first) first = m;
            if (!isViewing(t.id)) t.unread = (t.unread || 0) + 1;
            G.repaint(APP); if (m.fx && isViewing(t.id)) playFx(m);
        }
        saveD();
        if (first && !isViewing(t.id)) G.notify(APP, c || null, `💬 <b>${X.esc(nameOf(w))}</b>`, first.text, X.go('gysImsgOpenThread', t.id));
    } catch (e) { console.warn('[iMessage] 回复失败', e); }
    finally { t.typing = 0; BUSY[t.id] = 0; saveD(); G.repaint(APP); if (t.again) { const ex = t.again; t.again = ''; setTimeout(() => taReply(t, ex), G.rnd(600, 1500)); } }
}
async function groupReply(t, extra) {
    if (BUSY[t.id]) return; BUSY[t.id] = 1; t.typing = 1; G.repaint(APP);
    try {
        await sleep(G.rnd(600, 1500));
        const o = X.json(await X.ask(P('im.group', DEF_GROUP, { 群名: thName(t), 成员: t.members.map(w => { const b = G.base(w) || {}; return `· ${nameOf(w)}${b.name && b.name !== nameOf(w) ? '（' + b.name + '）' : ''}：${String(b.persona || '').slice(0, 120)}`; }).join('\n') + `\n· 还有${G.meName()}（用户本人）`, 记录: recLines(t, ''), 情况: situ(t, '') + (extra ? '；' + extra : '') })));
        if (!Array.isArray(o)) return;
        const last = t.msgs.filter(m => m.from !== 'sys').slice(-1)[0];
        for (const x of o.slice(0, 6)) {
            if (!x) continue; const w = t.members.find(w => nameOf(w) === x.by || (G.base(w) || {}).name === x.by); if (!w) continue;
            if (x.react && TAPS.includes(x.react) && last) { last.react = last.react || {}; last.react[w] = x.react; }
            const tx = X.plain(x.text || '').slice(0, 400); if (!tx) continue;
            await sleep(Math.min(2000, 300 + tx.length * 50));
            addMsg(t, { from: w, text: tx }); if (!isViewing(t.id)) t.unread = (t.unread || 0) + 1; G.repaint(APP);
        }
        readMine(t, '');
    } finally { t.typing = 0; BUSY[t.id] = 0; saveD(); G.repaint(APP); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function readMine(t, w) { const now = Date.now(); t.msgs.forEach(m => { if (m.from === 'me' && m.st !== 'read') { m.st = 'read'; m.readAt = now; if (m.unsent && !m.seenText) { } } }); saveD(); }
const isViewing = id => { const v = G.isOpen(APP) && G.top(APP); return !!(v && v.id === 'th_' + id); };

/* ---------------- 列表 ---------------- */
let Q = '';
function head() { return `<div class="gys-hd im-hd"><span class="gys-bk" onclick="GYS.close('${APP}')">${G.ic('back', 22)}</span><span class="im-edit" onclick="gysIm.listMenu()">${D.focus ? FOCI.find(f => f[0] === D.focus)[1].split(' ')[0] + ' ' : ''}编辑</span><span class="gys-hr"><span onclick="gysIm.compose()">${G.ic('compose', 24)}</span></span></div>`; }
function list() {
    const ts = Object.values(D.th).filter(t => t.msgs.length || t.kind === 'group').filter(t => !Q || thName(t).indexOf(Q) >= 0 || t.msgs.some(m => (m.text || '').indexOf(Q) >= 0)).sort((a, b) => b.at - a.at);
    const pins = ts.filter(t => t.pin), rest = ts.filter(t => !t.pin);
    return `<div class="im-big">信息${D.focus ? `<small>${esc(FOCI.find(f => f[0] === D.focus)[1])}</small>` : ''}</div>
      <div class="im-search"><input placeholder="🔍 搜索" value="${esc(Q)}" oninput="gysIm.q(this.value)"></div>
      ${pins.length ? `<div class="im-pins">${pins.map(t => `<div onclick="gysIm.open('${t.id}')" oncontextmenu="event.preventDefault();gysIm.rowMenu('${t.id}')">${t.unread ? '<i class="im-dot"></i>' : ''}${thAv(t, 64)}<b>${esc(thName(t))}</b></div>`).join('')}</div>` : ''}
      ${rest.map(t => { const m = t.msgs.slice(-1)[0]; return `<div class="im-row" onclick="gysIm.open('${t.id}')" oncontextmenu="event.preventDefault();gysIm.rowMenu('${t.id}')">${t.unread ? '<i class="im-dot"></i>' : '<i class="im-dot off"></i>'}${thAv(t, 46)}<div><div class="im-rt"><b>${esc(thName(t))}</b><small>${m ? timeShort(m.at) : ''} ›</small></div><em>${t.typing ? '正在输入…' : m ? esc(preview(t, m)) : '新群聊'}</em></div>${t.mute ? '<span class="im-mute">🔕</span>' : ''}</div>`; }).join('')}
      ${!ts.length ? `<div class="gys-empty">还没有信息<br><span class="gys-btn" onclick="gysIm.compose()">✏️ 新信息</span></div>` : ''}
      <div class="im-tip">长按（电脑上右键）一行可以置顶、静音、删除</div>`;
}
function preview(t, m) { const who = t.kind === 'group' && m.from !== 'me' && m.from !== 'sys' ? nameOf(m.from) + '：' : ''; if (m.unsent) return (m.from === 'me' ? '你' : nameOf(m.from)) + '撤回了一条信息'; return who + ({ img: '照片', loc: '📍 位置', sticker: m.text, checkin: '报平安', voice: '🎙️ 语音', memoji: '拟我表情', hand: '✍️ 手写', touch: '数字触感', cash: '💵 Apple Cash', live: '📍 正在共享位置', locreq: '📍 请求位置', game: '🎮 ' + (GAMES[m.kind] || '小游戏'), song: '🎵 ' + (m.title || '歌'), post: '🔗 ' + ((G.APPS[(m.card || {}).app] || {}).n || '分享') + (m.card && m.card.kind ? '·' + m.card.kind : ''), ftmsg: '📹 FaceTime 留言' }[m.t] || (m.fx === 'ink' ? '（以隐形墨水发送）' : m.text)); }
function timeShort(t) { const d = new Date(t), n = new Date(); if (d.toDateString() === n.toDateString()) return G.hm(t); if (n - d < 2 * 86400e3 && n.getDate() !== d.getDate()) return '昨天'; if (n - d < 7 * 86400e3) return '星期' + '日一二三四五六'[d.getDay()]; return (d.getMonth() + 1) + '/' + d.getDate(); }
M.q = v => { Q = v; G.repaint(APP); const i = document.querySelector('#gys_imsg .im-search input'); if (i) { i.focus(); i.selectionStart = i.selectionEnd = i.value.length; } };
M.rowMenu = async id => {
    const t = thOf(id); if (!t) return;
    const ops = [t.pin ? '取消置顶' : '📌 置顶', t.mute ? '🔔 取消静音' : '🔕 隐藏提醒', t.unread ? '标为已读' : '标为未读', '🗑️ 删除'];
    const i = await chooser(ops, thName(t)); if (i == null) return;
    if (i === 0) t.pin = !t.pin; else if (i === 1) t.mute = !t.mute; else if (i === 2) t.unread = t.unread ? 0 : 1;
    else { if (!(await G.dialog({ title: '删除这个对话？', text: '会先放进「最近删除」，30 天后自动永久删除', ok: '删除', danger: true }))) return; (D.trash = D.trash || {})[id] = { t, at: Date.now() }; delete D.th[id]; X.toast('🗑️ 放进最近删除了', '右上角「编辑」→ 最近删除 里能恢复'); }
    saveD(); G.repaint(APP);
};
M.focusMenu = async () => { const i = await chooser(FOCI.map(f => f[1]), '专注模式（TA 会知道你开着）'); if (i == null) return; D.focus = FOCI[i][0]; saveD(); G.repaint(APP); X.toast(D.focus ? FOCI[i][1] + ' 打开了' : '专注模式关了', D.focus ? 'TA 给你发信息时会看到「已将通知静音」' : ''); };
M.compose = async () => {
    const L = cast(); const i = await chooser(L.map(nameOf).concat(['👥 新建群聊']), '新信息：发给谁？'); if (i == null) return;
    if (i === L.length) return M.newGroup();
    M.open(dmOf(L[i]).id);
};
M.newGroup = () => {
    const sel = {};
    G.push(APP, { title: '新建群聊', html: () => `<label class="gys-f"><span>群名称（可以不写）</span><input id="imGn" placeholder="比如：周末去哪玩"></label><div class="im-sech">选择成员</div>${cast().map(w => `<label class="im-pick">${G.av(APP, w, 36)}<b>${esc(nameOf(w))}</b><input type="checkbox" value="${w}" class="imGm"></label>`).join('')}<div class="gys-acts"><button class="gys-btn" onclick="gysIm.mkGroup()">创建</button></div>` });
};
M.mkGroup = () => {
    const ws = [...document.querySelectorAll('.imGm:checked')].map(x => x.value); if (ws.length < 2) return X.toast('至少选两个人', '一个人的话直接发信息就行');
    const id = 'g_' + Date.now().toString(36);
    D.th[id] = { id, kind: 'group', who: '', members: ws, name: X.plain((document.getElementById('imGn') || {}).value || '').slice(0, 20), photo: '', msgs: [], pin: false, mute: false, unread: 0, at: Date.now(), sched: [] };
    addMsg(D.th[id], { from: 'sys', text: `你创建了群聊，成员：${ws.map(nameOf).join('、')}` });
    G.back(APP); M.open(id);
};

/* ---------------- 会话 ---------------- */
let REP = {}, FX = {};
M.open = id => {
    const t = thOf(id); if (!t) return; t.unread = 0; saveD();
    G.push(APP, { id: 'th_' + id, title: '', cls: 'im-thb', html: () => thHtml(id), foot: () => footHtml(id), after: r => { afterTh(r, id); } });
};
function afterTh(r, id) {
    const t = thOf(id); if (!t) return;
    const h = r.querySelector('.gys-hd'); if (h && !h.querySelector('.im-th')) { const b = h.querySelector('b'); if (b) b.outerHTML = `<div class="im-th" onclick="gysIm.info('${id}')">${thAv(t, 38)}<span>${esc(thName(t))} ›</span></div>`; }
    const body = r.querySelector('.gys-body'); const n = t.msgs.length + (t.typing ? 1000 : 0) + Object.values(REP).length; if (body && r.__imN !== id + n) { body.scrollTop = body.scrollHeight; r.__imN = id + n; }
    r.querySelectorAll('[data-mid]').forEach(el => {
        if (el.__im) return; el.__im = 1; let tm = null;
        el.addEventListener('contextmenu', e => { e.preventDefault(); M.msgMenu(id, el.getAttribute('data-mid')); });
        el.addEventListener('touchstart', () => { tm = setTimeout(() => { tm = null; M.msgMenu(id, el.getAttribute('data-mid')); }, 480); }, { passive: true });
        ['touchend', 'touchmove', 'touchcancel'].forEach(k => el.addEventListener(k, () => { if (tm) clearTimeout(tm); tm = null; }, { passive: true }));
    });
    const send = r.querySelector('.im-send'); if (send && !send.__im) { send.__im = 1; let tm = null; send.addEventListener('touchstart', () => { tm = setTimeout(() => { tm = null; send.__long = 1; M.fxMenu(id); }, 480); }, { passive: true }); send.addEventListener('touchend', () => { if (tm) clearTimeout(tm); tm = null; }, { passive: true }); send.addEventListener('contextmenu', e => { e.preventDefault(); M.fxMenu(id); }); }
    // 新收到的满屏特效
    t.msgs.forEach(m => { if (m.fx && !PLAYED[m.id]) { PLAYED[m.id] = 1; if (Date.now() - m.at < 60e3) playFx(m); } });
}
const PLAYED = {};
function thHtml(id) {
    const t = thOf(id); if (!t) return '';
    let h = '', lastAt = 0, lastFrom = '';
    if (t.kind === 'dm') h += `<div class="im-head">${G.av(APP, t.who, 64)}<b>${esc(nameOf(t.who))}</b><small>iMessage · ${esc(phoneOf(t.who))}</small></div>`;
    const myLast = t.msgs.filter(m => m.from === 'me' && !m.unsent).slice(-1)[0];
    t.msgs.forEach((m, i) => {
        if (m.at - lastAt > 15 * 60e3) { h += `<div class="im-time">${dayStr(m.at)}</div>`; lastFrom = ''; }
        lastAt = m.at;
        if (m.from === 'sys') { h += `<div class="im-sys">${esc(m.text)}</div>`; lastFrom = ''; return; }
        const next = t.msgs[i + 1], tail = !next || next.from !== m.from || next.at - m.at > 15 * 60e3;
        const me = m.from === 'me';
        if (m.unsent) { h += `<div class="im-sys">${me ? '你' : esc(nameOf(m.from))}撤回了一条信息</div>`; lastFrom = ''; return; }
        if (t.kind === 'group' && !me && lastFrom !== m.from) h += `<div class="im-gname">${esc(nameOf(m.from))}</div>`;
        const rp = m.reply && msgOf(t, m.reply);
        h += `<div class="im-m ${me ? 'me' : 'ta'}${tail ? ' tail' : ''}">${t.kind === 'group' && !me ? (tail ? G.av(APP, m.from, 28) : '<span class="im-avsp"></span>') : ''}<div class="im-mc">
          ${rp ? `<div class="im-rq" onclick="gysIm.jump('${id}','${rp.id}')">${esc(rp.from === 'me' ? '你' : nameOf(rp.from))}：${esc(rp.t === 'text' ? rp.text : preview(t, rp)).slice(0, 40)}</div>` : ''}
          ${bubble(t, m)}
          ${Object.keys(m.react || {}).length ? `<div class="im-tb">${Object.values(m.react).map(e => `<i>${e}</i>`).join('')}</div>` : ''}
          ${m.edited ? `<div class="im-ed" onclick="gysIm.edits('${id}','${m.id}')">已编辑</div>` : ''}
          ${m.fx && FXN[m.fx] && !['ink'].includes(m.fx) ? `<div class="im-fxn" onclick="gysIm.replay('${id}','${m.id}')">以「${FXN[m.fx].replace(/^\S+\s/, '')}」发送 ↻</div>` : ''}
          ${me && m === myLast ? `<div class="im-st">${t.sms ? '已发送 · 短信' : m.st === 'read' && (t.kind === 'group' || rrTa(t.who)) ? '已读 ' + G.hm(m.readAt || m.at) : '已送达'}</div>` : ''}</div></div>`;
        lastFrom = m.from;
    });
    if (t.typing && !t.sms) h += `<div class="im-m ta tail">${t.kind === 'group' ? '<span class="im-avsp"></span>' : ''}<div class="im-mc"><div class="im-b ta im-typing"><i></i><i></i><i></i></div></div></div>`;
    (t.sched || []).forEach(s => { h += `<div class="im-m me"><div class="im-mc"><div class="im-b me sched">${esc(s.text)}</div><div class="im-st">🕒 ${dayStr(s.at)} 发送 · <a onclick="gysIm.unsched('${id}','${s.id}')">取消</a></div></div></div>`; });
    if (t.kind === 'dm') { const f = taFocus(t.who); if (f) h += `<div class="im-focus">${f === 'sleep' ? '🛏️' : '🌙'} ${esc(nameOf(t.who))} 已将通知静音${f !== 'dnd' ? '（' + focusName(f) + '）' : ''}<a onclick="gysIm.urgent('${id}')">仍要通知</a></div>`; }
    return `<div class="im-thw">${h}</div>`;
}
function dayStr(t) { const d = new Date(t), n = new Date(); const hm = G.hm(t); if (d.toDateString() === n.toDateString()) return '今天 ' + hm; if (n - d < 2 * 86400e3 && n.getDate() !== d.getDate()) return '昨天 ' + hm; return `${d.getMonth() + 1}月${d.getDate()}日 星期${'日一二三四五六'[d.getDay()]} ${hm}`; }
function bubble(t, m) {
    const me = m.from === 'me', cls = `im-b ${me ? 'me' : 'ta'}${m.fx && ['slam', 'loud', 'gentle'].includes(m.fx) && !FX[m.id + 'p'] ? ' fx-' + m.fx : ''}${m.fx === 'ink' ? ' ink' : ''}`;
    if (m.fx && ['slam', 'loud', 'gentle'].includes(m.fx)) FX[m.id + 'p'] = 1;
    if (m.t === 'img') return `<div class="im-img" data-mid="${m.id}">${m.img ? `<img src="${m.img}" onclick="GYS.imgView(this.src)">` : `<div class="im-ph" style="background:${bg(m.desc)}"><em>📷 ${esc(m.desc || '照片')}</em></div>`}</div>`;
    if (m.t === 'sticker') return `<div class="im-stk" data-mid="${m.id}">${esc(m.text)}</div>`;
    if (m.t === 'loc') return `<div class="im-loc" data-mid="${m.id}"><div class="im-map"><i>📍</i></div><b>${esc(m.text)}</b><small>${me ? '我的位置' : esc(nameOf(m.from)) + '的位置'}</small></div>`;
    if (m.t === 'checkin') return ckCard(t, m);
    if (m.t === 'voice') return `<div class="im-b ${me ? 'me' : 'ta'}${t.sms && me ? ' sms' : ''} im-voice" data-mid="${m.id}" onclick="gysIm.play('${t.id}','${m.id}')"><span class="im-vp">▶︎</span><span class="im-wave">${wave(m, 22)}</span><em>${durS(m.sec || Math.max(1, Math.round((m.text || '').length / 4)))}</em></div>${m.text ? `<div class="im-vtx">${esc(m.text)}</div>` : ''}`;
    if (m.t === 'memoji') return `<div class="im-memo" data-mid="${m.id}">${G.av(APP, m.from, 92)}<i>${esc(m.face || '😊')}</i></div>`;
    if (m.t === 'hand') return handHtml(m);
    if (m.t === 'touch') return touchHtml(m);
    if (m.t === 'cash') return cashHtml(t, m);
    if (m.t === 'live') return liveHtml(t, m);
    if (m.t === 'locreq') return `<div class="im-b ${me ? 'me' : 'ta'}" data-mid="${m.id}">📍 请求查看你的位置</div>`;
    if (m.t === 'game') return gameHtml(t, m);
    if (m.t === 'song') return songHtml(m);
    if (m.t === 'post') return postHtml(m);
    if (m.t === 'ftmsg') return `<div class="im-ftm" data-mid="${m.id}" onclick="this.classList.add('played')"><span class="im-ftp">📹</span><div><b>FaceTime 留言</b><small>${me ? '我' : esc(nameOf(m.from))} · 轻点播放</small></div><em class="im-ftt">${esc(m.text || '')}</em></div>`;
    const f = m.fmt || {}, tf = m.tfx ? ' tfx-' + m.tfx : '';
    return `<div class="${cls}${t.sms && me ? ' sms' : ''}${tf}${f.b ? ' fb' : ''}${f.i ? ' fi' : ''}${f.u ? ' fu' : ''}${f.s ? ' fs' : ''}" data-mid="${m.id}" ${m.fx === 'ink' ? 'onclick="this.classList.toggle(\'open\')"' : ''}>${fmtHtml(m)}</div>${linkCard(m)}`;
}
const bg = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `linear-gradient(135deg,hsl(${h},55%,75%),hsl(${(h + 40) % 360},60%,62%))`; };
function ckCard(t, m) {
    const c = m.ck || {}, me = m.from === 'me', who = me ? '我' : nameOf(m.from);
    const st = c.state === 'arrived' ? `✅ ${esc(who)} 已平安到达` : c.state === 'late' ? `⚠️ ${esc(who)} 没有按时到达` : c.state === 'cancel' ? '已结束' : `⏳ 预计 ${G.hm(c.due)} 到达`;
    return `<div class="im-ck${c.state === 'late' ? ' late' : c.state === 'arrived' ? ' ok' : ''}" data-mid="${m.id}"><b>🛡️ 报平安</b><p>${esc(who)} 去 ${esc(c.dest || '')}</p><small>${st}</small>${me && c.state === 'on' || me && c.state === 'late' ? `<div class="im-ckb"><span onclick="gysIm.arrive('${t.id}','${m.id}')">我到了</span><span onclick="gysIm.ckAdd('${t.id}','${m.id}')">再加 15 分钟</span><span onclick="gysIm.ckEnd('${t.id}','${m.id}')">结束</span></div>` : ''}</div>`;
}
function footHtml(id) {
    const t = thOf(id); if (!t) return ''; const rp = REP[id] && msgOf(t, REP[id]);
    return `<div class="im-in">${rp ? `<div class="im-rpbar">回复 ${esc(rp.from === 'me' ? '自己' : nameOf(rp.from))}：${esc((rp.text || preview(t, rp)).slice(0, 30))}<i onclick="gysIm.unreply('${id}')">✕</i></div>` : ''}${FX[id] ? `<div class="im-rpbar">✨ 将以「${esc(FXN[FX[id]].replace(/^\S+\s/, ''))}」发送<i onclick="gysIm.fxClear('${id}')">✕</i></div>` : ''}
      ${FMT[id] && (FMT[id].b || FMT[id].i || FMT[id].u || FMT[id].s || FMT[id].tfx) ? `<div class="im-rpbar">Aa ${['b', 'i', 'u', 's'].filter(k => FMT[id][k]).map(k => ({ b: '粗体', i: '斜体', u: '下划线', s: '删除线' })[k]).concat(FMT[id].tfx ? ['动态：' + TFXN[FMT[id].tfx]] : []).join(' · ')}<i onclick="gysIm.fmtClr('${id}')">✕</i></div>` : ''}
      <div class="im-inr"><span class="im-plus" onclick="gysIm.plus('${id}')">＋</span><div class="im-pill"><input id="imIn" placeholder="${t.sms ? '短信' : 'iMessage'}" oninput="gysIm.__typing(this)" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysIm.send('${id}')"><span class="im-aa" onclick="gysIm.fmtMenu('${id}')" title="文字格式">Aa</span><span class="im-fxb" onclick="gysIm.fxMenu('${id}')" title="发送特效">✨</span><span class="im-mic" onclick="gysIm.rec('${id}')" title="语音">${G.ic('mic', 20)}</span><span class="im-send${t.sms ? ' sms' : ''}" onclick="gysIm.send('${id}')">↑</span></div></div></div>`;
}
M.unreply = id => { delete REP[id]; G.repaint(APP); };
M.fmtClr = id => { delete FMT[id]; G.repaint(APP); };
M.fxClear = id => { delete FX[id]; G.repaint(APP); };
M.jump = (id, mid) => { const el = document.querySelector(`#gys_imsg [data-mid="${mid}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); } };
const AUTO_FX = [[/生日快乐/, 'balloons'], [/恭喜|祝贺/, 'confetti'], [/新年快乐|元旦快乐|春节快乐/, 'fireworks'], [/爱你|想你|❤|love you/i, ''], [/pew pew/i, 'lasers']];
M.send = async (id, opt) => {
    const t = thOf(id), inp = document.getElementById('imIn'); if (!t || !inp) return;
    const send = document.querySelector('#gys_imsg .im-send'); if (send && send.__long) { send.__long = 0; return; }
    const tx = inp.value.trim(); if (!tx) return; inp.value = '';
    let fx = FX[id] || ''; if (!fx) { const a = AUTO_FX.find(([re, f]) => f && re.test(tx)); if (a) fx = a[1]; }
    const fm = FMT[id] || {}; const m = addMsg(t, { from: 'me', text: tx.slice(0, 2000), reply: REP[id] || '', fx: t.sms ? '' : fx, urgent: opt && opt.urgent, fmt: (fm.b || fm.i || fm.u || fm.s) ? { b: fm.b, i: fm.i, u: fm.u, s: fm.s } : null, tfx: t.sms ? '' : fm.tfx || '' });
    delete REP[id]; delete FX[id]; delete FMT[id]; G.repaint(APP); if (fx) playFx(m);
    afterSend(t, opt);
};
function afterSend(t, opt) {
    if (t.kind === 'group') { groupReply(t); return; }
    const f = taFocus(t.who);
    if (f === 'sleep' && !(opt && opt.urgent)) return;   // TA 睡着了：已送达，醒了再回（自主行动里会回）
    clearTimeout(t.__tm); t.__tm = setTimeout(() => taReply(t, opt && opt.urgent ? '她用了「仍要通知」把你叫醒 / 打扰到你了，说明有点急' : ''), G.rnd(1200, 3500));
}
M.urgent = async id => { const t = thOf(id); if (!t) return; X.toast('🔔 仍要通知', X.v('TA 会收到提醒', '把 TA 叫起来了')); taReply(t, '她用了「仍要通知」把你叫醒 / 打扰到你了，说明有点急'); };

/* ---------------- 长按：Tapback / 回复 / 撤回 / 编辑 ---------------- */
M.msgMenu = (id, mid) => {
    const t = thOf(id), m = t && msgOf(t, mid); if (!m || m.unsent) return;
    const me = m.from === 'me', age = Date.now() - m.at;
    const ops = [['reply', '↩︎ 回复'], ['copy', '📋 拷贝']].concat(me && m.t === 'text' && age < 15 * 60e3 ? [['edit', '✏️ 编辑']] : [], me && age < 2 * 60e3 ? [['unsend', '↶ 撤回']] : [], [['del', '🗑️ 删除（只删我这边）']]);
    const d = document.createElement('div'); d.className = 'im-ov';
    d.innerHTML = `<div class="im-ovin ${me ? 'me' : 'ta'}"><div class="im-taps">${TAPS.concat((m.react || {}).me && !TAPS.includes(m.react.me) ? [m.react.me] : []).map(e => `<i class="${(m.react || {}).me === e ? 'on' : ''}" data-e="${e}">${e}</i>`).join('')}<i data-more="1" class="im-more">＋</i></div><div class="im-ovb">${bubble(t, m)}</div><div class="im-ovm">${ops.map(([k, n]) => `<div data-k="${k}">${n}</div>`).join('')}</div></div>`;
    d.onclick = async e => {
        let em = e.target.getAttribute('data-e'); const k = e.target.getAttribute('data-k');
        if (e.target.getAttribute('data-more')) { d.remove(); const j = await chooser(MORE, '用任意表情回应'); if (j == null) return; em = MORE[j]; }
        else { if (!em && !k && e.target !== d) return; d.remove(); }
        if (em) { m.react = m.react || {}; if (m.react.me === em) delete m.react.me; else m.react.me = em; saveD(); G.repaint(APP); if (!me && t.kind === 'dm' && Math.random() < 0.25) setTimeout(() => taReply(t, `她给你那句「${(m.text || '').slice(0, 20)}」贴了 ${em}`), 2500); return; }
        if (k === 'reply') { REP[id] = mid; G.repaint(APP); setTimeout(() => { const i = document.getElementById('imIn'); if (i) i.focus(); }, 30); }
        else if (k === 'copy') { try { navigator.clipboard.writeText(m.text || ''); X.toast('拷贝好了', ''); } catch (er) {} }
        else if (k === 'edit') { const v = await G.input('编辑信息（对方会看到「已编辑」）', m.text); if (v && v.trim() && v !== m.text) { (m.edits = m.edits || []).push({ text: m.text, at: Date.now() }); m.text = v.trim().slice(0, 2000); m.edited = Date.now(); saveD(); G.repaint(APP); if (t.kind === 'dm' && m.st === 'read' && Math.random() < 0.5) setTimeout(() => taReply(t, `她把刚才那句从「${m.edits[m.edits.length - 1].text}」改成了「${m.text}」（你看到了「已编辑」）`), 2000); } }
        else if (k === 'unsend') { if (m.st === 'read') m.seenText = m.text; m.unsent = Date.now(); saveD(); G.repaint(APP); X.toast('↶ 撤回了', m.st === 'read' ? X.v('不过 TA 好像已经看到了……', 'TA 已读过了') : ''); if (t.kind === 'dm' && m.st === 'read' && Math.random() < 0.6) setTimeout(() => taReply(t, `她撤回了一条，但你已经看到了，写的是「${m.seenText}」`), 2500); }
        else if (k === 'del') { t.msgs = t.msgs.filter(x => x !== m); saveD(); G.repaint(APP); }
    };
    document.body.appendChild(d);
};
M.edits = (id, mid) => { const t = thOf(id), m = t && msgOf(t, mid); if (!m) return; G.push(APP, { title: '编辑记录', html: () => (m.edits || []).map(e => `<div class="im-edrow"><small>${dayStr(e.at)}</small><p>${esc(e.text)}</p></div>`).join('') + `<div class="im-edrow cur"><small>现在</small><p>${esc(m.text)}</p></div>` }); };

/* ---------------- 特效 ---------------- */
M.fxMenu = async id => {
    const opts = ['不用特效'].concat(BFX.map(([k, n]) => '气泡 · ' + n), SFX.map(([k, n]) => '屏幕 · ' + n));
    const i = await chooser(opts, '以特效发送（长按 ↑ 也能打开）'); if (i == null) return;
    const keys = [''].concat(BFX.map(x => x[0]), SFX.map(x => x[0]));
    if (keys[i]) FX[id] = keys[i]; else delete FX[id];
    G.repaint(APP); const inp = document.getElementById('imIn'); if (inp && inp.value.trim()) M.send(id);
};
M.replay = (id, mid) => { const t = thOf(id), m = t && msgOf(t, mid); if (m) playFx(m, true); };
function playFx(m, force) {
    const k = m.fx; if (!k) return;
    if (['slam', 'loud', 'gentle'].includes(k)) { const el = document.querySelector(`#gys_imsg [data-mid="${m.id}"]`); if (el) { el.classList.remove('fx-' + k); void el.offsetWidth; el.classList.add('fx-' + k); } return; }
    if (k === 'ink') return;
    const ov = document.createElement('div'); ov.className = 'im-fx im-fx-' + k;
    const N = { balloons: 18, confetti: 70, love: 1, lasers: 6, fireworks: 7, celebration: 40 }[k] || 20;
    for (let i = 0; i < N; i++) {
        const s = document.createElement('span');
        if (k === 'balloons') { s.textContent = '🎈'; s.style.left = G.rnd(0, 92) + '%'; s.style.animationDelay = (Math.random() * 1.2) + 's'; s.style.fontSize = G.rnd(36, 60) + 'px'; s.style.filter = `hue-rotate(${G.rnd(0, 360)}deg)`; }
        else if (k === 'confetti') { s.style.left = G.rnd(0, 100) + '%'; s.style.background = `hsl(${G.rnd(0, 360)},85%,60%)`; s.style.animationDelay = (Math.random() * 1.2) + 's'; s.style.transform = `rotate(${G.rnd(0, 360)}deg)`; }
        else if (k === 'love') { s.textContent = '❤️'; }
        else if (k === 'lasers') { s.style.top = G.rnd(5, 90) + '%'; s.style.background = `linear-gradient(90deg,transparent,hsl(${G.rnd(0, 360)},100%,60%),transparent)`; s.style.animationDelay = (i * 0.25) + 's'; }
        else if (k === 'fireworks') { s.textContent = G.pick(['🎆', '🎇', '✨']); s.style.left = G.rnd(5, 85) + '%'; s.style.top = G.rnd(10, 60) + '%'; s.style.animationDelay = (i * 0.35) + 's'; s.style.fontSize = G.rnd(50, 90) + 'px'; }
        else { s.textContent = G.pick(['✨', '⭐', '🌟', '💫']); s.style.left = G.rnd(0, 95) + '%'; s.style.top = G.rnd(0, 95) + '%'; s.style.animationDelay = (Math.random() * 1.5) + 's'; }
        ov.appendChild(s);
    }
    document.body.appendChild(ov); setTimeout(() => ov.remove(), 3600);
}

/* ---------------- ⊕：照片 / 位置 / 报平安 / 稍后发送 / 贴纸 ---------------- */
M.plus = async id => {
    const t = thOf(id); const ops = [['📷 照片', 'pic'], ['🎵 分享一首歌', 'song'], ['🖼️ 共享相簿', 'album'], ['😊 拟我表情', 'memo'], ['🫶 贴纸', 'stk'], ['✍️ 手写', 'hand'], ['💓 数字触感', 'touch'], ['🎙️ 语音', 'rec'], ['💵 Apple Cash', 'cash'], ['📍 共享位置 / 请求位置', 'share'], ['📌 发送我现在的位置', 'loc'], ['🛡️ 报平安', 'ck'], ['🕒 稍后发送', 'sched'], ['🎮 小游戏', 'game']].filter(x => !(t.sms && ['memo', 'hand', 'touch', 'cash', 'share', 'game', 'song', 'album'].includes(x[1])));
    const i = await chooser(ops.map(x => x[0])); if (i == null) return; const k0 = ops[i][1];
    if (k0 === 'song') return M.song(id); if (k0 === 'album') return M.album(id);
    if (k0 === 'pic') G.pickImgs(4, L => { L.forEach(src => addMsg(t, { from: 'me', t: 'img', img: src })); G.repaint(APP); afterSend(t); });
    else if (k0 === 'loc') { const v = await G.input('你在哪？', G.prof(APP, 'me').loc || ''); if (!v) return; addMsg(t, { from: 'me', t: 'loc', text: X.plain(v).slice(0, 40) }); G.repaint(APP); afterSend(t); }
    else if (k0 === 'ck') M.checkin(id); else if (k0 === 'sched') M.sched(id); else if (k0 === 'memo') M.memoji(id); else if (k0 === 'hand') M.hand(id); else if (k0 === 'touch') M.touch(id); else if (k0 === 'rec') M.rec(id); else if (k0 === 'cash') M.cash(id); else if (k0 === 'share') M.share(id); else if (k0 === 'game') M.gamePick(id);
    else { const k = await chooser(STICK, '贴纸'); if (k == null) return; addMsg(t, { from: 'me', t: 'sticker', text: STICK[k] }); G.repaint(APP); afterSend(t); }
};
M.checkin = async id => {
    const t = thOf(id); const dest = await G.input('报平安：你要去哪？（比如：回家）', '回家'); if (!dest) return;
    const min = parseInt(await G.input('大概多少分钟到？', '30')); if (!min || min < 1) return;
    addMsg(t, { from: 'me', t: 'checkin', text: `去${dest}，预计 ${min} 分钟后到`, ck: { dest: X.plain(dest).slice(0, 20), due: Date.now() + min * 60e3, state: 'on' } });
    G.repaint(APP); X.toast('🛡️ 报平安开了', X.v('到了记得点「我到了」', '没按时到 TA 会知道'));
    afterSend(t);
};
M.arrive = (id, mid) => { const t = thOf(id), m = t && msgOf(t, mid); if (!m) return; m.ck.state = 'arrived'; m.ck.at = Date.now(); saveD(); G.repaint(APP); if (t.kind === 'dm') taReply(t, `她刚点了「报平安」：已经平安到${m.ck.dest}`); };
M.ckAdd = (id, mid) => { const t = thOf(id), m = t && msgOf(t, mid); if (!m) return; m.ck.due = Math.max(m.ck.due, Date.now()) + 15 * 60e3; m.ck.state = 'on'; m.ck.warned = 0; saveD(); G.repaint(APP); X.toast('⏳ 加了 15 分钟', ''); };
M.ckEnd = (id, mid) => { const t = thOf(id), m = t && msgOf(t, mid); if (!m) return; m.ck.state = 'cancel'; saveD(); G.repaint(APP); };
function ckTick() {
    Object.values(D.th).forEach(t => t.msgs.forEach(m => {
        if (m.t !== 'checkin' || !m.ck) return;
        if (m.from === 'me' && m.ck.state === 'on' && Date.now() > m.ck.due + 5 * 60e3) { m.ck.state = 'late'; saveD(); G.repaint(APP); if (t.kind === 'dm') taReply(t, `她的「报平安」超时了：说好 ${G.hm(m.ck.due)} 到${m.ck.dest}，现在还没到，你会担心`); else groupReply(t, `${G.meName()}的报平安超时了，还没到${m.ck.dest}`); }
        if (m.from !== 'me' && m.ck.state === 'on' && Date.now() > m.ck.due) { m.ck.state = 'arrived'; m.ck.at = Date.now(); saveD(); G.repaint(APP); const c = charOfW(m.from); G.notify(APP, c || null, `🛡️ <b>${X.esc(nameOf(m.from))}</b> 已平安到达${X.esc(m.ck.dest)}`, '', X.go('gysImsgOpenThread', t.id)); }
    }));
}
M.sched = async id => {
    const t = thOf(id); const tx = await G.input('稍后发送：写好要发的话', ''); if (!tx) return;
    const min = parseInt(await G.input('多少分钟以后发？', '60')); if (!min || min < 1) return;
    (t.sched = t.sched || []).push({ id: G.uid('s'), text: X.plain(tx).slice(0, 1000), at: Date.now() + min * 60e3 }); saveD(); G.repaint(APP); X.toast('🕒 好的', `${min} 分钟后发出去（谷雨要开着）`);
};
M.unsched = (id, sid) => { const t = thOf(id); t.sched = (t.sched || []).filter(s => s.id !== sid); saveD(); G.repaint(APP); };
function schedTick() { Object.values(D.th).forEach(t => { const due = (t.sched || []).filter(s => s.at <= Date.now()); if (!due.length) return; t.sched = t.sched.filter(s => s.at > Date.now()); due.forEach(s => addMsg(t, { from: 'me', text: s.text, at: Date.now() })); saveD(); G.repaint(APP); afterSend(t); }); }

/* ---------------- 名片 / 群信息 ---------------- */
M.info = id => {
    const t = thOf(id); if (!t) return;
    if (t.kind === 'group') return G.push(APP, { title: '群聊信息', html: () => `<div class="im-card">${thAv(t, 90)}<h3>${esc(thName(t))}</h3><div class="im-cbtns"><span onclick="gysIm.gEdit('${id}')">✏️<em>改名 / 头像</em></span></div></div>
      <div class="im-sech">${t.members.length + 1} 位成员</div>${t.members.map(w => `<div class="im-urow" onclick="gysIm.card('${w}')">${G.av(APP, w, 36)}<b>${esc(nameOf(w))}</b><span>›</span></div>`).join('')}<div class="im-urow"><span class="gys-av e" style="width:36px;height:36px;background:#8e8e93">我</span><b>我</b></div>
      <div class="im-list"><div onclick="gysIm.gAdd('${id}')">＋ 添加成员</div><div onclick="gysIm.toggle('${id}','mute')">${t.mute ? '🔔 取消隐藏提醒' : '🔕 隐藏提醒'}</div><div class="red" onclick="gysIm.leave('${id}')">离开此对话</div></div>` });
    M.card(t.who);
};
M.card = w => {
    G.push(APP, { id: 'card_' + w, title: '', html: () => { const p = G.prof(APP, w), c = charOfW(w); return `<div class="im-card">${G.av(APP, w, 96)}<h3>${esc(nameOf(w))}</h3>
      <div class="im-cbtns"><span onclick="gysIm.open('${dmOf(w).id}')">💬<em>信息</em></span>${c && typeof window.gyCallStart === 'function' ? `<span onclick="gysIm.call('${w}')">📞<em>电话</em></span><span onclick="gysIm.ftMenu('${w}')">📹<em>FaceTime</em></span>` : ''}</div>${c ? `<div class="im-crow" onclick="gysIm.album('${dmOf(w).id}')"><small>🖼️ 共享相簿</small><b>${((dmOf(w).album) || []).length} 张 ›</b></div>` : ''}</div>
      <div class="im-list"><div><small>手机</small><b>${esc(phoneOf(w))}</b></div>${p.bio ? `<div><small>备注</small><b>${esc(p.bio)}</b></div>` : ''}
        ${c ? `<div onclick="gysIm.callMe('${w}')"><small>TA 手机里给你存的名字</small><b>${p.callMe ? esc(p.callMe) : BUSY['cm' + w] ? '⏳ 偷看中…' : '👀 点一下偷看'}</b></div>` : ''}
        ${G.linksOf(APP, w).map(([k, h]) => `<div><small>${G.APPS[k].ico} ${G.APPS[k].n}</small><b>${esc(h)}</b></div>`).join('')}</div>
      <div class="im-list"><div onclick="gysIm.smsTog('${w}')">${(D.th[w] || {}).sms ? '💬 改回 iMessage' : '🟢 以短信发送（绿色气泡）'}</div><div onclick="gysIm.rrTog('${w}')">TA 的已读回执：${rrTa(w) ? '开着（你能看到「已读」）' : '关着（只显示「已送达」）'}</div><div onclick="gysIm.editCard('${w}')">✏️ 编辑联系人（名字、照片、手机号、备注）</div></div>`; } });
};
M.smsTog = w => { const t = dmOf(w); t.sms = !t.sms; addMsg(t, { from: 'sys', text: t.sms ? '以后用短信发送' : '已改回 iMessage' }); G.repaint(APP); };
M.rrTog = w => { const p = G.prof(APP, w); p.rr = !rrTa(w); G.save(); G.repaint(APP); };
M.editCard = w => G.editProf(APP, w, [['phone', '手机号', '+86 1xx xxxx xxxx'], ['callMe', 'TA 给你存的名字', '比如：❤️小雨']]);
M.call = w => { const c = charOfW(w); if (c && typeof window.gyCallStart === 'function') { G.close(APP); window.gyCallStart(c.id); } };
M.callMe = async w => {
    const c = charOfW(w), p = G.prof(APP, w); if (!c || BUSY['cm' + w]) return;
    if (p.callMe && !(await G.confirm(`现在存的是「${p.callMe}」。让 TA 重新想一个？`))) return;
    BUSY['cm' + w] = 1; G.repaint(APP);
    try { const r = X.plain(await X.ask(`${X.who(c)}\n你手机通讯录里，给${X.me(c)}存的名字（备注）是什么？按你的性格和你们的关系，可以是名字、昵称、一个 emoji、一句只有你懂的话。只写那个备注名。`) || '').slice(0, 20); if (r) { p.callMe = r; G.save(); } } finally { BUSY['cm' + w] = 0; G.repaint(APP); }
};
M.gEdit = async id => { const t = thOf(id); const i = await chooser(['✏️ 改群名', '🖼️ 换群头像（能裁剪）', '去掉群头像']); if (i == null) return; if (i === 0) { const n = await G.input('群名称', t.name); if (n !== null && n !== undefined) { t.name = X.plain(n).slice(0, 20); addMsg(t, { from: 'sys', text: `你将群名称改为「${t.name || '（无）'}」` }); } } else if (i === 1) G.pickImg(1, url => { t.photo = url; addMsg(t, { from: 'sys', text: '你更改了群照片' }); G.repaint(APP); }); else t.photo = ''; saveD(); G.repaint(APP); };
M.gAdd = async id => { const t = thOf(id); const L = cast().filter(w => !t.members.includes(w)); const i = await chooser(L.map(nameOf), '加谁？'); if (i == null) return; t.members.push(L[i]); addMsg(t, { from: 'sys', text: `你将「${nameOf(L[i])}」加入了对话` }); G.repaint(APP); };
M.toggle = (id, k) => { const t = thOf(id); t[k] = !t[k]; saveD(); G.repaint(APP); };
M.leave = async id => { if (!(await G.confirm('离开这个群聊？（聊天记录会删掉）'))) return; delete D.th[id]; saveD(); G.back(APP); G.back(APP); };

/* ---------------- 📝 文字：格式（粗斜下划删除）、动态文字、链接预览 ---------------- */
const TFX = [['big', '大'], ['small', '小'], ['shake', '抖动'], ['nod', '点头'], ['explode', '爆炸'], ['ripple', '涟漪'], ['bloom', '绽放'], ['jitter', '摇摆']];
const TFXN = Object.fromEntries(TFX);
const MORE = ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '😍', '🥰', '😘', '😂', '🤣', '😭', '🥺', '😳', '😡', '😱', '🤯', '🙄', '😴', '🤔', '🫠', '🫡', '👏', '🙏', '💪', '👀', '🔥', '✨', '🎉', '💯', '🌹', '🍓', '☕', '🍻', '🐶', '🐱', '💀', '🤡'];
const MEMO = ['😍', '😂', '😘', '🥺', '😡', '😴', '🤔', '😎', '🥳', '😭', '🙄', '😳', '🤗', '😏', '🫶', '👋'];
function fmtHtml(m) {
    let h = esc(m.text || '');
    h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/__(.+?)__/g, '<u>$1</u>').replace(/~~(.+?)~~/g, '<s>$1</s>').replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<i>$2</i>');
    h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" class="im-a" onclick="event.stopPropagation()">$1</a>');
    if (m.tfx && ['shake', 'nod', 'ripple', 'jitter', 'explode', 'bloom'].includes(m.tfx) && !/<a /.test(h)) { let i = 0; h = h.replace(/(<[^>]+>)|([^<])/g, (x, tag, ch) => tag ? tag : `<span class="tc" style="--i:${i++}">${ch === ' ' ? '&nbsp;' : ch}</span>`); }
    return h;
}
function linkCard(m) {
    const u = (String(m.text || '').match(/https?:\/\/[^\s]+/) || [])[0]; if (!u) return '';
    let host = u, path = ''; try { const x = new URL(u); host = x.hostname.replace(/^www\./, ''); path = (x.pathname + x.search).slice(0, 40); } catch (e) {}
    return `<a class="im-link" href="${esc(u)}" target="_blank" rel="noopener"><span style="background:${bg(host)}">${esc(host[0] || '🔗').toUpperCase()}</span><div><b>${esc(host)}</b><small>${esc(path || u)}</small></div></a>`;
}
let FMT = {};
M.fmtMenu = id => {
    const f = FMT[id] = FMT[id] || {};
    const d = document.createElement('div'); d.className = 'im-sheet';
    const draw = () => `<div class="im-sheet-in"><div class="im-sheet-g im-fmt"><p>文字格式（整条消息）· 也可以直接打 **粗** *斜* __下划线__ ~~删除~~</p><div class="im-fmtb">${[['b', '<b>B</b>'], ['i', '<i>I</i>'], ['u', '<u>U</u>'], ['s', '<s>S</s>']].map(([k, n]) => `<span data-f="${k}" class="${f[k] ? 'on' : ''}">${n}</span>`).join('')}</div><p>动态文字</p><div class="im-fmtx">${[['', '无']].concat(TFX).map(([k, n]) => `<span data-t="${k}" class="${(f.tfx || '') === k ? 'on' : ''}">${n}</span>`).join('')}</div></div><div class="im-sheet-g"><div data-x="1" class="c">完成</div></div></div>`;
    d.innerHTML = draw();
    d.onclick = e => { const el = e.target.closest('[data-f],[data-t],[data-x]'); if (!el && e.target !== d) return; if (!el || el.getAttribute('data-x')) { d.remove(); G.repaint(APP); return; } if (el.getAttribute('data-f')) { const k = el.getAttribute('data-f'); f[k] = !f[k]; } else f.tfx = el.getAttribute('data-t'); d.innerHTML = draw(); };
    document.body.appendChild(d);
};
M.__typing = el => { const p = el.closest('.im-pill'); if (p) p.classList.toggle('has', !!el.value.trim()); };

/* ---------------- 🎙️ 语音 ---------------- */
let REC = null;
M.rec = async id => {
    if (REC) return; const t = thOf(id); if (!t) return;
    const d = document.createElement('div'); d.className = 'im-rec';
    d.innerHTML = `<div class="im-recb"><i class="im-rdot"></i><b id="imRecT">0:00</b><span class="im-rwave">${'<i></i>'.repeat(24)}</span></div><p id="imRecTx">正在录音…（说完点发送）</p><div class="im-recbt"><span onclick="gysIm.recStop(false)">取消</span><span class="b" onclick="gysIm.recStop(true)">↑ 发送</span></div>`;
    document.body.appendChild(d);
    REC = { id, d, chunks: [], text: '', t0: Date.now() };
    try { REC.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); REC.mr = new MediaRecorder(REC.stream); REC.mr.ondataavailable = e => { if (e.data && e.data.size) REC.chunks.push(e.data); }; REC.mr.start(); }
    catch (e) { REC.err = 1; const p = document.getElementById('imRecTx'); if (p) p.textContent = '没拿到麦克风——点发送以后打字告诉 TA 你说了什么'; }
    try { const C = window.SpeechRecognition || window.webkitSpeechRecognition; if (C && !REC.err) { const r = new C(); r.lang = 'zh-CN'; r.continuous = true; r.interimResults = true; r.onresult = ev => { let s = ''; for (let i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript; if (REC) { REC.text = s; const p = document.getElementById('imRecTx'); if (p) p.textContent = s; } }; r.start(); REC.sr = r; } } catch (e) {}
    REC.tm = setInterval(() => { const el = document.getElementById('imRecT'); if (el && REC) { const s = Math.round((Date.now() - REC.t0) / 1000); el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); } }, 300);
};
M.recStop = async send => {
    const R0 = REC; if (!R0) return; REC = null; clearInterval(R0.tm); try { R0.sr && R0.sr.stop(); } catch (e) {}
    const blob = await new Promise(res => { if (!R0.mr || R0.mr.state === 'inactive') return res(null); R0.mr.onstop = () => res(R0.chunks.length ? new Blob(R0.chunks, { type: R0.chunks[0].type || 'audio/webm' }) : null); R0.mr.stop(); });
    try { R0.stream && R0.stream.getTracks().forEach(x => x.stop()); } catch (e) {}
    R0.d.remove(); if (!send) return;
    const sec = Math.max(1, Math.round((Date.now() - R0.t0) / 1000));
    await sleep(300);
    let text = R0.text || ''; if (!text) text = await G.input('转写成文字（TA 会听到的内容）', '') || '';
    if (!text.trim() && !blob) return;
    let src = ''; if (blob && blob.size < 1.6e6) src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(''); fr.readAsDataURL(blob); });
    const t = thOf(R0.id); addMsg(t, { from: 'me', t: 'voice', src, sec, text: X.plain(text).slice(0, 500) }); G.repaint(APP); afterSend(t);
};
let PLAYING = null;
M.play = (id, mid) => {
    const t = thOf(id), m = t && msgOf(t, mid); if (!m) return;
    try { if (PLAYING) { PLAYING.pause && PLAYING.pause(); } speechSynthesis.cancel(); } catch (e) {}
    const el = document.querySelector(`#gys_imsg [data-mid="${mid}"]`); if (el) { el.classList.add('playing'); setTimeout(() => el.classList.remove('playing'), (m.sec || 5) * 1000); }
    m.played = 1; saveD();
    if (m.src) { const a = new Audio(m.src); PLAYING = a; a.play().catch(() => {}); return; }
    const c = charOfW(m.from);
    if (c && typeof window.gyVoiceSpeak === 'function') { window.gyVoiceSpeak(c.id, m.text); return; }
    try { const u = new SpeechSynthesisUtterance(m.text); u.lang = 'zh-CN'; speechSynthesis.speak(u); } catch (e) {}
};
const wave = (m, n) => { let h = 0; for (const ch of String(m.id)) h = (h * 17 + ch.charCodeAt(0)) % 997; return Array.from({ length: n }, (_, i) => `<i style="height:${4 + ((h * (i + 3)) % 14)}px"></i>`).join(''); };
const durS = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

/* ---------------- 😊 拟我表情 · ✍️ 手写 · 💓 数字触感 ---------------- */
M.memoji = async id => { const k = await chooser(MEMO.map(e => e + ' 拟我表情'), '拟我表情（用你的头像做的表情贴纸）'); if (k == null) return; const t = thOf(id); addMsg(t, { from: 'me', t: 'memoji', face: MEMO[k] }); G.repaint(APP); afterSend(t); };
function padView(id, kind) {
    const S0 = { strokes: [], ev: [], color: kind === 'touch' ? '#ff375f' : '#111', t0: Date.now() };
    G.push(APP, { id: 'pad_' + id, title: kind === 'touch' ? '数字触感' : '手写', cls: kind === 'touch' ? 'im-padb dark' : 'im-padb', html: () => `<div class="im-pad ${kind}"><canvas id="imPad"></canvas>${kind === 'touch' ? '<p>画画、点一下是「轻点」，或者直接发心跳</p>' : '<p>用手指（或鼠标）写字</p>'}</div>
      <div class="im-padt">${kind === 'touch' ? ['#ff375f', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#bf5af2', '#ffffff'].map(c => `<i style="background:${c}" onclick="gysIm.__pc('${c}')"></i>`).join('') + '<span onclick="gysIm.__heart(\'' + id + '\')">💓 心跳</span>' : '<span onclick="gysIm.__undo()">↶ 撤销</span><span onclick="gysIm.__clr()">清除</span>'}<span class="b" onclick="gysIm.__padSend('${id}','${kind}')">发送</span></div>`,
        after: r => {
            const cv = r.querySelector('#imPad'); if (!cv || cv.__ok) return; cv.__ok = 1;
            const box = cv.parentNode.getBoundingClientRect(); cv.width = Math.round(box.width); cv.height = Math.round(Math.min(box.width * (kind === 'touch' ? 1 : 0.62), 420));
            const g = cv.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
            const redraw = () => { g.clearRect(0, 0, cv.width, cv.height); S0.strokes.forEach(s => { g.strokeStyle = s.c; g.lineWidth = kind === 'touch' ? 5 : 3.2; g.beginPath(); s.p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }); };
            S0.redraw = redraw;
            let cur = null, moved = 0;
            const pos = e => { const b = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; return [Math.round(p.clientX - b.left), Math.round(p.clientY - b.top)]; };
            const down = e => { e.preventDefault(); cur = { c: S0.color, p: [pos(e)], at: Date.now() - S0.t0 }; moved = 0; };
            const move = e => { if (!cur) return; e.preventDefault(); const p = pos(e), l = cur.p[cur.p.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 2) { cur.p.push(p); moved++; S0.strokes.indexOf(cur) < 0 && S0.strokes.push(cur); redraw(); } };
            const up = () => { if (!cur) return; if (!moved && kind === 'touch') { S0.ev.push({ k: 'tap', x: cur.p[0][0], y: cur.p[0][1], c: cur.c, at: cur.at }); g.fillStyle = cur.c; g.globalAlpha = .6; g.beginPath(); g.arc(cur.p[0][0], cur.p[0][1], 18, 0, 7); g.fill(); g.globalAlpha = 1; } cur = null; };
            cv.addEventListener('mousedown', down); cv.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
            cv.addEventListener('touchstart', down, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', up);
        } });
    M.__pc = c => { S0.color = c; }; M.__undo = () => { S0.strokes.pop(); S0.redraw && S0.redraw(); }; M.__clr = () => { S0.strokes = []; S0.ev = []; S0.redraw && S0.redraw(); };
    M.__padS = S0;
}
M.hand = id => padView(id, 'hand');
M.touch = id => padView(id, 'touch');
M.__heart = id => { const t = thOf(id); G.back(APP); addMsg(t, { from: 'me', t: 'touch', kind: 'heart' }); G.repaint(APP); afterSend(t); };
M.__padSend = (id, kind) => {
    const S0 = M.__padS, cv = document.getElementById('imPad'); if (!S0 || !cv) return;
    if (!S0.strokes.length && !S0.ev.length) return X.toast(kind === 'touch' ? '画点什么或者点一下' : '写点什么吧', '');
    const st = S0.strokes.map(s => ({ c: s.c, d: 'M' + s.p.map(p => p.join(' ')).join(' L'), at: s.at }));
    const t = thOf(id); G.back(APP);
    addMsg(t, kind === 'touch' ? { from: 'me', t: 'touch', kind: 'draw', strokes: st, ev: S0.ev, w: cv.width, h: cv.height } : { from: 'me', t: 'hand', strokes: st, w: cv.width, h: cv.height });
    G.repaint(APP); afterSend(t);
};
function handHtml(m) {
    if (m.text) return `<div class="im-hand txt" data-mid="${m.id}"><span>${esc(m.text)}</span></div>`;
    return `<div class="im-hand" data-mid="${m.id}"><svg viewBox="0 0 ${m.w} ${m.h}">${(m.strokes || []).map((s, i) => `<path d="${s.d}" pathLength="1" style="animation-delay:${(i * 0.35).toFixed(2)}s"/>`).join('')}</svg></div>`;
}
function touchHtml(m) {
    if (m.kind === 'heart') return `<div class="im-touch" data-mid="${m.id}"><span class="im-heart">❤️</span><em>心跳</em></div>`;
    return `<div class="im-touch" data-mid="${m.id}"><svg viewBox="0 0 ${m.w} ${m.h}">${(m.strokes || []).map((s, i) => `<path d="${s.d}" pathLength="1" stroke="${s.c}" style="animation-delay:${(i * 0.4).toFixed(2)}s"/>`).join('')}${(m.ev || []).map((e, i) => `<circle cx="${e.x}" cy="${e.y}" r="22" fill="${e.c}" style="animation-delay:${(0.2 + i * 0.3).toFixed(2)}s"/>`).join('')}</svg></div>`;
}

/* ---------------- 💵 Apple Cash · 📍 共享位置 ---------------- */
const wallet = () => window.gyWallet || null;
/* ---------------- 🎵 歌卡 ---------------- */
const songColor = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h},62%,55%)`; };
function songHtml(m) { const c = songColor(m.title || ''); return `<div class="im-song" data-mid="${m.id}"><span class="im-songcov" style="background:linear-gradient(135deg,${c},${songColor((m.artist || '') + 'x')})">🎵</span><div class="im-songi"><b>${esc(m.title || '')}</b><small>${esc(m.artist || '')}</small><i>Apple Music</i></div><span class="im-songp">▶︎</span></div>`; }
M.song = async id => { const t = thOf(id) || dmOf(id); const title = await G.input('歌名', ''); if (!title) return; const artist = await G.input('歌手（可空）', '') || ''; addMsg(t, { from: 'me', t: 'song', title: X.plain(title).slice(0, 60), artist: X.plain(artist).slice(0, 40) }); G.repaint(APP); afterSend(t); };
/* ---------------- 🔗 别的软件分享过来的卡片（255） ---------------- */
function postHtml(m) {
    const c = m.card || {}, A = G.APPS[c.app] || { n: '链接', ico: '🔗' }, img = c.img ? `<span class="im-pcimg" style="background-image:url('${c.img}')"></span>` : '';
    return `<div class="im-pc" data-mid="${m.id}" onclick="gysIm.openCard('${m.id}')">${img}<div class="im-pci"><b>${esc(c.title || String(c.text || '').slice(0, 40) || A.n)}</b>${c.title && c.text ? `<p>${esc(String(c.text).slice(0, 70))}</p>` : ''}<small><span class="gys-ai-${esc(c.app || 'x')}">${A.ico}</span>${esc(A.n)}${c.kind ? ' · ' + esc(c.kind) : ''}${c.byName ? ' · @' + esc(c.byName) : ''}</small></div></div>`;
}
M.openCard = mid => {
    let m = null; Object.values(D.th).some(t => (m = msgOf(t, mid)));
    const go = m && m.card && m.card.go;
    if (!go || typeof window[go.fn] !== 'function') return X.toast(X.v('打不开', '这个软件没装 / 关着', '找不到原帖了'), X.v('可能被删了，或者那个软件没开', '去插件开关中心看看'));
    G.close(APP); G.runGo(go);
};
// 别的软件调：把卡片发进和 who 的会话。from='me' 是你发的（TA 会看了回你）；from=TA 是 TA 转给你的
M.shareIn = (who, card, note, from) => {
    const t = dmOf(who); from = from || 'me';
    const c = Object.assign({}, card, { img: G.cardImg(card.img), text: String(card.text || '').slice(0, 400), title: String(card.title || '').slice(0, 60) });
    if (from === 'me') { addMsg(t, { from, t: 'post', card: c }); if (note) addMsg(t, { from, text: X.plain(note).slice(0, 500) }); G.repaint(APP); afterSend(t); }
    else { addMsg(t, { from, t: 'post', card: c }); if (note) addMsg(t, { from, text: X.plain(note).slice(0, 500) }); if (!isViewing(t.id)) t.unread = (t.unread || 0) + 1; saveD(); G.repaint(APP); }
    return t;
};
async function taSharePost(c) {
    const L = G.feedCards(8, 'c:' + c.id); if (!L.length) return null;
    const lines = L.map((x, i) => `${i + 1}. ${G.cardText(x)}${x.by === 'me' ? '（她自己发的）' : ''}`).join('\n');
    const o = X.json(await X.ask(P('im.post', DEF_POST, { 我是谁: X.who(c), 刷到的: lines, 平时: X.recent(c, 6) || '（最近没怎么聊）' })));
    const k = o && Number(o.i); if (!k || !L[k - 1]) return null;
    const say = (Array.isArray(o.say) ? o.say : [o.say]).map(x => X.plain(x || '').slice(0, 300)).filter(Boolean).slice(0, 2);
    const t = M.shareIn('c:' + c.id, L[k - 1], say[0] || '', 'c:' + c.id);
    if (say[1]) { addMsg(t, { from: 'c:' + c.id, text: say[1] }); if (!isViewing(t.id)) t.unread++; saveD(); }
    return { t, card: L[k - 1], say: say[0] || '' };
}
M.__sharePost = taSharePost;
/* ---------------- 🖼️ 共享相簿 ---------------- */
M.album = id => { const t = thOf(id) || dmOf(id); t.album = t.album || []; G.push(APP, { id: 'album_' + id, title: '共享相簿', right: `<span onclick="gysIm.albumAdd('${id}')">＋</span>`, html: () => `<div class="im-albtip">你和 ${esc(thName(t))} 的共享相簿，两个人都能往里加照片。</div>${(t.album || []).length ? `<div class="im-albgrid">${t.album.slice().reverse().map(a => a.img ? `<div class="im-albc" style="background-image:url('${a.img}')" onclick="GYS.imgView('${a.img}')"></div>` : `<div class="im-albc t" style="background:${bg(a.desc)}"><em>${esc(a.desc || '照片')}</em></div>`).join('')}</div>` : '<div class="gys-empty">还没有照片，点右上角 ＋ 加一张</div>'}` }); };
M.albumAdd = async id => { const t = thOf(id); t.album = t.album || []; const i = await chooser(['📷 选张照片', '✏️ 用文字描述一张']); if (i == null) return; if (i === 0) { G.pickImgs(4, L => { L.forEach(src => t.album.push({ by: 'me', img: src, at: Date.now() })); saveD(); G.repaint(APP); }); } else { const d = await G.input('这张照片是什么？', ''); if (!d) return; t.album.push({ by: 'me', desc: X.plain(d).slice(0, 60), at: Date.now() }); saveD(); G.repaint(APP); } };
/* ---------------- 📹 FaceTime 增强 ---------------- */
M.ftMenu = async w => { const i = await chooser(['📞 语音通话', '📹 FaceTime 视频', '📹 让 TA 给你留个 FaceTime 留言'], 'FaceTime'); if (i == null) return; if (i < 2) M.call(w); else M.ftLeave(w); };
M.ftLeave = async w => { const c = charOfW(w); if (!c || BUSY['ft' + w]) return; BUSY['ft' + w] = 1; try { const txt = X.plain(await X.ask(`${X.who(c)}\n她给你打 FaceTime 没接到，你对着镜头留了一段 FaceTime 视频留言。写你会说的那几句（像平时说话，别太长）。只写那段话。`) || ''); if (txt) { const t = dmOf(w); addMsg(t, { from: 'c:' + c.id, t: 'ftmsg', text: txt.slice(0, 300) }); G.back(APP); M.open(t.id); } } finally { delete BUSY['ft' + w]; } };
M.cash = async id => {
    const t = thOf(id); if (t.kind !== 'dm') return X.toast('Apple Cash 只能一对一发', '');
    const a = parseFloat(await G.input('Apple Cash：给 ' + nameOf(t.who) + ' 转多少钱？', '52.0')); if (!a || a <= 0) return;
    const note = await G.input('备注（可以不写）', '') || '';
    const W = wallet(); if (W && W.spend) { try { await W.spend('me', a, 'Apple Cash 转给' + nameOf(t.who)); } catch (e) {} }
    addMsg(t, { from: 'me', t: 'cash', amt: Math.round(a * 100) / 100, note: X.plain(note).slice(0, 40), cst: 'pending' }); G.repaint(APP); afterSend(t);
};
M.cashTake = async (id, mid, yes) => {
    const t = thOf(id), m = t && msgOf(t, mid); if (!m || m.cst !== 'pending' || m.from === 'me') return;
    m.cst = yes ? 'accepted' : 'declined'; saveD(); G.repaint(APP);
    const W = wallet(), c = charOfW(m.from);
    if (yes && W && W.earn) { try { await W.earn('me', m.amt, 'Apple Cash 来自' + nameOf(m.from)); } catch (e) {} }
    if (!yes && W && W.earn && c) { try { await W.earn(c.id, m.amt, 'Apple Cash 被退回'); } catch (e) {} }
    X.toast(yes ? '💵 收下了 ¥' + m.amt : '退回了', yes && !W ? '（钱包没开，只是记一下）' : '');
    if (t.kind === 'dm') taReply(t, yes ? `她收下了你转的 ¥${m.amt}` : `她把你转的 ¥${m.amt} 退回来了`);
};
function cashHtml(t, m) {
    const me = m.from === 'me', st = { pending: me ? '等待对方接受' : '待接受', accepted: '已接受', declined: '已退回' }[m.cst] || '';
    return `<div class="im-cash" data-mid="${m.id}"><div class="im-cash-h"><b>Cash</b><span>Apple</span></div><div class="im-cash-a">¥${Number(m.amt).toFixed(2)}</div>${m.note ? `<p>${esc(m.note)}</p>` : ''}<small>${st}</small>${!me && m.cst === 'pending' ? `<div class="im-ckb"><span onclick="gysIm.cashTake('${t.id}','${m.id}',1)">接受</span><span onclick="gysIm.cashTake('${t.id}','${m.id}',0)">退回</span></div>` : ''}</div>`;
}
M.share = async id => {
    const t = thOf(id); const i = await chooser(['共享一小时', '共享到今天结束', '无限期共享', '📍 请求对方的位置'], '共享我的位置'); if (i == null) return;
    if (i === 3) { if (t.kind !== 'dm') return; addMsg(t, { from: 'me', t: 'locreq' }); G.repaint(APP); afterSend(t); return; }
    const until = i === 0 ? Date.now() + 3600e3 : i === 1 ? new Date().setHours(23, 59, 59, 0) : 0;
    const place = G.prof(APP, 'me').loc || await G.input('你在哪？（共享位置会显示这个地方）', '') || '我这里';
    addMsg(t, { from: 'me', t: 'live', until, place: X.plain(place).slice(0, 30) }); G.repaint(APP); afterSend(t);
};
M.stopShare = (id, mid) => { const t = thOf(id), m = t && msgOf(t, mid); if (!m) return; m.until = Date.now() - 1; m.stopped = 1; saveD(); G.repaint(APP); };
const liveOn = m => !m.stopped && (!m.until || m.until > Date.now());
function placeOf(w) { const c = charOfW(w); return (c && (c.location || '')) || G.prof(APP, w).loc || '附近'; }
function liveHtml(t, m) {
    const me = m.from === 'me', on = liveOn(m), left = m.until ? Math.max(0, m.until - Date.now()) : 0;
    return `<div class="im-live" data-mid="${m.id}"><div class="im-lmap">${on ? `<span class="im-lpin">${G.av(APP, me ? 'me' : m.from, 34)}</span>` : '<i>📍</i>'}</div><b>${esc(me ? '我' : nameOf(m.from))}${on ? ' 正在共享位置' : ' 的位置'}</b><small>${esc(m.place || '')}${on ? (m.until ? ' · 还剩 ' + (left > 3600e3 ? Math.round(left / 3600e3) + ' 小时' : Math.max(1, Math.round(left / 60e3)) + ' 分钟') : ' · 无限期') : ' · 已停止共享'}</small>${me && on ? `<div class="im-ckb"><span onclick="gysIm.stopShare('${t.id}','${m.id}')">停止共享</span></div>` : ''}</div>`;
}

/* ---------------- 🎮 小游戏（对话里玩） ---------------- */
const GAMES = { ttt: '⭕️ 井字棋', c4: '🔴 四子棋', rps: '✊ 石头剪刀布', dice: '🎲 掷骰子比大小' };
M.gamePick = async id => {
    const t = thOf(id); const ks = Object.keys(GAMES); const i = await chooser(ks.map(k => GAMES[k]), '在对话里玩个小游戏'); if (i == null) return;
    const k = ks[i]; const m = addMsg(t, { from: 'me', t: 'game', kind: k, g: newGame(k), turn: 'me', win: '' }); G.repaint(APP); M.game(id, m.id);
};
function newGame(k) { return k === 'ttt' ? Array(9).fill('') : k === 'c4' ? Array(42).fill('') : {}; }
const opp = t => t.kind === 'dm' ? t.who : t.members[0];
function lineWin(b, n, w, h, need) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = b[y * w + x]; if (!v) continue; for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { let k = 1; while (k < need) { const xx = x + dx * k, yy = y + dy * k; if (xx < 0 || yy < 0 || xx >= w || yy >= h || b[yy * w + xx] !== v) break; k++; } if (k >= need) return v; } }
    return b.every(Boolean) ? 'draw' : '';
}
const winOf = m => m.kind === 'ttt' ? lineWin(m.g, 9, 3, 3, 3) : m.kind === 'c4' ? lineWin(m.g, 42, 7, 6, 4) : '';
function c4Drop(b, col, v) { for (let y = 5; y >= 0; y--) if (!b[y * 7 + col]) { b[y * 7 + col] = v; return true; } return false; }
function aiMove(m) {
    const me = 'me', ta = 'ta';
    if (m.kind === 'ttt') { const free = m.g.map((v, i) => v ? -1 : i).filter(i => i >= 0); const tryV = v => free.find(i => { const b = m.g.slice(); b[i] = v; return lineWin(b, 9, 3, 3, 3) === v; }); let i = tryV(ta); if (i == null) i = tryV(me); if (i == null && !m.g[4]) i = 4; if (i == null) i = G.pick(free); m.g[i] = ta; return; }
    if (m.kind === 'c4') { const cols = [0, 1, 2, 3, 4, 5, 6].filter(c => !m.g[c]); const tryV = v => cols.find(c => { const b = m.g.slice(); c4Drop(b, c, v); return lineWin(b, 42, 7, 6, 4) === v; }); let c = tryV(ta); if (c == null) c = tryV(me); if (c == null) c = cols.includes(3) && Math.random() < .5 ? 3 : G.pick(cols); c4Drop(m.g, c, ta); }
}
M.game = (id, mid) => {
    const t = thOf(id), m = t && msgOf(t, mid); if (!m) return; const who = opp(t);
    G.push(APP, { id: 'game_' + mid, title: GAMES[m.kind], cls: 'im-gameb', html: () => {
        const st = m.win ? (m.win === 'draw' ? '平局' : m.win === 'me' ? '🎉 你赢了' : nameOf(who) + ' 赢了') : m.turn === 'me' ? '轮到你' : nameOf(who) + ' 在想…';
        let board = '';
        if (m.kind === 'ttt') board = `<div class="im-ttt">${m.g.map((v, i) => `<span onclick="gysIm.mv('${id}','${mid}',${i})">${v === 'me' ? '✕' : v === 'ta' ? '◯' : ''}</span>`).join('')}</div>`;
        else if (m.kind === 'c4') board = `<div class="im-c4">${m.g.map((v, i) => `<span onclick="gysIm.mv('${id}','${mid}',${i % 7})"><i class="${v}"></i></span>`).join('')}</div>`;
        else if (m.kind === 'rps') board = m.g.me ? `<div class="im-rps"><div><b>${m.g.me}</b><em>你</em></div><span>VS</span><div><b>${m.g.ta}</b><em>${esc(nameOf(who))}</em></div></div>` : `<div class="im-rps pick">${['✊', '✌️', '🖐️'].map(x => `<b onclick="gysIm.mv('${id}','${mid}','${x}')">${x}</b>`).join('')}</div>`;
        else board = m.g.me ? `<div class="im-rps"><div><b>${m.g.me.map(n => DIE[n - 1]).join(' ')}</b><em>你 · ${m.g.me[0] + m.g.me[1]} 点</em></div><span>VS</span><div><b>${m.g.ta.map(n => DIE[n - 1]).join(' ')}</b><em>${esc(nameOf(who))} · ${m.g.ta[0] + m.g.ta[1]} 点</em></div></div>` : `<div class="im-rps pick"><b onclick="gysIm.mv('${id}','${mid}',0)">🎲 摇一摇</b></div>`;
        return `<div class="im-game"><div class="im-gst">${esc(st)}</div>${board}${m.win ? `<div class="gys-acts" style="justify-content:center"><span class="gys-btn" onclick="gysIm.again('${id}','${mid}')">再来一局</span></div>` : ''}</div>`;
    } });
};
const DIE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
M.mv = (id, mid, a) => {
    const t = thOf(id), m = t && msgOf(t, mid); if (!m || m.win || m.turn !== 'me') return;
    if (m.kind === 'ttt') { if (m.g[a]) return; m.g[a] = 'me'; }
    else if (m.kind === 'c4') { if (!c4Drop(m.g, a, 'me')) return; }
    else if (m.kind === 'rps') { const ta = G.pick(['✊', '✌️', '🖐️']), beat = { '✊': '✌️', '✌️': '🖐️', '🖐️': '✊' }; m.g = { me: a, ta }; m.win = a === ta ? 'draw' : beat[a] === ta ? 'me' : 'ta'; }
    else { const x = [G.rnd(1, 6), G.rnd(1, 6)], y = [G.rnd(1, 6), G.rnd(1, 6)]; m.g = { me: x, ta: y }; const s1 = x[0] + x[1], s2 = y[0] + y[1]; m.win = s1 === s2 ? 'draw' : s1 > s2 ? 'me' : 'ta'; }
    if (!m.win) m.win = winOf(m);
    if (!m.win && (m.kind === 'ttt' || m.kind === 'c4')) { m.turn = 'ta'; saveD(); G.repaint(APP); setTimeout(() => { aiMove(m); m.win = winOf(m); m.turn = 'me'; saveD(); G.repaint(APP); if (m.win) gameEnd(t, m); }, G.rnd(700, 1600)); return; }
    saveD(); G.repaint(APP); if (m.win) gameEnd(t, m);
};
function gameEnd(t, m) { if (t.kind === 'dm') taReply(t, `你们刚在 iMessage 里玩了一局${GAMES[m.kind]}，${m.win === 'draw' ? '平局' : m.win === 'me' ? '她赢了' : '你赢了'}`); }
M.again = (id, mid) => { const t = thOf(id), m = t && msgOf(t, mid); if (!m) return; G.back(APP); const n = addMsg(t, { from: 'me', t: 'game', kind: m.kind, g: newGame(m.kind), turn: 'me', win: '' }); G.repaint(APP); M.game(id, n.id); };
function gameHtml(t, m) { const who = opp(t); const st = m.win ? (m.win === 'draw' ? '平局' : m.win === 'me' ? '你赢了 🎉' : nameOf(who) + ' 赢了') : m.turn === 'me' ? '轮到你了' : '轮到 ' + nameOf(who); return `<div class="im-gcard" data-mid="${m.id}" onclick="gysIm.game('${t.id}','${m.id}')"><span>${GAMES[m.kind].split(' ')[0]}</span><div><b>${GAMES[m.kind].split(' ')[1]}</b><small>${esc(st)}</small></div><em>›</em></div>`; }

/* ---------------- 🗑️ 最近删除 · ⋯ 菜单 · 已读回执 · 短信 ---------------- */
M.listMenu = async () => {
    const tr = Object.keys(D.trash || {}).length;
    const ops = ['☾ 专注模式' + (D.focus ? '（' + focusName(D.focus) + '）' : ''), (D.cfg.rr === false ? '✓ 打开' : '✕ 关掉') + '「发送已读回执」', '🗑️ 最近删除' + (tr ? '（' + tr + '）' : ''), '🍎 苹果外观'];
    const i = await chooser(ops); if (i == null) return;
    if (i === 0) M.focusMenu(); else if (i === 1) { D.cfg.rr = D.cfg.rr === false; saveD(); X.toast(D.cfg.rr ? '对方能看到你「已读」了' : '已读回执关了', D.cfg.rr ? '' : 'TA 看不到你读没读'); } else if (i === 2) M.trash(); else G.uiPage(APP);
};
M.trash = () => G.push(APP, { title: '最近删除', html: () => { const L = Object.entries(D.trash || {}).sort((a, b) => b[1].at - a[1].at); return `<div class="im-tip">删掉的对话会在这里留 30 天，之后自动永久删除。</div>${L.map(([id, x]) => `<div class="im-row"><i class="im-dot off"></i>${thAv(x.t, 46)}<div><div class="im-rt"><b>${esc(thName(x.t))}</b><small>${Math.max(0, 30 - Math.floor((Date.now() - x.at) / 86400e3))} 天</small></div><em><a onclick="gysIm.restore('${id}')">恢复</a> · <a class="red" onclick="gysIm.purge('${id}')">永久删除</a></em></div></div>`).join('') || '<div class="gys-empty">没有最近删除的对话</div>'}`; } });
M.restore = id => { const x = (D.trash || {})[id]; if (!x) return; D.th[id] = x.t; delete D.trash[id]; saveD(); G.repaint(APP); X.toast('恢复了', ''); };
M.purge = async id => { if (!(await G.dialog({ title: '永久删除？', text: '删了就再也找不回来了', ok: '删除', danger: true }))) return; delete D.trash[id]; saveD(); G.repaint(APP); };
const rrTa = w => G.prof(APP, w).rr !== false;

/* ---------------- 外壳 ---------------- */
const STYLE = '- 这是 iPhone 的「信息」（iMessage）：nick 写用户手机通讯录里存这个人的名字（多半就是真名，熟的人可能是昵称）；bio 留空；不要认证、粉丝';
G.app(APP, { head, render: () => list(), onOpen: () => { schedTick(); } });
window.gysImsgOpen = () => G.open(APP);
window.gysImsgOpenThread = id => { G.open(APP); if (thOf(id)) M.open(id); };
setInterval(() => { try { if (X.on('gysImsg')) { ckTick(); schedTick(); } } catch (e) {} }, 30e3);
M.__tick = () => { ckTick(); schedTick(); };

/* ---------------- 谷雨这边 ---------------- */
X.mini({ id: 'gysImsg', icon: '💬', title: 'iMessage', desc: '苹果「信息」：单独的聊天、Tapback、撤回编辑、特效、报平安', cat: '软件', onOpen: () => G.open(APP) }, 'gysImsg');
const rare = (c, k, h) => Date.now() - ((D.last[k + c.id]) || 0) > h * 3600e3;
const mark = (c, k) => { D.last[k + c.id] = Date.now(); saveD(); };
X.action({ key: 'gys_im_text', label: '在 iMessage 上给她发几条', hint: '随手的：看到什么想到她、一张照片、一句到家了吗', need: c => rare(c, 't', 8) && !taFocus('c:' + c.id), run: async c => {
    mark(c, 't'); const t = dmOf('c:' + c.id);
    const o = X.json(await X.ask(P('im.text', DEF_TEXT, { 我是谁: X.who(c), 要求: D.focus ? `（她开着「${focusName(D.focus)}」，你的消息她可能晚点才看到）` : '', 平时: G.recentAll(c, APP), 记录: recLines(t, 'c:' + c.id, 8) })));
    if (!Array.isArray(o) || !o.length) return null;
    let first = null; o.slice(0, 4).forEach(x => { if (!x) return; const m = x.photo ? addMsg(t, { from: 'c:' + c.id, t: 'img', desc: X.plain(x.photo).slice(0, 30) }) : x.text ? addMsg(t, { from: 'c:' + c.id, text: X.plain(x.text).slice(0, 500), fx: FXN[x.fx] ? x.fx : '' }) : null; if (m && !first) first = m; if (m && !isViewing(t.id)) t.unread++; });
    if (!first) return null; saveD(); G.repaint(APP);
    if (!D.focus || D.focus === 'personal') G.notify(APP, c, `💬 <b>${X.esc(nameOf('c:' + c.id))}</b>`, first.t === 'img' ? '[照片]' : first.text, X.go('gysImsgOpenThread', t.id));
    return { text: '在 iMessage 上给她发了消息', selfNotified: true, jump: X.go('gysImsgOpenThread', t.id) };
} }, 'gysImsg');
X.action({ key: 'gys_im_reply', label: '回她在 iMessage 上发的消息', hint: '刚才没顾上 / 睡着了，现在回', need: c => { const t = D.th['c:' + c.id]; if (!t || BUSY[t.id] || taFocus(t.who) === 'sleep') return false; const l = lastReal(t); return !!(l && l.from === 'me' && Date.now() - l.at > 5 * 60e3); }, run: async c => { const t = D.th['c:' + c.id]; await taReply(t, '你刚才在忙 / 在睡觉，现在才看到她的消息'); return { text: '回了她的 iMessage', selfNotified: true }; } }, 'gysImsg');
X.action({ key: 'gys_im_checkin', label: '出门时在 iMessage 开「报平安」', hint: '让她知道你什么时候到', need: c => rare(c, 'ck', 48) && (() => { const h = new Date().getHours(); return h >= 7 && h <= 23; })(), run: async c => {
    mark(c, 'ck'); const t = dmOf('c:' + c.id);
    const dest = X.plain(await X.ask(`${X.who(c)}\n你现在要出门去一个地方（按你今天的安排和人设），用 iPhone 的「报平安」告诉她。只写你要去哪（几个字，比如：回家 / 公司 / 机场）。`) || '').slice(0, 12) || '回家';
    const min = G.rnd(20, 70); addMsg(t, { from: 'c:' + c.id, t: 'checkin', text: `去${dest}，预计 ${min} 分钟后到`, ck: { dest, due: Date.now() + min * 60e3, state: 'on' } });
    if (!isViewing(t.id)) t.unread++; saveD(); G.repaint(APP);
    G.notify(APP, c, `🛡️ <b>${X.esc(nameOf('c:' + c.id))}</b> 开启了报平安`, `去${dest}，预计 ${min} 分钟后到`, X.go('gysImsgOpenThread', t.id));
    return { text: `出门去${dest}，开了报平安`, selfNotified: true };
} }, 'gysImsg');
X.action({ key: 'gys_im_song', label: '在 iMessage 分享一首歌给她', hint: '听到一首想起她的歌', need: c => rare(c, 'sg', 48) && !taFocus('c:' + c.id), run: async c => { mark(c, 'sg'); const t = dmOf('c:' + c.id); const o = X.json(await X.ask(`${X.who(c)}\n你听到一首歌，想分享给她。只输出 JSON：{"title":"歌名","artist":"歌手","say":"附一句话（可空）"}`)); if (!o || !o.title) return null; if (o.say) addMsg(t, { from: 'c:' + c.id, t: 'text', text: X.plain(o.say).slice(0, 200) }); addMsg(t, { from: 'c:' + c.id, t: 'song', title: X.plain(o.title).slice(0, 60), artist: X.plain(o.artist || '').slice(0, 40) }); if (!isViewing(t.id) && !t.mute) G.notify(APP, c, `💬 <b>${X.esc(c.name)}</b> 分享了一首歌`, o.title, X.go('gysImsgOpenThread', t.id)); return { text: '在 iMessage 分享了一首歌：' + o.title, selfNotified: true }; } }, 'gysImsg');
X.action({ key: 'gys_im_post', label: '把刷到的微博 / 小红书 / 豆瓣转给她', hint: '「你看这个」——刷到跟她有关、好笑、想一起去的', need: c => G.shareOn() && rare(c, 'sp', 30) && !taFocus('c:' + c.id) && G.feedCards(3, 'c:' + c.id).length > 0, run: async c => { mark(c, 'sp'); const r = await taSharePost(c); if (!r) return null; G.repaint(APP); const A = G.APPS[r.card.app] || { n: '' }; if (!isViewing(r.t.id) && !r.t.mute) G.notify(APP, c, `💬 <b>${X.esc(c.name)}</b> 分享了一条${A.n}`, r.say || G.cardText(r.card).slice(0, 40), X.go('gysImsgOpenThread', r.t.id)); return { text: `在 iMessage 把一条${A.n}转给了她：` + G.cardText(r.card).slice(0, 60), selfNotified: true, jump: X.go('gysImsgOpenThread', r.t.id) }; } }, 'gysImsg');
X.action({ key: 'gys_im_album', label: '往你们的共享相簿加一张照片', hint: '拍到好看的 / 想一起存下来', need: c => { const t = D.th['c:' + c.id]; return !!t && (t.msgs || []).length > 3 && rare(c, 'al', 72); }, run: async c => { mark(c, 'al'); const t = dmOf('c:' + c.id); const d = X.plain(await X.ask(`${X.who(c)}\n你往你和她的「共享相簿」里加了一张照片（你拍的）。用一句话描述这张照片是什么。只写那句描述。`) || ''); if (!d) return null; t.album = t.album || []; t.album.push({ by: 'c:' + c.id, desc: d.slice(0, 60), at: Date.now() }); saveD(); if (!isViewing(t.id) && !t.mute) G.notify(APP, c, `🖼️ <b>${X.esc(c.name)}</b> 往共享相簿加了一张`, d.slice(0, 30), X.go('gysImsgOpenThread', t.id)); return { text: '往共享相簿加了一张照片：' + d, selfNotified: true }; } }, 'gysImsg');
X.action({ key: 'gys_im_group', label: '在 iMessage 群里聊几句', hint: '群里的人自己聊起来', need: c => Object.values(D.th).some(t => t.kind === 'group' && t.members.includes('c:' + c.id)) && rare(c, 'g', 24), run: async c => { mark(c, 'g'); const t = Object.values(D.th).find(t => t.kind === 'group' && t.members.includes('c:' + c.id)); await groupReply(t, `${c.name}先起个话头`); if (!isViewing(t.id) && !t.mute) G.notify(APP, c, `💬 <b>${X.esc(thName(t))}</b>`, '群里有新信息', X.go('gysImsgOpenThread', t.id)); return { text: '在 iMessage 群「' + thName(t) + '」里聊了几句', selfNotified: true }; } }, 'gysImsg');
X.today(() => { const d = X.day(); const rows = Object.values(D.th).map(t => { const L = t.msgs.filter(m => m.from !== 'sys' && X.day(new Date(m.at)) === d); return L.length ? { t: thName(t), x: `${L.length} 条 · ` + preview(t, L[L.length - 1]).slice(0, 26), go: X.go('gysImsgOpenThread', t.id) } : null; }).filter(Boolean); return rows.length ? { title: '💬 iMessage', rows: rows.slice(0, 4) } : null; }, 'gysImsg');
X.widget('gysImW', { n: 'iMessage', sizes: ['s', 'm'], tap: () => G.open(APP), r: () => { const t = Object.values(D.th).filter(t => t.msgs.length).sort((a, b) => b.at - a.at)[0]; const u = unreadAll(); return `<div style="padding:10px;font-size:12px;line-height:1.6"><b style="color:#34c759">💬 信息</b>${u ? ` <span style="background:#ff3b30;color:#fff;border-radius:9px;padding:0 6px">${u}</span>` : ''}<br>${t ? `${esc(thName(t))}：${esc(preview(t, t.msgs[t.msgs.length - 1])).slice(0, 30)}` : '还没有信息'}</div>`; } }, 'gysImsg');
X.mem({ k: 'gysIm', ico: '💬', n: 'TA 在 iMessage 说的', d: 'TA 在 iMessage 里发给你的消息（改了就是改内容，删了就没了）', items: c => (D.th['c:' + c.id] || { msgs: [] }).msgs.filter(m => m.from === 'c:' + c.id && m.t === 'text'), text: m => m.text, edit: (m, v) => { m.text = String(v).slice(0, 2000); }, del: (c, i) => { const t = D.th['c:' + c.id]; if (!t) return; const L = t.msgs.filter(m => m.from === 'c:' + c.id && m.t === 'text'); const m = L[i]; if (m) t.msgs = t.msgs.filter(x => x !== m); }, meta: m => dayStr(m.at) + (m.edited ? ' · 已编辑' : ''), save: () => saveD() }, 'gysImsg');
X.ctx(id => {
    const c = X.char(id); if (!c) return ''; const t = D.th['c:' + c.id]; if (!t || !t.msgs.length) return '';
    const L = t.msgs.filter(m => m.from !== 'sys').slice(-6).map(m => lineOf(t, m, 'c:' + c.id).slice(0, 80));
    return `【你们在 iMessage 上最近聊的（另一个软件，你记得）】\n${L.join('\n')}`;
}, 'gysImsg');
X.inj('gysImsg', [['你们在 iMessage 上最近聊的', 'iMessage：你们在苹果「信息」里最近的几条', '让 TA 在平时聊天时也记得 iMessage 里说过什么']]);

X.css('gys-imsg-css', `
.im-pc{display:flex;flex-direction:column;width:240px;border-radius:16px;overflow:hidden;background:#e9e9eb;cursor:pointer;margin:2px 0}body.dark-theme .im-pc{background:#26252a}
.im-pcimg{display:block;height:120px;background:#ccc center/cover no-repeat}
.im-pci{padding:9px 12px 10px}.im-pci b{display:block;font-size:14.5px;font-weight:600;line-height:1.3;max-height:2.6em;overflow:hidden}.im-pci p{margin:3px 0 0;font-size:13px;opacity:.75;line-height:1.35;max-height:2.7em;overflow:hidden}
.im-pci small{display:flex;align-items:center;gap:5px;margin-top:6px;font-size:12px;opacity:.6}.im-pci small span{width:16px;height:16px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:10px}
.gys-imsg{--gys-accent:#0a84ff;background:#fff;color:#000;font-family:-apple-system,"SF Pro Text","PingFang SC","Helvetica Neue",sans-serif}
body.dark-theme .gys-imsg{background:#000;color:#fff}
.gys-imsg .gys-hd{border-bottom:none;background:rgba(249,249,249,.94);backdrop-filter:blur(20px)}body.dark-theme .gys-imsg .gys-hd{background:rgba(22,22,22,.94)}
.gys-imsg .gys-bk,.gys-imsg .gys-hr span{color:#0a84ff}
.im-hd .im-edit{color:#0a84ff;font-size:17px;cursor:pointer;margin-left:4px}
.im-big{font-size:32px;font-weight:700;padding:4px 16px 8px;display:flex;align-items:baseline;gap:10px}.im-big small{font-size:13px;font-weight:500;color:#8e8e93}
.im-search{padding:0 16px 8px}.im-search input{width:100%;box-sizing:border-box;border:none;background:#eeeeef;border-radius:10px;padding:8px 10px;font-size:16px;color:inherit;outline:none}body.dark-theme .im-search input{background:#1c1c1e}
.im-pins{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:6px 16px 14px}.im-pins>div{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;position:relative}.im-pins b{font-size:12px;font-weight:400;color:#8e8e93;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.im-pins .im-dot{position:absolute;left:8px;top:6px}
.im-row{display:flex;align-items:center;gap:10px;padding:8px 12px 8px 4px;cursor:pointer;position:relative}.im-row>div{flex:1;min-width:0;border-bottom:.5px solid #e5e5ea;padding-bottom:10px}body.dark-theme .im-row>div{border-color:#2c2c2e}
.im-rt{display:flex;justify-content:space-between;align-items:baseline}.im-rt b{font-size:16px;font-weight:600}.im-rt small{font-size:14px;color:#8e8e93;white-space:nowrap}
.im-row em{display:block;font-style:normal;font-size:15px;color:#8e8e93;line-height:1.35;max-height:2.7em;overflow:hidden;margin-top:2px}
.im-dot{width:10px;height:10px;border-radius:50%;background:#0a84ff;flex-shrink:0;display:inline-block}.im-dot.off{background:transparent}
.im-mute{font-size:12px;color:#8e8e93}
.im-gav{display:inline-flex;position:relative;border-radius:50%;background:#e5e5ea;flex-shrink:0}.im-gav .gys-av{position:absolute;border:2px solid #fff}.im-gav .gys-av:first-child{left:0;top:0}.im-gav .gys-av:last-child{right:0;bottom:0}
.im-tip{text-align:center;font-size:12px;color:#c7c7cc;padding:16px}
.im-th{position:absolute;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;top:4px}.im-th span{font-size:11.5px;color:inherit}
.gys-imsg .gys-hd{min-height:60px}
.im-thb{background:#fff}body.dark-theme .im-thb{background:#000}
.im-thw{padding:8px 0 14px}
.im-head{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 0 8px}.im-head b{font-size:17px}.im-head small{font-size:12px;color:#8e8e93}
.im-time{text-align:center;font-size:11.5px;color:#8e8e93;margin:14px 0 6px;font-weight:500}
.im-sys{text-align:center;font-size:12px;color:#8e8e93;margin:6px 16px}
.im-gname{font-size:11.5px;color:#8e8e93;margin:6px 0 2px 52px}
.im-m{display:flex;padding:1px 12px;align-items:flex-end;gap:6px}.im-m.me{justify-content:flex-end}.im-m.tail{margin-bottom:6px}
.im-avsp{width:28px;flex-shrink:0}
.im-mc{max-width:74%;display:flex;flex-direction:column;position:relative}.im-m.me .im-mc{align-items:flex-end}.im-m.ta .im-mc{align-items:flex-start}
.im-b{padding:7px 12px;font-size:16.5px;line-height:1.35;border-radius:18px;white-space:pre-wrap;word-break:break-word;position:relative;cursor:default;-webkit-user-select:text;user-select:text}
.im-b.me{background:#0a84ff;color:#fff}.im-b.ta{background:#e9e9eb;color:#000}body.dark-theme .im-b.ta{background:#262628;color:#fff}
.im-m.tail.me .im-b.me{border-bottom-right-radius:4px}.im-m.tail.ta .im-b.ta{border-bottom-left-radius:4px}
.im-b.flash,.im-img.flash{box-shadow:0 0 0 3px rgba(10,132,255,.5)}
.im-b.sched{opacity:.55;border:1px dashed #0a84ff;background:transparent;color:#0a84ff}
.im-b.ink{color:transparent;text-shadow:0 0 10px rgba(255,255,255,.9);background-image:radial-gradient(rgba(255,255,255,.7) 1px,transparent 1px);background-size:5px 5px;cursor:pointer}.im-b.ta.ink{text-shadow:0 0 10px rgba(0,0,0,.6);background-image:radial-gradient(rgba(0,0,0,.35) 1px,transparent 1px)}.im-b.ink.open{color:inherit;text-shadow:none;background-image:none}.im-b.me.ink.open{color:#fff}
.im-typing{display:flex;gap:4px;padding:12px 14px}.im-typing i{width:8px;height:8px;border-radius:50%;background:#8e8e93;animation:imDot 1.2s infinite}.im-typing i:nth-child(2){animation-delay:.2s}.im-typing i:nth-child(3){animation-delay:.4s}
@keyframes imDot{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.im-rq{font-size:12.5px;color:#8e8e93;border-left:2px solid #c7c7cc;padding:2px 8px;margin-bottom:3px;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.im-tb{position:absolute;top:-14px;display:flex;background:#e9e9eb;border:2px solid #fff;border-radius:999px;padding:1px 5px;font-size:13px;gap:1px}.im-m.ta .im-tb{right:-14px}.im-m.me .im-tb{left:-14px}body.dark-theme .im-tb{background:#262628;border-color:#000}.im-tb i{font-style:normal}
.im-ed{font-size:11px;color:#0a84ff;margin-top:2px;cursor:pointer}
.im-fxn{font-size:11px;color:#8e8e93;margin-top:2px;cursor:pointer}
.im-st{font-size:11px;color:#8e8e93;margin-top:3px;font-weight:500}.im-st a{color:#0a84ff;cursor:pointer}
.im-img img{max-width:220px;max-height:280px;border-radius:16px;display:block}.im-ph{width:200px;height:240px;border-radius:16px;display:flex;align-items:flex-end}.im-ph em{font-style:normal;color:#fff;font-size:12.5px;padding:10px;text-shadow:0 1px 3px rgba(0,0,0,.4)}
.im-stk{font-size:64px;line-height:1.1}
.im-loc{width:200px;border-radius:16px;overflow:hidden;background:#e9e9eb}body.dark-theme .im-loc{background:#262628}.im-map{height:100px;background:repeating-linear-gradient(45deg,#d6e9d1 0 12px,#e6f0e0 12px 24px);display:flex;align-items:center;justify-content:center}.im-map i{font-style:normal;font-size:30px}.im-loc b{display:block;font-size:14px;padding:8px 10px 0}.im-loc small{display:block;font-size:12px;color:#8e8e93;padding:0 10px 8px}
.im-ck{width:230px;border-radius:16px;padding:12px 14px;background:#e9e9eb}body.dark-theme .im-ck{background:#262628}.im-ck b{font-size:14px}.im-ck p{margin:4px 0;font-size:15px}.im-ck small{font-size:12.5px;color:#8e8e93}.im-ck.ok small{color:#34c759}.im-ck.late small{color:#ff3b30;font-weight:600}
.im-ckb{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.im-ckb span{font-size:12.5px;background:#0a84ff;color:#fff;border-radius:999px;padding:4px 10px;cursor:pointer}.im-ckb span+span{background:transparent;color:#0a84ff;border:1px solid #0a84ff}
.im-focus{text-align:center;font-size:12.5px;color:#5e5ce6;margin:12px 16px 4px}.im-focus a{display:block;color:#0a84ff;margin-top:4px;cursor:pointer;font-weight:500}
.im-in{background:inherit;padding:6px 8px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))}
.im-rpbar{font-size:12.5px;color:#8e8e93;padding:4px 10px;display:flex;justify-content:space-between}.im-rpbar i{font-style:normal;cursor:pointer}
.im-inr{display:flex;align-items:flex-end;gap:8px}
.im-song{display:flex;align-items:center;gap:10px;background:#fff;border-radius:14px;padding:8px 12px;min-width:200px;max-width:270px}body.dark-theme .im-song{background:#1c1c1e}
.im-b.me+.im-song,.im-song{}
.im-songcov{width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0}
.im-songi{flex:1;min-width:0}.im-songi b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.im-songi small{color:#8e8e93;font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.im-songi i{font-style:normal;font-size:10.5px;color:#fa2d48}
.im-songp{color:#fa2d48;font-size:18px}
.im-ftm{display:flex;align-items:center;gap:10px;background:#fff;border-radius:14px;padding:10px 12px;max-width:260px;cursor:pointer}body.dark-theme .im-ftm{background:#1c1c1e}
.im-ftp{width:40px;height:40px;border-radius:50%;background:#34c759;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}.im-ftm b{font-size:14px}.im-ftm small{color:#8e8e93;font-size:12px;display:block}.im-ftt{display:none;font-style:normal;font-size:13px;color:#555;margin-top:4px;flex-basis:100%}body.dark-theme .im-ftt{color:#bbb}.im-ftm.played{flex-wrap:wrap}.im-ftm.played .im-ftt{display:block}
.im-albtip{color:#8e8e93;font-size:13px;padding:12px 16px;line-height:1.5}
.im-albgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;padding:0 3px}
.im-albc{aspect-ratio:1;background-size:cover;background-position:center;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer}.im-albc.t em{font-style:normal;color:#fff;font-size:11px;text-align:center;padding:4px;text-shadow:0 1px 2px rgba(0,0,0,.4)}
.im-crow{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#fff;border-radius:12px;margin:8px 16px 0;cursor:pointer}body.dark-theme .im-crow{background:#1c1c1e}.im-crow small{color:#8e8e93}.im-crow b{color:#007aff;font-weight:400}
.im-plus{width:34px;height:34px;border-radius:50%;background:#e9e9eb;color:#8e8e93;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;flex-shrink:0}body.dark-theme .im-plus{background:#262628}
.im-pill{flex:1;display:flex;align-items:center;border:1px solid #c7c7cc;border-radius:18px;padding:3px 3px 3px 12px;min-width:0}body.dark-theme .im-pill{border-color:#3a3a3c}
.im-pill input{flex:1;min-width:0;border:none;background:transparent;font-size:16.5px;color:inherit;outline:none;padding:5px 0}
.im-fxb{font-size:15px;cursor:pointer;padding:0 6px;opacity:.6}
.im-send{width:28px;height:28px;border-radius:50%;background:#0a84ff;color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;cursor:pointer;flex-shrink:0;-webkit-user-select:none;user-select:none}
.fx-slam{animation:imSlam .7s cubic-bezier(.2,1.4,.4,1)}@keyframes imSlam{0%{transform:scale(3) rotate(-6deg);opacity:0}60%{transform:scale(.9);opacity:1}80%{transform:scale(1.05)}100%{transform:scale(1)}}
.fx-loud{animation:imLoud 1s}@keyframes imLoud{0%{transform:scale(1)}20%{transform:scale(1.6)}30%,50%,70%{transform:scale(1.6) rotate(-3deg)}40%,60%{transform:scale(1.6) rotate(3deg)}100%{transform:scale(1)}}
.fx-gentle{animation:imGentle 2.2s ease}@keyframes imGentle{0%{transform:scale(.5);opacity:.4}60%{transform:scale(.6);opacity:.7}100%{transform:scale(1);opacity:1}}
.im-fx{position:fixed;inset:0;z-index:99970;pointer-events:none;overflow:hidden}
.im-fx-balloons span{position:absolute;bottom:-80px;animation:imUp 3.2s ease-in forwards}@keyframes imUp{to{transform:translateY(-120vh) rotate(8deg)}}
.im-fx-confetti span{position:absolute;top:-20px;width:8px;height:14px;border-radius:2px;animation:imFall 3s linear forwards}@keyframes imFall{to{transform:translateY(110vh) rotate(720deg)}}
.im-fx-love span{position:absolute;left:50%;top:50%;font-size:160px;transform:translate(-50%,-50%) scale(0);animation:imLove 2.6s ease forwards}@keyframes imLove{20%{transform:translate(-50%,-50%) scale(1.2)}40%{transform:translate(-50%,-50%) scale(1)}60%{transform:translate(-50%,-50%) scale(1.15)}100%{transform:translate(-50%,-80%) scale(1);opacity:0}}
.im-fx-lasers{background:rgba(0,0,0,.55);animation:imDim 3.4s forwards}.im-fx-lasers span{position:absolute;left:-100%;width:200%;height:6px;animation:imLaser 1.2s linear infinite;box-shadow:0 0 12px currentColor}@keyframes imLaser{0%{transform:translateX(-30%) rotate(-12deg)}50%{transform:translateX(30%) rotate(12deg)}100%{transform:translateX(-30%) rotate(-12deg)}}@keyframes imDim{0%,85%{opacity:1}100%{opacity:0}}
.im-fx-fireworks{background:rgba(0,0,0,.6);animation:imDim 3.4s forwards}.im-fx-fireworks span{position:absolute;transform:scale(0);animation:imBoom 1.4s ease-out forwards}@keyframes imBoom{0%{transform:scale(0);opacity:1}70%{transform:scale(1.6);opacity:1}100%{transform:scale(2);opacity:0}}
.im-fx-celebration span{position:absolute;font-size:22px;opacity:0;animation:imSpark 1.6s ease forwards}@keyframes imSpark{0%{opacity:0;transform:scale(.3)}40%{opacity:1;transform:scale(1.2)}100%{opacity:0;transform:scale(.6) translateY(-20px)}}
.im-ov{position:fixed;inset:0;z-index:99975;background:rgba(0,0,0,.25);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:20px}
.im-ovin{display:flex;flex-direction:column;gap:10px;max-width:90%}.im-ovin.me{align-items:flex-end}.im-ovin.ta{align-items:flex-start}
.im-taps{display:flex;gap:6px;background:#fff;border-radius:999px;padding:6px 10px;box-shadow:0 4px 20px rgba(0,0,0,.15)}body.dark-theme .im-taps{background:#2c2c2e}.im-taps i{font-style:normal;font-size:26px;cursor:pointer;border-radius:50%;padding:2px}.im-taps i.on{background:#0a84ff}
.im-ovb .im-b{max-width:280px}
.im-ovm{background:rgba(255,255,255,.95);border-radius:14px;overflow:hidden;min-width:220px;box-shadow:0 4px 20px rgba(0,0,0,.15)}body.dark-theme .im-ovm{background:rgba(44,44,46,.95)}.im-ovm div{padding:12px 16px;font-size:16px;border-bottom:.5px solid rgba(0,0,0,.08);cursor:pointer}.im-ovm div:last-child{border:0;color:#ff3b30}
.im-sheet{position:fixed;inset:0;z-index:99980;background:rgba(0,0,0,.3);display:flex;align-items:flex-end}.im-sheet-in{width:100%;padding:8px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));box-sizing:border-box;max-height:80vh;overflow-y:auto}
.im-sheet-g{background:rgba(250,250,250,.97);border-radius:14px;overflow:hidden;margin-top:8px}body.dark-theme .im-sheet-g{background:rgba(44,44,46,.97);color:#fff}.im-sheet-g p{margin:0;padding:12px;text-align:center;font-size:13px;color:#8e8e93;border-bottom:.5px solid rgba(0,0,0,.08)}.im-sheet-g div{padding:15px;text-align:center;font-size:18px;color:#0a84ff;border-bottom:.5px solid rgba(0,0,0,.08);cursor:pointer}.im-sheet-g div.c{font-weight:600;border:0}
.im-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:20px 16px 10px}.im-card h3{margin:6px 0 0;font-size:24px;font-weight:600}
.im-cbtns{display:flex;gap:10px;margin-top:10px}.im-cbtns span{background:#f2f2f7;border-radius:10px;padding:8px 14px;display:flex;flex-direction:column;align-items:center;font-size:20px;color:#0a84ff;cursor:pointer;min-width:52px}body.dark-theme .im-cbtns span{background:#1c1c1e}.im-cbtns em{font-style:normal;font-size:11px;margin-top:2px}
.im-list{margin:14px 16px;background:#f2f2f7;border-radius:12px;overflow:hidden}body.dark-theme .im-list{background:#1c1c1e}.im-list>div{padding:11px 14px;border-bottom:.5px solid #e5e5ea;cursor:pointer;font-size:16px;color:#0a84ff}body.dark-theme .im-list>div{border-color:#2c2c2e}.im-list>div:last-child{border:0}.im-list small{display:block;font-size:12.5px;color:#000}body.dark-theme .im-list small{color:#fff}.im-list b{font-weight:400;color:#0a84ff}.im-list .red{color:#ff3b30}
.im-sech{padding:12px 16px 4px;font-size:13px;color:#8e8e93}
.im-urow{display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer}.im-urow b{flex:1;font-weight:400;font-size:16px}.im-urow span:last-child{color:#c7c7cc}
.im-pick{display:flex;align-items:center;gap:10px;padding:8px 16px}.im-pick b{flex:1;font-weight:400}.im-pick input{width:20px;height:20px}
.im-edrow{padding:12px 16px;border-bottom:.5px solid #e5e5ea}.im-edrow small{font-size:12px;color:#8e8e93}.im-edrow p{margin:4px 0 0;font-size:15.5px}.im-edrow.cur p{color:#0a84ff}

.im-b.sms,.im-send.sms{background:#34c759!important;color:#fff}
.im-b.fb{font-weight:700}.im-b.fi{font-style:italic}.im-b.fu{text-decoration:underline}.im-b.fs{text-decoration:line-through}.im-b.fu.fs{text-decoration:underline line-through}
.im-a{color:inherit;text-decoration:underline}
.tfx-big{font-size:28px!important;line-height:1.15}.tfx-small{font-size:12px!important}
.im-b .tc{display:inline-block;white-space:pre}
.tfx-shake .tc{animation:imShk .35s 3 linear;animation-delay:calc(var(--i)*.01s)}@keyframes imShk{25%{transform:translate(-1px,1px) rotate(-4deg)}75%{transform:translate(1px,-1px) rotate(4deg)}}
.tfx-nod .tc{animation:imNod .6s 2 ease;animation-delay:calc(var(--i)*.03s)}@keyframes imNod{50%{transform:translateY(4px)}}
.tfx-ripple .tc{animation:imRip 1.2s ease 2;animation-delay:calc(var(--i)*.06s)}@keyframes imRip{30%{transform:scale(1.35)}60%{transform:scale(1)}}
.tfx-jitter .tc{animation:imJit .5s 3;animation-delay:calc(var(--i)*.02s)}@keyframes imJit{25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}
.tfx-explode .tc{animation:imExp 1.1s ease;animation-delay:calc(var(--i)*.02s)}@keyframes imExp{0%{transform:translate(calc((var(--i) - 4)*6px),-18px) scale(1.6);opacity:0}70%{transform:scale(1.15);opacity:1}100%{transform:none}}
.tfx-bloom .tc{animation:imBlm 1s ease;animation-delay:calc(var(--i)*.05s)}@keyframes imBlm{0%{transform:scale(0);opacity:0}70%{transform:scale(1.3)}100%{transform:none;opacity:1}}
.im-link{display:flex;gap:10px;align-items:center;margin-top:4px;background:#e9e9eb;border-radius:14px;overflow:hidden;width:230px;text-decoration:none;color:inherit}body.dark-theme .im-link{background:#262628}.im-link>span{width:54px;height:54px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700;flex-shrink:0}.im-link>div{min-width:0;padding-right:10px}.im-link b{display:block;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.im-link small{display:block;font-size:11.5px;color:#8e8e93;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.im-aa{font-size:14px;font-weight:600;color:#8e8e93;cursor:pointer;padding:0 5px;font-family:Georgia,serif}
.im-mic{color:#8e8e93;cursor:pointer;padding:0 4px;display:flex}.im-pill.has .im-mic{display:none}.im-pill:not(.has) .im-send{display:none}
.im-fmt p{font-size:12.5px!important}.im-fmtb,.im-fmtx{display:flex;flex-wrap:wrap;gap:8px;padding:12px;justify-content:center}.im-fmtb span,.im-fmtx span{min-width:44px;padding:8px 12px;border-radius:10px;background:rgba(118,118,128,.12);font-size:17px;cursor:pointer;text-align:center;border:0!important;color:inherit!important}.im-fmtx span{font-size:14px}.im-fmtb span.on,.im-fmtx span.on{background:#0a84ff;color:#fff!important}
.im-voice{display:flex;align-items:center;gap:8px;min-width:150px;cursor:pointer}.im-vp{font-size:15px}.im-wave{display:flex;align-items:center;gap:2px;flex:1}.im-wave i{width:3px;border-radius:2px;background:currentColor;opacity:.75}.im-voice em{font-style:normal;font-size:13px;font-variant-numeric:tabular-nums}.im-voice.playing .im-wave i{animation:imWv .6s infinite alternate}.im-voice.playing .im-wave i:nth-child(odd){animation-delay:.2s}@keyframes imWv{to{transform:scaleY(.4)}}
.im-vtx{font-size:12.5px;color:#8e8e93;margin-top:3px;max-width:240px}
.im-rec{position:fixed;left:0;right:0;bottom:0;z-index:99985;background:rgba(250,250,250,.97);backdrop-filter:blur(20px);border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));box-shadow:0 -6px 30px rgba(0,0,0,.15);color:#000}body.dark-theme .im-rec{background:rgba(30,30,32,.97);color:#fff}
.im-recb{display:flex;align-items:center;gap:10px}.im-rdot{width:10px;height:10px;border-radius:50%;background:#ff3b30;animation:imBlink 1s infinite}@keyframes imBlink{50%{opacity:.2}}.im-recb b{font-variant-numeric:tabular-nums}.im-rwave{flex:1;display:flex;gap:3px;align-items:center;height:30px}.im-rwave i{flex:1;background:#ff3b30;border-radius:2px;height:30%;animation:imWv .5s infinite alternate}.im-rwave i:nth-child(3n){animation-delay:.15s;height:70%}.im-rwave i:nth-child(3n+1){animation-delay:.3s;height:50%}
.im-rec p{font-size:14px;color:#8e8e93;margin:10px 0}.im-recbt{display:flex;justify-content:space-between}.im-recbt span{font-size:16px;color:#ff3b30;cursor:pointer;padding:8px}.im-recbt span.b{color:#fff;background:#0a84ff;border-radius:999px;padding:8px 18px}
.im-memo{position:relative;width:110px;height:110px}.im-memo .gys-av{border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.15)}.im-memo i{position:absolute;right:-4px;bottom:-4px;font-style:normal;font-size:52px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.2))}
.im-hand{background:#fff;border-radius:16px;padding:8px;box-shadow:0 1px 4px rgba(0,0,0,.12);width:230px}.im-hand svg{width:100%;height:auto;display:block}.im-hand path{fill:none;stroke:#111;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:imDraw 1s ease forwards}@keyframes imDraw{to{stroke-dashoffset:0}}
.im-hand.txt{padding:16px 18px;color:#1a1a1a;font-family:"Kaiti SC","STKaiti","KaiTi","Bradley Hand","Segoe Print",cursive;font-size:26px;line-height:1.3}.im-hand.txt span{display:inline-block;clip-path:inset(0 100% 0 0);animation:imReveal 2.4s steps(24) forwards}@keyframes imReveal{to{clip-path:inset(0 0 0 0)}}
.im-touch{width:200px;height:200px;background:#000;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;position:relative}.im-touch svg{position:absolute;inset:0;width:100%;height:100%}.im-touch path{fill:none;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:imDraw 1.1s ease forwards}.im-touch circle{opacity:0;animation:imTap 1s ease forwards;transform-box:fill-box;transform-origin:center}@keyframes imTap{0%{opacity:.9;transform:scale(.2)}100%{opacity:0;transform:scale(1.6)}}
.im-heart{font-size:72px;animation:imBeat 1s infinite}@keyframes imBeat{0%,100%{transform:scale(1)}15%{transform:scale(1.25)}30%{transform:scale(1)}45%{transform:scale(1.18)}}.im-touch em{font-style:normal;color:#fff;opacity:.7;font-size:12px;margin-top:6px}
.im-padb{background:#f2f2f7}.im-padb.dark{background:#000;color:#fff}.im-pad{padding:14px}.im-pad canvas{width:100%;background:#fff;border-radius:16px;touch-action:none;display:block;background-image:repeating-linear-gradient(transparent 0 38px,rgba(0,0,0,.06) 38px 39px)}.im-pad.touch canvas{background:#111;background-image:none;border-radius:20px}.im-pad p{text-align:center;font-size:13px;color:#8e8e93}
.im-padt{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;padding:10px 14px 24px}.im-padt i{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2px solid rgba(255,255,255,.5)}.im-padt span{font-size:15px;color:#0a84ff;cursor:pointer;padding:6px 10px}.im-padt span.b{background:#0a84ff;color:#fff;border-radius:999px;padding:7px 18px}
.im-cash{width:220px;border-radius:18px;padding:14px;background:#1c1c1e;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.2)}.im-cash-h{display:flex;gap:4px;align-items:baseline}.im-cash-h b{font-size:15px}.im-cash-h span{font-size:11px;opacity:.6}.im-cash-a{font-size:34px;font-weight:700;margin:10px 0 2px;letter-spacing:-.5px}.im-cash p{margin:0;font-size:13px;opacity:.85}.im-cash small{font-size:12px;opacity:.6}
.im-live{width:220px;border-radius:16px;overflow:hidden;background:#e9e9eb}body.dark-theme .im-live{background:#262628}.im-lmap{height:110px;background:repeating-linear-gradient(0deg,#e3ecd9 0 18px,#eef3e7 18px 19px),linear-gradient(90deg,#d8e6f5,#e9efe3);display:flex;align-items:center;justify-content:center;position:relative}.im-lmap i{font-style:normal;font-size:30px}.im-lpin{position:relative}.im-lpin::before{content:"";position:absolute;inset:-10px;border-radius:50%;background:rgba(10,132,255,.25);animation:imPulse 1.6s infinite}@keyframes imPulse{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.6);opacity:0}}.im-lpin .gys-av{border:3px solid #fff;position:relative}.im-live b{display:block;font-size:14px;padding:8px 10px 0}.im-live small{display:block;font-size:12px;color:#8e8e93;padding:0 10px 8px}.im-live .im-ckb{padding:0 10px 10px}
.im-gcard{display:flex;align-items:center;gap:10px;width:220px;background:#e9e9eb;border-radius:16px;padding:12px;cursor:pointer}body.dark-theme .im-gcard{background:#262628}.im-gcard>span{font-size:34px}.im-gcard>div{flex:1}.im-gcard b{font-size:15px}.im-gcard small{display:block;font-size:12.5px;color:#8e8e93}.im-gcard em{font-style:normal;color:#c7c7cc;font-size:20px}
.im-gameb{background:#f2f2f7}body.dark-theme .im-gameb{background:#000}.im-game{padding:20px 16px}.im-gst{text-align:center;font-size:17px;font-weight:600;margin-bottom:16px}
.im-ttt{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:300px;margin:0 auto}.im-ttt span{aspect-ratio:1;background:#fff;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:50px;color:#0a84ff;cursor:pointer}body.dark-theme .im-ttt span{background:#1c1c1e}
.im-c4{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;background:#0a84ff;padding:8px;border-radius:14px;max-width:340px;margin:0 auto}.im-c4 span{aspect-ratio:1;display:flex;cursor:pointer}.im-c4 i{flex:1;border-radius:50%;background:#f2f2f7}.im-c4 i.me{background:#ff3b30}.im-c4 i.ta{background:#ffd60a}
.im-rps{display:flex;align-items:center;justify-content:center;gap:20px;margin:30px 0}.im-rps div{display:flex;flex-direction:column;align-items:center;gap:6px}.im-rps b{font-size:58px}.im-rps em{font-style:normal;font-size:13px;color:#8e8e93}.im-rps>span{font-weight:700;color:#8e8e93}.im-rps.pick b{cursor:pointer;background:#fff;border-radius:18px;padding:10px 14px}body.dark-theme .im-rps.pick b{background:#1c1c1e}
.im-more{font-size:18px!important;width:30px;height:30px;display:inline-flex!important;align-items:center;justify-content:center;background:rgba(118,118,128,.15)}
.im-row .red,.im-row a{color:#0a84ff;cursor:pointer}.im-row a.red{color:#ff3b30}
`);
(async () => { await G.ready(); D = Object.assign(D, await ST.get('d', {}) || {}); if (!D.th || typeof D.th !== 'object') D.th = {}; D.last = D.last || {}; D.cfg = Object.assign({ keep: 600 }, D.cfg || {}); Object.values(D.th).forEach(t => { t.typing = 0; t.sched = t.sched || []; t.album = t.album || []; }); D.trash = D.trash || {}; Object.keys(D.trash).forEach(k => { if (Date.now() - D.trash[k].at > 30 * 86400e3) delete D.trash[k]; }); })();
window.gysImState = () => D;

try { G.badge.imsg = unreadAll; } catch (e) {}
// 💬 互通（256）：别的软件看得到这里聊的；TA 主动找你可能来这里
try { G.chatReg(APP, { lines: c => { const t = D.th['c:' + c.id]; return t ? t.msgs.filter(m => m.from !== 'sys').slice(-6).map(m => ({ at: m.at, t: lineOf(t, m, 'c:' + c.id).replace(/^你：/, '你（' + c.name + '）：') })) : []; }, lastMe: c => { const t = D.th['c:' + c.id]; const m = t && t.msgs.filter(x => x.from === 'me').slice(-1)[0]; return m ? m.at : 0; }, proactive: async c => { const a = typeof GY_AUTONOMY_ACTIONS !== 'undefined' && GY_AUTONOMY_ACTIONS.find(x => x.key === 'gys_im_text'); return !!(a && await a.run(c)); } }); } catch (e) {}
