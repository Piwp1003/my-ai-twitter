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
    static volatile long snapSeq = 0;
    static final LinkedHashMap<Long, Snap> snaps = new LinkedHashMap<Long, Snap>(4, 0.75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<Long, Snap> eldest) { return size() > 4; }
    };

    static final class SnapNode {
        final int ref, parentRef;
        final String text, desc, id, cls, bounds;
        final boolean clickable, editable, scrollable, enabled, checkable, checked, selected;
        SnapNode(int ref, int parentRef, String text, String desc, String id, String cls, String bounds, boolean clickable, boolean editable, boolean scrollable, boolean enabled, boolean checkable, boolean checked, boolean selected) {
            this.ref = ref; this.parentRef = parentRef; this.text = text; this.desc = desc; this.id = id; this.cls = cls; this.bounds = bounds;
            this.clickable = clickable; this.editable = editable; this.scrollable = scrollable; this.enabled = enabled; this.checkable = checkable; this.checked = checked; this.selected = selected;
        }
    }

    static final class Snap {
        final long at;
        final String pkg, fingerprint;
        final boolean truncated;
        final List<SnapNode> nodes;
        Snap(String pkg, List<SnapNode> nodes, String fingerprint, boolean truncated) {
            this.pkg = pkg; this.nodes = nodes; this.fingerprint = fingerprint; this.truncated = truncated; this.at = System.nanoTime() / 1000000L;
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

    // Bounded full-tree signature, including text beyond the displayed node cap.
    static String fingerprint(AccessibilityNodeInfo root) throws Exception {
        StringBuilder b = new StringBuilder(); fingerprintWalk(root, b, new int[]{0}, 0);
        byte[] digest = java.security.MessageDigest.getInstance("SHA-256").digest(b.toString().getBytes("UTF-8"));
        StringBuilder hex = new StringBuilder(); for (byte x : digest) hex.append(String.format("%02x", x & 255));
        return hex.toString();
    }
    static void fingerprintWalk(AccessibilityNodeInfo n, StringBuilder b, int[] count, int depth) throws Exception {
        if (n == null) { b.append("null;"); return; }
        if (++count[0] > 2048 || depth > MAX_DEPTH || b.length() > 524288) throw new Exception("snapshot_unverifiable");
        b.append('[').append(Guard.q(nodeId(n))).append(Guard.q(nodeCls(n))).append(Guard.q(nodeBounds(n)))
            .append(n.isVisibleToUser()).append(n.isEnabled()).append(n.isClickable()).append(n.isEditable()).append(n.isScrollable()).append(n.isCheckable()).append(n.isChecked()).append(n.isSelected());
        if (!n.isPassword()) b.append(Guard.q(n.getText())).append(Guard.q(n.getContentDescription()));
        int children = n.getChildCount(); if (children > 2048) throw new Exception("snapshot_unverifiable");
        b.append(':').append(children);
        for (int i = 0; i < children; i++) fingerprintWalk(n.getChild(i), b, count, depth + 1);
        b.append(']');
        if (b.length() > 524288) throw new Exception("snapshot_unverifiable");
    }
    static boolean consumeToken(long token) { synchronized (snaps) { if (token != snapSeq || !snaps.containsKey(token)) return false; snaps.clear(); return true; } }
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
            String signature = fingerprint(root);
            int limit = cap <= 0 ? 80 : Math.min(cap, MAX_NODES);
            List<SnapNode> nodes = new ArrayList<SnapNode>();
            collect(root, nodes, limit + 1, 0);
            boolean truncated = nodes.size() > limit;
            if (truncated) nodes.remove(nodes.size() - 1);
            if (!signature.equals(fingerprint(root))) return fail("screen_changed");
            long token;
            synchronized (snaps) {
                token = ++snapSeq;
                snaps.put(token, new Snap(pkg, nodes, signature, truncated));
            }
            StringBuilder b = new StringBuilder();
            b.append("{\"ok\":true,\"pkg\":").append(Guard.q(pkg)).append(",\"token\":").append(token)
                .append(",\"snapshotSchema\":2,\"fingerprint\":").append(Guard.q(signature))
                .append(",\"count\":").append(nodes.size()).append(",\"truncated\":").append(truncated)
                .append(",\"nodes\":[");
            for (int i = 0; i < nodes.size(); i++) {
                if (i > 0) b.append(',');
                SnapNode n = nodes.get(i);
                b.append("{\"ref\":").append(n.ref).append(",\"parentRef\":").append(n.parentRef)
                    .append(",\"text\":").append(Guard.q(n.text))
                    .append(",\"desc\":").append(Guard.q(n.desc))
                    .append(",\"id\":").append(Guard.q(n.id))
                    .append(",\"cls\":").append(Guard.q(n.cls))
                    .append(",\"bounds\":").append(Guard.q(n.bounds))
                    .append(",\"clickable\":").append(n.clickable)
                    .append(",\"editable\":").append(n.editable)
                    .append(",\"scrollable\":").append(n.scrollable)
                    .append(",\"enabled\":").append(n.enabled).append(",\"checkable\":").append(n.checkable)
                    .append(",\"checked\":").append(n.checked).append(",\"selected\":").append(n.selected).append('}');
            }
            return b.append("]}").toString();
        } catch (Throwable e) {
            return fail("inspect_failed");
        }
    }

    static void collect(AccessibilityNodeInfo n, List<SnapNode> out, int limit, int depth) { collect(n, out, limit, depth, -1); }
    static void collect(AccessibilityNodeInfo n, List<SnapNode> out, int limit, int depth, int parentRef) {
        if (n == null || out.size() >= limit || depth > MAX_DEPTH) return;
        try {
            if (n.isPassword()) return;
            if (n.isVisibleToUser()) {
                String t = nodeText(n), d = nodeDesc(n), id = nodeId(n), c = nodeCls(n);
                boolean click = n.isClickable(), edit = n.isEditable(), scroll = n.isScrollable();
                if (id.length() > 0 || t.length() > 0 || d.length() > 0) {
                    int currentRef = out.size();
                    out.add(new SnapNode(currentRef, parentRef, t, d, id, c, nodeBounds(n), click, edit, scroll, n.isEnabled(), n.isCheckable(), n.isChecked(), n.isSelected()));
                    parentRef = currentRef;
                }
            }
            for (int i = 0; i < n.getChildCount() && out.size() < limit; i++) collect(n.getChild(i), out, limit, depth + 1, parentRef);
        } catch (Throwable e) {}
    }

    static Locate locate(long token, int ref) {
        Snap s;
        synchronized (snaps) { s = snaps.get(token); }
        if (s == null || ref < 0 || ref >= s.nodes.size()) return new Locate(null, null, "bad_snapshot");
        if (System.nanoTime() / 1000000L - s.at > SNAP_MS) return new Locate(null, null, "snapshot_expired");
        if (token != snapSeq) return new Locate(null, null, "stale_snapshot");
        GuardAccess a = inst;
        if (a == null) return new Locate(null, null, "accessibility_off");
        try {
            AccessibilityNodeInfo root = a.getRootInActiveWindow();
            if (root == null) return new Locate(null, null, "no_active_window");
            String pkg = activePkg(root);
            String policy = actionPolicyError(pkg);
            if (policy.length() > 0) return new Locate(null, null, policy);
            if (!s.fingerprint.equals(fingerprint(root))) return new Locate(null, null, "screen_changed");
            if (!s.pkg.equals(pkg)) return new Locate(null, null, "screen_changed");
            SnapNode refNode = s.nodes.get(ref);
            List<AccessibilityNodeInfo> hits = new ArrayList<AccessibilityNodeInfo>();
            findMatches(root, refNode, hits, 0);
            if (hits.isEmpty()) return new Locate(null, refNode, "node_not_found");
            if (hits.size() > 1) return new Locate(null, refNode, "multiple_matches");
            if (!s.fingerprint.equals(fingerprint(root))) return new Locate(null, null, "screen_changed");
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
                && ref.id.equals(nodeId(n)) && ref.cls.equals(nodeCls(n)) && ref.bounds.equals(nodeBounds(n)) && ref.enabled == n.isEnabled()) {
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

    static boolean protectedOrder(long token) {
        Snap s; synchronized(snaps){s=snaps.get(token);} if(s==null)return true;
        for(SnapNode n:s.nodes){String key=n.id.substring(n.id.lastIndexOf('/')+1);if(key.matches("(?i)(checkout|confirm_order|order_confirm|order_detail)_.*")||n.text.equals("提交订单")||n.text.equals("确认支付"))return true;}
        return false;
    }
    public static String tapElement(long token, int ref) {
        Locate hit = locate(token, ref);
        if (hit.error.length() > 0) return fail(hit.error);
        if (unsafeTap(nodeText(hit.node)+" "+nodeDesc(hit.node))) return fail("unsafe_action");
        if (protectedOrder(token)) return fail("order_requires_local_review");
        AccessibilityNodeInfo target = clickable(hit.node);
        if (target == null) return fail("node_not_clickable");
        if (unsafeTap(nodeText(hit.node) + " " + nodeDesc(hit.node) + " " + nodeText(target) + " " + nodeDesc(target))) return fail("unsafe_action");
        try {
            if (!consumeToken(token)) return fail("stale_snapshot");
            if (!target.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return fail("action_rejected");
            return "{\"ok\":true,\"action\":\"tap\",\"ref\":" + ref + ",\"text\":" + Guard.q(nodeText(hit.node) + " " + nodeDesc(hit.node)) + "}";
        } catch (Throwable e) {
            return fail("action_failed");
        }
    }

    public static String setText(long token, int ref, String value) {
        Locate hit = locate(token, ref);
        if (hit.error.length() > 0) return fail(hit.error);
        if (protectedOrder(token)) return fail("order_requires_local_review");
        AccessibilityNodeInfo target = editable(hit.node);
        if (target == null) return fail("node_not_editable");
        try {
            if (target.isPassword()) return fail("password_field");
            android.os.Bundle args = new android.os.Bundle();
            args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value == null ? "" : value);
            if (!consumeToken(token)) return fail("stale_snapshot");
            if (!target.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) return fail("action_rejected");
            return "{\"ok\":true,\"action\":\"set_text\",\"ref\":" + ref + "}";
        } catch (Throwable e) {
            return fail("action_failed");
        }
    }

    public static String scrollSnapshot(long token, int direction) {
        Locate hit = locate(token, 0); if (hit.error.length() > 0) return fail(hit.error);
        Snap snapshot; synchronized (snaps) { snapshot = snaps.get(token); }
        if (snapshot == null) return fail("bad_snapshot");
        return scrollChecked(token, direction, snapshot.fingerprint);
    }
    public static String backSnapshot(long token) {
        Locate hit = locate(token, 0); if (hit.error.length() > 0) return fail(hit.error);
        if (!consumeToken(token)) return fail("stale_snapshot");
        try { return inst.performGlobalAction(1) ? "{\"ok\":true,\"action\":\"back\"}" : fail("action_rejected"); }
        catch (Throwable e) { return fail("action_failed"); }
    }
    public static String scrollScreen(int direction) { return scrollChecked(0, direction, null); }
    static String scrollChecked(long token, int direction, String signature) {
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
            if (signature != null && !signature.equals(fingerprint(root))) return fail("screen_changed");
            if (signature != null && !consumeToken(token)) return fail("stale_snapshot");
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
