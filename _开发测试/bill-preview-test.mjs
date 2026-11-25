import { chromium } from 'playwright';
import { launchBrowser,fileUrl } from './_launch.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
const browser=await launchBrowser(chromium);
try {
    const page=await browser.newPage();
    await page.route(/^https?:/,r=>r.abort());
    await page.goto(fileUrl(path.resolve('index.html')));
    const panel=page.locator('#gyBillPreview');
    await panel.waitFor({state:'attached'});
    await panel.evaluate(el=>el.open=true);
    async function upload(text){
        await panel.locator('input[type=file]').setInputFiles({name:'fixture.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
        await page.waitForFunction(()=>document.querySelector('#gyBillPreview [role=status]').textContent.length>0);
        return panel.locator('p[role=status]').textContent();
    }
    const header='交易时间,收/支,交易对方,当前状态,交易单号,金额(元)';
    const row='2026-11-25 09:00:00,支出,"小店,一号",支付成功,001,￥4.17';
    assert.match(await upload([header,row,row,row.replace('001','002'),row.replace('001','003'),row.replace('001','003').replace('4.17','7.00'),row.replace('支付成功','已退款')].join('\r\n')),/微信支付 · 可识别 2 笔，待核对 3 行，重复 1 行/);
    assert.match(await panel.locator('li').first().textContent(),/4.17.*小店,一号/);
    await panel.locator('input[type=file]').setInputFiles([]);
    assert.match(await upload(header.replace('当前状态','交易状态').replace('交易单号','交易订单号')+'\n'+row.replace('支付成功','交易成功')),/支付宝 · 可识别 1 笔/);
    const selectAndSave=async()=>{
        await page.waitForFunction(()=>!document.querySelector('#gyBillPreview [data-save]').disabled);
        await panel.locator('ol input').first().evaluate(el=>el.checked=true);
        await panel.locator('[data-save]').evaluate(el=>el.click());
        await page.waitForFunction(()=>document.querySelector('#gyBillPreview [role=status]').textContent.startsWith('已入账'));
    };
    await selectAndSave();
    await page.waitForFunction(()=>document.querySelector('#gyBillPreview [data-summary]').textContent.includes('支出 ¥4.17'));
    await upload(header.replace('当前状态','交易状态').replace('交易单号','交易订单号')+'\n'+row.replace('支付成功','交易成功'));
    await selectAndSave();
    assert.match(await panel.locator('p[role=status]').innerText(),/重复 1 笔/);
    await panel.evaluate(el=>el.open=false);
    await page.waitForFunction(()=>!document.querySelector('#gyBillPreview li'));
    await page.reload();
    await panel.evaluate(el=>el.open=true);
    await panel.locator('[data-date]').evaluate(el=>{el.value='2026-11-25';el.dispatchEvent(new Event('change'))});
    for(const range of ['day','month','year']){
        await panel.locator('[data-period]').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('change'))},range);
        await page.waitForFunction(()=>document.querySelector('#gyBillPreview [data-rows]').children.length===1);
        assert.match(await panel.locator('[data-summary]').textContent(),/支出 ¥4.17/);
    }
    await panel.locator('[data-rows] button').evaluate(el=>el.click());
    assert.match(await panel.locator('dialog dl').textContent(),/交易单号001/);
    await panel.locator('dialog').evaluate(el=>el.close());
    await upload(header+'\n'+row.replace('支付成功','退款到账').replace('支出','收入').replace('09:00','10:00'));
    await selectAndSave();
    await page.waitForFunction(()=>document.querySelector('#gyBillPreview [data-summary]').textContent.includes('退款 ¥4.17'));
    await upload(header+'\n'+row.replace('支付成功','退款到账').replace('支出','收入').replace('4.17','8.00'));
    await selectAndSave();
    assert.match(await panel.locator('p[role=status]').textContent(),/冲突 1 笔/);
    await panel.locator('[data-platform]').evaluate(el=>{el.value='支付宝';el.dispatchEvent(new Event('change'))});
    assert.match(await panel.locator('[data-summary]').textContent(),/退款 ¥0.00/);
    await panel.locator('[data-prev]').evaluate(el=>el.click());
    assert.match(await panel.locator('[data-heading]').textContent(),/2025 · 0 笔/);
    await page.evaluate(()=>{
        myCharacters.push({id:'book-role',name:'测试执笔',persona:'简洁'});
        window.billPrompts=[];
        window.getApiMain=()=>({key:'fixture'});
        window.callChatCompletionAPI=async(api,messages)=>{billPrompts.push(messages);return {choices:[{message:{content:'这笔已记好。'}}]}};
    });
    await panel.evaluate(el=>el.open=false);
    await page.waitForFunction(()=>!document.querySelector('#gyBillPreview li'));
    await panel.evaluate(el=>el.open=true);
    await page.waitForFunction(()=>document.querySelector('#gyBillPreview [data-writer] option[value="book-role"]'));
    await panel.locator('[data-writer]').evaluate(el=>{el.value='book-role';el.dispatchEvent(new Event('change'))});
    const add=async(id)=>{await upload(header+'\n'+row.replace('001',id));await selectAndSave();await page.waitForFunction(()=>!document.querySelector('#gyBillPreview [data-save]').disabled)};
    await add('off-order');
    assert.equal(await page.evaluate(()=>billPrompts.length),0);
    await panel.locator('[data-auto]').evaluate(el=>el.click());
    await add('private-order');
    await add('private-order');
    const prompts=await page.evaluate(()=>billPrompts);
    assert.equal(prompts.length,1);
    assert.doesNotMatch(JSON.stringify(prompts),/private-order|小店/);
    assert.match(JSON.stringify(prompts),/4\.17/);
    await panel.locator('[data-platform]').evaluate(el=>{el.value='微信支付';el.dispatchEvent(new Event('change'))});
    const buttons=panel.locator('[data-rows] button');
    let found=false;
    for(const button of await buttons.all()){
        await button.evaluate(el=>el.click());
        const details=await panel.locator('dialog dl').textContent();
        if(details.includes('private-order')){assert.match(details,/测试执笔的点评这笔已记好/);found=true}
        await panel.locator('dialog').evaluate(el=>el.close());
    }
    assert(found);
    await page.evaluate(()=>window.callChatCompletionAPI=async()=>{throw Error('offline')});
    await add('offline-order');
    assert.match(await panel.locator('[data-note-status]').textContent(),/账目已保存；点评中断/);
    await page.evaluate(()=>window.callChatCompletionAPI=()=>new Promise(resolve=>window.finishBillNote=resolve));
    await upload(header+'\n'+row.replace('001','revoked-order'));await selectAndSave();
    await page.waitForFunction(()=>typeof window.finishBillNote==='function');
    await panel.locator('[data-auto]').evaluate(el=>el.click());
    await page.evaluate(()=>finishBillNote({choices:[{message:{content:'迟到的点评'}}]}));
    await page.waitForFunction(()=>!document.querySelector('#gyBillPreview [data-save]').disabled);
    assert.match(await panel.locator('[data-note-status]').textContent(),/已保存 0 \/ 1/);
    await page.evaluate(()=>{
        let rows=['微信支付|支出|1250|1795561200000|abc12345','支付宝|收入|100|1795561200000|'];
        const bridge={enabled:()=>true,pending:()=>rows.join('\n'),takeLaunch:()=>false,dismiss:(_,r)=>{rows=rows.filter(v=>v!==r);return true}};
        window.billDialogs=[];
        window.plus={android:{runtimeMainActivity:()=>({}),importClass:name=>name.endsWith('BillReminder')?bridge:{notifyOn:()=>true}},
            nativeUI:{confirm:(text,cb,title,buttons)=>{billDialogs.push({text,buttons});cb({index:1})}}};
        document.dispatchEvent(new Event('plusready'));
    });
    await panel.locator('[data-check]').evaluate(el=>el.click());
    await page.waitForFunction(()=>document.querySelector('[data-mobile-status]').textContent==='已记入账本');
    await panel.locator('[data-check]').evaluate(el=>el.click());
    await page.waitForFunction(()=>billDialogs.length===2);
    const dialogs=await page.evaluate(()=>billDialogs);
    assert.match(dialogs[0].text,/12.50/);
    assert.deepEqual(dialogs[1].buttons,['稍后','忽略']);
    console.log('PASS real ledger import, duplicate protection, persistence, periods and receipt');
} finally {await browser.close();}
