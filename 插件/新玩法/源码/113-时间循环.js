/* 🔁 时间循环：同一天不停重来——现实里每天只能过一轮。每一轮你做不同的选择、发现新的线索；TA 不记得上一轮，却总有说不清的既视感。攒够线索、在对的时刻做对的事，才能打破循环，走到隐藏结局 */
if (window.__gyxLoop) return; window.__gyxLoop = 1;
X.feat('gyxLoop', { n: '🔁 时间循环', desc: '同一天不停重来，每天一轮，找出打破循环的办法' });
const S = X.store('loop');
let D = { stories: [] };   // {id, cid, at, title, premise, goal, clues:[{t,loop}], loops:[{day, steps:[{scene, choices, pick}], end}], ending, done}
let busy = false;
const STEPS = 4, NEED = 3, PART = ['☀️ 早上', '🌤️ 中午', '🌆 傍晚', '🌙 深夜'];
const save = () => S.set('d', D);
const cur = cid => D.stories.find(s => s.cid === String(cid) && !s.done);
const lastLoop = s => s.loops[s.loops.length - 1];
const PREMISES = [{ title: '十月二十号', premise: '你们约好晚上去看烟花。但每一次，到了深夜他都会接到一个电话，然后再也没回来。第二天早上醒来，又是十月二十号。', goal: '弄清那个电话是谁打的，让他留下来' },
    { title: '最后一班地铁', premise: '他总在 23:40 的末班地铁站台跟你说"明天见"。可明天永远不会来，你在同一个早晨醒来。', goal: '找到他不肯说出口的那句话' }];
