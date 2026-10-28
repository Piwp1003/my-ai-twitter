// 278：新玩法插件的 iOS 样子（js/91：大标题、分组卡片、设置收进 ⋯、勾选框变开关、能关）+ 抖音「一起看」
// 用法（项目根目录）：node _开发测试/v278-ios-plug-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path'; import fs from 'fs';
const root = process.cwd();
const NEW = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted, { timeout: 20000 });
await page.evaluate(NEW => { myCharacters.push({ id: 7001, name: '谢云昭', persona: 'x', worldbooks: [], diaryData: { letters: [], diaries: [] } }); window.currentChatSessionId = 7001; NEW.forEach(p => { try { executePluginOnLoad(p); } catch (e) {} }); gyPmSet(true); }, NEW);
await page.waitForTimeout(1200);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {}; const $ = q => document.querySelector(q);
  try { gyPmUnlock(); } catch (e) {}
  o.cls = document.body.classList.contains('gy-ios-plug');
  gyOpenMiniFeature('gyxPromise'); await s(1000);
  const ov = $('#gyxPrOv'); o.title = !!ov && !!ov.querySelector('.gy-iplt') && ov.querySelector('.gy-iplt').textContent === '小约定';
  const bd = ov.querySelector('.gyx-bd'); o.moved = !/默认模式的 TA/.test(bd.textContent) && /默认模式的 TA/.test(ov.querySelector('.gy-ips').textContent);
  const m = ov.querySelector('.gy-ipm'); o.more = !!m; if (m) m.click(); await s(300); o.sheet = ov.querySelector('.gy-ips').classList.contains('on');
  const inp = ov.querySelector('.gy-ips input[type=number]'); inp.value = '44'; inp.dispatchEvent(new Event('change')); await s(200);
  gyOpenMiniFeature('gyxPromise'); await s(900); o.works = $('#gyxPrOv .gy-ips input[type=number]') && $('#gyxPrOv .gy-ips input[type=number]').value === '44';
  o.sheetPos = getComputedStyle($('#gyxPrOv .gyx-box')).borderTopLeftRadius;
  $('#gyxPrOv').remove();
  // 勾选框变开关
  gyOpenMiniFeature('gyxCapsule'); await s(900); const cb = document.querySelector('.gyx-ov input[type=checkbox]'); o.sw = cb && getComputedStyle(cb).appearance === 'none' && cb.getBoundingClientRect().width > 45;
  document.querySelectorAll('.gyx-ov').forEach(e => e.remove());
  // 合集列表
  gyOpenMiniFeature('hub_night'); await s(1000); o.hub = !!document.querySelector('.gyhb-body .gy-iplt') && getComputedStyle(document.querySelector('.gyhb-rm em') || document.body).display === 'none';
  try { gyHubClose(); } catch (e) {}
  // 关掉 → 原样
  gyIos.set('plug', false); await s(200); gyOpenMiniFeature('gyxPromise'); await s(900);
  o.off = !document.body.classList.contains('gy-ios-plug') && !$('#gyxPrOv .gy-iplt') && /默认模式的 TA/.test($('#gyxPrOv .gyx-bd').textContent);
  $('#gyxPrOv').remove(); gyIos.set('plug', true);
  // 抖音一起看
  gysDouyinWatch(); await s(400); o.dy = /一起看/.test(document.querySelector('#gys_douyin .dy-top').textContent) && !!document.querySelector('#gys_douyin .dy-wts') && /本地电影/.test(document.querySelector('#gys_douyin').innerText);
  const H = gyHubHideIds(); o.hide = H.has('webMedia') && H.has('watch_together');
  o.noOldRed = window.__gyxRed === 1 && window.__gyxLive === 1;   // 279：老合集里的旧小红书 / 旧直播间不再出来
  return o;
});
check('iOS 外观开着：插件换样子', r.cls, JSON.stringify(r));
check('大标题', r.title);
check('「默认模式的 TA 每天有…」收进 ⋯，点 ⋯ 弹出设置页', r.moved && r.more && r.sheet, JSON.stringify(r));
check('设置页里改了照样生效', r.works);
check('手机上是从底下升上来的整页卡片', r.sheetPos === '12px', r.sheetPos);
check('勾选框变成 iOS 开关', r.sw);
check('合集：大标题、说明小字不显示', r.hub);
check('关掉「新玩法插件」→ 原来的样子', r.off);
check('抖音首页顶上「一起看」：贴链接 / 本地电影；小功能里不再单独出', r.dy && r.hide);
check('老「主页和社交」里的旧小红书、旧直播间被挡住', r.noOldRed);
check('没有报错', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 278 插件 iOS 样子 / 抖音一起看 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length ? 0 : 1);
