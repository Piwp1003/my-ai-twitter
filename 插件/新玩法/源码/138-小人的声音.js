/* 🗣️ 小人的声音：像「朋友收集 梦想生活」里捏 Mii 那样，给 3D 小人捏声音和说话方式。声音两条路：① 谷雨自带的（不花钱、不用接口，现场合成出来的「咿呀语」，也能换成手机 / 电脑自带的朗读念真话）；② 你自己接的语音接口（设置里配的那个）。六根滑杆：音高、语速、音质、音调、口音、抑扬；说话方式：语气、句尾、口头禅 */
if (window.__gyx3dVoice) return; window.__gyx3dVoice = 1;
X.feat('gyx3dVoice', { n: '🗣️ 小人的声音', desc: '给 3D 小人捏声音（音高 / 语速 / 音质 / 音调 / 口音 / 抑扬）和说话方式（语气 / 句尾 / 口头禅）。自带的声音不花钱；也能走你自己接的语音接口' });
const S = X.store('3dvoice');
const DEF = { pitch: 55, speed: 50, quality: 40, tone: 55, accent: 50, into: 55, vol: 80 };
let D = { path: 'built', mode: 'babble', auto: false, v: {}, st: {} };   // path：built 自带 / api 接口；mode：babble 咿呀语 / sys 系统朗读
const save = () => S.set('d', D);
const KEYS = [['pitch', '音高', '低', '高'], ['speed', '语速', '慢', '快'], ['quality', '音质', '柔', '亮'], ['tone', '音调', '厚', '嫩'], ['accent', '口音', '往下压', '往上扬'], ['into', '抑扬', '平平的', '起伏大'], ['vol', '音量', '小', '大']];
const PRESET = { '少年': [62, 55, 45, 55, 55, 60], '少女': [78, 58, 40, 75, 60, 70], '大叔': [25, 42, 55, 20, 40, 35], '御姐': [48, 45, 35, 40, 45, 50], '小孩': [90, 65, 50, 90, 65, 80], '机器人': [50, 50, 100, 50, 50, 0], '慵懒': [40, 25, 30, 45, 35, 30], '元气': [72, 75, 60, 65, 70, 90], '低音炮': [12, 40, 60, 8, 35, 40], '软乎乎': [70, 38, 10, 80, 55, 55] };
const MOODS = ['元气', '温柔', '慵懒', '傲娇', '正经', '软萌', '冷淡', '毒舌', '腼腆', '沉稳'];
const clamp = n => Math.max(0, Math.min(100, Math.round(+n || 0)));
const vOf = cid => Object.assign({}, DEF, D.v[String(cid)] || {});
const stOf = cid => Object.assign({ mood: '', tail: '', hi: '', happy: '', sad: '', angry: '' }, D.st[String(cid)] || {});

