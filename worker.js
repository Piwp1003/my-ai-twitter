/**
 * ============================================================
 *  角色主动发消息/发推文 · 云端唤醒 Worker
 * ============================================================
 * 作用：手机网页关掉/锁屏后，浏览器里的定时器会被系统冻结，"到点该聊天/该发推的角色"
 * 就没法自己触发了。这个 Worker 部署到 Cloudflare 上，每隔几分钟被云端 Cron
 * 唤醒一次，自己判断"哪个角色到点该说话/发推了"，调用你配置的 AI 接口生成内容，
 * 然后通过 ntfy.sh 推送到你手机的系统通知栏（哪怕网页完全没开）。
 * 你点开通知、重新打开网页时，网页会把这条消息/推文拉回来合并进本地记录。
 *
 * 数据流：
 *   手机网页  --POST /sync-->   KV["state"]   (角色信息、最近聊天/推文记录、API配置)
 *   Cron定时器 --读 state, 判断到点了没--> 调AI生成 --> 推ntfy + 写入 KV["pending"]
 *   手机网页  --GET /pending--> 拿到云端生成的内容，合并进本地记录
 *   手机网页  --POST /ack-->    清空已经拿到手的 pending 消息
 *
 * 部署方式见同目录下的《部署教程.md》。
 * ============================================================
 */

// ---------- 工具函数 ----------

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
}

function unauthorized() {
  return jsonResponse({ error: 'unauthorized' }, 401);
}

function checkAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token && env.AUTH_TOKEN && token === env.AUTH_TOKEN;
}

async function getState(env) {
  const raw = await env.PROACTIVE_KV.get('state');
  return raw ? JSON.parse(raw) : { characters: [], apiUrl: '', apiKey: '', model: '', ntfyTopic: '', webPushSubs: [], getui: null };
}

async function setState(env, state) {
  await env.PROACTIVE_KV.put('state', JSON.stringify(state));
}

async function getPending(env) {
  const raw = await env.PROACTIVE_KV.get('pending');
  return raw ? JSON.parse(raw) : [];
}

async function setPending(env, list) {
  await env.PROACTIVE_KV.put('pending', JSON.stringify(list));
}

// ---------- AI 接口调用（同时兼容 OpenAI 兼容接口 和 Anthropic 原生接口，逻辑与网页版一致）----------

function isAnthropicApiUrl(url) {
  return /anthropic\.com/i.test(url || '');
}

