// 304：🗣️ 小人的声音——自带的合成声音（不花钱）/ 走语音接口两条路，六根滑杆 + 说话方式，默认不出声、点 ▶ 才放
// 用法（项目根目录）：node _开发测试/v304-voice3d-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd();
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e: typeof e === 'string' ? e : JSON.stringify(e) });
const browser = await launchBrowser(chromium, { args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('gyPlayOn', '1'); } catch (e) {} });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.__gyPlayReady, null, { timeout: 40000 });
await page.evaluate(() => {
  myCharacters.push({ id: 7001, name: '谢云昭', persona: '沉稳的副县长', worldbooks: [], diaryData: { letters: [], diaries: [] } }); window.currentChatSessionId = 7001;
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  window.__prompts = [];
  const fake = async (...a) => { window.__prompts.push(JSON.stringify(a)); return { choices: [{ message: { content: '{"pitch":22,"speed":35,"quality":40,"tone":18,"accent":40,"into":30,"mood":"沉稳","tail":"","hi":"来了","happy":"嗯，不错","sad":"","angry":"心里有数"}' } }] }; };
  window.sendChatRequest = fake; try { sendChatRequest = fake; } catch (e) {}
});
await page.waitForTimeout(1200);
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  o.mini = GY_MINI_FEATURES.some(f => f.id === 'gyx3dVoice') || (window.gyHubViews && gyHubViews().length > 0);
  gyx3dVoiceOpen(7001); await s(300);
  const t = (document.getElementById('gyx3dVoOv') || document.body).innerText;
  o.page = ['谷雨自带（不花钱）', '我自己接的语音接口', '音高', '语速', '音质', '音调', '口音', '抑扬', '说话方式', '句尾', '口头禅', '点 ▶ 才放'].filter(w => !t.includes(w) && !document.getElementById('gyx3dVoOv').innerHTML.includes(w));
  o.sliders = document.querySelectorAll('#gyx3dVoOv input[type=range]').length;
  // 默认：不出声
  o.offByDefault = gyx3dVoiceSay(7001, '你好呀') === false && !document.getElementById('gyx3dVoOffer');
  // 合成计划：每个字一个音，问号结尾往上扬，句号往下落；音高滑杆管用
  const p1 = gyx3dVoicePlan('你吃饭了吗？', 7001), p2 = gyx3dVoicePlan('我吃过了。', 7001);
  o.plan = p1.L.length === 5 && p1.L[4].end > 1 && p2.L.length === 4 && p2.L[3].end < 1 && p1.total > 0.3;
  gyx3dVoiceSet('pitch', 10); const lo = gyx3dVoicePlan('啊', 7001).L[0].f; gyx3dVoiceSet('pitch', 95); const hi = gyx3dVoicePlan('啊', 7001).L[0].f; o.pitch = hi > lo * 2;
  gyx3dVoiceSet('speed', 5); const slow = gyx3dVoicePlan('今天天气真好', 7001).total; gyx3dVoiceSet('speed', 95); const fast = gyx3dVoicePlan('今天天气真好', 7001).total; o.speed = slow > fast * 1.8;
  // 自带的声音：不发任何网络请求就能出声
  o.kind = await gyx3dVoiceSpeak(GYX.char(7001), '你好呀，我是谢云昭。'); gyx3dVoiceStop();
  // 开了：冒小条，点 ▶ 才放
  GYX.vSet('gyx3dVoice', true);
  o.offer = gyx3dVoiceSay(7001, '在呢，怎么了？') === true && !!document.getElementById('gyx3dVoOffer') && /在呢/.test(document.getElementById('gyx3dVoOffer').innerText);
  document.querySelector('#gyx3dVoOffer .p').click(); await s(200); gyx3dVoiceStop();
  // 桌面小 TA 冒泡时也会走这里
  o.petHook = !window.gyxPetSay || !!window.gyxPetSay.__v3d || (await (async () => { await s(1200); return !!(window.gyxPetSay && window.gyxPetSay.__v3d); })());
  // 现成声线 / 让 TA 自己捏 / 说话方式
  gyx3dVoicePreset('小孩'); await s(100); o.preset = gyx3dVoiceData().v['7001'].pitch === 90; gyx3dVoiceStop();
  await gyx3dVoiceAuto(null); await s(200); gyx3dVoiceStop();
  const d = gyx3dVoiceData(); o.auto = d.v['7001'].pitch === 22 && d.st['7001'].mood === '沉稳' && d.st['7001'].angry === '心里有数' && /朋友收集/.test(window.__prompts.join('')); o.emptyFixed = GYX.pl('3d.page', '', { who: 'x' }).length > 50 && GYX.pl('3d.room.react', '', {}).length > 50 && GYX.pl('3d.look', '', {}).length > 50;
  gyx3dVoiceSt('tail', '的说');
  const h = gyx3dStyleHint(GYX.char(7001)); o.hint = /语气沉稳/.test(h) && /句尾习惯带「的说」/.test(h) && /生气时爱说「心里有数」/.test(h);
  // 走接口那条路：用你配的语音；没放出来就退回自带的
  gyx3dVoiceCfg('path', 'api'); await s(100);
  const was = window.gyVoiceSpeak; let called = 0;
  window.gyVoiceSpeak = async () => { called++; return 'api-ok'; }; o.api = (await gyx3dVoiceSpeak(GYX.char(7001), '你好')) === 'api' && called === 1;
  window.gyVoiceSpeak = async () => { called++; return null; }; o.fallback = (await gyx3dVoiceSpeak(GYX.char(7001), '你好')) === 'babble'; gyx3dVoiceStop();
  window.gyVoiceSpeak = was; gyx3dVoiceCfg('path', 'built');
  return o;
});
check('🗣️ 页面：两条路、七根滑杆、说话方式、什么时候出声都在', r.page.length === 0 && r.sliders === 7, r);
check('🗣️ 默认不出声', r.offByDefault, r);
check('🗣️ 自带的声音：每个字一个音，问句往上扬、陈述句往下落；音高、语速滑杆管用', r.plan && r.pitch && r.speed, r);
check('🗣️ 自带的声音不用接口就能出声', r.kind === 'babble', r);
check('🗣️ 开了以后：小人开口冒小条，点 ▶ 才放；桌面小 TA 冒泡也接上了', r.offer && r.petHook, r);
check('🗣️ 现成声线能选；「让 TA 按人设自己捏」把声音和说话方式都填上', r.preset && r.auto, r);
check('🗣️ 说话方式会写进小人开口的提示词', r.hint, r);
check('修：3D 小人 / 3D 小屋那几条提示词以前取出来是空的（TA 收到白纸），现在有内容了', r.emptyFixed, r);
check('🗣️ 走语音接口：用你配的；没放出来自动退回自带的', r.api && r.fallback, r);
check('没有页面报错', !errs.length, errs.join(' | '));
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.e ? '' : '  ' + x.e.slice(0, 700))));
const p = results.filter(x => x.ok).length; console.log(`\n${p}/${results.length} 通过`); process.exit(p === results.length ? 0 : 1);
