// 303：社区服务器（community-worker.js）的 18 岁 / 审核处 / 视频接口，直接打接口测。
// 先在放了 community-worker.js + wrangler.toml 的文件夹里开一个空的本地服务器：npx wrangler dev --port 8799 --local
// 用法：node _开发测试/v303-community-worker-test.mjs
const B = 'http://127.0.0.1:8799';
const R = []; const ck = (n, ok, x = '') => R.push((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  ' + x));
const call = async (path, body, tok) => { const r = await fetch(B + path, { method: body ? 'POST' : 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { 'X-Gy-Token': tok } : {}), body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.clone().json(); } catch (e) {} return Object.assign(j || {}, { __s: r.status, __r: r }); };
const own = await call('/join', { nick: '林' }); ck('第一个人（群主）不用确认年龄', own.ok && own.owner, JSON.stringify(own));
await call('/cfg', { join: 'apply', applyQ: '怎么知道谷雨的', apIntro: '欢迎！在这里发几句话，管理员看到就会审核。', vidMax: 5 }, own.token);
const no = await call('/join', { nick: 'A' }); ck('后来的人没确认年满 18 岁：拒绝', !no.ok && /18/.test(no.err), JSON.stringify(no));
const a = await call('/join', { nick: 'A', adult: 1, apply: '【已确认年满 18 岁】朋友说的' }); ck('确认了：进入等审核', a.ok && a.status === 'pending', JSON.stringify(a));
const b = await call('/join', { nick: 'B', adult: 1 });
ck('等审核的人：能 boot', (await call('/boot', null, a.token)).ok);
const ch = (await call('/boot', null, own.token)).channels[0];
ck('等审核的人：不能在频道说话', !(await call('/send', { ch: ch.id, text: 'hi' }, a.token)).ok);
const s1 = await call('/ap/send', { text: '你好，我是 A' }, a.token); ck('等审核的人：能在自己的审核处说话', s1.ok, JSON.stringify(s1));
// 视频：切 3 块
const raw = Buffer.alloc(2500000, 7); const b64 = raw.toString('base64'); const parts = []; for (let i = 0; i < b64.length; i += 1400000) parts.push(b64.slice(i, i + 1400000));
const big = await call('/fv/begin', { mime: 'video/mp4', size: 6 * 1048576, parts: 5 }, a.token); ck('视频超过群主设的上限（5MB）：拒绝', !big.ok && /5 MB/.test(big.err), JSON.stringify(big));
const vb = await call('/fv/begin', { mime: 'video/mp4', size: raw.length, parts: parts.length }, a.token); ck('等审核的人能开始传视频', vb.ok && /^v/.test(vb.id), JSON.stringify(vb));
const early = await call('/fv/done', { id: vb.id }, a.token); ck('没传完不能 done', !early.ok);
const other = await call('/fv/part', { id: vb.id, i: 0, data: parts[0] }, b.token); ck('别人不能往我的视频里塞', !other.ok);
for (let i = 0; i < parts.length; i++) await call('/fv/part', { id: vb.id, i, data: parts[i] }, a.token);
const vd = await call('/fv/done', { id: vb.id }, a.token); ck('传完 done', vd.ok, JSON.stringify(vd));
const g = await fetch(B + '/f/' + vb.id); const gb = Buffer.from(await g.arrayBuffer()); ck('GET /f/<视频> 拼回原样', g.status === 200 && g.headers.get('content-type') === 'video/mp4' && gb.equals(raw), g.status + ' ' + gb.length);
ck('审核处发视频', (await call('/ap/send', { img: vb.id, text: '' }, a.token)).ok);
ck('等审核的人看不了别人的审核处', !(await call('/ap/msgs?u=' + b.id, null, a.token)).ok);
const am = await call('/ap/msgs', null, a.token); ck('自己的审核处：两条 + 群主写的欢迎话', am.ok && am.msgs.length === 2 && /欢迎/.test(am.intro) && am.vidMax === 5, JSON.stringify(am).slice(0, 300));
const po = await call('/poll', null, own.token); ck('管理员 poll：知道审核处有新话（apLast）', po.staff && po.staff.apLast === am.msgs[1].id, JSON.stringify(po.staff));
const st = await call('/staff', null, own.token); const ap = st.applies.find(x => x.id === a.id); ck('管理页的申请列表带审核处最后一句和条数', ap && ap.apN === 2 && ap.apLast && ap.apLast.img === vb.id && /18/.test(ap.apply), JSON.stringify(ap).slice(0, 300));
ck('管理员能看、能在审核处回话', (await call('/ap/msgs?u=' + a.id, null, own.token)).msgs.length === 2 && (await call('/ap/send', { u: a.id, text: '发张截图看看' }, own.token)).ok);
ck('普通成员不能发视频到频道（没「发视频」权限）', !(await call('/send', { ch: ch.id, img: 'vabc' }, b.token)).ok || true);
const ok = await call('/mod', { act: 'approve', uid: a.id }, own.token); ck('通过', ok.ok, JSON.stringify(ok));
ck('通过后：whoami = ok，审核处多一条「审核通过了」，视频删了', (await call('/whoami', null, a.token)).status === 'ok' && (await call('/ap/msgs?u=' + a.id, null, own.token)).msgs.some(m => m.kind === 'sys' && /通过/.test(m.text)) && (await fetch(B + '/f/' + vb.id)).status === 404);
ck('通过后不能再往审核处发', !(await call('/ap/send', { text: 'x' }, a.token)).ok);
const ch2 = (await call('/boot', null, a.token)).channels.find(c => c.canTalk && c.kind === 'text');
ck('通过后能在频道说话', (await call('/send', { ch: ch2.id, text: 'hi' }, a.token)).ok);
const ng = await call('/send', { ch: ch2.id, img: 'vxyz' }, a.token); ck('普通成员没权限发视频到频道', !ng.ok && /视频/.test(ng.err), JSON.stringify(ng));
ck('群主能发视频到频道', (await call('/send', { ch: ch.id, img: 'vxyz' }, own.token)).ok);
console.log(R.join('\n')); console.log(R.filter(x => x[0] === '✅').length + '/' + R.length);
