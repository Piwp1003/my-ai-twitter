// 一次把所有测试跑完，最后汇总哪个过了、哪个没过。
// 用法（在项目根目录，也就是 index.html 那一层）：
//   node _开发测试/run-all.mjs
// 或者直接双击 _开发测试/自测.bat
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const TESTS = [
  ['features-0923-test.mjs', '9/23 新功能（版本号/思维链/状态栏/卡片手机/TA定/今天/开关/推文图/角色卡）'],
  ['save-preset-test.mjs',   '增量保存（大图只存一次）+ 一键配置 / 我的配置'],
  ['peer-life-test.mjs',     '角色之间自己来往 + 时间管理大师列出所有功能'],
  ['life-dice-test.mjs',     '生活里的意外 + 今天面板能上下滑'],
  ['more-acts-test.mjs',     '自主模式接上各个小功能'],
  ['today-mobile-test.mjs',  '手机上的「今天」'],
  ['online-notify-test.mjs', '在线找资源 + 第二批动作 + 通知能跳'],
  ['peek-bio-test.mjs',      '偷翻日记 + 过往签名 + 论坛/匿名回帖 + 朋友圈'],
  ['phone-mode-test.mjs',    '小手机模式'],
  ['phone-widgets-test.mjs', '小手机：更多小组件/款式/颜色/裁剪/锁屏'],
  ['phone-extra-test.mjs',   '小手机：灵动岛/随意摆+拉边调大小/字能改/一行5个/打开方式/小窗/景深3D/实况'],
  ['notif-jump-test.mjs',   '点通知 / 弹窗 / 小手机通知中心 / 灵动岛：都能跳到对应页面'],
  ['chat-acts-route-test.mjs', '让 TA 写日记 / 去匿名论坛 / 论坛 / 朋友圈：做的是对的那件事；今天面板跟着更新'],
  ['v197-batch-test.mjs',    '事后反应 / 谁打给谁 / 邀请带上东西 / 塔罗 / 字体 / 弹窗拖大小 / 20个问题收藏'],
  ['v202-test.mjs',         '小手机神秘学 + 新小组件 + 今日运势再摇 + 角色立绘差分 + 微信滚动条透明'],
  ['v203-test.mjs',         '返回（系统返回键/左边缘右滑/鼠标侧键）+ 经期记录（预测/日历/小组件/提醒/角色记得和照顾）'],
  ['v204-test.mjs',         '一起听 · 一起看（网易云/QQ音乐/B站……放进来，TA 知道在放什么）'],
  ['v206-plugins-test.mjs',  '新玩法插件：桌面上的TA/深夜电台/自习室/梦/涂鸦/交换日记/平行世界/养小生命/时间胶囊/明信片/拆信/小约定/叫醒哄睡/草稿箱'],
  ['v207-plugins-test.mjs',  '新玩法插件第二批：默契问答/纪念日惊喜/熬夜/相册/做饭/来电/小游戏加三款/愿望/一百件小事/树洞/早安简报/存钱罐/抱抱 + 今天面板'],
  ['v208-plugins-test.mjs',  '新玩法插件第三批：一起旅行/吵架和好/情侣头像/追剧进度/给TA过生日/一起记账 + 哄睡故事 + 所有插件的小组件 + 查重'],
  ['v209-fixes-test.mjs',  '这一轮修复：开场预览/钱包闪/语音拉取模型+三种语音条/选文件和文件夹/TA 每天重想节奏/白露一万字卡/桌面TA立绘/记忆总览/小功能整理/换个世界/神秘学加量'],
  ['v210-plugins-test.mjs', '记忆加强（生活小档案/总结滚雪球/番外隔离/好感两层）+ 12 个新玩法（时光机/TA眼中的你/互换身份/星图/心跳/散步/贴贴/合照/回忆放映/漂流瓶/小屋/留声机）'],
  ['v211-plugins-test.mjs', '白露字词字卡（拼句/连发/夹词）+ 口头禅传染/我们的书/你还记得吗/暗号/调查问卷/兑换券/提问箱'],
  ['v212-plugins-test.mjs', '轮到你哄TA/帮我选/恋爱审批/每日一问/寻宝/文字冒险/成就/TA写的歌/周报'],
  ['v213-plugin-manager-test.mjs', '插件管理：多文件导入、同名覆盖、多选批量启用/停用/导出/删除'],
  ['v214-plugins-test.mjs', '备份补全 + 未来的TA/表情包工坊/等级/私教/随机掉落/睡前三件好事/省电模式'],
  ['v215-phone-widget-test.mjs', '手机桌面小组件：安卓 App 广播 / 苹果 Scriptable + 中转站 / 桌面点进来 / TA 留言'],
  ['v216-status-group-test.mjs', '心声/身体 · 分模块备份 · 表情回应 · TA 的备忘录 · 群主管理员/只围观/拼手气红包 · 报错分类/JSON 修复/约定≠已发生'],
  ['v217-polish-test.mjs', '整理过的外观：小功能一格一格 / 开关能展开 / 插件能搜 / 空播放器缩小 / 能关'],
  ['v218-pages-menu-test.mjs', '右键菜单不再闪没 + 弹窗变成页面（‹ 返回 / 系统返回 / 换页收起 / 小弹窗不动 / 能关）'],
  ['v219-time-sense-test.mjs', '感知真实时间总开关：开着跟以前一样，关上发给模型的内容里没有现实时间'],
  ['v220-place-preset-test.mjs', '时间与所在地（自定义时间 / 异地时区）+ 相处模式 / 风格调料 / 平视'],
  ['v221-prompt-lib-test.mjs', '内置提示词与内置世界书：列出来、能改、能恢复默认、能整体关掉'],
  ['v222-chat-think-test.mjs', '聊天里的「这一幕」：🕐 场景名 ›，点开是场景描写，里面还能看思考'],
  ['v223-npc-recall-test.mjs', '世界里的人：能改、能变成角色 + 撤回：偷看一眼、TA 自己决定撤回'],
  ['v224-lang-test.mjs', '外语和翻译：TA 说自己的语言、点「译」看中文、你的话自动翻'],
  ['v225-merge-test.mjs', '按功能盘点合并：合集入口、插件打包、所在地并进行程、真实情况并进小档案、回顾节奏、小生命、新自主行动'],
  ['v226-mag-custom-test.mjs', '小手机贴纸（贴纸库/抠图/TA 的封面/TA 贴贴纸）+ 成就和等级自定义、让 TA 来设'],
  ['v227-guide-help-test.mjs', '📘 使用指南（设置最上面，去看看/开关状态/点开关跳过去）+ 🛟 客服（先查指南再问 API；报错、插件冲突会提醒）'],
  ['v228-forum-npc-test.mjs', '论坛路人跟帖接你发的东西（主帖正文 / 你那一楼），不复述世界书'],
  ['v229-gh-ideas-test.mjs', 'GitHub 挑来的 12 个新插件（直播间/跑团/反向攻略/记忆潜行/真实热搜/反向养成/来电增强/情绪皮肤/气泡工坊/酒馆主题/日夜主题/跟手返回）+ 平视改名'],
  ['v230-more-test.mjs', '手帐时间线、关系四条线、TA 自拍、AI 小程序、听取模式（用立绘插件）+ 小功能再归类 + 合集都是整页'],
  ['v231-shop-fish-fest-test.mjs', '装扮商店、一起钓鱼、一起过节（农历自动算）+ 使用指南和客服跟上所有新功能'],
  ['v232-walk-steps-schedule-test.mjs', '陪你散步计步+邀请卡+挂进约出去；日程自动更新只从打开后开始+一键补齐'],
  ['v233-six-ideas-test.mjs', '秘密计划、被你影响、现实小任务、一起安静待着、我们的小习惯、角标和分享'],
  ['v234-games-test.mjs', '8 个新游戏 + 插件自动检查更新 + 指南'],
  ['v235-help-persona-test.mjs', '客服弹窗开关 + 客服人设可切换'],
  ['v236-help-errors-test.mjs', '客服把所有接口报错都用大白话提醒 + 报错词典'],
  ['v237-entries-test.mjs', '入口补齐：游戏厅、个性化合集、点头像看反向养成'],
  ['v238-five-more-test.mjs', '同一秒、有条件才能拆的信、TA的往事、成长日志、人生选择题 + API 分工表'],
  ['v239-social-test.mjs', '营销号自己爆料、微博热搜榜、小红书 + 内置提示词'],
  ['v240-pm-apk-scroll.mjs', '安卓 App 里开小手机模式：页面和弹出来的小页面都能滑'],
  ['v241-eight-test.mjs', 'TA被困了、你打了又删、你让TA重说了、准点群聊、旧物箱、窗台来客、心电感应光谱、录像带'],
  ['v242-gen-status-test.mjs', '生成中提示：小条 / 流体云 / 停止'],
  ['v205-test.mjs',         'TA 的声音（语音模型/每人自己的声音/语音条/你发语音/转文字/语音库）+ 心情手账 + 统计词云 + 开场动画'],
  ['post-regen-test.mjs',    '让 TA 重新写推文'],
  ['memhub-extra-test.mjs',  '记忆总览：其它记忆能改能删'],
  ['boot-test.mjs',          '启动自检'],
  ['binding-test.mjs',       '按钮有没有绑到不存在的函数'],
  ['input-test.mjs',         '输入框永远能打字'],
  ['leak-test.mjs',          'JSON/思维链不外泄 + 流式'],
  ['stream-group-test.mjs',  '聊天流式 + 群聊转私聊'],
  ['retrigger-test.mjs',     '聊天：空着点发送＝重生成'],
  ['recomment-test.mjs',     '评论：空着点回复＝重生成'],
  ['letter-test.mjs',        '写信/回信'],
  ['feed-test.mjs',          '推特流 / 路人 NPC'],
  ['relationship-test.mjs',  '关系网影响回复'],
  ['adaptive-test.mjs',      '名字/时间不写死'],
  ['scrollbar-test.mjs',     '浮层式滚动条'],
  ['tavern-bridge-test.mjs', '助手脚本兼容层'],
  ['run.mjs',                '续写工作台全链路'],
  ['v249-soft-test.mjs', '软件：微博 / 泡泡'], ['v250-soft2-test.mjs', '软件：小红书 / 豆瓣 / iMessage'], ['v251-ios-test.mjs', '软件：苹果外观 / iMessage 全功能'],
  ['v252-phone-test.mjs', '真手机'], ['v254-soft3-test.mjs', '软件补包'], ['v255-soft4-test.mjs', '软件之间分享 / 草稿箱 / 微博抽奖'],
  ['v256-music-test.mjs', '软件桌面 + 网易云'], ['v257-douyin-test.mjs', '抖音（含直播间）'], ['v258-wechat-test.mjs', '微信'],
  ['v259-phone-x-test.mjs', '小手机推特（主页 + 私信）'], ['v260-chat-route-test.mjs', '聊天互通 + TA 喜欢用哪个软件找你'], ['v261-pm-minis-test.mjs', '小手机桌面：小功能都有图标'], ['v262-x-theme-test.mjs', '推特蓝色 / 黑色、书签、X 个人主页'], ['v264-x-search-test.mjs', '推特搜索页（探索页、下拉刷新）、顶栏不重叠'], ['v273-ios-look-test.mjs', '🍏 iOS 外观：液态玻璃桌面、状态栏 / 底栏开关、深浅色同步'], ['v275-call-red-icons-test.mjs', '📞 来电合成一个、老小红书拿掉'], ['v277-music-new-test.mjs', '🎵 网易云新版、一起听气泡 / 距离、软件内置、音乐类并进网易云'], ['v278-ios-plug-test.mjs', '🍏 新玩法插件 iOS 样子、抖音一起看'], ['v263-soft-more-test.mjs', '微信运动、朋友圈可见范围、聊天背景、抖音日常 / 热榜 / 连麦、网易云匹配度 / 定时关闭、小红书购物车 / 店铺'],
];
// 需要额外素材的：有素材才跑
if (fs.existsSync(path.join(root, '_test', 'card-闻述-状态栏.json'))) TESTS.push(['card-test.mjs', '角色卡状态栏']);

