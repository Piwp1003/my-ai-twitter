// 🇨🇳 309：国内线路（cn.guyu.pw，放在腾讯 EdgeOne Pages 上）——小接口（搜表情包）：cn.guyu.pw/api/… → guyu.pw/api/…
// 国内连 Cloudflare 经常不通，EdgeOne 的香港节点替大家去问 Cloudflare，再原样转回来。不存任何东西。
// 注意：EdgeOne 一次请求最多收 1MB，所以谷雨那边视频是切成小块传的。
const UP = 'https://guyu.pw/api';
const PRE = '/api';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': '*', 'Access-Control-Max-Age': '86400' };
export async function onRequest(context) {
  const request = context.request;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const u = new URL(request.url);
  const target = UP + u.pathname.slice(PRE.length) + u.search;
  const h = new Headers();
  for (const [k, v] of request.headers) { if (!/^(host|content-length|connection|accept-encoding|cf-|x-forwarded-|eo-|x-real-ip)/i.test(k)) h.set(k, v); }
  const init = { method: request.method, headers: h, redirect: 'follow' };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer();
  let r;
  try { r = await fetch(target, init); }
  catch (e) { return new Response(JSON.stringify({ ok: false, err: '国内线路没连上主服务器：' + ((e && e.message) || e) }), { status: 502, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS) }); }
  const out = new Headers();
  for (const [k, v] of r.headers) { if (!/^(content-encoding|content-length|transfer-encoding|connection|set-cookie|alt-svc|cf-|server|nel|report-to)/i.test(k)) out.set(k, v); }
  for (const k in CORS) out.set(k, CORS[k]);
  return new Response(r.body, { status: r.status, headers: out });
}
