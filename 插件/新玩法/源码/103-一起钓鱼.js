/* 🎣 一起钓鱼：在湖边甩一竿，浮漂动了就点「收！」，手慢了鱼就跑。不同时间、不同季节能钓到的不一样，还有稀有的、传说的，和 TA 扔下去的漂流瓶。攒一本图鉴；卖鱼的钱进钱包。TA 坐在旁边也在钓，钓到好东西会跟你炫耀。也在聊天的 🎮 里 */
if (window.__gyxFish) return; window.__gyxFish = 1;
X.feat('gyxFish', { n: '🎣 一起钓鱼', desc: '湖边甩竿、看浮漂收线，攒图鉴；TA 坐旁边也在钓' });
const S = X.store('fish');
// [id, 名字, emoji, 稀有度 1普通 2少见 3稀有 4传说, 价钱, 什么时候有：'day' | 'night' | 'all' | 月份数组]
const FISH = [
    ['carp', '鲫鱼', '🐟', 1, 3, 'all'], ['crucian', '草鱼', '🐟', 1, 4, 'all'], ['minnow', '小白条', '🐟', 1, 1, 'day'], ['bass', '鲈鱼', '🐠', 2, 9, 'all'],
    ['catfish', '鲶鱼', '🐡', 2, 8, 'night'], ['eel', '黄鳝', '🐍', 2, 10, 'night'], ['shrimp', '小龙虾', '🦞', 1, 5, [5, 6, 7, 8]], ['crab', '大闸蟹', '🦀', 3, 30, [9, 10, 11]],
    ['koi', '锦鲤', '🎏', 3, 40, 'all'], ['goldfish', '金鱼', '🐠', 2, 12, 'day'], ['turtle', '小乌龟', '🐢', 3, 25, 'all'], ['moonfish', '月光鱼', '🌙', 4, 88, 'night'],
    ['sakura', '樱花鳟', '🌸', 4, 66, [3, 4]], ['ice', '冰湖鳕', '🧊', 3, 35, [12, 1, 2]], ['boot', '一只旧靴子', '👢', 1, 0, 'all'], ['bottle', 'TA 扔下去的漂流瓶', '🍾', 4, 0, 'all']
];
let D = { dex: {}, log: [], ta: [], coins: 0, rod: 1 };   // dex[id] = {n, best, at}；log: {id,at,fish,cm,by}；ta: TA 钓到的 {cid,at,fish,line}
const saveD = () => S.set('d', D);
const fish = id => FISH.find(f => f[0] === id);
const RAR = ['', '普通', '少见', '稀有', '传说'];
function pool() { const h = new Date().getHours(), m = new Date().getMonth() + 1, night = h >= 19 || h < 6; return FISH.filter(f => f[5] === 'all' || (f[5] === 'night' ? night : f[5] === 'day' ? !night : f[5].includes(m))); }
function roll(bonus) { const P = pool(), w = { 1: 60, 2: 26, 3: 10 + (bonus || 0), 4: 3 + (bonus || 0) / 2 }; let tot = P.reduce((a, f) => a + w[f[3]], 0), r = Math.random() * tot; for (const f of P) { r -= w[f[3]]; if (r <= 0) return f; } return P[0]; }
let G = null;   // {state:'wait'|'bite'|'gone', t, timer}
function setState(st, msg) { const box = document.getElementById('gyxFsLake'); if (!box) return; box.dataset.st = st; const m = document.getElementById('gyxFsMsg'); if (m) m.innerHTML = msg || ''; const b = document.getElementById('gyxFsBtn'); if (b) b.textContent = st === 'idle' || st === 'gone' || st === 'got' ? '甩一竿' : st === 'bite' ? '收！' : '等等……'; }
window.gyxFishCast = async () => {
    if (!G || G.state === 'idle' || G.state === 'gone' || G.state === 'got') {
        clearTimeout(G && G.timer); G = { state: 'wait' }; setState('wait', X.v('浮漂在水面上晃……', '安静，鱼在附近', '风很轻'));
        G.timer = setTimeout(() => { if (!G || G.state !== 'wait') return; G.state = 'bite'; G.t = Date.now(); setState('bite', '<b>动了！快收！</b>'); G.timer = setTimeout(() => { if (G && G.state === 'bite') { G.state = 'gone'; setState('gone', X.v('手慢了，鱼跑了', '只剩一圈涟漪', '鱼饵被吃掉了')); } }, 1300); }, X.rnd(2500, 9000));
        return;
    }
    if (G.state === 'wait') { clearTimeout(G.timer); G.state = 'gone'; setState('gone', X.v('收早了，什么都没有', '太心急啦')); return; }
    if (G.state === 'bite') {
        clearTimeout(G.timer); const fast = Date.now() - G.t < 450, f = roll(fast ? 6 : 0); G.state = 'got';
        await land(f, fast);
    }
};
async function land(f, fast) {
    const d = D.dex[f[0]] || (D.dex[f[0]] = { n: 0, at: Date.now() }); d.n++; const first = d.n === 1;
    D.coins += f[4]; try { if (f[4] && window.gyWallet && window.gyWallet.earn) await window.gyWallet.earn('me', f[4], '卖鱼：' + f[1]); } catch (e) {}
    let cm = ''; const c = X.cur();
    if (c && f[3] >= 3) cm = X.plain(X.bailu() ? (X.cards(['聊天', '情话'], c, 1)[0] || '') : (await X.ask(`${X.who(c)}\n你们俩在湖边一起钓鱼，她刚钓到了${RAR[f[3]]}的「${f[1]}」${f[0] === 'bottle' ? '——那是你之前偷偷扔下去的漂流瓶，里面有你写的一句话，现在说出来' : ''}。你坐在旁边，说一句（20 字以内）。只输出这一句。`)) || '');
    const it = { id: 'fl' + Date.now().toString(36), at: Date.now(), fish: f[0], cm, by: 'me' }; D.log.unshift(it); D.log = D.log.slice(0, 200); await saveD();
    setState('got', `<span class="fs-catch">${f[2]}</span><b>${X.esc(f[1])}</b> <em class="r${f[3]}">${RAR[f[3]]}</em>${first ? ' · <em>新图鉴！</em>' : ''}${fast ? ' · 手快！' : ''}${f[4] ? ` · +¥${f[4]}` : ''}${cm ? `<div class="fs-cm">💬 ${X.esc(X.name(c))}：${X.esc(cm)}</div>` : ''}`);
    paintDex();
}
function paintDex() { const b = document.getElementById('gyxFsDex'); if (!b) return; const got = FISH.filter(f => D.dex[f[0]]).length; b.innerHTML = `<div class="gyx-tip">图鉴 ${got}/${FISH.length} · 卖鱼一共 ¥${D.coins}</div><div class="fs-dex">${FISH.map(f => { const d = D.dex[f[0]]; return `<span class="${d ? 'got r' + f[3] : ''}" title="${d ? f[1] + ' ×' + d.n : '？？？'}">${d ? f[2] : '？'}<i>${d ? X.esc(f[1]) : RAR[f[3]]}</i></span>`; }).join('')}</div>`; }
async function taFish(c) {
    const f = roll(4); const line = X.bailu() ? '' : X.plain(await X.ask(`${X.who(c)}\n你一个人去湖边钓鱼，钓到了${RAR[f[3]]}的「${f[1]}」。发消息跟她炫耀一句，顺便约她一起来（20 字以内）。只输出这一句。`) || '');
    const it = { id: 'ft' + Date.now().toString(36), cid: String(c.id), at: Date.now(), fish: f[0], line }; D.ta.unshift(it); D.ta = D.ta.slice(0, 60); await saveD(); return it;
}
window.gyxFishOpen = function () {
    const c = X.cur(), h = new Date().getHours(), night = h >= 19 || h < 6; G = { state: 'idle' };
    X.panel('gyxFsOv', '🎣 一起钓鱼', `<div class="fs-lake${night ? ' night' : ''}" id="gyxFsLake" data-st="idle" onclick="gyxFishCast()"><i class="fs-moon"></i><i class="fs-bob"></i><i class="fs-ring"></i>${c ? `<span class="fs-ta">${(() => { try { return getAvatarHTML(c, 36); } catch (e) { return ''; } })()}<em>${X.esc(X.name(c))} 也在钓</em></span>` : ''}</div>
        <div class="fs-msg" id="gyxFsMsg">点湖面或者按钮甩一竿。浮漂往下沉的时候赶紧收。</div>
        <div class="gyx-row"><button class="gyx-btn" id="gyxFsBtn" onclick="gyxFishCast()">甩一竿</button><span class="gyx-tip">${night ? '🌙 晚上：鲶鱼、黄鳝、月光鱼出没' : '☀️ 白天：金鱼、小白条多'}</span></div>
        <div id="gyxFsDex"></div>
        ${D.ta.slice(0, 4).map(x => `<div class="gyx-tip">🎣 ${X.esc(X.name(X.char(x.cid)))} 钓到了 ${(fish(x.fish) || [])[2] || ''} ${X.esc((fish(x.fish) || [])[1] || '')}${x.line ? '：' + X.esc(x.line) : ''}</div>`).join('')}`, 'gyx-fish');
    paintDex();
};
window.gyxFishData = () => D;
window.gyxFishLand = id => land(fish(id) || FISH[0], false);
X.ctx(id => { const t = D.ta.find(x => x.cid === String(id) && Date.now() - x.at < 864e5), m = D.log.find(x => Date.now() - x.at < 864e5 && (fish(x.fish) || [])[3] >= 3); return (t ? `【你今天去钓鱼钓到了「${fish(t.fish)[1]}」】` : '') + (m ? `【她今天和你一起钓鱼，钓到了${RAR[fish(m.fish)[3]]}的「${fish(m.fish)[1]}」】` : ''); }, 'gyxFish');
X.action({ key: 'gyx_fish', label: '去湖边钓鱼，钓到了跟她炫耀、约她一起', hint: '一起钓鱼', need: c => !D.ta.some(x => x.cid === String(c.id) && Date.now() - x.at < 3 * 864e5),
    run: async c => { const t = await taFish(c), f = fish(t.fish); X.notify(c, `🎣 ${X.esc(X.name(c))} ${X.v('钓到了', '在湖边钓到了', '刚钓上来')} ${f[2]} ${X.esc(f[1])}`, t.line, () => window.gyxFishOpen()); return (await X.reach(c, `你刚钓到了${RAR[f[3]]}的「${f[1]}」，跟她炫耀一下，约她一起来钓${t.line ? '（你想说：' + t.line + '）' : ''}`)) ? '钓到了' + f[1] : null; } }, 'gyxFish');
