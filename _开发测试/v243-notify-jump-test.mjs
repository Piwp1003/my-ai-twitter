// v243：🔔 插件通知点了要能跳过去（弹窗 / 通知页 / 小手机通知中心 / 刷新以后）
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path'; import fs from 'fs';
const root = process.cwd();
const PLUG = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const SRC = path.join(root, '..', 'plugins', 'src');
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.evaluate(() => { myCharacters.push({ id: 9991, name: 'Leon', persona: '摄影师', worldbooks: [] }); });
await page.evaluate(({ PLUG }) => { PLUG.forEach(p => executePluginOnLoad(p)); }, { PLUG });
await page.waitForTimeout(3500);
// 所有插件里通知写的去处
const targets = new Set();
let s = ''; try { for (const f of fs.readdirSync(SRC)) if (/^\d/.test(f)) s += fs.readFileSync(path.join(SRC, f), 'utf8'); } catch (e) {}
for (const m of s.matchAll(/X\.go\('(\w+)'/g)) targets.add(m[1]);
for (const m of s.matchAll(/X\.notify\([^;]*?, '(gyx\w+)'\)/g)) targets.add(m[1]);
const r = await page.evaluate(async T => {
  const sl = ms => new Promise(r => setTimeout(r, ms)); const o = {}; const c = myCharacters.find(x => x.id === 9991);
  o.missing = T.filter(n => typeof window[n] !== 'function');
  o.closures = 0;
  // 1) 新写法：点弹窗就打开
  let hit = []; const orig = window.gyxSillOpen; window.gyxSillOpen = (...a) => hit.push(['sill', a]);
  GYX.notify(c, '🪟 测试窗台', '', GYX.go('gyxSillOpen'));
  await sl(100); const t = [...document.querySelectorAll('[data-nid]')].find(e => /测试窗台/.test(e.innerText)) || document.querySelector('.toast-notification,[class*=toast]');
  const n0 = globalNotifications[0]; o.stored = n0.jump && n0.jump.fn === 'gyxSillOpen';
  if (t && t.onclick) t.onclick(); else gyOpenNotif(n0);
  o.toast = hit.length === 1;
  // 2) 通知页点
  switchMainView('notifications'); await sl(200);
  document.querySelector(`[data-nid="${n0.id}"]`).click(); o.page = hit.length === 2;
  // 3) 存一下再读回来（刷新以后）：函数名和参数还在
  window.gyxBoxOpen0 = window.gyxBoxOpen; window.gyxBoxOpen = (...a) => hit.push(['box', a]);
  GYX.notify(c, '📦 测试旧物', '', GYX.go('gyxBoxOpen', c.id));
  const saved = JSON.parse(JSON.stringify(globalNotifications[0])); gyOpenNotif(saved);
  o.reload = hit.length === 3 && hit[2][0] === 'box' && String(hit[2][1][0]) === '9991';
  // 4) 老写法（直接给函数）也能跳；存过以后按名字兜底
  GYX.notify(c, '老写法', '', () => window.gyxSillOpen(1)); gyOpenNotif(globalNotifications[0]); o.oldLive = hit.length === 4 && hit[3][1][0] === 1;
  const sv2 = JSON.parse(JSON.stringify(globalNotifications[0])); delete window.__gyJumpRef[sv2.jump.ref]; gyOpenNotif(sv2); o.oldSaved = hit.length === 5;
  // 5) 小手机通知中心
  try { gyPmSet(true); await sl(500); GYX.notify(c, '📱 小手机测试', '', GYX.go('gyxSillOpen')); await sl(200);
    const before = hit.length; const n = globalNotifications[0]; gyOpenNotif(n.id); o.pm = hit.length === before + 1; gyPmSet(false); await sl(300); } catch (e) { o.pmErr = String(e); }
  // 6) 自主行动：自己弹过通知的，js/60 不再补一条「去主页」
  const pre = globalNotifications.length;
  GYX.action({ key: 'gyx_test_a', label: '测试动作', need: () => true, run: async cc => { GYX.notify(cc, '动作自己的通知', '', GYX.go('gyxSillOpen')); return '做了测试'; } });
  const act = GY_AUTONOMY_ACTIONS.find(a => a.key === 'gyx_test_a');
  await gyAutonomyRunItem(c, act, {});
  o.noDouble = globalNotifications.length === pre + 1;
  // 7) 没自己弹通知的动作：js/60 那条点了去聊天，不是主页
  GYX.action({ key: 'gyx_test_b', label: '测试动作b', need: () => true, run: async () => '只是做了' });
  await gyAutonomyRunItem(c, GY_AUTONOMY_ACTIONS.find(a => a.key === 'gyx_test_b'), {});
  const nb = globalNotifications[0]; o.toChat = nb.jump && String(nb.jump.chat) === '9991';
  window.gyxSillOpen = orig; window.gyxBoxOpen = window.gyxBoxOpen0;
  // 8) 真打开：窗台来客的面板出来
  document.querySelectorAll('.gyx-ov').forEach(e => e.remove());
  GYX.notify(c, '🪟 真开', '', GYX.go('gyxSillOpen')); gyOpenNotif(globalNotifications[0]); await sl(400);
  o.real = !!document.querySelector('.gyx-ov');
  return o;
}, [...targets]);
const J = JSON.stringify(r);
check(`插件里 ${targets.size} 个通知去处都找得到打开的地方`, targets.size > 40 && !r.missing.length, J);
check('点弹窗能跳过去', r.stored && r.toast, J);
check('通知页里点能跳过去', r.page, J);
check('刷新以后（存过再读）还能跳，参数也在', r.reload, J);
check('老写法（直接给函数）也能跳，刷新后按名字兜底', r.oldLive && r.oldSaved, J);
check('小手机通知中心点了能跳', r.pm, J);
check('自主行动自己弹过的，不再多弹一条「去主页」', r.noDouble, J);
check('没自己弹的，点了去跟 TA 的聊天', r.toChat, J);
check('真点开：面板出来了', r.real, J);
const bad = errs.filter(e => !/Failed to fetch/.test(e)); check('没有页面报错', !bad.length, bad.join(' | ').slice(0, 600));
await browser.close();
let fail = 0; for (const x of results) { console.log((x.ok ? '✅' : '❌') + ' ' + x.n + (x.ok ? '' : '  ' + x.extra)); if (!x.ok) fail++; }
console.log(`\n${results.length - fail}/${results.length} 通过`); process.exit(fail ? 1 : 0);
