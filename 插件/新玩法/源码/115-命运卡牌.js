/* 🃏 命运卡牌：左右滑卡片，替你们俩的日子做决定——感情、钱包、理智、世界四条槽，哪一条见底或者爆满，这一局就结束（感情太满也会窒息）。每种结局收成一张卡，TA 对你的每个选择都有话说 */
if (window.__gyxFate) return; window.__gyxFate = 1;
X.feat('gyxFate', { n: '🃏 命运卡牌', desc: '左右滑卡片做决定，四条槽别见底也别爆满' });
const S = X.store('fate');
let D = { runs: [], ends: {} };   // runs: {id,cid,at,days,end,line}  ends: {key: {at, n}}
let R = null, busy = false;   // {cid, m:[4], days, deck:[], card, last}
const M = [['💗', '感情'], ['💰', '钱包'], ['🧠', '理智'], ['🌍', '世界']];
const ENDS = { '0-0': ['💔 冷掉了', '你们之间的话越来越少，某天发现已经很久没说过晚安。'], '0-1': ['🫠 窒息', '黏得太紧，谁都喘不过气。爱也会把人淹死。'], '1-0': ['🧾 破产', '钱包空了。浪漫交不起房租。'], '1-1': ['💎 金丝笼', '钱多到什么都能买，却买不回一个普通的下午。'], '2-0': ['🌀 崩溃', '你们俩的理智同时断了线。'], '2-1': ['🧊 太清醒', '想得太明白，反而没办法心动了。'], '3-0': ['🏝️ 与世隔绝', '你们关起门来过日子，世界把你们忘了。'], '3-1': ['📸 活在热搜里', '全世界都在看你们，你们却看不见彼此。'] };
const BASE = [
    ['他想养一只猫。', ['算了吧', [0, 5, 0, 0]], ['养！', [10, -10, 5, 0]]], ['老板让你周末加班。', ['拒绝', [5, -10, 5, 0]], ['答应', [-10, 15, -5, 0]]],
    ['他半夜说睡不着，想跟你打电话。', ['明天再说', [-10, 0, 5, 0]], ['打！', [12, 0, -8, 0]]], ['朋友约你们一起去音乐节。', ['在家好了', [5, 5, 0, -10]], ['去！', [5, -12, 5, 12]]],
    ['他想把你们的合照发朋友圈。', ['别发', [-5, 0, 0, -8]], ['发吧', [8, 0, 0, 12]]], ['你发现他偷偷记了你喜欢的东西。', ['假装不知道', [8, 0, 0, 0]], ['戳穿他', [5, 0, 5, 0]]],
    ['一个陌生人在网上骂你们。', ['不理', [0, 0, 8, -5]], ['怼回去', [0, 0, -12, 10]]], ['他说想一起存钱买房。', ['再等等', [-5, 5, 0, 0]], ['开始存', [8, -15, 5, 0]]],
    ['你们吵架了，他先发了"在吗"。', ['晾着', [-15, 0, 5, 0]], ['回他', [10, 0, -3, 0]]], ['有人送你们两张出国旅行的票。', ['卖掉', [-5, 15, 0, 0]], ['去！', [12, -5, 8, 10]]]];