/* ---------------- 自带的声音：现场合成（不联网、不花钱） ---------------- */
const VOW = [[800, 1200], [300, 2300], [350, 800], [500, 1900], [450, 900]];   // 啊 衣 乌 诶 喔 的两个共振峰
let AC = null, playing = null;
function actx() {
    try { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === 'suspended') AC.resume().catch(() => {}); return AC; } catch (e) { return null; }
}
const hash = ch => { let h = Math.imul(ch.codePointAt(0) || 1, 2654435761) >>> 0; h ^= h >>> 13; return h >>> 0; };
// 一句话 → 一串音节：每个字一个音；标点决定停顿和句尾往上扬还是往下落
function plan(text, v) {
    const dur = 0.20 - v.speed / 100 * 0.13, f0 = 85 * Math.pow(2, v.pitch / 100 * 2.3), into = v.into / 100, L = [];
    let t = 0, pos = 0;
    Array.from(X.plain(String(text || ''))).slice(0, 90).forEach(ch => {
        if (/\s/.test(ch)) { t += dur * 0.4; return; }
        if (/[，,、；;：:]/.test(ch)) { t += dur * 1.1; pos = 0; return; }
        if (/[。.！!？?…~～—]/.test(ch)) {
            const last = L[L.length - 1];
            if (last) { if (/[？?]/.test(ch)) last.end = 1.35; else if (/[！!]/.test(ch)) { last.gain = 1.25; last.end = 0.92; } else if (/[~～…]/.test(ch)) { last.d *= 1.8; last.end = 1.05; } else last.end = 0.8; }
            t += dur * 1.8; pos = 0; return;
        }
        if (/[\p{P}\p{S}]/u.test(ch)) return;
        const h = hash(ch), mel = ((h % 1000) / 1000 - 0.5) * 2, latin = /[a-z0-9]/i.test(ch), d = dur * (latin ? 0.6 : 1);
        L.push({ t, d, f: f0 * Math.pow(2, (mel * into * 5 - pos * 0.25 * (0.3 + into)) / 12), end: 1, gain: 1, vow: VOW[(h >>> 10) % 5] });
        t += d * 1.02; pos++;
    });
    return { L, total: t + 0.1 };
}
function stop() { const p = playing; playing = null; if (p) try { p.stop(); } catch (e) {} }
function babble(text, v, onEnd) {
    const ac = actx(); if (!ac) { if (onEnd) onEnd(); return null; }
    const { L, total } = plan(text, v); if (!L.length) { if (onEnd) onEnd(); return null; }
    const out = ac.createGain(); out.gain.value = 0.24 * v.vol / 100; out.connect(ac.destination);
    const t0 = ac.currentTime + 0.05, q = v.quality / 100, tone = 0.75 + v.tone / 100 * 0.7, glide = Math.sqrt(1 + (v.accent / 100 - 0.5) * 0.24), nodes = [];
    L.forEach(s => {
        const a = t0 + s.t, b = a + s.d, o = ac.createOscillator(), g = ac.createGain();
        o.type = q < 0.34 ? 'triangle' : q < 0.67 ? 'sawtooth' : 'square';
        o.frequency.setValueAtTime(s.f / glide, a); o.frequency.linearRampToValueAtTime(s.f * glide * s.end, b);
        g.gain.setValueAtTime(0.0001, a); g.gain.linearRampToValueAtTime(s.gain, a + 0.012); g.gain.setValueAtTime(s.gain, Math.max(a + 0.013, b - 0.03)); g.gain.linearRampToValueAtTime(0.0001, b);
        const f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), g2 = ac.createGain();
        f1.type = 'bandpass'; f1.frequency.value = s.vow[0] * tone; f1.Q.value = 5; f2.type = 'bandpass'; f2.frequency.value = s.vow[1] * tone; f2.Q.value = 8; g2.gain.value = 0.6;
        o.connect(g); g.connect(f1); g.connect(f2); f1.connect(out); f2.connect(g2); g2.connect(out);
        o.start(a); o.stop(b + 0.02); nodes.push(o);
    });
    let tm = 0;
    const h = { kind: 'babble', total, n: L.length, stop() { clearTimeout(tm); nodes.forEach(o => { try { o.stop(); } catch (e) {} }); try { out.disconnect(); } catch (e) {} } };
    tm = setTimeout(() => { if (playing === h) playing = null; try { out.disconnect(); } catch (e) {} if (onEnd) onEnd(); }, (total + 0.1) * 1000);
    return h;
}
const sysHas = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
function sysSpeak(text, v, onEnd) {
    try {
        const u = new SpeechSynthesisUtterance(X.plain(String(text || ''))); u.lang = 'zh-CN';
        u.pitch = 0.3 + v.pitch / 100 * 1.7; u.rate = 0.6 + v.speed / 100 * 1.2; u.volume = v.vol / 100;
        u.onend = u.onerror = () => { if (onEnd) onEnd(); };
        speechSynthesis.cancel(); speechSynthesis.speak(u);
        return { kind: 'sys', stop() { try { speechSynthesis.cancel(); } catch (e) {} } };
    } catch (e) { return null; }
}
// 出声。走哪条路照设置来；接口那条没配好 / 没放出来，就退回自带的
async function speak(c, text, onEnd) {
    const v = vOf(c ? c.id : 'me');
    stop();
    if (D.path === 'api' && c && typeof window.gyVoiceSpeak === 'function') {
        try { const r = await window.gyVoiceSpeak(c, text, { onEnd }); if (r) { playing = { kind: 'api', stop() { try { if (window.gyVoiceStop) window.gyVoiceStop(); } catch (e) {} } }; return 'api'; } } catch (e) {}
    }
    let h = (D.mode === 'sys' && sysHas()) ? sysSpeak(text, v, onEnd) : null;
    if (!h) h = babble(text, v, onEnd);
    playing = h; return h ? h.kind : null;
}
window.gyx3dVoiceSpeak = speak; window.gyx3dVoiceStop = stop; window.gyx3dVoicePlan = (t, cid) => plan(t, vOf(cid));

