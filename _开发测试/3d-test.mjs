// 🧊 3D 小人 + 3D 小屋 自测：在你电脑上跑（node _开发测试/3d-test.mjs）
// 开一个本地小服务器放谷雨 → 打开谷雨 → 装上「小手机」「我们的小屋」两个合集插件 → 捏人 / 传图自动生成 / 自己画头发 / 存 / 桌面小 TA / 3D 小屋 都走一遍
// 截图放在 _开发测试/3d-shots/，最后列出哪几项过了、报了什么错
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
const step = async (name, fn, shot) => { try { const r = await fn(); if (shot) await page.screenshot({ path: path.join(OUT, shot) }); results.push(['✅', name, r == null ? '' : String(r).slice(0, 80)]); } catch (e) { results.push(['❌', name, e.message.slice(0, 200)]); try { if (shot) await page.screenshot({ path: path.join(OUT, shot) }); } catch (er) {} } };
const wait = ms => page.waitForTimeout(ms);

await page.goto(base + '/index.html');
await page.waitForFunction('window.__guyuBooted', null, { timeout: 90000 });
await wait(1500);
for (const n of ['小手机', '我们的小屋']) {
  const code = JSON.parse(fs.readFileSync(path.join(ROOT, '插件', '新玩法', n + '.json'), 'utf8'))[0].onLoad;
  await page.evaluate(c => { (0, eval)('(function(){' + c + '\n})()'); }, code);
}
await page.evaluate(() => { if (!myCharacters.find(c => c.id === 'gy3dtest')) myCharacters.push({ id: 'gy3dtest', name: '测试小人', persona: '温柔的男生，黑色短发，常穿卫衣' }); currentChatSessionId = 'gy3dtest'; });

await step('3D 引擎加载', async () => { await page.evaluate(() => gyx3dLib()); return await page.evaluate(() => typeof GY3D.fromDoll); });
await step('捏一个（蓬松碎发）', async () => { await page.evaluate(() => gyx3dOpen('make')); await wait(2500); await page.evaluate(() => gyx3dSet('hairStyle', 'fluffy')); await wait(2500); return await page.evaluate(() => document.getElementById('g3PvMsg').textContent || '预览出来了'); }, '1-捏一个.png');
await step('换成方块风格', async () => { await page.evaluate(() => gyx3dParam('shape', 'block', 1)); await wait(3000); await page.evaluate(() => gyx3dParam('shape', 'lowpoly', 1)); await wait(1500); }, '2-方块.png');
await step('存好并给测试角色用', async () => { await page.evaluate(() => { document.getElementById('g3Use').value = 'gy3dtest'; return gyx3dSaveED(document.createElement('button')); }); await wait(1500); return await page.evaluate(() => Object.keys(gyx3dData().models).length + ' 个小人'); });
await step('传一张 Q 版图自动生成', async () => {
  await page.evaluate(() => gyx3dOpen('auto')); await wait(1500);
  await page.evaluate(async () => { const f = GY3D.drawChibi({ hairStyle: 'twin', hair: '#c94a6a', acc: ['ribbon'], top: 'sailor' }); const c = document.createElement('canvas'); c.width = 360; c.height = 400; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 360, 400); x.drawImage(f.canvas, 52, 70); const bl = await new Promise(r => c.toBlob(r)); const dt = new DataTransfer(); dt.items.add(new File([bl], 'q.png', { type: 'image/png' })); const inp = document.querySelector('#g3Body input[type=file]'); inp.files = dt.files; inp.dispatchEvent(new Event('change')); });
  await wait(1500); await page.evaluate(() => gyx3dAutoDirect()); await wait(4000);
  return await page.evaluate(() => document.getElementById('g3PvMsg').textContent || '生成了');
}, '3-传图自动生成.png');
await step('画 / 修：光头 + 自己画头发', async () => {
  await page.evaluate(() => { gyx3dOpen('make'); }); await wait(1500); await page.evaluate(() => { gyx3dSet('hairStyle', 'none'); gyx3dOpen('draw'); }); await wait(2000);
  await page.evaluate(() => gyx3dDr('color', '#5a3b2e')); await wait(1500);
  await page.evaluate(() => { DR_size(16); const cv = document.getElementById('g3Paint'), r = cv.getBoundingClientRect(); const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x * r.width / 256, clientY: r.top + y * r.height / 256, pointerId: 1, bubbles: true })); ev('pointerdown', 60, 95); for (let a = 0; a <= 80; a++) { const t = Math.PI * (1 + a / 80); ev('pointermove', 128 + Math.cos(t) * 68, 92 + Math.sin(t) * 64); } for (let y = 40; y < 120; y += 6) { ev('pointermove', 70, y); ev('pointermove', 186, y); } ev('pointerup', 186, 120); });
  await wait(3000);
}, '4-自己画头发.png');
await step('桌面上的小 TA 换成 3D 并戳一下', async () => { await page.evaluate(() => { gyx3dEdit(Object.keys(gyx3dData().models)[0]); }); await wait(500); await page.evaluate(() => { gyxPetSet('size', 140); gyxPetRefresh(); }); await wait(3000); await page.evaluate(() => gyxPetPoke()); await wait(2000); return await page.evaluate(() => 'gyx3dPetOn=' + gyx3dPetOn()); }, '5-桌面小TA.png');
await step('3D 小屋：进去 + 打招呼', async () => { await page.evaluate(() => gyx3dRoomOpen('gy3dtest')); await wait(6000); await page.evaluate(() => gyx3dRoomDo('hi')); await wait(4000); return await page.evaluate(() => document.getElementById('g3rLog').innerText.split('\n')[0]); }, '6-3D小屋.png');
await step('3D 小屋：叫 TA 一起吃饭', async () => { await page.evaluate(() => gyx3dRoomDo('eat')); await wait(7000); }, '7-一起吃饭.png');

console.log('\n🧊 3D 小人自测');
results.forEach(r => console.log(r[0], r[1], r[2] ? '— ' + r[2] : ''));
console.log(errs.length ? '\n报错：\n' + [...new Set(errs)].slice(0, 20).join('\n') : '\n没有报错');
console.log('\n截图在 _开发测试/3d-shots/');
await browser.close(); srv.close();
