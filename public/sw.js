const CACHE = "easybudget-v3";
const SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Don't intercept anything we can't safely replay.
  if (e.request.method !== "GET") return;                  // POSTs (form actions) — let the browser handle
  if (e.request.mode === "navigate") return;               // page navigations + auth redirects
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;         // cross-origin requests (AI Gateway, etc.)
  if (url.pathname.startsWith("/_next/")) return;          // Next.js dev/runtime assets
  if (url.pathname.startsWith("/api/"))   return;          // route handlers (avatar, receipts) — never cache
  if (url.search.includes("_rsc"))        return;          // React Server Component payloads

  e.respondWith(
    caches
      .match(e.request)
      .then((cached) => cached || fetch(e.request))
      .catch(() => new Response("", { status: 504, statusText: "Network error" })),
  );
});
