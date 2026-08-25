// =====================================================================================
// 谷雨 桌面版 —— Electron 主进程
//
// 跟以前那个「启动谷雨(桌面模式).bat」相比，这里解决了三件事：
//   1. 不再依赖用户电脑上装没装 Chrome/Edge —— 浏览器内核跟着 exe 一起走
//   2. 存档不再放在 %TEMP%（清理临时文件就没了），改成放在 exe 旁边的「谷雨数据」文件夹
//   3. localforage / mammoth 这两个库改成本地打包，断网也能启动
// =====================================================================================

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ------------------------------------------------------------------
// 启动日志 —— exe 闪一下就没了的时候，唯一能查的东西
//
// 这类问题在用户机器上没有控制台可看，什么线索都留不下。所以从进程一起来就往
// 文件里记里程碑，任何一步炸了都能从日志看出卡在哪，而不是干瞪眼猜。
// ------------------------------------------------------------------
const bootDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'));
let logPath = path.join(bootDir, '启动日志.txt');

function logBoot(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\r\n`;
  try {
    fs.appendFileSync(logPath, line);
  } catch (e) {
    // exe 旁边写不了（只读目录/权限）就退到系统临时目录，别让记日志本身把程序搞崩
    try {
      logPath = path.join(os.tmpdir(), 'guyu-启动日志.txt');
      fs.appendFileSync(logPath, line);
    } catch (e2) { /* 实在写不了就算了 */ }
  }
}

// 每次启动重置日志，只保留最近一次，免得越滚越大也免得看到旧记录误判
try { fs.writeFileSync(path.join(bootDir, '启动日志.txt'), ''); } catch (e) { /* 忽略 */ }

logBoot('=== 谷雨启动 ===');
logBoot(`Electron ${process.versions.electron} / Chromium ${process.versions.chrome} / Node ${process.versions.node}`);
logBoot(`exe 目录: ${bootDir}`);
logBoot(`便携模式: ${process.env.PORTABLE_EXECUTABLE_DIR ? '是' : '否'}`);

// 主进程任何没接住的异常，都写日志 + 弹框，而不是让进程无声无息地消失
function fatal(where, err) {
  const detail = (err && err.stack) || String(err);
  logBoot(`!!! 崩溃于 ${where}\r\n${detail}`);
  try {
    dialog.showErrorBox('谷雨启动失败',
      `出错位置：${where}\n\n${detail}\n\n详细日志：\n${logPath}`);
  } catch (e) { /* 界面还没起来就弹不了框，日志已经写了 */ }
}
process.on('uncaughtException', err => { fatal('uncaughtException', err); app.exit(1); });
process.on('unhandledRejection', err => { logBoot(`未处理的 Promise 拒绝: ${(err && err.stack) || err}`); });

// ------------------------------------------------------------------
// 存档位置：优先放在 exe 旁边，真正做到"拷走整个文件夹＝拷走存档"
// ------------------------------------------------------------------
function resolveDataDir() {
  // 免安装 exe 运行时，electron-builder 会把 exe 所在目录塞进这个环境变量
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  const base = portableDir || path.dirname(app.getPath('exe'));
  // ⚠️ 目录名必须是纯 ASCII。实测中文目录名会让 Chromium 的 IndexedDB 首次打开报
  // "Internal error opening backing store"，表现就是第一次保存弹"硬盘空间可能已满"。
  // 目录里放个说明文件告诉用户这是干嘛的，比给目录起中文名靠谱。
  const target = path.join(base, 'GuyuData');
  try {
    fs.mkdirSync(target, { recursive: true });
    // 真写一次再删掉，确认这个位置可写。装在 Program Files 之类只读目录时会失败，
    // 那就老实退回系统默认的 AppData，别让用户开着开着发现存档一直没保存。
    const probe = path.join(target, '.writetest');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    // 放个说明，免得用户看到一个英文文件夹不知道能不能删
    try {
      fs.writeFileSync(path.join(target, '这是谷雨的存档文件夹_请勿删除.txt'),
        '这个文件夹里是谷雨的全部数据：角色、聊天记录、推文、续写、世界书、预设等。\r\n' +
        '删掉它 = 存档全没了。\r\n\r\n' +
        '换电脑 / 备份：把整个「谷雨」文件夹（含 exe 和本文件夹）一起拷走即可。\r\n' +
        '也可以在应用里「设置 → 导出数据」导出一个 json 单独存着。\r\n\r\n' +
        '（文件夹名用英文是有原因的：中文路径会让浏览器内核的数据库偶发打不开。）\r\n', 'utf-8');
    } catch (e) { /* 写不了说明文件不影响主流程 */ }
    return target;
  } catch (e) {
    console.warn('[谷雨] exe 旁边不可写，存档改用系统默认位置：', e.message);
    return null;
  }
}

let dataDir = null;
try {
  dataDir = resolveDataDir();
  if (dataDir) {
    app.setPath('userData', dataDir);
    logBoot(`存档目录: ${dataDir}`);
  } else {
    logBoot(`存档目录: 退回系统默认 ${app.getPath('userData')}（exe 旁边不可写）`);
  }
} catch (e) {
  // 存档目录设不了不该是致命的——退回系统默认位置继续跑，总比闪退强
  logBoot(`设置存档目录失败，改用系统默认: ${(e && e.message) || e}`);
}

// ------------------------------------------------------------------
// 窗口尺寸/位置记忆
// ------------------------------------------------------------------
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), 'utf-8'));
    if (typeof s.width === 'number' && typeof s.height === 'number') return s;
  } catch (e) { /* 第一次运行没有这个文件，正常 */ }
  return { width: 1280, height: 900 };
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const bounds = win.isMaximized() ? (win.__restoreBounds || win.getBounds()) : win.getBounds();
    fs.writeFileSync(stateFile(), JSON.stringify({
      width: bounds.width, height: bounds.height,
      x: bounds.x, y: bounds.y,
      maximized: win.isMaximized(),
    }));
  } catch (e) { console.warn('[谷雨] 保存窗口状态失败：', e.message); }
}

// ------------------------------------------------------------------
// 主窗口
// ------------------------------------------------------------------
let mainWindow = null;

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 380,
    minHeight: 560,
    title: '谷雨',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      // ⚠️ 关掉同源策略。原因：谷雨要直接 fetch 各家 AI 接口（含各种中转），
      // 页面本身是 file:// 起源，开着同源策略这些请求会被浏览器拦掉——
      // 以前那个 bat 用 --disable-web-security 也是同一个道理，这里只是把它挪进了程序内部。
      //
      // 代价：页面里的脚本能读本机文件。所以「设置 → 允许执行注入脚本」这个开关
      // 保持默认关闭，别一边开着它一边导入来路不明的角色卡。
      webSecurity: false,
      // 渲染进程不给 Node 能力，角色卡脚本就算跑起来也碰不到文件系统 API
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
  });

  if (state.maximized) mainWindow.maximize();

  const indexPath = path.join(__dirname, 'app', 'index.html');
  logBoot(`加载页面: ${indexPath}`);
  mainWindow.loadFile(indexPath).then(
    () => logBoot('页面加载完成'),
    err => {
      logBoot(`页面加载失败: ${(err && err.message) || err}`);
      dialog.showErrorBox('谷雨打不开',
        `页面加载失败：\n${indexPath}\n\n${(err && err.message) || err}\n\n` +
        `多半是打包时 app 文件夹没同步进来。\n重新运行一次「一键打包exe.bat」试试。\n\n日志：${logPath}`);
    });

  // 等页面画好再显示，避免先闪一下白屏
  mainWindow.once('ready-to-show', () => { logBoot('ready-to-show'); mainWindow.show(); });

  // 兜底：万一 ready-to-show 因为页面异常一直不触发，也要把窗口显示出来，
  // 否则用户看到的就是"进程在跑但没有窗口"，比直接报错还难查。
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      logBoot('ready-to-show 超时未触发，强制显示窗口');
      mainWindow.show();
    }
  }, 10000);

  // 最大化前记一下还原尺寸，不然下次启动会以最大化时的尺寸当默认窗口大小
  mainWindow.on('maximize', () => { mainWindow.__restoreBounds = mainWindow.getNormalBounds(); });
  mainWindow.on('close', () => saveWindowState(mainWindow));
  mainWindow.on('closed', () => { mainWindow = null; });

  // 站外链接一律丢给系统浏览器，不在应用窗口里打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); }
  });

  // 渲染进程崩了给个明确提示，而不是窗口白着让人以为卡死
  mainWindow.webContents.on('render-process-gone', (e, details) => {
    dialog.showErrorBox('谷雨崩溃了', `渲染进程异常退出：${details.reason}\n\n存档在：${app.getPath('userData')}\n重启一下试试。`);
  });
}

// ------------------------------------------------------------------
// 菜单
// ------------------------------------------------------------------
function buildMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开存档所在文件夹',
          click: () => shell.openPath(app.getPath('userData')),
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'forceReload', label: '强制刷新' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
        { role: 'toggleDevTools', label: '开发者工具' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于谷雨',
              message: '谷雨 桌面版',
              detail:
                `版本：${app.getVersion()}\n` +
                `Electron：${process.versions.electron}\n` +
                `Chromium：${process.versions.chrome}\n\n` +
                `存档位置：\n${app.getPath('userData')}\n\n` +
                `本应用为 AI 生成，分享内容时请标明。`,
              buttons: ['知道了'],
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ------------------------------------------------------------------
// 生命周期
// ------------------------------------------------------------------

// 只允许开一个实例：开第二个时把已有窗口顶到前面，
// 避免两个窗口同时读写同一份 IndexedDB 把存档写坏。
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // 已经有一个谷雨在跑，本次直接退出、把已有窗口顶到前面。
  // 注意：如果上一次是崩溃退出、进程还残留在后台（任务管理器里能看到但没有窗口），
  // 之后每次双击都会走到这里、闪一下就没 —— 这正是"打不开"最常见的原因，
  // 所以这里一定要留下日志，诊断脚本会把它读出来。
  logBoot('已有另一个谷雨实例在运行，本次启动退出。');
  logBoot('如果屏幕上并没有谷雨窗口，说明后台残留了僵尸进程 —— 到任务管理器结束「谷雨」再试。');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    logBoot('app ready');
    try {
      buildMenu();
      createWindow();
    } catch (e) {
      fatal('创建窗口', e);
      return;
    }
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  }).catch(e => fatal('app.whenReady', e));

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
