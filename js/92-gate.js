// 🚪 280：开屏登录 + 最低版本
// 开不开、用哪种加入方式（谁都能进 / 邀请码 / 申请审核）、最低版本号，全都存在群主的社区服务器上，
// 群主在「社区 → 我 → 社区设置」里改，所有人下次打开谷雨就跟着变——不用发新版。
// · 已经登录过的人：直接放行，后台再核对一下（被封号 / 被踢才拦）；没网也放行
// · 没登录过的人：先问服务器要不要登录，要就出登录页；连不上就出「重试」
// · 本地的角色、聊天记录一概不动，这里只是盖一层
(function () {
    'use strict';
    // 291：社区服务器有两个地址，都是群主的同一个服务器（同一个库，钥匙通用）：
    //   api.guyu.pw（自己的域名，国内能直接连）在前；workers.dev（国内被墙，开梯子能连）当备用。
    //   先用上次连得上的；连不上（网络错误）就自动换下一个，换成功了记住。开机后台再探一次，主地址通了就换回主地址。
    var URLS = ['https://api.guyu.pw', 'https://guyu-community.3040831326.workers.dev'];
    var DEFAULT_URL = URLS[0];
    var KEY = 'gyGate';
    function rd() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
    function wr(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
    var st = rd();
    var official = function (u) { return URLS.indexOf(String(u || '').replace(/\/+$/, '')) >= 0; };   /* 288：只连群主这一个社区，不认别的地址 */
    var cur = official(st.url) ? String(st.url).replace(/\/+$/, '') : URLS[0];
    if (st.url !== cur) { st.url = cur; wr(st); }
    var url = function () { return cur; };
    function use(u) { if (u === cur) return; cur = u; st.url = u; wr(st); try { window.dispatchEvent(new CustomEvent('gy-gate-url', { detail: { url: u } })); } catch (e) {} }
    // 依次试每个地址（从 from 开始），网络错误才换；服务器回了话（哪怕是 4xx）就算连上了
    function tryFetch(path, opt, from) {
        var order = [from].concat(URLS.filter(function (x) { return x !== from; }));
        var i = 0;
        function next(err) {
            if (i >= order.length) return Promise.reject(err || new Error('连不上社区服务器'));
            var u = order[i++];
            return fetch(u + path, opt).then(function (r) { use(u); return r; }, function (e) { return next(e); });
        }
        return next();
    }
    var VER = +(window.GY_VERSION || 0);

    var API = window.gyGate = {
        get url() { return url(); },
        urls: URLS.slice(),
        official: official,
        // 别的地方（社区、在线音乐）发请求用这个：连不上会自动换备用地址
        fetch: function (path, opt) { return tryFetch(path, opt || {}, cur); },
        get tok() { return st.tok || ''; },
        info: null,
        // 社区里加入 / 用钥匙登录 / 退出时调这个，两边共用一把钥匙
        set: function (tok, u) { st.tok = tok || ''; st.url = cur; st.ok = tok ? Date.now() : 0; wr(st); },
        clear: function () { st.tok = ''; st.ok = 0; wr(st); try { window.dispatchEvent(new CustomEvent('gy-gate-logout')); } catch (e) {} },
        open: function () { show(); }
    };
    // 开机后台探一下：主地址（api.guyu.pw）通了就用主地址
    setTimeout(function () {
        if (cur === URLS[0]) return;
        var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var tm = setTimeout(function () { try { ctl && ctl.abort(); } catch (e) {} }, 5000);
        fetch(URLS[0] + '/info', { signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.community) use(URLS[0]); }).catch(function () {}).finally(function () { clearTimeout(tm); });
    }, 1500);
    // 自动化测试（webdriver）不拦，不然整套测试都进不去
    var SKIP = !!navigator.webdriver || !url();

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function req(path, body, ms) {
        var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var tm = setTimeout(function () { try { ctl && ctl.abort(); } catch (e) {} }, ms || 8000);
        var h = { 'Content-Type': 'application/json' }; if (st.tok) h['X-Gy-Token'] = st.tok;
        return tryFetch(path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined, signal: ctl ? ctl.signal : undefined }, cur)
            .then(function (r) { return r.json().then(function (j) { j.__s = r.status; return j; }); })
            .finally(function () { clearTimeout(tm); });
    }

    var css = '#gyGate{position:fixed;inset:0;z-index:2147483600;background:#f2f2f7;color:#1c1c1e;display:flex;align-items:center;justify-content:center;font:15px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;padding:20px;box-sizing:border-box;overflow:auto}'
        + '@media (prefers-color-scheme:dark){#gyGate{background:#000;color:#f2f2f7}#gyGate .gg-c{background:#1c1c1e}#gyGate input,#gyGate textarea{background:#2c2c2e;color:#f2f2f7;border-color:#3a3a3c}}'
        + '#gyGate .gg-c{width:100%;max-width:360px;background:#fff;border-radius:22px;padding:28px 22px 22px;box-sizing:border-box;text-align:center}'
        + '#gyGate .gg-i{font-size:44px;line-height:1;margin-bottom:10px}#gyGate h1{font-size:22px;margin:0 0 4px;font-weight:700}#gyGate p{margin:0 0 18px;color:#8e8e93;font-size:13.5px;white-space:pre-wrap}'
        + '#gyGate input,#gyGate textarea{display:block;width:100%;box-sizing:border-box;margin:0 0 10px;padding:12px 14px;border:1px solid #e5e5ea;border-radius:12px;font:inherit;background:#f9f9fb;outline:none}#gyGate textarea{min-height:70px;resize:vertical}'
        + '#gyGate .gg-b{display:block;width:100%;padding:13px;border:0;border-radius:14px;background:#34c759;color:#fff;font:inherit;font-weight:600;cursor:pointer;margin-top:6px}#gyGate .gg-b[disabled]{opacity:.5}'
        + '#gyGate .gg-l{display:inline-block;margin-top:14px;color:#007aff;font-size:13.5px;cursor:pointer;background:none;border:0;font-family:inherit}#gyGate .gg-e{color:#ff3b30;font-size:13px;min-height:18px;margin:2px 0 4px}'
        // 303：📝 审核处（等审核时）
        + '#gyGate .gg-c.gg-room{max-width:480px;height:min(92vh,760px);display:flex;flex-direction:column;padding:16px 14px 12px;text-align:left}'
        + '#gyGate .gg-rh{display:flex;align-items:center;gap:10px;padding:0 4px 10px;border-bottom:1px solid rgba(60,60,67,.15)}#gyGate .gg-rh .gg-i{font-size:28px;margin:0}#gyGate .gg-rh b{font-size:16px;display:block}#gyGate .gg-rh small{color:#8e8e93;font-size:12.5px}'
        + '#gyGate .gg-rl{flex:1;overflow-y:auto;padding:10px 2px;-webkit-overflow-scrolling:touch}#gyGate .gg-intro{background:rgba(0,122,255,.08);border-radius:12px;padding:10px 12px;font-size:13.5px;margin:0 0 10px;white-space:pre-wrap;color:inherit}'
        + '#gyGate .gg-m{display:flex;margin:6px 0}#gyGate .gg-m.me{justify-content:flex-end}#gyGate .gg-m .bb{max-width:78%;background:#e9e9eb;color:#1c1c1e;border-radius:16px;padding:8px 12px;font-size:14.5px;word-break:break-word;white-space:pre-wrap}'
        + '#gyGate .gg-m.me .bb{background:#007aff;color:#fff}#gyGate .gg-m .nm{font-size:11.5px;color:#8e8e93;margin:0 0 2px}#gyGate .gg-m img,#gyGate .gg-m video{display:block;max-width:100%;max-height:260px;border-radius:10px;margin-top:2px;background:#000}'
        + '#gyGate .gg-sys{text-align:center;color:#8e8e93;font-size:12.5px;margin:8px 0}'
        + '#gyGate .gg-rf{display:flex;gap:6px;align-items:center;padding-top:8px;border-top:1px solid rgba(60,60,67,.15)}#gyGate .gg-rf input[type=text]{margin:0;flex:1;min-width:0;padding:10px 12px}'
        + '#gyGate .gg-rf .rb{flex:none;width:38px;height:38px;border-radius:50%;border:0;background:rgba(120,120,128,.14);font-size:18px;cursor:pointer;padding:0}#gyGate .gg-rf .go{flex:none;border:0;border-radius:19px;background:#007aff;color:#fff;padding:9px 14px;font:inherit;cursor:pointer}'
        + '#gyGate .gg-up{font-size:12.5px;color:#8e8e93;min-height:16px;padding:2px 4px}#gyGate .gg-rk{display:flex;justify-content:space-between;align-items:center}#gyGate .gg-rk .gg-l{margin-top:6px}'
        + '@media (prefers-color-scheme:dark){#gyGate .gg-m .bb{background:#2c2c2e;color:#f2f2f7}#gyGate .gg-m.me .bb{background:#0a84ff;color:#fff}}';
    var box = null;
    function mount(html) {
        if (!box) {
            var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
            box = document.createElement('div'); box.id = 'gyGate'; (document.body || document.documentElement).appendChild(box);
        }
        box.innerHTML = '<div class="gg-c">' + html + '</div>';
        return box;
    }
    function done() { try { stopRoom(); } catch (e) {} if (box) { box.remove(); box = null; } }
    function head(i) { var n = (i && i.name) || '谷雨'; return '<div class="gg-i">🌱</div><h1>' + esc(n) + '</h1>'; }

    function wait() { mount(head(API.info) + '<p>连接中…</p>'); }
    function offline() {
        mount(head(API.info) + '<p>连不上服务器。\n第一次打开要联网登录一下，之后没网也能用。</p><button class="gg-b" id="ggRe">重试</button>');
        box.querySelector('#ggRe').onclick = start;
    }
    function tooOld(i) {
        mount(head(i) + '<p>' + esc(i.updMsg || '这个版本太旧了，更新一下再用') + '\n（现在 ' + VER + '，至少要 ' + i.minVer + '）</p>'
            + (i.updUrl ? '<button class="gg-b" id="ggUp">去更新</button>' : '') + '<button class="gg-l" id="ggRe">我更新好了，重新检查</button>');
        var u = box.querySelector('#ggUp'); if (u) u.onclick = function () { try { (window.plus && plus.runtime) ? plus.runtime.openURL(i.updUrl) : window.open(i.updUrl, '_blank'); } catch (e) { location.href = i.updUrl; } };
        box.querySelector('#ggRe').onclick = function () { location.reload(); };
    }
    function blocked(t) { mount(head(API.info) + '<p>' + esc(t) + '</p><button class="gg-l" id="ggKey">用钥匙登录别的账号</button>'); box.querySelector('#ggKey').onclick = keyLogin; }
    /* ---------------- 303：上传图片 / 视频（审核处和社区都用这个） ---------------- */
    var fileUrl = function (id) { return !id ? '' : /^https?:|^data:/.test(id) ? id : cur + '/f/' + id; };
    function shrinkImg(file, max) {
        return new Promise(function (res, rej) {
            var fr = new FileReader();
            fr.onload = function () {
                var d = String(fr.result);
                if (/^data:image\/gif/.test(d) && d.length < 1400000) return res(d);   // 动图不压（压了就不动了）
                var im = new Image();
                im.onload = function () { var k = Math.min(1, max / Math.max(im.width, im.height)); var c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); };
                im.onerror = function () { rej(new Error('这张图打不开')); }; im.src = d;
            };
            fr.onerror = function () { rej(new Error('读不出这张图')); }; fr.readAsDataURL(file);
        });
    }
    function upImg(file) {
        return shrinkImg(file, 1280).then(function (d) { return req('/f', { data: d }, 30000); }).then(function (j) { if (!j.ok) throw new Error(j.err || '没传上去'); return j.id; });
    }
    // 视频：读成 base64，切成 1MB 左右一块，begin → part × n → done
    function upVideo(file, vidMaxMb, prog) {
        var max = (vidMaxMb || 20) * 1048576;
        var mime = file.type || (/\.mov$/i.test(file.name) ? 'video/quicktime' : /\.webm$/i.test(file.name) ? 'video/webm' : 'video/mp4');
        if (!/^video\//.test(mime)) return Promise.reject(new Error('这不是视频文件'));
        if (file.size > max) return Promise.reject(new Error('视频 ' + (Math.round(file.size / 104857.6) / 10) + ' MB，超过了 ' + vidMaxMb + ' MB 的上限，剪短一点再发'));
        return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(',')[1] || ''); }; fr.onerror = function () { rej(new Error('读不出这个视频')); }; fr.readAsDataURL(file); }).then(function (b64) {
            var parts = []; for (var i = 0; i < b64.length; i += 1400000) parts.push(b64.slice(i, i + 1400000));
            return req('/fv/begin', { mime: mime, size: file.size, parts: parts.length }, 20000).then(function (j) {
                if (!j.ok) throw new Error(j.err || '开始不了');
                var id = j.id, k = 0;
                var next = function () {
                    if (k >= parts.length) return req('/fv/done', { id: id }, 20000).then(function (d) { if (!d.ok) throw new Error(d.err || '没传完'); return id; });
                    prog && prog(k / parts.length);
                    var tries = 0;
                    var one = function () { return req('/fv/part', { id: id, i: k, data: parts[k] }, 90000).then(function (r) { if (!r.ok) throw new Error(r.err || '有一块没传上去'); k++; return next(); }, function (e) { if (++tries < 3) return one(); throw e; }); };
                    return one();
                };
                return next();
            });
        });
    }
    API.fileUrl = fileUrl; API.upImg = upImg; API.upVideo = upVideo;

    /* ---------------- 303：📝 审核处（等审核的时候进这里，不再是一张干等的卡片） ----------------
       只有你和管理员能看。能说话、发图片、发视频；管理员在社区「管理 → 入群申请」里点进来跟你聊。
       通过了自动进谷雨；没通过会告诉你，能重新申请。 */
    var ROOM = null;
    function pending() {
        if (ROOM && ROOM.t) clearInterval(ROOM.t);
        ROOM = { last: 0, msgs: [], vidMax: 20, intro: '', me: '' , t: 0 };
        var i = API.info || {};
        box || mount('');
        box.innerHTML = '<div class="gg-c gg-room"><div class="gg-rh"><div class="gg-i">📝</div><div style="flex:1;min-width:0"><b>' + esc((i.name || '谷雨社区') + ' · 审核处') + '</b><small id="ggRS">等管理员审核中…</small></div></div>'
            + '<div class="gg-rl" id="ggRL"><div class="gg-intro" id="ggRI">只有你和管理员能看到这里。可以跟管理员说说话，也能发图片、视频。管理员通过以后，谷雨就能用了。</div></div>'
            + '<div class="gg-up" id="ggUp"></div>'
            + '<div class="gg-rf"><button class="rb" id="ggPi" title="发图片">🖼️</button><button class="rb" id="ggPv" title="发视频">🎬</button><input type="text" id="ggRT" maxlength="2000" placeholder="跟管理员说点什么"><button class="go" id="ggRG">发送</button></div>'
            + '<div class="gg-rk"><button class="gg-l" id="ggRR">刷新</button><button class="gg-l" id="ggKey">用钥匙登录别的账号</button></div>'
            + '<input type="file" id="ggFi" accept="image/*" style="display:none"><input type="file" id="ggFv" accept="video/*" style="display:none"></div>';
        var $ = function (id) { return box.querySelector('#' + id); };
        $('ggKey').onclick = function () { stopRoom(); keyLogin(); };
        $('ggRR').onclick = function () { roomPoll(true); };
        var up = $('ggUp');
        var send = function (body) { return req('/ap/send', body, 15000).then(function (j) { if (!j.ok) throw new Error(j.err || '没发出去'); return roomPoll(); }); };
        $('ggRG').onclick = function () { var t = $('ggRT').value.trim(); if (!t) return; $('ggRT').value = ''; send({ text: t }).catch(function (e) { $('ggRT').value = t; up.textContent = '没发出去：' + e.message; }); };
        $('ggRT').onkeydown = function (e) { if (e.key === 'Enter' && !e.isComposing) $('ggRG').onclick(); };
        $('ggPi').onclick = function () { $('ggFi').click(); };
        $('ggPv').onclick = function () { $('ggFv').click(); };
        $('ggFi').onchange = function () { var f = this.files && this.files[0]; this.value = ''; if (!f) return; up.textContent = '图片上传中…'; upImg(f).then(function (id) { up.textContent = ''; return send({ img: id }); }).catch(function (e) { up.textContent = '图片没发出去：' + e.message; }); };
        $('ggFv').onchange = function () { var f = this.files && this.files[0]; this.value = ''; if (!f) return; up.textContent = '视频上传中… 0%'; upVideo(f, ROOM.vidMax, function (p) { up.textContent = '视频上传中… ' + Math.round(p * 100) + '%（别关谷雨）'; }).then(function (id) { up.textContent = ''; return send({ img: id }); }).catch(function (e) { up.textContent = '视频没发出去：' + e.message; }); };
        roomPoll(true);
        ROOM.t = setInterval(function () { roomPoll(); }, 4000);
    }
    function stopRoom() { if (ROOM && ROOM.t) { clearInterval(ROOM.t); ROOM.t = 0; } }
    function roomPoll(first) {
        if (!ROOM || !box) return Promise.resolve();
        var R = ROOM;
        return Promise.all([req('/ap/msgs?after=' + R.last, null, 10000).catch(function () { return null; }), req('/whoami', null, 8000).catch(function () { return null; })]).then(function (x) {
            var j = x[0], w = x[1];
            if (R !== ROOM) return;
            if (w && w.status === 'ok') { stopRoom(); st.ok = Date.now(); wr(st); done(); try { if (typeof showToast === 'function') showToast('', '🎉 审核通过了', '欢迎来到谷雨', null, null, false); } catch (e) {} return; }
            if (w && (w.status === 'left' || w.status === 'none')) { stopRoom(); if (j && j.msgs) R.msgs = R.msgs.concat(j.msgs); return rejected(R); }
            if (w && w.status === 'banned') { stopRoom(); return blocked('这个账号被封了'); }
            if (!j || !j.ok) { var s0 = box.querySelector('#ggRS'); if (s0) s0.textContent = w && w.status === 'pending' ? '等管理员审核中…（审核处暂时连不上，过一会儿自己重试）' : '连不上社区，过一会儿自己重试'; return; }
            R.vidMax = j.vidMax || R.vidMax; if (j.user) R.me = j.user.id;
            var it = box.querySelector('#ggRI'); if (it && j.intro) it.textContent = j.intro;
            var s1 = box.querySelector('#ggRS'); if (s1) s1.textContent = '等管理员审核中…（只有你和管理员能看到这里）';
            var L = box.querySelector('#ggRL'); if (!L) return;
            var stick = L.scrollHeight - L.scrollTop - L.clientHeight < 60;
            (j.msgs || []).forEach(function (m) {
                if (m.id <= R.last) return; R.last = m.id; R.msgs.push(m);
                var d = document.createElement('div');
                if (m.kind === 'sys') { d.className = 'gg-sys'; d.textContent = m.text; }
                else {
                    var mine = m.uid === R.me; d.className = 'gg-m' + (mine ? ' me' : '');
                    var media = !m.img ? '' : /^v/.test(m.img) ? '<video controls playsinline preload="metadata" src="' + esc(fileUrl(m.img)) + '"></video>' : '<img src="' + esc(fileUrl(m.img)) + '" alt="">';
                    d.innerHTML = '<div><div class="nm">' + (mine ? '' : '管理员') + '</div><div class="bb">' + esc(m.text || '') + media + '</div></div>';
                }
                L.appendChild(d);
            });
            if (first || stick) L.scrollTop = 1e7;
        });
    }
    function rejected(R) {
        var why = ''; for (var k = R.msgs.length - 1; k >= 0; k--) if (R.msgs[k].kind === 'sys') { why = R.msgs[k].text; break; }
        mount(head(API.info) + '<p>' + esc(why || '这次没有通过审核') + '\n\n可以重新申请一次。</p><button class="gg-b" id="ggRe">重新申请</button><button class="gg-l" id="ggKey">用钥匙登录别的账号</button>');
        box.querySelector('#ggRe').onclick = function () { API.clear(); if (API.info) login(API.info); else start(); };
        box.querySelector('#ggKey').onclick = keyLogin;
    }
    function login(i) {
        var m = i.join || 'open';
        var tip = m === 'invite' ? '要邀请码才能进' : m === 'apply' ? '填一下，管理员通过就能进' : (i.intro || '起个名字就能进');
        mount(head(i) + '<p>' + esc(tip) + '</p>'
            + '<input id="ggNick" maxlength="24" placeholder="昵称">'
            + '<input id="ggHandle" maxlength="20" placeholder="谷雨号（英文数字，可不填）" autocapitalize="off">'
            + (m === 'invite' ? '<input id="ggCode" maxlength="40" placeholder="邀请码" autocapitalize="characters">' : '')
            + (m === 'apply' ? '<textarea id="ggApply" maxlength="300" placeholder="' + esc(i.applyQ || '说点什么') + '"></textarea>' : '')
            + '<div class="gg-e" id="ggErr"></div><button class="gg-b" id="ggGo">' + (m === 'apply' ? '提交申请' : '进入谷雨') + '</button>'
            + '<button class="gg-l" id="ggKey">我有钥匙（换了手机 / 清了数据）</button>');
        var v = function (id) { var e = box.querySelector('#' + id); return e ? e.value.trim() : ''; };
        box.querySelector('#ggKey').onclick = keyLogin;
        box.querySelector('#ggGo').onclick = function () {
            var b = this, err = box.querySelector('#ggErr');
            if (!v('ggNick')) { err.textContent = '起个昵称'; return; }
            b.disabled = true; err.textContent = '';
            st.tok = '';
            // 302：年满 18 岁（js/92e 确认过的）一起交上去；申请审核的话写在申请最前面，管理员看得到
            var adult = typeof window.gyAdultOk === 'function' && window.gyAdultOk();
            var ap = v('ggApply'); if (m === 'apply' && adult) ap = '【已确认年满 18 岁】' + ap;
            req('/join', { nick: v('ggNick'), handle: v('ggHandle'), code: v('ggCode'), apply: ap, adult: adult ? 1 : 0 }).then(function (j) {
                if (!j.ok) { err.textContent = j.err || '没成功'; b.disabled = false; return; }
                API.set(j.token);
                try { window.dispatchEvent(new CustomEvent('gy-gate-login', { detail: { url: url(), tok: j.token } })); } catch (e) {}
                if (j.status === 'pending') pending(); else done();
            }).catch(function () { err.textContent = '连不上，再试一次'; b.disabled = false; });
        };
    }
    function keyLogin() {
        mount(head(API.info) + '<p>粘贴在「社区 → 我 → 备份我的钥匙」里复制的那一串</p><textarea id="ggK" placeholder="https://…#u…"></textarea><div class="gg-e" id="ggErr"></div><button class="gg-b" id="ggGo">登录</button><button class="gg-l" id="ggBack">返回</button>');
        box.querySelector('#ggBack').onclick = start;
        box.querySelector('#ggGo').onclick = function () {
            var t = box.querySelector('#ggK').value.trim(), i = t.indexOf('#'), err = box.querySelector('#ggErr');
            if (i < 0) { err.textContent = '格式不对'; return; }
            if (!official(t.slice(0, i))) { err.textContent = '这把钥匙不是谷雨社区的'; return; }
            var old = { url: st.url, tok: st.tok };
            st.tok = t.slice(i + 1);
            req('/whoami').then(function (j) {
                if (j.status === 'none' || j.status === 'left') { st.url = old.url; st.tok = old.tok; err.textContent = '钥匙不对'; return; }
                API.set(st.tok, st.url);
                try { window.dispatchEvent(new CustomEvent('gy-gate-login', { detail: { url: url(), tok: st.tok } })); } catch (e) {}
                j.status === 'pending' ? pending() : j.status === 'banned' ? blocked('这个账号被封了') : done();
            }).catch(function () { st.url = old.url; st.tok = old.tok; err.textContent = '连不上'; });
        };
    }
    function check() {
        return req('/whoami').then(function (j) {
            if (j.status === 'ok') { st.ok = Date.now(); wr(st); done(); }
            else if (j.status === 'pending') pending();
            else if (j.status === 'banned') blocked('这个账号被封了');
            else { API.clear(); if (API.info && API.info.gate) login(API.info); else done(); }
        });
    }
    function start() {
        if (SKIP) return done();
        var had = !!st.tok;
        if (!had) wait();
        req('/info', null, had ? 15000 : 8000).then(function (i) {
            if (!i || !i.ok) throw new Error('bad');
            API.info = i;
            try { localStorage.setItem('gyGateInfo', JSON.stringify({ name: i.name, gate: i.gate, join: i.join, minVer: i.minVer, at: Date.now() })); } catch (e) {}
            if (i.minVer && VER && VER < i.minVer) return tooOld(i);
            if (!i.gate) return done();
            if (!st.tok) return login(i);
            return check().catch(function () { done(); });
        }).catch(function () { if (had) done(); else offline(); });
    }
    start();
})();
