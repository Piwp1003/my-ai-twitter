// 打包/试跑的实际逻辑。
//
// 为什么不直接写在 .bat 里：cmd 是按字节流解析批处理文件的，文件里只要有中文（UTF-8 多字节），
// 读取指针就可能串位，把后面的命令从中间劈开——典型症状是报
// 「'BINARIES_MIRROR' 不是内部或外部命令」这种把一行 set 劈成两半的错。
// 所以 .bat 保持纯英文当个薄壳，所有中文提示和逻辑都放到这里，由 Node 输出（UTF-8 安全）。
//
// 用法：node tasks.js build   打包成 exe
//       node tasks.js dev     直接跑，不打包
//       node tasks.js doctor  打包完的 exe 打不开时，查死因

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const task = process.argv[2] || 'build';

// 国内镜像：不设的话 electron 内核和 NSIS 工具要从 GitHub 拉，经常卡住或直接失败
const env = {
  ...process.env,
  ELECTRON_MIRROR: 'https://npmmirror.com/mirrors/electron/',
  ELECTRON_BUILDER_BINARIES_MIRROR: 'https://npmmirror.com/mirrors/electron-builder-binaries/',
};

const line = () => console.log('='.repeat(46));
function fail(msg, hint) {
  console.log('');
  console.log('[x] ' + msg);
  if (hint) { console.log(''); console.log(hint); }
  console.log('');
  process.exit(1);
}

function run(cmd, args) {
  // Windows 上 npm 实际是 npm.cmd，必须走 shell 才找得到
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, cwd: HERE, shell: true });
  return r.status === 0;
}

