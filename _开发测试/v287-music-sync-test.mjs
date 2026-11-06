// 287：网易云 播放顺序（列表 / 单曲 / 随机）、装扮 = 音乐悬浮窗、登录后每日推荐 / 歌单 / 我喜欢的 同步还是 AI 生成；云端备份、苹果外观的入口去掉
// 用法（项目根目录）：node _开发测试/v287-music-sync-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(process.cwd(), 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.gyMu && window.gysMu, { timeout: 25000 });
const r = await page.evaluate(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  // 首页软件图标：没有云端备份、软件外观
  switchMainView('miniHub'); await s(600); const apps = [...document.querySelectorAll('#miniFeatureList .gyhm-a span')].map(x => x.textContent);
  o.apps = apps.includes('拼多多') && !apps.some(t => /云端备份|软件外观/.test(t)) && !window.gysCloudBkOpen;
  // 假装登录了网易云
  localStorage.setItem('gyMuCk', JSON.stringify({ ne: { ck: 'MUSIC_U=x', nick: '林' } }));
  const song = (id, n) => ({ src: 'ne', id: String(id), name: n, ar: '歌手' + id, al: '专辑', cover: 'data:image/png;base64,iVBORw0KGgo=', dur: 200000, vip: false });
  gyMu.daily = async () => [Object.assign(song(1, '日推一'), { why: '你常听' }), song(2, '日推二'), song(3, '日推三')];
  gyMu.lists = async () => [{ id: '10', name: '我的歌单A', n: 2, mine: true }, { id: '11', name: '我喜欢的音乐', n: 1, liked: true }];
  gyMu.list = async (src, id) => id === '10' ? [song(4, '歌单歌一'), song(5, '歌单歌二')] : [song(6, '红心歌')];
  window.__added = []; window.gymAddOnline = async (it) => { window.__added.push(it.name); return { id: 'on_' + it.id }; };
  gysMusicOpen(); await s(300);
  GYS.sheet = async () => 0; await gysMu.askSync(); await s(800);
  const D = window.gysMusicState ? gysMusicState() : null;
  o.daily = !!D && D.daily && D.daily.src === 'acc' && D.daily.ids.length === 3 && D.cfg.sync === 'acc';
  o.lists = !!D && D.lists.some(l => l.ext === 'ne:10' && l.ids.length === 2) && (D.likes[Object.keys(D.likes)[0]] || []).length >= 1;
  gysMu.daily && gysMu.daily(); await s(400); o.dailyTxt = /你网易云账号的每日推荐/.test(document.getElementById('gys_music').innerText);
  // 放同步来的歌：第一次放才挂音源
  const sid = D.daily.ids[0]; await gysMu.play(sid); await s(500); o.playSync = window.__added.includes('日推一');
  // 播放顺序
  const t0 = document.querySelector('#gys_music .mu2-ctl .mode'); o.modeBtn = !!t0 && t0.textContent === '🔁';
  gysMu.mode(); await s(200); o.mode1 = document.querySelector('#gys_music .mu2-ctl .mode').textContent === '🔂' && D.cfg.loop === 'one';
  gysMu.mode(); await s(200); o.mode2 = D.cfg.loop === 'shuffle'; gysMu.mode(); o.mode3 = D.cfg.loop === 'list';
  o.noFF = !document.querySelector('#gys_music .mu2-ff');
  // 改回 AI 生成
  gysMu.setSync('ai', 1); o.ai = D.cfg.sync === 'ai' && !D.daily;
  // 装扮
  let asked = ''; GYS.sheet = async (ops, t) => { asked = t + '|' + ops.join(','); return null; }; await gysMu.dress(); o.dress = /装扮/.test(asked) && /悬浮窗/.test(asked);
  GYS.close('music');
  return o;
});
check('首页软件图标里没有云端备份、软件外观', r.apps, JSON.stringify(r));
check('登录网易云后问同步还是生成；选同步：每日推荐来自账号、歌单和我喜欢的同步过来', r.daily && r.lists && r.dailyTxt, JSON.stringify(r));
check('同步来的歌第一次放时才去拿音源', r.playSync, JSON.stringify(r));
check('播放页最左边切播放顺序：🔁 列表 → 🔂 单曲 → 🔀 随机；底下那排三个键没了', r.modeBtn && r.mode1 && r.mode2 && r.mode3 && r.noFF, JSON.stringify(r));
check('能改回 AI 生成；装扮里是音乐悬浮窗', r.ai && r.dress, JSON.stringify(r));
check('没有报错', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 287 网易云：播放顺序 / 装扮 / 同步账号 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
