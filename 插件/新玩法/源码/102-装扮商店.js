/* 🛍️ 装扮商店：用钱包里的钱买装扮——头像框（樱花、星光、猫耳、彩虹、金边……）、聊天背景、气泡套装（买了直接进「气泡工坊」）。你的、TA 的头像框分开戴，也有一对一对的情侣框。钱包没开就免费拿。TA 也会偷偷买一件送你 */
if (window.__gyxShop) return; window.__gyxShop = 1;
X.feat('gyxShop', { n: '🛍️ 装扮商店', desc: '用钱包里的钱买头像框、聊天背景、气泡套装；TA 也会买来送你' });
const S = X.store('shop');
const ITEMS = [
    { id: 'f_sakura', k: 'frame', n: '樱花框', p: 18, ico: '🌸', css: 'box-shadow:0 0 0 3px #ffb7c9,0 0 0 5px #fff,0 0 10px #ffb7c9', badge: '🌸' },
    { id: 'f_star', k: 'frame', n: '星光框', p: 24, ico: '✨', css: 'box-shadow:0 0 0 3px #ffd84d,0 0 14px #ffd84d', badge: '✨' },
    { id: 'f_cat', k: 'frame', n: '猫耳框', p: 30, ico: '🐱', css: 'box-shadow:0 0 0 3px #3a3a3a', badge: '🐱' },
    { id: 'f_rainbow', k: 'frame', n: '彩虹框', p: 36, ico: '🌈', css: 'box-shadow:0 0 0 2px #ff6b6b,0 0 0 4px #ffd93d,0 0 0 6px #6bcB77,0 0 0 8px #4d96ff', badge: '' },
    { id: 'f_gold', k: 'frame', n: '金边框', p: 66, ico: '👑', css: 'box-shadow:0 0 0 3px #d4af37,0 0 0 5px #fff6d5,0 0 0 6px #d4af37', badge: '👑' },
    { id: 'f_pair_moon', k: 'frame', n: '情侣框 · 日月', p: 52, ico: '🌗', pair: ['☀️', '🌙'], css: 'box-shadow:0 0 0 3px #f6c453,0 0 12px rgba(246,196,83,.7)', css2: 'box-shadow:0 0 0 3px #7d8cff,0 0 12px rgba(125,140,255,.7)' },
    { id: 'f_pair_heart', k: 'frame', n: '情侣框 · 半颗心', p: 52, ico: '💞', pair: ['💗', '💗'], css: 'box-shadow:0 0 0 3px #ff7aa8', css2: 'box-shadow:0 0 0 3px #ff7aa8' },
    { id: 'b_peach', k: 'bg', n: '蜜桃渐变', p: 12, ico: '🍑', css: 'background:linear-gradient(160deg,#fff1eb,#ffd6e0)!important' },
    { id: 'b_mint', k: 'bg', n: '薄荷格子', p: 12, ico: '🌿', css: 'background:#f2fbf6 repeating-linear-gradient(0deg,transparent 0 23px,rgba(80,170,120,.12) 23px 24px),repeating-linear-gradient(90deg,transparent 0 23px,rgba(80,170,120,.12) 23px 24px)!important' },
    { id: 'b_night', k: 'bg', n: '夜空', p: 20, ico: '🌌', css: 'background:radial-gradient(#fff 1px,transparent 1.5px) 0 0/38px 38px,linear-gradient(#141a3a,#2b2250)!important' },
    { id: 'b_dots', k: 'bg', n: '奶油波点', p: 12, ico: '🥛', css: 'background:#fffaf0 radial-gradient(#f3d9b1 2px,transparent 2.5px) 0 0/22px 22px!important' },
    { id: 'b_sky', k: 'bg', n: '晴天', p: 16, ico: '☁️', css: 'background:linear-gradient(#bfe3ff,#f2f9ff)!important' },
    { id: 'u_jelly', k: 'bubble', n: '气泡 · 果冻', p: 28, ico: '🍬', cfg: { me: { bg: '#ff8fb1', fg: '#fff', r: 24, sh: 6 }, ta: { bg: '#a0c4ff', fg: '#fff', r: 24, sh: 6 } } },
    { id: 'u_ink', k: 'bubble', n: '气泡 · 水墨', p: 28, ico: '🖌️', cfg: { me: { bg: '#2f2f2f', fg: '#f5f1e8', r: 6 }, ta: { bg: '#f5f1e8', fg: '#2f2f2f', r: 6, bw: 1, bc: '#2f2f2f' } } },
    { id: 'u_choco', k: 'bubble', n: '气泡 · 巧克力', p: 28, ico: '🍫', cfg: { me: { bg: '#7b4b2a', fg: '#fff3e6', r: 18 }, ta: { bg: '#fff3e6', fg: '#5a3418', r: 18 } } }
];
let D = { own: [], wear: { me: '', ta: {}, bg: '' }, gifts: [] };   // own: [itemId]；wear.ta[cid] = frameId；gifts: {id,cid,at,item,line}
const saveD = () => S.set('d', D);
const item = id => ITEMS.find(x => x.id === id);
const wallet = () => window.gyWallet && typeof window.gyWallet.spend === 'function' ? window.gyWallet : null;
async function pay(who, it) { const w = wallet(); if (!w) return { ok: true, free: true }; const r = await w.spend(who, it.p, '装扮商店：' + it.n, { cat: '装扮' }); return r && r.skipped ? { ok: true, free: true } : r; }
let lastCss = null;
function apply() {
    if (!X.on('gyxShop')) { if (lastCss) { lastCss = ''; const st = document.getElementById('gyxShopLive'); if (st) st.textContent = ''; } return; }
    let sid = null; try { sid = typeof currentChatSessionId !== 'undefined' ? String(currentChatSessionId) : null; } catch (e) {}
    const R = 'html body #view-chat', av = side => `${R} .chat-msg-row.${side}>div:not(.chat-bubble-wrapper)`;
    let css = '';
    const fm = item(D.wear.me), ft = item(sid && D.wear.ta[sid]);
    const fr = (it, side, second) => it ? `${av(side)} .avatar{${second && it.css2 ? it.css2 : it.css}!important;position:relative}${av(side)}{position:relative}${(it.pair ? it.pair[second ? 1 : 0] : it.badge) ? `${av(side)}::after{content:"${it.pair ? it.pair[second ? 1 : 0] : it.badge}";position:absolute;right:-4px;top:-6px;font-size:14px;pointer-events:none}` : ''}` : '';
    css += fr(fm, 'me', false) + fr(ft, 'other', !!(ft && ft.pair));
    const bg = item(D.wear.bg); if (bg) css += `${R} #chatMessagesArea{${bg.css}}`;
    if (css === lastCss) return; lastCss = css;
    let st = document.getElementById('gyxShopLive'); if (!st) { st = document.createElement('style'); st.id = 'gyxShopLive'; document.head.appendChild(st); } st.textContent = css;
}
function toBubble(it) { try { const B = window.gyxBubbleData && window.gyxBubbleData(); if (!B) return false; if (!B.themes.some(t => t.shop === it.id)) B.themes.unshift({ id: 'bw' + Date.now().toString(36), n: it.n.replace('气泡 · ', ''), by: 'me', at: Date.now(), shop: it.id, cfg: JSON.parse(JSON.stringify(it.cfg)) }); X.store('bubble').set('d', B); return true; } catch (e) { return false; } }
window.gyxShopBuy = async id => {
    const it = item(id); if (!it || D.own.includes(id)) return;
    const r = await pay('me', it); if (!r || !r.ok) { X.toast('没买成', (r && r.reason) || '钱包里没有能用的卡'); return; }
    D.own.push(id); if (it.k === 'bubble') toBubble(it); await saveD();
    X.toast(X.v('买到啦', '🛍️ 到手', '装进衣柜了'), it.ico + ' ' + it.n + (r.free ? '（钱包没开，免费拿）' : ' · ¥' + it.p)); window.gyxShopOpen();
};
window.gyxShopWear = async (id, who) => {
    const it = item(id); let sid = null; try { sid = String(currentChatSessionId); } catch (e) {}
    if (who === 'bg') D.wear.bg = D.wear.bg === id ? '' : id;
    else if (who === 'me') D.wear.me = D.wear.me === id ? '' : id;
    else if (who === 'pair') { const c = X.cur(); if (c) { const on = D.wear.me === id; D.wear.me = on ? '' : id; D.wear.ta[String(c.id)] = on ? '' : id; } }
    else { const c = X.char(who) || X.cur(); if (c) D.wear.ta[String(c.id)] = D.wear.ta[String(c.id)] === id ? '' : id; }
    if (it && it.k === 'bubble') { try { window.gyxBubbleOpen && window.gyxBubbleOpen(); } catch (e) {} return; }
    await saveD(); lastCss = null; apply(); window.gyxShopOpen();
};
window.gyxShopWho = who => { window.__gyxShopWho = who; window.gyxShopOpen(); };
window.gyxShopOpen = function (tab) {
    const T = tab || window.__gyxShopTab || 'frame'; window.__gyxShopTab = T; const c = (window.__gyxShopWho && X.char(window.__gyxShopWho)) || X.cur() || X.chars()[0], w = wallet();
    let bal = ''; try { if (w) bal = '钱包余额 ¥' + (w.total('me') || 0); } catch (e) {}
    const L = ITEMS.filter(x => x.k === T);
    X.panel('gyxShopOv', '🛍️ 装扮商店', `${c && X.chars().length > 1 ? `<div class="gyx-row">给谁戴：${X.whoSel(String(c.id), 'gyxShopWho')}</div>` : ''}<div class="gyx-row">${[['frame', '头像框'], ['bg', '聊天背景'], ['bubble', '气泡套装']].map(([k, n]) => `<span class="gyx-chip ${T === k ? 'on' : ''}" onclick="gyxShopOpen('${k}')">${n}</span>`).join('')}<span class="gyx-tip" style="margin-left:auto">${bal || '钱包没开：免费拿'}</span></div>
        <div class="sh-grid">${L.map(it => { const own = D.own.includes(it.id), wm = D.wear.me === it.id, wt = c && D.wear.ta[String(c.id)] === it.id, wb = D.wear.bg === it.id; return `<div class="sh-it${own ? ' own' : ''}"><div class="sh-pv ${it.k}" style="${it.k === 'frame' ? '' : it.k === 'bg' ? it.css.replace(/!important/g, '') : `background:${it.cfg.me.bg}`}">${it.k === 'frame' ? `<i style="${it.css}">${it.pair ? it.pair[0] : it.badge || ''}</i>` : it.k === 'bubble' ? `<i style="background:${it.cfg.ta.bg};color:${it.cfg.ta.fg};border-radius:${it.cfg.ta.r}px">在吗</i>` : ''}</div><b>${it.ico} ${X.esc(it.n)}</b>
            ${own ? (it.k === 'frame' ? (it.pair ? `<span class="gyx-chip ${wm && wt ? 'on' : ''}" onclick="gyxShopWear('${it.id}','pair')">${wm && wt ? '摘下' : '一起戴'}</span>` : `<span class="gyx-chip ${wm ? 'on' : ''}" onclick="gyxShopWear('${it.id}','me')">${wm ? '摘下' : '我戴'}</span>${c ? `<span class="gyx-chip ${wt ? 'on' : ''}" onclick="gyxShopWear('${it.id}','${c.id}')">${wt ? '摘下' : '给 ' + X.esc(X.name(c))}</span>` : ''}`) : it.k === 'bg' ? `<span class="gyx-chip ${wb ? 'on' : ''}" onclick="gyxShopWear('${it.id}','bg')">${wb ? '换回去' : '用上'}</span>` : `<span class="gyx-chip" onclick="gyxShopWear('${it.id}','bubble')">去气泡工坊用</span>`)
            : `<button class="gyx-btn" onclick="gyxShopBuy('${it.id}')">¥${it.p}</button>`}</div>`; }).join('')}</div>
        ${D.gifts.slice(0, 5).map(g => `<div class="gyx-tip">🎁 ${X.esc(X.name(X.char(g.cid)))} 送了你 ${X.esc((item(g.item) || {}).n || '')}${g.line ? '：' + X.esc(g.line) : ''}</div>`).join('')}`, 'gyx-shop');
};
window.gyxShopData = () => D;
window.gyxShopCss = () => lastCss;
async function gift(c) {
    const L = ITEMS.filter(x => !D.own.includes(x.id)); if (!L.length) return null; const it = X.pick(L);
    const w = wallet(); try { if (w) await w.spend(c.id, it.p, '给她买装扮：' + it.n, { cat: '礼物' }); } catch (e) {}
    const line = X.bailu() ? '' : X.plain(await X.ask(`${X.who(c)}\n你在装扮商店偷偷给她买了「${it.n}」。送她的时候说一句（20 字以内）。只输出这一句。`) || '');
    D.own.push(it.id); if (it.k === 'bubble') toBubble(it); if (it.k === 'frame' && it.pair) { D.wear.me = it.id; D.wear.ta[String(c.id)] = it.id; }
    const g = { id: 'sg' + Date.now().toString(36), cid: String(c.id), at: Date.now(), item: it.id, line }; D.gifts.unshift(g); D.gifts = D.gifts.slice(0, 40); await saveD(); lastCss = null; apply(); return g;
}
window.gyxShopGift = id => gift(X.char(id) || X.cur());
X.ctx(id => { const g = D.gifts.find(x => x.cid === String(id) && Date.now() - x.at < 2 * 864e5); const f = item(D.wear.ta[String(id)]); return (g ? `【你送了她装扮「${(item(g.item) || {}).n}」】` : '') + (f ? `【你现在戴着她给你挑的头像框「${f.n}」】` : ''); }, 'gyxShop');
X.action({ key: 'gyx_shop', label: '在装扮商店偷偷给她买一件（头像框 / 聊天背景 / 气泡）', hint: '她会在聊天界面看到', need: c => ITEMS.some(x => !D.own.includes(x.id)) && !D.gifts.some(g => g.cid === String(c.id) && Date.now() - g.at < 5 * 864e5),
    run: async c => { const g = await gift(c); if (!g) return null; const it = item(g.item); X.notify(c, `🎁 ${X.esc(X.name(c))} ${X.v('送了你一件装扮', '在商店给你买了东西', '偷偷给你买了')}：${X.esc(it.n)}`, g.line, X.go('gyxShopOpen', it.k)); return (await X.reach(c, `你在装扮商店给她买了「${it.n}」${it.pair ? '（一对情侣框，你们俩已经戴上了）' : ''}${g.line ? '，你想说：' + g.line : ''}`)) ? '送了装扮：' + it.n : null; } }, 'gyxShop');
