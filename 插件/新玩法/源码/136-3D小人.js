/* 🧊 3D小人：照抖音「3分钟3D建模小人」和它用的「低模小人建造师」（lowpoly.kkeist.com）的做法做的低模 Q 版大头小人——传一张图自动生成（Q 版图直接鼓成 3D，普通立绘让 AI 看图捏），没图按人设生成，二十种发型自己捏，也能在上面自己画（头发、衣服都能画）；也能导入 VRoid Hub / Sketchfab / 模之屋 / Mixamo 下的 VRM、GLB、FBX、PMX 模型。小人会做动作、换表情、张嘴说话：放到「🧸 桌面上的TA」里，每换一个页面、TA 发来消息、你戳 TA，TA 都会当场做反应；也会住进「🏠 我们的小屋」的 3D 版里 */
if (window.__gyx3d) return; window.__gyx3d = 1;
X.feat('gyx3d', { n: '🧊 3D 小人', desc: '捏 / 图片变 3D / 导入模型，桌面小 TA 和小屋里用' });
X.feat('gyx3dPage', { n: '🧊 3D 小人 · 换页面时做反应', desc: '桌面上的 3D 小 TA：你打开别的页面时 TA 做个动作说句话' });
const S = X.store('3d');
let D = { models: {}, who: {}, me: '', page: true, pageRate: 0.6, pageGap: 60, chat: false };
const LIB = ['js/vendor/gy3d.min.js?v=9', 'https://cdn.jsdelivr.net/gh/Piwp1003/my-ai-twitter@main/js/vendor/gy3d.min.js'];
let libP = null;
function lib() {
    if (window.GY3D) return Promise.resolve(window.GY3D); if (libP) return libP;
    libP = new Promise((res, rej) => { let i = 0; const next = () => { if (i >= LIB.length) { libP = null; return rej(new Error('3D 引擎没加载出来（缺 js/vendor/gy3d.min.js）')); } const s = document.createElement('script'); s.src = LIB[i++]; s.onload = () => window.GY3D ? res(window.GY3D) : next(); s.onerror = () => { s.remove(); next(); }; document.head.appendChild(s); }; next(); });
    return libP;
}
const save = () => S.set('cfg', D);
const uid = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const KIND = { doll: '低模小人', chibi: '捏的', pic: '图片变的', vrm: 'VRM', glb: 'GLB', fbx: 'FBX', pmx: 'MMD' };
// 动作 / 表情（给模型选的时候用中文也认）
const ACTS = { wave: '挥手', nod: '点头', shake: '摇头', jump: '跳跳', spin: '转圈', dance: '跳舞', clap: '拍手', heart: '比心', hug: '张开手要抱', sway: '摇摆', fall: '倒下', walk: '走路', run: '跑步', think: '思考', shy: '害羞', angry: '生气跺脚', cry: '哭', stretch: '伸懒腰', poke: '吓一跳', bow: '鞠躬', cheer: '欢呼', tilt: '歪头', look: '东张西望', yawn: '打哈欠', pat: '摸摸头', sulk: '闹别扭', sit: '坐下', sleep: '睡觉', eat: '吃东西', read: '看书', daze: '发呆', phone: '玩手机', idle: '站着' };
const FACES = { normal: '平常', happy: '开心', closed: '闭眼', surprised: '惊讶', angry: '生气', sad: '难过', shy: '害羞' };
const actOf = a => { a = String(a || '').trim(); if (ACTS[a]) return a; const k = Object.keys(ACTS).find(k => ACTS[k] === a || a.includes(ACTS[k])); return k || null; };
const faceOf = f => { f = String(f || '').trim(); if (FACES[f]) return f; const k = Object.keys(FACES).find(k => FACES[k] === f || f.includes(FACES[k])); return k || null; };
const MOOD2 = { '开心': ['cheer', 'happy'], '难过': ['cry', 'sad'], '生气': ['angry', 'angry'], '害羞': ['shy', 'shy'], '困': ['yawn', 'closed'], '想你': ['hug', 'happy'], '惊讶': ['poke', 'surprised'], '撒娇': ['heart', 'shy'], '认真': ['nod', 'normal'], '默认': ['wave', 'normal'] };
window.gyx3dActList = () => Object.keys(ACTS).filter(k => !['idle', 'sit', 'sleep', 'eat', 'read', 'phone'].includes(k)).map(k => k + '(' + ACTS[k] + ')').join(' / ');
X.plGroup('🧊 3D 小人', '🧊 3D 小人', [['3d.page', '换页面时的反应'], ['3d.look', '让 TA 按人设捏自己']], {
    '3d.page': '{{who}}\n最近的聊天：\n{{recent}}\n\n你是待在她屏幕角落里的小小的 3D 的你。她刚刚打开了「{{page}}」。做个当场的反应：说一句（口语，15 字以内，没什么好说的可以给空字符串），选一个动作（{{acts}}），一个表情（{{faces}}）。\n只输出 JSON：{"say":"","act":"","face":""}',
    '3d.look': '{{who}}\n现在要把你捏成一个 Q 版大头 3D 小人。按你的人设（外貌、性格、平时穿什么）挑：\n{{opts}}\n颜色用 #rrggbb。只输出 JSON：{{keys}}'
});
const modelOf = c => { if (!c) return null; const id = D.who[String(c.id)]; return id && D.models[id] ? id : null; };
async function descOf(id) {
    const m = D.models[id]; if (!m) return null;
    if (m.kind === 'chibi') return { kind: 'chibi', look: m.look, thick: m.thick, round: m.round, step: m.step };
    const b = await S.get('m_' + id);
    if (m.kind === 'doll') return Object.assign({ kind: 'doll', look: m.look, thick: m.thick, round: m.round, step: m.step, facet: m.facet, parts: m.parts, backReal: m.backReal, shape: m.shape, block: m.block, pixel: m.pixel, lightYaw: m.lightYaw, lightPitch: m.lightPitch, lightContrast: m.lightContrast, miiH: m.miiH, miiW: m.miiW, miiHead: m.miiHead, skel: m.skel, straight: m.straight }, b || {});
    if (!b) return null;
    return Object.assign({ kind: m.kind, thick: m.thick, round: m.round, step: m.step }, b);
}
const avCache = {};
async function buildAv(id) { const G = await lib(); const d = await descOf(id); if (!d) throw new Error('这个小人的数据找不到了'); return G.build(d); }
// 没给 TA 捏的时候，小屋里先用一个按名字随机出来的小人顶着
function defaultLook(seed, girl) {
    let h = 0; String(seed || 'x').split('').forEach(ch => h = (h * 31 + ch.charCodeAt(0)) >>> 0);
    const pick = a => a[(h = (h * 1103515245 + 12345) >>> 0) % a.length];
    const hairs = ['#2b2630', '#4a3426', '#d8c9a8', '#6b4a8a', '#b7c4d6', '#3a2f2a', '#e3a6b8'];
    return girl ? { hair: pick(hairs), hairStyle: pick(['twin', 'long', 'bob', 'bun']), bangs: pick(['straight', 'side', 'messy']), top: pick(['shirt', 'sweater', 'dress', 'sailor']), topColor: pick(['#ffffff', '#ffd6e0', '#cfe3ff', '#f6e7c1']), bottom: 'skirt', bottomColor: pick(['#5b6b8c', '#e7a0b4', '#8aa7c9']), acc: [pick(['ribbon', 'clip', 'flower', 'cat'])], eyes: pick(['round', 'droopy']), eyeColor: pick(['#7a5cd6', '#4aa3ff', '#c96b4a']) }
        : { hair: pick(hairs), hairStyle: pick(['short', 'spiky', 'wolf', 'short']), bangs: pick(['messy', 'side', 'parted']), ahoge: false, top: pick(['hoodie', 'shirt', 'jacket', 'tee']), topColor: pick(['#3d4b66', '#ffffff', '#2f2f35', '#8a6d52']), tie: '', bottom: 'pants', bottomColor: pick(['#2d2d33', '#4b5a73', '#6b5a4a']), acc: [], eyes: pick(['sharp', 'cat', 'round']), eyeColor: pick(['#3a5a9a', '#7a3a3a', '#5a7a4a']), blush: false, mouth: pick(['smile', 'flat', 'fang']) };
}
async function avFor(c, girl) {
    const id = c === 'me' ? (D.models[D.me] ? D.me : null) : modelOf(c);
    if (id) return buildAv(id);
    const G = await lib(); return G.fromChibi(c === 'me' ? defaultLook(X.me(X.cur()) + 'me', true) : defaultLook(c && (c.name || c.id), false));
}
window.gyx3dLib = lib; window.gyx3dAvFor = avFor; window.gyx3dModelOf = c => modelOf(c);
window.gyx3dData = () => D;
// 小缩略图
async function thumb(av) {
    const G = await lib(); const cv = document.createElement('canvas'); cv.width = 160; cv.height = 200; cv.style.cssText = 'position:fixed;left:-9999px;top:0;width:160px;height:200px'; document.body.appendChild(cv);
    const st = new G.Stage(cv, { drag: false, snap: true, always: true, fit: 1.15 }); st.set(av); av.update(0.5); const url = st.snap('image/png'); st.alive = false; st.av = null; st.r.dispose(); cv.remove(); return url;
}

// ===========================================================================
// 编辑器
// ===========================================================================
let TAB = 'auto', ED = null, PV = null, PVid = 0;   // ED：正在做的那个小人；PV：预览舞台
const LOOK0 = () => Object.assign({}, window.GY3D ? GY3D.LOOK_DEF : {}, { hairStyle: 'fluffy' });
const PARAM0 = () => ({ thick: 100, round: 100, step: 20, facet: 0, parts: {}, shape: 'lowpoly', block: 8, pixel: false, lightYaw: 322, lightPitch: 57, lightContrast: 50, miiH: 50, miiW: 50, miiHead: 50, skel: null, straight: true });
function stopPV() { if (PV) { try { PV.dispose(); } catch (e) {} PV = null; } }
async function preview(build) {
    const cv = document.getElementById('g3Pv'); if (!cv) return; const my = ++PVid;
    const G = await lib(); if (!PV || PV.canvas !== cv) { stopPV(); PV = new G.Stage(cv, { fit: 1.2 }); }
    const msg = document.getElementById('g3PvMsg'); if (msg) msg.textContent = '生成中…';
    try { const av = await build(G); if (my !== PVid) { av.dispose(); return; } PV.set(av); if (msg) msg.textContent = ''; }
    catch (e) { if (msg) msg.textContent = '没生成出来：' + e.message; console.error(e); }
}
window.gyx3dPvAct = a => { if (PV && PV.av) PV.av.play(a); };
window.gyx3dPvFace = f => { if (PV && PV.av) PV.av.lockFace(f, 3); };
window.gyx3dPvTalk = () => { if (PV && PV.av) { PV.av.talk(true); setTimeout(() => PV && PV.av && PV.av.talk(false), 2500); } };
const pvBox = () => `<div class="g3-pv"><canvas id="g3Pv"></canvas><div id="g3PvMsg" class="gyx-tip"></div><div class="g3-acts">${['jump', 'sway', 'walk', 'run', 'wave', 'cheer', 'dance', 'nod', 'shake', 'bow', 'fall', 'spin', 'heart', 'shy', 'angry', 'cry', 'think', 'sit', 'sleep', 'eat', 'read', 'idle'].map(a => `<span class="gyx-chip" onclick="gyx3dPvAct('${a}')">${ACTS[a]}</span>`).join('')}<span class="gyx-chip" onclick="gyx3dPvTalk()">说话</span></div><div class="gyx-tip">左右拖着转着看，滚轮放大</div></div>`;
const g3body = () => document.getElementById('g3Body');

