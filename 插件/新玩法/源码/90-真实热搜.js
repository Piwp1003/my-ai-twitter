/* 🔥 真实热搜：联网拉微博 / 知乎 / B站 / 抖音 / 百度的真实热搜（几个公开接口轮着试，也能填自己的接口地址、或者直接粘贴），TA 知道今天外面在聊什么，会挑一条跟你聊。拉不到的时候客服会提醒你 */
if (window.__gyxHot) return; window.__gyxHot = 1;
X.feat('gyxHot', { n: '🔥 真实热搜', desc: '联网拉今天的真实热搜，TA 会挑一条跟你聊' });
const S = X.store('hot');
let D = { src: ['weibo', 'zhihu'], custom: '', lists: {}, talk: [], last: {}, err: '' };   // lists[src] = {at, items:[{t,hot,url}]}；talk: {id,cid,at,src,t,line}
const SRC = { weibo: '微博', zhihu: '知乎', bili: 'B站', douyin: '抖音', baidu: '百度' };
// 公开的热搜接口（谁先通用谁）。{s} 换成各家的写法
const API = [
    { u: 'https://60s.viki.moe/v2/{s}', s: { weibo: 'weibo', zhihu: 'zhihu', bili: 'bili', douyin: 'douyin', baidu: 'baidu/hot' } },
    { u: 'https://api-hot.imsyy.top/{s}', s: { weibo: 'weibo', zhihu: 'zhihu', bili: 'bilibili', douyin: 'douyin', baidu: 'baidu' } },
    { u: 'https://api.pearktrue.cn/api/dailyhot/?title={s}', s: { weibo: '微博', zhihu: '知乎', bili: '哔哩哔哩', douyin: '抖音', baidu: '百度' } }
];
const saveD = () => S.set('d', D);
// 不管接口长什么样，找一个「每项都有标题」的数组
function parse(j) {
    const seen = new Set(); let best = null;
    (function walk(o, depth) { if (!o || depth > 4 || seen.has(o)) return; seen.add(o); if (Array.isArray(o)) { const ok = o.filter(x => x && typeof x === 'object' && (x.title || x.name || x.word || x.keyword || x.query)); if (ok.length >= 5 && (!best || ok.length > best.length)) best = ok; o.slice(0, 3).forEach(x => walk(x, depth + 1)); return; } if (typeof o === 'object') Object.values(o).forEach(v => walk(v, depth + 1)); })(j, 0);
    return (best || []).slice(0, 30).map(x => ({ t: X.plain(x.title || x.name || x.word || x.keyword || x.query).slice(0, 60), hot: x.hot_value || x.hot || x.heat || x.hotValue || '', url: x.link || x.url || x.mobileUrl || '' })).filter(x => x.t);
}
async function get(u) { const ac = typeof AbortController !== 'undefined' ? new AbortController() : null; const tm = setTimeout(() => ac && ac.abort(), 9000); try { const r = await fetch(u, { signal: ac && ac.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(tm); } }
async function pull(src, force) {
    const old = D.lists[src]; if (!force && old && Date.now() - old.at < 2 * 3600e3) return old;
    const tries = [];
    if (D.custom) tries.push(D.custom.replace('{s}', encodeURIComponent(src)).replace('{src}', encodeURIComponent(src)));
    API.forEach(a => { if (a.s[src]) tries.push(a.u.replace('{s}', a.s[src])); });
    let lastErr = '';
    for (const u of tries) { try { const items = parse(await get(u)); if (items.length) { D.lists[src] = { at: Date.now(), items, from: u.split('/')[2] }; D.err = ''; await saveD(); return D.lists[src]; } lastErr = '接口返回里没找到热搜列表'; } catch (e) { lastErr = (e && e.message) || String(e); } }
    D.err = `${SRC[src]}热搜拉不下来（${lastErr}）`; await saveD();
    try { if (window.gyHelpReport) window.gyHelpReport(`真实热搜：${SRC[src]}拉不下来`, `试了 ${tries.length} 个接口都没成功（${lastErr}）。可能是网络连不上，或者接口挂了。可以在「🔥 真实热搜」里填一个自己能用的接口地址，或者直接把热搜粘贴进去。`, { kind: 'plugin', src: '真实热搜', acts: [['🔥 打开热搜', 'view', 'miniHub']] }); } catch (e) {}
    return old || null;
}
async function pullAll(force) { for (const s of D.src) await pull(s, force); }
const today = () => D.src.reduce((a, s) => a.concat(((D.lists[s] || {}).items || []).slice(0, 10).map(x => Object.assign({ src: s }, x))), []);
window.gyxHotPaste = async () => { const t = ((document.getElementById('gyxHtPaste') || {}).value || '').split('\n').map(s => s.replace(/^\s*\d+[.、\s]*/, '').trim()).filter(Boolean); if (!t.length) return; D.lists.paste = { at: Date.now(), items: t.slice(0, 30).map(x => ({ t: x.slice(0, 60) })), from: '你粘贴的' }; if (!D.src.includes('paste')) D.src.push('paste'); SRC.paste = '粘贴'; await saveD(); window.gyxHotOpen(); };
window.gyxHotSrc = async (s, on) => { D.src = D.src.filter(x => x !== s); if (on) D.src.push(s); await saveD(); if (on) await pull(s); window.gyxHotOpen(); };
window.gyxHotCustom = async v => { D.custom = String(v || '').trim(); await saveD(); };
window.gyxHotRefresh = async () => { X.toast(X.v('🔥 在刷新', '🔥 去看看外面在聊什么'), ''); await pullAll(true); window.gyxHotOpen(); };
async function talk(c, item) {
    const it = item || X.pick(today().filter(x => !D.talk.some(k => k.t === x.t && k.cid === String(c.id)))); if (!it) return null;
    const line = X.bailu() ? '' : X.plain(await X.ask(`${X.who(c)}\n你刷到一条真实的热搜：「${it.t}」（${SRC[it.src] || ''}）。用你的身份和性格，想一句你会跟她怎么聊起这件事（不要编造热搜标题里没有的具体细节）。只输出这一句。`) || '');
    const k = { id: 'ht' + Date.now().toString(36), cid: String(c.id), at: Date.now(), src: it.src, t: it.t, line }; D.talk.unshift(k); D.talk = D.talk.slice(0, 80); await saveD(); return k;
}
window.gyxHotTalk = async (cid, i) => { const c = X.char(cid) || X.cur(); const it = today()[i]; const k = await talk(c, it); if (!k) return; await X.reach(c, `你刷到了热搜「${k.t}」，想跟她聊聊${k.line ? '（你想说：' + k.line + '）' : ''}。不要编造热搜里没有的细节，可以问她怎么看`); X.toast(X.v('已经叫 TA 来聊了', '💬 TA 去找你聊这个了'), k.t); };
window.gyxHotOpen = async function (who) {
    const c = X.char(who) || X.cur(); const cid = c ? String(c.id) : '';
    if (D.src.some(s => s !== 'paste' && (!D.lists[s] || Date.now() - D.lists[s].at > 2 * 3600e3))) { X.panel('gyxHtOv', '🔥 真实热搜', '<div class="gyx-tip">正在拉今天的热搜……</div>'); await pullAll(); }
    const L = today();
    X.panel('gyxHtOv', '🔥 真实热搜', `<div class="gyx-row">${Object.entries(SRC).filter(([k]) => k !== 'paste').map(([k, n]) => `<span class="gyx-chip ${D.src.includes(k) ? 'on' : ''}" onclick="gyxHotSrc('${k}',${!D.src.includes(k)})">${n}</span>`).join('')}<button class="gyx-btn lite" onclick="gyxHotRefresh()">刷新</button></div>
        ${D.err ? `<div class="gyx-tip" style="color:#ff3b30">⚠️ ${X.esc(D.err)}</div>` : ''}
        ${L.length ? L.map((x, i) => `<div class="ht-it"><em>${i + 1}</em><span>${X.esc(x.t)}<i>${X.esc(SRC[x.src] || '')}${x.hot ? ' · ' + X.esc(String(x.hot)) : ''}</i></span>${c ? `<b onclick="gyxHotTalk('${cid}',${i})" title="叫 TA 来聊这个">💬</b>` : ''}</div>`).join('') : '<div class="gyx-tip">还没拉到热搜。</div>'}
        <details class="gyx-card"><summary>拉不下来？</summary><div class="gyx-tip">可以填一个你能用的接口地址（返回 JSON 就行，地址里的 {s} 会换成 weibo / zhihu / bili / douyin / baidu），或者直接把热搜粘贴进来，一行一条。</div>
            <input class="gyx-in" placeholder="https://你的接口/{s}" value="${X.esc(D.custom)}" onchange="gyxHotCustom(this.value)"><textarea id="gyxHtPaste" class="gyx-in" rows="4" placeholder="1. 第一条热搜&#10;2. 第二条……"></textarea><div class="gyx-row"><button class="gyx-btn lite" onclick="gyxHotPaste()">用粘贴的</button></div></details>
        ${D.talk.filter(k => k.cid === cid).slice(0, 8).map(k => `<div class="gyx-tip">💬 ${X.esc(X.name(c))} 聊过「${X.esc(k.t)}」${k.line ? '：' + X.esc(k.line) : ''}</div>`).join('')}`);
};
window.gyxHotData = () => D;
window.gyxHotParse = parse;
X.ctx(id => { const L = today().slice(0, 8); if (!L.length) return ''; return `【今天外面的真实热搜】${L.map(x => x.t).join('；')}。你知道今天外面在聊这些，可以自然地聊起一两条（按你的身份和兴趣），不用每句都提，不要编造标题以外的细节。`; }, 'gyxHot');
X.action({ key: 'gyx_hot', label: '刷到一条热搜，想跟她聊聊', hint: '今天真实世界里的热点', need: c => today().length > 0 && !D.talk.some(k => k.cid === String(c.id) && Date.now() - k.at < 864e5 / 2),
    run: async c => { const k = await talk(c); if (!k) return null; return (await X.reach(c, `你刷到了热搜「${k.t}」，想跟她聊聊${k.line ? '（你想说：' + k.line + '）' : ''}。不要编造热搜里没有的细节`)) ? '聊了热搜：' + k.t.slice(0, 18) : null; } }, 'gyxHot');
X.today(() => { const L = today().slice(0, 3); return { title: '🔥 今天的热搜', rows: L.map(x => ({ t: SRC[x.src] || '', x: X.esc(x.t), go: 'gyxHotOpen()' })).concat(D.talk.filter(k => X.day(new Date(k.at)) === X.day()).slice(0, 2).map(k => ({ t: X.esc(X.name(X.char(k.cid))), x: '聊了「' + X.esc(k.t) + '」', go: 'gyxHotOpen()' }))) }; }, 'gyxHot');
X.widget('gyxHotW', { n: '真实热搜', sizes: ['s', 'm', 'l'], tap: () => window.gyxHotOpen(), r: w => { const L = today(); if (w.size === 'l') return `<div class="gw-x m"><div class="h"><b>🔥</b><span>今天的热搜</span></div>${L.slice(0, 7).map((x, i) => `<em>${i + 1}. ${X.esc(x.t)}</em>`).join('') || '<em>还没拉到</em>'}</div>`; return X.gw(w, '🔥', '热搜', L.length ? [X.esc(L[0].t), L[1] ? X.esc(L[1].t) : ''] : ['还没拉到', '点我刷新']); } }, 'gyxHot');
X.memArr({ k: 'gyxHot', ico: '🔥', n: 'TA 聊过的热搜', d: 'TA 挑来跟你聊的热点', arr: () => D.talk, field: 'line', text: k => `「${k.t}」${k.line ? '｜' + k.line : ''}`, edit: (k, v) => { k.line = String(v).split('｜').slice(1).join('｜'); }, save: saveD }, 'gyxHot');
X.css('gyxHtCss', `.ht-it{display:flex;gap:10px;align-items:flex-start;padding:8px 2px;border-bottom:1px solid #f2f2f4;font-size:14px}.ht-it em{font-style:normal;color:#ff6b35;font-weight:700;width:20px;text-align:right}.ht-it span{flex:1;min-width:0}.ht-it i{display:block;font-style:normal;font-size:11.5px;color:#8e8e93}.ht-it b{cursor:pointer;font-weight:normal}`);
X.mini({ id: 'gyxHot', icon: '🔥', title: '真实热搜', desc: '今天外面在聊什么，TA 也知道', cat: '生活', onOpen: () => window.gyxHotOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.lists = D.lists || {}; D.talk = D.talk || {}; if (!Array.isArray(D.talk)) D.talk = []; if (D.src.includes('paste')) SRC.paste = '粘贴'; setTimeout(() => { if (X.on('gyxHot')) pullAll().catch(() => {}); }, 8000); setInterval(() => { if (X.on('gyxHot')) pullAll().catch(() => {}); }, 2 * 3600e3); })();
