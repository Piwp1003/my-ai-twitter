// 🔍 搜表情包（谷雨 300）—— Cloudflare Pages Function：guyu.pw/api/stk?q=关键词&first=0
// 为什么要它：网页版 / 电脑版的浏览器不许页面直接去读别的网站（跨域），所以让 guyu.pw 自己替它去必应图片搜一下，
// 把结果整理成一小段 JSON 交回来。安卓 App 不走这里（手机直接去搜）。
// 只做一件事：转搜索结果（缩略图地址 + 标题）。不转图片、不存任何东西、不要登录。
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' };
const J = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS, extra) });
const un = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestGet({ request }) {
  const u = new URL(request.url);
  const q = (u.searchParams.get('q') || '').trim().slice(0, 40);
  const first = Math.max(0, Math.min(500, parseInt(u.searchParams.get('first') || '0', 10) || 0));
  if (!q) return J({ ok: false, err: '没有关键词' }, 400);
  try {
    const r = await fetch('https://cn.bing.com/images/async?q=' + encodeURIComponent(q) + '&first=' + first + '&count=35&mmasync=1', {
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9', 'Accept': 'text/html' },
      cf: { cacheTtl: 1800, cacheEverything: true },
    });
    if (!r.ok) return J({ ok: false, err: '搜索那边回了 ' + r.status }, 502);
    const html = await r.text();
    const items = [], seen = {};
    const re = /\bm="(\{[^"]+\})"/g; let m;
    while ((m = re.exec(html)) && items.length < 60) {
      try {
        const j = JSON.parse(un(m[1]));
        if (!j.turl || seen[j.turl] || !/^https:\/\/[a-z0-9.-]+\.bing\.(net|com)\//i.test(j.turl)) continue;
        seen[j.turl] = 1;
        items.push({ t: j.turl, m: j.murl || '', d: String(j.t || '').replace(/[]/g, '').slice(0, 60), k: j.mid || j.md5 || j.turl });
      } catch (e) {}
    }
    if (!items.length) return J({ ok: false, err: '没搜到' }, 200);
    return J({ ok: true, q, first, items }, 200, { 'Cache-Control': 'public, max-age=1800' });
  } catch (e) {
    return J({ ok: false, err: '搜索没连上：' + ((e && e.message) || e) }, 502);
  }
}
