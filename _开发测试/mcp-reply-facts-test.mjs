import assert from 'node:assert/strict';import {setup} from './mcp-cancel-test.mjs';
let checks=0;
async function run(name,value,{remote=false,modelError=false}={}){
 const x=setup('none');x.c.plus={android:{}};let n=0;
 x.c.gyMcpState().servers.splice(0,1,{id:'phone',kind:remote?'http':'builtin',url:'https://mcp.invalid',tools:[{name,inputSchema:{type:'object',properties:{}}}]});
 x.c.gysPh={mcp:{inspectScreen:()=>value}};x.c.gyMeituan={search:()=>value};x.c.gyMeituanCheckout={read:()=>value};x.c.gyMeituanOrders={read:()=>value};
 const original=x.c.smartFetch;
 x.c.smartFetch=async(url,req)=>{
  const body=JSON.parse(req.body);
  if(url.includes('model.invalid'))return {json:async()=>modelError?{error:{message:'server error'}}:{choices:[{message:{tool_calls:++n===1?[{id:'t',type:'function',function:{name:'s0__'+name,arguments:name==='meituan_search'?'\u007b"query":"面条"\u007d':'{}'}}]:[]}}]}};
  if(body.method==='tools/list')return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({id:body.id,result:{tools:[{name,inputSchema:{type:'object',properties:{}}}]}})};
  if(body.method==='tools/call')return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({id:body.id,result:{structuredContent:value,content:[]}})};
  return original(url,req);
 };
 x.c.triggerAIBatchReply=(sid,text,alive,receipt)=>{x.receipt=receipt;};x.timers.find(t=>t.ms===600).fn();
 const wrapped=x.c.triggerAIBatchReply;x.c.triggerAIBatchReply=function(){return wrapped.apply(this,arguments);};x.timers.find(t=>t.ms===600).fn();
 await x.c.triggerAIBatchReply('c','打开美团搜索面条');return x;
}
let x=await run('inspect_screen',{err:'not_meituan',error:'not_meituan'});
let f=x.c.gyMcpReplyFacts(x.receipt,'c','c');assert(f.fixedReply.includes('没有确认搜到店铺'));assert(f.fixedReply.includes('not_meituan'));assert(f.fixedReply.includes('执行失败'));assert(f.prompt.includes('真实操作事实约束'));checks++;
assert(Object.isFrozen(x.receipt)&&Object.isFrozen(x.receipt.attempts)&&Object.isFrozen(x.receipt.attempts[0]));assert.throws(()=>x.receipt.state='completed');checks++;
assert.equal(x.c.gyMcpReplyFacts({...x.receipt},'c','c').fixedReply,'');assert.equal(x.c.gyMcpReplyFacts(x.receipt,'c2','c2').fixedReply,'');checks++;
x.advance(120001);assert(x.c.gyMcpReplyFacts(x.receipt,'c','c').fixedReply.includes('回执已过期'));checks++;
x=await run('meituan_search',{ok:true,page:'results',query:'面条',stores:[]});f=x.c.gyMcpReplyFacts(x.receipt,'c','c');assert(f.fixedReply.includes('已确认：读取到本次搜索结果'));assert(!f.fixedReply.includes('读取到结算页面'));checks++;
x=await run('meituan_checkout_summary',{ok:true,page:'checkout',complete:false});f=x.c.gyMcpReplyFacts(x.receipt,'c','c');assert(f.fixedReply.includes('读取到结算页面（不代表已下单或付款）'));checks++;
x=await run('meituan_search',{ok:true,page:'checkout'},{remote:true});f=x.c.gyMcpReplyFacts(x.receipt,'c','c');assert.equal(f.fixedReply,'');assert(f.prompt.includes('"confirmed":[]'));checks++;
x=await run('inspect_screen',null,{modelError:true});f=x.c.gyMcpReplyFacts(x.receipt,'c','c');assert(f.fixedReply.includes('工具判断未完成'));checks++;
x=await run('meituan_order_status',{ok:true,state:'paid',confirmedAssociation:false,taskOutcome:'unverified'});f=x.c.gyMcpReplyFacts(x.receipt,'c','c');assert(f.fixedReply.includes('不能推定订单成功或已付款'));checks++;
x=await run('meituan_order_status',{ok:true,state:'paid',confirmedAssociation:true,taskOutcome:'paid_order_observed'});f=x.c.gyMcpReplyFacts(x.receipt,'c','c');assert(f.fixedReply.includes('仅观察结果，不代表本轮执行付款'));checks++;
assert(!f.prompt.includes('secret'));assert(!f.prompt.includes('model.invalid'));checks++;
console.log(checks+' reply receipt checks passed: matching scope, immutable provenance, failure facts, partial evidence, expiry, remote spoof rejection, no credentials');
