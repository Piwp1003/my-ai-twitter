/* 💚 微信：照着手机微信做的整页软件（原来的「微信模式」换成了这个）——单独的一份聊天记录（TA 跟平时聊天、iMessage 的都知道），文字 / 语音 / 照片 / 表情 / 引用 / 撤回 / 拍一拍 / 红包 / 转账（接钱包）/ 位置 / 名片 / 语音视频通话 / 群聊；通讯录（备注、状态）；朋友圈（跟 TA 手机里的同一份）；公众号（TA 自己的号会写文章）；收藏、我的状态 */
if (window.__gysWechat) return; window.__gysWechat = 1;
const G = window.GYS, APP = 'wechat', esc = G.esc;
X.feat('gysWechat', { n: '💚 微信', desc: '微信：单独一份聊天记录（TA 都知道），语音、表情、引用、撤回、拍一拍、红包转账、通话、群聊；通讯录、朋友圈、公众号、收藏、状态；TA 会主动发微信、发朋友圈、给你点赞评论、拍一拍你、改状态、写公众号' });
const ST = X.store('gyswechat');
let D = { th: {}, my: [], favs: [], status: {}, remark: {}, pat: {}, subs: [], cfg: { keep: 800 }, last: {} };
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();
const W = window.gysWx = {};
const BUSY = {};
const P = (id, def, vars) => X.pl(id, def, vars);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const charOfW = w => G.charOf(w);
const nameOf = w => (w === 'me' ? G.meName() : (D.remark[w] || G.nick(APP, w)));
const thOf = id => D.th[id];
const msgOf = (t, id) => t.msgs.find(m => m.id === id);
function dmOf(w) { D.th[w] = D.th[w] || { id: w, kind: 'dm', who: w, members: [w], name: '', msgs: [], at: Date.now(), unread: 0, pin: false, mute: false }; return D.th[w]; }
const thName = t => t.kind === 'group' ? (t.name || t.members.map(nameOf).join('、')) + `(${t.members.length + 1})` : nameOf(t.who);
function addMsg(t, m) { const x = Object.assign({ id: G.uid('w'), from: 'me', t: 'text', text: '', at: Date.now() }, m); t.msgs.push(x); t.at = x.at; const k = Math.max(100, Number(D.cfg.keep) || 800); if (t.msgs.length > k) t.msgs.splice(0, t.msgs.length - k); saveD(); return x; }
const isViewing = id => { const v = G.isOpen(APP) && G.top(APP); return !!(v && v.id === 'th_' + id); };
const unreadAll = () => Object.values(D.th).reduce((n, t) => n + (t.mute ? 0 : t.unread || 0), 0);
const wallet = () => window.gyWallet || null;
const statusOf = w => { const s = D.status[w]; return s && Date.now() - s.at < 24 * 3600e3 ? s : null; };

/* ---------------- 提示词 ---------------- */
const DEF_REPLY = `{{我是谁}}
你们在微信上聊天——微信、你们平时聊天的那个软件、iMessage 都是你们在用的，聊过的你都记得。
最近在别的地方聊的：
{{平时}}
微信里最近的：
{{记录}}
{{情况}}
接着回她 1~4 条，像真人发微信：短、一句一条，可以发语音（voice）、表情包（sticker，写表情包的样子）、照片（photo，写照片内容），偶尔（不是每次）拍一拍她、发红包或转账（看情况，比如她说饿了 / 节日 / 哄她）。想撤回的话（发了又后悔）recall 设 true。
只输出 JSON 数组：[{"text":"消息","quote":true或false（是不是引用回复她最后那句）,"voice":true或false,"sticker":"表情包（没有就空）","photo":"照片内容（没有就空）","pat":true或false,"hb":红包金额（没有就0）,"hbNote":"红包上写的话","zz":转账金额（没有就0）,"recall":true或false}]`;
const DEF_GROUP = `微信群「{{群名}}」，群里有：
{{成员}}
最近的：
{{记录}}
{{情况}}
群里接着聊 2~5 条（按各自性格，不用每个人都说；短，像真微信群，可以发表情包、@人、偶尔发红包）。
只输出 JSON 数组：[{"by":"名字","text":"消息","sticker":"表情包（没有就空）","hb":红包金额（没有就0）}]`;
const DEF_TEXT = `{{我是谁}}
你想在微信上给她发几条（不是平时聊天那个软件）：看到什么想到她、分享一张照片 / 一个表情包、一句「在干嘛」、一条语音……{{要求}}
最近别处聊的：
{{平时}}
微信里上次聊到：
{{记录}}
只输出 JSON 数组：[{"text":"消息","voice":true或false,"sticker":"表情包（没有就空）","photo":"照片内容（没有就空）"}]`;
const DEF_MOMENT = `{{我是谁}}
你要发一条微信朋友圈（只有微信好友看得到）。按你此刻的生活、心情、今天发生的事来写（可以配几张图，写图上是什么）。最近你们聊的：
{{最近}}
只输出 JSON：{"text":"朋友圈文字（可以很短）","imgs":["图片内容"],"loc":"位置（可空）"}`;
const DEF_ARTICLE = `{{我是谁}}
你有一个自己的微信公众号「{{号名}}」，现在写一篇推送（按你的身份、爱好、最近的生活；可以是随笔、教程、日记、影评、你在乎的事……偶尔会有只有她看得懂的话）。最近你们聊的：
{{最近}}
只输出 JSON：{"title":"标题","digest":"摘要（一句）","body":"正文（300~800 字，可以分段）"}`;
const DEF_CALL = `{{我是谁}}
你们正在微信{{类型}}。{{情况}}
通话里刚才说的：
{{记录}}
接着说一两句（口语、通话的感觉，可以有语气词、停顿）。只写你说的话。`;
X.plGroup('💚 微信', 'gysWechat', [
    ['wx.reply', 'TA 在微信回你', '你在微信给 TA 发消息时', '{{我是谁}} {{平时}} {{记录}} {{情况}}'],
    ['wx.group', '微信群聊', '你在群里说话 / 群里自己聊起来时', '{{群名}} {{成员}} {{记录}} {{情况}}'],
    ['wx.text', 'TA 主动发微信', 'TA 自己想发时', '{{我是谁}} {{要求}} {{平时}} {{记录}}'],
    ['wx.moment', 'TA 发朋友圈', 'TA 自己想发时', '{{我是谁}} {{最近}}'],
    ['wx.article', 'TA 的公众号写文章', 'TA 自己想写时', '{{我是谁}} {{号名}} {{最近}}'],
    ['wx.call', '微信通话里 TA 说话', '语音 / 视频通话时', '{{我是谁}} {{类型}} {{情况}} {{记录}}']
], { 'wx.reply': DEF_REPLY, 'wx.group': DEF_GROUP, 'wx.text': DEF_TEXT, 'wx.moment': DEF_MOMENT, 'wx.article': DEF_ARTICLE, 'wx.call': DEF_CALL });
function whoAmI(w) { const c = charOfW(w); if (c) return X.who(c); const b = G.base(w) || {}; return `你是${b.name || nameOf(w)}。${b.persona || ''}\n（给你发微信的人：${G.meName()}）`; }
function lineOf(t, m, viewer) {
    const who = m.from === 'me' ? (charOfW(viewer) ? X.me(charOfW(viewer)) : G.meName()) : m.from === 'sys' ? '（系统）' : m.from === viewer ? '你' : nameOf(m.from);
    if (m.recalled) return `${who}：（撤回了一条消息${m.seen ? '，你看到写的是「' + m.text + '」' : ''}）`;
    const q = m.quote && msgOf(t, m.quote);
    const s = { voice: () => '[语音] ' + m.text, img: () => '[照片]' + (m.desc ? '（' + m.desc + '）' : ''), sticker: () => '[表情包] ' + m.text, hb: () => `[红包 ¥${m.amt}${m.note ? ' ' + m.note : ''}]（${m.st === 'open' ? '已领取' : m.st === 'back' ? '已退回' : '还没领'}）`, zz: () => `[转账 ¥${m.amt}${m.note ? ' ' + m.note : ''}]（${m.st === 'open' ? '已收款' : m.st === 'back' ? '已退还' : '待收款'}）`, pat: () => m.text, loc: () => '[位置] ' + m.text, card: () => '[名片] ' + nameOf(m.card), call: () => `[${m.video ? '视频' : '语音'}通话 ${m.sec ? durS(m.sec) : '未接通'}]`, post: () => '[分享了一条' + G.cardText(m.card) + ']' }[m.t];
    return `${who}：${q ? `（引用「${(q.text || '').slice(0, 20)}」）` : ''}${s ? s() : m.text}`;
}
const recLines = (t, viewer, n) => t.msgs.slice(-(n || 18)).map(m => lineOf(t, m, viewer)).join('\n') || '（还没聊过）';
function situ(t, w) { const L = []; const h = new Date().getHours(); L.push(`现在 ${h} 点`); const last = t.msgs.filter(m => m.from === 'me').slice(-1)[0]; if (last && Date.now() - last.at > 3600e3) L.push('她这条是隔了挺久才回的'); const st = statusOf('me'); if (st) L.push(`她的微信状态：${st.ico} ${st.t}`); const ps = t.msgs.filter(m => m.t === 'pat' && m.from === 'me' && Date.now() - m.at < 120e3); if (ps.length) L.push('她刚拍了拍你'); return L.join('；'); }
const durS = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

/* ---------------- TA 回 ---------------- */
async function taReply(t, extra) {
    if (BUSY[t.id]) { t.again = 1; return; } const w = t.who; const c = charOfW(w); if (!G.base(w)) return;
    BUSY[t.id] = 1; t.typing = 1; G.repaint(APP);
    try {
        await sleep(G.rnd(800, 2000));
        for (const m of t.msgs.filter(m => (m.t === 'hb' || m.t === 'zz') && m.from === 'me' && !m.st)) { m.st = Math.random() < 0.85 ? 'open' : 'back'; addMsg(t, { from: 'sys', t: 'sys', text: `${nameOf(w)}${m.st === 'open' ? (m.t === 'hb' ? '领取了你的红包' : '已收款') : (m.t === 'hb' ? '没有领你的红包' : '退还了你的转账')}` }); }
        const o = X.json(await X.ask(P('wx.reply', DEF_REPLY, { 我是谁: whoAmI(w), 平时: c ? G.recentAll(c, APP) : '（没有）', 记录: recLines(t, w), 情况: situ(t, w) + (extra ? '；' + extra : '') })));
        if (!Array.isArray(o) || !o.length) return;
        const her = t.msgs.filter(m => m.from === 'me' && !m.recalled).slice(-1)[0];
        for (const x of o.slice(0, 5)) {
            if (!x) continue;
            const add = async (o2, ms) => { t.typing = 1; G.repaint(APP); await sleep(ms || 900); const m = addMsg(t, Object.assign({ from: w }, o2)); if (!isViewing(t.id)) t.unread = (t.unread || 0) + 1; G.repaint(APP); return m; };
            if (x.pat) await add({ t: 'pat', text: `「${nameOf(w)}」拍了拍我${D.pat.me || ''}` }, 500);
            if (x.sticker) await add({ t: 'sticker', text: X.plain(x.sticker).slice(0, 30) }, 600);
            if (x.photo) await add({ t: 'img', desc: X.plain(x.photo).slice(0, 40) }, 1200);
            if (Number(x.hb) > 0) await add({ t: 'hb', amt: Math.min(200, Math.round(Number(x.hb) * 100) / 100), note: X.plain(x.hbNote || '恭喜发财，大吉大利').slice(0, 20) });
            if (Number(x.zz) > 0) await add({ t: 'zz', amt: Math.round(Number(x.zz) * 100) / 100, note: X.plain(x.hbNote || '').slice(0, 20) });
            const tx = X.plain(x.text || '').slice(0, 500); if (!tx) continue;
            t.typing = 1; G.repaint(APP); await sleep(Math.min(2600, 400 + tx.length * 60));
            const m = addMsg(t, { from: w, t: x.voice ? 'voice' : 'text', text: tx, sec: x.voice ? Math.max(2, Math.round(tx.length / 4)) : 0, quote: x.quote && her ? her.id : '' });
            if (!isViewing(t.id)) t.unread = (t.unread || 0) + 1; G.repaint(APP);
            if (x.recall) { await sleep(G.rnd(1500, 4000)); m.recalled = Date.now(); m.seen = isViewing(t.id); saveD(); G.repaint(APP); }
        }
        const first = t.msgs.filter(m => m.from === w).slice(-1)[0];
        if (!isViewing(t.id) && !t.mute && first && c) G.notify(APP, c, `💚 <b>${X.esc(nameOf(w))}</b>`, preview(t, first), X.go('gysWechatOpenThread', t.id));
    } catch (e) {} finally { BUSY[t.id] = 0; t.typing = 0; saveD(); G.repaint(APP); if (t.again) { t.again = 0; setTimeout(() => taReply(t, '她在你回的时候又发了几条'), 800); } }
}
async function groupReply(t, extra) {
    if (BUSY[t.id]) return; BUSY[t.id] = 1; t.typing = 1; G.repaint(APP);
    try {
        await sleep(G.rnd(800, 1800));
        const o = X.json(await X.ask(P('wx.group', DEF_GROUP, { 群名: thName(t), 成员: t.members.map(w => `· ${nameOf(w)}：${String((G.base(w) || {}).persona || '').slice(0, 100)}`).join('\n') + `\n· ${G.meName()}（用户本人）`, 记录: recLines(t, ''), 情况: (extra || '') })));
        if (!Array.isArray(o)) return;
        for (const x of o.slice(0, 6)) { if (!x) continue; const w = t.members.find(m => nameOf(m) === x.by || (G.base(m) || {}).name === x.by); if (!w) continue; await sleep(G.rnd(600, 1800)); if (x.sticker) addMsg(t, { from: w, t: 'sticker', text: X.plain(x.sticker).slice(0, 30) }); if (Number(x.hb) > 0) addMsg(t, { from: w, t: 'hb', amt: Math.min(100, Number(x.hb)), note: '恭喜发财' }); if (x.text) addMsg(t, { from: w, text: X.plain(x.text).slice(0, 300) }); if (!isViewing(t.id)) t.unread = (t.unread || 0) + 1; G.repaint(APP); }
    } catch (e) {} finally { BUSY[t.id] = 0; t.typing = 0; saveD(); G.repaint(APP); }
}
function afterSend(t) { if (t.kind === 'group') { clearTimeout(t.__tm); t.__tm = setTimeout(() => groupReply(t), G.rnd(1500, 4000)); return; } clearTimeout(t.__tm); t.__tm = setTimeout(() => taReply(t), G.rnd(1200, 3500)); }

