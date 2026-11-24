import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const src=fs.readFileSync('js/99-meituan-checkout.js','utf8');let n=0;
export function snapshot(){const N=(ref,text,id,parentRef=0,extra={})=>({ref,text,id,enabled:true,parentRef,...extra});return {ok:true,pkg:'com.sankuai.meituan',snapshotSchema:2,fingerprint:'checkout-v1',token:8,nodes:[N(0,'','root',-1),N(1,'确认订单','page'),N(2,'面馆','checkout_shop_name'),N(3,'上海市示例路12号','checkout_address'),N(4,'张某','checkout_contact_name'),N(5,'13800138000','checkout_contact_phone'),N(6,'预计12:30送达','checkout_delivery_time'),N(7,'美团配送','checkout_delivery_method'),N(10,'','row'),N(11,'牛肉面','checkout_item_name',10),N(12,'2','checkout_item_quantity',10),N(13,'大份','checkout_item_specs',10),N(14,'¥20.00','checkout_item_amount',10),N(20,'20.00','checkout_subtotal'),N(21,'3.00','checkout_delivery_fee'),N(22,'1.00','checkout_packaging_fee'),N(23,'-2.00','checkout_discount'),N(24,'22.00','checkout_total'),N(25,'2','checkout_total_quantity'),N(50,'提交订单','submit',0,{clickable:true})]};}
export const expected={store:'面馆',items:[{name:'牛肉面',specs:['大份'],quantity:2}]};
export function setup(opt={}){const c={window:null};c.window=c;let actions=0;const snap=opt.snapshot||snapshot();
 c.gysPh={mcp:{capabilities:()=>({readPermission:opt.denied?'no':'auto',native:{pageSafety:2}}),inspectScreen:()=>opt.checkoutInitially?snap:{ok:true,token:7,nodes:[{ref:2,text:'去结算',clickable:true,enabled:true}],fingerprint:'cart',snapshotSchema:2},tapElement:(token,ref,check)=>{if(check)check();actions++;assert.equal(ref,2);return opt.fail?{ok:false}:{ok:true,snapshot:snap,actionAccepted:true};}}};
 c.gyMeituan={classify:()=>({page:'store',titles:['面馆']})};c.gyMeituanCart={parseCart:()=>expected.items};vm.runInNewContext(src,c);return {c,api:c.gyMeituanCheckout,actions:()=>actions};}
function ok(v){assert(v);n++;}
const x=setup(),s=snapshot();let r=x.api.parse(s,expected);ok(r.complete&&r.fees.total===2200&&r.fees.discount===200);ok(r.countMatches&&r.itemAmountsMatch&&r.feeEquation&&r.cartMatches);
for(const [input,want] of [['¥0.10',10],['￥2.01元',201],['-0.50',-50],['1,000',null],['约20元',null],['1.001',null],['配送费3元',null],['99999999',null]])ok(x.api.money(input)===want);
function changed(id,value){const s=snapshot();s.nodes.find(n=>n.id===id).text=value;return s;}
ok(!x.api.parse(changed('checkout_total','23.00'),expected).complete);ok(x.api.parse(changed('checkout_total','23.00'),expected).feeEquation===false);
ok(!x.api.parse(changed('checkout_item_amount','19.99'),expected).itemAmountsMatch);
ok(!x.api.parse(changed('checkout_total_quantity','3'),expected).countMatches);
ok(!x.api.parse(changed('checkout_item_quantity','3'),expected).cartMatches);
ok(!x.api.parse(changed('checkout_item_specs','小份'),expected).cartMatches);
ok(!x.api.parse(s,null).complete);
for(const id of ['checkout_packaging_fee','checkout_discount','checkout_address','checkout_contact_phone','checkout_item_specs']){const missing=snapshot();missing.nodes=missing.nodes.filter(n=>n.id!==id);ok(!x.api.parse(missing,expected).complete);}
ok(!x.api.parse(changed('checkout_contact_phone','请选择电话'),expected).complete);
let extra=snapshot();extra.nodes.push({...extra.nodes.find(n=>n.id==='checkout_discount'),ref:90});ok(x.api.parse(extra,expected).fees.discount===null);
extra=snapshot();extra.nodes.push({ref:90,parentRef:0,id:'checkout_service_fee',text:'1元'});ok(x.api.parse(extra,expected).missing.includes('存在未识别的费用项'));
extra=snapshot();extra.nodes.push({ref:90,parentRef:0,text:'会员红包套餐',selected:true});ok(x.api.parse(extra,expected).missing.includes('存在已选增值服务'));
extra=snapshot();extra.truncated=true;ok(!x.api.parse(extra,expected).complete);
extra=snapshot();extra.nodes.push({ref:90,text:'确认支付'});ok(x.api.parse(extra,expected).error==='human_required');
extra=snapshot();extra.nodes=extra.nodes.filter(n=>n.text!=='提交订单');ok(x.api.parse(extra,expected).error==='not_checkout');
r=await x.api.prepare({store:'面馆'});ok(r.ok&&r.complete&&r.actionAccepted);ok(x.actions()===1);const remote=JSON.stringify(r);ok(!remote.includes('上海市示例路12号')&&!remote.includes('13800138000')&&!remote.includes('张某'));ok(r.note.includes('未下单未付款'));
const denied=setup({denied:true});ok((await denied.api.prepare({store:'面馆'})).error==='permission_required');ok(denied.actions()===0);
const wrong=setup();ok((await wrong.api.prepare({store:'别的店'})).error==='cart_unverified');ok(wrong.actions()===0);
const fail=setup({fail:true});ok((await fail.api.prepare({store:'面馆'})).error==='navigation_unverified');ok(fail.actions()===1);
await assert.rejects(()=>setup().api.prepare({store:'面馆'},()=>{throw Object.assign(Error('cancel'),{gyMcpStopped:true});}),/cancel/);n++;
ok(!x.api.parse(changed('checkout_address','路'.repeat(300)),expected).complete);
extra=snapshot();extra.token=0;ok(x.api.parse(extra,expected).error==='page_unavailable');
const delayed=setup({checkoutInitially:true});delayed.c.document={getElementById:()=>null};let release;delayed.c.gysPh.mcp.inspectScreen=()=>new Promise(resolve=>release=resolve);const reading=delayed.api.read({});await Promise.resolve();delayed.api.invalidate();release(snapshot());ok((await reading).error==='stale_review');
ok(!x.api.parse(snapshot(),expected).manualPayment);extra=snapshot();extra.nodes.push({ref:70,parentRef:0,id:'checkout_payment_mode',text:'手动支付'});ok(x.api.parse(extra,expected).manualPayment);extra.nodes[extra.nodes.length-1].text='免密支付';ok(!x.api.parse(extra,expected).manualPayment);extra.nodes[extra.nodes.length-1].text='手动支付';extra.nodes.push({ref:71,text:'已开通自动扣款'});ok(!x.api.parse(extra,expected).manualPayment);
console.log(n+' checkout parsing/navigation/privacy checks passed');
