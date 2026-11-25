import fs from 'node:fs';
import assert from 'node:assert/strict';
import {setup} from './mcp-meituan-test.mjs';
const fixture=JSON.parse(fs.readFileSync('_开发测试/fixtures/meituan-main-takeout-header-v330.json','utf8'));
const MAIN='com.sankuai.meituan';let checks=0;
const observed=()=>({ok:true,pkg:fixture.pkg,snapshotSchema:2,fingerprint:'observed-header',token:1,truncated:false,nodes:fixture.nodes.map(n=>({...n,text:n.semantic==='other'?'':n.semantic}))});
const node=(ref,parentRef,text,extra={})=>({ref,parentRef,text,enabled:true,...extra});
const resource=(s,key)=>s.nodes.find(n=>n.id===MAIN+':id/'+key);
const x=setup();let s=observed(),info=x.api.classify(s);
assert.equal(s.nodes.length,116);assert.equal(info.page,'home');assert.equal(info.entry,100);assert.equal(info.submit,103);assert.equal(info.takeout,null);checks++;
// Replay the real structure using fixed semantics only. No address/recommendation/query is in the fixture.
assert(fixture.nodes.every(n=>!('text'in n)&&!('desc'in n)&&['other','外卖','搜索','美团外卖'].includes(n.semantic)));checks++;
async function flow(screen,opts={}){
 const y=setup(),actions=[],opens=[];let phase=opts.launch?-1:0,typed='',seq=0;
 const expected=resource(screen,'homepage_search_icon').parentRef;
 const snapshot=()=>phase<0?{ok:false,error:'not_meituan'}:phase===0?{...screen,token:++seq}:({ok:true,pkg:MAIN,snapshotSchema:2,token:++seq,fingerprint:'next'+phase+typed,nodes:phase===1?[node(0,-1,''),node(7,0,typed,{editable:true,id:'search_input'}),node(8,0,'搜索',{clickable:true})]:[node(0,-1,''),node(1,0,'',{clickable:true}),node(2,1,'测试商家',{id:'poi_name'}),node(3,1,'月售100')],truncated:false});
 y.c.gysPh.__N.openApp=p=>{opens.push(p);phase=0;return true;};
 y.c.gysPh.mcp.inspectScreen=snapshot;
 y.c.gysPh.mcp.tapElement=(token,ref)=>{actions.push('tap:'+ref);assert.equal(ref,phase===0?expected:8);if(opts.fail)return {ok:false,error:'screen_changed',actionAccepted:true};phase++;return {ok:true,actionAccepted:true,snapshot:snapshot()};};
 y.c.gysPh.mcp.setText=(token,ref,text)=>{assert.equal(ref,7);typed=text;actions.push('text:'+text);return {ok:true,actionAccepted:true,snapshot:snapshot()};};
 const r=await y.api.search({query:'测试搜索词'},opts.cancel?()=>{if(actions.length)throw Error('cancelled');}:undefined);
 return {r,actions,opens};
}
let f=await flow(observed());assert(f.r.ok&&f.r.queryVerified);assert.deepEqual(f.actions,['tap:100','text:测试搜索词','tap:8']);assert.deepEqual(f.opens,[]);checks++;
f=await flow(observed(),{launch:true});assert(f.r.ok);assert.deepEqual(f.opens,[MAIN]);assert.equal(f.actions[0],'tap:100');checks++;
// Ref numbers and obfuscated container IDs are never hardcoded in the adapter.
s=observed();s.nodes=s.nodes.map(n=>({...n,ref:n.ref*3+17,parentRef:n.parentRef<0?-1:n.parentRef*3+17,id:/\/(?:wla|l3v|k5n)$/.test(n.id)?'':n.id}));
f=await flow(s);assert(f.r.ok);assert.equal(f.actions[0],'tap:317');checks++;
for(const key of ['self_pick_waimai_channel_icon','btn_homepage','btn_self_pick_select','wm_page_view_capsule_msg_center_container']){
 s=observed();resource(s,key).id='';f=await flow(s);assert.equal(f.r.error,'channel_unverified',key);assert.equal(f.actions.length,0);checks++;
}
for(const mutate of [s=>{s.truncated=true;},s=>{resource(s,'self_pick_waimai_channel_icon').text='其他';},s=>{resource(s,'btn_self_pick_select').parentRef=0;},s=>{resource(s,'wm_page_view_capsule_msg_center_container').parentRef=0;},s=>{resource(s,'btn_homepage').enabled=false;},s=>{const n=resource(s,'self_pick_waimai_channel_icon');s.nodes.push({...n,ref:1000});}]){
 s=observed();mutate(s);f=await flow(s);assert.equal(f.r.error,'channel_unverified');assert.equal(f.actions.length,0);checks++;
}
s=observed();s.nodes.push(...s.nodes.filter(n=>n.ref===90||n.parentRef===90).map(n=>({...n,ref:n.ref+1000,parentRef:n.parentRef===90?1090:-1})));f=await flow(s);assert.equal(f.r.error,'channel_unverified');assert.equal(f.actions.length,0);checks++;
// A malformed composite must not fall back to tapping the separate recommendation search button.
for(const mutate of [
 s=>{s.nodes.push(node(1000,100,'其他操作',{clickable:true}));},
 s=>{s.nodes.push(node(1000,100,'',{editable:true}));},
 s=>{s.nodes.find(n=>n.ref===100).scrollable=true;},
 s=>{resource(s,'homepage_search_icon').parentRef=90;},
 s=>{s.nodes.push({...resource(s,'homepage_search_icon'),ref:1000});},
 s=>{s.nodes.find(n=>n.ref===103).text='其他按钮';},
 s=>{for(let i=0;i<4;i++)s.nodes.push(node(1000+i,100,''));}
]){
 s=observed();mutate(s);f=await flow(s);assert.equal(f.r.error,'unknown_layout');assert.equal(f.actions.length,0);checks++;
}
// Generic main-page search icons without the complete takeout header cannot grant channel evidence.
s=observed();s.nodes=s.nodes.filter(n=>n.ref>=100&&n.ref<=103);f=await flow(s);assert.equal(f.r.error,'channel_unverified');assert.equal(f.actions.length,0);checks++;
f=await flow(observed(),{fail:true});assert.equal(f.r.error,'screen_changed');assert.deepEqual(f.actions,['tap:100']);checks++;
await assert.rejects(()=>flow(observed(),{cancel:true}),/cancelled/);checks++;
console.log(checks+' observed-header checks passed: redacted 116-node replay, combined channel evidence, precise composite field, exact query, launch/ref remap, incomplete/ambiguous/truncated/unsafe layouts, no button fallback or replay');
