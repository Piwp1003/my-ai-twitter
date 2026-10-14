/* 🎨 导入酒馆主题：把 SillyTavern（酒馆）的美化主题 JSON 直接拿来用——字色、斜体色、引号色、聊天底色、你和 TA 的气泡底色、描边、阴影、模糊、字号缩放、头像形状、聊天宽度都照着换；custom_css 里的背景图和字体也会挑出来用。能存好几套随时切，也能顺手配一张聊天背景 */
if (window.__gyxStTheme) return; window.__gyxStTheme = 1;
X.feat('gyxStTheme', { n: '🎨 导入酒馆主题', desc: '把酒馆的美化主题 JSON 拿来给聊天界面用' });
const S = X.store('sttheme');
let D = { list: [], on: '', raw: false, picks: [] };   // list: {id,n,at,j,bg,font,note}
const saveD = () => S.set('d', D);
const th = id => D.list.find(x => x.id === id);
// 酒馆主题 → 谷雨聊天界面
function mapTheme(t) {
    const j = t.j || {}, R = 'html body #view-chat';
    const col = v => (typeof v === 'string' && v.trim()) ? v.trim() : '';
    const fs = +j.font_scale > 0 ? +j.font_scale : 1, blur = +j.blur_strength || 0, sw = +j.shadow_width || 0;
    const av = { 0: '50%', 1: '6px', 2: '0', 3: '28%' }[j.avatar_style] || '';
    let css = '';
    const bg = t.bg || '';
    css += `${R}{${col(j.chat_tint_color) ? `background:${bg ? `linear-gradient(${j.chat_tint_color},${j.chat_tint_color}),url("${bg}") center/cover fixed` : j.chat_tint_color}!important;` : bg ? `background:url("${bg}") center/cover fixed!important;` : ''}${t.font ? `font-family:${t.font}!important;` : ''}}`;
    const bub = (sel, c) => `${R} ${sel}{${col(c) ? `background:${c}!important;` : ''}${col(j.main_text_color) ? `color:${j.main_text_color}!important;` : ''}${col(j.border_color) ? `border:1px solid ${j.border_color}!important;` : ''}${blur ? `backdrop-filter:blur(${blur}px)!important;-webkit-backdrop-filter:blur(${blur}px)!important;` : ''}${sw && col(j.shadow_color) && !j.noShadows ? `text-shadow:0 0 ${sw}px ${j.shadow_color}!important;` : ''}font-size:${Math.round(15 * fs * 10) / 10}px!important}`;
    css += bub('.chat-bubble.me', j.user_mes_blur_tint_color) + bub('.chat-bubble.other', j.bot_mes_blur_tint_color || j.blur_tint_color);
    if (col(j.italics_text_color)) css += `${R} .chat-bubble em,${R} .chat-bubble i{color:${j.italics_text_color}!important}`;
    if (col(j.underline_text_color)) css += `${R} .chat-bubble u{color:${j.underline_text_color}!important}`;
    if (col(j.quote_text_color)) css += `${R} .chat-bubble q,${R} .chat-bubble .gy-quote,${R} .chat-bubble blockquote{color:${j.quote_text_color}!important}`;
    if (av) css += `${R} .avatar,${R} .avatar img{border-radius:${av}!important}`;
    if (+j.chat_width > 0) css += `${R} .chat-bubble-wrapper{max-width:${Math.max(40, Math.min(95, +j.chat_width))}%!important}`;
    if (D.raw && j.custom_css) css += '\n/* 酒馆 custom_css 原样 */\n' + String(j.custom_css);
    return css;
}
// custom_css 里挑背景图和字体
function digest(j) {
    const cc = String(j.custom_css || ''); const out = {};
    const u = cc.match(/url\(\s*['"]?(https?:[^'")\s]+|data:image[^'")\s]+)['"]?\s*\)/i); if (u) out.bg = u[1];
    const imp = [...cc.matchAll(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)].map(m => m[1]).filter(x => /fonts\.googleapis|font/i.test(x)); if (imp.length) out.fontCss = imp;
    const ff = cc.match(/font-family\s*:\s*([^;}{]+)/i); if (ff) out.font = ff[1].replace(/!important/, '').trim();
    return out;
}
function loadFonts(t) { (t.fontCss || []).forEach((u, i) => { const id = 'gyxStF' + t.id + i; if (document.getElementById(id)) return; const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = u; document.head.appendChild(l); }); }
let last = null;
function apply() {
    const t = X.on('gyxStTheme') && D.on ? th(D.on) : null; const css = t ? mapTheme(t) : '';
    if (css === last) return; last = css; if (t) loadFonts(t);
    let st = document.getElementById('gyxStLive'); if (!st) { st = document.createElement('style'); st.id = 'gyxStLive'; document.head.appendChild(st); } st.textContent = css;
}
async function addJson(txt, name) {
    let j; try { j = JSON.parse(txt); } catch (e) { X.toast(X.v('这不是能用的主题文件', '读不出来'), '要酒馆导出的主题 .json'); return null; }
    if (Array.isArray(j)) j = j[0]; if (!j || typeof j !== 'object') return null;
    const known = ['main_text_color', 'chat_tint_color', 'user_mes_blur_tint_color', 'bot_mes_blur_tint_color', 'blur_tint_color', 'custom_css', 'font_scale'];
    if (!known.some(k => k in j)) { X.toast('这个 JSON 不像酒馆主题', '里面没有 main_text_color / chat_tint_color 这些'); return null; }
    const g = digest(j);
    const t = { id: 'st' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), n: String(j.name || name || '酒馆主题').replace(/\.json$/i, '').slice(0, 24), at: Date.now(), j, bg: g.bg || '', font: g.font || '', fontCss: g.fontCss || [] };
    D.list.unshift(t); await saveD(); return t;
}
window.gyxStThemeFile = inp => { const fs = [...(inp.files || [])]; inp.value = ''; if (!fs.length) return; let left = fs.length, ok = 0; fs.forEach(f => { const r = new FileReader(); r.onload = async () => { const t = await addJson(r.result, f.name); if (t) { ok++; if (!D.on) D.on = t.id; await saveD(); last = null; apply(); } if (--left === 0) { if (ok) X.toast(X.v('导进来了', '🎨 主题到了'), ok + ' 套'); window.gyxStThemeOpen(); } }; r.readAsText(f); }); };
window.gyxStThemePaste = async () => { const v = (document.getElementById('gyxStPaste') || {}).value || ''; const t = await addJson(v); if (t) { D.on = t.id; await saveD(); last = null; apply(); X.toast(X.v('主题用上了', '🎨 换好了'), t.n); window.gyxStThemeOpen(); } };
window.gyxStThemeUse = async id => { D.on = id || ''; await saveD(); last = null; apply(); window.gyxStThemeOpen(); };
window.gyxStThemeDel = async id => { D.list = D.list.filter(x => x.id !== id); if (D.on === id) D.on = ''; await saveD(); last = null; apply(); window.gyxStThemeOpen(); };
window.gyxStThemeBg = (id, inp) => { const f = inp.files && inp.files[0], t = th(id); if (!f || !t) return; const r = new FileReader(); r.onload = async () => { t.bg = r.result; await saveD(); last = null; apply(); window.gyxStThemeOpen(); }; r.readAsDataURL(f); };
window.gyxStThemeRaw = async v => { D.raw = !!v; await saveD(); last = null; apply(); };
window.gyxStThemeOpen = function () {
    const sw = t => ['chat_tint_color', 'user_mes_blur_tint_color', 'bot_mes_blur_tint_color', 'main_text_color', 'quote_text_color'].map(k => t.j[k]).filter(Boolean).map(c => `<i style="background:${X.esc(c)}"></i>`).join('');
    X.panel('gyxStOv', '🎨 导入酒馆主题', `<div class="gyx-tip">酒馆里「用户设置 → UI 主题 → 导出」得到的 .json，直接导进来。颜色、字号、头像形状、聊天宽度会照着换；custom_css 里的背景图和字体也会挑出来用。</div>
        <div class="gyx-row"><label class="gyx-btn">选主题文件（可多选）<input type="file" accept=".json,application/json" multiple style="display:none" onchange="gyxStThemeFile(this)"></label>${D.on ? `<button class="gyx-btn lite" onclick="gyxStThemeUse('')">不用了，换回谷雨的</button>` : ''}</div>
        <details class="gyx-card"><summary>或者粘贴 JSON</summary><textarea id="gyxStPaste" class="gyx-in" rows="4" placeholder='{"name":"...","main_text_color":"rgba(...)", ...}'></textarea><div class="gyx-row"><button class="gyx-btn lite" onclick="gyxStThemePaste()">导入</button></div></details>
        <label class="gyx-row"><input type="checkbox" ${D.raw ? 'checked' : ''} onchange="gyxStThemeRaw(this.checked)"> 连 custom_css 也原样加上（酒馆的选择器跟谷雨对不上，多半没效果，偶尔有用）</label>
        ${D.list.map(t => `<div class="gyx-card st-it${D.on === t.id ? ' on' : ''}"><div class="st-sw">${sw(t)}</div><div style="flex:1;min-width:0"><b>${X.esc(t.n)}</b>${t.by ? ` <span class="gyx-tip">${X.esc(X.name(X.char(t.by)))} 挑的${t.note ? '：' + X.esc(t.note) : ''}</span>` : ''}<div class="gyx-tip">${t.bg ? '有背景图 · ' : ''}${t.font ? '字体 ' + X.esc(t.font.slice(0, 20)) + ' · ' : ''}字号 ×${t.j.font_scale || 1}</div>
            <div class="gyx-row"><span class="gyx-chip ${D.on === t.id ? 'on' : ''}" onclick="gyxStThemeUse('${t.id}')">${D.on === t.id ? '正在用' : '用这套'}</span><label class="gyx-chip">配背景图<input type="file" accept="image/*" style="display:none" onchange="gyxStThemeBg('${t.id}',this)"></label><span class="gyx-chip" onclick="gyxStThemeDel('${t.id}')">删</span></div></div></div>`).join('') || '<div class="gyx-tip">还没有导入过</div>'}`);
};
window.gyxStThemeData = () => D;
window.gyxStThemeAdd = (txt, n) => addJson(typeof txt === 'string' ? txt : JSON.stringify(txt), n);
window.gyxStThemeCss = () => last;
X.ctx(id => { const t = D.on && th(D.on); return t && t.by === String(id) && Date.now() - (t.pickAt || 0) < 864e5 ? `【你今天给她的聊天换了主题「${t.n}」】${t.note || ''}` : ''; }, 'gyxStTheme');
X.action({ key: 'gyx_st_theme', label: '从她导入的主题里挑一套，今天给聊天换上', hint: '她导入过好几套酒馆主题', need: c => D.list.length >= 2 && !D.list.some(t => t.by === String(c.id) && Date.now() - (t.pickAt || 0) < 3 * 864e5),
    run: async c => { const L = D.list.filter(t => t.id !== D.on); const r = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n她导入了这些聊天主题：${L.map((t, i) => i + '.' + t.n).join('；')}。挑一套你想今天给你们的聊天换上的，说一句为什么（15 字以内）。输出 JSON：{"i":序号,"why":""}`)); const t = L[(r && +r.i >= 0 && +r.i < L.length) ? +r.i : Math.floor(Math.random() * L.length)]; t.by = String(c.id); t.pickAt = Date.now(); t.note = X.plain((r && r.why) || '').slice(0, 30); D.on = t.id; D.picks.unshift({ id: 'sp' + Date.now().toString(36), cid: String(c.id), at: Date.now(), n: t.n, why: t.note }); D.picks = D.picks.slice(0, 40); await saveD(); last = null; apply(); return (await X.reach(c, `你给你们的聊天换上了主题「${t.n}」${t.note ? '（' + t.note + '）' : ''}，问她觉得怎么样`)) ? '换了聊天主题：' + t.n : null; } }, 'gyxStTheme');
X.today(() => ({ title: '🎨 聊天主题', rows: D.picks.filter(x => X.day(new Date(x.at)) === X.day()).map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: `换上了「${X.esc(x.n)}」${x.why ? '：' + X.esc(x.why) : ''}`, go: 'gyxStThemeOpen()' })) }), 'gyxStTheme');
X.widget('gyxStThemeW', { n: '聊天主题', sizes: ['s', 'm'], tap: () => window.gyxStThemeOpen(), r: w => { const t = D.on && th(D.on); return X.gw(w, '🎨', '聊天主题', [t ? X.esc(t.n) : '谷雨默认', D.list.length ? D.list.length + ' 套可换' : '还没导入']); } }, 'gyxStTheme');
X.memArr({ k: 'gyxStTheme', ico: '🎨', n: 'TA 挑过的聊天主题', d: 'TA 从你导入的主题里挑来换上的', arr: () => D.picks, field: 'why', text: x => `「${x.n}」${x.why ? '｜' + x.why : ''}`, edit: (x, v) => { x.why = String(v).split('｜').slice(1).join('｜'); }, save: saveD }, 'gyxStTheme');
X.css('gyxStCss', `.st-it{display:flex;gap:10px;align-items:flex-start}.st-it.on{box-shadow:0 0 0 2px #1d1d1f inset}.st-sw{display:grid;grid-template-columns:repeat(2,14px);gap:3px;flex:none}.st-sw i{width:14px;height:14px;border-radius:4px;border:1px solid rgba(0,0,0,.08)}`);
X.mini({ id: 'gyxStTheme', icon: '🎨', title: '导入酒馆主题', desc: '把酒馆的美化主题 JSON 拿来给聊天界面用', cat: '生活', onOpen: () => window.gyxStThemeOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.list = D.list || []; D.picks = D.picks || []; apply(); setInterval(apply, 2000); })();
