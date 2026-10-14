/* 🌱 TA被你影响：你常聊的东西，会慢慢变成 TA 的新爱好——你提了几次猫，过一阵 TA 开始关注猫博主、主动转给你。每个"因为你才开始喜欢的"都有来历和程度，能改能删 */
if (window.__gyxInfl) return; window.__gyxInfl = 1;
X.feat('gyxInfl', { n: '🌱 TA被你影响', desc: '你常聊的东西慢慢变成 TA 的新爱好，有来历、有程度' });
const S = X.store('infl');
let D = { list: [], last: {} };   // list: {id, cid, what, from, at, lv(1-3), seen:[{t,at}]}  last: {cid: 上次看的时间}
const DAY = 864e5, LV = ['', '有点好奇', '开始喜欢', '已经是 TA 自己的爱好了'];
const save = () => S.set('d', D);
const mine = cid => D.list.filter(x => x.cid === String(cid));
const myLines = (c, since) => ((typeof globalChats !== 'undefined' && globalChats[c.id]) || []).filter(m => m.sender === 'me' && m.timestamp > since).map(m => X.plain(m.text)).filter(t => t.length > 3).slice(-80);
async function scan(c, force) {
    if (!c) return null; const since = force ? 0 : (D.last[c.id] || Date.now() - 14 * DAY), L = myLines(c, since);
    if (L.length < (force ? 3 : 15)) return null;
    D.last[c.id] = Date.now(); await save();
    const have = mine(c.id);
    const o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n下面是她最近跟你说的话：\n${L.join('\n').slice(-3000)}\n\n你已经因为她开始喜欢的东西：${have.map(x => x.what + '（' + LV[x.lv] + '）').join('、') || '还没有'}。\n看看她反复提到、明显喜欢的东西里，有没有哪样会让你（按你的性格）也慢慢感兴趣。注意：要是你本来就喜欢的不算；你性格上绝不会碰的也不算。\n只输出 JSON：{"new":{"what":"新的兴趣，10字内","from":"是她怎么让你注意到的，30字内"} 或 null,"grow":["已有的里面，她这阵子又提了、你更喜欢了的，原样写名字"]}`));
    if (!o) return null;
    let r = null;
    (o.grow || []).forEach(n => { const x = have.find(h => h.what === n); if (x && x.lv < 3) { x.lv++; x.up = Date.now(); r = r || x; } });
    if (o.new && o.new.what && !have.some(h => h.what === o.new.what)) { r = { id: 'if' + Date.now().toString(36), cid: String(c.id), what: X.plain(o.new.what).slice(0, 20), from: X.plain(o.new.from || '').slice(0, 60), at: Date.now(), lv: 1, seen: [] }; D.list.unshift(r); }
    await save(); return r;
}
async function share(c) {
    const x = mine(c && c.id).filter(x => x.lv >= 1).sort((a, b) => ((a.seen.slice(-1)[0] || {}).at || 0) - ((b.seen.slice(-1)[0] || {}).at || 0))[0]; if (!x) return null;
    const ok = await X.reach(c, `你最近因为她开始对「${x.what}」${LV[x.lv]}（${x.from}）。你自己去看了 / 试了 / 刷到了一点相关的东西，想转给她或者跟她说说——像真的有了新爱好的人那样，别说"因为你我才喜欢"这种话，除非很自然`);
    if (ok) { const H = globalChats[c.id] || [], m = H[H.length - 1]; x.seen.push({ t: m && m.sender !== 'me' ? X.plain(m.text).slice(0, 80) : '分享了一点', at: Date.now() }); await save(); }
    return ok ? x : null;
}
window.gyxInflScan = async (cid, btn) => { const c = X.char(cid); if (!c) return; if (btn) { btn.disabled = true; btn.textContent = 'TA 在回想你说过的话…'; } const r = await scan(c, true); X.toast(r ? '🌱 ' + X.v('TA 好像被你带偏了', '有东西在 TA 心里发芽了', 'TA 开始在意一样新东西') : '🌱 ' + X.v('暂时还没被你影响到', '再多聊聊吧', 'TA 还没开窍'), r ? r.what : ''); window.gyxInflOpen(cid); };
window.gyxInflShare = async cid => { const r = await share(X.char(cid)); X.toast(r ? '🌱 TA 来找你聊「' + r.what + '」了' : '还没有可以聊的'); };
window.gyxInflDel = async id => { D.list = D.list.filter(x => x.id !== id); await save(); window.gyxInflOpen(); };
window.gyxInflAdd = async cid => { const el = document.getElementById('gyxIfIn'); if (!el || !el.value.trim()) return; D.list.unshift({ id: 'if' + Date.now().toString(36), cid: String(cid), what: el.value.trim().slice(0, 20), from: '你直接告诉 TA 的', at: Date.now(), lv: 1, seen: [] }); await save(); window.gyxInflOpen(cid); };
window.gyxInflData = () => D;
window.gyxInflOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), L = mine(cid);
    X.panel('gyxInflOv', '🌱 因为你，' + X.esc(X.name(c)) + ' 开始喜欢的', `<div class="gyx-row">${X.whoSel(cid, 'gyxInflOpen')}<button class="gyx-btn lite" onclick="gyxInflScan('${cid}',this)">看看 TA 有没有被你影响</button></div>
      <div class="gyx-tip">${X.v('你常说的东西，TA 会慢慢上心。', '人会被喜欢的人改变。', '你随口说的，TA 都记着，还偷偷去了解了。')}每隔几天 TA 自己会回想一遍；被你影响到的东西，TA 会主动转给你、跟你聊。</div>
      ${L.map(x => `<div class="gyx-card if-c"><div class="if-h"><b>${X.esc(x.what)}</b><span class="if-lv">${'🌱🌿🌳'.slice(0, x.lv * 2)}</span><em>${LV[x.lv]}</em></div><div class="gyx-tip">${X.esc(x.from)} · 从 ${new Date(x.at).toLocaleDateString()} 开始</div>${x.seen.slice(-2).map(s => `<div class="if-s">💬 ${X.esc(s.t)}</div>`).join('')}<div class="gyx-tip" style="text-align:right"><span style="cursor:pointer" onclick="gyxInflDel('${x.id}')">删</span></div></div>`).join('') || `<div class="gyx-tip">${X.v('还没有。多跟 TA 聊聊你喜欢的东西吧。', 'TA 还是原来的 TA。')}</div>`}
      <div class="gyx-row"><input id="gyxIfIn" class="gyx-in" style="flex:1" placeholder="直接告诉 TA：我想让你也喜欢……"><button class="gyx-btn lite" onclick="gyxInflAdd('${cid}')">种下</button>${L.length ? `<button class="gyx-btn lite" onclick="gyxInflShare('${cid}')">让 TA 聊聊</button>` : ''}</div>`);
};
X.ctx(id => { const L = mine(id); if (!L.length) return ''; return `【因为她，你开始喜欢的东西】${L.map(x => `${x.what}（${LV[x.lv]}；${x.from}）`).join('；')}。这些已经是你生活的一部分了，聊天时可以自然地提到你最近在看/在试的相关东西。`; }, 'gyxInfl');
X.action({ key: 'gyx_infl_scan', label: '回想她最近常说的东西，看自己有没有被影响', hint: 'TA被你影响', need: c => Date.now() - (D.last[c.id] || 0) > 3 * DAY && myLines(c, D.last[c.id] || Date.now() - 14 * DAY).length >= 15,
    run: async c => { const r = await scan(c); return r ? '开始对「' + r.what + '」感兴趣' : null; } }, 'gyxInfl');
X.action({ key: 'gyx_infl_share', label: '跟她聊聊因为她才开始喜欢的东西（转个链接、说说新发现）', hint: 'TA被你影响', need: c => mine(c.id).some(x => !x.seen.length || Date.now() - x.seen[x.seen.length - 1].at > 2 * DAY),
    run: async c => { const r = await share(c); return r ? '跟你聊「' + r.what + '」' : null; } }, 'gyxInfl');
X.today(() => ({ title: '🌱 被你影响', rows: D.list.filter(x => X.day(new Date(x.up || x.at)) === X.day() && X.char(x.cid)).map(x => ({ t: X.name(X.char(x.cid)), x: `对「${X.esc(x.what)}」${LV[x.lv]}`, go: `gyxInflOpen('${x.cid}')` })) }), 'gyxInfl');
X.widget('gyxInflW', { n: '被你影响', sizes: ['s', 'm'], tap: () => window.gyxInflOpen(), r: w => { const x = D.list[0]; return X.gw(w, '🌱', '因为你', x ? [X.esc(x.what), LV[x.lv]] : ['还没有']); } }, 'gyxInfl');
X.memArr({ k: 'gyxInfl', ico: '🌱', n: '因为你才开始喜欢的', d: 'TA 被你影响出来的新爱好（改名字 TA 就按改的记）', arr: () => D.list, field: 'what', text: x => x.what, meta: x => LV[x.lv] + ' · ' + (x.from || ''), save }, 'gyxInfl');
X.css('gyxInflCss', `.if-h{display:flex;align-items:center;gap:8px}.if-h b{font-size:16px}.if-h em{font-style:normal;font-size:12px;color:#5ac8a8;margin-left:auto}.if-s{font-size:13px;padding:4px 0;color:#555}`);
X.mini({ id: 'gyxInfl', icon: '🌱', title: 'TA被你影响', desc: '因为你，TA 开始喜欢的东西', cat: '陪伴', onOpen: () => window.gyxInflOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.list = D.list || []; D.last = D.last || {}; })();