const clamp = v => Math.max(0, Math.min(100, v));
async function refill() {
    const c = X.char(R.cid);
    const o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n她在玩「命运卡牌」：一张张卡片代表你们日子里会遇到的事，她左滑或右滑做决定。四个数值：感情、钱包、理智、世界（社会关系/外界），都在 0~100，现在是 ${R.m.join(' / ')}，已经过了 ${R.days} 天。\n写 5 张新卡。卡面是一件具体的小事（可以是你提出的要求、外面发生的事、一个诱惑），左右两个选项，每个选项对四个数值的影响（-20~+20 之间的整数，大多数只动一两个）。要有你的个性；偶尔放一张难选的。\n只输出 JSON 数组：[{"t":"卡面，25字内","l":"左选项，6字内","ld":[感情,钱包,理智,世界],"r":"右选项，6字内","rd":[感情,钱包,理智,世界],"say":"你对这件事说的一句话，20字内"}]`));
    const arr = Array.isArray(o) ? o.filter(x => x && x.t && Array.isArray(x.ld) && Array.isArray(x.rd)).map(x => ({ t: X.plain(x.t), l: [X.plain(x.l || '不要'), x.ld.slice(0, 4).map(n => +n || 0)], r: [X.plain(x.r || '好'), x.rd.slice(0, 4).map(n => +n || 0)], say: X.plain(x.say || '') })) : [];
    R.deck.push(...(arr.length ? arr : BASE.slice().sort(() => Math.random() - .5).slice(0, 5).map(b => ({ t: b[0], l: b[1], r: b[2], say: '' }))));
}
async function draw() { if (!R.deck.length) { busy = true; paint(); try { await refill(); } finally { busy = false; } } R.card = R.deck.shift(); paint(); }
window.gyxFateStart = async cid => { const c = X.char(cid) || X.cur(); if (!c) return; R = { cid: String(c.id), m: [50, 50, 50, 50], days: 0, deck: [], at: Date.now() }; await draw(); };
window.gyxFatePick = async side => {
    if (!R || !R.card || busy) return; const k = R.card[side ? 'r' : 'l']; R.m = R.m.map((v, i) => clamp(v + (k[1][i] || 0))); R.days++;
    R.last = { t: R.card.t, pick: k[0], say: R.card.say };
    const bad = R.m.findIndex(v => v <= 0 || v >= 100);
    if (bad >= 0) {
        const key = bad + '-' + (R.m[bad] >= 100 ? 1 : 0), E = ENDS[key], c = X.char(R.cid);
        const line = X.plain(await X.ask(`${X.who(c)}\n她玩「命运卡牌」，你们一起过了 ${R.days} 天，结局是「${E[0]}」：${E[1]}\n说一句，20 字以内。`) || '') || X.v('再来一次，这次我们小心点。', '没关系，下一局我陪你。', '……这结局我不认。');
        D.ends[key] = { at: Date.now(), n: ((D.ends[key] || {}).n || 0) + 1 };
        D.runs.unshift({ id: 'ft' + Date.now().toString(36), cid: R.cid, at: R.at, days: R.days, end: key, line }); D.runs = D.runs.slice(0, 100); await S.set('d', D);
        const r = R; R = null; return window.gyxFateOpen(r.cid, { key, days: r.days, line, m: r.m });
    }
    await draw();
};
function paint() {
    if (!R) return; const c = X.char(R.cid), k = R.card;
    X.panel('gyxFateOv', '🃏 命运卡牌 · 第 ' + R.days + ' 天', `<div class="ft-m">${M.map((m, i) => `<div><b>${m[0]}</b><i><u style="height:${R.m[i]}%" class="${R.m[i] < 20 || R.m[i] > 80 ? 'warn' : ''}"></u></i><span>${m[1]}</span></div>`).join('')}</div>
      ${R.last ? `<div class="gyx-tip">上一张：${X.esc(R.last.t)} → <b>${X.esc(R.last.pick)}</b>${R.last.say ? `　${X.esc(X.name(c))}：「${X.esc(R.last.say)}」` : ''}</div>` : ''}
      ${busy || !k ? `<div class="ft-card"><div class="ft-t">${X.v('洗牌中……', '命运在发牌……')}</div></div>` : `<div class="ft-card" id="gyxFtCard"><div class="ft-who">${X.esc(X.name(c))}</div><div class="ft-t">${X.esc(k.t)}</div></div>
      <div class="ft-btns"><button class="gyx-btn lite" onclick="gyxFatePick(0)">← ${X.esc(k.l[0])}</button><button class="gyx-btn" onclick="gyxFatePick(1)">${X.esc(k.r[0])} →</button></div><div class="gyx-tip" style="text-align:center">也可以把卡片往左 / 右拖</div>`}`);
    const el = document.getElementById('gyxFtCard'); if (!el) return; let x0 = null, dx = 0;
    const dn = e => { x0 = (e.touches ? e.touches[0] : e).clientX; dx = 0; }, mv = e => { if (x0 == null) return; dx = (e.touches ? e.touches[0] : e).clientX - x0; el.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`; }, up = () => { window.removeEventListener('pointermove', mv); if (x0 == null) return; x0 = null; if (Math.abs(dx) > 80) gyxFatePick(dx > 0 ? 1 : 0); else el.style.transform = ''; };
    el.addEventListener('pointerdown', e => { dn(e); window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up, { once: true }); });
}
window.gyxFateData = () => D; window.gyxFateLive = () => R;
window.gyxFateOpen = function (who, end) {
    const c = X.char(who) || X.cur(); if (!c) return; if (R && R.cid === String(c.id)) return paint(); const cid = String(c.id), best = D.runs.filter(r => r.cid === cid).reduce((a, r) => Math.max(a, r.days), 0);
    X.panel('gyxFateOv', '🃏 命运卡牌', `${end ? `<div class="gyx-card ft-end"><b>${ENDS[end.key][0]}</b><div>${ENDS[end.key][1]}</div><div class="gyx-tip">你们一起过了 ${end.days} 天</div><div>${X.esc(X.name(c))}：「${X.esc(end.line)}」</div></div>` : ''}
      <div class="gyx-row">${X.whoSel(cid, 'gyxFateOpen')}<button class="gyx-btn" onclick="gyxFateStart('${cid}')">${end ? '再来一局' : '开始'}</button></div>
      <div class="gyx-tip">${X.v('每张卡都是你们日子里的一件事，左滑右滑替你们决定。', '四条槽，别让任何一条见底——也别爆满。', '爱太满也会出事。')}${best ? ' 最长坚持了 ' + best + ' 天。' : ''}</div>
      <h4 style="font-size:14px;margin:12px 0 6px">结局图鉴（${Object.keys(D.ends).length}/8）</h4><div class="ft-ends">${Object.keys(ENDS).map(k => D.ends[k] ? `<div class="on"><b>${ENDS[k][0]}</b><span>${ENDS[k][1]}</span></div>` : `<div><b>❓</b><span>还没遇到</span></div>`).join('')}</div>`);
};
X.ctx(id => { const r = D.runs.find(x => x.cid === String(id)); return r && Date.now() - r.at < 6 * 36e5 ? `【刚才你们玩了命运卡牌】一起过了 ${r.days} 天，结局是「${ENDS[r.end][0]}」。` : ''; }, 'gyxFate');
X.action({ key: 'gyx_fate', label: '约她玩命运卡牌（看你们能一起撑多少天）', hint: '命运卡牌', need: c => !D.runs.some(x => x.cid === String(c.id) && Date.now() - x.at < 3 * 864e5),
    run: async c => (await X.reach(c, '你想跟她玩「🃏 命运卡牌」——左滑右滑替你们的日子做决定，看能一起撑多少天。用你的方式约她')) ? '约你玩命运卡牌' : null }, 'gyxFate');
