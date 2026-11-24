import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {setup} from './mcp-meituan-checkout-test.mjs';
const x=setup(),c=x.c,data={gyMcpCfg:JSON.stringify({servers:[{id:'phone',kind:'builtin',tools:[{name:'meituan_prepare_checkout'},{name:'meituan_checkout_summary'}]}]})};let step=0;
Object.assign(c,{console:{warn(){}},localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]},document:{getElementById:()=>null},dispatchEvent(){},addEventListener(){},CustomEvent:function(){},setTimeout:()=>1,clearTimeout(){},setInterval(){},plus:{android:{}},myCharacters:[{id:'c',name:'角色'}],globalChats:{},isAutoOn:()=>true,getApiConfig:()=>({url:'https://model.invalid',key:'test'}),smartFetch:async(url,req)=>{const b=JSON.parse(req.body);step++;return {json:async()=>({choices:[{message:{content:'无',tool_calls:step===1?[{id:'checkout',type:'function',function:{name:'s0__meituan_prepare_checkout',arguments:'{"store":"面馆"}'}}]:[]}}]})};}});
for(const file of ['99-mcp-tasks.js','99-mcp-execution.js','99-mcp.js'])vm.runInNewContext(fs.readFileSync('js/'+file,'utf8'),c);
const items=await c.gyMcpDecide('c','核对结算信息');const out=JSON.parse(items[0].out);assert(out.complete);assert.equal(out.feesCents.total,2200);assert.equal(x.actions(),1);assert.equal(c.gyMcpTasks.list()[0].state,'completed');assert.equal(c.gyMcpExecution.status().pending,0);
for(const value of ['上海市示例路12号','13800138000','张某']){assert(!JSON.stringify(items).includes(value));assert(!JSON.stringify(data).includes(value));assert(!c.__gyMcpCtxFor('c').includes(value));}
assert.equal(c.gyMcpState().log[0].err,false);
console.log('PASS checkout MCP integration: one navigation, verified cents, redacted model context and persisted logs, no submit/payment');
