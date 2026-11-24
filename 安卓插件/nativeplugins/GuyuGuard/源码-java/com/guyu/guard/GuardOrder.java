package com.guyu.guard;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.view.accessibility.AccessibilityNodeInfo;
import android.os.Handler;
import android.os.Looper;
import java.util.*;

/** A user-only native confirmation. Generic MCP clicks still cannot submit orders. */
public final class GuardOrder {
 static final String PREF="guyu_order_submit_v1";
 static final Handler UI=new Handler(Looper.getMainLooper());
 static final class Op { String kind="submit",journalId,id,pkg,fingerprint,state="awaiting_confirmation"; long token,deadline; int ref; AlertDialog dialog; }
 static Op current;
 static boolean journalFault;
 static SharedPreferences prefs(Context c){return c.getSharedPreferences(PREF,0);}
 static boolean pending(Op o){return o!=null&&(o.state.equals("awaiting_confirmation")||o.state.equals("restoring_app"));}
 static GuardAccess.Snap snapshot(long token){synchronized(GuardAccess.snaps){GuardAccess.Snap s=GuardAccess.snaps.get(token);return s!=null&&token==GuardAccess.snapSeq&&System.nanoTime()/1000000L-s.at<GuardAccess.SNAP_MS?s:null;}}
 static boolean manualPayment(GuardAccess.Snap s){
  int found=0;
  for(GuardAccess.SnapNode n:s.nodes){String name=n.id.substring(n.id.lastIndexOf('/')+1);boolean safe=n.text.equals("手动支付")||n.text.equals("需手动支付")||n.text.equals("未开通免密支付");
   if(name.matches("(?i)(checkout|confirm_order|order_confirm)_payment_mode")){if(!safe)return false;found++;}
   if(!safe&&(n.text.contains("免密")||n.text.contains("自动扣款")||n.text.contains("先享后付")||n.text.contains("验证码")||n.text.contains("支付密码")))return false;
  }return found==1;
 }
 static String value(GuardAccess.SnapNode n){return n.text.isEmpty()?n.desc:n.text;}
 static boolean reviewComplete(GuardAccess.Snap s){
  if(s.truncated)return false;
  String[] fields={"shop_name","address","contact_name","contact_phone","subtotal","delivery_fee","packaging_fee","discount","total","total_quantity","payment_mode"};
  for(String key:fields){int count=0;for(GuardAccess.SnapNode n:s.nodes)if(n.id.substring(n.id.lastIndexOf('/')+1).matches("(?i)(checkout|confirm_order|order_confirm)_"+key)&&!value(n).isEmpty())count++;if(count!=1)return false;}
  int names=0,quantities=0,specs=0,amounts=0;for(GuardAccess.SnapNode n:s.nodes){String key=n.id.substring(n.id.lastIndexOf('/')+1);if(value(n).isEmpty())continue;if(key.matches("(?i)(checkout|confirm_order|order_confirm)_item_name"))names++;if(key.matches("(?i)(checkout|confirm_order|order_confirm)_item_quantity"))quantities++;if(key.matches("(?i)(checkout|confirm_order|order_confirm)_item_specs"))specs++;if(key.matches("(?i)(checkout|confirm_order|order_confirm)_item_amount"))amounts++;}
  return names>0&&names==quantities&&names==specs&&names==amounts;
 }
 static String message(GuardAccess.Snap s){StringBuilder b=new StringBuilder("将提交当前订单；不会代操作支付。请核对以下原生快照信息：\n\n");
  Map<String,String> labels=new HashMap<String,String>();String[] keys={"shop_name","address","contact_name","contact_phone","item_name","item_quantity","item_specs","item_amount","subtotal","delivery_fee","packaging_fee","discount","total","total_quantity","payment_mode"};String[] names={"店铺","地址","收货人","联系电话","商品","数量","规格","商品金额","商品小计","配送费","包装费","优惠","应付金额","总件数","支付方式"};for(int i=0;i<keys.length;i++)labels.put(keys[i],names[i]);
  for(GuardAccess.SnapNode n:s.nodes){String key=n.id.substring(n.id.lastIndexOf('/')+1).replaceFirst("(?i)^(checkout|confirm_order|order_confirm)_","");if(labels.containsKey(key))b.append(labels.get(key)).append("：").append(value(n)).append('\n');}
  return b.length()<=12000?b.toString():null;
 }
 static void finish(Op o,String state){synchronized(GuardOrder.class){o.state=state; if(o.dialog!=null){try{o.dialog.dismiss();}catch(Throwable e){}o.dialog=null;}}}
 public static synchronized String request(final Context c,long token,int ref,String signature){
  try{
   if(!(c instanceof Activity)||((Activity)c).isFinishing())return GuardAccess.fail("activity_required");
   if(journalFault)return GuardAccess.fail("journal_unavailable");
   if(pending(current))return GuardAccess.fail("confirmation_busy");
   if(!prefs(c).getString("id","").isEmpty())return GuardAccess.fail("previous_submit_unresolved");
   GuardAccess.Snap s=snapshot(token);
   if(s==null||!s.fingerprint.equals(signature)||ref<0||ref>=s.nodes.size())return GuardAccess.fail("stale_snapshot");
   GuardAccess.SnapNode button=s.nodes.get(ref);
   if(!button.enabled||!button.clickable||!button.text.equals("提交订单")||!manualPayment(s)||!reviewComplete(s)||GuardReceipt.intent(s,"checkout_").isEmpty())return GuardAccess.fail("manual_payment_unverified");
   final String review=message(s);if(review==null)return GuardAccess.fail("review_too_large");
   final Op o=new Op();o.id=UUID.randomUUID().toString();o.pkg=s.pkg;o.fingerprint=signature;o.token=token;o.ref=ref;o.deadline=s.at+GuardAccess.SNAP_MS;current=o;
   show(c,o,review,"确认提交这一笔订单","确认并提交一次");
   return status(c,o.id);
  }catch(Throwable e){return GuardAccess.fail("confirmation_failed");}
 }
 static void show(final Context c,final Op o,final String review,final String title,final String positive){
   ((Activity)c).runOnUiThread(new Runnable(){public void run(){synchronized(GuardOrder.class){if(!pending(o))return;try{
    o.dialog=new AlertDialog.Builder(c).setTitle(title) .setMessage(review)
     .setNegativeButton("取消",new DialogInterface.OnClickListener(){public void onClick(DialogInterface d,int w){finish(o,"cancelled");}}) .setOnCancelListener(new DialogInterface.OnCancelListener(){public void onCancel(DialogInterface d){finish(o,"cancelled");}})
     .setPositiveButton(positive,new DialogInterface.OnClickListener(){public void onClick(DialogInterface d,int w){synchronized(GuardOrder.class){if(!pending(o))return;if(System.nanoTime()/1000000L>=o.deadline){finish(o,"expired");return;}o.dialog=null;o.state="restoring_app";if(!Guard.openApp(c,o.pkg)){finish(o,"not_sent");return;}UI.postDelayed(new Runnable(){public void run(){restore(c,o,0);}},200);}}}).show();
    UI.postDelayed(new Runnable(){public void run(){synchronized(GuardOrder.class){if(pending(o))finish(o,"expired");}}},Math.max(1,o.deadline-System.nanoTime()/1000000L));
   }catch(Throwable e){finish(o,"not_sent");}}}});
 }
 public static synchronized String requestResolution(final Context c,String journalId,long token,String signature){
  try{if(!(c instanceof Activity)||((Activity)c).isFinishing())return GuardAccess.fail("activity_required");if(journalFault||pending(current))return GuardAccess.fail("confirmation_busy");
   GuardAccess.Snap s=snapshot(token);if(s==null||!s.fingerprint.equals(signature))return GuardAccess.fail("stale_snapshot");GuardReceipt.Receipt receipt=GuardReceipt.read(s);
   if(!prefs(c).getString("id","").equals(journalId)||!GuardReceipt.matches(c,s,receipt))return GuardAccess.fail("receipt_not_matched");
   final Op o=new Op();o.kind="resolve";o.journalId=journalId;o.id=UUID.randomUUID().toString();o.pkg=s.pkg;o.token=token;o.ref=0;o.fingerprint=signature;o.deadline=s.at+GuardAccess.SNAP_MS;current=o;
   show(c,o,"请确认这个平台订单对应上次提交。不会创建、取消或支付订单。\n订单号："+receipt.orderId+"\n店铺："+receipt.shop+"\n金额（分）："+receipt.total+"\n状态："+receipt.state,"核对订单结果","确认对应并解除提交占用");return status(c,o.id);
  }catch(Throwable e){return GuardAccess.fail("resolution_failed");}
 }
 static synchronized void resolve(Context c,Op o){
  if(!o.state.equals("restoring_app"))return;
  if(System.nanoTime()/1000000L>=o.deadline){finish(o,"expired");return;}
  GuardAccess.Snap s=snapshot(o.token);GuardReceipt.Receipt r=GuardReceipt.read(s);
  if(s==null||!s.fingerprint.equals(o.fingerprint)||!prefs(c).getString("id","").equals(o.journalId)||!GuardReceipt.matches(c,s,r)){finish(o,"not_resolved");return;}
  if(!prefs(c).edit().putString("resolved_op_id",o.journalId).putString("resolved_order_hash",GuardReceipt.hash(r.orderId)).putString("resolved_intent",r.intent).putString("resolved_state",r.state).putString("resolved_pkg",s.pkg).remove("id").remove("fingerprint").remove("intent").remove("at").remove("pkg").commit()){journalFault=true;finish(o,"resolution_storage_failed");return;}
  finish(o,"resolved");
 }
 static synchronized void restore(Context c,Op o,int retry){
  if(!o.state.equals("restoring_app"))return;
  if(System.nanoTime()/1000000L>=o.deadline){finish(o,"expired");return;}
  GuardAccess.Locate hit=GuardAccess.locate(o.token,o.ref);
  if(!hit.error.isEmpty()){
   if(retry<9&&(hit.error.equals("not_meituan")||hit.error.equals("no_active_window"))){UI.postDelayed(new Runnable(){public void run(){restore(c,o,retry+1);}},200);return;}
   finish(o,"not_sent");return;
  }
  if(o.kind.equals("resolve"))resolve(c,o);else commit(c,o,hit);
 }
 static synchronized void commit(Context c,Op o,GuardAccess.Locate hit){
  if(!o.state.equals("restoring_app"))return;
  if(System.nanoTime()/1000000L>=o.deadline){finish(o,"expired");return;}
  GuardAccess.Snap s=snapshot(o.token);
  if(s==null||!s.fingerprint.equals(o.fingerprint)||!manualPayment(s)||!reviewComplete(s)||GuardReceipt.intent(s,"checkout_").isEmpty()||!GuardAccess.nodeText(hit.node).equals("提交订单")||!hit.node.isClickable()){finish(o,"not_sent");return;}
  try{
   if(!prefs(c).getString("id","").isEmpty()){finish(o,"blocked");return;}
   // Durable latch BEFORE clicking. An uncertain attempt is never retried automatically.
   if(!prefs(c).edit().putString("id",o.id).putString("fingerprint",o.fingerprint).putString("state","attempted").putString("intent",GuardReceipt.intent(s,"checkout_")).putString("at",String.valueOf(System.currentTimeMillis())).putString("pkg",s.pkg).commit()){journalFault=true;finish(o,"storage_failed");return;}
   o.state="attempted";
   if(!GuardAccess.consumeToken(o.token)){o.state="unverified";return;}
   o.state=hit.node.performAction(AccessibilityNodeInfo.ACTION_CLICK)?"submitted_unverified":"unverified";
   prefs(c).edit().putString("state",o.state).commit();
  }catch(Throwable e){o.state="unverified";}
 }
 public static synchronized String status(Context c,String id){
  try{if(current!=null&&(id==null||id.isEmpty()||current.id.equals(id)))return "{\"ok\":true,\"id\":"+Guard.q(current.id)+",\"state\":"+Guard.q(current.state)+",\"pkg\":"+Guard.q(current.pkg)+",\"submissionId\":"+Guard.q(prefs(c).getString("id",""))+"}";
   String saved=prefs(c).getString("id","");if(!saved.isEmpty())return "{\"ok\":true,\"id\":"+Guard.q(saved)+",\"state\":\"unverified\",\"pkg\":"+Guard.q(prefs(c).getString("pkg",""))+"}";
   if(!prefs(c).getString("resolved_op_id","").isEmpty())return "{\"ok\":true,\"state\":\"resolved\",\"pkg\":"+Guard.q(prefs(c).getString("resolved_pkg",""))+"}";
   return "{\"ok\":true,\"state\":\"idle\"}";
  }catch(Throwable e){return GuardAccess.fail("journal_unavailable");}
 }
 public static synchronized boolean cancel(String id){if(pending(current)&&(id==null||id.isEmpty()||current.id.equals(id))){finish(current,"cancelled");return true;}return false;}
}
