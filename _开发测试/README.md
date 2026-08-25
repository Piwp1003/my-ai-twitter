# 续写工作台 · 开发测试

改完 `js/16-story-studio.js` 或相关文件后，可以跑一遍确认没弄坏：

```bash
cd D:\MyTwitterAI\克劳德神了
npm i playwright
npx playwright install chromium     # 只需装一次
node _开发测试\续写工作台测试.mjs
```

脚本会用无头浏览器真的把 index.html 跑起来（CDN 依赖和 AI 请求都拦成本地假响应），
覆盖 73 项：新功能挂载、旧入口是否删干净、设定读写、提示词组装、宏替换、
流式生成、隐藏楼层、重roll/侧滑、右键菜单、失败回滚、章节存档、多会话隔离、
旧数据迁移、素材源改指向、存档往返。
