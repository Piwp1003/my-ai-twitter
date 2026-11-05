/* 🛍️ 拼多多：照着拼多多的样子做的购物软件——商城、外卖、装扮、钱包、快递全在一个 App 里（数据还是原来那几处的，只是换了一张脸）。
   · 首页：搜索、十个入口、限时秒杀（倒计时到半夜）、百亿补贴、两列商品流
   · 商品详情：拼单价 / 单独购买、先用后付、「这些人在拼」——TA 开的团你直接去拼
   · 发起拼单：挑一个 TA 一起拼，TA 自己决定拼不拼（会在聊天里回你）
   · 帮我砍一刀：挑一样东西，自己先砍一大刀，剩下的叫 TA 帮砍；砍到 0 就免费拿
   · 多多外卖：就是原来的外卖（店有性格、真的在配送）
   · 个人中心：钱包余额、在路上的快递、订单、拼单、砍价进度
   · TA 自己会：开团叫你去拼、看到你在砍价主动帮你砍一刀 */
if (window.__gysPdd) return; window.__gysPdd = 1;
const G = window.GYS, APP = 'pdd', esc = G.esc;
X.feat('gysPdd', { n: '🛍️ 拼多多', desc: '商城、外卖、装扮、钱包、快递一个 App 里逛；拼单、砍一刀、限时秒杀；TA 会开团叫你拼、帮你砍' });
G.APPS.pdd = { n: '拼多多', ico: '🛍️', feat: 'gysPdd' };
const ST = X.store('gyspdd');
let D = { groups: [], cuts: [], q: '', last: {}, seen: 0 };
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();
(async () => { D = Object.assign(D, await ST.get('d', {})); D.groups = D.groups || []; D.cuts = D.cuts || []; D.last = D.last || {}; })();
const P = window.gysPdd = {};
let BUSY = '';

/* ---------------- 数据（都从商城 / 钱包 / 外卖那边拿） ---------------- */
const M = () => (typeof window.gymallState === 'function' ? window.gymallState() : null) || { products: [], orders: [] };
const prods = () => M().products || [];
const prodOf = id => prods().find(p => p.id === id);
const price = p => Math.max(0, parseFloat(p && p.price) || 0);
const r1 = n => Math.round(n * 10) / 10;
const groupPrice = p => Math.max(0.1, r1(price(p) * 0.85));
const flashPrice = p => Math.max(0.1, r1(price(p) * 0.6));
const subsidy = p => price(p) >= 30;
const money = n => '¥' + (Math.round(n * 100) / 100).toFixed(Number(n) % 1 ? (Math.round(n * 100) % 10 ? 2 : 1) : 0);
const sold = p => { let h = 0; String(p.id).split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) % 99991; }); const n = 300 + h * 7 % 48000; return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n); };
const chars = () => (typeof myCharacters !== 'undefined' ? myCharacters : []).filter(c => c && !c.members);
const charOf = id => chars().find(c => String(c.id) === String(id));
const nm = c => X.name(c);
const wal = () => { try { return window.gyWallet && typeof window.gyWallet.total === 'function' ? window.gyWallet.total('me') : null; } catch (e) { return null; } };
const orders = () => (M().orders || []).filter(o => o.boughtBy === 'me' || o.forWhom === 'me');
const onWay = () => orders().filter(o => o.status !== 'delivered');
const openGroups = () => D.groups.filter(g => !g.done && g.until > Date.now());
const openCuts = () => D.cuts.filter(c => !c.done && c.until > Date.now());
const left = c => Math.max(0, r1(c.total - c.cut));
const midnight = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); };
const hms = ms => { ms = Math.max(0, ms); const h = Math.floor(ms / 3600e3), m = Math.floor(ms / 60e3) % 60, s = Math.floor(ms / 1e3) % 60; return [h, m, s].map(x => String(x).padStart(2, '0')).join(':'); };
const PAL = ['#fff1e6', '#eaf4ff', '#f3ecff', '#ffecef', '#eafaf0', '#fff8db'];
const bg = p => { let h = 0; String((p && (p.name || p.id)) || '').split('').forEach(c => { h = (h * 33 + c.charCodeAt(0)) % 9973; }); return PAL[h % PAL.length]; };

/* ---------------- 进货：货架空的时候让 AI 摆一批 ---------------- */
P.restock = async () => {
    if (BUSY) return; BUSY = 'stock'; G.repaint(APP);
    try {
        const c = X.cur();
        const r = X.json(await X.ask(`给一个拼多多风格的购物软件上架 10 样商品。${c ? '买东西的人和 ' + nm(c) + ' 是一对，' + X.who(c).slice(0, 300) + '\n' : ''}要日常、便宜、有生活感（零食、日用、小摆件、衣服、给对象的小礼物都可以），标题像拼多多那样长一点、带卖点。
只输出 JSON 数组：[{"name":"商品标题（20 字以内）","price":"价格数字","emoji":"一个 emoji","desc":"一句话卖点","tag":"百亿补贴/秒杀/新品/包邮 选一个或空"}]`));
        const L = Array.isArray(r) && r.length ? r : [
            { name: '手冲咖啡套装 玻璃滤杯+分享壶', price: 39.9, emoji: '☕', desc: '送 100 张滤纸', tag: '百亿补贴' },
            { name: '羊绒围巾 男女同款 冬季加厚', price: 59, emoji: '🧣', desc: '软糯不扎', tag: '' },
            { name: '自动折叠雨伞 超大双人', price: 12.8, emoji: '☂️', desc: '一键开合', tag: '秒杀' },
            { name: '香薰蜡烛 助眠 卧室', price: 6.6, emoji: '🕯️', desc: '雪松味', tag: '' },
            { name: '小熊玩偶 抱枕 情侣礼物', price: 19.9, emoji: '🧸', desc: '30cm', tag: '' },
            { name: '樱花头像框 情侣款', price: 18, emoji: '🌸', desc: '两个人一套', tag: '新品' },
            { name: '番茄 新鲜 5 斤装 沙瓤', price: 9.9, emoji: '🍅', desc: '产地直发', tag: '百亿补贴' },
            { name: '保温杯 316 不锈钢 大容量', price: 29.9, emoji: '🥤', desc: '12 小时保温', tag: '' }];
        await (window.gymallAddItems || (async () => []))(L.slice(0, 12));
        X.toast('货架上新了', L.length + ' 样');
    } finally { BUSY = ''; G.repaint(APP); }
};

