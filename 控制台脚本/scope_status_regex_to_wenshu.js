(function () {
  const char = myCharacters.find(c => c.handle === '@wenshu' || c.name === '闻述');
  if (!char) { alert('没找到"闻述"这个角色，可能名字/id对不上，找我再看看。'); return; }

  const r = regexScripts.find(x => x.id === 'rx_178360637202865830' && x.name === '状态栏');
  if (!r) { alert('没找到"状态栏"这条脚本。'); return; }

  r.charScope = [char.id];
  saveAllData();
  if (typeof renderRegexScriptsList === 'function') renderRegexScriptsList();
  alert('已把"状态栏"这条正则绑定成"闻述"专属：以后只在渲染闻述自己的帖子/评论/续写/日记/小说/论坛内容时才会触发，不会再套用到其它角色身上。');
})();
