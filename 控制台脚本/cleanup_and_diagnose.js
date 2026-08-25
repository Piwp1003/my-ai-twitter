(function () {
  // 1) 先把 [7]COT美化 重新关掉，避免继续产生新的污染数据，等确认修复生效后再考虑重新开启
  const target = regexScripts.find(r => r.id === 'rx_1785806207101263931');
  if (target) { target.enabled = false; }

  // 2) 修复那条已知被写脏的帖子（望 @wenshu 的"立秋后..."那条），恢复成干净的原文
  const knownBadPostId = 'p_1785833250457599';
  const knownGoodText = '立秋后白天还热，夜里有点凉。备完课在想晚餐煮点什么给林吃。 #备课的间隙';
  const p = (typeof globalPosts !== 'undefined' ? globalPosts : []).find(p => p.id === knownBadPostId);
  let fixedKnown = false;
  if (p) { p.text = knownGoodText; fixedKnown = true; }

  saveAllData();

  // 3) 扫描一遍，看看还有没有别的帖子/评论也被同样的方式写脏了（特征：文本里混进了这段脚本独有的字符串）
  const marker = 'chatBubbleSettings';
  const hits = [];
  const scanArr = (arr, type, extra) => {
    (arr || []).forEach(item => {
      if (item && typeof item.text === 'string' && item.text.includes(marker)) {
        hits.push({ type, id: item.id, preview: item.text.slice(0, 80) });
      }
      if (item && Array.isArray(item.replies)) {
        item.replies.forEach(r => {
          if (r && typeof r.text === 'string' && r.text.includes(marker)) {
            hits.push({ type: type + '_reply', postId: item.id, replyId: r.id, preview: r.text.slice(0, 80) });
          }
        });
      }
    });
  };
  scanArr(typeof globalPosts !== 'undefined' ? globalPosts : [], 'post');
  scanArr(typeof anonPosts !== 'undefined' ? anonPosts : [], 'anon');
  scanArr(typeof tabloidPosts !== 'undefined' ? tabloidPosts : [], 'tabloid');

  console.log('=== 诊断结果 ===');
  console.log('已知那条帖子是否修复成功：', fixedKnown);
  console.log('[7]COT美化 现在是否已关闭：', target ? !target.enabled : '未找到该脚本');
  console.log('还有多少条数据疑似被同样方式写脏（不含刚修复的那条）：', hits.length);
  console.log(JSON.stringify(hits, null, 2));

  alert('已关闭[7]COT美化、修复了那条已知帖子。还发现 ' + hits.length + ' 处可能同样被写脏的内容，具体见控制台输出（数量为0就说明只有这一处）。');
})();