/* ---------------- 首页 ---------------- */
const GRID = [['⚡', '限时秒杀', "gysPdd.flash()", '#fff0ec'], ['💰', '百亿补贴', "GYS.tab('pdd','home');gysPdd.sub()", '#fff6e0'], ['🛵', '多多外卖', "GYS.tab('pdd','to')", '#fff8d6'], ['🎀', '装扮商店', "gysPdd.shop()", '#ffeef6'], ['🏪', 'TA 的小店', "gysPdd.taShop()", '#e9f3ff'],
    ['🔪', '帮我砍一刀', "gysPdd.cutPick()", '#ffeef0'], ['📦', '我的快递', "gysPdd.orders()", '#fff3e6'], ['👛', '钱包', "gysPdd.wallet()", '#ffeff3'], ['🧾', '我的订单', "gysPdd.orders()", '#f0f2ff'], ['🎁', '给 TA 买', "gysPdd.forTa()", '#ffefe8']];
function card(p) {
    const g = openGroups().find(x => x.pid === p.id && x.by !== 'me');
    return `<div class="pd-card" onclick="gysPdd.item('${p.id}')"><div class="pd-pic" style="background:${bg(p)}">${esc(p.emoji || '📦')}</div>
      <div class="pd-t">${subsidy(p) ? '<span class="pd-lab g">百亿补贴</span>' : p.tag ? `<span class="pd-lab">${esc(p.tag)}</span>` : ''}${p.byChar && charOf(p.ownerId) ? `<span class="pd-lab">${esc(nm(charOf(p.ownerId)))}的小店</span>` : ''}${esc(p.name)}</div>
      <div class="pd-bt"><b class="pd-p"><small>¥</small>${groupPrice(p)}</b><span>${g ? esc(nm(charOf(g.by.slice(2)) || {})) + ' 在拼' : '已拼 ' + sold(p) + '件'}</span></div></div>`;
}
function home() {
    const q = (D.q || '').trim(), all = prods(), L = q ? all.filter(p => (p.name + (p.description || '')).includes(q)) : all;
    const fl = all.slice(0, 4), cut = openCuts()[0], grp = openGroups().filter(g => g.by !== 'me')[0];
    return `<div class="pd-red"><div class="pd-search"><span>🔍</span><input id="pdQ" placeholder="搜商品、外卖、装扮" value="${esc(q)}" onkeydown="if(event.key==='Enter')gysPdd.search(this.value)"><b onclick="gysPdd.search(document.getElementById('pdQ').value)">搜索</b></div>
      <div class="pd-tabs"><span class="on">首页</span><span onclick="gysPdd.sub()">百亿补贴</span><span onclick="GYS.tab('pdd','to')">外卖</span><span onclick="gysPdd.shop()">装扮</span><span onclick="gysPdd.taShop()">TA 的小店</span></div></div>
      ${q ? '' : `<div class="pd-grid">${GRID.map(([e, t, f, c]) => `<div class="pd-gi" onclick="${f}"><i style="background:${c}">${e}</i>${t}</div>`).join('')}</div>`}
      ${grp && !q ? `<div class="pd-bar" onclick="gysPdd.item('${grp.pid}')">👥 <b>${esc(nm(charOf(grp.by.slice(2)) || {}))}</b> 开了个团：${esc((prodOf(grp.pid) || {}).name || '')}<span>去拼单 ›</span></div>` : ''}
      ${cut && !q ? `<div class="pd-cutbar" onclick="gysPdd.cut('${cut.id}')"><b>🔪 ${esc((prodOf(cut.pid) || {}).name || '')}</b> 还差 ${money(left(cut))} 就免费拿<div class="pd-meter"><i style="width:${Math.min(100, cut.cut / cut.total * 100)}%"></i></div></div>` : ''}
      ${!q && fl.length ? `<div class="pd-sale"><h4>限时秒杀 <em id="pdCd">${hms(midnight() - Date.now())}</em><span onclick="gysPdd.flash()">更多 ›</span></h4><div class="pd-row">${fl.map(p => `<div class="pd-it" onclick="gysPdd.item('${p.id}','flash')"><div class="pd-pic" style="background:${bg(p)}">${esc(p.emoji || '📦')}</div><b class="pd-p">¥${flashPrice(p)}</b></div>`).join('')}</div></div>` : ''}
      ${L.length ? `<div class="pd-feed">${L.map(card).join('')}</div>` : `<div class="pd-empty">${q ? '没搜到「' + esc(q) + '」' : '货架还是空的'}<br><span class="pd-btn" onclick="gysPdd.restock()">${BUSY === 'stock' ? '正在进货…' : '🛒 进一批货'}</span></div>`}`;
}
P.search = v => { D.q = String(v || '').trim(); saveD(); G.repaint(APP); };
P.sub = () => G.push(APP, { title: '百亿补贴', cls: 'pd-bodyb', html: () => { const L = prods().filter(subsidy); return `<div class="pd-subhd">💰 百亿补贴 · 大牌低价</div>${L.length ? `<div class="pd-feed">${L.map(card).join('')}</div>` : '<div class="pd-empty">30 块以上的东西才有补贴，现在还没有</div>'}`; } });
P.flash = () => G.push(APP, { title: '限时秒杀', cls: 'pd-bodyb', html: () => `<div class="pd-subhd">⚡ 今天的秒杀 · 还剩 ${hms(midnight() - Date.now())}</div>` + prods().slice(0, 12).map(p => `<div class="pd-li" onclick="gysPdd.item('${p.id}','flash')"><div class="pd-pic s" style="background:${bg(p)}">${esc(p.emoji || '📦')}</div><div class="pd-lm"><b>${esc(p.name)}</b><span><b class="pd-p">¥${flashPrice(p)}</b> <s>¥${price(p)}</s></span></div><span class="pd-go">抢</span></div>`).join('') });
P.taShop = () => G.push(APP, { title: 'TA 的小店', cls: 'pd-bodyb', html: () => { const L = prods().filter(p => p.byChar && charOf(p.ownerId)); return L.length ? `<div class="pd-feed">${L.map(card).join('')}</div>` : '<div class="pd-empty">TA 们还没开店。<br>在 设置 → 自动化 里打开「角色自己上架」，TA 会挂自己的东西出来卖</div>'; } });
P.shop = () => { if (typeof window.gyxShopOpen === 'function') window.gyxShopOpen(); else X.toast('装扮商店没开', '在 设置 → 🧩 新玩法 里打开'); };
P.wallet = () => { G.close(APP); try { if (typeof window.gyWalletPanel === 'function') return window.gyWalletPanel(); } catch (e) {} try { switchMainView('profile'); } catch (e) {} };
P.forTa = async () => { const L = chars(); if (!L.length) return X.toast('还没有角色', ''); const i = await G.sheet(L.map(nm), '给谁买？'); if (i == null) return; D.forTa = String(L[i].id); saveD(); X.toast('挑好了点「单独购买」或「发起拼单」', '会寄给 ' + nm(L[i])); };

