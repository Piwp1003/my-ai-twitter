// 247：云端 Worker 的「谷雨自己的通知」——Web Push 加密 / VAPID、个推（uni-push 1.0）、/vapid、/test-push、/sync 存订阅。
// 不用浏览器，直接用 node 跑 worker.js（假的 KV + 假的 fetch）。
// 用法（项目根目录）：node _开发测试/v247-push-worker-test.mjs
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = (await import(pathToFileURL(path.join(root, 'worker.js')).href + '?t=' + Date.now())).default;
const subtle = crypto.subtle;
let pass = 0, fail = 0;
const check = (name, ok, extra) => { if (ok) { pass++; console.log('✅ ' + name); } else { fail++; console.log('❌ ' + name + (extra ? '  ' + extra : '')); } };
const b64u = { enc: (b) => Buffer.from(b).toString('base64url'), dec: (s) => new Uint8Array(Buffer.from(s, 'base64url')) };
const kvMap = new Map();
const env = { AUTH_TOKEN: 'tok', PROACTIVE_KV: { get: async (k) => kvMap.has(k) ? kvMap.get(k) : null, put: async (k, v) => { kvMap.set(k, v); } } };
const call = (p, method = 'GET', body, tok = 'tok') => W.fetch(new Request('https://w.example' + p, { method, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }), env);

// 假的浏览器订阅：自己生成一对 ECDH 密钥 + auth
const ua = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const uaPub = new Uint8Array(await subtle.exportKey('raw', ua.publicKey));
const auth = crypto.getRandomValues(new Uint8Array(16));
const sub = { endpoint: 'https://push.example/send/abc', keys: { p256dh: b64u.enc(uaPub), auth: b64u.enc(auth) } };
const sub2 = { endpoint: 'https://push.example/send/gone', keys: { p256dh: b64u.enc(uaPub), auth: b64u.enc(auth) } };

async function hkdf(salt, ikm, info, len) { const k = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']); return new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8)); }
const te = (s) => new TextEncoder().encode(s);
async function decrypt(buf) {   // 浏览器那一侧的解密（RFC 8291）
  const salt = buf.slice(0, 16), idlen = buf[20], asPub = buf.slice(21, 21 + idlen), ct = buf.slice(21 + idlen);
  const asKey = await subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));
  const ikm = await hkdf(auth, ecdh, new Uint8Array([...te('WebPush: info\0'), ...uaPub, ...asPub]), 32);
  const cek = await hkdf(salt, ikm, te('Content-Encoding: aes128gcm\0'), 16), nonce = await hkdf(salt, ikm, te('Content-Encoding: nonce\0'), 12);
  const k = await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const pt = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, k, ct));
  return new TextDecoder().decode(pt.slice(0, pt.lastIndexOf(2)));
}

const sent = [];
let getuiAuthCalls = 0, getuiFailTokenOnce = false;
globalThis.fetch = async (url, opt = {}) => {
  url = String(url);
  sent.push({ url, opt });
  if (url.startsWith('https://ntfy.sh')) return new Response('{}', { status: 200 });
  if (url === sub.endpoint) return new Response('', { status: 201 });
  if (url === sub2.endpoint) return new Response('gone', { status: 410 });
  if (/restapi\.getui\.com\/v2\/APPID\/auth$/.test(url)) { getuiAuthCalls++; return Response.json({ code: 0, data: { token: 'T' + getuiAuthCalls, expire_time: String(Date.now() + 86400000) } }); }
  if (/push\/single\/cid$/.test(url)) {
    if (getuiFailTokenOnce) { getuiFailTokenOnce = false; return Response.json({ code: 10001, msg: 'token is expired' }); }
    return Response.json({ code: 0, msg: 'success', data: {} });
  }
  if (/getui.*BADAPP\/auth$/.test(url)) return Response.json({ code: 10002, msg: 'sign error' });
  return new Response('nope', { status: 500 });
};

