# 谷雨热更新包（291）：Cloudflare Pages 每次部署时跑（构建命令：python3 tools/make_update.py），在 update/ 里生成：
#   latest.json —— 最新版本号（index.html 里的 GY_VERSION）、这版的公告、文件清单（每个文件的 sha1 和大小）
#   guyu.wgt    —— 安卓 App 用的资源包（就是一个 zip：manifest.json + 网页文件），App 下载后 plus.runtime.install 装上、重启
# 桌面版 exe 按 latest.json 的清单只下载变了的文件（guyu.pw/<路径>）。
# 只用 Python 自带的库；文件名都是英文（安卓打包不能有中文文件名）。
import hashlib, json, os, re, sys, zipfile, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ['index.html', 'style.css']
DIRS = ['js', 'icons', 'img', 'media']
# 297：没有任何地方在用的旧文件不进更新包（黑白杂志风 220 就删了，图和脚本还留在文件夹里；多出来的图标）——包小 0.8MB 左右
SKIP = ('img/mag/', 'js/93-phone-mag.js', 'icons/icon-512-1.png')
OUT = os.path.join(ROOT, 'update')
os.makedirs(OUT, exist_ok=True)

def walk():
    for f in FILES:
        if os.path.isfile(os.path.join(ROOT, f)): yield f
    for d in DIRS:
        for dp, dn, fn in os.walk(os.path.join(ROOT, d)):
            dn.sort()
            for n in sorted(fn):
                p = os.path.relpath(os.path.join(dp, n), ROOT).replace(os.sep, '/')
                if re.search(r'[^\x00-\x7f]', p): continue   # 中文名的文件不进包
                if p.startswith(SKIP): continue
                yield p

html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
m = re.search(r'GY_VERSION\s*=\s*(\d+)', html)
ver = int(m.group(1)) if m else 0
notes = []
try:
    js = open(os.path.join(ROOT, 'js', '92d-update-notes.js'), encoding='utf-8').read()
    j = re.search(r'/\*JSON\*/(.*?)/\*END\*/', js, re.S)
    if j: notes = json.loads(j.group(1))[:3]
except Exception as e:
    print('公告没读到：', e)

files = {}
for p in walk():
    b = open(os.path.join(ROOT, p), 'rb').read()
    files[p] = [hashlib.sha1(b).hexdigest(), len(b)]

# 安卓资源包
man = {}
try: man = json.load(open(os.path.join(ROOT, 'android-build', 'www-manifest.json'), encoding='utf-8'))
except Exception as e: print('没有 www-manifest.json：', e)
wgt = os.path.join(OUT, 'guyu.wgt')
with zipfile.ZipFile(wgt, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    if man: z.writestr('manifest.json', json.dumps(man, ensure_ascii=False, indent=2))
    for p in files: z.write(os.path.join(ROOT, p), p)

latest = {'ver': ver, 'at': int(time.time() * 1000), 'notes': notes, 'wgt': 'update/guyu.wgt', 'wgtSize': os.path.getsize(wgt),
          'app': (man.get('version') or {}).get('name', ''), 'files': files}
json.dump(latest, open(os.path.join(OUT, 'latest.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print('热更新包：版本 %d，%d 个文件，wgt %.1f MB' % (ver, len(files), os.path.getsize(wgt) / 1048576))
