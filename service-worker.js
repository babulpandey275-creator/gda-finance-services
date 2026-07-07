// हर बार नया अपडेट लाइव करने के लिए v2 को v3 या नया नाम दे सकते हैं
const CACHE_NAME = "gda-finance-v3"; 
const urlsToCache = [ 
  "./", 
  "./index.html", 
  "./style.css", 
  "./firebase.js", 
  "./manifest.json", 
  "./icon-192.png", 
  "./icon-512.png" 
]; 

// 1. Install Event (फाइलें कैश में सेव करना)
self.addEventListener("install", (event) => { 
  event.waitUntil( 
    caches.open(CACHE_NAME).then((cache) => { 
      return cache.addAll(urlsToCache); 
    }) 
  ); 
  self.skipWaiting(); 
}); 

// 2. Activate Event (पुराने कैश को डिलीट करना)
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

// 3. Fetch Event (🚀 नेटवर्क-फर्स्ट रणनीति - ताकि नया कोड तुरंत दिखे)
self.addEventListener("fetch", (event) => {
  // सिर्फ अपनी साइट की फाइलों या सामान्य गेट रिक्वेस्ट को ट्रैक करें
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // अगर इंटरनेट सही चल रहा है, तो नई फाइल को कैश में अपडेट करें और यूजर को दिखाएं
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // अगर इंटरनेट बंद है (ऑफलाइन), सिर्फ तभी मोबाइल मेमोरी (Cache) से पुरानी फाइल खोलें
        return caches.match(event.request);
      })
  );
});
