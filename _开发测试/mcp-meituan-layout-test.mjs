import assert from 'node:assert/strict';import {setup} from './mcp-meituan-test.mjs';
const x=setup(),node=(ref,parentRef,text,extra={})=>({ref,parentRef,text,enabled:true,...extra});
const snap=nodes=>({ok:true,pkg:'com.sankuai.meituan.takeoutnew',snapshotSchema:2,fingerprint:'layout',token:1,nodes});let checks=0;
let nodes=[node(0,-1,''),node(1,0,'',{clickable:true,id:'wm_search_box'}),node(2,1,'某家推荐店铺'),node(3,0,'',{clickable:true}),node(4,3,'搜索')];
let r=x.api.classify(snap(nodes));assert.equal(r.page,'home');assert.equal(r.entry,1);assert.equal(r.submit,3);checks++;
// Search page with a nonclickable text child inside the submit button.
r=x.api.classify(snap([node(0,-1,''),node(1,0,'',{editable:true,id:'search_input'}),node(2,0,'',{clickable:true}),node(3,2,'搜索')]));assert.equal(r.page,'search');assert.equal(r.input,1);assert.equal(r.submit,2);checks++;
// A recognized description is valid even if visible text is a recommendation.
r=x.api.classify(snap([node(0,-1,''),node(1,0,'推荐词',{desc:'搜索商家、商品',clickable:true})]));assert.equal(r.entry,1);checks++;
// Plain text inside a small clickable parent, duplicate label evidence deduplicated to the same target.
r=x.api.classify(snap([node(0,-1,''),node(1,0,'',{clickable:true}),node(2,1,'搜索商家'),node(3,1,'',{desc:'搜索商家'})]));assert.equal(r.entry,1);assert.equal(r.diagnostics.entryCount,1);checks++;
// No guessed first match when there are two distinct search fields.
r=x.api.classify(snap([...nodes,node(5,0,'',{clickable:true,id:'search_bar'}),node(6,5,'其他推荐词')]));assert.equal(r.page,'unknown');assert.equal(r.entry,null);checks++;
// Whole-page, payment-containing, and nested-action parents cannot be chosen from a child label.
for(const tree of [[node(0,-1,'',{clickable:true}),node(1,0,'搜索商家')],[node(0,-1,''),node(1,0,'',{clickable:true}),node(2,1,'搜索商家'),node(3,1,'立即支付')],[node(0,-1,''),node(1,0,'',{clickable:true}),node(2,1,'搜索商家'),node(3,1,'其他按钮',{clickable:true})]]){assert(['unknown','human_required'].includes(x.api.classify(snap(tree)).page));checks++;}
// Resource name containing unrelated "research" is not a search control.
assert.equal(x.api.classify(snap([node(0,-1,''),node(1,0,'文章',{id:'research_container',clickable:true})])).page,'unknown');checks++;
// Unknown layout diagnostics contain no recommendation, address, or entered text.
const unknown=snap([node(0,-1,''),node(1,0,'私人地址 13800000000',{editable:true,id:'search_input'})]);
x.c.gysPh.mcp.inspectScreen=()=>unknown;r=await x.api.search({query:'面条'});assert.equal(r.error,'unknown_layout');assert.equal(x.actions().length,0);assert.equal(r.diagnostic.editableCount,1);assert.equal(r.diagnostic.submitCount,0);assert(!JSON.stringify(r.diagnostic).includes('13800000000'));assert.equal(r.diagnostic.stage,'search_step_0');checks++;
// Full search flow: recommendations are never used as the user's query, and parent refs are the actual action targets.
const y=setup();let phase=0,typed='',seq=0;const actions=[];
const screen=()=>({...snap(phase===0?nodes:phase<3?[node(0,-1,''),node(7,0,typed,{editable:true,id:'search_input'}),node(8,0,'',{clickable:true}),node(9,8,'搜索')]:[node(0,-1,''),node(1,0,'',{clickable:true}),node(2,1,'测试店铺',{id:'poi_name'}),node(3,1,'月售100')]),token:++seq,fingerprint:'phase'+phase+typed});
y.c.gysPh.mcp.inspectScreen=()=>screen();
y.c.gysPh.mcp.tapElement=(token,ref)=>{actions.push('tap:'+ref);if(phase===0){assert.equal(ref,1);phase=1;}else{assert.equal(ref,8);assert.equal(typed,'面条');phase=3;}return {ok:true,actionAccepted:true,snapshot:screen()};};
y.c.gysPh.mcp.setText=(token,ref,text)=>{assert.equal(ref,7);typed=text;phase=2;actions.push('text:'+ref+':'+text);return {ok:true,actionAccepted:true,snapshot:screen()};};
r=await y.api.search({query:'面条'});assert.equal(r.page,'results');assert.equal(r.query,'面条');assert.equal(actions.join(','),'tap:1,text:7:面条,tap:8');checks++;
console.log(checks+' layout checks passed: recommendation → field → exact user query → parent submit → results, ambiguity/protected controls and private metadata');