// 1) 没密钥进不去
check('没有共享密钥：/vapid 401', (await call('/vapid', 'GET', null, 'wrong')).status === 401);
// 2) /vapid 自动生成，再要一次还是同一把
const v1 = await (await call('/vapid')).json(), v2 = await (await call('/vapid')).json();
check('/vapid：第一次自动生成公钥（65 字节），之后不变', b64u.dec(v1.publicKey).length === 65 && v1.publicKey === v2.publicKey && kvMap.has('vapid'));
// 3) /sync 存订阅、个推配置（同 endpoint 去重）
await call('/sync', 'POST', { apiUrl: 'u', apiKey: 'k', model: 'm', ntfyTopic: 'topic1', characters: [], webPushSubs: [sub] });
await call('/sync', 'POST', { apiUrl: 'u', apiKey: 'k', model: 'm', ntfyTopic: 'topic1', characters: [], webPushSubs: [sub, sub2], getui: { appId: 'APPID', appKey: 'AK', masterSecret: 'MS', cid: 'CID1' } });
let st = JSON.parse(kvMap.get('state'));
check('/sync：网页订阅按 endpoint 去重存下（2 台），个推配置也存了', st.webPushSubs.length === 2 && st.getui && st.getui.cid === 'CID1');
// 4) /test-push：三条路都推
sent.length = 0;
const tp = await (await call('/test-push', 'POST', {})).json();
const chs = tp.results.map((r) => r.ch + ':' + r.ok).join(',');
check('/test-push：ntfy、网页、个推都推了一遍，回每条路的结果', tp.ok && /ntfy:true/.test(chs) && /webpush:true/.test(chs) && /unipush:true/.test(chs), chs);
// 5) Web Push 内容能被浏览器那边解开，头对
const wp = sent.find((x) => x.url === sub.endpoint);
const h = wp.opt.headers;
const msg = JSON.parse(await decrypt(new Uint8Array(wp.opt.body)));
check('Web Push：aes128gcm 加密，浏览器能解开（标题 / 内容 / 点了去哪）', h['Content-Encoding'] === 'aes128gcm' && msg.title === '🔔 谷雨测试通知' && msg.jump && msg.jump.view === 'notifications');
// 6) VAPID JWT 签名能用公钥验过，aud 是推送服务的域名
const m = /vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h.Authorization);
const pub = await subtle.importKey('raw', b64u.dec(m[4]), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
const okSig = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, b64u.dec(m[3]), te(m[1] + '.' + m[2]));
const claims = JSON.parse(Buffer.from(m[2], 'base64url').toString());
check('VAPID：签名验得过，aud=推送服务域名，12 小时内过期', okSig && claims.aud === 'https://push.example' && claims.exp > Date.now() / 1000 && m[4] === v1.publicKey);
// 7) 410 的那台设备自动删掉
st = JSON.parse(kvMap.get('state'));
check('推送服务说「这台设备退订了」（410）：自动从名单里删掉', st.webPushSubs.length === 1 && st.webPushSubs[0].endpoint === sub.endpoint);
// 8) 个推：签名 sha256(appKey+ts+masterSecret)、token 放头里、payload 带跳转
const au = sent.find((x) => /\/auth$/.test(x.url)), ab = JSON.parse(au.opt.body);
const want = Buffer.from(await subtle.digest('SHA-256', te('AK' + ab.timestamp + 'MS'))).toString('hex');
const ps = sent.find((x) => /single\/cid$/.test(x.url)), pb = JSON.parse(ps.opt.body);
check('个推：鉴权签名对、推送带 token、发给那台手机的 cid、点了能跳', ab.sign === want && ab.appkey === 'AK' && ps.opt.headers.token === 'T1' && pb.audience.cid[0] === 'CID1' && JSON.parse(pb.push_message.notification.payload).jump.view === 'notifications' && pb.request_id.length >= 10 && pb.request_id.length <= 32);
// 9) token 复用；过期了重拿一次
sent.length = 0; await call('/test-push', 'POST', {});
const reuse = !sent.some((x) => /\/auth$/.test(x.url));
getuiFailTokenOnce = true; sent.length = 0; const r9 = await (await call('/test-push', 'POST', {})).json();
check('个推：token 存着复用；过期了自动重新拿一次再推', reuse && sent.filter((x) => /\/auth$/.test(x.url)).length === 1 && r9.results.find((r) => r.ch === 'unipush').ok);
// 10) 个推配错：告诉你哪里错，别的路照样推
const r10 = await (await call('/test-push', 'POST', { getui: { appId: 'BADAPP', appKey: 'x', masterSecret: 'y', cid: 'c' } })).json();
const u10 = r10.results.find((r) => r.ch === 'unipush');
check('个推 Key 填错：结果里写「个推鉴权失败」，网页推送照样成功', !u10.ok && /个推鉴权失败/.test(u10.text) && r10.results.find((r) => r.ch === 'webpush').ok);
// 11) 定时任务：TA 到点发消息，三条路都推，点了去那个角色的聊天
kvMap.set('state', JSON.stringify(Object.assign(JSON.parse(kvMap.get('state')), { getui: { appId: 'APPID', appKey: 'AK', masterSecret: 'MS', cid: 'CID1' }, characters: [{ id: 7, name: '立夏', persona: 'p', chatFreq: { interval: 1, unit: 'minute' }, recentHistory: [{ sender: 'user', text: 'hi', timestamp: Date.now() - 3600000 }], lastChatProactiveTime: 0 }] })));
const realFetch = globalThis.fetch; sent.length = 0;
globalThis.fetch = async (url, opt) => { if (String(url) === 'u/chat/completions' || /chat\/completions|\/u$/.test(String(url)) || String(url) === 'u') return Response.json({ choices: [{ message: { content: '想你了' } }] }); return realFetch(url, opt); };
await W.scheduled({}, env, { waitUntil: (p) => p });
await new Promise((r) => setTimeout(r, 50));
const wp11 = sent.find((x) => x.url === sub.endpoint), gp = sent.find((x) => /single\/cid$/.test(x.url));
let ok11 = false;
if (wp11 && gp) { const m11 = JSON.parse(await decrypt(new Uint8Array(wp11.opt.body))); ok11 = m11.title === '立夏 发来消息' && m11.jump.chat === 7 && JSON.parse(JSON.parse(gp.opt.body).push_message.notification.payload).jump.chat === 7; }
check('到点 TA 主动发消息：网页和 App 都收到「立夏 发来消息」，点了去 TA 的聊天', ok11, sent.map((x) => x.url).join(' | '));
// 12) 248：角色头像——手机端传小图上来，通知里带 Worker 上的图片地址（不用密钥就能看，地址带指纹）
{
  globalThis.fetch = realFetch; sent.length = 0;
  const jpg = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64');
  const up = await (await call('/avatars', 'POST', { items: [{ id: '7', h: 'abc123', d: jpg }], base: 'https://w.example' })).json();
  const img = await W.fetch(new Request('https://w.example/a/7/abc123.jpg'), env);
  const bad = await W.fetch(new Request('https://w.example/a/7/zzz.jpg'), env);
  await call('/test-push', 'POST', { iconId: '7' });
  const wp = sent.find((x) => x.url === sub.endpoint);
  const m12 = wp ? JSON.parse(await decrypt(new Uint8Array(wp.opt.body))) : {};
  const gp = sent.find((x) => /single\/cid$/.test(x.url));
  check('头像：传上去存好；公开地址能取到图、指纹不对就 404；网页推送和个推都带头像地址', up.saved === 1 && img.status === 200 && img.headers.get('Content-Type') === 'image/jpeg' && bad.status === 404 && m12.icon === 'https://w.example/a/7/abc123.jpg' && gp && JSON.parse(gp.opt.body).push_message.notification.logo_url === m12.icon, JSON.stringify(m12));
}
console.log(`\n${pass}/${pass + fail} 通过`);
process.exit(fail ? 1 : 0);
