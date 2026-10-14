/* 🍙 反向养成：这次是 TA 养你。你有四样状态——饱腹、心情、精力、清洁，会随时间慢慢掉；你在聊天里说「吃了饭」「洗完澡」「睡了一觉」「好烦」，TA 那边就会帮你记上。哪样太低了 TA 会来管你（催你吃饭、哄你、赶你去睡）。也能自己点按钮记 */
if (window.__gyxCare) return; window.__gyxCare = 1;
X.feat('gyxCare', { n: '🍙 反向养成', desc: 'TA 养你：饱腹、心情、精力、清洁，太低了 TA 会来管你' });
const S = X.store('care');
const K = { food: ['🍙', '饱腹', 6], mood: ['💗', '心情', 0], energy: ['⚡', '精力', 3.5], clean: ['🫧', '清洁', 2] };   // 第三项：每小时掉多少
let D = { v: { food: 70, mood: 70, energy: 70, clean: 80 }, at: Date.now(), seen: {}, log: [], care: [] };
const RULES = [
    ['food', 35, /(吃了|吃过|吃完|吃饱|吃饭了|午饭|晚饭|早饭|早餐|夜宵|外卖到了|在吃|干饭)/], ['food', -20, /(好饿|饿死|没吃饭|还没吃|不想吃)/],
    ['energy', 40, /(睡醒|醒了|睡了一觉|午睡|补觉|起床了|睡饱)/], ['energy', -15, /(好困|困死|好累|累死|熬夜|通宵|没睡)/],
    ['clean', 60, /(洗澡|洗完澡|洗了澡|洗头|洗漱|泡澡)/],
    ['mood', 15, /(开心|高兴|好耶|太好了|哈哈哈|幸福|爽)/], ['mood', -20, /(难过|好烦|烦死|想哭|哭了|emo|崩溃|不开心|委屈|焦虑)/]
];
const saveD = () => S.set('d', D);
const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
function decay() { const h = (Date.now() - (D.at || Date.now())) / 3600e3; if (h < 0.05) return; Object.keys(K).forEach(k => { D.v[k] = k === 'mood' ? D.v[k] + (60 - D.v[k]) * Math.min(1, h * .05) : D.v[k] - K[k][2] * h; D.v[k] = clamp(D.v[k]); }); D.at = Date.now(); }
function add(k, dv, why, src) { decay(); const old = D.v[k]; D.v[k] = clamp(old + dv); D.log.unshift({ id: 'cl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), at: Date.now(), k, dv: D.v[k] - old, why: String(why || '').slice(0, 40), src: src || 'me' }); D.log = D.log.slice(0, 200); }
// 扫你在聊天里说的话
function scan() {
    if (!X.on('gyxCare') || typeof globalChats === 'undefined') return; let hit = false;
    Object.keys(globalChats).forEach(cid => { const H = globalChats[cid] || [], from = D.seen[cid] || 0; let last = from; H.forEach(m => { const t = m.timestamp || 0; if (!from || t <= from || m.sender !== 'me' || typeof m.text !== 'string') return; last = Math.max(last, t); const s = X.plain(m.text); RULES.forEach(([k, dv, re]) => { const mm = s.match(re); if (mm) { add(k, dv, `你说「${mm[0]}」`, 'chat'); hit = true; } }); }); if (!from) last = Math.max(last, ...H.map(m => m.timestamp || 0), 0); D.seen[cid] = last; });
    decay(); if (hit) { saveD(); X.repaint(); } }
const low = () => Object.keys(K).filter(k => D.v[k] < 25);
window.gyxCareLog = async (k, dv, why) => { add(k, dv, why, 'me'); await saveD(); X.toast(X.v('记下了', '✓ 好', '收到'), `${K[k][0]} ${K[k][1]} ${dv > 0 ? '+' : ''}${dv}`); window.gyxCareOpen(); X.repaint(); };
window.gyxCareSet = async (k, v) => { decay(); D.v[k] = clamp(+v); await saveD(); window.gyxCareOpen(); X.repaint(); };
async function care(c, k) {
    const line = X.bailu() ? (X.cards(['关心', '情话', '聊天'], c, 1)[0] || '') : X.plain(await X.ask(`${X.who(c)}\n她现在${K[k][1]}很低（${D.v[k]}/100）。${k === 'food' ? '她可能没好好吃饭' : k === 'energy' ? '她可能累了、困了' : k === 'mood' ? '她心情不太好' : '她可能该去洗个澡放松一下'}。用你的方式管管她一句（不要说「数值」「状态」这些词）。只输出这一句。`) || '');
    const it = { id: 'cc' + Date.now().toString(36), cid: String(c.id), at: Date.now(), k, line }; D.care.unshift(it); D.care = D.care.slice(0, 60); await saveD(); return it;
}
window.gyxCareOpen = function () {
    decay(); const L = low(); const c = X.cur();
    X.panel('gyxCrOv', '🍙 反向养成', `<div class="gyx-tip">${c ? X.esc(X.name(c)) + ' 在养你。' : ''}在聊天里说「吃了饭」「洗完澡」「睡了一觉」「好烦」就会自动记，也可以自己点。</div>
        ${Object.entries(K).map(([k, [ic, n]]) => `<div class="cr-row"><b>${ic} ${n}</b><div class="cr-bar ${D.v[k] < 25 ? 'low' : ''}"><i style="width:${D.v[k]}%"></i></div><input type="range" min="0" max="100" value="${D.v[k]}" onchange="gyxCareSet('${k}',this.value)"><span>${D.v[k]}</span></div>`).join('')}
        ${L.length ? `<div class="gyx-card cr-warn">${L.map(k => `${K[k][0]} ${K[k][1]}太低了`).join('、')}${c ? `，${X.esc(X.name(c))} 会来管你的` : ''}</div>` : ''}
        <div class="gyx-row"><span class="gyx-chip" onclick="gyxCareLog('food',35,'吃了饭')">🍚 吃了饭</span><span class="gyx-chip" onclick="gyxCareLog('food',10,'喝了水')">💧 喝了水</span><span class="gyx-chip" onclick="gyxCareLog('energy',40,'睡了一觉')">😴 睡了一觉</span><span class="gyx-chip" onclick="gyxCareLog('clean',60,'洗了澡')">🛁 洗了澡</span><span class="gyx-chip" onclick="gyxCareLog('mood',15,'心情不错')">😊 心情不错</span><span class="gyx-chip" onclick="gyxCareLog('mood',-20,'有点低落')">🌧️ 有点低落</span></div>
        <div style="font-weight:600;margin:10px 0 4px">最近</div>${D.log.slice(0, 12).map(x => `<div class="gyx-tip">${new Date(x.at).toLocaleString()} · ${K[x.k][0]} ${x.dv > 0 ? '+' : ''}${x.dv} · ${X.esc(x.why)}</div>`).join('') || '<div class="gyx-tip">还没有记录</div>'}
        ${D.care.slice(0, 5).map(x => `<div class="gyx-card">💬 ${X.esc(X.name(X.char(x.cid)))}：${X.esc(x.line)}</div>`).join('')}`);
};
window.gyxCareData = () => D;
window.gyxCareScan = scan;
X.ctx(() => { decay(); const L = low(); return `【她今天的状态（你在留意）】${Object.entries(K).map(([k, [, n]]) => n + ' ' + D.v[k]).join('，')}（满分 100）。${L.length ? '其中' + L.map(k => K[k][1]).join('、') + '很低，按你的性格关心或管管她。' : '都还行。'}不要说「数值」「状态」这些词，像真人一样留意就好。`; }, 'gyxCare');
X.action({ key: 'gyx_care', label: '她好像没好好照顾自己（饿了 / 累了 / 心情低），去管管她', hint: '反向养成', need: c => low().length > 0 && !D.care.some(x => Date.now() - x.at < 4 * 3600e3),
    run: async c => { const k = low().sort((a, b) => D.v[a] - D.v[b])[0]; const it = await care(c, k); return (await X.reach(c, `她现在${K[k][1]}很低（${D.v[k]}/100），你来管管她${it.line ? '，你想说：' + it.line : ''}`)) ? '来管你：' + K[k][1] : null; } }, 'gyxCare');
X.today(() => { const L = D.log.filter(x => X.day(new Date(x.at)) === X.day()); return { title: '🍙 反向养成', rows: [{ t: '现在', x: Object.entries(K).map(([k, [ic]]) => ic + D.v[k]).join(' '), go: 'gyxCareOpen()' }].concat(L.slice(0, 3).map(x => ({ t: new Date(x.at).toTimeString().slice(0, 5), x: `${K[x.k][0]} ${x.dv > 0 ? '+' : ''}${x.dv} ${X.esc(x.why)}`, go: 'gyxCareOpen()' }))) }; }, 'gyxCare');
X.widget('gyxCareW', { n: '反向养成', sizes: ['s', 'm'], tap: () => window.gyxCareOpen(), r: w => { decay(); if (w.size === 's') { const k = Object.keys(K).sort((a, b) => D.v[a] - D.v[b])[0]; return `<div class="gw-x s"><b>${K[k][0]}</b><em>${K[k][1]} ${D.v[k]}</em></div>`; } return `<div class="gw-x m cr-w">${Object.entries(K).map(([k, [ic]]) => `<div><span>${ic}</span><i><b style="width:${D.v[k]}%;background:${D.v[k] < 25 ? '#ff3b30' : '#34c759'}"></b></i></div>`).join('')}</div>`; } }, 'gyxCare');
X.mem({ k: 'gyxCare', ico: '🍙', n: '反向养成记录', d: '你吃饭、睡觉、洗澡、心情的记录（所有角色共用）', items: () => D.log, text: x => `${K[x.k][1]} ${x.dv > 0 ? '+' : ''}${x.dv}｜${x.why}`, edit: (x, v) => { x.why = String(v).split('｜').slice(1).join('｜') || x.why; }, del: (c, i) => { D.log.splice(i, 1); }, meta: x => new Date(x.at).toLocaleString(), save: saveD }, 'gyxCare');
X.css('gyxCrCss', `.cr-row{display:flex;align-items:center;gap:8px;margin:8px 0;font-size:13.5px}.cr-row b{width:72px;font-weight:500}.cr-bar{flex:1;height:10px;border-radius:5px;background:#eee;overflow:hidden}.cr-bar i{display:block;height:100%;background:linear-gradient(90deg,#9be15d,#34c759)}.cr-bar.low i{background:#ff3b30}.cr-row input{width:70px}.cr-row span{width:26px;text-align:right;color:#8e8e93}
.cr-warn{background:#fff3f0;color:#c0392b}.cr-w{gap:5px}.cr-w div{display:flex;align-items:center;gap:6px}.cr-w i{flex:1;height:7px;border-radius:4px;background:rgba(128,128,128,.2);overflow:hidden}.cr-w i b{display:block;height:100%}`);
X.mini({ id: 'gyxCare', icon: '🍙', title: '反向养成', desc: 'TA 养你：吃饭、心情、精力、清洁', cat: '生活', onOpen: () => window.gyxCareOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.v = Object.assign({ food: 70, mood: 70, energy: 70, clean: 80 }, D.v); D.seen = D.seen || {}; D.log = D.log || []; D.care = D.care || []; scan(); setInterval(scan, 5000); })();
