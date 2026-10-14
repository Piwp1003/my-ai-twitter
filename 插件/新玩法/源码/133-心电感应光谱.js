/* 📡 心电感应光谱：学桌游《Wavelength》——一条刻度两头各写一个词（冷 ↔ 热、普通 ↔ 浪漫、难吃 ↔ 好吃……），TA 心里藏了一个位置，只给你一句提示，你拖动指针猜在哪；下一轮换你藏、你出提示，TA 来猜。五轮下来看看你们有多心有灵犀 */
if (window.__gyxWave) return; window.__gyxWave = 1;
X.feat('gyxWave', { n: '📡 心电感应光谱', desc: 'TA 藏一个位置给你一句提示，你猜；再换你出题' });
const S = X.store('wave');
let D = { games: [] };   // {id,cid,at,score,rounds:[{pair,t,clue,g,mode,pts}]}
let R = null, busy = false;   // {cid, rounds:[], cur:{pair,t,clue,mode}}
const PAIRS = [['冷', '热'], ['普通', '浪漫'], ['难吃', '好吃'], ['无聊', '有趣'], ['安全', '危险'], ['幼稚', '成熟'], ['土', '时髦'], ['小事', '大事'], ['便宜', '贵'], ['安静', '吵'], ['不像我', '很像我'], ['讨厌', '喜欢'], ['容易', '难'], ['正经', '不正经'], ['早', '晚'], ['害羞', '大胆'], ['平淡', '刺激'], ['日常', '奇幻'], ['难过', '开心'], ['可以忍', '绝对不行'], ['不值得', '超值'], ['不想做', '很想做'], ['尴尬', '自在'], ['离谱', '合理'], ['小众', '大众'], ['理性', '感性'], ['软', '硬'], ['丑', '好看'], ['没用', '有用'], ['陌生', '熟悉'], ['不心动', '心动'], ['不适合约会', '最适合约会']];
const save = () => S.set('d', D);
const DEF_CLUE = `{{角色}}
你们在玩「心电感应光谱」：一条刻度，最左边是「{{左}}」，最右边是「{{右}}」。你心里的位置是 {{位置}}（0 = 最左，100 = 最右）。
给她一个提示，让她猜到这个位置：一个词、一样东西、或者一件你们之间的事（12字内）。不能说数字，不能直接说「偏左」「中间」这种话。只输出提示本身。`;
const DEF_GUESS = `{{角色}}
你们在玩「心电感应光谱」：一条刻度，最左边是「{{左}}」，最右边是「{{右}}」。她心里藏了一个位置（0 = 最左，100 = 最右），给你的提示是：「{{提示}}」。
你猜在哪？只输出 JSON：{"g":0到100的数字,"why":"你为什么这么猜，20字内，按你的性格说"}`;
X.plGroup('📡 心电感应光谱', 'gyxWave', [['wave.clue', 'TA 出提示', '轮到 TA 藏位置时', '{{角色}} {{左}} {{右}} {{位置}}'], ['wave.guess', 'TA 猜你的位置', '轮到你出提示时', '{{角色}} {{左}} {{右}} {{提示}}']], { 'wave.clue': DEF_CLUE, 'wave.guess': DEF_GUESS });
const pts = (a, b) => { const d = Math.abs(a - b); return d <= 5 ? 4 : d <= 12 ? 3 : d <= 20 ? 2 : 0; };
const REACT = { 4: ['我们是不是连着一根线？', '一模一样！', '……你偷看我心里了吧'], 3: ['差一点点！', '很近了，算你懂我', '嗯，差不多就是那儿'], 2: ['方向对了', '有点偏，不过意思到了', '嗯……沾边'], 0: ['你在想什么啦', '差得有点远哦', '我们俩今天信号不好'] };
async function nextRound() {
    const c = X.char(R.cid), i = R.rounds.length, mode = i % 2 === 0 ? 'ta' : 'me', pair = X.pick(PAIRS.filter(p => !R.rounds.some(r => r.pair[0] === p[0])));
    R.cur = { pair, mode, t: mode === 'ta' ? Math.round(X.rnd(3, 97)) : null, clue: '' };
    if (mode === 'ta') { busy = true; window.gyxWaveOpen(); let t = X.bailu() ? null : await X.ask(X.pl('wave.clue', DEF_CLUE, { 角色: X.who(c), 左: pair[0], 右: pair[1], 位置: R.cur.t })); R.cur.clue = X.plain(t || '').replace(/^["「]|["」]$/g, '').slice(0, 20) || (R.cur.t < 35 ? `有点像${pair[0]}的时候` : R.cur.t > 65 ? `挺${pair[1]}的` : '说不清，各一半'); busy = false; }
    window.gyxWaveOpen();
}
window.gyxWaveStart = async cid => { const c = X.char(cid) || X.cur(); if (!c) return; R = { cid: String(c.id), rounds: [], cur: null }; await nextRound(); };
window.gyxWaveGuess = async () => {
    if (!R || !R.cur || busy) return; const v = +((document.getElementById('gyxWvS') || {}).value || 50), c = X.char(R.cid);
    if (R.cur.mode === 'ta') { const p = pts(v, R.cur.t); R.rounds.push(Object.assign({}, R.cur, { g: v, pts: p, line: X.pick(REACT[p]) })); }
    else {
        const clue = ((document.getElementById('gyxWvC') || {}).value || '').trim(); if (!clue) return X.toast('先写个提示', '一个词、一样东西、一件你们之间的事都行');
        R.cur.t = v; R.cur.clue = clue.slice(0, 20); busy = true; window.gyxWaveOpen();
        let o = X.bailu() ? null : X.json(await X.ask(X.pl('wave.guess', DEF_GUESS, { 角色: X.who(c), 左: R.cur.pair[0], 右: R.cur.pair[1], 提示: R.cur.clue })));
        const g = o && isFinite(+o.g) ? Math.max(0, Math.min(100, Math.round(+o.g))) : Math.round(X.rnd(10, 90)); const p = pts(g, v);
        R.rounds.push(Object.assign({}, R.cur, { g, pts: p, why: X.plain((o && o.why) || '') || '凭感觉', line: X.pick(REACT[p]) })); busy = false;
    }
    R.cur = null; window.gyxWaveOpen();
};
window.gyxWaveNext = async () => { if (!R) return; if (R.rounds.length >= 5) { const score = R.rounds.reduce((a, r) => a + r.pts, 0); D.games.unshift({ id: 'wv' + Date.now().toString(36), cid: R.cid, at: Date.now(), score, rounds: R.rounds }); D.games = D.games.slice(0, 100); await save(); R.done = score; return window.gyxWaveOpen(); } await nextRound(); };
window.gyxWaveDel = async id => { D.games = D.games.filter(g => g.id !== id); await save(); window.gyxWaveOpen(); };
window.gyxWaveData = () => D; window.gyxWaveState = () => R;
const bar = (pair, mark, t, g, input) => `<div class="wv-lab"><span>${X.esc(pair[0])}</span><span>${X.esc(pair[1])}</span></div><div class="wv-bar">${t != null ? `<i class="t" style="left:${t}%"></i>` : ''}${g != null ? `<i class="g" style="left:${g}%"></i>` : ''}</div>${input ? `<input id="gyxWvS" type="range" min="0" max="100" value="50" class="wv-s">` : ''}`;
window.gyxWaveOpen = function (who) {
    const c = (R && X.char(R.cid)) || X.char(who) || X.cur(); if (!c) return;
    const mine = D.games.filter(g => g.cid === String(c.id)), best = mine.reduce((a, g) => Math.max(a, g.score), 0);
    let body = '';
    if (!R || R.done != null) body = `${R && R.done != null ? `<div class="gyx-card wv-end"><b>${R.done} / 20</b><div>${R.done >= 16 ? '心有灵犀 💞' : R.done >= 10 ? '挺懂彼此的' : '信号还要再调调'}</div></div>` : ''}<div class="gyx-row">${X.whoSel(c.id, 'gyxWaveOpen')}<button class="gyx-btn" onclick="gyxWaveStart('${c.id}')">${R ? '再来一局' : '开一局'}</button></div><div class="gyx-tip">五轮：TA 藏位置给提示你猜 → 你藏位置给提示 TA 猜 → ……离得越近分越多（满分 20）。${mine.length ? `你们最好的一次是 ${best} 分。` : ''}</div>`;
    else {
        const done = R.rounds.map((r, i) => `<div class="wv-r"><b>第 ${i + 1} 轮 · ${r.mode === 'ta' ? 'TA 出题' : '你出题'}</b> 提示「${X.esc(r.clue)}」 · +${r.pts}${bar(r.pair, 0, r.t, r.g)}<span>${X.esc(X.name(c))}：${X.esc(r.why ? `（猜${r.g}，${r.why}）` : '')}${X.esc(r.line)}</span></div>`).join('');
        const last = R.rounds[R.rounds.length - 1];
        body = `<div class="gyx-tip">第 ${R.rounds.length + (R.cur ? 1 : 0)} / 5 轮 · 现在 ${R.rounds.reduce((a, r) => a + r.pts, 0)} 分</div>`
            + (busy ? `<div class="gyx-card">${X.v('TA 在想……', '信号传送中……', 'TA 正在感应……')} 📡</div>` : R.cur ? (R.cur.mode === 'ta' ? `<div class="gyx-card"><b>TA 的提示：「${X.esc(R.cur.clue)}」</b>${bar(R.cur.pair, 0, null, null, true)}<button class="gyx-btn" onclick="gyxWaveGuess()">就是这儿</button></div>` : `<div class="gyx-card"><b>轮到你：把指针拖到你心里的位置，再写一句提示</b>${bar(R.cur.pair, 0, null, null, true)}<input id="gyxWvC" class="gyx-in" placeholder="提示：一个词、一样东西、一件你们之间的事"><div class="gyx-row"><button class="gyx-btn" onclick="gyxWaveGuess()">给 TA 猜</button></div></div>`) : `<div class="gyx-row"><button class="gyx-btn" onclick="gyxWaveNext()">${R.rounds.length >= 5 ? '看结果' : '下一轮'}</button></div>`)
            + (last && !R.cur ? '' : '') + done;
    }
    const qz = window.gyxQuizData ? (() => { const L = window.gyxQuizData().log.filter(x => x.cid === String(c.id)); return L.length ? `<div class="gyx-tip">💞 默契问答那边：默契值 ${Math.round(L.filter(x => x.ok).length / L.length * 100)}%（${L.length} 题） <span style="cursor:pointer;color:#1d9bf0" onclick="document.getElementById('gyxWaveOv')?.remove();gyxQuizOpen('${c.id}')">去答题 ›</span></div>` : `<div class="gyx-tip">💞 想换种方式测默契，也可以去「默契问答」 <span style="cursor:pointer;color:#1d9bf0" onclick="document.getElementById('gyxWaveOv')?.remove();gyxQuizOpen('${c.id}')">去看看 ›</span></div>`; })() : '';
    X.panel('gyxWaveOv', '📡 心电感应光谱 · ' + X.esc(X.name(c)), body + qz + (mine.length ? `<h4 class="wv-h">以前玩过的</h4>${mine.slice(0, 10).map(g => `<div class="wv-p">${new Date(g.at).toLocaleDateString()} · ${g.score} / 20 <i onclick="gyxWaveDel('${g.id}')">删</i></div>`).join('')}` : ''));
};
X.ctx(id => { const g = D.games.find(x => x.cid === String(id) && Date.now() - x.at < 2 * 864e5); return g ? `【心电感应光谱】你们刚玩过，默契 ${g.score}/20（${g.rounds.filter(r => r.pts >= 3).map(r => `「${r.clue}」猜中了`).slice(0, 2).join('，') || '没怎么猜中'}）。` : ''; }, 'gyxWave');
X.inj('gyxWave', [['心电感应光谱', '刚玩过心电感应光谱', '两天之内 TA 记得你们的默契分和猜中的那几轮。']]);
X.action({ key: 'gyx_wave', label: '想跟她玩「心电感应光谱」，看看你们有多心有灵犀', hint: '心电感应光谱', need: c => !D.games.some(g => g.cid === String(c.id) && Date.now() - g.at < 4 * 864e5), run: async c => (await X.reach(c, '你想跟她玩「心电感应光谱」：一条刻度两头各一个词，你藏一个位置给提示，她猜。邀请她来玩（她可以在游戏厅里找到）。')) ? '邀你玩心电感应光谱' : null }, 'gyxWave');
X.today(() => ({ title: '📡 光谱', rows: D.games.filter(g => X.day(new Date(g.at)) === X.day() && X.char(g.cid)).map(g => ({ t: X.name(X.char(g.cid)), x: `默契 ${g.score} / 20`, go: `gyxWaveOpen('${g.cid}')` })) }), 'gyxWave');
X.widget('gyxWaveW', { n: '心电感应光谱', sizes: ['s', 'm'], tap: () => window.gyxWaveOpen(), r: w => { const g = D.games[0]; return X.gw(w, '📡', '光谱', g ? [`上次 ${g.score}/20`, X.esc(X.name(X.char(g.cid)))] : ['还没玩过']); } }, 'gyxWave');
X.memArr({ k: 'gyxWave', ico: '📡', n: '心电感应光谱', d: '每一局的默契分（删了 TA 就不记得这局）', arr: () => D.games, field: 'score', text: x => `默契 ${x.score}/20：` + x.rounds.map(r => `${r.pair.join('↔')}「${r.clue}」+${r.pts}`).join('；'), edit: () => {}, save }, 'gyxWave');
X.css('gyxWaveCss', `.wv-lab{display:flex;justify-content:space-between;font-size:13px;color:#555;margin-top:8px}.wv-bar{position:relative;height:14px;border-radius:7px;background:linear-gradient(90deg,#7ab8ff,#f2f2f4 50%,#ff8a80);margin:4px 0}.wv-bar i{position:absolute;top:-4px;width:4px;height:22px;border-radius:2px;transform:translateX(-2px)}.wv-bar i.t{background:#1d1d1f}.wv-bar i.g{background:#f91880}.wv-s{width:100%;margin:6px 0}.wv-r{padding:8px 0;border-bottom:1px solid #f2f2f4;font-size:13px}.wv-r span{display:block;color:#666}.wv-h{font-size:14px;margin:14px 0 4px}.wv-p{font-size:13px;padding:5px 0;border-bottom:1px solid #f2f2f4}.wv-p i{float:right;font-style:normal;font-size:11px;color:#aaa;cursor:pointer}.wv-end{text-align:center}.wv-end b{font-size:30px}`);
X.mini({ id: 'gyxWave', icon: '📡', title: '心电感应光谱', desc: 'TA 藏位置给提示你猜，再换你出题', cat: '一起做', onOpen: () => window.gyxWaveOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxWave', name: '心电感应光谱', icon: '📡', getStatus: () => null, onResume: () => window.gyxWaveOpen(), onStart: (sid, opp) => window.gyxWaveOpen(String((opp || [])[0] || sid || '')) }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.games = D.games || []; })();
