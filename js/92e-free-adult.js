// =====================================================================
//  🆓 完全免费声明 + 🔞 只给成年人用（302）
//  · 年满 18 岁：第一次打开（还没确认过）先盖一层「谷雨只给成年人用」，点「我已年满 18 岁」才往下走；
//    点「还没满」就不让进（App 里直接退出）。只记「确认过了」这件事，不记生日、不记年龄。
//    开屏登录（js/92）会把「已确认年满 18 岁」一起交给社区服务器；申请审核的话，管理员在申请里能看到。
//  · 完全免费：第一次进来弹一次「谷雨是完全免费的」（以后在 设置 最下面版本号旁边能再看）；
//    要是谷雨被放到了别的网址上（不是 guyu.pw 这些官方的地方），页面顶上一直挂一条提醒，告诉人家这里不是官方的、谷雨不收钱。
//  · 这两样故意不做开关：做成开关，盗版的人一关就没了，未成年人也一关就进来了。
// =====================================================================
(function () {
    'use strict';
    var AK = 'gyAdult', FK = 'gyFree';
    var OFFICIAL = { site: 'guyu.pw', qq: '1106222317' };
    function rd(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
    function wr(k, o) { try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    var isApp = function () { return !!window.plus || /Html5Plus/i.test(navigator.userAgent); };
    var SKIP = function () { return !!navigator.webdriver && !window.__gyAdultForce; };   // 自动化测试不盖（测试里要看就设 __gyAdultForce）

    /* ---------------- 共用样子 ---------------- */
    var CSS = '#gyAdult,#gyFreeCard{position:fixed;inset:0;z-index:2147483640;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font:15px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}'
        + '#gyAdult{background:#f2f2f7;color:#1c1c1e}#gyFreeCard{background:rgba(0,0,0,.45)}'
        + '#gyAdult .c,#gyFreeCard .c{width:100%;max-width:340px;background:#fff;color:#1c1c1e;border-radius:18px;padding:26px 22px 18px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.12)}'
        + '#gyAdult .i,#gyFreeCard .i{font-size:44px;line-height:1;margin-bottom:10px}#gyAdult h1,#gyFreeCard h1{font-size:21px;margin:0 0 8px;font-weight:700}'
        + '#gyAdult p,#gyFreeCard p{margin:0 0 14px;color:#3c3c43;font-size:14px;text-align:left;white-space:pre-wrap}#gyFreeCard p b{color:#1c1c1e}'
        + '#gyAdult button,#gyFreeCard button{display:block;width:100%;border:0;border-radius:12px;padding:12px;font-size:16px;font-family:inherit;cursor:pointer;margin-top:8px}'
        + '#gyAdult .y,#gyFreeCard .y{background:#007aff;color:#fff;font-weight:600}#gyAdult .n{background:transparent;color:#8e8e93;font-size:14px}'
        + '#gyFreeBar{position:fixed;left:0;right:0;top:0;z-index:2147483630;background:#ff3b30;color:#fff;font:13px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding:calc(6px + env(safe-area-inset-top,0px)) 36px 6px 12px;text-align:center;box-sizing:border-box}'
        + '#gyFreeBar a{color:#fff;font-weight:700;text-decoration:underline}#gyFreeBar span.x{position:absolute;right:10px;top:calc(4px + env(safe-area-inset-top,0px));font-size:18px;cursor:pointer;opacity:.85}'
        + '@media (prefers-color-scheme:dark){#gyAdult{background:#000}#gyAdult .c,#gyFreeCard .c{background:#1c1c1e;color:#f2f2f7}#gyAdult p,#gyFreeCard p{color:#d1d1d6}#gyFreeCard p b{color:#fff}}';
    function css() { if (document.getElementById('gyFreeCss')) return; var s = document.createElement('style'); s.id = 'gyFreeCss'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
    function mount(id, html) { css(); var b = document.getElementById(id); if (!b) { b = document.createElement('div'); b.id = id; b.setAttribute('data-gy-nopage', '1'); (document.body || document.documentElement).appendChild(b); } b.innerHTML = html; return b; }

    /* ---------------- 🔞 年满 18 岁 ---------------- */
    function adultOk() { return !!rd(AK).ok; }
    window.gyAdultOk = adultOk;
    function askAdult() {
        if (adultOk() || SKIP()) return false;
        var b = mount('gyAdult', '<div class="c"><div class="i">🔞</div><h1>谷雨只给成年人用</h1>'
            + '<p>谷雨里的角色会陪你聊天、谈恋爱、陪你过日子，这些内容是给<b>年满 18 周岁</b>的人准备的。\n\n还没满 18 岁的话，请先不要用谷雨。</p>'
            + '<button class="y" id="gyAdY">我已年满 18 周岁</button><button class="n" id="gyAdN">我还没满 18 岁</button></div>');
        b.querySelector('#gyAdY').onclick = function () { wr(AK, { ok: Date.now() }); b.remove(); setTimeout(freeOnce, 1500); };
        b.querySelector('#gyAdN').onclick = function () {
            mount('gyAdult', '<div class="c"><div class="i">🌱</div><h1>那先不要用谷雨</h1><p>' + pick(['等你满 18 岁再来，到时候这里还在。', '先去过好现在的日子吧，满 18 岁再来找我们。']) + '</p>'
                + (isApp() ? '<button class="y" id="gyAdQ">退出</button>' : '') + '<button class="n" id="gyAdB">我刚才点错了</button></div>');
            var q = document.getElementById('gyAdQ'); if (q) q.onclick = function () { try { plus.runtime.quit(); } catch (e) {} };
            document.getElementById('gyAdB').onclick = function () { document.getElementById('gyAdult').remove(); askAdult(); };
        };
        return true;
    }

    /* ---------------- 🆓 完全免费 ---------------- */
    function freeHtml() {
        return '<div class="c"><div class="i">🆓</div><h1>谷雨是完全免费的</h1>'
            + '<p><b>谷雨不收任何钱</b>：没有会员、没有激活码、没有付费解锁，以后也不会有。\n'
            + '要是有人卖你谷雨、卖「谷雨会员」「谷雨激活码」「谷雨破解版」，<b>那是骗子</b>，钱别给。\n\n'
            + '你唯一可能花的钱，是 AI 模型的钱——你自己去模型那家（DeepSeek、硅基流动……）充，钱直接给它们，不经过谷雨。\n\n'
            + '<b>只认这两个地方：</b>\n· 网页版：' + OFFICIAL.site + '\n· 安卓安装包、电脑版：' + OFFICIAL.site + '/download（QQ 群 ' + OFFICIAL.qq + ' 的群文件里也有）\n别的地方下载的可能被人改过。</p>'
            + '<button class="y" id="gyFreeOk">知道了</button></div>';
    }
    function showFree() { var b = mount('gyFreeCard', freeHtml()); b.querySelector('#gyFreeOk').onclick = function () { b.remove(); }; b.onclick = function (e) { if (e.target === b) b.remove(); }; }
    window.gyShowFree = showFree;
    function freeOnce() {
        var f = rd(FK); if (f.seen || SKIP()) return;
        if (document.getElementById('gyGate') || document.getElementById('gyAdult')) return setTimeout(freeOnce, 2000);   // 等登录 / 年龄确认完
        f.seen = Date.now(); wr(FK, f); showFree();
    }

    /* ---------------- 不是官方网址：顶上挂一条 ---------------- */
    function hostOk(h) {
        h = String(h || '').toLowerCase();
        return !h || h === 'localhost' || /^127\./.test(h) || /^(\d+\.){3}\d+$/.test(h) || h === 'guyu.pw' || /\.guyu\.pw$/.test(h) || h === 'my-ai-twitter.pages.dev' || /\.my-ai-twitter\.pages\.dev$/.test(h) || h === 'piwp1003.github.io';
    }
    window.__gyFreeHostOk = hostOk;
    function unofficialBar() {
        if (isApp() || !/^https?:$/.test(location.protocol)) return;
        var h = window.__gyHostForTest || location.hostname;
        if (hostOk(h)) return;
        try { if (sessionStorage.getItem('gyFreeBarX')) return; } catch (e) {}
        var b = mount('gyFreeBar', '⚠️ 这里（' + String(h).replace(/[<>&"]/g, '') + '）不是谷雨的官方网址。谷雨<b>完全免费</b>，官方网页版是 <a href="https://' + OFFICIAL.site + '" target="_blank" rel="noopener">' + OFFICIAL.site + '</a>；要是你在这里付了钱，你被骗了。<span class="x" title="这次先不显示">×</span>');
        b.querySelector('.x').onclick = function () { try { sessionStorage.setItem('gyFreeBarX', '1'); } catch (e) {} b.remove(); };
    }

    /* ---------------- 设置最下面：版本号旁边挂一个「完全免费」 ---------------- */
    function addBtn() {
        var el = document.getElementById('setVersionLine'); if (!el || el.querySelector('.gy-freebtn')) return;
        el.insertAdjacentHTML('beforeend', ' <a class="gy-freebtn" style="margin-left:6px;color:#ff9500;cursor:pointer" onclick="gyShowFree()">🆓 完全免费</a>');
    }

    function boot() {
        unofficialBar();
        var asked = askAdult();
        if (!asked) setTimeout(freeOnce, 3500);
        addBtn(); setInterval(addBtn, 3000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
