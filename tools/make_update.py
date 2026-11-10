# 谷雨热更新包（291）：Cloudflare Pages 每次部署时跑（构建命令：python3 tools/make_update.py），在 update/ 里生成：
#   latest.json —— 最新版本号（index.html 里的 GY_VERSION）、这版的公告、文件清单（每个文件的 sha1 和大小）
#   guyu.wgt    —— 安卓 App 用的资源包（就是一个 zip：manifest.json + 网页文件），App 下载后 plus.runtime.install 装上、重启
# 桌面版 exe 按 latest.json 的清单只下载变了的文件（guyu.pw/<路径>）。
# 只用 Python 自带的库；文件名都是英文（安卓打包不能有中文文件名）。
import hashlib, json, os, re, sys, zipfile, time, urllib.request
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
app = (man.get('version') or {}).get('name', '')
# 299：包里 manifest 的版本号写成「安装包版本.网页版本」（比如 1.53.299）。
#      差量包（只装改过的文件）要对上「这台手机现在是哪一版」，以前所有网页版本都写同一个 1.5x，对不上。
mver = '%s.%d' % (app, ver) if app else str(ver)
man_out = json.loads(json.dumps(man)) if man else {}
if man_out: man_out.setdefault('version', {})['name'] = mver
man_txt = json.dumps(man_out, ensure_ascii=False, indent=2)
wgt = os.path.join(OUT, 'guyu.wgt')
with zipfile.ZipFile(wgt, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    if man: z.writestr('manifest.json', man_txt)
    for p in files: z.write(os.path.join(ROOT, p), p)

# ---------- 299：差量包（wgtu）----------
# 做法：部署前先去线上把「前几版各有哪些文件」（update/history.json）拿回来，跟这一版比，
#       给每个旧版本各做一个只装「改过 / 新加」文件的小包 update/p/<旧>-<新>.wgtu（DCloud 的差量升级包格式：
#       update.xml + www/，www 里必须有 manifest.json；update.xml 里 basis = 旧版本 manifest 的版本号、remove = 要删的文件）。
#       拿不到历史（第一次 / 断网）就不做差量包，App 照旧下整包，不影响。
SITE = os.environ.get('GY_SITE', 'https://guyu.pw/')
KEEP = 6
def fetch_hist():
    f = os.environ.get('GY_HIST_FILE')
    try:
        if f: return json.load(open(f, encoding='utf-8'))
        with urllib.request.urlopen(urllib.request.Request(SITE + 'update/history.json?fresh=%d' % time.time(), headers={'User-Agent': 'guyu-make-update'}), timeout=20) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        print('没拿到线上的历史清单（这次不做差量包）：', e); return {}
hist = fetch_hist() if man else {}
if not isinstance(hist, dict): hist = {}
patches = {}
APPID = man.get('id', '') if man else ''
pdir = os.path.join(OUT, 'p'); os.makedirs(pdir, exist_ok=True)
for k in sorted(hist, key=lambda x: int(x) if str(x).isdigit() else 0):
    try:
        h = hist[k]; hv = int(k)
        if hv >= ver or not h.get('mver') or not isinstance(h.get('files'), dict): continue
        old = h['files']
        changed = [p for p in files if p not in old or old[p][0] != files[p][0]]
        removed = [p for p in old if p not in files]
        name = 'p/%d-%d.wgtu' % (hv, ver)
        xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<wgtu appid="%s">' % APPID, '    <basis version="%s"/>' % h['mver']]
        if removed: xml += ['    <remove>'] + ['        <item path="%s"/>' % p for p in removed] + ['    </remove>']
        xml += ['</wgtu>', '']
        fp = os.path.join(OUT, name)
        with zipfile.ZipFile(fp, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            z.writestr('update.xml', '\n'.join(xml))
            z.writestr('www/manifest.json', man_txt)
            for p in changed: z.write(os.path.join(ROOT, p), 'www/' + p)
        size = os.path.getsize(fp)
        if size > os.path.getsize(wgt) * 0.8: os.remove(fp); continue      # 差不多跟整包一样大，就不费这个事
        patches[str(hv)] = {'u': 'update/' + name, 'size': size, 'basis': h['mver'], 'n': len(changed), 'rm': len(removed)}
        print('差量包 %d → %d：%d 个文件，%.0f KB' % (hv, ver, len(changed), size / 1024))
    except Exception as e:
        print('差量包没做成', k, e)
# 这一版自己也记进历史（下一版拿它来比），只留最近几版
hist2 = {k: v for k, v in hist.items() if str(k).isdigit() and int(k) < ver}
for k in sorted(hist2, key=int)[:max(0, len(hist2) - (KEEP - 1))]: hist2.pop(k, None)
hist2[str(ver)] = {'mver': mver, 'files': files}
json.dump(hist2, open(os.path.join(OUT, 'history.json'), 'w', encoding='utf-8'), ensure_ascii=False)

latest = {'ver': ver, 'at': int(time.time() * 1000), 'notes': notes, 'wgt': 'update/guyu.wgt', 'wgtSize': os.path.getsize(wgt),
          'app': app, 'mver': mver, 'patches': patches, 'files': files}
json.dump(latest, open(os.path.join(OUT, 'latest.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print('热更新包：版本 %d（%s），%d 个文件，wgt %.1f MB，差量包 %d 个' % (ver, mver, len(files), os.path.getsize(wgt) / 1048576, len(patches)))