X.today(() => ({ title: '🛍️ 装扮', rows: D.gifts.filter(g => X.day(new Date(g.at)) === X.day()).map(g => ({ t: X.esc(X.name(X.char(g.cid))), x: '送了 ' + X.esc((item(g.item) || {}).n || ''), go: 'gyxShopOpen()' })) }), 'gyxShop');
X.widget('gyxShopW', { n: '装扮商店', sizes: ['s', 'm'], tap: () => window.gyxShopOpen(), r: w => { const f = item(D.wear.me); return X.gw(w, '🛍️', '装扮', [f ? '戴着 ' + f.ico + ' ' + X.esc(f.n) : `${D.own.length}/${ITEMS.length} 件`, D.gifts[0] ? 'TA 送的：' + X.esc((item(D.gifts[0].item) || {}).n || '') : '']); } }, 'gyxShop');
X.memArr({ k: 'gyxShop', ico: '🛍️', n: 'TA 送的装扮', d: 'TA 在装扮商店给你买的', arr: () => D.gifts, field: 'line', text: g => `${(item(g.item) || {}).n || ''}${g.line ? '｜' + g.line : ''}`, edit: (g, v) => { g.line = String(v).split('｜').slice(1).join('｜'); }, save: saveD }, 'gyxShop');
X.css('gyxShopCss', `.gyx-shop .gyx-box{width:min(620px,100%)}.sh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-top:8px}
.sh-it{background:#f7f7f9;border-radius:16px;padding:10px;display:flex;flex-direction:column;gap:6px;align-items:center;font-size:13px;text-align:center}.sh-it.own{background:#fff5f8}.sh-it b{font-weight:500}
.sh-pv{width:100%;height:76px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#fff}.sh-pv.frame i{width:44px;height:44px;border-radius:50%;background:#d6d6de;display:flex;align-items:flex-start;justify-content:flex-end;font-style:normal;font-size:13px}
.sh-pv.bubble i{font-style:normal;padding:6px 12px;font-size:13px}`);
X.mini({ id: 'gyxShop', icon: '🛍️', title: '装扮商店', desc: '头像框、聊天背景、气泡套装', cat: '生活', onOpen: () => window.gyxShopOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.own = D.own || []; D.wear = Object.assign({ me: '', ta: {}, bg: '' }, D.wear || {}); D.gifts = D.gifts || []; apply(); setInterval(apply, 1500); })();
