import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const taskSrc=fs.readFileSync('js/99-mcp-tasks.js','utf8'),mcpSrc=fs.readFileSync('js/99-mcp.js','utf8');
let count=0;
function setup(opt={}) {
 const tool={name:'lookup',description:'lookup',inputSchema:{type:'object',required:['q'],properties:{q:{type:'string'}}}};
 const data={gyMcpCfg:JSON.stringify({servers:[{id:'s',kind:'http',url:'https://mcp.invalid',tools:[tool]}],rounds:opt.limit?1:3})};
 let modelCalls=0, toolCalls=0, release;
 const gate=new Promise(r=>release=r);
 const c={window:null,console:{warn(){}},document:{getElementById:()=>null},CustomEvent:function(){},dispatchEvent(){},addEventListener(){},setTimeout(){},setInterval(){},
  localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]},myCharacters:[{id:'c',name:'角色'}],globalChats:{},isAutoOn:()=>!opt.off,getApiConfig:()=>({url:'https://model.invalid',key:'secret',model:'test'}),
  smartFetch:async(url,req)=>{
   const b=JSON.parse(req.body);
   if(url.includes('model.invalid')) {modelCalls++;if(opt.block&&modelCalls===1)await gate;
    if(opt.error) return {json:async()=>({error:{message:'API failed'}})};
    const calls=opt.none||modelCalls>1?[]:[{id:'tc',type:'function',function:{name:'s0__lookup',arguments:JSON.stringify({q:opt.badArgs?3:'value'})}}];
    return {json:async()=>({choices:[{message:{content:'无',tool_calls:calls}}]})};
   }
   let result={};if(b.method==='tools/list')result={tools:[tool]};if(b.method==='tools/call'){toolCalls++;result={content:[{type:'text',text:opt.fail?'failed':'found'}],isError:!!opt.fail};}
   return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify({id:b.id,result})};
  }};
 c.window=c;vm.runInNewContext(taskSrc,c);vm.runInNewContext(fs.readFileSync('js/99-mcp-execution.js','utf8'),c);vm.runInNewContext(mcpSrc,c);return {c,release,toolCalls:()=>toolCalls,modelCalls:()=>modelCalls};
}
for(const [opt,state,steps] of [[{},'completed',1],[{none:true},'completed',0],[{fail:true},'failed',1],[{error:true},'failed',0],[{limit:true},'paused',1],[{badArgs:true},'failed',1]]) {
 const x=setup(opt);await x.c.gyMcpDecide('c','你好');const t=x.c.gyMcpTasks.list()[0];assert.equal(t.state,state);assert.equal(t.steps,steps);count++;
 if(opt.badArgs){assert.equal(x.toolCalls(),0);count++;}
}
const x=setup({block:true});const pending=x.c.gyMcpDecide('c','你好');for(let i=0;i<30;i++)await Promise.resolve();assert.equal(x.c.gyMcpTasks.list()[0].state,'running');count++;x.release();await pending;assert.equal(x.c.gyMcpTasks.list()[0].state,'completed');count++;
const off=setup({off:true});await off.c.gyMcpDecide('c','你好');assert.equal(off.c.gyMcpTasks.list().length,0);assert.equal(off.modelCalls(),0);count++;
const missing=setup();delete missing.c.gyMcpTasks;await missing.c.gyMcpDecide('c','你好');assert.equal(missing.modelCalls(),0);count++;
console.log(count+' task/MCP integration checks passed');
