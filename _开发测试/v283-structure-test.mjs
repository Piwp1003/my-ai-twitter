// 283：新玩法内置（js/62）、TA被困了删掉、立绘内置（js/72）、小功能首页 8 个入口、入口里分页、老合集 id 还能打开
// 用法（项目根目录）：node _开发测试/v283-structure-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path'; import fs from 'fs';
const root = process.cwd();
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const files = fs.readdirSync(path.join(root, '插件', '新玩法')).filter(f => f.endsWith('.json'));
const BJ = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '源码', 'bundles.json'), 'utf8'));
const left = files.filter(f => Object.keys(BJ.bundles).some(b => b.replace(/^\S+\s/, '') + '.json' === f) || f === '角色立绘差分.json');
check('插件文件夹里合集的 .json 都拿掉了（都内置了），全家桶留着给分享用', !left.length && files.includes('新玩法全家桶.json'), left.join(','));
const js62 = fs.readFileSync(path.join(root, 'js', '62-play.js'), 'utf8'); const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
check('js/62-play.js、js/72-char-sprite.js 都挂进了 index.html；里面没有 TA被困了', /62-play\.js/.test(idx) && /72-char-sprite\.js/.test(idx) && !/TA被困了/.test(js62.slice(0, 2000000).replace(/\\u[0-9a-f]{4}/g, '')) && !/gyxStuck/.test(js62));

const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('gyPlayOn', '1'); } catch (e) {} });   // 自动化里内置新玩法默认不跑，这个测试要它跑
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.__gyPlayReady, { timeout: 25000 });
await page.evaluate(() => { myCharacters.push({ id: 7001, name: '谢云昭', persona: 'x', worldbooks: [], diaryData: { letters: [], diaries: [] } }); window.currentChatSessionId = 7001; });
await page.waitForTimeout(2500);