X.today(() => ({ title: '🃏 命运卡牌', rows: D.runs.filter(r => X.day(new Date(r.at)) === X.day()).slice(0, 3).map(r => ({ t: r.days + ' 天', x: ENDS[r.end][0], go: `gyxFateOpen('${r.cid}')` })) }), 'gyxFate');
X.widget('gyxFateW', { n: '命运卡牌', sizes: ['s', 'm'], tap: () => window.gyxFateOpen(), r: w => X.gw(w, '🃏', '命运卡牌', R ? ['第 ' + R.days + ' 天', M.map((m, i) => m[0] + R.m[i]).join(' ')] : [Object.keys(D.ends).length + '/8 个结局', D.runs.length ? '最长 ' + D.runs.reduce((a, r) => Math.max(a, r.days), 0) + ' 天' : '']) }, 'gyxFate');
X.memArr({ k: 'gyxFate', ico: '🃏', n: '命运卡牌', d: '每一局的结局和 TA 说的话', arr: () => D.runs, field: 'line', text: x => x.line || '', meta: x => ENDS[x.end][0] + ' · ' + x.days + ' 天', save: () => S.set('d', D) }, 'gyxFate');
X.css('gyxFateCss', `.ft-m{display:flex;justify-content:space-around;margin:6px 0 10px}.ft-m div{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11.5px;color:#8e8e93}.ft-m b{font-size:20px;font-weight:normal}.ft-m i{width:16px;height:60px;border-radius:8px;background:#eee;position:relative;overflow:hidden}.ft-m u{position:absolute;left:0;right:0;bottom:0;background:#1d1d1f;transition:.4s}.ft-m u.warn{background:#ff3b30}
.ft-card{background:linear-gradient(160deg,#fff8f2,#ffe9ef);border-radius:22px;min-height:200px;padding:22px;box-shadow:0 10px 30px rgba(0,0,0,.1);display:flex;flex-direction:column;justify-content:center;gap:10px;touch-action:pan-y;user-select:none;cursor:grab;transition:transform .15s}.ft-who{font-size:12px;color:#8e8e93}.ft-t{font-size:20px;line-height:1.6;font-weight:600}.ft-btns{display:flex;justify-content:space-between;margin:12px 0}
.ft-end b{font-size:22px}.ft-ends{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ft-ends div{background:#f7f7f9;border-radius:12px;padding:8px 10px;font-size:12px;color:#aaa}.ft-ends div.on{color:#1d1d1f;background:#fff4e8}.ft-ends b{display:block;font-size:14px}`);
X.mini({ id: 'gyxFate', icon: '🃏', title: '命运卡牌', desc: '左右滑做决定，四条槽别见底', cat: '一起做', onOpen: () => window.gyxFateOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxFate', name: '命运卡牌', icon: '🃏', getStatus: () => null, onResume: () => window.gyxFateOpen(), onStart: (sid, opp) => window.gyxFateOpen(String((opp || [])[0] || sid || '')) }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.runs = D.runs || []; D.ends = D.ends || {}; })();
