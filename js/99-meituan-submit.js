// Local UI only: deliberately NOT an MCP tool. Native user confirmation is mandatory.
(function(){
 'use strict';if(window.gyMeituanSubmit)return;
 let busy=false,revision=0,opId='';
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 async function confirm(review,event){
  if(!event||event.isTrusted!==true)return {ok:false,message:'必须由用户点击本机确认按钮'};
  if(busy)return {ok:false,message:'已有提交确认在处理，不重复发送'};
  const gate=window.gyMcpExecution,n=window.gysPh&&window.gysPh.__N;
  if(!gate||!n||!n.requestOrderConfirmation||!n.orderSubmitState)return {ok:false,message:'原生提交确认能力未就绪，请更新 APK'};
  const state=gate.status();if(state.human||state.blocked||state.owner||state.pending||state.queued)return {ok:false,message:'请先处理当前任务或人工接管状态，再重新核对摘要'};
  if(!review||!review.complete||!review.manualPayment||review.submitRef===null||!Number.isSafeInteger(review.token)||Date.now()-review.at>=30000)return {ok:false,message:'摘要不完整、已过期或未确认手动支付，请重新核对'};
  busy=true;const generation=revision,id='local-submit-'+Date.now()+'-'+Math.random().toString(36).slice(2);let begun=false,known=true,uncertain=false,result={ok:false,message:'提交未发送'};
  try{
   await gate.acquire(id);if(generation!==revision||gate.status().human)throw new Error('确认已取消');
   const previous=await n.orderSubmitState('');if(!previous||!previous.ok||previous.submissionId||['attempted','submitted_unverified','unverified'].includes(previous.state))return {ok:false,message:'上次提交结果未确认，请先核对订单，不能再次提交'};
   gate.begin(id);begun=true;known=false;
   let status=await n.requestOrderConfirmation(review.token,review.submitRef,review.fingerprint);
   if(!status||!status.ok){known=!!(status&&['stale_snapshot','manual_payment_unverified','review_too_large','activity_required','confirmation_busy'].includes(status.error));uncertain=!known;return {ok:false,message:'没有进入提交确认：'+((status&&status.error)||'原生结果未知')+'。不会重试'};}
   opId=status.id;const deadline=Date.now()+35000;
   while(['awaiting_confirmation','restoring_app'].includes(status.state)){
    if(generation!==revision||Date.now()>=deadline){n.cancelOrderConfirmation(opId);status=await n.orderSubmitState(opId);break;}
    await sleep(250);status=await n.orderSubmitState(opId);if(!status||!status.ok)break;
   }
   known=!!(status&&status.ok&&['cancelled','expired','not_sent','storage_failed'].includes(status.state));uncertain=!known;
   result=known?{ok:false,state:status.state,message:'未提交或确认已失效，请重新核对；不会自动重试'}:{ok:false,state:(status&&status.state)||'unverified',message:'提交结果尚未确认，请人工检查订单；不会重复提交或操作支付'};
   return result;
  }catch(e){uncertain=begun;known=!begun;return {ok:false,message:'确认流程中断，请核对外部订单；不会自动重试'};}
  finally{if(begun)gate.settle(id,known);gate.release(id);busy=false;opId='';if(uncertain&&typeof window.gyMcpTakeover==='function')window.gyMcpTakeover('submit_result');}
 }
 function invalidate(){revision++;try{const n=window.gysPh&&window.gysPh.__N;if(n&&n.cancelOrderConfirmation)n.cancelOrderConfirmation(opId||'');}catch(e){}}
 window.gyMeituanSubmit=Object.freeze({confirm,invalidate});
})();
