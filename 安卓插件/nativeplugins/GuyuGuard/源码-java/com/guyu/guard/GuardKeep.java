package com.guyu.guard;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

/**
 * 后台常驻（前台服务）：通知栏挂一条「谷雨在后台陪着你」，系统就把谷雨当成「正在干活的软件」，不容易冻住 / 杀掉。
 * 同时拿一把「CPU 别睡」的锁（PARTIAL_WAKE_LOCK），锁屏以后网页里的定时器还能走，TA 到点了能说话、能弹通知。
 * 网页那边：Guard.keepStart(ctx, 标题, 说明) / Guard.keepStop(ctx) / Guard.keepOn()
 */
public class GuardKeep extends Service {
    static final String CH = "gy_keep";
    static final int ID = 7701;
    static volatile boolean on = false;
    static volatile String title = "谷雨在后台陪着你", text = "TA 有消息会叫你";
    PowerManager.WakeLock wl;
    static volatile GuardKeep inst;
    Handler h;
    boolean armed = false;
    final Runnable tick = new Runnable() { public void run() {
        armed = false;
        if (!on || Guard.beatMs <= 0) return;
        try { Guard.beat(); } catch (Throwable e) {}
        arm();
    } };
    /** 按 Guard.beatMs 安排下一次心跳（改了间隔 / 关掉也走这里） */
    void arm() {
        try {
            if (h == null) h = new Handler(Looper.getMainLooper());
            h.removeCallbacks(tick); armed = false;
            if (on && Guard.beatMs > 0) { h.postDelayed(tick, Guard.beatMs); armed = true; }
        } catch (Throwable e) { Guard.beatErr = String.valueOf(e); }
    }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override public int onStartCommand(Intent i, int flags, int startId) {
        try {
            if (i != null) {
                String t = i.getStringExtra("title"), x = i.getStringExtra("text");
                if (t != null && t.length() > 0) title = t;
                if (x != null && x.length() > 0) text = x;
            }
            startForeground(ID, build());
            on = true;
            if (wl == null) {
                PowerManager pm = (PowerManager) getSystemService("power");
                wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "guyu:keep");
                wl.setReferenceCounted(false);
            }
            if (!wl.isHeld()) wl.acquire();
            inst = this; Guard.hold(this); arm();
        } catch (Throwable e) { Guard.keepErr = String.valueOf(e); }
        return START_STICKY;
    }

    Notification build() {
        NotificationManager nm = (NotificationManager) getSystemService("notification");
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CH, "后台常驻", 1);   // IMPORTANCE_MIN：不响、不弹、只安静地挂着
            ch.setDescription("让谷雨在后台不被手机冻住。这一条不会响也不会弹。");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
            b = new Notification.Builder(this, CH);
        } else {
            b = new Notification.Builder(this);
            b.setPriority(-2);
        }
        int icon = 0;
        try { icon = getApplicationInfo().icon; } catch (Throwable e) {}
        if (icon == 0) icon = 17301659;   // android.R.drawable.ic_popup_reminder
        b.setSmallIcon(icon).setContentTitle(title).setContentText(text).setOngoing(true).setShowWhen(false);
        try {
            Intent it = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (it != null) b.setContentIntent(PendingIntent.getActivity(this, 0, it, Build.VERSION.SDK_INT >= 23 ? 0x0C000000 : 0x08000000));   // UPDATE_CURRENT | IMMUTABLE
        } catch (Throwable e) {}
        return b.build();
    }

    @Override public void onDestroy() {
        on = false; inst = null;
        try { if (h != null) h.removeCallbacks(tick); } catch (Throwable e) {}
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Throwable e) {}
        wl = null;
        try { stopForeground(true); } catch (Throwable e) {}
    }
}
