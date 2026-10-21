// 249：📱 软件合集——🧣 微博、🫧 泡泡（整页界面、每个软件里的主页不一样、改主页、bot、订阅 / 回复 3 次 / 字数、自己开频道、猜小号、注入）
// 用法（项目根目录）：node _开发测试/v249-soft-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from '../_开发测试/_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const rd = f => JSON.parse(fs.readFileSync(path.join(root, '插件', '软件', f), 'utf8'));
const WB = rd('微博.json'), BB = rd('泡泡.json'), ALL = rd('软件全家桶.json');
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const errs = [];
async function boot(plugs) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\//, r => r.abort());
  await page.goto(fileUrl(path.join(root, 'index.html')));
  await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
  await page.evaluate(({ plugs }) => {
    myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
    [[9991, 'Leon', '法国摄影师，嘴硬心软'], [9992, 'Ken', '厨师']].forEach(([id, n, p]) => myCharacters.push({ id, name: n, persona: p, worldbooks: [], diaryData: { letters: [], diaries: [] } }));
    globalChats['9991'] = [{ sender: 'me', text: '今天好累', timestamp: Date.now() - 1000, readBy: [] }];
    window.__prompts = []; window.__reach = []; window.__notifs = []; window.__inputs = [];
    const fake = async (api, p) => { const t = typeof p === 'string' ? p : JSON.stringify(p); window.__prompts.push(t); let c = '嗯。';
      if (/个人主页——要像真人在用/.test(t)) { const app = /「泡泡」/.test(t) ? '泡' : '博'; const n = (t.match(/^\d+\. /mg) || []).length; c = JSON.stringify(Array.from({ length: n }, (_, i) => ({ nick: app + '名' + i, handle: 'h' + i, bio: app + '的简介', verify: '', vt: '', followers: 100 + i, following: 10, gender: '', loc: '上海', tags: ['摄影'], link: '' }))); }
      else if (/模拟一个真实的微博时间线/.test(t)) c = JSON.stringify([{ by: 'Leon', text: '江边夜景 #夜景# [doge]', pics: ['江边'], topics: ['夜景'], likes: 30, cmts: [{ by: 'Ken', text: '好看' }] }, { by: '吃瓜路人', text: '今天也要早睡', pics: [], likes: 3, cmts: [] }]);
      else if (/这是微博热搜榜/.test(t)) c = JSON.stringify([{ title: 'Leon 深夜现身江边', tag: '爆', heat: 1200000, desc: '摄影师夜拍', about: 'Leon' }, { title: '降温', tag: '热', heat: 500000, desc: '', about: '' }]);
      else if (/微博上，.*发了一条/.test(t)) c = JSON.stringify([{ by: 'Leon', text: '注意休息', likes: 5, replyTo: '', authorLike: true }, { by: '路过的小猫咪', text: '抱抱', likes: 1 }]);
      else if (/微博上的定时 bot/.test(t)) c = '晚安，今天也辛苦了 🌙';
      else if (/付费订阅的私信频道/.test(t)) c = JSON.stringify([{ t: 'text', text: '(昵称) 今天吃饭了吗', desc: '', dur: 0, pick: '' }, { t: 'photo', text: '刚拍的', desc: '江边晚霞', dur: 0 }, { t: 'voice', text: '晚安啦(昵称)', dur: 12 }]);
      else if (/截图晒到粉丝群/.test(t)) c = JSON.stringify([{ nick: '小太阳', days: 120, text: '啊啊啊好看' }, { nick: '每天打卡', days: 3, text: '打卡' }]);
      else if (/开了艺人频道，粉丝付费订阅/.test(t)) c = JSON.stringify([{ by: 'Leon', nick: '路过的摄影爱好者', alt: true, days: 2, text: '早点睡' }, { by: 'Ken', nick: 'Ken', alt: false, days: 2, text: '给你留了蛋糕' }, { by: '', nick: '尖叫鸡', alt: false, days: 1, text: '啊啊啊' }]);
      else if (/用「泡泡信」给所有订阅/.test(t)) c = '亲爱的(昵称)：\n最近天气转凉……\nLeon';
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


const page = await boot([...WB, ...BB]);
const shot = async n => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(root, '_tmp', 'shot-' + n + '.png') }); };
await page.evaluate(async () => { gysWeiboOpen('home'); await new Promise(r => setTimeout(r, 900)); });
await shot('1-wb-home');
await page.evaluate(async () => { const W = gysWbState(); gysWb.open(W.posts.find(p => p.by === 'c:9991').id); });
await shot('2-wb-post');
await page.evaluate(async () => { GYS.back('weibo'); gysWb.prof('c:9991'); });
await shot('3-wb-prof');
await page.evaluate(async () => { GYS.tab('weibo', 'find'); });
await shot('4-wb-find');
await page.evaluate(async () => { GYS.tab('weibo', 'me'); });
await shot('5-wb-me');
await page.evaluate(async () => { GYS.close('weibo'); gysBubbleOpen('find'); window.__inputs = ['小雨']; await gysBb.sub('c:9991'); await new Promise(r => setTimeout(r, 500)); GYS.tab('bubble', 'chat'); });
await shot('6-bb-list');
await page.evaluate(async () => { gysBb.room('c:9991'); document.getElementById('bbIn').value = '好吃'; gysBb.reply('c:9991'); });
await shot('7-bb-room');
await page.evaluate(async () => { gysBb.prof('c:9991'); });
await shot('8-bb-prof');
await page.evaluate(async () => { GYS.tab('bubble', 'studio'); await gysBb.openMine(); document.getElementById('bbMy').value = '今天的(昵称)们早点睡'; await gysBb.sendMine(); await new Promise(r => setTimeout(r, 400)); });
await shot('9-bb-mine');
await page.evaluate(async () => { GYS.back('bubble'); });
await shot('10-bb-studio');
await browser.close();
