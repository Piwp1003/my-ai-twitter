// ===== 用户纪念日管理函数 =====
function renderUserAnniversaryList() {
    const container = document.getElementById('userAnniversaryList');
    if(!container) return;
    if(!currentUser.customAnniversaries || currentUser.customAnniversaries.length === 0) {
        container.innerHTML = '<span style="color:#8b98a5; font-size:12px;">还没有添加纪念日</span>';
        return;
    }
    container.innerHTML = currentUser.customAnniversaries.map((ann, idx) => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:6px; background:white; border:1px solid #eff3f4; border-radius:4px;">
            <span style="font-size:12px;">📅 ${ann.date} - ${ann.label}</span>
            <span onclick="deleteUserAnniversary(${idx})" style="cursor:pointer; color:#f91880; margin-left:8px; font-weight:bold;">×</span>
        </div>
    `).join('');
}

function addUserAnniversary() {
    const dateElem = document.getElementById('newUserAnniversaryDate');
    const labelElem = document.getElementById('newUserAnniversaryLabel');
    const date = dateElem ? dateElem.value.trim() : '';
    const label = labelElem ? labelElem.value.trim() : '';

    if(!date || !label) {
        alert('请输入日期和纪念日描述');
        return;
    }

    if(!currentUser.customAnniversaries) currentUser.customAnniversaries = [];
    if(currentUser.customAnniversaries.some(a => a.date === date && a.label === label)) {
        alert('这个纪念日已经存在了');
        return;
    }

    currentUser.customAnniversaries.push({ date, label });
    if(dateElem) dateElem.value = '';
    if(labelElem) labelElem.value = '';
    saveAllData();
    renderUserAnniversaryList();
}

function deleteUserAnniversary(idx) {
    if(!currentUser.customAnniversaries) return;
    currentUser.customAnniversaries.splice(idx, 1);
    saveAllData();
    renderUserAnniversaryList();
}


// ===================== 角色专属：纪念日 + 回忆相册（日历图标）=====================
let currentCalendarCharId = null; // 当前打开的纪念日弹窗对应的角色，供添加/删除纪念日直接使用，避免猜测
function openCharCalendarModal(charId) {
    const char = myCharacters.find(c => c.id == charId); if (!char) return;
    currentCalendarCharId = char.id;
    document.getElementById('charCalendarTitle').innerText = `📅 ${char.name} 的日历`;
    document.getElementById('charAnniversaryNoteText').style.display = 'none';
    document.getElementById('charAnniversaryNoteText').innerText = '';

    // 渲染真正的纪念日列表（含手动添加的纪念日 + AI记忆推断的纪念日），而不是只显示一句"认识天数"
    renderCharCalendarModalContent(char.id);
    // 月历 + 待办：默认停在今天
    gyCalYear = new Date().getFullYear();
    gyCalMonth = new Date().getMonth();
    gyCalSelected = gyDateKey(new Date());
    gyCalRange = 'month';
    setCalendarRange('month');   // 顺带把上面那排按钮的高亮也复位
    closeCalendarAddBox();
    renderCharTodoList();

    openModal('charCalendarModal');
}

// ===================== 📅 月历 =====================
// 数据全是现成的，以前只是没地方看：
//   · 日程   —— char.schedule（今天）+ char.scheduleHistory（自动归档的前几天）
//   · 纪念日 —— char.anniversaries（原来的纪念日功能，直接融合进来，按"每年同月同日"复现）
//   · 待办   —— char.todos（这一版新加的）
let gyCalYear = new Date().getFullYear();
let gyCalMonth = new Date().getMonth();
let gyCalSelected = null;

function gyDateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function gyCalChar() {
    return myCharacters.find(c => c.id == currentCalendarCharId) || null;
}
// 这一天有哪些东西。key 是 'yyyy-mm-dd'。
function gyCalDayData(char, key) {
    const out = { schedules: [], anniversaries: [], todos: [] };
    if (!char) return out;
    // 日程：归档的 + 今天这份
    (char.scheduleHistory || []).forEach(h => {
        if (h && h.at && gyDateKey(new Date(h.at)) === key) out.schedules.push({ at: h.at, text: h.text });
    });
    if (char.schedule && char.schedule.text && char.schedule.generatedAt
        && gyDateKey(new Date(char.schedule.generatedAt)) === key
        && !out.schedules.some(s => s.at === char.schedule.generatedAt)) {
        out.schedules.push({ at: char.schedule.generatedAt, text: char.schedule.text, isToday: true });
    }
    // 纪念日：按"每年同一个月日"算，这样周年当天也会亮起来
    const md = key.slice(5);
    (char.anniversaries || []).forEach(a => {
        if (!a || !a.date) return;
        if (a.date === key) out.anniversaries.push({ ...a, years: 0 });
        else if (String(a.date).slice(5) === md && String(a.date) < key) {
            const years = parseInt(key.slice(0, 4)) - parseInt(String(a.date).slice(0, 4));
            if (years > 0) out.anniversaries.push({ ...a, years });
        }
    });
    // 🎂 生日和你自己记的纪念日以前**只存着、不显示**：日历上一片空白，
    //    角色也不知道。现在统一并进来，跟角色自己的纪念日一样按"每年同月同日"亮。
    const yearly = (dateStr, label, tag) => {
        if (!dateStr) return;
        const ds = String(dateStr);
        if (ds.slice(5) !== md) return;
        const y0 = parseInt(ds.slice(0, 4));
        const years = (isNaN(y0) || y0 <= 0) ? 0 : parseInt(key.slice(0, 4)) - y0;
        out.anniversaries.push({ date: ds, event: label, years: years > 0 ? years : 0, auto: tag });
    };
    yearly(char.birthdate, char.name + '生日', 'char-birthday');
    if (typeof currentUser !== 'undefined' && currentUser) {
        yearly(currentUser.birthdate, (currentUser.name || '我') + '生日', 'user-birthday');
        (currentUser.customAnniversaries || []).forEach(a2 => {
            if (a2 && a2.date) yearly(a2.date, a2.label || '纪念日', 'user-anniv');
        });
    }
    (char.todos || []).forEach(t => { if (t && t.date === key) out.todos.push(t); });
    return out;
}

// 🗓️ 「认识第几天」全 app 只能有一个算法
// —— 以前有两套：日历页从"用户手记的相识日 / createTime"算，
//    checkAndAnnounceAnniversary 却从"聊天记录第一条的时间戳"算。
//    结果同一天日历显示第 100 天、角色嘴里说第 30 天（实测过）。
//    而且从聊天记录算的那套，用户一清聊天记录天数就归零。
//    现在统一走这里。优先级：用户手记的相识日 > createTime > 首条聊天 > id 里的时间戳。
function annBaseInfo(char) {
    if (!char) return null;
    let baseTs = null, label = '我们相识', from = '';
    const meet = (char.anniversaries || []).find(a => a && a.event &&
        /相识|认识|相遇|见面|初见|在一起|确定关系/.test(a.event));
    if (meet && meet.date) { baseTs = new Date(meet.date + 'T00:00:00').getTime(); label = meet.event; from = '手记'; }
    if (!baseTs && char.createTime) { baseTs = char.createTime; from = 'createTime'; }
    if (!baseTs) {
        const h = (typeof globalChats !== 'undefined' && globalChats[char.id]) || null;
        if (h && h.length && h[0].timestamp) { baseTs = h[0].timestamp; from = '首条聊天'; }
    }
    if (!baseTs && !isNaN(char.id) && String(char.id).length >= 13) { baseTs = parseInt(char.id); from = 'id'; }
    if (!baseTs) { baseTs = Date.now(); from = '兜底'; }

    const b = new Date(baseTs); b.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    let days = Math.floor((t.getTime() - b.getTime()) / 86400000) + 1;   // 认识当天算第 1 天
    if (days < 1) days = 1;
    return { baseTs: b.getTime(), label, days, from, dateStr: gyDateKey(b) };
}

// 🗓️ 今天该惦记的日子 —— 用户在日历里手记的纪念日，以前角色一个字都看不到。
//    只放"今天"这一天的，不会把整张表倒进 prompt。
function getAnniversaryAwarenessPrompt(char) {
    try {
        // 📅「日子」内置之后（js/25）它也读 char.anniversaries，而且做得更全——
        //    带周年数、还会提前几天开始惦记、外加节气时令。两边都注入的话
        //    prompt 里会出现两段几乎一样的【今天是什么日子】。让位给它。
        if (typeof window.__gyDaysCtxFor === 'function') return '';
        if (typeof aliveSettings !== 'undefined' && aliveSettings.knowAnniv === false) return '';
        if (typeof enableAnniversary !== 'undefined' && !enableAnniversary) return '';
        if (!char) return '';
        const key = gyDateKey(new Date());
        const d = gyCalDayData(char, key);
        const lines = [];
        (d.anniversaries || []).forEach(a => {
            lines.push('· ' + a.event + (a.years ? `（${a.years} 周年）` : '（就是今天）'));
        });
        const info = annBaseInfo(char);
        let head = '';
        if (info && info.from === '手记') head = `今天是${info.label}的第 ${info.days} 天。\n`;
        if (!lines.length && !head) return '';
        return `\n\n【🗓️ 今天是个什么日子】\n${head}${lines.join('\n')}\n`
            + `这些是对方记在日历上的。你心里清楚就行——要不要提、怎么提，看你的人设和你俩现在的关系；`
            + `不是那种会把日子挂嘴边的人，就别提。千万别变成播报。\n`;
    } catch (e) { return ''; }
}

let gyCalRange = 'month';   // 'day' | 'week' | 'month' | 'year'

function setCalendarRange(r) {
    gyCalRange = r;
    document.querySelectorAll('#charCalendarRange button').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-range') === r);
    });
    // 切到日/周视图时，把"当前月"对齐到选中的那天，否则翻页会莫名其妙跳月
    if ((r === 'day' || r === 'week') && gyCalSelected) {
        const d = new Date(gyCalSelected + 'T00:00:00');
        if (!isNaN(d)) { gyCalYear = d.getFullYear(); gyCalMonth = d.getMonth(); }
    }
    renderCharCalendarGrid();
}

// 上一格/下一格：翻的东西跟当前视图有关（日视图翻一天，周视图翻一周，月/年各自翻月和年）
function charCalendarShiftMonth(delta) {
    if (delta === 0) {
        const n = new Date();
        gyCalYear = n.getFullYear(); gyCalMonth = n.getMonth(); gyCalSelected = gyDateKey(n);
        renderCharCalendarGrid();
        return;
    }
    if (gyCalRange === 'day' || gyCalRange === 'week') {
        const step = gyCalRange === 'day' ? 1 : 7;
        const base = gyCalSelected ? new Date(gyCalSelected + 'T00:00:00') : new Date();
        base.setDate(base.getDate() + delta * step);
        gyCalSelected = gyDateKey(base);
        gyCalYear = base.getFullYear(); gyCalMonth = base.getMonth();
    } else if (gyCalRange === 'year') {
        gyCalYear += delta;
    } else {
        gyCalMonth += delta;
        if (gyCalMonth < 0) { gyCalMonth = 11; gyCalYear--; }
        if (gyCalMonth > 11) { gyCalMonth = 0; gyCalYear++; }
    }
    renderCharCalendarGrid();
}
function charCalendarPickDay(key) {
    gyCalSelected = key;
    renderCharCalendarGrid();
}

// 把某一天的东西压成"一行一条"的事件列表，格子里直接显示（这才是系统日历的样子，
// 原来只画三个小圆点，等于把信息全藏起来了，还得点进去才知道是什么）
function gyCalDayEvents(char, key) {
    const d = gyCalDayData(char, key);
    const evs = [];
    d.anniversaries.forEach(a => evs.push({ cls: 'gy-dot-ann', text: a.event + (a.years ? ` · ${a.years}周年` : '') }));
    d.schedules.forEach(sc => {
        // 日程是一整天的多行文本，格子里放不下，取前几行的"时间 + 事"当摘要
        String(sc.text).split(/\r?\n/).map(x => x.trim()).filter(Boolean).slice(0, 4)
            .forEach(line => evs.push({ cls: 'gy-dot-sch', text: line }));
    });
    d.todos.forEach(t => evs.push({ cls: 'gy-dot-todo', text: t.text, done: !!t.done }));
    return evs;
}

function renderCharCalendarGrid() {
    const grid = document.getElementById('charCalendarGrid');
    const label = document.getElementById('charCalendarMonthLabel');
    const weekBar = document.getElementById('charCalendarWeekBar');
    if (!grid || !label) return;
    const char = gyCalChar();
    const todayKey = gyDateKey(new Date());
    const esc = s2 => (typeof escapeHtml === 'function') ? escapeHtml(s2 || '') : String(s2 || '');
    grid.className = 'gy-cal-grid';
    if (weekBar) weekBar.style.display = '';

    // ---------- 年视图：12 个小月份，点一个跳进那个月 ----------
    if (gyCalRange === 'year') {
        label.innerText = `${gyCalYear} 年`;
        if (weekBar) weekBar.style.display = 'none';
        grid.classList.add('year-mode');
        let html = '';
        for (let m = 0; m < 12; m++) {
            const days = new Date(gyCalYear, m + 1, 0).getDate();
            let n = 0, kinds = { sch: 0, ann: 0, todo: 0 };
            for (let d = 1; d <= days; d++) {
                const k = `${gyCalYear}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dd = gyCalDayData(char, k);
                if (dd.schedules.length) { kinds.sch++; n++; }
                if (dd.anniversaries.length) { kinds.ann++; n++; }
                if (dd.todos.length) { kinds.todo++; n++; }
            }
            const dots = (kinds.sch ? '<i class="gy-dot gy-dot-sch"></i>' : '')
                       + (kinds.ann ? '<i class="gy-dot gy-dot-ann"></i>' : '')
                       + (kinds.todo ? '<i class="gy-dot gy-dot-todo"></i>' : '');
            html += `<div class="gy-cal-mini" onclick="gyCalJumpMonth(${m})">
                <div class="gy-cal-mini-name">${m + 1} 月</div>
                <div class="gy-cal-mini-count">${n ? n + ' 项' : '—'}</div>
                <div class="gy-cal-mini-dots">${dots}</div></div>`;
        }
        grid.innerHTML = html;
        renderCharCalendarDayDetail();
        return;
    }

    // ---------- 日 / 周视图：一天一段，全文列出来，不省略 ----------
    if (gyCalRange === 'day' || gyCalRange === 'week') {
        if (weekBar) weekBar.style.display = 'none';
        grid.classList.add('list-mode');
        const base = gyCalSelected ? new Date(gyCalSelected + 'T00:00:00') : new Date();
        let days = [];
        if (gyCalRange === 'day') days = [new Date(base)];
        else {
            const start = new Date(base); start.setDate(start.getDate() - start.getDay());   // 从周日起
            for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
        }
        label.innerText = gyCalRange === 'day'
            ? `${gyDateKey(days[0])}`
            : `${gyDateKey(days[0])} ～ ${gyDateKey(days[6])}`;
        const wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        grid.innerHTML = days.map(d => {
            const k = gyDateKey(d);
            const evs = gyCalDayEvents(char, k);
            return `<div class="gy-cal-daybox${k === gyCalSelected ? ' selected' : ''}" onclick="charCalendarPickDay('${k}')">
                <div class="gy-cal-daybox-title">${k} ${wk[d.getDay()]}${k === todayKey ? '<span class="gy-cal-today-tag">今天</span>' : ''}</div>
                ${evs.length
                    ? evs.map(e => `<div class="gy-cal-ev${e.done ? ' done' : ''}"><i class="gy-dot ${e.cls}"></i>${esc(e.text)}</div>`).join('')
                    : '<div class="gy-cal-daybox-empty">这天没有记录</div>'}
            </div>`;
        }).join('');
        renderCharCalendarDayDetail();
        return;
    }

    // ---------- 月视图：格子里直接列出当天的事 ----------
    label.innerText = `${gyCalYear} 年 ${gyCalMonth + 1} 月`;
    const first = new Date(gyCalYear, gyCalMonth, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(gyCalYear, gyCalMonth + 1, 0).getDate();
    const maxLines = (window.innerWidth <= 900) ? 1 : 3;   // 手机格子矮，只显示一条

    let cells = '';
    for (let i = 0; i < startPad; i++) cells += `<div class="gy-cal-cell other-month"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${gyCalYear}-${String(gyCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const evs = gyCalDayEvents(char, key);
        const shown = evs.slice(0, maxLines).map(e =>
            `<div class="gy-cal-ev${e.done ? ' done' : ''}" title="${esc(e.text)}"><i class="gy-dot ${e.cls}"></i>${esc(e.text)}</div>`).join('');
        const more = evs.length > maxLines ? `<div class="gy-cal-more">还有 ${evs.length - maxLines} 项</div>` : '';
        const cls = ['gy-cal-cell'];
        if (key === todayKey) cls.push('today');
        if (key === gyCalSelected) cls.push('selected');
        cells += `<div class="${cls.join(' ')}" onclick="charCalendarPickDay('${key}')">
            <span class="gy-cal-daynum">${d}</span>${shown}${more}</div>`;
    }
    // 补满最后一行，不然最后几格没有边框看着缺一块
    const total = startPad + daysInMonth;
    for (let i = total; i % 7 !== 0; i++) cells += `<div class="gy-cal-cell other-month"></div>`;
    grid.innerHTML = cells;
    renderCharCalendarDayDetail();
}
function gyCalJumpMonth(m) {
    gyCalMonth = m;
    setCalendarRange('month');
}

// 选中那天的详情：日程全文 + 纪念日 + 待办。格子里只放得下摘要，完整内容看这里。
function renderCharCalendarDayDetail() {
    const box = document.getElementById('charCalendarDayDetail');
    if (!box) return;
    const char = gyCalChar();
    if (!char || !gyCalSelected) { box.innerHTML = ''; return; }
    const data = gyCalDayData(char, gyCalSelected);
    const esc = s2 => (typeof escapeHtml === 'function') ? escapeHtml(s2 || '') : String(s2 || '');
    let html = `<div style="font-size:14px; font-weight:bold; color:#0f1419; margin-bottom:6px;">${gyCalSelected}</div>`;

    if (data.anniversaries.length) {
        html += `<div class="gy-cal-sec ann"><h5>💗 纪念日</h5>` + data.anniversaries.map(a =>
            `<div>${esc(a.event)}${a.years ? `　<span style="color:#8b98a5;">· ${a.years} 周年</span>` : ''}</div>`).join('') + `</div>`;
    }
    if (data.schedules.length) {
        html += `<div class="gy-cal-sec"><h5>🗓️ 当天日程${data.schedules.some(x => x.isToday) ? '（当前生效的这一份）' : ''}</h5>`
            + data.schedules.map(x => `<pre>${esc(x.text)}</pre>`).join('<hr style="border:none;border-top:1px dashed #cfd9de;margin:6px 0;">') + `</div>`;
    }
    if (data.todos.length) {
        html += `<div class="gy-cal-sec todo"><h5>✅ 这天的待办</h5>` + data.todos.map(t =>
            `<div${t.done ? ' style="text-decoration:line-through;color:#8b98a5;"' : ''}>${esc(t.text)}</div>`).join('') + `</div>`;
    }
    if (!data.anniversaries.length && !data.schedules.length && !data.todos.length) {
        const future = gyCalSelected > gyDateKey(new Date());
        html += `<div style="color:#8b98a5; font-size:12px; padding:8px 0;">${future ? '这天还没到，也还没安排什么。' : '这天没有留下日程/纪念日/待办。日程是每天自动更新时才归档的，更早的日子可能没有记录。'}</div>`;
    }
    box.innerHTML = html;
}

// ---------- ＋添加：日程 / 纪念日 / 待办，加在选中的那一天 ----------
function openCalendarAddBox() {
    const box = document.getElementById('charCalendarAddBox');
    if (!box) return;
    box.style.display = 'block';
    const dateEl = document.getElementById('calAddDate');
    if (dateEl) dateEl.value = gyCalSelected || gyDateKey(new Date());
    const textEl = document.getElementById('calAddText');
    if (textEl) { textEl.value = ''; textEl.focus(); }
}
function closeCalendarAddBox() {
    const box = document.getElementById('charCalendarAddBox');
    if (box) box.style.display = 'none';
}
function submitCalendarAdd() {
    const char = gyCalChar();
    if (!char) return (typeof appAlert === 'function' ? appAlert('没找到当前角色。') : alert('没找到当前角色'));
    const type = document.getElementById('calAddType')?.value || 'todo';
    const date = document.getElementById('calAddDate')?.value || '';
    const text = (document.getElementById('calAddText')?.value || '').trim();
    if (!text) return (typeof appAlert === 'function' ? appAlert('先写点内容。') : alert('先写点内容。'));

    if (type === 'todo') {
        getCharTodos(char).push({
            id: 'todo_' + Date.now() + Math.floor(Math.random() * 1000),
            text, date: date || null, done: false, createdAt: Date.now(), doneAt: null, source: 'user'
        });
    } else if (type === 'anniversary') {
        if (!date) return (typeof appAlert === 'function' ? appAlert('纪念日要选一个日期。') : alert('纪念日要选一个日期。'));
        if (!Array.isArray(char.anniversaries)) char.anniversaries = [];
        char.anniversaries.push({ id: 'anniv_' + Date.now(), date, event: text });
    } else {
        if (!date) return (typeof appAlert === 'function' ? appAlert('日程要选一个日期。') : alert('日程要选一个日期。'));
        // 手动加的日程直接写进归档里（跟自动归档同一个结构），这样月历和"生活轨迹总结"都能读到。
        // 选的是今天的话，同时也更新"当前生效的那份日程"，不然角色自己还不知道。
        if (!Array.isArray(char.scheduleHistory)) char.scheduleHistory = [];
        const at = new Date(date + 'T12:00:00').getTime();
        const day = new Date(at).toDateString();
        const exist = char.scheduleHistory.find(h => h && h.day === day);
        if (exist) exist.text = (exist.text ? exist.text + '\n' : '') + text;
        else char.scheduleHistory.push({ day, at, text });
        char.scheduleHistory.sort((a, b) => (a.at || 0) - (b.at || 0));
        if (date === gyDateKey(new Date())) {
            char.schedule = { text: (char.schedule && char.schedule.text ? char.schedule.text + '\n' : '') + text, generatedAt: Date.now() };
        }
    }
    if (typeof saveAllData === 'function') saveAllData();
    gyCalSelected = date || gyCalSelected;
    closeCalendarAddBox();
    renderCharCalendarGrid();
    renderCharTodoList();
}

// ===================== ✅ 待办清单 =====================
// 跟日程是两回事：日程是"今天几点做什么"，一天一换；待办是"还没办的事"，跨天存在、办完才消失。
// 日期可以留空——"不定哪天，但一直记着"这类事（答应过的、惦记着的）才是待办的主力。
// 以后角色"自己决定要做什么"的时候，这份清单就是它的依据（比如桂花糕买到了 → 发条推文）。
function getCharTodos(char) {
    if (!char) return [];
    if (!Array.isArray(char.todos)) char.todos = [];
    return char.todos;
}
function addCharTodo() {
    const char = gyCalChar();
    if (!char) return (typeof appAlert === 'function' ? appAlert('没找到当前角色，重新打开一下资料页。') : alert('没找到当前角色'));
    const textEl = document.getElementById('newTodoText');
    const dateEl = document.getElementById('newTodoDate');
    const text = (textEl?.value || '').trim();
    if (!text) return (typeof appAlert === 'function' ? appAlert('先写一下要办什么事。') : alert('先写一下要办什么事。'));
    getCharTodos(char).push({
        id: 'todo_' + Date.now() + Math.floor(Math.random() * 1000),
        text, date: (dateEl?.value || '') || null,
        done: false, createdAt: Date.now(), doneAt: null, source: 'user'
    });
    if (textEl) textEl.value = '';
    if (dateEl) dateEl.value = '';
    if (typeof saveAllData === 'function') saveAllData();
    renderCharTodoList();
    renderCharCalendarGrid();
}
function toggleCharTodo(id, done) {
    const char = gyCalChar(); if (!char) return;
    const t = getCharTodos(char).find(x => x.id === id); if (!t) return;
    t.done = !!done; t.doneAt = done ? Date.now() : null;
    if (typeof saveAllData === 'function') saveAllData();
    renderCharTodoList();
}
async function deleteCharTodo(id) {
    const char = gyCalChar(); if (!char) return;
    const t = getCharTodos(char).find(x => x.id === id);
    if (t && typeof appConfirm === 'function' && !(await appConfirm(`删掉这条待办？\n\n${t.text}`))) return;
    char.todos = getCharTodos(char).filter(x => x.id !== id);
    if (typeof saveAllData === 'function') saveAllData();
    renderCharTodoList();
    renderCharCalendarGrid();
}
function renderCharTodoList() {
    const box = document.getElementById('charTodoList');
    if (!box) return;
    const char = gyCalChar();
    const list = getCharTodos(char).slice().sort((a, b) => {
        if (!!a.done !== !!b.done) return a.done ? 1 : -1;       // 没办的排前面
        const ad = a.date || '9999-99-99', bd = b.date || '9999-99-99';
        if (ad !== bd) return ad < bd ? -1 : 1;                   // 有日期的按日期，没日期的垫底
        return (a.createdAt || 0) - (b.createdAt || 0);
    });
    if (list.length === 0) { box.innerHTML = `<div style="font-size:12px; color:#8b98a5;">还没有待办。</div>`; return; }
    const esc = s => (typeof escapeHtml === 'function') ? escapeHtml(s || '') : String(s || '');
    const todayKey = gyDateKey(new Date());
    box.innerHTML = list.map(t => {
        const overdue = !t.done && t.date && t.date < todayKey;
        const meta = [
            t.date ? (overdue ? `<span style="color:#f91880;">${t.date} · 已过期</span>` : t.date) : '不定哪天',
            t.source === 'ai' ? '角色自己记下的' : ''
        ].filter(Boolean).join(' · ');
        return `<div class="gy-todo-row${t.done ? ' done' : ''}" data-todo-id="${t.id}">
            <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleCharTodo('${t.id}', this.checked)">
            <div class="gy-todo-main" ondblclick="startEditCharTodo('${t.id}')" title="双击可以改">
                <div class="gy-todo-text">${esc(t.text)}</div>
                <div class="gy-todo-meta">${meta}</div>
            </div>
            <span class="gy-todo-del" onclick="deleteCharTodo('${t.id}')">×</span>
        </div>`;
    }).join('');
}

// ✏️ 双击改一条待办：就地把这一行换成输入框，回车保存 / Esc 取消 / 点别处也保存。
// 不做弹窗是因为待办改起来通常只是顺手挪个日期、改两个字，弹窗反而重。
function startEditCharTodo(id) {
    const char = gyCalChar(); if (!char) return;
    const t = getCharTodos(char).find(x => x.id === id); if (!t) return;
    const row = document.querySelector(`.gy-todo-row[data-todo-id="${id}"] .gy-todo-main`);
    if (!row || row.dataset.editing === '1') return;
    row.dataset.editing = '1';
    const esc = s => (typeof escapeHtml === 'function') ? escapeHtml(s || '') : String(s || '');
    row.innerHTML = `<div class="gy-todo-edit">
        <input type="text" class="gy-todo-edit-text" value="${esc(t.text)}">
        <input type="date" class="gy-todo-edit-date" value="${t.date || ''}">
        <button type="button" onclick="commitEditCharTodo('${id}')">保存</button>
        <button type="button" class="cancel" onclick="renderCharTodoList()">取消</button>
        <div class="gy-todo-edit-hint">回车保存，Esc 取消。日期留空 ＝ 不定哪天。</div>
    </div>`;
    const textEl = row.querySelector('.gy-todo-edit-text');
    const dateEl = row.querySelector('.gy-todo-edit-date');
    if (textEl) {
        textEl.focus();
        textEl.setSelectionRange(textEl.value.length, textEl.value.length);
        textEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); commitEditCharTodo(id); }
            else if (e.key === 'Escape') { e.preventDefault(); renderCharTodoList(); }
        });
    }
    if (dateEl) dateEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commitEditCharTodo(id); }
        else if (e.key === 'Escape') { e.preventDefault(); renderCharTodoList(); }
    });
}
function commitEditCharTodo(id) {
    const char = gyCalChar(); if (!char) return;
    const t = getCharTodos(char).find(x => x.id === id); if (!t) return renderCharTodoList();
    const row = document.querySelector(`.gy-todo-row[data-todo-id="${id}"] .gy-todo-main`);
    if (!row) return renderCharTodoList();
    const text = (row.querySelector('.gy-todo-edit-text')?.value || '').trim();
    const date = (row.querySelector('.gy-todo-edit-date')?.value || '') || null;
    // 内容清空 ＝ 用户想删掉这条，但删是不可逆的，所以问一句而不是直接删
    if (!text) { renderCharTodoList(); return; }
    t.text = text;
    t.date = date;
    t.editedAt = Date.now();
    if (typeof saveAllData === 'function') saveAllData();
    renderCharTodoList();
    if (typeof renderCharCalendarGrid === 'function') renderCharCalendarGrid();
}

// 🤖 让角色自己写待办：结合人设 + 今天的日程 + 你们最近的聊天 + TA 最近发的推文 + 已有的待办，
// 让 TA 自己想几件"还惦记着没办"的事。除了跟你有关的，也允许写纯属 TA 自己的兴趣（练琴、追的剧、
// 想去的店），因为一个人的待办本来就不会全是关于另一个人的——全是的话反而假。
// regenerate=true：只换掉"TA 自己记下的、还没办完的"，你手写的和已经打勾的一律保留。
async function generateCharTodosAI(regenerate) {
    const char = gyCalChar();
    if (!char) return (typeof appAlert === 'function' ? appAlert('没找到当前角色，重新打开一下资料页。') : alert('没找到当前角色'));
    if (typeof getApiConfig !== 'function') return;
    const api = getApiConfig(true);
    if (!api.key) return (typeof appAlert === 'function' ? appAlert('请先在设置里配置 API Key。') : alert('请先配置 API Key'));
    if (generateCharTodosAI._busy) return;

    const btns = Array.from(document.querySelectorAll('.gy-todo-aibtn'));
    const olds = btns.map(b => b.innerText);
    generateCharTodosAI._busy = true;
    btns.forEach(b => { b.disabled = true; });
    if (btns[0]) btns[0].innerText = '正在想…';

    try {
        const all = getCharTodos(char);
        // 重新生成时先把"AI 写的、还没办完的"挑出来待删——但要等生成成功了再真删，
        // 不然请求失败就白白把原来的清单弄没了。
        const keep = regenerate ? all.filter(t => t.done || t.source !== 'ai') : all.slice();
        const existingText = keep.map(t => t.text).filter(Boolean);

        const recentChat = (typeof getRecentChatContext === 'function') ? (getRecentChatContext(char.id) || '') : '';
        const recentPosts = (typeof getCharRecentPosts === 'function')
            ? getCharRecentPosts(char.id, 8).map(p => p.text).join('\n') : '';
        const scheduleText = (char.schedule && char.schedule.text) ? char.schedule.text : '';
        const doneRecently = all.filter(t => t.done).slice(-6).map(t => t.text);
        const todayKey = gyDateKey(new Date());

        const ask = `现在的真实时间：${new Date().toLocaleString('zh-CN', { hour12: false, weekday: 'long' })}（今天是 ${todayKey}）。

请以你自己的身份，列出你现在"还惦记着、但还没办"的事，也就是你的待办清单。

【今天的日程】：
${scheduleText || '（还没安排）'}

【你最近发过的动态】：
${recentPosts || '（暂无）'}

【你和${(typeof userDisplayName === 'function') ? userDisplayName(char) : '用户'}最近的聊天】：
${recentChat || '（暂无）'}

【清单上已经有的（不要重复，也不要换个说法再写一遍）】：
${existingText.length ? existingText.map(t => '· ' + t).join('\n') : '（空）'}

【你最近已经办完的（说明这些别再写了）】：
${doneRecently.length ? doneRecently.map(t => '· ' + t).join('\n') : '（暂无）'}

要求：
1. 写 3～5 条，每条 20 字以内，就是一句"要做的事"，不要解释、不要加编号。
2. 必须真的像你会惦记的事：跟你的身份、职业、生活习惯、正在进行的剧情对得上。
3. 不要全是关于${(typeof userDisplayName === 'function') ? userDisplayName(char) : '用户'}的——一个人的待办本来就有一多半是自己的事（工作上的、爱好上的、身体上的、想买想吃想去的）。请至少有一半是纯属你自己的事。
4. 允许写只有你才会在意的小事，越具体越好（"把左手第三根弦换掉"好过"练琴"）。
5. date 字段：明确有日子的才填 YYYY-MM-DD（比如日程里提到的、约好的），大部分应该留空字符串——"不定哪天但一直记着"才是待办的常态。
6. 已经在日程里今天就会做完的事不要写进待办（那是日程不是待办）。

请严格只返回 JSON 数组，不要用 \`\`\` 包裹，不要写任何别的话：
[{"text":"要做的事","date":""}]`;

        const messages = buildStructuredMessages(buildBasePrompt(char, true, recentChat), [], ask);
        const data = await callChatCompletionAPI(api, messages);
        let raw = (data.choices?.[0]?.message?.content || '').trim();
        raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

        // 同样走统一入口：模型带思考过程 / 带 ``` 围栏 / 前后多说了两句，都能兜住
        let arr = (typeof parseModelJson === 'function') ? parseModelJson(raw) : null;
        if (!Array.isArray(arr) || arr.length === 0) throw new Error('返回的内容看不懂，没能解析成清单');

        // 生成成功了，这时候才动原来的数据
        if (regenerate) char.todos = keep;
        const list = getCharTodos(char);
        const seen = new Set(list.map(t => String(t.text || '').trim()));
        let added = 0;
        arr.slice(0, 6).forEach((it, i) => {
            const text = String((it && (it.text || it.title)) || '').trim().replace(/^[\d.、·\-\s]+/, '');
            if (!text || seen.has(text)) return;
            seen.add(text);
            const d = String((it && it.date) || '').trim();
            list.push({
                id: 'todo_' + Date.now() + '_' + i + Math.floor(Math.random() * 1000),
                text: text.slice(0, 60),
                date: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null,
                done: false, createdAt: Date.now(), doneAt: null, source: 'ai'
            });
            added++;
        });
        if (typeof saveAllData === 'function') saveAllData();
        renderCharTodoList();
        if (typeof renderCharCalendarGrid === 'function') renderCharCalendarGrid();
        if (typeof showToast === 'function') {
            showToast((typeof getAvatarHTML === 'function') ? getAvatarHTML(char, 40) : '',
                regenerate ? '重新写了一份' : 'TA 记下了几件事',
                `${char.name} 往待办清单里加了 ${added} 条。`, null, null, false);
        }
    } catch (e) {
        console.error('生成待办失败：', e);
        if (typeof appAlert === 'function') appAlert('这次没生成出来：' + (e.message || e));
    } finally {
        generateCharTodosAI._busy = false;
        btns.forEach((b, i) => { b.disabled = false; b.innerText = olds[i]; });
    }
}

