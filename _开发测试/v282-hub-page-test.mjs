// 282：合集做成一页（js/79）+ 插件重新合并（新玩法 24 个合集 + 开场动画）
// 用法（项目根目录）：node _开发测试/v282-hub-page-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path'; import fs from 'fs';
const root = process.cwd();
const DIR = path.join(root, '插件', '新玩法');
const NEW = JSON.parse(fs.readFileSync(path.join(DIR, '新玩法全家桶.json'), 'utf8'));
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
// 文件层面
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
check('插件文件夹：25 个 + 全家桶 + 角色立绘差分（单独的都并进合集了）', files.length === 27 && files.includes('角色立绘差分.json') && !files.includes('贴贴.json') && files.includes('TA给你的.json') && files.includes('换个世界玩.json'), files.join(','));
const nm = NEW.map(p => p.name);
check('全家桶里：TA给你的 / 换个世界玩 / 记忆 / 外面的世界 / 聊天细节 / 生活 都在，没有单独的梦、贴贴', ['🎁 TA给你的', '🪐 换个世界玩', '🧠 记忆', '🌐 外面的世界', '💭 聊天细节', '🧺 生活'].every(n => nm.includes(n)) && !nm.includes('🌙 TA的梦') && !nm.includes('💓 贴贴'), nm.join(','));
const huiGu = NEW.find(p => p.name === '📚 回顾');
check('「回顾」说明里的数字对了（8 个）', /合并了 8 个/.test(huiGu.description), huiGu.description.slice(0, 30));

