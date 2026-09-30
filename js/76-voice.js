/* ============================================================
   🎙️ TA 的声音（v205）
   - 接语音模型：浏览器自带 / OpenAI 格式（硅基流动等也是）/ MiniMax / 豆包·火山 / GPT-SoVITS（本地克隆）/ Fish Audio / 自定义地址
   - 每个角色自己的声音：跟默认 / 默认接口只换音色 / 自己一整套
   - 用在：打电话、TA 发的 🎤 语音条（点一下用 TA 的声音念）、长按「朗读」
   - 语音库（从白露搬过来）：上传 TA 本人的录音，TA 说到关键词就放这段
   - 念过的会存起来，同一句再放不再花钱
   ============================================================ */
(function () {
    'use strict';
    if (window.__gyVoiceLoaded) return;
    window.__gyVoiceLoaded = true;

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const toast = (a, b) => { try { showToast('', a, b || '', null, null, false); } catch (e) {} };
    const chars = () => (typeof myCharacters !== 'undefined' ? myCharacters : []).filter(c => c && !c.members);
    const charOf = x => (x && typeof x === 'object') ? x : chars().find(c => String(c.id) === String(x));
    const LF = (typeof localforage !== 'undefined' && localforage.createInstance) ? localforage.createInstance({ name: 'gyVoice', storeName: 'kv' }) : null;
    const get = async (k, d) => { try { const v = LF && await LF.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
    const put = async (k, v) => { try { if (LF) await LF.setItem(k, v); } catch (e) {} };

    /* ---------------- 接口 ---------------- */
    const PROV = {
        browser: { n: '浏览器自带（免费，机器味重）', f: [['bvoice', '系统里的声音', 'bsel', ''], ['rate', '语速', 'num', 1], ['pitch', '音调（男声调低一点，比如 0.8）', 'num', 1]] },
        openai: { n: 'OpenAI 格式（/v1/audio/speech，硅基流动这类中转也是）', f: [['url', '接口地址', 'text', 'https://api.openai.com/v1/audio/speech'], ['key', 'Key', 'pw', ''], ['model', '模型', 'text', 'tts-1'], ['voice', '音色', 'text', 'alloy'], ['rate', '语速', 'num', 1]] },
        minimax: { n: 'MiniMax', f: [['url', '接口地址', 'text', 'https://api.minimaxi.com/v1/t2a_v2'], ['key', 'API Key', 'pw', ''], ['group', 'GroupId（老账号要填，新的可以空着）', 'text', ''], ['model', '模型', 'text', 'speech-02-hd'], ['voice', '音色 voice_id', 'text', 'male-qn-qingse'], ['rate', '语速', 'num', 1], ['emotion', '情绪（可空：happy / sad / angry / calm…）', 'text', '']] },
        volc: { n: '豆包 / 火山引擎', f: [['url', '接口地址', 'text', 'https://openspeech.bytedance.com/api/v1/tts'], ['appid', 'AppID', 'text', ''], ['key', 'Access Token', 'pw', ''], ['cluster', 'Cluster', 'text', 'volcano_tts'], ['voice', '音色 voice_type', 'text', 'zh_male_M392_conversation_wvae_bigtts'], ['rate', '语速', 'num', 1]] },
        sovits: { n: 'GPT-SoVITS（本地，克隆 TA 的声音）', f: [['url', 'api_v2 地址', 'text', 'http://127.0.0.1:9880/tts'], ['ref', '参考音频路径（跑 SoVITS 那台电脑上的路径）', 'text', ''], ['prompt', '参考音频里说的那句话', 'text', ''], ['lang', '参考音频语言', 'text', 'zh'], ['rate', '语速', 'num', 1], ['extra', '其它参数（可空，形如 top_k=5&temperature=1）', 'text', '']] },
        fish: { n: 'Fish Audio', f: [['url', '接口地址', 'text', 'https://api.fish.audio/v1/tts'], ['key', 'API Key', 'pw', ''], ['voice', '声音模型 ID（reference_id）', 'text', ''], ['model', '模型', 'text', 's1']] },
        custom: { n: '自定义（GET 地址，{text} 会换成要念的话）', f: [['url', '地址模板', 'text', 'http://127.0.0.1:5000/tts?text={text}&voice={voice}'], ['voice', '音色（替换 {voice}）', 'text', ''], ['key', 'Key（可空，放进 Authorization）', 'pw', '']] }
    };
    // 「默认接口，只换音色」时能单独改的那几项
    const VOICE_KEYS = ['bvoice', 'voice', 'rate', 'pitch', 'ref', 'prompt', 'lang', 'emotion'];
    const defsOf = p => { const o = { prov: p }; (PROV[p] || PROV.browser).f.forEach(([k, , , d]) => { o[k] = d; }); return o; };

    let CFG = { def: defsOf('browser'), chars: {}, bubbles: true, stt: { url: '', key: '', model: 'whisper-1' } };
    const ready = (async () => {
        const c = await get('cfg', null);
        if (c) CFG = Object.assign(CFG, c);
        else {
            // 以前在「打电话」里填过朗读接口的：直接当默认声音
            try { const o = JSON.parse(localStorage.getItem('gy_call_cfg') || '{}'); if (o.tts === 'api' && o.url) CFG.def = Object.assign(defsOf('openai'), { url: o.url, key: o.key || '', model: o.model || 'tts-1', voice: o.voice || 'alloy', rate: +o.rate || 1 }); } catch (e) {}
        }
        CFG.chars = CFG.chars || {}; CFG.stt = Object.assign({ url: '', key: '', model: 'whisper-1' }, CFG.stt || {});
    })();
    const saveCfg = () => put('cfg', CFG);

    function cfgFor(ch) {
        const o = (ch && CFG.chars[String(ch.id)]) || {};
        if (o.mode === 'own' && o.own && o.own.prov) return Object.assign(defsOf(o.own.prov), o.own);
        if (o.mode === 'voice') { const r = Object.assign({}, CFG.def); VOICE_KEYS.forEach(k => { if (o[k] !== undefined && o[k] !== '') r[k] = o[k]; }); return r; }
        return Object.assign({}, CFG.def);
    }
    window.gyVoiceCfgFor = id => cfgFor(charOf(id));

    /* ---------------- 念之前收拾一下文字 ---------------- */
    const clean = t => String(t || '')
        .replace(/^\s*[\[【]\s*语音\s*[\]】]\s*/, '')
        .replace(/<[^>]+>/g, '').replace(/\[[^\]]*\]/g, '')
        .replace(/（[^）]*）|\([^)]*\)|\*[^*]*\*/g, '')
        .replace(/\s+/g, ' ').trim();
    window.gyVoiceClean = clean;

    /* ---------------- 合成 ---------------- */
    const hex2buf = h => { const a = new Uint8Array(h.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; };
    const b642buf = b => { const s = atob(b); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
    async function bad(r) { let t = ''; try { t = (await r.text()).slice(0, 160); } catch (e) {} throw new Error('HTTP ' + r.status + (t ? '：' + t : '')); }
    const SYN = {
        async openai(c, text) {
            let u = String(c.url || '').trim().replace(/\/+$/, '');
            if (!/audio\/speech/.test(u)) u += /\/v1$/.test(u) ? '/audio/speech' : '/v1/audio/speech';
            const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (c.key || '') }, body: JSON.stringify({ model: c.model || 'tts-1', input: text, voice: c.voice || 'alloy', speed: +c.rate || 1, response_format: 'mp3' }) });
            if (!r.ok) await bad(r);
            return r.blob();
        },
        async minimax(c, text) {
            let u = String(c.url || '').trim(); if (c.group) u += (u.includes('?') ? '&' : '?') + 'GroupId=' + encodeURIComponent(c.group);
            const vs = { voice_id: c.voice || 'male-qn-qingse', speed: +c.rate || 1, vol: 1, pitch: 0 }; if (c.emotion) vs.emotion = c.emotion;
            const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (c.key || '') }, body: JSON.stringify({ model: c.model || 'speech-02-hd', text, stream: false, voice_setting: vs, audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 } }) });
            if (!r.ok) await bad(r);
            const j = await r.json();
            if (j.base_resp && j.base_resp.status_code) throw new Error(j.base_resp.status_msg || ('错误 ' + j.base_resp.status_code));
            if (!j.data || !j.data.audio) throw new Error('没拿到声音');
            return new Blob([hex2buf(j.data.audio)], { type: 'audio/mpeg' });
        },
        async volc(c, text) {
            const body = { app: { appid: c.appid || '', token: c.key || '', cluster: c.cluster || 'volcano_tts' }, user: { uid: 'guyu' }, audio: { voice_type: c.voice || '', encoding: 'mp3', speed_ratio: +c.rate || 1 }, request: { reqid: 'gy' + Date.now() + Math.random().toString(36).slice(2, 8), text, operation: 'query' } };
            const r = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer;' + (c.key || '') }, body: JSON.stringify(body) });
            if (!r.ok) await bad(r);
            const j = await r.json();
            if (j.code !== 3000 || !j.data) throw new Error(j.message || ('错误 ' + j.code));
            return new Blob([b642buf(j.data)], { type: 'audio/mpeg' });
        },
        async sovits(c, text) {
            const q = new URLSearchParams({ text, text_lang: 'zh', ref_audio_path: c.ref || '', prompt_text: c.prompt || '', prompt_lang: c.lang || 'zh', speed_factor: String(+c.rate || 1), media_type: 'wav', streaming_mode: 'false' });
            let u = String(c.url || '').trim(); u += (u.includes('?') ? '&' : '?') + q.toString() + (c.extra ? '&' + String(c.extra).replace(/^[&?]/, '') : '');
            const r = await fetch(u); if (!r.ok) await bad(r);
            return r.blob();
        },
        async fish(c, text) {
            const h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (c.key || '') }; if (c.model) h.model = c.model;
            const r = await fetch(c.url, { method: 'POST', headers: h, body: JSON.stringify({ text, reference_id: c.voice || undefined, format: 'mp3' }) });
            if (!r.ok) await bad(r);
            return r.blob();
        },
        async custom(c, text) {
            const u = String(c.url || '').replace(/\{text\}/g, encodeURIComponent(text)).replace(/\{voice\}/g, encodeURIComponent(c.voice || ''));
            const r = await fetch(u, c.key ? { headers: { Authorization: 'Bearer ' + c.key } } : undefined); if (!r.ok) await bad(r);
            return r.blob();
        }
    };

    /* ---------------- 念过的存起来 ---------------- */
    const MEM = new Map();
    const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + s.length.toString(36); };
    async function synthUrl(c, text) {
        const sig = JSON.stringify(Object.assign({}, c, { key: '' })) + '|' + text;
        const k = 'tts:' + hash(sig);
        if (MEM.has(k)) return MEM.get(k);
        let b = await get(k, null);
        if (!b) {
            b = await SYN[c.prov](c, text);
            if (!b || !b.size) throw new Error('没拿到声音');
            await put(k, b);
            const L = await get('ttsKeys', []); L.push(k); while (L.length > 300) { const o = L.shift(); try { await LF.removeItem(o); } catch (e) {} } await put('ttsKeys', L);
        }
        const u = URL.createObjectURL(b); MEM.set(k, u); return u;
    }
    window.gyVoiceSynth = async (id, text) => { const c = cfgFor(charOf(id)); return c.prov === 'browser' ? null : synthUrl(c, clean(text)); };

    /* ---------------- 语音库（TA 本人的录音） ---------------- */
    let VL = null;   // [{id, name, chars:[名字], keys:[]}]
    const urls = {};
    async function vList() { if (!VL) VL = await get('clips', []); return VL; }
    async function vUrl(id) { if (urls[id]) return urls[id]; const b = await get('clip:' + id, null); if (!b) return null; return (urls[id] = URL.createObjectURL(b)); }
    async function clipFor(ch, text) {
        const t = String(text || ''); if (!t) return null;
        const L = (await vList()).filter(v => !v.chars.length || (ch && v.chars.includes(ch.name)));
        const hit = L.filter(v => (v.keys.length ? v.keys : [v.name]).some(k => k && t.includes(k)));
        return hit.length ? vUrl(hit[Math.floor(Math.random() * hit.length)].id) : null;
    }
    window.gyVoiceClip = clipFor;

    /* ---------------- 放出来 ---------------- */
    let cur = null;
    function stop() { try { if (cur) { cur.onended = null; cur.pause(); } } catch (e) {} cur = null; try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }
    window.gyVoiceStop = stop;
    function playUrl(u, onEnd) {
        stop();
        const a = new Audio(u); cur = a;
        a.onended = () => { if (cur === a) cur = null; if (onEnd) onEnd(); };
        return a.play().then(() => true, () => { if (onEnd) onEnd(); return false; });
    }
    function browserSay(c, text, onEnd) {
        try {
            if (!window.speechSynthesis) { if (onEnd) onEnd(); return false; }
            stop();
            const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-CN'; u.rate = +c.rate || 1; u.pitch = +c.pitch || 1;
            const vs = speechSynthesis.getVoices();
            const v = (c.bvoice && vs.find(x => x.name === c.bvoice)) || vs.find(x => /zh|Chinese/i.test(x.lang + x.name)); if (v) u.voice = v;
            u.onend = () => { if (onEnd) onEnd(); };
            speechSynthesis.speak(u); return true;
        } catch (e) { if (onEnd) onEnd(); return false; }
    }
    let lastErr = 0;
    // 用 TA 的声音说一句。返回 'clip' / 'model' / 'browser' / null
    window.gyVoiceSpeak = async function (who, text, opt) {
        opt = opt || {}; await ready;
        const ch = charOf(who), raw = String(text || ''), t = clean(raw);
        if (!t) { if (opt.onEnd) opt.onEnd(); return null; }
        const clip = await clipFor(ch, raw).catch(() => null);
        if (clip) { await playUrl(clip, opt.onEnd); return 'clip'; }
        const c = cfgFor(ch);
        if (c.prov !== 'browser' && SYN[c.prov]) {
            try { const u = await synthUrl(c, t); await playUrl(u, opt.onEnd); return 'model'; }
            catch (e) { if (Date.now() - lastErr > 60000) { lastErr = Date.now(); toast('🎙️ 语音接口没通', (e.message || e) + '（这句先用浏览器念）'); } }
        }
        return browserSay(c, t, opt.onEnd) ? 'browser' : null;
    };
    // 这个角色有没有「自己的声音」（给打电话用：没有就走打电话原来那套）
    window.gyVoiceHas = function (who) {
        const ch = charOf(who); if (!ch) return false;
        const o = CFG.chars[String(ch.id)] || {};
        return CFG.def.prov !== 'browser' || (o.mode && o.mode !== 'def') || !!(VL && VL.some(v => !v.chars.length || v.chars.includes(ch.name)));
    };

    /* ---------------- 🎤 语音条 ---------------- */
    const VRE = /^\s*[\[【]\s*语音\s*[\]】]/;
    const isVoiceMsg = m => m && m.sender !== 'system' && VRE.test(String(m.text || ''));
    window.gyIsVoiceMsg = isVoiceMsg;
    const secOf = m => m.voiceSec || Math.max(1, Math.min(60, Math.round(clean(m.text).length / 4)));
    const isAuto = c => { try { return typeof getCharActMode === 'function' ? getCharActMode(c) === 'auto' : c.actMode === 'auto'; } catch (e) { return false; } };
    // 这个角色有没有「能念出来的声音」（语音模型 / 语音库）。没有的话，语音条只能转文字
    const canSound = (ch, text) => { const c = cfgFor(ch); if (c.prov !== 'browser') return true; const t = String(text || ''); return !!(VL && VL.some(v => (!v.chars.length || (ch && v.chars.includes(ch.name))) && (v.keys.length ? v.keys : [v.name]).some(k => k && t.includes(k)))); };
    const FREQ = { never: 0, some: 10, often: 30, always: 100 };
    const FREQ_N = [['never', '从不'], ['some', '偶尔'], ['often', '经常'], ['always', '总是']];
    const freqOf = ch => { const o = (ch && CFG.chars[String(ch.id)]) || {}; return o.freq || (o.noBubble ? 'never' : 'some'); };
    const WAVE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h.01"/><path class="w1" d="M9.5 8.5a5 5 0 0 1 0 7"/><path class="w2" d="M13 5.5a9.5 9.5 0 0 1 0 13"/></svg>';
    function decorate() {
        const area = document.getElementById('chatMessagesArea'); if (!area || typeof currentChatSessionId === 'undefined' || !currentChatSessionId) return;
        const H = (typeof globalChats !== 'undefined' && globalChats[currentChatSessionId]) || [];
        area.querySelectorAll('.chat-bubble:not(.gyvc)').forEach(b => {
            const m = /showChatContextMenu\(event,\s*(\d+)\)/.exec(b.getAttribute('oncontextmenu') || ''); if (!m) return;
            const i = +m[1], msg = H[i]; if (!isVoiceMsg(msg)) return;
            const me = msg.sender === 'me', s = secOf(msg), txt = clean(msg.text);
            b.classList.add('gyvc'); if (me) b.classList.add('gyvc-me'); b.style.minWidth = Math.min(230, 78 + s * 5) + 'px';
            b.innerHTML = `<div class="gyvc-bar" onclick="gyVoicePlayMsg(${i}, this)">${me ? `<span class="gyvc-len">${s}″</span>${WAVE}` : `${WAVE}<span class="gyvc-len">${s}″</span>`}${msg.voicePlayed || me ? '' : '<i class="gyvc-dot"></i>'}</div>
                <div class="gyvc-tx" style="display:none">${esc(txt)}</div><span class="gyvc-to" onclick="event.stopPropagation();gyVoiceToText(this)">转文字</span>`;
        });
    }
    window.gyVoiceDecorate = decorate;
    window.gyVoicePlayMsg = async function (i, el) {
        const H = (typeof globalChats !== 'undefined' && globalChats[currentChatSessionId]) || [], msg = H[i]; if (!msg) return;
        const bar = el && el.closest('.gyvc');
        if (bar) { const d = bar.querySelector('.gyvc-dot'); if (d) d.remove(); }
        if (!msg.voicePlayed) { msg.voicePlayed = true; try { if (typeof saveAllData === 'function') saveAllData(); } catch (e) {} }
        if (bar && bar.classList.contains('on')) { stop(); bar.classList.remove('on'); return 'stop'; }
        const done = () => { if (bar) bar.classList.remove('on'); };
        // 你自己发的：放你录的那段
        if (msg.sender === 'me') {
            const b = msg.uvoice ? await get(msg.uvoice, null) : null;
            if (!b) { if (bar) { const t = bar.querySelector('.gyvc-to'); if (t) window.gyVoiceToText(t); } return 'text'; }
            document.querySelectorAll('.gyvc.on').forEach(x => x.classList.remove('on')); if (bar) bar.classList.add('on');
            await playUrl(URL.createObjectURL(b), done); return 'mine';
        }
        const ch = charOf(msg.sender);
        // 没接语音模型的角色：语音条只能转文字
        if (!canSound(ch, msg.text)) { if (bar) { const t = bar.querySelector('.gyvc-to'); if (t && t.textContent === '转文字') window.gyVoiceToText(t); } return 'text'; }
        document.querySelectorAll('.gyvc.on').forEach(x => x.classList.remove('on')); if (bar) bar.classList.add('on');
        const r = await window.gyVoiceSpeak(msg.sender, msg.text, { onEnd: done });
        if (!r) done();
        return r;
    };
    window.gyVoiceToText = function (el) { const b = el.closest('.gyvc'), t = b && b.querySelector('.gyvc-tx'); if (!t) return; const on = t.style.display === 'none'; t.style.display = on ? '' : 'none'; el.textContent = on ? '收起' : '转文字'; };

    // 告诉模型：自主模式的 TA 自己决定发不发语音；谁都要知道 [语音] 开头的是语音条
    window.__gyVoiceCtxFor = function (charId) {
        const ch = charOf(charId); if (!ch || !CFG.bubbles) return '';
        let t = '【语音条】聊天记录里开头带 [语音] 的消息是语音条（后面的文字就是说出口的内容）。';
        if (isAuto(ch) && freqOf(ch) !== 'never') t += '你也可以发语音条：想用说的时候，在那一条消息最开头写 [语音]，后面只写你说出口的话（别写动作、表情和括号）。发文字还是发语音你自己看情况定——撒娇、哄人、刚睡醒、困了、激动、懒得打字、想让她听听你声音的时候更可能发语音；别每条都是。';
        const n = NUDGE[String(ch.id)]; if (n) t += `\n【这次主动找她的由头】${n}`;
        return t;
    };
    const NUDGE = {};

    // 默认模式的角色：按频率把 TA 刚发的一条短回复变成语音条
    const BOOT_T = Date.now(), seen = new WeakSet();
    function convert() {
        if (!CFG.bubbles || typeof globalChats === 'undefined') return;
        let changed = false;
        Object.keys(globalChats).forEach(sid => {
            if (String(sid).startsWith('g_')) return;
            const H = globalChats[sid]; if (!Array.isArray(H)) return;
            for (let i = Math.max(0, H.length - 4); i < H.length; i++) {
                const m = H[i]; if (!m || seen.has(m)) continue; seen.add(m);
                if (m.vChk || m.sender === 'me' || m.sender === 'system' || m.type || m.mediaUrl || (m.timestamp || 0) < BOOT_T - 5000) continue;
                const ch = charOf(m.sender); if (!ch || isAuto(ch) || isVoiceMsg(m)) continue;
                m.vChk = 1;
                const t = clean(m.text); if (t.length < 2 || t.length > 80 || /<|```|STATUS|status/.test(String(m.text))) continue;
                if (Math.random() * 100 < (FREQ[freqOf(ch)] || 0)) { m.text = '[语音]' + String(m.text).trim(); changed = true; }
            }
        });
        if (changed) { try { if (typeof saveAllData === 'function') saveAllData(); } catch (e) {} try { if (typeof renderChatMessages === 'function' && document.getElementById('chatMessagesArea')) renderChatMessages(); } catch (e) {} }
    }
    window.__gyVoiceConvert = convert;

    /* ---------------- 你也能发语音条 ---------------- */
    let REC = null;   // { mr, chunks, rec, text, t0, timer, stream }
    async function sttApi(blob) {
        const c = CFG.stt; if (!c.url) return null;
        let u = String(c.url).trim().replace(/\/+$/, ''); if (!/audio\/transcriptions/.test(u)) u += /\/v1$/.test(u) ? '/audio/transcriptions' : '/v1/audio/transcriptions';
        const fd = new FormData(); fd.append('file', blob, 'voice.webm'); fd.append('model', c.model || 'whisper-1'); fd.append('language', 'zh');
        const r = await fetch(u, { method: 'POST', headers: { Authorization: 'Bearer ' + (c.key || '') }, body: fd });
        if (!r.ok) await bad(r);
        const j = await r.json(); return String(j.text || '').trim();
    }
    window.gyVoiceSttApi = sttApi;
    window.gyVoiceRecStart = async function () {
        if (REC) return;
        const pn = document.getElementById('gyVoRec') || (() => { const d = document.createElement('div'); d.id = 'gyVoRec'; document.body.appendChild(d); return d; })();
        REC = { chunks: [], text: '', t0: Date.now() };
        try {
            REC.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            REC.mr = new MediaRecorder(REC.stream); REC.mr.ondataavailable = e => { if (e.data && e.data.size) REC.chunks.push(e.data); }; REC.mr.start();
        } catch (e) { REC.err = '没拿到麦克风（' + (e.message || e.name || e) + '）'; }
        // 边录边识别（浏览器支持的话）；接了转文字接口就以接口为准
        try {
            const Ctor = !CFG.stt.url && (window.SpeechRecognition || window.webkitSpeechRecognition);
            if (Ctor) { const r = new Ctor(); r.lang = 'zh-CN'; r.continuous = true; r.interimResults = true; r.onresult = ev => { let t = ''; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; REC && (REC.text = t); const el = document.getElementById('gyVoRecTx'); if (el) el.textContent = t || '说吧，我在听'; }; r.onerror = () => {}; r.start(); REC.rec = r; }
        } catch (e) {}
        pn.innerHTML = `<div class="gyvr-box"><div class="gyvr-t"><i class="gyvr-dot"></i><b id="gyVoRecT">0″</b></div><div id="gyVoRecTx" class="gyvr-tx">${REC.err ? esc(REC.err) : '说吧，我在听'}</div>
            <div class="gyvr-bt"><button onclick="gyVoiceRecStop(false)">取消</button><button class="pri" onclick="gyVoiceRecStop(true)">发送</button></div></div>`;
        pn.style.display = 'flex';
        REC.timer = setInterval(() => { const el = document.getElementById('gyVoRecT'); if (el && REC) el.textContent = Math.round((Date.now() - REC.t0) / 1000) + '″'; if (REC && Date.now() - REC.t0 > 60000) window.gyVoiceRecStop(true); }, 250);
    };
    window.gyVoiceRecStop = async function (send) {
        const R = REC; if (!R) return; REC = null; clearInterval(R.timer);
        const pn = document.getElementById('gyVoRec');
        try { if (R.rec) R.rec.stop(); } catch (e) {}
        const blob = await new Promise(res => { if (!R.mr || R.mr.state === 'inactive') return res(R.chunks.length ? new Blob(R.chunks, { type: R.chunks[0].type || 'audio/webm' }) : null); R.mr.onstop = () => res(R.chunks.length ? new Blob(R.chunks, { type: R.chunks[0].type || 'audio/webm' }) : null); try { R.mr.stop(); } catch (e) { res(null); } });
        try { if (R.stream) R.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
        if (!send) { if (pn) pn.style.display = 'none'; return null; }
        if (pn) { const tx = document.getElementById('gyVoRecTx'); if (tx) tx.textContent = '转文字中……'; }
        await new Promise(r => setTimeout(r, 350));   // 等识别把最后一句吐出来
        let text = R.text || '';
        if (CFG.stt.url && blob) { try { text = (await sttApi(blob)) || text; } catch (e) { toast('🎙️ 转文字接口没通', String(e.message || e)); } }
        if (!text) { const ask = (m, d) => typeof appPrompt === 'function' ? appPrompt(m, d) : Promise.resolve(prompt(m, d)); text = await ask('没听清……你刚才说的是？（打出来，TA 那边按语音条收）', ''); }
        if (pn) pn.style.display = 'none';
        if (!text || !String(text).trim()) return null;
        return window.gyVoiceSendMine(String(text).trim(), blob, Math.max(1, Math.round((Date.now() - R.t0) / 1000)));
    };
    // 把一条语音条发出去（你的）
    window.gyVoiceSendMine = async function (text, blob, sec) {
        const inp = document.getElementById('chatInput'); if (!inp || typeof sendChatMessage !== 'function') return null;
        const keep = inp.value; const body = '[语音]' + text;
        inp.value = body;
        try { await sendChatMessage(); } catch (e) {}
        const H = (typeof globalChats !== 'undefined' && globalChats[currentChatSessionId]) || [];
        const m = [...H].reverse().find(x => x.sender === 'me' && String(x.text) === body);
        if (m) { m.voiceSec = Math.min(60, sec || Math.max(1, Math.round(text.length / 4))); if (blob) { m.uvoice = 'uv:' + (m.timestamp || Date.now()) + Math.random().toString(36).slice(2, 6); await put(m.uvoice, blob); } try { saveAllData(); } catch (e) {} try { renderChatMessages(); } catch (e) {} }
        if (keep && !inp.value) inp.value = keep;
        return m || null;
    };

    /* ---------------- 接到别的地方 ---------------- */
    function hooks() {
        try { if (typeof GY_BOX_CTX !== 'undefined' && Array.isArray(GY_BOX_CTX) && !GY_BOX_CTX.some(x => x[0] === '__gyVoiceCtxFor')) GY_BOX_CTX.push(['__gyVoiceCtxFor', '语音条']); } catch (e) {}
        // 聊天渲染完：把 [语音] 那几条画成语音条
        const r = window.renderChatMessages;
        if (typeof r === 'function' && !r.__gyVo) { const w = function () { const x = r.apply(this, arguments); try { decorate(); } catch (e) {} return x; }; w.__gyVo = true; window.renderChatMessages = w; try { renderChatMessages = w; } catch (e) {} }
        // 长按「朗读」：TA 说的话用 TA 的声音
        const s = window.contextActionSpeakChat;
        if (typeof s === 'function' && !s.__gyVo) {
            const w = function () {
                try {
                    const idx = typeof chatContextMenuMsgIdx !== 'undefined' ? chatContextMenuMsgIdx : null;
                    const msg = idx != null && typeof globalChats !== 'undefined' ? (globalChats[currentChatSessionId] || [])[idx] : null;
                    if (msg && msg.sender !== 'me' && charOf(msg.sender)) { const m = document.getElementById('chatContextMenu'); if (m) m.style.display = 'none'; window.gyVoiceSpeak(msg.sender, msg.text); return; }
                } catch (e) {}
                return s.apply(this, arguments);
            };
            w.__gyVo = true; window.contextActionSpeakChat = w;
        }
        // 自主模式：给对方发条语音
        try {
            if (typeof GY_AUTONOMY_ACTIONS !== 'undefined' && Array.isArray(GY_AUTONOMY_ACTIONS) && !GY_AUTONOMY_ACTIONS.some(a => a.key === 'voice_msg')) GY_AUTONOMY_ACTIONS.push({
                key: 'voice_msg', label: '给对方发一条语音', hint: '想让她听听你的声音',
                need: c => CFG.bubbles && freqOf(c) !== 'never' && typeof sendProactiveChatMessage === 'function',
                run: async c => { NUDGE[String(c.id)] = '想让她听听你的声音——这次用 [语音] 发，一两条就好'; try { await sendProactiveChatMessage(c); return '给你发了条语音'; } catch (e) { return null; } finally { delete NUDGE[String(c.id)]; } }
            });
        } catch (e) {}
        try { if (typeof registerMiniFeature === 'function' && !(typeof GY_MINI_FEATURES !== 'undefined' && GY_MINI_FEATURES.some(f => f.id === 'voice'))) registerMiniFeature({ id: 'voice', icon: '🎙️', title: 'TA 的声音', desc: '接语音模型（MiniMax / 豆包 / SoVITS / OpenAI 格式…），每个角色自己的声音；语音条、打电话、朗读都用它', onOpen: () => window.gyVoiceOpen() }); } catch (e) {}
        // 聊天栏：🎙️ 发语音条
        const row = document.getElementById('chatToolIconsRow');
        if (row && !document.getElementById('gyVoRecBtn')) { const b = document.createElement('button'); b.className = 'btn-edit-small'; b.id = 'gyVoRecBtn'; b.title = '发语音条'; b.textContent = '🎙️'; b.onclick = () => window.gyVoiceRecStart(); row.appendChild(b); }
        // 打电话设置里放个入口
        const box = document.getElementById('gyCallApiBox');
        if (box && !document.getElementById('gyVoCallLink')) { const a = document.createElement('div'); a.id = 'gyVoCallLink'; a.className = 'gyvo-link'; a.innerHTML = '🎙️ 每个角色用自己的声音、接更多家语音模型 → <b onclick="gyVoiceOpen()">TA 的声音</b>'; box.parentNode.insertBefore(a, box); }
    }

    /* ---------------- 设置面板 ---------------- */
    let WHO = '';
    const fieldHtml = (c, keys, path) => (PROV[c.prov] || PROV.browser).f.filter(f => !keys || keys.includes(f[0])).map(([k, label, type, d]) => {
        const v = c[k] == null ? d : c[k];
        if (type === 'bsel') {
            let vs = []; try { vs = speechSynthesis.getVoices().filter(x => /zh|Chinese|cmn|yue/i.test(x.lang + x.name)); } catch (e) {}
            return `<label class="gyvo-f"><span>${esc(label)}</span><select onchange="gyVoiceSetF('${path}','${k}',this.value)"><option value="">自动（第一个中文声音）</option>${vs.map(x => `<option${x.name === v ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`;
        }
        return `<label class="gyvo-f"><span>${esc(label)}</span><input type="${type === 'pw' ? 'password' : type === 'num' ? 'number' : 'text'}"${type === 'num' ? ' step="0.05" min="0.3" max="3"' : ''} value="${esc(v)}" placeholder="${esc(d)}" onchange="gyVoiceSetF('${path}','${k}',this.value)"></label>`;
    }).join('');
    const provSel = (p, path) => `<select class="gyvo-p" onchange="gyVoiceSetProv('${path}',this.value)">${Object.entries(PROV).map(([k, v]) => `<option value="${k}"${k === p ? ' selected' : ''}>${esc(v.n)}</option>`).join('')}</select>`;
    function paint() {
        const box = document.getElementById('gyVoBody'); if (!box) return;
        const cs = chars(); if (!WHO || !cs.some(c => String(c.id) === WHO)) WHO = String((cs[0] || {}).id || '');
        const ch = charOf(WHO), o = (ch && CFG.chars[WHO]) || {}, mode = o.mode || 'def';
        const eff = ch ? cfgFor(ch) : CFG.def;
        let per = '';
        if (ch) {
            per = `<div class="gyvo-modes">${[['def', '跟默认一样'], ['voice', '默认接口，换个音色'], ['own', '自己一整套']].map(([k, n]) => `<span class="${mode === k ? 'on' : ''}" onclick="gyVoiceMode('${k}')">${n}</span>`).join('')}</div>`;
            if (mode === 'voice') per += `<div class="gyvo-tip">用默认的「${esc(PROV[CFG.def.prov].n)}」，下面填了的就换成 TA 自己的：</div>` + fieldHtml(Object.assign({}, CFG.def, o, { prov: CFG.def.prov }), VOICE_KEYS, 'char');
            if (mode === 'own') { const own = Object.assign(defsOf((o.own && o.own.prov) || 'openai'), o.own || {}); per += provSel(own.prov, 'own') + fieldHtml(own, null, 'own'); }
            per += `<div class="gyvo-tip">🎤 发语音条：${isAuto(ch) ? 'TA 是自主模式，发文字还是语音 TA 自己定（选「从不」就不发）' : 'TA 是默认模式，按这个频率把短一点的回复发成语音条'}</div><div class="gyvo-modes">${FREQ_N.map(([k, n]) => `<span class="${freqOf(ch) === k ? 'on' : ''}" onclick="gyVoiceSetF('char','freq','${k}');gyVoiceWho('${esc(ch.id)}')">${n}${k === 'some' ? ' 10%' : k === 'often' ? ' 30%' : ''}</span>`).join('')}</div>`;
            if (!canSound(ch, '')) per += `<div class="gyvo-tip">TA 现在没接语音模型：语音条点开只能转文字。</div>`;
        }
        box.innerHTML = `
            <div class="gyvo-sec"><div class="gyvo-h">默认声音 <em>所有角色都先用这个</em></div>${provSel(CFG.def.prov, 'def')}${fieldHtml(CFG.def, null, 'def')}
                <div class="gyvo-tip">网页版连不上多半是浏览器跨域拦了（豆包 / 火山最常见），桌面版 exe 没这个问题；GPT-SoVITS 要先在电脑上开着 api_v2。</div></div>
            <div class="gyvo-sec"><div class="gyvo-h">每个角色自己的声音</div>
                <select class="gyvo-p" onchange="gyVoiceWho(this.value)">${cs.map(c => `<option value="${esc(c.id)}"${String(c.id) === WHO ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>${per}
                <div class="gyvo-try"><input id="gyVoTry" value="${esc(ch ? '是我，' + (ch.name || '') + '。今天有没有想我？' : '你好呀')}"><button onclick="gyVoiceTry()">试听</button></div>
                <div class="gyvo-tip">现在用的：${esc(PROV[eff.prov].n)}${eff.voice ? ' · ' + esc(eff.voice) : ''}</div></div>
            <div class="gyvo-sec"><div class="gyvo-h">🎤 语音条</div>
                <label class="gyvo-ck"><input type="checkbox"${CFG.bubbles ? ' checked' : ''} onchange="gyVoiceSetF('root','bubbles',this.checked)"> 允许 TA 在聊天里发语音条（点一下用 TA 的声音念，也能转文字）</label>
                <div class="gyvo-tip">接了语音模型的角色：语音条点一下用 TA 的声音念；没接的：只能转文字。长按 TA 的消息 →「朗读」、打电话时 TA 说话，也用这里的声音。念过的句子会存起来，再放不花钱。</div></div>
            <div class="gyvo-sec"><div class="gyvo-h">🗣️ 你发语音条 <em>聊天栏的 🎙️</em></div>
                <div class="gyvo-tip">录下来的声音会留着（点你的语音条能放）。转文字默认用浏览器自带的识别；桌面版 / 部分手机上浏览器识别用不了的话，填一个 Whisper 格式（/v1/audio/transcriptions）的接口，硅基流动、OpenAI 都行。都没有就让你打一下刚才说了什么。</div>
                <label class="gyvo-f"><span>转文字接口地址（可空）</span><input value="${esc(CFG.stt.url)}" placeholder="https://api.siliconflow.cn/v1/audio/transcriptions" onchange="gyVoiceSetF('stt','url',this.value)"></label>
                <label class="gyvo-f"><span>Key</span><input type="password" value="${esc(CFG.stt.key)}" onchange="gyVoiceSetF('stt','key',this.value)"></label>
                <label class="gyvo-f"><span>模型</span><input value="${esc(CFG.stt.model)}" placeholder="whisper-1 / FunAudioLLM/SenseVoiceSmall" onchange="gyVoiceSetF('stt','model',this.value)"></label></div>
            <div class="gyvo-sec"><div class="gyvo-h">🎙️ 语音库 <em>TA 本人的录音</em></div>
                <div class="gyvo-tip">上传 TA 的录音（笑声、晚安、叫你名字……）。TA 说的话里带着关键词就直接放这段，不走模型。关键词默认就是文件名。</div>
                <div class="gyvo-row"><select id="gyVoClipWho"><option value="">谁都能用</option>${cs.map(c => `<option${ch && c.id === ch.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
                <label class="gyvo-btn">上传录音<input type="file" multiple accept="audio/*" style="display:none" onchange="gyVoiceUpload(this)"></label></div>
                <div id="gyVoClips"></div></div>`;
        paintClips();
    }
    async function paintClips() {
        const box = document.getElementById('gyVoClips'); if (!box) return;
        const L = await vList();
        box.innerHTML = L.length ? L.map(v => `<div class="gyvo-clip"><b>🎙️ ${esc(v.name)}</b><span>${esc(v.chars.join('、') || '谁都能用')} · 🔑 ${esc((v.keys.length ? v.keys : [v.name]).join(' '))}</span>
            <i onclick="gyVoiceClipPlay('${v.id}')">试听</i><i onclick="gyVoiceClipEdit('${v.id}')">改</i><i class="del" onclick="gyVoiceClipDel('${v.id}')">删</i></div>`).join('') : '<div class="gyvo-tip">还没有</div>';
    }
    window.gyVoiceOpen = async function (who) {
        await ready; await vList();
        if (who != null) WHO = String(who); else if (!WHO && typeof currentChatSessionId !== 'undefined' && currentChatSessionId && !String(currentChatSessionId).startsWith('g_')) WHO = String(currentChatSessionId);
        let ov = document.getElementById('gyVoOv'); if (ov) ov.remove();
        ov = document.createElement('div'); ov.id = 'gyVoOv'; ov.className = 'modal-overlay';
        ov.innerHTML = `<div class="gyvo-box"><div class="gyvo-hd"><b>🎙️ TA 的声音</b><span onclick="document.getElementById('gyVoOv').remove()">✕</span></div><div id="gyVoBody"></div></div>`;
        ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
        document.body.appendChild(ov); ov.style.display = 'flex';
        paint();
        try { if (window.speechSynthesis && !speechSynthesis.getVoices().length) speechSynthesis.onvoiceschanged = () => { if (document.getElementById('gyVoOv')) paint(); }; } catch (e) {}
    };
    window.gyVoiceWho = v => { WHO = String(v); paint(); };
    const slot = () => (CFG.chars[WHO] = CFG.chars[WHO] || {});
    window.gyVoiceMode = async m => { slot().mode = m; if (m === 'own' && !slot().own) slot().own = defsOf('openai'); await saveCfg(); paint(); };
    window.gyVoiceSetProv = async function (path, p) {
        if (path === 'def') CFG.def = Object.assign(defsOf(p), p === CFG.def.prov ? CFG.def : {}, { prov: p });
        else if (path === 'own') slot().own = defsOf(p);
        await saveCfg(); paint();
    };
    window.gyVoiceSetF = async function (path, k, v) {
        if (typeof v === 'string' && /^(rate|pitch)$/.test(k)) v = v === '' ? '' : (+v || 1);
        if (path === 'def') CFG.def[k] = v;
        else if (path === 'own') { const o = slot(); o.own = o.own || defsOf('openai'); o.own[k] = v; }
        else if (path === 'char') slot()[k] = v;
        else if (path === 'root') CFG[k] = v;
        else if (path === 'stt') CFG.stt[k] = v;
        await saveCfg();
        if (k === 'noBubble' || k === 'bubbles' || k === 'freq' || path === 'stt') return;
        const tip = document.querySelector('#gyVoBody .gyvo-sec:nth-child(2) .gyvo-tip:last-child'); if (tip) { const e = cfgFor(charOf(WHO)); tip.textContent = '现在用的：' + PROV[e.prov].n + (e.voice ? ' · ' + e.voice : ''); }
    };
    window.gyVoiceTry = async function () {
        const t = (document.getElementById('gyVoTry') || {}).value || '你好';
        const r = await window.gyVoiceSpeak(WHO, t);
        toast('🎙️ 试听', r === 'model' ? '用的是语音模型' : r === 'clip' ? '放的是语音库里的录音' : r === 'browser' ? '用的是浏览器自带的声音' : '没放出来');
        return r;
    };
    window.gyVoiceUpload = async function (inp) {
        const files = [...(inp.files || [])]; inp.value = ''; if (!files.length) return;
        const who = (document.getElementById('gyVoClipWho') || {}).value || '';
        const L = await vList();
        for (const f of files) {
            const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            await put('clip:' + id, f);
            L.push({ id, name: String(f.name || '录音').replace(/\.[^.]+$/, ''), chars: who ? [who] : [], keys: [] });
        }
        await put('clips', L); paintClips(); toast(`🎙️ 加了 ${files.length} 段录音`);
    };
    window.gyVoiceClipPlay = async id => { const u = await vUrl(id); if (u) playUrl(u); };
    window.gyVoiceClipDel = async id => { VL = (await vList()).filter(v => v.id !== id); try { await LF.removeItem('clip:' + id); } catch (e) {} await put('clips', VL); paintClips(); };
    window.gyVoiceClipEdit = async function (id) {
        const v = (await vList()).find(x => x.id === id); if (!v) return;
        const ask = (m, d) => typeof appPrompt === 'function' ? appPrompt(m, d) : Promise.resolve(prompt(m, d));
        const c = await ask('这段是谁的声音（角色名，多个用空格隔开；空着＝谁都能用）', v.chars.join(' ')); if (c == null) return;
        const k = await ask('关键词（TA 说的话里带着其中一个就放这段；空着＝用文件名）', v.keys.join(' ')); if (k == null) return;
        v.chars = String(c).split(/\s+/).filter(Boolean); v.keys = String(k).split(/[\s,，]+/).filter(Boolean);
        await put('clips', VL); paintClips();
    };

    const CSS = `
#gyVoOv{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:14px}
.gyvo-box{background:#fff;color:#222;border-radius:20px;width:min(560px,100%);max-height:92vh;overflow:auto;padding:16px 18px;box-sizing:border-box}
.gyvo-hd{display:flex;justify-content:space-between;font-size:18px;margin-bottom:6px}.gyvo-hd span{cursor:pointer;color:#999}
.gyvo-sec{border-top:1px solid #f0f0f0;padding:10px 0}.gyvo-sec:first-child{border-top:none}.gyvo-h{font-weight:600;margin-bottom:6px}.gyvo-h em{font-style:normal;font-weight:normal;font-size:12px;color:#999;margin-left:6px}
.gyvo-p,.gyvo-f input,.gyvo-f select,.gyvo-row select,.gyvo-try input{width:100%;box-sizing:border-box;padding:7px 10px;border-radius:10px;border:1px solid #e3e3e6;background:#fafafa;font-family:inherit;font-size:13.5px}
.gyvo-f{display:block;margin:6px 0}.gyvo-f span{display:block;font-size:12px;color:#888;margin-bottom:3px}
.gyvo-tip{font-size:12px;color:#999;line-height:1.7;margin:6px 0}.gyvo-ck{display:block;font-size:13.5px;margin:8px 0;cursor:pointer}
.gyvo-modes{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.gyvo-modes span{padding:5px 11px;border-radius:999px;background:#f2f2f4;font-size:12.5px;cursor:pointer}.gyvo-modes span.on{background:#111;color:#fff}
.gyvo-try{display:flex;gap:8px;margin-top:8px}.gyvo-try button,.gyvo-btn{padding:7px 14px;border-radius:10px;border:none;background:#111;color:#fff;cursor:pointer;font-family:inherit;font-size:13px;white-space:nowrap}
.gyvo-row{display:flex;gap:8px;align-items:center}.gyvo-clip{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;padding:6px 0;border-bottom:1px solid #f4f4f4}.gyvo-clip span{color:#999;font-size:12px;flex:1}.gyvo-clip i{font-style:normal;color:#1d9bf0;cursor:pointer}.gyvo-clip i.del{color:#e0245e}
.gyvo-link{font-size:12.5px;color:#888;margin:6px 0}.gyvo-link b{color:#1d9bf0;cursor:pointer}
.chat-bubble.gyvc{cursor:pointer;user-select:none;padding-bottom:6px}
.gyvc-bar{display:flex;align-items:center;gap:8px;position:relative;min-height:22px}.gyvc-len{font-size:13.5px;opacity:.8;margin-left:auto}
.gyvc-dot{position:absolute;right:-18px;top:50%;width:8px;height:8px;border-radius:50%;background:#f5222d;transform:translateY(-50%)}
.gyvc.on .w1{animation:gyvcW 1s infinite}.gyvc.on .w2{animation:gyvcW 1s .3s infinite}@keyframes gyvcW{0%,100%{opacity:1}50%{opacity:.15}}
.gyvc-tx{font-size:13.5px;margin-top:6px;padding-top:6px;border-top:1px solid rgba(0,0,0,.08);line-height:1.6}
.gyvc-to{display:inline-block;font-size:11px;opacity:.55;margin-top:4px;cursor:pointer}
.gyvc-me .gyvc-bar{justify-content:flex-end}.gyvc-me .gyvc-len{margin-left:0;margin-right:auto}.gyvc-me svg{transform:scaleX(-1)}
#gyVoRec{position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.25);display:none;align-items:flex-end;justify-content:center;padding:0 14px 110px}
.gyvr-box{background:rgba(30,30,32,.94);color:#fff;border-radius:22px;padding:16px 18px;width:min(360px,100%);text-align:center}
.gyvr-t{display:flex;align-items:center;justify-content:center;gap:8px;font-size:22px}.gyvr-dot{width:10px;height:10px;border-radius:50%;background:#ff4d4f;animation:gyvcW 1s infinite}
.gyvr-tx{min-height:42px;font-size:14px;opacity:.85;margin:10px 0;line-height:1.6}.gyvr-bt{display:flex;gap:10px}.gyvr-bt button{flex:1;padding:10px;border-radius:14px;border:none;background:#3a3a3c;color:#fff;font-size:15px;font-family:inherit;cursor:pointer}.gyvr-bt button.pri{background:#07c160}
`;
    function boot() {
        if (!document.getElementById('gyVoCss')) { const st = document.createElement('style'); st.id = 'gyVoCss'; st.textContent = CSS; document.head.appendChild(st); }
        hooks(); ready.then(() => vList()).then(hooks);
        setInterval(hooks, 2500);
        setInterval(() => { try { convert(); } catch (e) {} }, 1200);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
