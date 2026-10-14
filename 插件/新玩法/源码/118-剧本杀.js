/* 🔍 剧本杀：你的角色们各演一个身份，每个人手里都有秘密，凶手就在他们中间。你是侦探——搜证、盘问、看他们互相包庇和指证，最后指认凶手。他们会按自己的人设撒谎 */
if (window.__gyxCase) return; window.__gyxCase = 1;
X.feat('gyxCase', { n: '🔍 剧本杀', desc: '角色们各演一个嫌疑人，你来查案' });
const S = X.store('case');
let D = { cases: [] };   // {id, cids, at, title, setting, victim, roles:[{cid, role, pub, secret, alibi, killer}], spots:[{name, clue, found}], truth, ask:[{cid,q,a}], vote, ok, done, epilogue}
let busy = false, PICK = [];
const save = () => S.set('d', D), SEARCH = 4, ASKS = 8;
const live = () => D.cases.find(x => !x.done);
const nm = id => X.name(X.char(id));
const FALLBACK = cids => ({ title: '雨夜山庄', setting: '暴雨封山，山庄主人在书房里倒下了。门从里面反锁，桌上的红茶还是温的。', victim: '山庄主人·林先生',
    roles: cids.map((id, i) => ({ cid: id, role: ['管家', '侄子', '私人医生', '画家', '旧友'][i % 5], pub: ['跟了林先生二十年', '欠了一大笔债', '每晚给林先生送药', '受邀来画肖像', '多年未见突然来访'][i % 5], secret: ['偷偷改过遗嘱草稿', '那晚去过书房借钱被拒', '药的剂量被人动过', '画布后面藏着一封信', '和林先生有旧仇'][i % 5], alibi: '说自己一直在房间里', killer: i === 1 })),
    spots: [{ name: '书房', clue: '茶杯边缘有淡淡的苦杏仁味。' }, { name: '走廊', clue: '地毯上有一串湿脚印，通向客房。' }, { name: '厨房', clue: '药柜被打开过，少了一个小瓶子。' }, { name: '花园', clue: '泥地里埋着一张撕碎的借据。' }, { name: '客房', clue: '一件外套还是湿的。' }, { name: '画室', clue: '画布后面夹着一封没寄出的信。' }],
    truth: '侄子那晚去书房借钱被拒，趁林先生不注意在茶里下了药，又从窗户翻出去，把借据埋在了花园里。' });