// ==================================================================
// doctor：exe 闪退时用。main.js 从进程一起来就往「启动日志.txt」写里程碑，
// 这里负责把它读出来，并顺手排掉最常见的那个坑（后台残留的僵尸进程）。
// ==================================================================
if (task === 'doctor') {
  line();
  console.log('  谷雨 桌面版 - 闪退诊断');
  line();
  console.log('');

  // exe 可能在两个地方：
  //   dist\谷雨.exe                单文件免安装版（打包完全成功时才有）
  //   dist\win-unpacked\谷雨.exe   文件夹版，最后一步 NSIS 失败时也会有，一样能跑
  const portableExe = path.join(HERE, 'dist', '谷雨.exe');
  const unpackedExe = path.join(HERE, 'dist', 'win-unpacked', '谷雨.exe');
  let exe = null;
  if (fs.existsSync(portableExe)) {
    exe = portableExe;
    console.log('[1/3] 找到单文件版：' + exe);
  } else if (fs.existsSync(unpackedExe)) {
    exe = unpackedExe;
    console.log('[1/3] 单文件版没生成，但找到了文件夹版：');
    console.log('      ' + exe);
    console.log('');
    console.log('      => 说明打包卡在最后一步（NSIS 压成单文件）。');
    console.log('         但这个文件夹版本身是完整可用的，双击就能玩，');
    console.log('         只是分享时要把整个 win-unpacked 文件夹一起打包。');
  } else {
    fail('dist 里没找到谷雨.exe。',
      '    两个位置都查过了：\n' +
      '      ' + portableExe + '\n' +
      '      ' + unpackedExe + '\n' +
      '\n' +
      '    先双击「一键打包exe.bat」打包，再回来跑这个。');
  }
  console.log('      体积 ' + (fs.statSync(exe).size / 1024 / 1024).toFixed(0) + ' MB');

  // —— 僵尸进程 ——
  // 上次崩溃退出但进程还挂在后台时，main.js 的单实例锁会让之后每次双击都立刻退出，
  // 表现就是"闪一下就没了"。这是这类问题里最常见的一种，先排掉。
  console.log('');
  console.log('[2/3] 检查后台有没有残留的谷雨进程...');
  if (process.platform === 'win32') {
    const q = spawnSync('tasklist', ['/FI', 'IMAGENAME eq 谷雨.exe', '/NH'], { encoding: 'utf8', shell: true });
    const out = (q.stdout || '');
    if (/谷雨\.exe/.test(out)) {
      console.log('      发现残留进程，正在结束：');
      console.log('      ' + out.trim().split('\n')[0].trim());
      spawnSync('taskkill', ['/F', '/IM', '谷雨.exe'], { stdio: 'inherit', shell: true });
      console.log('      已结束。这很可能就是打不开的原因 —— 单实例锁会让后来的每次');
      console.log('      启动都直接退出，看起来就是闪一下就没。');
    } else {
      console.log('      没有残留进程');
    }
  } else {
    console.log('      （非 Windows，跳过）');
  }

  // —— 启动日志 ——
  console.log('');
  console.log('[3/3] 启动一次，然后读日志...');
  console.log('');
  // 日志写在 exe 旁边，所以要按实际用的是哪个 exe 去找
  const logFile = path.join(path.dirname(exe), '启动日志.txt');
  try { fs.unlinkSync(logFile); } catch (e) {}

  spawnSync(exe, [], { cwd: path.dirname(exe), shell: false, detached: true, stdio: 'ignore' });
  // 给它几秒钟把日志写出来
  spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},6000)'], { stdio: 'ignore' });

  line();
  if (fs.existsSync(logFile)) {
    console.log('  启动日志（' + logFile + '）：');
    line();
    console.log('');
    console.log(fs.readFileSync(logFile, 'utf8').trim());
    console.log('');
    line();
    console.log('');
    console.log('  怎么看：');
    console.log('    - 日志停在「加载页面」之后没有「页面加载完成」');
    console.log('        => app 文件夹没打进 exe，重新打包一次');
    console.log('    - 出现「已有另一个谷雨实例在运行」');
    console.log('        => 后台有残留进程，本脚本上一步已经帮你结束了，再双击 exe 试试');
    console.log('    - 出现「!!! 崩溃于 ...」');
    console.log('        => 把那段贴出来，能直接定位');
    console.log('    - 日志是空的 / 根本没生成');
    console.log('        => 进程压根没起来，八成被杀毒软件拦了（360、火绒常见），');
    console.log('           去杀毒软件的拦截记录里把「谷雨.exe」加白名单');
  } else {
    console.log('  没有生成启动日志。');
    line();
    console.log('');
    console.log('  说明 exe 的进程根本没跑起来，最可能的两种：');
    console.log('');
    console.log('    1. 被杀毒软件拦了 —— 未签名的 exe 很常见，尤其 360 和火绒。');
    console.log('       去杀毒软件的「拦截记录 / 隔离区」看看有没有「谷雨.exe」，');
    console.log('       加到白名单再试。');
    console.log('');
    console.log('    2. 打包不完整 —— 重新双击一次「一键打包exe.bat」。');
  }
  console.log('');
  process.exit(0);
}

line();
console.log(task === 'dev' ? '  谷雨 桌面版 - 试跑（不打包）' : '  谷雨 桌面版 - 打包成免安装 exe');
line();
console.log('');

// —— 位置检查：这个文件夹必须在谷雨源码目录里 ——
const srcIndex = path.join(HERE, '..', 'index.html');
if (!fs.existsSync(srcIndex)) {
  fail('在上一层没找到 index.html。',
    '    「桌面版」这个文件夹必须放在谷雨源码目录里面，也就是：\n' +
    '\n' +
    '      克劳德神了\\\n' +
    '      ├─ index.html\n' +
    '      ├─ js\\\n' +
    '      └─ 桌面版\\      <- 本文件夹\n' +
    '\n' +
    '    现在它在：' + HERE);
}
console.log('[1/4] 位置正确，源码在上一层');
console.log('      Node.js ' + process.version);
console.log('      已切到国内镜像下载依赖');

// —— 依赖 ——
if (!fs.existsSync(path.join(HERE, 'node_modules'))) {
  console.log('');
  console.log('[2/4] 第一次运行，安装依赖中...');
  console.log('      要下 100MB 左右的浏览器内核，慢一点是正常的，别关窗口');
  console.log('');
  if (!run('npm', ['install', '--registry=https://registry.npmmirror.com'])) {
    fail('依赖安装失败。',
      '    多半是网络问题。换个网或挂个梯子再双击一次本文件。');
  }
} else {
  console.log('');
  console.log('[2/4] 依赖已就位，跳过安装');
}

