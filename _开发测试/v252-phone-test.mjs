// 252：📲 真手机（安卓 App + 谷雨守护插件）——屏幕使用时间、现在在用什么、截屏读屏看桌面、锁软件/锁屏/拉回、每天限时/时间段/自习/睡觉、求再玩/紧急解锁、换壁纸/闹钟/震动/手电/剪贴板、通知、按项权限、银行名单永不碰
// 用法（项目根目录）：node _开发测试/v252-phone-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const rd = f => JSON.parse(fs.readFileSync(path.join(root, '插件', '软件', f), 'utf8'));
// 真手机现在是内置的（js/61-real-phone.js，build.py 生成，不再出 真手机.json），不用导入插件
const ALL = fs.existsSync(path.join(root, '插件', '软件', '真手机.json')) ? rd('真手机.json') : [];
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok) => results.push({ n, ok: !!ok });
const errs = [];

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('crash', () => errs.push('PAGE CRASHED'));
page.on('console', m => { const t = m.text(); if (/出错|Error|错误|崩/.test(t)) errs.push('CONSOLE ' + t.slice(0, 300)); });
page.on('dialog', d => d.accept());
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });

await page.evaluate(async ({ plugs }) => {
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  window.getApiConfig = () => ({ url: 'https://x.test/v1', key: 'k', model: 'm' });
  myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师，嘴硬心软', avatarImg: 'data:image/png;base64,AAAA', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  window.currentChatSessionId = 9991;
  window.__prompts = []; window.__reach = []; window.__notifs = [];
  const J = x => JSON.stringify(x);
  const fake = async (api, p) => {
    const t = typeof p === 'string' ? p : JSON.stringify(p); window.__prompts.push(t); let c = '嗯。';
    if (/屏幕上是什么|第一反应/.test(t)) c = J({ see: '在刷短视频', feel: '又在摸鱼' });
    else if (/再玩一会儿|给不给她/.test(t)) c = J({ ok: true, min: 10, say: '就这一次。' });
    else if (/设一个真闹钟/.test(t)) c = J({ h: 7, m: 30, label: '起床啦笨蛋' });
    else if (/剪贴板/.test(t)) c = '今天也很想你。';
    return { choices: [{ message: { content: c } }] };
  };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.sendProactiveChatMessage = async c => { window.__reach.push(c.id); }; try { sendProactiveChatMessage = window.sendProactiveChatMessage; } catch (e) {}
  const an = (...a) => window.__notifs.push(a); window.addNotification = an; try { addNotification = an; } catch (e) {}
  window.appConfirm = async () => true; window.appPrompt = async (q, d) => d;

  /* ---- 假的安卓 App + 谷雨守护插件 ---- */
  const DIM = { 'com.ss.android.ugc.aweme': '抖音', 'com.tencent.mm': '微信', 'com.xingin.xhs': '小红书', 'com.eg.android.AlipayGphone': '支付宝', 'com.android.settings': '设置', 'com.android.dialer': '电话' };
  window.__g = { blocked: '', never: '', vol: [], bright: [], dnd: [], torch: [], buzz: [], clip: [], wall: [], alarm: [], lock: 0, home: 0, front: 0, openApp: [], setBlocked: [], _shot: 0, _notifs: [], _lastBlocked: '|0' };
  const Guard = {
    version: () => '1.0.0',
    perms: () => J({ usage: true, access: true, overlay: true, notify: true, write: true, dnd: true }),
    openSettings: () => true,
    usage: () => J({ apps: [{ pkg: 'com.ss.android.ugc.aweme', label: '抖音', ms: 3 * 3600e3, opens: 40 }, { pkg: 'com.tencent.mm', label: '微信', ms: 40 * 60e3, opens: 60 }, { pkg: 'com.xingin.xhs', label: '小红书', ms: 25 * 60e3, opens: 10 }], hours: Array.from({ length: 24 }, (_, i) => (i === 22 ? 40 : i) * 60e3), total: 4 * 3600e3 + 5 * 60e3, unlocks: 83 }),
    foreground: () => 'com.ss.android.ugc.aweme',
    status: () => J({ battery: 12, charging: false, headset: true, bright: 180, vol: 60, volMax: 100, dnd: 0 }),
    apps: () => J(Object.entries(DIM).map(([pkg, label]) => ({ pkg, label }))),
    screenText: () => '推荐 关注 朋友 一条新视频 123万赞',
    shot: p => { window.__g.shotPath = p; window.__g._shot = 2; return true; },
    shotState: () => window.__g._shot, shotErr: () => '',
    lock: () => { window.__g.lock++; return true; }, home: () => { window.__g.home++; return true; }, bringFront: () => { window.__g.front++; return true; }, openApp: (ctx, p) => { window.__g.openApp.push(p); return true; },
    setBlocked: s => { window.__g.blocked = s; window.__g.setBlocked.push(s); }, setNever: s => { window.__g.never = s; },
    lastBlocked: () => window.__g._lastBlocked,
    pollNotifs: () => J(window.__g._notifs),
    setVolume: (ctx, v) => { window.__g.vol.push(v); }, setBright: (ctx, v) => { window.__g.bright.push(v); }, setDnd: (ctx, f) => { window.__g.dnd.push(f); },
    torch: (ctx, on) => { window.__g.torch.push(on); return true; }, vibrate: (ctx, str) => { window.__g.buzz.push(str); return true; }, clip: (ctx, t) => { window.__g.clip.push(t); return true; },
    wallpaper: (ctx, p, w) => { window.__g.wall.push([p, w]); return true; }, alarm: (ctx, h, m, str) => { window.__g.alarm.push([h, m, str]); return true; }
  };
  window.plus = {
    android: { runtimeMainActivity: () => ({}), importClass: n => (n === 'com.guyu.guard.Guard' ? Guard : null) },
    io: {
      convertLocalFileSystemURL: p => p,
      resolveLocalFileSystemURL: (p, ok) => ok({ file: cb => cb({}) }),
      FileReader: function () { this.readAsDataURL = () => setTimeout(() => this.onloadend && this.onloadend({ target: { result: 'data:image/jpeg;base64,/9j/AAAA' } }), 0); }
    },
    nativeObj: { Bitmap: function () { this.loadBase64Data = (d, ok) => ok(); this.save = (p, o, ok) => ok(); this.clear = () => {}; } },
    runtime: { appid: 'guyu' }
  };

  plugs.forEach(p => executePluginOnLoad(p));
  await new Promise(r => setTimeout(r, 300));
  GYX.set('gysPhone', true);

  // 测试里让弹窗直接有答案（不然 iOS 弹窗要等点击，测试会卡住）
  GYS.input = async (q, d) => (d == null ? '' : d);
  GYS.confirm = async () => true;
  GYS.dialog = async (opt) => (opt && opt.input ? (opt.def || '') : true);

  // 把权限设 auto，直接调 P.do（不弹「先问我」）
  const P = window.gysPh;
  window.__phDo = async (k, why) => { gysPhoneState().perm[k] = 'auto'; return P.do(k, why); };
}, { plugs: ALL });

