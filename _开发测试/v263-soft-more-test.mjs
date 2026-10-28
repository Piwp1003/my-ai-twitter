// 263：软件补充——微信运动 / 朋友圈可见范围 / 聊天背景；抖音日常 / 热榜 / 连麦；网易云匹配度 / 定时关闭；小红书购物车 / 店铺
// 用法（项目根目录）：node _开发测试/v258-wechat-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const rd = f => JSON.parse(fs.readFileSync(path.join(root, '插件', '软件', f), 'utf8'));
const ALL = [];
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok) => results.push({ n, ok: !!ok });
const errs = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { const t = m.text(); if (/出错|错误/.test(t)) errs.push('CONSOLE ' + t.slice(0, 200)); });
page.on('dialog', d => d.accept());
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });

await page.evaluate(async ({ plugs }) => {
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  window.getApiConfig = () => ({ url: 'https://x.test/v1', key: 'k', model: 'm' });
  myCharacters.push({ id: 7001, name: 'Nico', persona: '乐队主唱，话不多', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  window.currentChatSessionId = 7001;
  const J = x => JSON.stringify(x);
  window.sendChatRequest = async (api, p) => {
    const t = typeof p === 'string' ? p : JSON.stringify(p); let c = '嗯。';
    if (/视频号/.test(t)) c = J([{ by: 'Nico', cover: '🎸', title: '排练室随手拍', desc: '新歌 demo', dur: '0:32', likes: 1200, cmts: [{ by: '路人', text: '好听' }] }, { by: '阿吱', cover: '🍜', title: '深夜放毒', desc: '', dur: '0:15', likes: 88, cmts: [] }]);
    else if (/小红书「直播」页/.test(t)) c = J([{ host: 'Nico', cover: '🎤', title: '深夜电台直播', viewers: 2300, goods: [{ name: '乐队周边T恤', price: '129' }], danmu: [{ by: '粉丝A', text: '来了' }] }]);
    else if (/直播「/.test(t) && /观众发弹幕/.test(t)) c = J({ host: '谢谢宝子', danmu: [{ by: '路人', text: '哈哈' }] });
    else if (/FaceTime/.test(t) && /留言/.test(t)) c = '没接到呀，我就是想你了，看到回我。';
    else if (/抖音「日常」/.test(t)) c = J({ scene: '窗外下雨', cap: '想你', ico: '🌧️' });
    else if (/抖音热榜/.test(t)) c = J([{ t: '今天降温了', heat: 1234.5, tag: '热' }, { t: '奶茶第二杯半价', heat: 88, tag: '新' }, { t: '猫咪表情包', heat: 520, tag: '' }]);
    else if (/音乐匹配度/.test(t)) c = '这个数字我很满意';
    else if (/定时关闭/.test(t)) c = '乖，早点睡';
    else if (/购物车里放着/.test(t)) c = J({ i: 1, say: '早就看你想要了' });
    else if (/家店「/.test(t)) c = J([{ name: '手作陶瓷杯', price: 68, emo: '☕', desc: '每只都不一样', sold: 300 }]);
    else if (/「市集」的商品推荐流/.test(t)) c = J([{ name: '奶油风马克杯', shop: '小鹿杂货铺', price: 39.9, emo: '☕', desc: '好看', sold: 1200 }, { name: '香薰蜡烛', shop: '小鹿杂货铺', price: 59, emo: '🕯️', desc: '好闻', sold: 800 }]);
    else if (/你们在微信上聊天/.test(t)) c = J([{ text: '在呢', quote: true }, { text: '想你了', voice: true }, { sticker: '一只猫猫探头' }, { text: '给你买奶茶', hb: 8.88, hbNote: '奶茶钱' }]);
    else if (/微信群「/.test(t)) c = J([{ by: 'Nico', text: '大家好' }]);
    else if (/你想在微信上给她发几条/.test(t)) c = J([{ text: '在干嘛' }, { photo: '窗外的云' }]);
    else if (/你要发一条微信朋友圈/.test(t)) c = J({ text: '今天排练好累', imgs: ['排练室'], loc: '上海' });
    else if (/微信公众号「/.test(t)) c = J({ title: '关于夏天的一些事', digest: '随便写写', body: '第一段。\n第二段。' });
    else if (/正在微信/.test(t)) c = '喂？听得到吗';
    else if (/设微信状态/.test(t)) c = J({ ico: '🎸', t: '排练中' });
    else if (/朋友圈「|发了一条微信朋友圈/.test(t)) c = '好看';
    else if (/直播」广场/.test(t)) c = J([{ host: '带货主播', ico: '🛍️', title: '全场九块九', scene: '一桌子货', viewers: 5000 }]);
    else if (/」推荐流/.test(t)) c = J([{ by: '干饭博主', ico: '🍜', scene: '一碗热气腾腾的面', cap: '深夜放毒 #美食', music: '晴天 - 周杰伦', dur: 15, likes: 12000 }, { by: 'Nico', ico: '🎸', scene: '排练室弹吉他', cap: '新歌 demo', dur: 30, likes: 300, loc: '上海' }, { by: '猫猫', ico: '🐱', scene: '猫打翻水杯', cap: '逆子', likes: 99 }]);
    else if (/发了一条视频。画面/.test(t)) c = J([{ by: '路人甲', text: '来了来了', likes: 50 }, { by: 'Nico', text: '好看', likes: 2 }]);
    else if (/你要发一条抖音/.test(t)) c = J({ ico: '🎹', scene: '弹了一段钢琴', cap: '给某人 #日常', music: '原声', dur: 20 });
    else if (/开一场直播/.test(t)) c = J({ title: '深夜弹琴', scene: '钢琴和台灯', ico: '🎹' });
    else if (/正在抖音直播/.test(t)) c = J({ host: '欢迎大家，也欢迎某个人', danmu: [{ by: '粉丝A', text: '来了' }, { by: '粉丝B', text: '', gift: '玫瑰' }] });
    else if (/抖音私信里聊天/.test(t)) c = J([{ text: '哈哈哈这个好像你' }]);
    else if (/在刷抖音，刷到了/.test(t)) c = J({ i: 1, say: '你看这个' });
    else if (/刷到她发的抖音/.test(t)) c = '拍得真好';
    else if (/回她一句（评论区口吻/.test(t)) c = '谢谢宝';
    else if (/你去这首歌的评论区写一条评论/.test(t)) c = '这首歌是你推荐给我的';
    else if (/每日推荐/.test(t)) c = J([{ t: '晴天', a: '周杰伦', why: '根据你喜欢的推荐' }, { t: '后来', a: '刘若英', why: '冷门好歌' }, { t: '夜曲', a: '周杰伦' }]);
    else if (/的评论区/.test(t)) c = J([{ by: '深夜网友', text: '2026 年还有人在听吗', likes: 999 }, { by: 'Nico', text: '想起一个人', likes: 3 }]);
    else if (/听歌排行/.test(t)) c = J({ week: [{ t: '夜曲', a: '周杰伦', n: 30 }, { t: 'Creep', a: 'Radiohead', n: 12 }], all: [{ t: 'Creep', a: 'Radiohead' }], say: '最近在听老歌' });
    else if (/用户搜了/.test(t)) c = J([{ t: '七里香', a: '周杰伦', al: '七里香' }]);
    else if (/给她做一个歌单/.test(t)) c = J({ name: '给你的夏天', desc: '你懂的', songs: [{ t: '晴天', a: '周杰伦', why: '那天你哼过' }] });
    else if (/「云村」发一条动态/.test(t)) c = J({ t: 'Creep', a: 'Radiohead', text: '今天有点丧' });
    else if (/私人 FM/.test(t)) c = J([{ t: '光年之外', a: '邓紫棋' }, { t: '稻香', a: '周杰伦' }]);
    else if (/回她一句|评论一句/.test(t)) c = '好听';
    else if (/刷到了这些/.test(t)) c = J({ i: 1, say: ['你看这个', '好像你'] });
    else if (/转发抽奖/.test(t)) c = J({ text: '转发抽一位送奶茶', prize: '一杯奶茶', n: 1 });
    else if (/年度寄语/.test(t)) c = '这一年谢谢你一直在。';
    return { choices: [{ message: { content: c } }] };
  };
  try { sendChatRequest = window.sendChatRequest; } catch (e) {}
  window.sendProactiveChatMessage = async () => {}; try { sendProactiveChatMessage = window.sendProactiveChatMessage; } catch (e) {}
  window.addNotification = () => {}; try { addNotification = window.addNotification; } catch (e) {}
  window.appConfirm = async () => true;
  plugs.forEach(p => executePluginOnLoad(p));
  await new Promise(r => setTimeout(r, 400));
  // 苹果弹窗不用等点击
  GYS.input = async (q, d) => (/附一句话/.test(q) ? '你看这条' : /抽什么/.test(q) ? '签名照' : /抽几个/.test(q) ? '1' : (d == null ? 'x' : d || 'x'));
  window.__pick = [0, 0]; GYS.sheet = async (opts, title) => title === '发给谁？' ? Math.max(0, opts.findIndex(x => /Nico/.test(x))) : (window.__pick.length ? window.__pick.shift() : 0);
  GYS.confirm = async () => true;
  GYS.dialog = async (o) => (o && o.input ? (o.def || 'x') : true);
}, { plugs: ALL });


let SHN = 0; const SHOT = false;
const step = async (name, fn) => {
  try { await page.evaluate(fn); if (SHOT) await page.screenshot({ path: `_tmp/s263-${++SHN}.png` }); }
  catch (e) { console.log(`\n💥 「${name}」\n${e.message}`); console.log([...new Set(errs)].join('\n')); await browser.close(); process.exit(1); }
};
const sfn = 'const s=ms=>new Promise(r=>setTimeout(r,ms));const o=window.__o||(window.__o={});const A=k=>GY_AUTONOMY_ACTIONS.find(a=>a.key===k);const c=myCharacters.find(x=>x.id===7001);';
await step('微信运动', new Function(`return (async()=>{${sfn}
  gysWechatOpen('chats'); await s(150); const R=document.getElementById('gys_wechat');
  o.runRow=/微信运动/.test(R.innerText);
  gysWx.run(); await s(150); o.runPage=!!R.querySelector('.wx-rr') && /排行榜冠军/.test(R.innerText);
  GYS.input=async()=>'12345'; await gysWx.runEdit('me'); o.edit=/12,345/.test(R.innerText);
  gysWx.runLike('c:7001'); o.like=!!R.querySelector('.wx-rr i.on');
  const r=await A('gys_wx_run_like').run(c); o.taLike=!!r && Object.keys(gysWxState().run[Object.keys(gysWxState().run)[0]].lkMe).length===1;
  GYS.back('wechat');
})()`));
await step('聊天背景 + 聊天信息', new Function(`return (async()=>{${sfn}
  const R=document.getElementById('gys_wechat'); gysWx.open('c:7001'); await s(150); gysWx.info('c:7001'); await s(120); o.info=/设置当前聊天背景/.test(R.innerText) && /查找聊天记录/.test(R.innerText);
  window.__pick=[1,4]; await gysWx.bgSet('c:7001'); await s(150); o.bgSet=gysWxState().th['c:7001'].bg==='#e1ecf4';
  GYS.back('wechat'); await s(150); o.bgApplied=/225, 236, 244/.test(getComputedStyle(R.querySelector('.gys-body')).backgroundColor);
  GYS.back('wechat');
})()`));
await step('朋友圈：不给谁看', new Function(`return (async()=>{${sfn}
  GYS.input=async(q,d)=>/想法/.test(q)?'只给自己看的':''; window.__pick=[1,3,0,1];
  await gysWx.post(); const m=gysWxState().my[0]; o.vis=m.vis && m.vis.mode==='except' && m.vis.who.includes('c:7001');
  o.taNoLike=!A('gys_wx_like').need(c);
})()`));
await step('抖音日常', new Function(`return (async()=>{${sfn}
  const r=await A('gys_dy_daily').run(c); o.taDaily=!!r && gysDyState().daily.some(d=>d.by==='c:7001');
  gysDouyinOpen('friend'); await s(150); const R=document.getElementById('gys_douyin'); o.ring=!!R.querySelector('.dy-dly b.ring:not(.seen)');
  gysDy.dailyView('c:7001'); await s(120); o.view=/窗外下雨/.test(R.innerText);
  document.getElementById('dyDvIn').value='好看'; gysDy.dailyReply(gysDyState().daily[0].id); o.reply=gysDyState().dms['c:7001'].msgs.some(m=>/回复了日常/.test(m.text));
  GYS.back('douyin'); await s(100); o.seen=!!R.querySelector('.dy-dly b.ring.seen');
})()`));
await step('抖音热榜', new Function(`return (async()=>{${sfn}
  gysDy.searchPage(); await s(600); const R=document.getElementById('gys_douyin'); o.hot=/抖音热榜/.test(R.innerText) && /今天降温了/.test(R.innerText) && !!R.querySelector('.dy-hr em.r1'); GYS.back('douyin');
})()`));
await step('抖音连麦', new Function(`return (async()=>{${sfn}
  const l={ id:'dl_t', host:'c:7001', ta:1, title:'深夜弹琴', scene:'钢琴', ico:'🎹', viewers:100, lines:[], at:Date.now(), end:0, gifts:0, likes:0 }; gysDyState().lives.unshift(l);
  const r=await A('gys_dy_mic').run(c); o.micAct=!!r;
  await gysDouyinMicInvite('dl_t'); await s(1200); const R=document.getElementById('gys_douyin'); o.mic=!!l.mic && !!R.querySelector('.dy-mic');
  gysDy.micEnd('dl_t'); await s(200); o.micEnd=!l.mic && (l.micLog||[]).length===1;
})()`));
await step('网易云匹配度 + 定时关闭', new Function(`return (async()=>{${sfn}
  gysMusicOpen('home'); await s(100); await gysMu.prof('c:7001'); await s(900);
  const D=gysMuState(); const ids=Object.values(D.songs).filter(x=>/夜曲|Creep/.test(x.t)).map(x=>x.id); o.__ids=ids.length;
  for (const id of ids) await gysMu.play(id, true);
  const R=document.getElementById('gys_music'); GYS.repaint('music'); await s(100); o.matchBar=!!R.querySelector('.mu-mtb') && /%/.test(R.querySelector('.mu-mtb').innerText);
  gysMu.match('c:7001'); await s(120); o.matchPage=/音乐匹配度/.test(R.innerText) && /夜曲|Creep/.test(R.innerText);
  const r=await A('gys_mu_match').run(c); o.matchSay=!!r && /满意/.test(r.text);
  window.__pick=[0]; await gysMu.timer(); o.timer=/分钟/.test(gysMuTimerLeft());
  window.__pick=[7]; await gysMu.timer(); o.timerOff=gysMuTimerLeft()==='';
})()`));
await step('小红书购物车 + 店铺', new Function(`return (async()=>{${sfn}
  gysRedOpen && gysRedOpen('mall'); await s(700); const R=document.getElementById('gys_red'); const D=gysRdState? gysRdState():null;
  const g=(window.__rdD=D).goods[0]; gysRd.good(g.id); await s(120); o.bar=/加入购物车/.test(R.innerText) && /店铺/.test(R.innerText);
  gysRd.addCart(g.id); gysRd.addCart(D.goods[1].id); gysRd.cart(); await s(120); o.cart=R.querySelectorAll('.rd-ci').length===2 && /结算\\(2\\)/.test(R.innerText);
  gysRd.cartSel(g.id); await s(50); o.sel=/结算\\(1\\)/.test(R.innerText);
  await gysRd.cartPay(); o.pay=D.cart.length===1 && D.orders.some(x=>x.gid===D.goods[1].id);
  const r=await A('gys_red_cart').run(c); o.taCart=!!r && D.cart.length===0 && D.orders.some(x=>x.cart && x.from==='c:7001');
  gysRd.shop('小鹿杂货铺'); await s(120); o.shop=/小鹿杂货铺/.test(R.innerText) && /粉丝/.test(R.innerText) && R.querySelectorAll('.rd-shop .rd-gc').length>=2;
  await gysRd.shopMore('小鹿杂货铺'); o.shopMore=D.goods.some(x=>x.name==='手作陶瓷杯' && x.shop==='小鹿杂货铺');
})()`));
await step('今天面板 / 小组件 / 记忆总览都挂上了', new Function(`return (async()=>{${sfn}
  o.feats=['gysWxRun','gysDyDaily','gysDyMic','gysMuMatch','gysMuTimer','gysRedCart'].every(id=>GYX.FEATS.some(f=>f.id===id));
  o.acts=['gys_wx_run_like','gys_dy_daily','gys_dy_daily_see','gys_dy_mic','gys_mu_match','gys_mu_timer','gys_red_cart'].every(k=>!!A(k));
})()`));
if (process.argv.includes('--shot')) {
  const SH = [['run', "GYS.close('red');gysWechatOpen('chats');gysWx.run()"], ['wxlist', "GYS.back('wechat')"], ['dminfo', "gysWx.open('c:7001');gysWx.info('c:7001')"], ['wxchat', "GYS.back('wechat')"],
    ['dyfriend', "GYS.close('wechat');gysDouyinOpen('friend')"], ['daily', "gysDy.dailyView('c:7001')"], ['hot', "GYS.back('douyin');gysDy.searchPage()"],
    ['mic', "GYS.back('douyin');const l=gysDyState().lives.find(x=>x.id==='dl_t');l.mic={at:Date.now()};gysDy.room('dl_t')"],
    ['match', "GYS.close('douyin');gysMusicOpenMatch('c:7001')"], ['muprof', "GYS.back('music')"], ['player', "gysMusicOpenPlayer()"],
    ['good', "GYS.close('music');gysRedOpen('mall');gysRd.good(gysRdState().goods[0].id)"], ['cart', "gysRd.addCart(gysRdState().goods[0].id);gysRd.addCart(gysRdState().goods[2].id);gysRd.cart()"], ['shop', "gysRd.shop('小鹿杂货铺')"]];
  for (const [n, js] of SH) { try { await page.evaluate(js); } catch (e) { console.log('shot', n, e.message); } await page.waitForTimeout(500); await page.screenshot({ path: `_tmp/s263-${n}.png` }); }
}
const r = await page.evaluate(() => window.__o);
check('微信运动：聊天列表有一行', r.runRow); check('微信运动：排行榜页', r.runPage); check('微信运动：改步数', r.edit); check('微信运动：点赞', r.like); check('微信运动：TA 点赞', r.taLike);
check('聊天信息：查找 / 背景', r.info); check('聊天背景：设上了', r.bgSet); check('聊天背景：聊天页用上了', r.bgApplied);
check('朋友圈：不给谁看', r.vis); check('朋友圈：看不到的人不会来点赞', r.taNoLike);
check('抖音日常：TA 发', r.taDaily); check('抖音日常：彩圈', r.ring); check('抖音日常：能看', r.view); check('抖音日常：回复进私信', r.reply); check('抖音日常：看过变灰', r.seen);
check('抖音热榜', r.hot); check('连麦：TA 邀请', r.micAct); check('连麦：分屏', r.mic); check('连麦：挂断留记录', r.micEnd);
check('网易云：匹配度条', r.matchBar); check('网易云：匹配度页', r.matchPage); check('网易云：TA 说匹配度', r.matchSay); check('定时关闭：设', r.timer); check('定时关闭：取消', r.timerOff);
check('小红书商品页底栏', r.bar); check('购物车：两件', r.cart); check('购物车：勾选', r.sel); check('购物车：结算', r.pay); check('TA 偷买购物车', r.taCart); check('店铺页', r.shop); check('店铺上新', r.shopMore);
check('开关都有', r.feats); check('自主行动都有', r.acts);
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 263 软件补充 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}`));
if (errs.length) console.log('\n⚠️ 页面事件：\n' + [...new Set(errs)].slice(0, 15).join('\n'));
console.log(`\n${pass}/${results.length} 通过`, JSON.stringify({ ids: r.__ids }));
process.exit(pass === results.length && !errs.length ? 0 : 1);
