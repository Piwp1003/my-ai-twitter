package com.guyu.guard;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.pm.ApplicationInfo;
import android.content.pm.ResolveInfo;
import java.util.*;

/**
 * 谷雨守护：给谷雨（5+App）用的安卓小零件。网页那边用 Native.js 调这里的静态方法：
 *   var G = plus.android.importClass('com.guyu.guard.Guard'); G.version();
 * 所有方法都不抛错：出错返回空串 / false / "{}"。
 */
public class Guard {
    public static final String VERSION = "1.0.0";
    static volatile String fg = "", fgCls = "";
    static volatile long fgAt = 0;
    static final Set<String> blocked = Collections.synchronizedSet(new HashSet<String>());
    static final Set<String> never = Collections.synchronizedSet(new HashSet<String>());
    static volatile String self = "";
    static volatile String lastBlocked = "";
    static volatile long lastBlockedAt = 0;
    static final LinkedList<String> notifs = new LinkedList<String>();
    static volatile int shotState = 0;   // 0 没在截 1 截着 2 好了 3 没成
    static volatile String shotErr = "";
    static Context app;

    public static String version() { return VERSION; }
    static void hold(Context c) { try { if (c != null && app == null) app = c.getApplicationContext(); if (c != null && self.length() == 0) self = c.getPackageName(); } catch (Throwable e) {} }

