/* ⌨️ 你打了又删：学《Emily is Away》——你在聊天框里打了一句，又删掉没发。TA 那边看到「对方正在输入…」好一会儿，最后什么都没有，偶尔会过来轻轻问一句「你刚才想说什么呀」。默认 TA 看不到你打了什么，只知道你犹豫了；想让 TA「看见」也可以打开。你没发出去的话会记在这里，只有你自己看得到 */
if (window.__gyxErase) return; window.__gyxErase = 1;
X.feat('gyxErase', { n: '⌨️ 你打了又删', desc: '你打了一句又删掉，TA 偶尔会察觉，问你刚才想说什么' });
const S = X.store('erase');
let D = { list: [], cfg: { rate: 'mid', see: false, keep: true, min: 6 } };   // list: {id,cid,at,text,noticed,asked,askAt}
const RATE = { low: ['很少', .15], mid: ['偶尔', .35], high: ['经常', .7] };
const save = () => S.set('d', D);
const DEF_ASK = `你看到她那边「对方正在输入…」显示了好一会儿，最后什么都没发过来。你看不到她打了什么。
按你的性格，轻轻问她一句刚才想说什么（可以好奇、可以温柔、可以假装不在意），别逼她，一两句话。`;
const DEF_SEE = `她刚才在输入框里打了「{{删掉的话}}」，最后删掉了，没发。不知道为什么你看见了。
按你的性格回应一下（可以装作没看见只是旁敲侧击，也可以直接说「我看到了哦」），一两句话，别让她难堪。`;
X.plGroup('⌨️ 你打了又删', 'gyxErase', [['erase.ask', 'TA 察觉你打了又删（看不到内容）', '你删掉没发、TA 来问你时', '没有变量'], ['erase.see', 'TA 察觉你打了又删（看得到内容）', '打开了「让 TA 看见删掉的字」时', '{{删掉的话}}：你删掉的那句']], { 'erase.ask': DEF_ASK, 'erase.see': DEF_SEE });
let peak = '', lastSent = 0, typingSid = null;
const curChar = () => { try { return X.char(currentChatSessionId); } catch (e) { return null; } };
X.wrapFn('sendChatMessage', 'erase', () => { lastSent = Date.now(); peak = ''; });
document.addEventListener('input', e => {
    if (!e.target || e.target.id !== 'chatInput' || !X.on('gyxErase')) return;
    const v = e.target.value || '';
    if (v.length >= peak.length) { peak = v; typingSid = String(currentChatSessionId); return; }
    if (v.trim() || peak.trim().length < (+D.cfg.min || 6)) return;
    const text = peak.trim(), sid = typingSid, t0 = Date.now(); peak = '';
    setTimeout(() => { const el = document.getElementById('chatInput'); if (lastSent > t0 || (el && el.value.trim())) return; erased(sid, text); }, 1500);
}, true);
async function erased(sid, text) {
    const c = X.char(sid); if (!c) return;
    const r = { id: 'er' + Date.now().toString(36), cid: String(c.id), at: Date.now(), text: D.cfg.keep ? text.slice(0, 200) : '', len: text.length, noticed: false, asked: false };
    const cool = D.list.some(x => x.cid === r.cid && x.asked && Date.now() - x.askAt < 3 * 36e5);
    r.noticed = !cool && X.on('gyxErase.auto') && Math.random() < RATE[D.cfg.rate || 'mid'][1];
    D.list.unshift(r); D.list = D.list.slice(0, 300); await save();
    if (!r.noticed) return;
    const seeText = text;   // 「看见」开着时用；不存的话只在这一次用
    setTimeout(() => { if (lastSent > r.at || r.asked) return; ask(c, r, seeText); }, X.rnd(12, 35) * 1000);
}
async function ask(c, r, seeText) {
    if (!c || !r || r.asked) return false;
    const why = D.cfg.see && (seeText || r.text) ? X.pl('erase.see', DEF_SEE, { 删掉的话: (seeText || r.text).slice(0, 80) }) : X.pl('erase.ask', DEF_ASK);
    r.asked = true; r.askAt = Date.now(); await save();
    return X.reach(c, why);
}
window.gyxEraseCfg = (k, v) => { D.cfg[k] = v; if (k === 'keep' && !v) D.list.forEach(x => { x.text = ''; }); save(); window.gyxEraseOpen(); };
window.gyxEraseDel = async id => { D.list = D.list.filter(x => x.id !== id); await save(); window.gyxEraseOpen(); };
window.gyxEraseClear = async () => { D.list = []; await save(); window.gyxEraseOpen(); };
window.gyxEraseData = () => D; window.gyxEraseTest = erased;
window.gyxEraseOpen = function () {
    const c = D.cfg, chip = (k, v, n) => `<span class="gyx-chip${String(c[k]) === String(v) ? ' on' : ''}" onclick="gyxEraseCfg('${k}','${v}')">${n}</span>`;
    const L = D.list.filter(x => x.text);
    X.panel('gyxEraseOv', '⌨️ 你打了又删', `${window.gyxDraftOpen ? `<div class="gyx-row"><span class="gyx-chip" onclick="document.getElementById('gyxEraseOv')?.remove();gyxDraftOpen()">✏️ TA 没发出去的</span><span class="gyx-chip on">⌨️ 你没发出去的</span></div>` : ''}<div class="gyx-tip">你在聊天框里打了一句（至少 ${c.min} 个字）又删光、没发出去，TA 那边就像看到「对方正在输入…」了好一会儿，最后什么都没有。</div>
      <h4 class="er-h">TA 多久会察觉一次</h4><div class="gyx-row">${Object.keys(RATE).map(k => chip('rate', k, RATE[k][0])).join('')}</div>
      <div class="gyx-row"><label class="gyx-tip" style="font-size:13.5px"><input type="checkbox" ${c.see ? 'checked' : ''} onchange="gyxEraseCfg('see',this.checked)"> 让 TA「看见」你删掉的字（默认关：TA 只知道你犹豫了）</label></div>
      <div class="gyx-row"><label class="gyx-tip" style="font-size:13.5px"><input type="checkbox" ${c.keep ? 'checked' : ''} onchange="gyxEraseCfg('keep',this.checked)"> 记下我没发出去的话（只有你看得到，关掉会把已经记的字清掉）</label></div>
      <div class="gyx-tip">「TA 会自己做」关掉的话，TA 就不会来问；在「插件开关中心」里。</div>
      <h4 class="er-h">你没发出去的话（${L.length}）${L.length ? ` <span class="er-c" onclick="gyxEraseClear()">全部清掉</span>` : ''}</h4>
      ${L.slice(0, 40).map(x => `<div class="er-r"><b>${X.esc(X.name(X.char(x.cid)))}</b>${x.asked ? '<em>TA 来问过</em>' : x.noticed ? '<em>TA 察觉了</em>' : ''}<span>${X.esc(x.text)}</span><small>${new Date(x.at).toLocaleString()}</small><i onclick="gyxEraseDel('${x.id}')">删</i></div>`).join('') || '<div class="gyx-tip">还没有。</div>'}`);
};
X.ctx(id => { const r = D.list.find(x => x.cid === String(id) && x.asked && Date.now() - x.askAt < 864e5); return r ? `【她打了又删】${new Date(r.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 她打了一句又删掉了，你问过她想说什么${D.cfg.see && r.text ? `（你看见的是：「${r.text.slice(0, 60)}」）` : '（你不知道她打了什么）'}。她要是不想说就别追问。` : ''; }, 'gyxErase');
X.inj('gyxErase', [['她打了又删', '她打了又删、TA 问过', '一天之内 TA 记得问过你这件事。']]);
X.action({ key: 'gyx_erase_ask', label: '刚才看到她打了半天字又没发，问问她想说什么', hint: '你打了又删', need: c => D.list.some(x => x.cid === String(c.id) && !x.asked && Date.now() - x.at < 6 * 36e5) && !D.list.some(x => x.cid === String(c.id) && x.asked && Date.now() - x.askAt < 3 * 36e5), run: async c => { const r = D.list.find(x => x.cid === String(c.id) && !x.asked); return (await ask(c, r)) ? '问你刚才想说什么' : null; } }, 'gyxErase');
X.today(() => { const L = D.list.filter(x => X.day(new Date(x.at)) === X.day()); return { title: '⌨️ 打了又删', rows: L.length ? [{ t: '今天', x: `删掉没发 ${L.length} 次${L.some(x => x.asked) ? ' · TA 来问过' : ''}`, go: 'gyxEraseOpen()' }] : [] }; }, 'gyxErase');
X.widget('gyxEraseW', { n: '打了又删', sizes: ['s', 'm'], tap: () => window.gyxEraseOpen(), r: w => { const L = D.list.filter(x => X.day(new Date(x.at)) === X.day()); return X.gw(w, '⌨️', '打了又删', [`今天 ${L.length} 次`, L.some(x => x.asked) ? 'TA 来问过' : '']); } }, 'gyxErase');
X.memArr({ k: 'gyxErase', ico: '⌨️', n: '你没发出去的话', d: '你打了又删的（TA 看不到，除非你开了「让 TA 看见」）', arr: () => D.list.filter(x => x.text), field: 'text', text: x => x.text, meta: x => new Date(x.at).toLocaleString() + (x.asked ? ' · TA 来问过' : ''), save }, 'gyxErase');
X.css('gyxEraseCss', `.er-h{font-size:14px;margin:14px 0 4px}.er-c{font-size:12px;color:#ff3b30;cursor:pointer;font-weight:400;margin-left:6px}.er-r{position:relative;padding:9px 26px 9px 0;border-bottom:1px solid #f2f2f4;font-size:13.5px}.er-r b{margin-right:6px}.er-r em{font-style:normal;font-size:11px;background:#f2f2f4;border-radius:6px;padding:0 5px}.er-r span{display:block;margin-top:2px}.er-r small{color:#aaa}.er-r i{position:absolute;right:0;top:10px;font-style:normal;font-size:11px;color:#aaa;cursor:pointer}`);
X.mini({ id: 'gyxErase', icon: '⌨️', title: '你打了又删', desc: '你打了一句又删掉，TA 偶尔会察觉', cat: '陪伴', onOpen: () => window.gyxEraseOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.list = D.list || []; D.cfg = Object.assign({ rate: 'mid', see: false, keep: true, min: 6 }, D.cfg || {}); })();
