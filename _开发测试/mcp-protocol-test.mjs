import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c = { window: null, localStorage: { getItem: () => null }, setTimeout() {}, setInterval() {} }; c.window = c;
vm.runInNewContext(fs.readFileSync('js/99-mcp.js','utf8'),c);
const { checkedArgs: validate, normalizeResult: result } = c.__gyMcpProtocol;
const schema = { type:'object', required:['ref'], properties:{ ref:{ type:'integer',minimum:0,maximum:10 }, direction:{type:'integer',enum:[1,-1]}, names:{type:'array',items:{type:'string'}} } };
let n=0; for (const args of [null,[], 'x',{ref:'1'},{ref:-1},{ref:11},{},{ref:0,direction:0},{ref:0,names:[1]}, {ref:0,extra:1},JSON.parse('{"ref":0,"__proto__":{}}')]) { assert.throws(()=>validate(args,schema,true));n++; }
assert.equal(validate({ref:0},schema,true).ref,0);n++;
assert.equal(result({isError:true,content:[{type:'text',text:'failure'}]}).ok,false);n++;
assert.equal(result({structuredContent:{ok:false,error:'denied'}}).status,'error');n++;
assert.equal(result({content:[{type:'text',text:'调用失败 merely quoted as data'}]}).ok,true);n++;
assert.equal(result(null).status,'unknown');n++;
assert.equal(result({}).status,'unknown');n++;
assert.equal(result({structuredContent:{ok:true,value:3}}).data.value,3);n++;
console.log(n+' protocol checks passed');
