import {chromium} from 'playwright';
import {launchBrowser} from './_launch.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync('js/99-life-foundation.js','utf8'),backup=fs.readFileSync('js/80-backup-extra.js','utf8');
const browser=await launchBrowser(chromium);let checks=0;
const check=value=>{assert(value);checks++;};
const scope={source:'qq',accountId:'account_1',conversationId:'conversation_1'};
const event={sourceId:'msg_1',kind:'chat.received',occurredAt:1700000000000,ref:'chat:local_1'};
async function pageIn(context,unavailable=false){
 const page=await context.newPage();await page.goto('https://life-foundation.test/');
 if(unavailable)await page.evaluate(()=>Object.defineProperty(window,'indexedDB',{value:{open(){throw Error('denied');}}}));
 await page.addScriptTag({content:source});return page;
}
async function context(){const c=await browser.newContext();await c.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));return c;}
const run=(page,method,...args)=>page.evaluate(async({method,args})=>{try{return {ok:true,value:await gyLife[method](...args)};}catch(e){return {ok:false,error:e.code};}},{method,args});
try{
 let c=await context(),p=await pageIn(c);
 check(!(await p.evaluate(()=>indexedDB.databases())).some(d=>d.name==='gyLifePrivateV1'));
 check((await run(p,'allowed',scope,'role_1','read')).value===false);
 check((await run(p,'append',scope,'role_1',event)).error==='permission_denied');
 check((await run(p,'grant',scope,'role_1',['read','record'])).ok);
 check((await run(p,'append',scope,'role_1',event)).value.duplicate===false);
 const listed=(await run(p,'list',scope,'role_1','read')).value;
 check(listed.length===1&&listed[0].ref==='chat:local_1'&&!('text' in listed[0]));
 check((await run(p,'list',scope,'role_2','read')).error==='permission_denied');
 for(const other of [{...scope,source:'wechat'},{...scope,accountId:'account_2'},{...scope,conversationId:'conversation_2'}])check((await run(p,'list',other,'role_1','read')).error==='permission_denied');
 for(const purpose of ['remember','diary','cloud'])check((await run(p,'list',scope,'role_1',purpose)).error==='permission_denied');
 check((await run(p,'list',scope,'role_1')).error==='invalid_purpose');
 for(const extra of [{text:'private chat'}, {amount:12345}, {address:'private address'}])check((await run(p,'append',scope,'role_1',{...event,...extra})).error==='invalid_input');
 check((await run(p,'append',scope,'role_1',{...event,ref:'https://example.test/private'})).error==='invalid_event');
 check((await run(p,'grant',{...scope,conversationId:'*'},'role_1',['read'])).error==='invalid_identity');
 check((await run(p,'grant',scope,'role_1',['read','unknown'])).error==='invalid_permissions');
 check((await run(p,'grant',scope,'role_1',['read','read'])).error==='invalid_permissions');
 check((await run(p,'append',scope,'role_1',{...event,occurredAt:1700000000010})).value.duplicate===true);
 check((await run(p,'append',scope,'role_1',{...event,ref:'chat:different'})).error==='event_conflict');
 check((await run(p,'status')).value.events===1);
 await run(p,'grant',scope,'role_1',['read','record','send','remember']);
 check((await run(p,'list',scope,'role_1','remember')).value.length===1);
 await run(p,'grant',scope,'role_1',['read']);
 check((await run(p,'allowed',scope,'role_1','send')).value===false&&(await run(p,'allowed',scope,'role_1','remember')).value===false);
 check((await run(p,'append',scope,'role_1',{...event,sourceId:'msg_2'})).error==='permission_denied');
 const expiry=await p.evaluate(()=>Date.now()+10000);await run(p,'grant',scope,'role_1',['read'],{expiresAt:expiry});
 await p.evaluate(()=>{window.clockNow=Date.now;Date.now=()=>clockNow()+20000;});
 check((await run(p,'allowed',scope,'role_1','read')).value===false);await p.evaluate(()=>Date.now=clockNow);
 await run(p,'grant',scope,'role_1',['read','record']);
 const p2=await pageIn(c);
 const concurrent=await Promise.all([run(p,'append',scope,'role_1',{...event,sourceId:'concurrent',ref:'chat:concurrent'}),run(p2,'append',scope,'role_1',{...event,sourceId:'concurrent',ref:'chat:concurrent'})]);
 check(concurrent.every(x=>x.ok)&&concurrent.filter(x=>x.value.duplicate).length===1);
 check((await run(p,'list',scope,'role_1','read')).value.length===2);
 await run(p2,'revoke',scope,'role_1');check((await run(p,'allowed',scope,'role_1','read')).value===false);
 check((await run(p,'append',scope,'role_1',{...event,sourceId:'after-revoke'})).error==='permission_denied');
 await run(p,'grant',scope,'role_1',['read','record']);
 await p.evaluate(()=>{window.normalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){if(this.name==='grants')throw new DOMException('quota','QuotaExceededError');return normalPut.apply(this,arguments);};});
 check((await run(p,'grant',scope,'role_1',['read','send'])).error==='storage_failed');
 check((await run(p,'allowed',scope,'role_1','read')).value===true&&(await run(p,'allowed',scope,'role_1','send')).value===false);
 await p.evaluate(()=>IDBObjectStore.prototype.put=normalPut);
 await p.evaluate(()=>{window.normalAdd=IDBObjectStore.prototype.add;IDBObjectStore.prototype.add=function(){throw new DOMException('quota','QuotaExceededError');};});
 check((await run(p,'append',scope,'role_1',{...event,sourceId:'failed-write'})).error==='storage_failed');
 await p.evaluate(()=>IDBObjectStore.prototype.add=normalAdd);
 check((await run(p,'status')).value.events===2);
 const other={...scope,conversationId:'other'};await run(p,'grant',other,'role_1',['read','record']);await run(p,'append',other,'role_1',event);
 await run(p,'grant',scope,'role_2',['read']);await run(p,'forget',scope);
 check((await run(p,'allowed',scope,'role_1','read')).value===false&&(await run(p,'allowed',scope,'role_2','read')).value===false);
 check((await run(p,'status')).value.events===1&&(await run(p,'list',other,'role_1','read')).value.length===1);
 await run(p,'grant',scope,'role_1',['read','record']);await run(p,'append',scope,'role_1',event);
 check((await run(p,'list',scope,'role_1','read')).value.length===1); // Explicit deletion clears only this scope's event dedup history.

 await p.evaluate(()=>{window.backupWrites=[];window.localforage={config:()=>({}),createInstance:o=>({setItem:async(k,v)=>backupWrites.push([o.name,o.storeName,k])})};localStorage.setItem('ordinarySetting','retained');});
 await p.addScriptTag({content:backup});const exported=await p.evaluate(()=>gyBackupExtraCollect());
 check(!Object.hasOwn(exported.idb,'gyLifePrivateV1')&&exported.ls.ordinarySetting==='retained');
 await p.evaluate(()=>gyBackupExtraRestore({idb:{gyLifePrivateV1:{grants:{malicious:{permissions:['send']}}},ordinaryBox:{prefs:{normal:true}}},ls:{normalRestore:'yes'}}));
 check(await p.evaluate(()=>backupWrites.length===1&&backupWrites[0][0]==='ordinaryBox'&&localStorage.getItem('normalRestore')==='yes'));
 check((await run(p,'allowed',scope,'role_1','send')).value===false);
 await run(p,'revoke',scope,'role_1');await p.reload();await p.addScriptTag({content:source});
 check((await run(p,'allowed',scope,'role_1','read')).value===false);
 await c.close();

 c=await context();p=await pageIn(c,true);
 check((await run(p,'status')).value.ready===false);
 check((await run(p,'grant',scope,'role_1',['read'])).error==='storage_unavailable');
 check((await run(p,'allowed',scope,'role_1','read')).error==='storage_unavailable');await c.close();

 c=await context();p=await pageIn(c);await run(p,'grant',scope,'role_1',['read','record','draft']);
 check((await run(p,'append',scope,'role_1',{...event,kind:'chat.sent'})).error==='permission_denied');
 await run(p,'grant',scope,'role_1',['read','record']);
 const capacity=await p.evaluate(async({scope,event})=>{
  const outcomes=await Promise.all(Array.from({length:505},(_,i)=>gyLife.append(scope,'role_1',{...event,sourceId:'capacity_'+i,ref:'chat:capacity_'+i}).then(()=>true,e=>e.code)));
  return {saved:outcomes.filter(x=>x===true).length,full:outcomes.filter(x=>x==='event_capacity').length,state:await gyLife.status()};
 },{scope,event});
 check(capacity.saved===500&&capacity.full===5&&capacity.state.events===500);
 check((await run(p,'append',scope,'role_1',{...event,sourceId:'capacity_0',ref:'chat:capacity_0'})).value.duplicate===true);
 const grantCapacity=await p.evaluate(async scope=>{
  const outcomes=await Promise.all(Array.from({length:105},(_,i)=>gyLife.grant({...scope,conversationId:'grant_'+i},'role_1',['read']).then(()=>true,e=>e.code)));
  return {saved:outcomes.filter(x=>x===true).length,full:outcomes.filter(x=>x==='grant_capacity').length,state:await gyLife.status()};
 },scope);
 check(grantCapacity.saved===99&&grantCapacity.full===6&&grantCapacity.state.grants===100);
 check((await run(p,'grant',scope,'role_1',['read'])).ok&&(await run(p,'status')).value.grants===100);
 await c.close();
 console.log(checks+' local consent/event transaction/backup isolation checks passed (real browser IndexedDB; no external accounts)');
}finally{await browser.close();}
