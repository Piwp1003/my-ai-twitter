/* =====================================================================
   谷雨 · 社区 Worker（community-worker.js）
   真人用户之间聊天：频道（大厅 / 角色同桌 / 角色卡分享…）、私聊、好友、身份组、群主管理员、
   举报、入群（邀请码 / 谁都能进 / 申请审核，群主自己选）。
   · 存储：Cloudflare D1，绑定名 DB。表第一次用的时候自己建，不用手动跑 SQL。
   · 图片（头像、背景、频道图标、社区封面…）：存在 D1 的 files 表，GET /f/<id> 公开读，
     改了换一个新 id，所有人下一次同步就看到新的。
   · 第一个加入的人自动是群主。
   · 303：🔞 加入时要确认年满 18 岁（body.adult=1，第一个人除外）；📝 审核处：等审核的人有一个只有自己和管理员能看的房间（频道 id = 'ap:<用户id>'），
     能发文字、图片、视频，管理员在里面跟 TA 聊、决定通过还是拒绝；🎬 视频切块存在 fparts，GET /f/<id> 拼起来给。
   · 每个用户一把自己的钥匙（加入时发的），放在请求头 X-Gy-Token: <用户id>.<密钥>。
   · ☁️ 云端备份（/bk/*）：存在另一个 D1（绑定名 BK，没绑就用 DB）。内容是在用户手机上**先加密**再传上来的，
     服务器（包括群主）看不到里面是什么；解密要用那个人的钥匙。分块上传、每块校验，传完整了才替换旧的，留最近几份。
   · 🎵 一起听（/mu/*）：帮谷雨查网易云 / QQ 音乐的歌、歌词和播放链接，扫码登录也走这里。
     每个人登录的是**自己的**音乐账号：登录信息只存在那个人的手机里，每次随请求带过来（请求头 X-Mu-Ck），服务器原样转给音乐网站、不存。
     转发时带上用户自己的 IP（CF-Connecting-IP），音乐网站看到的跟用户自己手机上直接打开一样。
   ===================================================================== */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Gy-Token,X-Mu-Ck',
  'Access-Control-Max-Age': '86400',
};
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS) });
const E = (msg, s = 400) => J({ ok: false, err: msg }, s);
const now = () => Date.now();
const rid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);
const parse = (s, d) => { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } };
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }

// 权限：群主全部都有
const PERMS = ['del', 'mute', 'kick', 'ban', 'pin', 'channel', 'roles', 'approve', 'table', 'invite', 'cfg', 'video'];
const PERM_NAMES = { video: '在频道 / 私聊里发视频', del: '删别人的消息', mute: '禁言', kick: '踢人', ban: '封号', pin: '发公告、置顶', channel: '建 / 改频道', roles: '发身份组（比自己低的）', approve: '审核入群申请、处理举报', table: '带角色进同桌', invite: '发邀请码', cfg: '改社区资料' };

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS cfg (k TEXT PRIMARY KEY, v TEXT)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, handle TEXT UNIQUE, nick TEXT, avatar TEXT, bg TEXT, bio TEXT, color TEXT, tok TEXT, roles TEXT, status TEXT, mute INTEGER DEFAULT 0, apply TEXT, joined INTEGER, seen INTEGER, uat INTEGER)`,
  `CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT, color TEXT, perms TEXT, pos INTEGER, uat INTEGER)`,
  `CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, name TEXT, icon TEXT, color TEXT, kind TEXT, topic TEXT, see TEXT, talk TEXT, meta TEXT, pos INTEGER, uat INTEGER)`,
  `CREATE TABLE IF NOT EXISTS msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, ch TEXT, uid TEXT, chr TEXT, text TEXT, card TEXT, img TEXT, reply INTEGER, kind TEXT, at INTEGER, del INTEGER DEFAULT 0, pin INTEGER DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS msgs_ch ON msgs (ch, id)`,
  `CREATE TABLE IF NOT EXISTS dms (id INTEGER PRIMARY KEY AUTOINCREMENT, pair TEXT, uid TEXT, text TEXT, card TEXT, img TEXT, at INTEGER, del INTEGER DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS dms_pair ON dms (pair, id)`,
  `CREATE TABLE IF NOT EXISTS friends (a TEXT, b TEXT, state TEXT, note TEXT, at INTEGER, PRIMARY KEY (a, b))`,
  `CREATE TABLE IF NOT EXISTS invites (code TEXT PRIMARY KEY, by TEXT, uses INTEGER DEFAULT 0, max INTEGER, exp INTEGER, at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, by TEXT, kind TEXT, ref TEXT, who TEXT, reason TEXT, excerpt TEXT, at INTEGER, state TEXT DEFAULT 'open')`,
  `CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, by TEXT, act TEXT, target TEXT, note TEXT, at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, owner TEXT, mime TEXT, data TEXT, at INTEGER)`,
  // 303：视频太大，一行放不下，切成几块存在这里（files.data 写 'parts:块数'）
  `CREATE TABLE IF NOT EXISTS fparts (fid TEXT, i INTEGER, data TEXT, PRIMARY KEY (fid, i))`,
];
let ready = false;
async function init(db) {
  if (ready) return;
  await db.batch(SCHEMA.map(s => db.prepare(s)));
  const has = await db.prepare(`SELECT COUNT(*) n FROM roles`).first();
  if (!has || !has.n) {
    const t = now();
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO roles VALUES (?,?,?,?,?,?)`).bind('owner', '群主', '#ff9500', JSON.stringify(PERMS), 1000, t),
      db.prepare(`INSERT OR IGNORE INTO roles VALUES (?,?,?,?,?,?)`).bind('admin', '管理员', '#007aff', JSON.stringify(['del', 'mute', 'kick', 'pin', 'roles', 'approve', 'table', 'invite']), 500, t),
      db.prepare(`INSERT OR IGNORE INTO roles VALUES (?,?,?,?,?,?)`).bind('member', '成员', '#8e8e93', JSON.stringify(['table']), 0, t),
      db.prepare(`INSERT OR IGNORE INTO channels VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind('notice', '公告', '📢', '#ff9500', 'notice', '', '[]', '["pin"]', '{}', 0, t),
      db.prepare(`INSERT OR IGNORE INTO channels VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind('lobby', '大厅', '#', '#007aff', 'text', '随便聊', '[]', '[]', '{}', 1, t),
      db.prepare(`INSERT OR IGNORE INTO channels VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind('table', '角色同桌', '🎭', '#af52de', 'table', '把角色带进来一起聊', '[]', '[]', '{"seats":[]}', 2, t),
      db.prepare(`INSERT OR IGNORE INTO channels VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind('cards', '角色卡分享', '🪪', '#34c759', 'cards', '', '[]', '[]', '{}', 3, t),
      db.prepare(`INSERT OR IGNORE INTO channels VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind('help', '求助', '🛟', '#ff2d55', 'text', '', '[]', '[]', '{}', 4, t),
      db.prepare(`INSERT OR IGNORE INTO channels VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind('staff', '管理员频道', '🛡️', '#8e8e93', 'text', '', '["approve"]', '["approve"]', '{}', 9, t),
      db.prepare(`INSERT OR REPLACE INTO cfg VALUES ('main', ?)`).bind(JSON.stringify({ name: '谷雨社区', icon: '', cover: '', join: 'open', gate: true, minVer: 0, updUrl: '', updMsg: '', intro: '', applyQ: '说一句你怎么知道谷雨的', rules: '', ver: t })),
    ]);
  }
  ready = true;
}

async function cfgOf(db) { const r = await db.prepare(`SELECT v FROM cfg WHERE k='main'`).first(); return parse(r && r.v, {}); }
async function bump(db, extra) { const c = await cfgOf(db); Object.assign(c, extra || {}); c.ver = now(); await db.prepare(`INSERT OR REPLACE INTO cfg VALUES ('main', ?)`).bind(JSON.stringify(c)).run(); return c; }
async function rolesOf(db) { const r = await db.prepare(`SELECT * FROM roles ORDER BY pos DESC`).all(); return (r.results || []).map(x => ({ id: x.id, name: x.name, color: x.color, perms: parse(x.perms, []), pos: x.pos })); }
const pubUser = u => u && ({ id: u.id, handle: u.handle, nick: u.nick, avatar: u.avatar || '', bg: u.bg || '', bio: u.bio || '', color: u.color || '', roles: parse(u.roles, []), status: u.status, mute: u.mute || 0, joined: u.joined, seen: u.seen, uat: u.uat });

