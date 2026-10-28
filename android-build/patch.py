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
    # 谷雨守护：示例工程本来就有 implementation fileTree(dir: 'libs', include: ['*.aar', '*.jar'])，
    # aar 丢进 libs 就会编进去（服务和权限自动合并）。别再另外写 implementation(name:'GuyuGuard')——会重复，编译直接失败（279 那次就是）。
    return s
edit(d / 'build.gradle', gradle)

# strings.xml：应用名
edit(d / 'src/main/res/values/strings.xml',
     lambda s: re.sub(r'(<string name="app_name">)[^<]*(</string>)', rf'\g<1>{m["name"]}\2', s))

# 权限：离线工程默认一条都没有（云打包时 HBuilderX 按模块自动加）。补上谷雨用得到的
PERMS = ['INTERNET', 'ACCESS_NETWORK_STATE', 'ACCESS_WIFI_STATE', 'CHANGE_NETWORK_STATE', 'WAKE_LOCK', 'VIBRATE', 'FLASHLIGHT',
         'CAMERA', 'RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION',
         'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_MEDIA_AUDIO',
         'POST_NOTIFICATIONS', 'FOREGROUND_SERVICE', 'WRITE_SETTINGS',
         # 谷雨守护用到的（aar 清单里也有，这里在主清单再声明一遍，防止合并漏掉）
         'PACKAGE_USAGE_STATS', 'QUERY_ALL_PACKAGES', 'SYSTEM_ALERT_WINDOW', 'ACCESS_NOTIFICATION_POLICY',
         'SET_WALLPAPER', 'REQUEST_IGNORE_BATTERY_OPTIMIZATIONS']
def perms(s):
    add = ''.join(f'\n    <uses-permission android:name="android.permission.{p}"/>' for p in PERMS if f'permission.{p}"' not in s)
    return re.sub(r'(<manifest[^>]*>)', rf'\1{add}', s, count=1) if add else s
edit(d / 'src/main/AndroidManifest.xml', perms)

# 推送模块（plus.push.createMessage 本地通知要用）：注册 Push 功能，aar 由工作流从 SDK/libs 拷进来
def props(s):
    if 'name="Push"' not in s:
        s = s.replace('<features>', '<features>\n\t\t<feature name="Push" value="io.dcloud.feature.aps.APSFeatureImpl"/>', 1)
    return s.replace('<feature name="plugintest" value="com.example.H5PlusPlugin.PGPlugintest"/>', '')
edit(d / 'src/main/assets/data/dcloud_properties.xml', props)

# 图标：换成谷雨的
import shutil
src = pathlib.Path(__file__).resolve().parent.parent / 'icons' / 'icon-192.png'
for ic in d.glob('src/main/res/drawable*/icon.png'):
    shutil.copyfile(src, ic); print('换了图标', ic)

# 启动图：用 启动页/ 里那套（跟以前 HBuilderX 云打包时一样），按屏幕密度放进去，盖掉 DCloud 默认的 splash
SPLASH = {'drawable': 'xhdpi_720x1242.png', 'drawable-ldpi': 'ldpi_320x442.png', 'drawable-mdpi': 'mdpi_240x282.png',
          'drawable-hdpi': 'hdpi_480x762.png', 'drawable-xhdpi': 'xhdpi_720x1242.png',
          'drawable-xxhdpi': 'xxhdpi_1080x1882.png', 'drawable-xxxhdpi': 'xxxhdpi_1440x2560.png'}
sp = pathlib.Path(__file__).resolve().parent.parent / '启动页'
for folder, img in SPLASH.items():
    if (sp / img).exists():
        (d / 'src/main/res' / folder).mkdir(parents=True, exist_ok=True)
        shutil.copyfile(sp / img, d / 'src/main/res' / folder / 'splash.png')
        print('启动图', folder, '←', img)
