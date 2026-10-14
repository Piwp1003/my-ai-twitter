/* 🗝️ 双人密室：你和 TA 被关在两个不同的房间，各自只看得到一半线索，只能靠说话合作——你看到"顺序"和两个数，TA 那边有另外两个数，可 TA 会按自己的性格描述（会漏、会说偏、会逞强）。凑齐四位密码一起出去 */
if (window.__gyxRoom) return; window.__gyxRoom = 1;
X.feat('gyxRoom', { n: '🗝️ 双人密室', desc: '各看一半线索，靠说话合作逃出去' });
const S = X.store('room');
let D = { log: [] };   // {id, cid, at, end, theme, ok, tries, msgs, secs}
let G = null, busy = false;   // {cid, theme, code:[4], order:[obj idx], mine:[{obj,clue,pos}], his:[...], chat:[{who,t}], tries, start}
const THEMES = [{ k: '古董店', ico: '🕰️', mine: '落满灰的古董店里间', his: '古董店的地下仓库' }, { k: '游轮', ico: '🚢', mine: '游轮的船长室', his: '游轮的锅炉房' }, { k: '图书馆', ico: '📚', mine: '闭馆后的图书馆阅览室', his: '图书馆的档案室' }, { k: '医院', ico: '🏥', mine: '废弃医院的护士站', his: '废弃医院的药房' }];
const OBJ = [['钟', d => `墙上的钟停在 ${d} 点整`], ['书', d => `书架上只有 ${d} 本红色封皮的书`], ['画', d => `一幅画里画了 ${d} 只飞鸟`], ['灯', d => `天花板上亮着 ${d} 盏灯，其余都是坏的`], ['杯', d => `桌上摆着 ${d} 个茶杯，杯口朝下`], ['窗', d => `墙上有 ${d} 扇被钉死的窗`]];
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function make(cid) {
    const T = X.pick(THEMES), objs = shuf(OBJ).slice(0, 4), code = objs.map(() => 1 + Math.floor(Math.random() * 9));
    const pos = shuf([0, 1, 2, 3]), mineIdx = pos.slice(0, 2), hisIdx = pos.slice(2);
    return { cid: String(cid), theme: T, code, objs: objs.map(o => o[0]), mine: mineIdx.map(i => ({ i, t: objs[i][1](code[i]) })), his: hisIdx.map(i => ({ i, t: objs[i][1](code[i]) })), chat: [], tries: 0, start: Date.now() };
}
const orderNote = g => `门边的铜牌上刻着：「${g.objs.join(' → ')}」`;
async function taReply(msg) {
    const c = X.char(G.cid), g = G;
    const p = `${X.who(c)}\n你们在玩「双人密室」：你和她被分别关在两个房间，只能隔着墙/对讲机说话。你在「${g.theme.his}」，你这边看得到的东西：\n- ${g.his.map(x => x.t).join('\n- ')}\n（你这边没有密码锁，锁在她那边；你也不知道她那边有什么，除非她告诉你。）\n刚才的对话：\n${g.chat.slice(-10).map(x => (x.who === 'me' ? '她' : '你') + '：' + x.t).join('\n')}\n她说：「${msg}」\n按你的性格回她：可以描述你看到的（别一口气全说完，她问什么答什么；你可以紧张、逞强、开玩笑、说得不够准确，但**数字不能说错**）。也可以问她那边的情况。像隔着墙说话那样，40 字以内。只输出你说的话。`;
    let t = X.plain(await X.ask(p) || '');
    if (!t) { const x = X.pick(g.his); t = /多少|几|什么|看到|有/.test(msg) ? X.v(`我这边……${x.t}。`, `等等我看看——${x.t}，就这些了。`) : X.v('你那边怎么样？我这边黑漆漆的。', '别怕，我在呢。你看到什么了？'); }
    return t;
}
window.gyxRoomStart = cid => { const c = X.char(cid) || X.cur(); if (!c) return; G = make(c.id); G.chat.push({ who: 'ta', t: X.v('喂？能听见吗？我被关在另一个房间了。', '你没事吧？我这边门也打不开。', '别慌。我们一起想办法出去。') }); paint(); };
window.gyxRoomSay = async () => {
    if (!G || busy) return; const el = document.getElementById('gyxRmIn'), t = el && el.value.trim(); if (!t) return; el.value = '';
    G.chat.push({ who: 'me', t }); busy = true; paint();
    try { G.chat.push({ who: 'ta', t: await taReply(t) }); } finally { busy = false; } paint();
};
window.gyxRoomTry = async () => {
    if (!G) return; const v = (G.dial || [0, 0, 0, 0]).slice(); G.tries++;
    if (v.join('') === G.code.join('')) {
        const c = X.char(G.cid), e = { id: 'rm' + Date.now().toString(36), cid: G.cid, at: G.start, end: Date.now(), theme: G.theme.k, ok: true, tries: G.tries, msgs: G.chat.filter(x => x.who === 'me').length };
        e.line = X.plain(await X.ask(`${X.who(c)}\n你们刚刚一起逃出了「${G.theme.k}」密室（她试了 ${G.tries} 次密码、跟你说了 ${e.msgs} 句话）。门开了，你们终于见到面。说一句，25 字以内。`) || '') || X.v('出来了！……让我抱一下。', '我就知道我们能出来。', '下次别让我隔着墙听你害怕了。');
        D.log.unshift(e); D.log = D.log.slice(0, 100); await S.set('d', D); G = null; X.say(c, '🗝️ ' + e.line); window.gyxRoomOpen(c.id, e); return;
    }
    G.chat.push({ who: 'sys', t: `🔒 ${v.join('')} —— 不对。${G.tries >= 3 ? '（提示：铜牌上的顺序，就是密码的顺序）' : ''}` }); paint();
};
window.gyxRoomQuit = async () => { if (!G) return; D.log.unshift({ id: 'rm' + Date.now().toString(36), cid: G.cid, at: G.start, end: Date.now(), theme: G.theme.k, ok: false, tries: G.tries, msgs: G.chat.filter(x => x.who === 'me').length, line: '（放弃了，答案是 ' + G.code.join('') + '）' }); await S.set('d', D); const cid = G.cid; G = null; window.gyxRoomOpen(cid); };
window.gyxRoomDial = (i, v) => { if (G) { G.dial = G.dial || [0, 0, 0, 0]; G.dial[i] = Math.max(0, Math.min(9, +v || 0)); } };
window.gyxRoomLive = () => G; window.gyxRoomData = () => D;
function paint() {
    if (!G) return; const c = X.char(G.cid);
    X.panel('gyxRoomOv', G.theme.ico + ' 双人密室 · ' + X.esc(G.theme.k), `<div class="gyx-card rm-me"><b>你在${X.esc(G.theme.mine)}</b><div>📜 ${X.esc(orderNote(G))}</div>${G.mine.map(x => `<div>👁️ ${X.esc(x.t)}</div>`).join('')}<div class="gyx-tip">门上是一把四位数密码锁。另外两样东西在 ${X.esc(X.name(c))} 那边。</div></div>
      <div class="rm-chat" id="gyxRmChat">${G.chat.map(x => `<div class="rm-m ${x.who}">${x.who === 'ta' ? '<b>' + X.esc(X.name(c)) + '</b>' : ''}${X.esc(x.t)}</div>`).join('')}${busy ? '<div class="rm-m ta">…</div>' : ''}</div>
      <div class="gyx-row"><input id="gyxRmIn" class="gyx-in" style="flex:1" placeholder="隔着墙跟 TA 说话" onkeydown="if(event.key==='Enter'&&!event.isComposing)gyxRoomSay()"><button class="gyx-btn" onclick="gyxRoomSay()">说</button></div>
      <div class="rm-dial">${[0, 1, 2, 3].map(i => `<input type="number" min="0" max="9" value="${(G.dial || [])[i] || 0}" oninput="gyxRoomDial(${i},this.value)">`).join('')}<button class="gyx-btn" onclick="gyxRoomTry()">开锁</button></div>
      <div class="gyx-tip" style="text-align:right"><span style="cursor:pointer" onclick="gyxRoomQuit()">放弃</span></div>`);
    const ch = document.getElementById('gyxRmChat'); if (ch) ch.scrollTop = ch.scrollHeight;
}
window.gyxRoomOpen = function (who, win) {
    const c = X.char(who) || X.cur(); if (!c) return; if (G && G.cid === String(c.id)) return paint(); const cid = String(c.id), H = D.log.filter(x => x.cid === cid);
    X.panel('gyxRoomOv', '🗝️ 双人密室', `${win ? `<div class="gyx-card"><b>🚪 逃出来了！</b><div>${X.esc(win.line)}</div><div class="gyx-tip">${Math.max(1, Math.round((win.end - win.at) / 60000))} 分钟 · 试了 ${win.tries} 次</div></div>` : ''}
      <div class="gyx-row">${X.whoSel(cid, 'gyxRoomOpen')}<button class="gyx-btn" onclick="gyxRoomStart('${cid}')">被关起来</button></div>
      <div class="gyx-tip">${X.v('你们被关在两个房间，各看一半线索。', '只能靠说话。TA 说的话，可不一定准。', '问清楚 TA 那边有什么。')}TA 不会说错数字，但可能漏说、说得含糊。</div>
      ${H.slice(0, 10).map(x => `<div class="sk-h"><b>${x.ok ? '🚪' : '🔒'}</b><span>${X.esc(x.theme)} · ${new Date(x.at).toLocaleString()} · ${Math.max(1, Math.round((x.end - x.at) / 60000))} 分钟<br>${X.esc(x.line || '')}</span></div>`).join('')}`);
};
X.ctx(id => { const x = D.log.find(l => l.cid === String(id)); return x && x.ok && Date.now() - x.end < 6 * 36e5 ? `【刚才你们一起逃出了「${x.theme}」密室】` : ''; }, 'gyxRoom');
X.action({ key: 'gyx_room', label: '约她玩双人密室（"要是我们被关在两个房间……"）', hint: '双人密室', need: c => !D.log.some(x => x.cid === String(c.id) && Date.now() - x.at < 4 * 864e5),
    run: async c => (await X.reach(c, '你突然想：要是你们被关在两个不同的房间、只能隔着墙说话，能不能一起逃出去？用你的方式约她玩「🗝️ 双人密室」')) ? '约你玩双人密室' : null }, 'gyxRoom');
