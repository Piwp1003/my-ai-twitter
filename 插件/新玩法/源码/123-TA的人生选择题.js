/* 🗳️ TA的人生选择题：TA 遇到真事拿不定主意——要不要换工作、剪不剪头发、要不要回老家、该不该跟朋友和好——来问你。你选了，TA 就真的照做，日程和聊天里都会跟着变；过几天 TA 回来告诉你结果怎么样 */
if (window.__gyxDilemma) return; window.__gyxDilemma = 1;
X.feat('gyxDilemma', { n: '🗳️ TA的人生选择题', desc: 'TA 拿不定主意来问你，你选了 TA 就照做，过几天告诉你结果' });
const S = X.store('dilemma');
let D = { list: [] };   // {id, cid, at, q, ctx, opts:[], pick, note, line, pickAt, due, outcome, outAt, self}
const DAY = 864e5;
const save = () => S.set('d', D);
const open_ = cid => D.list.find(x => x.cid === String(cid) && !x.outcome);
async function ask(c) {
    if (!c || open_(c.id)) return null; const past = D.list.filter(x => x.cid === String(c.id)).slice(0, 6).map(x => x.q);
    let o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n你们最近的聊天：\n${X.recent(c, 20)}\n\n你最近在生活里遇到一件拿不定主意的事（要符合你的身份和处境：工作、家人、朋友、爱好、外表、搬家、钱……真实、具体，不要涉及她本人去留这种大事），想听听她的意见。以前问过的：${past.join('；') || '没有'}（别重复）。\n只输出 JSON：{"q":"你的问题，像真的在问她，30字内","ctx":"一点背景，40字内","opts":["选项1，10字内","选项2","选项3（可以没有）"]}`));
    if (!o || !o.q || !Array.isArray(o.opts) || o.opts.length < 2) o = X.pick([{ q: '我在想要不要把头发剪短，你觉得呢？', ctx: '天热了，而且有点想换个样子', opts: ['剪！', '别剪，现在就很好', '剪一点点'] }, { q: '公司让我去外地出差一个月，要不要答应？', ctx: '能学到东西，但要很久见不到人', opts: ['去吧', '别去', '先问问能不能短一点'] }, { q: '老朋友找我借钱，借还是不借？', ctx: '以前帮过我，但这次数目不小', opts: ['借', '不借', '借一半'] }]);
    const x = { id: 'dl' + Date.now().toString(36), cid: String(c.id), at: Date.now(), q: X.plain(o.q), ctx: X.plain(o.ctx || ''), opts: o.opts.slice(0, 3).map(X.plain).filter(Boolean) };
    D.list.unshift(x); await save();
    X.say(c, `🗳️ ${x.q}${x.ctx ? '（' + x.ctx + '）' : ''}`);
    X.notify(c, `🗳️ <b>${X.esc(X.name(c))}</b> 有件事想听你的意见`, x.q, () => window.gyxDilemmaOpen(c.id));
    return x;
}
window.gyxDilemmaPick = async (id, i) => {
    const x = D.list.find(y => y.id === id), c = x && X.char(x.cid); if (!x || !c || x.pick != null) return;
    const el = document.getElementById('gyxDlNote'); x.pick = i; x.note = el ? el.value.trim().slice(0, 100) : ''; x.pickAt = Date.now(); x.due = Date.now() + (2 + Math.random() * 2) * DAY;
    x.line = X.plain(await X.ask(`${X.who(c)}\n你问她「${x.q}」，她选了「${x.opts[i]}」${x.note ? '，还说：' + x.note : ''}。你决定听她的。说一句，20字以内。`) || '') || X.v('好，听你的。', '嗯，那就这么办。', '你说的我都信。');
    await save(); X.say(c, x.line); window.gyxDilemmaOpen(x.cid);
};
async function report(x) {
    const c = X.char(x.cid); if (!c || x.outcome) return null;
    const choice = x.pick != null ? x.opts[x.pick] : null;
    x.self = choice == null; const ch = choice || X.pick(x.opts);
    x.outcome = X.plain(await X.ask(`${X.who(c)}\n几天前你问她「${x.q}」，${choice ? `她让你「${choice}」，你照做了` : `她一直没回你，你自己选了「${ch}」`}。现在过去几天了，结果怎么样？（可以顺利、可以有小波折、可以出乎意料，要真实）按你的性格告诉她，50字以内。`) || '') || (choice ? X.v(`那件事，我听了你的，结果还挺好的。`, `照你说的做了，一开始有点难，现在觉得是对的。`) : X.v('你没回我，我就自己决定了……其实还挺想听你说的。', '我自己选了，还行吧。'));
    if (x.self) x.pick = x.opts.indexOf(ch);
    x.outAt = Date.now(); await save();
    X.say(c, '🗳️ ' + x.outcome); X.notify(c, `🗳️ <b>${X.esc(X.name(c))}</b> 告诉你那件事的结果`, x.q, () => window.gyxDilemmaOpen(c.id));
    return x;
}
window.gyxDilemmaAsk = async cid => { const x = await ask(X.char(cid) || X.cur()); if (!x) X.toast('还有一件没说完', '先回 TA 上一个问题吧'); window.gyxDilemmaOpen(cid); };
window.gyxDilemmaReport = async id => { const x = D.list.find(y => y.id === id); if (x) await report(x); window.gyxDilemmaOpen(x && x.cid); };
window.gyxDilemmaDel = async id => { D.list = D.list.filter(x => x.id !== id); await save(); window.gyxDilemmaOpen(); };
window.gyxDilemmaData = () => D;
window.gyxDilemmaOpen = function (who) {
    const c = X.char(who) || X.cur(); if (!c) return; const cid = String(c.id), cur = open_(cid), past = D.list.filter(x => x.cid === cid && x.outcome);
    X.panel('gyxDilemmaOv', '🗳️ ' + X.esc(X.name(c)) + ' 的选择题', `<div class="gyx-row">${X.whoSel(cid, 'gyxDilemmaOpen')}${cur ? '' : `<button class="gyx-btn lite" onclick="gyxDilemmaAsk('${cid}')">问问 TA 最近在纠结什么</button>`}</div>
      ${cur ? `<div class="gyx-card dl-q"><b>${X.esc(cur.q)}</b>${cur.ctx ? `<div class="gyx-tip">${X.esc(cur.ctx)}</div>` : ''}
        ${cur.pick == null ? `${cur.opts.map((o, i) => `<button class="gyx-btn lite dl-o" onclick="gyxDilemmaPick('${cur.id}',${i})">${X.esc(o)}</button>`).join('')}<input id="gyxDlNote" class="gyx-in" placeholder="想多说一句（可以不写）" style="margin-top:6px"><div class="gyx-tip">你选哪个，TA 就照做。三天不回，TA 就自己拿主意了。</div>`
          : `<div class="dl-pick">你选了：<b>${X.esc(cur.opts[cur.pick])}</b>${cur.note ? '　「' + X.esc(cur.note) + '」' : ''}</div><div class="gyx-tip">${X.esc(X.name(c))}：${X.esc(cur.line || '')}</div><div class="gyx-tip">${Date.now() < cur.due ? '过几天 TA 会告诉你结果（大概 ' + new Date(cur.due).toLocaleDateString() + '）' : '结果应该出来了'}${Date.now() >= cur.due ? ` <span style="cursor:pointer;color:#1d9bf0" onclick="gyxDilemmaReport('${cur.id}')">问问 TA 怎么样了 ›</span>` : ''}</div>`}</div>` : `<div class="gyx-tip">${X.v('TA 现在没什么拿不定的。', '暂时没有要问你的。')}TA 遇到事会自己来问你（自主模式里）。</div>`}
      ${past.length ? '<h4 class="dl-h">以前问过你的</h4>' + past.map(x => `<div class="dl-r"><b>${X.esc(x.q)}</b><div>${x.self ? 'TA 自己选了' : '你选了'}「${X.esc(x.opts[x.pick] || '')}」</div><em>结果：${X.esc(x.outcome)}</em><i onclick="gyxDilemmaDel('${x.id}')">删</i></div>`).join('') : ''}`);
};
// 到时间了：TA 回来说结果 / 三天没回就自己拿主意
setInterval(() => { try { if (!X.on('gyxDilemma')) return; D.list.filter(x => !x.outcome && ((x.pick != null && Date.now() >= x.due + DAY) || (x.pick == null && Date.now() - x.at > 3 * DAY))).slice(0, 1).forEach(report); } catch (e) {} }, 30 * 60000);
X.ctx(id => { const L = D.list.filter(x => x.cid === String(id)); if (!L.length) return ''; const cur = open_(id); const done = L.filter(x => x.outcome).slice(0, 4); return (cur ? (cur.pick == null ? `【你在等她的意见】你问了她「${cur.q}」，她还没回。` : `【你听了她的】「${cur.q}」她让你「${cur.opts[cur.pick]}」，你正在照做，结果还没出来。`) : '') + (done.length ? `【以前问过她的事】${done.map(x => `「${x.q}」→${x.opts[x.pick] || ''}，结果：${x.outcome}`).join('；')}` : ''); }, 'gyxDilemma');
X.action({ key: 'gyx_dilemma', label: '生活里遇到一件拿不定主意的事，问问她的意见', hint: 'TA的人生选择题', need: c => !open_(c.id) && !D.list.some(x => x.cid === String(c.id) && Date.now() - x.at < 4 * DAY), run: async c => (await ask(c)) ? '问你一件拿不定主意的事' : null }, 'gyxDilemma');
X.action({ key: 'gyx_dilemma_result', label: '告诉她上次那件事（她帮你选的）结果怎么样了', hint: 'TA的人生选择题', need: c => { const x = open_(c.id); return !!x && x.pick != null && Date.now() >= x.due; }, run: async c => (await report(open_(c.id))) ? '告诉你那件事的结果' : null }, 'gyxDilemma');
X.today(() => ({ title: '🗳️ 选择题', rows: D.list.filter(x => !x.outcome && X.char(x.cid)).map(x => ({ t: X.name(X.char(x.cid)), x: x.pick == null ? '等你回：' + X.esc(x.q) : '照你说的在做', go: `gyxDilemmaOpen('${x.cid}')` })) }), 'gyxDilemma');
X.widget('gyxDilemmaW', { n: 'TA的选择题', sizes: ['s', 'm'], tap: () => window.gyxDilemmaOpen(), r: w => { const x = D.list.find(y => !y.outcome); return X.gw(w, '🗳️', '选择题', x ? [x.pick == null ? '等你回' : '照你说的在做', X.esc(x.q).slice(0, 14)] : [D.list.length ? '问过你 ' + D.list.length + ' 次' : '暂时没有']); } }, 'gyxDilemma');
X.memArr({ k: 'gyxDilemma', ico: '🗳️', n: 'TA的人生选择题', d: 'TA 问过你的事、你选的、后来的结果', arr: () => D.list, field: 'outcome', text: x => `${x.q} → ${x.pick != null ? x.opts[x.pick] : '（还没选）'}${x.outcome ? '；结果：' + x.outcome : ''}`, edit: (x, v) => { const m = String(v).match(/；结果：(.*)$/); if (m) x.outcome = m[1]; }, meta: x => new Date(x.at).toLocaleDateString() + (x.outcome ? ' · 有结果了' : ' · 进行中'), save }, 'gyxDilemma');
X.css('gyxDilemmaCss', `.dl-q b{font-size:16.5px}.dl-o{display:block;width:100%;text-align:left;margin:6px 0}.dl-pick{margin:8px 0 4px;font-size:14px}.dl-h{font-size:14px;margin:14px 0 6px}.dl-r{position:relative;padding:10px 0;border-bottom:1px solid #f2f2f4;font-size:13.5px}.dl-r b{font-weight:600}.dl-r em{display:block;font-style:normal;color:#666;margin-top:2px}.dl-r i{position:absolute;right:0;top:10px;font-style:normal;font-size:11px;color:#aaa;cursor:pointer}`);
X.mini({ id: 'gyxDilemma', icon: '🗳️', title: 'TA的人生选择题', desc: 'TA 拿不定主意来问你，你选了 TA 就照做', cat: '一起做', onOpen: () => window.gyxDilemmaOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.list = D.list || []; })();
