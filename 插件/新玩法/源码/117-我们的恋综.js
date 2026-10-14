/* 💘 我们的恋综：你的几个角色一起上恋爱综艺，你是唯一的女嘉宾。每一集有开场采访、约会、心动短信和镜头外——他们会吃醋、拉扯、互相较劲，还会在镜头外说悄悄话。六集之后的告白夜，你选一个人 */
if (window.__gyxShow) return; window.__gyxShow = 1;
X.feat('gyxShow', { n: '💘 我们的恋综', desc: '角色们一起上恋综，你是唯一的女嘉宾' });
const S = X.store('show');
let D = { seasons: [] };   // {id, cids, at, hearts:{cid:n}, eps:[{open:[{cid,t}], date:{cid,scene,opts,pick,react}, texts:[{from,to,t}], mine, back}], final, finalLines, done}
let busy = false, PICK = [];
const EPS = 6, save = () => S.set('d', D);
const live = () => D.seasons.find(s => !s.done);
const nm = id => X.name(X.char(id));
const cast = s => s.cids.map(id => `${nm(id)}：${X.persona(X.char(id)).slice(0, 120)}`).join('\n');
const hearts = s => s.cids.map(id => `${nm(id)} ${s.hearts[id] || 0}`).join('、');
async function openEp(s) {
    const n = s.eps.length + 1;
    const o = X.bailu() ? null : X.json(await X.ask(`你在写一档恋爱综艺的第 ${n}/${EPS} 集。她是唯一的女嘉宾，男嘉宾是：\n${cast(s)}\n到目前为止她的心动值：${hearts(s)}。上一集：${s.eps.length ? JSON.stringify(s.eps[s.eps.length - 1].back || '') : '这是第一集'}\n写这一集的开场：每个男嘉宾对着镜头的一句采访（要符合各自的性格，可以提到她、提到别人、吃醋或嘴硬）。\n只输出 JSON：{"theme":"这一集的主题，8字内","open":[{"name":"名字","t":"采访，30字内"}]}`));
    const open = s.cids.map(id => { const x = o && (o.open || []).find(y => y && y.name === nm(id)); return { cid: id, t: X.plain((x && x.t) || X.pick(['我来这里，只为了一个人。', '其他人？我没放在眼里。', '……她今天穿得很好看。', '我不会输的。'])) }; });
    s.eps.push({ theme: X.plain((o && o.theme) || X.pick(['初次见面', '心动信号', '吃醋', '雨天约会', '秘密', '告白前夜'])), open }); await save();
}
async function date(s, cid) {
    const e = s.eps[s.eps.length - 1], c = X.char(cid);
    const o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n你在上恋综（第 ${s.eps.length} 集「${e.theme}」），其他男嘉宾是：${s.cids.filter(x => x !== cid).map(nm).join('、')}。这一集她选了和你约会。\n写这场约会的一个片段（地点、你做了什么、说了什么，要有你的性格，可以有点小心机），再给她 3 种回应方式。\n只输出 JSON：{"scene":"约会片段，90字内","opts":[{"t":"她的回应，15字内","h":心动加减（-5到+15）,"react":"你对这个回应的反应，20字内"}]}`));
    e.date = { cid, scene: X.plain((o && o.scene) || `${nm(cid)}带你去了海边，一路上话不多，回来的时候把外套披在了你身上。`), opts: ((o && o.opts) || [{ t: '谢谢你', h: 5, react: '……不客气。' }, { t: '牵他的手', h: 12, react: '他愣了一下，握紧了。' }, { t: '问起别人', h: -3, react: '"你约会的时候想着别人？"' }]).slice(0, 3).map(x => ({ t: X.plain(x.t), h: Math.max(-10, Math.min(20, +x.h || 0)), react: X.plain(x.react || '') })) };
    await save();
}
async function texts(s, to) {
    const e = s.eps[s.eps.length - 1]; e.mine = to; s.hearts[to] = (s.hearts[to] || 0) + 5;
    const o = X.bailu() ? null : X.json(await X.ask(`恋综第 ${s.eps.length} 集「${e.theme}」结束，男嘉宾：\n${cast(s)}\n这一集她和${nm(e.date.cid)}约会了，她的心动短信发给了${nm(to)}。现在心动值：${hearts(s)}。\n1）每个男嘉宾给她发一条匿名心动短信（她会猜是谁写的；要能从语气看出是谁）；\n2）写「镜头外」：节目没播的片段——男嘉宾们私下说了什么、谁吃醋了、谁跟谁较劲。\n只输出 JSON：{"texts":[{"name":"名字","t":"短信，30字内"}],"back":"镜头外，80字内"}`));
    e.texts = s.cids.map(id => { const x = o && (o.texts || []).find(y => y && y.name === nm(id)); return { from: id, t: X.plain((x && x.t) || X.pick(['今天你笑的时候，我在看你。', '明天想跟你吃早餐。', '别跟他走太近。', '晚安。'])) }; }).sort(() => Math.random() - .5);
    e.back = X.plain((o && o.back) || `${nm(e.date.cid)}回宿舍的时候心情很好，${s.cids.filter(x => x !== e.date.cid).map(nm).join('和')}一晚上没说话。`);
    await save();
}
async function finale(s, pick) {
    s.final = pick; s.done = true; s.doneAt = Date.now();
    const o = X.bailu() ? null : X.json(await X.ask(`恋综告白夜。男嘉宾：\n${cast(s)}\n六集下来她的心动值：${hearts(s)}。最后她选择了${nm(pick)}。\n写每个人此刻的一句话（被选中的人的告白回应；没被选中的人的反应——要符合性格：祝福、不甘、嘴硬、偷偷难过……）。\n只输出 JSON：{"lines":[{"name":"名字","t":"30字内"}]}`));
    s.finalLines = s.cids.map(id => { const x = o && (o.lines || []).find(y => y && y.name === nm(id)); return { cid: id, t: X.plain((x && x.t) || (id === pick ? '我等这一刻，等了六集。' : X.pick(['……恭喜。', '没关系，我会一直在。', '是我输了。']))) }; });
    await save(); const c = X.char(pick); if (c) X.say(c, X.v('节目结束了，可我不想让这件事只是个节目。', '镜头关了。现在我可以好好跟你说了。', '你选了我。……谢谢。'));
}
window.gyxShowPick = id => { const i = PICK.indexOf(id); i >= 0 ? PICK.splice(i, 1) : PICK.length < 5 && PICK.push(id); window.gyxShowOpen(); };
window.gyxShowNew = async () => { if (PICK.length < 2) return X.toast('至少选两个男嘉宾', '恋综要有竞争才好看'); const s = { id: 'sh' + Date.now().toString(36), cids: PICK.slice(), at: Date.now(), hearts: {}, eps: [] }; D.seasons.unshift(s); PICK = []; await go(() => openEp(s)); };
window.gyxShowDate = cid => go(() => date(live(), String(cid)));
window.gyxShowReply = async i => { const s = live(), e = s.eps[s.eps.length - 1]; if (!e.date || e.date.pick != null) return; e.date.pick = i; s.hearts[e.date.cid] = (s.hearts[e.date.cid] || 0) + e.date.opts[i].h; await save(); window.gyxShowOpen(); };
window.gyxShowText = cid => go(() => texts(live(), String(cid)));
window.gyxShowNext = () => { const s = live(); return s.eps.length >= EPS ? (s.toFinal = 1, window.gyxShowOpen()) : go(() => openEp(s)); };
window.gyxShowFinal = cid => go(() => finale(live(), String(cid)));
window.gyxShowDel = async id => { D.seasons = D.seasons.filter(s => s.id !== id); await save(); window.gyxShowOpen(); };
window.gyxShowData = () => D;
async function go(fn) { if (busy) return; busy = true; window.gyxShowOpen(); try { await fn(); } finally { busy = false; } window.gyxShowOpen(); }
window.gyxShowOpen = function () {
    const s = live(); let h = '';
    if (busy) h = `<div class="sh-busy">🎬 ${X.v('导演在剪片子……', '正在录制……', '镜头转过来了……')}</div>`;
    else if (!s) {
        h = `<div class="gyx-tip">${X.v('选 2~5 个男嘉宾，你是唯一的女嘉宾。', '他们会为你较劲。', '六集之后，告白夜。')}</div><div class="gyx-row">${X.chars().map(c => `<span class="gyx-chip${PICK.includes(String(c.id)) ? ' on' : ''}" onclick="gyxShowPick('${c.id}')">${X.esc(X.name(c))}</span>`).join('')}</div><button class="gyx-btn" onclick="gyxShowNew()">开拍（${PICK.length} 人）</button>`;
        h += D.seasons.filter(x => x.done).map(x => `<div class="gyx-card"><b>💘 第 ${D.seasons.length - D.seasons.indexOf(x)} 季</b> · 你选了 <b>${X.esc(nm(x.final))}</b><div class="gyx-tip">${x.cids.map(nm).map(X.esc).join('、')} · ${new Date(x.at).toLocaleDateString()}</div>${(x.finalLines || []).map(l => `<div class="sh-l"><b>${X.esc(nm(l.cid))}</b>${X.esc(l.t)}</div>`).join('')}<div class="gyx-tip" style="text-align:right"><span style="cursor:pointer" onclick="gyxShowDel('${x.id}')">删</span></div></div>`).join('');
    } else {
        const e = s.eps[s.eps.length - 1], bar = `<div class="sh-hearts">${s.cids.map(id => `<span><b>${X.esc(nm(id))}</b>💗 ${s.hearts[id] || 0}</span>`).join('')}</div>`;
        h = bar + `<div class="sh-ep">第 ${s.eps.length} / ${EPS} 集 ·「${X.esc(e.theme)}」</div>`;
        if (s.toFinal) h += `<div class="gyx-card sh-fin"><b>🌹 告白夜</b><div class="gyx-tip">六集结束了。你要把玫瑰给谁？</div><div class="gyx-row">${s.cids.map(id => `<button class="gyx-btn lite" onclick="gyxShowFinal('${id}')">🌹 ${X.esc(nm(id))}</button>`).join('')}</div></div>`;
        else {
            h += `<div class="sh-sec"><h4>🎤 开场采访</h4>${e.open.map(o => `<div class="sh-l"><b>${X.esc(nm(o.cid))}</b>${X.esc(o.t)}</div>`).join('')}</div>`;
            if (!e.date) h += `<div class="sh-sec"><h4>💌 这一集你想和谁约会？</h4><div class="gyx-row">${s.cids.map(id => `<button class="gyx-btn lite" onclick="gyxShowDate('${id}')">${X.esc(nm(id))}</button>`).join('')}</div></div>`;
            else {
                h += `<div class="sh-sec"><h4>☕ 和 ${X.esc(nm(e.date.cid))} 的约会</h4><div class="sh-scene">${X.esc(e.date.scene)}</div>${e.date.pick == null ? e.date.opts.map((o, i) => `<button class="gyx-btn lite sh-o" onclick="gyxShowReply(${i})">${X.esc(o.t)}</button>`).join('') : `<div class="sh-l"><b>你</b>${X.esc(e.date.opts[e.date.pick].t)}</div><div class="sh-l"><b>${X.esc(nm(e.date.cid))}</b>${X.esc(e.date.opts[e.date.pick].react)}</div>`}</div>`;
                if (e.date.pick != null && !e.texts) h += `<div class="sh-sec"><h4>📱 今晚的心动短信发给谁？</h4><div class="gyx-row">${s.cids.map(id => `<button class="gyx-btn lite" onclick="gyxShowText('${id}')">${X.esc(nm(id))}</button>`).join('')}</div></div>`;
                if (e.texts) h += `<div class="sh-sec"><h4>📱 你收到的匿名心动短信</h4>${e.texts.map(t => `<div class="sh-sms" onclick="this.classList.add('rev')"><span>${X.esc(t.t)}</span><em>${X.esc(nm(t.from))}</em></div>`).join('')}<div class="gyx-tip">猜猜是谁写的，点一下揭晓</div></div><div class="sh-sec"><h4>🎥 镜头外</h4><div class="sh-scene">${X.esc(e.back)}</div></div><button class="gyx-btn" onclick="gyxShowNext()">${s.eps.length >= EPS ? '🌹 进入告白夜' : '下一集 →'}</button>`;
            }
        }
    }
    X.panel('gyxShowOv', '💘 我们的恋综', h);
};
X.ctx(id => { const s = D.seasons.find(x => x.cids.includes(String(id))); if (!s) return ''; if (!s.done) return `【你在跟别人一起上恋综】她是唯一的女嘉宾，其他男嘉宾：${s.cids.filter(x => x !== String(id)).map(nm).join('、')}。现在第 ${s.eps.length} 集，你的心动值 ${s.hearts[id] || 0}（${hearts(s)}）。你可以吃醋、较劲、嘴硬。`; return Date.now() - s.doneAt < 3 * 864e5 ? `【刚结束的恋综】她最后选了${s.final === String(id) ? '你' : nm(s.final)}。` : ''; }, 'gyxShow');
X.action({ key: 'gyx_show', label: '恋综里：私下给她发消息较劲（要是她在录恋综）', hint: '我们的恋综', need: c => { const s = live(); return !!s && s.cids.includes(String(c.id)) && s.eps.length > 0 && !s.toFinal; },
    run: async c => { const s = live(); return (await X.reach(c, `你们在录恋综（第 ${s.eps.length} 集），心动值：${hearts(s)}。镜头外，你私下给她发一条消息——较劲、吃醋、争取、或者装作不在意`)) ? '在恋综镜头外给你发了消息' : null; } }, 'gyxShow');
X.today(() => { const s = live(); return { title: '💘 恋综', rows: s ? [{ t: '第 ' + s.eps.length + ' 集', x: hearts(s), go: 'gyxShowOpen()' }] : [] }; }, 'gyxShow');
X.widget('gyxShowW', { n: '我们的恋综', sizes: ['s', 'm'], tap: () => window.gyxShowOpen(), r: w => { const s = live(); if (!s) return X.gw(w, '💘', '恋综', [D.seasons.length ? D.seasons.length + ' 季' : '开拍？']); const top = s.cids.slice().sort((a, b) => (s.hearts[b] || 0) - (s.hearts[a] || 0))[0]; return X.gw(w, '💘', '恋综 第' + s.eps.length + '集', ['领先：' + X.esc(nm(top)), '💗 ' + (s.hearts[top] || 0)]); } }, 'gyxShow');
X.mem({ k: 'gyxShow', ico: '💘', n: '我们的恋综', d: '每一季你选了谁、TA 们在告白夜说了什么（在被选中的人那里记着）', items: c => D.seasons.filter(s => s.done && s.cids.includes(String(c.id))), text: s => `你选了${nm(s.final)}。${((s.finalLines || []).find(l => l.cid === s.final) || {}).t || ''}`, meta: s => new Date(s.at).toLocaleDateString() + ' · ' + s.cids.map(nm).join('、'), edit: () => {}, del: (c, i) => { const it = D.seasons.filter(s => s.done && s.cids.includes(String(c.id)))[i]; D.seasons = D.seasons.filter(s => s !== it); }, save }, 'gyxShow');
X.css('gyxShowCss', `.sh-busy{text-align:center;padding:40px 0;font-size:16px}.sh-hearts{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0}.sh-hearts span{background:#fff0f4;border-radius:12px;padding:4px 10px;font-size:12.5px}.sh-hearts b{margin-right:4px}.sh-ep{font-size:15px;font-weight:600;margin:10px 0 4px}.sh-sec{margin:12px 0}.sh-sec h4{font-size:13.5px;margin:0 0 6px;color:#ff4d79}.sh-l{font-size:14px;padding:5px 0;line-height:1.6}.sh-l b{font-size:12px;color:#8e8e93;font-weight:500;margin-right:8px}.sh-scene{font-size:14.5px;line-height:1.8;background:#fafafa;border-radius:12px;padding:10px 12px}.sh-o{display:block;width:100%;text-align:left;margin:6px 0}.sh-sms{background:#fff0f4;border-radius:14px;padding:10px 12px;margin:6px 0;cursor:pointer;display:flex;gap:8px;font-size:14px}.sh-sms span{flex:1}.sh-sms em{font-style:normal;font-size:12px;color:#ff4d79;filter:blur(5px);transition:.3s}.sh-sms.rev em{filter:none}.sh-fin{background:#fff5f7}`);
X.mini({ id: 'gyxShow', icon: '💘', title: '我们的恋综', desc: '角色们一起上恋综，你是唯一的女嘉宾', cat: '一起做', onOpen: () => window.gyxShowOpen() });
(() => { const reg = () => { if (typeof registerMiniGame !== 'function') return false; registerMiniGame({ id: 'gyxShow', name: '我们的恋综', icon: '💘', getStatus: () => null, onResume: () => window.gyxShowOpen(), onStart: () => window.gyxShowOpen() }); return true; }; if (!reg()) { let n = 0; const iv = setInterval(() => { if (reg() || ++n > 40) clearInterval(iv); }, 500); } })();
(async () => { D = Object.assign(D, await S.get('d', {})); D.seasons = D.seasons || []; })();
