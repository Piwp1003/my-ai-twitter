import assert from 'node:assert/strict';
import path from 'node:path';
import {chromium} from 'playwright';
import {launchBrowser,fileUrl} from './_launch.mjs';

const browser=await launchBrowser(chromium);
try {
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    await page.route(/^https?:/,r=>r.abort());
    await page.goto(fileUrl(path.resolve('index.html')));
    await page.waitForFunction(()=>typeof renderNotebookCover==='function');
    await page.evaluate(()=>{
        myCharacters.push({id:'book-a',name:'甲',persona:'急诊医生'},{id:'book-b',name:'乙',persona:'植物学家'});
        document.getElementById('view-diary').style.display='block';
        currentDiaryCharId='book-a';
        switchDiaryTab('diary');
    });
    const text=id=>page.locator('#'+id).textContent();
    assert.equal(await text('gyBookTitle'),'夜班手札');
    assert.equal(await page.locator('#gyBookPreset option').count(),8);
    await page.evaluate(()=>{
        document.getElementById('gyBookGenerate').click();
        document.getElementById('gyBookName').value='个人藏本';
        document.getElementById('gyBookSave').click();
        selectDiaryChar('book-b');
    });
    assert.equal(await text('gyBookTitle'),'植物手记');
    await page.evaluate(()=>selectDiaryChar('book-a'));
    assert.equal(await text('gyBookTitle'),'个人藏本');
    await page.evaluate(()=>switchDiaryTab('mydiary'));
    assert.equal(await text('gyBookOwner'),'我的日记');
    const columns=()=>page.locator('#gyNotebook').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
    await page.locator('#view-diary').evaluate(e=>{e.style.width='900px';e.style.maxWidth='none'});
    assert.equal(await columns(),2);
    await page.setViewportSize({width:360,height:760});
    await page.locator('#view-diary').evaluate(e=>e.style.width='340px');
    assert.equal(await columns(),1);
    await page.evaluate(()=>switchDiaryTab('letter'));
    assert.equal(await page.locator('.gy-book-cover').isVisible(),false);
    console.log('PASS notebook presets, character ownership, personal book, responsive columns and letters');
} finally {await browser.close();}
