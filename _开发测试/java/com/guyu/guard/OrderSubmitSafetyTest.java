package com.guyu.guard;
import android.app.Activity;
import android.content.SharedPreferences;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.*;
public class OrderSubmitSafetyTest {
 static class Pref implements SharedPreferences {Map<String,String> values=new HashMap<String,String>();boolean fail=false;int commits=0;public String getString(String k,String d){return values.containsKey(k)?values.get(k):d;}public Editor edit(){return new Editor(){Map<String,String> staged=new HashMap<String,String>();public Editor putString(String k,String v){staged.put(k,v);return this;}public Editor remove(String k){staged.put(k,null);return this;}public boolean commit(){for(String k:staged.keySet())if(staged.get(k)==null)values.remove(k);else values.put(k,staged.get(k));commits++;return !fail;}};} }
 static class Context extends Activity {Pref data=new Pref();public SharedPreferences getSharedPreferences(String n,int mode){return data;}}
 static class Submit extends SnapshotSafetyTest.Node {Context context;Submit(Context c){super("submit","提交订单");context=c;click=true;}public boolean performAction(int action){if(context.data.getString("id","").isEmpty())throw new AssertionError("clicked before durable marker");actions++;return true;}}
 static int checks=0;static void check(boolean ok){if(!ok)throw new AssertionError("check "+checks);checks++;}
 static class Fixture {Context c=new Context();SnapshotSafetyTest.Access access=new SnapshotSafetyTest.Access();SnapshotSafetyTest.Node root=new SnapshotSafetyTest.Node("root","确认订单"),mode=new SnapshotSafetyTest.Node("checkout_payment_mode","手动支付");Submit button=new Submit(c);Fixture(){root.add(new SnapshotSafetyTest.Node("checkout_shop_name","面馆")).add(mode).add(button);String[] fields={"address","contact_name","contact_phone","subtotal","delivery_fee","packaging_fee","discount","total","total_quantity","item_name","item_quantity","item_specs","item_amount"};String[] values={"上海市测试路12号","张某","13800138000","20.00","3.00","1.00","2.00","22.00","1","面条","1","无规格","20.00"};for(int i=0;i<fields.length;i++)root.add(new SnapshotSafetyTest.Node("checkout_"+fields[i],values[i]));access.root=root;GuardAccess.inst=access;GuardOrder.current=null;GuardOrder.journalFault=false;}
  long snap(){return SnapshotSafetyTest.token(GuardAccess.inspectScreen(80));} int ref(){return 3;}String signature(long token){return GuardOrder.snapshot(token).fingerprint;}
 }
 public static void main(String[] args){
  Fixture f=new Fixture();long token=f.snap();check(GuardAccess.tapElement(token,f.ref()).contains("unsafe_action"));check(f.button.actions==0);
  check(GuardOrder.request(f.c,token,f.ref(),"forged").contains("stale_snapshot"));
  String request=GuardOrder.request(f.c,token,f.ref(),f.signature(token));check(request.contains("awaiting_confirmation"));check(f.button.actions==0);check(GuardOrder.cancel(GuardOrder.current.id));check(f.c.data.values.isEmpty());
  token=f.snap();GuardOrder.request(f.c,token,f.ref(),f.signature(token));GuardOrder.Op op=GuardOrder.current;op.state="restoring_app";GuardOrder.commit(f.c,op,GuardAccess.locate(token,f.ref()));check(f.button.actions==1);check(op.state.equals("submitted_unverified"));check(!f.c.data.getString("id","").isEmpty());check(f.c.data.commits>=1);
  GuardOrder.commit(f.c,op,GuardAccess.locate(token,f.ref()));check(f.button.actions==1);check(op.state.equals("submitted_unverified"));
  token=f.snap();check(GuardOrder.request(f.c,token,f.ref(),f.signature(token)).contains("previous_submit_unresolved"));GuardOrder.current=null;check(GuardOrder.status(f.c,"").contains("unverified"));
  f=new Fixture();f.mode.label="免密支付";token=f.snap();check(GuardOrder.request(f.c,token,f.ref(),f.signature(token)).contains("manual_payment_unverified"));check(f.button.actions==0);
  f=new Fixture();f.c.data.fail=true;token=f.snap();GuardOrder.request(f.c,token,f.ref(),f.signature(token));op=GuardOrder.current;op.state="restoring_app";GuardOrder.commit(f.c,op,GuardAccess.locate(token,f.ref()));check(op.state.equals("storage_failed"));check(f.button.actions==0);
  f=new Fixture();token=f.snap();GuardOrder.request(f.c,token,f.ref(),f.signature(token));op=GuardOrder.current;op.state="restoring_app";f.mode.label="自动扣款";GuardOrder.restore(f.c,op,0);check(op.state.equals("not_sent"));check(f.button.actions==0);check(f.c.data.values.isEmpty());
  f=new Fixture();token=f.snap();GuardOrder.request(f.c,token,f.ref(),f.signature(token));op=GuardOrder.current;op.state="restoring_app";op.deadline=0;GuardOrder.restore(f.c,op,0);check(op.state.equals("expired"));check(f.button.actions==0);
  System.out.println(checks+" native order submission checks passed (stubbed Android, no real orders)");
 }
}
