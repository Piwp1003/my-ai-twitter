// 280：社区（真人聊天）在谷雨里实际跑一遍。要先在本地开一个假社区服务器：
//   cd 一个放了 community-worker.js + wrangler.toml 的文件夹 && npx wrangler dev --port 8799 --local
//   （wrangler.toml 里绑定 D1，变量名 DB；数据库是空的才准——第一个进来的是群主）
// 用法（项目根目录）：node _开发测试/v280-community-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd();
const LOCAL = process.env.GY_COMM || 'http://localhost:8799';
const W = 'https://guyu-community.3040831326.workers.dev';
try { const j = await (await fetch(LOCAL + '/info')).json(); if (!j.empty) { console.log('⚠️ 本地社区不是空的，先删掉 .wrangler 文件夹重开（这次跳过）'); process.exit(0); } } catch (e) { console.log('⚠️ 本地社区服务器没开（' + LOCAL + '），这次跳过'); process.exit(0); }
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const errs = [];
async function user() {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('gyAdult', JSON.stringify({ ok: 1 })); } catch (e) {} });   // 303：服务器要「已确认年满 18 岁」
  await ctx.route(/^https?:\/\//, async r => {
    const u = r.request().url();
    if (!u.startsWith(W)) return r.abort();
    try { const q = r.request(); const resp = await r.fetch({ url: LOCAL + u.slice(W.length), method: q.method(), headers: q.headers(), postData: q.postDataBuffer() || undefined }); if (process.env.DBG && q.method() === 'POST') console.log('REQ', u, q.postData(), resp.status(), (await resp.text()).slice(0, 200)); await r.fulfill({ response: resp }); } catch (e) { r.abort(); }
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(fileUrl(path.join(root, 'index.html'))); await p.waitForFunction(() => window.__guyuBooted, { timeout: 25000 }); await p.waitForTimeout(1500);
  return p;
}
const s = ms => new Promise(r => setTimeout(r, ms));
const A = await user(), Bp = await user();

// A 先进 → 群主
await A.evaluate(() => gysCommOpen());
await s(1500);
check('打开社区：加入页（空社区说「第一个进来就是群主」）', await A.evaluate(() => /第一个进来就是群主/.test(document.querySelector('#gys_community').innerText)));
await A.fill('#cmJNick', '林'); await A.fill('#cmJHandle', 'lin'); await A.evaluate(() => gysComm.join()); await s(2500);
let st = await A.evaluate(() => { const x = gysCommState(); return { roles: x.B && x.B.me.roles, ch: x.B && x.B.channels.map(c => c.id), gate: gyGate.tok === x.S.tok && !!x.S.tok }; });
check('第一个加入 → 群主，频道都在', st.roles && st.roles.includes('owner') && st.ch.includes('lobby') && st.ch.includes('staff'), JSON.stringify(st));
check('社区登录同时就是开屏登录（钥匙共用）', st.gate);
check('频道页能看到', await A.evaluate(() => /大厅/.test(document.querySelector('#gys_community').innerText)));

// A 在大厅说话
await A.evaluate(() => gysComm.open('lobby')); await s(1200);
if (process.env.DBG) console.log(await A.evaluate(() => [document.querySelector('#gys_community').innerHTML.slice(0, 2500), JSON.stringify(Object.keys(gysCommState()))]), errs);
await A.fill('#cmIn', '大家好，我是林'); await A.evaluate(() => gysComm.send('lobby')); await s(1500);
check('在大厅发消息，自己这边出现', await A.evaluate(() => /大家好，我是林/.test(document.querySelector('#gys_community').innerText)));

// B 加入 → 普通成员，看得到 A 的话
await Bp.evaluate(() => gysCommOpen()); await s(1500);
await Bp.fill('#cmJNick', '小B'); await Bp.evaluate(() => gysComm.join()); await s(2500);
st = await Bp.evaluate(() => { const x = gysCommState(); return { roles: x.B && x.B.me.roles, staff: x.B && x.B.channels.some(c => c.id === 'staff') }; });
check('第二个人加入 → 普通成员，看不到管理员频道', st.roles && !st.roles.includes('owner') && !st.staff, JSON.stringify(st));
await Bp.evaluate(() => gysComm.open('lobby')); await s(2500);
check('别人那边能看到林说的话', await Bp.evaluate(() => /大家好，我是林/.test(document.querySelector('#gys_community').innerText)));
await Bp.fill('#cmIn', '林你好'); await Bp.evaluate(() => gysComm.send('lobby')); await s(5500);
check('B 回话，林那边几秒内自己刷出来', await A.evaluate(() => /林你好/.test(document.querySelector('#gys_community').innerText)));

// 私聊
const aid = await A.evaluate(() => gysCommState().B.me.id);
await Bp.evaluate(id => gysComm.dm(id), aid); await s(1200);
await Bp.fill('#cmIn', '私聊一下'); await Bp.evaluate(id => gysComm.dmSend(id), aid); await s(1500);
const got = await A.evaluate(async () => { const x = gysCommState(); return (x.DMS || []).some(m => m.text === '私聊一下'); });
let got2 = got; if (!got) { await s(5000); got2 = await A.evaluate(() => (gysCommState().DMS || []).some(m => m.text === '私聊一下')); }
check('私聊送到', got2);