async function who(req, db) {
  const t = req.headers.get('X-Gy-Token') || ''; const i = t.indexOf('.'); if (i < 1) return null;
  const u = await db.prepare(`SELECT * FROM users WHERE id=?`).bind(t.slice(0, i)).first();
  if (!u || u.tok !== await sha(t.slice(i + 1))) return null;
  if (!u.seen || now() - u.seen > 60e3) { await db.prepare(`UPDATE users SET seen=? WHERE id=?`).bind(now(), u.id).run(); u.seen = now(); }
  return u;
}
function permsOf(u, roles) {
  const mine = parse(u.roles, []); if (mine.includes('owner')) return { all: true, set: new Set(PERMS), top: 1e9 };
  const set = new Set(); let top = 0;
  roles.forEach(r => { if (r.id === 'member' || mine.includes(r.id)) { r.perms.forEach(p => set.add(p)); if (mine.includes(r.id)) top = Math.max(top, r.pos); } });
  return { all: false, set, top };
}
const can = (P, p) => P.all || P.set.has(p);
const canSee = (ch, P) => { const s = parse(ch.see, []); return !s.length || s.some(p => can(P, p)); };
const canTalk = (ch, P) => { const s = parse(ch.talk, []); return !s.length || s.some(p => can(P, p)); };
async function log(db, by, act, target, note) { await db.prepare(`INSERT INTO logs (by,act,target,note,at) VALUES (?,?,?,?,?)`).bind(by, act, target || '', clip(note, 200), now()).run(); }
const pairOf = (a, b) => [a, b].sort().join('|');
const userRank = (u, roles) => { const mine = parse(u.roles, []); if (mine.includes('owner')) return 1e9; return Math.max(0, ...roles.filter(r => mine.includes(r.id)).map(r => r.pos)); };