await page.waitForTimeout(600);

// 每一步单独一个 evaluate，结果累加进 window.__o；哪一步把页面搞崩了就能看出来
const step = async (name, fn) => {
  try { await page.evaluate(fn); }
  catch (e) { await new Promise(r => setTimeout(r, 600)); console.log(`\n💥 这一步把页面搞崩了：「${name}」\n${e.message}`); console.log('页面事件：\n' + ([...new Set(errs)].join('\n') || '（无）')); try { await browser.close(); } catch (x) {} process.exit(1); }
};
const sfn = 'const s=ms=>new Promise(r=>setTimeout(r,ms));const o=window.__o||(window.__o={});const P=window.gysPh;';

await step('基本信息 + 屏幕时间页', new Function(`return (async()=>{${sfn}
  o.native=!!P.__N.ok()&&P.__N.ver()==='1.0.0';
  const feat=GYX.FEATS.find(f=>f.id==='gysPhone');o.defOff=feat&&feat.def===false;
  gysPhoneOpen('time');await s(200);
  const R=document.getElementById('gys_phone');
  o.timeTab=!!R&&/小时/.test(R.innerText)&&/83 次/.test(R.innerText)&&R.querySelectorAll('.ph-hours i').length===24&&/抖音/.test(R.innerText);
  o.iosShell=!R.classList.contains('framed')&&R.querySelectorAll('.gys-tb svg').length===4&&!!R.querySelector('.gys-bk svg');
})()`));