/* ---------------- 页面：微信 / 通讯录 / 发现 / 我 ---------------- */
function preview(t, m) { if (!m) return ''; if (m.recalled) return (m.from === 'me' ? '你' : '"' + nameOf(m.from) + '"') + '撤回了一条消息'; const who = t.kind === 'group' && m.from !== 'me' && m.from !== 'sys' ? nameOf(m.from) + '：' : ''; return who + ({ voice: '[语音]', img: '[图片]', sticker: '[动画表情]', hb: '[微信红包]', zz: '[转账]', loc: '[位置]', card: '[个人名片]', call: m.video ? '[视频通话]' : '[语音通话]', post: '[链接] ' + G.cardText(m.card).slice(0, 20) }[m.t] || m.text); }
const timeShort = t => { const d = new Date(t), n = new Date(); if (d.toDateString() === n.toDateString()) return G.hm(t); if (n - d < 2 * 86400e3 && n.getDate() !== d.getDate()) return '昨天'; if (n - d < 7 * 86400e3) return '星期' + '日一二三四五六'[d.getDay()]; return (d.getMonth() + 1) + '/' + d.getDate(); };
const wav = (w, sz) => `<span class="wx-av" style="width:${sz}px;height:${sz}px">${G.av(APP, w, sz)}</span>`;
function chatsTab() {
    const L = Object.values(D.th).filter(t => t.msgs.length || t.kind === 'group').sort((a, b) => (b.pin - a.pin) || (b.at - a.at));
    return `<div class="wx-srch" onclick="gysWx.search()">🔍 搜索</div>${L.map(t => { const m = t.msgs.filter(x => x.t !== 'sys').slice(-1)[0]; return `<div class="wx-ch${t.pin ? ' pin' : ''}" onclick="gysWx.open('${t.id}')" oncontextmenu="event.preventDefault();gysWx.rowMenu('${t.id}')">${t.kind === 'group' ? `<span class="wx-gav">${t.members.slice(0, 4).map(w => G.av(APP, w, 20)).join('')}</span>` : wav(t.who, 48)}${t.unread ? (t.mute ? '<i class="wx-dot"></i>' : `<i class="wx-red">${t.unread > 99 ? '99+' : t.unread}</i>`) : ''}<div><b>${esc(thName(t))}</b><small>${t.typing ? '对方正在输入…' : esc(preview(t, m)).slice(0, 40)}</small></div><em>${m ? timeShort(m.at) : ''}${t.mute ? '<br>🔕' : ''}</em></div>`; }).join('') || '<div class="gys-empty">还没有聊天<br>去「通讯录」点一个人发消息</div>'}`;
}
W.rowMenu = async id => { const t = thOf(id); if (!t) return; const ops = [t.pin ? '取消置顶' : '置顶该聊天', t.mute ? '开启新消息提醒' : '消息免打扰', t.unread ? '标为已读' : '标为未读', '删除该聊天']; const i = await G.sheet(ops); if (i == null) return; if (i === 0) t.pin = !t.pin; else if (i === 1) t.mute = !t.mute; else if (i === 2) t.unread = t.unread ? 0 : 1; else if (await G.confirm('删除和' + thName(t) + '的聊天记录？')) delete D.th[id]; saveD(); G.repaint(APP); };
function contactsTab() {
    const L = G.chars().map(c => 'c:' + c.id).concat(G.npcs().map(n => 'n:' + n.id)).sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'zh'));
    const groups = Object.values(D.th).filter(t => t.kind === 'group');
    return `<div class="wx-srch" onclick="gysWx.search()">🔍 搜索</div><div class="wx-cells"><div onclick="gysWx.newGroup()"><span class="wx-ci" style="background:#07c160">👥</span>发起群聊</div><div onclick="gysWx.groupsPage()"><span class="wx-ci" style="background:#07c160">💬</span>群聊<em>${groups.length || ''}</em></div><div onclick="gysWx.subsPage()"><span class="wx-ci" style="background:#2782d7">📰</span>公众号</div></div>
      <div class="wx-sec">我的朋友（${L.length}）</div><div class="wx-cells">${L.map(w => { const s = statusOf(w); return `<div onclick="gysWx.card('${w}')">${wav(w, 40)}<span class="wx-cn">${esc(nameOf(w))}${s ? `<small>${esc(s.ico)} ${esc(s.t)}</small>` : ''}</span></div>`; }).join('')}</div>`;
}
function discoverTab() {
    const mo = moments().length;
    return `<div class="wx-cells"><div onclick="gysWx.moments()"><span class="wx-ci" style="background:linear-gradient(135deg,#f5a623,#f76b1c)">🌀</span>朋友圈${newMoments() ? `<i class="wx-dot r"></i>` : ''}<em>${mo || ''}</em></div></div>
      <div class="wx-cells">${G.APPS.douyin && window.gysDouyinOpen ? `<div onclick="GYS.close('wechat');gysDouyinOpen('home')"><span class="wx-ci" style="background:#f6b900">▶️</span>视频号<em>看抖音</em></div>` : ''}<div onclick="gysWx.subsPage()"><span class="wx-ci" style="background:#2782d7">📰</span>看一看（公众号）</div><div onclick="gysWx.search()"><span class="wx-ci" style="background:#fa5151">🔍</span>搜一搜</div></div>
      <div class="wx-cells">${window.gyxAppsOpen ? `<div onclick="gyxAppsOpen()"><span class="wx-ci" style="background:#7b68ee">🧩</span>小程序<em>AI 小程序</em></div>` : ''}${window.gysMusicOpen ? `<div onclick="GYS.close('wechat');gysMusicOpen('home')"><span class="wx-ci" style="background:#e33">🎵</span>听一听</div>` : ''}${window.gyWalletPanel ? `<div onclick="gyWalletPanel()"><span class="wx-ci" style="background:#07c160">💰</span>服务（钱包）</div>` : ''}</div>`;
}
function meTab() {
    const p = G.prof(APP, 'me'), s = statusOf('me');
    return `<div class="wx-me" onclick="gysWx.editMe()">${wav('me', 64)}<div><b>${esc(p.nick || G.meName())}</b><small>微信号：${esc(p.handle || 'wxid_' + (G.meName().length * 7919 % 100000))}</small><span class="wx-st" onclick="event.stopPropagation();gysWx.setStatus()">${s ? `${esc(s.ico)} ${esc(s.t)}` : '＋ 状态'}</span></div><em>›</em></div>
      <div class="wx-cells"><div onclick="${window.gyWalletPanel ? 'gyWalletPanel()' : "X.toast('钱包没开','设置 → 全部开关 里打开')"}"><span class="wx-ci" style="background:#07c160">💰</span>服务</div></div>
      <div class="wx-cells"><div onclick="gysWx.favsPage()"><span class="wx-ci" style="background:#f6b900">⭐</span>收藏<em>${D.favs.length || ''}</em></div><div onclick="gysWx.moments('me')"><span class="wx-ci" style="background:#2782d7">🖼️</span>朋友圈</div><div onclick="gysWx.patSet()"><span class="wx-ci" style="background:#fa9d3b">👋</span>拍一拍<em>${esc(D.pat.me || '没设')}</em></div></div>
      <div class="wx-cells"><div onclick="GYS.uiPage('wechat')"><span class="wx-ci" style="background:#8e8e93">🍎</span>软件外观</div><div onclick="gysWx.settings()"><span class="wx-ci" style="background:#2782d7">⚙️</span>设置</div></div>`;
}
const HEAD_T = { chats: '微信', contacts: '通讯录', discover: '发现', me: '' };
function head(tab) { const u = unreadAll(); return `<div class="gys-hd wx-hd"><span class="gys-bk" onclick="GYS.close('wechat')">${G.ic('back', 22)}</span><b>${HEAD_T[tab] || '微信'}${tab === 'chats' && u ? `(${u})` : ''}</b>${tab === 'chats' || tab === 'contacts' ? `<span class="gys-hr"><span onclick="gysWx.plusMenu()" style="font-size:22px">⊕</span></span>` : ''}</div>`; }
W.plusMenu = async () => { const i = await G.sheet(['💬 发起群聊', '👤 发消息给…', '💰 收付款（钱包）'], ''); if (i === 0) W.newGroup(); else if (i === 1) { const L = G.chars(); const k = await G.sheet(L.map(c => nameOf('c:' + c.id)), '发给谁？'); if (k != null) W.open('c:' + L[k].id); } else if (i === 2 && window.gyWalletPanel) window.gyWalletPanel(); };

