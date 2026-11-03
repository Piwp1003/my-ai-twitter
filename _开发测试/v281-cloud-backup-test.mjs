// 281：☁️ 云端备份。要先开本地社区服务器（跟 v280-community-test 一样，wrangler.toml 里再绑一个 D1，变量名 BK）：
//   npx wrangler dev --port 8799 --local
// 用法（项目根目录）：node _开发测试/v281-cloud-backup-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd();
const LOCAL = process.env.GY_COMM || 'http://localhost:8799';
const W = 'https://guyu-community.3040831326.workers.dev';
try { await (await fetch(LOCAL + '/info')).json(); } catch (e) { console.log('⚠️ 本地社区服务器没开（' + LOCAL + '），这次跳过'); process.exit(0); }
const call = async (p, b, t) => (await fetch(LOCAL + p, { method: b ? 'POST' : 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, t ? { 'X-Gy-Token': t } : {}), body: b ? JSON.stringify(b) : undefined })).json();
const TOK = (await call('/join', { nick: '备份测试' + Date.now().toString(36) })).token;
const OTHER = (await call('/join', { nick: '别人' + Date.now().toString(36) })).token;
const browser = await launchBrowser(chromium);
const results = []; const check = (n, ok, e = '') => results.push({ n, ok: !!ok, e });
const errs = [];
let blockCommit = false;
async function device(tok) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await ctx.addInitScript(t => { try { if (!localStorage.getItem('gyGate')) localStorage.setItem('gyGate', JSON.stringify({ url: 'https://guyu-community.3040831326.workers.dev', tok: t })); } catch (e) {} }, tok);
  await ctx.route(/^https?:\/\//, async r => {
    const u = r.request().url(); if (!u.startsWith(W)) return r.abort();
    if (blockCommit && /\/bk\/commit/.test(u)) return r.abort();
    const q = r.request();
    try { const resp = await r.fetch({ url: LOCAL + u.slice(W.length), method: q.method(), headers: q.headers(), postData: q.postDataBuffer() || undefined }); await r.fulfill({ response: resp }); } catch (e) { r.abort(); }
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(fileUrl(path.join(root, 'index.html'))); await p.waitForFunction(() => window.__guyuBooted, { timeout: 25000 }); await p.waitForTimeout(1500);
  return p;
}
const s = ms => new Promise(r => setTimeout(r, ms));
const stub = p => p.evaluate(() => { GYS.confirm = async () => true; GYS.sheet = async () => 0; window.__refreshed = 0; window.refreshAppPage = async () => { window.__refreshed++; }; });

