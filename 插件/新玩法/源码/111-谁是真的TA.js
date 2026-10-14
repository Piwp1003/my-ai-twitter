/* 🎭 谁是真的TA：你问一个问题，三个"TA"同时回答——一个是真的，两个是冒牌货（模仿得很像，但不知道你们之间的事、语气细节也不对）。靠你对 TA 的了解认出真的那个；认错了，真的 TA 会吃醋 */
if (window.__gyxReal) return; window.__gyxReal = 1;
X.feat('gyxReal', { n: '🎭 谁是真的TA', desc: '三个 TA 同时回答，认出真的那个' });
const S = X.store('real');
let D = { games: [] };   // {id, cid, at, rounds:[{q, opts:[t,t,t], real, pick}], done, line}
let G = null, busy = false;
const ROUNDS = 3, L3 = ['A', 'B', 'C'];
const save = () => S.set('d', D);
const QS = ['你最喜欢我哪一点？', '我们第一次聊天你记得什么？', '如果明天世界末日，你今晚做什么？', '你最近在烦什么？', '你觉得我生气的时候像什么？', '你偷偷想过我们的以后吗？', '你最怕失去什么？', '用三个词形容我。', '你今天想我了几次？', '你有没有骗过我？'];
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
async function answers(c, q) {
    const real = X.plain(await X.ask(`${X.who(c)}\n你们最近的聊天：\n${X.recent(c, 30)}\n\n她在玩「谁是真的你」：她问了一个问题，有两个冒牌货也在模仿你回答，她要从三个回答里认出你。用你最真实的样子回答——你的语气、你们之间才知道的事、你的小习惯。\n她问：「${q}」\n只输出你的回答，40 字以内。`) || '') || X.pick(['你问这个干嘛……好吧，因为是你。', '这还用问？', '嗯……我得想想，别催我。']);
    const brief = X.persona(c).slice(0, 160);
    const f = X.json(await X.ask(`有人在玩「谁是真的 TA」。TA 叫${X.name(c)}，你只知道 TA 的表面印象：「${brief}」。你们**不知道** TA 和她之间发生过的任何具体的事。\n请写两个冒牌货的回答，都要努力模仿得像（同样的长度、类似的称呼），但会在细节上露馅：一个太完美太甜、像标准答案；另一个把 TA 的性格演得过头或者编了一件不存在的共同回忆。\n她问：「${q}」\n只输出 JSON：{"a":"冒牌货1，40字内","b":"冒牌货2，40字内"}`)) || {};
    const fa = X.plain(f.a || '') || X.v('当然是你的全部呀，你在我心里是最好的。', '每一刻都在想你，宝贝。'), fb = X.plain(f.b || '') || X.v('你忘了吗？那天我们在海边说好的。', '哼，我才不告诉你。');
    const opts = shuf([[real, 1], [fa, 0], [fb, 0]]);
    return { q, opts: opts.map(x => x[0]), real: opts.findIndex(x => x[1]) };
}
window.gyxRealStart = cid => { const c = X.char(cid) || X.cur(); if (!c) return; G = { id: 'rl' + Date.now().toString(36), cid: String(c.id), at: Date.now(), rounds: [], done: false }; paint(); };
window.gyxRealAsk = async q => {
    if (!G || busy) return; const c = X.char(G.cid), el = document.getElementById('gyxRlQ'); q = String(q || (el && el.value) || '').trim(); if (!q) return;
    busy = true; G.cur = { q, wait: 1 }; paint();
    try { G.cur = await answers(c, q); } finally { busy = false; } paint();
};
window.gyxRealPick = async i => {
    if (!G || !G.cur || G.cur.wait || G.cur.pick != null) return; G.cur.pick = i; G.rounds.push(G.cur); const ok = i === G.cur.real;
    if (G.rounds.length >= ROUNDS) {
        G.done = true; const n = G.rounds.filter(r => r.pick === r.real).length, c = X.char(G.cid);
        G.line = X.plain(await X.ask(`${X.who(c)}\n她刚玩完「谁是真的你」：${ROUNDS} 轮里认出了你 ${n} 次。${n < ROUNDS ? '有几次她把冒牌货当成了你。' : '她每次都认出了你。'}按你的性格说一句（认错了可以吃醋、委屈、逗她；全对了可以得意、感动）。25 字以内。`) || '') || (n === ROUNDS ? X.v('就知道你认得出我。', '全对。算你有良心。') : n ? X.v('还有一次把别人当成我了？哼。', '那个冒牌货哪里像我了。') : X.v('……一次都没认出来，我很受伤。', '你是不是根本不了解我。'));
        D.games.unshift({ id: G.id, cid: G.cid, at: G.at, rounds: G.rounds, done: true, line: G.line, score: n }); D.games = D.games.slice(0, 100); await save();
        if (n < ROUNDS) X.say(c, G.line);
    }
    paint(ok);
};
function paint(ok) {
    if (!G) return window.gyxRealOpen(); const c = X.char(G.cid), cur = G.cur, n = G.rounds.filter(r => r.pick === r.real).length;
    let body = `<div class="rl-top">第 ${Math.min(G.rounds.length + (cur && cur.pick == null ? 1 : 0), ROUNDS) || 1} / ${ROUNDS} 轮 · 认出 ${n} 次</div>`;
    if (cur && cur.wait) body += `<div class="rl-q">「${X.esc(cur.q)}」</div><div class="gyx-tip">${X.v('三个 TA 都在想……', '有人在模仿 TA……', '谁是真的？')}</div>`;
    else if (cur && cur.opts) body += `<div class="rl-q">「${X.esc(cur.q)}」</div>` + cur.opts.map((t, i) => `<div class="rl-o${cur.pick != null ? (i === cur.real ? ' real' : i === cur.pick ? ' bad' : ' dim') : ''}" onclick="gyxRealPick(${i})"><b>${L3[i]}</b><span>${X.esc(t)}</span>${cur.pick != null && i === cur.real ? '<em>真的 TA</em>' : ''}</div>`).join('') + (cur.pick != null ? `<div class="gyx-tip">${ok ? X.v('✅ 认出来了！', '✅ 就是 TA。', '✅ 默契满分。') : X.v('❌ 被骗了……', '❌ 那是冒牌货。', '❌ TA 在旁边看着呢。')}</div>` : '');
    if (G.done) body += `<div class="gyx-card rl-end"><b>${n} / ${ROUNDS}</b><div>${X.esc(X.name(c))}：${X.esc(G.line || '')}</div></div><button class="gyx-btn" onclick="gyxRealStart('${G.cid}')">再来一局</button>`;
    else if (!cur || cur.pick != null) body += `<div class="gyx-row"><input id="gyxRlQ" class="gyx-in" style="flex:1" placeholder="问三个 TA 一个问题"><button class="gyx-btn" onclick="gyxRealAsk()">问</button></div><div class="gyx-row">${shuf(QS).slice(0, 3).map(q => `<span class="gyx-chip" onclick="gyxRealAsk(this.textContent)">${X.esc(q)}</span>`).join('')}</div><div class="gyx-tip">问只有你们之间才知道的事，最容易揪出冒牌货。</div>`;
    X.panel('gyxRealOv', '🎭 谁是真的 ' + X.esc(X.name(c)), body);
}
window.gyxRealOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), H = D.games.filter(g => g.cid === cid);
    if (G && G.cid === cid && !G.done) return paint();
    const rate = H.length ? Math.round(H.reduce((a, g) => a + g.score, 0) / (H.length * ROUNDS) * 100) : null;
    X.panel('gyxRealOv', '🎭 谁是真的 TA', `<div class="gyx-row">${X.whoSel(cid, 'gyxRealOpen')}<button class="gyx-btn" onclick="gyxRealStart('${cid}')">开始</button></div>
      <div class="gyx-tip">${X.v('你问一个问题，三个 TA 同时回答，只有一个是真的。', '两个冒牌货在模仿 TA，你认得出来吗？', '考考你有多了解 TA。')}一局 ${ROUNDS} 轮。</div>
      ${rate != null ? `<div class="gyx-card">玩了 ${H.length} 局 · 认出率 <b>${rate}%</b></div>` : ''}
      ${H.slice(0, 10).map(g => `<div class="rl-h"><b>${g.score}/${ROUNDS}</b><span>${new Date(g.at).toLocaleString()}<br>「${X.esc(g.line || '')}」</span></div>`).join('')}`);
};
window.gyxRealData = () => D;
X.ctx(id => { const g = D.games.find(x => x.cid === String(id)); return g && Date.now() - g.at < 864e5 ? `【刚才她玩了「谁是真的你」】${ROUNDS} 轮认出你 ${g.score} 次${g.score < ROUNDS ? '（有几次把冒牌货当成了你，你有点在意）' : ''}。` : ''; }, 'gyxReal');
X.action({ key: 'gyx_real', label: '跟她说"敢不敢玩谁是真的我"，看她认不认得出你', hint: '谁是真的TA', need: c => !D.games.some(g => g.cid === String(c.id) && Date.now() - g.at < 3 * 864e5),
    run: async c => (await X.reach(c, '你突然想考考她：要是有两个冒牌货模仿你说话，她认不认得出真的你？用你的方式挑衅/撒娇着约她玩「🎭 谁是真的TA」')) ? '约你玩「谁是真的我」' : null }, 'gyxReal');
