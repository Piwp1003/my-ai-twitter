import assert from 'node:assert/strict';
import { checkQQ, checkQQPair } from '../tools/qq-connection-check.mjs';

const ok = data => Response.json({ status: 'ok', retcode: 0, data });
const calls = [];
const request = async (url, options) => {
    calls.push(url);
    assert.equal(options.headers.Authorization, 'Bearer fixture');
    assert.equal(options.redirect, 'error');
    if (url.endsWith('/get_status')) return ok({ online: true, good: true });
    return ok({ user_id: 123456 });
};
assert.equal(await checkQQ({ request, token: 'fixture' }), '在线');
assert.deepEqual(calls, ['http://127.0.0.1:3000/get_status', 'http://127.0.0.1:3000/get_login_info']);
assert.match(await checkQQ({ request: async () => ok({ online: false }) }), /尚未报告在线/);
assert.match(await checkQQ({ request: async () => new Response('', { status: 401 }) }), /拒绝访问/);
assert.match(await checkQQ({ request: async () => new Response('unrelated service') }), /有效的 OneBot/);
assert.match(await checkQQ({ port: '65536' }), /有效端口/);
assert.match(await checkQQ({ request: async url => ok(url.endsWith('/get_status') ? { online: true } : {}) }), /有效的登录账号/);
const account = id => ({request: async url => ok(url.endsWith('/get_status') ? {online:true} : {user_id:id})});
assert.equal(await checkQQPair(account(123456), account(654321)), '两个独立 QQ 号在线');
assert.match(await checkQQPair(account(123456), account('123456')), /同一 QQ/);
assert.match(await checkQQPair(account(123456), {request: async () => ok({online:false})}), /角色 1：在线\n角色 2：.*尚未报告在线/);
console.log('QQ readiness checks passed, including two-account probes');
