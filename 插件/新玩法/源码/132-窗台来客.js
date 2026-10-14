/* 🪟 窗台来客：学《猫咪后院》——在窗台上放点东西（小鱼干、一杯热茶、一本旧书、一枝花……），你不在的时候会有客人来：一只橘猫、隔壁的鸽子、世界里的 NPC，有时候是角色自己偷偷来过。客人吃了你放的东西，会留下点什么：一片羽毛、一张纸条、一颗石子。来过的客人都收进图鉴 */
if (window.__gyxSill) return; window.__gyxSill = 1;
X.feat('gyxSill', { n: '🪟 窗台来客', desc: '窗台上放点东西，你不在时会有客人来，留下礼物和纸条' });
const S = X.store('sill');
let D = { sill: null, visits: [], seen: {} };   // sill: {k,at,due}  visits: {id,at,who,ico,kind,cid,item,gift,note,read}
const ITEMS = [['🐟', '小鱼干'], ['🍬', '一把糖'], ['🍵', '一杯热茶'], ['📖', '一本旧书'], ['🌼', '一枝花'], ['🧶', '毛线球'], ['📝', '便签纸和笔'], ['🍪', '饼干'], ['🍞', '面包屑'], ['🎐', '风铃']];
const ANIMALS = [['🐈', '一只橘猫', ['🐟', '🧶']], ['🐦', '一只小麻雀', ['🍞', '🍪']], ['🕊️', '一只灰鸽子', ['🍞', '🍪']], ['🐕', '邻居家的柴犬', ['🍪', '🐟']], ['🦔', '一只刺猬', ['🍪', '🌼']], ['🐦‍⬛', '一只乌鸦', ['🍬', '🎐']], ['🐿️', '一只松鼠', ['🍪', '🍬']], ['🦋', '一只蝴蝶', ['🌼', '🍬']]];
const save = () => S.set('d', D);
const DEF_VISIT = `她（{{她}}）在窗台上放了「{{东西}}」。她不在的时候，{{来客}}来过了。
{{来客说明}}
写这次来访：来客怎么吃 / 用掉了这件东西，留下了什么（一样小东西，带 emoji，12字内），以及留下的纸条或者痕迹（40字内；动物就写它留下的痕迹，人就写纸条上的话，要符合这个人的性格）。
只输出 JSON：{"gift":"🪶 一根灰色羽毛","note":"…"}`;
X.plGroup('🪟 窗台来客', 'gyxSill', [['sill.visit', '谁来过窗台、留下了什么', '你放的东西被客人拿走时', '{{她}} {{东西}} {{来客}} {{来客说明}}：这个客人是谁、什么性格']], { 'sill.visit': DEF_VISIT });
function pool(itemIco) {
    const P = [];
    ANIMALS.forEach(a => P.push({ kind: 'animal', who: a[1], ico: a[0], w: a[2].includes(itemIco) ? 4 : 1 }));
    try { (window.gyNpcAll ? window.gyNpcAll() : []).filter(n => n && n.on !== false).slice(0, 30).forEach(n => P.push({ kind: 'npc', who: n.name, ico: n.ico || '👤', desc: [n.who, n.tie].filter(Boolean).join('，'), w: 1 })); } catch (e) {}
    X.chars().forEach(c => P.push({ kind: 'char', who: X.name(c), ico: '💌', cid: String(c.id), w: 1.2 }));
    let r = Math.random() * P.reduce((a, p) => a + p.w, 0); for (const p of P) { r -= p.w; if (r <= 0) return p; } return P[0];
}
async function visit(force, v) {
    if (!D.sill && !force) return null;
    const it = D.sill ? ITEMS.find(i => i[1] === D.sill.k) || ITEMS[0] : null; v = v || pool(it && it[0]);
    const c = v.cid && X.char(v.cid);
    let o = X.bailu() ? null : X.json(await X.ask(X.pl('sill.visit', DEF_VISIT, { 她: X.me(c || X.cur()), 东西: it ? it[0] + it[1] : '什么都没放（来客是自己想来的）', 来客: v.who, 来客说明: v.kind === 'char' ? `${X.who(c)}\n你是偷偷来的，别让她当场发现，但可以留下点只有她懂的线索。` : v.kind === 'npc' ? `${v.who}：${v.desc || '世界里的人'}` : `这是一只动物，不会写字，只会留下痕迹。` })));
    if (!o || !o.gift) o = v.kind === 'animal' ? { gift: X.pick(['🪶 一根羽毛', '🌰 一颗橡果', '🪨 一颗光滑的石子', '🍂 一片叶子', '🐾 几个小脚印']), note: X.pick(['东西吃得干干净净，窗台上留着几个小脚印。', '它好像在这儿睡了一会儿，留下一点温度。', '碗被推到了一边，旁边整整齐齐放着一样东西。']) } : { gift: X.pick(['🍬 一颗糖', '🌼 一朵小花', '📝 一张折好的纸条']), note: X.pick(['路过，看你窗台上有东西就拿了，谢啦。', '下次放点别的吧，这个我吃腻了。', '今天也辛苦了。']) };
    const rec = { id: 'sv' + Date.now().toString(36), at: Date.now(), who: v.who, ico: v.ico, kind: v.kind, cid: v.cid || '', item: it ? it[0] + ' ' + it[1] : '', gift: X.plain(o.gift).slice(0, 20), note: X.plain(o.note).slice(0, 100), read: false, room: v.cid || String((X.cur() || {}).id || '') };   // room：礼物摆进哪个小屋（角色来的就进 TA 那间，别的进你当时在看的那间）
    D.visits.unshift(rec); D.visits = D.visits.slice(0, 200); D.seen[v.who] = (D.seen[v.who] || 0) + 1; D.sill = null; await save();
    X.notify(c || X.cur(), `🪟 ${X.v('窗台上有人来过', '有客人来过你的窗台', '窗台那边有动静')}`, `留下了${rec.gift}`, () => window.gyxSillOpen());
    return rec;
}
setInterval(() => { try { if (X.on('gyxSill') && D.sill && Date.now() >= D.sill.due) visit(); } catch (e) {} }, 5 * 60000);
window.gyxSillPut = async k => { D.sill = { k, at: Date.now(), due: Date.now() + X.rnd(1, 4) * 36e5 }; await save(); X.toast(X.v('🪟 放好了', '🪟 摆在窗台上了'), X.v('等等看谁会来', '你不在的时候可能会有客人', '过一阵再来看看')); window.gyxSillOpen(); };
window.gyxSillTake = async () => { D.sill = null; await save(); window.gyxSillOpen(); };
window.gyxSillDel = async id => { D.visits = D.visits.filter(x => x.id !== id); await save(); window.gyxSillOpen(); };
window.gyxSillData = () => D; window.gyxSillVisit = visit;
window.gyxSillNow = () => { const it = D.sill && ITEMS.find(i => i[1] === D.sill.k); return it ? { e: it[0], n: it[1] } : null; };
window.gyxSillOpen = function () {
    if (D.sill && Date.now() >= D.sill.due) { visit().then(() => window.gyxSillOpen()); }
    D.visits.forEach(v => { v.read = true; }); save();
    const it = D.sill && ITEMS.find(i => i[1] === D.sill.k);
    X.panel('gyxSillOv', '🪟 窗台来客', `<div class="sl-win">${it ? `<div class="sl-it">${it[0]}</div><div class="gyx-tip">窗台上放着${it[1]}，${X.v('等着谁来', '还没人动过', '静悄悄的')}……<span style="cursor:pointer;color:#aaa" onclick="gyxSillTake()">收回来</span></div>` : `<div class="gyx-tip">窗台上空着。放点什么？</div><div class="gyx-row">${ITEMS.map(i => `<span class="gyx-chip" onclick="gyxSillPut('${i[1]}')">${i[0]} ${i[1]}</span>`).join('')}</div>`}</div>
      ${window.gyxHomeOpen ? `<div class="gyx-row"><button class="gyx-btn lite" onclick="document.getElementById('gyxSillOv')?.remove();gyxHomeOpen()">🏠 回小屋</button><span class="gyx-tip">这就是小屋的那扇窗。客人留下的东西会摆在小屋的窗台上。</span></div>` : ''}<div class="gyx-tip">你不在的时候（大概一到四个小时）会有客人来：小动物、世界里的人，有时候是角色偷偷来过。放什么会影响谁来（小鱼干招猫、面包屑招鸟……）。</div>
      <h4 class="sl-h">来过的客人</h4>${D.visits.slice(0, 30).map(v => `<div class="sl-r"><b>${v.ico} ${X.esc(v.who)}</b>${v.item ? `<small>吃了${X.esc(v.item)}</small>` : ''}<div>留下了 <b>${X.esc(v.gift)}</b></div><span>${X.esc(v.note)}</span><small>${new Date(v.at).toLocaleString()}</small><i onclick="gyxSillDel('${v.id}')">删</i></div>`).join('') || '<div class="gyx-tip">还没有客人来过。</div>'}
      ${Object.keys(D.seen).length ? `<h4 class="sl-h">图鉴（${Object.keys(D.seen).length}）</h4><div class="gyx-row">${Object.keys(D.seen).map(k => `<span class="gyx-chip">${X.esc(k)} ×${D.seen[k]}</span>`).join('')}</div>` : ''}`);
};
X.ctx(id => { const v = D.visits.find(x => x.cid === String(id) && Date.now() - x.at < 3 * 864e5); return v ? `【你去过她的窗台】你偷偷去过她的窗台${v.item ? `，拿走了她放的${v.item}` : ''}，留下了${v.gift}${v.note ? `和一句话：「${v.note}」` : ''}。她可能已经发现了，被问起来可以承认也可以装傻。` : ''; }, 'gyxSill');
X.inj('gyxSill', [['你去过她的窗台', 'TA 偷偷去过你的窗台', '三天之内 TA 记得自己去过、留下了什么。']]);
X.action({ key: 'gyx_sill_visit', label: '偷偷去她的窗台，留下一样小东西和一句话', hint: '窗台来客', need: c => !D.visits.some(v => v.cid === String(c.id) && Date.now() - v.at < 3 * 864e5), run: async c => (await visit(true, { kind: 'char', who: X.name(c), ico: '💌', cid: String(c.id) })) ? '偷偷去你窗台留了东西' : null }, 'gyxSill');
X.today(() => { const L = D.visits.filter(v => X.day(new Date(v.at)) === X.day()); const rows = L.map(v => ({ t: v.ico + ' ' + v.who, x: '留下了' + X.esc(v.gift), go: 'gyxSillOpen()' })); if (D.sill) rows.push({ t: '窗台上', x: '放着' + X.esc(D.sill.k), go: 'gyxSillOpen()' }); return { title: '🪟 窗台', rows }; }, 'gyxSill');
X.widget('gyxSillW', { n: '窗台来客', sizes: ['s', 'm'], tap: () => window.gyxSillOpen(), r: w => { const n = D.visits.filter(v => !v.read).length, v = D.visits[0]; return X.gw(w, '🪟', '窗台', n ? [`有 ${n} 位客人来过`, v ? X.esc(v.who) : ''] : [D.sill ? '放着' + X.esc(D.sill.k) : '空着', v ? '上次：' + X.esc(v.who) : '']); } }, 'gyxSill');
X.mem({ k: 'gyxSill', ico: '🪟', n: '窗台来过的客人', d: '谁来过、留下了什么（角色来过的那几次，TA 自己记得）', items: c => D.visits.filter(v => !v.cid || v.cid === String(c.id)), text: x => `${x.who} 留下了 ${x.gift}${x.note ? '：' + x.note : ''}`, meta: x => new Date(x.at).toLocaleString(), edit: (x, v) => { const m = String(v).match(/：(.*)$/); if (m) x.note = m[1]; }, del: (c, i) => { const L = D.visits.filter(v => !v.cid || v.cid === String(c.id)); const x = L[i]; if (x) D.visits.splice(D.visits.indexOf(x), 1); }, save }, 'gyxSill');
X.css('gyxSillCss', `.sl-win{background:linear-gradient(#dfeefa,#f6fbff);border-radius:18px;padding:14px;margin:6px 0;border:6px solid #e9dcc8}.sl-it{font-size:44px;text-align:center}.sl-h{font-size:14px;margin:14px 0 4px}.sl-r{position:relative;padding:9px 26px 9px 0;border-bottom:1px solid #f2f2f4;font-size:13.5px}.sl-r>small{color:#aaa;margin-left:6px}.sl-r span{display:block;color:#666;margin-top:2px}.sl-r i{position:absolute;right:0;top:10px;font-style:normal;font-size:11px;color:#aaa;cursor:pointer}`);
X.mini({ id: 'gyxSill', icon: '🪟', title: '窗台来客', desc: '放点东西在窗台，你不在时会有客人来', cat: '生活', onOpen: () => window.gyxSillOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.visits = D.visits || []; D.seen = D.seen || {}; })();
