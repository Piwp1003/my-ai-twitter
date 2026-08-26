# 谷雨 · 开发测试

改完 `js/` 里的文件后跑一遍，确认没弄坏别的地方。

```bash
cd D:\MyTwitterAI\克劳德神了
npm i playwright
npx playwright install chromium     # 只需装一次

node _开发测试\run.mjs                  # 续写工作台全链路      102 项
node _开发测试\tavern-bridge-test.mjs   # 酒馆助手兼容层        114 项
node _开发测试\feed-test.mjs            # 推特流 / 路人 NPC      40 项
node _开发测试\input-test.mjs           # 输入框永远能打字       24 项
node _开发测试\binding-test.mjs         # 按钮有没有绑到不存在的函数
node _开发测试\leak-test.mjs            # JSON/思维链不外泄+流式  20 项
node _开发测试\letter-test.mjs          # 写信/回信全链路          23 项
node _开发测试\adaptive-test.mjs        # 名字/时间不写死           21 项
node _开发测试\boot-test.mjs            # 启动自检               14 项
node _开发测试\scrollbar-test.mjs       # 浮层式滚动条           10 项
node _开发测试\card-test.mjs            # 角色卡状态栏           13 项
node _开发测试\card-diag.mjs            # 角色卡正则体检         51 条
node _开发测试\freeze-test.mjs          # 主线程卡顿量化（看数值，不是通过/失败）
```

脚本会用无头浏览器真的把 index.html 跑起来，CDN 依赖和 AI 请求全部拦成本地假响应，
不会真的联网、也不会动你的存档。

## 几个测试各自盯着什么

- **input-test** — 「输入框打不了字」的回归防线。它不看代码，直接量输入框在不在视口里、
  点它的坐标命中的是不是它本人、键盘敲进去的字有没有进去。短聊天/长聊天/角色刚发完消息/
  刚删过消息/右键菜单开过又关/导入备份之后/手机尺寸，七种情形各测一遍。

- **freeze-test** — 量的是「主线程被占住了多久」。它每 10ms 打一个点，看最长一次多久没打上。
  超过 300ms 用户就能感觉到卡、键盘输入会丢。修 saveAllData 之前这个数是 1700ms，
  修完是 100ms 上下。以后往聊天渲染路径里加东西，跑一下这个别让它涨回去。

- **leak-test** — 防止 AI 返回的原始 JSON 信封和思维链漏进聊天气泡。既测新消息（写入侧），
  也测已经存坏在历史里的旧消息（渲染侧兜底）。同时测流式开关是真的改到了请求体。

- **adaptive-test** — 守住"这个网站不是只给一个人用的"。检查源码里没有把具体人名当默认值、
  用户改名之后提示词跟着变、名字空着也不会拼出断句；以及所有**能在设置里自定义的时间**
  （休息时间段、回信/日记等待时长）在提示词里都是按实际值算出来的，不是写死的钟点。
  以后再往提示词里写时间之前，先想一下这个时间用户能不能改——能改就不能写死。

- **scrollbar-test** — 滚动条平时透明、鼠标移上去才浮现。注意它启动浏览器时特意关掉了
  `--hide-scrollbars`：无头浏览器默认把滚动条整个藏掉，不关这个开关，这个测试**永远是绿的**
  （因为压根没有滚动条可测）。里面还锁了两条写法：不能用 `:hover::-webkit-scrollbar-thumb`
  （Chromium 里画不出来），`scrollbar-color` 必须圈在 `@supports` 里（它是继承属性，
  裸写会让整套 `::-webkit-scrollbar` 样式全部失效）。

- **binding-test** — 扫全部内联事件（`onclick` / `onchange` / …），确认它们调用的函数**真的存在**。
  绑了个不存在的函数，点下去只在控制台报一句 "xxx is not defined"，界面上毫无反应，
  自己点是发现不了的。同时会查有没有人又用回原生 `prompt()` —— **Electron 不支持它**，
  一调就抛异常，表现同样是"点了没反应"。
