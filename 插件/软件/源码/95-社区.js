/* 🌱 社区：真人用户之间聊天——频道（大厅、角色同桌、角色卡分享…）、私聊、好友、身份组、群主 / 管理员、举报、入群（邀请码 / 谁都能进 / 申请审核）。
   服务器是群主部署的「社区 Worker」（仓库根目录 community-worker.js，存在 Cloudflare D1），所有人连同一个地址；头像、背景这些图片也存在那，改了所有人同步。
   角色同桌里每个角色用它主人自己的 API 说话。 */
if (window.__gysComm) return; window.__gysComm = 1;
const G = window.GYS, APP = 'community', esc = G.esc;
const DEFAULT_URL = 'https://guyu-community.3040831326.workers.dev';   // 部署好以后填群主的社区地址（js/61 内置时一起带上）
X.feat('gyComm', { n: '🌱 社区', desc: '跟别的谷雨用户聊天：频道、私聊、好友、角色同桌（大家的角色凑一桌聊）、角色卡分享；群主 / 管理员 / 身份组。关掉就没有这个入口，也不再连社区服务器' });
X.feat('gyCommTable', { n: '🎭 社区 · 角色同桌自动接话', desc: '你带进「角色同桌」的角色，看到有人说话 / 有人按 ▶ 时，用你自己的 API 接一句。关掉就只有你手动让 TA 说' });
G.APPS.community = { n: '社区', ico: '🌱', feat: 'gyComm' };
const ST = X.store('gycomm');
let S = { url: DEFAULT_URL, tok: '', read: {}, dmRead: 0, dmLast: 0, ver: 0, since: 0, cache: null, lastSeen: {}, said: [] };
const save = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('s', S), 300); }; })();
// 运行时
let B = null;            // boot：me, perms, cfg, roles, channels, users(map), friends, last
let ONLINE = new Set(), MSGS = {}, PINS = {}, DMS = [], STAFF = null, CUR = null, BUSY = {}, INFO = null;
const C = window.gysComm = {};
C.__tok = () => S.tok;   /* 测试用 */
const users = () => (B && B.users) || {};
const U = id => users()[id] || { id, nick: '已离开', roles: [] };
const me = () => B && B.me;
const can = p => !!(B && B.perms && B.perms.includes(p));
const fileUrl = id => !id ? '' : /^https?:|^data:/.test(id) ? id : (S.url.replace(/\/+$/, '') + '/f/' + id);
const roleOf = id => ((B && B.roles) || []).find(r => r.id === id);
const myRank = () => { const m = me(); if (!m) return 0; if (m.roles.includes('owner')) return 1e9; return Math.max(0, ...m.roles.map(r => (roleOf(r) || {}).pos || 0)); };
const rankOf = u => { if ((u.roles || []).includes('owner')) return 1e9; return Math.max(0, ...(u.roles || []).map(r => (roleOf(r) || {}).pos || 0)); };
const tags = u => (u.roles || []).map(roleOf).filter(Boolean).sort((a, b) => b.pos - a.pos).map(r => `<span class="cm-tag" style="background:${esc(r.color)}">${esc(r.name)}</span>`).join('');
const colOf = s => { let h = 0; for (const ch of String(s || 'x')) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h},55%,62%)`; };
const avHtml = (u, sz) => { const im = fileUrl(u.avatar); return `<span class="cm-av" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz * .42)}px;${im ? `background-image:url('${esc(im)}')` : `background:${esc(u.color || colOf(u.id))}`}">${im ? '' : esc(String(u.nick || '?')[0])}</span>`; };
const chrAv = (c, sz) => { const im = fileUrl(c.avatar); return `<span class="cm-av" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz * .42)}px;${im ? `background-image:url('${esc(im)}')` : `background:${colOf(c.name)}`}">${im ? '' : esc(String(c.name || '?')[0])}</span>`; };
const hm = t => G.hm(t);

/* ---------------- 网络 ---------------- */
async function api(path, body, quiet) {
    if (!S.url) throw new Error('还没填社区地址');
    const r = await fetch(S.url.replace(/\/+$/, '') + path, { method: body ? 'POST' : 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, S.tok ? { 'X-Gy-Token': S.tok } : {}), body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!j) throw new Error('社区服务器没回应（HTTP ' + r.status + '）');
    if (!j.ok) { if (r.status === 401 && S.tok) { try { window.gyGate && window.gyGate.clear(); } catch (e) {} } if (!quiet) X.toast(j.err || '出错了', ''); const e = new Error(j.err || 'error'); e.status = r.status; throw e; }
    return j;
}
async function upload(dataUrl, max) {
    const small = await shrink(dataUrl, max || 512);
    return (await api('/f', { data: small })).id;
}
function shrink(d, max) {
    return new Promise(res => { if (!/^data:image/.test(d)) return res(d); const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .86)); }; im.onerror = () => res(d); im.src = d; });
}
const pickUp = (aspect, max) => new Promise(res => G.pickImg(aspect, async url => { try { X.toast('上传中…', ''); res(await upload(url, max)); } catch (e) { res(null); } }));

async function boot() {
    const j = await api('/boot', null, true);
    const um = {}; (j.users || []).forEach(u => { um[u.id] = u; });
    B = { me: j.me, perms: j.perms, cfg: j.cfg, roles: j.roles, channels: j.channels, users: um, friends: j.friends || [], last: {}, permNames: j.permNames || {} };
    (j.last || []).forEach(x => { B.last[x.ch] = x.id; });
    S.ver = j.cfg && j.cfg.ver || 0; S.since = j.t; S.cache = { cfg: j.cfg, me: j.me }; save();
    return B;
}
let POLLING = false;
async function poll() {
    if (POLLING || !S.tok || !X.on('gyComm')) return; POLLING = true;
    try {
        if (!B) await boot();
        const ch = CUR && CUR.ch, after = ch ? ((MSGS[ch] || []).slice(-1)[0] || {}).id || 0 : 0;
        const j = await api(`/poll?ver=${S.ver}&since=${S.since}&dm=${S.dmLast}${ch ? `&ch=${encodeURIComponent(ch)}&after=${after}` : ''}`, null, true);
        S.since = j.t - 5000; B.me = j.me; B.perms = j.perms;
        if (j.cfg) { B.cfg = j.cfg; B.roles = j.roles; B.channels = j.channels; S.ver = j.cfg.ver; }
        (j.users || []).forEach(u => { B.users[u.id] = u; });
        ONLINE = new Set(j.online || []);
        (j.last || []).forEach(x => { B.last[x.ch] = x.id; });
        B.friends = j.friends || B.friends;
        if (j.staff) STAFF = j.staff;
        let fresh = [];
        if (ch && j.msgs) { const L = MSGS[ch] = MSGS[ch] || []; j.msgs.forEach(m => { const i = L.findIndex(x => x.id === m.id); if (i >= 0) L[i] = m; else { L.push(m); fresh.push(m); } }); if (L.length > 400) L.splice(0, L.length - 400); PINS[ch] = j.pins || []; const c = B.channels.find(x => x.id === ch); if (c && j.chMeta) c.meta = j.chMeta; if (G.isOpen(APP) && G.top(APP) && G.top(APP).id === 'ch_' + ch) { S.read[ch] = B.last[ch] || after; } }
        if (j.dms && j.dms.length) { j.dms.forEach(m => { if (!DMS.some(x => x.id === m.id)) DMS.push(m); }); S.dmLast = Math.max(S.dmLast, ...j.dms.map(m => m.id)); notifyDms(j.dms); }
        save();
        if (G.isOpen(APP)) repaintSoft();
        if (fresh.length) tableReact(ch, fresh);
    } catch (e) { if (e.status === 401 || e.status === 403) { B = null; } }
    finally { POLLING = false; }
}
function repaintSoft() {
    const t = G.top(APP), r = document.querySelector('#gys_' + APP + ' .gys-body');
    const atBottom = r && r.scrollHeight - r.scrollTop - r.clientHeight < 80;
    const inp = document.getElementById('cmIn'), val = inp ? inp.value : null, foc = inp && document.activeElement === inp;
    G.repaint(APP);
    const r2 = document.querySelector('#gys_' + APP + ' .gys-body'); if (r2 && t && /^(ch_|dm_)/.test(t.id || '') && atBottom) r2.scrollTop = 1e7;
    const i2 = document.getElementById('cmIn'); if (i2 && val != null) { i2.value = val; if (foc) i2.focus(); }
}
// 开着社区：4 秒一次；没开：1 分钟一次（红点、私聊通知、今天面板）
let PT = 0; setInterval(() => { if (!S.tok || !X.on('gyComm')) return; const open = G.isOpen(APP) && !document.hidden; const gap = open ? 4000 : 60000; if (Date.now() - PT < gap - 500) return; PT = Date.now(); poll(); }, 2000);
function notifyDms(L) {
    const mine = me() && me().id; const inc = L.filter(m => m.uid !== mine && m.at > Date.now() - 5 * 60e3);
    const t = G.top(APP); inc.forEach(m => { if (G.isOpen(APP) && t && t.id === 'dm_' + m.uid) return; X.toast(`🌱 ${U(m.uid).nick}`, m.text ? m.text.slice(0, 40) : '[角色卡]'); });
}

/* ---------------- 页面：没加入 ---------------- */
async function loadInfo() { if (!S.url) { INFO = null; return; } try { const r = await fetch(S.url.replace(/\/+$/, '') + '/info'); INFO = await r.json(); } catch (e) { INFO = { err: '连不上：' + e.message }; } G.repaint(APP); }
function joinHtml() {
    if (!INFO && S.url && !BUSY.info) { BUSY.info = 1; loadInfo().finally(() => { BUSY.info = 0; }); }
    const I = INFO || {}, mode = I.join || 'invite';
    return `<div class="cm-join"><div class="cm-jlogo" style="${I.icon ? `background-image:url('${esc(fileUrl(I.icon))}')` : ''}">${I.icon ? '' : '🌱'}</div><b>${esc(I.name || '谷雨社区')}</b><small>${I.err ? esc(I.err) : I.members != null ? (I.empty ? '还没人，你第一个进来就是群主' : I.members + ' 位成员') : S.url ? '⏳ 连接中…' : '先填社区地址'}</small>${I.intro ? `<p>${esc(I.intro)}</p>` : ''}</div>
      <div class="cm-grp"><label class="cm-row"><span>昵称</span><input id="cmJNick" placeholder="大家看到的名字" value="${esc((me() || {}).nick || '')}"></label><label class="cm-row"><span>谷雨号</span><input id="cmJHandle" placeholder="英文数字，加好友用（可空）"></label>
      ${I.empty ? '' : mode === 'invite' ? `<label class="cm-row"><span>邀请码</span><input id="cmJCode" placeholder="GY-XXXX"></label>` : mode === 'apply' ? `<label class="cm-row col"><span>${esc(I.applyQ || '说一句你怎么知道谷雨的')}</span><textarea id="cmJApply" rows="3"></textarea></label>` : ''}</div>
      <div class="cm-btn" onclick="gysComm.join()">${BUSY.join ? '⏳' : mode === 'apply' && !I.empty ? '提交申请' : '加入'}</div>`;
}
C.setUrl = () => { S.url = DEFAULT_URL; INFO = null; save(); loadInfo(); };   /* 288：只连群主的社区，地址改不了 */
C.join = async () => {
    if (BUSY.join) return; const v = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
    if (!v('cmJNick')) return X.toast('起个昵称', '');
    const F = { nick: v('cmJNick'), handle: v('cmJHandle'), code: v('cmJCode'), apply: v('cmJApply') };   /* 先取值再重画（重画会把输入框清空） */
    BUSY.join = 1; G.repaint(APP);
    try { const j = await api('/join', F); S.tok = j.token; save(); gateSync(); await boot(); X.toast(j.owner ? '你是群主了' : j.status === 'pending' ? '申请交上去了' : '进来了', ''); }
    catch (e) {} finally { BUSY.join = 0; G.repaint(APP); }
};
function pendingHtml() { return `<div class="cm-join"><div class="cm-jlogo">⏳</div><b>等管理员审核</b><small>通过了这里会自动变</small></div><div class="cm-btn ghost" onclick="gysComm.leave()">不等了，退出</div>`; }

