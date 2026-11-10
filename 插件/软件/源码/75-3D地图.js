/* 🗺️ 3D地图：把「行程与天气」里的地点搭成一座 3D 小城，你和 TA 的小人站在各自在的地方。
   · 两种风格：圆滚滚（朋友收集那种玩具感）/ 低模；小人用「3D 小人」里捏好的样子，没捏就用简单小人
   · 出行：点一个地方 → 选跟谁去、怎么去 → 小人沿路走过去（或者飞过去、被大炮打过去……）；TA 不在身边就从 TA 那边过来碰头
   · 出行方式：15 种自带的（走路、单车、大鹅、公交、打车、让 TA 背着、热气球、纸飞机、扫帚、云、泡泡、大炮、火箭、传送圈……），每种能单独关；还能自己加（名字、图标、怎么动、快慢、价钱、样子，也能让 AI 帮你填）
   · TA 一路上说的话、路上碰到的小事按人设现编；约 TA 时 TA 自己决定来不来
   · TA 自己会：自己出门去个地方、约你出去（自主行动）
   · 这个文件开机就加载，只管登记（开关、入口、自主、今天、小组件、记忆、提示词）；真正的 3D 在 js/map3d.js，第一次打开才加载 */
if (window.__gysMap3d) return; window.__gysMap3d = 1;
const G = window.GYS, FID = 'gysMap3d';
X.feat(FID, { n: '🗺️ 3D 地图', desc: '「行程与天气」里的地点搭成一座 3D 小城：和 TA 走过去、骑大鹅、坐火箭……TA 也会自己出门、约你出去' });
G.APPS.map3d = { n: '3D 地图', ico: '🗺️', feat: FID };
const ST = X.store('gysmap3d');
let D = { me: '', home: '', style: 'toy', av: 'auto', fac: '', wx: '', ways: {}, custom: [], cwx: [], trips: [], invite: null, last: {}, demo: false, low: false };
let READY = ST.get('d').then(d => { if (d && typeof d === 'object') D = Object.assign(D, d); if (!Array.isArray(D.trips)) D.trips = []; if (!Array.isArray(D.custom)) D.custom = []; if (!Array.isArray(D.cwx)) D.cwx = []; });
const saveD = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => ST.set('d', D), 300); }; })();

