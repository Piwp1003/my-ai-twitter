/* 📮 现实小任务：TA 隔几天给你派一个真实世界的小任务——拍一朵黄色的花、去一条没走过的街、给自己买杯热的。你拍照交差，TA 看图回应（模型不认图就照样夸你）；攒多了是一本「我们一起看过的世界」。散步的时候也会提醒你 */
if (window.__gyxMis) return; window.__gyxMis = 1;
X.feat('gyxMis', { n: '📮 现实小任务', desc: 'TA 派真实世界的小任务，你拍照交差，TA 看图回应' });
const S = X.store('mission');
let D = { list: [] };   // {id, cid, text, at, done, doneAt, photo, line, ok, skip}
const DAY = 864e5;
const save = () => S.set('d', D);
const open_ = cid => D.list.find(x => (!cid || x.cid === String(cid)) && !x.done && !x.skip);
const POOL = ['拍一朵黄色的花', '找一只猫，远远拍一张就好', '拍今天的天空', '去一条没走过的小路', '给自己买一杯热的喝', '拍一样圆圆的东西', '找一片形状好看的叶子', '拍你今天吃的最好吃的那口', '拍一扇好看的窗', '找一个让你笑了一下的招牌', '拍你此刻脚下的路', '拍一样红色的东西'];
async function give(c) {
    if (!c || open_(c.id)) return null;
    let wx = null; try { wx = typeof window.gymapWeatherInfo === 'function' ? await window.gymapWeatherInfo() : null; } catch (e) {}
    const done = D.list.filter(x => x.cid === String(c.id)).slice(0, 8).map(x => x.text);
    let t = X.bailu() ? null : await X.ask(`${X.who(c)}\n给她派一个现实生活里的小任务：要能拍一张照片交差、十几分钟内能做完、出门或在家都行、有点可爱或有点浪漫，不要危险、不要花钱多。现在 ${new Date().getMonth() + 1} 月 ${new Date().getHours()} 点${wx ? '，天气 ' + [wx.desc, wx.now != null ? wx.now + '°' : ''].join(' ') : ''}。之前派过的：${done.join('、') || '没有'}（别重复）。\n只输出任务本身，一句话，20 字以内，不要引号。`);
    t = X.plain(t || X.pick(POOL.filter(p => !done.includes(p)).concat(POOL))).slice(0, 40);
    const m = { id: 'ms' + Date.now().toString(36), cid: String(c.id), text: t, at: Date.now(), done: false };
    D.list.unshift(m); await save();
    X.say(c, `📮 ${X.v('今天的小任务：', '给你派个任务：', '交给你一件事：')}${t}${X.v('，拍给我看～', '。做完了拍照交差。', '，我等你的照片。')}`);
    X.notify(c, `<b>${X.esc(X.name(c))}</b> 给你派了个小任务 📮`, t, X.go('gyxMisOpen', c.id));
    return m;
}
const shrink = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 640 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', .8)); }; im.onerror = rej; im.src = r.result; }; r.onerror = rej; r.readAsDataURL(f); });
async function judge(c, m, img) {
    const p = `${X.who(c)}\n你给她派的小任务是「${m.text}」，她拍了这张照片来交差。看看照片（看不到图就按任务想象她做到了），按你的性格回应她：认真看了照片里有什么、夸她或逗她。只输出 JSON：{"ok":true或false（照片明显不是这回事才算 false）,"line":"你说的话，40字内","saw":"照片里有什么，15字内，看不到就写空"}`;
    try { if (!X.bailu() && typeof callChatCompletionAPI === 'function' && typeof getApiConfig === 'function') { const api = getApiConfig(true); if (api && api.key) { const d = await callChatCompletionAPI(api, p, 1, [img]); const o = X.json(d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content); if (o && o.line) return o; } } } catch (e) {}
    return { ok: true, line: X.v('收到！我就知道你能做到。', '拍得真好，比我想象的还好看。', '任务完成～奖励你一个抱抱。'), saw: '' };
}
window.gyxMisSubmit = async (id, input) => {
    const m = D.list.find(x => x.id === id), f = input && input.files && input.files[0]; if (!m || !f) return;
    const c = X.char(m.cid); X.toast('📮 ' + X.v('交上去了', 'TA 在看', '等 TA 看一眼'), '');
    let img; try { img = await shrink(f); } catch (e) { return X.toast('这张图读不出来', '换一张试试'); }
    const o = await judge(c, m, img);
    m.photo = img; m.line = X.plain(o.line); m.saw = X.plain(o.saw || ''); m.ok = o.ok !== false; m.done = m.ok; if (m.ok) m.doneAt = Date.now(); await save();
    if (c) X.say(c, (m.ok ? '📮 ' : '🤔 ') + m.line);
    window.gyxMisOpen(m.cid);
};
window.gyxMisGive = async cid => { await give(X.char(cid) || X.cur()); window.gyxMisOpen(cid); };
window.gyxMisSkip = async id => { const m = D.list.find(x => x.id === id); if (m) { m.skip = true; await save(); } window.gyxMisOpen(m && m.cid); };
window.gyxMisDel = async id => { D.list = D.list.filter(x => x.id !== id); await save(); window.gyxMisOpen(); };
window.gyxMisData = () => D;
window.gyxMissionNow = () => { const m = open_(); return m ? m.text : ''; };   // 给「陪你散步」用
window.gyxMisOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), m = open_(cid), done = D.list.filter(x => x.cid === cid && x.done);
    X.panel('gyxMisOv', '📮 ' + X.esc(X.name(c)) + ' 派的小任务', `<div class="gyx-row">${X.whoSel(cid, 'gyxMisOpen')}</div>
      ${m ? `<div class="gyx-card ms-now"><div class="gyx-tip">${new Date(m.at).toLocaleDateString()} · ${X.v('进行中', '等你交差', '还没完成')}</div><div class="ms-t">${X.esc(m.text)}</div>
        ${m.line && !m.ok ? `<div class="gyx-tip">🤔 ${X.esc(m.line)}</div>` : ''}
        <div class="gyx-row"><label class="gyx-btn">📷 拍照交差<input type="file" accept="image/*" capture="environment" style="display:none" onchange="gyxMisSubmit('${m.id}',this)"></label><button class="gyx-btn lite" onclick="gyxMisSkip('${m.id}')">这个不想做</button></div></div>`
      : `<div class="gyx-tip">${X.v('现在没有任务。', '任务都做完啦。', '暂时没派任务。')}TA 隔几天会自己派一个，也可以现在要一个。</div><button class="gyx-btn lite" onclick="gyxMisGive('${cid}')">要一个任务</button>`}
      <h4 class="ms-h">🌍 我们一起看过的世界（${done.length}）</h4>
      <div class="ms-g">${done.map(x => `<div class="ms-i"><img src="${x.photo}" alt=""><b>${X.esc(x.text)}</b><em>${X.esc(x.line || '')}</em><i onclick="gyxMisDel('${x.id}')">删</i></div>`).join('') || '<div class="gyx-tip">还没有照片。</div>'}</div>`);
};
X.ctx(id => { const m = open_(id), last = D.list.find(x => x.cid === String(id) && x.done); return (m ? `【你派给她的小任务】「${m.text}」，她还没交差。` : '') + (last && Date.now() - last.doneAt < DAY ? `【她刚完成你派的任务】「${last.text}」${last.saw ? '，照片里是' + last.saw : ''}。` : ''); }, 'gyxMis');
X.action({ key: 'gyx_mission', label: '给她派一个现实生活里的小任务（拍照交差）', hint: '现实小任务', need: c => { const h = new Date().getHours(); return h >= 8 && h <= 20 && !open_(c.id) && !D.list.some(x => x.cid === String(c.id) && Date.now() - x.at < 2 * DAY); },
    run: async c => (await give(c)) ? '派了个小任务' : null }, 'gyxMis');
