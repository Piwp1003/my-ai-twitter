/* 🎯 反向攻略：换 TA 来攻略你。TA 有一份「攻略计划」（自己定的几步），每天出一招（一句话 / 一个小动作 / 一个安排）；你选「接招」「不接」「反撩回去」，TA 的攻略进度跟着变，满了就是「攻略成功」——TA 会正式说一件事。也能看 TA 写的「攻略笔记」 */
if (window.__gyxWoo) return; window.__gyxWoo = 1;
X.feat('gyxWoo', { n: '🎯 反向攻略', desc: 'TA 来攻略你：每天出一招，你决定接不接' });
const S = X.store('woo');
let D = { by: {} };   // by[cid] = {plan:[...], step, prog, moves:[{id,at,t,kind,res,re,dp}], done, note}
const st = cid => { const k = String(cid); return D.by[k] || (D.by[k] = { plan: [], step: 0, prog: 0, moves: [], done: 0, note: '' }); };
const saveD = () => S.set('d', D);
const RES = { yes: ['接招', '💗'], no: ['不接', '🙅'], back: ['反撩回去', '😏'] };
async function plan(c) {
    const s = st(c.id); if (s.plan.length) return s;
    const r = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n现在换你来「攻略」她——像追一个人那样，按你的性格认真地追她一遍（就算你们已经在一起了，也当作重新追一次）。写一份你自己的攻略计划：5 步，每步一句话（比如「先摸清她最近在烦什么」「找个借口单独约她」）；再写一句攻略笔记（你对她的观察）。输出 JSON：{"plan":["","","","",""],"note":""}`));
    s.plan = ((r && r.plan) || ['先观察她最近喜欢什么', '制造一次偶遇', '送一样她提过的小东西', '找借口约她出来', '认真说一次心里话']).map(X.plain).slice(0, 6);
    s.note = X.plain((r && r.note) || '她嘴上说不在意，其实很在意细节。'); await saveD(); return s;
}
async function move(c) {
    const s = await plan(c); if (s.done) return null;
    const cur = s.plan[Math.min(s.step, s.plan.length - 1)];
    const r = X.bailu() ? { t: X.cards(['情话', '聊天'], c, 1)[0] || '今天想见你。', kind: '一句话' } : X.json(await X.ask(`${X.who(c)}\n你在攻略她。计划第 ${s.step + 1} 步：「${cur}」。攻略进度 ${s.prog}/100。之前出过的招：${s.moves.slice(0, 4).map(m => m.t + '（她' + (RES[m.res] || ['还没回'])[0] + '）').join('；') || '还没有'}。\n现在出今天这一招，要具体（一句撩她的话、一个小动作、或者一个约会安排），别跟之前重复。输出 JSON：{"t":"这一招（直接对她说的话或者做的事，60 字以内）","kind":"一句话/小动作/安排"}`));
    if (!r || !r.t) return null;
    const m = { id: 'wm' + Date.now().toString(36), cid: String(c.id), at: Date.now(), t: X.plain(r.t).slice(0, 120), kind: X.plain(r.kind || '一句话').slice(0, 6), step: s.step };
    s.moves.unshift(m); s.moves = s.moves.slice(0, 60); await saveD(); return m;
}
window.gyxWooAnswer = async (cid, mid, res) => {
    const c = X.char(cid), s = st(cid), m = s.moves.find(x => x.id === mid); if (!c || !m || m.res) return;
    const extra = res === 'back' ? ((document.getElementById('gyxWoBack') || {}).value || '').trim() : '';
    m.res = res; m.back = extra; const dp = res === 'yes' ? 18 : res === 'back' ? 26 : -6; m.dp = dp;
    s.prog = Math.max(0, Math.min(100, s.prog + dp)); if (res !== 'no' && s.step < s.plan.length - 1) s.step++;
    m.re = X.plain(X.bailu() ? X.pick(['好，记下了。', '下一招你接不住的。', '……你这样我会更想赢。']) : (await X.ask(`${X.who(c)}\n你在攻略她，刚出的招：「${m.t}」。她${res === 'yes' ? '接招了' : res === 'no' ? '没接（拒绝了 / 装没看见）' : '反撩回来了' + (extra ? '：「' + extra + '」' : '')}。攻略进度现在 ${s.prog}/100。说一两句你的反应（被拒也别放弃，按你的性格）。`)) || '');
    if (s.prog >= 100 && !s.done) { s.done = Date.now(); s.win = X.plain(X.bailu() ? '攻略成功。所以——以后也请多指教。' : (await X.ask(`${X.who(c)}\n你攻略她成功了（进度 100）。正式对她说一件你一直想说的事（50~120 字）。只输出这段话。`)) || '我追到你了。'); X.toast(X.v('🎯 攻略成功', '🎯 被追到了', '🎯 TA 赢了'), X.name(c) + ' 有话要说'); }
    await saveD(); window.gyxWooOpen(cid);
};
window.gyxWooMove = async cid => { const c = X.char(cid) || X.cur(); const m = await move(c); window.gyxWooOpen(c.id); return m; };
window.gyxWooReset = async cid => { delete D.by[String(cid)]; await saveD(); window.gyxWooOpen(cid); };
window.gyxWooOpen = async function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const s = st(c.id), cid = String(c.id);
    const open = s.moves.find(m => !m.res);
    X.panel('gyxWoOv', '🎯 反向攻略', `<div class="gyx-row">${X.whoSel(cid, 'gyxWooOpen')}</div>
        <div class="wo-bar"><i style="width:${s.prog}%"></i><span>${X.esc(X.name(c))} 的攻略进度 ${s.prog}/100</span></div>
        ${s.done ? `<div class="gyx-card wo-win"><b>🎯 攻略成功</b><div>${X.esc(s.win || '')}</div></div>` : ''}
        ${open ? `<div class="gyx-card wo-move"><em>今天这一招 · ${X.esc(open.kind)}</em><div>${X.esc(open.t)}</div>
            <div class="gyx-row">${Object.entries(RES).map(([k, v]) => `<button class="gyx-btn${k === 'yes' ? '' : ' lite'}" onclick="this.disabled=true;gyxWooAnswer('${cid}','${open.id}','${k}')">${v[1]} ${v[0]}</button>`).join('')}</div>
            <input id="gyxWoBack" class="gyx-in" placeholder="反撩的话写这儿（选「反撩回去」时一起发）"></div>`
        : s.done ? '' : `<div class="gyx-row"><button class="gyx-btn" onclick="this.disabled=true;this.textContent='TA 在想招…';gyxWooMove('${cid}')">让 TA 出一招</button></div>`}
        ${s.plan.length ? `<details class="gyx-card"><summary>📒 TA 的攻略笔记</summary><div class="gyx-tip">${X.esc(s.note)}</div>${s.plan.map((p, i) => `<div class="wo-step${i < s.step ? ' ok' : i === s.step ? ' now' : ''}">${i + 1}. ${X.esc(p)}</div>`).join('')}</details>` : ''}
        ${s.moves.filter(m => m.res).slice(0, 12).map(m => `<div class="wo-log"><span>${(RES[m.res] || [''])[1]}</span><div><b>${X.esc(m.t)}</b>${m.back ? `<em>你：${X.esc(m.back)}</em>` : ''}${m.re ? `<em>${X.esc(X.name(c))}：${X.esc(m.re)}</em>` : ''}</div></div>`).join('')}
        <div class="gyx-row"><button class="gyx-btn lite" onclick="gyxWooReset('${cid}')">重新攻略一遍</button></div>`);
};
window.gyxWooData = () => D;
X.ctx(id => { const s = D.by[String(id)]; if (!s || !s.plan.length) return ''; if (s.done && Date.now() - s.done < 3 * 864e5) return `【反向攻略】你刚攻略她成功（你说了：${(s.win || '').slice(0, 50)}）。`; const o = s.moves.find(m => !m.res); return s.done ? '' : `【反向攻略】你正在追她，进度 ${s.prog}/100，下一步计划「${s.plan[Math.min(s.step, s.plan.length - 1)]}」。${o ? '今天出的招「' + o.t.slice(0, 40) + '」她还没回应。' : ''}聊天时可以自然带出你在追她的样子，别每句都提。`; }, 'gyxWoo');
X.action({ key: 'gyx_woo', label: '按你的攻略计划，今天对她出一招', hint: '一句话、一个小动作、一个约会安排', need: c => { const s = st(c.id); return !s.done && !s.moves.some(m => !m.res) && !s.moves.some(m => X.day(new Date(m.at)) === X.day()); },
    run: async c => { const m = await move(c); if (!m) return null; X.notify(c, `🎯 ${X.esc(X.name(c))} ${X.v('又出招了', '今天这一招来了', '在追你')}`, m.t, () => window.gyxWooOpen(c.id)); return (await X.reach(c, `你在攻略她，今天这一招是：${m.t}。直接用这一招来找她（不用说「我在攻略你」）`)) ? '出了一招：' + m.t.slice(0, 20) : null; } }, 'gyxWoo');
X.today(() => ({ title: '🎯 反向攻略', rows: X.chars().map(c => { const s = D.by[String(c.id)]; const m = s && s.moves.find(x => X.day(new Date(x.at)) === X.day()); return m ? { t: X.esc(X.name(c)), x: (m.res ? (RES[m.res] || [''])[1] + ' ' : '🔔 ') + X.esc(m.t.slice(0, 30)), go: `gyxWooOpen('${c.id}')` } : null; }).filter(Boolean) }), 'gyxWoo');
X.widget('gyxWooW', { n: '反向攻略', sizes: ['s', 'm'], tap: () => window.gyxWooOpen(), r: w => { const c = X.cur(), s = c && D.by[String(c.id)]; return X.gw(w, '🎯', '反向攻略', s ? [s.done ? '攻略成功 💗' : `进度 ${s.prog}/100`, X.esc(((s.moves.find(m => !m.res) || {}).t || '').slice(0, 24) || '等 TA 出招')] : ['还没开始', '点我让 TA 来追你']); } }, 'gyxWoo');
X.mem({ k: 'gyxWoo', ico: '🎯', n: '反向攻略', d: 'TA 出过的招和你的回应', items: c => (D.by[String(c.id)] || { moves: [] }).moves, text: m => m.t + (m.res ? `｜你：${(RES[m.res] || [''])[0]}${m.back ? ' ' + m.back : ''}` : '｜还没回'), edit: (m, v) => { m.t = String(v).split('｜')[0]; }, del: (c, i) => { const s = D.by[String(c.id)]; if (s) s.moves.splice(i, 1); }, meta: m => new Date(m.at).toLocaleString(), save: saveD }, 'gyxWoo');
X.css('gyxWoCss', `.wo-bar{position:relative;height:28px;border-radius:14px;background:#ffe8ef;overflow:hidden;margin:8px 0}.wo-bar i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#ff8fab,#ff4d7d);transition:width .6s}.wo-bar span{position:relative;display:block;text-align:center;line-height:28px;font-size:12.5px;color:#7a1f3d}
.wo-move{background:linear-gradient(160deg,#fff0f5,#fff)}.wo-move em{font-style:normal;font-size:12px;color:#ff4d7d}.wo-move>div:nth-child(2){font-size:15.5px;line-height:1.7;margin:6px 0}.wo-win{background:#fff4f8;border:1px solid #ffc2d4}
.wo-step{font-size:13px;color:#aaa;margin:3px 0}.wo-step.ok{color:#34c759;text-decoration:line-through}.wo-step.now{color:#1d1d1f;font-weight:600}
.wo-log{display:flex;gap:8px;margin:8px 0;font-size:13.5px}.wo-log>span{font-size:18px}.wo-log b{font-weight:500;display:block}.wo-log em{display:block;font-style:normal;color:#8e8e93;font-size:12.5px;margin-top:2px}`);
X.mini({ id: 'gyxWoo', icon: '🎯', title: '反向攻略', desc: 'TA 来攻略你：每天出一招，你决定接不接', cat: '陪伴', onOpen: () => window.gyxWooOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.by = D.by || {}; })();
