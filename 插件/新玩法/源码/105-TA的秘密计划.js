/* 🎁 TA的秘密计划：TA 偷偷为你学一样东西（吉他、做蛋糕、画你、学一门方言……），持续两三周；平时聊天会不小心漏出一点破绽，越接近完成越明显，最后挑一天揭晓——一封信加一个成果。你可以猜，猜中了 TA 会慌 */
if (window.__gyxPlan) return; window.__gyxPlan = 1;
X.feat('gyxPlan', { n: '🎁 TA的秘密计划', desc: 'TA 偷偷为你学一样东西，平时漏点破绽，学成了挑一天揭晓' });
const S = X.store('plan');
let D = { plans: [] };   // {id, cid, what, why, start, days, hints:[{t,at}], guesses:[{t,at,hit,line}], done, doneAt, letter, result}
const DAY = 864e5;
const save = () => S.set('d', D);
const active = cid => D.plans.find(p => p.cid === String(cid) && !p.done);
const prog = p => Math.min(1, (Date.now() - p.start) / (p.days * DAY));
const stage = p => { const r = prog(p); return r < .3 ? '刚开始' : r < .7 ? '学到一半' : r < 1 ? '快学会了' : '学会了'; };
const IDEAS = ['学弹一首她喜欢的歌', '偷偷练做她爱吃的甜点', '照着照片画她', '学她家乡的方言', '给她织一条围巾', '学折一百颗星星', '练一手好字给她写信', '学做她说过想吃的那道菜', '偷偷录一首歌', '学一支舞'];
async function startPlan(c) {
    if (!c || active(c.id)) return null;
    let o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n最近你们聊过：\n${X.recent(c, 24)}\n\n你决定偷偷为她学一样东西或准备一件东西，要花两三周，学成了才告诉她。按你的性格和你们聊过的事选（不要太夸张，要是你真的会去做的事）。只输出 JSON：{"what":"要学/要做的事，15字内","why":"为什么想为她做这个，30字内","days":14到28的整数}`));
    if (!o || !o.what) o = { what: X.pick(IDEAS), why: '想让她惊喜一下', days: 21 };
    const p = { id: 'pl' + Date.now().toString(36), cid: String(c.id), what: X.plain(o.what).slice(0, 30), why: X.plain(o.why || '').slice(0, 60), start: Date.now(), days: Math.max(10, Math.min(30, +o.days || 21)), hints: [], guesses: [], done: false };
    D.plans.unshift(p); await save(); return p;
}
async function leak(c) {
    const p = active(c && c.id); if (!p) return null;
    const ok = await X.reach(c, `你在偷偷「${p.what}」，现在${stage(p)}。这事还不能告诉她。但你这次说话会不小心漏一点破绽——比如手指疼、最近老是很晚才睡、厨房被你弄得一团糟、问她一个跟这件事有关的奇怪问题——别说破，被追问就含糊过去`);
    if (ok) { const H = (typeof globalChats !== 'undefined' && globalChats[c.id]) || []; const m = H[H.length - 1]; p.hints.push({ t: m && m.sender !== 'me' ? X.plain(m.text).slice(0, 80) : '（漏了点破绽）', at: Date.now() }); await save(); }
    return ok;
}
async function reveal(c) {
    const p = active(c && c.id); if (!p) return null;
    let o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n这 ${p.days} 天你一直在偷偷「${p.what}」（原因：${p.why}）。中间你漏过的破绽：${p.hints.map(h => h.t).join(' / ') || '没有'}。她猜过：${p.guesses.map(g => g.t).join(' / ') || '没猜过'}。\n今天终于学会了，你要告诉她。只输出 JSON：{"result":"成果是什么样的，具体一点、有画面，50字内","letter":"给她的一封短信，像你本人写的，150字内"}`));
    p.result = X.plain((o && o.result) || `${p.what}——做得不算完美，但每一步都是想着你做的。`);
    p.letter = String((o && o.letter) || X.v('其实这几周我一直在偷偷准备这个。手笨，练了好多次。想让你知道，我也会为你变得更好一点。', '之前那些奇怪的问题、手上的创可贴，都是因为这个。现在可以告诉你了。'));
    p.done = true; p.doneAt = Date.now(); await save();
    X.say(c, `🎁 ${X.v('其实……我准备了一个东西。', '憋了好久，终于可以告诉你了。', '你之前猜的那些，现在揭晓答案。')}`);
    X.notify(c, `<b>${X.esc(X.name(c))}</b> 揭晓了一个秘密 🎁`, p.what, X.go('gyxPlanOpen', c.id));
    return p;
}
window.gyxPlanGuess = async (cid) => {
    const c = X.char(cid), p = active(cid), el = document.getElementById('gyxPlGuess'); if (!c || !p || !el || !el.value.trim()) return;
    const g = el.value.trim(); el.value = '';
    let o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n你在偷偷「${p.what}」，还没告诉她。她现在猜：「${g}」。\n判断她猜得对不对（意思接近就算对），然后按你的性格回一句（猜中了会慌、会想糊弄过去；没猜中就松口气、逗她）。只输出 JSON：{"hit":true或false,"line":"你说的话，30字内"}`));
    const hit = o ? !!o.hit : g.includes(p.what.slice(0, 2));
    p.guesses.push({ t: g, at: Date.now(), hit, line: X.plain((o && o.line) || (hit ? '……你、你怎么知道的？！' : '不是哦，再猜猜？')) }); await save(); window.gyxPlanOpen(cid);
};
window.gyxPlanStart = async cid => { const c = X.char(cid); if (!c) return; X.toast(X.v('嗯？', '……', 'TA 看了你一眼'), X.v('TA 好像在想什么', 'TA 没说话，但好像有了主意')); await startPlan(c); window.gyxPlanOpen(cid); };
window.gyxPlanReveal = async cid => { await reveal(X.char(cid)); window.gyxPlanOpen(cid); };
window.gyxPlanDel = async id => { D.plans = D.plans.filter(p => p.id !== id); await save(); window.gyxPlanOpen(); };
window.gyxPlanData = () => D;
window.gyxPlanOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), p = active(cid), past = D.plans.filter(x => x.cid === cid && x.done);
    const bar = p ? Math.round(prog(p) * 100) : 0;
    X.panel('gyxPlanOv', '🎁 ' + X.esc(X.name(c)) + ' 的秘密', `<div class="gyx-row">${X.whoSel(cid, 'gyxPlanOpen')}</div>
      ${p ? `<div class="gyx-card pl-sec"><div class="pl-q">❓❓❓</div><div class="gyx-tip">${X.v('TA 最近好像在偷偷忙什么……', '有件事 TA 还没告诉你。', 'TA 在藏着什么。')}</div>
        <div class="pl-bar"><i style="width:${bar}%"></i></div><div class="gyx-tip">${stage(p)}${prog(p) >= 1 ? ' · 随时会揭晓' : ''}</div>
        ${p.hints.length ? `<div class="pl-h"><b>🔍 你注意到的破绽</b>${p.hints.slice(-6).reverse().map(h => `<div>「${X.esc(h.t)}」<em>${new Date(h.at).toLocaleDateString()}</em></div>`).join('')}</div>` : '<div class="gyx-tip">还没露出破绽。</div>'}
        <div class="gyx-row"><input id="gyxPlGuess" class="gyx-in" style="flex:1" placeholder="猜猜 TA 在干嘛？"><button class="gyx-btn" onclick="gyxPlanGuess('${cid}')">猜</button></div>
        ${p.guesses.slice(-4).reverse().map(g => `<div class="gyx-tip">${g.hit ? '🎯' : '🙈'} 你猜「${X.esc(g.t)}」→ ${X.esc(g.line)}</div>`).join('')}
        ${prog(p) >= 1 ? `<button class="gyx-btn" onclick="gyxPlanReveal('${cid}')">问问 TA 准备好了没</button>` : ''}</div>`
      : `<div class="gyx-tip">${X.v('现在 TA 没在偷偷准备什么。', '暂时没有秘密。')}TA 自己会起意（自主模式里），也可以让 TA 现在就开始——你不会知道是什么。</div><button class="gyx-btn lite" onclick="gyxPlanStart('${cid}')">让 TA 偷偷准备点什么</button>`}
      ${past.map(x => `<div class="gyx-card"><b>🎁 ${X.esc(x.what)}</b><div class="gyx-tip">${new Date(x.start).toLocaleDateString()} – ${new Date(x.doneAt).toLocaleDateString()} · 漏了 ${x.hints.length} 次破绽 · 你猜了 ${x.guesses.length} 次</div><div class="pl-res">${X.esc(x.result || '')}</div><div class="pl-let gyx-hand">${X.esc(x.letter || '').replace(/\n/g, '<br>')}</div><div class="gyx-tip" style="text-align:right"><span style="cursor:pointer" onclick="gyxPlanDel('${x.id}')">删</span></div></div>`).join('')}`);
};
X.ctx(id => { const p = active(id); if (!p) return ''; return `【你的秘密】你在偷偷「${p.what}」（${stage(p)}，为了给她惊喜）。绝对不要主动说出来；她问起来可以含糊、转移话题。偶尔可以有一点自然的小破绽，但别刻意。`; }, 'gyxPlan');
X.action({ key: 'gyx_plan_start', label: '偷偷为她准备一件需要好几周的事（不告诉她）', hint: 'TA的秘密计划', need: c => !active(c.id) && !D.plans.some(p => p.cid === String(c.id) && p.doneAt && Date.now() - p.doneAt < 14 * DAY),
    run: async c => (await startPlan(c)) ? null : null }, 'gyxPlan');
X.action({ key: 'gyx_plan_leak', label: '说话时不小心漏一点秘密计划的破绽', hint: 'TA的秘密计划', need: c => { const p = active(c.id); return !!p && prog(p) < 1 && (!p.hints.length || Date.now() - p.hints[p.hints.length - 1].at > (prog(p) > .6 ? 1.5 : 3) * DAY); },
    run: async c => (await leak(c)) ? '说话时好像藏着什么' : null }, 'gyxPlan');
X.action({ key: 'gyx_plan_reveal', label: '秘密计划完成了，告诉她', hint: 'TA的秘密计划', need: c => { const p = active(c.id); return !!p && prog(p) >= 1; },
    run: async c => (await reveal(c)) ? '揭晓了一个秘密' : null }, 'gyxPlan');
X.today(() => ({ title: '🎁 秘密', rows: D.plans.filter(p => !p.done && X.char(p.cid)).map(p => ({ t: X.name(X.char(p.cid)), x: `好像在偷偷忙什么（${stage(p)}）`, go: `gyxPlanOpen('${p.cid}')` })).concat(D.plans.filter(p => p.done && X.day(new Date(p.doneAt)) === X.day()).map(p => ({ t: '今天揭晓', x: X.esc(p.what), go: `gyxPlanOpen('${p.cid}')` }))) }), 'gyxPlan');
X.widget('gyxPlanW', { n: 'TA的秘密', sizes: ['s', 'm'], tap: () => window.gyxPlanOpen(), r: w => { const p = D.plans.find(x => !x.done); return p ? X.gw(w, '🎁', 'TA 的秘密', ['❓ ' + stage(p), Math.round(prog(p) * 100) + '%']) : X.gw(w, '🎁', 'TA 的秘密', [D.plans.length ? '揭晓过 ' + D.plans.length + ' 个' : '暂时没有']); } }, 'gyxPlan');
X.memArr({ k: 'gyxPlan', ico: '🎁', n: '秘密计划', d: 'TA 偷偷为你准备过的事（进行中的也在这儿，改了 TA 就按改的来）', arr: () => D.plans, field: 'what', text: x => x.what + (x.result ? ' —— ' + x.result : ''), edit: (x, v) => { const i = v.indexOf(' —— '); if (i >= 0) { x.what = v.slice(0, i); x.result = v.slice(i + 4); } else x.what = v; }, meta: x => new Date(x.start).toLocaleDateString() + (x.done ? ' · 已揭晓' : ' · 进行中'), save }, 'gyxPlan');
X.css('gyxPlanCss', `.pl-q{font-size:28px;text-align:center;letter-spacing:6px}.pl-bar{height:8px;border-radius:8px;background:#eee;overflow:hidden;margin:8px 0 2px}.pl-bar i{display:block;height:100%;background:linear-gradient(90deg,#ffb7c9,#ff6b8b)}.pl-h div{font-size:13px;padding:5px 0;border-bottom:1px dashed #eee}.pl-h em{font-style:normal;color:#aaa;font-size:11px;margin-left:6px}.pl-h b{display:block;font-size:13px;margin:8px 0 2px}.pl-res{margin:8px 0;font-size:14px}.pl-let{background:#fffaf2;border-radius:12px;padding:12px;font-size:17px;line-height:1.8}`);
X.mini({ id: 'gyxPlan', icon: '🎁', title: 'TA的秘密计划', desc: 'TA 偷偷为你学一样东西，学成了再揭晓', cat: '陪伴', onOpen: () => window.gyxPlanOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.plans = D.plans || []; })();
