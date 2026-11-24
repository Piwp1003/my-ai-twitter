// Conservative cart adapter: visible identities and quantities are required; never submits an order.
(function () {
 'use strict'; if (window.gyMeituanCart) return;
 const text=n=>String(n.text||n.desc||'').trim();
 const itemId=id=>/(?:food|dish|spu|product|sku)[_a-z/]*(?:name|title)/i.test(String(id||''))&&!/cart/i.test(id);
 const cartId=id=>/cart[_a-z/]*(?:food|dish|spu|product|sku)?[_a-z/]*(?:name|title)/i.test(String(id||''));
 let cached=null;
 function tree(s){const by=new Map(s.nodes.map(n=>[n.ref,n]));const below=(n,ref)=>{const seen=new Set();while(n&&!seen.has(n.ref)){if(n.ref===ref)return true;seen.add(n.ref);n=by.get(n.parentRef);}return false;};return {by,members:ref=>s.nodes.filter(n=>below(n,ref))};}
 function rowFor(s,title,titles,predicate){const t=tree(s);let row=title;for(let i=0;row&&i<4;i++,row=t.by.get(row.parentRef)){if(!Number.isInteger(row.parentRef)||row.parentRef<0)break;const nodes=t.members(row.ref);if(nodes.filter(n=>titles.includes(n)).length!==1)break;if(predicate(nodes))return nodes;}return null;}
 function menu(s){const info=window.gyMeituan.classify(s);if(info.page!=='store'||info.titles.length!==1||s.truncated)return null;const titles=s.nodes.filter(n=>itemId(n.id)&&text(n)&&text(n).length<=80);const items=[];
  for(const title of titles){const row=rowFor(s,title,titles,ns=>ns.some(n=>n.enabled&&n.clickable&&['加入购物车','加购','选规格','选择规格'].includes(text(n))));if(!row)continue;const buttons=row.filter(n=>n.enabled&&n.clickable&&['加入购物车','加购','选规格','选择规格'].includes(text(n)));if(buttons.length!==1)continue;items.push({name:text(title),ref:buttons[0].ref,kind:/规格/.test(text(buttons[0]))?'specs':'simple'});}
  return {store:info.titles[0],items};
 }
 function specs(s){if(s.truncated)return null;const headers=s.nodes.filter(n=>/(?:spec|attr|property)[_a-z/]*(?:group|title)/i.test(n.id||'')&&text(n));if(!headers.length)return null;const groups=[];
  for(const h of headers){const label=text(h);if(!/单选/.test(label)||/多选|至少|最多|[2-9]\s*项/.test(label))return null;const required=/必选/.test(label);if(!required&&!/可选/.test(label))return null;
   const row=rowFor(s,h,headers,ns=>ns.some(n=>n!==h&&(n.checkable||/RadioButton/.test(n.cls||''))));if(!row)return null;
   const options=row.filter(n=>n!==h&&text(n)&&(n.checkable||/RadioButton/.test(n.cls||''))).map(n=>({ref:n.ref,name:text(n),enabled:!!n.enabled,selected:n.checked===true||n.selected===true,known:typeof n.checked==='boolean'&&typeof n.selected==='boolean'}));
   if(!options.length||options.some(n=>!n.known)||new Set(options.map(n=>n.name)).size!==options.length)return null;
   const name=label.replace(/[（(].*?[）)]/g,'').trim();if(!name)return null;groups.push({name,required,options});
  }return new Set(groups.map(g=>g.name)).size===groups.length?groups:null;
 }
 function cart(s){if(s.truncated)return null;const titles=s.nodes.filter(n=>cartId(n.id)&&text(n));const items=[];
  for(const title of titles){const row=rowFor(s,title,titles,ns=>ns.some(n=>/cart[_a-z/]*(?:quantity|count|qty)/i.test(n.id||'')&&/^\d+$/.test(text(n))));if(!row)return null;
   const qty=row.filter(n=>/cart[_a-z/]*(?:quantity|count|qty)/i.test(n.id||'')&&/^\d+$/.test(text(n)));if(qty.length!==1)return null;
   const detail=row.filter(n=>/cart[_a-z/]*(?:spec|attr)/i.test(n.id||''));if(detail.length>1)return null;
   const choices=detail.length?text(detail[0]).split(/[\/、,，;；]/).map(t=>t.trim()).filter(Boolean).sort():[];
   items.push({name:text(title),specs:choices,quantity:Number(text(qty[0]))});
  }
  if(!items.length&&!s.nodes.some(n=>/^(?:购物车为空|购物车空空如也|还没有选购商品)$/.test(text(n))))return null;
  if(items.some(i=>!Number.isSafeInteger(i.quantity)||i.quantity<1))return null;
  if(items.length){const totals=s.nodes.filter(n=>/cart[_a-z/]*(?:total|summary)[_a-z/]*(?:count|quantity|qty)/i.test(n.id||'')&&/^\d+$/.test(text(n)));if(totals.length!==1||Number(text(totals[0]))!==items.reduce((sum,i)=>sum+i.quantity,0))return null;}
  return items;
 }
 const phone=()=>window.gysPh.mcp;
 function fail(code,message,data){const e=new Error(message);e.cartError={error:code,err:message,...data};throw e;}
 const check=c=>{if(typeof c.check==='function')c.check();};
 async function read(c){check(c);const s=await phone().inspectScreen(160);check(c);if(!s||!s.ok||s.snapshotSchema!==2||!s.fingerprint)fail('page_unavailable','无法读取可靠页面');if(window.gyMeituan.classify(s).page==='human_required')fail('human_required','需要手动处理登录、验证或交易页面');return s;}
 async function tap(c,s,ref){check(c);c.accepted=true;const r=await phone().tapElement(s.token,ref,c.check);check(c);c.accepted=c.accepted||!!(r&&r.actionAccepted);if(!r||!r.ok||!r.snapshot)fail((r&&r.error)||'action_unverified',(r&&r.err)||'点击结果未确认，停止且不重复点击');return r.snapshot;}
 function button(s,names){const found=s.nodes.filter(n=>n.enabled&&n.clickable&&names.includes(text(n)));if(found.length!==1)fail('ambiguous_control','页面按钮缺失或不唯一，需要人工处理');return found[0].ref;}
 function requireStore(s,name){const m=menu(s);if(!m||m.store!==name)fail('store_unverified','无法确认仍在指定店铺');return m;}
 function saveMenu(s,m){const items=m.items.slice(0,6);cached={token:s.token,fingerprint:s.fingerprint,at:Date.now(),store:m.store,items};return {ok:true,store:m.store,token:s.token,items,truncated:m.items.length>items.length,note:'只列有明确加购或选规格按钮的可见商品；名称相同需人工确认'};}
 function selectedItem(m,args){const matches=m.items.filter(i=>i.name===args.name);if(matches.length!==1)fail('ambiguous_item','商品重名或已不在可识别列表中');return matches[0];}
 async function initial(c,args){const old=cached;if(!old||old.token!==args.token||old.store!==args.store||Date.now()-old.at>30000)fail('stale_snapshot','商品列表已过期，请重新读取菜单');if(!old.items.some(i=>i.ref===args.ref&&i.name===args.name))fail('item_not_identified','只能操作当前候选中名称和 ref 一致的商品');const s=await read(c);if(s.fingerprint!==old.fingerprint)fail('screen_changed','菜单已经变化，请重新读取');cached=null;const m=requireStore(s,args.store);return {s,item:selectedItem(m,args)};}
 async function panel(c,s,open){if(open&&cart(s)!==null)return s;return tap(c,s,button(s,open?['购物车','展开购物车']:['关闭购物车','收起购物车']));}
 function count(items,name,choices){const matches=items.filter(i=>i.name===name&&JSON.stringify(i.specs)===JSON.stringify(choices));if(matches.length>1)fail('ambiguous_cart','购物车同款存在多条记录，不能推测数量');return matches.length?matches[0].quantity:0;}
 async function run(checkFn,fn){const c={check:checkFn,accepted:false,verifiedAdded:0};try{check(c);return await fn(c);}catch(e){if(e.gyMcpStopped)throw e;return {ok:false,actionAccepted:c.accepted,verifiedAdded:c.verifiedAdded,...(e.cartError||{error:'adapter_error',err:'页面处理失败，请检查外部软件，不会重试'})};}}
 async function list(args,checkFn){return run(checkFn,async c=>{const s=await read(c),m=menu(s);if(!m)fail('unknown_menu','无法确认店铺或菜单被截断，请手动调整页面');return saveMenu(s,m);});}
 async function readCart(args,checkFn){return run(checkFn,async c=>{const s=await read(c),items=cart(s);if(items===null)fail('cart_not_visible','需要手动展开完整购物车后再读取');return {ok:true,token:s.token,items:items.slice(0,6),truncated:items.length>6,note:'数量来自可见购物车明细，尚未下单'};});}
 async function options(args,checkFn){return run(checkFn,async c=>{const cap=phone().capabilities();if(cap.readPermission!=='auto'||!cap.native||cap.native.pageSafety!==2)fail('permission_required','页面操作未授权或插件需要升级');let {s,item}=await initial(c,args);if(item.kind==='simple')return {...saveMenu(s,requireStore(s,args.store)),groups:[]};s=await tap(c,s,item.ref);const groups=specs(s);if(!groups||JSON.stringify(groups).length>2500)fail('unknown_specs','无法确认单选规格分组，需人工处理');s=await tap(c,s,button(s,['关闭规格','关闭选规格']));const m=requireStore(s,args.store);return {...saveMenu(s,m),groups:groups.map(g=>({name:g.name,required:g.required,options:g.options.map(o=>({name:o.name,enabled:o.enabled}))}))};});}
 async function add(args,checkFn){return run(checkFn,async c=>{
  const cap=phone().capabilities();if(cap.readPermission!=='auto'||!cap.native||cap.native.pageSafety!==2)fail('permission_required','页面操作未授权或插件需要升级');
  if(!Number.isSafeInteger(args.quantity)||args.quantity<1||args.quantity>5)fail('bad_quantity','单次加购数量必须为 1～5');
  const requested=args.specs||[];if(!Array.isArray(requested)||requested.some(x=>!x||typeof x.group!=='string'||typeof x.option!=='string')||new Set(requested.map(x=>x.group)).size!==requested.length)fail('bad_specs','规格分组不可重复，且需要明确名称');
  let {s}=await initial(c,args);s=await panel(c,s,true);let items=cart(s);if(items===null)fail('cart_unverified','加购前读不到完整购物车数量，停止操作');
  const choices=requested.map(x=>x.option).sort();let previous=count(items,args.name,choices);const before=previous;
  for(let i=0;i<args.quantity;i++){
   s=await panel(c,s,false);let item=selectedItem(requireStore(s,args.store),args);
   if(item.kind==='specs'){
    s=await tap(c,s,item.ref);let groups=specs(s);if(!groups)fail('unknown_specs','无法可靠识别单选规格，请人工处理');
    if(requested.some(x=>!groups.some(g=>g.name===x.group))||groups.some(g=>g.required&&!requested.some(x=>x.group===g.name)))fail('missing_specs','必选规格缺失或分组不存在，停止加购');
    // Never accept a default selection the user did not request.
    for(const g of groups)if(!requested.some(x=>x.group===g.name)&&g.options.some(o=>o.selected))fail('unspecified_default','有未指定的默认规格，需要用户明确选择');
    for(const wanted of requested){groups=specs(s);const group=groups&&groups.find(g=>g.name===wanted.group);const option=group&&group.options.find(o=>o.name===wanted.option&&o.enabled);if(!option)fail('option_unavailable','指定规格不存在或不可选');if(!option.selected)s=await tap(c,s,option.ref);}
    groups=specs(s);if(!groups||groups.some(g=>{const wanted=requested.find(x=>x.group===g.name);const selected=g.options.filter(o=>o.selected);return wanted?selected.length!==1||selected[0].name!==wanted.option:selected.length!==0;}))fail('selection_unverified','未确认规格选中状态，停止加购');
    s=await tap(c,s,button(s,['加入购物车','加购']));
   }else{if(requested.length)fail('unexpected_specs','当前商品没有可识别的规格入口，不能忽略用户要求');s=await tap(c,s,item.ref);}
   s=await panel(c,s,true);items=cart(s);if(items===null)fail('cart_unverified','已操作，但购物车数量未确认，不会重复点击');const after=count(items,args.name,choices);
   if(after!==previous+1)fail('quantity_unverified','购物车增量不符合预期，停止且不补点');previous=after;c.verifiedAdded++;
  }
  return {ok:true,store:args.store,name:args.name,specs:requested,beforeQuantity:before,afterQuantity:previous,verifiedAdded:c.verifiedAdded,actionAccepted:c.accepted,token:s.token,note:'购物车同款数量已核对；未提交订单，价格仍需结算页确认'};
 });}
 window.gyMeituanCart=Object.freeze({list,options,readCart,add,invalidate:()=>{cached=null;},parseMenu:menu,parseSpecs:specs,parseCart:cart});
})();
