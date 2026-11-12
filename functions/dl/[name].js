// 📦 下载安装包（谷雨 307）—— Cloudflare Pages Function
//   guyu.pw/dl/android → 最新的安卓安装包    guyu.pw/dl/pc → 最新的电脑版 exe    guyu.pw/dl/info → 两个的版本号、日期、大小（JSON）
// 安装包本身放在 GitHub 的 Release 里（apk、pc 两个标签，GitHub Actions 打好自己传上去；手动传也行，名字要叫 guyu.apk / guyu-pc.exe）。
// 国内很多人打不开 GitHub，所以由 guyu.pw 替大家去拿、原样转过来（不存任何东西）。
const REPO = 'Piwp1003/my-ai-twitter';
const FILES = {
  android: { tag: 'apk', file: 'guyu.apk', type: 'application/vnd.android.package-archive', save: '谷雨-安卓.apk' },
  pc: { tag: 'pc', file: 'guyu-pc.exe', type: 'application/octet-stream', save: '谷雨-电脑版.exe' }
};
const url = (tag, file) => `https://github.com/${REPO}/releases/download/${tag}/${file}`;
const CORS = { 'Access-Control-Allow-Origin': '*' };
async function info(tag, file) {
  try { const r = await fetch(url(tag, file), { cf: { cacheTtl: 120, cacheEverything: true } }); if (!r.ok) return null; return await r.json(); } catch (e) { return null; }
}
function missing(name) {
  const what = name === 'pc' ? '电脑版' : '安卓安装包';
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>谷雨 · 下载</title>
<body style="font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;background:#f4f6f3;color:#1f2a24;display:grid;place-items:center;min-height:90vh;margin:0;padding:16px">
<div style="max-width:420px;background:#fff;border-radius:18px;padding:24px;line-height:1.7"><h2 style="margin:0 0 8px">${what}还没传上来</h2>
<p>新的${what}正在打包或者还没有，过一会儿再试。也可以去 QQ 群 <b>1106222317</b> 的群文件里拿，或者先用网页版。</p>
<p><a href="/download">← 回下载页</a>　<a href="/">打开网页版</a></p></div></body>`;
  return new Response(html, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
export async function onRequest({ params, request }) {
  const name = String(params.name || '').toLowerCase();
  if (request.method === 'OPTIONS') return new Response(null, { headers: Object.assign({ 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': '*' }, CORS) });
  if (name === 'info') {
    const [a, p] = await Promise.all([info('apk', 'apk.json'), info('pc', 'pc.json')]);
    return new Response(JSON.stringify({ android: a, pc: p }), { headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=120' }, CORS) });
  }
  const f = FILES[name]; if (!f) return new Response('没有这个文件', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const h = {}; const range = request.headers.get('Range'); if (range) h.Range = range;   // 断了能接着下
  let r;
  try { r = await fetch(url(f.tag, f.file), { headers: h, cf: { cacheTtl: 600, cacheEverything: true } }); } catch (e) { return missing(name); }
  if (!r.ok && r.status !== 206) return missing(name);
  const out = new Headers(CORS);
  out.set('Content-Type', f.type);
  out.set('Content-Disposition', `attachment; filename="${f.file}"; filename*=UTF-8''${encodeURIComponent(f.save)}`);
  ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Last-Modified', 'ETag'].forEach(k => { const v = r.headers.get(k); if (v) out.set(k, v); });
  out.set('Cache-Control', 'public, max-age=300');
  return new Response(request.method === 'HEAD' ? null : r.body, { status: r.status, headers: out });
}
