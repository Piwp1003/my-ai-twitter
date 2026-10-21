// 248：🎫 会员 / 一键登录（ChatGPT 会员走 Responses、OpenRouter OAuth、Gemini 免费 Key、Claude/Gemini 会员不做）
// 用法（项目根目录）：node _开发测试/v248-sub-login-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd();
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const subtle = crypto.subtle;
const b64u = b => Buffer.from(b).toString('base64url');
const kp = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = Object.assign(await subtle.exportKey('jwk', kp.publicKey), { kid: 'k1', use: 'sig', alg: 'RS256' });
async function idToken(claims) { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' })), p = b64u(JSON.stringify(claims)); const s = await subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p)); return h + '.' + p + '.' + b64u(new Uint8Array(s)); }

const browser = await launchBrowser(chromium);
async function open(desk) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  if (desk) await ctx.addInitScript(() => {
    window.__oauth = [];
    window.gyDesk = { isDesk: true, mcp: async () => ({ ok: false }), oauthLoopback: async o => {
      const u = new URL(o.authUrl); window.__oauth.push({ host: u.host, q: Object.fromEntries(u.searchParams), port: o.port, path: o.path, both: !!o.both });
      if (/openai/.test(u.host)) { window.__nonce = u.searchParams.get('nonce'); return { ok: true, query: { code: 'C1', state: u.searchParams.get('state'), client_id: 'cid1' } }; }
      return { ok: true, query: { code: 'ORC', state: u.searchParams.get('state') } };
    } };
  });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  return { ctx, page, errs };
}

