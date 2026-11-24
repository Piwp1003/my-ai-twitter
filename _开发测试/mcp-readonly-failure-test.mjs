import assert from 'node:assert/strict';import {setup} from './mcp-cancel-test.mjs';
let checks=0;
for(const tool of ['inspect_screen','wait_screen'])for(const throws of [false,true]){
 const x=setup('none');x.c.plus={android:{}};let models=0,reads=0;
 x.c.gyMcpState().servers.splice(0,1,{id:'phone',kind:'builtin',tools:[{name:tool}]});
 x.c.gysPh={mcp:{inspectScreen:read,waitScreen:read}};
 function read(){reads++;if(throws)throw Error('read failed');return {err:'not_meituan',error:'not_meituan'};}
 x.c.smartFetch=async()=>({json:async()=>({choices:[{message:{tool_calls:[{id:'read-'+(++models),type:'function',function:{name:'s0__'+tool,arguments:tool==='wait_screen'?'\u007b"token":1\u007d':'{}'}}]}}]})});
 await x.c.gyMcpDecide('c','读取页面');assert.equal(reads,1);assert.equal(models,1);assert.equal(x.c.gyMcpTasks.list()[0].state,'failed');assert(!x.c.gyMcpTasks.list()[0].note.includes('核对后解除占用'));
 assert.equal(x.c.gyMcpExecution.status().blocked,false);assert.equal(x.c.gyMcpExecution.status().pending,0);assert.equal(x.c.gyMcpExecution.status().owner,null);checks++;
 await x.c.gyMcpDecide('c','新的读取请求');assert.equal(reads,2);assert.equal(x.c.gyMcpExecution.status().blocked,false);checks++;
}
console.log(checks+' pure built-in read failure checks passed: structured/throwing errors stop without device lock, new request can run');
