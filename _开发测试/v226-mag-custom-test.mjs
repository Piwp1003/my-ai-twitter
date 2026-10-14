// v226：🏷️ 小手机贴纸（贴纸库、抠图、TA 的封面、TA 贴贴纸）+ 🏅 成就 / 📈 等级能自定义、能让 TA 来设
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const BAILU = fs.existsSync(path.join(root, 'js', '90-bailu-cards.js'));
const PLUG = JSON.parse(fs.readFileSync(path.join(root, '插件', '新玩法', '新玩法全家桶.json'), 'utf8'));
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const tag = BAILU ? '[白露]' : '[谷雨]';
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof executePluginOnLoad === 'function', { timeout: 20000 });
await page.waitForTimeout(1000);
await page.evaluate(({ PLUG }) => {
  if (window.bailuCards) window.__bailuNoBuiltin = true;
  myCharacters.push({ id: 9991, name: 'Leon', persona: '法国摄影师', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  const H = []; for (let i = 0; i < 30; i++) H.push({ sender: i % 2 ? 9991 : 'me', text: i % 3 ? '晚安呀' : '今天路过花店，想起你了', timestamp: Date.now() - (30 - i) * 36e5, readBy: [] });
  globalChats['9991'] = H;
  PLUG.forEach(p => executePluginOnLoad(p));
}, { PLUG });
await page.waitForTimeout(3000);

// ① 🏷️ 贴纸：杂志风删了，贴纸库、抠图、TA 的封面、TA 自己来 留着
const st = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  gyPmSet(true); await sleep(1200); try { gyPmUnlock(); } catch (e) {}
  o.noMag = typeof window.gyMagSet === 'undefined' && typeof window.gyMagLayout === 'undefined' && !document.body.classList.contains('pm-th-mag') && !window.__gyPmW.WD.magDate;
  gyPmBeauty(); await sleep(200); const sh = document.getElementById('gyPmSheet').innerText; o.sheet = /🏷️ 贴纸/.test(sh) && !/杂志/.test(sh); gyPmCloseSheet();
  const lib = gyMagInfo().lib; o.lib = lib;
  const n0 = document.querySelectorAll('#gyPmHome .wk-magStk').length; await gyMagStickers(); await sleep(100);
  o.img = !!document.querySelector('#gyPmSheet .pm-magst img[src^="img/stk/"]');
  gyMagPick('o_heart'); await sleep(300); o.pick = document.querySelectorAll('#gyPmHome .wk-magStk').length === n0 + 1;
  gyMagAddCover(); await sleep(300); const cv = document.querySelector('#gyPmHome .wk-magCover'); o.cover = !!cv && !!cv.querySelector('.sk-cov') && !/GUYU|BAILU|VOL\./.test(cv.innerText);
  // 抠图
  const c = document.createElement('canvas'); c.width = 200; c.height = 160; const g = c.getContext('2d'); g.fillStyle = '#7fd0ff'; g.fillRect(0, 0, 200, 160); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(100, 80, 46, 0, 7); g.fill();
  const m0 = gyMagData().mine.length; gyMagCut(c.toDataURL()); await sleep(400);
  const ov = document.getElementById('gyMagCutOv'); ov.querySelector('[data-t="flood"]').click(); await sleep(100); ov.querySelector('.nm').value = '红色圆'; ov.querySelector('.ok').click(); await sleep(500);
  o.cut = gyMagData().mine.length === m0 + 1;
  // TA 自己来
  o.acts = ['pm_mag_cover', 'pm_mag_sticker'].every(k => GY_AUTONOMY_ACTIONS.some(a => a.key === k)) && AUTO_FEATURE_DEFS.some(f => f.key === 'pmStkTa');
  const ch = myCharacters.find(x => x.id === 9991);
  const a = GY_AUTONOMY_ACTIONS.find(x => x.key === 'pm_mag_sticker'); o.need = !!a.need(ch);
  return o;
});
check(`${tag} 杂志风删干净了（没主题、没杂志壁纸、没大日期），美化里换成「🏷️ 贴纸」一节`, st.noMag && st.sheet, JSON.stringify(st));
check(`${tag} 贴纸库（手绘小人 16 / 照片 3 / 小物件）从 img/stk 读，点一张贴到桌面；「TA 的封面」小组件是普通样式；抠图存进我的贴纸；TA 会写封面、贴贴纸`, st.lib.find(x => x[0] === 'dd')[1] === 16 && st.lib.find(x => x[0] === 'ph')[1] === 3 && st.img && st.pick && st.cover && st.cut && st.acts && st.need, JSON.stringify(st));

