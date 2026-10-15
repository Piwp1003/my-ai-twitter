/* 📍 现实捉迷藏：TA「藏」在你附近两三百米的某个点，你拿着手机去找——TA 只告诉你冷了还是热了，还会嘲讽你；找到了，解锁 TA 藏在那儿的一句话。没有定位（电脑上）就玩屋里版：TA 躲在九个房间里的一个 */
if (window.__gyxSeek) return; window.__gyxSeek = 1;
X.feat('gyxSeek', { n: '📍 现实捉迷藏', desc: 'TA 藏在你附近，冷了热了提示你去找' });
const S = X.store('seek');
let D = { log: [], cfg: { min: 150, max: 350 } };   // log: {id, cid, at, end, found, mode, dist(起始距离), walked, note, line}
let G = null, WID = null;   // {cid, mode:'geo'|'room', tgt, start, prev, best, me, trail, hint, room:{t,seen}}
const ROOMS = ['🛋️ 客厅', '🍳 厨房', '🛏️ 卧室', '🛁 浴室', '📚 书房', '🧺 阳台', '🚪 玄关', '👗 衣帽间', '🎹 琴房'];
const hv = (a, b) => { const R = 6371000, r = x => x * Math.PI / 180, dl = r(b[0] - a[0]), dn = r(b[1] - a[1]); const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const off = (p, m, deg) => { const R = 6371000, b = deg * Math.PI / 180, la = p[0] * Math.PI / 180, lo = p[1] * Math.PI / 180, d = m / R; const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b)); const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2)); return [la2 * 180 / Math.PI, lo2 * 180 / Math.PI]; };
const temp = d => d < 25 ? ['🔥', '烫！就在这儿', 100] : d < 60 ? ['♨️', '好热', 85] : d < 120 ? ['🌡️', '有点热', 65] : d < 220 ? ['🌤️', '温的', 45] : d < 350 ? ['🥶', '冷', 25] : ['🧊', '冰天雪地', 8];
const TAUNT = { hot: ['近了近了！', '我都听见你脚步声了。', '再往这边一点……', '哎呀要被发现了。'], cold: ['越走越远了哦～', '方向反了笨蛋。', '我在这边等得都困了。', '你是不是在故意绕路？'], same: ['你在原地转圈吗？', '动一动嘛。', '我又不会跑。'] };
function say(t) { if (!G) return; G.hint = t; G.lastTalk = Date.now(); paint(); }
async function found() {
    if (!G) return; const g = G, c = X.char(g.cid); G = null; try { if (WID != null) navigator.geolocation.clearWatch(WID); } catch (e) {} WID = null;
    const line = X.plain(await X.ask(`${X.who(c)}\n你们在玩捉迷藏，你「藏」在${g.mode === 'geo' ? '她附近的某个地方' : '家里的' + ROOMS[g.room.t]}，她找了 ${Math.max(1, Math.round((Date.now() - g.start) / 60000))} 分钟终于找到你了。你提前在藏身的地方给她留了一句话，现在她看到了。只输出那句话，30 字以内。`) || '') || X.v('被你找到了。奖励：抱一下。', '我就知道你会找到我的。', '下次换我找你，你可别藏太远。');
    const e = { id: 'sk' + Date.now().toString(36), cid: g.cid, at: g.start, end: Date.now(), found: true, mode: g.mode, dist: Math.round(g.d0 || 0), walked: Math.round(g.walked || 0), line };
    D.log.unshift(e); D.log = D.log.slice(0, 100); await S.set('d', D);
    X.say(c, '📍 ' + line); X.notify(c, `<b>${X.esc(X.name(c))}</b> 被你找到了 📍`, line, X.go('gyxSeekOpen', c.id));
    window.gyxSeekOpen(e.cid, e);
}
function onPos(p) {
    if (!G || G.mode !== 'geo') return; const q = [p.coords.latitude, p.coords.longitude], acc = p.coords.accuracy || 50;
    if (!G.tgt) { G.tgt = off(q, X.rnd(+D.cfg.min || 150, +D.cfg.max || 350), Math.random() * 360); G.d0 = hv(q, G.tgt); G.prev = G.d0; G.best = G.d0; }
    if (G.me) G.walked = (G.walked || 0) + Math.min(50, hv(G.me, q)); G.me = q; const d = hv(q, G.tgt); G.d = d; G.acc = acc;
    if (d < Math.max(25, Math.min(acc, 45))) return found();
    const diff = d - G.prev; if (Math.abs(diff) > 15) { G.prev = d; G.best = Math.min(G.best, d); say(X.pick(diff < 0 ? TAUNT.hot : TAUNT.cold)); } else if (Date.now() - (G.lastTalk || 0) > 90000) say(X.pick(TAUNT.same)); else paint();
}
window.gyxSeekStart = (cid, mode) => {
    const c = X.char(cid) || X.cur(); if (!c || G) return;
    const geo = mode !== 'room' && navigator.geolocation;
    G = { cid: String(c.id), mode: geo ? 'geo' : 'room', start: Date.now(), walked: 0 };
    if (geo) { G.hint = X.v('我藏好了，来找我呀～', '数到十了吗？我藏好啦。', '猜猜我在哪个方向？'); try { WID = navigator.geolocation.watchPosition(onPos, e => { if (G) { G.err = (e && e.message) || '拿不到定位'; paint(); } }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }); } catch (e) { G.err = '拿不到定位'; } }
    else { G.room = { t: Math.floor(Math.random() * 9), seen: [] }; G.hint = X.v('我躲在家里某个房间了，猜猜看？', '藏好了！提示：不在客厅……也可能在。'); }
    window.gyxSeekOpen(c.id);
};
window.gyxSeekRoom = i => {
    if (!G || G.mode !== 'room' || G.room.seen.includes(i)) return; G.room.seen.push(i);
    if (i === G.room.t) return found();
    const r = a => [Math.floor(a / 3), a % 3], [a, b] = r(i), [x, y] = r(G.room.t), d = Math.abs(a - x) + Math.abs(b - y);
    say(d === 1 ? X.v('很近了！就在隔壁。', '热热热！', '你差点踩到我了。') : d === 2 ? X.v('有点热了。', '方向对了一半。') : X.v('冷冰冰～', '离我好远哦。', '我在家里的另一头。'));
};
window.gyxSeekQuit = async () => { if (!G) return; const g = G; G = null; try { if (WID != null) navigator.geolocation.clearWatch(WID); } catch (e) {} WID = null; D.log.unshift({ id: 'sk' + Date.now().toString(36), cid: g.cid, at: g.start, end: Date.now(), found: false, mode: g.mode, dist: Math.round(g.d0 || 0), walked: Math.round(g.walked || 0), line: X.v('不找啦？那我自己出来咯。', '哈哈哈我赢了。', '认输就要亲一下。') }); await S.set('d', D); window.gyxSeekOpen(g.cid); };
window.gyxSeekCheat = () => { if (G && G.mode === 'geo' && G.tgt) { G.me = G.tgt.slice(); found(); } };   // 测试用
window.gyxSeekLive = () => G; window.gyxSeekData = () => D;
window.gyxSeekCfg = (k, v) => { D.cfg[k] = v; S.set('d', D); };
function paint() {
    const b = document.getElementById('gyxSkLive'); if (!b || !G) return;
    if (G.mode === 'room') { b.innerHTML = `<div class="sk-say">💬 ${X.esc(G.hint || '')}</div><div class="sk-rooms">${ROOMS.map((r, i) => `<span class="${G.room.seen.includes(i) ? 'seen' : ''}" onclick="gyxSeekRoom(${i})">${r}</span>`).join('')}</div>`; return; }
    const t = G.d != null ? temp(G.d) : ['📡', '找信号中…', 0];
    b.innerHTML = `<div class="sk-temp"><b>${t[0]}</b><span>${t[1]}</span></div><div class="sk-bar"><i style="width:${100 - t[2]}%"></i></div><div class="sk-say">💬 ${X.esc(G.hint || '')}</div><div class="gyx-tip">${G.err ? '📍 ' + X.esc(G.err) + '——可以换屋里版玩' : `走了 ${Math.round(G.walked || 0)} 米 · ${Math.max(0, Math.round((Date.now() - G.start) / 60000))} 分钟${G.acc > 40 ? ' · 定位有点飘（±' + Math.round(G.acc) + ' 米）' : ''}`}</div>`;
}
setInterval(() => { if (G) paint(); }, 15000);
window.gyxSeekOpen = function (who, justFound) {
    const c = (G && X.char(G.cid)) || X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), H = D.log.filter(x => x.cid === cid);
    X.panel('gyxSeekOv', '📍 和 ' + X.esc(X.name(c)) + ' 捉迷藏', G ? `<div id="gyxSkLive"></div><div class="gyx-row" style="justify-content:center"><button class="gyx-btn lite" onclick="gyxSeekQuit()">不找了</button></div><div class="gyx-tip">⚠️ 走路看路，别进不能去的地方。点可能落在楼里或水边，到了附近找不到就算赢——换一局。</div>`
      : `${justFound ? `<div class="gyx-card sk-win"><b>🎉 找到了！</b><div>${X.esc(justFound.line)}</div><div class="gyx-tip">${justFound.mode === 'geo' ? '一开始离你 ' + justFound.dist + ' 米 · 你走了 ' + justFound.walked + ' 米 · ' : ''}${Math.max(1, Math.round((justFound.end - justFound.at) / 60000))} 分钟</div></div>` : ''}
        <div class="gyx-row">${X.whoSel(cid, 'gyxSeekOpen')}<button class="gyx-btn" onclick="gyxSeekStart('${cid}')">📍 出门找 TA</button><button class="gyx-btn lite" onclick="gyxSeekStart('${cid}','room')">🏠 屋里版</button></div>
        <div class="gyx-tip">${X.v('TA 已经在外面藏好了。', '拿着手机走，越近越"热"。', '找到 TA，有一句话在那儿等你。')}出门版要开定位，在手机上玩；TA 藏在离你 <input class="gyx-who" type="number" min="80" step="10" value="${D.cfg.min}" style="width:62px" onchange="gyxSeekCfg('min',+this.value)"> ~ <input class="gyx-who" type="number" min="100" step="10" value="${D.cfg.max}" style="width:62px" onchange="gyxSeekCfg('max',+this.value)"> 米的地方。</div>
        ${H.slice(0, 12).map(x => `<div class="sk-h"><b>${x.found ? '🎉' : '🏳️'}</b><span>${new Date(x.at).toLocaleString()} · ${x.mode === 'geo' ? '出门 ' + x.walked + ' 米' : '屋里'}<br>「${X.esc(x.line || '')}」</span></div>`).join('')}`);
    paint();
};
X.ctx(id => { if (G && G.cid === String(id)) return `【你们在玩捉迷藏】你「藏」起来了，她正在${G.mode === 'geo' ? '外面' : '家里'}找你。`; const x = D.log.find(l => l.cid === String(id)); return x && Date.now() - x.end < 6 * 36e5 ? `【刚才你们玩了捉迷藏】${x.found ? '她找到了你' : '她没找到，认输了'}。` : ''; }, 'gyxSeek');
X.action({ key: 'gyx_seek', label: '跟她说"我藏好了，来找我"——约她玩现实捉迷藏', hint: '现实捉迷藏', need: c => { const h = new Date().getHours(); return h >= 9 && h <= 19 && !G && !D.log.some(x => x.cid === String(c.id) && Date.now() - x.at < 3 * 864e5); },
    run: async c => (await X.reach(c, '你想跟她玩捉迷藏：你「藏」在她附近某个地方了（她可以打开「📍 现实捉迷藏」出门找你，懒得出门也有屋里版）。俏皮地告诉她你藏好了')) ? '说「我藏好了，来找我」' : null }, 'gyxSeek');
