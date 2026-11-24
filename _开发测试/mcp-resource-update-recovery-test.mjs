import {chromium} from 'playwright';
import {launchBrowser} from './_launch.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await launchBrowser(chromium),source=fs.readFileSync('js/92c-app-update.js','utf8');
let checks=0;const ok=value=>{assert(value);checks++;};
async function setup(options={}){
 const page=await browser.newPage({userAgent:'Mozilla/5.0 (Linux; Android 14) Html5Plus/1.0'});
 await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'}));
 await page.goto('https://guyu-update.test/');
 await page.evaluate(o=>{
  window.GY_VERSION=o.version||317;localStorage.setItem('gyUpd',JSON.stringify(o.saved||{seen:9999}));
  window.hiddenMock=false;Object.defineProperty(document,'visibilityState',{get:()=>hiddenMock?'hidden':'visible'});
  window.gyAway=()=>true;window.events=[];window.timers=[];
  window.setTimeout=(fn,ms)=>{const t={fn,ms};timers.push(t);return t;};window.clearTimeout=t=>{if(t)t.clear=true;};window.setInterval=()=>1;
  window.fire=ms=>{for(const t of timers.filter(t=>t.ms===ms&&!t.clear)){t.clear=true;t.fn();}};
  window.plus={runtime:{appid:'H5C498173',getProperty:(id,cb)=>cb({version:'1.63.'+GY_VERSION}),
   install:(file,opts,success,error)=>{events.push('install');window.installSuccess=()=>success({version:'1.63.318'});if(o.installThrow)throw Error('native install failed');if(!o.hold)installSuccess();},
   restart:()=>{events.push('restart');if(o.restartThrow)throw Error('native restart failed');}},
   android:{runtimeMainActivity:()=>({}),invoke:(obj,name)=>{if(name==='startActivity')events.push('activity');return {}; }},
   io:{resolveLocalFileSystemURL:(path,success,error)=>error()},
   downloader:{createDownload:(url,opts,cb)=>{events.push('download');window.complete=()=>cb({filename:opts.filename},200);return {start(){},addEventListener(){}};}}};
  window.fetch=async()=>({ok:true,json:async()=>({ver:318,mver:'1.63.318',notes:[],wgt:'update/guyu.wgt'})});
 },options);
 await page.addScriptTag({content:source});return page;
}
try{
 let p=await setup();await p.evaluate(()=>gyCheckUpdate());await p.locator('#gyUpdGo').click();await p.evaluate(()=>complete());
 ok(await p.evaluate(()=>events.includes('install'))); // Lack of document focus is not backgrounding.
 ok(await p.evaluate(()=>gyUpdState().pending.phase==='installed'&&!gyUpdState().verified));
 await p.evaluate(()=>fire(900));ok(await p.evaluate(()=>events.filter(x=>x==='restart').length===1&&!events.includes('activity')));
 await p.evaluate(()=>fire(2500));ok((await p.locator('#gyUpdS').innerText()).includes('尚未确认新版启动'));
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('gyUpd')));await p.close();

 p=await setup({version:318,saved});await p.evaluate(()=>fire(1200));
 ok(await p.evaluate(()=>!gyUpdState().pending&&gyUpdState().verified.running===318));
 ok(await p.evaluate(()=>events.length===0));await p.close();

 p=await setup({saved});await p.evaluate(()=>fire(1200));
 ok(await p.evaluate(()=>!events.includes('install')&&!events.includes('restart')));
 ok((await p.locator('#gyUpdS').innerText()).includes('上次重启后仍加载旧页面'));
 await p.locator('#gyUpdGo').click();ok(await p.evaluate(()=>events.includes('restart')));await p.close();

 p=await setup({saved:{inst:{ver:318,phase:'installing'},pre:{ver:318,file:'_doc/update/guyu-318.wgt'}}});await p.evaluate(()=>fire(1200));
 ok(await p.evaluate(()=>!events.includes('install')));ok((await p.locator('#gyUpdS').innerText()).includes('上次安装没有完成'));await p.close();

 p=await setup({hold:true});await p.evaluate(()=>gyCheckUpdate());await p.locator('#gyUpdGo').click();
 await p.evaluate(()=>{hiddenMock=true;document.dispatchEvent(new Event('pause'));complete();});
 ok(await p.evaluate(()=>!events.includes('install')));
 await p.evaluate(()=>{hiddenMock=false;document.dispatchEvent(new Event('resume'));fire(400);document.dispatchEvent(new Event('resume'));fire(400);});
 ok(await p.evaluate(()=>events.filter(x=>x==='install').length===1&&!events.includes('restart')));
 await p.evaluate(()=>{installSuccess();document.dispatchEvent(new Event('resume'));fire(400);});
 ok(await p.evaluate(()=>!events.includes('restart')));
 await p.evaluate(()=>fire(900));ok(await p.evaluate(()=>events.filter(x=>x==='restart').length===1));await p.close();

 p=await setup({installThrow:true});await p.evaluate(()=>gyCheckUpdate());await p.locator('#gyUpdGo').click();await p.evaluate(()=>complete());
 ok(await p.evaluate(()=>gyUpdState().pending.phase==='failed'&&!events.includes('restart')));
 ok((await p.locator('#gyUpdS').innerText()).includes('native install failed'));await p.close();

 p=await setup({restartThrow:true});await p.evaluate(()=>gyCheckUpdate());await p.locator('#gyUpdGo').click();await p.evaluate(()=>{complete();fire(900);});
 ok((await p.locator('#gyUpdS').innerText()).includes('native restart failed'));
 ok(await p.evaluate(()=>gyUpdState().pending.phase==='installed'&&!events.includes('activity')));await p.close();

 p=await setup({saved:{pre:{ver:318,file:'_doc/update/guyu-318.wgt'}}});await p.evaluate(()=>gyUpdResume());
 ok(await p.evaluate(()=>!events.includes('install')&&!events.includes('restart')));await p.close();
 console.log(checks+' WGT install/restart/version acknowledgement checks passed (native interfaces mocked)');
}finally{await browser.close();}
