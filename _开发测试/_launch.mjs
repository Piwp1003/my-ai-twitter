// 测试脚本共用：开一个浏览器 + 把项目里的文件路径变成浏览器认的 file:// 地址。
// 以前每个脚本都写死了 executablePath: '/opt/pw-browsers/chromium'——那是 Claude 那边云端机器上的路径，
// 你自己电脑上跑会直接找不到浏览器。现在按顺序试：云端那个 → 电脑上装的 Edge → Chrome → Playwright 自带的。
// 所以在你电脑上**不用**再 `npx playwright install chromium`，有 Edge 就能跑。
import fs from 'fs';
import { pathToFileURL } from 'url';

export async function launchBrowser(chromium, extra = {}) {
  const tries = [];
  if (fs.existsSync('/opt/pw-browsers/chromium')) tries.push({ executablePath: '/opt/pw-browsers/chromium' });
  // 她电脑的 Linux 壳（Claude 桌面版里）：下不了 Playwright 自带的浏览器，用 npm 装的 @sparticuz/chromium
  if (process.platform === 'linux') {
    try {
      const sp = (await import('@sparticuz/chromium')).default;
      tries.push({ executablePath: await sp.executablePath(), args: sp.args.filter(a => !/^--(single-process|no-zygote|enable-logging|v=|log-level)/.test(a)) });   // single-process 开不了第二个窗口
    } catch (e) { /* 没装就跳过 */ }
  }
  tries.push({ channel: 'msedge' }, { channel: 'chrome' }, {});
  let last;
  for (const t of tries) {
    try { return await chromium.launch(Object.assign({}, t, extra, (t.args || extra.args) ? { args: [...(t.args || []), ...(extra.args || [])] } : {})); } catch (e) { last = e; }
  }
  throw last;
}
export const fileUrl = p => pathToFileURL(p).href;