// 自动补待办：日程更新完、或者角色自主行动时调用。
// 只有在"没剩几条没办的"时候才补，不然会越堆越多；而且走开关，关了就一次 API 都不调。
async function autoTopUpCharTodos(char, opts) {
    if (!char) return false;
    if (typeof isAutoOn === 'function' && !isAutoOn('autoTodoGen')) return false;
    const api = (typeof getApiConfig === 'function') ? getApiConfig(true) : null;
    if (!api || !api.key) return false;
    const list = Array.isArray(char.todos) ? char.todos : [];
    const openCount = list.filter(t => t && !t.done).length;
    const threshold = (opts && typeof opts.threshold === 'number') ? opts.threshold : 2;
    if (openCount > threshold) return false;
    // 一天最多自动补一次，避免定时器每转一圈就来一发
    const todayKey = gyDateKey(new Date());
    if (char.lastTodoAutoGenDay === todayKey && !(opts && opts.force)) return false;
    char.lastTodoAutoGenDay = todayKey;
    try {
        await generateCharTodosForChar(char, false);
        return true;
    } catch (e) { console.error('自动补待办失败：', e); return false; }
}

// generateCharTodosAI 是"资料页上点按钮"的版本（要读当前打开的是谁、要动按钮状态）；
// 这个是纯数据版，给定时器和自主行动用，不碰任何界面元素。
async function generateCharTodosForChar(char, regenerate) {
    if (!char) return 0;
    const api = getApiConfig(true);
    if (!api.key) return 0;
    const all = Array.isArray(char.todos) ? char.todos : (char.todos = []);
    const keep = regenerate ? all.filter(t => t.done || t.source !== 'ai') : all.slice();
    const existingText = keep.map(t => t.text).filter(Boolean);
    const recentChat = (typeof getRecentChatContext === 'function') ? (getRecentChatContext(char.id) || '') : '';
    const recentPosts = (typeof getCharRecentPosts === 'function')
        ? getCharRecentPosts(char.id, 6).map(p => p.text).join('\n') : '';
    const scheduleText = (char.schedule && char.schedule.text) ? char.schedule.text : '';
    const who = (typeof userDisplayName === 'function') ? userDisplayName(char) : '用户';

    const ask = `现在的真实时间：${new Date().toLocaleString('zh-CN', { hour12: false, weekday: 'long' })}。
请以你自己的身份，列出你现在"还惦记着、但还没办"的事（待办清单）。

【今天的日程】：\n${scheduleText || '（还没安排）'}
【你最近发过的动态】：\n${recentPosts || '（暂无）'}
【你和${who}最近的聊天】：\n${recentChat || '（暂无）'}
【已经有的，别重复】：\n${existingText.length ? existingText.map(t => '· ' + t).join('\n') : '（空）'}

要求：写 2～4 条，每条 20 字以内；必须符合你的身份和当前剧情；至少一半是纯属你自己的事（工作、爱好、身体、想买想吃想去的），不要全围着${who}转；越具体越好。date 只有明确有日子的才填 YYYY-MM-DD，其余留空字符串。
严格只返回 JSON 数组，不要用 \`\`\` 包裹：[{"text":"要做的事","date":""}]`;

    const messages = buildStructuredMessages(buildBasePrompt(char, true, recentChat), [], ask);
    const data = await callChatCompletionAPI(api, messages);
    let raw = (data.choices?.[0]?.message?.content || '').trim();
    raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    let arr = (typeof parseModelJson === 'function') ? parseModelJson(raw) : null;
    if (!Array.isArray(arr)) return 0;
    if (regenerate) char.todos = keep;
    const list = Array.isArray(char.todos) ? char.todos : (char.todos = []);
    const seen = new Set(list.map(t => String(t.text || '').trim()));
    let added = 0;
    arr.slice(0, 4).forEach((it, i) => {
        const text = String((it && (it.text || it.title)) || '').trim().replace(/^[\d.、·\-\s]+/, '');
        if (!text || seen.has(text)) return;
        seen.add(text);
        const d = String((it && it.date) || '').trim();
        list.push({
            id: 'todo_' + Date.now() + '_a' + i + Math.floor(Math.random() * 1000),
            text: text.slice(0, 60),
            date: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null,
            done: false, createdAt: Date.now(), doneAt: null, source: 'ai'
        });
        added++;
    });
    if (added && typeof saveAllData === 'function') saveAllData();
    return added;
}

async function generateCharAnniversaryNote() {
    const charId = currentProfileId;
    const char = myCharacters.find(c => c.id == charId); if (!char) return;
    const api = getApiConfig(true); if (!api.key) return alert('请先在设置中配置 API 密钥！');

    const btn = document.getElementById('charAnniversaryNoteBtn');
    btn.disabled = true; btn.innerText = '生成中...';

    const history = globalChats[charId];
    const daysSince = history && history.length > 0 ? Math.floor((Date.now() - history[0].timestamp) / 86400000) : 0;
    const memories = memoryAlbum.filter(m => m.charId == charId).slice(0, 8).map(m => m.text).join('\n---\n');

    const prompt = `你是"${char.name}"，人设：${char.persona}。
你和用户已经认识 ${daysSince} 天了。
以下是你们之间被收藏下来的一些高光回忆片段：
${memories || '（暂时还没有被收藏的回忆）'}

请以你自己的口吻，写一段简短的纪念寄语给用户（不超过100字），可以回顾一下这段时间，也可以只是很自然地表达你此刻的心情，要符合你的人设和语气，不要写成正式的贺卡文案，就像你会亲口对用户说的话一样。直接输出内容，不要加引号或多余说明。`;

    try {
        const data = await sendChatRequest(api, prompt);
        if (data.error) throw new Error(data.error.message);
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text) throw new Error('生成内容为空');
        const noteEl = document.getElementById('charAnniversaryNoteText');
        noteEl.innerText = text; noteEl.style.display = 'block';
    } catch (e) { alert('生成失败：' + e.message); }
    btn.disabled = false; btn.innerText = '✨ 生成一段纪念寄语';
}

// ---------- 聊天联系人：排序/筛选/置顶 通用工具 ----------
function getLastMsgTime(sessionId) {
    const msgs = globalChats[sessionId];
    if (!msgs || msgs.length === 0) return 0;
    return msgs[msgs.length - 1].timestamp || 0;
}
function chatHasUnread(sessionId) {
    const msgs = globalChats[sessionId];
    return !!(msgs && msgs.some(m => m.sender !== 'me' && m.sender !== 'system' && (!m.readBy || !m.readBy.includes('me'))));
}
function getChatListItems() {
    return [...groupChats, ...myCharacters].map(x => ({
        id: x.id, name: x.name, raw: x, isGroup: !!x.members,
        group: x.members ? null : (x.group || null), // 群聊没有分组概念，统一按"未分组"处理
    }));
}
function sortChatListItems(items) {
    const isPinnedId = (id) => pinnedSessionIds.some(pid => pid == id);
    const pinned = items.filter(it => isPinnedId(it.id));
    const unpinned = items.filter(it => !isPinnedId(it.id));
    function cmp(a, b) {
        const aU = chatHasUnread(a.id), bU = chatHasUnread(b.id);
        if (aU !== bU) return aU ? -1 : 1;
        return getLastMsgTime(b.id) - getLastMsgTime(a.id);
    }
    pinned.sort(cmp); unpinned.sort(cmp);
    return [...pinned, ...unpinned];
}
function toggleChatPin(id) {
    const idx = pinnedSessionIds.findIndex(pid => pid == id);
    if (idx >= 0) pinnedSessionIds.splice(idx, 1); else pinnedSessionIds.push(id);
    saveAllData();
    renderChatCharList();
}
function toggleChatListViewMode() {
    chatListViewMode = chatListViewMode === 'row' ? 'list' : 'row';
    if (chatListViewMode === 'list') chatListShowingList = true;
    saveAllData();
    renderChatCharList();
}
function backToContactList() {
    chatListShowingList = true;
    renderChatCharList();
}