// ---------- 桌面版 ----------
{
  const { ctx, page, errs } = await open(true);
  const seen = { token: [], resp: [], keys: [] }; let mode = 'ok', refreshCount = 0;
  await page.route(/^https?:\/\//, async r => {
    const u = r.request().url();
    if (u === 'https://auth.openai.com/.well-known/jwks.json') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ keys: [jwk] }) });
    if (u === 'https://auth.openai.com/api/accounts/oauth/token') {
      const f = Object.fromEntries(new URLSearchParams(r.request().postData() || '')); seen.token.push(f);
      if (f.grant_type === 'refresh_token') { refreshCount++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'A2', refresh_token: 'R2', expires_in: 3600 }) }); }
      const nonce = await page.evaluate(() => window.__nonce);
      const it = await idToken({ iss: 'https://auth.openai.com', aud: 'cid1', sub: 'u1', email: 'lin@example.com', nonce, exp: Math.floor(Date.now() / 1000) + 3600 });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'A1', refresh_token: 'R1', id_token: it, expires_in: 3600, scope: 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct' }) });
    }
    if (u === 'https://api.openai.com/v1/responses') {
      const b = JSON.parse(r.request().postData() || '{}'); seen.resp.push({ b, auth: r.request().headers().authorization });
      if (mode === 'limit') return r.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { code: 'subscription_sharing_usage_limit_exceeded', message: 'limit' } }) });
      const ev = [{ type: 'response.created' }, { type: 'response.output_text.delta', delta: '在呢，' }, { type: 'response.output_text.delta', delta: '想你了。' }, { type: 'response.completed', response: { usage: { input_tokens: 12, output_tokens: 6 } } }];
      return r.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: ev.map(e => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('') });
    }
    if (u === 'https://api.openai.com/v1/models') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'gpt-5' }, { id: 'gpt-5-mini' }] }) });
    if (u === 'https://openrouter.ai/api/v1/auth/keys') { const b = JSON.parse(r.request().postData() || '{}'); seen.keys.push(b); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ key: 'sk-or-v1-abc' }) }); }
    return r.abort();
  });
  await page.goto(fileUrl(path.join(root, 'index.html')));
  await page.waitForFunction(() => window.__guyuBooted && typeof window.gyCgLogin === 'function', { timeout: 20000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    switchMainView('settings'); openSettingsPanel('api'); await sleep(100);
    o.panel = !!document.getElementById('gySubBox') && /ChatGPT Plus/.test(document.getElementById('gySubBox').textContent) && /不做/.test(document.getElementById('gySubBox').textContent);
    await gyCgLogin('main');
    o.state = gySubState(); o.url = document.getElementById('apiUrlInput').value; o.key = document.getElementById('apiKeyInput').value; o.model = myModel;
    o.oauth = window.__oauth[0];
    // 普通聊天（不流式）+ 流式
    const d = await sendChatRequestRaw(getApiConfig(false), [{ role: 'system', content: '你是立夏' }, { role: 'user', content: '在吗' }]);
    o.plain = d && d.choices && d.choices[0].message.content;
    let s = ''; try { await streamCompletionText(getApiConfig(false), [{ role: 'user', content: '在吗' }], t => { s = typeof t === 'string' ? t : s; }); } catch (e) { o.serr = String(e.message || e); }
    o.stream = s;
    // 拉取模型
    try { o.models = (await fetchModelListFrom(myApiUrl, myApiKey)).map(x => x.id).join(','); } catch (e) { o.models = 'ERR ' + e.message; }
    // token 过期 → 自己续
    gySubExpire();
    return o;
  });
  check('设置 → API 与模型 最上面有「🎫 会员 / 一键登录」，写清楚 Claude / Gemini 会员为什么不做', r.panel);
  check('ChatGPT 会员登录：本机 127.0.0.1:1455 回调、PKCE、第一次用 dynamic_agent_client 注册、要会员额度的 scope', r.oauth && r.oauth.port === 1455 && r.oauth.q.client_id === 'dynamic_agent_client' && r.oauth.q.code_challenge_method === 'S256' && /chatgpt\.tokens\.use\.direct/.test(r.oauth.q.scope) && r.oauth.q.resource === 'https://api.openai.com/v1' && r.oauth.q.agent_name_hint === '谷雨' && r.oauth.q.ext_agent_host_id, JSON.stringify(r.oauth));
  const t0 = seen.token[0] || {};
  check('换 token：带 code_verifier、同一个回调地址、发下来的 client_id；ID token 验签过了', t0.client_id === 'cid1' && t0.code_verifier && t0.redirect_uri === 'http://127.0.0.1:1455/auth/callback' && r.state.cg && r.state.cg.email === 'lin@example.com', JSON.stringify(t0));
  check('登好以后主 API 自动填好（假地址 + 占位 Key）', r.url === r.state.cgBase && r.key === 'chatgpt-plan', r.url);
  const rb = (seen.resp[0] || {}).b || {};
  check('聊天走 OpenAI Responses：system → instructions，store:false、stream:true，带会员 token', rb.store === false && rb.stream === true && rb.instructions === '你是立夏' && (seen.resp[0] || {}).auth === 'Bearer A1' && !('temperature' in rb), JSON.stringify(rb).slice(0, 160));
  check('不流式 / 流式都能拿到回复', r.plain === '在呢，想你了。' && /在呢，想你了/.test(r.stream), r.plain + ' / ' + r.stream + ' ' + (r.serr || ''));
  check('拉取模型能列出会员能用的模型', r.models === 'gpt-5,gpt-5-mini', r.models);
  mode = 'limit';
  const r2 = await page.evaluate(async () => { const d = await sendChatRequestRaw(getApiConfig(false), '在吗'); return JSON.stringify(d); });
  check('一小时后 token 过期自己续上；额度用完说大白话', refreshCount === 1 && /额度用完了/.test(r2), 'refresh=' + refreshCount + ' ' + r2.slice(0, 80));
  const r3 = await page.evaluate(async () => { await gySubDo('or', 'sub'); await new Promise(r => setTimeout(r, 300)); return { u: document.getElementById('subApiUrlInput').value, k: document.getElementById('subApiKeyInput').value, o: window.__oauth[window.__oauth.length - 1] }; });
  check('OpenRouter 一键登录（桌面版本机回调）：Key 自动填进副 API', r3.u === 'https://openrouter.ai/api/v1' && r3.k === 'sk-or-v1-abc' && /^http:\/\/localhost:\d+\/callback$/.test(r3.o.q.callback_url) && r3.o.both && (seen.keys[0] || {}).code === 'ORC' && seen.keys[0].code_verifier, JSON.stringify(r3));
  check('桌面版这边没有页面报错', !errs.length, errs.join(' | '));
  await ctx.close();
}
// ---------- 网页版 ----------
{
  const { ctx, page, errs } = await open(false);
  await page.route(/^https?:\/\//, r => { const u = r.request().url(); if (/generativelanguage\.googleapis\.com\/v1beta\/openai\/models/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'models/gemini-2.5-pro' }, { id: 'models/gemini-2.5-flash-lite' }, { id: 'models/gemini-2.5-flash' }] }) }); return r.abort(); });
  await page.goto(fileUrl(path.join(root, 'index.html')));
  await page.waitForFunction(() => window.__guyuBooted && typeof window.gyCgLogin === 'function', { timeout: 20000 });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(async () => {
    const o = {}; switchMainView('settings'); openSettingsPanel('api'); await new Promise(r => setTimeout(r, 100));
    o.dis = Array.from(document.querySelectorAll('#gySubBox button[onclick*="\'cg\'"]')).every(b => b.disabled) && /只能在<b>桌面版|只能在桌面版/.test(document.getElementById('gySubBox').innerHTML);
    try { await gyCgLogin('main'); o.err = ''; } catch (e) { o.err = String(e.message); }
    window.appPrompt = async () => 'AIzaTEST';
    await gyGmFill('main');
    o.gm = [document.getElementById('apiUrlInput').value, document.getElementById('apiKeyInput').value, myModel];
    return o;
  });
  check('网页版：ChatGPT 会员按钮是灰的，点了会说要去桌面版', r.dis && /桌面版/.test(r.err), r.err);
  check('Gemini 免费 Key：粘进来自动配好地址，模型挑一个 flash', r.gm[0] === 'https://generativelanguage.googleapis.com/v1beta/openai' && r.gm[1] === 'AIzaTEST' && r.gm[2] === 'gemini-2.5-flash', JSON.stringify(r.gm));
  check('网页版这边没有页面报错', !errs.length, errs.join(' | '));
  await ctx.close();
}
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