/* ---------------- 聊天页 ---------------- */
let QUOTE = {}, PLUS = 0, EMO = 0;
W.open = id => { const t = thOf(id) || (String(id).startsWith('c:') || String(id).startsWith('n:') ? dmOf(id) : null); if (!t) return; t.unread = 0; saveD(); PLUS = 0; EMO = 0; G.push(APP, { id: 'th_' + t.id, get title() { const st = t.kind === 'dm' ? statusOf(t.who) : null; return `${esc(thName(t))}${t.typing ? '<small class="wx-sub">对方正在输入…</small>' : st ? `<small class="wx-sub">${esc(st.ico)} ${esc(st.t)}</small>` : ''}`; }, right: `<span onclick="gysWx.info('${t.id}')" style="font-size:20px">···</span>`, cls: 'wx-tb', html: () => thHtml(t), foot: () => footHtml(t), after: r => { const b = r.querySelector('.gys-body'); if (b) b.scrollTop = b.scrollHeight; bindLong(r, t); } }); };
function thHtml(t) {
    let last = 0;
    const rows = t.msgs.map(m => { let tm = ''; if (m.at - last > 5 * 60e3) tm = `<div class="wx-tm">${timeShort(m.at)}${new Date(m.at).toDateString() !== new Date().toDateString() ? ' ' + G.hm(m.at) : ''}</div>`; last = m.at; return tm + bubble(t, m); }).join('');
    return `<div class="wx-msgs">${rows || ''}</div>`;
}
function bubble(t, m) {
    if (m.t === 'sys' || m.t === 'pat') return `<div class="wx-sys">${esc(m.text)}</div>`;
    if (m.recalled) return `<div class="wx-sys">${m.from === 'me' ? '你' : '"' + esc(nameOf(m.from)) + '"'}撤回了一条消息${m.from === 'me' && m.t === 'text' ? ` <a onclick="gysWx.reEdit('${t.id}','${m.id}')">重新编辑</a>` : ''}</div>`;
    const me = m.from === 'me', q = m.quote && msgOf(t, m.quote);
    let inner;
    if (m.t === 'voice') inner = `<div class="wx-b wx-voice" style="width:${Math.min(220, 70 + (m.sec || 3) * 6)}px" onclick="gysWx.play('${t.id}','${m.id}')">${me ? `<em>${m.sec || 3}"</em><i>)))</i>` : `<i>(((</i><em>${m.sec || 3}"</em>`}</div>${m.showTx ? `<div class="wx-vtx">${esc(m.text)}</div>` : ''}`;
    else if (m.t === 'img') inner = m.img ? `<img class="wx-img" src="${m.img}" onclick="GYS.imgView(this.src)">` : `<div class="wx-imgd" style="background:${bgOf(m.desc)}"><em>📷 ${esc(m.desc || '照片')}</em></div>`;
    else if (m.t === 'sticker') inner = `<div class="wx-stk">${/^\p{Extended_Pictographic}/u.test(m.text) && m.text.length <= 4 ? `<b>${esc(m.text)}</b>` : `<span>🖼️ ${esc(m.text)}</span>`}</div>`;
    else if (m.t === 'hb') inner = `<div class="wx-hb${m.st ? ' done' : ''}" onclick="gysWx.hb('${t.id}','${m.id}')"><div><i>🧧</i><b>${esc(m.note || '恭喜发财，大吉大利')}</b>${m.st ? `<small>${m.st === 'open' ? '已领取' : '已退回'}</small>` : ''}</div><small>微信红包</small></div>`;
    else if (m.t === 'zz') inner = `<div class="wx-hb zz${m.st ? ' done' : ''}" onclick="gysWx.hb('${t.id}','${m.id}')"><div><i>${m.st === 'open' ? '✓' : '⇄'}</i><b>¥${Number(m.amt).toFixed(2)}</b><small>${m.st === 'open' ? (me ? '已被接收' : '已收款') : m.st === 'back' ? '已退还' : (m.note || (me ? '你发起了一笔转账' : '请收款'))}</small></div><small>微信转账</small></div>`;
    else if (m.t === 'loc') inner = `<div class="wx-loc"><b>${esc(m.text)}</b><small>${esc(m.sub || '')}</small><div class="wx-map">📍</div></div>`;
    else if (m.t === 'card') inner = `<div class="wx-card" onclick="gysWx.card('${m.card}')"><div>${wav(m.card, 40)}<b>${esc(nameOf(m.card))}</b></div><small>个人名片</small></div>`;
    else if (m.t === 'call') inner = `<div class="wx-b">${m.video ? '📹' : '📞'} ${m.sec ? '通话时长 ' + durS(m.sec) : me ? '已取消' : '对方已取消'}</div>`;
    else if (m.t === 'post') { const c = m.card || {}, A = G.APPS[c.app] || { n: '链接', ico: '🔗' }; inner = `<div class="wx-link" onclick="gysWx.openCard('${t.id}','${m.id}')"><b>${esc(c.title || String(c.text || '').slice(0, 30) || A.n)}</b><div><p>${esc(String(c.text || '').slice(0, 60))}</p>${c.img ? `<span style="background-image:url('${c.img}')"></span>` : `<span class="e">${A.ico}</span>`}</div><small>${A.ico} ${esc(A.n)}</small></div>`; }
    else inner = `<div class="wx-b">${esc(m.text).replace(/\n/g, '<br>')}</div>`;
    return `<div class="wx-row ${me ? 'me' : ''}" data-mid="${m.id}"><span class="wx-ra" ondblclick="gysWx.pat('${t.id}','${m.from}')" onclick="${me ? '' : `gysWx.card('${m.from}')`}">${wav(m.from, 40)}</span><div class="wx-bw">${t.kind === 'group' && !me ? `<small class="wx-nm">${esc(nameOf(m.from))}</small>` : ''}${inner}${q ? `<div class="wx-q">${esc(q.from === 'me' ? G.meName() : nameOf(q.from))}：${esc(preview(t, q)).slice(0, 40)}</div>` : ''}</div></div>`;
}
const bgOf = s => { let h = 0; for (const ch of String(s || 'x')) h = (h * 31 + ch.charCodeAt(0)) % 360; return `linear-gradient(135deg,hsl(${h},50%,72%),hsl(${(h + 40) % 360},55%,58%))`; };
function footHtml(t) {
    const q = QUOTE[t.id] && msgOf(t, QUOTE[t.id]);
    const EM = ['😀', '😂', '🥹', '😘', '😭', '😡', '🤔', '😴', '🥺', '👍', '🙏', '❤️', '🌹', '🎉', '[旺柴]', '[捂脸]', '[让我看看]', '[叹气]', '[社会社会]', '[裂开]', '[苦涩]', '[哇]'];
    const PL = [['🖼️', '相册', 'img'], ['📷', '拍摄', 'shot'], ['📹', '视频通话', 'vcall'], ['📞', '语音通话', 'call'], ['📍', '位置', 'loc'], ['🧧', '红包', 'hb'], ['⇄', '转账', 'zz'], ['👤', '名片', 'card'], ['⭐', '收藏', 'fav']];
    return `<div class="wx-in">${q ? `<div class="wx-qbar">${esc(q.from === 'me' ? G.meName() : nameOf(q.from))}：${esc(preview(t, q)).slice(0, 30)}<i onclick="gysWx.unquote('${t.id}')">✕</i></div>` : ''}<div class="wx-inr"><span onclick="gysWx.voice('${t.id}')">🎙️</span><input id="wxIn" placeholder="" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysWx.send('${t.id}')" onfocus="gysWx.__closePanels()"><span onclick="gysWx.emo()">😊</span><span class="wx-plusb" onclick="gysWx.plus()">＋</span><b class="wx-send" onclick="gysWx.send('${t.id}')">发送</b></div>
      ${EMO ? `<div class="wx-emo">${EM.map(e => `<span onclick="gysWx.sendStk('${t.id}','${e}')">${e}</span>`).join('')}<span onclick="gysWx.stkAsk('${t.id}')">✏️ 描述一个表情包</span></div>` : ''}
      ${PLUS ? `<div class="wx-plus">${PL.map(([i, n, k]) => `<span onclick="gysWx.act('${t.id}','${k}')"><i>${i}</i><em>${n}</em></span>`).join('')}</div>` : ''}</div>`;
}
W.__closePanels = () => { if (PLUS || EMO) { PLUS = 0; EMO = 0; G.repaint(APP); setTimeout(() => { const i = document.getElementById('wxIn'); if (i) i.focus(); }, 30); } };
W.plus = () => { PLUS = !PLUS; EMO = 0; G.repaint(APP); };
W.emo = () => { EMO = !EMO; PLUS = 0; G.repaint(APP); };
W.unquote = id => { delete QUOTE[id]; G.repaint(APP); };
W.send = id => { const t = thOf(id), inp = document.getElementById('wxIn'); if (!t || !inp) return; const tx = inp.value.trim(); if (!tx) return; inp.value = ''; addMsg(t, { from: 'me', text: tx.slice(0, 2000), quote: QUOTE[id] || '' }); delete QUOTE[id]; G.repaint(APP); afterSend(t); };
W.sendStk = (id, e) => { const t = thOf(id); addMsg(t, { from: 'me', t: 'sticker', text: e }); EMO = 0; G.repaint(APP); afterSend(t); };
W.stkAsk = async id => { const d = await G.input('什么样的表情包？（比如：一只猫猫探头）', ''); if (d) W.sendStk(id, X.plain(d).slice(0, 30)); };
W.voice = async id => { const t = thOf(id); const tx = await G.input('🎙️ 说点什么（会变成一条语音）', ''); if (!tx) return; addMsg(t, { from: 'me', t: 'voice', text: X.plain(tx).slice(0, 300), sec: Math.max(1, Math.round(tx.length / 4)) }); G.repaint(APP); afterSend(t); };
W.play = (tid, mid) => { const t = thOf(tid), m = t && msgOf(t, mid); if (!m) return; m.showTx = !m.showTx; saveD(); G.repaint(APP); const c = charOfW(m.from); if (c && m.showTx && X.speak) try { X.speak(c, m.text); } catch (e) {} };
W.act = async (id, k) => {
    const t = thOf(id); PLUS = 0; const who = t.kind === 'dm' ? t.who : '';
    if (k === 'img') return G.pickImgs(9, L => { L.forEach(src => addMsg(t, { from: 'me', t: 'img', img: src })); G.repaint(APP); afterSend(t); });
    if (k === 'shot') { const d = await G.input('拍了什么？（用文字描述这张照片）', ''); if (!d) return G.repaint(APP); addMsg(t, { from: 'me', t: 'img', desc: X.plain(d).slice(0, 40) }); G.repaint(APP); return afterSend(t); }
    if (k === 'loc') { const d = await G.input('发送位置：在哪？', ''); if (!d) return G.repaint(APP); addMsg(t, { from: 'me', t: 'loc', text: X.plain(d).slice(0, 30) }); G.repaint(APP); return afterSend(t); }
    if (k === 'hb' || k === 'zz') {
        const a = Number(await G.input(k === 'hb' ? '红包金额（元）' : '转账金额（元）', k === 'hb' ? '6.66' : '52')); if (!(a > 0)) return G.repaint(APP);
        const note = await G.input(k === 'hb' ? '红包上写的话' : '添加转账说明（可空）', k === 'hb' ? '恭喜发财，大吉大利' : ''); if (note === null || note === undefined) return G.repaint(APP);
        const wl = wallet(); if (wl && wl.spend) { try { await wl.spend('me', a, (k === 'hb' ? '微信红包给' : '微信转账给') + thName(t)); } catch (e) {} }
        addMsg(t, { from: 'me', t: k, amt: Math.round(a * 100) / 100, note: X.plain(note || '').slice(0, 20) }); G.repaint(APP); return afterSend(t);
    }
    if (k === 'card') { const L = G.chars().map(c => 'c:' + c.id).concat(G.npcs().map(n => 'n:' + n.id)).filter(w => w !== who); const i = await G.sheet(L.map(nameOf), '发送谁的名片？'); if (i == null) return G.repaint(APP); addMsg(t, { from: 'me', t: 'card', card: L[i] }); G.repaint(APP); return afterSend(t); }
    if (k === 'fav') { if (!D.favs.length) return X.toast('收藏是空的', '长按消息「收藏」'); const i = await G.sheet(D.favs.slice(0, 20).map(f => f.text.slice(0, 30)), '发送收藏'); if (i == null) return G.repaint(APP); addMsg(t, { from: 'me', text: D.favs[i].text }); G.repaint(APP); return afterSend(t); }
    if (k === 'call' || k === 'vcall') { if (t.kind !== 'dm' || !charOfW(who)) return X.toast('只能和 TA 一对一通话', ''); return W.call(who, k === 'vcall'); }
};
W.hb = async (tid, mid) => {
    const t = thOf(tid), m = t && msgOf(t, mid); if (!m || m.st) return;
    if (m.from === 'me') return X.toast(m.t === 'hb' ? '等对方领取' : '等对方收款', '');
    const ok = await G.confirm(m.t === 'hb' ? `${nameOf(m.from)}的红包\n${m.note || ''}\n¥${Number(m.amt).toFixed(2)}` : `收款 ¥${Number(m.amt).toFixed(2)}？`); if (!ok) return;
    m.st = 'open'; const wl = wallet(); if (wl && wl.earn) { try { await wl.earn('me', m.amt, (m.t === 'hb' ? '微信红包来自' : '微信转账来自') + nameOf(m.from)); } catch (e) {} }
    addMsg(t, { from: 'sys', t: 'sys', text: m.t === 'hb' ? `你领取了${nameOf(m.from)}的红包` : '你已收款' }); G.repaint(APP);
};
// 长按：引用 / 复制 / 收藏 / 撤回 / 删除
function bindLong(r, t) {
    r.querySelectorAll('.wx-row[data-mid]').forEach(el => { if (el.__lp) return; el.__lp = 1; let tm = null; const go = () => W.msgMenu(t.id, el.getAttribute('data-mid')); el.addEventListener('contextmenu', e => { e.preventDefault(); go(); }); el.addEventListener('touchstart', () => { tm = setTimeout(go, 520); }, { passive: true }); ['touchend', 'touchmove'].forEach(ev => el.addEventListener(ev, () => clearTimeout(tm), { passive: true })); });
}
W.msgMenu = async (tid, mid) => {
    const t = thOf(tid), m = t && msgOf(t, mid); if (!m) return;
    const ops = ['复制', '引用', '收藏'].concat(m.from === 'me' && Date.now() - m.at < 120e3 ? ['撤回'] : [], m.t === 'voice' ? ['转文字'] : [], ['删除']);
    const i = await G.sheet(ops); if (i == null) return; const op = ops[i];
    if (op === '复制') { try { navigator.clipboard.writeText(m.text || m.desc || ''); X.toast('已复制', ''); } catch (e) {} }
    else if (op === '引用') { QUOTE[tid] = mid; G.repaint(APP); }
    else if (op === '收藏') { D.favs.unshift({ id: G.uid('f'), from: m.from, text: m.text || m.desc || preview(t, m), at: Date.now() }); X.toast(X.v('已收藏', '收藏好了'), ''); }
    else if (op === '撤回') { m.recalled = Date.now(); const c = charOfW(t.who); if (c && Math.random() < 0.6) setTimeout(() => taReply(t, `她刚撤回了一条消息${Math.random() < 0.5 ? '（你看到了，写的是「' + (m.text || '') + '」）' : '（你没看清写了什么）'}`), 1500); }
    else if (op === '转文字') { m.showTx = 1; }
    else if (op === '删除') { t.msgs = t.msgs.filter(x => x !== m); }
    saveD(); G.repaint(APP);
};
W.reEdit = (tid, mid) => { const t = thOf(tid), m = t && msgOf(t, mid); const i = document.getElementById('wxIn'); if (m && i) { i.value = m.text; i.focus(); } };
W.pat = (tid, w) => {
    const t = thOf(tid); if (!t) return;
    if (w === 'me') { addMsg(t, { from: 'me', t: 'pat', text: `我拍了拍自己${D.pat.me || ''}` }); G.repaint(APP); return; }
    addMsg(t, { from: 'me', t: 'pat', text: `我拍了拍「${nameOf(w)}」${D.pat[w] || ''}` }); G.repaint(APP);
    if (t.kind === 'dm' && Math.random() < 0.8) setTimeout(() => taReply(t, '她刚拍了拍你'), 1500);
};
W.patSet = async () => { const v = await G.input('拍一拍后面加的话（比如：的小脑袋）', D.pat.me || ''); if (v === null || v === undefined) return; D.pat.me = X.plain(v).slice(0, 16); saveD(); G.repaint(APP); };
W.info = id => { const t = thOf(id); if (!t) return; if (t.kind === 'dm') return W.card(t.who); G.push(APP, { title: '聊天信息', html: () => `<div class="wx-gm">${t.members.map(w => `<span onclick="gysWx.card('${w}')">${wav(w, 50)}<i>${esc(nameOf(w))}</i></span>`).join('')}<span onclick="gysWx.gAdd('${id}')"><b>＋</b><i>邀请</i></span></div><div class="wx-cells"><div onclick="gysWx.gName('${id}')">群聊名称<em>${esc(t.name || '未命名')}</em></div><div onclick="gysWx.toggle('${id}','mute')">消息免打扰<em>${t.mute ? '开' : '关'}</em></div><div onclick="gysWx.toggle('${id}','pin')">置顶聊天<em>${t.pin ? '开' : '关'}</em></div></div><div class="wx-cells"><div class="red" onclick="gysWx.leave('${id}')">删除并退出</div></div>` }); };
W.toggle = (id, k) => { const t = thOf(id); t[k] = !t[k]; saveD(); G.repaint(APP); };
W.gName = async id => { const t = thOf(id); const v = await G.input('群聊名称', t.name || ''); if (v === null || v === undefined) return; t.name = X.plain(v).slice(0, 20); addMsg(t, { from: 'sys', t: 'sys', text: `你修改群名为“${t.name}”` }); G.repaint(APP); };
W.gAdd = async id => { const t = thOf(id); const L = G.chars().map(c => 'c:' + c.id).concat(G.npcs().map(n => 'n:' + n.id)).filter(w => !t.members.includes(w)); if (!L.length) return; const i = await G.sheet(L.map(nameOf), '邀请谁？'); if (i == null) return; t.members.push(L[i]); addMsg(t, { from: 'sys', t: 'sys', text: `你邀请"${nameOf(L[i])}"加入了群聊` }); G.repaint(APP); };
W.leave = async id => { if (!(await G.confirm('删除并退出这个群？'))) return; delete D.th[id]; saveD(); G.back(APP); G.back(APP); };
W.newGroup = async () => {
    const L = G.chars().map(c => 'c:' + c.id).concat(G.npcs().map(n => 'n:' + n.id)); if (L.length < 1) return X.toast('还没有人', '');
    const sel = []; for (;;) { const i = await G.sheet(L.map(w => (sel.includes(w) ? '✅ ' : '⬜ ') + nameOf(w)).concat(['完成（' + sel.length + '）']), '选择联系人'); if (i == null) return; if (i === L.length) break; const w = L[i]; const k = sel.indexOf(w); if (k >= 0) sel.splice(k, 1); else sel.push(w); }
    if (!sel.length) return; const id = 'g_' + G.uid(''); D.th[id] = { id, kind: 'group', who: '', members: sel, name: '', msgs: [], at: Date.now(), unread: 0, pin: false, mute: false };
    addMsg(D.th[id], { from: 'sys', t: 'sys', text: `你邀请${sel.map(nameOf).join('、')}加入了群聊` }); W.open(id); setTimeout(() => groupReply(D.th[id], '刚建好群，大家打个招呼'), 1500);
};
W.groupsPage = () => G.push(APP, { title: '群聊', html: () => `<div class="wx-cells">${Object.values(D.th).filter(t => t.kind === 'group').map(t => `<div onclick="gysWx.open('${t.id}')"><span class="wx-gav">${t.members.slice(0, 4).map(w => G.av(APP, w, 18)).join('')}</span>${esc(thName(t))}</div>`).join('') || '<div>还没有群聊</div>'}</div>` });
W.openCard = (tid, mid) => { const t = thOf(tid), m = t && msgOf(t, mid), go = m && m.card && m.card.go; if (!go || typeof window[go.fn] !== 'function') return X.toast('打不开', '那个软件没开 / 原帖不在了'); G.close(APP); G.runGo(go); };
// 别的软件分享进来（GYS.share 用）
W.shareIn = (who, card, note, from) => { const t = dmOf(who); from = from || 'me'; const c = Object.assign({}, card, { img: G.cardImg(card.img), text: String(card.text || '').slice(0, 400) }); addMsg(t, { from, t: 'post', card: c }); if (note) addMsg(t, { from, text: X.plain(note).slice(0, 500) }); if (from === 'me') afterSend(t); else if (!isViewing(t.id)) t.unread = (t.unread || 0) + 1; saveD(); G.repaint(APP); return t; };

