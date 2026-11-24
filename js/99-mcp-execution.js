// One execution queue per app instance. Persist uncertain tool requests across reloads.
(function () {
    'use strict';
    if (window.gyMcpExecution) return;
    const KEY = 'gyMcpDeviceV1', REQUESTS = 'gyMcpRequestsV1', HUMAN = 'gyMcpHumanV1';
    let owner = null, queue = [], blocked = false, pending = 0, ending = false, seen = [];
    let reviewOwner = false;
    let storageOk = true, human = false, humanRevision = 0, humanPackage = '';
    try { const held = localStorage.getItem(HUMAN); human = !!held; if (held) { const value = JSON.parse(held); if (['com.sankuai.meituan','com.sankuai.meituan.takeoutnew'].includes(value.pkg)) humanPackage = value.pkg; } blocked = !!localStorage.getItem(KEY); const r = JSON.parse(localStorage.getItem(REQUESTS) || '[]'); if (Array.isArray(r)) seen = r.filter(k => typeof k === 'string').slice(-200); }
    catch (e) { blocked = true; human = true; storageOk = false; }
    function changed() { try { window.dispatchEvent(new CustomEvent('gy-mcp-device-change')); } catch (e) {} }
    function write(value) {
        try { if (value) localStorage.setItem(KEY, JSON.stringify(value)); else localStorage.removeItem(KEY); storageOk = true; }
        catch (e) { storageOk = false; blocked = true; throw new Error('无法保存工具执行标记，操作未发送'); }
    }
    function pump() {
        if (human || owner || blocked || !queue.length) return;
        const next = queue.shift(); owner = next.id; pending = 0; ending = false; next.resolve(); changed();
    }
    function acquire(id) {
        return new Promise((resolve, reject) => { if (human) { const e = new Error('人工接管中'); e.gyMcpStopped = true; reject(e); return; } queue.push({ id, resolve, reject }); pump(); changed(); });
    }
    function acquireLocalReview(id) {
        if (owner || pending || queue.length) return Promise.reject(new Error('已有工具操作在途'));
        owner = id; reviewOwner = true; pending = 0; ending = false; changed(); return Promise.resolve();
    }
    function cancelQueued(id) {
        const i = queue.findIndex(x => x.id === id);
        if (i < 0) return false;
        const q = queue.splice(i, 1)[0]; const e = new Error('任务已停止'); e.gyMcpStopped = true; q.reject(e); changed(); return true;
    }
    function releaseIfReady() {
        if (!ending || pending) return;
        owner = null; reviewOwner = false; ending = false; pump(); changed();
    }
    function release(id) { if (owner === id) { ending = true; releaseIfReady(); } else cancelQueued(id); }
    function begin(id) {
        if ((human && !reviewOwner) || owner !== id || ending || (blocked && !reviewOwner)) throw new Error('设备未授权给当前任务，操作未发送');
        write({ taskId: id, pending: pending + 1, at: Date.now() }); pending++; changed();
    }
    function settle(id, known) {
        if (owner !== id || !pending) return;
        pending--;
        if (!known) blocked = true;
        try { if (blocked) write({ taskId: id, uncertain: true, at: Date.now() }); else if (pending) write({ taskId: id, pending, at: Date.now() }); else write(null); } catch (e) {}
        releaseIfReady(); changed();
    }
    function acknowledge() {
        if (human || owner || pending || queue.length) return false;
        try { write(null); blocked = false; pump(); changed(); return true; } catch (e) { return false; }
    }
    function takeover(pkg) {
        human = true; humanRevision++; let persisted = true; if (['com.sankuai.meituan','com.sankuai.meituan.takeoutnew'].includes(pkg)) humanPackage = pkg;
        try { localStorage.setItem(HUMAN, JSON.stringify({ at: Date.now(), schema: 1, pkg: humanPackage })); }
        catch (e) { storageOk = false; persisted = false; }
        queue.slice().forEach(q => cancelQueued(q.id)); changed(); return persisted;
    }
    function resumeHuman(revision) {
        if (!human || revision !== humanRevision || owner || pending || queue.length) return false;
        try { write(null); localStorage.removeItem(HUMAN); }
        catch (e) { storageOk = false; blocked = true; changed(); return false; }
        human = false; humanRevision++; blocked = false; pump(); changed(); return true;
    }
    function claim(key) {
        if (!key) return true; // Without a stable message identity, the caller uses a short in-memory window.
        if (seen.includes(key)) return false;
        const next = seen.concat(key).slice(-200);
        try { localStorage.setItem(REQUESTS, JSON.stringify(next)); } catch (e) { storageOk = false; throw new Error('无法保存重复请求标记，工具暂不执行'); }
        seen = next; return true;
    }
    window.gyMcpExecution = Object.freeze({ acquire, acquireLocalReview, cancelQueued, release, begin, settle, acknowledge, claim, takeover, resumeHuman,
        status: () => ({ owner, pending, blocked, queued: queue.length, storageOk, human, humanRevision, humanPackage }) });
})();
