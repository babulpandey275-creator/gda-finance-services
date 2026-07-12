// ==========================================
// 🚀 GDA FINANCE - NETWORK-FIRST SERVICE WORKER CORE (v3)
// ==========================================

const CACHE_NAME = "gda-finance-v3";

// Core application files to store in local mobile memory for offline performance
const urlsToCache = [
    "./",
    "./index.html",
    "./customer-list.html",
    "./register.html",
    "./edit.html",
    "./collection.html",
    "./due-customers.html",
    "./history.html",
    "./report.html",
    "./statement.html",
    "./disbursement-bond.html",
    "./expense-manager.html",
    "./firebase.js",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];

// 1. Install Event: Caching essential application assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// 2. Activate Event: Flushing out old operational caches dynamically
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Fetch Event: 🚀 Network-First Strategy to ensure immediate code deployment visibility
self.addEventListener("fetch", (event) => {
    // Intercept only secure local GET transaction requests
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Synchronize and update local cache if internet network is working optimally
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Serve cached local resources as fallback fallback if network connectivity drops out
                return caches.match(event.request);
            })
    );
});
