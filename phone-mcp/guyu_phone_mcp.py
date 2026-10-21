#!/usr/bin/env python3
# =====================================================================
#  📱 谷雨 · 手机 MCP（不用原生插件、不用重新打包）
#  在手机的 Termux 里跑起来，谷雨「🧰 我的 MCP」连 http://127.0.0.1:8765/mcp 就能用手机的本事：
#  看电量、读通知、发通知、震动、手电筒、念出来、音量、亮度、剪贴板、位置、Wi-Fi、通话记录、短信……
#  底下靠的是 Termux:API（termux-xxx 命令），只用 Python 自带的库，不用 pip 装任何东西。
#
#  跑法：python guyu_phone_mcp.py            （默认只开安全的；发短信 / 打电话要加 --danger）
#        python guyu_phone_mcp.py --port 8765 --danger
#  第一次跑会生成一个口令，存在 ~/.guyu_phone_mcp_token，谷雨那边请求头填 Authorization: Bearer 口令
#  （有口令是因为手机上别的网页也能访问 127.0.0.1，不能让它们随便读你的短信和通知）
# =====================================================================
import argparse, json, os, secrets, shutil, subprocess, sys, threading, time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VERSION = '1.0.0'
PROTOS = ['2025-06-18', '2025-03-26', '2024-11-05']
TOKEN_FILE = os.path.expanduser('~/.guyu_phone_mcp_token')


def run(cmd, stdin=None, timeout=20):
    exe = shutil.which(cmd[0])
    if not exe:
        raise RuntimeError(f'找不到 {cmd[0]}：先 pkg install termux-api，并装好 Termux:API 这个 App')
    p = subprocess.run([exe] + cmd[1:], input=stdin, capture_output=True, text=True, timeout=timeout)
    out = (p.stdout or '').strip()
    if p.returncode != 0:
        raise RuntimeError((p.stderr or out or f'{cmd[0]} 退出码 {p.returncode}').strip()[:400])
    return out


def pretty(out):
    try:
        return json.dumps(json.loads(out), ensure_ascii=False, indent=1)
    except Exception:
        return out or '好了'


def num(a, k, d, lo=None, hi=None):
    try:
        v = int(a.get(k, d))
    except Exception:
        v = d
    if lo is not None: v = max(lo, v)
    if hi is not None: v = min(hi, v)
    return v


# ---------------- 工具 ----------------
# 每个工具：(说明, 参数 schema, 处理函数, 是否危险)
def S(props=None, req=None):
    return {'type': 'object', 'properties': props or {}, 'required': req or []}


def t_now(a):
    n = datetime.now()
    return n.strftime('%Y-%m-%d %H:%M:%S ') + '星期' + '一二三四五六日'[n.weekday()]


def t_battery(a):
    return pretty(run(['termux-battery-status']))


def t_notifications(a):
    out = run(['termux-notification-list'])
    try:
        arr = json.loads(out or '[]')
    except Exception:
        return out
    keep = []
    for x in arr[: num(a, 'limit', 20, 1, 60)]:
        keep.append({k: x.get(k) for k in ('packageName', 'title', 'content', 'when') if x.get(k)})
    return json.dumps(keep, ensure_ascii=False, indent=1) if keep else '现在没有通知'


def t_notify(a):
    cmd = ['termux-notification', '--title', str(a.get('title') or '谷雨'), '--content', str(a.get('content') or '')]
    if a.get('vibrate', True): cmd += ['--vibrate', '300,150,300']
    run(cmd)
    return '通知发出去了'


def t_toast(a):
    run(['termux-toast', str(a.get('text') or '')])
    return '弹出来了'


def t_vibrate(a):
    run(['termux-vibrate', '-f', '-d', str(num(a, 'ms', 500, 50, 5000))])
    return '震了'


def t_torch(a):
    run(['termux-torch', 'on' if a.get('on') else 'off'])
    return '手电筒' + ('开了' if a.get('on') else '关了')