/* ---------------- 通话 ---------------- */
let CALL = null;
W.call = (w, video) => {
    const c = charOfW(w); if (!c) return; CALL = { w, video, t0: 0, lines: [], ring: 1 };
    G.push(APP, { id: 'call', title: '', cls: 'wx-callb', html: () => callHtml(), foot: () => CALL && !CALL.ring ? `<div class="wx-cin"><input id="wxCallIn" placeholder="说点什么…" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysWx.callSay()"><span onclick="gysWx.callSay()">说</span></div>` : '' });
    setTimeout(async () => { if (!CALL) return; if (Math.random() < 0.08) { CALL.missed = 1; return W.hang(); } CALL.ring = 0; CALL.t0 = Date.now(); G.repaint(APP); await callStep('刚接通，先开口。'); }, G.rnd(2500, 5000));
    clearInterval(W.__ct); W.__ct = setInterval(() => { if (!CALL) return clearInterval(W.__ct); const e = document.querySelector('#gys_wechat .wx-call em'); if (e && CALL.t0) e.textContent = durS((Date.now() - CALL.t0) / 1000); }, 1000);
};
function callHtml() { if (!CALL) return ''; const w = CALL.w; return `<div class="wx-call${CALL.video ? ' v' : ''}" style="${CALL.video ? `background-image:url('${G.avSrc(APP, w)}')` : ''}">${wav(w, 96)}<b>${esc(nameOf(w))}</b><em>${CALL.ring ? (CALL.video ? '等待对方接受邀请…' : '等待对方接听…') : durS((Date.now() - CALL.t0) / 1000)}</em><div class="wx-cl">${CALL.lines.slice(-6).map(l => `<p class="${l.me ? 'me' : ''}">${esc(l.t)}</p>`).join('')}</div><span class="wx-hang" onclick="gysWx.hang()">📞</span></div>`; }
async function callStep(why) { const c = charOfW(CALL && CALL.w); if (!c || BUSY.call) return; BUSY.call = 1; try { const r = X.plain(await X.ask(P('wx.call', DEF_CALL, { 我是谁: X.who(c), 类型: CALL.video ? '视频通话（你看得到她，她也看得到你）' : '语音通话', 情况: why || '', 记录: CALL.lines.slice(-10).map(l => (l.me ? '她' : '你') + '：' + l.t).join('\n') || '（刚接通）' })) || '').slice(0, 200); if (r && CALL) { CALL.lines.push({ t: r }); G.repaint(APP); if (X.speak) try { X.speak(c, r); } catch (e) {} } } catch (e) {} finally { BUSY.call = 0; } }
W.callSay = async () => { const i = document.getElementById('wxCallIn'); if (!i || !CALL) return; const t = i.value.trim(); if (!t) return; i.value = ''; CALL.lines.push({ me: 1, t }); G.repaint(APP); await callStep(''); };
W.hang = () => { if (!CALL) return; const t = dmOf(CALL.w), sec = CALL.t0 ? Math.round((Date.now() - CALL.t0) / 1000) : 0; addMsg(t, { from: 'me', t: 'call', video: CALL.video, sec, lines: CALL.lines.slice(-20) }); if (X.stopSpeak) try { X.stopSpeak(); } catch (e) {} const missed = CALL.missed; CALL = null; clearInterval(W.__ct); if (G.top(APP) && G.top(APP).id === 'call') G.back(APP); else G.repaint(APP); if (missed) { X.toast('对方无应答', ''); setTimeout(() => taReply(t, '她刚给你打微信电话你没接到'), 2000); } };

