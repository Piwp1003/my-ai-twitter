// 这个 Service Worker 本身不做离线缓存之类的事，唯一目的是：
// 让手机浏览器（尤其是安卓 Chrome）能用 registration.showNotification() 弹系统通知栏提醒。
// 安卓 Chrome 出于规范限制，禁止网页直接用 new Notification() 弹通知（会直接报错），
// 必须通过一个已注册、已激活的 Service Worker 来发通知，这个文件就是干这个用的。

self.addEventListener('install', () => {
    self.skipWaiting(); // 装上就立刻生效，不用等页面刷新
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
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
