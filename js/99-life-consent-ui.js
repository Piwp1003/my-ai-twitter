// Local owner settings. Channel adapters will supply verified targets after account binding.
(function () {
    'use strict';
    let panel = null, generation = 0, busy = false;
    const names = { guyu: '谷雨', qq: 'QQ', wechat: '微信', wechat_pay: '微信支付', alipay: '支付宝', meituan: '美团', taobao: '淘宝', jd: '京东' };
    const rights = { read: '读取素材', record: '保存记录', draft: '生成回复草稿', send: '发送消息', remember: '写入长期记忆', diary: '用于日记', cloud: '交给模型或云端处理' };
    const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const key = scope => JSON.stringify([scope.source, scope.accountId, scope.conversationId]);
    const roles = () => (typeof myCharacters !== 'undefined' && Array.isArray(myCharacters) ? myCharacters : []).filter(r => r && /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,159}$/.test(String(r.id)));
    const roleName = id => roles().find(r => String(r.id) === id)?.name || '已移除角色（' + id + '）';
    function close() { generation++; if (panel) panel.remove(); panel = null; busy = false; }
    async function open(options = {}) {
        close(); const turn = generation;
        panel = document.createElement('div'); panel.id = 'gyLifeConsent'; panel.dataset.gyNopage = '1';
        panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '真实生活授权');
        panel.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483200;display:flex;justify-content:center;align-items:center;padding:12px;box-sizing:border-box';
        panel.innerHTML = '<section style="background:#fff;color:#222;border-radius:16px;padding:18px;width:100%;max-width:600px;max-height:88vh;overflow:auto;box-sizing:border-box;overflow-wrap:anywhere"><button type="button" data-close style="float:right">关闭</button><h3>真实生活授权</h3><p>按账号、会话和角色分别管理。授权不会立即采集或发送消息；渠道尚未接入时不能启用真实收发。</p><div data-content>正在读取本机授权…</div><p data-status role="status"></p><button type="button" data-refresh>刷新授权状态</button></section>';
        document.body.appendChild(panel); const root = panel;
        const content = root.querySelector('[data-content]'), status = root.querySelector('[data-status]');
        let rows = [], targets = [], editing = null;
        const live = () => panel === root && generation === turn;
        const message = text => { if (live()) status.textContent = text; };
        const describe = scope => {
            const target = targets.find(t => key(t.scope) === key(scope));
            return (names[scope.source] || scope.source) + ' · ' + (target?.label || '账号 ' + scope.accountId + ' / 会话 ' + scope.conversationId);
        };
        async function refresh() {
            if (!window.gyLife) { message('授权模块未加载，无法管理。'); return; }
            try {
                const data = await gyLife.authorizations(); if (!live()) return;
                rows = data; editing = null;
                content.innerHTML = '<p>本机有 ' + rows.reduce((n, r) => n + r.grants.length, 0) + ' 项授权。</p>'
                    + (targets.length ? '<button type="button" data-new>为指定会话授权</button>' : '<p>暂无可新增授权的已绑定会话。完成渠道绑定后，在指定会话中申请授权。</p>')
                    + rows.map((r, i) => '<article style="border-top:1px solid #ddd;margin-top:12px;padding-top:8px"><b>' + esc(describe(r.scope)) + '</b><p>' + r.eventCount + ' 条事件引用</p>'
                        + r.grants.map((g, j) => '<div style="margin-bottom:12px">' + esc(roleName(g.roleId)) + ' · ' + (g.expired ? '已到期' : '授权中')
                            + '<p>' + g.permissions.map(p => esc(rights[p])).join('、') + '</p><p>' + (g.expiresAt ? '到期：' + esc(new Date(g.expiresAt).toLocaleString()) : '有效至撤销') + '</p>'
                            + '<button type="button" data-edit="' + i + ':' + j + '">调整授权</button> <button type="button" data-revoke="' + i + ':' + j + '">撤销</button></div>').join('')
                        + '<label><input type="checkbox" data-forget-confirm="' + i + '">删除此会话全部角色的授权和事件引用（不删除聊天或账本原文）</label><br><button type="button" data-forget="' + i + '">删除本机授权与引用</button></article>').join('') + '<div data-editor></div>';
            } catch (e) { if (live()) { content.textContent = '授权存储不可用，未放行任何操作。'; message(e.message); } }
        }
        function form(row, grant) {
            editing = { row, grant };
            const box = content.querySelector('[data-editor]');
            box.innerHTML = '<hr><h4>' + (grant ? '调整授权' : '新增授权') + '</h4>'
                + (row ? '<p>' + esc(describe(row.scope)) + '</p>' : '<label>指定会话 <select data-target>' + targets.map((t, i) => '<option value="' + i + '">' + esc(describe(t.scope)) + '</option>').join('') + '</select></label>')
                + (grant ? '<p>角色：' + esc(roleName(grant.roleId)) + '</p>' : '<label>角色 <select data-role>' + roles().map(r => '<option value="' + esc(r.id) + '">' + esc(r.name) + '</option>').join('') + '</select></label>')
                + '<p>各项用途独立选择；保存记录和后续使用还需要读取授权。</p>'
                + Object.entries(rights).map(([id, label]) => '<label style="display:block;margin:10px 0"><input type="checkbox" data-right="' + id + '"' + (grant?.permissions.includes(id) ? ' checked' : '') + '> ' + label + '</label>').join('')
                + '<label>有效期 <select data-duration>' + (grant && !grant.expired ? '<option value="keep">保留原到期时间</option>' : '') + '<option value="24">24 小时</option><option value="1">1 小时</option><option value="168">7 天</option><option value="0">直到撤销</option></select></label>'
                + '<p><label><input type="checkbox" data-save-confirm>我已核对会话、角色和以上用途</label></p><button type="button" data-save>保存授权</button>';
            box.querySelector('h4').scrollIntoView({ block: 'nearest' });
        }
        root.addEventListener('click', async e => {
            if (!e.isTrusted) return;
            const button = e.target.closest('button'); if (!button || !root.contains(button)) return;
            if (button.hasAttribute('data-close')) { close(); return; }
            if (busy) return;
            if (button.hasAttribute('data-new')) { form(null, null); return; }
            if (button.hasAttribute('data-edit')) { const [i, j] = button.dataset.edit.split(':').map(Number); form(rows[i], rows[i].grants[j]); return; }
            busy = true; button.disabled = true;
            try {
                if (button.hasAttribute('data-refresh')) await refresh();
                if (button.hasAttribute('data-revoke')) {
                    const [i, j] = button.dataset.revoke.split(':').map(Number); await gyLife.revoke(rows[i].scope, rows[i].grants[j].roleId); await refresh(); message('已撤销。已发出的请求不会因此撤回。');
                }
                if (button.hasAttribute('data-forget')) {
                    const i = Number(button.dataset.forget);
                    if (!content.querySelector('[data-forget-confirm="' + i + '"]').checked) { message('请先确认删除此会话全部角色的授权和事件引用。'); return; }
                    await gyLife.forget(rows[i].scope); await refresh(); message('已删除本机授权和事件引用，原始聊天与账目仍保留。');
                }
                if (button.hasAttribute('data-save')) {
                    if (!editing || !content.querySelector('[data-save-confirm]').checked) { message('请先核对并勾选授权确认。'); return; }
                    const scope = editing.row?.scope || targets[Number(content.querySelector('[data-target]').value)]?.scope;
                    const roleId = editing.grant?.roleId || content.querySelector('[data-role]').value;
                    if (!roles().some(r => String(r.id) === roleId)) throw Error('请先选择仍存在的角色。');
                    const permissions = Array.from(content.querySelectorAll('[data-right]:checked'), el => el.dataset.right);
                    const duration = content.querySelector('[data-duration]').value;
                    const expiresAt = duration === 'keep' ? editing.grant.expiresAt : Number(duration) === 0 ? 0 : Date.now() + Number(duration) * 3600000;
                    await gyLife.grant(scope, roleId, permissions, { expiresAt }); await refresh(); message('已保存本机授权。实际收发能力需等待对应渠道接入。');
                }
            } catch (err) { message('未完成：' + err.message); }
            finally { if (live()) { busy = false; button.disabled = false; } }
        });
        try {
            // No manual account IDs: future bound-channel UI supplies exact targets.
            for (const t of (Array.isArray(options.targets) ? options.targets : [])) {
                await gyLife.allowed(t.scope, 'consent_validation', 'read');
                if (!live()) return;
                targets.push({ scope: { ...t.scope }, label: String(t.label || '').slice(0, 160) });
            }
            await refresh();
        } catch (e) { if (live()) { content.textContent = '会话或授权存储不可用，未放行任何操作。'; message(e.message); } }
        if (live()) root.querySelector('[data-close]').focus();
    }
    window.gyLifeAuthOpen = open;
    function mount() {
        const version = document.getElementById('setVersionLine'); if (!version || document.getElementById('gyLifeConsentEntry')) return;
        const button = document.createElement('button'); button.type = 'button'; button.id = 'gyLifeConsentEntry'; button.textContent = '真实生活授权';
        button.style.cssText = 'display:block;margin:14px auto;padding:10px 18px'; button.addEventListener('click', () => open()); version.parentNode.insertBefore(button, version);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
