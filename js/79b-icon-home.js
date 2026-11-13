/* =====================================================================
   js/79b —— 📲 小功能首页 = 图标桌面（305）
   她说的：「好多小功能都找不到…能不能做的更简洁明白」→ 看了预览选的：
     「图标这版，做成手机那样左右滑动屏幕查看不同页面的软件那种。真手机和 mcp 放一块。常用和最近用过这一页显示满。」
     能长按拖动自己排位置；一个功能一个图标（不合并）。
   · 小功能页打开就是一页页的图标，一行 4 个、一页最多 20 个，左右滑翻页，下面一排小圆点。
   · 第一页「常用和最近用过」：你固定的（☆）+ 最近点过的，不够 20 个用常见的补满。
   · 后面一类一页：想跟 TA 一起做点什么 / 想玩游戏 / 想看看 TA 的东西 / 我们俩的记录 / 过日子 / 手机里的软件 / TA 身边的人和外面的世界 / 调整谷雨。
     设置里那些（美化、声音、开关、客服……）也在「调整谷雨」里，不用两边翻。
   · 顶上搜索框：搜名字、搜一句话说明、搜大白话（睡不着、锁抖音、钱、吵架……）。
   · 长按图标进「整理」：拖动换位置（拖到左右边上会翻页）、点 ☆ 固定到第一页；点「完成」收起。
   · 原来的 8 个大方块没删：页面最底下「换回大方块的样子」；那边也有「换成图标桌面」。
   · 只是换了首页的摆法：功能、数据、通知 / 今天 / 小手机里的入口都不动。纯摆设，没有自主行动 / 今天 / 小组件 / 记忆总览。
   ===================================================================== */
