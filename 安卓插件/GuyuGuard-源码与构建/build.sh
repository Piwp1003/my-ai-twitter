#!/usr/bin/env bash
# 重新打包「谷雨守护」原生插件（GuyuGuard.aar）
# 用法：在这个目录（有 src/ stubs/ aar/ 的地方）执行  bash build.sh
# 需要：JDK（java/javac，装了 Android Studio 或任意 JDK 8+ 都行）。不需要整套 Android SDK——
#       我们用 stubs/ 里手写的「安卓接口占位」只为了让 javac 能编过，真正运行时用的是手机系统里的那套。
set -e
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here"
echo "① 编译 Java（src + stubs 占位）…"
rm -rf out && mkdir -p out
javac --release 8 -implicit:none -nowarn -d out -sourcepath "src:stubs" $(find src -name '*.java')
echo "② 打包 classes.jar…"
( cd out && jar cf "$here/aar/classes.jar" com )
echo "③ 压成 GuyuGuard.aar…"
cd aar
rm -f "$here/GuyuGuard.aar"
zip -q -r "$here/GuyuGuard.aar" AndroidManifest.xml classes.jar R.txt res
cd "$here"
echo "④ 放到插件目录…"
cp -f GuyuGuard.aar plugin/GuyuGuard/android/GuyuGuard.aar
# 源码也同步一份到插件里，方便查看
mkdir -p plugin/GuyuGuard/源码-java
cp -rf src/com plugin/GuyuGuard/源码-java/
echo "✅ 打包好了：plugin/GuyuGuard/android/GuyuGuard.aar"
echo "   把 plugin/GuyuGuard 这个文件夹放进 HBuilderX 项目的 nativeplugins/ 里，重新云打包即可。"
