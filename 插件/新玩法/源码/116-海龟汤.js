/* 🐢 海龟汤：TA 出谜面，你只能问"是不是"的问题，一点点逼近汤底；反过来你出题，TA 按自己的性格乱猜、耍赖、撒娇要提示。还有「关于我们」特别版——汤底藏在你们自己的回忆里 */
if (window.__gyxSoup) return; window.__gyxSoup = 1;
X.feat('gyxSoup', { n: '🐢 海龟汤', desc: 'TA 出题你猜，你出题 TA 猜，还有关于你们的特别版' });
const S = X.store('soup');
let D = { log: [] };   // {id, cid, at, mode:'ta'|'me'|'us', title, face, truth, qa:[{q,a}], solved, hints, line}
let G = null, busy = false;
const save = () => S.set('d', D);
const BANK = [
    ['没拆的礼物', '她收到一份包装精美的礼物，看了一眼，笑着把它原封不动地放回了柜子里。', '礼物是她自己去年寄给"一年后的自己"的时间胶囊，她想等到约定的那天再拆。'],
    ['空着的座位', '他每天都在电影院买两张票，却总是一个人看完。', '他在替异地的女朋友"占座"——两人约好同一时间在各自城市看同一场，打着电话。'],
    ['湿掉的信', '她读完那封信，把它放进了水里，然后开心地笑了。', '信是用隐形墨水写的，泡水后才显出最后一句"我爱你"。'],
    ['停下的钟', '他把家里所有的钟都调慢了十分钟，女朋友因此再也没迟到过。', '女朋友总是按钟上的时间"踩点"出门，调慢后她以为自己快迟到，其实提早了十分钟。'],
    ['奇怪的外卖', '她点了一份外卖，收到后哭了，可外卖一点问题都没有。', '外卖备注里，店家照她点单时写的"今天是一个人的生日"，送了一张手写的生日卡。']];
