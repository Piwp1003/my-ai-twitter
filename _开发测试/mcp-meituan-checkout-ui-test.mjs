import {chromium} from 'playwright';import {launchBrowser,fileUrl} from './_launch.mjs';import path from 'node:path';import assert from 'node:assert/strict';
import {snapshot} from './mcp-meituan-checkout-test.mjs';
const browser=await launchBrowser(chromium);
try{const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:\/\//,r=>r.abort());await page.goto(fileUrl(path.join(process.cwd(),'index.html')));await page.waitForFunction(()=>!!window.gyMeituanCheckout&&typeof gyMcpOpen==='function');
 await page.evaluate(s=>{window.__checkout=s;window.__reads=0;const nativeTimer=window.setTimeout;window.setTimeout=(fn,ms,...args)=>{if(ms>29000&&ms<=30000){window.__reviewExpire=fn;return 0;}return nativeTimer(fn,ms,...args);};gysPh.mcp.inspectScreen=()=>{window.__reads++;return window.__checkout;};gyMcpOpen();},snapshot());
 await page.getByRole('button',{name:'查看本机结算摘要',exact:true}).click();const dialog=page.getByRole('dialog',{name:'结算摘要',exact:true});await dialog.waitFor();
 assert((await dialog.innerText()).includes('上海市示例路12号'));assert((await dialog.innerText()).includes('13800138000'));assert((await dialog.innerText()).includes('¥22.00'));assert((await dialog.innerText()).includes('未确认'));
 assert.equal(await dialog.getByRole('button').count(),2);assert.equal(await dialog.getByRole('button',{name:'提交订单',exact:true}).count(),0);
 const bounds=await dialog.boundingBox();assert(bounds.width<=358&&bounds.height<=844*.8+1);
 await page.evaluate(()=>window.__reviewExpire());assert((await dialog.innerText()).includes('摘要已过期'));
 const output=await page.evaluate(()=>gyMeituanCheckout.read({}));assert(!JSON.stringify(output).includes('上海市示例路12号'));assert(!JSON.stringify(output).includes('13800138000'));
 await page.evaluate(()=>{window.__checkout.nodes.find(n=>n.id==='checkout_total').text='23.00';});await dialog.getByRole('button',{name:'刷新摘要',exact:true}).click();await page.waitForFunction(()=>document.getElementById('gyMeituanCheckout')?.innerText.includes('¥23.00'));assert((await dialog.innerText()).includes('费用对账'));
 await page.evaluate(()=>{window.__checkout.nodes.find(n=>n.id==='checkout_address').text='<img src=x onerror=alert(1)>上海市测试地址';});await dialog.getByRole('button',{name:'刷新摘要',exact:true}).click();await page.waitForFunction(()=>document.getElementById('gyMeituanCheckout')?.innerText.includes('<img'));assert.equal(await dialog.locator('img').count(),0);
 await page.evaluate(()=>{window.__checkout={ok:false,error:'no_active_window'};});await dialog.getByRole('button',{name:'刷新摘要',exact:true}).click();await page.waitForFunction(()=>!document.getElementById('gyMeituanCheckout'));
 await page.evaluate(s=>{window.plus={android:{}};gysPh.mcp.inspectScreen=()=>s;},snapshot());await page.evaluate(()=>gyMeituanCheckout.open());assert.equal(await dialog.count(),1);await page.evaluate(()=>gyMcpTakeover('user'));assert.equal(await dialog.count(),0);assert(await page.evaluate(()=>gyMcpExecution.status().human));
 assert.deepEqual(errors,[]);console.log('PASS local checkout review: mobile fit, full local address, redacted tool response, refreshed amounts, removed stale review, no submit control');
}finally{await browser.close();}