/* ---------------- 频道 ---------------- */
const unread = ch => Math.max(0, (B.last[ch] || 0) - (S.read[ch] || 0));
const chIcon = c => /^f[a-z0-9]+$/.test(c.icon || '') ? `<span class="cm-ic" style="background-image:url('${esc(fileUrl(c.icon))}')"></span>` : `<span class="cm-ic" style="background:${esc(c.color || '#007aff')}">${esc(c.icon || '#')}</span>`;
function chRow(c) {
    const n = unread(c.id), last = (MSGS[c.id] || []).filter(m => !m.del).slice(-1)[0];
    return `<div class="cm-r" onclick="gysComm.open('${c.id}')">${chIcon(c)}<div class="t"><b>${esc(c.name)}</b><small>${last ? esc((last.chr ? last.chr.name : U(last.uid).nick) + '：' + (last.text || '[卡片]')).slice(0, 40) : esc(c.topic || '')}</small></div>${n ? `<em class="cm-badge">${n > 99 ? '99+' : n}</em>` : ''}</div>`;
}
function chTab() {
    if (!B) return `<div class="gys-busy">⏳</div>`;
    const L = B.channels, staff = L.filter(c => c.see && c.see.length), pub = L.filter(c => !(c.see && c.see.length));
    const notice = pub.filter(c => c.kind === 'notice'), rest = pub.filter(c => c.kind !== 'notice');
    return `<div class="cm-lt">${esc(B.cfg.name || '社区')}</div>
      ${notice.length ? `<div class="cm-gh">公告</div><div class="cm-grp">${notice.map(chRow).join('')}</div>` : ''}
      <div class="cm-gh">聊天</div><div class="cm-grp">${rest.map(chRow).join('') || '<div class="cm-r"><div class="t"><small>还没有频道</small></div></div>'}</div>
      ${staff.length || can('approve') ? `<div class="cm-gh">只有管理员能看</div><div class="cm-grp">${staff.map(chRow).join('')}${can('approve') ? `<div class="cm-r" onclick="gysComm.staff()"><span class="cm-ic" style="background:#ff3b30">⚑</span><div class="t"><b>管理</b><small>举报、入群申请、操作记录</small></div>${STAFF && (STAFF.reports + STAFF.applies) ? `<em class="cm-badge">${STAFF.reports + STAFF.applies}</em>` : ''}</div>` : ''}</div>` : ''}
      ${can('channel') ? `<div class="cm-link" onclick="gysComm.chEdit()">＋ 新频道</div>` : ''}`;
}
C.open = async ch => {
    const c = B && B.channels.find(x => x.id === ch); if (!c) return;
    CUR = { ch }; MSGS[ch] = MSGS[ch] || [];
    G.push(APP, { id: 'ch_' + ch, get title() { return (c.kind === 'text' ? '#' : '') + esc(c.name); }, right: `<span onclick="gysComm.chMenu('${ch}')">⋯</span>`, cls: 'cm-chb', html: () => chHtml(ch), foot: () => chFoot(ch), after: r => { if (!r.__cmScrolled) { const b = r.querySelector('.gys-body'); if (b) b.scrollTop = 1e7; r.__cmScrolled = 1; } }, onLeave: () => { CUR = null; } });
    if (!MSGS[ch].length) { try { const j = await api('/history?ch=' + encodeURIComponent(ch)); MSGS[ch] = j.msgs; } catch (e) {} }
    S.read[ch] = B.last[ch] || 0; save(); PT = 0; poll(); repaintSoft();
    setTimeout(() => { const b = document.querySelector('#gys_' + APP + ' .gys-body'); if (b) b.scrollTop = 1e7; }, 60);
};
C.more = async ch => { const L = MSGS[ch] || []; if (!L.length) return; try { const j = await api(`/history?ch=${encodeURIComponent(ch)}&before=${L[0].id}`); MSGS[ch] = j.msgs.concat(L); G.repaint(APP); } catch (e) {} };
function cardHtml(card, where) {
    if (!card) return '';
    if (card.type === 'char') return `<div class="cm-card"><div class="cm-cardcv" style="${card.avatar ? `background-image:url('${esc(fileUrl(card.avatar))}')` : `background:${colOf(card.name)}`}">${card.avatar ? '' : esc(String(card.name)[0])}</div><div class="cm-cardi"><b>${esc(card.name)}</b><small>角色卡${card.wb ? ' · 带世界书 ' + card.wb + ' 本' : ''}</small>${card.intro ? `<p>${esc(card.intro)}</p>` : ''}<span onclick="gysComm.importCard('${esc(card.file)}')">导入到我的谷雨</span></div></div>`;
    return '';
}
function msgHtml(m, ch) {
    if (m.del) return `<div class="cm-sys">一条消息被删了</div>`;
    if (m.kind === 'round') return `<div class="cm-sys">▶ ${esc(U(m.uid).nick)} 让角色们接着聊</div>`;
    if (m.kind === 'sys') return `<div class="cm-sys">${esc(m.text)}</div>`;
    const u = U(m.uid), reply = m.reply && (MSGS[ch] || []).find(x => x.id === m.reply);
    const name = m.chr ? `${esc(m.chr.name)}<span class="cm-tag owner">${esc(u.nick)} 的角色</span>` : `${esc(u.nick)}${tags(u)}`;
    return `<div class="cm-m${m.pin ? ' pin' : ''}" id="cmm${m.id}"><span onclick="gysComm.member('${m.uid}')">${m.chr ? chrAv(m.chr, 36) : avHtml(u, 36)}</span><div class="b" onclick="gysComm.msgMenu('${ch}',${m.id})"><div class="n">${name}<small>${hm(m.at)}</small></div>${reply ? `<div class="cm-rp">↩ ${esc(reply.chr ? reply.chr.name : U(reply.uid).nick)}：${esc((reply.text || '').slice(0, 30))}</div>` : ''}${m.text ? `<div class="t">${esc(m.text).replace(/\n/g, '<br>').replace(/@(\S{1,20})/g, '<u>@$1</u>')}</div>` : ''}${m.img ? `<img class="cm-img" src="${esc(fileUrl(m.img))}" onclick="event.stopPropagation();GYS.imgView&&GYS.imgView(this.src)">` : ''}${cardHtml(m.card)}</div></div>`;
}
function chHtml(ch) {
    const c = B.channels.find(x => x.id === ch); if (!c) return '';
    const L = MSGS[ch] || [], pins = (PINS[ch] || []).filter(p => !p.del);
    const seats = c.kind === 'table' ? ((c.meta || {}).seats || []) : null;
    return `${pins.length ? `<div class="cm-pinb" onclick="document.getElementById('cmm${pins[0].id}')&&document.getElementById('cmm${pins[0].id}').scrollIntoView({block:'center'})">📌 ${esc((pins[0].text || '').slice(0, 50))} · ${esc(U(pins[0].uid).nick)}</div>` : ''}
      ${seats ? `<div class="cm-seats">${seats.map(s => `<div onclick="gysComm.member('${s.uid}')">${chrAv(s, 44)}<b>${esc(s.name)}</b><small>${esc(U(s.uid).nick)}</small></div>`).join('')}${can('table') ? `<div onclick="gysComm.sit('${ch}')"><span class="cm-av add">＋</span><b>带我的</b><small>&nbsp;</small></div>` : ''}</div>` : ''}
      ${L.length >= 60 ? `<div class="cm-link" onclick="gysComm.more('${ch}')">更早的消息</div>` : ''}
      ${L.map(m => msgHtml(m, ch)).join('') || '<div class="gys-empty">还没人说话</div>'}
      ${seats ? `<div class="cm-sys">每个角色用它主人自己的 API 说话</div>` : ''}`;
}
let REPLY = null, AS = null;   // 回复哪条；以哪个角色说话（同桌）
function chFoot(ch) {
    const c = B.channels.find(x => x.id === ch); if (!c) return '';
    if (!c.canTalk) return `<div class="cm-bar ro">这个频道你只能看</div>`;
    if (me().mute > Date.now()) return `<div class="cm-bar ro">禁言中，${new Date(me().mute).toLocaleString()} 之后能说话</div>`;
    const as = AS && AS.ch === ch ? AS : null;
    return `${REPLY ? `<div class="cm-rpbar">回复 ${esc(REPLY.name)}<span onclick="gysComm.noReply()">✕</span></div>` : ''}<div class="cm-bar"><span class="rb" onclick="gysComm.plus('${ch}')">＋</span><input id="cmIn" placeholder="${as ? '以「' + esc(as.name) + '」说话' : '发到 ' + esc(c.name)}" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysComm.send('${ch}')">${c.kind === 'table' ? `<span class="rb" onclick="gysComm.asWho('${ch}')">🎭</span><span class="rb" onclick="gysComm.round('${ch}')">▶</span>` : `<span class="rb" onclick="gysComm.send('${ch}')">↑</span>`}</div>`;
}
C.noReply = () => { REPLY = null; G.repaint(APP); };
C.send = async (ch, extra) => {
    const inp = document.getElementById('cmIn'); const text = inp ? inp.value.trim() : ''; if (!text && !extra) return;
    const as = AS && AS.ch === ch ? AS : null;
    const body = Object.assign({ ch, text, reply: REPLY ? REPLY.id : 0 }, as && !extra ? { chr: { name: as.name, avatar: as.avatar, cid: as.cid } } : {}, extra || {});
    if (inp) inp.value = '';
    try { await api('/send', body); REPLY = null; PT = 0; await poll(); const b = document.querySelector('#gys_' + APP + ' .gys-body'); if (b) b.scrollTop = 1e7; } catch (e) { if (inp && text) inp.value = text; }
};
C.plus = async ch => {
    const c = B.channels.find(x => x.id === ch);
    const ops = ['🖼️ 发图片', '🪪 分享我的角色卡'].concat(c.kind === 'table' ? ['🎭 带我的角色坐下'] : []);
    const i = await G.sheet(ops, ''); if (i == null) return;
    if (i === 0) { const id = await pickUp(0, 1280); if (id) C.send(ch, { img: id, text: '' }); }
    else if (i === 1) { const card = await makeCard(); if (card) C.send(ch, { card, text: '' }); }
    else C.sit(ch);
};
C.msgMenu = async (ch, id) => {
    const m = (MSGS[ch] || []).find(x => x.id === id); if (!m || m.del || m.kind) return; const mine = m.uid === me().id;
    const ops = [['↩ 回复', () => { REPLY = { id, name: m.chr ? m.chr.name : U(m.uid).nick }; G.repaint(APP); setTimeout(() => { const i = document.getElementById('cmIn'); if (i) i.focus(); }, 30); }], ['📋 复制', () => { try { navigator.clipboard.writeText(m.text || ''); X.toast('复制了', ''); } catch (e) {} }]];
    if (can('pin')) ops.push([m.pin ? '📌 取消置顶' : '📌 置顶', async () => { await api('/pin', { id, on: !m.pin }); m.pin = m.pin ? 0 : 1; PT = 0; poll(); }]);
    if (mine || can('del')) ops.push(['🗑 删除', async () => { if (!(await G.confirm('删掉这条？'))) return; await api('/delmsg', { id }); m.del = 1; G.repaint(APP); }]);
    if (!mine) ops.push(['⚑ 举报', () => C.report('msg', String(id), m.uid, m.text)]);
    const i = await G.sheet(ops.map(o => o[0]), ''); if (i != null) ops[i][1]();
};
C.report = async (kind, ref, whoId, excerpt) => { const r = await G.input('举报理由（管理员会看到）', ''); if (r === null || r === undefined) return; await api('/report', { kind, ref, who: whoId, reason: r, excerpt: String(excerpt || '').slice(0, 200) }); X.toast('举报交上去了', '管理员会处理'); };
C.chMenu = async ch => {
    const c = B.channels.find(x => x.id === ch);
    const ops = [['👥 成员', () => C.members()]];
    if (c.kind === 'table') ops.push(['🎭 我的角色：坐下 / 起身', () => C.sit(ch)]);
    if (can('channel')) ops.push(['✏️ 改这个频道', () => C.chEdit(ch)]);
    const i = await G.sheet(ops.map(o => o[0]), c.name); if (i != null) ops[i][1]();
};

