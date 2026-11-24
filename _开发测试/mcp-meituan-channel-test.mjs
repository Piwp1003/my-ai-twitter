import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {setup} from './mcp-meituan-test.mjs';
const MAIN='com.sankuai.meituan',TAKEOUT='com.sankuai.meituan.takeoutnew';let checks=0;
const n=(ref,parentRef,text,extra={})=>({ref,parentRef,text,enabled:true,...extra});
function scenario(opt={}){
 const x=setup(),actions=[],opens=[];let pkg=opt.current||'',phase=opt.inChannel?'channel':'home',query='',token=0;
 function screen(){
  if(!pkg)return {ok:false,error:'not_meituan'};
  let nodes=phase==='home'?[n(0,-1,'',{clickable:true,id:'h21'}),n(1,0,'私人地址占位'),n(2,-1,'',{clickable:true,id:'search_box'}),n(3,2,'推荐商家占位'),...(!opt.missingChannel?[n(4,-1,'',{clickable:true}),n(5,4,'外卖')]:[]),...(opt.ambiguous?[n(6,-1,'',{clickable:true}),n(7,6,'外卖')]:[])]:phase==='channel'?[n(0,-1,''),n(1,0,'搜索商家',{clickable:true,id:'wm_search_box'})]:phase==='uncertain'?[n(0,-1,''),n(1,0,'搜索商家',{clickable:true,id:'search_box'})]:phase==='search'?[n(0,-1,''),n(7,0,query,{editable:true,id:'wm_search_input'}),n(8,0,'',{clickable:true}),n(9,8,'搜索')]:[n(0,-1,''),n(1,0,'',{clickable:true}),n(2,1,'面馆',{id:'poi_name'}),n(3,1,'月售100')];
  return {ok:true,pkg,snapshotSchema:2,token:++token,fingerprint:pkg+phase+query,nodes,truncated:!!opt.truncated};
 }
 x.c.gysPh.__N={apps:()=>opt.onlyTakeout?[{pkg:TAKEOUT}]:[{pkg:MAIN},{pkg:TAKEOUT}],openApp:p=>{opens.push(p);pkg=p;phase=p===MAIN?'home':'channel';return true;}};
 Object.assign(x.c.gysPh.mcp,{inspectScreen:screen,tapElement:(t,ref)=>{
  actions.push('tap:'+ref);
  if(phase==='home'){assert.equal(ref,4,'must use takeout entry, never the generic search box');if(opt.failChannel)return {ok:false,error:'screen_changed',actionAccepted:true};phase=opt.noProof?'uncertain':'channel';if(opt.switchApp)pkg=TAKEOUT;}
  else if(phase==='channel'){assert.equal(ref,1);phase='search';}else{assert.equal(ref,8);assert.equal(query,'面条');phase='results';}
  return {ok:true,actionAccepted:true,snapshot:screen()};
 },setText:(t,ref,value)=>{assert.equal(phase,'search');assert.equal(ref,7);query=value;actions.push('text:'+value);return {ok:true,actionAccepted:true,snapshot:screen()};}});
 return {...x,actions,opens};
}
let x=scenario(),r=await x.api.search({query:'面条'});assert(r.ok);assert.deepEqual(x.opens,[MAIN]);assert.equal(x.actions.join(','),'tap:4,tap:1,text:面条,tap:8');assert.equal(r.pkg,MAIN);assert.equal(r.channel,'takeout');assert(r.queryVerified);checks++;
x=scenario({current:TAKEOUT});r=await x.api.search({query:'面条'});assert(r.ok);assert.deepEqual(x.opens,[MAIN]);checks++;
x=scenario();r=await x.api.search({query:'面条',app:'takeout'});assert(r.ok);assert.deepEqual(x.opens,[TAKEOUT]);assert.equal(x.actions[0],'tap:1');assert.equal(r.app,'takeout');checks++;
x=scenario({current:MAIN,inChannel:true});assert((await x.api.search({query:'面条'})).ok);assert.equal(x.opens.length,0);assert.equal(x.actions[0],'tap:1');checks++;
x=scenario({onlyTakeout:true});r=await x.api.search({query:'面条'});assert.equal(r.error,'app_missing');assert.equal(x.opens.length,0);assert.equal(x.actions.length,0);checks++;
for(const opt of [{missingChannel:true},{ambiguous:true},{truncated:true}]){
 x=scenario(opt);r=await x.api.search({query:'面条'});assert.equal(r.error,'channel_unverified');assert.equal(r.diagnostic.stage,'before_channel');assert.equal(x.actions.length,0);assert(!JSON.stringify(r.diagnostic).includes('私人地址'));assert(!JSON.stringify(r.diagnostic).includes('推荐商家'));assert.equal(r.diagnostic.structure.length,r.diagnostic.nodeCount);assert.equal(r.diagnostic.structureTruncated,!!opt.truncated);assert(r.diagnostic.structure.every(n=>!('text' in n)&&!('desc' in n)));checks++;
}
x=scenario({noProof:true});r=await x.api.search({query:'面条'});assert.equal(r.error,'channel_unverified');assert.equal(r.diagnostic.stage,'after_channel');assert.deepEqual(x.actions,['tap:4']);checks++;
x=scenario({failChannel:true});r=await x.api.search({query:'面条'});assert.equal(r.error,'screen_changed');assert.deepEqual(x.actions,['tap:4']);checks++;
x=scenario({switchApp:true});r=await x.api.search({query:'面条'});assert.equal(r.error,'target_app_changed');assert.deepEqual(x.opens,[MAIN]);assert.deepEqual(x.actions,['tap:4']);checks++;
x=scenario();await assert.rejects(()=>x.api.search({query:'面条'},()=>{if(x.actions.length)throw Error('cancelled');}),/cancelled/);assert.deepEqual(x.actions,['tap:4']);checks++;
x=scenario();r=await x.api.search({query:'面条',app:'other'});assert.equal(r.error,'bad_app');assert.equal(x.opens.length,0);checks++;
x=setup({initial:'results'});r=await x.api.inspect({});x.c.gysPh.mcp.inspectScreen=()=>({...x.snapshot(),pkg:TAKEOUT});assert.equal((await x.api.chooseStore({token:r.token,ref:1,name:'面馆'})).error,'screen_changed');assert.equal(x.actions().length,0);checks++;
// Target changes are rejected before dispatch, so they do not create an unknown-operation lock.
x=setup();const c=x.c,data={gyMcpCfg:JSON.stringify({servers:[{id:'phone',kind:'builtin',tools:[{name:'meituan_search'}]}]})};let models=0,searches=0;
c.gyMeituan={search:async args=>{searches++;assert.equal(args.app,'meituan');return {ok:true,page:'results'};}};
Object.assign(c,{AbortController,console:{warn(){}},localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]},document:{getElementById:()=>null},dispatchEvent(){},addEventListener(){},CustomEvent:function(){},setTimeout:(fn,ms)=>{if(ms<300)fn();return 1;},clearTimeout(){},setInterval(){},plus:{android:{}},myCharacters:[{id:'c',name:'测试'}],globalChats:{},isAutoOn:()=>true,getApiConfig:()=>({url:'https://model.invalid',key:'test'}),smartFetch:async()=>({json:async()=>({choices:[{message:{tool_calls:[{id:'s'+(++models),type:'function',function:{name:'s0__meituan_search',arguments:JSON.stringify({query:'面条',...(models===2?{app:'takeout'}:{})})}}]}}]})})});
for(const f of ['99-mcp-tasks.js','99-mcp-execution.js','99-mcp.js'])vm.runInNewContext(fs.readFileSync('js/'+f,'utf8'),c);
const items=await c.gyMcpDecide('c','用美团搜索面条');assert.equal(searches,1);assert.equal(models,2);assert.equal(items.length,2);assert(items[1].bad);assert(items[1].out.includes('不能中途切换'));assert.equal(c.gyMcpExecution.status().blocked,false);assert.equal(c.gyMcpTasks.list()[0].state,'failed');checks++;
models=0;const structure=Array.from({length:80},(_,ref)=>({ref,parentRef:ref-1,id:'com.sankuai.meituan:id/search_sample_'+ref,cls:'android.widget.TextView',clickable:false,editable:false,enabled:true,semantic:'other'}));
c.gyMeituan.search=async()=>({ok:false,error:'channel_unverified',err:'未确认频道',diagnostic:{stage:'before_channel',structure}});
await c.gyMcpDecide('c','美团频道结构采样');const saved=c.gyMcpState().log[0].out;assert(saved.length>4000);assert.equal(JSON.parse(saved.replace(/^［工具报错］/,'')).diagnostic.structure.length,80);assert.equal(c.gyMcpExecution.status().blocked,false);checks++;
console.log(checks+' app/channel scenarios passed: default main app, explicit dedicated app, no fallback, confirmed channel before exact query, ambiguity/truncation/cancellation and task target pinning');
