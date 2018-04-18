let staticCacheName = 'headline-feed-v1';

//listener for install event.fires when the browser sets up a new sw for the first time
self.addEventListener('install', function(event) {
	//cache urls
	let urlsToCache = [
	  '/',
	  '/index.html',
	  '/js/app.js',
	  '/css/style.css'
	];

	//signal the progress of the install
	event.waitUntil(
		//if promise is resolved, continue, else, this service worker should be discarded
		caches.open(staticCacheName).then(function(cache) {
			return cache.addAll(urlsToCache);
		})
	);
});

//activate is fired when sw starts up
self.addEventListener('activate', function(event) {
	event.waitUntil(
		//get all the cache names that exist
		caches.keys().then(function(cacheNames) {
			//wait for the completion of all the promises
			return Promise.all(
				//filter caches that name begin with 'headline-' but isn't the name of staticCacheName
				cacheNames.filter(function(cacheName) {
					return cacheName.startsWith('headline-') &&
					   	   cacheName != staticCacheName;         //cache names not needed anymore
				}).map(function(cacheName) {
					return caches.delete(cacheName);
				})
			);
		})
	);
});

self.addEventListener('fetch', function(event) {
	//respondWith stops the browser from going to the network(prevent default). handle it ourselves.
	event.respondWith(
		caches.match(event.request).then(function(response) {
			//if there is a match, return it. Else go to the internet
			if(response) return response;
			return fetch(event.request);
		})
	);
});