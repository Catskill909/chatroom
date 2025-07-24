// Service Worker to proxy Safari audio streams
// This makes the stream appear same-origin to Safari, bypassing CORS redirect issues

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Intercept requests to /stream/* and proxy them to the backend
  if (url.pathname.startsWith('/stream/')) {
    const streamId = url.pathname.replace('/stream/', '');
    const backendUrl = `http://localhost:3000/stream/${streamId}?_ic2=1`;
    
    // In production, use the same origin
    const targetUrl = url.hostname === 'localhost' || url.hostname === '127.0.0.1' 
      ? backendUrl 
      : `${url.origin}/stream/${streamId}?_ic2=1`;
    
    event.respondWith(
      fetch(targetUrl, {
        method: event.request.method,
        headers: event.request.headers,
        body: event.request.body,
        mode: 'cors'
      }).catch(error => {
        console.error('Service Worker fetch error:', error);
        return new Response('Stream proxy error', { status: 500 });
      })
    );
  }
});

self.addEventListener('install', (event) => {
  console.log('Safari stream proxy Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Safari stream proxy Service Worker activated');
  event.waitUntil(self.clients.claim());
});