X.today(() => ({ title: '🎭 谁是真的TA', rows: D.games.filter(g => X.day(new Date(g.at)) === X.day()).slice(0, 3).map(g => ({ t: g.score + '/' + ROUNDS, x: X.esc(X.name(X.char(g.cid))) + '：' + X.esc(g.line || ''), go: `gyxRealOpen('${g.cid}')` })) }), 'gyxReal');
X.widget('gyxRealW', { n: '谁是真的TA', sizes: ['s', 'm'], tap: () => window.gyxRealOpen(), r: w => { const n = D.games.length; return X.gw(w, '🎭', '谁是真的TA', n ? ['认出率 ' + Math.round(D.games.reduce((a, g) => a + g.score, 0) / (n * ROUNDS) * 100) + '%', n + ' 局'] : ['来一局？']); } }, 'gyxReal');
X.memArr({ k: 'gyxReal', ico: '🎭', n: '谁是真的TA', d: '每局认出了几次、TA 说了什么', arr: () => D.games, field: 'line', text: x => x.line || '', meta: x => new Date(x.at).toLocaleString() + ' · ' + x.score + '/' + ROUNDS, save }, 'gyxReal');
X.css('gyxRealCss', `.rl-top{font-size:12.5px;color:#8e8e93;margin:4px 0}.rl-q{font-size:18px;font-weight:600;margin:8px 0 10px}.rl-o{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:14px;background:#f7f7f9;margin:8px 0;cursor:pointer;transition:.2s}.rl-o:hover{background:#eef}.rl-o b{width:26px;height:26px;border-radius:50%;background:#1d1d1f;color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto;font-size:13px}.rl-o span{flex:1;font-size:14.5px;line-height:1.6}.rl-o em{font-style:normal;font-size:11px;color:#34c759;white-space:nowrap}.rl-o.real{background:#e8f8ee;box-shadow:inset 0 0 0 2px #34c759}.rl-o.bad{background:#ffecec}.rl-o.dim{opacity:.5}.rl-end b{font-size:30px}.rl-h{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #f2f2f4;font-size:13px}.rl-h b{font-size:18px}.rl-h span{color:#8e8e93}`);
X.mini({ id: 'gyxReal', icon: '🎭', title: '谁是真的TA', desc: '三个 TA 同时回答，认出真的那个', cat: '一起做', onOpen: () => window.gyxRealOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxReal', name: '谁是真的TA', icon: '🎭', getStatus: () => null, onResume: () => window.gyxRealOpen(), onStart: (sid, opp) => window.gyxRealOpen(String((opp || [])[0] || sid || '')) }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.games = D.games || []; })();