X.today(() => ({ title: '📮 小任务', rows: D.list.filter(x => !x.done && !x.skip && X.char(x.cid)).slice(0, 3).map(x => ({ t: X.name(X.char(x.cid)), x: X.esc(x.text), go: `gyxMisOpen('${x.cid}')` })).concat(D.list.filter(x => x.done && X.day(new Date(x.doneAt)) === X.day()).map(x => ({ t: '✅ 完成', x: X.esc(x.text), go: `gyxMisOpen('${x.cid}')` }))) }), 'gyxMis');
X.widget('gyxMisW', { n: '现实小任务', sizes: ['s', 'm'], tap: () => window.gyxMisOpen(), r: w => { const m = open_(), n = D.list.filter(x => x.done).length; return m ? X.gw(w, '📮', '今天的任务', [X.esc(m.text)]) : X.gw(w, '📮', '小任务', [n ? '完成了 ' + n + ' 个' : '要一个？']); } }, 'gyxMis');
X.memArr({ k: 'gyxMis', ico: '📮', n: '现实小任务', d: 'TA 派过的任务和你交的照片（TA 记得照片里有什么）', arr: () => D.list, field: 'text', text: x => x.text + (x.saw ? '（照片里：' + x.saw + '）' : ''), edit: (x, v) => { x.text = v.replace(/（照片里：.*）$/, ''); }, meta: x => new Date(x.at).toLocaleDateString() + (x.done ? ' · 完成' : x.skip ? ' · 跳过' : ' · 进行中'), save }, 'gyxMis');
X.css('gyxMisCss', `.ms-t{font-size:19px;font-weight:600;margin:6px 0 4px}.ms-now{background:#fff6e8}.ms-h{font-size:14px;margin:14px 0 6px}.ms-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}.ms-i{position:relative;background:#fff;border-radius:12px;padding:6px;box-shadow:0 2px 8px rgba(0,0,0,.08);transform:rotate(-1deg)}.ms-i:nth-child(2n){transform:rotate(1.2deg)}.ms-i img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;display:block}.ms-i b{display:block;font-size:12.5px;margin-top:5px}.ms-i em{display:block;font-style:normal;font-size:11.5px;color:#8e8e93}.ms-i i{position:absolute;top:8px;right:10px;font-style:normal;font-size:11px;color:#fff;background:rgba(0,0,0,.35);border-radius:6px;padding:0 5px;cursor:pointer}`);
X.mini({ id: 'gyxMis', icon: '📮', title: '现实小任务', desc: 'TA 派任务，你拍照交差', cat: '一起做', onOpen: () => window.gyxMisOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.list = D.list || []; })();
