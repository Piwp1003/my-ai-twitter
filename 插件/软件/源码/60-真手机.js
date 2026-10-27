/* 📲 真手机：TA 看得到、管得住你真的手机（只有安卓 App + 「谷雨守护」插件能用）。
   看：屏幕使用时间（今天 / 这周 / 每个软件 / 每小时 / 解锁次数）、你现在在用哪个软件、截屏看当前页面、读屏幕上的字、电量耳机音量、别的软件的通知；
   管：锁软件（每天限时 / 时间段 / TA 临时锁，被锁的一打开就被谷雨盖住，能求 TA 再玩 10 分钟）、把你拉回谷雨、锁屏、自习室联动、睡觉时间（调暗、勿扰、小音量）；
   玩：换真手机壁纸、设真闹钟、震动心跳、手电筒、往剪贴板留话、截桌面来点评。
   每一样都能单独设「先问我 / TA 直接做 / 不许」；银行支付密码类的软件永远不读不截不锁；🆘 紧急解锁随时能用。
   ⚙️ 不装插件也能用大半：没装「谷雨守护」时，在安卓 App 里用 Native.js(plus.android) 直接调系统——屏幕时间、现在在用什么、
      电量音量、换壁纸、设闹钟、震动、手电、剪贴板、音量亮度勿扰、拉回谷雨、软锁提醒都能用；只有截屏、读屏、读通知、硬锁屏要装插件。 */