/* ---------------- 通讯录：名片 ---------------- */
W.card = w => {
    if (w === 'me') return W.editMe();
    G.push(APP, { id: 'card_' + w, title: '', html: () => { const p = G.prof(APP, w), s = statusOf(w), b = G.base(w) || {}, ms = moments().filter(m => m.who === w).slice(0, 3);
        return `<div class="wx-cardp">${wav(w, 64)}<div><b>${esc(nameOf(w))}</b>${D.remark[w] ? `<small>昵称：${esc(G.nick(APP, w))}</small>` : ''}<small>微信号：${esc(p.handle || 'wxid_' + String(w).replace(/\W/g, '').slice(-8))}</small>${p.loc ? `<small>地区：${esc(p.loc)}</small>` : ''}${s ? `<span class="wx-st">${esc(s.ico)} ${esc(s.t)}</span>` : ''}</div></div>
          <div class="wx-cells"><div onclick="gysWx.remark('${w}')">设置备注和标签<em>${esc(D.remark[w] || '')}</em></div><div onclick="gysWx.patSetOf('${w}')">拍一拍<em>${esc(D.pat[w] || '')}</em></div></div>
          <div class="wx-cells"><div onclick="gysWx.moments('${w}')">朋友圈<em>${ms.map(m => esc(m.text.slice(0, 6))).join(' · ')}</em></div>${p.bio ? `<div>个性签名<em>${esc(p.bio)}</em></div>` : ''}</div>
          <div class="wx-cells wx-cact"><div onclick="gysWx.open('${w}')">💬 发消息</div>${charOfW(w) ? `<div onclick="gysWx.call('${w}',false)">📞 语音通话</div><div onclick="gysWx.call('${w}',true)">📹 视频通话</div>` : ''}<div onclick="GYS.editProf('wechat','${w}')">✏️ 改 TA 的资料</div></div>`; } });
};
W.remark = async w => { const v = await G.input('备注名（空着就用昵称）', D.remark[w] || ''); if (v === null || v === undefined) return; D.remark[w] = X.plain(v).slice(0, 20); if (!D.remark[w]) delete D.remark[w]; saveD(); G.repaint(APP); };
W.patSetOf = async w => { const v = await G.input('拍一拍 TA 后面加的话', D.pat[w] || ''); if (v === null || v === undefined) return; D.pat[w] = X.plain(v).slice(0, 16); saveD(); G.repaint(APP); };
W.editMe = () => G.editProf(APP, 'me');
const ST_OPTS = [['🎧', '听歌'], ['📚', '学习中'], ['💼', '搬砖中'], ['😴', '睡觉'], ['🎮', '打游戏'], ['🏃', '运动'], ['☕', '摸鱼'], ['🍜', '干饭'], ['🌧️', 'emo'], ['💭', '想人']];
W.setStatus = async () => { const i = await G.sheet(ST_OPTS.map(([a, b]) => a + ' ' + b).concat(['✏️ 自己写', '清除状态']), '设个状态（24 小时）'); if (i == null) return; if (i === ST_OPTS.length + 1) delete D.status.me; else if (i === ST_OPTS.length) { const v = await G.input('状态', ''); if (!v) return; D.status.me = { ico: '💬', t: X.plain(v).slice(0, 12), at: Date.now() }; } else D.status.me = { ico: ST_OPTS[i][0], t: ST_OPTS[i][1], at: Date.now() }; saveD(); G.repaint(APP); };

/* ---------------- 朋友圈（TA 们的跟「TA 的手机」里同一份） ---------------- */
// 一条：{ id, who, text, imgs:[desc|url], loc, at, likes:[who], cm:[{by:who, t, to}] }，TA 的存在 window.gyPeerLog（kind:'moment'）
const peerLog = () => Array.isArray(window.gyPeerLog) ? window.gyPeerLog : [];
function moments() {
    const L = D.my.map(m => Object.assign({ src: 'me' }, m));
    peerLog().filter(e => e && e.kind === 'moment' && e.moment).forEach(e => { e.wx = e.wx || { likes: [], cm: [] }; L.push({ src: 'peer', ref: e, id: e.id, who: 'c:' + e.aId, text: e.moment, imgs: e.wx.imgs || [], loc: e.wx.loc || '', at: e.at, likes: e.wx.likes, cm: (e.cm || []).map(x => ({ by: whoName(x.by), t: x.t, to: '' })).concat(e.wx.cm) }); });
    return L.sort((a, b) => b.at - a.at);
}
const whoName = n => { const c = G.chars().find(x => x.name === n); return c ? 'c:' + c.id : 'x:' + n; };
const momOf = id => moments().find(m => m.id === id);
const newMoments = () => moments().some(m => m.who !== 'me' && m.at > (D.moSeen || 0));
let MOW = '';
W.moments = w => { MOW = w || ''; D.moSeen = Date.now(); saveD(); G.push(APP, { id: 'moments', title: '', cls: 'wx-mob', html: () => momentsHtml() }); };
function momentsHtml() {
    const me = G.prof(APP, 'me'), who = MOW || 'me', p = G.prof(APP, who), L = moments().filter(m => !MOW || m.who === MOW);
    return `<div class="wx-mo"><div class="wx-mocv" style="${p.bg ? `background-image:url('${p.bg}')` : ''}" onclick="${who === 'me' ? "gysWx.editMe()" : ''}"><span class="wx-mob-b" onclick="event.stopPropagation();GYS.back('wechat')">‹</span>${!MOW || MOW === 'me' ? `<span class="wx-mob-c" onclick="event.stopPropagation();gysWx.post()">📷</span>` : ''}<div class="wx-mome"><b>${esc(nameOf(who))}</b>${wav(who, 64)}</div></div>${p.bio ? `<p class="wx-mosig">${esc(p.bio)}</p>` : ''}
      ${L.map(m => `<div class="wx-mi">${wav(m.who, 42)}<div><b onclick="gysWx.card('${m.who}')">${esc(nameOf(m.who))}</b><p>${esc(m.text)}</p>${m.imgs && m.imgs.length ? `<div class="wx-moimg n${Math.min(3, m.imgs.length)}">${m.imgs.slice(0, 9).map(x => /^(data:|https?:|gylive:|blob:)/.test(x) ? `<span style="background-image:url('${x}')" onclick="GYS.imgView('${x}')"></span>` : `<span class="t" style="background:${bgOf(x)}"><em>${esc(x)}</em></span>`).join('')}</div>` : ''}${m.loc ? `<small class="wx-moloc">${esc(m.loc)}</small>` : ''}<div class="wx-mot"><small>${G.ago(m.at)}${m.who === 'me' ? ` <a onclick="gysWx.moDel('${m.id}')">删除</a>` : ''}</small><span onclick="gysWx.moAct('${m.id}')">··</span></div>${(m.likes.length || m.cm.length) ? `<div class="wx-mofb">${m.likes.length ? `<div class="lk">♡ ${m.likes.map(w => esc(nameOf(w))).join('，')}</div>` : ''}${m.cm.map(c => `<p onclick="gysWx.moCmt('${m.id}','${c.by}')"><b>${esc(nameOf(c.by))}</b>${c.to ? '回复<b>' + esc(nameOf(c.to)) + '</b>' : ''}：${esc(c.t)}</p>`).join('')}</div>` : ''}</div></div>`).join('') || '<div class="gys-empty">朋友圈还没有内容</div>'}</div>`;
}
function momWrite(m) { if (m.src === 'me') { const x = D.my.find(y => y.id === m.id); if (x) { x.likes = m.likes; x.cm = m.cm; } } else { const e = m.ref; e.wx = e.wx || { likes: [], cm: [] }; e.wx.likes = m.likes; e.wx.cm = m.cm.filter(c => c.wx); try { if (typeof saveAllData === 'function') saveAllData(); } catch (er) {} } saveD(); }
W.moAct = async id => { const m = momOf(id); if (!m) return; const lk = m.likes.includes('me'); const i = await G.sheet([lk ? '取消赞' : '♡ 赞', '💬 评论'], ''); if (i === 0) { if (lk) m.likes = m.likes.filter(x => x !== 'me'); else m.likes.push('me'); momWrite(m); G.repaint(APP); } else if (i === 1) W.moCmt(id, ''); };
W.moCmt = async (id, to) => {
    const m = momOf(id); if (!m) return; if (to === 'me') return; const t = await G.input(to ? '回复 ' + nameOf(to) : '评论', ''); if (!t) return;
    m.cm.push({ by: 'me', t: X.plain(t).slice(0, 200), to: to || '', wx: 1 }); momWrite(m); G.repaint(APP);
    const c = charOfW(to) || (m.who !== 'me' ? charOfW(m.who) : null); if (!c) return;
    setTimeout(async () => { const r = X.plain(await X.ask(`${X.who(c)}\n微信朋友圈${m.who === 'c:' + c.id ? '你发的「' + m.text + '」' : nameOf(m.who) + ' 发的「' + m.text + '」'}下面，她${to ? '回复你' : '评论'}：「${t}」。你回她一句（朋友圈评论区，共同好友也看得到，短）。只写那一句。`) || '').slice(0, 120); if (!r) return; const mm = momOf(id); if (!mm) return; mm.cm.push({ by: 'c:' + c.id, t: r, to: 'me', wx: 1 }); momWrite(mm); G.repaint(APP); G.notify(APP, c, `💚 <b>${X.esc(c.name)}</b> 回复了你`, r, X.go('gysWechatOpenMoments', '')); }, G.rnd(4, 15) * 1000);
};
W.moDel = async id => { if (!(await G.confirm('删除这条朋友圈？'))) return; D.my = D.my.filter(x => x.id !== id); saveD(); G.repaint(APP); };
W.post = async () => {
    const text = await G.input('这一刻的想法…', ''); if (text === null || text === undefined) return;
    const imgs = await new Promise(res => { G.sheet(['🖼️ 配几张图', '不配图'], '').then(i => { if (i === 0) G.pickImgs(9, L => res(L)); else res([]); }); });
    if (!String(text).trim() && !imgs.length) return;
    const loc = await G.input('所在位置（可空）', ''); const m = { id: G.uid('mo'), who: 'me', text: X.plain(text).slice(0, 500), imgs, loc: X.plain(loc || '').slice(0, 20), at: Date.now(), likes: [], cm: [] };
    D.my.unshift(m); saveD(); G.repaint(APP); X.toast(X.v('发表了', '发到朋友圈了'), '');
    G.chars().forEach(c => { setTimeout(async () => { const mm = D.my.find(x => x.id === m.id); if (!mm) return; if (!mm.likes.includes('c:' + c.id)) mm.likes.push('c:' + c.id); if (Math.random() < 0.7) { const r = X.plain(await X.ask(`${X.who(c)}\n她发了一条微信朋友圈：「${m.text}」${m.imgs.length ? '（配了 ' + m.imgs.length + ' 张图）' : ''}${m.loc ? '，定位：' + m.loc : ''}。你点了赞，在下面评论一句（共同好友都看得到，按你们的关系）。只写那一句。`) || '').slice(0, 120); if (r) mm.cm.push({ by: 'c:' + c.id, t: r, to: '', wx: 1 }); } saveD(); G.repaint(APP); G.notify(APP, c, `💚 <b>${X.esc(c.name)}</b> ${mm.cm.some(x => x.by === 'c:' + c.id) ? '评论' : '赞'}了你的朋友圈`, (mm.cm.filter(x => x.by === 'c:' + c.id).slice(-1)[0] || {}).t || '♡', X.go('gysWechatOpenMoments', '')); }, G.rnd(8, 90) * 1000); });
};
async function taMoment(c) {
    const o = X.json(await X.ask(P('wx.moment', DEF_MOMENT, { 我是谁: X.who(c), 最近: X.recent(c, 8) || '（最近没怎么聊）' }))); if (!o || !o.text) return null;
    if (!Array.isArray(window.gyPeerLog)) window.gyPeerLog = [];
    const e = { id: 'pe_m' + Date.now().toString(36), at: Date.now(), kind: 'moment', aId: c.id, bId: null, aName: c.name, bName: '', summary: '发了条朋友圈', lines: [], moment: X.plain(o.text).slice(0, 300), cm: [], wx: { imgs: (o.imgs || []).filter(Boolean).slice(0, 9).map(x => X.plain(x).slice(0, 20)), loc: X.plain(o.loc || '').slice(0, 20), likes: [], cm: [] } };
    window.gyPeerLog.push(e); try { if (typeof saveAllData === 'function') saveAllData(); } catch (er) {} return e;
}

