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
            { id: 'game', t: '🎮 小游戏', d: '聊天输入框上方。一起玩、文字冒险、寻宝、帮我选、🎲 跑团、🎣 一起钓鱼都收在这里。', go: ['view', 'chat'], sw: ['x:gyxGame', 'x:gyxTrpg', 'x:gyxFish'], k: '游戏 冒险 寻宝 帮我选 跑团 钓鱼' },
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
            { id: 'care', t: '🍙 反向养成', d: '你的饱腹、心情、精力、清洁会慢慢掉；聊天里说「吃了饭」「洗完澡」会自动记，太低了 TA 来管你。', go: ['mini', 'gyxCare'], sw: ['x:gyxCare'], k: '养成 吃饭 睡觉 洗澡 照顾' },
            { id: 'callplus', t: '📞 来电增强', d: '拒接时挑个理由；太久没说话 TA 打来问；没接 TA 留语音留言；每通电话留一行小结。', go: ['mini', 'gyxCallPlus'], sw: ['x:gyxCallPlus'], k: '电话 拒接 留言 语音信箱 查岗' },
            { id: 'todayp', t: '📋 今天', d: '今天 TA 做了什么、写了什么，都在这里汇总，点一下直接跳过去。', go: ['today'] },
            { id: 'notif', t: '🔔 通知', d: '左边栏「通知」。TA 来消息、写了信、有新成就都在这儿，点了直接打开那一封信 / 那个页面。', go: ['view', 'notifications'], k: '通知 消息' },
            { id: 'push', t: '推送到手机', d: '设置 → 通知与云端。', go: ['settings', 'notify'], k: '推送 系统通知 云端' },
            { id: 'quiet', t: '想让 TA 安静一点', d: '不用一个个关：去插件开关中心，把「TA 会自己做」关掉就行，你自己照样能用。', go: ['gyx'], k: '太主动 太吵 打扰 安静' }
        ] },
        { id: 'map', icon: '🗺️', title: '小功能地图', intro: '小功能首页一共二十几个入口，大多是合集：点进去是一整页，顶上一排标签，一个标签一个功能。下面先是合集，再是几个单独的。', items: [
            { id: 'h_together', t: '🎧 一起听 · 看 · 读', d: '音乐盒、一起听一起看、一起看电影、一起阅读、📺 直播间（TA 开直播，你发弹幕送礼物）。', go: ['mini', 'hub_together'], sw: ['x:gyxWebInvite', 'c:filmScene', 'x:gyxLive'], k: '音乐 电影 视频 阅读 看书 直播 弹幕' },
            { id: 'h_rel', t: '💞 我们的关系', d: '关系账本、两层好感、📊 关系四条线（信任 / 亲密 / 安心 / 尊重）、等级、成就、🎯 反向攻略（TA 来追你）。', go: ['mini', 'hub_rel'], sw: ['c:relLedger', 'x:gyxDual', 'x:gyxAxes', 'x:gyxLevel', 'x:gyxBadge', 'x:gyxWoo'], k: '好感 关系 账本 等级 成就 四条线 信任 亲密 安心 尊重 攻略 追' },
            { id: 'h_recap', t: '📚 回顾', d: '📒 手帐时间线（日 / 周 / 月手帐，能贴贴纸）、我们的书、星图、周报、回忆放映、TA 眼中的你、时光机、🕹️ 记忆潜行（像素小游戏）；多久总结一次你来定。', go: ['mini', 'hub_recap'], sw: ['x:gyxHandbook', 'x:gyxOurBook', 'x:gyxWeekly', 'x:gyxDive'], k: '回忆 周报 总结 星图 时光机 手帐 日历 记忆潜行 像素' },
            { id: 'h_promise', t: '🤙 我们的约定', d: '小约定、兑换券、恋爱审批、愿望清单、一百件小事。', go: ['mini', 'hub_promise'], sw: ['x:gyxPromise', 'x:gyxCoupon', 'x:gyxWish'], k: '约定 兑换券 愿望 审批' },
            { id: 'h_night', t: '🌙 早安晚安', d: '早安简报、叫醒和哄睡、熬夜管家、睡前三件好事、深夜电台。', go: ['mini', 'hub_night'], sw: ['x:gyxBrief', 'x:gyxWake', 'x:gyxNight', 'x:gyxRadio'], k: '早安 晚安 叫醒 哄睡 熬夜 电台' },
            { id: 'h_qa', t: '💬 问答', d: '每日一问、默契问答、调查问卷、提问箱。', go: ['mini', 'hub_qa'], sw: ['x:gyxDaily', 'x:gyxQuiz', 'x:gyxAskBox'], k: '问答 默契 问卷 提问' },
            { id: 'h_letters', t: '💌 信', d: '信件与日记、拆信、交换日记本、时间胶囊、明信片、漂流瓶。', go: ['mini', 'hub_letters'], sw: ['x:gyxLetter', 'x:gyxCapsule', 'x:gyxBottle'], k: '信 日记 胶囊 明信片 漂流瓶' },
            { id: 'h_home', t: '🏠 我们的小屋', d: '小屋、随机掉落的收藏、一起养的小生命（能自己加种类）、存钱罐。', go: ['mini', 'hub_home'], sw: ['x:gyxHome', 'x:gyxDrop', 'x:gyxGrow', 'x:gyxJar'], k: '小屋 收藏 养 宠物 存钱 种类' },
            { id: 'h_voice', t: '🗣️ TA 怎么说话', d: '相处模式、风格调料、平视、口头禅、🎬 听取模式（像 galgame 一样一句句听 TA 说）。', go: ['mini', 'hub_voice'], sw: ['x:gyxBond', 'x:gyxSpice', 'x:gyxFair', 'x:gyxEcho', 'x:gyxListen'], k: '语气 口癖 口头禅 风格 人设 平视 听取 配音 立绘 galgame' },
            { id: 'h_comfort', t: '🫂 哄', d: '你不开心（抱抱）、TA 不开心（轮到你哄）、吵架了、秘密树洞。', go: ['mini', 'hub_comfort'], sw: ['x:gyxHug', 'x:gyxCoax', 'x:gyxMakeup', 'x:gyxSecret'], k: '哄 抱抱 吵架 不开心 树洞' },
            { id: 'h_with', t: '🚶 陪你', d: '散步、做饭、自习、运动、旅行、🍙 反向养成（TA 养你：饱腹 / 心情 / 精力 / 清洁）。', go: ['mini', 'hub_with'], sw: ['x:gyxWalk', 'x:gyxCook', 'x:gyxStudy', 'x:gyxCoach', 'x:gyxTrip', 'x:gyxCare'], k: '散步 做饭 自习 运动 旅行 私教 养成 饱腹 吃饭' },
            { id: 'h_touch', t: '💓 贴贴', d: '听心跳、摇一摇贴贴。', go: ['mini', 'hub_touch'], sw: ['x:gyxBeat', 'x:gyxShake'], k: '心跳 摇一摇 贴贴' },
            { id: 'h_unsaid', t: '🤐 TA 没说出口的', d: '心声、思维链收纳盒、草稿箱、🌈 情绪皮肤（TA 的心情改变聊天界面）。', go: ['mini', 'hub_unsaid'], sw: ['x:gyxDraft', 'x:gyxMoodSkin'], k: '心声 思维链 草稿 情绪 皮肤 心情' },
            { id: 'h_phone', t: '📱 小手机', d: 'TA 的手机、备忘录、🧩 AI 小程序、来电画面和铃声、📞 来电增强（拒接理由 / 查岗电话 / 语音留言 / 通话小结）、桌面小组件、桌面上的 TA。', go: ['mini', 'hub_phone'], sw: ['x:gyxMemo', 'x:gyxApps', 'x:gyxRing', 'x:gyxCallPlus', 'x:gyxPhoneW', 'x:gyxPet'], k: 'TA的手机 备忘录 来电 铃声 小程序 App 语音留言 拒接' },
            { id: 'h_life', t: '🧺 生活', d: '行程与天气（还有 🌏 两地）、随身物、商城、🛍️ 装扮商店（头像框 / 聊天背景 / 气泡套装）、经期记录、心情手账、生活小档案（她的真实情况）。', go: ['mini', 'hub_life'], sw: ['x:gyxShop', 'x:gyxNotes'], k: '行程 天气 两地 随身物 商城 装扮 头像框 经期 心情手账 档案' },
            { id: 'h_people', t: '👥 TA 身边的人', d: '日常、关系网、世界里的人。', go: ['mini', 'hub_people'], k: '日常 关系网 NPC 路人 身边的人' },
            { id: 'h_gift', t: '🎁 TA 给你的', d: 'TA 的梦、写给你的歌、留声机、涂鸦互传、占卜。', go: ['mini', 'hub_gift'], sw: ['x:gyxDream', 'x:gyxSong', 'x:gyxTape', 'x:gyxDoodle', 'x:gyxMystic'], k: '梦 歌 磁带 留声机 涂鸦 占卜 塔罗' },
            { id: 'h_alt', t: '🪐 换个世界玩', d: '平行世界、换个世界、互换身份一天、番外隔离。', go: ['mini', 'hub_alt'], sw: ['x:gyxWorld', 'x:gyxTheater', 'x:gyxSwap', 'x:gyxSide'], k: '平行世界 换个世界 互换身份 番外 如果' },
            { id: 'h_chat', t: '💭 聊天细节', d: '时间感知、内置提示词、总结滚雪球、外语和翻译、气泡表情回应。', go: ['mini', 'hub_chat'], sw: ['x:gyxRoll', 'x:gyxLang', 'x:gyxReact'], k: '时间感知 提示词 滚雪球 外语 翻译 表情回应' },
            { id: 'h_world', t: '🌐 外面的世界', d: '此刻（所有人现在在做什么）、联网探索、🔥 真实热搜。', go: ['mini', 'hub_world'], sw: ['c:webExplore', 'x:gyxHot'], k: '此刻 联网 探索 热搜 微博 新闻' },
            { id: 'h_look', t: '🎨 美化（在设置里）', d: '🫧 气泡工坊、🎨 导入酒馆主题、🌗 日夜主题和动态壁纸、👉 跟手返回。在 设置 → 🧰 功能设置。', go: ['mini', 'hub_look'], sw: ['x:gyxBubble', 'x:gyxStTheme', 'x:gyxDayNight', 'x:gyxSwipe'], k: '美化 气泡 主题 酒馆 深色 夜间 壁纸 动态 返回 滑动' },
            { id: 'h_set', t: '🎛️ 开关和后台（在设置里）', d: '全部开关、插件开关中心、省电模式、文案不重样。在 设置 → 🧰 功能设置。', go: ['mini', 'hub_set'] },
            { id: 'gallery', t: '🖼️ 相册', d: '表情包、角色照片、合照、情侣头像、TA 的相册（生活碎片和 🤳 自拍）。', go: ['mini', 'gallery'], sw: ['x:gyxAlbum', 'x:gyxMeme', 'x:gyxDuo', 'x:gyxAvatar'], k: '图库 表情包 照片 合照 头像 图片 自拍' },
            { id: 'days', t: '📅 我们的日子', d: '纪念日、生日、🏮 一起过节（农历节日自动算：春节、元宵、端午、七夕、中秋、重阳、腊八，当天有节日卡和小活动）。', go: ['mini', 'days'], sw: ['c:charOwnDays', 'x:gyxAnniv', 'x:gyxBday', 'x:gyxFest'], k: '纪念日 生日 日子 节日 过节 过中秋 过年 春节 中秋 七夕 端午 元宵 重阳 腊八 农历' },
            { id: 'games', t: '🎮 聊天里的游戏', d: '聊天输入框上面的 🎮：一起玩、文字冒险、寻宝、帮我选、🎲 跑团、🎣 一起钓鱼。', go: ['view', 'chat'], sw: ['x:gyxGame', 'x:gyxTrpg', 'x:gyxFish'], k: '游戏 冒险 寻宝 跑团 骰子 钓鱼 图鉴' },
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
            { id: 'widget', t: '小组件', d: '长按桌面进编辑，加小组件。每个新功能都有自己的小组件。', go: ['phone'], sw: ['x:gyxPhoneW'], k: '小组件 桌面 组件' },
            { id: 'taphone', t: 'TA 的手机', d: '翻 TA 的聊天、相册、备忘录：小功能 → 📱 小手机。', go: ['mini', 'hub_phone'] }
        ] },
        { id: 'switch', icon: '🎛️', title: '开关和设置', intro: '开关有两处：谷雨自带的在「全部开关」，插件带来的在「插件开关中心」。', items: [
            { id: 'allsw', t: '🎛️ 全部开关', d: '设置 → 全部开关。谷雨自带的所有自动功能一页看完，能搜、能一键预设。', go: ['settings', 'auto'], k: '开关 全部开关 搜开关' },
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
            { id: 'imp', t: '导入 / 更新插件', d: '「更多」→ 📖 设定库 → 🔌 插件。只导入「新玩法全家桶.json」这一个，里面已经包含了所有插件（原来 82 个合成了 32 个）。电脑里以前的单个 .json 可以自己删掉了。', go: ['view', 'plugins'], k: '插件 导入 更新 全家桶' },
            { id: 'refresh2', t: '导入后要刷新', d: '「更多」→ 🔄 刷新，不用大退。', go: ['refresh'] },
            { id: 'each', t: '合并版里的功能还能单独关', d: '去插件开关中心，每一个都有自己的开关。', go: ['gyx'] },
            { id: 'gone', t: '已经拿掉的', d: '📺 追剧进度、🔐 我们的暗号，这两个不要了（数据没删）。' }
        ] },
        { id: 'help', icon: '🔍', title: '找不到的时候', items: [
            { id: 's1', t: '先搜开关', d: '设置 → 全部开关，顶上有搜索框。每个开关下面都写了「在哪里看效果」。', go: ['settings', 'auto'] },
            { id: 's2', t: '问客服', d: '直接问它「XX 在哪」「XX 怎么开」，它会给你按钮直接跳过去；有报错它也会来提醒你。', go: ['help'], k: '客服 帮助' },
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

    // 开关（全部开关里）
    function regSwitch() {
        try {
            if (typeof AUTO_FEATURE_GROUPS !== 'undefined' && !AUTO_FEATURE_GROUPS.some(g => g.key === '客服'))
                AUTO_FEATURE_GROUPS.push({ key: '客服', icon: '🛟', title: '客服', note: '问项目里的事、出了问题来提醒你。' });
            if (typeof AUTO_FEATURE_DEFS === 'undefined') return;
            if (!AUTO_FEATURE_DEFS.some(f => f.key === 'helpWatch'))
                AUTO_FEATURE_DEFS.push({ key: 'helpWatch', label: '客服：盯着报错和插件冲突', group: '客服', desc: '页面报错、插件出错、接口报错、插件重复 / 新旧版同时装着、存储快满……发现了就在客服窗口里记一条，告诉你是哪里、怎么办，再发一条通知。每出一次就提醒一次，不限次数。关掉就不记也不提醒。', cost: '不调用 API', where: '设置 → 🛟 客服 →「发现的问题」' });
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
                D.msgs.push({ id: mid(), at: now, from: 'cs', iss: it.id, t: `${pick(it.n > 1 ? NOTE_LINES.again : NOTE_LINES.open)}${it.n > 1 ? '：' : ''}\n**${it.title}**\n${it.tip}` });
                D.unread = (D.unread || 0) + 1;
                notify(it);
            }
            await saveD(); paintHelp(); paintBadge();
        } catch (e) {}
    }
    function notify(it) {
        try {
            const head = pick(['🛟 客服：', '🛟 客服提醒：', '🛟 ']) + it.title;
            if (typeof window.gyNotifyJump === 'function') window.gyNotifyJump(null, head, it.tip.slice(0, 80), { fn: 'gyHelpOpen', args: ['issues'] });
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
    // 接口报错：在 83 的那层外面再套一层，只记不弹（弹窗 83 / 聊天页自己会弹）
    function hookApi() {
        ['callChatCompletionAPI', 'sendChatRequest'].forEach(name => {
            const orig = window[name]; if (typeof orig !== 'function' || orig.__gyHelp) return;
            const w = async function () {
                const r = await orig.apply(this, arguments);
                try {
                    if (r && typeof r === 'object' && r.error && !r.aborted && !r.__gyHelpSeen) {
                        try { Object.defineProperty(r, '__gyHelpSeen', { value: true }); } catch (e) {}
                        const raw = String(r.error.message || r.error.type || r.error).slice(0, 200);
                        if (!/abort/i.test(raw)) {
                            const c = typeof window.gyClassifyApiError === 'function' ? window.gyClassifyApiError(raw) : null;
                            report({ kind: 'api', src: c ? c.n : '', title: '接口报错' + (c ? '：' + c.n : ''), detail: raw, tip: c ? c.tip : '模型接口回了错误。看一眼 API 设置里的地址、key、模型名；过一会儿再试试。', acts: [['🌟 API 设置', 'settings', 'api']] });
                        }
                    }
                } catch (e) {}
                return r;
            };
            Object.keys(orig).forEach(k => { try { w[k] = orig[k]; } catch (e) {} }); w.__gyHelp = true; w.__gyErrNotice = orig.__gyErrNotice; w.__gyCare = orig.__gyCare; w.__gyOrig = orig;
            window[name] = w; try { if (name === 'callChatCompletionAPI') callChatCompletionAPI = w; else sendChatRequest = w; } catch (e) {}
        });
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
回答用简短的中文，口语，像贴心的客服，2~5 句话，不要用 markdown 标题。
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
        return `<div class="gyh-m cs"><span class="gyh-av">🛟</span><div class="gyh-b">${mdLite(m.t)}${refs.length ? `<div class="gyh-refs">${refs.map(r => itemCard(r, true)).join('')}</div>` : ''}${it ? `<div class="gyh-acts">${actBtns(it.acts)}<button type="button" onclick="gyHelpCopy('${it.id}')">📋 复制报错</button>${it.done ? '<em>已解决</em>' : `<button type="button" onclick="gyHelpDone('${it.id}')">✓ 解决了</button>`}</div>` : ''}${m.ai ? '<i class="gyh-ai">由模型根据指南回答</i>' : ''}<span class="gyh-t">${nowStr(m.at)}</span></div></div>`;
    }
    function issueHtml(i) {
        return `<div class="gyh-iss${i.done ? ' done' : ''}"><div class="gyh-iss-hd"><b>${esc(i.title)}</b><em>${i.n > 1 ? i.n + ' 次 · ' : ''}${nowStr(i.last)}</em></div><div class="gyh-iss-tip">${esc(i.tip)}</div>${i.detail ? `<div class="gyh-iss-d">${esc(i.detail)}</div>` : ''}${D.notes[i.id] ? `<div class="gyh-iss-n">📝 ${esc(D.notes[i.id])}</div>` : ''}<div class="gyh-acts">${actBtns(i.acts)}<button type="button" onclick="gyHelpCopy('${i.id}')">📋 复制报错</button>${i.done ? `<button type="button" onclick="gyHelpDone('${i.id}',1)">↩ 没解决</button>` : `<button type="button" onclick="gyHelpDone('${i.id}')">✓ 解决了</button>`}<button type="button" onclick="gyHelpDel('${i.id}')">🗑️</button></div></div>`;
    }
    const SUGG = ['怎么换皮肤', 'TA 怎么不主动找我', '回复太长了', '记账在哪', '热搜在哪', '钓鱼在哪', '怎么过中秋', '小程序写不完', '最近有报错吗', '插件导入了没反应'];
    window.gyHelpOpen = function (tab) {
        if (tab) TAB = tab;
        let ov = document.getElementById('gyHelpOv');
        if (!ov) {
            ov = document.createElement('div'); ov.id = 'gyHelpOv'; ov.className = 'gyg-ov'; ov.setAttribute('data-gy-overlay', '1'); ov.setAttribute('data-gy-page', '1');
            ov.innerHTML = `<div class="gyg-box gyh-box"><div class="gyg-hd"><b>🛟 客服</b><button type="button" class="gyg-cs" onclick="gyGuideOpen()">📘 指南</button><span class="gyg-x" onclick="document.getElementById('gyHelpOv').remove()">✕</span></div>
                <div class="gyh-tabs"><span data-t="chat" onclick="gyHelpOpen('chat')">💬 问客服</span><span data-t="issues" onclick="gyHelpOpen('issues')">🧰 发现的问题</span></div>
                <div class="gyh-body" id="gyhBody"></div><div id="gyhFoot"></div></div>`;
            ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
            document.body.appendChild(ov);
        }
        if (D.unread) { D.unread = 0; saveD(); paintBadge(); }
        if (!ready) loadD().then(() => paintHelp()); else paintHelp();
    };
    function paintHelp(thinking) {
        const ov = document.getElementById('gyHelpOv'); if (!ov) return;
        ov.querySelectorAll('.gyh-tabs span').forEach(s => s.classList.toggle('on', s.dataset.t === TAB));
        const open = D.issues.filter(i => !i.done).length;
        const t2 = ov.querySelector('.gyh-tabs span[data-t="issues"]'); if (t2) t2.textContent = '🧰 发现的问题' + (open ? `（${open}）` : '');
        const b = document.getElementById('gyhBody'), f = document.getElementById('gyhFoot');
        if (TAB === 'issues') {
            b.innerHTML = `<div class="gyh-tools"><button type="button" onclick="gyHelpCheck()">🩺 现在体检一下</button><button type="button" onclick="gyHelpCopy()">📋 复制诊断信息</button>${D.issues.some(i => i.done) ? '<button type="button" onclick="gyHelpClearDone()">清掉已解决的</button>' : ''}</div>
                ${!watchOn() ? `<div class="gyh-off">「客服：盯着报错和插件冲突」关着，新问题不会记。<button type="button" onclick="gyHelpAct(['sw','客服：盯着报错'])">去打开 ›</button></div>` : ''}
                ${D.issues.length ? D.issues.map(issueHtml).join('') : '<div class="gyg-empty">还没发现过问题 🌱</div>'}`;
            f.innerHTML = '';
            return;
        }
        const M = D.msgs.length ? D.msgs : [{ from: 'cs', at: Date.now(), t: pick(['你好呀，我是谷雨的客服。功能在哪、开关怎么开、为什么没反应，都可以问我。', '有什么找不到的、不明白的，直接问我就好。', '我是客服～问我功能在哪、怎么开，或者让我看看最近有没有报错。']) }];
        b.innerHTML = M.slice(-60).map(msgHtml).join('') + (thinking || busy ? '<div class="gyh-m cs"><span class="gyh-av">🛟</span><div class="gyh-b gyh-dots"><i></i><i></i><i></i></div></div>' : '');
        f.innerHTML = `<div class="gyh-sugg">${SUGG.map(s => `<span onclick="gyHelpAsk('${s}')">${s}</span>`).join('')}</div><div class="gyh-in"><input id="gyhIn" placeholder="问点什么……" onkeydown="if(event.key==='Enter'&&!event.isComposing)gyHelpAsk()"><button type="button" onclick="gyHelpAsk()">发送</button></div>`;
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
.gyh-av{width:30px;height:30px;border-radius:50%;background:rgba(29,155,240,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px}
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
        try { hookApi(); } catch (e) {}
        try { hookToday(); regMini(); regMem(); regWidget(); regSwitch(); } catch (e) {}
        if (n === 20 || n === 58) checkup(false);
        if (n > 60) { clearInterval(t); setInterval(() => { try { keepTop(); hookApi(); hookToday(); regWidget(); } catch (e) {} }, 5000); setInterval(() => checkup(false), 30 * 60e3); }
    }, 500);
    window.gyGuideData = () => GUIDE;
    window.gyHelpData = () => D;
})();
