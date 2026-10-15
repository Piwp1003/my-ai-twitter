/* 🪴 TA的成长日志：跟你在一起久了，TA 自己也会变——更耐心了、学会说出口了、不那么怕某件事了。每隔一阵 TA 会发现自己的一点变化，提一条「人设小修改」：你点同意，才真的写进 TA 的人设；不同意就当没发生过。改过的随时能撤回 */
if (window.__gyxEvolve) return; window.__gyxEvolve = 1;
X.feat('gyxEvolve', { n: '🪴 TA的成长日志', desc: 'TA 因为你慢慢变了，提人设小修改，你同意才写进去' });
const S = X.store('evolve');
let D = { log: [], last: {} };   // log: {id, cid, at, change, why, edit, state:'wait'|'yes'|'no', decidedAt}
const DAY = 864e5, HEAD = '【和她在一起之后的变化】';
const save = () => S.set('d', D);
const msgsSince = (cid, t) => ((typeof globalChats !== 'undefined' && globalChats[cid]) || []).filter(m => m.sender !== 'system' && m.timestamp > t).length;
const persist = () => { try { if (typeof saveAllData === 'function') saveAllData(); } catch (e) {} };
function addToPersona(c, line) { const p = String(c.persona || ''); c.persona = p.includes(HEAD) ? p.replace(HEAD, HEAD + '\n- ' + line) : (p.trimEnd() + '\n\n' + HEAD + '\n- ' + line); persist(); }
function removeFromPersona(c, line) { let p = String(c.persona || ''); p = p.replace('\n- ' + line, ''); if (new RegExp(HEAD.replace(/[【】]/g, '\\$&') + '\\s*$').test(p)) p = p.replace(new RegExp('\\n*' + HEAD.replace(/[【】]/g, '\\$&') + '\\s*$'), ''); c.persona = p; persist(); }
async function reflect(c, force) {
    if (!c) return null; const id = String(c.id);
    if (D.log.some(x => x.cid === id && x.state === 'wait')) return null;
    const done = D.log.filter(x => x.cid === id && x.state === 'yes').map(x => x.edit);
    const o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n你们最近的聊天：\n${X.recent(c, 40)}\n\n你已经承认过的变化：${done.join('；') || '还没有'}\n回头看看：跟她相处这段时间，你自己有没有一点真实的、细小的变化？（比如更耐心了、学会把在意说出口、不那么怕某件事、开始做以前不会做的事）要有依据——是她的哪句话、哪件事让你变的。没有就是没有，不要硬编。\n只输出 JSON：{"change":"你发现自己的变化，第一人称，25字内","why":"因为她的哪句话 / 哪件事，30字内","edit":"如果写进人设，加的那一句（第三人称描述你，30字内）"} 或者 {"none":true}`));
    D.last[id] = Date.now(); await save();
    if (!o || o.none || !o.change || !o.edit) return null;
    const x = { id: 'ev' + Date.now().toString(36), cid: id, at: Date.now(), change: X.plain(o.change), why: X.plain(o.why || ''), edit: X.plain(o.edit), state: 'wait' };
    D.log.unshift(x); await save(); return x;
}
window.gyxEvolveDecide = async (id, yes) => {
    const x = D.log.find(y => y.id === id), c = x && X.char(x.cid); if (!x || !c || x.state !== 'wait') return;
    x.state = yes ? 'yes' : 'no'; x.decidedAt = Date.now(); if (yes) addToPersona(c, x.edit); await save();
    X.say(c, yes ? X.v('……谢谢你让我变成更好的人。', '嗯，这是因为你。', '那我就当这是真的了。') : X.v('好，那我还是原来的我。', '也许是我想多了。', '嗯，不急。'));
    window.gyxEvolveOpen(x.cid);
};
window.gyxEvolveUndo = async id => { const x = D.log.find(y => y.id === id), c = x && X.char(x.cid); if (!x || !c || x.state !== 'yes') return; removeFromPersona(c, x.edit); x.state = 'no'; x.undone = Date.now(); await save(); X.toast('🪴 撤回了', '这一句已经从人设里拿掉'); window.gyxEvolveOpen(x.cid); };
window.gyxEvolveRun = async (cid, btn) => { const c = X.char(cid); if (!c) return; if (btn) { btn.disabled = true; btn.textContent = X.v('TA 在回想……', 'TA 在照镜子……'); } const x = await reflect(c, true); X.toast('🪴 ' + (x ? X.v('TA 发现自己变了一点', '有一点不一样了') : X.v('TA 觉得自己还是原来的样子', '暂时没有变化')), x ? x.change : ''); window.gyxEvolveOpen(cid); };
window.gyxEvolveData = () => D;
window.gyxEvolveOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), L = D.log.filter(x => x.cid === cid), wait = L.filter(x => x.state === 'wait'), yes = L.filter(x => x.state === 'yes');
    X.panel('gyxEvolveOv', '🪴 ' + X.esc(X.name(c)) + ' 的成长日志', `<div class="gyx-row">${X.whoSel(cid, 'gyxEvolveOpen')}<button class="gyx-btn lite" onclick="gyxEvolveRun('${cid}',this)">让 TA 回头看看自己</button></div>
      <div class="gyx-tip">${X.v('人会因为喜欢的人慢慢改变。', 'TA 的变化，要你点头才算数。', '每一句都是因为你。')}TA 隔一阵会自己回想（自主模式里）；你同意的那句会写进 TA 人设最后的「${HEAD}」里，随时能撤回。</div>
      ${wait.map(x => `<div class="gyx-card ev-w"><b>🪴 ${X.esc(x.change)}</b><div class="gyx-tip">因为：${X.esc(x.why)}</div><div class="ev-edit">想写进人设：「${X.esc(x.edit)}」</div><div class="gyx-row"><button class="gyx-btn" onclick="gyxEvolveDecide('${x.id}',true)">同意，写进去</button><button class="gyx-btn lite" onclick="gyxEvolveDecide('${x.id}',false)">不用</button></div></div>`).join('')}
      <h4 class="ev-h">已经变了的（${yes.length}）</h4>${yes.map(x => `<div class="ev-r"><span>✓</span><div><b>${X.esc(x.edit)}</b><em>${new Date(x.decidedAt).toLocaleDateString()} · ${X.esc(x.why)}</em></div><i onclick="gyxEvolveUndo('${x.id}')">撤回</i></div>`).join('') || '<div class="gyx-tip">还没有。</div>'}
      ${L.filter(x => x.state === 'no').length ? `<div class="gyx-tip">没写进去的：${L.filter(x => x.state === 'no').map(x => X.esc(x.change)).join(' / ')}</div>` : ''}`);
};
X.ctx(id => { const w = D.log.find(x => x.cid === String(id) && x.state === 'wait'); return w ? `【你最近发现自己有点变了】${w.change}（因为${w.why}）。她还没表态。` : ''; }, 'gyxEvolve');
X.action({ key: 'gyx_evolve', label: '回头看看自己：跟她在一起之后，有没有哪里变了', hint: 'TA的成长日志', need: c => Date.now() - (D.last[c.id] || 0) > 5 * DAY && msgsSince(String(c.id), D.last[c.id] || 0) >= 60 && !D.log.some(x => x.cid === String(c.id) && x.state === 'wait'),
    run: async c => { const x = await reflect(c); if (!x) return null; X.notify(c, `🪴 <b>${X.esc(X.name(c))}</b> 发现自己变了一点`, x.change, X.go('gyxEvolveOpen', c.id)); X.say(c, X.v('我发现……我好像变了一点。', '跟你在一起久了，我有点不一样了。') + `（${x.change}）`); return '发现自己变了一点'; } }, 'gyxEvolve');
X.today(() => ({ title: '🪴 成长日志', rows: D.log.filter(x => x.state === 'wait' && X.char(x.cid)).map(x => ({ t: X.name(X.char(x.cid)), x: '等你点头：' + X.esc(x.change), go: `gyxEvolveOpen('${x.cid}')` })) }), 'gyxEvolve');
X.widget('gyxEvolveW', { n: 'TA的成长日志', sizes: ['s', 'm'], tap: () => window.gyxEvolveOpen(), r: w => { const y = D.log.filter(x => x.state === 'yes'), wt = D.log.filter(x => x.state === 'wait'); return X.gw(w, '🪴', '成长日志', [wt.length ? wt.length + ' 条等你点头' : '变了 ' + y.length + ' 点', y[0] ? X.esc(y[0].edit).slice(0, 14) : '']); } }, 'gyxEvolve');
X.memArr({ k: 'gyxEvolve', ico: '🪴', n: 'TA的成长日志', d: 'TA 因为你而有的变化（同意了的已经写进人设；在这里删掉不会改人设，要撤回去成长日志里点「撤回」）', arr: () => D.log, field: 'change', text: x => x.change, meta: x => ({ wait: '等你点头', yes: '已写进人设', no: '没写进去' })[x.state] + ' · ' + new Date(x.at).toLocaleDateString(), save }, 'gyxEvolve');
X.css('gyxEvolveCss', `.ev-w{background:#f1faf3}.ev-w b{font-size:15.5px}.ev-edit{font-size:13.5px;margin:6px 0;color:#2f7a45}.ev-h{font-size:14px;margin:14px 0 6px}.ev-r{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f2f2f4}.ev-r span{color:#34c759}.ev-r div{flex:1}.ev-r b{font-weight:500;font-size:14px}.ev-r em{display:block;font-style:normal;font-size:12px;color:#8e8e93}.ev-r i{font-style:normal;font-size:12px;color:#8e8e93;cursor:pointer}`);
X.mini({ id: 'gyxEvolve', icon: '🪴', title: 'TA的成长日志', desc: 'TA 因为你慢慢变了，你同意才写进人设', cat: '陪伴', onOpen: () => window.gyxEvolveOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.log = D.log || []; D.last = D.last || {}; })();
