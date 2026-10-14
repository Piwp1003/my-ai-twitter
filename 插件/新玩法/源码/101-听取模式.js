/* 🎬 听取模式：像 galgame 一样把 TA 的话一句一句播出来——底下对话框打字机出字、TA 的声音念出来（用「TA 的声音」配好的，没配就用系统朗读），念完自动下一句；括号里的动作当旁白。装了「🧍 角色立绘差分」插件的话，立绘站在画面里、表情跟着每一句换；没装就用 TA 的头像。能翻记录、能开「TA 回完话自动进来听」 */
if (window.__gyxListen) return; window.__gyxListen = 1;
X.feat('gyxListen', { n: '🎬 听取模式', desc: '像 galgame 一样一句句播 TA 的话：配音、立绘表情跟着变' });
const S = X.store('listen');
let D = { auto: false, speed: 38, voice: true, bg: {}, log: [], reads: [] };   // reads: TA 主动念的 {id,cid,at,lines}
const saveD = () => S.set('d', D);
const FALL = { '哭': '难过', '得意': '开心', '温柔': '开心', '害羞': '开心', '担心': '难过', '困': '默认', '认真': '默认', '惊讶': '默认', '生气': '默认', '难过': '默认', '开心': '默认' };
// 立绘：用「角色立绘差分」插件的数据（没装就 null）
function spriteOf(cid, text) {
    try {
        if (typeof window.gySpriteData !== 'function') return null; const c = (window.gySpriteData().chars || {})[String(cid)]; if (!c || !c.sprites || !c.sprites.length) return null;
        const have = [...new Set(c.sprites.map(s => s.mood))]; let f = (typeof window.gySpriteFaceFromText === 'function' && window.gySpriteFaceFromText(text, have)) || c.face || '默认', g = 0;
        while (g++ < 5) { const L = c.sprites.filter(s => s.mood === f); if (L.length) return { src: L[0].src, face: f }; f = FALL[f] || '默认'; }
        const d = c.sprites.find(s => s.mood === '默认') || c.sprites[0]; return { src: d.src, face: d.mood };
    } catch (e) { return null; }
}
// 一条消息拆成一句一句：括号里的动作单独成「旁白」
function split(text) {
    const out = []; let t = X.plain(text).replace(/\[EMO:[^\]]*\]|\[IMG:[^\]]*\]/g, '');
    t.split(/([（(][^）)]{1,80}[）)]|\*[^*]{1,80}\*)/).forEach(seg => {
        seg = (seg || '').trim(); if (!seg) return;
        if (/^[（(*]/.test(seg)) { out.push({ nar: 1, t: seg.replace(/^[（(*]|[）)*]$/g, '') }); return; }
        (seg.match(/[^。！？!?…~\n]+[。！？!?…~]*/g) || [seg]).forEach(s => { s = s.trim(); if (s) out.push({ t: s }); });
    });
    return out;
}
let P = null;   // {c, lines, i, auto, typing}
function linesFor(c, from) {
    const H = ((typeof globalChats !== 'undefined' && globalChats[c.id]) || []).filter(m => m && m.sender !== 'system' && typeof m.text === 'string');
    let start = H.length; if (from === 'last') { while (start > 0 && String(H[start - 1].sender) === String(c.id)) start--; if (start === H.length) { start = H.length; while (start > 0 && String(H[start - 1].sender) !== String(c.id)) start--; while (start > 0 && String(H[start - 1].sender) === String(c.id)) start--; } } else start = Math.max(0, H.length - (+from || 12));
    const L = []; H.slice(start).forEach(m => { const me = m.sender === 'me'; split(m.text).forEach(x => L.push(Object.assign(x, { me }))); });
    return L;
}
function stage() {
    let ov = document.getElementById('gyxLsOv'); if (ov) return ov;
    ov = document.createElement('div'); ov.id = 'gyxLsOv'; ov.setAttribute('data-gy-nopage', '1'); ov.setAttribute('data-gy-overlay', '1');
    ov.innerHTML = `<div class="ls-bg"></div><div class="ls-sp"></div><div class="ls-bar"><span onclick="gyxListenAuto()" id="gyxLsAuto">⏯ 自动</span><span onclick="gyxListenSkip()">⏭ 跳到最后</span><span onclick="gyxListenLog()">📜 记录</span><span onclick="gyxListenClose()">✕</span></div><div class="ls-box" onclick="gyxListenNext()"><b class="ls-name"></b><div class="ls-text"></div><i class="ls-more">▼</i></div><div class="ls-logbox" onclick="this.classList.remove('on')"></div>`;
    document.body.appendChild(ov); return ov;
}
function show() {
    const ov = stage(), x = P.lines[P.i]; if (!x) { window.gyxListenClose(); return; }
    const c = P.c, bg = D.bg[String(c.id)];
    ov.querySelector('.ls-bg').style.backgroundImage = bg ? `url("${bg}")` : '';
    const sp = x.me || x.nar ? null : spriteOf(c.id, x.t), box = ov.querySelector('.ls-sp');
    if (!x.me) { if (sp) { if (box.dataset.src !== sp.src) { box.dataset.src = sp.src; box.innerHTML = `<img src="${X.esc(sp.src)}" alt="">`; box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); } box.dataset.face = sp.face; } else if (!box.dataset.av) { box.dataset.av = 1; box.dataset.src = ''; let av = ''; try { av = getAvatarHTML(c, 180); } catch (e) {} box.innerHTML = `<div class="ls-av">${av}</div>`; } }
    box.classList.toggle('dim', !!x.me);
    ov.querySelector('.ls-name').textContent = x.nar ? '' : x.me ? X.me(c) : X.name(c);
    const tx = ov.querySelector('.ls-text'); tx.classList.toggle('nar', !!x.nar); tx.textContent = '';
    let k = 0; P.typing = true; clearInterval(P.tt);
    P.tt = setInterval(() => { tx.textContent = x.t.slice(0, ++k); if (k >= x.t.length) { clearInterval(P.tt); P.typing = false; } }, 1000 / Math.max(8, D.speed));
    D.log.unshift({ at: Date.now(), cid: String(c.id), who: x.nar ? '旁白' : x.me ? 'me' : 'ta', t: x.t }); D.log = D.log.slice(0, 300);
    const go = () => { if (P && P.auto && P.lines[P.i] === x) setTimeout(() => { if (P && P.lines[P.i] === x) window.gyxListenNext(); }, 700); };
    X.stopSpeak();
    if (D.voice && !x.me && !x.nar) X.speak(c, x.t, go); else setTimeout(go, Math.max(1200, x.t.length * 120));
}
window.gyxListenNext = () => { if (!P) return; if (P.typing) { clearInterval(P.tt); P.typing = false; document.querySelector('#gyxLsOv .ls-text').textContent = P.lines[P.i].t; return; } P.i++; if (P.i >= P.lines.length) { window.gyxListenClose(); return; } show(); };
window.gyxListenAuto = () => { if (!P) return; P.auto = !P.auto; const b = document.getElementById('gyxLsAuto'); if (b) b.classList.toggle('on', P.auto); if (P.auto && !P.typing) window.gyxListenNext(); };
window.gyxListenSkip = () => { if (!P) return; P.i = P.lines.length - 1; P.typing = false; show(); };
window.gyxListenLog = () => { const b = document.querySelector('#gyxLsOv .ls-logbox'); if (!b || !P) return; b.innerHTML = P.lines.slice(0, P.i + 1).map(x => `<p class="${x.nar ? 'nar' : x.me ? 'me' : ''}"><b>${x.nar ? '' : x.me ? X.esc(X.me(P.c)) : X.esc(X.name(P.c))}</b>${X.esc(x.t)}</p>`).join(''); b.classList.add('on'); b.scrollTop = b.scrollHeight; };
window.gyxListenClose = () => { X.stopSpeak(); if (P) clearInterval(P.tt); P = null; const o = document.getElementById('gyxLsOv'); if (o) o.remove(); saveD(); };
window.gyxListenPlay = (who, from, auto) => { const c = X.char(who) || X.cur(); if (!c) return false; const L = Array.isArray(from) ? from : linesFor(c, from || 'last'); if (!L.length) { X.toast(X.v('还没有能听的话', 'TA 还没说话呢'), ''); return false; } window.gyxListenClose(); P = { c, lines: L, i: 0, auto: auto != null ? auto : true }; show(); const b = document.getElementById('gyxLsAuto'); if (b) b.classList.toggle('on', P.auto); return true; };
window.gyxListenSet = async (k, v) => { D[k] = v; await saveD(); };
window.gyxListenBg = (cid, inp) => { const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = async () => { D.bg[String(cid)] = r.result; await saveD(); window.gyxListenOpen(cid); }; r.readAsDataURL(f); };
window.gyxListenOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), sp = spriteOf(cid, '');
    X.panel('gyxLsSet', '🎬 听取模式', `<div class="gyx-row">${X.whoSel(cid, 'gyxListenOpen')}</div>
        <div class="gyx-tip">${sp ? '🧍 用的是你在「角色立绘差分」里给 TA 上传的立绘，表情会跟着每一句换。' : typeof window.gySpriteData === 'function' ? '🧍 立绘插件装了，但 TA 还没有立绘，先用头像。去「🧍 角色立绘」里传几张就能用上。' : '🧍 没装「角色立绘差分」插件，用 TA 的头像。装上（插件 → 导入「角色立绘差分.json」）就能有立绘和表情。'}</div>
        <div class="gyx-row"><button class="gyx-btn" onclick="gyxListenPlay('${cid}','last')">▶ 听 TA 刚才说的</button><button class="gyx-btn lite" onclick="gyxListenPlay('${cid}',20)">听最近 20 条</button></div>
        <label class="gyx-row"><input type="checkbox" ${D.auto ? 'checked' : ''} onchange="gyxListenSet('auto',this.checked)"> TA 回完话自动进来听（只在你正开着这个人的聊天时）</label>
        <label class="gyx-row"><input type="checkbox" ${D.voice ? 'checked' : ''} onchange="gyxListenSet('voice',this.checked)"> 念出来（用「TA 的声音」，没配就用系统朗读）</label>
        <div class="gyx-row">出字速度 <input type="range" min="10" max="90" value="${D.speed}" onchange="gyxListenSet('speed',+this.value)"></div>
        <div class="gyx-row"><label class="gyx-btn lite">换背景图<input type="file" accept="image/*" style="display:none" onchange="gyxListenBg('${cid}',this)"></label>${D.bg[cid] ? `<button class="gyx-btn lite" onclick="gyxListenSet('bg',Object.assign(gyxListenData().bg,{'${cid}':''}));gyxListenOpen('${cid}')">不要背景</button>` : ''}</div>
        <div class="gyx-tip">聊天输入框上面那排有个 🎬，点一下直接听。</div>`);
};
window.gyxListenData = () => D;
// 聊天里的 🎬 按钮 + 「回完话自动听」
const seen = {};
function tick() {
    if (!X.on('gyxListen')) { const b = document.getElementById('gyxLsBtn'); if (b) b.remove(); return; }
    const g = document.getElementById('miniGameIconBtn'); if (g && !document.getElementById('gyxLsBtn')) { const b = document.createElement('button'); b.id = 'gyxLsBtn'; b.className = g.className.replace('mini-game-icon-badge', '').trim(); b.title = '听取模式：一句一句听 TA 说'; b.textContent = '🎬'; b.onclick = () => { let sid = null; try { sid = currentChatSessionId; } catch (e) {} window.gyxListenPlay(sid, 'last'); }; b.oncontextmenu = e => { e.preventDefault(); window.gyxListenOpen(); }; g.insertAdjacentElement('afterend', b); }
    if (!D.auto || P) return; let sid = null; try { sid = currentChatSessionId; } catch (e) {} const c = sid && X.char(sid); if (!c) return;
    const v = document.getElementById('view-chat'); if (!v || getComputedStyle(v).display === 'none') return;
    const H = globalChats[c.id] || [], last = H[H.length - 1]; if (!last) return;
    if (seen[c.id] == null) { seen[c.id] = last.timestamp || 0; return; }
    if (String(last.sender) === String(c.id) && (last.timestamp || 0) > seen[c.id] && Date.now() - (last.timestamp || 0) > 2500) { seen[c.id] = last.timestamp; window.gyxListenPlay(c.id, 'last'); }
    else if (last.sender === 'me') seen[c.id] = Math.max(seen[c.id], last.timestamp || 0);
}
X.ctx(id => { const r = D.reads.find(x => x.cid === String(id) && Date.now() - x.at < 864e5); return r ? `【你刚给她念了一段话】${r.lines.join('')}` : ''; }, 'gyxListen');
X.action({ key: 'gyx_listen', label: '想念一段话给她听（她会像看动画一样一句句听到你的声音）', hint: '听取模式', need: c => !D.reads.some(x => x.cid === String(c.id) && Date.now() - x.at < 3 * 864e5),
    run: async c => { const r = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n最近的聊天：\n${X.recent(c, 10)}\n你想念一段话给她听（像录一段语音、或者睡前读给她）。写 3~6 句，口语，可以带一两个括号里的小动作。输出 JSON：{"lines":["",""]}`)); const L = (r && r.lines || []).map(X.plain).filter(Boolean).slice(0, 8); if (!L.length) return null; const it = { id: 'lr' + Date.now().toString(36), cid: String(c.id), at: Date.now(), lines: L }; D.reads.unshift(it); D.reads = D.reads.slice(0, 40); await saveD(); X.say(c, '🎬 ' + L.join('')); X.notify(c, `🎬 ${X.esc(X.name(c))} ${X.v('念了一段话给你', '录了一段想让你听的', '有段话想念给你听')}`, '点开一句句听', () => window.gyxListenPlay(c.id, 'last')); return '念了一段话给你听'; } }, 'gyxListen');
X.today(() => ({ title: '🎬 听取', rows: D.reads.filter(x => X.day(new Date(x.at)) === X.day()).map(x => ({ t: X.esc(X.name(X.char(x.cid))), x: '念了一段：' + X.esc(x.lines[0].slice(0, 20)), go: `gyxListenPlay('${x.cid}','last')` })) }), 'gyxListen');
X.widget('gyxListenW', { n: '听取模式', sizes: ['s', 'm'], tap: () => { const c = X.cur(); window.gyxListenPlay(c && c.id, 'last'); }, r: w => { const l = D.log.find(x => x.who === 'ta'); return X.gw(w, '🎬', '听 TA 说', [l ? '「' + X.esc(l.t.slice(0, 18)) + '」' : '点我一句句听', l ? X.esc(X.name(X.char(l.cid))) : '']); } }, 'gyxListen');
X.memArr({ k: 'gyxListen', ico: '🎬', n: 'TA 念给你的话', d: 'TA 主动念给你听的那几段', arr: () => D.reads, field: 'lines', text: x => x.lines.join(' / '), edit: (x, v) => { x.lines = String(v).split(' / ').map(s => s.trim()).filter(Boolean); }, save: saveD }, 'gyxListen');
X.css('gyxLsCss', `#gyxLsOv{position:fixed;inset:0;z-index:100008;background:#1a1626;overflow:hidden;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;user-select:none}
#gyxLsOv .ls-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,#4a3f6b,#120f1d);background-size:cover;background-position:center;filter:brightness(.85)}
#gyxLsOv .ls-sp{position:absolute;left:50%;bottom:120px;transform:translateX(-50%);height:min(78vh,760px);display:flex;align-items:flex-end;justify-content:center;transition:filter .3s}#gyxLsOv .ls-sp img{height:100%;max-width:92vw;object-fit:contain;filter:drop-shadow(0 10px 30px rgba(0,0,0,.4))}
#gyxLsOv .ls-sp.pop img{animation:lsPop .35s ease-out}@keyframes lsPop{from{transform:translateY(8px) scale(.985)}to{transform:none}}#gyxLsOv .ls-sp.dim{filter:brightness(.55)}
#gyxLsOv .ls-av{margin-bottom:22vh}#gyxLsOv .ls-av .avatar{transform:scale(1.6);box-shadow:0 0 0 6px rgba(255,255,255,.15)}
#gyxLsOv .ls-box{position:absolute;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(860px,94vw);min-height:110px;box-sizing:border-box;padding:16px 22px 22px;border-radius:18px;background:rgba(20,16,32,.78);backdrop-filter:blur(10px);color:#fff;cursor:pointer;border:1px solid rgba(255,255,255,.12)}
#gyxLsOv .ls-name{position:absolute;top:-16px;left:22px;background:#ff7aa8;color:#fff;font-size:14px;padding:4px 14px;border-radius:999px}#gyxLsOv .ls-name:empty{display:none}
#gyxLsOv .ls-text{font-size:17px;line-height:1.8;min-height:60px}#gyxLsOv .ls-text.nar{color:#cfc6f0;font-style:italic}#gyxLsOv .ls-more{position:absolute;right:18px;bottom:8px;font-style:normal;font-size:12px;opacity:.6;animation:lsB 1s infinite}@keyframes lsB{50%{transform:translateY(3px)}}
#gyxLsOv .ls-bar{position:absolute;top:calc(12px + env(safe-area-inset-top));right:12px;display:flex;gap:6px;z-index:2}#gyxLsOv .ls-bar span{background:rgba(0,0,0,.35);color:#fff;font-size:13px;padding:6px 11px;border-radius:999px;cursor:pointer}#gyxLsOv .ls-bar span.on{background:#ff7aa8}
#gyxLsOv .ls-logbox{position:absolute;inset:0;z-index:3;background:rgba(10,8,18,.92);color:#eee;overflow:auto;padding:60px 24px 30px;display:none;font-size:15px;line-height:1.8}#gyxLsOv .ls-logbox.on{display:block}#gyxLsOv .ls-logbox p{max-width:760px;margin:8px auto}#gyxLsOv .ls-logbox b{color:#ff9fc0;margin-right:8px}#gyxLsOv .ls-logbox p.nar{color:#a9a0cc;font-style:italic}#gyxLsOv .ls-logbox p.me b{color:#8fd3ff}`);
X.mini({ id: 'gyxListen', icon: '🎬', title: '听取模式', desc: '像 galgame 一样一句句播 TA 的话，配音、立绘表情跟着变', cat: '陪伴', onOpen: () => window.gyxListenOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.bg = D.bg || {}; D.log = D.log || []; D.reads = D.reads || []; setInterval(tick, 1500); })();
