package com.guyu.guard;
import android.view.accessibility.AccessibilityNodeInfo;
import android.graphics.Rect;
import java.util.*;
public class SnapshotSafetyTest {
 static class Node extends AccessibilityNodeInfo {
  String label,id; int left=0,actions=0; boolean enabled=true,click=false,scroll=false,password=false,checked=false,selected=false; List<Node> children=new ArrayList<Node>(); Node parent;
  Node(String id,String label){this.id=id;this.label=label;}
  Node add(Node n){children.add(n);n.parent=this;return this;}
  public CharSequence getPackageName(){return "com.sankuai.meituan";}
  public CharSequence getText(){return label;} public String getViewIdResourceName(){return id;}
  public CharSequence getClassName(){return "Node";} public boolean isVisibleToUser(){return true;}
  public boolean isEnabled(){return enabled;} public boolean isClickable(){return click;}
  public boolean isCheckable(){return true;} public boolean isChecked(){return checked;} public boolean isSelected(){return selected;}
  public boolean isScrollable(){return scroll;} public boolean isPassword(){return password;}
  public int getChildCount(){return children.size();} public AccessibilityNodeInfo getChild(int i){return children.get(i);}
  public AccessibilityNodeInfo getParent(){return parent;}
  public void getBoundsInScreen(Rect r){r.left=left;r.top=0;r.right=left+100;r.bottom=100;}
  public boolean performAction(int a){actions++;return true;}
 }
 static class Access extends GuardAccess { Node root; public AccessibilityNodeInfo getRootInActiveWindow(){return root;} }
 static int checks=0;static void check(boolean v){if(!v)throw new AssertionError("check "+checks);checks++;}
 static long token(String s){java.util.regex.Matcher m=java.util.regex.Pattern.compile("\\\"token\\\":(\\d+)").matcher(s);if(!m.find())throw new AssertionError(s);return Long.parseLong(m.group(1));}
 public static void main(String[] a)throws Exception{
  Access access=new Access();GuardAccess.inst=access;Node root=new Node("root","首页"),button=new Node("buy","加购"),other=new Node("price","10元");button.click=true;root.add(button).add(other);access.root=root;
  String snap=GuardAccess.inspectScreen(80);check(snap.contains("\"snapshotSchema\":2"));check(snap.contains("\"parentRef\":-1"));check(snap.contains("\"parentRef\":0"));long t=token(snap);
  other.label="20元";check(GuardAccess.tapElement(t,1).contains("screen_changed"));check(button.actions==0);
  t=token(GuardAccess.inspectScreen(80));check(GuardAccess.tapElement(t,1).contains("\"ok\":true"));check(button.actions==1);check(GuardAccess.tapElement(t,1).contains("bad_snapshot"));
  t=token(GuardAccess.inspectScreen(80));token(GuardAccess.inspectScreen(80));check(GuardAccess.tapElement(t,1).contains("stale_snapshot"));
  t=token(GuardAccess.inspectScreen(80));button.left=40;check(GuardAccess.tapElement(t,1).contains("screen_changed"));
  t=token(GuardAccess.inspectScreen(80));button.enabled=false;check(GuardAccess.tapElement(t,1).contains("screen_changed"));button.enabled=true;
  t=token(GuardAccess.inspectScreen(1));other.label="30元";check(GuardAccess.locate(t,0).error.equals("screen_changed"));
  button.label="提交订单";t=token(GuardAccess.inspectScreen(80));check(GuardAccess.tapElement(t,1).contains("unsafe_action"));check(button.actions==1);button.label="加购";
  t=token(GuardAccess.inspectScreen(80));button.checked=true;check(GuardAccess.tapElement(t,1).contains("screen_changed"));
  t=token(GuardAccess.inspectScreen(80));button.selected=true;check(GuardAccess.tapElement(t,1).contains("screen_changed"));
  root.scroll=true;t=token(GuardAccess.inspectScreen(80));check(GuardAccess.scrollSnapshot(t,1).contains("\"ok\":true"));check(GuardAccess.scrollSnapshot(t,1).contains("bad_snapshot"));
  t=token(GuardAccess.inspectScreen(80));check(GuardAccess.backSnapshot(t).contains("action_rejected"));check(GuardAccess.backSnapshot(t).contains("bad_snapshot"));
  Node secret=new Node("secret","password1");secret.password=true;root.add(secret);String before=GuardAccess.fingerprint(root);secret.label="password2";check(before.equals(GuardAccess.fingerprint(root)));
  Node huge=new Node("huge","");for(int i=0;i<2050;i++)huge.add(new Node("x"+i,"x"));access.root=huge;check(GuardAccess.inspectScreen(80).contains("inspect_failed"));
  System.out.println(checks+" native snapshot checks passed (stubbed Android)");
 }
}
