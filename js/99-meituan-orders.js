// Observes receipt facts; only a local native confirmation can associate a receipt and clear the submission latch.
(function(){
 'use strict';if(window.gyMeituanOrders)return;
 const APPS=['com.sankuai.meituan','com.sankuai.meituan.takeoutnew'];const text=n=>String(n.text||n.desc||'').trim();let last=null,revision=0,busy=false,opening=false,opId='';
 const labels={unknown:'结果未知',pending_payment:'待付款',paid:'页面显示已支付',cancelled:'订单已取消',failed:'下单失败',payment_failed:'支付失败，不能当作未下单',refunded:'已退款',refund_pending:'退款中',processing_paid:'处理中，页面明确显示已支付',processing_payment_unconfirmed:'处理中，付款状态未确认',delivered_paid:'已送达且页面明确显示已支付',delivered_payment_unconfirmed:'已送达，付款状态未确认'};
 function field(s,key){const ns=s.nodes.filter(n=>String(n.id||'').split('/').pop()==='order_detail_'+key);return ns.length===1?text(ns[0]):null;}
 function state(order,payment){const paid=['已支付','已付款','支付成功'].includes(payment);if(['待付款','待支付'].includes(order))return paid?'unknown':'pending_payment';if(['已支付','支付成功'].includes(order))return ['待支付','未支付'].includes(payment)?'unknown':'paid';if(['已取消','订单已取消'].includes(order))return 'cancelled';if(['提交失败','下单失败'].includes(order))return 'failed';if(order==='支付失败')return paid?'unknown':'payment_failed';if(order==='已退款')return 'refunded';if(order==='退款中')return 'refund_pending';if(['已完成','已送达'].includes(order))return paid?'delivered_paid':'delivered_payment_unconfirmed';if(['配送中','制作中','商家已接单'].includes(order))return paid?'processing_paid':'processing_payment_unconfirmed';return 'unknown';}
 function parse(s){if(!s||!s.ok||!APPS.includes(s.pkg)||s.snapshotSchema!==2||!s.fingerprint||!Array.isArray(s.nodes))return {ok:false,state:'unknown'};const orderId=field(s,'order_id'),orderState=field(s,'status');if(!orderId||! /^[A-Za-z0-9-]{8,64}$/.test(orderId)||!orderState)return {ok:false,state:'unknown'};return {ok:true,orderId,orderTail:orderId.slice(-4),store:field(s,'shop_name'),state:state(orderState,field(s,'payment_status')),createdAt:field(s,'created_at'),token:s.token,fingerprint:s.fingerprint,pkg:s.pkg,truncated:!!s.truncated};}
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const guard=(generation,check)=>{if(typeof check==='function')check();if(revision!==generation)throw Object.assign(Error('读取已失效'),{stale:true});};
 async function read(args,check){const generation=revision;try{
  guard(generation,check);const p=window.gysPh,n=p&&p.__N;if(!p||!p.mcp)return {ok:true,state:'unknown',note:'手机页面读取能力未就绪，不能确认订单结果'};
  let s=await p.mcp.inspectScreen(160);guard(generation,check);
  if(s&&s.error==='not_meituan'&&n&&n.apps&&n.openApp){const journal=n.orderSubmitState?await n.orderSubmitState(''):{};guard(generation,check);const known=journal.pkg||(p.mcp.lastPackage&&p.mcp.lastPackage());const apps=n.apps().filter(a=>APPS.includes(a.pkg));const target=APPS.includes(known)?known:apps.length===1?apps[0].pkg:null;
   if(target&&n.openApp(target))for(let i=0;i<3;i++){await wait(200);guard(generation,check);s=await p.mcp.inspectScreen(160);guard(generation,check);if(s&&s.ok)break;}
  }
  const receipt=parse(s);if(!receipt.ok){last=null;return {ok:true,state:'unknown',note:'请先手动打开具体订单详情页；不能凭提交按钮或支付弹窗确认订单成功，不会重试提交'};}
  const verified=n&&n.checkOrderReceipt?await n.checkOrderReceipt(s.token,s.fingerprint):{ok:false};guard(generation,check);
  const reliable=verified&&verified.ok&&verified.state===receipt.state&&!receipt.truncated;
  last={...receipt,native:verified,reliable,at:Date.now()};
  const confirmed=!!(reliable&&verified.confirmedAssociation);let outcome='unverified';if(confirmed){if(['paid','processing_paid','delivered_paid'].includes(receipt.state))outcome='paid_order_observed';else if(['pending_payment','payment_failed'].includes(receipt.state))outcome='order_created_payment_pending';else if(receipt.state==='cancelled')outcome='order_cancelled';else if(receipt.state==='failed')outcome='order_failed';else if(receipt.state==='refunded')outcome='order_refunded';else outcome='order_created_payment_unconfirmed';}
  return {ok:true,state:reliable?receipt.state:'unknown',observedState:receipt.state,orderTail:receipt.orderTail,store:receipt.store,candidateMatched:!!(reliable&&verified.candidateMatched),confirmedAssociation:confirmed,taskOutcome:outcome,
   note:confirmed?'已在本机核对对应关系；以上是当前订单页事实，不会操作支付、退款或重新下单':'仅观察到订单页；尚不能确认属于本次提交，不得声称本次购买成功。请在本机核对，不会重试提交'};
 }catch(e){if(e.gyMcpStopped)throw e;last=null;return {ok:true,state:'unknown',note:'订单读取中断，结果未确认；不会重试提交'};}}
 async function resolve(event){if(!event||event.isTrusted!==true||busy||!last||!last.reliable||!last.native.candidateMatched||Date.now()-last.at>=30000)return {ok:false,message:'需要用户核对最新且匹配的订单详情'};
  const n=window.gysPh&&window.gysPh.__N,gate=window.gyMcpExecution;if(!n||!n.requestOrderResolution||!gate)return {ok:false,message:'原生订单核验能力未就绪'};
  const saved=last,generation=revision,id='receipt-review-'+Date.now();let begun=false,known=true;busy=true;
  try{await gate.acquireLocalReview(id);guard(generation);gate.begin(id);begun=true;known=false;let status=await n.requestOrderResolution(saved.native.submissionId,saved.token,saved.fingerprint);if(!status||!status.ok)return {ok:false,message:'原生核验未通过，仍保留提交占用，不会重试'};
   opId=status.id;const until=Date.now()+35000;while(['awaiting_confirmation','restoring_app'].includes(status.state)){if(revision!==generation||Date.now()>=until){n.cancelOrderConfirmation(opId);status=await n.orderSubmitState(opId);break;}await wait(250);status=await n.orderSubmitState(opId);if(!status||!status.ok)break;}
   known=!!(status&&status.ok&&['resolved','cancelled','expired','not_resolved','not_sent'].includes(status.state));last=null;return {ok:!!(status&&status.state==='resolved'),message:status&&status.state==='resolved'?'本机已确认对应关系；请重新读取订单状态。旧任务不会续跑，也不会重新下单':'对应关系未确认，提交占用继续保留，请人工检查'};
  }catch(e){return {ok:false,message:'核验中断，提交占用继续保留'};}finally{if(begun)gate.settle(id,known);gate.release(id);busy=false;opId='';}}
 const esc=v=>String(v==null?'未确认':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function open(){if(opening)return false;opening=true;const generation=revision;try{const gate=window.gyMcpExecution;if(gate){const s=gate.status();if(s.owner||s.pending||s.queued){if(typeof showToast==='function')showToast('','请等待在途工具请求结束后核验订单');return false;}}
  await read({});if(generation!==revision)return false;const saved=last;const n=window.gysPh&&window.gysPh.__N;if(n&&n.front)try{n.front();}catch(e){}
  const old=document.getElementById('gyMeituanOrderReview');if(old)old.remove();const el=document.createElement('div');el.id='gyMeituanOrderReview';el.setAttribute('data-gy-nopage','1');el.style.cssText='position:fixed;inset:0;z-index:2147483101;background:#0008;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
  el.innerHTML='<div role="dialog" aria-modal="true" aria-label="订单结果核验" style="box-sizing:border-box;background:#fff;color:#111;padding:20px;border-radius:16px;max-width:440px;width:100%;max-height:80vh;overflow:auto"><h3>订单结果核验</h3>'+(saved?'<p>订单号（仅本机）：'+esc(saved.orderId)+'</p><p>'+esc(saved.store)+' · '+esc(labels[saved.reliable?saved.state:'unknown'])+'</p><p>创建时间：'+esc(saved.createdAt)+'</p><p>'+esc(saved.native.confirmedAssociation?'本机已确认对应关系':'当前对应关系尚未确认')+'</p>':'<p>结果未知，请手动打开具体订单详情页后刷新。</p>')
   +(saved&&saved.reliable&&saved.native.candidateMatched?'<label><input type="checkbox" data-receipt-check> 我已核对这是上次提交对应的订单</label><p><button data-resolve disabled>核对对应关系并解除提交占用</button></p><p data-result></p>':'')+'<p>字段不全、金额或商品不一致时保持未知，不会重试提交；此处不支付、不取消、不退款。</p><button data-refresh>刷新订单</button> <button data-close>关闭</button></div>';
  if(el.querySelector('[data-resolve]')){const button=el.querySelector('[data-resolve]'),choice=el.querySelector('[data-receipt-check]');choice.onchange=()=>button.disabled=!choice.checked||Date.now()-saved.at>=30000;button.onclick=async event=>{button.disabled=true;const result=await resolve(event);el.querySelector('[data-result]').textContent=result.message;};}
  el.querySelector('[data-close]').onclick=()=>el.remove();el.querySelector('[data-refresh]').onclick=()=>open();document.body.appendChild(el);return true;
 }finally{opening=false;}
 }
 function invalidate(){revision++;last=null;const el=typeof document!=='undefined'&&document.getElementById('gyMeituanOrderReview');if(el)el.remove();if(busy&&window.gysPh&&window.gysPh.__N)try{window.gysPh.__N.cancelOrderConfirmation(opId||'');}catch(e){}}
 window.gyMeituanOrders=Object.freeze({read,open,resolve,invalidate,parse,state});
})();
