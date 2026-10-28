// v231：🛍️ 装扮商店、🎣 一起钓鱼、🏮 一起过节（农历自动算）+ 使用指南 / 客服跟上所有新功能
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
if (fs.existsSync(path.join(root, 'js', '90-bailu-cards.js'))) { console.log('（白露不测）'); process.exit(0); }
const PLUG = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ PLUG }) => {
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  globalChats['9991'] = [{ sender: 'me', text: '在吗', timestamp: Date.now() - 6e4 }, { sender: 9991, text: '在呀', timestamp: Date.now() - 3e4 }]; currentChatSessionId = '9991';
  const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); let c = '好呀。';
    if (/偷偷给她买了/.test(t)) c = '给你挑的，戴上看看。'; else if (/一起钓鱼，她刚钓到了/.test(t)) c = '哇，你运气也太好了。'; else if (/一个人去湖边钓鱼/.test(t)) c = '钓到大的了，下次带你来。';
    else if (/节日卡片/.test(t)) c = '月亮很圆，我想跟你一起看。'; else if (/许一个愿/.test(t)) c = '我的愿望是明年还和你一起过。';
    return { choices: [{ message: { content: c } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.sendProactiveChatMessage = async () => true; try { sendProactiveChatMessage = window.sendProactiveChatMessage; } catch (e) {}
  PLUG.forEach(p => executePluginOnLoad(p)); GYX.set('gyxHot', false);
}, { PLUG });
await page.waitForTimeout(3500);

const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}, c = myCharacters.find(x => x.id === 9991);
  o.base = ['gyxShop', 'gyxFish', 'gyxFest'].every(id => GYX.FEATS.some(f => f.id === id)) && ['gyx_shop', 'gyx_fish', 'gyx_fest'].every(k => GY_AUTONOMY_ACTIONS.some(a => a.key === k)) && ['gyxShopW', 'gyxFishW', 'gyxFestW'].every(k => window.__gyPmW.WD[k]) && ['gyxShop', 'gyxFish', 'gyxFest'].every(k => gyMemExList().includes(k));
  // 商店
  await gyxShopBuy('f_sakura'); await gyxShopWear('f_sakura', 'me'); await gyxShopBuy('b_peach'); await gyxShopWear('b_peach', 'bg'); await s(200);
  o.shop = gyxShopData().own.includes('f_sakura') && /ffb7c9/.test(gyxShopCss()) && /chatMessagesArea\{background:linear-gradient/.test(gyxShopCss());
  await gyxShopBuy('u_jelly'); o.bubble = (gyxBubbleData().themes || []).some(t => t.shop === 'u_jelly');
  const g = await gyxShopGift('9991'); o.gift = !!g && /戴上看看/.test(g.line);
  document.getElementById('gyxShopOv')?.remove();
  // 钓鱼
  gyxFishOpen(); await s(100); o.lake = !!document.getElementById('gyxFsLake');
  await gyxFishLand('moonfish'); o.fish = !!gyxFishData().dex.moonfish && /运气/.test(gyxFishData().log[0].cm) && /月光鱼/.test(document.getElementById('gyxFsMsg').innerText);
  o.game = (typeof registeredMiniGames !== 'undefined' ? registeredMiniGames : []).some(x => x.id === 'gyxFish');
  document.getElementById('gyxFsOv')?.remove();
  // 过节：农历自动算
  const U = gyxFestUpcoming(); const f = k => (U.find(x => x.k === k) || {}).date;
  o.U = U.map(x => x.k + '=' + x.date).join(','); o.lunar = U.length >= 8 && ['2026-10-18', '2027-10-08'].includes(f('chongyang'))   /* 过了今年重阳就算明年的 */ && f('chunjie') === '2027-02-06' && f('chuxi') === '2027-02-05' && f('zhongqiu') === '2027-09-15' && f('qixi') === '2027-08-08';
  o.ctx = typeof window.__gyxCtxFor === 'function';
  return o;
});
check('三个新插件都有开关、自主行动、小组件、记忆总览', r.base, JSON.stringify(r));
check('🛍️ 装扮商店：买头像框 / 聊天背景戴上，聊天界面真的变；买的气泡套装进了气泡工坊；TA 会买来送你', r.shop && r.bubble && r.gift, JSON.stringify(r));
check('🎣 一起钓鱼：湖面、钓到稀有鱼进图鉴、TA 在旁边说话；也在 🎮 里', r.lake && r.fish && r.game, JSON.stringify(r));
check('🏮 一起过节：农历节日自动算对（重阳 2026-10-18、除夕 2027-02-05、春节 2027-02-06、七夕 2027-08-08、中秋 2027-09-15）', r.lunar, JSON.stringify(r));

// 过节当天：把时间拨到中秋
const fest = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}; const RD = Date;
  const T = new RD(2027, 8, 15, 20, 0, 0).getTime(); class FD extends RD { constructor(...a) { if (!a.length) super(T + (RD.now() - window.__t0)); else super(...a); } static now() { return T + (RD.now() - window.__t0); } }
  window.__t0 = RD.now(); window.Date = FD;
  await gyxFestOpen('9991'); await s(200);
  o.page = /中秋/.test(document.getElementById('gyxFeOv').innerText) && /月亮很圆/.test(document.getElementById('gyxFeOv').innerText);
  document.getElementById('gyxFeIn').value = '希望我们一直好好的'; await gyxFestDo('9991', 'zhongqiu', '2027-09-15'); await s(100);
  o.wish = /明年还和你/.test(document.getElementById('gyxFeOv').innerText);
  o.act = !!GY_AUTONOMY_ACTIONS.find(a => a.key === 'gyx_fest').need(myCharacters.find(c => c.id === 9991));
  window.Date = RD; document.getElementById('gyxFeOv')?.remove();
  return o;
});
check('🏮 中秋当天：TA 写节日卡、你许愿 TA 也许愿；TA 会自己来约你过节', fest.page && fest.wish && fest.act, JSON.stringify(fest));

// 指南和客服跟上
const gd = await page.evaluate(async () => {
  const o = {}; gyGuideOpen(); await new Promise(r => setTimeout(r, 200));
  const t = document.getElementById('gyGuideOv').innerText;
  o.has = ['直播间', '跑团', '反向攻略', '记忆潜行', '真实热搜', '反向养成', '来电增强', '情绪皮肤', '气泡工坊', '酒馆主题', '日夜主题', '跟手返回', '手帐时间线', '关系四条线', '自拍', 'AI 小程序', '听取模式', '装扮商店', '一起钓鱼', '一起过节', '🧺 生活', '👥 TA 身边的人', '🎁 TA 给你的', '🪐 换个世界玩', '💭 聊天细节', '🌐 外面的世界'].filter(w => !t.includes(w));
  o.stale = /小功能 → 🗺️ 行程与天气 → 🌏 两地|小功能 → 时间感知/.test(t);
  document.getElementById('gyGuideOv').remove();
  o.q = ['热搜在哪', '钓鱼在哪', '怎么过中秋', '头像框', '听取模式', '手帐', '动态壁纸'].map(q => (gyGuideSearchApi(q)[0] || {}).id);
  return o;
});
check('使用指南写进了所有新功能和新合集，旧路径改对了；客服搜得到（热搜 / 钓鱼 / 过中秋 / 头像框 / 听取 / 手帐 / 动态壁纸）', !gd.has.length && !gd.stale && JSON.stringify(gd.q) === JSON.stringify(['hot', 'game', 'days', 'h_life', 'listen', 'h_recap', 'dnwall']), JSON.stringify(gd));

const bad = errs.filter(e => !/x\.test|Failed to fetch/.test(e));
check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
