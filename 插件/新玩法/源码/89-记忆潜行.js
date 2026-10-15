/* 🕹️ 记忆潜行：上下两块屏的像素小游戏——下屏是一张像素地图，你操纵一个小人在 TA 的记忆里走；地图上散着发光的「记忆碎片」（从你们某段时间的聊天里挑出来的话），走到上面，上屏就放出那段对话，TA 再说一句现在回头看的感受。雾会跟着你散开。键盘方向键 / WASD、屏幕十字键、点地图都能走 */
if (window.__gyxDive) return; window.__gyxDive = 1;
X.feat('gyxDive', { n: '🕹️ 记忆潜行', desc: '像素小游戏：走进 TA 的记忆里，捡回你们说过的话' });
const S = X.store('dive');
let D = { dives: [] };   // {id,cid,at,label,from,to,map:[[..]],me:{x,y},frags:[{x,y,at,who,q,ctx,c,got}],seen:{},end,sum}
const W = 15, H = 11, T = 20;
const saveD = () => S.set('d', D);
const dv = id => D.dives.find(x => x.id === id);
const PER = { recent: ['最近一个月', 30, 0], before: ['一两个月前', 60, 30], long: ['很久以前', 3650, 60], all: ['随便哪段', 3650, 0] };
function pickFrags(c, key) {
    const H0 = ((typeof globalChats !== 'undefined' && globalChats[c.id]) || []).filter(m => m && m.sender !== 'system' && !m.viaCall && typeof m.text === 'string');
    const [, a, b] = PER[key] || PER.all, now = Date.now(), lo = now - a * 864e5, hi = now - b * 864e5;
    let L = H0.map((m, i) => ({ m, i })).filter(({ m }) => (m.timestamp || 0) >= lo && (m.timestamp || 0) <= hi && X.plain(m.text).length >= 8 && X.plain(m.text).length <= 160);
    if (L.length < 4) L = H0.map((m, i) => ({ m, i })).filter(({ m }) => X.plain(m.text).length >= 6);
    const out = [], used = new Set();
    for (let k = 0; k < 40 && out.length < 6 && L.length; k++) { const p = X.pick(L); if ([...used].some(j => Math.abs(j - p.i) < 4)) continue; used.add(p.i); const ctx = H0.slice(Math.max(0, p.i - 2), p.i + 2).map(m => (m.sender === 'me' ? X.me(c) : X.name(c)) + '：' + X.plain(m.text).slice(0, 60)).join('\n'); out.push({ at: p.m.timestamp || 0, who: p.m.sender === 'me' ? 'me' : 'ta', q: X.plain(p.m.text).slice(0, 120), ctx }); }
    return out.sort((x, y) => x.at - y.at);
}
function makeMap() {
    const m = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? 1 : 0));
    for (let k = 0; k < 22; k++) { const x = 1 + Math.floor(Math.random() * (W - 2)), y = 1 + Math.floor(Math.random() * (H - 2)); if (Math.abs(x - 7) + Math.abs(y - 5) > 1) m[y][x] = Math.random() < .55 ? 2 : 3; }   // 2 树 3 石头
    return m;
}
async function newDive(c, key) {
    const fr = pickFrags(c, key); if (fr.length < 2) return null;
    const map = makeMap(), free = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (!map[y][x] && Math.abs(x - 7) + Math.abs(y - 5) > 2) free.push([x, y]);
    fr.forEach(f => { const i = Math.floor(Math.random() * free.length); [f.x, f.y] = free.splice(i, 1)[0]; });
    const R = { id: 'dv' + Date.now().toString(36), cid: String(c.id), at: Date.now(), key, label: (PER[key] || PER.all)[0], map, me: { x: 7, y: 5 }, frags: fr, seen: {} };
    reveal(R); D.dives.unshift(R); D.dives = D.dives.slice(0, 20); await saveD(); return R;
}
function reveal(R) { for (let y = R.me.y - 2; y <= R.me.y + 2; y++) for (let x = R.me.x - 2; x <= R.me.x + 2; x++) R.seen[x + ',' + y] = 1; }
let CUR = null, BUSY = false;
async function comment(R, f) {
    if (f.c) return; const c = X.char(R.cid);
    f.c = X.plain(X.bailu() ? (X.cards(['情话', '聊天'], c, 1)[0] || '那天我也记得。') : (await X.ask(`${X.who(c)}\n她走进了你的记忆里，捡起了一段你们的旧对话（${new Date(f.at).toLocaleDateString()}）：\n${f.ctx}\n其中这一句被捡起来了：「${f.q}」\n用一两句话说说你现在回头看这一刻的感受（可以笑那时候的自己、可以说当时没说出口的话）。只输出这几句。`)) || '那天的事，我一直记得。');
}
async function stepTo(x, y) {
    const R = CUR && dv(CUR); if (!R || BUSY || R.end) return;
    if (x < 0 || y < 0 || x >= W || y >= H || R.map[y][x]) { bump(); return; }
    R.me = { x, y }; reveal(R); draw();
    const f = R.frags.find(f => f.x === x && f.y === y && !f.got);
    if (f) {
        f.got = Date.now(); BUSY = true; top(f, true); draw();
        await comment(R, f); BUSY = false; top(f);
        if (R.frags.every(f => f.got)) await finish(R);
        await saveD(); draw();
    } else saveD();
}
function bump() { const cv = document.getElementById('gyxDvCv'); if (cv) { cv.classList.remove('bump'); void cv.offsetWidth; cv.classList.add('bump'); } }
async function finish(R) {
    R.end = Date.now(); const c = X.char(R.cid);
    R.sum = X.plain(X.bailu() ? '' : (await X.ask(`${X.who(c)}\n她在你的记忆里走了一圈（${R.label}），捡回了这些话：\n${R.frags.map(f => '「' + f.q + '」').join('\n')}\n走出来的时候，你对她说一句话（40 字以内）。只输出这一句。`)) || '') || '谢谢你陪我把这些都捡回来了。';
    const t = document.getElementById('gyxDvTop'); if (t) t.innerHTML = `<div class="dv-end">✨ 碎片都捡齐了</div><div class="dv-c">${X.esc(X.name(c))}：${X.esc(R.sum)}</div>`;
    X.toast(X.v('🕹️ 记忆都捡回来了', '🕹️ 潜行结束', '🕹️ 走出记忆了'), R.sum.slice(0, 30));
}
function top(f, wait) {
    const R = CUR && dv(CUR), t = document.getElementById('gyxDvTop'); if (!R || !t) return; const c = X.char(R.cid);
    t.innerHTML = `<div class="dv-date">${new Date(f.at).toLocaleString()}</div><div class="dv-q ${f.who}">${f.who === 'me' ? '你' : X.esc(X.name(c))}：${X.esc(f.q)}</div><div class="dv-c">${wait ? '……' : X.esc(X.name(c)) + '：' + X.esc(f.c || '')}</div>`;
}
const PAL = { floor: ['#2b2540', '#30294a'], wall: '#14111f', tree: '#3fae6a', trunk: '#7a4b2a', rock: '#8a8aa0', fog: '#0b0a12', orb: '#ffe066', got: '#5a5470', me: '#ff7aa8', hair: '#3a2a1e' };
function draw() {
    const R = CUR && dv(CUR), cv = document.getElementById('gyxDvCv'); if (!R || !cv) return; const g = cv.getContext('2d'), t = Date.now() / 300;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const px = x * T, py = y * T, seen = R.seen[x + ',' + y];
        if (!seen) { g.fillStyle = PAL.fog; g.fillRect(px, py, T, T); continue; }
        g.fillStyle = PAL.floor[(x + y) % 2]; g.fillRect(px, py, T, T);
        const v = R.map[y][x];
        if (v === 1) { g.fillStyle = PAL.wall; g.fillRect(px, py, T, T); }
        if (v === 2) { g.fillStyle = PAL.trunk; g.fillRect(px + 8, py + 12, 4, 7); g.fillStyle = PAL.tree; g.fillRect(px + 3, py + 2, 14, 11); g.fillRect(px + 6, py, 8, 3); }
        if (v === 3) { g.fillStyle = PAL.rock; g.fillRect(px + 4, py + 8, 12, 8); g.fillRect(px + 6, py + 5, 8, 3); }
    }
    R.frags.forEach(f => { if (!R.seen[f.x + ',' + f.y]) return; const px = f.x * T, py = f.y * T, b = f.got ? 0 : Math.sin(t + f.x) * 2; g.fillStyle = f.got ? PAL.got : PAL.orb; g.fillRect(px + 7, py + 6 + b, 6, 6); if (!f.got) { g.fillStyle = 'rgba(255,224,102,.35)'; g.fillRect(px + 4, py + 3 + b, 12, 12); } });
    const mx = R.me.x * T, my = R.me.y * T;   // 像素小人
    g.fillStyle = PAL.hair; g.fillRect(mx + 6, my + 2, 8, 4); g.fillStyle = '#ffd9c2'; g.fillRect(mx + 7, my + 5, 6, 5); g.fillStyle = PAL.me; g.fillRect(mx + 6, my + 10, 8, 6); g.fillStyle = '#2a2a3a'; g.fillRect(mx + 7, my + 16, 2, 3); g.fillRect(mx + 11, my + 16, 2, 3);
    const n = R.frags.filter(f => f.got).length, s = document.getElementById('gyxDvN'); if (s) s.textContent = `碎片 ${n}/${R.frags.length}`;
}
window.gyxDiveMove = (dx, dy) => { const R = CUR && dv(CUR); if (R) stepTo(R.me.x + dx, R.me.y + dy); };
window.gyxDiveNew = async (cid, key) => { const c = X.char(cid) || X.cur(); const R = await newDive(c, key); if (!R) { X.toast(X.v('这段时间的记忆太少了', '还没攒够能走进去的记忆'), '多聊一阵再来，或者换一段时间'); return null; } window.gyxDiveOpen(R.id); return R; };
let KEY = null, ANIM = null;
window.gyxDiveOpen = function (id, who) {
    const R = id ? dv(id) : null; const c = R ? X.char(R.cid) : (X.char(who) || X.cur()); if (!c) return;
    if (KEY) { document.removeEventListener('keydown', KEY); KEY = null; } clearInterval(ANIM);
    if (!R) {
        CUR = null; const L = D.dives.filter(x => x.cid === String(c.id));
        X.panel('gyxDvOv', '🕹️ 记忆潜行', `<div class="gyx-row">${X.whoSel(c.id, 'gyxDiveWho')}</div><div class="gyx-tip">走进 ${X.esc(X.name(c))} 的哪一段记忆？</div>
            <div class="gyx-row">${Object.entries(PER).map(([k, v]) => `<button class="gyx-btn lite" onclick="gyxDiveNew('${c.id}','${k}')">${v[0]}</button>`).join('')}</div>
            ${L.map(x => `<div class="gyx-card" style="cursor:pointer" onclick="gyxDiveOpen('${x.id}')"><b>${X.esc(x.label)}</b> <span class="gyx-tip">${new Date(x.at).toLocaleDateString()} · ${x.frags.filter(f => f.got).length}/${x.frags.length}${x.end ? ' · 走完了' : ''}</span>${x.sum ? `<div>${X.esc(x.sum)}</div>` : ''}</div>`).join('')}`);
        return;
    }
    CUR = R.id;
    X.panel('gyxDvOv', '🕹️ ' + X.esc(R.label), `<div class="dv-ds"><div class="dv-top" id="gyxDvTop"><div class="dv-c">${R.end ? X.esc(R.sum || '') : '用方向键 / 十字键 / 点地图走，去找发光的碎片'}</div></div>
        <div class="dv-hinge"><span id="gyxDvN"></span></div><canvas id="gyxDvCv" width="${W * T}" height="${H * T}"></canvas>
        <div class="dv-pad"><span onclick="gyxDiveMove(0,-1)" style="grid-area:u">▲</span><span onclick="gyxDiveMove(-1,0)" style="grid-area:l">◀</span><span onclick="gyxDiveMove(1,0)" style="grid-area:r">▶</span><span onclick="gyxDiveMove(0,1)" style="grid-area:d">▼</span></div></div>
        <div class="gyx-row"><button class="gyx-btn lite" onclick="gyxDiveOpen(null,'${R.cid}')">换一段记忆</button></div>`, 'gyx-dive');
    const cv = document.getElementById('gyxDvCv');
    cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H); const dx = Math.sign(x - R.me.x), dy = Math.sign(y - R.me.y); if (Math.abs(x - R.me.x) >= Math.abs(y - R.me.y)) window.gyxDiveMove(dx, 0); else window.gyxDiveMove(0, dy); });
    KEY = e => { if (!document.getElementById('gyxDvCv')) { document.removeEventListener('keydown', KEY); KEY = null; return; } const k = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[e.key]; if (k && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) { e.preventDefault(); window.gyxDiveMove(k[0], k[1]); } };
    document.addEventListener('keydown', KEY);
    ANIM = setInterval(() => { if (!document.getElementById('gyxDvCv')) { clearInterval(ANIM); return; } draw(); }, 120);
    draw(); const last = R.frags.filter(f => f.got).sort((a, b) => b.got - a.got)[0]; if (last && !R.end) top(last);
};
window.gyxDiveWho = cid => window.gyxDiveOpen(null, cid);
window.gyxDiveData = () => D;
X.ctx(id => { const R = D.dives.find(x => x.cid === String(id) && Date.now() - x.at < 2 * 864e5); if (!R) return ''; const got = R.frags.filter(f => f.got && f.c); return got.length ? `【记忆潜行】她刚走进了你「${R.label}」的记忆，捡回了：${got.slice(0, 3).map(f => '「' + f.q.slice(0, 30) + '」').join('')}。` : ''; }, 'gyxDive');
X.action({ key: 'gyx_dive', label: '想带她走进一段你们以前的记忆里看看', hint: '记忆潜行，一个像素小游戏', need: c => (((typeof globalChats !== 'undefined' && globalChats[c.id]) || []).length > 40) && !D.dives.some(x => x.cid === String(c.id) && Date.now() - x.at < 5 * 864e5),
    run: async c => { const R = await newDive(c, X.pick(['before', 'long', 'all'])); if (!R) return null; X.notify(c, `🕹️ ${X.esc(X.name(c))} ${X.v('把一段记忆藏好了，等你走进去', '邀你走进一段旧记忆', '在记忆里撒了几块碎片')}`, R.label, X.go('gyxDiveOpen', R.id)); return (await X.reach(c, `你把「${R.label}」的一段记忆做成了一个小地图，里面藏了几句你们以前说过的话，叫她进去捡回来（别剧透是哪几句）`)) ? '邀她走进一段记忆' : null; } }, 'gyxDive');