/* ---------------- 出行方式 ---------------- */
// kind：road 沿路 / air 飞 / arc 被抛过去 / rocket 先上天再掉下来 / portal 一下就到
// mpm：每分钟走多少米（算要几分钟）；sp：动画里每秒走几格；cost：元，或者 {base, km} 按距离算
const SPEED = { slow: [70, 6], mid: [150, 10], fast: [320, 17], super: [900, 30] };
const BUILTIN = [
    { id: 'walk', ic: '🚶', n: '走路', kind: 'road', mpm: 75, sp: 7, cost: 0, tip: '慢慢走，路上能说说话', look: 'walk' },
    { id: 'bike', ic: '🚲', n: '共享单车', kind: 'road', mpm: 220, sp: 13, cost: 1.5, tip: '扫码 1.5 元，双人的', look: 'bike' },
    { id: 'skate', ic: '🛹', n: '滑板', kind: 'road', mpm: 180, sp: 11, cost: 0, tip: '下坡会很快', look: 'skate' },
    { id: 'goose', ic: '🪿', n: '骑大鹅', kind: 'road', mpm: 150, sp: 10, cost: 0, tip: '大鹅脾气不太好，路上会叫', look: 'goose' },
    { id: 'bus', ic: '🚌', n: '公交', kind: 'road', mpm: 260, sp: 15, wait: 5, cost: 2, tip: '要等 5 分钟车', look: 'bus' },
    { id: 'taxi', ic: '🚕', n: '打车', kind: 'road', mpm: 380, sp: 22, wait: 2, cost: { base: 9, km: 2.2 }, tip: '从钱包扣', look: 'taxi' },
    { id: 'piggy', ic: '🫂', n: '让 TA 背着', kind: 'road', mpm: 60, sp: 6, cost: 0, need: 'ta', tip: 'TA 得在你身边', look: 'piggy' },
    { id: 'balloon', ic: '🎈', n: '热气球', kind: 'air', h: 40, mpm: 120, sp: 6, cost: 30, tip: '能看到整座城', look: 'balloon' },
    { id: 'plane', ic: '🛩️', n: '纸飞机', kind: 'air', h: 18, mpm: 300, sp: 15, cost: 0, tip: '一张 A4 折的', look: 'plane' },
    { id: 'broom', ic: '🧹', n: '扫帚', kind: 'air', h: 15, mpm: 360, sp: 17, cost: 0, tip: '要抓紧', look: 'broom' },
    { id: 'cloud', ic: '☁️', n: '踩着云', kind: 'air', h: 24, mpm: 160, sp: 8, cost: 0, tip: '软的，有点潮', look: 'cloud' },
    { id: 'bubble', ic: '🫧', n: '变成泡泡', kind: 'air', h: 20, mpm: 90, sp: 5, wob: 1, cost: 0, tip: '飘到哪算哪（大概能到）', look: 'bubble' },
    { id: 'cannon', ic: '💥', n: '大炮发射', kind: 'arc', h: 70, sp: 45, fixed: '30 秒', cost: 0, tip: '30 秒到，落地有点疼', look: 'cannon' },
    { id: 'rocket', ic: '🚀', n: '火箭', kind: 'rocket', sp: 55, fixed: '1 分钟', cost: 520, tip: '先上天，再掉下来', look: 'rocket' },
    { id: 'portal', ic: '🌀', n: '传送圈', kind: 'portal', fixed: '一眨眼', cost: 0, tip: '一眨眼，会有点晕', look: 'portal' },
];
const LOOKS = { walk: '走路（不要坐骑）', bike: '单车', skate: '滑板', goose: '大鹅', bus: '公交', taxi: '小汽车', balloon: '热气球', plane: '纸飞机', broom: '扫帚', cloud: '云', bubble: '泡泡', cannon: '大炮', rocket: '火箭', portal: '传送圈', emoji: '用图标当坐骑' };
const KINDS = { road: '沿着路走', air: '飞过去', arc: '被抛过去', rocket: '先上天再掉下来', portal: '一下就到' };
function customWay(c) {
    const s = SPEED[c.speed] || SPEED.mid;
    return { id: c.id, ic: c.ic || '✨', n: c.n || '新的去法', kind: KINDS[c.kind] ? c.kind : 'road', mpm: s[0], sp: s[1], h: Math.max(5, Math.min(80, +c.h || 20)), cost: Math.max(0, +c.cost || 0), tip: c.tip || '', look: LOOKS[c.look] ? c.look : 'emoji', custom: true, speed: c.speed || 'mid', fixed: c.kind === 'portal' ? '一眨眼' : c.kind === 'arc' ? '30 秒' : c.kind === 'rocket' ? '1 分钟' : '' };
}
const allWays = () => BUILTIN.concat(D.custom.map(customWay));
const ways = () => allWays().filter(w => D.ways[w.id] !== false);
const wayOf = id => allWays().find(w => w.id === id) || BUILTIN[0];
const minsOf = (w, len) => w.kind === 'portal' ? 0 : w.kind === 'arc' || w.kind === 'rocket' ? 1 : Math.max(1, Math.round(len * 10 / (w.mpm || 75)) + (w.wait || 0));
const costOf = (w, len) => w.cost && typeof w.cost === 'object' ? Math.max(w.cost.base, Math.round(w.cost.base + len * 10 / 1000 * w.cost.km)) : (+w.cost || 0);
// 没接 API / API 没回时 TA 说的（按出行方式）
const CANNED = {
    start: { walk: ['走吧。', '慢慢走。'], bike: ['我骑，你坐后面。', '比赛吗？'], skate: ['慢一点。', '摔了我可不扶你。'], goose: ['这只鹅靠谱吗……', '它在看你。'], bus: ['卡我带了。', '这趟车人少。'], taxi: ['车到了。', '上车。'], piggy: ['上来吧，抓稳。', '就这一次啊。'], balloon: ['上面风大。', '外套给你。'], plane: ['你折的？', '……能坐两个人吗。'], broom: ['你什么时候学会的？', '抓紧我。'], cloud: ['还挺软的。', '有点潮。'], bubble: ['这个安全吗？', '你现在好圆。'], cannon: ['……你认真的？', '落地我接着你。'], rocket: ['你下来，我们打车。', '行吧，系好安全带。'], portal: ['我刚才是不是被拆开了？', '有点晕。'] },
    mid: ['冷不冷？', '这条路我以前常走。', '你今天吃饭了吗？', '慢点。'],
    arrive: ['到了。', '到啦。', '就是这儿。'],
    odd: ['一只橘猫跟了你们一段路', '路边的阿姨塞给你一个橘子', '风把帽子吹跑了，又吹回来了', '一个小朋友冲你们挥手', '路上捡到一片很圆的叶子', '天上飘过一朵像小狗的云'],
    oddw: { goose: '大鹅叫了一声，路人全回头了', balloon: '飞过你家楼顶，看到自己晾的衣服', rocket: '火箭的烟在天上画出了一颗心', bubble: '泡泡被一只鸟啄了一下，还好没破', cannon: '你在空中翻了两个跟头', broom: '扫帚掉了一根毛', cloud: '云飘过一片雨，你们被淋湿了一点', plane: '纸飞机差点撞上风筝', bus: '公交上有人在用外放听戏', skate: '滑过一个水坑，溅起一朵水花', bike: '车铃铛叮了一下，前面的鸽子全飞了', taxi: '司机师傅一路都在讲他女儿', portal: '传送圈另一头冒出来一只同样很晕的猫' }
};

