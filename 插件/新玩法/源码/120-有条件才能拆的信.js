/* 💌 有条件才能拆的信：TA 写好的信封上写着「下雨天再拆」「凌晨睡不着的时候拆」「你难过的时候拆」「走满一万步那天拆」……条件没到，信是封着的；条件一到，TA 的信刚好在你最需要的时候出现 */
if (window.__gyxSeal) return; window.__gyxSeal = 1;
X.feat('gyxSeal', { n: '💌 有条件才能拆的信', desc: '信封上写着什么时候拆——下雨天、睡不着、难过的时候……条件到了才能拆' });
const S = X.store('seal');
let D = { list: [], told: {} };   // {id, cid, cond, at, text, opened, openedAt, why}
const DAY = 864e5;
const save = () => S.set('d', D);
const myRecent = (ms) => { const out = []; try { X.chars().forEach(c => ((typeof globalChats !== 'undefined' && globalChats[c.id]) || []).forEach(m => { if (m.sender === 'me' && Date.now() - m.timestamp < ms) out.push(X.plain(m.text)); })); } catch (e) {} return out.join(' '); };
const weather = () => { try { const w = typeof window.gymapWeatherInfo === 'function' ? window.gymapWeatherInfo() : null; return w && typeof w.then !== 'function' ? [w.desc, w.text, w.now].join(' ') : ''; } catch (e) { return ''; } };
const stepsToday = () => { try { return (window.gyxWalkData ? window.gyxWalkData().walks : []).filter(w => X.day(new Date(w.start)) === X.day()).reduce((a, w) => a + (w.steps || 0), 0); } catch (e) { return 0; } };
const anniv = cid => { try { const c = X.char(cid), md = X.day().slice(5); return ((c && c.anniversaries) || []).some(a => String(a.date || '').slice(5) === md); } catch (e) { return false; } };
// 每种条件：信封上怎么写、现在满不满足
const COND = {
    rain: { t: '下雨天再拆', ico: '🌧️', ok: () => /雨/.test(weather()), hint: '天气里有雨的时候（天气来自「行程与天气」）' },
    snow: { t: '下雪那天拆', ico: '❄️', ok: () => /雪/.test(weather()), hint: '天气里有雪的时候' },
    night: { t: '凌晨睡不着的时候拆', ico: '🌙', ok: () => { const h = new Date().getHours(); return h >= 0 && h < 5; }, hint: '凌晨 0 点到 5 点' },
    sad: { t: '你难过的时候拆', ico: '🫧', ok: () => /难过|想哭|哭了|好累|崩溃|不开心|委屈|emo|心累|好烦|难受|低落|撑不住/.test(myRecent(3 * 36e5)), hint: '最近三小时里你说过难过、好累、想哭这类话' },
    fight: { t: '我们吵架以后拆', ico: '🌧️', ok: () => /吵架|生气|别理我|不想理你|讨厌你|气死我了|冷战/.test(myRecent(DAY)), hint: '最近一天里你们好像吵架了' },
    walk: { t: '走满一万步那天拆', ico: '👣', ok: () => stepsToday() >= 10000, hint: '「陪你散步」里今天数到一万步' },
    anniv: { t: '我们的纪念日拆', ico: '💗', ok: c => anniv(c), hint: '日历上你们的纪念日当天' },
    miss: { t: '想我的时候拆', ico: '💭', ok: () => true, honor: true, hint: '随时都能拆——但 TA 会知道你想 TA 了' }
};
const can = x => !x.opened && COND[x.cond] && COND[x.cond].ok(x.cid);
async function write(c, cond) {
    if (!c) return null; const have = D.list.filter(x => x.cid === String(c.id) && !x.opened).map(x => x.cond);
    if (!cond) { const pool = Object.keys(COND).filter(k => !have.includes(k)); if (!pool.length) return null; cond = X.pick(pool); }
    const K = COND[cond];
    let t = X.bailu() ? null : await X.ask(`${X.who(c)}\n你们最近的聊天：\n${X.recent(c, 16)}\n\n你写一封信装进信封，信封上写着「${K.t}」——她只有在那个时候才能拆开。按这个时刻她可能的心情来写：那时候她最需要听到什么？像你本人写的，别太长，150 字以内。只输出信的正文。`);
    t = String(t || X.v(`如果你现在打开了这封信，说明${K.t.replace(/拆$/, '')}。我不在你身边，但我早就想好了要跟你说：你很好，真的。`, `嘿，${K.t.replace(/拆$/, '')}了吧？别怕，我在。`)).trim();
    const x = { id: 'se' + Date.now().toString(36), cid: String(c.id), cond, at: Date.now(), text: t, opened: false };
    D.list.unshift(x); await save(); return x;
}
window.gyxSealOpenOne = async id => {
    const x = D.list.find(y => y.id === id); if (!x || x.opened) return;
    if (!can(x)) return X.toast(`${COND[x.cond].ico} ${COND[x.cond].t}`, X.v('还没到时候呢。', '现在还不能拆哦。', 'TA 说了，要等到那个时候。'));
    if (COND[x.cond].honor && !(await (typeof appConfirm === 'function' ? appConfirm('信封上写着「想我的时候拆」。\n\n你现在是想 TA 了吗？') : Promise.resolve(confirm('你现在是想 TA 了吗？'))))) return;
    x.opened = true; x.openedAt = Date.now(); await save();
    const c = X.char(x.cid);
    if (c && COND[x.cond].honor) X.say(c, X.v('……你拆了那封信。我也想你。', '被我抓到了，想我了吧。', '我就知道你会拆的。'));
    window.gyxSealOpen(x.cid, x.id);
};
window.gyxSealWrite = async (cid, cond) => { const x = await write(X.char(cid) || X.cur(), cond); X.toast(x ? '💌 ' + X.v('TA 写好了一封信', '一封封着的信', '信封上写着：' + COND[x.cond].t) : '信封都用完了', x ? COND[x.cond].t : '每种条件只能有一封没拆的'); window.gyxSealOpen(cid); };
window.gyxSealDel = async id => { D.list = D.list.filter(x => x.id !== id); await save(); window.gyxSealOpen(); };
window.gyxSealData = () => D; window.gyxSealCan = id => { const x = D.list.find(y => y.id === id); return !!x && can(x); };
window.gyxSealOpen = function (who, readId) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), L = D.list.filter(x => x.cid === cid), sealed = L.filter(x => !x.opened), opened = L.filter(x => x.opened);
    const rd = readId && D.list.find(x => x.id === readId);
    X.panel('gyxSealOv', '💌 ' + X.esc(X.name(c)) + ' 封好的信', `${rd ? `<div class="se-read gyx-hand"><div class="se-cond">${COND[rd.cond].ico} ${COND[rd.cond].t}</div>${X.esc(rd.text).replace(/\n/g, '<br>')}<div class="se-sig">—— ${X.esc(X.name(c))}</div></div>` : ''}
      <div class="gyx-row">${X.whoSel(cid, 'gyxSealOpen')}<select class="gyx-who" id="gyxSeCond"><option value="">让 TA 自己挑时候</option>${Object.keys(COND).map(k => `<option value="${k}">${COND[k].ico} ${COND[k].t}</option>`).join('')}</select><button class="gyx-btn lite" onclick="gyxSealWrite('${cid}',document.getElementById('gyxSeCond').value)">让 TA 写一封</button></div>
      <div class="gyx-tip">${X.v('信封上写着什么时候拆，没到时候就拆不开。', '有些话，TA 想等到那个时候再说。', '条件一到，会来提醒你。')}TA 自己也会偷偷写（自主模式里）。</div>
      <div class="se-grid">${sealed.map(x => { const ok = can(x); return `<div class="se-env${ok ? ' ok' : ''}" onclick="gyxSealOpenOne('${x.id}')"><b>${COND[x.cond].ico}</b><span class="gyx-hand">${COND[x.cond].t}</span><em>${ok ? '现在可以拆了' : COND[x.cond].hint}</em></div>`; }).join('') || '<div class="gyx-tip">还没有封着的信。</div>'}</div>
      ${opened.length ? `<h4 class="se-h">拆过的（${opened.length}）</h4>` + opened.map(x => `<div class="gyx-card"><div class="se-cond">${COND[x.cond].ico} ${COND[x.cond].t} · ${new Date(x.openedAt).toLocaleDateString()} 拆的</div><div class="gyx-hand se-txt">${X.esc(x.text).replace(/\n/g, '<br>')}</div><div class="gyx-tip" style="text-align:right"><span style="cursor:pointer" onclick="gyxSealDel('${x.id}')">删</span></div></div>`).join('') : ''}`);
};
// 条件到了：提醒一次（同一封信只提醒一次）
setInterval(() => { try { if (!X.on('gyxSeal')) return; D.list.filter(x => !x.opened && !COND[x.cond].honor && !D.told[x.id] && can(x)).forEach(x => { D.told[x.id] = Date.now(); const c = X.char(x.cid); X.notify(c, `💌 <b>${X.esc(X.name(c))}</b> 的一封信现在可以拆了`, `信封上写着：${COND[x.cond].t}`, () => window.gyxSealOpen(x.cid)); X.toast('💌 ' + COND[x.cond].t, X.v('那封信现在可以拆了。', 'TA 早就猜到会有这一刻。')); }); save(); } catch (e) {} }, 10 * 60000);
X.ctx(id => { const S0 = D.list.filter(x => x.cid === String(id)); if (!S0.length) return ''; const o = S0.find(x => x.opened && Date.now() - x.openedAt < DAY); return `【你写过一些封着的信】信封上写着：${S0.filter(x => !x.opened).map(x => COND[x.cond].t).join('、') || '（都拆了）'}。别主动说信里写了什么。` + (o ? `她刚拆了「${COND[o.cond].t}」那封。` : ''); }, 'gyxSeal');
X.action({ key: 'gyx_seal', label: '偷偷写一封「到某个时候才能拆」的信给她', hint: '有条件才能拆的信', need: c => D.list.filter(x => x.cid === String(c.id) && !x.opened).length < 4 && !D.list.some(x => x.cid === String(c.id) && Date.now() - x.at < 3 * DAY),
    run: async c => { const x = await write(c); if (!x) return null; X.notify(c, `💌 <b>${X.esc(X.name(c))}</b> 留了一封封着的信`, `信封上写着：${COND[x.cond].t}`, () => window.gyxSealOpen(c.id)); return '留了一封「' + COND[x.cond].t + '」的信'; } }, 'gyxSeal');
