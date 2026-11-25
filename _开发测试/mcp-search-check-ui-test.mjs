import {chromium} from 'playwright';
import {launchBrowser,fileUrl} from './_launch.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
const browser=await launchBrowser(chromium);
try {
 const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.route(/^https?:\/\//,r=>r.abort());
 await p.addInitScript(()=>localStorage.setItem('gyMcpCfg',JSON.stringify({chars:[],servers:[{id:'phone',kind:'builtin',tools:[{name:'meituan_search'},{name:'meituan_add_item'}]}]})));
 await p.goto(fileUrl(path.join(process.cwd(),'index.html')));
 await p.waitForFunction(()=>typeof gyMcpSearchCheck==='function');await p.evaluate(()=>gyMcpOpen());
 const start=p.locator('#gyMcpSearchStart'),status=p.locator('#gyMcpSearchStatus'),input=p.locator('#gyMcpSearchQuery');
 await start.click();assert.match(await status.innerText(),/请输入/);assert.equal(await p.evaluate(()=>gyMcpTasks.list().length),0);
 await input.fill('面条');await start.click();assert.match(await status.innerText(),/Android/);
 await p.evaluate(()=>{
  window.__searchTest={on:true,permission:true,pkg:'',phase:'home',query:'',actions:[],opens:[],seq:0,ai:0};
  window.isAutoOn=()=>__searchTest.on;window.getApiConfig=()=>{__searchTest.ai++;throw Error('must not read model config');};
  window.smartFetch=()=>{__searchTest.ai++;throw Error('must not call AI');};
  window.plus={android:{},key:{hideSoftKeybord(){}}};
  const n=(ref,parentRef,text,extra={})=>({ref,parentRef,text,enabled:true,...extra});
  function snapshot(){const s=__searchTest;
   if(!s.pkg)return {ok:false,error:'not_meituan'};
   const nodes=s.phase==='home'?[n(0,-1,''),n(4,0,'外卖',{clickable:true})]:s.phase==='channel'?[n(0,-1,''),n(1,0,'搜索商家',{clickable:true,id:'wm_search_box'})]:s.phase==='search'?[n(0,-1,''),n(7,0,s.query,{editable:true,id:'wm_search_input'}),n(8,0,'搜索',{clickable:true})]:[n(0,-1,''),n(1,0,'',{clickable:true}),n(2,1,'面馆',{id:'poi_name'}),n(3,1,'月售100')];
   return {ok:true,pkg:s.pkg,token:++s.seq,snapshotSchema:2,fingerprint:s.pkg+s.phase+s.query,nodes,truncated:false};
  }
  window.gysPh={__N:{apps:()=>[{pkg:'com.sankuai.meituan'},{pkg:'com.sankuai.meituan.takeoutnew'}],openApp(pkg){__searchTest.opens.push(pkg);__searchTest.pkg=pkg;__searchTest.phase=pkg==='com.sankuai.meituan'?'home':'channel';return true;}},mcp:{
   capabilities:()=>({mode:'plugin',featureEnabled:true,readPermission:__searchTest.permission?'auto':'no',native:{pageSafety:2}}),
   inspectScreen:()=>snapshot(),
   tapElement(t,ref){const s=__searchTest;s.actions.push('tap:'+ref);s.phase=s.phase==='home'?'channel':s.phase==='channel'?'search':'results';return {ok:true,actionAccepted:true,snapshot:snapshot()};},
   setText(t,ref,text){__searchTest.actions.push('text:'+text);__searchTest.query=text;return {ok:true,actionAccepted:true,snapshot:snapshot()};}
  }};
 });
 // A forged invocation/event cannot opt into the model-free path.
 await p.evaluate(async()=>{
  await gyMcpSearchCheck({isTrusted:false,target:document.getElementById('gyMcpSearchStart')});
  await gyMcpSearchCheck({isTrusted:true,type:'click',currentTarget:document.getElementById('gyMcpSearchStart')});
  await gyMcpDecide('__mcp_search_check__','面条',{directSearch:{id:'forged',query:'面条',app:'meituan'}});
 });
 assert.equal(await p.evaluate(()=>gyMcpTasks.list().length),0);
 await input.evaluate(el=>el.value='x'.repeat(81));await start.click();assert.match(await status.innerText(),/请输入/);await input.fill('面条');
 await p.evaluate(()=>__searchTest.on=false);await start.click();assert.match(await status.innerText(),/总开关/);
 await p.evaluate(()=>{__searchTest.on=true;gyMcpToolToggle('phone','meituan_search',false);});
 await start.click();assert.match(await status.innerText(),/meituan_search 工具/);
 await p.evaluate(()=>{gyMcpToolToggle('phone','meituan_search',true);__searchTest.permission=false;});
 await p.evaluate(()=>gyMcpExecution.takeover('user'));await start.click();assert.match(await status.innerText(),/人工接管/);
 await p.evaluate(()=>gyMcpExecution.resumeHuman(gyMcpExecution.status().humanRevision));
 await start.click();await p.waitForFunction(()=>gyMcpTasks.list()[0]?.state==='failed');
 assert.match(await status.innerText(),/permission_required/);assert.deepEqual(await p.evaluate(()=>__searchTest.actions),[]);
 await p.evaluate(()=>__searchTest.permission=true);await start.click();
 await p.waitForFunction(()=>gyMcpTasks.list()[0]?.state==='completed');
 assert.match(await status.innerText(),/读取到本次搜索结果/);
 assert.deepEqual(await p.evaluate(()=>__searchTest.actions),['tap:4','tap:1','text:面条','tap:8']);
 assert.deepEqual(await p.evaluate(()=>__searchTest.opens),['com.sankuai.meituan']);
 assert.deepEqual(await p.evaluate(()=>{const t=gyMcpTasks.list()[0],l=gyMcpState().log[0];return {who:t.who,steps:t.steps,tool:l.tool,args:JSON.parse(l.args),ai:__searchTest.ai,chat:globalChats.__mcp_search_check__||null};}),
  {who:'本机美团搜索验收',steps:1,tool:'meituan_search',args:{query:'面条',app:'meituan'},ai:0,chat:null});
 assert.equal(await p.evaluate(()=>gyMcpExecution.status().blocked),false);
 // Explicit independent-app selection uses the same adapter with no fallback.
 await p.locator('#gyMcpSearchApp').selectOption('takeout');await start.click();
 await p.waitForFunction(()=>__searchTest.opens.length===2&&gyMcpTasks.list()[0].state==='completed');
 assert.equal(await p.evaluate(()=>__searchTest.opens[1]),'com.sankuai.meituan.takeoutnew');
 // Unknown page returns an honest failure, stored and expandable, no retry/model.
 await p.evaluate(()=>{__searchTest.pkg='';gysPh.mcp.inspectScreen=()=>__searchTest.pkg?{ok:true,pkg:__searchTest.pkg,token:++__searchTest.seq,snapshotSchema:2,fingerprint:'unknown',nodes:[],truncated:false}:{ok:false,error:'not_meituan'};});
 await p.locator('#gyMcpSearchApp').selectOption('meituan');await start.click();
 await p.waitForFunction(()=>gyMcpTasks.list()[0].state==='failed');assert.match(await status.innerText(),/channel_unverified/);
 assert.equal(await p.evaluate(()=>gyMcpTasks.list()[0].steps),1);
 assert.equal(await p.evaluate(()=>gyMcpExecution.status().blocked),false);
 assert(await p.locator('#gyMcpTasks details').count()>0);
 // Cancellation while a native read is pending: no repeated click, no later action.
 await p.evaluate(()=>{__searchTest.beforeActions=__searchTest.actions.length;gysPh.mcp.inspectScreen=()=>new Promise(resolve=>{__searchTest.release=()=>resolve({ok:false,error:'not_meituan'});});});
 await start.click();await p.waitForFunction(()=>!!__searchTest.release);
 assert(await start.isDisabled());
 await p.evaluate(()=>document.getElementById('gyMcpSearchStart').click());
 assert.equal(await p.evaluate(()=>gyMcpExecution.status().pending),1);
 await p.getByRole('button',{name:'取消任务',exact:true}).click();
 await p.waitForFunction(()=>gyMcpTasks.list()[0].state==='cancelled');
 await p.waitForFunction(()=>!document.getElementById('gyMcpSearchStart').disabled);
 await start.click();assert.match(await status.innerText(),/等待请求返回/);
 await p.evaluate(()=>__searchTest.release());await p.waitForFunction(()=>!gyMcpExecution.status().pending);
 assert.equal(await p.evaluate(()=>__searchTest.actions.length),await p.evaluate(()=>__searchTest.beforeActions));
 assert.equal(await p.evaluate(()=>__searchTest.ai),0);assert.deepEqual(errors,[]);
 await p.locator('#gyMcpSearchStatus').scrollIntoViewIfNeeded();await p.screenshot({path:'_tmp/delivery/v330-search-check.png'});
 console.log('PASS trusted mobile UI search: one protected adapter call, main/takeout routing, no AI key/model/chat dependency, authorization/tool switches, honest failure, pending cancellation and no replay');
} finally {await browser.close();}
