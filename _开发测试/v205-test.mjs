// v205：🎙️ TA 的声音（语音模型 / 每人自己的声音 / 语音条 / 你发语音 / 转文字 / 语音库）+ 📔 心情手账 + 📊 统计词云 + 🎬 开场动画
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';

const root = process.cwd();
const browser = await launchBrowser(chromium);
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
const REQ = [];
const MP3 = Buffer.from([0xff, 0xfb, 0x90, 0x44, 0, 0, 0, 0]);
await page.route(/^https?:\/\//, async r => {
  const u = r.request().url(), body = r.request().postData() || '';
  const h = r.request().headers();
  if (/tts\.test|minimax|openspeech|fish\.audio|sovits\.test|custom\.test|stt\.test/.test(u)) REQ.push({ u, body: /stt\.test/.test(u) ? '(form)' : body, auth: h.authorization || '' });
  if (/tts\.test\/v1\/audio\/speech/.test(u)) return r.fulfill({ status: 200, contentType: 'audio/mpeg', body: MP3 });
  if (/minimax/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { audio: MP3.toString('hex') }, base_resp: { status_code: 0 } }) });
  if (/openspeech/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 3000, data: MP3.toString('base64') }) });
  if (/fish\.audio|sovits\.test|custom\.test/.test(u)) return r.fulfill({ status: 200, contentType: 'audio/mpeg', body: MP3 });
  if (/stt\.test/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: '想你了' }) });
  return r.abort();
});
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.gyVoiceSpeak && window.gyMoodOpen && window.__gyPmW, { timeout: 20000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  myCharacters.length = 0;
  myCharacters.push({ id: 9951, name: '顾言', persona: '温柔', worldbooks: [], actMode: 'fixed' }, { id: 9952, name: '沈之遥', worldbooks: [], actMode: 'auto' });
  globalChats['9951'] = [{ sender: 9951, text: '早点睡', timestamp: Date.now() - 86400000 * 2 }, { sender: 'me', text: '好哦', timestamp: Date.now() - 86400000 }, { sender: 9951, text: '[语音]晚安呀，梦里见', timestamp: Date.now() - 60000 }];
  globalChats['9952'] = [{ sender: 9952, text: '[语音]在忙，等下打给你', timestamp: Date.now() - 50000 }];
  HTMLMediaElement.prototype.play = function () { window.__played = (window.__played || 0) + 1; setTimeout(() => this.onended && this.onended(), 30); return Promise.resolve(); };
});

