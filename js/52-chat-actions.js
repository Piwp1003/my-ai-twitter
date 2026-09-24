/* ============================================================
   js/52 —— 💬 说到做到：角色在聊天里能真的去做事
   ------------------------------------------------------------
   以前角色在私聊里说"我现在给你打电话""转你两百""五分钟后一起看电影"，
   说完就完了——打电话、转账、邀请卡这些功能明明都做好了，却只有你点按钮才会发生。
   现在 TA 说要做、并且真打算做的时候，会在那条回复里带一个看不见的标记，这边照着真的执行：
     📞 打电话（弹来电页面）   💸 转账 / 🧧 红包（私聊里一张票据，你点收）
     🎬🎧📖🤝 约看电影 / 听歌 / 读书 / 出去（私聊里一张邀请卡）
     🛵 给你点外卖   🎁 给你买东西（包裹卡）   ✉️ 写信   🐦 发推文
     🟢 换自己此刻的状态   📝 记一条待办
   能带时间："五分钟后一起看电影" → 五分钟后邀请卡才弹出来（刷新页面也不会丢）。

   两种模式跟着角色资料页里的「行为模式」走：
     · TA 自己决定（actMode = auto）：列表只是"你做得到这些"，做不做 TA 自己判断——
       说了不一定做，你开口要求也可以不答应（看关系、看性子、看处境）。
     · 默认（按固定频率）：说到就做到，你开口要求的也照办。为了保证"说了就做"，
       模型忘了带标记的时候，这边还会从话里认一遍最常见的几件（打电话、转账、约看电影/听歌）。

   私聊、群聊都生效。群里做的事都是冲着你一个人的（电话、转账、邀请卡都私下发给你），
   "⏰ 说好几点做"那一行出现在 TA 说这句话的那个聊天里。群里只认标记，不从话里猜——
   群里的"你"可能是在跟别的成员说话。
   开关：设置 → 自动化 →「💬 聊天里说到做到」，默认开；关掉＝完全回到以前，只说不做。
   各功能自己的开关照样算数：钱包没开就不会有转账，外卖没开就不会点外卖。
   ============================================================ */