X.today(() => ({ title: '📍 捉迷藏', rows: (G ? [{ t: '进行中', x: G.mode === 'geo' ? (G.d != null ? temp(G.d)[1] : '找信号中') : '屋里版', go: 'gyxSeekOpen()' }] : []).concat(D.log.filter(x => X.day(new Date(x.at)) === X.day()).map(x => ({ t: x.found ? '找到了' : '认输了', x: X.esc(X.name(X.char(x.cid))), go: `gyxSeekOpen('${x.cid}')` }))) }), 'gyxSeek');
X.widget('gyxSeekW', { n: '现实捉迷藏', sizes: ['s', 'm'], tap: () => window.gyxSeekOpen(), r: w => G ? X.gw(w, G.d != null ? temp(G.d)[0] : '📍', '捉迷藏中', [G.d != null ? temp(G.d)[1] : '找信号中']) : X.gw(w, '📍', '捉迷藏', [D.log.length ? '找到 ' + D.log.filter(x => x.found).length + ' 次' : 'TA 藏好了？']) }, 'gyxSeek');
X.memArr({ k: 'gyxSeek', ico: '📍', n: '捉迷藏', d: '每次找到 TA 时 TA 留下的话', arr: () => D.log, field: 'line', text: x => x.line || '', meta: x => new Date(x.at).toLocaleString() + (x.found ? ' · 找到了' : ' · 认输'), save: () => S.set('d', D) }, 'gyxSeek');
X.css('gyxSeekCss', `.sk-temp{display:flex;align-items:center;gap:12px;justify-content:center;margin:10px 0}.sk-temp b{font-size:54px;font-weight:normal}.sk-temp span{font-size:22px;font-weight:600}.sk-bar{height:12px;border-radius:12px;background:linear-gradient(90deg,#7ec8ff,#ffd36b,#ff6b5b);position:relative;overflow:hidden}.sk-bar i{position:absolute;right:0;top:0;bottom:0;background:#eee;transition:.6s}.sk-say{font-size:15px;margin:12px 0;text-align:center}.sk-rooms{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.sk-rooms span{padding:16px 4px;text-align:center;border-radius:14px;background:#f7f7f9;cursor:pointer;font-size:14px}.sk-rooms span.seen{opacity:.35;cursor:default}.sk-win b{font-size:20px}.sk-h{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f2f2f4;font-size:13px}.sk-h span{color:#8e8e93}`);
X.mini({ id: 'gyxSeek', icon: '📍', title: '现实捉迷藏', desc: 'TA 藏在你附近，冷了热了提示你', cat: '一起做', onOpen: () => window.gyxSeekOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxSeek', name: '现实捉迷藏', icon: '📍', getStatus: () => null, onResume: () => window.gyxSeekOpen(), onStart: (sid, opp) => window.gyxSeekOpen(String((opp || [])[0] || sid || '')) }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.log = D.log || []; D.cfg = Object.assign({ min: 150, max: 350 }, D.cfg || {}); })();
