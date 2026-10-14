/* 📒 手帐时间线：把你们的聊天整理成一本纸质手帐——月视图是日历（哪天聊得多、那天的心情一眼看出来），周视图是七张小卡，日视图是一页手帐：这天的小结、摘下来的几句话、TA 在页边写的批注（手写字），还能从贴纸库贴贴纸、拖着摆位置 */
if (window.__gyxHandbook) return; window.__gyxHandbook = 1;
X.feat('gyxHandbook', { n: '📒 手帐时间线', desc: '聊天整理成日 / 周 / 月的手帐，能贴贴纸，TA 会在页边写批注' });
const S = X.store('handbook');
let D = { days: {} };   // days[cid][YYYY-MM-DD] = {sum, emo, quotes:[{who,t}], note, noteAt, stk:[{id,src,x,y,r}], at}
const saveD = () => S.set('d', D);
const pad = n => String(n).padStart(2, '0');
const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const pg = (cid, k) => { const c = String(cid); D.days[c] = D.days[c] || {}; return (D.days[c][k] = D.days[c][k] || { stk: [] }); };
const msgsOn = (c, k) => ((typeof globalChats !== 'undefined' && globalChats[c.id]) || []).filter(m => m && m.sender !== 'system' && typeof m.text === 'string' && m.timestamp && key(new Date(m.timestamp)) === k);
const dateOf = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d); };
const WD = ['日', '一', '二', '三', '四', '五', '六'];
function quotes(c, L) {
    const seen = new Set(), ok = L.map(m => ({ who: m.sender === 'me' ? 'me' : 'ta', t: X.plain(m.text) })).filter(x => x.t.length >= 6 && x.t.length <= 80 && !seen.has(x.t) && seen.add(x.t));
    const ta = ok.filter(x => x.who === 'ta').sort((a, b) => b.t.length - a.t.length).slice(0, 2), me = ok.filter(x => x.who === 'me').sort((a, b) => b.t.length - a.t.length).slice(0, 1);
    return ta.concat(me);
}
async function write(c, k, force) {
    const p = pg(c.id, k), L = msgsOn(c, k); if (!L.length) return p;
    if (!p.quotes || force) p.quotes = quotes(c, L);
    if ((!p.sum || force) && L.length >= 3) {
        const txt = L.slice(-40).map(m => (m.sender === 'me' ? X.me(c) : X.name(c)) + '：' + X.plain(m.text).slice(0, 80)).join('\n');
        const r = X.bailu() ? null : X.json(await X.ask(`下面是 ${k} 这一天「${X.name(c)}」和「${X.me(c)}」的聊天。像写手帐那样，用第一人称「我们」写这一天的小结（2~3 句，温柔、具体，不要流水账），再挑一个最能代表这天的 emoji。输出 JSON：{"sum":"","emo":""}\n${txt}`));
        p.sum = X.plain((r && r.sum) || '') || (L.length + ' 句话，' + (p.quotes[0] ? '有一句是「' + p.quotes[0].t.slice(0, 20) + '」' : '平平常常的一天')); p.emo = X.plain((r && r.emo) || '📝').slice(0, 4); p.at = Date.now();
    }
    await saveD(); return p;
}
async function note(c, k) {
    const p = await write(c, k);
    p.note = X.plain(X.bailu() ? (X.cards(['情话', '聊天'], c, 1)[0] || '这一天我记住了。') : (await X.ask(`${X.who(c)}\n你在翻你们的手帐，翻到 ${k} 这一页，上面写着：${p.sum || '（还没写小结）'}${(p.quotes || []).map(q => '「' + q.t + '」').join('')}。在页边用手写的语气写一句批注（20~40 字，可以吐槽那天的自己、可以补一句当时没说的话）。只输出这一句。`)) || '');
    p.noteAt = Date.now(); await saveD(); return p;
}
let V = { cid: '', view: 'month', y: 0, m: 0, k: '' };
function head(c) { return `<div class="gyx-row">${X.whoSel(c.id, 'gyxHandbookWho')}${['month', 'week', 'day'].map(v => `<span class="gyx-chip ${V.view === v ? 'on' : ''}" onclick="gyxHandbookView('${v}')">${{ month: '月', week: '周', day: '日' }[v]}</span>`).join('')}</div>`; }
function monthHtml(c) {
    const first = new Date(V.y, V.m, 1), days = new Date(V.y, V.m + 1, 0).getDate(), pre = first.getDay(), H = (typeof globalChats !== 'undefined' && globalChats[c.id]) || [], cnt = {};
    H.forEach(m => { if (m.timestamp) { const k = key(new Date(m.timestamp)); cnt[k] = (cnt[k] || 0) + 1; } });
    const P = D.days[String(c.id)] || {};
    let cells = ''; for (let i = 0; i < pre; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) { const k = V.y + '-' + pad(V.m + 1) + '-' + pad(d), n = cnt[k] || 0, p = P[k]; cells += `<span class="hb-d${n ? ' has' : ''}${k === X.day() ? ' today' : ''}" onclick="gyxHandbookDay('${k}')"><b>${d}</b>${p && p.emo ? `<i>${X.esc(p.emo)}</i>` : n ? `<em style="width:${Math.min(22, 4 + n / 3)}px;height:${Math.min(22, 4 + n / 3)}px"></em>` : ''}${p && p.note ? '<u>✎</u>' : ''}</span>`; }
    return `<div class="gyx-row"><button class="gyx-btn lite" onclick="gyxHandbookMove(-1)">‹</button><b style="flex:1;text-align:center">${V.y} 年 ${V.m + 1} 月</b><button class="gyx-btn lite" onclick="gyxHandbookMove(1)">›</button></div><div class="hb-cal">${WD.map(w => `<span class="hb-w">${w}</span>`).join('')}${cells}</div><div class="gyx-tip">圆点越大那天聊得越多；有小结的显示那天的 emoji，✎ 是 TA 写了批注。点哪天翻到那一页。</div>`;
}
function weekHtml(c) {
    const base = dateOf(V.k || X.day()); base.setDate(base.getDate() - base.getDay()); const P = D.days[String(c.id)] || {};
    return `<div class="gyx-row"><button class="gyx-btn lite" onclick="gyxHandbookWeek(-7)">‹ 上一周</button><button class="gyx-btn lite" onclick="gyxHandbookWeek(7)">下一周 ›</button></div><div class="hb-week">${Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(base.getDate() + i); const k = key(d), p = P[k], n = msgsOn(c, k).length; return `<div class="hb-wc" onclick="gyxHandbookDay('${k}')"><b>${d.getMonth() + 1}/${d.getDate()} 周${WD[d.getDay()]}</b><i>${p && p.emo ? X.esc(p.emo) : n ? '💬' : '·'}</i><span>${p && p.sum ? X.esc(p.sum.slice(0, 40)) : n ? n + ' 句话（点开写小结）' : '这天没聊'}</span>${p && p.note ? `<em class="gyx-hand">${X.esc(p.note.slice(0, 24))}</em>` : ''}</div>`; }).join('')}</div>`;
}
function dayHtml(c) {
    const k = V.k || X.day(), p = pg(c.id, k), n = msgsOn(c, k).length, d = dateOf(k);
    return `<div class="gyx-row"><button class="gyx-btn lite" onclick="gyxHandbookStep(-1)">‹ 前一天</button><button class="gyx-btn lite" onclick="gyxHandbookStep(1)">后一天 ›</button></div>
        <div class="hb-page" id="gyxHbPage"><div class="hb-date"><b>${d.getDate()}</b><span>${d.getFullYear()}.${pad(d.getMonth() + 1)} · 周${WD[d.getDay()]}</span><i>${X.esc(p.emo || '')}</i></div>
        <div class="hb-sum">${p.sum ? X.esc(p.sum) : n ? `这天聊了 ${n} 句。<a onclick="gyxHandbookWrite('${k}')">写小结 ›</a>` : '这天没有聊天。'}</div>
        ${(p.quotes || []).map(q => `<div class="hb-q ${q.who}">“${X.esc(q.t)}”<i>—— ${q.who === 'me' ? '我' : X.esc(X.name(c))}</i></div>`).join('')}
        ${p.note ? `<div class="hb-note gyx-hand">${X.esc(p.note)}<i>—— ${X.esc(X.name(c))}</i></div>` : ''}
        ${(p.stk || []).map((s, i) => `<img class="hb-stk" data-i="${i}" src="${X.esc(s.src)}" style="left:${s.x}%;top:${s.y}%;transform:rotate(${s.r}deg)" draggable="false" ondblclick="gyxHandbookUnstick('${k}',${i})">`).join('')}</div>
        <div class="gyx-row"><button class="gyx-btn lite" onclick="gyxHandbookStkPick('${k}')">🏷️ 贴一张贴纸</button>${n ? `<button class="gyx-btn lite" onclick="gyxHandbookWrite('${k}',1)">重写小结</button><button class="gyx-btn lite" onclick="this.disabled=true;gyxHandbookNote('${k}')">请 ${X.esc(X.name(c))} 写批注</button>` : ''}</div><div class="gyx-tip">贴纸能拖着摆，双击拿掉。</div>
        <div id="gyxHbStk"></div>`;
}
window.gyxHandbookOpen = function (who, view, k) {
    const c = X.char(who) || X.char(V.cid) || X.cur(); if (!c) return; V.cid = String(c.id); if (view) V.view = view; if (k) { V.k = k; const d = dateOf(k); V.y = d.getFullYear(); V.m = d.getMonth(); }
    if (!V.y) { const d = new Date(); V.y = d.getFullYear(); V.m = d.getMonth(); }
    X.panel('gyxHbOv', '📒 手帐时间线', head(c) + (V.view === 'month' ? monthHtml(c) : V.view === 'week' ? weekHtml(c) : dayHtml(c)), 'gyx-hb');
    if (V.view === 'day') drag(c);
};
function drag(c) {
    const box = document.getElementById('gyxHbPage'); if (!box) return; let g = null;
    box.addEventListener('pointerdown', e => { const im = e.target.closest('.hb-stk'); if (!im) return; e.preventDefault(); g = { im, i: +im.dataset.i }; im.setPointerCapture(e.pointerId); });
    box.addEventListener('pointermove', e => { if (!g) return; const r = box.getBoundingClientRect(); const x = Math.max(-5, Math.min(90, (e.clientX - r.left) / r.width * 100 - 6)), y = Math.max(-5, Math.min(92, (e.clientY - r.top) / r.height * 100 - 6)); g.im.style.left = x + '%'; g.im.style.top = y + '%'; g.x = x; g.y = y; });
    box.addEventListener('pointerup', async () => { if (!g) return; const p = pg(c.id, V.k || X.day()), s = p.stk[g.i]; if (s && g.x != null) { s.x = Math.round(g.x); s.y = Math.round(g.y); await saveD(); } g = null; });
}
window.gyxHandbookWho = cid => { V.cid = String(cid); window.gyxHandbookOpen(cid); };
window.gyxHandbookView = v => window.gyxHandbookOpen(null, v);
window.gyxHandbookMove = n => { V.m += n; if (V.m < 0) { V.m = 11; V.y--; } if (V.m > 11) { V.m = 0; V.y++; } window.gyxHandbookOpen(); };
window.gyxHandbookWeek = n => { const d = dateOf(V.k || X.day()); d.setDate(d.getDate() + n); V.k = key(d); window.gyxHandbookOpen(); };
window.gyxHandbookStep = n => { const d = dateOf(V.k || X.day()); d.setDate(d.getDate() + n); window.gyxHandbookOpen(null, 'day', key(d)); };
window.gyxHandbookDay = async k => { const c = X.char(V.cid) || X.cur(); V.k = k; V.view = 'day'; const p = pg(c.id, k); window.gyxHandbookOpen(null, 'day', k); if (!p.sum && msgsOn(c, k).length >= 3) { await write(c, k); if (V.view === 'day' && V.k === k) window.gyxHandbookOpen(null, 'day', k); } };
window.gyxHandbookWrite = async (k, force) => { const c = X.char(V.cid) || X.cur(); X.toast(X.v('在写这一页', '📒 翻到这一天'), k); await write(c, k, !!force); window.gyxHandbookOpen(null, 'day', k); };
window.gyxHandbookNote = async k => { const c = X.char(V.cid) || X.cur(); await note(c, k); window.gyxHandbookOpen(null, 'day', k); };
window.gyxHandbookStkPick = async k => {
    const box = document.getElementById('gyxHbStk'); if (!box) return;
    if (typeof window.gyStkLibrary !== 'function') { box.innerHTML = '<div class="gyx-tip">贴纸库在小手机的「🏷️ 贴纸」里，这个版本还没有。</div>'; return; }
    const L = await window.gyStkLibrary();
    box.innerHTML = L.map(g => g.L.length ? `<div class="gyx-tip">${X.esc(g.n)}</div><div class="hb-stks">${g.L.map(x => `<img src="${X.esc(x.src)}" title="${X.esc(x.n)}" onclick="gyxHandbookStick('${k}','${X.esc(x.id)}')">`).join('')}</div>` : '').join('');
};
window.gyxHandbookStick = async (k, sid) => { const c = X.char(V.cid) || X.cur(); const src = typeof window.gyStkSrc === 'function' ? window.gyStkSrc(sid) : ''; if (!src) return; pg(c.id, k).stk.push({ id: 'hs' + Date.now().toString(36), src, x: Math.round(X.rnd(55, 80)), y: Math.round(X.rnd(5, 70)), r: Math.round(X.rnd(-12, 12)) }); await saveD(); window.gyxHandbookOpen(null, 'day', k); };
window.gyxHandbookUnstick = async (k, i) => { const c = X.char(V.cid) || X.cur(); pg(c.id, k).stk.splice(i, 1); await saveD(); window.gyxHandbookOpen(null, 'day', k); };
window.gyxHandbookData = () => D;
window.gyxHandbookWriteDay = (cid, k) => write(X.char(cid), k);
window.gyxHandbookNoteDay = (cid, k) => note(X.char(cid), k);
const yest = () => { const d = new Date(); d.setDate(d.getDate() - 1); return key(d); };
X.ctx(id => { const p = (D.days[String(id)] || {})[yest()]; return p && p.note && Date.now() - p.noteAt < 864e5 ? `【你在你们的手帐上给昨天那页写了批注】${p.note}` : ''; }, 'gyxHandbook');
X.action({ key: 'gyx_handbook', label: '翻你们的手帐，在昨天那一页写一句批注', hint: '手帐时间线', need: c => msgsOn(c, yest()).length >= 3 && !((D.days[String(c.id)] || {})[yest()] || {}).note,
    run: async c => { const p = await note(c, yest()); if (!p.note) return null; X.notify(c, `📒 ${X.esc(X.name(c))} ${X.v('在手帐上写了批注', '翻了你们的手帐', '在昨天那页留了一句')}`, p.note, () => window.gyxHandbookOpen(c.id, 'day', yest())); return (await X.reach(c, `你在你们的手帐昨天那一页写了批注「${p.note}」，可以跟她提一句，或者让她自己去翻`)) ? '在手帐上写了批注' : null; } }, 'gyxHandbook');
