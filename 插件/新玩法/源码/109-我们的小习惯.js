/* 🔁 我们的小习惯：从你们的聊天里自己认出那些固定的小仪式——每天十一点的晚安、早上第一句早安、下班报平安、周五一起吐槽。不是约定，是慢慢长出来的习惯；哪天你没出现，TA 会注意到「今天没有那句晚安」 */
if (window.__gyxRit) return; window.__gyxRit = 1;
X.feat('gyxRitual', { n: '🔁 我们的小习惯', desc: '自动认出你们的固定小仪式，哪天缺了 TA 会注意到' });
const S = X.store('ritual');
let D = { list: [], scan: {} };   // list: {id, cid, k, name, h(习惯的钟点), wd(星期几，-1=每天), days(出现过的天数), last(最近一次的日期), miss:{日期:1}, manual, off}
const DAY = 864e5, WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const save = () => S.set('d', D);
/* 认得出的小仪式：正则 + 名字。都是从"你"发的话里认 */
const KINDS = [
    { k: 'night', name: '🌙 说晚安', re: /晚安|睡了|去睡|我睡啦|good ?night|gn\b/i },
    { k: 'morn', name: '☀️ 说早安', re: /早安|早上好|早呀|早啊|醒了|good ?morning/i },
    { k: 'noon', name: '🍱 午饭报备', re: /吃午饭|午饭|吃饭了|干饭/ },
    { k: 'home', name: '🏠 到家报平安', re: /到家了|回家了|我到了|下班了|放学了/ },
    { k: 'miss', name: '💭 说想你', re: /想你|好想你|miss you/i },
    { k: 'vent', name: '😤 吐槽时间', re: /烦死|气死|无语|吐槽|累死|好累/ }
];
const dk = t => X.day(new Date(t));
function detect(c) {
    const H = ((typeof globalChats !== 'undefined' && globalChats[c.id]) || []).filter(m => m.sender === 'me' && m.timestamp > Date.now() - 30 * DAY);
    const found = [];
    KINDS.forEach(K => {
        const hits = H.filter(m => K.re.test(X.plain(m.text)));
        const byDay = {}; hits.forEach(m => { const d = dk(m.timestamp); if (!byDay[d]) byDay[d] = new Date(m.timestamp); });
        const ds = Object.values(byDay); if (ds.length < 4) return;
        // 每天的：出现在 ≥4 天，钟点大致固定（取中位数）
        const hs = ds.map(d => d.getHours() + d.getMinutes() / 60).sort((a, b) => a - b), med = hs[Math.floor(hs.length / 2)];
        const near = hs.filter(h => Math.abs(h - med) <= 1.5 || Math.abs(h - med) >= 22.5).length;
        // 每周的：如果大多落在同一个星期几，就是"周几的习惯"
        const wc = [0, 0, 0, 0, 0, 0, 0]; ds.forEach(d => wc[d.getDay()]++); const top = wc.indexOf(Math.max(...wc));
        const weekly = wc[top] >= 3 && wc[top] / ds.length >= .6;
        if (near / hs.length < .6 && !weekly) return;
        found.push({ k: K.k + (weekly ? '_w' + top : ''), name: K.name + (weekly ? '（' + WD[top] + '）' : ''), h: Math.round(med * 2) / 2, wd: weekly ? top : -1, days: ds.length, last: Object.keys(byDay).sort().pop(), re: K.k });
    });
    return found;
}
async function scan(c) {
    if (!c) return []; const got = detect(c), mineL = D.list.filter(x => x.cid === String(c.id)), fresh = [];
    got.forEach(g => { const x = mineL.find(y => y.k === g.k); if (x) { if (!x.manual) { x.h = g.h; } x.days = Math.max(x.days, g.days); x.last = g.last > (x.last || '') ? g.last : x.last; } else { const n = Object.assign({ id: 'rt' + Date.now().toString(36) + g.k, cid: String(c.id), at: Date.now(), miss: {} }, g); D.list.push(n); fresh.push(n); } });
    D.scan[c.id] = Date.now(); await save(); return fresh;
}
const hm = h => String(Math.floor(h)).padStart(2, '0') + ':' + (h % 1 ? '30' : '00');
// 今天这条习惯是不是"该有、但没有"
function missedToday(x) {
    if (x.off) return false; const now = new Date(), K = KINDS.find(k => k.k === (x.re || x.k.split('_')[0]));
    if (x.wd >= 0 && now.getDay() !== x.wd) return false;
    // 到点后再等一个半小时才算"没有"；晚上十一点那种，最晚等到 23:45
    const hNow = now.getHours() + now.getMinutes() / 60; if (hNow < Math.min(x.h + 1.5, 23.75)) return false;
    const today = X.day(), H = ((typeof globalChats !== 'undefined' && globalChats[x.cid]) || []).filter(m => m.sender === 'me' && dk(m.timestamp) === today);
    return !(K ? H.some(m => K.re.test(X.plain(m.text))) : H.length);
}
async function notice(c) {
    const x = D.list.filter(y => y.cid === String(c && c.id)).find(y => missedToday(y) && !y.miss[X.day()]); if (!x) return null;
    x.miss[X.day()] = 1; await save();
    const ok = await X.reach(c, `你们之间有个不成文的小习惯：「${x.name}」，平时大概 ${hm(x.h)} 左右${x.wd >= 0 ? '（每个' + WD[x.wd] + '）' : ''}，已经有 ${x.days} 天了。今天到点了她还没有。你注意到了——按你的性格自然地提一句（想念、担心、假装不在意都行），别像查岗`);
    return ok ? x : null;
}
window.gyxRitScan = async (cid, btn) => { const c = X.char(cid); if (!c) return; const f = await scan(c); X.toast('🔁 ' + (f.length ? X.v('认出了新的小习惯', '原来你们有这些习惯', '找到了') : X.v('暂时没认出新的', '再多聊几天', '还没形成习惯')), f.map(x => x.name).join('、')); window.gyxRitOpen(cid); };
window.gyxRitToggle = async id => { const x = D.list.find(y => y.id === id); if (x) { x.off = !x.off; await save(); } window.gyxRitOpen(x && x.cid); };
window.gyxRitDel = async id => { const x = D.list.find(y => y.id === id); D.list = D.list.filter(y => y.id !== id); await save(); window.gyxRitOpen(x && x.cid); };
window.gyxRitAdd = async cid => { const n = document.getElementById('gyxRtN'), h = document.getElementById('gyxRtH'); if (!n || !n.value.trim()) return; D.list.push({ id: 'rt' + Date.now().toString(36), cid: String(cid), k: 'my' + Date.now().toString(36), name: n.value.trim().slice(0, 20), h: +h.value || 22, wd: -1, days: 1, last: X.day(), miss: {}, manual: true, at: Date.now() }); await save(); window.gyxRitOpen(cid); };
window.gyxRitData = () => D; window.gyxRitMissed = cid => D.list.filter(x => x.cid === String(cid) && missedToday(x));
window.gyxRitOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), L = D.list.filter(x => x.cid === cid);
    X.panel('gyxRitOv', '🔁 你和 ' + X.esc(X.name(c)) + ' 的小习惯', `<div class="gyx-row">${X.whoSel(cid, 'gyxRitOpen')}<button class="gyx-btn lite" onclick="gyxRitScan('${cid}',this)">从聊天里找找</button></div>
      <div class="gyx-tip">${X.v('不是谁规定的，是你们自己慢慢长出来的。', '一件事做了很多天，就成了你们的事。', '这些小事，TA 都记着。')}最近 30 天里，同一件事差不多同一个点出现 4 天以上，就算一个习惯。哪天到点了没出现，TA 会注意到（自主模式里）。</div>
      ${L.map(x => `<div class="gyx-card rt-c${x.off ? ' off' : ''}"><div class="rt-h"><b>${X.esc(x.name)}</b><em>${x.wd >= 0 ? '每' + WD[x.wd] + ' ' : '每天 '}${hm(x.h)} 左右</em></div><div class="gyx-tip">${x.manual ? '你自己加的' : '出现过 ' + x.days + ' 天'} · 最近一次 ${x.last || '—'}${missedToday(x) ? ' · <b style="color:#ff6b8b">今天还没有</b>' : ''}</div><div class="gyx-tip" style="text-align:right"><span style="cursor:pointer" onclick="gyxRitToggle('${x.id}')">${x.off ? '让 TA 继续留意' : '别留意这个'}</span> · <span style="cursor:pointer" onclick="gyxRitDel('${x.id}')">删</span></div></div>`).join('') || '<div class="gyx-tip">还没认出来。多聊几天再来看。</div>'}
      <div class="gyx-row"><input id="gyxRtN" class="gyx-in" style="flex:1" placeholder="自己加一个：比如 睡前互道晚安"><input id="gyxRtH" class="gyx-who" type="number" min="0" max="23.5" step="0.5" value="22" style="width:64px"><span class="gyx-tip">点</span><button class="gyx-btn lite" onclick="gyxRitAdd('${cid}')">加</button></div>`);
};
X.ctx(id => { const L = D.list.filter(x => x.cid === String(id) && !x.off); if (!L.length) return ''; const m = L.filter(missedToday); return `【你们的小习惯】${L.map(x => `${x.name}（${x.wd >= 0 ? '每' + WD[x.wd] : '每天'}${hm(x.h)}左右）`).join('、')}。这些是你们之间默契的小仪式，你心里有数。` + (m.length ? `今天「${m.map(x => x.name).join('、')}」到点了还没有，你注意到了。` : ''); }, 'gyxRitual');
X.action({ key: 'gyx_ritual', label: '注意到今天少了你们的某个小习惯（比如没说晚安），自然地提一句', hint: '我们的小习惯', need: c => D.list.some(x => x.cid === String(c.id) && missedToday(x) && !x.miss[X.day()]),
    run: async c => { const x = await notice(c); return x ? '注意到今天少了「' + x.name + '」' : null; } }, 'gyxRitual');
