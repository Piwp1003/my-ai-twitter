// 251：🍎 苹果外观（手机外框、状态栏、Home 条、推页动画、苹果弹窗、通知横幅、锁屏、图标）+ 💬 iMessage 全功能（文字格式、动态文字、链接预览、任意表情、语音、拟我表情、手写、数字触感、Apple Cash、共享位置、小游戏、短信、已读回执、最近删除）
// 用法（项目根目录）：node _开发测试/v251-ios-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from '../_开发测试/_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const rd = f => JSON.parse(fs.readFileSync(path.join(root, '插件', '软件', f), 'utf8'));
const PL = [...rd('小红书.json'), ...rd('豆瓣.json'), ...rd('iMessage.json')], ALL = rd('软件全家桶.json');
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const errs = [];
async function boot(plugs) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\//, r => r.abort());
  await page.goto(fileUrl(path.join(root, 'index.html')));
  await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
  await page.evaluate(async ({ plugs }) => {
    myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
    [[9991, 'Leon', '法国摄影师，嘴硬心软'], [9992, 'Ken', '厨师']].forEach(([id, n, p]) => myCharacters.push({ id, name: n, persona: p, worldbooks: [], diaryData: { letters: [], diaries: [] } }));
    globalChats['9991'] = [{ sender: 'me', text: '今天好累', timestamp: Date.now() - 1000, readBy: [] }];
    // 老小红书的数据（主页和社交里那个）
    await localforage.createInstance({ name: 'gyx_red', storeName: 'kv' }).setItem('d', { notes: [{ id: 'old1', by: '9991', title: '老笔记：周末去哪', body: '想去海边', tags: ['周末'], cover: { emo: '🌊', bg: '#cde' }, likes: 12, favs: 3, liked: true, faved: true, cmts: [{ who: 'me', t: '带我去', at: 1 }], at: Date.now() - 86400e3, favBy: { 9991: '想带她去' } }] });
    window.__prompts = []; window.__reach = []; window.__notifs = []; window.__inputs = [];
    const J = x => JSON.stringify(x);
    const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); window.__prompts.push(t); let c = '嗯。';
      if (/个人主页——要像真人在用/.test(t)) { const n = (t.match(/^\d+\. /mg) || []).length; c = J(Array.from({ length: n }, (_, i) => ({ nick: '名' + i, handle: 'h' + i, bio: '简介' + i, verify: '', vt: '', followers: 100 + i, following: 10, gender: '', loc: '上海', tags: ['摄影'], link: '' }))); }
      else if (/模拟一个真实的「小红书」App/.test(t)) c = J([{ by: 'Leon', emo: '📷', title: '江边夜景随手拍', body: '今晚的江风 #摄影', tags: ['摄影'], pics: ['江边', '晚霞'], loc: '外滩', likes: 30, favs: 5, cmts: [{ by: 'Ken', text: '好看' }] }, { by: '爱吃甜的猫', emo: '🍰', title: '这家蛋糕店锁死', body: '开心果巴斯克', tags: ['探店'], pics: [], likes: 99, favs: 20, cmts: [] }]);
      else if (/小红书上有一篇笔记/.test(t)) c = J([{ by: 'Leon', text: '这不是你吗？', likes: 3 }, { by: '路过的小红薯', text: '蹲后续' }]);
      else if (/你要在小红书上发一篇笔记/.test(t)) c = J({ emo: '🌇', title: '下班路上的晚霞', body: '想分享给一个人', tags: ['日常'], pics: ['晚霞'], loc: '' });
      else if (/挑一篇你会偷偷收藏的/.test(t)) c = J({ i: 0, why: '周末带她去看' });
      else if (/「猜你想搜」/.test(t)) c = J(['秋天穿搭', '约会餐厅']);
      else if (/在「小红书」里搜/.test(t)) c = J([{ by: '约会达人', emo: '🍷', title: '约会餐厅合集', body: '十家都很好', tags: ['约会'], pics: [] }]);
      else if (/你在模拟「豆瓣」的/.test(t)) c = J([{ kind: 'movie', title: '情书', sub: 'Love Letter', year: '1995', meta: '岩井俊二 / 中山美穗', intro: '雪国的信', score: 8.9, n: 500000, real: true, emo: '❄️' }, { kind: 'movie', title: '雾港来信', sub: '', year: '2024', meta: '这个世界的电影', intro: '港口的故事', score: 7.6, n: 3000, real: false, emo: '🌫️' }]);
      else if (/条「短评」/.test(t)) c = J({ short: [{ by: 'Leon', star: 5, text: '想和她一起看第二遍', useful: 3 }, { by: '影迷小王', star: 4, text: '冬天必看', useful: 10 }], long: [{ by: '老文青', star: 5, title: '雪地里的回声', text: '很长的影评' }] });
      else if (/你在豆瓣上标记一部/.test(t)) c = J({ kind: 'movie', title: '情书', st: 'done', star: 5, text: '下雪天想起她', score: 8.9, real: true });
      else if (/写一篇长评/.test(t)) c = J({ title: '雪', text: '写给某个人的影评', star: 5 });
      else if (/你在模拟「豆瓣小组」/.test(t)) c = J([{ name: '我们都是失眠的人', ico: '🌙', intro: '睡不着的来', n: 3000 }]);
      else if (/写 \d+ 个新帖子/.test(t)) c = J([{ by: 'Ken', title: '求推荐宵夜', body: '饿了', replies: [{ by: '路人甲', text: '顶', quote: 0 }] }]);
      else if (/的帖子《/.test(t)) c = J([{ by: 'Leon', text: '我知道一家', quote: 1 }]);
      else if (/豆瓣「同城」/.test(t)) c = J([{ title: '莫奈展', kind: '展览', place: '美术馆', time: '本周六', intro: '睡莲', price: '80' }]);
      else if (/^豆瓣上，/.test(t)) c = J([{ by: 'Leon', text: '我也想看' }]);
      else if (/通讯录里，给/.test(t)) c = '❤️小雨';
      else if (/报平安」告诉她/.test(t)) c = '公司';
      else if (/iPhone「信息」里的一个群聊/.test(t)) c = J([{ by: 'Leon', text: '在吗' }, { by: 'Ken', text: '在', react: '👍' }]);
      else if (/你想在 iPhone 的「信息」/.test(t)) c = J([{ text: '看到一只猫像你' }, { photo: '路边的橘猫' }]);
      else if (/iPhone 自带的「信息」/.test(t)) c = /请求查看你的位置/.test(t.split('iMessage 里最近的')[1] || '') && !/共享位置/.test((t.split('iMessage 里最近的')[1] || '').split('请求查看你的位置')[1] || '') ? J([{ text: '给你看', share: true }]) : (window.__imN = (window.__imN || 0) + 1) === 1 ? J([{ text: '收到', react: '🔥' }, { text: '我在路上', voice: true }, { memoji: '😘' }, { cash: 20 }, { hand: '想你' }, { text: '**真的**', tfx: 'big' }]) : J([{ text: '嗯' }]);
      return { choices: [{ message: { content: c } }] }; };
    window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
    window.sendProactiveChatMessage = async c => { window.__reach.push(c.id); }; try { sendProactiveChatMessage = window.sendProactiveChatMessage; } catch (e) {}
    const an = (...a) => window.__notifs.push(a); window.addNotification = an; try { addNotification = an; } catch (e) {}
    window.appConfirm = async () => true; window.appPrompt = async (q, d) => (window.__inputs.length ? window.__inputs.shift() : d);
    plugs.forEach(p => executePluginOnLoad(p));
  }, { plugs });
  await page.waitForTimeout(2500);
  return page;
}


