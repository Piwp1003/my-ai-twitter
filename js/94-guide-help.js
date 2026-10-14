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

    const GUIDE_DATE = '2026-10-14';
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
          how: ['设置 → API 与模型 → 向量 API：检查地址、key、向量模型名（默认 text-embedding-3-small）', '没填向量 API 的话，它用的是主 API 的地址——有的服务商不卖向量，那就去记忆总览把向量记忆关掉'], go: ['mem'] },
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
            { id: 'mini', t: '🧩 小功能', d: '左边栏「小功能」。所有玩法的入口，顶上分「全部 / 陪伴 / 一起做 / 回忆 / 生活」。同一类的收进了合集，点进去顶上一排标签。', go: ['view', 'miniHub'], k: '玩法 合集 功能 入口' },
            { id: 'today', t: '📋 今天', d: '电脑上是页面右边那一栏，手机上点「去看看」会打开。今天 TA 做了什么、哪些功能有新动静，都在这里汇总，点一下跳过去。', go: ['today'], k: '右边 动态 汇总' },
            { id: 'memhub', t: '🧠 记忆总览', d: '左边栏「更多」→ 记忆总览。TA 记住的所有东西，每一条都能改、能删。', go: ['mem'], k: '记忆 记住' },
            { id: 'settings', t: '⚙️ 设置', d: '左边栏「设置」。开关、API、外观、备份、小手机模式都在这里；最上面就是这份指南和客服。', go: ['settings'] },
            { id: 'refresh', t: '🔄 刷新', d: '左边栏「更多」→ 🔄 刷新。导入插件或者更新之后点它，不用大退 App。', go: ['refresh'], k: '重启 重新加载' }
        ] },
        { id: 'first', icon: '🚪', title: '第一次用', intro: '按顺序做一遍就能开始。', items: [
            { id: 'api', t: '① 接上 API', d: '设置 → API 与模型：填地址和 key，点「拉取模型」选一个。副 API 填了的话，后台的小事（总结、客服答疑这些）会先用副 API。', go: ['settings', 'api'], k: '接口 key 密钥 模型 中转' },
            { id: 'card', t: '② 导入角色卡', d: '左边栏「角色中心」，顶上有「🖼️ 导入角色卡(图片)」和「📄 导入角色卡(JSON)」；也可以点「+ 创建新角色」自己写。', go: ['chars'], k: '角色卡 导入角色 新建角色 创建角色' },
            { id: 'plugin', t: '③ 装插件', d: '「更多」→ 设定库 → 🔌 插件。只导入「新玩法全家桶.json」这一个就够了：以前的单个插件会自动拿掉，你关掉过的功能也会保持关着，数据都在。', go: ['view', 'plugins'], k: '插件 全家桶 json 导入插件' },
            { id: 'backup', t: '④ 记得备份', d: '设置 → 数据备份与恢复。换手机、清缓存之前一定先导出一份，回来用「📤 导入恢复」。', go: ['settings', 'data'], k: '备份 导出 恢复 换手机 存档 丢' },
            { id: 'move', t: '从别的软件搬过来', d: '数据备份与恢复那一页能导入外部聊天记录（TXT / .jsonl）；预设去「更多」→ 设定库 → 🧩 预设。', go: ['settings', 'data'], k: '酒馆 聊天记录 预设 搬家 jsonl' }
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
            { id: 'red', t: '📕 小红书', d: '小功能 → 📕 小红书：刷笔记、TA 也发笔记、你发的 TA 能认出来、看 TA 偷偷收藏了哪篇。「现实小红书」那一栏能一键跳去真的小红书搜，或者把一篇真笔记的字和链接粘进来——真小红书没法直接刷进谷雨（要登录、防抓取）。', go: ['mini', 'gyxRed'], sw: ['x:gyxRed', 'x:gyxRed.auto'], k: '小红书 笔记 种草 收藏 现实小红书' },
            { id: 'care', t: '🍙 反向养成', d: '在聊天里点一下你自己的头像就能看（双击还是拍一拍）。你的饱腹、心情、精力、清洁会慢慢掉；聊天里说「吃了饭」「洗完澡」会自动记，太低了 TA 来管你。', go: ['mini', 'gyxCare'], sw: ['x:gyxCare'], k: '养成 吃饭 睡觉 洗澡 照顾' },
            { id: 'callplus', t: '📞 来电增强', d: '拒接时挑个理由；太久没说话 TA 打来问；没接 TA 留语音留言；每通电话留一行小结。', go: ['mini', 'gyxCallPlus'], sw: ['x:gyxCallPlus'], k: '电话 拒接 留言 语音信箱 查岗' },
            { id: 'sched', t: '🗓️ TA 的日程', d: '「日程每天自动更新」默认关着，不开就不会自动写。打开后从第二天起每天续一份；打开那一刻不会把所有人一口气补一遍，几天没上线回来也只写今天那份。想马上补齐：记忆总览里点「🗓️ 一键补齐今天的日程」，或者「今天」面板里提示谁的日程停在之前，旁边点「补齐」。', go: ['mem'], sw: ['c:scheduleAutoRenew'], k: '日程 补齐 自动更新 过期 一口气 没上线 状态' },
            { id: 'todayp', t: '📋 今天', d: '今天 TA 做了什么、写了什么，都在这里汇总，点一下直接跳过去。', go: ['today'] },
            { id: 'notif', t: '🔔 通知', d: '左边栏「通知」。TA 来消息、写了信、有新成就都在这儿，点了直接打开那一封信 / 那个页面。', go: ['view', 'notifications'], k: '通知 消息' },
            { id: 'push', t: '推送到手机', d: '设置 → 通知与云端。', go: ['settings', 'notify'], k: '推送 系统通知 云端' },
            { id: 'quiet', t: '想让 TA 安静一点', d: '不用一个个关：去插件开关中心，把「TA 会自己做」关掉就行，你自己照样能用。', go: ['gyx'], k: '太主动 太吵 打扰 安静' }
        ] },
        { id: 'map', icon: '🗺️', title: '小功能地图', intro: '小功能首页一共二十几个入口，大多是合集：点进去是一整页，顶上一排标签，一个标签一个功能。下面先是合集，再是几个单独的。', items: [
            { id: 'h_together', t: '🎧 一起听 · 看 · 读', d: '音乐盒、一起听一起看、一起看电影、一起阅读、📺 直播间（TA 开直播，你发弹幕送礼物）。', go: ['mini', 'hub_together'], sw: ['x:gyxWebInvite', 'c:filmScene', 'x:gyxLive'], k: '音乐 电影 视频 阅读 看书 直播 弹幕' },
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
            { id: 'h_people', t: '👥 TA 身边的人', d: '日常、关系网、世界里的人、📰 营销号自己爆料、⏰ 准点群聊。', go: ['mini', 'hub_people'], k: '日常 关系网 NPC 路人 身边的人' },
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
            { id: 'pmon', t: '打开小手机模式', d: '设置 → 小手机模式（跟微信模式二选一）。打开后整个谷雨变成一台手机，桌面上是图标和小组件。', go: ['settings'], k: '手机模式 小手机 微信模式' },
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
            { id: 'gen', t: '⏳ 生成中提示 / 停止生成', d: '模型在写东西时，屏幕下面浮出一个小条「正在生成 · 几秒」，写完自己收回；点 ■ 停止就马上停下（那一段不要了，不会再弹报错框）。小手机模式里显示在顶上的流体云（灵动岛）里，岛上也能点停止。默认只提示你点出来的，后台自己跑的也想看就改成「都提示」。开关在 设置 → 🧰 功能设置 → 🎛️ 开关和后台 → 生成中提示。打包的 App 里没法从中间掐断请求，点停止只是把界面停下、结果扔掉。', go: ['mini', 'gyxGen'], sw: ['x:gyxGen'], k: '生成中 正在生成 停止 停止生成 卡住 等很久 转圈 灵动岛 流体云' },
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
            { id: 'imp', t: '导入插件', d: '「更多」→ 📖 设定库 → 🔌 插件。只导入「新玩法全家桶.json」这一个，里面已经包含了所有插件。电脑里以前的单个 .json 可以自己删掉了。', go: ['view', 'plugins'], k: '插件 导入 全家桶' },
            { id: 'plgupd', t: '🔄 插件自动检查更新', d: '网页托管（比如 GitHub Pages）更新了，已经导入的插件不会自己变——插件存在每台设备的浏览器里。现在打开网页几秒后会自动去网站上看一眼，有新版就问你要不要更新（你的开关和数据都不动），更新完刷新一次。插件页最上面也能手动点「🔄 检查插件更新」、关掉自动检查。双击 index.html 打开的不检查，导入一次就行。', go: ['view', 'plugins'], k: '插件更新 插件怎么更新 新版本 自动更新 插件没变 旧版 换设备' },
            { id: 'pages', t: '🌐 传到 GitHub 后网页不更新', d: '先看仓库的 Actions 页：红叉＝网站没发布成功。最常见是说明文档里的 {{宏}} 让 GitHub Pages 编译失败——仓库根目录要有一个 .nojekyll 文件（「上传到GitHub.bat」会自动补上）。绿勾了还是旧的：刷新一次，看设置页最底下的版本号；插件要靠上面的「检查插件更新」。', k: '网页 不更新 网页更新了没变 没变 还是旧的 托管 github pages 部署 版本 旧版本 上传' },
            { id: 'refresh2', t: '导入后要刷新', d: '「更多」→ 🔄 刷新，不用大退。', go: ['refresh'] },
            { id: 'each', t: '合并版里的功能还能单独关', d: '去插件开关中心，每一个都有自己的开关。', go: ['gyx'] },
            { id: 'gone', t: '已经拿掉的', d: '📺 追剧进度、🔐 我们的暗号，这两个不要了（数据没删）。' }
        ] },
        { id: 'apis', icon: '🔑', title: 'API 都花在哪', intro: '谷雨能填四类接口：主 API、副 API、向量 API、语音 / 生图各自的接口。没填的会自动退回主 API（语音和生图除外，它们有免费的退路）。下面写清楚每样东西用的是哪一个。', items: [
            { id: 'api_kind', t: '四类接口分别是什么', d: '① 主 API：好模型，写你会逐字读的东西。② 副 API（选填）：便宜模型，干后台杂活；地址、密钥、模型三样没填全就全部退回主 API。③ 向量 API（选填）：只做 embedding（向量记忆、资料库），没填用主 API 的地址，不会去碰副 API。④ 语音 / 生图：在各自的设置里填，跟上面三个无关。都在设置 → API 与模型，页面最下面「📋 主 API / 副 API / 其它接口 分别负责哪些功能」点开就是全表。', go: ['settings', 'api'], k: 'api 接口 分工 主api 副api 向量 区别 哪个' },
            { id: 'api_main', t: '走主 API 的', d: '私聊回复、群聊回复、重新生成 / 侧滑抽卡、自定义回复、进群打招呼；进聊天时刷新「此刻状态」、戳一戳、TA 主动找你；日记、写信、回信、看你日记写反应；故事章节、从素材生成小说、续写工作台（你在那一次里选了「用副 API」除外）；推文 / 小剧场 / 日程的记忆总结、TA 不在线时「瞄一眼」；角色资料自动补全、导入角色卡时识图拆分；联网探索的总结；📞 通话里 TA 说的每一句。', go: ['settings', 'api'], k: '主api 主 api 聊天 回复 花钱 哪些' },
            { id: 'api_sub', t: '走副 API 的（没填副 API 就用主 API）', d: '推文评论、NPC 路人、论坛跟帖、营销号、八卦、Ta们在做什么；私聊 / 群聊的聊天自动总结；日程生成和「此刻在做什么」流动、待办；小功能里的一起读 / 看 / 听、行程天气播报、约出去、关系、生活、商城、外卖、钱包、快递、TA 的手机、换装、冷战、通话里 TA 接不接 / 要不要打给你；所有小游戏（五子棋到狼人杀）；自主行动的「决定做什么」；客服答疑；所有新玩法插件（谁是真的 TA、剧本杀、海龟汤、恋综、时间循环、秘密计划、被你影响、营销号自己爆料、微博热搜榜起标题、小红书、TA 被困了、准点群聊、旧物箱、窗台来客、心电感应光谱、录像带……插件里的模型调用一律副优先；打了又删、让 TA 重说了基本不多花钱）。', go: ['settings', 'api'], k: '副api 副 api 便宜 后台 插件 游戏 杂活' },
            { id: 'api_vis', t: '要模型「看图」的', d: '📮 现实小任务交差、📸 同一秒你拍的照片（副 API，模型得支持识图，不支持就照样夸你）、导入角色卡时识图拆分（主 API）、聊天里发图给 TA 看（跟聊天同一个，主 API）。', go: ['mini', 'gyxMis'], k: '识图 看图 多模态 图片 vision' },
            { id: 'api_img', t: '生图', d: '角色发图、TA 自拍、TA 的相册、情侣头像：按「角色发图」的设置——图库 / 搜图不花钱；调接口生图用你填的画图接口（/images/generations），没填可以用免费的 pollinations。', go: ['mini', 'gyxAlbum'], k: '生图 画图 发图 自拍 图片 接口 pollinations' },
            { id: 'api_tts', t: '语音', d: 'TA 的声音（朗读、语音条、通话、听取模式、陪你散步念出来）：按「TA 的声音」里选的服务——OpenAI 兼容 / MiniMax / Fish Audio / 火山引擎；浏览器自带朗读不花钱。你发语音转文字：SiliconFlow 等转写接口，或者浏览器自带识别。', go: ['mini', 'voice'], k: '语音 tts 朗读 声音 转文字 收费' },
            { id: 'api_net', t: '不用模型、但要联网的', d: '天气（Open-Meteo，免费）；联网探索（jina 阅读、DuckDuckGo、维基，经公共 CORS 代理）；在线找书 / 歌（Gutendex、维基文库、Internet Archive、iTunes 搜索）；🔥 真实热搜（三个公开热榜接口，可以自己换）；插件自动检查更新（读你自己的网站）；云端推送（你部署的 Cloudflare Worker）；从 GitHub 导入世界书。', go: ['mini', 'web_explore'], k: '联网 天气 热搜 免费 网络 代理 外部' },
            { id: 'api_zero', t: '完全不调 API 的', d: '🔁 我们的小习惯（本地认）、计步、📍 捉迷藏的冷热、🃏 命运卡牌的数值和结局、🗝️ 密室的密码和线索、🕯️ 环境音、📤 角标和卡片、身上的状态累积、日程「一键补齐」以外的日程判断、使用指南和客服在指南里查得到的回答、所有开关和记忆总览。', go: ['settings', 'auto'], k: '不花钱 免费 不调用 本地' },
            { id: 'api_save', t: '想省钱', d: '填一个便宜的副 API，杂活和插件就不占主 API；全部开关里每一项都写了「费用」，用不上的关掉；插件开关中心可以只关「TA 会自己做」；🔋 省电模式；设置页最上面「📊 Token 用量」能看每个功能各花了多少。', go: ['settings', 'auto'], k: '省钱 太贵 token 用量 花了多少 费用' }
        ] },
        { id: 'errs', icon: '🧯', title: '报错是什么意思', intro: '客服弹出来的每一种报错，在这里都有大白话解释和一步步怎么做。客服窗口「发现的问题 → 📖 报错词典」也是这一份。', items: ERRS.map(e => ({ id: e.id, t: e.ico + ' ' + e.n, d: e.what + ' 怎么办：' + e.how.map((h, i) => '①②③④⑤'[i] + h).join(' '), go: e.go, k: '报错 错误 怎么办 ' + e.n + ' ' + (e.k || '') + ' ' + e.re.source.replace(/[\\^$()?|.*+\[\]{}]/g, ' ').replace(/\b[a-z]\b/g, '').slice(0, 160) })) },
        { id: 'help', icon: '🔍', title: '找不到的时候', items: [
            { id: 's1', t: '先搜开关', d: '设置 → 全部开关，顶上有搜索框。每个开关下面都写了「在哪里看效果」。', go: ['settings', 'auto'] },
            { id: 's2', t: '问客服', d: '直接问它「XX 在哪」「XX 怎么开」，它会给你按钮直接跳过去；有报错它也会来提醒你。', go: ['help'], k: '客服 帮助' },
            { id: 'cs_pop', t: '🔔 客服弹不弹窗', d: '客服窗口里「🔔 弹窗提醒：开 / 关」（问客服页底部、发现的问题页顶部），全部开关里也有「客服：有新问题时弹窗提醒」。关掉后问题照样记，入口上有红点。', go: ['help'], sw: ['c:helpPop'], k: '客服 弹窗 通知 太吵 关掉提醒 不弹' },
            { id: 'cs_who', t: '🎭 换客服的人设', d: '客服窗口底部「谁来回答」：🛟 客服（默认）/ 你的任意一个角色 / ✏️ 自己写一个（名字、头像、性格）。换成角色后用 TA 的语气回答，内容还是只按使用指南。', go: ['help'], k: '客服 人设 换人 角色 语气 自定义' },
            { id: 'f1', t: '更新了但没变化', d: '刷新两次：第一次下载新版，第二次才用上。', go: ['refresh'], k: '更新 没变 没生效 更新了没反应 更新没反应 旧的 还是旧版' },
            { id: 'f2', t: '导入插件后没出现', d: '「更多」→ 🔄 刷新。', go: ['refresh'], k: '插件 没出现 没有' },
            { id: 'f3', t: '合集里少了一个标签', d: '那个功能在插件开关中心被关了（「用」关着）。', go: ['gyx'], k: '少了 不见了 消失 标签' },
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
        help: tab => window.gyHelpOpen(tab)
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
.gyg-it-d{font-size:13px;line-height:1.65;color:inherit;opacity:.85;margin-top:4px}
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