/* ---------------- 商品详情 ---------------- */
P.item = (pid, mode) => {
    const p = prodOf(pid); if (!p) return X.toast('这件东西下架了', '');
    G.push(APP, { id: 'it' + pid, title: '', cls: 'pd-itemb', html: () => {
        const GL = openGroups().filter(g => g.pid === pid && g.by !== 'me'), mine = openGroups().find(g => g.pid === pid && g.by === 'me'), fl = mode === 'flash';
        const pr = fl ? flashPrice(p) : groupPrice(p), ta = D.forTa && charOf(D.forTa);
        return `<div class="pd-hero" style="background:linear-gradient(160deg,${bg(p)},#fff)">${esc(p.emoji || '📦')}</div>
          <div class="pd-pr"><b>¥${pr}</b><s>¥${price(p)}</s><span>已拼 ${sold(p)}件</span></div>
          <div class="pd-labs">${subsidy(p) ? '<span>百亿补贴</span>' : ''}<span>退货包运费</span><span>极速发货</span>${fl ? '<span>限时秒杀</span>' : ''}</div>
          <div class="pd-later">✓ 先用后付 ｜ 支持 0 元下单，确认收货后再付款</div>
          <div class="pd-name">${esc(p.name)}${p.description ? `<small>${esc(p.description)}</small>` : ''}</div>
          ${ta ? `<div class="pd-for">🎁 这一单寄给 <b>${esc(nm(ta))}</b><span onclick="gysPdd.forMe()">改成给自己</span></div>` : ''}
          <div class="pd-sec"><h4>这些人在拼，可以直接参与</h4>${GL.length ? GL.map(g => { const c = charOf(g.by.slice(2)); return `<div class="pd-gr"><span class="pd-av">${esc((nm(c) || '?').slice(-1))}</span><div><b>${esc(nm(c))}</b><em>${esc(g.line || '拼一个？')}</em></div><div class="pd-grr"><small>还差 1 人拼成<br>剩余 ${hms(g.until - Date.now())}</small><span class="pd-go" onclick="gysPdd.join('${g.id}')">去拼单</span></div></div>`; }).join('') : `<div class="pd-dim">${mine ? `你开的团还在等 ${esc(nm(charOf(mine.with) || {}))}…` : '还没人开团。点下面「发起拼单」，叫一个 TA 跟你拼'}</div>`}</div>
          <div class="pd-sec"><h4>帮我砍一刀</h4><div class="pd-dim">砍到 0 元就免费拿。自己先砍一大刀，剩下的叫 TA 帮你砍。</div><span class="pd-btn s" onclick="gysPdd.cutStart('${pid}')">🔪 砍一刀免费拿</span></div>`;
    }, foot: () => { const pr = mode === 'flash' ? flashPrice(p) : groupPrice(p); return `<div class="pd-foot"><span class="pd-fi" onclick="gysPdd.store('${pid}')">🏪<em>店铺</em></span><span class="pd-fi" onclick="gysPdd.ask('${pid}')">💬<em>问 TA</em></span><span class="pd-solo" onclick="gysPdd.buy('${pid}',${mode === 'flash' ? flashPrice(p) : price(p)},'${mode === 'flash' ? '秒杀' : '单独购买'}')"><b>¥${mode === 'flash' ? flashPrice(p) : price(p)}</b>${mode === 'flash' ? '马上抢' : '单独购买'}</span><span class="pd-grp" onclick="gysPdd.startGroup('${pid}')"><b>¥${pr}</b>发起拼单</span></div>`; } });
};
P.forMe = () => { D.forTa = ''; saveD(); G.repaint(APP); };
P.store = pid => { const p = prodOf(pid); const c = p && p.byChar && charOf(p.ownerId); if (c) return P.taShop(); X.toast('官方旗舰店', '好评率 98%'); };
P.ask = async pid => { const p = prodOf(pid), c = X.cur(); if (!p || !c) return; G.close(APP); try { switchMainView('chat'); if (typeof switchChatSession === 'function') switchChatSession(c.id); } catch (e) {} setTimeout(() => { const i = document.getElementById('chatInput'); if (i) { i.value = `拼多多上这个怎么样：${p.emoji || ''}${p.name}，拼单 ¥${groupPrice(p)}`; i.focus(); } }, 300); };
async function order(pid, pr, why) {
    const p = prodOf(pid); if (!p || typeof window.gymallBuyAt !== 'function') return null;
    const to = D.forTa && charOf(D.forTa) ? String(D.forTa) : 'me';
    const o = await window.gymallBuyAt(pid, to, { price: pr, reason: '在拼多多上' + why + (to === 'me' ? '的。' : '，寄给 ' + nm(charOf(to)) + '。'), src: 'pdd' });
    if (to !== 'me') { D.forTa = ''; saveD(); }
    return o;
}
P.buy = async (pid, pr, why) => { const o = await order(pid, pr, why); if (o) { X.toast(X.v('下单成功', '买到了', '已下单'), '¥' + pr + ' · 先用后付'); G.back ? G.back(APP) : G.repaint(APP); } };

