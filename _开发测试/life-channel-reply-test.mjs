import {chromium} from 'playwright';
import {launchBrowser,fileUrl} from './_launch.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
const browser = await launchBrowser(chromium);
try {
    const page = await browser.newPage();
    await page.route(/^https?:\/\//, route => route.abort());
    await page.goto(fileUrl(path.resolve('index.html')));
    await page.waitForFunction(() => !!window.gyChannelReply);
    const checks = await page.evaluate(async () => {
        const a = {source:'qq',accountId:'acct',conversationId:'peer'};
        const b = {...a,source:'wechat'};
        myCharacters.push({id:'r1',name:'测试角色',persona:'人设甲'},{id:'r2',name:'测试角色',persona:'人设乙'});
        const prompts = [];
        window.getApiMain = () => ({key:'fixture'});
        window.callChatCompletionAPI = async (api,prompt) => { prompts.push(prompt); return {choices:[{message:{content:'文字草稿'}}]}; };
        const draft = (scope,roleId,context=[]) => gyChannelReply.draft({scope,roleId,text:'你好',context});
        const denied = async run => { try { await run(); return false; } catch(e) { return e.message.includes('授权'); } };
        const results = [await denied(() => draft(a,'r1'))];
        await gyLife.grant(a,'r1',['read','draft','cloud']);
        const row = {scope:a,roleId:'r1',role:'user',text:'已授权的历史'};
        results.push(await denied(() => draft(a,'r1',[row])), await denied(() => draft(b,'r1')), await denied(() => draft(a,'r2')), prompts.length===0);
        await gyLife.grant(a,'r1',['read','draft','cloud','remember']);
        const foreign = [{...row,scope:b},{...row,scope:{...a,accountId:'other'}},{...row,roleId:'r2'},{...row,scope:{...a,conversationId:'other'}}].map(r=>({...r,text:'其他会话正文'}));
        const d = await draft(a,'r1',[row,...foreign]);
        const prompt = JSON.stringify(prompts[0]);
        results.push(d.type==='text' && d.text==='文字草稿',prompt.includes('人设甲') && prompt.includes(row.text) && !prompt.includes('其他会话正文'));
        await gyLife.grant(b,'r2',['read','draft','cloud']);
        await draft(b,'r2',[row]);
        results.push(JSON.stringify(prompts[1]).includes('人设乙') && !JSON.stringify(prompts[1]).includes(row.text));
        window.callChatCompletionAPI = async () => { await gyLife.revoke(a,'r1'); return {choices:[{message:{content:'撤权后的草稿'}}]}; };
        results.push(await denied(() => draft(a,'r1')));
        return results;
    });
    assert(checks.every(Boolean),JSON.stringify(checks));
    const inboxChecks = await page.evaluate(async () => {
        const s={source:'wechat',accountId:'second-account',conversationId:'verified-peer'};
        const input={sourceId:'m1',ref:'wechat:m1',direction:'incoming'};
        const {bind,receive,pending}=gyLife.inbox;
        const fails=async (fn,code)=>{try{await fn();return false;}catch(e){return e.code===code;}};
        const out=[await fails(()=>receive(s,input),'unbound')];
        await gyLife.grant(s,'r1',['read','record']); await bind(s,'r1');
        const pair=await Promise.all([receive(s,input),receive(s,input)]);
        out.push(pair.filter(x=>x.duplicate).length===1,(await pending(s,'r1')).length===1);
        out.push(await fails(()=>pending(s,'r2'),'permission_denied'),await fails(()=>receive({...s,accountId:'different'},input),'unbound'));
        out.push((await receive(s,{...input,direction:'self'})).ignored,await fails(()=>receive(s,{...input,ref:'wechat:other'}),'event_conflict'));
        await gyLife.grant(s,'r2',['read','record']);
        out.push(await fails(()=>bind(s,'r2'),'binding_conflict'));
        await gyLife.revoke(s,'r1');out.push(await fails(()=>receive(s,input),'unbound'));
        await bind(s,'r2');out.push((await pending(s,'r2')).length===0,(await receive(s,input)).duplicate);
        await gyLife.forget(s);out.push(!(await gyLife.authorizations()).some(r=>r.scope.accountId===s.accountId));
        return out;
    });
    assert(inboxChecks.every(Boolean),JSON.stringify(inboxChecks));
    const paired = await page.evaluate(async () => {
        const scopes = ['qq-account-a','qq-account-b'].map(accountId => ({source:'qq',accountId,conversationId:'same-friend'}));
        const incoming = {sourceId:'same-id',ref:'qq:same-id',direction:'incoming'};
        const {bind,receive,pending} = gyLife.inbox;
        for (const [i,scope] of scopes.entries()) {
            await gyLife.grant(scope,'r'+(i+1),['read','record']);
            await bind(scope,'r'+(i+1));
        }
        const received = await Promise.all(scopes.map(scope => receive(scope,incoming)));
        const replay = await receive(scopes[0],incoming);
        await gyLife.revoke(scopes[0],'r1');
        const otherInbox = await pending(scopes[1],'r2');
        return [received.map(r => [r.roleId,r.duplicate]),replay.duplicate,otherInbox.length];
    });
    assert.deepEqual(paired,[[['r1',false],['r2',false]],true,1]);
    console.log('QQ dual-role inbox isolation passed');
    console.log(inboxChecks.length+' channel inbox checks passed');
    console.log(checks.length+' browser checks passed: real consent storage, role/account/conversation isolation, revoke during generation');
} finally { await browser.close(); }