/* ---------------- 天气：自带 5 种 + 自己加的 ---------------- */
// fx：天上飘什么；amount：多少；fog 0~3：多雾；light 0.2~1.2：多亮；sky：天空偏什么颜色
const WX = [{ id: 'sun', ic: '☀️', n: '晴' }, { id: 'cloud', ic: '☁️', n: '多云' }, { id: 'rain', ic: '🌧️', n: '下雨' }, { id: 'snow', ic: '❄️', n: '下雪' }, { id: 'fog', ic: '🌫️', n: '起雾' }];
const FX = { none: '什么都不飘', rain: '雨', snow: '雪', petal: '花瓣', leaf: '落叶', star: '亮晶晶的光点', ember: '火星', bubble: '泡泡' };
const allWx = () => WX.concat(D.cwx.map(c => Object.assign({ custom: true }, c)));
const wxOf = id => allWx().find(w => w.id === id) || null;

X.plGroup('🗺️ 3D 地图', FID, [['map3d.trip', '一起出门：TA 一路上说的话和路上的小事', '出发时'], ['map3d.ask', '你约 TA 一起去：TA 来不来', '点「约 TA 一起去」时'], ['map3d.out', 'TA 自己出门去哪', '自主行动'], ['map3d.invite', 'TA 约你出去', '自主行动'], ['map3d.way', '自己加出行方式：让 AI 补全', '点「让 AI 帮我填」时'], ['map3d.wx', '自己加天气：让 AI 补全', '点「让 AI 帮我填」时'], ['map3d.in', '进到地方里面：你找 TA 时 TA 的反应', '在面馆、医院、寺……里面点 TA 时']], {
    'map3d.trip': '{{who}}\n最近的聊天：\n{{recent}}\n\n现在是 {{time}}，{{weather}}。你和她{{how}}从「{{from}}」去「{{to}}」（{{todesc}}），怎么去：{{way}}（{{waytip}}）。\n按你的性格当场说话：出发时一句、路上一句、到了一句；再编一件路上碰到的小事（跟这种去法有关最好，一句话，可以好玩一点）。都是口语，每句 25 字以内。\n只输出 JSON：{"start":"","mid":"","arrive":"","odd":""}',
    'map3d.ask': '{{who}}\n最近的聊天：\n{{recent}}\n\n现在是 {{time}}，{{weather}}。你现在在「{{at}}」。她在地图上约你一起去「{{to}}」，她打算{{way}}过去，你从你那边过去碰头。按你的性格和你现在在干嘛决定去不去，回她一句（口语，30 字以内）。\n只输出 JSON：{"go":true,"say":""}',
    'map3d.out': '{{who}}\n最近的聊天：\n{{recent}}\n\n现在是 {{time}}，{{weather}}。你现在在「{{at}}」。你想自己出门去个地方，能去的：{{spots}}。按你的性格、此刻的心情和时间挑一个，再说一句为什么去（像发给她的消息，口语，25 字以内）。\n只输出 JSON：{"go":"地点名","say":""}',
    'map3d.invite': '{{who}}\n最近的聊天：\n{{recent}}\n\n现在是 {{time}}，{{weather}}。你想约她出去。能去的地方：{{spots}}；可以怎么去：{{ways}}。按你的性格挑一个地方和一种去法（可以挑好玩的），给她发一句邀请（口语，30 字以内）。\n只输出 JSON：{"go":"地点名","way":"去法的名字","say":""}',
    'map3d.in': '{{who}}\n最近的聊天：\n{{recent}}\n\n现在是 {{time}}，{{weather}}。你和她在「{{place}}」里面（{{desc}}）。你现在{{doing}}。{{event}}\n当场反应：说一句（口语，30 字以内），选一个动作（{{acts}}），一个表情（normal / happy / shy / angry / sad / surprised / closed）。{{ask}}\n只输出 JSON：{"say":"","act":"","face":""{{askKey}}}',
    'map3d.wx': '有人想在一个可爱的 3D 小地图里加一种天气：「{{name}}」。帮它补全：一个 emoji 当图标；天空偏什么颜色（#rrggbb）；天上飘什么（none 什么都不飘 / rain 雨 / snow 雪 / petal 花瓣 / leaf 落叶 / star 亮晶晶的光点 / ember 火星 / bubble 泡泡）；飘多少（few / mid / lots）；多雾（0 不雾 ~ 3 很雾）；多亮（0.2 很暗 ~ 1.2 很亮）；一句话说这天气是什么样（给角色看的，20 字以内）。\n只输出 JSON：{"ic":"","sky":"#","fx":"","amount":"","fog":0,"light":1,"desc":""}',
    'map3d.way': '有人想在一个可爱的 3D 小地图里加一种出行方式：「{{name}}」。帮它补全：一个 emoji 当图标；怎么动（road 沿路走 / air 飞过去 / arc 被抛过去 / rocket 先上天再掉下来 / portal 一下就到）；快慢（slow / mid / fast / super）；飞多高（只有 air 要填，5~60）；一次花多少钱（元，不要钱填 0）；一句好玩的说明（15 字以内）；样子（从 walk bike skate goose bus taxi balloon plane broom cloud bubble cannon rocket portal emoji 里挑最像的，挑不到就 emoji）。\n只输出 JSON：{"ic":"","kind":"","speed":"","h":20,"cost":0,"tip":"","look":""}'
});

