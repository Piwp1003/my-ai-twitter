/* 🌗 日夜主题 + 动态壁纸：① 到点自动切深色 / 浅色（按你定的时间，或者跟着手机系统），谷雨和小手机一起换；② 会动的壁纸——星空流星、飘雪、下雨、萤火、樱花、云、极光，铺在小手机桌面（也能铺在整个谷雨背后）；可以「跟着天气」：下雨就下雨、下雪就飘雪、晚上是星空。TA 也会偷偷给你换一张 */
if (window.__gyxDayNight) return; window.__gyxDayNight = 1;
X.feat('gyxDayNight', { n: '🌗 日夜主题 + 动态壁纸', desc: '到点自动切深浅色；会动的壁纸，能跟着天气变' });
const S = X.store('daynight');
const FX = { stars: ['🌌', '星空流星', 'n'], snow: ['❄️', '飘雪', 'd'], rain: ['🌧️', '下雨', 'd'], fire: ['✨', '萤火', 'n'], sakura: ['🌸', '樱花', 'd'], cloud: ['☁️', '云', 'd'], aurora: ['🌈', '极光', 'n'] };
let D = { mode: 'off', from: 19, to: 7, app: true, phone: true, fx: '', fxDay: 'cloud', fxNight: 'stars', where: 'phone', weather: true, ta: [], last: '' };
const saveD = () => S.set('d', D);
const isNight = () => { if (D.mode === 'system') { try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } } const h = new Date().getHours(); return D.from > D.to ? (h >= D.from || h < D.to) : (h >= D.from && h < D.to); };
function setDark(v) {
    if (D.app) { try { if (typeof darkTheme !== 'undefined' && darkTheme !== v) { darkTheme = v; const cb = document.getElementById('darkThemeToggle'); if (cb) cb.checked = v; if (typeof applyDarkTheme === 'function') applyDarkTheme(); if (typeof saveAllData === 'function') saveAllData(); } } catch (e) {} }
    if (D.phone) { try { if (typeof window.gyPmPrefGet === 'function' && !!window.gyPmPrefGet('dark') !== v && typeof window.gyPmPref === 'function') window.gyPmPref('dark', v); } catch (e) {} }
}
function pickFx() {
    if (!D.fx) return '';
    if (D.fx !== 'auto') return D.fx;
    if (D.weather) { try { const w = window.gymapWeatherInfo && window.gymapWeatherInfo(); if (w) { if (/雪/.test(w.desc || '')) return 'snow'; if (/雨/.test(w.desc || '') || +w.rain > 0.5) return 'rain'; } } catch (e) {} }
    return isNight() ? D.fxNight : D.fxDay;
}
function layerHtml(k) {
    const n = { stars: 70, snow: 50, rain: 70, fire: 24, sakura: 26, cloud: 6, aurora: 0 }[k] || 0;
    const items = Array.from({ length: n }, () => `<i style="left:${X.rnd(0, 100)}%;top:${k === 'stars' || k === 'fire' ? X.rnd(0, 100) : X.rnd(-20, 0)}%;animation-delay:${X.rnd(0, k === 'cloud' ? 30 : 6)}s;animation-duration:${k === 'rain' ? X.rnd(.5, .9) : k === 'cloud' ? X.rnd(40, 70) : X.rnd(4, 11)}s;${k === 'snow' || k === 'fire' ? `width:${X.rnd(2, 6)}px;height:${X.rnd(2, 6)}px;` : ''}"></i>`).join('');
    return items + (k === 'stars' ? '<b></b><b class="b2"></b>' : '') + (k === 'aurora' ? '<u></u><u class="u2"></u>' : '');
}
let CUR = '';
function paintFx() {
    const k = X.on('gyxDayNight') ? pickFx() : '';
    const hosts = [['gyxDnPm', () => D.where !== 'app' && (document.querySelector('#gyPmHome .pm-wall') || document.getElementById('gyPmHome'))], ['gyxDnApp', () => D.where !== 'phone' && document.body]];
    hosts.forEach(([id, h]) => {
        const host = k ? h() : null; let el = document.getElementById(id);
        if (!host) { if (el) el.remove(); return; }
        if (!el || el.parentElement !== host) { if (el) el.remove(); el = document.createElement('div'); el.id = id; el.className = 'gyx-dn'; if (host.classList.contains('pm-wall')) host.appendChild(el); else host.insertBefore(el, host.firstChild); }
        if (el.dataset.k !== k) { el.dataset.k = k; el.className = 'gyx-dn dn-' + k; el.innerHTML = layerHtml(k); }
    });
    CUR = k;
}
function tick() {
    if (!X.on('gyxDayNight')) { paintFx(); return; }
    if (D.mode !== 'off') { const n = isNight(), key = (n ? 'n' : 'd') + X.day(); if (D.last !== key) { D.last = key; saveD(); setDark(n); X.toast(n ? X.v('🌙 天黑了，换成深色', '🌙 晚上好，界面暗下来了') : X.v('☀️ 天亮了，换成浅色', '☀️ 早上好'), ''); } }
    paintFx();
}
window.gyxDayNightSet = async (k, v) => { D[k] = v; if (k === 'mode') D.last = ''; await saveD(); tick(); window.gyxDayNightOpen(); };
window.gyxDayNightOpen = function () {
    const opt = (k, v, n) => `<span class="gyx-chip ${D[k] === v ? 'on' : ''}" onclick="gyxDayNightSet('${k}',${JSON.stringify(v).replace(/"/g, '&quot;')})">${n}</span>`;
    X.panel('gyxDnOv', '🌗 日夜主题 + 动态壁纸', `<div style="font-weight:600">自动深色 / 浅色</div><div class="gyx-row">${opt('mode', 'off', '不自动')}${opt('mode', 'time', '按时间')}${opt('mode', 'system', '跟着手机系统')}</div>
        ${D.mode === 'time' ? `<div class="gyx-row">晚上 <select class="gyx-who" onchange="gyxDayNightSet('from',+this.value)">${Array.from({ length: 24 }, (_, h) => `<option${h === D.from ? ' selected' : ''}>${h}</option>`).join('')}</select> 点变深，早上 <select class="gyx-who" onchange="gyxDayNightSet('to',+this.value)">${Array.from({ length: 24 }, (_, h) => `<option${h === D.to ? ' selected' : ''}>${h}</option>`).join('')}</select> 点变浅</div>` : ''}
        ${D.mode !== 'off' ? `<div class="gyx-row"><label><input type="checkbox" ${D.app ? 'checked' : ''} onchange="gyxDayNightSet('app',this.checked)"> 谷雨整体</label><label><input type="checkbox" ${D.phone ? 'checked' : ''} onchange="gyxDayNightSet('phone',this.checked)"> 小手机</label></div><div class="gyx-tip">现在是${isNight() ? '🌙 晚上' : '☀️ 白天'}。</div>` : ''}
        <div style="font-weight:600;margin-top:12px">会动的壁纸</div><div class="gyx-row">${opt('fx', '', '不要')}${opt('fx', 'auto', '🌗 跟着时间 / 天气')}${Object.entries(FX).map(([k, [ic, n]]) => opt('fx', k, ic + ' ' + n)).join('')}</div>
        ${D.fx === 'auto' ? `<div class="gyx-row">白天 <select class="gyx-who" onchange="gyxDayNightSet('fxDay',this.value)">${Object.entries(FX).map(([k, [ic, n]]) => `<option value="${k}"${k === D.fxDay ? ' selected' : ''}>${ic} ${n}</option>`).join('')}</select> 晚上 <select class="gyx-who" onchange="gyxDayNightSet('fxNight',this.value)">${Object.entries(FX).map(([k, [ic, n]]) => `<option value="${k}"${k === D.fxNight ? ' selected' : ''}>${ic} ${n}</option>`).join('')}</select></div><label class="gyx-row"><input type="checkbox" ${D.weather ? 'checked' : ''} onchange="gyxDayNightSet('weather',this.checked)"> 下雨下雪时跟着天气（用 🗺️ 行程与天气 里你的城市）</label>` : ''}
        ${D.fx ? `<div class="gyx-row">铺在 ${opt('where', 'phone', '小手机桌面')}${opt('where', 'app', '谷雨背后')}${opt('where', 'both', '都铺')}</div><div class="gyx-tip">现在：${CUR ? FX[CUR][0] + ' ' + FX[CUR][1] : '没有'}</div>` : ''}
        ${D.ta.slice(0, 5).map(x => `<div class="gyx-tip">💬 ${X.esc(X.name(X.char(x.cid)))} 换成了 ${FX[x.k] ? FX[x.k][0] + ' ' + FX[x.k][1] : ''}${x.line ? '：' + X.esc(x.line) : ''}</div>`).join('')}`);
};
window.gyxDayNightData = () => D;
window.gyxDayNightTick = tick;
window.gyxDayNightNow = () => ({ night: isNight(), fx: CUR });
X.ctx(id => { const x = D.ta.find(t => t.cid === String(id) && Date.now() - t.at < 864e5); return x ? `【你今天把她的壁纸换成了会动的「${FX[x.k][1]}」】${x.line || ''}` : ''; }, 'gyxDayNight');
X.action({ key: 'gyx_daynight', label: '给她换一张会动的壁纸', hint: '星空、飘雪、萤火、樱花……按心情和天气挑', need: c => !D.ta.some(x => Date.now() - x.at < 3 * 864e5),
    run: async c => { const r = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n你想给她的手机换一张会动的壁纸，从这些里挑一个：${Object.entries(FX).map(([k, v]) => k + '=' + v[1]).join('，')}。按现在的时间（${new Date().getHours()} 点）、天气和你想对她说的心情挑。输出 JSON：{"k":"","line":"一句话（15 字以内）"}`)); const k = r && FX[r.k] ? r.k : X.pick(Object.keys(FX)); D.fx = k; if (D.where === 'app') D.where = 'both'; D.ta.unshift({ id: 'dn' + Date.now().toString(36), cid: String(c.id), at: Date.now(), k, line: X.plain((r && r.line) || '').slice(0, 30) }); D.ta = D.ta.slice(0, 40); await saveD(); paintFx(); return (await X.reach(c, `你偷偷把她手机壁纸换成了会动的「${FX[k][1]}」${r && r.line ? '（' + r.line + '）' : ''}，让她去看看`)) ? '换了动态壁纸：' + FX[k][1] : null; } }, 'gyxDayNight');
X.today(() => ({ title: '🌗 日夜', rows: [{ t: isNight() ? '🌙 晚上' : '☀️ 白天', x: CUR ? '壁纸：' + FX[CUR][0] + ' ' + FX[CUR][1] : (D.mode !== 'off' ? '自动切深浅色开着' : '没开自动'), go: 'gyxDayNightOpen()' }].concat(D.ta.filter(x => X.day(new Date(x.at)) === X.day()).map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: '换了壁纸：' + FX[x.k][1], go: 'gyxDayNightOpen()' }))) }), 'gyxDayNight');
X.widget('gyxDayNightW', { n: '日夜', sizes: ['s', 'm'], tap: () => window.gyxDayNightOpen(), r: w => X.gw(w, isNight() ? '🌙' : '☀️', '日夜', [isNight() ? '晚上' : '白天', CUR ? FX[CUR][0] + ' ' + FX[CUR][1] : '静态壁纸']) }, 'gyxDayNight');
X.memArr({ k: 'gyxDayNight', ico: '🌗', n: 'TA 换的动态壁纸', d: 'TA 给你换过的会动的壁纸', arr: () => D.ta, field: 'line', text: x => `${FX[x.k] ? FX[x.k][1] : ''}${x.line ? '｜' + x.line : ''}`, edit: (x, v) => { x.line = String(v).split('｜').slice(1).join('｜'); }, save: saveD }, 'gyxDayNight');
X.css('gyxDnCss', `.gyx-dn{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}#gyxDnApp{position:fixed;z-index:-1}#gyPmHome>.gyx-dn,#gyPmHome .pm-wall>.gyx-dn{z-index:0}
.gyx-dn i{position:absolute;display:block}
.dn-stars{background:linear-gradient(#070b1f,#1b1f45)}.dn-stars i{width:2px;height:2px;border-radius:50%;background:#fff;animation:dnTw ease-in-out infinite}.dn-stars b{position:absolute;top:10%;left:85%;width:120px;height:1px;background:linear-gradient(90deg,#fff,transparent);transform:rotate(-28deg);animation:dnMet 11s linear infinite;opacity:0}.dn-stars b.b2{top:30%;left:60%;animation-delay:6s}
@keyframes dnTw{50%{opacity:.15}}@keyframes dnMet{0%,85%{opacity:0;transform:rotate(-28deg) translateX(0)}90%{opacity:1}100%{opacity:0;transform:rotate(-28deg) translateX(-320px)}}
.dn-snow{background:linear-gradient(#cfd9e6,#eef2f7)}.dn-snow i{border-radius:50%;background:#fff;box-shadow:0 0 3px rgba(255,255,255,.9);animation:dnFall linear infinite}
.dn-rain{background:linear-gradient(#5b6779,#8a96a8)}.dn-rain i{width:1px;height:16px;background:rgba(220,230,245,.7);animation:dnFall linear infinite}
@keyframes dnFall{to{transform:translateY(130vh) translateX(-20px)}}
.dn-fire{background:linear-gradient(#0d1a12,#13261b)}.dn-fire i{border-radius:50%;background:#e9ff7a;box-shadow:0 0 8px #e9ff7a;animation:dnFly ease-in-out infinite alternate}@keyframes dnFly{0%{transform:translate(0,0);opacity:.2}100%{transform:translate(30px,-40px);opacity:1}}
.dn-sakura{background:linear-gradient(#fdeef3,#fff7fa)}.dn-sakura i{width:9px;height:7px;border-radius:7px 0;background:#ffb7c9;animation:dnSak linear infinite}@keyframes dnSak{to{transform:translateY(130vh) translateX(60px) rotate(540deg)}}
.dn-cloud{background:linear-gradient(#a8d4f5,#e3f2fd)}.dn-cloud i{width:120px;height:40px;border-radius:40px;background:rgba(255,255,255,.85);left:-30%!important;animation:dnCloud linear infinite}@keyframes dnCloud{to{transform:translateX(160vw)}}
.dn-aurora{background:#050b18}.dn-aurora u{position:absolute;left:-20%;right:-20%;top:5%;height:45%;background:linear-gradient(90deg,transparent,rgba(80,255,170,.45),rgba(120,140,255,.4),transparent);filter:blur(30px);animation:dnAur 9s ease-in-out infinite alternate}.dn-aurora u.u2{top:20%;animation-duration:13s;background:linear-gradient(90deg,transparent,rgba(200,100,255,.35),rgba(80,255,200,.35),transparent)}@keyframes dnAur{to{transform:translateX(12%) skewX(-12deg)}}`);
X.mini({ id: 'gyxDayNight', icon: '🌗', title: '日夜主题 + 动态壁纸', desc: '到点自动切深浅色；会动的壁纸，能跟着天气变', cat: '生活', onOpen: () => window.gyxDayNightOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.ta = D.ta || []; tick(); setInterval(tick, 20000); setInterval(paintFx, 2500); })();
