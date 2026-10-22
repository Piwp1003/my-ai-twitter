# 用 GitHub 打谷雨 APK（离线打包）

不用 HBuilderX 云打包（不会报「插件未购买」），也不用自己配 Android Studio。

## 一次性准备
1. **离线 SDK**：DCloud 只放在网盘里，下载后传到本仓库标签为 `sdk` 的 Release（原样传 zip）。
2. **证书**：仓库 Settings → Secrets and variables → Actions，建
   - `KEYSTORE_B64`：证书文件的 base64
   - `KEYSTORE_PASS`：证书密码
   （别名默认 `h5c498173`；证书和 DCloud「离线打包 Key」登记的 SHA1 必须一致）

## 打包
Actions → 「打包 APK」→ Run workflow（或者改动本文件夹 / 换 Release 里的 SDK 也会自动跑）。
跑完在那次运行页面底下的 **Artifacts → guyu-apk** 下载 APK。

## 文件
- `www-manifest.json`：放进 APK 的 `www/manifest.json`（5+ 运行时读应用名、版本、入口）
- `patch.py`：改离线工程里的 appid、离线打包 Key、包名、版本、应用名
- `sign.py`：让 release / debug 都用你的证书签名
- 谷雨守护插件：直接把 `安卓插件/nativeplugins/GuyuGuard/android/GuyuGuard.aar` 放进 `libs`，
  它里面的无障碍 / 通知监听服务和权限编译时自动合并进 APK；网页那边用 Native.js 调，不用另外注册插件。

改了网页代码要出新包：记得先把 `www-manifest.json` 里的 version（name / code）调大，再跑一次。