window.gyx3dOpen = async function (tab, arg) {
    if (tab) TAB = tab; stopPV();
    try { await lib(); } catch (e) { X.toast('3D 引擎没加载出来', e.message); return; }
    const T = [['mine', '我的小人'], ['auto', '✨ 自动生成'], ['make', '🎨 捏一个'], ['draw', '🖌️ 画 / 修'], ['import', '📦 导入模型'], ['set', '⚙️ 用在哪']];
    X.panel('gyx3dOv', '🧊 3D 小人', `<div class="gyx-row">${T.map(([k, n]) => `<span class="gyx-chip${TAB === k ? ' on' : ''}" onclick="gyx3dOpen('${k}')">${n}</span>`).join('')}</div><div id="g3Body"></div>`, 'g3-big');
    const body = g3body(); if (!body) return;
    const ob = new MutationObserver(() => { if (!document.getElementById('gyx3dOv')) { stopPV(); ob.disconnect(); } }); ob.observe(document.body, { childList: true });
    if (TAB === 'mine') return mine(body);
    if (TAB === 'auto') return autoTab(body, arg);
    if (TAB === 'make') return make(body, arg);
    if (TAB === 'draw') return drawTab(body, arg);
    if (TAB === 'import') return importTab(body);
    if (TAB === 'set') return setTab(body);
};
// ---------- 我的小人 ----------
function whoUses(id) { const L = X.chars().filter(c => D.who[String(c.id)] === id).map(c => X.name(c)); if (D.me === id) L.push('我自己'); return L; }
function mine(body) {
    const ids = Object.keys(D.models).sort((a, b) => (D.models[b].at || 0) - (D.models[a].at || 0));
    body.innerHTML = `<div class="gyx-tip">做好的小人在这里。给某个角色用了，桌面上的小 TA、3D 小屋里 TA 就是这个样子；「我自己」是小屋里你操控的那个小人。</div>
    <div class="g3-grid">${ids.map(id => { const m = D.models[id]; const u = whoUses(id); return `<div class="g3-card"><div class="g3-th" onclick="gyx3dView('${id}')">${m.thumb ? `<img src="${m.thumb}">` : '🧊'}</div>
        <input class="gyx-who" value="${X.esc(m.name || '')}" onchange="gyx3dRename('${id}',this.value)" style="width:100%">
        <div class="gyx-tip">${KIND[m.kind] || m.kind}${u.length ? ' · ' + X.esc(u.join('、')) + ' 在用' : ''}</div>
        <div class="gyx-row" style="margin:4px 0"><select class="gyx-who" style="flex:1;min-width:0" onchange="gyx3dUse('${id}',this.value);this.value=''"><option value="">给谁用…</option>${X.chars().map(c => `<option value="${X.esc(c.id)}">${X.esc(X.name(c))}</option>`).join('')}<option value="__me">我自己</option><option value="__none">谁都不用</option></select></div>
        <div class="gyx-row" style="margin:0">${m.kind === 'doll' || m.kind === 'chibi' || m.kind === 'pic' ? `<span class="gyx-chip" onclick="gyx3dEdit('${id}')">改</span><span class="gyx-chip" onclick="gyx3dEdit('${id}','draw')">画</span>` : ''}<span class="gyx-chip" onclick="gyx3dView('${id}')">看看</span><span class="gyx-chip" onclick="gyx3dDel('${id}')">删</span></div></div>`; }).join('') || '<div class="gyx-card">还没有。去「✨ 自动生成」传一张图或按人设生成，或者「🎨 捏一个」，或者「📦 导入模型」。</div>'}</div>
    <div id="g3View"></div>`;
}
window.gyx3dRename = (id, v) => { if (D.models[id]) { D.models[id].name = v.trim(); save(); } };
window.gyx3dUse = (id, who) => { if (!who) return; if (who === '__me') D.me = id; else if (who === '__none') { Object.keys(D.who).forEach(k => { if (D.who[k] === id) delete D.who[k]; }); if (D.me === id) D.me = ''; } else D.who[who] = id; save(); refreshPet(); gyx3dOpen('mine'); };
window.gyx3dDel = async id => { if (!confirm('删掉这个小人？')) return; delete D.models[id]; Object.keys(D.who).forEach(k => { if (D.who[k] === id) delete D.who[k]; }); if (D.me === id) D.me = ''; await S.set('m_' + id, null); await save(); refreshPet(); gyx3dOpen('mine'); };
window.gyx3dView = id => { const v = document.getElementById('g3View'); if (!v) return; v.innerHTML = `<div class="gyx-card"><b>${X.esc(D.models[id].name || '')}</b>${pvBox()}<div class="gyx-row">${Object.keys(FACES).map(f => `<span class="gyx-chip" onclick="gyx3dPvFace('${f}')">${FACES[f]}</span>`).join('')}</div></div>`; preview(() => buildAv(id)); v.scrollIntoView({ behavior: 'smooth' }); };