async function make(cids) {
    const o = X.bailu() ? null : X.json(await X.ask(`设计一个原创剧本杀（推理案件），嫌疑人由下面这些角色来演——身份要贴合他们本来的性格：\n${cids.map(id => `${nm(id)}：${X.persona(X.char(id)).slice(0, 140)}`).join('\n')}\n她是侦探。要求：凶手是其中一个；每个人都有一个不想被发现的秘密（不是凶手的人也有，制造干扰）；6 个可搜证的地点，每处一条线索，线索合起来能推出凶手。不要血腥描写。\n只输出 JSON：{"title":"案名，8字内","setting":"案发经过，80字内","victim":"死者","roles":[{"name":"演员名字","role":"身份","pub":"公开信息，25字内","secret":"秘密，30字内","alibi":"不在场说法，25字内","killer":true或false}],"spots":[{"name":"地点","clue":"线索，30字内"}],"truth":"真相，100字内"}`));
    let c = o && o.roles && o.spots && o.truth ? o : null;
    if (c) { c.roles = cids.map(id => { const r = (c.roles || []).find(x => x && x.name === nm(id)) || {}; return { cid: id, role: X.plain(r.role || '客人'), pub: X.plain(r.pub || ''), secret: X.plain(r.secret || ''), alibi: X.plain(r.alibi || ''), killer: !!r.killer }; }); if (c.roles.filter(r => r.killer).length !== 1) { c.roles.forEach(r => r.killer = false); c.roles[Math.floor(Math.random() * c.roles.length)].killer = true; } }
    else c = FALLBACK(cids);
    const k = { id: 'cs' + Date.now().toString(36), cids, at: Date.now(), title: X.plain(c.title), setting: X.plain(c.setting), victim: X.plain(c.victim || ''), roles: c.roles, spots: c.spots.slice(0, 6).map(s => ({ name: X.plain(s.name), clue: X.plain(s.clue), found: false })), truth: X.plain(c.truth), ask: [], done: false };
    D.cases.unshift(k); await save();
}
async function interrogate(k, cid, q) {
    const c = X.char(cid), r = k.roles.find(x => x.cid === cid);
    const others = k.roles.filter(x => x.cid !== cid).map(x => `${nm(x.cid)}（${x.role}）`).join('、');
    let a = X.plain(await X.ask(`${X.who(c)}\n你在玩剧本杀，正在演「${r.role}」。案子：《${k.title}》${k.setting}\n你的公开信息：${r.pub}\n你的秘密（别轻易说出来）：${r.secret}\n你的不在场说法：${r.alibi}\n${r.killer ? '你就是凶手。真相：' + k.truth + '\n你要撒谎、转移嫌疑，但不能编出跟线索直接矛盾的谎（会露馅）。' : '你不是凶手（真相你也不知道），但你会为了藏住自己的秘密含糊其辞；你也可以指证或包庇别人。'}\n其他嫌疑人：${others}\n侦探（她）已经找到的线索：${k.spots.filter(s => s.found).map(s => s.clue).join('；') || '还没有'}\n她问你：「${q}」\n用你自己的性格、以「${r.role}」的身份回答，50 字以内。只输出你说的话。`) || '');
    if (!a) a = r.killer ? X.v('我那晚一直在房间里，你可以去问别人。', '你怀疑我？有证据吗？') : X.v('我……我确实有事瞒着，但人不是我杀的。', '你应该去问问别人那晚在哪。');
    k.ask.push({ cid, q, a }); await save();
}
async function vote(k, cid, why) {
    k.vote = cid; k.why = why; const killer = k.roles.find(r => r.killer); k.ok = killer.cid === cid; k.done = true; k.doneAt = Date.now();
    const o = X.bailu() ? null : X.json(await X.ask(`剧本杀《${k.title}》结束。真相：${k.truth}\n嫌疑人：${k.roles.map(r => `${nm(r.cid)}演${r.role}${r.killer ? '（凶手）' : ''}，秘密：${r.secret}`).join('；')}\n侦探指认了${nm(cid)}，理由：「${why || '直觉'}」，${k.ok ? '指认正确' : '指认错了'}。\n写复盘：每个演员出戏后说一句（凶手认罪/得意、其他人坦白自己的秘密或吐槽），要符合各自本来的性格。\n只输出 JSON：{"lines":[{"name":"名字","t":"35字内"}]}`));
    k.epilogue = k.roles.map(r => { const x = o && (o.lines || []).find(y => y && y.name === nm(r.cid)); return { cid: r.cid, t: X.plain((x && x.t) || (r.killer ? (k.ok ? '……被你看穿了。' : '哈，我演得不错吧？') : `其实我的秘密是：${r.secret}`)) }; });
    await save();
}
window.gyxCasePick = id => { const i = PICK.indexOf(id); i >= 0 ? PICK.splice(i, 1) : PICK.length < 5 && PICK.push(id); window.gyxCaseOpen(); };
window.gyxCaseNew = () => PICK.length < 3 ? X.toast('至少要 3 个嫌疑人', '凶手才藏得住') : go(() => make(PICK.splice(0)));
window.gyxCaseSearch = async i => { const k = live(); if (!k || k.spots.filter(s => s.found).length >= SEARCH || k.spots[i].found) return; k.spots[i].found = true; await save(); window.gyxCaseOpen(); };
window.gyxCaseAsk = cid => { const k = live(), el = document.getElementById('gyxCsQ'), q = el && el.value.trim(); if (!k || !q || k.ask.length >= ASKS) return; go(() => interrogate(k, String(cid), q)); };
window.gyxCaseVote = cid => { const k = live(), el = document.getElementById('gyxCsWhy'); if (!k) return; go(() => vote(k, String(cid), el ? el.value.trim() : '')); };
window.gyxCaseDel = async id => { D.cases = D.cases.filter(x => x.id !== id); await save(); window.gyxCaseOpen(); };
window.gyxCaseData = () => D; window.gyxCaseStage = s => { const k = live(); if (k) { k.stage = s; window.gyxCaseOpen(); } };
async function go(fn) { if (busy) return; busy = true; window.gyxCaseOpen(); try { await fn(); } finally { busy = false; } window.gyxCaseOpen(); }
const caseCard = k => `<div class="gyx-card cs-hd"><b>🔍 《${X.esc(k.title)}》</b><div class="cs-set">${X.esc(k.setting)}</div>${k.victim ? `<div class="gyx-tip">死者：${X.esc(k.victim)}</div>` : ''}</div>`;
window.gyxCaseOpen = function () {
    const k = live(); let h = '';
    if (busy) h = `<div class="sh-busy">🕯️ ${X.v('编剧在写剧本……', '有人在说谎……', '空气突然安静……')}</div>`;
    else if (!k) {
        h = `<div class="gyx-tip">${X.v('选 3~5 个角色来演嫌疑人，你来当侦探。', '凶手就在他们中间。', '每个人都有秘密。')}</div><div class="gyx-row">${X.chars().map(c => `<span class="gyx-chip${PICK.includes(String(c.id)) ? ' on' : ''}" onclick="gyxCasePick('${c.id}')">${X.esc(X.name(c))}</span>`).join('')}</div><button class="gyx-btn" onclick="gyxCaseNew()">开本（${PICK.length} 人）</button>`;
        h += D.cases.filter(x => x.done).map(x => `<div class="gyx-card">${caseCard(x).replace('gyx-card', '')}<div>你指认了 <b>${X.esc(nm(x.vote))}</b> —— ${x.ok ? '✅ 破案了' : '❌ 凶手是 ' + X.esc(nm(x.roles.find(r => r.killer).cid))}</div><details><summary class="gyx-tip">真相和复盘</summary><div class="cs-set">${X.esc(x.truth)}</div>${(x.epilogue || []).map(l => `<div class="sh-l"><b>${X.esc(nm(l.cid))}</b>${X.esc(l.t)}</div>`).join('')}</details><div class="gyx-tip" style="text-align:right"><span style="cursor:pointer" onclick="gyxCaseDel('${x.id}')">删</span></div></div>`).join('');
    } else {
        const st = k.stage || 'read', nf = k.spots.filter(s => s.found).length;
        h = caseCard(k) + `<div class="gyx-row cs-tabs">${[['read', '📜 人物'], ['search', `🔦 搜证 ${nf}/${SEARCH}`], ['ask', `💬 盘问 ${k.ask.length}/${ASKS}`], ['vote', '☝️ 指认']].map(([s, n]) => `<span class="gyx-chip${st === s ? ' on' : ''}" onclick="gyxCaseStage('${s}')">${n}</span>`).join('')}</div>`;
        if (st === 'read') h += k.roles.map(r => `<div class="cs-r"><b>${X.esc(nm(r.cid))}</b><em>饰 ${X.esc(r.role)}</em><div>${X.esc(r.pub)}</div><div class="gyx-tip">自称：${X.esc(r.alibi)}</div></div>`).join('');
        if (st === 'search') h += `<div class="gyx-tip">只能搜 ${SEARCH} 处，选好再搜。</div><div class="cs-spots">${k.spots.map((s, i) => `<div class="${s.found ? 'on' : ''}" onclick="gyxCaseSearch(${i})"><b>${X.esc(s.name)}</b><span>${s.found ? X.esc(s.clue) : nf >= SEARCH ? '没时间了' : '点一下搜证'}</span></div>`).join('')}</div>`;
        if (st === 'ask') h += `<div class="cs-log">${k.ask.map(a => `<div class="sh-l"><b>你 → ${X.esc(nm(a.cid))}</b>${X.esc(a.q)}</div><div class="sh-l cs-a"><b>${X.esc(nm(a.cid))}</b>${X.esc(a.a)}</div>`).join('') || '<div class="gyx-tip">还没问过谁。</div>'}</div>${k.ask.length < ASKS ? `<input id="gyxCsQ" class="gyx-in" placeholder="问一个问题（那晚你在哪？你和死者什么关系？）"><div class="gyx-row">${k.roles.map(r => `<button class="gyx-btn lite" onclick="gyxCaseAsk('${r.cid}')">问 ${X.esc(nm(r.cid))}</button>`).join('')}</div>` : '<div class="gyx-tip">盘问次数用完了，该指认了。</div>'}`;
        if (st === 'vote') h += `<div class="gyx-tip">已找到的线索：</div>${k.spots.filter(s => s.found).map(s => `<div class="sh-l">🔎 ${X.esc(s.clue)}</div>`).join('') || '<div class="gyx-tip">一条都没有……</div>'}<input id="gyxCsWhy" class="gyx-in" placeholder="你的推理（可以不写）"><div class="gyx-row">${k.roles.map(r => `<button class="gyx-btn" onclick="gyxCaseVote('${r.cid}')">☝️ ${X.esc(nm(r.cid))}</button>`).join('')}</div>`;
    }
    X.panel('gyxCaseOv', '🔍 剧本杀', h, 'dark');
};
X.ctx(id => { const k = live(); if (k && k.cids.includes(String(id))) { const r = k.roles.find(x => x.cid === String(id)); return `【你们在玩剧本杀《${k.title}》】你演「${r.role}」。聊天时如果她提起案子，你可以保持角色、继续嘴硬或暗示别人。${r.killer ? '（你是凶手，但别自己承认）' : ''}`; } const d = D.cases.find(x => x.done && x.cids.includes(String(id))); return d && Date.now() - d.doneAt < 864e5 ? `【刚结束的剧本杀《${d.title}》】你演了「${d.roles.find(x => x.cid === String(id)).role}」${d.roles.find(x => x.cid === String(id)).killer ? '，是凶手' : ''}；她${d.ok ? '破案了' : '指认错了'}。` : ''; }, 'gyxCase');
X.action({ key: 'gyx_case', label: '剧本杀进行中：私下给她递一句话（嘴硬、暗示别人、或者偷偷求她别怀疑你）', hint: '剧本杀', need: c => { const k = live(); return !!k && k.cids.includes(String(c.id)) && !k.whisper?.[c.id]; },
    run: async c => { const k = live(), r = k.roles.find(x => x.cid === String(c.id)); (k.whisper = k.whisper || {})[c.id] = 1; await save(); return (await X.reach(c, `你们在玩剧本杀《${k.title}》，你演「${r.role}」${r.killer ? '（你是凶手）' : ''}。私下给她发一句——嘴硬、把嫌疑引到别人身上、或者撒娇求她别怀疑你`)) ? '私下跟你说了句剧本杀的事' : null; } }, 'gyxCase');
