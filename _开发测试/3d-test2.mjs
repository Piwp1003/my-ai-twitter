// 🧊 3D 小人第三版自测（node _开发测试/3d-test2.mjs）：头顶闭合 / 朋友收集风 / 摆动作的图按骨架分
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { launchBrowser } from './_launch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_开发测试', '3d-shots');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.webmanifest': 'application/json' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await launchBrowser(chromium, { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errs = [];
page.on('pageerror', e => errs.push('页面报错：' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|net::|404/.test(m.text())) errs.push('控制台：' + m.text().slice(0, 240)); });
const results = [];
const step = async (name, fn, shot) => { try { const r = await fn(); if (shot) await page.screenshot({ path: path.join(OUT, shot) }); results.push(['✅', name, r == null ? '' : String(r).slice(0, 90)]); } catch (e) { results.push(['❌', name, e.message.slice(0, 200)]); try { if (shot) await page.screenshot({ path: path.join(OUT, shot) }); } catch (er) {} } };
const wait = ms => page.waitForTimeout(ms);

await page.goto(base + '/index.html');
await page.waitForFunction('window.__guyuBooted', null, { timeout: 90000 });
await wait(1500);
for (const n of ['小手机', '我们的小屋']) {
  const code = JSON.parse(fs.readFileSync(path.join(ROOT, '插件', '新玩法', n + '.json'), 'utf8'))[0].onLoad;
  await page.evaluate(c => { (0, eval)('(function(){' + c + '\n})()'); }, code);
}
await page.evaluate(() => { if (!myCharacters.find(c => c.id === 'gy3dtest')) myCharacters.push({ id: 'gy3dtest', name: '测试小人', persona: '温柔的男生，黑色短发，常穿卫衣' }); currentChatSessionId = 'gy3dtest'; });

await step('3D 引擎加载', async () => { await page.evaluate(() => gyx3dLib()); return await page.evaluate(() => typeof GY3D.skelAuto + ' / ' + typeof GY3D.fromMii); });
await step('刺猬头：头顶闭合（数漏洞的边）', async () => {
  return await page.evaluate(async () => { const av = await GY3D.fromChibi({ hairStyle: 'spiky' }); let open = 0, bad = 0; av.inner.traverse(o => { if (!o.isMesh || o.name !== 'head') return; const p = o.geometry.attributes.position.array, key = i => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]].map(v => v.toFixed(3)).join(','), E = new Map(); for (let t = 0; t < p.length / 3; t += 3) for (let k = 0; k < 3; k++) { const a = key(t + k), b = key(t + (k + 1) % 3); if (a === b) continue; const e = a < b ? a + '|' + b : b + '|' + a; E.set(e, (E.get(e) || 0) + 1); } open = [...E.values()].filter(c => c === 1).length; bad = o.material[0].side; }); if (open > 0) throw new Error('还有 ' + open + ' 条没闭合的边'); return '没有漏洞，双面材质 side=' + bad; });
});
await step('捏一个 → 朋友收集风', async () => { await page.evaluate(() => gyx3dOpen('make')); await wait(2000); await page.evaluate(() => { gyx3dSet('hairStyle', 'twin'); }); await wait(800); await page.evaluate(() => gyx3dParam('shape', 'mii', 1)); await wait(3000); const m = await page.evaluate(() => document.getElementById('g3PvMsg').textContent); if (m) throw new Error(m); return '预览出来了'; }, '8-朋友收集风.png');
await step('朋友收集风：表情 + 说话', async () => { await page.evaluate(() => { gyx3dPvFace('happy'); gyx3dPvTalk(); }); await wait(900); return '开心 + 张嘴'; });
await step('朋友收集风：存好、桌面小 TA 能用', async () => { await page.evaluate(() => { document.getElementById('g3Use').value = 'gy3dtest'; return gyx3dSaveED(document.createElement('button')); }); await wait(1500); const ok = await page.evaluate(async () => { const id = gyx3dData().who.gy3dtest; const av = await GY3D.build(Object.assign({ kind: 'doll' }, gyx3dData().models[id])); return gyx3dData().models[id].shape + ' / ' + (av.mats.length > 3 ? '搭出来了' : '不对'); }); return ok; });
await step('摆动作的图：自动判断 + 按骨架分', async () => {
  await page.evaluate(() => gyx3dOpen('auto')); await wait(1200);
  await page.evaluate(async () => { const im = new Image(); im.src = '_开发测试/3d-samples/posed-1.png'; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); const bl = await new Promise(r => c.toBlob(r)); const dt = new DataTransfer(); dt.items.add(new File([bl], 'p.png', { type: 'image/png' })); const inp = document.querySelector('#g3Body input[type=file]'); inp.files = dt.files; inp.dispatchEvent(new Event('change')); });
  await wait(1500); await page.evaluate(() => gyx3dAutoDirect()); await wait(4000);
  const r = await page.evaluate(() => ({ skel: !!(gyx3dDbg().ED && gyx3dDbg().ED.skel), msg: document.getElementById('g3PvMsg').textContent }));
  if (!r.skel) throw new Error('没认出是摆了动作的图'); if (r.msg) throw new Error(r.msg); return '认出来了，按骨架分好';
}, '9-摆动作自动.png');
await step('画 / 修：骨架工具 + 拖一个点 + 重新分', async () => {
  await page.evaluate(() => { gyx3dDbg().DR.tool = 'skel'; gyx3dOpen('draw'); }); await wait(2500);
  const box = await page.evaluate(() => { const r = document.getElementById('g3Paint').getBoundingClientRect(); const p = gyx3dDbg().ED.skel[GY3D.SK.indexOf('haL')]; return { x: r.left + p[0] / 256 * r.width, y: r.top + p[1] / 256 * r.height, k: r.width / 256 }; });
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 6 * box.k, box.y + 4 * box.k, { steps: 4 }); await page.mouse.up(); await wait(400);
  await page.evaluate(() => gyx3dSkelLab()); await wait(2500);
  return await page.evaluate(() => 'haL → ' + gyx3dDbg().ED.skel[GY3D.SK.indexOf('haL')].map(v => Math.round(v)).join(','));
}, '10-骨架.png');
await step('存好（带骨架）再读回来', async () => { await page.evaluate(() => gyx3dSaveED(document.createElement('button'))); await wait(1500); return await page.evaluate(async () => { const id = gyx3dDbg().ED.id; await gyx3dEdit(id, 'draw'); const E = gyx3dDbg().ED; return E.skel ? '骨架还在（' + E.skel.length + ' 个点）' : '骨架丢了'; }); });
await step('标准站姿的图不误判', async () => { return await page.evaluate(async () => { const im = new Image(); im.src = '_开发测试/3d-samples/sample-front-CvWiu5UY.png'; await im.decode(); const d = GY3D.imageToDoll(im, {}); const sk = GY3D.skelAuto(d.front.getContext('2d').getImageData(0, 0, 256, 256).data, 256); if (GY3D.skelPosed(sk)) throw new Error('把站好的图当成摆动作了'); return '没误判'; }); });

console.log('\n' + results.map(r => r.join('  ')).join('\n'));
console.log(errs.length ? '\n报错：\n' + [...new Set(errs)].join('\n') : '\n没有报错');
await browser.close(); srv.close();
