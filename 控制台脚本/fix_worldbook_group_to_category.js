// 修复：之前"角色卡自动导入世界书"功能有个bug，把词条错误地挂到了 group（互斥分组）字段上，
// 而不是 category（世界书列表左侧分类筛选栏实际用的字段），导致：
// 1. 世界书分类筛选栏里能看到分组名，点进去却是空的（词条其实压根没被分类）
// 2. 同一张卡的所有词条被意外设成"互斥分组"，可能导致大部分词条永远不会一起触发
// 这个脚本会：找出"group 有值但 category 没值"的词条，把 group 的值搬到 category，并清空 group（解除误加的互斥关系）。
// 用法：F12 打开控制台 -> Console -> 粘贴回车。
(function () {
    if (typeof worldbooks === 'undefined') { alert('没找到 worldbooks 数据，脚本没在正确的页面上运行。'); return; }
    let fixedCount = 0;
    const affectedGroups = new Set();
    worldbooks.forEach(w => {
        if (w.group && w.group.trim() && (!w.category || !w.category.trim())) {
            affectedGroups.add(w.group.trim());
            w.category = w.group.trim();
            w.group = '';
            fixedCount++;
        }
    });

    if (fixedCount === 0) {
        alert('没找到需要修复的词条（可能已经修复过，或者你还没遇到这个bug）。');
        return;
    }

    // 确保这些分类名都在筛选栏的 worldbookCategories 列表里（一般已经在，保险起见补一下）
    if (typeof worldbookCategories !== 'undefined') {
        affectedGroups.forEach(g => { if (!worldbookCategories.includes(g)) worldbookCategories.push(g); });
    }

    saveAllData();
    if (typeof renderWorldbookCards === 'function') renderWorldbookCards();
    if (typeof renderWorldbookCategoryFilter === 'function') renderWorldbookCategoryFilter();

    alert(`修复完成！共 ${fixedCount} 条世界书词条已从错误的"互斥分组"字段迁移到正确的"分类"字段，涉及分类：${Array.from(affectedGroups).join('、')}`);
})();
