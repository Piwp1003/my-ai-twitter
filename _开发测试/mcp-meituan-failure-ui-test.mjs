import {chromium} from 'playwright';import {launchBrowser,fileUrl} from './_launch.mjs';import path from 'node:path';import assert from 'node:assert/strict';
const browser=await launchBrowser(chromium);
try{
 const p=await browser.newPage({viewport:{width:390,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route(/^https?:\/\//,r=>r.abort());await p.goto(fileUrl(path.join(process.cwd(),'index.html')));
 await p.waitForFunction(()=>!!window.gyMcpTasks&&typeof gyMcpOpen==='function');
 const detail=await p.evaluate(()=>{
  const t=gyMcpTasks.create('c','测试角色');gyMcpTasks.transition(t.id,'running');gyMcpTasks.transition(t.id,'failed','美团读屏失败：not_meituan；启动后；前台信号：美团外卖；读取 40 次。本轮已停止，不会自动重试。');
  const out=JSON.stringify({ok:false,error:'page_unavailable',err:'活动窗口未识别为美团',actionAccepted:true,diagnostic:{cause:'not_meituan',stage:'after_launch',foregroundSignal:'takeout',reads:40,elapsedMs:8000,note:'<img src=x onerror=alert(1)>'}});
  localStorage.setItem('gyMcpLog',JSON.stringify([{taskId:t.id,tool:'美团搜索',out,err:true}]));return out;
 });
 await p.reload();await p.waitForFunction(()=>typeof gyMcpOpen==='function');await p.evaluate(()=>gyMcpOpen());
 assert((await p.locator('#gyMcpTasks').innerText()).includes('前台信号：美团外卖'));
 await p.locator('#gyMcpTasks summary').filter({hasText:'查看完整失败信息'}).click();
 const pre=p.locator('#gyMcpTasks details pre');assert.equal(await pre.innerText(),'美团搜索\n'+detail);
 assert((await pre.innerText()).includes('elapsedMs'));assert.equal(await p.locator('#gyMcpTasks img').count(),0);
 const launch=await p.evaluate(async()=>{
  const input=document.createElement('textarea');document.body.appendChild(input);input.focus();let opened=false,hidden=0,focusAtLaunch=false,clicks=0;
  window.plus={key:{hideSoftKeybord(){hidden++;}}};
  window.gysPh={mcp:{capabilities:()=>({mode:'plugin',featureEnabled:true,readPermission:'auto',native:{pageSafety:2}}),inspectScreen:()=>opened?{ok:true,pkg:'com.sankuai.meituan.takeoutnew',snapshotSchema:2,fingerprint:'unsupported',token:1,nodes:[]}:{ok:false,error:'not_meituan'},tapElement(){clicks++;}},__N:{apps:()=>[{pkg:'com.sankuai.meituan.takeoutnew'}],openApp:()=>{focusAtLaunch=document.activeElement===input;opened=true;return true;}}};
  const result=await gyMeituan.search({query:'面条'});input.remove();return {hidden,focusAtLaunch,clicks,error:result.error};
 });
 assert.deepEqual(launch,{hidden:1,focusAtLaunch:false,clicks:0,error:'unknown_layout'});assert.deepEqual(errors,[]);
 console.log('PASS readable failure summary and full stored diagnostic after reload; no task-body duplication, escaped HTML, no page errors');
}finally{await browser.close();}