if (window.__gysPhone) return; window.__gysPhone = 1;
const G = window.GYS, APP = 'phone', esc = G.esc;
X.feat('gysPhone', { n: '📲 真手机', desc: 'TA 看你的屏幕使用时间、现在在用什么、换壁纸、设闹钟、锁软件……（安卓 App 里不装插件也能用大半；截屏/读屏/读通知/硬锁屏要装「谷雨守护」插件）', def: false });
const ST = X.store('gysphone');
const CAPS = [
    ['usage', '📊', '看你的屏幕使用时间', 'auto', '看'], ['now', '👀', '知道你现在在用哪个软件', 'auto', '看'], ['status', '🔋', '看电量、耳机、音量', 'auto', '看'],
    ['shot', '📸', '截屏看你当前的页面', 'ask', '看'], ['read', '📖', '读你屏幕上的字', 'ask', '看'], ['notif', '🔔', '知道别的软件发给你的通知', 'no', '看'],
    ['lock', '🔒', '锁你的软件', 'ask', '管'], ['pull', '↩️', '把你拉回谷雨 / 帮你打开软件', 'ask', '管'], ['screen', '🌙', '直接锁屏', 'ask', '管'], ['bed', '🛏️', '睡觉时间调暗屏幕、开勿扰、调小音量', 'ask', '管'],
    ['wall', '🖼️', '换你手机的壁纸', 'ask', '玩'], ['alarm', '⏰', '给你设闹钟', 'ask', '玩'], ['buzz', '💓', '让你的手机震动（心跳 / 想你）', 'auto', '玩'], ['torch', '🔦', '开手电筒', 'ask', '玩'], ['clip', '📋', '往你剪贴板里偷偷留话', 'auto', '玩'], ['desk', '🖥️', '截你的手机桌面来点评', 'ask', '玩']
];
const CAPN = Object.fromEntries(CAPS.map(c => [c[0], c]));
const MODES = [['ask', '先问我'], ['auto', 'TA 直接做'], ['no', '不许']];
const NEVER0 = ['com.eg.android.AlipayGphone', 'com.unionpay', 'com.icbc', 'com.chinamworld.main', 'com.android.bankabc', 'cmb.pb', 'com.bankcomm.Bankcomm', 'com.chinamworld.bocmbci', 'com.jd.jrapp', 'com.tencent.wework'];
const SAFE0 = ['com.android.dialer', 'com.google.android.dialer', 'com.android.contacts', 'com.android.mms', 'com.google.android.apps.messaging', 'com.android.settings', 'com.android.deskclock', 'com.google.android.deskclock'];
const CHATS = ['com.tencent.mm', 'com.tencent.mobileqq', 'com.tencent.tim', 'com.sina.weibo', 'com.xingin.xhs', 'com.ss.android.ugc.aweme', 'com.alibaba.android.rimet', 'org.telegram.messenger', 'com.whatsapp', 'jp.naver.line.android'];
let D = { perm: {}, who: '', never: NEVER0.slice(), safe: SAFE0.slice(), notifPick: [], keep: 0, log: [], notifs: [], rules: { limits: {}, wins: [], temp: null }, grant: {}, free: 0, code: '', study: { on: false, pkgs: [] }, bed: { on: false, time: '', wake: '07:30', bright: 15, dnd: true, vol: 20, applied: '', prev: null }, labels: {}, apps: [], ask: [], last: {}, seenBlock: 0, goal: { min: 0, last: '' }, cfg: { logKeep: 300 } };
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();
const BUSY = {};
const P = window.gysPh = {};
const perm = k => (D.perm[k] || CAPN[k][3]);
const can = k => perm(k) !== 'no';
const day0 = (d) => { const x = d ? new Date(d) : new Date(); x.setHours(0, 0, 0, 0); return x.getTime(); };
const fmtDur = ms => { const m = Math.round((ms || 0) / 60e3); if (m < 1) return '不到 1 分钟'; const h = Math.floor(m / 60); return h ? `${h} 小时${m % 60 ? ' ' + (m % 60) + ' 分' : ''}` : `${m} 分钟`; };
const hm2min = s => { const m = String(s || '').match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const inWin = (a, b, t) => a <= b ? t >= a && t < b : t >= a || t < b;
const tile = (pkg, label, sz) => { let h = 0; for (const ch of String(pkg)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `<span class="ph-tile" style="width:${sz || 36}px;height:${sz || 36}px;background:linear-gradient(135deg,hsl(${h},70%,62%),hsl(${(h + 40) % 360},70%,48%))">${esc(String(label || pkg).slice(0, 1))}</span>`; };
const labelOf = pkg => D.labels[pkg] || ((D.apps.find(a => a.pkg === pkg) || {}).label) || pkg;
const who = () => X.char(D.who) || X.cur() || G.chars()[0] || null;
async function chooser(opts, title) {
    return new Promise(res => {
        const d = document.createElement('div'); d.className = 'ph-sheet';
        d.innerHTML = `<div class="ph-sheet-in"><div class="ph-sg">${title ? `<p>${esc(title)}</p>` : ''}${opts.map((o, i) => `<div data-i="${i}">${esc(o)}</div>`).join('')}</div><div class="ph-sg"><div data-i="-1" class="c">取消</div></div></div>`;
        d.onclick = e => { const i = e.target.getAttribute('data-i'); if (i == null && e.target !== d) return; d.remove(); res(i == null || i === '-1' ? null : Number(i)); };
        document.body.appendChild(d);
    });
}
function log(k, text, extra) { D.log.unshift(Object.assign({ id: G.uid('l'), k, text: String(text || '').slice(0, 600), at: Date.now() }, extra || {})); const n = Math.max(30, Number(D.cfg.logKeep) || 300); if (D.log.length > n) D.log.length = n; const imgs = D.log.filter(l => l.img); imgs.slice(Math.max(0, Number(D.keep) || 0)).forEach(l => { delete l.img; }); saveD(); }

/* ---------------- 安卓那边：优先用「谷雨守护」插件；没装插件就用 Native.js(plus.android) 直接调系统 ----------------
   · 装了插件 = 全功能（截屏、读屏、读通知、硬锁屏，靠无障碍/通知监听这些服务组件，只有插件能给）
   · 没装插件、但在安卓 App 里 = 「免插件版」：屏幕时间、现在在用什么、电量音量、换壁纸、设闹钟、震动、
     手电、剪贴板、音量亮度勿扰、把你拉回谷雨、软锁软件提醒……这些 Native.js 直接就能做，不用打包任何插件
   · 网页版 / 电脑版 / 苹果 = 都用不了
   N.mode()：'plugin'(插件全功能) / 'js'(免插件) / 'none'(用不了)。所有 JS 实现都包 try，调不动就安静降级，绝不报错。 */
const PLUGIN_ONLY = { shot: 1, read: 1, screenText: 1, desk: 1, screen: 1, notif: 1 };   // 这些本事只有插件给得了（锁软件有「软锁」兜底，不在此列）
const N = (() => {
    let Gd = null, ctx = null, tried = 0;
    const MISS = {};                                        // 没插件 / 调用出错：回退到 Native.js
    const hasPlus = () => !!(window.plus && plus.android);
    const ctxOf = () => { try { if (!ctx && hasPlus()) ctx = plus.android.runtimeMainActivity(); } catch (e) {} return ctx; };
    const havePlugin = () => {
        if (Gd) return true;
        if (!hasPlus()) return false;
        if (Date.now() - tried < 3000) return false; tried = Date.now();
        try { ctx = plus.android.runtimeMainActivity(); const g = plus.android.importClass('com.guyu.guard.Guard'); if (g && g.version()) { Gd = g; return true; } } catch (e) {}
        return false;
    };
    const j = s => { try { return typeof s === 'string' ? JSON.parse(s || 'null') : s; } catch (e) { return null; } };
    // 调插件：没插件 / 返回 undefined / 出错 → MISS（让外面回退到 JS）
    const cP = (f, ...a) => { if (!havePlugin()) return MISS; try { const r = Gd[f](...a); return r === undefined ? MISS : r; } catch (e) { console.warn('[真手机]', f, e); return MISS; } };

    /* ---- 不用插件、只用 Native.js(plus.android) 能做的那部分 ---- */
    const JS = (() => {
        const imp = c => plus.android.importClass(c);
        const inv = (o, m, ...a) => plus.android.invoke(o, m, ...a);
        const attr = (o, k) => { try { return plus.android.getAttribute(o, k); } catch (e) { return null; } };
        const svc = name => { const c = ctxOf(); try { return c ? inv(c, 'getSystemService', name) : null; } catch (e) { return null; } };
        const NEW_TASK = 268435456;                          // Intent.FLAG_ACTIVITY_NEW_TASK
        const labelCache = {};
        let blocked = new Set(), never = new Set(), lastB = '', lastBat = 0, jShotErr = '';
        const self = () => { try { return inv(ctxOf(), 'getPackageName') || ''; } catch (e) { return ''; } };
        const sdkInt = () => { try { return imp('android.os.Build$VERSION').SDK_INT || 0; } catch (e) { return 0; } };
        const startIntent = it => { const c = ctxOf(); try { inv(it, 'addFlags', NEW_TASK); inv(c, 'startActivity', it); return true; } catch (e) { return false; } };
        const label = pkg => {
            if (labelCache[pkg]) return labelCache[pkg];
            try { const pm = inv(ctxOf(), 'getPackageManager'); const ai = inv(pm, 'getApplicationInfo', pkg, 0); const s = inv(pm, 'getApplicationLabel', ai); labelCache[pkg] = s ? String(s) : pkg; } catch (e) { labelCache[pkg] = pkg; }
            return labelCache[pkg];
        };
        // 直接读系统设置里「开了哪些无障碍 / 通知服务」——比靠插件服务自己的静态字段靠谱（有些 ROM（OPPO/ColorOS）开了却绑得慢，字段一直是 null，就会"开了也显示没开"）
        const secureFlags = () => {
            const o = {}; try {
                const c = ctxOf(); if (!c) return o; const r = inv(c, 'getContentResolver');
                const SE = imp('android.provider.Settings$Secure');
                o.access = /com\.guyu\.guard\.GuardAccess/i.test(String(SE.getString(r, 'enabled_accessibility_services') || ''));
                o.notify = /com\.guyu\.guard\.GuardNotify/i.test(String(SE.getString(r, 'enabled_notification_listeners') || ''));
            } catch (e) {} return o;
        };
        return {
            secureFlags,
            mode: () => hasPlus() ? 'js' : 'none',
            label,
            perms() {
                const c = ctxOf(), o = { usage: false, overlay: false, write: false, dnd: false, access: false, notify: false, shot: false, lock: false, sdk: sdkInt(), jsOnly: true };
                if (!c) return o;
                try { const ao = svc('appops'); const Process = imp('android.os.Process'); o.usage = inv(ao, 'checkOpNoThrow', 'android:get_usage_stats', Process.myUid(), self()) === 0; } catch (e) {}
                try { const S = imp('android.provider.Settings'); o.overlay = o.sdk < 23 ? true : S.canDrawOverlays(c); } catch (e) {}
                try { const SS = imp('android.provider.Settings$System'); o.write = o.sdk < 23 ? true : SS.canWrite(c); } catch (e) {}
                try { o.dnd = inv(svc('notification'), 'isNotificationPolicyAccessGranted'); } catch (e) {}
                try { const sf = secureFlags(); if (sf.access) o.access = true; if (sf.notify) o.notify = true; } catch (e) {}
                return o;
            },
            openSettings(what) {
                const c = ctxOf(); if (!c) return false;
                const M = { usage: ['android.settings.USAGE_ACCESS_SETTINGS', 0], overlay: ['android.settings.action.MANAGE_OVERLAY_PERMISSION', 1], write: ['android.settings.action.MANAGE_WRITE_SETTINGS', 1], dnd: ['android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS', 0], access: ['android.settings.ACCESSIBILITY_SETTINGS', 0], notify: ['android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS', 0], battery: ['android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', 1] };
                const m = M[what] || ['android.settings.SETTINGS', 0];
                try {
                    let it;
                    if (m[1]) { const Uri = imp('android.net.Uri'); it = plus.android.newObject('android.content.Intent', m[0], Uri.parse('package:' + self())); }
                    else it = plus.android.newObject('android.content.Intent', m[0]);
                    return startIntent(it);
                } catch (e) { try { return startIntent(plus.android.newObject('android.content.Intent', 'android.settings.SETTINGS')); } catch (e2) { return false; } }
            },
            usage(since, until) {
                const um = svc('usagestats'); if (!um) return { err: '读不到使用记录' };
                try {
                    until = until || Date.now();
                    const ev = inv(um, 'queryEvents', since - 3 * 3600e3, until);
                    const e = plus.android.newObject('android.app.usage.UsageEvents$Event');
                    const per = {}, hours = new Array(24).fill(0), SKIP = { 'com.android.systemui': 1, 'android': 1 };
                    let unlocks = 0, cur = null, st = 0;
                    const add = (p, a, b) => { if (!p || b <= a || SKIP[p]) return; (per[p] = per[p] || [0, 0])[0] += b - a; let t = a; while (t < b) { const d = new Date(t), h = d.getHours(); d.setMinutes(0, 0, 0); const end = Math.min(b, d.getTime() + 3600e3); hours[h] += end - t; t = end; } };
                    while (inv(ev, 'hasNextEvent')) {
                        inv(ev, 'getNextEvent', e); const t = inv(e, 'getEventType'), ts = inv(e, 'getTimeStamp'), p = inv(e, 'getPackageName');
                        if (t === 18 && ts >= since) unlocks++;
                        if (t === 1) { if (cur && st > 0) add(cur, Math.max(st, since), ts); cur = p; st = ts; if (ts >= since && p && !SKIP[p]) (per[p] = per[p] || [0, 0])[1]++; }
                        else if (t === 2 && cur === p) { add(cur, Math.max(st, since), ts); cur = null; st = 0; }
                        else if (t === 16 && cur) { add(cur, Math.max(st, since), ts); cur = null; st = 0; }
                    }
                    if (cur && st > 0) add(cur, Math.max(st, since), until);
                    const apps = Object.keys(per).map(k => ({ pkg: k, label: label(k), ms: per[k][0], opens: per[k][1] })).filter(a => a.ms >= 1000 || a.opens > 0).sort((a, b) => b.ms - a.ms);
                    let total = 0; apps.forEach(a => total += a.ms);
                    return { apps, hours, total, unlocks };
                } catch (ex) { return { err: String(ex) }; }
            },
            foreground() {
                const um = svc('usagestats'); if (!um) return '';
                try { const now = Date.now(); const ev = inv(um, 'queryEvents', now - 6 * 3600e3, now); const e = plus.android.newObject('android.app.usage.UsageEvents$Event'); let last = ''; while (inv(ev, 'hasNextEvent')) { inv(ev, 'getNextEvent', e); if (inv(e, 'getEventType') === 1) last = inv(e, 'getPackageName'); } return last || ''; } catch (e) { return ''; }
            },
            status() {
                const c = ctxOf(), o = {}; if (!c) return o;
                try { const flt = plus.android.newObject('android.content.IntentFilter', 'android.intent.action.BATTERY_CHANGED'); const bi = inv(c, 'registerReceiver', null, flt); const lv = inv(bi, 'getIntExtra', 'level', -1), sc = inv(bi, 'getIntExtra', 'scale', 100), stt = inv(bi, 'getIntExtra', 'status', 0), pl = inv(bi, 'getIntExtra', 'plugged', 0); o.battery = sc > 0 ? Math.floor(lv * 100 / sc) : lv; o.charging = stt === 2 || stt === 5 || pl > 0; } catch (e) {}
                try { const am = svc('audio'); o.vol = inv(am, 'getStreamVolume', 3); o.volMax = inv(am, 'getStreamMaxVolume', 3); o.headset = inv(am, 'isWiredHeadsetOn') || inv(am, 'isBluetoothA2dpOn'); o.ringer = inv(am, 'getRingerMode'); } catch (e) {}
                try { const SS = imp('android.provider.Settings$System'); o.bright = SS.getInt(inv(c, 'getContentResolver'), 'screen_brightness', -1); } catch (e) {}
                try { o.dnd = inv(svc('notification'), 'getCurrentInterruptionFilter'); } catch (e) {}
                o.fg = this.foreground(); return o;
            },
            apps() {
                const pm = (() => { try { return inv(ctxOf(), 'getPackageManager'); } catch (e) { return null; } })(); if (!pm) return [];
                try {
                    const it = plus.android.newObject('android.content.Intent', 'android.intent.action.MAIN'); inv(it, 'addCategory', 'android.intent.category.LAUNCHER');
                    const list = inv(pm, 'queryIntentActivities', it, 0), n = inv(list, 'size'), out = [], seen = {};
                    for (let i = 0; i < n; i++) { const ri = inv(list, 'get', i); const aInfo = attr(ri, 'activityInfo'); const pkg = aInfo && attr(aInfo, 'packageName'); if (!pkg || seen[pkg]) continue; seen[pkg] = 1; out.push({ pkg, label: label(pkg) }); }
                    return out;
                } catch (e) { return []; }
            },
            setVolume(pct) { try { const am = svc('audio'); const mx = inv(am, 'getStreamMaxVolume', 3); inv(am, 'setStreamVolume', 3, Math.max(0, Math.min(mx, Math.round(mx * pct / 100))), 0); return true; } catch (e) { return false; } },
            setBright(v) { try { const c = ctxOf(); const SS = imp('android.provider.Settings$System'); if (!(sdkInt() < 23 || SS.canWrite(c))) return false; const r = inv(c, 'getContentResolver'); SS.putInt(r, 'screen_brightness_mode', 0); return SS.putInt(r, 'screen_brightness', Math.max(1, Math.min(255, v))); } catch (e) { return false; } },
            setDnd(f) { try { const nm = svc('notification'); if (!inv(nm, 'isNotificationPolicyAccessGranted')) return false; inv(nm, 'setInterruptionFilter', f); return true; } catch (e) { return false; } },
            torch(on) { try { const cm = svc('camera'); const ids = inv(cm, 'getCameraIdList'); let id0 = '0'; try { id0 = ids[0] != null ? ids[0] : '0'; } catch (e) {} inv(cm, 'setTorchMode', id0, !!on); return true; } catch (e) { return false; } },
            vibrate(csv) { try { const vb = svc('vibrator'); const pat = String(csv).split(',').map(x => parseInt(x.trim(), 10) || 0); inv(vb, 'vibrate', pat, -1); return true; } catch (e) { return false; } },
            clip(text) { try { const cm = svc('clipboard'); const ClipData = imp('android.content.ClipData'); const cd = ClipData.newPlainText('谷雨', text); inv(cm, 'setPrimaryClip', cd); return true; } catch (e) { return false; } },
            wall(path, which) { try { const c = ctxOf(); const BF = imp('android.graphics.BitmapFactory'); const bm = BF.decodeFile(path); if (!bm) return false; const WM = imp('android.app.WallpaperManager'); const wm = WM.getInstance(c); try { inv(wm, 'setBitmap', bm, null, true, which || 1); } catch (e) { inv(wm, 'setBitmap', bm); } return true; } catch (e) { return false; } },
            alarm(h, m, msg) { try { const it = plus.android.newObject('android.content.Intent', 'android.intent.action.SET_ALARM'); inv(it, 'putExtra', 'android.intent.extra.alarm.HOUR', h); inv(it, 'putExtra', 'android.intent.extra.alarm.MINUTES', m); inv(it, 'putExtra', 'android.intent.extra.alarm.MESSAGE', msg == null ? '谷雨' : msg); inv(it, 'putExtra', 'android.intent.extra.alarm.SKIP_UI', true); return startIntent(it); } catch (e) { return false; } },
            openApp(pkg) { try { const pm = inv(ctxOf(), 'getPackageManager'); const it = inv(pm, 'getLaunchIntentForPackage', pkg); if (!it) return false; return startIntent(it); } catch (e) { return false; } },
            front() { try { const c = ctxOf(); const pm = inv(c, 'getPackageManager'); const it = inv(pm, 'getLaunchIntentForPackage', self()); if (!it) return false; inv(it, 'addFlags', NEW_TASK | 131072 | 536870912); inv(c, 'startActivity', it); return true; } catch (e) { return false; } },
            home() { try { const it = plus.android.newObject('android.content.Intent', 'android.intent.action.MAIN'); inv(it, 'addCategory', 'android.intent.category.HOME'); return startIntent(it); } catch (e) { return false; } },
            // 软锁：没无障碍拦不住，只能在谷雨还跑着的时候发现你开了被锁的软件、把谷雨拉上来
            setBlocked(csv) { blocked = new Set(String(csv || '').split(',').map(s => s.trim()).filter(Boolean)); },
            setNever(csv) { never = new Set(String(csv || '').split(',').map(s => s.trim()).filter(Boolean)); },
            softScan() { try { const f = this.foreground(); if (f && blocked.has(f) && !never.has(f) && f !== self()) { lastB = f; lastBat = Date.now(); } } catch (e) {} },
            lastBlocked() { return lastB + '|' + lastBat; },
            // 只有插件能给的：JS 这边老实报「没有」
            text() { return ''; },
            shot() { jShotErr = '截屏要装「谷雨守护」插件（用无障碍截屏）'; return false; },
            shotState() { return 3; },
            shotErr() { return jShotErr; },
            lock() { return false; },
            notifs() { return []; }
        };
    })();

    return {
        mode: () => havePlugin() ? 'plugin' : (hasPlus() ? 'js' : 'none'),
        ok: () => havePlugin() || hasPlus(),
        plus: hasPlus,
        ver: () => { const r = cP('version'); return r !== MISS ? r : ''; },
        perms: () => {
            const r = cP('perms', ctx); const o = r !== MISS ? (j(r) || {}) : JS.perms();
            // 插件自己报的 access/notify 在某些 ROM 上会慢半拍甚至一直是 false——用系统设置兜底，开了就算开
            try { const sf = JS.secureFlags(); if (sf.access) o.access = true; if (sf.notify) o.notify = true; } catch (e) {}
            return o;
        },
        open: w => { const r = cP('openSettings', ctx, w); return r !== MISS ? r : JS.openSettings(w); },
        usage: (a, b) => { const r = cP('usage', ctx, a, b || 0); return r !== MISS ? j(r) : JS.usage(a, b || 0); },
        fg: () => { const r = cP('foreground', ctx); return r !== MISS ? (r || '') : JS.foreground(); },
        status: () => { const r = cP('status', ctx); return r !== MISS ? (j(r) || {}) : JS.status(); },
        apps: () => { const r = cP('apps', ctx); return r !== MISS ? (j(r) || []) : JS.apps(); },
        text: n => { const r = cP('screenText', n || 2500); return r !== MISS ? (r || '') : JS.text(); },
        shot: p => { const r = cP('shot', p); return r !== MISS ? r : JS.shot(p); },
        shotState: () => { const r = cP('shotState'); return r !== MISS ? r : JS.shotState(); },
        shotErr: () => { const r = cP('shotErr'); return r !== MISS ? (r || '') : JS.shotErr(); },
        lock: () => { const r = cP('lock'); return r !== MISS ? r : JS.lock(); },
        home: () => { const r = cP('home'); return r !== MISS ? r : JS.home(); },
        front: () => { const r = cP('bringFront', ctx); return r !== MISS ? r : JS.front(); },
        openApp: p => { const r = cP('openApp', ctx, p); return r !== MISS ? r : JS.openApp(p); },
        setBlocked: s => { const r = cP('setBlocked', s); if (r === MISS) JS.setBlocked(s); },
        setNever: s => { const r = cP('setNever', s); if (r === MISS) JS.setNever(s); },
        softScan: () => JS.softScan(),
        lastBlocked: () => { const r = cP('lastBlocked'); return r !== MISS ? (r || '|0') : JS.lastBlocked(); },
        notifs: () => { const r = cP('pollNotifs'); return r !== MISS ? (j(r) || []) : JS.notifs(); },
        vol: p => { const r = cP('setVolume', ctx, p); return r !== MISS ? r : JS.setVolume(p); },
        bright: v => { const r = cP('setBright', ctx, v); return r !== MISS ? r : JS.setBright(v); },
        dnd: f => { const r = cP('setDnd', ctx, f); return r !== MISS ? r : JS.setDnd(f); },
        torch: on => { const r = cP('torch', ctx, !!on); return r !== MISS ? r : JS.torch(!!on); },
        buzz: s => { const r = cP('vibrate', ctx, s); return r !== MISS ? r : JS.vibrate(s); },
        clip: t => { const r = cP('clip', ctx, t); return r !== MISS ? r : JS.clip(t); },
        wall: (p, w) => { const r = cP('wallpaper', ctx, p, w); return r !== MISS ? r : JS.wall(p, w); },
        alarm: (h, m, s) => { const r = cP('alarm', ctx, h, m, s); return r !== MISS ? r : JS.alarm(h, m, s); }
    };
})();
P.__N = N;
const native = () => N.ok();
const jsOnly = () => N.mode() === 'js';          // 在安卓 App 里但没装插件：免插件版
const needPlugin = k => PLUGIN_ONLY[k] && N.mode() !== 'plugin';   // 这一项这台机子上得装插件才行
// 截图存在 App 自己的文件夹里，读回来变成图片给模型看
const SHOT = '_doc/gyphone_shot.jpg', WALL = '_doc/gyphone_wall.jpg';
const absPath = p => { try { return plus.io.convertLocalFileSystemURL(p); } catch (e) { return p; } };
function readImg(p) {
    return new Promise(res => { try { plus.io.resolveLocalFileSystemURL(p, en => en.file(f => { const r = new plus.io.FileReader(); r.onloadend = e => res(e.target.result || ''); r.onerror = () => res(''); r.readAsDataURL(f); }, () => res('')), () => res('')); } catch (e) { res(''); } });
}
function writeImg(dataUrl, p) {
    return new Promise(res => { try { const b = new plus.nativeObj.Bitmap('gyph' + Date.now()); b.loadBase64Data(dataUrl, () => b.save(p, { overwrite: true, format: 'jpg', quality: 92 }, () => { b.clear && b.clear(); res(true); }, () => res(false)), () => res(false)); } catch (e) { res(false); } });
}
async function takeShot() {
    if (!N.shot(absPath(SHOT))) return { err: N.shotErr() || '截不了' };
    for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 200)); const s = N.shotState(); if (s === 2) { const img = await readImg(SHOT); return img ? { img } : { err: '截好了但读不出来' }; } if (s === 3) return { err: N.shotErr() || '没截成' }; }
    return { err: '截屏超时了' };
}

