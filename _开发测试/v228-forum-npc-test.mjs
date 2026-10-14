// v228：论坛路人跟帖要接用户发的东西，不是复述世界书
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd();
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof generateNpcForumReplies === 'function', { timeout: 20000 });
await page.waitForTimeout(800);

const r = await page.evaluate(async () => {
  const o = {}; let last = '';
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  const reply = '[{"author":"吃瓜1","content":"面试加油","quoteFloor":2,"likes":3},{"author":"吃瓜2","content":"楼上说得对","quoteFloor":null,"likes":1}]';
  const fake = async (api, p) => { last = typeof p === 'string' ? p : JSON.stringify(p); return { choices: [{ message: { content: reply } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.callChatCompletionAPI = async (api, p) => { last = typeof p === 'string' ? p : JSON.stringify(p); return { choices: [{ message: { content: '[{"name":"路人","handle":"@a","text":"笑死"}]' } }] }; };
  try { callChatCompletionAPI = window.callChatCompletionAPI; } catch (e) {}
  worldbooks.push({ id: 'wbT', title: '大陆设定', content: '提瓦特大陆有七国，'.repeat(300), isGlobal: true, enabled: true });
  currentUser.name = '小雨';
  // 新帖：路人要看到正文
  const th = { id: 'ft_t', title: '求助', content: '我明天要去面试一家咖啡店，好紧张，穿什么好？', author: '小雨', txtContext: '', replies: [], timestamp: Date.now(), likes: 0 };
  forumThreads.unshift(th);
  await generateNpcForumReplies(th, 1, '');
  o.newPost = /明天要去面试一家咖啡店/.test(last) && /主帖本身/.test(last) && /不要复述、介绍世界观设定/.test(last);
  o.wbShort = /世界观参考/.test(last) && (last.match(/提瓦特大陆有七国/g) || []).length < 150;
  o.saved = th.replies.length === 2;
  // 用户回了一楼：路人要接这一楼
  const fl = th.replies[th.replies.length - 1].floor + 1;
  th.replies.push({ floor: fl, author: '小雨', isOp: true, content: '谢谢大家！最后穿了白衬衫，店长说我很有精神', likes: 0, timestamp: Date.now() });
  await generateNpcForumReplies(th, fl, '谢谢大家！最后穿了白衬衫，店长说我很有精神', { who: '小雨' });
  o.userFloor = new RegExp(`这一次要接的楼层】${fl}楼 \\[小雨`).test(last) && /白衬衫/.test(last) && new RegExp(`quoteFloor 填 ${fl}`).test(last);
  // 艾特了角色：接的还是用户那一楼，角色那句一并给
  await generateNpcForumReplies(th, fl, '这家店的拿铁好喝吗', { who: '小雨', charReply: '还行，比我做的差一点', charName: 'Leon' });
  o.withChar = /拿铁好喝吗/.test(last) && /Leon 也被点名回了一句：还行/.test(last);
  // 匿名区 / 推文：有人评论时路人也能看到原帖
  anonPosts.unshift({ id: 'ap_t', charId: 'me', anonName: '小雨', text: '室友半夜打游戏好吵', replies: [], timestamp: Date.now(), likes: 0 });
  await spawnNpcComments('ap_t', 'anon', { triggerName: '小雨', triggerText: '已经第三天了', triggerId: 'x' });
  o.anon = /室友半夜打游戏好吵/.test(last) && /已经第三天了/.test(last) && /针对这条评论/.test(last);
  return o;
});
check('新帖：路人跟帖拿到的是主帖正文（以前只有标题），并明说不许复述世界观', r.newPost && r.saved, JSON.stringify(r));
check('世界书只当参考、截短了，不再整份压在最前面', r.wbShort, JSON.stringify(r));
check('你回了一楼：路人明确去接「你这一楼」，并且引用楼层填你那一楼', r.userFloor, JSON.stringify(r));
check('艾特了角色：路人接的还是你的话，角色那句一起给看', r.withChar, JSON.stringify(r));
check('匿名区 / 推文有人评论时，路人也能看到原帖，并接那条评论', r.anon, JSON.stringify(r));
check('没有页面报错', !errs.length, errs.join(' | '));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
