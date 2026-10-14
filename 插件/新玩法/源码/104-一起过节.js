/* 🏮 一起过节：农历节日自动算（除夕、春节、元宵、端午、七夕、中秋、重阳、腊八——用浏览器自带的农历，不用每年手填），快到了 TA 会惦记，当天有一页节日：TA 写的节日卡，加一个小活动——春节互发红包、元宵猜灯谜、端午挑粽子、七夕交换情话、中秋写愿望、重阳登高、腊八熬粥 */
if (window.__gyxFest) return; window.__gyxFest = 1;
X.feat('gyxFest', { n: '🏮 一起过节', desc: '农历节日自动算；节日当天 TA 写节日卡，还有一个小活动' });
const S = X.store('fest');
const FEST = [
    { k: 'chuxi', n: '除夕', ico: '🧨', m: 1, d: 0, act: 'red', fx: '🧨', tip: '一起守岁、互发红包' },
    { k: 'chunjie', n: '春节', ico: '🧧', m: 1, d: 1, act: 'red', fx: '🧧', tip: '拜年、发红包' },
    { k: 'yuanxiao', n: '元宵', ico: '🏮', m: 1, d: 15, act: 'riddle', fx: '🏮', tip: '猜灯谜、吃汤圆' },
    { k: 'duanwu', n: '端午', ico: '🐉', m: 5, d: 5, act: 'pick', fx: '🎋', tip: '挑一个粽子', opts: ['蛋黄肉粽', '红豆甜粽', '碱水粽蘸白糖', '板栗鲜肉粽', '蜜枣粽'] },
    { k: 'qixi', n: '七夕', ico: '🌌', m: 7, d: 7, act: 'wish', fx: '✨', tip: '交换一句情话', ask: '写一句只给 TA 的情话' },
    { k: 'zhongqiu', n: '中秋', ico: '🥮', m: 8, d: 15, act: 'wish', fx: '🌕', tip: '赏月、写个愿望', ask: '对着月亮许个愿' },
    { k: 'chongyang', n: '重阳', ico: '🍂', m: 9, d: 9, act: 'pick', fx: '🍂', tip: '登高、插茱萸', opts: ['去爬山', '喝一壶菊花茶', '给家里长辈打个电话', '吃重阳糕'] },
    { k: 'laba', n: '腊八', ico: '🥣', m: 12, d: 8, act: 'pick', fx: '❄️', tip: '熬一锅腊八粥', opts: ['多放红枣', '多放桂圆', '加莲子', '加花生', '少放糖'] }
];
const RIDDLES = [['一口咬掉牛尾巴', '告'], ['十五天', '胖'], ['半边生鳞不生角，半边生角不生鳞', '鲜'], ['一人一张口，口下长只手', '拿'], ['有心走不快，见水装不完', '曼'], ['两个月亮', '朋'], ['千里相逢', '重'], ['一边是红，一边是绿，一边怕风，一边怕雨', '秋']];
let D = { by: {}, sent: {} };   // by[cid][key-year] = {card, mine, ta, done, at}；sent[cid] = 'key-year'
const saveD = () => S.set('d', D);
const pad = n => String(n).padStart(2, '0');
const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
let fmt = null; try { fmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'numeric', day: 'numeric' }); } catch (e) {}
// 校对表：浏览器自带的农历（ICU）在新月贴着半夜的年份会差一天（比如 2027 年春节它算成 2/7，实际是 2/6），这几年以表为准
const TABLE = {
    chuxi: ['2026-02-16', '2027-02-05', '2028-01-25', '2029-02-12', '2030-02-02'], chunjie: ['2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03'],
    yuanxiao: ['2026-03-03', '2027-02-20', '2028-02-09', '2029-02-27', '2030-02-17'], duanwu: ['2026-06-19', '2027-06-09', '2028-05-28', '2029-06-16', '2030-06-05'],
    qixi: ['2026-08-19', '2027-08-08', '2028-08-26', '2029-08-16', '2030-08-05'], zhongqiu: ['2026-09-25', '2027-09-15', '2028-10-03', '2029-09-22', '2030-09-12'],
    chongyang: ['2026-10-18', '2027-10-08', '2028-10-26', '2029-10-16', '2030-10-05'], laba: ['2026-01-26', '2027-01-15']
};
function lunar(d) { if (!fmt) return null; try { const p = fmt.formatToParts(d); const m = +(p.find(x => x.type === 'month') || {}).value, dd = +(p.find(x => x.type === 'day') || {}).value; return m && dd ? [m, dd] : null; } catch (e) { return null; } }
// 接下来一年里每个节日是哪天
let CACHE = null, CK = '';
function upcoming() {
    if (CK === key(new Date()) && CACHE) return CACHE; const out = [], t0 = new Date(); t0.setHours(12, 0, 0, 0);
    if (fmt && lunar(t0)) {
        for (let i = -1; i < 400; i++) { const d = new Date(t0); d.setDate(t0.getDate() + i); const l = lunar(d); if (!l) continue;
            FEST.forEach(f => { if (f.d && l[0] === f.m && l[1] === f.d) out.push({ f, date: key(d) }); });
            const nx = new Date(d); nx.setDate(d.getDate() + 1); const ln = lunar(nx); if (ln && ln[0] === 1 && ln[1] === 1 && !(l[0] === 1)) out.push({ f: FEST[0], date: key(d) }); }
    }
    // 表里有的年份以表为准
    FEST.forEach(f => { const T = TABLE[f.k] || []; const ys = new Set(T.map(d => d.slice(0, 4))); for (let i = out.length - 1; i >= 0; i--) if (out[i].f.k === f.k && ys.has(out[i].date.slice(0, 4))) out.splice(i, 1); T.forEach(date => out.push({ f, date })); });
    const today = key(new Date());
    CACHE = out.filter(x => x.date >= today).sort((a, b) => a.date < b.date ? -1 : 1).filter((x, i, A) => A.findIndex(y => y.f.k === x.f.k && y.date === x.date) === i); CK = today; return CACHE;
}
const todayFest = () => upcoming().find(x => x.date === key(new Date()));
const daysTo = date => { const [y, m, d] = date.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5); };
const rec = (cid, f, date) => { const c = String(cid), k = f.k + '-' + date.slice(0, 4); D.by[c] = D.by[c] || {}; return (D.by[c][k] = D.by[c][k] || { k: f.k, date }); };
async function card(c, f, date) {
    const r = rec(c.id, f, date); if (r.card) return r;
    r.card = X.plain(X.bailu() ? (X.cards(['节日', '情话', '聊天'], c, 1)[0] || `${f.n}快乐。`) : (await X.ask(`${X.who(c)}\n今天是${f.n}。给她写一张${f.n}的节日卡片（40~90 字，带一点这个节日的习俗和你们自己的事，不要套话）。只输出卡片正文。`)) || `${f.n}快乐，今年也想和你一起过。`);
    r.at = Date.now(); await saveD(); return r;
}
window.gyxFestDo = async (cid, k, date, v) => {
    const c = X.char(cid), f = FEST.find(x => x.k === k); if (!c || !f) return; const r = rec(cid, f, date);
    if (f.act === 'red') { const amt = +v || 8.88; try { if (window.gyWallet && window.gyWallet.send) await window.gyWallet.send({ from: 'me', to: cid, amt, note: f.n + '快乐', kind: 'red' }); } catch (e) {} r.mine = '发了 ¥' + amt + ' 红包'; r.ta = X.plain(X.bailu() ? '' : await X.ask(`${X.who(c)}\n${f.n}，她给你发了 ${amt} 元红包。回她一句，再说你也给她发了一个。`) || ''); try { if (window.gyWallet && window.gyWallet.send) await window.gyWallet.send({ from: cid, to: 'me', amt: Math.round((amt * 1.5 + 6) * 100) / 100, note: '给你的' + f.n + '红包', kind: 'red' }); } catch (e) {} }
    else if (f.act === 'riddle') { const q = RIDDLES[(r.ri = r.ri != null ? r.ri : Math.floor(Math.random() * RIDDLES.length))]; const ok = String(v || '').trim() === q[1]; r.mine = `猜「${q[0]}」：${v}${ok ? ' ✓' : ' ✗（谜底：' + q[1] + '）'}`; r.ta = X.plain(X.bailu() ? (ok ? '猜对了，奖励一个汤圆。' : '差一点，再给你一个提示也没用了。') : await X.ask(`${X.who(c)}\n元宵节你们在猜灯谜，谜面「${q[0]}」打一字，谜底是「${q[1]}」。她猜「${v}」，${ok ? '猜对了' : '猜错了'}。说一句（逗她 / 夸她）。`) || ''); }
    else if (f.act === 'pick') { r.mine = String(v || ''); r.ta = X.plain(X.bailu() ? '' : await X.ask(`${X.who(c)}\n今天${f.n}，她选了「${v}」（${f.tip}）。你也选一个，说一两句。`) || ''); }
    else { const t = ((document.getElementById('gyxFeIn') || {}).value || '').trim(); if (!t) return; r.mine = t; r.ta = X.plain(X.bailu() ? (X.cards(['情话'], c, 1)[0] || '') : await X.ask(`${X.who(c)}\n今天${f.n}，她${f.k === 'qixi' ? '写给你一句情话' : '对着月亮许了个愿'}：「${t}」。你也${f.k === 'qixi' ? '回她一句情话' : '许一个愿，说给她听'}（30 字以内）。`) || ''); }
    r.done = Date.now(); await saveD(); window.gyxFestOpen(cid);
};
window.gyxFestOpen = async function (who) {
    const c = X.char(who) || X.cur(); const cid = c ? String(c.id) : ''; const L = upcoming(), tf = todayFest();
    let today = '';
    if (tf && c) {
        X.panel('gyxFeOv', '🏮 一起过节', `<div class="gyx-tip">${tf.f.ico} 今天是${tf.f.n}，${X.esc(X.name(c))} 在写节日卡……</div>`);
        const r = await card(c, tf.f, tf.date), f = tf.f;
        const act = r.done ? `<div class="gyx-card"><b>你</b>：${X.esc(r.mine || '')}<br><b>${X.esc(X.name(c))}</b>：${X.esc(r.ta || '')}</div>`
            : f.act === 'red' ? `<div class="gyx-row">${[6.66, 8.88, 52.0, 66.6, 88.8].map(a => `<button class="gyx-btn lite" onclick="this.disabled=true;gyxFestDo('${cid}','${f.k}','${tf.date}',${a})">🧧 ¥${a}</button>`).join('')}</div>`
            : f.act === 'riddle' ? (() => { const q = RIDDLES[(r.ri = r.ri != null ? r.ri : Math.floor(Math.random() * RIDDLES.length))]; return `<div class="gyx-card">🏮 谜面：<b>${X.esc(q[0])}</b>（打一字）</div><div class="gyx-row"><input id="gyxFeIn" class="gyx-who" style="flex:1" maxlength="2" placeholder="谜底"><button class="gyx-btn" onclick="gyxFestDo('${cid}','${f.k}','${tf.date}',document.getElementById('gyxFeIn').value)">猜</button></div>`; })()
            : f.act === 'pick' ? `<div class="gyx-row">${f.opts.map(o => `<span class="gyx-chip" onclick="gyxFestDo('${cid}','${f.k}','${tf.date}','${o}')">${o}</span>`).join('')}</div>`
            : `<textarea id="gyxFeIn" class="gyx-in" rows="2" placeholder="${f.ask}"></textarea><div class="gyx-row"><button class="gyx-btn" onclick="this.disabled=true;gyxFestDo('${cid}','${f.k}','${tf.date}')">交给 ${X.esc(X.name(c))}</button></div>`;
        today = `<div class="fe-day fe-${f.k}"><div class="fe-fx">${Array.from({ length: 14 }, () => `<i style="left:${X.rnd(0, 95)}%;animation-delay:${X.rnd(0, 6)}s">${f.fx}</i>`).join('')}</div><b class="fe-t">${f.ico} ${f.n}</b><div class="fe-card gyx-hand">${X.esc(r.card || '')}<i>—— ${X.esc(X.name(c))}</i></div></div><div class="gyx-tip">今天的小活动：${f.tip}</div>${act}`;
    }
    X.panel('gyxFeOv', '🏮 一起过节', `${c ? `<div class="gyx-row">${X.whoSel(cid, 'gyxFestOpen')}</div>` : ''}${today}
        <div style="font-weight:600;margin:12px 0 6px">接下来的节日</div>${L.filter(x => !tf || x !== tf).slice(0, 8).map(x => `<div class="fe-row"><span>${x.f.ico} ${x.f.n}</span><em>${x.date}</em><b>${daysTo(x.date)} 天后</b></div>`).join('')}
        <div class="gyx-tip">农历日期用的是浏览器自带的农历${fmt ? '' : '（你的浏览器不支持，用的是 2026~2028 的表）'}。公历节日（元旦、情人节、圣诞……）在「我们的日子」里。</div>
        ${c && D.by[cid] ? Object.values(D.by[cid]).filter(r => r.card).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 6).map(r => { const f = FEST.find(x => x.k === r.k) || {}; return `<div class="gyx-tip">${f.ico || ''} ${r.date} ${f.n || ''}：${X.esc((r.card || '').slice(0, 40))}</div>`; }).join('') : ''}`, 'gyx-fest');
};
window.gyxFestData = () => D;
window.gyxFestUpcoming = () => upcoming().map(x => ({ k: x.f.k, n: x.f.n, date: x.date }));
X.ctx(() => { const n = upcoming()[0]; if (!n) return ''; const dd = daysTo(n.date); if (dd === 0) return `【今天是${n.f.n}】${n.f.tip}。你记得，按你的性格过这个节。`; if (dd <= 3) return `【再过 ${dd} 天是${n.f.n}】你心里在惦记，可以提前准备点什么。`; return ''; }, 'gyxFest');
X.action({ key: 'gyx_fest', label: '今天过节，给她写一张节日卡、约她一起过', hint: '一起过节', need: c => { const tf = todayFest(); return !!tf && D.sent[String(c.id)] !== tf.f.k + '-' + tf.date.slice(0, 4); },
    run: async c => { const tf = todayFest(); const r = await card(c, tf.f, tf.date); D.sent[String(c.id)] = tf.f.k + '-' + tf.date.slice(0, 4); await saveD(); X.notify(c, `${tf.f.ico} ${X.esc(X.name(c))} ${X.v('给你写了节日卡', '祝你' + tf.f.n + '快乐', '在等你一起过' + tf.f.n)}`, (r.card || '').slice(0, 40), () => window.gyxFestOpen(c.id)); return (await X.reach(c, `今天是${tf.f.n}，你写好了节日卡，约她一起过（${tf.f.tip}）`)) ? tf.f.n + '：写了节日卡' : null; } }, 'gyxFest');
