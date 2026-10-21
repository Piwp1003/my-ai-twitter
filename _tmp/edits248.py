import re
def rep(p,a,b,cnt=1):
    s=open(p,encoding='utf-8').read()
    if b in s and a not in s: print('skip',p); return
    assert s.count(a)==cnt,(p,a[:70],s.count(a)); s=s.replace(a,b); open(p,'w',encoding='utf-8',newline='').write(s)
rep('index.html',"        './js/98-push-keepalive.js',\n    ]);","        './js/98-push-keepalive.js',\n        './js/99-mcp.js',\n        './js/99b-sub-login.js',\n    ]);")
rep('index.html','var GY_VERSION = 247;','var GY_VERSION = 248;')
rep('service-worker.js',"    './js/98-push-keepalive.js?v=' + V\n];","    './js/98-push-keepalive.js?v=' + V,\n    './js/99-mcp.js?v=' + V,\n    './js/99b-sub-login.js?v=' + V\n];")
rep('js/97-api-test.js',"push: '谷雨自己的通知' };","push: '谷雨自己的通知', mcp: 'MCP 服务器' };")
rep('js/97-api-test.js',"            if (kind === 'cloud' || kind === 'push') {","            if (kind === 'mcp') { if (window.gyMcpOpen) window.gyMcpOpen(); return; }\n            if (kind === 'cloud' || kind === 'push') {")
rep('js/97-api-test.js',"cloud: gyApiTestCloud, push: gyApiTestPush };","cloud: gyApiTestCloud, push: gyApiTestPush, mcp: sub => (window.gyMcpTest ? window.gyMcpTest(sub) : { ok: false, hint: 'MCP 没加载上，刷新一下' }) };")
rep('js/01b-switches-stream-regex-reasoning.js',"'39-npcs|gyNpcGen': ['NPC 列表', '生成 NPC'],","'39-npcs|gyNpcGen': ['NPC 列表', '生成 NPC'], '99-mcp|gyMcpDecide': ['我的 MCP', 'TA 判断要不要用工具'], '99-mcp|callApi': ['我的 MCP', 'TA 判断要不要用工具'],")
print('done')