// ================= 接口 =================
const syn = await page.evaluate(async () => {
  await gyVoiceOpen('9951');
  const out = {};
  const run = async (p, f) => { await gyVoiceSetProv('def', p); for (const [k, v] of Object.entries(f)) await gyVoiceSetF('def', k, v); try { out[p] = !!(await gyVoiceSynth(9951, '[语音]你好（笑）' + p)); } catch (e) { out[p] = 'ERR ' + e.message; } };
  await run('openai', { url: 'https://tts.test/v1', key: 'k1', model: 'tts-1', voice: 'nova' });
  await run('minimax', { url: 'https://api.minimax.test/v1/t2a_v2', key: 'k2', group: 'g9', voice: 'female-shaonv', emotion: 'happy' });
  await run('volc', { url: 'https://openspeech.bytedance.com/api/v1/tts', appid: 'a1', key: 'k3', voice: 'zh_male_x' });
  await run('sovits', { url: 'http://sovits.test:9880/tts', ref: 'D:/ref.wav', prompt: '参考那句' });
  await run('fish', { url: 'https://api.fish.audio/v1/tts', key: 'k4', voice: 'ref123' });
  await run('custom', { url: 'http://custom.test/tts?text={text}&voice={voice}', voice: 'v9' });
  return out;
});
check('六家接口都能出声音（OpenAI 格式 / MiniMax / 豆包 / GPT-SoVITS / Fish / 自定义）', Object.values(syn).every(v => v === true), JSON.stringify(syn));
const R = k => REQ.find(x => x.u.includes(k)) || {};
check('OpenAI 格式：自动补 /v1/audio/speech，带音色和 Key', /tts\.test\/v1\/audio\/speech/.test(R('tts.test').u) && /"voice":"nova"/.test(R('tts.test').body) && R('tts.test').auth === 'Bearer k1', JSON.stringify(R('tts.test')));
check('念之前把 [语音]、括号里的动作去掉', /"input":"你好openai"/.test(R('tts.test').body), R('tts.test').body);
check('MiniMax：GroupId、voice_id、情绪都带上；hex 解出来', /GroupId=g9/.test(R('minimax').u) && /female-shaonv/.test(R('minimax').body) && /"emotion":"happy"/.test(R('minimax').body), JSON.stringify(R('minimax')));
check('豆包：appid + Bearer;token + voice_type', /"appid":"a1"/.test(R('openspeech').body) && R('openspeech').auth === 'Bearer;k3' && /zh_male_x/.test(R('openspeech').body), JSON.stringify(R('openspeech')));
check('GPT-SoVITS：参考音频和那句话都放进地址', /ref_audio_path=D%3A%2Fref\.wav/.test(R('sovits.test').u) && /prompt_text=/.test(R('sovits.test').u), R('sovits.test').u);
check('自定义地址：{text}{voice} 换掉', /text=%E4%BD%A0%E5%A5%BDcustom&voice=v9/.test(R('custom.test').u), R('custom.test').u);
const n0 = REQ.length;
await page.evaluate(() => gyVoiceSynth(9951, '[语音]你好（笑）custom'));
check('同一句再念：用存下来的，不再花钱', REQ.length === n0, REQ.length + ' vs ' + n0);

// ================= 每个角色自己的声音 =================
const per = await page.evaluate(async () => {
  await gyVoiceSetProv('def', 'openai'); await gyVoiceSetF('def', 'url', 'https://tts.test/v1'); await gyVoiceSetF('def', 'voice', 'alloy');
  gyVoiceWho('9951'); await gyVoiceMode('voice'); await gyVoiceSetF('char', 'voice', 'onyx');
  gyVoiceWho('9952'); await gyVoiceMode('own'); await gyVoiceSetProv('own', 'minimax'); await gyVoiceSetF('own', 'voice', 'male-qn-jingying');
  return { gu: gyVoiceCfgFor(9951), shen: gyVoiceCfgFor(9952) };
});
check('每个角色自己的声音：顾言=默认接口换音色，沈之遥=自己一整套 MiniMax', per.gu.prov === 'openai' && per.gu.voice === 'onyx' && per.shen.prov === 'minimax' && per.shen.voice === 'male-qn-jingying', JSON.stringify(per));
check('面板：默认声音、每个角色、语音条、你发语音条（转文字接口）、语音库', await page.evaluate(() => { const t = document.getElementById('gyVoOv').innerText; document.getElementById('gyVoOv').remove(); return ['默认声音', '每个角色自己的声音', '语音条', '你发语音条', '转文字接口', '语音库', '从不', '经常'].every(x => t.includes(x)); }));