/* ---------------- 地点和人 ---------------- */
// 示例世界（还没有地点时可以先看看）：坐标是 0~100，跟「行程与天气」的地图一样
const DEMO = [
    ['你家', '老城区弄堂里，二楼，窗外一棵桂花树。', 18, 76, 'life'], ['林记深夜面馆', '老街上开到凌晨两点的面馆，老板懂分寸，不多问。', 30, 64, 'eat'], ['听雨楼老茶馆', '包工头和三教九流交换消息的地方。', 12, 46, 'meet'],
    ['县政府大院', '大院里一条梧桐甬道，晚上十点还有几扇窗亮着。', 56, 30, 'work'], ['县中心医院', '急诊大厅晚上八点以后全是来苏水味。', 76, 44, 'work'], ['滨江原公寓', '新城和老城交界的高层，能看到江和老街夜市的光。', 46, 72, 'life'],
    ['滨江夜市', '防洪堤前半段，烧烤摊一路排开，烟火气重。', 34, 88, 'fun'], ['柳树堤坝', '防洪堤后半段，柳树底下没什么人。', 66, 88, 'quiet'], ['青云山净慈寺', '山上的老寺。偏殿台阶上坐一会儿，不求神。', 16, 14, 'quiet'], ['砂石厂建材市场', '开发区里正在整改的老厂区。', 92, 20, 'work']
].map((a, i) => ({ id: 'demo' + i, name: a[0], desc: a[1], x: a[2], y: a[3], cat: a[4], faction: '示例', mapName: '示例：临安县' }));
function data() {
    const d = window.gymap3dData ? window.gymap3dData() : null;
    const real = d && d.spots && d.spots.length ? d.spots : [];
    if (D.demo || !real.length) return { demo: true, real: real.length, spots: DEMO, charLoc: demoLoc(), wdesc: d && d.wdesc || '', wcode: d ? d.wcode : null, city: d && d.city || '', factions: ['示例'] };
    const facs = [...new Set(real.map(s => s.faction))];
    const spots = D.fac && facs.includes(D.fac) ? real.filter(s => s.faction === D.fac) : real;
    return { demo: false, real: real.length, spots, charLoc: d.charLoc || {}, wdesc: d.wdesc || '', wcode: d.wcode, city: d.city || '', factions: facs };
}
let DEMOLOC = null;
function demoLoc() { if (DEMOLOC) return DEMOLOC; DEMOLOC = {}; X.chars().forEach((c, i) => { DEMOLOC[String(c.id)] = DEMO[[3, 4, 5, 2, 1, 7][i % 6]].id; }); return DEMOLOC; }
const spotName = id => { const s = data().spots.find(s => s.id === id) || DEMO.find(s => s.id === id); return s ? s.name : ''; };
function homeSpot(dd) { dd = dd || data(); if (dd.spots.some(s => s.id === D.home)) return D.home; const h = dd.spots.find(s => /家|住|宿舍|屋/.test(s.name)); return h ? h.id : ''; }
function meAt(dd) { dd = dd || data(); if (dd.spots.some(s => s.id === D.me)) return D.me; const h = dd.spots.find(s => /家|宿舍|住/.test(s.name)) || dd.spots[0]; return h ? h.id : ''; }
async function setLoc(cid, sid) { if (data().demo) { demoLoc()[String(cid)] = sid; return; } if (window.gymap3dSetLoc) await window.gymap3dSetLoc(cid, sid); }
const nowTxt = () => { const d = new Date(); return `${d.getHours()} 点 ${d.getMinutes()} 分`; };
const wxTxt = () => { const w = D.wx && wxOf(D.wx); if (w) return w.n + (w.desc ? '（' + w.desc + '）' : ''); const d = data(); return d.wdesc ? (d.city ? d.city + '，' : '') + d.wdesc : '天气不知道'; };
const rare = (c, k, h) => Date.now() - (D.last[k + (c ? c.id : '')] || 0) > h * 3600e3;
const stamp = (c, k) => { D.last[k + (c ? c.id : '')] = Date.now(); saveD(); };
const findSpot = (dd, name) => { name = String(name || '').trim(); return dd.spots.find(s => s.name === name) || dd.spots.find(s => name && (s.name.includes(name) || name.includes(s.name))) || null; };

