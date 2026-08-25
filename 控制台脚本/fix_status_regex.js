(function () {
  const r = regexScripts.find(x => x.id === 'rx_178360637202865830' && x.name === '状态栏');
  if (!r) { alert('没找到"状态栏"这条脚本，可能id变了，找我再看看。'); return; }

  r.find = "<闻述状态>\\n地点：(.*?)\\n时间：(.*?)\\n着装：(.*?)\\n状态：(.*?)\\n脑内：(.*?)\\n想舔哪：(.*?)\\n在哪做：(.*?)\\n多久：(.*?)\\n触发条件：(.*?)\\n搜索普通：(.*?)\\n搜索色情：(.*?)\\n搜索秘密1：(.*?)\\n搜索秘密2：(.*?)\\n评价内容：(.*?)\\n评价来源：(.*?)(?:\\n<\\/闻述状态>|$)";

  saveAllData();
  if (typeof renderRegexScriptsList === 'function') renderRegexScriptsList();
  alert('已修复"状态栏"这条正则：以后AI就算漏写结尾的</闻述状态>闭合标签，也能正常识别渲染成状态栏卡片了。刷新页面看效果。');
})();
