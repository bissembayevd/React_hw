function runServiceWorker(BUILD_VERSION, PRECACHE) {
  const shellName = `taskspace-assign7-shell-${BUILD_VERSION}`;
  const staticName = `taskspace-assign7-static-${BUILD_VERSION}`;
  const publicName = "taskspace-assign7-public-v1";
  const base = new URL(self.registration.scope);
  const fallback = new URL("offline.html", base);
  const index = new URL("index.html", base);
  const shellUrls = new Set(PRECACHE.map((path) => new URL(path, base).href));
  const activeCaches = new Set([shellName, staticName, publicName]);
  const writes = new Map();

  self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(shellName).then((cache) =>
      cache.addAll([...shellUrls].map((url) => new Request(url, { cache: "reload" }))),
    ));
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) =>
        name.startsWith("taskspace-assign7-") && !activeCaches.has(name),
      ).map((name) => caches.delete(name)));
      await self.clients.claim();
    })());
  });

  self.addEventListener("message", (event) => {
    if (event.data === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
  });

  function remember(name, cache, request, response, limit) {
    const previous = writes.get(name) || Promise.resolve();
    const pending = previous.catch(() => {}).then(async () => {
      await cache.delete(request);
      await cache.put(request, response);
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - limit))
        .map((key) => cache.delete(key)));
    });
    writes.set(name, pending);
    return pending;
  }

  async function publicData(request) {
    const cache = await caches.open(publicName);
    try {
      const response = await fetch(request, { cache: "no-store" });
      if (response.ok && response.type === "cors" &&
          new URL(response.url).origin === "https://dummyjson.com" &&
          response.headers.get("Content-Type")?.includes("application/json")) {
        await remember(publicName, cache, request, response.clone(), 80).catch(() => {});
      }
      if (response.status < 500) return response;
    } catch {
      if (request.signal.aborted) return Response.error();
    }
    const saved = await cache.match(request);
    if (!saved) return Response.json({ message: "No saved data is available." }, { status: 503, headers: { "X-TaskSpace-Cache": "miss" } });
    return new Response(saved.body, {
      headers: { "Content-Type": "application/json", "X-TaskSpace-Cache": "hit" },
    });
  }

  async function staticAsset(request) {
    const cache = await caches.open(staticName);
    const saved = await cache.match(request);
    if (saved) return saved;
    const response = await fetch(request);
    if (response.ok) {
      await remember(staticName, cache, request, response.clone(), 40).catch(() => {});
    }
    return response;
  }

  async function navigate(request, url) {
    const cache = await caches.open(shellName);
    if (url.pathname === base.pathname || url.pathname === index.pathname) {
      const app = await cache.match(index);
      if (app) return app;
    }
    try {
      const response = await fetch(request);
      if (response.ok) return response;
    } catch {
      if (request.signal.aborted) return Response.error();
    }
    return (await cache.match(fallback)) || Response.error();
  }

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin === "https://dummyjson.com" &&
        request.credentials === "omit" && !request.headers.has("Authorization") &&
        ((/^\/(todos|users)$/.test(url.pathname) && url.search === "?limit=0") ||
         (/^\/(todos|users)\/[1-9]\d*$/.test(url.pathname) && !url.search))) {
      event.respondWith(publicData(request));
      return;
    }
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
    if (request.mode === "navigate") {
      event.respondWith(navigate(request, url));
    } else if (shellUrls.has(url.href)) {
      event.respondWith(caches.open(shellName).then(async (cache) =>
        (await cache.match(request)) || fetch(request),
      ));
    } else if (["image", "font"].includes(request.destination) && !url.search) {
      event.respondWith(staticAsset(request));
    }
  });
}
export default runServiceWorker;
