// MCP task summaries only: never store prompts, tool arguments, credentials, or screen content.
(function () {
    'use strict';
    if (window.gyMcpTasks) return;
    const KEY = 'gyMcpTasksV1', LIMIT = 50;
    const ACTIVE = new Set(['created', 'running', 'waiting', 'paused']);
    const NEXT = {
        created: ['running', 'failed', 'interrupted', 'cancelled', 'timed_out', 'handed_over'],
        running: ['waiting', 'paused', 'completed', 'failed', 'interrupted', 'cancelled', 'timed_out', 'handed_over'],
        waiting: ['running', 'paused', 'failed', 'interrupted', 'cancelled', 'timed_out', 'handed_over'],
        paused: ['running', 'failed', 'interrupted', 'cancelled', 'timed_out', 'handed_over']
    };
    let tasks = [], storageOk = true;
    const copy = value => JSON.parse(JSON.stringify(value));
    function persist() {
        try { localStorage.setItem(KEY, JSON.stringify({ schema: 1, tasks })); storageOk = true; }
        catch (e) { storageOk = false; }
        try { window.dispatchEvent(new CustomEvent('gy-mcp-task-change')); } catch (e) {}
    }
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (saved && saved.schema === 1 && Array.isArray(saved.tasks)) {
            tasks = saved.tasks.filter(t => t && typeof t.id === 'string' &&
                (ACTIVE.has(t.state) || ['completed', 'failed', 'interrupted', 'cancelled', 'timed_out', 'handed_over'].includes(t.state))).slice(0, LIMIT).map(t => ({
                    id: t.id.slice(0, 100), cid: String(t.cid || '').slice(0, 100), who: String(t.who || '').slice(0, 80),
                    state: ACTIVE.has(t.state) ? 'interrupted' : t.state,
                    createdAt: Number(t.createdAt) || Date.now(), updatedAt: ACTIVE.has(t.state) ? Date.now() : (Number(t.updatedAt) || Date.now()),
                    steps: Math.max(0, Number(t.steps) || 0), failures: Math.max(0, Number(t.failures) || 0),
                    note: ACTIVE.has(t.state) ? '应用已重新打开，未完成任务已中断；不会自动重放操作。' : String(t.note || '').slice(0, 160)
                }));
            persist();
        }
    } catch (e) { storageOk = false; }
    let seq = 0;
    function get(id) { return tasks.find(t => t.id === id); }
    function create(cid, who) {
        // Do not evict live tasks to make room for new history entries.
        if (tasks.length >= LIMIT) {
            const i = tasks.map(t => ACTIVE.has(t.state)).lastIndexOf(false);
            if (i < 0) throw new Error('任务数量已达上限，请等待当前任务结束');
            tasks.splice(i, 1);
        }
        const now = Date.now();
        const t = { id: 'mt' + now.toString(36) + '_' + (++seq) + '_' + Math.random().toString(36).slice(2, 7),
            cid: String(cid).slice(0, 100), who: String(who || '').slice(0, 80), state: 'created',
            createdAt: now, updatedAt: now, steps: 0, failures: 0, note: '已创建，等待工具判断。' };
        tasks.unshift(t); persist(); return copy(t);
    }
    function transition(id, state, note) {
        const t = get(id);
        if (!t || !(NEXT[t.state] || []).includes(state)) return false;
        t.state = state; t.updatedAt = Date.now(); t.note = String(note || '').slice(0, 160);
        persist(); return true;
    }
    function step(id, ok) {
        const t = get(id); if (!t || t.state !== 'running') return false;
        t.steps++; if (ok !== true) t.failures++; t.updatedAt = Date.now();
        t.note = ok === true ? '工具调用已返回；尚不代表外部操作目标完成。' : '工具失败或结果未确认。';
        persist(); return true;
    }
    window.gyMcpTasks = Object.freeze({ create, transition, step,
        list: () => copy(tasks), storageOk: () => storageOk });
})();
