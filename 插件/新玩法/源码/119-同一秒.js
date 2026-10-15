/* 📸 同一秒：每天随机某个时刻，你和 TA 同时收到「此刻！」——两分钟内拍下你现在看到的东西，TA 那边也同一秒「拍」下 TA 的此刻。两张并排存成你们的时间线：同一个瞬间，两个地方 */
if (window.__gyxMoment) return; window.__gyxMoment = 1;
X.feat('gyxMoment', { n: '📸 同一秒', desc: '每天随机一个时刻，你和 TA 同时拍下此刻，两张并排存起来' });
const S = X.store('moment');
let D = { list: [], cfg: { from: 10, to: 22, on: true }, plan: {} };   // list: {id, cid, at, ta:{desc, src, line}, me:{photo, at, late}, react, saw}  plan: {day, at, fired}
const LIMIT = 2 * 60000;
const save = () => S.set('d', D);
const shrink = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 640 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', .8)); }; im.onerror = rej; im.src = r.result; }; r.onerror = rej; r.readAsDataURL(f); });
const hm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
function planToday() {
    const today = X.day(); if (D.plan.day === today) return;
    const a = Math.max(0, Math.min(23, +D.cfg.from || 10)), b = Math.max(a + 1, Math.min(24, +D.cfg.to || 22));
    const d = new Date(); d.setHours(a, 0, 0, 0); const t = d.getTime() + Math.random() * (b - a) * 36e5;
    D.plan = { day: today, at: Math.round(t), fired: Date.now() > t };   // 今天已经过了那个点：明天再说
    save();
}
async function fire(c) {
    c = c || X.cur(); if (!c) return null;
    const h = new Date().getHours();
    let o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n「此刻！」——你和她约好的：同一秒，各自拍下此刻眼前的东西。现在是 ${h} 点，按你今天的日程和生活，你此刻在哪、眼前是什么？\n只输出 JSON：{"desc":"你拍到的画面，具体、有生活感，30字内","line":"你配的一句话，15字内"}`));
    if (!o || !o.desc) o = X.pick([{ desc: '桌上一杯快凉掉的咖啡，旁边是没写完的稿子', line: '你在干嘛？' }, { desc: '窗外的天，云走得很快', line: '这一秒在想你' }, { desc: '地铁车窗上自己的倒影', line: '人好多' }]);
    let src = ''; try { if (window.gyPhotoGet) { const g = await window.gyPhotoGet(c.id, o.desc, false); src = (g && g.src) || ''; } } catch (e) {}
    const m = { id: 'mo' + Date.now().toString(36), cid: String(c.id), at: Date.now(), ta: { desc: X.plain(o.desc), line: X.plain(o.line || ''), src } };
    D.list.unshift(m); D.list = D.list.slice(0, 300); await save();
    X.notify(c, `📸 此刻！<b>${X.esc(X.name(c))}</b> 拍下了 TA 的这一秒`, X.v('两分钟内拍下你的此刻', '快！拍下你现在眼前的', '同一秒，你那边是什么样？'), X.go('gyxMomentOpen', c.id));
    X.toast('📸 此刻！', X.v('两分钟内拍下你现在看到的', `${X.name(c)} 已经拍好了，等你`, '同一秒，两个地方'));
    return m;
}
setInterval(() => { try { if (!X.on('gyxMoment') || !D.cfg.on) return; planToday(); if (!D.plan.fired && Date.now() >= D.plan.at) { D.plan.fired = true; save(); fire(); } } catch (e) {} }, 30000);
window.gyxMomentShoot = async (id, input) => {
    const m = D.list.find(x => x.id === id), f = input && input.files && input.files[0]; if (!m || !f) return;
    let img; try { img = await shrink(f); } catch (e) { return X.toast('这张图读不出来', '换一张试试'); }
    m.me = { photo: img, at: Date.now(), late: Date.now() - m.at > LIMIT }; await save(); window.gyxMomentOpen(m.cid);
    const c = X.char(m.cid), p = `${X.who(c)}\n「此刻」游戏：同一秒你拍的是「${m.ta.desc}」，她拍了这张照片${m.me.late ? '（她迟到了几分钟才拍）' : ''}。看看她那边是什么（看不到图就想象），说一句。只输出 JSON：{"line":"20字内","saw":"照片里有什么，12字内，看不到就空"}`;
    let o = null; try { if (!X.bailu() && typeof callChatCompletionAPI === 'function') { const api = getApiConfig(true); if (api && api.key) { const d = await callChatCompletionAPI(api, p, 1, [img]); o = X.json(d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content); } } } catch (e) {}
    m.react = X.plain((o && o.line) || X.v('原来你那边是这样的。', '同一秒，我们隔着这么远。', m.me.late ? '迟到了哦，不过拍得很好看。' : '收到你的此刻了。')); m.saw = X.plain((o && o.saw) || '');
    await save(); if (c) X.say(c, '📸 ' + m.react); window.gyxMomentOpen(m.cid);
};
window.gyxMomentNow = async cid => { const m = await fire(X.char(cid)); if (m) window.gyxMomentOpen(m.cid); };
window.gyxMomentCfg = (k, v) => { D.cfg[k] = v; D.plan = {}; save(); };
window.gyxMomentDel = async id => { D.list = D.list.filter(x => x.id !== id); await save(); window.gyxMomentOpen(); };
window.gyxMomentData = () => D;
window.gyxMomentOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), L = D.list.filter(x => x.cid === cid);
    planToday(); const live = L.find(x => !x.me && Date.now() - x.at < 30 * 60000);
    const pair = x => `<div class="mo-p"><div class="mo-h">${hm(x.at)} · ${new Date(x.at).toLocaleDateString()}${x.me && x.me.late ? ' · 迟到了' : ''}<i onclick="gyxMomentDel('${x.id}')">删</i></div><div class="mo-two"><div class="mo-c">${x.ta.src ? `<img src="${X.esc(x.ta.src)}" alt="">` : `<div class="mo-txt">${X.esc(x.ta.desc)}</div>`}<span>${X.esc(X.name(c))}${x.ta.line ? '：' + X.esc(x.ta.line) : ''}</span></div><div class="mo-c">${x.me ? `<img src="${x.me.photo}" alt="">` : '<div class="mo-txt mo-miss">你没拍</div>'}<span>你${x.react ? ' · ' + X.esc(x.react) : ''}</span></div></div></div>`;
    X.panel('gyxMomentOv', '📸 同一秒 · ' + X.esc(X.name(c)), `<div class="gyx-row">${X.whoSel(cid, 'gyxMomentOpen')}<button class="gyx-btn lite" onclick="gyxMomentNow('${cid}')">现在就来一张</button></div>
      ${live ? `<div class="gyx-card mo-live"><b>📸 此刻！</b><div class="gyx-tip">${Date.now() - live.at < LIMIT ? '还剩 ' + Math.max(1, Math.ceil((LIMIT - (Date.now() - live.at)) / 1000)) + ' 秒' : '已经过了两分钟，现在拍算迟到'}</div><label class="gyx-btn">拍下我的此刻<input type="file" accept="image/*" capture="environment" style="display:none" onchange="gyxMomentShoot('${live.id}',this)"></label></div>` : ''}
      <div class="gyx-tip">${X.v('每天随机一个时刻，你们同时拍下这一秒。', '同一个瞬间，两个地方。', '不用好看，真实就好。')}今天的「此刻」${D.plan.fired ? '已经来过了' : '还没到，会突然来'}。</div>
      <div class="gyx-row gyx-tip"><label><input type="checkbox" ${D.cfg.on ? 'checked' : ''} onchange="gyxMomentCfg('on',this.checked)"> 每天自动来一次</label> · 在 <input class="gyx-who" type="number" min="0" max="23" value="${D.cfg.from}" style="width:52px" onchange="gyxMomentCfg('from',+this.value)"> 点到 <input class="gyx-who" type="number" min="1" max="24" value="${D.cfg.to}" style="width:52px" onchange="gyxMomentCfg('to',+this.value)"> 点之间</div>
      ${L.map(pair).join('') || '<div class="gyx-tip">还没有。等今天的「此刻」，或者现在就来一张。</div>'}`);
};
X.ctx(id => { const m = D.list.find(x => x.cid === String(id)); return m && Date.now() - m.at < 6 * 36e5 ? `【刚才的「同一秒」】同一秒你拍的是「${m.ta.desc}」${m.me ? '，她拍了' + (m.saw || '她那边的样子') : '，她还没拍'}。` : ''; }, 'gyxMoment');
X.action({ key: 'gyx_moment', label: '突然喊「此刻！」——拍下你这一秒，让她也拍', hint: '同一秒', need: c => { const h = new Date().getHours(); return h >= 9 && h <= 22 && !D.list.some(x => x.cid === String(c.id) && Date.now() - x.at < 864e5); }, run: async c => (await fire(c)) ? '喊了一声「此刻！」' : null }, 'gyxMoment');
X.today(() => ({ title: '📸 同一秒', rows: D.list.filter(x => X.day(new Date(x.at)) === X.day()).map(x => ({ t: hm(x.at), x: X.esc(X.name(X.char(x.cid))) + (x.me ? ' · 你们都拍了' : ' · 等你拍'), go: `gyxMomentOpen('${x.cid}')` })) }), 'gyxMoment');
X.widget('gyxMomentW', { n: '同一秒', sizes: ['s', 'm'], tap: () => window.gyxMomentOpen(), r: w => { const m = D.list[0]; return X.gw(w, '📸', '同一秒', m ? [hm(m.at) + (m.me ? ' ✓' : ' 等你'), X.esc(m.ta.desc).slice(0, 14)] : ['今天会突然来']); } }, 'gyxMoment');
X.memArr({ k: 'gyxMoment', ico: '📸', n: '同一秒', d: '你们同一秒拍下的东西（TA 记得两边都是什么）', arr: () => D.list, field: 'desc', text: x => `TA：${x.ta.desc}` + (x.saw ? ` / 你：${x.saw}` : ''), edit: (x, v) => { x.ta.desc = String(v).replace(/^TA：/, '').split(' / 你：')[0]; }, meta: x => new Date(x.at).toLocaleString(), save }, 'gyxMoment');
X.css('gyxMomentCss', `.mo-live{background:#fff4e8;text-align:center}.mo-live b{font-size:20px}.mo-p{margin:12px 0}.mo-h{font-size:12px;color:#8e8e93;display:flex}.mo-h i{margin-left:auto;font-style:normal;cursor:pointer}.mo-two{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px}.mo-c{background:#f7f7f9;border-radius:12px;overflow:hidden}.mo-c img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block}.mo-txt{aspect-ratio:3/4;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;font-size:14px;line-height:1.7;background:linear-gradient(160deg,#eef2ff,#fdf0f5)}.mo-miss{color:#aaa;background:#f2f2f4}.mo-c span{display:block;font-size:12px;padding:6px 8px;color:#555}`);
X.mini({ id: 'gyxMoment', icon: '📸', title: '同一秒', desc: '每天一个随机时刻，你们同时拍下这一秒', cat: '陪伴', onOpen: () => window.gyxMomentOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.list = D.list || []; D.cfg = Object.assign({ from: 10, to: 22, on: true }, D.cfg || {}); D.plan = D.plan || {}; })();
