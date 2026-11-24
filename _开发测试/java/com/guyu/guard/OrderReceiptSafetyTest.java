package com.guyu.guard;
import java.text.SimpleDateFormat;
import java.util.*;
public class OrderReceiptSafetyTest {
 static int checks=0;static void check(boolean v){if(!v)throw new AssertionError("check "+checks);checks++;}
 static class Fixture {
  OrderSubmitSafetyTest.Fixture submit=new OrderSubmitSafetyTest.Fixture();SnapshotSafetyTest.Node root=new SnapshotSafetyTest.Node("receipt","订单详情"),status=new SnapshotSafetyTest.Node("order_detail_status","已支付"),payment=new SnapshotSafetyTest.Node("order_detail_payment_status","已支付"),total=new SnapshotSafetyTest.Node("order_detail_total","22.00"),created=new SnapshotSafetyTest.Node("order_detail_created_at","");
  Fixture(){long token=submit.snap();String intent=GuardReceipt.intent(GuardOrder.snapshot(token),"checkout_");check(!intent.isEmpty());submit.c.data.values.put("id","submission-1");submit.c.data.values.put("intent",intent);submit.c.data.values.put("pkg","com.sankuai.meituan");submit.c.data.values.put("at",String.valueOf(System.currentTimeMillis()));SimpleDateFormat format=new SimpleDateFormat("yyyy-MM-dd HH:mm:ss",Locale.ROOT);format.setTimeZone(TimeZone.getTimeZone("GMT+08:00"));created.label=format.format(new Date());
   root.add(new SnapshotSafetyTest.Node("order_detail_order_id","2026112400123456")).add(new SnapshotSafetyTest.Node("order_detail_shop_name","面馆")).add(status).add(payment).add(total).add(created).add(new SnapshotSafetyTest.Node("order_detail_total_quantity","1")).add(new SnapshotSafetyTest.Node("order_detail_item_name","面条")).add(new SnapshotSafetyTest.Node("order_detail_item_quantity","1")).add(new SnapshotSafetyTest.Node("order_detail_item_specs","无规格")).add(new SnapshotSafetyTest.Node("order_detail_item_amount","20.00"));submit.access.root=root;
  }
  long snap(){return SnapshotSafetyTest.token(GuardAccess.inspectScreen(160));}
  String verify(long token){return GuardReceipt.check(submit.c,token,GuardOrder.snapshot(token).fingerprint);}
 }
 public static void main(String[] args){
  Fixture f=new Fixture();long t=f.snap();String result=f.verify(t);check(result.contains("\"candidateMatched\":true"));check(result.contains("\"confirmedAssociation\":false"));check(!result.contains("2026112400123456"));check(result.contains("\"orderTail\":\"3456\""));
  String request=GuardOrder.requestResolution(f.submit.c,"submission-1",t,GuardOrder.snapshot(t).fingerprint);check(request.contains("awaiting_confirmation"));check(!f.submit.c.data.getString("id","").isEmpty());GuardOrder.cancel("");check(!f.submit.c.data.getString("id","").isEmpty());
  t=f.snap();GuardOrder.requestResolution(f.submit.c,"submission-1",t,GuardOrder.snapshot(t).fingerprint);GuardOrder.Op op=GuardOrder.current;op.state="restoring_app";GuardOrder.resolve(f.submit.c,op);check(op.state.equals("resolved"));check(f.submit.c.data.getString("id","").isEmpty());check(f.submit.button.actions==0);GuardOrder.resolve(f.submit.c,op);check(op.state.equals("resolved"));
  t=f.snap();check(f.verify(t).contains("\"confirmedAssociation\":true"));check(!f.submit.c.data.values.toString().contains("2026112400123456"));
  f.status.label="已退款";f.total.label="0.00";t=f.snap();check(f.verify(t).contains("\"confirmedAssociation\":true"));check(f.verify(t).contains("refunded"));
  f=new Fixture();f.created.label="2020-01-01 00:00:00";t=f.snap();check(f.verify(t).contains("\"candidateMatched\":false"));check(GuardOrder.requestResolution(f.submit.c,"submission-1",t,GuardOrder.snapshot(t).fingerprint).contains("receipt_not_matched"));
  f=new Fixture();f.total.label="23.00";t=f.snap();check(f.verify(t).contains("\"candidateMatched\":false"));
  f=new Fixture();f.status.label="待付款";f.payment.label="已支付";t=f.snap();check(f.verify(t).contains("receipt_unverified"));
  f=new Fixture();f.status.label="商家已接单";f.payment.label="未支付";t=f.snap();check(f.verify(t).contains("processing_payment_unconfirmed"));check(!f.verify(t).contains("\"state\":\"paid\""));
  t=SnapshotSafetyTest.token(GuardAccess.inspectScreen(3));check(GuardReceipt.check(f.submit.c,t,GuardOrder.snapshot(t).fingerprint).contains("receipt_unverified"));
  f=new Fixture();t=f.snap();GuardOrder.requestResolution(f.submit.c,"submission-1",t,GuardOrder.snapshot(t).fingerprint);op=GuardOrder.current;op.state="restoring_app";f.submit.c.data.fail=true;GuardOrder.resolve(f.submit.c,op);check(op.state.equals("resolution_storage_failed"));check(GuardOrder.journalFault);check(f.submit.button.actions==0);
  check(GuardReceipt.state("支付失败","未支付").equals("payment_failed"));check(GuardReceipt.state("已送达","未支付").equals("delivered_payment_unconfirmed"));check(GuardReceipt.time("2026-02-30 12:00:00")<0);
  System.out.println(checks+" native receipt/association checks passed (stubbed Android)");
 }
}