// ---------- 正在做的小人（ED）----------
// ED = {id?, name, src:'look'|'img', look?, front?, back?(canvas), labels?(Uint8Array), backReal, paintF, paintB(canvas), eraseF, eraseB, labEdit(Uint8Array), thick, round, step, facet, parts}
const N0 = 256;
function blankC() { const c = document.createElement('canvas'); c.width = N0; c.height = N0; return c; }
function newED(src, o) { return Object.assign({ name: '', src, N: N0, paintF: blankC(), paintB: blankC(), eraseF: new Uint8Array(N0 * N0), eraseB: new Uint8Array(N0 * N0), labEdit: new Uint8Array(N0 * N0).fill(255) }, PARAM0(), o || {}); }
const isBlank = c => { if (!c) return true; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true; };
const allIs = (a, v) => { if (!a) return true; for (let i = 0; i < a.length; i++) if (a[i] !== v) return false; return true; };
function edSaved(E) {   // 给 GY3D.dollFromSaved 的（内存里的，画布 / 数组直接用）
    return { N: E.N, look: E.src === 'look' ? E.look : null, front: E.front, back: E.back, labels: E.labels, backReal: E.backReal, paintF: E.paintF, paintB: E.paintB, eraseF: E.eraseF, eraseB: E.eraseB, labEdit: E.labEdit, thick: E.thick, round: E.round, step: E.step, facet: E.facet, parts: E.parts, shape: E.shape, block: E.block, pixel: E.pixel, lightYaw: E.lightYaw, lightPitch: E.lightPitch, lightContrast: E.lightContrast, miiH: E.miiH, miiW: E.miiW, miiHead: E.miiHead, skel: E.src === 'img' ? E.skel : null, straight: E.straight };
}
async function edBuild(G) { const d = await G.dollFromSaved(edSaved(ED)); return G.fromDoll(d); }
let pvT = null; const pvED = (ms) => { clearTimeout(pvT); pvT = setTimeout(() => preview(edBuild), ms == null ? 200 : ms); };
async function loadED(id) {
    const m = D.models[id]; if (!m) return null; const h = (await S.get('m_' + id)) || {}; const G = await lib();
    const img = async s => { if (!s) return null; const im = new Image(); im.src = s; await im.decode(); const c = blankC(); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); return c; };
    if (m.kind === 'chibi') return newED('look', { id, name: m.name, look: Object.assign({}, m.look) });
    if (m.kind === 'pic') { const f = await img(h.front), b = await img(h.back); const d = G.imageToDoll(f, { labels: G.unpackLabels(h.labels, h.W * h.H), W: h.W, H: h.H, back: b }); return newED('img', { id, name: m.name, front: d.front, back: h.back ? d.back : null, backReal: !!h.back, labels: d.labels }); }
    const E = newED(m.src || 'look', { id, name: m.name, look: m.look ? Object.assign({}, m.look) : null, thick: m.thick ?? 100, round: m.round ?? 100, step: m.step ?? 20, facet: m.facet ?? 0, parts: m.parts || {}, backReal: !!m.backReal, shape: m.shape || 'lowpoly', block: m.block || 8, pixel: !!m.pixel, lightYaw: m.lightYaw ?? 322, lightPitch: m.lightPitch ?? 57, lightContrast: m.lightContrast ?? 50, miiH: m.miiH ?? 50, miiW: m.miiW ?? 50, miiHead: m.miiHead ?? 50, skel: m.skel || null, straight: m.straight !== false });
    if (E.src === 'img') { E.front = await img(h.front); E.back = await img(h.back); E.labels = G.unpackLabels(h.labels, N0 * N0); }
    if (h.paintF) E.paintF.getContext('2d').drawImage(await img(h.paintF), 0, 0); if (h.paintB) E.paintB.getContext('2d').drawImage(await img(h.paintB), 0, 0);
    if (h.eraseF) E.eraseF = G.unpackLabels(h.eraseF, N0 * N0); if (h.eraseB) E.eraseB = G.unpackLabels(h.eraseB, N0 * N0); if (h.labEdit) E.labEdit = G.unpackLabels(h.labEdit, N0 * N0);
    return E;
}
window.gyx3dEdit = async (id, tab) => { const m = D.models[id]; if (!m) return; ED = await loadED(id); gyx3dOpen(tab || (ED.src === 'look' ? 'make' : 'draw')); };
async function saveED(use) {
    const E = ED, G = await lib(); const id = E.id || uid();
    const m = { id, kind: 'doll', src: E.src, name: E.name || '小人', look: E.src === 'look' ? E.look : undefined, thick: E.thick, round: E.round, step: E.step, facet: E.facet, parts: E.parts, backReal: E.backReal, shape: E.shape, block: E.block, pixel: E.pixel, lightYaw: E.lightYaw, lightPitch: E.lightPitch, lightContrast: E.lightContrast, miiH: E.miiH, miiW: E.miiW, miiHead: E.miiHead, skel: E.src === 'img' && E.skel ? E.skel : undefined, straight: E.straight, at: Date.now() };
    const heavy = {};
    if (E.src === 'img') { heavy.front = E.front.toDataURL('image/png'); if (E.back) heavy.back = E.back.toDataURL('image/png'); heavy.labels = G.packLabels(E.labels); }
    if (!isBlank(E.paintF)) heavy.paintF = E.paintF.toDataURL('image/png'); if (!isBlank(E.paintB)) heavy.paintB = E.paintB.toDataURL('image/png');
    if (!allIs(E.eraseF, 0)) heavy.eraseF = G.packLabels(E.eraseF); if (!allIs(E.eraseB, 0)) heavy.eraseB = G.packLabels(E.eraseB); if (!allIs(E.labEdit, 255)) heavy.labEdit = G.packLabels(E.labEdit);
    try { const av = await edBuild(G); m.thumb = await thumb(av); av.dispose(); } catch (e) { console.warn(e); }
    await S.set('m_' + id, heavy); D.models[id] = m; E.id = id;
    if (use === '__me') D.me = id; else if (use) D.who[use] = id;
    await save(); refreshPet(); X.toast(X.v('小人做好了', '存好了'), (m.name || '') + (use ? ' · 已经给' + (use === '__me' ? '你自己' : X.name(X.char(use))) + '用上' : ''));
    return id;
}
const useSel = (id) => `<select id="${id}" class="gyx-who"><option value="">先不给谁用</option>${X.chars().map(c => `<option value="${X.esc(c.id)}"${X.cur() && String(X.cur().id) === String(c.id) ? ' selected' : ''}>给 ${X.esc(X.name(c))} 用</option>`).join('')}<option value="__me">给我自己（小屋里的我）</option></select>`;
const saveRow = () => `<div class="gyx-row"><input id="g3Name" class="gyx-who" placeholder="名字" value="${X.esc((ED && ED.name) || '')}">${useSel('g3Use')}<button class="gyx-btn" onclick="gyx3dSaveED(this)">💾 存好</button></div>`;
window.gyx3dSaveED = async btn => { if (!ED) return; btn.disabled = true; ED.name = (document.getElementById('g3Name') || {}).value || ED.name; try { await saveED((document.getElementById('g3Use') || {}).value); } finally { btn.disabled = false; } };
// 低模参数（四个总的 + 每个部位的厚度 / 圆润度）
const paramBox = () => { const E = ED, sl = (k, n, a, b, s) => `<label class="g3-sl">${n} <b id="g3v_${k}">${E[k]}</b><input type="range" min="${a}" max="${b}" step="${s}" value="${E[k]}" oninput="document.getElementById('g3v_${k}').textContent=this.value" onchange="gyx3dParam('${k}',+this.value)"></label>`;
    const mii = E.shape === 'mii' && E.src === 'look';
    return `<div class="gyx-row">风格：<span class="gyx-chip${E.shape !== 'block' && !mii ? ' on' : ''}" onclick="gyx3dParam('shape','lowpoly',1)">低模</span><span class="gyx-chip${E.shape === 'block' ? ' on' : ''}" onclick="gyx3dParam('shape','block',1)">方块</span>${E.src === 'look' ? `<span class="gyx-chip${mii ? ' on' : ''}" onclick="gyx3dParam('shape','mii',1)">🙂 朋友收集风</span>` : ''}${E.shape === 'block' ? sl('block', '方块大小', 3, 20, 1) : ''}${mii ? '' : `<label class="gyx-tip" style="margin:0"><input type="checkbox" ${E.pixel ? 'checked' : ''} onchange="gyx3dParam('pixel',this.checked)"> 像素感</label>`}</div>
    ${mii ? `<div class="gyx-tip">圆圆的大头、胶囊身子、表情画在脸上（像「朋友收集」里的小人）：按上面捏人的选项直接搭出来的，在「🖌️ 画 / 修」里画的不会显示（切回低模就有）。</div><div class="gyx-row"><b style="font-size:13px">身材</b></div><div class="gyx-row">${sl('miiH', '身高（身子手脚）', 0, 100, 1)}${sl('miiW', '胖瘦', 0, 100, 1)}${sl('miiHead', '头的大小', 0, 100, 1)}</div>`
    : `<div class="gyx-row"><b style="font-size:13px">模型调节</b></div><div class="gyx-row">${sl('thick', '厚度 %', 30, 220, 5)}${sl('round', '圆润度 %', 20, 300, 5)}${sl('step', '简化程度（越大越低模）', 6, 40, 1)}${sl('facet', '色块', 0, 100, 5)}</div>`}
    <div class="gyx-row"><b style="font-size:13px">光线调节</b></div><div class="gyx-row">${sl('lightYaw', '光的方向 °', 0, 360, 1)}${sl('lightPitch', '光的高度 °', 10, 90, 1)}${sl('lightContrast', '明暗对比 %', 0, 100, 1)}</div>
    ${mii ? '' : `<details class="g3-adv"><summary>每个部位单独调</summary>${GY3D.LP_PARTS.slice(1).map(p => { const d = GY3D.LP_DEF[p], v = (E.parts[p] || {}); return `<div class="gyx-row"><b style="width:3em">${GY3D.LP_CN[GY3D.LP_PARTS.indexOf(p)]}</b><label class="g3-sl">厚度<input type="range" min="2" max="220" value="${v.depth ?? d[0]}" onchange="gyx3dPart('${p}','depth',+this.value)"></label><label class="g3-sl">圆润度<input type="range" min="0" max="100" value="${v.round ?? d[1]}" onchange="gyx3dPart('${p}','round',+this.value)"></label><label class="g3-sl">前后<input type="range" min="-20" max="20" value="${v.z ?? 0}" onchange="gyx3dPart('${p}','z',+this.value)"></label></div>`; }).join('')}<span class="gyx-chip" onclick="gyx3dEdSet('parts')">都恢复默认</span></details>`}`; };
window.gyx3dParam = (k, v, re) => { ED[k] = v; if (/^light/.test(k) && PV && PV.av && PV.av.setLight) { PV.av.setLight(ED.lightYaw, ED.lightPitch, ED.lightContrast); return; } if (re) return gyx3dOpen(); pvED(); };
// 页面上的按钮改 ED / DR 用这个（插件代码包在函数里，onclick 里直接写 ED 拿不到）
window.gyx3dEdSet = (k, v) => { if (!ED) return; if (k === 'parts') { ED.parts = {}; return gyx3dOpen(); } if (k === 'straight') { ED.straight = !!v; return pvED(); } if (k === 'noskel') { ED.skel = null; DR.tool = 'pen'; return gyx3dOpen(); } if (k === 'noback') { ED.back = null; ED.backReal = false; return gyx3dOpen(); } };
window.gyx3dDbg = () => ({ ED, DR });
window.gyx3dPart = (p, k, v) => { ED.parts[p] = Object.assign({}, ED.parts[p], { [k]: v }); pvED(); };

// ---------- ✨ 自动生成 ----------
let AUTO = null;   // {img: canvas}
function autoTab(body) {
    const c = X.cur(), cs = X.chars();
    const pic = c && window.gyxPetImgOf && window.gyxPetImgOf(c);
    body.innerHTML = `<div class="g3-two"><div>
        <div class="gyx-row">给谁做：<select id="g3AutoWho" class="gyx-who">${cs.map(x => `<option value="${X.esc(x.id)}"${c && String(c.id) === String(x.id) ? ' selected' : ''}>${X.esc(X.name(x))}</option>`).join('')}<option value="__me">我自己</option></select></div>
        <div class="gyx-card"><b>📷 有图：传一张</b><div class="gyx-tip">① <b>Q 版小人图</b>（像视频里那样：MOSO LowPoly 之类捏好的透明底 / 纯色底全身图）→ 直接鼓成 3D，头发、脸、身体、手、脚自动分好。<br>② <b>普通立绘 / 截图 / 照片</b> → 让 AI 看图，照着发型、发色、眼睛、衣服捏一个 Q 版的（要能识图的模型；不能识图就按图里的颜色猜）。</div>
          <div class="gyx-row"><label class="gyx-btn">选图片<input type="file" accept="image/*" style="display:none" onchange="gyx3dAutoFile(this)"></label>${pic ? `<button class="gyx-btn lite" onclick="gyx3dAutoUse()">用 ${X.esc(X.name(c))} 的立绘 / 头像</button>` : ''}</div>
          <div id="g3AutoImg"></div></div>
        <div class="gyx-card"><b>✍️ 没图：按人设生成</b><div class="gyx-tip">TA 照自己的人设（外貌、性格、平时穿什么）挑发型发色衣服，捏一个 Q 版的；你在「🎨 捏一个」里还能接着改。</div>
          <div class="gyx-row"><button class="gyx-btn" onclick="gyx3dAutoLook(this)">🪄 按人设生成</button>${window.gyPhotoGet ? `<button class="gyx-btn lite" onclick="gyx3dAutoGen(this)">🎨 用生图接口画一张 Q 版再变 3D</button>` : ''}</div>
          <div class="gyx-tip">生图那个要先在「📷 角色发图片」里配好画图接口。</div></div>
      </div><div>${pvBox()}${ED ? saveRow() + `<div class="gyx-row"><button class="gyx-btn lite" onclick="gyx3dOpen('${ED.src === 'look' ? 'make' : 'draw'}')">${ED.src === 'look' ? '🎨 去接着捏' : '🖌️ 去修一修（部位、颜色、自己画）'}</button><button class="gyx-btn lite" onclick="gyx3dOpen('draw')">🖌️ 自己画两笔</button></div>` + paramBox() : '<div class="gyx-tip">生成好了在这里看，满意就存。</div>'}</div></div>`;
    if (AUTO && AUTO.img) showAutoImg();
    if (ED) pvED(0);
}
const autoWho = () => { const v = (document.getElementById('g3AutoWho') || {}).value; return v === '__me' ? null : X.char(v); };
function showAutoImg() { const b = document.getElementById('g3AutoImg'); if (!b || !AUTO) return; b.innerHTML = `<div class="gyx-row" style="align-items:flex-start"><img src="${AUTO.img.toDataURL()}" style="max-width:110px;max-height:150px;border-radius:10px;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/12px 12px"><div style="flex:1"><button class="gyx-btn" onclick="gyx3dAutoDirect()">① 直接变 3D</button><div class="gyx-tip" style="margin:4px 0 10px">这张就是 Q 版全身小人</div><button class="gyx-btn lite" onclick="gyx3dAutoSee(this)">② AI 看图捏 Q 版</button><div class="gyx-tip" style="margin-top:4px">普通立绘、头像、照片</div></div></div>`; }
async function toCanvas(src) { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = src; await im.decode(); const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight)); const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c; }
window.gyx3dAutoFile = inp => { const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = async () => { try { AUTO = { img: await toCanvas(r.result) }; showAutoImg(); } catch (e) { X.toast('这张图读不了', '换成 png / jpg 试试'); } }; r.readAsDataURL(f); };
window.gyx3dAutoUse = async () => { const c = X.cur(); try { AUTO = { img: await toCanvas(window.gyxPetImgOf(c)) }; showAutoImg(); } catch (e) { X.toast('这张图读不了', '可能是外链图不让读，下载下来再传'); } };
window.gyx3dAutoDirect = async () => { const G = await lib(); const d = G.imageToDoll(AUTO.img, {}); const who = autoWho(); ED = newED('img', { name: who ? X.name(who) : '我', front: d.front, back: null, backReal: false, labels: d.labels });
    // 摆了动作的图（举手、叉腰、跑）：按骨架分部位，手脚掰回下垂
    try { const rgba = d.front.getContext('2d').getImageData(0, 0, N0, N0).data, sk = G.skelAuto(rgba, N0); if (sk && G.skelPosed(sk)) { ED.skel = sk; ED.labels = G.labelsFromSkel(rgba, N0, sk); X.toast('看着是摆了动作的图', '已经按骨架分好部位、把手脚放下来了；不对就去「🖌️ 画 / 修」里拖骨架'); } } catch (e) { console.warn(e); }
    gyx3dOpen('auto'); };