/* ---------------- 给 3D 那边用的 ---------------- */
const API = {
    get D() { return D; }, save: saveD, data, WX, FX, allWx, wxOf, homeSpot, meAt, setLoc, spotName, ways, allWays, wayOf, minsOf, costOf, customWay, CANNED, LOOKS, KINDS, SPEED, BUILTIN,
    chars: () => X.chars(), char: id => X.char(id), name: c => X.name(c), esc: X.esc, toast: (a, b) => X.toast(a, b), bailu: () => X.bailu(), auto: c => X.auto(c),
    hasAv: () => typeof window.gyx3dAvFor === 'function' && (!X.FEATS.some(f => f.id === 'gyx3d') || X.on('gyx3d')),
    // 一起出门：TA 一路上说什么（一次要齐，省 API）
    async tripLines(c, o) {
        const w = o.way, k = CANNED.start[w.look] || CANNED.start[w.id] || CANNED.start.walk;
        const fb = { start: X.pick(k), mid: X.pick(CANNED.mid), arrive: X.pick(CANNED.arrive), odd: (Math.random() < .6 && CANNED.oddw[w.look]) || X.pick(CANNED.odd) };
        if (X.bailu()) { const cd = X.cards(['出门', '聊天'], c, 3); return Object.assign(fb, cd[0] ? { start: cd[0] } : {}, cd[1] ? { mid: cd[1] } : {}, cd[2] ? { arrive: cd[2] } : {}); }
        const j = X.json(await X.ask(X.pl('map3d.trip', '', { who: X.who(c), recent: X.recent(c, 10) || '（还没聊）', time: nowTxt(), weather: wxTxt(), how: o.together ? '一起' : '各自（你从你那边过去碰头）', from: o.from, to: o.to, todesc: o.todesc || '', way: w.n, waytip: w.tip || '' })));
        if (!j) return fb;
        return { start: X.plain(j.start || '') || fb.start, mid: X.plain(j.mid || '') || fb.mid, arrive: X.plain(j.arrive || '') || fb.arrive, odd: X.plain(j.odd || '') || fb.odd, ai: true };
    },
    // 她约 TA：来不来
    async askJoin(c, o) {
        if (X.bailu()) return { go: true, say: X.cards(['出门', '聊天'], c, 1)[0] || '好。' };
        const j = X.json(await X.ask(X.pl('map3d.ask', '', { who: X.who(c), recent: X.recent(c, 10) || '（还没聊）', time: nowTxt(), weather: wxTxt(), at: o.at, to: o.to, way: o.way })));
        if (!j) return { go: true, say: X.v('好，我过去。', '等我一下，这就来。', '行，门口见。') };
        return { go: j.go !== false && j.go !== 'false', say: X.plain(j.say || '') || (j.go === false ? '今天不行。' : '好。') };
    },
    async fillWay(name) { const j = X.json(await X.ask(X.pl('map3d.way', '', { name }))); return j; },
    // 在里面找 TA：TA 当场的反应（打招呼、点菜、上香……）
    async inReact(c, o) {
        const fb = { say: X.v('嗯？', '在呢。', '怎么了？', '好。'), act: X.pick(['nod', 'wave', 'tilt']), face: 'normal', go: true };
        if (X.bailu()) return Object.assign(fb, { say: X.cards([o.place, '聊天'], c, 1)[0] || fb.say });
        const acts = window.gyx3dActList ? window.gyx3dActList() : 'wave(挥手) / nod(点头) / shake(摇头) / hug(张开手要抱) / shy(害羞) / heart(比心) / jump(跳跳) / clap(拍手) / think(思考) / bow(鞠躬)';
        const j = X.json(await X.ask(X.pl('map3d.in', '', { who: X.who(c), recent: X.recent(c, 8) || '（还没聊）', time: nowTxt(), weather: wxTxt(), place: o.place, desc: o.desc || '', doing: o.doing || '待着', event: o.event, acts, ask: o.ask || '', askKey: o.askKey || '' })));
        if (!j) return fb;
        return { say: X.plain(String(j.say || '')).slice(0, 60) || fb.say, act: String(j.act || 'nod').trim(), face: String(j.face || 'normal').trim(), go: j.go !== false && j.go !== 'false', dish: X.plain(String(j.dish || '')).slice(0, 20), ai: true };
    },
    logIn(o) { if (data().demo) return; D.trips.push({ at: Date.now(), to: o.to, toName: spotName(o.to), way: 'in', wayName: '在里面', ic: o.ic || '🏠', with: o.withId ? String(o.withId) : '', odd: o.what || '', line: o.line || '', inside: true }); if (D.trips.length > 400) D.trips.splice(0, D.trips.length - 400); saveD(); },
    async fillWx(name) { const j = X.json(await X.ask(X.pl('map3d.wx', '', { name }))); return j; },
    // 到了：记下来、扣钱、挪 TA
    async finish(o) {
        D.me = o.to; const dd = data();
        if (o.withId) await setLoc(o.withId, o.to);
        const cost = o.cost || 0;
        if (cost > 0 && !dd.demo) { try { if (window.gyWallet && window.gyWallet.spend) await window.gyWallet.spend('me', cost, `3D 地图 · ${o.way.n}去${spotName(o.to)}`, { tag: '出行' }); } catch (e) {} }
        if (!dd.demo) { D.trips.push({ at: Date.now(), from: o.from, to: o.to, toName: spotName(o.to), way: o.way.id, wayName: o.way.n, ic: o.way.ic, with: o.withId ? String(o.withId) : '', odd: o.odd || '', line: o.line || '', cost }); if (D.trips.length > 400) D.trips.splice(0, D.trips.length - 400); }
        if (D.invite && D.invite.spot === o.to) D.invite = null;
        saveD();
    }
};
window.gysMap3dApi = API;

