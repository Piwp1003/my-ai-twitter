import assert from 'node:assert/strict';
import {setup,reach} from './mcp-cancel-test.mjs';
const flush=async()=>{for(let i=0;i<200;i++)await Promise.resolve();};
let checks=0;
const check=(value)=>{assert(value);checks++;};
const message=x=>{x.c.globalChats.c=[{sender:'me',text:'打开美团搜索午饭',timestamp:1}];};

// The first request may spend more than the old total 45s across several model rounds.
let x=setup('none');message(x);const original=x.c.smartFetch;
x.c.smartFetch=async(url,request)=>{if(url.includes('model.invalid'))x.advance(30000);return original(url,request);};
await x.c.gyMcpDecide('c','打开美团搜索午饭');
check(x.model()===2&&x.calls()===2);
check(x.c.gyMcpTasks.list()[0].state==='completed');
check(x.timers.filter(t=>[180000,90000,45000,30000].includes(t.ms)).every(t=>t.clear));

// A duplicate hook while the first request waits is silent, and cannot create another task.
x=setup();message(x);const toasts=[];x.c.showToast=(...args)=>toasts.push(args);
let pending=x.c.gyMcpDecide('c','打开美团搜索午饭');await reach(x,'model');
check(x.c.gyMcpTasks.list()[0].note.includes('等待模型选择工具'));
await x.c.gyMcpDecide('c','打开美团搜索午饭');
check(x.c.gyMcpTasks.list().length===1&&x.model()===1&&toasts.length===0);
x.timers.find(t=>t.ms===90000&&!t.clear).fn();await pending;
check(x.c.gyMcpTasks.list()[0].state==='timed_out');
check(x.c.gyMcpTasks.list()[0].note.includes('等待模型选择工具')&&x.c.gyMcpTasks.list()[0].note.includes('尚未发出'));
check(x.calls()===0&&!x.c.gyMcpExecution.status().blocked);
check(JSON.parse(x.c.localStorage.getItem('gyMcpRequestsV1')).length===0);

// Retry the same message without a cooldown. A late answer to the timed-out model cannot act.
pending=x.c.gyMcpDecide('c','打开美团搜索午饭');await flush();
check(x.model()===2&&x.c.gyMcpTasks.list().length===2);
x.release();await pending;await flush();
check(x.calls()===1&&x.c.gyMcpTasks.list()[0].state==='completed');
check(x.c.gyMcpState().log.every(row=>row.taskId===x.c.gyMcpTasks.list()[0].id));
check(x.c.gyMcpTasks.list()[1].state==='timed_out');

// A timed-out tools/call is uncertain: keep both the in-flight latch and message claim.
x=setup('tool');message(x);pending=x.c.gyMcpDecide('c','打开美团搜索午饭');await reach(x,'tool');
check(x.c.gyMcpTasks.list()[0].note.includes('等待工具返回'));
x.timers.find(t=>t.ms===45000&&!t.clear).fn();await pending;
check(x.c.gyMcpTasks.list()[0].note.includes('已发出外部工具请求'));
check(x.c.gyMcpExecution.status().pending===1&&x.calls()===1);
check(!x.c.gyMcpExecution.releaseUnsent('anything'));
x.release();await flush();const before=x.model();
await x.c.gyMcpDecide('c','打开美团搜索午饭');
check(x.model()===before&&x.calls()===1);

// The same safe retry policy also applies to callers without stable message IDs.
x=setup();pending=x.c.gyMcpDecide('c','打开美团搜索午饭');await reach(x,'model');
x.timers.find(t=>t.ms===90000&&!t.clear).fn();await pending;
pending=x.c.gyMcpDecide('c','打开美团搜索午饭');await flush();check(x.model()===2);
x.release();await pending;

// Duplicate reply hooks must not bypass the running MCP task and start an early second reply.
x=setup();message(x);x.timers.find(t=>t.ms===600).fn();
pending=x.c.triggerAIBatchReply('c','打开美团搜索午饭');await reach(x,'model');
await x.c.triggerAIBatchReply('c','打开美团搜索午饭');
check(x.replies()===0&&x.model()===1);
x.c.gyMcpCancel(x.c.gyMcpTasks.list()[0].id);await pending;x.release();await flush();
check(x.replies()===1&&x.calls()===0);
console.log(checks+' phase timeout/safe retry regression checks passed');
