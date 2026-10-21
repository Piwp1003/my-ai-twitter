# 📱 软件合集的打包：python build.py
# 每个软件 = 公用小工具(_common.js) + 软件公用层(_soft.js) + 这个软件自己的代码
# 输出：../微博.json、../泡泡.json …… 和 ../软件全家桶.json（全部软件合一个，导这一个就够）
#
# 📲 真手机是“内置”的，不走插件导入那一套：它编进 本体的 js/61-real-phone.js，
#    跟着 app 一起加载、不用手动导入。所以它不进 软件全家桶、也不单独出 真手机.json。
#    改真手机 = 改 60-真手机.js，再跑一次这个脚本，js/61-real-phone.js 就自动更新了。
import json, os, re, glob
src = os.path.dirname(os.path.abspath(__file__))
out = os.path.dirname(src)                          # 插件/软件
root = os.path.dirname(os.path.dirname(out))        # 仓库根目录
BUILTIN = {'真手机'}                                 # 这些是内置的，不进插件
rd = lambda f: open(os.path.join(src, f), encoding='utf-8').read()
common, soft = rd('_common.js'), rd('_soft.js')

def info(f):
    body = open(f, encoding='utf-8').read()
    name = re.sub(r'^\d+-', '', os.path.basename(f)[:-3])
    m = re.match(r'/\*\s*(\S+)\s+(.*?)\s*\*/', body, re.S)
    icon = m.group(1) if m else ''
    desc = (m.group(2) if m else name).split('：', 1)[-1].strip()
    desc = re.sub(r'\s+', ' ', desc)[:220]
    return {'name': name, 'full': f'{icon} {name}', 'desc': desc, 'body': body}

allapps = [info(f) for f in sorted(glob.glob(os.path.join(src, '[0-9]*.js')))]
apps = [a for a in allapps if a['name'] not in BUILTIN]          # 走插件的
builtins = [a for a in allapps if a['name'] in BUILTIN]          # 内置的

def dump(fn, p):
    s = json.dumps([p], ensure_ascii=False, indent=1)
    open(os.path.join(out, fn), 'w', encoding='utf-8').write(s)

for a in apps:
    dump(a['name'] + '.json', {'name': a['full'], 'type': 'script', 'scope': 'global', 'enabled': True, 'description': a['desc'],
        'onLoad': common + '\n' + soft + '\n' + a['body'] + '\n//# sourceURL=gyx-plugin/' + a['name'] + '.js'})
code = '\n'.join(f'/* ==== {a["full"]} ==== */\ntry {{ new Function(\'X\', {json.dumps(a["body"] + chr(10) + "//# sourceURL=gyx-plugin/" + a["name"] + ".js", ensure_ascii=False)})(X); }} catch (e) {{ console.error(\'[插件] {a["full"]} 出错：\', e); }}' for a in apps)
dump('软件全家桶.json', {'name': '📱 软件全家桶', 'type': 'script', 'scope': 'global', 'enabled': True,
    'description': f'合并了 {len(apps)} 个软件：' + ' · '.join(a['full'] for a in apps) + '。每个软件都是整页的界面，在「小功能」→「📱 软件」里打开；每一个都能在「插件开关中心」里单独关。',
    'onLoad': common + '\n' + soft + '\n' + code + '\n//# sourceURL=gyx-plugin/软件全家桶.js'})

# ---- 内置：编进本体的 js/，不用导入插件 ----
# 跟插件 onLoad 一样的套路（公用层 + 软件层 + 本体 全在一个函数作用域里，所以本体顶层的 return / const X 都成立），
# 只是改成页面一加载就自己跑的 IIFE；公用层带 if(!window.GYX) 守卫，就算用户又导了插件也不会重复建。
BUILTIN_FILE = {'真手机': 'js/61-real-phone.js'}
for a in builtins:
    rel = BUILTIN_FILE.get(a['name'])
    if not rel:
        continue
    head = ('/* 📲 真手机（内置版，自动生成，别手改这个文件）\n'
            '   源码在 插件/软件/源码/60-真手机.js，改完在 插件/软件/源码/ 跑 python3 build.py 就会重新生成这里。\n'
            '   内置了“新玩法公用层(GYX)”“软件公用层(GYS)”和真手机本体，不用再导入任何插件就能用。 */\n')
    js = (head +
          ';(function (applyMacros) {\n' +
          common + '\n' + soft + '\n' + a['body'] +
          '\n//# sourceURL=guyu-builtin/' + a['name'] + '.js\n' +
          '})(typeof applyMacros === "function" ? applyMacros : (window.applyMacros || null));\n')
    p = os.path.join(root, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(js)

print('打包好了：', ', '.join(a['name'] for a in apps), '+ 软件全家桶')
print('内置生成：', ', '.join(f"{a['name']} → {BUILTIN_FILE.get(a['name'])}" for a in builtins))
