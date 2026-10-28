// 🧊 拿「低模小人建造师」网站自带的示例图（_开发测试/3d-samples/）跑一遍谷雨的「传图自动生成」，跟网站自己做出来的放在一起比
// node _开发测试/3d-sample-test.mjs   截图在 _开发测试/3d-shots/sample-*.png
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { launchBrowser } from './_launch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_开发测试', '3d-shots'); fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.png') ? 'image/png' : 'text/html' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#f3f1ec;display:flex;flex-wrap:wrap}canvas{width:270px;height:330px;background:#fff;margin:2px}.f{width:270px;height:270px}</style><script src="/js/vendor/gy3d.min.js"></script><body><script>
window.errs=[];window.onerror=(m,a,b,c,e)=>errs.push(String(m));
(async()=>{ const ld=async u=>{const im=new Image(); im.src=u; await im.decode(); return im;};
 const f=await ld('/_开发测试/3d-samples/sample-front-CvWiu5UY.png'), b=await ld('/_开发测试/3d-samples/sample-back-__NGuNZa.png');
 const d=GY3D.imageToDoll(f,{back:b}); const C=['','#ff6b6b','#2ecc71','#f59e0b','#3b82f6','#ec4899','#a855f7','#8b5a2b'];
 const ov=document.createElement('canvas'); ov.width=ov.height=d.N; ov.className='f'; const x=ov.getContext('2d'); x.drawImage(d.front,0,0); const id=x.getImageData(0,0,d.N,d.N); for(let i=0;i<d.N*d.N;i++){ if(!d.labels[i]) continue; const c=C[d.labels[i]]; for(let k=0;k<3;k++) id.data[i*4+k]=id.data[i*4+k]*0.55+parseInt(c.slice(1+k*2,3+k*2),16)*0.45; id.data[i*4+3]=255; } x.putImageData(id,0,0); document.body.appendChild(ov);
 for (const ry of [0, 0.8, Math.PI]) { const c=document.createElement('canvas'); document.body.appendChild(c); const st=new GY3D.Stage(c,{always:true}); st.spin=ry; const av=await GY3D.fromDoll(d); st.set(av); }
 window.done=1; })();
</script>`;
fs.writeFileSync(path.join(ROOT, '_开发测试', '3d-samples', 'view.html'), html);
const browser = await launchBrowser(chromium, { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1110, height: 340 } });
await page.goto(base + '/_开发测试/3d-samples/view.html'); await page.waitForFunction('window.done || (window.errs&&window.errs.length)', null, { timeout: 60000 }); await page.waitForTimeout(1500);
console.log('谷雨这边报错：', await page.evaluate('JSON.stringify(window.errs)'));
await page.screenshot({ path: path.join(OUT, 'sample-谷雨.png') });
// 网站自己做的（默认就是这个示例）
try { const p2 = await browser.newPage({ viewport: { width: 900, height: 640 } }); await p2.goto('https://lowpoly.kkeist.com/', { timeout: 30000 }); await p2.waitForTimeout(6000); await p2.screenshot({ path: path.join(OUT, 'sample-网站.png') }); console.log('网站截图好了'); } catch (e) { console.log('网站没打开：', e.message.slice(0, 120)); }
await browser.close(); srv.close();
