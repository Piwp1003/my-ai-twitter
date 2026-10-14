/* 🚶 陪你散步：出门的时候打开它，TA 就「走在你旁边」——按你真实走过的路记下路线、用手机的运动传感器数步数（v232），每走一段、每过几分钟 TA 说一句（风大不大、累不累、看到什么了）；回来后路线画成一张小图，TA 写一句散步日记。定位不在手机上也能用，按时间陪你走 */
if (window.__gyxWalk) return; window.__gyxWalk = 1;
X.feat('gyxWalk', { n: '🚶 陪你散步', desc: '按真实路线陪你走、数你的步数，每走一段 TA 说一句；TA 也会发邀请卡约你出去走走' });
const S = X.store('walk');
let D = { walks: [], cfg: { m: 500, min: 5, voice: false, stepTalk: 1000, stride: 0.7 } };   // [{id, cid, start, end, dist, pts:[[lat,lon,t]], talk:[{t,at}], diary}]
let W = null, WID = null, TM = null, busy = false;
const hv = (a, b) => { const R = 6371000, r = x => x * Math.PI / 180, dl = r(b[0] - a[0]), dn = r(b[1] - a[1]); const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const km = m => m < 1000 ? Math.round(m) + ' 米' : (m / 1000).toFixed(2) + ' 公里';
const mins = ms => Math.max(0, Math.round(ms / 60000)) + ' 分钟';
/* 👣 计步：手机的加速度传感器（DeviceMotion）。电脑上没有这个传感器就不显示步数，不影响别的。
   iPhone 要先问一次权限，而且必须在你「点按钮的那一下」里问——所以出门、约 TA 的按钮点下去第一件事就是 askMotion()。
   算法：重力加速度的模长做个低通，减掉慢慢漂的基线，越过阈值的峰算一步；两步之间至少 280ms（人一秒最多走三四步）。 */
let MOT = null;   // {on, base, last, up, at}
const hasMotion = () => typeof window.DeviceMotionEvent !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
function askMotion() {
    try { const D0 = window.DeviceMotionEvent; if (D0 && typeof D0.requestPermission === 'function') return D0.requestPermission().then(r => r === 'granted').catch(() => false); } catch (e) {}
    return Promise.resolve(hasMotion());
}
function onMotion(e) {
    if (!W || !MOT) return; const a = e.accelerationIncludingGravity || e.acceleration; if (!a || a.x == null) return;
    const m = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); MOT.got = 1;
    MOT.base = MOT.base == null ? m : MOT.base * 0.92 + m * 0.08; MOT.f = MOT.f == null ? m : MOT.f * 0.6 + m * 0.4;
    const d = MOT.f - MOT.base, now = Date.now();
    if (!MOT.up && d > 1.15 && now - MOT.at > 280) { MOT.up = 1; MOT.at = now; W.steps = (W.steps || 0) + 1; stepTick(); }
    else if (MOT.up && d < 0.2) MOT.up = 0;
}
function startMotion(ok) { if (!W) return; W.steps = 0; W.lastS = 0; if (!ok || !hasMotion()) { W.noStep = hasMotion() ? '没拿到运动权限，不数步数' : ''; return; } MOT = { at: 0 }; window.addEventListener('devicemotion', onMotion); setTimeout(() => { if (W && MOT && !MOT.got) { W.noStep = '这台设备没有运动传感器，不数步数'; paint(); } }, 6000); }
function stopMotion() { window.removeEventListener('devicemotion', onMotion); MOT = null; }
// 没有定位的时候，用步数估距离（步长可调）
const walked = w => w.pts && w.pts.length > 1 ? w.dist : Math.max(w.dist || 0, (w.steps || 0) * (+D.cfg.stride || 0.7));
let STT = 0;
function stepTick() { if (!W) return; const n = +D.cfg.stepTalk || 1000; if (W.steps - (W.lastS || 0) >= n) { W.lastS = W.steps; talk(`她刚又走了 ${n} 步（一共 ${W.steps} 步）。`); } if (Date.now() - STT > 1000) { STT = Date.now(); paint(); } }
const stepTxt = w => w.steps ? w.steps + ' 步' : '';
function svg(pts, w, h) {
    if (!pts || pts.length < 2) return `<svg viewBox="0 0 ${w} ${h}" width="100%"><text x="50%" y="50%" text-anchor="middle" fill="#aaa" font-size="13">${pts && pts.length ? '还在原地' : '没有定位，只按时间陪你走'}</text></svg>`;
    const la = pts.map(p => p[0]), lo = pts.map(p => p[1]), a = Math.min(...la), b = Math.max(...la), c = Math.min(...lo), d = Math.max(...lo), s = Math.max(b - a, (d - c) * Math.cos(a * Math.PI / 180), 1e-5);
    const P = pts.map(p => [10 + (p[1] - c) * Math.cos(a * Math.PI / 180) / s * (w - 20), h - 10 - (p[0] - a) / s * (h - 20)]);
    return `<svg viewBox="0 0 ${w} ${h}" width="100%"><polyline points="${P.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#5ac8a8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${P[0][0]}" cy="${P[0][1]}" r="5" fill="#34c759"/><circle cx="${P[P.length - 1][0]}" cy="${P[P.length - 1][1]}" r="6" fill="#ff6b8b"/></svg>`;
}
async function talk(why) {
    if (!W || busy) return; busy = true; const c = X.char(W.cid), el = Date.now() - W.start;
    let t = null;
    try { const wx = typeof window.gymapWeatherInfo === 'function' ? await window.gymapWeatherInfo() : null; const h = new Date().getHours();
        t = X.bailu() ? null : await X.ask(`${X.who(c)}\n你正「走在她旁边」陪她散步（她开着定位，你看得到她走了多远）。已经走了 ${km(walked(W))}${W.steps ? '（' + W.steps + ' 步）' : ''}、${mins(el)}，现在 ${h} 点${wx ? '，天气：' + [wx.city, wx.desc, wx.now != null ? wx.now + '°' : ''].filter(Boolean).join(' ') : ''}。${why}\n${window.gyxMissionNow && window.gyxMissionNow() ? '你派给她的小任务是「' + window.gyxMissionNow() + '」，可以提醒她路上留意。' : ''}\n刚才你说过：${W.talk.slice(-3).map(x => x.t).join(' / ') || '（还没说话）'}\n像真的走在她身边一样说一句（短，口语，别重复刚才的话）。`); } catch (e) {}
    if (!t) t = X.pick(X.cards(['散步', '陪伴'], c, 3).concat([`走了${W.steps ? W.steps + '步' : km(walked(W))}了，累不累？`, '风有点大，你衣服穿够没？', '慢点走，我跟得上。', '你看左边——算了，我也看不见，你给我讲讲。', '要是我真的在就好了，可以牵着你的手。', `已经${mins(el)}了，要不要找个地方坐会儿？`, '前面有没有好看的花？拍给我看看。']));
    W.talk.push({ t: X.plain(t), at: Date.now() }); busy = false; paint(); if (D.cfg.voice) X.speak(c, t);
}
function onPos(p) { if (!W) return; const q = [p.coords.latitude, p.coords.longitude, Date.now()]; const last = W.pts[W.pts.length - 1]; if (p.coords.accuracy > 80 && W.pts.length) return; if (last) { const d = hv(last, q); if (d < 6) return; W.dist += d; } W.pts.push(q); if (W.dist - W.lastM >= (+D.cfg.m || 500)) { W.lastM = W.dist; talk(`你们刚又走了 ${km(+D.cfg.m || 500)}。`); } paint(); }
window.gyxWalkStart = (cid, motionOk) => {
    const c = X.char(cid) || X.cur(); if (!c || W) return; W = { id: 'wk' + Date.now().toString(36), cid: String(c.id), start: Date.now(), dist: 0, lastM: 0, lastT: Date.now(), pts: [], talk: [], steps: 0 };
    try { if (navigator.geolocation) WID = navigator.geolocation.watchPosition(onPos, e => { W && (W.geoErr = e.message || '定位不可用'); paint(); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }); else W.geoErr = '这台设备没有定位'; } catch (e) { W.geoErr = '定位不可用'; }
    // motionOk 没传＝这一下就是你点的按钮：当场问权限（iPhone 必须在点击里问）
    (motionOk === undefined ? askMotion() : Promise.resolve(!!motionOk)).then(startMotion);
    TM = setInterval(() => { if (W && Date.now() - W.lastT >= (+D.cfg.min || 5) * 60000) { W.lastT = Date.now(); talk(''); } paint(); }, 15000);
    talk('你们刚出门。'); window.gyxWalkOpen(c.id);
};
window.gyxWalkStop = async () => {
    if (!W) return; try { if (WID != null) navigator.geolocation.clearWatch(WID); } catch (e) {} clearInterval(TM); stopMotion(); WID = null; const w = W; W = null; w.end = Date.now(); w.dist = walked(w); const c = X.char(w.cid);
    let d = X.bailu() ? null : await X.ask(`${X.who(c)}\n你刚陪她散完步：${km(w.dist)}${w.steps ? '、' + w.steps + ' 步' : ''}、${mins(w.end - w.start)}。路上你说过：${w.talk.map(x => x.t).join(' / ')}\n写一句散步日记（30 字以内）。`);
    w.diary = X.plain(d || X.v(`今天陪你走了${km(w.dist)}。下次换我走在外侧。`, `${mins(w.end - w.start)}，${km(w.dist)}。你走路的样子我想象得到。`, '散步回来了。希望你今天心情好一点点。'));
    delete w.lastM; delete w.lastT; delete w.lastS; delete w.noStep; if (!w.steps) delete w.steps; D.walks.unshift(w); await S.set('d', D);
    X.say(c, `🚶 ${w.diary}`); window.gyxWalkOpen(w.cid);
};
function paint() { const b = document.getElementById('gyxWkLive'); if (!b || !W) return; b.innerHTML = `<div class="wk-num"><b>${km(walked(W))}</b>${W.steps || MOT ? `<b class="wk-st">👣 ${W.steps || 0}</b>` : ''}<span>${mins(Date.now() - W.start)}</span></div>${svg(W.pts, 320, 160)}${W.geoErr ? `<div class="gyx-tip">📍 ${X.esc(W.geoErr)}——${MOT ? '按步数估距离' : '只按时间陪你走'}</div>` : ''}${W.noStep ? `<div class="gyx-tip">👣 ${X.esc(W.noStep)}</div>` : ''}${window.gyxMissionNow && window.gyxMissionNow() ? `<div class="gyx-tip">📮 路上的小任务：${X.esc(window.gyxMissionNow())}　<span style="cursor:pointer;color:#5ac8a8" onclick="gyxMisOpen()">拍照交差 ›</span></div>` : ''}<div class="wk-talk">${W.talk.slice(-5).reverse().map(x => `<div>💬 ${X.esc(x.t)}</div>`).join('')}</div>`; }
window.gyxWalkCfg = (k, v) => { D.cfg[k] = v; S.set('d', D); };
window.gyxWalkDel = async id => { D.walks = D.walks.filter(x => x.id !== id); await S.set('d', D); window.gyxWalkOpen(); };
window.gyxWalkOpen = function (who) {
    const c = (W && X.char(W.cid)) || X.char(who) || X.cur(); if (!c) return; const cid = String(c.id);
    X.panel('gyxWalkOv', '🚶 和 ' + X.esc(X.name(c)) + ' 散步', W ? `<div id="gyxWkLive"></div><div class="gyx-row" style="justify-content:center"><button class="gyx-btn" onclick="gyxWalkStop()">到家了</button><button class="gyx-btn lite" onclick="this.disabled=true;setTimeout(()=>this.disabled=false,4000);gyxWalkTalk()">跟 TA 说说话</button></div>`
        : `<div class="gyx-row">${X.whoSel(cid, 'gyxWalkOpen')}<button class="gyx-btn" onclick="gyxWalkStart('${cid}')">出门啦</button><button class="gyx-btn lite" onclick="gyxWalkInvite('${cid}',this)">📨 约 TA 去散步</button></div><div class="gyx-tip">${X.v('开着这个页面走，TA 就在你旁边。', '出门记得带上 TA。', '你走多远，TA 陪多远。')}手机锁屏后定位和计步可能会停，回来点「到家了」就行。${hasMotion() ? '' : '这台设备没有运动传感器，只记距离不数步数。'}</div>
        <div class="gyx-row gyx-tip">每走 <input class="gyx-who" type="number" min="100" step="100" value="${D.cfg.m}" style="width:70px" onchange="gyxWalkCfg('m',+this.value)"> 米 / 每 <input class="gyx-who" type="number" min="1" value="${D.cfg.min}" style="width:50px" onchange="gyxWalkCfg('min',+this.value)"> 分钟 TA 说一句 · <label><input type="checkbox" ${D.cfg.voice ? 'checked' : ''} onchange="gyxWalkCfg('voice',this.checked)"> 念出来（戴耳机）</label></div>
        <div class="gyx-row gyx-tip">👣 每 <input class="gyx-who" type="number" min="100" step="100" value="${D.cfg.stepTalk}" style="width:70px" onchange="gyxWalkCfg('stepTalk',+this.value)"> 步也说一句 · 步长 <input class="gyx-who" type="number" min="0.3" max="1.2" step="0.05" value="${D.cfg.stride}" style="width:60px" onchange="gyxWalkCfg('stride',+this.value)"> 米（没定位时用步数估距离）</div>
        ${D.walks.filter(x => x.cid === cid).slice(0, 20).map(x => `<div class="gyx-card"><div class="wk-num"><b>${km(x.dist)}</b>${x.steps ? `<b class="wk-st">👣 ${x.steps}</b>` : ''}<span>${new Date(x.start).toLocaleString()} · ${mins(x.end - x.start)}</span><i onclick="gyxWalkDel('${x.id}')">删</i></div>${svg(x.pts, 320, 110)}<div class="gyx-tip">${X.esc(x.diary || '')}</div></div>`).join('') || '<div class="gyx-tip">还没一起散过步</div>'}`);
    paint();
};
window.gyxWalkData = () => D;
window.gyxWalkTalk = () => talk('她想跟你说说话。');
X.ctx(id => { if (W && W.cid === String(id)) return `【你正在陪她散步】已经 ${km(walked(W))}${W.steps ? '（' + W.steps + ' 步）' : ''}、${mins(Date.now() - W.start)}，你「走在她旁边」。`; const x = D.walks.find(w => w.cid === String(id)); return x && Date.now() - x.end < 6 * 36e5 ? `【刚才陪她散了步】${km(x.dist)}${x.steps ? '、' + x.steps + ' 步' : ''}，${mins(x.end - x.start)}。` : ''; }, 'gyxWalk');
/* 📨 邀请卡：跟「约出去」「一起看电影」同一套（js/28）。TA 约你 → 私聊里一张卡，你点「好啊」就打开散步页；
   你约 TA → TA 按性格决定去不去，答应了就直接出门（计步权限在你点「约」的那一下就问好了）。 */
