// 275：「📞 来电动画和铃声」+「📞 来电增强」合成「📞 来电」一个入口；「主页和社交」里老的 📕 小红书拿掉了（软件里有）
// 用法（项目根目录）：node _开发测试/v275-call-red-icons-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path'; import fs from 'fs';
const root = process.cwd();
const NEW = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const SOFT = []   /* 277：软件都内置了，不用导入 */;
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(({ NEW, SOFT }) => { myCharacters.push({ id: 9991, name: 'Leon', persona: 'x', worldbooks: [], diaryData: { letters: [], diaries: [] } }); window.currentChatSessionId = 9991; NEW.concat(SOFT).forEach(p => { try { executePluginOnLoad(p); } catch (e) {} }); }, { NEW, SOFT });
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  const M = id => GY_MINI_FEATURES.some(f => f.id === id);
  o.one = M('gyxCall') && !M('gyxRing') && !M('gyxCallPlus');
  o.feats = (window.__gyxFeats || []).some(f => (f.id || f) === 'gyxRing') && (window.__gyxFeats || []).some(f => (f.id || f) === 'gyxCallPlus');
  gyOpenMiniFeature('gyxCall'); await s(200);
  const ov = document.getElementById('gyxCallOv'); o.open = !!ov && /画面和铃声/.test(ov.innerText) && /语音留言/.test(ov.innerText) && /来电画面/.test(ov.innerText);
  gyxCallPlusOpen('vm'); await s(100); o.vm = !!document.getElementById('gyxCallOv') && document.querySelectorAll('[id="gyxCallOv"]').length === 1 && /还没有|没听|Leon/.test(document.getElementById('gyxCallOv').innerText);
  gyxRingOpen(); await s(100); o.back = /来电画面/.test(document.getElementById('gyxCallOv').innerText);
  try { document.getElementById('gyxCallOv').remove(); } catch (e) {}
  o.noOldRed = !(window.__gyxFeats || []).some(f => (f.id || f) === 'gyxRed');
  o.softRed = typeof window.gyxRedOpen === 'function' && typeof GYS !== 'undefined' && !!GYS.APPS.red;
  return o;
});
check('两个来电合成一个入口「📞 来电」（两个开关还在）', r.one && r.feats, JSON.stringify(r));
check('打开是一页，顶上标签：画面和铃声 / 拒接和查岗 / 语音留言 / 通话小结，来回切还是这一页', r.open && r.vm && r.back, JSON.stringify(r));
check('「主页和社交」里老的小红书没了；软件里的小红书还在', r.noOldRed && r.softRed, JSON.stringify(r));
const B = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '源码', 'bundles.json'), 'utf8'));
check('装了合并版会把旧的两个单独插件拿掉（改过名的也认）', B.bundles['📱 小手机'].some(([n]) => n === '📞 来电动画和铃声') && B.bundles['📱 小手机'].some(([n]) => n === '📞 来电增强') && !B.bundles['📰 主页和社交'].some(([n]) => n === '📕 小红书'));
check('没有报错', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 275 来电合并 / 老小红书拿掉 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length ? 0 : 1);
