import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {setup} from './mcp-meituan-test.mjs';
const x=setup(),c=x.c,data={gyMcpCfg:JSON.stringify({servers:[{id:'phone',kind:'builtin',tools:[{name:'meituan_search'},{name:'meituan_choose_store'}]}]})};
let model=0,token=0,choose=false;
Object.assign(c,{console:{warn(){}},localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]},document:{getElementById:()=>null},dispatchEvent(){},addEventListener(){},CustomEvent:function(){},setTimeout:(fn,ms)=>{if(ms<300)fn();return 1;},clearTimeout(){},setInterval(){},plus:{android:{}},myCharacters:[{id:'c',name:'角色'}],globalChats:{},isAutoOn:()=>true,getApiConfig:()=>({url:'https://model.invalid',key:'test'}),smartFetch:async(u,req)=>{
 const body=JSON.parse(req.body);assert(body.tools);model++;
 const args=choose?{token,ref:1,name:'面馆'}:{query:'面条'};
 return {json:async()=>({choices:[{message:{content:'无',tool_calls:model%2===1?[{id:'mt1',type:'function',function:{name:choose?'s0__meituan_choose_store':'s0__meituan_search',arguments:JSON.stringify(args)}}]:[]}}]})};
}});
for(const file of ['99-mcp-tasks.js','99-mcp-execution.js','99-mcp.js'])vm.runInNewContext(fs.readFileSync('js/'+file,'utf8'),c);
const items=await c.gyMcpDecide('c','搜索面条');const result=JSON.parse(items[0].out);assert.equal(result.page,'results');assert.equal(result.stores[0].name,'面馆');assert.equal(c.gyMcpTasks.list()[0].state,'completed');assert.equal(c.gyMcpExecution.status().pending,0);
token=result.token;choose=true;const selected=await c.gyMcpDecide('c','进入面馆');assert.equal(JSON.parse(selected[0].out).page,'store');assert.equal(x.actions().length,4);assert.equal(c.gyMcpTasks.list()[0].state,'completed');
assert.equal(c.gyMcpExecution.status().blocked,false);
console.log('PASS registered MCP tools: model → validation → queue → Meituan search/store → verified structured result');

// Opening Meituan then receiving an unsupported screen must stop, without a false unknown-purchase lock.
x.change('outside');
const originalOpen=c.gysPh.__N.openApp;
c.gysPh.__N.openApp=()=>{originalOpen();x.change('unknown');return true;};
choose=false;const before=model;
const failed=await c.gyMcpDecide('c','搜索别的商家');
assert(failed[0].out.includes('unknown_layout'));
assert.equal(model,before+1,'do not automatically retry a terminal navigation failure');
assert.equal(c.gyMcpTasks.list()[0].state,'failed');
assert(c.gyMcpTasks.list()[0].note.includes('unknown_layout'));
assert.equal(c.gyMcpExecution.status().pending,0);
assert.equal(c.gyMcpExecution.status().owner,null);
assert.equal(c.gyMcpExecution.status().blocked,false);
// A new explicit request can run; the failed request itself is never replayed.
c.gysPh.__N.openApp=originalOpen;x.change('home');model=0;
assert.equal(JSON.parse((await c.gyMcpDecide('c','重新搜索其他面馆'))[0].out).page,'results');
console.log('PASS opened-app/unknown-layout failure releases idle device, surfaces detail, stops retry and allows a new request');

// The native read failure after opening remains visible in the task, with no stuck purchase lock.
x.change('outside');model=0;
const read=c.gysPh.mcp.inspectScreen;let launchReads=0;
c.gysPh.mcp.inspectScreen=()=>++launchReads===1?{ok:false,error:'not_meituan'}:{ok:false,error:'accessibility_off'};
const unread=await c.gyMcpDecide('c','美团外卖首页搜索');
const detail=JSON.parse(unread[0].out.replace(/^［工具报错］/,''));
assert.equal(detail.diagnostic.cause,'accessibility_off');assert.equal(detail.diagnostic.reads,1);
assert.equal(model,1);assert.equal(c.gyMcpTasks.list()[0].state,'failed');assert(c.gyMcpTasks.list()[0].note.includes('accessibility_off'));
assert.equal(c.gyMcpExecution.status().blocked,false);assert.equal(c.gyMcpExecution.status().pending,0);assert.equal(c.gyMcpExecution.status().owner,null);
c.gysPh.mcp.inspectScreen=read;
console.log('PASS native launch-read cause appears in failed task; idle device released, no model retry');
