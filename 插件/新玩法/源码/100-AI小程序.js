/* 🧩 AI 小程序：你说想要一个什么小 App（「我们的倒数日」「今天吃什么转盘」「记喝水」），AI 现写一个装进来，点开就能用；不满意就说「改一改」。小程序能记东西、能问 TA（会花一次 API）。TA 也会根据你们聊的事，自己给你做一个。在小手机桌面也能放一个启动器 */
if (window.__gyxApps) return; window.__gyxApps = 1;
X.feat('gyxApps', { n: '🧩 AI 小程序', desc: '说一句想要什么小 App，AI 现写一个装进来；TA 也会给你做' });
const S = X.store('apps');
let D = { apps: [] };   // {id,n,ico,desc,html,at,by,store:{},ver}
const saveD = () => S.set('d', D);
const app = id => D.apps.find(a => a.id === id);
// 小程序里能用的：gyx.get / gyx.set / gyx.ask / gyx.toast / gyx.ta / gyx.me
const SDK = (a, c) => `<script>(function(){var q={},n=0;window.addEventListener('message',function(e){var d=e.data||{};if(d.gyxRe&&q[d.id]){q[d.id](d.v);delete q[d.id];}});function call(t,p){return new Promise(function(r){var id=++n;q[id]=r;parent.postMessage({gyxApp:${JSON.stringify(a.id)},t:t,p:p,id:id},'*');});}
window.gyx={ta:${JSON.stringify(c ? X.name(c) : 'TA')},me:${JSON.stringify(X.me(c))},get:function(k){return call('get',k)},set:function(k,v){return call('set',[k,v])},ask:function(p){return call('ask',p)},toast:function(t){return call('toast',t)}};})();<\/script>`;
const BASECSS = '<style>html,body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-tap-highlight-color:transparent}</style>';
function extract(t) {
    t = String(t || ''); const f = t.match(/```(?:html)?\s*([\s\S]*?)```/i); if (f) t = f[1];
    const i = t.search(/<!doctype|<html|<body|<div|<style/i); if (i > 0) t = t.slice(i);
    return /<\w+/.test(t) ? t.trim() : '';
}
const RULES = `要求：
1. 只输出一个完整的 HTML 文件（CSS 和 JS 都写在里面），不要解释。
2. 手机竖屏用，宽 360 左右也好看；配色好看、圆角、留白，像真的 App。
3. 不能联网、不能引外部文件（字体、图片、库都不行），图标用 emoji。
4. 要存东西就用 await gyx.get(key) / await gyx.set(key, value)（已经有了，别用 localStorage）；想让 TA 说句话用 await gyx.ask("给 TA 的话")，返回 TA 回的一句；提示用 gyx.toast("文字")。gyx.ta 是 TA 的名字，gyx.me 是她的名字。
5. 代码要能直接跑，别留 TODO。`;
async function make(desc, c, base, by) {
    const prompt = base ? `下面是一个小 App 的 HTML。按这个要求改：「${desc}」。改完输出完整的新 HTML。\n${RULES}\n\n原来的：\n${base.html.slice(0, 14000)}` : `写一个手机小 App：「${desc}」。${c ? `用它的是「${X.me(c)}」，她的恋人叫「${X.name(c)}」，可以带一点只有他们俩懂的温度。` : ''}\n${RULES}\n另外在第一行写一个 HTML 注释：<!-- name: App 名字（6 字以内） | icon: 一个 emoji -->`;
    const t = await X.ask(prompt); const html = extract(t);
    if (!html) { X.toast(X.v('没写出来', '这次没成功'), '再说一遍，或者换个说法'); try { if (window.gyHelpReport) window.gyHelpReport('AI 小程序没生成出来', '模型没有返回能用的 HTML。可能是回复被截断了（小程序代码比较长），去 设置 → 生成参数 把最大回复长度调大一点再试。', { kind: 'plugin', src: 'AI 小程序' }); } catch (e) {} return null; }
    const m = String(t || '').match(/<!--\s*name:\s*([^|]+?)\s*\|\s*icon:\s*(\S+)\s*-->/);
    if (base) { base.html = html; base.ver = (base.ver || 1) + 1; base.at = Date.now(); await saveD(); return base; }
    const a = { id: 'ap' + Date.now().toString(36), n: X.plain(m ? m[1] : desc).slice(0, 10), ico: m ? m[2].slice(0, 4) : '🧩', desc: X.plain(desc).slice(0, 80), html, at: Date.now(), by: by || 'me', store: {}, ver: 1 };
    D.apps.unshift(a); await saveD(); return a;
}
window.addEventListener('message', async e => {
    const d = e.data || {}; if (!d.gyxApp) return; const a = app(d.gyxApp); if (!a) return;
    const fr = [...document.querySelectorAll('iframe.gyxapp-fr')].find(f => f.contentWindow === e.source); if (!fr) return;
    let v = null;
    try {
        if (d.t === 'get') v = a.store[String(d.p)] ?? null;
        else if (d.t === 'set') { a.store[String(d.p[0])] = d.p[1]; await saveD(); v = true; }
        else if (d.t === 'toast') { X.toast(a.ico + ' ' + a.n, String(d.p).slice(0, 60)); v = true; }
        else if (d.t === 'ask') { const c = X.char(a.cid) || X.cur(); v = X.plain(await X.ask(`${X.who(c)}\n她在用一个叫「${a.n}」的小 App，App 里传来一句：「${String(d.p).slice(0, 500)}」。用你的口吻回一两句。只输出回复。`) || ''); }
    } catch (err) {}
    fr.contentWindow.postMessage({ gyxRe: 1, id: d.id, v }, '*');
});
window.gyxAppsRun = function (id) {
    const a = app(id); if (!a) return; const c = X.char(a.cid) || X.cur(); a.used = Date.now(); saveD();
    X.panel('gyxApOv', a.ico + ' ' + X.esc(a.n), `<iframe class="gyxapp-fr" sandbox="allow-scripts allow-forms allow-modals" title="${X.esc(a.n)}"></iframe>
        <div class="gyx-row"><input id="gyxApFix" class="gyx-who" style="flex:1" placeholder="想怎么改？比如：按钮大一点、加个重置"><button class="gyx-btn lite" onclick="this.disabled=true;this.textContent='在改…';gyxAppsFix('${a.id}')">改一改</button></div>
        <div class="gyx-row"><button class="gyx-btn lite" onclick="gyxAppsOpen()">所有小程序</button><button class="gyx-btn lite" onclick="gyxAppsSrc('${a.id}')">看代码</button><span class="gyx-tip">第 ${a.ver || 1} 版${a.by !== 'me' ? ' · ' + X.esc(X.name(X.char(a.by))) + ' 做的' : ''}</span></div>`, 'gyx-app');
    const fr = document.querySelector('#gyxApOv iframe'); fr.srcdoc = BASECSS + SDK(a, c) + a.html;
};
window.gyxAppsFix = async id => { const a = app(id), v = ((document.getElementById('gyxApFix') || {}).value || '').trim(); if (!a || !v) return; const r = await make(v, X.char(a.cid) || X.cur(), a); if (r) X.toast(X.v('改好了', '✨ 新的一版'), a.n); window.gyxAppsRun(id); };
window.gyxAppsSrc = id => { const a = app(id); if (!a) return; X.panel('gyxApSrc', '代码 · ' + X.esc(a.n), `<textarea class="gyx-in" rows="18" style="font-family:monospace;font-size:12px" id="gyxApSrcT">${X.esc(a.html)}</textarea><div class="gyx-row"><button class="gyx-btn" onclick="gyxAppsSave('${a.id}')">存（自己改过的话）</button></div>`); };
window.gyxAppsSave = async id => { const a = app(id); const t = (document.getElementById('gyxApSrcT') || {}).value; if (!a || !t) return; a.html = t; a.ver = (a.ver || 1) + 1; await saveD(); window.gyxAppsRun(id); };
window.gyxAppsNew = async () => { const v = ((document.getElementById('gyxApNew') || {}).value || '').trim(); if (!v) return; X.toast(X.v('在写…', '🧩 AI 在做你的小程序', '稍等一下'), '小程序比较长，可能要半分钟'); const a = await make(v, X.cur()); if (a) window.gyxAppsRun(a.id); else window.gyxAppsOpen(); return a; };
window.gyxAppsDel = async id => { D.apps = D.apps.filter(a => a.id !== id); await saveD(); window.gyxAppsOpen(); };
window.gyxAppsOpen = function () {
    X.panel('gyxApOv', '🧩 AI 小程序', `<div class="gyx-tip">说一句你想要的小 App，AI 现写一个装进来。小程序能记东西、能问 TA。代码比较长，模型的「最大回复长度」太小可能写不完。</div>
        <textarea id="gyxApNew" class="gyx-in" rows="2" placeholder="比如：我们的纪念日倒数 / 今天吃什么转盘 / 喝水打卡，喝够 8 杯 TA 夸我"></textarea>
        <div class="gyx-row"><button class="gyx-btn" onclick="this.disabled=true;this.textContent='在写…';gyxAppsNew()">做一个</button>${['今天吃什么转盘', '纪念日倒数', '喝水打卡', '心情小日历', '情侣待办清单'].map(s => `<span class="gyx-chip" onclick="document.getElementById('gyxApNew').value='${s}'">${s}</span>`).join('')}</div>
        <div class="ap-grid">${D.apps.map(a => `<div class="ap-it"><b onclick="gyxAppsRun('${a.id}')">${X.esc(a.ico)}</b><span>${X.esc(a.n)}</span>${a.by !== 'me' ? `<i>${X.esc(X.name(X.char(a.by)))} 做的</i>` : ''}<em onclick="gyxAppsDel('${a.id}')">删</em></div>`).join('') || '<div class="gyx-tip">还没有小程序</div>'}</div>`);
};
window.gyxAppsData = () => D;
window.gyxAppsMake = (desc, cid, by) => make(desc, X.char(cid) || X.cur(), null, by);
X.ctx(id => { const a = D.apps.find(x => x.by === String(id) && Date.now() - x.at < 2 * 864e5); return a ? `【你给她做了一个小 App「${a.n}」】${a.desc}` : ''; }, 'gyxApps');
X.action({ key: 'gyx_apps', label: '根据你们最近聊的事，给她做一个小 App', hint: '倒数日、打卡、小游戏……', need: c => !D.apps.some(a => a.by === String(c.id) && Date.now() - a.at < 7 * 864e5),
    run: async c => { const idea = X.bailu() ? null : X.json(await X.ask(`${X.who(c)}\n最近的聊天：\n${X.recent(c, 14)}\n你想给她做一个手机小 App 当惊喜（跟你们最近的事有关，实用或者可爱）。说说是什么。输出 JSON：{"desc":"App 是做什么的（30 字以内）","line":"你送给她时说的一句话"}`)); if (!idea || !idea.desc) return null; const a = await make(idea.desc, c, null, String(c.id)); if (!a) return null; a.cid = String(c.id); a.line = X.plain(idea.line || ''); await saveD(); X.notify(c, `🧩 ${X.esc(X.name(c))} ${X.v('给你做了一个小程序', '送了你一个小 App', '写了个小程序给你')}：${X.esc(a.n)}`, a.line, () => window.gyxAppsRun(a.id)); return (await X.reach(c, `你给她做了一个小 App「${a.n}」（${a.desc}），装在她的小程序里了，叫她去打开${a.line ? '，你想说：' + a.line : ''}`)) ? '做了一个小程序：' + a.n : null; } }, 'gyxApps');