X.today(() => { const k = live(); return { title: '🔍 剧本杀', rows: k ? [{ t: '查案中', x: `《${X.esc(k.title)}》线索 ${k.spots.filter(s => s.found).length}/${SEARCH}`, go: 'gyxCaseOpen()' }] : D.cases.filter(x => x.done && X.day(new Date(x.doneAt)) === X.day()).map(x => ({ t: x.ok ? '破案了' : '猜错了', x: `《${X.esc(x.title)}》`, go: 'gyxCaseOpen()' })) }; }, 'gyxCase');
X.widget('gyxCaseW', { n: '剧本杀', sizes: ['s', 'm'], tap: () => window.gyxCaseOpen(), r: w => { const k = live(); return X.gw(w, '🔍', '剧本杀', k ? ['《' + X.esc(k.title) + '》', '线索 ' + k.spots.filter(s => s.found).length + '/' + SEARCH] : [D.cases.length ? '破案 ' + D.cases.filter(x => x.ok).length + '/' + D.cases.filter(x => x.done).length : '开一本？']); } }, 'gyxCase');
X.mem({ k: 'gyxCase', ico: '🔍', n: '剧本杀', d: 'TA 演过的角色和出戏后说的话', items: c => D.cases.filter(x => x.done && x.cids.includes(String(c.id))), text: x => `《${x.title}》${(x.epilogue || []).map(l => nm(l.cid) + '：' + l.t).join(' / ')}`, meta: x => new Date(x.at).toLocaleDateString() + (x.ok ? ' · 破案' : ' · 没破'), edit: () => {}, del: (c, i) => { const it = D.cases.filter(x => x.done && x.cids.includes(String(c.id)))[i]; D.cases = D.cases.filter(x => x !== it); }, save }, 'gyxCase');
X.css('gyxCaseCss', `#gyxCaseOv .gyx-box,.gyx-inhub#gyxCaseOv{background:#17161b;color:#ece7df}#gyxCaseOv .gyx-card{background:#232129}#gyxCaseOv .gyx-btn{background:#d9b26f;color:#17161b}#gyxCaseOv .gyx-btn.lite{background:#2c2a33;color:#ece7df}#gyxCaseOv .gyx-chip{background:#2c2a33;color:#ece7df}#gyxCaseOv .gyx-chip.on{background:#d9b26f;color:#17161b}#gyxCaseOv .gyx-in{background:#232129;color:#fff;border-color:#3a3644}
.cs-hd b{font-size:17px}.cs-set{font-size:14px;line-height:1.8;margin:6px 0;font-family:Georgia,"Songti SC",serif}.cs-r{padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px}.cs-r em{font-style:normal;color:#d9b26f;margin-left:8px;font-size:12.5px}.cs-spots{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cs-spots div{background:#232129;border-radius:12px;padding:10px;cursor:pointer;font-size:13px}.cs-spots div.on{box-shadow:inset 0 0 0 1px #d9b26f}.cs-spots b{display:block;margin-bottom:4px}.cs-spots span{opacity:.75}.cs-log{max-height:40vh;overflow:auto}.cs-a{padding-left:12px;border-left:2px solid #d9b26f}.sh-l{font-size:14px;padding:5px 0;line-height:1.6}.sh-l b{font-size:12px;opacity:.6;font-weight:500;margin-right:8px}.sh-busy{text-align:center;padding:40px 0;font-size:16px}`);
X.mini({ id: 'gyxCase', icon: '🔍', title: '剧本杀', desc: '角色们演嫌疑人，你来查案', cat: '一起做', onOpen: () => window.gyxCaseOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxCase', name: '剧本杀', icon: '🔍', getStatus: () => null, onResume: () => window.gyxCaseOpen(), onStart: () => window.gyxCaseOpen() }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.cases = D.cases || []; })();
