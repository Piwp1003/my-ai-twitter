package com.guyu.guard;

import android.accessibilityservice.AccessibilityService;
import android.graphics.Rect;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.*;

/** 谷雨的无障碍服务：知道你现在在哪个软件、帮 TA 读屏 / 操作页面 / 截屏 / 锁屏 / 拦住被锁的软件 */
public class GuardAccess extends AccessibilityService {
    static volatile GuardAccess inst;
    // 永远不拦：打电话、紧急呼叫、设置（不然没法关掉无障碍）、系统界面
    static final Set<String> SAFE = new HashSet<String>(Arrays.asList("com.android.phone", "com.android.dialer", "com.google.android.dialer", "com.android.server.telecom", "com.android.emergency", "com.android.settings", "com.android.systemui", "com.miui.securitycenter", "com.android.incallui"));
    String home = "";

    static final int MAX_NODES = 160;
    static final int MAX_DEPTH = 40;
    static final int MAX_TEXT = 300;
    static final long SNAP_MS = 30000;
    static final Set<String> MCP_APPS = new HashSet<String>(Arrays.asList(
        "com.sankuai.meituan",
        "com.sankuai.meituan.takeoutnew"
    ));
    static long snapSeq = 0;
    static final LinkedHashMap<Long, Snap> snaps = new LinkedHashMap<Long, Snap>(4, 0.75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<Long, Snap> eldest) { return size() > 4; }
    };

    static final class SnapNode {
        final int ref;
        final String text, desc, id, cls, bounds;
        final boolean clickable, editable, scrollable, enabled;
        SnapNode(int ref, String text, String desc, String id, String cls, String bounds, boolean clickable, boolean editable, boolean scrollable, boolean enabled) {
            this.ref = ref; this.text = text; this.desc = desc; this.id = id; this.cls = cls; this.bounds = bounds;
            this.clickable = clickable; this.editable = editable; this.scrollable = scrollable; this.enabled = enabled;
        }
    }

    static final class Snap {
        final long at;
        final String pkg;
        final List<SnapNode> nodes;
        Snap(String pkg, List<SnapNode> nodes) {
            this.pkg = pkg; this.nodes = nodes; this.at = System.currentTimeMillis();
        }
    }

    static final class Locate {
        final AccessibilityNodeInfo node;
        final SnapNode ref;
        final String error;
        Locate(AccessibilityNodeInfo node, SnapNode ref, String error) { this.node = node; this.ref = ref; this.error = error; }
    }

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

    static String fail(String error) { return "{\"ok\":false,\"error\":" + Guard.q(error) + "}"; }
    static String text(CharSequence v) {
        if (v == null) return "";
        String s = v.toString().trim();
        return s.length() > MAX_TEXT ? s.substring(0, MAX_TEXT) : s;
    }
    static String nodeText(AccessibilityNodeInfo n) { try { return text(n.getText()); } catch (Throwable e) { return ""; } }
    static String nodeDesc(AccessibilityNodeInfo n) { try { return text(n.getContentDescription()); } catch (Throwable e) { return ""; } }
    static String nodeId(AccessibilityNodeInfo n) { try { String s = n.getViewIdResourceName(); return s == null ? "" : s; } catch (Throwable e) { return ""; } }
    static String nodeCls(AccessibilityNodeInfo n) { try { return text(n.getClassName()); } catch (Throwable e) { return ""; } }
    static String nodeBounds(AccessibilityNodeInfo n) {
        try { Rect r = new Rect(); n.getBoundsInScreen(r); return r.left + "," + r.top + "," + r.right + "," + r.bottom; }
        catch (Throwable e) { return ""; }
    }
    static String activePkg(AccessibilityNodeInfo root) {
        try { String p = text(root.getPackageName()); if (p.length() > 0) return p; } catch (Throwable e) {}
        return Guard.fg == null ? "" : Guard.fg;
    }
    static String actionPolicyError(String pkg) {
        if (pkg == null || pkg.length() == 0) return "package_unknown";
        if (Guard.isNever(pkg)) return "blocked_app";
        return MCP_APPS.contains(pkg) ? "" : "not_meituan";
    }
    static boolean unsafeTap(String s) {
        s = s == null ? "" : s.toLowerCase();
        return s.contains("提交订单") || s.contains("立即支付") || s.contains("确认支付") || s.contains("去支付")
            || s.contains("付款") || s.contains("支付密码") || s.contains("验证码");
    }

    /** 读取当前页面的可操作节点。token 只在这张页面快照内有效。 */
    public static String inspectScreen(int cap) {
        GuardAccess a = inst;
        if (a == null) return fail("accessibility_off");
        try {
            AccessibilityNodeInfo root = a.getRootInActiveWindow();
            if (root == null) return fail("no_active_window");
            String pkg = activePkg(root);
            String policy = actionPolicyError(pkg);
            if (policy.length() > 0) return fail(policy);
            int limit = cap <= 0 ? 80 : Math.min(cap, MAX_NODES);
            List<SnapNode> nodes = new ArrayList<SnapNode>();
            collect(root, nodes, limit + 1, 0);
            boolean truncated = nodes.size() > limit;
            if (truncated) nodes.remove(nodes.size() - 1);
            long token;
            synchronized (snaps) {
                token = ++snapSeq;
                snaps.put(token, new Snap(pkg, nodes));
            }
            StringBuilder b = new StringBuilder();
            b.append("{\"ok\":true,\"pkg\":").append(Guard.q(pkg)).append(",\"token\":").append(token)
                .append(",\"count\":").append(nodes.size()).append(",\"truncated\":").append(truncated)
                .append(",\"nodes\":[");
            for (int i = 0; i < nodes.size(); i++) {
                if (i > 0) b.append(',');
                SnapNode n = nodes.get(i);
                b.append("{\"ref\":").append(n.ref)
                    .append(",\"text\":").append(Guard.q(n.text))
                    .append(",\"desc\":").append(Guard.q(n.desc))
                    .append(",\"id\":").append(Guard.q(n.id))
                    .append(",\"cls\":").append(Guard.q(n.cls))
                    .append(",\"bounds\":").append(Guard.q(n.bounds))
                    .append(",\"clickable\":").append(n.clickable)
                    .append(",\"editable\":").append(n.editable)
                    .append(",\"scrollable\":").append(n.scrollable)
                    .append(",\"enabled\":").append(n.enabled).append('}');
            }
            return b.append("]}").toString();
        } catch (Throwable e) {
            return fail("inspect_failed");
        }
    }

    static void collect(AccessibilityNodeInfo n, List<SnapNode> out, int limit, int depth) {
        if (n == null || out.size() >= limit || depth > MAX_DEPTH) return;
        try {
            if (n.isPassword()) return;
            if (n.isVisibleToUser()) {
                String t = nodeText(n), d = nodeDesc(n), id = nodeId(n), c = nodeCls(n);
                boolean click = n.isClickable(), edit = n.isEditable(), scroll = n.isScrollable();
                if (id.length() > 0 || t.length() > 0 || d.length() > 0) {
                    out.add(new SnapNode(out.size(), t, d, id, c, nodeBounds(n), click, edit, scroll, n.isEnabled()));
                }
            }
            for (int i = 0; i < n.getChildCount() && out.size() < limit; i++) collect(n.getChild(i), out, limit, depth + 1);
        } catch (Throwable e) {}
    }

    static Locate locate(long token, int ref) {
        Snap s;
        synchronized (snaps) { s = snaps.get(token); }
        if (s == null || ref < 0 || ref >= s.nodes.size()) return new Locate(null, null, "bad_snapshot");
        if (System.currentTimeMillis() - s.at > SNAP_MS) return new Locate(null, null, "snapshot_expired");
        GuardAccess a = inst;
        if (a == null) return new Locate(null, null, "accessibility_off");
        try {
            AccessibilityNodeInfo root = a.getRootInActiveWindow();
            if (root == null) return new Locate(null, null, "no_active_window");
            String pkg = activePkg(root);
            String policy = actionPolicyError(pkg);
            if (policy.length() > 0) return new Locate(null, null, policy);
            if (!s.pkg.equals(pkg)) return new Locate(null, null, "screen_changed");
            SnapNode refNode = s.nodes.get(ref);
            List<AccessibilityNodeInfo> hits = new ArrayList<AccessibilityNodeInfo>();
            findMatches(root, refNode, hits, 0);
            if (hits.isEmpty()) return new Locate(null, refNode, "node_not_found");
            if (hits.size() > 1) return new Locate(null, refNode, "multiple_matches");
            return new Locate(hits.get(0), refNode, "");
        } catch (Throwable e) {
            return new Locate(null, s.nodes.get(ref), "locate_failed");
        }
    }

    static void findMatches(AccessibilityNodeInfo n, SnapNode ref, List<AccessibilityNodeInfo> out, int depth) {
        if (n == null || out.size() > 1 || depth > MAX_DEPTH) return;
        try {
            if (!n.isPassword() && n.isVisibleToUser()
                && ref.text.equals(nodeText(n)) && ref.desc.equals(nodeDesc(n))
                && ref.id.equals(nodeId(n)) && ref.cls.equals(nodeCls(n))) {
                out.add(n);
            }
            for (int i = 0; i < n.getChildCount() && out.size() <= 1; i++) findMatches(n.getChild(i), ref, out, depth + 1);
        } catch (Throwable e) {}
    }

    static AccessibilityNodeInfo clickable(AccessibilityNodeInfo n) {
        AccessibilityNodeInfo x = n;
        for (int i = 0; i < 4 && x != null; i++) {
            try { if (x.isEnabled() && x.isClickable()) return x; } catch (Throwable e) {}
            try { x = x.getParent(); } catch (Throwable e) { return null; }
        }
        return null;
    }

    static AccessibilityNodeInfo editable(AccessibilityNodeInfo n) {
        AccessibilityNodeInfo x = n;
        for (int i = 0; i < 4 && x != null; i++) {
            try { if (x.isEnabled() && x.isEditable()) return x; } catch (Throwable e) {}
            try { x = x.getParent(); } catch (Throwable e) { return null; }
        }
        return null;
    }

    public static String tapElement(long token, int ref) {
        Locate hit = locate(token, ref);
        if (hit.error.length() > 0) return fail(hit.error);
        AccessibilityNodeInfo target = clickable(hit.node);
        if (target == null) return fail("node_not_clickable");
        if (unsafeTap(nodeText(hit.node) + " " + nodeDesc(hit.node) + " " + nodeText(target) + " " + nodeDesc(target))) return fail("unsafe_action");
        try {
            if (!target.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return fail("action_rejected");
            return "{\"ok\":true,\"action\":\"tap\",\"ref\":" + ref + ",\"text\":" + Guard.q(nodeText(hit.node) + " " + nodeDesc(hit.node)) + "}";
        } catch (Throwable e) {
            return fail("action_failed");
        }
    }

    public static String setText(long token, int ref, String value) {
        Locate hit = locate(token, ref);
        if (hit.error.length() > 0) return fail(hit.error);
        AccessibilityNodeInfo target = editable(hit.node);
        if (target == null) return fail("node_not_editable");
        try {
            if (target.isPassword()) return fail("password_field");
            android.os.Bundle args = new android.os.Bundle();
            args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value == null ? "" : value);
            if (!target.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) return fail("action_rejected");
            return "{\"ok\":true,\"action\":\"set_text\",\"ref\":" + ref + "}";
        } catch (Throwable e) {
            return fail("action_failed");
        }
    }

    public static String scrollScreen(int direction) {
        if (direction != 1 && direction != -1) return fail("bad_direction");
        GuardAccess a = inst;
        if (a == null) return fail("accessibility_off");
        try {
            AccessibilityNodeInfo root = a.getRootInActiveWindow();
            if (root == null) return fail("no_active_window");
            String pkg = activePkg(root);
            String policy = actionPolicyError(pkg);
            if (policy.length() > 0) return fail(policy);
            AccessibilityNodeInfo best = null;
            long bestArea = -1;
            List<AccessibilityNodeInfo> all = new ArrayList<AccessibilityNodeInfo>();
            findScrollable(root, all, 0);
            for (AccessibilityNodeInfo n : all) {
                try {
                    Rect r = new Rect(); n.getBoundsInScreen(r);
                    long area = Math.max(0, r.right - r.left) * (long) Math.max(0, r.bottom - r.top);
                    if (area > bestArea) { best = n; bestArea = area; }
                } catch (Throwable e) {}
            }
            if (best == null) return fail("no_scrollable");
            int action = direction > 0 ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD;
            if (!best.performAction(action)) return fail("action_rejected");
            return "{\"ok\":true,\"action\":\"scroll\",\"direction\":" + direction + "}";
        } catch (Throwable e) {
            return fail("action_failed");
        }
    }

    static void findScrollable(AccessibilityNodeInfo n, List<AccessibilityNodeInfo> out, int depth) {
        if (n == null || depth > MAX_DEPTH) return;
        try {
            if (!n.isPassword() && n.isVisibleToUser() && n.isEnabled() && n.isScrollable()) out.add(n);
            for (int i = 0; i < n.getChildCount(); i++) findScrollable(n.getChild(i), out, depth + 1);
        } catch (Throwable e) {}
    }
}
