// Read-only OneBot HTTP preflight for the local SnowLuma QQ client.
import { pathToFileURL } from 'node:url';

async function probeQQ({ port = '3000', token = '', request = fetch } = {}) {
    if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
        return 'QQ_ONEBOT_PORT 需要填写有效端口号。';
    }
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const call = async action => {
        const response = await request('http://127.0.0.1:' + port + '/' + action, {
            method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(3500)
        });
        if ([401, 403].includes(response.status)) throw Error('本机桥接拒绝访问，请核对本地 QQ_ONEBOT_TOKEN。');
        if (!response.ok) throw Error('本机桥接返回 HTTP ' + response.status + '。');
        const reply = await response.json().catch(() => null);
        if (reply?.status !== 'ok' || reply.retcode !== 0 || !reply.data) {
            throw Error('端口可达，但没有取得有效的 OneBot 接口响应。');
        }
        return reply.data;
    };
    try {
        const status = await call('get_status');
        if (status.online !== true || status.good === false) return '桥接已连接，QQ 尚未报告在线就绪。';
        const account = await call('get_login_info');
        if (!/^[1-9]\d*$/.test(String(account.user_id))) return 'QQ 尚未返回有效的登录账号。';
        return { accountId: String(account.user_id) };
    } catch (e) {
        if (e.cause?.code === 'ECONNREFUSED') return '本机端口没有服务监听，请启动 QQ 和 SnowLuma，核对 OneBot HTTP 端口。';
        if (e.name === 'TimeoutError') return '本机桥接响应超时。';
        if (e instanceof TypeError) return '无法连接本机 OneBot HTTP 服务。';
        return e.message;
    }
}

export async function checkQQ(options) {
    const result = await probeQQ(options);
    return typeof result === 'string' ? result : '在线';
}

export async function checkQQPair(first, second) {
    const results = await Promise.all([probeQQ(first), probeQQ(second)]);
    if (results.some(item => typeof item === 'string')) {
        return results.map((item, i) => '角色 ' + (i + 1) + '：' + (typeof item === 'string' ? item : '在线')).join('\n');
    }
    if (results[0].accountId === results[1].accountId) return '两个连接登录了同一 QQ 号，请核对账号。';
    return '两个独立 QQ 号在线';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const first = { port: process.env.QQ_ONEBOT_PORT, token: process.env.QQ_ONEBOT_TOKEN };
    const paired = process.argv.includes('--pair');
    const result = paired
        ? await checkQQPair(first, { port: process.env.QQ_SECOND_ONEBOT_PORT || '3002', token: process.env.QQ_SECOND_ONEBOT_TOKEN })
        : await checkQQ(first);
    console.log(result);
    process.exitCode = result === (paired ? '两个独立 QQ 号在线' : '在线') ? 0 : 1;
}
