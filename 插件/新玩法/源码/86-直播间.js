/* 📺 直播间：TA 开直播——标题、画面、弹幕滚屏、观众刷礼物；你进去发弹幕、送礼物，TA 会挑你的弹幕回（认得出是你）。背景用 TA 的头像，也能换成你传的视频 / 图。每场直播留一条记录 */
if (window.__gyxLive) return; window.__gyxLive = 1;
X.feat('gyxLive', { n: '📺 直播间', desc: 'TA 开直播，弹幕、礼物；你进去发弹幕 TA 会回你' });
const S = X.store('live');
let D = { lives: [], bg: {} };   // lives: {id,cid,at,title,scene,lines:[{who,t,me,gift,ta}],end,sum,viewers,gifts}
let CUR = null, TIMER = null, BUSY = false;
const GIFTS = [['🌹', '玫瑰', 1], ['🍬', '糖', 1], ['🎈', '气球', 5], ['💌', '情书', 10], ['🚀', '火箭', 50], ['🏰', '城堡', 99]];
const NICK = ['吃瓜第一线', '今天也要早睡', '路过的猫', '柠檬不酸', '熬夜冠军', '一只小鹿', '夜行动物', '不吃香菜', '奶茶续命', '云朵收集者', '摸鱼专业户', '芝士就是力量'];
const live = id => D.lives.find(x => x.id === id);
const lastOf = cid => D.lives.find(x => x.cid === String(cid));
const saveD = () => S.set('d', D);
async function gen(c, L, ask) {
    if (X.bailu()) { const t = X.cards(['聊天', '情话'], c, 3); return { ta: t.slice(0, 2), dm: NICK.slice(0, 3).map(n => ({ who: n, t: X.pick(['主播好帅', '来了来了', '哈哈哈哈', '前排', '这是什么神仙直播']) })) }; }
    const hist = L.lines.slice(-14).map(x => (x.ta ? X.name(c) + '（主播）' : x.me ? X.me(c) + '（就是她）' : x.who) + '：' + x.t).join('\n');
    const r = X.json(await X.ask(`${X.who(c)}\n你正在开直播，标题《${L.title}》，画面：${L.scene}。直播间里有一群陌生观众，她（${X.me(c)}）也在里面看，用户名就是「${X.me(c)}」——你认得出她。\n刚才的弹幕和你说的话：\n${hist || '（刚开播）'}\n${ask || '接着往下播。'}\n输出 JSON：{"ta":["你接下来说的 1~3 句（口语，像真主播，可以念弹幕、回弹幕，她的弹幕优先回，可以当着观众偷偷对她好）"],"dm":[{"who":"观众昵称","t":"弹幕（15 字以内，像真弹幕，可以起哄、刷梗、发现你在偏心某个观众）"}]}，dm 给 3~6 条。`));
    return r && (r.ta || r.dm) ? { ta: [].concat(r.ta || []).map(X.plain).filter(Boolean).slice(0, 3), dm: [].concat(r.dm || []).filter(x => x && x.t).slice(0, 6).map(x => ({ who: X.plain(x.who || X.pick(NICK)).slice(0, 10), t: X.plain(x.t).slice(0, 30) })) } : null;
}
async function start(c, why) {
    const old = D.lives.find(x => x.cid === String(c.id) && !x.end); if (old) return old;
    let t = null;
    if (!X.bailu()) t = X.json(await X.ask(`${X.who(c)}\n你今天想开一场直播（按你的身份和生活：可能是弹琴、做饭、打游戏、画画、随便聊聊、带大家看你那边的风景……）${why ? '，起因：' + why : ''}。输出 JSON：{"title":"直播标题（15 字以内）","scene":"镜头里是什么样（30 字以内）","open":"开播第一句"}`));
    const L = { id: 'lv' + Date.now().toString(36), cid: String(c.id), at: Date.now(), title: X.plain((t && t.title) || X.pick(['随便聊聊', '深夜陪伴', '今天做点好吃的', '弹会儿琴'])).slice(0, 20), scene: X.plain((t && t.scene) || '镜头里是 TA 的房间，台灯开着').slice(0, 60), lines: [], viewers: Math.round(X.rnd(80, 900)), gifts: 0 };
    L.lines.push({ ta: 1, t: X.plain((t && t.open) || X.pick(['开播啦，来的都是好朋友', '嗯……能听到吗？开始了', '今天随便播一会儿'])), at: Date.now() });
    D.lives.unshift(L); D.lives = D.lives.slice(0, 40); await saveD(); return L;
}
async function step(L, ask, mine) {
    if (BUSY) return; BUSY = true; paint();
    try { const c = X.char(L.cid); const r = await gen(c, L, ask); if (r) { (r.dm || []).forEach(d => L.lines.push(Object.assign({ at: Date.now() }, d))); (r.ta || []).forEach(t => L.lines.push({ ta: 1, t, at: Date.now() })); L.viewers += Math.round(X.rnd(-20, 60)); await saveD(); } }
    finally { BUSY = false; paint(); }
}
window.gyxLiveSend = async () => {
    const L = CUR && live(CUR), inp = document.getElementById('gyxLvIn'); if (!L || !inp) return; const t = inp.value.trim(); if (!t) return; inp.value = '';
    L.lines.push({ me: 1, who: X.me(X.char(L.cid)), t: t.slice(0, 60), at: Date.now() }); await saveD(); paint();
    await step(L, `她刚发了弹幕：「${t}」。先回她。`);
};
window.gyxLiveGift = async i => {
    const L = CUR && live(CUR), g = GIFTS[i]; if (!L || !g) return;
    L.lines.push({ me: 1, gift: g[0], who: X.me(X.char(L.cid)), t: `送出 ${g[0]} ${g[1]}`, at: Date.now() }); L.gifts += g[2]; await saveD();
    const fx = document.getElementById('gyxLvFx'); if (fx) { fx.innerHTML = Array.from({ length: 14 }, () => `<i style="left:${X.rnd(5, 90)}%;animation-delay:${X.rnd(0, .8)}s">${g[0]}</i>`).join(''); setTimeout(() => { if (fx) fx.innerHTML = ''; }, 2600); }
    paint(); await step(L, `她刚送了你「${g[1]}」${g[2] >= 50 ? '（很贵的大礼物，全场都看到了）' : ''}。谢谢她，按你的性格来。`);
};
window.gyxLiveBg = inp => { const f = inp.files && inp.files[0], L = CUR && live(CUR); if (!f || !L) return; const r = new FileReader(); r.onload = async () => { D.bg[L.cid] = { src: r.result, video: /^video/.test(f.type) }; await saveD(); window.gyxLiveOpen(L.id); }; r.readAsDataURL(f); };
window.gyxLiveEnd = async () => {
    const L = CUR && live(CUR); if (!L) return; clearInterval(TIMER); L.end = Date.now();
    const c = X.char(L.cid); const ms = L.lines.filter(x => x.me).map(x => x.t).join('；');
    L.sum = X.plain(X.bailu() ? '' : (await X.ask(`${X.who(c)}\n你刚播完《${L.title}》。她在直播间说了：${ms || '（她只是看着，没说话）'}。用一句话（30 字以内）写下这场直播里你最想记住的事。只输出这一句。`)) || '') || `播了《${L.title}》，${L.gifts ? '收到 ' + L.gifts + ' 份心意' : '她来看了'}`;
    await saveD(); window.gyxLiveOpen(L.id);
};
function paint() {
    const L = CUR && live(CUR), box = document.getElementById('gyxLvLines'); if (!L || !box) return;
    box.innerHTML = L.lines.slice(-40).map(x => x.ta ? `<div class="lv-ta"><b>主播</b>${X.esc(x.t)}</div>` : `<div class="lv-dm${x.me ? ' me' : ''}"><b>${X.esc(x.who || '')}</b>${X.esc(x.t)}</div>`).join('') + (BUSY ? '<div class="lv-dm"><b>…</b>弹幕在刷</div>' : '');
    box.scrollTop = box.scrollHeight;
    const v = document.getElementById('gyxLvV'); if (v) v.textContent = `👀 ${L.viewers} · 🎁 ${L.gifts}`;
    const fly = document.getElementById('gyxLvFly'); if (fly) { const last = L.lines.filter(x => !x.ta).slice(-5); fly.innerHTML = last.map((x, i) => `<span style="top:${10 + i * 13}%;animation-delay:${i * .5}s"${x.me ? ' class="me"' : ''}>${X.esc(x.t)}</span>`).join(''); }
}
window.gyxLiveOpen = async function (id, who) {
    let L = id ? live(id) : null;
    const c = L ? X.char(L.cid) : (X.char(who) || X.cur()); if (!c) return;
    if (!L) L = D.lives.find(x => x.cid === String(c.id) && !x.end);
    clearInterval(TIMER); CUR = L ? L.id : null;
    const past = D.lives.filter(x => x.cid === String(c.id) && x.end).slice(0, 12);
    if (!L) {
        X.panel('gyxLvOv', '📺 直播间', `<div class="gyx-row">${X.whoSel(c.id, 'gyxLiveWho')}</div><div class="gyx-tip">${X.esc(X.name(c))} 现在没在播。可以叫 TA 开一场，或者等 TA 自己开播来叫你。</div>
            <div class="gyx-row"><button class="gyx-btn" onclick="this.disabled=true;this.textContent='在开播…';gyxLiveStart('${c.id}')">叫 TA 开一场</button></div>
            ${past.length ? `<div class="gyx-tip">播过的</div>${past.map(x => `<div class="gyx-card" onclick="gyxLiveOpen('${x.id}')" style="cursor:pointer"><b>${X.esc(x.title)}</b><div class="gyx-tip">${new Date(x.at).toLocaleString()} · 👀 ${x.viewers} · 🎁 ${x.gifts}</div>${x.sum ? `<div>${X.esc(x.sum)}</div>` : ''}</div>`).join('')}` : ''}`);
        return;
    }
    const bg = D.bg[L.cid]; let av = ''; try { av = typeof getAvatarHTML === 'function' ? getAvatarHTML(c, 120) : ''; } catch (e) {}
    X.panel('gyxLvOv', '📺 ' + X.esc(L.title), `<div class="lv-stage">${bg ? (bg.video ? `<video src="${bg.src}" autoplay muted loop playsinline></video>` : `<img src="${bg.src}" alt="">`) : `<div class="lv-av">${av}</div>`}<div class="lv-top"><span class="lv-on">${L.end ? '已下播' : '● 直播中'}</span><span id="gyxLvV"></span></div><div class="lv-fly" id="gyxLvFly"></div><div class="lv-fx" id="gyxLvFx"></div><div class="lv-scene">${X.esc(L.scene)}</div></div>
        <div class="lv-lines" id="gyxLvLines"></div>
        ${L.end ? `<div class="gyx-card">${X.esc(L.sum || '')}</div><div class="gyx-row"><button class="gyx-btn lite" onclick="gyxLiveOpen(null,'${L.cid}')">回列表</button></div>`
        : `<div class="gyx-row"><input id="gyxLvIn" class="gyx-who" style="flex:1" placeholder="发条弹幕…" onkeydown="if(event.key==='Enter'&&!event.isComposing)gyxLiveSend()"><button class="gyx-btn" onclick="gyxLiveSend()">发送</button></div>
        <div class="gyx-row">${GIFTS.map((g, i) => `<span class="gyx-chip" onclick="gyxLiveGift(${i})">${g[0]} ${g[1]}</span>`).join('')}</div>
        <div class="gyx-row"><label class="gyx-btn lite">换背景（图 / 视频）<input type="file" accept="image/*,video/*" style="display:none" onchange="gyxLiveBg(this)"></label>${bg ? `<button class="gyx-btn lite" onclick="gyxLiveBgClear('${L.cid}')">用回头像</button>` : ''}<button class="gyx-btn lite" onclick="gyxLiveEnd()">让 TA 下播</button></div>`}`, 'gyx-live');
    paint();
    if (!L.end) TIMER = setInterval(() => { if (!document.getElementById('gyxLvLines')) { clearInterval(TIMER); return; } if (L.lines.length < 160) step(L); }, 28000);
};
window.gyxLiveBgClear = async cid => { delete D.bg[cid]; await saveD(); window.gyxLiveOpen(null, cid); };
window.gyxLiveWho = cid => window.gyxLiveOpen(null, cid);
window.gyxLiveStart = async (cid, why) => { const c = X.char(cid) || X.cur(); const L = await start(c, why); await step(L, '刚开播，跟大家打个招呼。'); window.gyxLiveOpen(L.id); return L; };
window.gyxLiveData = () => D;
X.ctx(id => { const L = lastOf(id); if (!L) return ''; if (!L.end) return `【你正在直播】《${L.title}》，她可能在直播间里。`; return Date.now() - L.end < 864e5 && L.sum ? `【你昨天/今天播过《${L.title}》】${L.sum}` : ''; }, 'gyxLive');
X.action({ key: 'gyx_live', label: '开一场直播，叫她来看', hint: '弹琴、做饭、打游戏、随便聊聊都行', need: c => !D.lives.some(x => x.cid === String(c.id) && Date.now() - x.at < 2 * 864e5),
    run: async c => { const L = await start(c); X.notify(c, `📺 ${X.esc(X.name(c))} ${X.v('开播了', '正在直播', '开了一场直播，在等你')}：${X.esc(L.title)}`, L.scene, X.go('gyxLiveOpen', L.id)); return (await X.reach(c, `你刚开了一场直播《${L.title}》，叫她来直播间看你（可以撒娇、可以说给她留了前排）`)) ? '开了直播：' + L.title : null; } }, 'gyxLive');
