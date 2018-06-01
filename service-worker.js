let staticCacheName = 'headline-feed-v1';
let contentImagesCache = 'headline-news-images';
let allCaches = [
	staticCacheName,
	contentImagesCache
];

//listener for install event.fires when the browser sets up a new sw for the first time
self.addEventListener('install', function(event) {
	//event.waitUntil() signals the progress of the install. Ensures that the sw
	//will not install until the code inside waitUntil() has successfully occured.
	event.waitUntil(
		//if promise is resolved, sw becomes installed
		//else, this sw won't activate i.e won't be installed
		caches.open(staticCacheName).then(function(cache) {
			return cache.addAll([
				'/',
	  			'/index.html',
				'js/bundle.js',
				'css/style.css',
				'https://fonts.gstatic.com/s/opensans/v15/mem8YaGs126MiZpBA-UFUZ0bbck.woff2',
				'https://fonts.gstatic.com/s/cinzel/v7/8vIJ7ww63mVu7gt79mT7.woff2',
				'https://fonts.gstatic.com/s/bellefair/v3/kJExBuYY6AAuhiXUxG1N-Po3.woff2'
			]);
		})
	);
});

//after installation, activation step is fired when a new sw takes control
//Cache Management(delete) happens here
self.addEventListener('activate', function(event) {
	event.waitUntil(
		//get all the cache names that exist
		caches.keys().then(function(cacheNames) {
			//wait for the completion of all the promises
			return Promise.all(
				//filter caches that name begins with 'headline-' but isn't the name of staticCacheName
				cacheNames.filter(function(cacheName) {
					return cacheName.startsWith('headline-') &&
					   	   //cacheName != staticCacheName;         //cache names not needed anymore
					   	   !allCaches.includes(cacheName);         //delete caches not in our array of caches we care about
				}).map(function(cacheName) {
					return caches.delete(cacheName);
				})
			);
		})
	);
	//activate the service worker faster
	//return self.clients.claim();
});

//fetch event is fired every time any resource controlled by a sw is fetched
self.addEventListener('fetch', function(event) {
	let requestUrl = new URL(event.request.url);

	//if the request url has .jpg, .png, .gif or .jpeg get it from cache
	if(requestUrl.pathname.includes('.jpg') || requestUrl.pathname.includes('.png') || requestUrl.pathname.includes('.gif') || requestUrl.pathname.includes('.jpeg')) {
		//return whatever comes back from servePhoto
		event.respondWith(servePhoto(event.request));
		return;
	}

  	//respondWith hijacks our HTTP request and update them with our own magic
	//offline-first: Go to cache first, if nothing fall back to network
	event.respondWith(
		caches.match(event.request).then(function(response) {
			//if there is a match, return it. Else go to the internet/network
			if(response) return response;
			//we could also save it into the cache so that later requests for the
			//resource could be retrieved offline
			/*
			return fetch(event.request).then(function(response) {
				return caches.open(staticCacheName).then(function(cache) {
					cache.put(event.request, response.clone());
					return response;
				});
			});
			*/
			return fetch(event.request);
		})
		  //if request doesn't match anything in the cache and network isn't available, we fallback.
		.catch(function(error) {
			console.log(`Request failed:`, error);
			//custom offline 404 page could be returned here.
		})
	);
});

function servePhoto(request) {
  //create a storage url
  let storageUrl = request.url;

  //return images from the cache if they're there, otherwise, return images from
  //the network and put them into the cache.
  return caches.open(contentImagesCache).then(function(cache) {
	return cache.match(storageUrl).then(function(response) {
		if(response) return response;

		return fetch(request).then(function(networkResponse) {
			cache.put(storageUrl, networkResponse.clone());
			return networkResponse;
		});
	});
});
}

//listen for message from a page to signal new sw ready
//don't queue behind a sw, take over.
self.addEventListener('message', function(event) {
	if(event.data.message === 'skipWaiting') {
		self.skipWaiting();
	}
});