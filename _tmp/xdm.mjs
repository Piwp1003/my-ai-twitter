import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from '../_开发测试/_launch.mjs';
import path from 'path';
const browser = await launchBrowser(chromium);
for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
const page = await (await browser.newContext({ viewport: vp })).newPage();
await page.route(/^https?:\/\//, r => r.abort());
await page.goto(fileUrl(path.join(process.cwd(), 'index.html')));
await page.waitForFunction(() => window.__guyuBooted && window.gyPmSet, { timeout: 20000 });
await page.evaluate(() => { myCharacters.length = 0; myCharacters.push({ id: 9101, name: '沈之遥', handle: '@shen_zy', persona: 'x', worldbooks: [] }); globalChats['9101'] = [{ sender: 9101, text: '在吗', timestamp: Date.now() - 6e4 }]; gyPmSet(true); });
await page.waitForTimeout(600); await page.evaluate(() => gyPmOpen('home')); await page.waitForTimeout(600);
await page.evaluate(() => { gyPmXGo('dm'); switchChatSession('9101'); }); await page.waitForTimeout(800);
console.log(vp.width, JSON.stringify(await page.evaluate(() => { const bar = document.getElementById('gyPmBar').getBoundingClientRect(); return [...document.querySelectorAll('#view-chat *, #gyPmBar *')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && r.top < bar.bottom + 70 && cs.visibility !== 'hidden' && (e.onclick || e.tagName === 'BUTTON' || e.getAttribute('onclick')); }).map(e => (e.id || e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().left) + ',' + Math.round(e.getBoundingClientRect().top) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' ' + (e.textContent || '').trim().slice(0, 10)); })));
await page.screenshot({ path: `_tmp/xdm-${vp.width}.png` });
}
await browser.close();
