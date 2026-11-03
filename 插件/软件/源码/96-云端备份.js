/* ☁️ 云端备份：用社区的钥匙，把整个谷雨（角色、聊天记录、记忆、设置、插件和小盒子的数据）备份到云端，换手机 / 清了数据用钥匙拉回来。
   · 先在这台设备上**加密**再上传（AES-GCM，密钥由你的钥匙算出来），服务器和群主都看不到里面是什么
   · 分块上传、每块校验；传完整了才替换旧的，云端留最近几份（群主定，默认 2 份）
   · 恢复前会先把这台设备现在的样子另存一份，恢复错了能「撤销」
   · 自动备份默认关：打开后每天最多一次
   · 钥匙丢了备份就解不开——这是加密的代价，所以一定要备份钥匙 */
if (window.__gysCloudBk) return; window.__gysCloudBk = 1;
const G = window.GYS, APP = 'cloudbk', esc = G.esc;
X.feat('gyCloudBk', { n: '☁️ 云端备份 · 每天自动备份', desc: '用社区钥匙把整个谷雨加密备份到云端，每天最多一次；关掉就只有你手动点「现在备份」', def: false, auto: true });
X.feat('gyCloudBkNag', { n: '☁️ 云端备份 · TA 提醒你备份', desc: '好几天没备份了，TA 会来提醒你一句' });
G.APPS.cloudbk = { n: '云端备份', ico: '☁️', feat: '' };

const LS = 'gyCloudBkS';
const rdS = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } };
let S = Object.assign({ last: 0, lastSize: 0, err: '', hist: [], img: true }, rdS());
const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} };
const gate = () => window.gyGate || { tok: '', url: '' };
const hasKey = () => !!(gate().tok && gate().url);
let BUSY = '', PROG = '', LIST = null, CFG = null;

/* ---------------- 网络 ---------------- */
async function api(path, body, tries) {
    const g = gate(); let last;
    for (let k = 0; k < (tries || 1); k++) {
        try {
            const r = await fetch(g.url.replace(/\/+$/, '') + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-Gy-Token': g.tok }, body: body ? JSON.stringify(body) : undefined });
            const j = await r.json(); if (!j.ok) { const e = new Error(j.err || '出错了'); e.hard = r.status < 500; throw e; } return j;
        } catch (e) { last = e; if (e.hard) break; await new Promise(r => setTimeout(r, 800 * (k + 1))); }
    }
    throw last;
}

/* ---------------- 加密 ---------------- */
const te = new TextEncoder(), td = new TextDecoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', te.encode(s)));
async function keyOf() {
    const t = gate().tok, i = t.indexOf('.'); if (i < 1) throw new Error('没有钥匙');
    const base = await crypto.subtle.importKey('raw', te.encode(t.slice(i + 1)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: te.encode('guyu-backup:' + t.slice(0, i)), iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const canGz = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
async function pipe(u8, Stream, kind) { const s = new Blob([u8]).stream().pipeThrough(new Stream(kind)); return new Uint8Array(await new Response(s).arrayBuffer()); }
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
async function seal(obj) {
    let u = te.encode(JSON.stringify(obj)); const raw = u.length;
    if (canGz) u = await pipe(u, CompressionStream, 'gzip');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyOf(), u));
    const out = new Uint8Array(13 + ct.length); out[0] = canGz ? 1 : 0; out.set(iv, 1); out.set(ct, 13);
    return { text: b64(out), raw };
}
async function open(text) {
    const u = unb64(text), gz = u[0] === 1, iv = u.subarray(1, 13), ct = u.subarray(13);
    let pt; try { pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await keyOf(), ct)); } catch (e) { throw new Error('解不开：这份备份不是用现在这把钥匙存的'); }
    if (gz) { if (!canGz) throw new Error('这台设备的浏览器太旧，解压不了，换个新一点的浏览器 / 更新系统 WebView 试试'); pt = await pipe(pt, DecompressionStream, 'gzip'); }
    return JSON.parse(td.decode(pt));
}