// —— 同步源码 ——
console.log('');
console.log('[3/4] 同步源码到 app/ ...');
console.log('');
if (!run('node', ['sync.js'])) {
  fail('源码同步失败，看上面报的是缺哪个文件。');
}

// —— 干活 ——
if (task === 'dev') {
  console.log('');
  console.log('[4/4] 启动中... 关掉窗口即退出');
  console.log('');
  console.log('      提示：试跑时的存档跟正式 exe 的存档是分开的两份，');
  console.log('            随便折腾不会动到你正式在用的数据。');
  console.log('');
  run('npx', ['electron', '.']);
  process.exit(0);
}

console.log('');
console.log('[4/4] 打包中... 要几分钟，别关窗口');
console.log('');
const builderOk = run('npx', ['electron-builder', '--win', 'portable']);

const exe = path.join(HERE, 'dist', '谷雨.exe');
const unpacked = path.join(HERE, 'dist', 'win-unpacked', '谷雨.exe');
const mb = f => (fs.statSync(f).size / 1024 / 1024).toFixed(0);

console.log('');
line();

if (fs.existsSync(exe)) {
  console.log('  打包完成！');
  line();
  console.log('');
  console.log('  产物：' + exe);
  console.log('  体积：约 ' + mb(exe) + ' MB');
  console.log('');
  console.log('  这个 exe 可以直接拷给别人用，对方不需要装任何东西。');

} else if (fs.existsSync(unpacked)) {
  // 最常见的"打了但没打完"：应用本体已经生成，只是最后一步压成单文件失败了。
  // 这时候千万别报个笼统的"打包失败"就完事——用户手上其实已经有能跑的东西了。
  console.log('  打包只完成了一半（但你已经有能用的了）');
  line();
  console.log('');
  console.log('  ✅ 能用的：' + unpacked);
  console.log('     体积约 ' + mb(unpacked) + ' MB，双击就能玩，功能完全一样。');
  console.log('');
  console.log('  ❌ 没生成的：dist\\谷雨.exe（单文件免安装版）');
  console.log('');
  console.log('  卡在最后一步：把应用压成单个 exe 要用到 NSIS 工具，');
  console.log('  它需要联网下载，这一步失败了。');
  console.log('');
  console.log('  怎么办：');
  console.log('    1. 重新双击一次「一键打包exe.bat」—— 本脚本已经把下载源');
  console.log('       切到国内镜像，多试一次经常就过了');
  console.log('    2. 还不行就挂个梯子再试');
  console.log('    3. 不想折腾的话，直接用上面那个文件夹版：分享时把整个');
  console.log('       win-unpacked 文件夹压缩发出去（记得用 7-Zip，别用');
  console.log('       Windows 右键压缩，不然中文名会乱码）');
  console.log('');

} else {
  fail('打包失败，应用本体都没生成出来。',
    '    往上翻看看红字报的是什么。最常见的两种：\n' +
    '      - 网络问题，依赖没下全   => 重新双击一次本文件\n' +
    '      - 杀毒软件拦了写文件     => 临时关掉再试\n' +
    '\n' +
    '    electron-builder 退出码：' + (builderOk ? '0（但没产物，很反常）' : '非 0'));
}

console.log('');
console.log('  首次运行会在 exe 旁边生成 GuyuData 文件夹存数据，');
console.log('  拷贝或备份时要连它一起带走。');
console.log('');
console.log('  ⚠ 浏览器版的存档不会自动搬过来。先在浏览器里');
console.log('    「设置 → 导出数据」存一个 json，再到 exe 里导入。');
console.log('');

// 打开产物文件夹
if (process.platform === 'win32' && fs.existsSync(path.join(HERE, 'dist'))) {
  spawnSync('explorer', [path.join(HERE, 'dist')], { shell: true });
}
