import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {setup,reach} from './mcp-cancel-test.mjs';
const flush=async()=>{for(let i=0;i<180;i++)await Promise.resolve();};let checks=0;
let x=setup('none'),started=false,resolveRead;
x.c.gyMcpState().servers.splice(0,1,{id:'phone',kind:'builtin',tools:[{name:'meituan_inspect'}]});
x.c.gyMeituan={inspect:()=>{started=true;return new Promise(r=>resolveRead=r);},invalidate(){}};
x.c.plus={android:{}};let models=0;
x.c.smartFetch=async()=>({json:async()=>({choices:[{message:{tool_calls:++models===1?[{id:'read',type:'function',function:{name:'s0__meituan_inspect',arguments:'{}'}}]:[]}}]})});
let p=x.c.gyMcpDecide('c','读取当前美团');await flush();assert(started);assert.equal(x.c.gyMcpExecution.status().pending,1);
x.c.gyMcpTakeover('user');await p;
assert.equal(x.c.gyMcpExecution.status().pending,0);assert.equal(x.c.gyMcpExecution.status().owner,null);assert.equal(x.c.gyMcpExecution.status().human,true);checks++;
assert.equal(x.c.gyMcpEndTakeover(false).error,'confirmation_required');assert(x.c.gyMcpEndTakeover(true).ok);assert.equal(x.c.gyMcpExecution.status().human,false);assert.equal(models,1);checks++;
// Late read settlement must not decrement a newer owner's pending write.
await x.c.gyMcpExecution.acquire('new-owner');x.c.gyMcpExecution.begin('new-owner');resolveRead({ok:false,error:'late_read'});await flush();
assert.equal(x.c.gyMcpExecution.status().pending,1);assert.equal(x.c.gyMcpExecution.status().owner,'new-owner');assert.equal(x.c.gyMcpExecution.status().blocked,false);checks++;
x.c.gyMcpExecution.settle('new-owner',true);x.c.gyMcpExecution.release('new-owner');
// The task may have timed out before takeover; its stopped read must also be detachable.
models=0;p=x.c.gyMcpDecide('c','重新读取当前美团');await flush();assert.equal(x.c.gyMcpExecution.status().pending,1);
x.timers.findLast(t=>t.ms===45000&&!t.clear).fn();await p;assert.equal(x.c.gyMcpTasks.list()[0].state,'timed_out');
x.c.gyMcpTakeover('user');assert.equal(x.c.gyMcpExecution.status().pending,0);assert(x.c.gyMcpEndTakeover(true).ok);resolveRead({ok:true,page:'home'});await flush();assert.equal(x.c.gyMcpExecution.status().owner,null);checks++;
// Unknown remote calls cannot be detached, even if their descriptions sound read-only.
x=setup('tool');x.c.plus={android:{}};p=x.c.gyMcpDecide('c','查一下');await reach(x,'tool');x.c.gyMcpTakeover('user');await p;
assert.equal(x.c.gyMcpExecution.status().pending,1);assert.equal(x.c.gyMcpEndTakeover(true).error,'in_flight');checks++;
x.release();await flush();assert(x.c.gyMcpEndTakeover(true).ok);checks++;
// User review can clear a settled/persisted unknown marker, as outside-takeover acknowledge already allows.
x=setup('none');x.c.plus={android:{}};await x.c.gyMcpExecution.acquire('old');x.c.gyMcpExecution.begin('old');x.c.gyMcpExecution.settle('old',false);x.c.gyMcpExecution.release('old');x.c.gyMcpTakeover('user');
assert(x.c.gyMcpExecution.status().blocked);assert.equal(x.c.gyMcpEndTakeover(false).error,'confirmation_required');assert(x.c.gyMcpExecution.status().blocked);checks++;
assert(x.c.gyMcpEndTakeover(true).ok);assert.equal(x.c.gyMcpExecution.status().blocked,false);checks++;
// A local write pending at takeover is also never detached.
x=setup('none');x.c.plus={android:{}};await x.c.gyMcpExecution.acquire('write');x.c.gyMcpExecution.begin('write');x.c.gyMcpTakeover('user');
assert.equal(x.c.gyMcpExecution.abandonReadOnly('write'),false);assert.equal(x.c.gyMcpEndTakeover(true).error,'in_flight');checks++;
console.log(checks+' takeover exit checks passed: detach stopped built-in reads only, no late settlement corruption, writes/remote in-flight held, explicit review required');
