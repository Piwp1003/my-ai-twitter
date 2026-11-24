// Checkout review. MCP calls never submit; the local UI delegates user-confirmed submission to the native module.
(function () {
 'use strict'; if (window.gyMeituanCheckout) return;
 const APPS=['com.sankuai.meituan','com.sankuai.meituan.takeoutnew'];
 const text=n=>String(n.text||n.desc||'').trim();
 const id=n=>String(n.id||'').split('/').pop();
 const prefix='(?:checkout|confirm_order|order_confirm)';
 const rx=tail=>new RegExp('^'+prefix+'_'+tail+'$','i');
 const FIELDS={store:rx('(?:shop|store)_name'),address:rx('address'),recipient:rx('contact_name'),phone:rx('contact_phone'),eta:rx('delivery_time'),deliveryMode:rx('delivery_method'),subtotal:rx('subtotal'),delivery:rx('delivery_fee'),packaging:rx('packaging_fee'),discount:rx('discount'),total:rx('total'),count:rx('total_quantity'),payment:rx('payment_mode')};
 let last=null, baseline=null, uiTimer=null, opening=false, epoch=0;
 function money(value){const m=String(value||'').trim().match(/^([−-])?\s*[¥￥]?\s*(\d{1,7})(?:\.(\d{1,2}))?\s*元?$/);if(!m)return null;const n=Number(m[2])*100+Number((m[3]||'').padEnd(2,'0'));return Number.isSafeInteger(n)&&n<=100000000?(m[1]?-n:n):null;}
 function field(s,key){const ns=s.nodes.filter(n=>FIELDS[key].test(id(n)));return ns.length===1?text(ns[0]):null;}
 function tree(s){const by=new Map(s.nodes.map(n=>[n.ref,n]));return {by,below(n,ref){const seen=new Set();while(n&&!seen.has(n.ref)){if(n.ref===ref)return true;seen.add(n.ref);n=by.get(n.parentRef);}return false;}};}
 function parseItems(s){const titles=s.nodes.filter(n=>rx('(?:item|food|product|dish|spu|sku)_name').test(id(n))),t=tree(s),items=[];
  for(const title of titles){let row=title,found=null;for(let depth=0;row&&depth<4;depth++,row=t.by.get(row.parentRef)){if(!Number.isInteger(row.parentRef)||row.parentRef<0)break;const ns=s.nodes.filter(n=>t.below(n,row.ref));if(ns.filter(n=>titles.includes(n)).length!==1)break;const quantities=ns.filter(n=>rx('(?:item|food|product|dish|spu|sku)_quantity').test(id(n)));if(quantities.length===1){found={ns,quantity:text(quantities[0])};break;}}
   if(!found||!/^\d+$/.test(found.quantity)||Number(found.quantity)<1||Number(found.quantity)>999||!text(title)||text(title).length>80)return null;
   const details=found.ns.filter(n=>rx('(?:item|food|product|dish|spu|sku)_specs').test(id(n))),amounts=found.ns.filter(n=>rx('(?:item|food|product|dish|spu|sku)_amount').test(id(n)));
   let specs=null;if(details.length===1&&text(details[0]))specs=text(details[0])==='无规格'?[]:text(details[0]).split(/[\/、,，;；]/).map(v=>v.trim()).filter(Boolean).sort();
   const amountCents=amounts.length===1?money(text(amounts[0])):null;
   items.push({name:text(title),quantity:Number(found.quantity),specs,amountCents:amountCents!==null&&amountCents>=0?amountCents:null});
  }return items.length?items:null;
 }
 function identity(items){return JSON.stringify(items.map(i=>[i.name,i.specs,i.quantity]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));}
 function parse(s,expected){
  if(!s||!s.ok||!APPS.includes(s.pkg)||s.snapshotSchema!==2||!s.fingerprint||!Number.isSafeInteger(s.token)||s.token<1||!Array.isArray(s.nodes))return {ok:false,error:'page_unavailable',err:'无法读取可靠的美团页面'};
  const words=s.nodes.map(text);
  if(words.some(v=>/^(?:立即登录|请输入验证码|安全验证|确认支付|支付密码|立即支付)$/.test(v)))return {ok:false,error:'human_required',err:'当前需要登录、验证或支付，请人工处理'};
  if(!words.includes('提交订单')||(!words.includes('确认订单')&&!s.nodes.some(n=>FIELDS.total.test(id(n)))))return {ok:false,error:'not_checkout',err:'未确认处于订单结算页'};
  const paymentMode=field(s,'payment');const manualPayment=['手动支付','需手动支付','未开通免密支付'].includes(paymentMode)&&!words.some(t=>!['手动支付','需手动支付','未开通免密支付'].includes(t)&&/免密|自动扣款|先享后付/.test(t));
  const submitButtons=s.nodes.filter(n=>n.enabled&&n.clickable&&text(n)==='提交订单');
  const missing=[],unknownFees=[];const store=field(s,'store'),address=field(s,'address'),recipient=field(s,'recipient'),phone=field(s,'phone'),eta=field(s,'eta'),deliveryMode=field(s,'deliveryMode');
  if(!store||store.length>80)missing.push('店铺');if(!address||address.length<6||address.length>=300||/^(?:请选择|新增|添加|选择|收货地址)/.test(address))missing.push('配送地址');if(!recipient||recipient.length>80||/请选择|未设置|收货人/.test(recipient))missing.push('收货人');if(!phone||!(/^(?:\+?86[ -]?)?1[\d*＊xX•·]{10}$/.test(phone.replace(/\s/g,''))||/^\d{3,4}-[\d*]{7,8}$/.test(phone)))missing.push('联系电话');if(!eta||eta.length>100||!/送达|分钟|尽快|预约|预计|\d{1,2}:\d{2}/.test(eta))missing.push('配送时间');if(!deliveryMode||deliveryMode.length>80||!/配送|自提|到店/.test(deliveryMode))missing.push('配送方式');
  const fees={};for(const key of ['subtotal','delivery','packaging','discount','total']){const raw=field(s,key);let cents=raw===null?null:money(raw);if(key==='discount'&&cents!==null)cents=Math.abs(cents);else if(cents!==null&&cents<0)cents=null;fees[key]=cents;if(cents===null)missing.push(({subtotal:'商品小计',delivery:'配送费',packaging:'包装费',discount:'优惠',total:'应付金额'})[key]);}
  const items=parseItems(s),countText=field(s,'count');const count=countText!==null&&/^\d+$/.test(countText)?Number(countText):null;
  const countMatches=!!(items&&count!==null&&Number.isSafeInteger(count)&&count===items.reduce((sum,i)=>sum+i.quantity,0));
  if(!items)missing.push('商品明细');if(items&&items.some(i=>i.specs===null))missing.push('商品规格');if(!countMatches)missing.push('商品总件数核对');if(s.truncated)missing.push('页面内容被截断');
  const itemAmountsMatch=!!(items&&fees.subtotal!==null&&items.every(i=>i.amountCents!==null)&&items.reduce((sum,i)=>sum+i.amountCents,0)===fees.subtotal);
  if(!itemAmountsMatch)missing.push('商品金额核对');
  const feeEquation=Object.values(fees).every(v=>v!==null)?fees.subtotal+fees.delivery+fees.packaging-fees.discount===fees.total:null;
  if(feeEquation!==true)missing.push('费用对账');
  for(const n of s.nodes){if(new RegExp('^'+prefix+'_','i').test(id(n))&&/fee|amount|price|cost/i.test(id(n))&&!Object.values(FIELDS).some(r=>r.test(id(n)))&&!rx('(?:item|food|product|dish|spu|sku)_amount').test(id(n)))unknownFees.push(id(n));}
  if(unknownFees.length)missing.push('存在未识别的费用项');
  const extras=s.nodes.some(n=>(n.checked===true||n.selected===true)&&/会员|保险|红包套餐|捐赠/.test(text(n)));if(extras)missing.push('存在已选增值服务');
  const cartMatches=expected&&items?expected.store===store&&items.every(i=>i.specs!==null)&&identity(expected.items)===identity(items):null;
  if(cartMatches!==true)missing.push('与购物车核对');
  return {ok:true,store,items:items||[],fees,count,countMatches,itemAmountsMatch,feeEquation,cartMatches,missing:[...new Set(missing)],complete:missing.length===0,
   paymentMode,manualPayment,submitRef:submitButtons.length===1?submitButtons[0].ref:null,delivery:{address,recipient,phone,eta,mode:deliveryMode},token:s.token,fingerprint:s.fingerprint,at:Date.now(),extraServicesSelected:extras};
 }
 const phone=()=>window.gysPh&&window.gysPh.mcp;
 const check=fn=>{if(typeof fn==='function')fn();};
 function publicSummary(summary,accepted){const result={ok:true,page:'checkout',complete:summary.complete,store:summary.store,items:summary.items.slice(0,6),itemsTruncated:summary.items.length>6,
  manualPayment:summary.manualPayment,paymentMode:summary.paymentMode,feesCents:summary.fees,count:summary.count,verification:{count:summary.countMatches,itemAmounts:summary.itemAmountsMatch,fees:summary.feeEquation,cart:summary.cartMatches},
  delivery:{address:!summary.missing.includes('配送地址')?'已读取，完整地址仅在本机核对':'未确认',recipient:!summary.missing.includes('收货人')?'已读取，仅在本机核对':'未确认',phone:!summary.missing.includes('联系电话')?'已读取，仅在本机核对':'未确认',eta:summary.delivery.eta,mode:summary.delivery.mode},
  missing:summary.missing,token:summary.token,expiresInMs:Math.max(0,30000-(Date.now()-summary.at)),actionAccepted:!!accepted,note:'费用单位为分；缺失字段未推算。摘要不是提交授权，未下单未付款。可在 MCP 页面查看本机完整摘要'};while(JSON.stringify(result).length>3500&&result.items.length){result.items.pop();result.itemsTruncated=true;}return result;}
 async function snapshot(fn){check(fn);if(!phone())throw new Error('手机桥接未加载');const s=await phone().inspectScreen(160);check(fn);return s;}
 async function read(args,fn){const revision=epoch;try{const s=await snapshot(fn);if(revision!==epoch)return {ok:false,error:'stale_review',err:'摘要已因人工接管失效，请重新读取',actionAccepted:false};const r=parse(s,baseline);if(!r.ok){last=null;return {...r,actionAccepted:false};}last=r;return publicSummary(r,false);}catch(e){if(e.gyMcpStopped)throw e;return {ok:false,error:'read_failed',err:'结算摘要读取失败，请检查页面',actionAccepted:false};}}
 async function prepare(args,fn){let accepted=false;const revision=epoch;try{
  check(fn);const p=phone(),cap=p&&p.capabilities();if(!cap||cap.readPermission!=='auto'||!cap.native||cap.native.pageSafety!==2)return {ok:false,error:'permission_required',err:'需要新版插件和页面操作授权',actionAccepted:false};
  const s=await snapshot(fn);if(revision!==epoch)return {ok:false,error:'stale_review',err:'页面已接管，请重新开始',actionAccepted:false};const info=window.gyMeituan.classify(s),items=window.gyMeituanCart.parseCart(s);
  if(info.page!=='store'||info.titles.length!==1||info.titles[0]!==args.store||!items||!items.length)return {ok:false,error:'cart_unverified',err:'请先展开指定店铺的完整购物车，核对商品和总件数',actionAccepted:false};
  const buttons=s.nodes.filter(n=>n.enabled&&n.clickable&&text(n)==='去结算');if(buttons.length!==1)return {ok:false,error:'ambiguous_checkout',err:'没有识别到唯一的「去结算」入口，不会点击其他按钮',actionAccepted:false};
  const expected={store:args.store,items};check(fn);accepted=true;const result=await p.tapElement(s.token,buttons[0].ref,fn);check(fn);
  if(!result||!result.ok||!result.snapshot)return {ok:false,error:'navigation_unverified',err:'已请求进入结算，但结果未确认；不会重试或提交订单',actionAccepted:true};
  if(revision!==epoch)return {ok:false,error:'stale_review',err:'页面已接管，结果需要人工核对',actionAccepted:true};const r=parse(result.snapshot,expected);if(!r.ok)return {...r,actionAccepted:true};baseline=expected;last=r;return publicSummary(r,true);
 }catch(e){if(e.gyMcpStopped)throw e;return {ok:false,error:'prepare_failed',err:'结算页面处理失败，请人工核对，不会自动重试',actionAccepted:accepted};}}
 const esc=v=>String(v==null?'未确认':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const yuan=n=>n===null?'未确认':'¥'+(n/100).toFixed(2);
 async function open(){
  if(opening)return false;opening=true;try{
  if(window.gyMcpExecution){const s=window.gyMcpExecution.status();if(s.owner||s.pending){if(typeof showToast==='function')showToast('','请等待当前工具任务结束再查看摘要');return false;}}
  const revision=epoch;let switched=false;
  let refreshed=await read({});
  if(!refreshed.ok&&refreshed.error==='page_unavailable'){
   const n=window.gysPh&&window.gysPh.__N,m=phone(),known=m&&m.lastPackage&&m.lastPackage();
   if(n&&n.apps&&n.openApp){const apps=n.apps().filter(a=>APPS.includes(a.pkg));const target=APPS.includes(known)?known:apps.length===1?apps[0].pkg:null;
    if(target&&revision===epoch&&n.openApp(target)){switched=true;for(let i=0;i<3;i++){if(revision!==epoch)break;await new Promise(r=>setTimeout(r,200));if(revision!==epoch)break;refreshed=await read({});if(refreshed.ok)break;}}
   }
  }
  if(switched&&revision===epoch){try{window.gysPh.__N.front();}catch(e){}}
  if(revision!==epoch)return false;
if(!refreshed.ok){const old=document.getElementById('gyMeituanCheckout');if(old)old.remove();if(typeof showToast==='function')showToast('',refreshed.err);return false;}
  const old=document.getElementById('gyMeituanCheckout');if(old)old.remove();const el=document.createElement('div');el.id='gyMeituanCheckout';el.setAttribute('data-gy-nopage','1');
  el.style.cssText='box-sizing:border-box;position:fixed;inset:0;z-index:2147483100;background:#0008;display:flex;align-items:center;justify-content:center;padding:16px';
  const s=last;const cap=phone().capabilities?phone().capabilities():null;const canSubmit=!!(s.complete&&s.manualPayment&&s.submitRef!==null&&cap&&cap.native&&cap.native.orderConfirmation===1&&window.gyMeituanSubmit);const fees=[['商品小计','subtotal'],['配送费','delivery'],['包装费','packaging'],['优惠','discount'],['应付金额','total']];
  el.innerHTML='<div role="dialog" aria-modal="true" aria-label="结算摘要" style="box-sizing:border-box;background:var(--bg-color,#fff);color:var(--text-color,#111);padding:20px;border-radius:16px;max-width:440px;width:100%;max-height:80vh;overflow:auto"><h3>结算摘要 · 仅供核对</h3><p>'+esc(s.store)+'</p>'
   +'<p data-status>'+esc(s.complete?'本次读取的字段核对通过；尚未授权提交':'仍有未确认信息')+'</p>'
   +s.items.map(i=>'<p>'+esc(i.name)+' × '+i.quantity+'<br>'+esc(i.specs===null?'规格未确认':i.specs.length?i.specs.join(' / '):'无规格')+' · '+yuan(i.amountCents)+'</p>').join('')
   +fees.map(([label,key])=>'<p>'+label+'：'+yuan(s.fees[key])+'</p>').join('')
   +'<p>地址：'+esc(s.delivery.address)+'<br>收货人：'+esc(s.delivery.recipient)+'<br>电话：'+esc(s.delivery.phone)+'<br>配送：'+esc(s.delivery.mode)+' / '+esc(s.delivery.eta)+'</p>'
   +(s.missing.length?'<p>未确认：'+s.missing.map(esc).join('、')+'</p>':'')
   +'<p>支付方式：'+esc(s.paymentMode)+'</p>'+(canSubmit?'<label><input type="checkbox" data-submit-check> 我已核对这一笔订单的商品、金额和配送信息</label><p><button data-submit disabled>确认提交这一笔订单</button></p><p data-submit-status></p>':'<p>当前不具备自动提交条件；支付方式不明、免密或插件过旧时，请人工处理。</p>')
   +'<p>仅本机展示完整配送信息；摘要不保存到存档。30 秒后需刷新核对；不会自动提交；提交需要勾选核对并在原生对话框再次确认，支付由你处理。</p><button data-refresh>刷新摘要</button> <button data-close>关闭</button></div>';
  if(canSubmit){const choice=el.querySelector('[data-submit-check]'),button=el.querySelector('[data-submit]');choice.onchange=()=>{button.disabled=!choice.checked||Date.now()-s.at>=30000;};button.onclick=async event=>{button.disabled=true;const result=await window.gyMeituanSubmit.confirm(s,event);const status=el.querySelector('[data-submit-status]');if(status)status.textContent=result.message;};}
  if(uiTimer)clearTimeout(uiTimer);uiTimer=setTimeout(()=>{const status=el.querySelector('[data-status]');if(status)status.textContent='摘要已过期，请刷新后重新核对';const submit=el.querySelector('[data-submit]');if(submit)submit.disabled=true;},Math.max(0,30000-(Date.now()-s.at)));
  el.querySelector('[data-close]').onclick=()=>{if(uiTimer)clearTimeout(uiTimer);el.remove();};el.querySelector('[data-refresh]').onclick=async()=>{last=null;await open();};document.body.appendChild(el);return true;
  }finally{opening=false;}
 }
 window.gyMeituanCheckout=Object.freeze({read,prepare,open,parse,money,invalidate:()=>{epoch++;last=null;baseline=null;if(uiTimer)clearTimeout(uiTimer);const el=document.getElementById('gyMeituanCheckout');if(el)el.remove();}});
})();
