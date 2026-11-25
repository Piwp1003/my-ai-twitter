import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {setup as adapterSetup} from './mcp-meituan-test.mjs';
const packed=fs.readFileSync('js/61-soft.js','utf8'),m=packed.match(/new Function\('X', 'applyMacros', ("\/\* 📲 真手机(?:[^"\\]|\\.)*")\)/),body=JSON.parse(m[1]);
assert.equal(body,fs.readFileSync('插件/软件/源码/60-真手机.js','utf8').replace(/\r\n/g,'\n'));
const helpers=body.slice(body.indexOf('function pageResult('),body.indexOf('P.mcp = {'));
let checks=1;
function setup(opt={}){
 let reads=0,actions=0,token=0,clock=1000,changed=false,denied=false;const waits=[];
 const NativeDate=Date;class Clock extends NativeDate{static now(){return clock;}}
 const c={Date:Clock,Map,Number,JSON,pageReady:()=>denied?{err:'permission changed'}:null,setTimeout:fn=>{clock+=200;waits.push(200);fn();}};
 const N={mcpCapabilities:()=>({pageSafety:2}),inspectScreen:()=>{
  reads++;const mode=opt.read?.({reads,actions,changed});
  if(mode?.error)return {ok:false,...mode};
  const fp=mode?.fp||(changed?'after':'before');
  return {ok:true,pkg:'com.sankuai.meituan',snapshotSchema:2,fingerprint:fp,token:++token,nodes:[{ref:0,id:'search_input',text:mode?.text||fp,enabled:true,editable:true}]};
 }};
 const action=()=>{actions++;if(opt.reject)return {ok:false,error:opt.reject};changed=true;return {ok:true,action:'tap'};};
 Object.assign(N,{tapElement:action,setText:action,scrollSnapshot:action,backSnapshot:action});c.N=N;
 vm.runInNewContext(helpers+';globalThis.api={prepareScreen,inspectPage,operatePage};',c);
 return {api:c.api,reads:()=>reads,actions:()=>actions,deny:()=>denied=true,waits};
}
let x=setup({read:({reads})=>reads<3?{error:'screen_changed'}:{fp:'stable'}}),s=await x.api.prepareScreen(160);assert(s.ok);assert.equal(s.readStability.reads,4);assert.equal(x.actions(),0);checks++;
x=setup({read:({reads})=>({fp:reads<4?'changing'+reads:'stable'})});s=await x.api.prepareScreen(160);assert.equal(s.readStability.reads,5);assert.equal(x.actions(),0);checks++;
x=setup({read:({reads})=>({fp:'changing'+reads})});s=await x.api.prepareScreen(160);assert.equal(s.error,'screen_unstable');assert.equal(s.actionAccepted,false);assert.equal(x.reads(),8);assert.equal(x.actions(),0);checks++;
x=setup({read:()=>({error:'not_meituan'})});s=await x.api.prepareScreen(160);assert.equal(s.error,'not_meituan');assert.equal(x.reads(),1);checks++;
x=setup({read:()=>({error:'accessibility_off'})});s=await x.api.prepareScreen(160);assert.equal(x.reads(),1);assert.equal(x.actions(),0);checks++;
x=setup({read:({reads})=>({fp:'changing'+reads})});await assert.rejects(()=>x.api.prepareScreen(160,()=>{if(x.reads()>1)throw Error('cancel');}),/cancel/);assert.equal(x.actions(),0);assert.equal(x.reads(),2);checks++;
x=setup();x.deny();s=await x.api.prepareScreen(160);assert.equal(s.actionAccepted,false);assert.equal(x.reads(),0);checks++;
// Fresh stable snapshots still require an unchanged page in the actual operation preflight.
x=setup({read:({reads})=>({fp:reads<3?'old':'new'})});s=await x.api.prepareScreen(160);let r=await x.api.operatePage('tap',s.token,0);assert.equal(r.error,'screen_changed');assert.equal(r.diagnostic.phase,'preflight_changed');assert.equal(r.actionAccepted,false);assert.equal(x.actions(),0);checks++;
x=setup({read:({reads})=>reads===2?{error:'screen_changed'}:null});s=x.api.inspectPage(160);r=await x.api.operatePage('tap',s.token,0);assert.equal(r.diagnostic.phase,'preflight_read');assert.equal(r.actionAccepted,false);assert.equal(x.actions(),0);checks++;
x=setup({reject:'screen_changed'});s=await x.api.prepareScreen(160);r=await x.api.operatePage('tap',s.token,0);assert.equal(r.diagnostic.phase,'native_action');assert.equal(r.actionAccepted,false);assert.equal(x.actions(),1);checks++;
// Only reread after a dispatched action; transient animation must never repeat the action.
x=setup({read:({reads,actions})=>actions&&reads<6?{error:'screen_changed'}:null});s=await x.api.prepareScreen(160);r=await x.api.operatePage('tap',s.token,0);assert(r.ok);assert.equal(x.actions(),1);assert(x.reads()>=6);checks++;
x=setup({read:({actions})=>actions?{error:'screen_changed'}:null});s=await x.api.prepareScreen(160);r=await x.api.operatePage('tap',s.token,0);assert.equal(r.error,'action_unverified');assert.equal(r.diagnostic.phase,'post_action_read');assert.equal(r.actionAccepted,true);assert.equal(x.actions(),1);assert.equal(x.reads(),11);checks++;
x=setup();s=await x.api.prepareScreen(160);await assert.rejects(()=>x.api.operatePage('tap',s.token,0,null,()=>{if(x.actions())throw Error('cancel');}),/cancel/);assert.equal(x.actions(),1);checks++;
// Existing source/runtime round trips must be reproducible and retain the original native guard.
assert(body.includes('before.fingerprint !== base.fingerprint'));assert(body.includes('N.tapElement(before.token, ref)'));checks++;
// Compose the actual shipped page bridge with the Meituan adapter, not a prepared-page stub.
async function integrated(opt={}){
 const y=adapterSetup(),c=y.c;let phase='home',query='',token=0,reads=0,launched=!opt.launch;const actions=[],opens=[];
 const node=(ref,text,extra={})=>({ref,text,parentRef:0,enabled:true,...extra});
 c.pageReady=()=>null;
 c.N={mcpCapabilities:()=>({pageSafety:2}),inspectScreen:()=>{
  reads++;if(!launched)return {ok:false,error:'not_meituan'};
  const nodes=[node(0,''),node(99,'外卖',{selected:true}),...(phase==='home'?[node(1,'搜索商家',{clickable:true})]:phase==='search'?[node(7,query,{editable:true}),node(8,'搜索',{clickable:true})]:[node(1,'',{clickable:true}),node(2,'测试商家',{parentRef:1,id:'poi_name'}),node(3,'月售100',{parentRef:1})])];
  if (actions.length && opt.returnHome) nodes.splice(1,nodes.length-1,node(1,'搜索商家',{clickable:true}));
  if (actions.length && opt.repeatHome) nodes.splice(2,nodes.length-2,node(1,'搜索商家',{clickable:true}));
  return {ok:true,pkg:actions.length && opt.switchApp?'com.sankuai.meituan.takeoutnew':'com.sankuai.meituan',snapshotSchema:2,fingerprint:phase+query+(opt.preflightChange&&reads===5?'changed':''),token:++token,nodes,truncated:false};
 },tapElement:(t,ref)=>{actions.push('tap:'+ref);phase=phase==='home'?'search':'results';return {ok:true,action:'tap'};},setText:(t,ref,v)=>{actions.push('text:'+v);query=v;return {ok:true,action:'set_text'};}};
 vm.runInNewContext(helpers+';globalThis.realBridge={inspectPage,prepareScreen,operatePage};',c);
 c.gysPh.mcp.inspectScreen=c.realBridge.inspectPage;c.gysPh.mcp.prepareScreen=c.realBridge.prepareScreen;
 c.gysPh.mcp.tapElement=(t,ref,check)=>c.realBridge.operatePage('tap',t,ref,null,check);
 c.gysPh.mcp.setText=(t,ref,v,check)=>c.realBridge.operatePage('text',t,ref,v,check);
 c.gysPh.__N.openApp=p=>{opens.push(p);launched=true;return true;};
 const r=await y.api.search({query:'测试搜索词'});return {r,actions,opens,reads};
}
let z=await integrated();assert(z.r.ok&&z.r.queryVerified);assert.deepEqual(z.actions,['tap:1','text:测试搜索词','tap:8']);checks++;
z=await integrated({launch:true});assert(z.r.ok);assert.equal(z.opens.length,1);assert.equal(z.actions.length,3);checks++;
z=await integrated({launch:true,preflightChange:true});assert.equal(z.r.error,'screen_changed');assert.equal(z.r.actionAccepted,true);assert.equal(z.r.diagnostic.stage,'open_search');assert.equal(z.r.diagnostic.bridgePhase,'preflight_changed');assert.equal(z.r.diagnostic.actionAcceptedThisStep,false);assert.equal(z.actions.length,0);checks++;
for (const [option,error] of [['switchApp','target_app_changed'],['returnHome','channel_unverified'],['repeatHome','action_unverified']]) {
 z=await integrated({[option]:true});assert.equal(z.r.error,error);assert.deepEqual(z.actions,['tap:1']);checks++;
}
console.log(checks+' page stability checks passed: source/runtime parity, bounded read-only waits, fresh-token preflight, diagnostic phases, cancellation, transient post-action read and no action replay');