const page = await boot(ALL);
const shot = async n => { await page.waitForTimeout(400); await page.addStyleTag({ content: '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' }); await page.screenshot({ path: path.join(root, '_tmp', 's3-' + n + '.png'), animations: 'disabled', timeout: 60000 }); };
await page.evaluate(async () => { const s = ms => new Promise(r => setTimeout(r, ms)); gysImsgOpen(); const p = gysIm.compose(); await s(80); [...document.querySelectorAll('.im-sheet-in div[data-i]')].find(d => d.textContent === 'Leon').click(); await p; await s(100); document.getElementById('imIn').value = '**今晚** 一起看这个 https://www.apple.com/tv'; gysIm.send('c:9991'); await s(11000); });
await shot('1-im');
await page.evaluate(async () => { const s = ms => new Promise(r => setTimeout(r, ms)); const p = gysIm.gamePick('c:9991'); await s(80); [...document.querySelectorAll('.im-sheet-in div[data-i]')].find(d => /井字棋/.test(d.textContent)).click(); await p; await s(100); gysIm.mv('c:9991', gysImState().th['c:9991'].msgs.slice(-1)[0].id, 4); await s(1800); });
await shot('2-game');
await page.evaluate(async () => { GYS.close('imsg'); gysRedOpen('home'); await new Promise(r => setTimeout(r, 900)); GYS.banner({ app: 'imsg', title: 'Leon', text: '到家了吗', go: null }); });
await shot('3-red');
await page.evaluate(async () => { GYS.close('red'); gysWeiboOpen('home'); await new Promise(r => setTimeout(r, 900)); });
await shot('4-wb');
await browser.close();