// 改资料 → 大家同步
await Bp.evaluate(async () => { await fetch(gyGate.url + '/me', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Gy-Token': gyGate.tok }, body: JSON.stringify({ nick: '小B改名了', avatar: 'fabc123' }) }); });
await s(6000);
const bid = await Bp.evaluate(() => gysCommState().B.me.id);
check('B 改昵称 / 头像 → 林这边同步', await A.evaluate(id => { const x = gysCommState(); return JSON.stringify(x.B).includes('小B改名了') && JSON.stringify(x.B).includes('fabc123'); }, bid));

// 群主改设置（加入方式 / 开屏登录 / 最低版本）→ 服务器上变了
await A.evaluate(() => { gysComm.cfgPage(); }); await s(800);
check('社区设置页有「开屏登录」「最低版本」', await A.evaluate(() => { const t = document.querySelector('#gys_community').innerText; return /开屏登录/.test(t) && /最低版本/.test(t); }));
await A.evaluate(() => { gysComm.__join('invite'); gysComm.__gate(false); gysComm.__cv('minVer', '5'); gysComm.__cv('updUrl', 'https://x.y/a.apk'); }); await s(300);
await A.evaluate(() => gysComm.__saveCfg()); await s(1500);
const info = await (await fetch(LOCAL + '/info')).json();
check('群主改了 → 服务器上：邀请码模式、开屏登录关、最低版本 5', info.join === 'invite' && info.gate === false && info.minVer === 5 && info.updUrl === 'https://x.y/a.apk', JSON.stringify(info));
const r2 = await Bp.evaluate(async () => (await fetch(gyGate.url + '/cfg', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Gy-Token': gyGate.tok }, body: JSON.stringify({ gate: true }) })).json());
check('普通成员改不了开屏登录', !r2.ok);

// 邀请码
const code = await A.evaluate(async () => (await (await fetch(gyGate.url + '/invite', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Gy-Token': gyGate.tok }, body: '{}' })).json()).code);
const j1 = await (await fetch(LOCAL + '/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nick: 'C', adult: 1 }) })).json();
const j2 = await (await fetch(LOCAL + '/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nick: 'C', code, adult: 1 }) })).json();
check('邀请码模式：没码进不来，有码能进', !j1.ok && j2.ok, JSON.stringify([j1, j2]));

// 禁言 / 踢人（群主对成员）
const mu = await A.evaluate(async id => (await (await fetch(gyGate.url + '/mod', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Gy-Token': gyGate.tok }, body: JSON.stringify({ act: 'mute', uid: id, mins: 10 }) })).json()).ok, bid);
const sendB = await Bp.evaluate(async () => (await (await fetch(gyGate.url + '/send', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Gy-Token': gyGate.tok }, body: JSON.stringify({ ch: 'lobby', text: 'x' }) })).json()).ok);
check('禁言后说不了话', mu && !sendB);
const up = await Bp.evaluate(async id => (await (await fetch(gyGate.url + '/mod', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Gy-Token': gyGate.tok }, body: JSON.stringify({ act: 'kick', uid: id }) })).json()).ok, aid);
check('成员踢不了群主', !up);
// 收尾：把加入方式改回谁都能进（后面的云端备份测试要新加人）
await A.evaluate(async () => { await fetch(gyGate.url + '/cfg', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Gy-Token': gyGate.tok }, body: JSON.stringify({ join: 'open', gate: true }) }); });

// 角色同桌：林带一个角色坐下 → 别人看得到
await A.evaluate(async () => { myCharacters.push({ id: 9101, name: '谢云昭', persona: '副县长', worldbooks: [], diaryData: { letters: [], diaries: [] } }); GYS.sheet = async () => 0; await gysComm.sit('table'); });
await s(6000);
check('角色同桌：带角色坐下，别人那边看到座位和「坐下了」', await Bp.evaluate(async () => { await gysComm.open('table'); await new Promise(r => setTimeout(r, 2500)); const t = document.querySelector('#gys_community').innerText; return /谢云昭/.test(t) && /坐下了/.test(t); }));
// 各个页面都能打开（群主视角）
const pages = await A.evaluate(async () => { const s = ms => new Promise(r => setTimeout(r, ms)); const out = []; const T = () => document.querySelector('#gys_community').innerText;
  for (const [n, f] of [['成员', () => gysComm.members()], ['管理', () => gysComm.staff()], ['身份组', () => gysComm.rolesPage()], ['新身份组', () => gysComm.roleEdit()], ['新频道', () => gysComm.chEdit()], ['邀请码', () => gysComm.invites()], ['改资料', () => gysComm.editMe()], ['我', () => GYS.tab('community', 'me')], ['私聊', () => GYS.tab('community', 'dm')], ['好友', () => GYS.tab('community', 'fr')]]) {
    try { await f(); await s(700); out.push(n + ':' + (T().length > 20 ? 'ok' : 'empty')); } catch (e) { out.push(n + ':ERR ' + e.message); } }
  return out; });
check('成员 / 管理 / 身份组 / 频道 / 邀请码 / 改资料 / 我 / 私聊 / 好友 页面都能打开', pages.every(x => /:ok$/.test(x)), pages.join(' '));
// 关掉社区 → 不再连
check('「社区」在软件合集里（有开关）', /'gysPdd', 'gyComm'/.test((await import('fs')).readFileSync(path.join(root, 'js', '79-feature-hub.js'), 'utf8')));
check('没有报错', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 280 社区 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