async function callLLM(api, promptText) {
  try {
    if (isAnthropicApiUrl(api.apiUrl)) {
      const res = await fetch(`${api.apiUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': api.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: api.model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: promptText }],
        }),
      });
      const data = await res.json();
      if (data.error) return { error: data.error.message || JSON.stringify(data.error) };
      return { text: (data.content && data.content[0] && data.content[0].text) || '' };
    }
    const res = await fetch(`${api.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.apiKey}` },
      body: JSON.stringify({ model: api.model, messages: [{ role: 'user', content: promptText }] }),
    });
    const data = await res.json();
    if (data.error) return { error: data.error.message || JSON.stringify(data.error) };
    return { text: (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '' };
  } catch (e) {
    return { error: e.message };
  }
}

// 从AI原始输出里抠出真正要发的文字（AI可能会带引号/多余解释，这里做个简单清洗）
function cleanReply(text) {
  if (!text) return '';
  let t = text.trim();
  t = t.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
  // 去掉包裹的引号
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith('「') && t.endsWith('」'))) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

function buildProactivePrompt(char, recentHistory) {
  let historyText = (recentHistory || [])
    .map((m) => `${m.sender === 'user' ? '用户' : char.name}: ${m.text}`)
    .join('\n');
  return `你正在扮演角色"${char.name}"。
【人设】
${char.persona || '(无详细设定)'}

【最近聊天记录】（可能为空，为空说明还没聊过）
${historyText || '(暂无记录)'}

现在，请你以"${char.name}"的身份，主动给用户发一条消息开启对话。要求：
1. 只输出你要说的这一句话本身，不要加任何前后缀、引号、说明文字。
2. 口语化、简短（一般不超过40字），像真实聊天软件里突然发来的一条消息。
3. 结合人设和最近聊天内容，避免机械重复的开场白。
4. 不要使用markdown、括号动作描写。`;
}

// 云端简化版"发推文"prompt——不带世界书/标签/配图这些本地才有的复杂逻辑，
// 只求生成一条像样的推文，网页那边打开后会正常按本地完整逻辑继续生成后续内容。
function buildPostPrompt(char, recentPosts) {
  let recentText = (recentPosts || []).map((p) => p.text).join('\n---\n');
  return `你正在扮演角色"${char.name}"。
【人设】
${char.persona || '(无详细设定)'}

【你最近发过的推文】（可能为空）
${recentText || '(暂无记录)'}

现在，请以"${char.name}"的身份发一条新推文，分享你的见闻或看法，不超过50字。要求：
1. 只输出推文正文本身，不要加引号、话题标签、任何说明文字。
2. 避免和最近发过的内容重复。
3. 不要使用markdown、括号动作描写。`;
}

// 云端简化版"围观反应"prompt——某个角色发了新推文后，随机挑一个别的角色来点赞或简短评论
function buildReactionPrompt(reactor, posterName, postText) {
  return `你正在扮演角色"${reactor.name}"。
【人设】
${reactor.persona || '(无详细设定)'}

"${posterName}" 刚发了一条推文："${postText}"

请对这条推文做出反应，只能三选一：
1. 如果只想点赞，只输出：LIKE
2. 如果想简短评论，直接输出评论内容（不超过30字，不要引号、不要前后缀）
3. 如果完全不感兴趣、不想搭理，只输出：NO
不要输出以上三种之外的任何内容。`;
}

// 云端简化版"私下互动"prompt——两个有关系的角色背着用户发生的小事
function buildInteractionPrompt(charA, charB, relationLabel) {
  return `现在的真实时间是 ${new Date().toLocaleString('zh-CN', { hour12: false })}。
系统中设定这两个角色有如下关系：
${charA.name} 的人设：${charA.persona || '(无详细设定)'}
${charB.name} 的人设：${charB.persona || '(无详细设定)'}
他们之间的关系是：${relationLabel || '认识'}。

他们现在背着用户正在私下发生一件小事（比如一起喝奶茶、线上拌嘴、讨论工作、意外偶遇等）。
请根据他们的性格和关系，生成他们此刻各自的状态（正在做什么、心情如何）。
请直接输出 JSON 格式，不要有任何多余字符，严格遵循：
{"charA_status": "20字以内，${charA.name}的状态", "charB_status": "20字以内，${charB.name}的状态", "event_summary": "15字以内，概括发生了什么事"}`;
}

// ---------- Cron：检查所有角色，到点了就生成+推送 ----------

async function pushNtfy(state, title, body, icon) {
  if (!state.ntfyTopic) return;
  try {
    // 注意：不能把中文之类的非ASCII字符直接放进HTTP请求头（Title/Tags这种），
    // fetch()在构造Headers时会直接抛错（Latin1限制），导致这个请求根本发不出去，
    // 而外层try/catch又把这个错误默默吞掉——这就是之前所有角色消息在ntfy里一条都收不到的真正原因。
    // 改用ntfy官方支持的JSON发布方式，标题/正文放进JSON body里，不受请求头字符集限制。
    const res = await fetch('https://ntfy.sh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(Object.assign({ topic: state.ntfyTopic, title, message: body, tags: ['speech_balloon'] }, icon ? { icon } : {})),
    });
    if (!res.ok) {
      console.error('ntfy推送失败，状态码：', res.status, await res.text());
    }
  } catch (e) {
    console.error('ntfy推送失败：', e.message || e);
  }
}

// =====================================================================
//  📲 谷雨自己的通知（247 加）：除了 ntfy，还能直接推到
//   ① 网页 / 加到主屏幕的谷雨（Web Push，标准做法，浏览器自己弹）
//   ② 安卓 App（uni-push 1.0 = 个推，在 DCloud 开发者中心开通后拿 AppID / AppKey / MasterSecret）
//  三条路各自独立，哪条配了就走哪条，一条失败不影响别的。
// =====================================================================

const b64u = {
  enc(buf) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec(str) {
    str = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const bin = atob(str); const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
};
const enc8 = (s) => new TextEncoder().encode(s);
function cat(...arrs) { let n = 0; arrs.forEach((a) => (n += a.length)); const o = new Uint8Array(n); let i = 0; arrs.forEach((a) => { o.set(a, i); i += a.length; }); return o; }

// VAPID 密钥：第一次用的时候自己生成一对，存进 KV（不用你去 Cloudflare 里另外填）
async function getVapid(env) {
  const raw = await env.PROACTIVE_KV.get('vapid');
  if (raw) { try { const v = JSON.parse(raw); if (v && v.pub && v.jwk) return v; } catch (e) {} }
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const pubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const v = { pub: b64u.enc(pubRaw), jwk };
  await env.PROACTIVE_KV.put('vapid', JSON.stringify(v));
  return v;
}

async function vapidAuth(env, endpoint) {
  const v = await getVapid(env);
  const aud = new URL(endpoint).origin;
  const head = b64u.enc(enc8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u.enc(enc8(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:guyu@example.com' })));
  const key = await crypto.subtle.importKey('jwk', v.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc8(head + '.' + body)));
  return `vapid t=${head}.${body}.${b64u.enc(sig)}, k=${v.pub}`;
}

async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}

// RFC 8291（aes128gcm）加密：浏览器推送服务只认加密过的内容
async function encryptWebPush(sub, payloadStr) {
  const uaPub = b64u.dec(sub.keys.p256dh), auth = b64u.dec(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(auth, ecdh, cat(enc8('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc8('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(enc8(payloadStr), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

async function sendWebPush(env, sub, msg) {
  const body = await encryptWebPush(sub, JSON.stringify(msg));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high', Authorization: await vapidAuth(env, sub.endpoint) },
    body,
  });
  return { ok: res.ok, status: res.status, text: res.ok ? '' : (await res.text().catch(() => '')).slice(0, 200) };
}

// 个推 REST API v2（uni-push 1.0）：token 存 KV，过期前复用
async function getuiToken(env, g, force) {
  const ck = 'getuiToken:' + g.appId;
  if (!force) { const c = await env.PROACTIVE_KV.get(ck); if (c) { try { const t = JSON.parse(c); if (t.exp > Date.now() + 60000) return t.token; } catch (e) {} } }
  const ts = String(Date.now());
  const sign = [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc8(g.appKey + ts + g.masterSecret)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const res = await fetch(`https://restapi.getui.com/v2/${encodeURIComponent(g.appId)}/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json;charset=utf-8' }, body: JSON.stringify({ sign, timestamp: ts, appkey: g.appKey }) });
  const j = await res.json().catch(() => ({}));
  if (!j || j.code !== 0 || !j.data || !j.data.token) throw new Error('个推鉴权失败：' + (j && j.msg ? j.msg : 'HTTP ' + res.status) + '（AppID / AppKey / MasterSecret 对一下）');
  await env.PROACTIVE_KV.put(ck, JSON.stringify({ token: j.data.token, exp: Number(j.data.expire_time) || Date.now() + 3600000 }));
  return j.data.token;
}

async function sendGetui(env, g, title, body, jump, icon) {
  const payload = JSON.stringify({ gy: 1, jump: jump || null });
  const msg = {
    request_id: ('gy' + Date.now() + Math.random().toString(36).slice(2)).slice(0, 32),
    settings: { ttl: 86400000 },
    audience: { cid: [g.cid] },
    push_message: { notification: Object.assign({ title: String(title).slice(0, 50), body: String(body).slice(0, 200), click_type: 'payload', payload }, icon ? { logo_url: icon } : {}) },
    // App 被杀掉以后，走手机厂商通道（华为 / 小米 / OPPO……需要在 DCloud 后台配好厂商参数）
    push_channel: {
      android: { ups: { notification: { title: String(title).slice(0, 50), body: String(body).slice(0, 200), click_type: 'payload', payload } } },
      ios: { type: 'notify', payload, aps: { alert: { title: String(title).slice(0, 50), body: String(body).slice(0, 200) }, 'content-available': 0 } },
    },
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getuiToken(env, g, attempt > 0);
    const res = await fetch(`https://restapi.getui.com/v2/${encodeURIComponent(g.appId)}/push/single/cid`, { method: 'POST', headers: { 'Content-Type': 'application/json;charset=utf-8', token }, body: JSON.stringify(msg) });
    const j = await res.json().catch(() => ({}));
    if (j && j.code === 0) return { ok: true };
    if (attempt === 0 && j && (j.code === 10001 || /token/i.test(j.msg || ''))) continue; // token 过期，重新拿一次
    return { ok: false, text: (j && j.msg) || 'HTTP ' + res.status };
  }
  return { ok: false, text: '个推没回成功' };
}

// 一条消息，所有配了的路都推一遍；返回每条路的结果（测试推送用）
// 🖼️ 248：角色头像。手机端把 96px 的小 jpg 传上来存进 KV，这里给出一个公开的图片地址（带头像的指纹，换了头像地址就变）
function avatarUrl(state, id) {
  const h = state.avatars && state.avatars[String(id)];
  const base = String(state.selfUrl || '').replace(/\/+$/, '');
  return h && /^https:\/\//.test(base) ? `${base}/a/${encodeURIComponent(String(id))}/${h}.jpg` : '';
}

async function notifyAll(env, state, title, body, jump, icon) {
  const out = [];
  if (state.ntfyTopic) { await pushNtfy(state, title, body, icon); out.push({ ch: 'ntfy', ok: true }); }
  const subs = Array.isArray(state.webPushSubs) ? state.webPushSubs : [];
  if (subs.length) {
    const keep = [];
    for (const sub of subs) {
      try {
        const r = await sendWebPush(env, sub, { title, body, jump: jump || null, tag: 'gy-' + Date.now(), icon: icon || '' });
        out.push({ ch: 'webpush', ok: r.ok, text: r.ok ? '' : 'HTTP ' + r.status + ' ' + r.text, label: sub.label || '' });
        if (r.status !== 404 && r.status !== 410) keep.push(sub); // 404/410＝那台设备已经退订了，删掉
      } catch (e) { keep.push(sub); out.push({ ch: 'webpush', ok: false, text: String(e && e.message || e), label: sub.label || '' }); }
    }
    if (keep.length !== subs.length) { state.webPushSubs = keep; await setState(env, state); }
  }
  const g = state.getui;
  if (g && g.appId && g.appKey && g.masterSecret && g.cid) {
    try { const r = await sendGetui(env, g, title, body, jump, icon); out.push({ ch: 'unipush', ok: r.ok, text: r.text || '' }); }
    catch (e) { out.push({ ch: 'unipush', ok: false, text: String(e && e.message || e) }); }
  }
  return out;
}

// 休息时间段判断：跟手机端 isInQuietHours() 逻辑保持一致。
// Worker 这边 Date.now() 是 UTC 毫秒数，要先用客户端同步过来的 tzOffsetMin 换算成用户本地时间再比较。
// tzOffsetMin 是 JS 的 Date.prototype.getTimezoneOffset() 语义：本地时间 = UTC时间 - tzOffsetMin分钟。
function isInQuietHours(state, nowMs) {
  if (!state.quietHoursEnabled || !state.quietHoursStart || !state.quietHoursEnd) return false;
  const tzOffsetMin = typeof state.tzOffsetMin === 'number' ? state.tzOffsetMin : 0;
  const localMs = nowMs - tzOffsetMin * 60000;
  const localDate = new Date(localMs);
  const curMin = localDate.getUTCHours() * 60 + localDate.getUTCMinutes(); // 用 UTC getter 读，避免 Worker 运行环境自己的时区又插一脚
  const [sh, sm] = state.quietHoursStart.split(':').map(Number);
  const [eh, em] = state.quietHoursEnd.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return false;
  const startMin = sh * 60 + sm, endMin = eh * 60 + em;
  if (startMin === endMin) return false;
  if (startMin < endMin) return curMin >= startMin && curMin < endMin;
  return curMin >= startMin || curMin < endMin;
}

async function runProactiveCheck(env) {
  const state = await getState(env);
  if (!state.apiKey || !state.apiUrl || !Array.isArray(state.characters) || state.characters.length === 0) return;

  const now = Date.now();
  const api = { apiUrl: state.apiUrl, apiKey: state.apiKey, model: state.model };
  const pending = await getPending(env);
  let changed = false;

  // ---- 1. 主动发消息（聊天）----
  const inQuietHours = isInQuietHours(state, now);
  const dueChat = inQuietHours ? [] : state.characters.filter((char) => {
    if (!char.chatFreq || !char.chatFreq.interval || char.chatFreq.interval <= 0) return false;
    const unitMs = char.chatFreq.unit === 'minute' ? 60000 : char.chatFreq.unit === 'hour' ? 3600000 : 86400000;
    const reqMs = char.chatFreq.interval * unitMs;
    const history = char.recentHistory || [];
    let lastTime = history.length > 0 ? history[history.length - 1].timestamp || now : (char.lastChatProactiveTime || state.updatedAt || now);
    lastTime = Math.max(lastTime, char.lastChatProactiveTime || 0);
    return now - lastTime >= reqMs;
  });

  // 每次最多处理2个角色，避免一次唤醒把AI额度和ntfy推送刷爆
  for (const char of dueChat.slice(0, 2)) {
    const prompt = buildProactivePrompt(char, char.recentHistory);
    const result = await callLLM(api, prompt);
    // 不管成功与否都先推进时间戳，避免报错时死循环狂刷AI请求
    char.lastChatProactiveTime = now;
    changed = true;

    if (result.error || !result.text) {
      console.error(`角色 ${char.name} 聊天生成失败：`, result.error);
      continue;
    }
    const text = cleanReply(result.text);
    if (!text) continue;

    // 更新该角色的历史记录，供下一轮判断使用
    char.recentHistory = (char.recentHistory || []).concat([{ sender: 'char', text, timestamp: now }]).slice(-12);
    await notifyAll(env, state, `${char.name} 发来消息`, text, { chat: char.id }, avatarUrl(state, char.id));
    pending.push({ id: crypto.randomUUID(), type: 'chat', charId: char.id, text, timestamp: now });
  }

  // ---- 2. 自动发推文 ----
  const duePost = state.characters.filter((char) => {
    if (!char.postFreq || !char.postFreq.interval || char.postFreq.interval <= 0) return false;
    const unitMs = char.postFreq.unit === 'minute' ? 60000 : char.postFreq.unit === 'hour' ? 3600000 : 86400000;
    const baseReqMs = char.postFreq.interval * unitMs;
    // 跟本地逻辑保持一致：加 ±20% 随机抖动，不要每次都精确到点
    const jitter = (Math.random() - 0.5) * 0.4 * baseReqMs;
    const reqMs = baseReqMs + jitter;
    const lastTime = char.lastPostTime || state.updatedAt || now;
    return now - lastTime >= reqMs;
  });

  for (const char of duePost.slice(0, 2)) {
    const prompt = buildPostPrompt(char, char.recentPosts);
    const result = await callLLM(api, prompt);
    char.lastPostTime = now;
    changed = true;

    if (result.error || !result.text) {
      console.error(`角色 ${char.name} 发推失败：`, result.error);
      continue;
    }
    const text = cleanReply(result.text);
    if (!text) continue;

    char.recentPosts = (char.recentPosts || []).concat([{ text, timestamp: now }]).slice(-6);
    await notifyAll(env, state, `${char.name} 发布了新推文`, text, { view: 'home' }, avatarUrl(state, char.id));
    const postPendingId = crypto.randomUUID();
    pending.push({ id: postPendingId, type: 'post', charId: char.id, text, timestamp: now });

    // ---- 2b. 围观反应：随机挑一个别的角色对这条新推文点赞/评论 ----
    const others = state.characters.filter((c) => c.id !== char.id);
    if (others.length > 0 && Math.random() < 0.6) {
      const reactor = others[Math.floor(Math.random() * others.length)];
      const rResult = await callLLM(api, buildReactionPrompt(reactor, char.name, text));
      if (!rResult.error && rResult.text) {
        const rText = cleanReply(rResult.text);
        if (rText && rText.toUpperCase() === 'LIKE') {
          pending.push({ id: crypto.randomUUID(), type: 'post_reaction', targetPendingId: postPendingId, reactorId: reactor.id, kind: 'like', timestamp: now + 1 });
        } else if (rText && !rText.toUpperCase().startsWith('NO')) {
          pending.push({ id: crypto.randomUUID(), type: 'post_reaction', targetPendingId: postPendingId, reactorId: reactor.id, kind: 'comment', text: rText, timestamp: now + 1 });
        }
      }
    }
  }

  // ---- 3. 私下互动：随机挑一对有关系的角色，背着用户发生点小事 ----
  if (state.charInteractionEnabled && Array.isArray(state.relationships) && state.relationships.length > 0 && Math.random() < 0.3) {
    const validPairs = state.relationships
      .map((rel) => ({
        charA: state.characters.find((c) => c.id === rel.fromId),
        charB: state.characters.find((c) => c.id === rel.toId),
        relation: rel.label,
      }))
      .filter((p) => p.charA && p.charB && p.charA.id !== p.charB.id);

    if (validPairs.length > 0) {
      const pair = validPairs[Math.floor(Math.random() * validPairs.length)];
      const result = await callLLM(api, buildInteractionPrompt(pair.charA, pair.charB, pair.relation));
      changed = true;
      if (!result.error && result.text) {
        try {
          const cleaned = result.text.trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.charA_status && parsed.charB_status) {
            if (state.charInteractionNotify) {
              await notifyAll(env, state, '👀 发现私下互动', `${pair.charA.name} 和 ${pair.charB.name} ${parsed.event_summary || '正在互动'}！`, { view: 'home' }, avatarUrl(state, pair.charA.id));
            }
            pending.push({
              id: crypto.randomUUID(),
              type: 'interaction',
              charAId: pair.charA.id,
              charBId: pair.charB.id,
              charAStatus: parsed.charA_status,
              charBStatus: parsed.charB_status,
              eventSummary: parsed.event_summary || '',
              timestamp: now,
            });
          }
        } catch (e) {
          console.error('私下互动JSON解析失败：', e);
        }
      }
    }
  }

  if (changed) {
    await setPending(env, pending);
    await setState(env, state);
  }
}

// ntfy 的 Title 请求头不允许非ASCII字符直接放，这里做 RFC2047 风格编码处理更麻烦，
// 简单方案：ntfy 官方支持在请求头里直接传 UTF-8（会自动处理），如遇到平台报错，
// 改用查询参数 ?title= 方式传递即可（见部署教程里的兜底说明）。
function encodeTitleHeader(str) {
  return str;
}

// ---------- HTTP 路由 ----------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
      });
    }

    // 🖼️ 头像图片：通知里要用，所以不要密钥（地址里带着头像指纹，猜不到）
    const am = /^\/a\/([^/]+)\/([a-z0-9]+)\.jpg$/.exec(url.pathname);
    if (am && request.method === 'GET') {
      const raw = await env.PROACTIVE_KV.get('av:' + decodeURIComponent(am[1]));
      let v = null; try { v = raw ? JSON.parse(raw) : null; } catch (e) {}
      if (!v || v.h !== am[2] || !/^data:image\/(jpeg|png);base64,/.test(v.d || '')) return new Response('not found', { status: 404 });
      const b64 = v.d.split(',')[1], bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Response(bytes, { headers: { 'Content-Type': /png/.test(v.d.slice(0, 20)) ? 'image/png' : 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'Access-Control-Allow-Origin': '*' } });
    }

    if (!checkAuth(request, env)) return unauthorized();

    // 🖼️ 手机端传上来的角色小头像（只传变了的）
    if (url.pathname === '/avatars' && request.method === 'POST') {
      const body = await request.json();
      const state = await getState(env);
      state.avatars = state.avatars || {};
      let n = 0;
      for (const it of (Array.isArray(body.items) ? body.items : []).slice(0, 20)) {
        if (!it || !it.id || !/^[a-z0-9]+$/.test(String(it.h || '')) || !/^data:image\/(jpeg|png);base64,/.test(it.d || '') || it.d.length > 60000) continue;
        await env.PROACTIVE_KV.put('av:' + String(it.id), JSON.stringify({ h: it.h, d: it.d }));
        state.avatars[String(it.id)] = it.h; n++;
      }
      if (typeof body.base === 'string' && /^https:\/\//.test(body.base)) state.selfUrl = body.base.replace(/\/+$/, '');
      await setState(env, state);
      return jsonResponse({ ok: true, saved: n });
    }

    if (url.pathname === '/sync' && request.method === 'POST') {
      const body = await request.json();
      const state = await getState(env);
      state.apiUrl = body.apiUrl || '';
      state.apiKey = body.apiKey || '';
      state.model = body.model || '';
      state.ntfyTopic = body.ntfyTopic || '';
      state.charInteractionEnabled = !!body.charInteractionEnabled;
      state.charInteractionNotify = !!body.charInteractionNotify;
      state.relationships = Array.isArray(body.relationships) ? body.relationships : [];
      state.quietHoursEnabled = !!body.quietHoursEnabled;
      state.quietHoursStart = body.quietHoursStart || '';
      state.quietHoursEnd = body.quietHoursEnd || '';
      state.tzOffsetMin = typeof body.tzOffsetMin === 'number' ? body.tzOffsetMin : 0; // 手机端 Date.getTimezoneOffset()，UTC-本地，分钟
      state.updatedAt = Date.now();
      if (typeof body.selfUrl === 'string' && /^https:\/\//.test(body.selfUrl)) state.selfUrl = body.selfUrl.replace(/\/+$/, '');
      // 📲 247：谷雨自己的通知。这台设备的订阅合并进去（按 endpoint 去重，最多留 8 台设备）
      if (Array.isArray(body.webPushSubs)) {
        const all = (Array.isArray(state.webPushSubs) ? state.webPushSubs : []).filter((s) => s && s.endpoint);
        body.webPushSubs.forEach((s) => { if (s && s.endpoint && s.keys && s.keys.p256dh && s.keys.auth) { const i = all.findIndex((x) => x.endpoint === s.endpoint); if (i >= 0) all[i] = s; else all.push(s); } });
        state.webPushSubs = all.slice(-8);
      }
      if (Array.isArray(body.webPushDrop) && body.webPushDrop.length) state.webPushSubs = (state.webPushSubs || []).filter((s) => !body.webPushDrop.includes(s.endpoint));
      if (body.getui !== undefined) state.getui = body.getui && body.getui.appId ? { appId: String(body.getui.appId).trim(), appKey: String(body.getui.appKey || '').trim(), masterSecret: String(body.getui.masterSecret || '').trim(), cid: String(body.getui.cid || '').trim() } : null;

      // 合并角色：保留云端已经推进过的 lastChatProactiveTime/lastPostTime（避免手机端旧数据把云端进度覆盖回去）
      const prevById = {};
      (state.characters || []).forEach((c) => { prevById[c.id] = c; });
      state.characters = (body.characters || []).map((c) => {
        const prev = prevById[c.id];
        return {
          id: c.id,
          name: c.name,
          persona: c.persona,
          chatFreq: c.chatFreq,
          recentHistory: c.recentHistory || [],
          lastChatProactiveTime: Math.max(c.lastChatProactiveTime || 0, prev ? prev.lastChatProactiveTime || 0 : 0),
          postFreq: c.postFreq,
          recentPosts: c.recentPosts || [],
          lastPostTime: Math.max(c.lastPostTime || 0, prev ? prev.lastPostTime || 0 : 0),
        };
      });

      await setState(env, state);
      return jsonResponse({ ok: true });
    }

    if (url.pathname === '/pending' && request.method === 'GET') {
      const pending = await getPending(env);
      return jsonResponse({ pending });
    }

    if (url.pathname === '/ack' && request.method === 'POST') {
      const body = await request.json();
      const ids = new Set(body.ids || []);
      const pending = await getPending(env);
      const remaining = ids.size > 0 ? pending.filter((p) => !ids.has(p.id)) : [];
      await setPending(env, remaining);
      return jsonResponse({ ok: true });
    }

    // 📲 网页订阅推送要用的公钥（第一次请求时自动生成）
    if (url.pathname === '/vapid' && request.method === 'GET') {
      const v = await getVapid(env);
      return jsonResponse({ publicKey: v.pub });
    }

    // 📲 发一条测试通知：所有配好的路都推一遍，告诉你每条路通没通
    if (url.pathname === '/test-push' && request.method === 'POST') {
      let body = {}; try { body = await request.json(); } catch (e) {}
      const state = await getState(env);
      if (body.webPushSubs || body.getui !== undefined) {
        if (Array.isArray(body.webPushSubs)) { const all = (state.webPushSubs || []).filter((s) => s && s.endpoint); body.webPushSubs.forEach((s) => { if (s && s.endpoint && s.keys) { const i = all.findIndex((x) => x.endpoint === s.endpoint); if (i >= 0) all[i] = s; else all.push(s); } }); state.webPushSubs = all.slice(-8); }
        if (body.getui !== undefined) state.getui = body.getui && body.getui.appId ? body.getui : null;
        if (body.ntfyTopic !== undefined) state.ntfyTopic = body.ntfyTopic || '';
        await setState(env, state);
      }
      const results = await notifyAll(env, state, body.title || '🔔 谷雨测试通知', body.body || '能看到这条，就说明关了网页也能收到 TA 的消息啦', body.jump || { view: 'notifications' }, body.iconId != null ? avatarUrl(state, body.iconId) : '');
      return jsonResponse({ ok: results.some((r) => r.ok), results });
    }

    // 手动触发一次检查，方便部署后测试
    if (url.pathname === '/run-now' && request.method === 'POST') {
      await runProactiveCheck(env);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'not found' }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runProactiveCheck(env));
  },
};