(function () {
    if (window.__gyIconHome) return; window.__gyIconHome = 1;
    const K = 'gyIconHome', KL = 'gyIhLayout', KR = 'gyIhRecent', KS = 'gyIhStar', PER = 20;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
    const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
    const on = () => { try { return localStorage.getItem(K) !== '0'; } catch (e) { return true; } };
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const toast = (a, b) => { try { if (typeof showToast === 'function') showToast('', a, b || '', null, null, false); } catch (e) {} };
    // 每一类一句话的名字（跟预览里一样）
    const NAME = { hub_with: '想跟 TA 一起做点什么', game: '想玩游戏', hub_ta: '想看看 TA 的东西', hub_us: '我们俩的记录', hub_life: '过日子', hub_soft: '手机里的软件', hub_world: 'TA 身边的人和外面的世界', photo: '照片和表情包', set: '调整谷雨', other: '其它' };
    const ORDER = ['hub_with', 'game', 'hub_ta', 'hub_us', 'hub_life', 'hub_soft', 'hub_world', 'photo', 'set', 'other'];
    const HUE = { hub_with: 140, game: 28, hub_ta: 280, hub_us: 345, hub_life: 45, hub_soft: 215, hub_world: 190, photo: 300, set: 235, other: 0 };
    // 搜索用的大白话
    const SYN = { gyxWake: '睡不着 失眠 起床 闹钟 晚安', gyxNight: '熬夜 睡不着 晚睡', gyxHug: '难过 安慰 累 哭', gyxMakeup: '吵架 冷战 生气 和好', gyxCoax: '哄 闹别扭', gysPhone: '锁抖音 锁软件 屏幕时间 管手机 玩手机', mcp: '工具 锁抖音 MCP', gysPdd: '买东西 购物 外卖 钱 砍一刀 商城', gyxBook: '钱 记账 花了多少', gyxJar: '钱 存钱', mall: '买东西 钱', gyxShop: '头像框 装扮 背景', gySkinBox: '换皮肤 主题 好看 颜色', gallery: '照片 头像 换头像 表情包 自拍', map: '天气 在哪 出门 城市 行程 约会', period: '大姨妈 月经 生理期', days: '纪念日 生日 多少天 节日', voice: '语音 声音 配音 念出来', '@allsw': '开关 关掉 打开 关闭', gyHelp: '帮助 怎么用 教程 报错 客服 不会', gyDownload: '下载 安装包 安卓 apk 电脑版 exe 更新 新版', gyxWalk: '走路 步数 运动 出去走走', gyxStudy: '学习 专注 番茄 工作', '@inner': '心里话 想什么 心声', '@phone': '查手机 偷看', gyx3dVoice: '声音 说话 小人', gameHall: '游戏 棋 牌 无聊 五子棋', gyxSecret: '心事 倾诉 悄悄话', gyxStill: '安静 白噪音 雨声', gyxDream: '梦 做梦', gyxLetter: '信 写信 情书', gyxPromise: '约定 答应 承诺', gyxWish: '愿望 想要', gyxHome: '小屋 家 房间', gyx3dRoom: '小屋 家 3D 房间', gysMap3d: '地图 出门 3D', gyxPet: '桌宠 小人', gyx3d: '小人 捏 3D', gyxBubble: '气泡 聊天背景', gyxCall: '电话 铃声 来电', npc: '路人 朋友 NPC', web_explore: '上网 搜索 新闻', gyxHot: '热搜 新闻', gyxCare: '吃饭 照顾我 管我', moodbook: '心情 情绪' };
    const FILL = ['gameHall', '@letters', '@inner', 'gysWechat', 'gysPdd', 'gysDouyin', 'gysMusic', 'gyxHome', 'days', 'gyxWalk', 'gyxWake', 'gyxHug', 'gyxPromise', 'gallery', 'map', 'gySkinBox', '@allsw', 'gyHelp', 'gysPhone', 'mcp', 'gysWeibo', 'gysRed', 'gyxDream', 'gyxStudy', 'gysMap3d', 'voice'];

    /* ---------------- 有哪些功能、默认怎么分页 ---------------- */
    let IT = {};   // id → { id, icon, title, desc, grp, color }
    function collect() {
        IT = {}; const def = {}; ORDER.forEach(g => { def[g] = []; });
        const put = (m, g, color) => { if (!m || !m.id || IT[m.id]) return; IT[m.id] = { id: m.id, icon: m.icon || '🧩', title: String(m.title || m.id).replace(/^\s*[\p{Extended_Pictographic}️‍]+\s*/u, '') || String(m.title || m.id), desc: m.desc || '', grp: g, color: color || null }; def[g].push(m.id); };
        const tree = typeof window.gyHubTree === 'function' ? window.gyHubTree() : [];
        const item = id => (typeof window.gyHubItem === 'function' ? window.gyHubItem(id) : null);
        tree.forEach(F => { const g = F.set ? 'set' : (NAME[F.id] ? F.id : 'other'); F.pages.forEach(p => p.items.forEach(m => put(m, g, m.color))); });
        // 真手机和 MCP 放一块，跟在软件后面
        ['gysPhone', 'mcp'].forEach(id => put(item(id), 'hub_soft'));
        put(item('gysMap3d'), 'hub_life');
        // 游戏：游戏厅 + 进了小功能的那几个游戏
        put(item('gameHall'), 'game'); (typeof window.gyHubGameIds === 'function' ? window.gyHubGameIds() : []).forEach(id => put(item(id), 'game'));
        ['gallery', 'gyxAlbum', 'gyxDuo', 'gyxAvatar', 'gyxMoment', 'gyxMeme', 'emoticon', 'charPhoto'].forEach(id => put(item(id), 'photo'));
        ['gyHelp', 'gyDownload', '@play', 'gyxIntro'].forEach(id => put(item(id), 'set'));
        // 剩下还看得见的（别人写的插件之类）
        try { const hid = typeof window.gyHubHideIds === 'function' ? window.gyHubHideIds() : new Set(); (typeof GY_MINI_FEATURES !== 'undefined' ? GY_MINI_FEATURES : []).forEach(f => { if (f && f.id && !f.hub && !hid.has(f.id)) put(item(f.id) || f, 'other'); }); } catch (e) {}
        return def;
    }
    // 页：[{ t, g, ids }]。存过自己排的就用自己的（新出来的功能补到它那一类的最后一页）
    function pages() {
        const def = collect(), base = [];
        ORDER.forEach(g => { const ids = def[g]; for (let k = 0; k < ids.length; k += PER) base.push({ t: NAME[g] + (ids.length > PER ? `（${k / PER + 1}）` : ''), g, ids: ids.slice(k, k + PER) }); });
        const saved = rd(KL, null);
        if (!Array.isArray(saved) || !saved.length) return base;
        const seen = new Set(), out = saved.map(p => ({ t: String(p.t || ''), g: p.g || 'other', ids: (p.ids || []).filter(id => IT[id] && !seen.has(id) && seen.add(id)) })).filter(p => p.ids.length);
        Object.keys(IT).forEach(id => { if (seen.has(id)) return; const g = IT[id].grp; let p = out.filter(x => x.g === g).pop(); if (!p) { p = { t: NAME[g], g, ids: [] }; out.push(p); } p.ids.push(id); });
        return out;
    }
    function firstPage() {
        const star = rd(KS, []).filter(id => IT[id]), rec = rd(KR, []).filter(id => IT[id]);
        return [...new Set(star.concat(rec, FILL.filter(id => IT[id]), Object.keys(IT)))].slice(0, PER);
    }

    /* ---------------- 打开 ---------------- */
    function open(id) {
        const r = [id].concat(rd(KR, []).filter(x => x !== id)).slice(0, 12); wr(KR, r);
        try {
            if (IT[id] && IT[id].grp === 'hub_soft' && typeof window.gyHomeApp === 'function' && id !== 'mcp') return window.gyHomeApp(id);
            if (typeof window.gyHubOpenItem === 'function') return window.gyHubOpenItem(id);
            if (typeof gyOpenMiniFeature === 'function') return gyOpenMiniFeature(id);
        } catch (e) { console.warn('[图标桌面] 打开出错：', e); }
    }
    window.gyIhOpen = open;

    /* ---------------- 画 ---------------- */
    const S = { pg: 0, q: '', edit: false };
    const sq = it => it.color ? `background:linear-gradient(150deg,${it.color[0]},${it.color[1]})` : `--h:${HUE[it.grp] != null ? HUE[it.grp] : 0}`;
    const ico = (id, fixed) => { const it = IT[id]; if (!it) return ''; const st = rd(KS, []).includes(id); return `<button type="button" class="gyih-i${fixed ? ' fx' : ''}" data-id="${esc(id)}" title="${esc(it.desc)}"><span class="sq${it.color ? ' app' : ''}" style="${sq(it)}">${it.icon}</span><span class="nm">${esc(it.title)}</span><i class="st${st ? ' on' : ''}" data-st="${esc(id)}">${st ? '★' : '☆'}</i></button>`; };
    function paint() {
        const box = document.getElementById('miniFeatureList'); if (!box) return;
        let el = document.getElementById('gyIh'), foot = document.getElementById('gyIhFoot');
        if (!on()) {
            if (el) el.remove(); box.classList.remove('gyih-on');
            if (!foot) { foot = document.createElement('div'); foot.id = 'gyIhFoot'; foot.className = 'gyih-foot'; foot.innerHTML = `<span onclick="gyIconHomeSet(true)">换成图标桌面（像手机那样左右滑）</span>`; }
            box.appendChild(foot); return;
        }
        if (foot) foot.remove();
        if (!el) { el = document.createElement('div'); el.id = 'gyIh'; bind(el); }
        if (box.firstChild !== el) box.insertBefore(el, box.firstChild);
        box.classList.add('gyih-on');
        const P = pages(), q = S.q.trim().toLowerCase();
        let h = `<div class="gyih-find"><span>🔍</span><input id="gyIhQ" type="search" placeholder="想找什么？直接打字" value="${esc(S.q)}" autocomplete="off">${S.edit ? `<b class="gyih-done" data-done="1">完成</b>` : ''}</div>`;
        if (q) {
            const hit = Object.values(IT).filter(it => (it.title + ' ' + it.desc + ' ' + (SYN[it.id] || '') + ' ' + NAME[it.grp]).toLowerCase().includes(q));
            h += hit.length ? `<div class="gyih-hint">找到 ${hit.length} 个</div><div class="gyih-list">${hit.map(it => `<button type="button" class="gyih-row" data-id="${esc(it.id)}"><span class="sq${it.color ? ' app' : ''}" style="${sq(it)}">${it.icon}</span><span class="tx"><b>${esc(it.title)}</b><em>${esc(it.desc || NAME[it.grp])}</em></span></button>`).join('')}</div>`
                : `<div class="gyih-none">没找到「${esc(S.q)}」。换个说法试试，或者问问 <span data-id="gyHelp">🛟 客服</span>。</div>`;
        } else {
            const all = [{ t: '常用和最近用过', g: 'first', ids: firstPage(), fixed: 1 }].concat(P);
            if (S.pg >= all.length) S.pg = all.length - 1;
            h += (S.edit ? `<div class="gyih-hint">整理中：拖图标换位置（拖到左右边上翻页），点 ☆ 固定到第一页。第一页是自动排的，拖不了。</div>` : `<div class="gyih-hint">名字、用途、大白话都能搜：睡不着、锁抖音、钱、吵架……　长按图标可以整理</div>`)
                + `<div class="gyih-pager${S.edit ? ' ed' : ''}" id="gyIhPager">${all.map((p, i) => `<section class="gyih-pg" data-pg="${i}"><div class="gyih-t">${esc(p.t)}</div><div class="gyih-grid">${p.ids.map(id => ico(id, p.fixed)).join('')}</div></section>`).join('')}</div>`
                + `<div class="gyih-dots" id="gyIhDots">${all.map((p, i) => `<i data-dot="${i}"${i === S.pg ? ' class="on"' : ''}></i>`).join('')}</div>`
                + `<div class="gyih-foot2"><span data-old="1">换回大方块的样子</span>${rd(KL, null) ? `<span data-reset="1">图标位置恢复默认</span>` : ''}</div>`;
        }
        const had = document.activeElement && document.activeElement.id === 'gyIhQ';
        el.innerHTML = h;
        if (had) { const i = document.getElementById('gyIhQ'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {} } }
        const pg = document.getElementById('gyIhPager');
        if (pg) {
            const go = () => { pg.scrollLeft = S.pg * pg.clientWidth; }; go(); requestAnimationFrame(go);
            pg.onscroll = () => { if (!pg.clientWidth) return; const i = Math.round(pg.scrollLeft / pg.clientWidth); if (i !== S.pg) { S.pg = i; el.querySelectorAll('#gyIhDots i').forEach((d, k) => d.classList.toggle('on', k === i)); } };
        }
    }
    window.gyIhPaint = paint;
    window.gyIconHomeSet = function (v) { try { localStorage.setItem(K, v ? '1' : '0'); } catch (e) {} S.edit = false; if (typeof renderMiniFeaturePanel === 'function') renderMiniFeaturePanel(); else paint(); toast(v ? '📲 换成图标桌面了' : '换回大方块了', v ? pick(['左右滑翻页，长按图标可以整理', '顶上能搜，找不到就打字']) : '想换回来：页面最底下「换成图标桌面」'); };
    window.gyIconHomeOn = on;
    window.gyIhState = () => ({ on: on(), pages: [{ t: '常用和最近用过', ids: (collect(), firstPage()) }].concat(pages()), edit: S.edit, pg: S.pg, n: Object.keys(IT).length });

    /* ---------------- 点、长按、拖 ---------------- */
    function saveLayout(P) { wr(KL, P.map(p => ({ t: p.t, g: p.g, ids: p.ids }))); }
    function move(id, toPg, beforeId) {   // toPg：第几页（不算第一页）
        const P = pages(); P.forEach(p => { p.ids = p.ids.filter(x => x !== id); });
        const p = P[toPg]; if (!p) return;
        const i = beforeId ? p.ids.indexOf(beforeId) : -1; if (i >= 0) p.ids.splice(i, 0, id); else p.ids.push(id);
        saveLayout(P.filter(x => x.ids.length));
    }
    window.gyIhMove = move;
    function bind(el) {
        el.addEventListener('input', e => { if (e.target.id === 'gyIhQ') { S.q = e.target.value; paint(); } });
        let lp = 0, down = null, drag = null, flip = 0, moved = false;
        const pager = () => document.getElementById('gyIhPager');
        el.addEventListener('click', e => {
            if (moved) { moved = false; return; }
            const t = e.target;
            if (t.closest('[data-done]')) { S.edit = false; return paint(); }
            if (t.closest('[data-old]')) return window.gyIconHomeSet(false);
            if (t.closest('[data-reset]')) { try { localStorage.removeItem(KL); } catch (e2) {} toast('图标位置恢复默认了', ''); return paint(); }
            const d = t.closest('[data-dot]'); if (d) { const pg = pager(); if (pg) pg.scrollTo({ left: +d.dataset.dot * pg.clientWidth, behavior: 'smooth' }); return; }
            const st = t.closest('[data-st]');
            if (st && S.edit) { const id = st.dataset.st, L = rd(KS, []); wr(KS, L.includes(id) ? L.filter(x => x !== id) : [id].concat(L).slice(0, PER)); return paint(); }
            const it = t.closest('[data-id]'); if (!it) return;
            if (S.edit) return;
            open(it.dataset.id);
        });
        el.addEventListener('contextmenu', e => { if (e.target.closest('.gyih-i')) e.preventDefault(); });
        el.addEventListener('pointerdown', e => {
            const b = e.target.closest('.gyih-i'); if (!b || e.target.closest('[data-st]')) return;
            down = { b, x: e.clientX, y: e.clientY, id: b.dataset.id, pid: e.pointerId }; moved = false;
            clearTimeout(lp);
            if (!S.edit) lp = setTimeout(() => { if (!down) return; S.edit = true; down = null; try { if (navigator.vibrate) navigator.vibrate(15); } catch (e2) {} paint(); }, 520);
        });
        el.addEventListener('pointermove', e => {
            if (!down) return;
            const dx = e.clientX - down.x, dy = e.clientY - down.y;
            if (!S.edit) { if (Math.abs(dx) + Math.abs(dy) > 10) { clearTimeout(lp); down = null; } return; }
            if (down.b.classList.contains('fx')) return;
            if (!drag && Math.abs(dx) + Math.abs(dy) > 6) {
                const r = down.b.getBoundingClientRect(), g = down.b.cloneNode(true);
                g.className = 'gyih-i gyih-ghost'; g.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;z-index:2147483600;pointer-events:none`;
                document.body.appendChild(g); down.b.classList.add('lift'); drag = { g, ox: e.clientX - r.left, oy: e.clientY - r.top };
                try { el.setPointerCapture(down.pid); } catch (e2) {}
            }
            if (!drag) return;
            e.preventDefault(); moved = true;
            drag.g.style.left = (e.clientX - drag.ox) + 'px'; drag.g.style.top = (e.clientY - drag.oy) + 'px';
            const pg = pager(); if (!pg) return; const pr = pg.getBoundingClientRect(), now = Date.now();
            if (now - flip > 700) {
                if (e.clientX > pr.right - 26) { flip = now; pg.scrollTo({ left: (S.pg + 1) * pg.clientWidth, behavior: 'smooth' }); }
                else if (e.clientX < pr.left + 26 && S.pg > 1) { flip = now; pg.scrollTo({ left: (S.pg - 1) * pg.clientWidth, behavior: 'smooth' }); }
            }
        });
        const up = e => {
            clearTimeout(lp);
            if (drag && down) {
                drag.g.remove(); let tgt = null;
                try { tgt = document.elementFromPoint(e.clientX, e.clientY); } catch (e2) {}
                const over = tgt && tgt.closest ? tgt.closest('.gyih-i') : null, sec = tgt && tgt.closest ? tgt.closest('.gyih-pg') : null;
                const pgI = sec ? +sec.dataset.pg : S.pg;
                if (pgI >= 1 && (!over || (over.dataset.id !== down.id && !over.classList.contains('fx')))) move(down.id, pgI - 1, over ? over.dataset.id : null);
                drag = null; down = null; paint(); return;
            }
            drag = null; down = null;
        };
        el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    }

    /* ---------------- 接到小功能页上 ---------------- */
    function wrap() {
        const r = window.renderMiniFeaturePanel;
        if (typeof r !== 'function' || r.__gyIh) return typeof r === 'function';
        const w = function () { const x = r.apply(this, arguments); try { paint(); } catch (e) { console.warn('[图标桌面]', e); } return x; };
        Object.keys(r).forEach(k => { try { w[k] = r[k]; } catch (e) {} });
        w.__gyIh = true; window.renderMiniFeaturePanel = w; try { (0, eval)('renderMiniFeaturePanel = window.renderMiniFeaturePanel'); } catch (e) {}
        return true;
    }
    function css() {
        if (document.getElementById('gyIhCss')) return;
        const st = document.createElement('style'); st.id = 'gyIhCss';
        st.textContent = `
#miniFeatureList.gyih-on > :not(#gyIh){display:none!important}
#miniFeatureList.gyih-on > #gyIh{display:grid!important}
#gyIh{--c:#fff;--ink:#1c1c1e;--sub:#8e8e93;--line:#d9d9de;display:grid;gap:12px;padding:4px 2px 18px;color:var(--ink);min-width:0;-webkit-user-select:none;user-select:none}
body.dark-theme #gyIh{--c:#1c1c1e;--ink:#f2f2f7;--sub:#98989f;--line:#3a3a3c}
.gyih-find{display:flex;align-items:center;gap:8px;background:var(--c);border:1px solid var(--line);border-radius:14px;padding:0 12px}
.gyih-find input{flex:1;min-width:0;font:inherit;font-size:16px;border:0;background:transparent;color:var(--ink);padding:11px 0;outline:0;-webkit-user-select:text;user-select:text}
.gyih-done{flex:none;font-size:14px;font-weight:600;color:#007aff;cursor:pointer;padding:6px 2px}
.gyih-hint{font-size:12.5px;color:var(--sub);margin:-4px 6px 0;line-height:1.5}
.gyih-pager{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
.gyih-pager::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}
.gyih-pg{flex:0 0 100%;scroll-snap-align:start;min-width:0;display:grid;gap:14px;align-content:start;min-height:470px;padding:0 2px}
.gyih-t{font-size:14px;font-weight:700;margin:2px 6px 0}
.gyih-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px 6px}
.gyih-i{position:relative;font:inherit;border:0;background:transparent;color:inherit;cursor:pointer;display:grid;justify-items:center;gap:5px;padding:0;min-width:0;-webkit-tap-highlight-color:transparent;touch-action:pan-x pan-y}
.gyih-i .sq,.gyih-row .sq{width:58px;height:58px;border-radius:16px;display:grid;place-items:center;font-size:28px;line-height:1;background:color-mix(in srgb,hsl(var(--h,0) 60% 52%) 22%,var(--c));flex:none}
.gyih-i .sq.app,.gyih-row .sq.app{color:#fff}
.gyih-i .nm{font-size:11.5px;line-height:1.3;text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:100%;color:var(--ink)}
.gyih-i:active .sq{transform:scale(.94)}
.gyih-i .st{display:none;position:absolute;top:-7px;right:calc(50% - 38px);width:22px;height:22px;border-radius:50%;background:var(--c);border:1px solid var(--line);font-style:normal;font-size:12px;line-height:20px;text-align:center;color:var(--sub)}
.gyih-i .st.on{color:#ff9500;border-color:#ff9500}
.gyih-pager.ed .gyih-i{touch-action:none}
.gyih-pager.ed .gyih-i .st{display:block}
.gyih-pager.ed .gyih-i:not(.fx) .sq{animation:gyihJig .28s ease-in-out infinite alternate}
.gyih-i.lift{opacity:.25}
.gyih-ghost .sq{transform:scale(1.12);box-shadow:0 10px 24px rgba(0,0,0,.25)}
.gyih-ghost .st{display:none!important}
@keyframes gyihJig{from{transform:rotate(-2.2deg)}to{transform:rotate(2.2deg)}}
@media (prefers-reduced-motion:reduce){.gyih-pager.ed .gyih-i .sq{animation:none}}
.gyih-dots{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
.gyih-dots i{width:8px;height:8px;border-radius:50%;background:var(--line);cursor:pointer}
.gyih-dots i.on{background:var(--ink)}
.gyih-list{background:var(--c);border-radius:16px;overflow:hidden}
.gyih-row{width:100%;font:inherit;text-align:left;border:0;border-top:1px solid var(--line);background:transparent;color:var(--ink);display:flex;align-items:center;gap:12px;padding:9px 14px;cursor:pointer}
.gyih-row:first-child{border-top:0}
.gyih-row .sq{width:40px;height:40px;border-radius:11px;font-size:20px}
.gyih-row .tx{flex:1;min-width:0}.gyih-row .tx b{display:block;font-weight:600;font-size:15px}.gyih-row .tx em{display:block;font-style:normal;font-size:12.5px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gyih-none{background:var(--c);border-radius:16px;padding:18px;text-align:center;color:var(--sub);font-size:14px}.gyih-none span{color:#007aff;cursor:pointer}
.gyih-foot,.gyih-foot2{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;font-size:12.5px;color:#8e8e93;padding:10px 0 4px}
.gyih-foot span,.gyih-foot2 span{cursor:pointer;text-decoration:underline;text-underline-offset:3px}
@media (min-width:700px){.gyih-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.gyih-pg{min-height:400px}}
`;
        document.head.appendChild(st);
    }
    function boot() {
        css();
        let n = 0; const iv = setInterval(() => { if (wrap() || ++n > 80) { clearInterval(iv); try { if (document.getElementById('miniFeatureList') && document.getElementById('miniFeatureList').children.length) paint(); } catch (e) {} } }, 250);
        // 新玩法是分批启动的：都到齐了再画一遍
        try { window.addEventListener('gy-play-ready', () => setTimeout(paint, 300)); } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
