import { chromium } from 'playwright';
import { launchBrowser,fileUrl } from './_launch.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
const browser=await launchBrowser(chromium);
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:\/\//,r=>r.abort());await page.goto(fileUrl(path.join(process.cwd(),'index.html')));
 await page.waitForFunction(()=>typeof gyMcpOpen==='function'&&!!window.gyMcpTasks);await page.evaluate(()=>gyMcpOpen());
 assert.match(await page.locator('#gyMcpTasks').innerText(),/还没有工具任务/);
 await page.evaluate(()=>{const t=gyMcpTasks.create('c','<img src=x onerror=alert(1)>');gyMcpTasks.transition(t.id,'running','正在执行');gyMcpTasks.step(t.id,true);});
 assert.match(await page.locator('#gyMcpTasks').innerText(),/运行中/);assert.match(await page.locator('#gyMcpTasks').innerText(),/1 次调用/);assert.equal(await page.locator('#gyMcpTasks img').count(),0);
 await page.getByRole('button',{name:'取消任务',exact:true}).click();
 assert.match(await page.locator('#gyMcpTasks').innerText(),/已取消/);
 assert.equal(await page.getByRole('button',{name:'取消任务',exact:true}).count(),0);
 await page.evaluate(()=>{const t=gyMcpTasks.create('c','第二个任务');gyMcpTasks.transition(t.id,'running');gyMcpTasks.step(t.id,true);});
 await page.reload();await page.waitForFunction(()=>typeof gyMcpOpen==='function'&&!!window.gyMcpTasks);await page.evaluate(()=>gyMcpOpen());
 assert.match(await page.locator('#gyMcpTasks').innerText(),/已中断/);assert.match(await page.locator('#gyMcpTasks').innerText(),/不会自动重放/);assert.equal(await page.evaluate(()=>gyMcpTasks.list()[0].steps),1);
 await page.evaluate(async()=>{await gyMcpExecution.acquire('test-pending');gyMcpExecution.begin('test-pending');});
 assert.match(await page.locator('#gyMcpTasks').innerText(),/1 个工具请求在途/);
 await page.reload();await page.waitForFunction(()=>typeof gyMcpOpen==='function'&&!!window.gyMcpExecution);await page.evaluate(()=>gyMcpOpen());
 assert.match(await page.locator('#gyMcpTasks').innerText(),/上次工具操作结果未确认/);
 await page.getByRole('button',{name:'已核对结果，解除占用',exact:true}).click();
 assert.equal(await page.evaluate(()=>gyMcpExecution.status().blocked),false);
 assert.deepEqual(errors,[]);console.log('PASS task panel: empty, live progress, escaped labels, cancel button, reload interruption, retained counts, no page errors');
} finally {await browser.close();}
