# 用 HBuilderX 打包 APK

## 白屏是怎么回事

**`manifest.json` 撞名了。**

HBuilderX 的 5+App 项目里，根目录的 `manifest.json` 是 **HBuilderX 自己的应用配置**——
appid、应用名、版本号、入口页、权限、启动图，全都写在里面。

而谷雨原本也有一个 `manifest.json`，那是 PWA（网页装到桌面）用的，格式完全不同。

你新建 5+App 项目、把谷雨文件拷进去的时候，谷雨那份把 HBuilderX 的配置**整个覆盖掉了**。
打出来的包没有有效配置，自然就是白屏。

已经从根上改掉：谷雨的 PWA 配置改名成 **`pwa-manifest.json`**，`manifest.json` 这个名字
彻底让给 HBuilderX，以后再怎么拷都不会撞。

---

## 现在怎么打包

1. HBuilderX 里**新建一个空的 5+App 项目**（别复用之前那个，它的 manifest.json 已经被覆盖过了）
2. 把谷雨这些拷进项目根目录：

   ```
   index.html
   style.css
   js\            （整个文件夹，含 js\vendor\）
   icons\
   pwa-manifest.json      ← 可选，APK 用不到，拷进去也无害
   ```

   **不要拷** `manifest.json`（现在源码里也没有这个名字了）、`_备份\`、`_开发测试\`、
   `桌面版\`、`启动页\`、`控制台脚本\`、各种 `*_备份_*` 文件。

3. HBuilderX 的 `manifest.json` 保持它自己生成的那份，在图形界面里配：
   - 应用名称、appid、版本号
   - **App启动界面配置** → 启动图用 `启动页\` 里那套
   - **App权限配置** → 存储、相机、相册（谷雨要用到上传头像/背景）
4. 菜单 → 发行 → 原生App-云打包

---

## 如果还是白屏

现在白屏会**自己报错**了。启动阶段任何脚本报错、任何文件没加载成功，
都会在屏幕上弹一个白底的「谷雨启动失败」面板，写清楚是哪个文件、什么错、第几行。
截图发出来就能定位。

十二秒还没启动完也会弹，并且告诉你 `localforage` 加载没加载上、关键脚本在不在。

如果连这个面板都不出现，那说明 WebView 根本没加载到 `index.html`——
回去检查 HBuilderX 的 manifest.json 里入口页配的是不是 `index.html`。

---

## 顺带改掉的一个隐患

原来 `localforage` 和 `mammoth` 这两个库是从 cdnjs 在线拉的。

- 手机没网 / cdnjs 被墙 → `localforage` 加载不到 → 存档读写全废，启动直接卡死
- 国内访问 cdnjs 本来就不稳

现在两个库都放在 `js\vendor\` 里跟着一起打包，**断网也能正常启动**。
（顺手也让桌面版 exe 不再依赖联网。）

---

## 文件清单变化

| 变化 | 说明 |
|---|---|
| 新增 `pwa-manifest.json` | 原 `manifest.json` 改名而来 |
| 新增 `js\vendor\localforage.min.js` | 原来从 cdnjs 拉 |
| 新增 `js\vendor\mammoth.browser.min.js` | 原来从 cdnjs 拉 |
| `index.html` | 改引用 + 加启动自检 |
| `js\03-markdown-feed-tags.js` | 启动完成时置个标志，给自检用 |

> 老的 `manifest.json` 我这边删不掉，**你自己删掉它**，免得下次拷进 HBuilderX 又撞车。