/* ---------------- 公众号（TA 自己的号） ---------------- */
const subOf = w => D.subs.find(s => s.who === w);
function ensureSub(c) { const w = 'c:' + c.id; let s = subOf(w); if (!s) { s = { id: G.uid('gz'), who: w, name: c.name + '的小站', arts: [], fans: G.rnd(30, 3000), sub: true }; D.subs.push(s); saveD(); } return s; }
W.subsPage = () => G.push(APP, { title: '公众号', right: G.chars().length ? `<span onclick="gysWx.askArt()">✍️ 叫 TA 写</span>` : '', html: () => { const A = D.subs.filter(s => s.sub).flatMap(s => s.arts.map(a => ({ s, a }))).sort((x, y) => y.a.at - x.a.at); return `<div class="wx-sec">订阅号消息</div>${A.map(({ s, a }) => `<div class="wx-art" onclick="gysWx.art('${s.id}','${a.id}')"><div><small>${esc(s.name)} · ${G.ago(a.at)}</small><b>${esc(a.title)}</b><p>${esc(a.digest || '')}</p></div><span style="background:${bgOf(a.title)}">📰</span></div>`).join('') || '<div class="gys-empty">TA 们的公众号写了文章会出现在这里</div>'}<div class="wx-sec">我关注的</div><div class="wx-cells">${D.subs.map(s => `<div onclick="gysWx.subRen('${s.id}')"><span class="wx-ci" style="background:#2782d7">📰</span>${esc(s.name)}<em>${s.arts.length} 篇 · ${G.fmtN(s.fans)} 关注</em></div>`).join('')}</div>`; } });
W.art = (sid, aid) => { const s = D.subs.find(x => x.id === sid), a = s && s.arts.find(x => x.id === aid); if (!a) return; a.reads = (a.reads || 0) + 1; saveD(); G.push(APP, { title: '', cls: 'wx-artb', html: () => `<div class="wx-artp"><h2>${esc(a.title)}</h2><small>${esc(s.name)} · ${new Date(a.at).toLocaleDateString()}</small>${String(a.body || '').split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('')}<div class="wx-artf"><span>阅读 ${G.fmtN(a.reads * 37 + G.rnd(10, 99))}</span><span class="${a.liked ? 'on' : ''}" onclick="gysWx.artLike('${sid}','${aid}')">👍 ${a.liked ? '已赞' : '赞'}</span><span onclick="gysWx.artShare('${sid}','${aid}')">↗ 分享</span></div></div>` }); };
W.artLike = (sid, aid) => { const s = D.subs.find(x => x.id === sid), a = s && s.arts.find(x => x.id === aid); if (!a) return; a.liked = !a.liked; saveD(); G.repaint(APP); };
W.artShare = (sid, aid) => { const s = D.subs.find(x => x.id === sid), a = s && s.arts.find(x => x.id === aid); if (a) G.share({ app: APP, kind: '公众号文章', by: s.who, byName: s.name, title: a.title, text: a.digest || '', img: '', at: a.at, go: X.go('gysWechatOpenArt', sid, aid) }); };
W.subRen = async id => { const s = D.subs.find(x => x.id === id); if (!s) return; const v = await G.input('公众号名字', s.name); if (v) { s.name = X.plain(v).slice(0, 20); saveD(); G.repaint(APP); } };
async function taArticle(c) { const s = ensureSub(c); const o = X.json(await X.ask(P('wx.article', DEF_ARTICLE, { 我是谁: X.who(c), 号名: s.name, 最近: X.recent(c, 8) || '（最近没怎么聊）' }))); if (!o || !o.title) return null; const a = { id: G.uid('ar'), title: X.plain(o.title).slice(0, 40), digest: X.plain(o.digest || '').slice(0, 80), body: String(o.body || '').replace(/<[^>]+>/g, '').slice(0, 3000), at: Date.now(), reads: 0 }; s.arts.unshift(a); saveD(); return { s, a }; }
W.askArt = async () => { const cs = G.chars(); let c = cs[0]; if (cs.length > 1) { const i = await G.sheet(cs.map(x => x.name), '叫谁写？'); if (i == null) return; c = cs[i]; } X.toast('TA 在写了', ''); const r = await taArticle(c); if (!r) return X.toast('没写出来', '再试一次'); G.repaint(APP); W.art(r.s.id, r.a.id); };

/* ---------------- 搜索 / 收藏 / 设置 ---------------- */
W.search = async () => { const q = await G.input('搜索聊天记录、联系人', ''); if (!q) return; const hits = []; Object.values(D.th).forEach(t => t.msgs.forEach(m => { if ((m.text || '').includes(q)) hits.push({ t, m }); })); const ppl = G.people().filter(w => w !== 'me' && nameOf(w).includes(q)); G.push(APP, { title: '搜索：' + esc(q), html: () => `${ppl.length ? `<div class="wx-sec">联系人</div><div class="wx-cells">${ppl.map(w => `<div onclick="gysWx.card('${w}')">${wav(w, 36)}<span class="wx-cn">${esc(nameOf(w))}</span></div>`).join('')}</div>` : ''}<div class="wx-sec">聊天记录（${hits.length}）</div><div class="wx-cells">${hits.slice(0, 60).map(({ t, m }) => `<div onclick="gysWx.open('${t.id}')">${wav(m.from === 'sys' ? t.who : m.from, 36)}<span class="wx-cn">${esc(thName(t))}<small>${esc(m.text).slice(0, 40)}</small></span></div>`).join('') || '<div>没找到</div>'}</div>` }); };
W.favsPage = () => G.push(APP, { title: '收藏', html: () => `<div class="wx-cells">${D.favs.map(f => `<div onclick="gysWx.favDel('${f.id}')"><span class="wx-cn">${esc(f.text)}<small>${esc(nameOf(f.from))} · ${G.ago(f.at)}</small></span></div>`).join('') || '<div>还没收藏，长按消息「收藏」</div>'}</div>` });
W.favDel = async id => { if (await G.confirm('删掉这条收藏？')) { D.favs = D.favs.filter(f => f.id !== id); saveD(); G.repaint(APP); } };
W.settings = () => G.push(APP, { title: '设置', html: () => `<label class="gys-f"><span>每个聊天最多留几条（${D.cfg.keep}）</span><select onchange="gysWx.__keep(this.value)">${[300, 800, 3000, 10000].map(n => `<option ${+D.cfg.keep === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label><div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysWx.export()">导出聊天记录（.txt）</span></div>` });
W.__keep = v => { D.cfg.keep = +v; saveD(); };
W.export = () => { const L = ['💚 微信聊天记录 ' + new Date().toLocaleString()]; Object.values(D.th).forEach(t => { L.push('', '【' + thName(t) + '】'); t.msgs.forEach(m => L.push(`${new Date(m.at).toLocaleString()} ${m.from === 'me' ? '我' : m.from === 'sys' ? '' : nameOf(m.from)}：${preview(t, m)}`)); }); const s = L.join('\n'); try { if (typeof saveTextFileForApp === 'function') return saveTextFileForApp(s, '微信聊天记录.txt'); } catch (e) {} const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'text/plain' })); a.download = '微信聊天记录.txt'; a.click(); };

G.app(APP, {
    tabs: [['chats', '💬', '微信', () => unreadAll() || ''], ['contacts', '👥', '通讯录'], ['discover', '🧭', '发现', () => newMoments() ? '•' : ''], ['me', '👤', '我']],
    head, render: t => t === 'contacts' ? contactsTab() : t === 'discover' ? discoverTab() : t === 'me' ? meTab() : chatsTab()
});
window.gysWechatOpen = tab => G.open(APP, tab);
window.gysWechatOpenThread = id => { G.open(APP, 'chats'); W.open(id); };
window.gysWechatOpenMoments = w => { G.open(APP, 'discover'); W.moments(w || ''); };
window.gysWechatOpenArt = (sid, aid) => { G.open(APP, 'discover'); W.art(sid, aid); };
G.badge.wechat = unreadAll;
try { localStorage.setItem('gyWxMode', '0'); } catch (e) {}   // 老「微信模式」关掉（换成这个软件了）