const KIND = { ico: '🚶', name: '一起散步', verb: '一起出去走走', go: '出门', openOnYes: true, accept(inv) { window.gyxWalkOpen(inv && inv.charId); } };
const regKind = () => { if (window.GY_INVITE_KINDS && !window.GY_INVITE_KINDS.walk) window.GY_INVITE_KINDS.walk = KIND; };
regKind(); setTimeout(regKind, 1500);
window.gyxWalkInvite = async (cid, btn) => {
    const c = X.char(cid) || X.cur(); if (!c) return; if (W) return X.toast(X.v('已经在走啦', '你们正走着呢', '先把这趟走完'));
    const mok = await askMotion(); regKind();
    if (typeof window.gyInviteSend !== 'function') { window.gyxWalkStart(c.id, mok); return; }
    if (btn) { btn.disabled = true; btn.textContent = '等 TA 回话…'; }
    try { await window.gyInviteSend({ char: c, kind: 'walk', jump: false, onYes: () => window.gyxWalkStart(c.id, mok), onNo: r => X.toast(X.name(c) + '：' + ((r && r.line) || '这次算了')) }); }
    finally { if (btn) { btn.disabled = false; btn.textContent = '📨 约 TA 去散步'; } }
};
window.gyxWalkCharInvite = async cid => {
    const c = X.char(cid); if (!c) return null; regKind();
    let line = X.bailu() ? null : await X.ask(`${X.who(c)}\n你想约她出去走走透透气，你会「走在她旁边」陪她（她手机开着定位和计步）。现在 ${new Date().getHours()} 点。用你的方式开口约她，一句话，20 字以内，口语，不要引号。`);
    line = X.plain(line || X.v('出去走走？我陪你。', '今天天气不错，下楼走两圈？', '坐太久了吧，起来走走，我跟着。'));
    if (typeof window.gyInviteFromChar === 'function') return window.gyInviteFromChar({ char: c, kind: 'walk', line, onYes: () => window.gyxWalkOpen(c.id) });
    return (await X.reach(c, '你想让她出去走走透透气，你会「陪着她」（她可以开「🚶 陪你散步」）。用你的方式约她')) ? true : null;
};
X.action({ key: 'gyx_walk', label: '约她出去走走，你陪着（发邀请卡）', hint: '陪你散步', need: c => { const h = new Date().getHours(); return !W && h >= 7 && h <= 21 && !D.walks.some(x => x.cid === String(c.id) && Date.now() - x.end < 2 * 864e5); },
    run: async c => (await window.gyxWalkCharInvite(c.id)) ? '约你出去走走' : null }, 'gyxWalk');
