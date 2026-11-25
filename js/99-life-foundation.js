// Local consent and event references. Trusted application code only: never expose grant/forget as model tools.
(function () {
    'use strict';
    if (window.gyLife) return;
    const DB = 'gyLifePrivateV1', EVENT_LIMIT = 500, GRANT_LIMIT = 100;
    const SOURCES = new Set(['guyu', 'qq', 'wechat', 'wechat_pay', 'alipay', 'meituan', 'taobao', 'jd']);
    const RIGHTS = new Set(['read', 'record', 'draft', 'send', 'remember', 'diary', 'cloud']);
    const PURPOSES = new Set(['read', 'remember', 'diary', 'cloud']);
    const KINDS = Object.freeze({ 'chat.received': 'read', 'chat.draft': 'draft', 'chat.sent': 'send', 'payment.observed': 'read', 'order.observed': 'read', 'diary.draft': 'diary' });
    let opening = null;
    function error(code, message) { const e = new Error(message); e.code = code; return e; }
    function exact(value, keys) {
        if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).some(k => !keys.includes(k)))
            throw error('invalid_input', '参数包含未支持的字段');
    }
    function id(value) {
        if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,159}$/.test(value))
            throw error('invalid_identity', '需要稳定的账号、会话或角色 ID，不支持通配范围');
        return value;
    }
    function scopeOf(value) {
        exact(value, ['source', 'accountId', 'conversationId']);
        if (!SOURCES.has(value.source)) throw error('invalid_source', '未支持的事件来源');
        return { source: value.source, accountId: id(value.accountId), conversationId: id(value.conversationId) };
    }
    const scopeKey = s => JSON.stringify([s.source, s.accountId, s.conversationId]);
    const grantKey = (s, role) => JSON.stringify([s.source, s.accountId, s.conversationId, role]);
    function open() {
        if (opening) return opening;
        opening = new Promise((resolve, reject) => {
            let request, finished = false, timer;
            const fail = code => { if (!finished) { finished = true; clearTimeout(timer); reject(error(code, '本地授权存储不可用，操作未放行')); } };
            try { request = indexedDB.open(DB, 2); } catch (e) { fail('storage_unavailable'); return; }
            timer = setTimeout(() => fail('storage_timeout'), 10000);
            request.onupgradeneeded = () => {
                const db = request.result;
                for (const name of ['grants', 'events','bindings','inbox']) {
                    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'key' }).createIndex('byScope', 'scopeKey');
                }
            };
            request.onerror = () => fail('storage_unavailable');
            request.onblocked = () => fail('storage_blocked');
            request.onsuccess = () => {
                if (finished) { request.result.close(); return; }
                finished = true; clearTimeout(timer);
                const db = request.result;
                db.onversionchange = () => { db.close(); opening = null; };
                resolve(db);
            };
        });
        // Retain a failed promise: failure must not silently become an empty permission store.
        opening.catch(() => {});
        return opening;
    }
    const read = request => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(error('storage_failed', '本地记录读取失败')); });
    async function transaction(names, mode, work) {
        const db = await open();
        return new Promise((resolve, reject) => {
            let tx, result, problem;
            try { tx = db.transaction(names, mode); } catch (e) { reject(error('storage_failed', '本地事务未开始')); return; }
            tx.oncomplete = () => resolve(result);
            tx.onabort = () => reject(problem || error('storage_failed', '本地事务失败，操作未确认'));
            tx.onerror = () => {};
            try {
                Promise.resolve(work(tx)).then(value => { result = value; }, e => { problem = e && typeof e.code === 'string' ? e : error('storage_failed', '本地事务失败，操作未确认'); try { tx.abort(); } catch (e2) { reject(problem); } });
            } catch (e) { problem = e && typeof e.code === 'string' ? e : error('storage_failed', '本地事务失败，操作未确认'); tx.abort(); }
        });
    }
    function permitted(grant, s, role, rights) {
        return !!(grant && grant.schema === 1 && grant.key === grantKey(s, role) && grant.scopeKey === scopeKey(s)
            && Array.isArray(grant.permissions) && grant.permissions.every(p => RIGHTS.has(p))
            && Number.isSafeInteger(grant.expiresAt) && (grant.expiresAt === 0 || grant.expiresAt > Date.now())
            && rights.every(p => grant.permissions.includes(p)));
    }
    async function authorize(tx, s, role, rights) {
        const grant = await read(tx.objectStore('grants').get(grantKey(s, role)));
        if (!permitted(grant, s, role, rights)) throw error('permission_denied', '该角色未获本会话的指定用途授权，或授权已到期');
        return grant;
    }
    function notify() { try { window.dispatchEvent(new CustomEvent('gy-life-change')); } catch (e) {} }
    async function grant(scope, roleId, permissions, options = {}) {
        const s = scopeOf(scope), role = id(roleId); exact(options, ['expiresAt']);
        if (!Array.isArray(permissions) || !permissions.length || permissions.length > RIGHTS.size
            || permissions.some(p => !RIGHTS.has(p)) || new Set(permissions).size !== permissions.length)
            throw error('invalid_permissions', '需要明确选择支持的授权项');
        const expiresAt = options.expiresAt === undefined ? 0 : options.expiresAt;
        if (!Number.isSafeInteger(expiresAt) || (expiresAt !== 0 && expiresAt <= Date.now())) throw error('invalid_expiry', '授权到期时间无效');
        const value = { schema: 1, key: grantKey(s, role), scopeKey: scopeKey(s), permissions: permissions.slice().sort(), expiresAt, updatedAt: Date.now() };
        await transaction(['grants'], 'readwrite', async tx => {
            const store = tx.objectStore('grants');
            if (!(await read(store.get(value.key))) && await read(store.count()) >= GRANT_LIMIT) throw error('grant_capacity', '授权数量已达上限，请先撤销不用的授权');
            await read(store.put(value));
        });
        notify(); return { permissions: value.permissions.slice(), expiresAt };
    }
    async function allowed(scope, roleId, purpose) {
        return allowedAll(scope, roleId, [purpose]);
    }
    async function allowedAll(scope, roleId, purposes) {
        const s = scopeOf(scope), role = id(roleId);
        if (!Array.isArray(purposes) || !purposes.length || purposes.some(p => !RIGHTS.has(p))) throw error('invalid_purpose', '未支持的授权用途');
        const rights = purposes.slice();
        return transaction(['grants'], 'readonly', async tx => permitted(await read(tx.objectStore('grants').get(grantKey(s, role))), s, role, rights));
    }
    async function append(scope, roleId, input) {
        const s = scopeOf(scope), role = id(roleId); exact(input, ['sourceId', 'kind', 'occurredAt', 'ref']);
        const sourceId = id(input.sourceId), kind = input.kind;
        if (!Object.prototype.hasOwnProperty.call(KINDS, kind) || !Number.isSafeInteger(input.occurredAt) || input.occurredAt <= 0
            || typeof input.ref !== 'string' || !/^[a-z][a-z0-9_-]{0,31}:[A-Za-z0-9._-]{1,128}$/.test(input.ref))
            throw error('invalid_event', '事件需要明确类型、毫秒时间和本地数据引用，不能放入正文');
        const value = { schema: 1, key: JSON.stringify([s.source, s.accountId, s.conversationId, kind, sourceId]), scopeKey: scopeKey(s), sourceId, kind, occurredAt: input.occurredAt, ref: input.ref };
        const result = await transaction(['grants', 'events'], 'readwrite', async tx => {
            await authorize(tx, s, role, ['read', 'record', KINDS[kind]]);
            const store = tx.objectStore('events'), previous = await read(store.get(value.key));
            if (previous) {
                if (previous.ref !== value.ref) throw error('event_conflict', '同一来源事件对应了不同记录，请先核对');
                return { duplicate: true, event: previous };
            }
            if (await read(store.count()) >= EVENT_LIMIT) throw error('event_capacity', '事件记录已达上限，未删除旧记录，请先管理存档');
            await read(store.add(value)); return { duplicate: false, event: value };
        });
        if (!result.duplicate) notify(); return result;
    }
    async function list(scope, roleId, purpose) {
        const s = scopeOf(scope), role = id(roleId);
        if (!PURPOSES.has(purpose)) throw error('invalid_purpose', '读取记录时须指定 read、remember、diary 或 cloud 用途');
        return transaction(['grants', 'events'], 'readonly', async tx => {
            await authorize(tx, s, role, ['read', purpose]);
            return (await read(tx.objectStore('events').index('byScope').getAll(scopeKey(s))))
                .sort((a, b) => a.occurredAt - b.occurredAt || a.key.localeCompare(b.key));
        });
    }
    async function revoke(scope, roleId) {
        const s = scopeOf(scope), role = id(roleId);
        await transaction(['grants','bindings'], 'readwrite', async tx => {
            await read(tx.objectStore('grants').delete(grantKey(s, role)));
            const store = tx.objectStore('bindings'), key = scopeKey(s);
            if ((await read(store.get(key)))?.roleId === role) await read(store.delete(key));
        });
        notify();
    }
    async function forget(scope) {
        const s = scopeOf(scope);
        await transaction(['grants', 'events','bindings','inbox'], 'readwrite', async tx => {
            for (const name of ['grants', 'events','bindings','inbox']) {
                const store = tx.objectStore(name), keys = await read(store.index('byScope').getAllKeys(scopeKey(s)));
                for (const key of keys) await read(store.delete(key));
            }
        });
        notify();
    }
    async function status() {
        try { return await transaction(['grants', 'events'], 'readonly', async tx => ({ ready: true, grants: await read(tx.objectStore('grants').count()), events: await read(tx.objectStore('events').count()), eventLimit: EVENT_LIMIT, grantLimit: GRANT_LIMIT })); }
        catch (e) { return { ready: false, error: e.code || 'storage_failed' }; }
    }
    // Owner settings only; includes revoked scopes with retained references so they remain deletable.
    async function authorizations() {
        return transaction(['grants', 'events','bindings','inbox'], 'readonly', async tx => {
            const grants = await read(tx.objectStore('grants').getAll());
            const events = await read(tx.objectStore('events').getAll());
            const scopes = new Map();
            function entry(key) {
                if (scopes.has(key)) return scopes.get(key);
                const parts = JSON.parse(key);
                if (!Array.isArray(parts) || parts.length !== 3) throw error('invalid_identity', '授权范围记录异常');
                const scope = scopeOf({ source: parts[0], accountId: parts[1], conversationId: parts[2] });
                const row = { scope, grants: [], eventCount: 0 }; scopes.set(key, row); return row;
            }
            for (const g of grants) {
                const row = entry(g.scopeKey), parts = JSON.parse(g.key), roleId = id(parts[3]);
                if (parts.length !== 4 || grantKey(row.scope, roleId) !== g.key || g.schema !== 1
                    || !Array.isArray(g.permissions) || g.permissions.some(p => !RIGHTS.has(p))
                    || !Number.isSafeInteger(g.expiresAt) || g.expiresAt < 0) throw error('invalid_input', '授权记录异常');
                row.grants.push({ roleId, permissions: g.permissions.slice(), expiresAt: g.expiresAt, expired: g.expiresAt !== 0 && g.expiresAt <= Date.now() });
            }
            for (const e of events) entry(e.scopeKey).eventCount++;
            for (const b of await read(tx.objectStore('bindings').getAll())) entry(b.scopeKey).boundRoleId = b.roleId;
            for (const mail of await read(tx.objectStore('inbox').getAll())) {
                const row = entry(mail.scopeKey); row.inboxCount = (row.inboxCount || 0) + 1;
            }
            return Array.from(scopes.values());
        });
    }
    function chatScope(scope) {
        const s = scopeOf(scope);
        if (!['wechat','qq'].includes(s.source)) throw error('invalid_source','收件箱只支持个人微信和 QQ');
        return s;
    }
    // Called by owner settings after a connector verifies the two stable identities.
    async function bind(scope, roleId) {
        const s = chatScope(scope), role = id(roleId), key = scopeKey(s);
        await transaction(['grants','bindings'],'readwrite',async tx => {
            await authorize(tx,s,role,['read','record']);
            const bindings = tx.objectStore('bindings'), previous = await read(bindings.get(key));
            if (previous && previous.roleId !== role) throw error('binding_conflict','先撤销此会话原角色的绑定');
            await read(bindings.put({key,scopeKey:key,roleId:role}));
        });
    }
    async function inboxOperation(scope, work, mode) {
        const s = chatScope(scope), key = scopeKey(s);
        return transaction(['bindings','inbox','grants'],mode,async tx => {
            const binding = await read(tx.objectStore('bindings').get(key));
            if (!binding) throw error('unbound','此会话还未绑定角色');
            await authorize(tx,s,binding.roleId,['read','record']);
            return work(tx.objectStore('inbox'),binding.roleId,key,s);
        });
    }
    // Payloads stay at the connector. A reference is only meaningful within its scoped account.
    async function receive(scope, input) {
        exact(input,['sourceId','ref','direction']);
        if (input.direction === 'self') return {ignored:true};
        const sourceId = id(input.sourceId), ref = input.ref;
        if (input.direction !== 'incoming' || typeof ref !== 'string' || !/^[a-z][a-z0-9_-]{0,31}:[a-zA-Z0-9._-]{1,128}$/.test(ref)) throw error('invalid_input','需要入站消息和本地引用');
        return inboxOperation(scope,async (store,roleId,scopeKey,s) => {
            const key = JSON.stringify([s.source,s.accountId,s.conversationId,sourceId]);
            const old = await read(store.get(key));
            if (old) {
                if (old.ref !== ref) throw error('event_conflict','来源消息标识冲突');
                return {duplicate:true};
            }
            if (await read(store.count()) >= EVENT_LIMIT) throw error('inbox_full','收件箱已满');
            await read(store.add({key,scopeKey,roleId,sourceId,ref,state:'pending',receivedAt:Date.now()}));
            return {duplicate:false,roleId};
        },'readwrite');
    }
    async function pending(scope, roleId) {
        return inboxOperation(scope,async (store,bound,key) => {
            if (bound !== roleId) throw error('permission_denied','当前会话绑定了其他角色');
            return (await read(store.index('byScope').getAll(key))).filter(row => row.roleId === bound && row.state === 'pending');
        },'readonly');
    }
    window.gyLife = Object.freeze({ grant, allowed, allowedAll, append, list, revoke, forget, status, authorizations, inbox:Object.freeze({bind,receive,pending}) });
})();