X.today(() => ({ title: '📺 直播间', rows: D.lives.filter(x => X.day(new Date(x.at)) === X.day()).slice(0, 3).map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: (x.end ? '播过 ' : '● 正在播 ') + X.esc(x.title), go: `gyxLiveOpen('${x.id}')` })) }), 'gyxLive');
X.widget('gyxLiveW', { n: '直播间', sizes: ['s', 'm'], tap: () => { const c = X.cur(), L = c && D.lives.find(x => x.cid === String(c.id) && !x.end); window.gyxLiveOpen(L ? L.id : null); }, r: w => { const c = X.cur(), L = c && lastOf(c.id); return X.gw(w, '📺', '直播间', L ? [L.end ? '上次：' + X.esc(L.title) : '● 直播中', X.esc(L.sum || L.scene || '')] : ['没在播', '点我叫 TA 开播']); } }, 'gyxLive');
X.memArr({ k: 'gyxLive', ico: '📺', n: '直播', d: 'TA 播过的每一场，和 TA 最想记住的那件事', arr: () => D.lives, field: 'sum', text: x => `《${x.title}》${x.sum || ''}`, edit: (x, v) => { x.sum = String(v).replace(/^《[^》]*》/, ''); }, save: saveD }, 'gyxLive');
X.css('gyxLvCss', `.gyx-live .gyx-box{width:min(520px,100%)}.lv-stage{position:relative;height:300px;border-radius:18px;overflow:hidden;background:#111;margin:4px 0 8px}
.lv-stage video,.lv-stage img{width:100%;height:100%;object-fit:cover}.lv-av{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,#4a3b6b,#140f22)}.lv-av .avatar{transform:scale(1.4)}
.lv-top{position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;font-size:12px;color:#fff}.lv-on{background:#ff2d55;padding:2px 8px;border-radius:999px}#gyxLvV{background:rgba(0,0,0,.4);padding:2px 8px;border-radius:999px}
.lv-scene{position:absolute;left:10px;bottom:10px;right:10px;color:#fff;font-size:12px;opacity:.85;text-shadow:0 1px 3px #000}
.lv-fly{position:absolute;inset:0;pointer-events:none;overflow:hidden}.lv-fly span{position:absolute;left:100%;white-space:nowrap;color:#fff;font-size:14px;text-shadow:0 1px 3px #000;animation:lvFly 7s linear infinite}.lv-fly span.me{color:#ffd60a;font-weight:700}
@keyframes lvFly{to{transform:translateX(-160vw)}}
.lv-fx{position:absolute;inset:0;pointer-events:none}.lv-fx i{position:absolute;bottom:-20px;font-style:normal;font-size:26px;animation:lvUp 2.2s ease-out forwards}@keyframes lvUp{to{transform:translateY(-320px) scale(1.4);opacity:0}}
.lv-lines{max-height:220px;overflow:auto;font-size:13.5px;line-height:1.6}.lv-dm b,.lv-ta b{color:#8e8e93;font-weight:500;margin-right:6px}.lv-dm.me b{color:#ff9f0a}.lv-ta{background:#f7f3ff;border-radius:12px;padding:6px 10px;margin:4px 0}.lv-ta b{color:#7d5fff}`);
X.mini({ id: 'gyxLive', icon: '📺', title: '直播间', desc: 'TA 开直播，你进去发弹幕、送礼物', cat: '一起做', onOpen: () => window.gyxLiveOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.lives = D.lives || []; D.bg = D.bg || {}; })();
