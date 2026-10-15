/* 🆘 TA被困了：学《Lifeline》——TA 出了状况（山里迷路、困在停电的电梯、末班车坐过站……），按真实时间给你发消息求助。你替 TA 拿主意，TA 照做；TA 说「手机快没电了，两小时后再找你」，就真的两小时后才来。你的每个选择决定 TA 能不能平平安安回来。消息就发在你们的聊天里 */
if (window.__gyxStuck) return; window.__gyxStuck = 1;
X.feat('gyxStuck', { n: '🆘 TA被困了', desc: 'TA 出了状况，按真实时间发消息向你求助，你替 TA 拿主意' });
const S = X.store('stuck');
let D = { runs: [], speed: 'real' };   // run: {id,cid,at,title,setting,goal,risk,steps:[{who:'ta'|'me',t,at}],choices:[{t,r}],pending:{msgs,choices,end},nextAt,n,end,endAt}
const SPEED = { real: ['真实时间', 1], fast: ['快一点（等十分之一）', .1], now: ['不等', 0] };
const save = () => S.set('d', D);
const DEF_OPEN = `{{角色}}
你遇到了一件麻烦事，被困住了，需要她（{{她}}）隔着手机帮你拿主意——像游戏《Lifeline》那样。
要符合你的身份和世界观（{{要求}}），可以是：山里迷路、困在停电的电梯、末班车坐过了站、暴雨里车抛锚、在陌生城市丢了钱包……不要太黑暗，不要涉及违法。
你以前遇到过的：{{以前}}（别重复）
只输出 JSON：{"title":"一句话标题，12字内","setting":"你在哪、什么处境，40字内","goal":"要怎样才算平安，20字内","msgs":["你发给她的第一条消息","第二条（可以没有）"],"choices":[{"t":"她可以回的选项1，12字内","r":0},{"t":"选项2","r":1}]}
r 是这个选择的危险程度：-1 更稳妥，0 一般，1 有点冒险，2 很冒险。消息要像真的在手机上打字：短、慌、带错字也行。`;
const DEF_STEP = `{{角色}}
你被困住了：{{处境}}。要做到：{{目标}}。
到现在为止：
{{经过}}
她刚刚回你：「{{她选的}}」。你决定照她说的做。现在是第 {{第几步}} 步。{{结局要求}}
写接下来发生的事，只输出 JSON：
{"now":["你马上回她的消息（1~2条，短）"],"wait":等多少分钟才有下文（0~90，去做事、手机没电、没信号的时候就写大一点）,"later":["等完以后你发来的消息（1~3条）"],"choices":[{"t":"她能回的选项，12字内","r":0},{"t":"…","r":1}],"end":null}
结局那一步 choices 写 []，end 写 "safe" 或 "hurt"。消息要像真的在手机上打字。`;
X.plGroup('🆘 TA被困了', 'gyxStuck', [['stuck.open', 'TA 被困住、第一次向你求助', '开新的一局时', '{{角色}}：TA 的人设；{{她}}：你的名字；{{要求}}：世界观提醒；{{以前}}：以前被困过的事'], ['stuck.step', '你拿了主意以后，接下来发生什么', '你每选一次', '{{处境}} {{目标}} {{经过}} {{她选的}} {{第几步}} {{结局要求}}']], { 'stuck.open': DEF_OPEN, 'stuck.step': DEF_STEP });
const LOCAL = { title: '山里迷路了', setting: '下山时走错了岔路，天快黑了，手机只剩 30% 电', goal: '天黑前找到下山的路', msgs: ['那个……我好像迷路了', '天快黑了，我手机只有30%的电'], choices: [{ t: '原地别动，等我报警', r: -1 }, { t: '往有水声的地方走', r: 1 }] };
const LSTEP = [{ now: ['好，听你的'], wait: 20, later: ['我看到一块路牌了！但是字掉了一半', '左边那条路好像有灯光'], choices: [{ t: '去有灯光的地方', r: 0 }, { t: '先拍照发我看看', r: -1 }] }, { now: ['嗯嗯'], wait: 30, later: ['是一个护林站！有个大爷在', '他说可以开车送我下山'], choices: [{ t: '谢谢大爷，跟他走', r: 0 }, { t: '先问清楚再上车', r: -1 }] }];
const active = cid => D.runs.find(r => !r.end && (!cid || r.cid === String(cid)));
const chatPush = (c, who, t, run) => {
    if (who === 'ta') return X.say(c, t, { gyxStuck: run.id });
    try { const sid = String(c.id); (globalChats[sid] = globalChats[sid] || []).push({ sender: 'me', text: t, timestamp: Date.now(), readBy: [], gyx: 1, gyxStuck: run.id }); saveAllData(); if (String(currentChatSessionId) === sid) renderChatMessages(); } catch (e) {}
};
function deliver(run, msgs) { const c = X.char(run.cid); (msgs || []).map(X.plain).filter(Boolean).forEach(t => { run.steps.push({ who: 'ta', t, at: Date.now() }); if (c) chatPush(c, 'ta', t, run); }); }
const fixChoices = a => (Array.isArray(a) ? a : []).map(x => ({ t: X.plain(x && (x.t || x)).slice(0, 24), r: Math.max(-1, Math.min(2, +(x && x.r) || 0)) })).filter(x => x.t).slice(0, 3);
async function start(c) {
    if (!c || active(c.id)) return null;
    const past = D.runs.filter(r => r.cid === String(c.id)).slice(0, 5).map(r => r.title).join('、') || '没有';
    let o = X.bailu() ? null : X.json(await X.ask(X.pl('stuck.open', DEF_OPEN, { 角色: X.who(c), 她: X.me(c), 要求: '你的世界观和身份', 以前: past })));
    if (!o || !o.title || !Array.isArray(o.msgs) || fixChoices(o.choices).length < 2) o = LOCAL;
    const run = { id: 'st' + Date.now().toString(36), cid: String(c.id), at: Date.now(), title: X.plain(o.title), setting: X.plain(o.setting), goal: X.plain(o.goal), risk: 0, n: 0, steps: [], choices: fixChoices(o.choices), pending: null, nextAt: 0, end: null };
    D.runs.unshift(run); D.runs = D.runs.slice(0, 40); deliver(run, o.msgs); await save();
    X.notify(c, `🆘 <b>${X.esc(X.name(c))}</b> ${X.v('好像遇到麻烦了', '在向你求助', '出状况了')}`, run.setting, X.go('gyxStuckOpen', c.id));
    X.toast(X.v('🆘 TA 出状况了', '🆘 TA 在找你', '🆘 快看看 TA'), run.title);
    return run;
}
async function pick(run, t, r) {
    const c = X.char(run.cid); if (!c || run.end || run.pending || run.busy) return;
    run.busy = true; run.choices = []; run.n++; run.risk += r || 0;
    run.steps.push({ who: 'me', t, at: Date.now() }); chatPush(c, 'me', t, run); await save(); window.gyxStuckOpen(run.cid);
    const last = run.n >= 7, endKind = run.risk >= 4 ? 'hurt' : 'safe';
    const how = run.steps.slice(-14).map(s => (s.who === 'ta' ? '你：' : '她：') + s.t).join('\n');
    let o = X.bailu() ? null : X.json(await X.ask(X.pl('stuck.step', DEF_STEP, { 角色: X.who(c), 处境: run.setting, 目标: run.goal, 经过: how, 她选的: t, 第几步: run.n, 结局要求: last ? `这是最后一步，要写出结局：${endKind === 'safe' ? '你平平安安脱困了' : '你脱困了，但受了点小伤 / 吃了点苦头（不要太严重）'}。end 写 "${endKind}"。` : (run.n >= 5 ? '快到结局了，往脱困的方向推。' : '') })));
    if (!o || !Array.isArray(o.later)) { const L = LSTEP[(run.n - 1) % LSTEP.length]; o = last ? { now: ['好'], wait: 10, later: endKind === 'safe' ? ['我到了！安全了', '谢谢你一直陪着我'] : ['到了……脚扭了一下，不过没事', '幸好有你'], choices: [], end: endKind } : L; }
    deliver(run, o.now);
    const ch = fixChoices(o.choices), end = last || o.end ? (o.end === 'hurt' || o.end === 'safe' ? o.end : endKind) : null;
    run.pending = { msgs: (o.later || []).slice(0, 3), choices: end ? [] : (ch.length >= 2 ? ch : [{ t: '继续', r: 0 }, { t: '小心点', r: -1 }]), end };
    const wait = Math.max(0, Math.min(120, +o.wait || 0)) * 60000 * SPEED[D.speed || 'real'][1];
    run.nextAt = Date.now() + wait; run.busy = false; await save();
    if (wait <= 1000) await flush(run); else window.gyxStuckOpen(run.cid);
}
async function flush(run) {
    const p = run.pending; if (!p) return; run.pending = null; deliver(run, p.msgs); run.choices = p.choices;
    const c = X.char(run.cid);
    if (p.end) { run.end = p.end; run.endAt = Date.now(); X.notify(c, `🆘 <b>${X.esc(X.name(c))}</b> ${p.end === 'safe' ? X.v('平安了', '脱困了') : '脱困了，但吃了点苦头'}`, run.title, X.go('gyxStuckOpen', run.cid)); }
    else X.notify(c, `🆘 <b>${X.esc(X.name(c))}</b> ${X.v('有消息了', '回来了', '又发来消息')}`, X.plain(p.msgs[0] || ''), X.go('gyxStuckOpen', run.cid));
    await save(); if (document.getElementById('gyxStuckOv')) window.gyxStuckOpen(run.cid);
}
setInterval(() => { try { D.runs.filter(r => r.pending && Date.now() >= r.nextAt).forEach(flush); } catch (e) {} }, 20000);
window.gyxStuckStart = async cid => { const c = X.char(cid) || X.cur(); if (!c) return; if (active(c.id)) return window.gyxStuckOpen(c.id); const b = document.getElementById('gyxStBtn'); if (b) { b.disabled = true; b.textContent = 'TA 那边好像出事了… ⏳'; } await start(c); window.gyxStuckOpen(c.id); };
window.gyxStuckPick = (id, i) => { const r = D.runs.find(x => x.id === id); if (r && r.choices[i]) pick(r, r.choices[i].t, r.choices[i].r); };
window.gyxStuckFree = id => { const r = D.runs.find(x => x.id === id), el = document.getElementById('gyxStFree'); const t = el && el.value.trim(); if (r && t) pick(r, t.slice(0, 60), 0); };
window.gyxStuckSpeed = v => { D.speed = v; save(); window.gyxStuckOpen(); };
window.gyxStuckSkip = id => { const r = D.runs.find(x => x.id === id); if (r && r.pending) { r.nextAt = 0; flush(r); } };
window.gyxStuckDel = async id => { D.runs = D.runs.filter(r => r.id !== id); await save(); window.gyxStuckOpen(); };
window.gyxStuckData = () => D;
window.gyxStuckOpen = function (who) {
    const c = X.char(who) || (active() && X.char(active().cid)) || X.cur(); if (!c) return;
    const run = active(c.id), past = D.runs.filter(r => r.cid === String(c.id) && r.end);
    const left = run && run.pending ? Math.max(0, run.nextAt - Date.now()) : 0;
    X.panel('gyxStuckOv', '🆘 ' + X.esc(X.name(c)) + ' 被困了', `<div class="gyx-row">${X.whoSel(c.id, 'gyxStuckOpen')}<select class="gyx-who" onchange="gyxStuckSpeed(this.value)">${Object.keys(SPEED).map(k => `<option value="${k}"${D.speed === k ? ' selected' : ''}>${SPEED[k][0]}</option>`).join('')}</select></div>
      ${run ? `<div class="gyx-card"><b>${X.esc(run.title)}</b><div class="gyx-tip">${X.esc(run.setting)} · 目标：${X.esc(run.goal)} · 第 ${run.n} 步</div></div>
        <div class="st-log">${run.steps.slice(-16).map(s => `<div class="st-m ${s.who}">${X.esc(s.t)}</div>`).join('')}</div>
        ${run.busy ? `<div class="gyx-tip">${X.v('TA 正在照你说的做……', '等等，TA 在回……')}</div>` : run.pending ? `<div class="gyx-tip">📵 ${X.v('TA 去办事了', 'TA 那边没信号了', 'TA 说等一下')}，大概 ${Math.ceil(left / 60000)} 分钟后有下文。消息来了会通知你。 <span style="cursor:pointer;color:#1d9bf0" onclick="gyxStuckSkip('${run.id}')">不想等 ›</span></div>`
          : `${run.choices.map((x, i) => `<button class="gyx-btn lite st-o" onclick="gyxStuckPick('${run.id}',${i})">${X.esc(x.t)}</button>`).join('')}<div class="gyx-row"><input id="gyxStFree" class="gyx-in" style="flex:1" placeholder="或者自己打一句告诉 TA 怎么做"><button class="gyx-btn" onclick="gyxStuckFree('${run.id}')">回</button></div>`}`
        : `<div class="gyx-tip">${X.v('TA 现在好好的。', 'TA 这会儿没什么事。')}自主模式里 TA 偶尔会真的遇到状况来找你；也可以现在就开一局。</div><button id="gyxStBtn" class="gyx-btn" onclick="gyxStuckStart('${c.id}')">开一局</button>`}
      <div class="gyx-tip">消息会发在你们的聊天里。「真实时间」就是 TA 说等两小时，就真的两小时后才回来。你的选择越冒险，结局越可能吃点苦头。</div>
      ${past.length ? '<h4 class="st-h">以前被困过</h4>' + past.slice(0, 10).map(r => `<div class="st-r"><b>${X.esc(r.title)}</b> ${r.end === 'safe' ? '✅ 平安' : '🩹 吃了点苦头'}<span>${new Date(r.at).toLocaleDateString()} · ${r.n} 步</span><i onclick="gyxStuckDel('${r.id}')">删</i></div>`).join('') : ''}`);
    const lg = document.querySelector('#gyxStuckOv .st-log'); if (lg) lg.scrollTop = lg.scrollHeight;
};
X.ctx(id => { const r = active(id); if (r) return `【你被困住了】${r.setting}。要做到：${r.goal}。她在手机那头帮你拿主意（已经第 ${r.n} 步）。平时聊天也带着这个处境：着急、手机电量、信号，别突然没事了。`; const e = D.runs.find(x => x.cid === String(id) && x.end && Date.now() - x.endAt < 3 * 864e5); return e ? `【前几天你被困过】「${e.title}」，最后${e.end === 'safe' ? '平平安安' : '吃了点苦头才'}脱困，她一直在手机那头陪着你。` : ''; }, 'gyxStuck');
X.inj('gyxStuck', [['你被困住了', 'TA 正被困着', '一局还没结束时，TA 平时聊天也带着这个处境。'], ['前几天你被困过', 'TA 前几天被困过', '结束后三天内 TA 记得这件事。']]);
X.action({ key: 'gyx_stuck', label: '出了点状况被困住了，向她求助（真实时间）', hint: 'TA被困了', need: c => !active() && !D.runs.some(r => r.cid === String(c.id) && Date.now() - r.at < 6 * 864e5), run: async c => (await start(c)) ? '被困住了，向你求助' : null }, 'gyxStuck');
X.today(() => ({ title: '🆘 被困了', rows: D.runs.filter(r => !r.end && X.char(r.cid)).map(r => ({ t: X.name(X.char(r.cid)), x: X.esc(r.title) + (r.pending ? ' · 等 TA 消息' : ' · 等你拿主意'), go: `gyxStuckOpen('${r.cid}')` })) }), 'gyxStuck');
X.widget('gyxStuckW', { n: 'TA被困了', sizes: ['s', 'm'], tap: () => window.gyxStuckOpen(), r: w => { const r = active(); return X.gw(w, '🆘', '被困了', r ? [X.esc(X.name(X.char(r.cid))), r.pending ? '等 TA 消息' : '等你拿主意'] : ['TA 都平安']); } }, 'gyxStuck');
X.memArr({ k: 'gyxStuck', ico: '🆘', n: 'TA 被困过的事', d: 'TA 遇到过的状况和结局（删了 TA 就不记得）', arr: () => D.runs, field: 'title', text: x => `${x.title}：${x.setting}${x.end ? (x.end === 'safe' ? '（平安）' : '（吃了点苦头）') : '（还没结束）'}`, edit: (x, v) => { x.title = String(v).split('：')[0]; }, save }, 'gyxStuck');
X.css('gyxStuckCss', `.st-log{max-height:46vh;overflow:auto;background:#f7f7f9;border-radius:16px;padding:10px;margin:8px 0;display:flex;flex-direction:column;gap:6px}.st-m{max-width:80%;padding:7px 11px;border-radius:14px;font-size:14px;line-height:1.55;background:#fff;align-self:flex-start;box-shadow:0 1px 2px rgba(0,0,0,.05)}.st-m.me{align-self:flex-end;background:#1d1d1f;color:#fff}.st-o{display:block;width:100%;text-align:left;margin:6px 0}.st-h{font-size:14px;margin:14px 0 6px}.st-r{position:relative;padding:8px 26px 8px 0;border-bottom:1px solid #f2f2f4;font-size:13.5px}.st-r span{display:block;color:#999;font-size:12px}.st-r i{position:absolute;right:0;top:9px;font-style:normal;font-size:11px;color:#aaa;cursor:pointer}`);
X.mini({ id: 'gyxStuck', icon: '🆘', title: 'TA被困了', desc: 'TA 出了状况，按真实时间向你求助', cat: '一起做', onOpen: () => window.gyxStuckOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxStuck', name: 'TA被困了', icon: '🆘', getStatus: () => null, onResume: () => window.gyxStuckOpen(), onStart: (sid, opp) => window.gyxStuckOpen(String((opp || [])[0] || sid || '')) }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.runs = (D.runs || []).map(r => Object.assign(r, { busy: false })); })();
