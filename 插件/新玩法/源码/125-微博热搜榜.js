/* 🔥 微博热搜榜：打开以后，主页旁边的「趋势 / 标签排行」变成微博那种热搜榜——1~20 名、热度数字、「爆 / 沸 / 热 / 新」小标签。热度按主页上真实的帖子算（最近三天谁在聊、赞和评论多少、营销号爆料加权），不是随便编的。标题可以用微博的口吻起（「XX深夜现身江边」那种，副 API，起过的记住）。关掉就回到原来的标签排行 */
if (window.__gyxHotList) return; window.__gyxHotList = 1;
X.feat('gyxHotList', { n: '🔥 微博热搜榜', desc: '把标签排行变成微博热搜风格（微博口吻的标题、热度、爆 / 沸 / 热 / 新）', def: false });
const S = X.store('hotlist');
let D = { first: {}, tops: [], titles: {}, wb: true };   // first: {tag: 第一次见到的时间}  tops: [{tag, at, heat}] 上过第一的  titles: {tag: 微博口吻的标题}
const P = (id, def, vars) => { let t = def; try { if (typeof gyPL === 'function') return gyPL(id, def, vars); } catch (e) {} Object.keys(vars || {}).forEach(k => { t = t.split('{{' + k + '}}').join(vars[k] == null ? '' : String(vars[k])); }); return t; };
const DEF_TITLE = `你是微博热搜的编辑。下面是站内正在热议的话题，每个话题后面附了几条相关帖子。
{{话题}}
给每个话题起一个微博热搜那样的标题：
· 像真的微博热搜：人名 + 动作 / 事件，短、直接、有点勾人，比如「XX回应恋爱传闻」「XX深夜现身江边」「XX和XX同框」「XX 好会」「XX一句话破防」
· 8~18 个字，不要 # 号，不要句号，不要编帖子里没有的大事
只输出 JSON：{"原话题":"标题", ...}`;
P('hot.title', DEF_TITLE);
const regPL = () => { if (typeof window.gyPLGroupAdd !== 'function') return false; window.gyPLGroupAdd({ g: '🔥 微博热搜榜', plug: 'gyxHotList', items: [['hot.title', '热搜标题怎么起', '热搜榜打开、并且勾了「用微博的口吻起标题」时', '{{话题}}：这批话题和每个话题下的几条帖子']] }); return true; };
if (!regPL()) { let n = 0; const iv = setInterval(() => { if (regPL() || ++n > 40) clearInterval(iv); }, 500); }
const save = () => S.set('d', D);
const esc = X.esc;
const wan = n => n >= 1e8 ? (n / 1e8).toFixed(1) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + '万' : String(Math.round(n));
const norm = t => String(t || '').replace(/^#|#$/g, '');
function board(quiet) {
    const posts = (typeof globalPosts !== 'undefined' ? globalPosts : []).filter(p => p && Date.now() - p.timestamp < 3 * 864e5);
    const tags = new Set((typeof trendingTags !== 'undefined' ? trendingTags : []).map(norm));
    posts.forEach(p => (String(p.text || '').match(/#([^#\s]{2,20})#?/g) || []).forEach(t => tags.add(norm(t))));
    const rows = [...tags].filter(Boolean).map((t, i) => {
        let heat = 20000 + Math.max(0, 30 - i) * 3000, scoop = 0, n = 0;
        posts.forEach(p => { if (!String(p.text || '').includes(t)) return; n++; const st = p.stats || {}, age = (Date.now() - p.timestamp) / 36e5, decay = 1 / (1 + age / 12); heat += ((+st.likes || 0) * 2 + (+st.comments || 0) * 300 + (+st.retweets || 0) * 20 + ((p.replies || []).length) * 800 + 30000) * decay; if (p.gyScoop) { heat *= 1.6; if (age < 6) scoop = 1; } });
        if (!D.first[t]) D.first[t] = Date.now();
        return { t, heat: Math.round(heat), n, scoop, fresh: Date.now() - D.first[t] < 864e5 };
    }).sort((a, b) => b.heat - a.heat).slice(0, 20);
    rows.forEach((r, i) => { r.badge = (i === 0 && r.scoop) || r.heat > 2e6 ? '爆' : r.heat > 6e5 ? '沸' : r.heat > 2e5 ? '热' : r.fresh ? '新' : ''; });
    if (rows[0] && (!D.tops[0] || D.tops[0].tag !== rows[0].t)) { D.tops.unshift({ tag: rows[0].t, at: Date.now(), heat: rows[0].heat }); D.tops = D.tops.slice(0, 100); }
    save(); if (!quiet && D.wb && X.on('gyxHotList') && rows.some(r => !D.titles[r.t])) setTimeout(() => nameThem(), 50); return rows;
}
// 用微博的口吻起标题：缺标题的话题攒一批，一次问一回（副 API）；起过的就记住，不重复花钱
let busy = false, lastAsk = 0;
async function nameThem(force) {
    if (busy || X.bailu() || !X.on('gyxHotList') || !D.wb) return 0;
    if (!force && Date.now() - lastAsk < 3 * 60000) return 0;
    const posts = typeof globalPosts !== 'undefined' ? globalPosts : [];
    const need = board(true).filter(r => force || !D.titles[r.t]).slice(0, 12); if (!need.length) return 0;
    busy = true; lastAsk = Date.now();
    try {
        const list = need.map(r => `· ${r.t}：` + posts.filter(p => String(p.text || '').includes(r.t)).slice(0, 3).map(p => X.plain(p.text).slice(0, 60)).join(' / ')).join('\n');
        const o = X.json(await X.ask(P('hot.title', DEF_TITLE, { 话题: list })));
        let n = 0; if (o && typeof o === 'object') need.forEach(r => { const t = X.plain(o[r.t] || o['#' + r.t] || o['#' + r.t + '#'] || '').replace(/[#。]/g, '').slice(0, 24); if (t) { D.titles[r.t] = t; n++; } });
        const keep = new Set(board(true).map(r => r.t).concat(D.tops.map(x => x.tag))); Object.keys(D.titles).forEach(k => { if (!keep.has(k)) delete D.titles[k]; });
        save(); if (n) repaint(); return n;
    } catch (e) { return 0; } finally { busy = false; }
}
const ttl = t => (D.wb && D.titles[t]) || t;
const BADGE = { 爆: '#e2231a', 沸: '#f86400', 热: '#ff9406', 新: '#ff3852' };
const rowHtml = (r, i) => `<div class="hl-r" onclick="switchMainView('tag','#${esc(r.t).replace(/'/g, '&#39;')}')"><span class="hl-n${i < 3 ? ' top' : ''}">${i + 1}</span><span class="hl-t" title="#${esc(r.t)}#">${esc(ttl(r.t))}</span><em>${wan(r.heat)}</em>${r.badge ? `<b style="background:${BADGE[r.badge]}">${r.badge}</b>` : ''}</div>`;
function paintDesk() { const c = document.getElementById('trendListContainer'); if (!c) return false; const R = board(); c.innerHTML = `<div class="hl-hd">🔥 微博热搜<span>${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 更新</span></div>` + (R.map(rowHtml).join('') || '<div class="hl-empty">还没有话题</div>'); return true; }
function paintMobile() { const c = document.getElementById('mobileTrendsListContainer'); if (!c) return false; if (typeof mobileTrendManageMode !== 'undefined' && mobileTrendManageMode) return false; const R = board(); c.innerHTML = `<div class="hl-hd">🔥 微博热搜<span>点话题看相关帖子</span></div>` + (R.map(rowHtml).join('') || '<div class="hl-empty">还没有话题</div>'); return true; }
function hook() {
    ['renderTrends', 'renderMobileTrends'].forEach(name => {
        const f = window[name]; if (typeof f !== 'function' || f.__gyxHL) return;
        const w = function () { if (X.on('gyxHotList') && (name === 'renderTrends' ? paintDesk() : paintMobile())) return; return f.apply(this, arguments); };
        w.__gyxHL = true; window[name] = w; try { (0, eval)(name + ' = window.' + name); } catch (e) {}
    });
}
hook(); setInterval(hook, 3000);
const repaint = () => { try { (window.renderTrends || function () {})(); } catch (e) {} try { (window.renderMobileTrends || function () {})(); } catch (e) {} };
addEventListener('gyx:feat', e => { if (e.detail && e.detail.id === 'gyxHotList') repaint(); });
setInterval(() => { if (X.on('gyxHotList')) repaint(); }, 5 * 60000);
window.gyxHotListBoard = board; window.gyxHotListData = () => D;
window.gyxHotListWb = v => { D.wb = !!v; save(); repaint(); if (v) nameThem(true).then(() => window.gyxHotListOpen()); window.gyxHotListOpen(); };
window.gyxHotListRename = async btn => { if (btn) { btn.disabled = true; btn.textContent = '正在起标题… ⏳'; } const n = await nameThem(true); if (!n) X.toast('没起成', '接口没接上，或者还没有话题'); window.gyxHotListOpen(); };
window.gyxHotListName = nameThem; window.gyxHotListTitle = ttl;
window.gyxHotListOpen = function () {
    const on = X.on('gyxHotList'), R = board();
    X.panel('gyxHotListOv', '🔥 微博热搜榜', `<div class="gyx-row"><label class="gyx-tip" style="font-size:14px"><input type="checkbox" ${on ? 'checked' : ''} onchange="GYX.set('gyxHotList',this.checked);gyxHotListOpen()"> 把「趋势 / 标签排行」换成微博热搜风格</label></div>
      <div class="gyx-row"><label class="gyx-tip" style="font-size:13.5px"><input type="checkbox" ${D.wb ? 'checked' : ''} onchange="gyxHotListWb(this.checked)"> 用微博的口吻起标题（比如「Leon深夜现身江边」，不再只是 #话题#）</label>${D.wb ? `<button class="gyx-btn lite" onclick="gyxHotListRename(this)">重新起标题</button>` : ''}</div>
      <div class="gyx-tip">起标题每来一批新话题调一次副 API，起过的会记住；不想花这个钱就把上面这个勾掉。标题的写法可以在「设置 → 内置提示词 → 🔥 微博热搜榜」里改。</div>
      <div class="gyx-tip">热度按主页上最近三天的真实帖子算：谁在聊、赞和评论多少、营销号的爆料加权。关掉就回到原来的标签排行（双击编辑、手机上长按管理都还在）。外面真实世界的热搜在「🌐 外面的世界 → 🔥 真实热搜」。</div>
      <div class="hl-box">${R.map(rowHtml).join('') || '<div class="hl-empty">还没有话题</div>'}</div>
      ${D.tops.length ? `<h4 style="font-size:14px;margin:14px 0 6px">上过第一的</h4>` + D.tops.slice(0, 15).map(x => `<div class="gyx-tip">${new Date(x.at).toLocaleString()} · ${esc(ttl(x.tag))}${ttl(x.tag) !== x.tag ? '（#' + esc(x.tag) + '#）' : ''} · ${wan(x.heat)}</div>`).join('') : ''}`);
};
X.ctx(() => { if (!X.on('gyxHotList')) return ''; const R = board().slice(0, 3); return R.length ? `【站内热搜前三】${R.map((r, i) => `${i + 1}. ${ttl(r.t)}${ttl(r.t) !== r.t ? '（#' + r.t + '#）' : ''}`).join('  ')}（你刷手机会看到，可以自然聊到）` : ''; }, 'gyxHotList');
X.inj('gyxHotList', [['站内热搜前三', '站内热搜前三', '热搜榜开着时，TA 知道主页上什么最火，会自然聊到。']]);
X.action({ key: 'gyx_hotlist', label: '刷到站内热搜，跟她聊聊热搜上的瓜', hint: '微博热搜榜', need: () => X.on('gyxHotList') && board().length > 0, run: async c => { const r = board()[0]; return (await X.reach(c, `你刚刷到站内热搜第一是「${ttl(r.t)}」（#${r.t}#），想跟她聊两句（吐槽、八卦、或者跟你有关就解释）`)) ? '聊了热搜上的瓜' : null; } }, 'gyxHotList');
X.today(() => ({ title: '🔥 热搜', rows: board().slice(0, 3).map((r, i) => ({ t: (i + 1) + (r.badge ? ' ' + r.badge : ''), x: esc(ttl(r.t)) + ' · ' + wan(r.heat), go: `switchMainView('tag','#${esc(r.t)}')` })) }), 'gyxHotList');
X.widget('gyxHotListW', { n: '微博热搜', sizes: ['s', 'm'], tap: () => window.gyxHotListOpen(), r: w => { const R = board().slice(0, 3); return X.gw(w, '🔥', '热搜', R.length ? R.map((r, i) => (i + 1) + ' ' + esc(ttl(r.t)).slice(0, 10)) : ['还没有话题']); } }, 'gyxHotList');
X.mem({ k: 'gyxHotList', ico: '🔥', n: '上过热搜第一的话题', d: '站内热搜榜上冲到第一的话题（删了只是不记，主页的帖子不动）', items: () => D.tops, text: x => ttl(x.tag) + (ttl(x.tag) !== x.tag ? '（#' + x.tag + '#）' : ''), meta: x => new Date(x.at).toLocaleString() + ' · ' + wan(x.heat), edit: (x, v) => { v = String(v || '').replace(/（#[^）]*#）$/, '').trim(); if (/^#.*#$/.test(v)) x.tag = norm(v); else if (v) D.titles[x.tag] = v; }, del: (c, i) => { D.tops.splice(i, 1); }, save }, 'gyxHotList');
X.css('gyxHotListCss', `.hl-hd{display:flex;align-items:baseline;gap:8px;font-weight:800;font-size:18px;padding:10px 14px 6px;color:#ff8200}.hl-hd span{font-size:11.5px;color:#999;font-weight:400}.hl-r{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;font-size:14.5px}.hl-r:hover{background:rgba(255,130,0,.06)}.hl-n{width:20px;text-align:center;font-weight:700;color:#ff8200;font-style:italic}.hl-n.top{color:#ff3852;font-size:16px}.hl-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hl-r em{font-style:normal;font-size:12px;color:#999}.hl-r b{font-size:11px;color:#fff;border-radius:4px;padding:0 4px;font-weight:600;line-height:17px}.hl-empty{padding:14px;color:#999;font-size:13px}.hl-box{border:1px solid #f2f2f4;border-radius:14px;overflow:hidden}`);
X.mini({ id: 'gyxHotList', icon: '🔥', title: '微博热搜榜', desc: '标签排行换成微博热搜风格', cat: '生活', onOpen: () => window.gyxHotListOpen() }, 'gyxHotListEntry');   // 开关默认关，但入口一直在，不然找不到地方打开
(async () => { D = Object.assign(D, await S.get('d', {})); D.first = D.first || {}; D.tops = D.tops || []; D.titles = D.titles || {}; if (D.wb == null) D.wb = true; setTimeout(repaint, 2000); })();
