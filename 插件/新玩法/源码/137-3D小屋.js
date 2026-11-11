/* 🧊 3D小屋：你们的一栋房子（3D）——几层、长什么样、屋里摆什么都能自己定，也能让 TA 按你们的人设和记忆设计；家具随便拖、随便转。天气跟着天气联动走，白天黑夜跟着真实时间。你操控自己的小人走来走去（点地板走过去、点家具就去用它，换层走楼梯），走到 TA 旁边能打招呼、抱抱、戳戳、摸头、说话、叫 TA 一起吃饭看书睡觉跳舞。TA 开了自主行动就自己决定想干嘛；没开就按作息过日子 */
if (window.__gyx3dRoom) return; window.__gyx3dRoom = 1;
// 304：小屋里 TA 开口时，顺便交给「🗣️ 小人的声音」（开了才出声）
const roomSay = t => { ROOM.say('ta', t); try { if (window.gyx3dVoiceSay) window.gyx3dVoiceSay(typeof CID !== 'undefined' ? CID : null, t, 'room'); } catch (e) {} };
X.feat('gyx3dRoom', { n: '🧊 3D 小屋', desc: '你们的 3D 房子：层数、外形、屋里摆什么都能自己定，也能让 TA 设计；两个小人在里面走动、互动，TA 自己过日子' });
const S = X.store('room3d');
let R3 = { log: [], st: {}, house: {}, bak: {}, cfg: { chat: false, talkChat: true, spin: false } };
const save = () => S.set('d', R3);
let ROOM = null, CID = null, OPEN = 0, BUSY = false, AWAY = '', HL = null;   // HL = window.GyHouse3D
const UI = { edit: false, tab: 'shape', fl: 0, sel: null, wx: null, t: null };   // wx / t：天气页里「试看」的，关掉小屋就回到跟着现实
// 去哪（按家具大类）
const KIND_CN = { bed: '床上', sofa: '沙发上', dining: '餐桌', window: '窗边', shelf: '书架前', rug: '地毯上', desk: '书桌前', kitchen: '厨房', tv: '电视前', piano: '钢琴前', bath: '浴缸里', fire: '壁炉前', sport: '跑步机上', pet: '小动物那儿', floor: '屋里', door: '门口', seat: '椅子上', plant: '花草旁', dresser: '梳妆台前' };
const OLDSPOT = { bed: 'bed', bed2: 'bed', bedside: 'bed', table1: 'dining', table2: 'dining', sofa: 'sofa', sofa2: 'sofa', window: 'window', shelf: 'shelf', rug: 'rug', door: 'door' };
const FALL = { bed: ['sofa', 'floor'], dining: ['kitchen', 'seat', 'floor'], sofa: ['seat', 'rug', 'window', 'floor'], shelf: ['desk', 'window', 'floor'], desk: ['shelf', 'seat', 'floor'], rug: ['floor'], tv: ['sofa', 'floor'], kitchen: ['dining', 'floor'], window: ['floor'] };
const STATE_CN = { idle: '待着', sleep: '睡觉', eat: '吃饭', read: '看书', daze: '发呆', phone: '玩手机', think: '想事情', dance: '自己跳舞', sit: '坐着', walk: '走来走去', run: '跑步' };
const ACT_CN = () => window.gyx3dActList ? window.gyx3dActList() : 'wave(挥手) / nod(点头) / hug(张开手要抱) / shy(害羞) / heart(比心)';
X.plGroup('🧊 3D 小屋', '🧊 3D 小屋', [['3d.room.self', 'TA 自己决定在小屋里干嘛'], ['3d.room.react', '你在小屋里找 TA 时 TA 的反应'], ['3d.house', 'TA 按你们的人设和记忆设计房子']], {
    '3d.room.self': '{{who}}\n最近的聊天：\n{{recent}}\n\n现在是 {{time}}，{{weather}}。你们有一栋小房子，你在屋里（3D 的小小的你），现在在{{where}}{{doing}}。她{{her}}。\n屋里能去的地方：{{spots}}\n能做的事：{{states}}\n按你的性格、此刻的心情和时间，决定接下来干嘛（也可以去她旁边找她）。想说话就说一句（口语，20 字以内，不想说给空字符串）。\n只输出 JSON：{"go":"地方的代号（括号前面那个），或者 her（去她身边）","do":"做的事的英文名","say":"","why":"一句话说为什么（10 字内）"}',
    '3d.room.react': '{{who}}\n最近的聊天：\n{{recent}}\n\n你们在你们的房子里（3D 的小小的你们）。你现在在{{where}}{{doing}}。{{event}}\n当场反应：说一句（口语，30 字以内），选一个动作（{{acts}}），一个表情（normal/happy/shy/angry/sad/surprised/closed）。{{ask}}\n只输出 JSON：{"say":"","act":"","face":""{{askKey}}}',
    '3d.house': '{{who}}\n关于她：{{her}}\n你们最近聊的：\n{{recent}}\n你记得的事：\n{{mem}}\n\n现在要给你们设计一栋 3D 的小房子。按你的性格、她的喜好、你们聊过的事来定：什么风格、几层、每层干什么用、摆什么家具、什么颜色。可以有你们之间才懂的小心思（比如她说过想要看雨的窗台、你养的猫要有地方睡）。\n风格 style：{{styles}}\n屋顶 roof：{{roofs}}\n窗户 win：glass（整面落地玻璃）/ small（一扇扇小窗）\n家具 t 只能从这些里挑：{{furn}}\n只输出 JSON：{"why":"用你的口吻跟她说一句为什么这样设计（30 字内）","style":"","wall":"#rrggbb","roof":"","roofC":"#rrggbb","win":"","w":宽 5~14,"d":深 4~11,"floors":[{"name":"一楼 · 客厅","c":"地板颜色 #rrggbb","items":[{"t":"sofa","c":"#rrggbb 或者不写"}]}]}\n1~8 层，每层 3~12 件家具。'
});

/* ---------------- 加载 ---------------- */
let libP = null;
function loadLib() {
    if (window.GyHouse3D) return Promise.resolve(window.GyHouse3D);
    if (libP) return libP;
    const V = typeof GY_VERSION !== 'undefined' ? GY_VERSION : Date.now();
    libP = (typeof window.gyx3dLib === 'function' ? window.gyx3dLib() : Promise.reject(new Error('还差「🧊 3D 小人」')))
        .then(() => new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'js/house3d.js?v=' + V; s.onload = () => window.GyHouse3D ? ok(window.GyHouse3D) : no(new Error('小屋没加载出来')); s.onerror = () => { s.remove(); no(new Error('小屋没加载出来（缺 js/house3d.js）')); }; document.head.appendChild(s); }))
        .catch(e => { libP = null; throw e; });
    return libP;
}
const planOf = cid => { const p = R3.house[String(cid)]; if (p && HL) return HL.clean(p); return p || null; };
function ensurePlan(cid) { let p = R3.house[String(cid)]; if (!p || !Array.isArray(p.floors)) { p = HL.defaultPlan('modern'); R3.house[String(cid)] = p; save(); } else R3.house[String(cid)] = p = HL.clean(p); return p; }
const PLAN = () => R3.house[String(CID)];
function savePlan() { save(); if (ROOM) { ROOM.setPlan(PLAN()); ROOM.setSel(UI.sel); fixAvatars(); } paintLayers(); }

/* ---------------- 天气、时间：跟着现实 ---------------- */
function realWx(cid) {
    let code = null;
    try { const W = window.gyxWeatherData && window.gyxWeatherData(); const w = W && ((W.taNow && W.taNow[String(cid)]) || W.now); if (w && w.code != null) code = w.code; } catch (e) {}
    if (code == null) try { const d = window.gymap3dData && window.gymap3dData(); if (d && d.wcode != null) code = d.wcode; } catch (e) {}
    if (code == null) return null;
    if (code === 0 || code === 1) return 'sun'; if (code === 2 || code === 3) return 'cloud'; if (code === 45 || code === 48) return 'fog';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow'; return 'rain';
}
const timeNow = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; return h >= 19 || h < 5.5 ? 'night' : (h >= 17 || h < 7) ? 'dusk' : 'day'; };
const envNow = () => ({ wx: UI.wx || realWx(CID) || 'sun', t: UI.t || timeNow() });
const WX_CN = { sun: '晴', cloud: '多云', rain: '下雨', snow: '下雪', fog: '起雾' }, T_CN = { day: '白天', dusk: '傍晚', night: '夜里' };

