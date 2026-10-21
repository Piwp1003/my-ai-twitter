/* ============================================================
   js/94 —— 📘 使用指南 + 🛟 客服
   ------------------------------------------------------------
   1. 📘 使用指南（设置最上面）：功能太多找不到——这里按「在哪 / 要开什么开关」写清楚。
      每一条都有「去看看 ›」直接跳过去；用到的开关列在下面，显示现在开着还是关着，点一下跳到那个开关。
      ⚠️ 指南内容是手写的（GUIDE 那一大段），平时不跟着功能更新——她说「更新指南」才改。
         改的时候顺手把 GUIDE_DATE 改成当天。
   2. 🛟 客服（单独一个功能，设置里、指南顶上、小功能里都能进）：
      · 问它项目里的事：先在指南里找，找到了直接给去处和开关；找不到才问 API（副 API 优先，可关）。
      · 盯着出问题：JS 报错、插件出错、接口报错、插件重复 / 新旧版并存、存储快满、没接 API……
        每次都在客服窗口里记一条（说人话 + 怎么办 + 能点的按钮），再发一条通知；不限次数（只有同一个错 1 秒内连环刷才并成一条）。
      · 开关在「全部开关 → 🛟 客服」；今天、小手机小组件、记忆总览里都有它。
      · 不加自主行动：客服不是角色，TA 不需要替你去「找客服」。
   早期报错：index.html 头上有一小段先把开机时的报错存进 window.__gyErrBuf，这里加载后一并收下。
   ============================================================ */