def t_speak(a):
    cmd = ['termux-tts-speak']
    if a.get('rate'): cmd += ['-r', str(a.get('rate'))]
    if a.get('pitch'): cmd += ['-p', str(a.get('pitch'))]
    run(cmd, stdin=str(a.get('text') or ''), timeout=120)
    return '念完了'


def t_volume(a):
    if a.get('stream') and a.get('level') is not None:
        run(['termux-volume', str(a['stream']), str(num(a, 'level', 0, 0, 100))])
    return pretty(run(['termux-volume']))


def t_brightness(a):
    run(['termux-brightness', 'auto' if a.get('auto') else str(num(a, 'level', 128, 0, 255))])
    return '亮度调好了'


def t_clip_get(a):
    return run(['termux-clipboard-get']) or '剪贴板是空的'


def t_clip_set(a):
    run(['termux-clipboard-set'], stdin=str(a.get('text') or ''))
    return '复制好了'


def t_location(a):
    return pretty(run(['termux-location', '-p', 'gps' if a.get('gps') else 'network', '-r', 'once'], timeout=45))


def t_wifi(a):
    return pretty(run(['termux-wifi-connectioninfo']))


def t_call_log(a):
    return pretty(run(['termux-call-log', '-l', str(num(a, 'limit', 10, 1, 50))]))


def t_sms_list(a):
    cmd = ['termux-sms-list', '-l', str(num(a, 'limit', 10, 1, 50))]
    if a.get('box') in ('inbox', 'sent', 'draft', 'outbox', 'all'): cmd += ['-t', a['box']]
    return pretty(run(cmd))


def t_open_url(a):
    u = str(a.get('url') or '')
    if not u.startswith(('http://', 'https://')): raise RuntimeError('只开 http / https 的网址')
    run(['termux-open-url', u])
    return '打开了'


def t_remind(a):
    mins = max(0.1, min(24 * 60, float(a.get('minutes') or 1)))
    title, text = str(a.get('title') or '提醒'), str(a.get('content') or '')
    def fire():
        try:
            run(['termux-notification', '--title', title, '--content', text, '--vibrate', '500,200,500', '--priority', 'high'])
        except Exception as e:
            print('提醒没发出去：', e, file=sys.stderr)
    tm = threading.Timer(mins * 60, fire); tm.daemon = True; tm.start()
    at = datetime.fromtimestamp(time.time() + mins * 60).strftime('%H:%M')
    return f'定好了，{at} 左右会弹通知（这个窗口 / Termux 得一直开着）'


def t_sms_send(a):
    run(['termux-sms-send', '-n', str(a.get('number') or '')], stdin=str(a.get('text') or ''))
    return '短信发出去了'


def t_call(a):
    run(['termux-telephony-call', str(a.get('number') or '')])
    return '拨出去了'


