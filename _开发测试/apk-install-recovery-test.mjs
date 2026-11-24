import { chromium } from 'playwright';
import { launchBrowser } from './_launch.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser = await launchBrowser(chromium);
const source = fs.readFileSync('js/92g-big-update.js','utf8');
let count=0;
try {
 async function setup(opt={}) {
  const p=await browser.newPage();
  await p.evaluate(opt=>{
   const data={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v}});
   window.hiddenMock=false;Object.defineProperty(document,'visibilityState',{get:()=>hiddenMock?'hidden':'visible'});
   window.log={downloads:0,installs:0,settings:0};window.allowed=!opt.denied;window.mode=opt.mode||'none';window.missing=false;
   window.fetch=async()=>({ok:true,json:async()=>({android:{code:200,v:'2.0'}})});
   window.plus={runtime:{install:(f,o,ok,err)=>{log.installs++;if(mode==='throw')throw Error('sync');if(mode==='error')err({message:'blocked'});}},
    io:{convertLocalFileSystemURL:f=>'/local/'+f,resolveLocalFileSystemURL:(f,ok,err)=>missing?err():ok({isFile:true})},
    android:{runtimeMainActivity:()=>({}),getAttribute:()=>100,newObject:()=>({}),invoke:(obj,name)=>name==='canRequestPackageInstalls'?allowed:name==='getPackageName'?'com.test':name==='startActivity'?(log.settings++,{}):({})},
    downloader:{createDownload:(u,o,cb)=>{log.downloads++;window.complete=()=>cb({filename:o.filename},200);return {addEventListener(){},start(){}};}}};
  },opt);
  await p.addScriptTag({content:source});await p.evaluate(()=>gyBigUpdCheck(true));return p;
 }
 let p=await setup();await p.locator('#gyBig .ok').click();await p.evaluate(()=>complete());
 assert.match(await p.locator('#gyBig .s').innerText(),/点「安装」/);count++;
 assert.equal(await p.locator('#gyBig .ok').innerText(),'继续安装');count++;
 await p.locator('#gyBig .ok').click();assert.deepEqual(await p.evaluate(()=>log),{downloads:1,installs:2,settings:0});count++;
 await p.evaluate(()=>{missing=true;});await p.locator('#gyBig .ok').click();assert.equal(await p.evaluate(()=>log.downloads),2);count++;await p.close();
 p=await setup();await p.locator('#gyBig .ok').click();await p.locator('#gyBig .no').click();await p.evaluate(()=>{hiddenMock=true;complete();});
 assert.equal(await p.evaluate(()=>log.installs),0);count++;
 await p.evaluate(()=>{hiddenMock=false;gyBigUpdResume();});assert.equal(await p.locator('#gyBig .ok').innerText(),'继续安装');count++;
 await p.locator('#gyBig .ok').click();assert.equal(await p.evaluate(()=>log.downloads),1);assert.equal(await p.evaluate(()=>log.installs),1);count++;await p.close();
 p=await setup({denied:true});await p.locator('#gyBig .ok').click();await p.evaluate(()=>complete());assert.equal(await p.evaluate(()=>log.installs),0);count++;
 assert.equal(await p.locator('#gyBig .ok').innerText(),'打开安装权限设置');await p.locator('#gyBig .ok').click();assert.equal(await p.evaluate(()=>log.settings),1);count++;
 await p.evaluate(()=>{allowed=true;});await p.locator('#gyBig .ok').click();assert.equal(await p.evaluate(()=>log.downloads),1);assert.equal(await p.evaluate(()=>log.installs),1);count++;await p.close();
 for(const mode of ['throw','error']) {p=await setup({mode});await p.locator('#gyBig .ok').click();await p.evaluate(()=>complete());assert.equal(await p.locator('#gyBig .ok').getAttribute('class'),'ok');assert.match(await p.locator('#gyBig .s').innerText(),/失败|未能/);count++;await p.close();}
 p=await setup();await p.locator('#gyBig .ok').click();await p.evaluate(()=>{hiddenMock=true;complete();});await p.locator('#gyBig .no').click();
 await p.addScriptTag({content:source});await p.evaluate(()=>{hiddenMock=false;return gyBigUpdCheck(true);});
 assert.equal(await p.locator('#gyBig .ok').innerText(),'继续安装');await p.locator('#gyBig .ok').click();assert.equal(await p.evaluate(()=>log.downloads),1);count++;await p.close();
 console.log(count+' APK install recovery checks passed');
} finally {await browser.close();}
