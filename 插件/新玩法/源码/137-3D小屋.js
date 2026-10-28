/* 🧊 3D小屋：「我们的小屋」的 3D 版——床、餐桌、沙发、书架、窗户，屋里的小物件照样摆着。你操控自己的小人走来走去（点地板走过去、点家具就去用它），走到 TA 旁边能打招呼、抱抱、戳戳、摸头、说话、叫 TA 一起吃饭看书睡觉跳舞。TA 开了自主行动就自己决定想干嘛；没开就按作息过日子：饭点吃饭、晚上睡觉、平时看书发呆玩手机 */
if (window.__gyx3dRoom) return; window.__gyx3dRoom = 1;
X.feat('gyx3dRoom', { n: '🧊 3D 小屋', desc: '小屋的 3D 版：两个小人在屋里走动、互动；TA 自己过日子' });
const S = X.store('room3d');
let R3 = { log: [], st: {}, cfg: { chat: false, night: 'auto', talkChat: true } };
const save = () => S.set('d', R3);
let ROOM = null, CID = null, OPEN = 0, BUSY = false;
const SPOT_CN = { bed: '床上', bed2: '床上', bedside: '床边', table1: '餐桌', table2: '餐桌', sofa: '沙发上', sofa2: '沙发上', window: '窗边', shelf: '书架前', rug: '地毯上', door: '门口' };
const STATE_CN = { idle: '待着', sleep: '睡觉', eat: '吃饭', read: '看书', daze: '发呆', phone: '玩手机', think: '想事情', dance: '自己跳舞', sit: '坐着', walk: '走来走去' };
const PAIR = { bed: 'bed2', bed2: 'bed', table1: 'table2', table2: 'table1', sofa: 'sofa2', sofa2: 'sofa' };
const THING = { bed: 'bed', table: 'table1', sofa: 'sofa', shelf: 'shelf', window: 'window', door: 'door' };
const ACT_CN = () => window.gyx3dActList ? window.gyx3dActList() : 'wave(挥手) / nod(点头) / hug(张开手要抱) / shy(害羞) / heart(比心)';
X.plGroup('🧊 3D 小屋', '🧊 3D 小屋', [['3d.room.self', 'TA 自己决定在小屋里干嘛'], ['3d.room.react', '你在小屋里找 TA 时 TA 的反应']], {
    '3d.room.self': '{{who}}\n最近的聊天：\n{{recent}}\n\n现在是 {{time}}。你们有一间小屋，你在小屋里（3D 的小小的你），现在在{{where}}{{doing}}。她{{her}}。\n屋里能去的地方：{{spots}}\n能做的事：{{states}}\n按你的性格、此刻的心情和时间，决定接下来干嘛（也可以去她旁边找她）。想说话就说一句（口语，20 字以内，不想说给空字符串）。\n只输出 JSON：{"go":"地方的英文名，或者 her（去她身边）","do":"做的事的英文名","say":"","why":"一句话说为什么（10 字内）"}',
    '3d.room.react': '{{who}}\n最近的聊天：\n{{recent}}\n\n你们在你们的小屋里（3D 的小小的你们）。你现在在{{where}}{{doing}}。{{event}}\n当场反应：说一句（口语，30 字以内），选一个动作（{{acts}}），一个表情（normal/happy/shy/angry/sad/surprised/closed）。{{ask}}\n只输出 JSON：{"say":"","act":"","face":""{{askKey}}}'
});
function routine(cid) {
    const d = new Date(), h = d.getHours(), m = d.getMinutes();
    if (h >= 23 || h < 7) return { spot: 'bed', state: 'sleep', why: '睡觉时间' };
    if (h === 7 && m >= 30 || h === 8 && m < 15) return { spot: 'table1', state: 'eat', why: '吃早饭' };
    if (h === 12) return { spot: 'table1', state: 'eat', why: '吃午饭' };
    if (h === 18 && m >= 20 || h === 19 && m < 10) return { spot: 'table1', state: 'eat', why: '吃晚饭' };
    const L = [['sofa', 'read', '看书'], ['sofa2', 'daze', '发呆'], ['window', 'daze', '看窗外'], ['shelf', 'think', '找书'], ['bedside', 'phone', '玩手机'], ['rug', 'dance', '自己跳舞'], ['rug', 'idle', '站着发呆'], ['sofa', 'phone', '躺沙发玩手机']];
    if (h >= 13 && h < 14) L.push(['bed', 'sleep', '睡午觉'], ['bed', 'sleep', '睡午觉']);
    let k = Math.floor(Date.now() / (9 * 60000)) + String(cid).length * 7; k = (k * 2654435761) >>> 0;
    const p = L[k % L.length]; return { spot: p[0], state: p[1], why: p[2] };
}
const nowSt = cid => R3.st[String(cid)] || null;
function setSt(cid, o) { R3.st[String(cid)] = Object.assign({ at: Date.now() }, o); save(); }
function log(cid, t) { R3.log.push({ cid: String(cid), at: Date.now(), t }); if (R3.log.length > 300) R3.log.splice(0, R3.log.length - 300); save(); paintLog(); }
function where(s) { return s ? (SPOT_CN[s.spot] || '屋里') : '屋里'; }
function doing(s) { return s ? '，' + (STATE_CN[s.state] || s.state || '') : ''; }
// TA 自己决定（开了自主行动）
async function decide(c) {
    const s = nowSt(c.id) || {}, me = ROOM && OPEN ? (() => { const a = ROOM.avs.me; if (!a) return '不在小屋里'; const ss = Object.keys(window.GY3D.SPOTS).find(k => { const p = window.GY3D.SPOTS[k].pos; return Math.hypot(p[0] - a.av.holder.position.x, p[1] - a.av.holder.position.z) < 0.5; }); return '也在小屋里' + (ss ? '，在' + SPOT_CN[ss] : '') + (a.av.state && a.av.state !== 'idle' ? '，' + (STATE_CN[a.av.state] || '') : ''); })() : '现在不在小屋里（在外面用手机）';
    if (X.bailu()) { const r = routine(c.id); return Object.assign(r, { say: X.cards(['小屋', '聊天'], c, 1)[0] || '', by: 'auto' }); }
    const d = new Date(), j = X.json(await X.ask(X.pl('3d.room.self', '', { who: X.who(c), recent: X.recent(c, 10) || '（还没聊）', time: `${d.getHours()} 点 ${d.getMinutes()} 分`, where: where(s), doing: doing(s), her: me, spots: Object.keys(window.GY3D.SPOTS).filter(k => !/2$/.test(k)).map(k => k + '(' + window.GY3D.SPOTS[k].n + ')').join(' / '), states: Object.keys(STATE_CN).filter(k => k !== 'walk').map(k => k + '(' + STATE_CN[k] + ')').join(' / ') })));
    if (!j) return Object.assign(routine(c.id), { by: 'routine' });
    let spot = String(j.go || '').trim(), state = String(j.do || '').trim();
    if (!STATE_CN[state]) state = Object.keys(STATE_CN).find(k => STATE_CN[k] === state) || 'idle';
    if (spot !== 'her' && !window.GY3D.SPOTS[spot]) spot = Object.keys(SPOT_CN).find(k => String(j.go || '').includes(SPOT_CN[k].replace('上', ''))) || 'rug';
    return { spot, state, say: X.plain(String(j.say || '')).slice(0, 40), why: X.plain(String(j.why || '')).slice(0, 20), by: 'auto' };
}
async function refreshTA(force) {
    const c = X.char(CID); if (!c) return;
    const old = nowSt(c.id), auto = X.auto(c);
    let n;
    if (auto) { if (!force && old && old.by === 'auto' && Date.now() - old.at < 7 * 60000) return; if (BUSY) return; BUSY = true; try { n = await decide(c); } finally { BUSY = false; } }
    else { n = Object.assign(routine(c.id), { by: 'routine' }); if (!force && old && old.by === 'routine' && old.spot === n.spot && old.state === n.state) return; }
    if (!n) return;
    setSt(c.id, n);
    if (OPEN && ROOM) { applyTA(n, true); if (n.say) ROOM.say('ta', n.say); }
    if (n.by === 'auto' && n.say || n.spot !== (old && old.spot)) log(c.id, `${X.name(c)} 去了${n.spot === 'her' ? '你身边' : SPOT_CN[n.spot] || '屋里'}${STATE_CN[n.state] ? '，' + STATE_CN[n.state] : ''}${n.why ? '（' + n.why + '）' : ''}${n.say ? '：「' + n.say + '」' : ''}`);
}
function applyTA(n, walk) {
    if (!ROOM || !ROOM.avs.ta) return;
    if (n.spot === 'her') { const me = ROOM.avs.me.av.holder.position, ta = ROOM.avs.ta.av.holder.position; const dx = ta.x - me.x, dz = ta.z - me.z, L = Math.hypot(dx, dz) || 1; ROOM.go('ta', { x: me.x + dx / L * 0.85, z: me.z + dz / L * 0.85 }, { state: n.state === 'sleep' ? 'idle' : n.state, fn: () => { ROOM.face('ta', 'me'); ROOM.avs.ta.av.play('wave'); } }); return; }
    let spot = n.spot; const sp = window.GY3D.SPOTS[spot]; if (!sp) return;
    const st = n.state || sp.state;
    if (walk) ROOM.go('ta', spot, { state: st });
    else { ROOM.place('ta', sp.pos[0], sp.pos[1], sp.rot); ROOM.avs.ta.av.holder.position.y = sp.y || 0; ROOM.avs.ta.av.setState(st); }
}
// 你在小屋里找 TA
const EV = { hi: ['跟你打了个招呼', 'wave'], hug: ['走过来抱住了你', 'hug'], poke: ['戳了戳你', 'poke'], pat: ['摸了摸你的头', 'pat'], dance: ['拉着你要一起跳舞', 'dance'], eat: ['叫你一起去吃饭', 'wave'], read: ['叫你一起去沙发上看书', 'wave'], sleep: ['叫你一起去睡觉', 'yawn'], talk: ['对你说', 'nod'], heart: ['对你比了个心', 'heart'] };
const LOGT = { hi: '跟 TA 打了个招呼', hug: '抱了抱 TA', poke: '戳了戳 TA', pat: '摸了摸 TA 的头', dance: '拉 TA 一起跳舞', eat: '叫 TA 一起吃饭', read: '叫 TA 一起看书', sleep: '叫 TA 一起睡觉', talk: '对 TA 说', heart: '对 TA 比了个心' };
const TOGETHER = { eat: ['table1', 'table2', 'eat'], read: ['sofa', 'sofa2', 'read'], sleep: ['bed', 'bed2', 'sleep'], dance: [null, null, 'dance'] };
function walkTo(key, to, then) { return new Promise(r => ROOM.go(key, to, Object.assign({}, then || {}, { fn: () => { try { then && then.fn && then.fn(); } catch (e) {} r(); } }))); }
window.gyx3dRoomDo = async function (kind) {
    if (!ROOM || !ROOM.avs.ta || BUSY) return; const c = X.char(CID); if (!c) return;
    let text = '';
    if (kind === 'talk') { const inp = document.getElementById('g3rSay'); text = (inp && inp.value || '').trim(); if (!text) return inp && inp.focus(); inp.value = ''; }
    BUSY = true; setBtns(false);
    try {
        const A = ROOM.avs, s = nowSt(c.id) || {};
        // 先走到 TA 旁边
        if (ROOM.near('me', 'ta') > 1.3) { const me = A.me.av.holder.position, ta = A.ta.av.holder.position; const dx = me.x - ta.x, dz = me.z - ta.z, L = Math.hypot(dx, dz) || 1; await walkTo('me', { x: ta.x + dx / L * 0.8, z: ta.z + dz / L * 0.8 + (ta.y > 0.3 ? 0.4 : 0) }); }
        ROOM.face('me', 'ta'); A.me.av.setState('idle'); A.me.av.play(EV[kind][1]);
        if (text) ROOM.say('me', text);
        const sleeping = A.ta.av.state === 'sleep';
        const ask = TOGETHER[kind] ? '她在叫你一起，你去不去？' : '';
        let j = null;
        if (X.bailu()) j = { say: X.cards(['小屋', '聊天'], c, 1)[0] || X.pick(['嗯？', '好呀', '你干嘛啦']), act: X.pick(['shy', 'nod', 'heart', 'wave']), go: true };
        else j = X.json(await X.ask(X.pl('3d.room.react', '', { who: X.who(c), recent: X.recent(c, 8) || '（还没聊）', where: where(s), doing: doing(s) + (sleeping ? '（睡着了，被她弄醒）' : ''), event: '她' + EV[kind][0] + (text ? `：「${text}」` : '。'), acts: ACT_CN(), ask, askKey: ask ? ',"go":true' : '' })));
        if (!j) j = { say: X.pick(['嗯？', '在呢', '干嘛呀']), act: 'tilt' };
        if (sleeping && kind !== 'sleep') { A.ta.av.setState('idle'); A.ta.av.holder.position.y = 0; }
        ROOM.face('ta', 'me');
        const act = window.GY3D.ACT_CN[j.act] ? j.act : (Object.keys(window.GY3D.ACT_CN).find(k => window.GY3D.ACT_CN[k] === j.act) || 'nod');
        A.ta.av.play(act); if (j.face && window.GY3D.FACES[j.face]) A.ta.av.lockFace(j.face, 5);
        const say = X.plain(String(j.say || '')).slice(0, 60); if (say) ROOM.say('ta', say);
        log(c.id, `你${LOGT[kind]}${text ? '：「' + text + '」' : ''} → ${X.name(c)}${say ? '：「' + say + '」' : window.GY3D.ACT_CN[act]}`);
        if (R3.cfg.chat) { if (text) { (globalChats[String(c.id)] = globalChats[String(c.id)] || []).push({ sender: 'me', text, timestamp: Date.now(), readBy: [], gyx: 1, gyx3dRoom: 1 }); } if (say) X.say(c, say, { gyx3dRoom: 1 }); }
        // 一起做
        const T = TOGETHER[kind];
        if (T && j.go !== false) {
            await new Promise(r => setTimeout(r, 1400));
            if (kind === 'dance') { A.ta.av.setState('dance'); A.me.av.setState('dance'); setSt(c.id, { spot: 'rug', state: 'dance', by: 'you', why: '和你一起跳舞' }); }
            else { const taSpot = T[0], meSpot = T[1]; ROOM.go('ta', taSpot, { state: T[2] }); ROOM.go('me', meSpot, { state: T[2] }); setSt(c.id, { spot: taSpot, state: T[2], by: 'you', why: '和你一起' }); if (kind === 'sleep') ROOM.setNight(true); }
            paintLog();
        }
    } finally { BUSY = false; setBtns(true); }
};
function setBtns(on) { document.querySelectorAll('#g3rBar button').forEach(b => b.disabled = !on); }
// 点了屋里的东西
function onTap(ev) {
    if (!ROOM) return; const A = ROOM.avs;
    if (ev.type === 'floor') { ROOM.go('me', { x: ev.x, z: ev.z }); return; }
    if (ev.type === 'avatar') { if (ev.key === 'ta') window.gyx3dRoomDo('poke'); else A.me.av.play(X.pick(['wave', 'tilt', 'jump'])); return; }
    if (ev.type === 'item') { const it = (window.gyxHomeItems ? window.gyxHomeItems(CID) : []).find(x => x.id === ev.id); const b = document.getElementById('g3rInfo'); if (it && b) b.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><span style="font-size:30px">${it.img ? `<img src="${it.img}" style="width:44px;height:44px;object-fit:cover;border-radius:6px">` : X.esc(it.ico)}</span><div><b>${X.esc(it.name)}</b><div class="gyx-tip">${new Date(it.at).toLocaleDateString()} · ${it.by === 'ta' ? 'TA 放的' : it.by === 'me' ? '你放的' : '一起做过的事'}</div></div></div><div style="line-height:1.7;margin-top:4px">${X.esc(it.story || '')}</div>`; return; }
    if (ev.type === 'thing') {
        let sp = THING[ev.name]; if (!sp) return;
        const ta = nowSt(CID); if (ta && ta.spot === sp && PAIR[sp]) sp = PAIR[sp];
        const S2 = window.GY3D.SPOTS[sp];
        ROOM.go('me', sp, { state: S2.state === 'think' ? 'idle' : S2.state, fn: () => { if (ev.name === 'window' && window.gyxSillOpen) { const b = document.getElementById('g3rInfo'); if (b) b.innerHTML = `窗外静悄悄的。<button class="gyx-btn lite" onclick="document.getElementById('gyx3dRoomOv').remove();gyxSillOpen()">🪟 去窗台放点东西</button>`; } if (ev.name === 'shelf') ROOM.avs.me.av.play('think'); if (ev.name === 'door') { const b = document.getElementById('g3rInfo'); if (b) b.innerHTML = '要出门吗？<button class="gyx-btn lite" onclick="document.getElementById(\'gyx3dRoomOv\').remove()">出门（关掉小屋）</button>'; } } });
        if (ev.name === 'bed' && new Date().getHours() >= 19) ROOM.setNight(true);
    }
}
function paintLog() {
    const b = document.getElementById('g3rLog'); if (!b) return;
    const L = R3.log.filter(x => x.cid === String(CID)).slice(-6).reverse();
    b.innerHTML = L.map(x => `<div class="g3r-l"><i>${new Date(x.at).toTimeString().slice(0, 5)}</i>${X.esc(x.t)}</div>`).join('') || '<div class="gyx-tip">点地板你就走过去；点床、餐桌、沙发、书架、窗户，你就去用它；点 TA 是戳 TA。走到 TA 旁边用下面的按钮跟 TA 玩。</div>';
    const st = document.getElementById('g3rSt'), c = X.char(CID), s = nowSt(CID);
    if (st && c) st.innerHTML = `${X.esc(X.name(c))} ${s ? '在' + (s.spot === 'her' ? '你身边' : SPOT_CN[s.spot] || '屋里') + (STATE_CN[s.state] ? STATE_CN[s.state] : '') : ''} <em>${X.auto(c) ? '🤖 自主行动中，TA 自己决定干嘛' : '🕒 日常作息（开了自主行动就会自己决定）'}</em>`;
}
let keyH = null, tickT = null;
window.gyx3dRoomOpen = async function (who) {
    const c = X.char(who) || X.cur(); if (!c) return X.toast('先选一个角色', '');
    if (typeof window.gyx3dLib !== 'function') return X.toast('还差「🧊 3D 小人」', '在「📱 小手机」合集里，装上才能进 3D 小屋');
    let G; try { G = await window.gyx3dLib(); } catch (e) { return X.toast('3D 引擎没加载出来', e.message); }
    closeRoom(); CID = String(c.id);
    const walls = window.gyxHomeWalls ? window.gyxHomeWalls() : [['#f6efe6', '#d9c3a5', '暖木']], w = window.gyxHomeWallNow ? window.gyxHomeWallNow() : walls[0];
    X.panel('gyx3dRoomOv', '🏠 我们的小屋 · 3D', `<div class="gyx-row">${X.whoSel(CID, 'gyx3dRoomOpen')}${walls.map((x, i) => `<span class="gyx-chip" onclick="gyx3dRoomWall(${i})">${x[2]}</span>`).join('')}<span class="gyx-chip" onclick="gyx3dRoomNight()">🌙 / ☀️</span>${window.gyxHomeOpen ? `<span class="gyx-chip" onclick="document.getElementById('gyx3dRoomOv').remove();gyxHomeOpen('${CID}',true)">回平面小屋</span>` : ''}<label class="gyx-tip" style="margin:0"><input type="checkbox" ${window.gyxHomeCfg && window.gyxHomeCfg('open3d') ? 'checked' : ''} onchange="gyxHomeCfg&&gyxHomeCfg('open3d',this.checked)"> 每次直接进 3D</label></div>
        <div class="g3r-st"><canvas id="g3rC"></canvas><div id="g3rOv" class="g3r-ov"></div><div id="g3rSt" class="g3r-top"></div><div id="g3rLoad" class="g3r-load">小人们在进门…</div></div>
        <div id="g3rBar" class="gyx-row">${[['hi', '👋 打招呼'], ['hug', '🤗 抱抱'], ['poke', '👆 戳戳'], ['pat', '🫳 摸摸头'], ['heart', '🫶 比心'], ['dance', '💃 一起跳舞'], ['eat', '🍚 一起吃饭'], ['read', '📖 一起看书'], ['sleep', '🛌 一起睡']].map(([k, n]) => `<button class="gyx-btn lite" onclick="gyx3dRoomDo('${k}')">${n}</button>`).join('')}</div>
        <div class="gyx-row"><input id="g3rSay" class="gyx-who" style="flex:1" placeholder="走过去跟 TA 说句话…" onkeydown="if(event.key==='Enter')gyx3dRoomDo('talk')"><button class="gyx-btn" onclick="gyx3dRoomDo('talk')">说</button></div>
        <div id="g3rInfo" class="gyx-card"></div><div id="g3rLog" class="gyx-card"></div>
        <div class="gyx-row"><button class="gyx-btn lite" onclick="gyx3dRoomGift(this)">🎁 让 TA 添一件东西</button><button class="gyx-btn lite" onclick="gyx3dRoomThink(this)">🤔 TA 现在想干嘛</button>${window.gyx3dOpen ? `<button class="gyx-btn lite" onclick="gyx3dOpen('mine')">🧊 换小人的样子</button>` : ''}<label class="gyx-tip" style="margin:0"><input type="checkbox" ${R3.cfg.chat ? 'checked' : ''} onchange="gyx3dRoomCfg('chat',this.checked)"> 小屋里说的话也发进聊天</label></div>
        <div class="gyx-tip">手机：点哪走哪，左右拖动转视角；电脑：WASD / 方向键也能走，滚轮拉远拉近。${window.gyx3dModelOf && !window.gyx3dModelOf(c) ? '现在的小人是随便捏的，去「🧊 3D 小人」给 TA 和你自己捏一个就会换成你们的样子。' : ''}</div>`, 'g3r');
    OPEN = 1;
    const ob = new MutationObserver(() => { if (!document.getElementById('gyx3dRoomOv')) { closeRoom(); ob.disconnect(); } }); ob.observe(document.body, { childList: true });
    ROOM = new G.Room(document.getElementById('g3rC'), document.getElementById('g3rOv'), { wall: w[0], floor: w[1] });
    ROOM.tap = onTap;
    ROOM.setItems((window.gyxHomeItems ? window.gyxHomeItems(CID) : []).map(x => ({ id: x.id, ico: x.ico, img: x.img, x: x.x, y: x.y })));
    const h = new Date().getHours(); ROOM.setNight(h >= 19 || h < 6);
    try {
        const [ta, me] = await Promise.all([window.gyx3dAvFor(c), window.gyx3dAvFor('me')]);
        if (!ROOM) { ta.dispose(); me.dispose(); return; }
        ROOM.add('ta', ta); ROOM.add('me', me);
    } catch (e) { const l = document.getElementById('g3rLoad'); if (l) l.textContent = '小人没做出来：' + e.message; return; }
    const l = document.getElementById('g3rLoad'); if (l) l.remove();
    let s = nowSt(CID); if (!s || (s.by !== 'auto' && s.by !== 'you') || Date.now() - s.at > 30 * 60000) { s = Object.assign(routine(CID), { by: 'routine' }); setSt(CID, s); }
    applyTA(s.spot === 'her' ? Object.assign({}, s, { spot: 'rug' }) : s, false);
    ROOM.place('me', 3.3, 2.4, -2.4); ROOM.go('me', { x: 1.6, z: 1.6 }, { fn: () => { if (ROOM && ROOM.avs.ta && ROOM.avs.ta.av.state !== 'sleep') { ROOM.face('ta', 'me'); ROOM.avs.ta.av.play('wave'); ROOM.say('ta', X.v('你回来啦', '回来啦？', '嗨～', '等你好久了')); } } });
    paintLog();
    keyH = e => { if (!ROOM || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return; const K = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] }[e.key]; if (!K) return; e.preventDefault(); const yaw = ROOM.camYaw, p = ROOM.avs.me.av.holder.position; const x = K[0] * Math.cos(yaw) + K[1] * Math.sin(yaw), z = -K[0] * Math.sin(yaw) + K[1] * Math.cos(yaw); ROOM.go('me', { x: p.x + x * 0.9, z: p.z + z * 0.9 }); };
    addEventListener('keydown', keyH);
    // TA 过自己的日子
    tickT = setInterval(() => { if (OPEN && !document.hidden) refreshTA(false).then(paintLog); }, 20000);
    if (X.auto(c) && (!s || s.by !== 'auto' || Date.now() - s.at > 7 * 60000)) setTimeout(() => refreshTA(true).then(paintLog), 2500);
};
function closeRoom() { OPEN = 0; if (ROOM) { try { ROOM.dispose(); } catch (e) {} ROOM = null; } if (keyH) removeEventListener('keydown', keyH); keyH = null; clearInterval(tickT); }
window.gyx3dRoomWall = i => { const W = window.gyxHomeWalls ? window.gyxHomeWalls() : []; const w = W[i]; if (!w || !ROOM) return; ROOM.setColors(w[0], w[1]); window.gyxHomeSetWall && window.gyxHomeSetWall(i); };
window.gyx3dRoomNight = () => { if (!ROOM) return; ROOM.__n = !(ROOM.__n == null ? (new Date().getHours() >= 19 || new Date().getHours() < 6) : ROOM.__n); ROOM.setNight(ROOM.__n); };
window.gyx3dRoomCfg = (k, v) => { R3.cfg[k] = v; save(); };
window.gyx3dRoomGift = async btn => { if (!window.gyxHomeGift3d) return X.toast('要装「🏠 我们的小屋」', ''); btn.disabled = true; const it = await window.gyxHomeGift3d(CID); btn.disabled = false; if (!it || !ROOM) return; ROOM.setItems(window.gyxHomeItems(CID).map(x => ({ id: x.id, ico: x.ico, img: x.img, x: x.x, y: x.y }))); ROOM.avs.ta && ROOM.avs.ta.av.play('cheer'); ROOM.say('ta', String(it.story || it.name).slice(0, 50)); onTap({ type: 'item', id: it.id }); log(CID, `${X.name(X.char(CID))} 给小屋添了「${it.name}」`); };
window.gyx3dRoomThink = async btn => { btn.disabled = true; try { await refreshTA(true); } finally { btn.disabled = false; paintLog(); } };

// 让角色知道小屋里刚发生了什么
X.ctx(id => { const s = R3.st[String(id)]; const L = R3.log.filter(x => x.cid === String(id) && Date.now() - x.at < 6 * 3600000).slice(-4); if (!s && !L.length) return ''; return `【小屋里】${s ? `你现在在小屋的${s.spot === 'her' ? '她身边' : SPOT_CN[s.spot] || '屋里'}${STATE_CN[s.state] ? STATE_CN[s.state] : ''}。` : ''}${L.length ? '刚才：' + L.map(x => x.t).join('；') : ''}`; }, 'gyx3dRoom');
X.inj('gyx3dRoom', [['小屋里', '🧊 3D 小屋', 'TA 在小屋里在哪、在干嘛，你们刚在小屋里做了什么']]);
// 自主行动：TA 自己去小屋里干点什么
X.action({ key: 'gyx_room3d', label: '去你们的 3D 小屋里待一会儿，做点想做的事（吃饭 / 看书 / 发呆 / 睡觉……）', hint: '🧊 3D 小屋', need: c => { const s = R3.st[String(c.id)]; return !s || Date.now() - s.at > 40 * 60000; },
    run: async c => { const n = await decide(c); if (!n) return null; setSt(c.id, n); log(c.id, `${X.name(c)} 去了${SPOT_CN[n.spot] || '屋里'}${STATE_CN[n.state] ? STATE_CN[n.state] : ''}${n.say ? '：「' + n.say + '」' : ''}`); if (OPEN && String(c.id) === CID) applyTA(n, true); return `在小屋里${SPOT_CN[n.spot] || ''}${STATE_CN[n.state] || ''}${n.say ? '，说：' + n.say : ''}`; } }, 'gyx3dRoom');
X.today(() => { const rows = R3.log.filter(x => X.day(new Date(x.at)) === X.day()).slice(-6).map(x => ({ t: '🏠', x: X.esc(x.t), go: `gyx3dRoomOpen('${x.cid}')` })); return { title: '🧊 3D 小屋', rows }; }, 'gyx3dRoom');
X.widget('gyx3dRoomW', { n: '3D 小屋', sizes: ['s', 'm'], tap: () => window.gyx3dRoomOpen(), r: w => { const c = X.cur(), s = c && R3.st[String(c.id)]; return X.gw(w, '🏠', '3D 小屋', [s ? `${X.esc(X.name(c))} 在${SPOT_CN[s.spot] || '屋里'}${STATE_CN[s.state] || ''}` : '进去看看 TA 在干嘛', s && s.why ? X.esc(s.why) : '']); } }, 'gyx3dRoom');
X.mem({ k: 'gyx3dRoom', ico: '🏠', n: '3D 小屋里发生的事', d: '你们在 3D 小屋里做过什么', items: c => R3.log.filter(x => x.cid === String(c.id)), text: x => x.t, edit: (x, v) => { x.t = v; }, del: (c, i) => { const L = R3.log.filter(x => x.cid === String(c.id)), it = L[i], j = R3.log.indexOf(it); if (j >= 0) R3.log.splice(j, 1); }, meta: x => new Date(x.at).toLocaleString(), save }, 'gyx3dRoom');
X.css('gyx3dRoomCss', `
#gyx3dRoomOv .gyx-box{width:min(1100px,100%);height:96vh;max-height:96vh}
.g3r-st{position:relative;height:min(62vh,640px);border-radius:18px;overflow:hidden;background:#f3ede6}.g3r-st canvas{width:100%;height:100%;display:block;touch-action:none}
.g3r-ov{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.g3-bub{position:absolute;transform:translate(-50%,-100%) scale(.9);max-width:220px;padding:7px 12px;border-radius:14px;background:rgba(255,255,255,.95);color:#1d1d1f;font-size:13px;line-height:1.5;box-shadow:0 6px 18px rgba(0,0,0,.15);opacity:0;transition:opacity .25s,transform .25s;width:max-content}.g3-bub.on{opacity:1;transform:translate(-50%,-100%)}
.g3r-top{position:absolute;left:10px;top:10px;padding:6px 12px;border-radius:12px;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);font-size:13px;max-width:calc(100% - 20px)}.g3r-top em{font-style:normal;color:#888;font-size:12px;margin-left:6px}
.g3r-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#a99;font-size:14px}
.g3r-l{font-size:13px;line-height:1.7}.g3r-l i{font-style:normal;color:#aaa;margin-right:8px;font-size:12px}
#g3rBar .gyx-btn{padding:7px 11px;font-size:13px}
`);
X.mini({ id: 'gyx3dRoom', icon: '🏠', title: '3D 小屋', desc: '两个小人在屋里走动、互动，TA 自己过日子', cat: '回忆', onOpen: () => window.gyx3dRoomOpen() });
(async () => { R3 = Object.assign(R3, await S.get('d', {})); R3.log = R3.log || []; R3.st = R3.st || {}; R3.cfg = Object.assign({ chat: false }, R3.cfg || {}); setInterval(() => { if (!OPEN && X.on('gyx3dRoom')) { X.chars().forEach(c => { if (!X.auto(c)) { const s = R3.st[String(c.id)], n = routine(c.id); if (!s || (s.by === 'routine' && (s.spot !== n.spot || s.state !== n.state)) || Date.now() - s.at > 3 * 3600000) R3.st[String(c.id)] = Object.assign({ at: Date.now(), by: 'routine' }, n); } }); } }, 300000); })();