// ---------- 主入口：根据当前视图模式分派渲染 ----------
function renderChatCharList() {
    const toggleBtn = document.getElementById('chatListViewToggleBtn');
    if (toggleBtn) toggleBtn.textContent = chatListViewMode === 'row' ? '☰ 列表' : '▦ 头像条';

    const rowContainer = document.getElementById('chatCharRow');
    const listContainer = document.getElementById('chatListVertical');
    const backBtn = document.getElementById('chatListBackBtn');
    const messagesArea = document.getElementById('chatMessagesArea');
    const inputArea = document.getElementById('chatInputArea');

    if (chatListViewMode === 'row') {
        // 头像条模式：联系人条和聊天内容一直同时显示，跟以前一样
        if (rowContainer) rowContainer.style.display = 'flex';
        if (listContainer) listContainer.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';
        if (messagesArea) messagesArea.style.display = 'flex';
        renderChatCharRow();
    } else {
        // 竖排列表模式：列表和聊天内容二选一显示，点进某个联系人才看到聊天界面
        if (rowContainer) rowContainer.style.display = 'none';
        if (chatListShowingList) {
            if (listContainer) listContainer.style.display = 'flex';
            if (backBtn) backBtn.style.display = 'none';
            if (messagesArea) messagesArea.style.display = 'none';
            if (inputArea) inputArea.style.display = 'none';
            renderChatCharListVertical();
        } else {
            if (listContainer) listContainer.style.display = 'none';
            if (backBtn) backBtn.style.display = 'inline-block';
            if (messagesArea) messagesArea.style.display = 'flex';
            // inputArea 的显示由 switchChatSession 自己控制，这里不用管
        }
    }
}

// ---------- 视图一：横向头像条（原有样式，加了排序/筛选/置顶）----------
function renderChatCharRow() {
    const container = document.getElementById('chatCharRow');
    if (!container) return;
    let html = '';
    const items = sortChatListItems(getChatListItems());
    items.forEach(it => {
        const x = it.raw;
        let hasUnread = chatHasUnread(x.id);
        let unreadHtml = hasUnread ? `<div style="position:absolute; top:-2px; right:-2px; width:14px; height:14px; background:#f91880; border-radius:50%; border:2px solid white; z-index:2;"></div>` : '';
        let branchHtml = x.branchedFrom ? `<div style="position:absolute; bottom:-2px; left:-2px; font-size:12px; z-index:2;" title="分支自：${x.branchedFromName || '未知'}">🌳</div>` : '';
        const isGroupItem = !!x.members;
        // 👇这里加入了手机长按的支持；置顶操作收纳进右键/长按菜单，头像上不再显示图钉图标
        html += `<div class="chat-char-item ${currentChatSessionId == x.id ? 'active' : ''}" onclick="switchChatSession('${x.id}')">
            <div style="position:relative; display:inline-block;" ${isGroupItem ? `oncontextmenu="showGroupAvatarContextMenu(event, '${x.id}')" ontouchstart="groupAvatarTouchStart(event, '${x.id}')" ontouchend="groupAvatarTouchEnd(event)" ontouchmove="groupAvatarTouchEnd(event)"` : `oncontextmenu="showAvatarContextMenu(event, '${x.id}')" ontouchstart="avatarTouchStart(event, '${x.id}')" ontouchend="avatarTouchEnd(event)" ontouchmove="avatarTouchEnd(event)"`}>${x.members ? getGroupAvatarHTML(x, 50) : getAvatarHTML(x, 50)}${unreadHtml}${branchHtml}</div>
            <div class="chat-char-name" style="font-size:12px; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center;">${x.name}</div>
        </div>`;
    });
    container.innerHTML = html;
}

// ---------- 视图二：竖排列表（头像+名字+最后消息预览+时间+未读点+置顶按钮）----------
function renderChatCharListVertical() {
    const container = document.getElementById('chatListVertical');
    if (!container) return;
    let html = '';
    const items = sortChatListItems(getChatListItems());
    items.forEach(it => {
        const x = it.raw;
        const isPinned = pinnedSessionIds.some(pid => pid == x.id);
        const hasUnread = chatHasUnread(x.id);
        const msgs = globalChats[x.id] || [];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        let previewText = '暂无消息';
        if (lastMsg) {
            if (lastMsg.sender === 'system') previewText = lastMsg.text;
            else if (lastMsg.sender === 'me') previewText = `我：${lastMsg.text}`;
            else {
                const senderChar = myCharacters.find(c => c.id == lastMsg.sender);
                previewText = x.members ? `${senderChar ? senderChar.name : '未知'}：${lastMsg.text}` : lastMsg.text;
            }
            previewText = String(previewText).replace(/\n/g, ' ').slice(0, 30);
        }
        const timeText = lastMsg ? timeAgo(lastMsg.timestamp) : '';
        const isGroupItem = !!x.members;
        // 置顶操作收纳进右键/长按菜单，行内不再显示图钉图标；长按沿用和头像条模式一样的手机端支持
        const ctxAttrs = isGroupItem
            ? `oncontextmenu="showGroupAvatarContextMenu(event, '${x.id}')" ontouchstart="groupAvatarTouchStart(event, '${x.id}')" ontouchend="groupAvatarTouchEnd(event)" ontouchmove="groupAvatarTouchEnd(event)"`
            : `oncontextmenu="showAvatarContextMenu(event, '${x.id}')" ontouchstart="avatarTouchStart(event, '${x.id}')" ontouchend="avatarTouchEnd(event)" ontouchmove="avatarTouchEnd(event)"`;
        html += `<div class="chat-list-row ${currentChatSessionId == x.id ? 'active' : ''} ${isPinned ? 'pinned' : ''}" onclick="switchChatSession('${x.id}')" ${ctxAttrs}>
            <div style="position:relative; flex-shrink:0;">${x.members ? getGroupAvatarHTML(x, 44) : getAvatarHTML(x, 44)}${hasUnread ? '<div class="chat-list-unread-dot"></div>' : ''}</div>
            <div class="chat-list-info">
                <div class="chat-list-top-row"><span class="chat-list-name">${isPinned ? '📌 ' : ''}${escapeHtml(x.name)}</span><span class="chat-list-time">${timeText}</span></div>
                <div class="chat-list-preview">${escapeHtml(previewText)}</div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function updateGroupSpeakOrder() {
    const g = groupChats.find(g => g.id === currentSummaryCharId);
    if (!g) return;
    g.speakOrder = document.getElementById('groupSpeakOrderSelect').value;
    saveAllData();
}

function exportChatTxt() {
    if(!currentSummaryCharId) return; let session = globalChats[currentSummaryCharId] || []; if(session.length === 0) return alert("当前聊天记录为空！");
    let txt = session.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender === 'me' ? currentUser.name : (m.sender === 'system' ? '系统' : (myCharacters.find(c=>c.id==m.sender)?.name || m.sender))}: ${m.text}`).join('\n');
    saveTextFileForApp(`chat_${currentSummaryCharId}.txt`, txt, 'text/plain');
}

function importChatTxt(event) {
    let file = event.target.files[0]; if(!file) return; let reader = new FileReader();
    reader.onload = function(e) {
        let lines = e.target.result.split('\n'); if(!globalChats[currentSummaryCharId]) globalChats[currentSummaryCharId] = [];
        let session = globalChats[currentSummaryCharId], nameMap = { [currentUser.name]: 'me', '用户': 'me', '我': 'me', '系统': 'system', 'system': 'system' };
        myCharacters.forEach(c => { nameMap[c.name] = c.id; });
        lines.forEach(line => {
            let match = line.trim().match(/^\[(.*?)\]\s*(.*?):\s*(.*)$/);
            if(match) { let senderId = nameMap[match[2].trim()] || 'system'; session.push({ sender: senderId, text: senderId === 'system' && match[2].trim() !== '系统' ? `${match[2]}: ${match[3]}` : match[3].trim(), timestamp: new Date(match[1]).getTime() || Date.now(), readBy: [] }); } 
            else if(line.trim()) { session.push({ sender: 'system', text: line.trim(), timestamp: Date.now() }); }
        });
        saveAllData(); if (currentChatSessionId === currentSummaryCharId) renderChatMessages(); alert("TXT导入成功！"); closeModal('chatTxtModal'); document.getElementById('importTxtInput').value = '';
    };
    reader.readAsText(file);
}

// ST的 send_date 常见是"April 26, 2026 6:06am"这种人写的格式（月份全称+逗号+12小时制，am/pm前面没有空格），
// 浏览器原生 Date.parse 认不出这种没空格的写法会直接返回NaN——实测在 am/pm 前面补一个空格就能正常解析了，
// 所以第一次解析失败时，再补个空格重试一次；两次都失败就说明格式实在太特殊，返回NaN让调用方自己兜底成当前时间。
function tryParseSendDate(str) {
    let parsed = Date.parse(str);
    if (!isNaN(parsed)) return parsed;
    const spaced = str.replace(/(\d)(am|pm)\b/i, '$1 $2');
    parsed = Date.parse(spaced);
    return isNaN(parsed) ? NaN : parsed;
}
// 导入 SillyTavern 的原生聊天记录文件(.jsonl)：这是ST每个角色单独的聊天日志格式，逐行都是一个独立JSON对象——
// 第一行是"头信息"(user_name/character_name/chat_metadata)，从第二行起才是一条条真正的消息。
// 消息行格式：{name, is_user, is_system(可选), send_date, mes, extra:{display_text?}, swipe_id?, swipes?}。
// 因为这个按钮是从"某个角色"的聊天选项弹窗里点开的，天然知道要导入到哪个角色身上，不用再额外选一次角色。
function importChatJsonl(event) {
    const file = event.target.files[0]; if (!file) return;
    const cleanReasoning = document.getElementById('jsonlImportCleanReasoning') ? document.getElementById('jsonlImportCleanReasoning').checked : true;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const rawLines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
            if (rawLines.length === 0) { alert('这个文件是空的，没有可以导入的内容。'); return; }

            // 第一行是头信息，不是消息——按ST的真实格式判断：包含 user_name / character_name / chat_metadata 这几个字段之一
            // 就当作头信息跳过；万一格式不标准（比如手动拼过的文件）导致第一行判断不出来，就干脆整份当消息处理，
            // 后面逐行解析失败的行会自动跳过，不会导致整个导入失败。
            let startIdx = 0;
            try {
                const first = JSON.parse(rawLines[0]);
                if (first && (first.user_name !== undefined || first.character_name !== undefined || first.chat_metadata !== undefined)) startIdx = 1;
            } catch (e2) { /* 第一行解析不了就当成普通消息处理，不跳过 */ }

            if (!globalChats[currentSummaryCharId]) globalChats[currentSummaryCharId] = [];
            const session = globalChats[currentSummaryCharId];
            let importedCount = 0, skippedCount = 0;

            for (let i = startIdx; i < rawLines.length; i++) {
                let msg;
                try { msg = JSON.parse(rawLines[i]); } catch (e3) { skippedCount++; continue; }
                if (!msg || typeof msg !== 'object') { skippedCount++; continue; }
                let text = (msg.extra && msg.extra.display_text) || msg.mes;
                // 用跟直播生成同一套"前缀/后缀可配置"规则处理（设置里的思维链格式列表+显示模式），
                // 而不是导入单独写死一套逻辑——这样以后加新格式/改折叠还是删除，两边行为自动保持一致。
                if (cleanReasoning && !msg.is_user && !msg.is_system) text = processReasoningInText(text);
                // 同理，导入的历史记录里如果带着MVU变量补丁块（状态栏那套），也要按当前会话的规则剥离+应用一次，
                // 不然老聊天记录导入进来照样是一堆裸JSON糊在气泡里。
                let mvuSnapshot = null;
                if (!msg.is_user && !msg.is_system) {
                    const mvuResult = processMvuPatchInText(text, currentSummaryCharId);
                    text = mvuResult.cleanText;
                    mvuSnapshot = mvuResult.snapshot;
                }
                if (!text) { skippedCount++; continue; } // 没有正文内容的行（比如只有系统元数据）没有导入的意义

                let sender;
                if (msg.is_system) sender = 'system';
                else if (msg.is_user) sender = 'me';
                else sender = currentSummaryCharId; // 非用户、非系统消息，一律算这个角色说的（ST的单角色聊天文件本来就是这么对应的）

                // send_date 这个字段在ST里格式很不统一：可能是"April 26, 2026 6:06am"这种人类可读格式，
                // 也可能是ISO字符串，甚至有些是数字形式的Unix毫秒时间戳——这里都试一遍，都解析不出来就用当前时间兜底。
                let timestamp = Date.now();
                if (typeof msg.send_date === 'number' && !isNaN(msg.send_date)) {
                    timestamp = msg.send_date;
                } else if (typeof msg.send_date === 'string' && msg.send_date.trim()) {
                    const parsed = tryParseSendDate(msg.send_date);
                    if (!isNaN(parsed)) timestamp = parsed;
                }

                session.push({ sender, text, timestamp, readBy: [], mvuSnapshot });
                importedCount++;
            }

            saveAllData();
            if (currentChatSessionId === currentSummaryCharId) renderChatMessages();
            alert(`SillyTavern聊天记录导入完成！\n成功导入 ${importedCount} 条消息${skippedCount > 0 ? `，跳过了 ${skippedCount} 条无法识别的行` : ''}。`);
            closeModal('chatTxtModal');
            document.getElementById('importJsonlInput').value = '';
        } catch (err) {
            console.error('导入jsonl聊天记录失败：', err);
            alert('导入失败：' + err.message + '\n请确认这是SillyTavern导出的.jsonl聊天文件。');
        }
    };
    reader.readAsText(file);
}

