// 284：我们 / 陪你 / TA 的 / 生活 / 世界 每页都是一组小组件；会出声的功能都有「🔊 TA 出声」开关，默认关，开了也不自己念，点 ▶ 才放
// 用法（项目根目录）：node _开发测试/v284-pages-voice-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path'; import fs from 'fs';
const root = process.cwd();
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('gyPlayOn', '1'); } catch (e) {} });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.__gyPlayReady, { timeout: 25000 });
await page.evaluate(() => {
  myCharacters.push({ id: 7001, name: '谢云昭', persona: 'x', worldbooks: [], diaryData: { letters: [], diaries: [] } }); window.currentChatSessionId = 7001;
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  const fake = async () => ({ choices: [{ message: { content: '我在这儿，慢慢说。' } }] }); window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
  window.__spk = []; GYX.speak = async (c, t, end) => { window.__spk.push(t); if (end) end(); return 'browser'; };
});
await page.waitForTimeout(2000);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  const V = gyHubViews(); o.views = V.length;
  o.bad = [];
  for (const k of V) { const [f, p] = k.split('/'); gyHubOpen(f, p); await s(250); const n = document.querySelectorAll('#gyHubBody .gyv-t, #gyHubBody .gyv-big').length, old = document.querySelectorAll('#gyHubBody .gyhb-card2').length; if (!n || old) o.bad.push(k + ':' + n + '/' + old); }
  gyHubClose();
  gyHubOpen('hub_chatset'); await s(400); o.setCards = document.querySelectorAll('#gyHubBody .gyhb-card2').length; gyHubClose();
  // 抱抱：默认不出声
  gyxHugOpen(); await s(300);
  o.hugRow = /TA 出声/.test(document.getElementById('gyxHugOv') ? document.getElementById('gyxHugOv').innerText : document.body.innerText);
  document.getElementById('gyxHugWhy').value = '有点累'; await gyxHugNote(); await s(600);
  o.off = !document.getElementById('gyxVoOffer') && !window.__spk.length;
  GYX.vSet('gyxHug', true); await gyxHugNote(); await s(600);
  o.offer = !!document.getElementById('gyxVoOffer') && !window.__spk.length;
  document.querySelector('#gyxVoOffer .p').click(); await s(300);
  o.played = window.__spk.length === 1 && !document.getElementById('gyxVoOffer');
  gyxHugClose && gyxHugClose();
  o.defs = { cook: gyxCookData().cfg.voice, coach: gyxCoachData().cfg.voice, wake: GYX.vOn('gyxWake'), beat: GYX.vOn('gyxBeat'), bday: GYX.vOn('gyxBday') };
  gyxWakeOpen(); await s(300); o.wakeRow = /TA 出声/.test(document.getElementById('gyxWkSet').innerText); document.getElementById('gyxWkSet').remove();
  // 设置 → 🧩 新玩法
  switchMainView('settings'); await s(500); o.setPlay = [...document.querySelectorAll('#setIndex [data-gyhub] .set-entry-title')].some(b => b.textContent === '新玩法');
  gyPlayPage(); await s(200); const pt = document.getElementById('gyPlayOv').innerText; o.playSecs = ['我们', '陪你', 'TA 的', '生活', '世界', '游戏', '以前装过的插件', '导入别人写的插件'].filter(w => !pt.includes(w));
  gyPlaySetAll('hub_with/p_哄', false); await s(100); o.allOff = ['gyxHug', 'gyxCoax', 'gyxMakeup', 'gyxSecret'].every(f => !GYX.on(f));
  gyPlayPage('hub_with/p_哄'); o.expand = document.querySelectorAll('#gyPlayOv .gyp-sub').length === 4;
  gyPlaySetAll('hub_with/p_哄', true); o.allOn = GYX.on('gyxHug') && GYX.on('gyxSecret'); document.getElementById('gyPlayOv').remove();
  // 角色编辑页：🗣️ TA 怎么说话
  switchMainView('characterCenter'); await s(300); openFormForEdit(7001); await s(400);
  const ct = document.getElementById('gyCharTalk'); o.talk = !!ct && ['相处模式', '风格调料', '口头禅', '听取模式'].every(w => ct.innerText.includes(w));
  openFormForCreate(); await s(200); o.talkGone = !document.getElementById('gyCharTalk');
  return o;
});
check('我们 / 陪你 / TA 的 / 生活 / 世界 一共 19 页都是小组件，没有旧卡片', r.views === 19 && !r.bad.length, JSON.stringify(r.bad));
check('设置里的 💬 聊天 还是原来的卡片', r.setCards > 0);
check('抱抱有「🔊 TA 出声」开关；默认关：TA 回话了也不出声、不冒条', r.hugRow && r.off, JSON.stringify(r));
check('打开以后：冒一个「▶ 听 TA 说」小条，不自己念；点 ▶ 才念', r.offer && r.played, JSON.stringify(r));
check('做饭 / 私教 默认不出声；叫醒、听心跳、过生日的出声开关默认关；叫醒设置里有开关', r.defs.cook === false && r.defs.coach === false && !r.defs.wake && !r.defs.beat && !r.defs.bday && r.wakeRow, JSON.stringify(r.defs));
check('设置里有 🧩 新玩法：按 我们 / 陪你 / TA 的 / 生活 / 世界 / 游戏 分，一页一个总开关、点开一个个关；以前装过的、导入别人的插件', r.setPlay && !r.playSecs.length && r.allOff && r.expand && r.allOn, JSON.stringify({ s: r.setPlay, miss: r.playSecs, off: r.allOff, ex: r.expand, on: r.allOn }));
check('角色编辑页里有 🗣️ TA 怎么说话（性格、在变、听取模式），新建角色时不显示', r.talk && r.talkGone);
check('微信语音通话不自己念，TA 每句旁边一个 ▶；打电话纯文字模式也有 ▶', /W\.callPlay = /.test(fs.readFileSync(path.join(root, 'js', '61-soft.js'), 'utf8')) && !/CALL\.lines\.push\(\{ t: r \}\); G\.repaint\(APP\); if \(X\.speak\)/.test(fs.readFileSync(path.join(root, 'js', '61-soft.js'), 'utf8')) && /gycall-p/.test(fs.readFileSync(path.join(root, 'js', '47-call.js'), 'utf8')));
check('没有报错', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 284 每页小组件 / TA 出声点了才放 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
