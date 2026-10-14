/* 🫧 气泡工坊：自己做聊天气泡——你的、TA 的分开调：底色、字色、圆角、描边、阴影、背景图、透明度；头像显示与否、形状、大小、贴顶还是贴底；字号、行距、气泡最宽多宽、消息之间的间距。边调边看预览，存成一套套主题；每个角色可以用不一样的一套。TA 也会偷偷给你配一套 */
if (window.__gyxBubble) return; window.__gyxBubble = 1;
X.feat('gyxBubble', { n: '🫧 气泡工坊', desc: '自己做聊天气泡：颜色、圆角、背景图、头像、字号行距；每个角色能用不一样的' });
const S = X.store('bubble');
const BASE = { me: { bg: '#1d9bf0', fg: '#ffffff', r: 18, bw: 0, bc: '#dddddd', sh: 0, img: '', op: 1 }, ta: { bg: '#f2f2f4', fg: '#1d1d1f', r: 18, bw: 0, bc: '#dddddd', sh: 0, img: '', op: 1 }, av: 'show', avShape: 'circle', avSize: 40, avAlign: 'top', fs: 15, lh: 1.55, maxw: 75, gap: 10, pad: 10 };
const PRE = {
    cream: ['奶油', { me: { bg: '#ffd8a8', fg: '#5a3a1a', r: 20 }, ta: { bg: '#fff7ec', fg: '#5a3a1a', r: 20, bw: 1, bc: '#f3dcc0' } }],
    mint: ['薄荷', { me: { bg: '#7fd8be', fg: '#073b2f', r: 16 }, ta: { bg: '#effaf6', fg: '#1d3b33', r: 16 } }],
    night: ['夜空', { me: { bg: '#5b5fef', fg: '#fff', r: 22, sh: 6 }, ta: { bg: '#23233a', fg: '#e8e8ff', r: 22, sh: 6 } }],
    paper: ['纸条', { me: { bg: '#fffef6', fg: '#333', r: 4, bw: 1, bc: '#d9d2b8', sh: 2 }, ta: { bg: '#fffef6', fg: '#333', r: 4, bw: 1, bc: '#d9d2b8', sh: 2 }, avShape: 'square' }],
    jelly: ['果冻', { me: { bg: '#ff8fb1', fg: '#fff', r: 26, sh: 8 }, ta: { bg: '#a0c4ff', fg: '#fff', r: 26, sh: 8 }, avShape: 'circle' }],
    mono: ['黑白', { me: { bg: '#111', fg: '#fff', r: 12 }, ta: { bg: '#fff', fg: '#111', r: 12, bw: 1, bc: '#111' }, av: 'hide' }]
};
let D = { on: '', themes: [], per: {}, cur: null };   // themes: {id,n,by,at,line,cfg}；on：现在用哪套（'' = 不改）；per[cid] = themeId
const saveD = () => S.set('d', D);
const merge = c => { const o = JSON.parse(JSON.stringify(BASE)); if (!c) return o; ['me', 'ta'].forEach(k => Object.assign(o[k], c[k] || {})); Object.keys(c).forEach(k => { if (k !== 'me' && k !== 'ta') o[k] = c[k]; }); return o; };
const theme = id => D.themes.find(t => t.id === id);
function cssFor(c, root) {
    const side = (k, sel) => { const s = c[k]; return `${root} ${sel}{background:${s.img ? `url("${s.img}") center/cover, ` : ''}${s.bg}!important;color:${s.fg}!important;border-radius:${s.r}px!important;border:${s.bw}px solid ${s.bc}!important;box-shadow:${s.sh ? `0 ${Math.round(s.sh / 2)}px ${s.sh * 2}px rgba(0,0,0,.18)` : 'none'}!important;opacity:${s.op}!important;font-size:${c.fs}px!important;line-height:${c.lh}!important;padding:${c.pad}px ${Math.round(c.pad * 1.4)}px!important}`; };
    const shape = c.avShape === 'circle' ? '50%' : c.avShape === 'square' ? '4px' : '12px';
    return side('me', '.chat-bubble.me') + side('ta', '.chat-bubble.other') +
        `${root} .chat-bubble-wrapper{max-width:${c.maxw}%!important}${root} .chat-msg-row{margin-bottom:${c.gap}px!important;align-items:${c.avAlign === 'bottom' ? 'flex-end' : 'flex-start'}!important}` +
        (c.av === 'hide' ? `${root} .chat-msg-row>div:not(.chat-bubble-wrapper){display:none!important}` : `${root} .chat-msg-row>div:not(.chat-bubble-wrapper) .avatar{width:${c.avSize}px!important;height:${c.avSize}px!important;border-radius:${shape}!important;min-width:${c.avSize}px!important}${root} .chat-msg-row>div:not(.chat-bubble-wrapper) .avatar img{border-radius:${shape}!important}`);
}
function active() { let sid = null; try { sid = typeof currentChatSessionId !== 'undefined' ? currentChatSessionId : null; } catch (e) {} const id = (sid && D.per[String(sid)]) || D.on; return id ? theme(id) : null; }
let lastCss = null;
function apply() {
    const t = X.on('gyxBubble') ? active() : null; const css = t ? cssFor(merge(t.cfg), 'html body #view-chat') : '';
    if (css === lastCss) return; lastCss = css;
    let st = document.getElementById('gyxBwLive'); if (!st) { st = document.createElement('style'); st.id = 'gyxBwLive'; document.head.appendChild(st); } st.textContent = css;
}
/* 编辑器 */
let ED = null;   // 正在改的 {id?, n, cfg}
const prev = () => { const st = document.getElementById('gyxBwPrevCss'); if (st && ED) st.textContent = cssFor(merge(ED.cfg), '#gyxBwPrev'); };
window.gyxBubbleSet = (path, v) => { if (!ED) return; const p = path.split('.'); let o = ED.cfg; if (p.length === 2) { ED.cfg[p[0]] = Object.assign({}, merge(ED.cfg)[p[0]], ED.cfg[p[0]] || {}); o = ED.cfg[p[0]]; } o[p[p.length - 1]] = /^-?\d+(\.\d+)?$/.test(String(v)) ? +v : v; prev(); };
window.gyxBubbleImg = (side, inp) => { const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { window.gyxBubbleSet(side + '.img', r.result); }; r.readAsDataURL(f); };
window.gyxBubbleEdit = id => { const t = id && theme(id); ED = t ? { id: t.id, n: t.n, cfg: JSON.parse(JSON.stringify(t.cfg)) } : { n: '我的气泡', cfg: {} }; window.gyxBubbleOpen('edit'); };
window.gyxBubblePre = k => { ED = { n: PRE[k][0], cfg: JSON.parse(JSON.stringify(PRE[k][1])) }; window.gyxBubbleOpen('edit'); };
window.gyxBubbleSave = async (use) => { if (!ED) return; ED.n = ((document.getElementById('gyxBwN') || {}).value || ED.n).trim() || '我的气泡'; let t = ED.id && theme(ED.id); if (t) { t.n = ED.n; t.cfg = ED.cfg; } else { t = { id: 'bw' + Date.now().toString(36), n: ED.n, by: 'me', at: Date.now(), cfg: ED.cfg }; D.themes.unshift(t); ED.id = t.id; } if (use) D.on = t.id; await saveD(); lastCss = null; apply(); X.toast(X.v('存好了', '🫧 这套气泡存下了', '✓'), t.n + (use ? '（已经用上）' : '')); window.gyxBubbleOpen(); };
window.gyxBubbleUse = async (id, cid) => { if (cid) { if (id) D.per[cid] = id; else delete D.per[cid]; } else D.on = id || ''; await saveD(); lastCss = null; apply(); window.gyxBubbleOpen(); };
window.gyxBubbleDel = async id => { D.themes = D.themes.filter(t => t.id !== id); if (D.on === id) D.on = ''; Object.keys(D.per).forEach(k => { if (D.per[k] === id) delete D.per[k]; }); await saveD(); lastCss = null; apply(); window.gyxBubbleOpen(); };
const row = (lab, html) => `<div class="bw-r"><span>${lab}</span>${html}</div>`;
const rng = (path, v, a, b, st) => `<input type="range" min="${a}" max="${b}" step="${st || 1}" value="${v}" oninput="gyxBubbleSet('${path}',this.value)">`;
const col = (path, v) => `<input type="color" value="${v}" oninput="gyxBubbleSet('${path}',this.value)">`;
const sel = (path, v, opts) => `<select class="gyx-who" onchange="gyxBubbleSet('${path}',this.value)">${opts.map(([k, n]) => `<option value="${k}"${k === v ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
window.gyxBubbleOpen = function (tab) {
    const c = X.cur(); const cid = c ? String(c.id) : '';
    if (tab === 'edit' && ED) {
        const m = merge(ED.cfg), side = k => `<div class="bw-side"><b>${k === 'me' ? '你的气泡' : 'TA 的气泡'}</b>${row('底色', col(k + '.bg', m[k].bg))}${row('字色', col(k + '.fg', m[k].fg))}${row('圆角', rng(k + '.r', m[k].r, 0, 30))}${row('描边', rng(k + '.bw', m[k].bw, 0, 4))}${row('描边色', col(k + '.bc', m[k].bc))}${row('阴影', rng(k + '.sh', m[k].sh, 0, 12))}${row('透明度', rng(k + '.op', m[k].op, .4, 1, .05))}${row('背景图', `<label class="gyx-chip">选图<input type="file" accept="image/*" style="display:none" onchange="gyxBubbleImg('${k}',this)"></label><span class="gyx-chip" onclick="gyxBubbleSet('${k}.img','')">不要</span>`)}</div>`;
        X.panel('gyxBwOv', '🫧 气泡工坊', `<style id="gyxBwPrevCss"></style><div id="gyxBwPrev" class="bw-prev"><div class="chat-msg-row other"><div><div class="avatar bw-av">TA</div></div><div class="chat-bubble-wrapper" style="align-items:flex-start"><div class="chat-bubble other">今天想吃什么？我请你。</div></div></div><div class="chat-msg-row me"><div class="chat-bubble-wrapper" style="align-items:flex-end"><div class="chat-bubble me">想吃火锅！还要冰粉</div></div><div><div class="avatar bw-av">我</div></div></div><div class="chat-msg-row other"><div><div class="avatar bw-av">TA</div></div><div class="chat-bubble-wrapper" style="align-items:flex-start"><div class="chat-bubble other">好，那就火锅。</div></div></div></div>
            <input id="gyxBwN" class="gyx-in" value="${X.esc(ED.n)}" placeholder="给这套起个名字">
            <div class="bw-grid">${side('me')}${side('ta')}</div>
            <div class="bw-side"><b>头像和排版</b>${row('头像', sel('av', m.av, [['show', '显示'], ['hide', '不显示']]))}${row('形状', sel('avShape', m.avShape, [['circle', '圆'], ['round', '圆角方'], ['square', '方']]))}${row('大小', rng('avSize', m.avSize, 24, 60))}${row('对齐', sel('avAlign', m.avAlign, [['top', '贴顶'], ['bottom', '贴底']]))}${row('字号', rng('fs', m.fs, 12, 20))}${row('行距', rng('lh', m.lh, 1.2, 2, .05))}${row('最宽', rng('maxw', m.maxw, 50, 95))}${row('间距', rng('gap', m.gap, 2, 24))}${row('内边距', rng('pad', m.pad, 4, 18))}</div>
            <div class="gyx-row"><button class="gyx-btn" onclick="gyxBubbleSave(true)">存好并用上</button><button class="gyx-btn lite" onclick="gyxBubbleSave(false)">只存</button><button class="gyx-btn lite" onclick="gyxBubbleOpen()">不改了</button></div>`, 'gyx-bw');
        prev(); return;
    }
    X.panel('gyxBwOv', '🫧 气泡工坊', `<div class="gyx-tip">现在全局用：<b>${D.on ? X.esc((theme(D.on) || {}).n || '') : '谷雨默认'}</b>${c ? `；${X.esc(X.name(c))} 单独用：<b>${D.per[cid] ? X.esc((theme(D.per[cid]) || {}).n || '') : '跟全局'}</b>` : ''}</div>
        <div class="gyx-row"><button class="gyx-btn" onclick="gyxBubbleEdit()">＋ 自己做一套</button>${D.on ? `<button class="gyx-btn lite" onclick="gyxBubbleUse('')">用回默认</button>` : ''}</div>
        <div class="gyx-tip">从这几套改起：</div><div class="gyx-row">${Object.entries(PRE).map(([k, [n]]) => `<span class="gyx-chip" onclick="gyxBubblePre('${k}')">${n}</span>`).join('')}</div>
        ${D.themes.map(t => { const m = merge(t.cfg); return `<div class="gyx-card bw-it"><span class="bw-sw" style="background:${m.ta.bg};border-radius:${m.ta.r}px"></span><span class="bw-sw" style="background:${m.me.bg};border-radius:${m.me.r}px"></span><div style="flex:1;min-width:0"><b>${X.esc(t.n)}</b>${t.by !== 'me' ? ` <span class="gyx-tip">${X.esc(X.name(X.char(t.by)))} 配的${t.line ? '：' + X.esc(t.line) : ''}</span>` : ''}<div class="gyx-row"><span class="gyx-chip ${D.on === t.id ? 'on' : ''}" onclick="gyxBubbleUse('${t.id}')">全局用</span>${c ? `<span class="gyx-chip ${D.per[cid] === t.id ? 'on' : ''}" onclick="gyxBubbleUse(${D.per[cid] === t.id ? "''" : `'${t.id}'`},'${cid}')">只给 ${X.esc(X.name(c))}</span>` : ''}<span class="gyx-chip" onclick="gyxBubbleEdit('${t.id}')">改</span><span class="gyx-chip" onclick="gyxBubbleDel('${t.id}')">删</span></div></div></div>`; }).join('')}`);
};
window.gyxBubbleData = () => D;
window.gyxBubbleCss = () => lastCss;
async function taMake(c) {
    const r = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n你在偷偷给她的聊天界面配一套气泡颜色（她的气泡、你的气泡），按你对她的印象和你们最近的感觉来。输出 JSON：{"n":"给这套起名（6 字以内）","me":"她的气泡底色 #hex","meFg":"她的字色 #hex","ta":"你的气泡底色 #hex","taFg":"你的字色 #hex","r":圆角 4~26,"line":"一句话说为什么这么配（20 字以内）"}`));
    const hex = v => /^#[0-9a-f]{6}$/i.test(String(v || '')) ? v : null;
    const p = r && hex(r.me) && hex(r.ta) ? { me: { bg: r.me, fg: hex(r.meFg) || '#fff', r: +r.r || 18 }, ta: { bg: r.ta, fg: hex(r.taFg) || '#111', r: +r.r || 18 } } : JSON.parse(JSON.stringify(PRE[X.pick(Object.keys(PRE))][1]));
    const t = { id: 'bw' + Date.now().toString(36), n: X.plain((r && r.n) || 'TA 配的').slice(0, 10), by: String(c.id), at: Date.now(), line: X.plain((r && r.line) || '').slice(0, 30), cfg: p };
    D.themes.unshift(t); D.per[String(c.id)] = t.id; await saveD(); lastCss = null; apply(); return t;
}
window.gyxBubbleTa = id => taMake(X.char(id) || X.cur());
X.action({ key: 'gyx_bubble', label: '偷偷给她的聊天气泡配一套颜色', hint: '她下次跟你聊天就能看到', need: c => !D.themes.some(t => t.by === String(c.id) && Date.now() - t.at < 7 * 864e5),
    run: async c => { const t = await taMake(c); X.notify(c, `🫧 ${X.esc(X.name(c))} ${X.v('给你们的聊天换了一套气泡', '偷偷改了气泡颜色', '配了一套气泡')}「${X.esc(t.n)}」`, t.line, () => window.gyxBubbleOpen()); return (await X.reach(c, `你偷偷给你们的聊天界面换了一套气泡颜色「${t.n}」${t.line ? '（' + t.line + '）' : ''}，问她喜不喜欢，或者等她自己发现`)) ? '换了一套气泡：' + t.n : null; } }, 'gyxBubble');
X.today(() => ({ title: '🫧 气泡', rows: D.themes.filter(t => t.by !== 'me' && X.day(new Date(t.at)) === X.day()).map(t => ({ t: X.esc(X.name(X.char(t.by))), x: `配了「${X.esc(t.n)}」${t.line ? '：' + X.esc(t.line) : ''}`, go: 'gyxBubbleOpen()' })) }), 'gyxBubble');
X.widget('gyxBubbleW', { n: '气泡工坊', sizes: ['s', 'm'], tap: () => window.gyxBubbleOpen(), r: w => { const t = active() || theme(D.on), m = merge(t && t.cfg); return w.size === 's' ? `<div class="gw-x s"><b>🫧</b><em>${X.esc(t ? t.n : '默认')}</em></div>` : `<div class="gw-x m bw-w"><span style="background:${m.ta.bg};color:${m.ta.fg};border-radius:${m.ta.r}px">在干嘛</span><span class="me" style="background:${m.me.bg};color:${m.me.fg};border-radius:${m.me.r}px">想你</span><em>${X.esc(t ? t.n : '谷雨默认')}</em></div>`; } }, 'gyxBubble');
X.mem({ k: 'gyxBubble', ico: '🫧', n: 'TA 配的气泡', d: 'TA 给你配的气泡颜色，和为什么这么配', items: c => D.themes.filter(t => t.by === String(c.id)), text: t => t.n + (t.line ? '｜' + t.line : ''), edit: (t, v) => { const p = String(v).split('｜'); t.n = p[0].slice(0, 10); t.line = p.slice(1).join('｜'); }, del: (c, i) => { const t = D.themes.filter(x => x.by === String(c.id))[i]; if (!t) return; D.themes = D.themes.filter(x => x !== t); if (D.on === t.id) D.on = ''; Object.keys(D.per).forEach(k => { if (D.per[k] === t.id) delete D.per[k]; }); lastCss = null; apply(); }, meta: t => new Date(t.at).toLocaleString(), save: saveD }, 'gyxBubble');
X.css('gyxBwCss', `.gyx-bw .gyx-box{width:min(600px,100%)}.bw-prev{background:#f7f7f9;border-radius:16px;padding:12px;margin:6px 0 10px;display:flex;flex-direction:column}.bw-prev .chat-msg-row{display:flex;gap:8px}.bw-prev .chat-msg-row.me{justify-content:flex-end}.bw-prev .chat-bubble-wrapper{display:flex;flex-direction:column;max-width:75%}.bw-prev .chat-bubble{padding:10px 14px}
.bw-av{width:40px;height:40px;border-radius:50%;background:#d0d0d8;display:flex;align-items:center;justify-content:center;font-size:12px;color:#555}
.bw-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media(max-width:520px){.bw-grid{grid-template-columns:1fr}}.bw-side{background:#f7f7f9;border-radius:14px;padding:8px 10px;margin:6px 0}.bw-side b{font-size:13px}.bw-r{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:12.5px}.bw-r span:first-child{width:52px;color:#8e8e93;flex:none}.bw-r input[type=range]{flex:1;min-width:0}.bw-r select{max-width:120px}
.bw-it{display:flex;gap:8px;align-items:center}.bw-sw{width:22px;height:30px;flex:none;border:1px solid #e5e5ea}.bw-w{gap:4px}.bw-w span{align-self:flex-start;font-size:12px;padding:3px 9px}.bw-w span.me{align-self:flex-end}.bw-w em{font-size:11px}`);
X.mini({ id: 'gyxBubble', icon: '🫧', title: '气泡工坊', desc: '自己做聊天气泡，每个角色能不一样', cat: '生活', onOpen: () => window.gyxBubbleOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.themes = D.themes || []; D.per = D.per || {}; apply(); setInterval(apply, 1200); })();