/* ---------------- 打开（第一次才加载 3D） ---------------- */
let loadP = null;
function loadMap() {
    if (window.gysMap3dBoot) return Promise.resolve();
    if (loadP) return loadP;
    const V = typeof GY_VERSION !== 'undefined' ? GY_VERSION : Date.now();
    const lib = () => typeof window.gyx3dLib === 'function' ? window.gyx3dLib() : new Promise((ok, no) => { if (window.GY3D) return ok(window.GY3D); const s = document.createElement('script'); s.src = 'js/vendor/gy3d.min.js?v=9'; s.onload = () => window.GY3D ? ok(window.GY3D) : no(new Error('3D 引擎没加载出来')); s.onerror = () => no(new Error('3D 引擎没加载出来（缺 js/vendor/gy3d.min.js）')); document.head.appendChild(s); });
    const own = () => new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'js/map3d.js?v=' + V; s.onload = () => window.gysMap3dBoot ? ok() : no(new Error('地图没加载出来')); s.onerror = () => { s.remove(); no(new Error('地图没加载出来（缺 js/map3d.js）')); }; document.head.appendChild(s); });
    loadP = lib().then(own).catch(e => { loadP = null; throw e; });
    return loadP;
}
window.gysMap3dOpen = async (opt) => {
    if (!X.on(FID)) return X.toast('「🗺️ 3D 地图」关着', '在全部开关里打开');
    await READY;
    X.toast('🗺️ 正在搭小城…', '');
    try { await loadMap(); } catch (e) { return X.toast('3D 地图打不开', e.message + '。可以先用「行程与天气」的 2D 地图'); }
    try { window.gysMap3dBoot(API, opt || {}); } catch (e) { console.error('[3D 地图]', e); X.toast('3D 地图出错了', String(e.message || e)); }
};
window.gysMap3dFocus = who => window.gysMap3dOpen({ focus: String(who) });
window.gysMap3dInvite = () => window.gysMap3dOpen({ invite: true });
window.gysMap3dState = () => D;
// 🏠 跟 3D 小屋连起来：地图上的「家」就是小屋。TA 在地图上别的地方 = 不在小屋里；TA 去了小屋 = 地图上回家了
window.gysMap3dAway = cid => { const dd = data(); if (dd.demo) return ''; const h = homeSpot(dd), at = dd.charLoc[String(cid)]; if (!h || !at || at === h || !dd.spots.some(s => s.id === at)) return ''; return spotName(at); };
window.gysMap3dGoHome = async cid => { const dd = data(); if (dd.demo) return false; const h = homeSpot(dd); if (!h) return false; await setLoc(cid, h); return true; };
window.gysMap3dHomeName = () => { const dd = data(); return dd.demo ? '' : spotName(homeSpot(dd)); };