(function () {
    'use strict';
    if (window.__gyGuideHelp) return;
    window.__gyGuideHelp = true;

    const GUIDE_DATE = '2026-10-16';   // v245
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const pad = n => String(n).padStart(2, '0');
    const dayKey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const toast = (a, b) => { try { showToast('<div class="avatar" style="width:40px;height:40px;background:#1d9bf0;color:#fff;font-size:20px;">🛟</div>', a, b || '', null, null, false); } catch (e) {} };
    const isAuto = k => { try { return typeof isAutoOn === 'function' ? isAutoOn(k) : true; } catch (e) { return true; } };
    const nowStr = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };


    /* =====================================================================
       〇、🧯 报错词典：所有认得出的报错，用"什么都不懂也能看明白"的话讲清楚
       它同时用在三个地方：客服提醒（出错那一刻）、「发现的问题 → 📖 报错词典」、使用指南「🧯 报错是什么意思」。
       顺序很重要：越具体的排越前面。
       ===================================================================== */
    const ERRS = [
        { id: 'e_money', k: '没钱 余额不足 欠费 充值 额度', ico: '💸', n: '余额不足 / 额度用完了', re: /insufficient[_ ]?(quota|balance|funds)|quota|余额|balance|credit|billing|欠费|exceeded your current|payment required|\b402\b|额度不足|账户.*不足/i,
          what: '你的 API 账户没钱了（或者免费额度用完了）。就像手机欠费打不了电话一样，谷雨拿不到回答。',
          how: ['打开你买 API 的那个网站（比如 DeepSeek 开放平台、你用的中转站），登录', '找「充值」或「余额」，充一点钱', '回谷雨再发一次就好', '如果填了副 API，也可能是副 API 那个号没钱了——两个都看看'], go: ['settings', 'api'] },
        { id: 'e_key', k: 'key 密钥 令牌 401 403', ico: '🔑', n: '密钥（Key）不对', re: /invalid.?api.?key|incorrect api key|unauthorized|authentication|invalid token|无效的令牌|令牌.*(无效|过期)|api key not valid|no api key|missing.*key|\b401\b|\b403\b|forbidden/i,
          what: '谷雨拿着你的「钥匙」（API Key）去开门，门说：这把钥匙不对、过期了，或者没有权限。',
          how: ['回到买 API 的网站，找到「API Keys / 令牌」，复制一把（一般以 sk- 开头的一长串）', '谷雨：设置 → API 与模型，把旧的删干净再粘贴，前后不要有空格', '主 API、副 API、向量 API 是三个格子，别填错格', '刚创建的 key 有的要等一两分钟才能用'], go: ['settings', 'api'] },
        { id: 'e_model', k: '模型不存在 没有这个模型', ico: '🧩', n: '模型名不对 / 没有这个模型', re: /model.*(not.?found|does not exist|not exist|unavailable|not supported|无权)|no available channel|无可用渠道|模型.*(不存在|不可用|未开通)|unknown model|invalid model/i,
          what: '你选的模型，对方那里没有（名字写错了、没开通、或者中转站不卖这个）。',
          how: ['设置 → API 与模型 → 点「拉取模型」', '从弹出来的列表里点一个（别自己手打）', '保存，再试一次'], go: ['settings', 'api'] },
        { id: 'e_url', k: '地址 网址 base url 404 网页', ico: '🌐', n: 'API 地址填错了', re: /\bHTTP 200\b|Unexpected token\s*'?<|<!DOCTYPE|<html|not valid JSON|HTTP 404|HTTP 405|\b404\b|\b405\b|Not Found|Method Not Allowed|返回的是一个网页/i,
          what: 'API 地址（接口地址 / Base URL）填得不对，对方回了一个网页，而不是回答。',
          how: ['地址一般长这样：https://api.deepseek.com 或 https://某某.com/v1', '别填成官网首页、控制台、聊天页面的地址', '末尾多一个或少一个 /v1 都可能不行，两种都试试', '不确定就问卖给你 API 的人：「Base URL 是什么？」'], go: ['settings', 'api'] },
        { id: 'e_region', ico: '🗺️', n: '你所在的地区不能用', re: /unsupported[_ ]?(country|region|location)|not available in your (country|region)|region.*not supported|地区.*不支持/i,
          what: '这家 API 不给你所在的国家或地区用。',
          how: ['用国内能直接用的 API（比如 DeepSeek、通义、豆包），或者国内的中转站', '一定要用这家的话，需要开梯子（网络代理）'], go: ['settings', 'api'] },
        { id: 'e_ban', ico: '⛔', n: '账号被停用了', re: /account.*(deactivated|disabled|suspended|banned)|organization.*(disabled|deactivated)|账号.*(封|禁|停用)|user.*banned/i,
          what: '这个 API 账号被对方停用了（违规、欠费太久、或者风控）。',
          how: ['去服务商网站或邮箱看看有没有通知', '换一个账号的 key 填进去'], go: ['settings', 'api'] },
        { id: 'e_long', k: '太长 上下文', ico: '📚', n: '发过去的内容太长了', re: /context.?length|maximum context|context_length_exceeded|too many tokens|token limit|prompt is too long|input is too long|reduce the length|上下文.*(长|超)|超出.*(长度|上下文)|\b413\b|payload too large/i,
          what: '一次塞给模型的东西（人设、世界书、聊天记录、记忆……）超过了它一口能吃下的量。',
          how: ['设置 → 注入内容管理，关掉几段用不上的', '把「聊天历史条数」调小一点', '或者换一个上下文更长的模型（名字里带 128k、200k 的）'], go: ['settings', 'inject'] },
        { id: 'e_block', k: '审核 拦截 违规', ico: '🚫', n: '内容被拦下来了', re: /content.?filter|content_policy|safety|blocked|moderation|prohibited|PROHIBITED_CONTENT|recitation|违规|审核|敏感|不合规|拒绝生成|data_inspection_failed/i,
          what: '这一轮说的内容被模型或者中转站的「审核」拦住了，它不肯回。',
          how: ['换个说法再试一次', '换一个审核没那么严的模型或中转站', '这不是谷雨坏了，是对方不让说'], go: ['settings', 'api'] },
        { id: 'e_rate', k: '太快 限流 429', ico: '🚦', n: '发得太快，被限流了', re: /rate.?limit|too many requests|concurrency|\b429\b|请求过于频繁|并发/i,
          what: '短时间里发了太多请求，对方让你歇一会儿（免费 key 限得更严）。',
          how: ['等 1~2 分钟再发', '「全部开关」里关掉几个后台自己跑的（主动找你、自动发帖、自主模式这些会一直发请求）', '填一个副 API，让杂活分担出去'], go: ['settings', 'auto'] },
        { id: 'e_busy', k: '服务器 500 502 503 繁忙', ico: '🏚️', n: 'API 那边的服务器出问题了', re: /\b50[0234]\b|internal server error|bad gateway|service unavailable|gateway time|overloaded|server.?error|upstream|服务(器)?(繁忙|错误|异常)|系统繁忙/i,
          what: '不是你的问题，是 API 那边的机器出毛病了，或者人太多忙不过来。',
          how: ['等几分钟再试', '一直不好就换个模型，或者换个中转站'], go: ['settings', 'api'] },
        { id: 'e_time', k: '超时 太慢', ico: '⏳', n: '等太久，超时了', re: /timeout|timed out|超时|ETIMEDOUT|ESOCKETTIMEDOUT|\b524\b|\b408\b/i,
          what: '对方想了太久都没回话，谷雨等不下去了。',
          how: ['再试一次', '会「思考」的模型（名字带 R1、reasoner、thinking 的）本来就慢', '换个快一点的模型'], go: ['settings', 'api'] },
        { id: 'e_net', k: '连不上 没网 梯子 断网', ico: '📡', n: '连不上 API', re: /Failed to fetch|NetworkError|Load failed|network error|ERR_|ECONNREFUSED|ENOTFOUND|CORS|跨域|网络.*(错误|异常|失败)|无法连接/i,
          what: '谷雨根本连不上 API 那边：可能没网、要梯子的 API 没开梯子、地址写错了、对方挂了，或者浏览器不让连（跨域）。',
          how: ['先看看手机 / 电脑能不能正常上网', '用的是国外的 API（OpenAI、Claude、Gemini）要开梯子', '检查地址有没有拼错', '还不行就换一个中转站地址'], go: ['settings', 'api'] },
        { id: 'e_param', k: '参数 400', ico: '🎚️', n: '对方不认某个设置', re: /invalid_request_error|unsupported (parameter|value)|unrecognized|not supported.*(temperature|top_p|penalty|max_tokens)|Extra inputs|参数.*(错误|无效|不支持)|\b400\b|\b422\b/i,
          what: '谷雨发过去的某个设置（温度、Top-P、最大长度……）这个模型不认。',
          how: ['设置 → 生成参数，把你填过的数字都清空（留空＝用模型默认的）', '再试一次'], go: ['settings', 'gen'] },
        { id: 'e_empty', k: '空回 空白 没回 不回复 回了个空 没反应', ico: '🫥', n: '模型回了空白', re: /^__EMPTY__$/,
          what: '模型回了一个空的回答，一个字都没有。常见原因：被审核悄悄掐掉了、「思考」把字数用光了、中转站抽风。',
          how: ['点重新生成，再来一次', '设置 → 生成参数，把「最大回复长度」调大或清空', '换个模型试试'], go: ['settings', 'gen'] },
        { id: 'e_think', k: '只有思考 think 思维链', ico: '💭', n: '只写了「心里想的」，正文是空的', re: /^__THINK__$/,
          what: '模型只写了思考过程，还没写正文就停了（多半是字数上限太小，全被「想」用掉了）。',
          how: ['设置 → 生成参数，把「最大回复长度」调大或清空', '或者换成不带思考的模型版本'], go: ['settings', 'gen'] },
        { id: 'e_cut', k: '截断 说一半 不完整 没说完', ico: '✂️', n: '话说到一半被掐断了', re: /^__LENGTH__$/,
          what: '回复写到一半就停了——「最大回复长度」设得太小，没写完就到上限了。',
          how: ['设置 → 生成参数 → 把「最大回复长度」调大（或者清空，用模型默认）'], go: ['settings', 'gen'] },
        { id: 'e_json', k: '格式 json', ico: '🧾', n: '回复的格式不对', re: /JSON|格式不对|Unexpected end|parse/i,
          what: '模型回了内容，但不是谷雨要的那种格式（可能写到一半断了，或者只回了思考过程）。',
          how: ['再试一次', '把「最大回复长度」调大一点', '「全部开关」里打开「聊天回复格式坏了自动修一次」'], go: ['settings', 'auto'] },
        { id: 'e_voice', k: '语音 没声音 朗读 tts', ico: '🎙️', n: '语音接口出错', re: /^__VOICE__$/,
          what: 'TA 的声音（朗读、语音条、通话）用的那个语音接口报错了，所以 TA 没出声。',
          how: ['设置 → 🧰 功能设置 → TA 的声音，检查选的服务、key、音色', '不想折腾就选「浏览器自带朗读」，不花钱'], go: ['mini', 'voice'] },
        { id: 'e_image', k: '画图 发图失败 生图', ico: '🖼️', n: '画图接口出错', re: /^__IMAGE__$/,
          what: '角色发图 / 自拍要画图，画图接口报错了，这张图没画出来。',
          how: ['角色发图的设置里检查画图接口的地址和 key', '或者改成「图库」「搜图」，不花钱', '免费的 pollinations 偶尔也会抽风，过会儿再试'], go: ['settings', 'api'] },
        { id: 'e_vec', k: '向量 embedding 记忆', ico: '🧠', n: '向量记忆接口出错', re: /^__VEC__$/,
          what: '向量记忆要先把文字变成「向量」，这一步的接口报错了，所以 TA 这次没翻到旧记忆。',
          how: ['左边栏「更多」→ 记忆总览 → 🧠 向量记忆那一块：检查「向量记忆专用 API」的地址、key 和 Embedding 模型名（默认 text-embedding-3-small）', '没填专用 API 的话，它用的是主 API 的地址——DeepSeek 这类不卖向量，要另填一个（指南「🔧 接口配置教程 → ③ 记忆」有手把手），不想弄就把向量记忆关掉'], go: ['mem'] },
        { id: 'e_models', k: '拉取模型 模型列表', ico: '📋', n: '拉取模型列表失败', re: /^__MODELS__$/,
          what: '点「拉取模型」的时候，对方没把模型列表给过来（地址或 key 多半有一个不对，也有的中转站不提供列表）。',
          how: ['检查地址和 key 有没有填错、有没有多余空格', '实在拉不到，就去服务商网站抄一个模型名，手动填进去'], go: ['settings', 'api'] },
        { id: 'e_weather', k: '天气', ico: '🌦️', n: '天气没拉到', re: /^__WEATHER__$/,
          what: '天气是从免费的 Open-Meteo 拿的，这次没连上。不花钱，也不影响聊天。',
          how: ['多半是网络问题，过一会儿会自己好', '一直不好就去「行程与天气 → 天气」检查城市名'], go: ['mini', 'map'] },
        { id: 'e_other', k: '不认识 奇怪 未知', ico: '❓', n: '一个我也不认识的错', re: /^__OTHER__$/,
          what: '接口报了一个没见过的错。别担心，大多数时候过一会儿就好。',
          how: ['先再试一次', '点「📋 复制报错」，把复制的内容发给卖你 API 的人或者开发者问问'], go: ['settings', 'api'] }
    ];
    const errOf = msg => { const m = String(msg || ''); return ERRS.find(e => !/^\^__/.test(e.re.source) && e.re.test(m)) || null; };
    const errById = id => ERRS.find(e => e.id === id);
    const errTip = e => `${e.what}\n怎么办：\n${e.how.map((h, i) => '①②③④⑤'[i] + ' ' + h).join('\n')}`;
    window.gyErrDict = () => ERRS.map(e => ({ id: e.id, n: e.n, what: e.what, how: e.how.slice() }));
    window.gyErrClassify = m => { const e = errOf(m); return e ? e.id : null; };

    /* =====================================================================
       一、指南内容（手写，平时不动）
       go：去看看 → 见 GO；sw：要开的开关  c:xxx＝全部开关里的自动功能  x:xxx＝插件开关中心里的功能（x:xxx.auto＝「TA 会自己做」）
       k：额外的搜索词（客服用）
       ===================================================================== */
    const GUIDE = [
        { id: 'start', icon: '🧭', title: '先看这里', intro: '功能多，但其实只有几个大入口。记住这几个，九成的东西都能找到。', items: [
            { id: 'chat', t: '💬 聊天', d: '左边栏「聊天」。跟 TA 说话；输入框上面的 🎮 是小游戏。', go: ['view', 'chat'], k: '说话 私聊' },
            { id: 'mini', t: '🧩 小功能', d: '左边栏「小功能」。所有玩法的入口，顶上分「全部 / 陪伴 / 一起做 / 回忆 / 生活」。同一类的收进了合集，点进去是竖着的一列，点哪一行就直接打开哪个功能。', go: ['view', 'miniHub'], k: '玩法 合集 功能 入口' },
            { id: 'today', t: '📋 今天', d: '电脑上是页面右边那一栏，手机上点「去看看」会打开。今天 TA 做了什么、哪些功能有新动静，都在这里汇总，点一下跳过去。', go: ['today'], k: '右边 动态 汇总' },
            { id: 'memhub', t: '🧠 记忆总览', d: '左边栏「更多」→ 记忆总览。TA 记住的所有东西，每一条都能改、能删。', go: ['mem'], k: '记忆 记住' },
            { id: 'settings', t: '⚙️ 设置', d: '左边栏「设置」。开关、API、外观、备份、小手机模式都在这里；最上面就是这份指南和客服。', go: ['settings'] },
            { id: 'refresh', t: '🔄 刷新', d: '左边栏「更多」→ 🔄 刷新。导入插件或者更新之后点它，不用大退 App。', go: ['refresh'], k: '重启 重新加载' }
        ] },
        { id: 'first', icon: '🚪', title: '第一次用', intro: '按顺序做一遍就能开始。', items: [
            { id: 'api', t: '① 接上 API', d: '设置 → API 与模型：填地址和 key，点「拉取模型」选一个。副 API 填了的话，后台的小事（总结、客服答疑这些）会先用副 API。不会填就看下面「🔧 接口配置教程」，一步一步写好了。', go: ['settings', 'api'], k: '接口 key 密钥 模型 中转' },
            { id: 'card', t: '② 导入角色卡', d: '左边栏「角色中心」，顶上有「🖼️ 导入角色卡(图片)」和「📄 导入角色卡(JSON)」；也可以点「+ 创建新角色」自己写。', go: ['chars'], k: '角色卡 导入角色 新建角色 创建角色' },
            { id: 'plugin', t: '③ 装插件', d: '「更多」→ 设定库 → 🔌 插件。只导入「新玩法全家桶.json」这一个就够了：以前的单个插件会自动拿掉，你关掉过的功能也会保持关着，数据都在。', go: ['view', 'plugins'], k: '插件 全家桶 json 导入插件' },
            { id: 'backup', t: '④ 记得备份', d: '设置 → 数据备份与恢复。换手机、清缓存之前一定先导出一份，回来用「📤 导入恢复」。', go: ['settings', 'data'], k: '备份 导出 恢复 换手机 存档 丢' },
            { id: 'move', t: '从别的软件搬过来', d: '数据备份与恢复那一页能导入外部聊天记录（TXT / .jsonl）；预设去「更多」→ 设定库 → 🧩 预设。', go: ['settings', 'data'], k: '酒馆 聊天记录 预设 搬家 jsonl' }
        ] },
        { id: 'setup', icon: '🔧', title: '接口配置教程（手把手）', intro: '一步一步照着点就行，不用懂技术。最少只要配好「① 聊天」就能用；记忆、语音、生图都是选填，想要哪个配哪个。每一条右上角「去看看 ›」直接跳到要填的地方。', items: [
            { id: 'cfg_abc', t: '🌱 先认识三样东西', d: '不管配哪个接口，都是这三样：\n· 地址（Base URL）：去哪里要回答，像门牌号。比如 https://api.deepseek.com\n· Key（密钥）：你的钥匙，一长串，一般 sk- 开头。等于你的钱包，别发给别人。\n· 模型：要哪个 AI 来回答，比如 deepseek-v4-flash。\n地址的写法：一般写到 /v1 为止（https://某某.com/v1），后面的 /chat/completions 不要写，谷雨会自己加；DeepSeek 官方带不带 /v1 都行。\nKey 粘贴的时候前后别带空格。', go: ['settings', 'api'], k: '教程 配置 怎么填 地址 key 密钥 base url 什么意思 不会 小白' },
            { id: 'cfg_main', t: '① 💬 聊天：配主 API（必做）', d: '用 DeepSeek 举例，国内直接能用，便宜：\n① 打开 platform.deepseek.com，手机号注册登录\n② 左边「充值」，先充 10 块钱，够聊很久\n③ 左边「API keys」→「创建 API key」→ 名字随便写 → 复制那串 sk- 开头的（只显示这一次，先存到备忘录里）\n④ 回谷雨：设置 → API 与模型 → 🌟 主 API\n　接口地址填 https://api.deepseek.com\n　API Key 粘贴刚才那串\n⑤ 点「🔄 拉取模型 (主API)」，弹出成功后在下拉里选 deepseek-v4-flash\n⑥ 去聊天随便发一句，TA 回你了就成功啦\n用中转站的：地址填卖家给的那个（一般 https://xxx.com/v1），Key 填卖家给的令牌，然后同样拉取模型、从列表里点一个，别自己手打。', go: ['settings', 'api'], k: '主api 聊天 配置 deepseek 深度求索 注册 充值 中转 怎么接 第一次 教程' },
            { id: 'cfg_sub', t: '② 💰 省钱：配副 API（选填）', d: '副 API 帮你干评论区、小游戏、插件、总结这些量大的杂活，主 API 就只管聊天，省钱。\n最简单的配法：地址、Key 跟主 API 填一模一样，只把模型选成便宜的那个。\n① 设置 → API 与模型 → 💬 副 API\n② 填副 API 接口地址、副 API Key\n③ 点「🔄 拉取模型 (副API)」→ 选一个便宜的\n⚠️ 地址、Key、模型三样要填全才算数，少一样就全部还是走主 API（不会坏，只是没省到钱）。', go: ['settings', 'api'], k: '副api 省钱 便宜 配置 教程 杂活' },
            { id: 'cfg_vec', t: '③ 🧠 记忆：配向量记忆（选填）', d: '向量记忆让 TA 能按「意思」翻出很久以前的聊天（你提到猫，TA 能想起三个月前你说过的那只猫）。\n⚠️ DeepSeek 没有向量模型！主 API 用 DeepSeek 的，一定要另外填一个「向量记忆专用 API」。推荐硅基流动，向量模型免费：\n① 打开 cloud.siliconflow.cn 注册登录\n② 左边「API 密钥」→「新建 API 密钥」→ 复制\n③ 回谷雨：左边栏「更多」→ 记忆总览 → 往下找「🧠 向量记忆总开关 / 模型 / 字数上限」\n④ 🧬 向量记忆专用 API：地址填 https://api.siliconflow.cn/v1 ，Key 粘贴\n⑤ 点「🔄 拉取模型」→ 选 BAAI/bge-m3\n⑥ 勾上「启用向量记忆与资料库语义检索」\n用的是 OpenAI 或者中转站、而且它卖 embedding 模型的，也可以不填专用 API，直接在下拉里选 text-embedding-3-small。\n模型定下来就别老换：换了以后旧记忆算出来的向量对不上，要重新算。', go: ['mem'], k: '向量 记忆 embedding 嵌入 硅基流动 siliconflow bge 配置 教程 翻旧账 想不起来' },
            { id: 'cfg_tts', t: '④ 🎙️ 语音：让 TA 有声音（选填）', d: '在哪：小功能 → 🎙️ TA 的声音 → 最上面「默认声音」那个下拉框选服务。\n不想花钱：选「浏览器自带」，什么都不用填，就是有点机器味。\n想好听又便宜，推荐硅基流动（跟向量记忆可以用同一把 Key）：\n① 下拉选「OpenAI 格式（/v1/audio/speech，硅基流动这类中转也是）」\n② 接口地址填 https://api.siliconflow.cn/v1/audio/speech\n③ Key 粘贴硅基流动的密钥\n④ 模型旁边点「⟳ 拉取模型」，选带 CosyVoice 的（比如 FunAudioLLM/CosyVoice2-0.5B）\n⑤ 音色填「模型名:音色」，比如 FunAudioLLM/CosyVoice2-0.5B:alex。男声 alex / benjamin / charles / david，女声 anna / bella / claire / diana\n⑥ 点「试听」，听到声音就好啦\n下面几条是别家的配法，挑一家就行。', go: ['mini', 'voice'], k: '语音 声音 tts 朗读 配置 教程 硅基流动 cosyvoice 音色 试听 没声音' },
            { id: 'cfg_mm', t: '　🎙️ 语音 · MiniMax（声音最像真人）', d: '① 打开 platform.minimaxi.com 注册登录，先充一点钱\n② 右上角头像 →「账户管理」→「接口密钥」→「创建新的密钥」→ 复制\n③ TA 的声音 → 下拉选「MiniMax」\n④ 接口地址不用改；API Key 粘贴；GroupId 新账号空着就行（老账号报错再去账户信息里抄过来）\n⑤ 模型默认 speech-02-hd 就行\n⑥ 音色旁边点「⟳ 拉取音色」，从下拉里挑一个喜欢的；情绪可以空着\n⑦ 点「试听」', go: ['mini', 'voice'], k: 'minimax 海螺 语音 配置 教程 音色 groupid' },
            { id: 'cfg_volc', t: '　🎙️ 语音 · 豆包 / 火山引擎', d: '① 打开 console.volcengine.com 注册登录（要实名）\n② 搜「豆包语音」进去 →「创建应用」，勾上「语音合成」\n③ 应用详情里能看到 AppID 和 Access Token，两个都复制\n④ 在控制台的音色列表里挑一个音色（有的要先开通），复制它的 voice_type\n⑤ TA 的声音 → 下拉选「豆包 / 火山引擎」：AppID、Access Token 粘贴；Cluster 不用改（volcano_tts）；音色 voice_type 粘贴\n⑥ 点「试听」\n⚠️ 网页版大概率被浏览器拦（跨域），用桌面版 exe 或者打包的 App 就没事。', go: ['mini', 'voice'], k: '豆包 火山 字节 volcengine 语音 appid token voice_type 配置 教程' },
            { id: 'cfg_fish', t: '　🎙️ 语音 · Fish Audio（好多现成的角色声音）', d: '① 打开 fish.audio 登录\n② 进「API」页面 → 创建一个 API Key → 复制\n③ 在网站上找到喜欢的声音，打开它的页面，网址最后那一长串字母数字就是「声音模型 ID」\n④ TA 的声音 → 下拉选「Fish Audio」：API Key 粘贴；声音模型 ID 粘贴（或者点「⟳ 拉取音色」挑）；模型默认 s1\n⑤ 点「试听」', go: ['mini', 'voice'], k: 'fish audio 语音 声音 reference_id 配置 教程 克隆' },
            { id: 'cfg_sovits', t: '　🎙️ 语音 · GPT-SoVITS（用 TA 本人的声音，本地跑）', d: '要你自己电脑上装好 GPT-SoVITS，不花钱，但只能在这台电脑（或同一个局域网）上用。\n① 在 GPT-SoVITS 文件夹里启动 api_v2（命令行 python api_v2.py），窗口别关\n② 准备一段 3~10 秒、干净的 TA 的录音（wav），记住它在电脑上的完整路径\n③ TA 的声音 → 下拉选「GPT-SoVITS」\n　api_v2 地址：http://127.0.0.1:9880/tts（默认就是）\n　参考音频路径：比如 D:\\声音\\ta.wav\n　参考音频里说的那句话：一字不差地打出来\n④ 点「试听」', go: ['mini', 'voice'], k: 'sovits gpt-sovits 克隆 本地 语音 声音 参考音频 api_v2 配置 教程' },
            { id: 'cfg_voice_each', t: '　🎙️ 每个角色不一样的声音', d: 'TA 的声音 →「每个角色自己的声音」：先选角色，然后\n· 跟默认一样：什么都不用动\n· 默认接口，换个音色：只改音色，Key 不用再填（最常用）\n· 自己一整套：这个角色用另一家服务，单独填\n填完点「试听」。', go: ['mini', 'voice'], k: '每个角色 不同声音 音色 男声 女声 单独 配置' },
            { id: 'cfg_stt', t: '　🗣️ 你发语音，转成文字', d: '聊天栏的 🎙️。默认用浏览器自带的识别，不用填。\n桌面版或者有的手机上识别不了，就填一个转文字接口（硅基流动的免费）：\nTA 的声音 → 往下「🗣️ 你发语音条」\n　转文字接口地址：https://api.siliconflow.cn/v1/audio/transcriptions\n　Key：硅基流动的密钥\n　模型：点「⟳ 拉取模型」选 FunAudioLLM/SenseVoiceSmall', go: ['mini', 'voice'], k: '语音转文字 识别 stt whisper 听不懂 发语音 转写 配置 教程' },
            { id: 'cfg_img', t: '⑤ 🖼️ 生图：让 TA 发照片（选填）', d: '在哪：小功能 → 📷 角色发图片 →「① 默认走哪条路」点「🎨 调接口生图」，下面就会出来「🎨 画图接口」。\n不花钱：点「Pollinations（免费 · 不用 key）」，什么都不用填。慢的时候要等十几秒。\n用付费接口（中转站基本都有）：\n① 点「OpenAI 兼容的画图接口（要 key）」\n② 接口地址要填完整，带上 /v1/images/generations，比如 https://中转站/v1/images/generations\n③ Key 粘贴\n④ 点「🔄 拉取模型」挑一个画图模型（或者手填，比如 dall-e-3、gpt-image-1）；尺寸 1024x1024\n⑤ 点「💾 保存」\n想让 TA 每次长得一样：同一页下面给 TA 写「形象」（或点「🧍 从人设里抽一份」），勾「用这份形象」，再点「🖼️ 试画一张自拍」看看。\n不想画：选「🗂️ 从图库里挑」或者「🌐 网上搜一张」，都不花钱。', go: ['mini', 'charPhoto'], k: '生图 画图 发图 自拍 照片 pollinations dall-e gpt-image 画图接口 配置 教程 形象' },
            { id: 'cfg_vision', t: '　👀 让 TA 看得懂你发的图', d: '你发图给 TA、现实小任务交差、拍照，要模型会「看图」。这个不用另外配，用的就是主 API / 副 API 的模型——只要换一个会看图的模型。\n名字里带 vision、vl、4o、gemini、claude、gpt-5 的一般都能看图。拿不准就问卖你 API 的人：「这个模型支持识图吗？」\n模型不会看图也不会坏，TA 只是看不见图。', go: ['settings', 'api'], k: '识图 看图 多模态 vision 发图 看不懂图 配置' },
            { id: 'cfg_push', t: '⑥ ☁️ 关了网页也能收到 TA 的消息（进阶，选填）', d: '手机锁屏、网页关掉以后，靠云端替你叫醒 TA。要自己部署一次，免费但步骤多，不想折腾可以跳过。\n① 打开 dash.cloudflare.com 注册 → Workers 和 Pages → 创建 Worker，名字随便\n② 编辑代码：把谷雨文件夹里 worker.js 的内容全部粘贴进去，部署（以前部署过的，谷雨更新到 247 以后要再粘一次新的，不然「📲 谷雨自己的通知」用不了）\n③ 存储（KV）里新建一个命名空间；回 Worker →「设置 → 绑定」→ 添加 KV，变量名必须是 PROACTIVE_KV\n④「设置 → 变量和机密」→ 添加 AUTH_TOKEN，值自己编一串复杂的字母数字\n⑤「设置 → 触发事件」→ 添加 Cron 触发器：*/10 * * * *（每 10 分钟看一次）\n⑥ 回谷雨：设置 → 通知与云端 → 勾「☁️ 云端主动消息唤醒」，填 Worker 地址（https://名字.xxx.workers.dev）、共享密钥（跟 AUTH_TOKEN 一模一样）\n⑦ 选一种让手机响的办法（可以都开）：\n· 推荐：「📲 谷雨自己的通知」——弹的就是谷雨，点了直接回到 TA 的聊天（看下面两条：网页一条、安卓 App 一条）\n· 或者：手机装 ntfy（应用商店搜 ntfy），点 + 订阅一个 topic，名字用一长串乱码，比如 lin-ta-9f8x2q，把同样的名字填进「ntfy topic」', go: ['settings', 'notify'], k: '云端 推送 通知 锁屏 后台 cloudflare worker ntfy 关了网页 收不到 配置 教程 部署' },
            { id: 'cfg_webpush', t: '　📲 网页 / 主屏幕：自己弹通知，不用 ntfy', d: '配好上一条的 Worker 以后，在要收通知的那台手机（或电脑）上：\n① 用 https 网址打开谷雨（GitHub Pages 那个网址），本地文件打开不行\n② 苹果手机：先点 Safari 下面的「分享」→「添加到主屏幕」，以后从桌面图标打开谷雨（要 iOS 16.4 以上）。安卓 Chrome / Edge、电脑 Chrome / Edge 不用这一步，加到主屏幕也更好\n③ 设置 → 通知与云端 → 往下找「📲 谷雨自己的通知」→ 勾「🌐 这台设备接收推送」→ 弹出来问要不要通知，点「允许」\n④ 点「🔌 测试连接（发一条测试通知）」，锁屏等几秒，弹出「谷雨测试通知」就好了\n以后 TA 到点找你，手机直接弹「立夏 发来消息」这样的通知，点一下打开谷雨、直接到 TA 的聊天，关着时 TA 说的话也一起收回来。\n几台设备就在几台上各勾一次（最多记 8 台）；不想要了把勾去掉。谷雨正开着、你正看着的时候不会再弹，免得吵。', go: ['settings', 'notify'], k: '自己的通知 网页推送 web push 主屏幕 添加到主屏幕 苹果 iphone 安卓 chrome 弹通知 原生 通知 不用 ntfy 允许通知' },
            { id: 'cfg_unipush', t: '　🤖 安卓 App：自己弹通知（uni-push）', d: 'App 里的网页不支持上一条那种推送，要用 DCloud 的 uni-push（就是个推，免费）。要重新打一次包：\n① 打开 dev.dcloud.net.cn 登录（跟 HBuilderX 同一个账号）→ 我的应用 → 点谷雨 → 左边「uni-push」→「1.0（老版）」→「消息推送」，按提示开通，包名、签名填跟打包时一样的\n② 开通后点「应用配置」，能看到 AppID、AppKey、MasterSecret 三样，先放着\n③ HBuilderX 打开 App 的工程 → manifest.json →「App 模块配置」→ 勾「Push（消息推送）」→ 选「uni-push」→ 云打包，装上新的 App\n④ 打开新 App：设置 → 通知与云端 →「📲 谷雨自己的通知」→ 勾「🤖 安卓 App 通知」，把三样粘进去；下面显示出「这台手机的 cid」就说明推送模块装上了\n⑤ 点「🔌 测试连接（发一条测试通知）」，看到「🤖 App（uni-push）✅」，手机弹通知就好了\n想要 App 被杀掉以后也收得到：在 DCloud 的 uni-push 里把你手机牌子的「厂商推送」也配上（华为、小米、OPPO、vivo 各有一页，照着填）；没配的话 App 被清掉就只能等你下次打开。\n点通知会打开谷雨、直接到 TA 的聊天。', go: ['settings', 'notify'], k: 'uni-push unipush 个推 app 安卓 apk 推送 通知 hbuilderx dcloud appid appkey mastersecret cid 厂商推送 弹通知' },
            { id: 'cfg_pushav', t: '　🖼️ 通知上显示 TA 的头像', d: '谷雨开着时弹的通知、关着时云端推的网页通知、App 推送、ntfy，都会带上是谁发来的、TA 的头像，跟微信一样。\n云端那份要做一件事：把谷雨文件夹里新的 worker.js 重新粘到 Cloudflare 部署一次。头像是手机自动传一张很小的图到你自己的 Worker 上，别人看不到你的其它东西。', go: ['settings', 'notify'], k: '通知头像 头像 推送头像 通知没头像' },
            { id: 'cfg_keepalive', t: '　🎵 后台保活：别让手机把 TA 冻住', d: '手机切到后台一会儿就会把谷雨冻住，TA 到点了也说不了话（打开那一刻才补上）。开了「后台保活」，谷雨会一直放一段很轻的声音，手机当它在放歌，就不容易冻住。\n在哪：设置 → 通知与云端 → 最下面「🎵 后台保活」；全部开关「🔔 通知与后台」里也有，两边是同一个开关。默认关着，要不要用你自己定。\n放什么能选：「几乎听不到的底噪」（推荐）或「轻轻的雨声」（听得见，当白噪音也行）。\n要知道的：\n· 会多耗一点电\n· 会抢别的 App 的音乐，听歌的时候先关掉\n· 网页版要先点一下页面才开始放（浏览器的规矩）；通知栏会多一个「谷雨在后台陪着你」的播放条，点暂停就是关掉保活\n· App 里还会让手机别彻底睡着\n· 手机实在要省电还是可能把它杀掉，所以最稳的是配上「📲 谷雨自己的通知」，两样一起用\n安卓 App 再把这几样设一下更稳：手机设置 → 应用 → 谷雨 → 电池选「不限制 / 无限制」；打开「允许自启动」「允许后台活动」；多任务界面里把谷雨那张卡片往下拉一下加把锁 🔒', go: ['settings', 'notify'], sw: ['c:gyKeepAlive'], k: '后台 保活 被杀 冻住 挂后台 不说话 锁屏 音乐 静音 白噪音 雨声 耗电 省电 电池 自启动 后台活动' },
            { id: 'cfg_push_use', t: '　☁️ 云端通知配好以后，平时怎么用', d: '上面配好以后，这样用：\n① 先点一次「🔌 测试连接（云端 Worker）」，再点一次「🔌 测试连接（发一条测试通知）」（都在 设置 → 通知与云端），两个都弹「能用」就对了\n② 定好 TA 多久来找你：左边栏「角色中心」→ 点角色名字进编辑 →「💬 主动发消息间隔（私聊）」填个数，比如每 2 小时；想让 TA 关着网页也发推，就填「⏱️ 自动发帖频率」\n⚠️ 云端只认这里填的数字。这里填 0、交给「TA 会自己做」的角色，关了网页以后云端不会替 TA 说话\n③ 改完人设或者频率，打开谷雨待一下再切走：谷雨每次切到后台、开着时每 3 分钟，会把角色人设、最近 8 句聊天、6 条推文交给云端\n④ 然后就能关网页、锁屏了。云端每 10 分钟看一次谁到点了，到点就写一条，推到你开了的地方（谷雨自己的通知 / ntfy）。通知标题长这样：「名字 发来消息」「名字 发布了新推文」「👀 发现私下互动」\n⑤ 点「谷雨自己的通知」会直接打开谷雨、到 TA 的聊天；点 ntfy 的通知只会打开 ntfy，谷雨要自己点开。打开以后，关着时 TA 说的话、发的推、别的角色点的赞和评论，会自动收进聊天记录和首页\n要知道的：\n· 用副 API（没填副 API 就用主 API），每写一条花一次的量。这是云端花的，谷雨的「📊 Token 用量」里没有，要去模型那家的后台看\n· 每 10 分钟最多两个角色发消息、两个角色发推\n· 云端写的时候只看人设和最近几句，不翻记忆和世界书，所以会比开着网页时简单一点；回到谷雨以后一切照常\n· 「🌙 休息时间段」（设置 → 互动与描写）云端也守着，那段时间不会吵你\n· 不想要了：把「☁️ 云端主动消息唤醒」勾掉；想连 Worker 一起停，去 Cloudflare 把 Cron 触发器删掉', go: ['settings', 'notify'], k: '云端 通知 怎么用 用法 ntfy 锁屏 关了网页 主动发消息 频率 间隔 推文 收到 平时 教程 使用' },
            { id: 'cfg_push_fix', t: '　☁️ 云端通知收不到？一条条对', d: '先点「🔌 测试连接（发一条测试通知）」，它会把每条路（📱 ntfy / 🌐 网页推送 / 🤖 App）通没通都列出来，哪条 ❌ 就看哪条。通了还收不到，再对一遍：\n① 测试说「Worker 是旧版的」：把谷雨文件夹里最新的 worker.js 重新粘到 Cloudflare，点部署\n② 网页推送：是不是 https 打开的；苹果是不是从主屏幕图标打开的；浏览器的网站设置里「通知」是不是允许；换了浏览器 / 清了数据要重新勾一次「🌐 这台设备接收推送」\n③ App：下面有没有显示 cid（没有＝打包没勾 Push 模块）；AppID / AppKey / MasterSecret 有没有粘错；App 被清掉后收不到＝厂商推送没配\n④ ntfy：订阅的 topic 和谷雨里填的一个字都不差（大小写也算）\n⑤ 手机设置里允许谷雨（或 ntfy）发通知；安卓把它的「省电 / 后台限制」关掉，不然锁屏久了会被系统掐掉\n⑥ 角色的「💬 主动发消息间隔」不是 0\n⑦ 改完以后打开过一次谷雨（不然云端拿到的还是旧的）\n⑧ 副 API / 主 API 的 Key 还有钱、没过期（云端用的是同一把）\n⑨ 现在不在「🌙 休息时间段」里\n⑩ Cloudflare 里 Worker 的「触发事件」有 */10 * * * *，「绑定」里有 PROACTIVE_KV\n⑪ 等够时间：到点以后最多再等 10 分钟\n还不行：Cloudflare → 你的 Worker →「日志」（Logs）点开实时日志，等下一个 10 分钟，看红字写的什么，复制给客服问', go: ['settings', 'notify'], k: '云端 通知 收不到 没反应 没通知 ntfy 不响 推送 失败 排查 worker 坏了 自己的通知 web push uni-push cid' },
            { id: 'cfg_relay', t: '🛒 中转站是什么、怎么挑', d: '中转站＝帮你代买各家模型的小店：一个地址、一把 Key，就能用 GPT、Claude、Gemini 这些国外模型，国内网络也能连。\n买之前问卖家三件事：\n① Base URL 是什么（填进「接口地址」）\n② 令牌 / Key 在哪拿（一般在它网站的「令牌」页自己建一个）\n③ 网页里能不能直接用（支不支持跨域 CORS）——不支持的话网页版会一直转圈，只能用桌面版或 App\n小建议：先充一点点试试；建令牌时可以设个额度上限，花超了也不心疼；模型名永远以「拉取模型」拉到的为准，别抄网上的。', go: ['settings', 'api'], k: '中转 中转站 代理 买api 哪里买 令牌 gpt claude gemini 国外模型 怎么选' },
            { id: 'cfg_ver', t: '🖥️ 网页版、桌面版、App：接口为什么有的能用有的不能', d: '浏览器有个安全规矩叫「跨域（CORS）」：别人家的服务器没说「允许网页来连」，浏览器就不让连。\n· 网页版（浏览器打开）：受这个规矩管。豆包 / 火山语音、部分中转站、联网探索读正文最容易被拦\n· 桌面版 exe、打包的安卓 App：不受这个规矩管，同样的地址和 Key 基本都能连\n所以：网页版一直转圈、报 Failed to fetch 或 CORS，先别怀疑自己填错了，换桌面版 / App 试一下，或者换一家支持跨域的服务。', go: ['settings', 'api'], k: '跨域 cors failed to fetch 网页版 桌面版 exe app apk 转圈 连不上 为什么' },
            { id: 'cfg_param', t: '🎚️ 生成参数：要不要动', d: '在：设置 → 生成参数。不懂的话全部留空 / 不动，用服务商默认的就很好。只有两种情况要动：\n· TA 的话老是写到一半就断：把「单次输出上限 max_tokens」填大一点，比如 8192（只是上限，调大不会变贵）。用会「思考」的模型更要调大\n· 觉得 TA 说话太死板 / 太发散：调「温度」，0.7 左右稳一点，1.0 左右活泼一点，别超过 1.3\nTop K 有的服务商不认，报「参数不认」就把它清空。下面那几栏是「聊天回复写多少字、发几条」，按喜好调。', go: ['settings', 'gen'], k: '生成参数 温度 temperature max_tokens 截断 写一半 断了 top p top k 采样 字数' },
            { id: 'cfg_call', t: '📞 打电话要配什么', d: '聊天顶上的 📞 打给 TA；通话界面右上角 ⚙️（或者 设置 → 互动与描写）里选「怎么打」：\n① 纯文字：什么都不用配\n② 加朗读：TA 说的话念出来\n③ 我也说话：用麦克风，浏览器自带识别转成文字（要允许麦克风；有的浏览器 / 桌面版不支持，就用 ①②）\n「用什么念」：在「🎙️ TA 的声音」里给这个角色配过声音的，通话自动用那个声音，这里不用再填；没配过的才用这里的「浏览器自带」或「自己的接口」（填法跟 TA 的声音里的 OpenAI 格式一样）。', go: ['settings', 'interaction'], k: '打电话 通话 电话 来电 麦克风 朗读 声音 配置' },
            { id: 'cfg_web', t: '🌐 联网探索：让 TA 自己上网', d: '在：小功能 → 联网探索 →「🔌 从哪儿取内容」。\n· DuckDuckGo（默认）：免费、不用 Key，点上就行\n· Jina：读出来的内容最干净，要 Key：去 jina.ai 免费注册，复制 API Key 粘到下面的框里\n· 自定义接口：自己搭的 SearXNG 之类，地址里用 {q} 代替关键词\n· 不联网：一个请求都不发，TA 只用模型自己知道的\n「读正文走哪条路」：桌面版 / App 选「直连」；网页版选一个免 key 的代理。拿不准就点「🩺 体检」，它会挨个试，告诉你哪条能用。', go: ['mini', 'web_explore'], k: '联网探索 上网 搜索 jina duckduckgo searxng 代理 读正文 体检 配置' },
            { id: 'cfg_hot', t: '🔥 真实热搜拉不下来', d: '真实热搜用的是三个免费的公开接口，不要 Key，平时点开就有。偶尔它们挂了：\n① 过一会儿再点刷新\n② 小功能 → 🔥 真实热搜，下面能填你自己的接口（地址里用 {s} 代替微博 / 知乎这些）\n③ 或者直接把热搜一条一行粘贴进去，TA 照样能聊', go: ['mini', 'gyxHot'], sw: ['x:gyxHot'], k: '热搜 拉不下来 接口 失败 粘贴 微博 知乎' },
            { id: 'cfg_widget', t: '📲 小组件放到真手机桌面', d: '在：小功能 → 📲 手机桌面小组件。里面每个标签都写了步骤：\n· 🤖 安卓：装「谷雨小组件」App（源码在项目的「手机桌面小组件/安卓App」文件夹）；在谷雨安卓 App 里用就不用填中转站\n· 🍎 苹果：先搭一个免费的 Cloudflare 中转站（跟云端推送是同一个网站），再用 Scriptable 加小组件；「复制中转站代码」「复制 Scriptable 脚本」两个按钮直接给你代码\n· 网页 / 苹果要把「中转站地址」和「口令」填在「同步」那一页', go: ['mini', 'gyxPhoneW'], sw: ['x:gyxPhoneW'], k: '小组件 真手机 桌面 安卓 苹果 iphone scriptable 中转站 widget 配置' },
            { id: 'cfg_git', t: '🔗 从 GitHub 链接导入角色卡 / 世界书 / 预设', d: '在：设置 → 数据备份与恢复 → 🔗 从Git链接导入。\n把文件的链接粘进去，点「📥 拉取并导入」，它会自己认出是角色卡、世界书还是预设。\nGitHub 网页上的链接也行，会自动转成直链（raw.githubusercontent.com）；Gitee、jsdelivr 的直链也都可以。', go: ['settings', 'data'], k: 'github git 链接 导入 角色卡 世界书 预设 raw 直链' },
            { id: 'cfg_safe', t: '🔒 Key 的安全和换手机', d: '· 导出的备份文件里带着你所有的 Key（聊天、副、向量、语音、画图……）。所以换手机导入备份，Key 都会跟着回来，不用重填\n· 也正因为这样：备份文件别发给别人、别传到网上；截图 API 设置页之前把 Key 遮住\n· 万一 Key 泄露了：去那家网站把这把 Key 删掉，重新建一把，回谷雨换上就行\n· 给朋友分享角色卡、世界书没关系，那里面没有 Key', go: ['settings', 'data'], k: 'key 安全 泄露 备份 分享 换手机 重填 密钥 被盗' },
            { id: 'cfg_test', t: '🔌 测试连接：填完点一下就知道能不能用', d: '每个要填地址 / Key 的地方旁边都有一颗「🔌 测试连接」，点了会真的去调一次：\n· 主 API、副 API：设置 → API 与模型，各自模型下面（用框里现在填的，不用先保存）。真的发一句话，模型回了就是能用，还会告诉你用了几秒、会不会「思考」\n· 向量：记忆总览 → 🧠 向量记忆，Embedding 模型下面\n· TA 的声音：小功能 → 🎙️ TA 的声音，默认声音下面、每个角色自己的声音下面（念一句给你听）；转文字接口下面也有一颗\n· 画图：📷 角色发图片 → 🎨 调接口生图 → 画图接口下面（真的画一张小图；付费接口会先问你）\n· 打电话：通话 ⚙️ → 自己的接口下面\n· 云端 Worker、谷雨自己的通知（真的推一条测试通知，每条路通没通都列出来）：设置 → 通知与云端\n能用 / 不能用都会弹一个窗（不能用会用大白话写原因和怎么办），通知页也记一条，点通知回到那个设置。\n测聊天、向量、语音、画图会花一点点（一句话的量 / 一张图），聊天和向量的用量记在「📊 Token 用量 → 接口测试」。', go: ['settings', 'api'], k: '测试 测试连接 能不能用 连得上吗 试一下 检查 模型可用 通不通 测一下' },
            { id: 'cfg_plan', t: '🎫 用会员登录，不用自己买 Key', d: '在：设置 → API 与模型，最上面「🎫 会员 / 一键登录」。\n· ChatGPT Plus / Pro 会员：点「登录 ChatGPT」→ 浏览器里登你的 ChatGPT 账号 → 回到谷雨就能用了，花的是会员额度，不另外花钱。只有电脑桌面版能登（官方只允许这样登）。\n· OpenRouter：点一下跳过去登录，回来 Key 自动填好（网页 / App / 桌面版都行），里面能选很多家的模型。\n· Gemini：去 Google AI Studio 免费拿一个 Key，粘进来自动配好。\n· 中转站包月：跟以前一样，在下面填中转站给你的地址和 Key。\n· Claude 会员、Gemini 会员不能这样用：官方明确禁止，用了会封号，所以没做。\n登好以后点「🔌 测试连接」试一下。', go: ['settings', 'api'], k: '会员 订阅 包月 plus pro chatgpt openrouter gemini 登录 一键登录 不用key 没有key' },
            { id: 'cfg_mcp', t: '🧰 我的 MCP：给 TA 接上小工具', d: 'MCP 就是给 AI 用的「小工具插头」：接上一个，TA 就多一样本事，比如查天气、搜网页、读写你的笔记、看日历。\n在：小功能 → 🧰 我的 MCP →「＋ 添加」。\n· 网址形式：填工具给你的网址（有的还要填 Key），网页 / App / 桌面版都能用。\n· 本地形式：填一行命令（比如 npx 什么什么），只有电脑桌面版能用，适合接你电脑上的东西。\n· 也可以直接粘贴 Claude 桌面版的 JSON 配置，一次导进来好几个。\n加好后点「🔌 测试连接」，能看到连没连上、有哪些工具；每个工具能单独关，也能选哪几个角色能用。\n最后把「TA 回你之前可以用 MCP 工具」打开（默认关着）。以后私聊里 TA 觉得需要就会先用工具再回你，聊天里多一行小字，点开能看 TA 查了什么、查到了什么。用过的记录存多少你自己定，能导出。', go: ['mini', 'mcp'], sw: ['c:mcpOn'], k: 'mcp 工具 插头 查天气 搜网页 笔记 工具调用 tool' },
            { id: 'cfg_check', t: '✅ 配完了没反应？挨个对一遍', d: '先点那个接口旁边的「🔌 测试连接」，它会告诉你是哪一步错了。还不行再对一遍：\n① Key 前后有没有多粘了空格\n② 主 API、副 API、向量 API 三个格子有没有填串\n③ 地址是不是多写了 /chat/completions，或者填成了官网首页\n④ 账户里有没有钱（新号要先充值）\n⑤ 模型是不是从「拉取」的列表里点的，不是自己手打的\n⑥ 网页版一直转圈、报 Failed to fetch / CORS：是那家不让浏览器直接连，换桌面版 exe、打包的 App，或者换个中转站\n还不行就打开 🛟 客服 →「发现的问题」，里面会用大白话写清楚是哪一步错了。', go: ['help', 'issues'], k: '没反应 不回 配置失败 填了没用 检查 排查 转圈 连不上 教程' }
        ] },
        { id: 'chat', icon: '💬', title: '聊天里能做的', items: [
            { id: 'game', t: '🎮 小游戏', d: '小功能 →「🎮 游戏厅」，或者聊天输入框上方的 🎮——两边是同一批游戏：棋牌、派对、推理、冒险、剧本杀、海龟汤、恋综……', go: ['mini', 'gameHall'], sw: ['x:gyxGame', 'x:gyxTrpg', 'x:gyxFish'], k: '游戏 冒险 寻宝 帮我选 跑团 钓鱼' },
            { id: 'listen', t: '🎬 听取模式', d: '聊天输入框上面那个 🎬：像 galgame 一样一句句播 TA 的话，有配音；装了「角色立绘差分」插件就用立绘，表情跟着每句换。右键 🎬 能设置「TA 回完话自动听」。', go: ['mini', 'gyxListen'], sw: ['x:gyxListen'], k: '听取 配音 立绘 galgame 一句句' },
            { id: 'moodskin', t: '🌈 情绪皮肤', d: 'TA 生气时聊天界面发红，难过变灰下雨，开心冒星星，深夜是星空。每种都能单独关。', go: ['mini', 'gyxMoodSkin'], sw: ['x:gyxMoodSkin'], k: '情绪 心情 界面 变色' },
            { id: 'doit', t: 'TA 说到做到', d: 'TA 在聊天里说「给你打电话」「转你两百」「一起看电影」，来电、转账、邀请卡会真的弹出来。', go: ['view', 'chat'], sw: ['c:inviteInChat'], k: '打电话 转账 邀请' },
            { id: 'len', t: '回复长短（新版 / 旧版模式）', d: '设置 → 🎚️ 生成参数 →「📝 AI 生成字数上限设置」→「💬 聊天回复条数/长度模式」。经典＝旧版，TA 想说多少说多少；限制＝新版，按你设的条数和长度来。', go: ['settings', 'gen'], k: '新版 旧版 模式 条数 长度 太长 太短 回复 字数' },
            { id: 'voice', t: '🗣️ TA 怎么说话', d: '小功能 → TA 怎么说话：相处模式、风格调料、平视、口头禅。', go: ['hub', 'hub_voice'], sw: ['x:gyxBond', 'x:gyxSpice', 'x:gyxFair', 'x:gyxEcho'], k: '语气 口癖 口头禅 风格 人设 写弱' },
            { id: 'tts', t: '🎙️ TA 的声音', d: '设置 → 🧰 功能设置 → TA 的声音。', go: ['mini', 'voice'], k: '语音 声音 朗读 语音条' },
            { id: 'unsaid', t: '🤐 TA 没说出口的', d: '小功能 → TA 没说出口的：心声、思维链收纳盒、草稿箱。', go: ['hub', 'hub_unsaid'], sw: ['x:gyxDraft'], k: '心声 思维链 草稿' },
            { id: 'alive', t: '🫀 活人感', d: '设置 → 活人感：TA 不总是在线、情绪会留到下一轮、按 TA 自己的打字习惯说话。', go: ['settings', 'alive'], sw: ['c:aliveOffline', 'c:aliveMood', 'c:aliveVoice'], k: '在线 情绪 打字 真人' }
        ] },
        { id: 'life', icon: '🌿', title: 'TA 自己的生活', intro: '谷雨里的 TA 不只是等你说话，TA 会自己过日子、自己来找你。', items: [
            { id: 'auto', t: '自主模式', d: '打开角色资料页，切到「TA 自己决定」。TA 会根据人设和你们最近的事，自己挑一件事去做——写信、换皮肤送你、提一笔旧账、看天气提醒你带伞……', go: ['chars'], sw: ['c:charAutonomy'], k: '自主 自己决定 自己做 自主行动' },
            { id: 'acts', t: 'TA 能做哪些事', d: '插件开关中心 →「TA 自主行动」那一页，每一件事都能单独关。', go: ['gyxact'], k: '自主行动 动作 关掉' },
            { id: 'reach', t: '主动找你聊天', d: '开着的话 TA 会自己来私聊你。', go: ['sw', '角色主动找你聊天'], sw: ['c:proactiveChat'], k: '主动 找我 不找我 不理我' },
            { id: 'letter', t: '主动写信', d: '写好的信在左边栏「信件与日记」。', go: ['view', 'diary'], sw: ['c:proactiveLetter', 'c:letterReply'], k: '信 回信' },
            { id: 'post', t: '自己发帖', d: '发在主页。', go: ['view', 'home'], sw: ['c:autoPost', 'c:postReactions'], k: '推文 发帖 主页' },
            { id: 'web', t: '自己上网看东西', d: '小功能 → 联网探索。', go: ['mini', 'web_explore'], sw: ['c:webExplore', 'c:webExploreShare'], k: '上网 联网 探索' },
            { id: 'hot', t: '🔥 真实热搜', d: 'TA 知道今天外面在聊什么（微博 / 知乎 / B站…），会挑一条跟你聊。拉不下来客服会提醒你，也能自己填接口或粘贴。', go: ['mini', 'gyxHot'], sw: ['x:gyxHot'], k: '热搜 新闻 微博 外面' },
            { id: 'scoop', t: '📰 营销号自己爆料', d: '营销号不用等你点，隔一阵自己在主页爆料，被爆的人会来评论区回应。小功能 → 营销号自己爆料（营销号那一页顶上也有入口）：爆谁（只爆你和角色 / 只爆角色之间 / 都爆）、每次几个人（随机或你定）、多久一次（你定或让它自己决定）、爆什么（一样样勾，私聊内容默认不勾，还能写一句要求）。', go: ['mini', 'gyxScoop'], sw: ['x:gyxScoop', 'x:gyxScoop.auto'], k: '营销号 爆料 狗仔 八卦 主页 自动爆料 递料 私聊' },
            { id: 'hotlist', t: '🔥 微博热搜榜', d: '小功能 → 🔥 微博热搜榜，打开以后主页旁边的「标签排行」变成微博热搜：1~20 名、热度、爆 / 沸 / 热 / 新，标题用微博的口吻起（「XX深夜现身江边」那种）。热度按主页真实帖子算；起标题走副 API，不想花钱可以只关这一项。关掉就回到原来的标签排行。', go: ['mini', 'gyxHotList'], sw: ['x:gyxHotList'], k: '热搜榜 微博 标签排行 趋势 热度 标题' },
            { id: 'care', t: '🍙 反向养成', d: '在聊天里点一下你自己的头像就能看（双击还是拍一拍）。你的饱腹、心情、精力、清洁会慢慢掉；聊天里说「吃了饭」「洗完澡」会自动记，太低了 TA 来管你。', go: ['mini', 'gyxCare'], sw: ['x:gyxCare'], k: '养成 吃饭 睡觉 洗澡 照顾' },
            { id: 'callplus', t: '📞 来电增强', d: '拒接时挑个理由；太久没说话 TA 打来问；没接 TA 留语音留言；每通电话留一行小结。', go: ['mini', 'gyxCallPlus'], sw: ['x:gyxCallPlus'], k: '电话 拒接 留言 语音信箱 查岗' },
            { id: 'sched', t: '🗓️ TA 的日程', d: '「日程每天自动更新」默认关着，不开就不会自动写。打开后从第二天起每天续一份；打开那一刻不会把所有人一口气补一遍，几天没上线回来也只写今天那份。想马上补齐：记忆总览里点「🗓️ 一键补齐今天的日程」，或者「今天」面板里提示谁的日程停在之前，旁边点「补齐」。', go: ['mem'], sw: ['c:scheduleAutoRenew'], k: '日程 补齐 自动更新 过期 一口气 没上线 状态' },
            { id: 'todayp', t: '📋 今天', d: '今天 TA 做了什么、写了什么，都在这里汇总，点一下直接跳过去。', go: ['today'] },
            { id: 'notif', t: '🔔 通知', d: '左边栏「通知」。TA 来消息、写了信、有新成就都在这儿，点了直接打开那一封信 / 那个页面。', go: ['view', 'notifications'], k: '通知 消息' },
            { id: 'push', t: '推送到手机', d: '设置 → 通知与云端：\n· 🔔 系统推送通知：谷雨开着（在后台也算）的时候弹\n· ☁️ 云端主动消息唤醒 + 📲 谷雨自己的通知：关了也能收到，点了直接到 TA 的聊天（怎么配见「🔧 接口配置教程 → ⑥」）\n· 🎵 后台保活：别让手机把谷雨冻住（默认关，自己选）', go: ['settings', 'notify'], sw: ['c:gyKeepAlive'], k: '推送 系统通知 云端 弹通知 后台 保活' },
            { id: 'quiet', t: '想让 TA 安静一点', d: '不用一个个关：去插件开关中心，把「TA 会自己做」关掉就行，你自己照样能用。', go: ['gyx'], k: '太主动 太吵 打扰 安静' }
        ] },
        { id: 'map', icon: '🗺️', title: '小功能地图', intro: '小功能首页一共二十几个入口，大多是合集：点进去是一整页，竖着一列，一行一个功能，点一下直接打开（插件的在合集里打开，左上角 ‹ 回到这一列）。下面先是合集，再是几个单独的。', items: [
            { id: 'h_together', t: '🎧 一起听 · 看 · 读', d: '音乐盒、一起听一起看、一起看电影、一起阅读。（原来的「📺 直播间」并进了 📱 软件 → 🎶 抖音 → 直播，老的直播记录自动搬过去了。）', go: ['mini', 'hub_together'], sw: ['x:gyxWebInvite', 'c:filmScene'], k: '音乐 电影 视频 阅读 看书 弹幕' },
            { id: 'h_rel', t: '💞 我们的关系', d: '关系账本、两层好感、📊 关系四条线（信任 / 亲密 / 安心 / 尊重）、等级、成就、🎯 反向攻略（TA 来追你）、🔁 我们的小习惯、🌱 TA 被你影响、🪴 TA 的成长日志。', go: ['mini', 'hub_rel'], sw: ['c:relLedger', 'x:gyxDual', 'x:gyxAxes', 'x:gyxLevel', 'x:gyxBadge', 'x:gyxWoo', 'x:gyxRitual', 'x:gyxInfl'], k: '小习惯 仪式 晚安 被你影响 新爱好 好感 关系 账本 等级 成就 四条线 信任 亲密 安心 尊重 攻略 追' },
            { id: 'h_recap', t: '📚 回顾', d: '📒 手帐时间线（日 / 周 / 月手帐，能贴贴纸）、我们的书、星图、周报、回忆放映、TA 眼中的你、时光机、🕹️ 记忆潜行（像素小游戏）；多久总结一次你来定。', go: ['mini', 'hub_recap'], sw: ['x:gyxHandbook', 'x:gyxOurBook', 'x:gyxWeekly', 'x:gyxDive'], k: '回忆 周报 总结 星图 时光机 手帐 日历 记忆潜行 像素' },
            { id: 'h_promise', t: '🤙 我们的约定', d: '小约定、兑换券、恋爱审批、愿望清单、一百件小事。', go: ['mini', 'hub_promise'], sw: ['x:gyxPromise', 'x:gyxCoupon', 'x:gyxWish'], k: '约定 兑换券 愿望 审批' },
            { id: 'h_night', t: '🌙 早安晚安', d: '早安简报、叫醒和哄睡、熬夜管家、睡前三件好事、深夜电台。', go: ['mini', 'hub_night'], sw: ['x:gyxBrief', 'x:gyxWake', 'x:gyxNight', 'x:gyxRadio'], k: '早安 晚安 叫醒 哄睡 熬夜 电台' },
            { id: 'h_qa', t: '💬 问答', d: '每日一问、默契问答、📡 心电感应光谱、调查问卷、提问箱、🗳️ TA 的人生选择题。', go: ['mini', 'hub_qa'], sw: ['x:gyxDaily', 'x:gyxQuiz', 'x:gyxAskBox'], k: '问答 默契 问卷 提问' },
            { id: 'h_letters', t: '💌 信', d: '信件与日记、拆信、交换日记本、时间胶囊、💌 有条件才能拆的信、明信片、漂流瓶。', go: ['mini', 'hub_letters'], sw: ['x:gyxLetter', 'x:gyxCapsule', 'x:gyxBottle'], k: '信 日记 胶囊 明信片 漂流瓶' },
            { id: 'h_home', t: '🏠 我们的小屋', d: '小屋、随机掉落的收藏、一起养的小生命（能自己加种类）、存钱罐、📦 TA 的旧物箱、🪟 窗台来客。都串在小屋里：小生命住在屋里、存钱罐摆桌上、收藏放架子上、摆好的旧物出现在你放的位置、点那扇 🪟 就是窗台。', go: ['mini', 'hub_home'], sw: ['x:gyxHome', 'x:gyxDrop', 'x:gyxGrow', 'x:gyxJar'], k: '小屋 收藏 养 宠物 存钱 种类' },
            { id: 'h_voice', t: '🗣️ TA 怎么说话', d: '相处模式、风格调料、平视、口头禅、🎬 听取模式（像 galgame 一样一句句听 TA 说）、⌨️ 你打了又删、🔁 你让 TA 重说了。', go: ['mini', 'hub_voice'], sw: ['x:gyxBond', 'x:gyxSpice', 'x:gyxFair', 'x:gyxEcho', 'x:gyxListen'], k: '语气 口癖 口头禅 风格 人设 平视 听取 配音 立绘 galgame' },
            { id: 'h_comfort', t: '🫂 哄', d: '你不开心（抱抱）、TA 不开心（轮到你哄）、吵架了、秘密树洞。', go: ['mini', 'hub_comfort'], sw: ['x:gyxHug', 'x:gyxCoax', 'x:gyxMakeup', 'x:gyxSecret'], k: '哄 抱抱 吵架 不开心 树洞' },
            { id: 'h_with', t: '🚶 陪你', d: '散步、📮 现实小任务、🕯️ 一起安静待着、做饭、自习、运动、旅行、🍙 反向养成（TA 养你：饱腹 / 心情 / 精力 / 清洁）。', go: ['mini', 'hub_with'], sw: ['x:gyxWalk', 'x:gyxMis', 'x:gyxStill', 'x:gyxCook', 'x:gyxStudy', 'x:gyxCoach', 'x:gyxTrip', 'x:gyxCare'], k: '小任务 拍照 安静 环境音 白噪音 散步 做饭 自习 运动 旅行 私教 养成 饱腹 吃饭' },
            { id: 'walk', t: '🚶 陪你散步（计步 / 约出去走走）', d: '🚶 陪你 → 陪你散步。手机上会数步数（iPhone 第一次会问权限，电脑上不数），没开定位就按步数估距离，每走 N 步 TA 说一句。TA 会在私聊发邀请卡约你出去走走，你也能点「约 TA 去散步」；「行程与天气 → 🤝 约出去」那一页也有入口。', go: ['mini', 'gyxWalk'], sw: ['x:gyxWalk', 'x:gyxWalk.auto'], k: '散步 计步 步数 走路 约出去 邀请 出门' },
            { id: 'moment', t: '📸 同一秒', d: '🖼️ 相册 → 同一秒。每天随机一个时刻，你和 TA 同时收到「此刻！」：两分钟内拍下你眼前的东西，TA 也同一秒拍下 TA 那边的，两张并排存起来。时间段能改，也能关掉自动、自己点「现在就来一张」。', go: ['mini', 'gyxMoment'], sw: ['x:gyxMoment', 'x:gyxMoment.auto'], k: '此刻 同一秒 拍照 bereal 同时拍' },
            { id: 'seal', t: '💌 有条件才能拆的信', d: '💌 信 → 有条件才能拆的信。信封上写着「下雨天拆」「凌晨睡不着拆」「你难过的时候拆」「吵架以后拆」「走满一万步拆」「纪念日拆」「想我的时候拆」……条件没到拆不开，到了会提醒你。', go: ['mini', 'gyxSeal'], sw: ['x:gyxSeal', 'x:gyxSeal.auto'], k: '信 条件 下雨 难过 睡不着 封着 拆信' },
            { id: 'past', t: '📜 TA 的往事', d: '🤐 TA 没说出口的 → TA 的往事。你们聊得越多、认识越久，TA 越愿意讲以前的事：小时候、家里、第一次失去、害怕的东西、秘密、遇见你之前的自己，一共六章。讲过的 TA 都记得。', go: ['mini', 'gyxPast'], sw: ['x:gyxPast', 'x:gyxPast.auto'], k: '往事 过去 童年 秘密 背景故事 解锁' },
            { id: 'tapes', t: '📼 TA 的录像带', d: '🤐 TA 没说出口的 → TA 的录像带（学《Her Story》）。TA 把过去的录音录像片段打乱了寄给你，你只能输关键词去搜，一次最多出 5 段；从一段里的人名、地名、东西去搜下一段，拼出 TA 藏着的那件事，再告诉 TA 你的答案（说 3 次没对 TA 就自己说了）。', go: ['mini', 'gyxTapes'], sw: ['x:gyxTapes', 'x:gyxTapes.auto'], k: '录像带 录音 关键词 搜 秘密 her story 真相' },
            { id: 'erase', t: '⌨️ 你打了又删', d: '🗣️ TA 怎么说话 → 你打了又删（学《Emily is Away》）。你在聊天框里打了一句又删光没发，TA 偶尔会察觉，过来问你刚才想说什么。默认 TA 看不到你打了什么；想让 TA「看见」可以打开。你没发出去的话只有你自己看得到，和 TA 的草稿箱是一页两栏。', go: ['mini', 'gyxErase'], sw: ['x:gyxErase', 'x:gyxErase.auto'], k: '打了又删 没发出去 正在输入 删掉 草稿' },
            { id: 'regen', t: '🔁 你让 TA 重说了', d: '🗣️ TA 怎么说话 → 你让 TA 重说了（学《Undertale》）。右键「🔄 侧滑重新生成」就是让 TA 重说；同一句连着重说多了，TA 偶尔会察觉：「上一句不好吗」「好吧换个说法」。多久察觉一次、连着几次才可能察觉，都能调；一天重说太多 TA 还会来问是不是自己哪里说得不好。', go: ['mini', 'gyxRegen'], sw: ['x:gyxRegen', 'x:gyxRegen.auto'], k: '重新生成 侧滑 重说 察觉 读档' },
            { id: 'box', t: '📦 TA 的旧物箱', d: '🏠 我们的小屋 → TA 的旧物箱（学《Unpacking》）。帮 TA 拆箱子，每件旧东西都有一段故事；你决定它摆在哪，摆对摆错 TA 说的不一样。摆在书架、书桌、床头、墙上、窗台的，会出现在小屋里你放的位置。TA 收拾时也会翻出旧东西拍给你看。', go: ['mini', 'gyxBox'], sw: ['x:gyxBox', 'x:gyxBox.auto'], k: '旧物 拆箱 搬家 摆放 unpacking 故事' },
            { id: 'sill', t: '🪟 窗台来客', d: '🏠 我们的小屋 → 点屋里那扇 🪟（学《猫咪后院》）。窗台上放点东西（小鱼干、热茶、旧书……），你不在的一到四个小时里会有客人来：小动物、世界里的人，有时候是角色偷偷来过。客人留下的礼物会摆在小屋的窗台上，来过的都收进图鉴。', go: ['mini', 'gyxSill'], sw: ['x:gyxSill', 'x:gyxSill.auto'], k: '窗台 来客 猫 小动物 礼物 图鉴 窗户' },
            { id: 'ontime', t: '⏰ 准点群聊', d: '👥 TA 身边的人 → 准点群聊（学《Mystic Messenger》）。每天固定几个时间点（默认 12:30、22:00），角色们准时在群里开聊；这段时间里你在群里说话就算来了，大家会接你的话；错过了会有人 @ 你，TA 也记得你没来。群聊顶上会提示下一场几点、正在开就亮红点；群设置里能单独开关这个群。', go: ['mini', 'gyxOnTime'], sw: ['x:gyxOnTime', 'x:gyxOnTime.auto'], k: '准点 群聊 定时 错过 开聊 群' },
            { id: 'evolve', t: '🪴 TA 的成长日志', d: '💞 我们的关系 → TA 的成长日志。TA 跟你在一起久了会发现自己变了一点，提一条「人设小修改」——你点同意才写进人设（最后的「和她在一起之后的变化」那一段），随时能撤回。', go: ['mini', 'gyxEvolve'], sw: ['x:gyxEvolve', 'x:gyxEvolve.auto'], k: '成长 变化 改人设 人设修改 撤回' },
            { id: 'dilemma', t: '🗳️ TA 的人生选择题', d: '💬 问答 → TA 的人生选择题。TA 遇到拿不定主意的事来问你（换工作、剪头发、借不借钱……），你选了 TA 就照做，过几天回来告诉你结果；三天不回 TA 就自己拿主意。', go: ['mini', 'gyxDilemma'], sw: ['x:gyxDilemma', 'x:gyxDilemma.auto'], k: '选择 纠结 帮TA选 帮 TA 选 帮他选 拿主意 意见 结果' },
            { id: 'plan', t: '🎁 TA 的秘密计划', d: '🎁 TA 给你的 → TA的秘密计划。TA 偷偷为你学一样东西，两三周；你只看到 ❓ 和进度，聊天里 TA 会漏破绽（自动收进「你注意到的破绽」），你可以猜；到日子揭晓一封信和成果。', go: ['mini', 'gyxPlan'], sw: ['x:gyxPlan', 'x:gyxPlan.auto'], k: '秘密 惊喜 偷偷 学吉他 破绽 猜' },
            { id: 'infl', t: '🌱 TA 被你影响', d: '💞 我们的关系 → TA被你影响。你常聊的东西，TA 会慢慢也喜欢上（有点好奇 → 开始喜欢 → 成了 TA 自己的爱好），会主动转给你、跟你聊；也能自己「种下」。', go: ['mini', 'gyxInfl'], sw: ['x:gyxInfl', 'x:gyxInfl.auto'], k: '影响 爱好 兴趣 种下 喜欢上' },
            { id: 'mis', t: '📮 现实小任务', d: '🚶 陪你 → 现实小任务。TA 派一个真实世界的小任务，你拍照交差，TA 看图回应；照片攒成「我们一起看过的世界」。散步时会提醒路上的任务。', go: ['mini', 'gyxMis'], sw: ['x:gyxMis', 'x:gyxMis.auto'], k: '任务 拍照 交差 照片 现实' },
            { id: 'still', t: '🕯️ 一起安静待着', d: '🚶 陪你 → 一起安静待着。屏幕常亮 + 环境音（雨 / 炉火 / 咖啡馆 / 海浪 / 夏夜），TA 隔一会儿轻轻说一句，也能设成一句都别说。', go: ['mini', 'gyxStill'], sw: ['x:gyxStill', 'x:gyxStill.auto'], k: '安静 陪伴 白噪音 环境音 雨声 屏幕常亮 失眠 工作' },
            { id: 'ritual', t: '🔁 我们的小习惯', d: '💞 我们的关系 → 我们的小习惯。从聊天里自己认出你们固定的小仪式（每晚晚安、早安、下班报平安……），哪天到点了没出现，TA 会注意到。不调接口。', go: ['mini', 'gyxRitual'], sw: ['x:gyxRitual', 'x:gyxRitual.auto'], k: '习惯 仪式 晚安 早安 没说晚安' },
            { id: 'ping', t: '📤 角标和分享', d: '📱 小手机 → 角标和分享。添加到主屏幕后，TA 的未读消息显示在桌面图标上；TA 的话、信、散步日记、小任务照片能一键做成卡片分享到微信（电脑上是下载图片）。聊天输入框左边 ⋮ 里也有。', go: ['mini', 'gyxPing'], sw: ['x:gyxPing'], k: '角标 红点 未读 分享 微信 卡片 存图' },
            { id: 'h_touch', t: '💓 贴贴', d: '听心跳、摇一摇贴贴。', go: ['mini', 'hub_touch'], sw: ['x:gyxBeat', 'x:gyxShake'], k: '心跳 摇一摇 贴贴' },
            { id: 'h_unsaid', t: '🤐 TA 没说出口的', d: '心声、📜 TA 的往事、📼 TA 的录像带、思维链收纳盒、草稿箱（和「你打了又删」一页两栏）、🌈 情绪皮肤（TA 的心情改变聊天界面）。', go: ['mini', 'hub_unsaid'], sw: ['x:gyxDraft', 'x:gyxMoodSkin'], k: '心声 思维链 草稿 情绪 皮肤 心情' },
            { id: 'h_custom', t: '⚙️ 个性化', d: '皮肤、手机文件夹、TA 的声音、聊天统计 · 词云、开场动画、美化、开关和后台——设置 → 🧰 功能设置里有，小功能里的这个合集也有，两边一样。', go: ['mini', 'hub_custom'], k: '皮肤 声音 美化 开场动画 统计 词云 文件夹 个性化 找不到设置' },
            { id: 'h_phone', t: '📱 小手机', d: 'TA 的手机、备忘录、🧩 AI 小程序、来电画面和铃声、📞 来电增强（拒接理由 / 查岗电话 / 语音留言 / 通话小结）、桌面小组件、桌面上的 TA、📤 角标和分享。', go: ['mini', 'hub_phone'], sw: ['x:gyxMemo', 'x:gyxApps', 'x:gyxRing', 'x:gyxCallPlus', 'x:gyxPhoneW', 'x:gyxPet', 'x:gyxPing'], k: '角标 分享 卡片 TA的手机 备忘录 来电 铃声 小程序 App 语音留言 拒接' },
            { id: 'h_life', t: '🧺 生活', d: '行程与天气（还有 🌏 两地）、随身物、商城、🛍️ 装扮商店（头像框 / 聊天背景 / 气泡套装）、经期记录、心情手账、生活小档案（她的真实情况）。', go: ['mini', 'hub_life'], sw: ['x:gyxShop', 'x:gyxNotes'], k: '行程 天气 两地 随身物 商城 装扮 头像框 经期 心情手账 档案' },
            { id: 'h_people', t: '👥 TA 身边的人', d: '日常、关系网、👥 NPC 列表、📰 营销号自己爆料、⏰ 准点群聊。', go: ['mini', 'hub_people'], k: '日常 关系网 NPC 路人 身边的人' },
            { id: 'npclist', t: '👥 NPC 列表', d: '👥 TA 身边的人 → NPC 列表。整页一列，所有 NPC（配角、路人熟人）都在这里。\n· ✨ 生成：照着你的人设、角色的人设和世界书生成，想要什么样的人可以写要求，也可以空着。\n· 绑给谁：绑给你、绑给某几个角色，或者「通用」（谁都认识）。绑给谁，谁的帖子底下、聊天里就会出现这些人。\n· 每个 NPC 的头像、背景都能换，换的时候能裁剪；名字、身份、性格都能改。\n· 评论里 NPC 和路人各占多少：上面一个总的比例，每个地方（推文、匿名区、八卦网、论坛、小红书、直播弹幕、微博、泡泡）还能单独调。\n· 删角色的时候会问你：只绑给 TA 的那些 NPC 要不要一起删。', go: ['mini', 'npc'], sw: ['c:npcOn', 'c:npcInComments'], k: 'npc 配角 路人 世界里的人 生成npc 绑定 评论比例' },
            { id: 'h_soft', t: '📱 软件', d: '小功能 → 📱 软件。打开是竖着的一列：💚 微信、🧣 微博、🫧 泡泡、📕 小红书、🫘 豆瓣、💬 iMessage、🎵 网易云音乐、🎶 抖音，最后是 🍎 软件外观。点一行直接进那个软件。\n📲 真手机挪出来了，在小功能里单独一个入口；它现在是谷雨本体自带的，不用导入插件（只是真要管手机还得装安卓「谷雨守护」插件，见下一条）。\n其它这些软件在「插件/软件/」文件夹，导入「软件全家桶.json」一个就够（装了全家桶，单个的软件插件和老的「📺 直播间」会自动拿掉）。', go: ['hub', 'hub_soft'], k: '软件 app 微博 泡泡 合集' },
            { id: 'soft_prof', t: '👤 每个软件里的主页都不一样', d: '同一个人在微博、泡泡里是不同的主页：昵称、头像、背景、简介、粉丝数都可以不一样，像真人一样（微博叫一个网名，泡泡叫另一个）；有的人会在简介里挂自己别的软件的账号。\n主页一开始是模型照着人设写的；点「编辑资料 / 编辑主页」都能改：头像、背景能换能裁剪，文字都能改，下面还能填「挂在主页上的别的软件账号」。', go: ['hub', 'hub_soft'], k: '主页 资料 头像 背景 简介 昵称 改主页 编辑资料' },
            { id: 'soft_wb', t: '🧣 微博', d: '📱 软件 → 微博。\n· 底下五个：首页 / 视频 / 发现 / 消息 / 我。\n· 首页：关注、推荐、同城三栏；最上面一排是微博故事（24 小时就消失的那种）。右上角 ✏️ 发微博：能配图、带 #话题#、@人、表情、定位、投票、选谁能看（公开 / 仅粉丝 / 好友圈 / 仅自己）、发到超话。\n· 点一条微博进去：评论分「按热度 / 按时间」，评论下面还能接着回；博主点过赞的评论会标「博主赞过」。你自己的微博能置顶、编辑（会留编辑记录）、改谁能看、关评论、删掉。\n· 发现：🔥 热搜（点进去是话题页；还能自己花钱「买热搜」、撤热搜）、💎 超话（每个角色都有一个粉丝圈，能签到升级、发帖）、找人（✨ 生成新账号，要求可写可空，生成的人也进 NPC 列表）。\n· 消息：@我、评论、赞、私信。\n· TA 自己也会玩：发微博、来评论你、发故事、半夜发一条又删掉（你刷到过就能看到「已删除」）。\n· 📹 视频（底下第二个「视频」）：短视频推荐流，TA 和网友随手拍的 vlog / 日常，点进去能点赞、评论；你也能发；TA 自己会发视频号。\n· 🎁 转发抽奖：发微博时点「🎁 抽奖」，填奖品、抽几个人、什么时候开奖。别人转发就算参加，到点自动开奖，评论区公布中奖名单；你发的抽奖角色们大多会来转发「求中」，等不及也能在抽奖详情里「现在就开奖」。TA 也会自己发抽奖，点卡片上的「转发参与」就参加了——TA 发的抽奖，你参加了 TA 多半会偷偷让你中。\n· 📝 草稿箱（我 → 📝 草稿箱）：写到一半退出来会自动存，点开接着写，发出去就自动删。\n· ↗ 分享给 TA：点微博下面的「↗ 转发」，会问你是「转发到我的微博」还是「分享给 TA」（发到 iMessage 或平时聊天）；⋯ 菜单里也有。', go: ['mini', 'gysWeibo'], sw: ['x:gysWeibo', 'x:gysWeibo.auto'], k: '微博 热搜 超话 话题 评论 转发 私信 微博故事' },
            { id: 'soft_wb_bot', t: '🤖 微博 bot', d: '微博 → 我 → 🤖 我的 bot。bot 就是自动发微博的账号，有三种：\n· 投稿 bot：大家私信它投稿，它匿名发出来（「XX 树洞」那种）；可以让角色和 NPC 也来偷偷投稿。\n· 定时 bot：按你写的要求，隔几个小时自己发一条（每日一句晚安、每日一只猫……）。\n· 自动回复 bot：有人私信它就照你写的规矩回。\nbot 的头像、主页也能改；点「现在发一条」马上试。', go: ['mini', 'gysWeibo'], k: 'bot 机器人 投稿 树洞 定时 自动回复' },
            { id: 'soft_wb_alt', t: '🕵️ 微博小号', d: '微博 → 我 →「切换账号」→「＋ 注册一个小号」。用小号发微博、评论，TA 们不知道是你（聪明的可能认得出）。\nTA 也有不告诉你的小号：刷到可疑的账号，点进主页「猜猜是谁」，猜中了 TA 会慌。', go: ['mini', 'gysWeibo'], k: '小号 马甲 切换账号 猜小号' },
            { id: 'soft_bb', t: '🫧 泡泡：TA 当艺人，你当粉丝', d: '泡泡是明星给粉丝发私信的软件。📱 软件 → 泡泡 → 发现，点谁就「订阅」谁，再给自己起个昵称。\n· TA 发的文字、自拍、语音（点开看 TA 说了什么）、视频、泡泡信，看起来像只发给你一个人，其实所有粉丝都收得到；消息里叫粉丝的地方会变成你的昵称。\n· 每条你能回 3 次；订阅第 1 天只能打 15 个字，每多订阅一天多一个字，最多 77 字。\n· TA 偶尔会回应粉丝说的话（叫「翻牌」），说不定就是你的。\n· 右上角 👥 看别的粉丝回了什么、🖼️ 相册、⋯ 里催更、写信、改昵称、取消订阅；消息旁边 ☆ 能收藏。\n· 订阅满 100 天、200 天……有纪念日。\n· 最重要的：泡泡上 TA 是在营业，营业完 TA 会私下来聊天里找你，说只给你的话。', go: ['mini', 'gysBubble'], sw: ['x:gysBubble', 'x:gysBubble.auto'], k: '泡泡 bubble 订阅 爱豆 艺人 粉丝 翻牌 昵称' },
            { id: 'soft_bb2', t: '🎤 泡泡：你当艺人，TA 们当粉丝', d: '泡泡 → 底下「我的频道」→ 开通。\n· 发一条（文字 / 照片 / 语音 / 视频 / 泡泡信），写「(昵称)」会变成每个粉丝自己的昵称；发出去以后所有粉丝的回复会刷屏，点「刷新看新回复」还有更多。\n· 认识你的人（角色、NPC）也订阅了你。有人会用小号偷偷回你：点「🕵️ 这是谁？」猜，猜中了 TA 会来找你。\n· 上面能看订阅人数、今天的回复数、粉丝列表（谁订阅了你可以自己开关）、粉丝来信。', go: ['mini', 'gysBubble'], k: '我的频道 开频道 当艺人 粉丝回复 小号 粉丝来信' },
            { id: 'red', t: '📕 小红书', d: '📱 软件 → 小红书（以前在「主页和社交」里的那个升级成了整页的真小红书，笔记、收藏、TA 偷偷收藏的都自动搬过来了）。\n· 首页：关注 / 发现 / 附近；发现下面一排频道（穿搭、美食、情感、旅行……），点哪个刷哪个；点「刷新」刷新一批。\n· 点一篇笔记：图片左右滑，下面是标题、正文、#话题#、地点、「编辑于」；底下能评论（点别人的评论就是回复 TA）、点赞、收藏；收藏时能放进专辑（比如「约会攻略」「想买的」）；右上角 ↗ 能分享给 TA：发到 💬 iMessage（一张能点回这篇的卡片）或平时聊天，TA 会跟你聊这篇。\n· 底下「＋」发笔记：加图（能裁剪）、标题、正文、# 话题、@ 人、地点、频道、谁能看；还能注册小号发。\n· 🔍 搜索：猜你想搜 + 搜什么刷什么，也能一键去真的小红书搜。\n· 消息：赞和收藏、新增关注、评论和 @、私信。\n· 我：主页（小红书号、IP、签名、标签、获赞与收藏），笔记 / 收藏 / 赞过；右上角 ☰ 里有「现实小红书」（去真的搜、把真笔记粘进来）、「偷看 TA 们的收藏」、设置、导出。\n· TA 会：发笔记、来评论你、偷偷收藏一篇（附 TA 心里想的）、用小号发「求问」帖——刷到可疑的账号，点进主页「猜猜是谁的小号」。\n· 🔴 直播（发现页顶上那条）：主播开播，有带货商品、滚动弹幕，你能发言、送 ❤️，主播会回你；TA 也会开直播叫你来看。\n· 📊 年度报告（我 →「📊 年度报告」）：你发了多少篇、获赞收藏、关注、被 TA 收藏过几篇，还能让 TA 给你写句年度寄语。\n· 📝 草稿箱（底下「＋」发布页最上面）：新笔记写着写着就自动存，切走了也不怕，点进草稿箱接着写；改旧笔记不存草稿。\n· 🛍️ 市集（底下第二个）：两列商品，点进去看详情；「立即购买」从钱包扣钱，「🎁 送 TA」买给 TA；顶上「📦 我的订单」。TA 也会偷偷在市集给你买东西。商品图都能换。\n· 🛒 购物车：商品页底下「加入购物车」，市集顶上或商品页的 🛒 打开；按店铺分开，能勾选、改数量，「结算」从钱包扣。TA 偶尔会偷看你的购物车，悄悄把其中一件买给你（订单里会写是 TA 送的、附一句话）。\n· 🏪 店铺：点商品下面的店名或商品页的「店铺」进店，看这家店的粉丝、已售、评分，能关注；「✨ 上新」让这家店再出几件。', go: ['mini', 'gysRed'], sw: ['x:gysRed', 'x:gysRed.auto', 'x:gysRedCart', 'x:gysRedCart.auto'], k: '小红书 笔记 种草 收藏 专辑 现实小红书 求问 小号 市集 购物车 店铺 订单 买东西' },
            { id: 'soft_db', t: '🫘 豆瓣', d: '📱 软件 → 豆瓣。底下四个：首页 / 书影音 / 小组 / 我的。\n· 书影音：电影、读书、音乐、同城四栏。每部作品有自己的页面：评分、几星的人各占多少、简介、短评、长评。真实世界的作品和你们世界观里的作品都有（这个世界的会标「🌐 这个世界里的作品」），搜不到的能自己加。\n· 标记：想看 / 在看 / 看过（书是想读 / 在读 / 读过，音乐是想听 / 在听 / 听过），打一到五星、写短评、加标签，可以分享到广播。\n· 「💞 约 TA 一起看」：TA 会在聊天里跟你约，还能直接打开一起看电影 / 一起阅读 / 音乐盒。\n· 「＋ 添加到豆列」：豆列就是自己整理的片单书单，比如「和他一起看过的电影」。\n· 小组：豆瓣最出名的地方。加入、建组（能换组头像）、发帖；帖子里的回应按楼层排，能引用某一楼；组长能置顶、加精。\n· 首页广播：友邻（你关注的人）标记了什么、说了什么；能赞、回应、转播；「说句话」发自己的。\n· 我的：主页、想看 / 看过的数量、豆列、日记（能设仅自己可见）、同城活动（能约 TA 一起去）。\n· TA 会：标记电影书音乐、写长评、在小组发帖、做豆列、回应你的广播。\n· 📅 打卡日历（我的 →「📅 打卡日历」）：你标「想看 / 看过」就记上那天，日历上看连续打卡了几天。\n· 🎞️ 年度总结（我的 →「🎞️ 年度总结」）：今年标了多少部、你打分的分布、今年的五星片单、和 TA 都标记过的。\n· ↗ 分享：作品页（「添加到豆列」旁边）和小组帖子里都有「↗ 分享」，能发到 iMessage 或平时聊天。', go: ['mini', 'gysDouban'], sw: ['x:gysDouban', 'x:gysDouban.auto'], k: '豆瓣 电影 书 音乐 评分 短评 影评 书评 想看 看过 小组 豆列 广播 日记 同城' },
            { id: 'soft_im', t: '💬 iMessage', d: '📱 软件 → iMessage，就是苹果手机自带的「信息」。它跟平时的私聊是两个地方、两份记录，但 TA 两边都知道。\n· 右上角新信息：选人，或者「👥 新建群聊」（能起群名、换群头像）。左上角「编辑」里有：专注模式、发送已读回执（关了 TA 就看不到你读没读）、🗑️ 最近删除（删掉的对话留 30 天，能恢复）、🍎 苹果外观。\n· 蓝色是 iMessage，绿色是短信（在 TA 的联系人名片里能改成「以短信发送」，短信没有已读、没有特效）；你最后一条下面写「已送达」或「已读 几点几分」（TA 关了已读回执就只写已送达）；TA 在打字时有「…」。\n· 输入框里的 Aa：粗体、斜体、下划线、删除线，还有动态文字（大、小、抖动、点头、爆炸、涟漪、绽放、摇摆）；也可以直接打 **粗** *斜* ~~删除~~。发网址会出一张链接卡片。\n· 输入框右边的 🎙️：录语音（能转成文字，TA 听到的就是这段话）；TA 也会给你发语音，点一下用 TA 的声音念。\n· 长按一条消息（电脑上右键）：上面一排 ❤️👍👎😂‼️❓，点「＋」能用任意表情回应；下面能回复这一句（串成一条线）、拷贝、15 分钟内编辑、2 分钟内撤回（TA 看到过还是记得）。\n· 发送特效：长按 ↑（或点 ✨）：猛击、大声、轻声、隐形墨水，满屏的气球、五彩纸屑、爱心、激光、烟花、庆祝。写「生日快乐」「恭喜」「新年快乐」会自动带特效。\n· 左边 ＋：照片、😊 拟我表情（用你的头像做的表情贴纸）、贴纸、✍️ 手写（用手指写一张字条，TA 打开时会一笔一笔写出来）、💓 数字触感（黑底画画、轻点、发心跳）、🎙️ 语音、💵 Apple Cash（转钱，接钱包；TA 也会转给你，你点接受 / 退回）、📍 共享位置（一小时 / 到今天结束 / 一直，也能请求看 TA 在哪）、发送当前位置、🛡️ 报平安、🕒 稍后发送、🎮 小游戏（井字棋、四子棋、石头剪刀布、掷骰子，跟 TA 在对话里玩，玩完 TA 会说两句）。\n· TA 睡觉时对话底下写「已将通知静音」，有急事点「仍要通知」叫醒 TA。\n· 点顶上的头像看联系人名片：手机号、TA 给你存的名字（点一下偷看）、电话 / FaceTime、以短信发送、TA 的已读回执。\n· TA 会：随手给你发几条、发语音 / 拟我表情 / 手写字条 / 心跳、转钱、共享位置、出门开报平安、群里自己聊。\n· 🎵 分享一首歌（＋ 里）：发一张 Apple Music 歌卡；TA 也会把想起你的歌分享给你。\n· 🖼️ 共享相簿（联系人名片里，或 ＋ 里）：你和 TA 的共享相册，两个人都能往里加照片；TA 也会加。\n· 📹 FaceTime 留言（名片 → FaceTime → 让 TA 留个留言）：没接到时 TA 对着镜头给你留一段视频留言。\n· 🔗 别的软件分享过来的：微博、小红书、豆瓣里分享给 TA 的，在这里是一张卡片（有图、标题、哪个软件），点一下回到原帖；TA 看了会回你。TA 自己刷到有意思的也会转给你，再说一句「你看这个」。', go: ['mini', 'gysImsg'], sw: ['x:gysImsg', 'x:gysImsg.auto'], k: 'imessage 信息 短信 苹果 tapback 撤回 编辑 特效 隐形墨水 报平安 稍后发送 专注模式 群聊 facetime 语音 拟我表情 memoji 手写 数字触感 心跳 apple cash 转账 共享位置 小游戏 井字棋 粗体 动态文字 已读回执 最近删除' },
            { id: 'soft_share', t: '🔗 软件之间分享', d: '在微博、小红书、豆瓣里看到想给 TA 看的，点「↗ 分享」（微博是「↗ 转发」→ 分享给 TA）：\n· 💬 用 iMessage 发给 TA：先选发给谁，可以附一句话。在 iMessage 里是一张卡片，点一下回到原帖。TA 会看内容回你。\n· 🗨️ 发到平时聊天：TA 会在平时的聊天里跟你聊这条。\n· 📋 复制内容。\nTA 也会自己刷微博 / 小红书 / 豆瓣，挑一条跟你有关、好笑或者想一起去的，在 iMessage 转给你。\n关掉「🔗 软件之间分享」就跟以前一样：小红书只能分享到平时聊天，TA 也不转东西给你。', go: ['mini', 'gysImsg'], sw: ['x:gysShare'], k: '分享 转发 卡片 你看这个 转给我 发给他 链接' },
            { id: 'soft_draft', t: '📝 草稿箱', d: '微博和小红书写到一半退出来，内容会自动存进草稿箱，不会丢。\n· 微博：我 → 📝 草稿箱。\n· 小红书：底下「＋」发布页最上面那条「📝 草稿箱」。\n点一条接着写，发出去以后那条草稿自动删掉；不要了就点「删除」。关掉「📝 草稿箱」就跟以前一样，退出就没了。', go: ['mini', 'gysWeibo'], sw: ['x:gysDraft'], k: '草稿 草稿箱 没写完 写到一半 存起来' },
            { id: 'soft_lot', t: '🎁 微博转发抽奖', d: '微博 → ✏️ 发微博 → 底下「🎁 抽奖」：填抽什么、抽几个人、什么时候开奖（1 小时后 ~ 1 周后）。\n· 发出去以后微博下面有一张抽奖卡片，转发就算参加；角色们大多会来转发「求中」。\n· 到点自动开奖，评论区公布中奖名单，有人中了会通知你；想早点开奖：点卡片 →「现在就开奖」。\n· TA 也会自己发抽奖（抽奶茶、周边、红包……），你点「转发参与」就参加了，到点开奖时你中没中都会通知你。TA 发的抽奖你参加了，TA 多半会偷偷让你中。\n· 今天面板、小手机小组件「🎁 微博抽奖」、记忆总览「TA 的微博抽奖」里都看得到。', go: ['mini', 'gysWeibo'], sw: ['x:gysWbLot'], k: '抽奖 转发抽奖 中奖 开奖 奖品 锦鲤' },
            { id: 'soft_wx', t: '💚 微信', d: '📱 软件 → 微信（原来设置里的「微信模式」去掉了，换成这个）。微信里的聊天是单独一份记录，跟平时聊天、iMessage 分开，但 TA 每个地方都记得。\n· 底下四个：微信 / 通讯录 / 发现 / 我。\n· 聊天：发文字、🎙️ 语音（打字变语音条，TA 的语音点一下看文字、能用 TA 的声音念）、😊 表情（也能描述一个表情包）、＋ 里有相册、拍摄（用文字描述照片）、视频 / 语音通话、位置、🧧 红包、⇄ 转账（接钱包，TA 领了你的钱就花出去了）、名片、收藏。\n· 长按一条：复制、引用、收藏、撤回（2 分钟内）、转文字、删除。双击头像 = 拍一拍（「我」→ 拍一拍 能设后缀）。\n· TA 会：回你（会引用、发语音、表情包、照片，偶尔拍一拍你、发红包、发了又撤回）、主动发微信、发朋友圈、给你的朋友圈点赞评论、改微信状态、在自己的公众号写文章、在群里聊。\n· 通讯录：发起群聊、群聊、公众号；点人看名片（备注、状态、朋友圈、发消息、通话）。\n· 发现：朋友圈（TA 们的朋友圈跟「TA 的手机」里同一份；你也能发，配图、定位，TA 们会点赞评论）、视频号（打开抖音）、看一看（公众号）、小程序（AI 小程序）、听一听（网易云）、服务（钱包）。\n· 我：资料、状态（24 小时）、收藏、我的朋友圈、软件外观、设置（每个聊天留几条、导出聊天记录）。\n· 🏃 微信运动：聊天列表最上面那条「微信运动」，点进去是今天大家的步数排行，第一名占领封面；点 ♡ 给别人点赞，TA 也会来给你点赞。你的步数是「🚶 陪你散步」数到的，没有的话点数字自己填；TA 的步数是自动的（白天慢慢涨），点数字也能改。往日排行、留几天都能选。\n· 👁 朋友圈谁可以看：发朋友圈最后一步选——公开 / 私密（只有自己）/ 部分可见（选谁能看）/ 不给谁看。看不到的人不会来点赞评论，聊天时也不知道这条。发完了点时间旁边的小眼睛还能改。\n· 🖼️ 聊天背景：聊天右上角「···」→ 聊天信息 →「设置当前聊天背景」，从相册选（能裁剪）或选纯色，每个聊天单独设；群聊信息里也有。聊天信息页还有查找聊天记录、免打扰、置顶、清空聊天记录。', go: ['mini', 'gysWechat'], sw: ['x:gysWechat', 'x:gysWechat.auto', 'x:gysWxRun', 'x:gysWxRun.auto'], k: '微信 朋友圈 红包 转账 拍一拍 语音 撤回 引用 公众号 群聊 状态 视频通话 语音通话 收藏 通讯录 备注 微信运动 步数 谁可以看 不给谁看 部分可见 聊天背景' },
            { id: 'soft_mu', t: '🎵 网易云音乐', d: '📱 软件 → 网易云音乐。底下五个：推荐 / 发现 / 漫游 / 笔记 / 我的。\n· 推荐：📅 每日推荐（按你听过的、喜欢的和身边人的口味每天换一批，能「换一批」）、私人 FM、歌单广场、排行榜（飙升榜 / 热歌榜 / TA 写的歌的原创榜）、电台（深夜电台）、🎧 一起听、TA 们在听什么、✍️ TA 写给你的歌、我们的共享歌单、最近播放。\n· 能真放出声音的歌：就是你在「🎵 音乐盒」里传的 / 填直链的那些（在「我的 → 本地（音乐盒）」）。别的歌没有音源，点了也能进播放页「听」（黑胶会转，但没有声音），播放页里点「加到音乐盒」传上音频就能真放。\n· 播放页：黑胶唱片和唱针、点唱片看歌词（音乐盒里有 .lrc 的歌、TA 写的歌才有）、🤍 红心、🎧 叫 TA 一起听、💬 评论、⋯（收藏到歌单 / 分享给 TA）。\n· 评论区：最热 / 最新，楼中楼，网友会写那种网易云热评，TA 也可能在；你评论或回复 TA，TA 会回你。\n· 漫游：私人 FM 一首一首推，❤️ 心动模式推跟你红心的歌像的；🗑 不喜欢跳过。\n· 发现：排行榜、歌单广场、电台。\n· 笔记（以前叫云村 / 动态）：两列图文卡片，你和 TA 分享歌的笔记，能配图、点赞评论；你发了 TA 会来评论。\n· 我的：我喜欢的音乐、最近播放、听歌排行、🎞️ 年度听歌报告、自己建的歌单、TA 给你做的歌单（也能「叫 TA 做」）。\n· 点 TA 的头像看 TA 的主页：TA 正在听什么、TA 的听歌排行（按 TA 的人设）、TA 写给你的歌、TA 的歌单和动态。\n· TA 会：写笔记分享歌、给你做歌单、去你最近听的歌下面写评论、换在听的歌。\n· 💞 音乐匹配度：TA 主页上那一条「你们的音乐匹配度 XX%」，按你们都听过、都喜欢的歌和歌手算，点进去看你们都爱听的歌手和都听过的歌（能一键播放）。TA 偶尔看到会跟你说一句。\n· ⏰ 定时关闭：播放页那排按钮里的 ⏰，选 10 / 20 / 30 / 45 / 60 / 90 分钟或「播完当前歌曲」，到点自动暂停；再点一次能取消。深夜你还在听歌，TA 可能会帮你定一个，叫你早点睡。', go: ['mini', 'gysMusic'], sw: ['x:gysMusic', 'x:gysMusic.auto', 'x:gysMuMatch', 'x:gysMuTimer'], k: '网易云 音乐 听歌 歌单 每日推荐 私人fm 热评 评论 排行榜 云村 笔记 听歌排行 年度报告 一起听 黑胶 匹配度 定时关闭 睡眠定时' },
            { id: 'soft_dy', t: '🎶 抖音', d: '📱 软件 → 抖音。底下五个：首页 / 朋友 / ＋ / 消息 / 我。\n· 首页：上面「直播 / 同城 / 关注 / 推荐」，视频一条一屏，上下滑（电脑上用滚轮或右边的 ⌃ ⌄）。双击屏幕点赞（会冒一颗大心），右边一排：头像（＋关注）、❤️、💬 评论、⭐ 收藏、↪ 分享（私信发给 TA / 发到 iMessage、微信 / 复制）。视频是文字描述的「画面」，底下有文案和背景音乐。\n· 评论：点赞、点一条回复，作者会标「作者」，TA 回你会通知你。\n· 直播（首页顶上「直播」）：TA 们开的播排在最前面，还有一堆主播；进直播间能发弹幕、送 ❤️、送礼物（抖币从钱包扣），TA 认得出你，会特别回你；也能「📣 叫 TA 开播」或者右上角 📡 自己开播。原来的「📺 直播间」插件并进来了，以前的直播记录在「TA 播过的」里。\n· ＋ 发作品：选一张封面（能裁剪，可不选）、写画面和描述、配乐（网易云里听过的会自动推荐）、位置、谁可以看；TA 们会来点赞评论。\n· 消息：赞和评论、私信（TA 会私信甩视频给你）。\n· 我 / 别人的主页：获赞、关注、粉丝、作品 / 喜欢 / 收藏，TA 正在直播会显示。\n· TA 会：发抖音、开直播叫你、刷到你的作品点赞评论、私信甩视频给你。\n· 🌀 日常：「朋友」和「消息」页最上面那排圆头像。日常是 24 小时就消失的随手拍；有彩色圈的是还没看过的。点开看，点屏幕右边下一条、左边上一条，底下能点 ❤️、能回复（回复会进私信）。点「发日常」自己发（相册选图能裁剪，或者用文字写画面），能看到谁看过；TA 会来看、点赞、私信你，TA 自己也会发。\n· 🔥 抖音热榜：右上角 🔍 搜索页，没输入时下面就是热榜，前三名红橙黄，带「新 / 热 / 爆」，点一条就搜它；「换一换」刷新。\n· 🎙️ 直播连麦：在 TA 的直播间，底下点「连麦」申请，TA 同意后画面一分为二，你在输入框说的话就是对着麦说，TA 当着直播间回你；点「挂断」结束，会留下连麦记录。TA 开播时也可能邀请你连麦。', go: ['mini', 'gysDouyin'], sw: ['x:gysDouyin', 'x:gysDouyin.auto', 'x:gysDyDaily', 'x:gysDyDaily.auto', 'x:gysDyMic', 'x:gysDyMic.auto'], k: '抖音 短视频 直播 弹幕 礼物 抖币 刷视频 发作品 私信 关注 同城 日常 热榜 连麦' },
            { id: 'soft_chatapp', t: '💬 TA 喜欢用哪个软件找你', d: '谷雨现在能聊天的地方有好几个：平时的聊天、💚 微信、💬 iMessage、🎶 抖音私信，还有微博 / 小红书的私信。\n· 不管在哪个软件聊，TA 都记得别的软件里说过什么（比如微信里说的事，你去 iMessage 问 TA，TA 知道）。\n· TA 主动找你的时候去哪：编辑角色 → 🎲 行为模式下面「💬 TA 喜欢用哪个软件找你」里选（列表里只有装着、开着的软件）。\n· 行为模式选了「由 TA 自己决定」：TA 自己挑——多半去你最近在的那个软件找你，你选的那个当 TA 的偏好。\n· 每个软件里聊的会分开总结进 TA 的「记忆总结」，前面标着是哪个软件（比如「[微信] …」），所以 TA 在推特私信里也能提起之前在微信说过的事。跟聊天自动总结是同一个开关。\n· 有些专门的事（比如经期关心、发语音）还是在平时聊天里。', go: ['chars'], k: '哪个软件 微信找我 imessage 主动找你 聊天软件 记得 互通' },
            { id: 'pm_x', t: '🐦 小手机里的推特', d: '开了小手机模式以后，桌面上的「推特」就是主页加上私信——私信就是原来的聊天，所以桌面上不再单独放「聊天」图标（未读数挂在推特图标上）。样子照着真的 X 做的。\n· 底下四个：🏠 主页（就是现在的主页，顶上「为你推荐 / 正在关注」）、🔍 搜索、🔔 通知、✉️ 私信（原来的聊天列表，点人进去聊）。进到一个人的聊天里，底下这排会收起来，不挡输入框。\n· 🎨 两种配色，底色都是白的：蓝色（经典推特蓝）、黑色（黑白）。在小手机 → 美化 →「推特配色」换，或者点左上角头像，侧边栏里也能换。\n· 左上角你的头像：打开侧边栏——个人资料、🔖 书签、搜索、配色、设置。\n· 🔖 书签：每条推文下面那排多了一个书签键，点一下存起来，再点取消。书签页能一条条取消，右上角 ⋯ 能清空。书签跟「收藏进回忆相册」的推文是同一份。\n· 个人主页也是 X 的样子：长条横幅、头像压在横幅上、圆角按钮、帖子 / 回复 / 收藏 / 赞过。\n· 想分开：小手机 → 美化 →「聊天和推特」选「分开两个图标」。不开小手机时还是原来的样子。', go: ['settings'], k: '推特 小手机 私信 聊天图标 主页 twitter x 书签 配色 蓝色 黑色 个人主页 侧边栏' },
            { id: 'soft_ui', t: '🍎 软件做成了 iPhone 的样子', d: '📱 软件 → 🍎 软件外观（每个软件的设置里也有）。\n· 界面、图标、底栏、弹窗都是苹果的样子（没有手机外壳和灵动岛，整屏就是软件）。\n· 状态栏：时间、信号、Wi-Fi、电量（手机上本来就有，默认不显示，想要可以打开）。\n· 通知横幅：有新消息时从顶上滑下来一条，点它直接打开，往上一划就收起来。\n· 锁屏：打开软件时先看一眼锁屏和最近的通知，上滑进去（默认关）。\n· 左滑返回：从左边缘往右一拖就回上一页；进下一页时从右边推进来。\n· 弹出来要你填字 / 确认的地方都是苹果那种圆角小框。', go: ['mini', 'gysUi'], k: '苹果 iphone 状态栏 横幅 锁屏 左滑 返回 动画 外观' },
            { id: 'soft_ph', t: '📲 真手机：TA 管你真的手机', d: '小功能 → 📲 真手机（在安卓 App 里用；网页版、电脑版、苹果都用不了，会提示你）。让 TA 看得到、管得住你真实的这台手机。\n【不用装插件也能用大半】在安卓 App 里，不装「谷雨守护」插件也能用：屏幕使用时间、现在在用哪个软件、电量音量、换壁纸、设闹钟、震动、手电筒、剪贴板、音量/亮度/勿扰、把你拉回谷雨、软锁提醒——这些靠 Native.js 直接调系统就行。只有 📸 截屏、📖 读屏幕上的字、🔔 读别的软件的通知、🌙 硬锁屏 这四样要装插件（因为要用无障碍 / 通知监听这种系统服务，只有原生插件给得了）。设置页最上面会告诉你现在是「全功能」还是「免插件版」。\n· 底下四个：屏幕时间 / 管着我 / TA 看过 / 设置。\n【👀 TA 看得到】屏幕使用时间（今天 / 这周 / 每个软件用了多久 / 每小时 / 解锁多少次）、你现在在用哪个软件、电量耳机音量；还能截屏看你当前的页面、读屏幕上的字、看到别的软件发来的通知。\n【🔒 TA 管得住】锁你的软件（每天限时、某个时间段、TA 临时锁）——被锁的软件一打开，谷雨就盖上来，你能点「🥺 再玩 10 分钟」求 TA（TA 按性格决定给不给）；把你从别的软件拉回谷雨；直接锁屏催你睡；自习室番茄钟一开就锁住娱乐软件；到睡觉时间自动调暗屏幕、开勿扰、调小音量。\n【🎯 小目标】「管着我」里能给自己定「今天屏幕时间不超过 X 分钟」，屏幕时间页会出进度条；做到了 TA 夸你、超了 TA 轻轻念你一句；周末 TA 还会给你看这一周的屏幕时间。\n【🎁 好玩的】换你手机的壁纸（换成 TA 的照片，一解锁就看到）、给你设真闹钟、让手机跟着 TA 的心跳震、开手电筒、往你剪贴板里偷偷塞一句话、截你的桌面来点评。\n【自己选】每一样都能单独设「先问我 / TA 直接做 / 不许」（设置里）。\n【安全】银行、支付、钱包、密码类的软件永远不读不截不锁不看通知（名字带这些词的自动进「不许碰」名单，也能自己加）；电话、紧急呼叫、设置永远能用、不会被锁；截屏默认看完就丢，要不要留、留几张自己定；🛑 随时能紧急解锁（设个口令，或者连点 TA 头像 5 下），今天之内全部解开。\n（入口：小功能 → 📲 真手机，不在「📱 软件」那一页里。）', go: ['mini', 'gysPhone'], sw: ['x:gysPhone', 'x:gysPhone.auto'], k: '真手机 屏幕使用时间 截屏 锁软件 锁屏 壁纸 闹钟 自习 睡觉 现在玩什么 通知 紧急解锁 谷雨守护 安卓 控制手机' },
            { id: 'soft_ph_pkg', t: '🔧 真手机怎么用 / 守护插件打包与「未购买」', d: '先说好消息：真手机现在在安卓 App 里<b>不装插件也能用大半</b>（屏幕时间、现在在用什么、换壁纸、设闹钟、震动手电剪贴板、音量亮度勿扰、拉回谷雨、软锁提醒）。只有 📸 截屏、📖 读屏、🔔 读通知、🌙 硬锁屏 这四样要装「谷雨守护」原生插件。\n\n【要那四样 → 装插件（做一次）】插件在仓库「安卓插件/nativeplugins/GuyuGuard」。\n1️⃣ 把「安卓插件/nativeplugins」整个文件夹，复制到你 HBuilderX 那个 App 项目的根目录（项目里已有 nativeplugins 就把 GuyuGuard 文件夹放进去）。\n2️⃣ manifest.json → 左边「App原生插件配置」→「选择本地插件」→ 勾上 GuyuGuard → 保存。\n3️⃣ 发行 → 原生App-云打包 → 打包（本地插件要云打包，标准基座里没有）。\n4️⃣ 装新包，打开 真手机 → 设置，最上面写「✓ 谷雨守护 1.0.0 装好了（全功能）」就成了。写「免插件版」= 没打进去。\n5️⃣ 去「手机权限」一项项开：使用情况访问、无障碍「谷雨守护」、显示在其他应用上层、通知使用权、修改系统设置、勿扰、后台不限制。\n\n⚠️【云打包报「该插件未购买」怎么办】这是 HBuilderX / DCloud 账号那边的事，不是真要花钱买——你自己的本地插件云打包是免费的。常见原因和解法：\n· 插件被当成了「云端（市场）插件」而不是「本地插件」：在 manifest 的「App原生插件配置」里，GuyuGuard 要显示成<b>本地插件</b>（有本地/文件夹标记）。如果它出现在云端插件列表里，删掉，改用「选择本地插件」重新勾。\n· DCloud 账号没做<b>实名认证</b>：用了自定义原生插件云打包，DCloud 要求发行账号实名认证，没认证就会卡。去 dev.dcloud.net.cn 把账号实名了再打。\n· 确认项目根目录真有 `nativeplugins/GuyuGuard/package.json` 和 `android/GuyuGuard.aar`，且 package.json 里 id 是 GuyuGuard。\n\n🅱️【实在搞不定插件、又急着用】那就<b>先别装插件</b>：第 2 步不勾 GuyuGuard，直接云打包（没有原生插件就不会有「未购买」这一检查）。装上照样能用真手机的大半功能，等插件那边理顺了再加回来。\n老实说一句：个别 HBuilderX 版本对本地插件的支持不一样，反复不行就把报错告诉立夏，我帮你看。', go: ['mini', 'gysPhone'], k: '打包 守护 插件 hbuilder 云打包 nativeplugins 原生插件 未购买 实名认证 本地插件 权限 无障碍 使用情况访问 免插件' },
            { id: 'soft_ph_dev', t: '🧑‍💻 进阶：自己改插件 / 做个自己的软件', d: '这条是给想自己改代码的你看的，平时用不到。\n【改「谷雨守护」插件（真手机靠它）】源码和构建脚本在仓库 `安卓插件/GuyuGuard-源码与构建/`：`src/` 是 Java（看屏幕时间 / 截屏 / 锁屏 每个本事都是 `Guard.java` 里的一个方法），`aar/` 是权限和配置，`build.sh` 一键重新打包。具体怎么改、要装什么（一个 JDK，不用整套 Android SDK），都写在那个文件夹里的「怎么改谷雨守护插件.md」（`文档/` 下也有一份）。Java 里加一个方法 → `60-真手机.js` 里就能调它。\n【做一个自己的软件】仓库 `插件/软件/源码/示例-做个自己的软件.js.txt` 是一份注释写满的空白模板（开关、整页界面、TA 会自己做、今天、小组件、记忆、提示词都留好位置）。复制一份改名成「70-你的软件名.js」（要数字开头），按里面写着「改这里」的地方改，在 `插件/软件/源码/` 跑 `python3 build.py`，再把开关 id 加进 js/79 的 hub_soft 和「📱 软件全家桶」就行。', go: ['mini', 'gysPhone'], k: '改插件 源码 java aar build 自己做软件 模板 示例 开发 进阶' },
            { id: 'h_gift', t: '🎁 TA 给你的', d: '🎁 TA 的秘密计划、TA 的梦、写给你的歌、留声机、涂鸦互传、占卜。', go: ['mini', 'hub_gift'], sw: ['x:gyxPlan', 'x:gyxDream', 'x:gyxSong', 'x:gyxTape', 'x:gyxDoodle', 'x:gyxMystic'], k: '秘密 惊喜 偷偷学 梦 歌 磁带 留声机 涂鸦 占卜 塔罗' },
            { id: 'h_alt', t: '🪐 换个世界玩', d: '平行世界、换个世界、互换身份一天、番外隔离。', go: ['mini', 'hub_alt'], sw: ['x:gyxWorld', 'x:gyxTheater', 'x:gyxSwap', 'x:gyxSide'], k: '平行世界 换个世界 互换身份 番外 如果' },
            { id: 'h_chat', t: '💭 聊天细节', d: '时间感知、内置提示词、总结滚雪球、外语和翻译、气泡表情回应。', go: ['mini', 'hub_chat'], sw: ['x:gyxRoll', 'x:gyxLang', 'x:gyxReact'], k: '时间感知 提示词 滚雪球 外语 翻译 表情回应' },
            { id: 'h_world', t: '🌐 外面的世界', d: '此刻（所有人现在在做什么）、联网探索、🔥 真实热搜。', go: ['mini', 'hub_world'], sw: ['c:webExplore', 'x:gyxHot'], k: '此刻 联网 探索 热搜 微博 新闻' },
            { id: 'h_look', t: '🎨 美化（在设置里）', d: '🫧 气泡工坊、🎨 导入酒馆主题、🌗 日夜主题和动态壁纸、👉 跟手返回。在 设置 → 🧰 功能设置。', go: ['mini', 'hub_look'], sw: ['x:gyxBubble', 'x:gyxStTheme', 'x:gyxDayNight', 'x:gyxSwipe'], k: '美化 气泡 主题 酒馆 深色 夜间 壁纸 动态 返回 滑动' },
            { id: 'h_set', t: '🎛️ 开关和后台（在设置里）', d: '全部开关、插件开关中心、省电模式、文案不重样、⏳ 生成中提示。在 设置 → 🧰 功能设置。', go: ['mini', 'hub_set'] },
            { id: 'gallery', t: '🖼️ 相册', d: '表情包、角色照片、合照、情侣头像、TA 的相册（生活碎片和 🤳 自拍）。', go: ['mini', 'gallery'], sw: ['x:gyxAlbum', 'x:gyxMeme', 'x:gyxDuo', 'x:gyxAvatar'], k: '图库 表情包 照片 合照 头像 图片 自拍' },
            { id: 'days', t: '📅 我们的日子', d: '纪念日、生日、🏮 一起过节（农历节日自动算：春节、元宵、端午、七夕、中秋、重阳、腊八，当天有节日卡和小活动）。', go: ['mini', 'days'], sw: ['c:charOwnDays', 'x:gyxAnniv', 'x:gyxBday', 'x:gyxFest'], k: '纪念日 生日 日子 节日 过节 过中秋 过年 春节 中秋 七夕 端午 元宵 重阳 腊八 农历' },
            { id: 'games', t: '🎮 游戏厅', d: '小功能 →「🎮 游戏厅」：先选跟谁玩（角色或群聊），再点游戏，所有游戏都在这儿。聊天输入框上面的 🎮 也是同一批：一起玩、文字冒险、寻宝、帮我选、🎲 跑团、🎣 一起钓鱼，还有下面这八个新的。狼人杀、谁是卧底、20 个问题、真心话在群聊的 🎮 里。', go: ['mini', 'gameHall'], sw: ['x:gyxGame', 'x:gyxTrpg', 'x:gyxFish'], k: '游戏 游戏厅 找不到游戏 冒险 寻宝 跑团 骰子 钓鱼 图鉴 狼人杀 卧底' },
            { id: 'g_real', t: '🎭 谁是真的 TA', d: '🎮 游戏厅 → 谁是真的TA。你问一个问题，三个 TA 同时回答，两个是冒牌货；认出真的那个。认错了 TA 会吃醋。', go: ['mini', 'gyxReal'], sw: ['x:gyxReal'], k: '真假 冒牌 默契 认出' },
            { id: 'g_seek', t: '📍 现实捉迷藏', d: '🎮 游戏厅 → 现实捉迷藏。TA 藏在你附近 150~350 米，拿着手机走，越近越"热"，找到了有 TA 留的一句话。要开定位、在手机上玩；电脑上可以玩屋里版。', go: ['mini', 'gyxSeek'], sw: ['x:gyxSeek'], k: '捉迷藏 定位 出门 冷热 找人' },
            { id: 'g_loop', t: '🔁 时间循环', d: '🎮 游戏厅 → 时间循环。同一天不停重来，现实里每天只能过一轮；每轮四个选择、找线索，攒够了在对的时候做对的事才能打破循环。', go: ['mini', 'gyxLoop'], sw: ['x:gyxLoop'], k: '循环 重来 同一天 线索 结局' },
            { id: 'g_room', t: '🗝️ 双人密室', d: '🎮 游戏厅 → 双人密室。你和 TA 关在两个房间，各看一半线索，隔着墙说话凑出四位密码。TA 不会说错数字，但可能漏说、说得含糊。', go: ['mini', 'gyxRoom'], sw: ['x:gyxRoom'], k: '密室 逃脱 密码 合作 解谜' },
            { id: 'g_fate', t: '🃏 命运卡牌', d: '🎮 游戏厅 → 命运卡牌。左右滑卡片替你们的日子做决定，感情 / 钱包 / 理智 / 世界四条槽，见底或爆满就结束，结局收进图鉴（一共 8 个）。', go: ['mini', 'gyxFate'], sw: ['x:gyxFate'], k: '卡牌 左滑 右滑 选择 结局 图鉴' },
            { id: 'g_soup', t: '🐢 海龟汤', d: '🎮 游戏厅 → 海龟汤。TA 出题你只能问"是不是"；你也能出题让 TA 猜（TA 会耍赖要提示）；还有「💞 关于我们」——汤底藏在你们自己的回忆里。', go: ['mini', 'gyxSoup'], sw: ['x:gyxSoup'], k: '海龟汤 推理 汤面 汤底 是不是' },
            { id: 'g_show', t: '💘 我们的恋综', d: '🎮 游戏厅 → 我们的恋综。选 2~5 个角色当男嘉宾，你是唯一的女嘉宾：开场采访、约会、匿名心动短信、镜头外，六集后告白夜。', go: ['mini', 'gyxShow'], sw: ['x:gyxShow'], k: '恋综 综艺 心动短信 告白 修罗场 吃醋' },
            { id: 'g_case', t: '🔍 剧本杀', d: '🎮 游戏厅 → 剧本杀。选 3~5 个角色演嫌疑人，每人都有秘密，凶手就在他们中间；你搜证（只能搜 4 处）、盘问（凶手会撒谎）、最后指认，结束有复盘。', go: ['mini', 'gyxCase'], sw: ['x:gyxCase'], k: '剧本杀 推理 凶手 侦探 搜证 盘问' },
            { id: 'g_stuck', t: '🆘 TA 被困了', d: '🎮 游戏厅 → TA 被困了（学《Lifeline》）。TA 出状况了（迷路、困在电梯……），按真实时间在聊天里向你求助；你替 TA 拿主意，TA 说「两小时后再找你」就真的两小时后才来（可以调成快一点或不等）。选得越冒险，结局越可能吃点苦头。', go: ['mini', 'gyxStuck'], sw: ['x:gyxStuck', 'x:gyxStuck.auto'], k: '被困 求救 迷路 lifeline 真实时间 选择' },
            { id: 'g_wave', t: '📡 心电感应光谱', d: '🎮 游戏厅（或 💬 问答）→ 心电感应光谱（学桌游《Wavelength》）。一条刻度两头各一个词，TA 藏一个位置给你一句提示，你拖指针猜；下一轮换你藏、TA 猜。五轮满分 20，默契分和默契问答互相看得到。', go: ['mini', 'gyxWave'], sw: ['x:gyxWave', 'x:gyxWave.auto'], k: '光谱 心电感应 默契 猜位置 wavelength 刻度' },
            { id: 'help2', t: '🛟 客服 · 使用指南', d: '就是这里，设置最上面也有。', go: ['help'] },
            { id: 'book', t: '🧾 一起记账', d: '在钱包里：个人资料 → 钱包。', go: ['view', 'profile', 'me'], sw: ['x:gyxBook'], k: '记账 钱包 账本' },
            { id: 'intro', t: '🎬 开场动画', d: '设置 → 🧰 功能设置 → 开场动画。', go: ['mini', 'intro'], sw: ['x:gyxIntro'], k: '开场 动画 启动' },
            { id: 'place', t: '🌏 两地（时差、我在哪、TA 在哪）', d: '🧺 生活 → 行程与天气 → 🌏 两地。', go: ['maptab', 'place'], k: '时差 城市 异地 两地 位置' },
            { id: 'time', t: '🕐 时间感知', d: '💭 聊天细节 → 时间感知。', go: ['mini', 'timePlace'], k: '时间 几点 感知' },
            { id: 'badge', t: '🏅 成就 / 📈 等级自己设', d: '我们的关系 → 成就（或等级）→ ✏️ 自定义；里面有「让 TA 来设」。', go: ['hub', 'hub_rel', 'gyxBadge'], sw: ['x:gyxBadge', 'x:gyxLevel'], k: '自定义 成就 等级 称号' },
            { id: 'recapcfg', t: '回顾多久总结一次', d: '回顾 → ⚙️ 多久总结一次。', go: ['mini', 'hub_recap'], k: '频率 多久 总结 周期' },
            { id: 'notes', t: '📇 她的真实情况', d: '🧺 生活 → 生活小档案 → 她的真实情况：身高、工作、忌口这些，所有角色共用，写一次就行。', go: ['mini', 'gyxNotes'], sw: ['x:gyxNotes'], k: '真实情况 档案 身高 工作 忌口 设定 我的' },
            { id: 'diary', t: '✉️ 信件与日记', d: '左边栏「信件与日记」。', go: ['view', 'diary'], k: '信件 日记' },
            { id: 'story', t: '📚 我们的故事 / 续写', d: '左边栏「故事」，顶上切换。', go: ['view', 'novel'], k: '故事 小说 续写' }
        ] },
        { id: 'mem', icon: '🧠', title: '记忆', items: [
            { id: 'memall', t: '记忆总览', d: '左边栏「更多」→ 🧠 记忆总览。聊天里的记忆、自动总结、向量记忆，还有每个小功能自己记的东西（成就、等级称号、小生命种类、TA 送的皮肤、客服记下的问题……）都在这一页，每一条都能改、能删。', go: ['mem'], sw: ['c:chatSummary', 'c:vecAutoBackfill'], k: '记忆 记错 删除记忆 总结 向量' },
            { id: 'truth', t: '让所有角色都知道我的基本情况', d: '写在「生活小档案 → 她的真实情况」，只用写一次。', go: ['mini', 'gyxNotes'], sw: ['x:gyxNotes'] },
            { id: 'wb', t: '世界书 / 设定', d: '不在记忆总览，在「更多」→ 📖 设定库。', go: ['view', 'worldbook'], k: '世界书 设定库 lore' }
        ] },
        { id: 'phone', icon: '📱', title: '小手机模式', items: [
            { id: 'pmon', t: '打开小手机模式', d: '设置 → 小手机模式。打开后整个谷雨变成一台手机，桌面上是图标和小组件。（原来的「微信模式」去掉了，换成了 📱 软件 里单独的 💚 微信。）\n小功能里的每一项都会自动变成桌面上的一个图标（放在最后的「小功能」那页），点了直接进去，不用再先打开小功能找；不想要哪个就在编辑桌面里挪走或删掉。', go: ['settings'], k: '手机模式 小手机' },
            { id: 'wall', t: '壁纸', d: '小手机 → 美化里换壁纸。', go: ['beauty'], k: '壁纸 锁屏 背景' },
            { id: 'stk', t: '🏷️ 贴纸 / 抠图 / TA 的封面', d: '小手机 → 美化 →「🏷️ 贴纸」：贴纸库点一张就贴到桌面；也能传自己的图自动抠图（去背景、画笔 / 橡皮擦修边、转黑白、加白边）；还能放一张「TA 的封面」，TA 会给它写话、偷偷给你贴贴纸。', go: ['stickers'], sw: ['c:pmStkTa'], k: '贴纸 抠图 上传 封面 杂志' },
            { id: 'apps', t: '🧩 AI 小程序', d: '说一句想要什么小 App（倒数日、喝水打卡…），AI 现写一个装进来；能「改一改」；TA 也会给你做。代码长，最大回复长度太小可能写不完。', go: ['mini', 'gyxApps'], sw: ['x:gyxApps'], k: '小程序 App 应用 生成' },
            { id: 'dnwall', t: '🌗 动态壁纸 / 自动深色', d: '设置 → 🧰 功能设置 → 🎨 美化 → 日夜主题：星空、飘雪、下雨、樱花……能跟着天气；到点自动切深浅色。', go: ['mini', 'gyxDayNight'], sw: ['x:gyxDayNight'], k: '动态壁纸 深色 夜间 自动' },
            { id: 'pmscroll', t: '安卓 App 里开小手机模式滑不动', d: '235 版修过了（App 里撤掉了一条会挡住滚动的样式）。更新以后还滑不动的话，告诉开发者是哪一页（点图标进去的页面 / 弹出来的小页面 / 聊天）。', go: ['settings'], k: '滑不动 不能滑 滚动 卡住 安卓 apk 小手机' },
            { id: 'widget', t: '小组件', d: '长按桌面进编辑，加小组件。每个新功能都有自己的小组件。', go: ['phone'], sw: ['x:gyxPhoneW'], k: '小组件 桌面 组件' },
            { id: 'taphone', t: 'TA 的手机', d: '翻 TA 的聊天、相册、备忘录：小功能 → 📱 小手机。', go: ['mini', 'hub_phone'] }
        ] },
        { id: 'switch', icon: '🎛️', title: '开关和设置', intro: '开关有两处：谷雨自带的在「全部开关」，插件带来的在「插件开关中心」。', items: [
            { id: 'allsw', t: '🎛️ 全部开关', d: '设置 → 全部开关。谷雨自带的所有自动功能一页看完，能搜、能一键预设。', go: ['settings', 'auto'], k: '开关 全部开关 搜开关' },
            { id: 'injgyx', t: '🧾 插件往聊天里塞了什么', d: '设置 → 注入内容管理 → 🎲 新玩法插件。每个插件往 TA 脑子里塞的那一段都列在这儿（写了来自哪个插件），可以只关某一段：插件照样能用，只是聊天时 TA 不带着这件事。', go: ['settings', 'inject'], k: '注入 prompt 插件塞了什么 提示词太长 关掉一段' },
            { id: 'gen', t: '⏳ 生成中提示 / 停止生成', d: '模型在写东西时，屏幕顶上正中浮出一个小条（按住能拖到别处）「正在生成 · 几秒」，写完自己收回；点 ■ 停止就马上停下（那一段不要了，不会再弹报错框）。小手机模式里显示在顶上的流体云（灵动岛）里，岛上也能点停止。默认只提示你点出来的，后台自己跑的也想看就改成「都提示」。开关在 设置 → 🧰 功能设置 → 🎛️ 开关和后台 → 生成中提示。打包的 App 里没法从中间掐断请求，点停止只是把界面停下、结果扔掉。', go: ['mini', 'gyxGen'], sw: ['x:gyxGen'], k: '生成中 正在生成 停止 停止生成 卡住 等很久 转圈 灵动岛 流体云' },
            { id: 'gyxsw', t: '🧩 插件开关中心', d: '设置 → 🧰 功能设置 → 🎛️ 开关和后台 → 插件开关中心。插件带来的新玩法都在这儿。', go: ['gyx'], k: '插件开关 开关中心' },
            { id: 'two', t: '「用」和「TA 会自己做」', d: '「用」关掉 → 这个功能整个消失，入口、小组件、今天里那一块都不见了。「TA 会自己做」关掉 → 你点进去还能用，只是 TA 不会自己想起来去做。比如「来电动画和铃声」的「TA 会自己做」关了，你还是能自己换铃声，但 TA 不会偷偷给你换一个当惊喜。', go: ['gyx'], sw: ['x:gyxRing.auto'], k: '用 TA会自己做 区别 什么意思' },
            { id: 'look2', t: '🎨 美化合集', d: '设置 → 🧰 功能设置 → 🎨 美化：气泡工坊、导入酒馆主题、日夜主题和动态壁纸、跟手返回。', go: ['mini', 'hub_look'], sw: ['x:gyxBubble', 'x:gyxStTheme', 'x:gyxDayNight', 'x:gyxSwipe'], k: '美化 气泡 主题' },
            { id: 'saver', t: '🔋 省电模式', d: '开关和后台 → 省电模式。', go: ['hub', 'hub_set', 'gyxSaver'], sw: ['x:gyxSaver'], k: '省电 耗电 卡 发热' },
            { id: 'vary', t: '💬 文案不重样', d: '弹窗和提示每次说法不一样：开关和后台 → 文案不重样。', go: ['hub', 'hub_set', 'gyxVary'], sw: ['x:gyxVary'], k: '文案 重样 弹窗' },
            { id: 'skin', t: '🎨 皮肤', d: '设置 → 🧰 功能设置 → 皮肤。', go: ['mini', 'gySkinBox'], k: '皮肤 换肤 换皮肤 主题皮肤' },
            { id: 'stat', t: '📊 聊天统计', d: '设置 → 🧰 功能设置 → 聊天统计。', go: ['mini', 'chatstat'], k: '统计 词云' },
            { id: 'folder', t: '📂 手机文件夹', d: '设置 → 🧰 功能设置 → 手机文件夹。', go: ['mini', 'folder'], k: '文件夹' },
            { id: 'look', t: '🎨 外观与主题', d: '深色模式、全局 CSS、背景。', go: ['settings', 'appearance'], k: '深色 夜间 主题 背景 css 字体' },
            { id: 'inter', t: '💬 互动与描写', d: '动作描写、状态栏、打字指示、免打扰时段。', go: ['settings', 'interaction'], k: '描写 状态栏 免打扰' }
        ] },
        { id: 'plugin', icon: '🔌', title: '插件', items: [
            { id: 'imp', t: '导入插件', d: '「更多」→ 📖 设定库 → 🔌 插件。导入两个：「插件/新玩法/新玩法全家桶.json」（所有新玩法）和「插件/软件/软件全家桶.json」（微博、泡泡、小红书、豆瓣、iMessage 这些整页的软件）。电脑里以前的单个 .json 可以自己删掉了。\n（📲 真手机现在是本体自带的，不在这个全家桶里、也不用导入了。）', go: ['view', 'plugins'], k: '插件 导入 全家桶' },
            { id: 'plgupd', t: '🔄 插件自动检查更新', d: '网页托管（比如 GitHub Pages）更新了，已经导入的插件不会自己变——插件存在每台设备的浏览器里。现在打开网页几秒后会自动去网站上看一眼，有新版就问你要不要更新（你的开关和数据都不动），更新完刷新一次。插件页最上面也能手动点「🔄 检查插件更新」、关掉自动检查。双击 index.html 打开的不检查，导入一次就行。', go: ['view', 'plugins'], k: '插件更新 插件怎么更新 新版本 自动更新 插件没变 旧版 换设备' },
            { id: 'pages', t: '🌐 传到 GitHub 后网页不更新', d: '先看仓库的 Actions 页：红叉＝网站没发布成功。最常见是说明文档里的 {{宏}} 让 GitHub Pages 编译失败——仓库根目录要有一个 .nojekyll 文件（「上传到GitHub.bat」会自动补上）。绿勾了还是旧的：刷新一次，看设置页最底下的版本号；插件要靠上面的「检查插件更新」。', k: '网页 不更新 网页更新了没变 没变 还是旧的 托管 github pages 部署 版本 旧版本 上传' },
            { id: 'refresh2', t: '导入后要刷新', d: '「更多」→ 🔄 刷新，不用大退。', go: ['refresh'] },
            { id: 'each', t: '合并版里的功能还能单独关', d: '去插件开关中心，每一个都有自己的开关。', go: ['gyx'] },
            { id: 'gone', t: '已经拿掉的', d: '📺 追剧进度、🔐 我们的暗号，这两个不要了（数据没删）。' }
        ] },
        { id: 'apis', icon: '🔑', title: 'API 都花在哪', intro: '谷雨能填四类接口：主 API、副 API、向量 API、语音 / 生图各自的接口。没填的会自动退回主 API（语音和生图除外，它们有免费的退路）。下面写清楚每样东西用的是哪一个。', items: [
            { id: 'api_kind', t: '四类接口分别是什么', d: '① 主 API：好模型，写你会逐字读的东西。② 副 API（选填）：便宜模型，干后台杂活；地址、密钥、模型三样没填全就全部退回主 API。③ 向量 API（选填）：只做 embedding（向量记忆、资料库），没填用主 API 的地址，不会去碰副 API。④ 语音 / 生图：在各自的设置里填，跟上面三个无关。都在设置 → API 与模型，页面最下面「📋 主 API / 副 API / 其它接口 分别负责哪些功能」点开就是全表。', go: ['settings', 'api'], k: 'api 接口 分工 主api 副api 向量 区别 哪个' },
            { id: 'api_main', t: '走主 API 的', d: '私聊回复、群聊回复、重新生成 / 侧滑抽卡、自定义回复、进群打招呼；进聊天时刷新「此刻状态」、戳一戳、TA 主动找你；日记、写信、回信、看你日记写反应；故事章节、从素材生成小说、续写工作台（你在那一次里选了「用副 API」除外）；推文 / 小剧场 / 日程的记忆总结、TA 不在线时「瞄一眼」；角色资料自动补全、导入角色卡时识图拆分；联网探索的总结；📞 通话里 TA 说的每一句。', go: ['settings', 'api'], k: '主api 主 api 聊天 回复 花钱 哪些' },
            { id: 'api_sub', t: '走副 API 的（没填副 API 就用主 API）', d: '推文评论、NPC 路人、论坛跟帖、营销号、八卦、Ta们在做什么；私聊 / 群聊的聊天自动总结；日程生成和「此刻在做什么」流动、待办；小功能里的一起读 / 看 / 听、行程天气播报、约出去、关系、生活、商城、外卖、钱包、快递、TA 的手机、换装、冷战、通话里 TA 接不接 / 要不要打给你；所有小游戏（五子棋到狼人杀）；自主行动的「决定做什么」；客服答疑；所有新玩法插件（谁是真的 TA、剧本杀、海龟汤、恋综、时间循环、秘密计划、被你影响、营销号自己爆料、微博热搜榜起标题、📕 小红书、🧣 微博、🫧 泡泡、🫘 豆瓣、💬 iMessage、💚 微信、🎵 网易云、🎶 抖音、👥 NPC 列表生成、TA 被困了、准点群聊、旧物箱、窗台来客、心电感应光谱、录像带……插件里的模型调用一律副优先；打了又删、让 TA 重说了基本不多花钱）。', go: ['settings', 'api'], k: '副api 副 api 便宜 后台 插件 游戏 杂活' },
            { id: 'api_vis', t: '要模型「看图」的', d: '📮 现实小任务交差、📸 同一秒你拍的照片（副 API，模型得支持识图，不支持就照样夸你）、导入角色卡时识图拆分（主 API）、聊天里发图给 TA 看（跟聊天同一个，主 API）。', go: ['mini', 'gyxMis'], k: '识图 看图 多模态 图片 vision' },
            { id: 'api_img', t: '生图', d: '角色发图、TA 自拍、TA 的相册、情侣头像：按「角色发图」的设置——图库 / 搜图不花钱；调接口生图用你填的画图接口（/images/generations），没填可以用免费的 pollinations。', go: ['mini', 'gyxAlbum'], k: '生图 画图 发图 自拍 图片 接口 pollinations' },
            { id: 'api_tts', t: '语音', d: 'TA 的声音（朗读、语音条、通话、听取模式、陪你散步念出来）：按「TA 的声音」里选的服务——OpenAI 兼容 / MiniMax / Fish Audio / 火山引擎；浏览器自带朗读不花钱。你发语音转文字：SiliconFlow 等转写接口，或者浏览器自带识别。', go: ['mini', 'voice'], k: '语音 tts 朗读 声音 转文字 收费' },
            { id: 'api_net', t: '不用模型、但要联网的', d: '天气（Open-Meteo，免费）；联网探索（jina 阅读、DuckDuckGo、维基，经公共 CORS 代理）；在线找书 / 歌（Gutendex、维基文库、Internet Archive、iTunes 搜索）；🔥 真实热搜（三个公开热榜接口，可以自己换）；插件自动检查更新（读你自己的网站）；云端推送（你部署的 Cloudflare Worker）；从 GitHub 导入世界书。', go: ['mini', 'web_explore'], k: '联网 天气 热搜 免费 网络 代理 外部' },
            { id: 'api_zero', t: '完全不调 API 的', d: '🔁 我们的小习惯（本地认）、计步、📍 捉迷藏的冷热、🃏 命运卡牌的数值和结局、🗝️ 密室的密码和线索、🕯️ 环境音、📤 角标和卡片、身上的状态累积、日程「一键补齐」以外的日程判断、使用指南和客服在指南里查得到的回答、所有开关和记忆总览。', go: ['settings', 'auto'], k: '不花钱 免费 不调用 本地' },
            { id: 'api_save', t: '想省钱', d: '填一个便宜的副 API，杂活和插件就不占主 API；全部开关里每一项都写了「费用」，用不上的关掉；插件开关中心可以只关「TA 会自己做」；🔋 省电模式；设置页最上面「📊 Token 用量」能看每个功能各花了多少。', go: ['settings', 'auto'], k: '省钱 太贵 token 用量 花了多少 费用' },
            { id: 'api_tok', t: '📊 Token 用量：每一项花了多少', d: '在：设置页最上面「📊 Token 用量」；🌐 此刻 →「💰 花了多少」里是同一个面板（下面还接着「开着 / 关着的自动功能」）。\n· 📋 按项目：每一个会调模型的项目都列出来（聊天、打电话、小游戏、向量记忆、每个插件……），点一下展开看细项（比如 聊天 → 戳一戳 / 重新生成）。能看全部、今天、最近 7 天。这段时间没调用过的项目也列在最下面\n· 🧾 每次调用：一次一条\n· 📅 按天：点某一天，看那天的每一次\n· 💾 保存与导出：存多少、导出文件\n升级以前记下的、当时分不清是谁的，显示成「升级前的旧记录」；想要干净的，点「清零重记」。', go: ['tok'], k: 'token 用量 花了多少 花费 费用 统计 哪个最费 账单 消耗 此刻' },
            { id: 'api_tok_log', t: '🧾 看每一次调用花了多少', d: 'Token 用量 →「🧾 每次调用」。每一条有：时间、项目 · 细项、用的哪个模型、走的主 API / 副 API / 向量、输入 / 输出 / 缓存各多少 token、用了几秒。\n· 标「估算」：那家服务商没告诉我们用了多少，按字数估的\n· 标「由 XX 带出来的」：是那个插件让 TA 去做的\n· 顶上能按项目筛、能搜；在「按项目」里点开一项 →「看这一项的每一次调用」也能直接跳过来\n· 开着这一页的时候，新的调用会自己冒出来', go: ['tok', 'log'], k: '每次调用 每一次 明细 流水 记录 单次 token 模型 耗时 估算' },
            { id: 'api_tok_save', t: '💾 Token 记录存多少、导出 Excel / TXT / PDF', d: 'Token 用量 →「💾 保存与导出」。\n· 每次调用最多存：500 次到 10 万次，或者不限\n· 最多存几天：7 天到一年，或者不限（也管「按天」那一页）\n· 两个哪个先到就按哪个删；改小的时候会先问你，超出的旧记录会马上删掉，想留着就先导出\n· 导出：先选范围（全部 / 今天 / 最近 7 天 / 最近 30 天），再点 📊 Excel、📄 TXT 或 📕 PDF。Excel 里有三张表：每次调用、按项目、按天\n· 手机 App 里导出的文件存在「文档」文件夹，会弹出来让你选用什么打开', go: ['tok', 'save'], k: '导出 excel xlsx 表格 txt pdf 保存 存多少 几天 清理 删除 记录 太多 占空间' },
        ] },
        { id: 'errs', icon: '🧯', title: '报错是什么意思', intro: '客服弹出来的每一种报错，在这里都有大白话解释和一步步怎么做。客服窗口「发现的问题 → 📖 报错词典」也是这一份。', items: ERRS.map(e => ({ id: e.id, t: e.ico + ' ' + e.n, d: e.what + ' 怎么办：' + e.how.map((h, i) => '①②③④⑤'[i] + h).join(' '), go: e.go, k: '报错 错误 怎么办 ' + e.n + ' ' + (e.k || '') + ' ' + e.re.source.replace(/[\\^$()?|.*+\[\]{}]/g, ' ').replace(/\b[a-z]\b/g, '').slice(0, 160) })) },
        { id: 'help', icon: '🔍', title: '找不到的时候', items: [
            { id: 's1', t: '先搜开关', d: '设置 → 全部开关，顶上有搜索框。每个开关下面都写了「在哪里看效果」。', go: ['settings', 'auto'] },
            { id: 's2', t: '问客服', d: '直接问它「XX 在哪」「XX 怎么开」，它会给你按钮直接跳过去；有报错它也会来提醒你。', go: ['help'], k: '客服 帮助' },
            { id: 'cs_pop', t: '🔔 客服弹不弹窗', d: '客服窗口里「🔔 弹窗提醒：开 / 关」（问客服页底部、发现的问题页顶部），全部开关里也有「客服：有新问题时弹窗提醒」。关掉后问题照样记，入口上有红点。', go: ['help'], sw: ['c:helpPop'], k: '客服 弹窗 通知 太吵 关掉提醒 不弹' },
            { id: 'cs_who', t: '🎭 换客服的人设', d: '客服窗口底部「谁来回答」：🛟 客服（默认）/ 你的任意一个角色 / ✏️ 自己写一个（名字、头像、性格）。换成角色后用 TA 的语气回答，内容还是只按使用指南。', go: ['help'], k: '客服 人设 换人 角色 语气 自定义' },
            { id: 'f1', t: '更新了但没变化', d: '刷新两次：第一次下载新版，第二次才用上。', go: ['refresh'], k: '更新 没变 没生效 更新了没反应 更新没反应 旧的 还是旧版' },
            { id: 'f2', t: '导入插件后没出现', d: '「更多」→ 🔄 刷新。', go: ['refresh'], k: '插件 没出现 没有' },
            { id: 'f3', t: '合集里少了一个功能', d: '那个功能在插件开关中心被关了（「用」关着）。合集里只剩一个功能的时候，合集不出现，那个功能直接平铺在小功能里。', go: ['gyx'], k: '少了 不见了 消失 标签' },
            { id: 'f4', t: 'TA 太爱主动找我 / 太安静', d: '插件开关中心调「TA 会自己做」；角色资料页切不切「TA 自己决定」；全部开关里的「角色主动找你聊天」。', go: ['gyx'], sw: ['c:charAutonomy', 'c:proactiveChat'], k: '太主动 太安静 不找我' },
            { id: 'f5', t: 'TA 记错了什么', d: '「更多」→ 记忆总览，找到那条改或删。', go: ['mem'], k: '记错 忘了 记忆错' },
            { id: 'f6', t: '换手机 / 怕丢数据', d: '设置 → 数据备份与恢复，先导出。', go: ['settings', 'data'], k: '换手机 丢数据 备份' },
            { id: 'f7', t: '有报错 / 点了没反应', d: '打开客服看看「发现的问题」，里面写了是哪里出的错、怎么办。', go: ['help', 'issues'], k: '报错 bug 出错 没反应 卡住 冲突' }
        ] }
    ];
    const ITEMS = []; GUIDE.forEach(s => s.items.forEach(it => { it.sec = s; ITEMS.push(it); }));
    const itemById = id => ITEMS.find(x => x.id === id);

    /* ---------- 去看看 ---------- */
    const closeAll = () => { ['gyGuideOv', 'gyHelpOv'].forEach(id => { const o = document.getElementById(id); if (o) o.remove(); }); };
    const later = (f, ms) => setTimeout(() => { try { f(); } catch (e) { console.warn('[指南] 跳转失败', e); } }, ms || 60);
    const GO = {
        view: (v, p) => switchMainView(v, p),
        settings: k => { switchMainView('settings'); if (k) later(() => openSettingsPanel(k), 40); },
        mini: id => { if (typeof gyOpenMiniFeature === 'function') gyOpenMiniFeature(id); },
        hub: (id, tab) => { if (typeof window.gyHubOpen === 'function') window.gyHubOpen(id, tab); else GO.mini(id); },
        chars: () => openCharacterCenter(),
        mem: () => switchMainView('memoryHub'),
        today: () => { if (typeof window.gyTodaySet === 'function' && !(window.gyTodayRead && window.gyTodayRead().on)) window.gyTodaySet(true); if (window.innerWidth <= 900 && typeof openMobileTrendsView === 'function') openMobileTrendsView(); try { window.gyTodayRender && window.gyTodayRender(); } catch (e) {} },
        refresh: () => { if (typeof refreshAppPage === 'function') refreshAppPage(); else location.reload(); },
        sw: q => { if (typeof window.gyOpenAllSwitches === 'function') window.gyOpenAllSwitches(q); else GO.settings('auto'); },
        gyx: name => { if (typeof window.gyxSwitchOpen !== 'function') { toast('还没装插件', '先导入「新玩法全家桶.json」'); GO.view('plugins'); return; } window.gyxSwitchOpen('feat'); if (name) later(() => flashRow(name), 160); },
        gyxact: () => { if (typeof window.gyxSwitchOpen === 'function') window.gyxSwitchOpen('act'); else GO.gyx(); },
        maptab: t => { if (typeof window.gymapOpenTab === 'function') window.gymapOpenTab(t); else GO.mini('map'); },
        phone: () => { if (typeof window.gyPmSet === 'function') window.gyPmSet(true); else GO.settings(); },
        beauty: () => { if (typeof window.gyPmSet === 'function') window.gyPmSet(true); later(() => { if (typeof window.gyPmBeauty === 'function') window.gyPmBeauty(); }, 260); },
        stickers: () => { if (typeof window.gyPmSet === 'function') window.gyPmSet(true); later(() => { if (typeof window.gyMagStickers === 'function') window.gyMagStickers(); }, 260); },
        help: tab => window.gyHelpOpen(tab),
        tok: tab => { if (typeof showTokenStats === 'function') { if (tab && typeof window.gyTokSet === 'function') { try { window.__gyTokUI = window.__gyTokUI || {}; (window.__gyTokUI.m = window.__gyTokUI.m || { tab: 'items', range: 'all', f: '', day: '', q: '', n: 100, open: {} }).tab = tab; } catch (e) {} } showTokenStats(); } else GO.settings(); }
    };
    function runGo(go) {
        if (!go || !GO[go[0]]) return;
        const keep = go[0] === 'help';
        if (!keep) closeAll();
        try { GO[go[0]].apply(null, go.slice(1)); } catch (e) { console.warn('[指南] 去看看失败', go, e); toast(pick(['没跳过去', '这个入口暂时打不开']), '可能那个功能被关了，或者插件没装'); }
    }
    function flashRow(name) {
        const rows = [...document.querySelectorAll('#gyxSwOv .sw-it, .gyx-inhub .sw-it, .sw-it')];
        const r = rows.find(x => (x.innerText || '').indexOf(name) !== -1);
        if (r) { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); r.classList.add('gyg-flash'); setTimeout(() => r.classList.remove('gyg-flash'), 2400); }
    }
    window.gyGuideGo = id => { const it = itemById(id); if (it) runGo(it.go); };

    /* ---------- 开关：现在开着还是关着，点了跳过去 ---------- */
    function swInfo(s) {
        const [kind, raw] = [s.slice(0, 1), s.slice(2)];
        if (kind === 'c') {
            const d = (typeof AUTO_FEATURE_DEFS !== 'undefined' ? AUTO_FEATURE_DEFS : []).find(f => f.key === raw);
            if (!d) return null;
            return { s, name: d.label, on: isAuto(raw), where: '全部开关' };
        }
        const id = raw.replace(/\.auto$/, ''), auto = /\.auto$/.test(raw);
        const f = (window.__gyxFeats || []).find(x => x.id === id);
        if (!f) return { s, name: id, on: null, where: '插件开关中心', missing: true };
        let on = true; try { on = window.GYX && typeof window.GYX.on === 'function' ? window.GYX.on(raw) : true; } catch (e) {}
        if (auto && window.GYX && !window.GYX.on(id)) on = false;
        return { s, name: f.n + (auto ? ' · TA 会自己做' : ''), base: f.n, on, where: '插件开关中心' };
    }
    window.gyGuideSw = function (s) {
        const i = swInfo(s); if (!i) return;
        if (s[0] === 'c') { closeAll(); GO.sw(i.name); return; }
        if (i.missing) { closeAll(); toast('这个插件还没装', '先导入「新玩法全家桶.json」'); GO.view('plugins'); return; }
        closeAll(); GO.gyx(i.base);
    };
    const swChips = sw => (sw || []).map(swInfo).filter(Boolean).map(i => `<span class="gyg-sw ${i.on == null ? 'na' : i.on ? 'on' : 'off'}" onclick="event.stopPropagation();gyGuideSw('${i.s}')" title="点一下跳到这个开关（${esc(i.where)}）"><i></i>${esc(i.name)}<em>${i.on == null ? '没装' : i.on ? '开着' : '关着'}</em></span>`).join('');
    const itemCard = (it, small) => `<div class="gyg-it${small ? ' sm' : ''}" data-id="${it.id}"><div class="gyg-it-hd"><b>${esc(it.t)}</b>${it.go ? `<button type="button" onclick="gyGuideGo('${it.id}')">去看看 ›</button>` : ''}</div><div class="gyg-it-d">${esc(it.d)}</div>${it.sw && it.sw.length ? `<div class="gyg-sws"><span class="gyg-swl">要开的开关：</span>${swChips(it.sw)}</div>` : ''}</div>`;

    /* ---------- 指南页 ---------- */
    let GQ = '';
    window.gyGuideOpen = function (secId) {
        let ov = document.getElementById('gyGuideOv');
        if (!ov) {
            ov = document.createElement('div'); ov.id = 'gyGuideOv'; ov.className = 'gyg-ov'; ov.setAttribute('data-gy-overlay', '1'); ov.setAttribute('data-gy-page', '1');
            ov.innerHTML = `<div class="gyg-box"><div class="gyg-hd"><b>📘 使用指南</b><button type="button" class="gyg-cs" onclick="gyHelpOpen()">🛟 问客服</button><span class="gyg-x" onclick="document.getElementById('gyGuideOv').remove()">✕</span></div>
                <input id="gygQ" type="search" placeholder="🔍 搜：皮肤、记账、新版旧版、TA 不找我……" oninput="gyGuideSearch(this.value)">
                <div class="gyg-nav">${GUIDE.map(s => `<span onclick="gyGuideJumpSec('${s.id}')">${s.icon} ${esc(s.title)}</span>`).join('')}</div>
                <div class="gyg-body" id="gygBody"></div><div class="gyg-foot">指南写于 ${GUIDE_DATE} · 开关状态是现在的</div></div>`;
            ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
            document.body.appendChild(ov);
        }
        paintGuide();
        if (secId) later(() => window.gyGuideJumpSec(secId), 30);
    };
    function paintGuide() {
        const b = document.getElementById('gygBody'); if (!b) return;
        if (GQ.trim()) {
            const r = search(GQ, 30);
            b.innerHTML = r.length ? r.map(x => itemCard(x.it)).join('') : `<div class="gyg-empty">指南里没搜到「${esc(GQ)}」。<button type="button" onclick="gyHelpAsk(${esc(JSON.stringify(GQ))})">问问客服 ›</button></div>`;
            return;
        }
        b.innerHTML = GUIDE.map(s => `<section class="gyg-sec" id="gyg-${s.id}"><h3>${s.icon} ${esc(s.title)}</h3>${s.intro ? `<p class="gyg-intro">${esc(s.intro)}</p>` : ''}${s.items.map(it => itemCard(it)).join('')}</section>`).join('');
    }
    window.gyGuideSearch = v => { GQ = String(v || ''); paintGuide(); };
    window.gyGuideJumpSec = id => { const q = document.getElementById('gygQ'); if (GQ) { GQ = ''; if (q) q.value = ''; paintGuide(); } const el = document.getElementById('gyg-' + id); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); };

    /* ---------- 搜索（中文按两个字一组比） ---------- */
    const STOP = /怎么样|怎么|如何|在哪里|在哪儿|在哪|哪里|哪儿|能不能|可不可以|可以|为什么|是什么|什么|一下|我想|我要|想要|请问|帮我|找不到|没找到|功能|设置里?|那个|这个|吗|呢|吧|啊|呀|的|了|我|你|要|去|找|把|和|跟|有没有|有/g;
    const norm = s => String(s || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, ' ');
    function grams(q) {
        const parts = norm(q).replace(STOP, ' ').split(' ').filter(Boolean), out = new Set();
        parts.forEach(p => { if (/^[a-z0-9]+$/.test(p)) { if (p.length >= 2) out.add(p); return; } if (p.length === 1) out.add(p); for (let i = 0; i < p.length - 1; i++) out.add(p.slice(i, i + 2)); });
        return [...out];
    }
    function search(q, n) {
        const G = grams(q); if (!G.length) return [];
        const P = norm(q).replace(STOP, ' ').split(' ').filter(p => p.length >= 2);   // 整个词（「换皮肤」「没反应」）
        return ITEMS.map(it => {
            const title = norm(it.t), kw = norm(it.k || ''), body = norm(it.d + ' ' + it.sec.title);
            let m = 0, tm = 0; G.forEach(g => { if (title.includes(g)) { m++; tm++; } else if (kw.includes(g) || body.includes(g)) m++; });
            let bonus = 0; P.forEach(p => { if (title.includes(p)) bonus += 0.5; else if (kw.split(' ').some(k => k && (k === p || (p.length >= 3 && k.includes(p)) || (k.length >= 3 && p.includes(k))))) bonus += 0.4; });
            return { it, m, score: m / G.length + tm * 0.25 + bonus };
        }).filter(x => x.m > 0).sort((a, b) => b.score - a.score || b.m - a.m).slice(0, n || 5);
    }
    window.gyGuideSearchApi = q => search(q, 5).map(x => ({ id: x.it.id, t: x.it.t, score: +x.score.toFixed(2) }));
    const guideText = () => GUIDE.map(s => `## ${s.title}\n` + s.items.map(it => `- [${it.id}] ${it.t}：${it.d}${it.sw ? '（开关：' + it.sw.map(swInfo).filter(Boolean).map(i => i.name + (i.on == null ? '·没装' : i.on ? '·开着' : '·关着')).join('、') + '）' : ''}`).join('\n')).join('\n');

    /* =====================================================================
       二、客服
       ===================================================================== */
    const LF = (typeof localforage !== 'undefined' && localforage.createInstance) ? localforage.createInstance({ name: 'gyHelp', storeName: 'kv' }) : null;
    let D = { msgs: [], issues: [], unread: 0, notes: {} };
    let ready = false;
    async function loadD() { try { const v = LF ? await LF.getItem('d') : JSON.parse(localStorage.getItem('gyHelpD') || 'null'); if (v && typeof v === 'object') D = Object.assign(D, v); } catch (e) {} ready = true; }
    async function saveD() { try { D.msgs = D.msgs.slice(-200); D.issues = D.issues.slice(0, 120); if (LF) await LF.setItem('d', D); else localStorage.setItem('gyHelpD', JSON.stringify(D)); } catch (e) {} }
    const mid = () => 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const watchOn = () => isAuto('helpWatch');
    const askOn = () => isAuto('helpAsk');
    const popOn = () => isAuto('helpPop');

    // 开关（全部开关里）
    function regSwitch() {
        try {
            if (typeof AUTO_FEATURE_GROUPS !== 'undefined' && !AUTO_FEATURE_GROUPS.some(g => g.key === '客服'))
                AUTO_FEATURE_GROUPS.push({ key: '客服', icon: '🛟', title: '客服', note: '问项目里的事、出了问题来提醒你。' });
            if (typeof AUTO_FEATURE_DEFS === 'undefined') return;
            if (!AUTO_FEATURE_DEFS.some(f => f.key === 'helpWatch'))
                AUTO_FEATURE_DEFS.push({ key: 'helpWatch', label: '客服：盯着报错和插件冲突', group: '客服', desc: '页面报错、插件出错、接口报错、插件重复 / 新旧版同时装着、存储快满……发现了就在客服窗口里记一条，告诉你是哪里、怎么办，再发一条通知。每出一次就提醒一次，不限次数。关掉就不记也不提醒。', cost: '不调用 API', where: '设置 → 🛟 客服 →「发现的问题」' });
            if (!AUTO_FEATURE_DEFS.some(f => f.key === 'helpPop'))
                AUTO_FEATURE_DEFS.push({ key: 'helpPop', label: '客服：有新问题时弹窗提醒', group: '客服', desc: '客服发现报错 / 插件冲突时，除了记在客服窗口里，还弹一条通知提醒你。关掉就不弹了——问题照样记，设置里的客服入口和小组件上会有红点，打开客服就能看到。客服窗口右上角的 🔔 也是这个开关。', cost: '不花钱', where: '设置 → 🛟 客服（右上角 🔔）' });
            if (!AUTO_FEATURE_DEFS.some(f => f.key === 'helpAsk'))
                AUTO_FEATURE_DEFS.push({ key: 'helpAsk', label: '客服：指南里查不到时问 API', group: '客服', desc: '你问客服的问题，先在使用指南里找；找不到才把指南和最近的报错交给模型来回答（副 API 优先）。关掉就只查指南，一次 API 都不花。', cost: '只有指南答不上的那一问才调用一次', where: '设置 → 🛟 客服' });
        } catch (e) {}
    }

    /* ---------- 记问题 ---------- */
    const NOISE = /ResizeObserver loop|Script error\.?$|AbortError|The user aborted|The operation was aborted|play\(\) request was interrupted|NotAllowedError: play|Non-Error promise rejection captured/i;
    function srcOf(stack, msg) {
        const s = String(stack || '') + '\n' + String(msg || '');
        let m = s.match(/gyx-plugin\/([^:\s)]+?)\.js/); if (m) { let n = m[1]; try { n = decodeURIComponent(n); } catch (e) {} return { kind: 'plugin', name: n }; }
        m = String(msg || '').match(/\[插件\]\s*(.+?)\s*出错/) || String(msg || '').match(/插件"(.+?)"的启动钩子/); if (m) return { kind: 'plugin', name: m[1] };
        m = s.match(/\/js\/(\d\d[a-z]?-[\w-]+)\.js/); if (m) return { kind: 'core', name: 'js/' + m[1] };
        if (/chrome-extension:|moz-extension:|safari-extension:/.test(s)) return { kind: 'ext', name: '浏览器扩展' };
        return { kind: 'core', name: '' };
    }
    function explainJs(e) {
        const src = srcOf(e.s, e.m), msg = String(e.m || '').replace(/\s+/g, ' ').slice(0, 220);
        if (src.kind === 'ext') return null;
        if (/QuotaExceeded|quota.*exceeded|存储空间/i.test(msg)) return { kind: 'store', title: '存储空间满了', detail: msg, tip: '浏览器给谷雨的存储空间用完了，新东西可能存不进去。先去「数据备份与恢复」导出一份，再清理一下用不到的图片 / 旧聊天。', acts: [['💾 去备份', 'settings', 'data']] };
        if (src.kind === 'plugin') return { kind: 'plugin', src: src.name, title: `插件「${src.name}」出错了`, detail: msg, tip: `是插件「${src.name}」里出的错，谷雨本体没事。可以先刷新一下；还在的话去插件开关中心把它对应的功能关掉，或者重新导入一次「新玩法全家桶.json」。`, acts: [['🔄 刷新', 'refresh'], ['🧩 插件开关中心', 'gyx']] };
        return { kind: 'js', src: src.name, title: src.name ? `谷雨本体（${src.name}）出错了` : '页面出错了', detail: msg, tip: '刚才有个操作没走完。先刷新两次（如果刚更新过，第一次只是下载新版）；还是会出现的话，点「📋 复制报错」发给开发者。', acts: [['🔄 刷新', 'refresh']] };
    }
    const sigOf = x => x.kind + '|' + (x.src || '') + '|' + String(x.title + ' ' + (x.detail || '')).replace(/\d+/g, '#').slice(0, 120);
    const NOTE_LINES = {
        open: ['🛟 我这边看到一个问题：', '🛟 提醒你一下，刚才出了点状况：', '🛟 有个地方不太对劲：', '🛟 发现一个问题，先记下来了：'],
        again: ['又出现了一次', '这个问题又来了', '同一个问题又冒出来了']
    };
    /* ---------- 🎭 客服人设：默认是客服；也可以换成你的某个角色，或者自己写一个 ---------- */
    const chars_ = () => (typeof myCharacters !== 'undefined' ? myCharacters : []).filter(c => c && !c.members);
    function who() {
        const p = D.persona || { mode: 'cs' };
        if (p.mode === 'char') {
            const c = chars_().find(x => String(x.id) === String(p.cid));
            if (c) { const n = c.remark || c.name || 'TA'; return { mode: 'char', name: n, char: c, av: typeof getAvatarHTML === 'function' ? getAvatarHTML(c, 30) : esc(n.slice(0, 1)),
                sys: `这一次，你以「${c.name}」的身份来帮她解答谷雨（这个 App）的使用问题——你们本来就认识，用 ${c.name} 平时对她说话的语气、称呼和性格来说。\n${c.name} 的人设：${String(c.persona || c.description || '').slice(0, 600)}\n人设只决定你怎么说话；回答的内容仍然只能来自下面的使用指南，不懂就照实说不知道。` }; }
        }
        if (p.mode === 'custom' && p.name) return { mode: 'custom', name: p.name, av: esc(p.emo || '🙂'), sys: `这一次，你的人设是「${p.name}」：${p.desc || '（没写性格）'}。用这个人设的语气说话；回答的内容仍然只能来自下面的使用指南。` };
        return { mode: 'cs', name: '客服', av: '🛟', sys: '' };
    }
    window.gyHelpWho = () => { const w = who(); return { mode: w.mode, name: w.name }; };
    window.gyHelpPersona = async (v, custom) => {
        if (v === 'custom') { const c = custom || {}; D.persona = { mode: 'custom', name: String(c.name || '').trim().slice(0, 12), emo: String(c.emo || '🙂').trim().slice(0, 4), desc: String(c.desc || '').trim().slice(0, 300) }; if (!D.persona.name) { D.persona = { mode: 'cs' }; } }
        else if (v && v !== 'cs') D.persona = { mode: 'char', cid: String(v) };
        else D.persona = { mode: 'cs' };
        await saveD(); paintHelp(); const w = who();
        toast(w.mode === 'cs' ? pick(['换回客服了', '好，还是我来']) : pick([`现在是${w.name}在帮你`, `${w.name}来当你的小助手啦`, `换成${w.name}了`]), '');
    };
    window.gyHelpPop = v => { const on = v == null ? !popOn() : !!v; if (typeof setAutoFeature === 'function') setAutoFeature('helpPop', on, true); else if (typeof autoFeatureSwitches !== 'undefined') autoFeatureSwitches.helpPop = on; paintHelp(); toast(on ? pick(['🔔 有问题会弹窗提醒你', '🔔 弹窗打开了']) : pick(['🔕 不弹窗了', '🔕 安静模式']), on ? '' : '问题照样记着，客服入口上有红点。'); };
    window.gyHelpCustomSave = () => { const g = id => (document.getElementById(id) || {}).value || ''; window.gyHelpPersona('custom', { name: g('gyhPN'), emo: g('gyhPE'), desc: g('gyhPD') }); };
    window.gyHelpPersonaSel = v => { if (v === 'custom') { CUST = 1; paintHelp(); } else { CUST = 0; window.gyHelpPersona(v); } };
    let CUST = 0;
    const GREET = { cs: ['你好呀，我是谷雨的客服。功能在哪、开关怎么开、为什么没反应，都可以问我。', '有什么找不到的、不明白的，直接问我就好。', '我是客服～问我功能在哪、怎么开，或者让我看看最近有没有报错。'],
        other: n => [`今天换我来帮你。哪里找不到、哪里坏了，跟我说。`, `${n}在这儿。有什么不会用的，问我。`, `别慌，我陪你一起找。`] };

    async function report(x, raw) {
        try {
            if (!x || !watchOn()) return;
            if (!ready) await loadD();
            const sig = sigOf(x), now = Date.now();
            let it = D.issues.find(i => i.sig === sig && !i.done);
            if (it) { it.n++; it.last = now; if (raw) it.stack = String(raw).slice(0, 1200); }
            else { it = { id: mid(), sig, at: now, last: now, n: 1, kind: x.kind, src: x.src || '', title: x.title, detail: x.detail || '', tip: x.tip, acts: x.acts || [], stack: String(raw || '').slice(0, 1200), done: false, told: 0 }; D.issues.unshift(it); }
            // 每次出错都报（她要求的：不限次数）。只有同一个错在 1 秒内连环刷（死循环）才并成一条，免得卡死页面。
            const fresh = now - (it.told || 0) > 1000;
            if (fresh) {
                it.told = now;
                const W = who(), head0 = pick(it.n > 1 ? NOTE_LINES.again : NOTE_LINES.open);
                D.msgs.push({ id: mid(), at: now, from: 'cs', iss: it.id, t: `${W.mode === 'cs' ? head0 : head0.replace(/^🛟\s*/, '')}${it.n > 1 ? '：' : ''}\n**${it.title}**\n${it.tip}` });
                D.unread = (D.unread || 0) + 1;
                notify(it);
            }
            await saveD(); paintHelp(); paintBadge();
        } catch (e) {}
    }
    function notify(it) {
        try {
            if (!popOn()) return;   // 🔕 弹窗关了：问题照样记，入口上有红点
            const W = who();
            const head = (W.mode === 'cs' ? pick(['🛟 客服：', '🛟 客服提醒：', '🛟 ']) : pick([`${W.name}：`, `${W.name}提醒你：`])) + it.title;
            if (typeof window.gyNotifyJump === 'function') window.gyNotifyJump(W.char || null, head, it.tip.slice(0, 80), { fn: 'gyHelpOpen', args: ['issues'] });
            else toast(head, it.tip.slice(0, 80));
        } catch (e) {}
    }
    window.gyHelpReport = (title, tip, extra) => report(Object.assign({ kind: 'manual', title: String(title || '问题'), tip: String(tip || '') }, extra || {}));

    // 接住报错（开机前的从 __gyErrBuf 里拿）
    function onErr(e) {
        try {
            if (!e || NOISE.test(String(e.m || ''))) return;
            if (e.k === 'api') return;
            const x = explainJs(e); if (x) report(x, e.s);
        } catch (err) {}
    }
    function hookErrors() {
        const B = window.__gyErrBuf || []; window.__gyErrBuf = [];
        window.__gyErrSink = onErr;
        B.forEach(onErr);
        if (!window.__gyErrBufInstalled) {   // index.html 那一段没在（旧缓存）：自己接
            window.__gyErrBufInstalled = true;
            window.addEventListener('error', e => { if (e && e.error) onErr({ k: 'js', m: e.error.message || e.message, s: e.error.stack || '' }); });
            window.addEventListener('unhandledrejection', e => { const r = e && e.reason; onErr({ k: 'js', m: (r && r.message) || String(r), s: (r && r.stack) || '' }); });
            const ce = console.error;
            console.error = function () { try { const a = [...arguments], t = a.map(x => x && x.message ? x.message : String(x)).join(' '); if (/插件/.test(t)) onErr({ k: 'plugin', m: t.slice(0, 400), s: String((a.find(x => x && x.stack) || {}).stack || '') }); } catch (e) {} return ce.apply(console, arguments); };
        }
    }
    // 🧯 接口报错：所有模型请求（普通 / 流式 / 插件里的）都过一遍——
    //    报错、连不上、空回、只写了思考、话说一半被掐断……每一种都提醒，用报错词典里的大白话解释。
    const apiTag = api => { try { if (!api || typeof api !== 'object') return ''; return `（${api.isSub ? '副 API' : '主 API'}${api.model ? ' · ' + api.model : ''}）`; } catch (e) { return ''; } };
    function reportErr(e, raw, extra) {
        if (!e) e = errById('e_other');
        const x = Object.assign({ kind: 'api', src: e.id, title: '接口报错：' + e.n, detail: String(raw || '').slice(0, 300), tip: errTip(e), acts: [['👉 去处理', ...(e.go || ['settings', 'api'])]] }, extra || {});
        x.title += x.tag || ''; delete x.tag;
        report(x);
    }
    window.gyHelpApiErr = (raw, cat) => reportErr(errOf(raw) || (cat && errById(cat)), raw);
    function inspect(r, api) {
        try {
            if (!r || typeof r !== 'object' || r.aborted || r.__gyHelpSeen) return;
            try { Object.defineProperty(r, '__gyHelpSeen', { value: true }); } catch (e) {}
            const tag = apiTag(api);
            if (r.error) {
                const raw = String(r.error.message || r.error.type || r.error.code || (typeof r.error === 'string' ? r.error : JSON.stringify(r.error))).slice(0, 300);
                if (/abort|你停止了生成/i.test(raw)) return;   // 你自己点了「停止生成」的不算报错
                return reportErr(errOf(raw), raw, { tag });
            }
            const ch = r.choices && r.choices[0]; if (!ch) return;
            const m = ch.message || ch.delta || {}, c = m.content;
            const txt = typeof c === 'string' ? c : Array.isArray(c) ? c.map(x => (x && (x.text || x.content)) || '').join('') : '';
            const body = txt.replace(/<think(ing)?>[\s\S]*?(<\/think(ing)?>|$)/gi, '').trim();
            if (!txt.trim()) return reportErr(errById(m.reasoning_content || m.reasoning ? 'e_think' : 'e_empty'), '（模型回了空白' + (ch.finish_reason ? '，finish_reason=' + ch.finish_reason : '') + '）', { tag });
            if (!body) return reportErr(errById('e_think'), '（只有思考过程，没有正文）', { tag });
            if (ch.finish_reason === 'length') return reportErr(errById('e_cut'), '（finish_reason=length，回复到上限被截断）', { tag });
        } catch (e) {}
    }
    function hookApi() {
        ['callChatCompletionAPI', 'sendChatRequest', 'streamCompletionText'].forEach(name => {
            const orig = window[name]; if (typeof orig !== 'function' || orig.__gyHelp2) return;
            const w = async function (api) {
                let r;
                try { r = await orig.apply(this, arguments); }
                catch (e) { if (!/abort/i.test(String(e && (e.name + e.message)))) reportErr(errOf(e && e.message), String(e && e.message || e), { tag: apiTag(api) }); throw e; }
                inspect(r, api);
                return r;
            };
            Object.keys(orig).forEach(k => { try { w[k] = orig[k]; } catch (e) {} }); w.__gyHelp = true; w.__gyHelp2 = true; w.__gyErrNotice = orig.__gyErrNotice; w.__gyCare = orig.__gyCare; w.__gyOrig = orig;
            window[name] = w;
            try { if (name === 'callChatCompletionAPI') callChatCompletionAPI = w; else if (name === 'sendChatRequest') sendChatRequest = w; else streamCompletionText = w; } catch (e) {}
        });
    }
    // 不走聊天接口的：语音、画图、向量、拉取模型、天气——在 fetch 上看一眼
    const fetchCat = u => /\/audio\/(speech|transcriptions)|t2a_v2|\/tts\b|fish\.audio|openspeech/i.test(u) ? 'e_voice' : /\/images\/(generations|edits)/i.test(u) ? 'e_image' : /\/embeddings/i.test(u) ? 'e_vec' : /open-meteo\.com/i.test(u) ? 'e_weather' : /\/models\/?(\?|$)/i.test(u) ? 'e_models' : null;
    function hookFetch() {
        const of = window.fetch; if (typeof of !== 'function' || of.__gyHelp) return;
        const w = async function (input, init) {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            const cat = fetchCat(url); if (!cat) return of.apply(this, arguments);
            const where = { e_voice: '（语音接口）', e_image: '（画图接口）', e_vec: '（向量接口）', e_weather: '（天气）', e_models: '（拉取模型）' }[cat];
            try {
                const res = await of.apply(this, arguments);
                if (!res.ok) { try { res.clone().text().then(t => { const raw = `HTTP ${res.status} ${String(t || '').slice(0, 240)}`; reportErr(cat === 'e_models' || cat === 'e_weather' ? (errOf(raw) || errById(cat)) : (errOf(raw) || errById(cat)), raw, { tag: where }); }).catch(() => {}); } catch (e) {} }
                return res;
            } catch (e) {
                if (!/abort/i.test(String(e && (e.name + e.message)))) reportErr(cat === 'e_weather' ? errById('e_weather') : (errOf(e && e.message) || errById(cat)), String(e && e.message || e), { tag: where });
                throw e;
            }
        };
        w.__gyHelp = true; window.fetch = w;
    }

    /* ---------- 体检：插件冲突、存储、API ---------- */
    async function checkup(manual) {
        const found = [];
        try {
            const P = (typeof plugins !== 'undefined' && Array.isArray(plugins)) ? plugins : [];
            const nm = p => String(p && p.name || '').trim();
            const cnt = {}; P.forEach(p => { const n = nm(p); if (n) cnt[n] = (cnt[n] || 0) + 1; });
            const dup = Object.keys(cnt).filter(n => cnt[n] > 1);
            if (dup.length) found.push({ kind: 'conflict', src: 'dup', title: '同一个插件装了两份', detail: dup.join('、'), tip: `「${dup.join('」「')}」在插件列表里有两份，会重复运行（弹两次、算两遍）。去插件页删掉多出来的那一份，或者重新导入一次「新玩法全家桶.json」。`, acts: [['🔌 插件页', 'view', 'plugins']] });
            try {
                const BUN = window.__gyHubBundles || null;
                const has = new Set(P.map(nm));
                if (BUN && BUN.bundles) {
                    const both = [];
                    Object.keys(BUN.bundles).forEach(b => { if (!has.has(b)) return; BUN.bundles[b].forEach(([o]) => { if (o !== b && has.has(o)) both.push(o); }); });
                    if (both.length) found.push({ kind: 'conflict', src: 'bundle', title: '新旧版插件同时装着', detail: both.join('、'), tip: `合并版已经包含了「${both.slice(0, 4).join('」「')}」${both.length > 4 ? '等 ' + both.length + ' 个' : ''}，旧的单个插件还在，会跑两遍。刷新一下会自动拿掉旧的；没拿掉的话去插件页手动删。`, acts: [['🔄 刷新', 'refresh'], ['🔌 插件页', 'view', 'plugins']] });
                    const gone = (BUN.retired || []).filter(o => has.has(o));
                    if (gone.length) found.push({ kind: 'conflict', src: 'retired', title: '装着已经不要了的插件', detail: gone.join('、'), tip: `「${gone.join('」「')}」已经不要了（数据没删），刷新一下会自动拿掉。`, acts: [['🔄 刷新', 'refresh']] });
                }
            } catch (e) {}
            // 插件装了但一个都没跑起来（全家桶导入了却没有任何功能注册）
            if (P.some(p => /新玩法|合并了/.test(String(p.description || '') + nm(p)) && p.enabled !== false) && !(window.__gyxFeats || []).length && window.__guyuBooted)
                found.push({ kind: 'plugin', src: 'boot', title: '插件装了但没跑起来', detail: '', tip: '插件列表里有，但一个功能都没加载出来。刷新一下；还不行就重新导入「新玩法全家桶.json」。', acts: [['🔄 刷新', 'refresh'], ['🔌 插件页', 'view', 'plugins']] });
        } catch (e) {}
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const est = await navigator.storage.estimate();
                if (est && est.quota && est.usage / est.quota > 0.9) found.push({ kind: 'store', src: 'quota', title: '存储空间快满了', detail: `已用 ${Math.round(est.usage / 1048576)}MB / ${Math.round(est.quota / 1048576)}MB`, tip: '浏览器给谷雨的空间快用完了，满了以后新东西会存不进去。先导出备份，再清理不用的图片和旧聊天。', acts: [['💾 去备份', 'settings', 'data']] });
            }
        } catch (e) {}
        try { localStorage.setItem('__gyHelpT', '1'); localStorage.removeItem('__gyHelpT'); } catch (e) { found.push({ kind: 'store', src: 'ls', title: '设置存不进去了', detail: String(e && e.message || e), tip: '浏览器的本地存储写不进去（满了或者被禁了，无痕模式也会这样）。开关和小设置改了会不生效。先导出备份，再清理一下。', acts: [['💾 去备份', 'settings', 'data']] }); }
        try {
            if (!window.bailuCards && typeof getApiConfig === 'function') { const a = getApiConfig(false); if (!a || !a.key || !a.url) found.push({ kind: 'cfg', src: 'noapi', title: '还没接 API', detail: '', tip: 'TA 现在说不了话。去 设置 → API 与模型 填地址和 key。', acts: [['🌟 API 设置', 'settings', 'api']] }); }
        } catch (e) {}
        if (!manual) for (const x of found) await report(x);
        return found;
    }
    window.gyHelpCheck = async function () {
        const f = await checkup(true);
        for (const x of f) { const sig = sigOf(x); const it = D.issues.find(i => i.sig === sig && !i.done); if (it) it.told = 0; await report(x); }
        if (!f.length) { D.msgs.push({ id: mid(), at: Date.now(), from: 'cs', t: pick(['体检做完了：插件没有重复、没有新旧版打架，存储也够用。👌', '查了一圈，一切正常。', '没发现问题：插件、存储、API 都好好的。']) }); await saveD(); }
        paintHelp();
    };

    /* ---------- 回答问题 ---------- */
    const TALK = {
        found: ['在这儿：', '找到了——', '指南里写着呢：', '你要找的应该是这个：'],
        more: ['相关的还有这些：', '可能也用得上：'],
        none: ['指南里没找到这个。', '这个指南里没写到。'],
        issuesNone: ['最近没发现问题，一切正常。', '这几天没有报错，放心用。'],
        issuesSome: ['最近记下的问题：', '这是最近发现的：']
    };
    function issuesSummary() {
        const L = D.issues.filter(i => !i.done && Date.now() - i.last < 7 * 864e5).slice(0, 6);
        if (!L.length) return { t: pick(TALK.issuesNone) };
        return { t: pick(TALK.issuesSome) + '\n' + L.map(i => `· ${i.title}${i.n > 1 ? `（${i.n} 次）` : ''} — ${nowStr(i.last)}`).join('\n'), tab: 'issues' };
    }
    function diag() {
        const v = typeof GY_VERSION !== 'undefined' ? GY_VERSION : '?';
        let pl = []; try { pl = (typeof plugins !== 'undefined' ? plugins : []).map(p => (p.enabled === false ? '（关）' : '') + p.name); } catch (e) {}
        const iss = D.issues.filter(i => !i.done).slice(0, 8).map(i => `- ${i.title}｜${i.detail}｜${i.n}次｜${nowStr(i.last)}`).join('\n');
        return `谷雨版本 v${v}；${window.bailuCards ? '白露' : '谷雨'}；小手机模式${document.body.classList.contains('gyphm') ? '开' : '关'}；插件 ${pl.length} 个：${pl.slice(0, 40).join('、')}\n最近的问题：\n${iss || '（没有）'}`;
    }
    async function askApi(q) {
        if (!askOn() || window.bailuCards || typeof callChatCompletionAPI !== 'function' || typeof getApiConfig !== 'function') return null;
        const api = getApiConfig(true); if (!api || !api.key) return null;
        const hist = D.msgs.slice(-8).filter(m => m.t).map(m => ({ role: m.from === 'me' ? 'user' : 'assistant', content: String(m.t).slice(0, 400) }));
        const sys = `你是「谷雨」这个 App 的客服（谷雨是一个和 AI 角色谈恋爱、聊天、过日子的网页 App）。用户是谷雨的使用者。
只根据下面的【使用指南】和【现在的状态】回答，不要编造指南里没有的入口或按钮；不知道就直说不知道，并建议她点「复制报错」发给开发者。
${who().sys ? who().sys + '\n回答用简短的中文、口语，2~5 句话，不要用 markdown 标题。' : '回答用简短的中文，口语，像贴心的客服，2~5 句话，不要用 markdown 标题。'}
如果回答里提到了指南里的条目，在最后单独一行写：[[跳转:条目id,条目id]]（最多 3 个，id 用方括号里的那个）。

【使用指南】
${guideText()}

【现在的状态】
${diag()}`;
        try {
            const d = await callChatCompletionAPI(api, [{ role: 'system', content: sys }].concat(hist).concat([{ role: 'user', content: q }]));
            if (!d || d.error) return null;
            let t = String((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '').trim();
            if (typeof stripReasoningBlocks === 'function') t = stripReasoningBlocks(t);
            if (!t) return null;
            let refs = []; t = t.replace(/\[\[\s*跳转\s*[:：]\s*([^\]]*)\]\]/g, (_, s) => { refs = s.split(/[,，\s]+/).map(x => x.trim()).filter(x => itemById(x)).slice(0, 3); return ''; }).trim();
            return { t, refs };
        } catch (e) { return null; }
    }
    let busy = false;
    window.gyHelpAsk = async function (q) {
        q = String(q == null ? (document.getElementById('gyhIn') || {}).value || '' : q).trim();
        if (!q || busy) return;
        if (!document.getElementById('gyHelpOv')) window.gyHelpOpen('chat');
        const inp = document.getElementById('gyhIn'); if (inp) inp.value = '';
        if (!ready) await loadD();
        D.msgs.push({ id: mid(), at: Date.now(), from: 'me', t: q }); await saveD(); paintHelp();
        let ans;
        if (/(报错|bug|出错|错误|冲突|问题|异常|崩)/i.test(q) && /(最近|有没有|有什么|哪些|列|看看|检查|体检)/.test(q)) {
            const s = issuesSummary(); ans = { t: s.t, refs: [], tab: s.tab };
        } else {
            const R = search(q, 4), top = R[0];
            const good = top && top.m >= 1 && (top.score >= 0.75 || (top.m >= 2 && top.score >= 0.55));
            if (good) {
                const refs = R.filter(x => x.score >= top.score * 0.6).slice(0, 3).map(x => x.it.id);
                ans = { t: pick(TALK.found), refs };
            } else {
                busy = true; paintHelp(true);
                const r = await askApi(q);
                busy = false;
                if (r) ans = { t: r.t, refs: r.refs, ai: true };
                else ans = { t: pick(TALK.none) + (R.length ? '\n' + pick(TALK.more) : '\n换个说法试试，或者翻翻 📘 使用指南。') + (!askOn() ? '\n（「指南里查不到时问 API」关着，所以我只查了指南。）' : ''), refs: R.slice(0, 3).map(x => x.it.id) };
            }
        }
        D.msgs.push({ id: mid(), at: Date.now(), from: 'cs', t: ans.t, refs: ans.refs || [], ai: !!ans.ai });
        D.asked = D.asked || {}; D.asked[dayKey()] = (D.asked[dayKey()] || 0) + 1;
        await saveD(); paintHelp();
    };

    /* ---------- 客服窗口 ---------- */
    let TAB = 'chat';
    const mdLite = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    const actBtns = acts => (acts || []).map(a => `<button type="button" onclick='gyHelpAct(${esc(JSON.stringify(a.slice(1)))})'>${esc(a[0])}</button>`).join('');
    window.gyHelpAct = go => runGo(go);
    function msgHtml(m) {
        if (m.from === 'me') return `<div class="gyh-m me"><div class="gyh-b">${esc(m.t)}</div></div>`;
        const it = m.iss && D.issues.find(i => i.id === m.iss);
        const refs = (m.refs || []).map(itemById).filter(Boolean);
        return `<div class="gyh-m cs"><span class="gyh-av">${who().av}</span><div class="gyh-b">${mdLite(m.t)}${refs.length ? `<div class="gyh-refs">${refs.map(r => itemCard(r, true)).join('')}</div>` : ''}${it ? `<div class="gyh-acts">${actBtns(it.acts)}<button type="button" onclick="gyHelpCopy('${it.id}')">📋 复制报错</button>${it.done ? '<em>已解决</em>' : `<button type="button" onclick="gyHelpDone('${it.id}')">✓ 解决了</button>`}</div>` : ''}${m.ai ? '<i class="gyh-ai">由模型根据指南回答</i>' : ''}<span class="gyh-t">${nowStr(m.at)}</span></div></div>`;
    }
    function issueHtml(i) {
        return `<div class="gyh-iss${i.done ? ' done' : ''}"><div class="gyh-iss-hd"><b>${esc(i.title)}</b><em>${i.n > 1 ? i.n + ' 次 · ' : ''}${nowStr(i.last)}</em></div><div class="gyh-iss-tip">${mdLite(i.tip)}</div>${i.detail ? `<div class="gyh-iss-d">${esc(i.detail)}</div>` : ''}${D.notes[i.id] ? `<div class="gyh-iss-n">📝 ${esc(D.notes[i.id])}</div>` : ''}<div class="gyh-acts">${actBtns(i.acts)}<button type="button" onclick="gyHelpCopy('${i.id}')">📋 复制报错</button>${i.done ? `<button type="button" onclick="gyHelpDone('${i.id}',1)">↩ 没解决</button>` : `<button type="button" onclick="gyHelpDone('${i.id}')">✓ 解决了</button>`}<button type="button" onclick="gyHelpDel('${i.id}')">🗑️</button></div></div>`;
    }
    const SUGG = ['怎么换皮肤', 'TA 怎么不主动找我', '哪些功能走副 API', '怎么省钱', '剧本杀在哪', '海龟汤怎么玩', '插件怎么更新', '怎么换客服人设', '最近有报错吗', '网页更新了插件没变'];
    window.gyHelpOpen = function (tab) {
        if (tab) TAB = tab;
        let ov = document.getElementById('gyHelpOv');
        if (!ov) {
            ov = document.createElement('div'); ov.id = 'gyHelpOv'; ov.className = 'gyg-ov'; ov.setAttribute('data-gy-overlay', '1'); ov.setAttribute('data-gy-page', '1');
            ov.innerHTML = `<div class="gyg-box gyh-box"><div class="gyg-hd"><b id="gyhTitle">🛟 客服</b><button type="button" class="gyg-cs" id="gyhPopBtn" onclick="gyHelpPop()" title="有新问题时要不要弹窗提醒">🔔</button><button type="button" class="gyg-cs" onclick="gyGuideOpen()">📘 指南</button><span class="gyg-x" onclick="document.getElementById('gyHelpOv').remove()">✕</span></div>
                <div class="gyh-tabs"><span data-t="chat" onclick="gyHelpOpen('chat')">💬 问客服</span><span data-t="issues" onclick="gyHelpOpen('issues')">🧰 发现的问题</span><span data-t="dict" onclick="gyHelpOpen('dict')">📖 报错词典</span></div>
                <div class="gyh-body" id="gyhBody"></div><div id="gyhFoot"></div></div>`;
            ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
            document.body.appendChild(ov);
        }
        if (D.unread) { D.unread = 0; saveD(); paintBadge(); }
        if (!ready) loadD().then(() => paintHelp()); else paintHelp();
    };
    function paintHelp(thinking) {
        const ov = document.getElementById('gyHelpOv'); if (!ov) return;
        try { const w = who(), t = document.getElementById('gyhTitle'); if (t) t.innerHTML = w.mode === 'cs' ? '🛟 客服' : `<span class="gyh-tav">${w.av}</span>${esc(w.name)} <small>· 客服</small>`; const pb = document.getElementById('gyhPopBtn'); if (pb) { pb.textContent = popOn() ? '🔔 弹窗' : '🔕 不弹窗'; pb.classList.toggle('off', !popOn()); } } catch (e) {}
        ov.querySelectorAll('.gyh-tabs span').forEach(s => s.classList.toggle('on', s.dataset.t === TAB));
        const open = D.issues.filter(i => !i.done).length;
        const t2 = ov.querySelector('.gyh-tabs span[data-t="issues"]'); if (t2) t2.textContent = '🧰 发现的问题' + (open ? `（${open}）` : '');
        const b = document.getElementById('gyhBody'), f = document.getElementById('gyhFoot');
        if (TAB === 'dict') {
            b.innerHTML = `<div class="gyh-off" style="background:rgba(29,155,240,.08)">谷雨认得出的所有报错都在这儿。出错的那一刻客服会把对应的这一条发给你；没出错的时候也可以先看看。</div>` + ERRS.map(e => `<div class="gyh-iss"><div class="gyh-iss-hd"><b>${e.ico} ${esc(e.n)}</b></div><div class="gyh-iss-tip">${esc(e.what)}</div><ol class="gyh-how">${e.how.map(h => `<li>${esc(h)}</li>`).join('')}</ol><div class="gyh-acts">${actBtns([['👉 去处理', ...(e.go || ['settings', 'api'])]])}</div></div>`).join('');
            f.innerHTML = ''; return;
        }
        if (TAB === 'issues') {
            b.innerHTML = `<div class="gyh-tools"><button type="button" onclick="gyHelpCheck()">🩺 现在体检一下</button><button type="button" onclick="gyHelpPop()">${popOn() ? '🔔 弹窗提醒：开' : '🔕 弹窗提醒：关'}</button><button type="button" onclick="gyHelpCopy()">📋 复制诊断信息</button>${D.issues.some(i => i.done) ? '<button type="button" onclick="gyHelpClearDone()">清掉已解决的</button>' : ''}</div>
                ${!watchOn() ? `<div class="gyh-off">「客服：盯着报错和插件冲突」关着，新问题不会记。<button type="button" onclick="gyHelpAct(['sw','客服：盯着报错'])">去打开 ›</button></div>` : ''}
                ${D.issues.length ? D.issues.map(issueHtml).join('') : '<div class="gyg-empty">还没发现过问题 🌱</div>'}`;
            f.innerHTML = '';
            return;
        }
        const W = who();
        const M = D.msgs.length ? D.msgs : [{ from: 'cs', at: Date.now(), t: pick(W.mode === 'cs' ? GREET.cs : GREET.other(W.name)) }];
        b.innerHTML = M.slice(-60).map(msgHtml).join('') + (thinking || busy ? '<div class="gyh-m cs"><span class="gyh-av">' + who().av + '</span><div class="gyh-b gyh-dots"><i></i><i></i><i></i></div></div>' : '');
        const sel = `<select onchange="gyHelpPersonaSel(this.value)"><option value="cs"${W.mode === 'cs' && !CUST ? ' selected' : ''}>🛟 客服（默认）</option>${chars_().map(c => `<option value="${esc(c.id)}"${W.mode === 'char' && String(W.char.id) === String(c.id) && !CUST ? ' selected' : ''}>${esc(c.remark || c.name)}</option>`).join('')}<option value="custom"${W.mode === 'custom' || CUST ? ' selected' : ''}>✏️ 自己写一个…</option></select>`;
        const p = D.persona || {};
        f.innerHTML = `<div class="gyh-cfg">🎭 谁来回答 ${sel}<button type="button" class="gyh-pop${popOn() ? '' : ' off'}" onclick="gyHelpPop()" title="有新问题时要不要弹窗提醒">${popOn() ? '🔔 弹窗提醒：开' : '🔕 弹窗提醒：关'}</button>${CUST || W.mode === 'custom' ? `<div class="gyh-cust"><input id="gyhPE" value="${esc(p.emo || '🙂')}" maxlength="4" style="width:44px" placeholder="头像"><input id="gyhPN" value="${esc(p.name || '')}" maxlength="12" placeholder="名字"><input id="gyhPD" value="${esc(p.desc || '')}" placeholder="性格 / 说话方式，比如：毒舌但很靠谱的学姐" style="flex:1;min-width:160px"><button type="button" onclick="gyHelpCustomSave()">好了</button></div>` : ''}</div><div class="gyh-sugg">${SUGG.map(s => `<span onclick="gyHelpAsk('${s}')">${s}</span>`).join('')}</div><div class="gyh-in"><input id="gyhIn" placeholder="问点什么……" onkeydown="if(event.key==='Enter'&&!event.isComposing)gyHelpAsk()"><button type="button" onclick="gyHelpAsk()">发送</button></div>`;
        b.scrollTop = b.scrollHeight;
    }
    window.gyHelpDone = async (id, undo) => { const i = D.issues.find(x => x.id === id); if (!i) return; i.done = !undo; if (!undo) i.told = 0; await saveD(); paintHelp(); toast(undo ? '好，继续盯着' : pick(['好嘞，标成解决了', '解决了就好', '✓ 记下了'])); };
    window.gyHelpDel = async id => { D.issues = D.issues.filter(x => x.id !== id); D.msgs = D.msgs.filter(m => m.iss !== id); delete D.notes[id]; await saveD(); paintHelp(); };
    window.gyHelpClearDone = async () => { const gone = new Set(D.issues.filter(i => i.done).map(i => i.id)); D.issues = D.issues.filter(i => !gone.has(i.id)); D.msgs = D.msgs.filter(m => !gone.has(m.iss)); await saveD(); paintHelp(); };
    window.gyHelpCopy = async id => {
        const i = id && D.issues.find(x => x.id === id);
        const txt = (i ? `【${i.title}】${i.n} 次，最近 ${new Date(i.last).toLocaleString()}\n${i.detail}\n${i.stack || ''}\n\n` : '') + diag();
        try { await navigator.clipboard.writeText(txt); toast(pick(['复制好了', '📋 已复制']), '可以直接粘贴发给开发者'); }
        catch (e) { try { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); toast('复制好了'); } catch (e2) { toast('复制不了', '长按选中手动复制吧'); } }
    };

    /* ---------- 设置里的两个入口（最上面） ---------- */
    function paintBadge() {
        const d = document.querySelector('#gyHelpEntry .set-entry-desc');
        if (d) d.textContent = D.unread ? `有 ${D.unread} 条新消息` : '问它功能在哪；出了问题它会来提醒你';
        const dot = document.querySelector('#gyHelpEntry .gyh-dot'); if (dot) dot.style.display = D.unread ? '' : 'none';
    }
    function setEntries() {
        const menu = document.querySelector('#setIndex .set-menu'); if (!menu || document.getElementById('gyGuideEntry')) return;
        const mk = (id, ico, title, desc, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'set-entry'; b.id = id; b.dataset.core = '1'; b.innerHTML = `<span class="set-entry-ico">${ico}</span><span class="set-entry-main"><span class="set-entry-title">${title}${id === 'gyHelpEntry' ? '<i class="gyh-dot" style="display:none"></i>' : ''}</span><span class="set-entry-desc">${desc}</span></span><span class="set-entry-arrow">›</span>`; b.onclick = fn; return b; };
        const g = mk('gyGuideEntry', '📘', '使用指南', '功能在哪、要开什么开关，点一下直接跳过去', () => window.gyGuideOpen());
        const h = mk('gyHelpEntry', '🛟', '客服', '问它功能在哪；出了问题它会来提醒你', () => window.gyHelpOpen());
        menu.insertBefore(h, menu.firstElementChild); menu.insertBefore(g, h);
        paintBadge();
    }
    function keepTop() {
        const menu = document.querySelector('#setIndex .set-menu'); if (!menu) return;
        const g = document.getElementById('gyGuideEntry'), h = document.getElementById('gyHelpEntry');
        if (!g || !h) { setEntries(); return; }
        if (menu.firstElementChild !== g) { menu.insertBefore(h, menu.firstElementChild); menu.insertBefore(g, h); }
    }

    /* ---------- 小功能、今天、小组件、记忆总览 ---------- */
    function regMini() {
        try {
            if (typeof registerMiniFeature !== 'function' || (typeof GY_MINI_FEATURES !== 'undefined' && GY_MINI_FEATURES.some(f => f.id === 'gyHelp'))) return;
            registerMiniFeature({ id: 'gyHelp', icon: '🛟', title: '客服 · 使用指南', desc: '功能在哪、开关怎么开，问它；出了报错、插件冲突它会来提醒你', onOpen: () => window.gyHelpOpen() });
        } catch (e) {}
    }
    function todayHtml() {
        if (!watchOn() && !(D.asked && D.asked[dayKey()])) return '';
        const L = D.issues.filter(i => dayKey(new Date(i.last)) === dayKey()), n = (D.asked && D.asked[dayKey()]) || 0;
        if (!L.length && !n) return '';
        return `<div class="gyt-sec gyh-tsec"><h4>🛟 客服</h4>${L.slice(0, 4).map(i => `<div class="gyt-row click" onclick="gyHelpOpen('issues')"><span class="gyt-t">${i.done ? '✓' : '⚠️'}</span><span class="gyt-x">${esc(i.title)}${i.n > 1 ? `（${i.n} 次）` : ''}</span></div>`).join('')}${n ? `<div class="gyt-row click" onclick="gyHelpOpen('chat')"><span class="gyt-t">💬</span><span class="gyt-x">今天问了客服 ${n} 次</span></div>` : ''}</div>`;
    }
    function hookToday() {
        const f = window.gyTodayRender; if (typeof f !== 'function' || f.__gyHelp) return;
        const w = function () { const r = f.apply(this, arguments); try { ['gyToday', 'gyTodayM'].forEach(id => { const b = document.getElementById(id); if (!b) return; b.querySelectorAll('.gyh-tsec').forEach(n => n.remove()); const h = todayHtml(); if (h) b.insertAdjacentHTML('beforeend', h); }); } catch (e) {} return r; };
        Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__gyHelp = true; window.gyTodayRender = w;
    }
    function regWidget() {
        const W = window.__gyPmW; if (!W || !W.WD) return false; if (W.WD.gyHelp) return true;
        W.WD.gyHelp = { n: '🛟 客服', sizes: ['s', 'm'], tap: () => window.gyHelpOpen(D.issues.some(i => !i.done) ? 'issues' : 'chat'), r(w) {
            const open = D.issues.filter(i => !i.done), last = open[0];
            if (w.size === 'm') return `<div class="gyh-w m"><b>🛟 客服</b>${last ? `<span class="warn">⚠️ ${esc(last.title)}</span><i>${open.length > 1 ? '还有 ' + (open.length - 1) + ' 个问题 · ' : ''}点我看怎么办</i>` : `<span>一切正常</span><i>有什么找不到的，点我问</i>`}</div>`;
            return `<div class="gyh-w s"><b>🛟</b><span>${open.length ? open.length + ' 个问题' : '一切正常'}</span>${D.unread ? '<em>' + D.unread + '</em>' : ''}</div>`;
        } };
        return true;
    }
    function regMem() {
        try {
            if (typeof window.gyMemExAdd !== 'function' || window.__gyHelpMem) return; window.__gyHelpMem = 1;
            window.gyMemExAdd({ k: 'gyHelpIssues', ico: '🛟', n: '客服记下的问题', d: '所有角色共用；能改备注、能删', on: () => D.issues.length > 0, items: () => D.issues, text: x => x.title + (D.notes[x.id] ? '｜' + D.notes[x.id] : ''), edit: (x, v) => { const p = String(v).split('｜'); x.title = (p[0] || x.title).slice(0, 60); D.notes[x.id] = p.slice(1).join('｜').slice(0, 200); if (!D.notes[x.id]) delete D.notes[x.id]; }, del: (c, i) => { const it = D.issues[i]; if (it) { D.issues.splice(i, 1); D.msgs = D.msgs.filter(m => m.iss !== it.id); } }, meta: x => (x.done ? '已解决 · ' : '') + nowStr(x.last), save: saveD });
            window.gyMemExAdd({ k: 'gyHelpChat', ico: '💬', n: '和客服的聊天', d: '所有角色共用；客服只看最近几句', on: () => D.msgs.length > 0, items: () => D.msgs.filter(m => !m.iss), text: m => (m.from === 'me' ? '我：' : '客服：') + m.t, edit: (m, v) => { m.t = String(v).replace(/^(我|客服)：/, ''); }, del: (c, i) => { const it = D.msgs.filter(m => !m.iss)[i]; D.msgs = D.msgs.filter(m => m !== it); }, meta: m => nowStr(m.at), save: saveD });
        } catch (e) {}
    }

    /* ---------- 样式 ---------- */
    const css = document.createElement('style'); css.id = 'gyGuideHelpCss';
    css.textContent = `
.gyg-ov{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:16px}
.gyg-box{background:var(--gy-card,#fff);color:inherit;width:100%;max-width:680px;max-height:92vh;border-radius:20px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.25)}
body.dark-theme .gyg-box{background:#15181c;color:#e7e9ea}
.gyg-hd{display:flex;align-items:center;gap:10px;padding:14px 16px 8px}.gyg-hd b{font-size:17px;flex:1}.gyg-x{cursor:pointer;font-size:18px;opacity:.6;padding:2px 6px}
.gyg-cs{border:1px solid rgba(29,155,240,.4);background:rgba(29,155,240,.08);color:#1d9bf0;border-radius:999px;padding:5px 12px;font-size:13px;cursor:pointer}
#gygQ{margin:0 16px 8px;padding:9px 14px;border-radius:999px;border:1px solid rgba(128,128,128,.25);background:rgba(128,128,128,.07);font-size:14px;color:inherit;outline:none}
.gyg-nav{display:flex;gap:6px;overflow-x:auto;padding:0 16px 8px;flex-shrink:0;scrollbar-width:none}.gyg-nav::-webkit-scrollbar{display:none}
.gyg-nav span{white-space:nowrap;padding:5px 11px;border-radius:999px;background:rgba(128,128,128,.12);font-size:12.5px;cursor:pointer}
.gyg-body{overflow-y:auto;padding:4px 16px 16px;flex:1;min-height:0}
.gyg-sec h3{font-size:16px;margin:16px 0 4px}.gyg-intro{font-size:12.5px;color:#8b98a5;margin:0 0 8px;line-height:1.6}
.gyg-it{border:1px solid rgba(128,128,128,.18);border-radius:14px;padding:10px 12px;margin:8px 0}
.gyg-it.sm{padding:8px 10px;margin:6px 0;background:rgba(128,128,128,.05)}
.gyg-it-hd{display:flex;align-items:center;gap:8px}.gyg-it-hd b{flex:1;font-size:14.5px;font-weight:600;min-width:0}
.gyg-it-hd button{flex-shrink:0;border:none;background:#1d9bf0;color:#fff;border-radius:999px;padding:4px 11px;font-size:12.5px;cursor:pointer}
.gyg-it-d{font-size:13px;line-height:1.65;color:inherit;opacity:.85;margin-top:4px;white-space:pre-line}
.gyg-sws{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}.gyg-swl{font-size:11.5px;color:#8b98a5}
.gyg-sw{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:3px 9px;border-radius:999px;cursor:pointer;border:1px solid rgba(128,128,128,.25);max-width:100%}
.gyg-sw i{width:7px;height:7px;border-radius:50%;background:#aaa;flex-shrink:0}.gyg-sw em{font-style:normal;font-size:11px;opacity:.7}
.gyg-sw.on i{background:#00ba7c}.gyg-sw.on{border-color:rgba(0,186,124,.45)}.gyg-sw.off i{background:#f4212e}.gyg-sw.off{border-color:rgba(244,33,46,.35)}.gyg-sw.na{opacity:.6}
.gyg-foot{font-size:11px;color:#8b98a5;text-align:center;padding:6px 0 10px;flex-shrink:0}
.gyg-empty{text-align:center;color:#8b98a5;font-size:13px;padding:30px 0;line-height:2}.gyg-empty button{border:none;background:#1d9bf0;color:#fff;border-radius:999px;padding:5px 14px;cursor:pointer;margin-left:6px}
.gyg-flash{animation:gygFlash 2.2s ease}@keyframes gygFlash{0%,60%{background:rgba(29,155,240,.18)}100%{background:transparent}}
.gyh-box{height:86vh}.gyh-tabs{display:flex;gap:6px;padding:0 16px 8px}.gyh-tabs span{padding:6px 13px;border-radius:999px;background:rgba(128,128,128,.12);font-size:13px;cursor:pointer}.gyh-tabs span.on{background:#1d9bf0;color:#fff}
.gyh-body{flex:1;overflow-y:auto;padding:6px 14px 10px;min-height:0}
.gyh-m{display:flex;gap:8px;margin:10px 0;align-items:flex-start}.gyh-m.me{justify-content:flex-end}
.gyh-av{width:30px;height:30px;border-radius:50%;background:rgba(29,155,240,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;overflow:hidden}.gyh-av .avatar,.gyh-tav .avatar{width:30px!important;height:30px!important;margin:0!important;font-size:14px}
.gyh-tav{display:inline-flex;width:26px;height:26px;border-radius:50%;overflow:hidden;vertical-align:middle;margin-right:6px;align-items:center;justify-content:center}.gyh-tav .avatar{width:26px!important;height:26px!important}#gyhTitle small{font-size:12px;color:#8b98a5;font-weight:400}
#gyhPopBtn.off,.gyh-pop.off{opacity:.65}.gyh-pop{margin-left:auto;border:1px solid rgba(29,155,240,.4);background:rgba(29,155,240,.08);color:#1d9bf0;border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer;font-family:inherit}
#gyhPopBtn.off{border-color:rgba(128,128,128,.35);background:rgba(128,128,128,.08);color:#8b98a5}
.gyh-how{margin:6px 0 4px;padding-left:20px;font-size:13px;line-height:1.75}.gyh-iss-tip{white-space:normal}
.gyh-cfg{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 16px 0;font-size:12.5px;color:#8b98a5}.gyh-cfg select,.gyh-cust input{border:1px solid rgba(128,128,128,.3);border-radius:8px;padding:4px 8px;background:transparent;color:inherit;font-size:12.5px;font-family:inherit}.gyh-cust{display:flex;flex-wrap:wrap;gap:6px;width:100%}.gyh-cust button{border:none;background:#1d9bf0;color:#fff;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:12.5px}
.gyh-b{max-width:84%;padding:9px 12px;border-radius:16px;font-size:13.5px;line-height:1.65;background:rgba(128,128,128,.1);position:relative;min-width:0;word-break:break-word}
.gyh-m.me .gyh-b{background:#1d9bf0;color:#fff;border-bottom-right-radius:5px}.gyh-m.cs .gyh-b{border-top-left-radius:5px}
.gyh-t{display:block;font-size:10.5px;opacity:.5;margin-top:4px}.gyh-ai{display:block;font-size:10.5px;opacity:.55;font-style:normal;margin-top:4px}
.gyh-refs{margin-top:6px}.gyh-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}.gyh-acts em{font-style:normal;font-size:11.5px;color:#00ba7c}
.gyh-acts button,.gyh-tools button,.gyh-off button{border:1px solid rgba(128,128,128,.3);background:transparent;color:inherit;border-radius:999px;padding:4px 10px;font-size:12px;cursor:pointer}
.gyh-tools{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}.gyh-off{font-size:12.5px;color:#8b98a5;margin:6px 0 10px}
.gyh-iss{border:1px solid rgba(244,33,46,.28);border-radius:14px;padding:10px 12px;margin:8px 0}.gyh-iss.done{border-color:rgba(128,128,128,.2);opacity:.65}
.gyh-iss-hd{display:flex;gap:8px;align-items:baseline}.gyh-iss-hd b{flex:1;font-size:14px;min-width:0}.gyh-iss-hd em{font-style:normal;font-size:11px;color:#8b98a5;flex-shrink:0}
.gyh-iss-tip{font-size:13px;line-height:1.65;margin-top:4px}.gyh-iss-d{font-family:ui-monospace,Menlo,monospace;font-size:11px;opacity:.6;margin-top:6px;word-break:break-all;max-height:4.5em;overflow:hidden}.gyh-iss-n{font-size:12px;margin-top:4px;color:#1d9bf0}
#gyhFoot{flex-shrink:0;padding:0 12px 12px}.gyh-sugg{display:flex;gap:6px;overflow-x:auto;padding:4px 2px 8px;scrollbar-width:none}.gyh-sugg::-webkit-scrollbar{display:none}
.gyh-sugg span{white-space:nowrap;font-size:12px;padding:4px 10px;border-radius:999px;border:1px solid rgba(128,128,128,.25);cursor:pointer}
.gyh-in{display:flex;gap:8px}.gyh-in input{flex:1;min-width:0;padding:10px 14px;border-radius:999px;border:1px solid rgba(128,128,128,.25);background:rgba(128,128,128,.07);color:inherit;font-size:14px;outline:none}
.gyh-in button{border:none;background:#1d9bf0;color:#fff;border-radius:999px;padding:0 16px;font-size:14px;cursor:pointer}
.gyh-dots{display:flex;gap:4px;padding:12px 14px}.gyh-dots i{width:6px;height:6px;border-radius:50%;background:#8b98a5;animation:gyhDot 1s infinite}.gyh-dots i:nth-child(2){animation-delay:.15s}.gyh-dots i:nth-child(3){animation-delay:.3s}
@keyframes gyhDot{0%,80%,100%{opacity:.3}40%{opacity:1}}
.gyh-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#f4212e;margin-left:6px;vertical-align:middle}
.gyh-w{height:100%;display:flex;flex-direction:column;justify-content:center;gap:3px;color:var(--pm-text,inherit);position:relative;min-width:0}
.gyh-w.s{align-items:center;text-align:center}.gyh-w.s b{font-size:28px;font-weight:400}.gyh-w.s span{font-size:11.5px}.gyh-w.s em{position:absolute;top:2px;right:2px;font-style:normal;background:#f4212e;color:#fff;border-radius:999px;font-size:10px;padding:0 5px}
.gyh-w.m{padding:0 6px}.gyh-w.m b{font-size:14px}.gyh-w.m span{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gyh-w.m span.warn{color:#f4212e}.gyh-w.m i{font-style:normal;font-size:11px;color:var(--pm-sub,#8b98a5)}
@media (max-width:600px){.gyg-ov{padding:0;align-items:flex-end}.gyg-box{max-height:94vh;border-radius:20px 20px 0 0}.gyh-box{height:94vh}}
`;
    document.head.appendChild(css);

    /* ---------- 跑起来 ---------- */
    regSwitch();
    hookErrors();
    loadD().then(() => { paintBadge(); });
    let n = 0;
    const t = setInterval(() => {
        n++;
        try { setEntries(); keepTop(); } catch (e) {}
        try { hookApi(); hookFetch(); } catch (e) {}
        try { hookToday(); regMini(); regMem(); regWidget(); regSwitch(); } catch (e) {}
        if (n === 20 || n === 58) checkup(false);
        if (n > 60) { clearInterval(t); setInterval(() => { try { keepTop(); hookApi(); hookFetch(); hookToday(); regWidget(); } catch (e) {} }, 5000); setInterval(() => checkup(false), 30 * 60e3); }
    }, 500);
    window.gyGuideData = () => GUIDE;
    window.gyHelpData = () => D;
})();
