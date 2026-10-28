# 📱 软件的打包：python3 build.py
# 10/28 起：软件全都「内置」——编进本体的 js/61-soft.js，跟着 app 一起加载，不用再导入插件。
#   不再出 软件全家桶.json / 微博.json 这些单独的插件（装过的老插件会被本体自动拿掉，数据不动）。
#   改哪个软件 = 改 插件/软件/源码/ 里那个 .js，再跑一次这个脚本，js/61-soft.js 就自动更新了。
# 🎵 音乐类的新玩法（深夜电台、共享歌单、留声机、TA写给你的歌）并进了网易云，一起编进来（源码还在 插件/新玩法/源码/）。
import json, os, re, glob
src = os.path.dirname(os.path.abspath(__file__))
out = os.path.dirname(src)                          # 插件/软件
root = os.path.dirname(os.path.dirname(out))        # 仓库根目录
newsrc = os.path.join(root, '插件', '新玩法', '源码')
rd = lambda f: open(os.path.join(src, f), encoding='utf-8').read()
common, soft = rd('_common.js'), rd('_soft.js')
MUSIC_EXTRA = ['02-深夜电台.js', '29-共享歌单.js', '56-留声机.js', '70-TA写给你的歌.js']   # 放在网易云前面

def info(f):
    body = open(f, encoding='utf-8').read()
    name = re.sub(r'^\d+-', '', os.path.basename(f)[:-3])
    m = re.match(r'/\*\s*(\S+)\s+(.*?)\s*\*/', body, re.S)
    icon = m.group(1) if m else ''
    return {'name': name, 'full': f'{icon} {name}', 'body': body}

apps = []
for f in sorted(glob.glob(os.path.join(src, '[0-9]*.js'))):
    if os.path.basename(f).startswith('70-'):
        apps += [info(os.path.join(newsrc, x)) for x in MUSIC_EXTRA]
    apps.append(info(f))

def run(a):
    return (f'/* ==== {a["full"]} ==== */\ntry {{ new Function(\'X\', \'applyMacros\', {json.dumps(a["body"] + chr(10) + "//# sourceURL=gyx-plugin/" + a["name"] + ".js", ensure_ascii=False)})(X, applyMacros); }} '
            f'catch (e) {{ console.error(\'[内置软件] {a["full"]} 出错：\', e); }}')

head = ('/* 📱 软件（内置版，自动生成，别手改这个文件）\n'
        '   源码在 插件/软件/源码/（音乐类新玩法在 插件/新玩法/源码/），改完在 插件/软件/源码/ 跑 python3 build.py 就会重新生成这里。\n'
        '   内置了“新玩法公用层(GYX)”“软件公用层(GYS)”和全部软件，不用再导入任何插件就能用。 */\n')
js = (head + ';(function (applyMacros) {\n' + common + '\n' + soft + '\nwindow.__gySoftBuiltin = 1;\n' +
      '\n'.join(run(a) for a in apps) +
      '\n//# sourceURL=guyu-builtin/软件.js\n})(typeof applyMacros === "function" ? applyMacros : (window.applyMacros || null));\n')
open(os.path.join(root, 'js', '61-soft.js'), 'w', encoding='utf-8').write(js)
print('内置生成 js/61-soft.js：', '、'.join(a['name'] for a in apps))