/* ---------------- 拼单 ---------------- */
P.startGroup = async pid => {
    const p = prodOf(pid), L = chars(); if (!p) return; if (!L.length) return X.toast('还没有角色', '');
    const i = await G.sheet(L.map(c => '和 ' + nm(c) + ' 拼'), '叫谁一起拼？'); if (i == null) return;
    const c = L[i], g = { id: 'pg' + Date.now().toString(36), pid, by: 'me', with: String(c.id), at: Date.now(), until: Date.now() + 24 * 3600e3, done: false };
    D.groups.unshift(g); saveD(); G.repaint(APP); X.toast('拼单发出去了', '等 ' + nm(c) + ' 回你');
    let r = X.json(await X.ask(`${X.who(c)}\n她在拼多多上发起拼单，叫你一起拼：${p.emoji || ''}${p.name}，拼单价 ¥${groupPrice(p)}（单买 ¥${price(p)}）。按你的性格决定拼不拼、回她一句（口语，像微信）。只输出 JSON：{"join":true/false,"line":"回她的话"}`));
    if (!r) r = { join: Math.random() < 0.8, line: X.v('拼了。', '行，算我一个。', '又在拼多多上买东西？……拼吧。') };
    X.say(c, X.plain(r.line || '拼。'));
    if (r.join !== false) { g.done = true; g.joined = Date.now(); const o = await order(pid, groupPrice(p), '跟 ' + nm(c) + ' 拼单买'); g.orderId = o && o.id; X.toast('拼单成功', nm(c) + ' 跟你拼上了'); }
    else X.toast(nm(c) + ' 没拼', '团还开着，24 小时内可以单独买');
    saveD(); G.repaint(APP);
};
P.join = async gid => {
    const g = D.groups.find(x => x.id === gid); if (!g || g.done) return; const p = prodOf(g.pid), c = charOf(g.by.slice(2)); if (!p) return;
    g.done = true; g.joined = Date.now(); const o = await order(g.pid, groupPrice(p), '拼了 ' + (c ? nm(c) : 'TA') + ' 开的团');
    g.orderId = o && o.id; saveD();
    if (c) X.say(c, X.v('拼上了！', '你拼了？那我也下单了。', '好，拼成了，两份一起到。'));
    X.toast('拼单成功', '两份一起发货'); G.repaint(APP);
};
P.group = gid => { const g = D.groups.find(x => x.id === gid); G.open(APP, 'home'); if (g) P.item(g.pid); };

/* ---------------- 砍一刀 ---------------- */
P.cutPick = async () => {
    const L = prods(); if (!L.length) return P.restock();
    const going = openCuts(); if (going.length) return P.cut(going[0].id);
    const i = await G.sheet(L.slice(0, 12).map(p => (p.emoji || '') + ' ' + p.name + ' ¥' + price(p)), '想免费拿哪个？'); if (i == null) return;
    P.cutStart(L[i].id);
};
P.cutStart = pid => {
    const p = prodOf(pid); if (!p) return; let c = openCuts().find(x => x.pid === pid);
    if (!c) { const tot = Math.max(1, price(p)); c = { id: 'pk' + Date.now().toString(36), pid, total: tot, cut: r1(tot * (0.62 + Math.random() * 0.2)), at: Date.now(), until: Date.now() + 48 * 3600e3, helpers: [], done: false }; D.cuts.unshift(c); saveD(); X.toast('你砍了一大刀', '砍掉 ' + money(c.cut)); }
    P.cut(c.id);
};
P.cut = id => {
    const k = D.cuts.find(x => x.id === id); if (!k) return; const p = prodOf(k.pid) || {};
    G.push(APP, { id: 'cut' + id, title: '帮我砍一刀', cls: 'pd-cutb', html: () => `<div class="pd-cut"><div class="pd-pic" style="background:${bg(p)};width:96px;height:96px;font-size:56px;margin:0 auto">${esc(p.emoji || '📦')}</div>
        <b class="pd-cutn">${esc(p.name || '')}</b>
        ${k.done ? `<div class="pd-cutbig">🎉 砍成功了，免费拿！</div>` : `<div class="pd-cutbig">还差 <b>${money(left(k))}</b> 就免费拿</div><div class="pd-meter big"><i style="width:${Math.min(100, k.cut / k.total * 100)}%"></i></div><div class="pd-dim">剩 ${hms(k.until - Date.now())}，过时没砍完就作废</div>`}
        ${k.done ? '' : `<div class="pd-who">${chars().map(c => { const did = k.helpers.some(h => h.cid === String(c.id) && Date.now() - h.at < 20 * 3600e3); return `<span class="pd-go${did ? ' off' : ''}" onclick="${did ? '' : `gysPdd.help('${id}','${c.id}')`}">${did ? nm(c) + ' 砍过了' : '叫 ' + esc(nm(c)) + ' 帮砍'}</span>`; }).join('')}</div>`}
        <div class="pd-sec" style="text-align:left"><h4>谁帮你砍了</h4>${k.helpers.length ? k.helpers.map(h => `<div class="pd-hl"><span class="pd-av">${esc((nm(charOf(h.cid)) || '?').slice(-1))}</span><div><b>${esc(nm(charOf(h.cid)) || '')}</b> 砍掉 ${money(h.amt)}<em>${esc(h.line || '')}</em></div></div>`).join('') : '<div class="pd-dim">还没人帮你砍</div>'}</div></div>` });
};
async function helpCut(k, c, self) {
    const p = prodOf(k.pid) || {}, rest = left(k); if (!rest || k.done) return null;
    const last = rest <= 0.6 || (k.helpers.length >= 2 && Math.random() < 0.5);
    const amt = last ? rest : r1(Math.max(0.1, rest * (0.25 + Math.random() * 0.35)));
    let line = X.plain(await X.ask(`${X.who(c)}\n她在拼多多上「砍一刀」想免费拿：${p.name || ''}，还差 ¥${rest}。${self ? '你自己看到了，主动去帮她砍了一刀' : '她叫你帮她砍一刀'}，你砍掉了 ¥${amt}${last ? '，刚好砍完，她能免费拿了' : ''}。用你的口吻回她一句（口语，可以吐槽拼多多，一句话）。`) || '') || X.v('砍了。', '砍了一刀，就剩一点了。', '拼多多又来这一套……行，砍了。');
    k.cut = r1(k.cut + amt); k.helpers.unshift({ cid: String(c.id), amt, line, at: Date.now() });
    X.say(c, line);
    if (left(k) <= 0) { k.done = true; k.cut = k.total; const o = await order(k.pid, 0, '砍一刀免费拿'); k.orderId = o && o.id; X.toast('🎉 砍成功了', '免费拿，已经下单'); }
    saveD(); G.repaint(APP); return { amt, line };
}
P.help = async (id, cid) => { const k = D.cuts.find(x => x.id === id), c = charOf(cid); if (!k || !c || BUSY) return; BUSY = 'cut'; try { const r = await helpCut(k, c, false); if (r) X.toast(nm(c) + ' 帮你砍了一刀', '砍掉 ' + money(r.amt)); } finally { BUSY = ''; } };

