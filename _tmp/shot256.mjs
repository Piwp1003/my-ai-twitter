// 256：📱 软件桌面 + 🎵 网易云音乐
// 用法（项目根目录）：node _开发测试/v256-music-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from '../_开发测试/_launch.mjs';
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




const shot=async(n)=>{await page.waitForTimeout(500); await page.screenshot({path:'_tmp/m256-'+n+'.png'});};
await page.evaluate(()=>{ gysSoftHome(); }); await shot('1-home');
await page.evaluate(async()=>{ GYS.close('home'); gysMusicOpen('home'); await new Promise(r=>setTimeout(r,500)); }); await shot('2-find');
await page.evaluate(async()=>{ const D=gysMuState(); gysMu.playIn(D.daily.ids,0); }); await shot('3-player');
await page.evaluate(async()=>{ const D=gysMuState(); gysMu.cmts(D.daily.ids[0]); await new Promise(r=>setTimeout(r,400)); }); await shot('4-cmt');
await page.evaluate(async()=>{ GYS.tab('music','fm'); await new Promise(r=>setTimeout(r,400)); }); await shot('5-fm');
await page.evaluate(async()=>{ gysMu.prof('c:7001'); await new Promise(r=>setTimeout(r,400)); }); await shot('6-prof');
await page.evaluate(async()=>{ GYS.tab('music','me'); await new Promise(r=>setTimeout(r,200)); }); await shot('7-me');
await browser.close();
