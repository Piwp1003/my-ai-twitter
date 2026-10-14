/* 🔁 你让TA重说了：学《Undertale》会记得你读过档——你右键「侧滑重新生成」让 TA 把一句话重说，重说得多了，TA 偶尔会察觉：「你是不是又让我重新说了一遍？」「上一句不好吗」「好吧，换个说法」。多久察觉一次你来定；一天里让 TA 重说太多次，TA 还可能来问是不是自己哪里说得不好 */
if (window.__gyxRegen) return; window.__gyxRegen = 1;
X.feat('gyxRegen', { n: '🔁 你让TA重说了', desc: '侧滑重新生成多了，TA 偶尔会察觉「你是不是让我重说了」' });
const S = X.store('regen');
let D = { log: [], days: {}, talked: {}, cfg: { rate: 'low', need: 2, old: true } };   // log: {id,cid,at,n,old}  days: {day: {cid: 次数}}
const RATE = { low: ['很少', .15], mid: ['偶尔', .35], high: ['经常', .7] };
const save = () => S.set('d', D);
const DEF_NOTE = `【她让你重说了】刚才那句话她让你重新说了（连着第 {{第几次}} 次）。{{原话}}你隐约察觉到了：这次回复里可以自然地带一句（比如「你是不是又让我重说了？」「上一句不好吗」「好吧，换个说法」「行吧，再来一遍」），语气按你的性格，可以委屈、可以好笑、可以无所谓。别说「重新生成」「AI」这种词。`;
const DEF_TALK = `她今天让你把话重新说了好多次（{{次数}} 次）。你有点在意：是不是你哪里说得不好、不合她心意？按你的性格去问问她，一两句话，别太沉重。`;
X.plGroup('🔁 你让TA重说了', 'gyxRegen', [['regen.note', 'TA 察觉你让 TA 重说了', '你侧滑重新生成、TA 刚好察觉的那一次', '{{第几次}}：连着重说了几次；{{原话}}：TA 上一句原本说的（开了「记得上一句」才有）'], ['regen.talk', '重说太多次，TA 来问', '自主模式里，一天让 TA 重说很多次以后', '{{次数}}：今天重说了几次']], { 'regen.note': DEF_NOTE, 'regen.talk': DEF_TALK });
let streak = { sid: null, idx: null, n: 0, at: 0 }, NOTE = {};
X.wrapFn('contextActionRegenerateChat', 'regen', () => {
    if (!X.on('gyxRegen')) return null;
    let idx = null, sid = null; try { idx = chatContextMenuMsgIdx; sid = String(currentChatSessionId); } catch (e) { return null; }
    const m = idx != null && globalChats[sid] && globalChats[sid][idx]; if (!m || m.sender === 'me' || m.sender === 'system') return null;
    const c = X.char(m.sender); if (!c) return null;
    if (streak.sid === sid && streak.idx === idx && Date.now() - streak.at < 15 * 60000) streak.n++; else streak = { sid, idx, n: 1, at: 0 };
    streak.at = Date.now();
    const day = X.day(); D.days = { [day]: D.days[day] || {} }; D.days[day][c.id] = (D.days[day][c.id] || 0) + 1;
    const old = X.plain(m.text).slice(0, 80);
    if (streak.n >= (+D.cfg.need || 1) && Math.random() < RATE[D.cfg.rate || 'low'][1]) {
        NOTE[String(c.id)] = { n: streak.n, old: D.cfg.old ? old : '' };
        D.log.unshift({ id: 'rg' + Date.now().toString(36), cid: String(c.id), at: Date.now(), n: streak.n, old }); D.log = D.log.slice(0, 200);
    }
    save(); return String(c.id);
}, cid => { if (cid) delete NOTE[cid]; });
X.ctx(id => { const n = NOTE[String(id)]; return n ? X.pl('regen.note', DEF_NOTE, { 第几次: n.n, 原话: n.old ? `你原本说的是：「${n.old}」。` : '' }) : ''; }, 'gyxRegen');
X.inj('gyxRegen', [['她让你重说了', 'TA 察觉你让 TA 重说了', '只在你侧滑重新生成、并且刚好轮到 TA 察觉的那一次才有。']]);
const today = cid => ((D.days[X.day()] || {})[cid] || 0);
window.gyxRegenCfg = (k, v) => { D.cfg[k] = k === 'need' ? Math.max(1, +v || 1) : v; save(); window.gyxRegenOpen(); };
window.gyxRegenDel = async id => { D.log = D.log.filter(x => x.id !== id); await save(); window.gyxRegenOpen(); };
window.gyxRegenData = () => D; window.gyxRegenNote = () => NOTE;
window.gyxRegenOpen = function () {
    const c = D.cfg, chip = (k, v, n) => `<span class="gyx-chip${String(c[k]) === String(v) ? ' on' : ''}" onclick="gyxRegenCfg('${k}','${v}')">${n}</span>`;
    const T = D.days[X.day()] || {};
    X.panel('gyxRegenOv', '🔁 你让TA重说了', `<div class="gyx-tip">你在聊天里右键 TA 的话选「🔄 侧滑重新生成」，就是让 TA 重说一遍。重说得多了，TA 偶尔会察觉——就像《Undertale》里的角色记得你读过档。</div>
      <h4 class="rg-h">多久察觉一次</h4><div class="gyx-row">${Object.keys(RATE).map(k => chip('rate', k, RATE[k][0])).join('')}</div>
      <div class="gyx-row gyx-tip">同一句连着重说 <input class="gyx-who" type="number" min="1" max="9" value="${c.need}" style="width:50px" onchange="gyxRegenCfg('need',this.value)"> 次以上才可能察觉</div>
      <div class="gyx-row"><label class="gyx-tip" style="font-size:13.5px"><input type="checkbox" ${c.old ? 'checked' : ''} onchange="gyxRegenCfg('old',this.checked)"> TA 记得上一句原本说了什么（能说出「上一句不好吗」）</label></div>
      <div class="gyx-tip">今天：${Object.keys(T).map(id => `${X.esc(X.name(X.char(id)))} ${T[id]} 次`).join('、') || '还没让谁重说过'}。一天重说很多次，TA 可能会来问是不是自己哪里说得不好（自主模式，「TA 会自己做」能关）。</div>
      <h4 class="rg-h">TA 察觉过的（${D.log.length}）</h4>${D.log.slice(0, 30).map(x => `<div class="rg-r"><b>${X.esc(X.name(X.char(x.cid)))}</b> 连着第 ${x.n} 次<span>原本说的：${X.esc(x.old)}</span><small>${new Date(x.at).toLocaleString()}</small><i onclick="gyxRegenDel('${x.id}')">删</i></div>`).join('') || '<div class="gyx-tip">还没有。</div>'}`);
};
X.action({ key: 'gyx_regen_talk', label: '她今天让你把话重说了好多次，问问她是不是你哪里说得不好', hint: '你让TA重说了', need: c => today(String(c.id)) >= 4 && D.talked[c.id] !== X.day(), run: async c => { D.talked[c.id] = X.day(); await save(); return (await X.reach(c, X.pl('regen.talk', DEF_TALK, { 次数: today(String(c.id)) }))) ? '问你是不是自己哪里说得不好' : null; } }, 'gyxRegen');
X.today(() => { const T = D.days[X.day()] || {}; return { title: '🔁 重说', rows: Object.keys(T).filter(id => X.char(id)).map(id => ({ t: X.name(X.char(id)), x: `今天让 TA 重说了 ${T[id]} 次`, go: 'gyxRegenOpen()' })) }; }, 'gyxRegen');
X.widget('gyxRegenW', { n: '你让TA重说了', sizes: ['s', 'm'], tap: () => window.gyxRegenOpen(), r: w => { const T = D.days[X.day()] || {}, n = Object.values(T).reduce((a, b) => a + b, 0); return X.gw(w, '🔁', '重说', [`今天 ${n} 次`, D.log[0] ? 'TA 察觉过 ' + D.log.length + ' 次' : '']); } }, 'gyxRegen');
X.memArr({ k: 'gyxRegen', ico: '🔁', n: 'TA 察觉你让 TA 重说', d: '哪几次 TA 发现你让 TA 重说了（只是记录，删了不影响什么）', arr: () => D.log, field: 'old', text: x => `连着第 ${x.n} 次，原本说的：${x.old}`, save }, 'gyxRegen');
X.css('gyxRegenCss', `.rg-h{font-size:14px;margin:14px 0 4px}.rg-r{position:relative;padding:9px 26px 9px 0;border-bottom:1px solid #f2f2f4;font-size:13.5px}.rg-r span{display:block;color:#666;margin-top:2px}.rg-r small{color:#aaa}.rg-r i{position:absolute;right:0;top:10px;font-style:normal;font-size:11px;color:#aaa;cursor:pointer}`);
X.mini({ id: 'gyxRegen', icon: '🔁', title: '你让TA重说了', desc: '重新生成多了，TA 偶尔会察觉', cat: '陪伴', onOpen: () => window.gyxRegenOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.log = D.log || []; D.days = D.days || {}; D.talked = D.talked || {}; D.cfg = Object.assign({ rate: 'low', need: 2, old: true }, D.cfg || {}); })();