/* ---------------- 谷雨这边 ---------------- */
X.mini({ id: 'gysWechat', icon: '💚', title: '微信', desc: '单独的微信聊天、朋友圈、通讯录、公众号、红包转账、通话、群聊', cat: '软件', onOpen: () => G.open(APP) }, 'gysWechat');
const rare = (c, k, h) => Date.now() - ((D.last[k + c.id]) || 0) > h * 3600e3;
const mark = (c, k) => { D.last[k + c.id] = Date.now(); saveD(); };
X.action({ key: 'gys_wx_text', label: '在微信上给她发几条', hint: '随手的：看到什么想到她、一张照片、一个表情包、一条语音', need: c => rare(c, 't', 6), run: async c => {
    mark(c, 't'); const t = dmOf('c:' + c.id);
    const o = X.json(await X.ask(P('wx.text', DEF_TEXT, { 我是谁: X.who(c), 要求: '', 平时: G.recentAll(c, APP), 记录: recLines(t, 'c:' + c.id, 10) }))); if (!Array.isArray(o) || !o.length) return null;
    let first = null; o.slice(0, 4).forEach(x => { if (!x) return; let m = null; if (x.sticker) m = addMsg(t, { from: 'c:' + c.id, t: 'sticker', text: X.plain(x.sticker).slice(0, 30) }); if (x.photo) m = addMsg(t, { from: 'c:' + c.id, t: 'img', desc: X.plain(x.photo).slice(0, 40) }); if (x.text) m = addMsg(t, { from: 'c:' + c.id, t: x.voice ? 'voice' : 'text', text: X.plain(x.text).slice(0, 500), sec: x.voice ? Math.max(2, Math.round(String(x.text).length / 4)) : 0 }); if (m) { if (!first) first = m; if (!isViewing(t.id)) t.unread++; } });
    if (!first) return null; saveD(); G.repaint(APP); if (!t.mute) G.notify(APP, c, `💚 <b>${X.esc(nameOf('c:' + c.id))}</b>`, preview(t, first), X.go('gysWechatOpenThread', t.id));
    return { text: '在微信上给她发了：' + preview(t, first), selfNotified: true, jump: X.go('gysWechatOpenThread', t.id) };
} }, 'gysWechat');
X.action({ key: 'gys_wx_reply', label: '回她在微信上发的消息', hint: '刚才没顾上，现在回', need: c => { const t = D.th['c:' + c.id]; if (!t || BUSY[t.id]) return false; const l = t.msgs.filter(m => m.from !== 'sys').slice(-1)[0]; return !!(l && l.from === 'me' && Date.now() - l.at > 5 * 60e3); }, run: async c => { const t = D.th['c:' + c.id]; await taReply(t, '你刚才在忙，过了一会儿才看到她的消息'); return { text: '回了她的微信', selfNotified: true }; } }, 'gysWechat');
X.action({ key: 'gys_wx_moment', label: '发一条微信朋友圈', hint: '只有微信好友看得到', need: c => rare(c, 'm', 30), run: async c => { mark(c, 'm'); const e = await taMoment(c); if (!e) return null; G.notify(APP, c, `🌀 <b>${X.esc(c.name)}</b> 发了朋友圈`, e.moment.slice(0, 40), X.go('gysWechatOpenMoments', 'c:' + c.id)); return { text: '发了条微信朋友圈：' + e.moment.slice(0, 30), selfNotified: true, jump: X.go('gysWechatOpenMoments', 'c:' + c.id) }; } }, 'gysWechat');
X.action({ key: 'gys_wx_like', label: '去她的微信朋友圈点赞评论', hint: '她发的朋友圈', need: c => D.my.some(m => Date.now() - m.at < 3 * 864e5 && !m.cm.some(x => x.by === 'c:' + c.id)), run: async c => {
    const m = D.my.find(m => Date.now() - m.at < 3 * 864e5 && !m.cm.some(x => x.by === 'c:' + c.id)); if (!m) return null;
    const r = X.plain(await X.ask(`${X.who(c)}\n她发了一条微信朋友圈：「${m.text}」。你点了赞，在下面评论一句（共同好友都看得到）。只写那一句。`) || '').slice(0, 120); if (!r) return null;
    if (!m.likes.includes('c:' + c.id)) m.likes.push('c:' + c.id); m.cm.push({ by: 'c:' + c.id, t: r, to: '', wx: 1 }); saveD();
    G.notify(APP, c, `💚 <b>${X.esc(c.name)}</b> 评论了你的朋友圈`, r, X.go('gysWechatOpenMoments', '')); return { text: '在她的朋友圈下面评论：' + r, selfNotified: true };
} }, 'gysWechat');
X.action({ key: 'gys_wx_pat', label: '在微信里拍了拍她', hint: '想她了 / 无聊了', need: c => rare(c, 'p', 12), run: async c => { mark(c, 'p'); const t = dmOf('c:' + c.id); addMsg(t, { from: 'c:' + c.id, t: 'pat', text: `「${nameOf('c:' + c.id)}」拍了拍我${D.pat.me || ''}` }); if (!isViewing(t.id)) t.unread++; saveD(); G.repaint(APP); G.notify(APP, c, `👋 <b>${X.esc(nameOf('c:' + c.id))}</b> 拍了拍你`, '', X.go('gysWechatOpenThread', t.id)); return { text: '在微信里拍了拍她', selfNotified: true }; } }, 'gysWechat');
X.action({ key: 'gys_wx_status', label: '改了一下自己的微信状态', hint: '她点开你的资料看得到', need: c => !statusOf('c:' + c.id) && rare(c, 's', 10), run: async c => { mark(c, 's'); const o = X.json(await X.ask(`${X.who(c)}\n你在设微信状态（24 小时，好友点开你的资料能看到）。按你现在在做的事 / 心情。只输出 JSON：{"ico":"一个 emoji","t":"状态（2~8 个字）"}`)); if (!o || !o.t) return null; D.status['c:' + c.id] = { ico: X.plain(o.ico || '💭').slice(0, 4), t: X.plain(o.t).slice(0, 12), at: Date.now() }; saveD(); G.repaint(APP); return { text: `把微信状态改成了「${o.ico} ${o.t}」`, selfNotified: true }; } }, 'gysWechat');
X.action({ key: 'gys_wx_article', label: '在自己的公众号写一篇推送', hint: '随笔 / 日记 / 你在乎的事', need: c => rare(c, 'a', 168), run: async c => { mark(c, 'a'); const r = await taArticle(c); if (!r) return null; G.notify(APP, c, `📰 <b>${X.esc(r.s.name)}</b> 更新了`, r.a.title, X.go('gysWechatOpenArt', r.s.id, r.a.id)); return { text: `在公众号「${r.s.name}」发了一篇：${r.a.title}`, selfNotified: true, jump: X.go('gysWechatOpenArt', r.s.id, r.a.id) }; } }, 'gysWechat');
X.action({ key: 'gys_wx_group', label: '在微信群里聊几句', hint: '群里的人自己聊起来', need: c => Object.values(D.th).some(t => t.kind === 'group' && t.members.includes('c:' + c.id)) && rare(c, 'g', 24), run: async c => { mark(c, 'g'); const t = Object.values(D.th).find(t => t.kind === 'group' && t.members.includes('c:' + c.id)); await groupReply(t, `${c.name}先起个话头`); if (!t.mute) G.notify(APP, c, `💚 <b>${X.esc(thName(t))}</b>`, '群里有新消息', X.go('gysWechatOpenThread', t.id)); return { text: '在微信群「' + thName(t) + '」里聊了几句', selfNotified: true }; } }, 'gysWechat');
X.today(() => { const d = X.day(); const rows = Object.values(D.th).map(t => { const L = t.msgs.filter(m => m.from !== 'sys' && X.day(new Date(m.at)) === d); return L.length ? { t: thName(t), x: `${L.length} 条 · ` + preview(t, L[L.length - 1]).slice(0, 26), go: X.go('gysWechatOpenThread', t.id) } : null; }).filter(Boolean); moments().filter(m => m.who !== 'me' && X.day(new Date(m.at)) === d).slice(0, 2).forEach(m => rows.push({ t: nameOf(m.who), x: '🌀 ' + m.text.slice(0, 24), go: X.go('gysWechatOpenMoments', m.who) })); return rows.length ? { title: '💚 微信', rows: rows.slice(0, 5) } : null; }, 'gysWechat');
X.widget('gysWxW', { n: '微信', sizes: ['s', 'm'], tap: () => G.open(APP), r: () => { const t = Object.values(D.th).filter(t => t.msgs.length).sort((a, b) => b.at - a.at)[0]; const u = unreadAll(); return `<div style="padding:10px;font-size:12px;line-height:1.6"><b style="color:#07c160">💚 微信</b>${u ? ` <span style="background:#fa5151;color:#fff;border-radius:9px;padding:0 6px">${u}</span>` : ''}<br>${t ? `${esc(thName(t))}：${esc(preview(t, t.msgs[t.msgs.length - 1])).slice(0, 30)}` : '还没有消息'}</div>`; } }, 'gysWechat');
X.mem({ k: 'gysWx', ico: '💚', n: 'TA 在微信说的', d: 'TA 在微信里发给你的（改了就是改内容，删了就没了）', items: c => (D.th['c:' + c.id] || { msgs: [] }).msgs.filter(m => m.from === 'c:' + c.id && (m.t === 'text' || m.t === 'voice')), text: m => m.text, edit: (m, v) => { m.text = String(v).slice(0, 2000); }, del: (c, i) => { const t = D.th['c:' + c.id]; if (!t) return; const L = t.msgs.filter(m => m.from === 'c:' + c.id && (m.t === 'text' || m.t === 'voice')); if (L[i]) t.msgs = t.msgs.filter(x => x !== L[i]); }, meta: m => new Date(m.at).toLocaleString(), save: () => saveD() }, 'gysWechat');
X.mem({ k: 'gysWxArt', ico: '📰', n: 'TA 的公众号文章', d: 'TA 在自己的公众号发的推送（改了就是改标题，删了就没了）', items: c => (subOf('c:' + c.id) || { arts: [] }).arts, text: a => a.title, edit: (a, v) => { a.title = String(v).slice(0, 40); }, del: (c, i) => { const s = subOf('c:' + c.id); if (s) s.arts.splice(i, 1); }, meta: a => G.ago(a.at), save: () => saveD() }, 'gysWechat');
X.ctx(id => {
    const c = X.char(id); if (!c) return ''; const t = D.th['c:' + c.id], L = [];
    if (t && t.msgs.length) L.push('微信里最近：\n' + t.msgs.filter(m => m.from !== 'sys').slice(-6).map(m => lineOf(t, m, 'c:' + c.id).slice(0, 80)).join('\n'));
    const st = statusOf('me'); if (st) L.push(`她的微信状态：${st.ico} ${st.t}`);
    const mo = D.my[0]; if (mo && Date.now() - mo.at < 2 * 864e5) L.push('她最近发的朋友圈：' + mo.text.slice(0, 40));
    return L.length ? `【微信（另一个软件，你记得）】${L.join('\n')}` : '';
}, 'gysWechat');
X.inj('gysWechat', [['微信', '微信：你们在微信上最近聊的、她的状态、她的朋友圈', '让 TA 在别处聊天时也记得微信里说过什么']]);
G.feedReg('wechat', () => D.subs.flatMap(s => s.arts.slice(0, 1).map(a => ({ app: APP, kind: '公众号文章', by: s.who, byName: s.name, title: a.title, text: a.digest || '', img: '', at: a.at, go: X.go('gysWechatOpenArt', s.id, a.id) }))).filter(x => Date.now() - x.at < 5 * 864e5));