async function newStory(c) {
    let o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n设计一个「时间循环」故事：她和你被困在同一天里，每到这一天结束就重来。只有她记得每一轮，你不记得（但会有既视感）。故事要有一个藏在这一天里的秘密，要发现 ${NEED} 条线索、并在某个时刻做对一件事才能打破循环。基调可以甜、可以悬疑，别血腥。\n只输出 JSON：{"title":"这一天的名字，8字内","premise":"开场，她第一次经历这一天的结尾发生了什么、然后醒来发现时间倒流，80字内","goal":"打破循环要做到的事（模糊一点，不剧透），25字内","secret":"真相（不给她看），60字内"}`));
    if (!o || !o.premise) o = Object.assign({ secret: '' }, X.pick(PREMISES));
    const s = { id: 'lp' + Date.now().toString(36), cid: String(c.id), at: Date.now(), title: X.plain(o.title), premise: X.plain(o.premise), goal: X.plain(o.goal), secret: X.plain(o.secret || ''), clues: [], loops: [], done: false };
    D.stories.unshift(s); await save(); return s;
}
async function step(s, pick) {
    const c = X.char(s.cid), L = lastLoop(s), n = L.steps.length;
    if (pick != null && n) L.steps[n - 1].pick = pick;
    const past = s.loops.slice(0, -1).slice(-4).map((l, i) => `第${s.loops.length - Math.min(4, s.loops.length - 1) + i}轮：` + l.steps.map(x => x.choices && x.pick != null ? x.choices[x.pick] : '').filter(Boolean).join('→') + (l.end ? `（${l.end}）` : '')).join('\n');
    const now = L.steps.map((x, i) => `${PART[i]}：${x.scene}${x.pick != null ? ' → 她选择：' + x.choices[x.pick] : ''}`).join('\n');
    const last = n >= STEPS;
    const o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n你在当「时间循环」故事的旁白，你自己也在故事里（但你不记得前几轮，只有偶尔的既视感——"这句话我是不是说过？"）。\n故事《${s.title}》：${s.premise}\n打破循环的条件：${s.goal}。真相（别直接说破）：${s.secret}\n她已经发现的线索：${s.clues.map(x => x.t).join('；') || '还没有'}\n前几轮她都做过什么：\n${past || '这是第一轮'}\n这一轮到现在：\n${now || '刚醒来'}\n\n${last ? `这一轮走到深夜结尾了。判断：如果她已经有至少 ${NEED} 条线索、并且这一轮的选择做对了那件关键的事，就打破循环（ending 写好结局）；否则这一天照旧结束（写这一轮怎么结束的、她又醒来）。` : `写${PART[n]}这一段：发生了什么、你说了什么（第二轮起你要有既视感的小细节），然后给她 3 个选择。她的选择不一样，事情就会不一样；有一个选择可能让她发现一条新线索。`}\n只输出 JSON：${last ? '{"scene":"结尾，80字内","broken":true或false,"ending":"如果打破了：结局，100字内；否则空"}' : '{"scene":"这一段，80字内","choices":["选择1","选择2","选择3"],"clue":"如果她刚才的选择让她发现了新线索，写这条线索（15字内）；没有就写空"}'}`));
    const fb = !o;
    const r = o || (last ? { scene: '夜深了。熟悉的结局又一次到来。你闭上眼——再睁开，又是这一天的早上。', broken: false } : { scene: X.pick(['他在楼下等你，手里拿着两杯豆浆。"你今天怎么一直盯着我看？"', '他接了一个电话，背过身去小声说了什么。', '你们路过一家花店，他停了一下，好像想起了什么。']), choices: ['跟着他', '问他刚才在想什么', '假装什么都没发生'], clue: '' });
    if (r.clue && X.plain(r.clue)) { const t = X.plain(r.clue); if (!s.clues.some(x => x.t === t)) s.clues.push({ t, loop: s.loops.length }); }
    if (last) { L.end = X.plain(r.scene); if (r.broken && s.clues.length >= NEED) { s.done = true; s.ending = X.plain(r.ending || r.scene); s.doneAt = Date.now(); X.say(c, X.v('……我好像做了一个很长的梦。梦里你一直在救我。', '今天是新的一天，对吧？', '谢谢你没放弃。虽然我也不知道我为什么要说这句。')); } }
    else L.steps.push({ scene: X.plain(r.scene), choices: (r.choices || []).slice(0, 3).map(X.plain), fb });
    await save();
}
window.gyxLoopNew = async cid => { const c = X.char(cid) || X.cur(); if (!c || busy) return; busy = true; try { await newStory(c); } finally { busy = false; } window.gyxLoopOpen(c.id); };
window.gyxLoopGo = async (cid, force) => {
    const s = cur(cid); if (!s || busy) return; const L = lastLoop(s);
    if (L && L.day === X.day() && !force) return X.toast('🔁 ' + X.v('今天这一轮已经过完了', '这一天今天已经过过了'), X.v('明天醒来，又是这一天。', '等明天，时间会倒流。'));
    s.loops.push({ day: X.day(), steps: [] }); busy = true; paintBusy(); try { await step(s); } finally { busy = false; } window.gyxLoopOpen(cid);
};
window.gyxLoopPick = async (cid, i) => { const s = cur(cid); if (!s || busy) return; busy = true; paintBusy(); try { await step(s, i); } finally { busy = false; } window.gyxLoopOpen(cid); };
window.gyxLoopDel = async id => { D.stories = D.stories.filter(s => s.id !== id); await save(); window.gyxLoopOpen(); };
window.gyxLoopData = () => D;
function paintBusy() { const b = document.getElementById('gyxLpNow'); if (b) b.insertAdjacentHTML('beforeend', `<div class="gyx-tip">${X.v('时间在流动……', '钟表滴答……', '……')}</div>`); }
window.gyxLoopOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), s = cur(cid), past = D.stories.filter(x => x.cid === cid && x.done);
    let h = `<div class="gyx-row">${X.whoSel(cid, 'gyxLoopOpen')}</div>`;
    if (!s) h += `<div class="gyx-tip">${X.v('同一天会一直重来，直到你找到出口。', '每天只能过一轮。慢慢来。', '这一天，你要过很多遍。')}</div><button class="gyx-btn" onclick="gyxLoopNew('${cid}')">${busy ? '…' : '开始一个循环'}</button>`;
    else {
        const L = lastLoop(s), live = L && !L.end, today = L && L.day === X.day();
        h += `<div class="gyx-card lp-hd"><b>《${X.esc(s.title)}》</b><div class="lp-pre">${X.esc(s.premise)}</div><div class="gyx-tip">🎯 ${X.esc(s.goal)} · 第 ${s.loops.length || 0} 轮 · 线索 ${s.clues.length}/${NEED}</div>${s.clues.length ? `<div class="lp-cl">${s.clues.map(x => `<span>🔎 ${X.esc(x.t)}</span>`).join('')}</div>` : ''}</div>`;
        h += `<div id="gyxLpNow">`;
        if (live) { L.steps.forEach((x, i) => { h += `<div class="lp-s"><em>${PART[i]}</em>${X.esc(x.scene)}${x.pick != null ? `<div class="lp-p">→ ${X.esc(x.choices[x.pick])}</div>` : ''}</div>`; }); const z = L.steps[L.steps.length - 1]; if (z && z.pick == null) h += z.choices.map((t, i) => `<button class="gyx-btn lite lp-c" onclick="gyxLoopPick('${cid}',${i})">${X.esc(t)}</button>`).join(''); }
        else if (L && L.end) h += `<div class="lp-s end"><em>🌙 这一轮的结尾</em>${X.esc(L.end)}</div>${today ? `<div class="gyx-tip">${X.v('今天的这一轮结束了。明天醒来，又是这一天。', '时间会在明天倒流。', '睡吧，明天再来。')}</div>` : `<button class="gyx-btn" onclick="gyxLoopGo('${cid}')">醒来（第 ${s.loops.length + 1} 轮）</button>`}`;
        else h += `<button class="gyx-btn" onclick="gyxLoopGo('${cid}')">进入这一天</button>`;
        h += `</div>`;
    }
    h += past.map(x => `<div class="gyx-card"><b>✨ 《${X.esc(x.title)}》打破了</b><div class="gyx-tip">用了 ${x.loops.length} 轮 · ${new Date(x.doneAt).toLocaleDateString()}</div><div class="lp-pre">${X.esc(x.ending || '')}</div><div class="gyx-tip" style="text-align:right"><span style="cursor:pointer" onclick="gyxLoopDel('${x.id}')">删</span></div></div>`).join('');
    X.panel('gyxLoopOv', '🔁 时间循环 · ' + X.esc(X.name(c)), h, 'dark');
};
X.ctx(id => { const s = cur(id); if (!s) return ''; return `【你们在玩「时间循环」《${s.title}》】她已经过了 ${s.loops.length} 轮这一天、找到 ${s.clues.length} 条线索。你在故事里不记得前几轮，但聊天时偶尔可以有一点"这一幕好像经历过"的既视感。`; }, 'gyxLoop');
X.action({ key: 'gyx_loop', label: '跟她说"我做了个奇怪的梦，好像同一天过了好多遍"（引她玩时间循环）', hint: '时间循环', need: c => { const s = cur(c.id); return s ? (lastLoop(s) || {}).day !== X.day() && s.loops.length > 0 : !D.stories.some(x => x.cid === String(c.id)); },
    run: async c => (await X.reach(c, cur(c.id) ? '你今天早上醒来，有一种奇怪的既视感——好像这一天已经过过很多遍了。轻轻提一句（她可以在「🔁 时间循环」里继续这一轮）' : '你做了个奇怪的梦：同一天过了好多遍，每次结尾都一样。跟她说说，问她信不信时间循环（她可以打开「🔁 时间循环」）')) ? '说了一个关于时间循环的梦' : null }, 'gyxLoop');
