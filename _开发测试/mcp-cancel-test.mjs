import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const taskSrc=fs.readFileSync('js/99-mcp-tasks.js','utf8'),source=fs.readFileSync('js/99-mcp.js','utf8');
let count=0;
export function setup(stage='model', instant=false){
 const tool={name:'lookup',description:'lookup',inputSchema:{type:'object',properties:{}}};
 const data={gyMcpCfg:JSON.stringify({servers:[{id:'s',kind:'http',url:'https://mcp.invalid',tools:[tool]}]})};
 let release,at='',clock=100000,model=0,calls=0,signal,replies=0;
 const gate=new Promise(r=>release=r),timers=[];
 const RealDate=Date;class Clock extends RealDate{static now(){return clock;}}
 async function block(name){if(stage===name||(stage==='tool_error'&&name==='tool')){at=name;await gate;}}
 const c={window:null,Date:Clock,AbortController,console:{warn(){}},document:{getElementById:()=>null},CustomEvent:function(){},addEventListener(){},
  dispatchEvent(){if(instant&&c.gyMcpTasks&&c.gyMcpCancel){const t=c.gyMcpTasks.list()[0];if(t?.state==='running')c.gyMcpCancel(t.id);}},
  setTimeout(fn,ms){const t={fn,ms,clear:false};timers.push(t);return t;},setInterval(){},clearTimeout(t){if(t)t.clear=true;},
  localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]},myCharacters:[{id:'c',name:'角色'},{id:'c2',name:'第二个角色'}],globalChats:{},isAutoOn:()=>true,getApiConfig:()=>({url:'https://model.invalid',key:'test'}),triggerAIBatchReply:async()=>{replies++;},
  smartFetch:async(url,req)=>{
   const b=JSON.parse(req.body);
   if(url.includes('model.invalid')){model++;signal=req.signal;
    if(stage==='fallback'&&b.tools)throw Error('function calling unsupported');
    await block(b.tools?'model':'fallback');
    const toolCall=i=>({id:stage==='duplicate'?'same-id':'tc'+i,type:'function',function:{name:'s0__lookup',arguments:'{}'}});
    return {json:async()=>({choices:[{message:b.tools?{tool_calls:model===1?[toolCall(1),toolCall(2)]:[],content:'无'}:{content:'{"calls":[{"tool":"s0__lookup","args":{}}]}'}}]})};
   }
   let result={};
   if(b.method==='initialize')await block('initialize');
   if(b.method==='tools/list'){await block('list');result={tools:[tool]};}
   if(b.method==='tools/call'){calls++;await block('tool');if(stage==='tool_error')throw Error('transport lost');result={content:[{type:'text',text:'late result'}]};}
   return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify({id:b.id,result})};
  }};
 c.window=c;vm.runInNewContext(taskSrc,c);vm.runInNewContext(fs.readFileSync('js/99-mcp-execution.js','utf8'),c);vm.runInNewContext(source,c);
 return {c,release,timers,at:()=>at,replies:()=>replies,calls:()=>calls,model:()=>model,signal:()=>signal,advance:()=>clock+=45001};
}
export async function reach(x,stage){for(let i=0;i<200;i++){if(x.at()===stage)return;await Promise.resolve();}throw Error('did not reach '+stage);}
for(const stage of ['model','initialize','list','tool','fallback']){
 const x=setup(stage);const pending=x.c.gyMcpDecide('c','你好');await reach(x,stage);const id=x.c.gyMcpTasks.list()[0].id;
 assert.equal(x.c.gyMcpCancel(id),true);await pending;assert.equal(x.c.gyMcpTasks.list()[0].state,'cancelled');count++;
 const beforeCalls=x.calls(),beforeModel=x.model();x.release();for(let i=0;i<100;i++)await Promise.resolve();
 assert.equal(x.calls(),beforeCalls);assert.equal(x.model(),beforeModel);assert.equal(x.calls(),stage==='tool'?1:0);count++;
 assert.equal(x.c.gyMcpTasks.list()[0].steps,0);assert.equal(x.c.gyMcpTasks.list()[0].state,'cancelled');assert.equal(x.signal().aborted,true);count++;
 assert.match(x.c.__gyMcpCtxFor('c'),/不得声称目标已经完成/);assert.equal(x.c.gyMcpState().log.length,0);count++;
 assert.equal(x.c.gyMcpCancel(id),false);assert(x.timers.filter(t=>t.ms===45000).every(t=>t.clear));count++;
}
let x=setup();let pending=x.c.gyMcpDecide('c','你好');await reach(x,'model');x.timers.find(t=>t.ms===45000).fn();await pending;assert.equal(x.c.gyMcpTasks.list()[0].state,'timed_out');assert.equal(x.signal().aborted,true);count++;x.release();
x=setup();pending=x.c.gyMcpDecide('c','你好');await reach(x,'model');x.advance();x.release();await pending;assert.equal(x.c.gyMcpTasks.list()[0].state,'timed_out');assert.equal(x.calls(),0);count++;
x=setup('model',true);await x.c.gyMcpDecide('c','你好');assert.equal(x.c.gyMcpTasks.list()[0].state,'cancelled');assert.equal(x.model(),0);count++;
x=setup();x.timers.find(t=>t.ms===600).fn();pending=x.c.triggerAIBatchReply('c','你好');await reach(x,'model');x.c.gyMcpCancel(x.c.gyMcpTasks.list()[0].id);await pending;assert.equal(x.replies(),1);count++;x.release();for(let i=0;i<100;i++)await Promise.resolve();assert.equal(x.replies(),1);assert.equal(x.calls(),0);count++;
console.log(count+' cancellation/deadline checks passed');