X.today(() => ({ title: '🕹️ 记忆潜行', rows: D.dives.filter(x => X.day(new Date(x.at)) === X.day()).slice(0, 2).map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: `${X.esc(x.label)} · 碎片 ${x.frags.filter(f => f.got).length}/${x.frags.length}`, go: `gyxDiveOpen('${x.id}')` })) }), 'gyxDive');
X.widget('gyxDiveW', { n: '记忆潜行', sizes: ['s', 'm'], tap: () => { const c = X.cur(), R = c && D.dives.find(x => x.cid === String(c.id) && !x.end); window.gyxDiveOpen(R ? R.id : null); }, r: w => { const c = X.cur(), R = c && D.dives.find(x => x.cid === String(c.id)); return X.gw(w, '🕹️', '记忆潜行', R ? [`${X.esc(R.label)} ${R.frags.filter(f => f.got).length}/${R.frags.length}`, X.esc(R.sum || '还有碎片没捡')] : ['还没走进过', '点我进去看看']); } }, 'gyxDive');
X.mem({ k: 'gyxDive', ico: '🕹️', n: '记忆潜行捡回的话', d: '捡回来的旧对话，和 TA 回头看的感受', items: c => D.dives.filter(x => x.cid === String(c.id)).reduce((a, R) => a.concat(R.frags.filter(f => f.got).map(f => Object.assign(f, { __R: R.id }))), []), text: f => `「${f.q}」${f.c ? '｜' + f.c : ''}`, edit: (f, v) => { const p = String(v).split('｜'); f.c = p.slice(1).join('｜'); }, del: (c, i) => { const all = []; D.dives.filter(x => x.cid === String(c.id)).forEach(R => R.frags.filter(f => f.got).forEach(f => all.push([R, f]))); const p = all[i]; if (p) p[0].frags.splice(p[0].frags.indexOf(p[1]), 1); }, meta: f => new Date(f.at).toLocaleDateString(), save: saveD }, 'gyxDive');
X.css('gyxDvCss', `.gyx-dive .gyx-box{width:min(380px,100%)}.dv-ds{background:#2a2438;border-radius:22px;padding:12px;box-shadow:inset 0 0 0 3px #3b3350}
.dv-top{background:#0f0d18;border-radius:8px;min-height:110px;padding:10px 12px;color:#e8e4ff;font-family:"Courier New",monospace,"PingFang SC";font-size:13px;line-height:1.7;image-rendering:pixelated}
.dv-date{font-size:11px;color:#9a90c8}.dv-q{color:#fff}.dv-q.me{color:#ffb3cf}.dv-c{color:#ffe066;margin-top:4px}.dv-end{color:#7cf2b1}
.dv-hinge{text-align:center;font-size:11px;color:#9a90c8;padding:6px 0;font-family:"Courier New",monospace}
#gyxDvCv{width:100%;image-rendering:pixelated;border-radius:6px;display:block;cursor:pointer}#gyxDvCv.bump{animation:dvB .2s}@keyframes dvB{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.dv-pad{display:grid;grid-template-areas:". u ." "l . r" ". d .";grid-template-columns:repeat(3,44px);grid-template-rows:repeat(3,36px);justify-content:center;gap:2px;margin-top:10px}.dv-pad span{background:#14111f;color:#cfc8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none}.dv-pad span:active{background:#3b3350}`);
X.mini({ id: 'gyxDive', icon: '🕹️', title: '记忆潜行', desc: '像素小游戏：走进 TA 的记忆，捡回你们说过的话', cat: '回忆', onOpen: () => window.gyxDiveOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.dives = D.dives || []; })();