/* ---------------- 角色同桌 ---------------- */
const myChars = () => G.chars();
C.sit = async ch => {
    const c = B.channels.find(x => x.id === ch); const seats = (c.meta || {}).seats || [];
    const cs = myChars(); if (!cs.length) return X.toast('你还没有角色', '');
    const i = await G.sheet(cs.map(x => (seats.some(s => s.uid === me().id && s.cid === String(x.id)) ? '✓ 起身：' : '坐下：') + x.name), '带谁进同桌'); if (i == null) return;
    const x = cs[i], on = !seats.some(s => s.uid === me().id && s.cid === String(x.id));
    let avatar = ''; if (on && x.avatarImg) { try { avatar = await upload(x.avatarImg, 256); } catch (e) {} }
    const j = await api('/seat', { ch, on, cid: String(x.id), name: x.name, avatar, intro: String(x.bio || x.persona || '').slice(0, 120) });
    c.meta = Object.assign(c.meta || {}, { seats: j.seats });
    if (on) { AS = { ch, cid: String(x.id), name: x.name, avatar }; await api('/send', { ch, kind: 'sys', text: `${x.name}（${me().nick} 的角色）坐下了` }); }
    else if (AS && AS.cid === String(x.id)) AS = null;
    PT = 0; poll();
};
C.asWho = async ch => {
    const c = B.channels.find(x => x.id === ch); const mine = ((c.meta || {}).seats || []).filter(s => s.uid === me().id);
    const opts = ['🙋 我自己'].concat(mine.map(s => '🎭 ' + s.name)); const i = await G.sheet(opts, '以谁说话'); if (i == null) return;
    AS = i === 0 ? null : Object.assign({ ch }, mine[i - 1]); G.repaint(APP);
};
C.round = async ch => { try { await api('/send', { ch, kind: 'round', text: '' }); PT = 0; await poll(); } catch (e) {} };
const LASTTALK = {};
async function charSay(ch, s, why) {
    const c = myChars().find(x => String(x.id) === String(s.cid)); if (!c) return;
    const k = ch + ':' + s.cid; if (Date.now() - (LASTTALK[k] || 0) < 15000) return; LASTTALK[k] = Date.now();
    const L = (MSGS[ch] || []).filter(m => !m.del && !m.kind).slice(-14).map(m => `${m.chr ? m.chr.name + '（' + U(m.uid).nick + '的角色）' : U(m.uid).nick + '（真人）'}：${m.text || '[图片/卡片]'}`).join('\n');
    const seatsTxt = (((B.channels.find(x => x.id === ch) || {}).meta || {}).seats || []).filter(x => !(x.uid === s.uid && x.cid === s.cid)).map(x => `${x.name}（${U(x.uid).nick} 的角色${x.intro ? '：' + x.intro.slice(0, 50) : ''}）`).join('、');
    const t = X.plain(await X.ask(`${X.who(c)}\n你被${me().nick}带进了一个谷雨社区的「角色同桌」：好几个不同的人把各自的角色带到一张桌子上聊天。桌上还有：${seatsTxt || '（暂时只有你）'}。真人们也会插话。\n最近的聊天：\n${L || '（还没人说话）'}\n${why === 'round' ? '有人按了「接着聊」。' : ''}按你的人设、用你自己的口吻接一句（可以接别人的话、可以对别的角色说、也可以理会真人），像群聊里的一条消息：短、自然、别替别人说话。只写这一条消息。`) || '').slice(0, 300);
    if (!t) return;
    try { await api('/send', { ch, text: t, chr: { name: s.name, avatar: s.avatar, cid: s.cid } }); S.said.unshift({ ch, cid: s.cid, text: t, at: Date.now() }); S.said = S.said.slice(0, 200); save(); } catch (e) {}
}
function tableReact(ch, fresh) {
    if (!X.on('gyCommTable')) return; const c = B.channels.find(x => x.id === ch); if (!c || c.kind !== 'table') return;
    const mine = ((c.meta || {}).seats || []).filter(s => s.uid === me().id); if (!mine.length) return;
    fresh.forEach(m => {
        if (m.del) return;
        if (m.kind === 'round') return mine.forEach((s, i) => setTimeout(() => charSay(ch, s, 'round'), 800 + i * 2500 + Math.random() * 1500));
        if (m.kind) return;
        const fromMine = m.chr && m.uid === me().id;
        mine.forEach((s, i) => { if (fromMine && m.chr.cid === s.cid) return; const named = m.text && m.text.indexOf(s.name) >= 0; if (named || (!m.chr && Math.random() < 0.35) || (m.chr && Math.random() < 0.2)) setTimeout(() => charSay(ch, s, named ? 'named' : ''), 1500 + i * 2500 + Math.random() * 3000); });
    });
}

/* ---------------- 角色卡 ---------------- */
async function makeCard() {
    const cs = myChars(); if (!cs.length) { X.toast('你还没有角色', ''); return null; }
    const i = await G.sheet(cs.map(x => x.name), '分享哪张卡'); if (i == null) return null; const x = cs[i];
    const wbAll = typeof worldbooks !== 'undefined' ? worldbooks : [];
    const wbs = wbAll.filter(w => (x.worldbooks || []).includes(w.id) && !w.isGlobal).map(w => ({ title: w.title, content: w.content, keywords: w.keywords, priority: w.priority, category: w.category }));
    const data = { spec: 'guyu_share_v1', name: x.name, persona: x.persona, bio: x.bio, firstMessage: x.firstMessage || '', alternateGreetings: x.alternateGreetings || [], avatarImg: x.avatarImg ? await shrink(x.avatarImg, 400) : '', worldbooks: wbs, from: me().nick };
    const json = JSON.stringify(data); if (json.length > 1000000) { X.toast('这张卡太大了（超过 1MB）', '世界书太长了'); return null; }
    X.toast('上传中…', '');
    const b64 = btoa(unescape(encodeURIComponent(json)));
    const file = (await api('/f', { data: 'data:application/json;base64,' + b64 })).id;
    let avatar = ''; if (x.avatarImg) { try { avatar = await upload(x.avatarImg, 256); } catch (e) {} }
    return { type: 'char', name: x.name, file, avatar, wb: wbs.length, intro: String(x.bio || '').slice(0, 80) };
}
C.importCard = async file => {
    if (!(await G.confirm('把这张角色卡导进你的谷雨？'))) return;
    try {
        const r = await fetch(fileUrl(file)); const d = await r.json(); if (!d || !d.name) throw new Error('卡坏了');
        const now = Date.now(), wbIds = [];
        (d.worldbooks || []).forEach((w, i) => { const id = now + 100 + i; try { worldbooks.push({ id, title: w.title || d.name + ' 的世界书', content: w.content || '', isGlobal: false, keywords: w.keywords || '', priority: w.priority || 0, category: w.category || '' }); wbIds.push(id); } catch (e) {} });
        const c = { id: now, name: d.name, handle: 'gy' + String(now).slice(-6), persona: d.persona || '', bio: d.bio || '', followers: '1000', following: '100', location: '', website: '', birthdate: '', isFollowing: true, isSpecialFollow: false, verified: false,
            avatarEmoji: d.name[0], themeColor: '#1d9bf0', avatarImg: d.avatarImg || null, bgImg: null, group: '', groups: [],
            postFreq: { interval: 2, unit: 'day', count: 1 }, lastPostTime: now, chatFreq: { interval: 1, unit: 'day' }, lastChatProactiveTime: now, letterFreq: { interval: 14, unit: 'day' }, lastLetterProactiveTime: now, forumPostFreq: { interval: 7, unit: 'day' }, lastForumPostTime: now, anonPostFreq: { interval: 7, unit: 'day' }, lastAnonPostTime: now,
            actMode: 'fixed', autonomyMinMinutes: 30, autonomyMaxHours: 8, webMode: 'default', webGapMin: 0, webPerDay: 0, ownDaysMode: 'default', lastAutonomyTime: now, nextAutonomyAt: 0, autonomyLog: [], todos: [],
            autoReplyText: '', busyAutoReplyText: '', memorySummary: '', chatSummary: '', diaryData: { letters: [], diaries: [] }, pendingLetterReplies: [], anonName: '匿名者', anonId: Math.random().toString(36).substr(2, 6).toUpperCase(),
            firstMessage: d.firstMessage || '', alternateGreetings: d.alternateGreetings || [], worldbooks: wbIds, postCount: 0, fromCommunity: d.from || '' };
        myCharacters.push(c);
        try { if (typeof saveAllData === 'function') saveAllData(); } catch (e) {}
        try { if (typeof renderChatCharList === 'function') renderChatCharList(); } catch (e) {}
        X.toast(`导进来了：${d.name}`, d.worldbooks && d.worldbooks.length ? `带了 ${d.worldbooks.length} 本世界书` : '');
    } catch (e) { X.toast('导入失败', e.message); }
};

