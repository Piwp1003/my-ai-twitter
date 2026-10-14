/* 📤 角标和分享：TA 找你的时候，桌面上谷雨的图标出现数字角标（要先「添加到主屏幕」）；TA 说过的话、写的信、散步日记、小任务照片，一键做成卡片，调出手机的系统分享（微信、小红书……），电脑上就直接下载图片 */
if (window.__gyxPing) return; window.__gyxPing = 1;
X.feat('gyxPing', { n: '📤 角标和分享', desc: '桌面图标未读角标；把 TA 的话做成卡片一键分享' });
const S = X.store('ping');
let D = { badge: true, cards: [] };   // cards: {id, cid, kind, text, by, at, shared, fromTa}
const save = () => S.set('d', D);
/* ---------------- 🔴 图标角标 ---------------- */
const canBadge = () => 'setAppBadge' in navigator;
function unreadN() { let n = 0; try { if (typeof chatHasUnread !== 'function' || typeof globalChats === 'undefined') return 0; X.chars().forEach(c => { (globalChats[c.id] || []).forEach(m => { if (m.sender !== 'me' && m.sender !== 'system' && (!m.readBy || !m.readBy.includes('me'))) n++; }); }); } catch (e) {} return n; }
let lastN = -1;
function badge() { if (!canBadge()) return; const n = X.on('gyxPing') && D.badge ? unreadN() : 0; if (n === lastN) return; lastN = n; try { (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {}); } catch (e) {} }
setInterval(badge, 15000); document.addEventListener('visibilitychange', badge);
/* ---------------- 🖼️ 做卡片 ---------------- */
const THEMES = [['#fff4f0', '#ffd9cf', '#5b3a33'], ['#f1f6ff', '#d6e4ff', '#2f3d5c'], ['#f4fbf3', '#d4efd0', '#2f4a2c'], ['#1c1a22', '#3a3150', '#f2ecff'], ['#fffaf0', '#f5e3bd', '#5a4524']];
function wrap(g, t, w) { const out = []; String(t).split('\n').forEach(p => { let line = ''; for (const ch of p) { if (g.measureText(line + ch).width > w && line) { out.push(line); line = ch; } else line += ch; } out.push(line); }); return out; }
async function draw({ text, by, sub, img }) {
    const W = 720, H = 900, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), T = X.pick(THEMES);
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, T[0]); gr.addColorStop(1, T[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    let y = 90; const F = '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    if (img) { try { const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = img; }); const s = Math.min(560 / im.width, 380 / im.height); const w = im.width * s, h = im.height * s; g.save(); g.shadowColor = 'rgba(0,0,0,.15)'; g.shadowBlur = 20; g.fillStyle = '#fff'; g.fillRect((W - w) / 2 - 10, y - 10, w + 20, h + 20); g.restore(); g.drawImage(im, (W - w) / 2, y, w, h); y += h + 50; } catch (e) {} }
    const fs = text.length > 120 ? 28 : text.length > 50 ? 34 : 42; g.font = `${fs}px ${F}`;
    const lines = wrap(g, text, W - 160).slice(0, Math.floor((H - y - 170) / (fs * 1.7)));
    if (!img) y = Math.max(90, (H - 150 - lines.length * fs * 1.7) / 2 - 20);   // 没有图：字放在中间偏上
    g.fillStyle = T[2]; g.globalAlpha = .25; g.font = `120px Georgia,serif`; g.fillText('“', 50, y + 50); g.globalAlpha = 1; g.font = `${fs}px ${F}`;
    lines.forEach((l, i) => g.fillText(l, 80, y + 40 + i * fs * 1.7));
    g.font = `26px ${F}`; g.globalAlpha = .75; g.fillText('—— ' + by, 80, H - 110); g.font = `20px ${F}`; g.globalAlpha = .5; g.fillText(sub || new Date().toLocaleDateString(), 80, H - 72); g.textAlign = 'right'; g.fillText('谷雨', W - 60, H - 72); g.globalAlpha = 1;
    return cv.toDataURL('image/jpeg', .88);
}
async function shareImg(url, name, text) {
    const blob = await (await fetch(url)).blob(), file = new File([blob], name + '.jpg', { type: 'image/jpeg' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: text || '' }); return 'share'; } } catch (e) { if (e && e.name === 'AbortError') return 'abort'; }
    const a = document.createElement('a'); a.href = url; a.download = name + '.jpg'; document.body.appendChild(a); a.click(); a.remove(); return 'download';
}
window.gyxShareCard = async (o) => {
    const c = X.char(o.cid), url = await draw({ text: o.text, by: o.by || X.name(c), sub: o.sub, img: o.img });
    const r = await shareImg(url, (o.by || X.name(c) || '谷雨') + '的话', '');
    const card = { id: 'pc' + Date.now().toString(36), cid: String(o.cid || ''), kind: o.kind || 'say', text: String(o.text).slice(0, 300), by: o.by || X.name(c), at: Date.now(), shared: r };
    if (r !== 'abort') { D.cards.unshift(card); D.cards = D.cards.slice(0, 200); await save(); X.toast('📤 ' + (r === 'share' ? X.v('分享出去啦', '发出去了', '已分享') : X.v('卡片存到下载里了', '图片已下载', '卡片下好了')), ''); }
    return r;
};
/* 能分享什么：TA 最近的话 / 信 / 散步日记 / 小任务照片 / 秘密计划的信 */
function sources(c) {
    const out = [], cid = String(c.id);
    ((typeof globalChats !== 'undefined' && globalChats[cid]) || []).filter(m => m.sender !== 'me' && m.sender !== 'system' && X.plain(m.text).length > 4).slice(-8).reverse().forEach(m => out.push({ k: 'say', ico: '💬', text: X.plain(m.text), sub: new Date(m.timestamp).toLocaleDateString() }));
    ((c.diaryData && c.diaryData.letters) || []).slice(0, 3).forEach(l => out.push({ k: 'letter', ico: '💌', text: X.plain(l.content || l.text || l.body || '').slice(0, 260), sub: l.title || '一封信' }));
    try { (window.gyxWalkData ? window.gyxWalkData().walks : []).filter(w => w.cid === cid && w.diary).slice(0, 2).forEach(w => out.push({ k: 'walk', ico: '🚶', text: w.diary, sub: '散步日记 · ' + new Date(w.start).toLocaleDateString() })); } catch (e) {}
    try { (window.gyxMisData ? window.gyxMisData().list : []).filter(x => x.cid === cid && x.done && x.photo).slice(0, 3).forEach(x => out.push({ k: 'mission', ico: '📮', text: x.line || x.text, sub: '小任务：' + x.text, img: x.photo })); } catch (e) {}
    try { (window.gyxPlanData ? window.gyxPlanData().plans : []).filter(p => p.cid === cid && p.done && p.letter).slice(0, 2).forEach(p => out.push({ k: 'plan', ico: '🎁', text: p.letter, sub: '秘密计划：' + p.what })); } catch (e) {}
    return out.filter(x => x.text);
}
let SRC = [];
window.gyxPingShare = i => { const x = SRC[i], c = X.cur(); if (x) window.gyxShareCard(Object.assign({ cid: window.__gyxPingCid }, x)); };
window.gyxPingBadge = v => { D.badge = !!v; save(); lastN = -1; badge(); };
window.gyxPingDel = async id => { D.cards = D.cards.filter(x => x.id !== id); await save(); window.gyxPingOpen(); };
window.gyxPingData = () => D; window.gyxPingUnread = unreadN;
window.gyxPingOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id); window.__gyxPingCid = cid; SRC = sources(c);
    const mine = D.cards.filter(x => x.cid === cid);
    X.panel('gyxPingOv', '📤 角标和分享', `<div class="gyx-card"><b>🔴 桌面图标角标</b><div class="gyx-tip">${canBadge() ? `TA 发来没看的消息，谷雨的图标上显示数字（现在 ${unreadN()} 条）。要先在手机浏览器里「添加到主屏幕」，从桌面图标打开才有。` : '这个浏览器不支持图标角标（iPhone 要 16.4 以上、并且「添加到主屏幕」后从桌面打开；电脑上的 Chrome / Edge 装成应用也行）。'}</div>
        <label class="gyx-tip"><input type="checkbox" ${D.badge ? 'checked' : ''} onchange="gyxPingBadge(this.checked)"> 显示角标</label></div>
      <div class="gyx-row">${X.whoSel(cid, 'gyxPingOpen')}</div>
      <div class="gyx-tip">${X.v('挑一句做成卡片，', '想把 TA 的话发给朋友看？', '这些值得存一张。')}手机上会调出系统分享（微信、小红书、相册……），电脑上直接下载图片。</div>
      ${SRC.map((x, i) => `<div class="pg-r" onclick="gyxPingShare(${i})"><span>${x.ico}</span><div><b>${X.esc(x.text.slice(0, 60))}${x.text.length > 60 ? '…' : ''}</b><em>${X.esc(x.sub || '')}</em></div><i>📤</i></div>`).join('') || '<div class="gyx-tip">TA 还没说过什么能分享的。</div>'}
      ${mine.length ? `<h4 style="font-size:14px;margin:14px 0 4px">分享过的</h4>` + mine.slice(0, 12).map(x => `<div class="pg-r s"><span>${x.fromTa ? '🎀' : '📤'}</span><div><b>${X.esc(x.text.slice(0, 40))}</b><em>${new Date(x.at).toLocaleString()}${x.fromTa ? ' · TA 做给你的' : ''}</em></div><i onclick="event.stopPropagation();gyxPingDel('${x.id}')">删</i></div>`).join('') : ''}`);
};
// 聊天输入框左边 ⋮ 里也放一个
const addAct = () => { if (typeof window.gyChatActionAdd !== 'function') return false; window.gyChatActionAdd({ id: 'gyxPing', icon: '📤', label: '把 TA 的话做成卡片', sub: '分享到微信 / 存图', show: () => X.on('gyxPing'), run: cid => window.gyxPingOpen(cid) }); return true; };
if (!addAct()) { let n = 0; const iv = setInterval(() => { if (addAct() || ++n > 40) clearInterval(iv); }, 500); }
/* TA 自己做一张卡片送你：挑一句 TA 最近说过、觉得你会想留着的话 */
async function gift(c) {
    let o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n最近的聊天：\n${X.recent(c, 20)}\n\n你想把一句话做成一张小卡片送她（可以是你刚才说过的，也可以是新写的），让她存着或者发朋友圈。只输出 JSON：{"text":"卡片上的话，40字内","say":"你发卡片时说的一句，20字内"}`));
    const text = X.plain((o && o.text) || X.pick(X.cards(['情话', '聊天'], c, 1).concat(['今天也很喜欢你。']))); if (!text) return null;
    const url = await draw({ text, by: X.name(c) });
    X.say(c, X.plain((o && o.say) || X.v('做了张卡片给你，想发就发～', '这个送你，存着。', '给你的。')), { mediaUrl: url });
    D.cards.unshift({ id: 'pc' + Date.now().toString(36), cid: String(c.id), kind: 'gift', text, by: X.name(c), at: Date.now(), fromTa: true }); await save();
    return text;
}
window.gyxPingGift = cid => gift(X.char(cid));
X.ctx(id => { const x = D.cards.find(c => c.cid === String(id) && !c.fromTa && Date.now() - c.at < 864e5); return x ? `【她刚把你说的「${x.text.slice(0, 40)}」做成卡片${x.shared === 'share' ? '分享出去了' : '存了下来'}】` : ''; }, 'gyxPing');
X.action({ key: 'gyx_ping_card', label: '把一句话做成小卡片送她（她能存图、发朋友圈）', hint: '角标和分享', need: c => !D.cards.some(x => x.cid === String(c.id) && x.fromTa && Date.now() - x.at < 5 * 864e5) && X.recent(c, 6).length > 20,
    run: async c => (await gift(c)) ? '做了张卡片送你' : null }, 'gyxPing');
X.today(() => ({ title: '📤 分享', rows: [unreadN() && canBadge() && D.badge ? { t: '角标', x: unreadN() + ' 条没看', go: 'gyxPingOpen()' } : null].filter(Boolean).concat(D.cards.filter(x => X.day(new Date(x.at)) === X.day()).slice(0, 3).map(x => ({ t: x.fromTa ? 'TA 送的卡片' : '分享了', x: X.esc(x.text.slice(0, 24)), go: `gyxPingOpen('${x.cid}')` }))) }), 'gyxPing');
X.widget('gyxPingW', { n: '未读和分享', sizes: ['s', 'm'], tap: () => window.gyxPingOpen(), r: w => { const n = unreadN(); return X.gw(w, n ? '🔴' : '📤', '未读和分享', [n ? n + ' 条没看' : '都看完啦', D.cards.length ? '分享过 ' + D.cards.length + ' 张' : '']); } }, 'gyxPing');
X.memArr({ k: 'gyxPing', ico: '📤', n: '分享过的卡片', d: '你分享出去的、TA 做给你的卡片上的话', arr: () => D.cards, field: 'text', text: x => x.text, meta: x => new Date(x.at).toLocaleString() + (x.fromTa ? ' · TA 做的' : ''), save }, 'gyxPing');
X.css('gyxPingCss', `.pg-r{display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid #f2f2f4;cursor:pointer}.pg-r:hover{background:#fafafa}.pg-r>span{font-size:20px}.pg-r>div{flex:1;min-width:0}.pg-r b{display:block;font-weight:500;font-size:14px}.pg-r em{display:block;font-style:normal;font-size:11.5px;color:#8e8e93}.pg-r i{font-style:normal;font-size:12px;color:#8e8e93}.pg-r.s{cursor:default}`);
X.mini({ id: 'gyxPing', icon: '📤', title: '角标和分享', desc: '图标未读角标；TA 的话做成卡片分享', cat: '生活', onOpen: () => window.gyxPingOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.cards = D.cards || []; if (D.badge == null) D.badge = true; badge(); })();
