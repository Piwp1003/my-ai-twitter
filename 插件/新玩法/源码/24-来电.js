/* 📞 来电：TA 打来时的来电画面和铃声（每个角色可以不一样，TA 也会偷偷给自己换一套）+ 来电增强（拒接时挑理由、太久没说话 TA 打来问、没接 TA 留语音留言、每通电话留一行小结）。原来是「来电动画和铃声」「来电增强」两个，合成一个入口；两样各自的开关还在插件开关中心里 */
// 一个入口、顶上一排标签：画面和铃声 / 设置 / 语音留言 / 通话小结
window.gyxCallTabs = cur => `<div class="gyx-row">${[['ring', '画面和铃声', 'gyxRingOpen()'], ['set', '拒接和查岗', "gyxCallPlusOpen('set')"], ['vm', '语音留言', "gyxCallPlusOpen('vm')"], ['sum', '通话小结', "gyxCallPlusOpen('sum')"]].filter(([k]) => k === 'ring' ? X.on('gyxRing') : X.on('gyxCallPlus')).map(([k, n, f]) => `<span class="gyx-chip ${cur === k ? 'on' : ''}" onclick="${f}">${n}</span>`).join('')}</div>`;
window.gyxCallOpen = tab => { if (tab && tab !== 'ring' && X.on('gyxCallPlus')) return window.gyxCallPlusOpen(tab); if (X.on('gyxRing')) return window.gyxRingOpen(); if (X.on('gyxCallPlus')) return window.gyxCallPlusOpen(); X.toast('📞 来电', '两样都关着，去插件开关中心打开'); };
/* ==== 📞 来电画面和铃声 ==== */
(() => {
if (window.__gyxRing) return; window.__gyxRing = 1;
X.feat('gyxRing', { n: '📞 来电动画和铃声', desc: 'TA 打来时的专属来电画面和铃声；TA 也会偷偷给自己换一套' });
const S = X.store('ring');
let D = { def: { theme: 'ripple', tone: 'soft', vol: .5 }, chars: {} };   // chars[cid]={theme,tone,wall,toneData}
const THEMES = { ripple: '波纹', heart: '心跳', stars: '星空', blur: '模糊头像', glass: '毛玻璃', sunset: '日落', wall: '自己的壁纸' };
// 自带铃声：几段原创的小旋律（音名序列）
const TONES = { soft: ['轻轻的', [76, 79, 83, 79, 76, 72, 74, 76], .28], bright: ['明亮', [72, 76, 79, 84, 79, 76, 79, 84], .2], lullaby: ['摇篮曲', [67, 72, 71, 69, 67, 64, 65, 67], .38], bubble: ['泡泡', [84, 88, 91, 88, 84, 86, 88, 84], .14], retro: ['老式电话', 'retro', 0], harp: ['竖琴', [60, 64, 67, 72, 76, 79, 84, 88], .12], none: ['静音', [], 0] };
const SUBS = ['想你了，来电…', '邀请你语音通话…', '在等你接起来…', '有话想跟你说…', '想听听你的声音…', '正在呼叫你…'];
let AC = null, LOOP = null, SRC = null;
function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
function playTone(key, vol, data) {
    stopTone(); vol = vol == null ? .5 : vol;
    if (data) { try { SRC = new Audio(data); SRC.loop = true; SRC.volume = vol; SRC.play().catch(() => {}); } catch (e) {} return; }
    const t = TONES[key] || TONES.soft; if (!t[1] || !t[1].length) return;
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const once = () => {
        const a = AC, now = a.currentTime;
        if (t[1] === 'retro') { for (let r = 0; r < 2; r++) { const o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(); o.frequency.value = 440; o2.frequency.value = 480; o.connect(g); o2.connect(g); g.connect(a.destination); const s = now + r * .5; g.gain.setValueAtTime(.001, s); g.gain.linearRampToValueAtTime(.12 * vol, s + .02); g.gain.setValueAtTime(.12 * vol, s + .38); g.gain.linearRampToValueAtTime(.001, s + .4); o.start(s); o2.start(s); o.stop(s + .41); o2.stop(s + .41); } return 2600; }
        t[1].forEach((n, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = midi(n); o.connect(g); g.connect(a.destination); const s = now + i * t[2]; g.gain.setValueAtTime(.001, s); g.gain.exponentialRampToValueAtTime(.18 * vol, s + .02); g.gain.exponentialRampToValueAtTime(.001, s + t[2] * 2.2); o.start(s); o.stop(s + t[2] * 2.4); });
        return t[1].length * t[2] * 1000 + 900;
    };
    const go = () => { const ms = once(); LOOP = setTimeout(go, ms); }; go();
}
function stopTone() { clearTimeout(LOOP); LOOP = null; try { if (SRC) { SRC.pause(); SRC = null; } } catch (e) {} }
window.gyxRingStop = stopTone;
const cfgOf = cid => Object.assign({}, D.def, D.chars[String(cid)] || {});
function dress(cid) {
    const m = document.getElementById('gyCallIncoming'); if (!m) return; const c = X.char(cid), f = cfgOf(cid);
    Object.keys(THEMES).forEach(k => m.classList.remove('gyxr-' + k)); m.classList.add('gyxr-' + f.theme);
    let bg = m.querySelector('.gyxr-bg'); if (!bg) { bg = document.createElement('div'); bg.className = 'gyxr-bg'; m.insertBefore(bg, m.firstChild); }
    bg.innerHTML = f.theme === 'stars' ? Array.from({ length: 50 }, () => `<i style="left:${X.rnd(0, 100)}%;top:${X.rnd(0, 100)}%;animation-delay:${X.rnd(0, 3)}s"></i>`).join('') : f.theme === 'ripple' || f.theme === 'heart' ? '<b></b><b></b><b></b>' : '';
    let url = ''; if (f.theme === 'wall' && f.wall) url = f.wall; if (f.theme === 'blur') { try { const t = document.createElement('div'); t.style.cssText = 'position:fixed;left:-999px'; t.innerHTML = getAvatarHTML(c, 64); document.body.appendChild(t); const m2 = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(t.firstElementChild).backgroundImage || ''); t.remove(); if (m2) url = m2[1]; } catch (e) {} }
    bg.style.backgroundImage = url ? `url("${url}")` : '';
    const sub = document.getElementById('gyInSub'); if (sub) sub.dataset.gyx = X.pick(SUBS);
    playTone(f.tone, f.vol, f.toneData);
    // 🎁 TA 偷偷换过：这次来电才让你发现
    const sp = D.surprise && D.surprise[String(cid)];
    if (!sp) { const o = m.querySelector('.gyxr-sp'); if (o) o.remove(); }
    if (sp) { let t = m.querySelector('.gyxr-sp'); if (!t) { t = document.createElement('div'); t.className = 'gyxr-sp'; m.appendChild(t); } t.innerHTML = `✨ ${X.esc(X.name(c))} 偷偷换的${sp.line ? '：「' + X.esc(sp.line) + '」' : ''}`; const L = (D.swapLog || []).find(x => x.at === sp.at); if (L) L.found = Date.now(); delete D.surprise[String(cid)]; S.set('d', D); }
}
function hook() {
    const r = window.gyCallRing; if (typeof r !== 'function' || r.__gyx) return;
    const w = function (who) { const ok = r.apply(this, arguments); try { if (ok && X.on('gyxRing')) { const id = who && who.id != null ? who.id : who; dress(id); } } catch (e) {} return ok; };
    w.__gyx = true; window.gyCallRing = w;
    ['gyCallAccept', 'gyCallReject'].forEach(n => { const f = window[n]; if (typeof f !== 'function' || f.__gyx) return; const g = function () { stopTone(); return f.apply(this, arguments); }; g.__gyx = true; window[n] = g; });
    // 你打给 TA：等 TA 接的时候放「嘟——」
    const st = window.gyCallStart; if (typeof st === 'function' && !st.__gyx) { const g = async function (id, incoming) { if (!incoming && X.on('gyxRing') && D.def.ringback !== false) playTone('retro', D.def.vol * .6); try { return await st.apply(this, arguments); } finally { stopTone(); } }; g.__gyx = true; window.gyCallStart = g; }
    // 倒计时文字换成更像真人的
    setInterval(() => { const s = document.getElementById('gyInSub'); if (s && s.dataset.gyx && /邀请你语音通话/.test(s.innerText)) s.innerText = s.innerText.replace('邀请你语音通话…', s.dataset.gyx); }, 300);
}
window.gyxRingOpen = function (who) {
    const c = X.char(who) || X.cur(); const cid = c ? String(c.id) : ''; const f = cfgOf(cid), own = !!D.chars[cid];
    X.panel('gyxCallOv', '📞 来电', window.gyxCallTabs('ring') + `<div class="gyx-row">${X.whoSel(cid, 'gyxRingOpen')}<label><input type="checkbox" ${own ? 'checked' : ''} onchange="gyxRingOwn('${cid}',this.checked)"> TA 用自己的一套（不勾＝跟默认一样）</label></div>
        <div class="gyx-tip">来电画面</div><div class="gyx-row">${Object.entries(THEMES).map(([k, n]) => `<span class="gyx-chip ${f.theme === k ? 'on' : ''}" onclick="gyxRingSet('${cid}','theme','${k}')">${n}</span>`).join('')}</div>
        ${f.theme === 'wall' ? `<label class="gyx-btn lite">上传来电壁纸<input type="file" accept="image/*" style="display:none" onchange="gyxRingFile('${cid}','wall',this)"></label>` : ''}
        <div class="gyx-tip">铃声</div><div class="gyx-row">${Object.entries(TONES).map(([k, t]) => `<span class="gyx-chip ${f.tone === k && !f.toneData ? 'on' : ''}" onclick="gyxRingSet('${cid}','tone','${k}')">${t[0]}</span>`).join('')}<label class="gyx-chip ${f.toneData ? 'on' : ''}">上传铃声<input type="file" accept="audio/*" style="display:none" onchange="gyxRingFile('${cid}','toneData',this)"></label></div>
        <div class="gyx-row">音量 <input type="range" min="0" max="1" step=".05" value="${f.vol}" onchange="gyxRingSet('${cid}','vol',+this.value)"> <label><input type="checkbox" ${D.def.ringback !== false ? 'checked' : ''} onchange="D_RB(this.checked)"> 你打给 TA 时放「嘟——」</label></div>
        <div class="gyx-row"><button class="gyx-btn" onclick="gyxRingPreview('${cid}')">预览来电</button><button class="gyx-btn lite" onclick="gyxRingStop()">停</button></div>`);
};
window.D_RB = v => { D.def.ringback = v; S.set('d', D); };
window.gyxRingOwn = async (cid, v) => { if (v) D.chars[cid] = Object.assign({}, D.def); else delete D.chars[cid]; await S.set('d', D); window.gyxRingOpen(cid); };
window.gyxRingSet = async (cid, k, v) => { const t = D.chars[cid] || D.def; t[k] = v; if (k === 'tone') delete t.toneData; await S.set('d', D); if (k === 'tone') playTone(v, t.vol); if (k !== 'vol') window.gyxRingOpen(cid); };
window.gyxRingFile = (cid, k, inp) => { const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = async () => { const t = D.chars[cid] || D.def; t[k] = r.result; await S.set('d', D); window.gyxRingOpen(cid); }; r.readAsDataURL(f); };
window.gyxRingPreview = cid => { const o = document.getElementById('gyxRgOv'); if (o) o.remove(); if (window.gyCallRing && window.gyCallRing(cid, '（预览）')) setTimeout(() => { try { window.gyCallReject(true); } catch (e) {} }, 6000); };
window.gyxRingData = () => D;
// 自主行动：TA 偷偷给自己的来电换一套（画面 + 铃声），等你下次接电话才发现
async function swap(c) {
    const cid = String(c.id), f = cfgOf(cid);
    const th = X.pick(Object.keys(THEMES).filter(k => k !== f.theme && (k !== 'wall' || f.wall))), tn = X.pick(Object.keys(TONES).filter(k => k !== f.tone && k !== 'none'));
    const line = X.bailu() ? (X.cards(['情话', '聊天'], c, 1)[0] || '') : (await X.ask(`${X.who(c)}\n你偷偷把自己打给她时的来电画面换成了「${THEMES[th]}」、铃声换成了「${TONES[tn][0]}」，她下次接你电话时才会发现。留一句话给她（15 字以内，像你会说的）。只输出这句话。`) || '');
    D.chars[cid] = Object.assign({}, f, { theme: th, tone: tn }); delete D.chars[cid].toneData;
    const at = Date.now(); D.surprise = D.surprise || {}; D.surprise[cid] = { at, line: X.plain(line).slice(0, 30) };
    D.swapLog = D.swapLog || []; D.swapLog.unshift({ id: 'rs' + at.toString(36), cid, at, theme: th, tone: tn, line: X.plain(line).slice(0, 30) }); D.swapLog = D.swapLog.slice(0, 40);
    await S.set('d', D); return th;
}
window.gyxRingSwap = id => swap(X.char(id) || X.cur());
X.action({ key: 'gyx_ring_swap', label: '偷偷给自己的来电换个画面和铃声（她下次接电话才发现）', hint: '一个小惊喜，不用告诉她', need: c => !(D.surprise || {})[String(c.id)] && !(D.swapLog || []).some(x => x.cid === String(c.id) && Date.now() - x.at < 5 * 864e5),
    run: async c => (await swap(c)) ? '偷偷换了来电画面和铃声' : null }, 'gyxRing');
X.today(() => ({ title: '📞 来电', rows: (D.swapLog || []).filter(x => x.found && X.day(new Date(x.found)) === X.day()).map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: `偷偷换了来电：${THEMES[x.theme] || ''} · ${(TONES[x.tone] || [''])[0]}`, go: `gyxRingOpen('${x.cid}')` })) }), 'gyxRing');
X.widget('gyxRingW', { n: '来电', sizes: ['s', 'm'], tap: () => window.gyxRingOpen(), r: w => { const c = X.cur(), f = c ? cfgOf(c.id) : D.def; return X.gw(w, '📞', '来电', [THEMES[f.theme] || '', (TONES[f.tone] || [''])[0] + ' 铃声']); } }, 'gyxRing');
X.memArr({ k: 'gyxRing', ico: '📞', n: 'TA 偷偷换的来电', d: 'TA 换来电画面 / 铃声时留的话', arr: () => D.swapLog || [], field: 'line', text: x => (x.line || '（没留话）') + `（${THEMES[x.theme] || ''} · ${(TONES[x.tone] || [''])[0]}）`, meta: x => new Date(x.at).toLocaleString() + (x.found ? ' · 你发现了' : ' · 还没发现'), save: () => S.set('d', D) }, 'gyxRing');
X.css('gyxRgCss', `#gyCallIncoming .gyxr-bg{position:absolute;inset:0;overflow:hidden;background-size:cover;background-position:center;z-index:0;pointer-events:none}#gyCallIncoming .gyin-box{position:relative;z-index:1}
#gyCallIncoming.gyxr-ripple .gyxr-bg{background:radial-gradient(circle at 50% 35%,#4b6cb7,#182848)}#gyCallIncoming.gyxr-ripple .gyxr-bg b,#gyCallIncoming.gyxr-heart .gyxr-bg b{position:absolute;left:50%;top:32%;width:160px;height:160px;margin:-80px;border-radius:50%;border:2px solid rgba(255,255,255,.5);animation:rgR 2.4s ease-out infinite}#gyCallIncoming .gyxr-bg b:nth-child(2){animation-delay:.8s}#gyCallIncoming .gyxr-bg b:nth-child(3){animation-delay:1.6s}
#gyCallIncoming.gyxr-heart .gyxr-bg{background:radial-gradient(circle at 50% 35%,#ff6b9a,#6a1b3d)}#gyCallIncoming.gyxr-heart .gyxr-bg b{border-color:rgba(255,200,220,.6);animation:rgH 1.1s ease-in-out infinite}
#gyCallIncoming.gyxr-stars .gyxr-bg{background:radial-gradient(ellipse at 50% 30%,#2b2f4a,#05060d)}#gyCallIncoming.gyxr-stars .gyxr-bg i{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;animation:giTw 2.4s infinite}
#gyCallIncoming.gyxr-blur .gyxr-bg{filter:blur(30px) brightness(.7) saturate(1.3);transform:scale(1.2)}#gyCallIncoming.gyxr-wall .gyxr-bg{filter:brightness(.75)}
#gyCallIncoming.gyxr-glass .gyxr-bg{background:linear-gradient(135deg,#a1c4fd,#c2e9fb,#fbc2eb);filter:saturate(1.2)}#gyCallIncoming.gyxr-sunset .gyxr-bg{background:linear-gradient(180deg,#ff9a8b,#ff6a88 45%,#5f2c82)}
#gyCallIncoming .gyxr-sp{position:absolute;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2;background:rgba(255,255,255,.18);backdrop-filter:blur(8px);color:#fff;font-size:12.5px;padding:6px 12px;border-radius:999px;white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis}
#gyCallIncoming[class*="gyxr-"] .gyin-av{animation:rgPop 1.2s ease-in-out infinite}
@keyframes rgR{from{transform:scale(.6);opacity:.9}to{transform:scale(2.6);opacity:0}}@keyframes rgH{0%,100%{transform:scale(1)}15%{transform:scale(1.25)}30%{transform:scale(1)}45%{transform:scale(1.15)}}@keyframes rgPop{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}@keyframes giTw{0%,100%{opacity:.2}50%{opacity:1}}`);
(async () => { D = Object.assign(D, await S.get('d', {})); D.def = Object.assign({ theme: 'ripple', tone: 'soft', vol: .5 }, D.def || {}); D.chars = D.chars || {}; hook(); setInterval(hook, 3000); })();

})();
/* ==== 📞 来电增强 ==== */
(() => {
if (window.__gyxCallPlus) return; window.__gyxCallPlus = 1;
X.feat('gyxCallPlus', { n: '📞 来电增强', desc: '拒接理由、太久没说话 TA 打来问、没接留语音留言、通话小结' });
const S = X.store('callplus');
let D = { o: { why: true, check: true, vm: true, sum: true, gap: 10 }, reasons: ['在开会', '在上课', '在洗澡', '在外面不方便', '等下打给你', '现在不想说话'], vm: [], sums: [], checks: [], seen: {} };
const saveD = () => S.set('d', D);
const on = k => X.on('gyxCallPlus') && D.o[k] !== false;
/* ① 拒接理由 */
function paintIncoming() {
    const m = document.getElementById('gyCallIncoming'); if (!m) return;
    let box = m.querySelector('.cp-why');
    if (!m.classList.contains('on') || !on('why')) { if (box) box.remove(); return; }
    if (box) return;
    box = document.createElement('div'); box.className = 'cp-why';
    box.innerHTML = `<span class="cp-t">挂断并告诉 TA：</span>${D.reasons.map((r, i) => `<span onclick="gyxCallWhy(${i})">${X.esc(r)}</span>`).join('')}`;
    (m.querySelector('.gyin-box') || m).appendChild(box);
}
window.gyxCallWhy = i => {
    const r = D.reasons[i]; const m = document.getElementById('gyCallIncoming'); const nm = (document.getElementById('gyInName') || {}).innerText || '';
    const c = X.chars().find(x => x.name === nm) || X.cur(); if (!r || !c) return;
    const arr = globalChats[String(c.id)] = globalChats[String(c.id)] || [];
    arr.push({ sender: 'me', text: `📵 挂断了你的电话：${r}`, timestamp: Date.now(), readBy: [], gyx: 1, gyxCallWhy: r });
    try { saveAllData(); } catch (e) {}
    try { window.gyCallReject(); } catch (e) {}
    X.toast(X.v('挂了，跟 TA 说了理由', '📵 已挂断', '好，TA 会知道的'), r);
};
/* ② 太久没说话，TA 打来问 */
const lastMe = c => { const H = (typeof globalChats !== 'undefined' && globalChats[c.id]) || []; for (let i = H.length - 1; i >= 0; i--) if (H[i].sender === 'me') return H[i].timestamp || 0; return 0; };
const lastAny = c => { const H = (typeof globalChats !== 'undefined' && globalChats[c.id]) || []; return H.length ? H[H.length - 1].timestamp || 0 : 0; };
function canCheck(c) { const lm = lastMe(c), h = new Date().getHours(); return lm && Date.now() - lm > (+D.o.gap || 10) * 3600e3 && Date.now() - lm < 7 * 864e5 && h >= 9 && h <= 22 && !D.checks.some(x => x.cid === String(c.id) && Date.now() - x.at < 864e5); }
async function checkCall(c) {
    const h = Math.round((Date.now() - lastMe(c)) / 3600e3);
    const why = X.bailu() ? '你好久没说话了，我有点担心' : X.plain(await X.ask(`${X.who(c)}\n她已经 ${h} 个小时没跟你说话了。你打个电话过去确认她没事。写一句你打过去的理由（像真人心里想的，20 字以内）。只输出这一句。`) || '好久没听到你消息了，有点担心');
    D.checks.unshift({ id: 'ck' + Date.now().toString(36), cid: String(c.id), at: Date.now(), h, why }); D.checks = D.checks.slice(0, 40); await saveD();
    try { if (typeof window.gyCallRing === 'function') window.gyCallRing(c, why); } catch (e) {}
    return why;
}
// 统一受「📞 打电话」里的「允许 TA 主动打给我」管：那个关了，这里的「查岗电话」也不会自己打（你在面板上点的那次不受限）
const inviteOff = () => typeof window.gyCallInviteOn === 'function' && !window.gyCallInviteOn();
function tickCheck() { if (!on('check') || !X.on('gyxCallPlus.auto') || inviteOff()) return; if (document.getElementById('gyCallIncoming') && document.getElementById('gyCallIncoming').classList.contains('on')) return; const c = X.chars().filter(canCheck).sort((a, b) => lastAny(b) - lastAny(a))[0]; if (c) checkCall(c); }
/* ③ 没接：语音留言 */
async function scanMissed() {
    if (!on('vm') || typeof globalChats === 'undefined') return;
    for (const c of X.chars()) {
        const H = globalChats[c.id] || [], from = D.seen[c.id];
        if (from == null) { D.seen[c.id] = H.length ? H[H.length - 1].timestamp || Date.now() : Date.now(); continue; }
        const miss = H.find(m => m.callMissed && m.sender !== 'me' && (m.timestamp || 0) > from); D.seen[c.id] = Math.max(from, ...H.map(m => m.timestamp || 0));
        if (!miss) continue;
        const why = (H.slice(-6).reverse().find(m => m.gyxCallWhy) || {}).gyxCallWhy;
        const t = X.bailu() ? (X.cards(['想念', '情话', '聊天'], c, 1)[0] || '你在忙吧……没事，就是想听听你的声音。') : X.plain(await X.ask(`${X.who(c)}\n你刚给她打电话，她${why ? '挂了，说「' + why + '」' : '没接'}。你对着语音信箱留一段话（像真的留言：有停顿、口语，40~90 字）。只输出留言内容。`) || '');
        if (!t) continue;
        const v = { id: 'vm' + Date.now().toString(36), cid: String(c.id), at: Date.now(), t, sec: Math.max(6, Math.round(t.length / 4)) };
        D.vm.unshift(v); D.vm = D.vm.slice(0, 80);
        X.say(c, `📼 语音留言（${v.sec}″）：${t}`, { gyxVm: v.id });
        X.notify(c, `📼 ${X.esc(X.name(c))} ${X.v('给你留了一段语音', '在语音信箱里留了话', '留了言')}`, t.slice(0, 40), X.go('gyxCallPlusOpen', 'vm'));
    }
    await saveD();
}
window.gyxCallVmPlay = id => { const v = D.vm.find(x => x.id === id); if (!v) return; v.heard = Date.now(); saveD(); X.speak(X.char(v.cid), v.t); };
/* ④ 通话小结 */
function hookEnd() {
    const f = window.gyCallEnd; if (typeof f !== 'function' || f.__gyxCp) return;
    const w = async function () {
        let before = {}; try { X.chars().forEach(c => { before[c.id] = ((globalChats || {})[c.id] || []).length; }); } catch (e) {}
        const r = await f.apply(this, arguments);
        try {
            if (!on('sum')) return r;
            for (const c of X.chars()) { const H = globalChats[c.id] || []; if (H.length <= (before[c.id] || 0)) continue; const card = H.slice(before[c.id] || 0).find(m => m.viaCall && /电话里说了什么|：/.test(String(m.text || '')) && !m.callMissed); if (!card) continue;
                const body = X.plain(card.text).slice(0, 1500);
                const sum = X.bailu() ? body.split('\n')[0].slice(0, 30) : X.plain(await X.ask(`下面是一通电话的内容。用一句话（25 字以内）写这通电话聊了什么，像通话记录里的备注。只输出这一句。\n${body}`) || '');
                if (sum) { D.sums.unshift({ id: 'cs' + Date.now().toString(36), cid: String(c.id), at: Date.now(), sum }); D.sums = D.sums.slice(0, 120); card.gyxSum = sum; await saveD(); try { saveAllData(); } catch (e) {} }
            }
        } catch (e) {}
        return r;
    };
    Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__gyxCp = true; window.gyCallEnd = w;
}
/* 面板 */
window.gyxCallPlusSet = async (k, v) => { D.o[k] = v; await saveD(); };
window.gyxCallPlusReasons = async v => { D.reasons = String(v || '').split(/[\n,，]/).map(s => s.trim()).filter(Boolean).slice(0, 10); await saveD(); };
window.gyxCallPlusOpen = function (tab) {
    const T = tab || 'set', sw = (k, n) => `<label class="gyx-row" style="margin:4px 0"><input type="checkbox" ${D.o[k] !== false ? 'checked' : ''} onchange="gyxCallPlusSet('${k}',this.checked)"> ${n}</label>`;
    X.panel('gyxCallOv', '📞 来电', window.gyxCallTabs(T) + (T === 'set' ? `
        ${sw('why', '拒接时可以挑理由')}<textarea class="gyx-in" rows="2" onchange="gyxCallPlusReasons(this.value)">${X.esc(D.reasons.join('，'))}</textarea>
        ${sw('check', '很久没说话，TA 打电话来问')}<div class="gyx-row">超过 <input class="gyx-who" type="number" min="2" max="72" style="width:70px" value="${D.o.gap}" onchange="gyxCallPlusSet('gap',+this.value)"> 小时没说话（只在白天 9 点到晚上 10 点打，每人一天最多一次）</div>
        ${sw('vm', 'TA 打来你没接：留一段语音留言')}${sw('sum', '每通电话挂了以后留一行小结')}
        <div class="gyx-tip">「TA 打来问」也受插件开关中心里「TA 会自己做」管；另外，「📞 打电话」里关掉「允许 TA 主动打给我」的话，这里也不会自己打来。</div>` : T === 'vm' ? (D.vm.map(v => `<div class="gyx-card"><b>${X.esc(X.name(X.char(v.cid)))}</b> <span class="gyx-tip">${new Date(v.at).toLocaleString()} · ${v.sec}″${v.heard ? '' : ' · 没听'}</span><div>${X.esc(v.t)}</div><div class="gyx-row"><button class="gyx-btn lite" onclick="gyxCallVmPlay('${v.id}')">▶ 播放</button></div></div>`).join('') || '<div class="gyx-tip">还没有语音留言</div>')
        : (D.sums.map(s => `<div class="gyx-tip">📞 ${new Date(s.at).toLocaleString()} · ${X.esc(X.name(X.char(s.cid)))}：${X.esc(s.sum)}</div>`).join('') || '<div class="gyx-tip">还没有通话小结</div>')));
};
window.gyxCallPlusData = () => D;
window.gyxCallPlusScan = scanMissed;
window.gyxCallPlusCheck = id => checkCall(X.char(id) || X.cur());
X.ctx(id => { const s = D.sums.filter(x => x.cid === String(id)).slice(0, 3), v = D.vm.find(x => x.cid === String(id) && Date.now() - x.at < 864e5); return (s.length ? `【最近几通电话】${s.map(x => x.sum).join('；')}` : '') + (v ? `${s.length ? '\n' : ''}【你给她留过语音留言】${v.heard ? '她听了' : '她还没听'}` : ''); }, 'gyxCallPlus');
X.action({ key: 'gyx_call_check', label: '她很久没说话了，打个电话确认她没事', hint: '来电增强', need: c => on('check') && !inviteOff() && canCheck(c), run: async c => (await checkCall(c)) ? '打电话来问你还好吗' : null }, 'gyxCallPlus');
X.today(() => ({ title: '📞 电话', rows: D.sums.filter(x => X.day(new Date(x.at)) === X.day()).slice(0, 3).map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: X.esc(x.sum), go: "gyxCallPlusOpen('sum')" })).concat(D.vm.filter(x => X.day(new Date(x.at)) === X.day()).slice(0, 2).map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: '📼 留了言' + (x.heard ? '' : '（没听）'), go: "gyxCallPlusOpen('vm')" }))) }), 'gyxCallPlus');
X.widget('gyxCallPlusW', { n: '语音信箱', sizes: ['s', 'm'], tap: () => window.gyxCallPlusOpen('vm'), r: w => { const un = D.vm.filter(v => !v.heard), s = D.sums[0]; return X.gw(w, '📼', '语音信箱', [un.length ? un.length + ' 条没听' : '没有新留言', s ? '上一通：' + X.esc(s.sum) : '']); } }, 'gyxCallPlus');
X.memArr({ k: 'gyxCallSum', ico: '📞', n: '通话小结', d: '每通电话的一句话备注', arr: () => D.sums, field: 'sum', text: x => x.sum, save: saveD }, 'gyxCallPlus');
X.memArr({ k: 'gyxCallVm', ico: '📼', n: '语音留言', d: 'TA 打来你没接时留的话', arr: () => D.vm, field: 't', text: x => x.t, save: saveD }, 'gyxCallPlus');
X.css('gyxCpCss', `#gyCallIncoming .cp-why{position:relative;z-index:3;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:14px 10px 0}#gyCallIncoming .cp-why span{background:rgba(255,255,255,.18);backdrop-filter:blur(8px);color:#fff;font-size:12.5px;padding:6px 11px;border-radius:999px;cursor:pointer}#gyCallIncoming .cp-why .cp-t{background:none;padding:6px 2px;cursor:default;opacity:.8}`);
(async () => { D = Object.assign(D, await S.get('d', {})); D.o = Object.assign({ why: true, check: true, vm: true, sum: true, gap: 10 }, D.o); ['vm', 'sums', 'checks'].forEach(k => { D[k] = D[k] || []; }); D.seen = D.seen || {};
    setInterval(paintIncoming, 400); setInterval(() => { hookEnd(); scanMissed(); }, 4000); setInterval(tickCheck, 10 * 60e3); hookEnd(); })();

})();
X.mini({ id: 'gyxCall', icon: '📞', title: '来电', desc: '来电画面和铃声、拒接理由、TA 打来问、语音留言、通话小结', cat: '生活', onOpen: () => window.gyxCallOpen() });
