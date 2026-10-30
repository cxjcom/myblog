/* 拾光小栈 Service Worker：文章与静态资源离线可读 */
"use strict";

const CACHE = "myblog-v2.1.7";
const CORE = ["", "index.html", "blog.html", "archive.html", "about.html", "album.html", "music.html", "shelf.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  /* 页面：网络优先，失败回退缓存（保证内容新鲜，离线可读） */
  /* 资料数据：网络优先，同步后立即可见 */
  if (url.pathname.startsWith("/data/")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  if (e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === location.pathname) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((m) => m || caches.match("index.html")))
    );
    return;
  }
  /* 静态资源：缓存优先 + 后台刷新（stale-while-revalidate），避免旧缓存长期滞留 */
  e.respondWith(
    caches.match(e.request).then((m) => {
      const fresh = fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => m);
      return m || fresh;
    })
  );
});
