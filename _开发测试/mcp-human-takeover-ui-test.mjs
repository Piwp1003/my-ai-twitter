import {chromium} from 'playwright';import {launchBrowser,fileUrl} from './_launch.mjs';import path from 'node:path';import assert from 'node:assert/strict';
const browser=await launchBrowser(chromium);
try{const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:\/\//,r=>r.abort());await page.goto(fileUrl(path.join(process.cwd(),'index.html')));await page.waitForFunction(()=>typeof gyMcpOpen==='function');
 const phone=()=>{window.plus={android:{}};gysPh.mcp.inspectScreen=()=>({ok:true,pkg:'com.sankuai.meituan',snapshotSchema:2,fingerprint:'fresh',token:8,nodes:[{ref:0,text:'点菜',enabled:true},{ref:1,text:'评价',enabled:true},{ref:2,text:'面馆',id:'shop_name',enabled:true}]});gyMcpOpen();};
 await page.evaluate(phone);await page.getByRole('button',{name:'我要接管手机操作',exact:true}).click();assert(await page.evaluate(()=>gyMcpExecution.status().human));assert((await page.locator('#gyMcpTasks').innerText()).includes('人工接管中'));
 await page.getByRole('button',{name:'重新读屏并恢复工具',exact:true}).click();assert(await page.evaluate(()=>gyMcpExecution.status().human));
 await page.reload();await page.waitForFunction(()=>typeof gyMcpOpen==='function');await page.evaluate(phone);assert(await page.evaluate(()=>gyMcpExecution.status().human));
 await page.evaluate(()=>{gysPh.mcp.inspectScreen=()=>({ok:true,pkg:'com.sankuai.meituan',snapshotSchema:2,fingerprint:'login',token:9,nodes:[{text:'请输入短信验证码（6位）'}]});});
 await page.getByLabel('我已处理并核对外部操作结果',{exact:true}).check();await page.getByRole('button',{name:'重新读屏并恢复工具',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#gyMcpTasks')?.innerText.includes('正在重新读屏'));assert(await page.evaluate(()=>gyMcpExecution.status().human));
 await page.evaluate(phone);await page.getByLabel('我已处理并核对外部操作结果',{exact:true}).check();await page.getByRole('button',{name:'重新读屏并恢复工具',exact:true}).click();await page.waitForFunction(()=>!gyMcpExecution.status().human);
 assert.equal(await page.getByRole('button',{name:'我要接管手机操作',exact:true}).count(),1);assert.equal(await page.evaluate(()=>gyMcpTasks.list().length),0);assert.deepEqual(errors,[]);
 console.log('PASS phone takeover UI: explicit confirmation, persisted hold, OTP rejection, fresh-page recovery, no automatic task replay');
}finally{await browser.close();}
