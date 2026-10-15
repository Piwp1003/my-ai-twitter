/* 🎲 跑团：带骰子的 TRPG。开一团时选题材（奇幻 / 克苏鲁 / 都市怪谈 / 校园 / 武侠 / 自己写），TA 当主持人（KP）或者跟你组队当队友；你有一张小角色卡（四项属性 + 血量），每次行动掷骰判定，大成功 / 大失败都有。也能在聊天的 🎮 里开 */
if (window.__gyxTrpg) return; window.__gyxTrpg = 1;
X.feat('gyxTrpg', { n: '🎲 跑团', desc: '带骰子的 TRPG，TA 当主持人或者你的队友' });
const S = X.store('trpg');
let D = { runs: [] };   // runs: {id,cid,at,genre,role:'gm'|'mate',title,me:{name,st:{力量,敏捷,智力,魅力},hp,max},log:[{who,t,roll}],end,sum}
const GEN = { fantasy: '奇幻冒险', coc: '克苏鲁 / 调查', urban: '都市怪谈', campus: '校园悬疑', wuxia: '武侠江湖', scifi: '星际科幻' };
const STATS = ['力量', '敏捷', '智力', '魅力'];
const run = id => D.runs.find(x => x.id === id);
const saveD = () => S.set('d', D);
const d = n => 1 + Math.floor(Math.random() * n);
function roll(expr) { const m = String(expr || 'd20').match(/^(\d*)d(\d+)([+-]\d+)?$/i); if (!m) return null; const k = +(m[1] || 1), n = +m[2], add = +(m[3] || 0); const rs = Array.from({ length: Math.min(k, 10) }, () => d(n)); return { expr, rs, add, total: rs.reduce((a, b) => a + b, 0) + add, n }; }
const mod = v => Math.floor((v - 10) / 2);
function grade(r) { if (r.n === 20 && r.rs.length === 1) { if (r.rs[0] === 20) return '大成功'; if (r.rs[0] === 1) return '大失败'; } return ''; }
async function gm(R, ask) {
    const c = X.char(R.cid), me = X.me(c);
    const hist = R.log.slice(-16).map(x => (x.who === 'gm' ? '主持人' : x.who === 'ta' ? X.name(c) : me) + '：' + x.t + (x.roll ? `（掷骰 ${x.roll}）` : '')).join('\n');
    if (X.bailu()) return { t: X.pick(['你推开那扇门，里面很暗。', '远处传来脚步声。', '骰子落定，命运往前走了一步。']), need: 'd20' };
    const sheet = `${me}的角色「${R.me.name}」：${STATS.map(s => s + R.me.st[s]).join(' ')}，HP ${R.me.hp}/${R.me.max}`;
    const who = R.role === 'gm' ? `你是这场跑团的主持人（KP/DM），用你自己的说话方式带团（你是${X.name(c)}，可以偶尔夹带私心偏向她，但规则要公正）。` : `这场跑团由一个旁白主持人带，你（${X.name(c)}）是她的队友，你也有自己的角色，会跟她商量、护着她、也会自己行动。旁白和你的话都由你来写，旁白写在 gm，你自己的台词写在 ta。`;
    const r = X.json(await X.ask(`${X.who(c)}\n${who}\n题材：${GEN[R.genre] || R.genre}。团名《${R.title}》。\n${sheet}\n规则：她行动时如果有风险，要求她掷骰（d20 + 对应属性修正，难度 DC 10~18）；你只叙述结果，不替她决定行动；HP 降到 0 就是倒下。\n最近：\n${hist || '（刚开团）'}\n${ask}\n输出 JSON：{"gm":"主持人叙述（80~180 字，第二人称对她说）","ta":"${R.role === 'mate' ? '你作为队友说的一句话（可空）' : ''}","need":"下一步要她掷的骰子，如 d20 / 2d6；不需要就空","stat":"这次判定用哪项属性（力量/敏捷/智力/魅力，可空）","dc":难度数字或 null,"hp":这一步她 HP 的变化（负数是受伤，0 是没变）,"end":true/false 这一团是否结束}`));
    return r;
}
function apply(R, r) {
    if (!r) { R.log.push({ who: 'gm', t: '（主持人卡壳了，再试一次）', at: Date.now() }); return; }
    if (r.gm) R.log.push({ who: 'gm', t: X.plain(r.gm), at: Date.now() });
    if (r.ta) R.log.push({ who: 'ta', t: X.plain(r.ta), at: Date.now() });
    const hp = +r.hp || 0; if (hp) { R.me.hp = Math.max(0, Math.min(R.me.max, R.me.hp + hp)); R.log.push({ who: 'sys', t: `HP ${hp > 0 ? '+' : ''}${hp} → ${R.me.hp}/${R.me.max}`, at: Date.now() }); }
    R.need = r.need ? String(r.need).trim().toLowerCase() : ''; R.stat = STATS.includes(r.stat) ? r.stat : ''; R.dc = +r.dc || null;
    if (r.end || R.me.hp <= 0) R.end = R.end || Date.now();
}
let BUSY = false;
async function act(R, text, rollRes) {
    if (BUSY) return; BUSY = true; paint();
    try {
        if (text) R.log.push({ who: 'me', t: text, at: Date.now(), roll: rollRes ? `${rollRes.expr}=${rollRes.total}${rollRes.g ? ' ' + rollRes.g : ''}` : '' });
        const ask = rollRes ? `她的行动：「${text || '（直接掷骰）'}」，掷了 ${rollRes.expr}：${rollRes.rs.join('+')}${rollRes.add ? (rollRes.add > 0 ? '+' : '') + rollRes.add : ''} = ${rollRes.total}${rollRes.g ? '（' + rollRes.g + '）' : ''}${R.dc ? `，难度 ${R.dc}` : ''}。按结果叙述。` : `她的行动：「${text}」。需要判定就叫她掷骰，不需要就直接叙述。`;
        apply(R, await gm(R, ask));
        if (R.end && !R.sum) R.sum = X.plain(X.bailu() ? '' : (await X.ask(`${X.who(X.char(R.cid))}\n你们刚跑完一团《${R.title}》。经过：\n${R.log.slice(-20).map(x => x.t).join('\n')}\n用一句话（30 字以内）写这团最难忘的一刻。只输出这一句。`)) || '') || `跑完了《${R.title}》`;
        await saveD();
    } finally { BUSY = false; paint(); }
}
window.gyxTrpgDo = async id => { const R = run(id), inp = document.getElementById('gyxTpIn'); if (!R) return; const t = (inp && inp.value || '').trim(); if (!t) return; inp.value = ''; await act(R, t); };
window.gyxTrpgRoll = async id => {
    const R = run(id); if (!R) return; const inp = document.getElementById('gyxTpIn'); const t = (inp && inp.value || '').trim(); if (inp) inp.value = '';
    const r = roll(R.need || 'd20'); if (!r) return; if (R.stat && /d20/.test(r.expr)) { r.add += mod(R.me.st[R.stat]); r.total += mod(R.me.st[R.stat]); } r.g = grade(r);
    const dz = document.getElementById('gyxTpDice'); if (dz) { dz.classList.remove('go'); void dz.offsetWidth; dz.textContent = r.total; dz.classList.add('go'); }
    await new Promise(z => setTimeout(z, 700)); await act(R, t || `${R.stat ? R.stat + '判定' : '掷骰'}`, r);
};
window.gyxTrpgFree = (expr) => { const r = roll(expr); if (r) X.toast(X.v('🎲 骰子落定', '🎲 掷出来了', '🎲 咕噜咕噜'), `${expr}：${r.rs.join(' + ')}${r.add ? ' ' + (r.add > 0 ? '+' : '') + r.add : ''} = ${r.total}`); return r; };
async function newRun(c, genre, role, why) {
    const st = {}; STATS.forEach(s => { st[s] = [d(6), d(6), d(6), d(6)].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0); });
    const R = { id: 'tp' + Date.now().toString(36), cid: String(c.id), at: Date.now(), genre, role, title: '', me: { name: X.me(c), st, hp: 10 + mod(st['力量']) * 2 + 4, max: 0 }, log: [] };
    R.me.max = R.me.hp;
    const t = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n你要和她跑一团「${GEN[genre] || genre}」${why ? '，起因：' + why : ''}。起一个团名，再写一句开场钩子。输出 JSON：{"title":"团名（12 字以内）","hook":"一句钩子"}`));
    R.title = X.plain((t && t.title) || X.pick(['雾港来信', '第七层地下室', '无人车站', '月下山门'])).slice(0, 16);
    D.runs.unshift(R); D.runs = D.runs.slice(0, 30);
    apply(R, await gm(R, `开团。${t && t.hook ? '钩子：' + t.hook + '。' : ''}介绍场景，给她第一个选择。`)); await saveD(); return R;
}
window.gyxTrpgNew = async (cid) => {
    const g = (document.querySelector('#gyxTpOv .tp-g.on') || {}).dataset || {}, r = (document.querySelector('#gyxTpOv .tp-r.on') || {}).dataset || {};
    const own = ((document.getElementById('gyxTpOwn') || {}).value || '').trim();
    const R = await newRun(X.char(cid) || X.cur(), own || g.k || 'fantasy', r.k || 'gm'); window.gyxTrpgOpen(R.id);
};
window.gyxTrpgPick = (el, cls) => { document.querySelectorAll('#gyxTpOv .' + cls).forEach(x => x.classList.remove('on')); el.classList.add('on'); };
let CUR = null;
function paint() {
    const R = CUR && run(CUR), box = document.getElementById('gyxTpLog'); if (!R || !box) return;
    const c = X.char(R.cid);
    box.innerHTML = R.log.map(x => `<div class="tp-l ${x.who}">${x.who === 'gm' ? '' : `<b>${x.who === 'ta' ? X.esc(X.name(c)) : x.who === 'me' ? X.esc(R.me.name) : '⚙️'}</b>`}${X.esc(x.t)}${x.roll ? ` <em>🎲 ${X.esc(x.roll)}</em>` : ''}</div>`).join('') + (BUSY ? '<div class="tp-l gm">…</div>' : '');
    box.scrollTop = box.scrollHeight;
    const nd = document.getElementById('gyxTpNeed'); if (nd) nd.innerHTML = R.end ? '这一团结束了' : R.need ? `要你掷 <b>${X.esc(R.need)}</b>${R.stat ? `（${R.stat} ${mod(R.me.st[R.stat]) >= 0 ? '+' : ''}${mod(R.me.st[R.stat])}）` : ''}${R.dc ? ` · 难度 ${R.dc}` : ''}` : '说说你要做什么';
    const hp = document.getElementById('gyxTpHp'); if (hp) hp.textContent = `❤️ ${R.me.hp}/${R.me.max}`;
}
window.gyxTrpgOpen = function (id, who) {
    const R = id ? run(id) : null; const c = R ? X.char(R.cid) : (X.char(who) || X.cur()); if (!c) return;
    if (!R) {
        CUR = null; const L = D.runs.filter(x => x.cid === String(c.id));
        X.panel('gyxTpOv', '🎲 跑团', `<div class="gyx-row">${X.whoSel(c.id, 'gyxTrpgWho')}</div>
            <div class="gyx-tip">题材</div><div class="gyx-row">${Object.entries(GEN).map(([k, n], i) => `<span class="gyx-chip tp-g${i ? '' : ' on'}" data-k="${k}" onclick="gyxTrpgPick(this,'tp-g')">${n}</span>`).join('')}</div>
            <input id="gyxTpOwn" class="gyx-in" placeholder="或者自己写个题材 / 世界观（可空）">
            <div class="gyx-tip">TA 的身份</div><div class="gyx-row"><span class="gyx-chip tp-r on" data-k="gm" onclick="gyxTrpgPick(this,'tp-r')">TA 当主持人</span><span class="gyx-chip tp-r" data-k="mate" onclick="gyxTrpgPick(this,'tp-r')">TA 是我的队友</span></div>
            <div class="gyx-row"><button class="gyx-btn" onclick="this.disabled=true;this.textContent='TA 在准备…';gyxTrpgNew('${c.id}')">开一团</button><span class="gyx-chip" onclick="gyxTrpgFree('d20')">🎲 随手掷个 d20</span></div>
            ${L.length ? '<div class="gyx-tip">跑过的团</div>' + L.map(x => `<div class="gyx-card" style="cursor:pointer" onclick="gyxTrpgOpen('${x.id}')"><b>${X.esc(x.title)}</b> <span class="gyx-tip">${GEN[x.genre] || X.esc(x.genre)} · ${x.role === 'gm' ? 'TA 主持' : 'TA 是队友'} · ${x.end ? '已结束' : '进行中'}</span>${x.sum ? `<div>${X.esc(x.sum)}</div>` : ''}</div>`).join('') : ''}`);
        return;
    }
    CUR = R.id;
    X.panel('gyxTpOv', '🎲 ' + X.esc(R.title), `<div class="tp-sheet"><b>${X.esc(R.me.name)}</b>${STATS.map(s => `<span>${s} ${R.me.st[s]}</span>`).join('')}<span id="gyxTpHp"></span></div>
        <div class="tp-log" id="gyxTpLog"></div><div class="tp-need"><span id="gyxTpDice" class="tp-dice">🎲</span><span id="gyxTpNeed"></span></div>
        ${R.end ? `<div class="gyx-card">${X.esc(R.sum || '')}</div>` : `<textarea id="gyxTpIn" class="gyx-in" rows="2" placeholder="你要做什么？（比如：我小心地推开门，往里看）"></textarea>
        <div class="gyx-row"><button class="gyx-btn" onclick="gyxTrpgDo('${R.id}')">行动</button><button class="gyx-btn" onclick="gyxTrpgRoll('${R.id}')">🎲 掷骰</button>${['d4', 'd6', '2d6', 'd100'].map(e => `<span class="gyx-chip" onclick="gyxTrpgFree('${e}')">${e}</span>`).join('')}</div>`}
        <div class="gyx-row"><button class="gyx-btn lite" onclick="gyxTrpgOpen(null,'${R.cid}')">所有团</button></div>`, 'gyx-trpg');
    paint();
};
window.gyxTrpgWho = cid => window.gyxTrpgOpen(null, cid);
window.gyxTrpgData = () => D;
X.ctx(id => { const R = D.runs.find(x => x.cid === String(id)); if (!R) return ''; return !R.end ? `【你们正在跑团】《${R.title}》（${GEN[R.genre] || R.genre}，${R.role === 'gm' ? '你是主持人' : '你是她的队友'}），她的角色 HP ${R.me.hp}/${R.me.max}。` : Date.now() - R.end < 2 * 864e5 && R.sum ? `【你们刚跑完一团《${R.title}》】${R.sum}` : ''; }, 'gyxTrpg');
X.action({ key: 'gyx_trpg', label: '想和她跑一团（你来当主持人，或者当她的队友）', hint: '挑个她可能喜欢的题材', need: c => !D.runs.some(x => x.cid === String(c.id) && (!x.end || Date.now() - x.at < 3 * 864e5)),
    run: async c => { const R = await newRun(c, X.pick(Object.keys(GEN)), X.pick(['gm', 'mate'])); X.notify(c, `🎲 ${X.esc(X.name(c))} ${X.v('开了一团，等你上车', '摆好了骰子，叫你来跑团', '准备了一场跑团')}：${X.esc(R.title)}`, GEN[R.genre] || '', X.go('gyxTrpgOpen', R.id)); return (await X.reach(c, `你准备好了一场跑团《${R.title}》（${GEN[R.genre]}，${R.role === 'gm' ? '你当主持人' : '你当她的队友'}），叫她来玩`)) ? '开了一团：' + R.title : null; } }, 'gyxTrpg');
X.today(() => ({ title: '🎲 跑团', rows: D.runs.filter(x => X.day(new Date(x.at)) === X.day() || (x.end && X.day(new Date(x.end)) === X.day())).slice(0, 3).map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: (x.end ? '跑完了 ' : '进行中 ') + X.esc(x.title), go: `gyxTrpgOpen('${x.id}')` })) }), 'gyxTrpg');
X.widget('gyxTrpgW', { n: '跑团', sizes: ['s', 'm'], tap: () => { const c = X.cur(), R = c && D.runs.find(x => x.cid === String(c.id) && !x.end); window.gyxTrpgOpen(R ? R.id : null); }, r: w => { const c = X.cur(), R = c && D.runs.find(x => x.cid === String(c.id)); return X.gw(w, '🎲', '跑团', R ? [R.end ? '上一团：' + X.esc(R.title) : '进行中 · ❤️ ' + R.me.hp, X.esc(R.sum || GEN[R.genre] || '')] : ['还没开过团', '点我开一团']); } }, 'gyxTrpg');
X.memArr({ k: 'gyxTrpg', ico: '🎲', n: '跑团', d: '跑过的团和最难忘的一刻', arr: () => D.runs, field: 'sum', text: x => `《${x.title}》${x.sum || '（进行中）'}`, edit: (x, v) => { x.sum = String(v).replace(/^《[^》]*》/, ''); }, save: saveD }, 'gyxTrpg');
X.css('gyxTpCss', `.gyx-trpg .gyx-box{width:min(560px,100%)}.tp-sheet{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12.5px;background:#f7f7f9;border-radius:14px;padding:8px 10px}.tp-sheet span{background:#fff;border-radius:8px;padding:2px 7px}
.tp-log{max-height:46vh;overflow:auto;margin:8px 0;font-size:14px;line-height:1.75}.tp-l{margin:6px 0}.tp-l.gm{background:#f3f0ff;border-radius:12px;padding:8px 11px;font-family:Georgia,"Songti SC",serif}.tp-l b{color:#8e8e93;font-weight:500;margin-right:6px}.tp-l.me{text-align:right}.tp-l.sys{font-size:12px;color:#ff3b30}.tp-l em{font-style:normal;font-size:12px;color:#7d5fff}
.tp-need{display:flex;align-items:center;gap:10px;font-size:13px;color:#555}.tp-dice{width:40px;height:40px;border-radius:10px;background:#1d1d1f;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}.tp-dice.go{animation:tpRoll .7s ease-out}@keyframes tpRoll{0%{transform:rotate(0) scale(.6)}60%{transform:rotate(540deg) scale(1.2)}100%{transform:rotate(720deg) scale(1)}}`);
X.mini({ id: 'gyxTrpg', icon: '🎲', title: '跑团', desc: '带骰子的 TRPG，TA 当主持人或者队友', cat: '一起做', onOpen: () => window.gyxTrpgOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxTrpg', name: '跑团', icon: '🎲', getStatus: () => null, onResume: () => window.gyxTrpgOpen(), onStart: (sid, opp) => window.gyxTrpgOpen(null, String((opp || [])[0] || sid || '')) }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.runs = D.runs || []; })();
