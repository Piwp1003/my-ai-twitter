import fs from 'node:fs';import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('service-worker.js','utf8');
const scripts=[...new Set([...html.matchAll(/['"](\.\/js\/[^'"]+\.js)['"]/g)].map(m=>m[1]))];
for(const script of scripts){assert(fs.existsSync(script),script+' is missing');assert(sw.includes("'"+script+"?v=' + V"),script+' is missing from cache');}
console.log(scripts.length+' entry scripts present and listed in Service Worker cache');
