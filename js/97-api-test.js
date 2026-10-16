/* ============================================================
   js/97 —— 🔌 测试连接：每个填了地址 / Key 的接口旁边都有一颗「🔌 测试连接」
   ------------------------------------------------------------
   填完不知道能不能用？点一下，真的去调一次：
     · 主 API / 副 API：用你框里现在填的地址、Key、模型，真的发一句话，看模型回不回
     · 向量：真的算一次向量
     · TA 的声音（默认 / 每个角色）：真的念一句，念出来给你听
     · 你发语音转文字：发一段一秒钟的静音过去，看接口认不认
     · 角色发图片（画图接口）：真的画一张小图
     · 打电话里「自己的接口」：真的念一句
     · 云端 Worker：拿共享密钥去敲一下门
   结果：弹一个窗（能用 / 不能用 + 大白话原因 + 怎么办），通知页也记一条（点了回到那个设置）。
   💰 测聊天 / 向量 / 语音 / 画图都会真的花一点点（一句话的量；画图是一张图的钱）；
      聊天和向量的用量记在「📊 Token 用量 → 接口测试」。
   ============================================================ */
(function () {
    'use strict';
    if (window.__gyApiTest) return;
    window.__gyApiTest = true;

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const val = id => { const el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; };
    const noSlash = u => String(u || '').trim().replace(/\/+$/, '');
    const host = u => { try { return new URL(u).host; } catch (e) { return String(u || '').slice(0, 40); } };
    const sec = ms => ms >= 1000 ? (ms / 1000).toFixed(1) + ' 秒' : ms + ' 毫秒';
    const NAMES = { main: '主 API', sub: '副 API', vec: '向量记忆 API', tts: 'TA 的声音', stt: '语音转文字', img: '画图接口', call: '打电话的朗读接口', cloud: '云端 Worker' };

    /* ---------- 弹窗 ---------- */
    function css() {
        if (document.getElementById('gyApiTestCss')) return;
        const st = document.createElement('style'); st.id = 'gyApiTestCss';
        st.textContent = `
.gy-apitest-btn{display:inline-block;margin:8px 0 4px;padding:7px 14px;border:1px solid #1d9bf0;color:#1d9bf0;background:transparent;border-radius:999px;font:inherit;font-size:13px;cursor:pointer}
.gy-apitest-btn:disabled,.gy-apitest-main:disabled{opacity:.6;cursor:wait}
#gyApiTestOv{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}
#gyApiTestOv .box{background:#fff;color:#0f1419;border-radius:16px;width:440px;max-width:100%;max-height:88vh;overflow:auto;padding:20px 20px 16px;box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:inherit}
body.dark-theme #gyApiTestOv .box{background:#16181c;color:#e7e9ea}
#gyApiTestOv .big{font-size:20px;font-weight:700;margin-bottom:4px}
#gyApiTestOv .big.ok{color:#00ba7c}#gyApiTestOv .big.no{color:#f4212e}
#gyApiTestOv .sub{font-size:13px;color:#8b98a5;margin-bottom:12px}
#gyApiTestOv .row{display:flex;gap:10px;font-size:13px;padding:5px 0;border-bottom:1px dashed rgba(128,128,128,.2)}
#gyApiTestOv .row i{font-style:normal;color:#8b98a5;flex:0 0 72px}
#gyApiTestOv .row b{font-weight:400;flex:1 1 auto;min-width:0;word-break:break-all}
#gyApiTestOv .reply{margin:12px 0 4px;padding:10px 12px;border-radius:10px;background:rgba(0,186,124,.08);font-size:13.5px;line-height:1.6;white-space:pre-wrap;word-break:break-all}
#gyApiTestOv .why{margin:12px 0 4px;padding:10px 12px;border-radius:10px;background:rgba(244,33,46,.07);font-size:13.5px;line-height:1.7}
#gyApiTestOv .why ol{margin:6px 0 0;padding-left:20px}
#gyApiTestOv .raw{font-size:11.5px;color:#8b98a5;margin-top:6px;word-break:break-all}
#gyApiTestOv img{max-width:100%;border-radius:10px;margin-top:10px}
#gyApiTestOv .btns{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
#gyApiTestOv .btns button{border:1px solid #1d9bf0;background:#1d9bf0;color:#fff;border-radius:999px;padding:7px 18px;font:inherit;font-size:13.5px;cursor:pointer}
#gyApiTestOv .btns button.ghost{background:transparent;color:#1d9bf0}`;
        document.head.appendChild(st);
    }
    function explain(msg) {
        try {
            const id = typeof window.gyErrClassify === 'function' ? window.gyErrClassify(msg) : null;
            const e = id && typeof window.gyErrDict === 'function' ? window.gyErrDict().find(x => x.id === id) : null;
            if (e) return e;
        } catch (e) {}
        return null;
    }
    function show(kind, r) {
        css();
        const old = document.getElementById('gyApiTestOv'); if (old) old.remove();
        const ov = document.createElement('div'); ov.id = 'gyApiTestOv'; ov.setAttribute('data-gy-overlay', '1');
        const e = r.ok ? null : (r.explain || explain(r.err));
        ov.innerHTML = `<div class="box">
            <div class="big ${r.ok ? 'ok' : 'no'}">${r.ok ? '✅ ' + esc(NAMES[kind]) + ' 能用' : '❌ ' + esc(NAMES[kind]) + ' 现在用不了'}</div>
            <div class="sub">${esc(r.what || '')}</div>
            ${(r.rows || []).filter(x => x && x[1] !== '' && x[1] != null).map(([k, v]) => `<div class="row"><i>${esc(k)}</i><b>${esc(v)}</b></div>`).join('')}
            ${r.ok && r.reply ? `<div class="reply">${esc(r.reply)}</div>` : ''}
            ${r.ok && r.img ? `<img src="${esc(r.img)}" alt="测试画的图">` : ''}
            ${!r.ok ? `<div class="why">${e ? `<b>${esc(e.n)}</b><br>${esc(e.what)}<ol>${e.how.map(h => `<li>${esc(h)}</li>`).join('')}</ol>` : esc(r.hint || '没认出是哪种错。先检查地址、Key、模型名有没有填错、有没有多余空格，再试一次。')}</div>
                       ${r.err ? `<div class="raw">原始报错：${esc(String(r.err).slice(0, 300))}</div>` : ''}` : ''}
            <div class="btns">
              ${!r.ok && r.err ? '<button class="ghost" data-copy="1">📋 复制报错</button>' : ''}
              ${r.audio ? '<button class="ghost" data-play="1">🔊 再听一遍</button>' : ''}
              <button data-close="1">好</button>
            </div></div>`;
        ov.addEventListener('click', ev => {
            const t = ev.target;
            if (t === ov || (t.dataset && t.dataset.close)) ov.remove();
            else if (t.dataset && t.dataset.copy) { try { navigator.clipboard.writeText(String(r.err)); t.textContent = '已复制'; } catch (e) {} }
            else if (t.dataset && t.dataset.play && r.audio) { try { r.audio.currentTime = 0; r.audio.play(); } catch (e) {} }
        });
        document.body.appendChild(ov);
    }
    function notify(kind, r) {
        try {
            if (typeof addNotification !== 'function') return;
            const title = r.ok ? `✅ 测试连接：${NAMES[kind]}能用` : `❌ 测试连接：${NAMES[kind]}用不了`;
            const e = r.ok ? null : (r.explain || explain(r.err));
            const desc = r.ok ? [r.what, r.ms ? '用时 ' + sec(r.ms) : ''].filter(Boolean).join(' · ') : (e ? e.n : String(r.err || r.hint || '').slice(0, 80));
            addNotification(title, null, null, null, desc, { jump: { fn: 'gyApiTestGo', args: [kind] } });
        } catch (e) {}
    }
    // 通知点回来：回到那个接口的设置
    window.gyApiTestGo = function (kind) {
        try {
            if (kind === 'main' || kind === 'sub') { switchMainView('settings'); setTimeout(() => openSettingsPanel('api'), 40); return; }
            if (kind === 'vec') { switchMainView('memoryHub'); return; }
            if (kind === 'tts' || kind === 'stt') { if (window.gyVoiceOpen) window.gyVoiceOpen(); return; }
            if (kind === 'img') { if (window.gyPhotoOpen) window.gyPhotoOpen(); return; }
            if (kind === 'call') { switchMainView('settings'); setTimeout(() => openSettingsPanel('interaction'), 40); return; }
            if (kind === 'cloud') { switchMainView('settings'); setTimeout(() => openSettingsPanel('notify'), 40); return; }
        } catch (e) {}
    };

    /* ---------- 各种接口怎么测 ---------- */
    // 聊天：跟平时聊天走同一条路（sendChatRequestRaw），所以「测得通」就是「真的能用」
    async function gyApiTestChat(kind) {
        const isSub = kind === 'sub';
        const url = noSlash(val(isSub ? 'subApiUrlInput' : 'apiUrlInput')), key = val(isSub ? 'subApiKeyInput' : 'apiKeyInput'), model = val(isSub ? 'subModelSelect' : 'modelSelect');
        const rows = [['地址', url], ['模型', model]];
        if (!url || !key || !model) return { ok: false, rows, what: '地址、Key、模型要三样都填上', hint: isSub ? '副 API 三样没填全的时候，副 API 的活全部走主 API（不会坏，只是没省钱）。填全了再测。' : '先把地址和 Key 填上，点「拉取模型」选一个模型，再测。' };
        const t0 = Date.now();
        const d = await sendChatRequestRaw({ url, key, model, isSub }, [{ role: 'user', content: '这是一次连接测试。请只回复两个字：收到' }], { max_tokens: 64 });
        const ms = Date.now() - t0;
        rows.push(['用时', sec(ms)]);
        if (!d || d.error) return { ok: false, rows, ms, err: (d && d.error && (d.error.message || JSON.stringify(d.error))) || '没有回应' };
        const m = d.choices && d.choices[0] && d.choices[0].message;
        if (!m) return { ok: false, rows, ms, err: '接口回了东西，但不是聊天的格式：' + JSON.stringify(d).slice(0, 200) };
        const raw = String(m.content || '');
        const think = /<think>/.test(raw);
        const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        const u = d.usage || {};
        if (u.prompt_tokens != null || u.input_tokens != null) rows.push(['用量', `输入 ${u.prompt_tokens != null ? u.prompt_tokens : u.input_tokens} · 输出 ${u.completion_tokens != null ? u.completion_tokens : u.output_tokens}`]);
        if (think) rows.push(['思考', '这个模型会先「思考」再回答（会慢一点、多花一点）']);
        return { ok: true, rows, ms, what: `${host(url)} 上的 ${model} 回话了`, reply: '模型说：' + (text || '（这次只写了思考过程，正文是空的——能连上，但回复长度调大一点更稳）') };
    }
    async function gyApiTestVec() {
        if (typeof saveVectorApiSettings === 'function') { try { saveVectorApiSettings(); } catch (e) {} }
        const own = !!(val('vecApiUrlInput') && val('vecApiKeyInput'));
        const url = own ? noSlash(val('vecApiUrlInput')) : noSlash(val('apiUrlInput') || (typeof myApiUrl !== 'undefined' ? myApiUrl : ''));
        const model = val('embeddingModelSelect') || (typeof embeddingModel !== 'undefined' ? embeddingModel : '');
        const rows = [['用的', own ? '向量记忆专用 API' : '没填专用的，用的是主 API'], ['地址', url], ['模型', model]];
        if (typeof getEmbedding !== 'function') return { ok: false, rows, hint: '向量记忆的代码没加载上，刷新一下再试。' };
        const t0 = Date.now();
        const v = await getEmbedding('这是一次连接测试，看看能不能把这句话变成向量。');
        const ms = Date.now() - t0; rows.push(['用时', sec(ms)]);
        if (!v) {
            const err = window.gyVecLastErr || '没算出来';
            return { ok: false, rows, ms, err, hint: own ? '' : '没填专用 API 时用的是主 API 的地址——DeepSeek 这类不卖向量模型，要另外填一个（指南「🔧 接口配置教程 → ③ 记忆」）。' };
        }
        rows.push(['向量长度', v.length + ' 维']);
        return { ok: true, rows, ms, what: `${model} 算出了一串 ${v.length} 维的向量，向量记忆可以用了` };
    }
    function playBlob(blob) { const a = new Audio(URL.createObjectURL(blob)); a.play().catch(() => {}); return a; }
    async function gyApiTestTts(path) {
        if (typeof window.gyVoiceTestRaw !== 'function') return { ok: false, hint: '「TA 的声音」没加载上，刷新一下再试。' };
        const t0 = Date.now();
        let r;
        try { r = await window.gyVoiceTestRaw(path, '你好，我是来测试声音的。'); }
        catch (e) { return { ok: false, ms: Date.now() - t0, err: String(e && e.message || e), what: path === 'def' ? '默认声音' : '这个角色的声音' }; }
        const ms = Date.now() - t0, c = r.c || {};
        const rows = [['服务', r.name], ['地址', c.url ? host(c.url) : ''], ['模型', c.model || ''], ['音色', c.voice || c.bvoice || ''], ['用时', r.blob ? sec(ms) : '']];
        if (!r.blob) {
            if (!('speechSynthesis' in window)) return { ok: false, rows, hint: '这个浏览器 / App 没有自带朗读。换一个语音服务，或者换个浏览器。' };
            try { const u = new SpeechSynthesisUtterance('你好，我是来测试声音的。'); u.lang = 'zh-CN'; speechSynthesis.speak(u); } catch (e) {}
            const n = (speechSynthesis.getVoices() || []).filter(v => /zh|cmn|Chinese/i.test(v.lang + v.name)).length;
            rows.push(['中文声音', n ? n + ' 个' : '没找到（可能念得怪）']);
            return { ok: true, rows, what: '浏览器自带朗读，不用联网、不花钱，应该已经念给你听了' };
        }
        rows.push(['大小', Math.round(r.blob.size / 1024) + ' KB']);
        return { ok: true, rows, ms, audio: playBlob(r.blob), what: '念出来了，应该已经在放了' };
    }
    // 一秒钟的静音 wav（16kHz 单声道）
    function silentWav() {
        const sr = 16000, n = sr, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
        const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
        w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
        return new Blob([buf], { type: 'audio/wav' });
    }
    async function gyApiTestStt() {
        const c = typeof window.gyVoiceSttCfg === 'function' ? window.gyVoiceSttCfg() : {};
        if (!c.url) {
            const ok = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
            return ok ? { ok: true, rows: [['用的', '浏览器自带的识别（没填接口）']], what: '这个浏览器能自己识别语音，不用填接口' }
                      : { ok: false, rows: [['用的', '浏览器自带的识别（没填接口）']], hint: '这个浏览器 / App / 桌面版没有自带的语音识别。填一个转文字接口（比如硅基流动的 SenseVoiceSmall，免费），再测一次。' };
        }
        let u = noSlash(c.url); if (!/audio\/transcriptions/.test(u)) u += /\/v1$/.test(u) ? '/audio/transcriptions' : '/v1/audio/transcriptions';
        const rows = [['地址', host(u)], ['模型', c.model || 'whisper-1']];
        const fd = new FormData(); fd.append('file', silentWav(), 'test.wav'); fd.append('model', c.model || 'whisper-1');
        const t0 = Date.now();
        try {
            const res = await fetch(u, { method: 'POST', headers: c.key ? { Authorization: 'Bearer ' + c.key } : {}, body: fd });
            const ms = Date.now() - t0; rows.push(['用时', sec(ms)]);
            let j = null, txt = ''; try { txt = await res.text(); j = JSON.parse(txt); } catch (e) {}
            if (!res.ok) return { ok: false, rows, ms, err: 'HTTP ' + res.status + '：' + (j && (j.error && (j.error.message || j.error) || j.message) || txt).toString().slice(0, 200) };
            if (!j || j.text == null) return { ok: false, rows, ms, err: '接口回了东西，但里面没有 text：' + String(txt).slice(0, 200) };
            return { ok: true, rows, ms, what: '转文字接口能用（发过去的是一秒钟静音，所以认出来是空的，正常）' };
        } catch (e) { return { ok: false, rows, ms: Date.now() - t0, err: String(e && e.message || e) }; }
    }
    function loadImg(src, ms) {
        return new Promise(res => { const im = new Image(); const t = setTimeout(() => res(false), ms); im.onload = () => { clearTimeout(t); res(true); }; im.onerror = () => { clearTimeout(t); res(false); }; im.src = src; });
    }
    async function gyApiTestImg() {
        if (typeof window.gyPhotoTestGen !== 'function') return { ok: false, hint: '「角色发图片」没加载上，刷新一下再试。' };
        const t0 = Date.now();
        const r = await window.gyPhotoTestGen();
        const rows = [['渠道', r.name], ['地址', r.url ? host(r.url) : ''], ['模型', r.model || '']];
        if (!r.src) { rows.push(['用时', sec(Date.now() - t0)]); return { ok: false, rows, err: r.err || '没出图' }; }
        const ok = await loadImg(r.src, 90000);
        const ms = Date.now() - t0; rows.push(['用时', sec(ms)]);
        if (!ok) return { ok: false, rows, ms, err: '拿到了图片地址，但图加载不出来（接口这会儿抽风，或者地址不让别处引用）', hint: '拿到了图片地址，但图加载不出来。过一会儿再试；一直不行就换个渠道。' };
        return { ok: true, rows, ms, img: r.src, what: '画出来了，下面就是测试画的那张' };
    }
    async function gyApiTestCall() {
        const S = typeof window.gyCallRead === 'function' ? window.gyCallRead() : null;
        if (!S) return { ok: false, hint: '打电话的设置没加载上，刷新一下再试。' };
        if (S.tts !== 'api') {
            const ok = 'speechSynthesis' in window;
            if (ok) { try { const u = new SpeechSynthesisUtterance('喂，听得到吗？'); u.lang = 'zh-CN'; speechSynthesis.speak(u); } catch (e) {} }
            return ok ? { ok: true, rows: [['用的', '浏览器自带朗读']], what: '不用联网、不花钱，应该已经念给你听了。配过「🎙️ TA 的声音」的角色，打电话会用那个声音。' }
                      : { ok: false, rows: [['用的', '浏览器自带朗读']], hint: '这里没有自带朗读，换成「自己的接口」或者去「🎙️ TA 的声音」配一个。' };
        }
        let u = noSlash(S.url); if (!/audio\/speech/.test(u)) u += /\/v1$/.test(u) ? '/audio/speech' : '/v1/audio/speech';
        const rows = [['地址', host(u)], ['模型', S.model || 'tts-1'], ['音色', S.voice || 'alloy']];
        if (!S.url) return { ok: false, rows, hint: '还没填接口地址。' };
        const t0 = Date.now();
        try {
            const res = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (S.key || '') }, body: JSON.stringify({ model: S.model || 'tts-1', input: '喂，听得到吗？', voice: S.voice || 'alloy', speed: +S.rate || 1, response_format: 'mp3' }) });
            const ms = Date.now() - t0; rows.push(['用时', sec(ms)]);
            if (!res.ok) { let t = ''; try { t = (await res.text()).slice(0, 200); } catch (e) {} return { ok: false, rows, ms, err: 'HTTP ' + res.status + (t ? '：' + t : '') }; }
            const b = await res.blob();
            if (!b.size) return { ok: false, rows, ms, err: '接口回了个空的，没拿到声音' };
            return { ok: true, rows, ms, audio: playBlob(b), what: '念出来了，应该已经在放了' };
        } catch (e) { return { ok: false, rows, ms: Date.now() - t0, err: String(e && e.message || e) }; }
    }
    async function gyApiTestCloud() {
        const url = noSlash(val('cloudWorkerUrlInput')), tok = val('cloudAuthTokenInput');
        const rows = [['地址', url], ['ntfy topic', val('ntfyTopicInput')]];
        if (!url || !tok) return { ok: false, rows, hint: 'Worker 地址和共享密钥都要填上。' };
        const t0 = Date.now();
        try {
            const res = await fetch(url + '/pending', { headers: { Authorization: 'Bearer ' + tok } });
            const ms = Date.now() - t0; rows.push(['用时', sec(ms)]);
            if (res.status === 401) return { ok: false, rows, ms, err: 'HTTP 401', explain: { n: '共享密钥对不上', what: 'Worker 找到了，门也敲开了，但它不认这把密钥。', how: ['这里的「共享密钥」要和 Cloudflare 里 Worker 的 AUTH_TOKEN 一模一样（大小写、前后空格都算）', '改了 Worker 的变量要点「部署」才生效', '改好再点一次测试'] } };
            if (res.status === 404) return { ok: false, rows, ms, err: 'HTTP 404', explain: { n: 'Worker 地址不对 / 代码没部署', what: '这个地址上没有谷雨的 Worker（或者代码没粘对）。', how: ['地址填到 workers.dev 为止，后面不要加 /sync /pending', '去 Cloudflare 确认 worker.js 的代码粘进去并且点了部署'] } };
            if (!res.ok) return { ok: false, rows, ms, err: 'HTTP ' + res.status };
            let j = null; try { j = await res.json(); } catch (e) {}
            const n = j && (Array.isArray(j) ? j.length : Array.isArray(j.items) ? j.items.length : Array.isArray(j.pending) ? j.pending.length : null);
            if (n != null) rows.push(['云端攒着', n + ' 条还没拉回来']);
            if (!val('ntfyTopicInput')) rows.push(['提醒', '还没填 ntfy topic，手机收不到推送']);
            return { ok: true, rows, ms, what: 'Worker 在线，密钥也对' };
        } catch (e) { return { ok: false, rows, ms: Date.now() - t0, err: String(e && e.message || e) }; }
    }
    const RUN = { main: () => gyApiTestChat('main'), sub: () => gyApiTestChat('sub'), vec: gyApiTestVec, tts: gyApiTestTts, stt: gyApiTestStt, img: gyApiTestImg, call: gyApiTestCall, cloud: gyApiTestCloud };

    // 主入口：按钮上 onclick="gyApiTest('main', '', this)"
    window.gyApiTest = async function (kind, sub, btn) {
        if (!RUN[kind]) return null;
        if (kind === 'img' && typeof window.gyPhotoTestGen === 'function') {
            // 付费画图接口会真的花一张图的钱：先问一句（免费的不问）
            const chanFree = !document.getElementById('gypicUrl') && !document.getElementById('gypicTpl');
            if (!chanFree && typeof appConfirm === 'function' && !(await appConfirm('测试会真的画一张小图，用的是你填的画图接口（付费的会花一张图的钱）。要测吗？'))) return null;
        }
        const old = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ 正在测试…'; }
        let r;
        try { r = await RUN[kind](sub); } catch (e) { r = { ok: false, err: String(e && e.message || e) }; }
        if (btn) { btn.disabled = false; btn.innerHTML = old; }
        r = r || { ok: false, hint: '没测出结果' };
        show(kind, r); notify(kind, r);
        return r;
    };
    css();
})();
