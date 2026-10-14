/* ⏰ 准点群聊：学《Mystic Messenger》——每天固定几个时间点（默认中午 12:30、晚上 22:00），角色们会准时在群里开聊；群聊顶上会提示下一场几点、正在开就亮红点，群设置里能单独开关这个群。你可以进去插话，大家会接你的话；也可以错过——错过了只能翻记录，他们还会发现你没来。时间、每场开多久、在哪个群开，都你来定 */
if (window.__gyxOnTime) return; window.__gyxOnTime = 1;
X.feat('gyxOnTime', { n: '⏰ 准点群聊', desc: '每天固定几个时间点，角色们准时在群里开聊，你可以来也可以错过' });
const S = X.store('ontime');
let D = { ev: [], done: {}, cfg: { times: ['12:30', '22:00'], win: 15, gids: [], make: true } };   // ev: {id,gid,day,time,start,end,topic,lines:[{cid,text,at,posted}],joined,missSaid}
const save = () => S.set('d', D);
const DEF_CHAT = `下面这几个人在同一个群里，现在是 {{时间}}，到了大家约好的「准点群聊」时间，他们准时上线开聊：
{{成员}}
群里最近说过的：
{{最近}}
写这一场群聊：先有人起个话题（跟时间、天气、各自今天的事、或者彼此之间的梗有关），然后大家你一句我一句接下去，有人抬杠、有人跑题、有人@她（{{她}}）问她来不来。每个人说话要符合自己的性格。8~12 句，每句短，像真的群聊。
只输出 JSON：{"topic":"这场在聊什么，12字内","lines":[{"who":"名字","text":"说的话"}]}`;
const DEF_MISS = `今天 {{时间}} 的准点群聊她没来（你们聊的是「{{话题}}」）。在群里 @ 她说一句（吐槽、想她、或者假装不在意），一句话，20 字以内。`;
X.plGroup('⏰ 准点群聊', 'gyxOnTime', [['ontime.chat', '准点群聊：大家在群里聊什么', '每到一个准点时间', '{{时间}} {{成员}} {{最近}} {{她}}'], ['ontime.miss', '你没来，群里有人 @ 你', '那一场结束了你还没来', '{{时间}} {{话题}}']], { 'ontime.chat': DEF_CHAT, 'ontime.miss': DEF_MISS });
const groups = () => (typeof groupChats !== 'undefined' ? groupChats : []).filter(g => g && Array.isArray(g.members) && g.members.filter(id => X.char(id)).length >= 2 && !((D.cfg.off || []).includes(String(g.id))));
const allGroups = () => (typeof groupChats !== 'undefined' ? groupChats : []).filter(g => g && Array.isArray(g.members) && g.members.filter(id => X.char(id)).length >= 2);
const pickGroup = () => { const G = groups(), pref = G.filter(g => D.cfg.gids.includes(String(g.id))); if (pref.length) return X.pick(pref); if (D.cfg.gids.length && !pref.length && G.length) return null; return G.length ? X.pick(G) : null; };
function makeGroup() {
    const cs = X.chars().slice(0, 4); if (cs.length < 2 || typeof groupChats === 'undefined') return null;
    const g = { id: 'g_ot' + Date.now().toString(36), name: '准点开聊', members: cs.map(c => c.id), avatarImg: null, speakOrder: 'all', gyxOnTime: 1 };
    groupChats.push(g); try { saveAllData(); renderChatCharList(); } catch (e) {} return g;
}
function gsay(gid, cid, text, at) {
    try { const L = globalChats[gid] = globalChats[gid] || []; L.push({ sender: X.char(cid) ? X.char(cid).id : cid, text: String(text), timestamp: at || Date.now(), readBy: [], gyx: 1, gyxOnTime: 1 }); L.sort((a, b) => a.timestamp - b.timestamp); saveAllData(); if (String(currentChatSessionId) === String(gid)) renderChatMessages(); renderChatCharList(); } catch (e) {}
}
const tAt = (day, hm) => { const [h, m] = String(hm).split(':').map(Number); const d = new Date(day + 'T00:00:00'); d.setHours(h || 0, m || 0, 0, 0); return d.getTime(); };
const live = () => D.ev.find(e => Date.now() >= e.start && Date.now() <= e.end + 5 * 60000 && !e.closed);
async function open_(hm, day, force) {
    let g = pickGroup(); if (!g && D.cfg.make && !allGroups().length) g = makeGroup(); if (!g) return null;
    const start = force ? Date.now() : tAt(day, hm), end = start + (+D.cfg.win || 15) * 60000;
    const mem = g.members.map(id => X.char(id)).filter(Boolean);
    const recent = ((globalChats[g.id] || []).slice(-10).map(m => (m.sender === 'me' ? X.me(mem[0]) : X.name(X.char(m.sender))) + '：' + X.plain(m.text).slice(0, 60)).join('\n')) || '（还没人说过话）';
    let o = X.bailu() ? null : X.json(await X.ask(X.pl('ontime.chat', DEF_CHAT, { 时间: hm + (new Date().getHours() < 14 ? '（中午）' : '（晚上）'), 成员: mem.map(c => `${X.name(c)}：${X.persona(c).slice(0, 120)}`).join('\n'), 最近: recent, 她: X.me(mem[0]) })));
    let lines = o && Array.isArray(o.lines) ? o.lines.map(l => { const c = mem.find(x => X.name(x) === String(l.who || '').trim() || x.name === String(l.who || '').trim()); return c && X.plain(l.text) ? { cid: String(c.id), text: X.plain(l.text).slice(0, 120) } : null; }).filter(Boolean) : [];
    if (lines.length < 3) lines = [[0, '准点打卡！'], [1, '来了来了'], [0, '今天大家都在干嘛'], [1, '刚忙完，累死'], [0, '@' + X.me(mem[0]) + ' 你呢？来不来']].map(([i, t]) => ({ cid: String(mem[i % mem.length].id), text: t }));
    const span = end - start - 60000; lines.forEach((l, i) => { l.at = start + Math.round(span * (i / lines.length) * (0.85 + Math.random() * .15)); });
    const e = { id: 'ot' + Date.now().toString(36), gid: String(g.id), gname: g.name, day, time: hm, start, end, topic: X.plain((o && o.topic) || '准点打卡').slice(0, 20), lines, joined: false, missSaid: false };
    D.ev.unshift(e); D.ev = D.ev.slice(0, 120); await save();
    if (Date.now() <= end) { X.notify(mem[0], `⏰ <b>${X.esc(g.name)}</b> ${X.v('准点开聊了', '大家上线了', '到点了，群里热闹起来了')}`, e.topic, () => window.gyxOnTimeGo(e.gid)); X.toast(X.v('⏰ 准点群聊开始了', '⏰ 群里开聊了'), `${g.name} · ${e.topic}`); }
    tick(); return e;
}
function tick() {
    const now = Date.now();
    D.ev.forEach(e => {
        if (e.closed) return;
        if (!e.joined) e.lines.forEach(l => { if (!l.posted && l.at <= now) { l.posted = true; gsay(e.gid, l.cid, l.text, l.at); } });
        if (now > e.end && !e.closed) { e.closed = true; if (!e.joined) missed(e); }
    });
    save();
}
async function missed(e) {
    if (e.missSaid || !X.on('gyxOnTime.auto')) return; e.missSaid = true;
    const c = X.char(X.pick(e.lines).cid); if (!c) return;
    let t = X.bailu() ? null : await X.ask(`${X.who(c)}\n${X.pl('ontime.miss', DEF_MISS, { 时间: e.time, 话题: e.topic })}`);
    gsay(e.gid, c.id, X.plain(t || '') || X.v(`@${X.me(c)} 又没来！`, `@${X.me(c)} 你今天去哪了`, `@${X.me(c)} 下次准点记得来啊`)); save();
}
// 你在那个群里说话 = 来了
X.wrapFn('sendChatMessage', 'ontime', () => { const e = live(); if (e && String(currentChatSessionId) === e.gid && !e.joined) { e.joined = true; e.joinAt = Date.now(); save(); } });
setInterval(() => { try {
    if (!X.on('gyxOnTime')) return; const day = X.day();
    (D.cfg.times || []).forEach(hm => { const k = day + ' ' + hm, T = tAt(day, hm); if (D.done[k] || Date.now() < T) return; D.done[k] = 1; if (Date.now() - T > 6 * 36e5) return; open_(hm, day); });
    Object.keys(D.done).forEach(k => { if (k.slice(0, 10) < X.day(new Date(Date.now() - 3 * 864e5))) delete D.done[k]; });
    tick();
} catch (e) {} }, 30000);
window.gyxOnTimeGo = gid => { try { switchMainView('chat'); switchChatSession(gid); } catch (e) {} document.getElementById('gyxOnTimeOv')?.remove(); };
window.gyxOnTimeNow = async btn => { if (btn) { btn.disabled = true; btn.textContent = '大家正在上线… ⏳'; } const e = await open_(new Date().toTimeString().slice(0, 5), X.day(), true); if (!e) X.toast('开不了', '要有一个至少两个角色的群（或者打开「没有群就自动建一个」）'); window.gyxOnTimeOpen(); };
window.gyxOnTimeCfg = (k, v) => { D.cfg[k] = v; save(); window.gyxOnTimeOpen(); };
window.gyxOnTimeAdd = () => { const el = document.getElementById('gyxOtT'); const v = el && el.value; if (v && !D.cfg.times.includes(v)) { D.cfg.times.push(v); D.cfg.times.sort(); save(); } window.gyxOnTimeOpen(); };
window.gyxOnTimeRm = v => { D.cfg.times = D.cfg.times.filter(x => x !== v); save(); window.gyxOnTimeOpen(); };
window.gyxOnTimeG = (gid, v) => { const s = new Set(D.cfg.gids); v ? s.add(String(gid)) : s.delete(String(gid)); D.cfg.gids = [...s]; if (v) D.cfg.off = (D.cfg.off || []).filter(x => x !== String(gid)); save(); };
window.gyxOnTimeDel = async id => { D.ev = D.ev.filter(e => e.id !== id); await save(); window.gyxOnTimeOpen(); };
window.gyxOnTimeData = () => D; window.gyxOnTimeTick = tick;
const nextTime = () => { const now = new Date(), hm = now.toTimeString().slice(0, 5), t = (D.cfg.times || []).find(x => x > hm); return t ? '今天 ' + t : (D.cfg.times[0] ? '明天 ' + D.cfg.times[0] : '没设时间'); };
window.gyxOnTimeOpen = function () {
    const c = D.cfg, G = allGroups(), e = live(), past = D.ev.filter(x => x.closed), rate = past.length ? Math.round(past.filter(x => x.joined).length / past.length * 100) : null;
    X.panel('gyxOnTimeOv', '⏰ 准点群聊', `${e ? `<div class="gyx-card"><b>🔴 正在开聊：${X.esc(e.gname)}</b><div class="gyx-tip">「${X.esc(e.topic)}」· 到 ${new Date(e.end).toTimeString().slice(0, 5)} ${e.joined ? '· 你来了 ✅' : ''}</div><button class="gyx-btn" onclick="gyxOnTimeGo('${e.gid}')">进群</button></div>` : `<div class="gyx-tip">下一场：${nextTime()}${rate != null ? ` · 你的准点出勤率 ${rate}%` : ''}</div>`}
      <h4 class="ot-h">每天几点开聊</h4><div class="gyx-row">${c.times.map(t => `<span class="gyx-chip on" onclick="gyxOnTimeRm('${t}')">${t} ✕</span>`).join('')}<input id="gyxOtT" type="time" class="gyx-who"><button class="gyx-btn lite" onclick="gyxOnTimeAdd()">加一个</button></div>
      <div class="gyx-row gyx-tip">每场开 <input class="gyx-who" type="number" min="5" max="120" value="${c.win}" style="width:56px" onchange="gyxOnTimeCfg('win',+this.value)"> 分钟；在这段时间里你在群里说话就算「来了」，大家会接你的话。</div>
      <h4 class="ot-h">在哪个群开</h4>${G.length ? G.map(g => `<label class="gyx-row gyx-tip" style="margin:2px 0"><input type="checkbox" ${c.gids.includes(String(g.id)) ? 'checked' : ''} onchange="gyxOnTimeG('${g.id}',this.checked)"> ${X.esc(g.name)}${(c.off || []).includes(String(g.id)) ? '（在群设置里关掉了）' : ''}（${g.members.filter(id => X.char(id)).map(id => X.esc(X.name(X.char(id)))).join('、')}）</label>`).join('') + '<div class="gyx-tip">一个都不勾 = 每次随便挑一个群。</div>' : '<div class="gyx-tip">还没有群。</div>'}
      <div class="gyx-row"><label class="gyx-tip" style="font-size:13.5px"><input type="checkbox" ${c.make ? 'checked' : ''} onchange="gyxOnTimeCfg('make',this.checked)"> 没有群的话，自动建一个「准点开聊」群</label></div>
      <div class="gyx-row"><button class="gyx-btn" onclick="gyxOnTimeNow(this)">现在就开一场</button></div>
      <h4 class="ot-h">以前的场次</h4>${D.ev.slice(0, 20).map(x => `<div class="ot-r" onclick="gyxOnTimeGo('${x.gid}')"><b>${x.day.slice(5)} ${x.time}</b> ${X.esc(x.gname)} ${x.joined ? '<em class="y">来了</em>' : x.closed ? '<em>错过了</em>' : '<em class="y">进行中</em>'}<span>${X.esc(x.topic)}</span><i onclick="event.stopPropagation();gyxOnTimeDel('${x.id}')">删</i></div>`).join('') || '<div class="gyx-tip">还没开过。</div>'}`);
};
// 💬 放进群聊里：群聊顶上一条小横幅（下一场几点 / 正在开聊亮红点）；群设置里能单独开关这个群
const grpOn = gid => !(D.cfg.off || []).includes(String(gid)) && (!D.cfg.gids.length || D.cfg.gids.includes(String(gid)));
// 群设置里关掉 = 进「不参加」名单；打开 = 拿出来（要是你在准点群聊页只勾了几个群，也把它勾上）
window.gyxOnTimeGrp = (gid, v) => { gid = String(gid); const off = new Set(D.cfg.off || []); if (v) { off.delete(gid); if (D.cfg.gids.length && !D.cfg.gids.includes(gid)) D.cfg.gids.push(gid); } else { off.add(gid); D.cfg.gids = D.cfg.gids.filter(x => x !== gid); } D.cfg.off = [...off]; save(); bar(); };
function bar() {
    try {
        const area = document.getElementById('chatMessagesArea'); if (!area) return; let b = document.getElementById('gyxOtBar');
        const sid = String(typeof currentChatSessionId !== 'undefined' ? currentChatSessionId : ''), g = groups().find(x => String(x.id) === sid);
        if (!X.on('gyxOnTime') || !g || !grpOn(g.id) || !(D.cfg.times || []).length) { if (b) b.remove(); return; }
        if (!b) { b = document.createElement('div'); b.id = 'gyxOtBar'; area.parentNode.insertBefore(b, area); }
        const e = live(), here = e && e.gid === sid;
        b.innerHTML = here ? `<span class="ot-dot"></span>准点群聊进行中：「${X.esc(e.topic)}」· 到 ${new Date(e.end).toTimeString().slice(0, 5)}${e.joined ? ' · 你来了 ✅' : ' · 说句话就算来了'}` : `⏰ 准点群聊 · 下一场 ${nextTime()}`;
        b.onclick = () => window.gyxOnTimeOpen();
    } catch (e) {}
}
window.gyxOnTimeBar = bar; setInterval(bar, 4000); X.wrapFn('switchChatSession', 'ontimebar', null, () => setTimeout(bar, 60));
X.wrapFn('renderGroupMuteCheckboxes', 'ontime', null, () => { try {
    const box = document.getElementById('groupMuteCheckboxes'), sid = String(currentChatSessionId); if (!box || !X.on('gyxOnTime')) return;
    let d = document.getElementById('gyxOtGrpSet'); if (!d) { d = document.createElement('div'); d.id = 'gyxOtGrpSet'; d.style.cssText = 'margin-top:10px'; box.parentNode.appendChild(d); }
    d.innerHTML = `<label style="font-size:13px;color:#1d9bf0;display:flex;align-items:center;gap:6px"><input type="checkbox" ${grpOn(sid) ? 'checked' : ''} onchange="gyxOnTimeGrp('${sid}',this.checked)"> ⏰ 这个群参加准点群聊</label><div class="form-hint" style="margin:4px 0 0">每天 ${(D.cfg.times || []).join('、') || '（还没设时间）'} 大家会准时在群里开聊。<span style="cursor:pointer;color:#1d9bf0" onclick="gyxOnTimeOpen()">改时间 ›</span></div>`;
} catch (e) {} });
X.ctx(id => { const e = D.ev.find(x => x.lines.some(l => l.cid === String(id)) && Date.now() - x.start < 864e5); if (!e) return ''; if (!e.closed) return `【准点群聊正在进行】你们在「${e.gname}」群里准点开聊「${e.topic}」，${e.joined ? '她来了。' : '她还没来。'}`; return e.joined ? '' : `【准点群聊她没来】今天 ${e.time} 你们在群里准点开聊「${e.topic}」，她没来。可以提一嘴（吐槽、想她、或者假装不在意）。`; }, 'gyxOnTime');
X.inj('gyxOnTime', [['准点群聊正在进行', '准点群聊正在进行', '那一场开着的时候，群里的人知道在聊什么、她来没来。'], ['准点群聊她没来', '准点群聊你没来', '一天之内群里的人记得你没来。']]);
X.action({ key: 'gyx_ontime_call', label: '群里准点开聊了她还没来，私聊喊她来群里', hint: '准点群聊', need: c => { const e = live(); return !!e && !e.joined && !e.called && e.lines.some(l => l.cid === String(c.id)); }, run: async c => { const e = live(); e.called = 1; save(); return (await X.reach(c, `你们「${e.gname}」群准点开聊了（在聊「${e.topic}」），她还没来。私聊喊她来群里。`)) ? '喊你来群里准点开聊' : null; } }, 'gyxOnTime');
X.today(() => { const L = D.ev.filter(e => e.day === X.day()); return { title: '⏰ 准点群聊', rows: L.map(e => ({ t: e.time, x: X.esc(e.gname) + ' · ' + (e.joined ? '你来了' : e.closed ? '错过了' : '正在聊'), go: `gyxOnTimeGo('${e.gid}')` })).concat([{ t: '下一场', x: nextTime(), go: 'gyxOnTimeOpen()' }]) }; }, 'gyxOnTime');
X.widget('gyxOnTimeW', { n: '准点群聊', sizes: ['s', 'm'], tap: () => { const e = live(); e ? window.gyxOnTimeGo(e.gid) : window.gyxOnTimeOpen(); }, r: w => { const e = live(); return X.gw(w, '⏰', '准点群聊', e ? ['🔴 正在聊', X.esc(e.topic)] : [nextTime()]); } }, 'gyxOnTime');
X.mem({ k: 'gyxOnTime', ico: '⏰', n: '准点群聊', d: '每一场聊了什么、你来没来（删了群里的人就不记得这场）', items: () => D.ev, text: x => `${x.day} ${x.time} ${x.gname}：${x.topic}${x.joined ? '（你来了）' : x.closed ? '（你没来）' : ''}`, meta: x => x.lines.length + ' 句', edit: (x, v) => { const m = String(v).match(/：(.*?)(（|$)/); if (m) x.topic = m[1]; }, del: (c, i) => { D.ev.splice(i, 1); }, save }, 'gyxOnTime');
X.css('gyxOnTimeCss', `.ot-h{font-size:14px;margin:14px 0 4px}.ot-r{position:relative;padding:9px 26px 9px 0;border-bottom:1px solid #f2f2f4;font-size:13.5px;cursor:pointer}.ot-r em{font-style:normal;font-size:11px;background:#f2f2f4;border-radius:6px;padding:0 5px;margin-left:4px}.ot-r em.y{background:#e8f8ee;color:#1a7f37}.ot-r span{display:block;color:#666;margin-top:2px}.ot-r i{position:absolute;right:0;top:10px;font-style:normal;font-size:11px;color:#aaa}#gyxOtBar{flex-shrink:0;padding:6px 12px;font-size:12.5px;color:#536471;background:rgba(255,255,255,.85);border-bottom:1px solid #eff3f4;cursor:pointer;text-align:center}.ot-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff3b30;margin-right:6px;vertical-align:1px;animation:otPulse 1.2s infinite}@keyframes otPulse{50%{opacity:.3}}`);
X.mini({ id: 'gyxOnTime', icon: '⏰', title: '准点群聊', desc: '每天固定时间，角色们准时在群里开聊', cat: '生活', onOpen: () => window.gyxOnTimeOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.ev = D.ev || []; D.done = D.done || {}; D.cfg = Object.assign({ times: ['12:30', '22:00'], win: 15, gids: [], off: [], make: true }, D.cfg || {}); if (!D.inst) { D.inst = Date.now(); const day = X.day(); D.cfg.times.forEach(t => { if (tAt(day, t) < Date.now()) D.done[day + ' ' + t] = 1; }); save(); } })();
