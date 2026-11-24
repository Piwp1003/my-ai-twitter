package com.guyu.guard;
import android.content.Context;
import android.content.SharedPreferences;
import java.util.*;
import java.text.SimpleDateFormat;

/** Pure receipt parsing. Unknown layout, contradictory status, or a different intent never resolves a submission. */
public final class GuardReceipt {
 static String value(GuardAccess.SnapNode n){return n.text.isEmpty()?n.desc:n.text;}
 static String key(GuardAccess.SnapNode n){return n.id.substring(n.id.lastIndexOf('/')+1);}
 static String field(GuardAccess.Snap s,String prefix,String suffix){String found=null;for(GuardAccess.SnapNode n:s.nodes)if(key(n).equals(prefix+suffix)){if(found!=null)return null;found=value(n);}return found;}
 static long cents(String text){if(text==null||!text.matches("[¥￥]?\\s*\\d{1,7}(\\.\\d{1,2})?元?"))return -1;try{String v=text.replaceAll("[¥￥元\\s]","");String[] p=v.split("\\.");long n=Long.parseLong(p[0])*100+(p.length>1?Long.parseLong((p[1]+"00").substring(0,2)):0);return n<=100000000?n:-1;}catch(Throwable e){return -1;}}
 static String hash(String value){try{byte[] bytes=java.security.MessageDigest.getInstance("SHA-256").digest(value.getBytes("UTF-8"));StringBuilder b=new StringBuilder();for(byte x:bytes)b.append(String.format("%02x",x&255));return b.toString();}catch(Throwable e){return "";}}
 static boolean below(GuardAccess.Snap s,GuardAccess.SnapNode node,int parent){Set<Integer> seen=new HashSet<Integer>();while(node!=null&&seen.add(node.ref)){if(node.ref==parent)return true;node=node.parentRef>=0&&node.parentRef<s.nodes.size()?s.nodes.get(node.parentRef):null;}return false;}
 static String intent(GuardAccess.Snap s,String prefix){
  if(s==null||s.truncated)return "";String shop=field(s,prefix,"shop_name"),total=field(s,prefix,"total"),count=field(s,prefix,"total_quantity");long amount=cents(total);if(shop==null||shop.isEmpty()||amount<0||count==null||!count.matches("\\d+"))return "";
  List<GuardAccess.SnapNode> titles=new ArrayList<GuardAccess.SnapNode>();for(GuardAccess.SnapNode n:s.nodes)if(key(n).equals(prefix+"item_name"))titles.add(n);if(titles.isEmpty())return "";
  List<String> rows=new ArrayList<String>();long quantitySum=0;
  for(GuardAccess.SnapNode title:titles){GuardAccess.SnapNode row=title;String q=null,spec=null,line=null;boolean found=false;
   for(int depth=0;row!=null&&depth<4;depth++,row=row.parentRef>=0&&row.parentRef<s.nodes.size()?s.nodes.get(row.parentRef):null){
    int names=0;for(GuardAccess.SnapNode n:titles)if(below(s,n,row.ref))names++;if(names!=1)break;
    List<GuardAccess.SnapNode> members=new ArrayList<GuardAccess.SnapNode>();for(GuardAccess.SnapNode n:s.nodes)if(below(s,n,row.ref))members.add(n);
    int qs=0,ss=0,as=0;for(GuardAccess.SnapNode n:members){if(key(n).equals(prefix+"item_quantity")){q=value(n);qs++;}if(key(n).equals(prefix+"item_specs")){spec=value(n);ss++;}if(key(n).equals(prefix+"item_amount")){line=value(n);as++;}}
    if(qs==1&&ss==1&&as==1){found=true;break;}
   }
   if(!found||q==null||!q.matches("[1-9]\\d{0,2}")||spec==null||spec.isEmpty()||cents(line)<0||value(title).isEmpty())return "";
   List<String> choices=new ArrayList<String>();if(!spec.equals("无规格"))for(String part:spec.split("[/、,，;；]"))if(!part.trim().isEmpty())choices.add(part.trim());Collections.sort(choices);quantitySum+=Long.parseLong(q);
   rows.add(Guard.q(value(title))+":"+Guard.q(choices.toString())+":"+Long.parseLong(q)+":"+cents(line));
  }
  try{if(quantitySum!=Long.parseLong(count))return "";}catch(Throwable e){return "";}Collections.sort(rows);return hash(Guard.q(shop)+":"+amount+":"+rows.toString());
 }
 static String state(String order,String payment){
  if(order==null)return "unknown";
  boolean paid="已支付".equals(payment)||"已付款".equals(payment)||"支付成功".equals(payment);
  if(order.equals("待付款")||order.equals("待支付"))return paid?"unknown":"pending_payment";
  if(order.equals("已支付")||order.equals("支付成功")){if(payment!=null&&(payment.equals("待支付")||payment.equals("未支付")))return "unknown";return "paid";}
  if(order.equals("已取消")||order.equals("订单已取消"))return "cancelled";
  if(order.equals("提交失败")||order.equals("下单失败"))return "failed";
  if(order.equals("支付失败"))return paid?"unknown":"payment_failed";
  if(order.equals("已退款"))return "refunded";
  if(order.equals("退款中"))return "refund_pending";
  if(order.equals("已完成")||order.equals("已送达"))return paid?"delivered_paid":"delivered_payment_unconfirmed";
  if(order.equals("配送中")||order.equals("制作中")||order.equals("商家已接单"))return paid?"processing_paid":"processing_payment_unconfirmed";
  return "unknown";
 }
 static long time(String raw){if(raw==null||!raw.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}(:\\d{2})?"))return -1;try{SimpleDateFormat f=new SimpleDateFormat(raw.length()==16?"yyyy-MM-dd HH:mm":"yyyy-MM-dd HH:mm:ss",Locale.ROOT);f.setLenient(false);f.setTimeZone(TimeZone.getTimeZone("GMT+08:00"));return f.parse(raw).getTime();}catch(Throwable e){return -1;}}
 static final class Receipt {String orderId,state,intent,shop;long createdAt,total;}
 static Receipt read(GuardAccess.Snap s){
  if(s==null||s.truncated)return null;String id=field(s,"order_detail_","order_id");if(id==null||!id.matches("[A-Za-z0-9-]{8,64}"))return null;
  Receipt r=new Receipt();r.orderId=id;r.state=state(field(s,"order_detail_","status"),field(s,"order_detail_","payment_status"));r.intent=intent(s,"order_detail_");r.createdAt=time(field(s,"order_detail_","created_at"));r.total=cents(field(s,"order_detail_","total"));r.shop=field(s,"order_detail_","shop_name");
  return r.state.equals("unknown")||r.intent.isEmpty()||r.createdAt<0?null:r;
 }
 static boolean matches(Context c,GuardAccess.Snap s,Receipt r){try{SharedPreferences p=GuardOrder.prefs(c);long at=Long.parseLong(p.getString("at","0"));return r!=null&&!p.getString("id","").isEmpty()&&s.pkg.equals(p.getString("pkg",""))&&r.intent.equals(p.getString("intent",""))&&r.createdAt>=at-90000&&r.createdAt<=at+300000;}catch(Throwable e){return false;}}
 public static String check(Context c,long token,String signature){try{GuardAccess.Snap s=GuardOrder.snapshot(token);if(s==null||!s.fingerprint.equals(signature))return GuardAccess.fail("stale_snapshot");Receipt r=read(s);if(r==null)return GuardAccess.fail("receipt_unverified");SharedPreferences p=GuardOrder.prefs(c);boolean pending=!p.getString("id","").isEmpty();boolean candidate=matches(c,s,r);boolean confirmed=!pending&&hash(r.orderId).equals(p.getString("resolved_order_hash",""))&&s.pkg.equals(p.getString("resolved_pkg",""));return "{\"ok\":true,\"state\":"+Guard.q(r.state)+",\"candidateMatched\":"+candidate+",\"confirmedAssociation\":"+confirmed+",\"hasPendingSubmission\":"+pending+",\"submissionId\":"+Guard.q(p.getString("id",""))+",\"orderTail\":"+Guard.q(r.orderId.substring(r.orderId.length()-4))+"}";}catch(Throwable e){return GuardAccess.fail("receipt_unverified");}}
}
