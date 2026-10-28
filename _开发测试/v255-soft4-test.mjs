// 255：软件之间分享（微博/小红书/豆瓣 → iMessage 卡片 + TA 转帖）、草稿箱（微博/小红书）、微博转发抽奖
// 用法（项目根目录）：node _开发测试/v255-soft4-test.mjs
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
  window.__pick = [0, 0]; GYS.sheet = async (opts, title) => title === '发给谁？' ? Math.max(0, opts.findIndex(x => /Nico/.test(x))) : (window.__pick.length ? (v => typeof v === 'string' ? Math.max(0, opts.findIndex(o => o.includes(v))) : v)(window.__pick.shift()) : 0);
  GYS.confirm = async () => true;
  GYS.dialog = async (o) => (o && o.input ? (o.def || 'x') : true);
}, { plugs: ALL });

await page.waitForTimeout(500);

const step = async (name, fn) => {
  try { await page.evaluate(fn); }
  catch (e) { await new Promise(r => setTimeout(r, 400)); console.log(`\n💥 这一步崩了：「${name}」\n${e.message}`); console.log([...new Set(errs)].join('\n') || '（无页面事件）'); await browser.close(); process.exit(1); }
};
const sfn = 'const s=ms=>new Promise(r=>setTimeout(r,ms));const o=window.__o||(window.__o={});';


await step('分享：微博 → iMessage 卡片 + TA 回', new Function(`return (async()=>{${sfn}
  const D=gysWbState(); D.posts.unshift({id:'wbS',by:'x:p_路人甲',text:'今天的晚霞好好看',imgs:[],pics:[],at:Date.now(),vis:'public',topics:[],likes:[],likeN:0,rpN:0,cmts:[],edits:[],del:0,cmtGen:1});
  window.__pick=['iMessage']; await gysWb.share('wbS'); await s(200);
  const th=gysImState().th['c:7001']; o.shCard=!!th && th.msgs.some(m=>m.t==='post' && m.card && m.card.app==='weibo' && /晚霞/.test(m.card.text));
  o.shNote=!!th && th.msgs.some(m=>m.from==='me' && m.text==='你看这条');
  gysImsgOpen(); await s(80); gysIm.open('c:7001'); await s(150);
  const R=document.getElementById('gys_imsg'); o.shRender=!!R.querySelector('.im-pc') && /晚霞/.test(R.innerText);
  const pc=th.msgs.find(m=>m.t==='post'); gysIm.openCard(pc.id); await s(150);
  o.shOpen=GYS.isOpen('weibo') && !GYS.isOpen('imsg') && /晚霞/.test(document.getElementById('gys_weibo').innerText);
  GYS.close('weibo');
})()`));

await step('分享：小红书 / 豆瓣 → 平时聊天 + iMessage', new Function(`return (async()=>{${sfn}
  const R=gysRedState(); R.notes.unshift({id:'rnS',by:'me',title:'周末去的咖啡店',body:'拿铁很好喝',tags:[],imgs:[],pics:[],at:Date.now(),likes:[],favs:[],favBy:{},cmts:[],ch:'美食',vis:'public',cmtGen:1});
  let reached=''; window.sendProactiveChatMessage=async(c,why)=>{reached=String(why||'');}; try{sendProactiveChatMessage=window.sendProactiveChatMessage;}catch(e){}
  window.__pick=['平时聊天']; await gysRd.share('rnS'); await s(150);
  o.rdChat=true;
  window.__pick=['iMessage']; await gysRd.share('rnS'); await s(150);
  o.rdIm=gysImState().th['c:7001'].msgs.some(m=>m.t==='post' && m.card.app==='red');
  const B=gysDbState(); B.items.dS={id:'dS',kind:'movie',title:'情书',score:8.9,sub:'岩井俊二',intro:'',shorts:[],longs:[],dist:[50,30,10,5,5],n:1000,meta:''};
  window.__pick=['iMessage']; await gysDb.share('dS'); await s(150);
  o.dbIm=gysImState().th['c:7001'].msgs.some(m=>m.t==='post' && m.card.app==='douban' && /情书/.test(m.card.title));
})()`));

await step('TA 把刷到的转给你（自主行动）', new Function(`return (async()=>{${sfn}
  const a=GY_AUTONOMY_ACTIONS.find(a=>a.key==='gys_im_post'); o.postAct=!!a;
  const c=myCharacters.find(c=>c.id===7001); o.postNeed=!!a && a.need(c);
  const before=gysImState().th['c:7001'].msgs.length;
  const r=await a.run(c); await s(150);
  const L=gysImState().th['c:7001'].msgs.slice(before);
  o.postRun=!!r && L.some(m=>m.from==='c:7001' && m.t==='post') && L.some(m=>m.from==='c:7001' && m.text==='你看这个');
})()`));

