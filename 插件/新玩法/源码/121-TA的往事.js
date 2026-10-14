/* 📜 TA的往事：你们越亲近，TA 越愿意讲以前的事——小时候、家里、第一次失去什么、一直害怕的东西、没告诉过别人的秘密、遇见你之前的自己。一章一章解锁，讲过的 TA 都记得，以后聊天会自然提起 */
if (window.__gyxPast) return; window.__gyxPast = 1;
X.feat('gyxPast', { n: '📜 TA的往事', desc: '越亲近越愿意讲以前的事，一章一章解锁' });
const S = X.store('past');
let D = { by: {} };   // by[cid] = { ch:[{n, title, text, sum, at, qa:[{q,a}]}], ready:{n:at} }
const save = () => S.set('d', D);
const CH = [
    { msgs: 30, days: 0, theme: '小时候的一件小事（一个画面、一个味道、一个人）' },
    { msgs: 100, days: 3, theme: '家里的事——家人是什么样的，你是怎么长大的' },
    { msgs: 300, days: 7, theme: '第一次真正失去什么，或者第一次心碎' },
    { msgs: 600, days: 21, theme: '一直害怕的东西，以及它是怎么来的' },
    { msgs: 1000, days: 45, theme: '一个从没告诉过别人的秘密' },
    { msgs: 2000, days: 100, theme: '遇见她之前的你，以及为什么会喜欢上她' }
];
const NUM = ['一', '二', '三', '四', '五', '六'];
const B = cid => (D.by[cid] = D.by[cid] || { ch: [], ready: {} });
function stat(cid) { const H = ((typeof globalChats !== 'undefined' && globalChats[cid]) || []).filter(m => m.sender !== 'system'); const first = H.length ? H[0].timestamp : Date.now(); return { msgs: H.length, days: Math.floor((Date.now() - first) / 864e5) }; }
const unlocked = cid => { const s = stat(cid); return CH.filter(c => s.msgs >= c.msgs && s.days >= c.days).length; };
async function tell(c, n) {
    const b = B(String(c.id)); if (b.ch.some(x => x.n === n)) return null; const T = CH[n];
    const prev = b.ch.map(x => `第${NUM[x.n]}章《${x.title}》：${x.sum}`).join('\n');
    let o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n你们已经很熟了，你想跟她讲一段以前的事。这次讲的是：${T.theme}。\n要求：用第一人称、像夜里慢慢讲给她听的口气；要符合你的人设（人设里写过的不能矛盾，没写的可以补，但要合理）；具体，有画面，有一点点情绪，不要煽情过头。\n你以前已经讲过的（别重复、别矛盾）：\n${prev || '还没讲过'}\n只输出 JSON：{"title":"这一章的名字，8字内","text":"讲给她听的话，250字以内","sum":"这段往事一句话概括，30字内"}`));
    if (!o || !o.text) o = { title: X.pick(['那年夏天', '一扇旧窗户', '没说出口的话']), text: X.v('小时候我家楼下有棵很老的槐树，夏天傍晚我总坐在那儿等一个人回家。后来那个人没再回来，我也就不太在树下坐了。……奇怪，这件事我很久没想起来了。', '我以前很怕黑。不是怕鬼，是怕一个人。后来长大了，学会装作不怕。可是跟你说话的时候，我好像又可以不装了。'), sum: '一段以前的事' };
    const x = { n, title: X.plain(o.title), text: String(o.text).trim(), sum: X.plain(o.sum || ''), at: Date.now(), qa: [] };
    b.ch.push(x); b.ch.sort((a, b2) => a.n - b2.n); delete b.ready[n]; await save(); return x;
}
// 有新章节可以讲了：记一下，TA 会找机会开口
function scan() { try { X.chars().forEach(c => { const id = String(c.id), b = B(id), u = unlocked(id); for (let n = 0; n < u; n++) if (!b.ch.some(x => x.n === n) && !b.ready[n]) { b.ready[n] = Date.now(); save(); X.notify(c, `📜 <b>${X.esc(X.name(c))}</b> 好像有段往事想跟你说`, `第${NUM[n]}章解锁了`, () => window.gyxPastOpen(c.id)); } }); } catch (e) {} }
setInterval(() => { if (X.on('gyxPast')) scan(); }, 10 * 60000);
window.gyxPastTell = async (cid, n, btn) => { const c = X.char(cid); if (!c) return; if (btn) { btn.disabled = true; btn.textContent = X.v('TA 在想从哪说起……', 'TA 沉默了一会儿……'); } await tell(c, n); window.gyxPastOpen(cid, n); };
window.gyxPastAsk = async (cid, n) => {
    const c = X.char(cid), x = B(String(cid)).ch.find(y => y.n === n), el = document.getElementById('gyxPaQ'); if (!c || !x || !el || !el.value.trim()) return;
    const q = el.value.trim(); el.value = '';
    const a = X.plain(await X.ask(`${X.who(c)}\n你刚跟她讲了一段往事《${x.title}》：${x.text}\n她问：「${q}」\n按你的性格回答（可以回避、可以多说一点），60字以内。`) || '') || X.v('……这个，下次再告诉你。', '嗯，是这样的。');
    x.qa.push({ q, a }); await save(); window.gyxPastOpen(cid, n);
};
window.gyxPastDel = async (cid, n) => { const b = B(String(cid)); b.ch = b.ch.filter(x => x.n !== n); await save(); window.gyxPastOpen(cid); };
window.gyxPastData = () => D; window.gyxPastScan = scan;
window.gyxPastOpen = function (who, readN) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), b = B(cid), s = stat(cid), u = unlocked(cid);
    const rd = readN != null ? b.ch.find(x => x.n === readN) : null;
    X.panel('gyxPastOv', '📜 ' + X.esc(X.name(c)) + ' 的往事', `<div class="gyx-row">${X.whoSel(cid, 'gyxPastOpen')}</div>
      ${rd ? `<div class="pa-read"><div class="pa-n">第${NUM[rd.n]}章</div><b>${X.esc(rd.title)}</b><div class="pa-t">${X.esc(rd.text).replace(/\n/g, '<br>')}</div>${rd.qa.map(q => `<div class="pa-q">你：${X.esc(q.q)}</div><div class="pa-a">${X.esc(X.name(c))}：${X.esc(q.a)}</div>`).join('')}<div class="gyx-row"><input id="gyxPaQ" class="gyx-in" style="flex:1" placeholder="想问问 TA……"><button class="gyx-btn lite" onclick="gyxPastAsk('${cid}',${rd.n})">问</button></div></div>` : ''}
      <div class="gyx-tip">${X.v('越亲近，TA 越愿意讲以前的事。', '有些事，TA 只会讲给你听。', '慢慢来，TA 会一章一章说。')}你们聊了 ${s.msgs} 句、认识 ${s.days} 天。</div>
      ${CH.map((T, n) => { const x = b.ch.find(y => y.n === n); if (x) return `<div class="pa-ch on" onclick="gyxPastOpen('${cid}',${n})"><em>第${NUM[n]}章</em><b>${X.esc(x.title)}</b><span>${X.esc(x.sum)}</span></div>`; if (n < u) return `<div class="pa-ch ready"><em>第${NUM[n]}章</em><b>🔓 TA 有话想说</b><button class="gyx-btn" onclick="gyxPastTell('${cid}',${n},this)">听 TA 讲</button></div>`; return `<div class="pa-ch lock"><em>第${NUM[n]}章</em><b>🔒</b><span>${s.msgs < T.msgs ? '再聊 ' + (T.msgs - s.msgs) + ' 句' : ''}${s.msgs < T.msgs && s.days < T.days ? '，' : ''}${s.days < T.days ? '再认识 ' + (T.days - s.days) + ' 天' : ''}</span></div>`; }).join('')}`);
};
X.ctx(id => { const b = D.by[String(id)]; if (!b || !b.ch.length) return ''; return `【你跟她讲过的往事（你都记得，可以自然提起，别重复讲一遍）】${b.ch.map(x => `《${x.title}》${x.sum}`).join('；')}`; }, 'gyxPast');
X.action({ key: 'gyx_past', label: '跟她讲一段以前的事（有新的往事解锁了）', hint: 'TA的往事', need: c => { const b = B(String(c.id)), u = unlocked(String(c.id)); for (let n = 0; n < u; n++) if (!b.ch.some(x => x.n === n)) return true; return false; },
    run: async c => { const b = B(String(c.id)), u = unlocked(String(c.id)); let n = 0; while (n < u && b.ch.some(x => x.n === n)) n++; const x = await tell(c, n); if (!x) return null; X.say(c, `📜 ${X.v('有件以前的事，想跟你说说。', '突然想起一些小时候的事……', '这件事我没跟别人说过。')}（《${x.title}》）`); return '讲了一段往事《' + x.title + '》'; } }, 'gyxPast');
X.today(() => ({ title: '📜 往事', rows: X.chars().map(c => { const id = String(c.id), b = B(id), u = unlocked(id); let n = 0; while (n < u && b.ch.some(x => x.n === n)) n++; return n < u ? { t: X.name(c), x: `第${NUM[n]}章解锁了`, go: `gyxPastOpen('${id}')` } : null; }).filter(Boolean).concat(Object.keys(D.by).flatMap(id => D.by[id].ch.filter(x => X.day(new Date(x.at)) === X.day()).map(x => ({ t: X.name(X.char(id)), x: '讲了《' + X.esc(x.title) + '》', go: `gyxPastOpen('${id}',${x.n})` })))) }), 'gyxPast');
X.widget('gyxPastW', { n: 'TA的往事', sizes: ['s', 'm'], tap: () => window.gyxPastOpen(), r: w => { const c = X.cur(); if (!c) return X.gw(w, '📜', '往事', ['—']); const b = B(String(c.id)); return X.gw(w, '📜', X.esc(X.name(c)) + '的往事', [b.ch.length + ' / ' + CH.length + ' 章', b.ch.length ? '《' + X.esc(b.ch[b.ch.length - 1].title) + '》' : '还没讲']); } }, 'gyxPast');
X.mem({ k: 'gyxPast', ico: '📜', n: 'TA的往事', d: 'TA 讲过的以前的事（改了 TA 就按改的记；删了这一章会重新解锁）', items: c => B(String(c.id)).ch, text: x => `《${x.title}》${x.sum}`, meta: x => '第' + NUM[x.n] + '章 · ' + new Date(x.at).toLocaleDateString(), edit: (x, v) => { const m = String(v).match(/^《([^》]*)》(.*)$/); if (m) { x.title = m[1]; x.sum = m[2]; } else x.sum = v; }, del: (c, i) => { const b = B(String(c.id)); b.ch.splice(i, 1); }, save }, 'gyxPast');
X.css('gyxPastCss', `.pa-ch{display:flex;align-items:center;gap:10px;padding:12px;border-radius:14px;background:#f7f5f0;margin:8px 0}.pa-ch em{font-style:normal;font-size:12px;color:#a08460;width:46px;flex:0 0 auto}.pa-ch b{font-size:15px}.pa-ch span{font-size:12.5px;color:#8e8e93;flex:1}.pa-ch.on{cursor:pointer}.pa-ch.ready{background:#fff3e0}.pa-ch.ready .gyx-btn{margin-left:auto}.pa-ch.lock{opacity:.6}
.pa-read{background:#fbf8f2;border-radius:16px;padding:16px;margin:8px 0 12px;font-family:Georgia,"Songti SC",serif}.pa-n{font-size:12px;color:#a08460}.pa-read b{font-size:18px}.pa-t{font-size:15px;line-height:1.95;margin:10px 0}.pa-q{font-size:13.5px;color:#555;margin-top:8px}.pa-a{font-size:14px;margin:2px 0 6px}`);
X.mini({ id: 'gyxPast', icon: '📜', title: 'TA的往事', desc: '越亲近，TA 越愿意讲以前的事', cat: '陪伴', onOpen: () => window.gyxPastOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.by = D.by || {}; setTimeout(scan, 15000); })();