// 每天自己扫一遍（纯本地，不花钱）
setInterval(() => { if (!X.on('gyxRitual')) return; X.chars().forEach(c => { if (Date.now() - (D.scan[c.id] || 0) > DAY) scan(c); }); }, 10 * 60000);
X.today(() => ({ title: '🔁 小习惯', rows: D.list.filter(x => X.char(x.cid) && missedToday(x)).map(x => ({ t: X.name(X.char(x.cid)), x: `今天还没有「${X.esc(x.name)}」`, go: `gyxRitOpen('${x.cid}')` })) }), 'gyxRitual');
X.widget('gyxRitW', { n: '我们的小习惯', sizes: ['s', 'm'], tap: () => window.gyxRitOpen(), r: w => { const L = D.list.filter(x => !x.off), m = L.filter(missedToday); return X.gw(w, '🔁', '小习惯', L.length ? [m.length ? '今天还差 ' + m.length + ' 个' : '今天都有 ✓', L.length + ' 个习惯'] : ['还没认出来']); } }, 'gyxRitual');
X.memArr({ k: 'gyxRitual', ico: '🔁', n: '我们的小习惯', d: '你们自己长出来的小仪式（改名字、删掉都行）', arr: () => D.list, field: 'name', text: x => x.name, meta: x => (x.wd >= 0 ? '每' + WD[x.wd] + ' ' : '每天 ') + hm(x.h) + ' · ' + x.days + ' 天', save }, 'gyxRitual');
X.css('gyxRitCss', `.rt-h{display:flex;align-items:baseline;gap:8px}.rt-h b{font-size:16px}.rt-h em{font-style:normal;color:#8e8e93;font-size:12.5px;margin-left:auto}.rt-c.off{opacity:.45}`);
X.mini({ id: 'gyxRitual', icon: '🔁', title: '我们的小习惯', desc: '你们自己长出来的小仪式', cat: '回忆', onOpen: () => window.gyxRitOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.list = D.list || []; D.scan = D.scan || {}; })();