function getRecentChatContext(charId) {
    let session = globalChats[charId] || [];
    return session.slice(-chatHistoryTurns).filter(m => m.sender !== 'system').map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender === 'me' ? "用户" : "你"}: ${m.text}`).join('\n');
}

// 🆕 给"AI自己主动引用一条最近说过的话"用：把最近几条消息编个号列出来，AI在这一轮回复时可以用编号
// 点名要引用哪条（不管是用户说的还是它自己之前说的）。消息本身一直没有稳定的id字段（手动"引用回复"
// 功能也是靠临时抓取当前这条消息的{name,text}快照实现的，不依赖id），这里用同样的思路：编号只在
// 这一次生成的prompt里临时有效，AI选完号，代码从同一份list数组里按下标精确取出对应的{name,text}。
function buildQuotableRecentMessages(sessionId, char, isGroup) {
    // 💰 这里原来取最近 12 条。但这 12 条**在同一个请求里已经作为独立的 user/assistant 轮次发过一遍了**，
    // 在任务指令里再列一遍等于把聊天历史整份复制了一份，纯浪费（实测占单条聊天请求的 5~10%）。
    // 引用功能真正会用到的基本只有最近几句，取 5 条足够，编号也更短、模型更不容易选错。
    const msgs = (globalChats[sessionId] || []).slice(-5).filter(m => m.sender !== 'system' && m.text && m.text.trim());
    const list = msgs.map(m => ({
        name: m.sender === 'me' ? currentUser.name : (isGroup ? (myCharacters.find(c => c.id == m.sender)?.name || '未知') : char.name),
        text: m.text
    }));
    if (list.length === 0) return { promptText: '', list: [] };
    const linesText = list.map((m, i) => `${i + 1}. ${m.name}: ${m.text.slice(0, 60)}`).join('\n');
    const promptText = `\n【可引用的最近消息（可选功能，大部分时候不需要用）】：如果这一轮你想明确引用/回应最近说过的某一句话（不管是对方说的还是你自己之前说的），可以在其中一条回复的text最前面加上 [QUOTE:编号]（编号对照下面列表），没有特别想引用的就完全不要加这个标记：\n${linesText}\n`;
    return { promptText, list };
}


function switchChatSession(id) {
    currentChatSessionId = id.toString();
    chatListShowingList = false;
    renderChatCharList();
    const chatInput = document.getElementById('chatInputArea');
    if(chatInput) chatInput.style.display = 'flex';
    // 防御：开场白相关逻辑（角色数据/插件/宏都可能出岔子）如果在这里抛错，之前会导致下面的
    // renderChatMessages()整个都不执行——表现出来就是"新聊天开场白不显示"，其实是连聊天界面都没刷新。
    // 分开try/catch，保证不管开场白那边出不出错，聊天消息区始终会尝试渲染。
    try { sendFirstMessageIfNeeded(id.toString()); } catch (e) { console.error('生成开场白时出错，已跳过：', e); }
    try { renderChatMessages(); } catch (e) { console.error('渲染聊天消息时出错：', e); }
    checkAndAnnounceAnniversary(id.toString());
    refreshLifeStateOnChatEnter(id.toString());
    renderChatPluginActionsBar();
    refreshMiniGameIconBadge();

    // 修复：取消了原先的强制自动生成日程，现在完全由用户通过长按头像来手动生成
}

// 首次打开和某个角色的聊天（没有任何历史消息）时，如果设置了开场白，就自动发出来当第一条消息。
// 🐛 之前踩过两版坑：
// 1）多开场白时弹选择框——曾经因为触发时机在"跳转进聊天界面"之前，视觉上像是"点联系人没反应，只弹了个选择框"；
// 2）为了避开1，改成不管几个候选都直接用第一个——结果撞上不少酒馆卡的常见写法：first_mes本身写的是一份
//    "开场白目录/索引"（列出所有分支剧情的标题+简介，本身不是真的开场白正文，要靠用户从"候选开场白"里手动挑一个
//    真正的开场白），直接把这份索引当正文发出去，看起来就是"点开开场白还是一大段文字糊一脸"。
// 现在 switchChatSession 里已经先做了 currentChatSessionId赋值+renderChatCharList()把界面切到聊天页，
// 之后才会调用这个函数——也就是"跳转"这一步已经完成了，所以多候选时弹选择框不会再有当年"看起来没跳转"的问题，
// 可以放心恢复成"有多个候选就弹出来给用户挑"，避免盲目挑到像目录索引这种其实不该被直接使用的候选。
function sendFirstMessageIfNeeded(sessionId) {
    if (sessionId.startsWith('g_')) return; // 群聊不适用
    const char = myCharacters.find(c => c.id == sessionId);
    if (!char) return;
    if (globalChats[sessionId] && globalChats[sessionId].length > 0) return; // 已经聊过了就不重复发
    const options = getGreetingOptions(char);
    if (options.length === 0) return;
    // 💡 不管候选开场白有几个，统一弹出选择框——里面会带一张"不使用开场白"的卡片，
    // 用户可以自己决定要不要用、用哪个，不再对"只有一个候选"的情况静默自动帮用户选定。
    showGreetingPicker(sessionId);
}

// 汇总一个角色所有能用的开场白：自己填的开场白 + 角色卡带的候选开场白，去重后返回
function getGreetingOptions(char) {
    let options = [];
    try {
        if (char && typeof char.firstMessage === 'string' && char.firstMessage.trim()) options.push(char.firstMessage.trim());
        if (char && Array.isArray(char.alternateGreetings)) {
            char.alternateGreetings.forEach(g => {
                if (typeof g === 'string' && g.trim() && !options.includes(g.trim())) options.push(g.trim());
            });
        }
    } catch (e) { console.error('读取开场白候选列表时出错：', e); }
    return options;
}

function applyGreetingAsFirstMessage(sessionId, greetingText) {
    const char = myCharacters.find(c => c.id == sessionId);
    if (!char) return;
    // 选好了具体是哪个候选之后，正文里就不需要再带 <!-- title -->/<!-- desc --> 这两行元数据注释了
    // （那是给挑选界面看的标签，不是真的开场白正文），发到聊天里/存进存档前先去掉，不然每次都得看着这两行注释。
    const meta = parseGreetingMeta(greetingText);
    let text = meta ? meta.body : greetingText;
    try { text = applyMacros(text, char); } catch (e) { console.error('开场白宏替换出错，改用原文：', e); }
    // 开场白是角色卡作者直接写死在卡里的文本，不是AI临场生成的，但同样可能带着正则脚本要处理的占位符语法，
    // 甚至（真实遇到过）作者直接把一份"状态栏JSON补丁"的示例文本焊在了开场白里——这些跟AI回复走的是两条
    // 不同的代码路径，之前只处理了AI回复那一条，开场白这边一直漏着，导致原始JSON会原样糊出来。
    text = applyRegexScripts(text, 'ai_output', char.id);
    const mvuResult = processMvuPatchInText(text, sessionId);
    text = mvuResult.cleanText;
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    globalChats[sessionId].push({ sender: char.id, text, timestamp: Date.now(), readBy: [], mvuSnapshot: mvuResult.snapshot });
    saveAllData();
    if (currentChatSessionId === sessionId) { try { renderChatMessages(); } catch (e) { console.error('渲染聊天消息时出错：', e); } }
}

// 统一的"重新开始聊天"入口（长按头像触发）：先问要不要保留现在这段对话——
// 保留的话会自动克隆一个角色副本把旧聊天记录存进去，当前角色再清空重新开始；
// 不保留就直接清空。无论角色有几个开场白（0个/1个/多个）都能用这个入口重新开始。
async function restartChatWithGreeting(charId) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;
    const hasHistory = globalChats[charId] && globalChats[charId].length > 0;

    if (hasHistory) {
        // 💡 修复：修改提示文案与逻辑，改为将旧对话收纳进历史记录
        const keepOld = await appConfirm(`要保留现在和${char.name}的这段对话吗？\n【确定】= 将旧对话收拢归档到历史记录中（可在右键菜单查看），当前清空重新开始\n【取消】= 直接彻底清空重新开始（旧记录会丢失）`);
        if (keepOld) {
            if (!char.archivedChats) char.archivedChats = [];
            char.archivedChats.push({
                id: Date.now(),
                timeStr: new Date().toLocaleString('zh-CN'),
                messages: JSON.parse(JSON.stringify(globalChats[charId]))
            });
            saveAllData();
        }
        globalChats[charId] = [];
    }

    const options = getGreetingOptions(char);
    if (options.length === 0) {
        saveAllData();
        if (currentChatSessionId === charId) renderChatMessages();
        else switchChatSession(charId);
        alert(hasHistory ? '已经清空并重新开始了（这个角色没有设置开场白，你可以先开口打个招呼）。' : '这个角色没有设置开场白，直接开口聊就行～');
    } else {
        // 💡 不管候选开场白有几个，统一走"先跳转过去→弹出选择框（含"不使用开场白"选项）"这条路径，
        // 不再对"只有一个候选"的情况自动帮用户选定——用户始终能自己决定要不要用、用哪个开场白。
        // 🐛 修复：这里之前漏了"如果当前不在这个角色的聊天里，先跳转过去"这一步
        // （options.length === 1 的分支上面就有这一句，多开场白这条分支却漏掉了）。
        // 不加这句的话，从别的角色的聊天页/联系人列表右键"重新开始聊天"选中一个有多开场白的角色时，
        // 选完开场白后画面还留在原来那个角色的聊天里，看起来就像"点了开场白但没跳转过去"。
        if (currentChatSessionId !== charId) {
            // switchChatSession 内部的 sendFirstMessageIfNeeded 会检测到"没有历史记录+多个候选开场白"
            // 并自动弹出选择框，这里不用再手动调一次 showGreetingPicker，不然会连续弹两次（虽然内容一样、无害，但没必要）。
            switchChatSession(charId);
        } else {
            showGreetingPicker(charId);
        }
    }
}

// 不少酒馆卡的候选开场白正文最前面会带 <!-- title: xxx --> / <!-- desc: xxx --> 这种HTML注释当"元数据标题/简介"
// （这正是这次踩坑的角色卡的写法——它的first_mes本身是把所有候选开场白的title/desc汇总成一份"目录页"）。
// 挑选框如果直接把带注释语法的原始正文糊一脸，用户还是得从一堆"<!-- title: -->"里自己找有用信息——
// 这里识别到就单独抽出来做成"标题+简介"展示，正文只留一段简短预览；没有这种注释头的普通开场白就还是老样子全文预览。
function parseGreetingMeta(text) {
    const m = text.match(/^\s*<!--\s*title:\s*([\s\S]*?)\s*-->\s*(?:\r?\n)?\s*<!--\s*desc:\s*([\s\S]*?)\s*-->\s*(?:\r?\n)?([\s\S]*)$/i);
    if (!m) return null;
    return { title: m[1].trim(), desc: m[2].trim(), body: m[3].trim() };
}

// 有些角色卡的 firstMessage 本身写的不是真开场白，而是一份"目录页/索引页"
// （标题带"目录"，正文是 <greetings>0. xxx\n1. xxx...</greetings> 这种编号列表，
// 真正能用的正文其实都在 alternateGreetings 里）。这种候选选中了就是一整段索引文字糊脸上，
// 所以挑选框里要能认出它、单独标红提醒，并且排在候选列表最后面，避免用户顺手点了第一张卡就中招。
//
// 🆕 第三条判据（覆盖面最广的一条）：看**渲染出来的成品页面**是不是一份"开场白导航"。
// 起因是实测 27 张卡 478 条开场白时发现的：靠标签名穷举根本追不完——江执写 <CardIntro>、
// 蔚野写 <播客开场白>、霍司爵写 <card_info>、沉沦法则写 <encounter>，每个作者一个写法，
// 上面那两条判据只认得出 2 条，剩下的目录页全部漏网、还顶在候选列表第一个。
//
// 但这类页面有一个跨卡片通用的行为特征：它的每一个可点条目都调
// setChatMessages([{message_id:0, swipe_id:N}]) 跳到第 N 条开场白。
// 干扰项是——几乎每张卡的**正式**开场白底部也都挂了一个"回到首页"按钮，调的是同一个接口。
// 区别在于：回到首页的目标恒定是第 0 条（目录页自己），而目录页会指向一堆**别的**编号
// （厉承修 1~17、闻述 1~40），或者干脆是个变量（江执 parseInt(data-index)、谢云霄 sid）。
// 所以判据写成：把所有 swipe_id:0 剔掉之后还剩任何一个 swipe_id 目标 → 这是目录页。
function hasGreetingNavTargets(html) {
    if (!html || typeof html !== 'string') return false;
    if (html.indexOf('setChatMessages') === -1) return false;
    // 只剔掉写死的 0（回到首页），变量/表达式/非 0 的字面量都留下
    const rest = html.replace(/swipe_id\s*:\s*0\s*(?=[,}\)\s])/g, '');
    return /swipe_id\s*:/.test(rest);
}
function isMenuLikeGreeting(text, charId) {
    if (!text) return false;
    const meta = parseGreetingMeta(text);
    const title = meta ? meta.title : (text.match(/^\s*<!--\s*title:\s*([\s\S]*?)\s*-->/i) || [])[1] || '';
    const body = meta ? meta.body : text;
    if (/目录|索引/.test(title)) return true;
    if (/<greetings>[\s\S]*<\/greetings>/i.test(body)) return true;
    // 拿不到 charId 就没法跑角色专属的显示正则，只能退回上面两条纯文本判据（保持老行为，不会更差）
    if (charId === null || charId === undefined || charId === '') return false;
    if (typeof applyDisplayOnlyRegex !== 'function') return false;
    try { return hasGreetingNavTargets(applyDisplayOnlyRegex(text, charId, 0)); }
    catch (e) { return false; }
}

// 把"候选开场白列表"渲染成挑选框里的卡片列表——聊天和续写两处挑选框长得一样、复用同一份渲染逻辑，
// labelFn(idx, item) 可以给每张卡片加一个额外的前缀标签（比如续写模式下要标出"这是哪个角色的开场白"）。
// 注意：这里的 idx 是渲染出来卡片的顺序，点击时会通过 onclick 里的 idx 去 window.__greetingPickerOptions 找原始数据，
// 所以排序（把目录页类选项放最后）必须在传进来之前就排好，这个函数本身只管渲染、不做排序。
//
// opts.menuAsEntry：目录页当"正式入口"看待（续写工作台用）。续写那边点开目录页是真的能用的——
// 挑选框会把它整页渲染出来、点里面的场景卡就直接开局，所以那里不该再红字警告"请谨慎选择"，
// 反过来要标成推荐入口。聊天/小说那边渲染不了这一页（聊天气泡是纯文本），维持原来的红字警告。
// opts.charId：跑角色专属显示正则用，没有就退回纯文本判据。
function renderGreetingOptionCards(options, labelFn, opts) {
    opts = opts || {};
    return options.map((item, idx) => {
        const g = typeof item === 'string' ? item : item.text;
        const meta = parseGreetingMeta(g);
        const cid = (typeof item === 'object' && item && item.charId !== undefined) ? item.charId : opts.charId;
        const isMenu = isMenuLikeGreeting(g, cid);
        const asEntry = isMenu && !!opts.menuAsEntry;
        const esc = s => (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const bodyForPreview = meta ? meta.body : g;
        const preview = bodyForPreview.length > 200 ? bodyForPreview.slice(0, 200) + '……' : bodyForPreview;
        const extraLabel = labelFn ? labelFn(idx, item) : '';
        const warnHtml = !isMenu ? ''
            : (asEntry
                ? `<div style="font-size:12px; font-weight:bold; color:#1d9bf0; margin-bottom:2px;">📖 作者做的开场目录页 · 点进去挑分支</div>`
                : `<div style="font-size:12px; font-weight:bold; color:#e0245e; margin-bottom:2px;">⚠️ 疑似目录/索引页，可能不是正式开场白，请谨慎选择</div>`);
        const titleColor = (isMenu && !asEntry) ? '#e0245e' : '#1d9bf0';
        const headerHtml = meta
            ? `<div style="font-size:14px; font-weight:bold; color:${titleColor}; margin-bottom:2px;">${extraLabel}${esc(meta.title) || `候选 ${idx + 1}`}</div>${meta.desc ? `<div style="font-size:12px; color:#536471; margin-bottom:6px;">${esc(meta.desc)}</div>` : ''}`
            : `${extraLabel ? `<div style="font-size:12px; font-weight:bold; color:${titleColor}; margin-bottom:2px;">${extraLabel}</div>` : ''}`;
        return `
        <div class="wb-card" style="min-width:0; max-width:none; width:100%; cursor:pointer; margin-bottom:8px; ${isMenu ? (asEntry ? 'border:1px solid #1d9bf0;' : 'border:1px solid #e0245e;') : ''}" onclick="selectGreeting(${idx})">
            ${warnHtml}
            ${headerHtml}
            <div style="font-size:13px; color:#0f1419; white-space:pre-wrap; max-height:${meta ? '80px' : '150px'}; overflow-y:auto;">${esc(preview)}</div>
        </div>`;
    }).join('');
}

// 把候选开场白列表按"目录页排哪边"重排，其余选项保持原有相对顺序（稳定排序）。
// item 可能是字符串，也可能是 {text, charId, ...} 结构（续写/小说模式）。
//   · menuFirst=false（聊天/小说，默认）：目录页排最后。这两处渲染不了作者做的那一页
//     （聊天气泡是纯文本，小说是把开场白当一章正文插进去），选中目录页只会得到一坨裸标记，
//     所以要把它挪开、别顶在第一张卡被顺手点中。
//   · menuFirst=true（续写工作台）：目录页排最前，当成正式入口。那边点开它是真能用的。
function sortGreetingOptions(options, opts) {
    opts = opts || {};
    const getText = item => typeof item === 'string' ? item : item.text;
    const getCid = item => (typeof item === 'object' && item && item.charId !== undefined) ? item.charId : opts.charId;
    const first = !!opts.menuFirst;
    return options.map((item, idx) => ({ item, idx, isMenu: isMenuLikeGreeting(getText(item), getCid(item)) }))
        .sort((a, b) => (a.isMenu === b.isMenu) ? (a.idx - b.idx) : ((a.isMenu ? 1 : -1) * (first ? -1 : 1)))
        .map(x => x.item);
}
// 老名字保留：调用点不少，而且语义就是"目录页排最后"，直接转发过去
function sortGreetingOptionsMenuLast(options, charId) {
    return sortGreetingOptions(options, { menuFirst: false, charId });
}

// ===== 🎲 随机生成开场白 =====
// 三个场景共用一个入口，但**按各自的格式**生成，不是一份文案套三处：
//   chat        → 微信式的第一条消息（短、口语、直接开口，不写旁白）
//   storyStudio → 互动续写的第一轮（场景+人物状态，末尾留出让用户接话的余地）
//   novelOutline→ 小说第一章的开篇段落（叙述体，篇幅更长）
// 生成时走 buildBasePrompt，所以人设/世界书/预设/关系网这些都会带上，
// 不是凭空编一个跟角色无关的开头。
function getRandomGreetingSpec(mode, char) {
    const base = {
        chat: {
            label: '聊天开场白',
            rule: `写一条${char ? char.name : '这个角色'}主动发给${userDisplayName()}的**第一条聊天消息**。
要求：像真人发微信那样，口语、简短（不超过${typeof chatWordLimit !== 'undefined' ? chatWordLimit : 50}字）；
直接开口说话，不要写场景旁白、不要写"（他推开门）"这类描写以外的舞台说明；
内容要贴合人设和你们当前的关系，不要写成客服式的问候。`
        },
        storyStudio: {
            label: '续写开场',
            rule: `写一段**互动续写的开场**：先用两三句话把场景、时间、${char ? char.name : '角色'}此刻在做什么交代清楚，
再落到一句人物的动作或台词上，把话头留给${userDisplayName()}接。
要求：叙述体，200字以内，有画面感，结尾是开放的（不要把事情写完）。`
        },
        novelOutline: {
            label: '小说开篇',
            rule: `写一段**小说的开篇**：叙述体，400字以内，交代时间地点与${char ? char.name : '主角'}的处境，
建立起可以往下写的氛围和悬念。不要写成大纲或提要，直接就是正文第一段。`
        }
    };
    return base[mode] || base.chat;
}

async function generateRandomGreeting() {
    const mode = window.__greetingPickerMode || 'chat';
    if (!myApiKey) return alert('请先在【设置】里配置主 API Key，随机开场白需要调用 AI 生成。');

    // 找出这次要以谁的身份生成
    let char = null;
    if (mode === 'chat') char = myCharacters.find(c => c.id == window.__greetingPickerCharId);
    else if (mode === 'storyStudio') char = (window.__ssGreetChars || [])[Math.floor(Math.random() * (window.__ssGreetChars || []).length)] || null;
    else {
        const sel = Array.from(document.querySelectorAll('.novel-char-check:checked')).map(cb => cb.value).filter(v => v !== 'me');
        char = myCharacters.find(c => c.id == sel[Math.floor(Math.random() * sel.length)]) || null;
    }
    if (!char) return alert('没有找到可用的角色，先选一个角色再生成。');

    const btn = document.getElementById('randomGreetingBtn');
    const old = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = `🎲 正在为「${escapeHtml(char.name)}」生成…`; btn.style.pointerEvents = 'none'; btn.style.opacity = '0.7'; }

    try {
        const spec = getRandomGreetingSpec(mode, char);
        // 已有的开场白一并给它看，明确要求"别跟这些重样"——不然多点几次会一直给同一个味道
        const existing = (typeof getGreetingOptions === 'function' ? getGreetingOptions(char) : [])
            .map(g => (typeof g === 'string' ? g : g.text) || '').filter(Boolean).slice(0, 6)
            .map((g, i) => `${i + 1}. ${g.replace(/<[^>]+>/g, '').slice(0, 80)}`).join('\n');

        const prompt = `${buildBasePrompt(char, true, '')}

【任务】${spec.rule}