const isYes = a => /^是/.test(a);
async function judge(q) {
    const c = X.char(G.cid);
    const o = X.json(await X.ask(`${X.who(c)}\n你在主持海龟汤。汤面：${G.face}\n汤底（只有你知道）：${G.truth}\n她问：「${q}」\n先严格按汤底判断：如果她是在猜整个汤底并且猜对了大意，solved=true；否则回答只能是"是""不是""无关""很接近"之一。然后用你的性格加一句很短的话（逗她、催她、夸她），可以不加。\n只输出 JSON：{"a":"是/不是/无关/很接近","say":"10字内或空","solved":true或false}`));
    if (o && o.a) return { a: X.plain(o.a).slice(0, 4), say: X.plain(o.say || ''), solved: !!o.solved };
    // 没有模型：按字面重合粗略判断（问到汤底里的词就算"是"，大半重合就算猜中）
    const bi = t => { const r = new Set(); const z = String(t).replace(/[\s，。？?！!、"“”]/g, ''); for (let i = 0; i < z.length - 1; i++) r.add(z.slice(i, i + 2)); return r; }, A = bi(q), B = bi(G.truth); let hit = 0; A.forEach(x => { if (B.has(x)) hit++; });
    return { a: hit ? (hit / Math.max(1, A.size) > .5 ? '很接近' : '是') : '不是', say: '', solved: A.size > 6 && hit / A.size > .6 };
}
async function taGuess() {
    const c = X.char(G.cid);
    const o = X.json(await X.ask(`${X.who(c)}\n她在给你出海龟汤。汤面：${G.face}\n你问过的和她的回答：\n${G.qa.map(x => `你：${x.q}　她：${x.a}`).join('\n') || '还没问'}\n按你的性格继续玩：问一个能用"是/不是"回答的问题；如果你觉得猜得出来了，就直接说出你猜的汤底（guess）。问了很多还猜不出可以撒娇要提示、耍赖。\n只输出 JSON：{"q":"你的问题或空","guess":"你猜的汤底或空","say":"一句闲话，10字内或空"}`));
    return o || { q: X.pick(['跟钱有关吗？', '有人死了吗？', '这件事发生在晚上吗？', '是因为爱吗？']), guess: '', say: '' };
}
window.gyxSoupStart = async (cid, mode) => {
    const c = X.char(cid) || X.cur(); if (!c || busy) return; busy = true; G = { id: 'sp' + Date.now().toString(36), cid: String(c.id), at: Date.now(), mode, qa: [], hints: 0, wait: 1 }; paint();
    try {
        if (mode === 'me') { G.wait = 0; G.setup = 1; }
        else {
            const us = mode === 'us';
            const o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n${us ? `你们最近的聊天：\n${X.recent(c, 40)}\n\n出一道「关于我们」的海龟汤：汤底必须是你们之间真实发生过的事、或者你心里关于她的一个小秘密（可以是甜的），汤面写得像个谜。` : '出一道原创海龟汤（情景推理谜题）：汤面看起来不合常理，汤底合情合理、有点温暖或有点出人意料，别血腥恐怖。'}\n只输出 JSON：{"title":"题目，6字内","face":"汤面，50字内","truth":"汤底，60字内"}`));
            const b = o && o.face ? [o.title, o.face, o.truth] : X.pick(BANK);
            Object.assign(G, { title: X.plain(b[0] || '无题'), face: X.plain(b[1]), truth: X.plain(b[2]), wait: 0 });
        }
    } finally { busy = false; } paint();
};
window.gyxSoupSet = async () => { const f = document.getElementById('gyxSpF'), t = document.getElementById('gyxSpT'); if (!G || !f.value.trim() || !t.value.trim()) return X.toast('汤面和汤底都要写'); Object.assign(G, { title: '你出的题', face: f.value.trim(), truth: t.value.trim(), setup: 0 }); await taTurn(); };
async function taTurn() { busy = true; paint(); try { const r = await taGuess(); G.pending = { q: X.plain(r.q || ''), guess: X.plain(r.guess || ''), say: X.plain(r.say || '') }; } finally { busy = false; } paint(); }
window.gyxSoupAns = async a => {
    if (!G || !G.pending) return; const p = G.pending; G.pending = null;
    if (p.guess) { G.qa.push({ q: '我猜：' + p.guess, a }); if (a === '对') return finish(true); }
    else G.qa.push({ q: p.q, a });
    if (G.qa.length >= 20) return finish(false); await taTurn();
};
window.gyxSoupAsk = async () => {
    if (!G || busy) return; const el = document.getElementById('gyxSpQ'), q = el && el.value.trim(); if (!q) return; el.value = '';
    busy = true; paint(); let r; try { r = await judge(q); } finally { busy = false; }
    G.qa.push({ q, a: r.a, say: r.say }); if (r.solved) return finish(true); paint();
};
window.gyxSoupHint = async () => { if (!G || busy || G.hints >= 3) return; busy = true; paint(); const c = X.char(G.cid); let h; try { h = X.plain(await X.ask(`${X.who(c)}\n海龟汤汤面：${G.face}\n汤底：${G.truth}\n她已经问过：${G.qa.map(x => x.q + '→' + x.a).join('；')}\n给她第 ${G.hints + 1} 个提示（越往后越直接，但别直接说汤底），15字内。`) || ''); } finally { busy = false; } G.hints++; G.qa.push({ q: '💡 提示', a: h || X.pick(['想想时间', '跟爱有关', '注意那个细节']) }); paint(); };
async function finish(ok) {
    const c = X.char(G.cid), g = G; g.solved = ok;
    g.line = X.plain(await X.ask(`${X.who(c)}\n你们刚玩完一局海龟汤（${g.mode === 'me' ? '她出题你猜' : '你出题她猜'}），${ok ? (g.mode === 'me' ? '你猜中了' : '她猜中了') : (g.mode === 'me' ? '你没猜中，认输了' : '她没猜中，放弃了')}。用了 ${g.qa.length} 个问题。说一句，20 字以内。`) || '') || (ok ? X.v('不愧是我们。', '这都被猜到了。') : X.v('下次一定。', '汤底这么简单都没猜到？'));
    D.log.unshift({ id: g.id, cid: g.cid, at: g.at, mode: g.mode, title: g.title, face: g.face, truth: g.truth, qa: g.qa, solved: ok, hints: g.hints, line: g.line }); D.log = D.log.slice(0, 100); await save();
    G = null; window.gyxSoupOpen(g.cid, g);
}
window.gyxSoupGiveUp = () => G && finish(false);
window.gyxSoupLive = () => G; window.gyxSoupData = () => D;
function paint() {
    if (!G) return; const c = X.char(G.cid), N = X.esc(X.name(c));
    let h = '';
    if (G.wait) h = `<div class="gyx-tip">${N} ${X.v('在想题……', '在熬汤……', '在挑一道难的……')}</div>`;
    else if (G.setup) h = `<div class="gyx-tip">写一道题给 ${N} 猜。汤底 TA 看不见。</div><textarea id="gyxSpF" class="gyx-in" rows="3" placeholder="汤面：看起来不合常理的情景"></textarea><textarea id="gyxSpT" class="gyx-in" rows="3" placeholder="汤底：真相" style="margin-top:6px"></textarea><button class="gyx-btn" onclick="gyxSoupSet()">端上去</button>`;
    else {
        h = `<div class="gyx-card sp-face"><b>🐢 ${X.esc(G.title)}</b><div>${X.esc(G.face)}</div></div><div class="sp-qa">${G.qa.map(x => `<div class="sp-r"><span>${X.esc(x.q)}</span><b class="${isYes(x.a) || x.a === '对' ? 'y' : /接近/.test(x.a) ? 'm' : ''}">${X.esc(x.a)}</b>${x.say ? `<em>${X.esc(x.say)}</em>` : ''}</div>`).join('')}</div>`;
        if (G.mode === 'me') h += busy ? `<div class="gyx-tip">${N} 在想……</div>` : G.pending ? `<div class="gyx-card">${G.pending.say ? `<div class="gyx-tip">${X.esc(G.pending.say)}</div>` : ''}<b>${G.pending.guess ? '我猜汤底是：' + X.esc(G.pending.guess) : X.esc(G.pending.q)}</b></div><div class="gyx-row">${(G.pending.guess ? ['对', '不对'] : ['是', '不是', '无关', '很接近']).map(a => `<button class="gyx-btn lite" onclick="gyxSoupAns('${a}')">${a}</button>`).join('')}</div>` : '';
        else h += `<div class="gyx-row"><input id="gyxSpQ" class="gyx-in" style="flex:1" placeholder="问一个是或不是的问题，或者直接猜汤底" onkeydown="if(event.key==='Enter'&&!event.isComposing)gyxSoupAsk()"><button class="gyx-btn" onclick="gyxSoupAsk()">${busy ? '…' : '问'}</button></div><div class="gyx-row"><button class="gyx-btn lite" onclick="gyxSoupHint()">💡 提示（${3 - G.hints}）</button><button class="gyx-btn lite" onclick="gyxSoupGiveUp()">看汤底</button></div>`;
    }
    X.panel('gyxSoupOv', '🐢 海龟汤 · ' + N, h);
    const q = document.querySelector('.sp-qa'); if (q) q.scrollTop = q.scrollHeight;
}
window.gyxSoupOpen = function (who, last) {
    const c = X.char(who) || X.cur(); if (!c) return; if (G && G.cid === String(c.id)) return paint(); const cid = String(c.id), H = D.log.filter(x => x.cid === cid);
    X.panel('gyxSoupOv', '🐢 海龟汤', `${last ? `<div class="gyx-card"><b>${last.solved ? '🎉 猜中了' : '🫖 汤底揭晓'}</b><div class="sp-face"><div>${X.esc(last.face)}</div></div><div style="margin-top:6px"><b>汤底：</b>${X.esc(last.truth)}</div><div class="gyx-tip">${X.esc(X.name(c))}：「${X.esc(last.line)}」</div></div>` : ''}
      <div class="gyx-row">${X.whoSel(cid, 'gyxSoupOpen')}</div>
      <div class="gyx-row"><button class="gyx-btn" onclick="gyxSoupStart('${cid}','ta')">TA 出题</button><button class="gyx-btn lite" onclick="gyxSoupStart('${cid}','me')">我出题</button><button class="gyx-btn lite" onclick="gyxSoupStart('${cid}','us')">💞 关于我们</button></div>
      <div class="gyx-tip">${X.v('只能问"是不是"的问题，一点点逼近真相。', '汤面看着不合理，汤底一定合理。', '问得越巧，喝得越快。')}</div>
      ${H.slice(0, 12).map(x => `<div class="sp-h"><b>${x.solved ? '🎉' : '🫖'}</b><span>${x.mode === 'me' ? '我出的' : x.mode === 'us' ? '关于我们' : 'TA 出的'} · ${X.esc(x.title || '')} · ${x.qa.length} 问<br>${X.esc(x.face)}</span></div>`).join('')}`);
};
X.ctx(id => { const x = D.log.find(l => l.cid === String(id)); return x && Date.now() - x.at < 6 * 36e5 ? `【刚才你们玩了海龟汤】${x.mode === 'me' ? '她出题你猜' : '你出题她猜'}，${x.solved ? '猜中了' : '没猜中'}。汤底是：${x.truth}` : ''; }, 'gyxSoup');
X.action({ key: 'gyx_soup', label: '给她出一道海龟汤（或者"关于我们"的谜）', hint: '海龟汤', need: c => !D.log.some(x => x.cid === String(c.id) && Date.now() - x.at < 2 * 864e5),
    run: async c => (await X.reach(c, '你想到一道很妙的海龟汤（或者一个关于你们俩的谜），想考考她。用你的方式约她玩「🐢 海龟汤」，可以先卖个关子')) ? '想给你出海龟汤' : null }, 'gyxSoup');
X.today(() => ({ title: '🐢 海龟汤', rows: D.log.filter(x => X.day(new Date(x.at)) === X.day()).slice(0, 3).map(x => ({ t: x.solved ? '猜中了' : '揭晓了', x: X.esc(x.title || ''), go: `gyxSoupOpen('${x.cid}')` })) }), 'gyxSoup');
X.widget('gyxSoupW', { n: '海龟汤', sizes: ['s', 'm'], tap: () => window.gyxSoupOpen(), r: w => X.gw(w, '🐢', '海龟汤', G ? ['进行中', G.qa.length + ' 问'] : [D.log.length ? '喝了 ' + D.log.length + ' 碗' : '来一碗？']) }, 'gyxSoup');
X.memArr({ k: 'gyxSoup', ico: '🐢', n: '海龟汤', d: '你们玩过的题（汤面 → 汤底）', arr: () => D.log, field: 'truth', text: x => x.face + ' → ' + x.truth, edit: (x, v) => { const i = v.indexOf(' → '); if (i >= 0) { x.face = v.slice(0, i); x.truth = v.slice(i + 3); } else x.truth = v; }, meta: x => new Date(x.at).toLocaleString() + (x.solved ? ' · 猜中' : ''), save }, 'gyxSoup');
X.css('gyxSoupCss', `.sp-face div{font-size:15px;line-height:1.8;margin-top:4px}.sp-qa{max-height:40vh;overflow:auto}.sp-r{display:flex;gap:8px;align-items:baseline;padding:7px 0;border-bottom:1px dashed #eee;font-size:14px;flex-wrap:wrap}.sp-r span{flex:1}.sp-r b{font-size:13px;padding:1px 9px;border-radius:9px;background:#f2f2f4;font-weight:500}.sp-r b.y{background:#e8f8ee;color:#1f8f4a}.sp-r b.m{background:#fff4d6;color:#b07800}.sp-r em{font-style:normal;font-size:12px;color:#8e8e93;width:100%}.sp-h{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f2f2f4;font-size:13px}.sp-h span{color:#8e8e93}`);
X.mini({ id: 'gyxSoup', icon: '🐢', title: '海龟汤', desc: 'TA 出题你猜，你出题 TA 猜', cat: '一起做', onOpen: () => window.gyxSoupOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxSoup', name: '海龟汤', icon: '🐢', getStatus: () => null, onResume: () => window.gyxSoupOpen(), onStart: (sid, opp) => window.gyxSoupOpen(String((opp || [])[0] || sid || '')) }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.log = D.log || []; })();