X.today(() => ({ title: '💌 封着的信', rows: D.list.filter(x => can(x) && !COND[x.cond].honor && X.char(x.cid)).map(x => ({ t: '可以拆了', x: COND[x.cond].ico + ' ' + COND[x.cond].t + ' · ' + X.esc(X.name(X.char(x.cid))), go: `gyxSealOpen('${x.cid}')` })) }), 'gyxSeal');
X.widget('gyxSealW', { n: '封着的信', sizes: ['s', 'm'], tap: () => window.gyxSealOpen(), r: w => { const s = D.list.filter(x => !x.opened), ok = s.filter(x => can(x) && !COND[x.cond].honor); return X.gw(w, '💌', '封着的信', s.length ? [ok.length ? ok.length + ' 封可以拆了' : s.length + ' 封等着', COND[s[0].cond].t] : ['还没有']); } }, 'gyxSeal');
X.memArr({ k: 'gyxSeal', ico: '💌', n: '有条件才能拆的信', d: 'TA 写的信和信封上的条件（没拆的也在，改了 TA 就按改的记）', arr: () => D.list, field: 'text', text: x => x.text, meta: x => COND[x.cond].t + (x.opened ? ' · 已拆' : ' · 封着'), save }, 'gyxSeal');
X.css('gyxSealCss', `.se-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:10px 0}.se-env{position:relative;background:linear-gradient(160deg,#fbf3e4,#f3e2c4);border-radius:10px;padding:16px 12px 12px;cursor:pointer;box-shadow:0 3px 10px rgba(120,80,20,.15);text-align:center;min-height:96px}.se-env:before{content:'';position:absolute;left:0;right:0;top:0;height:28px;background:linear-gradient(160deg,#f0dcb5,#e8cf9f);clip-path:polygon(0 0,100% 0,50% 100%)}.se-env b{position:relative;font-size:22px;font-weight:normal}.se-env span{display:block;font-size:16px;margin-top:6px;color:#6b4a1f}.se-env em{display:block;font-style:normal;font-size:11px;color:#a08460;margin-top:4px}.se-env.ok{box-shadow:0 0 0 2px #ff6b8b,0 3px 12px rgba(255,107,139,.3)}.se-env.ok em{color:#ff4d79}
.se-read{background:#fffaf2;border-radius:14px;padding:16px;font-size:17px;line-height:1.9;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.06)}.se-cond{font-size:12px;color:#a08460;margin-bottom:6px;font-family:inherit}.se-sig{text-align:right;margin-top:8px}.se-h{font-size:14px;margin:14px 0 6px}.se-txt{font-size:15.5px;line-height:1.8}`);
X.mini({ id: 'gyxSeal', icon: '💌', title: '有条件才能拆的信', desc: '下雨天、睡不着、难过的时候……到时候才能拆', cat: '回忆', onOpen: () => window.gyxSealOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.list = D.list || []; D.told = D.told || {}; })();