${existing ? `【这个角色已有的开场白（只是让你避开，不要模仿它们的写法和切入点）】\n${existing}\n` : ''}
【输出要求】只输出开场白正文本身，不要任何前言、解释、标题、引号包裹，也不要输出"好的，这是……"之类的话。`;

        const data = await sendChatRequest({ url: myApiUrl, key: myApiKey, model: myModel }, prompt);
        if (data.error) throw new Error(data.error.message || '生成失败');
        let text = (data.choices?.[0]?.message?.content || '').trim();
        text = extractAfterFinalMarker(text).trim();
        if (typeof processReasoningInText === 'function') {
            const r = processReasoningInText(text);
            text = (typeof r === 'string') ? r : (r && r.text) || text;
        }
        text = text.replace(/^["'“”「『]+|["'“”」』]+$/g, '').trim(); // 模型爱把整段用引号裹起来
        if (!text) throw new Error('生成结果是空的');

        closeModal('greetingPickerModal');
        if (mode === 'chat') {
            const charId = window.__greetingPickerCharId;
            applyGreetingAsFirstMessage(charId, text);
            if (currentChatSessionId !== charId) switchChatSession(charId);
        } else if (mode === 'storyStudio') {
            if (typeof applySsGreeting === 'function') applySsGreeting({ charId: char.id, text });
        } else {
            // 一键生成模式：跟选中已有开场白一样，丢进预览区走"保留/重新生成/放弃"
            const novel = globalNovels.find(n => n.id === currentEditingNovelId);
            const chapterNum = (novel && novel.chapters ? novel.chapters.length : 0) + 1;
            tempNovelChapter = { id: 'c_' + Date.now(), index: chapterNum, content: text, timestamp: Date.now() };
            const tempArea = document.getElementById('novelTempArea'), tempContentEl = document.getElementById('novelTempContent');
            if (tempContentEl) tempContentEl.value = text;
            if (tempArea) { tempArea.style.display = 'block'; tempArea.scrollIntoView({ behavior: 'smooth' }); }
        }
    } catch (e) {
        console.error('[随机开场白] 生成失败：', e);
        alert('随机开场白生成失败：' + (e.message || e) + '\n\n可以再试一次，或者直接从上面的候选里挑一个。');
    } finally {
        if (btn) { btn.innerHTML = old; btn.style.pointerEvents = ''; btn.style.opacity = ''; }
    }
}

// 「🎲 随机生成一条」卡片。三个场景的挑选框都挂它，文案按场景走。
function randomGreetingCardHtml(mode) {
    const desc = {
        chat: '让 AI 照着人设现编一条聊天开场白，跟已有的不重样',
        storyStudio: '让 AI 照着人设现编一段续写开场（场景+留给你接话的话头）',
        novelOutline: '让 AI 照着人设现编一段小说开篇，会先进预览区'
    }[mode] || '';
    return `
        <div class="wb-card" id="randomGreetingBtn" style="min-width:0; max-width:none; width:100%; cursor:pointer; margin-bottom:8px; border:1px dashed #1d9bf0; background:rgba(29,155,240,0.04);" onclick="generateRandomGreeting()">
            <div style="font-size:14px; font-weight:bold; color:#1d9bf0; margin-bottom:2px;">🎲 随机生成一条</div>
            <div style="font-size:13px; color:#536471;">${desc}</div>
        </div>`;
}

function showGreetingPicker(charId) {
    const char = myCharacters.find(c => c.id == charId);
    if (!char) return;
    const options = sortGreetingOptionsMenuLast(getGreetingOptions(char), char.id);
    if (options.length === 0) return;
    window.__greetingPickerMode = 'chat';
    window.__greetingPickerCharId = charId;
    window.__greetingPickerOptions = options;

    document.getElementById('greetingPickerTitle').innerText = `💬 选择 ${char.name} 的开场白`;
    // 💡 聊天模式专属：最上面加一张"不使用开场白"的卡片，用户可以自己决定不用角色卡自带的开场白，
    // 直接自己先开口——续写模式(showNovelGreetingPicker)不需要这张卡，那边没有"跳过"这个概念。
    const skipCardHtml = `
        <div class="wb-card" style="min-width:0; max-width:none; width:100%; cursor:pointer; margin-bottom:8px; border:1px dashed #536471;" onclick="skipGreetingPicker()">
            <div style="font-size:14px; font-weight:bold; color:#536471; margin-bottom:2px;">🚫 不使用开场白</div>
            <div style="font-size:13px; color:#536471;">直接开始聊天，自己先开口说第一句</div>
        </div>`;
    document.getElementById('greetingPickerList').innerHTML = randomGreetingCardHtml('chat') + skipCardHtml + renderGreetingOptionCards(options, null, { charId: char.id });
    openModal('greetingPickerModal');
}

// 用户在聊天开场白选择框里点了"不使用开场白"：不推送任何角色消息，改成推送一条小的系统提示，
// 一是让用户清楚知道"跳过"生效了，二是让 globalChats[charId].length > 0，避免下次再进这个聊天时
// sendFirstMessageIfNeeded 发现历史仍是空的、又弹一次选择框（相当于用这条系统提示当"已经决定过了"的标记）。
function skipGreetingPicker() {
    const charId = window.__greetingPickerCharId;
    closeModal('greetingPickerModal');
    if (!charId) return;
    if (!globalChats[charId]) globalChats[charId] = [];
    if (globalChats[charId].length === 0) {
        globalChats[charId].push({ sender: 'system', text: '已跳过开场白，你可以先开口打个招呼～', timestamp: Date.now(), readBy: [] });
        saveAllData();
    }
    if (currentChatSessionId === charId) { try { renderChatMessages(); } catch (e) { console.error('渲染聊天消息时出错：', e); } }
    else switchChatSession(charId);
}

// 续写/小说模式的开场白挑选：把这个故事里"已勾选参与"的每个角色的候选开场白都汇总进来，
// 卡片上额外标出是哪个角色的（一个故事可能挂了好几个角色），选中后直接当第一轮"AI"内容插进续写记录，
// 不用调用AI接口——这就是一段已经写好的开场文字，没必要为它专门请求一次生成。
// forOutlineMode：true=从"一键生成模式"里调用（开场白会被当成一章内容，走预览区"保留/重新生成/放弃"流程）；
// 不传/false=从"互动续写模式"调用（开场白直接作为续写第一轮插入，原有行为不变）。
function showNovelGreetingPicker(forOutlineMode) {
    const novel = globalNovels.find(n => n.id === currentEditingNovelId);
    if (!novel) return;
    const selChars = Array.from(document.querySelectorAll('.novel-char-check:checked')).map(cb => cb.value);
    const combined = [];
    selChars.forEach(id => {
        if (id === 'me') return; // 用户自己没有"开场白"这个概念
        const char = myCharacters.find(c => c.id == id);
        if (!char) return;
        getGreetingOptions(char).forEach(text => combined.push({ charId: char.id, charName: char.name, text }));
    });
    if (combined.length === 0) { appAlert('已勾选参与的角色都没有设置开场白，直接手打第一句开个头就行～'); return; }

    // 互动续写已经独立成「续写工作台」，它有自己的挑选入口（js/16 的 showSsGreetingPicker，
    // mode='storyStudio'）。所以这个函数现在只服务小说编辑器的"一键生成模式"。
    window.__greetingPickerMode = 'novelOutline';
    const sortedCombined = sortGreetingOptionsMenuLast(combined);
    window.__greetingPickerOptions = sortedCombined;
    // 涉及多个角色时才需要在每张卡片上标注"这是谁的开场白"，只有一个角色就不用啰嗦重复标注
    const uniqueCharCount = new Set(combined.map(o => o.charId)).size;
    document.getElementById('greetingPickerTitle').innerText = `💬 选择开场白（作为一章内容）`;
    document.getElementById('greetingPickerList').innerHTML = randomGreetingCardHtml('novelOutline') + renderGreetingOptionCards(sortedCombined, uniqueCharCount > 1 ? (idx, item) => `【${item.charName}】` : null);
    openModal('greetingPickerModal');
}

function selectGreeting(idx) {
    const mode = window.__greetingPickerMode || 'chat';
    // 续写工作台（js/16）：宏替换、正则、MVU、记忆召回那一整套后处理都在 applySsGreeting 里做，
    // 跟它自己正常生成的一轮走完全同一条链路，这里只负责把选中的候选转交过去。
    if (mode === 'storyStudio') {
        const item = (window.__greetingPickerOptions || [])[idx];
        closeModal('greetingPickerModal');
        if (item && typeof applySsGreeting === 'function') applySsGreeting(item);
        return;
    }
    if (mode === 'novelOutline') {
        const item = (window.__greetingPickerOptions || [])[idx];
        if (!item) return;
        closeModal('greetingPickerModal');
        const novel = globalNovels.find(n => n.id === currentEditingNovelId);
        if (!novel) return;
        const char = myCharacters.find(c => c.id == item.charId);
        const meta = parseGreetingMeta(item.text);
        let text = meta ? meta.body : item.text;
        try { text = applyMacros(text, char); } catch (e) { console.error('开场白宏替换出错，改用原文：', e); }
        // 跟聊天模式的开场白一样，续写这边选中的开场白也要过一遍正则脚本+MVU剥离，避免角色卡里焊死的状态栏JSON漏出来。
        // 这里明确知道是哪个角色的开场白（item.charId），直接传给正则，charScope限定的显示/输出脚本才能正常触发。
        text = applyRegexScripts(text, 'ai_output', item.charId);
        const mvuResult = processMvuPatchInText(text, currentEditingNovelId);
        text = mvuResult.cleanText;

        // 一键生成模式：开场白不直接落地存档，而是丢进跟AI生成章节完全一样的预览区，
        // 用户还能"保留/重新生成/放弃"，跟正常生成的章节体验一致，不搞特殊。
        const chapterNum = (novel.chapters ? novel.chapters.length : 0) + 1;
        tempNovelChapter = { id: 'c_' + Date.now(), index: chapterNum, content: text, timestamp: Date.now() };
        const tempArea = document.getElementById('novelTempArea'), tempContentEl = document.getElementById('novelTempContent');
        if (tempContentEl) tempContentEl.value = text;
        if (tempArea) { tempArea.style.display = 'block'; tempArea.scrollIntoView({ behavior: 'smooth' }); }
        return;
    }
    const charId = window.__greetingPickerCharId;
    const options = window.__greetingPickerOptions || [];
    if (!options[idx]) return;
    closeModal('greetingPickerModal');
    applyGreetingAsFirstMessage(charId, options[idx]);
    if (currentChatSessionId !== charId) switchChatSession(charId);
}

// 每次点进角色的聊天界面，就结合ta的日程和当前真实时间，刷新一次状态气泡（char.lifeState）
let lastScheduleBubbleRefresh = {};
async function refreshLifeStateOnChatEnter(charId) {
    if (typeof isAutoOn === 'function' && !isAutoOn('lifeStateEnter')) return;   // 🔌 设置里关掉了「进聊天页刷新角色状态」
    if (!charId || charId.startsWith('g_')) return; // 群聊暂不处理
    const char = myCharacters.find(c => c.id == charId);
    if (!char || !char.schedule || !char.schedule.text) return; // 没有日程就没有可结合的信息

    const now = Date.now();
    if (lastScheduleBubbleRefresh[charId] && now - lastScheduleBubbleRefresh[charId] < 60000) return; // 1分钟内重复进入同一个聊天不重复请求
    lastScheduleBubbleRefresh[charId] = now;

    const api = getApiMain();
    if (!api.key) return;

    const typeAsk = statusTypes.length > 0 ? `，并从这些状态类型里选一个最贴近的填入 "statusTypeLabel" 字段：[${statusTypes.map(t => t.label).join('、')}]，都不贴切就填空字符串` : '';
    const prompt = `现在的真实时间是 ${new Date().toLocaleString('zh-CN', { hour12: false, weekday: 'long' })}。这是"${char.name}"的今日日程：\n${char.schedule.text}\n请根据现在的真实时间，对照ta的日程表，判断ta此刻正在做什么（20字以内，不要加引号）${typeAsk}。请严格只输出 JSON，不要包含任何 Markdown 语法或多余说明：{"activity": "此刻在做的事"${typeAsk ? ', "statusTypeLabel": "从给定列表里选的状态类型"' : ''}}`;

    try {
        const data = await sendChatRequest(api, prompt);
        let rawText = data.choices?.[0]?.message?.content?.trim() || "";
        const parsed = (typeof parseModelJson === 'function') ? parseModelJson(rawText) : JSON.parse(rawText);
        if (parsed && parsed.activity) {
            saveCharLifeState(char, parsed.activity, parsed.statusTypeLabel || (char.lifeState && char.lifeState.statusTypeLabel));
            saveAllData();
        }
    } catch (e) { /* 静默失败，不打断进入聊天的体验 */ }
}

function checkAndAnnounceAnniversary(sessionId) {
    if (!enableAnniversary || sessionId.startsWith('g_')) return; // 群聊暂不支持纪念日
    const char = myCharacters.find(c => c.id == sessionId); if (!char) return;
    const history = globalChats[sessionId];
    if (!history || history.length === 0) return;
    // 🔧 天数改走 annBaseInfo（跟日历页同一个算法）。以前这里是从聊天记录第一条算的，
    //    跟日历上显示的数对不上，而且清一次聊天记录就归零。
    const info = annBaseInfo(char);
    const daysSince = info ? info.days : 0;
    if (daysSince < 1) return;
    // 🔧 以前 365 天之后要等到 730 才再响一次，中间整整一年一声不吭（400/500/600 全落空）。
    //    现在整百天一直有效。
    const isMilestone = [1, 7, 30, 100].includes(daysSince)
        || (daysSince >= 100 && daysSince % 100 === 0)
        || (daysSince >= 365 && daysSince % 365 === 0);
    if (!isMilestone) return;
    const todayKey = new Date().toDateString();
    if (char.lastAnniversaryShownDate === todayKey) return; // 今天已经提示过，不重复刷屏

    char.lastAnniversaryShownDate = todayKey;
    char.pendingAnniversaryDays = daysSince; // 下次生成回复时会自然提一句，用完即清空
    globalChats[sessionId].push({ sender: 'system', text: `✨ 今天是你和 ${char.name} 认识的第 ${daysSince} 天`, timestamp: Date.now() });
    saveAllData();
    renderChatMessages();
}

// "转私聊"功能：角色本来该在推文/评论下公开回应，但（在设置里打开这个选项后）判断这件事更适合私下聊时，
// 会调用这个函数把消息直接送进跟用户的1v1私聊里，而不是发公开评论——因为这种消息不会出现在推文流/评论区，
// 容易被用户错过，所以额外弹一条通知提醒（复用 addNotification 的 chatCharId 参数，点通知能直接跳转到对应聊天）。
// quotedPost：可选，{name, text} —— 跟Twitter"分享推文到私信"一样，把触发这次转私聊的那条推文/评论内容
// 一起带过去，而不是只留一句凭空冒出来的话。复用聊天气泡本来就支持的 msg.quote 结构（引用消息那个功能），
// 不用另外再造一套UI。
function deliverCharMoveToChatMessage(char, messageText, quotedPost) {
    if (!char || !messageText) return;
    const sessionId = char.id;
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    const quote = (quotedPost && quotedPost.text) ? { name: quotedPost.name || '未知', text: quotedPost.text, type: 'tweet' } : null;
    globalChats[sessionId].push({ sender: char.id, text: messageText, timestamp: Date.now(), readBy: [], quote });
    saveAllData();
    if (currentChatSessionId === sessionId && document.getElementById('view-chat') && document.getElementById('view-chat').style.display !== 'none') {
        renderChatMessages();
    } else if (typeof renderChatCharList === 'function') {
        renderChatCharList();
    }
    if (typeof addNotification === 'function') addNotification(`<b>${char.name}</b> 想私下跟你聊聊`, null, char.id, char, messageText);
}

async function triggerNudge(sessionId, targetId) {
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    let sysText = targetId === 'me' ? `"${currentUser.name}" 拍了拍 自己 ${currentUser.nudgeText || '的脑袋'}` : `"${currentUser.name}" 拍了拍 "${myCharacters.find(c => c.id == targetId).name}" ${myCharacters.find(c => c.id == targetId).nudgeText || '的肩膀'}`;
    globalChats[sessionId].push({ sender: 'system', text: sysText, timestamp: Date.now() }); renderChatMessages(); saveAllData();

    const api = getApiMain();
    if (targetId !== 'me' && api.key) {
        let targetChar = myCharacters.find(c => c.id == targetId);
        let prompt = buildStructuredMessages(buildBasePrompt(targetChar, false, sysText), [],
            `刚刚用户在聊天中双击头像"拍了拍"你。\n系统提示：${sysText}\n你可以选择回复，或者输出 [NUDGE] 来反击。\n【格式铁律】"XX 拍了拍 YY"这句话由系统自动生成并显示，你绝对不要自己写这句话、也不要模仿它的写法——想反击就只输出 [NUDGE] 这个标记本身，其余部分正常说你要说的话。（照抄那句话会导致引号错乱、内容重复两遍。）字数${chatWordLimit}字以内。${WORD_LIMIT_PRIORITY_NOTE}`);
        try {
            if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { currentlyTypingChars.add(targetChar.name); updateTypingIndicator(); }
            let data = await callChatCompletionAPI(api, prompt);
            let repText = data.choices?.[0]?.message?.content?.trim() || "";
            currentlyTypingChars.delete(targetChar.name); updateTypingIndicator();
            
            if (repText.toUpperCase().startsWith("NO") && repText.length < 5) return;
            // 兜底清洗：模型偶尔还是会照着历史里的系统消息，自己写一句「X"拍了拍"Y的手背」当开场。
            // 这句本来就由系统生成并单独显示，气泡里再来一遍就是重复，而且引号常常是错乱的。
            // 只清洗"照抄系统消息"那一种：系统消息一定带引号（"林" 拍了拍 "Elias" 的肩膀），
            // 模型照抄时引号会错位但仍然带着（林"拍了拍"Elias的手背）。
            // 加上"这一行里必须出现引号"这个前提，普通句子（我今天拍了拍照片）就不会被误删。
            repText = repText.replace(/^(?=[^\n]*["“”'])[^\n]{0,14}拍了拍[^\n]{0,30}(?:\n+|$)/, '').trim();
            if (repText.includes("[NUDGE]")) { repText = repText.replace(/\[NUDGE\]/ig, '').trim(); globalChats[sessionId].push({ sender: 'system', text: `"${targetChar.name}" 拍了拍 "${currentUser.name}" ${currentUser.nudgeText || '的脑袋'}`, timestamp: Date.now() }); }
            repText = applyRegexScripts(repText, 'ai_output', targetChar.id);
            if (repText) globalChats[sessionId].push({ sender: targetChar.id, text: repText, timestamp: Date.now(), readBy: [] });
            if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { renderChatMessages(); } else { renderChatCharList(); }
            saveAllData();
        } catch (e) { currentlyTypingChars.delete(targetChar.name); updateTypingIndicator(); }
    }
}

function isScheduleStale(char) {
    if (!char.schedule || !char.schedule.generatedAt) return false;
    return new Date(char.schedule.generatedAt).toDateString() !== new Date().toDateString();
}

function showCharLifeStatePopup(charId, event) {
    const char = myCharacters.find(c => c.id == charId); if (!char) return;
    const bubble = document.getElementById('charStatusBubble');
    document.getElementById('charStatusPopupAvatar').innerHTML = getAvatarHTML(char, 44);
    document.getElementById('charStatusPopupName').innerText = char.name;
    const textEl = document.getElementById('charStatusPopupText');
    let statusHtml = '';
    const typeColor = char.lifeState ? getStatusTypeColor(char.lifeState.statusTypeLabel) : null;
    if (typeColor) {
        bubble.style.background = typeColor + '1a'; // 淡色背景，保证文字可读
        bubble.style.borderLeft = `4px solid ${typeColor}`;
    } else {
        bubble.style.background = '#fff';
        bubble.style.borderLeft = 'none';
    }
    if (char.lifeState && char.lifeState.activity) {
        const ago = formatDurationZh(Math.max(0, Date.now() - (char.lifeState.updatedAt || Date.now())));
        const typeBadge = char.lifeState.statusTypeLabel ? `<span style="background:${typeColor}; color:#fff; font-size:10px; padding:1px 8px; border-radius:8px; margin-right:6px;">${char.lifeState.statusTypeLabel}</span>` : '';
        statusHtml = `${typeBadge}💭 ${char.lifeState.activity}<br><span style="font-size:11px; color:#8b98a5;">（${ago}前）</span>`;
    } else {
        statusHtml = `暂时还不知道ta在做什么，多聊聊看吧～`;
    }
    if (enableAffinitySystem) {
        const aff = char.affinity || 0;
        statusHtml += `<br><span style="font-size:12px; color:${aff >= 0 ? '#17bf63' : '#f91880'};">💗 好感度 ${aff > 0 ? '+' : ''}${aff}</span>`;
    }
    if (enableScheduleAutoCheck && isScheduleStale(char)) {
        statusHtml += `<br><span style="font-size:11px; color:#f91880;">⚠️ 日程是之前生成的，可能已过期，右键头像可更新</span>`;
    }
    textEl.innerHTML = statusHtml;
    const scheduleToggle = document.getElementById('charStatusScheduleToggle');
    const scheduleText = document.getElementById('charStatusScheduleText');
    scheduleText.style.display = 'none'; scheduleText.dataset.expanded = '0';
    scheduleToggle.innerText = '📅 查看今日日程';
    if (char.schedule && char.schedule.text) {
        scheduleToggle.style.display = 'inline-block';
        scheduleToggle.dataset.charId = char.id;
    } else {
        scheduleToggle.style.display = 'none';
    }

    // 先展示出来才能测量气泡自身尺寸，用于自适应定位
    bubble.style.display = 'block';
    bubble.style.visibility = 'hidden';
    const targetEl = (event && (event.currentTarget || event.target)) || null;
    const rect = targetEl ? targetEl.getBoundingClientRect() : { left: window.innerWidth/2, right: window.innerWidth/2, top: 100, bottom: 100, width: 0 };
    const bubbleRect = bubble.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - bubbleRect.width / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - bubbleRect.width - 10));
    let top = rect.bottom + 10;
    let isArrowUp = true;
    if (top + bubbleRect.height > window.innerHeight - 10) {
        top = rect.top - bubbleRect.height - 10;
        isArrowUp = false;
    }
    bubble.style.left = left + 'px';
    bubble.style.top = Math.max(10, top) + 'px';

    const arrowEl = bubble.querySelector('.char-status-bubble-arrow');
    const arrowLeft = Math.max(14, Math.min(rect.left + rect.width / 2 - left - 6, bubbleRect.width - 26));
    arrowEl.style.left = arrowLeft + 'px';
    arrowEl.className = 'char-status-bubble-arrow ' + (isArrowUp ? 'arrow-up' : 'arrow-down');
    arrowEl.style.background = typeColor ? typeColor + '1a' : '#fff';
    bubble.style.visibility = 'visible';

    if (event) event.stopPropagation();
    setTimeout(() => { document.addEventListener('click', closeStatusBubbleOnOutsideClick); }, 0);
}

function closeStatusBubbleOnOutsideClick(e) {
    const bubble = document.getElementById('charStatusBubble');
    if (bubble && !bubble.contains(e.target)) {
        bubble.style.display = 'none';
        document.removeEventListener('click', closeStatusBubbleOnOutsideClick);
    }
}

function toggleScheduleInBubble() {
    const scheduleToggle = document.getElementById('charStatusScheduleToggle');
    const char = myCharacters.find(c => c.id == scheduleToggle.dataset.charId);
    if (!char || !char.schedule) return;

    // 在弹窗中显示日程
    document.getElementById('scheduleViewTitle').innerText = `${char.name}的今日日程`;
    const typeColor = getStatusTypeColor(char.schedule.currentStatus ? getScheduleStatusType(char.schedule) : '');
    const typeBadge = char.schedule.currentStatus ? `<span style="background:${typeColor || '#1d9bf0'}; color:#fff; font-size:12px; padding:2px 8px; border-radius:8px; margin-right:6px; display:inline-block; margin-bottom:10px;">${getScheduleStatusType(char.schedule)}</span>` : '';
    document.getElementById('scheduleViewStatus').innerHTML = char.schedule.currentStatus ? `${typeBadge}💭 当前状态：${char.schedule.currentStatus}` : '';
    document.getElementById('scheduleViewText').innerText = char.schedule.text;
    openModal('scheduleViewModal');
}

function getScheduleStatusType(schedule) {
    return schedule.statusTypeLabel || '未设置';
}

function renderChatMessages() {
    // 🫀 顶上那条"TA 这会儿在忙/在睡"的提示，跟着聊天一起刷
    try { if (typeof renderAliveBar === 'function') renderAliveBar(); } catch (e) {}
    const container = document.getElementById('chatMessagesArea'); if (!currentChatSessionId) return;
    let history = globalChats[currentChatSessionId] || [], isGroup = currentChatSessionId.startsWith('g_');
    let groupData = isGroup ? groupChats.find(g => g.id === currentChatSessionId) : null, totalMembers = isGroup ? (groupData?.members.length || 1) : 1;

    // 防御：单条消息渲染出错（比如内容含有异常字符/宏替换失败）之前会导致 .map() 整体抛错，
    // container.innerHTML 完全不会被赋值——表现出来就是"聊天区一片空白/开场白不显示"，其实是有一条消息渲染炸了拖累了全部。
    // 改成逐条 try/catch，单条出错就跳过那一条（控制台留错误方便排查），不影响其它消息正常显示。
    // ⚠️ 这里以前是"每遇到一条未读就调一次 saveAllData()"。saveAllData 会把整份存档做一次
    // 结构化克隆写进 IndexedDB，这一步同步占着主线程——60条未读就是60次全量克隆，实测能把
    // 主线程占住近2秒，这段时间里键盘敲的字全丢，就是"对面一发消息就打不了字"的直接原因。
    // 现在改成：先记个标记，整轮渲染完只存一次（saveAllData 本身也已经改成合并写入了，双保险）。
    let __markedAnyRead = false;
    container.innerHTML = history.map((msg, idx) => {
        try {
            if (msg.sender === 'system') return `<div class="chat-system-msg"><span>${msg.text}</span></div>`;
            // 📨 邀请卡片（js/28）：一起看电影 / 一起听歌 / 一起阅读 / 约出去，
            //    都是聊天里的一张卡，不是气泡。谁发起的、答没答应、TA 说了什么，全在卡上。
            if (msg.type === 'invite' && msg.invite && typeof gyInviteCardHtml === 'function') {
                return gyInviteCardHtml(msg, idx);
            }
            // 📦 包裹卡片（js/30）：下单 / 到货 / 收货。跟邀请卡是两种卡，样子也不一样。
            if (msg.type === 'parcel' && msg.parcel && typeof gyParcelCardHtml === 'function') {
                return gyParcelCardHtml(msg, idx);
            }
            let isMe = msg.sender === 'me', senderChar = isMe ? currentUser : myCharacters.find(c => c.id == msg.sender), timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (!isMe && (!msg.readBy || !msg.readBy.includes('me'))) { if(!msg.readBy) msg.readBy=[]; msg.readBy.push('me'); __markedAnyRead = true; }

            let readStatusHtml = '';
            if (isMe && enableTypingIndicator) {
                let readCount = Array.isArray(msg.readBy) ? msg.readBy.length : 0;
                if (isGroup) { let unreadCount = totalMembers - readCount; readStatusHtml = unreadCount > 0 ? `<div style="font-size:10px; color:#888; margin-top:2px;">${unreadCount}人未读</div>` : `<div style="font-size:10px; color:#1d9bf0; margin-top:2px;">全部已读</div>`; } 
                else { readStatusHtml = readCount > 0 ? `<div style="font-size:10px; color:#1d9bf0; margin-top:2px;">已读</div>` : `<div style="font-size:10px; color:#888; margin-top:2px;">未读</div>`; }
            }
            // 🔗 角色转过来的网页（js/29）：分享感想时把 TA 刚读的那个网页一起转过来，
            //    点一下直接打开——不然你只看见一段感想，不知道 TA 在说什么、从哪儿看来的。
            if (msg.type === 'weblink' && msg.weblink && typeof gyWebLinkHtml === 'function') {
                const isMe0 = msg.sender === 'me';
                const sc = isMe0 ? currentUser : myCharacters.find(c => c.id == msg.sender);
                const av = isMe0 ? '' : `<div>${getAvatarHTML(sc, 40)}</div>`;
                return `<div class="chat-msg-row other">${av}
                    <div class="chat-bubble-wrapper" style="align-items:flex-start;">
                        <div class="chat-sender-name" style="font-size:10px;">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        ${gyWebLinkHtml(msg, idx)}
                    </div></div>`;
            }
            // 🎀 换装卡（js/35）：换头像/背景/壁纸要先问一声，卡上直接把那张图放出来。
            if (msg.type === 'dress' && msg.dress && typeof gyDressCardHtml === 'function') {
                return gyDressCardHtml(msg, idx);
            }
            // 💸 转账 / 红包（js/31）：不是居中的一张卡，而是**一条谁发出来的消息**——
            //    跟气泡一样左右分边、带头像，只是气泡里装的是转账单。所以放在这儿，
            //    要用到上面算好的 isMe / senderChar / timeStr。
            let avatarHtml = !isMe && senderChar ? `<div style="cursor:pointer;" onclick="showCharLifeStatePopup('${senderChar.id}', event)" ondblclick="triggerNudge('${currentChatSessionId}', '${senderChar.id}')" title="左键查看状态·双击拍一拍">${getAvatarHTML(senderChar, 40)}</div>` : `<div style="cursor:pointer;" ondblclick="triggerNudge('${currentChatSessionId}', 'me')" title="双击拍一拍">${getAvatarHTML(currentUser, 40)}</div>`;
            
            // 🌟 核心渲染：侧滑抽卡控件 🌟
            let swipeHtml = '';
            if (!isMe && msg.swipes && msg.swipes.length > 1) {
                let cIdx = msg.currentSwipe || 0;
                swipeHtml = `
                <div style="display:flex; justify-content:center; align-items:center; gap:12px; margin-top:6px; font-size:12px; color:#536471; user-select:none;">
                    <span style="cursor:pointer; padding:2px 10px; background:rgba(255,255,255,0.4); border-radius:4px;" onclick="swipeMessage('${currentChatSessionId}', ${idx}, -1)">◀</span>
                    <span>${cIdx + 1} / ${msg.swipes.length}</span>
                    <span style="cursor:pointer; padding:2px 10px; background:rgba(255,255,255,0.4); border-radius:4px;" onclick="swipeMessage('${currentChatSessionId}', ${idx}, 1)">▶</span>
                </div>`;
            }

            // 渲染侧兜底：已经存坏在历史里的旧消息（比如修好之前那批带着 [QUOTE:12] 的）
            // 也要能显示干净。只对**角色**说的话生效——用户自己打的字一个都不动。
            // 万一整条消息就只有一个标记、清完是空的，那就原样显示，宁可露一次也别给个空气泡。
            let displayText = msg.text;
            if (!isMe && typeof stripLeftoverMarkers === 'function') {
                const cleaned = stripLeftoverMarkers(msg.text);
                if (cleaned && cleaned.trim()) displayText = cleaned;
            }

            if (msg.type === 'money' && msg.money && typeof gyMoneyCardHtml === 'function') {
                return `
                <div class="chat-msg-row ${isMe ? 'me' : 'other'}">
                    ${!isMe ? avatarHtml : ''}
                    <div class="chat-bubble-wrapper" style="align-items: ${isMe ? 'flex-end' : 'flex-start'};">
                        <div class="chat-sender-name" style="font-size:10px;">${!isMe && isGroup ? (senderChar && senderChar.name) || '' : ''} ${timeStr}</div>
                        ${gyMoneyCardHtml(msg, idx)}
                        ${isMe ? readStatusHtml : ''}
                    </div>
                    ${isMe ? avatarHtml : ''}
                </div>`;
            }

            // 💡 聊天气泡改为【纯文本显示】：不再渲染MVU状态栏卡片、记忆召回面板，也不再把
            // renderMarkdownLite（会保留卡/正则里原样的HTML标签）用在聊天正文上——统一换成
            // renderPlainChatText，只剥离标签取纯文字。注意：mvuSnapshot/recallHtml 等后台数据
            // 处理（变量追踪、记忆库更新）完全不受影响，只是不再画出来。
            return `
                <div class="chat-msg-row ${isMe ? 'me' : 'other'}">
                    ${!isMe ? avatarHtml : ''}
                    <div class="chat-bubble-wrapper" style="align-items: ${isMe ? 'flex-end' : 'flex-start'};">
                        <div class="chat-sender-name" style="font-size:10px;">${!isMe && isGroup ? senderChar?.name : ''} ${timeStr}</div>
                        <div class="chat-bubble ${isMe ? 'me' : 'other'}" oncontextmenu="showChatContextMenu(event, ${idx})" ontouchstart="chatBubbleTouchStart(event, ${idx})" ontouchend="chatBubbleTouchEnd(event)" ontouchmove="chatBubbleTouchEnd(event)">${msg.quote ? `<div class="chat-quote-bubble${msg.quote.type === 'tweet' ? ' tweet-quote-card' : ''}">${msg.quote.type === 'tweet' ? '<div class="tweet-quote-label">🐦 分享的推文</div>' : ''}<b>${msg.quote.name}</b>: ${renderPlainChatText(msg.quote.text)}</div>` : ''}${renderPlainChatText(displayText)}${msg.mediaUrl ? `<img src="${msg.mediaUrl}">` : ''}${swipeHtml}</div>
                        ${isMe ? readStatusHtml : ''}
                    </div>
                    ${isMe ? avatarHtml : ''}
                </div>`;
        } catch (e) {
            console.error('渲染某条聊天消息时出错，已跳过：', idx, msg, e);
            return '';
        }
    }).join('');
    if (__markedAnyRead) saveAllData();   // 整轮只存一次，不再每条一次
    container.scrollTop = container.scrollHeight;

    // 「空着点发送＝重新生成」这个功能得让人看得见，不然没人知道有它。
    // 只在真的可用（最后一条是你说的）而且输入框空着的时候改提示文字。
    const inputEl = document.getElementById('chatInput');
    if (inputEl && !inputEl.value) {
        inputEl.placeholder = collectTrailingMyTexts(history).length > 0
            ? '输入消息…（留空点发送＝让TA重新回一次）'
            : '输入消息...';
    }
    // 💡 聊天气泡现在统一是纯文本渲染（renderPlainChatText），不会再有真实HTML/<script>标签进到DOM里，
    // 这里以前的"聊天注入脚本执行"调用已经是死代码了，去掉。脚本执行开关(enableChatScriptExecution)本身
    // 还留着——推文/评论/小报这些地方仍然正常渲染HTML，那些地方还用得到，见 08/09/11 号文件里的调用。
}

// 浏览器出于安全考虑，不会执行通过 innerHTML 动态插入的 <script> 标签——很多角色卡自带的HTML卡片
// （比如状态栏的展开/收起按钮）依赖这类内嵌脚本才能工作，不然点了会报"xxx is not defined"。
// 这里手动把这些脚本"重新创建"一遍来强制执行。⚠️这意味着聊天内容里只要出现<script>标签就会真的运行，
// 只有在"设置 → AI增强功能"里手动打开对应开关、并且信任你导入的角色卡来源时才应该开启。
//
// 🐛 根因修复：不少"手机截图/聊天美化"类角色卡HTML组件，是照搬SillyTavern里"每条消息用一个独立
// <iframe>文档渲染"的写法习惯，内部初始化逻辑全部挂在 document.addEventListener('DOMContentLoaded', fn)
// 上——这个假设只有在"这段HTML/JS是被浏览器当成一份全新文档从头加载"时才成立。但本app不是用iframe
// 渲染这些卡片的，而是把<script>直接重新创建、追加到当前这个早就"加载完毕"的页面里：'DOMContentLoaded'
// 事件在页面刚打开那一刻就已经触发过一次了，不会再触发第二次。结果就是这些卡片里"等页面加载完成后
// 才去初始化/往容器里填充正文内容"的代码永远不会运行——表现出来就是卡片的外壳（状态栏、边框、背景）
// 能看到，里面本该动态填充的聊天气泡/正文内容却是一片空白，点卡片自带的设置按钮也没反应（同样卡在
// 这个从没触发过的监听器里）。
//
// 这里给每个注入脚本生成一个独一无二、不会跟真正的'DOMContentLoaded'重名的"替身事件名"，把脚本源码里
// 所有监听 DOMContentLoaded 的地方偷梁换柱成监听这个替身事件；<script>标签插入DOM后是同步执行的，
// 这时脚本自己的addEventListener已经注册完毕，插入后立刻手动派发一次这个替身事件，等效于帮它从头
// 触发一次"页面加载完成"。全程只是替换脚本文本里的一个事件名字符串，完全不影响本app自己真正挂在
// 原生'DOMContentLoaded'上的启动逻辑（那些监听的字符串没有被替换过）。
function executeInjectedScripts(container) {
    container.querySelectorAll('script').forEach(oldScript => {
        try {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            let code = oldScript.textContent || '';
            const usesDCL = /DOMContentLoaded/.test(code);
            const fakeEventName = usesDCL ? ('__injectedCardReady_' + Date.now() + '_' + Math.floor(Math.random() * 1e6) + '__') : null;
            if (usesDCL) code = code.replace(/DOMContentLoaded/g, fakeEventName);
            newScript.textContent = code;
            oldScript.parentNode.replaceChild(newScript, oldScript);
            if (usesDCL) document.dispatchEvent(new Event(fakeEventName));
        } catch (e) { /* 单个脚本出错不影响其它内容 */ }
    });
}
function showChatContextMenu(e, msgIdx) {
    e.preventDefault(); let msg = globalChats[currentChatSessionId][msgIdx]; if (!msg || msg.sender === 'system') return;
    chatContextMenuTarget = { name: msg.sender === 'me' ? currentUser.name : (myCharacters.find(c => c.id == msg.sender)?.name || '未知'), text: msg.text }; chatContextMenuMsgIdx = msgIdx; 
    const menu = document.getElementById('chatContextMenu');
    menu.innerHTML = `
        <button class="context-btn" onclick="contextActionReplyChat()">引用回复</button>
        ${msg.sender === 'me'
            ? '<button class="context-btn" onclick="contextActionEditChat()">重新编辑</button>'
            : '<button class="context-btn" onclick="contextActionEditCharMsg()">✏️ 编辑这条消息</button><button class="context-btn" onclick="contextActionRegenerateChat()">🔄 侧滑重新生成</button>'}
        ${!currentChatSessionId.startsWith('g_') ? '<button class="context-btn" style="color:#17bf63;" onclick="contextActionBranchChat()">🌳 从此处开辟分支（保留旧对话）</button>' : ''}
        <button class="context-btn" onclick="contextActionSpeakChat()">🔊 朗读这条消息</button>
        <button class="context-btn" onclick="contextActionAddToMemory()">⭐ 收藏进相册</button>
        <button class="context-btn" style="color:#f91880;" onclick="contextActionDeleteChat()">删除消息</button>
    `;
    menu.style.display = 'flex'; let x = e.pageX, y = e.pageY; if(x + 100 > window.innerWidth) x -= 100; if(y + 200 > window.innerHeight) y -= 200; menu.style.left = x + 'px'; menu.style.top = y + 'px';
}

// ==========================================
// 🎤🔊 语音输入(STT) 与 朗读(TTS) —— 纯浏览器原生 Web Speech API，不依赖任何后端/第三方服务，
// 所以"没有后端也能用"这条底线不受影响；不支持的浏览器/环境会提示，不影响其它功能。
// ==========================================
let activeSpeechRecognition = null; // 同一时间只允许一路语音识别在录，按钮上会切换成"聆听中"的样式

function isSpeechRecognitionSupported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
function isSpeechSynthesisSupported() { return !!window.speechSynthesis; }

// 点击麦克风按钮：开始/再点一次＝停止。识别出的文字直接追加进目标输入框，不会覆盖已经打好的内容。
function toggleVoiceInput(targetInputId, btnEl) {
    if (!isSpeechRecognitionSupported()) return alert('当前浏览器/环境不支持语音输入（Web Speech API）。安卓上换系统自带的浏览器内核（比如Chrome）试试看。');

    if (activeSpeechRecognition) { activeSpeechRecognition.stop(); return; } // 正在录 -> 这次点击当"停止"处理

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognitionCtor();
    rec.lang = 'zh-CN'; rec.continuous = false; rec.interimResults = false;

    const input = document.getElementById(targetInputId);
    const originalBtnHtml = btnEl ? btnEl.innerHTML : '';
    if (btnEl) { btnEl.innerHTML = '🔴'; btnEl.title = '正在聆听...点击停止'; }

    rec.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
        if (input && text) { input.value = (input.value ? input.value + ' ' : '') + text; input.focus(); }
    };
    rec.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
            alert('语音识别出错：' + event.error + (event.error === 'not-allowed' ? '\n（请检查是否已授权麦克风权限）' : ''));
        }
    };
    rec.onend = () => { activeSpeechRecognition = null; if (btnEl) { btnEl.innerHTML = originalBtnHtml || '🎤'; btnEl.title = '语音输入'; } };

    activeSpeechRecognition = rec;
    try { rec.start(); } catch (e) { alert('启动语音识别失败：' + e.message); activeSpeechRecognition = null; if (btnEl) btnEl.innerHTML = originalBtnHtml || '🎤'; }
}

// 朗读一段文字：自动剥掉Markdown符号/HTML标签/代码块，只念纯文本，不然会把 **、<div> 这些符号也念出来
function speakText(text) {
    if (!isSpeechSynthesisSupported()) return alert('当前浏览器/环境不支持语音朗读（Web Speech API）。');
    speechSynthesis.cancel(); // 先打断上一条还没读完的，避免声音叠在一起

    let plain = String(text || '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/[*_~`#>]/g, '')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .trim();
    if (!plain) return;

    const utter = new SpeechSynthesisUtterance(plain);
    utter.lang = 'zh-CN'; utter.rate = 1.0;
    speechSynthesis.speak(utter);
}
function stopSpeaking() { if (isSpeechSynthesisSupported()) speechSynthesis.cancel(); }