X.today(() => ({ title: '🧩 小程序', rows: D.apps.filter(a => X.day(new Date(a.at)) === X.day()).map(a => ({ t: a.by !== 'me' ? X.esc(X.name(X.char(a.by))) : '你', x: `${a.ico} ${X.esc(a.n)}${a.ver > 1 ? '（第 ' + a.ver + ' 版）' : ''}`, go: `gyxAppsRun('${a.id}')` })) }), 'gyxApps');
X.widget('gyxAppsW', { n: '小程序', sizes: ['s', 'm'], tap: () => window.gyxAppsOpen(), r: w => { const L = D.apps.slice().sort((a, b) => (b.used || b.at) - (a.used || a.at)); if (w.size === 's') return `<div class="gw-x s"><b>${L[0] ? X.esc(L[0].ico) : '🧩'}</b><em>${L[0] ? X.esc(L[0].n) : '小程序'}</em></div>`; return `<div class="gw-x m ap-w">${L.slice(0, 4).map(a => `<span onclick="event.stopPropagation();gyxAppsRun('${a.id}')"><b>${X.esc(a.ico)}</b><i>${X.esc(a.n)}</i></span>`).join('') || '<em>还没有小程序，点我做一个</em>'}</div>`; } }, 'gyxApps');
X.mem({ k: 'gyxApps', ico: '🧩', n: '小程序', d: '装进来的小 App（改名字 / 删）', items: () => D.apps, text: a => a.n + '｜' + a.desc, edit: (a, v) => { const p = String(v).split('｜'); a.n = p[0].slice(0, 10); if (p[1]) a.desc = p.slice(1).join('｜'); }, del: (c, i) => { D.apps.splice(i, 1); }, meta: a => new Date(a.at).toLocaleString() + (a.by !== 'me' ? ' · TA 做的' : ''), save: saveD }, 'gyxApps');
X.css('gyxApCss', `.gyx-app .gyx-box{width:min(440px,100%)}.gyxapp-fr{width:100%;height:min(640px,70vh);border:none;border-radius:18px;background:#fff;box-shadow:0 0 0 1px #eee}
.ap-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:12px;margin-top:12px}.ap-it{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12.5px;text-align:center}.ap-it b{width:58px;height:58px;border-radius:16px;background:linear-gradient(145deg,#f4f0ff,#ffe9f2);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:normal;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,.06)}.ap-it i{font-style:normal;font-size:11px;color:#ff4d7d}.ap-it em{font-style:normal;font-size:11px;color:#bbb;cursor:pointer}
.ap-w{display:grid!important;grid-template-columns:repeat(4,1fr);align-items:center}.ap-w span{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer}.ap-w b{font-size:24px;font-weight:normal}.ap-w i{font-style:normal;font-size:10.5px;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}`);
X.mini({ id: 'gyxApps', icon: '🧩', title: 'AI 小程序', desc: '说一句想要什么小 App，AI 现写一个装进来', cat: '生活', onOpen: () => window.gyxAppsOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.apps = D.apps || []; })();