X.today(() => { const c = X.cur(); if (!c) return null; const p = (D.days[String(c.id)] || {})[X.day()], y = (D.days[String(c.id)] || {})[yest()]; return { title: '📒 手帐', rows: [{ t: '今天', x: p && p.sum ? X.esc(p.sum.slice(0, 30)) : msgsOn(c, X.day()).length + ' 句话，点开写这一页', go: `gyxHandbookOpen('${c.id}','day','${X.day()}')` }].concat(y && y.note && X.day(new Date(y.noteAt)) === X.day() ? [{ t: X.esc(X.name(c)), x: '在昨天那页写了：' + X.esc(y.note.slice(0, 24)), go: `gyxHandbookOpen('${c.id}','day','${yest()}')` }] : []) }; }, 'gyxHandbook');
X.widget('gyxHandbookW', { n: '手帐', sizes: ['s', 'm'], tap: () => window.gyxHandbookOpen(null, 'month'), r: w => { const c = X.cur(); if (!c) return X.gw(w, '📒', '手帐', []); const d = new Date(), P = D.days[String(c.id)] || {}; if (w.size === 's') return `<div class="gw-x s"><b>📒</b><em>${d.getMonth() + 1} 月 ${Object.keys(P).filter(k => k.startsWith(key(d).slice(0, 7)) && P[k].sum).length} 页</em></div>`; const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return `<div class="gw-x m hb-wg"><div class="h"><b>📒</b><span>${d.getMonth() + 1} 月的手帐</span></div><div>${Array.from({ length: days }, (_, i) => { const k = key(d).slice(0, 8) + pad(i + 1), p = P[k]; return `<i class="${p && p.sum ? 'w' : msgsOn(c, k).length ? 'c' : ''}${i + 1 === d.getDate() ? ' t' : ''}"></i>`; }).join('')}</div></div>`; } }, 'gyxHandbook');
X.mem({ k: 'gyxHandbook', ico: '📒', n: '手帐', d: '每天的小结和 TA 的批注', items: c => { const P = D.days[String(c.id)] || {}; return Object.keys(P).filter(k => P[k].sum || P[k].note).sort().reverse().map(k => Object.assign(P[k], { __k: k })); }, text: p => (p.sum || '') + (p.note ? '｜TA 批注：' + p.note : ''), edit: (p, v) => { const m = String(v).split('｜TA 批注：'); p.sum = m[0]; if (m[1] != null) p.note = m[1]; }, del: (c, i) => { const P = D.days[String(c.id)] || {}; const ks = Object.keys(P).filter(k => P[k].sum || P[k].note).sort().reverse(); delete P[ks[i]]; }, meta: p => p.__k, save: saveD }, 'gyxHandbook');
X.css('gyxHbCss', `.gyx-hb .gyx-box{width:min(620px,100%)}
.hb-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.hb-cal span{aspect-ratio:1;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:12px;position:relative}.hb-cal .hb-w{aspect-ratio:auto;color:#8e8e93;font-size:11px}
.hb-d{background:#fbf8f1;cursor:pointer}.hb-d.has{background:#f6efe1}.hb-d.today{box-shadow:inset 0 0 0 2px #c9a46b}.hb-d b{font-weight:500}.hb-d i{font-style:normal;font-size:15px}.hb-d em{border-radius:50%;background:#e4b87a;display:block}.hb-d u{position:absolute;top:2px;right:4px;text-decoration:none;font-size:10px;color:#b07a3a}
.hb-week{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.hb-wc{background:#fbf8f1;border-radius:14px;padding:10px;cursor:pointer;font-size:12.5px;line-height:1.6;display:flex;flex-direction:column;gap:3px;border:1px solid #efe6d4}.hb-wc i{font-style:normal;font-size:20px}.hb-wc em{font-style:normal;color:#b0573a;font-size:14px}
.hb-page{position:relative;min-height:420px;border-radius:6px;padding:22px 22px 28px 46px;background:#fffdf7 repeating-linear-gradient(transparent 0 29px,#e9e2d0 29px 30px);background-position:0 12px;box-shadow:0 2px 10px rgba(0,0,0,.08),inset 34px 0 0 -32px #f0b8b8;overflow:hidden;font-family:"Songti SC","Noto Serif SC",Georgia,serif;color:#3a3226}
.hb-date{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}.hb-date b{font-size:44px;font-weight:400;line-height:1}.hb-date span{font-size:12px;letter-spacing:2px;color:#8b7d66}.hb-date i{font-style:normal;font-size:22px}
.hb-sum{font-size:15px;line-height:30px}.hb-sum a{color:#b07a3a;cursor:pointer}.hb-q{font-size:14px;line-height:30px;margin-top:6px;max-width:70%}.hb-q i{font-style:normal;font-size:12px;color:#8b7d66;margin-left:6px}.hb-q.me{color:#6b4f8a}
.hb-note{margin-top:16px;max-width:70%;margin-left:auto;transform:rotate(-2deg);color:#b0453a;font-size:19px;line-height:1.5}.hb-note i{display:block;font-style:normal;font-size:13px;text-align:right}
.hb-stk{position:absolute;width:86px;cursor:grab;touch-action:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.18));user-select:none}.hb-stks{display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:6px}.hb-stks img{width:100%;aspect-ratio:1;object-fit:contain;background:#f7f5ef;border-radius:10px;padding:4px;box-sizing:border-box;cursor:pointer}
.hb-wg>div:last-child{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.hb-wg i{aspect-ratio:1;border-radius:3px;background:rgba(128,128,128,.12)}.hb-wg i.c{background:#f0d8b0}.hb-wg i.w{background:#d79a52}.hb-wg i.t{box-shadow:0 0 0 1.5px #b0573a}`);
X.mini({ id: 'gyxHandbook', icon: '📒', title: '手帐时间线', desc: '聊天整理成日 / 周 / 月的手帐，能贴贴纸', cat: '回忆', onOpen: () => window.gyxHandbookOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.days = D.days || {}; })();
