import {chromium} from 'playwright';import {launchBrowser,fileUrl} from './_launch.mjs';import path from 'node:path';import assert from 'node:assert/strict';
const browser=await launchBrowser(chromium);
try{
 for(const streaming of [false,true]){
  const context=await browser.newContext();let toolDecisions=0,finalRequests=0;
  await context.route('**/*',r=>{
   if(!/^https?:/.test(r.request().url()))return r.continue();
   if(r.request().url().includes('facts.test/v1/chat/completions')){
    const b=r.request().postDataJSON();
    if(b.tools){toolDecisions++;return r.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{tool_calls:[{id:'read',type:'function',function:{name:'s0__inspect_screen',arguments:'{}'}}]}}]})});}
    finalRequests++;return r.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify({replies:[{text:'我搜到店铺并进入结算了，订单已付款。'}]})}}]})});
   }return r.abort();
  });
  const p=await context.newPage();await p.goto(fileUrl(path.join(process.cwd(),'index.html')));await p.waitForFunction(()=>window.triggerAIBatchReply?.__gyMcp&&typeof gyInjectSet==='function');
  await p.waitForTimeout(3300);
  const result=await p.evaluate(async streaming=>{
   myCharacters.push({id:9881,name:'测试员',persona:'喜欢主动帮用户点外卖',worldbooks:[],diaryData:{letters:[],diaries:[]}});
   myApiKey='test';myApiUrl='https://facts.test/v1';myModel='test';if(typeof enableStreaming!=='undefined')enableStreaming=streaming;
   window.aliveGate=()=>null;window.plus={android:{}};window.gysPh={mcp:{inspectScreen:()=>({err:'not_meituan',error:'not_meituan'})}};
   gyMcpState().servers.splice(0,gyMcpState().servers.length,{id:'phone',kind:'builtin',tools:[{name:'inspect_screen'}]});
   setAutoFeature('mcpOn',true,true);await gyInjectSet('mcp.result',false);
   globalChats['9881']=[{sender:'me',text:'打开美团搜索面条并去结算',timestamp:Date.now()}];
   switchMainView('chat');switchChatSession('9881');
   const guard=gyMcpReplyFacts;window.guardCalls=[];window.gyMcpReplyFacts=(receipt,sid,cid)=>{guardCalls.push({state:receipt?.state,task:receipt?.taskId,attempts:receipt?.attempts?.length});return guard(receipt,sid,cid);};
   await triggerAIBatchReply('9881','打开美团搜索面条并去结算');
   return {reply:globalChats['9881'].filter(m=>m.sender!=='me'&&m.sender!=='system').map(m=>m.text).join('\n'),ctx:__gyMcpCtxFor('9881'),state:gyMcpTasks.list()[0].state,guardCalls,log:gyMcpState().log.map(l=>l.tool)};
  },streaming);
  assert.equal(result.state,'failed');assert.equal(result.ctx,'','optional tool results are actually disabled');assert(result.reply.includes('没有确认搜到店铺'),JSON.stringify({result,toolDecisions,finalRequests,streaming}));assert(result.reply.includes('not_meituan'));assert(!result.reply.includes('我搜到店铺并进入结算'));assert.equal(toolDecisions,1);assert.equal(finalRequests,0,'physical facts bypass creative final generation, including streaming');
  await context.close();
 }
 console.log('PASS real reply path with tool-result injection OFF, streaming ON/OFF: failed physical task uses fixed verified facts, fabricated completion never requested or displayed');
}finally{await browser.close();}