const browser = await launchBrowser(chromium);
const page = await (await browser.newContext({ viewport: { width: 430, height: 900 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
// 旧的单个插件 + 旧的贴贴装着 → 装新全家桶后自动拿掉
await page.evaluate(NEW => {
  myCharacters.push({ id: 7001, name: '谢云昭', persona: 'x', worldbooks: [], diaryData: { letters: [], diaries: [] } }); window.currentChatSessionId = 7001;
  plugins.push({ name: '🌙 TA的梦', type: 'script', enabled: true, onLoad: '' }, { name: '💓 贴贴', type: 'script', enabled: true, onLoad: '' });
  NEW.forEach(p => plugins.push(p));
  NEW.forEach(p => { try { executePluginOnLoad(p); } catch (e) {} });
}, NEW);
await page.waitForTimeout(3000);
const pr = await page.evaluate(() => { gyHubPrune(false); return plugins.map(p => p.name); });
check('装了新的：旧的「TA的梦」「贴贴」自动拿掉', !pr.includes('🌙 TA的梦') && !pr.includes('💓 贴贴') && pr.includes('🎁 TA给你的'), pr.filter(n => /梦|贴贴|立绘/.test(n)).join(','));

const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}; const $ = q => document.querySelector(q);
  gyOpenMiniFeature('hub_gift'); await s(1200);
  const ov = $('#gyHubOv');
  o.title = $('#gyHubLt').textContent === 'TA 给你的';
  o.cards = [...ov.querySelectorAll('.gyhb-card2 .gyhb-ch b')].map(b => b.textContent);
  o.pills = [...ov.querySelectorAll('#gyHubPills button')].map(b => b.textContent.trim());
  o.body = [...ov.querySelectorAll('.gyhb-card2')].every(c => c.querySelector('.gyhb-rows,.gyhb-w,.gyhb-d'));
  // 点标签 → 整页换成那一个（插件面板画进合集），标签还在
  [...ov.querySelectorAll('#gyHubPills button')].find(b => /梦/.test(b.textContent)).click(); await s(1500);
  o.inPanel = !!ov.querySelector('.gyhb-body .gyx-inhub') && !ov.querySelector('.gyhb-card2') && !!ov.querySelector('#gyHubPills button.on') && /梦/.test(ov.querySelector('#gyHubPills button.on').textContent);
  ov.querySelector('#gyHubPills button').click(); await s(600);   // 全部
  o.back = ov.querySelectorAll('.gyhb-card2').length === o.cards.length;
  // ⋯：藏一张、调顺序
  gyHubMore(); await s(300);
  o.sheet = !!$('#gyHubSheet') && /这一页显示/.test($('#gyHubSheet').innerText) && /TA 会自己做/.test($('#gyHubSheet').innerText);
  const first = o.cards[0];
  const ids = [...$('#gyHubSheet').querySelectorAll('.gyhb-srow input')];
  ids[0].checked = false; ids[0].dispatchEvent(new Event('change'));
  gyHubMove(gyHubFolders().find(f => f.id === 'hub_gift').members[2], -1); await s(200);
  $('#gyHubSheet .k').click(); await s(500);
  o.hid = ![...ov.querySelectorAll('.gyhb-card2 .gyhb-ch b')].map(b => b.textContent).includes(first) && /藏起来了/.test(ov.innerText);
  o.order = [...ov.querySelectorAll('.gyhb-card2 .gyhb-ch b')].map(b => b.textContent);
  gyHubClose(); gyOpenMiniFeature('hub_gift'); await s(900);
  o.keep = ![...document.querySelectorAll('#gyHubOv .gyhb-card2 .gyhb-ch b')].map(b => b.textContent).includes(first);
  gyHubMore(); await s(200); gyHubMoreReset(); await s(200); document.getElementById('gyHubSheet').remove(); gyHubOpen('hub_gift'); await s(500);
  o.reset = document.querySelectorAll('#gyHubOv .gyhb-card2').length === o.cards.length;
  // 「今天」那一节进卡片：反向养成在陪你里
  gyHubOpen('hub_with'); await s(900);
  o.with = [...document.querySelectorAll('#gyHubOv .gyhb-card2 .gyhb-ch b')].map(b => b.textContent);
  // 关掉「一页」→ 原来的一列；再换回来
  gyHubPageSet(false); gyHubOpen('hub_gift'); await s(500);
  o.list = !!document.querySelector('#gyHubOv .gyhb-list') && !document.querySelector('#gyHubOv .gyhb-card2') && /换成一页的样子/.test(document.getElementById('gyHubOv').innerText);
  [...document.querySelectorAll('#gyHubOv .gyhb-more2')].pop().click(); await s(500);
  o.pageAgain = !!document.querySelector('#gyHubOv .gyhb-card2');
  // 深色
  document.body.classList.add('dark-theme'); await s(100);
  o.dark = getComputedStyle(document.querySelector('#gyHubOv .gyhb-card2')).backgroundColor !== 'rgb(255, 255, 255)';
  document.body.classList.remove('dark-theme');
  gyHubClose();
  // 合集里没有「贴贴」了，听心跳 / 摇一摇在陪你里
  o.noTouch = !gyHubFolders().some(f => f.id === 'hub_touch') && gyHubFolders().find(f => f.id === 'hub_with').kids.includes('gyxBeat');
  return o;
});
check('合集一页：大标题、每个功能一张卡片，卡片里有内容', r.title && r.cards.length >= 3 && r.body, JSON.stringify(r.cards));
check('顶上一排标签：全部 + 每个功能 + ⋯', r.pills[0] === '全部' && r.pills.length === r.cards.length + 2 && r.pills[r.pills.length - 1] === '⋯', JSON.stringify(r.pills));
check('点标签：整页换成那个功能（面板画在合集里），点「全部」回来', r.inPanel && r.back, JSON.stringify(r));
check('⋯：能藏卡片、调顺序、「TA 会自己做」开关', r.sheet && r.hid, JSON.stringify(r.order));
check('藏起来的下次打开还藏着；重置就都回来', r.keep && r.reset);
check('陪你里有反向养成、听心跳、摇一摇（贴贴并进来了）', r.with.some(t => /反向养成/.test(t)) && r.noTouch, JSON.stringify(r.with));
check('⋯ 里能换回原来竖着一列，一列底下能换回一页', r.list && r.pageAgain);
check('深色也跟着变', r.dark);
check('没有报错', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 282 合集一页 / 插件重新合并 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