const only = process.argv.slice(2);
const list = only.length ? TESTS.filter(t => only.some(o => t[0].includes(o))) : TESTS;
const out = [];
const t0 = Date.now();
for (const [file, label] of list) {
  process.stdout.write(`▶ ${label}（${file}）… `);
  const s = Date.now();
  const r = spawnSync(process.execPath, [path.join('_开发测试', file)], { cwd: root, encoding: 'utf8', timeout: 5 * 60000 });
  const txt = (r.stdout || '') + (r.stderr || '');
  const sum = (txt.match(/(\d+)\/(\d+)\s*通过/) || [])[0] || (/全部通过/.test(txt) ? '全部通过' : '');
  const ok = r.status === 0;
  console.log(`${ok ? '✅' : '❌'} ${sum}  ${((Date.now() - s) / 1000).toFixed(0)}s`);
  if (!ok) console.log(txt.split('\n').filter(l => /❌|→|Error|错误/.test(l)).slice(0, 12).map(l => '     ' + l.trim()).join('\n'));
  out.push({ file, label, ok, sum });
}
const bad = out.filter(x => !x.ok);
console.log(`\n${out.length - bad.length}/${out.length} 组通过，用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
if (bad.length) console.log('没过的：' + bad.map(b => b.label).join('、'));
fs.writeFileSync(path.join(here, '自测结果.txt'),
  `谷雨自测 ${new Date().toLocaleString('zh-CN')}\n\n` + out.map(x => `${x.ok ? '✅' : '❌'} ${x.label}  ${x.sum}`).join('\n') + '\n', 'utf8');
process.exit(bad.length ? 1 : 0);