/* ---------------- 成员 ---------------- */
C.members = () => G.push(APP, { id: 'members', title: '成员', html: () => { const L = Object.values(users()).filter(u => u.status === 'ok').sort((a, b) => rankOf(b) - rankOf(a) || (ONLINE.has(b.id) - ONLINE.has(a.id))); return `<div class="cm-grp">${L.map(u => `<div class="cm-r" onclick="gysComm.member('${u.id}')">${avHtml(u, 34)}<div class="t"><b>${esc(u.nick)}${tags(u)}</b><small>${ONLINE.has(u.id) ? '在线' : u.seen ? G.ago(u.seen) : ''}</small></div></div>`).join('')}</div>`; } });
C.member = id => {
    G.push(APP, { id: 'mem_' + id, title: '', cls: 'cm-memb', html: () => {
        const u = U(id), mine = id === me().id, high = rankOf(u) < myRank();
        const fr = (B.friends || []).find(f => (f.a === me().id && f.b === id)), frb = (B.friends || []).find(f => f.a === id && f.b === me().id);
        const isF = fr && fr.state === 'ok';
        const seats = B.channels.filter(c => c.kind === 'table').flatMap(c => ((c.meta || {}).seats || []).filter(s => s.uid === id));
        const mod = !mine && high && (can('mute') || can('kick') || can('ban') || can('roles'));
        return `<div class="cm-mh" style="${u.bg ? `background-image:url('${esc(fileUrl(u.bg))}')` : `background:linear-gradient(160deg,${colOf(u.id)},#8b8b92)`}"></div>
          <div class="cm-mi">${avHtml(u, 76)}<b>${esc(u.nick)}</b><small>谷雨号 ${esc(u.handle || '')} · 加入 ${Math.max(1, Math.round((Date.now() - (u.joined || Date.now())) / 86400e3))} 天${ONLINE.has(id) ? ' · 在线' : ''}</small><div>${tags(u)}${can('roles') && !mine && high ? `<span class="cm-tag add" onclick="gysComm.giveRole('${id}')">＋ 身份组</span>` : ''}</div>${u.bio ? `<p>${esc(u.bio)}</p>` : ''}${u.mute > Date.now() ? `<p class="warn">禁言到 ${new Date(u.mute).toLocaleString()}</p>` : ''}</div>
          ${mine ? `<div class="cm-btn" onclick="gysComm.editMe()">编辑我的资料</div>` : `<div class="cm-acts"><span onclick="gysComm.dm('${id}')"><i>💬</i>私聊</span><span onclick="gysComm.friend('${id}','${isF ? 'del' : frb && frb.state === 'req' ? 'accept' : 'req'}')"><i>${isF ? '✓' : '👤'}</i>${isF ? '已是好友' : frb && frb.state === 'req' ? '同意好友' : fr ? '已申请' : '加好友'}</span><span onclick="gysComm.report('user','${id}','${id}','')"><i>⚑</i>举报</span></div>`}
          ${seats.length ? `<div class="cm-gh">TA 带进同桌的角色</div><div class="cm-grp">${seats.map(s => `<div class="cm-r">${chrAv(s, 34)}<div class="t"><b>${esc(s.name)}</b><small>${esc(s.intro || '')}</small></div></div>`).join('')}</div>` : ''}
          ${mod ? `<div class="cm-gh">管理</div><div class="cm-grp">${can('mute') ? `<div class="cm-r" onclick="gysComm.mute('${id}')"><div class="t"><b>${u.mute > Date.now() ? '解除禁言' : '禁言'}</b></div><span class="chev">›</span></div>` : ''}${can('kick') ? `<div class="cm-r red" onclick="gysComm.mod('kick','${id}','踢出社区')"><div class="t"><b>踢出社区</b></div></div>` : ''}${can('ban') ? `<div class="cm-r red" onclick="gysComm.mod('ban','${id}','封号（以后都进不来）')"><div class="t"><b>封号</b></div></div>` : ''}</div>` : ''}`;
    } });
};
C.mod = async (act, uid, label) => { if (!(await G.confirm(label + '：' + U(uid).nick + '？'))) return; await api('/mod', { act, uid }); X.toast('好了', ''); PT = 0; await poll(); G.back(APP); };
C.mute = async uid => {
    const u = U(uid); if (u.mute > Date.now()) { await api('/mod', { act: 'mute', uid, mins: 0 }); X.toast('解除禁言了', ''); PT = 0; return poll(); }
    const O = [['10 分钟', 10], ['1 小时', 60], ['1 天', 1440], ['7 天', 10080], ['30 天', 43200]]; const i = await G.sheet(O.map(o => o[0]), '禁言多久'); if (i == null) return;
    await api('/mod', { act: 'mute', uid, mins: O[i][1] }); X.toast('禁言了', O[i][0]); PT = 0; poll();
};
C.giveRole = async uid => {
    const u = U(uid), R = B.roles.filter(r => r.id !== 'member' && (r.pos < myRank() || (me().roles.includes('owner'))));
    const i = await G.sheet(R.map(r => ((u.roles || []).includes(r.id) ? '✓ 拿掉：' : '给：') + r.name + (r.id === 'owner' ? '（转让群主）' : '')), '身份组'); if (i == null) return;
    const r = R[i], has = (u.roles || []).includes(r.id);
    if (r.id === 'owner' && !has && !(await G.confirm('把群主转让给 ' + u.nick + '？你会变成普通成员（还有别的身份组的话保留）'))) return;
    await api('/mod', { act: has ? 'role_del' : 'role_add', uid, role: r.id }); PT = 0; await poll();
};

/* ---------------- 私聊 / 好友 ---------------- */
const pairWith = id => DMS.filter(m => (m.pair || '').split('|').includes(id));
function dmTab() {
    if (!B) return `<div class="gys-busy">⏳</div>`;
    const mid = me().id, by = {}; DMS.forEach(m => { const o = (m.pair || '').split('|').find(x => x !== mid) || mid; if (!by[o] || by[o].id < m.id) by[o] = m; });
    const L = Object.entries(by).sort((a, b) => b[1].id - a[1].id);
    return `<div class="cm-lt">私聊</div>${L.length ? `<div class="cm-grp">${L.map(([o, m]) => { const u = U(o), n = DMS.filter(x => x.uid === o && x.id > (S.lastSeen[o] || 0)).length; return `<div class="cm-r" onclick="gysComm.dm('${o}')">${avHtml(u, 40)}<div class="t"><b>${esc(u.nick)}</b><small>${esc(m.text ? m.text.slice(0, 40) : m.card ? '[角色卡]' : '[图片]')}</small></div>${n ? `<em class="cm-badge">${n}</em>` : `<small class="cm-time">${G.ago(m.at)}</small>`}</div>`; }).join('')}</div>` : '<div class="gys-empty">还没有私聊<br>点频道里谁的头像就能私聊</div>'}`;
}
C.dm = async id => {
    S.lastSeen[id] = Math.max(0, ...pairWith(id).map(m => m.id)); save();
    G.push(APP, { id: 'dm_' + id, get title() { return esc(U(id).nick); }, cls: 'cm-chb', html: () => { const mid = me().id; S.lastSeen[id] = Math.max(S.lastSeen[id] || 0, ...pairWith(id).map(m => m.id)); return pairWith(id).sort((a, b) => a.id - b.id).map(m => m.del ? '' : `<div class="cm-dm${m.uid === mid ? ' me' : ''}"><span>${m.text ? esc(m.text).replace(/\n/g, '<br>') : ''}${m.img ? `<img class="cm-img" src="${esc(fileUrl(m.img))}">` : ''}${cardHtml(m.card)}</span></div>`).join('') || '<div class="gys-empty">打个招呼吧</div>'; },
        foot: () => `<div class="cm-bar"><span class="rb" onclick="gysComm.dmPlus('${id}')">＋</span><input id="cmIn" placeholder="发给 ${esc(U(id).nick)}" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysComm.dmSend('${id}')"><span class="rb" onclick="gysComm.dmSend('${id}')">↑</span></div>`,
        after: r => { const b = r.querySelector('.gys-body'); if (b && !r.__dmS) { b.scrollTop = 1e7; r.__dmS = 1; } } });
    if (pairWith(id).length < 5) { try { const j = await api('/dmhistory?with=' + id); j.msgs.forEach(m => { if (!DMS.some(x => x.id === m.id)) DMS.push(m); }); G.repaint(APP); } catch (e) {} }
    setTimeout(() => { const b = document.querySelector('#gys_' + APP + ' .gys-body'); if (b) b.scrollTop = 1e7; }, 60);
};
C.dmSend = async (id, extra) => { const inp = document.getElementById('cmIn'); const text = inp ? inp.value.trim() : ''; if (!text && !extra) return; if (inp) inp.value = ''; try { await api('/dm', Object.assign({ to: id, text }, extra || {})); PT = 0; await poll(); const b = document.querySelector('#gys_' + APP + ' .gys-body'); if (b) b.scrollTop = 1e7; } catch (e) { if (inp) inp.value = text; } };
C.dmPlus = async id => { const i = await G.sheet(['🖼️ 发图片', '🪪 发我的角色卡'], ''); if (i === 0) { const f = await pickUp(0, 1280); if (f) C.dmSend(id, { img: f }); } else if (i === 1) { const card = await makeCard(); if (card) C.dmSend(id, { card }); } };
function frTab() {
    if (!B) return `<div class="gys-busy">⏳</div>`;
    const mid = me().id, F = B.friends || [];
    const reqs = F.filter(f => f.b === mid && f.state === 'req' && !F.some(g => g.a === mid && g.b === f.a && g.state === 'ok'));
    const ok = F.filter(f => f.a === mid && f.state === 'ok').map(f => U(f.b));
    return `<div class="cm-lt">好友</div><div class="cm-grp"><div class="cm-r"><span>🔍</span><input id="cmFind" class="cm-in" placeholder="输入谷雨号加好友" onkeydown="if(event.key==='Enter'&&!event.isComposing)gysComm.friend(this.value,'req')"></div></div>
      ${reqs.length ? `<div class="cm-gh">好友请求</div><div class="cm-grp">${reqs.map(f => { const u = U(f.a); return `<div class="cm-r">${avHtml(u, 34)}<div class="t" onclick="gysComm.member('${u.id}')"><b>${esc(u.nick)}</b><small>${esc(f.note || '想加你')}</small></div><span class="cm-pill" onclick="gysComm.friend('${u.id}','accept')">接受</span></div>`; }).join('')}</div>` : ''}
      <div class="cm-gh">好友</div><div class="cm-grp">${ok.map(u => `<div class="cm-r" onclick="gysComm.dm('${u.id}')">${avHtml(u, 34)}<div class="t"><b>${esc(u.nick)}</b><small>${ONLINE.has(u.id) ? '在线' : u.seen ? G.ago(u.seen) : ''}</small></div><span class="chev">›</span></div>`).join('') || '<div class="cm-r"><div class="t"><small>还没有好友</small></div></div>'}</div>
      <div class="cm-gh">我的谷雨号</div><div class="cm-grp"><div class="cm-r" onclick="try{navigator.clipboard.writeText('${esc(me().handle)}')}catch(e){};X_toast_cm()"><div class="t"><b>${esc(me().handle)}</b></div><span>⧉</span></div></div>`;
}
window.X_toast_cm = () => X.toast('复制了', '');
C.friend = async (to, act) => { to = String(to || '').trim(); if (!to) return; let note = ''; if (act === 'req' && !users()[to]) { } if (act === 'del' && !(await G.confirm('删掉这个好友？'))) return; try { await api('/friend', { to, act, note }); X.toast(act === 'req' ? '申请发出去了' : act === 'accept' ? '加上了' : '删掉了', ''); const f = document.getElementById('cmFind'); if (f) f.value = ''; PT = 0; await poll(); } catch (e) {} };

/* ---------------- 我 / 设置 / 管理 ---------------- */
function meTab() {
    if (!B) return `<div class="gys-busy">⏳</div>`;
    const m = me();
    return `<div class="cm-mh" style="${m.bg ? `background-image:url('${esc(fileUrl(m.bg))}')` : `background:linear-gradient(160deg,${colOf(m.id)},#8b8b92)`}" onclick="gysComm.editMe()"></div>
      <div class="cm-mi">${avHtml(m, 76)}<b>${esc(m.nick)}</b><small>谷雨号 ${esc(m.handle)}</small><div>${tags(m)}</div>${m.bio ? `<p>${esc(m.bio)}</p>` : ''}</div>
      <div class="cm-grp"><div class="cm-r" onclick="gysComm.editMe()"><div class="t"><b>编辑我的资料</b><small>头像、背景、昵称、谷雨号、签名</small></div><span class="chev">›</span></div></div>
      ${can('cfg') || can('roles') || can('channel') || can('invite') || can('approve') ? `<div class="cm-gh">社区设置</div><div class="cm-grp">
        ${can('cfg') ? `<div class="cm-r" onclick="gysComm.cfgPage()"><div class="t"><b>社区资料</b><small>名字、图标、封面、介绍、规则${m.roles.includes('owner') ? '、加入方式' : ''}</small></div><span class="chev">›</span></div>` : ''}
        ${can('invite') ? `<div class="cm-r" onclick="gysComm.invites()"><div class="t"><b>邀请码</b></div><span class="chev">›</span></div>` : ''}
        ${can('roles') ? `<div class="cm-r" onclick="gysComm.rolesPage()"><div class="t"><b>身份组</b></div><span class="chev">›</span></div>` : ''}
        ${can('channel') ? `<div class="cm-r" onclick="gysComm.chList()"><div class="t"><b>频道</b></div><span class="chev">›</span></div>` : ''}
        ${can('approve') ? `<div class="cm-r" onclick="gysComm.staff()"><div class="t"><b>管理</b><small>举报、入群申请、记录、封号名单</small></div>${STAFF && (STAFF.reports + STAFF.applies) ? `<em class="cm-badge">${STAFF.reports + STAFF.applies}</em>` : '<span class="chev">›</span>'}</div>` : ''}</div>` : ''}
      <div class="cm-gh">连接</div><div class="cm-grp"><div class="cm-r" onclick="gysComm.backup()"><div class="t"><b>备份我的钥匙</b><small>换手机 / 清了数据用它找回这个账号</small></div><span class="chev">›</span></div><div class="cm-r" onclick="gysComm.restore()"><div class="t"><b>用钥匙登录</b></div><span class="chev">›</span></div><div class="cm-r red" onclick="gysComm.leave()"><div class="t"><b>退出社区</b></div></div></div>`;
}
C.backup = async () => { try { await navigator.clipboard.writeText(S.url + '#' + S.tok); X.toast('钥匙复制了', '存好，别给别人'); } catch (e) { await G.input('你的钥匙（存好，别给别人）', S.url + '#' + S.tok); } };
C.restore = async () => { const v = await G.input('粘贴备份的钥匙', ''); if (!v) return; const i = v.indexOf('#'); if (i < 0) return X.toast('格式不对', ''); if (v.slice(0, i).replace(/\/+$/, '') !== DEFAULT_URL) return X.toast('这把钥匙不是谷雨社区的', ''); S.url = DEFAULT_URL; S.tok = v.slice(i + 1); B = null; save(); try { await boot(); gateSync(); X.toast('登录了', me().nick); } catch (e) { X.toast('钥匙不对', ''); S.tok = ''; save(); } G.repaint(APP); };
C.leave = async () => { if (!(await G.confirm('退出社区？（账号会离开，想回来要重新加入）'))) return; try { await api('/leave', {}); } catch (e) {} S.tok = ''; try { window.gyGate && window.gyGate.clear(); } catch (e) {} B = null; MSGS = {}; DMS = []; S.read = {}; S.dmLast = 0; save(); G.tab(APP, 'ch'); };
C.editMe = () => {
    const m = me(), V = { avatar: m.avatar, bg: m.bg };
    G.push(APP, { id: 'editme', title: '编辑资料', right: `<span onclick="gysComm.__saveMe()">完成</span>`, html: () => `<div class="cm-ebg" style="${V.bg ? `background-image:url('${esc(fileUrl(V.bg))}')` : ''}" onclick="gysComm.__pick('bg')"><span>🖼️ ${V.bg ? '换背景' : '加背景'}</span></div><div class="cm-eav" onclick="gysComm.__pick('avatar')">${avHtml(Object.assign({}, m, { avatar: V.avatar }), 84)}<i>📷</i></div>
      <div class="cm-grp"><label class="cm-row"><span>昵称</span><input id="cmEN" value="${esc(m.nick)}"></label><label class="cm-row"><span>谷雨号</span><input id="cmEH" value="${esc(m.handle)}"></label><label class="cm-row col"><span>签名</span><textarea id="cmEB" rows="3">${esc(m.bio || '')}</textarea></label></div>
      ${V.avatar || V.bg ? `<div class="cm-link" onclick="gysComm.__clr()">去掉头像 / 背景图</div>` : ''}` });
    C.__pick = async k => { const id = await pickUp(k === 'bg' ? 16 / 9 : 1, k === 'bg' ? 1080 : 400); if (id) { V[k] = id; G.repaint(APP); } };
    C.__clr = () => { V.avatar = ''; V.bg = ''; G.repaint(APP); };
    C.__saveMe = async () => { const g = i => (document.getElementById(i) || {}).value; try { await api('/me', { nick: g('cmEN'), handle: g('cmEH'), bio: g('cmEB'), avatar: V.avatar || '', bg: V.bg || '' }); X.toast('改好了', '大家那边也会同步'); S.since = 0; PT = 0; await poll(); G.back(APP); } catch (e) {} };
};
let BKUSE = null;
C.cfgPage = () => {
    const c = Object.assign({}, B.cfg), owner = me().roles.includes('owner');
    G.push(APP, { id: 'cfg', title: '社区资料', right: `<span onclick="gysComm.__saveCfg()">完成</span>`, html: () => `<div class="cm-ebg" style="${c.cover ? `background-image:url('${esc(fileUrl(c.cover))}')` : ''}" onclick="gysComm.__cpick('cover')"><span>🖼️ ${c.cover ? '换封面' : '加封面'}</span></div><div class="cm-eav" onclick="gysComm.__cpick('icon')"><span class="cm-av" style="width:84px;height:84px;border-radius:22px;font-size:36px;${c.icon ? `background-image:url('${esc(fileUrl(c.icon))}')` : 'background:linear-gradient(135deg,#34c759,#30b0c7)'}">${c.icon ? '' : '🌱'}</span><i>📷</i></div>
      <div class="cm-grp"><label class="cm-row"><span>名字</span><input id="cmCN" value="${esc(c.name || '')}"></label><label class="cm-row col"><span>介绍（加入页能看到）</span><textarea id="cmCI" rows="2">${esc(c.intro || '')}</textarea></label><label class="cm-row col"><span>规则</span><textarea id="cmCR" rows="3">${esc(c.rules || '')}</textarea></label></div>
      ${owner ? `<div class="cm-gh">怎么加入</div><div class="cm-seg">${[['invite', '邀请码'], ['open', '谁都能进'], ['apply', '申请审核']].map(([k, n]) => `<span class="${c.join === k ? 'on' : ''}" onclick="gysComm.__join('${k}')">${n}</span>`).join('')}</div>${c.join === 'apply' ? `<div class="cm-grp"><label class="cm-row col"><span>申请时要回答的问题</span><input id="cmCQ" value="${esc(c.applyQ || '')}"></label></div>` : ''}
      <div class="cm-gh">开屏登录</div><div class="cm-seg">${[[true, '要登录才能用谷雨'], [false, '不用登录']].map(([k, n]) => `<span class="${(c.gate !== false) === k ? 'on' : ''}" onclick="gysComm.__gate(${k})">${n}</span>`).join('')}</div><div class="cm-foot">开着的话，没加入社区的人打开谷雨会先看到登录页，用的是上面选的加入方式。已经登录过的人没网也能进。</div>
      <div class="cm-gh">最低版本</div><div class="cm-grp"><label class="cm-row"><span>低于这个版本不让用（0 = 不限）</span><input id="cmCV" type="number" value="${+c.minVer || 0}" oninput="gysComm.__cv('minVer',this.value)"></label><label class="cm-row col"><span>更新链接（APK / 网页地址）</span><input id="cmCU" value="${esc(c.updUrl || '')}" placeholder="https://…" oninput="gysComm.__cv('updUrl',this.value)"></label><label class="cm-row col"><span>拦下来时显示的话</span><input id="cmCM" value="${esc(c.updMsg || '')}" placeholder="这个版本太旧了，更新一下再用" oninput="gysComm.__cv('updMsg',this.value)"></label></div><div class="cm-foot">你现在用的是 ${window.GY_VERSION || '?'}。改成比别人高的数字，旧版本的人打开就会被拦下来叫他更新——小心别填比自己还高。</div>` : ''}` });
    C.__bk = k => { c.bkOn = k; G.repaint(APP); };
    C.__gate = k => { c.gate = k; G.repaint(APP); };
    C.__cv = (k, v) => { c[k] = v; };
    C.__cpick = async k => { const id = await pickUp(k === 'cover' ? 16 / 9 : 1, k === 'cover' ? 1080 : 400); if (id) { c[k] = id; G.repaint(APP); } };
    C.__join = k => { c.join = k; G.repaint(APP); };
    C.__saveCfg = async () => { const g = i => { const e = document.getElementById(i); return e ? e.value : undefined; }; const body = { name: g('cmCN'), intro: g('cmCI'), rules: g('cmCR'), icon: c.icon || '', cover: c.cover || '' }; if (owner) { body.join = c.join; if (g('cmCQ') != null) body.applyQ = g('cmCQ'); body.gate = c.gate !== false; body.minVer = +c.minVer || 0; body.updUrl = c.updUrl || ''; body.updMsg = c.updMsg || ''; body.bkOn = c.bkOn !== false; body.bkMax = +c.bkMax || 30; body.bkKeep = +c.bkKeep || 2; body.bkTotal = +c.bkTotal || 450; if (body.minVer > (+window.GY_VERSION || 0) && !(await G.confirm('最低版本比你自己现在用的还高，你自己也会被拦。确定？'))) return; } try { await api('/cfg', body); X.toast('改好了', ''); S.ver = 0; PT = 0; await poll(); G.back(APP); } catch (e) {} };
};
C.invites = async () => {
    let L = []; const load = async () => { try { L = (await api('/invites')).invites; } catch (e) {} G.repaint(APP); };
    G.push(APP, { id: 'inv', title: '邀请码', right: `<span onclick="gysComm.__newInv()">＋</span>`, html: () => `${B.cfg.join !== 'invite' ? `<div class="cm-foot">现在的加入方式是「${B.cfg.join === 'open' ? '谁都能进' : '申请审核'}」，用不到邀请码</div>` : ''}<div class="cm-grp">${L.map(v => `<div class="cm-r" onclick="gysComm.__invMenu('${v.code}')"><div class="t"><b>${esc(v.code)}</b><small>用了 ${v.uses}${v.max ? ' / ' + v.max : ''} 次${v.exp ? ' · ' + (v.exp < Date.now() ? '过期了' : new Date(v.exp).toLocaleDateString() + ' 过期') : ''} · ${esc(U(v.by).nick)}</small></div><span>⧉</span></div>`).join('') || '<div class="cm-r"><div class="t"><small>还没有，点右上角 ＋</small></div></div>'}</div>` });
    C.__newInv = async () => { const O = [['不限次数、不过期', 0, 0], ['能用 1 次', 1, 0], ['能用 10 次', 10, 0], ['7 天内有效', 0, 7]]; const i = await G.sheet(O.map(o => o[0]), '新邀请码'); if (i == null) return; const j = await api('/invite', { max: O[i][1], days: O[i][2] }); try { await navigator.clipboard.writeText(j.code); } catch (e) {} X.toast(j.code + ' 复制了', '发给想进来的人'); load(); };
    C.__invMenu = async code => { const i = await G.sheet(['⧉ 复制', '🗑 作废'], code); if (i === 0) { try { await navigator.clipboard.writeText(code); X.toast('复制了', ''); } catch (e) {} } else if (i === 1) { await api('/invite', { act: 'delete', code }); load(); } };
    load();
};
C.rolesPage = () => G.push(APP, { id: 'roles', title: '身份组', right: `<span onclick="gysComm.roleEdit()">＋</span>`, html: () => `<div class="cm-grp">${B.roles.map(r => { const n = Object.values(users()).filter(u => u.status === 'ok' && (r.id === 'member' || (u.roles || []).includes(r.id))).length; return `<div class="cm-r" onclick="${r.id === 'owner' ? '' : `gysComm.roleEdit('${r.id}')`}"><span class="cm-dot" style="background:${esc(r.color)}"></span><div class="t"><b>${esc(r.name)}</b><small>${r.id === 'member' ? '所有人' : n + ' 人'}${r.id === 'owner' ? ' · 全部权限' : ''}</small></div><span class="chev">${r.id === 'owner' ? '🔒' : '›'}</span></div>`; }).join('')}</div><div class="cm-foot">排在上面的身份组更高；只能发 / 改比自己低的。给人发身份组：点 TA 的头像 →「＋ 身份组」。</div>` });
C.roleEdit = id => {
    const old = B.roles.find(r => r.id === id); const R = old ? JSON.parse(JSON.stringify(old)) : { name: '', color: '#34c759', perms: [], pos: 10 };
    const names = B.permNames || {}; const COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#30b0c7', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#8e8e93'];
    G.push(APP, { id: 'role_' + (id || 'new'), title: old ? '改身份组' : '新身份组', right: `<span onclick="gysComm.__saveRole()">完成</span>`, html: () => `<div class="cm-grp"><label class="cm-row"><span>名字</span><input id="cmRN" value="${esc(R.name)}" placeholder="比如：写卡大佬"></label>${R.id === 'member' ? '' : `<label class="cm-row"><span>高低（数字越大越高）</span><input id="cmRP" type="number" value="${R.pos}"></label>`}</div>
      <div class="cm-colors">${COLORS.map(c => `<span style="background:${c}" class="${R.color === c ? 'on' : ''}" onclick="gysComm.__rc('${c}')"></span>`).join('')}</div>
      <div class="cm-gh">能做什么</div><div class="cm-grp">${Object.keys(names).map(p => `<label class="cm-row"><span>${esc(names[p])}</span><input type="checkbox" class="cm-sw" ${R.perms.includes(p) ? 'checked' : ''} ${can(p) ? '' : 'disabled'} onchange="gysComm.__rp('${p}',this.checked)"></label>`).join('')}</div>
      ${old && !['member', 'admin'].includes(old.id) ? `<div class="cm-link red" onclick="gysComm.__delRole()">删掉这个身份组</div>` : ''}` });
    C.__rc = c => { R.color = c; G.repaint(APP); };
    C.__rp = (p, on) => { R.perms = on ? Array.from(new Set(R.perms.concat(p))) : R.perms.filter(x => x !== p); };
    C.__saveRole = async () => { R.name = (document.getElementById('cmRN') || {}).value || R.name; const pe = document.getElementById('cmRP'); if (pe) R.pos = +pe.value || R.pos; try { await api('/roles', { act: 'upsert', role: R }); S.ver = 0; PT = 0; await poll(); G.back(APP); } catch (e) {} };
    C.__delRole = async () => { if (!(await G.confirm('删掉「' + R.name + '」？有这个身份组的人会失去它'))) return; await api('/roles', { act: 'delete', role: { id: R.id } }); S.ver = 0; PT = 0; await poll(); G.back(APP); };
};
C.chList = () => G.push(APP, { id: 'chlist', title: '频道', right: `<span onclick="gysComm.chEdit()">＋</span>`, html: () => `<div class="cm-grp">${B.channels.map(c => `<div class="cm-r" onclick="gysComm.chEdit('${c.id}')">${chIcon(c)}<div class="t"><b>${esc(c.name)}</b><small>${{ text: '聊天', table: '角色同桌', cards: '角色卡分享', notice: '公告' }[c.kind] || ''}${c.see && c.see.length ? ' · 只有管理员能看' : ''}${c.talk && c.talk.length ? ' · 只有管理员能说话' : ''}</small></div><span class="chev">›</span></div>`).join('')}</div>` });
C.chEdit = id => {
    const old = id && B.channels.find(c => c.id === id); const c = old ? JSON.parse(JSON.stringify(old)) : { name: '', icon: '#', color: '#007aff', kind: 'text', topic: '', see: [], talk: [], pos: 50 };
    const COLORS = ['#ff3b30', '#ff9500', '#34c759', '#30b0c7', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#8e8e93'];
    G.push(APP, { id: 'chedit', title: old ? '改频道' : '新频道', right: `<span onclick="gysComm.__saveCh()">完成</span>`, html: () => `<div class="cm-eav" onclick="gysComm.__chIcon()">${chIcon(c).replace('cm-ic', 'cm-ic big')}<i>📷</i></div>
      <div class="cm-grp"><label class="cm-row"><span>名字</span><input id="cmCHN" value="${esc(c.name)}"></label><label class="cm-row"><span>图标（一个字 / emoji）</span><input id="cmCHI" value="${/^f[a-z0-9]+$/.test(c.icon) ? '' : esc(c.icon)}" maxlength="4"></label><label class="cm-row"><span>说明</span><input id="cmCHT" value="${esc(c.topic || '')}"></label><label class="cm-row"><span>排序（小的在前）</span><input id="cmCHP" type="number" value="${c.pos}"></label></div>
      <div class="cm-colors">${COLORS.map(x => `<span style="background:${x}" class="${c.color === x ? 'on' : ''}" onclick="gysComm.__chc('${x}')"></span>`).join('')}</div>
      <div class="cm-gh">类型</div><div class="cm-seg">${[['text', '聊天'], ['table', '角色同桌'], ['cards', '角色卡'], ['notice', '公告']].map(([k, n]) => `<span class="${c.kind === k ? 'on' : ''}" onclick="gysComm.__chk('${k}')">${n}</span>`).join('')}</div>
      <div class="cm-grp"><label class="cm-row"><span>只有管理员能看</span><input type="checkbox" class="cm-sw" ${c.see.length ? 'checked' : ''} onchange="gysComm.__chs('see',this.checked)"></label><label class="cm-row"><span>只有管理员能说话</span><input type="checkbox" class="cm-sw" ${c.talk.length ? 'checked' : ''} onchange="gysComm.__chs('talk',this.checked)"></label></div>
      ${old ? `<div class="cm-link red" onclick="gysComm.__delCh()">删掉这个频道</div>` : ''}` });
    C.__chc = x => { c.color = x; G.repaint(APP); }; C.__chk = k => { c.kind = k; if (k === 'notice' && !c.talk.length) c.talk = ['pin']; G.repaint(APP); };
    C.__chs = (k, on) => { c[k] = on ? [k === 'see' ? 'approve' : 'pin'] : []; };
    C.__chIcon = async () => { const f = await pickUp(1, 256); if (f) { c.icon = f; G.repaint(APP); } };
    C.__saveCh = async () => { const g = i => (document.getElementById(i) || {}).value; c.name = g('cmCHN') || c.name; const ic = g('cmCHI'); if (ic) c.icon = ic; c.topic = g('cmCHT'); c.pos = +g('cmCHP') || c.pos; try { await api('/channels', { act: 'upsert', channel: c }); S.ver = 0; PT = 0; await poll(); G.back(APP); } catch (e) {} };
    C.__delCh = async () => { if (!(await G.confirm('删掉「' + c.name + '」？'))) return; await api('/channels', { act: 'delete', channel: { id: c.id } }); S.ver = 0; PT = 0; await poll(); G.back(APP); };
};
let STAB = 'rep';
C.staff = async () => {
    let D = null; const load = async () => { try { D = await api('/staff'); } catch (e) {} G.repaint(APP); };
    G.push(APP, { id: 'staff', title: '管理', html: () => { if (!D) return '<div class="gys-busy">⏳</div>';
        const seg = `<div class="cm-seg">${[['rep', '举报 ' + D.reports.length], ['app', '入群申请 ' + D.applies.length], ['log', '记录'], ['ban', '封号']].map(([k, n]) => `<span class="${STAB === k ? 'on' : ''}" onclick="gysComm.__st('${k}')">${n}</span>`).join('')}</div>`;
        const ACT = { del: '删了 TA 的消息', pin: '置顶了', unpin: '取消置顶', mute: '禁言了', unmute: '解除禁言', kick: '踢出了', ban: '封号了', unban: '解封了', approve: '通过了申请', reject: '拒绝了申请', role_add: '给了身份组', role_del: '拿掉身份组', roles: '改了身份组', channel: '改了频道', cfg: '改了社区资料', invite: '发了邀请码', report: '处理了举报', join: '加入了', owner: '建了社区', apply: '申请加入' };
        if (STAB === 'rep') return seg + (D.reports.map(r => `<div class="cm-grp cm-pad"><small>${esc(U(r.by).nick)} 举报了 ${esc(U(r.who).nick)} · ${r.kind === 'msg' ? '一条消息' : '这个人'} · ${G.ago(r.at)}</small>${r.excerpt ? `<p>「${esc(r.excerpt)}」</p>` : ''}<p>理由：${esc(r.reason || '（没写）')}</p><div class="cm-2b"><span class="red" onclick="gysComm.__rep(${r.id},'${r.kind}','${esc(r.ref)}','${esc(r.who)}')">处理</span><span onclick="gysComm.__repIgn(${r.id})">忽略</span></div></div>`).join('') || '<div class="gys-empty">没有举报</div>');
        if (STAB === 'app') return seg + (D.applies.map(u => `<div class="cm-grp cm-pad"><div class="cm-ah">${avHtml(u, 30)}<b>${esc(u.nick)}</b><small>${G.ago(u.joined)}</small></div>${u.apply ? `<p>${esc(u.apply)}</p>` : ''}<div class="cm-2b"><span onclick="gysComm.__ap('${u.id}','approve')">通过</span><span class="red" onclick="gysComm.__ap('${u.id}','reject')">拒绝</span></div></div>`).join('') || '<div class="gys-empty">没有申请</div>');
        if (STAB === 'ban') return seg + `<div class="cm-grp">${D.banned.map(u => `<div class="cm-r">${avHtml(u, 30)}<div class="t"><b>${esc(u.nick)}</b></div>${can('ban') ? `<span class="cm-pill" onclick="gysComm.__unban('${u.id}')">解封</span>` : ''}</div>`).join('') || '<div class="cm-r"><div class="t"><small>没有人被封</small></div></div>'}</div>`;
        return seg + `<div class="cm-grp">${D.logs.map(l => `<div class="cm-r"><div class="t"><b>${esc(U(l.by).nick)} ${ACT[l.act] || l.act} ${l.target && users()[l.target] ? esc(U(l.target).nick) : ''}${l.note ? ' · ' + esc(l.note) : ''}</b><small>${new Date(l.at).toLocaleString()}</small></div></div>`).join('')}</div>`;
    } });
    C.__st = k => { STAB = k; G.repaint(APP); };
    C.__ap = async (uid, act) => { await api('/mod', { act, uid }); load(); };
    C.__unban = async uid => { await api('/mod', { act: 'unban', uid }); load(); };
    C.__repIgn = async id => { await api('/mod', { act: 'report_done', id, state: 'ignore' }); load(); };
    C.__rep = async (id, kind, ref, whoId) => { const ops = [kind === 'msg' && can('del') ? ['🗑 删掉那条消息', () => api('/delmsg', { id: +ref })] : null, can('mute') ? ['🔇 禁言 1 天', () => api('/mod', { act: 'mute', uid: whoId, mins: 1440 })] : null, can('kick') ? ['🚪 踢出', () => api('/mod', { act: 'kick', uid: whoId })] : null, can('ban') ? ['⛔ 封号', () => api('/mod', { act: 'ban', uid: whoId })] : null, ['✓ 就标记成处理过了', () => 0]].filter(Boolean); const i = await G.sheet(ops.map(o => o[0]), '处理'); if (i == null) return; try { await ops[i][1](); await api('/mod', { act: 'report_done', id, state: 'done' }); } catch (e) {} load(); };
    load();
};

/* ---------------- 外壳 ---------------- */
const badgeDm = () => { if (!B) return 0; const mid = me().id; return DMS.filter(m => m.uid !== mid && m.id > (S.lastSeen[m.uid] || 0)).length; };
const badgeCh = () => B ? B.channels.reduce((n, c) => n + (c.kind === 'notice' || !(c.see && c.see.length) ? unread(c.id) : 0), 0) : 0;
const badgeFr = () => B ? (B.friends || []).filter(f => f.b === me().id && f.state === 'req' && !(B.friends || []).some(g => g.a === me().id && g.b === f.a)).length : 0;
G.app(APP, {
    tabs: [['ch', 'i:home', '频道', badgeCh], ['dm', 'i:chat', '私聊', badgeDm], ['fr', 'i:person', '好友', badgeFr], ['me', 'i:gear', '我']],
    head: t => `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('${APP}')">${G.ic('back', 22)}</span><b></b>${S.tok && B && t === 'ch' ? `<span class="gys-hr" onclick="gysComm.members()">👥</span>` : ''}</div>`,
    render: t => { if (!S.tok) return joinHtml(); if (!B) { if (!BUSY.boot) { BUSY.boot = 1; boot().then(() => G.repaint(APP)).catch(e => { if (e.status === 401) { S.tok = ''; save(); } INFO = null; G.repaint(APP); }).finally(() => { BUSY.boot = 0; }); } return '<div class="gys-busy">⏳ 连接社区…</div>'; } if (me().status === 'pending') return pendingHtml(); return t === 'dm' ? dmTab() : t === 'fr' ? frTab() : t === 'me' ? meTab() : chTab(); },
    after: r => { r.classList.toggle('cm-nojoin', !S.tok || !B || (me() && me().status === 'pending')); }
});
window.gysCommOpen = (tab) => { G.open(APP, tab); PT = 0; poll(); };
window.gysCommOpenCh = ch => { G.open(APP, 'ch'); if (B) C.open(ch); };
window.gysCommOpenDm = id => { G.open(APP, 'dm'); if (B) C.dm(id); };
X.mini({ id: 'gyComm', icon: '🌱', title: '社区', desc: '跟别的谷雨用户聊天：频道、私聊、好友、角色同桌、角色卡分享', cat: '软件', onOpen: () => window.gysCommOpen() }, 'gyComm');

/* ---------------- 谷雨这边：自主行动 / 今天 / 小组件 / 记忆 / 让 TA 知道 ---------------- */
X.action({ key: 'gys_comm_table', label: '去社区「角色同桌」接一句话', hint: '你被她带进了同桌，桌上有别人的角色', need: c => !!B && X.on('gyCommTable') && B.channels.some(ch => ch.kind === 'table' && ((ch.meta || {}).seats || []).some(s => s.uid === me().id && s.cid === String(c.id))), run: async c => {
    const ch = B.channels.find(x => x.kind === 'table' && ((x.meta || {}).seats || []).some(s => s.uid === me().id && s.cid === String(c.id))); if (!ch) return null;
    const s = ch.meta.seats.find(x => x.uid === me().id && x.cid === String(c.id));
    if (!(MSGS[ch.id] || []).length) { try { MSGS[ch.id] = (await api('/history?ch=' + ch.id)).msgs; } catch (e) {} }
    const n0 = S.said.length; await charSay(ch.id, s, 'auto'); const it = S.said.length > n0 ? S.said[0] : null; if (!it) return null;
    return { text: `在社区「${ch.name}」说：${it.text}`, jump: X.go('gysCommOpenCh', ch.id) };
} }, 'gyCommTable');
X.today(() => { if (!S.tok || !B) return null; const rows = []; const d = badgeDm(); if (d) rows.push({ t: '私聊', x: `${d} 条没看`, go: X.go('gysCommOpen', 'dm') }); const n = badgeCh(); if (n) rows.push({ t: '频道', x: `${n} 条新消息`, go: X.go('gysCommOpen', 'ch') }); const f = badgeFr(); if (f) rows.push({ t: '好友', x: `${f} 个请求`, go: X.go('gysCommOpen', 'fr') }); if (STAFF && STAFF.reports + STAFF.applies) rows.push({ t: '管理', x: `举报 ${STAFF.reports} · 申请 ${STAFF.applies}`, go: X.go('gysCommOpen', 'me') }); const td = S.said.filter(x => X.day(new Date(x.at)) === X.day()); if (td.length) rows.push({ t: '同桌', x: `你的角色说了 ${td.length} 句`, go: X.go('gysCommOpen', 'ch') }); return rows.length ? { title: '🌱 社区', rows } : null; }, 'gyComm');
X.widget('gyCommW', { n: '社区', sizes: ['s', 'm'], tap: () => window.gysCommOpen(), r: () => `<div style="padding:10px;font-size:12px;line-height:1.6"><b style="color:#34c759">🌱 ${esc((B && B.cfg && B.cfg.name) || '社区')}</b><br>${!S.tok ? '还没加入' : !B ? '…' : `新消息 ${badgeCh()}<br>私聊 ${badgeDm()}${ONLINE.size ? ` · ${ONLINE.size} 人在线` : ''}`}</div>` }, 'gyComm');
X.mem({ k: 'gyCommSaid', ico: '🎭', n: 'TA 在社区同桌说过的话', d: '你带 TA 进「角色同桌」后 TA 说的（这里删改只影响记忆，社区里那条要去社区里删）', items: c => S.said.filter(x => x.cid === String(c.id)), text: x => x.text, edit: (x, v) => { x.text = String(v).slice(0, 300); }, del: (c, i) => { const L = S.said.filter(x => x.cid === String(c.id)); S.said = S.said.filter(x => x !== L[i]); }, meta: x => G.ago(x.at), save: () => save() }, 'gyCommTable');
X.ctx(id => { const L = S.said.filter(x => x.cid === String(id)).slice(0, 3); if (!L.length || !B) return ''; return `【谷雨社区 · 角色同桌】她把你带进了社区的角色同桌（和别的用户的角色一起聊天），你最近在那说过：${L.map(x => '「' + x.text.slice(0, 40) + '」').join('')}`; }, 'gyCommTable');

X.css('gys-community-css', `
.gys-community{--cb:#f2f2f7;--cc:#fff;--ct:#000;--cs:#8e8e93;--cl:rgba(60,60,67,.18);--cf:rgba(120,120,128,.12);--ck:#34c759;background:var(--cb);color:var(--ct)}
body.dark-theme .gys-community{--cb:#000;--cc:#1c1c1e;--ct:#fff;--cl:rgba(84,84,88,.6);--cf:rgba(120,120,128,.24)}
.gys-community .gys-hd{background:var(--cb);border:0}.gys-community .gys-tabs{background:var(--cb)}
.cm-lt{font-size:32px;font-weight:700;padding:4px 16px 12px}
.cm-gh{font-size:13px;color:var(--cs);padding:0 32px 7px}
.cm-grp{background:var(--cc);border-radius:12px;margin:0 16px 22px;overflow:hidden}.cm-grp.cm-pad{padding:12px 16px}.cm-grp.cm-pad p{margin:6px 0;font-size:15px}.cm-grp.cm-pad small{color:var(--cs);font-size:12.5px}
.cm-r{display:flex;align-items:center;gap:12px;padding:10px 16px;position:relative;cursor:pointer;min-height:24px}.cm-r+.cm-r::before{content:"";position:absolute;top:0;right:0;left:16px;border-top:.5px solid var(--cl)}
.cm-r .t{flex:1;min-width:0}.cm-r .t b{display:flex;align-items:center;flex-wrap:wrap;gap:3px;font-size:16.5px;font-weight:400}.cm-r .t small{display:block;font-size:13px;color:var(--cs);margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.cm-r.red b{color:#ff3b30}.cm-r .chev{color:#c4c4c7}.cm-time{color:var(--cs);font-size:12px}
.cm-ic{width:30px;height:30px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:15px;font-weight:700;flex:none;background-size:cover;background-position:center}.cm-ic.big{width:84px;height:84px;border-radius:20px;font-size:38px}
.cm-badge{font-style:normal;background:#ff3b30;color:#fff;font-size:12px;border-radius:10px;padding:1px 7px;min-width:12px;text-align:center}
.cm-av{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:600;flex:none;background-size:cover;background-position:center}.cm-av.add{width:44px;height:44px;background:var(--cf);color:var(--ck);font-size:22px}
.cm-tag{display:inline-block;font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:5px;color:#fff;margin-left:4px;line-height:1.5}.cm-tag.owner{background:var(--cf);color:var(--cs);font-weight:500}.cm-tag.add{background:var(--cf);color:var(--ck);cursor:pointer}
.cm-link{text-align:center;color:var(--ck);font-size:15px;padding:6px 0 18px;cursor:pointer}.cm-link.red{color:#ff3b30}
.cm-foot{font-size:12.5px;color:var(--cs);padding:0 32px 18px;line-height:1.6}
.cm-btn{display:block;text-align:center;background:var(--ck);color:#fff;font-weight:600;font-size:17px;border-radius:14px;padding:14px;margin:0 16px 22px;cursor:pointer}.cm-btn.ghost{background:var(--cf);color:var(--ck)}
.cm-row{display:flex;align-items:center;gap:12px;padding:11px 16px;font-size:16.5px;position:relative}.cm-row+.cm-row::before{content:"";position:absolute;top:0;right:0;left:16px;border-top:.5px solid var(--cl)}.cm-row>span{flex:none}.cm-row.col{flex-direction:column;align-items:stretch;gap:6px}
.cm-row input:not([type=checkbox]),.cm-row textarea,.cm-in{flex:1;min-width:0;border:0;background:transparent;font-size:16.5px;color:var(--ct);text-align:right;outline:none;font-family:inherit}.cm-row.col textarea,.cm-row.col input{text-align:left;background:var(--cf)!important;border-radius:8px;padding:8px 10px}.cm-in{text-align:left}
.cm-sw{-webkit-appearance:none;appearance:none;width:51px;height:31px;border-radius:16px;background:var(--cf);position:relative;flex:none;cursor:pointer;margin-left:auto;transition:background .2s}.cm-sw::after{content:"";position:absolute;left:2px;top:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.15);transition:transform .2s}.cm-sw:checked{background:#34c759}.cm-sw:checked::after{transform:translateX(20px)}.cm-sw:disabled{opacity:.4}
.cm-seg{display:flex;background:var(--cf);border-radius:9px;padding:2px;margin:0 16px 18px}.cm-seg span{flex:1;text-align:center;font-size:13px;font-weight:600;padding:6px 0;border-radius:7px;cursor:pointer}.cm-seg span.on{background:var(--cc);box-shadow:0 3px 8px rgba(0,0,0,.12)}
.cm-pill{font-size:15px;font-weight:600;padding:4px 12px;border-radius:999px;background:var(--ck);color:#fff;cursor:pointer}
.cm-dot{width:12px;height:12px;border-radius:50%;flex:none}
.cm-colors{display:flex;gap:10px;flex-wrap:wrap;padding:0 22px 22px}.cm-colors span{width:30px;height:30px;border-radius:50%;cursor:pointer}.cm-colors span.on{box-shadow:0 0 0 3px var(--cb),0 0 0 5px var(--ct)}
.cm-join{display:flex;flex-direction:column;align-items:center;text-align:center;padding:30px 20px 24px}.cm-jlogo{width:84px;height:84px;border-radius:22px;background:linear-gradient(135deg,#34c759,#30b0c7) center/cover;display:flex;align-items:center;justify-content:center;font-size:40px;color:#fff}.cm-join b{font-size:26px;margin-top:14px}.cm-join small{color:var(--cs);font-size:15px;margin-top:4px}.cm-join p{color:var(--cs);font-size:14px;margin:10px 0 0}
.cm-chb{background:var(--cb)!important;padding-bottom:12px}
.cm-m{display:flex;gap:10px;padding:6px 16px}.cm-m .b{flex:1;min-width:0;cursor:pointer}.cm-m .n{font-size:14px;font-weight:600;display:flex;align-items:center;flex-wrap:wrap}.cm-m .n small{color:var(--cs);font-weight:400;font-size:11.5px;margin-left:6px}.cm-m .t{font-size:16px;line-height:1.5;margin-top:2px;word-break:break-word}.cm-m .t u{color:var(--ck);text-decoration:none}.cm-m.pin .b{border-left:3px solid #ff9500;padding-left:8px}
.cm-rp{font-size:12.5px;color:var(--cs);margin-top:3px;border-left:2px solid var(--cl);padding-left:6px}
.cm-img{display:block;max-width:220px;max-height:260px;border-radius:12px;margin-top:6px;cursor:pointer}
.cm-sys{text-align:center;font-size:12.5px;color:var(--cs);padding:6px 16px}
.cm-pinb{margin:6px 16px 8px;padding:8px 12px;border-radius:10px;background:var(--cc);font-size:13px;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.cm-seats{display:flex;gap:14px;overflow-x:auto;padding:8px 16px 12px;border-bottom:.5px solid var(--cl);margin-bottom:6px;scrollbar-width:none}.cm-seats>div{display:flex;flex-direction:column;align-items:center;font-size:11px;cursor:pointer;flex:none;width:52px;text-align:center}.cm-seats b{font-weight:500;margin-top:4px;max-width:52px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.cm-seats small{color:var(--cs);max-width:52px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.cm-bar{display:flex;gap:8px;align-items:center;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));background:var(--cb);border-top:.5px solid var(--cl)}.cm-bar input{flex:1;height:36px;border-radius:18px;background:var(--cc);border:.5px solid var(--cl);padding:0 14px;font-size:16px;color:var(--ct);outline:none}.cm-bar .rb{width:34px;height:34px;border-radius:17px;display:flex;align-items:center;justify-content:center;color:var(--ck);font-size:19px;cursor:pointer;flex:none}.cm-bar.ro{justify-content:center;color:var(--cs);font-size:13.5px;padding-top:14px}
.cm-rpbar{display:flex;justify-content:space-between;padding:6px 16px;font-size:12.5px;color:var(--cs);background:var(--cb)}.cm-rpbar span{cursor:pointer}
.cm-card{display:flex;gap:0;flex-direction:column;width:230px;border-radius:14px;overflow:hidden;background:var(--cc);margin-top:6px;border:.5px solid var(--cl)}.cm-cardcv{height:96px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px;font-weight:700;background-size:cover;background-position:center}.cm-cardi{padding:10px 12px}.cm-cardi b{font-size:16px}.cm-cardi small{display:block;color:var(--cs);font-size:12.5px}.cm-cardi p{margin:4px 0 0;font-size:13px;color:var(--cs)}.cm-cardi span{display:block;text-align:center;margin-top:8px;padding:8px;border-radius:8px;background:var(--cf);color:var(--ck);font-weight:600;font-size:14.5px;cursor:pointer}
.cm-dm{display:flex;padding:3px 14px}.cm-dm.me{justify-content:flex-end}.cm-dm>span{max-width:260px;padding:8px 13px;border-radius:18px;background:var(--cc);font-size:16px;line-height:1.45;word-break:break-word}.cm-dm.me>span{background:var(--ck);color:#fff}.cm-dm .cm-card{color:var(--ct)}
.cm-memb{background:var(--cb)!important}.cm-mh{height:150px;background-size:cover;background-position:center;cursor:pointer}.cm-mi{display:flex;flex-direction:column;align-items:center;text-align:center;margin-top:-40px;padding:0 20px 18px}.cm-mi .cm-av{border:3px solid var(--cb)}.cm-mi b{font-size:22px;margin-top:6px}.cm-mi small{color:var(--cs);font-size:13px}.cm-mi>div{margin-top:6px}.cm-mi p{font-size:14.5px;margin:8px 0 0}.cm-mi p.warn{color:#ff3b30}
.cm-acts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 16px 22px}.cm-acts span{background:var(--cc);border-radius:12px;padding:10px 0;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--ck);font-size:13px;cursor:pointer}.cm-acts i{font-style:normal;font-size:19px}
.cm-ebg{height:150px;background:var(--cf) center/cover;display:flex;align-items:flex-end;justify-content:flex-end;padding:10px;cursor:pointer}.cm-ebg span{background:rgba(0,0,0,.45);color:#fff;font-size:12.5px;padding:4px 10px;border-radius:999px}
.cm-eav{position:relative;width:max-content;margin:-42px auto 18px;cursor:pointer}.cm-eav .cm-av{border:3px solid var(--cb)}.cm-eav i{position:absolute;right:-2px;bottom:2px;font-style:normal;background:var(--cc);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.15)}
.cm-2b{display:flex;gap:8px;margin-top:10px}.cm-2b span{flex:1;text-align:center;padding:8px 0;border-radius:8px;background:var(--cf);color:var(--ck);font-weight:600;font-size:15px;cursor:pointer}.cm-2b span.red{color:#ff3b30}
.cm-ah{display:flex;align-items:center;gap:8px}.cm-ah small{margin-left:auto}
`);
// 280：跟开屏登录（js/92）共用一把钥匙——哪边登录的，另一边都算登录了
function gateSync() { try { window.gyGate && S.tok && window.gyGate.set(S.tok, S.url); } catch (e) {} }
window.addEventListener('gy-gate-logout', () => { S.tok = ''; B = null; save(); });
window.addEventListener('gy-gate-login', e => { const d = e.detail || {}; if (!d.tok || d.tok === S.tok) return; S.tok = d.tok; S.url = DEFAULT_URL; B = null; save(); });
(async () => { await G.ready(); S = Object.assign(S, await ST.get('s', {}) || {}); S.url = DEFAULT_URL;
    try { const g = window.gyGate; if (g && (g.tok !== S.tok)) { S.tok = g.tok; S.url = DEFAULT_URL; save(); } } catch (e) {}   /* 钥匙以开屏登录那边为准 */
    S.read = S.read || {}; S.lastSeen = S.lastSeen || {}; S.said = S.said || []; })();
window.gysCommState = () => ({ S, B, MSGS, DMS });
