// 300：🔍 聊天里搜表情包（选表情窗口顶上的搜索框：先找自己的，再上网搜；点图就用、＋ 只存）
// 用法（项目根目录）：node _开发测试/v300-sticker-search-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
import fs from 'fs';
import vm from 'vm';
const root = process.cwd();
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const browser = await launchBrowser(chromium);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
const hits = [];
await page.route(/^https?:\/\//, r => {
  const u = r.request().url();
  if (/guyu\.pw\/api\/stk/.test(u)) {
    hits.push(u); const U = new URL(u); const first = +U.searchParams.get('first') || 0;
    if (/搜不到/.test(U.searchParams.get('q'))) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: false, err: '没搜到' }) });
    const items = [0, 1, 2].map(i => ({ t: `https://ts1.mm.bing.net/th?id=OIP.t${first + i}&pid=15.1`, m: '', d: '标题' + (first + i), k: 'K' + (first + i) }));
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, items }) });
  }
  if (/mm\.bing\.net\/th/.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: Buffer.concat([PNG, Buffer.from(u.slice(-12))]) });
  return r.abort();
});
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => typeof myCharacters !== 'undefined' && typeof openEmoticonPicker === 'function' && typeof gyStkGo === 'function', null, { timeout: 30000 });
await page.waitForTimeout(1800);
const r = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  const $ = id => document.getElementById(id);
  globalEmoticons.length = 0;
  globalEmoticons.push({ id: 'e1', url: 'data:image/png;base64,AAAA', desc: '开心转圈' }, { id: 'e2', url: 'data:image/png;base64,BBBB', desc: '无语' });
  openEmoticonPicker('chat'); await sleep(150);
  o.bar = !!$('gyStkQ') && $('gyStkBar').style.display !== 'none';
  // 打字：先在自己的表情库里找
  $('gyStkQ').value = '开心'; $('gyStkQ').dispatchEvent(new Event('input')); await sleep(60);
  const cells = [...document.querySelectorAll('#emoticonPickerGallery .emo-item')];
  o.local = cells.map(c => c.style.display !== 'none').join(','); o.localTip = ($('gyStkLocalTip') || {}).textContent || '';
  // 点「搜」：上网找
  $('gyStkGo').click(); await sleep(500);
  o.webN = document.querySelectorAll('#gyStkGrid .stk').length; o.galHidden = $('emoticonPickerGallery').style.display === 'none';
  // 点 ＋：只存不发
  document.querySelector('#gyStkGrid .stk[data-i="1"] b').click(); await sleep(500);
  o.addOnly = globalEmoticons.length === 3 && globalEmoticons[2].desc === '开心' && /^data:image\/png/.test(globalEmoticons[2].url) && !pendingChatAttachment;
  o.tick = document.querySelector('#gyStkGrid .stk[data-i="1"] b').textContent;
  // 再来一些
  document.querySelector('#gyStkGrid .more').click(); await sleep(500);
  o.moreN = document.querySelectorAll('#gyStkGrid .stk').length;
  // 点图：用在这条消息上 + 顺手存进表情库；窗口关掉
  document.querySelector('#gyStkGrid .stk[data-i="0"] img').click(); await sleep(600);
  o.used = /^data:image\/png/.test(pendingChatAttachment || '') && globalEmoticons.length === 4 && globalEmoticons[3].url === pendingChatAttachment;
  o.preview = $('chatAttachmentPreview').style.display === 'block';
  // 关掉「用过的存进表情库」：点图只用不存
  clearAttachment('chat'); openEmoticonPicker('chat'); await sleep(120);
  o.reset = $('gyStkQ').value === '' && $('emoticonPickerGallery').style.display !== 'none' && $('gyStkRes').style.display === 'none';
  $('gyStkQ').value = '猫猫'; $('gyStkGo').click(); await sleep(500);
  $('gyStkKeep').click(); await sleep(30);
  document.querySelector('#gyStkGrid .stk[data-i="2"] img').click(); await sleep(600);
  o.noKeep = !!pendingChatAttachment && globalEmoticons.length === 4;
  // 搜不到
  clearAttachment('chat'); openEmoticonPicker('chat'); await sleep(100);
  $('gyStkQ').value = '搜不到'; $('gyStkGo').click(); await sleep(500);
  o.none = $('gyStkMsg').textContent;
  // 关掉开关：搜索框没了，跟以前一样
  closeEmoticonPicker(); GYX.set('gyStkSearch', false); openEmoticonPicker('chat'); await sleep(120);
  o.off = $('gyStkBar').style.display === 'none' && $('emoticonPickerGallery').style.display !== 'none';
  GYX.set('gyStkSearch', true); closeEmoticonPicker();
  // 抠必应那一页
  o.parse = window.__gyStkParse('<a class="iusc" m="{&quot;murl&quot;:&quot;https://a/b.gif&quot;,&quot;turl&quot;:&quot;https://ts1.mm.bing.net/th?id=OIP.x&amp;pid=15.1&quot;,&quot;t&quot;:&quot;开心 表情包&quot;,&quot;mid&quot;:&quot;M1&quot;}"></a>');
  return o;
});
check('选表情的窗口顶上有搜索框；打字先在自己的表情库里按含义找', r.bar && r.local === 'true,false' && /1 张/.test(r.localTip), r.local + ' ' + r.localTip);
check('点「搜」上网找：出来一格格的图，自己的表情库先收起来；关键词自动带上「表情包」', r.webN === 3 && r.galHidden && hits.length >= 1 && /%E8%A1%A8%E6%83%85%E5%8C%85/.test(hits[0]), hits[0]);
check('右上角 ＋：只存进表情库（存的是图片本身，含义 = 搜的词），不贴到消息上，变成 ✓', r.addOnly && r.tick === '✓');
check('「再来一些」接着往下翻', r.moreN === 6 && hits.some(h => /first=35/.test(h)), String(r.moreN));
check('点图：这条消息就用它（预览出来了），顺手存进表情库', r.used && r.preview);
check('重新打开窗口：搜索框清空，回到自己的表情库', r.reset);
check('去掉「用过的存进表情库」的勾：点图只用不存', r.noKeep);
check('搜不到会直说', /没搜到/.test(r.none), r.none);
check('关掉开关「🔍 聊天里搜表情包」：搜索框没了，跟以前一样', r.off);
check('能从必应那一页里把缩略图、标题抠出来', r.parse.length === 1 && r.parse[0].t === 'https://ts1.mm.bing.net/th?id=OIP.x&pid=15.1' && r.parse[0].d === '开心 表情包' && r.parse[0].k === 'M1', JSON.stringify(r.parse));
// functions/api/stk.js：假装必应回了一页，看它整理得对不对
{
  let src = fs.readFileSync(path.join(root, 'functions/api/stk.js'), 'utf8').replace(/export async function /g, 'async function ') + '\n;({ onRequestGet, onRequestOptions });';
  const asked = [];
  const sandbox = { URL, Response, JSON, Object, String, Math, parseInt, encodeURIComponent, fetch: async (u, o) => { asked.push([u, o]); return new Response('<div m="{&quot;turl&quot;:&quot;https://ts2.mm.bing.net/th?id=OIP.a&amp;pid=15.1&quot;,&quot;murl&quot;:&quot;https://x/y.jpg&quot;,&quot;t&quot;:&quot;标题&quot;,&quot;mid&quot;:&quot;MM&quot;}"></div><div m="{&quot;turl&quot;:&quot;https://evil.example/th&quot;}"></div>', { status: 200 }); } };
  const mod = vm.runInNewContext(src, sandbox);
  const res = await mod.onRequestGet({ request: { url: 'https://guyu.pw/api/stk?q=' + encodeURIComponent('开心 表情包') + '&first=35' } });
  const j = await res.json();
  const bad = await mod.onRequestGet({ request: { url: 'https://guyu.pw/api/stk' } });
  check('guyu.pw/api/stk：替网页去必应搜，只留必应自己的缩略图，允许跨域；没关键词直接拒绝', j.ok && j.items.length === 1 && j.items[0].k === 'MM' && /cn\.bing\.com\/images\/async\?q=.*first=35/.test(asked[0][0]) && res.headers.get('access-control-allow-origin') === '*' && bad.status === 400, JSON.stringify(j));
}
check('没有页面报错', !errs.length, errs.join(' | '));
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
