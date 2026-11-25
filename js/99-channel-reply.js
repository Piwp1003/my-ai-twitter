// Trusted channel connectors pass verified bindings and scoped conversation records.
// This runtime produces plain-text drafts. Delivery belongs to the channel gateway.
(function () {
    'use strict';
    async function draft({scope, roleId, text, context = []}) {
        if (!scope || !['qq', 'wechat'].includes(scope.source) || typeof text !== 'string' ||
            !text.trim() || text.length > 8000 || !Array.isArray(context)) throw new Error('无效渠道或消息');
        const binding = Object.freeze({...scope});
        const role = myCharacters.find(c => String(c.id) === roleId);
        if (!role) throw new Error('角色不存在');
        const history = context.filter(row => row && row.roleId === roleId &&
            row.scope?.source === binding.source && row.scope.accountId === binding.accountId &&
            row.scope.conversationId === binding.conversationId && ['user','assistant'].includes(row.role) &&
            typeof row.text === 'string').slice(-12).map(row => ({role:row.role, content:row.text.slice(0,1500)}));
        const rights = ['read','draft','cloud'];
        if (history.length) rights.push('remember');
        async function check() {
            if (!await window.gyLife.allowedAll(binding, roleId, rights)) throw new Error('角色未获当前会话的回复授权');
        }
        await check();
        const api = getApiMain();
        if (!api?.key) throw new Error('请配置主 API');
        const persona = gyStripGreetingBlocks(role.persona);
        const system = rolePersonaText(role, persona) + '在当前会话中用纯文字回复用户。仅根据提供的上下文回答。';
        const prompt = buildStructuredMessages(system, history, text.trim());
        const result = await callChatCompletionAPI(api, prompt, 0);
        await check();
        const answer = result?.choices?.[0]?.message?.content;
        if (result?.error || typeof answer !== 'string' || !answer.trim()) throw new Error('模型没有返回文字草稿');
        return {scope:binding, roleId, type:'text', text:answer.trim()};
    }
    window.gyChannelReply = Object.freeze({draft});
})();
