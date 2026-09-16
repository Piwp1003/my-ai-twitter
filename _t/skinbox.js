/* 🎨 皮肤盒子（js/50）：
   ① 设置 → 外观里那一块在，列表默认只有「原样」
   ② 把框里的 CSS 存成一张皮肤 → 列表多一条，且立刻是"正在用"
   ③ 点「原样」→ 界面真的变回去（globalCustomCSS 空了、style 标签也空了）
   ④ 点那张皮肤 → 真的又套上了（页面底色跟着变）
   ⑤ 改名 / 删除 / 存回当前皮肤 都对
   ⑥ 关掉开关：这一块没了，输入框照常；打开又回来
   ⑦ 存档带得走：getFullDataSnapshot 里有 __gySkins
   ⑧ 🧩 小功能里有「🎨 皮肤」入口，点开能换 */
const { chromium } = require('playwright');
const fs = require('fs');
const CSS = fs.readFileSync('ins风界面.css', 'utf8');

(async () => {
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 950 }, deviceScaleFactor: 2 })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
p.on('dialog', d => d.accept('测试皮肤'));
await p.goto('http://127.0.0.1:8899/index.html', { waitUntil: 'load' });
await p.waitForTimeout(6000);

await p.evaluate(async () => {
  myApiUrl = 'https://x/v1/chat/completions'; myApiKey = 'sk'; myModel = 'm';
  try { document.getElementById('gymRoot').style.display = 'none'; } catch (e) {}
  try { localStorage.removeItem('gy_skinbox_list'); localStorage.removeItem('gy_skinbox_active'); } catch (e) {}
  await saveAllData();
});
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(6000);

console.log('===== 1. 设置 → 外观里那一块在 =====');
console.log('  ', JSON.stringify(await p.evaluate(async () => {
  switchMainView('settings'); await new Promise(r => setTimeout(r, 400));
  openSettingsPanel('appearance'); await new Promise(r => setTimeout(r, 500));
  const box = document.getElementById('gySkinBox');
  return {
    这一块在: !!box && box.innerHTML.length > 0,
    开关默认开: document.getElementById('gySkinBoxOn').checked,
    列表里几条: box ? box.querySelectorAll('.gysk-row').length : 0,
    第一条写的: box ? box.querySelector('.gysk-row .gysk-nm').innerText : '',
    在CSS输入框下面: !!(box && document.getElementById('globalCSSInput'))
  };
}), null, 1));

console.log('\n===== 2. 存成一张皮肤 =====');
console.log('  ', JSON.stringify(await p.evaluate(async (css) => {
  document.getElementById('globalCSSInput').value = css;
  gySkinSaveNew(css, 'ins 风');            // 带名字，不弹窗
  await new Promise(r => setTimeout(r, 300));
  const rows = [...document.querySelectorAll('#gySkinBox .gysk-row')];
  return {
    列表里几条: rows.length,
    名字: rows.map(r => r.querySelector('.gysk-nm').innerText),
    正在用的是: (document.querySelector('#gySkinBox .gysk-row.on .gysk-nm') || {}).innerText,
    页面底色: getComputedStyle(document.body).backgroundColor,
    存进去了: (globalCustomCSS || '').length
  };
}, CSS), null, 1));
await p.screenshot({ path: '/tmp/skinbox.png', clip: { x: 275, y: 0, width: 760, height: 620 } });

console.log('\n===== 3. 点「原样」：真的变回去 =====');
console.log('  ', JSON.stringify(await p.evaluate(async () => {
  gySkinUse(''); await new Promise(r => setTimeout(r, 400));
  return {
    CSS空了: (globalCustomCSS || '') === '',
    style标签空了: (document.getElementById('custom-global-style') || {}).innerHTML === '',
    输入框也空了: document.getElementById('globalCSSInput').value === '',
    页面底色: getComputedStyle(document.body).backgroundColor,
    正在用的是: (document.querySelector('#gySkinBox .gysk-row.on .gysk-nm') || {}).innerText
  };
}), null, 1));

console.log('\n===== 4. 再点那张皮肤：又套上了 =====');
console.log('  ', JSON.stringify(await p.evaluate(async () => {
  const row = [...document.querySelectorAll('#gySkinBox .gysk-row')].find(r => r.querySelector('.gysk-nm').innerText === 'ins 风');
  row.click(); await new Promise(r => setTimeout(r, 400));
  return {
    页面底色: getComputedStyle(document.body).backgroundColor,
    气泡最宽: (() => { const s = [...document.styleSheets].length; return (globalCustomCSS.match(/max-width: 70%/) ? '70%' : '(没写)'); })(),
    正在用的是: (document.querySelector('#gySkinBox .gysk-row.on .gysk-nm') || {}).innerText
  };
}), null, 1));