const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}; const $ = q => document.querySelector(q);
  o.mods = (window.__gyPlayMods || []).length;
  o.feats = ['gyxWalk', 'gyxDream', 'gyxTrpg', 'gyxBond'].every(id => GYX.FEATS.some(f => f.id === id));
  o.noStuck = !registeredMiniGames.some(g => g.id === 'gyxStuck') && !GYX.FEATS.some(f => f.id === 'gyxStuck');
  o.sprite = !!window.__gySpriteLoaded && GY_MINI_FEATURES.some(f => f.id === 'charSprite');
  // 首页 8 个大方块
  switchMainView('miniHub'); await s(800);
  o.tiles = [...document.querySelectorAll('#miniFeatureList .gyhm-t b')].map(b => b.textContent);
  o.apps = document.querySelectorAll('#miniFeatureList .gyhm-a').length;
  o.lines = [...document.querySelectorAll('#miniFeatureList .gyhm-t span')].map(b => b.textContent).filter(Boolean).length;
  o.noOldHubs = !GY_MINI_FEATURES.some(f => ['hub_rel', 'hub_night', 'hub_gift', 'hub_voice'].includes(f.id));
  // 点「我们」→ 分页
  [...document.querySelectorAll('#miniFeatureList .gyhm-t')].find(b => /我们/.test(b.textContent)).click(); await s(1000);
  o.usPills = [...document.querySelectorAll('#gyHubPills button')].map(b => b.textContent.trim());
  o.usCards = [...document.querySelectorAll('#gyHubBody .gyv-t')].map(b => b.textContent);
  // 切到「日子」
  [...document.querySelectorAll('#gyHubPills button')].find(b => /日子/.test(b.textContent)).click(); await s(700);
  o.days = [...document.querySelectorAll('#gyHubBody .gyv-t')].map(b => b.textContent);
  o.dayOn = /日子/.test(document.querySelector('#gyHubPills .on').textContent);
  // 下次打开记得上次那页
  gyHubClose(); gyOpenMiniFeature('hub_us'); await s(700);
  o.remember = /日子/.test(document.querySelector('#gyHubPills .on').textContent);
  // 打开一个插件功能：面板画在入口里，标签还在、亮的是它那一页
  gyHubOpen('hub_us', 'gyxPromise'); await s(1500);
  o.inPanel = !!document.querySelector('#gyHubBody .gyx-inhub') && /约定/.test(document.querySelector('#gyHubPills .on').textContent);
  // ⋯ 只管这一页
  gyHubMore(); await s(300);
  o.sheetTitle = document.querySelector('#gyHubSheet .gyhb-shd b').textContent;
  o.sheetRows = document.querySelectorAll('#gyHubSheet .gyhb-sgrp')[0].querySelectorAll('.gyhb-srow').length;
  document.getElementById('gyHubSheet').remove(); gyHubClose();
  // 老的合集 id（指南、通知用）→ 新入口那一页
  gyOpenMiniFeature('hub_night'); await s(800);
  o.alias1 = document.getElementById('gyHubLt').textContent === '陪你' && /早晚/.test(document.querySelector('#gyHubPills .on').textContent);
  gyHubClose(); gyHubOpen('hub_voice'); await s(800);
  o.alias2 = document.getElementById('gyHubLt').textContent === '聊天' && /性格/.test(document.querySelector('#gyHubPills .on').textContent);
  gyHubClose();
  // 陪你 四页
  gyHubOpen('hub_with'); await s(700);
  o.withPills = [...document.querySelectorAll('#gyHubPills button')].map(b => b.textContent.trim());
  gyHubClose();
  // 284：陪你 每页是一组小组件
  gyHubOpen('hub_with', 'p_一起做'); await s(700);
  o.vTiles = document.querySelectorAll('#gyHubBody .gyv-t').length; o.vOld = document.querySelectorAll('#gyHubBody .gyhb-card2').length;
  o.vWalk = [...document.querySelectorAll('#gyHubBody .gyv-k')].some(k => /散步/.test(k.textContent));
  gyHubOpen('hub_with', 'p_早晚'); await s(500); o.vGroups = [...document.querySelectorAll('#gyHubBody .gyv-gh')].map(x => x.textContent).join();
  gyHubOpen('hub_with', 'p_哄'); await s(500); o.vAsk = document.querySelectorAll('#gyHubBody .gyv-big').length;
  gyHubOpen('hub_with', 'p_贴贴和安静'); await s(500); o.vHero = !!document.querySelector('#gyHubBody .gyv-t.hero');
  [...document.querySelectorAll('#gyHubBody .gyv-t')].find(t => /贴贴/.test(t.textContent)).click(); await s(1500);
  o.vOpen = !!document.querySelector('#gyHubBody .gyx-inhub') && /贴贴和安静/.test(document.querySelector('#gyHubPills .on').textContent);
  gyHubClose();
  // 设置里有 💬 聊天、⚙️ 个性化
  switchMainView('settings'); await s(800);
  o.set = [...document.querySelectorAll('#setIndex [data-gyhub] .set-entry-title')].map(b => b.textContent);
  // 换回原来一列
  gyHubPageSet(false); switchMainView('miniHub'); await s(500);
  o.listMode = !document.querySelector('#miniFeatureList .gyhm-t') && !!document.querySelector('#miniFeatureList .set-entry');
  gyHubPageSet(true);
  return o;
});
check('新玩法都内置了：127 个模块跑起来，陪你 / 梦 / 跑团 / 相处模式 都在', r.mods >= 120 && r.feats, JSON.stringify({ mods: r.mods, feats: r.feats }));
check('TA被困了没了；角色立绘是自带的', r.noStuck && r.sprite);
check('小功能首页 7 个大方块：我们 / 陪你 / TA 的 / 游戏 / 生活 / 世界 / 相册（每块一行现在的情况），下面一个个软件图标', r.tiles.join() === '我们,陪你,TA 的,游戏,生活,世界,相册' && r.apps >= 10 && r.lines >= 6 && r.noOldHubs, JSON.stringify(r.tiles));
check('「我们」分 4 页：关系 / 约定和愿望 / 日子 / 回顾（+⋯），第一页是关系的卡片', r.usPills.slice(0, 4).map(t => t.replace(/^\S+\s/, '')).join() === '关系,约定和愿望,日子,回顾' && r.usCards.some(t => /好感/.test(t)), JSON.stringify(r.usPills) + JSON.stringify(r.usCards));
check('切到「日子」整页换成那一页；下次打开还在那页', r.dayOn && r.remember && !r.days.some(t => /好感/.test(t)), JSON.stringify(r.days));
check('打开一个功能：面板画在入口里，标签亮着它那一页；⋯ 只管这一页', r.inPanel && /约定/.test(r.sheetTitle) && r.sheetRows >= 3 && r.sheetRows <= 6, JSON.stringify({ t: r.sheetTitle, n: r.sheetRows }));
check('老的合集 id 还能打开（早安晚安 → 陪你·早晚；TA 怎么说话 → 设置·聊天·性格）', r.alias1 && r.alias2);
check('「陪你」4 页：一起做 / 早晚 / 哄 / 贴贴和安静', r.withPills.slice(0, 4).map(t => t.replace(/^\S+\s/, '')).join() === '一起做,早晚,哄,贴贴和安静', JSON.stringify(r.withPills));
check('284 陪你：每页是一组小组件（一起做 6 块以上、早晚分早上晚上、哄 4 块大方块、贴贴有大心跳），点一块进那个功能', r.vTiles >= 6 && !r.vOld && r.vWalk && r.vGroups.startsWith('早上,晚上') && r.vAsk === 4 && r.vHero && r.vOpen, JSON.stringify({ t: r.vTiles, old: r.vOld, g: r.vGroups, a: r.vAsk, h: r.vHero, o: r.vOpen }));
check('设置里有 💬 聊天、⚙️ 个性化', r.set.includes('聊天') && r.set.includes('个性化'), JSON.stringify(r.set));
check('能换回原来一列的样子', r.listMode);

// 装过插件的：开机自动拿掉，关着的功能还关着
await page.evaluate(() => { plugins.push({ id: 'z1', name: '🚶 陪你', type: 'script', enabled: false, onLoad: '' }, { id: 'z2', name: '🆘 TA被困了', type: 'script', enabled: true, onLoad: '' }, { id: 'z3', name: '角色立绘差分', type: 'script', enabled: true, onLoad: '' }); saveAllData(); });
const pr = await page.evaluate(() => { const n = gyHubPrune(true); const fs = JSON.parse(localStorage.getItem('gyxFeat') || '{}'); return { n, left: plugins.filter(p => /陪你|被困|立绘/.test(p.name)).length, walkOff: fs.gyxWalk === false }; });
check('装过的「陪你」「TA被困了」「角色立绘差分」插件自动拿掉；「陪你」原来关着，散步这些也关着', pr.n === 3 && !pr.left && pr.walkOff, JSON.stringify(pr));
check('没有报错', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 283 新玩法内置 / 8 个入口 / 分页（284 陪你小组件页） =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