// ================= TA 的语音条 =================
await page.evaluate(() => { switchMainView('chat'); switchChatSession('9951'); });
await page.waitForTimeout(400);
const vb = await page.evaluate(() => { const b = document.querySelector('#chatMessagesArea .chat-bubble.gyvc'); if (!b) return null; const idx = +/showChatContextMenu\(event,\s*(\d+)\)/.exec(b.getAttribute('oncontextmenu'))[1]; showChatContextMenu({ preventDefault() {}, pageX: 50, pageY: 50 }, idx); const m = document.getElementById('chatContextMenu').innerText; document.getElementById('chatContextMenu').style.display = 'none'; return { t: b.innerText, dot: !!b.querySelector('.gyvc-dot'), menu: /转文字/.test(m), idx }; });   // v210 起「转文字」在长按 / 右键菜单里
check('TA 发的 [语音] 画成语音条（秒数 + 未听红点；长按菜单里有转文字）', vb && /″/.test(vb.t) && vb.dot && vb.menu && !/晚安呀/.test(vb.t.split('″')[0]), JSON.stringify(vb));
const pl = await page.evaluate(async () => { const el = document.querySelector('#chatMessagesArea .gyvc .gyvc-bar'); const idx = +/(\d+)/.exec(el.getAttribute('onclick'))[1]; const r = await gyVoicePlayMsg(idx, el); return { r, played: globalChats['9951'][idx].voicePlayed }; });
check('接了语音模型：点语音条用 TA 的声音（onyx）念', pl.r === 'model' && pl.played && REQ.some(x => /"voice":"onyx"/.test(x.body) && /晚安呀/.test(x.body)), JSON.stringify(pl));
check('转文字：点一下露出文字', await page.evaluate(() => { const b = document.querySelector('#chatMessagesArea .gyvc'); gyVoiceToText(+/showChatContextMenu\(event,\s*(\d+)\)/.exec(b.getAttribute('oncontextmenu'))[1], true); return getComputedStyle(b.querySelector('.gyvc-tx')).display !== 'none' && /晚安呀/.test(b.querySelector('.gyvc-tx').innerText); }));
// 没接模型的角色
await page.evaluate(async () => { await gyVoiceOpen('9952'); await gyVoiceMode('def'); await gyVoiceSetProv('def', 'browser'); document.getElementById('gyVoOv').remove(); switchChatSession('9952'); });
await page.waitForTimeout(300);
const nt = await page.evaluate(async () => { const el = document.querySelector('#chatMessagesArea .gyvc .gyvc-bar'); const r = await gyVoicePlayMsg(0, el); const b = el.closest('.gyvc'); return { r, shown: getComputedStyle(b.querySelector('.gyvc-tx')).display !== 'none' }; });
check('没接语音模型的角色：语音条照样发，点开只能转文字', nt.r === 'text' && nt.shown, JSON.stringify(nt));

// ================= 发文字还是语音 =================
const cx = await page.evaluate(() => ({ gu: __gyVoiceCtxFor(9951), shen: __gyVoiceCtxFor(9952) }));
check('自主模式的沈之遥：发文字还是语音 TA 自己定；默认模式的顾言提示里没有这句', /自己看情况定/.test(cx.shen) && !/自己看情况定/.test(cx.gu) && /\[语音\] 的消息是语音条/.test(cx.gu), JSON.stringify(cx));
const cv = await page.evaluate(async () => {
  await gyVoiceOpen('9951'); gyVoiceWho('9951'); await gyVoiceSetF('char', 'freq', 'always'); document.getElementById('gyVoOv').remove();
  globalChats['9951'].push({ sender: 9951, text: '到家了吗', timestamp: Date.now() }); globalChats['9952'].push({ sender: 9952, text: '到家了吗', timestamp: Date.now() });
  __gyVoiceConvert();
  const a = globalChats['9951'].slice(-1)[0].text, b = globalChats['9952'].slice(-1)[0].text;
  await gyVoiceOpen('9951'); gyVoiceWho('9951'); await gyVoiceSetF('char', 'freq', 'never'); document.getElementById('gyVoOv').remove();
  globalChats['9951'].push({ sender: 9951, text: '吃饭没', timestamp: Date.now() }); __gyVoiceConvert();
  return { a, b, c: globalChats['9951'].slice(-1)[0].text };
});
check('默认模式按频率：设成「总是」→ 回复变语音条；「从不」→ 文字；自主模式的不替 TA 改', cv.a === '[语音]到家了吗' && cv.b === '到家了吗' && cv.c === '吃饭没', JSON.stringify(cv));