/* ---------------- 外卖 / 购物车 / 个人中心 ---------------- */
function toTab() { return `<div class="pd-yel"><div class="pd-search"><span>🔍</span><input placeholder="搜店、搜菜" onkeydown="if(event.key==='Enter'&&window.gytoTab)gytoTab('shops')"><b>搜索</b></div></div><div id="gyTakeoutBody" class="pd-to">${typeof window.gyTakeoutHtml === 'function' ? window.gyTakeoutHtml() : '<div class="pd-empty">外卖还没准备好</div>'}</div>`; }
function cartTab() {
    const G2 = D.groups.filter(g => g.by === 'me' && !g.done && g.until > Date.now()), K = openCuts();
    return `<div class="pd-sec"><h4>正在拼的</h4>${G2.length ? G2.map(g => { const p = prodOf(g.pid) || {}; return `<div class="pd-li" onclick="gysPdd.item('${g.pid}')"><div class="pd-pic s" style="background:${bg(p)}">${esc(p.emoji || '📦')}</div><div class="pd-lm"><b>${esc(p.name || '')}</b><span>等 ${esc(nm(charOf(g.with) || {}))} · 剩 ${hms(g.until - Date.now())}</span></div></div>`; }).join('') : '<div class="pd-dim">没有在等人的团</div>'}</div>
      <div class="pd-sec"><h4>正在砍的</h4>${K.length ? K.map(k => { const p = prodOf(k.pid) || {}; return `<div class="pd-li" onclick="gysPdd.cut('${k.id}')"><div class="pd-pic s" style="background:${bg(p)}">${esc(p.emoji || '📦')}</div><div class="pd-lm"><b>${esc(p.name || '')}</b><span>还差 ${money(left(k))}</span></div><span class="pd-go">继续砍</span></div>`; }).join('') : '<div class="pd-dim">没有在砍的</div>'}</div>`;
}
function meTab() {
    const w = wal(), ow = onWay(), me = (typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '我';
    const nGroup = D.groups.filter(g => g.done).length, nTa = orders().filter(o => o.forWhom !== 'me').length, cut = openCuts()[0];
    return `<div class="pd-mehd"><span class="pd-meav">${esc(me.slice(0, 1))}</span><div><b>${esc(me)}</b><em>拼单 ${nGroup} 次 · 给 TA 买过 ${nTa} 次</em></div></div>
      <div class="pd-stat"><div onclick="gysPdd.wallet()"><b>${w == null ? '—' : money(w)}</b>钱包余额</div><div><b>${openCuts().length}</b>在砍价</div><div><b>${openGroups().length}</b>在拼单</div><div onclick="gysPdd.orders()"><b>${ow.length}</b>在路上的快递</div></div>
      <div class="pd-sec"><h4>我的订单<span onclick="gysPdd.orders()">查看全部 ›</span></h4><div class="pd-oi"><span>💳<em>待付款</em></span><span onclick="GYS.tab('pdd','cart')">👥<em>待分享</em>${openGroups().filter(g => g.by === 'me').length ? `<sup>${openGroups().filter(g => g.by === 'me').length}</sup>` : ''}</span><span onclick="gysPdd.orders()">📦<em>待发货</em></span><span onclick="gysPdd.orders()">🚚<em>待收货</em>${ow.length ? `<sup>${ow.length}</sup>` : ''}</span><span onclick="gysPdd.orders()">💬<em>评价</em></span></div></div>
      ${ow.slice(0, 4).map(o => `<div class="pd-li" onclick="gymallDetail('${o.id}')"><div class="pd-pic s">${esc(o.productSnapshot.emoji || '📦')}</div><div class="pd-lm"><b>${esc(o.productSnapshot.name)}${o.forWhom !== 'me' ? ' · 买给' + esc(nm(charOf(o.forWhom)) || 'TA') : ''}</b><span class="pd-gn">运输中</span></div></div>`).join('')}
      ${cut ? `<div class="pd-cutbar" onclick="gysPdd.cut('${cut.id}')"><b>🔪 ${esc((prodOf(cut.pid) || {}).name || '')}</b> 还差 ${money(left(cut))}<div class="pd-meter"><i style="width:${Math.min(100, cut.cut / cut.total * 100)}%"></i></div></div>` : ''}`;
}
P.orders = () => G.push(APP, { title: '我的订单', cls: 'pd-bodyb', html: () => { const L = orders(); return L.length ? L.slice(0, 80).map(o => `<div class="pd-li" onclick="gymallDetail('${o.id}')"><div class="pd-pic s">${esc(o.productSnapshot.emoji || '📦')}</div><div class="pd-lm"><b>${esc(o.productSnapshot.name)}</b><span>¥${esc(o.productSnapshot.price)} · ${o.status === 'delivered' ? '已签收' : '运输中'}${o.forWhom !== 'me' ? ' · 给 ' + esc(nm(charOf(o.forWhom)) || 'TA') : o.boughtBy !== 'me' ? ' · ' + esc(nm(charOf(o.boughtBy)) || 'TA') + ' 送的' : ''}</span></div></div>`).join('') : '<div class="pd-empty">还没有订单</div>'; } });

G.app(APP, {
    tabs: [['home', '🏠', '首页'], ['to', '🛵', '外卖'], ['cart', '🛒', '购物车', () => (openGroups().filter(g => g.by === 'me').length + openCuts().length) || ''], ['me', '👤', '个人中心']],
    head: t => `<div class="gys-hd pd-hd ${t === 'to' ? 'y' : t === 'cart' ? 'w' : ''}"><span class="gys-bk" onclick="GYS.close('${APP}')">${G.ic('back', 22)}</span><b>${{ home: '', to: '多多外卖', cart: '购物车', me: '' }[t]}</b></div>`,
    render: t => t === 'to' ? toTab() : t === 'cart' ? cartTab() : t === 'me' ? meTab() : home(),
    onOpen: () => { clearInterval(P.__cd); P.__cd = setInterval(() => { const e = document.getElementById('pdCd'); if (!G.isOpen || !G.isOpen(APP)) return clearInterval(P.__cd); if (e) e.textContent = hms(midnight() - Date.now()); }, 1000); }
});
window.gysPddOpen = tab => G.open(APP, tab);
window.gysPddGroup = gid => { G.open(APP, 'home'); P.group(gid); };
window.gysPddCut = id => { G.open(APP, 'home'); P.cut(id); };

/* ---------------- 谷雨这边 ---------------- */
X.mini({ id: 'gysPdd', icon: '🛍️', title: '拼多多', desc: '商城、外卖、装扮、钱包、快递一个 App；拼单、砍一刀、限时秒杀', cat: '软件', onOpen: () => G.open(APP) }, 'gysPdd');
const rare = (c, k, h) => Date.now() - ((D.last[k + c.id]) || 0) > h * 3600e3;
const stamp = (c, k) => { D.last[k + c.id] = Date.now(); saveD(); };
X.action({ key: 'gys_pdd_group', label: '在拼多多上开个团，叫她来拼', hint: '看到便宜好东西，叫她一起拼单', need: c => prods().length > 0 && rare(c, 'g', 48) && !openGroups().some(g => g.by === 'c:' + c.id), run: async c => {
    stamp(c, 'g'); const L = prods(), p = L[Math.floor(Math.random() * Math.min(L.length, 10))];
    const line = X.plain(await X.ask(`${X.who(c)}\n你在拼多多上看到「${p.name}」拼单 ¥${groupPrice(p)}，开了个团想叫她一起拼。用你的口吻发给她一句（口语，一句话）。`) || '') || X.v('拼多多上这个，拼不拼？', '开了个团，你来拼一下。', '这个挺便宜的，一起拼。');
    const g = { id: 'pg' + Date.now().toString(36), pid: p.id, by: 'c:' + c.id, at: Date.now(), until: Date.now() + 24 * 3600e3, done: false, line }; D.groups.unshift(g); saveD();
    X.notify(c, `👥 ${nm(c)} 在拼多多开了个团`, (p.emoji || '') + p.name + ' · 去拼单', X.go('gysPddGroup', g.id));
    return { text: line + `（拼多多 · ${p.name} · 拼单 ¥${groupPrice(p)}）`, jump: { fn: 'gysPddGroup', args: [g.id] } };
} }, 'gysPdd');
X.action({ key: 'gys_pdd_cut', label: '主动帮她在拼多多上砍一刀', hint: '她在砍价，你看见了顺手帮她砍', need: c => openCuts().some(k => !k.helpers.some(h => h.cid === String(c.id) && Date.now() - h.at < 20 * 3600e3)), run: async c => {
    const k = openCuts().find(k => !k.helpers.some(h => h.cid === String(c.id) && Date.now() - h.at < 20 * 3600e3)); if (!k) return null;
    const r = await helpCut(k, c, true); if (!r) return null;
    X.notify(c, `🔪 ${nm(c)} 帮你砍了一刀`, '砍掉 ' + money(r.amt), X.go('gysPddCut', k.id));
    return null;   // 话已经说在聊天里了
} }, 'gysPdd');
X.today(() => { const g = openGroups().filter(x => x.by !== 'me'), k = openCuts(); if (!g.length && !k.length) return null; return { title: '🛍️ 拼多多', rows: g.slice(0, 2).map(x => ({ t: nm(charOf(x.by.slice(2)) || {}), x: '开团：' + ((prodOf(x.pid) || {}).name || '') + ' · 去拼', go: `gysPddGroup('${x.id}')` })).concat(k.slice(0, 2).map(x => ({ t: '砍一刀', x: ((prodOf(x.pid) || {}).name || '') + ' 还差 ' + money(left(x)), go: `gysPddCut('${x.id}')` }))) }; }, 'gysPdd');
X.widget('gysPddW', { n: '拼多多', sizes: ['s', 'm'], tap: () => G.open(APP), r: w => { const k = openCuts()[0], g = openGroups().find(x => x.by !== 'me'), ow = onWay().length; return X.gw(w, '🛍️', '拼多多', k ? ['还差 ' + money(left(k)), '🔪 ' + X.esc((prodOf(k.pid) || {}).name || '')] : g ? [X.esc(nm(charOf(g.by.slice(2)) || {})) + ' 开了团', X.esc((prodOf(g.pid) || {}).name || '')] : [ow ? ow + ' 个快递在路上' : '逛逛？', prods().length ? '秒杀还剩 ' + hms(midnight() - Date.now()).slice(0, 5) : '']); } }, 'gysPdd');
X.mem({ k: 'gysPdd', ico: '🛍️', n: '拼多多：拼单和砍价', d: '一起拼过的单、帮你砍过的刀（删了就是忘了这件事）', items: c => D.groups.filter(g => g.by === 'c:' + c.id || g.with === String(c.id)).map(g => ({ g, text: (g.by === 'me' ? '她叫 TA 拼：' : 'TA 开团：') + ((prodOf(g.pid) || {}).name || '') + (g.done ? '（拼成了）' : '') })).concat(D.cuts.filter(k => k.helpers.some(h => h.cid === String(c.id))).map(k => ({ k, text: '帮她砍过：' + ((prodOf(k.pid) || {}).name || '') }))), text: x => x.text, del: (c, i) => { const L = D.groups.filter(g => g.by === 'c:' + c.id || g.with === String(c.id)); if (i < L.length) D.groups = D.groups.filter(g => g !== L[i]); else { const K = D.cuts.filter(k => k.helpers.some(h => h.cid === String(c.id))); const k = K[i - L.length]; if (k) k.helpers = k.helpers.filter(h => h.cid !== String(c.id)); } saveD(); } }, 'gysPdd');
X.ctx(id => { const c = X.char(id); if (!c) return ''; const g = openGroups().filter(x => x.by === 'c:' + c.id || x.with === String(c.id)), k = openCuts(); const L = []; g.forEach(x => L.push((x.by === 'me' ? '她叫你在拼多多拼：' : '你在拼多多开了团叫她拼：') + ((prodOf(x.pid) || {}).name || ''))); if (k.length) L.push('她在拼多多砍价想免费拿：' + ((prodOf(k[0].pid) || {}).name || '') + '，还差 ¥' + left(k[0])); return L.length ? '【拼多多】' + L.join('；') : ''; });
X.css('gysPddCss', `
.gys-root.gys-pdd{--pr:#e02e24;background:#f5f5f5}.gys-root.gys-pdd .gys-body{background:#f5f5f5}
.gys-pdd .pd-hd{background:var(--pr);color:#fff;border:0}.gys-pdd .pd-hd .gys-bk{color:#fff}.gys-pdd .pd-hd.y{background:#ffc300;color:#222}.gys-pdd .pd-hd.y .gys-bk{color:#222}.gys-pdd .pd-hd.w{background:#fff;color:#222}.gys-pdd .pd-hd.w .gys-bk{color:#222}
.pd-red{background:linear-gradient(180deg,#e02e24 0%,#f04a2a 70%,#f5f5f5 100%);padding:0 12px 10px}.pd-yel{background:linear-gradient(180deg,#ffc300,#f5f5f5);padding:0 12px 10px}
.pd-search{height:36px;border-radius:18px;background:#fff;display:flex;align-items:center;padding:0 4px 0 14px;gap:6px;color:#999}.pd-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font-size:14px;color:#222}.pd-search b{background:var(--pr);color:#fff;font-weight:500;border-radius:15px;padding:5px 14px;font-size:13px;cursor:pointer}.pd-yel .pd-search b{background:#ff9500}
.pd-tabs{display:flex;gap:18px;color:rgba(255,255,255,.85);font-size:15px;padding:12px 4px 4px;white-space:nowrap;overflow-x:auto;scrollbar-width:none}.pd-tabs span{cursor:pointer}.pd-tabs .on{color:#fff;font-weight:700}
.pd-grid{background:#fff;border-radius:12px;margin:6px 10px 0;padding:14px 4px 6px;display:grid;grid-template-columns:repeat(5,1fr);row-gap:12px}.pd-gi{display:flex;flex-direction:column;align-items:center;gap:5px;font-size:11.5px;color:#333;cursor:pointer;text-align:center}.pd-gi i{font-style:normal;width:42px;height:42px;border-radius:14px;display:grid;place-items:center;font-size:23px}
.pd-sale,.pd-sec{margin:8px 10px 0;background:#fff;border-radius:12px;padding:10px 12px;color:#222}.pd-sale h4,.pd-sec h4{font-size:15px;display:flex;align-items:center;gap:8px;margin:0 0 6px}.pd-sale h4 em{font-style:normal;background:#222;color:#fff;font-size:11px;border-radius:3px;padding:1px 5px;font-weight:500}.pd-sale h4 span,.pd-sec h4 span{margin-left:auto;font-size:12px;color:#999;font-weight:400;cursor:pointer}
.pd-row{display:flex;gap:8px;margin-top:6px}.pd-it{flex:1;text-align:center;cursor:pointer;min-width:0}.pd-pic{border-radius:8px;display:grid;place-items:center;font-size:34px;aspect-ratio:1}.pd-pic.s{width:58px;height:58px;font-size:30px;flex:none;aspect-ratio:auto;background:#f6f6f6}
.pd-p{color:var(--pr);font-weight:700;font-size:15px}.pd-p small{font-size:11px}
.pd-feed{columns:2;column-gap:7px;padding:8px 10px 20px}.pd-card{break-inside:avoid;background:#fff;border-radius:10px;overflow:hidden;margin-bottom:7px;cursor:pointer;color:#222}.pd-card .pd-pic{border-radius:0;font-size:56px}.pd-t{font-size:13px;line-height:1.35;padding:7px 8px 3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pd-bt{display:flex;align-items:baseline;gap:6px;padding:0 8px 8px}.pd-bt span{font-size:11px;color:#999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pd-lab{display:inline-block;font-size:10px;color:var(--pr);border:1px solid #f3b4ae;border-radius:2px;padding:0 3px;margin-right:3px;line-height:15px;vertical-align:1px}.pd-lab.g{color:#fff;background:var(--pr);border-color:var(--pr)}
.pd-bar,.pd-cutbar{margin:8px 10px 0;background:#fff4f2;border-radius:12px;padding:10px 12px;font-size:13.5px;color:#222;cursor:pointer}.pd-bar span{float:right;color:var(--pr);font-weight:600}.pd-cutbar b{color:var(--pr)}
.pd-meter{height:6px;border-radius:3px;background:#f6d6d2;margin-top:7px;overflow:hidden}.pd-meter i{display:block;height:100%;background:linear-gradient(90deg,#ff7a45,#e02e24);border-radius:3px}.pd-meter.big{height:10px;border-radius:5px;margin:10px 0 6px}
.pd-empty{text-align:center;color:#999;padding:40px 20px;line-height:2;font-size:14px}.pd-btn{display:inline-block;background:var(--pr);color:#fff;border-radius:18px;padding:6px 18px;cursor:pointer;margin-top:8px;font-size:14px}.pd-btn.s{font-size:13px;padding:5px 14px}
.pd-subhd{background:linear-gradient(90deg,#e02e24,#ff7a45);color:#fff;font-weight:700;padding:14px 16px;font-size:16px}
.pd-li{display:flex;align-items:center;gap:10px;background:#fff;margin:8px 10px 0;border-radius:12px;padding:10px;cursor:pointer;color:#222}.pd-lm{flex:1;min-width:0}.pd-lm b{display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pd-lm span{font-size:12px;color:#888}.pd-lm s{color:#bbb}.pd-gn{color:#34c759!important}
.pd-go{background:var(--pr);color:#fff;border-radius:6px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}.pd-go.off{background:#ddd;color:#888;cursor:default}
.pd-hero{height:300px;display:grid;place-items:center;font-size:120px}.pd-pr{display:flex;align-items:baseline;gap:8px;padding:12px 16px 4px;background:#fff;color:#222}.pd-pr b{color:var(--pr);font-size:30px}.pd-pr s{color:#bbb;font-size:13px}.pd-pr span{margin-left:auto;font-size:12.5px;color:#888}
.pd-labs{background:#fff;padding:2px 16px 10px;display:flex;gap:6px;flex-wrap:wrap}.pd-labs span{font-size:11.5px;color:var(--pr);border:1px solid #f3b4ae;border-radius:3px;padding:1px 6px}
.pd-later{background:#e9f8ee;color:#1e8e3e;font-size:13px;font-weight:600;padding:9px 16px}.pd-name{background:#fff;padding:12px 16px;font-size:16px;font-weight:700;line-height:1.5;color:#222}.pd-name small{display:block;font-size:12.5px;color:#888;font-weight:400}
.pd-for{background:#fff8e6;color:#8a5a00;font-size:13px;padding:8px 16px}.pd-for span{float:right;color:var(--pr);cursor:pointer}
.pd-gr,.pd-hl{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:.5px solid #f0f0f0}.pd-gr:first-of-type{border-top:0}.pd-gr b,.pd-hl b{font-size:14px}.pd-gr em,.pd-hl em{display:block;font-style:normal;font-size:12px;color:#888}.pd-gr>div:nth-child(2),.pd-hl>div{flex:1;min-width:0}.pd-grr{display:flex;align-items:center;gap:8px}.pd-grr small{font-size:11px;color:var(--pr);text-align:right;line-height:1.4}
.pd-av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ff9a9e,#e02e24);color:#fff;display:grid;place-items:center;font-weight:700;flex:none}
.pd-dim{font-size:12.5px;color:#999;line-height:1.7}
.pd-foot{display:flex;align-items:center;gap:8px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:#fff;border-top:.5px solid #eee}.pd-fi{display:flex;flex-direction:column;align-items:center;font-size:20px;width:44px;cursor:pointer}.pd-fi em{font-style:normal;font-size:10.5px;color:#666}
.pd-solo,.pd-grp{flex:1;border-radius:8px;color:#fff;text-align:center;font-size:12px;padding:5px 0;cursor:pointer;line-height:1.3}.pd-solo{background:#ff8a65}.pd-grp{background:var(--pr)}.pd-solo b,.pd-grp b{display:block;font-size:17px}
.pd-cut{text-align:center;padding:20px 14px;color:#222}.pd-cutn{display:block;margin:10px 0;font-size:15px}.pd-cutbig{font-size:18px;font-weight:700}.pd-cutbig b{color:var(--pr);font-size:26px}.pd-who{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:14px 0}
.pd-mehd{background:linear-gradient(180deg,#e02e24,#f04a2a);color:#fff;display:flex;align-items:center;gap:12px;padding:16px 18px 46px}.pd-meav{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.9);color:var(--pr);display:grid;place-items:center;font-size:22px;font-weight:700}.pd-mehd b{font-size:20px}.pd-mehd em{display:block;font-style:normal;font-size:12.5px;opacity:.9}
.pd-stat{margin:-34px 10px 0;background:#fff;border-radius:12px;display:grid;grid-template-columns:repeat(4,1fr);padding:14px 0;text-align:center;font-size:12px;color:#666;position:relative}.pd-stat b{display:block;font-size:17px;color:#222;margin-bottom:2px}.pd-stat div{cursor:pointer}
.pd-oi{display:grid;grid-template-columns:repeat(5,1fr);text-align:center;font-size:22px}.pd-oi span{position:relative;cursor:pointer}.pd-oi em{display:block;font-style:normal;font-size:12px;color:#444}.pd-oi sup{position:absolute;top:-4px;right:12px;background:var(--pr);color:#fff;border-radius:9px;font-size:10px;padding:0 5px}
.pd-to .gymall-empty{color:#888}
`);
