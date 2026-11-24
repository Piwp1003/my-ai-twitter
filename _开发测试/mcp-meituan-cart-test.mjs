import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const browserSrc=fs.readFileSync('js/99-meituan.js','utf8'),src=fs.readFileSync('js/99-meituan-cart.js','utf8');let n=0;
export function setup(opt={}){
 let state='menu',seq=0,qty=opt.baseline||0,chosen=opt.default?'小份':null,addClicks=0,actions=[];
 const N=(ref,text,extra={})=>({ref,text,enabled:true,parentRef:0,...extra});
 const snapshot=()=>{let nodes=[N(0,'',{parentRef:-1}),N(1,'面馆',{id:'shop_name'}),N(2,'点菜'),N(3,'评价'),N(10,''),N(11,'牛肉面',{id:'food_name',parentRef:10}),N(12,opt.simple?'加购':'选规格',{parentRef:10,clickable:true})];
  if(opt.duplicate)nodes.push(N(13,''),N(14,'牛肉面',{id:'food_name2',parentRef:13}),N(15,'加购',{parentRef:13,clickable:true}));
  if(state==='menu')nodes.push(N(20,'购物车',{clickable:true}));
  if(state==='cart'){nodes.push(N(20,'关闭购物车',{clickable:true}));if(qty){nodes.push(N(30,''),N(31,'牛肉面',{id:'cart_food_name',parentRef:30}),N(32,String(qty),{id:'cart_quantity',parentRef:30}),N(34,String(qty+(opt.hidden?2:0)),{id:'cart_total_count'}));if(!opt.simple)nodes.push(N(33,opt.wrongSpec?'小份':(chosen||'大份'),{id:'cart_spec',parentRef:30}));}else nodes.push(N(40,'购物车为空'));}
  if(state==='specs')nodes.push(N(39,''),N(40,opt.multi?'规格（必选，多选）':opt.optional?'规格（可选，单选）':'规格（必选，单选）',{id:'spec_group_title',parentRef:39}),N(41,'大份',{id:'spec_option',parentRef:39,checkable:true,checked:chosen==='大份',selected:chosen==='大份',clickable:true,enabled:!opt.soldout,cls:'RadioButton'}),N(42,'小份',{id:'spec_option',parentRef:39,checkable:true,checked:chosen==='小份',selected:chosen==='小份',clickable:true,cls:'RadioButton'}),N(45,'加入购物车',{clickable:true}),N(46,'关闭规格',{clickable:true}));
  if(opt.missingFlags)for(const node of nodes){delete node.checked;delete node.selected;}
  return {ok:true,pkg:'com.sankuai.meituan',snapshotSchema:2,fingerprint:state+qty+chosen,token:++seq,nodes,truncated:!!opt.truncated};};
 const add=()=>{addClicks++;if(!opt.noIncrement)qty+=opt.overIncrement?2:1;state='menu';};
 const c={window:null,gysPh:{mcp:{capabilities:()=>({readPermission:opt.denied?'no':'auto',native:{pageSafety:2}}),inspectScreen:snapshot,tapElement:(token,ref,check)=>{if(check)check();actions.push(ref);if(opt.fail)return {ok:false,error:'action_unverified',actionAccepted:true};if(ref===20)state=state==='cart'?'menu':'cart';else if(ref===12){if(opt.simple)add();else state='specs';}else if(ref===41)chosen='大份';else if(ref===42)chosen='小份';else if(ref===46)state='menu';else if(ref===45)add();return {ok:true,actionAccepted:true,snapshot:snapshot()};}}}};c.window=c;vm.runInNewContext(browserSrc,c);vm.runInNewContext(src,c);
 return {c,api:c.gyMeituanCart,snapshot,addClicks:()=>addClicks,actions:()=>actions,change:()=>qty++,args:list=>({token:list.token,ref:list.items[0].ref,name:'牛肉面',store:'面馆',quantity:1,specs:opt.simple?[]:[{group:'规格',option:'大份'}]})};
}
function ok(v){assert(v);n++;}
let x=setup();let menu=await x.api.list({});ok(menu.ok&&menu.items[0].kind==='specs');const options=await x.api.options(x.args(menu));ok(options.ok&&options.groups[0].required&&options.groups[0].options[0].name==='大份');let result=await x.api.add({...x.args(options),quantity:2});ok(result.ok&&result.beforeQuantity===0&&result.afterQuantity===2&&result.verifiedAdded===2);ok(x.addClicks()===2);
ok(!(await x.api.add(x.args(options))).ok);ok(x.addClicks()===2);
x=setup({simple:true,baseline:2});menu=await x.api.list({});result=await x.api.add(x.args(menu));ok(result.ok&&result.beforeQuantity===2&&result.afterQuantity===3);ok(x.addClicks()===1);
for(const opt of [{noIncrement:true},{overIncrement:true},{wrongSpec:true}]){x=setup(opt);menu=await x.api.list({});result=await x.api.add(x.args(menu));ok(!result.ok&&result.error==='quantity_unverified');ok(x.addClicks()===1&&result.verifiedAdded===0);}
for(const opt of [{multi:true},{soldout:true}]){x=setup(opt);menu=await x.api.list({});result=await x.api.add(x.args(menu));ok(!result.ok);ok(x.addClicks()===0);}
x=setup();menu=await x.api.list({});result=await x.api.add({...x.args(menu),specs:[]});ok(result.error==='missing_specs');ok(x.addClicks()===0);
x=setup({duplicate:true});menu=await x.api.list({});result=await x.api.add(x.args(menu));ok(result.error==='ambiguous_item');ok(x.actions().length===0);
x=setup({baseline:1,hidden:true});menu=await x.api.list({});result=await x.api.add(x.args(menu));ok(result.error==='cart_unverified');ok(x.addClicks()===0);
x=setup();menu=await x.api.list({});x.change();result=await x.api.add(x.args(menu));ok(result.error==='screen_changed');ok(x.addClicks()===0);
x=setup({denied:true});menu=await x.api.list({});result=await x.api.add(x.args(menu));ok(result.error==='permission_required');ok(x.actions().length===0);
x=setup();menu=await x.api.list({});for(const quantity of [0,6,1.5,'1']){ok((await x.api.add({...x.args(menu),quantity})).error==='bad_quantity');}
x=setup({truncated:true});ok(!(await x.api.list({})).ok);
x=setup();menu=await x.api.list({});await assert.rejects(()=>x.api.add(x.args(menu),()=>{throw Object.assign(Error('cancel'),{gyMcpStopped:true});}),/cancel/);ok(x.actions().length===0);
x=setup({default:true,optional:true});menu=await x.api.list({});result=await x.api.add({...x.args(menu),specs:[]});ok(result.error==='unspecified_default');ok(x.addClicks()===0);
x=setup({missingFlags:true});menu=await x.api.list({});result=await x.api.add(x.args(menu));ok(result.error==='unknown_specs');ok(x.addClicks()===0);
x=setup();menu=await x.api.list({});await assert.rejects(()=>x.api.add({...x.args(menu),quantity:2},()=>{if(x.addClicks())throw Object.assign(Error('cancel in flight'),{gyMcpStopped:true});}),/cancel in flight/);ok(x.addClicks()===1);
x=setup();menu=await x.api.list({});x.api.invalidate();result=await x.api.add(x.args(menu));ok(result.error==='stale_snapshot');ok(x.actions().length===0);
console.log(n+' item/spec/cart checks passed');
