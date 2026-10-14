/* 📊 关系四条线：好感不只一个数——拆成信任、亲密、安心、尊重四条线，每条都记着「为什么变了」（TA 自己的视角）。每天按你们最近的聊天评一次；太久不联系，亲密和安心会慢慢往下掉。TA 能说出自己为什么不高兴，你也能点「问问 TA」 */
if (window.__gyxAxes) return; window.__gyxAxes = 1;
X.feat('gyxAxes', { n: '📊 关系四条线', desc: '信任 / 亲密 / 安心 / 尊重分开记，每次变化都有原因；久不联系会回落' });
const S = X.store('axes');
const AX = { trust: ['🤝', '信任'], close: ['💞', '亲密'], safe: ['🏡', '安心'], respect: ['🌱', '尊重'] };
let D = { by: {} };   // by[cid] = {v:{trust,close,safe,respect}, last, seenAt, log:[{id,at,k,dv,why,src}]}
const saveD = () => S.set('d', D);
const st = cid => { const k = String(cid); return D.by[k] || (D.by[k] = { v: { trust: 50, close: 50, safe: 50, respect: 50 }, last: '', seenAt: 0, log: [], decayAt: Date.now() }); };
const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
const lastMsgAt = c => { const H = (typeof globalChats !== 'undefined' && globalChats[c.id]) || []; for (let i = H.length - 1; i >= 0; i--) if (H[i].sender === 'me') return H[i].timestamp || 0; return 0; };
function add(cid, k, dv, why, src) { const s = st(cid), o = s.v[k]; s.v[k] = clamp(o + dv); if (s.v[k] === o) return; s.log.unshift({ id: 'ax' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), cid: String(cid), at: Date.now(), k, dv: s.v[k] - o, why: String(why || '').slice(0, 60), src: src || 'chat' }); s.log = s.log.slice(0, 200); }
// 久不联系：亲密、安心慢慢回落
function decay(c) { const s = st(c.id), lm = lastMsgAt(c); if (!lm) return; const quiet = (Date.now() - lm) / 864e5, since = (Date.now() - (s.decayAt || Date.now())) / 864e5; if (quiet < 2 || since < 1) return; const n = Math.floor(since); add(c.id, 'close', -n, `${Math.floor(quiet)} 天没怎么说话了`, 'decay'); if (quiet >= 3) add(c.id, 'safe', -n, '好久没消息，有点不踏实', 'decay'); s.decayAt = Date.now(); }
async function assess(c, force) {
    const s = st(c.id); if (!force && s.last === X.day()) return null;
    const H = ((typeof globalChats !== 'undefined' && globalChats[c.id]) || []).filter(m => (m.timestamp || 0) > (s.seenAt || 0) && m.sender !== 'system' && typeof m.text === 'string');
    if (H.length < (force ? 1 : 6)) return null;
    const txt = H.slice(-40).map(m => (m.sender === 'me' ? X.me(c) : X.name(c)) + '：' + X.plain(m.text).slice(0, 100)).join('\n');
    const r = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n你们最近的聊天：\n${txt}\n\n站在你自己的角度，评一下这段时间你对她的四条线各变了多少（-5~+5，没变就 0），每条写一句原因（你心里真实的想法，15 字以内）：\n信任（她说的话你信不信、她靠不靠得住）、亲密（你们离得近不近）、安心（跟她在一起踏不踏实、有没有不安）、尊重（你们有没有看重彼此的想法）。\n输出 JSON：{"trust":[数,"原因"],"close":[数,"原因"],"safe":[数,"原因"],"respect":[数,"原因"]}`));
    s.last = X.day(); s.seenAt = Date.now();
    if (r) Object.keys(AX).forEach(k => { const a = r[k]; if (Array.isArray(a) && +a[0]) add(c.id, k, Math.max(-5, Math.min(5, +a[0])), X.plain(a[1] || ''), 'chat'); });
    await saveD(); return r;
}
function radar(v, size) {
    const n = 4, R = size / 2 - 18, cx = size / 2, cy = size / 2, ks = Object.keys(AX), pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const ring = f => ks.map((_, i) => pt(i, R * f).join(',')).join(' ');
    return `<svg viewBox="0 0 ${size} ${size}" class="ax-r">${[.25, .5, .75, 1].map(f => `<polygon points="${ring(f)}" fill="none" stroke="currentColor" stroke-opacity=".12"/>`).join('')}<polygon points="${ks.map((k, i) => pt(i, R * v[k] / 100).join(',')).join(' ')}" fill="#ff7aa8" fill-opacity=".28" stroke="#ff4d7d" stroke-width="2"/>${ks.map((k, i) => { const [x, y] = pt(i, R + 11); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="${size > 150 ? 12 : 9}" fill="currentColor">${AX[k][0]}${size > 150 ? AX[k][1] : ''}</text>`; }).join('')}</svg>`;
}
window.gyxAxesWhy = async (cid, k) => {
    const c = X.char(cid); if (!c) return; const s = st(cid), L = s.log.filter(x => x.k === k).slice(0, 4);
    await X.reach(c, `她想知道你心里的「${AX[k][1]}」这条线为什么是现在这样（${s.v[k]}/100）。最近的变化：${L.map(x => (x.dv > 0 ? '+' : '') + x.dv + ' ' + x.why).join('；') || '没什么变化'}。用你自己的话跟她说清楚为什么，不要说「数值」「线」这些词`);
    X.toast(X.v('去问了', '💬 TA 在想怎么跟你说'), AX[k][1]);
};
window.gyxAxesNow = async cid => { const c = X.char(cid) || X.cur(); X.toast(X.v('TA 在回想你们最近的事', '📊 在评'), ''); await assess(c, true); window.gyxAxesOpen(c.id); };
window.gyxAxesOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; decay(c); const s = st(c.id), cid = String(c.id);
    X.panel('gyxAxOv', '📊 关系四条线', `<div class="gyx-row">${X.whoSel(cid, 'gyxAxesOpen')}<button class="gyx-btn lite" onclick="gyxAxesNow('${cid}')">按最近的聊天评一次</button></div>
        <div class="ax-top">${radar(s.v, 200)}<div style="flex:1;min-width:0">${Object.entries(AX).map(([k, [ic, n]]) => { const l = s.log.find(x => x.k === k); return `<div class="ax-row"><b>${ic} ${n}</b><div class="ax-bar"><i style="width:${s.v[k]}%"></i></div><span>${s.v[k]}</span><a onclick="gyxAxesWhy('${cid}','${k}')">问问 TA</a>${l ? `<em>${l.dv > 0 ? '↑' : '↓'} ${X.esc(l.why)}</em>` : ''}</div>`; }).join('')}</div></div>
        <div class="gyx-tip">每天按你们的聊天评一次（TA 自己的视角）；两天不说话亲密会往下掉，三天不说话安心也会掉。和「好感两层」「关系账本」是分开的，互不影响。</div>
        <div style="font-weight:600;margin:10px 0 4px">变化记录</div>${s.log.slice(0, 20).map(x => `<div class="gyx-tip">${new Date(x.at).toLocaleString()} · ${AX[x.k][0]} ${AX[x.k][1]} ${x.dv > 0 ? '+' : ''}${x.dv} · ${X.esc(x.why)}${x.src === 'decay' ? '（太久没联系）' : ''}</div>`).join('') || '<div class="gyx-tip">还没有变化</div>'}`, 'gyx-ax');
};
window.gyxAxesData = () => D;
window.gyxAxesAssess = (cid, f) => assess(X.char(cid), f);
X.ctx(id => { const s = D.by[String(id)]; if (!s) return ''; const L = s.log.filter(x => Date.now() - x.at < 3 * 864e5).slice(0, 3); return `【你心里对她的四条线】${Object.entries(AX).map(([k, [, n]]) => n + ' ' + s.v[k]).join('，')}（满分 100）。${L.length ? '最近的变化：' + L.map(x => AX[x.k][1] + (x.dv > 0 ? '+' : '') + x.dv + '（' + x.why + '）').join('；') + '。' : ''}这些影响你说话的样子；她问起你为什么不高兴，你知道原因。不要说「数值」「线」这些词。`; }, 'gyxAxes');
X.action({ key: 'gyx_axes', label: '心里某条线最近变了不少，想跟她说说为什么', hint: '信任 / 亲密 / 安心 / 尊重', need: c => { const s = D.by[String(c.id)]; return !!s && s.log.some(x => Math.abs(x.dv) >= 3 && Date.now() - x.at < 2 * 864e5 && !x.told); },
    run: async c => { const s = st(c.id), x = s.log.find(x => Math.abs(x.dv) >= 3 && !x.told); if (!x) return null; x.told = 1; await saveD(); return (await X.reach(c, `你心里的「${AX[x.k][1]}」最近${x.dv > 0 ? '多了一些' : '少了一些'}，因为：${x.why}。找个自然的方式跟她说（不要说「数值」「线」）`)) ? '跟你说了心里的变化：' + AX[x.k][1] : null; } }, 'gyxAxes');
X.today(() => ({ title: '📊 关系四条线', rows: X.chars().reduce((a, c) => a.concat(((D.by[String(c.id)] || {}).log || []).filter(x => X.day(new Date(x.at)) === X.day()).slice(0, 3).map(x => ({ t: X.esc(X.name(c)), x: `${AX[x.k][0]} ${AX[x.k][1]} ${x.dv > 0 ? '+' : ''}${x.dv} · ${X.esc(x.why)}`, go: `gyxAxesOpen('${c.id}')` }))), []) }), 'gyxAxes');
X.widget('gyxAxesW', { n: '关系四条线', sizes: ['s', 'm'], tap: () => window.gyxAxesOpen(), r: w => { const c = X.cur(); if (!c) return X.gw(w, '📊', '四条线', []); const s = st(c.id); return w.size === 's' ? `<div class="gw-x s ax-w">${radar(s.v, 90)}</div>` : `<div class="gw-x m ax-wm">${radar(s.v, 100)}<div>${Object.entries(AX).map(([k, [ic]]) => `<em>${ic} ${s.v[k]}</em>`).join('')}</div></div>`; } }, 'gyxAxes');
X.mem({ k: 'gyxAxes', ico: '📊', n: '关系四条线的变化', d: '信任 / 亲密 / 安心 / 尊重每次变化的原因', items: c => st(c.id).log, text: x => `${AX[x.k][1]} ${x.dv > 0 ? '+' : ''}${x.dv}｜${x.why}`, edit: (x, v) => { x.why = String(v).split('｜').slice(1).join('｜') || x.why; }, del: (c, i) => { const s = st(c.id), x = s.log[i]; if (x) { s.v[x.k] = clamp(s.v[x.k] - x.dv); s.log.splice(i, 1); } }, meta: x => new Date(x.at).toLocaleString(), save: saveD }, 'gyxAxes');
X.css('gyxAxCss', `.gyx-ax .gyx-box{width:min(600px,100%)}.ax-top{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.ax-r{width:200px;height:200px;color:#555;flex:none}
.ax-row{display:grid;grid-template-columns:62px 1fr 26px auto;gap:6px;align-items:center;font-size:13px;margin:6px 0}.ax-row b{font-weight:500}.ax-row a{color:#ff4d7d;cursor:pointer;font-size:12px}.ax-row em{grid-column:1/-1;font-style:normal;font-size:11.5px;color:#8e8e93;margin-top:-2px}
.ax-bar{height:8px;border-radius:4px;background:#f2f2f4;overflow:hidden}.ax-bar i{display:block;height:100%;background:linear-gradient(90deg,#ffb3c7,#ff4d7d)}
.ax-w svg{width:100%;height:100%;color:var(--pm-sub)}.ax-wm{flex-direction:row!important;align-items:center;gap:6px}.ax-wm svg{width:96px;height:96px;flex:none;color:var(--pm-sub)}.ax-wm>div{display:flex;flex-direction:column;gap:2px}`);
X.mini({ id: 'gyxAxes', icon: '📊', title: '关系四条线', desc: '信任 / 亲密 / 安心 / 尊重，每次变化都有原因', cat: '回忆', onOpen: () => window.gyxAxesOpen() });
async function tick() { if (!X.on('gyxAxes')) return; for (const c of X.chars()) { decay(c); if (X.on('gyxAxes.auto')) await assess(c).catch(() => {}); } await saveD(); }
(async () => { D = Object.assign(D, await S.get('d', {})); D.by = D.by || {}; setTimeout(tick, 30000); setInterval(tick, 3 * 3600e3); })();