console.log('\n===== 5. 改名 / 存回当前 / 删除 =====');
console.log('  ', JSON.stringify(await p.evaluate(async () => {
  const id = JSON.parse(localStorage.getItem('gy_skinbox_list'))[0].id;
  const out = {};
  window.prompt = () => '换个名字';
  gySkinRename(id); await new Promise(r => setTimeout(r, 200));
  out.改名后 = JSON.parse(localStorage.getItem('gy_skinbox_list'))[0].name;
  window.confirm = () => true;
  document.getElementById('globalCSSInput').value = 'body{background:#123456 !important;}';
  gySkinUpdate(); await new Promise(r => setTimeout(r, 300));
  out.存回去了 = JSON.parse(localStorage.getItem('gy_skinbox_list'))[0].css.slice(0, 20);
  out.页面底色跟着变 = getComputedStyle(document.body).backgroundColor;
  gySkinDelete(id); await new Promise(r => setTimeout(r, 300));
  out.删完还剩 = JSON.parse(localStorage.getItem('gy_skinbox_list')).length;
  out.删完列表里几条 = document.querySelectorAll('#gySkinBox .gysk-row').length;
  return out;
}), null, 1));

console.log('\n===== 6. 关掉开关：这一块没了，输入框照常 =====');
console.log('  ', JSON.stringify(await p.evaluate(async () => {
  gySkinBoxSet(false); await new Promise(r => setTimeout(r, 300));
  const a = {
    这一块没了: document.getElementById('gySkinBox').innerHTML === '',
    CSS输入框还在: !!document.getElementById('globalCSSInput')
  };
  gySkinBoxSet(true); await new Promise(r => setTimeout(r, 300));
  a.打开又回来了 = document.querySelectorAll('#gySkinBox .gysk-row').length > 0;
  return a;
}), null, 1));

console.log('\n===== 7. 跟着存档走 =====');
console.log('  ', JSON.stringify(await p.evaluate(async (css) => {
  gySkinSaveNew(css, '带走试试'); await new Promise(r => setTimeout(r, 300));
  const snap = getFullDataSnapshot();
  return {
    存档里有皮肤: Array.isArray(snap.__gySkins),
    几张: (snap.__gySkins || []).length,
    名字: (snap.__gySkins || []).map(x => x.name),
    记了正在用哪张: !!snap.__gySkinActive
  };
}, CSS), null, 1));

console.log('\n===== 8. 🧩 小功能里的快捷入口 =====');
console.log('  ', JSON.stringify(await p.evaluate(async () => {
  switchMainView('miniHub'); await new Promise(r => setTimeout(r, 800));
  const entry = [...document.querySelectorAll('#miniFeatureList .set-entry')]
    .find(x => /皮肤/.test(x.innerText));
  const out = { 小功能里有这一项: !!entry };
  if (entry) {
    entry.click(); await new Promise(r => setTimeout(r, 500));
    const m = document.getElementById('gySkinModal');
    out.弹窗开了 = !!m;
    out.弹窗里几条 = m ? m.querySelectorAll('.gysk-row').length : 0;
    if (m) {
      const row = [...m.querySelectorAll('.gysk-row')].find(r => r.querySelector('.gysk-nm').innerText === '带走试试');
      row.click(); await new Promise(r => setTimeout(r, 400));
      out.点了就换了 = getComputedStyle(document.body).backgroundColor;
      out.弹窗里也标了正在用 = (m.querySelector('.gysk-row.on .gysk-nm') || {}).innerText;
      gySkinCloseQuick();
    }
  }
  return out;
}), null, 1));

console.log('\n===== 9. 刷新之后还在 =====');
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(6500);
console.log('  ', JSON.stringify(await p.evaluate(async () => {
  switchMainView('settings'); await new Promise(r => setTimeout(r, 400));
  openSettingsPanel('appearance'); await new Promise(r => setTimeout(r, 600));
  return {
    列表还在: [...document.querySelectorAll('#gySkinBox .gysk-row .gysk-nm')].map(x => x.innerText),
    正在用的是: (document.querySelector('#gySkinBox .gysk-row.on .gysk-nm') || {}).innerText,
    页面底色: getComputedStyle(document.body).backgroundColor
  };
}), null, 1));

console.log('\n===== 页面错误 =====', errs.length ? errs.join(' | ') : '无');
await b.close();
})();