/* ---------------- 谷雨这边：入口、自主、今天、小组件、记忆、聊天里 ---------------- */
X.mini({ id: FID, icon: '🗺️', title: '3D 地图', desc: '行程与天气里的地点搭成 3D 小城：和 TA 走过去、骑大鹅、坐火箭；TA 也会自己出门', cat: '软件', onOpen: () => window.gysMap3dOpen() }, FID);
const located = c => { const dd = data(); return !dd.demo && dd.charLoc[String(c.id)] && dd.spots.some(s => s.id === dd.charLoc[String(c.id)]); };
X.action({ key: 'gys_map_out', label: '自己出门去个地方（3D 地图上能看到）', hint: '去吃个饭、透口气、办点事', need: c => { const dd = data(); return !dd.demo && dd.spots.length >= 2 && rare(c, 'o', 6); }, run: async c => {
    stamp(c, 'o'); const dd = data(), at = dd.charLoc[String(c.id)], L = dd.spots.filter(s => s.id !== at);
    let sp = null, say = '';
    if (!X.bailu()) { const j = X.json(await X.ask(X.pl('map3d.out', '', { who: X.who(c), recent: X.recent(c, 8) || '（还没聊）', time: nowTxt(), weather: wxTxt(), at: spotName(at) || '不知道哪', spots: L.slice(0, 30).map(s => s.name + (s.desc ? '（' + s.desc.slice(0, 20) + '）' : '')).join('、') }))); if (j) { sp = findSpot({ spots: L }, j.go); say = X.plain(j.say || ''); } }
    if (!sp) sp = X.pick(L); if (!sp) return null;
    await setLoc(c.id, sp.id);
    D.trips.push({ at: Date.now(), from: at || '', to: sp.id, toName: sp.name, way: 'self', wayName: '自己去的', ic: '🚶', who: String(c.id), solo: true, line: say }); saveD();
    X.notify(c, `🗺️ ${X.name(c)} 去了${sp.name}`, say || '在 3D 地图上看看', X.go('gysMap3dFocus', String(c.id)));
    return say ? { text: say + `（去了${sp.name}）`, jump: { fn: 'gysMap3dFocus', args: [String(c.id)] } } : null;
} }, FID);
X.action({ key: 'gys_map_invite', label: '约她出去（挑个地方、挑种去法）', hint: '可以挑好玩的去法：骑大鹅、坐热气球……', need: c => { const dd = data(); return !dd.demo && dd.spots.length >= 2 && rare(c, 'i', 30) && !D.invite; }, run: async c => {
    stamp(c, 'i'); const dd = data(), W = ways().filter(w => w.need !== 'ta' || true);
    let sp = null, way = null, say = '';
    if (!X.bailu()) { const j = X.json(await X.ask(X.pl('map3d.invite', '', { who: X.who(c), recent: X.recent(c, 8) || '（还没聊）', time: nowTxt(), weather: wxTxt(), spots: dd.spots.slice(0, 30).map(s => s.name).join('、'), ways: W.map(w => w.n).join('、') }))); if (j) { sp = findSpot(dd, j.go); way = W.find(w => w.n === String(j.way || '').trim()) || W.find(w => j.way && (String(j.way).includes(w.n) || w.n.includes(j.way))); say = X.plain(j.say || ''); } }
    if (!sp) sp = X.pick(dd.spots.filter(s => s.id !== meAt(dd))) || dd.spots[0]; if (!way) way = X.pick(W) || BUILTIN[0];
    if (!say) say = X.v('出来走走？', '想去' + sp.name + '，你来不来。', '今天天气不错，出去？');
    D.invite = { cid: String(c.id), spot: sp.id, spotName: sp.name, way: way.id, wayName: way.n, ic: way.ic, at: Date.now(), say }; saveD();
    X.notify(c, `🗺️ ${X.name(c)} 约你${way.n}去${sp.name}`, say, X.go('gysMap3dInvite'));
    return { text: say + `（约你${way.n}去${sp.name}）`, jump: { fn: 'gysMap3dInvite', args: [] } };
} }, FID);
const todayTrips = () => D.trips.filter(t => X.day(new Date(t.at)) === X.day());
X.today(() => {
    const rows = [];
    if (D.invite && Date.now() - D.invite.at < 2 * 86400e3) { const c = X.char(D.invite.cid); if (c) rows.push({ t: X.name(c), x: `约你${D.invite.wayName}去${D.invite.spotName} · 去看看`, go: 'gysMap3dInvite()' }); }
    todayTrips().slice(-4).reverse().forEach(t => { const c = X.char(t.who || t.with); rows.push({ t: t.solo ? X.name(c) : (c ? '和' + X.name(c) : '你'), x: t.inside ? `${t.ic} 在${t.toName}里${t.odd || ''}` : `${t.ic} ${t.wayName}去了${t.toName}`, go: t.solo && c ? `gysMap3dFocus('${t.who}')` : 'gysMap3dOpen()' }); });
    return rows.length ? { title: '🗺️ 3D 地图', rows } : null;
}, FID);
X.widget('gysMap3dW', { n: '3D 地图', sizes: ['s', 'm'], tap: () => window.gysMap3dOpen(), r: w => {
    const t = D.trips[D.trips.length - 1], iv = D.invite && X.char(D.invite.cid);
    return X.gw(w, '🗺️', '3D 地图', iv ? [X.esc(X.name(iv)) + ' 约你', X.esc(D.invite.ic + ' ' + D.invite.spotName)] : t ? [X.esc(t.toName), X.esc(t.ic + ' ' + t.wayName)] : ['出去走走？', '和 TA 骑大鹅']);
} }, FID);
X.mem({ k: 'gysMap3d', ico: '🗺️', n: '一起出门（3D 地图）', d: '你们一起去过的地方、怎么去的、路上碰到什么（删了就是忘了这一趟）', items: c => D.trips.filter(t => t.with === String(c.id) || t.who === String(c.id)), text: t => `${new Date(t.at).toLocaleDateString()} ${t.inside ? '在' + t.toName + '里' + (t.odd || '') + (t.line ? '：「' + t.line + '」' : '') : (t.solo ? 'TA 自己去了' : '一起' + t.wayName + '去了') + t.toName + (t.odd ? '（路上：' + t.odd + '）' : '')}`, del: (c, i) => { const L = D.trips.filter(t => t.with === String(c.id) || t.who === String(c.id)); const x = L[i]; if (x) { D.trips = D.trips.filter(t => t !== x); saveD(); } } }, FID);
X.ctx(id => {
    const c = X.char(id); if (!c) return '';
    const L = D.trips.filter(t => (t.with === String(c.id) || t.who === String(c.id)) && Date.now() - t.at < 5 * 86400e3).slice(-3).map(t => (t.solo ? '你自己去了' : '你们一起' + t.wayName + '去了') + t.toName + (t.odd ? '，路上' + t.odd : ''));
    L.forEach((t, i) => { const x = D.trips.filter(t => (t.with === String(c.id) || t.who === String(c.id)) && Date.now() - t.at < 5 * 86400e3).slice(-3)[i]; if (x && x.inside) L[i] = '你们在' + x.toName + '里' + (x.odd || '待了一会儿') + (x.line ? '，你说「' + x.line + '」' : ''); });
    if (D.invite && D.invite.cid === String(c.id)) L.push(`你约了她${D.invite.wayName}去${D.invite.spotName}，她还没回`);
    const dd = data(); if (!dd.demo && dd.spots.length) { const m = spotName(meAt(dd)); if (m) L.push('她现在在' + m); }
    return L.length ? '【出门】' + L.join('；') : '';
}, FID);
X.inj(FID, [['出门', '3D 地图：你们最近一起去了哪、怎么去的、路上碰到的事、她现在在哪', '让 TA 记得你们一起出过门']]);
