# 改离线工程：appid、离线打包 Key、包名、版本号、应用名
# 用法：python3 patch.py <simpleDemo目录> <appid> <包名> <appkey>
import re, sys, pathlib, json
d, appid, pkg, key = sys.argv[1:5]
d = pathlib.Path(d)
m = json.load(open(pathlib.Path(__file__).with_name('www-manifest.json'), encoding='utf-8'))
ver_name, ver_code = m['version']['name'], str(m['version']['code'])

def edit(p, fn):
    p = pathlib.Path(p)
    if not p.exists():
        print('⚠️ 没找到', p); return
    old = p.read_text(encoding='utf-8'); new = fn(old)
    p.write_text(new, encoding='utf-8')
    print(('改了 ' if new != old else '没变 ') + str(p))

# dcloud_control.xml：只留一个 app，appid 换成谷雨的
edit(d / 'src/main/assets/data/dcloud_control.xml',
     lambda s: re.sub(r'<app\s[^>]*?/>', f'<app appid="{appid}" appver=""/>', s, count=1))

# AndroidManifest.xml：离线打包 Key
def man(s):
    if 'dcloud_appkey' in s:
        return re.sub(r'(android:name="dcloud_appkey"\s+android:value=")[^"]*(")', rf'\g<1>{key}\2', s)
    return re.sub(r'(<application[^>]*>)', rf'\1\n        <meta-data android:name="dcloud_appkey" android:value="{key}"/>', s, count=1)
edit(d / 'src/main/AndroidManifest.xml', man)

# build.gradle：包名、版本
def gradle(s):
    s = re.sub(r'applicationId\s+["\'][^"\']*["\']', f'applicationId "{pkg}"', s)
    s = re.sub(r'versionCode\s+\d+', f'versionCode {ver_code}', s)
    s = re.sub(r'versionName\s+["\'][^"\']*["\']', f'versionName "{ver_name}"', s)
    return s
edit(d / 'build.gradle', gradle)

# strings.xml：应用名
edit(d / 'src/main/res/values/strings.xml',
     lambda s: re.sub(r'(<string name="app_name">)[^<]*(</string>)', rf'\g<1>{m["name"]}\2', s))
