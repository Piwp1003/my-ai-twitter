// 248：👥 NPC 列表（生成 / 绑定 / 删角色时问 / 评论比例 / 头像裁剪 / 老数据搬家）
// 用法（项目根目录）：node _开发测试/v248-npc-list-test.mjs
import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'path';
const root = process.cwd();
const results = [];
const check = (n, ok, extra = '') => results.push({ n, ok: !!ok, extra });
const browser = await launchBrowser(chromium);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
const bodies = [];
let genReply = { npcs: [{ name: '老周', ico: '🍜', who: '面馆老板', tie: '看着立夏长大的', persona: '嘴碎心软', tone: '爱念叨', handle: 'laozhou' }, { name: '小鹿', ico: '🦌', who: '同事', tie: '跟立夏抢项目', persona: '好胜', tone: '阴阳怪气', handle: '' }] };
await page.route(/^https?:\/\//, r => {
  const u = r.request().url();
  if (/chat\/completions/.test(u)) {
    let b = null; try { b = JSON.parse(r.request().postData() || 'null'); } catch (e) {}
    bodies.push(b);
    const txt = JSON.stringify(b || {});
    const content = /NPC 名单|补充配角|生成住在这个世界里/.test(txt) ? JSON.stringify(genReply) : '[{"name":"老周","handle":"@laozhou","text":"又熬夜了吧"},{"name":"路人甲","text":"哈哈"}]';
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }) });
  }
  return r.abort();
});
await page.goto(fileUrl(path.join(root, 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && typeof window.gyNpcGen === 'function', { timeout: 20000 });
// 老格式数据（247 以前：ownerId + cmtPct）→ 刷新后搬家
await page.evaluate(async () => {
  myCharacters.push({ id: 7001, name: '立夏', persona: '温柔的上班族', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  myCharacters.push({ id: 7002, name: '谷雨', persona: '画家', worldbooks: [], diaryData: { letters: [], diaries: [] } });
  saveAllData && saveAllData();
  const LF = window.gyStore('gyNpcBox', 'npcs');
  await LF.setItem('gyNpc_state', { npcs: [{ id: 'old1', ownerId: '7001', name: '师父', ico: '🧙', who: '老道士', tie: '立夏的师父', on: true, from: 'wb', at: 1 }], inject: 5, cmtPct: 30 });
});
await page.waitForTimeout(800);
await page.reload();
await page.waitForFunction(() => window.__guyuBooted && typeof window.gyNpcGen === 'function', { timeout: 20000 });
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const o = {};
  if (!myCharacters.some(c => c.id === 7001)) { myCharacters.push({ id: 7001, name: '立夏', persona: '温柔的上班族', worldbooks: [], diaryData: { letters: [], diaries: [] } }); myCharacters.push({ id: 7002, name: '谷雨', persona: '画家', worldbooks: [], diaryData: { letters: [], diaries: [] } }); }
  myApiKey = 'k'; myApiUrl = 'https://x.test/v1'; myModel = 'm';
  setAutoFeature('npcOn', true, true); setAutoFeature('npcInComments', true, true);
  window.appConfirm = async () => true;
  const old = gyNpcAll().find(n => n.id === 'old1');
  o.migrated = old && JSON.stringify(old.owners) === '["7001"]' && !('ownerId' in old) && gyNpcMixPct('tweet') === 30;
  // 整页打开，竖着一列
  gyNpcOpen(); await sleep(100);
  const pg = document.getElementById('gyNpcPage'); const rc = pg.getBoundingClientRect();
  o.full = pg.classList.contains('on') && rc.width >= 380 && rc.height >= 800 && document.querySelectorAll('#gynpRows .gynp-row').length === 1;
  // ✨ 生成：照着我和立夏的人设，绑给上面勾的人
  gyNpcGo('gen'); await sleep(50);
  document.getElementById('gynpG_me').checked = true;
  document.querySelector('.gynpG-c[value="7001"]').checked = true;
  document.getElementById('gynpG_n').value = 3;
  await gyNpcGenRun(); await sleep(100);
  const lz = gyNpcAll().find(n => n.name === '老周');
  o.gen = lz && JSON.stringify(lz.owners.sort()) === '["7001","me"]' && lz.from === 'gen' && document.querySelectorAll('#gynpRows .gynp-row.fresh').length === 2;
  const genBody = JSON.stringify(window.__lastGenBody || '');
  // 筛选：只看谷雨的（没有）、看我的
  gyNpcFilter('me'); await sleep(30); o.fMe = document.querySelectorAll('#gynpRows .gynp-row').length === 2;
  gyNpcFilter('c:7002'); await sleep(30); o.fGy = document.querySelectorAll('#gynpRows .gynp-row').length === 0;
  gyNpcFilter('all');
  // ＋ 自己加：通用的
  gyNpcNew(); await sleep(50);
  document.getElementById('gynpE_name').value = '快递小哥'; document.getElementById('gynpE_who').value = '每天来送件'; document.getElementById('gynpE_all').checked = true;
  const nid = gyNpcAll().length; await gyNpcSave(document.querySelector('[onclick^="gyNpcSave"]').getAttribute('onclick').match(/'(.+)'/)[1]); await sleep(50);
  const kd = gyNpcAll().find(n => n.name === '快递小哥');
  o.add = kd && kd.all && gyNpcPool(7002).some(x => x.name === '快递小哥') && gyNpcPool(7001).length === 4;
  // 改绑：小鹿 → 也绑给谷雨
  const xl = gyNpcAll().find(n => n.name === '小鹿'); gyNpcEdit(xl.id); await sleep(50);
  document.querySelector('.gynpE-own[value="7002"]').checked = true; await gyNpcSave(xl.id); await sleep(50);
  o.rebind = JSON.stringify(gyNpcAll().find(n => n.name === '小鹿').owners.sort()) === '["7001","7002","me"]';
  // 比例：总的 100% → 4 条里最多换满池子；推文单独调成 0 → 一个都不换
  await gyNpcMixSet('def', 100); const p1 = gyNpcPick('anon', 'me', 4);
  await gyNpcMixSet('tweet', 0); const p2 = gyNpcPick('tweet', 'me', 4);
  await gyNpcMixSet('tweet', 'def'); const p3 = gyNpcPick('tweet', 'me', 4);
  o.mix = p1.n === 3 && p2.n === 0 && p3.n === 3;   // 绑给我的有 3 个（老周、小鹿、通用的快递小哥），4 条里最多换 3 条
  await gyNpcMixSet('def', 50); o.hint = gyNpcCommentHint('me', 4, 'forum');
  gyNpcGo('mix'); await sleep(50); o.mixPage = document.querySelectorAll('.gynp-mix').length >= 7 && /推文评论/.test(document.getElementById('gyNpcBody').innerText) && /直播弹幕/.test(document.getElementById('gyNpcBody').innerText);
  // 删角色：立夏 → 问一句 → 只认识立夏的「师父」删掉；老周、小鹿还认识别人留着
  await deleteCharacter(7001); await sleep(100);
  const names = gyNpcAll().map(n => n.name);
  o.del = !names.includes('师父') && names.includes('老周') && !gyNpcAll().find(n => n.name === '老周').owners.includes('7001');
  // 评论里 NPC 的头像：换了 NPC 头像，评论区跟着换
  const lz2 = gyNpcAll().find(n => n.name === '老周'); lz2.avatarImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const idn = getNpcIdentity('老周'); const ah = getAvatarHTML(idn, 40); o.identDbg = (idn.npcRef || 'noref') + ' ' + ah.slice(0, 160); o.ident = idn.npcRef === lz2.id && !/🍜|>老</.test(ah) && /background-image|gy-av-/.test(ah);
  // 你自己发的推文底下也会有绑给你的 NPC
  globalPosts.unshift({ id: 'p_me_1', char: { id: 'me', name: '我' }, text: '加班到十点', timestamp: Date.now(), replies: [], stats: { comments: 0, likes: 0, retweets: 0 } });
  window.npcReplyMaxCount = 4; try { npcReplyMaxCount = 4; } catch (e) {}
  await gyNpcMixSet('def', 100);
  await spawnNpcComments('p_me_1', false); await sleep(300);
  return o;
});
const genBody = JSON.stringify(bodies.find(b => /补充配角|生成住在这个世界里/.test(JSON.stringify(b || {}))) || {});
const cmtBody = JSON.stringify(bodies.find(b => /模拟\d+个路人NPC网友/.test(JSON.stringify(b || {}))) || {});
check('老数据（只绑一个角色、cmtPct）刷新后自动搬成新格式，比例跟着搬', r.migrated);
check('打开就是一整页，NPC 竖着一列', r.full);
check('✨ 生成：照着「我的人设 + 立夏的人设」，生成的人绑给我和立夏，新来的标出来', r.gen && /温柔的上班族/.test(genBody) && /用户本人/.test(genBody), genBody.slice(0, 160));
check('按「我 / 某个角色」筛', r.fMe && r.fGy);
check('＋ 自己加一个「通用」的：谁那儿都有', r.add);
check('改绑：一个 NPC 能同时绑好几个人', r.rebind);
check('比例：总的一个，每个地方能单独调，也能改回「跟着总的」', r.mix && r.mixPage);
check('提示词：论坛跟帖按比例写「这一次里有几条是熟人说的」', /这一次里有 2 条是/.test(r.hint), r.hint.slice(0, 80));
check('删角色时问一句：只认识 TA 的删掉，还认识别人的留着、解绑', r.del);
check('评论区 NPC 的头像跟着 NPC 列表走', r.ident, r.identDbg);
check('你自己发的推文底下也会出现绑给你的 NPC', /老周/.test(cmtBody) && /熟人/.test(cmtBody), cmtBody.slice(0, 100));
check('没有页面报错', !errs.length, errs.join(' | '));

// 头像：选图 → 裁剪框 → 存进 NPC
{
  const p2 = await ctx.newPage(); const e2 = []; p2.on('pageerror', e => e2.push(e.message));
  await p2.route(/^https?:\/\//, r => r.abort());
  await p2.goto(fileUrl(path.join(root, 'index.html')));
  await p2.waitForFunction(() => window.__guyuBooted && typeof window.gyNpcGen === 'function', { timeout: 20000 });
  await p2.waitForTimeout(1200);
  const id = await p2.evaluate(async () => { const n = await gyNpcAdd(null, { name: '测试头像', all: true }); gyNpcEdit(n.id); return n.id; });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8DwnwEJMDKgAQBR5AQBVvm4XQAAAABJRU5ErkJggg==', 'base64');
  const [fc] = await Promise.all([p2.waitForEvent('filechooser'), p2.evaluate(id => gyNpcPickImg(id, 'avatarImg'), id)]);
  await fc.setFiles({ name: 'a.png', mimeType: 'image/png', buffer: png });
  await p2.waitForFunction(() => { const m = document.getElementById('cropModal'); return m && getComputedStyle(m).display !== 'none'; }, { timeout: 5000 }).catch(() => {});
  const cropShown = await p2.evaluate(() => { const m = document.getElementById('cropModal'); return !!m && getComputedStyle(m).display !== 'none'; });
  await p2.evaluate(() => confirmCrop());
  await p2.waitForTimeout(200);
  const saved = await p2.evaluate(async id => { await gyNpcSave(id); return (gyNpcById(id) || {}).avatarImg || ''; }, id);
  check('换头像：选图 → 弹出裁剪框 → 裁好的图存进 NPC', cropShown && /^data:image\/jpeg/.test(saved), String(cropShown) + ' ' + saved.slice(0, 30));
  check('换头像这边没有页面报错', !e2.length, e2.join(' | '));
}
await browser.close();
results.forEach(x => console.log((x.ok ? '✅ ' : '❌ ') + x.n + (x.ok || !x.extra ? '' : '  ' + x.extra)));
const p = results.filter(x => x.ok).length;
console.log(`\n${p}/${results.length} 通过`);
process.exit(p === results.length ? 0 : 1);