X.today(() => { const L = D.log.filter(x => X.day(new Date(x.at)) === X.day()), T = D.ta.filter(x => X.day(new Date(x.at)) === X.day()); return { title: '🎣 钓鱼', rows: (L.length ? [{ t: '你', x: `钓了 ${L.length} 条，最好的是 ${(() => { const b = L.map(x => fish(x.fish)).sort((a, b) => b[3] - a[3])[0]; return b[2] + ' ' + b[1]; })()}`, go: 'gyxFishOpen()' }] : []).concat(T.map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: '钓到了 ' + fish(x.fish)[2] + ' ' + fish(x.fish)[1], go: 'gyxFishOpen()' }))) }; }, 'gyxFish');
X.widget('gyxFishW', { n: '钓鱼', sizes: ['s', 'm'], tap: () => window.gyxFishOpen(), r: w => { const l = D.log[0], f = l && fish(l.fish); return X.gw(w, f ? f[2] : '🎣', '钓鱼', [f ? '上一条：' + X.esc(f[1]) : '去甩一竿', `图鉴 ${FISH.filter(x => D.dex[x[0]]).length}/${FISH.length}`]); } }, 'gyxFish');
X.mem({ k: 'gyxFish', ico: '🎣', n: '钓鱼时 TA 说的话', d: '钓到稀有的鱼时 TA 在旁边说的', items: () => D.log.filter(x => x.cm), text: x => `${(fish(x.fish) || [])[1] || ''}｜${x.cm}`, edit: (x, v) => { x.cm = String(v).split('｜').slice(1).join('｜'); }, del: (c, i) => { const it = D.log.filter(x => x.cm)[i]; const j = D.log.indexOf(it); if (j >= 0) D.log.splice(j, 1); }, meta: x => new Date(x.at).toLocaleString(), save: saveD }, 'gyxFish');
X.css('gyxFsCss', `.gyx-fish .gyx-box{width:min(520px,100%)}.fs-lake{position:relative;height:230px;border-radius:20px;overflow:hidden;cursor:pointer;background:linear-gradient(#bfe6ff 0 38%,#5fb4d9 38%,#2f7fae);user-select:none}.fs-lake.night{background:linear-gradient(#141a3a 0 38%,#1d3b5c 38%,#0e2236)}
.fs-moon{position:absolute;top:18px;right:28px;width:34px;height:34px;border-radius:50%;background:#fff3b0;box-shadow:0 0 20px #fff3b0;opacity:0}.fs-lake.night .fs-moon{opacity:1}
.fs-bob{position:absolute;left:48%;top:56%;width:12px;height:20px;border-radius:6px 6px 4px 4px;background:linear-gradient(#ff4d4d 0 50%,#fff 50%);display:none}.fs-ring{position:absolute;left:calc(48% - 14px);top:calc(56% + 12px);width:40px;height:10px;border-radius:50%;border:2px solid rgba(255,255,255,.6);display:none}
.fs-lake:not([data-st="idle"]) .fs-bob,.fs-lake:not([data-st="idle"]) .fs-ring{display:block}.fs-lake[data-st="wait"] .fs-bob{animation:fsBob 1.6s ease-in-out infinite}.fs-lake[data-st="bite"] .fs-bob{animation:fsBite .25s ease-in-out infinite}.fs-lake[data-st="bite"] .fs-ring{animation:fsRing .5s ease-out infinite}.fs-lake[data-st="got"] .fs-bob,.fs-lake[data-st="got"] .fs-ring,.fs-lake[data-st="gone"] .fs-bob{display:none}
@keyframes fsBob{50%{transform:translateY(3px)}}@keyframes fsBite{50%{transform:translateY(9px)}}@keyframes fsRing{to{transform:scale(1.8);opacity:0}}
.fs-ta{position:absolute;left:14px;bottom:12px;display:flex;align-items:center;gap:6px;color:#fff;font-size:12px;text-shadow:0 1px 3px rgba(0,0,0,.4)}.fs-ta em{font-style:normal}
.fs-msg{min-height:44px;margin:10px 2px;font-size:14px;line-height:1.7}.fs-catch{font-size:28px;vertical-align:middle;margin-right:6px}.fs-msg em{font-style:normal;font-size:12px;padding:1px 7px;border-radius:999px;background:#f2f2f4}.fs-msg em.r3{background:#e6f0ff;color:#2f6fd0}.fs-msg em.r4{background:#fff1d6;color:#b07a00}.fs-cm{margin-top:4px;color:#8e8e93;font-size:13px}
.fs-dex{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}.fs-dex span{background:#f2f2f4;border-radius:12px;padding:6px 2px;text-align:center;font-size:20px;color:#bbb}.fs-dex span i{display:block;font-style:normal;font-size:10.5px;color:#999}.fs-dex span.got{background:#eef7ff;color:inherit}.fs-dex span.r3{background:#e6f0ff}.fs-dex span.r4{background:#fff4d9}`);
X.mini({ id: 'gyxFish', icon: '🎣', title: '一起钓鱼', desc: '湖边甩竿、看浮漂收线，攒图鉴；TA 也在钓', cat: '一起做', onOpen: () => window.gyxFishOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxFish', name: '一起钓鱼', icon: '🎣', getStatus: () => null, onResume: () => window.gyxFishOpen(), onStart: () => window.gyxFishOpen() }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.dex = D.dex || {}; D.log = D.log || []; D.ta = D.ta || []; })();
