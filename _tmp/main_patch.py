import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
if 'gy-oauth' in s: print('already'); sys.exit(0)
a="  showMain: () => ipcRenderer.send('gy-pet', 'main')\n});`;"
assert s.count(a)==1, 'preload anchor'
s=s.replace(a,"  showMain: () => ipcRenderer.send('gy-pet', 'main'),\n  oauthLoopback: o => ipcRenderer.invoke('gy-oauth', o),\n  mcp: (op, a) => ipcRenderer.invoke('gy-mcp', op, a)\n});`;")
b="ipcMain.on('gy-pet', (e, what, v) => {"
assert s.count(b)==1, 'ipc anchor'
add=r'''// ------------------------------------------------------------------
// 🎫 248：一键登录（ChatGPT 会员 / OpenRouter）要一个本机回调：在 127.0.0.1 上临时开个口子，
//    打开系统浏览器去登录，等浏览器跳回来，把地址里的参数交给页面，然后马上关掉。
// ------------------------------------------------------------------
const gyHttp = require('http');
ipcMain.handle('gy-oauth', (e, o) => new Promise((resolve) => {
  o = o || {};
  const port = Number(o.port) || 1455, want = o.path || '/callback';
  const hosts = o.both ? ['127.0.0.1', '::1'] : ['127.0.0.1'];
  const servers = []; let done = false, listening = 0, failed = 0;
  const finish = (r) => { if (done) return; done = true; clearTimeout(timer); servers.forEach(sv => { try { sv.close(); } catch (er) {} }); resolve(r); };
  const timer = setTimeout(() => finish({ ok: false, err: '等了太久，没等到登录完成（5 分钟）' }), Number(o.timeoutMs) || 300000);
  const handler = (req, res) => {
    let u; try { u = new URL(req.url, 'http://127.0.0.1:' + port); } catch (er) { res.writeHead(400); return res.end(); }
    if (u.pathname !== want) { res.writeHead(404); return res.end(); }
    const q = {}; u.searchParams.forEach((v, k) => { q[k] = v; });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(o.okHtml || '<p>好了，可以回谷雨了。</p>');
    try { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); } } catch (er) {}
    finish({ ok: true, query: q });
  };
  hosts.forEach(h => {
    const sv = gyHttp.createServer(handler);
    sv.on('error', (er) => { failed++; if (failed === hosts.length || (h === '127.0.0.1' && !o.both)) finish({ ok: false, err: er && er.code === 'EADDRINUSE' ? `电脑上 ${port} 端口被别的程序占着（比如正在登录的 Codex），关掉再试` : '开不了本机回调：' + (er && er.message) }); });
    sv.listen(port, h, () => { listening++; if (listening === 1) { shell.openExternal(o.authUrl).catch(() => finish({ ok: false, err: '打不开浏览器' })); } });
    servers.push(sv);
  });
}));

// ------------------------------------------------------------------
// 🧰 248：本地 MCP（stdio）。页面通过 gyDesk.mcp('start'|'rpc'|'stop') 用；一行一条 JSON-RPC。
// ------------------------------------------------------------------
const { spawn: gySpawn } = require('child_process');
const GY_MCP = {};
function gyMcpStop(key) { const m = GY_MCP[key]; if (!m) return; delete GY_MCP[key]; try { m.proc.kill(); } catch (er) {} m.pending.forEach(p => p({ ok: false, err: 'MCP 进程停了' })); }
ipcMain.handle('gy-mcp', async (e, op, a) => {
  a = a || {};
  if (op === 'stop') { gyMcpStop(a.key); return { ok: true }; }
  if (op === 'start') {
    const old = GY_MCP[a.key]; if (old && old.proc.exitCode == null && !old.proc.killed) return { ok: true, again: true };
    if (!a.command) return { ok: false, err: '没填命令' };
    const win = process.platform === 'win32';
    const args = (a.args || []).map(x => (win && /[\s"]/.test(x)) ? '"' + String(x).replace(/"/g, '\\"') + '"' : String(x));
    let proc;
    try { proc = gySpawn(a.command, args, { cwd: a.cwd || undefined, env: Object.assign({}, process.env, a.env || {}), shell: win, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (er) { return { ok: false, err: '起不来：' + er.message }; }
    const m = { proc, buf: '', err: '', pending: new Map() };
    GY_MCP[a.key] = m;
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', d => {
      m.buf += d; let i;
      while ((i = m.buf.indexOf('\n')) >= 0) {
        const line = m.buf.slice(0, i).trim(); m.buf = m.buf.slice(i + 1);
        if (!line) continue;
        let j; try { j = JSON.parse(line); } catch (er) { continue; }
        if (j && j.id != null && m.pending.has(j.id)) { const p = m.pending.get(j.id); m.pending.delete(j.id); p({ ok: true, msg: j }); }
      }
    });
    proc.stderr.on('data', d => { m.err = (m.err + d).slice(-2000); });
    const early = await new Promise(r => {
      proc.on('error', er => r('起不来：' + (er.code === 'ENOENT' ? '电脑上找不到「' + a.command + '」这个命令（' + er.code + '）' : er.message)));
      proc.on('exit', code => { r('进程一启动就退出了（' + code + '）' + (m.err ? '：' + m.err.slice(-300) : '')); });
      setTimeout(() => r(null), 600);
    });
    proc.on('exit', () => { if (GY_MCP[a.key] === m) gyMcpStop(a.key); });
    if (early) { gyMcpStop(a.key); return { ok: false, err: early }; }
    return { ok: true };
  }
  if (op === 'rpc') {
    const m = GY_MCP[a.key]; if (!m) return { ok: false, err: 'MCP 还没启动' };
    try { m.proc.stdin.write(JSON.stringify(a.msg) + '\n'); } catch (er) { return { ok: false, err: '写不进去：' + er.message }; }
    if (a.noWait || a.msg.id == null) return { ok: true };
    return await new Promise(r => {
      m.pending.set(a.msg.id, r);
      setTimeout(() => { if (m.pending.has(a.msg.id)) { m.pending.delete(a.msg.id); r({ ok: false, err: '等了 60 秒没回' + (m.err ? '（' + m.err.slice(-200) + '）' : '') }); } }, 60000);
    });
  }
  return { ok: false, err: '不认识的操作' };
});
app.on('will-quit', () => { Object.keys(GY_MCP).forEach(gyMcpStop); });

'''
s=s.replace(b, add+b)
open(p,'w',encoding='utf-8',newline='').write(s)
print('patched')