/* ---------------- 小人开口时：点 ▶ 才放（你自己勾了「自动出声」才会自己响） ---------------- */
let LAST = null;
function offer(c, text) {
    let el = document.getElementById('gyx3dVoOffer');
    if (!el) { el = document.createElement('div'); el.id = 'gyx3dVoOffer'; el.className = 'gyx-vo'; document.body.appendChild(el); }
    LAST = { c, text };
    el.innerHTML = `<span class="p" onclick="gyx3dVoicePlayLast()">▶</span><span class="t"><b>${X.esc(c ? X.name(c) : '小人')}</b>${X.esc(text.slice(0, 60))}</span><span class="x" onclick="gyx3dVoiceStop();this.parentNode.remove()">✕</span>`;
    clearTimeout(el.__t); el.__t = setTimeout(() => { if (!el.__on) el.remove(); }, 20000);
}
window.gyx3dVoicePlayLast = () => { const el = document.getElementById('gyx3dVoOffer'); if (!LAST) return; if (el) el.__on = 1; speak(LAST.c, LAST.text, () => { const e = document.getElementById('gyx3dVoOffer'); if (e) e.remove(); }); };
window.gyx3dVoiceSay = function (cid, text, from) {
    if (!X.on('gyx3dVoice') || !X.vOn('gyx3dVoice')) return false;
    const c = (cid != null && X.char(cid)) || (from === 'pet' && window.gyxPetWho && window.gyxPetWho()) || X.cur();
    text = X.plain(String(text || '')); if (!text.trim() || text.trim() === '…') return false;
    if (D.auto) speak(c, text); else offer(c, text);
    return true;
};
// 桌面上的小 TA 冒泡说话时
(function hookPet() { let n = 0; const iv = setInterval(() => { const f = window.gyxPetSay; if (typeof f === 'function' && !f.__v3d) { const w = function (t) { const r = f.apply(this, arguments); try { window.gyx3dVoiceSay(null, t, 'pet'); } catch (e) {} return r; }; w.__v3d = 1; window.gyxPetSay = w; } if (++n > 60 || (window.gyxPetSay && window.gyxPetSay.__v3d)) clearInterval(iv); }, 1000); })();

/* ---------------- 说话方式：写进小人说话的提示词里 ---------------- */
window.gyx3dStyleHint = function (c) {
    if (!c || !X.on('gyx3dVoice')) return '';
    const s = stOf(c.id), L = [];
    if (s.mood) L.push('语气' + s.mood);
    if (s.tail) L.push(`句尾习惯带「${s.tail}」`);
    const cp = [['打招呼', s.hi], ['开心时', s.happy], ['难过时', s.sad], ['生气时', s.angry]].filter(x => x[1]).map(x => `${x[0]}爱说「${x[1]}」`);
    if (cp.length) L.push('口头禅（合适的时候才用，别每句都带）：' + cp.join('，'));
    return L.length ? `\n【你这个小人的说话方式】${L.join('；')}。` : '';
};
X.plGroup('🗣️ 小人的声音', '🗣️ 小人的声音', [['3d.voice', '让 TA 按人设捏自己的声音和说话方式']], {
    '3d.voice': '{{who}}\n现在要给你的 Q 版 3D 小人捏声音和说话方式（像「朋友收集」里捏小人那样）。按你的人设挑。\n声音六项，都是 0~100 的整数：pitch 音高（0 很低 → 100 很高）、speed 语速（0 慢 → 100 快）、quality 音质（0 柔和 → 100 尖亮）、tone 音调（0 低沉厚实 → 100 细嫩）、accent 口音（0 每个字往下压 → 100 往上扬）、into 抑扬（0 平平的 → 100 起伏很大）。\n说话方式：mood 从（{{moods}}）里选一个；tail 是句尾习惯带的字（没有就空着）；hi / happy / sad / angry 是打招呼、开心、难过、生气时的口头禅（每个 8 字以内，像你会说的，没有就空着）。\n只输出 JSON：{"pitch":50,"speed":50,"quality":50,"tone":50,"accent":50,"into":50,"mood":"","tail":"","hi":"","happy":"","sad":"","angry":""}'
});