TOOLS = {
    'now': ('手机上现在几点、星期几', S(), t_now, False),
    'battery': ('看手机电量、在不在充电、温度', S(), t_battery, False),
    'notifications': ('读手机现在的通知（谁发了什么消息）。要先给 Termux:API 开「通知使用权」', S({'limit': {'type': 'integer', 'description': '最多几条，默认 20'}}), t_notifications, False),
    'notify': ('在她手机上弹一条通知', S({'title': {'type': 'string'}, 'content': {'type': 'string'}, 'vibrate': {'type': 'boolean', 'description': '要不要顺便震一下，默认要'}}, ['content']), t_notify, False),
    'toast': ('屏幕上弹一行小字（几秒就消失）', S({'text': {'type': 'string'}}, ['text']), t_toast, False),
    'vibrate': ('让手机震一下', S({'ms': {'type': 'integer', 'description': '震多久（毫秒），默认 500'}}), t_vibrate, False),
    'torch': ('开 / 关手电筒', S({'on': {'type': 'boolean'}}, ['on']), t_torch, False),
    'speak': ('用手机把一段话念出来（语音合成）', S({'text': {'type': 'string'}, 'rate': {'type': 'number', 'description': '语速，1 是正常'}, 'pitch': {'type': 'number', 'description': '音调，1 是正常'}}, ['text']), t_speak, False),
    'volume': ('看音量；带上 stream 和 level 就是调音量', S({'stream': {'type': 'string', 'enum': ['music', 'ring', 'notification', 'alarm', 'call', 'system']}, 'level': {'type': 'integer'}}), t_volume, False),
    'brightness': ('调屏幕亮度（0-255），或者设成自动', S({'level': {'type': 'integer'}, 'auto': {'type': 'boolean'}}), t_brightness, False),
    'clipboard_get': ('看她剪贴板里复制了什么', S(), t_clip_get, False),
    'clipboard_set': ('把一段字放进她的剪贴板', S({'text': {'type': 'string'}}, ['text']), t_clip_set, False),
    'location': ('看手机现在大概在哪（经纬度）', S({'gps': {'type': 'boolean', 'description': '用 GPS 更准但更慢，默认用网络定位'}}), t_location, False),
    'wifi': ('看现在连的是哪个 Wi-Fi', S(), t_wifi, False),
    'call_log': ('看最近的通话记录', S({'limit': {'type': 'integer'}}), t_call_log, False),
    'sms_list': ('看最近的短信', S({'limit': {'type': 'integer'}, 'box': {'type': 'string', 'enum': ['inbox', 'sent', 'all']}}), t_sms_list, False),
    'open_url': ('在她手机上打开一个网址', S({'url': {'type': 'string'}}, ['url']), t_open_url, False),
    'remind_later': ('过几分钟在她手机上弹提醒（比如叫她喝水、睡觉、起床）', S({'minutes': {'type': 'number'}, 'title': {'type': 'string'}, 'content': {'type': 'string'}}, ['minutes', 'content']), t_remind, False),
    'sms_send': ('发短信（危险，要 --danger 才有）', S({'number': {'type': 'string'}, 'text': {'type': 'string'}}, ['number', 'text']), t_sms_send, True),
    'phone_call': ('打电话（危险，要 --danger 才有）', S({'number': {'type': 'string'}}, ['number']), t_call, True),
}


# ---------------- MCP（Streamable HTTP，只回 JSON，不开 SSE） ----------------
class Srv:
    danger = False
    token = ''


def active_tools():
    return {k: v for k, v in TOOLS.items() if Srv.danger or not v[3]}


def handle(msg):
    if not isinstance(msg, dict) or msg.get('jsonrpc') != '2.0':
        return {'jsonrpc': '2.0', 'id': None, 'error': {'code': -32600, 'message': 'Invalid Request'}}
    mid, method, p = msg.get('id'), msg.get('method'), msg.get('params') or {}
    if mid is None:
        return None   # 通知
    def ok(r): return {'jsonrpc': '2.0', 'id': mid, 'result': r}
    def err(c, m): return {'jsonrpc': '2.0', 'id': mid, 'error': {'code': c, 'message': m}}
    if method == 'initialize':
        v = p.get('protocolVersion')
        return ok({'protocolVersion': v if v in PROTOS else PROTOS[0], 'capabilities': {'tools': {}},
                   'serverInfo': {'name': 'guyu-phone', 'title': '谷雨 · 这台手机', 'version': VERSION},
                   'instructions': '这些工具能直接操作用户自己的手机。读到的通知、短信、位置都是她的隐私，只在聊天里自然地用。'})
    if method == 'ping':
        return ok({})
    if method == 'tools/list':
        return ok({'tools': [{'name': k, 'description': v[0], 'inputSchema': v[1]} for k, v in active_tools().items()]})
    if method == 'tools/call':
        name, args = p.get('name'), p.get('arguments') or {}
        t = active_tools().get(name)
        if not t:
            return err(-32602, f'没有这个工具：{name}')
        try:
            return ok({'content': [{'type': 'text', 'text': t[2](args)}], 'isError': False})
        except subprocess.TimeoutExpired:
            return ok({'content': [{'type': 'text', 'text': '手机那边太久没反应（超时了）'}], 'isError': True})
        except Exception as e:
            return ok({'content': [{'type': 'text', 'text': str(e)}], 'isError': True})
    return err(-32601, f'不认识的方法：{method}')


