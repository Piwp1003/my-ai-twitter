/* 🕯️ 一起安静待着：不聊天也能在一起。打开后屏幕常亮、放一点环境音（雨、炉火、咖啡馆、海浪、夜里的虫鸣），TA 就在旁边——偶尔轻轻说一句，或者只是"嗯"。适合工作、发呆、睡不着的时候 */
if (window.__gyxStill) return; window.__gyxStill = 1;
X.feat('gyxStill', { n: '🕯️ 一起安静待着', desc: '屏幕常亮 + 环境音，TA 在旁边偶尔说一句' });
const S = X.store('still');
let D = { log: [], cfg: { snd: 'rain', vol: .5, every: 15, quiet: false, voice: false } };   // log: {id,cid,start,end,snd,lines:[]}
const SND = { rain: '🌧️ 雨', fire: '🔥 炉火', cafe: '☕ 咖啡馆', sea: '🌊 海浪', night: '🦗 夏夜', none: '🤫 什么都不放' };
let R = null;   // 正在进行：{cid,start,lines,ac,nodes,lock,tm,lastT}
const mins = ms => Math.max(0, Math.round(ms / 60000));
/* ---- 环境音：全用 WebAudio 现场合成，不用下载任何音频 ---- */
function noise(ac, kind) { const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { l = (l + .02 * w) / 1.02; d[i] = l * 3.5; } else d[i] = w; } const s = ac.createBufferSource(); s.buffer = b; s.loop = true; return s; }
function play(snd) {
    stopSnd(); if (!R || snd === 'none') return;
    let ac; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const out = ac.createGain(); out.gain.value = +D.cfg.vol; out.connect(ac.destination); const nodes = [];
    const chain = (src, type, f, q, g) => { const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q; const gn = ac.createGain(); gn.gain.value = g; src.connect(fl); fl.connect(gn); gn.connect(out); src.start(); nodes.push(src); return gn; };
    if (snd === 'rain') { chain(noise(ac), 'highpass', 900, 0, .35); chain(noise(ac, 'brown'), 'lowpass', 500, 0, .5); }
    if (snd === 'fire') { chain(noise(ac, 'brown'), 'lowpass', 300, 0, .7); const cr = () => { if (!R || R.ac !== ac) return; const s = noise(ac), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.frequency.value = 1500 + Math.random() * 3000; g.gain.setValueAtTime(.5, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .05); s.connect(f); f.connect(g); g.connect(out); s.start(); s.stop(ac.currentTime + .06); setTimeout(cr, 80 + Math.random() * 600); }; cr(); }
    if (snd === 'cafe') { chain(noise(ac, 'brown'), 'bandpass', 600, .7, .9); const cl = () => { if (!R || R.ac !== ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 2400 + Math.random() * 1800; g.gain.setValueAtTime(.05, ac.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .25); o.connect(g); g.connect(out); o.start(); o.stop(ac.currentTime + .3); setTimeout(cl, 2000 + Math.random() * 7000); }; cl(); }
    if (snd === 'sea') { const g = chain(noise(ac, 'brown'), 'lowpass', 700, 0, .6), lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .09; lg.gain.value = .45; lfo.connect(lg); lg.connect(g.gain); lfo.start(); nodes.push(lfo); }
    if (snd === 'night') { chain(noise(ac, 'brown'), 'lowpass', 250, 0, .3); const ck = () => { if (!R || R.ac !== ac) return; const t0 = ac.currentTime; for (let i = 0; i < 3; i++) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 4200; g.gain.setValueAtTime(0, t0 + i * .07); g.gain.linearRampToValueAtTime(.03, t0 + i * .07 + .01); g.gain.linearRampToValueAtTime(0, t0 + i * .07 + .05); o.connect(g); g.connect(out); o.start(t0 + i * .07); o.stop(t0 + i * .07 + .06); } setTimeout(ck, 700 + Math.random() * 1500); }; ck(); }
    R.ac = ac; R.out = out; R.nodes = nodes;
}
function stopSnd() { if (!R || !R.ac) return; try { R.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); R.ac.close(); } catch (e) {} R.ac = null; }
async function lock(on) { try { if (on && navigator.wakeLock) { R.lock = await navigator.wakeLock.request('screen'); } else if (R && R.lock) { await R.lock.release(); R.lock = null; } } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (R && !document.hidden && !R.lock) lock(true); });
async function murmur() {
    if (!R || R.busy) return; R.busy = 1; const c = X.char(R.cid), el = Date.now() - R.start, h = new Date().getHours();
    let t = X.bailu() ? null : await X.ask(`${X.who(c)}\n你和她现在「安静地待在一起」——各做各的，不聊天，背景是${SND[D.cfg.snd]}。已经待了 ${mins(el)} 分钟，现在 ${h} 点。刚才你说过：${R.lines.slice(-3).map(x => x.t).join(' / ') || '（还没说过话）'}\n轻轻说一句，很短（10 字以内），不要打扰她、不要问问题、不要找话题。也可以只是"嗯"、一个动作，或者什么都不说（那就只输出：…）。`);
    t = X.plain(t || X.pick(X.cards(['陪伴'], c, 3).concat(['嗯。', '我在。', '（翻了一页书）', '…', '你忙你的。', '（给你倒了杯水）', h >= 23 || h < 5 ? '困了就睡吧。' : '累了就歇会儿。'])));
    R.lines.push({ t, at: Date.now() }); R.busy = 0; paint(); if (D.cfg.voice && t !== '…') X.speak(c, t);
}
window.gyxStillStart = cid => {
    const c = X.char(cid) || X.cur(); if (!c || R) return;
    R = { cid: String(c.id), start: Date.now(), lines: [], lastT: Date.now() };
    play(D.cfg.snd); lock(true);
    R.tm = setInterval(() => { if (!R) return; if (!D.cfg.quiet && Date.now() - R.lastT >= (+D.cfg.every || 15) * 60000) { R.lastT = Date.now(); murmur(); } paint(); }, 20000);
    window.gyxStillOpen(c.id);
};
window.gyxStillStop = async () => {
    if (!R) return; const r = R; clearInterval(r.tm); stopSnd(); await lock(false); R = null;
    const e = { id: 'st' + Date.now().toString(36), cid: r.cid, start: r.start, end: Date.now(), snd: D.cfg.snd, lines: r.lines.map(x => x.t) };
    if (e.end - e.start > 60000) { D.log.unshift(e); D.log = D.log.slice(0, 200); await S.set('d', D); const c = X.char(r.cid); if (c && mins(e.end - e.start) >= 10) X.say(c, X.v(`刚才陪你待了 ${mins(e.end - e.start)} 分钟，很舒服。`, '一起安静待着，也挺好的。', `${mins(e.end - e.start)} 分钟，你辛苦了。`)); }
    window.gyxStillOpen(r.cid);
};
window.gyxStillCfg = (k, v) => { D.cfg[k] = v; S.set('d', D); if (k === 'snd' && R) play(v); if (k === 'vol' && R && R.out) R.out.gain.value = +v; };
window.gyxStillSay = () => murmur();
window.gyxStillDel = async id => { D.log = D.log.filter(x => x.id !== id); await S.set('d', D); window.gyxStillOpen(); };
window.gyxStillData = () => D; window.gyxStillLive = () => R;
function paint() { const b = document.getElementById('gyxStLive'); if (!b || !R) return; b.innerHTML = `<div class="st-t">${mins(Date.now() - R.start)}<span>分钟</span></div><div class="st-l">${R.lines.slice(-4).map(x => `<div>${X.esc(x.t)}</div>`).join('') || `<div style="opacity:.5">${X.esc(X.name(X.char(R.cid)))} 在旁边</div>`}</div>`; }
window.gyxStillOpen = function (who) {
    const c = (R && X.char(R.cid)) || X.char(who) || X.cur(); if (!c) return; const cid = String(c.id);
    const sel = Object.keys(SND).map(k => `<span class="gyx-chip${D.cfg.snd === k ? ' on' : ''}" onclick="gyxStillCfg('snd','${k}');gyxStillOpen('${cid}')">${SND[k]}</span>`).join('');
    const tot = D.log.filter(x => x.cid === cid).reduce((a, x) => a + (x.end - x.start), 0);
    X.panel('gyxStillOv', '🕯️ 和 ' + X.esc(X.name(c)) + ' 安静待着', `${R ? `<div class="st-room"><div id="gyxStLive"></div><div class="gyx-row" style="justify-content:center"><button class="gyx-btn" onclick="gyxStillStop()">先这样</button><button class="gyx-btn lite" onclick="gyxStillSay()">看 TA 一眼</button></div></div>`
        : `<div class="gyx-row">${X.whoSel(cid, 'gyxStillOpen')}<button class="gyx-btn" onclick="gyxStillStart('${cid}')">一起待会儿</button></div><div class="gyx-tip">${X.v('不用说话，TA 就在。', '各做各的，也算在一起。', '安安静静的，挺好。')}开着的时候手机屏幕不会自己熄掉（支持的浏览器）。</div>`}
      <div class="gyx-row">${sel}</div>
      <div class="gyx-row gyx-tip">音量 <input type="range" min="0" max="1" step="0.05" value="${D.cfg.vol}" oninput="gyxStillCfg('vol',+this.value)"> · 每 <input class="gyx-who" type="number" min="3" value="${D.cfg.every}" style="width:56px" onchange="gyxStillCfg('every',+this.value)"> 分钟轻轻说一句 · <label><input type="checkbox" ${D.cfg.quiet ? 'checked' : ''} onchange="gyxStillCfg('quiet',this.checked)"> 一句都别说</label> · <label><input type="checkbox" ${D.cfg.voice ? 'checked' : ''} onchange="gyxStillCfg('voice',this.checked)"> 念出来</label></div>
      <div class="gyx-tip">一起待过 ${mins(tot)} 分钟</div>
      ${D.log.filter(x => x.cid === cid).slice(0, 12).map(x => `<div class="st-row"><b>${mins(x.end - x.start)} 分钟</b><span>${new Date(x.start).toLocaleString()} · ${SND[x.snd] || ''}${x.lines.length ? '<br>「' + X.esc(x.lines.slice(-1)[0]) + '」' : ''}</span><i onclick="gyxStillDel('${x.id}')">删</i></div>`).join('')}`, 'dark');
    paint();
};
X.ctx(id => { if (R && R.cid === String(id)) return `【你们正安静地待在一起】已经 ${mins(Date.now() - R.start)} 分钟，背景是${SND[D.cfg.snd]}。她在做自己的事，你也是。说话要轻、要短，别打扰她。`; const x = D.log.find(l => l.cid === String(id)); return x && Date.now() - x.end < 3 * 36e5 ? `【刚才】你们安静地一起待了 ${mins(x.end - x.start)} 分钟。` : ''; }, 'gyxStill');
X.action({ key: 'gyx_still', label: '她好像很累或睡不着，问她要不要一起安静待会儿（打开「一起安静待着」）', hint: '一起安静待着', need: c => { const h = new Date().getHours(); return !R && (h >= 22 || h < 2 || (h >= 14 && h <= 16)) && !D.log.some(x => x.cid === String(c.id) && Date.now() - x.end < DAYMS); },
    run: async c => (await X.reach(c, '你感觉她今天有点累 / 这么晚还没睡。不用聊什么，问她要不要「一起安静待会儿」（她可以打开「🕯️ 一起安静待着」），你就在旁边')) ? '问你要不要一起安静待会儿' : null }, 'gyxStill');
