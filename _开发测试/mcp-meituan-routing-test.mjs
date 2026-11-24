import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {setup} from './mcp-meituan-test.mjs';
async function run({fallback=false,failLaunch=false,limit=3,stopAfterInspect=false}={}){
 const x=setup({initial:'outside'}),c=x.c,store={gyMcpCfg:JSON.stringify({mode:fallback?'auto':'text',rounds:limit,servers:[{id:'phone',kind:'builtin',tools:[{name:'meituan_inspect'},{name:'meituan_search'}]}]})};let native=0,text=0;
 const read=c.gysPh.mcp.inspectScreen;if(failLaunch)c.gysPh.mcp.inspectScreen=()=>x.opened()?{ok:false,error:'accessibility_off'}:read();
 Object.assign(c,{Date:class extends Date{static now(){return 100000;}},AbortController,console:{warn(){}},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},document:{getElementById:()=>null},dispatchEvent(){},addEventListener(){},CustomEvent:function(){},setTimeout:(fn,ms)=>{if(ms<300)fn();return 1;},clearTimeout(){},setInterval(){},plus:{android:{}},myCharacters:[{id:'c',name:'测试'}],globalChats:{},isAutoOn:()=>true,getApiConfig:()=>({url:'https://model.invalid',key:'test',model:'test'}),smartFetch:async(url,req)=>{
  const b=JSON.parse(req.body);if(b.tools){native++;return {ok:false,status:400,json:async()=>({error:{message:'tools not supported'}})};}
  text++;assert(!b.tools);
  if(text===2){assert(JSON.stringify(b.messages).includes('needsLaunch'));assert.equal(x.opened(),0);}
  if(text===3)assert(JSON.stringify(b.messages).includes('results'));
  const calls=text===1?[{tool:'s0__meituan_inspect',args:{}}]:text===2&&!stopAfterInspect?[{tool:'s0__meituan_search',args:{query:'面条'}}]:[];
  return {ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify({calls})}}]})};
 }});
 for(const file of ['99-mcp-tasks.js','99-mcp-execution.js','99-mcp.js'])vm.runInNewContext(fs.readFileSync('js/'+file,'utf8'),c);
 const items=await c.gyMcpDecide('c','打开美团外卖搜索面条');
 assert.equal(native,fallback?1:0);assert.equal(c.gyMcpExecution.status().pending,0);assert.equal(c.gyMcpExecution.status().owner,null);assert.equal(c.gyMcpExecution.status().blocked,false);
 assert.equal(JSON.parse(items[0].out).needsLaunch,true);assert.equal(JSON.parse(items[0].out).actionAccepted,false);
 if(limit===1||stopAfterInspect){assert.equal(x.opened(),0);assert.equal(text,stopAfterInspect?2:1);assert.equal(c.gyMcpTasks.list()[0].state,'paused');}
 else{assert.equal(x.opened(),1);assert.equal(items.length,2);assert.notEqual(items[0].id,items[1].id,'same-millisecond rounds need unique IDs');
  if(failLaunch){assert.equal(text,2);assert.equal(x.actions().length,0);assert.equal(c.gyMcpTasks.list()[0].state,'failed');assert(JSON.parse(items[1].out.replace(/^［工具报错］/,'')).diagnostic.stage==='after_launch');}
  else{assert.equal(text,3);assert.equal(x.actions().length,3);assert.equal(c.gyMcpTasks.list()[0].state,'completed');assert.equal(JSON.parse(items[1].out).page,'results');}
 }
}
await run();await run({fallback:true});await run({failLaunch:true});await run({fallback:true,failLaunch:true});await run({limit:1});await run({stopAfterInspect:true});
console.log('PASS 6 routing scenarios: inspect → search → results, direct/fallback text rounds, failed launch stops, max rounds, unresolved window pauses, unique IDs');