(function () {
    'use strict';
    if (window.__gyChatActsLoaded) return;
    window.__gyChatActsLoaded = true;

    const chars = () => (typeof myCharacters !== 'undefined' ? myCharacters : []);
    const charOf = id => chars().find(c => String(c.id) === String(id)) || null;
    const autoOn = k => (typeof isAutoOn === 'function') ? isAutoOn(k) : false;
    const featureOn = () => (typeof isAutoOn === 'function') ? isAutoOn('chatActions') : true;
    const modeOf = c => (typeof getCharActMode === 'function') ? getCharActMode(c) : 'fixed';
    const uname = c => (typeof userDisplayName === 'function') ? userDisplayName(c) : '对方';
    const num = v => { const n = parseFloat(String(v || '').replace(/[^\d.]/g, '')); return isNaN(n) ? 0 : n; };

    function sysLine(charId, text) {
        try {
            const sid = String(charId);
            if (!globalChats[sid]) globalChats[sid] = [];
            globalChats[sid].push({ sender: 'system', text, timestamp: Date.now(), readBy: [] });
            if (typeof saveAllData === 'function') saveAllData();
            refresh(sid);
        } catch (e) {}
    }
    function refresh(sid) {
        try {
            const v = document.getElementById('view-chat');
            if (String(currentChatSessionId) === String(sid) && v && v.style.display !== 'none') { if (typeof renderChatMessages === 'function') renderChatMessages(); }
            else if (typeof renderChatCharList === 'function') renderChatCharList();
        } catch (e) {}
    }
    function invite(kind) {
        return async (c, args) => {
            if (typeof window.gyInviteFromChar !== 'function') return null;
            const K = (window.GY_INVITE_KINDS || {})[kind];
            const inv = window.gyInviteFromChar({
                char: c, kind, title: (args[0] || '').slice(0, 30), sub: (args[1] || '').slice(0, 40),
                onYes: () => { try { if (K && K.accept) K.accept({ charId: String(c.id) }); } catch (e) {} }
            });
            return inv ? ((K ? K.name : '邀请') + (args[0] ? '「' + args[0] + '」' : '')) : null;
        };
    }
    const walletOn = () => !!(window.gyWallet && typeof window.gyWallet.send === 'function' && autoOn('walletOn'));

    // 动作表。names：模型可能写的各种叫法；once：同一轮里只做一次（防止两条气泡各带一个、打两次电话）
    const ACTS = [
        { key: 'call', short: '给你打电话', names: ['打电话', '电话', '语音', '视频', 'call'], once: true,
          syntax: '[ACT:打电话|这会儿想打的理由]', label: '给对方打个电话（对方那边会弹来电页面）',
          need: () => typeof window.gyCallRing === 'function',
          run: async (c, args) => window.gyCallRing(c, args[0] || '') ? '打来了电话' : null },
        { key: 'money', short: '给你转账', names: ['转账', '转钱', 'transfer', 'money'], once: true,
          syntax: '[ACT:转账|金额|留言]', label: '给对方转账（私聊里一张转账单，对方点收）',
          need: walletOn,
          run: async (c, args) => { const amt = num(args[0]); if (amt <= 0) return null;
              const mo = await window.gyWallet.send({ from: String(c.id), to: 'me', amt, note: args[1] || '', kind: 'transfer' });
              return mo ? '转账 ￥' + amt : null; } },
        { key: 'red', short: '给你发红包', names: ['红包', '发红包', 'red'], once: true,
          syntax: '[ACT:红包|金额|留言]', label: '给对方发红包',
          need: walletOn,
          run: async (c, args) => { const amt = num(args[0]); if (amt <= 0) return null;
              const mo = await window.gyWallet.send({ from: String(c.id), to: 'me', amt, note: args[1] || '', kind: 'red' });
              return mo ? '红包 ￥' + amt : null; } },
        { key: 'film', short: '约你一起看电影', names: ['约看电影', '看电影', '电影', 'film', 'movie'], once: true,
          syntax: '[ACT:约看电影|片名（可不写）]', label: '约对方一起看电影（发一张邀请卡，对方点好啊就进放映厅）',
          need: () => typeof window.gyInviteFromChar === 'function', run: invite('film') },
        { key: 'music', short: '约你一起听歌', names: ['约听歌', '听歌', '一起听', 'music'], once: true,
          syntax: '[ACT:约听歌|歌名（可不写）]', label: '约对方一起听歌',
          need: () => typeof window.gyInviteFromChar === 'function', run: invite('music') },
        { key: 'read', short: '约你一起读书', names: ['约读书', '一起读', '读书', '阅读', 'read'], once: true,
          syntax: '[ACT:约读书|书名（可不写）]', label: '约对方一起读书',
          need: () => typeof window.gyInviteFromChar === 'function', run: invite('read') },
        { key: 'date', short: '约你出去', names: ['约出去', '约会', '出去', '见面', 'date'], once: true,
          syntax: '[ACT:约出去|去哪儿|几点/做什么]', label: '约对方出去见面',
          need: () => typeof window.gyInviteFromChar === 'function', run: invite('date') },
        { key: 'takeout', short: '给你点外卖', names: ['点外卖', '外卖', 'takeout'], once: true,
          syntax: '[ACT:点外卖|想给对方点的吃的]', label: '给对方点一份外卖（真的下单，按时送到）',
          need: () => typeof window.gytoCharOrder === 'function' && autoOn('takeoutOn'),
          run: async (c, args) => { const r = await window.gytoCharOrder(c.id, args[0] || ''); return r ? '点了外卖「' + r.shop + '」' : null; } },
        { key: 'gift', short: '给你买东西', names: ['买礼物', '送礼物', '买东西', '礼物', 'gift'], once: true,
          syntax: '[ACT:买礼物|想买的东西]', label: '在商城给对方买样东西（包裹寄到对方那儿）',
          need: () => typeof window.gymallCharBuy === 'function' && typeof window.gymallHasProducts === 'function' && window.gymallHasProducts(),
          run: async (c, args) => { const n = await window.gymallCharBuy(c.id, 'me', args[0] || '', args[1] || ''); return n ? '买了「' + n + '」' : null; } },
        { key: 'letter', short: '给你写信', names: ['写信', '信', 'letter'], once: true,
          syntax: '[ACT:写信]', label: '给对方写一封信（信件与日记里收到）',
          need: () => typeof generateProactiveLetter === 'function',
          run: async (c) => { await generateProactiveLetter(c); return '写了封信'; } },
        { key: 'post', short: '发推文', names: ['发推文', '发动态', '发帖', '发朋友圈', 'post'], once: true,
          syntax: '[ACT:发推文]', label: '发一条推文',
          need: () => typeof executeGeneration === 'function',
          run: async (c) => { await executeGeneration([c]); return '发了条推文'; } },
        { key: 'status', short: '换状态', names: ['状态', '换状态', '去做', 'status'],
          syntax: '[ACT:状态|你接下来在干嘛，10字以内]', label: '换一下自己此刻在做的事（去洗澡、出门、开会……会更新你的状态）',
          need: () => typeof saveCharLifeState === 'function',
          run: async (c, args) => { const t = String(args[0] || '').trim().slice(0, 30); if (!t) return null;
              saveCharLifeState(c, t, null); if (typeof saveAllData === 'function') saveAllData(); return '状态：' + t; } },
        { key: 'todo', short: '记待办', names: ['记待办', '待办', '记下', 'todo'],
          syntax: '[ACT:记待办|要记的事]', label: '往自己的待办里记一件事（答应了对方的事、想起来要做的事）',
          need: () => typeof autonomyAddTodo === 'function',
          run: async (c, args) => { if (!args[0]) return null; const r = await autonomyAddTodo(c, args[0]); return r || ('记下了：' + args[0]); } }
    ];
    window.GY_CHAT_ACTS = ACTS;   // 别的模块想加动作就往这里 push（结构同上）

    const needOk = (a, c) => { try { return !!a.need(c); } catch (e) { return false; } };
    function findAct(name) {
        const n = String(name || '').trim().toLowerCase();
        if (!n) return null;
        return ACTS.find(a => a.key === n || a.names.some(x => x.toLowerCase() === n))
            || ACTS.find(a => a.names.some(x => n.indexOf(x.toLowerCase()) !== -1));
    }

    /* ---------- 时间："@5" / "@5分钟" / "@1小时" / "5分钟后" ---------- */
    const CN = { 零: 0, 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5 };
    function cnNum(s) {
        if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
        if (s === '十') return 10;
        let m = s.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/);
        if (m) return (m[1] ? CN[m[1]] : 1) * 10 + (m[2] ? CN[m[2]] : 0);
        if (s.length === 1 && CN[s] !== undefined) return CN[s];
        return NaN;
    }
    function toMinutes(n, unit) {
        if (!isFinite(n) || n <= 0) return 0;
        if (/小时|h/i.test(unit || '')) return n * 60;
        if (/秒|s/i.test(unit || '')) return n / 60;
        return n;
    }

    function parseBody(body) {
        const parts = String(body).split(/[|｜]/).map(x => x.trim());
        let head = parts.shift() || '';
        let delay = 0;
        const dm = head.match(/@\s*(\d+(?:\.\d+)?)\s*(小时|h|分钟|分|min|m|秒|s)?\s*$/i);
        if (dm) { delay = toMinutes(parseFloat(dm[1]), dm[2]); head = head.slice(0, dm.index).trim(); }
        const args = [];
        parts.forEach(p => {
            const m = p.match(/^@\s*(\d+(?:\.\d+)?)\s*(小时|h|分钟|分|min|m|秒|s)?$/i);
            if (m) delay = toMinutes(parseFloat(m[1]), m[2]); else args.push(p);
        });
        const a = findAct(head);
        return a ? { key: a.key, args, delay } : null;
    }

    /* ---------- 默认模式的兜底：话里说了、却忘了带标记 ---------- */
    const DELAY_RE = /([0-9]+|[一二两三四五六七八九十半]{1,3})\s*(个)?\s*(分钟|小时)\s*(之?后|以后|过后)/;
    function delayOf(sent) {
        const m = sent.match(DELAY_RE);
        return m ? toMinutes(cnNum(m[1]), m[3]) : 0;
    }
    const NEG = /(不|别|没|不要|不能|不想|不会|不用|甭|怎么|为什么|要不要|吗|？|\?)/;
    function sniff(text) {
        const acts = [];
        const sents = String(text || '').split(/(?<=[。！!？?\n～~])/);
        sents.forEach(s => {
            const pre = (re) => { const m = s.match(re); return m ? s.slice(0, m.index) : null; };
            // 打电话：我(现在/这就/等下)给你打(个)电话/视频
            let p = pre(/打\s*(个|一个)?\s*(电话|视频|语音)/);
            if (p !== null && /(我|这就|马上|现在|立刻|等下|等会|待会)/.test(p) && !NEG.test(p.slice(-6))
                && !/((^|[^给])你|给我)\s*$/.test(p.trim()) && !/(昨天|刚才|刚刚|之前|上次|那天|已经|前天)/.test(p))
                acts.push({ key: 'call', args: [], delay: delayOf(s) });
            // 转账 / 红包：给你转200、转你两百块、发你个520的红包
            const mm = s.match(/(转(给)?你|给你转|发(给)?你|给你发)[^。！？\n\d]{0,6}?(\d+(?:\.\d+)?)\s*(块|元|w|万)?/);
            if (mm && !NEG.test(s.slice(0, mm.index).slice(-5))) {
                let amt = parseFloat(mm[4]); if (/w|万/.test(mm[5] || '')) amt *= 10000;
                acts.push({ key: /红包/.test(s) ? 'red' : 'money', args: [String(amt), ''], delay: 0 });
            }
            // 约看电影 / 听歌：(我们/一起/陪你)…看电影，最好带时间
            if (/(看电影|看个电影|看部电影|看片)/.test(s) && /(一起|我们|咱们|陪你|带你)/.test(s) && !NEG.test(s))
                acts.push({ key: 'film', args: [], delay: delayOf(s) });
            if (/(听歌|听首歌)/.test(s) && /(一起|我们|咱们|陪你|放给你)/.test(s) && !NEG.test(s))
                acts.push({ key: 'music', args: [], delay: delayOf(s) });
        });
        return acts;
    }

    /* ---------- 从一条回复里摘标记 ---------- */
    // 返回 {text: 去掉标记后的话, acts: [...]}
    window.gyChatActsExtract = function (text, char, isGroup) {
        const res = { text, acts: [] };
        try {
            if (!featureOn() || !text || !char) return res;
            let found = false;
            res.text = String(text).replace(/\[\s*ACT\s*[:：]\s*([^\]]*?)\s*\]/gi, (m0, body) => {
                found = true;
                const a = parseBody(body);
                if (a) res.acts.push(a);
                return '';
            }).replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
            if (!found && !isGroup && modeOf(char) !== 'auto') res.acts = sniff(res.text);
            res.acts = res.acts.filter(a => { const d = ACTS.find(x => x.key === a.key); return d && needOk(d, char); });
        } catch (e) { console.warn('[说到做到] 解析出错（不影响消息本身）：', e); }
        return res;
    };

    /* ---------- 执行（立刻 / 过一会儿）---------- */
    const recentRun = {};   // `${charId}:${key}` → 时间，防同一轮两条气泡各做一次
    async function runOne(c, a) {
        const d = ACTS.find(x => x.key === a.key);
        if (!d || !needOk(d, c)) return null;
        const k = String(c.id) + ':' + a.key;
        if (d.once && recentRun[k] && Date.now() - recentRun[k] < 90000) return null;
        recentRun[k] = Date.now();
        try {
            const r = await d.run(c, a.args || []);
            if (r) console.info(`[说到做到] ${c.name}：${r}`);
            refresh(String(c.id));
            return r;
        } catch (e) { console.warn('[说到做到] 执行出错：', a, e); return null; }
    }

    const QK = 'gy_chat_act_queue';
    let Q = [];
    try { Q = JSON.parse(localStorage.getItem(QK) || '[]') || []; } catch (e) { Q = []; }
    const saveQ = () => { try { localStorage.setItem(QK, JSON.stringify(Q)); } catch (e) {} };

    window.gyChatActsRun = function (char, sessionId, acts) {
        if (!char || !acts || !acts.length) return;
        acts.forEach((a, i) => {
            const d = ACTS.find(x => x.key === a.key);
            if (!d) return;
            if (a.delay && a.delay > 0.2) {
                const at = Date.now() + Math.round(a.delay * 60000);
                Q.push({ id: 'q' + Date.now().toString(36) + i, charId: String(char.id), key: a.key, args: a.args || [], at });
                saveQ();
                const t = new Date(at), pad = n => String(n).padStart(2, '0');
                sysLine(sessionId || char.id, `⏰ ${char.name} 说好 ${pad(t.getHours())}:${pad(t.getMinutes())} ${d.short || d.label.replace(/（.*$/, '')}`);
            } else {
                // 稍等一下再做：让那句话先出现在屏幕上，像真人先说"我打给你"再拨号
                setTimeout(() => runOne(char, a), 1200 + i * 800);
            }
        });
    };

    async function tick() {
        if (!Q.length) return;
        const now = Date.now();
        const due = Q.filter(x => x.at <= now);
        if (!due.length) return;
        Q = Q.filter(x => x.at > now);
        saveQ();
        for (const x of due) {
            if (now - x.at > 6 * 3600000) continue;           // 过了太久（比如 app 关了一整天）就不补了
            const c = charOf(x.charId);
            if (c && featureOn()) await runOne(c, { key: x.key, args: x.args, delay: 0 });
        }
    }
    setInterval(tick, 15000);
    setTimeout(tick, 5000);
    window.gyChatActsQueue = () => Q.slice();

    /* ---------- 写进聊天 prompt 的那一段 ---------- */
    window.gyChatActsPrompt = function (char, isGroup) {
        try {
            if (!featureOn() || !char) return '';
            const avail = ACTS.filter(a => needOk(a, char));
            if (!avail.length) return '';
            const who = uname(char);
            const list = avail.map(a => `- ${a.syntax}　${a.label}`).join('\n');
            const auto = modeOf(char) === 'auto';
            const rule = auto
                ? `这些都是你**真的做得到**的事，不是只能嘴上说。做不做由你自己判断：此刻想做、做得到、符合你的性子和你们现在的关系，就在那条回复里带上标记，系统会真的去做；只是随口一提、打算以后再说、或者你根本不想做，就别带。
${who}开口要你做（让你打电话、给你转账、陪看电影……）的时候，也由你按人设和关系决定——可以爽快答应、可以推脱、可以讨价还价、也可以拒绝；答应了才带标记。`
                : `这些都是你**真的做得到**的事。你只要在回复里说了要做其中某件（"我给你打电话""转你两百""五分钟后一起看电影"），或者${who}开口让你做，就**一定**在那条回复里带上对应的标记——说到就做到，系统会按标记真的执行。`;
            return `
【💬 你在聊天里能真的去做的事】
${list}
${rule}
${isGroup ? `你们现在在群里。这些事做起来都是冲着${who}一个人的（电话打给TA、钱转给TA、邀请私下发给TA），不是冲着群里别人。\n` : ''}写法：标记放在那条回复文字的末尾，对方看不到标记本身；一条可以带好几个。要过一会儿才做的，在名字后面加 @分钟数，比如 [ACT:约看电影@5|星际穿越] 就是五分钟后才发来邀请。金额只写数字。不要为了用而用，平常聊天大多数时候什么标记都不用带。
`;
        } catch (e) { return ''; }
    };

    /* ---------- 开关：挂进 设置 → 自动化 的开关表 ---------- */
    try {
        if (typeof AUTO_FEATURE_DEFS !== 'undefined' && Array.isArray(AUTO_FEATURE_DEFS) && !AUTO_FEATURE_DEFS.some(f => f.key === 'chatActions')) {
            AUTO_FEATURE_DEFS.push({
                key: 'chatActions', label: '💬 聊天里说到做到',
                desc: '私聊里角色说"我给你打电话""转你两百""五分钟后一起看电影"时，真的弹来电、发转账单、到点发邀请卡；点外卖、买礼物、写信、发推、换状态、记待办也一样。角色是「TA 自己决定」模式的，说了做不做、你要求了答不答应由 TA 自己判断；默认模式说到就做到，你开口要求的也照办。各功能自己的开关照样算数（钱包没开就不会转账）。关掉＝回到以前，只说不做。',
                cost: '不额外调用（标记跟着回复一起出来）；真去做的那件事如果本身要调用（比如写信、发推、打电话里的对话），照那件事自己的算',
                group: '活人感', where: '设置 → 自动化 → 活人感'
            });
        }
    } catch (e) {}
})();
