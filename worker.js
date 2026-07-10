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
  return raw ? JSON.parse(raw) : { characters: [], apiUrl: '', apiKey: '', model: '', ntfyTopic: '' };
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

async function pushNtfy(state, title, body) {
  if (!state.ntfyTopic) return;
  try {
    await fetch(`https://ntfy.sh/${state.ntfyTopic}`, {
      method: 'POST',
      headers: {
        Title: encodeTitleHeader(title),
        'Content-Type': 'text/plain; charset=utf-8',
        Tags: 'speech_balloon',
      },
      body,
    });
  } catch (e) {
    console.error('ntfy推送失败', e);
  }
}

async function runProactiveCheck(env) {
  const state = await getState(env);
  if (!state.apiKey || !state.apiUrl || !Array.isArray(state.characters) || state.characters.length === 0) return;

  const now = Date.now();
  const api = { apiUrl: state.apiUrl, apiKey: state.apiKey, model: state.model };
  const pending = await getPending(env);
  let changed = false;

  // ---- 1. 主动发消息（聊天）----
  const dueChat = state.characters.filter((char) => {
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
    await pushNtfy(state, `${char.name} 发来消息`, text);
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
    await pushNtfy(state, `${char.name} 发布了新推文`, text);
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
              await pushNtfy(state, '👀 发现私下互动', `${pair.charA.name} 和 ${pair.charB.name} ${parsed.event_summary || '正在互动'}！`);
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

    if (!checkAuth(request, env)) return unauthorized();

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
      state.updatedAt = Date.now();

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
