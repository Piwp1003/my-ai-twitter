// Local personal ledger. Only explicitly confirmed rows enter its own IndexedDB.
(() => {
    const money=cents=>'¥'+(cents/100).toFixed(2);
    function normalizedTime(value) {
        const m=/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
        if(!m) return '';
        const [,year,month,day,hour,minute,second='00']=m;
        const date=new Date(Date.UTC(+year,+month-1,+day));
        if(date.getUTCFullYear()!==+year||date.getUTCMonth()+1!==+month||date.getUTCDate()!==+day||+hour>23||+minute>59||+second>59)return '';
        return year+'-'+month.padStart(2,'0')+'-'+day.padStart(2,'0')+' '+hour.padStart(2,'0')+':'+minute+':'+second;
    }
    function csv(text) {
        const rows = [];
        let row = [], field = '', quoted = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (c === '"') {
                if (quoted && text[i+1] === '"') { field += '"'; i++; }
                else quoted = !quoted;
            } else if (!quoted && c === ',') { row.push(field.trim()); field = ''; }
            else if (!quoted && (c === '\n' || c === '\r')) {
                if (c === '\r' && text[i+1] === '\n') i++;
                row.push(field.trim()); rows.push(row); row=[]; field='';
            } else field += c;
        }
        if (quoted) throw Error('CSV 引号未闭合，请检查文件。');
        row.push(field.trim()); rows.push(row);
        return rows;
    }
    function preview(text) {
        const rows = csv(text);
        const start = rows.findIndex(r=>r.includes('交易时间') && r.includes('收/支') && r.includes('交易对方'));
        if (start < 0) throw Error('未找到个人对账 CSV 的交易明细表头。');
        const header = rows[start];
        const wechat = header.includes('当前状态') && header.includes('交易单号');
        const alipay = header.includes('交易状态') && header.includes('交易订单号');
        if (wechat === alipay) throw Error('无法确认账单平台。');
        const columns = ['交易时间','收/支','交易对方',wechat?'当前状态':'交易状态',wechat?'交易单号':'交易订单号'];
        const indexes = columns.map(k=>header.indexOf(k));
        const amount = header.findIndex(k=>/^金额(?:[（(]元[）)])?$/.test(k));
        if (amount < 0) throw Error('缺少金额列。');
        const accepted = new Map(), conflicts = new Set();
        let review = 0, duplicates = 0;
        for (const row of rows.slice(start+1)) {
            if (row.every(v=>!v)) continue;
            const [time,kind,merchant,state,id] = indexes.map(i=>row[i] || '');
            const value = (row[amount] || '').replace(/^[¥￥]/,'');
            const timestamp=normalizedTime(time);
            const refund=['退款成功','退款到账'].includes(state) && kind==='收入';
            if (!timestamp || !id || !/^\d{1,9}(?:\.\d{1,2})?$/.test(value)
                || !['支出','收入'].includes(kind) || !(refund||['支付成功','交易成功','已收钱','收款成功'].includes(state))) { review++; continue; }
            const [whole,fraction=''] = value.split('.');
            const cents = Number(whole)*100 + Number(fraction.padEnd(2,'0'));
            if (!cents) { review++; continue; }
            const platform=wechat?'微信支付':'支付宝';
            const category=row[header.indexOf(wechat?'交易类型':'交易分类')] || '未分类';
            const item = {platform,id,time:timestamp,kind:refund?'退款':kind,merchant,cents,category};
            if (conflicts.has(id)) { review++; continue; }
            if (accepted.has(id)) {
                if (JSON.stringify(accepted.get(id)) === JSON.stringify(item)) duplicates++;
                else { accepted.delete(id); conflicts.add(id); review+=2; }
            } else accepted.set(id,item);
        }
        return {platform:wechat?'微信支付':'支付宝',items:[...accepted.values()],review,duplicates};
    }
    function ledger(items,annotation) {
        return new Promise((resolve,reject)=>{
            const open=indexedDB.open('gyRealLedger',1);
            open.onupgradeneeded=()=>open.result.createObjectStore('bills',{keyPath:['platform','id']});
            open.onerror=()=>reject(open.error);
            open.onsuccess=()=>{
                const db=open.result,tx=db.transaction('bills',items?'readwrite':'readonly'),store=tx.objectStore('bills');
                let result={added:0,duplicates:0,conflicts:0,newBills:[]};
                tx.oncomplete=()=>{db.close();resolve(result)};
                tx.onabort=()=>{db.close();reject(tx.error||Error('本地事务中断'))};
                if(!items){const q=store.getAll();q.onsuccess=()=>{result=q.result};return}
                for(const item of items){
                    const q=store.get([item.platform,item.id]);
                    q.onsuccess=()=>{
                        const old=q.result;
                        if(annotation){
                            if(old&&!old.annotation&&annotation.allowed()){store.put({...old,annotation:annotation.note});result.added++}
                        }
                        else if(!old){store.add(item);result.added++;result.newBills.push(item)}
                        else if((old.fromNotice||item.fromNotice)&&old.kind===item.kind&&old.cents===item.cents){
                            if(old.fromNotice&&!item.fromNotice)store.put({...old,...item,fromNotice:false});
                            result.duplicates++;
                        }
                        else if(['time','kind','merchant','cents'].every(k=>old[k]===item[k]))result.duplicates++;
                        else result.conflicts++;
                    };
                }
            };
        });
    }
    function node(tag,text){const e=document.createElement(tag);e.textContent=text;return e}
    function mount() {
        const anchor = document.getElementById('setVersionLine');
        if (!anchor || document.getElementById('gyBillPreview')) return;
        const panel = document.createElement('details');
        panel.id='gyBillPreview';
        panel.style.cssText='margin:12px auto;padding:8px;max-width:600px';
        panel.innerHTML=`<summary>现实账本</summary><p>选择个人对账 CSV，勾选并确认后保存到这台设备。</p><input type="file" accept=".csv,text/csv" aria-label="选择个人对账 CSV"><p role="status"></p><ol></ol>
            <button data-save hidden>确认所选入账</button> <button data-clear hidden>清除待处理</button>
            <fieldset data-mobile hidden><legend>安卓支付提醒</legend><label><input type="checkbox" data-listen> 在本机识别微信支付、支付宝的支付提醒</label>
            <button data-permission>通知读取设置</button><button data-check>核对待处理提醒</button><small data-mobile-status role="status"></small></fieldset>
            <fieldset><legend>入账点评</legend><label>角色 <select data-writer></select></label>
            <label><input type="checkbox" data-auto> 新账入账时附上角色点评</label>
            <small style="display:block">开启后，每笔新账调用一次主 API，发送角色人设和该笔的收支类型、金额、分类。</small>
            <small data-note-status aria-live="polite"></small></fieldset>
            <section><h3>收支报表</h3><label>周期 <select data-period><option value="day">日结</option><option value="month" selected>月结</option><option value="year">年结</option></select></label>
            <button data-prev aria-label="上一期">‹</button><input type="date" data-date aria-label="报表日期"><button data-next aria-label="下一期">›</button>
            <p><label>平台 <select data-platform><option value="">全部平台</option><option>微信支付</option><option>支付宝</option></select></label>
            <label>分类 <select data-category></select></label></p><strong data-heading></strong><div data-summary></div><p data-compare></p><div data-breakdown></div><div data-rows></div></section>
            <dialog data-ticket aria-label="记账小票"><small>谷雨账房 · 记账小票</small><h3></h3><dl></dl><button>关闭小票</button></dialog>`;
        anchor.before(panel);
        const get=k=>panel.querySelector('[data-'+k+']');
        const input=panel.querySelector('input'), status=panel.querySelector('p[role]'), list=panel.querySelector('ol');
        let generation=0, records=[], pending=[];
        const prefKey='gyRealLedgerCommentV1';
        let prefVersion=0;
        function preferences(){
            try{return JSON.parse(localStorage.getItem(prefKey))||{}}catch{return {}}
        }
        function loadWriter(){
            const p=preferences(),roles=typeof myCharacters==='undefined'?[]:myCharacters;
            get('writer').replaceChildren(new Option('选择角色',''),...roles.map(c=>new Option(c.name,String(c.id))));
            get('writer').value=p.role||'';
            get('auto').disabled=!get('writer').value;
            get('auto').checked=!get('auto').disabled&&p.enabled===true;
        }
        function saveWriter(){
            prefVersion++;
            try{localStorage.setItem(prefKey,JSON.stringify({role:get('writer').value,enabled:get('auto').checked}))}
            catch{get('auto').checked=false;get('note-status').textContent='无法保存设置，已关闭点评。'}
        }
        get('writer').onchange=()=>{get('auto').checked=false;get('auto').disabled=!get('writer').value;saveWriter()};
        get('auto').onchange=saveWriter;
        window.addEventListener('storage',e=>{if(e.key===prefKey||e.key===null){prefVersion++;loadWriter()}});
        async function makeNote(api,role,bill){
            const messages=[
                {role:'system',content:'按给定角色的口吻为一笔真实账目写一句简短中文批注。只输出批注，避免猜测商品、商户或消费原因。'},
                {role:'user',content:JSON.stringify({角色:role.name,人设:String(role.persona||'').slice(0,2000),类型:bill.kind,金额:money(bill.cents),分类:bill.category.slice(0,80)})}
            ];
            const response=await callChatCompletionAPI(api,messages,0);
            const content=response?.choices?.[0]?.message?.content;
            if(typeof content!=='string'||!content.trim())throw Error('未收到点评文字');
            return {roleId:String(role.id),name:role.name,text:content.trim().slice(0,500)};
        }
        async function annotate(bills,role,version){
            const allowed=()=>version===prefVersion&&get('auto').checked&&preferences().enabled===true&&preferences().role===String(role.id)
                &&myCharacters.includes(role);
            let written=0;
            try{
                const api=getApiMain();
                if(!api?.key)throw Error('未配置主 API');
                for(const bill of bills){
                    if(!allowed())break;
                    const note=await makeNote(api,role,bill);
                    if(!allowed())break;
                    const saved=await ledger([bill],{note,allowed});written+=saved.added;
                }
                get('note-status').textContent='已保存 '+written+' / '+bills.length+' 条点评。';
            }catch{get('note-status').textContent='账目已保存；点评中断，已完成 '+written+' 条。请检查主 API 设置。'}
        }
        function connectMobile(){
            if(!window.plus?.android || !get('mobile').hidden)return;
            try{
                const android=plus.android,ctx=android.runtimeMainActivity();
                const bridge=android.importClass('com.guyu.guard.BillReminder'),guard=android.importClass('com.guyu.guard.Guard');
                if(typeof bridge?.enabled!=='function')return;
                const hint=get('mobile-status'),check=get('check');
                function sync(){
                    const on=bridge.enabled(ctx);
                    get('listen').checked=on;
                    const rows=String(bridge.pending(ctx)||'').split('\n').filter(Boolean);
                    hint.textContent=on?(guard.notifyOn()?'待核对 '+rows.length+' 条':'请在系统设置中授权谷雨读取通知'):'已关闭';
                    check.disabled=!on||!rows.length;return rows;
                }
                async function inspect(){
                    if(check.dataset.busy)return;
                    const row=sync()[0];if(!row)return;
                    check.dataset.busy='1';
                    try{
                        const [platform,kind,value,stamp,id]=row.split('|'),date=new Date(Number(stamp));
                        const time=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,19).replace('T',' ');
                        const bill={platform,kind,cents:Number(value),id,time,category:'未分类',merchant:'支付提醒',fromNotice:true};
                        const version=prefVersion,setting=preferences();
                        const role=setting.enabled&&myCharacters.find(c=>String(c.id)===setting.role);
                        const permitted=()=>prefVersion===version&&preferences().enabled===true&&preferences().role===setting.role&&myCharacters.includes(role);
                        const existing=id&&(await ledger()).find(b=>b.platform===platform&&b.id===id);
                        if(id&&!existing&&role&&permitted()&&getApiMain()?.key){
                            try{bill.annotation=await makeNote(getApiMain(),role,bill)}catch{}
                            if(!permitted())delete bill.annotation;
                        }
                        if(!bridge.enabled(ctx)||!String(bridge.pending(ctx)).split('\n').includes(row))return;
                        const text=platform+' · '+kind+' '+money(bill.cents)+'\n'+time+
                            (id?'\n交易单号 '+id:'\n提醒未提供交易单号，请导入账单核对。')+
                            (bill.annotation?'\n\n'+bill.annotation.name+'：'+bill.annotation.text:'');
                        const action=await new Promise(resolve=>plus.nativeUI.confirm(text,e=>resolve(e.index),'谷雨 · 核对支付提醒',id?['稍后','记入账本','忽略']:['稍后','忽略']));
                        if(!bridge.enabled(ctx))return;
                        if(id&&action===1){
                            if(bill.annotation&&!permitted())delete bill.annotation;
                            const tally=await ledger([bill]);
                            if(tally.conflicts){hint.textContent='同单号已有不同金额或方向，提醒已保留，请核对账单。';return}
                            bridge.dismiss(ctx,row);sync();hint.textContent=tally.added?'已记入账本':'已在账本中';get('date').value=time.slice(0,10);await refresh();
                        }else if(action===(id?2:1)){bridge.dismiss(ctx,row);sync()}
                    }catch{hint.textContent='核对中断，请检查账本和待处理提醒。'}finally{delete check.dataset.busy}
                }
                get('listen').onchange=()=>{bridge.enable(ctx,get('listen').checked);sync()};
                get('permission').onclick=()=>guard.openSettings(ctx,'notify');
                check.onclick=inspect;get('mobile').hidden=false;sync();
                function activated(){
                    sync();
                    if(bridge.takeLaunch(ctx)){loadWriter();inspect()}
                }
                document.addEventListener('resume',activated);
                document.addEventListener('newintent',activated);
                panel.addEventListener('toggle',()=>{if(panel.open)sync()});
                activated();
            }catch{}
        }
        document.addEventListener('plusready',connectMobile);
        const today=new Date();
        get('date').value=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
        const ticket=get('ticket');
        ticket.querySelector('button').onclick=()=>ticket.close();
        function showTicket(b){
            ticket.querySelector('h3').textContent=b.merchant||'交易详情';
            const dl=ticket.querySelector('dl');dl.replaceChildren();
            for(const [k,v] of [['交易时间',b.time],['平台',b.platform],['交易单号',b.id],['分类',b.category],[b.kind+'合计',money(b.cents)]])
                dl.append(node('dt',k),node('dd',v));
            if(b.annotation)dl.append(node('dt',b.annotation.name+'的点评'),node('dd',b.annotation.text));
            ticket.showModal();
        }
        function shifted(step){
            const date=new Date(get('date').value+'T12:00:00Z'),unit=get('period').value;
            if(unit==='day')date.setUTCDate(date.getUTCDate()+step);
            if(unit==='month'){date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+step)}
            if(unit==='year'){date.setUTCMonth(0,1);date.setUTCFullYear(date.getUTCFullYear()+step)}
            return date.toISOString().slice(0,10);
        }
        function report(){
            if(!get('date').value)return;
            const size={day:10,month:7,year:4}[get('period').value],key=get('date').value.slice(0,size);
            const filtered=records.filter(b=>(!get('platform').value||b.platform===get('platform').value)&&(!get('category').value||b.category===get('category').value));
            const rows=filtered.filter(b=>b.time.startsWith(key)).sort((a,b)=>b.time.localeCompare(a.time));
            const prior=filtered.filter(b=>b.time.startsWith(shifted(-1).slice(0,size)));
            const sum=(rows,k)=>rows.reduce((v,b)=>v+(b.kind===k?b.cents:0),0);
            const expense=sum(rows,'支出'),income=sum(rows,'收入'),refund=sum(rows,'退款');
            get('heading').textContent=key+' · '+rows.length+' 笔已入账';
            get('summary').textContent='支出 '+money(expense)+'　收入 '+money(income)+'　退款 '+money(refund)+'　结余 '+money(income+refund-expense);
            const delta=expense-sum(prior,'支出');
            get('compare').textContent=prior.length?'较上期支出'+(delta===0?'持平':(delta>0?'增加 ':'减少 ')+money(Math.abs(delta))):'上期无匹配记录';
            const cats=new Map();
            for(const b of rows)if(b.kind==='支出')cats.set(b.category,(cats.get(b.category)||0)+b.cents);
            get('breakdown').replaceChildren(...[...cats].sort((a,b)=>b[1]-a[1]).map(([k,v])=>node('p',k+' · '+money(v)+'（'+Math.round(100*v/expense)+'%）')));
            get('rows').replaceChildren(...rows.map(b=>{const btn=node('button',b.merchant+' · '+b.kind+' '+money(b.cents)+' ›');btn.onclick=()=>showTicket(b);return btn}));
        }
        async function refresh(){
            const data=await ledger();
            if(!panel.open)return;
            records=data;
            const category=get('category').value,categories=[...new Set(data.map(b=>b.category))].sort();
            get('category').replaceChildren(new Option('全部分类',''),...categories.map(v=>new Option(v,v)));
            if(categories.includes(category))get('category').value=category;
            report();
        }
        for(const k of ['period','date','platform','category'])get(k).onchange=report;
        for(const [k,i] of [['prev',-1],['next',1]])get(k).onclick=()=>{if(get('date').value){get('date').value=shifted(i);report()}};
        function clear(){generation++;pending=[];input.value='';list.replaceChildren();status.textContent='';get('save').hidden=get('clear').hidden=true}
        get('clear').onclick=clear;
        get('save').onclick=async()=>{
            const boxes=Array.from(list.querySelectorAll('input:checked'));
            const selected=boxes.map(box=>pending[Number(box.value)]);
            if(!selected.length){status.textContent='请先勾选要保存的账单。';return}
            const ticket=generation;
            const role=get('auto').checked&&myCharacters.find(c=>String(c.id)===get('writer').value);
            const version=prefVersion;
            get('note-status').textContent='';
            get('save').disabled=true;
            try{
                const tally=await ledger(selected);
                if(ticket===generation){
                    boxes.forEach(box=>{box.disabled=true;box.checked=false});
                    status.textContent='已入账 '+tally.added+' 笔，重复 '+tally.duplicates+' 笔，同单号冲突 '+tally.conflicts+' 笔。';
                    get('date').value=selected.reduce((v,b)=>v>b.time?v:b.time,'').slice(0,10);
                }
                await refresh();
                if(role&&tally.newBills.length){
                    get('note-status').textContent='账目已保存，正在生成点评…';
                    await annotate(tally.newBills,role,version);
                    await refresh();
                }
            }catch(e){status.textContent='本地账本读取或写入失败，请重新打开核对。'}finally{get('save').disabled=false}
        };
        panel.ontoggle=()=>{if(panel.open){loadWriter();refresh().catch(()=>status.textContent='本地账本无法读取。')}else{clear();records=[];get('rows').replaceChildren()}};
        input.onchange=async()=>{
            const ticket=++generation,file=input.files[0];
            pending=[];get('save').hidden=get('clear').hidden=true;list.replaceChildren();status.textContent='';
            if (!file) return;
            try {
                if(file.size>5*1024*1024) throw Error('文件超过 5 MB，请缩小导出时间范围。');
                const bytes=await file.arrayBuffer();
                if(ticket!==generation || !panel.open) return;
                let text;
                try {text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
                catch {text=new TextDecoder('gb18030').decode(bytes);}
                const result=preview(text);
                pending=result.items;get('save').hidden=!pending.length;get('clear').hidden=false;
                status.textContent=result.platform+' · 可识别 '+result.items.length+' 笔，待核对 '+result.review+' 行，重复 '+result.duplicates+' 行。';
                for(const [i,item] of pending.entries()){
                    const li=document.createElement('li');
                    const box=node('input','');box.type='checkbox';box.value=String(i);
                    const label=node('label','');label.append(box,item.time+'　'+item.kind+' '+money(item.cents)+'　'+item.merchant);li.append(label);
                    list.append(li);
                }
            } catch(e){if(ticket===generation)status.textContent=e.message;}
        };
        connectMobile();
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();