/* ---------------- TA 在哪、干嘛 ---------------- */
function routine(cid) {
    const d = new Date(), h = d.getHours(), m = d.getMinutes();
    if (h >= 23 || h < 7) return { kind: 'bed', state: 'sleep', why: '睡觉时间' };
    if (h === 7 && m >= 30 || h === 8 && m < 15) return { kind: 'dining', state: 'eat', why: '吃早饭' };
    if (h === 12) return { kind: 'dining', state: 'eat', why: '吃午饭' };
    if (h === 18 && m >= 20 || h === 19 && m < 10) return { kind: 'dining', state: 'eat', why: '吃晚饭' };
    const L = [['sofa', 'read', '看书'], ['sofa', 'daze', '发呆'], ['window', 'daze', '看窗外'], ['shelf', 'think', '找书'], ['bed', 'phone', '躺床上玩手机'], ['rug', 'dance', '自己跳舞'], ['desk', 'think', '在书桌前想事情'], ['tv', 'daze', '看电视'], ['kitchen', 'think', '在厨房找吃的'], ['pet', 'idle', '逗小动物']];
    if (h >= 13 && h < 14) L.push(['bed', 'sleep', '睡午觉'], ['bed', 'sleep', '睡午觉']);
    let k = Math.floor(Date.now() / (9 * 60000)) + String(cid).length * 7; k = (k * 2654435761) >>> 0;
    const p = L[k % L.length]; return { kind: p[0], state: p[1], why: p[2] };
}
const nowSt = cid => { const s = R3.st[String(cid)]; if (s && !s.kind && s.spot) s.kind = OLDSPOT[s.spot] || 'floor'; return s || null; };
function setSt(cid, o) { R3.st[String(cid)] = Object.assign({ at: Date.now() }, o); save(); }
function log(cid, t) { R3.log.push({ cid: String(cid), at: Date.now(), t }); if (R3.log.length > 300) R3.log.splice(0, R3.log.length - 300); save(); paintLog(); }
const where = s => s ? (s.kind === 'her' ? '你身边' : s.n || KIND_CN[s.kind] || '屋里') : '屋里';
const doing = s => s ? '，' + (STATE_CN[s.state] || s.state || '') : '';
// 屋里的地点（打开小屋时才有）：按大类找一个空着的
const spotById = id => ROOM && ROOM.spots.find(p => p.id === id) || null;
function taken(exceptKey) { const out = new Set(); Object.keys(ROOM ? ROOM.avs : {}).forEach(k => { if (k === exceptKey) return; const a = ROOM.avs[k]; if (a.spotId) out.add(a.spotId); }); return out; }
function pickSpot(kind, key, item) {
    if (!ROOM) return null; const busy = taken(key);
    const L = ROOM.spots.filter(p => (item ? p.item === item : p.kind === kind));
    const free = L.filter(p => !busy.has(p.id));
    if (free.length) return free[0]; if (L.length && item) return L[0];
    for (const k of (FALL[kind] || ['window', 'floor'])) { const q = ROOM.spots.find(p => p.kind === k && !busy.has(p.id)); if (q) return q; }
    return ROOM.spots.find(p => p.kind === 'floor') || null;
}
function pickPair(kind) {   // 一起做：同一件家具上的两个位置
    if (!ROOM) return [null, null];
    const by = {}; ROOM.spots.filter(p => p.kind === kind && p.item).forEach(p => { (by[p.item] = by[p.item] || []).push(p); });
    const two = Object.values(by).find(a => a.length >= 2); if (two) return [two[0], two[1]];
    const one = ROOM.spots.filter(p => p.kind === kind); if (one.length >= 2) return [one[0], one[1]];
    const a = pickSpot(kind, 'ta'); return [a, a ? { x: a.x + 0.8, z: a.z, fl: a.fl, state: a.state } : null];
}
function goSpot(key, sp, then) { if (!ROOM || !sp || !ROOM.avs[key]) return; ROOM.avs[key].spotId = sp.id; ROOM.go(key, sp, then); }
function walkTo(key, to, then) { return new Promise(r => { if (ROOM.avs[key]) ROOM.avs[key].spotId = to.id || null; ROOM.go(key, to, Object.assign({}, then || {}, { fn: () => { try { then && then.fn && then.fn(); } catch (e) {} r(); } })); }); }
function herText() {
    if (!(ROOM && OPEN)) return '现在不在屋里（在外面用手机）';
    const a = ROOM.avs.me; if (!a) return '不在屋里';
    const sp = spotById(a.spotId), F = PLAN().floors[a.fl];
    return '也在屋里' + (sp ? '，在' + sp.n : F ? '，在' + F.name : '') + (a.av.state && a.av.state !== 'idle' ? '，' + (STATE_CN[a.av.state] || '') : '');
}
// TA 自己决定（开了自主行动）
async function decide(c) {
    const s = nowSt(c.id) || {};
    if (X.bailu()) { const r = routine(c.id); return Object.assign(r, { say: X.cards(['小屋', '聊天'], c, 1)[0] || '', by: 'auto' }); }
    const d = new Date(), env = envNow(), useSpots = ROOM && OPEN && String(c.id) === CID;
    const spots = useSpots ? ROOM.spots.filter(p => p.id !== 'door').slice(0, 40).map(p => `${p.id}(${p.n})`).join(' / ') : Object.keys(KIND_CN).filter(k => k !== 'door').map(k => `${k}(${KIND_CN[k]})`).join(' / ');
    const j = X.json(await X.ask(X.pl('3d.room.self', '', { who: X.who(c) + (window.gyx3dStyleHint ? window.gyx3dStyleHint(c) : ''), recent: X.recent(c, 10) || '（还没聊）', time: `${d.getHours()} 点 ${d.getMinutes()} 分`, weather: '外面' + (WX_CN[realWx(c.id)] || '天气不知道'), where: where(s), doing: doing(s), her: herText(), spots, states: Object.keys(STATE_CN).filter(k => k !== 'walk').map(k => k + '(' + STATE_CN[k] + ')').join(' / ') })));
    if (!j) return Object.assign(routine(c.id), { by: 'routine' });
    let go = String(j.go || '').trim(), state = String(j.do || '').trim();
    if (!STATE_CN[state]) state = Object.keys(STATE_CN).find(k => STATE_CN[k] === state) || 'idle';
    if (go === 'her') return { kind: 'her', state, say: X.plain(String(j.say || '')).slice(0, 40), why: X.plain(String(j.why || '')).slice(0, 20), by: 'auto' };
    let sp = useSpots ? spotById(go) || ROOM.spots.find(p => go.includes(p.n) || p.n.includes(go)) : null;
    let kind = sp ? sp.kind : (KIND_CN[go] ? go : (Object.keys(KIND_CN).find(k => go.includes(KIND_CN[k].replace(/[上前里]$/, ''))) || 'floor'));
    return { kind, spot: sp ? sp.id : null, n: sp ? sp.n : null, state, say: X.plain(String(j.say || '')).slice(0, 40), why: X.plain(String(j.why || '')).slice(0, 20), by: 'auto' };
}
async function refreshTA(force) {
    const c = X.char(CID); if (!c || AWAY) return;
    const old = nowSt(c.id), auto = X.auto(c);
    let n;
    if (auto) { if (!force && old && old.by === 'auto' && Date.now() - old.at < 7 * 60000) return; if (BUSY) return; BUSY = true; try { n = await decide(c); } finally { BUSY = false; } }
    else { n = Object.assign(routine(c.id), { by: 'routine' }); if (!force && old && old.by === 'routine' && old.kind === n.kind && old.state === n.state) return; }
    if (!n) return;
    if (OPEN && ROOM && n.kind !== 'her') { const sp = n.spot && spotById(n.spot) || pickSpot(n.kind, 'ta'); if (sp) { n.spot = sp.id; n.n = sp.n; } }
    setSt(c.id, n);
    if (OPEN && ROOM) { applyTA(n, true); if (n.say) roomSay(n.say); }
    if (n.by === 'auto' && n.say || n.kind !== (old && old.kind)) log(c.id, `${X.name(c)} 去了${where(n)}${STATE_CN[n.state] ? '，' + STATE_CN[n.state] : ''}${n.why ? '（' + n.why + '）' : ''}${n.say ? '：「' + n.say + '」' : ''}`);
}
function applyTA(n, walk) {
    if (!ROOM || !ROOM.avs.ta) return;
    if (n.kind === 'her') { const me = ROOM.avs.me, p = me.av.holder.position, q = ROOM.avs.ta.av.holder.position; const same = me.fl === ROOM.avs.ta.fl, dx = same ? q.x - p.x : 0.8, dz = same ? q.z - p.z : 0.3, L = Math.hypot(dx, dz) || 1; ROOM.avs.ta.spotId = null; ROOM.go('ta', { x: p.x + dx / L * 0.85, z: p.z + dz / L * 0.85, fl: me.fl }, { state: n.state === 'sleep' ? 'idle' : n.state, fn: () => { ROOM.face('ta', 'me'); ROOM.avs.ta.av.play('wave'); } }); return; }
    const sp = (n.spot && spotById(n.spot)) || pickSpot(n.kind, 'ta'); if (!sp) return;
    const st = n.state || sp.state;
    if (walk) goSpot('ta', sp, { state: st });
    else { ROOM.place('ta', Object.assign({}, sp, { state: st })); ROOM.avs.ta.spotId = sp.id; }
}
function fixAvatars() {   // 房子改了：两个人站的地方可能没了
    if (!ROOM) return;
    ['ta', 'me'].forEach(k => { const a = ROOM.avs[k]; if (!a) return; if (a.spotId && !spotById(a.spotId)) { a.spotId = null; const s = k === 'ta' ? nowSt(CID) : null; const sp = pickSpot(s ? s.kind : 'floor', k); if (sp) ROOM.place(k, Object.assign({}, sp, { state: k === 'ta' && s ? s.state : 'idle' })); } });
}

