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
const hits = [], imgRef = [];
await page.route(/^https?:\/\//, r => {
  const u = r.request().url();
  if (/guyu\.pw\/api\/stk/.test(u)) {
    hits.push(u); const U = new URL(u); const first = +U.searchParams.get('first') || 0; const q = U.searchParams.get('q');
    const H = { 'access-control-allow-origin': '*' };
    if (/搜不到/.test(q)) return r.fulfill({ status: 200, contentType: 'application/json', headers: H, body: JSON.stringify({ ok: false, none: true, err: '360：通了，没有结果' }) });
    if (/全挂/.test(q)) return r.fulfill({ status: 200, contentType: 'application/json', headers: H, body: JSON.stringify({ ok: false, err: '360：把这次当成机器人拦了；必应：回了 403' }) });
    const items = [0, 1, 2].map(i => ({ t: `https://p5.ssl.qhimgs1.com/sdr/_240_/t${first + i}.${i === 1 ? 'gif' : 'jpg'}`, f: `https://p5.ssl.qhimgs1.com/t${first + i}.${i === 1 ? 'gif' : 'jpg'}`, gif: i === 1, d: '标题' + (first + i), k: 'so:K' + (first + i) }));
    return r.fulfill({ status: 200, contentType: 'application/json', headers: H, body: JSON.stringify({ ok: true, src: '360', items }) });
  }
  if (/image\.so\.com\/j/.test(u)) { hits.push(u); return /全挂/.test(decodeURIComponent(u)) ? r.fulfill({ status: 200, contentType: 'text/html', body: '<html>访问异常</html>' }) : r.abort(); }
  if (/qhimgs1\.com\//.test(u)) { imgRef.push(r.request().headers().referer || ''); return r.fulfill({ status: 200, contentType: /\.gif/.test(u) ? 'image/gif' : 'image/png', headers: { 'access-control-allow-origin': '*' }, body: Buffer.concat([PNG, Buffer.from(u.slice(-12))]) }); }
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
  o.addOnly = globalEmoticons.length === 3 && globalEmoticons[2].desc === '开心' && /^data:image\/gif/.test(globalEmoticons[2].url) && !pendingChatAttachment;
  o.gifBadge = document.querySelectorAll('#gyStkGrid .stk i').length;
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
  // 只看动图：只剩会动的，关键词带上「动图」
  openEmoticonPicker('chat'); await sleep(100);
  $('gyStkQ').value = '猫猫'; $('gyStkGo').click(); await sleep(400);
  document.querySelector('#gyStkSeg [data-g="1"]').click(); await sleep(500);
  o.gifOnly = [...document.querySelectorAll('#gyStkGrid .stk')].length === 1 && !!document.querySelector('#gyStkGrid .stk i');
  document.querySelector('#gyStkSeg [data-g="0"]').click(); await sleep(400);
  // 全挂：写明每条路为什么不行
  $('gyStkQ').value = '全挂'; $('gyStkGo').click(); await sleep(900);
  o.whyTxt = $('gyStkMsg').innerText; o.why = gyStkState().why;
  closeEmoticonPicker();
  o.map = window.__gyStkMap({ list: [{ id: 'A', title: '开<b>心</b>', thumb: 'https://p5.ssl.qhimgs1.com/t01.gif', _thumb: 'https://p5.ssl.qhimgs1.com/sdr/_240_/t01.gif' }, { id: 'B', thumb: 'http://x/y.jpg' }] });
  return o;
});
check('选表情的窗口顶上有搜索框；打字先在自己的表情库里按含义找', r.bar && r.local === 'true,false' && /1 张/.test(r.localTip), r.local + ' ' + r.localTip);
check('点「搜」上网找：出来一格格的图，自己的表情库先收起来；关键词自动带上「表情包」；会动的标着「动图」', r.webN === 3 && r.galHidden && hits.length >= 1 && /%E8%A1%A8%E6%83%85%E5%8C%85/.test(hits[0]) && r.gifBadge === 1, hits[0]);
check('右上角 ＋：只存进表情库（动图存的还是 gif，含义 = 搜的词），不贴到消息上，变成 ✓；取图时不带来路', r.addOnly && r.tick === '✓' && imgRef.length > 0 && imgRef.every(x => !x), JSON.stringify(imgRef.slice(0, 3)));
check('「再来一些」接着往下翻', r.moreN === 6 && hits.some(h => /first=60/.test(h)), String(r.moreN));
check('点图：这条消息就用它（预览出来了），顺手存进表情库', r.used && r.preview);
check('重新打开窗口：搜索框清空，回到自己的表情库', r.reset);
check('去掉「用过的存进表情库」的勾：点图只用不存', r.noKeep);
check('这个词没有图：直说「搜索是通的，只是这个词没有图」，不当成出错', /没搜到/.test(r.none) && /通的/.test(r.none) && !/为什么没搜成/.test(r.none), r.none);
check('「只看动图」：只留会动的，关键词带上「动图」', r.gifOnly && hits.some(h => /%E5%8A%A8%E5%9B%BE/.test(h)));
check('没搜成：写明试了哪几条路、每条为什么不行、怎么办', /为什么没搜成/.test(r.whyTxt) && /guyu\.pw 转/.test(r.whyTxt) && /机器人拦了/.test(r.whyTxt) && /直接问 360/.test(r.whyTxt) && /怎么办/.test(r.whyTxt) && r.why.length === 2, r.whyTxt);
check('关掉开关「🔍 聊天里搜表情包」：搜索框没了，跟以前一样', r.off);
check('360 的结果整理对：只要 https 的缩略图，认得出动图，标题去掉标签', r.map.length === 1 && r.map[0].gif && r.map[0].t === 'https://p5.ssl.qhimgs1.com/sdr/_240_/t01.gif' && r.map[0].f === 'https://p5.ssl.qhimgs1.com/t01.gif' && r.map[0].d === '开心' && r.map[0].k === 'so:A', JSON.stringify(r.map));
// functions/api/stk.js：假装必应回了一页，看它整理得对不对
{
  let src = fs.readFileSync(path.join(root, 'functions/api/stk.js'), 'utf8').replace(/export async function /g, 'async function ') + '\n;({ onRequestGet, onRequestOptions });';
  const mk = fetchFn => vm.runInNewContext(src, { URL, Response, JSON, Object, String, Math, parseInt, encodeURIComponent, Error, RegExp, fetch: fetchFn });
  const asked = [];
  const so = JSON.stringify({ list: [{ id: 'S1', title: '标题', thumb: 'https://p5.ssl.qhimgs1.com/t01.gif', _thumb: 'https://p5.ssl.qhimgs1.com/sdr/_240_/t01.gif' }, { id: 'S2', thumb: 'https://evil.example/x.jpg' }] });
  const bing = '<div m="{&quot;turl&quot;:&quot;https://ts2.mm.bing.net/th?id=OIP.a&amp;pid=15.1&quot;,&quot;t&quot;:&quot;标题&quot;,&quot;mid&quot;:&quot;MM&quot;}"></div>';
  // ① 360 通：用 360 的，带着来路去问
  let mod = mk(async (u, o) => { asked.push([u, o]); return new Response(so, { status: 200 }); });
  let res = await mod.onRequestGet({ request: { url: 'https://guyu.pw/api/stk?q=' + encodeURIComponent('开心表情包') + '&first=60' } });
  const j1 = await res.json();
  // ② 360 被拦：换必应
  mod = mk(async (u) => /so\.com/.test(u) ? new Response('<html>访问异常出错</html>', { status: 200 }) : new Response(bing, { status: 200 }));
  const j2 = await (await mod.onRequestGet({ request: { url: 'https://guyu.pw/api/stk?q=x' } })).json();
  // ③ 两家都不行：把各自为什么写出来
  mod = mk(async (u) => /so\.com/.test(u) ? new Response('ANTISPIDER', { status: 200 }) : new Response('<html>blocked</html>', { status: 403 }));
  const j3 = await (await mod.onRequestGet({ request: { url: 'https://guyu.pw/api/stk?q=x' } })).json();
  const bad = await mod.onRequestGet({ request: { url: 'https://guyu.pw/api/stk' } });
  check('guyu.pw/api/stk：先问 360（带来路、只留 360 自己的缩略图、认出动图），允许跨域；没关键词直接拒绝', j1.ok && j1.src === '360' && j1.items.length === 1 && j1.items[0].gif && j1.items[0].k === 'so:S1' && /image\.so\.com\/j\?q=.*sn=60/.test(asked[0][0]) && /image\.so\.com/.test(asked[0][1].headers.Referer) && res.headers.get('access-control-allow-origin') === '*' && bad.status === 400, JSON.stringify(j1));
  check('guyu.pw/api/stk：360 被拦就换必应；两家都不行时把各自的原因写在 err 里', j2.ok && j2.src === '必应' && j2.items[0].k === 'MM' && !j3.ok && /360：.*机器人/.test(j3.err) && /必应：回了 403/.test(j3.err), JSON.stringify([j2.src, j3.err]));
}
check('没有页面报错', !errs.length, errs.join(' | '));
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