/* ---------------- 页面 ---------------- */
let CUR = '';
const SAMPLE = c => X.pick([`你好呀，我是${X.name(c)}。今天过得怎么样？`, `嗯？你在看我吗！那我多说两句～`, `${X.name(c)}在这里。要不要一起出去走走？`]);
window.gyx3dVoiceOpen = function (who) {
    const c = X.char(who) || X.char(CUR) || X.cur(); if (!c) return X.toast('还没有角色', '先建一个角色，再来给 TA 的小人捏声音');
    CUR = String(c.id); const v = vOf(CUR), s = stOf(CUR), E = X.esc;
    const chip = (on, txt, js) => `<span class="gyx-chip${on ? ' on' : ''}" onclick="${js}">${txt}</span>`;
    X.panel('gyx3dVoOv', '🗣️ 小人的声音', `
      <div class="gyx-row">${X.whoSel(CUR, 'gyx3dVoiceOpen')}<button class="gyx-btn" onclick="gyx3dVoiceTry()">▶ 试听</button><button class="gyx-btn" onclick="gyx3dVoiceStop()">■ 停</button></div>
      <h4>声音走哪条路</h4>
      <div>${chip(D.path === 'built', '🆓 谷雨自带（不花钱）', "gyx3dVoiceCfg('path','built')")}${chip(D.path === 'api', '🔌 我自己接的语音接口', "gyx3dVoiceCfg('path','api')")}</div>
      ${D.path === 'api' ? `<div class="gyx-tip">用你在「🔊 语音」里配好的接口和音色念真话（按那家接口收费）。还没配：<span class="v3-a" onclick="gyOpenMiniFeature&&gyOpenMiniFeature('voice')">去配语音接口 ›</span>。没配好 / 没放出来时会自动退回自带的声音。</div>` : `<div>${chip(D.mode === 'babble', '咿呀语（像朋友收集，哪台设备都有）', "gyx3dVoiceCfg('mode','babble')")}${chip(D.mode === 'sys', '念真话（用这台设备自带的朗读）', "gyx3dVoiceCfg('mode','sys')")}</div><div class="gyx-tip">自带的声音是现场合成出来的：不联网、不花钱、不用接口。${D.mode === 'sys' && !sysHas() ? '⚠️ 这台设备没有自带的朗读（很多安卓 App 里没有），会用咿呀语代替。' : D.mode === 'sys' ? '念真话时只有音高、语速、音量管用。' : ''}</div>`}
      <h4>捏声音</h4>
      <div>${Object.keys(PRESET).map(k => chip(false, k, `gyx3dVoicePreset('${k}')`)).join('')}${chip(false, '🎲 随机', 'gyx3dVoiceRand()')}${chip(false, '✨ 让 TA 按人设自己捏', 'gyx3dVoiceAuto(this)')}</div>
      ${KEYS.map(([k, n, a, b]) => `<div class="v3-row"><b>${n}</b><em>${a}</em><input type="range" min="0" max="100" value="${v[k]}" oninput="gyx3dVoiceSet('${k}',this.value)" onchange="gyx3dVoiceTry()"><em>${b}</em></div>`).join('')}
      <h4>说话方式</h4>
      <div>${MOODS.map(m => chip(s.mood === m, m, `gyx3dVoiceSt('mood','${s.mood === m ? '' : m}',1)`)).join('')}</div>
      <div class="v3-row"><b>句尾</b><input class="gyx-who" style="flex:1" placeholder="比如：喵 / 的说 / 啦（可以空着）" value="${E(s.tail)}" onchange="gyx3dVoiceSt('tail',this.value)"></div>
      ${[['hi', '打招呼'], ['happy', '开心时'], ['sad', '难过时'], ['angry', '生气时']].map(([k, n]) => `<div class="v3-row"><b>${n}</b><input class="gyx-who" style="flex:1" placeholder="口头禅（可以空着）" value="${E(s[k])}" onchange="gyx3dVoiceSt('${k}',this.value)"></div>`).join('')}
      <div class="gyx-tip">说话方式会写进小人开口时的提示词：桌面上的小 TA、3D 小屋里的 TA 说话都会照这个来。</div>
      <h4>什么时候出声</h4>
      <label class="gyx-row gyx-tip"><input type="checkbox" ${X.vOn('gyx3dVoice') ? 'checked' : ''} onchange="GYX.vSet('gyx3dVoice',this.checked)"> 🔊 小人开口时可以出声（默认关。开了也不会自己响：冒一个小条，点 ▶ 才放）</label>
      <label class="gyx-row gyx-tip"><input type="checkbox" ${D.auto ? 'checked' : ''} onchange="gyx3dVoiceCfg('auto',this.checked)"> 不用我点，小人一开口就自己出声（你勾了才会）</label>`);
};
window.gyx3dVoiceCfg = (k, val) => { D[k] = val; save(); if (k !== 'auto') window.gyx3dVoiceOpen(CUR); };
window.gyx3dVoiceSet = (k, val) => { const o = D.v[CUR] = Object.assign({}, DEF, D.v[CUR] || {}); o[k] = clamp(val); save(); };
window.gyx3dVoiceSt = (k, val, re) => { const o = D.st[CUR] = stOf(CUR); o[k] = String(val || '').trim().slice(0, 16); save(); if (re) window.gyx3dVoiceOpen(CUR); };
window.gyx3dVoicePreset = name => { const p = PRESET[name]; if (!p) return; D.v[CUR] = Object.assign({}, vOf(CUR), { pitch: p[0], speed: p[1], quality: p[2], tone: p[3], accent: p[4], into: p[5] }); save(); window.gyx3dVoiceOpen(CUR); window.gyx3dVoiceTry(); };
window.gyx3dVoiceRand = () => { const r = () => Math.round(Math.random() * 100); D.v[CUR] = Object.assign({}, vOf(CUR), { pitch: r(), speed: 25 + Math.round(Math.random() * 55), quality: r(), tone: r(), accent: r(), into: r() }); save(); window.gyx3dVoiceOpen(CUR); window.gyx3dVoiceTry(); };
window.gyx3dVoiceTry = () => { const c = X.char(CUR); if (c) return speak(c, SAMPLE(c)); };
window.gyx3dVoiceAuto = async el => {
    const c = X.char(CUR); if (!c) return;
    if (el) { el.textContent = X.pick(['TA 在清嗓子……', 'TA 在想自己是什么声音……', '捏着呢……']); el.style.pointerEvents = 'none'; }
    let j = null; try { j = X.json(await X.ask(X.pl('3d.voice', '', { who: X.who(c), moods: MOODS.join(' / ') }))); } catch (e) {}
    if (!j) { X.toast(X.pick(['没捏成', 'TA 没想好']), '看看接口通不通，或者自己拖滑杆'); return window.gyx3dVoiceOpen(CUR); }
    const o = vOf(CUR); ['pitch', 'speed', 'quality', 'tone', 'accent', 'into'].forEach(k => { if (j[k] != null && !isNaN(+j[k])) o[k] = clamp(j[k]); }); D.v[CUR] = o;
    const st = stOf(CUR); if (MOODS.includes(j.mood)) st.mood = j.mood; ['tail', 'hi', 'happy', 'sad', 'angry'].forEach(k => { if (typeof j[k] === 'string') st[k] = X.plain(j[k]).slice(0, 16); }); D.st[CUR] = st;
    save(); window.gyx3dVoiceOpen(CUR); window.gyx3dVoiceTry();
};
window.gyx3dVoiceData = () => D;
X.css('gyx3dVoCss', `
#gyx3dVoOv h4{margin:16px 0 8px;font-size:14px}
.v3-row{display:flex;align-items:center;gap:8px;margin:8px 0}.v3-row b{width:52px;flex:none;font-size:13.5px;font-weight:600}.v3-row em{font-style:normal;font-size:11.5px;opacity:.6;width:44px;flex:none;text-align:center}.v3-row input[type=range]{flex:1;min-width:0}
.v3-a{color:#007aff;cursor:pointer}
`);
X.mini({ id: 'gyx3dVoice', icon: '🗣️', title: '小人的声音', desc: '给 3D 小人捏声音和说话方式：自带的不花钱，也能走你自己接的语音接口', onOpen: () => window.gyx3dVoiceOpen() });
(async () => { const d = await S.get('d', {}); D = Object.assign(D, d || {}); D.v = D.v || {}; D.st = D.st || {}; })();
