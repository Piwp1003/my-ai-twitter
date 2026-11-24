import { chromium } from 'playwright';
import { launchBrowser, fileUrl } from './_launch.mjs';
import path from 'node:path';
import assert from 'node:assert/strict';
const browser = await launchBrowser(chromium);
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\//, r => r.abort());
  await page.goto(fileUrl(path.join(process.cwd(), 'index.html')));
  await page.waitForFunction(() => typeof window.gyMcpOpen === 'function');
  await page.evaluate(() => window.gyMcpOpen());
  await page.getByRole('button', { name: '检查美团操作条件', exact: true }).click();
  const status = page.locator('#gyMcpPhoneCheck');
  assert((await status.innerText()).includes('请在 Android 版谷雨中检查'));
  assert((await status.innerText()).includes('尚不能确认可操作'));
  assert((await status.innerText()).includes('不代表已经支持自动下单'));
  assert.equal(await status.getAttribute('role'), 'status');
  assert.deepEqual(errors, []);
  console.log('PASS mobile viewport: visible check button, unsupported environment, honest scope, accessible result, no page errors');
} finally { await browser.close(); }