// AI 看图 → 捏人参数
const lookKeys = () => '{"hairStyle":"","bangs":"","ahoge":false,"hair":"#","hairLen":1,"eyes":"","eyeColor":"#","mouth":"","blush":true,"skin":"#","top":"","topColor":"#","tie":"#或空","bottom":"","bottomColor":"#","socks":"","shoes":"#","acc":[],"accColor":"#"}';
const lookOpts = () => { const O = GY3D.LOOK_OPTS; return Object.keys(O).map(k => `${k}：${O[k].map(x => x[0] + '=' + x[1]).join('，')}${k === 'acc' ? '（数组，可以空）' : ''}`).join('\n') + '\nahoge：true/false（呆毛）\nblush：true/false（腮红）\nhairLen：0.5~1.4（头发长短）'; };
function applyLook(L, j) { const O = GY3D.LOOK_OPTS; Object.keys(j || {}).forEach(k => { const v = j[k]; if (k === 'acc') { if (Array.isArray(v)) L.acc = v.filter(x => O.acc.some(o => o[0] === x)); return; } if (O[k]) { if (O[k].some(o => o[0] === v)) L[k] = v; return; } if (k === 'hairLen') { if (+v > 0) L.hairLen = Math.max(0.5, Math.min(1.4, +v)); return; } if (/color|^hair$|^skin$|^shoes$|^tie$/i.test(k)) { if (/^#[0-9a-f]{6}$/i.test(v)) L[k] = v; else if (k === 'tie' && !v) L.tie = ''; return; } if (k === 'ahoge' || k === 'blush') L[k] = !!v; }); return L; }
// 看不了图的时候：从图里取颜色猜
function guessFromImage(cv) {
    const x = cv.getContext('2d'), W = cv.width, H = cv.height, d = x.getImageData(0, 0, W, H).data;
    const at = (fx, fy) => { const px = Math.min(W - 1, Math.round(fx * W)), py = Math.min(H - 1, Math.round(fy * H)); const i = (py * W + px) * 4; return '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''); };
    const mode = (y0, y1) => { const cnt = {}; for (let y = Math.round(y0 * H); y < y1 * H; y += 2) for (let xx = Math.round(W * 0.2); xx < W * 0.8; xx += 2) { const i = (y * W + xx) * 4; if (d[i + 3] < 100) continue; const k = [d[i] >> 5, d[i + 1] >> 5, d[i + 2] >> 5].join(); cnt[k] = (cnt[k] || 0) + 1; } const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; if (!best) return null; const [r, g, b] = best[0].split(',').map(v => (+v << 5) + 16); return '#' + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join(''); };
    return { hair: mode(0, 0.15) || '#3a3341', topColor: mode(0.55, 0.7) || '#ffffff', bottomColor: mode(0.75, 0.85) || '#5b6b8c' };
}
window.gyx3dAutoSee = async btn => {
    const who = autoWho(); btn.disabled = true; btn.textContent = '…正在看图';
    const small = document.createElement('canvas'); const k = Math.min(1, 512 / Math.max(AUTO.img.width, AUTO.img.height)); small.width = Math.round(AUTO.img.width * k); small.height = Math.round(AUTO.img.height * k); const sx = small.getContext('2d'); sx.fillStyle = '#fff'; sx.fillRect(0, 0, small.width, small.height); sx.drawImage(AUTO.img, 0, 0, small.width, small.height);
    let j = null;
    if (!X.bailu()) j = X.json(await X.ask([{ role: 'user', content: [{ type: 'text', text: `看这张图里的人物，把 TA 捏成一个 Q 版大头 3D 小人：照图里的发型、发色、刘海、眼睛颜色、衣服样式和颜色挑最接近的选项。\n${lookOpts()}\n颜色用 #rrggbb。只输出 JSON：${lookKeys()}` }, { type: 'image_url', image_url: { url: small.toDataURL('image/jpeg', 0.85) } }] }]));
    const L = LOOK0();
    if (j && j.hairStyle) applyLook(L, j); else { Object.assign(L, guessFromImage(small)); X.toast('模型看不了图', '先按图里的颜色捏了一个，发型可以自己换'); }
    ED = newED('look', { name: who ? X.name(who) : '我', look: L }); btn.disabled = false; gyx3dOpen('auto');
};
async function aiLook(c) {
    const j = X.json(await X.ask(X.pl('3d.look', '', { who: X.who(c), opts: lookOpts(), keys: lookKeys() })));
    return j ? applyLook(LOOK0(), j) : null;
}
window.gyx3dAutoLook = async btn => { const c = autoWho() || X.cur(); if (!c) return; btn.disabled = true; btn.textContent = '…TA 在挑'; const L = X.bailu() ? null : await aiLook(c); btn.disabled = false; btn.textContent = '🪄 按人设生成'; if (!L) return X.toast('TA 没挑出来', '再试一次，或者去「🎨 捏一个」自己捏'); ED = newED('look', { name: X.name(c), look: L }); gyx3dOpen('auto'); };
window.gyx3dAutoGen = async btn => {
    const c = autoWho() || X.cur(); if (!c) return; btn.disabled = true; const t = btn.textContent; btn.textContent = '…在画（十几秒）';
    try { const got = await window.gyPhotoGet(c.id, 'Q版三头身大头小人，全身，正面站立，双手自然垂在身体两侧，两脚分开，纯白背景，干净线稿平涂，像手办', true, 'gen');
        if (!got || !got.src) { X.toast('没画出来', (got && got.why) || '先在「📷 角色发图片」里配好画图接口'); return; }
        AUTO = { img: await toCanvas(got.src) }; showAutoImg(); X.toast('画好了', '点「① 直接变 3D」'); }
    catch (e) { X.toast('没画出来', e.message || ''); } finally { btn.disabled = false; btn.textContent = t; }
};

// ---------- 🎨 捏一个 ----------
function make(body) {
    const G = window.GY3D, O = G.LOOK_OPTS;
    if (!ED || ED.src !== 'look') ED = newED('look', { look: LOOK0() });
    const L = ED.look;
    const chips = (k, multi) => O[k].map(([v, n]) => `<span class="gyx-chip${(multi ? (L[k] || []).includes(v) : L[k] === v) ? ' on' : ''}" onclick="gyx3dSet('${k}','${v}',${multi ? 1 : 0})">${n}</span>`).join('');
    const col = (k, n) => `<label class="g3-col">${n}<input type="color" value="${L[k] || '#ffffff'}" oninput="gyx3dSet('${k}',this.value,0,1)"></label>`;
    const cs = X.chars();
    body.innerHTML = `<div class="g3-two">${pvBox()}<div class="g3-opts">
        <div class="gyx-row"><button class="gyx-btn lite" onclick="gyx3dRand()">🎲 随机</button><select id="g3AiWho" class="gyx-who">${cs.map(c => `<option value="${X.esc(c.id)}"${X.cur() && String(X.cur().id) === String(c.id) ? ' selected' : ''}>${X.esc(X.name(c))}</option>`).join('')}</select><button class="gyx-btn lite" onclick="gyx3dAiLook(this)">🪄 让 TA 按人设捏自己</button><button class="gyx-btn lite" onclick="gyx3dOpen('draw')">🖌️ 在这上面自己画</button></div>
        <h4>发型（${O.hairStyle.length} 种，选「光头 / 自己画」就能完全自己画头发）</h4><div>${chips('hairStyle')}</div><h4>刘海</h4><div>${chips('bangs')}<span class="gyx-chip${L.ahoge ? ' on' : ''}" onclick="gyx3dSet('ahoge',${!L.ahoge})">呆毛</span></div><div class="gyx-row">${col('hair', '发色')}<label class="g3-sl">头发长度<input type="range" min="0.5" max="1.4" step="0.05" value="${L.hairLen || 1}" onchange="gyx3dSet('hairLen',+this.value)"></label></div>
        <h4>脸</h4><div>${chips('eyes')}</div><div>${chips('mouth')}<span class="gyx-chip${L.blush ? ' on' : ''}" onclick="gyx3dSet('blush',${!L.blush})">腮红</span></div><div class="gyx-row">${col('eyeColor', '瞳色')}${col('skin', '肤色')}</div>
        <h4>衣服</h4><div>${chips('top')}</div><div class="gyx-row">${col('topColor', '上衣')}${col('tie', '领结 / 领子')}<span class="gyx-chip${!L.tie ? ' on' : ''}" onclick="gyx3dSet('tie','')">不要领结</span></div><div>${chips('bottom')}</div><div class="gyx-row">${col('bottomColor', '下装')}${col('shoes', '鞋')}</div><div>${chips('socks')}</div>
        <h4>配饰（可以多选）</h4><div>${chips('acc', 1)}</div><div class="gyx-row">${col('accColor', '配饰颜色')}</div>
        <h4>低模</h4>${paramBox()}
        ${saveRow()}
        <div class="gyx-tip">捏的小人表情会真的变（开心眯眼、害羞脸红、说话张嘴、困了闭眼……）。</div></div></div>`;
    pvED(0);
}
window.gyx3dSet = (k, v, multi, quiet) => { const L = ED.look; if (multi) { L[k] = (L[k] || []).includes(v) ? L[k].filter(x => x !== v) : (L[k] || []).concat(v); } else L[k] = v; if (quiet) return pvED(); make(g3body()); };
window.gyx3dRand = () => { const O = GY3D.LOOK_OPTS, p = a => a[Math.floor(Math.random() * a.length)], c = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    const hairs = ['#2b2630', '#4a3426', '#e8e8ee', '#d8c9a8', '#6b4a8a', '#b7c4d6', '#e3a6b8', '#3a5a9a', '#9a3a3a', '#f2d16b'];
    Object.assign(ED.look, { hair: p(hairs), hairStyle: p(O.hairStyle.filter(x => x[0] !== 'none'))[0], bangs: p(O.bangs)[0], ahoge: Math.random() < 0.5, eyes: p(O.eyes)[0], eyeColor: c(), mouth: p(O.mouth)[0], top: p(O.top)[0], topColor: c(), tie: Math.random() < 0.6 ? c() : '', bottom: p(['skirt', 'shorts', 'pants']), bottomColor: c(), socks: p(O.socks)[0], acc: O.acc.filter(() => Math.random() < 0.18).map(x => x[0]), accColor: c(), blush: Math.random() < 0.7 });
    make(g3body()); };
window.gyx3dAiLook = async btn => { const c = X.char((document.getElementById('g3AiWho') || {}).value) || X.cur(); if (!c) return; btn.disabled = true; btn.textContent = '…TA 在挑'; const L = X.bailu() ? null : await aiLook(c); btn.disabled = false; btn.textContent = '🪄 让 TA 按人设捏自己'; if (!L) return X.toast('TA 没挑出来', '再试一次，或者自己捏'); ED.look = L; ED.name = ED.name || X.name(c); make(g3body()); const u = document.getElementById('g3Use'); if (u) u.value = String(c.id); };

// ---------- 🖌️ 画 / 修 ----------
// 照「低模小人建造师」：正面 / 背面各一张，画笔画颜色（同时标成选中的部位）、橡皮、吸管、部位笔（只改属于哪块）、油漆桶
const PCOL = { 1: '#ff6b6b', 2: '#2ecc71', 3: '#f59e0b', 4: '#3b82f6', 5: '#ec4899', 6: '#a855f7', 7: '#8b5a2b' };
const DR = { tool: 'pen', part: 7, size: 6, color: '#3a3341', side: 'f', showLab: true, undo: [], recent: ['#2a2230', '#ffffff', '#ffe3cf', '#3a3341', '#e0455a', '#5b7bd6'] };
let BASE = null;   // 没画过的底：{front, back, labels}
async function compose() { const G = await lib(); BASE = await G.dollFromSaved(Object.assign(edSaved(ED), { paintF: null, paintB: null, eraseF: null, eraseB: null, labEdit: null })); return BASE; }
function sideCanvas(f) { const c = blankC(), x = c.getContext('2d'); x.drawImage(f ? BASE.front : BASE.back, 0, 0); const er = f ? ED.eraseF : ED.eraseB, im = x.getImageData(0, 0, N0, N0); for (let i = 0; i < N0 * N0; i++) if (er[i]) im.data[i * 4 + 3] = 0; x.putImageData(im, 0, 0); x.drawImage(f ? ED.paintF : ED.paintB, 0, 0); return c; }
function curLabels() { const L = BASE.labels.slice(), E = ED.labEdit; for (let i = 0; i < L.length; i++) if (E[i] !== 255) L[i] = E[i]; return L; }
function drawTab(body) {
    if (!ED) ED = newED('look', { look: LOOK0() });
    const T = [['pen', '🖌️ 画笔'], ['erase', '🧽 橡皮'], ['pick', '💧 吸管'], ['bucket', '🪣 油漆桶'], ['lab', '🏷️ 部位笔']].concat(ED.src === 'img' ? [['skel', '🦴 骨架']] : []);
    if (DR.tool === 'skel' && ED.src === 'img' && !ED.skel) ED.skel = GY3D.skelFromLabels(ED.labels, N0);
    body.innerHTML = `<div class="g3-two"><div>
        <div class="gyx-row"><span class="gyx-chip${DR.side === 'f' ? ' on' : ''}" onclick="gyx3dDr('side','f')">正面</span><span class="gyx-chip${DR.side === 'b' ? ' on' : ''}" onclick="gyx3dDr('side','b')">背面</span><label class="gyx-tip" style="margin:0"><input type="checkbox" ${DR.showLab ? 'checked' : ''} onchange="gyx3dDr('showLab',this.checked)"> 显示部位颜色</label><span class="gyx-chip" onclick="gyx3dUndo()">↶ 撤销</span></div>
        <div class="g3-paint"><canvas id="g3Paint" width="256" height="256"></canvas></div>
        <div class="gyx-row">${T.map(([k, n]) => `<span class="gyx-chip${DR.tool === k ? ' on' : ''}" onclick="gyx3dDr('tool','${k}')">${n}</span>`).join('')}</div>
        <div class="gyx-row">画到：${GY3D.LP_PARTS.slice(1).map((p, i) => `<span class="gyx-chip${DR.part === i + 1 ? ' on' : ''}" style="${DR.part === i + 1 ? `background:${PCOL[i + 1]}` : `box-shadow:inset 0 0 0 2px ${PCOL[i + 1]}`}" onclick="gyx3dDr('part',${i + 1})">${GY3D.LP_CN[i + 1]}</span>`).join('')}</div>
        <div class="gyx-row"><input type="color" value="${DR.color}" onchange="gyx3dDr('color',this.value)" style="width:40px;height:32px;border:none;background:none">${DR.recent.map(c => `<span class="g3-sw" style="background:${c}" onclick="gyx3dDr('color','${c}')"></span>`).join('')}<label class="g3-sl">笔大小<input type="range" min="1" max="30" value="${DR.size}" oninput="DR_size(+this.value)"></label></div>
        <div class="gyx-tip">「画到」选哪块，画上去的就算哪块（比如自己画头发就选「头发」，画到头外面也会跟着头动）。部位笔只改属于哪块、不改颜色——自动分错了用它改。左右手脚按角色自己的左右（图上右边是左手）。背面是从后面看的样子。</div>
        ${DR.tool === 'skel' ? `<div class="gyx-card"><b>🦴 骨架</b><div class="gyx-tip">图里的人摆了动作（举手、叉腰、跑、腿分开）时，自动分的手脚容易错。把白点拖到对的地方：头的中心、脖子、胯、两边的肩 / 肘 / 手、胯 / 膝 / 脚（左右按角色自己的，图上右边是左手），再点「按骨架分部位」。建模时举着的手、分开的腿会掰回自然下垂，挥手、走路这些动作才对。</div>
          <div class="gyx-row"><button class="gyx-btn" onclick="gyx3dSkelLab()">按骨架分部位</button><button class="gyx-btn lite" onclick="gyx3dSkelAuto()">🦴 自动找关节</button><button class="gyx-btn lite" onclick="gyx3dSkelAI(this)">🤖 让 AI 看图找关节</button></div>
          <div class="gyx-row"><label class="gyx-tip" style="margin:0"><input type="checkbox" ${ED.straight !== false ? 'checked' : ''} onchange="gyx3dEdSet('straight',this.checked)"> 把举着的手、分开的腿放下来（动作才对；想保留图里的姿势就关掉）</label>${ED.skel ? '<span class="gyx-chip" onclick="gyx3dEdSet(\'noskel\')">不用骨架</span>' : ''}</div></div>` : ''}
        ${ED.src === 'img' ? `<div class="gyx-row"><button class="gyx-btn lite" onclick="gyx3dReAuto()">重新自动分部位</button><label class="gyx-chip">换背面图<input type="file" accept="image/*" style="display:none" onchange="gyx3dBackFile(this)"></label>${ED.back ? '<span class="gyx-chip" onclick="gyx3dEdSet(\'noback\')">不要背面图（自动做）</span>' : ''}</div>` : `<div class="gyx-tip">这是捏出来的小人，在上面画的会一直盖在上面；回「🎨 捏一个」换发型、颜色，你画的还在。</div>`}
        <div class="gyx-row"><span class="gyx-chip" onclick="gyx3dClearSide()">清空这一面我画的</span></div>
      </div><div>${pvBox()}${paramBox()}${saveRow()}</div></div>`;
    compose().then(() => { paintView(); wirePaint(); });
    pvED(0);
}
window.DR_size = v => { DR.size = v; };
window.gyx3dDr = (k, v) => { DR[k] = v; if (k === 'color') { DR.recent = [v].concat(DR.recent.filter(c => c !== v)).slice(0, 10); if (DR.tool === 'erase' || DR.tool === 'pick' || DR.tool === 'lab') DR.tool = 'pen'; } drawTab(g3body()); };
window.gyx3dUndo = async () => { const u = DR.undo.pop(); if (!u) return; ED.paintF.getContext('2d').putImageData(u.pf, 0, 0); ED.paintB.getContext('2d').putImageData(u.pb, 0, 0); ED.eraseF = u.ef; ED.eraseB = u.eb; ED.labEdit = u.le; paintView(); pvED(); };
window.gyx3dClearSide = async () => { pushUndo(); const f = DR.side === 'f'; (f ? ED.paintF : ED.paintB).getContext('2d').clearRect(0, 0, N0, N0); if (f) { ED.eraseF.fill(0); ED.labEdit.fill(255); } else ED.eraseB.fill(0); paintView(); pvED(); };
window.gyx3dReAuto = async () => { const G = await lib(); pushUndo(); ED.labels = G.autoLabels2(ED.front.getContext('2d').getImageData(0, 0, N0, N0).data, N0); ED.labEdit.fill(255); await compose(); paintView(); pvED(); };
window.gyx3dBackFile = inp => { const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = async () => { const G = await lib(); const b = await toCanvas(r.result); const d = G.imageToDoll(b, {}); const c = blankC(), x = c.getContext('2d'); x.translate(N0, 0); x.scale(-1, 1); x.drawImage(d.front, 0, 0); ED.back = c; ED.backReal = true; DR.side = 'b'; gyx3dOpen('draw'); }; r.readAsDataURL(f); };
function pushUndo() { DR.undo.push({ pf: ED.paintF.getContext('2d').getImageData(0, 0, N0, N0), pb: ED.paintB.getContext('2d').getImageData(0, 0, N0, N0), ef: ED.eraseF.slice(), eb: ED.eraseB.slice(), le: ED.labEdit.slice() }); if (DR.undo.length > 25) DR.undo.shift(); }
function paintView() {
    const cv = document.getElementById('g3Paint'); if (!cv || !BASE) return; const x = cv.getContext('2d'); x.clearRect(0, 0, N0, N0);
    const img = sideCanvas(DR.side === 'f');
    if (DR.side === 'b' && ED.backReal) { x.save(); x.translate(N0, 0); x.scale(-1, 1); x.drawImage(img, 0, 0); x.restore(); } else x.drawImage(img, 0, 0);
    if (DR.showLab && DR.side === 'f') { const o = x.getImageData(0, 0, N0, N0), L = curLabels(); for (let i = 0; i < N0 * N0; i++) { const c = PCOL[L[i]]; if (!c) continue; const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); o.data[i * 4] = o.data[i * 4] * 0.6 + r * 0.4; o.data[i * 4 + 1] = o.data[i * 4 + 1] * 0.6 + g * 0.4; o.data[i * 4 + 2] = o.data[i * 4 + 2] * 0.6 + b * 0.4; if (!o.data[i * 4 + 3]) o.data[i * 4 + 3] = 90; } x.putImageData(o, 0, 0); }
    drawSkel();
}
function drawSkel() {
    const cv = document.getElementById('g3Paint'); if (!cv || DR.tool !== 'skel' || !ED.skel || DR.side !== 'f') return; const x = cv.getContext('2d'), S = ED.skel, at = n => S[GY3D.SK.indexOf(n)];
    x.lineCap = 'round'; GY3D.SK_BONES.forEach(([a, b, v]) => { x.strokeStyle = '#fff'; x.lineWidth = 3.4; x.beginPath(); x.moveTo(...at(a)); x.lineTo(...at(b)); x.stroke(); x.strokeStyle = PCOL[v] || '#333'; x.lineWidth = 1.8; x.beginPath(); x.moveTo(...at(a)); x.lineTo(...at(b)); x.stroke(); });
    S.forEach((p, i) => { x.fillStyle = DR.skDrag === i ? '#ffd23f' : '#fff'; x.strokeStyle = '#222'; x.lineWidth = 1.2; x.beginPath(); x.arc(p[0], p[1], 3.6, 0, Math.PI * 2); x.fill(); x.stroke(); });
    const hv = DR.skHover; if (hv != null && S[hv]) { const p = S[hv], t = GY3D.SK_CN[GY3D.SK[hv]]; x.font = '10px sans-serif'; const w = x.measureText(t).width + 8; x.fillStyle = 'rgba(0,0,0,.72)'; x.fillRect(p[0] + 6, p[1] - 16, w, 14); x.fillStyle = '#fff'; x.fillText(t, p[0] + 10, p[1] - 5); }
}
window.gyx3dSkelLab = async () => { const G = await lib(); if (!ED.skel) return; pushUndo(); ED.labels = G.labelsFromSkel(ED.front.getContext('2d').getImageData(0, 0, N0, N0).data, N0, ED.skel); ED.labEdit.fill(255); await compose(); paintView(); pvED(); X.toast('按骨架分好了', '颜色块不对的地方还能用「🏷️ 部位笔」改'); };
window.gyx3dSkelAuto = async () => { const G = await lib(); const sk = G.skelAuto(ED.front.getContext('2d').getImageData(0, 0, N0, N0).data, N0); if (!sk) return X.toast('没找到', '图是空的？'); ED.skel = sk; paintView(); };
window.gyx3dSkelAI = async btn => {
    if (X.bailu()) return; const G = await lib(); btn.disabled = true; const t0 = btn.textContent; btn.textContent = '…正在看图';
    try { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 512, 512); x.drawImage(ED.front, 0, 0, 512, 512);
        const keys = GY3D.SK.map(k => `"${k}":[x,y]`).join(','), cn = GY3D.SK.map(k => k + '=' + GY3D.SK_CN[k]).join('，');
        const j = X.json(await X.ask([{ role: 'user', content: [{ type: 'text', text: `这是一张人物全身图（可能摆着动作）。找出 15 个关节在图上的位置，坐标是 0~1000（左上角 0,0，右下角 1000,1000）。\n${cn}\n注意：左 / 右是图里人物自己的左右——人物面朝我们时，TA 的左手在图的右边。被挡住看不见的关节就估一个大概位置。只输出 JSON：{${keys}}` }, { type: 'image_url', image_url: { url: c.toDataURL('image/jpeg', 0.88) } }] }]));
        const sk = G.skelFromAI(j, N0); if (!sk) { X.toast('AI 没找出来', '模型可能看不了图；用「🦴 自动找关节」或者自己拖'); return; }
        ED.skel = sk; paintView(); X.toast('找好了', '看看点对不对，拖一拖，再点「按骨架分部位」'); }
    catch (e) { X.toast('AI 没找出来', e.message || ''); } finally { btn.disabled = false; btn.textContent = t0; }
};
function wirePaint() {
    const cv = document.getElementById('g3Paint'); if (!cv || cv.__w) return; cv.__w = 1; let down = false, last = null;
    const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * N0, (e.clientY - r.top) / r.height * N0]; };
    const mirrorX = x => (DR.side === 'b' && ED.backReal) ? N0 - x : x;   // 背面图是翻过来显示的
    const dab = (px, py) => {
        const f = DR.side === 'f', pc = (f ? ED.paintF : ED.paintB).getContext('2d'), er = f ? ED.eraseF : ED.eraseB, R = DR.size / 2;
        const x0 = Math.max(0, Math.floor(px - R)), x1 = Math.min(N0 - 1, Math.ceil(px + R)), y0 = Math.max(0, Math.floor(py - R)), y1 = Math.min(N0 - 1, Math.ceil(py + R));
        if (DR.tool === 'pen') { pc.fillStyle = DR.color; pc.beginPath(); pc.arc(px, py, Math.max(0.6, R), 0, Math.PI * 2); pc.fill(); }
        if (DR.tool === 'erase') { pc.save(); pc.globalCompositeOperation = 'destination-out'; pc.beginPath(); pc.arc(px, py, Math.max(0.6, R), 0, Math.PI * 2); pc.fill(); pc.restore(); }
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if ((x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2 > R * R + 0.5) continue; const i = y * N0 + x;
            if (DR.tool === 'erase') { er[i] = 1; if (f) ED.labEdit[i] = 0; }
            if (DR.tool === 'pen') { er[i] = 0; if (f) ED.labEdit[i] = DR.part; }
            if (DR.tool === 'lab' && f && (BASE.labels[i] || (ED.labEdit[i] !== 255 && ED.labEdit[i]))) ED.labEdit[i] = DR.part; }
    };
    const line = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / Math.max(1, DR.size / 3))); for (let k = 1; k <= n; k++) dab(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n); };
    const live = () => paintView();
    const skHit = p => { if (!ED.skel) return null; let b = null, bd = 64; ED.skel.forEach((q, i) => { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bd) { bd = d; b = i; } }); return b; };
    cv.addEventListener('pointermove', e => { if (DR.tool !== 'skel') return; const p = at(e); if (DR.skDrag != null) { ED.skel[DR.skDrag] = [Math.max(0, Math.min(N0 - 1, p[0])), Math.max(0, Math.min(N0 - 1, p[1]))]; paintView(); return; } const h = skHit(p); if (h !== DR.skHover) { DR.skHover = h; paintView(); } });
    cv.addEventListener('pointerdown', async e => {
        const p = at(e); p[0] = mirrorX(p[0]);
        if (DR.tool === 'skel') { if (DR.side !== 'f') return X.toast('骨架在正面上拖', ''); const h = skHit(at(e)); if (h != null) { DR.skDrag = h; cv.setPointerCapture(e.pointerId); } return; }
        if (DR.tool === 'pick') { const img = sideCanvas(DR.side === 'f'); const d = img.getContext('2d').getImageData(Math.floor(p[0]), Math.floor(p[1]), 1, 1).data; if (d[3]) { const hex = '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''); gyx3dDr('color', hex); } return; }
        if (DR.tool === 'bucket') { pushUndo(); bucket(Math.floor(p[0]), Math.floor(p[1])); paintView(); pvED(); return; }
        pushUndo(); down = true; last = p; cv.setPointerCapture(e.pointerId); dab(p[0], p[1]); live();
    });
    cv.addEventListener('pointermove', e => { if (!down) return; const p = at(e); p[0] = mirrorX(p[0]); line(last, p); last = p; live(); });
    cv.addEventListener('pointerup', () => { if (DR.skDrag != null) { DR.skDrag = null; paintView(); pvED(150); return; } if (!down) return; down = false; paintView(); pvED(150); });
}
// 油漆桶：把点到的那一片（颜色相近、连在一起的）涂成现在的颜色
function bucket(sx, sy) {
    const f = DR.side === 'f', img = sideCanvas(f), d = img.getContext('2d').getImageData(0, 0, N0, N0).data, s0 = sy * N0 + sx;
    if (!d[s0 * 4 + 3]) return; const r0 = d[s0 * 4], g0 = d[s0 * 4 + 1], b0 = d[s0 * 4 + 2];
    const pc = (f ? ED.paintF : ED.paintB).getContext('2d'), im = pc.getImageData(0, 0, N0, N0), o = im.data; const R = parseInt(DR.color.slice(1, 3), 16), G = parseInt(DR.color.slice(3, 5), 16), B = parseInt(DR.color.slice(5, 7), 16);
    const seen = new Uint8Array(N0 * N0), q = [s0]; seen[s0] = 1;
    while (q.length) { const p = q.pop(); o[p * 4] = R; o[p * 4 + 1] = G; o[p * 4 + 2] = B; o[p * 4 + 3] = 255; const x = p % N0, y = (p - x) / N0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N0 || ny >= N0) continue; const n = ny * N0 + nx; if (seen[n] || !d[n * 4 + 3]) continue; if (Math.abs(d[n * 4] - r0) + Math.abs(d[n * 4 + 1] - g0) + Math.abs(d[n * 4 + 2] - b0) > 60) continue; seen[n] = 1; q.push(n); } }
    pc.putImageData(im, 0, 0);
}

