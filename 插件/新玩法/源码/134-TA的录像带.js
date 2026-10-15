/* 📼 TA的录像带：学《Her Story》——TA 寄给你一盒旧录像带的档案：十几段 TA 过去的录音和录像片段，打乱了顺序。你不能一段段往下看，只能输关键词去搜（一次最多出 5 段），从一段里的人名、地名、东西去搜下一段，自己拼出 TA 藏着的那件事。拼出来了就告诉 TA 你的答案 */
if (window.__gyxTapes) return; window.__gyxTapes = 1;
X.feat('gyxTapes', { n: '📼 TA的录像带', desc: '搜关键词翻 TA 的旧录像片段，自己拼出 TA 藏着的事' });
const S = X.store('tapes');
let D = { arcs: [] };   // {id,cid,at,title,truth,first,clips:[{d,p,t,key,seen}],q:[],tries,solved,guess,verdict,endAt}
const save = () => S.set('d', D);
const DEF_GEN = `{{角色}}
做一盒「旧录像带档案」给她（{{她}}）看——像游戏《Her Story》：一共 14 段你过去的录音 / 录像转写，打乱了顺序，她只能靠搜关键词一段段找出来，最后拼出一件你藏着的事。
1. 先定一个「真相」：一件你过去的、跟你的身份和世界观相符的事，她现在还不知道（可以是秘密、遗憾、误会、或者其实你很早就注意到她了……），不要太黑暗。以前做过的：{{以前}}（别重复）
2. 写 14 段片段：每段有时间（比如「2019年冬」）、地点、转写内容（第一人称，60~140字，像对着录音机 / 镜头说话，口语）。其中 5 段是关键（key: true），合起来才能看出真相；其余是日常但有用的线索。
3. 每段里要有具体的人名、地名、物件，让她能拿去搜下一段；关键段之间要互相引用这些词。
4. 给一个起手关键词（first），能搜到 2~3 段开头。
只输出 JSON：{"title":"这盒带子的名字","truth":"真相，60字内","first":"起手关键词","clips":[{"d":"时间","p":"地点","t":"转写","key":false}]}`;
const DEF_JUDGE = `{{角色}}
你给她看了一盒你过去的录像带档案。你藏着的真相是：「{{真相}}」。
她看完以后说她的答案：「{{她的答案}}」
她猜到核心了吗（意思对就算，不用一字不差）？按你的性格回应她（被看穿的心情、或者温柔地说还差一点），50字以内。
只输出 JSON：{"ok":true,"line":"…"}`;
X.plGroup('📼 TA的录像带', 'gyxTapes', [['tapes.gen', '录像带档案：真相和十几段片段', 'TA 寄来一盒新录像带时', '{{角色}} {{她}} {{以前}}'], ['tapes.judge', '你说出答案，TA 怎么回应', '你提交答案时', '{{角色}} {{真相}} {{她的答案}}']], { 'tapes.gen': DEF_GEN, 'tapes.judge': DEF_JUDGE });
const LOCAL = { title: '雨天的录音', truth: '他第一次见到你，其实是三年前在那家旧书店，他一直没敢说。', first: '书店', clips: [['2021年春', '旧书店', '今天书店来了个女生，在诗集那排站了很久。我假装找书，在她旁边站了十分钟。', true], ['2021年春', '出租屋', '那本诗集我后来去买了，书签还夹在第37页，她看到的就是那一页。', true], ['2021年夏', '公交站', '下雨，又看到她了，没带伞。我把伞放在站台就跑了，像个傻子。', true], ['2022年冬', '天台', '搬家了，离书店很远。有点后悔那时候没说话。', false], ['2023年秋', '咖啡馆', '朋友问我为什么总去那家书店，我说找一本绝版书。其实找的是人。', true], ['2024年', '家', '那本诗集还在，第37页。今天她又对我笑了，她不记得了吧。', true], ['2020年', '学校', '毕业了，老师送我一句话：想说的话别等。', false], ['2022年', '地铁', '在地铁上看完了那本诗集，还是不太懂诗。', false]] };
const cur = cid => D.arcs.find(a => a.cid === String(cid) && !a.endAt);
async function gen(c) {
    if (!c || cur(c.id)) return cur(c && c.id);
    let o = X.bailu() ? null : X.json(await X.ask(X.pl('tapes.gen', DEF_GEN, { 角色: X.who(c), 她: X.me(c), 以前: D.arcs.filter(a => a.cid === String(c.id)).map(a => a.title).join('、') || '没有' })));
    let clips = o && Array.isArray(o.clips) ? o.clips.filter(x => x && x.t).map(x => ({ d: X.plain(x.d || '').slice(0, 14), p: X.plain(x.p || '').slice(0, 14), t: X.plain(x.t).slice(0, 220), key: !!x.key })) : [];
    if (clips.length < 6 || !o.truth) { o = LOCAL; clips = LOCAL.clips.map(([d, p, t, key]) => ({ d, p, t, key })); }
    if (!clips.some(x => x.key)) clips.slice(0, 4).forEach(x => { x.key = true; });
    const a = { id: 'tp' + Date.now().toString(36), cid: String(c.id), at: Date.now(), title: X.plain(o.title || '一盒旧录像带').slice(0, 20), truth: X.plain(o.truth).slice(0, 120), first: X.plain(o.first || '').slice(0, 10), clips: clips.sort(() => Math.random() - .5).map((x, i) => Object.assign(x, { i, seen: false })), q: [], tries: 0, solved: false };
    D.arcs.unshift(a); D.arcs = D.arcs.slice(0, 20); await save(); return a;
}
const hits = (a, q) => !q ? [] : a.clips.filter(x => (x.t + ' ' + x.p + ' ' + x.d).toLowerCase().includes(q.toLowerCase()));
const ready = a => { const k = a.clips.filter(x => x.key), ks = k.filter(x => x.seen).length; return ks >= Math.ceil(k.length * .6) || a.clips.filter(x => x.seen).length >= 8; };
let Q = {}, VIEW = {};
window.gyxTapesSend = async cid => { const c = X.char(cid) || X.cur(); if (!c) return; const b = document.getElementById('gyxTpNew'); if (b) { b.disabled = true; b.textContent = 'TA 在翻旧带子… ⏳'; } const a = await gen(c); if (a) Q[a.id] = a.first; window.gyxTapesOpen(c.id); };
window.gyxTapesSearch = id => { const a = D.arcs.find(x => x.id === id), el = document.getElementById('gyxTpQ'); if (!a || !el) return; const q = el.value.trim(); Q[id] = q; if (q && !a.q.includes(q)) { a.q.unshift(q); a.q = a.q.slice(0, 40); save(); } VIEW[id] = null; window.gyxTapesOpen(a.cid); };
window.gyxTapesQ = (id, q) => { Q[id] = q; VIEW[id] = null; window.gyxTapesOpen(D.arcs.find(x => x.id === id).cid); };
window.gyxTapesView = (id, i) => { const a = D.arcs.find(x => x.id === id); if (!a) return; a.clips[i].seen = true; VIEW[id] = i; save(); window.gyxTapesOpen(a.cid); };
window.gyxTapesAnswer = async id => {
    const a = D.arcs.find(x => x.id === id), c = a && X.char(a.cid), el = document.getElementById('gyxTpA'); const g = el && el.value.trim(); if (!a || !c || !g) return;
    const btn = document.getElementById('gyxTpGo'); if (btn) { btn.disabled = true; btn.textContent = 'TA 在看你的答案… ⏳'; }
    a.tries++; a.guess = g.slice(0, 200);
    let o = X.bailu() ? null : X.json(await X.ask(X.pl('tapes.judge', DEF_JUDGE, { 角色: X.who(c), 真相: a.truth, 她的答案: a.guess })));
    if (!o) { const w = a.truth.replace(/[，。、]/g, ' ').split(/\s+/).filter(x => x.length >= 2); o = { ok: w.filter(x => a.guess.includes(x.slice(0, 2))).length >= 2, line: '' }; }
    a.verdict = X.plain(o.line || '') || (o.ok ? X.v('……被你看穿了。', '你真的全看完了啊。', '嗯，就是这样。') : X.v('还差一点哦。', '不完全是，再找找？', '嗯……你再看看那几段。'));
    if (o.ok) { a.solved = true; a.endAt = Date.now(); X.say(c, a.verdict); }
    else if (a.tries >= 3) { a.endAt = Date.now(); X.say(c, a.verdict + ` 其实是：${a.truth}`); }
    await save(); window.gyxTapesOpen(a.cid);
};
window.gyxTapesDel = async id => { D.arcs = D.arcs.filter(a => a.id !== id); await save(); window.gyxTapesOpen(); };
window.gyxTapesData = () => D; window.gyxTapesHits = hits;
window.gyxTapesOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const a = cur(c.id), done = D.arcs.filter(x => x.cid === String(c.id) && x.endAt);
    let body = `<div class="gyx-row">${X.whoSel(c.id, 'gyxTapesOpen')}${a ? '' : `<button id="gyxTpNew" class="gyx-btn" onclick="gyxTapesSend('${c.id}')">让 TA 寄一盒录像带</button>`}</div>`;
    if (a) {
        const q = Q[a.id] != null ? Q[a.id] : a.first, H = hits(a, q), v = VIEW[a.id] != null ? a.clips[VIEW[a.id]] : null, seen = a.clips.filter(x => x.seen).length;
        body += `<div class="tp-h">📼 ${X.esc(a.title)} <span>看过 ${seen} / ${a.clips.length} 段</span></div>
          <div class="gyx-row"><input id="gyxTpQ" class="gyx-in tp-in" style="flex:1" value="${X.esc(q)}" placeholder="输一个词搜：人名、地名、东西……" onkeydown="if(event.key==='Enter')gyxTapesSearch('${a.id}')"><button class="gyx-btn" onclick="gyxTapesSearch('${a.id}')">搜</button></div>
          <div class="tp-res">${q ? (H.length ? `<div class="gyx-tip">「${X.esc(q)}」找到 ${H.length} 段${H.length > 5 ? '，只显示前 5 段（换个更具体的词）' : ''}</div>` + H.slice(0, 5).map(x => `<div class="tp-c${x.seen ? ' s' : ''}${v === x ? ' on' : ''}" onclick="gyxTapesView('${a.id}',${x.i})"><b>▶ ${X.esc(x.d)} · ${X.esc(x.p)}</b><span>${x.seen ? '看过' : '没看过'}</span></div>`).join('') : `<div class="gyx-tip">「${X.esc(q)}」什么都没找到。</div>`) : ''}</div>
          ${v ? `<div class="tp-v"><div class="tp-meta">● REC ${X.esc(v.d)} · ${X.esc(v.p)}</div>${X.esc(v.t)}</div>` : ''}
          ${a.q.length ? `<div class="gyx-tip">搜过：${a.q.slice(0, 16).map(x => `<span class="tp-q" onclick="gyxTapesQ('${a.id}','${X.esc(x).replace(/'/g, '')}')">${X.esc(x)}</span>`).join(' ')}</div>` : ''}
          ${ready(a) ? `<div class="gyx-card"><b>你觉得 TA 藏着的是什么？</b><textarea id="gyxTpA" class="gyx-in" rows="2" placeholder="用你自己的话说"></textarea><div class="gyx-row"><button id="gyxTpGo" class="gyx-btn" onclick="gyxTapesAnswer('${a.id}')">告诉 TA</button>${a.tries ? `<span class="gyx-tip">${X.esc(a.verdict || '')}（还能说 ${3 - a.tries} 次）</span>` : ''}</div></div>` : `<div class="gyx-tip">${X.v('再多看几段，答案就会浮出来。', '从片段里的人名、地名、东西去搜下一段。')}</div>`}`;
    } else body += `<div class="gyx-tip">TA 会把过去的录音和录像片段打乱了寄给你。你只能搜关键词，一次最多出 5 段，自己拼出 TA 藏着的那件事。自主模式里 TA 也会自己寄来。</div>`;
    if (done.length) body += '<h4 class="tp-hh">看完的带子</h4>' + done.map(x => `<div class="tp-d"><b>${X.esc(x.title)}</b> ${x.solved ? '✅ 你猜中了' : '💭 TA 自己说了'}<span>${X.esc(x.truth)}</span><i onclick="gyxTapesDel('${x.id}')">删</i></div>`).join('');
    X.panel('gyxTapesOv', '📼 ' + X.esc(X.name(c)) + ' 的录像带', body, 'dark');
};
X.ctx(id => { const a = cur(id); if (a) return `【你寄给她一盒录像带】「${a.title}」，藏着的事：${a.truth}。她还在一段段搜着看，别剧透；她问起某段可以聊那段。`; const e = D.arcs.find(x => x.cid === String(id) && x.endAt && Date.now() - x.endAt < 7 * 864e5); return e ? `【她看完了你的录像带】「${e.title}」，她${e.solved ? '自己猜到了' : '没猜到，你告诉了她'}：${e.truth}。这件事她现在知道了。` : ''; }, 'gyxTapes');
X.inj('gyxTapes', [['你寄给她一盒录像带', 'TA 寄来的录像带（还在看）', '你还在搜的时候，TA 知道藏着什么但不剧透。'], ['她看完了你的录像带', 'TA 的录像带（看完了）', '看完以后一周内，TA 记得你已经知道这件事。']]);
X.action({ key: 'gyx_tapes_send', label: '把过去的录音录像翻出来，打乱了寄给她一盒「录像带」', hint: 'TA的录像带', need: c => !cur(c.id) && !D.arcs.some(a => a.cid === String(c.id) && Date.now() - a.at < 10 * 864e5), run: async c => { const a = await gen(c); if (!a) return null; X.say(c, X.v('📼 我把以前的一些录像翻出来了……你自己看吧。', '📼 寄给你一盒带子。顺序我打乱了，慢慢找。', '📼 有些话当面说不出口，都在这盒带子里了。')); X.notify(c, `📼 <b>${X.esc(X.name(c))}</b> 寄来一盒录像带`, a.title, X.go('gyxTapesOpen', c.id)); return '寄来一盒录像带'; } }, 'gyxTapes');
X.today(() => ({ title: '📼 录像带', rows: D.arcs.filter(a => !a.endAt && X.char(a.cid)).map(a => ({ t: X.name(X.char(a.cid)), x: `${X.esc(a.title)} · 看过 ${a.clips.filter(x => x.seen).length}/${a.clips.length}`, go: `gyxTapesOpen('${a.cid}')` })) }), 'gyxTapes');
X.widget('gyxTapesW', { n: 'TA的录像带', sizes: ['s', 'm'], tap: () => window.gyxTapesOpen(), r: w => { const a = D.arcs.find(x => !x.endAt); return X.gw(w, '📼', '录像带', a ? [X.esc(a.title), `看过 ${a.clips.filter(x => x.seen).length}/${a.clips.length}`] : [D.arcs.length ? `看完 ${D.arcs.length} 盒` : '还没有']); } }, 'gyxTapes');
X.memArr({ k: 'gyxTapes', ico: '📼', n: 'TA 的录像带', d: '每盒带子藏着的事（改了真相 TA 就按你改的记）', arr: () => D.arcs, field: 'truth', text: x => `${x.title}：${x.truth}`, edit: (x, v) => { const m = String(v).match(/^(.*?)：(.*)$/); if (m) { x.title = m[1]; x.truth = m[2]; } else x.truth = v; }, meta: x => new Date(x.at).toLocaleDateString() + (x.endAt ? (x.solved ? ' · 你猜中了' : ' · 看完了') : ' · 还在看'), save }, 'gyxTapes');
X.css('gyxTapesCss', `.tp-h{font-size:16px;font-weight:700;margin:8px 0}.tp-h span{font-size:12px;color:#8e8e93;font-weight:400;margin-left:6px}.gyx-ov.dark .gyx-in{background:#2c2c2e;border-color:#3a3a3c;color:#f5f5f7}.tp-c{display:flex;justify-content:space-between;padding:9px 12px;margin:5px 0;border-radius:12px;background:#2c2c2e;cursor:pointer;font-size:13.5px}.tp-c span{color:#8e8e93;font-size:12px}.tp-c.s b{color:#aaa;font-weight:500}.tp-c.on{outline:1px solid #ff453a}.tp-v{background:#000;color:#e8e8e8;border-radius:14px;padding:14px;margin:8px 0;font-size:14.5px;line-height:1.8;font-family:"Courier New",monospace,"PingFang SC"}.tp-meta{color:#ff453a;font-size:12px;margin-bottom:6px;letter-spacing:1px}.tp-q{display:inline-block;padding:1px 8px;border-radius:8px;background:#2c2c2e;cursor:pointer;margin:2px}.tp-hh{font-size:14px;margin:14px 0 6px}.tp-d{position:relative;padding:8px 26px 8px 0;border-bottom:1px solid #2c2c2e;font-size:13.5px}.tp-d span{display:block;color:#aaa;margin-top:2px}.tp-d i{position:absolute;right:0;top:9px;font-style:normal;font-size:11px;color:#777;cursor:pointer}`);
X.mini({ id: 'gyxTapes', icon: '📼', title: 'TA的录像带', desc: '搜关键词翻 TA 的旧录像，拼出 TA 藏着的事', cat: '回忆', onOpen: () => window.gyxTapesOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.arcs = D.arcs || []; })();
