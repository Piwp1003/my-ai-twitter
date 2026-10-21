package com.guyu.guard;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/** 读别的软件弹的通知（只读标题和一行字，不点、不删）。银行 / 支付 / 密码类的一律不读 */
public class GuardNotify extends NotificationListenerService {
    static volatile GuardNotify inst;
    @Override public void onListenerConnected() { inst = this; Guard.hold(this); }
    @Override public void onListenerDisconnected() { inst = null; }
    @Override public void onDestroy() { inst = null; super.onDestroy(); }
    @Override public void onNotificationPosted(StatusBarNotification s) {
        try {
            if (s == null || s.isOngoing()) return; String pkg = s.getPackageName();
            if (pkg == null || pkg.equals(Guard.self) || Guard.isNever(pkg) || "android".equals(pkg) || "com.android.systemui".equals(pkg)) return;
            android.os.Bundle ex = s.getNotification().extras; if (ex == null) return;
            CharSequence t = ex.getCharSequence("android.title"), x = ex.getCharSequence("android.text");
            String title = t == null ? "" : t.toString(), text = x == null ? "" : x.toString();
            if (title.length() == 0 && text.length() == 0) return;
            if (text.length() > 300) text = text.substring(0, 300);
            Guard.pushNotif("{\"pkg\":" + Guard.q(pkg) + ",\"label\":" + Guard.q(Guard.label(this, pkg)) + ",\"title\":" + Guard.q(title) + ",\"text\":" + Guard.q(text) + ",\"at\":" + s.getPostTime() + "}");
        } catch (Throwable e) {}
    }
}