    /* ---------- JSON ---------- */
    static String q(Object o) {
        String s = o == null ? "" : o.toString();
        StringBuilder b = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) { char c = s.charAt(i);
            if (c == '"' || c == '\\') b.append('\\').append(c); else if (c == '\n') b.append("\\n"); else if (c == '\r') b.append("\\r"); else if (c == '\t') b.append("\\t"); else if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c); }
        return b.append('"').toString();
    }

    /* ---------- 权限 / 设置页 ---------- */
    static boolean sdk(int v) { try { return android.os.Build.VERSION.SDK_INT >= v; } catch (Throwable e) { return false; } }
    public static boolean hasUsage(Context c) {
        try { android.app.AppOpsManager ao = (android.app.AppOpsManager) c.getSystemService("appops"); return ao.checkOpNoThrow("android:get_usage_stats", android.os.Process.myUid(), c.getPackageName()) == 0; } catch (Throwable e) { return false; }
    }
    public static boolean canOverlay(Context c) { try { return !sdk(23) || android.provider.Settings.canDrawOverlays(c); } catch (Throwable e) { return false; } }
    public static boolean canWrite(Context c) { try { return !sdk(23) || android.provider.Settings.System.canWrite(c); } catch (Throwable e) { return false; } }
    public static boolean hasDnd(Context c) { try { return ((android.app.NotificationManager) c.getSystemService("notification")).isNotificationPolicyAccessGranted(); } catch (Throwable e) { return false; } }
    public static boolean accessOn() { return GuardAccess.inst != null; }
    public static boolean notifyOn() { return GuardNotify.inst != null; }
    public static String perms(Context c) {
        hold(c);
        return "{\"usage\":" + hasUsage(c) + ",\"overlay\":" + canOverlay(c) + ",\"write\":" + canWrite(c) + ",\"dnd\":" + hasDnd(c) + ",\"access\":" + accessOn() + ",\"notify\":" + notifyOn() + ",\"shot\":" + sdk(30) + ",\"lock\":" + sdk(28) + ",\"sdk\":" + android.os.Build.VERSION.SDK_INT + "}";
    }
    /** 打开设置页：usage / overlay / write / dnd / access / notify */
    public static boolean openSettings(Context c, String what) {
        try {
            String a; boolean pkg = false;
            if ("usage".equals(what)) a = "android.settings.USAGE_ACCESS_SETTINGS";
            else if ("overlay".equals(what)) { a = "android.settings.action.MANAGE_OVERLAY_PERMISSION"; pkg = true; }
            else if ("write".equals(what)) { a = "android.settings.action.MANAGE_WRITE_SETTINGS"; pkg = true; }
            else if ("dnd".equals(what)) a = "android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS";
            else if ("access".equals(what)) a = "android.settings.ACCESSIBILITY_SETTINGS";
            else if ("notify".equals(what)) a = "android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS";
            else if ("battery".equals(what)) { a = "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"; pkg = true; }
            else a = "android.settings.SETTINGS";
            Intent i = pkg ? new Intent(a, android.net.Uri.parse("package:" + c.getPackageName())) : new Intent(a);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i); return true;
        } catch (Throwable e) {
            try { Intent i = new Intent("android.settings.SETTINGS"); i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i); } catch (Throwable e2) {}
            return false;
        }
    }

    /* ---------- 软件名 ---------- */
    static final Map<String, String> labels = new HashMap<String, String>();
    public static String label(Context c, String pkg) {
        String l = labels.get(pkg); if (l != null) return l;
        try { PackageManager pm = c.getPackageManager(); CharSequence s = pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)); l = s == null ? pkg : s.toString(); } catch (Throwable e) { l = pkg; }
        labels.put(pkg, l); return l;
    }
    /** 桌面上能打开的软件：[{pkg,label}] */
    public static String apps(Context c) {
        StringBuilder b = new StringBuilder("["); Set<String> seen = new HashSet<String>();
        try {
            PackageManager pm = c.getPackageManager();
            Intent i = new Intent("android.intent.action.MAIN"); i.addCategory("android.intent.category.LAUNCHER");
            List<ResolveInfo> L = pm.queryIntentActivities(i, 0);
            for (ResolveInfo r : L) { String p = r.activityInfo.packageName; if (p == null || !seen.add(p)) continue; CharSequence s = r.loadLabel(pm); String l = s == null ? p : s.toString(); labels.put(p, l); if (b.length() > 1) b.append(','); b.append("{\"pkg\":").append(q(p)).append(",\"label\":").append(q(l)).append('}'); }
        } catch (Throwable e) {}
        return b.append(']').toString();
    }
    public static String launcher(Context c) {
        try { Intent i = new Intent("android.intent.action.MAIN"); i.addCategory("android.intent.category.HOME"); List<ResolveInfo> L = c.getPackageManager().queryIntentActivities(i, 0); StringBuilder b = new StringBuilder(); for (ResolveInfo r : L) { if (b.length() > 0) b.append(','); b.append(r.activityInfo.packageName); } return b.toString(); } catch (Throwable e) { return ""; }
    }

    /* ---------- 屏幕使用时间 ---------- */
    static final Set<String> SKIP = new HashSet<String>(Arrays.asList("com.android.systemui", "android"));
    /** [since, until) 之间每个软件在前台多久、解锁几次、每小时多少：{total,unlocks,apps:[{pkg,label,ms,opens}],hours:[24]} */
    public static String usage(Context c, double sinceD, double untilD) {
        hold(c);
        long since = (long) sinceD, until = (long) untilD; if (until <= 0) until = System.currentTimeMillis();
        try {
            android.app.usage.UsageStatsManager um = (android.app.usage.UsageStatsManager) c.getSystemService("usagestats");
            android.app.usage.UsageEvents ev = um.queryEvents(since - 3 * 3600 * 1000L, until);
            android.app.usage.UsageEvents.Event e = new android.app.usage.UsageEvents.Event();
            final Map<String, long[]> per = new HashMap<String, long[]>();   // ms, opens
            long[] hours = new long[24]; int unlocks = 0; String cur = null; long st = 0; boolean screenOn = true;
            Calendar cal = Calendar.getInstance();
            while (ev.hasNextEvent()) {
                ev.getNextEvent(e); int t = e.getEventType(); long ts = e.getTimeStamp(); String p = e.getPackageName();
                if (t == 18 && ts >= since) unlocks++;
                if (t == 1) { if (cur != null && st > 0) add(per, hours, cal, cur, Math.max(st, since), ts, false); cur = p; st = ts; if (ts >= since && p != null && !SKIP.contains(p)) { long[] a = per.get(p); if (a == null) { a = new long[2]; per.put(p, a); } a[1]++; } }
                else if (t == 2 && cur != null && cur.equals(p)) { add(per, hours, cal, cur, Math.max(st, since), ts, false); cur = null; st = 0; }
                else if (t == 16 && cur != null) { add(per, hours, cal, cur, Math.max(st, since), ts, false); cur = null; st = 0; }
            }
            if (cur != null && st > 0) add(per, hours, cal, cur, Math.max(st, since), until, false);
            List<String> ks = new ArrayList<String>(per.keySet());
            Collections.sort(ks, new Comparator<String>() { public int compare(String a, String b) { return Long.compare(per.get(b)[0], per.get(a)[0]); } });
            long total = 0; StringBuilder b = new StringBuilder("{\"apps\":[");
            int n = 0;
            for (String k : ks) { long[] a = per.get(k); if (a[0] < 1000 && a[1] == 0) continue; total += a[0]; if (n++ > 0) b.append(','); b.append("{\"pkg\":").append(q(k)).append(",\"label\":").append(q(label(c, k))).append(",\"ms\":").append(a[0]).append(",\"opens\":").append(a[1]).append('}'); }
            b.append("],\"hours\":["); for (int i = 0; i < 24; i++) { if (i > 0) b.append(','); b.append(hours[i]); }
            b.append("],\"total\":").append(total).append(",\"unlocks\":").append(unlocks).append('}');
            return b.toString();
        } catch (Throwable ex) { return "{\"err\":" + q(ex.toString()) + "}"; }
    }
    static void add(Map<String, long[]> per, long[] hours, Calendar cal, String p, long a, long b, boolean x) {
        if (p == null || b <= a || SKIP.contains(p)) return;
        long[] r = per.get(p); if (r == null) { r = new long[2]; per.put(p, r); } r[0] += b - a;
        long t = a; while (t < b) { cal.setTimeInMillis(t); int h = cal.get(Calendar.HOUR_OF_DAY); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0); long end = Math.min(b, cal.getTimeInMillis() + 3600 * 1000L); hours[h] += end - t; t = end; }
    }
    /** 现在在前台的软件（无障碍开着时最准；没开就用使用记录猜） */
    public static String foreground(Context c) {
        if (GuardAccess.inst != null && fg.length() > 0) return fg;
        try {
            android.app.usage.UsageStatsManager um = (android.app.usage.UsageStatsManager) c.getSystemService("usagestats");
            long now = System.currentTimeMillis(); android.app.usage.UsageEvents ev = um.queryEvents(now - 6 * 3600 * 1000L, now);
            android.app.usage.UsageEvents.Event e = new android.app.usage.UsageEvents.Event(); String last = "";
            while (ev.hasNextEvent()) { ev.getNextEvent(e); if (e.getEventType() == 1) last = e.getPackageName(); }
            return last == null ? "" : last;
        } catch (Throwable e) { return ""; }
    }

    /* ---------- 手机状态 ---------- */
    public static String status(Context c) {
        StringBuilder b = new StringBuilder("{");
        try { Intent i = c.registerReceiver(null, new IntentFilter("android.intent.action.BATTERY_CHANGED")); int lv = i.getIntExtra("level", -1), sc = i.getIntExtra("scale", 100), st = i.getIntExtra("status", 0), pl = i.getIntExtra("plugged", 0); b.append("\"battery\":").append(sc > 0 ? lv * 100 / sc : lv).append(",\"charging\":").append(st == 2 || st == 5 || pl > 0).append(','); } catch (Throwable e) {}
        try { android.media.AudioManager am = (android.media.AudioManager) c.getSystemService("audio"); b.append("\"vol\":").append(am.getStreamVolume(3)).append(",\"volMax\":").append(am.getStreamMaxVolume(3)).append(",\"headset\":").append(am.isWiredHeadsetOn() || am.isBluetoothA2dpOn()).append(",\"ringer\":").append(am.getRingerMode()).append(','); } catch (Throwable e) {}
        try { b.append("\"bright\":").append(android.provider.Settings.System.getInt(c.getContentResolver(), "screen_brightness", -1)).append(','); } catch (Throwable e) {}
        try { b.append("\"dnd\":").append(((android.app.NotificationManager) c.getSystemService("notification")).getCurrentInterruptionFilter()).append(','); } catch (Throwable e) {}
        b.append("\"fg\":").append(q(foreground(c))).append('}');
        return b.toString();
    }

    /* ---------- 管 ---------- */
    public static boolean setVolume(Context c, int pct) { try { android.media.AudioManager am = (android.media.AudioManager) c.getSystemService("audio"); int mx = am.getStreamMaxVolume(3); am.setStreamVolume(3, Math.max(0, Math.min(mx, Math.round(mx * pct / 100f))), 0); return true; } catch (Throwable e) { return false; } }
    public static boolean setBright(Context c, int v) { try { if (!canWrite(c)) return false; android.provider.Settings.System.putInt(c.getContentResolver(), "screen_brightness_mode", 0); return android.provider.Settings.System.putInt(c.getContentResolver(), "screen_brightness", Math.max(1, Math.min(255, v))); } catch (Throwable e) { return false; } }
    /** 1 全部 / 2 仅优先 / 3 全部静音 / 4 只有闹钟 */
    public static boolean setDnd(Context c, int f) { try { android.app.NotificationManager nm = (android.app.NotificationManager) c.getSystemService("notification"); if (!nm.isNotificationPolicyAccessGranted()) return false; nm.setInterruptionFilter(f); return true; } catch (Throwable e) { return false; } }
    public static boolean torch(Context c, boolean on) { try { android.hardware.camera2.CameraManager cm = (android.hardware.camera2.CameraManager) c.getSystemService("camera"); String[] ids = cm.getCameraIdList(); if (ids == null || ids.length == 0) return false; cm.setTorchMode(ids[0], on); return true; } catch (Throwable e) { return false; } }
    /** 震动："0,120,100,120" 这样的毫秒串（停、震、停、震……） */
    public static boolean vibrate(Context c, String csv) { try { String[] a = csv.split(","); long[] p = new long[a.length]; for (int i = 0; i < a.length; i++) p[i] = Long.parseLong(a[i].trim()); ((android.os.Vibrator) c.getSystemService("vibrator")).vibrate(p, -1); return true; } catch (Throwable e) { return false; } }
    public static boolean clip(Context c, String text) { try { ((android.content.ClipboardManager) c.getSystemService("clipboard")).setPrimaryClip(android.content.ClipData.newPlainText("谷雨", text)); return true; } catch (Throwable e) { return false; } }
    /** which：1 桌面 2 锁屏 3 都换 */
    public static boolean wallpaper(Context c, String path, int which) { try { android.graphics.Bitmap bm = android.graphics.BitmapFactory.decodeFile(path); if (bm == null) return false; android.app.WallpaperManager.getInstance(c).setBitmap(bm, null, true, which); return true; } catch (Throwable e) { return false; } }
    public static boolean alarm(Context c, int h, int m, String msg) { try { Intent i = new Intent("android.intent.action.SET_ALARM"); i.putExtra("android.intent.extra.alarm.HOUR", h); i.putExtra("android.intent.extra.alarm.MINUTES", m); i.putExtra("android.intent.extra.alarm.MESSAGE", msg == null ? "谷雨" : msg); i.putExtra("android.intent.extra.alarm.SKIP_UI", true); i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i); return true; } catch (Throwable e) { return false; } }
    public static boolean openApp(Context c, String pkg) { try { Intent i = c.getPackageManager().getLaunchIntentForPackage(pkg); if (i == null) return false; i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i); return true; } catch (Throwable e) { return false; } }
    public static boolean bringFront(Context c) { try { Context x = c != null ? c : app; Intent i = x.getPackageManager().getLaunchIntentForPackage(x.getPackageName()); i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP); x.startActivity(i); return true; } catch (Throwable e) { return false; } }

    /* ---------- 无障碍：锁屏 / 回桌面 / 读屏 / 截屏 / 拦软件 ---------- */
    public static boolean lock() { GuardAccess a = GuardAccess.inst; return a != null && sdk(28) && a.performGlobalAction(8); }
    public static boolean home() { GuardAccess a = GuardAccess.inst; return a != null && a.performGlobalAction(2); }
    public static boolean back() { GuardAccess a = GuardAccess.inst; return a != null && a.performGlobalAction(1); }
    public static boolean isNever(String p) {
        if (p == null) return false; String s = p.toLowerCase();
        if (never.contains(p)) return true;
        return s.contains("bank") || s.contains("alipay") || s.contains("unionpay") || s.contains("wallet") || s.contains("finance") || s.contains("securities") || s.contains("stock") || s.contains("password") || s.contains("keepass") || s.contains("1password") || s.contains("bitwarden") || s.contains("authenticator");
    }
    public static String screenText(int max) {
        GuardAccess a = GuardAccess.inst; if (a == null) return "";
        if (isNever(fg)) return "";
        try { android.view.accessibility.AccessibilityNodeInfo r = a.getRootInActiveWindow(); if (r == null) return ""; CharSequence pk = r.getPackageName(); if (pk != null && isNever(pk.toString())) return ""; StringBuilder b = new StringBuilder(); walk(r, b, max <= 0 ? 3000 : max, 0); return b.toString(); } catch (Throwable e) { return ""; }
    }
    static void walk(android.view.accessibility.AccessibilityNodeInfo n, StringBuilder b, int max, int d) {
        if (n == null || b.length() >= max || d > 40) return;
        try {
            if (!n.isPassword() && n.isVisibleToUser()) { CharSequence t = n.getText(); if (t == null || t.length() == 0) t = n.getContentDescription(); if (t != null && t.length() > 0) { String s = t.toString().trim(); if (s.length() > 0) { if (b.length() > 0) b.append('\n'); b.append(s.length() > 300 ? s.substring(0, 300) : s); } } }
            for (int i = 0; i < n.getChildCount() && b.length() < max; i++) walk(n.getChild(i), b, max, d + 1);
        } catch (Throwable e) {}
    }
    /** 截屏存到 path（安卓 11 以上，用无障碍截，不用每次弹窗）。异步：之后用 shotState() 看结果 */
    public static boolean shot(final String path) {
        final GuardAccess a = GuardAccess.inst; if (a == null || !sdk(30)) { shotState = 3; shotErr = a == null ? "无障碍没开" : "要安卓 11 以上"; return false; }
        if (isNever(fg)) { shotState = 3; shotErr = "现在这个软件在不许截的名单里"; return false; }
        shotState = 1; shotErr = "";
        try {
            Class<?> cbI = Class.forName("android.accessibilityservice.AccessibilityService$TakeScreenshotCallback");
            Object cb = java.lang.reflect.Proxy.newProxyInstance(cbI.getClassLoader(), new Class<?>[]{cbI}, new java.lang.reflect.InvocationHandler() {
                public Object invoke(Object proxy, java.lang.reflect.Method m, Object[] args) {
                    try {
                        if ("onSuccess".equals(m.getName())) {
                            Object res = args[0];
                            Object hb = res.getClass().getMethod("getHardwareBuffer").invoke(res);
                            Object cs = res.getClass().getMethod("getColorSpace").invoke(res);
                            Class<?> hbC = Class.forName("android.hardware.HardwareBuffer"), csC = Class.forName("android.graphics.ColorSpace");
                            android.graphics.Bitmap hw = (android.graphics.Bitmap) android.graphics.Bitmap.class.getMethod("wrapHardwareBuffer", hbC, csC).invoke(null, hb, cs);
                            android.graphics.Bitmap bm = hw.copy(android.graphics.Bitmap.Config.ARGB_8888, false);
                            try { hbC.getMethod("close").invoke(hb); } catch (Throwable e) {}
                            int w = bm.getWidth(), h = bm.getHeight(); if (w > 720) { android.graphics.Bitmap s = android.graphics.Bitmap.createScaledBitmap(bm, 720, Math.round(h * 720f / w), true); bm.recycle(); bm = s; }
                            java.io.FileOutputStream o = new java.io.FileOutputStream(path); bm.compress(android.graphics.Bitmap.CompressFormat.JPEG, 72, o); o.close(); bm.recycle();
                            shotState = 2;
                        } else if ("onFailure".equals(m.getName())) { shotState = 3; shotErr = "截屏失败（" + (args != null && args.length > 0 ? args[0] : "") + "）"; }
                    } catch (Throwable e) { shotState = 3; shotErr = e.toString(); }
                    return null;
                }
            });
            java.util.concurrent.Executor ex = new java.util.concurrent.Executor() { public void execute(Runnable r) { r.run(); } };
            android.accessibilityservice.AccessibilityService.class.getMethod("takeScreenshot", int.class, java.util.concurrent.Executor.class, cbI).invoke(a, 0, ex, cb);
            return true;
        } catch (Throwable e) { shotState = 3; shotErr = e.toString(); return false; }
    }
    public static int shotState() { return shotState; }
    public static String shotErr() { return shotErr; }
    /** 要拦的软件（逗号隔开的包名）。开了无障碍才拦得住 */
    public static void setBlocked(String csv) { synchronized (blocked) { blocked.clear(); if (csv != null) for (String s : csv.split(",")) { s = s.trim(); if (s.length() > 0) blocked.add(s); } } }
    public static void setNever(String csv) { synchronized (never) { never.clear(); if (csv != null) for (String s : csv.split(",")) { s = s.trim(); if (s.length() > 0) never.add(s); } } }
    public static String lastBlocked() { return lastBlocked + "|" + lastBlockedAt; }
    public static void clearBlocked() { lastBlocked = ""; lastBlockedAt = 0; }

    /* ---------- 通知 ---------- */
    static void pushNotif(String json) { synchronized (notifs) { notifs.add(json); while (notifs.size() > 200) notifs.removeFirst(); } }
    public static String pollNotifs() { synchronized (notifs) { StringBuilder b = new StringBuilder("["); int i = 0; for (String s : notifs) { if (i++ > 0) b.append(','); b.append(s); } notifs.clear(); return b.append(']').toString(); } }
}
