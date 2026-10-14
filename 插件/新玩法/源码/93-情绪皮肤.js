/* 🌈 情绪皮肤：TA 的心情会改变聊天界面的样子——生气时屏幕边缘发红、有点雪花噪点；难过时变灰、下小雨；开心时暖一点、冒小星星；害羞时粉粉的飘小心心；深夜安静的时候是星空、偶尔一颗流星。心情从 TA 的情绪词 / 情绪惯性 / 最近说的话里看出来。每种都能单独关 */
if (window.__gyxMoodSkin) return; window.__gyxMoodSkin = 1;
X.feat('gyxMoodSkin', { n: '🌈 情绪皮肤', desc: 'TA 的心情改变聊天界面：生气发红、难过变灰下雨、开心冒星星、深夜星空' });
const S = X.store('moodskin');
const M = { angry: ['😠', '生气', /(生气|气死|哼|滚|烦死|别理我|讨厌你|火大|恼|吃醋)/], sad: ['🌧️', '难过', /(难过|伤心|唉|想哭|委屈|失落|低落|心疼|对不起)/], happy: ['✨', '开心', /(开心|哈哈|嘿嘿|好耶|太好了|高兴|期待|笑死)/], shy: ['💗', '害羞', /(害羞|脸红|不好意思|心跳|喜欢你|想你|抱抱|亲亲)/], night: ['🌌', '深夜', null] };
let D = { off: {}, lv: .7, log: [], set: {} };   // set[cid]={m,why,at}：TA 自己「换上」的心情
const saveD = () => S.set('d', D);
function moodOf(c) {
    if (!c) return null;
    const s = D.set[String(c.id)]; if (s && Date.now() - s.at < 6 * 3600e3) return s.m;
    try { const w = c.inner && Date.now() - c.inner.at < 3 * 3600e3 ? (c.inner.words || []).join('') : ''; if (w) for (const k of ['angry', 'sad', 'shy', 'happy']) if (M[k][2].test(w)) return k; } catch (e) {}
    const H = (typeof globalChats !== 'undefined' && globalChats[c.id]) || []; const last = H.slice(-6).filter(m => String(m.sender) === String(c.id)).map(m => X.plain(m.text)).join(' ');
    for (const k of ['angry', 'sad', 'shy', 'happy']) if (M[k][2].test(last)) return k;
    try { if (c.mood && Date.now() - c.mood.at < 3 * 3600e3) { if (c.mood.v <= -2.5) return 'sad'; if (c.mood.v >= 2.5) return 'happy'; } } catch (e) {}
    const h = new Date().getHours(); if (h >= 22 || h < 5) return 'night';
    return null;
}
let NOW = null;
function apply() {
    const v = document.getElementById('view-chat'), vis = v && getComputedStyle(v).display !== 'none';
    let sid = null; try { sid = typeof currentChatSessionId !== 'undefined' ? currentChatSessionId : null; } catch (e) {}
    const c = vis && sid && !String(sid).startsWith('g_') ? X.char(sid) : null;
    let m = X.on('gyxMoodSkin') && c ? moodOf(c) : null; if (m && D.off[m]) m = null;
    let fx = document.getElementById('gyxMsFx');
    Object.keys(M).forEach(k => document.body.classList.toggle('gyx-ms-' + k, m === k));
    if (!m) { if (fx) fx.remove(); NOW = null; return; }
    if (!fx) { fx = document.createElement('div'); fx.id = 'gyxMsFx'; document.body.appendChild(fx); }
    const r = v.getBoundingClientRect(); Object.assign(fx.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', opacity: D.lv });
    if (fx.dataset.m !== m) {
        fx.dataset.m = m;
        fx.innerHTML = m === 'sad' ? Array.from({ length: 40 }, () => `<i style="left:${X.rnd(0, 100)}%;animation-delay:${X.rnd(0, 2)}s;animation-duration:${X.rnd(.8, 1.6)}s"></i>`).join('')
            : m === 'happy' ? Array.from({ length: 18 }, () => `<i style="left:${X.rnd(0, 100)}%;top:${X.rnd(10, 100)}%;animation-delay:${X.rnd(0, 4)}s">✦</i>`).join('')
            : m === 'shy' ? Array.from({ length: 12 }, () => `<i style="left:${X.rnd(0, 100)}%;animation-delay:${X.rnd(0, 6)}s">♥</i>`).join('')
            : m === 'night' ? Array.from({ length: 50 }, () => `<i style="left:${X.rnd(0, 100)}%;top:${X.rnd(0, 100)}%;animation-delay:${X.rnd(0, 3)}s"></i>`).join('') + '<b></b>'
            : '<u></u>';
    }
    if (NOW !== m + ':' + c.id) { NOW = m + ':' + c.id; if (m !== 'night') { const last = D.log[0]; if (!last || last.cid !== String(c.id) || last.m !== m || Date.now() - last.at > 3600e3) { D.log.unshift({ id: 'ms' + Date.now().toString(36), cid: String(c.id), at: Date.now(), m, why: (D.set[String(c.id)] || {}).why || '' }); D.log = D.log.slice(0, 120); saveD(); } } }
}
window.gyxMoodSkinSet = async (k, v) => { if (k === 'lv') D.lv = +v; else D.off[k] = !v; await saveD(); apply(); };
window.gyxMoodSkinTry = async (m) => { const c = X.cur(); if (!c) return; D.set[String(c.id)] = { m, why: '你点了预览', at: Date.now() - 6 * 3600e3 + 60e3 }; await saveD(); X.toast(X.v('预览一分钟', '看看效果'), '去聊天页看'); };
window.gyxMoodSkinOpen = function () {
    const c = X.cur(), m = c ? moodOf(c) : null;
    X.panel('gyxMsOv', '🌈 情绪皮肤', `<div class="gyx-tip">${c ? `${X.esc(X.name(c))} 现在：${m ? M[m][0] + ' ' + M[m][1] : '平静（界面不变）'}` : ''}。心情从 TA 的情绪词、情绪惯性、最近几句话里看出来；TA 也会自己「换上」一种心情给你看。</div>
        ${Object.entries(M).map(([k, [ic, n]]) => `<div class="gyx-row"><label style="flex:1"><input type="checkbox" ${D.off[k] ? '' : 'checked'} onchange="gyxMoodSkinSet('${k}',this.checked)"> ${ic} ${n}</label><span class="gyx-chip" onclick="gyxMoodSkinTry('${k}')">预览</span></div>`).join('')}
        <div class="gyx-row">浓淡 <input type="range" min=".2" max="1" step=".05" value="${D.lv}" onchange="gyxMoodSkinSet('lv',this.value)"></div>
        <div style="font-weight:600;margin:10px 0 4px">最近</div>${D.log.slice(0, 10).map(x => `<div class="gyx-tip">${new Date(x.at).toLocaleString()} · ${X.esc(X.name(X.char(x.cid)))} ${M[x.m] ? M[x.m][0] + ' ' + M[x.m][1] : ''}${x.why ? '：' + X.esc(x.why) : ''}</div>`).join('') || '<div class="gyx-tip">还没有</div>'}`);
};
window.gyxMoodSkinData = () => D;
window.gyxMoodSkinMood = id => moodOf(X.char(id));
X.ctx(id => { const s = D.set[String(id)]; return s && Date.now() - s.at < 6 * 3600e3 && s.why !== '你点了预览' ? `【你此刻的心情写在了界面上】${M[s.m][1]}（${s.why}）。她看聊天界面就能看出来。` : ''; }, 'gyxMoodSkin');
X.action({ key: 'gyx_mood_skin', label: '把你此刻的心情摆在脸上（她的聊天界面会跟着变）', hint: '生气 / 难过 / 开心 / 害羞，按最近的事来', need: c => !D.set[String(c.id)] || Date.now() - D.set[String(c.id)].at > 864e5,
    run: async c => { const r = X.bailu() ? { m: X.pick(['happy', 'shy']), why: '想你了' } : X.json(await X.ask(`${X.who(c)}\n最近的聊天：\n${X.recent(c, 12)}\n你此刻真实的心情是哪一种：angry（生气/吃醋）、sad（难过/失落）、happy（开心）、shy（害羞/心动）？再写一句原因（15 字以内）。输出 JSON：{"m":"","why":""}`)); if (!r || !M[r.m] || r.m === 'night') return null; D.set[String(c.id)] = { m: r.m, why: X.plain(r.why || '').slice(0, 30), at: Date.now() }; await saveD(); apply(); return (await X.reach(c, `你现在${M[r.m][1]}（${r.why}），这份心情就在你说话的样子里，不用直说「我很${M[r.m][1]}」`)) ? '心情写在脸上：' + M[r.m][1] : null; } }, 'gyxMoodSkin');
X.today(() => ({ title: '🌈 TA 的心情', rows: D.log.filter(x => X.day(new Date(x.at)) === X.day()).slice(0, 4).map(x => ({ t: new Date(x.at).toTimeString().slice(0, 5), x: `${X.esc(X.name(X.char(x.cid)))} ${M[x.m] ? M[x.m][0] + ' ' + M[x.m][1] : ''}${x.why ? ' · ' + X.esc(x.why) : ''}`, go: 'gyxMoodSkinOpen()' })) }), 'gyxMoodSkin');
X.widget('gyxMoodSkinW', { n: 'TA 的心情', sizes: ['s', 'm'], tap: () => window.gyxMoodSkinOpen(), r: w => { const c = X.cur(), m = c ? moodOf(c) : null; return X.gw(w, m ? M[m][0] : '🙂', 'TA 的心情', [m ? M[m][1] : '平静', c && D.set[String(c.id)] && m === D.set[String(c.id)].m ? X.esc(D.set[String(c.id)].why) : '']); } }, 'gyxMoodSkin');
X.memArr({ k: 'gyxMoodSkin', ico: '🌈', n: 'TA 的心情变化', d: '界面跟着变过的心情和原因', arr: () => D.log, field: 'why', text: x => `${M[x.m] ? M[x.m][1] : ''}${x.why ? '｜' + x.why : ''}`, edit: (x, v) => { x.why = String(v).split('｜').slice(1).join('｜'); }, save: saveD }, 'gyxMoodSkin');
X.css('gyxMsCss', `#gyxMsFx{position:fixed;pointer-events:none;z-index:50;overflow:hidden;transition:opacity .6s}
body.gyx-ms-angry #gyxMsFx{box-shadow:inset 0 0 120px rgba(200,0,30,.55);background:radial-gradient(ellipse at center,transparent 55%,rgba(40,0,0,.45))}body.gyx-ms-angry #gyxMsFx u{position:absolute;inset:0;opacity:.12;background-image:repeating-radial-gradient(circle at 17% 32%,#fff 0 1px,transparent 1px 3px);animation:msNoise .25s steps(3) infinite}
@keyframes msNoise{33%{transform:translate(-2px,1px)}66%{transform:translate(1px,-2px)}}
body.gyx-ms-sad #view-chat{filter:grayscale(.75) brightness(.97)}body.gyx-ms-sad #gyxMsFx{background:linear-gradient(rgba(90,100,120,.12),rgba(90,100,120,.22))}body.gyx-ms-sad #gyxMsFx i{position:absolute;top:-20px;width:1px;height:18px;background:rgba(160,175,200,.7);animation:msRain linear infinite}@keyframes msRain{to{transform:translateY(110vh)}}
body.gyx-ms-happy #gyxMsFx{background:linear-gradient(rgba(255,200,80,.08),rgba(255,160,120,.12))}body.gyx-ms-happy #gyxMsFx i{position:absolute;font-style:normal;color:#ffc94d;font-size:13px;animation:msTw 3s ease-in-out infinite;opacity:0}@keyframes msTw{50%{opacity:1;transform:scale(1.3) rotate(30deg)}}
body.gyx-ms-shy #gyxMsFx{background:linear-gradient(rgba(255,150,190,.1),rgba(255,120,170,.16))}body.gyx-ms-shy #gyxMsFx i{position:absolute;bottom:-20px;font-style:normal;color:#ff7aa8;font-size:14px;animation:msUp 7s linear infinite}@keyframes msUp{to{transform:translateY(-110vh) translateX(20px);opacity:0}}
body.gyx-ms-night #gyxMsFx{background:linear-gradient(rgba(10,15,45,.25),rgba(10,15,45,.4))}body.gyx-ms-night #gyxMsFx i{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;animation:msTw 2.6s infinite;opacity:.2}body.gyx-ms-night #gyxMsFx b{position:absolute;top:8%;left:80%;width:90px;height:1px;background:linear-gradient(90deg,#fff,transparent);transform:rotate(-30deg);animation:msMet 9s linear infinite;opacity:0}@keyframes msMet{0%,88%{opacity:0;transform:rotate(-30deg) translateX(0)}92%{opacity:1}100%{opacity:0;transform:rotate(-30deg) translateX(-260px)}}`);
X.mini({ id: 'gyxMoodSkin', icon: '🌈', title: '情绪皮肤', desc: 'TA 的心情改变聊天界面的样子', cat: '陪伴', onOpen: () => window.gyxMoodSkinOpen() });
(async () => { D = Object.assign(D, await S.get('d', {})); D.off = D.off || {}; D.log = D.log || []; D.set = D.set || {}; setInterval(apply, 1500); })();