// ================= 你发语音条 =================
await page.evaluate(() => { switchChatSession('9951'); window.triggerAIBatchReply = async () => {}; });
const mine = await page.evaluate(async () => { const m = await gyVoiceSendMine('我到家啦', new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' }), 3); await new Promise(r => setTimeout(r, 300)); const b = [...document.querySelectorAll('#chatMessagesArea .chat-bubble.gyvc-me')].pop(); const idx = +/(\d+)/.exec(b.querySelector('.gyvc-bar').getAttribute('onclick'))[1]; const r = await gyVoicePlayMsg(idx, b.querySelector('.gyvc-bar')); return { text: m && m.text, sec: m && m.voiceSec, key: !!(m && m.uvoice), r, bub: b.innerText }; });
check('你发语音条：聊天里是你的语音条（3″），点一下放你录的那段', mine.text === '[语音]我到家啦' && mine.sec === 3 && mine.key && mine.r === 'mine' && /3″/.test(mine.bub), JSON.stringify(mine));
const stt = await page.evaluate(async () => { await gyVoiceOpen('9951'); await gyVoiceSetF('stt', 'url', 'https://stt.test/v1'); await gyVoiceSetF('stt', 'key', 'sk'); document.getElementById('gyVoOv').remove(); return gyVoiceSttApi(new Blob([new Uint8Array([1])], { type: 'audio/webm' })); });
check('转文字接口（Whisper 格式）：录音变文字', stt === '想你了' && REQ.some(x => /stt\.test\/v1\/audio\/transcriptions/.test(x.u) && x.auth === 'Bearer sk'), stt);
check('聊天栏有 🎙️ 发语音条按钮', await page.evaluate(() => !!document.getElementById('gyVoRecBtn')));

// ================= 朗读 / 语音库 / 打电话 =================
const rd = await page.evaluate(async () => {
  const o = window.gyVoiceSpeak; let got = null; window.gyVoiceSpeak = async (w, t) => { got = [String(w), t]; return 'model'; };
  chatContextMenuMsgIdx = 0; chatContextMenuTarget = { name: '顾言', text: '早点睡' }; contextActionSpeakChat(); window.gyVoiceSpeak = o; return got;
});
check('长按「朗读」TA 的话：用 TA 的声音', rd && rd[0] === '9951' && rd[1] === '早点睡', JSON.stringify(rd));
const clip = await page.evaluate(async () => {
  await gyVoiceOpen('9951'); document.getElementById('gyVoClipWho').value = '顾言';
  await gyVoiceUpload({ files: [new File([new Uint8Array([9, 9])], '晚安.mp3', { type: 'audio/mpeg' })], value: '' });
  const box = document.getElementById('gyVoClips').innerText; document.getElementById('gyVoOv').remove();
  const r = await gyVoiceSpeak(9951, '好啦，晚安');
  return { box, r, other: await gyVoiceClip(myCharacters[1], '晚安') };
});
check('语音库：上传「晚安」录音，TA 说到晚安就放本人录音（别人不放）', /晚安/.test(clip.box) && clip.r === 'clip' && clip.other === null, JSON.stringify(clip));
check('打电话：有自己声音的角色走 TA 的声音（没设置的走原来那套）', await page.evaluate(async () => { const had = gyVoiceHas(9951); return had; }));

// ================= 📔 心情手账 =================
const md = await page.evaluate(async () => {
  window.__gyMoodAlways = true; window.__sent = []; window.sendProactiveChatMessage = async c => { window.__sent.push([c.id, getBoxPrompt(c)]); };
  window.sendChatRequest = async () => ({ choices: [{ message: { content: '{"m":"想你","note":"她今天好像有点累，想抱抱她。"}' } }] });
  window.getApiConfig = () => ({ url: 'https://x', key: 'k', model: 'm' });
  switchChatSession('9951');
  await gyMoodOpen('mood'); await new Promise(r => setTimeout(r, 400));
  const k = (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date());
  const ta = gyMoodData().days[k].ta['9951'];
  gyMoodSet(k, '委屈'); document.getElementById('gyMdNote').value = '被骂了'; await gyMoodSave(k);
  await new Promise(r => setTimeout(r, 200));
  return { ta, t: document.getElementById('gyMdBody').innerText, sent: window.__sent.map(x => [x[0], /委屈/.test(x[1]) && /被骂了/.test(x[1]) && /由头/.test(x[1])]), ctx: __gyMoodCtxFor(9951) };
});
check('TA 自己写今天的心情手账（接模型）', md.ta && md.ta.m === '想你' && /想抱抱她/.test(md.ta.note), JSON.stringify(md.ta));
check('你记「委屈 · 被骂了」：日历上有，TA 那一页也在', /委屈/.test(md.t) && /想抱抱她/.test(md.t), md.t.slice(0, 200));
check('TA 看得到你的心情，难过时主动来找你（带着由头）', md.sent.length === 1 && md.sent[0][0] === 9951 && md.sent[0][1] && /委屈/.test(md.ctx), JSON.stringify(md));
check('自主模式：「写今天的心情手账」在 TA 能做的事里', await page.evaluate(() => GY_AUTONOMY_ACTIONS.some(a => a.key === 'mood_note') && GY_AUTONOMY_ACTIONS.some(a => a.key === 'voice_msg')));

// ================= 📊 统计 · 词云 =================
const st = await page.evaluate(async () => { for (let i = 0; i < 6; i++) globalChats['9951'].push({ sender: i % 2 ? 'me' : 9951, text: i % 2 ? '想你想你' : '乖乖睡觉', timestamp: Date.now() - i * 1000 }); await gyMoodOpen('stat'); const b = document.getElementById('gyMdBody'); return { t: b.innerText, bars: b.querySelectorAll('.gymd-hrs i').length, cloud: b.querySelectorAll('.gymd-cloud span').length }; });
check('统计：消息数、谁说得多、聊过几天、最长连着聊、最爱几点聊、最常说的话、词云', /条消息/.test(st.t) && /天聊过/.test(st.t) && /最长连着聊/.test(st.t) && /最爱在/.test(st.t) && /乖乖睡觉/.test(st.t) && st.bars === 24 && st.cloud > 1, JSON.stringify(st).slice(0, 300));

// ================= 🎬 开场动画 =================
const it = await page.evaluate(async () => { await gyMoodOpen('intro'); await gyIntroSet('lines', '今天也想你\n早点回来'); document.getElementById('gyMdOv').remove(); gyIntroPlay(); await new Promise(r => setTimeout(r, 1800)); const el = document.getElementById('gyIntro'); const r = el ? { t: el.innerText } : null; if (el) el.click(); return r; });
check('开场动画：星空 + 大标题 + 自己写的一句', it && /谷雨/.test(it.t) && /(今天也想你|早点回来)/.test(it.t), JSON.stringify(it));
check('小手机小组件「心情手账」', await page.evaluate(() => { gyPmSet(true); gyPmUnlock(); gyPmAddW('moodbook', 'm'); return new Promise(r => setTimeout(() => { const el = document.querySelector('#gyPmHome .gw-md'); r(el && /委屈|😢/.test(el.innerText)); gyPmSet(false); }, 600)); }));
check('小功能里有：TA 的声音 / 心情手账 / 聊天统计 / 开场动画', await page.evaluate(() => ['voice', 'moodbook', 'chatstat', 'intro'].every(k => GY_MINI_FEATURES.some(f => f.id === k))));

check('整个过程没有页面报错', errs.length === 0, errs.join(' | ').slice(0, 400));
await browser.close();
const bad = results.filter(r => !r.ok);
results.forEach(r => console.log((r.ok ? '  ✅' : '  ❌') + ' ' + r.n + (r.ok ? '' : '\n       → ' + r.extra)));
console.log('\n' + (results.length - bad.length) + '/' + results.length + ' 通过');
process.exit(bad.length ? 1 : 0);
