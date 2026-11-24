import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {setup} from './mcp-meituan-cart-test.mjs';
async function run(duplicate){const x=setup({simple:true,baseline:1}),c=x.c,data={gyMcpCfg:JSON.stringify({rounds:6,servers:[{id:'phone',kind:'builtin',tools:[{name:'meituan_menu'},{name:'meituan_add_item'}]}]})};let step=0;
 Object.assign(c,{console:{warn(){}},localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]},document:{getElementById:()=>null},dispatchEvent(){},addEventListener(){},CustomEvent:function(){},setTimeout:()=>1,clearTimeout(){},setInterval(){},plus:{android:{}},myCharacters:[{id:'c',name:'角色'}],globalChats:{},isAutoOn:()=>true,getApiConfig:()=>({url:'https://model.invalid',key:'test'}),smartFetch:async(url,req)=>{const b=JSON.parse(req.body);step++;let calls=[];
  if(step===1||(duplicate&&step===3))calls=[{id:'menu'+step,type:'function',function:{name:'s0__meituan_menu',arguments:'{}'}}];
  if(step===2||(duplicate&&step===4)){const r=JSON.parse(b.messages.filter(m=>m.role==='tool').slice(-1)[0].content);calls=[{id:'add'+step,type:'function',function:{name:'s0__meituan_add_item',arguments:JSON.stringify({token:r.token,ref:r.items[0].ref,store:r.store,name:r.items[0].name,quantity:1,specs:[]})}}];}
  return {json:async()=>({choices:[{message:{content:'无',tool_calls:calls}}]})};
 }});
 for(const file of ['99-mcp-tasks.js','99-mcp-execution.js','99-mcp.js'])vm.runInNewContext(fs.readFileSync('js/'+file,'utf8'),c);
 const items=await c.gyMcpDecide('c','加一份牛肉面');assert.equal(x.addClicks(),1);const added=JSON.parse(items.find(i=>i.name==='meituan_add_item').out);assert.equal(added.beforeQuantity,1);assert.equal(added.afterQuantity,2);assert.equal(added.verifiedAdded,1);
 if(duplicate){assert(items.filter(i=>i.name==='meituan_add_item')[1].bad);assert.equal(c.gyMcpTasks.list()[0].state,'failed');}else assert.equal(c.gyMcpTasks.list()[0].state,'completed');
 assert.equal(c.gyMcpExecution.status().pending,0);
}
await run(false);await run(true);console.log('PASS cart MCP integration: model-selected item, actual quantity delta, and same-item duplicate prevention');
