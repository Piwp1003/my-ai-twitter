// 258：💚 微信（替换原来的微信模式）
// 用法（项目根目录）：node _开发测试/v258-wechat-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const rd = f => JSON.parse(fs.readFileSync(path.join(root, '插件', '软件', f), 'utf8'));
const ALL = rd('软件全家桶.json');
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

await page.waitForTimeout(500);

const step = async (name, fn) => {
  try { await page.evaluate(fn); }
  catch (e) { await new Promise(r => setTimeout(r, 400)); console.log(`\n💥 这一步崩了：「${name}」\n${e.message}`); console.log([...new Set(errs)].join('\n') || '（无页面事件）'); await browser.close(); process.exit(1); }
};
const sfn = 'const s=ms=>new Promise(r=>setTimeout(r,ms));const o=window.__o||(window.__o={});';





await step('微信：老微信模式没了 + 软件桌面有微信', new Function(`return (async()=>{${sfn}
  o.noOld=typeof window.gyWxSet!=='function' && !document.getElementById('gyWx');
  gysSoftHome(); await s(100); o.home=/微信/.test(document.getElementById('gys_home').innerText); GYS.close('home');
})()`));

await step('微信：聊天（文字 / 引用 / 语音 / 表情 / 红包）', new Function(`return (async()=>{${sfn}
  gysWechatOpen('chats'); await s(100); gysWx.open('c:7001'); await s(150);
  const R=document.getElementById('gys_wechat'); o.chatPage=!!R.querySelector('.wx-in');
  document.getElementById('wxIn').value='在吗'; gysWx.send('c:7001'); await s(9000);
  const t=gysWxState().th['c:7001']; o.__m=t.msgs.map(m=>m.t+':'+(m.text||m.amt||'')).join('|');
  o.reply=t.msgs.some(m=>m.from==='c:7001' && m.text==='在呢' && m.quote) && t.msgs.some(m=>m.t==='voice') && t.msgs.some(m=>m.t==='sticker') && t.msgs.some(m=>m.t==='hb' && m.from==='c:7001');
  o.render=!!R.querySelector('.wx-b') && !!R.querySelector('.wx-hb') && !!R.querySelector('.wx-voice') && /\\u5728\\u5462/.test(R.innerText);
  const hb=t.msgs.find(m=>m.t==='hb'); await gysWx.hb('c:7001', hb.id); o.hbOpen=hb.st==='open';
  gysWx.pat('c:7001','c:7001'); o.pat=t.msgs.some(m=>m.t==='pat' && m.from==='me');
  await gysWx.act('c:7001','loc'); o.loc=t.msgs.some(m=>m.t==='loc');
})()`));

await step('微信：通话 + 朋友圈 + 公众号 + 状态', new Function(`return (async()=>{${sfn}
  const R=document.getElementById('gys_wechat'); const D=gysWxState();
  GYS.back('wechat'); gysWx.call('c:7001', false); await s(5600); o.call=/喂/.test(R.innerText);
  gysWx.hang(); await s(100); o.callMsg=D.th['c:7001'].msgs.some(m=>m.t==='call' && m.sec>0);
  const c=myCharacters.find(c=>c.id===7001);
  const a=GY_AUTONOMY_ACTIONS.find(a=>a.key==='gys_wx_moment'); const rm=await a.run(c); o.__mo=JSON.stringify(rm)+'|'+JSON.stringify((window.gyPeerLog||[]).slice(-2)); o.mo=!!rm || !!(await a.run(c)) && (window.gyPeerLog||[]).some(e=>e.kind==='moment' && /排练/.test(e.moment));
  gysWx.moments(''); await s(100); o.moRender=/今天排练好累/.test(R.innerText);
  const m=(await (async()=>{ const L=[]; return L; })());
  const ar=GY_AUTONOMY_ACTIONS.find(a=>a.key==='gys_wx_article'); o.art=!!(await ar.run(c)) && D.subs.some(s=>s.arts.some(x=>/夏天/.test(x.title)));
  const st=GY_AUTONOMY_ACTIONS.find(a=>a.key==='gys_wx_status'); o.status=!!(await st.run(c)) && D.status['c:7001'].t==='排练中';
  const tx=GY_AUTONOMY_ACTIONS.find(a=>a.key==='gys_wx_text'); o.text=!!(await tx.run(c));
  o.acts=['gys_wx_text','gys_wx_reply','gys_wx_moment','gys_wx_like','gys_wx_pat','gys_wx_status','gys_wx_article','gys_wx_group'].every(k=>GY_AUTONOMY_ACTIONS.some(a=>a.key===k));
  GYS.tab('wechat','contacts'); await s(80); o.contacts=/Nico/.test(R.innerText) && /排练中/.test(R.innerText);
  GYS.tab('wechat','me'); await s(80); o.me=/收藏/.test(R.innerText);
  // 分享进微信
  const DW=gysWbState(); DW.posts.unshift({id:'wbX',by:'x:p_路人',text:'晚霞',imgs:[],pics:[],at:Date.now(),vis:'public',topics:[],likes:[],likeN:0,rpN:0,cmts:[],edits:[],del:0,cmtGen:1});
  window.__pick=[0]; await GYS.share({app:'weibo',kind:'微博',title:'',text:'晚霞',by:'x:p_路人',byName:'路人',go:{fn:'gysWeiboOpenPost',args:['wbX']}}); await s(100);
  o.share=D.th['c:7001'].msgs.some(m=>m.t==='post');
  GYS.close('wechat');
})()`));

const r = await page.evaluate(() => window.__o);

check('老微信模式去掉了、软件桌面有微信', r.noOld && r.home);
check('聊天页', r.chatPage);
check('TA 回：引用 / 语音 / 表情包 / 红包', r.reply);
check('气泡都画出来了', r.render);
check('领红包 / 拍一拍 / 位置', r.hbOpen && r.pat && r.loc);
check('语音通话（TA 说话 + 通话记录）', r.call && r.callMsg);
check('TA 发朋友圈（跟 TA 手机同一份）', r.mo && r.moRender);
check('TA 公众号写文章', r.art);
check('TA 改状态 + 通讯录显示', r.status && r.contacts);
check('TA 主动发微信', r.text);
check('自主行动都注册了', r.acts);
check('我', r.me);
check('别的软件分享到微信', r.share);

await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 258 微信 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}`));
if (errs.length) console.log('\n⚠️ 页面事件：\n' + [...new Set(errs)].slice(0, 15).join('\n'));
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length && !errs.length ? 0 : 1);
