// 这个 Service Worker 干两件事：
// 1）系统通知：安卓 Chrome 出于规范限制，禁止网页直接用 new Notification() 弹通知（会直接报错），
//    必须通过一个已注册、已激活的 Service Worker 用 registration.showNotification() 才行。
// 2）PWA 离线缓存：把首页/样式/所有js模块/图标这些"核心文件"缓存下来，断网或者信号不好的时候
//    依然能打开app、看到聊天记录等本地数据（这些数据本身存在 IndexedDB/localForage 里，跟这个SW缓存是两回事，
//    SW缓存缓存的只是"页面骨架代码"）。AI API请求、CDN上的第三方脚本这些不归这个SW管，该怎么样还怎么样。

// ⚠️ 以后改了 index.html / style.css / js/*.js 这些核心文件后，记得把下面这个版本号 +1，
// 不然有些用户的浏览器可能会因为命中旧版本的离线缓存，长期看不到最新更新内容。
const CACHE_VERSION = 'v108';

const CACHE_NAME = `guyu-app-cache-${CACHE_VERSION}`;

// ⚠️ 这份清单必须和 index.html 里实际 <script src> / <link href> 的路径**逐字一致**
// （包括 ./ 前缀和 ?v=108 这种查询参数），因为预缓存是按URL字符串存的，差一个字符就命中不了。
// 加了新的 js 模块 / 第三方库之后，记得同步加到这里，否则离线时那个模块会加载失败。
const CORE_ASSETS = [
    './',
    './index.html',
    './style.css?v=108',   // ⚠️ 跟 index.html 里的 ?v= 必须完全一致，改一处就要改两处
    './pwa-manifest.json', // 注意是 pwa-manifest.json，不是 manifest.json（后者是HBuilderX打包APK用的应用配置，见index.html开头的注释）
    './icons/icon-192.png',
    './icons/icon-512.png',
    // 第三方库：localforage 是整个App的本地存储底座，没缓存到的话离线直接打不开，务必保留
    './js/vendor/localforage.min.js?v=108',
    './js/vendor/mammoth.browser.min.js?v=108',
    './js/vendor/ejs.min.js?v=108',
    // 角色卡前端页面（开场白菜单/状态栏）里用到 $ 的那些，会由 js/03 往 iframe 里挂这个 <script src>；
    // 不预缓存的话离线时那些卡片会报 "$ is not defined" 整张卡死掉
    './js/vendor/jquery.min.js?v=108',
    './js/01-core-state-infra.js?v=108',
    './js/02-databank-plugins-minigames.js?v=108',
    './js/03-markdown-feed-tags.js?v=108',
    './js/04-mobile-bootstrap-notifications.js?v=108',
    './js/05-anniversary-memory.js?v=108',
    './js/06-emoticons-time-humanfeel-relationships-worldbook.js?v=108',
    './js/07-proactive-cloudsync.js?v=108',
    './js/08-diary-novel.js?v=108',
    './js/09-memories-search-postfixes.js?v=108',
    './js/10-comments-npc-forum-reply.js?v=108',
    './js/11-tabloid-story-forum-engine.js?v=108',
    './js/12-worldbook-import-appexport.js?v=108',
    './js/13-charreply-groupchat-faction-cardimport.js?v=108',
    './js/14-settings-archive.js?v=108',
    './js/15-ai-presets.js?v=108',
    './js/16-story-studio.js?v=108',
    './js/17-tavern-bridge.js?v=108',
    './js/18-minigames-board-cards.js?v=108',
    './js/19-minigames-party.js?v=108',
    './js/20-reading-together.js?v=108',
    './js/21-watch-together.js?v=108',
    './js/22-box-music.js?v=108',
    './js/23-box-map.js?v=108',
    './js/24-box-relations.js?v=108',
    './js/25-box-life.js?v=108',
    './js/26-box-mall.js?v=108',
    './js/27-feature-pages.js?v=108',
    './js/28-invite-in-chat.js?v=108',
    './js/29-web-explore.js?v=108'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // 装上就立刻生效，不用等页面刷新
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // 逐个缓存而不是一次性 cache.addAll()：addAll 是"全部成功才算数"，
            // 万一某一个文件当时网络抖动没抓到，会导致整批预缓存全部失败。
            // 逐个来的话，单个文件失败只影响它自己，不连累其它文件正常缓存。
            // ⚠️ 关键修复：cache.add(url) 内部用的是默认缓存模式的 fetch，如果浏览器自己的HTTP磁盘缓存里
            // 已经存过这个文件的旧版本（本地用 python -m http.server 这类不带 Cache-Control 头的服务器时
            // 特别容易发生——浏览器会按启发式规则自己决定缓存多久），这里就会把那份"过期已久"的旧内容
            // 存进这一版全新的 CACHE_NAME 里，导致版本号已经升级、但实际缓存内容还是老的，改了代码也看不到效果。
            // 显式指定 {cache:'reload'} 强制这次预缓存请求跳过HTTP缓存、直接问网络要最新内容，才能保证版本号一升级、
            // 缓存内容必然也是最新的。
            return Promise.all(CORE_ASSETS.map((url) =>
                fetch(url, { cache: 'reload' })
                    .then((res) => { if (res && res.ok) return cache.put(url, res); })
                    .catch((err) => console.warn('[SW] 预缓存失败（不影响其它文件）：', url, err))
            ));
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

// 缓存策略：stale-while-revalidate —— 有缓存就先用缓存立刻显示（快），同时偷偷去网络上拿最新版本存回缓存，
// 下次打开就是新的了；网络请求失败（真的离线）也完全不影响这次能正常看到（用的是缓存兜底）。
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return; // POST（比如发给AI的API请求）完全不拦截，原样走网络
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // 跨域请求（AI API中转、CDN脚本等）不拦截，避免影响这些动态/第三方请求

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(req);
            // 同样强制跳过HTTP磁盘缓存：这是后台"偷偷去网络上拿最新版本"的那一步，如果这里还是命中HTTP缓存的
            // 旧内容，缓存就永远刷新不到真正的最新版本，跟install阶段是同一个坑。
            const networkFetchPromise = fetch(new Request(req, { cache: 'reload' })).then((res) => {
                if (res && res.ok) cache.put(req, res.clone());
                return res;
            }).catch(() => null);

            if (cached) {
                networkFetchPromise; // 不等它，后台悄悄更新缓存
                return cached;
            }
            const netRes = await networkFetchPromise;
            if (netRes) return netRes;
            // 网络也失败、又没有对应缓存：如果是"打开页面"这种导航请求，退回缓存过的首页兜底，
            // 至少能看到app本身（本地数据仍然在，不会丢），而不是白屏/浏览器报错页
            if (req.mode === 'navigate') {
                const fallback = await cache.match('./index.html');
                if (fallback) return fallback;
            }
            return new Response('当前离线，且没有可用的缓存内容。', { status: 503, statusText: 'Offline' });
        })
    );
});

// 用户点击系统通知时，尝试把已经打开的页面聚焦到前台；没有已打开的页面就新开一个
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow('./');
        })
    );
});
