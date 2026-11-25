package com.guyu.guard;

public class BillReminderTest {
    public static void main(String[] args) {
        String wx="com.tencent.mm",ali="com.eg.android.AlipayGphone";
        check("微信支付|支出|417|1|001234".equals(BillReminder.parse(wx,"微信支付","支付成功 ￥4.17，交易单号：001234",1)));
        check("支付宝|退款|300|1|".equals(BillReminder.parse(ali,"支付宝","退款到账3元",1)));
        check(BillReminder.parse(wx,"朋友","支付成功 4.17",1)==null);
        check(BillReminder.parse("other","支付宝","退款到账3元",1)==null);
        check(BillReminder.parse(ali,"支付宝","验证码 123456",1)==null);
        check(BillReminder.parse(wx,"微信支付","支付成功 2元，优惠1元",1)==null);
        check(BillReminder.parse(wx,"微信支付","支付成功0元",1)==null);
        System.out.println("PASS native structured receipt parsing");
    }
    static void check(boolean value){if(!value)throw new AssertionError();}
}
