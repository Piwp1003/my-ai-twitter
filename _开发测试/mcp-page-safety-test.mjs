import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('js/61-soft.js','utf8'),m=source.match(/new Function\('X', 'applyMacros', ("\/\* 📲 真手机(?:[^"\\]|\\.)*")\)/),body=JSON.parse(m[1]);
new Function('X','applyMacros',body);
const invalidate=body.match(/invalidateSnapshots\(\) \{([^}]+)\}/)[1];
const helpers=body.slice(body.indexOf('function pageResult('),body.indexOf('P.mcp = {'));
function setup(opt={}){
 let seq=0,clock=100000,actions=0,reads=0,fp='before',permission=false;const RealDate=Date;class Clock extends RealDate{static now(){return clock;}}
 const N={mcpCapabilities:()=>({pageSafety:opt.old?1:2}),inspectScreen:()=>{reads++;return opt.inspectError&&actions?{ok:false,error:'not_meituan'}:{ok:true,token:++seq,pkg:'com.sankuai.meituan',snapshotSchema:2,fingerprint:fp,nodes:[{ref:0,id:'search',text:fp,enabled:true,editable:true}]};}};
 const act=()=>{actions++;if(!opt.same)fp='after';if(opt.permission)permission=true;return opt.reject?{ok:false,error:'unsafe_action'}:{ok:true,action:'tap'};};
 Object.assign(N,{tapElement:act,setText:act,scrollSnapshot:act,backSnapshot:act});
 const c={N,Date:Clock,Map,Number,JSON,pageReady:()=>permission?{err:'permission changed'}:null,setTimeout:fn=>{clock+=200;fn();}};
 vm.runInNewContext(helpers+';globalThis.api={inspectPage,operatePage,invalidate:function(){'+invalidate+'}};',c);
 return {api:c.api,actions:()=>actions,reads:()=>reads,change:()=>fp='changed',expire:()=>clock+=30001,check:()=>{if(actions)throw Error('cancelled');}};
}
let n=0;function ok(v){assert(v);n++;}
for(const action of ['tap','text','scroll','back']){const x=setup(),s=x.api.inspectPage(80);const r=await x.api.operatePage(action,s.token,0,action==='scroll'?1:'面条');ok(r.ok&&r.actionAccepted&&r.verification==='page_changed');ok(r.snapshot.token>s.token&&x.actions()===1);const replay=await x.api.operatePage('tap',s.token,0);ok(!replay.ok&&x.actions()===1);}
let x=setup(),s=x.api.inspectPage(80);x.api.inspectPage(80);ok((await x.api.operatePage('tap',s.token,0)).error==='stale_snapshot');ok(x.actions()===0);
x=setup();s=x.api.inspectPage(80);x.expire();ok((await x.api.operatePage('tap',s.token,0)).error==='stale_snapshot');
x=setup();s=x.api.inspectPage(80);x.change();ok((await x.api.operatePage('tap',s.token,0)).error==='screen_changed');ok(x.actions()===0);
x=setup({same:true});s=x.api.inspectPage(80);const r=await x.api.operatePage('tap',s.token,0);ok(r.error==='action_unverified'&&r.actionAccepted);ok(x.actions()===1);
x=setup({old:true});s=x.api.inspectPage(80);ok((await x.api.operatePage('tap',s.token,0)).error==='plugin_update_required');ok(x.actions()===0);
x=setup({reject:true});s=x.api.inspectPage(80);ok((await x.api.operatePage('tap',s.token,0)).error==='unsafe_action');
x=setup({inspectError:true});s=x.api.inspectPage(80);ok((await x.api.operatePage('tap',s.token,0)).error==='action_unverified');
x=setup({permission:true});s=x.api.inspectPage(80);ok((await x.api.operatePage('tap',s.token,0)).error==='action_unverified');
x=setup();s=x.api.inspectPage(80);await assert.rejects(()=>x.api.operatePage('tap',s.token,0,null,x.check),/cancelled/);ok(x.reads()===2);
x=setup();s=x.api.inspectPage(80);ok((await x.api.operatePage('scroll',s.token,null,0)).error==='bad_direction');ok((await x.api.operatePage('tap',s.token,-1)).error==='bad_ref');ok((await x.api.operatePage('back',null)).error==='bad_snapshot');
x=setup();s=x.api.inspectPage(80);x.api.invalidate();ok((await x.api.operatePage('tap',s.token,0)).error==='stale_snapshot');ok(x.actions()===0);
console.log(n+' page preflight/readback checks passed');
