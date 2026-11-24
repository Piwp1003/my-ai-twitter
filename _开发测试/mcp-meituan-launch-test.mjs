import assert from 'node:assert/strict';import {setup} from './mcp-meituan-test.mjs';
let checks=0;
function scenario(errors){
 const x=setup({initial:'outside'}),bridge=x.c.gysPh.mcp,original=bridge.inspectScreen;let reads=0;
 bridge.inspectScreen=()=>{if(!x.opened())return original();const error=errors[reads++];return error?{ok:false,error}:original();};
 return {...x,reads:()=>reads};
}
// Launch takes longer than the original three reads: continue reading without reopening or clicking early.
let x=scenario(['not_meituan','no_active_window','screen_changed','no_active_window','not_meituan']);
let r=await x.api.search({query:'面条'});assert(r.ok);assert.equal(x.opened(),1);assert.equal(x.reads(),6);assert.equal(x.actions().join(','),'tap,text,tap');checks++;
for(const error of ['accessibility_off','inspect_failed','blocked_app','package_unknown']){
 x=scenario([error]);r=await x.api.search({query:'面条'});assert.equal(r.error,'page_unavailable');assert.equal(r.diagnostic.cause,error);assert.equal(r.diagnostic.stage,'after_launch');assert(r.err.includes(error));assert.equal(r.actionAccepted,true);assert.equal(x.reads(),1);assert.equal(x.opened(),1);assert.equal(x.actions().length,0);checks++;
}
// No screen arrives: bounded reads and no repeated launch or speculative tap.
x=scenario(Array(60).fill('no_active_window'));r=await x.api.search({query:'面条'});
assert.equal(r.diagnostic.cause,'no_active_window');assert(x.reads()>3&&x.reads()<=40);assert.equal(r.diagnostic.reads,x.reads());assert.equal(x.opened(),1);assert.equal(x.actions().length,0);checks++;
// Expiry while background timers are delayed stops without another read.
x=scenario(['no_active_window']);let now=1000;const RealDate=Date;
x.c.Date=class extends RealDate{static now(){return now;}};
x.c.setTimeout=fn=>{now+=9000;fn();};r=await x.api.search({query:'面条'});
assert.equal(x.reads(),0);assert.equal(x.opened(),1);assert.equal(x.actions().length,0);checks++;
assert.equal(r.diagnostic.cause,'read_timeout');checks++;
// A valid snapshot returned after the launch deadline is not used for a late click.
x=setup({initial:'outside'});now=1000;x.c.Date=class extends RealDate{static now(){return now;}};
const originalRead=x.c.gysPh.mcp.inspectScreen;
x.c.gysPh.mcp.inspectScreen=()=>{const s=originalRead();if(x.opened())now+=9000;return s;};
r=await x.api.search({query:'面条'});assert.equal(r.diagnostic.cause,'read_timeout');assert.equal(x.actions().length,0);assert.equal(x.opened(),1);checks++;
// Cancellation after opening: no later polls, taps, or replays.
x=scenario(Array(60).fill('no_active_window'));
await assert.rejects(x.api.search({query:'面条'},()=>{if(x.opened()&&x.reads()>=2)throw Error('cancelled');}),/cancelled/);
assert.equal(x.reads(),2);assert.equal(x.opened(),1);assert.equal(x.actions().length,0);checks++;
// Permanent failure before launch does not open an app.
x=setup();x.c.gysPh.mcp.inspectScreen=()=>({ok:false,error:'accessibility_off'});r=await x.api.search({query:'面条'});
assert.equal(r.diagnostic.stage,'before_launch');assert.equal(r.diagnostic.cause,'accessibility_off');assert.equal(r.actionAccepted,false);assert.equal(x.opened(),0);checks++;
// Successful read with an unknown layout still cannot trigger a blind click.
x=setup({initial:'outside'});const open=x.c.gysPh.__N.openApp;
x.c.gysPh.__N.openApp=()=>{open();x.change('unknown');return true;};r=await x.api.search({query:'面条'});
assert.equal(r.error,'unknown_layout');assert.equal(x.actions().length,0);assert.equal(x.opened(),1);checks++;
console.log(checks+' launch read checks passed: delayed window, native cause, bounded polling, cancellation, no relaunch or blind tap');

// Release Guyu's editor and keyboard before launching, without touching external controls.
x=setup({initial:'outside'});const order=[];
x.c.document={activeElement:{tagName:'TEXTAREA',blur(){order.push('blur');}}};
x.c.plus={key:{hideSoftKeybord(){order.push('hide');}}};
const openPrepared=x.c.gysPh.__N.openApp;
x.c.gysPh.__N.openApp=p=>{order.push('open');return openPrepared(p);};
assert((await x.api.search({query:'面条'})).ok);assert.equal(order.join(','),'blur,hide,open');assert.equal(x.opened(),1);checks++;
// Foreground signal is diagnostic evidence only. It must never override a rejected native window.
for(const [pkg,expected] of [['com.sankuai.meituan.takeoutnew','takeout'],['com.sankuai.meituan','meituan'],['private.other.app','other'],['','unknown']]){
 x=scenario(Array(60).fill('not_meituan'));x.c.gysPh.__N.fg=()=>pkg;
 r=await x.api.search({query:'面条'});assert.equal(r.diagnostic.foregroundSignal,expected);assert.equal(r.diagnostic.cause,'not_meituan');assert.equal(x.actions().length,0);assert.equal(x.opened(),1);
 assert(!JSON.stringify(r).includes('private.other.app'));checks++;
}
// Cancellation while the keyboard is being dismissed must prevent launching the external app.
x=setup({initial:'outside'});let hidden=false;x.c.plus={key:{hideSoftKeybord(){hidden=true;}}};
await assert.rejects(x.api.search({query:'面条'},()=>{if(hidden)throw Error('cancelled');}),/cancelled/);assert.equal(x.opened(),0);assert.equal(x.actions().length,0);checks++;
console.log('PASS launch focus preparation, private foreground categories, no policy bypass, cancellation before launch ('+checks+' checks total)');