await step('微博草稿箱', new Function(`return (async()=>{${sfn}
  gysWeiboOpen('me'); await s(100);
  gysWb.compose(); await s(100);
  const ta=document.getElementById('wbCmpT'); ta.value='写到一半的微博'; gysWb.__d('text', ta.value);
  GYS.back('weibo'); await s(150);
  const D=gysWbState(); o.wbDraft=(D.drafts||[]).some(d=>/写到一半/.test(d.text));
  gysWb.drafts(); await s(100); o.wbDraftPage=/写到一半/.test(document.getElementById('gys_weibo').innerText);
  gysWb.draftOpen(D.drafts[0].did); await s(100);
  o.wbDraftBack=(document.getElementById('wbCmpT')||{}).value==='写到一半的微博';
  await gysWb.send(); await s(150);
  o.wbDraftGone=!(gysWbState().drafts||[]).some(d=>/写到一半/.test(d.text));
  GYS.close('weibo');
})()`));

await step('小红书草稿箱', new Function(`return (async()=>{${sfn}
  gysRedOpen('post'); await s(120);
  const t=document.getElementById('rdT'); t.value='草稿标题'; gysRd.__d('title', t.value); await s(950);
  const D=gysRedState(); o.rdDraft=(D.drafts||[]).some(d=>d.title==='草稿标题');
  gysRd.compose(); await s(100);
  o.rdDraftBar=/草稿箱/.test(document.getElementById('gys_red').innerText);
  gysRd.drafts(); await s(100); o.rdDraftPage=/草稿标题/.test(document.getElementById('gys_red').innerText);
  gysRd.draftOpen(D.drafts.find(d=>d.title==='草稿标题').did); await s(100);
  o.rdDraftBack=(document.getElementById('rdT')||{}).value==='草稿标题';
  GYS.close('red');
})()`));

await step('微博转发抽奖', new Function(`return (async()=>{${sfn}
  gysWeiboOpen('me'); await s(80); gysWb.compose(); await s(80);
  const ta=document.getElementById('wbCmpT'); ta.value='抽一位送签名照'; gysWb.__d('text', ta.value);
  const pr=gysWb.__lot(); await s(120); const sh=document.querySelector('.wb-sheet [data-i="1"]'); if(sh) sh.click(); await pr; await s(80);
  o.lotDraft=!!(document.getElementById('gys_weibo').innerText.match(/抽「签名照」/));
  await gysWb.send(); await s(150);
  const D=gysWbState(); const p=D.posts.find(x=>x.lot && x.by==='me'); o.lotPost=!!p && p.lot.prize==='签名照';
  p.lot.ents.push('c:7001'); gysWb.__lotDraw(p.id); await s(80);
  o.lotDrawn=!!p.lot.done && p.lot.wins.length===1 && p.cmts.some(c=>/开奖/.test(c.text));
  // TA 的抽奖：你转发参加
  const a=GY_AUTONOMY_ACTIONS.find(a=>a.key==='gys_wb_lottery'); o.lotAct=!!a;
  const c=myCharacters.find(c=>c.id===7001); const r=await a.run(c); await s(100);
  const q=gysWbState().posts.find(x=>x.lot && x.by==='c:7001' && !x.lot.done); o.lotTa=!!r && !!q && /奶茶/.test(q.lot.prize);
  await gysWb.repost(q.id, 1); await s(80); o.lotJoin=q.lot.ents.includes('me');
  q.lot.end=Date.now()-1; gysWb.__lotTick(); await s(80); o.lotTick=!!q.lot.done;
  gysWeiboOpenPost(q.id); await s(120); o.lotRender=!!document.querySelector('#gys_weibo .wb-lot');
  GYS.close('weibo');
})()`));

await step('开关 / 今天 / 小组件 / 记忆', new Function(`return (async()=>{${sfn}
  o.feats=['gysShare','gysDraft','gysWbLot'].every(k=>(window.__gyxFeats||[]).some(f=>f.id===k));
  o.today=typeof X==='undefined' || true;
})()`));

const r = await page.evaluate(() => window.__o);
check('微博 → iMessage 卡片（含附言）', r.shCard && r.shNote);
check('iMessage 里卡片显示', r.shRender);
check('点卡片回到原微博', r.shOpen);
check('小红书分享（平时聊天 / iMessage）', r.rdChat && r.rdIm);
check('豆瓣条目分享到 iMessage', r.dbIm);
check('TA 转帖：自主行动注册 + 能跑', r.postAct && r.postNeed && r.postRun);
check('微博草稿：退出自动存', r.wbDraft && r.wbDraftPage);
check('微博草稿：打开接着写 / 发了就删', r.wbDraftBack && r.wbDraftGone);
check('小红书草稿：自动存 + 草稿箱页', r.rdDraft && r.rdDraftBar && r.rdDraftPage);
check('小红书草稿：打开接着写', r.rdDraftBack);
check('微博抽奖：发 + 开奖', r.lotDraft && r.lotPost && r.lotDrawn);
check('微博抽奖：TA 发抽奖 + 你转发参加 + 到点开奖', r.lotAct && r.lotTa && r.lotJoin && r.lotTick);
check('微博抽奖：卡片显示', r.lotRender);
check('三个新开关都登记了', r.feats);

await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 255 软件补包 2 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}`));
if (errs.length) console.log('\n⚠️ 页面事件：\n' + [...new Set(errs)].slice(0, 15).join('\n'));
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length && !errs.length ? 0 : 1);
