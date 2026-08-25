// 诊断脚本：排查"评论区角色状态栏HTML卡片不渲染，变成纯文字"的问题
// 用法：打开网页 -> F12 打开开发者工具 -> 切到 Console 标签 -> 粘贴整段代码回车 -> 把输出的内容截图/复制发我
(function () {
    console.log('===== 1. 相关正则脚本状态 =====');
    const related = (typeof regexScripts !== 'undefined' ? regexScripts : []).filter(s =>
        /状态|COT|美化|闻述/i.test(s.name || '')
    );
    if (related.length === 0) {
        console.log('⚠️ 没找到任何名字包含"状态/COT/美化/闻述"的正则脚本，可能已被删除或改名。');
    }
    related.forEach(s => {
        console.log({
            id: s.id,
            name: s.name,
            enabled: s.enabled,
            displayOnly: s.displayOnly,
            promptOnly: s.promptOnly,
            target: s.target,
            charScope: s.charScope,
            findPreview: (s.find || '').slice(0, 200)
        });
    });

    console.log('===== 2. 角色"闻述"当前的真实ID =====');
    const wenshu = (typeof myCharacters !== 'undefined' ? myCharacters : []).find(c => c.handle === '@wenshu' || c.name === '闻述');
    console.log(wenshu ? { id: wenshu.id, name: wenshu.name, handle: wenshu.handle } : '⚠️ 没找到"闻述"这个角色');

    console.log('===== 3. 查找疑似问题评论的原始文本 =====');
    const markers = ['想舔哪', '触发条件', '搜索普通', '闻述状态'];
    let found = 0;
    (typeof globalPosts !== 'undefined' ? globalPosts : []).forEach(post => {
        (post.replies || []).forEach(r => {
            const t = r.text || '';
            if (markers.some(m => t.includes(m))) {
                found++;
                console.log(`--- 命中评论 #${found} (帖子id: ${post.id}, 评论id: ${r.id}) ---`);
                console.log('评论作者:', r.char ? { id: r.char.id, name: r.char.name } : '(无char字段)');
                console.log('原始文本 JSON.stringify:', JSON.stringify(t));
            }
        });
    });
    if (found === 0) console.log('没有在 globalPosts 的评论里找到包含上述关键词的文本。');

    console.log('===== 诊断完成，请把以上全部输出发给我 =====');
})();
