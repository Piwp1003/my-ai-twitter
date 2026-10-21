// 254：软件补包——微博视频号、小红书直播 + 年度报告、豆瓣打卡日历 + 年度总结、iMessage 歌卡 + 共享相簿 + FaceTime 留言
// 用法（项目根目录）：node _开发测试/v254-soft3-test.mjs
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
    else if (/分享给她|分享给你|听到一首歌/.test(t)) c = J({ title: '晴天', artist: '周杰伦', say: '听到这个想到你' });
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
  GYS.input = async (q, d) => (/歌名/.test(q) ? '晴天' : /歌手/.test(q) ? '周杰伦' : /照片是什么/.test(q) ? '我们的猫' : (d == null ? 'x' : d || 'x'));
  GYS.confirm = async () => true;
  GYS.dialog = async (o) => (o && o.input ? (o.def || 'x') : true);
}, { plugs: ALL });

await page.waitForTimeout(500);

const step = async (name, fn) => {
  try { await page.evaluate(fn); }
  catch (e) { await new Promise(r => setTimeout(r, 400)); console.log(`\n💥 这一步崩了：「${name}」\n${e.message}`); console.log([...new Set(errs)].join('\n') || '（无页面事件）'); await browser.close(); process.exit(1); }
};
const sfn = 'const s=ms=>new Promise(r=>setTimeout(r,ms));const o=window.__o||(window.__o={});';

await step('微博视频号', new Function(`return (async()=>{${sfn}
  await gysWb.videoGen(); await s(150);
  const D=gysWbState(); o.wbVideo = (D.videos||[]).length>=2 && D.videos.some(v=>/排练室/.test(v.title));
  gysWeiboOpen('find'); await s(200);
  const R=document.getElementById('gys_weibo'); o.wbFind=!!R && /视频号/.test(R.innerText);
  const v=D.videos[0]; gysWb.videoOpen(v.id); await s(120);
  o.wbPlay=/排练室|排练/.test(R.innerText) && !!R.querySelector('.wb-vplay');
  GYS.close('weibo');
})()`));

await step('小红书直播 + 年度报告', new Function(`return (async()=>{${sfn}
  await gysRd.liveGen(); await s(150);
  const D=gysRedState(); o.rdLive=(D.lives||[]).some(v=>v.on && /电台/.test(v.title));
  gysRedLive(); await s(150);
  const R=document.getElementById('gys_red');
  const lv=D.lives.find(x=>x.on); gysRd.liveOpen(lv.id); await s(150);
  o.rdRoom=!!R.querySelector('.rd-lstage') && /周边T恤|电台/.test(R.innerText);
  gysRedOpen('me'); await s(120); gysRedState().notes.push({id:'n_y',by:'me',title:'测试',body:'x',at:Date.now(),likes:['a','b'],favs:[],favBy:{},cmts:[],ch:'日常',vis:'pub'});
  gysRd.yearReport(); await s(150);
  o.rdYear=/年度报告/.test(document.getElementById('gys_red').innerText);
  GYS.close('red');
})()`));

await step('豆瓣打卡日历 + 年度总结', new Function(`return (async()=>{${sfn}
  const D=gysDbState(); D.items.x1={id:'x1',kind:'movie',title:'情书',score:8.9}; D.items.x2={id:'x2',kind:'book',title:'活着',score:9.4};
  D.marks.me={x1:{st:'done',star:5,at:Date.now()},x2:{st:'done',star:4,at:Date.now()}};
  D.marks['c:7001']={x1:{st:'done',star:5,at:Date.now()}};
  gysDoubanOpen('me'); await s(150);
  gysDb.calendar(); await s(150);
  const R=document.getElementById('gys_douban'); o.dbCal=/连续打卡/.test(R.innerText) && !!R.querySelector('.db-calgrid i.on');
  GYS.back('douban'); await s(60);
  gysDb.yearly(); await s(150);
  o.dbYear=/年度总结/.test(R.innerText) && /部作品/.test(R.innerText);
  GYS.close('douban');
})()`));

await step('iMessage 歌卡 + 共享相簿 + FaceTime 留言', new Function(`return (async()=>{${sfn}
  const DD=gysImState(); DD.th['c:7001']=DD.th['c:7001']||{id:'c:7001',kind:'dm',who:'c:7001',members:['c:7001'],name:'',photo:'',msgs:[{id:'m0',from:'c:7001',t:'text',text:'在吗',at:Date.now(),react:{}}],album:[],pin:false,mute:false,unread:0,at:Date.now(),sched:[]};
  gysImsgOpen(); await s(100); gysIm.open('c:7001'); await s(120);
  await gysIm.song('c:7001'); await s(120);
  const D=gysImState(); const th=D.th['c:7001'];
  o.imSong=(th.msgs||[]).some(m=>m.t==='song' && /晴天/.test(m.title||''));
  o.__imMsgs=(th.msgs||[]).map(m=>m.t+(m.title?':'+m.title:'')).join(',');
  const R=document.getElementById('gys_imsg'); o.imSongCard=!!R.querySelector('.im-song');
  // 共享相簿：加一张文字照片
  th.album=th.album||[]; th.album.push({by:'me',desc:'我们的猫',at:Date.now()});
  gysIm.album('c:7001'); await s(150);
  o.imAlbum=!!document.getElementById('gys_imsg').querySelector('.im-albc');
  GYS.back('imsg'); await s(60);
  // FaceTime 留言
  await gysIm.ftLeave('c:7001'); await s(150);
  o.imFt=(gysImState().th['c:7001'].msgs||[]).some(m=>m.t==='ftmsg');
  GYS.close('imsg');
})()`));

await step('自主行动注册', new Function(`return (async()=>{${sfn}
  o.acts=['gys_wb_video','gys_red_live','gys_im_song','gys_im_album'].every(k=>GY_AUTONOMY_ACTIONS.some(a=>a.key===k));
})()`));

const r = await page.evaluate(() => window.__o);
console.log('DBG imMsgs=', r.__imMsgs);
check('微博视频号（生成 + 发现页入口）', r.wbVideo && r.wbFind);
check('微博视频号 播放页', r.wbPlay);
check('小红书直播（生成正在直播）', r.rdLive);
check('小红书直播间（舞台 + 商品 + 弹幕）', r.rdRoom);
check('小红书年度报告', r.rdYear);
check('豆瓣打卡日历（连续天数 + 绿点）', r.dbCal);
check('豆瓣年度总结', r.dbYear);
check('iMessage 歌卡（发送 + 卡片）', r.imSong && r.imSongCard);
check('iMessage 共享相簿', r.imAlbum);
check('iMessage FaceTime 留言', r.imFt);
check('新自主行动全注册', r.acts);

await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 254 软件补包 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}`));
if (errs.length) console.log('\n⚠️ 页面事件：\n' + [...new Set(errs)].slice(0, 15).join('\n'));
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length && !errs.length ? 0 : 1);