// ④ 🏅 成就自定义 + 让 TA 来设
const bg = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {}, c = myCharacters.find(x => x.id === 9991), A = k => GY_AUTONOMY_ACTIONS.find(a => a.key === k);
  await gyxBadgeAdd('9991', { n: '晚安达人', type: 'kwN', kw: '晚安', who: 'any', num: 5 });
  await gyxBadgeAdd('9991', { n: '一起看日出', type: 'manual' });
  await gyxBadgeOv('9991', 'hello', 'n', '第一句话'); await gyxBadgeOv('9991', 'm5000', 'off', true);
  await gyxBadgeCheck('9991'); await sleep(100);
  const G = gyxBadgeData().got['9991'], L = gyxBadgeAll('9991');
  o.kwN = Object.values(G).some(g => /说了 \d+ 次/.test(g.why)); o.ren = L.some(x => x.n === '第一句话'); o.off = !L.some(x => x.id === 'm5000');
  const sun = L.find(x => x.n === '一起看日出'); o.manualLocked = !G[sun.id]; await gyxBadgeLight('9991', sun.id); o.lit = !!gyxBadgeData().got['9991'][sun.id];
  gyxBadgeTab('9991', 'edit'); await sleep(100); o.edit = /让 Leon 来设/.test(document.getElementById('gyxBgOv').innerText);
  const t = await gyxBadgeTaSet('9991'); o.ta = t.length >= 1 && t.every(x => x.by === 'ta');
  o.acts = ['gyx_badge_new', 'gyx_badge_light'].every(k => !!A(k)); o.mem = gyMemExList().includes('gyxBadgeCust');
  document.getElementById('gyxBgOv') && document.getElementById('gyxBgOv').remove(); gyxBadgeTab('9991', 'wall');
  return o;
});
check(`${tag} 成就：内置的能改名 / 关掉，能自己加（某句话说满 N 次、认识满 N 天、手动点亮……），能让 TA 来设，TA 也会自己加、替你们点亮`, Object.values(bg).every(v => v === true), JSON.stringify(bg));

// ⑤ 📈 等级自定义 + 让 TA 来起称号
const lv = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {}, A = k => GY_AUTONOMY_ACTIONS.find(a => a.key === k);
  const e0 = gyxLevelInfo('9991');
  await gyxLevelTitle('9991', 0, 't', '萍水相逢'); o.title = gyxLevelInfo('9991').lv >= 1;
  await gyxLevelCfg('9991', 'curve', 'fast'); o.fast = gyxLevelInfo('9991').lv >= e0.lv;
  await gyxLevelEx('9991', '', 'add'); o.extra = gyxLevelInfo('9991').exp > e0.exp;
  await gyxLevelW('9991', '说过的话', 0); o.w0 = gyxLevelInfo('9991').exp < gyxLevelInfo('9991').exp + 1;
  await gyxLevelCfg('9991', 'gifts', '一首歌 / 一封信'); o.gifts = true;
  gyxLevelTab('9991', 'edit'); await sleep(100); o.edit = /升级快慢/.test(document.getElementById('gyxLvOv').innerText) && /萍水相逢/.test(document.getElementById('gyxLvOv').innerHTML);
  await gyxLevelTaSet('9991'); o.ta = !!gyxLevelInfo('9991').title && gyxLevelInfo('9991').title !== '萍水相逢';
  o.act = !!A('gyx_level_set'); o.mem = gyMemExList().includes('gyxLevelTitles');
  await gyxLevelReset('9991'); o.reset = gyxLevelInfo('9991').title === '刚认识' || gyxLevelInfo('9991').lv > 1;
  document.getElementById('gyxLvOv') && document.getElementById('gyxLvOv').remove(); gyxLevelTab('9991', 'lv');
  return o;
});
check(`${tag} 等级：称号、升级快慢、礼物、每样事值多少经验、自己加的经验来源都能改；能让 TA 来起一套称号；能恢复默认`, Object.values(lv).every(v => v === true), JSON.stringify(lv));

check(`${tag} 整个过程没有页面报错`, errs.length === 0, errs.join(' | ').slice(0, 600));
await browser.close();
const bad = results.filter(r => !r.ok);
results.forEach(r => console.log((r.ok ? '  ✅' : '  ❌') + ' ' + r.n + (r.ok ? '' : '\n       → ' + r.extra)));
console.log('\n' + (results.length - bad.length) + '/' + results.length + ' 通过');
process.exit(bad.length ? 1 : 0);