// 旧手机：有角色、聊天、插件数据
const A = await device(TOK); await stub(A);
await A.evaluate(async () => {
  myCharacters.push({ id: 7301, name: '谢云昭', persona: '副县长，白汤面加荷包蛋', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  globalChats['7301'] = [{ sender: 'user', text: '今晚吃面吗', timestamp: Date.now() }, { sender: 7301, text: '林记，加个蛋', timestamp: Date.now() }];
  await saveAllData();
  await localforage.createInstance({ name: 'gyx_cbtest', storeName: 'kv' }).setItem('k', { v: '插件里的数据' });
});
check('设置 → 数据 里有「☁️ 云端备份」入口', await A.evaluate(async () => { try { openSettingsPanel && openSettingsPanel('data'); } catch (e) {} await new Promise(r => setTimeout(r, 3500)); return !!document.getElementById('gyCloudBkRow') || !!document.querySelector('#setPanel-data'); }));
await A.evaluate(() => gysCloudBkOpen()); await s(1500);
check('打开云端备份：有「现在备份」、还没有备份', await A.evaluate(() => { const t = document.querySelector('#gys_cloudbk').innerText; return /现在备份/.test(t) && /还没有备份/.test(t); }));
await A.evaluate(() => gysCloudBk.now()); await A.waitForFunction(() => !gysCloudBk.__state().BUSY, { timeout: 60000 }); await s(800);
let st = await A.evaluate(() => { const x = gysCloudBk.__state(); return { last: x.S.last, err: x.S.err, n: (x.LIST || []).length, t: document.querySelector('#gys_cloudbk').innerText }; });
check('点「现在备份」→ 云端有一份（显示几个角色、几条聊天）', st.last && !st.err && /1 个角色|个角色/.test(st.t), JSON.stringify(st).slice(0, 300));

// 服务器上存的是密文
const L = await call('/bk/list', null, TOK); const b0 = L.list[0];
let raw = ''; for (let i = 0; i < b0.parts; i++) raw += (await call(`/bk/get?bid=${b0.id}&i=${i}`, null, TOK)).data;
const bin = Buffer.from(raw, 'base64').toString('latin1');
check('服务器上存的是加密过的（看不到角色名、聊天、API Key）', !/谢云昭|林记|myTwitter|persona/.test(bin) && !/谢云昭/.test(Buffer.from(raw, 'base64').toString('utf8')) && b0.meta && b0.meta.chars >= 1, JSON.stringify(b0.meta));
check('别人的钥匙拿不到这份', !(await call(`/bk/get?bid=${b0.id}&i=0`, null, OTHER)).ok);

// 新手机：用钥匙登录，自己问要不要恢复
const Bp = await device(TOK);
await s(5000);
check('新设备用同一把钥匙：自己弹出「云端有你的备份，要恢复吗」', await Bp.evaluate(() => /云端有你的备份/.test(document.body.innerText)));
await stub(Bp);
await Bp.evaluate(() => { document.querySelectorAll('.gys-dlg,.gys-dialog,.gys-alert').forEach(x => x.remove()); });
await Bp.evaluate(async () => { gysCloudBkOpen(); await new Promise(r => setTimeout(r, 1500)); const L = gysCloudBk.__state().LIST; await gysCloudBk.pick(L[0].id); });
await Bp.waitForFunction(() => window.__refreshed > 0 || (gysCloudBk.__state().BUSY === '' && /没成功/.test(document.body.innerText)), { timeout: 60000 }).catch(() => {});
await s(800);
let r = await Bp.evaluate(async () => ({ refreshed: window.__refreshed, chars: myCharacters.map(c => c.name), chat: (globalChats['7301'] || []).map(m => m.text), plug: await localforage.createInstance({ name: 'gyx_cbtest', storeName: 'kv' }).getItem('k'), gate: JSON.parse(localStorage.getItem('gyGate')).tok }));
check('恢复：角色、聊天记录回来了', r.chars.includes('谢云昭') && r.chat.includes('林记，加个蛋'), JSON.stringify(r).slice(0, 300));
check('恢复：插件 / 小盒子的数据也回来了', r.plug && r.plug.v === '插件里的数据', JSON.stringify(r.plug));
check('恢复后钥匙还是现在这把，恢复完叫你刷新', r.gate === TOK && r.refreshed > 0);
// 撤销
await Bp.evaluate(async () => { window.__refreshed = 0; await gysCloudBk.undo(); });
await s(1500);
r = await Bp.evaluate(() => ({ chars: myCharacters.map(c => c.name), refreshed: window.__refreshed }));
check('撤销上一次恢复 → 回到恢复前的样子', !r.chars.includes('谢云昭') && r.refreshed > 0, JSON.stringify(r));

// 传到一半断了：旧的不动
blockCommit = true;
await A.evaluate(() => gysCloudBk.now()); await A.waitForFunction(() => !gysCloudBk.__state().BUSY, { timeout: 60000 }); await s(500);
blockCommit = false;
st = await A.evaluate(() => gysCloudBk.__state().S.err);
check('传到一半断了：报没成功，云端原来那份还在', !!st && (await call('/bk/list', null, TOK)).list.length === 1, st);
// 留最近 2 份
await A.evaluate(() => gysCloudBk.now()); await A.waitForFunction(() => !gysCloudBk.__state().BUSY, { timeout: 60000 });
await A.evaluate(() => gysCloudBk.now()); await A.waitForFunction(() => !gysCloudBk.__state().BUSY, { timeout: 60000 });
check('云端只留最近 2 份', (await call('/bk/list', null, TOK)).list.length === 2);
// 钥匙不对解不开
const bad = await A.evaluate(async () => { const { text } = await gysCloudBk.__seal({ x: 1 }); const g = JSON.parse(localStorage.getItem('gyGate')); const t0 = g.tok; gyGate.set(t0.split('.')[0] + '.wrongsecret', g.url); let m = ''; try { await gysCloudBk.__open(text); } catch (e) { m = e.message; } gyGate.set(t0, g.url); return m; });
check('钥匙不对：解不开（提示「不是用现在这把钥匙存的」）', /不是用现在这把钥匙/.test(bad), bad);
// 不带图片
const small = await A.evaluate(async () => { currentUser.avatarImg = 'data:image/png;base64,' + 'A'.repeat(200000); const a = await gysCloudBk.__pack(true), b = await gysCloudBk.__pack(false); return [JSON.stringify(a.obj).length, JSON.stringify(b.obj).length]; });
check('「不带图片」时大图不打包', small[1] < small[0] - 150000, JSON.stringify(small));
// 开关 + 接进去
const wires = await A.evaluate(() => ({ auto: GY_AUTONOMY_ACTIONS.some(a => a.key === 'gys_cloudbk_nag'), mini: GY_MINI_FEATURES.some(f => f.id === 'gyCloudBkApp'), autoOff: !gysCloudBk.__on() }));
check('自主行动（TA 提醒你备份）、小功能入口都在；每天自动备份默认关', wires.auto && wires.mini && wires.autoOff, JSON.stringify(wires));
check('没有报错', !errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
const pass = results.filter(x => x.ok).length;
console.log('\n===== 281 云端备份 =====');
results.forEach(x => console.log(`${x.ok ? '✅' : '❌'} ${x.n}${x.ok ? '' : ' ' + x.e}`));
console.log(`\n${pass}/${results.length} 通过`);
