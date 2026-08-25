// 修复：评论区角色状态栏HTML卡片不显示——根因是好几处"角色生成评论/推文"的代码路径漏跑了
// 正则脚本的"烘焙"处理（把 <XX状态>...</XX状态> 这种占位标签转换成好看HTML、永久存进正文的那一步），
// 代码本身已经修好了，但已经生成、存进 IndexedDB 里的旧内容不会自动回头重新处理。
// 这个脚本负责把"已经生成、还带着原始裸标签"的旧帖子/评论找出来，用当前的正则脚本配置重新烘焙一次。
// 用法：F12 -> Console -> 粘贴回车。
(function () {
    if (typeof globalPosts === 'undefined' || typeof applyRegexScripts !== 'function') {
        alert('没找到 globalPosts 或 applyRegexScripts，脚本没在正确的页面上运行。');
        return;
    }

    // 粗略识别"看起来像是没被处理过的原始占位标签"：形如 <闻述状态>...</闻述状态> 这种纯中文/字母标签对，
    // 且不带 class/style 属性（真正渲染好的HTML卡片会带这些属性，用来跟"还没转换的裸标签"区分开）。
    const rawTagPattern = /<([a-zA-Z一-龥_]{1,20})>[\s\S]*?<\/\1>/;

    let fixedCount = 0;
    const fixedLocations = [];

    function tryFix(obj, charId, label) {
        if (!obj || typeof obj.text !== 'string' || !obj.text) return;
        if (!rawTagPattern.test(obj.text)) return;
        const before = obj.text;
        const after = applyRegexScripts(before, 'ai_output', charId);
        if (after !== before) {
            obj.text = after;
            fixedCount++;
            fixedLocations.push(label);
        }
    }

    globalPosts.forEach(post => {
        tryFix(post, post.char && post.char.id, `帖子 ${post.id}`);
        (post.replies || []).forEach(r => {
            tryFix(r, r.char && r.char.id, `帖子${post.id} 的评论 ${r.id}`);
        });
    });

    if (typeof tabloidPosts !== 'undefined') {
        tabloidPosts.forEach(post => {
            tryFix(post, null, `营销号帖子 ${post.id}`);
            (post.replies || []).forEach(r => {
                tryFix(r, r.charId, `营销号帖子${post.id} 的评论 ${r.id}`);
            });
        });
    }

    if (typeof anonPosts !== 'undefined') {
        anonPosts.forEach(post => {
            tryFix(post, post.charId, `匿名帖 ${post.id}`);
            (post.replies || []).forEach(r => {
                tryFix(r, r.charId, `匿名帖${post.id} 的评论 ${r.id}`);
            });
        });
    }

    if (fixedCount === 0) {
        alert('没找到需要重新烘焙的内容（可能已经修好，或者这次没扫描到匹配的旧数据）。');
        return;
    }

    saveAllData();
    if (typeof renderPosts === 'function') renderPosts();
    if (typeof renderSinglePostDetail === 'function' && typeof currentEditingNovelId !== 'undefined') { /* no-op, 仅防御 */ }

    console.log('已修复：', fixedLocations);
    alert(`修复完成！共处理了 ${fixedCount} 条旧内容，把原始占位标签重新转换成了正确的显示效果。刷新页面查看效果。`);
})();
