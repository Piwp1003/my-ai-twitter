import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const elements = new Map();
const chars = ['a','b'].map(id => ({id, diaryData:{letters:[], diaries:[]}}));
let finish;
const page = vm.createContext({
    document:{getElementById(id) {
        if (!elements.has(id)) elements.set(id,{style:{}});
        return elements.get(id);
    }},
    myCharacters:chars, currentDiaryCharId:'a', currentDiaryTab:'diary', tempGeneratedDiary:null,
    getApiMain:()=>({key:'fixture'}), getRecentChatContext:()=>'', getCharRecentPosts:()=>[],
    diaryWordLimit:100, WORD_LIMIT_PRIORITY_NOTE:'', getFinalAnswerMarkerPromptNote:()=>'',
    buildBasePrompt:()=>'', buildStructuredMessages:()=>[], alert:()=>{},
    callChatCompletionAPI:()=>new Promise(resolve => { finish=resolve; }),
    extractJsonObject:()=>null, applyRegexScripts:s=>s, namespaceInjectedIds:s=>s,
    formatPostText:s=>s, saveAllData:()=>{}, window:{}
});
vm.runInContext(fs.readFileSync('js/08-diary-novel.js','utf8'),page);
page.gyDiaryNotify = page.renderDiaryContent = () => {};
const response = {choices:[{message:{content:'测试日记'}}]};
for (const change of [{currentDiaryCharId:'b'},{currentDiaryTab:'letter'}]) {
    const request = page.generateDiaryContent();
    Object.assign(page,change);
    finish(response);
    await request;
    assert.equal(page.tempGeneratedDiary,null);
    Object.assign(page,{currentDiaryCharId:'a',currentDiaryTab:'diary'});
}
const request = page.generateDiaryContent();
finish(response);
await request;
page.currentDiaryCharId='b';
page.saveTempDiary();
assert.equal(chars[1].diaryData.diaries.length,0);
page.currentDiaryCharId='a';
page.currentDiaryTab='letter';
page.saveTempDiary();
assert.equal(chars[0].diaryData.letters.length,0);
page.currentDiaryTab='diary';
page.saveTempDiary();
assert.equal(chars[0].diaryData.diaries[0].content,'测试日记');
assert.equal(page.tempGeneratedDiary,null);
console.log('PASS diary draft ownership during generation and save');
