/* 📕 小红书：主页是短帖，这里是图文笔记——攻略、种草、日常、"求问"贴，双列瀑布流，能点赞、收藏、评论。角色会自己发笔记，TA 手机里刷到的小红书也在这儿；你发的求问贴，角色们会来回答（说不定认出是你）；还能偷看「TA 偷偷收藏了什么」。现实里的小红书：一键跳过去搜，或者把看到的笔记贴进来让 TA 一起看 */
if (window.__gyxRed) return; window.__gyxRed = 1;
X.feat('gyxRed', { n: '📕 小红书', desc: '图文笔记频道：角色发笔记、你发求问贴、TA 偷偷收藏了什么' });
const S = X.store('red');
let D = { notes: [] };   // {id, by:'me'|cid|'npc', npc:{name,emo}, title, body, tags:[], cover:{emo,bg}, likes, favs, cmts:[{who,t,at}], at, liked, faved, favBy:{cid:想法}, from}
let TAB = 'find', CUR = null, WHO = '', busy = false;
const P = (id, def, vars) => { let t = def; try { if (typeof gyPL === 'function') return gyPL(id, def, vars); } catch (e) {} Object.keys(vars || {}).forEach(k => { t = t.split('{{' + k + '}}').join(vars[k] == null ? '' : String(vars[k])); }); return t; };
const DEF_FEED = `你在模拟一个「小红书」App 的首页推荐。这个世界的背景：{{世界}}
刷出 {{条数}} 篇不同的笔记，类型混着来：攻略 / 种草 / 日常分享 / 情感求问 / 吐槽 / 探店。作者是这个世界里的普通人（起一个像小红书用户的昵称）。标题要有小红书味（emoji、"姐妹们""救命"这种口吻），正文 60~120 字，带 2~3 个标签。
只输出 JSON 数组：[{"name":"作者昵称","emo":"一个代表这篇的 emoji","title":"标题，20字内","body":"正文","tags":["标签1","标签2"]}]`;
const DEF_CHAR = `你要在小红书上发一篇笔记。按你的身份、性格和最近的生活来写（可以是日常、攻略、种草、碎碎念，也可以偷偷写一点跟她有关的但不点名）。标题要有小红书味，正文 60~150 字，带 2~3 个标签。
只输出 JSON：{"emo":"一个 emoji","title":"标题，20字内","body":"正文","tags":["标签1","标签2"]}`;
const DEF_CMT = `小红书上有一篇笔记：
标题：{{标题}}
正文：{{正文}}
作者：{{作者}}
下面这些人要在评论区留言：
{{评论的人}}
每人一条，像真的小红书评论（短、口语、可以玩梗）。认识作者的人可以认出来、调侃一句；路人就按路人的口气。
只输出 JSON 数组：[{"name":"名字","t":"评论，40字内"}]`;
const DEF_FAV = `你在刷小红书，下面是首页的几篇笔记：
{{笔记}}
挑一篇你会偷偷收藏的（多半是因为想到了她：约会攻略、她可能喜欢的东西、想学来哄她的……），也可以都不收。
只输出 JSON：{"i":序号（从 0 开始，不收就写 -1）,"why":"你收藏时心里想的，20字内，她看不到"}`;
['red.feed', 'red.char', 'red.cmt', 'red.fav'].forEach((k, i) => P(k, [DEF_FEED, DEF_CHAR, DEF_CMT, DEF_FAV][i]));
const regPL = () => { if (typeof window.gyPLGroupAdd !== 'function') return false; window.gyPLGroupAdd({ g: '📕 小红书', plug: 'gyxRed', items: [['red.feed', '首页刷出来的笔记', '点「刷新」时', '{{世界}}：这个世界的背景；{{条数}}：一次刷几篇'], ['red.char', '角色自己发笔记', '自主模式里 / 点「让 TA 发一篇」'], ['red.cmt', '评论区', '你发笔记 / 让 TA 来评论时', '{{标题}} {{正文}} {{作者}}：那篇笔记；{{评论的人}}：要留言的人'], ['red.fav', 'TA 偷偷收藏', '自主模式里 TA 刷小红书', '{{笔记}}：首页的几篇']] }); return true; };
if (!regPL()) { let n = 0; const iv = setInterval(() => { if (regPL() || ++n > 40) clearInterval(iv); }, 500); }
const save = () => S.set('d', D);
const BGS = ['#ffe3e3', '#fff1d6', '#e3f6e8', '#e2efff', '#f1e6ff', '#ffe6f2', '#e8f7f7', '#fdf2e9'];
const meName = () => { try { return typeof userDisplayName === 'function' ? userDisplayName() : ((typeof currentUser !== 'undefined' && currentUser.name) || '我'); } catch (e) { return '我'; } };
const authorName = n => n.by === 'me' ? meName() : n.by === 'npc' ? (n.npc && n.npc.name) || '小红薯' : n.by === 'real' ? '来自现实的小红书' : X.name(X.char(n.by));
const whoName = w => w === 'me' ? meName() : String(w).startsWith('npc:') ? String(w).slice(4) : X.name(X.char(w));
const world = () => { try { const c = X.chars()[0]; const wb = (typeof worldbooks !== 'undefined' ? worldbooks : []).slice(0, 2).map(w => (w.name || w.title || '')).join('、'); return (wb ? '世界书：' + wb + '；' : '') + '主要人物：' + X.chars().slice(0, 4).map(c => X.name(c) + '（' + X.persona(c).slice(0, 30) + '）').join('、'); } catch (e) { return '现代都市'; } };
const mk = (o, by, extra) => Object.assign({ id: 'rn' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), by, title: X.plain(o.title || '无题').slice(0, 40), body: String(o.body || '').trim().slice(0, 600), tags: (o.tags || []).map(t => X.plain(t).replace(/^#/, '')).filter(Boolean).slice(0, 4), cover: { emo: X.plain(o.emo || '📕').slice(0, 4), bg: X.pick(BGS) }, likes: Math.floor(Math.random() * 3000), favs: Math.floor(Math.random() * 800), cmts: [], at: Date.now(), favBy: {} }, extra || {});
async function refresh(n) {
    const o = X.bailu() ? null : X.json(await X.ask(P('red.feed', DEF_FEED, { 世界: world(), 条数: n || 4 })));
    const arr = Array.isArray(o) ? o : [{ name: '爱吃甜的猫', emo: '🍰', title: '救命！这家小蛋糕店我要锁死🔒', body: '巷子里的小店，开心果巴斯克绝了，老板娘还送了小饼干。', tags: ['探店', '甜品'] }, { name: '今天不加班', emo: '🌙', title: '男朋友总说忙，我该怎么办😭', body: '在一起两年，最近他回消息越来越慢……姐妹们帮我看看。', tags: ['情感', '求问'] }];
    const add = arr.filter(x => x && x.title).map(x => mk(x, 'npc', { npc: { name: X.plain(x.name || '小红薯').slice(0, 12), emo: X.plain(x.emo || '🙂') } }));
    D.notes = add.concat(D.notes).slice(0, 400); await save(); return add;
}
async function charPost(c) {
    if (!c) return null; const o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n最近的聊天：\n${X.recent(c, 10)}\n\n${P('red.char', DEF_CHAR)}`));
    const n = mk(o && o.title ? o : { emo: '☕', title: X.v('今天的小确幸', '随手记'), body: X.v('今天的天很好，想记下来。', '路过一家店，想起一个人。'), tags: ['日常'] }, String(c.id)); n.likes = Math.floor(Math.random() * 500);
    D.notes.unshift(n); await save(); return n;
}
async function comments(n, people) {
    // 👥 NPC 列表（248）：按「小红书」那一档的比例，把几个「路人」换成绑给作者的熟人
    try { if (window.gyNpcPick) { const pk = window.gyNpcPick('xhs', n.by === 'npc' ? null : n.by, people.filter(p => p === 'npc').length); let k = 0; people = people.map(p => p === 'npc' && k < pk.n ? { npc: pk.npcs[k++] } : p); } } catch (e) {}
    const list = people.map(p => p && p.npc ? `${p.npc.name}（认识作者的人：${[p.npc.who, p.npc.tie].filter(Boolean).join('，')}${p.npc.tone ? '；说话' + p.npc.tone : ''}；名字一字不差）` : p === 'npc' ? '路人（起一个小红书昵称）' : p === 'me' ? meName() : `${X.name(X.char(p))}（${X.persona(X.char(p)).slice(0, 60)}）`);
    const o = X.bailu() ? null : X.json(await X.ask(P('red.cmt', DEF_CMT, { 标题: n.title, 正文: n.body, 作者: authorName(n) + (n.by === 'me' ? '（就是她本人）' : ''), 评论的人: list.map(x => '· ' + x).join('\n') })));
    const arr = Array.isArray(o) ? o : people.map(p => ({ name: p && p.npc ? p.npc.name : p === 'npc' ? '路过的小红薯' : X.name(X.char(p)), t: X.v('马住！', '姐妹说得好', '蹲一个后续') }));
    arr.forEach(x => { if (!x || !x.t) return; const c = X.chars().find(c => X.name(c) === x.name || c.name === x.name); n.cmts.push({ who: c ? String(c.id) : 'npc:' + X.plain(x.name || '小红薯').slice(0, 12), t: X.plain(x.t).slice(0, 120), at: Date.now() }); });
    await save();
}
async function favBy(c) {
    const pool = D.notes.filter(n => n.by !== String(c.id) && !(n.favBy || {})[c.id]).slice(0, 8); if (!pool.length) return null;
    const o = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n${P('red.fav', DEF_FAV, { 笔记: pool.map((n, i) => `${i}. 《${n.title}》${n.body.slice(0, 40)}`).join('\n') })}`));
    const i = o ? +o.i : Math.floor(Math.random() * pool.length); if (!(i >= 0 && pool[i])) return null;
    const n = pool[i]; n.favBy = n.favBy || {}; n.favBy[c.id] = X.plain((o && o.why) || '想带她去'); n.favs++; await save(); return n;
}
// ---------- 现实里的小红书：跳过去搜 / 贴进来 ----------
window.gyxRedReal = q => { q = String(q || '').trim(); const web = 'https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(q || '约会'); const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent); if (mobile) { const t = Date.now(); location.href = 'xhsdiscover://search/result?keyword=' + encodeURIComponent(q || '约会'); setTimeout(() => { if (Date.now() - t < 2500 && !document.hidden) window.open(web, '_blank'); }, 1500); } else window.open(web, '_blank'); };
window.gyxRedPaste = async () => {
    const t = document.getElementById('gyxRnPaste'), v = t && t.value.trim(); if (!v) return X.toast('先把笔记内容粘贴进来', '在小红书里点「分享 → 复制链接」或者直接复制正文');
    const lines = v.split('\n').map(s => s.trim()).filter(Boolean), url = (v.match(/https?:\/\/\S+/) || [''])[0];
    const n = mk({ emo: '📎', title: lines[0].replace(/https?:\/\/\S+/, '').slice(0, 40) || '从小红书贴过来的', body: lines.slice(1).join('\n').replace(/https?:\/\/\S+/g, '').trim() || v.replace(/https?:\/\/\S+/g, '').trim(), tags: (v.match(/#([^#\s]+)/g) || []).map(x => x.slice(1)) }, 'real', { url, likes: 0, favs: 0 });
    D.notes.unshift(n); await save(); t.value = ''; CUR = n.id; window.gyxRedOpen();
};
// ---------- 页面 ----------
const card = n => `<div class="rn-c" onclick="gyxRedView('${n.id}')"><div class="rn-cv" style="background:${n.cover.bg}"><b>${X.esc(n.cover.emo)}</b><span>${X.esc(n.title)}</span>${n.from === 'phone' ? '<em>📱 TA 手机里的</em>' : n.by === 'real' ? '<em>📎 现实小红书</em>' : ''}</div><div class="rn-ct">${X.esc(n.title)}</div><div class="rn-cb"><span>${X.esc(authorName(n))}</span><i>${n.liked ? '♥' : '♡'} ${n.likes}</i></div></div>`;
const phoneNotes = () => { const out = []; try { X.chars().forEach(c => (window.gyPhoneNotes ? window.gyPhoneNotes(c.id) : []).forEach((x, i) => out.push({ id: 'ph_' + c.id + '_' + i, by: String(c.id), from: 'phone', title: x.title || '无题', body: String(x.body || '').replace(/\[img-([^\]]+)\]/gi, '🖼️$1'), tags: [], cover: { emo: '📱', bg: BGS[i % BGS.length] }, likes: +x.likes || 0, favs: +x.favs || 0, cmts: (x.comments || []).map(cm => ({ who: 'npc:' + (cm.by || '路人'), t: cm.t })), at: 0, favBy: {} }))); } catch (e) {} return out; };
const allNotes = () => D.notes.concat(phoneNotes());
window.gyxRedTab = t => { TAB = t; CUR = null; window.gyxRedOpen(); };
window.gyxRedWho = v => { WHO = String(v); window.gyxRedOpen(); };
window.gyxRedView = id => { CUR = id; window.gyxRedOpen(); };
window.gyxRedBack = () => { CUR = null; window.gyxRedOpen(); };
window.gyxRedLike = async id => { const n = D.notes.find(x => x.id === id); if (!n) return; n.liked = !n.liked; n.likes += n.liked ? 1 : -1; await save(); window.gyxRedOpen(); };
window.gyxRedFav = async id => { const n = D.notes.find(x => x.id === id); if (!n) return; n.faved = !n.faved; n.favs += n.faved ? 1 : -1; await save(); window.gyxRedOpen(); };
window.gyxRedCmt = async id => { const n = D.notes.find(x => x.id === id), el = document.getElementById('gyxRnCm'); if (!n || !el || !el.value.trim()) return; n.cmts.push({ who: 'me', t: el.value.trim().slice(0, 200), at: Date.now() }); el.value = ''; await save(); if (n.by !== 'me' && n.by !== 'npc' && n.by !== 'real' && X.char(n.by)) { await comments(n, [n.by]); } window.gyxRedOpen(); };
window.gyxRedAskTa = async (id, btn) => { const n = D.notes.find(x => x.id === id); if (!n || busy) return; busy = true; if (btn) { btn.disabled = true; btn.textContent = 'TA 在看……'; } const c = X.char(WHO) || X.cur(); try { await comments(n, [String(c.id)]); } finally { busy = false; } window.gyxRedOpen(); };
window.gyxRedRefresh = async btn => { if (busy) return; busy = true; if (btn) { btn.disabled = true; btn.textContent = '刷新中……'; } try { await refresh(4); } finally { busy = false; } window.gyxRedOpen(); };
window.gyxRedTaPost = async btn => { if (busy) return; const c = X.char(WHO) || X.cur(); if (!c) return; busy = true; if (btn) { btn.disabled = true; btn.textContent = 'TA 在写……'; } try { await charPost(c); } finally { busy = false; } TAB = 'follow'; window.gyxRedOpen(); };
window.gyxRedPost = async btn => {
    const t = document.getElementById('gyxRnT'), b = document.getElementById('gyxRnB'), g = document.getElementById('gyxRnG'); if (!t || !t.value.trim() || !b.value.trim()) return X.toast('标题和正文都要写');
    const n = mk({ emo: X.pick(['🌷', '📝', '🫧', '🍓', '🌙', '☁️']), title: t.value.trim(), body: b.value.trim(), tags: g.value.split(/[\s,，#]+/).filter(Boolean) }, 'me', { likes: 0, favs: 0 });
    D.notes.unshift(n); await save(); if (btn) { btn.disabled = true; btn.textContent = '发出去了，等评论……'; }
    const ppl = X.chars().sort(() => Math.random() - .5).slice(0, 1 + Math.floor(Math.random() * Math.min(3, X.chars().length))).map(c => String(c.id)).concat(['npc', 'npc']);
    await comments(n, ppl); n.likes = 5 + Math.floor(Math.random() * 300); await save(); TAB = 'mine'; CUR = n.id; window.gyxRedOpen();
};
window.gyxRedDel = async id => { D.notes = D.notes.filter(x => x.id !== id); CUR = null; await save(); window.gyxRedOpen(); };
window.gyxRedData = () => D;
window.gyxRedOpen = function () {
    const cs = X.chars(); if (!WHO && cs[0]) WHO = String((X.cur() || cs[0]).id);
    const tabs = [['find', '发现'], ['follow', '关注'], ['favs', '收藏'], ['tafav', 'TA 的收藏'], ['mine', '我'], ['real', '现实小红书']].map(([k, n]) => `<span class="${TAB === k ? 'on' : ''}" onclick="gyxRedTab('${k}')">${n}</span>`).join('');
    let h = `<div class="rn-tabs">${tabs}</div>`;
    const n = CUR && allNotes().find(x => x.id === CUR);
    if (n) {
        const mine = D.notes.includes(n);
        h += `<div class="rn-d"><span class="rn-back" onclick="gyxRedBack()">‹ 返回</span><div class="rn-dcv" style="background:${n.cover.bg}"><b>${X.esc(n.cover.emo)}</b><span>${X.esc(n.title)}</span></div>
          <div class="rn-au">${X.esc(authorName(n))}${n.from === 'phone' ? ' · 📱 来自 TA 的手机' : ''}${n.url ? ` · <a href="${X.esc(n.url)}" target="_blank" rel="noopener">原帖链接</a>` : ''}</div>
          <h3>${X.esc(n.title)}</h3><div class="rn-body">${X.esc(n.body).replace(/\n/g, '<br>')}</div>${n.tags.length ? `<div class="rn-tags">${n.tags.map(t => '#' + X.esc(t)).join(' ')}</div>` : ''}
          ${Object.keys(n.favBy || {}).filter(id => X.char(id)).map(id => `<div class="rn-fav">⭐ ${X.esc(X.name(X.char(id)))} 偷偷收藏了这篇<em>（TA 心里想：${X.esc(n.favBy[id])}）</em></div>`).join('')}
          ${mine ? `<div class="gyx-row"><button class="gyx-btn lite" onclick="gyxRedLike('${n.id}')">${n.liked ? '♥' : '♡'} ${n.likes}</button><button class="gyx-btn lite" onclick="gyxRedFav('${n.id}')">${n.faved ? '★' : '☆'} ${n.favs}</button><button class="gyx-btn lite" onclick="gyxRedAskTa('${n.id}',this)">让 ${X.esc(X.name(X.char(WHO) || X.cur()))} 来看看</button>${n.by === 'me' || n.by === 'real' ? `<span class="gyx-tip" style="cursor:pointer;margin-left:auto" onclick="gyxRedDel('${n.id}')">删</span>` : ''}</div>` : ''}
          <div class="rn-cms">${n.cmts.map(c => `<div><b>${X.esc(whoName(c.who))}</b>${X.esc(c.t)}</div>`).join('') || '<div class="gyx-tip">还没有评论</div>'}</div>
          ${mine ? `<div class="gyx-row"><input id="gyxRnCm" class="gyx-in" style="flex:1" placeholder="说点什么……"><button class="gyx-btn" onclick="gyxRedCmt('${n.id}')">评论</button></div>` : ''}</div>`;
    } else if (TAB === 'find') {
        h += `<div class="gyx-row"><button class="gyx-btn lite" onclick="gyxRedRefresh(this)">↻ 刷新（刷出 4 篇新的）</button></div><div class="rn-grid">${D.notes.filter(x => x.by === 'npc' || x.by === 'real' || X.char(x.by)).map(card).join('') || '<div class="gyx-tip">还是空的，点「刷新」刷一刷。</div>'}</div>`;
    } else if (TAB === 'follow') {
        const L = allNotes().filter(x => X.char(x.by));
        h += `<div class="gyx-row">${X.whoSel(WHO, 'gyxRedWho')}<button class="gyx-btn lite" onclick="gyxRedTaPost(this)">让 TA 发一篇</button></div><div class="gyx-tip">角色发的笔记，还有 TA 手机里刷到 / 发过的（📱）都在这儿。</div><div class="rn-grid">${L.map(card).join('') || '<div class="gyx-tip">还没有角色发过笔记。</div>'}</div>`;
    } else if (TAB === 'favs') {
        h += `<div class="rn-grid">${D.notes.filter(x => x.faved).map(card).join('') || '<div class="gyx-tip">你还没收藏过。</div>'}</div>`;
    } else if (TAB === 'tafav') {
        const L = D.notes.filter(x => (x.favBy || {})[WHO]);
        h += `<div class="gyx-row">${X.whoSel(WHO, 'gyxRedWho')}</div><div class="gyx-tip">${X.v('偷看一下 TA 收藏了什么……', 'TA 收藏的东西，往往跟你有关。')}TA 刷小红书时会自己收藏（自主模式里）。</div><div class="rn-grid">${L.map(card).join('') || '<div class="gyx-tip">TA 还没收藏过。</div>'}</div>`;
    } else if (TAB === 'mine') {
        h += `<div class="gyx-card"><input id="gyxRnT" class="gyx-in" placeholder="标题（可以是求问：男朋友总说忙怎么办😭）"><textarea id="gyxRnB" class="gyx-in" rows="3" placeholder="正文" style="margin-top:6px"></textarea><input id="gyxRnG" class="gyx-in" placeholder="标签，用空格分开" style="margin-top:6px"><div class="gyx-row"><button class="gyx-btn" onclick="gyxRedPost(this)">发布笔记</button><span class="gyx-tip">角色们会来评论，说不定认出是你</span></div></div><div class="rn-grid">${D.notes.filter(x => x.by === 'me').map(card).join('')}</div>`;
    } else if (TAB === 'real') {
        h += `<div class="gyx-card"><b>🔍 去真的小红书搜</b><div class="gyx-tip">现实里的小红书要登录、也不让别的网页直接读取，所以没法在谷雨里直接刷。点下面会打开真的小红书（手机上会跳 App），搜你想看的。</div><div class="gyx-row"><input id="gyxRnQ" class="gyx-in" style="flex:1" placeholder="想搜什么？比如：约会 餐厅"><button class="gyx-btn" onclick="gyxRedReal(document.getElementById('gyxRnQ').value)">去搜</button></div></div>
          <div class="gyx-card"><b>📎 把看到的笔记贴进来</b><div class="gyx-tip">在小红书里点「分享 → 复制链接」，或者直接长按复制正文，粘贴到这里。贴进来以后能让 TA 一起看、来评论。</div><textarea id="gyxRnPaste" class="gyx-in" rows="4" placeholder="第一行当标题，后面当正文；带链接也行"></textarea><div class="gyx-row"><button class="gyx-btn" onclick="gyxRedPaste()">贴进来</button></div></div>
          <div class="rn-grid">${D.notes.filter(x => x.by === 'real').map(card).join('')}</div>`;
    }
    X.panel('gyxRedOv', '📕 小红书', h);
};
X.inj('gyxRed', [['小红书', 'TA 在小红书发的 / 偷偷收藏的 / 你最近发的', 'TA 偷偷收藏的那条会叮嘱 TA 别主动说出来。']]);
X.ctx(id => { const mine = D.notes.filter(n => n.by === String(id)).slice(0, 2), fav = D.notes.filter(n => (n.favBy || {})[id]).slice(0, 2), hers = D.notes.filter(n => n.by === 'me').slice(0, 1); const out = []; if (mine.length) out.push('你最近在小红书发了：' + mine.map(n => '《' + n.title + '》').join('、')); if (fav.length) out.push('你偷偷收藏了：' + fav.map(n => '《' + n.title + '》（' + n.favBy[id] + '）').join('、') + '——别主动说出来'); if (hers.length && Date.now() - hers[0].at < 3 * 864e5) out.push('她最近在小红书发了《' + hers[0].title + '》：' + hers[0].body.slice(0, 60)); return out.length ? '【小红书】' + out.join('；') : ''; }, 'gyxRed');
X.action({ key: 'gyx_red_post', label: '在小红书发一篇笔记', hint: '小红书', need: c => !D.notes.some(n => n.by === String(c.id) && Date.now() - n.at < 2 * 864e5), run: async c => (await charPost(c)) ? '在小红书发了笔记' : null }, 'gyxRed');
X.action({ key: 'gyx_red_fav', label: '刷小红书，偷偷收藏一篇（多半跟她有关）', hint: '小红书', need: c => D.notes.length >= 3 && !D.notes.some(n => n.favBy && n.favBy[c.id] && Date.now() - n.at < 864e5), run: async c => (await favBy(c)) ? null : null }, 'gyxRed');
X.today(() => ({ title: '📕 小红书', rows: D.notes.filter(n => X.day(new Date(n.at)) === X.day() && (n.by === 'me' || X.char(n.by))).slice(0, 3).map(n => ({ t: X.esc(authorName(n)), x: '《' + X.esc(n.title) + '》' + (n.cmts.length ? ' · ' + n.cmts.length + ' 条评论' : ''), go: `gyxRedView('${n.id}');gyxRedOpen()` })) }), 'gyxRed');
X.widget('gyxRedW', { n: '小红书', sizes: ['s', 'm'], tap: () => window.gyxRedOpen(), r: w => { const n = D.notes.find(x => x.by !== 'npc') || D.notes[0]; return X.gw(w, '📕', '小红书', n ? [X.esc(n.title).slice(0, 14), X.esc(authorName(n))] : ['刷一刷？']); } }, 'gyxRed');
X.memArr({ k: 'gyxRed', ico: '📕', n: '小红书', d: 'TA 发过的笔记（删了 TA 就不记得发过）', arr: () => D.notes, cid: n => n.by, field: 'title', text: n => '《' + n.title + '》' + n.body.slice(0, 80), edit: (n, v) => { const m = String(v).match(/^《([^》]*)》/); if (m) n.title = m[1]; }, meta: n => new Date(n.at).toLocaleString() + ' · ♡' + n.likes, save }, 'gyxRed');
X.css('gyxRedCss', `.rn-tabs{display:flex;gap:16px;overflow-x:auto;padding:2px 0 10px;font-size:15px;color:#999;white-space:nowrap}.rn-tabs span{cursor:pointer;padding-bottom:4px}.rn-tabs span.on{color:#1d1d1f;font-weight:700;border-bottom:2px solid #ff2442}
.rn-grid{columns:2;column-gap:8px;margin-top:6px}.rn-c{break-inside:avoid;background:#fff;border-radius:12px;overflow:hidden;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,.06);cursor:pointer}.rn-cv{position:relative;aspect-ratio:3/4;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px;text-align:center;gap:8px}.rn-c:nth-child(3n) .rn-cv{aspect-ratio:1}.rn-cv b{font-size:34px;font-weight:normal}.rn-cv span{font-size:15px;font-weight:700;line-height:1.4;color:#333}.rn-cv em{position:absolute;left:6px;top:6px;font-style:normal;font-size:10px;background:rgba(255,255,255,.8);border-radius:6px;padding:1px 5px}
.rn-ct{font-size:13px;padding:7px 8px 2px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.rn-cb{display:flex;justify-content:space-between;padding:4px 8px 8px;font-size:11.5px;color:#888}.rn-cb i{font-style:normal}
.rn-back{cursor:pointer;color:#888;font-size:13px}.rn-dcv{margin:8px 0;border-radius:14px;aspect-ratio:4/3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px;text-align:center}.rn-dcv b{font-size:48px;font-weight:normal}.rn-dcv span{font-size:20px;font-weight:800;color:#333}.rn-au{font-size:13px;color:#888}.rn-d h3{margin:8px 0 6px;font-size:18px}.rn-body{font-size:15px;line-height:1.85}.rn-tags{color:#13386c;font-size:14px;margin:8px 0}.rn-fav{font-size:13px;margin:6px 0;color:#c77d00}.rn-fav em{font-style:normal;color:#aaa}.rn-cms{margin:12px 0}.rn-cms div{font-size:14px;padding:7px 0;border-bottom:1px solid #f4f4f6}.rn-cms b{font-size:12.5px;color:#888;font-weight:500;margin-right:8px}`);
X.mini({ id: 'gyxRed', icon: '📕', title: '小红书', desc: '图文笔记：角色发笔记、你发求问贴、TA 偷偷收藏了什么', cat: '生活', onOpen: () => window.gyxRedOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.notes = D.notes || []; })();
