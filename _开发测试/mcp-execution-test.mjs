import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const src=fs.readFileSync('js/99-mcp-execution.js','utf8');let n=0;
function load(data={},fail=false){const c={window:null,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>{if(fail)throw Error('quota');data[k]=v;},removeItem:k=>{if(fail)throw Error('quota');delete data[k];}},dispatchEvent(){},CustomEvent:function(){}};c.window=c;vm.runInNewContext(src,c);return c.gyMcpExecution;}
const data={},g=load(data);await g.acquire('a');let ready=false;const b=g.acquire('b').then(()=>ready=true);await Promise.resolve();assert(!ready);n++;
g.begin('a');g.release('a');assert.equal(g.status().owner,'a');assert.equal(g.status().pending,1);n++;
g.settle('a',true);await b;assert(ready);assert.equal(g.status().owner,'b');n++;
g.release('b');assert.equal(g.status().owner,null);n++;
assert(g.claim('message:1'));assert(!g.claim('message:1'));assert(!load(data).claim('message:1'));assert(load(data).claim('message:2'));n++;
await g.acquire('a');g.begin('a');assert(load(data).status().blocked);n++;g.settle('a',false);g.release('a');assert(g.status().blocked);n++;
const q=g.acquire('c').catch(e=>e.gyMcpStopped);assert(!g.acknowledge());assert(g.cancelQueued('c'));assert(await q);n++;assert(g.acknowledge());assert(!g.status().blocked);n++;
await g.acquire('a');g.begin('a');assert(!g.acknowledge());n++;g.settle('a',true);g.release('a');
const bad=load({},true);await bad.acquire('a');assert.throws(()=>bad.begin('a'));assert(bad.status().blocked);assert.equal(bad.status().pending,0);n++;
assert.throws(()=>bad.claim('id'));assert(!bad.status().storageOk);n++;
console.log(n+' queue/journal/dedup checks passed');
