"""Package a compiled production-only GuyuGuard jar; never includes Android stubs or test harnesses."""
import sys, pathlib, zipfile, shutil, hashlib, json
root = pathlib.Path(__file__).resolve().parent.parent
jar = pathlib.Path(sys.argv[1]).resolve()
source = root / '安卓插件' / 'GuyuGuard-源码与构建'
plugin = root / '安卓插件' / 'nativeplugins' / 'GuyuGuard'
with zipfile.ZipFile(jar) as archive:
    entries = archive.namelist()
    required = ['com/guyu/guard/Guard.class', 'com/guyu/guard/GuardAccess.class', 'com/guyu/guard/GuardOrder.class', 'com/guyu/guard/GuardReceipt.class']
    assert all(name in entries for name in required), 'Native classes missing'
    assert not any(name.startswith(('android/', 'androidx/', 'io/dcloud/')) or 'SafetyTest' in name for name in entries), 'Stubs/tests must not be shipped'
shutil.copy2(jar, source / 'aar/classes.jar')
out = plugin / 'android/GuyuGuard.aar'
out.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted((source / 'aar').rglob('*')):
        if file.is_file(): archive.write(file, file.relative_to(source / 'aar').as_posix())
shutil.copytree(source / 'src/com', plugin / '源码-java/com', dirs_exist_ok=True)
print(json.dumps({'aar': str(out), 'bytes': out.stat().st_size, 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(), 'production_only': True}, ensure_ascii=False))
