import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const src=fs.readFileSync('js/99-meituan-submit.js','utf8'),gateSrc=fs.readFileSync('js/99-mcp-execution.js','utf8');let checks=0;
function setup(opt={}){const data={},c={window:null,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]},CustomEvent:function(){},dispatchEvent(){},setTimeout:fn=>{fn();return 1;}};c.window=c;let requests=0,polls=0,cancelled=0,held=false;
 c.gysPh={__N:{orderSubmitState:()=>{polls++;return {ok:true,state:requests?(opt.state||'cancelled'):(opt.previous||'idle')};},requestOrderConfirmation:()=>{requests++;return opt.nativeError?{ok:false,error:opt.nativeError}:{ok:true,id:'native-1',state:'awaiting_confirmation'};},cancelOrderConfirmation:()=>{cancelled++;return true;}}};c.gyMcpTakeover=()=>held=true;
 vm.runInNewContext(gateSrc,c);vm.runInNewContext(src,c);return {c,api:c.gyMeituanSubmit,requests:()=>requests,held:()=>held,cancelled:()=>cancelled};}
const review={complete:true,manualPayment:true,submitRef:50,token:8,at:Date.now(),fingerprint:'abc'};
let x=setup();assert(!(await x.api.confirm(review,{isTrusted:false})).ok);assert.equal(x.requests(),0);checks++;
for(const change of [{complete:false},{manualPayment:false},{at:Date.now()-30001},{submitRef:null}]){x=setup();await x.api.confirm({...review,...change},{isTrusted:true});assert.equal(x.requests(),0);checks++;}
for(const state of ['cancelled','expired','not_sent','storage_failed']){x=setup({state});const r=await x.api.confirm(review,{isTrusted:true});assert.equal(r.state,state);assert.equal(x.requests(),1);assert(!x.c.gyMcpExecution.status().blocked);assert(!x.held());checks++;}
for(const state of ['submitted_unverified','unverified','attempted']){x=setup({state});const r=await x.api.confirm(review,{isTrusted:true});assert.equal(x.requests(),1);assert(x.c.gyMcpExecution.status().blocked);assert(x.held());await x.api.confirm(review,{isTrusted:true});assert.equal(x.requests(),1);checks++;}
x=setup({previous:'unverified'});await x.api.confirm(review,{isTrusted:true});assert.equal(x.requests(),0);checks++;
x=setup({nativeError:'stale_snapshot'});await x.api.confirm(review,{isTrusted:true});assert.equal(x.requests(),1);assert(!x.c.gyMcpExecution.status().blocked);checks++;
x=setup({nativeError:'previous_submit_unresolved'});await x.api.confirm(review,{isTrusted:true});assert(x.c.gyMcpExecution.status().blocked);checks++;
x=setup();x.c.gyMcpExecution.takeover();await x.api.confirm(review,{isTrusted:true});assert.equal(x.requests(),0);checks++;
x=setup();const pending=x.api.confirm(review,{isTrusted:true});const duplicate=await x.api.confirm(review,{isTrusted:true});assert(duplicate.message.includes('不重复'));await pending;assert.equal(x.requests(),1);checks++;
x=setup();let release;const nativeRequest=x.c.gysPh.__N.requestOrderConfirmation;x.c.gysPh.__N.requestOrderConfirmation=()=>{nativeRequest();return new Promise(r=>release=r);};const inProgress=x.api.confirm(review,{isTrusted:true});for(let i=0;i<30;i++)await Promise.resolve();x.api.invalidate();assert.equal(x.cancelled(),1);release({ok:true,id:'native-1',state:'awaiting_confirmation'});await inProgress;assert.equal(x.requests(),1);checks++;
console.log(checks+' local confirmation/one-attempt checks passed');