// 聊天气泡右键菜单里的"朗读这条消息"入口
function contextActionSpeakChat() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (!chatContextMenuTarget) return;
    speakText(chatContextMenuTarget.text);
}

function contextActionAddToMemory() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (!chatContextMenuTarget) return;
    const msg = globalChats[currentChatSessionId] ? globalChats[currentChatSessionId][chatContextMenuMsgIdx] : null;
    const charForAvatar = myCharacters.find(c => c.id == currentChatSessionId);
    memoryAlbum.unshift({
        id: 'mem_' + Date.now(), type: 'chat', refId: currentChatSessionId,
        charId: currentChatSessionId, charName: chatContextMenuTarget.name,
        text: chatContextMenuTarget.text, timestamp: msg ? msg.timestamp : Date.now(), savedAt: Date.now()
    });
    saveAllData();
    if (typeof showToast === 'function' && charForAvatar) showToast(getAvatarHTML(charForAvatar, 40), '已收藏', '这条聊天已经存进回忆相册啦～', null, null);
}

let replyContextMenuTarget = null;


// ✏️ 改评论/楼层的内容。推文评论、营销号评论、故事论坛楼层、匿名论坛评论四种全走这一个。
// 以前只有"删"没有"改"——写错一个字只能删掉重来，AI 生成的那条就永远回不来了。
async function contextActionEditReply() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (!replyContextMenuTarget) return;
    const target = replyContextMenuTarget; replyContextMenuTarget = null;

    // ① 故事论坛：{threadId, floor}
    if (target.type === 'forum') {
        const thread = (typeof forumThreads !== 'undefined' ? forumThreads : []).find(t => t.id === target.threadId);
        if (!thread) return;
        const isMain = target.floor === 1;
        const cur = isMain ? thread.content : ((thread.replies || []).find(r => r.floor === target.floor) || {}).content || '';
        const next = await appPrompt(isMain ? '修改主楼内容：' : `修改 ${target.floor} 楼的内容：`, cur);
        if (next === null || !next.trim() || next === cur) return;
        if (isMain) thread.content = next;
        else { const rp = (thread.replies || []).find(r => r.floor === target.floor); if (rp) rp.content = next; }
        saveAllData();
        if (typeof openForumThread === 'function') openForumThread(target.threadId);
        return;
    }

    // ② 匿名论坛：{postId, replyIdx}，评论存在 anonPosts 里
    if (target.type === 'anon') {
        const post = (typeof anonPosts !== 'undefined' ? anonPosts : []).find(p => String(p.id) === String(target.postId));
        const rp = post && post.replies && post.replies[target.replyIdx];
        if (!rp) return;
        const cur = rp.text || rp.content || '';
        const next = await appPrompt('修改这条评论：', cur);
        if (next === null || !next.trim() || next === cur) return;
        if (rp.text !== undefined) rp.text = next; else rp.content = next;
        saveAllData();
        if (typeof renderAnonPosts === 'function') renderAnonPosts();
        return;
    }

    // ③ 推文 / 营销号评论：{postId, replyIdx}
    const { postId, replyIdx } = target;
    const isTabloid = String(postId).startsWith('tb_');
    const post = isTabloid ? tabloidPosts.find(p => p.id == postId) : globalPosts.find(p => p.id == postId);
    const rp = post && post.replies && post.replies[replyIdx];
    if (!rp) return;
    const cur = rp.text || rp.content || '';
    const next = await appPrompt('修改这条评论：', cur);
    if (next === null || !next.trim() || next === cur) return;
    if (rp.text !== undefined) rp.text = next; else rp.content = next;
    saveAllData();
    if (document.getElementById('view-post-detail') && document.getElementById('view-post-detail').style.display !== 'none'
        && typeof renderSinglePostDetail === 'function') renderSinglePostDetail(postId);
    if (typeof renderPosts === 'function') renderPosts();
    if (isTabloid && typeof renderTabloidPosts === 'function') renderTabloidPosts();
}

async function contextActionDeleteReply() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (!replyContextMenuTarget) return;
    const target = replyContextMenuTarget; replyContextMenuTarget = null;

    // 论坛的删除目标形状是 {threadId, floor}，不是 {postId, replyIdx}，跟下面推文评论的删除逻辑分开处理
    if (target.type === 'forum') {
        const thread = forumThreads.find(t => t.id === target.threadId);
        if (!thread) return;
        if (target.floor === 1) {
            if (!(await appConfirm('确定要删除整个帖子（含所有回复）吗？该操作不可逆！'))) return;
            forumThreads = forumThreads.filter(t => t.id !== target.threadId);
            saveAllData();
            if (typeof renderForumList === 'function') renderForumList();
        } else {
            if (!(await appConfirm('确定删除这条回复吗？该操作不可逆！'))) return;
            thread.replies = (thread.replies || []).filter(r => r.floor !== target.floor);
            saveAllData();
            if (typeof openForumThread === 'function') openForumThread(target.threadId);
        }
        return;
    }

    // 匿名论坛的评论存在 anonPosts 里，不在 globalPosts/tabloidPosts 里——
    // 以前这里没分支，右键删匿名评论会一路走到"找不到"然后**静默返回**，点了跟没点一样。
    if (target.type === 'anon') {
        const ap = (typeof anonPosts !== 'undefined' ? anonPosts : []).find(p => String(p.id) === String(target.postId));
        if (!ap || !ap.replies || !ap.replies[target.replyIdx]) return;
        if (!(await appConfirm('确定删除这条评论吗？该操作不可逆！'))) return;
        ap.replies.splice(target.replyIdx, 1);
        saveAllData();
        if (typeof renderAnonPosts === 'function') renderAnonPosts();
        return;
    }

    const { postId, replyIdx } = target;
    let isTabloid = postId.startsWith('tb_');
    const post = isTabloid ? tabloidPosts.find(p => p.id == postId) : globalPosts.find(p => p.id == postId);
    if (!post || !post.replies || !post.replies[replyIdx]) return;
    if (!(await appConfirm('确定删除这条评论吗？该操作不可逆！'))) return;
    post.replies.splice(replyIdx, 1);
    post.stats.comments = Math.max(0, (parseInt(post.stats.comments) || 1) - 1);
    saveAllData();
    if (document.getElementById('view-post-detail').style.display !== 'none') renderSinglePostDetail(postId);
    if (isTabloid && document.getElementById('view-tabloid').style.display !== 'none') renderTabloidPosts();
}

async function contextActionDeleteChat() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (chatContextMenuMsgIdx === null) return; const idx = chatContextMenuMsgIdx, sessionId = currentChatSessionId;
    if (!globalChats[sessionId] || !globalChats[sessionId][idx]) return;
    if (!(await appConfirm('确定删除这条消息吗？该操作不可逆！'))) return;
    globalChats[sessionId].splice(idx, 1);
    renderChatMessages(); saveAllData();
    chatContextMenuMsgIdx = null;
}

async function contextActionEditChat() {
    if (chatContextMenuMsgIdx === null) return; const idx = chatContextMenuMsgIdx, sessionId = currentChatSessionId, msg = globalChats[sessionId][idx];
    document.getElementById('chatContextMenu').style.display = 'none';
    let newText = await appPrompt("重新编辑您的消息：", msg.text); if (newText === null || newText.trim() === "") return;
    msg.text = newText.trim(); globalChats[sessionId].splice(idx + 1); renderChatMessages(); saveAllData();
    await triggerAIBatchReply(sessionId, msg.text);
}

