import json, os, re, glob, shutil
src = os.path.dirname(os.path.abspath(__file__))
out = os.path.dirname(src)
common = open(os.path.join(src, '_common.js'), encoding='utf-8').read()

# 🧩 合并：同一类的插件打成一个（「谷雨功能盘点」里选的）。每个原插件包在自己的函数里，互不影响；数据还是存在原来的地方。
BUNDLES = [
    ('🖼️', '相册里的插件', ['22', '72', '52', '35', '119']),
    ('💞', '我们的关系', ['44', '99', '73', '69', '88', '109', '105', '121', '122', '134']),
    ('📚', '回顾', ['85', '98', '58', '48', '71', '53', '46', '45', '89']),
    ('🎉', '纪念日和生日', ['20', '37', '104']),
    ('🤙', '我们的约定', ['12', '61', '65', '26', '27']),
    ('🌙', '早安晚安', ['30', '13', '21', '76']),   # 02 深夜电台 10/28 并进网易云（内置）
    ('💬', '问答', ['66', '19', '60', '62', '123', '133']),
    ('🎮', '游戏', ['25', '68', '67', '64', '87', '103', '112', '113', '114', '115']),   # 127 TA被困了 283 删了
    ('🕵️', '推理和综艺', ['111', '116', '118', '117']),
    ('📰', '主页和社交', ['124', '125', '130']),
    ('💌', '信', ['11', '06', '09', '10', '54', '120']),
    ('🏠', '我们的小屋', ['55', '137', '75', '08', '31', '131', '132']),
    ('🗣️', 'TA怎么说话', ['81', '82', '83', '57', '101', '106', '128', '129', '14']),   # 14 草稿箱 282 并进来
    ('🫂', '哄', ['32', '63', '34', '28']),
    ('🚶', '陪你', ['50', '23', '03', '74', '33', '107', '108', '49', '51']),   # 282：贴贴（听心跳、摇一摇）并进来
    ('🎛️', '开关和后台', ['17', '77', '16', '135']),
    ('📱', '小手机', ['80', '100', '24', '78', '01', '136', '110']),
    ('🎨', '美化', ['94', '95', '96', '97', '102', '93']),   # 93 情绪皮肤 282 并进来
    # 282：原来单独的几个也按小功能里的分组合起来
    ('🎁', 'TA给你的', ['04', '05', '40']),
    ('🪐', '换个世界玩', ['07', '39', '47', '43']),
    ('🧠', '记忆', ['42', '41']),
    ('🌐', '外面的世界', ['18', '90']),
    ('💭', '聊天细节', ['84', '79']),
    ('🧺', '生活', ['38', '91']),
]
# 不要了的（数据不删，插件从列表里拿掉）
RETIRED = ['📺 追剧进度', '🔐 我们的暗号',
    # 10/28：软件全都内置进本体了（js/61-soft.js），装过的软件插件自动拿掉
    '📱 软件全家桶', '🧣 微博', '🫧 泡泡', '📕 小红书', '🫘 豆瓣', '💬 iMessage', '📲 真手机', '🎵 网易云', '🎵 网易云音乐', '🎶 抖音', '💚 微信', '📺 直播间',
    # 10/28：音乐类并进网易云（内置）
    '📻 深夜电台', '🎶 共享歌单', '📼 留声机', '🎵 TA写给你的歌',
    # 283：TA被困了删掉；角色立绘差分内置进本体（js/72）
    '🆘 TA被困了', '角色立绘差分']
# 不出插件的源码（已经并进别的地方了）：86 直播间 → 并进 📱 软件 的抖音（256），别再打进全家桶
SKIP = {'86', '126', '02', '29', '56', '70', '127'}   # 127 TA被困了：283 她说删掉   # 02/29/56/70：音乐类并进网易云，编进本体 js/61-soft.js（插件/软件/源码/build.py）   # 126 老的小红书：📱 软件里有完整的小红书了（她 10/28 说拿掉）

def load(f):
    body = open(f, encoding='utf-8').read()
    if '__INTRO_EARLY__' in body: body = body.replace('__INTRO_EARLY__', json.dumps(open(os.path.join(src, 'intro-early.js'), encoding='utf-8').read(), ensure_ascii=False))
    name = re.sub(r'^\d+-', '', os.path.basename(f)[:-3])
    m = re.match(r'/\*\s*(\S+)\s+(.*?)\s*\*/', body, re.S)
    desc = (m.group(2) if m else name).split('：', 1)[-1].strip()
    icon = m.group(1) if m else ''
    return {'num': re.match(r'^(\d+)', os.path.basename(f)).group(1), 'name': name, 'full': f'{icon} {name}', 'icon': icon, 'desc': desc, 'body': body}

files = {load(f)['num']: load(f) for f in sorted(glob.glob(os.path.join(src, '[0-9]*.js')), key=lambda f: int(re.match(r'^(\d+)', os.path.basename(f)).group(1)))}
inb = {n for _, _, L in BUNDLES for n in L}
if os.path.basename(out) == 'out':
    for f in glob.glob(os.path.join(out, '*.json')): os.remove(f)
