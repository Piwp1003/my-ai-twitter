import assert from 'node:assert/strict';import {setup} from './mcp-cancel-test.mjs';
let checks=0;
function modelSetup(reply){const x=setup('none'),original=x.c.smartFetch,requests=[];x.c.getApiConfig=()=>({url:'https://model.invalid',key:'private-key',model:'test-model'});
 x.c.smartFetch=async(url,req)=>{if(!url.includes('model.invalid'))return original(url,req);requests.push({body:JSON.parse(req.body),signal:req.signal});return reply(requests.at(-1),requests.length);};return {...x,requests};}
const response=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data});
for(const status of [401,403,429,500]){
 const x=modelSetup(()=>response(status,{error:{message:'unsupported tools private-key https://model.invalid/secret'}}));
 await x.c.gyMcpDecide('c','打开美团');assert.equal(x.requests.length,1);assert.equal(x.calls(),0);
 const t=x.c.gyMcpTasks.list()[0];assert.equal(t.state,'failed');assert(t.note.includes('HTTP '+status));assert(!t.note.includes('private-key'));assert(!t.note.includes('https://'));
 assert.equal(x.c.gyMcpExecution.status().blocked,false);assert.equal(x.c.gyMcpExecution.status().owner,null);checks++;
 await x.c.gyMcpDecide('c','打开美团');assert.equal(x.requests.length,2);checks++;
}
let x=modelSetup(()=>{throw Error('Failed to fetch');});await x.c.gyMcpDecide('c','打开美团');assert.equal(x.requests.length,1);assert.equal(x.calls(),0);assert(x.c.gyMcpTasks.list()[0].note.includes('模型连接失败'));checks++;
x=modelSetup(()=>({status:502,ok:false,json:async()=>{throw Error('invalid JSON');}}));await x.c.gyMcpDecide('c','打开美团');assert.equal(x.requests.length,1);assert(x.c.gyMcpTasks.list()[0].note.includes('HTTP 502'));checks++;
const textReply=()=>response(200,{choices:[{message:{content:'{"calls":[{"tool":"s0__lookup","args":{}}]}'}}]});
x=modelSetup((req,n)=>req.body.tools?response(400,{error:{message:'tools not supported'}}):n===2?textReply():response(200,{choices:[{message:{content:'无'}}]}));
await x.c.gyMcpDecide('c','打开美团');assert.equal(x.requests.length,3);assert.equal(x.calls(),1);assert.equal(x.c.gyMcpTasks.list()[0].state,'completed');checks++;
x=modelSetup((req,n)=>n===1?textReply():response(200,{choices:[{message:{content:'无'}}]}));x.c.gyMcpSet('mode','text');await x.c.gyMcpDecide('c','打开美团');
assert.equal(x.requests.length,2);assert(x.requests.every(r=>!r.body.tools));assert.equal(x.calls(),1);assert.equal(x.c.gyMcpState().cfg.mode,'text');checks++;
// Preserve the first capability error if the compatible request itself times out.
let release;x=modelSetup(req=>req.body.tools?response(400,{error:{message:'tools not supported'}}):new Promise(r=>release=r));
let pending=x.c.gyMcpDecide('c','打开美团');for(let i=0;i<250;i++)await Promise.resolve();assert.equal(x.requests.length,2);
x.timers.findLast(t=>t.ms===90000&&!t.clear).fn();await pending;
let t=x.c.gyMcpTasks.list()[0];assert.equal(t.state,'timed_out');assert(t.note.includes('兼容模式'));assert(t.note.includes('HTTP 400'));assert(t.note.includes('尚未发出'));assert(x.requests[1].signal.aborted);assert.equal(x.calls(),0);checks++;
release(textReply());for(let i=0;i<150;i++)await Promise.resolve();assert.equal(x.calls(),0);assert.equal(x.c.gyMcpExecution.status().owner,null);assert.equal(x.c.gyMcpExecution.status().blocked,false);checks++;
console.log(checks+' model selection checks passed: HTTP causes, no blind fallback, explicit text mode, timeout abort, no late actions');
