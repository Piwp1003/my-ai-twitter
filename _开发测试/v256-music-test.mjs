// 256：📱 软件桌面 + 🎵 网易云音乐
// 用法（项目根目录）：node _开发测试/v256-music-test.mjs
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



await step('软件桌面', new Function(`return (async()=>{${sfn}
  gysSoftHome(); await s(150);
  const R=document.getElementById('gys_home'); o.home=!!R && R.classList.contains('on') && R.querySelectorAll('.gys-hmi').length>=6 && /网易云/.test(R.innerText);
  o.homeIm=/iMessage/.test(R.innerText);
  [...R.querySelectorAll('.gys-hmi')].find(x=>/网易云/.test(x.innerText)).click(); await s(200);
  const M=document.getElementById('gys_music'); o.homeOpen=GYS.isOpen('music') && getComputedStyle(M).zIndex==='2701';
  GYS.close('music'); GYS.close('home');
})()`));

await step('网易云：发现页 + 每日推荐', new Function(`return (async()=>{${sfn}
  gysMusicOpen('home'); await s(400);
  const D=gysMuState(); o.daily=!!D.daily && D.daily.ids.length===3;
  const R=document.getElementById('gys_music'); o.homeRender=/每日推荐/.test(R.innerText) && /晴天/.test(R.innerText);
  gysMu.daily(); await s(120); o.dailyPage=/根据你喜欢的推荐/.test(R.innerText);
  const id=D.daily.ids[0]; gysMu.playIn(D.daily.ids,0); await s(200);
  o.player=!!R.querySelector('.mu-player .mu-vinyl') && /晴天/.test(R.innerText) && /没有音源/.test(R.innerText);
  o.played=(D.plays.me||{})[id]===1 && D.hist[0].id===id;
  gysMu.like(id); o.liked=(D.likes.me||[]).includes(id);
  gysMu.lyr(); await s(60); o.lyr=!!R.querySelector('.mu-lyr'); gysMu.lyr();
  gysMu.cmts(id); await s(300); o.cmts=D.songs[id].cmts.length>=2 && /2026 年还有人在听吗/.test(R.innerText);
  gysMu.cs('new'); await s(50);
  document.getElementById('muCin').value='好听哭了'; await gysMu.send(id); await s(80); o.myCmt=D.songs[id].cmts.some(c=>c.by==='me');
  GYS.close('music');
})()`));

await step('网易云：主页 / 排行 / 搜索 / FM / 云村 / 歌单', new Function(`return (async()=>{${sfn}
  gysMusicOpen('home'); await s(100);
  gysMu.prof('c:7001'); await s(300); const D=gysMuState(); const R=document.getElementById('gys_music');
  o.rank=!!D.rank['c:7001'] && /夜曲/.test(R.innerText) && /正在听/.test(R.innerText);
  gysMu.search('七里香'); await s(300); o.search=/七里香/.test(R.innerText);
  GYS.tab('music','fm'); await s(300); o.fm=D.fm.length>=1 && !!R.querySelector('.mu-fmc');
  gysMu.fmNext(); await s(50);
  const c=myCharacters.find(c=>c.id===7001);
  const a1=GY_AUTONOMY_ACTIONS.find(a=>a.key==='gys_mu_post'); const r1=await a1.run(c); o.post=!!r1 && D.posts.some(p=>p.by==='c:7001' && /丧/.test(p.text));
  GYS.tab('music','post'); await s(100); o.postRender=/今天有点丧/.test(R.innerText);
  const a2=GY_AUTONOMY_ACTIONS.find(a=>a.key==='gys_mu_list'); const r2=await a2.run(c); o.list=!!r2 && D.lists.some(l=>l.name==='给你的夏天');
  const l=D.lists.find(l=>l.name==='给你的夏天'); gysMu.list(l.id); await s(100); o.listPage=/那天你哼过/.test(R.innerText);
  const a3=GY_AUTONOMY_ACTIONS.find(a=>a.key==='gys_mu_cmt'); const r3=await a3.run(c); o.taCmt=!!r3;
  o.acts=['gys_mu_post','gys_mu_list','gys_mu_cmt','gys_mu_listen'].every(k=>GY_AUTONOMY_ACTIONS.some(a=>a.key===k));
  GYS.tab('music','me'); await s(100); o.me=/我喜欢的音乐/.test(R.innerText) && /给你的夏天/.test(R.innerText);
  gysMu.report(); await s(100); o.report=/年度听歌报告/.test(R.innerText);
  GYS.close('music');
})()`));

const r = await page.evaluate(() => window.__o);
check('软件桌面：图标一页', r.home && r.homeIm);
check('软件桌面：点图标打开、在最上面', r.homeOpen);
check('每日推荐（生成 + 发现页）', r.daily && r.homeRender && r.dailyPage);
check('黑胶播放页（没音源也能「听」）', r.player && r.played);
check('红心 / 歌词页', r.liked && r.lyr);
check('评论区（热评 + 你发评论）', r.cmts && r.myCmt);
check('TA 主页：听歌排行 + 正在听', r.rank);
check('搜索', r.search);
check('私人 FM', r.fm);
check('云村：TA 分享歌', r.post && r.postRender);
check('TA 给你做歌单', r.list && r.listPage);
check('TA 去评论区', r.taCmt);
check('自主行动都注册了', r.acts);
check('我的 + 年度报告', r.me && r.report);

await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 256 网易云 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}`));
if (errs.length) console.log('\n⚠️ 页面事件：\n' + [...new Set(errs)].slice(0, 15).join('\n'));
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length && !errs.length ? 0 : 1);
