/* ---- 📱 软件合集的公用层（微博、泡泡、豆瓣、小红书、iMessage 共用；谁先加载谁建好） ----
   · 人：你（'me'）、角色（'c:id'）、NPC 列表里的人（'n:id'）、各软件自己的账号（bot / 小号 / 路人，'x:...'）
   · 同一个人在不同软件里是不同的主页（昵称、头像、简介、粉丝数都可以不一样，像真人一样），
     主页上可以挂「我在别的软件的账号」。头像 / 背景能换能裁剪，文字都能改。
   · 整页的 App 外壳：每个软件一个全屏的壳，里面一页一页往里推（‹ 返回）。 */
if (!window.GYS) (function () {
    const S = {};
    const store = X.store('soft');
    let D = { prof: {}, seq: 1 };   // prof[app][who] = 主页
    let ready = false; const waits = [];
    (async () => { D = Object.assign(D, await store.get('d', {})); D.prof = D.prof || {}; ready = true; waits.splice(0).forEach(f => f()); })();
    // 277：软件内置进本体以后，js/61 比角色 / 聊天记录加载得早——等谷雨启动完（__guyuBooted）再算「准备好」，跟以前当插件时一样
    const booted = new Promise(r => { const t = () => (window.__guyuBooted ? r() : setTimeout(t, 200)); t(); });
    S.ready = () => (ready ? Promise.resolve() : new Promise(r => waits.push(r))).then(() => booted);
    let saveT = null;
    S.save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set('d', D), 300); };
    S.saveNow = () => store.set('d', D);
    S.APPS = { wechat: { n: '微信', ico: '💚', feat: 'gysWechat' }, imsg: { n: 'iMessage', ico: '💬', feat: 'gysImsg' }, weibo: { n: '微博', ico: '🧣', feat: 'gysWeibo' }, bubble: { n: '泡泡', ico: '🫧', feat: 'gysBubble' }, red: { n: '小红书', ico: '📕', feat: 'gysRed' }, douban: { n: '豆瓣', ico: '🫘', feat: 'gysDouban' }, music: { n: '网易云音乐', ico: '🎵', feat: 'gysMusic' }, douyin: { n: '抖音', ico: '🎶', feat: 'gysDouyin' } };
    S.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    S.uid = p => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    S.pick = a => a[Math.floor(Math.random() * a.length)];
    S.rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    S.fmtN = n => { n = Number(n) || 0; if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '亿'; if (n >= 1e4) return (n / 1e4).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + '万'; return String(n); };
    S.ago = t => {
        const d = Date.now() - t; if (d < 60e3) return '刚刚'; if (d < 3600e3) return Math.floor(d / 60e3) + '分钟前'; if (d < 86400e3) return Math.floor(d / 3600e3) + '小时前';
        const a = new Date(t), n = new Date(); if (d < 2 * 86400e3 && a.getDate() !== n.getDate()) return '昨天 ' + String(a.getHours()).padStart(2, '0') + ':' + String(a.getMinutes()).padStart(2, '0');
        return (a.getFullYear() === n.getFullYear() ? '' : a.getFullYear() + '-') + (a.getMonth() + 1) + '-' + a.getDate();
    };
    S.hm = t => { const a = new Date(t); return String(a.getHours()).padStart(2, '0') + ':' + String(a.getMinutes()).padStart(2, '0'); };

    /* ---------- 人 ---------- */
    const chars = () => (typeof myCharacters !== 'undefined' ? myCharacters : []);
    const npcs = () => (typeof window.gyNpcAll === 'function' ? window.gyNpcAll() : []).filter(n => n.on !== false);
    S.chars = chars; S.npcs = npcs;
    S.meName = () => (typeof currentUser !== 'undefined' && currentUser && currentUser.name) || '我';
    // 这个人原本是谁（不管在哪个软件）
    S.base = who => {
        who = String(who || '');
        if (who === 'me') { const u = (typeof currentUser !== 'undefined' && currentUser) || {}; return { who, kind: 'me', name: u.name || '我', avatarImg: u.avatarImg || '', emoji: u.avatarEmoji || '我', persona: u.persona || u.bio || '', color: u.themeColor || '#1d9bf0', obj: u }; }
        if (who.startsWith('c:')) { const c = chars().find(x => String(x.id) === who.slice(2)); return c ? { who, kind: 'char', name: c.name, avatarImg: c.avatarImg || '', emoji: c.avatarEmoji || c.name[0], persona: c.persona || '', color: c.themeColor || '#1d9bf0', obj: c, loc: c.location || '' } : null; }
        if (who.startsWith('n:')) { const n = (typeof window.gyNpcById === 'function' && window.gyNpcById(who.slice(2))) || null; return n ? { who, kind: 'npc', name: n.name, avatarImg: n.avatarImg || '', emoji: n.ico || '👤', persona: [n.who, n.persona, n.tie].filter(Boolean).join('；'), color: '#8b98a5', obj: n, tone: n.tone || '' } : null; }
        return null;   // 软件自己的账号（bot、小号、路人）由各软件管
    };
    S.whoOfChar = c => 'c:' + (c && c.id != null ? c.id : c);
    S.charOf = who => { const b = S.base(who); return b && b.kind === 'char' ? b.obj : null; };
    // 能出现在这个软件里的人：你、角色、NPC（开着的）
    S.people = () => ['me'].concat(chars().map(c => 'c:' + c.id), npcs().map(n => 'n:' + n.id));

    /* ---------- 每个软件里的主页 ---------- */
    // p = { who, nick, handle, avatar, bg, bio, gender, loc, verify:{t:'', text:''}, vip, followers, following, likes, links:{app: handle}, showLinks, tags:[], gen }
    S.prof = (app, who, def) => {
        const A = D.prof[app] = D.prof[app] || {};
        if (A[who]) return A[who];
        const b = S.base(who);
        const p = Object.assign({ who, nick: b ? b.name : '用户' + S.rnd(1000, 9999), handle: '', avatar: '', bg: '', bio: '', gender: '', loc: '', verify: { t: '', text: '' }, vip: 0, followers: b && b.kind === 'char' ? S.rnd(800, 30000) : b && b.kind === 'npc' ? S.rnd(50, 3000) : S.rnd(30, 400), following: S.rnd(40, 600), likes: 0, links: {}, showLinks: true, tags: [], gen: false, at: Date.now() }, def || {});
        A[who] = p; S.save();
        return p;
    };
    S.hasProf = (app, who) => !!(D.prof[app] && D.prof[app][who]);
    S.profs = app => Object.values(D.prof[app] || {});
    S.setProf = (app, who, patch) => { const p = S.prof(app, who); Object.assign(p, patch || {}); S.save(); return p; };
    S.delProf = (app, who) => { if (D.prof[app]) delete D.prof[app][who]; S.save(); };
    S.nick = (app, who) => { const p = S.prof(app, who); return p.nick || (S.base(who) || {}).name || '用户'; };
    // 头像：主页自己换过就用主页的；没换过跟着本人（角色 / NPC 的头像）
    S.avSrc = (app, who) => { const p = S.prof(app, who); if (p.avatar) return p.avatar; const b = S.base(who); return b ? b.avatarImg || '' : ''; };
    S.av = (app, who, size, cls) => {
        const src = S.avSrc(app, who), p = S.prof(app, who), b = S.base(who);
        const sz = size || 40;
        if (src) return `<span class="gys-av ${cls || ''}" style="width:${sz}px;height:${sz}px;background-image:url('${src}')"></span>`;
        const t = (p.emoji || (b && b.emoji) || String(p.nick || '?')[0]);
        return `<span class="gys-av e ${cls || ''}" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz * 0.45)}px;background:${(b && b.color) || p.color || '#c7c7cc'}">${S.esc(t)}</span>`;
    };
    // 别的软件里的账号（挂在主页上）
    S.linksOf = (app, who) => {
        const p = S.prof(app, who); if (p.showLinks === false) return [];
        const out = [];
        Object.keys(S.APPS).forEach(k => { if (k === app) return; const h = (p.links || {})[k] || (S.hasProf(k, who) && S.prof(k, who).linkOut ? S.prof(k, who).handle || S.prof(k, who).nick : ''); if (h) out.push([k, h]); });
        return out;
    };
    // 让模型给一批人写这个软件里的主页（活人感：昵称、签名、认证、粉丝量级都按人设来，可以跟别的软件不一样）
    S.genProfiles = async (app, whos, style) => {
        whos = whos.filter(w => S.base(w) && !S.prof(app, w).gen).slice(0, 8);
        if (!whos.length || X.bailu()) return 0;
        const others = w => Object.keys(S.APPS).filter(k => k !== app && S.hasProf(k, w)).map(k => `${S.APPS[k].n}昵称「${S.prof(k, w).nick}」`).join('，');
        const list = whos.map((w, i) => { const b = S.base(w); return `${i}. ${b.kind === 'me' ? '（用户本人）' : b.kind === 'char' ? '（主要角色）' : '（配角）'}${b.name}：${String(b.persona).slice(0, 260)}${others(w) ? '｜已有：' + others(w) : ''}`; }).join('\n');
        const o = X.json(await X.ask(`下面这些人都在用「${S.APPS[app].n}」。请按每个人的性格、身份、年龄感，替 TA 写这个软件里的个人主页——要像真人在用：
- 昵称不一定是真名（可以是网名、谐音梗、英文、表情、跟别的软件不一样）
- 简介按 TA 的性格写，可以很短、很敷衍、很中二、挂别的软件的账号、写工作室联系方式……
- 认证：明星 / 博主 / 机构才有，普通人没有
- 粉丝数按身份给，普通人几十到几百
${style || ''}
${list}
只输出 JSON 数组，顺序对应：[{"nick":"昵称","handle":"英文或数字的账号id","bio":"简介","verify":"认证文字（没有就空）","vt":"yellow|blue|gold|空","followers":数字,"following":数字,"gender":"男|女|空","loc":"IP属地省份","tags":["标签"],"link":"挂在简介里的别的软件账号（没有就空）"}]`));
        if (!Array.isArray(o)) return 0;
        let n = 0;
        o.forEach((x, i) => { const w = whos[i]; if (!w || !x) return; const p = S.prof(app, w); Object.assign(p, { nick: X.plain(x.nick || p.nick).slice(0, 20) || p.nick, handle: String(x.handle || '').replace(/[^\w.-]/g, '').slice(0, 20), bio: X.plain(x.bio || '').slice(0, 80), verify: { t: /yellow|blue|gold/.test(x.vt) && x.verify ? x.vt : '', text: X.plain(x.verify || '').slice(0, 30) }, followers: Math.max(0, Number(x.followers) || p.followers), following: Math.max(0, Number(x.following) || p.following), gender: x.gender === '男' || x.gender === '女' ? x.gender : '', loc: X.plain(x.loc || '').slice(0, 8), tags: Array.isArray(x.tags) ? x.tags.slice(0, 4).map(t => X.plain(t).slice(0, 8)) : [], gen: true }); if (x.link) p.bio = p.bio || X.plain(x.link); n++; });
        S.save(); return n;
    };

    /* ---------- 图片：选图 → 裁剪 ---------- */
    S.pickImg = (aspect, cb) => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; if (typeof handleImageCrop === 'function') handleImageCrop(f, aspect || 1, cb); else { const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(f); } };
        inp.click();
    };
    S.pickImgs = (max, cb) => {   // 发微博的配图：不裁剪，缩到 1080 宽
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
        inp.onchange = async () => {
            const fs = Array.from(inp.files || []).slice(0, max || 9), out = [];
            for (const f of fs) out.push(await new Promise(res => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1080 / im.width); const cv = document.createElement('canvas'); cv.width = im.width * k; cv.height = im.height * k; cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', 0.82)); }; im.onerror = () => res(null); im.src = r.result; }; r.readAsDataURL(f); }));
            cb(out.filter(Boolean));
        };
        inp.click();
    };

    /* ---------- 整页 App 外壳 ---------- */
    // 一个软件一个壳：S.app(appKey, {theme, tabs:[[key,ico,name]], tab: fn(key)->html, onTab})
    const SHELL = {};
    S.app = (key, def) => { SHELL[key] = Object.assign({ stack: [], tab: def.tabs ? def.tabs[0][0] : null }, def); };
    function root(key) {
        let r = document.getElementById('gys_' + key);
        if (!r) { const bd = document.createElement('div'); bd.id = 'gysbd_' + key; bd.className = 'gys-bd'; bd.onclick = () => S.close(key); document.body.appendChild(bd); r = document.createElement('div'); r.id = 'gys_' + key; r.className = 'gys-root gys-' + key; r.setAttribute('data-gy-overlay', '1'); r.setAttribute('data-gy-nopage', '1'); document.body.appendChild(r); }
        return r;
    }
    const bodyFlag = () => document.body.classList.toggle('gys-on', !!document.querySelector('.gys-root.on'));
    S.open = (key, tab) => { const A = SHELL[key]; if (!A) return; A.stack.splice(0).reverse().forEach(leave); if (tab) A.tab = tab; document.querySelectorAll('.gys-root.on').forEach(x => { x.style.zIndex = ''; }); root(key).style.zIndex = '2701'; root(key).classList.add('on'); bodyFlag(); S.paint(key); S.lockShow(key); if (A.onOpen) try { A.onOpen(); } catch (e) {} };
    S.close = key => { const A0 = SHELL[key]; if (A0) A0.stack.slice().reverse().forEach(leave); const r = document.getElementById('gys_' + key); if (r) r.classList.remove('on'); const bd = document.getElementById('gysbd_' + key); if (bd) bd.classList.remove('on'); bodyFlag(); };
    // 系统返回键 / 左滑返回（js/73 会把最上面的浮层整个拿掉）：里面还有页面就只退一页，退到底才真的关
    try {
        new MutationObserver(ms => ms.forEach(m => m.removedNodes.forEach(n => {
            if (!n.classList || !n.classList.contains('gys-root') || !n.classList.contains('on')) return;
            const key = n.id.replace(/^gys_/, ''), A = SHELL[key];
            if (A && A.stack.length) { document.body.appendChild(n); S.back(key); }
            else { n.classList.remove('on'); bodyFlag(); }
        }))).observe(document.body, { childList: true });
    } catch (e) {}
    S.isOpen = key => { const r = document.getElementById('gys_' + key); return !!(r && r.classList.contains('on')); };
    // 往里推一页：view = {title, html: fn|str, right: html, cls, back}
    S.push = (key, view) => { const A = SHELL[key]; A.stack.push(view); S.__anim = key; S.paint(key); const b = root(key).querySelector('.gys-body'); if (b) b.scrollTop = 0; };
    S.replace = (key, view) => { const A = SHELL[key]; if (A.stack.length) A.stack[A.stack.length - 1] = view; else A.stack.push(view); S.paint(key); };
    const leave = v => { if (v && typeof v.onLeave === 'function' && !v.__left) { v.__left = 1; try { v.onLeave(); } catch (e) {} } };   // 页面被退掉时（草稿箱用）
    S.__leave = leave;
    S.back = key => { const A = SHELL[key]; if (A.stack.length) { leave(A.stack.pop()); S.__anim = key + '<'; S.paint(key); } else S.close(key); };
    S.tab = (key, t) => { const A = SHELL[key]; A.tab = t; A.stack.splice(0).reverse().forEach(leave); S.paint(key); const b = root(key).querySelector('.gys-body'); if (b) b.scrollTop = 0; };
    S.top = key => { const A = SHELL[key]; return A && A.stack.length ? A.stack[A.stack.length - 1] : null; };
    S.paint = key => {
        const A = SHELL[key]; if (!A) return; const r = root(key); if (!r.classList.contains('on')) return;
        const v = A.stack[A.stack.length - 1];
        const keepScroll = r.querySelector('.gys-body'); const st = keepScroll && r.__last === (v ? v.id || v.title : A.tab) ? keepScroll.scrollTop : 0;
        let head, body, foot = '';
        if (v) {
            head = `<div class="gys-hd"><span class="gys-bk" onclick="GYS.back('${key}')">${S.ic('back', 22)}</span><b>${v.title || ''}</b><span class="gys-hr">${v.right || ''}</span></div>`;
            body = typeof v.html === 'function' ? v.html() : v.html;
            if (v.foot) foot = typeof v.foot === 'function' ? v.foot() : v.foot;
        } else {
            head = A.head ? A.head(A.tab) : `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('${key}')">${S.ic('back', 22)}</span><b>${S.APPS[key] ? S.APPS[key].n : key}</b></div>`;
            body = A.render(A.tab);
            if (A.tabs) foot = `<div class="gys-tabs">${A.tabs.map(([k, ico, n, badge]) => `<span class="gys-tb${A.tab === k ? ' on' : ''}" onclick="GYS.tab('${key}','${k}')"><i>${String(ico).startsWith('i:') ? S.ic(ico.slice(2), 25, A.tab === k && ico !== 'i:plus') : ico}</i><em>${n}</em>${badge && badge() ? `<sup>${badge()}</sup>` : ''}</span>`).join('')}</div>`;
        }
        r.classList.toggle('framed', S.framed()); r.classList.toggle('sbon', S.sbOn());
        const bd = document.getElementById('gysbd_' + key); if (bd) bd.classList.toggle('on', S.framed());
        r.innerHTML = (S.sbOn() ? S.sbHtml() : '') + head + `<div class="gys-body${v && v.cls ? ' ' + v.cls : ''}${S.__anim === key && S.ui.anim ? ' gys-pushin' : S.__anim === key + '<' && S.ui.anim ? ' gys-popin' : ''}">${body}</div>` + foot + (S.framed() ? '<i class="gys-homebar"></i>' : '');
        S.__anim = null; swipe(r, key);
        const nb = r.querySelector('.gys-body'); if (nb && st) nb.scrollTop = st;
        r.__last = v ? v.id || v.title : A.tab;
        if (v && v.after) try { v.after(r); } catch (e) {} else if (!v && A.after) try { A.after(r); } catch (e) {}
    };
    S.repaint = key => { if (S.isOpen(key)) S.paint(key); };

    /* ---------- 改主页（每个软件通用） ---------- */
    // fields：额外的字段 [[键, 名字, 占位, 多行?]]
    S.editProf = (app, who, fields, done) => {
        const p = S.prof(app, who), V = { avatar: p.avatar, bg: p.bg };
        const f = (k, label, ph, v, area) => `<label class="gys-f"><span>${label}</span>${area ? `<textarea id="gysE_${k}" rows="3" placeholder="${S.esc(ph)}">${S.esc(v || '')}</textarea>` : `<input id="gysE_${k}" placeholder="${S.esc(ph)}" value="${S.esc(v || '')}">`}</label>`;
        const draw = () => `
          <div class="gys-ecover" style="${V.bg ? `background-image:url('${V.bg}')` : ''}" onclick="GYS.__ePick('bg')"><span>🖼️ ${V.bg ? '换背景' : '加背景'}（能裁剪）</span></div>
          <div class="gys-eav" onclick="GYS.__ePick('avatar')">${V.avatar ? `<span class="gys-av" style="width:80px;height:80px;background-image:url('${V.avatar}')"></span>` : S.av(app, who, 80)}<i>📷</i></div>
          <div class="gys-eops">${V.avatar ? '<span onclick="GYS.__eClr(\'avatar\')">头像用回本人的</span>' : ''}${V.bg ? '<span onclick="GYS.__eClr(\'bg\')">去掉背景</span>' : ''}</div>
          ${f('nick', '昵称', '在这个软件里叫什么', p.nick)}
          ${f('handle', '账号 ID', '英文或数字', p.handle)}
          ${f('bio', '简介', '一句话介绍自己', p.bio, true)}
          ${f('loc', 'IP 属地 / 所在地', '比如：上海', p.loc)}
          ${f('gender', '性别', '男 / 女 / 不填', p.gender)}
          <div class="gys-2">${f('followers', '粉丝数', '数字', p.followers)}${f('following', '关注数', '数字', p.following)}</div>
          <div class="gys-2">${f('verify', '认证文字', '比如：知名美食博主（没有就空）', p.verify && p.verify.text)}
            <label class="gys-f"><span>认证颜色</span><select id="gysE_vt">${[['', '没有'], ['yellow', '黄 V（个人）'], ['blue', '蓝 V（机构）'], ['gold', '金 V（大 V）']].map(([v, n]) => `<option value="${v}" ${(p.verify && p.verify.t) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
          ${(fields || []).map(([k, l, ph, area]) => f(k, l, ph, p[k], area)).join('')}
          <div class="gys-f"><span>挂在主页上的别的软件账号</span>
            ${Object.keys(S.APPS).filter(k => k !== app).map(k => `<label class="gys-link"><b>${S.APPS[k].ico} ${S.APPS[k].n}</b><input id="gysE_link_${k}" placeholder="${S.hasProf(k, who) ? '比如：' + S.esc(S.prof(k, who).nick) : '没有就空'}" value="${S.esc((p.links || {})[k] || '')}"></label>`).join('')}
            <label class="gys-ck"><input type="checkbox" id="gysE_showLinks" ${p.showLinks === false ? '' : 'checked'}> 在主页上显示这些</label></div>
          <div class="gys-acts"><button class="gys-btn" onclick="GYS.__eSave()">保存</button><button class="gys-btn ghost" onclick="GYS.back('${app}')">取消</button></div>`;
        S.__ePick = k => S.pickImg(k === 'bg' ? 2.2 : 1, url => { V[k] = url; S.replace(app, view); });
        S.__eClr = k => { V[k] = ''; S.replace(app, view); };
        S.__eSave = () => {
            const g = k => { const e = document.getElementById('gysE_' + k); return e ? e.value.trim() : ''; };
            const links = {}; Object.keys(S.APPS).forEach(k => { const v = g('link_' + k); if (v) links[k] = v; });
            Object.assign(p, { nick: g('nick') || p.nick, handle: g('handle').replace(/^@/, ''), bio: g('bio'), loc: g('loc'), gender: g('gender'), followers: Math.max(0, parseInt(g('followers')) || 0), following: Math.max(0, parseInt(g('following')) || 0), verify: { t: (document.getElementById('gysE_vt') || {}).value || '', text: g('verify') }, links, showLinks: !!(document.getElementById('gysE_showLinks') || {}).checked, avatar: V.avatar, bg: V.bg, gen: true, edited: Date.now() });
            (fields || []).forEach(([k]) => { p[k] = g(k); });
            S.save(); X.toast(X.v('💾 存好了', '改好了', '好了'), ''); S.back(app); if (done) done(p);
        };
        const view = { title: '编辑资料', html: draw, id: 'edit_' + who };
        S.push(app, view);
    };

    /* ---------- 小工具 ---------- */
    /* ---------- 🍎 苹果外观：状态栏、手机框、灵动岛、Home 条、左滑返回、推页动画、苹果弹窗、通知横幅、锁屏、图标 ---------- */
    const UIK = 'gysUi';
    S.ui = (() => { let o = {}; try { o = JSON.parse(localStorage.getItem(UIK) || '{}') || {}; } catch (e) {} return Object.assign({ sb: 'off', lock: false, banner: true, swipe: true, anim: true }, o); })();
    S.uiSet = (k, v) => { S.ui[k] = v; try { localStorage.setItem(UIK, JSON.stringify(S.ui)); } catch (e) {} document.querySelectorAll('.gys-root.on').forEach(r => { const key = r.id.replace(/^gys_/, ''); S.paint(key); }); };
    const wide = () => window.innerWidth >= 640;
    S.framed = () => false;   // 她说不要手机外壳和灵动岛
    S.sbOn = () => S.ui.sb === 'on';
    const I = {
        back: '<path d="M15 4.5 7.5 12 15 19.5" stroke-width="2.6"/>',
        home: '<path d="M3.5 11 12 4l8.5 7v8.5a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"/>',
        search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
        compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
        mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
        chat: '<path d="M12 4.5c4.7 0 8.5 3 8.5 6.8s-3.8 6.8-8.5 6.8c-.9 0-1.7-.1-2.5-.3L5 19.5l1-3.4C4.5 14.9 3.5 13.2 3.5 11.3 3.5 7.5 7.3 4.5 12 4.5z"/>',
        person: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5"/>',
        people: '<circle cx="9" cy="9" r="3.3"/><path d="M2.8 19.5c.6-3 3-4.6 6.2-4.6s5.6 1.6 6.2 4.6"/><circle cx="16.5" cy="8" r="2.7"/><path d="M16.3 13.3c2.6 0 4.5 1.3 5 3.8"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
        film: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7.5 4.5v15M16.5 4.5v15M3.5 9h4M3.5 15h4M16.5 9h4M16.5 15h4"/>',
        bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
        heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
        star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
        share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M6.5 11H5v9.5h14V11h-1.5"/>',
        more: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
        compose: '<path d="M19 13.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5h5.5"/><path d="M17.5 3.5 20.5 6.5 12 15H9v-3z"/>',
        camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
        gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>',
        book: '<path d="M4 5.5c2.5-1 5.5-1 8 .8 2.5-1.8 5.5-1.8 8-.8V19c-2.5-1-5.5-1-8 .8-2.5-1.8-5.5-1.8-8-.8z"/><path d="M12 6.3v13.5"/>',
        flame: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.8 3.4-5.6 3.8-9.4 2.4 1.5 3 3.7 2.8 5.3 1-.6 1.8-1.8 2-3.2 2 1.6 3.4 4 3.4 6.8 0 3.4-2.4 6.1-6 6.1z"/>',
        bubble: '<circle cx="9" cy="10" r="5"/><circle cx="16.5" cy="15.5" r="3.5"/><circle cx="17" cy="6" r="1.8"/>',
        video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>',
        bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
        note: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
        disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/>',
        roam: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 12l5.5-5.5"/>'
    };
    S.ic = (n, sz, fill) => `<svg class="gys-ic" viewBox="0 0 24 24" width="${sz || 24}" height="${sz || 24}" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[n] || ''}</svg>`;
    const SB_R = '<svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx=".7" fill="currentColor"/><rect x="4.5" y="5" width="3" height="6" rx=".7" fill="currentColor"/><rect x="9" y="2.5" width="3" height="8.5" rx=".7" fill="currentColor"/><rect x="13.5" y="0" width="3" height="11" rx=".7" fill="currentColor"/></svg><svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 2.2c2.3 0 4.4.9 6 2.4l1-1C12.6 1.8 10.2.8 7.5.8S2.4 1.8.5 3.6l1 1c1.6-1.5 3.7-2.4 6-2.4zm0 3c1.5 0 2.8.6 3.8 1.5l1-1C11 4.5 9.3 3.8 7.5 3.8S4 4.5 2.7 5.7l1 1c1-.9 2.3-1.5 3.8-1.5zm0 3c.7 0 1.3.3 1.7.7L7.5 10.6 5.8 8.9c.4-.4 1-.7 1.7-.7z" fill="currentColor"/></svg>';
    function battery() { const lv = S.__bat == null ? 0.82 : S.__bat; return `<span class="gys-bat"><i style="width:${Math.round(lv * 100)}%;${lv < 0.2 ? 'background:#ff3b30' : ''}"></i></span>`; }
    try { if (navigator.getBattery) navigator.getBattery().then(b => { S.__bat = b.level; b.addEventListener('levelchange', () => { S.__bat = b.level; }); }); } catch (e) {}
    S.sbHtml = () => `<div class="gys-sb"><b>${S.hm(Date.now())}</b><span class="gys-sbr">${SB_R}${battery()}</span></div>`;
    setInterval(() => { document.querySelectorAll('.gys-root.on .gys-sb b').forEach(b => { b.textContent = S.hm(Date.now()); }); }, 20e3);
    // 左滑返回（从左边缘往右拖）
    function swipe(r, key) {
        if (r.__sw) return; r.__sw = 1; let x0 = null, y0 = 0, t0 = 0;
        r.addEventListener('touchstart', e => { const t = e.touches[0], L = r.getBoundingClientRect().left; if (!S.ui.swipe || t.clientX - L > 26) { x0 = null; return; } x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
        r.addEventListener('touchmove', e => { if (x0 == null) return; const dx = e.touches[0].clientX - x0; const b = r.querySelector('.gys-body'); if (b && dx > 0 && SHELL[key].stack.length) b.style.transform = `translateX(${Math.min(dx, 300) * 0.6}px)`; }, { passive: true });
        r.addEventListener('touchend', e => { if (x0 == null) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = Math.abs(t.clientY - y0); const b = r.querySelector('.gys-body'); if (b) b.style.transform = ''; if (dx > 70 && dy < 80 && Date.now() - t0 < 900) S.back(key); x0 = null; }, { passive: true });
    }
    S.__swipe = swipe;
    // 苹果样式的弹窗（输入 / 确认）：测试或别处把 appPrompt / appConfirm 换掉了就用换掉的
    const mine = f => typeof f !== 'function' || /gyInPageDialog|nativeUI/.test(String(f));   // 还是谷雨自带的那个（没被别处换掉）
    S.dialog = o => new Promise(res => {
        const d = document.createElement('div'); d.className = 'gys-alert';
        d.innerHTML = `<div class="gys-alert-in"><div class="gys-alert-t">${o.title ? `<b>${S.esc(o.title)}</b>` : ''}${o.text ? `<p>${S.esc(o.text)}</p>` : ''}${o.input ? `<${o.area ? 'textarea rows="4"' : 'input'} class="gys-alert-i" value="${o.area ? '' : S.esc(o.def || '')}">${o.area ? S.esc(o.def || '') + '</textarea>' : ''}` : ''}</div><div class="gys-alert-b">${o.cancel === false ? '' : `<span data-v="0">${S.esc(o.cancel || '取消')}</span>`}<span data-v="1" class="${o.danger ? 'red' : 'b'}">${S.esc(o.ok || '好')}</span></div></div>`;
        const done = v => { d.remove(); res(v); };
        d.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { const i = d.querySelector('.gys-alert-i'); done(b.getAttribute('data-v') === '1' ? (o.input ? i.value : true) : (o.input ? null : false)); });
        document.body.appendChild(d); const i = d.querySelector('.gys-alert-i'); if (i) { setTimeout(() => { i.focus(); i.select && i.select(); }, 30); i.addEventListener('keydown', e => { if (e.key === 'Enter' && !o.area && !e.isComposing) { e.preventDefault(); done(i.value); } }); }
    });
    // 通知横幅（苹果样式，从顶上滑下来）
    S.recent = [];
    S.banner = o => {
        S.recent.unshift(Object.assign({ at: Date.now() }, o)); if (S.recent.length > 40) S.recent.length = 40;
        if (!S.ui.banner || document.hidden) return;
        let box = document.getElementById('gysBanners'); if (!box) { box = document.createElement('div'); box.id = 'gysBanners'; document.body.appendChild(box); }
        const b = document.createElement('div'); b.className = 'gys-bn';
        const ico = S.APPS[o.app] ? S.APPS[o.app].ico : '🔔';
        b.innerHTML = `<span class="gys-bn-ico gys-ai-${o.app || 'x'}">${ico}</span><div><div class="gys-bn-h"><b>${S.esc(o.title || '')}</b><em>现在</em></div><p>${S.esc(o.text || '')}</p></div>`;
        let y0 = null;
        b.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
        b.addEventListener('touchend', e => { if (y0 != null && e.changedTouches[0].clientY - y0 < -25) { b.classList.add('out'); setTimeout(() => b.remove(), 300); } y0 = null; }, { passive: true });
        b.onclick = () => { b.remove(); S.runGo(o.go); };
        box.prepend(b); setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 400); }, 4500);
    };
    S.runGo = go => { try { if (go && go.fn && typeof window[go.fn] === 'function') window[go.fn].apply(null, go.args || []); } catch (e) {} };
    // 各软件发通知统一走这里：谷雨的通知（能跳）+ 苹果横幅（正在看那一页就不弹横幅）
    S.notify = (app, c, html, desc, go) => {
        try { X.notify(c, html, desc, go); } catch (e) {}
        const title = String(html || '').replace(/<[^>]+>/g, '').replace(/^\S+\s/, '').trim();
        const top = S.top(app); if (S.isOpen(app) && top && go && (go.args || []).some(a => a != null && String(top.id || '').indexOf(String(a)) >= 0)) return;
        S.banner({ app, title, text: desc || '', go });
    };
    // 锁屏：进软件前先看一眼（默认关）
    S.lockShow = key => {
        if (!S.ui.lock) return; const n = new Date();
        const L = S.recent.slice(0, 6);
        const d = document.createElement('div'); d.className = 'gys-lock';
        d.innerHTML = `<div class="gys-lock-t"><em>${n.getMonth() + 1}月${n.getDate()}日 星期${'日一二三四五六'[n.getDay()]}</em><b>${S.hm(n)}</b></div><div class="gys-lock-n">${L.map((o, i) => `<div class="gys-bn" data-i="${i}"><span class="gys-bn-ico gys-ai-${o.app}">${S.APPS[o.app] ? S.APPS[o.app].ico : '🔔'}</span><div><div class="gys-bn-h"><b>${S.esc(o.title)}</b><em>${S.ago(o.at)}</em></div><p>${S.esc(o.text || '')}</p></div></div>`).join('') || '<p class="gys-lock-e">没有新通知</p>'}</div><div class="gys-lock-u">上滑或点一下打开<i></i></div>`;
        const go = i => { d.classList.add('out'); setTimeout(() => d.remove(), 350); if (i != null && L[i]) S.runGo(L[i].go); };
        d.onclick = e => { const el = e.target.closest('[data-i]'); go(el ? Number(el.getAttribute('data-i')) : null); };
        let y0 = null; d.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true }); d.addEventListener('touchend', e => { if (y0 != null && e.changedTouches[0].clientY - y0 < -60) go(null); y0 = null; }, { passive: true });
        const r = root(key); r.appendChild(d);
    };
    // 外观设置页
    S.uiPage = key => S.push(key, { title: '🍎 苹果外观', id: 'gysui', html: () => S.uiHtml() });
    S.uiHtml = () => {
        const row = (k, n, d, opts) => `<div class="gys-uirow"><div><b>${n}</b><small>${d}</small></div><select onchange="GYS.uiSet('${k}', this.value==='true'?true:this.value==='false'?false:this.value)">${opts.map(([v, t]) => `<option value="${v}" ${String(S.ui[k]) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
        return `<div class="gys-uip">${row('sb', '顶上的状态栏', '时间、信号、Wi-Fi、电量（手机上本来就有，默认不显示）', [['off', '不要'], ['on', '显示']])}
          ${row('banner', '通知横幅', '有新消息时从顶上滑下来一条（点它直接打开）', [['true', '开'], ['false', '关']])}
          ${row('lock', '锁屏', '打开软件时先看一眼锁屏和最近的通知，上滑进去', [['false', '关'], ['true', '开']])}
          ${row('swipe', '左滑返回', '从屏幕左边缘往右一拖就返回上一页', [['true', '开'], ['false', '关']])}
          ${row('anim', '翻页动画', '进下一页的时候从右边推进来', [['true', '开'], ['false', '关']])}</div>`;
    };
    S.app('ui', { head: () => `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('ui')">${S.ic('back', 22)}</span><b>🍎 软件外观</b></div>`, render: () => `<div class="gys-tip2">微博、泡泡、小红书、豆瓣、iMessage 都按这里来</div>${S.uiHtml()}` });
    try { X.mini({ id: 'gysUi', icon: '🍎', title: '软件外观', desc: '软件里的苹果样子：状态栏、通知横幅、锁屏、左滑返回', cat: '软件', onOpen: () => S.open('ui') }); } catch (e) {}
    S.input = async (title, def) => { if (!mine(window.appPrompt)) return window.appPrompt(title, def || ''); const lines = String(title).split('\n'); return S.dialog({ title: lines[0], text: lines.slice(1).join('\n'), input: true, def: def || '', ok: '好' }); };
    S.confirm = async t => { if (!mine(window.appConfirm)) return window.appConfirm(t); const lines = String(t).split('\n'); return S.dialog({ title: lines[0], text: lines.slice(1).join('\n'), ok: '好' }); };
    S.imgView = src => { const d = document.createElement('div'); d.className = 'gys-imgv'; d.innerHTML = `<img src="${src}">`; d.onclick = () => d.remove(); document.body.appendChild(d); };

    /* ---------- 🔗 软件之间分享（255）：微博 / 小红书 / 豆瓣 的东西 → iMessage 里一张卡片（点了回原帖），或者发到平时聊天 ----------
       card = { app, kind:'微博'|'笔记'|'电影'…, title, text, img, by, byName, at, go:X.go('打开函数', …) } */
    try { X.feat('gysShare', { n: '🔗 软件之间分享', desc: '微博、小红书、豆瓣里看到的能「↗ 分享」到 iMessage（一张能点回原帖的卡片）或平时聊天；TA 刷到有意思的也会转给你。关掉就跟以前一样：小红书只能分享到平时聊天' }); } catch (e) {}
    try { X.feat('gysDraft', { n: '📝 草稿箱', desc: '微博、小红书写到一半退出来会自动存进草稿箱（在「我」页面里找回来接着写）。关掉就跟以前一样：退出就没了' }); } catch (e) {}
    S.draftOn = () => { try { return X.on('gysDraft'); } catch (e) { return true; } };
    S.shareOn = () => { try { return X.on('gysShare'); } catch (e) { return true; } };
    S.cardText = c => { c = c || {}; const A = S.APPS[c.app] || {}; return `${A.n || ''}${c.kind ? '·' + c.kind : ''}：${c.byName ? '@' + c.byName + ' ' : ''}${c.title ? '「' + c.title + '」' : ''}${String(c.text || '').slice(0, 140)}`; };
    S.cardImg = s => (s && String(s).length < 160000 ? String(s) : '');
    S.sheet = (opts, title) => new Promise(res => {
        const d = document.createElement('div'); d.className = 'gys-sheet';
        d.innerHTML = `<div class="gys-sheet-in"><div class="gys-sheet-g">${title ? `<p>${S.esc(title)}</p>` : ''}${opts.map((o, i) => `<div data-i="${i}">${S.esc(o)}</div>`).join('')}</div><div class="gys-sheet-g"><div data-i="-1" class="c">取消</div></div></div>`;
        d.onclick = e => { const el = e.target.closest('[data-i]'); if (!el && e.target !== d) return; d.remove(); const i = el ? el.getAttribute('data-i') : null; res(i == null || i === '-1' ? null : Number(i)); };
        document.body.appendChild(d);
    });
    // 各软件登记「刷得到的东西」，TA 刷手机的时候从这里挑（iMessage 的「转给你」用）
    const FEEDS = {};
    S.feedReg = (app, fn) => { FEEDS[app] = fn; };
    S.feedCards = (n, notBy) => {
        let L = []; Object.keys(FEEDS).forEach(k => { try { if (X.on((S.APPS[k] && S.APPS[k].feat) || 'gysShare')) L = L.concat((FEEDS[k]() || []).filter(Boolean)); } catch (e) {} });
        if (notBy) L = L.filter(c => c.by !== notBy);
        L.sort((a, b) => (b.at || 0) - (a.at || 0));
        return L.slice(0, n || 8);
    };
    const SHARE_OK = [['↗ 分享过去了', ''], ['发过去了', 'TA 会看的'], ['已发送', '等 TA 回你'], ['送达', '']];
    S.share = async card => {
        if (!card) return; const cs = (typeof X.chars === 'function' ? X.chars() : chars()); if (!cs.length) return X.toast('还没有角色', '先去加一个吧');
        const im = S.shareOn() && window.gysIm && typeof window.gysIm.shareIn === 'function' && X.on('gysImsg');
        const wx = S.shareOn() && window.gysWx && typeof window.gysWx.shareIn === 'function' && X.on('gysWechat');
        const ways = (wx ? [['wx', '💚 用微信发给 TA']] : []).concat(im ? [['im', '💬 用 iMessage 发给 TA']] : [], [['chat', '🗨️ 发到平时聊天']], S.shareOn() ? [['copy', '📋 复制内容']] : []);
        const wi = ways.length > 1 ? await S.sheet(ways.map(w => w[1]), '分享到…') : 0; if (wi == null) return;
        const way = ways[wi][0];
        if (way === 'copy') { try { await navigator.clipboard.writeText(S.cardText(card)); X.toast('复制了', ''); } catch (e) { X.toast('复制不了', '这个浏览器不让'); } return; }
        let c = cs[0];
        if (cs.length > 1) { const ci = await S.sheet(cs.map(x => ({ im: '💬 ', wx: '💚 ' }[way] || '🗨️ ') + X.name(x)), '发给谁？'); if (ci == null) return; c = cs[ci]; }
        const A = S.APPS[card.app] || { n: '' };
        if (way === 'im' || way === 'wx') {
            const note = await S.input(`附一句话（可以空着）`, '');
            if (note === null || note === undefined) return;
            (way === 'wx' ? window.gysWx : window.gysIm).shareIn('c:' + c.id, card, String(note || ''), 'me');
        } else {
            X.reach(c, `她从${A.n}分享了一条${card.kind || '内容'}给你：${card.byName ? '@' + card.byName + ' 的' : ''}${card.title ? '「' + card.title + '」' : ''}${String(card.text || '').slice(0, 200)}${card.by === 'me' ? '（是她自己发的）' : card.by === 'c:' + c.id ? '（是你自己发的）' : ''}`);
        }
        const t = X.pick(SHARE_OK); X.toast(t[0], t[1]);
        return true;
    };
    /* ---------- 📱 软件桌面（255）：小功能 → 📱 软件 打开的就是这一页，像手机桌面一样排着图标 ---------- */
    S.badge = {};   // 各软件登记未读数：GYS.badge[app] = () => n
    S.homeApps = () => Object.keys(S.APPS).filter(k => SHELL[k] && (!S.APPS[k].feat || X.on(S.APPS[k].feat)));
    S.homeHtml = () => {
        const L = S.homeApps(), n = new Date();
        const ico = k => { const A = S.APPS[k], b = S.badge[k] ? (() => { try { return S.badge[k]() || 0; } catch (e) { return 0; } })() : 0; return `<div class="gys-hmi" onclick="GYS.open('${k}')"><span class="gys-hmic gys-ai-${k}">${A.ico}${b ? `<sup>${b > 99 ? '99+' : b}</sup>` : ''}</span><em>${S.esc(A.n)}</em></div>`; };
        return `<div class="gys-hm"><div class="gys-hmt"><b>${S.hm(n)}</b><em>${n.getMonth() + 1}月${n.getDate()}日 星期${'日一二三四五六'[n.getDay()]}</em></div>
          <div class="gys-hmg">${L.map(ico).join('')}<div class="gys-hmi" onclick="GYS.open('ui')"><span class="gys-hmic gys-ai-set">⚙️</span><em>外观</em></div></div>
          ${L.length ? '' : '<div class="gys-empty" style="color:#fff">软件都关着<br>设置 → 全部开关 里打开</div>'}</div>`;
    };
    S.app('home', { head: () => `<div class="gys-hd gys-hmhd"><span class="gys-bk" onclick="GYS.close('home')">${S.ic('back', 22)}</span><b>软件</b></div>`, render: () => S.homeHtml() });
    window.gysSoftHome = () => S.open('home');
    setInterval(() => { try { if (S.isOpen('home') && !SHELL.home.stack.length) S.paint('home'); } catch (e) {} }, 30e3);
    /* ---------- 💬 所有聊天软件互通（256）：TA 在每个软件里都记得别的软件里聊过什么；TA 主动找你时去你在的那个 ----------
       各软件登记：GYS.chatReg(app, { lines: c => [{at, t:'她：…'}], lastMe: c => 时间, proactive: async c => true/false }) */
    S.chatApps = {};
    S.chatReg = (app, o) => { S.chatApps[app] = Object.assign(S.chatApps[app] || {}, o); };
    const appOn = k => { const A = S.APPS[k]; try { return !A || !A.feat || X.on(A.feat); } catch (e) { return true; } };
    S.otherChats = (c, except, n) => {
        let L = []; Object.keys(S.chatApps).forEach(k => { const o = S.chatApps[k]; if (k === except || !o.lines || !appOn(k)) return; try { (o.lines(c) || []).forEach(x => L.push({ at: x.at || 0, t: `[${(S.APPS[k] || {}).n || k}] ${x.t}` })); } catch (e) {} });
        L.sort((a, b) => a.at - b.at); return L.slice(-(n || 8)).map(x => x.t).join('\n');
    };
    // 给各软件的提示词用：平时聊天 + 别的软件里最近的
    S.recentAll = (c, except, n) => { const a = X.recent(c, n || 8) || '', b = S.otherChats(c, except, n || 8); const sm = String((c && c.chatSummary) || '').split('\n').filter(l => l.trim()).slice(-4).join('\n'); return [sm ? '（之前聊过的总结，[微信] 这种标的是在哪个软件聊的）\n' + sm : '', a ? '（平时聊天的那个软件）\n' + a : '', b ? '（别的软件里）\n' + b : ''].filter(Boolean).join('\n') || '（最近没怎么聊）'; };
    // 🧠 每个软件里的聊天也做总结（256）：攒够「聊天自动总结」的条数就总结一次，标上是哪个软件，存进角色的「聊天总结」（记忆总览里能看能改），
    //    这样在任何地方聊，TA 都能说「之前在微信上你说……」。各软件登记 all: c => [{at, t}]（全部消息）
    S.sumTick = async () => {
        if (!ready || S.__sumBusy) return; S.__sumBusy = 1;
        try {
            if (typeof isAutoOn === 'function' && !isAutoOn('chatSummary')) return;
            const N = Math.max(6, (typeof chatSummaryInterval !== 'undefined' && +chatSummaryInterval) || 20);
            D.sum = D.sum || {};
            for (const c of chars()) for (const k of Object.keys(S.chatApps)) {
                const o = S.chatApps[k]; if (!o.all || !appOn(k)) continue; let L = []; try { L = o.all(c) || []; } catch (e) {} const key = k + '|' + c.id;
                if (D.sum[key] == null) { D.sum[key] = Math.max(0, L.length - (L.length % N)); S.save(); continue; }   // 第一次：以前的不补总结，从现在开始数
                if (L.length < D.sum[key]) { D.sum[key] = L.length; S.save(); continue; }
                if (L.length - D.sum[key] < N) continue;
                const seg = L.slice(D.sum[key], D.sum[key] + N); D.sum[key] += N; S.save();
                const name = (S.APPS[k] || {}).n || k;
                const t = X.plain(await X.ask(`下面是用户和「${c.name}」在「${name}」上的 ${seg.length} 条聊天（${c.name} 那边写成「你」）。请简要总结关键信息、当前话题和双方的情感状态（100 字以内）。说好了但还没做的事，写成"约好了……（还没发生）"。只输出总结本身。\n${seg.map(x => x.t).join('\n')}`) || '').slice(0, 300);
                if (!t) continue;
                const arr = String(c.chatSummary || '').split('\n').filter(l => l.trim()); arr.push(`[${new Date().toLocaleString()}] [${name}] ${t}`); c.chatSummary = arr.join('\n');
                try { if (typeof saveAllData === 'function') saveAllData(); } catch (e) {}
            }
        } catch (e) {} finally { S.__sumBusy = 0; }
    };
    setInterval(() => S.sumTick(), 90e3); setTimeout(() => S.sumTick(), 20e3);
    // 平时聊天里也知道微博 / 小红书私信里说过的（微信、iMessage、抖音自己有一段）
    try { X.ctx(id => { const c = X.char(id); if (!c) return ''; const L = []; ['weibo', 'red'].forEach(k => { const o = S.chatApps[k]; if (!o || !o.lines || !appOn(k)) return; try { (o.lines(c) || []).slice(-4).forEach(x => L.push(`[${S.APPS[k].n}私信] ${x.t}`)); } catch (e) {} }); return L.length ? '【你们在别的软件私信里最近聊的（你都记得）】\n' + L.join('\n') : ''; }, 'gysShare'); X.inj('gysShare', [['你们在别的软件私信里最近聊的', '微博 / 小红书私信里最近几句', '让 TA 在平时聊天时也记得别的软件私信里说过什么']]); } catch (e) {}
    // 🗨️ TA 主动找你用哪个软件（角色设置里选；自主模式下 TA 自己挑：多半去你最近在的那个）
    S.chatAppOf = c => {
        if (!c) return 'gy'; const pref = c.chatApp || 'gy';
        const ok = k => k === 'gy' || (S.chatApps[k] && S.chatApps[k].proactive && appOn(k));
        const auto = c.actMode === 'auto' || pref === 'auto';
        if (!auto) return ok(pref) ? pref : 'gy';
        const lastGy = (() => { try { const L = (typeof globalChats !== 'undefined' && globalChats[c.id]) || []; const m = L.filter(x => x.sender === 'me' || x.sender === 'user').slice(-1)[0]; return m ? (m.timestamp || 0) : 0; } catch (e) { return 0; } })();
        const cand = [['gy', lastGy]].concat(Object.keys(S.chatApps).filter(ok).map(k => { let t = 0; try { t = S.chatApps[k].lastMe ? S.chatApps[k].lastMe(c) || 0 : 0; } catch (e) {} return [k, t]; }));
        cand.sort((a, b) => b[1] - a[1]);
        if (Math.random() < 0.7 && cand[0][1]) return cand[0][0];
        if (pref !== 'auto' && ok(pref) && Math.random() < 0.6) return pref;
        return S.pick(cand)[0];
    };
    const LASTR = {}; window.gyChatAppName = c => { const k = c && LASTR[c.id]; return k && S.APPS[k] ? S.APPS[k].n : ''; };
    window.gyChatRoute = async c => { try { const k = S.chatAppOf(c); if (c) LASTR[c.id] = k; if (k === 'gy') return false; const o = S.chatApps[k]; return !!(o && o.proactive && await o.proactive(c)); } catch (e) { return false; } };
    window.gyChatApps = () => [['gy', '平时聊天（谷雨）']].concat(Object.keys(S.chatApps).filter(k => S.chatApps[k].proactive && appOn(k)).map(k => [k, (S.APPS[k] || {}).n || k]));
    window.GYS = S;

    X.css('gys-css', `
.gys-root{position:fixed;inset:0;z-index:2700;display:none;flex-direction:column;background:#fff;color:#1f1f1f;font-family:-apple-system,"PingFang SC","Helvetica Neue","Microsoft YaHei",sans-serif;font-size:15px}
.gys-root.on{display:flex}
body.gys-on #fabPost{display:none!important}
body.dark-theme .gys-root{background:#111;color:#eee}
.gys-hd{flex-shrink:0;display:flex;align-items:center;gap:8px;padding:10px 12px;padding-top:calc(10px + env(safe-area-inset-top,0px));border-bottom:.5px solid rgba(0,0,0,.08);background:inherit;position:relative;min-height:44px;box-sizing:border-box}
.gys-hd>b{position:absolute;left:50%;transform:translateX(-50%);font-size:17px;font-weight:600;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gys-bk{font-size:28px;line-height:20px;cursor:pointer;padding:0 6px;color:inherit;z-index:1}
.gys-hr{margin-left:auto;display:flex;gap:12px;align-items:center;z-index:1}
.gys-hr span{cursor:pointer}
.gys-body{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.gys-tabs{flex-shrink:0;display:flex;border-top:.5px solid rgba(0,0,0,.1);padding-bottom:env(safe-area-inset-bottom,0px);background:inherit}
.gys-tb{flex:1;display:flex;flex-direction:column;align-items:center;padding:6px 0 4px;cursor:pointer;color:#8e8e93;position:relative;font-size:11px}
.gys-tb i{font-style:normal;font-size:22px;line-height:26px}.gys-tb em{font-style:normal}
.gys-tb.on{color:var(--gys-accent,#1f1f1f);font-weight:600}
.gys-tb sup{position:absolute;top:2px;left:55%;background:#ff3b30;color:#fff;font-size:10px;border-radius:999px;padding:0 5px;min-width:8px;text-align:center}
.gys-av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background-size:cover;background-position:center;flex-shrink:0;color:#fff;vertical-align:middle}
.gys-f{display:flex;flex-direction:column;gap:4px;margin:10px 16px;font-size:13px}
.gys-f>span{color:#8e8e93}
.gys-f input,.gys-f textarea,.gys-f select{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid rgba(0,0,0,.12);border-radius:10px;background:transparent;color:inherit;font-size:15px;font-family:inherit}
.gys-2{display:grid;grid-template-columns:1fr 1fr}
.gys-2 .gys-f{margin-right:8px}
.gys-acts{display:flex;gap:10px;flex-wrap:wrap;padding:12px 16px 30px}
.gys-btn{border:none;background:var(--gys-accent,#ff8200);color:#fff;border-radius:999px;padding:9px 20px;font-size:15px;cursor:pointer;font-family:inherit}
.gys-btn.ghost{background:transparent;color:var(--gys-accent,#ff8200);border:1px solid var(--gys-accent,#ff8200)}
.gys-btn.sm{padding:4px 12px;font-size:13px}
.gys-btn[disabled]{opacity:.5}
.gys-ck{display:inline-flex;align-items:center;gap:6px;font-size:14px;margin-top:4px}
.gys-link{display:flex;align-items:center;gap:8px;margin:4px 0}.gys-link b{width:96px;font-weight:500;font-size:13px;flex-shrink:0}
.gys-ecover{height:130px;background:#e5e5ea center/cover no-repeat;display:flex;align-items:flex-end;justify-content:flex-end;padding:8px;box-sizing:border-box;cursor:pointer}
.gys-ecover span{background:rgba(0,0,0,.45);color:#fff;font-size:12px;border-radius:999px;padding:3px 10px}
.gys-eav{position:relative;margin:-40px 0 0 16px;width:84px;cursor:pointer;border:3px solid #fff;border-radius:50%}
.gys-eav i{position:absolute;right:-2px;bottom:-2px;font-style:normal;background:#fff;border-radius:50%;font-size:14px;padding:2px}
.gys-eops{margin:6px 16px;font-size:12.5px;color:#576b95;display:flex;gap:14px}.gys-eops span{cursor:pointer}
.gys-imgv{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center}.gys-imgv img{max-width:100%;max-height:100%}
.gys-empty{text-align:center;color:#8e8e93;padding:40px 20px;font-size:14px;line-height:1.8}
.gys-busy{text-align:center;color:#8e8e93;padding:14px;font-size:13px}

.gys-root{font-family:-apple-system,"SF Pro Text","SF Pro Display","PingFang SC","Helvetica Neue","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
.gys-ic{display:block}
.gys-bk{display:flex;align-items:center;font-size:0;color:var(--gys-accent,#007aff)}
.gys-tb i{display:flex;align-items:center;justify-content:center;height:28px}
.gys-tabs{background:rgba(249,249,249,.92)!important;backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px)}
body.dark-theme .gys-tabs{background:rgba(22,22,22,.9)!important}
.gys-sb{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;height:44px;padding:0 26px 0 32px;padding-top:env(safe-area-inset-top,0px);font-size:15.5px;position:relative;z-index:3;background:inherit}
.gys-root.framed .gys-sb{height:50px;padding-top:6px}
.gys-sb b{font-weight:600;letter-spacing:.2px}
.gys-sbr{display:flex;align-items:center;gap:6px}
.gys-island{position:absolute;left:50%;top:11px;transform:translateX(-50%);width:120px;height:34px;border-radius:20px;background:#000}
.gys-bat{display:inline-block;width:24px;height:12px;border:1.2px solid currentColor;border-radius:4px;opacity:.95;position:relative;padding:1px;box-sizing:border-box}.gys-bat::after{content:"";position:absolute;right:-3.5px;top:3.5px;width:1.8px;height:4px;border-radius:0 1px 1px 0;background:currentColor;opacity:.5}.gys-bat i{display:block;height:100%;border-radius:2px;background:currentColor}
.gys-root.sbon .gys-hd{padding-top:10px}
.gys-root.framed{inset:auto;left:50%;top:50%;transform:translate(-50%,-50%);width:393px;height:min(852px,calc(100vh - 28px));border-radius:54px;overflow:hidden;box-shadow:0 0 0 11px #1c1c1e,0 0 0 13px #48484a,0 30px 90px rgba(0,0,0,.55)}
.gys-bd{position:fixed;inset:0;z-index:2699;background:radial-gradient(circle at 30% 20%,rgba(120,120,160,.55),rgba(10,10,20,.82));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:none}.gys-bd.on{display:block}
.gys-homebar{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);width:134px;height:5px;border-radius:3px;background:#000;opacity:.85;z-index:5;pointer-events:none}body.dark-theme .gys-homebar{background:#fff}
.gys-root.framed>.gys-body~div{padding-bottom:24px!important}
.gys-pushin{animation:gysIn .32s cubic-bezier(.2,.8,.2,1)}@keyframes gysIn{from{transform:translateX(38%);opacity:.4}to{transform:none;opacity:1}}
.gys-popin{animation:gysPop .28s cubic-bezier(.2,.8,.2,1)}@keyframes gysPop{from{transform:translateX(-22%);opacity:.5}to{transform:none;opacity:1}}
.gys-alert{position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;animation:gysFade .15s}
@keyframes gysFade{from{opacity:0}}
.gys-alert-in{width:270px;background:rgba(242,242,247,.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:14px;overflow:hidden;text-align:center;color:#000;animation:gysZoom .2s;font-family:-apple-system,"PingFang SC",sans-serif}
@keyframes gysZoom{from{transform:scale(1.15);opacity:0}}
body.dark-theme .gys-alert-in{background:rgba(44,44,46,.96);color:#fff}
.gys-alert-t{padding:18px 16px 14px}.gys-alert-t b{font-size:17px;font-weight:600;display:block}.gys-alert-t p{font-size:13px;margin:4px 0 0;line-height:1.4;white-space:pre-wrap}
.gys-alert-i{width:100%;box-sizing:border-box;margin-top:12px;border:.5px solid #c6c6c8;border-radius:7px;padding:6px 8px;font-size:14px;background:#fff;color:#000;outline:none;font-family:inherit}body.dark-theme .gys-alert-i{background:#1c1c1e;color:#fff;border-color:#48484a}
.gys-alert-b{display:flex;border-top:.5px solid rgba(60,60,67,.3)}.gys-alert-b span{flex:1;padding:11px;font-size:17px;color:#007aff;cursor:pointer}.gys-alert-b span+span{border-left:.5px solid rgba(60,60,67,.3)}.gys-alert-b span.b{font-weight:600}.gys-alert-b span.red{color:#ff3b30;font-weight:600}
#gysBanners{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);width:min(380px,calc(100% - 16px));z-index:100001;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.gys-bn{display:flex;gap:10px;align-items:flex-start;background:rgba(245,245,247,.86);backdrop-filter:saturate(180%) blur(24px);-webkit-backdrop-filter:saturate(180%) blur(24px);border-radius:22px;padding:11px 13px;box-shadow:0 8px 30px rgba(0,0,0,.18);pointer-events:auto;cursor:pointer;color:#000;animation:gysBnIn .45s cubic-bezier(.2,1.2,.4,1);transition:transform .3s,opacity .3s;font-family:-apple-system,"PingFang SC",sans-serif}
body.dark-theme .gys-bn{background:rgba(40,40,42,.86);color:#fff}
.gys-bn.out{transform:translateY(-120%);opacity:0}
@keyframes gysBnIn{from{transform:translateY(-120%);opacity:0}}
.gys-bn>div{flex:1;min-width:0}.gys-bn-h{display:flex;justify-content:space-between;gap:8px}.gys-bn-h b{font-size:14.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gys-bn-h em{font-style:normal;font-size:12.5px;opacity:.55;white-space:nowrap}.gys-bn p{margin:1px 0 0;font-size:14.5px;line-height:1.3;max-height:2.6em;overflow:hidden}
.gys-bn-ico{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0;background:linear-gradient(#8e8e93,#636366)}
.gys-ai-weibo{background:linear-gradient(135deg,#ffb15c,#ff8200 50%,#e6162d)}.gys-ai-bubble{background:linear-gradient(135deg,#c4b5fd,#7c3aed)}.gys-ai-red{background:#ff2442}.gys-ai-douban{background:linear-gradient(#3fb150,#2e963d)}.gys-ai-imsg{background:linear-gradient(#65e36f,#2ec83f)}.gys-ai-music{background:linear-gradient(135deg,#ff5a5a,#d81e1e)}.gys-ai-wechat{background:linear-gradient(#3ee06b,#07c160)}.gys-ai-douyin{background:#111;box-shadow:-2px 0 0 #25f4ee inset,2px 0 0 #fe2c55 inset}
.gys-lock{position:absolute;inset:0;z-index:20;background:linear-gradient(160deg,#3a4a8c,#7a5aa8 45%,#d98f8f);color:#fff;display:flex;flex-direction:column;padding:70px 14px 30px;box-sizing:border-box;transition:transform .35s,opacity .35s;cursor:pointer}
.gys-lock.out{transform:translateY(-100%);opacity:.3}
.gys-lock-t{text-align:center;text-shadow:0 1px 6px rgba(0,0,0,.2)}.gys-lock-t em{font-style:normal;font-size:19px;font-weight:600;display:block}.gys-lock-t b{font-size:86px;font-weight:700;line-height:1.05;letter-spacing:-2px}
.gys-lock-n{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-top:30px}.gys-lock-n .gys-bn{animation:none;background:rgba(255,255,255,.55);color:#000}.gys-lock-e{text-align:center;opacity:.7}
.gys-lock-u{text-align:center;font-size:13px;opacity:.85;display:flex;flex-direction:column;align-items:center;gap:10px}.gys-lock-u i{width:134px;height:5px;border-radius:3px;background:#fff}
.gys-root#gys_home{background:linear-gradient(165deg,#5b7bd6 0%,#8f6fd1 42%,#e39bb5 100%)!important;color:#fff}.gys-hmhd{background:transparent!important;border:none!important;color:#fff}.gys-hmhd .gys-bk{color:#fff}
.gys-hm{min-height:100%;padding:8px 18px 30px;box-sizing:border-box}.gys-hmt{text-align:center;margin:10px 0 26px;text-shadow:0 1px 8px rgba(0,0,0,.18)}.gys-hmt b{display:block;font-size:64px;font-weight:600;line-height:1.05;letter-spacing:-1px}.gys-hmt em{font-style:normal;font-size:16px;opacity:.9}
.gys-hmg{display:grid;grid-template-columns:repeat(4,1fr);gap:22px 10px;max-width:420px;margin:0 auto}.gys-hmi{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;min-width:0}.gys-hmi:active .gys-hmic{transform:scale(.92)}
.gys-hmic{position:relative;width:60px;height:60px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:0 4px 14px rgba(0,0,0,.18);transition:transform .12s}.gys-hmic:not([class*=' gys-ai-']){background:linear-gradient(#8e8e93,#636366)}.gys-hmic sup{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;line-height:20px;border-radius:10px;background:#ff3b30;color:#fff;font-size:12px;text-align:center;padding:0 5px;box-sizing:border-box}
.gys-hmi em{font-style:normal;font-size:12px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.35);max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gys-ai-set{background:linear-gradient(#a1a1a6,#6e6e73)!important}
.gys-sheet{position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.32);display:flex;align-items:flex-end;justify-content:center;animation:gysFade .15s;font-family:-apple-system,"PingFang SC",sans-serif}
.gys-sheet-in{width:min(420px,100%);padding:0 8px calc(8px + env(safe-area-inset-bottom,0px));box-sizing:border-box;animation:gysUp .25s cubic-bezier(.2,.9,.3,1)}@keyframes gysUp{from{transform:translateY(100%)}}
.gys-sheet-g{background:rgba(242,242,247,.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:14px;overflow:hidden;margin-top:8px;max-height:60vh;overflow-y:auto}body.dark-theme .gys-sheet-g{background:rgba(44,44,46,.96);color:#fff}
.gys-sheet-g p{margin:0;padding:12px 16px;font-size:13px;color:#8e8e93;text-align:center;border-bottom:.5px solid rgba(60,60,67,.2)}
.gys-sheet-g div{padding:15px;text-align:center;font-size:18px;color:#007aff;cursor:pointer;border-bottom:.5px solid rgba(60,60,67,.2)}.gys-sheet-g div:last-child{border-bottom:none}.gys-sheet-g div.c{font-weight:600}
.gys-uip{padding:10px 0}.gys-tip2{font-size:13px;color:#8e8e93;padding:14px 16px 0}.gys-uirow{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:.5px solid rgba(60,60,67,.18)}.gys-uirow>div{flex:1;min-width:0}.gys-uirow b{display:block;font-size:16px;font-weight:500}.gys-uirow small{font-size:12.5px;color:#8e8e93;line-height:1.4}.gys-uirow select{border:none;background:rgba(118,118,128,.12);border-radius:8px;padding:6px 8px;font-size:14px;color:inherit}
`);
})();