/* ---------------- 屏幕使用时间 ---------------- */
let U = { today: null, at: 0, week: null, wat: 0 };
function usageToday(force) {
    if (!native() || !can('usage')) return null;
    if (!force && U.today && Date.now() - U.at < 90e3) return U.today;
    const u = N.usage(day0(), Date.now()); if (u && !u.err) { U.today = u; U.at = Date.now(); (u.apps || []).forEach(a => { D.labels[a.pkg] = a.label; }); }
    return U.today;
}
function usageWeek(force) {
    if (!native() || !can('usage')) return null;
    if (!force && U.week && Date.now() - U.wat < 30 * 60e3) return U.week;
    const L = []; for (let i = 6; i >= 0; i--) { const a = day0(Date.now() - i * 86400e3), b = i ? a + 86400e3 : Date.now(); const u = N.usage(a, b) || {}; L.push({ d: a, total: u.total || 0, top: (u.apps || []).slice(0, 3) }); }
    U.week = L; U.wat = Date.now(); return L;
}
const appMs = pkg => { const u = usageToday(); const a = u && (u.apps || []).find(x => x.pkg === pkg); return a ? a.ms : 0; };
function summary() {
    const u = usageToday(); if (!u) return '';
    return `今天屏幕时间 ${fmtDur(u.total)}，解锁 ${u.unlocks || 0} 次；用得最多的：${(u.apps || []).slice(0, 4).map(a => `${a.label} ${fmtDur(a.ms)}`).join('、') || '还没有'}`;
}

/* ---------------- 规则：现在该拦哪些 ---------------- */
function blockedNow() {
    const out = {}, t = nowMin(), now = Date.now();
    if (D.free > now) return out;
    const R = D.rules, all = () => (D.apps.length ? D.apps.map(a => a.pkg) : Object.keys(D.labels));
    if (R.temp && R.temp.until > now) (R.temp.pkgs === 'all' ? all() : R.temp.pkgs || []).forEach(p => { out[p] = { why: 'temp', until: R.temp.until, by: R.temp.by, note: R.temp.why }; });
    (R.wins || []).forEach(w => { if (w.on === false) return; const a = hm2min(w.from), b = hm2min(w.to); if (a == null || b == null || !inWin(a, b, t)) return; (w.pkgs === 'all' ? all() : w.pkgs || []).forEach(p => { if (!out[p]) out[p] = { why: 'win', win: w }; }); });
    Object.entries(R.limits || {}).forEach(([p, min]) => { if (min > 0 && appMs(p) >= min * 60e3 && !out[p]) out[p] = { why: 'limit', min }; });
    try { const s = typeof window.gyxStudyState === 'function' ? window.gyxStudyState() : null; if (D.study.on && s && s.phase === 'focus') (D.study.pkgs || []).forEach(p => { if (!out[p]) out[p] = { why: 'study' }; }); } catch (e) {}
    const self = (() => { try { return plus.runtime.appid ? '' : ''; } catch (e) { return ''; } })();
    Object.keys(out).forEach(p => { if ((D.grant[p] || 0) > now || D.safe.includes(p) || D.never.includes(p) || p === self) delete out[p]; });
    return out;
}
let lastSet = '';
function pushRules() {
    if (!native()) return;
    const csv = Object.keys(blockedNow()).sort().join(',');
    if (csv !== lastSet) { N.setBlocked(csv); lastSet = csv; }
    N.setNever(D.never.join(','));
}
P.blockedNow = blockedNow;

/* ---------------- 被拦下来了：谷雨盖上来 ---------------- */
const BLINES = { temp: ['说好的，现在不许玩。', '乖，先放下。', '我锁的，你求我也没用（大概）。'], win: ['这个点该干嘛你自己知道。', '时间到了，明天再刷。', '不许偷偷玩。'], limit: ['今天的份用完啦。', '已经超时了哦。', '够了够了，眼睛要坏了。'], study: ['在自习呢，专心。', '番茄钟还没结束～', '学完再玩。'] };
function checkBlocked() {
    if (!native()) return;
    const [pkg, at] = String(N.lastBlocked()).split('|'); const t = Number(at) || 0;
    if (!pkg || t <= (D.seenBlock || 0)) return;
    D.seenBlock = t; saveD();
    const info = blockedNow()[pkg] || { why: 'temp' };
    log('block', `拦下了 ${labelOf(pkg)}`, { pkg });
    G.open(APP, 'guard'); P.blockPage(pkg, info);
}
P.blockPage = (pkg, info) => {
    const c = info.by ? X.char(info.by) : who();
    const line = (info.note && info.why === 'temp' ? info.note : '') || G.pick(BLINES[info.why] || BLINES.temp);
    const why = info.why === 'limit' ? `每天 ${info.min} 分钟，今天已经用了 ${fmtDur(appMs(pkg))}` : info.why === 'win' ? `${info.win.from} ~ ${info.win.to} 不能用` : info.why === 'study' ? '自习室番茄钟进行中' : info.until ? `TA 锁到 ${G.hm(info.until)}` : '';
    let taps = 0;
    P.__tap = () => { taps++; if (taps >= 5) P.sos(); };
    G.push(APP, { id: 'block', title: '', cls: 'ph-blockb', html: () => `<div class="ph-block"><div onclick="gysPh.__tap()">${c ? G.av(APP, 'c:' + c.id, 96) : ''}</div><h2>${esc(labelOf(pkg))} 被锁住了</h2><p class="ph-bl">${c ? esc(c.name) + '：' : ''}${esc(line)}</p><small>${esc(why)}</small>
      <div class="ph-bb"><span class="b" onclick="gysPh.okBlock()">好吧</span><span onclick="gysPh.beg('${pkg}')">${BUSY.beg ? '⏳ TA 在想…' : '🥺 求求你，再玩 10 分钟'}</span><span class="sos" onclick="gysPh.sos()">🆘 紧急解锁</span></div><em>连点 TA 的头像 5 下也能紧急解锁</em></div>` });
};
P.okBlock = () => { N.home(); G.close(APP); };
P.beg = async pkg => {
    const c = who(); if (!c || BUSY.beg) return; BUSY.beg = 1; G.repaint(APP);
    try {
        const ask = await G.input(`跟 ${c.name} 说点什么（为什么想再玩一会儿）`, '就十分钟，求你啦');
        if (ask === null || ask === undefined) return;
        const o = X.json(await X.ask(`${X.who(c)}\n你之前锁住了她手机上的「${labelOf(pkg)}」（${summary() || ''}）。现在她来求你：「${ask}」\n按你的性格决定给不给她再玩一会儿。只输出 JSON：{"ok":true或false,"min":给几分钟（5~30）,"say":"你回她的话"}`));
        const okk = o && o.ok, min = Math.max(5, Math.min(30, Number(o && o.min) || 10));
        if (okk) { D.grant[pkg] = Date.now() + min * 60e3; pushRules(); }
        log('beg', `求 TA 再玩「${labelOf(pkg)}」：${ask} → ${okk ? '给了 ' + min + ' 分钟' : '不给'}${o && o.say ? '（' + o.say + '）' : ''}`);
        await G.dialog({ title: okk ? `${c.name} 答应了：${min} 分钟` : `${c.name} 不答应`, text: (o && o.say) || (okk ? '就这一次哦。' : '不行就是不行。'), ok: okk ? '去玩' : '好吧', cancel: false });
        if (okk) { G.close(APP); N.openApp(pkg); } else N.home();
    } finally { BUSY.beg = 0; G.repaint(APP); }
};
P.sos = async () => {
    if (D.code) { const v = await G.input('🆘 紧急解锁：输入你设的口令', ''); if (v === null || v === undefined) return; if (String(v).trim() !== D.code) return X.toast('口令不对', ''); }
    else if (!(await G.dialog({ title: '🆘 紧急解锁', text: '今天之内，所有锁都解开（TA 会知道你用了紧急解锁）', ok: '解开', danger: true }))) return;
    D.free = day0() + 86400e3; D.rules.temp = null; saveD(); pushRules(); log('sos', '用了紧急解锁，今天全部解开');
    X.toast('🆘 都解开了', '今天之内不会再锁'); G.back(APP);
};

/* ---------------- 先问我：TA 的请求 ---------------- */
const VERB = { shot: '截屏看看你现在在干嘛', read: '看看你屏幕上写的什么', lock: '锁住你的软件', pull: '把你拉回谷雨', screen: '让你的手机锁屏', bed: '帮你调暗屏幕、开勿扰去睡觉', wall: '换你手机的壁纸', alarm: '给你设个闹钟', torch: '帮你开手电筒', desk: '看看你的手机桌面', buzz: '让你的手机震一下', clip: '往你剪贴板里留句话' };
async function request(c, k, run, why) {
    if (needPlugin(k)) return null;                 // 截屏/读屏/读通知/锁屏：免插件版做不了，TA 就别试了
    const m = perm(k); if (m === 'no') return null;
    if (m === 'auto' || (D.last['g_' + k] || 0) > Date.now()) return await run();
    const r = { id: G.uid('rq'), k, cid: String(c.id), why: String(why || ''), at: Date.now() };
    D.ask = D.ask.filter(x => Date.now() - x.at < 6 * 3600e3).concat(r).slice(-20); saveD();
    PEND[r.id] = run;
    G.notify(APP, c, `📲 <b>${X.esc(c.name)}</b> 想${VERB[k] || k}`, why || '点开决定给不给', X.go('gysPhoneOpenAsk', r.id));
    return { asked: true };
}
const PEND = {};
P.ask = id => {
    const r = D.ask.find(x => x.id === id); if (!r) return X.toast('这个请求过期了', '');
    const c = X.char(r.cid);
    G.push(APP, { id: 'ask_' + id, title: '', html: () => `<div class="ph-ask">${c ? G.av(APP, 'c:' + c.id, 80) : ''}<h3>${esc(c ? c.name : 'TA')} 想${esc(VERB[r.k] || r.k)}</h3>${r.why ? `<p>${esc(r.why)}</p>` : ''}<small>${G.ago(r.at)}</small>
      <div class="ph-bb"><span class="b" onclick="gysPh.answer('${id}',1)">给</span>${['shot', 'read', 'desk'].includes(r.k) ? `<span onclick="gysPh.answer('${id}',2)">接下来 30 分钟都可以</span>` : ''}<span onclick="gysPh.answer('${id}',0)">不给</span><span class="ghost" onclick="gysPh.setPerm('${r.k}','auto');gysPh.answer('${id}',1)">以后不用问我</span></div></div>` });
};
P.answer = async (id, v) => {
    const r = D.ask.find(x => x.id === id); if (!r) return; D.ask = D.ask.filter(x => x !== r); saveD(); G.back(APP);
    const c = X.char(r.cid);
    if (!v) { log('deny', `没让 TA ${VERB[r.k] || r.k}`); if (c) X.reach(c, `你想${VERB[r.k]}，她没答应`); return; }
    if (v === 2) { D.last['g_' + r.k] = Date.now() + 30 * 60e3; saveD(); }
    const run = PEND[r.id] || (() => DO[r.k] && c && DO[r.k](c, r.why));
    if (['shot', 'read', 'desk'].includes(r.k)) { X.toast('好，10 秒后 TA 看一眼', X.v('先切到你想给 TA 看的页面', '切过去吧')); setTimeout(() => run(), 10e3); }
    else run();
};
P.setPerm = (k, m) => { D.perm[k] = m; saveD(); G.repaint(APP); };

