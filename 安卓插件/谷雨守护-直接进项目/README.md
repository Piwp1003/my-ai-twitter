# 谷雨守护 · 直接进项目（源码叠加包）

这是「**不做成插件，把源码直接放进 app**」的现成材料——文件已经按
Android 项目的目录摆好位置，你下完 DCloud 离线 SDK 后，把这里的东西**盖到**
SDK 示例工程的 app 模块上就行，不用自己新建目录。

> 配合《文档/谷雨守护离线打包说明.md》第七节看。前面一~六节讲怎么搭环境、
> 放谷雨网页、编 APK、装完授权，这里只替换掉「第三节·装 aar」那一步——
> 用源码，不用 aar、不用 nativePlugins，也就没有「未购买」报错。

---

## 里面有什么

```
app/src/main/java/com/guyu/guard/
    Guard.java        看屏幕时间、截屏、锁屏、换壁纸、设闹钟… 每个本事是一个静态方法
    GuardAccess.java  无障碍服务：挡被锁的软件（回桌面 + 把谷雨拉回来）
    GuardNotify.java  通知监听服务：读别的软件的通知
app/src/main/res/xml/guyu_guard_access.xml       无障碍配置
app/src/main/res/values/guyu_guard_strings.xml   无障碍里给用户看的说明文案
要加进AndroidManifest的片段.xml                    权限 + 两个 service（往 manifest 里并）
```

> 故意**没放** `GuardModule.java` 和 `stubs/`：
> - `GuardModule.java` 是给 uni-app 用的空壳，谷雨用 `importClass` 直接调 `Guard`，
>   用不到它；5+ 离线 SDK 里也多半没有它要继承的 `UniModule`，放了反而编不过。
> - `stubs/` 只是让没装安卓 SDK 时也能编过的「假接口」，app 模块里有真 SDK，不需要。

---

## 为什么没法给你「打开就能 build」的整包

谷雨整个是 DCloud 5+App（推送、存档、网络、原生弹窗全靠 DCloud 运行时），
所以**必须**用 DCloud 的离线 SDK 做底座，没法换成普通 WebView。而那个 SDK
要登录你的 DCloud 账号才能下，没法预先塞进仓库。所以流程永远是：
**你下 SDK 底座 → 把下面这些盖上去。** 下面这四步就是全部要盖的东西，对着做完即可。

---

## 四步装好（对着这一个清单走就行）

先下好 SDK 示例工程并能原样编过（见《谷雨守护离线打包说明.md》第零~一节）。
假设它的 app 模块在 `HBuilder-Integrate-AS/app/`（名字以你下到的为准）。

### 1. 拷谷雨网页 → app 的 www

把谷雨这些（仓库根目录）拷进 `app/src/main/assets/apps/<你的AppID>/www/`，
`<你的AppID>` 要和 HBuilderX 里 `manifest.json` 的 AppID 一致：

```
index.html   style.css 及其它 .css   js/（整个，含 js/vendor/）
icons/  img/  media/  启动页/   pwa-manifest.json（可选）
```
**不要拷**：`manifest.json`（PWA 的）、`_开发测试/`、`桌面版/`、`_tmp/`、各种备份。

### 2. 拷本目录的源码和资源 → app/src/main

把本目录里的 `app/src/main/` 整个盖到 SDK 的 `app/src/main/` 上：

- `java/com/guyu/guard/` 三个 `.java` → 包名 `com.guyu.guard`，和 www 里的 js 对得上。
- `res/xml/guyu_guard_access.xml`、`res/values/guyu_guard_strings.xml` → 并进 app 的 res。
  （app 已有 `res/values/strings.xml` 的话，把 `guyu_guard_strings.xml` 里那行
  `<string name="guyu_guard_desc">…</string>` 贴进去也行。）

### 3. 并 manifest

打开 `要加进AndroidManifest的片段.xml`，按里面 ①②③ 的注释，把权限和两个
`<service>` 并进 app 的 `AndroidManifest.xml`。根标签 `<manifest>` 上确认有
`xmlns:tools="http://schemas.android.com/tools"`。

### 4. 什么都不用再配

- **不要** `nativePlugins`、不要注册插件——`plus.android.importClass('com.guyu.guard.Guard')`
  会直接找到编进 app 的类。
- **不用**改 `build.gradle` 加依赖——源码直接进项目，没有 aar 要引。

做完 → **Build → Build APK(s)**，再照《离线打包说明》第五节装上、开 5 个权限、
在「📲 真手机 → 设置」里看到「✓ 谷雨守护 装好了」。

编译报 `找不到符号` 多半是漏了 `xmlns:tools`，或 app 的 `compileSdkVersion`
太低——提到 30 以上再编。

---

## 改功能

想加新本事：在 `Guard.java` 里加一个 `public static` 方法，网页 `60-真手机.js` 的
`N` 那段里加一句 `新名字: () => c('新名字', ctx)` 就能调。两边名字对上即可。
（源码的「母本」在 `安卓插件/GuyuGuard-源码与构建/`，那套是为了打 aar 用的；
这里是为了直接进项目用的，改哪套都行，别两套同时塞进一个 app。）
