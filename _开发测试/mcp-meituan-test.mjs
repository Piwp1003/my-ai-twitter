import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('js/99-meituan.js','utf8');let count=0;
export function setup(opt={}){
 let state=opt.initial||'home',seq=0,query='',actions=[],opened=0;
 const node=(ref,text,extra={})=>({ref,text,enabled:true,parentRef:0,...extra});
 const rows=()=>[node(0,''),node(1,'',{parentRef:0,clickable:true}),node(2,'面馆',{parentRef:1,id:'poi_name'}),node(3,'月售100',{parentRef:1}),node(4,'配送费2元',{parentRef:1})];
 const snapshot=()=>({ok:true,pkg:'com.sankuai.meituan',snapshotSchema:2,fingerprint:state+query,token:++seq,nodes:state==='results'?rows():state==='store'?[node(0,''),node(1,opt.wrongStore?'别的店':'面馆',{id:'shop_name'}),node(2,'点菜'),node(3,'评价')]:state==='search'?[node(0,''),node(1,query,{editable:true,id:'input'}),node(2,'搜索',{clickable:true})]:state==='login'?[node(0,'立即登录')]:state==='unknown'?[node(0,'广告')]:[node(0,''),node(1,'搜索商家',{clickable:true})]});
 const action=(name,token,ref,value,check)=>{if(check)check();actions.push(name);if(opt.fail)return {ok:false,error:'action_unverified',actionAccepted:true,err:'未确认'};if(name==='text')query=value;else if(state==='home')state='search';else if(state==='search')state='results';else if(state==='results')state='store';return {ok:true,actionAccepted:true,snapshot:snapshot()};};
 const bridge={capabilities:()=>({mode:'plugin',featureEnabled:true,readPermission:opt.denied?'no':'auto',native:{pageSafety:2}}),inspectScreen:()=>state==='outside'?{ok:false,error:'not_meituan'}:snapshot(),setText:(t,r,v,c)=>action('text',t,r,v,c),tapElement:(t,r,c)=>action('tap',t,r,null,c)};
 const c={window:null,gysPh:{mcp:bridge,__N:{apps:()=>opt.noApp?[]:[{pkg:'com.sankuai.meituan.takeoutnew'}],openApp:()=>{opened++;state='home';return true;}}},setTimeout:fn=>fn()};c.window=c;vm.runInNewContext(source,c);
 return {c,api:c.gyMeituan,actions:()=>actions,opened:()=>opened,change:v=>state=v,snapshot};
}
function ok(v){assert(v);count++;}
let x=setup();let r=await x.api.search({query:'面条'});ok(r.ok&&r.page==='results');ok(r.stores[0].name==='面馆'&&r.stores[0].ref===1);ok(x.actions().join(',')==='tap,text,tap');
let selected=await x.api.chooseStore({token:r.token,ref:1,name:'面馆'});ok(selected.ok&&selected.page==='store');ok(x.actions().length===4);
ok(!(await x.api.chooseStore({token:r.token,ref:1,name:'面馆'})).ok);ok(x.actions().length===4);
x=setup({initial:'outside'});r=await x.api.search({query:'面条'});ok(r.ok&&x.opened()===1);
x=setup({initial:'outside',noApp:true});ok((await x.api.search({query:'面条'})).error==='app_missing');ok(x.actions().length===0);
x=setup({initial:'results'});ok((await x.api.search({query:'新词'})).error==='query_unverified');ok(x.actions().length===0);
x=setup({initial:'login'});ok((await x.api.search({query:'面条'})).error==='human_required');ok(x.actions().length===0);
x=setup({initial:'unknown'});ok((await x.api.search({query:'面条'})).error==='unknown_layout');
x=setup({denied:true});ok((await x.api.search({query:'面条'})).error==='permission_required');ok(x.actions().length===0);
x=setup({fail:true});ok((await x.api.search({query:'面条'})).error==='action_unverified');ok(x.actions().length===1);
x=setup();r=await x.api.search({query:'面条'});ok((await x.api.chooseStore({token:r.token,ref:1,name:'虚构店'})).error==='store_not_identified');ok(x.actions().length===3);
x.change('unknown');ok((await x.api.chooseStore({token:r.token,ref:1,name:'面馆'})).error==='screen_changed');ok(x.actions().length===3);
x=setup({wrongStore:true});r=await x.api.search({query:'面条'});ok((await x.api.chooseStore({token:r.token,ref:1,name:'面馆'})).error==='store_unverified');ok(x.actions().length===4);
x=setup();ok((await x.api.search({query:' '})).error==='bad_query');await assert.rejects(()=>x.api.search({query:'面条'},()=>{throw Error('cancelled');}),/cancelled/);ok(x.actions().length===0);
const malformed=x.snapshot();malformed.nodes=[{ref:0,text:'面馆',id:'poi_name',enabled:true,clickable:true}];ok(x.api.classify(malformed).stores.length===0);
x=setup();r=await x.api.search({query:'面条'});x.api.invalidate();ok((await x.api.chooseStore({token:r.token,ref:1,name:'面馆'})).error==='stale_snapshot');ok(x.actions().length===3);
console.log(count+' Meituan search/store checks passed');
