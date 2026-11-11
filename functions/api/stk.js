// 🔍 搜表情包（谷雨 300 / 301）—— Cloudflare Pages Function：guyu.pw/api/stk?q=关键词&first=0
// 为什么要它：网页版 / 电脑版的浏览器不许页面直接去读别的网站（跨域），所以让 guyu.pw 自己替它去搜，
// 把结果整理成一小段 JSON 交回来。安卓 App 先自己直接搜，不行才来这里。
// 301：先问 360 图片（有会动的缩略图），不行再问必应；两家都不行时把各自为什么不行写在 err 里，页面上会原样显示。
// 只做一件事：转搜索结果（缩略图地址 + 标题）。不转图片、不存任何东西、不要登录。
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' };
const J = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS, extra) });
const un = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const snip = s => String(s || '').replace(/\s+/g, ' ').slice(0, 60);

// 360 图片：回 { list: [{ id, title, thumb, _thumb }] }
async function from360(q, first) {
  const r = await fetch('https://image.so.com/j?q=' + encodeURIComponent(q) + '&src=srp&pn=60&sn=' + first, {
    headers: { 'User-Agent': UA, 'Referer': 'https://image.so.com/i?q=' + encodeURIComponent(q), 'Accept': 'application/json, text/javascript, */*', 'Accept-Language': 'zh-CN,zh;q=0.9' },
  });
  const txt = await r.text();
  if (!r.ok) throw new Error('回了 ' + r.status);
  let j = null; try { j = JSON.parse(txt); } catch (e) {}
  if (!j) throw new Error(/异常|ANTISPIDER/i.test(txt) ? '把这次当成机器人拦了' : '回来的不是结果（' + snip(txt) + '）');
  const items = [];
  for (const x of (j.list || [])) {
    const th = x.thumb || x.thumb_bak || '';
    if (!/^https:\/\/[a-z0-9.-]+\.(qhimgs?\d*|qhmsg|so)\.com\//i.test(th)) continue;
    items.push({ t: x._thumb || x._thumb_bak || th, f: th, gif: /\.gif(\?|$)/i.test(th), d: String(x.title || '').replace(/<[^>]+>/g, '').slice(0, 60), k: 'so:' + (x.id || x.imgkey || th) });
  }
  return items;
}
// 必应图片：一页 HTML，每张图一个 m="{…}"
async function fromBing(q, first) {
  const r = await fetch('https://cn.bing.com/images/async?q=' + encodeURIComponent(q) + '&first=' + first + '&count=35&mmasync=1', {
    headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9', 'Accept': 'text/html' },
  });
  const html = await r.text();
  if (!r.ok) throw new Error('回了 ' + r.status);
  const items = [], seen = {};
  const re = /\bm="(\{[^"]+\})"/g; let m;
  while ((m = re.exec(html)) && items.length < 60) {
    try {
      const j = JSON.parse(un(m[1]));
      if (!j.turl || seen[j.turl] || !/^https:\/\/[a-z0-9.-]+\.bing\.(net|com)\//i.test(j.turl)) continue;
      seen[j.turl] = 1;
      items.push({ t: j.turl, f: j.turl, gif: false, d: String(j.t || '').replace(/[]/g, '').slice(0, 60), k: j.mid || j.md5 || j.turl });
    } catch (e) {}
  }
  if (!items.length && html.length < 20000) throw new Error('没给结果页（长度 ' + html.length + '：' + snip(html.replace(/<[^>]+>/g, ' ')) + '）');
  return items;
}

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestGet({ request }) {
  const u = new URL(request.url);
  const q = (u.searchParams.get('q') || '').trim().slice(0, 40);
  const first = Math.max(0, Math.min(600, parseInt(u.searchParams.get('first') || '0', 10) || 0));
  if (!q) return J({ ok: false, err: '没有关键词' }, 400);
  const tried = []; let reached = false;
  for (const [name, fn] of [['360', from360], ['必应', fromBing]]) {
    try {
      const items = await fn(q, first);
      if (items.length) return J({ ok: true, q, first, src: name, items }, 200, { 'Cache-Control': 'public, max-age=1800' });
      reached = true; tried.push(name + '：通了，没有结果');
    } catch (e) { tried.push(name + '：' + ((e && e.message) || e)); }
  }
  return J({ ok: false, none: reached, err: tried.join('；'), tried }, 200);
}
