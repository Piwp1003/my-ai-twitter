/* 📞 来电增强：① 拒接时可以挑个理由（在开会 / 在洗澡 / 等下打给你……），TA 会知道你为什么挂；② 你很久没说话，TA 会打电话来问你还好吗；③ TA 打来你没接，TA 会留一段语音留言；④ 每通电话挂了以后留一行小结。四样都能单独关 */
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
function tickCheck() { if (!on('check') || !X.on('gyxCallPlus.auto')) return; if (document.getElementById('gyCallIncoming') && document.getElementById('gyCallIncoming').classList.contains('on')) return; const c = X.chars().filter(canCheck).sort((a, b) => lastAny(b) - lastAny(a))[0]; if (c) checkCall(c); }
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
    X.panel('gyxCpOv', '📞 来电增强', `<div class="gyx-row">${[['set', '设置'], ['vm', '语音留言'], ['sum', '通话小结']].map(([k, n]) => `<span class="gyx-chip ${T === k ? 'on' : ''}" onclick="gyxCallPlusOpen('${k}')">${n}</span>`).join('')}</div>` + (T === 'set' ? `
        ${sw('why', '拒接时可以挑理由')}<textarea class="gyx-in" rows="2" onchange="gyxCallPlusReasons(this.value)">${X.esc(D.reasons.join('，'))}</textarea>
        ${sw('check', '很久没说话，TA 打电话来问')}<div class="gyx-row">超过 <input class="gyx-who" type="number" min="2" max="72" style="width:70px" value="${D.o.gap}" onchange="gyxCallPlusSet('gap',+this.value)"> 小时没说话（只在白天 9 点到晚上 10 点打，每人一天最多一次）</div>
        ${sw('vm', 'TA 打来你没接：留一段语音留言')}${sw('sum', '每通电话挂了以后留一行小结')}
        <div class="gyx-tip">「TA 打来问」也受插件开关中心里「TA 会自己做」管。</div>` : T === 'vm' ? (D.vm.map(v => `<div class="gyx-card"><b>${X.esc(X.name(X.char(v.cid)))}</b> <span class="gyx-tip">${new Date(v.at).toLocaleString()} · ${v.sec}″${v.heard ? '' : ' · 没听'}</span><div>${X.esc(v.t)}</div><div class="gyx-row"><button class="gyx-btn lite" onclick="gyxCallVmPlay('${v.id}')">▶ 播放</button></div></div>`).join('') || '<div class="gyx-tip">还没有语音留言</div>')
        : (D.sums.map(s => `<div class="gyx-tip">📞 ${new Date(s.at).toLocaleString()} · ${X.esc(X.name(X.char(s.cid)))}：${X.esc(s.sum)}</div>`).join('') || '<div class="gyx-tip">还没有通话小结</div>')));
};
window.gyxCallPlusData = () => D;
window.gyxCallPlusScan = scanMissed;
window.gyxCallPlusCheck = id => checkCall(X.char(id) || X.cur());
X.ctx(id => { const s = D.sums.filter(x => x.cid === String(id)).slice(0, 3), v = D.vm.find(x => x.cid === String(id) && Date.now() - x.at < 864e5); return (s.length ? `【最近几通电话】${s.map(x => x.sum).join('；')}` : '') + (v ? `${s.length ? '\n' : ''}【你给她留过语音留言】${v.heard ? '她听了' : '她还没听'}` : ''); }, 'gyxCallPlus');
X.action({ key: 'gyx_call_check', label: '她很久没说话了，打个电话确认她没事', hint: '来电增强', need: c => on('check') && canCheck(c), run: async c => (await checkCall(c)) ? '打电话来问你还好吗' : null }, 'gyxCallPlus');
X.today(() => ({ title: '📞 电话', rows: D.sums.filter(x => X.day(new Date(x.at)) === X.day()).slice(0, 3).map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: X.esc(x.sum), go: "gyxCallPlusOpen('sum')" })).concat(D.vm.filter(x => X.day(new Date(x.at)) === X.day()).slice(0, 2).map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: '📼 留了言' + (x.heard ? '' : '（没听）'), go: "gyxCallPlusOpen('vm')" }))) }), 'gyxCallPlus');
X.widget('gyxCallPlusW', { n: '语音信箱', sizes: ['s', 'm'], tap: () => window.gyxCallPlusOpen('vm'), r: w => { const un = D.vm.filter(v => !v.heard), s = D.sums[0]; return X.gw(w, '📼', '语音信箱', [un.length ? un.length + ' 条没听' : '没有新留言', s ? '上一通：' + X.esc(s.sum) : '']); } }, 'gyxCallPlus');
X.memArr({ k: 'gyxCallSum', ico: '📞', n: '通话小结', d: '每通电话的一句话备注', arr: () => D.sums, field: 'sum', text: x => x.sum, save: saveD }, 'gyxCallPlus');
X.memArr({ k: 'gyxCallVm', ico: '📼', n: '语音留言', d: 'TA 打来你没接时留的话', arr: () => D.vm, field: 't', text: x => x.t, save: saveD }, 'gyxCallPlus');
X.css('gyxCpCss', `#gyCallIncoming .cp-why{position:relative;z-index:3;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:14px 10px 0}#gyCallIncoming .cp-why span{background:rgba(255,255,255,.18);backdrop-filter:blur(8px);color:#fff;font-size:12.5px;padding:6px 11px;border-radius:999px;cursor:pointer}#gyCallIncoming .cp-why .cp-t{background:none;padding:6px 2px;cursor:default;opacity:.8}`);
X.mini({ id: 'gyxCallPlus', icon: '📞', title: '来电增强', desc: '拒接理由、查岗电话、语音留言、通话小结', cat: '生活', onOpen: () => window.gyxCallPlusOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.o = Object.assign({ why: true, check: true, vm: true, sum: true, gap: 10 }, D.o); ['vm', 'sums', 'checks'].forEach(k => { D[k] = D[k] || []; }); D.seen = D.seen || {};
    setInterval(paintIncoming, 400); setInterval(() => { hookEnd(); scanMissed(); }, 4000); setInterval(tickCheck, 10 * 60e3); hookEnd(); })();