async function saveModel(m, heavy, use) {   // 导入的模型（VRM / GLB / FBX / PMX）
    const id = m.id || uid(); m.id = id; m.at = Date.now();
    try { const G = await lib(); const av = await G.build(Object.assign({ kind: m.kind }, heavy)); m.thumb = await thumb(av); av.dispose(); } catch (e) { console.warn(e); }
    if (heavy) await S.set('m_' + id, heavy);
    D.models[id] = m; if (use === '__me') D.me = id; else if (use) D.who[use] = id;
    await save(); refreshPet(); X.toast(X.v('小人做好了', '存好了'), (m.name || '') + (use ? ' · 已经给' + (use === '__me' ? '你自己' : X.name(X.char(use))) + '用上' : '')); return id;
}
// ---------- 📦 导入模型 ----------
let IMP = null;
function importTab(body) {
    body.innerHTML = `<div class="g3-two"><div>
        <div class="gyx-card"><b>一个文件的：.vrm / .glb / .fbx</b><div class="gyx-tip">VRoid Hub（.vrm，最推荐：自带表情、口型、骨骼）· Sketchfab（下载选 glb）· Mixamo（fbx，带骨骼）</div><label class="gyx-btn">选文件<input type="file" accept=".vrm,.glb,.fbx,.gltf" style="display:none" onchange="gyx3dImpFile(this)"></label></div>
        <div class="gyx-card"><b>MMD 模型（.pmx / .pmd）</b><div class="gyx-tip">模之屋、bowlroll 下的那种：一个文件夹里有 .pmx 和一堆贴图。选整个文件夹（或者把文件夹里所有文件一起选上），贴图才找得到。</div><div class="gyx-row"><label class="gyx-btn">选文件夹<input type="file" webkitdirectory directory multiple style="display:none" onchange="gyx3dImpDir(this)"></label><label class="gyx-btn lite">选好几个文件<input type="file" multiple style="display:none" onchange="gyx3dImpDir(this)"></label></div></div>
        <div class="gyx-tip">⚠️ 用别人的模型前看一眼作者写的使用条款（能不能二次使用、能不能用在 AI 角色上）。模型只存在你这台设备的谷雨里，不会上传到哪里。太大的模型（几十 MB）手机上会卡。</div>
        <div id="g3ImpInfo"></div></div><div>${pvBox()}<div class="gyx-row"><input id="g3Name" class="gyx-who" placeholder="名字" value="${X.esc(IMP ? IMP.name : '')}">${useSel('g3Use')}<button class="gyx-btn" onclick="gyx3dSaveImp(this)" ${IMP ? '' : 'disabled'}>💾 存好</button></div></div></div>`;
    if (IMP) impPv();
}
const mb = n => (n / 1048576).toFixed(1) + ' MB';
function impPv() { const info = document.getElementById('g3ImpInfo'); if (info) info.innerHTML = `<div class="gyx-card">${X.esc(IMP.name)} · ${KIND[IMP.kind]} · ${mb(IMP.size)}</div>`; preview(G => G.build(Object.assign({ kind: IMP.kind }, IMP.heavy))); }
window.gyx3dImpFile = inp => { const f = inp.files && inp.files[0]; if (!f) return; const ext = f.name.split('.').pop().toLowerCase(); if (ext === 'gltf') return X.toast('.gltf 带外部文件', '请用 .glb（一个文件的那种），Blender 里导出时选 glTF Binary'); const kind = ext === 'vrm' ? 'vrm' : ext === 'fbx' ? 'fbx' : 'glb'; const r = new FileReader(); r.onload = () => { IMP = { kind, name: f.name.replace(/\.\w+$/, ''), size: f.size, heavy: { buf: r.result } }; importTab(document.getElementById('g3Body')); }; r.readAsArrayBuffer(f); };
window.gyx3dImpDir = async inp => {
    const fs = [...(inp.files || [])]; if (!fs.length) return; const main = fs.find(f => /\.pmx$/i.test(f.name)) || fs.find(f => /\.pmd$/i.test(f.name)); if (!main) return X.toast('里面没找到 .pmx', '选 MMD 模型所在的那个文件夹');
    const keep = fs.filter(f => /\.(pmx|pmd|png|jpe?g|bmp|tga|spa|sph|dds|gif|webp)$/i.test(f.name)); let size = 0; const files = {};
    await Promise.all(keep.map(f => new Promise(r => { const fr = new FileReader(); fr.onload = () => { files[(f.webkitRelativePath || f.name).replace(/^[^/]+\//, f.webkitRelativePath ? '' : '')] = fr.result; size += f.size; r(); }; fr.readAsArrayBuffer(f); })));
    const mk = (main.webkitRelativePath || main.name).replace(/^[^/]+\//, main.webkitRelativePath ? '' : '');
    IMP = { kind: 'pmx', name: main.name.replace(/\.\w+$/, ''), size, heavy: { files, main: mk } }; importTab(document.getElementById('g3Body'));
};
window.gyx3dSaveImp = async btn => { if (!IMP) return; btn.disabled = true; const name = (document.getElementById('g3Name') || {}).value || IMP.name; const use = (document.getElementById('g3Use') || {}).value; await saveModel({ kind: IMP.kind, name, size: IMP.size }, IMP.heavy, use); IMP = null; gyx3dOpen('mine'); };

// ---------- ⚙️ 用在哪 ----------
function setTab(body) {
    const opt = id => Object.keys(D.models).map(k => `<option value="${k}"${id === k ? ' selected' : ''}>${X.esc(D.models[k].name || k)}（${KIND[D.models[k].kind]}）</option>`).join('');
    body.innerHTML = `<div class="gyx-card"><b>谁用哪个小人</b>${X.chars().map(c => `<div class="gyx-row">${X.esc(X.name(c))}<select class="gyx-who" onchange="gyx3dSetWho('${X.esc(c.id)}',this.value)" style="flex:1"><option value="">（没有，用平面立绘 / 小屋里随机一个）</option>${opt(D.who[String(c.id)])}</select></div>`).join('')}
        <div class="gyx-row">我自己（小屋里）<select class="gyx-who" style="flex:1" onchange="gyx3dSetMe(this.value)"><option value="">（随机一个）</option>${opt(D.me)}</select></div></div>
        <div class="gyx-card"><b>🧸 桌面上的小 TA</b><div class="gyx-tip">在「🧸 桌面上的TA」里勾「用 3D 小人」就换成 3D 的；放到电脑桌面上（exe）也是 3D 的（要用新打包的桌面版）。</div><div class="gyx-row"><button class="gyx-btn lite" onclick="gyxPetOpen&&gyxPetOpen()">打开桌面上的TA 设置</button></div>
        <div class="gyx-row"><label><input type="checkbox" ${X.on('gyx3dPage') ? 'checked' : ''} onchange="X_set('gyx3dPage',this.checked)"> 你换页面时 TA 做个反应、说一句</label></div>
        <div class="gyx-row">多爱反应 <input type="range" min="0.1" max="1" step="0.05" value="${D.pageRate}" onchange="gyx3dCfg('pageRate',+this.value)"> 至少隔 <input class="gyx-who" type="number" min="5" value="${D.pageGap}" style="width:70px" onchange="gyx3dCfg('pageGap',+this.value)"> 秒</div>
        <div class="gyx-row"><label><input type="checkbox" ${D.chat ? 'checked' : ''} onchange="gyx3dCfg('chat',this.checked)"> 换页面时 TA 说的话也发进聊天</label></div></div>
        <div class="gyx-card"><b>🏠 3D 小屋</b><div class="gyx-tip">「我们的小屋」里点「🧊 进 3D 小屋」。</div><button class="gyx-btn lite" onclick="gyx3dRoomOpen&&gyx3dRoomOpen()">进 3D 小屋</button></div>`;
}
window.X_set = (id, v) => { X.set(id, v); };
window.gyx3dSetMe = v => { D.me = v; save(); };
window.gyx3dCfg = (k, v) => { D[k] = v; save(); };
window.gyx3dSetWho = (cid, mid) => { if (mid && D.models[mid]) D.who[String(cid)] = mid; else delete D.who[String(cid)]; save(); refreshPet(); };

// ===========================================================================
// 🧸 桌面上的小 TA（和「桌面上的TA」插件配合：那边勾了「用 3D 小人」就调这里）
// ===========================================================================
const PET = { cid: null, mid: null, st: null, av: null, el: null, busy: false };
function petOn() { return !!(PET.av && PET.st && PET.st.alive && document.body.contains(PET.st.canvas)); }
window.gyx3dHas = c => X.on('gyx3d') && !!modelOf(c);
window.gyx3dPetOn = petOn;
// 把 3D 小人装进一个格子（桌面小 TA 的那个圆）
window.gyx3dPetMount = async function (el, c, size) {
    const mid = modelOf(c); if (!mid || !el) return false;
    if (PET.el === el && PET.mid === mid && PET.cid === String(c.id) && petOn()) { return true; }
    if (PET.busy === mid + el.id) return true; PET.busy = mid + el.id;
    try {
        const G = await lib();
        if (PET.st) { try { PET.st.dispose(); } catch (e) {} }
        el.innerHTML = '<canvas class="g3-petc"></canvas>';
        const cv = el.firstChild;
        PET.st = new G.Stage(cv, { drag: false, fit: 1.08, shadow: true });
        const av = await buildAv(mid); PET.st.set(av); PET.av = av; PET.mid = mid; PET.cid = String(c.id); PET.el = el;
        petRoutine(true);
        return true;
    } catch (e) { console.warn('[3D 小人]', e); return false; } finally { PET.busy = false; }
};
window.gyx3dPetUnmount = () => { if (PET.st) { try { PET.st.dispose(); } catch (e) {} } PET.st = PET.av = PET.el = null; PET.mid = null; };
// 做动作（同时传给电脑桌面上的那个）
window.gyx3dPetAct = function (o) {
    o = o || {}; const act = actOf(o.act), face = faceOf(o.face);
    if (PET.av) { if (act) PET.av.play(act); if (face) PET.av.lockFace(face, 6); }
    try { if (window.gyDesk && window.gyDesk.petDo && window.__gyxPetDesk3d) window.gyDesk.petDo('act', { act, face }); } catch (e) {}
};
window.gyx3dPetTalk = t => { if (!PET.av) return; PET.av.talk(true); clearTimeout(PET.tt); PET.tt = setTimeout(() => PET.av && PET.av.talk(false), Math.min(6000, 600 + String(t || '').length * 150)); };
window.gyx3dMoodAct = (mood) => { const m = MOOD2[mood] || MOOD2['默认']; window.gyx3dPetAct({ act: m[0], face: m[1] }); };
// 给电脑桌面（exe）用：模型数据
window.gyx3dDeskDesc = async c => { const mid = modelOf(c); if (!mid) return null; const d = await descOf(mid); if (d && d.kind === 'chibi') return d; return d; };
window.gyx3dDeskKey = c => modelOf(c);
window.gyx3dThumb = c => { const mid = modelOf(c); return mid && D.models[mid] ? D.models[mid].thumb || '' : ''; };
function refreshPet() { try { window.gyxPetRefresh && window.gyxPetRefresh(); } catch (e) {} }
// 平时：按钟点换状态（深夜睡觉、饭点吃东西），偶尔伸个懒腰 / 东张西望
function petRoutine(now) {
    if (!PET.av) return; const h = new Date().getHours(), c = X.char(PET.cid);
    const st = (h >= 1 && h < 6) ? 'sleep' : ((h === 12 || h === 18) && new Date().getMinutes() < 30) ? 'eat' : 'idle';
    if (PET.av.state !== st) PET.av.setState(st === 'eat' ? 'idle' : st);
    if (!now && st === 'idle' && !PET.av.act && Math.random() < 0.3) PET.av.play(X.pick(['stretch', 'look', 'tilt', 'yawn', 'think', 'nod', 'look']));
}
setInterval(() => { if (X.on('gyx3d') && petOn() && !document.hidden) petRoutine(); }, 25000);
// 冒泡时张嘴；TA 发来消息时按语气做动作
let seenMsg = 0;
setInterval(() => {
    if (!X.on('gyx3d') || !petOn() || typeof globalChats === 'undefined') return;
    const H = globalChats[PET.cid] || [], m = H[H.length - 1]; if (!m || m.timestamp <= seenMsg) return; const first = !seenMsg; seenMsg = m.timestamp;
    if (first || m.sender === 'me' || m.sender === 'system' || m.gyx3d) return;
    const t = X.plain(m.text);
    const K = [['cheer', 'happy', /哈哈|嘿嘿|开心|太好了|好耶|笑死|耶/], ['cry', 'sad', /难过|伤心|哭|委屈|呜/], ['angry', 'angry', /生气|气死|哼|烦死|不理你/], ['shy', 'shy', /害羞|脸红|才没有|讨厌啦/], ['hug', 'happy', /抱抱|想你|想见你/], ['heart', 'shy', /爱你|喜欢你|亲亲/], ['poke', 'surprised', /什么[?？!！]|真的假的|天哪|居然/], ['yawn', 'closed', /困|晚安|睡了/], ['think', 'normal', /[?？]$/]];
    const hit = K.find(k => k[2].test(t)); window.gyx3dPetAct({ act: hit ? hit[0] : 'wave', face: hit ? hit[1] : 'happy' });
}, 2000);
// 换页面：TA 当场做个反应
let lastPage = 0, pageBusy = false;
async function onPage(name) {
    if (!name || !X.on('gyx3d') || !X.on('gyx3dPage') || !petOn() || pageBusy || document.hidden) return;
    if (Date.now() - lastPage < (D.pageGap || 60) * 1000 || Math.random() > (D.pageRate || 0.6)) return;
    lastPage = Date.now(); pageBusy = true;
    try {
        const c = X.char(PET.cid); if (!c) return;
        let j = null;
        if (X.bailu()) j = { say: X.cards(['桌宠', '聊天'], c, 1)[0] || '', act: X.pick(['look', 'tilt', 'nod', 'wave']) };
        else j = X.json(await X.ask(X.pl('3d.page', '', { who: X.who(c), recent: X.recent(c, 6) || '（还没聊）', page: name, acts: window.gyx3dActList(), faces: Object.keys(FACES).map(k => k + '(' + FACES[k] + ')').join(' / ') })));
        if (!j) { window.gyx3dPetAct({ act: X.pick(['look', 'tilt']) }); return; }
        window.gyx3dPetAct({ act: j.act, face: j.face });
        const say = X.plain(String(j.say || '')).slice(0, 40);
        if (say && window.gyxPetSay) { window.gyxPetSay(say); if (D.chat) X.say(c, say, { gyx3d: 1 }); }
    } finally { pageBusy = false; }
}
X.wrapFn('switchMainView', 'gyx3d', v => v, ctx => { try { const n = (typeof mobileViewTitles !== 'undefined' && mobileViewTitles[ctx]) || ''; if (n) onPage(n); } catch (e) {} });
// 新打开的插件页 / 小功能页也算
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType !== 1 || !n.classList || !n.classList.contains('gyx-ov') || n.id === 'gyx3dOv' || n.id === 'gyxPetOv') continue; const t = n.querySelector('.gyx-hd b'); if (t) onPage(t.textContent.trim()); } }).observe(document.body, { childList: true });

// 自主行动：TA 自己在你屏幕角落做个动作
X.action({ key: 'gyx_3d_act', label: '在她屏幕角落的 3D 小人身上做个动作给她看（跳舞、比心、伸懒腰……）', hint: '桌面上的 3D 小 TA', need: c => petOn() && PET.cid === String(c.id) && Date.now() - (PET.lastAuto || 0) > 15 * 60000,
    run: async c => { PET.lastAuto = Date.now(); const a = X.pick(['dance', 'heart', 'stretch', 'wave', 'cheer', 'spin', 'jump']); window.gyx3dPetAct({ act: a }); const t = X.bailu() ? (X.cards(['桌宠'], c, 1)[0] || '') : X.plain(await X.ask(`${X.who(c)}\n你是她屏幕角落里 3D 的小小的你，刚刚${ACTS[a]}了一下给她看。顺口说一句（15 字以内），只输出这句话。`) || ''); if (t && window.gyxPetSay) window.gyxPetSay(t.slice(0, 40)); return '在她屏幕角落' + ACTS[a] + '了一下' + (t ? '：' + t : ''); } }, 'gyx3d');
X.today(() => { const n = Object.keys(D.models).length; if (!n) return null; const rows = X.chars().filter(c => modelOf(c)).map(c => ({ t: '🧊', x: X.esc(X.name(c)) + ' 是「' + X.esc(D.models[modelOf(c)].name || '') + '」', go: "gyx3dOpen('mine')" })); return { title: '🧊 3D 小人', rows }; }, 'gyx3d');
X.widget('gyx3dW', { n: '3D 小人', sizes: ['s', 'm'], tap: () => window.gyx3dOpen(), r: w => { const c = X.cur(), mid = modelOf(c), m = mid && D.models[mid]; if (w.size === 's') return m && m.thumb ? `<div class="gw-x s"><img src="${m.thumb}" style="height:56px"><em>${X.esc(m.name || '')}</em></div>` : X.gw(w, '🧊', '3D 小人', ['去捏一个']); return X.gw(w, '🧊', '3D 小人', [m ? X.esc(X.name(c)) + '：' + X.esc(m.name || '') : '还没给 TA 捏', Object.keys(D.models).length + ' 个小人']); } }, 'gyx3d');
X.mem({ k: 'gyx3d', ico: '🧊', n: '3D 小人', d: '捏好 / 导入的 3D 小人（名字能改，删了就没了）', items: c => Object.values(D.models).filter(m => D.who[String(c.id)] === m.id), text: m => m.name || '', edit: (m, v) => { m.name = v; }, del: (c, i) => { const L = Object.values(D.models).filter(m => D.who[String(c.id)] === m.id), m = L[i]; if (m) delete D.who[String(c.id)]; }, meta: m => (KIND[m.kind] || '') + ' · ' + new Date(m.at || Date.now()).toLocaleDateString(), save }, 'gyx3d');
X.css('gyx3dCss', `
#gyx3dOv .gyx-box{width:min(1040px,100%);height:94vh;max-height:94vh}
.g3-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:14px;align-items:start}@media(max-width:760px){.g3-two{grid-template-columns:1fr}}
.g3-pv{position:sticky;top:56px;background:linear-gradient(#f6f3ff,#fff);border-radius:18px;padding:8px}.g3-pv canvas{width:100%;height:min(52vh,440px);display:block;touch-action:none;cursor:grab}
.g3-acts{display:flex;flex-wrap:wrap;gap:2px;justify-content:center}.g3-acts .gyx-chip{font-size:12px;padding:4px 9px}
.g3-opts h4{margin:12px 0 4px;font-size:13px;color:#666}.g3-col{display:inline-flex;align-items:center;gap:6px;font-size:13px;margin-right:10px}.g3-col input{width:34px;height:26px;border:none;background:none;padding:0}
.g3-sl{display:inline-flex;flex-direction:column;font-size:12px;color:#666;margin-right:10px}.g3-sl input{width:130px}
.g3-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.g3-card{background:#f7f7f9;border-radius:16px;padding:8px}.g3-th{height:170px;display:flex;align-items:center;justify-content:center;font-size:48px;cursor:pointer;background:#fff;border-radius:12px;margin-bottom:6px}.g3-th img{height:100%}
.g3-paint{background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/16px 16px;border-radius:14px;display:flex;justify-content:center;padding:8px}.g3-paint canvas{touch-action:none;cursor:crosshair;width:min(100%,460px);aspect-ratio:1;image-rendering:auto}
.g3-sw{display:inline-block;width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15);cursor:pointer}.g3-adv{background:#f7f7f9;border-radius:12px;padding:8px 12px;margin:6px 0}.g3-adv summary{cursor:pointer;font-size:13px;color:#666}.g3-sl b{font-weight:500;color:#333}
.g3-petc{width:100%;height:100%;display:block;pointer-events:none}
`);
X.mini({ id: 'gyx3d', icon: '🧊', title: '3D 小人', desc: '捏一个 Q 版低模小人 / 图片变 3D / 导入模型', onOpen: () => window.gyx3dOpen() });
(async () => { D = Object.assign(D, await S.get('cfg', {})); D.models = D.models || {}; D.who = D.who || {}; refreshPet(); })();
