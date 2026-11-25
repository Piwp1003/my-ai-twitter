package com.guyu.guard;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.Intent;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.NotificationChannel;
import android.app.PendingIntent;
import android.os.Build;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

/** Only structured candidate receipts enter the private queue. No notification text is retained. */
public final class BillReminder {
    private static final String CHANNEL="gy_bill_v1";
    private static final Pattern BODY=Pattern.compile("^(?:微信支付|支付宝)?(支付成功|付款成功|收款到账|退款到账)[：:\\s]*[¥￥]?([0-9]{1,8}(?:\\.[0-9]{1,2})?)(?:元|圆)?(?:[，,；;\\s]+(?:交易单号|交易订单号)[：:\\s]*([A-Za-z0-9_-]{6,80}))?$");
    private static SharedPreferences prefs(Context c){return c.getSharedPreferences("gy_bill_reminders",0);}
    public static boolean enabled(Context c){return "1".equals(prefs(c).getString("enabled","0"));}
    public static synchronized boolean enable(Context c,boolean on){
        SharedPreferences.Editor e=prefs(c).edit().putString("enabled",on?"1":"0");
        if(!on)e.remove("queue").remove("seen");
        return e.commit();
    }
    static boolean supported(String pkg){return "com.tencent.mm".equals(pkg)||"com.eg.android.AlipayGphone".equals(pkg);}
    static String parse(String pkg,String title,String text,long at){
        if(!supported(pkg)||at<=0||text==null||text.length()>180)return null;
        boolean wx="com.tencent.mm".equals(pkg);
        if(!(wx?"微信支付".equals(title):"支付宝".equals(title)||"支付宝支付".equals(title)))return null;
        Matcher m=BODY.matcher(text.trim());
        if(!m.matches())return null;
        long cents=new java.math.BigDecimal(m.group(2)).movePointRight(2).longValueExact();
        if(cents<=0)return null;
        String kind="收款到账".equals(m.group(1))?"收入":"退款到账".equals(m.group(1))?"退款":"支出";
        return (wx?"微信支付":"支付宝")+"|"+kind+"|"+cents+"|"+at+"|"+(m.group(3)==null?"":m.group(3));
    }
    public static synchronized String pending(Context c){return enabled(c)?prefs(c).getString("queue",""):"";}
    public static boolean takeLaunch(android.app.Activity activity){
        Intent intent=activity.getIntent();
        if(intent==null||intent.getIntExtra("gy_bill_open",0)!=1)return false;
        intent.putExtra("gy_bill_open",0);
        return true;
    }
    public static synchronized boolean dismiss(Context c,String row){
        if(row==null||row.contains("\n"))return false;
        StringBuilder left=new StringBuilder();
        for(String entry:pending(c).split("\n"))if(!entry.isEmpty()&&!entry.equals(row))left.append(entry).append('\n');
        return prefs(c).edit().putString("queue",left.toString()).commit();
    }
    static synchronized void receive(Context c,String pkg,String title,String text,long at){
        if(!enabled(c))return;
        String row=parse(pkg,title,text,at);
        if(row==null)return;
        SharedPreferences p=prefs(c);
        String seen=p.getString("seen",""),queue=pending(c);
        if(("\n"+seen).contains("\n"+row+"\n")||queue.split("\n").length>=100)return;
        String history=seen+row+"\n";
        if(history.split("\n").length>200)history=history.substring(history.indexOf('\n')+1);
        if(!p.edit().putString("queue",queue+row+"\n").putString("seen",history).commit())return;
        NotificationManager nm=(NotificationManager)c.getSystemService("notification");
        Notification.Builder b;
        if(Build.VERSION.SDK_INT>=26){
            nm.createNotificationChannel(new NotificationChannel(CHANNEL,"现实账本提醒",4));
            b=new Notification.Builder(c,CHANNEL);
        }else b=new Notification.Builder(c).setPriority(1);
        Intent launch=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if(launch!=null){
            launch.putExtra("gy_bill_open",1);
            b.setContentIntent(PendingIntent.getActivity(c,123,launch,Build.VERSION.SDK_INT>=23?0x0c000000:0x08000000));
        }
        nm.notify(40721,b.setSmallIcon(17301659).setContentTitle("谷雨 · 记账提醒").setContentText("打开谷雨，核对待处理的支付提醒").setAutoCancel(true).build());
    }
}