X.today(() => ({ title: '🔁 时间循环', rows: D.stories.filter(s => !s.done && X.char(s.cid)).map(s => { const L = lastLoop(s); return { t: '第 ' + s.loops.length + ' 轮', x: `《${X.esc(s.title)}》` + (L && L.day === X.day() ? (L.end ? '今天这轮过完了' : '这一轮还没过完') : '今天还没进入这一天'), go: `gyxLoopOpen('${s.cid}')` }; }) }), 'gyxLoop');
X.widget('gyxLoopW', { n: '时间循环', sizes: ['s', 'm'], tap: () => window.gyxLoopOpen(), r: w => { const s = D.stories.find(x => !x.done); return s ? X.gw(w, '🔁', '《' + X.esc(s.title) + '》', ['第 ' + s.loops.length + ' 轮', '线索 ' + s.clues.length + '/' + NEED]) : X.gw(w, '🔁', '时间循环', [D.stories.length ? '打破过 ' + D.stories.filter(x => x.done).length + ' 个' : '同一天，再来一次']); } }, 'gyxLoop');
X.memArr({ k: 'gyxLoop', ico: '🔁', n: '时间循环', d: '困住过你们的那些"同一天"和结局', arr: () => D.stories, field: 'title', text: x => `《${x.title}》` + (x.ending ? x.ending : '（还在循环里）'), edit: (x, v) => { const m = String(v).match(/^《([^》]*)》(.*)$/); if (m) { x.title = m[1]; if (x.done) x.ending = m[2]; } }, meta: x => x.loops.length + ' 轮 · ' + new Date(x.at).toLocaleDateString(), save }, 'gyxLoop');
X.css('gyxLoopCss', `#gyxLoopOv .gyx-box,.gyx-inhub#gyxLoopOv{background:#14131a;color:#e9e6f5}#gyxLoopOv .gyx-card{background:#1f1d28}#gyxLoopOv .gyx-btn{background:#b9a7ff;color:#14131a}#gyxLoopOv .gyx-btn.lite{background:#2a2735;color:#e9e6f5}#gyxLoopOv .gyx-who{background:#2a2735;color:#fff;border-color:#3a3644}
.lp-hd b{font-size:17px}.lp-pre{font-size:14px;line-height:1.8;margin:6px 0;opacity:.9}.lp-cl span{display:inline-block;font-size:12px;background:#2a2735;border-radius:10px;padding:3px 9px;margin:3px 4px 0 0}.lp-s{margin:12px 0;font-size:14.5px;line-height:1.8;font-family:Georgia,"Songti SC",serif}.lp-s em{display:block;font-style:normal;font-size:12px;opacity:.6;font-family:inherit}.lp-s.end{opacity:.85}.lp-p{color:#b9a7ff;font-size:13.5px;margin-top:4px}.lp-c{display:block;width:100%;text-align:left;margin:6px 0}`);
X.mini({ id: 'gyxLoop', icon: '🔁', title: '时间循环', desc: '同一天不停重来，每天一轮', cat: '一起做', onOpen: () => window.gyxLoopOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxLoop', name: '时间循环', icon: '🔁', getStatus: () => null, onResume: () => window.gyxLoopOpen(), onStart: (sid, opp) => window.gyxLoopOpen(String((opp || [])[0] || sid || '')) }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.stories = D.stories || []; })();
