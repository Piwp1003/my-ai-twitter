/* ins 风整站皮肤：
   ① 四种主题组合（浅/深 × 蓝白/黑白）下**颜色必须完全一样**
   ② 整站都换过去：主页时间线、侧边栏、右栏、设置、私信
   ③ 纯 CSS —— 项目里一个 js 文件都不用加 */
const { chromium } = require('playwright');
const fs = require('fs');
const CSS = fs.readFileSync('ins风界面.css', 'utf8');

const THEMES = [
  ['默认（浅 · 蓝白）', { dark: false, mono: false }],
  ['深色', { dark: true, mono: false }],
  ['黑白', { dark: false, mono: true }],
  ['黑白+深色', { dark: true, mono: true }]
];

const setup = async (p, css, th) => p.evaluate(async ([css, th]) => {
  myCharacters.length = 0;
  myCharacters.push({ id: 'c1', name: '谢云昭', persona: '县衙当差', avatarEmoji: '谢', anniversaries: [], worldbooks: [] });
  myCharacters.push({ id: 'c2', name: '沈砚', persona: '书铺老板', avatarEmoji: '沈', anniversaries: [], worldbooks: [] });
  currentUser.name = '林';
  currentUser.bio = '写字的。偶尔拍点天。';
  const now = Date.now(), M = 60000, H = 3600000, D = 86400000;
  globalChats['c1'] = [
    { sender: 'c1', text: '卷宗我拿到了，是漕运那一案的底档。', timestamp: now - 2 * D, readBy: ['me'] },
    { sender: 'me', text: '这么快？你昨天不是说要等三天。', timestamp: now - 2 * D + 3 * M, readBy: ['me'] },
    { sender: 'c1', text: '我托了周主簿。他欠我一顿酒。', timestamp: now - 2 * D + 5 * M, readBy: ['me'] },
    { sender: 'me', text: '那今晚别熬了，早点睡。', timestamp: now - 3 * H, readBy: ['me'] },
    { sender: 'c1', text: '看完这一册就睡。', timestamp: now - 3 * H + 2 * M, readBy: ['me'] },
    { sender: 'me', text: '等你说这句。', timestamp: now - 2 * M, readBy: ['me'] }
  ];
  globalPosts.length = 0;
  const mk = (id, ch, text, t, st) => ({ id, char: JSON.parse(JSON.stringify(ch)), text, timestamp: t,
    replies: [], mediaUrl: null, stats: st, isStory: false, location: '', likedBy: [], quotedPostId: null });
  globalPosts.push(Object.assign(mk('p1', myCharacters[0], '今天雨停了，院子里那棵石榴开了一树。#院子#', now - 40 * M, { likes: 12, retweets: 2, comments: 3, views: 820 }), { mediaUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420"><rect width="600" height="420" fill="#d9d9d9"/><circle cx="300" cy="210" r="70" fill="#bdbdbd"/></svg>'), userLiked: true }));
  globalPosts.push(mk('p2', myCharacters[1], '新到一批宋版影印，明天摆出来。来的人有茶喝。#读书#', now - 5 * H, { likes: 8, retweets: 1, comments: 2, views: 300 }));
  globalPosts.push(mk('p3', { id: 'me', name: '林', avatarEmoji: '林' }, '把稿子改完了，出门走了两公里。', now - 9 * H, { likes: 5, retweets: 0, comments: 1, views: 120 }));
  chatTimeSepEnabled = true; chatTimeSepMin = 5;
  globalCustomCSS = css;
  if (typeof applyGlobalCSS === 'function') applyGlobalCSS();
  (0, eval)('darkTheme = ' + (th.dark ? 'true' : 'false'));
  document.body.classList.toggle('theme-mono', !!th.mono);
  if (typeof applyDarkTheme === 'function') applyDarkTheme();
  try { document.getElementById('gymRoot').style.display = 'none'; } catch (e) {}
  await saveAllData();
}, [css, th]);

const probe = async (p) => p.evaluate(() => {
  const g = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : '(没这元素)'; };
  return {
    页面底: getComputedStyle(document.body).backgroundColor,
    正文色: getComputedStyle(document.body).color,
    主色变量: getComputedStyle(document.documentElement).getPropertyValue('--gy-accent').trim(),
    正文栏底: g('.main-content', 'backgroundColor'),
    左栏底: g('.sidebar-left', 'backgroundColor'),
    右栏底: g('.sidebar-right', 'backgroundColor'),
    导航文字: g('.nav-item', 'color'),
    搜索框: g('.search-box', 'backgroundColor'),
    发帖按钮: g('.btn-post', 'backgroundColor'),
    私信页底: g('#view-chat', 'backgroundColor'),
    我的气泡: g('.chat-bubble.me', 'backgroundColor'),
    对方气泡: g('.chat-bubble.other', 'backgroundColor'),
    气泡圆角: g('.chat-bubble', 'borderRadius'),
    输入栏: g('.chat-input-area', 'backgroundColor'),
    时间条: g('.chat-time-sep span', 'color'),
    头像圆角: g('.avatar', 'borderRadius'),
    头像边框: g('.avatar', 'borderTopWidth')
  };
});

(async () => {
const b = await chromium.launch();
const results = [];
for (const [name, th] of THEMES) {
  const i = THEMES.findIndex(x => x[0] === name);
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })).newPage();
  p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:8899/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(5300);
  await setup(p, CSS, th);
  await p.mouse.move(900, 600);
  await p.evaluate(async () => {
    switchMainView('chat'); await new Promise(r => setTimeout(r, 300));
    switchChatSession('c1'); await new Promise(r => setTimeout(r, 800));
  });
  await p.waitForTimeout(600);
  results.push([name, await probe(p)]);
  await p.screenshot({ path: '/tmp/ins-dm-' + i + '.png' });
  if (i === 0) {
    await p.evaluate(async () => { switchMainView('home'); await new Promise(r => setTimeout(r, 900)); });
    await p.screenshot({ path: '/tmp/ins-home.png' });
    await p.evaluate(async () => { switchMainView('settings'); await new Promise(r => setTimeout(r, 900)); });
    await p.screenshot({ path: '/tmp/ins-set.png' });
    // 手机端
    await p.setViewportSize({ width: 430, height: 900 });
    await p.evaluate(async () => { switchMainView('home'); await new Promise(r => setTimeout(r, 900)); });
    await p.screenshot({ path: '/tmp/ins-m-home.png' });
    await p.evaluate(async () => { switchMainView('chat'); await new Promise(r => setTimeout(r, 300)); switchChatSession('c1'); await new Promise(r => setTimeout(r, 900)); });
    await p.screenshot({ path: '/tmp/ins-m-dm.png' });
  }
  await p.close();
}
await b.close();

console.log('===== 四种主题下的颜色 =====');
results.forEach(([n, r]) => { console.log('\n--- ' + n); Object.keys(r).forEach(k => console.log('   ' + k + '：' + r[k])); });

console.log('\n===== 它们一模一样吗 =====');
const base = JSON.stringify(results[0][1]);
let allSame = true;
results.slice(1).forEach(([n, r]) => {
  const same = JSON.stringify(r) === base;
  if (!same) {
    allSame = false;
    const diff = Object.keys(r).filter(k => r[k] !== results[0][1][k])
      .map(k => `${k}（${results[0][1][k]} → ${r[k]}）`);
    console.log('   ✗ ' + n + ' 跟默认不一样：' + diff.join('；'));
  } else console.log('   ✓ ' + n + ' 跟默认完全一致');
});
console.log(allSame ? '\n四种主题下颜色完全一致 ✓' : '\n有主题把颜色改掉了 ✗');
})();