/* 🗺️ 挂进「行程与天气 → 🤝 约出去」那一页：散步也是"约出去"的一种 */
(window.GY_DATE_EXTRA = window.GY_DATE_EXTRA || []).push(() => {
    if (!X.on('gyxWalk')) return '';
    const last = D.walks.slice(0, 3);
    return `<div class="gymap-sec"><h4>🚶 出去走走（陪你散步）</h4>
      <div class="gymap-hint">不用挑地点，下楼走走也算约会：TA 按你真实的路线和步数陪你走，每走一段说一句。角色也会自己发邀请卡约你（在自主模式里，跟着「🚶 陪你散步」的开关）。</div>
      ${W ? `<div class="gymap-wcard"><b>正在散步</b>　${X.esc(X.name(X.char(W.cid)))} · ${km(walked(W))}${W.steps ? ' · 👣 ' + W.steps : ''}　<button class="gymap-mini" onclick="gyxWalkOpen()">看看</button></div>` : ''}
      <button class="gymap-btn" onclick="gyxWalkOpen()">🚶 打开散步</button>
      ${last.map(x => `<div class="gymap-row"><div class="gymap-row-m"><b>🚶 ${X.esc(X.name(X.char(x.cid)))} · ${km(x.dist)}${x.steps ? ' · 👣 ' + x.steps : ''}</b><span>${new Date(x.start).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}${x.diary ? '<br>「' + X.esc(x.diary) + '」' : ''}</span></div></div>`).join('')}
    </div>`;
});
X.today(() => ({ title: '🚶 散步', rows: (W ? [{ t: '进行中', x: km(walked(W)) + (W.steps ? ' · 👣 ' + W.steps : '') + ' · ' + mins(Date.now() - W.start), go: 'gyxWalkOpen()' }] : []).concat(D.walks.filter(x => X.day(new Date(x.start)) === X.day()).map(x => ({ t: km(x.dist) + (x.steps ? ' · 👣 ' + x.steps : ''), x: '和 ' + X.esc(X.name(X.char(x.cid))) + ' 散了步', go: `gyxWalkOpen('${x.cid}')` }))) }), 'gyxWalk');
X.widget('gyxWalkW', { n: '陪你散步', sizes: ['s', 'm'], tap: () => window.gyxWalkOpen(), r: w => { if (W) return X.gw(w, '🚶', '散步中', [km(walked(W)) + (W.steps ? ' · 👣' + W.steps : ''), mins(Date.now() - W.start)]); const tot = D.walks.reduce((a, x) => a + x.dist, 0), td = D.walks.filter(x => X.day(new Date(x.start)) === X.day()).reduce((a, x) => a + (x.steps || 0), 0); return X.gw(w, '🚶', '陪你散步', D.walks.length ? [td ? '今天 👣 ' + td : '一共 ' + km(tot), D.walks.length + ' 次'] : ['出去走走？']); } }, 'gyxWalk');
X.memArr({ k: 'gyxWalk', ico: '🚶', n: '散步', d: '一起散过的步和散步日记', arr: () => D.walks, field: 'diary', text: x => x.diary || '', meta: x => new Date(x.start).toLocaleString() + ' · ' + km(x.dist) + (x.steps ? ' · ' + x.steps + ' 步' : ''), save: () => S.set('d', D) }, 'gyxWalk');
X.css('gyxWalkCss', `.wk-num{display:flex;align-items:baseline;gap:10px;margin:6px 0}.wk-num b{font-size:26px}.wk-num span{color:#888;font-size:12.5px;flex:1}.wk-num i{font-style:normal;font-size:11px;color:#aaa;cursor:pointer}.wk-talk div{padding:6px 0;font-size:14px;border-bottom:1px dashed #eee}.wk-num b.wk-st{font-size:17px;color:#5ac8a8}#gyxWkLive svg{background:#f4fbf8;border-radius:14px}`);
X.mini({ id: 'gyxWalk', icon: '🚶', title: '陪你散步', desc: '按真实路线和步数陪你走，每走一段说一句', cat: '陪伴', onOpen: () => window.gyxWalkOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.walks = D.walks || []; D.cfg = Object.assign({ m: 500, min: 5, voice: false, stepTalk: 1000, stride: 0.7 }, D.cfg || {}); })();