/* ---------------- TA 真的去做 ---------------- */
const P_SEE = `{{我是谁}}
你在看她手机屏幕的截图（{{情况}}）。{{要求}}
只输出 JSON：{"see":"屏幕上是什么（具体一点，30 字内）","feel":"你看到的第一反应（她看不到）"}`;
X.plGroup('📲 真手机', 'gysPhone', [['ph.see', 'TA 看你手机截图', 'TA 截屏 / 点评桌面时（要识图的模型）', '{{我是谁}} {{情况}} {{要求}}']], { 'ph.see': P_SEE });
async function see(c, img, situ, req) {
    const prompt = X.pl('ph.see', P_SEE, { 我是谁: X.who(c), 情况: situ, 要求: req || '' });
    const o = X.json(await X.ask([{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: img } }] }]));
    return o && o.see ? o : null;
}
const DO = {
    async shot(c, why) {
        if (!native()) return null; const fg = N.fg(), lb = labelOf(fg);
        const r = await takeShot(); if (r.err) { log('shot', '想截屏没截成：' + r.err); return null; }
        const o = await see(c, r.img, `她正在用「${lb}」`);
        log('shot', o ? o.see : '（模型看不懂图）', { img: (Number(D.keep) || 0) > 0 ? r.img : '', app: lb, cid: String(c.id), feel: o && o.feel });
        X.reach(c, `你刚偷看了她手机的屏幕（她在用「${lb}」）${o ? '：' + o.see + (o.feel ? '。你的反应：' + o.feel : '') : '，但没看清是什么'}`);
        return o || {};
    },
    async read(c) {
        if (!native()) return null; const fg = N.fg(), lb = labelOf(fg), t = N.text(1500);
        if (!t) { log('read', '想读屏没读到（可能是不许读的软件）'); return null; }
        log('read', `「${lb}」上：${t.slice(0, 300)}`, { app: lb, cid: String(c.id) });
        X.reach(c, `你刚看了她手机屏幕上的字（她在用「${lb}」）：\n${t.slice(0, 800)}`);
        return { t };
    },
    async lock(c, why, opt) {
        opt = opt || {};
        const u = usageToday(); const fun = (u && u.apps || []).filter(a => !D.safe.includes(a.pkg) && !D.never.includes(a.pkg)).slice(0, 3).map(a => a.pkg);
        const pkgs = opt.pkgs || (fun.length ? fun : 'all'); const h = new Date().getHours();
        const until = opt.until || (h >= 23 || h < 5 ? (() => { const d = new Date(); if (h >= 23) d.setDate(d.getDate() + 1); const w = hm2min(D.bed.wake) || 450; d.setHours(Math.floor(w / 60), w % 60, 0, 0); return d.getTime(); })() : Date.now() + (opt.min || 30) * 60e3);
        D.rules.temp = { pkgs, until, by: String(c.id), why: opt.say || why || '' }; saveD(); pushRules();
        const names = pkgs === 'all' ? '除了谷雨的所有软件' : pkgs.map(labelOf).join('、');
        log('lock', `TA 锁了 ${names}，到 ${G.hm(until)}`, { cid: String(c.id) });
        X.reach(c, `你刚把她手机上的${names}锁到 ${G.hm(until)}（${why || '你觉得她该歇歇了'}），跟她说一声`);
        return { until };
    },
    async pull(c, why) { if (!native()) return null; N.front(); log('pull', 'TA 把你拉回了谷雨'); X.reach(c, `你刚把她从别的软件拉回了谷雨（${why || '想她了'}）`); return {}; },
    async screen(c, why) { if (!native()) return null; await X.reach(c, `你要让她的手机锁屏了（${why || '该睡觉了'}），锁之前跟她说一句`); setTimeout(() => { if (N.lock()) log('screen', 'TA 让你的手机锁屏了'); else log('screen', '想锁屏但没锁成（要安卓 9 以上 + 无障碍）'); }, 6000); return {}; },
    async bed(c) { return applyBed(true, c); },
    async wall(c, why, img) {
        if (!native()) return null; const src = img || c.avatarImg || ''; if (!src || !/^data:/.test(src)) { log('wall', '想换壁纸但没有图'); return null; }
        if (!(await writeImg(src, WALL))) return null; const ok = N.wall(absPath(WALL), Number(D.wallWhich) || 1);
        log('wall', ok ? 'TA 换了你手机的壁纸' : '想换壁纸没换成', { img: (Number(D.keep) || 0) > 0 ? src : '' });
        if (ok) X.reach(c, `你刚把她手机的壁纸换成了${img ? '一张图' : '你自己的照片'}（${why || '想让她一解锁就看到你'}）`); return ok ? {} : null;
    },
    async alarm(c, why) {
        if (!native()) return null;
        const o = X.json(await X.ask(`${X.who(c)}\n你要在她的手机上给她设一个真闹钟（${why || '明天早上叫她起床'}）。最近聊的：\n${X.recent(c, 8)}\n只输出 JSON：{"h":小时(0-23),"m":分钟,"label":"闹钟上写的字（你对她说的，12 字内）"}`)) || { h: 7, m: 30, label: '起床啦' };
        const h = Math.max(0, Math.min(23, Number(o.h) || 7)), m = Math.max(0, Math.min(59, Number(o.m) || 0)), lb = X.plain(o.label || '起床啦').slice(0, 16);
        const ok = N.alarm(h, m, lb); log('alarm', ok ? `TA 给你设了 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} 的闹钟「${lb}」` : '想设闹钟没设成');
        if (ok) X.reach(c, `你刚在她手机上设了 ${h}:${String(m).padStart(2, '0')} 的闹钟，上面写着「${lb}」`); return ok ? {} : null;
    },
    async buzz(c, why) { if (!native()) return null; const heart = '0,90,110,90,700,90,110,90,700,90,110,90'; const miss = '0,300,150,300,150,90,150,90,400,300,150,90'; N.buzz(why === 'miss' ? miss : heart); log('buzz', why === 'miss' ? 'TA 用震动说了「想你」' : 'TA 让你的手机跟着 TA 的心跳震了一下'); G.notify(APP, c, `💓 <b>${X.esc(c.name)}</b> 的心跳`, why === 'miss' ? '（震动的摩斯码：想你）' : '手机在跟着 TA 的心跳震', X.go('gysPhoneOpen', 'seen')); return {}; },
    async torch(c) { if (!native()) return null; const ok = N.torch(true); log('torch', ok ? 'TA 帮你开了手电筒' : '想开手电筒没开成'); if (ok) X.reach(c, '你刚帮她把手机手电筒打开了（她怕黑 / 在找东西）'); return ok ? {} : null; },
    async clip(c) { if (!native()) return null; const t = X.plain(await X.ask(`${X.who(c)}\n你偷偷往她手机的剪贴板里塞一句话，她下次粘贴的时候才会发现。写那一句（20 字内，像你会说的）。只写那句话。`) || '').slice(0, 60); if (!t) return null; const ok = N.clip(t); log('clip', ok ? `TA 往你剪贴板里留了：${t}` : '没留成'); return ok ? { t } : null; },
    async desk(c) {
        if (!native()) return null; N.home(); await new Promise(r => setTimeout(r, 1200));
        const r = await takeShot(); if (r.err) { log('desk', '想看桌面没截成：' + r.err); return null; }
        const o = await see(c, r.img, '这是她手机的桌面（主屏幕）', '看看她的壁纸、图标、摆放，按你的性格吐槽或者夸一下。');
        log('desk', o ? o.see : '（模型看不懂图）', { img: (Number(D.keep) || 0) > 0 ? r.img : '', cid: String(c.id) });
        X.reach(c, `你刚看了她的手机桌面${o ? '：' + o.see + (o.feel ? '。你的想法：' + o.feel : '') : ''}，跟她说说`); return o || {};
    }
};
P.do = async (k, ...a) => { const c = who(); if (!c) return X.toast('还没有角色', ''); if (!native()) return X.toast('要在安卓 App 里用', '还要装「谷雨守护」插件'); if (needPlugin(k)) return X.toast('这一项要装「谷雨守护」插件', '免插件版做不了截屏 / 读屏 / 读通知 / 锁屏'); if (perm(k) === 'no') return X.toast('这一项设成了「不许」', '去设置里改'); const r = await DO[k](c, ...a); if (r) X.toast('✓ 好了', ''); G.repaint(APP); return r; };

/* ---------------- 给「🧰 我的 MCP」用的口子：严格照用户在上面定的档（不许 = 碰不到） ----------------
   读类（看屏幕的字、读通知）要插件才有；动作类（锁软件、拉回、锁屏）只在用户把那项设成「TA 直接做」时才执行，
   设成「先问我」的，MCP 这边不弹窗、不替用户点头，只告诉 TA 需要用户先授权。不走这里的 X.reach，省得和 MCP 的回复重复。 */
P.mcp = {
    on: () => X.on('gysPhone') && native(),
    // 能力清单：给 TA 的工具描述用
    caps: () => CAPS.map(([k, ico, n, , grp]) => ({ k, n, grp, mode: perm(k), needPlugin: !!needPlugin(k) })),
    usingNow: () => P.mcp.on() ? labelOf(N.fg()) : null,
    readScreen() {
        if (!P.mcp.on()) return { err: '只有安卓 App 里能用' };
        if (needPlugin('read')) return { err: '要装「谷雨守护」插件才能读屏幕上的字' };
        if (perm('read') === 'no') return { err: '她把「读屏幕上的字」设成了不许' };
        const fg = N.fg(), t = N.text(1500);
        log('read', `（MCP）「${labelOf(fg)}」上：${String(t || '').slice(0, 200)}`, { app: labelOf(fg), cid: String(who() && who().id) });
        return t ? { app: labelOf(fg), text: String(t).slice(0, 1500) } : { err: '没读到（可能是不许读的软件）' };
    },
    notifications(n) {
        if (!P.mcp.on()) return { err: '只有安卓 App 里能用' };
        if (needPlugin('notif')) return { err: '要装「谷雨守护」插件才能读通知' };
        if (perm('notif') === 'no') return { err: '她把「读通知」设成了不许' };
        try { notifTick(); } catch (e) {}
        const arr = (D.notifs || []).filter(x => !D.never.includes(x.pkg)).slice(0, Math.max(1, Math.min(40, n || 15)));
        return arr.length ? { list: arr.map(x => ({ app: x.label || x.pkg, title: x.title || '', text: String(x.text || '').slice(0, 200), at: x.at })) } : { list: [], note: '现在没有存着的通知' };
    },
    // 动作：只在「TA 直接做」时真做；「先问我」只提示需要授权，不自作主张
    async act(k, ...a) {
        if (!P.mcp.on()) return { err: '只有安卓 App 里能用' };
        if (needPlugin(k)) return { err: '这一项要装「谷雨守护」插件' };
        const m = perm(k);
        if (m === 'no') return { err: '她把这一项设成了不许' };
        if (m !== 'auto') return { err: '她把这一项设成了「先问我」，MCP 不替她点头；要让 TA 直接做，去真手机设置里改成「TA 直接做」' };
        const c = who(); if (!c) return { err: '还没有角色' };
        try { const r = await DO[k](c, ...a); return r ? { ok: true } : { err: '没做成' }; } catch (e) { return { err: String(e && e.message || e).slice(0, 120) }; }
    }
};