/* ---------------- ☁️ 云端备份 ---------------- */
const BK_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS bk (id TEXT PRIMARY KEY, uid TEXT, state TEXT, size INTEGER, parts INTEGER, hash TEXT, note TEXT, meta TEXT, at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS bk_uid ON bk (uid, at)`,
  `CREATE TABLE IF NOT EXISTS bkp (bid TEXT, i INTEGER, data TEXT, sha TEXT, PRIMARY KEY (bid, i))`,
];
let bkReady = false;
async function bkInit(bk) { if (bkReady) return; await bk.batch(BK_SCHEMA.map(s => bk.prepare(s))); bkReady = true; }
const BK_PART = 900000;   // 每块最多这么多字（base64），D1 一行最多 2MB
const bkCfg = c => ({ on: c.bkOn !== false, max: Math.max(1, +c.bkMax || 30), keep: Math.max(1, Math.min(5, +c.bkKeep || 2)), total: Math.max(10, +c.bkTotal || 450) });
async function bkDrop(bk, ids) { if (!ids.length) return; await bk.batch(ids.flatMap(id => [bk.prepare(`DELETE FROM bkp WHERE bid=?`).bind(id), bk.prepare(`DELETE FROM bk WHERE id=?`).bind(id)])); }
async function bkRoute(p, req, q, body, me, db, bk) {
  await bkInit(bk);
  const C = bkCfg(await cfgOf(db));
  const mine = async id => { const b = await bk.prepare(`SELECT * FROM bk WHERE id=?`).bind(String(id || '')).first(); return b && b.uid === me.id ? b : null; };
  if (p === '/bk/list') {
    const L = (await bk.prepare(`SELECT id,state,size,parts,hash,note,meta,at FROM bk WHERE uid=? AND state='ok' ORDER BY at DESC`).bind(me.id).all()).results || [];
    return J({ ok: true, list: L.map(b => Object.assign(b, { meta: parse(b.meta, {}) })), max: C.max, keep: C.keep, on: C.on, part: BK_PART });
  }
  if (p === '/bk/begin' && req.method === 'POST') {
    if (!C.on) return E('群主把云端备份关了');
    if (me.status === 'banned') return E('你被封号了，不能再往上传（已经传上去的还能下载）', 403);
    const size = Math.floor(+body.size || 0), parts = Math.floor(+body.parts || 0);
    if (size <= 0 || parts <= 0 || parts !== Math.ceil(size / BK_PART)) return E('备份大小不对');
    if (size > C.max * 1048576 * 1.37) return E(`备份太大了（上限 ${C.max} MB）。可以在「云端备份」里选不带图片再试，或者让群主调大上限`);
    // 先把自己没传完的旧的清掉（之前断了的）
    const stale = (await bk.prepare(`SELECT id FROM bk WHERE uid=? AND state='up'`).bind(me.id).all()).results || [];
    await bkDrop(bk, stale.map(x => x.id));
    const tot = await bk.prepare(`SELECT COALESCE(SUM(size),0) n FROM bk`).first();
    if ((tot ? tot.n : 0) + size > C.total * 1048576) return E('服务器上的备份空间快满了，跟群主说一声（可以删掉一些旧备份或换付费版）');
    const id = rid('b').toLowerCase();
    await bk.prepare(`INSERT INTO bk VALUES (?,?,?,?,?,?,?,?,?)`).bind(id, me.id, 'up', size, parts, clip(body.hash, 80), clip(body.note, 100), JSON.stringify(body.meta || {}).slice(0, 2000), now()).run();
    return J({ ok: true, id, part: BK_PART });
  }
  if (p === '/bk/part' && req.method === 'POST') {
    const b = await mine(body.bid); if (!b || b.state !== 'up') return E('这份备份不存在或者已经传完了');
    const i = Math.floor(+body.i), data = String(body.data || '');
    if (!(i >= 0 && i < b.parts) || !data || data.length > BK_PART) return E('这一块不对');
    if (await sha(data) !== String(body.sha || '')) return E('这一块传坏了（校验对不上），再传一次');
    await bk.prepare(`INSERT OR REPLACE INTO bkp VALUES (?,?,?,?)`).bind(b.id, i, data, body.sha).run();
    return J({ ok: true });
  }
  if (p === '/bk/commit' && req.method === 'POST') {
    const b = await mine(body.bid); if (!b || b.state !== 'up') return E('这份备份不存在');
    const r = await bk.prepare(`SELECT COUNT(*) n, COALESCE(SUM(LENGTH(data)),0) len FROM bkp WHERE bid=?`).bind(b.id).first();
    if (!r || r.n !== b.parts || r.len !== b.size) return E(`还没传完整（${r ? r.n : 0}/${b.parts} 块），旧的备份没动`);
    await bk.prepare(`UPDATE bk SET state='ok', at=? WHERE id=?`).bind(now(), b.id).run();
    // 传完整了才清掉更旧的，只留最近 keep 份
    const L = (await bk.prepare(`SELECT id FROM bk WHERE uid=? AND state='ok' ORDER BY at DESC`).bind(me.id).all()).results || [];
    await bkDrop(bk, L.slice(C.keep).map(x => x.id));
    return J({ ok: true, id: b.id });
  }
  if (p === '/bk/get') {
    const b = await mine(q.get('bid')); if (!b || b.state !== 'ok') return E('没有这份备份');
    const i = Math.floor(+q.get('i') || 0); const r = await bk.prepare(`SELECT data, sha FROM bkp WHERE bid=? AND i=?`).bind(b.id, i).first();
    if (!r) return E('这一块不见了');
    return J({ ok: true, data: r.data, sha: r.sha });
  }
  if (p === '/bk/del' && req.method === 'POST') {
    const b = await mine(body.bid); if (!b) return E('没有这份备份');
    await bkDrop(bk, [b.id]); return J({ ok: true });
  }
  if (p === '/bk/usage') {
    if (!parse(me.roles, []).includes('owner')) return E('只有群主能看');
    const L = (await bk.prepare(`SELECT uid, COUNT(*) n, SUM(size) size, MAX(at) at FROM bk WHERE state='ok' GROUP BY uid ORDER BY size DESC`).all()).results || [];
    const tot = await bk.prepare(`SELECT COALESCE(SUM(size),0) n FROM bk`).first();
    return J({ ok: true, users: L, total: tot ? tot.n : 0, cfg: C, separate: bk !== db });
  }
  return E('没有这个接口', 404);
}

// ---------- 🎵 一起听：网易云 / QQ 音乐（服务器只转发，不存任何人的登录信息） ----------
const MU_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const NE_MOD = BigInt('0x00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7');
const b64 = u8 => { let s = ''; u8.forEach(x => { s += String.fromCharCode(x); }); return btoa(s); };
async function aesCbc(text, key) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'AES-CBC' }, false, ['encrypt']);
  return b64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: new TextEncoder().encode('0102030405060708') }, k, new TextEncoder().encode(text))));
}
function modpow(b, e, m) { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; } return r; }
async function weapi(obj) {
  const CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let sk = ''; for (let i = 0; i < 16; i++) sk += CH[Math.floor(Math.random() * 62)];
  const params = await aesCbc(await aesCbc(JSON.stringify(obj), '0CoJUm6Qyw8W8jud'), sk);
  const hex = [...sk].reverse().map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const enc = modpow(BigInt('0x' + hex), 65537n, NE_MOD).toString(16).padStart(256, '0');
  return 'params=' + encodeURIComponent(params) + '&encSecKey=' + enc;
}
const muCk = h => String(h || '').replace(/[\r\n]/g, '').slice(0, 4000);
const setCk = res => { try { const L = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || '']; return L.filter(Boolean).map(c => c.split(';')[0]).filter(c => !/=$/.test(c) && !/=deleted$/i.test(c)); } catch (e) { return []; } };
async function ne(path, obj, ck, ip) {
  const r = await fetch('https://music.163.com/weapi' + path, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: 'https://music.163.com/', 'User-Agent': MU_UA, Cookie: 'os=pc; appver=2.9.7; ' + (ck || ''), ...(ip ? { 'X-Real-IP': ip, 'X-Forwarded-For': ip } : {}) }, body: await weapi(Object.assign({ csrf_token: (/__csrf=([^;]+)/.exec(ck || '') || [])[1] || '' }, obj)) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return { j: j || {}, ck: setCk(r) };
}
async function qq(data, ck, ip) {
  const uin = (/(?:^|;\s*)(?:uin|qqmusic_uin)=o?0*(\d+)/.exec(ck || '') || [])[1] || '0';
  const key = (/(?:^|;\s*)(?:qqmusic_key|qm_keyst)=([^;]+)/.exec(ck || '') || [])[1] || '';
  const body = Object.assign({ comm: { ct: '19', cv: '1859', uin, authst: key, tmeLoginType: key.startsWith('W_X') ? 1 : 2, format: 'json' } }, data);
  const r = await fetch('https://u.y.qq.com/cgi-bin/musicu.fcg', { method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://y.qq.com/', 'User-Agent': MU_UA, Cookie: ck || '', ...(ip ? { 'X-Real-IP': ip, 'X-Forwarded-For': ip } : {}) }, body: JSON.stringify(body) });
  return { j: await r.json().catch(() => ({})), uin };
}
const hash33 = s => { let h = 0; for (let i = 0; i < s.length; i++) h += (h << 5) + s.charCodeAt(i); return h & 0x7fffffff; };
const gtk = s => { let h = 5381; for (let i = 0; i < s.length; i++) h += (h << 5) + s.charCodeAt(i); return h & 0x7fffffff; };   // g_tk 是从 5381 起算的（ptqrtoken 才是从 0）
const neSong = s => ({ src: 'ne', id: String(s.id), name: s.name, ar: (s.ar || []).map(x => x.name).join(' / '), al: (s.al || {}).name || '', cover: ((s.al || {}).picUrl || '').replace(/^http:/, 'https:'), dur: s.dt || 0, vip: s.fee === 1 || s.fee === 4 });
async function muRoute(p, req, q, body) {
  const src = body.src || q.get('src') || 'ne', ck = muCk(req.headers.get('X-Mu-Ck')), ip = req.headers.get('CF-Connecting-IP') || '';
  if (p === '/mu/search') {
    const kw = String(body.q || q.get('q') || '').slice(0, 60); if (!kw) return E('搜什么？');
    if (src === 'qq') {
      const { j } = await qq({ req: { method: 'DoSearchForQQMusicDesktop', module: 'music.search.SearchCgiService', param: { query: kw, num_per_page: 20, page_num: 1, search_type: 0 } } }, ck);
      let L = ((((j.req || {}).data || {}).body || {}).song || {}).list || [];
      // 搜得太勤 QQ 会回 2001（要验证），这时换老的搜索接口再试一次
      if (!L.length) { const r2 = await fetch('https://c.y.qq.com/soso/fcgi-bin/client_search_cp?format=json&new_json=1&cr=1&p=1&n=20&w=' + encodeURIComponent(kw), { headers: { Referer: 'https://y.qq.com/', 'User-Agent': MU_UA } }); const j3 = await r2.json().catch(() => ({})); L = (((j3.data || {}).song || {}).list) || []; }
      const list = L.map(s => ({ src: 'qq', id: s.mid, name: s.name || s.title, ar: (s.singer || []).map(x => x.name).join(' / '), al: (s.album || {}).name || '', cover: (s.album || {}).mid ? `https://y.qq.com/music/photo_new/T002R300x300M000${s.album.mid}.jpg` : '', dur: (s.interval || 0) * 1000, vip: !!((s.pay || {}).pay_play || (s.pay || {}).payplay) }));
      return J({ ok: true, list });
    }
    const { j } = await ne('/cloudsearch/pc', { s: kw, type: 1, limit: 20, offset: 0 }, ck);
    const list = (((j.result || {}).songs) || []).map(neSong);
    return J({ ok: true, list, code: j.code });
  }
  if (p === '/mu/url') {
    const id = String(body.id || q.get('id') || ''); if (!id) return E('哪首？');
    if (src === 'qq') {
      const fn = ['M500' + id + id + '.mp3', 'C400' + id + '.m4a'];
      const uin = (/(?:^|;\s*)(?:uin|qqmusic_uin)=o?0*(\d+)/.exec(ck || '') || [])[1] || '0';
      for (const f of fn) {
        const { j } = await qq({ req_0: { module: 'vkey.GetVkeyServer', method: 'CgiGetVkey', param: { guid: '10000', songmid: [id], songtype: [0], uin, loginflag: 1, platform: '20', filename: [f] } } }, ck, ip);
        const d = (j.req_0 || {}).data || {}, m = (d.midurlinfo || [])[0] || {};
        if (m.purl) return J({ ok: true, url: ((d.sip || [])[0] || 'https://isure.stream.qqmusic.qq.com/').replace(/^http:/, 'https:') + m.purl });
      }
      return J({ ok: true, url: '', why: ck ? '这首要会员，或者登录过期了' : '这首要登录 QQ 音乐（会员歌要会员）' });
    }
    const { j } = await ne('/song/enhance/player/url/v1', { ids: '[' + id + ']', level: 'standard', encodeType: 'mp3' }, ck, ip);
    const d = ((j.data || [])[0]) || {};
    if (d.url && !(d.freeTrialInfo && !ck)) return J({ ok: true, url: d.url.replace(/^http:/, 'https:'), trial: !!d.freeTrialInfo });
    return J({ ok: true, url: d.url ? d.url.replace(/^http:/, 'https:') : '', trial: !!d.freeTrialInfo, why: d.url ? '只能试听一段（会员歌）' : (ck ? '这首放不了（会员 / 下架 / 版权）' : '这首要登录网易云才能放') });
  }
  if (p === '/mu/lyric') {
    const id = String(body.id || q.get('id') || '');
    if (src === 'qq') {
      const r = await fetch('https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?format=json&nobase64=1&g_tk=5381&songmid=' + encodeURIComponent(id), { headers: { Referer: 'https://y.qq.com/', 'User-Agent': MU_UA } });
      const j = await r.json().catch(() => ({})); const un = s => String(s || '').replace(/&#(\d+);/g, (a, n) => String.fromCharCode(+n));
      return J({ ok: true, lrc: un(j.lyric), tlrc: un(j.trans) });
    }
    const r = await fetch('https://music.163.com/api/song/lyric?lv=1&tv=-1&id=' + encodeURIComponent(id), { headers: { Referer: 'https://music.163.com/', 'User-Agent': MU_UA } });
    const j = await r.json().catch(() => ({}));
    return J({ ok: true, lrc: (j.lrc || {}).lyric || '', tlrc: (j.tlyric || {}).lyric || '' });
  }
  // 登录：扫码。服务器把扫完拿到的登录信息原样交给手机，自己不留
  if (p === '/mu/qr') {
    if (src === 'qq') {
      const r = await fetch(`https://ssl.ptlogin2.qq.com/ptqrshow?appid=716027609&e=2&l=M&s=3&d=72&v=4&t=${Math.random()}&daid=383&pt_3rd_aid=100497308`, { headers: { Referer: 'https://xui.ptlogin2.qq.com/', 'User-Agent': MU_UA } });
      const sig = (setCk(r).find(c => c.startsWith('qrsig=')) || '').slice(6); if (!sig) return E('QQ 那边没给二维码，过会儿再试');
      return J({ ok: true, key: sig, img: 'data:image/png;base64,' + b64(new Uint8Array(await r.arrayBuffer())) });
    }
    const { j } = await ne('/login/qrcode/unikey', { type: 1 });
    if (!j.unikey) return E('网易云那边没给二维码，过会儿再试');
    return J({ ok: true, key: j.unikey, text: 'https://music.163.com/login?codekey=' + j.unikey });
  }
  if (p === '/mu/qrcheck') {
    const key = String(body.key || q.get('key') || '');
    if (src === 'qq') {
      const r = await fetch(`https://ssl.ptlogin2.qq.com/ptqrlogin?u1=${encodeURIComponent('https://graph.qq.com/oauth2.0/login_jump')}&ptqrtoken=${hash33(key)}&ptredirect=0&h=1&t=1&g=1&from_ui=1&ptlang=2052&action=0-0-${Date.now()}&js_ver=23111510&js_type=1&login_sig=&pt_uistyle=40&aid=716027609&daid=383&pt_3rd_aid=100497308&has_onekey=1`, { headers: { Referer: 'https://xui.ptlogin2.qq.com/', 'User-Agent': MU_UA, Cookie: 'qrsig=' + key } });
      const t = await r.text(); const m = /ptuiCB\('(\d+)','\d+','([^']*)','\d+','([^']*)'(?:,\s*'([^']*)')?/.exec(t) || [];
      const code = m[1];
      if (code === '66') return J({ ok: true, st: 'wait' });
      if (code === '67') return J({ ok: true, st: 'scanned' });
      if (code === '65') return J({ ok: true, st: 'expired' });
      if (code !== '0') return J({ ok: true, st: 'fail', msg: m[3] || t.slice(0, 80) });
      // 扫码确认了：check_sig → graph.qq.com 授权 → QQ 音乐登录
      let jar = setCk(r);
      const cs = await fetch(m[2], { redirect: 'manual', headers: { 'User-Agent': MU_UA, Cookie: jar.join('; ') } }); jar = jar.concat(setCk(cs));
      const pskey = (jar.find(c => c.startsWith('p_skey=')) || '').slice(7), uin = ((jar.find(c => c.startsWith('uin=')) || '').slice(4)).replace(/^o0*/, '');
      if (!pskey) return J({ ok: true, st: 'fail', msg: 'QQ 登录没走完（没拿到 p_skey）' });
      const fd = new URLSearchParams({ response_type: 'code', client_id: '100497308', redirect_uri: 'https://y.qq.com/portal/wx_redirect.html?login_type=1&surl=https://y.qq.com/', scope: 'get_user_info,get_app_friends', state: 'state', switch: '', from_ptlogin: '1', src: '1', update_auth: '1', openapi: '1010_1030', g_tk: String(gtk(pskey)), auth_time: String(Date.now()), ui: 'D17E54D5-F6FB-4EF2-A1B4-AC4D36A69ED8' });
      const fm = new FormData(); for (const [k2, v2] of fd) fm.append(k2, v2);
      const au = await fetch('https://graph.qq.com/oauth2.0/authorize', { method: 'POST', redirect: 'manual', headers: { 'User-Agent': MU_UA, Referer: 'https://graph.qq.com/', Cookie: jar.join('; ') }, body: fm });
      const loc = au.headers.get('location') || ''; const qcode = (/[?&]code=([^&]+)/.exec(loc) || [])[1];
      if (!qcode) return J({ ok: true, st: 'fail', msg: 'QQ 授权没拿到 code（' + au.status + '）' });
      const lr = await fetch('https://u.y.qq.com/cgi-bin/musicu.fcg', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': MU_UA, Referer: 'https://y.qq.com/', Cookie: jar.join('; ') }, body: JSON.stringify({ comm: { g_tk: gtk(pskey), platform: 'yqq', ct: 24, cv: 0 }, req: { module: 'QQConnectLogin.LoginServer', method: 'QQLogin', param: { code: qcode } } }) });
      const lc = setCk(lr), ckv = n => ((lc.find(c2 => c2.startsWith(n + '=')) || '').slice(n.length + 1));
      const lj = await lr.json().catch(() => ({})); const d = (lj.req || {}).data || {};
      const mk = d.musickey || ckv('qqmusic_key') || ckv('qm_keyst'), mu = String(d.musicid || ckv('uin') || ckv('wxuin') || uin || '').replace(/^o0*/, '');
      if (!mk) return J({ ok: true, st: 'fail', msg: 'QQ 音乐登录没成功' });
      return J({ ok: true, st: 'ok', ck: `uin=${mu}; qqmusic_key=${mk}; qm_keyst=${mk}`, nick: '' });
    }
    const { j, ck: got } = await ne('/login/qrcode/client/login', { key, type: 1 });
    const c = j.code;
    if (c === 801) return J({ ok: true, st: 'wait' });
    if (c === 802) return J({ ok: true, st: 'scanned', nick: j.nickname || '' });
    if (c === 800) return J({ ok: true, st: 'expired' });
    if (c === 803) { const keep = got.filter(x => /^(MUSIC_U|__csrf|MUSIC_A_T|MUSIC_R_T|NMTID)=/.test(x)); return J({ ok: true, st: 'ok', ck: keep.join('; '), nick: j.nickname || '' }); }
    return J({ ok: true, st: 'fail', msg: j.message || ('网易云返回 ' + c) });
  }
  // 287：登录了网易云的，每日推荐 / 自己的歌单 / 我喜欢的 能从账号里同步过来（QQ 音乐暂时只能搜和放）
  if (p === '/mu/daily') {
    if (src !== 'ne') return E('QQ 音乐的每日推荐还不能同步');
    if (!ck) return E('要先登录网易云');
    const { j } = await ne('/v3/discovery/recommend/songs', {}, ck, ip);
    const d = j.data || {}, why = {}; (d.recommendReasons || []).forEach(r => { why[String(r.songId)] = r.reason; });
    if (j.code !== 200) return E('网易云没给每日推荐（' + (j.code || '') + (j.message ? ' ' + j.message : '') + '），可能登录过期了');
    return J({ ok: true, list: (d.dailySongs || []).map(x => Object.assign(neSong(x), { why: why[String(x.id)] || x.reason || '' })) });
  }
  if (p === '/mu/lists') {
    if (src !== 'ne') return E('QQ 音乐的歌单还不能同步');
    if (!ck) return E('要先登录网易云');
    const { j: a } = await ne('/w/nuser/account/get', {}, ck, ip); const uid = (a.profile || {}).userId; if (!uid) return E('网易云登录过期了，重新扫码登录一次');
    const { j } = await ne('/user/playlist', { uid, limit: 60, offset: 0, includeVideo: true }, ck, ip);
    return J({ ok: true, uid, list: (j.playlist || []).map(l => ({ id: String(l.id), name: l.name, n: l.trackCount || 0, cover: (l.coverImgUrl || '').replace(/^http:/, 'https:'), mine: (l.creator || {}).userId === uid, liked: l.specialType === 5 })) });
  }
  if (p === '/mu/list') {
    if (src !== 'ne') return E('QQ 音乐的歌单还不能同步');
    const id = String(body.id || q.get('id') || ''); if (!id) return E('哪个歌单？');
    const { j } = await ne('/v6/playlist/detail', { id, n: 1000, s: 0 }, ck, ip);
    const pl = j.playlist || {}; let tracks = pl.tracks || [];
    const ids = (pl.trackIds || []).map(t => t.id); const have = new Set(tracks.map(t => t.id)); const miss = ids.filter(x => !have.has(x)).slice(0, 500);
    for (let k = 0; k < miss.length; k += 250) { const { j: d } = await ne('/v3/song/detail', { c: JSON.stringify(miss.slice(k, k + 250).map(x => ({ id: x }))) }, ck, ip); tracks = tracks.concat(d.songs || []); }
    return J({ ok: true, name: pl.name || '', list: tracks.map(neSong) });
  }
  if (p === '/mu/me') {
    if (!ck) return J({ ok: true, in: false });
    if (src === 'qq') { const { j, uin } = await qq({ req: { module: 'userInfo.VipQueryServer', method: 'SRFVipQuery_V2', param: { uin_list: [] } } }, ck); return J({ ok: true, in: uin !== '0', uin }); }
    const { j } = await ne('/w/nuser/account/get', {}, ck); const pr = j.profile || {};
    return J({ ok: true, in: !!pr.userId, nick: pr.nickname || '', vip: !!(j.account && j.account.vipType) });
  }
  return E('没有这个接口', 404);
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const db = env.DB; if (!db) return E('Worker 还没绑定 D1（变量名要叫 DB）', 500);
    try { await init(db); } catch (e) { return E('建表失败：' + e.message, 500); }
    const url = new URL(req.url), p = url.pathname.replace(/\/+$/, '') || '/', q = url.searchParams;
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    // ---------- 不用登录的 ----------
    if (p === '/' || p === '/info') {
      const c = await cfgOf(db); const n = await db.prepare(`SELECT COUNT(*) n FROM users WHERE status='ok'`).first();
      return J({ ok: true, community: true, name: c.name, icon: c.icon, cover: c.cover, intro: c.intro, join: c.join, applyQ: c.applyQ, gate: c.gate !== false, minVer: +c.minVer || 0, updUrl: c.updUrl || '', updMsg: c.updMsg || '', members: n ? n.n : 0, empty: !n || !n.n });
    }
    // 开屏登录用：我这把钥匙还有效吗、我是什么状态（不用登录也能问，钥匙不对就说 none）
    if (p === '/whoami') {
      const t = req.headers.get('X-Gy-Token') || ''; const i = t.indexOf('.');
      const u = i > 0 ? await db.prepare(`SELECT * FROM users WHERE id=?`).bind(t.slice(0, i)).first() : null;
      if (!u || u.tok !== await sha(t.slice(i + 1))) return J({ ok: true, status: 'none' });
      await db.prepare(`UPDATE users SET seen=? WHERE id=?`).bind(now(), u.id).run();
      return J({ ok: true, status: u.status, nick: u.nick, id: u.id });
    }
    const fm = /^\/f\/([a-z0-9]+)$/.exec(p);
    if (fm && req.method === 'GET') {
      const f = await db.prepare(`SELECT mime, data FROM files WHERE id=?`).bind(fm[1]).first(); if (!f) return new Response('not found', { status: 404, headers: CORS });
      if (/^parts:\d+$/.test(f.data || '')) {
        const P = ((await db.prepare(`SELECT data FROM fparts WHERE fid=? ORDER BY i`).bind(fm[1]).all()).results || []);
        if (P.length !== +f.data.slice(6)) return new Response('not ready', { status: 404, headers: CORS });
        const bufs = P.map(x => { const bin = atob(x.data), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; });
        const all = new Uint8Array(bufs.reduce((n, b) => n + b.length, 0)); let o = 0; bufs.forEach(b => { all.set(b, o); o += b.length; });
        return new Response(all, { headers: Object.assign({ 'Content-Type': f.mime, 'Content-Length': String(all.length), 'Accept-Ranges': 'none', 'Cache-Control': 'public, max-age=31536000, immutable' }, CORS) });
      }
      const bin = atob(f.data), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
      return new Response(b, { headers: Object.assign({ 'Content-Type': f.mime, 'Cache-Control': 'public, max-age=31536000, immutable' }, CORS) });
    }
    if (p === '/join' && req.method === 'POST') {
      const c = await cfgOf(db);
      const nick = clip(body.nick, 24).trim(); if (!nick) return E('起个昵称');
      const cnt = await db.prepare(`SELECT COUNT(*) n FROM users`).first(); const first = !cnt || !cnt.n;
      let status = 'ok';
      if (!first && +body.adult !== 1) return E('谷雨只给年满 18 周岁的人用。要是你已经满 18 岁：把谷雨更新到最新版，确认一下再加入');
      if (!first) {
        if (c.join === 'invite') {
          const code = clip(body.code, 40).trim().toUpperCase(); const iv = code && await db.prepare(`SELECT * FROM invites WHERE code=?`).bind(code).first();
          if (!iv) return E('邀请码不对');
          if (iv.exp && iv.exp < now()) return E('邀请码过期了');
          if (iv.max && iv.uses >= iv.max) return E('邀请码用完了');
          await db.prepare(`UPDATE invites SET uses=uses+1 WHERE code=?`).bind(code).run();
        } else if (c.join === 'apply') status = 'pending';
      }
      const id = rid('u'), sec = rid() + rid(); let handle = clip(body.handle || '', 20).toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!handle || await db.prepare(`SELECT 1 FROM users WHERE handle=?`).bind(handle).first()) handle = 'gy' + Math.random().toString(36).slice(2, 8);
      await db.prepare(`INSERT INTO users (id,handle,nick,avatar,bg,bio,color,tok,roles,status,mute,apply,joined,seen,uat) VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?,?,?)`)
        .bind(id, handle, nick, '', '', '', clip(body.color, 12), await sha(sec), JSON.stringify(first ? ['owner'] : []), status, clip(body.apply, 300), now(), now(), now()).run();
      await log(db, id, first ? 'owner' : status === 'pending' ? 'apply' : 'join', id, nick);
      return J({ ok: true, token: id + '.' + sec, id, handle, status, owner: first });
    }

    // ---------- 要登录的 ----------
    const me = await who(req, db); if (!me) return E('没登录或钥匙不对（重新加入一次）', 401);
    // 云端备份：自己的东西，被踢出 / 被封号也还能拿回去
    if (p.startsWith('/mu/')) { try { return await muRoute(p, req, q, body); } catch (e) { return E('一起听出错：' + (e.message || e), 500); } }
    if (p.startsWith('/bk/')) { try { return await bkRoute(p, req, q, body, me, db, env.BK || db); } catch (e) { return E('云端备份出错：' + (e.message || e), 500); } }
    if (me.status === 'banned') return E('你被封号了', 403);
    // 303：被踢 / 申请没通过的（status = left）：只能看自己审核处里那句「为什么没通过」，别的都不行（以前漏了，踢出去的人还能接着发消息）
    if (me.status === 'left' && p !== '/ap/msgs') return E('你已经不在社区里了，重新加入一次', 403);
    const roles = await rolesOf(db), P = permsOf(me, roles);
    const pending = me.status === 'pending';
    if (pending && !['/boot', '/me', '/poll', '/f', '/ap/msgs', '/ap/send', '/fv/begin', '/fv/part', '/fv/done'].includes(p)) return E('还在等管理员审核', 403);
    const chOf = async id => await db.prepare(`SELECT * FROM channels WHERE id=?`).bind(id).first();
    const pubCh = ch => ({ id: ch.id, name: ch.name, icon: ch.icon, color: ch.color, kind: ch.kind, topic: ch.topic, see: parse(ch.see, []), talk: parse(ch.talk, []), meta: parse(ch.meta, {}), pos: ch.pos, canTalk: canTalk(ch, P) });
    const chans = async () => ((await db.prepare(`SELECT * FROM channels ORDER BY pos`).all()).results || []).filter(c => canSee(c, P)).map(pubCh);
    const muted = () => me.mute && me.mute > now();

    if (p === '/f' && req.method === 'POST') {
      const m = /^data:(image\/(?:jpeg|png|webp|gif)|application\/json);base64,(.+)$/.exec(body.data || ''); if (!m) return E('图片格式不对');
      if (m[2].length > 1500000) return E('太大了（图片压小一点，角色卡别超过 1MB）');
      const id = rid('f').toLowerCase(); await db.prepare(`INSERT INTO files VALUES (?,?,?,?,?)`).bind(id, me.id, m[1], m[2], now()).run();
      return J({ ok: true, id, url: url.origin + '/f/' + id });
    }
    // ---------- 🎬 视频：先 begin（说多大、几块），再一块块 part，最后 done ----------
    if (p === '/fv/begin' && req.method === 'POST') {
      const c = await cfgOf(db); const max = Math.max(1, +c.vidMax || 20) * 1048576;
      const mime = /^video\/(mp4|webm|quicktime|3gpp|x-matroska)$/.test(body.mime || '') ? body.mime : '';
      if (!mime) return E('只能传 mp4 / webm / mov 这几种视频');
      const size = +body.size || 0, parts = +body.parts || 0;
      if (!size || size > max) return E('视频太大了（最大 ' + Math.round(max / 1048576) + ' MB），剪短一点或者压一下再发');
      if (!parts || parts > 60) return E('分块不对');
      if (!pending && !can(P, 'video') && !can(P, 'approve')) return E('你还不能发视频（要群主给「发视频」权限）');
      const id = rid('v').toLowerCase();
      await db.prepare(`INSERT INTO files VALUES (?,?,?,?,?)`).bind(id, me.id, mime, 'up:' + parts, now()).run();
      return J({ ok: true, id });
    }
    if (p === '/fv/part' && req.method === 'POST') {
      const f = await db.prepare(`SELECT * FROM files WHERE id=?`).bind(clip(body.id, 40)).first();
      if (!f || f.owner !== me.id || !/^up:\d+$/.test(f.data || '')) return E('找不到这个视频');
      const i = +body.i; const d = String(body.data || '');
      if (!(i >= 0 && i < +f.data.slice(3)) || !d || d.length > 1500000 || /[^A-Za-z0-9+/=]/.test(d)) return E('这一块不对');
      await db.prepare(`INSERT OR REPLACE INTO fparts VALUES (?,?,?)`).bind(f.id, i, d).run();
      return J({ ok: true });
    }
    if (p === '/fv/done' && req.method === 'POST') {
      const f = await db.prepare(`SELECT * FROM files WHERE id=?`).bind(clip(body.id, 40)).first();
      if (!f || f.owner !== me.id || !/^up:\d+$/.test(f.data || '')) return E('找不到这个视频');
      const n = +f.data.slice(3); const got = await db.prepare(`SELECT COUNT(*) n FROM fparts WHERE fid=?`).bind(f.id).first();
      if (!got || got.n !== n) return E('还没传完（' + (got ? got.n : 0) + ' / ' + n + '）');
      await db.prepare(`UPDATE files SET data=? WHERE id=?`).bind('parts:' + n, f.id).run();
      return J({ ok: true, id: f.id, url: url.origin + '/f/' + f.id });
    }
    // ---------- 📝 审核处：等审核的人 + 管理员 ----------
    const apOk = u => u && (u === me.id || can(P, 'approve'));
    if (p === '/ap/msgs') {
      const u = clip(q.get('u') || me.id, 40); if (!apOk(u)) return E('看不了');
      const after = +q.get('after') || 0;
      const L = ((await db.prepare(`SELECT * FROM msgs WHERE ch=? AND id>? ORDER BY id LIMIT 200`).bind('ap:' + u, after).all()).results || []);
      const who = await db.prepare(`SELECT * FROM users WHERE id=?`).bind(u).first();
      const c = await cfgOf(db);
      return J({ ok: true, msgs: L, user: who ? Object.assign(pubUser(who), { apply: who.apply }) : null, intro: c.apIntro || '', name: c.name, icon: c.icon, vidMax: Math.max(1, +c.vidMax || 20) });
    }
    if (p === '/ap/send' && req.method === 'POST') {
      const u = clip(body.u || me.id, 40); if (!apOk(u)) return E('不能在这里说话');
      const who = await db.prepare(`SELECT status FROM users WHERE id=?`).bind(u).first(); if (!who) return E('找不到这个人');
      if (u === me.id && who.status !== 'pending') return E('你已经通过审核了');
      const text = clip(body.text, 2000).trim(), img = clip(body.img, 60); if (!text && !img) return E('空的');
      if (img && !/^[a-z0-9]+$/.test(img)) return E('附件不对');
      const r = await db.prepare(`INSERT INTO msgs (ch,uid,chr,text,card,img,reply,kind,at) VALUES (?,?,?,?,?,?,?,?,?)`).bind('ap:' + u, me.id, null, text, null, img, 0, '', now()).run();
      return J({ ok: true, id: r.meta.last_row_id });
    }
    if (p === '/boot') {
      const c = await cfgOf(db);
      const users = ((await db.prepare(`SELECT * FROM users WHERE status!='left'`).all()).results || []).map(pubUser);
      const fr = ((await db.prepare(`SELECT * FROM friends WHERE a=? OR b=?`).bind(me.id, me.id).all()).results || []);
      const last = ((await db.prepare(`SELECT ch, MAX(id) id FROM msgs WHERE del=0 GROUP BY ch`).all()).results || []);
      return J({ ok: true, me: pubUser(me), perms: P.all ? PERMS : [...P.set], cfg: c, roles, channels: await chans(), users, friends: fr, last, permNames: PERM_NAMES, t: now() });
    }
    if (p === '/poll') {
      const c = await cfgOf(db); const out = { ok: true, t: now(), me: pubUser(me), perms: P.all ? PERMS : [...P.set] };
      if (+q.get('ver') !== c.ver) { out.cfg = c; out.roles = roles; out.channels = await chans(); }
      const since = +q.get('since') || 0;
      out.users = ((await db.prepare(`SELECT * FROM users WHERE uat>?`).bind(since).all()).results || []).map(pubUser);
      out.online = ((await db.prepare(`SELECT id FROM users WHERE seen>?`).bind(now() - 3 * 60e3).all()).results || []).map(x => x.id);
      out.last = ((await db.prepare(`SELECT ch, MAX(id) id FROM msgs WHERE del=0 GROUP BY ch`).all()).results || []);
      const ch = q.get('ch');
      if (ch) { const C = await chOf(ch); if (C && canSee(C, P)) { const after = +q.get('after') || 0; out.msgs = ((await db.prepare(`SELECT * FROM msgs WHERE ch=? AND id>? ORDER BY id LIMIT 200`).bind(ch, after).all()).results || []).map(m => Object.assign(m, { chr: parse(m.chr, null), card: parse(m.card, null) })); out.chMeta = parse(C.meta, {}); out.pins = ((await db.prepare(`SELECT * FROM msgs WHERE ch=? AND pin=1 AND del=0 ORDER BY id DESC LIMIT 5`).bind(ch).all()).results || []); } }
      const dmAfter = +q.get('dm') || 0;
      out.dms = ((await db.prepare(`SELECT * FROM dms WHERE (pair LIKE ? OR pair LIKE ?) AND id>? ORDER BY id LIMIT 300`).bind(me.id + '|%', '%|' + me.id, dmAfter).all()).results || []).map(m => Object.assign(m, { card: parse(m.card, null) }));
      out.friends = ((await db.prepare(`SELECT * FROM friends WHERE a=? OR b=?`).bind(me.id, me.id).all()).results || []);
      if (can(P, 'approve')) { const r = await db.prepare(`SELECT COUNT(*) n FROM reports WHERE state='open'`).first(); const a = await db.prepare(`SELECT COUNT(*) n FROM users WHERE status='pending'`).first(); const al = await db.prepare(`SELECT MAX(m.id) id FROM msgs m JOIN users u ON u.id = m.uid WHERE u.status='pending' AND m.ch = 'ap:' || u.id`).first(); out.staff = { reports: r ? r.n : 0, applies: a ? a.n : 0, apLast: al && al.id || 0 }; }
      return J(out);
    }
    if (p === '/history') {
      const C = await chOf(q.get('ch')); if (!C || !canSee(C, P)) return E('看不了这个频道');
      const before = +q.get('before') || 1e15;
      const L = ((await db.prepare(`SELECT * FROM msgs WHERE ch=? AND id<? ORDER BY id DESC LIMIT 60`).bind(C.id, before).all()).results || []).reverse().map(m => Object.assign(m, { chr: parse(m.chr, null), card: parse(m.card, null) }));
      return J({ ok: true, msgs: L });
    }
    if (p === '/send' && req.method === 'POST') {
      if (muted()) return E('你被禁言了，' + new Date(me.mute).toLocaleString('zh-CN') + ' 之前不能说话');
      const C = await chOf(body.ch); if (!C || !canSee(C, P) || !canTalk(C, P)) return E('这个频道你不能说话');
      const text = clip(body.text, 4000).trim(), card = body.card ? JSON.stringify(body.card).slice(0, 4000) : null, img = clip(body.img, 60);
      if (!text && !card && !img) return E('空的');
      if (/^v/.test(img) && !can(P, 'video')) return E('你还不能在频道里发视频（要群主给「发视频」权限）');
      let chr = null;
      if (body.chr) { if (!can(P, 'table')) return E('你没有「带角色进同桌」的权限'); chr = JSON.stringify({ name: clip(body.chr.name, 30), avatar: clip(body.chr.avatar, 60), cid: clip(body.chr.cid, 40) }); }
      const kind = body.kind === 'round' ? 'round' : (body.kind === 'sys' ? 'sys' : '');
      const r = await db.prepare(`INSERT INTO msgs (ch,uid,chr,text,card,img,reply,kind,at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(C.id, me.id, chr, text, card, img, +body.reply || 0, kind, now()).run();
      return J({ ok: true, id: r.meta.last_row_id });
    }
    if (p === '/delmsg' && req.method === 'POST') {
      const m = await db.prepare(`SELECT * FROM msgs WHERE id=?`).bind(+body.id).first(); if (!m) return E('没这条');
      if (m.uid !== me.id && !can(P, 'del')) return E('没权限');
      await db.prepare(`UPDATE msgs SET del=1 WHERE id=?`).bind(m.id).run(); if (m.uid !== me.id) await log(db, me.id, 'del', m.uid, clip(m.text, 60));
      return J({ ok: true });
    }
    if (p === '/pin' && req.method === 'POST') {
      if (!can(P, 'pin')) return E('没权限');
      await db.prepare(`UPDATE msgs SET pin=? WHERE id=?`).bind(body.on ? 1 : 0, +body.id).run(); await log(db, me.id, body.on ? 'pin' : 'unpin', String(body.id)); return J({ ok: true });
    }
    // 角色同桌：坐下 / 起身
    if (p === '/seat' && req.method === 'POST') {
      const C = await chOf(body.ch); if (!C || C.kind !== 'table') return E('不是同桌频道'); if (!can(P, 'table')) return E('你没有「带角色进同桌」的权限');
      const meta = parse(C.meta, {}); meta.seats = (meta.seats || []).filter(s => !(s.uid === me.id && s.cid === String(body.cid)));
      if (body.on) meta.seats.push({ uid: me.id, cid: clip(body.cid, 40), name: clip(body.name, 30), avatar: clip(body.avatar, 60), intro: clip(body.intro, 200), at: now() });
      meta.seats = meta.seats.slice(-12);
      await db.prepare(`UPDATE channels SET meta=?, uat=? WHERE id=?`).bind(JSON.stringify(meta), now(), C.id).run(); await bump(db);
      return J({ ok: true, seats: meta.seats });
    }
    // ---------- 私聊 / 好友 ----------
    if (p === '/dm' && req.method === 'POST') {
      if (muted()) return E('你被禁言了');
      const to = await db.prepare(`SELECT * FROM users WHERE id=?`).bind(body.to).first(); if (!to || to.status !== 'ok') return E('找不到这个人');
      const blk = await db.prepare(`SELECT state FROM friends WHERE a=? AND b=?`).bind(to.id, me.id).first(); if (blk && blk.state === 'block') return E('对方不收你的私聊');
      const text = clip(body.text, 4000).trim(), card = body.card ? JSON.stringify(body.card).slice(0, 4000) : null, img = clip(body.img, 60); if (!text && !card && !img) return E('空的');
      if (/^v/.test(img) && !can(P, 'video')) return E('你还不能在私聊里发视频（要群主给「发视频」权限）');
      const r = await db.prepare(`INSERT INTO dms (pair,uid,text,card,img,at) VALUES (?,?,?,?,?,?)`).bind(pairOf(me.id, to.id), me.id, text, card, img, now()).run();
      return J({ ok: true, id: r.meta.last_row_id });
    }
    if (p === '/dmhistory') {
      const pair = pairOf(me.id, q.get('with') || ''), before = +q.get('before') || 1e15;
      return J({ ok: true, msgs: ((await db.prepare(`SELECT * FROM dms WHERE pair=? AND id<? ORDER BY id DESC LIMIT 60`).bind(pair, before).all()).results || []).reverse().map(m => Object.assign(m, { card: parse(m.card, null) })) });
    }
    if (p === '/friend' && req.method === 'POST') {
      const to = body.to ? await db.prepare(`SELECT * FROM users WHERE id=? OR handle=?`).bind(body.to, String(body.to).toLowerCase()).first() : null; if (!to || to.id === me.id) return E('找不到这个谷雨号');
      const act = body.act;
      if (act === 'req') { const back = await db.prepare(`SELECT state FROM friends WHERE a=? AND b=?`).bind(to.id, me.id).first(); if (back && back.state === 'req') { await db.batch([db.prepare(`INSERT OR REPLACE INTO friends VALUES (?,?,?,?,?)`).bind(me.id, to.id, 'ok', '', now()), db.prepare(`UPDATE friends SET state='ok' WHERE a=? AND b=?`).bind(to.id, me.id)]); } else await db.prepare(`INSERT OR REPLACE INTO friends VALUES (?,?,?,?,?)`).bind(me.id, to.id, 'req', clip(body.note, 100), now()).run(); }
      else if (act === 'accept') await db.batch([db.prepare(`UPDATE friends SET state='ok' WHERE a=? AND b=?`).bind(to.id, me.id), db.prepare(`INSERT OR REPLACE INTO friends VALUES (?,?,?,?,?)`).bind(me.id, to.id, 'ok', '', now())]);
      else if (act === 'block') await db.prepare(`INSERT OR REPLACE INTO friends VALUES (?,?,?,?,?)`).bind(me.id, to.id, 'block', '', now()).run();
      else await db.prepare(`DELETE FROM friends WHERE (a=? AND b=?) OR (a=? AND b=?)`).bind(me.id, to.id, to.id, me.id).run();
      return J({ ok: true, id: to.id });
    }
    // ---------- 自己的资料（头像 / 背景 / 签名…，改了所有人同步） ----------
    if (p === '/me' && req.method === 'POST') {
      const f = {}; ['nick', 'bio', 'avatar', 'bg', 'color'].forEach(k => { if (body[k] != null) f[k] = clip(body[k], k === 'bio' ? 300 : k === 'nick' ? 24 : 60); });
      if (body.handle) { const h = clip(body.handle, 20).toLowerCase().replace(/[^a-z0-9_]/g, ''); if (h && h !== me.handle) { if (await db.prepare(`SELECT 1 FROM users WHERE handle=?`).bind(h).first()) return E('这个谷雨号有人用了'); f.handle = h; } }
      const ks = Object.keys(f); if (!ks.length) return J({ ok: true });
      await db.prepare(`UPDATE users SET ${ks.map(k => k + '=?').join(',')}, uat=? WHERE id=?`).bind(...ks.map(k => f[k]), now(), me.id).run();
      return J({ ok: true });
    }
    if (p === '/leave' && req.method === 'POST') { await db.prepare(`UPDATE users SET status='left', uat=? WHERE id=?`).bind(now(), me.id).run(); return J({ ok: true }); }
    // ---------- 举报 ----------
    if (p === '/report' && req.method === 'POST') {
      await db.prepare(`INSERT INTO reports (by,kind,ref,who,reason,excerpt,at) VALUES (?,?,?,?,?,?,?)`).bind(me.id, clip(body.kind, 10), clip(body.ref, 40), clip(body.who, 40), clip(body.reason, 200), clip(body.excerpt, 300), now()).run();
      return J({ ok: true });
    }

    // ---------- 管理（要权限） ----------
    const target = async () => { const t = await db.prepare(`SELECT * FROM users WHERE id=?`).bind(body.uid || body.target).first(); if (!t) throw new Error('找不到这个人'); if (t.id !== me.id && userRank(t, roles) >= userRank(me, roles)) throw new Error('对方身份组不比你低，动不了'); return t; };
    try {
      if (p === '/staff') {
        if (!can(P, 'approve')) return E('没权限');
        const rep = ((await db.prepare(`SELECT * FROM reports WHERE state='open' ORDER BY id DESC LIMIT 100`).all()).results || []);
        const app = ((await db.prepare(`SELECT * FROM users WHERE status='pending' ORDER BY joined DESC LIMIT 100`).all()).results || []).map(u => Object.assign(pubUser(u), { apply: u.apply }));
        for (const u of app) { const m = await db.prepare(`SELECT * FROM msgs WHERE ch=? ORDER BY id DESC LIMIT 1`).bind('ap:' + u.id).first(); u.apLast = m ? { id: m.id, uid: m.uid, text: m.text, img: m.img, at: m.at } : null; const n = await db.prepare(`SELECT COUNT(*) n FROM msgs WHERE ch=?`).bind('ap:' + u.id).first(); u.apN = n ? n.n : 0; }
        const lg = ((await db.prepare(`SELECT * FROM logs ORDER BY id DESC LIMIT 100`).all()).results || []);
        const banned = ((await db.prepare(`SELECT * FROM users WHERE status='banned'`).all()).results || []).map(pubUser);
        return J({ ok: true, reports: rep, applies: app, logs: lg, banned });
      }
      if (p === '/mod' && req.method === 'POST') {
        const a = body.act, t = now();
        if (a === 'approve' || a === 'reject') { if (!can(P, 'approve')) return E('没权限'); const u = await target(); await db.prepare(`UPDATE users SET status=?, uat=? WHERE id=?`).bind(a === 'approve' ? 'ok' : 'left', t, u.id).run(); await db.prepare(`INSERT INTO msgs (ch,uid,chr,text,card,img,reply,kind,at) VALUES (?,?,?,?,?,?,?,?,?)`).bind('ap:' + u.id, me.id, null, a === 'approve' ? '审核通过了' : '没有通过审核' + (body.why ? '：' + clip(body.why, 200) : ''), null, '', 0, 'sys', t).run(); const vids = ((await db.prepare(`SELECT f.id FROM files f WHERE f.owner=? AND f.mime LIKE 'video/%'`).bind(u.id).all()).results || []).map(x => x.id); for (const v of vids) { await db.prepare(`DELETE FROM fparts WHERE fid=?`).bind(v).run(); await db.prepare(`DELETE FROM files WHERE id=?`).bind(v).run(); } await log(db, me.id, a, u.id, u.nick); return J({ ok: true }); }
        if (a === 'mute') { if (!can(P, 'mute')) return E('没权限'); const u = await target(); const mins = Math.max(0, +body.mins || 0); await db.prepare(`UPDATE users SET mute=?, uat=? WHERE id=?`).bind(mins ? t + mins * 60e3 : 0, t, u.id).run(); await log(db, me.id, mins ? 'mute' : 'unmute', u.id, mins ? mins + ' 分钟' : ''); return J({ ok: true }); }
        if (a === 'kick') { if (!can(P, 'kick')) return E('没权限'); const u = await target(); await db.prepare(`UPDATE users SET status='left', uat=? WHERE id=?`).bind(t, u.id).run(); await log(db, me.id, 'kick', u.id, u.nick); return J({ ok: true }); }
        if (a === 'ban' || a === 'unban') { if (!can(P, 'ban')) return E('没权限'); const u = await target(); await db.prepare(`UPDATE users SET status=?, uat=? WHERE id=?`).bind(a === 'ban' ? 'banned' : 'ok', t, u.id).run(); await log(db, me.id, a, u.id, u.nick); return J({ ok: true }); }
        if (a === 'role_add' || a === 'role_del') {
          if (!can(P, 'roles')) return E('没权限'); const u = await target(); const R = roles.find(r => r.id === body.role); if (!R || R.id === 'member') return E('没这个身份组');
          if (R.id === 'owner' && !P.all) return E('只有群主能转让群主');
          if (!P.all && R.pos >= P.top) return E('只能发比自己低的身份组');
          let L = parse(u.roles, []); L = a === 'role_add' ? Array.from(new Set(L.concat(R.id))) : L.filter(x => x !== R.id);
          if (R.id === 'owner' && a === 'role_add') { await db.prepare(`UPDATE users SET roles=?, uat=? WHERE id=?`).bind(JSON.stringify(parse(me.roles, []).filter(x => x !== 'owner')), t, me.id).run(); }
          await db.prepare(`UPDATE users SET roles=?, uat=? WHERE id=?`).bind(JSON.stringify(L), t, u.id).run(); await log(db, me.id, a, u.id, R.name); return J({ ok: true });
        }
        if (a === 'report_done') { if (!can(P, 'approve')) return E('没权限'); await db.prepare(`UPDATE reports SET state=? WHERE id=?`).bind(body.state === 'ignore' ? 'ignored' : 'done', +body.id).run(); await log(db, me.id, 'report', String(body.id), body.state); return J({ ok: true }); }
        return E('不认识的操作');
      }
      if (p === '/roles' && req.method === 'POST') {
        if (!can(P, 'roles')) return E('没权限'); const r = body.role || {}, t = now();
        if (body.act === 'delete') { if (['owner', 'member', 'admin'].includes(r.id) && !P.all) return E('不能删'); if (['owner', 'member'].includes(r.id)) return E('群主和成员不能删'); const R = roles.find(x => x.id === r.id); if (!R) return E('没这个'); if (!P.all && R.pos >= P.top) return E('只能动比自己低的'); await db.prepare(`DELETE FROM roles WHERE id=?`).bind(r.id).run(); }
        else {
          const id = r.id && roles.some(x => x.id === r.id) ? r.id : rid('r'); if (id === 'owner') return E('群主的权限改不了');
          const old = roles.find(x => x.id === id); const pos = Math.max(1, Math.min(999, +r.pos || (old ? old.pos : 10)));
          if (!P.all && (pos >= P.top || (old && old.pos >= P.top))) return E('只能建 / 改比自己低的身份组');
          const perms = (Array.isArray(r.perms) ? r.perms : []).filter(x => PERMS.includes(x) && (P.all || P.set.has(x)));
          await db.prepare(`INSERT OR REPLACE INTO roles VALUES (?,?,?,?,?,?)`).bind(id, clip(r.name, 16) || '新身份组', clip(r.color, 12) || '#8e8e93', JSON.stringify(perms), id === 'member' ? 0 : pos, t).run();
        }
        await log(db, me.id, 'roles', r.id || '', r.name || ''); const c = await bump(db); return J({ ok: true, roles: await rolesOf(db), ver: c.ver });
      }
      if (p === '/channels' && req.method === 'POST') {
        if (!can(P, 'channel')) return E('没权限'); const c = body.channel || {}, t = now();
        if (body.act === 'delete') await db.prepare(`DELETE FROM channels WHERE id=?`).bind(c.id).run();
        else { const old = c.id ? await chOf(c.id) : null; const id = old ? old.id : rid('c'); await db.prepare(`INSERT OR REPLACE INTO channels VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id, clip(c.name, 20) || '新频道', clip(c.icon, 60) || '#', clip(c.color, 12) || '#007aff', ['text', 'table', 'cards', 'notice'].includes(c.kind) ? c.kind : 'text', clip(c.topic, 100), JSON.stringify(Array.isArray(c.see) ? c.see.filter(x => PERMS.includes(x)) : []), JSON.stringify(Array.isArray(c.talk) ? c.talk.filter(x => PERMS.includes(x)) : []), old ? old.meta : (c.kind === 'table' ? '{"seats":[]}' : '{}'), +c.pos || (old ? old.pos : 50), t).run(); }
        await log(db, me.id, 'channel', c.id || '', c.name || ''); await bump(db); return J({ ok: true, channels: await chans() });
      }
      if (p === '/cfg' && req.method === 'POST') {
        if (!can(P, 'cfg')) return E('没权限'); const x = {}; ['name', 'icon', 'cover', 'intro', 'applyQ', 'rules', 'apIntro'].forEach(k => { if (body[k] != null) x[k] = clip(body[k], k === 'rules' || k === 'intro' || k === 'apIntro' ? 1000 : 60); });
        if (body.vidMax != null) x.vidMax = Math.max(1, Math.min(50, Math.floor(+body.vidMax || 20)));   // 303：视频最大几 MB
        if (body.join) { if (!P.all) return E('加入方式只有群主能改'); if (['invite', 'open', 'apply'].includes(body.join)) x.join = body.join; }
        // 开屏登录 / 最低版本 / 更新地址：只有群主能改
        if (body.gate != null || body.minVer != null || body.updUrl != null || body.updMsg != null) {
          if (!P.all) return E('开屏登录和最低版本只有群主能改');
          if (body.gate != null) x.gate = !!body.gate;
          if (body.minVer != null) x.minVer = Math.max(0, Math.floor(+body.minVer || 0));
          if (body.updUrl != null) x.updUrl = clip(body.updUrl, 300);
          if (body.updMsg != null) x.updMsg = clip(body.updMsg, 300);
        }
        if (body.bkOn != null || body.bkMax != null || body.bkKeep != null || body.bkTotal != null) {
          if (!P.all) return E('云端备份的设置只有群主能改');
          if (body.bkOn != null) x.bkOn = !!body.bkOn;
          if (body.bkMax != null) x.bkMax = Math.max(1, Math.min(500, Math.floor(+body.bkMax || 30)));
          if (body.bkKeep != null) x.bkKeep = Math.max(1, Math.min(5, Math.floor(+body.bkKeep || 2)));
          if (body.bkTotal != null) x.bkTotal = Math.max(10, Math.min(10000, Math.floor(+body.bkTotal || 450)));
        }
        await log(db, me.id, 'cfg', '', Object.keys(x).join(',')); return J({ ok: true, cfg: await bump(db, x) });
      }
      if (p === '/invite' && req.method === 'POST') {
        if (!can(P, 'invite')) return E('没权限');
        if (body.act === 'delete') { await db.prepare(`DELETE FROM invites WHERE code=?`).bind(body.code).run(); return J({ ok: true }); }
        const code = 'GY-' + Math.random().toString(36).slice(2, 6).toUpperCase(); const days = Math.max(0, +body.days || 0);
        await db.prepare(`INSERT INTO invites VALUES (?,?,0,?,?,?)`).bind(code, me.id, Math.max(0, +body.max || 0), days ? now() + days * 86400e3 : 0, now()).run(); await log(db, me.id, 'invite', code);
        return J({ ok: true, code });
      }
      if (p === '/invites') { if (!can(P, 'invite')) return E('没权限'); return J({ ok: true, invites: ((await db.prepare(`SELECT * FROM invites ORDER BY at DESC LIMIT 50`).all()).results || []) }); }
    } catch (e) { return E(e.message || String(e)); }
    return E('没有这个接口', 404);
  },
};
