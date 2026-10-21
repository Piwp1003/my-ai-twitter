package com.guyu.guard;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import java.util.*;

/** 谷雨的无障碍服务：知道你现在在哪个软件、帮 TA 读屏 / 截屏 / 锁屏 / 拦住被锁的软件 */
public class GuardAccess extends AccessibilityService {
    static volatile GuardAccess inst;
    // 永远不拦：打电话、紧急呼叫、设置（不然没法关掉无障碍）、系统界面
    static final Set<String> SAFE = new HashSet<String>(Arrays.asList("com.android.phone", "com.android.dialer", "com.google.android.dialer", "com.android.server.telecom", "com.android.emergency", "com.android.settings", "com.android.systemui", "com.miui.securitycenter", "com.android.incallui"));
    String home = "";

    @Override protected void onServiceConnected() { inst = this; Guard.hold(this); try { home = Guard.launcher(this); } catch (Throwable e) {} }
    @Override public void onAccessibilityEvent(AccessibilityEvent e) {
        try {
            if (e == null || e.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;
            CharSequence p = e.getPackageName(); if (p == null) return; String pkg = p.toString();
            if (pkg.contains("inputmethod") || pkg.contains(".ime") || "com.android.systemui".equals(pkg)) return;
            Guard.fg = pkg; CharSequence cl = e.getClassName(); Guard.fgCls = cl == null ? "" : cl.toString(); Guard.fgAt = System.currentTimeMillis();
            if (Guard.blocked.contains(pkg) && !pkg.equals(Guard.self) && !SAFE.contains(pkg) && !home.contains(pkg)) {
                long now = System.currentTimeMillis();
                if (pkg.equals(Guard.lastBlocked) && now - Guard.lastBlockedAt < 1500) return;
                Guard.lastBlocked = pkg; Guard.lastBlockedAt = now;
                performGlobalAction(GLOBAL_ACTION_HOME);
                Guard.bringFront(this);
            }
        } catch (Throwable t) {}
    }
    @Override public void onInterrupt() {}
    @Override public boolean onUnbind(android.content.Intent i) { inst = null; return super.onUnbind(i); }
    @Override public void onDestroy() { inst = null; super.onDestroy(); }
}