X.today(() => { const n = upcoming()[0]; if (!n) return null; const dd = daysTo(n.date); return { title: '🏮 节日', rows: [{ t: n.f.ico + ' ' + n.f.n, x: dd === 0 ? '就是今天！' : dd + ' 天后（' + n.date + '）', go: 'gyxFestOpen()' }] }; }, 'gyxFest');
X.widget('gyxFestW', { n: '下一个节日', sizes: ['s', 'm'], tap: () => window.gyxFestOpen(), r: w => { const n = upcoming()[0]; if (!n) return X.gw(w, '🏮', '节日', []); const dd = daysTo(n.date); return w.size === 's' ? `<div class="gw-x s"><b>${n.f.ico}</b><em>${dd ? dd + ' 天后' : '今天'}</em></div>` : X.gw(w, n.f.ico, '下一个节日', [`${n.f.n} · ${dd ? dd + ' 天后' : '就是今天'}`, n.f.tip]); } }, 'gyxFest');
X.mem({ k: 'gyxFest', ico: '🏮', n: '一起过的节', d: 'TA 写的节日卡，和你们的节日小活动', items: c => Object.values(D.by[String(c.id)] || {}).filter(r => r.card).sort((a, b) => (b.at || 0) - (a.at || 0)), text: r => r.card + (r.mine ? '｜你：' + r.mine : '') + (r.ta ? '｜TA：' + r.ta : ''), edit: (r, v) => { r.card = String(v).split('｜')[0]; }, del: (c, i) => { const M = D.by[String(c.id)] || {}; const ks = Object.keys(M).filter(k => M[k].card).sort((a, b) => (M[b].at || 0) - (M[a].at || 0)); delete M[ks[i]]; }, meta: r => r.date + ' ' + ((FEST.find(x => x.k === r.k) || {}).n || ''), save: saveD }, 'gyxFest');
X.css('gyxFeCss', `.gyx-fest .gyx-box{width:min(560px,100%)}.fe-day{position:relative;overflow:hidden;border-radius:20px;padding:18px;background:linear-gradient(160deg,#fff1e6,#ffe0e0);margin:6px 0 10px;min-height:170px}
.fe-zhongqiu,.fe-qixi{background:linear-gradient(160deg,#1c2350,#3b2f6b);color:#fff}.fe-duanwu{background:linear-gradient(160deg,#e8f7ec,#cdebd6)}.fe-chongyang,.fe-laba{background:linear-gradient(160deg,#fff6e0,#f6e2c0)}
.fe-t{position:relative;font-size:22px}.fe-card{position:relative;font-size:18px;line-height:1.7;margin-top:10px}.fe-card i{display:block;font-style:normal;text-align:right;font-size:14px;opacity:.8}
.fe-fx{position:absolute;inset:0;pointer-events:none}.fe-fx i{position:absolute;top:-30px;font-style:normal;font-size:20px;opacity:.75;animation:feFall 8s linear infinite}@keyframes feFall{to{transform:translateY(260px) rotate(30deg);opacity:0}}
.fe-row{display:flex;align-items:center;gap:10px;padding:7px 2px;border-bottom:1px solid #f2f2f4;font-size:14px}.fe-row em{font-style:normal;color:#8e8e93;font-size:12px}.fe-row b{margin-left:auto;font-weight:500;color:#d0443a}`);
X.mini({ id: 'gyxFest', icon: '🏮', title: '一起过节', desc: '农历节日自动算；当天有节日卡和小活动', cat: '陪伴', onOpen: () => window.gyxFestOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.by = D.by || {}; D.sent = D.sent || {}; })();