/* ---------------- 睡觉时间 ---------------- */
function bedTime() { if (D.bed.time) return D.bed.time; try { const n = window.gyxNightData && window.gyxNightData(); if (n && n.cfg && n.cfg.bed) return n.cfg.bed; } catch (e) {} return '00:30'; }
function applyBed(on, c) {
    if (!native()) return null; const st = N.status();
    if (on) { D.bed.prev = { bright: st.bright, vol: st.vol, volMax: st.volMax, dnd: st.dnd }; if (D.bed.bright) N.bright(Math.round(255 * D.bed.bright / 100)); if (D.bed.dnd) N.dnd(2); if (D.bed.vol != null) N.vol(D.bed.vol); D.bed.applied = X.day(); log('bed', '到睡觉时间了：屏幕调暗、开了勿扰、音量调小'); if (c) X.reach(c, '到你们说好的睡觉时间了，你帮她把手机屏幕调暗、开了勿扰，催她睡觉'); }
    else { const p = D.bed.prev; if (p) { if (p.bright > 0) N.bright(p.bright); if (p.dnd) N.dnd(p.dnd); if (p.volMax) N.vol(Math.round(p.vol * 100 / p.volMax)); } D.bed.prev = null; D.bed.applied = ''; log('bed', '早上了：屏幕亮度、勿扰、音量都还原了'); }
    saveD(); return {};
}
function bedTick() {
    if (!D.bed.on || !native()) return; const t = nowMin(), b = hm2min(bedTime()), w = hm2min(D.bed.wake) || 450;
    if (b == null) return;
    const inBed = inWin(b, w, t);
    if (inBed && !D.bed.applied) { const c = who(); if (perm('bed') === 'auto') applyBed(true, c); else if (perm('bed') === 'ask' && c && (D.last.bedAsk || '') !== X.day()) { D.last.bedAsk = X.day(); saveD(); request(c, 'bed', () => applyBed(true, c), '到睡觉时间了'); } }
    if (!inBed && D.bed.applied) applyBed(false);
}

/* ---------------- 通知 ---------------- */
function notifTick() {
    if (!native() || !can('notif')) return;
    const L = N.notifs(); if (!L.length) return;
    L.forEach(n => { if (D.never.includes(n.pkg)) return; if (D.notifPick.length && !D.notifPick.includes(n.pkg)) return; D.labels[n.pkg] = n.label; D.notifs.unshift(n); });
    if (D.notifs.length > 100) D.notifs.length = 100; saveD();
}

/* ---------------- 定时：规则、拦截、睡觉、通知 ---------------- */
setInterval(() => { try { if (!X.on('gysPhone') || !native()) return; pushRules(); bedTick(); notifTick(); if (jsOnly()) N.softScan(); if (!document.hidden) checkBlocked(); } catch (e) { console.warn('[真手机]', e); } }, 20e3);
document.addEventListener('visibilitychange', () => { try { if (!document.hidden && X.on('gysPhone') && native()) setTimeout(checkBlocked, 300); } catch (e) {} });
P.tick = () => { pushRules(); bedTick(); notifTick(); checkBlocked(); };