class H(BaseHTTPRequestHandler):
    server_version = 'GuyuPhoneMCP/' + VERSION

    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, MCP-Protocol-Version, Mcp-Session-Id')
        self.send_header('Access-Control-Expose-Headers', 'Mcp-Session-Id')
        self.send_header('Access-Control-Allow-Private-Network', 'true')

    def reply(self, code, body=None):
        data = b'' if body is None else json.dumps(body, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.cors()
        if body is not None: self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        if data: self.wfile.write(data)

    def do_OPTIONS(self):
        self.reply(204)

    def do_GET(self):
        if self.path.split('?')[0] in ('/', '/health'):
            return self.reply(200, {'ok': True, 'name': 'guyu-phone', 'version': VERSION, 'tools': len(active_tools())})
        self.reply(405, {'error': '这里不开 SSE，用 POST'})

    def do_DELETE(self):
        self.reply(200, {})

    def do_POST(self):
        if self.path.split('?')[0].rstrip('/') != '/mcp':
            return self.reply(404, {'error': '地址是 /mcp'})
        if Srv.token and self.headers.get('Authorization', '').strip() != 'Bearer ' + Srv.token:
            return self.reply(401, {'error': '口令不对：请求头要填 Authorization: Bearer 口令'})
        try:
            n = int(self.headers.get('Content-Length') or 0)
            msg = json.loads(self.rfile.read(n).decode('utf-8') or 'null')
        except Exception:
            return self.reply(400, {'jsonrpc': '2.0', 'id': None, 'error': {'code': -32700, 'message': 'Parse error'}})
        if isinstance(msg, list):
            out = [r for r in (handle(m) for m in msg) if r]
            return self.reply(200, out) if out else self.reply(202)
        r = handle(msg)
        if isinstance(msg, dict) and msg.get('method') == 'tools/call':
            print(datetime.now().strftime('%H:%M:%S'), '用了', (msg.get('params') or {}).get('name'))
        self.reply(200, r) if r else self.reply(202)

    def log_message(self, *a):
        pass


def load_token(arg):
    if arg is not None: return arg
    try:
        t = open(TOKEN_FILE, encoding='utf-8').read().strip()
        if t: return t
    except Exception:
        pass
    t = secrets.token_urlsafe(12)
    try:
        with open(TOKEN_FILE, 'w', encoding='utf-8') as f: f.write(t)
        os.chmod(TOKEN_FILE, 0o600)
    except Exception:
        pass
    return t


def main():
    ap = argparse.ArgumentParser(description='谷雨 · 手机 MCP（Termux）')
    ap.add_argument('--host', default='127.0.0.1', help='默认只让本机连；改成 0.0.0.0 同一个 Wi-Fi 下的电脑也能连')
    ap.add_argument('--port', type=int, default=8765)
    ap.add_argument('--token', default=None, help='自己指定口令；填空字符串 "" 就是不要口令（不建议）')
    ap.add_argument('--danger', action='store_true', help='打开 发短信 / 打电话')
    a = ap.parse_args()
    Srv.danger, Srv.token = a.danger, load_token(a.token)
    if not shutil.which('termux-battery-status'):
        print('⚠️ 没找到 termux-api 命令：先跑 pkg install termux-api，再去装 Termux:API 这个 App（F-Droid 上和 Termux 同一个来源）')
    httpd = ThreadingHTTPServer((a.host, a.port), H)
    print(f'📱 谷雨手机 MCP 开着了  v{VERSION}')
    print(f'   网址：http://127.0.0.1:{a.port}/mcp')
    print(f'   口令：{Srv.token or "（没设）"}' + ('' if not Srv.token else f'   ← 谷雨请求头填 Authorization: Bearer {Srv.token}'))
    print(f'   工具：{len(active_tools())} 个' + ('（含发短信/打电话）' if a.danger else '（发短信/打电话没开，要的话加 --danger）'))
    print('   这个窗口别关；按 Ctrl+C 停')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