X.today(() => ({ title: '🗝️ 双人密室', rows: (G ? [{ t: '进行中', x: X.esc(G.theme.k), go: 'gyxRoomOpen()' }] : []).concat(D.log.filter(x => X.day(new Date(x.at)) === X.day()).map(x => ({ t: x.ok ? '逃出来了' : '放弃了', x: X.esc(x.theme), go: `gyxRoomOpen('${x.cid}')` }))) }), 'gyxRoom');
X.widget('gyxRoomW', { n: '双人密室', sizes: ['s', 'm'], tap: () => window.gyxRoomOpen(), r: w => X.gw(w, '🗝️', '双人密室', G ? ['被关着…', X.esc(G.theme.k)] : [D.log.length ? '逃出 ' + D.log.filter(x => x.ok).length + ' 次' : '一起被关起来？']) }, 'gyxRoom');
X.memArr({ k: 'gyxRoom', ico: '🗝️', n: '双人密室', d: '一起逃出过的密室', arr: () => D.log, field: 'line', text: x => x.line || '', meta: x => x.theme + ' · ' + new Date(x.at).toLocaleString(), save: () => S.set('d', D) }, 'gyxRoom');
X.css('gyxRoomCss', `.rm-me div{font-size:14px;margin:4px 0}.rm-chat{max-height:38vh;overflow:auto;margin:8px 0;display:flex;flex-direction:column;gap:6px}.rm-m{max-width:80%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.6}.rm-m.ta{background:#f2f2f4;align-self:flex-start}.rm-m.ta b{display:block;font-size:11px;color:#8e8e93;font-weight:500}.rm-m.me{background:#1d1d1f;color:#fff;align-self:flex-end}.rm-m.sys{align-self:center;font-size:12.5px;color:#ff3b30;background:none}.rm-dial{display:flex;gap:8px;align-items:center;justify-content:center;margin:10px 0}.rm-dial input{width:46px;height:56px;font-size:26px;text-align:center;border-radius:12px;border:2px solid #1d1d1f;font-family:Menlo,monospace}.sk-h{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f2f2f4;font-size:13px}.sk-h span{color:#8e8e93}`);
X.mini({ id: 'gyxRoom', icon: '🗝️', title: '双人密室', desc: '各看一半线索，靠说话逃出去', cat: '一起做', onOpen: () => window.gyxRoomOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxRoom', name: '双人密室', icon: '🗝️', getStatus: () => null, onResume: () => window.gyxRoomOpen(), onStart: (sid, opp) => window.gyxRoomOpen(String((opp || [])[0] || sid || '')) }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.log = D.log || []; })();