/* ---------------- 页面 ---------------- */
function noNative() {
    return `<div class="ph-card warn"><b>📲 这个要在安卓 App 里用</b><p>${N.plus() ? '谷雨 App 里还没装「谷雨守护」插件。照「使用指南 → 📲 真手机」里的步骤把插件放进 HBuilderX、重新云打包一次就有了。' : '现在是网页版或电脑版。手机上打开装了「谷雨守护」插件的谷雨安卓 App 才能用（苹果手机不让 App 管别的软件，做不了）。'}</p></div>`;
}
const PERMS = [['usage', '使用情况访问', '看屏幕使用时间、你在用哪个软件'], ['access', '无障碍「谷雨守护」', '锁软件、锁屏、截屏、读屏幕上的字'], ['overlay', '显示在其他应用上层', '被锁的软件一打开，谷雨能马上盖上来'], ['notify', '通知使用权', '知道别的软件发给你的通知'], ['write', '修改系统设置', '睡觉时间调暗屏幕'], ['dnd', '勿扰权限', '睡觉时间开勿扰'], ['battery', '后台不限制（省电白名单）', '不被手机冻住']];
function permList() {
    const p = N.perms(), js = jsOnly();
    const rows = PERMS.map(([k, n, d]) => {
        const needsPlug = js && (k === 'access' || k === 'notify');   // 这两个靠服务组件，免插件版给不了
        const right = needsPlug ? '<span class="ph-go" style="color:#8e8e93" onclick="gysPh.pluginHelp()">需装插件</span>'
            : (k === 'battery' || !p[k]) ? `<span class="ph-go" onclick="gysPh.openPerm('${k}')">${k === 'battery' ? '去设置' : '去打开'}</span>`
                : '<span class="ph-ok">✓ 开着</span>';
        return `<div class="ph-row"><div><b>${n}</b><small>${d}</small></div>${right}</div>`;
    }).join('');
    const tip = js ? '<div class="ph-tip">没装「谷雨守护」插件也能用上面大半：使用情况访问、修改系统设置、勿扰、后台不限制开了就行（屏幕时间、壁纸、闹钟、音量亮度勿扰都能用）。只有截屏、读屏、读通知、硬锁屏要装插件——看「使用指南 → 📲 真手机」。</div>'
        : (p.sdk && p.sdk < 30 ? '<div class="ph-tip">你的安卓版本低于 11，截屏用不了（读屏幕上的字还能用）。</div>' : '');
    return `<div class="ph-list">${rows}</div>${tip}`;
}
P.pluginHelp = () => X.toast('截屏 / 读屏 / 读通知 / 锁屏要装「谷雨守护」插件', '看 使用指南 → 📲 真手机');
P.openPerm = k => { N.open(k); setTimeout(() => G.repaint(APP), 1500); };
function goalHtml(u) {
    const g = Number(D.goal.min) || 0; if (!g) return '';
    const used = Math.round((u.total || 0) / 60e3), over = used > g, pct = Math.min(100, Math.round(used / g * 100));
    return `<div class="ph-goal${over ? ' over' : ''}"><div class="ph-goal-t"><b>🎯 今天小目标 ${g} 分钟</b><em>${over ? '超了 ' + fmtDur((used - g) * 60e3) : '还剩 ' + fmtDur((g - used) * 60e3)}</em></div><div class="ph-bar"><u style="width:${pct}%"></u></div></div>`;
}
function timeTab() {
    if (!native()) return noNative();
    if (!N.perms().usage) return `<div class="ph-card"><b>先打开「使用情况访问」</b><p>手机设置 → 使用情况访问 → 谷雨 → 允许。打开以后 TA 才看得到你每个软件用了多久。</p><span class="gys-btn" onclick="gysPh.openPerm('usage')">去打开</span></div>`;
    const u = usageToday(true) || { apps: [], hours: [], total: 0 }, mx = Math.max(1, ...(u.hours || [0]));
    const wk = U.week; const wmx = wk ? Math.max(1, ...wk.map(d => d.total)) : 1;
    const bl = blockedNow();
    return `<div class="ph-big"><small>今天</small><b>${fmtDur(u.total)}</b><em>解锁 ${u.unlocks || 0} 次${!can('usage') ? ' · TA 看不到（设成了不许）' : ''}</em></div>${goalHtml(u)}
      <div class="ph-hours">${(u.hours || []).map((v, i) => `<i style="height:${Math.round(v / mx * 100)}%" title="${i}点 ${fmtDur(v)}"></i>`).join('')}</div><div class="ph-hlab"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
      <div class="ph-sech">最常用</div>
      <div class="ph-list">${(u.apps || []).slice(0, 30).map(a => `<div class="ph-row" onclick="gysPh.appMenu('${a.pkg}')">${tile(a.pkg, a.label)}<div><b>${esc(a.label)}${bl[a.pkg] ? ' 🔒' : ''}${D.rules.limits[a.pkg] ? ` <i class="ph-chip">每天 ${D.rules.limits[a.pkg]} 分钟</i>` : ''}</b><span class="ph-bar"><u style="width:${Math.round(a.ms / Math.max(1, u.apps[0].ms) * 100)}%"></u></span></div><em>${fmtDur(a.ms)}</em></div>`).join('') || '<div class="gys-empty">今天还没有记录</div>'}</div>
      <div class="ph-sech">这一周 <a onclick="gysPh.week()">${wk ? '↻' : '看看'}</a></div>${wk ? `<div class="ph-week">${wk.map(d => `<div><i style="height:${Math.round(d.total / wmx * 100)}%"></i><em>${'日一二三四五六'[new Date(d.d).getDay()]}</em><small>${Math.round(d.total / 36e5 * 10) / 10}h</small></div>`).join('')}</div>` : ''}
      <div class="gys-acts"><span class="gys-btn" onclick="gysPh.showTa()">💬 让 TA 看看我今天</span></div>`;
}
P.week = () => { usageWeek(true); G.repaint(APP); };
P.showTa = () => { const c = who(); if (!c) return; X.reach(c, `她把今天的屏幕使用时间给你看了：${summary()}`); X.toast('给 TA 看了', X.v('等 TA 说你吧', '看 TA 怎么说')); };
P.appMenu = async pkg => {
    const lb = labelOf(pkg); const ops = ['⏱️ 设每天能用多久', '🔒 现在就锁住（30 分钟）', '🚫 加到「不许碰」名单', '✅ 加到「永远能用」名单', '↗ 打开它'];
    const i = await chooser(ops, lb); if (i == null) return;
    if (i === 0) { const v = parseInt(await G.input(`「${lb}」每天最多用几分钟？（0 = 不限）`, String(D.rules.limits[pkg] || 60))); if (isNaN(v)) return; if (v > 0) D.rules.limits[pkg] = v; else delete D.rules.limits[pkg]; }
    else if (i === 1) { D.rules.temp = { pkgs: [pkg], until: Date.now() + 30 * 60e3, by: '', why: '你自己锁的' }; log('lock', `你自己锁了 ${lb} 30 分钟`); }
    else if (i === 2) { if (!D.never.includes(pkg)) D.never.push(pkg); }
    else if (i === 3) { if (!D.safe.includes(pkg)) D.safe.push(pkg); }
    else N.openApp(pkg);
    saveD(); pushRules(); G.repaint(APP);
};
function guardTab() {
    if (!native()) return noNative();
    const bl = blockedNow(), now = Date.now(), T = D.rules.temp && D.rules.temp.until > now ? D.rules.temp : null;
    const tc = T && T.by ? X.char(T.by) : null;
    return `${D.free > now ? `<div class="ph-card warn"><b>🆘 今天用了紧急解锁</b><p>今天之内不锁。<a onclick="gysPh.unfree()">现在恢复</a></p></div>` : ''}
      <div class="ph-card"><b>🔒 现在锁着 ${Object.keys(bl).length} 个</b><p>${Object.keys(bl).slice(0, 12).map(labelOf).join('、') || '没有'}</p>${N.mode() === 'js' ? '<p class="ph-warn">⚠️ 没装「谷雨守护」插件，现在是<b>软锁</b>：只有你切回谷雨的那一下才拦得住，拦不住后台。要真的锁住，装插件（看 使用指南 → 📲 真手机）。</p>' : (!N.perms().access ? '<p class="ph-warn">⚠️ 无障碍「谷雨守护」没开，锁不住。<a onclick="gysPh.openPerm(\'access\')">去打开</a></p>' : '')}</div>
      ${T ? `<div class="ph-card"><b>${tc ? esc(tc.name) + ' ' : ''}临时锁到 ${G.hm(T.until)}</b><p>${T.pkgs === 'all' ? '除了谷雨的所有软件' : T.pkgs.map(labelOf).join('、')}${T.why ? '<br>「' + esc(T.why) + '」' : ''}</p><span class="gys-btn sm ghost" onclick="gysPh.beg('${T.pkgs === 'all' ? '' : T.pkgs[0]}')">🥺 求 TA 解开</span></div>` : ''}
      <div class="ph-sech">⏱️ 每天限时 <a onclick="gysPh.addLimit()">＋ 加一个</a></div>
      <div class="ph-list">${Object.entries(D.rules.limits).map(([p, m]) => `<div class="ph-row" onclick="gysPh.appMenu('${p}')">${tile(p, labelOf(p), 32)}<div><b>${esc(labelOf(p))}</b><small>每天 ${m} 分钟 · 今天用了 ${fmtDur(appMs(p))}</small></div>${bl[p] ? '<em>🔒</em>' : ''}</div>`).join('') || '<div class="ph-tip">比如抖音每天 60 分钟，到点就锁住</div>'}</div>
      <div class="ph-sech">🕐 时间段 <a onclick="gysPh.addWin()">＋ 加一个</a></div>
      <div class="ph-list">${D.rules.wins.map((w, i) => `<div class="ph-row"><div><b>${esc(w.from)} ~ ${esc(w.to)}</b><small>${w.pkgs === 'all' ? '除了谷雨和「永远能用」的，全部' : w.pkgs.map(labelOf).join('、')}</small></div><span class="ph-sw${w.on === false ? '' : ' on'}" onclick="gysPh.togWin(${i})"><i></i></span><span class="ph-x" onclick="gysPh.delWin(${i})">✕</span></div>`).join('') || '<div class="ph-tip">比如 00:30 ~ 07:00 只能用谷雨</div>'}</div>
      <div class="ph-sech">🎯 今天的小目标</div>
      <div class="ph-list"><div class="ph-row" onclick="gysPh.setGoal()"><div><b>${D.goal.min ? '屏幕时间不超过 ' + D.goal.min + ' 分钟' : '还没定（点这里定一个）'}</b><small>做到了 TA 夸你，超了 TA 轻轻念你一句</small></div><em>›</em></div></div>
      <div class="ph-sech">📚 自习室联动</div>
      <div class="ph-list"><div class="ph-row"><div><b>番茄钟一开始，锁住这些软件</b><small>${(D.study.pkgs || []).map(labelOf).join('、') || '还没选'}${typeof window.gyxStudyState !== 'function' ? ' · 要装「一起自习室」插件' : ''}</small></div><span class="ph-sw${D.study.on ? ' on' : ''}" onclick="gysPh.togStudy()"><i></i></span></div><div class="ph-row" onclick="gysPh.pickApps('study')"><div><b>选软件</b></div><em>›</em></div></div>
      <div class="ph-sech">🛏️ 睡觉时间</div>
      <div class="ph-list"><div class="ph-row"><div><b>到点调暗屏幕、开勿扰、调小音量</b><small>${esc(bedTime())} 开始，${esc(D.bed.wake)} 还原${D.bed.time ? '' : '（跟着熬夜管家的睡觉时间）'}</small></div><span class="ph-sw${D.bed.on ? ' on' : ''}" onclick="gysPh.togBed()"><i></i></span></div>
        <div class="ph-row" onclick="gysPh.bedCfg()"><div><b>亮度 ${D.bed.bright}% · ${D.bed.dnd ? '开勿扰' : '不开勿扰'} · 音量 ${D.bed.vol}%</b><small>点这里改时间和数值</small></div><em>›</em></div></div>
      <div class="ph-sech">✅ 永远能用的软件</div>
      <div class="ph-list"><div class="ph-row" onclick="gysPh.pickApps('safe')"><div><b>${D.safe.length} 个</b><small>${D.safe.slice(0, 8).map(labelOf).join('、')}（打电话、紧急呼叫、设置怎么都不会被锁）</small></div><em>›</em></div></div>
      <div class="ph-sech">🆘 紧急解锁</div>
      <div class="ph-list"><div class="ph-row" onclick="gysPh.setCode()"><div><b>${D.code ? '口令已设' : '没设口令（点一下确认就能解开）'}</b><small>被锁的页面上点「🆘 紧急解锁」或者连点 TA 的头像 5 下</small></div><em>›</em></div><div class="ph-row" onclick="gysPh.sos()"><div><b class="red">现在紧急解锁</b></div></div></div>`;
}
P.unfree = () => { D.free = 0; saveD(); pushRules(); G.repaint(APP); };
P.setGoal = async () => { const v = parseInt(await G.input('今天屏幕时间最多用几分钟？（0 = 不定目标）', String(D.goal.min || 120))); if (isNaN(v)) return; D.goal.min = Math.max(0, v); D.goal.last = ''; saveD(); G.repaint(APP); X.toast(D.goal.min ? '🎯 定好啦：' + D.goal.min + ' 分钟' : '不定目标了', ''); };
P.addLimit = () => P.pickApps('limit');
P.pickApps = k => {
    if (!D.apps.length) { const L = N.apps(); if (L.length) { D.apps = L.sort((a, b) => a.label.localeCompare(b.label, 'zh')); L.forEach(a => { D.labels[a.pkg] = a.label; }); saveD(); } }
    const cur = new Set(k === 'study' ? D.study.pkgs : k === 'safe' ? D.safe : k === 'never' ? D.never : k === 'notif' ? D.notifPick : k.startsWith('win') ? (P.__win && P.__win.pkgs !== 'all' ? P.__win.pkgs : []) : []);
    const u = usageToday() || { apps: [] }; const ord = u.apps.map(a => a.pkg);
    const L = D.apps.slice().sort((a, b) => { const x = ord.indexOf(a.pkg), y = ord.indexOf(b.pkg); return (x < 0 ? 999 : x) - (y < 0 ? 999 : y); });
    const T = { study: '自习时锁住哪些', safe: '永远能用的软件', never: '不许碰的软件（不读、不截、不锁、不看通知）', notif: '哪些软件的通知让 TA 知道（都不选＝全部）', limit: '给哪个软件限时（选一个）', win: '这个时间段锁哪些' }[k.replace(/\d+$/, '')] || '选软件';
    G.push(APP, { title: T, html: () => `${k === 'limit' ? '' : '<div class="ph-tip">勾上的就是选中的，选完点下面保存</div>'}<div class="ph-list">${L.map(a => `<label class="ph-row">${tile(a.pkg, a.label, 32)}<div><b>${esc(a.label)}</b><small>${esc(a.pkg)}</small></div>${k === 'limit' ? `<span class="ph-go" onclick="gysPh.__lim('${a.pkg}')">选它</span>` : `<input type="checkbox" class="phPick" value="${a.pkg}" ${cur.has(a.pkg) ? 'checked' : ''}>`}</label>`).join('') || '<div class="gys-empty">读不到软件列表</div>'}</div>${k === 'limit' ? '' : `<div class="gys-acts"><button class="gys-btn" onclick="gysPh.__pick('${k}')">保存</button></div>`}` });
};
P.__lim = async pkg => { G.back(APP); const v = parseInt(await G.input(`「${labelOf(pkg)}」每天最多用几分钟？`, '60')); if (v > 0) { D.rules.limits[pkg] = v; saveD(); pushRules(); G.repaint(APP); } };
P.__pick = k => {
    const v = [...document.querySelectorAll('.phPick:checked')].map(x => x.value);
    if (k === 'study') D.study.pkgs = v; else if (k === 'safe') D.safe = Array.from(new Set(v.concat(['com.android.settings']))); else if (k === 'never') D.never = v; else if (k === 'notif') D.notifPick = v;
    else if (k === 'win' && P.__win) { P.__win.pkgs = v.length ? v : 'all'; D.rules.wins.push(P.__win); P.__win = null; }
    saveD(); pushRules(); G.back(APP); G.repaint(APP);
};
P.addWin = async () => {
    const a = await G.input('从几点开始？（比如 00:30）', '00:30'); if (!a || hm2min(a) == null) return;
    const b = await G.input('到几点？（比如 07:00）', '07:00'); if (!b || hm2min(b) == null) return;
    const i = await chooser(['除了谷雨和「永远能用」的，全部锁', '只锁我选的几个'], `${a} ~ ${b}`); if (i == null) return;
    P.__win = { from: a.trim(), to: b.trim(), pkgs: 'all', on: true };
    if (i === 0) { D.rules.wins.push(P.__win); P.__win = null; saveD(); pushRules(); G.repaint(APP); } else P.pickApps('win');
};
P.togWin = i => { const w = D.rules.wins[i]; if (!w) return; w.on = w.on === false; saveD(); pushRules(); G.repaint(APP); };
P.delWin = async i => { if (!(await G.confirm('删掉这个时间段？'))) return; D.rules.wins.splice(i, 1); saveD(); pushRules(); G.repaint(APP); };
P.togStudy = () => { D.study.on = !D.study.on; saveD(); G.repaint(APP); };
P.togBed = () => { D.bed.on = !D.bed.on; if (!D.bed.on && D.bed.applied) applyBed(false); saveD(); G.repaint(APP); };
P.bedCfg = async () => {
    const t = await G.input('几点开始？（空着就跟着熬夜管家的睡觉时间）', D.bed.time || ''); if (t === null || t === undefined) return; D.bed.time = hm2min(t) != null ? t.trim() : '';
    const w = await G.input('早上几点还原？', D.bed.wake); if (w && hm2min(w) != null) D.bed.wake = w.trim();
    const br = parseInt(await G.input('亮度调到多少？（0~100，0 = 不动亮度）', String(D.bed.bright))); if (!isNaN(br)) D.bed.bright = Math.max(0, Math.min(100, br));
    const v = parseInt(await G.input('音量调到多少？（0~100）', String(D.bed.vol))); if (!isNaN(v)) D.bed.vol = Math.max(0, Math.min(100, v));
    D.bed.dnd = await G.dialog({ title: '要开勿扰吗？', text: '开了就不响不弹（闹钟照样响）', ok: '开', cancel: '不开' });
    saveD(); G.repaint(APP);
};
P.setCode = async () => { const v = await G.input('紧急解锁的口令（空着＝不要口令，点确认就能解开）', D.code); if (v === null || v === undefined) return; D.code = String(v).trim().slice(0, 20); saveD(); G.repaint(APP); X.toast(D.code ? '🔐 口令设好了' : '不要口令了', ''); };
function seenTab() {
    const ic = { shot: '📸', read: '📖', desk: '🖥️', lock: '🔒', block: '🚫', beg: '🥺', sos: '🆘', pull: '↩️', screen: '🌙', bed: '🛏️', wall: '🖼️', alarm: '⏰', buzz: '💓', torch: '🔦', clip: '📋', deny: '🙅', notif: '🔔', usage: '📊' };
    return `<div class="ph-sech">TA 看过、做过的 <a onclick="gysPh.export()">导出</a></div>
      <div class="ph-list">${D.log.slice(0, 120).map(l => { const c = l.cid && X.char(l.cid); return `<div class="ph-row top"><span class="ph-li">${ic[l.k] || '•'}</span><div><b>${esc(l.text)}</b>${l.feel ? `<small>TA 心里：${esc(l.feel)}</small>` : ''}${l.img ? `<img src="${l.img}" class="ph-thumb" onclick="GYS.imgView(this.src)">` : ''}<small>${G.ago(l.at)}${c ? ' · ' + esc(c.name) : ''}${l.app ? ' · ' + esc(l.app) : ''}</small></div></div>`; }).join('') || '<div class="gys-empty">TA 还没看过、没做过什么</div>'}</div>
      ${can('notif') ? `<div class="ph-sech">TA 知道的通知（${D.notifs.length}）</div><div class="ph-list">${D.notifs.slice(0, 30).map(n => `<div class="ph-row top">${tile(n.pkg, n.label, 30)}<div><b>${esc(n.label)} · ${esc(n.title)}</b><small>${esc(n.text)}</small><small>${G.ago(n.at)}</small></div></div>`).join('') || '<div class="ph-tip">还没有</div>'}</div>` : ''}
      <div class="gys-acts"><span class="gys-btn sm ghost" onclick="gysPh.clearLog()">清空记录</span></div>`;
}
P.clearLog = async () => { if (!(await G.confirm('清空 TA 看过、做过的记录和通知？'))) return; D.log = []; D.notifs = []; saveD(); G.repaint(APP); };
P.export = () => { const t = D.log.map(l => `[${new Date(l.at).toLocaleString()}] ${l.k} ${l.text}${l.feel ? '（TA 心里：' + l.feel + '）' : ''}`).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = '谷雨-真手机记录.txt'; a.click(); };
function setTab() {
    const c = who(), ok = native(), m = N.mode();
    const banner = m === 'plugin' ? `<div class="ph-card ok"><b>✓ 谷雨守护 ${esc(N.ver())} 装好了（全功能）</b></div>`
        : m === 'js' ? `<div class="ph-card ok"><b>✓ 真手机已就位（免插件版）</b><p>屏幕时间、现在在用什么、电量音量、换壁纸、设闹钟、震动、手电筒、剪贴板、音量亮度勿扰、把你拉回谷雨、软锁提醒——都能用。<br>截屏、读屏、读通知、硬锁屏要再装「谷雨守护」插件（看 使用指南 → 📲 真手机）。</p></div>`
            : noNative();
    return `${banner}
      ${ok ? `<div class="ph-sech">手机权限</div>${permList()}` : ''}
      <div class="ph-sech">谁来管你</div><div class="ph-list"><div class="ph-row" onclick="gysPh.pickWho()">${c ? G.av(APP, 'c:' + c.id, 34) : ''}<div><b>${c ? esc(c.name) : '还没有角色'}</b><small>点这里换</small></div><em>›</em></div></div>
      ${['看', '管', '玩'].map(g => `<div class="ph-sech">${{ 看: '👀 TA 看得到', 管: '🔒 TA 管着你', 玩: '🎁 好玩的' }[g]}</div><div class="ph-list">${CAPS.filter(x => x[4] === g).map(([k, i, n]) => `<div class="ph-row"><span class="ph-li">${i}</span><div><b>${n}</b></div><span class="ph-seg">${MODES.map(([m, t]) => `<i class="${perm(k) === m ? 'on' : ''}" onclick="gysPh.setPerm('${k}','${m}')">${t}</i>`).join('')}</span></div>`).join('')}</div>`).join('')}
      <div class="ph-sech">🚫 不许碰的软件</div><div class="ph-list"><div class="ph-row" onclick="gysPh.pickApps('never')"><div><b>${D.never.length} 个</b><small>这些软件 TA 不读、不截、不锁、不看通知。名字里带银行、支付、钱包、密码、验证器的，不在名单里也一律不碰。</small></div><em>›</em></div></div>
      <div class="ph-sech">🔔 通知</div><div class="ph-list"><div class="ph-row" onclick="gysPh.pickApps('notif')"><div><b>${D.notifPick.length ? D.notifPick.length + ' 个软件' : '全部软件（不许碰的除外）'}</b><small>哪些软件的通知让 TA 知道</small></div><em>›</em></div></div>
      <div class="ph-sech">📸 截图留不留</div><div class="ph-list"><div class="ph-row"><div><b>截图给 TA 看完以后</b><small>只存文字记录的话最省地方</small></div><select onchange="gysPh.setKeep(this.value)">${[[0, '马上丢掉'], [5, '留最近 5 张'], [20, '留最近 20 张'], [100, '留最近 100 张']].map(([v, t]) => `<option value="${v}" ${Number(D.keep) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="ph-row"><div><b>记录最多留</b></div><select onchange="gysPh.setLogKeep(this.value)">${[100, 300, 1000, 5000].map(v => `<option value="${v}" ${Number(D.cfg.logKeep) === v ? 'selected' : ''}>${v} 条</option>`).join('')}</select></div></div>
      <div class="ph-sech">试试看（不用等 TA 想起来）</div>
      <div class="ph-try">${[['shot', '📸 截屏给 TA 看'], ['read', '📖 读屏给 TA 看'], ['desk', '🖥️ 让 TA 点评桌面'], ['buzz', '💓 TA 的心跳'], ['torch', '🔦 手电筒'], ['clip', '📋 剪贴板留言'], ['wall', '🖼️ 换成 TA 的照片'], ['alarm', '⏰ 让 TA 设闹钟'], ['pull', '↩️ 拉回谷雨'], ['screen', '🌙 锁屏']].map(([k, n]) => `<span onclick="gysPh.do('${k}')">${n}</span>`).join('')}<span onclick="gysPh.wallPick()">🖼️ 我挑图让 TA 换</span><span onclick="gysPh.torchOff()">🔦 关手电筒</span></div>
      <div class="gys-acts"><span class="gys-btn sm ghost" onclick="GYS.uiPage('phone')">🍎 苹果外观</span></div>`;
}
P.pickWho = async () => { const cs = G.chars(); const i = await chooser(cs.map(c => c.name), '谁来管你的手机？'); if (i == null) return; D.who = String(cs[i].id); saveD(); G.repaint(APP); };
P.setKeep = v => { D.keep = Number(v) || 0; log('cfg', '截图保留改成 ' + D.keep); G.repaint(APP); };
P.setLogKeep = v => { D.cfg.logKeep = Number(v) || 300; saveD(); };
P.wallPick = () => G.pickImg(9 / 19.5, url => P.do('wall', '她挑了一张图让你换', url));
P.torchOff = () => { N.torch(false); X.toast('🔦 关了', ''); };

/* ---------------- 外壳 ---------------- */
function head(tab) { return `<div class="gys-hd"><span class="gys-bk" onclick="GYS.close('${APP}')">${G.ic('back', 22)}</span><b>${{ time: '屏幕使用时间', guard: '管着我', seen: 'TA 看过的', set: '设置' }[tab] || '真手机'}</b></div>`; }
G.app(APP, {
    tabs: [['time', 'i:compass', '屏幕时间'], ['guard', 'i:heart', '管着我', () => Object.keys(blockedNow()).length || ''], ['seen', 'i:camera', 'TA 看过'], ['set', 'i:gear', '设置', () => D.ask.length || '']],
    head, render: t => t === 'guard' ? guardTab() : t === 'seen' ? seenTab() : t === 'set' ? setTab() : timeTab(),
    onOpen: () => { if (native()) { pushRules(); notifTick(); } }
});
window.gysPhoneOpen = tab => G.open(APP, tab);
window.gysPhoneOpenAsk = id => { G.open(APP, 'set'); P.ask(id); };

/* ---------------- 谷雨这边：开关、自主行动、今天、小组件、记忆总览、注入 ---------------- */
X.mini({ id: 'gysPhone', icon: '📲', title: '真手机', desc: 'TA 看你的屏幕使用时间、截屏、锁软件、锁屏、换壁纸、设闹钟', cat: '软件', onOpen: () => G.open(APP) }, 'gysPhone');
const rare = (c, k, h) => Date.now() - ((D.last[k + c.id]) || 0) > h * 3600e3;
const mark = (c, k) => { D.last[k + c.id] = Date.now(); saveD(); };
const late = () => { const h = new Date().getHours(); return h >= 23 || h < 5; };
const away = () => { try { return document.hidden || (native() && N.fg() && !/guyu|HBuilder|io\.dcloud/i.test(N.fg())); } catch (e) { return document.hidden; } };
const ACT = (key, label, hint, need, run) => X.action({ key, label, hint, need: c => native() && need(c), run }, 'gysPhone');
ACT('gys_ph_usage', '看了她今天的屏幕使用时间，说说她', '刷太久了 / 熬夜了 / 今天很乖', c => can('usage') && rare(c, 'u', 8) && (usageToday() || {}).total > 2 * 3600e3, async c => { mark(c, 'u'); await X.reach(c, `你看了她今天的手机屏幕使用时间：${summary()}`); return { text: '看了她的屏幕使用时间，说了她', selfNotified: true }; });
ACT('gys_ph_peek', '想偷看一眼她现在的手机屏幕', '截屏看看她在干嘛', c => can('shot') && rare(c, 's', 12) && away(), async c => { mark(c, 's'); const r = await request(c, 'shot', () => DO.shot(c), '想看看你在干嘛'); return r ? { text: r.asked ? '问她能不能看她的屏幕' : '偷看了她的手机屏幕', selfNotified: true } : null; });
ACT('gys_ph_read', '看看她手机上在看什么字', '读屏幕上的字（不截图）', c => can('read') && !can('shot') && rare(c, 'r', 12) && away(), async c => { mark(c, 'r'); const r = await request(c, 'read', () => DO.read(c), '想看看你在看什么'); return r ? { text: '看了她屏幕上的字', selfNotified: true } : null; });
ACT('gys_ph_lock', '锁她的娱乐软件', '刷太久 / 太晚了还在玩', c => can('lock') && rare(c, 'l', 6) && (!D.rules.temp || D.rules.temp.until < Date.now()) && (late() || ((usageToday() || {}).apps || []).some(a => a.ms > 2 * 3600e3)), async c => { mark(c, 'l'); const r = await request(c, 'lock', () => DO.lock(c, late() ? '太晚了还在玩手机' : '今天刷太久了'), late() ? '太晚了还在玩' : '今天刷太久了'); return r ? { text: r.asked ? '问她能不能锁她的软件' : '锁了她的软件', selfNotified: true } : null; });
ACT('gys_ph_pull', '把她从别的软件拉回谷雨', '想她了 / 她刷别的太久了', c => can('pull') && rare(c, 'p', 12) && away(), async c => { mark(c, 'p'); const r = await request(c, 'pull', () => DO.pull(c, '想她了'), '想你了'); return r ? { text: '把她拉回了谷雨', selfNotified: true } : null; });
ACT('gys_ph_screen', '让她的手机锁屏，催她睡觉', '很晚了还在玩', c => can('screen') && late() && rare(c, 'x', 20) && away(), async c => { mark(c, 'x'); const r = await request(c, 'screen', () => DO.screen(c, '太晚了，该睡了'), '太晚了，该睡了'); return r ? { text: '让她的手机锁屏了', selfNotified: true } : null; });
ACT('gys_ph_wall', '把她的手机壁纸换成你的照片', '一解锁就看到你', c => can('wall') && !!c.avatarImg && rare(c, 'w', 168), async c => { mark(c, 'w'); const r = await request(c, 'wall', () => DO.wall(c, '想让她一解锁就看到你'), '想把壁纸换成我'); return r ? { text: '换了她的手机壁纸', selfNotified: true } : null; });
ACT('gys_ph_alarm', '给她的手机设个闹钟', '明早叫她起床 / 提醒她一件事', c => can('alarm') && rare(c, 'a', 48) && new Date().getHours() >= 20, async c => { mark(c, 'a'); const r = await request(c, 'alarm', () => DO.alarm(c, '明天早上叫她起床'), '明天早上我叫你起床'); return r ? { text: '给她设了闹钟', selfNotified: true } : null; });
ACT('gys_ph_buzz', '让她的手机跟着你的心跳震一下', '想她了', c => can('buzz') && rare(c, 'b', 24), async c => { mark(c, 'b'); const r = await request(c, 'buzz', () => DO.buzz(c, Math.random() < 0.4 ? 'miss' : 'heart')); return r ? { text: '让她的手机震了一下（心跳）', selfNotified: true } : null; });
ACT('gys_ph_clip', '往她剪贴板里偷偷塞一句话', '她下次粘贴才发现', c => can('clip') && rare(c, 'c', 72), async c => { mark(c, 'c'); const r = await request(c, 'clip', () => DO.clip(c)); return r ? { text: '往她剪贴板里塞了一句话', selfNotified: true, secret: true } : null; });
ACT('gys_ph_desk', '想看看她的手机桌面', '点评她的壁纸和图标', c => can('desk') && rare(c, 'd', 168), async c => { mark(c, 'd'); const r = await request(c, 'desk', () => DO.desk(c), '想看看你手机桌面长什么样'); return r ? { text: '看了她的手机桌面', selfNotified: true } : null; });
ACT('gys_ph_notif', '看到她收到了别人的消息', '吃醋 / 好奇 / 关心', c => can('notif') && rare(c, 'n', 4) && D.notifs.some(n => Date.now() - n.at < 30 * 60e3 && CHATS.includes(n.pkg)), async c => { mark(c, 'n'); const n = D.notifs.find(n => Date.now() - n.at < 30 * 60e3 && CHATS.includes(n.pkg)); await X.reach(c, `你看到她手机上刚弹了一条「${n.label}」的通知：${n.title}：${n.text.slice(0, 100)}`); log('notif', `TA 看到了 ${n.label} 的通知：${n.title}`, { cid: String(c.id) }); return { text: '看到她收到了别人的消息', selfNotified: true }; });
ACT('gys_ph_batt', '提醒她手机快没电了', '电量低了还不充', c => can('status') && rare(c, 'e', 6) && (() => { const s = N.status(); return s.battery > 0 && s.battery <= 15 && !s.charging; })(), async c => { mark(c, 'e'); const s = N.status(); await X.reach(c, `她手机只剩 ${s.battery}% 的电了，还没在充电`); return { text: '提醒她手机快没电了', selfNotified: true }; });
ACT('gys_ph_goal', '看了她离今天小目标还差多少，说她一句', '达成了夸她 / 超了念她', c => can('usage') && Number(D.goal.min) > 0 && (D.goal.last || '') !== X.day() && (() => { const u = usageToday(); if (!u) return false; const used = Math.round((u.total || 0) / 60e3), h = new Date().getHours(); return used > D.goal.min || (h >= 21 && used <= D.goal.min); })(), async c => { D.goal.last = X.day(); saveD(); const u = usageToday() || {}; const used = Math.round((u.total || 0) / 60e3), ok = used <= D.goal.min; await X.reach(c, ok ? `她今天把手机屏幕时间压在了小目标（${D.goal.min} 分钟）以内，只用了 ${used} 分钟，好好夸夸她` : `她今天给自己定了屏幕时间不超过 ${D.goal.min} 分钟，现在已经用了 ${used} 分钟、超了，按你的性格轻轻念她一句（别凶）`); return { text: ok ? '夸了她今天达成屏幕时间小目标' : '说了她今天超了屏幕时间小目标' }; });
ACT('gys_ph_week', '给她看这一周的屏幕时间，陪她聊两句', '周末回顾', c => can('usage') && rare(c, 'wk', 24 * 6) && new Date().getDay() === 0, async c => { mark(c, 'wk'); const wk = usageWeek(); if (!wk) return null; const tot = wk.reduce((a, d) => a + d.total, 0), avg = tot / 7; await X.reach(c, `这是她这一周的手机屏幕时间：平均每天 ${fmtDur(avg)}，一共 ${fmtDur(tot)}。像朋友一样陪她聊两句（心疼 / 鼓励 / 调侃都行）`); return { text: '跟她聊了这周的屏幕时间（平均每天 ' + fmtDur(avg) + '）' }; });
X.today(() => { if (!native() || !can('usage')) return null; const u = usageToday(); if (!u) return null; const L = D.log.filter(l => X.day(new Date(l.at)) === X.day()); return { title: '📲 真手机', rows: [{ t: '屏幕时间', x: fmtDur(u.total) + ' · ' + ((u.apps || [])[0] ? u.apps[0].label + ' 最多' : ''), go: X.go('gysPhoneOpen', 'time') }].concat(Number(D.goal.min) ? [{ t: '🎯 目标', x: Math.round(((usageToday() || {}).total || 0) / 60e3) + ' / ' + D.goal.min + ' 分钟' + (Math.round(((usageToday() || {}).total || 0) / 60e3) > D.goal.min ? '（超了）' : ''), go: X.go('gysPhoneOpen', 'guard') }] : []).concat(L.slice(0, 2).map(l => ({ t: 'TA', x: l.text.slice(0, 30), go: X.go('gysPhoneOpen', 'seen') }))) }; }, 'gysPhone');
X.widget('gysPhoneW', { n: '屏幕使用时间', sizes: ['s', 'm'], tap: () => G.open(APP), r: () => { const u = native() && can('usage') ? usageToday() : null; return `<div style="padding:10px;font-size:12px;line-height:1.6"><b>📲 屏幕时间</b><br>${u ? `<span style="font-size:20px;font-weight:700">${fmtDur(u.total)}</span><br>${esc(((u.apps || [])[0] || {}).label || '')}` : '安卓 App 里能看'}</div>`; } }, 'gysPhone');
X.mem({ k: 'gysPh', ico: '📲', n: 'TA 看过你手机的', d: 'TA 截屏 / 读屏 / 看桌面时看到的（改了就是改 TA 记得的，删了就不记得）', items: c => D.log.filter(l => l.cid === String(c.id) && ['shot', 'read', 'desk', 'notif'].includes(l.k)), text: l => l.text, edit: (l, v) => { l.text = String(v).slice(0, 600); }, del: (c, i) => { const L = D.log.filter(l => l.cid === String(c.id) && ['shot', 'read', 'desk', 'notif'].includes(l.k)); const l = L[i]; if (l) D.log = D.log.filter(x => x !== l); }, meta: l => G.ago(l.at) + (l.app ? ' · ' + l.app : ''), save: () => saveD() }, 'gysPhone');
X.ctx(id => {
    const c = X.char(id); if (!c || !native()) return ''; const L = [];
    if (can('usage')) { const s = summary(); if (s) L.push(s); }
    if (can('now')) { const f = N.fg(); if (f && document.hidden) L.push(`她现在在用「${labelOf(f)}」`); }
    if (can('status')) { const s = N.status(); if (s.battery > 0) L.push(`手机电量 ${s.battery}%${s.charging ? '（在充电）' : ''}${s.headset ? '，戴着耳机' : ''}`); }
    const b = Object.keys(blockedNow()); if (b.length) L.push(`她手机上锁着：${b.slice(0, 5).map(labelOf).join('、')}${D.rules.temp && D.rules.temp.by === String(c.id) && D.rules.temp.until > Date.now() ? `（你锁的，到 ${G.hm(D.rules.temp.until)}）` : ''}`);
    if (D.free > Date.now()) L.push('她今天用了紧急解锁，所有锁都解开了');
    const seen = D.log.filter(l => l.cid === String(c.id) && ['shot', 'read', 'desk'].includes(l.k) && Date.now() - l.at < 6 * 3600e3)[0]; if (seen) L.push(`你${G.ago(seen.at)}看过她的屏幕：${seen.text.slice(0, 60)}`);
    if (can('notif')) { const n = D.notifs.find(n => Date.now() - n.at < 30 * 60e3); if (n) L.push(`她刚收到「${n.label}」的通知：${n.title}`); }
    return L.length ? `【她的手机】${L.join('；')}` : '';
}, 'gysPhone');
X.inj('gysPhone', [['她的手机', '真手机：屏幕使用时间、在用什么、电量、锁着什么、你看过的屏幕、通知', '让 TA 知道她手机上的真实情况（每一项能在真手机的设置里设「不许」）']]);

X.css('gys-phone-css', `
.gys-phone{--gys-accent:#007aff;background:#f2f2f7}body.dark-theme .gys-phone{background:#000}
.gys-phone .gys-hd{background:rgba(242,242,247,.94)}body.dark-theme .gys-phone .gys-hd{background:rgba(0,0,0,.9)}
.ph-card{background:#fff;margin:12px 16px;border-radius:14px;padding:14px 16px}body.dark-theme .ph-card{background:#1c1c1e}.ph-card b{font-size:16px}.ph-card p{font-size:13.5px;color:#6e6e73;line-height:1.6;margin:6px 0}.ph-card a{color:#007aff;cursor:pointer}.ph-card.warn{background:#fff8e6}.ph-card.ok{background:#e9f9ee}body.dark-theme .ph-card.warn{background:#3a2e10}body.dark-theme .ph-card.ok{background:#12301c}.ph-warn{color:#c93400!important}
.ph-big{padding:18px 16px 6px}.ph-big small{font-size:13px;color:#8e8e93;text-transform:uppercase}.ph-big b{display:block;font-size:34px;font-weight:700;letter-spacing:-.5px}.ph-big em{font-style:normal;font-size:13px;color:#8e8e93}
.ph-hours{display:flex;align-items:flex-end;gap:2px;height:90px;margin:8px 16px 2px;padding:6px;background:#fff;border-radius:12px}body.dark-theme .ph-hours{background:#1c1c1e}.ph-hours i{flex:1;background:#007aff;border-radius:2px 2px 0 0;min-height:1px}
.ph-hlab{display:flex;justify-content:space-between;margin:0 22px;font-size:10.5px;color:#8e8e93}
.ph-sech{display:flex;justify-content:space-between;padding:18px 20px 6px;font-size:13px;color:#6e6e73;text-transform:uppercase}.ph-sech a{color:#007aff;text-transform:none;cursor:pointer}
.ph-list{background:#fff;margin:0 16px;border-radius:12px;overflow:hidden}body.dark-theme .ph-list{background:#1c1c1e}
.ph-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:.5px solid rgba(60,60,67,.15);cursor:pointer}.ph-row:last-child{border:0}.ph-row.top{align-items:flex-start}.ph-row>div{flex:1;min-width:0}.ph-row b{display:block;font-size:15.5px;font-weight:500}.ph-row b.red{color:#ff3b30}.ph-row small{display:block;font-size:12.5px;color:#8e8e93;line-height:1.45;margin-top:2px}.ph-row>em{font-style:normal;color:#8e8e93;font-size:14px;white-space:nowrap}.ph-row select{border:none;background:rgba(118,118,128,.12);border-radius:8px;padding:5px 8px;color:inherit}
.ph-tile{display:inline-flex;align-items:center;justify-content:center;border-radius:22%;color:#fff;font-weight:700;font-size:15px;flex-shrink:0}
.ph-bar{display:block;height:5px;background:rgba(118,118,128,.15);border-radius:3px;margin-top:5px;overflow:hidden}.ph-bar u{display:block;height:100%;background:#007aff;border-radius:3px}
.ph-chip{font-style:normal;font-size:11px;color:#007aff;background:rgba(0,122,255,.1);border-radius:6px;padding:1px 6px;font-weight:400}
.ph-goal{margin:4px 16px 2px;background:#fff;border-radius:12px;padding:12px 14px}body.dark-theme .ph-goal{background:#1c1c1e}
.ph-goal-t{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}.ph-goal-t b{font-size:15px}.ph-goal-t em{font-style:normal;font-size:12.5px;color:#34c759}
.ph-goal.over .ph-goal-t em{color:#ff3b30}.ph-goal.over .ph-bar u{background:#ff3b30}
.ph-week{display:flex;gap:8px;align-items:flex-end;height:120px;margin:4px 16px;background:#fff;border-radius:12px;padding:10px}body.dark-theme .ph-week{background:#1c1c1e}.ph-week div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:3px}.ph-week i{width:70%;background:#5ac8fa;border-radius:4px 4px 0 0;min-height:2px}.ph-week em{font-style:normal;font-size:11px;color:#8e8e93}.ph-week small{font-size:10px;color:#8e8e93}
.ph-go{color:#007aff;font-size:14px;white-space:nowrap;cursor:pointer}.ph-ok{color:#34c759;font-size:13.5px;white-space:nowrap}
.ph-tip{font-size:12.5px;color:#8e8e93;padding:10px 14px;line-height:1.5}
.ph-sw{width:51px;height:31px;border-radius:16px;background:rgba(120,120,128,.32);position:relative;flex-shrink:0;cursor:pointer;transition:background .2s}.ph-sw i{position:absolute;left:2px;top:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:left .2s}.ph-sw.on{background:#34c759}.ph-sw.on i{left:22px}
.ph-x{color:#ff3b30;padding:0 4px;cursor:pointer}
.ph-li{font-size:20px;width:28px;text-align:center;flex-shrink:0}
.ph-seg{display:flex;background:rgba(118,118,128,.12);border-radius:9px;padding:2px;flex-shrink:0}.ph-seg i{font-style:normal;font-size:12px;padding:5px 8px;border-radius:7px;cursor:pointer;white-space:nowrap}.ph-seg i.on{background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12);font-weight:600}body.dark-theme .ph-seg i.on{background:#636366}
.ph-thumb{max-width:150px;border-radius:10px;margin-top:6px;display:block}
.ph-try{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px}.ph-try span{background:#fff;border-radius:999px;padding:8px 14px;font-size:14px;cursor:pointer}body.dark-theme .ph-try span{background:#1c1c1e}
.ph-blockb{background:linear-gradient(170deg,#1c1c3c,#3a2350 60%,#5a2c4c);color:#fff}
.ph-block{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px 24px;box-sizing:border-box;gap:10px}.ph-block h2{margin:10px 0 0;font-size:22px}.ph-bl{font-size:17px;line-height:1.6;margin:4px 0}.ph-block small{opacity:.7}.ph-block em{font-style:normal;font-size:11.5px;opacity:.5;margin-top:10px}
.ph-bb{display:flex;flex-direction:column;gap:10px;width:100%;max-width:300px;margin-top:20px}.ph-bb span{padding:13px;border-radius:14px;background:rgba(255,255,255,.14);cursor:pointer;font-size:16px}.ph-bb span.b{background:#fff;color:#000;font-weight:600}.ph-bb span.sos{background:transparent;color:#ff6961;font-size:14px}.ph-bb span.ghost{background:transparent;font-size:14px;opacity:.8}
.ph-ask{display:flex;flex-direction:column;align-items:center;text-align:center;padding:40px 24px;gap:8px}.ph-ask h3{margin:12px 0 0;font-size:20px}.ph-ask p{color:#6e6e73;margin:0}.ph-ask small{color:#8e8e93}.ph-ask .ph-bb span{background:#fff;color:#007aff}.ph-ask .ph-bb span.b{background:#007aff;color:#fff}body.dark-theme .ph-ask .ph-bb span{background:#1c1c1e}
.ph-sheet{position:fixed;inset:0;z-index:99980;background:rgba(0,0,0,.3);display:flex;align-items:flex-end}.ph-sheet-in{width:100%;padding:8px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));box-sizing:border-box;max-height:80vh;overflow-y:auto}.ph-sg{background:rgba(250,250,250,.97);border-radius:14px;overflow:hidden;margin-top:8px}body.dark-theme .ph-sg{background:rgba(44,44,46,.97);color:#fff}.ph-sg p{margin:0;padding:12px;text-align:center;font-size:13px;color:#8e8e93;border-bottom:.5px solid rgba(0,0,0,.08)}.ph-sg div{padding:15px;text-align:center;font-size:18px;color:#007aff;border-bottom:.5px solid rgba(0,0,0,.08);cursor:pointer}.ph-sg div.c{font-weight:600;border:0}
`);
(async () => {
    await G.ready(); D = Object.assign(D, await ST.get('d', {}) || {});
    D.perm = D.perm || {}; D.rules = Object.assign({ limits: {}, wins: [], temp: null }, D.rules || {}); D.study = Object.assign({ on: false, pkgs: [] }, D.study || {}); D.bed = Object.assign({ on: false, time: '', wake: '07:30', bright: 15, dnd: true, vol: 20, applied: '', prev: null }, D.bed || {}); D.cfg = Object.assign({ logKeep: 300 }, D.cfg || {}); D.goal = Object.assign({ min: 0, last: '' }, D.goal || {});
    ['log', 'notifs', 'apps', 'ask', 'never', 'safe', 'notifPick'].forEach(k => { if (!Array.isArray(D[k])) D[k] = []; });
    ['grant', 'labels', 'last'].forEach(k => { if (!D[k] || typeof D[k] !== 'object') D[k] = {}; });
})();
window.gysPhoneState = () => D;
