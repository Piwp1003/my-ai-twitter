/* =====================================================================
   js/96 —— 🎮 游戏厅（小功能里的游戏入口）
   ---------------------------------------------------------------------
   游戏以前只能从聊天输入框上面的 🎮 进，小功能里一个都看不到，很多人以为没有。
   这里在小功能放一个「🎮 游戏厅」：先选跟谁玩，再点游戏——
     · 插件游戏（剧本杀、海龟汤、恋综……）自己有页面，直接打开
     · 谷雨自带的棋牌 / 派对游戏是在聊天里玩的：先跳到 TA 的聊天，再走原来那套邀请（TA 会按人设决定答不答应）
     · 要好几个人的（狼人杀、谁是卧底）：选一个群聊
   聊天里的 🎮 照旧，两边是同一批游戏。
   ===================================================================== */
(function () {
    if (window.__gyGameHall) return; window.__gyGameHall = 1;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const G = () => (typeof registeredMiniGames !== 'undefined' ? registeredMiniGames : []);
    const chars = () => (typeof myCharacters !== 'undefined' ? myCharacters : []).filter(c => c && !c.members);
    const groups = () => (typeof groupChats !== 'undefined' ? groupChats : []);
    // 拉好几个角色一起的：自己在页面里选人（剧本杀 / 恋综），或者要群聊（minOpponents > 1）
    const MULTI_SELF = ['gyxCase', 'gyxShow'];
    const isGroupGame = g => (g.minOpponents || 1) > 1;
    const CATS = [
        ['🕵️ 推理和综艺', ['gyxReal', 'gyxSoup', 'gyxCase', 'gyxShow']],
        ['🗺️ 冒险和解谜', ['gyxQuest', 'gyxTrpg', 'gyxHunt', 'gyxLoop', 'gyxRoom', 'gyxFate']],
        ['🌿 轻松一下', ['gyxFish', 'gyxPick', 'gyxSeek']]
    ];
    let WHO = '';
    try { WHO = localStorage.getItem('gyHallWho') || ''; } catch (e) {}
    const curWho = () => {
        if (WHO && (chars().some(c => String(c.id) === WHO) || groups().some(g => String(g.id) === WHO))) return WHO;
        try { const s = typeof currentChatSessionId !== 'undefined' ? String(currentChatSessionId || '') : ''; if (s && (chars().some(c => String(c.id) === s) || groups().some(g => String(g.id) === s))) return s; } catch (e) {}
        const c = chars()[0]; return c ? String(c.id) : '';
    };
    const isG = id => String(id).startsWith('g_');
    const toast = (a, b) => { try { showToast('<div class="avatar" style="width:40px;height:40px;background:#1d9bf0;color:#fff;font-size:20px;">🎮</div>', a, b || '', null, null, false); } catch (e) {} };

    window.gyHallWho = v => { WHO = String(v || ''); try { localStorage.setItem('gyHallWho', WHO); } catch (e) {} window.gyHallOpen(); };
    window.gyHallPlay = function (gid) {
        const g = G().find(x => x.id === gid); if (!g) return;
        const who = curWho(); if (!who) return toast('还没有角色', '先去建一个角色再来玩～');
        const plugin = /^gyx[A-Z]/.test(g.id);
        // 插件游戏：自己有页面，直接开（剧本杀 / 恋综在页面里自己挑人）
        if (plugin) { closeHall(); try { if (typeof g.onStart === 'function') g.onStart(who, isG(who) ? [] : [who]); else if (typeof g.onResume === 'function') g.onResume(who); } catch (e) { console.warn('[游戏厅] 打开失败', g.id, e); } return; }
        if (isGroupGame(g) && !isG(who)) return toast(`${g.name}要好几个人`, '在上面选一个群聊，再点一次。');
        // 谷雨自带的游戏：在聊天里玩——先跳到那个聊天，再走原来的邀请流程
        closeHall();
        try { if (typeof switchMainView === 'function') switchMainView('chat'); if (typeof switchChatSession === 'function') switchChatSession(who); } catch (e) {}
        setTimeout(() => {
            try {
                const st = typeof g.getStatus === 'function' ? g.getStatus(who) : null;
                if ((st === 'playing' || st === 'finished') && typeof g.onResume === 'function') return g.onResume(who);
                if (typeof startMiniGameFlow === 'function') startMiniGameFlow(g.id);
            } catch (e) { console.warn('[游戏厅] 开局失败', g.id, e); }
        }, 250);
    };
    function closeHall() { const o = document.getElementById('gyHallOv'); if (o) o.remove(); try { if (typeof window.gyHubClose === 'function') window.gyHubClose(); } catch (e) {} }
    const card = g => `<button type="button" class="gyhl-g" onclick="gyHallPlay('${esc(g.id)}')"><b>${g.icon || '🎮'}</b><span>${esc(g.name)}</span>${isGroupGame(g) ? '<em>群聊</em>' : MULTI_SELF.includes(g.id) ? '<em>多人</em>' : ''}</button>`;
    window.gyHallOpen = function () {
        const all = G(), who = curWho();
        const used = new Set(); CATS.forEach(([, L]) => L.forEach(id => used.add(id)));
        const party = all.filter(g => isGroupGame(g) || MULTI_SELF.includes(g.id));
        const sec = (t, L) => L.length ? `<div class="gyhl-sec"><h4>${t}</h4><div class="gyhl-grid">${L.map(card).join('')}</div></div>` : '';
        const byCat = CATS.map(([t, ids]) => [t, ids.map(id => all.find(g => g.id === id)).filter(g => g && !party.includes(g))]);
        const rest = all.filter(g => !used.has(g.id) && !party.includes(g));
        const opts = chars().map(c => `<option value="${esc(c.id)}"${String(c.id) === who ? ' selected' : ''}>👤 ${esc(c.remark || c.name)}</option>`).join('') + (groups().length ? `<optgroup label="群聊">${groups().map(g => `<option value="${esc(g.id)}"${String(g.id) === who ? ' selected' : ''}>👥 ${esc(g.name)}</option>`).join('')}</optgroup>` : '');
        const html = `<div class="gyhl-who">跟谁玩 <select onchange="gyHallWho(this.value)">${opts || '<option>还没有角色</option>'}</select></div>
          <div class="gyhl-tip">${['挑一个，TA 会按自己的性格决定要不要陪你玩。', '聊天输入框上面的 🎮 也是这些。', '剧本杀和恋综在里面自己挑人；狼人杀、谁是卧底要选群聊。'][Math.floor(Math.random() * 3)]}</div>
          <h3 class="gyhl-h">👫 和 TA 两个人</h3>${sec('🃏 棋牌和小游戏', rest)}${byCat.map(([t, L]) => sec(t, L)).join('')}
          <h3 class="gyhl-h">👥 拉好几个角色一起</h3>${sec('', party)}`;
        let ov = document.getElementById('gyHallOv'); if (ov) ov.remove();
        ov = document.createElement('div'); ov.id = 'gyHallOv'; ov.className = 'gyg-ov'; ov.setAttribute('data-gy-overlay', '1'); ov.setAttribute('data-gy-page', '1');
        ov.innerHTML = `<div class="gyg-box gyhl-box"><div class="gyg-hd"><b>🎮 游戏厅</b><span class="gyg-x" onclick="document.getElementById('gyHallOv').remove()">✕</span></div><div class="gyhl-bd">${html}</div></div>`;
        ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
        document.body.appendChild(ov);
    };
    function reg() {
        if (typeof registerMiniFeature !== 'function' || typeof GY_MINI_FEATURES === 'undefined') return false;
        if (!GY_MINI_FEATURES.some(f => f.id === 'gameHall')) registerMiniFeature({ id: 'gameHall', icon: '🎮', title: '游戏厅', desc: '所有游戏都在这儿：棋牌、推理、冒险、剧本杀、恋综……', cat: '一起做', onOpen: () => window.gyHallOpen() });
        return true;
    }
    const css = document.createElement('style'); css.id = 'gyHallCss';
    css.textContent = `.gyhl-box{width:620px}.gyhl-bd{padding:4px 18px 18px;overflow:auto}.gyhl-who{display:flex;align-items:center;gap:8px;font-size:13.5px}.gyhl-who select{border:1px solid rgba(128,128,128,.35);border-radius:10px;padding:6px 10px;background:transparent;color:inherit;font-family:inherit;font-size:14px}
.gyhl-tip{font-size:12px;color:#8b98a5;margin:6px 0 4px}.gyhl-h{font-size:15px;margin:16px 0 4px}.gyhl-sec h4{font-size:12.5px;color:#8b98a5;margin:10px 0 6px;font-weight:600}.gyhl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}
.gyhl-g{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 6px;border-radius:14px;border:1px solid rgba(128,128,128,.18);background:rgba(128,128,128,.06);cursor:pointer;font-family:inherit;color:inherit}.gyhl-g:hover{background:rgba(29,155,240,.08);border-color:rgba(29,155,240,.35)}.gyhl-g b{font-size:26px;font-weight:normal}.gyhl-g span{font-size:13px}.gyhl-g em{position:absolute;top:5px;right:6px;font-style:normal;font-size:10px;padding:0 5px;border-radius:6px;background:#1d9bf0;color:#fff}`;
    document.head.appendChild(css);
    if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); }
})();