await step('权限 + 名单 + 限时规则', new Function(`return (async()=>{${sfn}
  const D0=gysPhoneState();o.caps=D0&&D0.perm&&Object.keys(D0.perm).length===0;
  P.setPerm('shot','no');o.setNo=gysPhoneState().perm.shot==='no';P.setPerm('shot','ask');
  o.bankNever=gysPhoneState().never.includes('com.eg.android.AlipayGphone');
  const st=gysPhoneState();st.rules.limits['com.ss.android.ugc.aweme']=60;
  const bn=P.blockedNow();
  o.limitBlock=!!bn['com.ss.android.ugc.aweme']&&bn['com.ss.android.ugc.aweme'].why==='limit';
  o.safeNotBlocked=!bn['com.android.settings']&&!bn['com.eg.android.AlipayGphone'];
  delete st.rules.limits['com.ss.android.ugc.aweme'];
})()`));

await step('TA 锁软件', new Function(`return (async()=>{${sfn}
  window.__reach.length=0;gysPhoneState().perm.lock='auto';
  await P.do('lock','刷太久了');await s(100);
  const D1=gysPhoneState();
  o.tempLock=!!(D1.rules.temp&&D1.rules.temp.by==='9991');
  o.pushNative=window.__g.setBlocked.length>0;o.lockReach=window.__reach.includes(9991);
  window.__pk=(D1.rules.temp&&D1.rules.temp.pkgs==='all')?'com.ss.android.ugc.aweme':(D1.rules.temp.pkgs[0]);
})()`));

await step('求再玩 10 分钟', new Function(`return (async()=>{${sfn}
  window.__reach.length=0;await P.beg(window.__pk);await s(150);
  o.beg=(gysPhoneState().grant[window.__pk]||0)>Date.now();
})()`));

await step('🆘 紧急解锁', new Function(`return (async()=>{${sfn}
  await P.sos();await s(50);
  o.sos=gysPhoneState().free>Date.now()&&Object.keys(P.blockedNow()).length===0;
  gysPhoneState().free=0;gysPhoneState().rules.temp=null;
})()`));

await step('截屏看页面', new Function(`return (async()=>{${sfn}
  window.__reach.length=0;gysPhoneState().keep=0;
  await window.__phDo('shot');await s(400);
  const sl=gysPhoneState().log.find(l=>l.k==='shot');
  o.shot=!!(sl&&/短视频/.test(sl.text)&&window.__reach.includes(9991)&&!sl.img);
})()`));

await step('读屏看字', new Function(`return (async()=>{${sfn}
  window.__reach.length=0;await window.__phDo('read');await s(100);
  o.read=gysPhoneState().log.some(l=>l.k==='read'&&/赞|朋友/.test(l.text))&&window.__reach.includes(9991);
})()`));

await step('睡觉时间', new Function(`return (async()=>{${sfn}
  Object.assign(gysPhoneState().bed,{on:true,bright:15,dnd:true,vol:20});
  await window.__phDo('bed');await s(50);
  o.bed=window.__g.bright.length>0&&window.__g.dnd.length>0&&window.__g.vol.length>0&&!!gysPhoneState().bed.applied;
})()`));

await step('壁纸/闹钟/震动/手电/剪贴板', new Function(`return (async()=>{${sfn}
  await window.__phDo('wall','一解锁就看到你');await s(60);o.wall=window.__g.wall.length>0;
  await window.__phDo('alarm','明早叫她');await s(150);o.alarm=window.__g.alarm.length>0&&window.__g.alarm[0][0]===7&&window.__g.alarm[0][1]===30;
  await window.__phDo('buzz','heart');await s(30);o.buzz=window.__g.buzz.length>0;
  await window.__phDo('torch');await s(30);o.torch=window.__g.torch.includes(true);
  await window.__phDo('clip');await s(150);o.clip=window.__g.clip.length>0&&/想你/.test(window.__g.clip.join(''));
})()`));