/* ---------------- 你在小屋里找 TA ---------------- */
const EV = { hi: ['跟你打了个招呼', 'wave'], hug: ['走过来抱住了你', 'hug'], poke: ['戳了戳你', 'poke'], pat: ['摸了摸你的头', 'pat'], dance: ['拉着你要一起跳舞', 'dance'], eat: ['叫你一起去吃饭', 'wave'], read: ['叫你一起去沙发上看书', 'wave'], sleep: ['叫你一起去睡觉', 'yawn'], talk: ['对你说', 'nod'], heart: ['对你比了个心', 'heart'] };
const LOGT = { hi: '跟 TA 打了个招呼', hug: '抱了抱 TA', poke: '戳了戳 TA', pat: '摸了摸 TA 的头', dance: '拉 TA 一起跳舞', eat: '叫 TA 一起吃饭', read: '叫 TA 一起看书', sleep: '叫 TA 一起睡觉', talk: '对 TA 说', heart: '对 TA 比了个心' };
const TOGETHER = { eat: ['dining', 'eat'], read: ['sofa', 'read'], sleep: ['bed', 'sleep'], dance: [null, 'dance'] };
window.gyx3dRoomDo = async function (kind) {
    if (ROOM && !ROOM.avs.ta && AWAY) return X.toast(`${X.name(X.char(CID))} 不在家`, `在${AWAY}。可以「叫 TA 回来」，或者去 3D 地图上找 TA`);
    if (!ROOM || !ROOM.avs.ta || BUSY) return; const c = X.char(CID); if (!c) return;
    if (UI.edit) setEdit(false);
    let text = '';
    if (kind === 'talk') { const inp = document.getElementById('g3rSay'); text = (inp && inp.value || '').trim(); if (!text) return inp && inp.focus(); inp.value = ''; }
    BUSY = true; setBtns(false);
    try {
        const A = ROOM.avs, s = nowSt(c.id) || {};
        if (ROOM.view === 'all') ROOM.setView(A.ta.fl);
        // 先走到 TA 旁边（不在一层就走楼梯上去 / 下来）
        if (ROOM.near('me', 'ta') > 1.3) { const ta = A.ta.av.holder.position, me = A.me.av.holder.position, same = A.me.fl === A.ta.fl; const dx = same ? me.x - ta.x : 0.6, dz = same ? me.z - ta.z : 0.8, L = Math.hypot(dx, dz) || 1; await walkTo('me', { x: ta.x + dx / L * 0.8, z: ta.z + dz / L * 0.8, fl: A.ta.fl }); }
        ROOM.face('me', 'ta'); A.me.av.setState('idle'); A.me.av.play(EV[kind][1]);
        if (text) ROOM.say('me', text);
        const sleeping = A.ta.av.state === 'sleep';
        const ask = TOGETHER[kind] ? '她在叫你一起，你去不去？' : '';
        let j = null;
        if (X.bailu()) j = { say: X.cards(['小屋', '聊天'], c, 1)[0] || X.pick(['嗯？', '好呀', '你干嘛啦']), act: X.pick(['shy', 'nod', 'heart', 'wave']), go: true };
        else j = X.json(await X.ask(X.pl('3d.room.react', '', { who: X.who(c) + (window.gyx3dStyleHint ? window.gyx3dStyleHint(c) : ''), recent: X.recent(c, 8) || '（还没聊）', where: where(s), doing: doing(s) + (sleeping ? '（睡着了，被她弄醒）' : ''), event: '她' + EV[kind][0] + (text ? `：「${text}」` : '。'), acts: ACT_CN(), ask, askKey: ask ? ',"go":true' : '' })));
        if (!j) j = { say: X.pick(['嗯？', '在呢', '干嘛呀']), act: 'tilt' };
        if (sleeping && kind !== 'sleep') { A.ta.av.setState('idle'); A.ta.av.holder.position.y = ROOM.base(A.ta.fl); }
        ROOM.face('ta', 'me');
        const act = window.GY3D.ACT_CN[j.act] ? j.act : (Object.keys(window.GY3D.ACT_CN).find(k => window.GY3D.ACT_CN[k] === j.act) || 'nod');
        A.ta.av.play(act); if (j.face && window.GY3D.FACES[j.face]) A.ta.av.lockFace(j.face, 5);
        const say = X.plain(String(j.say || '')).slice(0, 60); if (say) roomSay(say);
        log(c.id, `你${LOGT[kind]}${text ? '：「' + text + '」' : ''} → ${X.name(c)}${say ? '：「' + say + '」' : window.GY3D.ACT_CN[act]}`);
        if (R3.cfg.chat) { if (text) { (globalChats[String(c.id)] = globalChats[String(c.id)] || []).push({ sender: 'me', text, timestamp: Date.now(), readBy: [], gyx: 1, gyx3dRoom: 1 }); } if (say) X.say(c, say, { gyx3dRoom: 1 }); }
        const T = TOGETHER[kind];
        if (T && j.go !== false) {
            await new Promise(r => setTimeout(r, 1400));
            if (kind === 'dance') { A.ta.av.setState('dance'); A.me.av.setState('dance'); setSt(c.id, { kind: 'rug', state: 'dance', by: 'you', why: '和你一起跳舞' }); }
            else {
                const [a, b] = pickPair(T[0]);
                if (!a) { roomSay(X.v('可是屋里没有' + (KIND_CN[T[0]] || '').replace(/[上前里]$/, '') + '呀', '我们家还没有这个呢')); }
                else { goSpot('ta', a, { state: T[1] }); if (b) { A.me.spotId = b.id; ROOM.go('me', b, { state: T[1] }); } setSt(c.id, { kind: a.kind, spot: a.id, n: a.n, state: T[1], by: 'you', why: '和你一起' }); }
            }
            paintLog();
        }
    } finally { BUSY = false; setBtns(true); }
};
function setBtns(on) { document.querySelectorAll('#g3rBar button').forEach(b => b.disabled = !on); }
// 点了屋里的东西
function onTap(ev) {
    if (!ROOM) return; const A = ROOM.avs; if (!A.me) return;
    if (ev.type === 'floor') { A.me.spotId = null; ROOM.go('me', { x: ev.x, z: ev.z, fl: ev.fl }); return; }
    if (ev.type === 'avatar') { if (ev.key === 'ta') window.gyx3dRoomDo('poke'); else A.me.av.play(X.pick(['wave', 'tilt', 'jump'])); return; }
    if (ev.type === 'item') { const it = (window.gyxHomeItems ? window.gyxHomeItems(CID) : []).find(x => x.id === ev.id); const b = document.getElementById('g3rInfo'); if (it && b) b.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><span style="font-size:30px">${it.img ? `<img src="${it.img}" style="width:44px;height:44px;object-fit:cover;border-radius:6px">` : X.esc(it.ico)}</span><div><b>${X.esc(it.name)}</b><div class="gyx-tip">${new Date(it.at).toLocaleDateString()} · ${it.by === 'ta' ? 'TA 放的' : it.by === 'me' ? '你放的' : '一起做过的事'}</div></div></div><div style="line-height:1.7;margin-top:4px">${X.esc(it.story || '')}</div>`; return; }
    if (ev.type === 'furn') {
        const sp = pickSpot(null, 'me', ev.id), F = PLAN().floors.find(F => F.items.some(x => x.id === ev.id)), it = F && F.items.find(x => x.id === ev.id);
        if (!sp) { const b = document.getElementById('g3rInfo'); if (b && it) b.innerHTML = `${HL.FURN[it.t][0]} ${HL.FURN[it.t][1]}`; return; }
        goSpot('me', sp, { state: sp.state === 'think' ? 'idle' : sp.state, fn: () => { if (it && it.t === 'shelf') ROOM.avs.me.av.play('think'); } });
        return;
    }
    if (ev.type === 'thing') {
        if (ev.name === 'window') { const sp = ROOM.spots.find(p => p.id === 'win:' + ev.fl); if (sp) goSpot('me', sp, { state: 'daze', fn: () => { const b = document.getElementById('g3rInfo'); if (b) b.innerHTML = `外面${WX_CN[envNow().wx] || ''}，${T_CN[envNow().t]}。${window.gyxSillOpen ? `<button class="gyx-btn lite" onclick="document.getElementById('gyx3dRoomOv').remove();gyxSillOpen()">🪟 去窗台放点东西</button>` : ''}`; } }); }
        if (ev.name === 'door') { const sp = ROOM.spots.find(p => p.id === 'door'); if (sp) goSpot('me', sp, { state: 'idle', fn: () => { const b = document.getElementById('g3rInfo'); if (b) b.innerHTML = '要出门吗？' + (window.gysMap3dOpen ? `<button class="gyx-btn lite" onclick="document.getElementById('gyx3dRoomOv').remove();gysMap3dOpen()">🗺️ 去地图上</button>` : '') + `<button class="gyx-btn lite" onclick="document.getElementById('gyx3dRoomOv').remove()">关掉小屋</button>`; } }); }
    }
}
function paintLog() {
    const b = document.getElementById('g3rLog'); if (!b) return;
    const L = R3.log.filter(x => x.cid === String(CID)).slice(-6).reverse();
    b.innerHTML = L.map(x => `<div class="g3r-l"><i>${new Date(x.at).toTimeString().slice(0, 5)}</i>${X.esc(x.t)}</div>`).join('') || '<div class="gyx-tip">点地板你就走过去；点家具你就去用它（坐沙发、躺床、吃饭……）；点 TA 是戳 TA。走到 TA 旁边用下面的按钮跟 TA 玩。右上角选看哪一层。</div>';
    const st = document.getElementById('g3rSt'), c = X.char(CID), s = nowSt(CID);
    if (st && c && AWAY) { st.innerHTML = `${X.esc(X.name(c))} 不在家：在${X.esc(AWAY)} <button class="gyx-btn lite" style="padding:3px 10px;font-size:12px" onclick="gyx3dRoomCallHome()">叫 TA 回来</button>`; return; }
    if (st && c) { const e = envNow(); st.innerHTML = `${X.esc(X.name(c))} ${s ? '在' + where(s) + (STATE_CN[s.state] || '') : ''} <em>${X.auto(c) ? '🤖 自主行动中' : '🕒 日常作息'} · ${WX_CN[e.wx]}${UI.wx || UI.t ? '（试看）' : ''} · ${T_CN[e.t]}</em>`; }
}
function paintLayers() {
    const b = document.getElementById('g3rLay'); if (!b || !ROOM) return; const P = PLAN();
    b.innerHTML = `<button type="button" class="${ROOM.view === 'all' ? 'on' : ''}" onclick="gyx3dRoomView('all')">外面</button>` + P.floors.map((F, i) => `<button type="button" class="${ROOM.view === i ? 'on' : ''}" onclick="gyx3dRoomView(${i})" title="${X.esc(F.name)}">${i + 1} 楼</button>`).reverse().join('');
}
window.gyx3dRoomView = v => { if (!ROOM) return; ROOM.setView(v); if (v !== 'all') UI.fl = +v; paintLayers(); if (UI.edit) paintEd(); if (v === 'all') X.toast(X.v('从外面看', '看看整栋房子'), '看外面时看不见屋里的小人，点「几楼」进去'); };

/* ---------------- 改房子（家具随便拖、随便转） ---------------- */
function setEdit(on) {
    UI.edit = !!on; if (!ROOM) return; ROOM.edit = UI.edit; UI.sel = null; ROOM.setSel(null);
    const ed = document.getElementById('g3rEd'), play = document.getElementById('g3rPlay'), bt = document.getElementById('g3rEdBtn');
    if (ed) ed.hidden = !UI.edit; if (play) play.hidden = UI.edit; if (bt) bt.textContent = UI.edit ? '✓ 改好了' : '🛠️ 改房子';
    if (UI.edit) { if (ROOM.view === 'all' && UI.tab === 'room') ROOM.setView(UI.fl); paintEd(); }
    else { UI.wx = null; UI.t = null; ROOM.setEnv(envNow()); paintLog(); }
    paintLayers();
}
window.gyx3dRoomEdit = () => setEdit(!UI.edit);
const TABS = [['shape', '外形'], ['floors', '楼层'], ['room', '屋里'], ['weather', '天气'], ['dir', '方向']];
const chip = (on, txt, js) => `<span class="gyx-chip${on ? ' on' : ''}" onclick="${js}">${txt}</span>`;
function paintEd() {
    const box = document.getElementById('g3rEd'); if (!box || !HL) return; const P = PLAN(), E = X.esc;
    let h = `<div class="g3e-tabs">${TABS.map(([k, n]) => `<span class="${UI.tab === k ? 'on' : ''}" onclick="gyx3dEd('tab','${k}')">${n}</span>`).join('')}</div><div class="g3e-bd">`;
    if (UI.tab === 'shape') {
        h += `<b>风格（选一个起头，下面再一样样改）</b><div>${Object.entries(HL.STYLES).map(([k, v]) => chip(P.style === k, v.n, `gyx3dEd('style','${k}')`)).join('')}</div>
          <b>墙和屋顶</b><div class="g3e-row"><label>墙</label><input type="color" value="${P.wall}" oninput="gyx3dEd('wall',this.value)"><label>屋顶</label><input type="color" value="${P.roofC}" oninput="gyx3dEd('roofC',this.value)"></div>
          <div>${HL.ROOFS.map(([k, n]) => chip(P.roof === k, n, `gyx3dEd('roof','${k}')`)).join('')}</div>
          <b>窗户</b><div>${chip(P.win === 'glass', '整面落地玻璃', `gyx3dEd('win','glass')`)}${chip(P.win === 'small', '一扇扇小窗', `gyx3dEd('win','small')`)}</div>
          <b>大小</b><div class="g3e-row"><label>宽</label><input type="range" min="5" max="14" step="0.5" value="${P.w}" oninput="gyx3dEd('w',+this.value,this)"><output>${P.w} 米</output></div><div class="g3e-row"><label>深</label><input type="range" min="4" max="11" step="0.5" value="${P.d}" oninput="gyx3dEd('d',+this.value,this)"><output>${P.d} 米</output></div>
          <div class="g3e-gen"><b>✨ 让 TA 按你们的人设和记忆设计</b><div class="gyx-tip">TA 会看自己的人设、你的人设、你们聊过的事和记得的事，定风格、层数、每层干嘛用、摆什么。设计完照样能改。</div><div class="g3e-row"><button class="gyx-btn" onclick="gyx3dRoomGen(this)">让 TA 设计</button>${R3.bak[String(CID)] ? `<button class="gyx-btn lite" onclick="gyx3dEd('undo')">↩ 换回上一栋</button>` : ''}<button class="gyx-btn lite" onclick="gyx3dEd('reset')">恢复默认</button></div></div>`;
    } else if (UI.tab === 'floors') {
        h += `<b>一共几层（最多 8 层；减层不会删掉那层的家具，加回来还在）</b><div class="g3e-row"><input type="range" min="1" max="8" step="1" value="${P.floors.length}" onchange="gyx3dEd('n',+this.value)" oninput="this.nextElementSibling.textContent=this.value+' 层'"><output>${P.floors.length} 层</output></div>
          <b>每层叫什么、地板颜色</b>${P.floors.map((F, i) => `<div class="g3e-row"><label>${i + 1} 楼</label><input class="gyx-who" style="flex:1;min-width:0" value="${E(F.name)}" onchange="gyx3dEd('fname',this.value,${i})"><input type="color" value="${F.c}" oninput="gyx3dEd('fcol',this.value,${i})"><button class="gyx-btn lite" onclick="gyx3dRoomView(${i})">看这层</button></div>`).join('')}`;
    } else if (UI.tab === 'room') {
        const fl = Math.min(UI.fl, P.floors.length - 1), F = P.floors[fl], it = UI.sel && F.items.find(x => x.id === UI.sel);
        h += `<b>布置哪一层</b><div>${P.floors.map((x, i) => chip(fl === i, (i + 1) + ' 楼', `gyx3dEd('fl',${i})`)).join('')}</div><div class="gyx-tip">${E(F.name)} · <b>按住家具直接拖</b>到想放的地方；点一下选中它，下面能转、换颜色、删</div>`;
        if (it) { const f = HL.FURN[it.t]; h += `<div class="g3e-sel"><b>${f[0]} ${f[1]}</b><div class="g3e-row"><label>转</label><input type="range" min="0" max="359" step="1" value="${Math.round(it.a || 0)}" oninput="gyx3dEd('a',+this.value,this)"><output>${Math.round(it.a || 0)}°</output><button class="gyx-btn lite" onclick="gyx3dEd('a45')">↻ 45°</button></div><div class="g3e-row"><label>颜色</label><input type="color" value="${it.c || f[4]}" oninput="gyx3dEd('icol',this.value)"><button class="gyx-btn lite" onclick="gyx3dEd('icol','')">原色</button><button class="gyx-btn lite" onclick="gyx3dEd('dup')">再来一个</button><button class="gyx-btn lite" onclick="gyx3dEd('del')">删掉</button></div></div>`; }
        h += `<b>点一下放进这层（${HL.FURN_GROUPS.length} 类、${Object.keys(HL.FURN).length} 种）</b>${HL.FURN_GROUPS.map(g => `<div class="g3e-fg"><i>${g}</i>${Object.entries(HL.FURN).filter(([, f]) => f[5] === g).map(([k, f]) => `<span class="g3e-f" onclick="gyx3dEd('add','${k}')">${f[0]}<em>${f[1]}</em></span>`).join('')}</div>`).join('')}
          <b>这层摆了 ${F.items.length} 样</b><div class="g3e-list">${F.items.map(x => `<span class="gyx-chip${UI.sel === x.id ? ' on' : ''}" onclick="gyx3dEd('sel','${x.id}')">${HL.FURN[x.t][0]} ${HL.FURN[x.t][1]}</span>`).join('') || '<span class="gyx-tip">还空着。点上面的家具放进来。</span>'}</div>${F.items.length ? `<button class="gyx-btn lite" onclick="gyx3dEd('clear')">清空这层</button>` : ''}`;
    } else if (UI.tab === 'weather') {
        const r = realWx(CID);
        h += `<div class="gyx-tip">平时不用管：天气跟着「🌦️ 天气联动」里 TA 那边（没设就用你那边，再没有就看「行程与天气」）的真实天气，白天黑夜跟着现在的时间。现在外面：<b>${r ? WX_CN[r] : '不知道（还没设城市）'}</b>，${T_CN[timeNow()]}。下面能先试看别的样子，关掉小屋就回到跟着现实。</div>
          <b>天气</b><div>${chip(!UI.wx, '📡 跟着现实', `gyx3dEd('wx','')`)}${Object.entries(WX_CN).map(([k, n]) => chip(UI.wx === k, n, `gyx3dEd('wx','${k}')`)).join('')}</div>
          <b>时间</b><div>${chip(!UI.t, '🕒 跟着现在', `gyx3dEd('t','')`)}${Object.entries(T_CN).map(([k, n]) => chip(UI.t === k, n, `gyx3dEd('t','${k}')`)).join('')}</div>${window.gyxWeatherOpen ? `<button class="gyx-btn lite" onclick="gyxWeatherOpen()">🌦️ 去设城市</button>` : ''}`;
    } else {
        h += `<b>房子朝向（大门朝哪）</b><div>${[[0, '朝南'], [90, '朝东'], [180, '朝北'], [270, '朝西']].map(([v, n]) => chip(P.rot === v, n, `gyx3dEd('rot',${v})`)).join('')}</div><div class="g3e-row"><input type="range" min="0" max="359" step="1" value="${P.rot}" oninput="gyx3dEd('rot',+this.value,this)"><output>${P.rot}°</output></div>
          <b>从哪看</b><div>${[['iso', '斜上方'], ['front', '正面'], ['top', '俯视'], ['side', '侧面']].map(([k, n]) => chip(false, n, `gyx3dEd('cam','${k}')`)).join('')}</div><label class="gyx-tip"><input type="checkbox" ${R3.cfg.spin ? 'checked' : ''} onchange="gyx3dEd('spin',this.checked)"> 不动的时候自己慢慢转</label><div class="gyx-tip">也可以直接拖动转、两指捏合 / 滚轮缩放。</div>`;
    }
    box.innerHTML = h + '</div>';
}
window.gyx3dEd = function (k, v, x) {
    if (!ROOM || !HL) return; const P = PLAN(), fl = Math.min(UI.fl, P.floors.length - 1), F = P.floors[fl], it = UI.sel && F && F.items.find(i => i.id === UI.sel);
    const out = t => { if (x && x.nextElementSibling) x.nextElementSibling.textContent = t; };
    switch (k) {
        case 'tab': UI.tab = v; if (v === 'room' && ROOM.view === 'all') ROOM.setView(UI.fl); paintLayers(); return paintEd();
        case 'style': { const st = HL.STYLES[v]; Object.assign(P, { style: v, wall: st.wall, roof: st.roof, roofC: st.roofC, win: st.win }); P.floors.forEach(f => { f.c = st.floorC; }); break; }
        case 'wall': case 'roofC': P[k] = v; save(); ROOM.buildHouse(); return;
        case 'roof': case 'win': P[k] = v; break;
        case 'w': case 'd': P[k] = v; out(v + ' 米'); P.floors.forEach(f => f.items.forEach(i => HL.clampItem(P, i))); save(); ROOM.setPlan(P); fixAvatars(); return;
        case 'reset': R3.bak[String(CID)] = JSON.parse(JSON.stringify(P)); R3.house[String(CID)] = HL.defaultPlan(P.style); UI.sel = null; savePlan(); return paintEd();
        case 'undo': { const b = R3.bak[String(CID)]; if (!b) return; R3.bak[String(CID)] = JSON.parse(JSON.stringify(P)); R3.house[String(CID)] = HL.clean(b); UI.sel = null; savePlan(); return paintEd(); }
        case 'n': { P.spare = P.spare || []; while (P.floors.length < v) P.floors.push(P.spare.shift() || { name: (P.floors.length + 1) + ' 楼', c: P.floors[P.floors.length - 1].c, items: [] }); while (P.floors.length > v) P.spare.unshift(P.floors.pop()); P.spare = P.spare.slice(0, 8); if (UI.fl >= v) UI.fl = v - 1; break; }
        case 'fname': P.floors[x].name = String(v || '').slice(0, 24) || (x + 1) + ' 楼'; save(); ROOM.spots = HL.spotsOf(P); return paintLayers();
        case 'fcol': P.floors[x].c = v; save(); ROOM.buildHouse(); return;
        case 'fl': UI.fl = v; UI.sel = null; ROOM.setSel(null); ROOM.setView(v); paintLayers(); return paintEd();
        case 'add': { const n = HL.place(P, fl, v); if (n && n.__crowd) { delete n.__crowd; X.toast('这层有点挤', '先放在中间了，按住拖到想放的地方'); } UI.sel = n && n.id; if (ROOM.view !== fl) ROOM.setView(fl); break; }
        case 'sel': UI.sel = v; ROOM.setSel(v); return paintEd();
        case 'a': if (!it) return; it.a = v; out(v + '°'); HL.clampItem(P, it); save(); ROOM.spots = HL.spotsOf(P); ROOM.buildHouse(); return;
        case 'a45': if (!it) return; it.a = (Math.round((it.a || 0) / 45) * 45 + 45) % 360; HL.clampItem(P, it); break;
        case 'icol': if (!it) return; it.c = v || null; save(); ROOM.buildHouse(); if (!v) paintEd(); return;
        case 'dup': if (!it) return; { const n = HL.place(P, fl, it.t, it.c); if (n) { n.a = it.a; UI.sel = n.id; } } break;
        case 'del': if (!it) return; F.items = F.items.filter(i => i !== it); UI.sel = null; break;
        case 'clear': F.items = []; UI.sel = null; break;
        case 'wx': UI.wx = v || null; ROOM.setEnv(envNow()); paintLog(); return paintEd();
        case 't': UI.t = v || null; ROOM.setEnv(envNow()); paintLog(); return paintEd();
        case 'rot': P.rot = v; out(v + '°'); save(); ROOM.buildHouse(); ROOM.buildWorld(); if (!x) paintEd(); return;
        case 'cam': ROOM.camPreset(v); return;
        case 'spin': R3.cfg.spin = !!v; ROOM.opt.spin = !!v; save(); return;
    }
    ROOM.setSel(UI.sel); savePlan(); paintEd();
};
function onEdit(ev) {
    if (ev.type === 'sel') { UI.sel = ev.id; if (ev.fl >= 0) UI.fl = ev.fl; UI.tab = 'room'; ROOM.setSel(ev.id); paintEd(); }
    else if (ev.type === 'move') { UI.sel = ev.id; UI.fl = ev.fl; save(); fixAvatars(); if (UI.tab === 'room') paintEd(); }
    else if (ev.type === 'floor') { if (UI.sel) { UI.sel = null; ROOM.setSel(null); paintEd(); } }
}
// ✨ TA 来设计
window.gyx3dRoomGen = async function (btn) {
    const c = X.char(CID); if (!c || !HL) return;
    if (btn) { btn.disabled = true; btn.textContent = X.v('TA 在画图纸…', 'TA 在想你们的家…', 'TA 在挑家具…'); }
    try {
        let j = null;
        if (X.bailu()) { const ks = Object.keys(HL.STYLES); j = HL.defaultPlan(X.pick(ks)); j.why = X.cards(['小屋', '聊天'], c, 1)[0] || '照着我们的样子搭的。'; }
        else {
            const her = (() => { try { return String((typeof currentUser !== 'undefined' && currentUser && (currentUser.persona || currentUser.bio || currentUser.description)) || '').slice(0, 600); } catch (e) { return ''; } })();
            const mem = [String(c.chatSummary || '').slice(-900), (() => { try { return window.gyxHomeItems ? window.gyxHomeItems(CID).slice(-8).map(x => '小屋里有「' + x.name + '」' + (x.story ? '：' + String(x.story).slice(0, 40) : '')).join('\n') : ''; } catch (e) { return ''; } })()].filter(Boolean).join('\n');
            j = X.json(await X.ask(X.pl('3d.house', '', { who: X.who(c) + (window.gyx3dStyleHint ? window.gyx3dStyleHint(c) : ''), her: X.me(c) + (her ? '。' + her : ''), recent: X.recent(c, 20) || '（还没聊）', mem: mem || '（还没有）', styles: Object.entries(HL.STYLES).map(([k, v]) => k + '(' + v.n + ')').join(' / '), roofs: HL.ROOFS.map(([k, n]) => k + '(' + n + ')').join(' / '), furn: Object.entries(HL.FURN).map(([k, f]) => k + '(' + f[1] + ')').join(' / ') })));
        }
        if (!j || !Array.isArray(j.floors) || !j.floors.length) { X.toast(X.v('TA 没画出来', '图纸没画好'), '看看接口通不通，再试一次'); return; }
        // AI 给的家具只要种类和颜色：位置交给「找空地方」，靠墙摆好
        j.floors.forEach(f => (f.items || []).forEach(i => { delete i.x; delete i.z; }));
        const P = HL.clean(j); P.rot = PLAN().rot;
        R3.bak[String(CID)] = JSON.parse(JSON.stringify(PLAN())); R3.house[String(CID)] = P; UI.sel = null; UI.fl = 0;
        savePlan(); ROOM.setView('all'); paintLayers(); paintEd();
        const why = X.plain(String(j.why || '')).slice(0, 60);
        log(CID, `${X.name(c)} 设计了你们的房子：${P.floors.length} 层，${HL.STYLES[P.style].n}${why ? '。「' + why + '」' : ''}`);
        if (why && ROOM.avs.ta) roomSay(why);
        X.toast(X.v('房子盖好了', 'TA 设计好了'), why || '每样都还能自己改');
    } finally { if (btn) { btn.disabled = false; btn.textContent = '让 TA 设计'; } }
};

/* ---------------- 打开 ---------------- */
let keyH = null, tickT = null;
window.gyx3dRoomState = cid => { const s = nowSt(cid); return s ? (s.kind === 'her' ? '在你身边' : '在' + where(s)) + (STATE_CN[s.state] || '') : ''; };
window.gyx3dRoomCallHome = async () => { if (!CID || !window.gysMap3dGoHome) return; await window.gysMap3dGoHome(CID); const c = X.char(CID); X.toast(`${X.name(c)} 回家了`, ''); window.gyx3dRoomOpen(CID); };
window.gyx3dRoomOpen = async function (who) {
    const c = X.char(who) || X.cur(); if (!c) return X.toast('先选一个角色', '');
    if (typeof window.gyx3dLib !== 'function') return X.toast('还差「🧊 3D 小人」', '在「📱 小手机」合集里，装上才能进 3D 小屋');
    try { HL = await loadLib(); } catch (e) { return X.toast('3D 小屋没加载出来', e.message); }
    closeRoom(); CID = String(c.id); AWAY = window.gysMap3dAway ? window.gysMap3dAway(CID) : ''; UI.edit = false; UI.sel = null; UI.wx = null; UI.t = null;
    const P = ensurePlan(CID);
    X.panel('gyx3dRoomOv', '🏠 我们的家 · 3D', `<div class="gyx-row">${X.whoSel(CID, 'gyx3dRoomOpen')}<button id="g3rEdBtn" class="gyx-btn" onclick="gyx3dRoomEdit()">🛠️ 改房子</button>${window.gysMap3dOpen ? `<span class="gyx-chip" onclick="document.getElementById('gyx3dRoomOv').remove();gysMap3dOpen()">🗺️ 出门</span>` : ''}${window.gyxHomeOpen ? `<span class="gyx-chip" onclick="document.getElementById('gyx3dRoomOv').remove();gyxHomeOpen('${CID}',true)">回平面小屋</span>` : ''}<label class="gyx-tip" style="margin:0"><input type="checkbox" ${window.gyxHomeCfg && window.gyxHomeCfg('open3d') ? 'checked' : ''} onchange="gyxHomeCfg&&gyxHomeCfg('open3d',this.checked)"> 每次直接进 3D</label></div>
        <div class="g3r-st" id="g3rStage"><canvas id="g3rC"></canvas><div id="g3rOv" class="g3r-ov"></div><div id="g3rSt" class="g3r-top"></div><div id="g3rLay" class="g3r-lay"></div><div id="g3rLoad" class="g3r-load">小人们在进门…</div></div>
        <div id="g3rEd" class="g3r-ed" hidden></div>
        <div id="g3rPlay">
        <div id="g3rBar" class="gyx-row">${[['hi', '👋 打招呼'], ['hug', '🤗 抱抱'], ['poke', '👆 戳戳'], ['pat', '🫳 摸摸头'], ['heart', '🫶 比心'], ['dance', '💃 一起跳舞'], ['eat', '🍚 一起吃饭'], ['read', '📖 一起看书'], ['sleep', '🛌 一起睡']].map(([k, n]) => `<button class="gyx-btn lite" onclick="gyx3dRoomDo('${k}')">${n}</button>`).join('')}</div>
        <div class="gyx-row"><input id="g3rSay" class="gyx-who" style="flex:1" placeholder="走过去跟 TA 说句话…" onkeydown="if(event.key==='Enter')gyx3dRoomDo('talk')"><button class="gyx-btn" onclick="gyx3dRoomDo('talk')">说</button></div>
        <div id="g3rInfo" class="gyx-card"></div><div id="g3rLog" class="gyx-card"></div>
        <div class="gyx-row"><button class="gyx-btn lite" onclick="gyx3dRoomGift(this)">🎁 让 TA 添一件东西</button><button class="gyx-btn lite" onclick="gyx3dRoomThink(this)">🤔 TA 现在想干嘛</button>${window.gyx3dOpen ? `<button class="gyx-btn lite" onclick="gyx3dOpen('mine')">🧊 换小人的样子</button>` : ''}<label class="gyx-tip" style="margin:0"><input type="checkbox" ${R3.cfg.chat ? 'checked' : ''} onchange="gyx3dRoomCfg('chat',this.checked)"> 小屋里说的话也发进聊天</label></div>
        <div class="gyx-tip">点哪走哪，拖动转着看，两指捏合 / 滚轮缩放；右上角选看哪一层（换层你的小人会走楼梯）。电脑上 WASD / 方向键也能走。${window.gyx3dModelOf && !window.gyx3dModelOf(c) ? '现在的小人是随便捏的，去「🧊 3D 小人」给 TA 和你自己捏一个就会换成你们的样子。' : ''}</div></div>`, 'g3r');
    OPEN = 1;
    const ob = new MutationObserver(() => { if (!document.getElementById('gyx3dRoomOv')) { closeRoom(); ob.disconnect(); } }); ob.observe(document.body, { childList: true });
    ROOM = new HL.House(document.getElementById('g3rC'), document.getElementById('g3rOv'), P, { spin: !!R3.cfg.spin, onView: v => { UI.fl = v; paintLayers(); if (UI.edit) paintEd(); }, onSky: col => { const s = document.getElementById('g3rStage'); if (s) s.style.background = col; } });
    ROOM.tap = onTap; ROOM.onEdit = onEdit;
    ROOM.setEnv(envNow());
    ROOM.setItems((window.gyxHomeItems ? window.gyxHomeItems(CID) : []).map(x => ({ id: x.id, ico: x.ico, img: x.img, x: x.x, y: x.y })));
    ROOM.setView(0); paintLayers();
    try {
        const [ta, me] = await Promise.all([window.gyx3dAvFor(c), window.gyx3dAvFor('me')]);
        if (!ROOM) { ta.dispose(); me.dispose(); return; }
        if (AWAY) ta.dispose(); else ROOM.add('ta', ta); ROOM.add('me', me);
    } catch (e) { const l = document.getElementById('g3rLoad'); if (l) l.textContent = '小人没做出来：' + e.message; return; }
    const l = document.getElementById('g3rLoad'); if (l) l.remove();
    let s = nowSt(CID); if (!s || (s.by !== 'auto' && s.by !== 'you') || Date.now() - s.at > 30 * 60000) { s = Object.assign(routine(CID), { by: 'routine' }); setSt(CID, s); }
    if (ROOM.avs.ta) { const sp = (s.spot && spotById(s.spot)) || pickSpot(s.kind === 'her' ? 'floor' : s.kind, 'ta'); if (sp) { s.spot = sp.id; s.n = sp.n; save(); ROOM.place('ta', Object.assign({}, sp, { state: s.state || sp.state })); ROOM.avs.ta.spotId = sp.id; } }
    const door = ROOM.spots.find(p => p.id === 'door');
    ROOM.place('me', Object.assign({}, door, { state: 'idle' }));
    ROOM.go('me', { x: 1.2, z: PLAN().d / 2 - 1.8, fl: 0 }, { fn: () => { if (ROOM && ROOM.avs.ta && ROOM.avs.ta.av.state !== 'sleep' && ROOM.avs.ta.fl === 0) { ROOM.face('ta', 'me'); ROOM.avs.ta.av.play('wave'); roomSay(X.v('你回来啦', '回来啦？', '嗨～', '等你好久了')); } } });
    paintLog();
    keyH = e => { if (!ROOM || UI.edit || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return; const K = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] }[e.key]; if (!K || !ROOM.avs.me) return; e.preventDefault(); const yaw = ROOM.C.th - ROOM.root.rotation.y, a = ROOM.avs.me, p = a.av.holder.position; const x = K[0] * Math.cos(yaw) + K[1] * Math.sin(yaw), z = -K[0] * Math.sin(yaw) + K[1] * Math.cos(yaw); a.spotId = null; ROOM.go('me', { x: p.x + x * 0.9, z: p.z + z * 0.9, fl: a.fl }); };
    addEventListener('keydown', keyH);
    tickT = setInterval(() => { if (!OPEN || document.hidden) return; refreshTA(false).then(paintLog); if (!UI.wx && !UI.t && ROOM) { const e = envNow(); if (e.wx !== ROOM.env.wx || e.t !== ROOM.env.t) { ROOM.setEnv(e); paintLog(); } } }, 20000);
    if (X.auto(c) && (!s || s.by !== 'auto' || Date.now() - s.at > 7 * 60000)) setTimeout(() => refreshTA(true).then(paintLog), 2500);
    try { if (window.gyxWeatherRefresh && X.on('gyxWeather')) window.gyxWeatherRefresh().then(() => { if (ROOM && !UI.wx) { ROOM.setEnv(envNow()); paintLog(); } }).catch(() => {}); } catch (e) {}
};
function closeRoom() { OPEN = 0; UI.edit = false; UI.wx = null; UI.t = null; if (ROOM) { try { ROOM.dispose(); } catch (e) {} ROOM = null; } if (keyH) removeEventListener('keydown', keyH); keyH = null; clearInterval(tickT); }
window.gyx3dRoomWall = () => { UI.tab = 'shape'; setEdit(true); };   // 老入口（换墙色）→ 改房子
window.gyx3dRoomNight = () => { if (!ROOM) return; const L = ['day', 'dusk', 'night']; UI.t = L[(L.indexOf(ROOM.env.t) + 1) % 3]; ROOM.setEnv(envNow()); paintLog(); };
window.gyx3dRoomCfg = (k, v) => { R3.cfg[k] = v; save(); };
window.gyx3dRoomGift = async btn => { if (!window.gyxHomeGift3d) return X.toast('要装「🏠 我们的小屋」', ''); btn.disabled = true; const it = await window.gyxHomeGift3d(CID); btn.disabled = false; if (!it || !ROOM) return; ROOM.setItems(window.gyxHomeItems(CID).map(x => ({ id: x.id, ico: x.ico, img: x.img, x: x.x, y: x.y }))); ROOM.avs.ta && ROOM.avs.ta.av.play('cheer'); roomSay(String(it.story || it.name).slice(0, 50)); onTap({ type: 'item', id: it.id }); log(CID, `${X.name(X.char(CID))} 给小屋添了「${it.name}」`); };
window.gyx3dRoomThink = async btn => { btn.disabled = true; try { await refreshTA(true); } finally { btn.disabled = false; paintLog(); } };
window.gyx3dRoomData = () => R3;

// 让角色知道小屋里刚发生了什么
X.ctx(id => { const s = nowSt(id); const L = R3.log.filter(x => x.cid === String(id) && Date.now() - x.at < 6 * 3600000).slice(-4); const P = R3.house[String(id)]; if (!s && !L.length) return ''; return `【小屋里】${P && P.floors ? `你们的房子 ${P.floors.length} 层（${P.floors.map(f => f.name).join('、')}）。` : ''}${s ? `你现在在${where(s)}${STATE_CN[s.state] ? STATE_CN[s.state] : ''}。` : ''}${L.length ? '刚才：' + L.map(x => x.t).join('；') : ''}`; }, 'gyx3dRoom');
X.inj('gyx3dRoom', [['小屋里', '🧊 3D 小屋', 'TA 在房子里哪一层、在干嘛，你们刚在屋里做了什么']]);
X.action({ key: 'gyx_room3d', label: '回你们的 3D 小房子里待一会儿，做点想做的事（吃饭 / 看书 / 发呆 / 睡觉……）', hint: '🧊 3D 小屋', need: c => { const s = R3.st[String(c.id)]; return !s || Date.now() - s.at > 40 * 60000; },
    run: async c => { const n = await decide(c); if (!n) return null; setSt(c.id, n); try { if (window.gysMap3dGoHome) await window.gysMap3dGoHome(c.id); } catch (e) {} log(c.id, `${X.name(c)} 去了${where(n)}${STATE_CN[n.state] ? STATE_CN[n.state] : ''}${n.say ? '：「' + n.say + '」' : ''}`); if (OPEN && String(c.id) === CID) applyTA(n, true); return `在小屋里${where(n)}${STATE_CN[n.state] || ''}${n.say ? '，说：' + n.say : ''}`; } }, 'gyx3dRoom');
X.today(() => { const rows = R3.log.filter(x => X.day(new Date(x.at)) === X.day()).slice(-6).map(x => ({ t: '🏠', x: X.esc(x.t), go: `gyx3dRoomOpen('${x.cid}')` })); return { title: '🧊 3D 小屋', rows }; }, 'gyx3dRoom');
X.widget('gyx3dRoomW', { n: '3D 小屋', sizes: ['s', 'm'], tap: () => window.gyx3dRoomOpen(), r: w => { const c = X.cur(), s = c && nowSt(c.id); return X.gw(w, '🏠', '3D 小屋', [s ? `${X.esc(X.name(c))} 在${X.esc(where(s))}${STATE_CN[s.state] || ''}` : '进去看看 TA 在干嘛', s && s.why ? X.esc(s.why) : '']); } }, 'gyx3dRoom');
X.mem({ k: 'gyx3dRoom', ico: '🏠', n: '3D 小屋里发生的事', d: '你们在 3D 小屋里做过什么', items: c => R3.log.filter(x => x.cid === String(c.id)), text: x => x.t, edit: (x, v) => { x.t = v; }, del: (c, i) => { const L = R3.log.filter(x => x.cid === String(c.id)), it = L[i], j = R3.log.indexOf(it); if (j >= 0) R3.log.splice(j, 1); }, meta: x => new Date(x.at).toLocaleString(), save }, 'gyx3dRoom');
X.css('gyx3dRoomCss', `
#gyx3dRoomOv .gyx-box{width:min(1100px,100%);height:96vh;max-height:96vh}
.g3r-st{position:relative;height:min(62vh,640px);border-radius:18px;overflow:hidden;background:#cfdbe6}.g3r-st canvas{width:100%;height:100%;display:block;touch-action:none}
.g3r-ov{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.g3-bub{position:absolute;transform:translate(-50%,-100%) scale(.9);max-width:220px;padding:7px 12px;border-radius:14px;background:rgba(255,255,255,.95);color:#1d1d1f;font-size:13px;line-height:1.5;box-shadow:0 6px 18px rgba(0,0,0,.15);opacity:0;transition:opacity .25s,transform .25s;width:max-content}.g3-bub.on{opacity:1;transform:translate(-50%,-100%)}
.g3r-top{position:absolute;left:10px;top:10px;padding:6px 12px;border-radius:12px;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:13px;max-width:calc(100% - 110px);color:#1d2733}.g3r-top em{font-style:normal;color:#6a7685;font-size:12px;margin-left:6px}
.g3r-lay{position:absolute;right:10px;top:10px;display:grid;gap:6px;max-height:calc(100% - 20px);overflow:auto}
.g3r-lay button{font:inherit;font-size:12.5px;border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.6);color:#1d2733;border-radius:10px;padding:5px 12px;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);min-width:64px}
.g3r-lay button.on{background:#1d2733;color:#fff;border-color:#1d2733}
.g3r-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#6a7685;font-size:14px;pointer-events:none}
.g3r-l{font-size:13px;line-height:1.7}.g3r-l i{font-style:normal;color:#aaa;margin-right:8px;font-size:12px}
#g3rBar .gyx-btn{padding:7px 11px;font-size:13px}
.g3r-ed{border:1px solid rgba(127,127,127,.25);border-radius:16px;overflow:hidden;margin-top:10px}
.g3e-tabs{display:flex;border-bottom:1px solid rgba(127,127,127,.2);overflow-x:auto}
.g3e-tabs span{flex:1 0 auto;text-align:center;padding:10px 14px;cursor:pointer;font-size:14px;opacity:.65;border-bottom:2px solid transparent}
.g3e-tabs span.on{opacity:1;font-weight:700;border-bottom-color:#4a6fa5}
.g3e-bd{padding:12px 14px 16px;display:grid;gap:9px}.g3e-bd > b{font-size:13px;font-weight:500;opacity:.7;margin-top:4px}
.g3e-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.g3e-row label{font-size:13.5px;min-width:2.6em}.g3e-row input[type=range]{flex:1;min-width:110px}.g3e-row output{font-variant-numeric:tabular-nums;font-weight:700;min-width:3em;text-align:right}
.g3e-bd input[type=color]{width:38px;height:30px;border:1px solid rgba(127,127,127,.3);border-radius:8px;padding:2px;background:transparent;cursor:pointer}
.g3e-gen{border:1px dashed rgba(127,127,127,.35);border-radius:14px;padding:10px 12px;display:grid;gap:6px;margin-top:6px}
.g3e-sel{border:1px solid #4a6fa5;border-radius:14px;padding:10px 12px;display:grid;gap:6px}
.g3e-fg{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.g3e-fg > i{font-style:normal;font-size:12px;opacity:.6;width:2.6em}
.g3e-f{display:inline-grid;justify-items:center;gap:1px;min-width:58px;padding:6px 4px;border-radius:12px;background:rgba(127,127,127,.1);cursor:pointer;font-size:20px;line-height:1.2}.g3e-f em{font-style:normal;font-size:11.5px}
.g3e-list{display:flex;flex-wrap:wrap;gap:6px}
`);
X.mini({ id: 'gyx3dRoom', icon: '🏠', title: '3D 小屋', desc: '你们的 3D 房子：层数、外形、家具都能自己定，也能让 TA 设计；两个小人在里面过日子', cat: '回忆', onOpen: () => window.gyx3dRoomOpen() });
(async () => { R3 = Object.assign(R3, await S.get('d', {})); R3.log = R3.log || []; R3.st = R3.st || {}; R3.house = R3.house || {}; R3.bak = R3.bak || {}; R3.cfg = Object.assign({ chat: false, spin: false }, R3.cfg || {}); setInterval(() => { if (!OPEN && X.on('gyx3dRoom')) { X.chars().forEach(c => { if (!X.auto(c)) { const s = nowSt(c.id), n = routine(c.id); if (!s || (s.by === 'routine' && (s.kind !== n.kind || s.state !== n.state)) || Date.now() - s.at > 3 * 3600000) R3.st[String(c.id)] = Object.assign({ at: Date.now(), by: 'routine' }, n); } }); } }, 300000); })();
