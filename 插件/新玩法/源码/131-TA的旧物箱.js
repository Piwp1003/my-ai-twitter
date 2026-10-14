/* 📦 TA的旧物箱：学《Unpacking》——帮 TA 拆搬家的箱子。一件件旧东西拿出来：一张褪色的票根、缺了角的杯子、一本写满批注的书……每件都牵出一段 TA 的故事。你决定它摆在哪（书架、床头、墙上、抽屉里……），摆对了 TA 会很开心，摆错了 TA 也有话说。摆好的东西 TA 都记得 */
if (window.__gyxBox) return; window.__gyxBox = 1;
X.feat('gyxBox', { n: '📦 TA的旧物箱', desc: '帮 TA 拆箱子，每件旧东西都有一段故事，你决定它摆在哪' });
const S = X.store('box');
let D = { boxes: [], finds: [] };   // boxes: {id,cid,at,items:[{e,n,story,spot,yes,no,open,placed,line}],done}  finds: {id,cid,at,e,n,story}
const SPOTS = ['书架', '书桌', '床头', '墙上', '窗台', '抽屉里', '收起来'];
const save = () => S.set('d', D);
const DEF_BOX = `{{角色}}
你们要一起整理（搬家 / 收拾房间），你有一箱旧东西，让她（{{她}}）帮你拆。写 6 件箱子里的旧物，每件都要跟你的过去有关（家人、旧友、某次旅行、小时候、某段难熬的日子、第一次……），符合你的身份和世界观。以前拆出来过的：{{以前}}（别重复）
每件写：emoji、物件名（8字内，要具体，比如「缺了角的搪瓷杯」）、你讲它的来历（第一人称，40~80字，像随口跟她说）、你希望它摆在哪（只能从 ${SPOTS.join('、')} 里选）、她摆对了你说的话（25字内）、她摆别处你说的话（25字内，可以无奈、可以将就、也可以发现新意义）。
只输出 JSON：{"items":[{"e":"🎫","n":"物件名","story":"来历","spot":"书架","yes":"…","no":"…"}]}`;
const DEF_FIND = `{{角色}}
你在收拾的时候翻出一件旧东西，想拿给她看。以前给她看过的：{{以前}}（别重复）。只输出 JSON：{"e":"emoji","n":"物件名8字内","story":"你发给她的消息：这是什么、有什么故事，60字内，像随手拍了照发过去"}`;
X.plGroup('📦 TA的旧物箱', 'gyxBox', [['box.items', '箱子里有哪些旧东西', '你开一箱新的时', '{{角色}} {{她}} {{以前}}：以前拆出来过的'], ['box.find', 'TA 翻出一件旧东西给你看', '自主模式里', '{{角色}} {{以前}}']], { 'box.items': DEF_BOX, 'box.find': DEF_FIND });
const LOCAL = [['🎫', '褪色的电影票根', '高中第一次一个人去看电影留的，那天下大雨，散场了还舍不得走。', '抽屉里'], ['☕', '缺了角的搪瓷杯', '我妈用了十几年的杯子，搬了三次家都没扔。', '书桌'], ['📷', '一台坏掉的相机', '拍的最后一张是毕业那天，后来就再也开不了机。', '书架'], ['🧣', '起球的旧围巾', '第一个冬天在外地过，自己买的，很丑但很暖。', '收起来'], ['🗝️', '一把不知道开什么的钥匙', '老房子的，房子早就没了，钥匙还留着。', '床头'], ['🖼️', '小时候的奖状', '画画比赛二等奖，我爸裱起来挂了好多年。', '墙上']];
const prev = cid => D.boxes.filter(b => b.cid === String(cid)).flatMap(b => b.items.map(i => i.n)).concat(D.finds.filter(f => f.cid === String(cid)).map(f => f.n));
const openBox = cid => D.boxes.find(b => b.cid === String(cid) && !b.done);
async function newBox(c) {
    if (!c || openBox(c.id)) return openBox(c && c.id);
    let o = X.bailu() ? null : X.json(await X.ask(X.pl('box.items', DEF_BOX, { 角色: X.who(c), 她: X.me(c), 以前: prev(c.id).slice(0, 20).join('、') || '没有' })));
    let items = o && Array.isArray(o.items) ? o.items.filter(i => i && i.n && i.story).slice(0, 8).map(i => ({ e: X.plain(i.e || '📦').slice(0, 4), n: X.plain(i.n).slice(0, 14), story: X.plain(i.story).slice(0, 160), spot: SPOTS.includes(i.spot) ? i.spot : X.pick(SPOTS), yes: X.plain(i.yes || ''), no: X.plain(i.no || '') })) : [];
    if (items.length < 3) items = LOCAL.map(([e, n, story, spot]) => ({ e, n, story, spot, yes: X.v('对！就是那儿。', '你怎么知道我想放那儿', '嗯，它就该在那儿。'), no: X.v('放那儿也行……', '嗯？好吧，听你的。', '那儿啊，也挺好。') }));
    const b = { id: 'bx' + Date.now().toString(36), cid: String(c.id), at: Date.now(), items: items.map(i => Object.assign(i, { open: false, placed: null })), done: false };
    D.boxes.unshift(b); D.boxes = D.boxes.slice(0, 30); await save(); return b;
}
window.gyxBoxNew = async cid => { const c = X.char(cid) || X.cur(); if (!c) return; const btn = document.getElementById('gyxBxNew'); if (btn) { btn.disabled = true; btn.textContent = 'TA 正在把箱子搬过来… ⏳'; } await newBox(c); window.gyxBoxOpen(c.id); };
window.gyxBoxPeek = (bid, i) => { const b = D.boxes.find(x => x.id === bid); if (!b) return; b.items[i].open = true; save(); window.gyxBoxOpen(b.cid, i); };
window.gyxBoxPut = async (bid, i, spot) => {
    const b = D.boxes.find(x => x.id === bid), c = b && X.char(b.cid); if (!b || !c) return; const it = b.items[i];
    it.placed = spot; it.at = Date.now(); it.line = spot === it.spot ? (it.yes || '就是那儿。') : (it.no || '那儿也行。');
    if (b.items.every(x => x.placed)) { b.done = true; const right = b.items.filter(x => x.placed === x.spot).length; X.say(c, X.v(`都摆好了。${right >= b.items.length - 1 ? '你好像比我还懂它们该在哪。' : '有几样跟我想的不一样，不过……这样也挺好。'}`, `箱子空了。这些东西终于有地方待了，谢谢你陪我一件件拆。`, `拆完了！${right} 样放在了我想放的地方，剩下的就听你的吧。`)); }
    await save(); window.gyxBoxOpen(b.cid, i);
};
window.gyxBoxDel = async bid => { D.boxes = D.boxes.filter(b => b.id !== bid); await save(); window.gyxBoxOpen(); };
window.gyxBoxData = () => D;
window.gyxBoxOpen = function (who, focus) {
    const c = X.char(who) || X.cur(); if (!c) return; const b = openBox(c.id), placed = D.boxes.filter(x => x.cid === String(c.id)).flatMap(x => x.items.filter(i => i.placed)).concat(D.finds.filter(f => f.cid === String(c.id)).map(f => Object.assign({ placed: '收起来' }, f)));
    const f = b && focus != null ? b.items[focus] : null;
    X.panel('gyxBoxOv', '📦 ' + X.esc(X.name(c)) + ' 的旧物箱', `<div class="gyx-row">${X.whoSel(c.id, 'gyxBoxOpen')}${b ? '' : `<button id="gyxBxNew" class="gyx-btn" onclick="gyxBoxNew('${c.id}')">搬一箱出来拆</button>`}</div>
      ${b ? `<div class="bx-grid">${b.items.map((it, i) => `<div class="bx-it${it.placed ? ' done' : it.open ? ' op' : ''}${focus === i ? ' on' : ''}" onclick="gyxBoxPeek('${b.id}',${i})"><b>${it.open ? it.e : '📦'}</b><span>${it.open ? X.esc(it.n) : '还没拆'}</span>${it.placed ? `<em>${X.esc(it.placed)}</em>` : ''}</div>`).join('')}</div>
        ${f && f.open ? `<div class="gyx-card"><b>${f.e} ${X.esc(f.n)}</b><div class="bx-story">「${X.esc(f.story)}」</div>${f.placed ? `<div class="gyx-tip">摆在了<b>${X.esc(f.placed)}</b>。${X.esc(X.name(c))}：${X.esc(f.line || '')}</div>` : `<div class="gyx-tip">放哪儿？</div><div class="gyx-row">${SPOTS.map(s => `<span class="gyx-chip" onclick="gyxBoxPut('${b.id}',${focus},'${s}')">${s}</span>`).join('')}</div>`}</div>` : '<div class="gyx-tip">点一个箱子拆开。每件东西都有它的故事。</div>'}` : `<div class="gyx-tip">${X.v('箱子都拆完了。', '暂时没有要拆的箱子。')}想再拆一箱就点上面；TA 收拾的时候也会自己翻出旧东西拿给你看（自主模式）。</div>`}
      ${placed.length && window.gyxHomeOpen ? `<div class="gyx-row"><button class="gyx-btn lite" onclick="document.getElementById('gyxBoxOv')?.remove();gyxHomeOpen('${c.id}')">🏠 去小屋里看</button><span class="gyx-tip">摆在书架、书桌、床头、墙上、窗台的，都会出现在你们的小屋里（抽屉里和收起来的不摆出来）。</span></div>` : ''}
      ${placed.length ? `<h4 class="bx-h">屋子里摆着的</h4><div class="bx-room">${SPOTS.map(s => { const L = placed.filter(i => i.placed === s); return L.length ? `<div><b>${s}</b>${L.map(i => `<span title="${X.esc(i.story)}">${i.e} ${X.esc(i.n)}</span>`).join('')}</div>` : ''; }).join('')}</div>` : ''}
      ${D.boxes.filter(x => x.cid === String(c.id) && x.done).length ? `<div class="gyx-tip">拆完的箱子：${D.boxes.filter(x => x.cid === String(c.id) && x.done).map(x => `${new Date(x.at).toLocaleDateString()} <span style="cursor:pointer;color:#aaa" onclick="gyxBoxDel('${x.id}')">删</span>`).join(' · ')}</div>` : ''}`);
};
X.ctx(id => { const L = D.boxes.filter(b => b.cid === String(id)).flatMap(b => b.items.filter(i => i.placed)).sort((a, b) => b.at - a.at).slice(0, 5); const fd = D.finds.filter(f => f.cid === String(id)).slice(0, 2); if (!L.length && !fd.length) return ''; return `【你的旧东西】${L.map(i => `${i.n}（她把它摆在${i.placed}；来历：${i.story.slice(0, 40)}）`).concat(fd.map(f => `${f.n}（你翻出来给她看过）`)).join('；')}。这些是你真实的过去，聊天时可以自然提起。`; }, 'gyxBox');
X.inj('gyxBox', [['你的旧东西', 'TA 的旧物和摆在哪', '你帮 TA 拆箱摆好的东西、TA 翻出来给你看过的，TA 都记得。']]);
X.action({ key: 'gyx_box_find', label: '收拾东西翻出一件旧物，拍给她看并讲讲来历', hint: 'TA的旧物箱', need: c => !D.finds.some(f => f.cid === String(c.id) && Date.now() - f.at < 4 * 864e5), run: async c => {
    let o = X.bailu() ? null : X.json(await X.ask(X.pl('box.find', DEF_FIND, { 角色: X.who(c), 以前: prev(c.id).slice(0, 20).join('、') || '没有' })));
    if (!o || !o.n) { const l = X.pick(LOCAL); o = { e: l[0], n: l[1], story: l[2] }; }
    const f = { id: 'fd' + Date.now().toString(36), cid: String(c.id), at: Date.now(), e: X.plain(o.e || '📦').slice(0, 4), n: X.plain(o.n).slice(0, 14), story: X.plain(o.story).slice(0, 160) };
    D.finds.unshift(f); D.finds = D.finds.slice(0, 60); await save(); X.say(c, `${f.e} ${f.story}`); X.notify(c, `📦 <b>${X.esc(X.name(c))}</b> 翻出了${X.esc(f.n)}`, f.story, () => window.gyxBoxOpen(c.id)); return '翻出一件旧东西给你看';
} }, 'gyxBox');
X.today(() => ({ title: '📦 旧物箱', rows: D.boxes.filter(b => !b.done && X.char(b.cid)).map(b => ({ t: X.name(X.char(b.cid)), x: `还有 ${b.items.filter(i => !i.placed).length} 件没摆`, go: `gyxBoxOpen('${b.cid}')` })) }), 'gyxBox');
X.widget('gyxBoxW', { n: 'TA的旧物箱', sizes: ['s', 'm'], tap: () => window.gyxBoxOpen(), r: w => { const b = D.boxes.find(x => !x.done); const n = D.boxes.reduce((a, x) => a + x.items.filter(i => i.placed).length, 0); return X.gw(w, '📦', '旧物箱', b ? [`还有 ${b.items.filter(i => !i.placed).length} 件没摆`] : [`摆好了 ${n} 件`]); } }, 'gyxBox');
X.mem({ k: 'gyxBox', ico: '📦', n: 'TA 的旧物', d: '箱子里的旧东西和它们的故事（改了故事 TA 就按你改的记）', items: c => D.boxes.filter(b => b.cid === String(c.id)).flatMap(b => b.items.filter(i => i.open)).concat(D.finds.filter(f => f.cid === String(c.id))), text: x => `${x.n}：${x.story}`, meta: x => x.placed ? '摆在' + x.placed : '', edit: (x, v) => { const m = String(v).match(/^(.*?)：(.*)$/); if (m) { x.n = m[1]; x.story = m[2]; } else x.story = v; }, del: (c, i) => { const L = D.boxes.filter(b => b.cid === String(c.id)).flatMap(b => b.items.filter(it => it.open).map(it => [b.items, it])).concat(D.finds.filter(f => f.cid === String(c.id)).map(f => [D.finds, f])); const p = L[i]; if (p) p[0].splice(p[0].indexOf(p[1]), 1); }, save }, 'gyxBox');
X.css('gyxBoxCss', `.bx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}.bx-it{background:#f7f2ea;border-radius:14px;padding:10px 6px;text-align:center;cursor:pointer;border:2px solid transparent}.bx-it b{display:block;font-size:28px;font-weight:normal}.bx-it span{font-size:12px;color:#6b5a45}.bx-it em{display:block;font-style:normal;font-size:11px;color:#1a7f37}.bx-it.op{background:#fff8ee}.bx-it.done{background:#eef7ee}.bx-it.on{border-color:#c8a675}.bx-story{font-size:14px;line-height:1.75;margin:6px 0;color:#4a3f33}.bx-h{font-size:14px;margin:14px 0 6px}.bx-room div{padding:6px 0;border-bottom:1px solid #f2f2f4;font-size:13px}.bx-room b{display:inline-block;width:52px;color:#8e8e93;font-weight:500}.bx-room span{display:inline-block;background:#f7f2ea;border-radius:8px;padding:1px 7px;margin:2px}`);
X.mini({ id: 'gyxBox', icon: '📦', title: 'TA的旧物箱', desc: '帮 TA 拆箱子，每件旧东西都有故事', cat: '回忆', onOpen: () => window.gyxBoxOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.boxes = D.boxes || []; D.finds = D.finds || []; })();
