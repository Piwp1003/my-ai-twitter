/* ============================================================
   📔 心情手账 · 📊 聊天统计 / 词云 · 🎬 开场动画（v205，从白露搬过来）
   - 心情手账：你每天记心情和几句话；TA 也有自己的一本（TA 自己写，接模型）。
     TA 看得到你今天的心情，你记了难过的，TA 多半会来找你。
   - 统计：一共聊了多少、谁说得多、最常说的话、几点最爱聊、连着聊了几天、词云。
   - 开场动画：打开谷雨时的星空开场，副标题是 TA 最近对你说过的一句（也能自己写）。
   ============================================================ */
(function () {
    'use strict';
    if (window.__gyMoodLoaded) return;
    window.__gyMoodLoaded = true;

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const toast = (a, b) => { try { showToast('', a, b || '', null, null, false); } catch (e) {} };
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const chars = () => (typeof myCharacters !== 'undefined' ? myCharacters : []).filter(c => c && !c.members);
    const charById = id => chars().find(c => String(c.id) === String(id));
    const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const plain = t => String(t || '').replace(/<[^>]+>/g, '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    const LF = (typeof localforage !== 'undefined' && localforage.createInstance) ? localforage.createInstance({ name: 'gyMood', storeName: 'kv' }) : null;

    const MOODS = [['开心', '😊', '#ffb74d'], ['甜', '🥰', '#f06292'], ['平静', '😌', '#81c784'], ['期待', '✨', '#ffd54f'], ['累', '😪', '#90a4ae'], ['想你', '🥺', '#ba68c8'],
        ['委屈', '😢', '#64b5f6'], ['烦', '😤', '#e57373'], ['emo', '🌧️', '#7986cb'], ['无聊', '😶', '#bdbdbd'], ['兴奋', '🤩', '#ff8a65'], ['撒娇', '🙈', '#f48fb1']];
    const LOW = ['累', '委屈', '烦', 'emo', '想你'];
    const moodOf = n => MOODS.find(m => m[0] === n) || [n || '', '·', '#ccc'];

    let D = { days: {}, intro: { on: true, lines: [] } };
    const ready = (async () => { try { const v = LF && await LF.getItem('data'); if (v) D = Object.assign(D, v); } catch (e) {} D.days = D.days || {}; D.intro = Object.assign({ on: true, lines: [] }, D.intro || {}); })();
    const save = async () => { try { if (LF) await LF.setItem('data', D); } catch (e) {} };
    const day = k => (D.days[k] = D.days[k] || { me: null, ta: {} });
    window.gyMoodData = () => D;

    /* ---------------- TA 写今天的心情 ---------------- */
    const writing = {};
    async function taWrite(ch, force) {
        if (!ch) return null;
        const k = dayKey(), d = day(k), id = String(ch.id);
        if (d.ta[id] && !force) return d.ta[id];
        if (writing[id]) return writing[id];
        writing[id] = (async () => {
            let m = null, note = '';
            try {
                const api = typeof getApiConfig === 'function' ? getApiConfig(true) : null;
                if (api && api.url && typeof sendChatRequest === 'function') {
                    const H = ((typeof globalChats !== 'undefined' && globalChats[id]) || []).filter(x => x.sender !== 'system').slice(-14)
                        .map(x => (x.sender === 'me' ? '她' : ch.name) + '：' + plain(x.text).slice(0, 80)).join('\n');
                    const me = d.me ? `她今天在心情手账里记的是「${d.me.m}」${d.me.note ? '，写着：' + d.me.note : ''}。` : '';
                    const prompt = `你是${ch.name}。${String(ch.persona || ch.description || '').slice(0, 600)}\n\n最近你们的聊天：\n${H || '（今天还没聊）'}\n\n${me}今天是 ${k}。用你自己的口吻，给你的心情手账写今天这一页：从这些心情里挑一个最贴近你今天的：${MOODS.map(x => x[0]).join('、')}；再写今天的心情，长短随你（像写给自己看的，不要写成对她说话）。\n只输出 JSON：{"m":"心情","note":"一两句"}`;
                    const data = await sendChatRequest(api, prompt);
                    const txt = String(data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '');
                    const j = JSON.parse((txt.match(/\{[\s\S]*\}/) || ['{}'])[0]);
                    if (j && j.m) { m = MOODS.some(x => x[0] === j.m) ? j.m : (MOODS.find(x => String(j.m).includes(x[0])) || [null])[0]; note = String(j.note || ''); }
                }
            } catch (e) {}
            if (!m) { m = pick(MOODS)[0]; note = note || ''; }
            d.ta[id] = { m, note, at: Date.now() };
            await save();
            return d.ta[id];
        })();
        try { return await writing[id]; } finally { delete writing[id]; }
    }
    window.gyMoodTaWrite = (id, force) => taWrite(charById(id), force);

    /* ---------------- TA 知道你今天的心情 ---------------- */
    const NUDGE = {};
    window.__gyMoodCtxFor = function (charId) {
        const ch = charById(charId); if (!ch) return '';
        const d = D.days[dayKey()]; let t = '';
        if (d && d.me) t += `【她的心情手账】她今天记的心情是「${d.me.m}」${d.me.note ? '，写着：「' + d.me.note + '」' : ''}。你看得到她的心情手账，聊天时心里有数就好，不用每句都提。`;
        const ta = d && d.ta && d.ta[String(ch.id)];
        if (ta) t += `${t ? '\n' : ''}【你自己的心情手账】你今天记的是「${ta.m}」${ta.note ? '：' + ta.note : ''}。`;
        const n = NUDGE[String(ch.id)]; if (n) t += `\n【这次主动找她的由头】${n}。就为这个来找她，自然地说。`;
        return t;
    };
    // 你记了心情：挑一个人，看情况来找你
    function reactTarget() {
        const cs = chars(); if (!cs.length) return null;
        const sid = typeof currentChatSessionId !== 'undefined' && currentChatSessionId && !String(currentChatSessionId).startsWith('g_') ? String(currentChatSessionId) : '';
        if (sid && charById(sid)) return charById(sid);
        let best = null, bt = -1;
        cs.forEach(c => { const H = (typeof globalChats !== 'undefined' && globalChats[c.id]) || []; const t = H.length ? H[H.length - 1].timestamp || 0 : 0; if (t > bt) { bt = t; best = c; } });
        return best;
    }
    async function react(entry) {
        const ch = reactTarget(); if (!ch || typeof sendProactiveChatMessage !== 'function') return false;
        const p = LOW.includes(entry.m) ? 0.7 : 0.3;
        if (!window.__gyMoodAlways && Math.random() > p) return false;
        const go = async () => {
            NUDGE[String(ch.id)] = `她刚在心情手账里记了今天的心情「${entry.m}」${entry.note ? '，写着「' + entry.note + '」' : ''}，你看到了`;
            try { await sendProactiveChatMessage(ch); } catch (e) {} finally { delete NUDGE[String(ch.id)]; }
        };
        if (window.__gyMoodAlways) await go(); else setTimeout(go, (20 + Math.random() * 70) * 1000);
        return true;
    }

    /* ---------------- 面板 ---------------- */
    let TAB = 'mood', MONTH = null, WHO = '', PEND = {};
    window.gyMoodOpen = async function (tab) {
        await ready;
        if (tab) TAB = tab;
        const cs = chars();
        if (!WHO || !charById(WHO)) { const sid = typeof currentChatSessionId !== 'undefined' && currentChatSessionId ? String(currentChatSessionId) : ''; WHO = String((charById(sid) || cs[0] || {}).id || ''); }
        let ov = document.getElementById('gyMdOv'); if (ov) ov.remove();
        ov = document.createElement('div'); ov.id = 'gyMdOv'; ov.className = 'modal-overlay';
        ov.innerHTML = `<div class="gymd-box"><div class="gymd-hd"><b>${TAB === 'stat' ? '📊 聊天统计' : TAB === 'intro' ? '🎬 开场动画' : '📔 心情手账'}</b><span onclick="document.getElementById('gyMdOv').remove()">✕</span></div>
            <div class="gymd-tabs">${[['mood', '📔 心情手账'], ['stat', '📊 统计 · 词云'], ['intro', '🎬 开场动画']].map(t => `<span class="${TAB === t[0] ? 'on' : ''}" onclick="gyMoodOpen('${t[0]}')">${t[1]}</span>`).join('')}</div>
            <div id="gyMdBody"></div></div>`;
        ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
        document.body.appendChild(ov); ov.style.display = 'flex';
        paint();
        // 打开手账时 TA 今天还没写：让 TA 现在写
        if (TAB === 'mood') { const ch = charById(WHO), d = D.days[dayKey()]; if (ch && !(d && d.ta && d.ta[String(ch.id)] !== undefined)) taWrite(ch).then(() => { if (TAB === 'mood') paint(); }); }
    };
    function whoSel() { return `<select class="gymd-who" onchange="gyMoodWho(this.value)">${chars().map(c => `<option value="${esc(c.id)}"${String(c.id) === WHO ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`; }
    window.gyMoodWho = v => { WHO = String(v); paint(); if (TAB === 'mood') { const ch = charById(WHO), d = D.days[dayKey()]; if (ch && !(d && d.ta && d.ta[WHO])) taWrite(ch).then(() => paint()); } };
    function paint() { const b = document.getElementById('gyMdBody'); if (!b) return; b.innerHTML = TAB === 'stat' ? tabStat() : TAB === 'intro' ? tabIntro() : tabMood(); if (TAB === 'mood') window.gyMoodDay(dayKey(), true); }

    function tabMood() {
        const now = new Date(); if (!MONTH) MONTH = [now.getFullYear(), now.getMonth()];
        const [y, m] = MONTH, first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), ch = charById(WHO);
        let cells = ''; for (let i = 0; i < first; i++) cells += '<i></i>';
        const cnt = { me: {}, ta: {} };
        for (let d = 1; d <= days; d++) {
            const k = dayKey(new Date(y, m, d)), dd = D.days[k] || {}, me = dd.me, ta = ch && dd.ta ? dd.ta[ch.id] : null;
            if (me) cnt.me[me.m] = (cnt.me[me.m] || 0) + 1; if (ta) cnt.ta[ta.m] = (cnt.ta[ta.m] || 0) + 1;
            cells += `<span class="gymd-day${k === dayKey() ? ' today' : ''}" onclick="gyMoodDay('${k}')"><em>${d}</em><b>${me ? moodOf(me.m)[1] : ''}</b><u>${ta ? moodOf(ta.m)[1] : ''}</u></span>`;
        }
        const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => moodOf(n)[1] + n + '×' + c).join('　') || '还没有';
        return `<div class="gymd-row">${whoSel()}<span class="gymd-nav"><i onclick="gyMoodMonth(-1)">‹</i>${y} 年 ${m + 1} 月<i onclick="gyMoodMonth(1)">›</i></span></div>
            <div class="gymd-tip">每格上面是你，下面是 ${esc(ch ? ch.name : 'TA')}。你记的心情 TA 看得到。</div>
            <div class="gymd-cal">${['日', '一', '二', '三', '四', '五', '六'].map(w => `<i class="w">${w}</i>`).join('')}${cells}</div>
            <div class="gymd-stat">你这个月：${top(cnt.me)}<br>${esc(ch ? ch.name : 'TA')}这个月：${top(cnt.ta)}</div><div id="gyMdDay"></div>`;
    }
    window.gyMoodMonth = n => { let [y, m] = MONTH; m += n; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } MONTH = [y, m]; paint(); };
    window.gyMoodDay = function (k, quiet) {
        const box = document.getElementById('gyMdDay'); if (!box) return;
        const dd = D.days[k] || { me: null, ta: {} }, ch = charById(WHO), ta = ch && dd.ta ? dd.ta[ch.id] : null, me = dd.me || {}, isToday = k === dayKey();
        const taHtml = ta ? `${moodOf(ta.m)[1]} ${esc(ta.m)}<div class="gymd-note">${esc(ta.note || '')}</div>` : (isToday && ch && writing[String(ch.id)] ? '<span class="gymd-mute">正在写……</span>' : '<span class="gymd-mute">这天没记</span>');
        box.innerHTML = `<div class="gymd-dd"><div class="gymd-dh">${k}</div>
            <div class="gymd-ta">${esc(ch ? ch.name : 'TA')}：${taHtml}${isToday && ch ? ` <i class="gymd-re" onclick="gyMoodTaAgain()">让 TA 重写</i>` : ''}</div>
            <div class="gymd-me"><div>我：</div><div class="gymd-moods">${MOODS.map(mm => `<span class="${(PEND[k] || me.m) === mm[0] ? 'on' : ''}" style="--mc:${mm[2]}" onclick="gyMoodSet('${k}','${mm[0]}')">${mm[1]} ${mm[0]}</span>`).join('')}</div>
            <textarea id="gyMdNote" rows="2" placeholder="写两句今天">${esc(me.note || '')}</textarea>
            <div class="gymd-row"><button class="gymd-btn" onclick="gyMoodSave('${k}')">存下来</button>${dd.me ? `<button class="gymd-lite" onclick="gyMoodDel('${k}')">清掉我这天</button>` : ''}</div></div></div>`;
    };
    window.gyMoodTaAgain = async () => { const ch = charById(WHO); if (!ch) return; const p = taWrite(ch, true); window.gyMoodDay(dayKey()); await p; paint(); };
    window.gyMoodSet = (k, m) => { PEND[k] = m; document.querySelectorAll('#gyMdDay .gymd-moods span').forEach(s => s.classList.toggle('on', s.textContent.trim().endsWith(m))); };
    window.gyMoodSave = async function (k) {
        const dd = day(k), m = PEND[k] || (dd.me && dd.me.m); if (!m) { toast('先点一个心情'); return; }
        const isNew = !dd.me || dd.me.m !== m;
        dd.me = { m, note: ((document.getElementById('gyMdNote') || {}).value || '').trim(), at: Date.now() }; delete PEND[k];
        await save(); paint(); toast('记下了 ' + moodOf(m)[1]);
        repaintWidget();
        if (k === dayKey() && isNew) react(dd.me);
    };
    window.gyMoodDel = async k => { if (D.days[k]) D.days[k].me = null; await save(); paint(); repaintWidget(); };

    /* ---------------- 统计 · 词云 ---------------- */
    const STOP = new Set('的了是我你他她它们在就都和也还又吗呢吧啊嗯哦呀嘛这那个一不有没要会到说去来上下着过把被让给对很太好么什怎样为'.split(''));
    function tabStat() {
        const ch = charById(WHO), arr = ((ch && typeof globalChats !== 'undefined' && globalChats[ch.id]) || []).filter(m => m.sender !== 'system');
        const me = arr.filter(m => m.sender === 'me'), ta = arr.filter(m => String(m.sender) === String(ch && ch.id));
        const first = arr[0], last = arr[arr.length - 1], fmt = t => t ? new Date(t).toLocaleString() : '—';
        const top = L => { const c = {}; L.forEach(m => { const t = plain(m.text); if (t && t.length <= 30) c[t] = (c[t] || 0) + 1; }); return Object.entries(c).filter(x => x[1] > 1).sort((a, b) => b[1] - a[1]).slice(0, 10); };
        // 几点最爱聊
        const hrs = new Array(24).fill(0); arr.forEach(m => { if (m.timestamp) hrs[new Date(m.timestamp).getHours()]++; });
        const hm = Math.max(1, ...hrs), peak = hrs.indexOf(Math.max(...hrs));
        // 聊过几天、最长连续几天
        const ds = [...new Set(arr.filter(m => m.timestamp).map(m => dayKey(new Date(m.timestamp))))].sort();
        let run = 0, best = 0, prev = null; ds.forEach(k => { const t = new Date(k + 'T00:00:00').getTime(); run = prev != null && t - prev <= 86400000 * 1.5 ? run + 1 : 1; best = Math.max(best, run); prev = t; });
        const words = {}; arr.forEach(m => { const t = plain(m.text);
            (t.match(/[a-zA-Z]{3,}/g) || []).forEach(w => { w = w.toLowerCase(); words[w] = (words[w] || 0) + 1; });
            t.replace(/[^一-龥]+/g, ' ').split(' ').forEach(seg => { for (let n = 4; n >= 2; n--) for (let i = 0; i + n <= seg.length; i++) { const w = seg.slice(i, i + n); if (STOP.has(w[0]) || STOP.has(w[w.length - 1])) continue; words[w] = (words[w] || 0) + (n === 4 ? 2.4 : n === 3 ? 1.8 : 1); } });
        });
        const kept = []; Object.entries(words).filter(x => x[1] >= 2).sort((a, b) => b[1] - a[1]).forEach(([w, v]) => { if (kept.length < 120 && !kept.some(([k]) => k.includes(w) && k !== w)) kept.push([w, v]); });
        const mx = Math.max(1, ...kept.map(x => x[1])), mn = Math.min(mx, ...kept.map(x => x[1]));
        const size = v => 11 + (Math.log(v) - Math.log(mn)) / Math.max(0.01, Math.log(mx) - Math.log(mn)) * 43;
        const cols = ['#1d9bf0', '#f06292', '#ba68c8', '#4db6ac', '#ffb74d', '#7986cb', '#e57373', '#81c784'];
        const cloud = kept.map(([w, v], i) => `<span style="font-size:${size(v).toFixed(1)}px;color:${cols[i % cols.length]};opacity:${(1 - i / (kept.length * 1.6)).toFixed(2)}${i > 5 && i % 6 === 0 ? ';writing-mode:vertical-rl' : ''}">${esc(w)}</span>`).join('');
        const li = L => L.length ? L.map(([t, n]) => `<li>${esc(t)} <em>×${n}</em></li>`).join('') : '<li class="gymd-mute">还没有重复说过的</li>';
        const nm = esc(ch ? ch.name : 'TA');
        return `<div class="gymd-row">${whoSel()}</div>
            <div class="gymd-nums"><div><b>${arr.length}</b>条消息</div><div><b>${me.length}</b>你说的</div><div><b>${ta.length}</b>${nm}说的</div><div><b>${ds.length}</b>天聊过</div><div><b>${best}</b>天最长连着聊</div></div>
            <div class="gymd-tip">第一次聊：${fmt(first && first.timestamp)}　最近一次：${fmt(last && last.timestamp)}${arr.length ? `　最爱在 <b>${peak} 点</b>聊` : ''}</div>
            <div class="gymd-hrs">${hrs.map((n, h) => `<i style="height:${Math.round(4 + n / hm * 46)}px" title="${h} 点：${n} 条"${h === peak && n ? ' class="pk"' : ''}></i>`).join('')}</div><div class="gymd-hl"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div>
            <div class="gymd-two"><div><div class="gymd-dh">你最常说</div><ol>${li(top(me))}</ol></div><div><div class="gymd-dh">${nm}最常说</div><ol>${li(top(ta))}</ol></div></div>
            <div class="gymd-dh">词云</div><div class="gymd-cloud">${cloud || '<span class="gymd-mute">聊得再多一点就有了</span>'}</div>`;
    }

    /* ---------------- 🎬 开场动画 ---------------- */
    function introLine() {
        const own = (D.intro.lines || []).map(s => String(s).trim()).filter(Boolean);
        if (own.length) return pick(own);
        const pool = [];
        chars().forEach(c => { ((typeof globalChats !== 'undefined' && globalChats[c.id]) || []).slice(-80).forEach(m => { if (String(m.sender) === String(c.id)) { const t = plain(String(m.text || '').replace(/^\s*[\[【]\s*语音\s*[\]】]/, '')); if (t.length >= 4 && t.length <= 24) pool.push(t + ' —— ' + c.name); } }); });
        return pool.length ? pick(pool) : '今天也想你';
    }
    function intro(force) {
        if (!force && (D.intro.on === false || navigator.webdriver)) return;
        if (document.getElementById('gyIntro')) return;
        const ov = document.createElement('div'); ov.id = 'gyIntro';
        let stars = ''; for (let i = 0; i < 40; i++) stars += `<i style="left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${(Math.random() * 3).toFixed(2)}s;transform:scale(${(0.4 + Math.random() * 0.8).toFixed(2)})"></i>`;
        ov.innerHTML = `<div class="gi-stars">${stars}</div><div class="gi-c"><div class="gi-t">${esc(D.intro.title || '谷雨')}</div><div class="gi-s"></div><div class="gi-bar"><b></b></div></div>`;
        document.body.appendChild(ov);
        let iv = null;
        const close = () => { clearInterval(iv); if (!ov.parentNode) return; ov.classList.add('out'); setTimeout(() => ov.remove(), 600); };
        ov.addEventListener('click', close);
        const start = () => {
            const el = ov.querySelector('.gi-s'), target = introLine(), pool = '✦✧·♡░▒▓〇口日月木水火土'.split('');
            let step = 0;
            iv = setInterval(() => { step++; const done = Math.floor(step / 2); el.textContent = target.split('').map((c, i) => i < done ? c : (c === ' ' ? ' ' : pick(pool))).join(''); if (done >= target.length) clearInterval(iv); }, 45);
            setTimeout(close, 2400 + target.length * 60);
        };
        // 等存档读出来再挑那句话（最多等 2.5 秒）
        const t0 = Date.now(); const wait = () => { if (window.__guyuBooted || Date.now() - t0 > 2500) start(); else setTimeout(wait, 120); }; wait();
    }
    window.gyIntroPlay = () => intro(true);
    function tabIntro() {
        return `<label class="gymd-ck"><input type="checkbox"${D.intro.on !== false ? ' checked' : ''} onchange="gyIntroSet('on',this.checked)"> 打开谷雨时放开场动画（点一下就跳过）</label>
            <label class="gymd-f"><span>大标题</span><input value="${esc(D.intro.title || '谷雨')}" onchange="gyIntroSet('title',this.value)"></label>
            <label class="gymd-f"><span>副标题：自己写几句，一行一句，每次随机一句（空着＝随机挑 TA 最近对你说过的一句）</span><textarea rows="4" onchange="gyIntroSet('lines',this.value)">${esc((D.intro.lines || []).join('\n'))}</textarea></label>
            <button class="gymd-btn" onclick="gyIntroPlay()">预览一下</button>`;
    }
    window.gyIntroSet = async (k, v) => { if (k === 'lines') v = String(v).split('\n').map(s => s.trim()).filter(Boolean); D.intro[k] = v; await save(); };

    /* ---------------- 小手机小组件「心情」 ---------------- */
    function repaintWidget() { try { const X = window.__gyPmW; if (X && X.render && document.body.classList.contains('gyphm') && !document.body.classList.contains('gyphm-app') && !document.querySelector('#gyPmHome .pm-lock')) X.render(); } catch (e) {} }
    function widget() {
        const X = window.__gyPmW; if (!X || !X.WD || X.WD.moodbook) return;
        X.WD.moodbook = {
            n: '心情手账', sizes: ['s', 'm'],
            tap: () => window.gyMoodOpen('mood'),
            r: w => {
                const d = D.days[dayKey()] || {}, me = d.me, ch = reactTarget(), ta = ch && d.ta ? d.ta[ch.id] : null;
                if (w.size === 's') return `<div class="gw-md s"><b>${me ? moodOf(me.m)[1] : '📔'}</b><em>${me ? esc(me.m) : '记今天'}</em></div>`;
                return `<div class="gw-md m"><div><span>我</span><b>${me ? moodOf(me.m)[1] : '＋'}</b><em>${me ? esc(me.note || me.m) : '今天还没记'}</em></div><div><span>${esc(ch ? ch.name : 'TA')}</span><b>${ta ? moodOf(ta.m)[1] : '·'}</b><em>${ta ? esc(ta.note || ta.m) : '还没写'}</em></div></div>`;
            }
        };
    }

    /* ---------------- 接到别的地方 ---------------- */
    function hooks() {
        try { if (typeof GY_BOX_CTX !== 'undefined' && Array.isArray(GY_BOX_CTX) && !GY_BOX_CTX.some(x => x[0] === '__gyMoodCtxFor')) GY_BOX_CTX.push(['__gyMoodCtxFor', '心情手账']); } catch (e) {}
        try {
            if (typeof GY_AUTONOMY_ACTIONS !== 'undefined' && Array.isArray(GY_AUTONOMY_ACTIONS) && !GY_AUTONOMY_ACTIONS.some(a => a.key === 'mood_note')) GY_AUTONOMY_ACTIONS.push({
                key: 'mood_note', label: '写今天的心情手账', hint: '给自己的手账写今天这一页（她看得到）',
                need: c => { const d = D.days[dayKey()]; return !(d && d.ta && d.ta[String(c.id)]); },
                run: async c => { const r = await taWrite(c); repaintWidget(); return r ? '写了今天的心情手账：' + moodOf(r.m)[1] + r.m : null; }
            });
        } catch (e) {}
        try {
            if (typeof registerMiniFeature === 'function' && typeof GY_MINI_FEATURES !== 'undefined') {
                if (!GY_MINI_FEATURES.some(f => f.id === 'moodbook')) registerMiniFeature({ id: 'moodbook', icon: '📔', title: '心情手账', desc: '你每天记心情，TA 也有自己的一本；你难过了 TA 会知道', onOpen: () => window.gyMoodOpen('mood') });
                if (!GY_MINI_FEATURES.some(f => f.id === 'chatstat')) registerMiniFeature({ id: 'chatstat', icon: '📊', title: '聊天统计 · 词云', desc: '聊了多少、谁说得多、最常说的话、几点最爱聊、词云', onOpen: () => window.gyMoodOpen('stat') });
                if (!GY_MINI_FEATURES.some(f => f.id === 'intro')) registerMiniFeature({ id: 'intro', icon: '🎬', title: '开场动画', desc: '打开谷雨时的星空开场，副标题是 TA 对你说过的一句', onOpen: () => window.gyMoodOpen('intro') });
            }
        } catch (e) {}
        widget();
    }

    const CSS = `
#gyMdOv{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:14px}
.gymd-box{background:#fff;color:#111;border-radius:18px;width:min(620px,100%);max-height:92vh;overflow:auto;padding:16px 18px;box-sizing:border-box}
.gymd-hd{display:flex;justify-content:space-between;font-size:18px;margin-bottom:8px}.gymd-hd span{cursor:pointer;color:#888}
.gymd-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.gymd-tabs span{padding:5px 11px;border-radius:999px;background:#f2f2f4;font-size:13px;cursor:pointer}.gymd-tabs span.on{background:#111;color:#fff}
.gymd-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}.gymd-who{padding:7px 10px;border-radius:10px;border:1px solid #ddd;background:#fafafa}
.gymd-nav{margin-left:auto;display:flex;gap:10px;align-items:center;font-size:14px}.gymd-nav i{font-style:normal;cursor:pointer;padding:2px 8px;border-radius:8px;background:#f2f2f4}
.gymd-tip{font-size:12.5px;color:#888;line-height:1.7;margin:4px 0 8px}.gymd-mute{color:#aaa}
.gymd-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.gymd-cal i.w{font-style:normal;text-align:center;font-size:11px;color:#aaa}
.gymd-day{border-radius:10px;background:#f7f7f9;min-height:52px;display:flex;flex-direction:column;align-items:center;padding:3px 0;cursor:pointer;font-size:15px}
.gymd-day em{font-style:normal;font-size:10.5px;color:#999}.gymd-day b,.gymd-day u{text-decoration:none;font-weight:normal;min-height:18px;line-height:18px}.gymd-day u{opacity:.75}.gymd-day.today{outline:2px solid #1d9bf0}
.gymd-stat{font-size:12.5px;color:#666;margin:10px 0;line-height:1.8}.gymd-dd{border-top:1px solid #eee;margin-top:10px;padding-top:10px}.gymd-dh{font-weight:600;font-size:13.5px;margin:6px 0}
.gymd-ta{background:#faf6ff;border-radius:12px;padding:8px 10px;font-size:14px;margin-bottom:8px}.gymd-note{color:#666;font-size:13px;margin-top:4px;line-height:1.6}.gymd-re{font-style:normal;font-size:12px;color:#9a7bd0;cursor:pointer}
.gymd-moods{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.gymd-moods span{padding:4px 9px;border-radius:999px;background:#f2f2f4;font-size:12.5px;cursor:pointer}.gymd-moods span.on{background:var(--mc);color:#fff}
#gyMdNote,.gymd-f textarea,.gymd-f input{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:12px;padding:8px 10px;font-family:inherit;font-size:14px}
.gymd-f{display:block;margin:10px 0}.gymd-f span{display:block;font-size:12.5px;color:#888;margin-bottom:4px}.gymd-ck{display:block;margin:8px 0;cursor:pointer}
.gymd-btn{padding:8px 14px;border-radius:12px;border:none;background:#111;color:#fff;cursor:pointer;font-family:inherit;font-size:13.5px}.gymd-lite{padding:8px 14px;border-radius:12px;border:none;background:#f2f2f4;cursor:pointer;font-family:inherit;font-size:13.5px}
.gymd-nums{display:flex;gap:8px;margin:8px 0;flex-wrap:wrap}.gymd-nums div{flex:1;min-width:80px;background:#f7f7f9;border-radius:12px;padding:10px;text-align:center;font-size:12px;color:#888}.gymd-nums b{display:block;font-size:22px;color:#111}
.gymd-hrs{display:flex;align-items:flex-end;gap:2px;height:52px;margin-top:6px}.gymd-hrs i{flex:1;background:#d7e9fb;border-radius:3px 3px 0 0}.gymd-hrs i.pk{background:#1d9bf0}
.gymd-hl{display:flex;justify-content:space-between;font-size:10.5px;color:#aaa;margin-bottom:6px}
.gymd-two{display:flex;gap:12px}.gymd-two>div{flex:1}.gymd-two ol{padding-left:18px;margin:4px 0;font-size:13px;line-height:1.8}.gymd-two em{color:#999;font-style:normal}
.gymd-cloud{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;justify-content:center;padding:10px;background:#fafafa;border-radius:14px;min-height:80px;line-height:1.2}
#gyIntro{position:fixed;inset:0;z-index:200000;background:radial-gradient(ellipse at 50% 30%,#2b2f4a,#0d0f1a 70%);color:#fff;display:flex;align-items:center;justify-content:center;transition:opacity .6s;cursor:pointer}
#gyIntro.out{opacity:0}#gyIntro .gi-stars i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 6px #fff;animation:giTw 2.4s infinite ease-in-out}
@keyframes giTw{0%,100%{opacity:.15}50%{opacity:1}}#gyIntro .gi-c{position:relative;text-align:center;padding:0 24px}
#gyIntro .gi-t{font-size:clamp(34px,9vw,64px);letter-spacing:.12em;font-family:"Noto Serif SC",serif;animation:giIn 1.1s cubic-bezier(.34,1.56,.64,1) both;text-shadow:0 0 18px rgba(170,190,255,.55)}
#gyIntro .gi-s{margin-top:14px;font-size:15px;letter-spacing:.12em;opacity:.85;min-height:1.4em}
#gyIntro .gi-bar{margin:26px auto 0;width:140px;height:2px;background:rgba(255,255,255,.15);border-radius:2px;overflow:hidden}#gyIntro .gi-bar b{display:block;height:100%;width:0;background:linear-gradient(90deg,#9fb4ff,#ffc4e1);animation:giBar 2.4s ease forwards}
@keyframes giIn{from{opacity:0;transform:translateY(16px) scale(.92);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}@keyframes giBar{to{width:100%}}
.gw-md{height:100%;display:flex;gap:10px}.gw-md.s{flex-direction:column;align-items:center;justify-content:center;gap:4px}.gw-md.s b{font-size:34px;font-weight:normal}.gw-md em{font-style:normal;font-size:12px;color:var(--pm-sub);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.gw-md.m>div{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0;background:var(--pm-fill);border-radius:14px;padding:8px}.gw-md.m span{font-size:11px;color:var(--pm-sub)}.gw-md.m b{font-size:26px;font-weight:normal}
`;
    function boot() {
        if (!document.getElementById('gyMdCss')) { const st = document.createElement('style'); st.id = 'gyMdCss'; st.textContent = CSS; document.head.appendChild(st); }
        hooks();
        ready.then(() => { hooks(); intro(); });
        setInterval(hooks, 2500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