const DAYMS = 864e5;
X.today(() => ({ title: '🕯️ 安静待着', rows: (R ? [{ t: '进行中', x: mins(Date.now() - R.start) + ' 分钟', go: 'gyxStillOpen()' }] : []).concat(D.log.filter(x => X.day(new Date(x.start)) === X.day()).map(x => ({ t: mins(x.end - x.start) + ' 分钟', x: '和 ' + X.esc(X.name(X.char(x.cid))) + ' 安静待着', go: `gyxStillOpen('${x.cid}')` }))) }), 'gyxStill');
X.widget('gyxStillW', { n: '安静待着', sizes: ['s', 'm'], tap: () => window.gyxStillOpen(), r: w => R ? X.gw(w, '🕯️', '在一起', [mins(Date.now() - R.start) + ' 分钟', SND[D.cfg.snd]]) : X.gw(w, '🕯️', '安静待着', [D.log.length ? '一共 ' + mins(D.log.reduce((a, x) => a + x.end - x.start, 0)) + ' 分钟' : '待会儿？']) }, 'gyxStill');
X.memArr({ k: 'gyxStill', ico: '🕯️', n: '一起安静待着', d: '一起安静待过的时候，TA 最后说的那句', arr: () => D.log, text: x => x.lines.slice(-1)[0] || '', edit: (x, v) => { x.lines = x.lines.slice(0, -1).concat(v); }, meta: x => new Date(x.start).toLocaleString() + ' · ' + mins(x.end - x.start) + ' 分钟', save: () => S.set('d', D) }, 'gyxStill');
X.css('gyxStillCss', `#gyxStillOv .gyx-box,.gyx-inhub#gyxStillOv{background:#1c1a22;color:#efe9ff}#gyxStillOv .gyx-chip{background:#2c2934;color:#efe9ff}#gyxStillOv .gyx-chip.on{background:#f5d48b;color:#1c1a22}#gyxStillOv .gyx-who{background:#2c2934;color:#fff;border-color:#3a3644}#gyxStillOv .gyx-btn{background:#f5d48b;color:#1c1a22}#gyxStillOv .gyx-btn.lite{background:#2c2934;color:#efe9ff}
.st-room{background:radial-gradient(circle at 50% 30%,rgba(245,212,139,.18),transparent 60%);border-radius:18px;padding:18px 10px;text-align:center}.st-t{font-size:44px;font-weight:200}.st-t span{font-size:13px;margin-left:4px;opacity:.6}.st-l div{font-size:15px;padding:4px;opacity:.85;animation:stIn 1.2s}@keyframes stIn{from{opacity:0}}
.st-row{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:13px}.st-row span{flex:1;opacity:.7}.st-row i{font-style:normal;font-size:11px;opacity:.5;cursor:pointer}`);
X.mini({ id: 'gyxStill', icon: '🕯️', title: '一起安静待着', desc: '不聊天也在一起：环境音 + 屏幕常亮', cat: '陪伴', onOpen: () => window.gyxStillOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.log = D.log || []; D.cfg = Object.assign({ snd: 'rain', vol: .5, every: 15, quiet: false, voice: false }, D.cfg || {}); })();