// ✏️ 编辑角色说过的话。
//
// 跟上面"重新编辑自己的消息"不是一回事，别看着像就合并：
//   改自己的话 = "我刚才那句重说一遍" → 后面的对话作废，砍掉重新生成；
//   改角色的话 = "就当TA当时是这么说的" → 后面的对话全都还算数，一条都不许动。
// 所以这里既不 splice 也不重新请求AI。
//
// 真正麻烦的是"各处都同步"。这句话不只存在气泡里，还散落在好几个地方，
// 只改 msg.text 的话会出现"改完了，但别的地方还是旧的"：
//   · msg.swipes —— 侧滑抽卡的当前这张。不改的话左右滑一下，改动就被旧版本盖回去了。
//   · 别的消息里的 msg.quote —— 引用回复存的是**当时那句话的文字副本**，不是指针。
//   · memoryAlbum —— 收藏进回忆相册时同样存的是副本。
//   · msg.embVec —— 向量记忆的 embedding 是按旧文字算出来的，不清掉，
//                    语义检索还会拿着旧内容去匹配，角色"记得"的还是没改之前那句。
//
// 有一样确实同步不了，也不装作能同步：**已经生成过的聊天总结**。那是模型读完一段对话
// 之后自己写的一段话，不是这句话的副本，没法定位到"哪几个字来自这条消息"。
// 所以改完之后给一句明确提示，让用户自己决定要不要重新总结，而不是让他以为全同步了。
async function contextActionEditCharMsg() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (chatContextMenuMsgIdx === null || !currentChatSessionId) return;
    const sessionId = currentChatSessionId, idx = chatContextMenuMsgIdx;
    const msg = (globalChats[sessionId] || [])[idx];
    if (!msg || msg.sender === 'system' || msg.sender === 'me') return;

    const oldText = msg.text || '';
    const senderChar = myCharacters.find(c => c.id == msg.sender);
    const senderName = (senderChar && senderChar.name) || '未知';

    const newTextRaw = await appPrompt(`编辑「${senderName}」的这条消息（后面的对话不会被删掉）：`, oldText);
    if (newTextRaw === null) return;
    const newText = String(newTextRaw).trim();
    if (!newText) return alert('内容不能为空。想让这条消失请用"删除消息"。');
    if (newText === oldText) return;

    msg.text = newText;
    msg.editedAt = Date.now();

    // 1) 侧滑抽卡的当前这张也跟着改，否则左右滑一下就被旧版本盖回去
    if (Array.isArray(msg.swipes) && msg.swipes.length) {
        let cIdx = msg.currentSwipe || 0;
        if (cIdx >= 0 && cIdx < msg.swipes.length) msg.swipes[cIdx] = newText;
    }

    // 2) 所有会话里引用了这句话的快照
    let quoteFixed = 0;
    Object.keys(globalChats).forEach(sid => {
        (globalChats[sid] || []).forEach(m => {
            if (m && m.quote && m.quote.text === oldText && (!m.quote.name || m.quote.name === senderName)) {
                m.quote.text = newText; quoteFixed++;
            }
        });
    });

    // 3) 回忆相册里收藏过的副本
    let memFixed = 0;
    if (typeof memoryAlbum !== 'undefined' && Array.isArray(memoryAlbum)) {
        memoryAlbum.forEach(m => {
            if (m && m.type === 'chat' && m.text === oldText && (m.refId == sessionId || m.charId == sessionId)) {
                m.text = newText; memFixed++;
            }
        });
    }

    // 4) 向量记忆：旧向量必须作废，不然检索出来的还是改之前那句
    if (msg.embVec) delete msg.embVec;

    renderChatMessages();
    saveAllData();
    if (typeof embedMessageInBackground === 'function') embedMessageInBackground(msg);

    // 改完给个明确回执：哪些地方跟着改了、哪一样确实改不了。不留"点了好像有反应又好像没有"的空档。
    const parts = ['已改这条消息'];
    if (quoteFixed) parts.push(`同步了 ${quoteFixed} 处引用`);
    if (memFixed) parts.push(`同步了 ${memFixed} 条回忆收藏`);
    const note = parts.join('，') + '。已经生成过的聊天总结里是模型自己写的话，没法逐句对应，需要的话可以重新总结一次。';
    if (typeof showToast === 'function' && senderChar) showToast(getAvatarHTML(senderChar, 40), '已修改', note, null, null);
    else alert(note);
}

// 🌳 开辟分支（保留旧对话）：复制一份角色和到目前为止的聊天记录，另开一条独立时间线
window.contextActionBranchChat = async function() {
    document.getElementById('chatContextMenu').style.display = 'none';
    if (chatContextMenuMsgIdx === null || !currentChatSessionId) return;
    if (currentChatSessionId.startsWith('g_')) return alert("群聊暂不支持分支功能！");

    const char = myCharacters.find(c => c.id == currentChatSessionId);
    if (!char) return;

    const branchName = await appPrompt("为这条新的分支起个名字吧（原角色和聊天记录都会保留不变）：", char.name + " (分支)");
    if (!branchName) return;

    // 克隆出一个属于这条新分支的角色副本
    const newChar = JSON.parse(JSON.stringify(char));
    newChar.id = Date.now().toString();
    newChar.name = branchName;
    newChar.branchedFrom = char.id;
    newChar.branchedFromName = char.name;
    myCharacters.unshift(newChar); // 放在列表最前面

    // 把当前聊天记录复制到断点处，分支和原对话各自独立，谁都不会被覆盖
    const chatClone = JSON.parse(JSON.stringify(globalChats[currentChatSessionId].slice(0, chatContextMenuMsgIdx + 1)));
    globalChats[newChar.id] = chatClone;

    saveAllData();
    renderChatCharList();
    switchChatSession(newChar.id);
    alert(`🌳 分支创建成功！当前处于【${branchName}】，原来的对话还在【${char.name}】里，两边互不影响。`);
};

// 🔄 侧滑重新生成
window.contextActionRegenerateChat = async function() {
    if (chatContextMenuMsgIdx === null) return;
    const idx = chatContextMenuMsgIdx, sessionId = currentChatSessionId;
    document.getElementById('chatContextMenu').style.display = 'none';

    const msg = globalChats[sessionId][idx];
    if (msg.sender === 'me' || msg.sender === 'system') return alert("只能重新生成角色的回复！");

    const char = myCharacters.find(c => c.id == msg.sender);
    if (!char) return;

    const historyForPrompt = globalChats[sessionId].slice(0, idx);
    const recentHistory = buildTimeAwareHistoryText(historyForPrompt.slice(-chatHistoryTurns));
    const historyTurns = buildTimeAwareHistoryTurns(historyForPrompt.slice(-chatHistoryTurns), char.name);

    const api = getApiMain();
    if (!api.key) return alert("请先配置 API Key！");

    let oldText = msg.text;
    msg.text = "🔄 尝试新路线中...";
    renderChatMessages();

    let emoPrompt = typeof getEmoticonPrompt === 'function' ? getEmoticonPrompt() : '';
    let actionTagReminder = allowActionTags
        ? `\n【重要格式要求】：你可以且应该适度使用括号（如()或【】）穿插动作、神态、心理描写，让对话更有画面感。\n`
        : `\n【重要格式要求】：绝对不要有任何动作、神态或心理描写，不要使用括号()或【】，只输出你直接说出的话。\n`;
        
    // 💡 修复：让重新生成的提示词也严格遵守 JSON 格式
    // 💡 再修复：这段文案原来把"不超过chatWordLimit字"写死了，不看"聊天回复条数/长度模式"，
    //    导致经典模式下一侧滑重新生成就变回可控字数模式的短回复。现在统一走 getChatRegenReplyBlock()。
    let multiReplyBlock = getChatRegenReplyBlock();

    // 结构化消息改造：历史记录改成独立的user/assistant轮次，不再拼进正文文本里
    let systemText = `${buildBasePrompt(char, true, recentHistory)}${getRecentPostsAwarenessText(char)}${getTimeAwarenessPrompt(sessionId, char)}${getChatNaturalnessPrompt()}`;
    let finalUserText = `请尝试一条全新的思路重新生成你的最新回复。
${emoPrompt}
${actionTagReminder}
${multiReplyBlock}`;
    let prompt = buildStructuredMessages(systemText, historyTurns, finalUserText);

    try {
        let data = await callChatCompletionAPI(api, prompt);
        let rawText = data.choices?.[0]?.message?.content?.trim() || "";
        
        let repText = "";
        let repMediaUrl = null;
        
        // 💡 修复：加入 JSON 解析逻辑（改用 extractJsonObject，能容错AI输出里常见的裸换行/多余逗号等小毛病）
        try {
            let parsed = extractJsonObject(rawText);
            if (parsed) {
                runPluginResponseHooks(char, sessionId, parsed);
                if (parsed.stateUpdate) saveCharLifeState(char, parsed.stateUpdate, parsed.statusTypeLabel);
                if (typeof aliveCaptureMood === 'function') aliveCaptureMood(char, parsed);   // 🫀 情绪惯性

                if (parsed.replies && Array.isArray(parsed.replies) && parsed.replies.length > 0) {
                    repText = parsed.replies.map(r => r.text).join('\n');
                } else if (parsed.stateUpdate) {
                    repText = `(${parsed.stateUpdate})`;
                } else {
                    repText = rawText;
                }
            } else {
                repText = rawText;
            }
        } catch (err) {
            repText = rawText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        }

        if (repText && !repText.toUpperCase().startsWith("NO")) {
            let emoMatch = repText.match(/\[EMO:(emo_\w+)\]/i);
            if (emoMatch && typeof globalEmoticons !== 'undefined') {
                let emo = globalEmoticons.find(e => e.id === emoMatch[1]);
                if (emo) repMediaUrl = emo.url;
                repText = repText.replace(emoMatch[0], '').trim();
            }
            repText = applyRegexScripts(repText, 'ai_output', char.id);

            if (!msg.swipes) { msg.swipes = [oldText]; msg.currentSwipe = 0; }
            msg.swipes.push(repText);
            msg.currentSwipe = msg.swipes.length - 1;
            msg.text = repText;
            if (repMediaUrl) msg.mediaUrl = repMediaUrl;

            saveAllData(); renderChatMessages();
        } else {
            msg.text = oldText; renderChatMessages();
        }
    } catch(e) { msg.text = oldText; renderChatMessages(); alert("生成失败：" + e.message); }
};

// ◀ ▶ 控制侧滑翻页
window.swipeMessage = function(sessionId, msgIdx, direction) {
    let msg = globalChats[sessionId][msgIdx];
    if (!msg || !msg.swipes || msg.swipes.length <= 1) return;
    let cIdx = msg.currentSwipe || 0;
    cIdx += direction;
    if (cIdx < 0) cIdx = msg.swipes.length - 1;
    if (cIdx >= msg.swipes.length) cIdx = 0;
    msg.currentSwipe = cIdx;
    msg.text = msg.swipes[cIdx];
    saveAllData();
    renderChatMessages();
};
function contextActionReplyChat() { if (!chatContextMenuTarget) return; pendingChatQuote = chatContextMenuTarget; document.getElementById('chatQuoteName').innerText = pendingChatQuote.name; document.getElementById('chatQuoteText').innerText = pendingChatQuote.text; document.getElementById('chatQuotePreview').style.display = 'flex'; document.getElementById('chatInput').focus(); chatContextMenuTarget = null; document.getElementById('chatContextMenu').style.display = 'none'; }
function clearChatQuote() { pendingChatQuote = null; document.getElementById('chatQuotePreview').style.display = 'none'; }

// 用户短时间内连续发好几条消息时，等一小会儿再统一触发AI回复、把这几条一起回应，而不是每发一条就立刻触发一次、
// 角色逐条分别回复（那样容易显得很割裂，也容易让角色只顾着回最新一条、前面几句等于白发）。
// 按会话id分别计时：连续发消息会不断重置这个计时器，真正停下来不再发之后，稍等一下才会统一触发。
let pendingBatchReplyTimers = {};
let pendingBatchReplyTexts = {};
const CHAT_BATCH_REPLY_DELAY_MS = 5000; // 用户5秒内连发的消息会合并成一次触发AI回复

// 🔁 输入框空着点「发送」＝ 让 AI 把上一轮重新回一次。
//
// 场景：角色回的这条不满意，右键删掉。删完最后一条就是你自己说的话了，
// 但发送键这时候是**哑的**（原来的逻辑是"没内容就 return"），只能靠再打一遍
// 一模一样的话来催它重来——很别扭。
// 现在空着点发送就直接拿最后那几条你说的话重新触发一次回复。
//
// 只在"最后一条是你说的"时候才生效。要是最后一条是角色说的，那说明这一轮
// 它已经回过了，重新生成应该走气泡上的「🔄 侧滑重新生成」——那个会把旧回复
// 存成 swipe 可以左右切换，比在这儿凭空再生一条更合适。
function collectTrailingMyTexts(msgs) {
    const out = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (!m) continue;
        if (m.sender === 'system') continue;          // 拍一拍之类的系统提示不算打断
        if (m.sender !== 'me') break;                 // 遇到角色说的话就停
        if (m.text) out.unshift(m.text);
    }
    return out;
}
async function retriggerLastReply(sessionId) {
    const msgs = globalChats[sessionId] || [];
    const mine = collectTrailingMyTexts(msgs);
    if (mine.length === 0) {
        // 不能默默地什么都不做——那又变成"点了没反应"了，得说清楚为什么
        const last = msgs.filter(m => m && m.sender !== 'system').slice(-1)[0];
        showToast('<div class="avatar" style="width:40px;height:40px;">💬</div>', '没什么可以重新生成的',
            last ? '最后一条是角色说的。想让这条重来，右键点它选「🔄 侧滑重新生成」，旧的那条会留着能左右切换。'
                 : '这里还没有消息。', null, null);
        return;
    }
    // 防连点：正在等这个会话回复时不再叠一次
    if (pendingBatchReplyTimers[sessionId] || (currentlyTypingChars && currentlyTypingChars.size > 0)) return;
    await triggerAIBatchReply(sessionId, mine.join('\n'));
}

async function sendChatMessage() {
    if (!currentChatSessionId) return; const sessionId = currentChatSessionId; const input = document.getElementById('chatInput'); let text = input.value.trim();
    if (!text && !pendingChatAttachment) return retriggerLastReply(sessionId);
    text = applyRegexScripts(text, 'user_input');
    if (!globalChats[sessionId]) globalChats[sessionId] = [];
    const myMsg = { sender: 'me', text: text, timestamp: Date.now(), mediaUrl: pendingChatAttachment, readBy: [], quote: pendingChatQuote };
    globalChats[sessionId].push(myMsg);
    let triggerText = text; input.value = ''; clearAttachment('chat'); clearChatQuote(); renderChatMessages(); saveAllData(); checkAndAutoSummarizeChat(sessionId);
    embedMessageInBackground(myMsg);

    // 累积这一条到"待发送批次"里，重置计时器；真正停下来不再连发之后才会统一触发一次AI回复
    if (!pendingBatchReplyTexts[sessionId]) pendingBatchReplyTexts[sessionId] = [];
    pendingBatchReplyTexts[sessionId].push(triggerText);
    if (pendingBatchReplyTimers[sessionId]) clearTimeout(pendingBatchReplyTimers[sessionId]);
    pendingBatchReplyTimers[sessionId] = setTimeout(() => {
        const batchTexts = pendingBatchReplyTexts[sessionId] || [];
        pendingBatchReplyTexts[sessionId] = [];
        pendingBatchReplyTimers[sessionId] = null;
        if (batchTexts.length === 0) return;
        const combinedText = batchTexts.join('\n');
        triggerAIBatchReply(sessionId, combinedText);
    }, CHAT_BATCH_REPLY_DELAY_MS);
}