await step('通知 + 上下文 + 注册项', new Function(`return (async()=>{${sfn}
  window.__g._notifs=[{pkg:'com.tencent.mm',label:'微信',title:'妈妈',text:'吃饭了',at:Date.now()},{pkg:'com.eg.android.AlipayGphone',label:'支付宝',title:'到账',text:'100元',at:Date.now()}];
  P.setPerm('notif','auto');P.tick();await s(50);
  const nf=gysPhoneState().notifs;
  o.notif=nf.some(n=>n.pkg==='com.tencent.mm')&&!nf.some(n=>n.pkg==='com.eg.android.AlipayGphone');
  let cx='';try{const raw=typeof window.__gyxCtxFor==='function'?window.__gyxCtxFor(9991):'';cx=Array.isArray(raw)?raw.join(' '):String(raw||'');}catch(e){cx='ERR '+e.message;}
  o.ctx=/她的手机/.test(cx);
  o.acts=['gys_ph_usage','gys_ph_peek','gys_ph_lock','gys_ph_wall','gys_ph_alarm','gys_ph_buzz','gys_ph_clip','gys_ph_notif','gys_ph_batt','gys_ph_goal','gys_ph_week'].every(k=>GY_AUTONOMY_ACTIONS.some(a=>a.key===k));
  // 🎯 今日小目标：设一个 → 屏幕时间页出进度条 + 今天面板出目标行
  gysPhoneState().goal.min=0; await P.setGoal(); const gm=gysPhoneState().goal.min;
  gysPhoneOpen('time'); await s(120); const R2=document.getElementById('gys_phone');
  o.goal= gm>0 && !!R2 && /今天小目标/.test(R2.innerText) && !!R2.querySelector('.ph-goal .ph-bar u');
  o.mem=(typeof window.gyMemExList==='function'?window.gyMemExList():[]).includes('gysPh');
  o.page=!!document.getElementById('gys_phone');
  o.pl=(window.__prompts||[]).some(p=>{const t=typeof p==='string'?p:JSON.stringify(p);return /屏幕上是什么|第一反应/.test(t);});
})()`));

const r = await page.evaluate(() => window.__o);

check('原生识别（谷雨守护 1.0.0）', r.native);
check('开关默认关（def:false）', r.defOff);
check('屏幕使用时间页（时长/解锁83/24柱/最常用）', r.timeTab);
check('iOS 外壳（无外壳、底栏图标、返回图标）', r.iosShell);
check('按项权限默认不写死、能改', r.caps && r.setNo);
check('银行默认在「不许碰」名单', r.bankNever);
check('每天限时到点就锁', r.limitBlock);
check('安全名单/银行永不锁', r.safeNotBlocked);
check('TA 锁软件（临时锁+推原生+告诉她）', r.tempLock && r.pushNative && r.lockReach);
check('求再玩 10 分钟 → 给了', r.beg);
check('🆘 紧急解锁今天全解开', r.sos);
check('截屏看页面（识图+记录+丢图+告诉她）', r.shot);
check('读屏看字', r.read);
check('睡觉时间（调暗/勿扰/小音量）', r.bed);
check('换壁纸', r.wall);
check('设真闹钟 07:30', r.alarm);
check('心跳震动', r.buzz);
check('手电筒', r.torch);
check('剪贴板留言', r.clip);
check('通知（收微信、挡银行）', r.notif);
check('上下文注入【她的手机】', r.ctx);
check('自主行动全注册（含目标/周小结）', r.acts);
check('🎯 今日小目标（设置 + 进度条）', r.goal);
check('记忆总览 gysPh', r.mem);
check('页面在', r.page);
check('内置提示词 ph.see', r.pl);

await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 252 真手机 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}`));
if (errs.length) console.log('\n⚠️ 页面报错：\n' + [...new Set(errs)].slice(0, 20).join('\n'));
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length && !errs.length ? 0 : 1);
