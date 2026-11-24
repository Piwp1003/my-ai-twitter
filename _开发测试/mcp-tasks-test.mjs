import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const src=fs.readFileSync('js/99-mcp-tasks.js','utf8');
function load(data={},fail=false){const c={console,window:null,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>{if(fail)throw Error('quota');data[k]=v;}},dispatchEvent(){},CustomEvent:function(){}};c.window=c;vm.runInNewContext(src,c);return c.gyMcpTasks;}
let count=0;function ok(v){assert(v);count++;}
const data={},s=load(data);let t=s.create('c','角色');ok(t.state==='created');ok(s.transition(t.id,'running','判断中'));ok(s.step(t.id,true));ok(s.step(t.id,false));ok(s.list()[0].steps===2&&s.list()[0].failures===1);ok(s.transition(t.id,'waiting','等待'));ok(!s.step(t.id,true));ok(s.transition(t.id,'running'));ok(s.transition(t.id,'paused','达到上限'));ok(s.transition(t.id,'running'));ok(s.transition(t.id,'completed','结束'));ok(!s.transition(t.id,'running'));ok(!s.step(t.id,true));ok(!s.transition('missing','running'));
const clone=s.list();clone[0].state='running';ok(s.list()[0].state==='completed');
for(const state of ['created','running','waiting','paused']){const x=s.create('c','用户');if(state!=='created')s.transition(x.id,'running');if(['waiting','paused'].includes(state))s.transition(x.id,state);}
const restored=load(data);ok(restored.list().filter(x=>x.state==='interrupted').length===4);ok(restored.list().some(x=>x.state==='completed'));ok(!restored.list().some(x=>['created','running','waiting','paused'].includes(x.state)));ok(!restored.transition(restored.list()[0].id,'running'));
for(let i=0;i<60;i++){const x=restored.create('c','x');restored.transition(x.id,'failed');}ok(restored.list().length===50);
const active=load();for(let i=0;i<50;i++)active.create('c','x');assert.throws(()=>active.create('c','x'));count++;
const broken=load({},true);broken.create('c','x');ok(!broken.storageOk());ok(load({'gyMcpTasksV1':'bad json'}).list().length===0);
ok(!JSON.stringify(data).includes('arguments'));ok(!JSON.stringify(data).includes('apiKey'));
for(const state of ['cancelled','timed_out','handed_over']){const t=restored.create('c','x');ok(restored.transition(t.id,state));ok(!restored.transition(t.id,'running'));ok(load(data).list().some(x=>x.id===t.id&&x.state===state));}
console.log(count+' task state checks passed');