async function triggerAIBatchReply(sessionId, triggerText, aliveCatchUp) {
    // 🫀 TA 不总是在线：睡着/在忙的时候先把消息挂起来，等 TA 那段过去了再一次性回（见 js/06）
    //    aliveCatchUp 有值＝这一轮就是"补回"，门卫直接放行，不要再挂一次。
    let aliveCatch = aliveCatchUp || null;
    if (!aliveCatchUp && typeof aliveGate === 'function') {
        const g = aliveGate(sessionId, triggerText);
        if (g && g.hold) return;
        if (g && g.text) triggerText = g.text;
        if (g && g.catchUp) aliveCatch = g.catchUp;
    }
    const api = getApiMain(); 
    if (!api.key) return alert("请先配置 API Key！");
    
    let emoPrompt = getEmoticonPrompt(), isGroup = sessionId.startsWith('g_'), targetChars = [];
    let groupObj = null, speakOrder = 'all';
    if (isGroup) {
        groupObj = groupChats.find(x => x.id === sessionId);
        if (groupObj) {
            // 临时禁言成员（mutedMembers）：被禁言的成员这一轮完全跳过，不参与AI回复判断，等于暂时把TA从"会说话的人"里摘出去，
            // 跟踢出群/删除角色不是一回事——群聊列表、历史消息、角色本身都完全不受影响，随时可以在群聊选项里取消禁言。
            const muted = new Set(groupObj.mutedMembers || []);
            targetChars = groupObj.members.filter(id => !muted.has(id)).map(id => myCharacters.find(c => c.id == id)).filter(Boolean);
            speakOrder = groupObj.speakOrder || 'all';
            if (speakOrder === 'random') { for (let i = targetChars.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [targetChars[i], targetChars[j]] = [targetChars[j], targetChars[i]]; } }
        }
    } 
    else { let c = myCharacters.find(c => c.id == sessionId); if (c) targetChars = [c]; }

    let currentBatchText = triggerText, anyCharReplied = false;
    // 每个角色的"私聊时间线"各自独立跑，最后统一等一下再收尾（标已读/存档）
    let pendingPrivateChains = [];
    let semanticContextCache = {}; // 按角色缓存，避免群聊里给每个角色重复请求 embedding

    // 🆕 识图：把这一批用户刚发的消息里带的图片（不管是拍的照片还是从表情/图片库选的）一并收集起来，
    // 交给支持识图的模型（callChatCompletionAPI 的 images 参数），让角色能真正"看到"图里是什么再回复，
    // 而不是完全无视图片、只根据文字瞎猜。只往前找连续的"me"消息（这一批还没被回复的），不翻查更早的历史。
    let batchImages = [];
    {
        const msgs = globalChats[sessionId] || [];
        for (let i = msgs.length - 1; i >= 0 && msgs[i].sender === 'me'; i--) {
            if (msgs[i].mediaUrl) batchImages.unshift(msgs[i].mediaUrl);
        }
    }

    for (let char of targetChars) {
        let isMentioned = isGroup ? (currentBatchText.includes('@所有人') || currentBatchText.includes('@' + char.name) || ((char.handle||'').replace('@','').toLowerCase() && currentBatchText.toLowerCase().includes('@' + (char.handle||'').replace('@','').toLowerCase()))) : true;
        if (isGroup && speakOrder === 'mentioned' && !isMentioned) continue; // 仅@到的人回复模式：没被@就完全跳过，不给AI判断机会
        
        // 结构化消息改造：以前是把人设/世界书/聊天记录/各种指令全部拼成一整段文本塞进一条user消息；
        // 现在拆成 system（人设+世界书+语义上下文+时间感知等"背景设定"部分）+ 按发言人分开的历史轮次
        // （user/assistant交替，不再是一整段夹在中间的文本）+ 最后一条user消息（"这一轮到底要AI做什么"
        // 的任务指令）。recentHistory这个文本版本仍然保留：buildBasePrompt内部要靠它做世界书关键词
        // 触发判断，这个用途和"要不要把历史拼进prompt正文"是两回事，不能删。
        let recentHistory = buildTimeAwareHistoryText(globalChats[sessionId].slice(-chatHistoryTurns));
        // groupMode 一定要传：群聊的历史必须带上说话人名字，否则模型分不清哪句是自己说的
        // （这正是"群里角色乱回复、记不住人设"的根源，详见 js/06 那个函数顶上的说明）
        let historyTurns = buildTimeAwareHistoryTurns(globalChats[sessionId].slice(-chatHistoryTurns), char.name, { groupMode: isGroup });

        // 预设系统的"深度注入"模块：不跟着系统提示词固定堆在最前面，而是插到聊天历史里对应的深度位置
        // （比如"倒数第4条消息前"），效果更接近真正打断/介入对话，而不是一股脑全塞在开头容易被后面内容盖过去。
        if (typeof getActivePresetDepthEntries === 'function' && typeof insertTextAtDepth === 'function') {
            getActivePresetDepthEntries(char, sessionId).forEach(entry => insertTextAtDepth(historyTurns, entry.depth, entry.content));
        }

        // 世界书条目里选了"[系统/用户/AI]插入深度"的，同理精确插到聊天历史对应深度位置（可以指定用哪个身份说这句话）；
        // 选了"作者注释之前/之后"的，先摘出来，等下跟导演耳语文本拼在一起、按同一个深度/位置一起插入，见下方。
        let wbEntriesForChat = (typeof getCharacterWorldbookEntries === 'function') ? getCharacterWorldbookEntries(char, recentHistory, sessionId) : [];
        if (typeof getWorldbookDepthEntries === 'function' && typeof insertTextAtDepth === 'function') {
            getWorldbookDepthEntries(wbEntriesForChat).forEach(entry => insertTextAtDepth(historyTurns, entry.depth, entry.content, entry.role));
        }
        let wbAnAnchor = (typeof getWorldbookAnAnchorText === 'function') ? getWorldbookAnAnchorText(wbEntriesForChat) : { before: '', after: '' };

        let replyRule = (isMentioned || (isGroup && speakOrder === 'sequential')) ? `你被艾特了（或这是私聊，或本群设置了轮流发言），你【必须】回复，不能输出"NO"。` : (isGroup ? `如果觉得群里没人理你且无需回复，直接输出"NO"。` : `如果不知道怎么回可以输出"NO"。`);
        if (semanticContextCache[char.id] === undefined) semanticContextCache[char.id] = await getSemanticContext(sessionId, char, triggerText);
        let semanticContext = semanticContextCache[char.id];

       // 📝 导演耳语（Author's Note）：支持"每隔N条消息才提醒一次"（频率）和"插到倒数第几条消息位置"（深度）两个设置，
       // 不再是每次都无条件原样塞在prompt末尾。频率=1或没填时每轮都生效，跟以前行为一样；深度=0或没填时也还是老位置（prompt末尾）。
        let anInput = document.getElementById('chatAuthorsNote');
        let anBox = document.getElementById('chatAuthorsNoteBox');
        let anText = (anInput && anBox && anBox.style.display !== 'none') ? anInput.value.trim() : '';
        let anFreq = Math.max(1, parseInt(document.getElementById('anFrequencyInput')?.value) || 1);
        let anDepth = Math.max(0, parseInt(document.getElementById('anDepthInput')?.value) || 0);
        let turnCountNow = (globalChats[sessionId] || []).length;
        let anShouldFire = !!anText && (anFreq <= 1 || turnCountNow % anFreq === 0);
        let anPrompt = '';
        // 世界书"作者注释之前/之后"的内容，不管这一轮导演耳语本身有没有触发，都跟着作者注释这个锚点位置一起插入
        // （锚点本身是个位置概念，不依赖这一轮到底有没有填耳语文本），避免选了这个位置的世界书条目因为耳语没触发就白白丢失。
        const anBodyParts = [wbAnAnchor.before, anShouldFire ? `【导演耳语 (Author's Note) - 最高优先级上帝指令】：\n${anText}` : '', wbAnAnchor.after].filter(Boolean);
        if (anBodyParts.length > 0) {
            const anFullText = anBodyParts.join('\n\n');
            if (anDepth > 0) { insertTextAtDepth(historyTurns, anDepth, anFullText); }
            else { anPrompt = `\n\n${anFullText}\n`; }
        }

        // ⚠️ 修复"角色不看用户发了什么、一直重复旧话题"的bug：
        // 之前最新消息只是被埋在很长的历史记录文本中间，容易被模型忽略。这里把它单独提出来，
        // 放在prompt末尾（模型注意力通常更集中在结尾），并明确要求必须针对这条最新内容来回复。
        // 结构化消息里历史记录本身已经是独立的轮次了，这条提醒依然有价值（防止模型只盯着更早的话题），继续保留。
        // 修复"用户连发好几条消息，角色只回应最后一条"：triggerText 现在可能是"用户短时间内连发的好几条消息
        // 合并后的内容"（见 sendChatMessage 的合并发送去抖逻辑），不再只取 globalChats 最后一条——
        // 不然合并逻辑再怎么做，这里最终提醒AI的还是只有最后一句，等于白合并。
        let latestMsgText = `${currentUser.name}：${triggerText}`;
        let latestEmphasis = `\n\n【⚠️最新消息 - 请务必围绕这些来回复（如果是好几条连着发的，说明用户是一口气说完的，要整体理解、一起回应，不要只挑最后一句），不要无视它、也不要延续更早之前已经聊完的旧话题】：\n${latestMsgText}\n`;

        // ⚠️ 修复"开启了动作/心理描写开关，但角色还是没有动作描写"的bug：
        // 之前这条规则只在 buildBasePrompt 里出现一次，位置偏早，容易被后面"真人聊天铁律"里大段
        // 强调"短句为主、别写小说化描写"的内容盖过去。这里在prompt末尾再明确重申一次，位置越靠后模型越重视。
        let actionTagReminder = allowActionTags
            ? `\n【重要格式要求】：你可以且应该适度使用括号（如()或【】）穿插动作、神态、心理描写，让对话更有画面感——这和"像真人一样自然聊天"并不冲突，不要因为追求聊天感就完全省略掉这些描写。\n`
            : `\n【重要格式要求】：绝对不要有任何动作、神态或心理描写，不要使用括号()或【】，只输出你直接说出的话。\n`;
        
        let multiReplyBlock = getChatMultiReplyBlock();

        // 群聊转私聊：角色看完群里的对话，可以自己决定要不要私下来找用户说这件事。
        // 只在**群聊**里给这个选项——1v1本来就是私聊，再"转私聊"没有意义，白占提示词。
        // 跟推特评论区那个转私聊是同一套机制（[MOVETOCHAT] + deliverCharMoveToChatMessage），
        // 但开关是分开的：群里当着大家的面不好说的话，和评论区不想公开回应，是两回事。
        let groupMoveToChatOption = (isGroup && (typeof enableGroupMoveToChat === 'undefined' || enableGroupMoveToChat))
            ? `\n【额外选项·可以私戳】：如果群里聊到的事你不想当着大家的面接、只想单独跟${userDisplayName()}说，就在那条回复的最前面加上"[MOVETOCHAT]"，紧跟着写你想私下说的话（例：[MOVETOCHAT]刚才那事我们私下说吧），这条会变成私聊消息发给${userDisplayName()}，群里的人看不到。
可以加不止一条，也**可以一边在群里正常接话、一边私戳TA**——真人本来就是这样：群里说着场面话，私聊里说真话，两边同时进行。所以不用二选一，该在群里说的照常在群里说，同时把不方便公开的那句单独标出来就行。
用不用、用几条你自己判断。大部分话本来就该在群里说，别每次都用；不想用就正常回复，什么都不用加。\n`
            : '';

        // 🆕 AI自主引用最近消息：给一份编号列表，AI自己判断这一轮要不要引用、引用哪条
        let quotable = buildQuotableRecentMessages(sessionId, char, isGroup);

        // 注：这里原来加过一大段「群聊身份说明」，已经删掉了。
        // 删的原因不是它没用，是它把别的功能弄坏了：那段里写着"你只输出你自己要说的话"，
        // 跟上面 actionTagReminder 里"你可以且应该适度使用括号穿插动作、神态、心理描写"
        // 直接冲突——模型只能二选一，结果就是**开着动作描写开关，群聊里角色却不写动作了**。
        //
        // "群里角色分不清谁说的话"这个问题不靠加提示词解决，靠的是
        // buildTimeAwareHistoryTurns 在群聊历史里给每条发言加上"名字："前缀
        // （见 js/06 那个函数顶上的说明）。那是**数据格式**层面的修复，不占提示词、
        // 不跟任何设定打架，效果也更稳。

        let systemText = `${buildBasePrompt(char, true, recentHistory, { sessionId, excludeDepthPresetEntries: true, excludeWorldbookPositions: ['at_depth', 'before_an', 'after_an'], precomputedWbEntries: wbEntriesForChat })}${semanticContext}${getRecentPostsAwarenessText(char)}${getTimeAwarenessPrompt(sessionId, char)}${getChatNaturalnessPrompt()}`;
        let finalUserText = `${replyRule}
你可以通过输出 [NUDGE] 主动拍一拍用户。也可艾特别人。
${emoPrompt}
${quotable.promptText}
${anPrompt}
${latestEmphasis}
${groupMoveToChatOption}
${actionTagReminder}
${multiReplyBlock}${(typeof aliveMoodFormatNote === 'function') ? aliveMoodFormatNote() : ''}${(typeof aliveCatchUpPrompt === 'function') ? aliveCatchUpPrompt(aliveCatch) : ''}`;
        let prompt = buildStructuredMessages(systemText, historyTurns, finalUserText);

        try {
            if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { currentlyTypingChars.add(char.name); updateTypingIndicator(); }
            // ===== 取回复：流式和非流式塞进同一个队列，下面的消费循环一行都不用分叉 =====
            // 聊天要模型返回一整段 {"replies":[...]} 的JSON，半截JSON贴进气泡是乱码，所以聊天的
            // 流式不是"按字"而是"按气泡"：一边收一边扫，数组里哪条写完了就立刻入队发出去，
            // 模型还在写第二条的时候第一条已经出现在屏幕上了。
            // 流式关掉（或接口不支持流式、原生App壳子）时 streamCompletionText 会自动退回普通请求，
            // 这里 streamedCount 保持 0，全部由下面那次完整解析一次性入队 —— 就是老行为。
            const replyQueue = [];
            let queueClosed = false, queueWake = null, streamedCount = 0;
            const pushReply = (r) => { if (!r) return; replyQueue.push(r); if (queueWake) { const w = queueWake; queueWake = null; w(); } };
            const closeQueue = () => { queueClosed = true; if (queueWake) { const w = queueWake; queueWake = null; w(); } };

            let data = null;
            // 流式结束（或压根没走流式）后做一次完整解析：stateUpdate、插件钩子、格式没对上的兜底
            // 都还在这里，跟以前一模一样。唯一多出来的是最后那个 for —— 只补流式还没发过的部分，
            // 不然同一条会发两遍。
            const finalizeReplies = () => {
                if (!data || data.error || data.aborted) return;
                let rawText = data.choices?.[0]?.message?.content?.trim() || "";
                let replies = [];
                // 解析 JSON（用 extractJsonObject：逐字符找匹配的花括号+自动修复裸换行/多余逗号，
                // 不再是"截图里代码原文整段被当成消息发出来"背后那个粗暴正则）
                try {
                    let parsed = extractJsonObject(rawText);
                    if (!parsed) throw new Error("No JSON object found");

                    runPluginResponseHooks(char, sessionId, parsed);
                    if (parsed.stateUpdate) saveCharLifeState(char, parsed.stateUpdate, parsed.statusTypeLabel);
                    if (typeof aliveCaptureMood === 'function') aliveCaptureMood(char, parsed);   // 🫀 情绪惯性

                    if (parsed.replies && Array.isArray(parsed.replies) && parsed.replies.length > 0) {
                        replies = parsed.replies;
                    } else if (parsed.stateUpdate) {
                        // 💡 强力兜底：如果 AI 忘了写对话，只写了动作/状态，就直接把动作发出来！
                        replies = [{ delay: 1, text: `(${parsed.stateUpdate})` }];
                    } else {
                        throw new Error("Invalid structure");
                    }
                } catch (err) {
                    // 降级处理：模型没按格式吐JSON，直接把原始文本当一整条回复发出来——这种情况下更容易夹带
                    // 没被JSON结构"天然过滤掉"的思维链前缀，这里顺手处理一次（关闭/折叠/删除按当前设置来）
                    // unwrapAiEnvelopeText 会把思维链、``` 围栏、以及"其实是个 JSON 信封但上面没解析成功"
                    // 这三种情况一次处理干净，不会再把一整坨 JSON 原样当成一条消息发出来
                    replies = [{ delay: 1, text: unwrapAiEnvelopeText(rawText) }];
                }
                for (let k = streamedCount; k < replies.length; k++) pushReply(replies[k]);
            };

            const chatImages = batchImages.length > 0 ? batchImages : null;
            const useChatStream = (typeof enableStreaming !== 'undefined') && enableStreaming
                && typeof streamCompletionText === 'function' && typeof extractStreamingReplies === 'function';

            const producing = (async () => {
                try {
                    if (useChatStream) {
                        data = await streamCompletionText(api, prompt, (fullSoFar, isDone) => {
                            if (isDone) return; // 收尾那一次交给 finalizeReplies 统一解析，别重复
                            const partial = extractStreamingReplies(fullSoFar);
                            while (streamedCount < partial.length) { pushReply(partial[streamedCount]); streamedCount++; }
                        }, chatImages);
                    } else {
                        data = await callChatCompletionAPI(api, prompt, 2, chatImages);
                    }
                } catch (e) {
                    data = { error: { message: (e && e.message) || String(e) } };
                }
                finalizeReplies();
                closeQueue();
            })();

            // 私聊是**另一条时间线**：真人一边在群里接话、一边私戳你，两边各按各的节奏，
            // 不会"等群里这句发完才轮到私聊那句"。所以转私聊的消息不占下面这个循环的队——
            // 挂到 privateChain 上自己跑，群聊那边照常往下走，谁先到谁先出现。
            let privateChain = Promise.resolve(), privateSent = 0;

            let gotFirstReply = false;
            while (true) {
                if (replyQueue.length === 0) {
                    if (queueClosed) break;
                    await new Promise(res => { queueWake = res; }); // 等下一条写完
                    continue;
                }
                let replyObj = replyQueue.shift();
                if (!gotFirstReply) { gotFirstReply = true; currentlyTypingChars.delete(char.name); updateTypingIndicator(); }
                let repText = replyObj.text || "";
                let delaySec = replyObj.delay || 1;

                // 群聊转私聊：角色给某条回复加了 [MOVETOCHAT] 前缀，表示这句不想当着群里说。
                // 开关关掉时提示词里压根没给它这个选项，但万一它自己写了（预设/角色卡里教过），
                // 也只是把标记抹掉当普通群消息发——绝不能让 "[MOVETOCHAT]" 原样出现在用户眼前。
                let moveToChat = false;
                const mtcMatch = repText.match(/^\s*\[MOVETOCHAT\]\s*/i);
                if (mtcMatch) {
                    repText = repText.slice(mtcMatch[0].length).trim();
                    moveToChat = isGroup && (typeof enableGroupMoveToChat === 'undefined' || enableGroupMoveToChat);
                }

                if (moveToChat) {
                    if (repText) {
                        const grp = groupChats.find(x => x.id === sessionId);
                        const quoteInfo = { name: (grp && grp.name) || '群聊', text: '（群里没说出口的话）' };
                        const rawPriv = repText;
                        // 第一条私聊消息额外多等一会儿：真人得先切到私聊窗口再打字，
                        // 不可能群里刚说完下一秒私聊就到。后面几条就按模型自己给的节奏走。
                        const leadMs = privateSent === 0 ? 1500 + Math.floor(Math.random() * 2500) : 0;
                        const waitMs = leadMs + delaySec * 1000;
                        privateSent++;
                        privateChain = privateChain.then(async () => {
                            await new Promise(r => setTimeout(r, waitMs));
                            // 清洗跟群聊那边同一套，只是作用域换成1v1的会话
                            let t = stripLeftoverMarkers(applyRegexScripts(rawPriv, 'ai_output', char.id));
                            t = processMvuPatchInText(t, String(char.id)).cleanText;
                            t = processRecallBlockInText(t, String(char.id)).cleanText;
                            t = t.replace(/^["\u201c]|["\u201d]$/g, '').trim();
                            if (t && typeof deliverCharMoveToChatMessage === 'function') deliverCharMoveToChatMessage(char, t, quoteInfo);
                        }).catch(() => {});
                        anyCharReplied = true;
                    }
                    continue; // 不 await：群聊那边不等私聊，两条线并行
                }

                if (isMentioned && repText.toUpperCase().startsWith("NO") && repText.length < 5) repText = char.autoReplyText?.trim() || "嗯，我看到了。";
                else if (!isMentioned && repText.toUpperCase().startsWith("NO") && repText.length < 5) continue;

                // 核心：模拟打字延迟
                if (delaySec > 0) {
                    if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') {
                        currentlyTypingChars.add(char.name); updateTypingIndicator();
                    }
                    await new Promise(r => setTimeout(r, delaySec * 1000));
                    currentlyTypingChars.delete(char.name); updateTypingIndicator();
                }

                let repMediaUrl = null, emoMatch = repText.match(/\[EMO:(emo_\w+)\]/i);
                if (emoMatch) { let emo = globalEmoticons.find(e => e.id === emoMatch[1]); if (emo) repMediaUrl = emo.url; repText = repText.replace(emoMatch[0], '').trim(); }

                // 🆕 解析AI自己选的[QUOTE:编号]标记：编号对照的是这一轮prompt里给它的quotable.list，
                // 拿到手就是原始{name,text}快照，跟手动"引用回复"存的数据结构完全一样，渲染那边不用另外改。
                //
                // ⚠️ 这里**故意不锚定 ^ 句首**。以前只认写在最前面的标记，可模型经常把它甩在句子末尾
                // （prompt里白纸黑字写着"加在最前面"照样不听），结果标记既没被解析成引用、也没被清掉，
                // "[QUOTE:12]" 五个字就原样出现在聊天气泡里了。现在不管它写在哪儿都认，并且把所有
                // 出现过的都清干净——认不出编号（比如编号超出列表范围）时至少也不会漏给用户看见。
                let repQuote = null, quoteMatch = repText.match(/\[\s*QUOTE\s*:\s*(\d+)\s*\]/i);
                if (quoteMatch) {
                    const qIdx = parseInt(quoteMatch[1], 10) - 1;
                    const qTarget = quotable.list[qIdx];
                    if (qTarget) repQuote = { name: qTarget.name, text: qTarget.text };
                    repText = repText.replace(/\[\s*QUOTE\s*:\s*\d+\s*\]/ig, '').trim();
                }

                if (repText.includes("[NUDGE]")) { repText = repText.replace(/\[NUDGE\]/ig, '').trim(); globalChats[sessionId].push({ sender: 'system', text: `"${char.name}" 拍了拍 "${currentUser.name}" ${currentUser.nudgeText || '的脑袋'}`, timestamp: Date.now() }); anyCharReplied = true; }
                
                if (!repText && isMentioned) {
                    // 诊断日志：AI这一轮实际解析出的回复内容是空的，才会走到这条兜底"嗯。"。
                    // 之前这里完全没有痕迹，出现"角色只回一个嗯"的时候没法判断是AI真的没写内容、
                    // 内容被安全策略拦了、还是JSON格式没对上导致解析漏了字段——现在把原始返回和
                    // 解析结果都打到控制台，方便对着实际报错/内容排查，不用再靠猜。
                    console.warn(`[空回复兜底] "${char.name}" 这一轮AI解析出的文本是空的，已用兜底文案"${char.autoReplyText?.trim() || '嗯。'}"代替。原始AI返回：`, rawText);
                    repText = char.autoReplyText?.trim() || "嗯。";
                }
                repText = applyRegexScripts(repText, 'ai_output', char.id);
                repText = stripLeftoverMarkers(repText); // 漏网的内部标记不许进气泡（见 js/01 里的说明）
                // MVU变量补丁块（酒馆"状态栏"预设常见格式）：识别+剥离，并把应用后的状态快照挂在这条消息上，
                // 渲染时读快照画一个真正的状态栏卡片，而不是把原始JSON糊在气泡里。
                const mvuResult = processMvuPatchInText(repText, sessionId);
                repText = mvuResult.cleanText;
                // 记忆召回块（酒馆"数据库"类预设常见格式）：同样识别+剥离，渲染成本地的召回面板。
                const recallResult = processRecallBlockInText(repText, sessionId);
                repText = recallResult.cleanText;

                if (repText || repMediaUrl) {
                    const aiMsg = { sender: char.id, text: repText, timestamp: Date.now(), mediaUrl: repMediaUrl, readBy: [], mvuSnapshot: mvuResult.snapshot, recallHtml: recallResult.recallHtml, quote: repQuote };
                    globalChats[sessionId].push(aiMsg); anyCharReplied = true; currentBatchText += `\n${char.name}: ${repText}`;
                    embedMessageInBackground(aiMsg);
                    if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') { renderChatMessages(); } 
                    else {
                        let avatarHtml = isGroup ? getGroupAvatarHTML(groupChats.find(x=>x.id===sessionId), 80) : getAvatarHTML(char, 80);
                        showToast(avatarHtml, isGroup ? `[${groupChats.find(x=>x.id===sessionId).name}] ${char.name}` : `${char.name} 发来消息`, repText || "[图片/表情/拍一拍]", null, sessionId);
                        globalNotifications.unshift({ text: `<b>${char.name}</b> 给您发来消息`, postId: null, chatCharId: sessionId, timestamp: Date.now() }); unreadNotifs++; updateNotifBadge(); renderChatCharList();
                    }
                    saveAllData(); checkAndAutoSummarizeChat(sessionId);
                }
            }
            await producing;
            pendingPrivateChains.push(privateChain);
            currentlyTypingChars.delete(char.name); updateTypingIndicator();
            if (data && data.error) {
                alert(`⚠️ 聊天 API 报错（${char.name} 回复失败）:\n${data.error.message || JSON.stringify(data.error)}`);
                continue;
            }
        } catch(e) { 
            currentlyTypingChars.delete(char.name); updateTypingIndicator(); 
        }
    }

    if (pendingPrivateChains.length) await Promise.all(pendingPrivateChains);

    if (anyCharReplied) {
        let myMsgsToMark = isGroup ? targetChars.map(c => String(c.id)) : [String(targetChars[0]?.id)].filter(Boolean);
        globalChats[sessionId].forEach(m => { if (m.sender === 'me') { if (!m.readBy) m.readBy = []; myMsgsToMark.forEach(cid => { if (!m.readBy.includes(cid)) m.readBy.push(cid); }); } });
        if (currentChatSessionId === sessionId && document.getElementById('view-chat').style.display !== 'none') renderChatMessages(); saveAllData();
    }
}

function openCreateGroupModal() {
    document.getElementById('groupChatCharPicker').innerHTML = myCharacters.map(char => `<div class="char-checkbox-item"><input type="checkbox" id="gpick_${char.id}" value="${char.id}"><label for="gpick_${char.id}">${getAvatarHTML(char, 28)} ${char.name}</label></div>`).join('');
    document.getElementById('newGroupChatName').value = ''; 
    document.getElementById('newGroupAvatarFile').value = '';
    document.getElementById('groupAvatarPreview').style.display = 'none';
    tempCropResults.groupAvatar = null;
    openModal('createGroupChatModal');
}

async function saveGroupChat() {
    let name = document.getElementById('newGroupChatName').value.trim(), selected = [...document.querySelectorAll('#groupChatCharPicker input[type=checkbox]:checked')].map(cb => parseInt(cb.value));
    if(!name) return alert("请输入群聊名称"); if(selected.length < 2) return alert("群聊至少需要选择两个角色");
    
    let newG = { id: 'g_' + Date.now(), name: name, members: selected, avatarImg: tempCropResults.groupAvatar || null, speakOrder: 'all' };
    groupChats.push(newG); closeModal('createGroupChatModal'); saveAllData(); renderChatCharList(); switchChatSession(newG.id);
}

function renderEmoticonManagerGallery() {
    const c = document.getElementById('emoticonManagerGallery');
    if(globalEmoticons.length === 0) { c.innerHTML = '<div style="grid-column:1/-1; color:#536471;">暂无表情/图片，快去上传吧~</div>'; return; }
    c.innerHTML = globalEmoticons.map((e, idx) => `<div class="emo-item"><img src="${e.url}"><button class="emo-del-btn" onclick="deleteEmoticon(${idx})">×</button><input type="text" value="${e.desc || ''}" placeholder="添加含义描述" onchange="updateEmoticonDesc(${idx}, this.value)" onclick="event.stopPropagation()"></div>`).join('');
}

function updateEmoticonDesc(idx, val) { globalEmoticons[idx].desc = val.trim(); saveAllData(); }

async function handleEmoticonUpload(event) {
    const files = Array.from(event.target.files); if (!files.length) return;
    if (files.length > 99) alert('单次最多只能添加99张图片！已自动截取前99张。');
    for(let file of files.slice(0, 99)) { globalEmoticons.push({ id: 'emo_' + Date.now() + Math.floor(Math.random()*1000), url: await fileToBase64(file), desc: "" }); }
    renderEmoticonManagerGallery(); event.target.value = ''; saveAllData();
}