/* ---------------- 打包 / 恢复 ---------------- */
function noImg(v, d) {   // 不带图片：把很长的 data:image 换掉
    if (typeof v === 'string') return v.length > 30000 && /^data:(image|video|audio)\//.test(v) ? '' : v;
    if (!v || typeof v !== 'object' || d > 14) return v;
    if (Array.isArray(v)) return v.map(x => noImg(x, d + 1));
    const o = {}; for (const k of Object.keys(v)) o[k] = noImg(v[k], d + 1); return o;
}
async function pack(withImg) {
    if (typeof getFullDataSnapshot !== 'function') throw new Error('谷雨还没启动好');
    let data = getFullDataSnapshot(); let extra = null;
    try { extra = window.gyBackupExtraCollect ? await window.gyBackupExtraCollect() : null; } catch (e) { console.warn('[云端备份] 插件数据收集失败', e); }
    if (data && data.__gyExtra) delete data.__gyExtra;
    if (!withImg) { data = noImg(data, 0); extra = noImg(extra, 0); }
    const chars = (typeof myCharacters !== 'undefined' ? myCharacters : []).length;
    const msgs = typeof globalChats !== 'undefined' ? Object.values(globalChats).reduce((n, a) => n + (Array.isArray(a) ? a.length : 0), 0) : 0;
    return { obj: { app: 'guyu', v: 1, at: Date.now(), ver: window.GY_VERSION || 0, data, extra }, meta: { ver: window.GY_VERSION || 0, chars, msgs, img: !!withImg, dev: devName() } };
}
function devName() { const u = navigator.userAgent; return /Android/.test(u) ? (window.plus ? '安卓 App' : '安卓浏览器') : /iPhone|iPad/.test(u) ? '苹果' : /Electron/.test(u) ? '电脑桌面版' : /Windows|Mac|Linux/.test(u) ? '电脑浏览器' : '其它'; }
const PRE = typeof localforage !== 'undefined' && localforage.createInstance ? localforage.createInstance({ name: 'gyCloudPre', storeName: 'kv' }) : null;
async function apply(obj) {
    if (!obj || obj.app !== 'guyu' || !obj.data) throw new Error('这不是谷雨的备份');
    const keep = localStorage.getItem('gyGate');   // 钥匙用现在这把，别被备份里的旧设置盖掉
    const run = async () => { await localforage.setItem('myTwitterAppData', obj.data); await loadAllData(); };
    if (typeof gyHoldSaves === 'function') await gyHoldSaves(run); else await run();
    if (obj.extra && window.gyBackupExtraRestore) { try { await window.gyBackupExtraRestore(obj.extra); } catch (e) { console.warn('[云端备份] 插件数据写回失败', e); } }
    try { if (keep) localStorage.setItem('gyGate', keep); localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {}
}

/* ---------------- 备份 ---------------- */
async function backup(quiet) {
    if (BUSY) return; if (!hasKey()) { if (!quiet) X.toast('还没有钥匙', '先在开屏登录或 🌱 社区里登录'); return; }
    BUSY = 'up'; PROG = '打包中…'; G.repaint(APP);
    try {
        const { obj, meta } = await pack(S.img !== false);
        PROG = '加密中…'; G.repaint(APP);
        const { text, raw } = await seal(obj); meta.raw = raw;
        const P = 900000, parts = Math.ceil(text.length / P);
        const bg = await api('/bk/begin', { size: text.length, parts, hash: await sha(text), note: meta.dev, meta }, 2);
        for (let i = 0; i < parts; i++) {
            const d = text.slice(i * P, (i + 1) * P);
            PROG = `上传中 ${i + 1}/${parts}`; G.repaint(APP);
            await api('/bk/part', { bid: bg.id, i, data: d, sha: await sha(d) }, 4);
        }
        await api('/bk/commit', { bid: bg.id }, 3);
        S.last = Date.now(); S.lastSize = text.length; S.err = ''; S.hist.unshift({ at: S.last, size: text.length, img: meta.img, dev: meta.dev, ok: 1 }); S.hist = S.hist.slice(0, 30); save();
        LIST = null; if (!quiet) X.toast('☁️ 备份好了', fmt(text.length) + (meta.img ? '' : '（没带图片）'));
    } catch (e) {
        S.err = e.message || String(e); S.hist.unshift({ at: Date.now(), err: S.err }); S.hist = S.hist.slice(0, 30); save();
        if (!quiet) X.toast('备份没成功', S.err + '（云端原来的备份没动）');
    } finally { BUSY = ''; PROG = ''; G.repaint(APP); }
}
const fmt = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

/* ---------------- 恢复 ---------------- */
async function fetchOne(b) {
    let text = '';
    for (let i = 0; i < b.parts; i++) {
        PROG = `下载中 ${i + 1}/${b.parts}`; G.repaint(APP);
        const r = await api(`/bk/get?bid=${b.id}&i=${i}`, null, 4);
        if (await sha(r.data) !== r.sha) throw new Error('下载下来的数据坏了，再试一次');
        text += r.data;
    }
    if (b.hash && await sha(text) !== b.hash) throw new Error('下载下来的数据对不上，再试一次');
    PROG = '解密中…'; G.repaint(APP);
    return open(text);
}
async function restore(b) {
    if (BUSY) return;
    const m = b.meta || {};
    const ok = await G.confirm(`用这份云端备份恢复？\n${new Date(b.at).toLocaleString('zh-CN')} · ${esc(b.note || '')} · ${fmt(b.size)}${m.chars != null ? `\n${m.chars} 个角色 · ${m.msgs} 条聊天` : ''}${m.img === false ? '\n⚠️ 这份没带图片，恢复后头像、照片这些会是空的' : ''}\n\n这台设备现在的数据会被换掉（会先另存一份，恢复错了可以撤销）。`);
    if (!ok) return;
    BUSY = 'down'; G.repaint(APP);
    try {
        const obj = await fetchOne(b);
        PROG = '先存一份现在的…'; G.repaint(APP);
        if (PRE) { try { const cur = await pack(true); await PRE.setItem('pre', { at: Date.now(), obj: cur.obj }); } catch (e) { console.warn('[云端备份] 另存当前数据失败', e); if (!(await G.confirm('没能先另存现在的数据（可能空间不够）。还要继续恢复吗？\n继续的话，现在的数据就找不回来了。'))) return; } }
        PROG = '恢复中…'; G.repaint(APP);
        await apply(obj);
        S.hist.unshift({ at: Date.now(), restore: b.at }); save();
        await G.confirm('恢复好了。\n刷新一下所有东西才会换成备份里的样子。') ; (window.refreshAppPage || (() => location.reload()))();
    } catch (e) { X.toast('恢复没成功', e.message || String(e)); }
    finally { BUSY = ''; PROG = ''; G.repaint(APP); }
}
async function undo() {
    const p = PRE && await PRE.getItem('pre'); if (!p) return X.toast('没有可以撤销的', '');
    if (!(await G.confirm(`撤销上一次恢复？\n回到 ${new Date(p.at).toLocaleString('zh-CN')} 恢复之前的样子。`))) return;
    try { await apply(p.obj); await PRE.removeItem('pre'); (window.refreshAppPage || (() => location.reload()))(); } catch (e) { X.toast('撤销没成功', e.message); }
}

/* ---------------- 页面 ---------------- */
async function load() { try { const j = await api('/bk/list', null, 2); LIST = j.list; CFG = j; } catch (e) { LIST = []; CFG = { err: e.message }; } G.repaint(APP); }
const ago = t => t ? G.ago(t) : '还没有';
function page() {
    if (!hasKey()) return `<div class="cm-lt">云端备份</div><div class="cm-grp cm-pad"><p>还没有钥匙。</p><small>云端备份用的是社区的钥匙：在开屏登录页登录，或者 📱 软件 → 🌱 社区 里加入，就有了。</small></div>`;
    if (LIST == null) { load(); return '<div class="gys-busy">⏳</div>'; }
    const on = X.on('gyCloudBk');
    return `<div class="cm-lt">云端备份</div>
      ${BUSY ? `<div class="cm-grp cm-pad"><p>⏳ ${esc(PROG || '…')}</p><small>别关谷雨，传完自己会好</small></div>` : `<div class="cm-btn" onclick="gysCloudBk.now()">☁️ 现在备份</div>`}
      ${S.err ? `<div class="cm-foot" style="color:#ff3b30">上次没成功：${esc(S.err)}</div>` : ''}
      <div class="cm-gh">云端的备份（最多留 ${CFG && CFG.keep || 2} 份）</div>
      <div class="cm-grp">${(LIST || []).map(b => { const m = b.meta || {}; return `<div class="cm-r" onclick="gysCloudBk.pick('${b.id}')"><div class="t"><b>${new Date(b.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</b><small>${esc(b.note || '')} · ${fmt(b.size)}${m.chars != null ? ` · ${m.chars} 个角色 · ${m.msgs} 条聊天` : ''}${m.img === false ? ' · 没带图片' : ''}</small></div><span class="chev">›</span></div>`; }).join('') || `<div class="cm-r"><div class="t"><small>${CFG && CFG.err ? '连不上：' + esc(CFG.err) : '还没有备份'}</small></div></div>`}</div>
      <div class="cm-gh">设置</div>
      <div class="cm-grp">
        <div class="cm-r" onclick="gysCloudBk.auto()"><div class="t"><b>每天自动备份</b><small>${on ? '开着 · 上次 ' + ago(S.last) : '关着'}</small></div><span>${on ? '✅' : '⬜'}</span></div>
        <div class="cm-r" onclick="gysCloudBk.img()"><div class="t"><b>带上图片</b><small>${S.img !== false ? '带着（头像、照片、表情包都在，备份会大一些）' : '不带（小很多，但恢复后图片是空的）'}</small></div><span>${S.img !== false ? '✅' : '⬜'}</span></div>
        <div class="cm-r" onclick="gysCloudBk.key()"><div class="t"><b>备份我的钥匙</b><small>钥匙丢了，云端的备份谁都解不开</small></div><span class="chev">›</span></div>
        <div class="cm-r" onclick="gysCloudBk.undo()"><div class="t"><b>撤销上一次恢复</b><small>恢复前另存的那一份</small></div><span class="chev">›</span></div>
      </div>
      <div class="cm-foot">· 备份在这台设备上<b>先加密</b>才上传，服务器和群主都看不到内容；只有你的钥匙能解开。<br>· 备份里有你填的 API Key，所以钥匙千万别给别人。<br>· 传到一半断了，云端原来的备份不会被动；传完整了才换掉旧的。<br>· 换手机：新手机上用钥匙登录 → 这里点一份 → 恢复。</div>`;
}
G.app(APP, { head: () => `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('${APP}')">${G.ic('back', 22)}</span><b></b></div>`, render: () => page() });
const C = window.gysCloudBk = {};
window.gysCloudBkOpen = () => { LIST = null; G.open(APP); };
C.now = () => backup(false);
C.auto = () => { X.set('gyCloudBk', !X.on('gyCloudBk')); G.repaint(APP); };
C.img = () => { S.img = S.img === false; save(); G.repaint(APP); };
C.undo = () => undo();
C.key = async () => { const g = gate(), v = g.url + '#' + g.tok; try { await navigator.clipboard.writeText(v); X.toast('钥匙复制了', '存到别的地方（备忘录、记事本），别给别人'); } catch (e) { await G.input('你的钥匙（存好，别给别人）', v); } };
C.pick = async id => { const b = (LIST || []).find(x => x.id === id); if (!b) return; const i = await G.sheet(['⤵️ 用这份恢复', '🗑 删掉这份'], new Date(b.at).toLocaleString('zh-CN')); if (i === 0) restore(b); else if (i === 1 && await G.confirm('删掉这份云端备份？删了就没了。')) { try { await api('/bk/del', { bid: id }); load(); } catch (e) { X.toast('没删掉', e.message); } } };
C.__state = () => ({ S, LIST, BUSY });   /* 测试用 */
C.__pack = pack; C.__seal = seal; C.__open = open; C.__on = () => X.on('gyCloudBk');

/* ---------------- 自动备份 ---------------- */
setInterval(() => { if (!X.on('gyCloudBk') || !hasKey() || BUSY || document.hidden) return; if (Date.now() - (S.last || 0) < 20 * 3600e3) return; if (S.err && Date.now() - ((S.hist[0] || {}).at || 0) < 3600e3) return; backup(true); }, 5 * 60e3);
// 换了设备：刚用钥匙登录、本地又没什么东西 → 问要不要从云端拉回来
async function offer() {
    if (!hasKey()) return; const n = typeof myCharacters !== 'undefined' ? myCharacters.length : 0; if (n > 1 || S.offered === gate().tok) return;
    try { const j = await api('/bk/list'); S.offered = gate().tok; save(); if (!j.list.length) return; const b = j.list[0]; LIST = j.list; CFG = j; if (await G.confirm(`云端有你的备份\n${new Date(b.at).toLocaleString('zh-CN')} · ${esc(b.note || '')} · ${fmt(b.size)}\n要恢复到这台设备上吗？`)) restore(b); } catch (e) {}
}
window.addEventListener('gy-gate-login', () => setTimeout(offer, 1500));
G.ready().then(() => setTimeout(offer, 4000));

/* ---------------- 接进去：小功能、今天、小组件、自主行动、记忆总览 ---------------- */
X.mini({ id: 'gyCloudBkApp', icon: '☁️', title: '云端备份', desc: '用社区钥匙把整个谷雨加密备份到云端，换手机拉回来', cat: '软件', onOpen: () => window.gysCloudBkOpen() });
const daysSince = () => S.last ? Math.floor((Date.now() - S.last) / 864e5) : null;
X.today(() => { if (!hasKey()) return null; const d = daysSince(); if (!X.on('gyCloudBk') && d != null && d < 7) return null; return { title: '☁️ 云端备份', rows: [{ t: '上次', x: d == null ? '还没备份过' : d === 0 ? '今天' : d + ' 天前', go: X.go('gysCloudBkOpen') }] }; });
X.widget('gyCloudBkW', { n: '云端备份', sizes: ['s'], tap: () => window.gysCloudBkOpen(), r: () => `<div style="padding:10px;font-size:12px;line-height:1.6"><b style="color:#007aff">☁️ 云端备份</b><br>${!hasKey() ? '还没有钥匙' : BUSY ? esc(PROG || '…') : '上次 ' + ago(S.last)}</div>` });
X.action({ key: 'gys_cloudbk_nag', label: '提醒她备份一下（好几天没备份了）', hint: '她的谷雨已经好几天没备份了', need: () => hasKey() && (daysSince() == null || daysSince() >= 7) && Date.now() - (S.nagAt || 0) > 5 * 864e5, run: async c => { S.nagAt = Date.now(); save(); const d = daysSince(); const ok = await X.reach(c, `她的谷雨${d == null ? '从来没' : '已经 ' + d + ' 天没'}做过云端备份了。提醒她备份一下（设置里的「☁️ 云端备份」），别哪天换手机你们的东西就没了；按你的性格说，一两句就好`); return ok ? { text: '提醒她做云端备份', jump: X.go('gysCloudBkOpen') } : null; } }, 'gyCloudBkNag');
X.mem({ k: 'gyCloudBkHist', ico: '☁️', n: '云端备份记录', d: '什么时候备份过、恢复过（只是记录，删了不影响云端的备份）', items: () => S.hist, text: x => x.err ? '没成功：' + x.err : x.restore ? '从 ' + new Date(x.restore).toLocaleString('zh-CN') + ' 的备份恢复' : '备份了 ' + fmt(x.size || 0) + (x.img === false ? '（没带图片）' : '') + ' · ' + (x.dev || ''), del: (c, i) => { S.hist.splice(i, 1); }, meta: x => G.ago(x.at), save: () => save() });

// 设置 → 数据 里放个入口
function mount() {
    const btn = document.querySelector('#setPanel-data button[onclick="exportData()"]'); if (!btn || document.getElementById('gyCloudBkRow')) return;
    const box = btn.closest('.input-group'); if (!box) return;
    box.insertAdjacentHTML('afterbegin', `<div id="gyCloudBkRow" style="margin-bottom:12px"><button class="btn" style="width:100%" onclick="gysCloudBkOpen()">☁️ 云端备份（用社区钥匙，换手机拉回来）</button></div>`);
}
mount(); setInterval(mount, 3000);
X.css('gys-cloudbk-css', `.gys-cloudbk{--cb:#f2f2f7;--cc:#fff;--ct:#000;--cs:#8e8e93;--cl:rgba(60,60,67,.18);--cf:rgba(120,120,128,.12);--ck:#007aff;background:var(--cb);color:var(--ct)}body.dark-theme .gys-cloudbk{--cb:#000;--cc:#1c1c1e;--ct:#fff;--cl:rgba(84,84,88,.6);--cf:rgba(120,120,128,.24)}.gys-cloudbk .gys-hd{background:var(--cb);border:0}`);
