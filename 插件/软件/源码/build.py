# 📱 软件合集的打包：python build.py
# 每个软件 = 公用小工具(_common.js) + 软件公用层(_soft.js) + 这个软件自己的代码
# 输出：../微博.json、../泡泡.json …… 和 ../软件全家桶.json（全部软件合一个，导这一个就够）
import json, os, re, glob
src = os.path.dirname(os.path.abspath(__file__))
out = os.path.dirname(src)
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

apps = [info(f) for f in sorted(glob.glob(os.path.join(src, '[0-9]*.js')))]
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
print('打包好了：', ', '.join(a['name'] for a in apps), '+ 软件全家桶')
