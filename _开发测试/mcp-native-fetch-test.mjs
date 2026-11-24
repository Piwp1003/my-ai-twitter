import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('js/01-core-state-infra.js','utf8');
const code=source.slice(source.indexOf('function plusNetRequest('),source.indexOf('// 浏览器出于安全考虑，',source.indexOf('function plusNetRequest(')));
let checks=0;
function setup(){
 let xhr,sent=0,aborts=0,fallback=0;
 class NativeXHR{constructor(){xhr=this;}open(){}setRequestHeader(){}send(){sent++;}abort(){aborts++;if(this.onabort)this.onabort();}reply(status,text){this.status=status;this.responseText=text;this.readyState=4;this.onreadystatechange();}}
 const c={window:null,plus:{net:{XMLHttpRequest:NativeXHR}},console:{error(){}},fetch:async(url,opts)=>{fallback++;if(opts.signal?.aborted){const e=Error('abort');e.name='AbortError';throw e;}return {ok:true,status:200,json:async()=>({fallback:true})};}};c.window=c;vm.runInNewContext(code,c);
 return {c,xhr:()=>xhr,sent:()=>sent,aborts:()=>aborts,fallback:()=>fallback};
}
let x=setup(),ctrl=new AbortController();let p=x.c.smartFetch('https://model.test',{signal:ctrl.signal});
ctrl.abort();await assert.rejects(p,{name:'AbortError'});assert.equal(x.aborts(),1);assert.equal(x.fallback(),0);checks++;
// A late native response cannot turn cancellation into success or start another request.
x.xhr().reply(200,'{}');assert.equal(x.fallback(),0);checks++;
x=setup();ctrl=new AbortController();ctrl.abort();await assert.rejects(x.c.smartFetch('https://model.test',{signal:ctrl.signal}),{name:'AbortError'});assert.equal(x.sent(),0);checks++;
for(const status of [400,401,403,429,500]){x=setup();p=x.c.smartFetch('https://model.test',{});x.xhr().reply(status,'{"error":{"message":"rejected"}}');const r=await p;assert.equal(r.ok,false);assert.equal(r.status,status);assert.equal((await r.json()).error.message,'rejected');assert.equal(x.fallback(),0);checks++;}
x=setup();p=x.c.smartFetch('https://model.test',{});x.xhr().onerror();assert((await p).ok);assert.equal(x.fallback(),1);checks++;
x=setup();p=x.c.smartFetch('https://model.test',{});x.xhr().reply(0,'');assert((await p).ok);assert.equal(x.fallback(),1);checks++;
x=setup();ctrl=new AbortController();p=x.c.smartFetch('https://model.test',{signal:ctrl.signal});x.xhr().reply(200,'{"ok":true}');assert.equal((await (await p).json()).ok,true);ctrl.abort();assert.equal(x.aborts(),0);checks++;
x=setup();p=x.c.smartFetch('https://model.test');x.xhr().reply(200,'{}');assert((await p).ok);checks++;
console.log(checks+' native network checks passed: abort, late response, no HTTP-error replay, transport fallback, cleanup');