X.css('gys-wechat-css', `
.gys-wechat{--gys-accent:#07c160;background:#ededed;color:#191919;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}body.dark-theme .gys-wechat{background:#111;color:#d5d5d5}
.gys-wechat .gys-tabs{background:#f7f7f7!important}body.dark-theme .gys-wechat .gys-tabs{background:#191919!important}.gys-wechat .gys-tb i{font-size:22px;filter:grayscale(1);opacity:.7}.gys-wechat .gys-tb.on i{filter:none;opacity:1}.gys-wechat .gys-tb.on{color:#07c160}
.wx-hd{background:#ededed!important;border:none!important}body.dark-theme .wx-hd{background:#111!important}
.wx-av{display:inline-flex;border-radius:5px;overflow:hidden;flex-shrink:0}.wx-av .gys-av{border-radius:5px!important;width:100%!important;height:100%!important}
.wx-srch{margin:4px 10px 8px;background:#fff;border-radius:6px;text-align:center;color:#b2b2b2;padding:8px;font-size:14px;cursor:pointer}body.dark-theme .wx-srch{background:#222}
.wx-ch{display:flex;align-items:center;gap:12px;padding:11px 14px;background:#fff;position:relative;cursor:pointer}.wx-ch.pin{background:#f7f7f7}body.dark-theme .wx-ch{background:#191919}body.dark-theme .wx-ch.pin{background:#222}.wx-ch+.wx-ch::before{content:"";position:absolute;top:0;left:74px;right:0;border-top:.5px solid #e5e5e5}body.dark-theme .wx-ch+.wx-ch::before{border-color:#2a2a2a}
.wx-ch>div{flex:1;min-width:0}.wx-ch b{display:block;font-size:16.5px;font-weight:400;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.wx-ch small{display:block;color:#999;font-size:13.5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-top:2px}.wx-ch em{font-style:normal;color:#b2b2b2;font-size:12px;align-self:flex-start;text-align:right;margin-top:3px}
.wx-red{position:absolute;left:52px;top:6px;min-width:18px;height:18px;line-height:18px;border-radius:9px;background:#fa5151;color:#fff;font-size:11px;text-align:center;padding:0 5px;box-sizing:border-box;font-style:normal}.wx-dot{position:absolute;left:56px;top:8px;width:9px;height:9px;border-radius:50%;background:#fa5151}.wx-dot.r{position:static;display:inline-block;margin-left:6px}
.wx-gav{width:48px;height:48px;border-radius:5px;background:#ddd;display:grid;grid-template-columns:1fr 1fr;gap:2px;padding:2px;box-sizing:border-box;flex-shrink:0}.wx-gav .gys-av{width:100%!important;height:100%!important;border-radius:2px!important;font-size:9px!important}
.wx-cells{background:#fff;margin-bottom:8px}body.dark-theme .wx-cells{background:#191919}.wx-cells>div{display:flex;align-items:center;gap:12px;padding:12px 16px;font-size:16px;cursor:pointer;position:relative}.wx-cells>div+div::before{content:"";position:absolute;top:0;left:56px;right:0;border-top:.5px solid #e5e5e5}body.dark-theme .wx-cells>div+div::before{border-color:#2a2a2a}.wx-cells em{margin-left:auto;font-style:normal;color:#999;font-size:13.5px;max-width:55%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.wx-cells .red{color:#fa5151;justify-content:center}
.wx-ci{width:28px;height:28px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;color:#fff;flex-shrink:0}
.wx-cn{display:flex;flex-direction:column;min-width:0}.wx-cn small{color:#999;font-size:12.5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.wx-sec{padding:10px 16px 6px;color:#777;font-size:13px}
.wx-me{display:flex;align-items:center;gap:16px;background:#fff;padding:30px 20px 26px;margin-bottom:8px;cursor:pointer}body.dark-theme .wx-me{background:#191919}.wx-me>div{flex:1}.wx-me b{font-size:21px;display:block}.wx-me small{color:#888;font-size:14px}.wx-me em{font-style:normal;color:#bbb;font-size:20px}
.wx-st{display:inline-block;margin-top:6px;border:.5px solid #ddd;border-radius:999px;padding:2px 10px;font-size:12.5px;color:#666}
.gys-root.gys-wechat .wx-tb{background:#ededed!important}body.dark-theme .gys-root.gys-wechat .wx-tb{background:#111!important}
.wx-th-h{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;padding:10px 12px;background:#ededed;border-bottom:.5px solid #d9d9d9}body.dark-theme .wx-th-h{background:#111;border-color:#222}.wx-th-h b{flex:1;text-align:center;font-size:17px;font-weight:500}.wx-th-h b small{display:block;font-size:11px;color:#888;font-weight:400}.wx-th-h>span:last-child{font-size:20px;cursor:pointer;padding:0 6px}
.gys-wechat .gys-hd{background:#ededed;border-bottom:.5px solid #d9d9d9}body.dark-theme .gys-wechat .gys-hd{background:#111;border-color:#222}.wx-sub{display:block;font-size:11px;color:#888;font-weight:400;line-height:1.2}
.wx-msgs{padding:6px 0 14px}.wx-tm{text-align:center;color:#b2b2b2;font-size:12px;margin:14px 0 6px}.wx-sys{text-align:center;color:#b2b2b2;font-size:12.5px;margin:8px 30px}.wx-sys a{color:#576b95;cursor:pointer}
.wx-row{display:flex;align-items:flex-start;gap:10px;padding:6px 12px}.wx-row.me{flex-direction:row-reverse}.wx-ra{cursor:pointer}.wx-bw{max-width:68%;display:flex;flex-direction:column;align-items:flex-start;gap:4px}.wx-row.me .wx-bw{align-items:flex-end}.wx-nm{font-size:12px;color:#999}
.wx-b{position:relative;background:#fff;border-radius:5px;padding:9px 12px;font-size:16px;line-height:1.45;word-break:break-word}.wx-b::before{content:"";position:absolute;left:-5px;top:13px;border:5px solid transparent;border-left:0;border-right-color:#fff}.wx-row.me .wx-b{background:#95ec69}.wx-row.me .wx-b::before{left:auto;right:-5px;border:5px solid transparent;border-right:0;border-left-color:#95ec69}body.dark-theme .wx-b{background:#2c2c2c}body.dark-theme .wx-b::before{border-right-color:#2c2c2c}body.dark-theme .wx-row.me .wx-b{background:#3eb575;color:#111}body.dark-theme .wx-row.me .wx-b::before{border-left-color:#3eb575}
.wx-voice{display:flex;gap:6px;align-items:center;cursor:pointer;min-width:70px}.wx-row.me .wx-voice{justify-content:flex-end}.wx-voice i{font-style:normal;font-weight:600;letter-spacing:-2px}.wx-voice em{font-style:normal;color:#555}
.wx-vtx{background:#fff;border-radius:5px;padding:6px 10px;font-size:14px;color:#333}
.wx-img{max-width:150px;max-height:200px;border-radius:5px;cursor:pointer}.wx-imgd{width:130px;height:160px;border-radius:5px;display:flex;align-items:flex-end;padding:8px;box-sizing:border-box}.wx-imgd em{font-style:normal;color:#fff;font-size:12px;text-shadow:0 1px 3px rgba(0,0,0,.4)}
.wx-stk b{font-size:64px;line-height:1}.wx-stk span{display:inline-block;max-width:150px;background:rgba(0,0,0,.05);border-radius:8px;padding:12px;font-size:13px;color:#666}
.wx-hb{width:220px;border-radius:6px;background:#fa9d3b;color:#fff;cursor:pointer;overflow:hidden}.wx-hb>div{display:flex;align-items:center;gap:10px;padding:12px}.wx-hb>div i{font-style:normal;font-size:30px}.wx-hb>div b{font-size:15px;font-weight:400;flex:1}.wx-hb>div small{font-size:12px;opacity:.85;display:block}.wx-hb>small{display:block;background:#fff;color:#999;font-size:11.5px;padding:3px 12px}.wx-hb.done{opacity:.65}.wx-hb.zz>div{flex-wrap:wrap}.wx-hb.zz>div i{width:34px;height:34px;border:1.5px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px}
.wx-loc,.wx-card,.wx-link{width:230px;background:#fff;border-radius:5px;overflow:hidden;cursor:pointer}body.dark-theme .wx-loc,body.dark-theme .wx-card,body.dark-theme .wx-link{background:#2c2c2c}.wx-loc b{display:block;padding:8px 10px 0;font-size:15px}.wx-loc small{display:block;padding:0 10px 6px;color:#999;font-size:12px}.wx-map{height:80px;background:linear-gradient(135deg,#d8e8d0,#c8dcef);display:flex;align-items:center;justify-content:center;font-size:26px}
.wx-card>div{display:flex;align-items:center;gap:10px;padding:12px}.wx-card b{font-size:16px;font-weight:400}.wx-card>small,.wx-link>small{display:block;border-top:.5px solid #eee;color:#999;font-size:11.5px;padding:4px 12px}
.wx-link>b{display:block;padding:10px 12px 4px;font-size:15px;font-weight:400;line-height:1.35}.wx-link>div{display:flex;gap:8px;padding:0 12px 10px}.wx-link p{flex:1;margin:0;font-size:12.5px;color:#999;max-height:4em;overflow:hidden}.wx-link span{width:46px;height:46px;flex-shrink:0;background:#eee center/cover;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:24px}
.wx-q{background:rgba(0,0,0,.05);color:#888;font-size:12.5px;border-radius:4px;padding:5px 8px;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.wx-in{background:#f7f7f7;border-top:.5px solid #ddd;padding:8px 8px calc(8px + env(safe-area-inset-bottom,0px))}body.dark-theme .wx-in{background:#1e1e1e;border-color:#2a2a2a}.wx-inr{display:flex;align-items:center;gap:8px}.wx-inr>span{font-size:22px;cursor:pointer}.wx-inr input{flex:1;border:none;border-radius:5px;padding:9px 10px;font-size:16px;background:#fff;color:inherit;outline:none}body.dark-theme .wx-inr input{background:#2c2c2c}.wx-send{white-space:nowrap;flex-shrink:0;background:#07c160;color:#fff;border-radius:5px;padding:7px 12px;font-weight:400;font-size:14px;cursor:pointer}.wx-plusb{width:28px;height:28px;border:1.5px solid currentColor;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px!important}
.wx-qbar{font-size:12.5px;color:#888;background:rgba(0,0,0,.05);border-radius:4px;padding:5px 8px;margin-bottom:6px;display:flex;justify-content:space-between}.wx-qbar i{font-style:normal;cursor:pointer}
.wx-emo{display:flex;flex-wrap:wrap;gap:6px;padding:10px 4px 2px;max-height:180px;overflow-y:auto}.wx-emo span{font-size:24px;cursor:pointer;padding:2px 4px}.wx-emo span:last-child{font-size:13px;color:#576b95;align-self:center}
.wx-plus{display:grid;grid-template-columns:repeat(4,1fr);gap:16px 6px;padding:16px 6px 6px}.wx-plus span{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer}.wx-plus i{font-style:normal;width:58px;height:58px;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:26px}body.dark-theme .wx-plus i{background:#2c2c2c}.wx-plus em{font-style:normal;font-size:12px;color:#888}
.wx-gm{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;background:#fff;padding:16px;margin-bottom:8px}body.dark-theme .wx-gm{background:#191919}.wx-gm span{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer}.wx-gm i{font-style:normal;font-size:12px;color:#888;max-width:56px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.wx-gm b{width:50px;height:50px;border:1px dashed #bbb;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:300;color:#bbb}
.wx-cardp{display:flex;gap:16px;background:#fff;padding:26px 20px;margin-bottom:8px}body.dark-theme .wx-cardp{background:#191919}.wx-cardp b{font-size:21px;display:block;margin-bottom:4px}.wx-cardp small{display:block;color:#888;font-size:13.5px}.wx-cact>div{justify-content:center;color:#576b95}
.gys-root.gys-wechat .wx-callb{background:#2b2b2b!important}.wx-call{min-height:100%;display:flex;flex-direction:column;align-items:center;gap:10px;padding:70px 20px 40px;box-sizing:border-box;color:#fff;background:#2b2b2b center/cover}.wx-call.v{background-color:#000}.wx-call b{font-size:22px}.wx-call em{font-style:normal;opacity:.75}.wx-cl{flex:1;width:100%;max-width:360px;overflow-y:auto;margin-top:20px;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end}.wx-cl p{flex:none;height:auto;background:rgba(255,255,255,.12);border-radius:10px;padding:8px 12px;margin:6px 0;font-size:14.5px;max-width:85%}.wx-cl p.me{align-self:flex-end;margin-left:auto;background:rgba(7,193,96,.45)}.wx-hang{width:64px;height:64px;border-radius:50%;background:#fa5151;display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;transform:rotate(135deg)}
.wx-cin{display:flex;gap:8px;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));background:#1e1e1e}.wx-cin input{flex:1;border:none;border-radius:5px;padding:9px 10px;background:#333;color:#fff;font-size:15px;outline:none}.wx-cin span{color:#07c160;align-self:center;cursor:pointer}
.gys-root.gys-wechat .wx-mob{background:#fff!important}body.dark-theme .gys-root.gys-wechat .wx-mob{background:#111!important}.wx-mocv{position:relative;height:300px;background:linear-gradient(135deg,#5b7bd6,#e39bb5) center/cover;margin-bottom:46px}.wx-mob-b,.wx-mob-c{position:absolute;top:12px;color:#fff;font-size:24px;cursor:pointer;text-shadow:0 1px 4px rgba(0,0,0,.4)}.wx-mob-b{left:14px;font-size:32px;top:4px}.wx-mob-c{right:16px}
.wx-mome{position:absolute;right:16px;bottom:-30px;display:flex;align-items:flex-end;gap:14px}.wx-mome b{color:#fff;font-size:18px;margin-bottom:38px;text-shadow:0 1px 4px rgba(0,0,0,.5)}.wx-mome .wx-av{border-radius:8px}
.wx-mosig{text-align:right;padding:0 16px;color:#999;font-size:13px;margin:-26px 0 16px}
.wx-mi{display:flex;gap:10px;padding:14px 16px;border-bottom:.5px solid #eee}body.dark-theme .wx-mi{border-color:#222}.wx-mi>div{flex:1;min-width:0}.wx-mi>div>b{color:#576b95;font-size:15.5px;font-weight:500;cursor:pointer}.wx-mi>div>p{margin:4px 0;font-size:15.5px;line-height:1.5}
.wx-moimg{display:grid;gap:4px;max-width:260px;margin:6px 0}.wx-moimg.n1{grid-template-columns:1fr;max-width:180px}.wx-moimg.n2{grid-template-columns:1fr 1fr}.wx-moimg.n3{grid-template-columns:1fr 1fr 1fr}.wx-moimg span{aspect-ratio:1;background:#eee center/cover;cursor:pointer;display:flex;align-items:flex-end;padding:4px;box-sizing:border-box}.wx-moimg span em{font-style:normal;font-size:10.5px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5)}
.wx-moloc{color:#576b95;font-size:12.5px}.wx-mot{display:flex;justify-content:space-between;align-items:center;margin-top:4px}.wx-mot small{color:#b2b2b2;font-size:12.5px}.wx-mot small a{color:#576b95;cursor:pointer}.wx-mot span{background:#f7f7f7;color:#576b95;border-radius:4px;padding:0 8px;font-weight:700;cursor:pointer;letter-spacing:1px}body.dark-theme .wx-mot span{background:#222}
.wx-mofb{background:#f7f7f7;border-radius:3px;margin-top:6px;padding:6px 8px;font-size:14px}body.dark-theme .wx-mofb{background:#1e1e1e}.wx-mofb .lk{color:#576b95;border-bottom:.5px solid #e5e5e5;padding-bottom:4px;margin-bottom:4px}.wx-mofb p{margin:2px 0;cursor:pointer}.wx-mofb b{color:#576b95;font-weight:500}
.wx-art{display:flex;gap:12px;background:#fff;padding:12px 16px;border-bottom:.5px solid #eee;cursor:pointer}body.dark-theme .wx-art{background:#191919;border-color:#222}.wx-art>div{flex:1;min-width:0}.wx-art small{color:#999;font-size:12px}.wx-art b{display:block;font-size:16px;margin:3px 0}.wx-art p{margin:0;font-size:13px;color:#888;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.wx-art>span{width:64px;height:64px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0}
.gys-root.gys-wechat .wx-artb{background:#fff!important}body.dark-theme .gys-root.gys-wechat .wx-artb{background:#191919!important}.wx-artp{padding:20px 18px 40px}.wx-artp h2{font-size:22px;line-height:1.4;margin:0 0 8px}.wx-artp>small{color:#576b95;font-size:14px}.wx-artp p{font-size:17px;line-height:1.8;margin:14px 0;color:#333}body.dark-theme .wx-artp p{color:#ccc}.wx-artf{display:flex;gap:22px;color:#999;font-size:14px;margin-top:30px}.wx-artf span{cursor:pointer}.wx-artf span.on{color:#07c160}
`);
(async () => { await G.ready(); D = Object.assign(D, await ST.get('d', {}) || {}); ['th', 'status', 'remark', 'pat', 'last', 'cfg'].forEach(k => { if (!D[k] || typeof D[k] !== 'object' || Array.isArray(D[k])) D[k] = {}; }); ['my', 'favs', 'subs'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; }); D.cfg.keep = D.cfg.keep || 800; })();
window.gysWxState = () => D;
// 💬 互通（256）
try { G.chatReg(APP, { lines: c => { const t = D.th['c:' + c.id]; return t ? t.msgs.filter(m => m.from !== 'sys').slice(-6).map(m => ({ at: m.at, t: lineOf(t, m, 'c:' + c.id).replace(/^你：/, '你（' + c.name + '）：') })) : []; }, lastMe: c => { const t = D.th['c:' + c.id]; const m = t && t.msgs.filter(x => x.from === 'me').slice(-1)[0]; return m ? m.at : 0; }, proactive: async c => { const a = typeof GY_AUTONOMY_ACTIONS !== 'undefined' && GY_AUTONOMY_ACTIONS.find(x => x.key === 'gys_wx_text'); return !!(a && await a.run(c)); } }); } catch (e) {}