allp, mapping = [], {}
def emit(name, desc, code, srcname):
    p = {'name': name, 'type': 'script', 'scope': 'global', 'enabled': True, 'description': desc, 'onLoad': common + '\n' + code + '\n//# sourceURL=gyx-plugin/' + srcname + '.js'}
    allp.append(p)   # 283：新玩法内置进本体（js/62-play.js），不再一个合集一个 .json；全家桶留着给测试 / 分享用
for num, p in files.items():
    if num in inb or num in SKIP: continue
    emit(p['full'], p['desc'], p['body'], p['name'])
for icon, title, L in BUNDLES:
    ms = [files[n] for n in L]
    full = f'{icon} {title}'
    shown = [m for m in ms if m['num'] != '85']
    desc = f'合并了 {len(shown)} 个：' + ' · '.join(m['full'] for m in shown) + '。每一个都还能在「插件开关中心」里单独关。'
    # 每个原插件单独跑（带自己的 sourceURL）：报错时知道是哪一个，省电模式的「插件体检」也还能按原来的名字认定时器
    code = '\n'.join(f'/* ==== {m["full"]} ==== */\ntry {{ new Function(\'X\', \'applyMacros\', {json.dumps(m["body"] + chr(10) + "//# sourceURL=gyx-plugin/" + m["name"] + ".js", ensure_ascii=False)})(X, typeof applyMacros !== \'undefined\' ? applyMacros : undefined); }} catch (e) {{ console.error(\'[插件] {m["full"]} 出错：\', e); }}' for m in ms)
    emit(full, desc, code, title)
    mapping[full] = [[m['full'], re.findall(r"X\.feat\('(\w+)'", m['body'])] for m in ms if m['num'] != '85']
# 改过名的：旧名字也认，装了合并版就把旧名字的单个插件拿掉
RENAMED = {'83': ['🛡️ 别把她写弱'], '24': ['📞 来电动画和铃声', '📞 来电增强'], '49': ['💓 贴贴']}   # 49：282 贴贴整个并进陪你   # 24：10/28 两个来电插件合成「📞 来电」
for icon, title, L in BUNDLES:
    for n in L:
        for old in RENAMED.get(n, []):
            mapping[f'{icon} {title}'].append([old, re.findall(r"X\.feat\('(\w+)'", files[n]['body'])])
json.dump(allp, open(os.path.join(out, '新玩法全家桶.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# 283：新玩法都内置了——装过的任何一个（合集、单个、改过名的）都拿掉；你关着的那些，内置的也关着
builtin = {}
for b, L in mapping.items():
    builtin[b] = sorted({f for _, fs in L for f in fs})
    for o, fs in L: builtin.setdefault(o, sorted(set(fs)))
for num, p in files.items():
    if num not in inb and num not in SKIP: builtin[p['full']] = re.findall(r"X\.feat\('(\w+)'", p['body'])
json.dump({'bundles': mapping, 'retired': RETIRED, 'builtin': builtin}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bundles.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(allp), 'plugins')

# 283：新玩法全部内置进本体 —— 生成 js/62-play.js（每个原插件包在自己的函数里跑，跟当插件时一样；都有防重复加载）
mods = [[p['name'], p['body']] for num, p in files.items() if num not in SKIP]
root = os.path.dirname(os.path.dirname(os.path.dirname(src)))
js = """/* =====================================================================
   js/62 —— 🧩 新玩法内置（283）
   由「插件/新玩法/源码/build.py」生成，**别手改**：改源码里的 NN-xxx.js，再跑一次 build.py。
   以前这些是要导入的插件（新玩法全家桶），现在谷雨自带；装过的插件会被 js/79 自动拿掉（数据、开关都不动）。
   跟当插件时一样，等谷雨启动完（__guyuBooted）再一个个跑；每个都有防重复加载，导入旧全家桶也不会跑两遍。
   ===================================================================== */
(function () {
    if (window.__gyPlayBuiltin) return;
    // 自动化测试里默认不跑（老测试是按「没装插件 / 自己导入全家桶」写的）；要测内置的，先 localStorage.gyPlayOn = '1'
    try { if (navigator.webdriver && localStorage.getItem('gyPlayOn') !== '1') return; } catch (e) {}
    window.__gyPlayBuiltin = 1;
    const MODS = """ + json.dumps(mods, ensure_ascii=False) + """;
    window.__gyPlayMods = MODS.map(m => m[0]);
    function run() {
        const X = window.GYX; if (!X) return setTimeout(run, 200);
        MODS.forEach(([n, b]) => { try { new Function('X', 'applyMacros', b + '\\n//# sourceURL=gyx-builtin/' + n + '.js')(X, typeof applyMacros !== 'undefined' ? applyMacros : undefined); } catch (e) { console.error('[内置新玩法] ' + n + ' 出错：', e); } });
        window.__gyPlayReady = 1;
        try { window.dispatchEvent(new CustomEvent('gy-play-ready')); } catch (e) {}
    }
    (function wait() { if (window.__guyuBooted) run(); else setTimeout(wait, 80); })();
})();
"""
open(os.path.join(root, 'js', '62-play.js'), 'w', encoding='utf-8').write(js)
print('js/62-play.js', len(mods), 'modules', len(js)//1024, 'KB')
