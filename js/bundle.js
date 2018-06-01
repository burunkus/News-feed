(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
let idb = require('idb');

const API_KEY = '';
const REVERSE_GEO_API_KEY = '';

let app = {};

let dbPromise = openDb();

//keep record of the previous search.
let lastCountry;
let lastSource;

//variables referenced through out the app
let main = document.querySelector('main');
let country = document.querySelector('.current-country');
let source = document.querySelector('.current-source');
let countryBtn = document.getElementById('country-btn');
let sourceBtn = document.getElementById('source-btn');

//prevent source and country buttons from doing the default action i.e submit
document.getElementById('country-btn').addEventListener('click', function(e) {
	e.preventDefault();
});
document.getElementById('source-btn').addEventListener('click', function(e) {
	e.preventDefault();
});

app.detectUserLocation = function() {
  //check if geolocation is available on the users browser
  if(!navigator.geolocation) {
  	window.alert('your browser does not support geolocation service');
  	return;
  }

  function geoSuccess(position) {
  	app.getUserCurrentCountry(position.coords.latitude, position.coords.longitude);
  }

  function geoError(error) {
  	window.alert(error.message + ': ' + 'This app uses your location to personalize your content. Please allow access');
  	return;
  }
  navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
};

//get the country of the user to enable customized news headline
//based on the users location initially
app.getUserCurrentCountry = function(lat, lng) {

  //get user country using reverse geolocation
  let locationUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=country&key=${REVERSE_GEO_API_KEY}`;

  //fetch the url over the network, if ok, format the response to json. then use data
  //returned from the response.
  fetch(locationUrl).then(function(response) {
       return response.json();
    }).then(function(country) {
      //get country short code in the short name property and convert to lowercase
      let countryShortName = country.results[0].address_components[0].short_name.toLowerCase();

      //get country full name.
      let countryFullName = country.results[0].address_components[0].long_name;

      app.initiateDefaultSetup(countryShortName, countryFullName);

    }).catch(function(error) {
    	window.alert(`Network problem or something went wrong with the fetching data`);
    });
};

app.initiateDefaultSetup = function(shortName, fullName) {
  //todo: prevent source and country button from default here
  //set user country to be the selected country in the country button
  document.querySelector('.current-country').textContent = fullName;

  //pipe the list of sources to the UI
  let sourceList = document.getElementById('source');
  let sourcesUrl = `https://newsapi.org/v2/sources?apiKey=${API_KEY}`;
  let reqs = new Request(sourcesUrl);

  //fetch all news sources
  fetch(reqs).then(function(response) {
      return response.json();
    }).then(function(data) {
    	let sources = data.sources;
    	for(let i = 0; i < sources.length; i++) {
      		let li = document.createElement('li');
      		li.dataset.sCode = sources[i].id;
      		li.textContent = sources[i].name;
      		sourceList.appendChild(li);
    	}
  	}).catch(function(error){
  		console.log(error);
  	});

  let url = `https://newsapi.org/v2/top-headlines?country=${shortName}&apiKey=${API_KEY}`;
  let req = new Request(url);

  //fetch news headlines from NEWS API
  fetch(req).then(function(response) {
  		return response.json();
	}).then(function(headlines) {
		app.storeInDb(headlines).then(function(){
			console.log('headlines saved in Indexed DB, data is now available for offline use');
		});
		app.updateDisplay(headlines);
		app.setUp();
	}).catch(function(error){    //if we can't connect to the network...
		console.log(`Network request have failed, we are offline:`, error);
		app.showCachedHeadlines().then(function(offlineData) {
			if(!offlineData.length) {
				console.log('No data recieved from the Indexed db');
			} else {
				console.log('you might be viewing an outdated content');
				app.updateDisplay(offlineData);
			}
		});
	});
};

//set up the application event listeners
app.setUp = function() {

  let searchNewsByCountryButton = document.querySelector('.country-filter');
  let searchNewsBySourceButton = document.querySelector('.source-filter');
  let countryInput = document.getElementById('country-input');
  let sourceInput = document.getElementById('source-input');
  let countryDropDown = document.getElementById('country-nav-bar').getElementsByClassName('dropdown-menu');
  let sourceDropDown = document.getElementById('source-nav-bar').getElementsByClassName('dropdown-menu');

  //keep record of the previous search.
  let lastCountry = country.innerHTML;
  let lastSource = source.innerHTML;

  //when the search country/source button is clicked, open the dropdown
  //add listener to the body element to close the menu if clicked outside
  //the menu. Remove listener after closing the menu
  countryBtn.addEventListener('click', function() {

  	for(let i = 0; i < countryDropDown.length; i++) {
  	  	countryDropDown[i].classList.add('open');
  	}
  	//when the dropdown is open, set a listener on the body element
  	document.body.addEventListener('click', closeMenus);
  });

  sourceBtn.addEventListener('click', function() {

  	for(let i = 0; i < sourceDropDown.length; i++) {
  		sourceDropDown[i].classList.add('open');
  	}
  	document.body.addEventListener('click', closeMenus);
  });

  function closeMenus(e) {
  	//if the click is outside the country and source dropdowns
  	//then get all the dropdown elements with class 'open' and remove it i.e hide it
  	if(e.target.id !== 'country-btn' && e.target.id != 'source-btn' && e.target.id !== 'country-input' && e.target.id !== 'source-input') {
  		document.body.removeEventListener('click', closeMenus);
  		let allOpenDropDowns = document.querySelectorAll('.open');
  		for(let i = 0; i < allOpenDropDowns.length; i++) {
  			allOpenDropDowns[i].classList.remove('open');
  		}
  	}
  }

  //listen for a click on the items, change the button's data-* value and
  //content to the selected country's data value and content
  let countryUl = document.getElementById('country');
  let countryItem = countryUl.getElementsByTagName('li');
  let sourceUl = document.getElementById('source');
  let sourceItem = sourceUl.getElementsByTagName('li');

  for(let i = 0; i < countryItem.length; i++) {
  		countryItem[i].addEventListener('click', function() {
  			let attributeValue, elementContent;
			elementContent = countryItem[i].innerHTML;
			attributeValue = countryItem[i].dataset.cCode;
			country.textContent = elementContent;
			countryBtn.dataset.cCode = attributeValue;
			//close dropdown after clicking
			let j = 1;
			while(j <= countryDropDown.length) {
				countryDropDown[j - 1].classList.toggle('open');
				j++;
			}
			//give it an active look
			document.querySelector('.countrynav-container').classList.add('active');
			countryBtn.classList.add('active');
  		});
  	}

	//use event delegation to attach a listener to all the child of source list
  	sourceUl.addEventListener('click', function(e) {
  		e.preventDefault();
  		if(e.target && e.target.tagName === 'LI') {
  			let attributeValue, elementContent;
  			elementContent = e.target.innerHTML;
			attributeValue = e.target.dataset.sCode;
			source.textContent = elementContent;
			sourceBtn.dataset.sCode = attributeValue;
			//close dropdown after clicking
			let j = 1;
			while(j <= sourceDropDown.length) {
				sourceDropDown[j - 1].classList.toggle('open');
				j++;
			}
			//give it an active look
			document.querySelector('.source-nav-container').classList.add('active');
			sourceBtn.classList.add('active');
  		}
  	});

  //when press on keyboard is released on search input, filter the list of countries
  //to what the user is looking up
  countryInput.addEventListener('keyup', function() {
  	let filter, i;
  	filter = countryInput.value.toUpperCase();
  	for(i = 0; i < countryItem.length; i++) {
  		//check if the inputted value is in the array of items, if true show it and hide the once not matched.
  		if(countryItem[i].innerHTML.toUpperCase().indexOf(filter) > -1) {
  			countryItem[i].style.display = '';
  		} else {
  			countryItem[i].style.display = 'none';
  		}
  	}
  });

  //when press on keyboard is released on source input, filter the list of sources
  //to what the user is looking up
  sourceInput.addEventListener('keyup', function() {
  	let filter, i;
  	filter = sourceInput.value.toUpperCase();
  	for(i = 0; i < sourceItem.length; i++) {
  		//check if the inputted value is in the array of items, if true show it and hide the once not matched.
  		if(sourceItem[i].innerHTML.toUpperCase().indexOf(filter) > -1) {
  			sourceItem[i].style.display = '';
  		} else {
  			sourceItem[i].style.display = 'none';
  		}
  	}
  });

  //when the filter button is clicked, call appropriate function to search to
  //search the type of news we want to display
  searchNewsByCountryButton.addEventListener('click', function(e) {
  	e.preventDefault();
  	app.newsByCountry();
  });
  searchNewsBySourceButton.addEventListener('click', function(e) {
  	e.preventDefault();
  	app.newsBySource();
  });
};

app.newsByCountry = function() {

	if(country.innerHTML === lastCountry) {
		return;
	} else {
	  //update the record of last country
	  lastCountry = country.innerHTML;

	  //Set the select source dropdown to 'Select Source'
	  source.innerHTML = 'select source';
	  //remove active status from source;
	  document.querySelector('.source-nav-container').classList.remove('active');
	  sourceBtn.classList.remove('active');

	  let countryCode = countryBtn.dataset.cCode;
	  let url = `https://newsapi.org/v2/top-headlines?country=${countryCode}&apiKey=${API_KEY}`;
	  let req = new Request(url);

  	  fetch(req).then(function(response) {
	    if(response.ok) {
			return response.json();
	    } else {
			console.log(`Network request for ${url} failed with response ${response.status}: ${response.statusText}`);
		}
  		}).then(function(data) {
  		  app.storeInDb(data).then(function(){
				console.log('headlines saved in Indexed DB, data is now available for offline use');
			});
		  app.updateDisplay(data);
  		}).catch(function(error){    //if we can't connect to the network...
			console.log('Network request have failed, we are offline');
			app.showCachedHeadlines().then(function(offlineData) {
			if(!offlineData.length) {
				console.log('No data recieved from the Indexed db');
			} else {
				console.log('you might be viewing an outdated content');
				app.updateDisplay(offlineData);
			}
		});
		});
	}
};

app.newsBySource = function() {

	if(source.innerHTML === lastSource) {
		return;
	} else {
	  //update the record of last source
	  lastSource = source.innerHTML;

	  //Set the select country dropdown to 'Select Country'
	  country.innerHTML = 'select country';
	  //remove active look from country
	  document.querySelector('.countrynav-container').classList.remove('active');
	  countryBtn.classList.remove('active');

	  let sourceCode = sourceBtn.dataset.sCode;
	  let url = `https://newsapi.org/v2/top-headlines?sources=${sourceCode}&apiKey=${API_KEY}`;
	  let req = new Request(url);

	  fetch(req).then(function(response) {
	    return response.json();
	  }).then(function(data) {
	  	app.storeInDb(data).then(function(){
			console.log('headlines saved in Indexed DB, data is now available for offline use');
		});
	    app.updateDisplay(data);
	  }).catch(function(error){    //if we can't connect to the network...
			console.log('Network request have failed, we are offline');
			app.showCachedHeadlines().then(function(offlineData) {
			if(!offlineData.length) {
				console.log('No data recieved from the Indexed db');
			} else {
				console.log('you might be viewing an outdated content');
				app.updateDisplay(offlineData);
			}
		});
		});
	}
};

app.updateDisplay = function(finalResult) {
	//remove previous contents(children) of the <main> element
	while(main.firstChild) {
  		main.removeChild(main.firstChild);
	}

	//if no news was found based on the search term, display a message.
	if(!finalResult) {
		let div = document.createElement('div');
	  	let para = document.createElement('p');
	  	para.textContent = 'No News to display from this search!';
	  	div.appendChild(para);
	  	main.appendChild(div);
	} else {
		if(finalResult.articles){
			for(let i = 0; i < finalResult.articles.length ; i++) {
				app.displayNews(finalResult.articles[i]);
			}
		}
		//headlines in DB will be in an array
		for(let i = 0; i < finalResult.length; i++) {
			app.displayNews(finalResult[i]);
		}


	}
};

//display news inside <main> element
app.displayNews = function(news) {
	let section = document.createElement('section');
	let imageDiv = document.createElement('div');
	let newsDiv = document.createElement('div');
	let heading = document.createElement('h3');
	let para = document.createElement('p');
	let image = document.createElement('img');
	let newsLink = document.createElement('a');
	let newsDate = document.createElement('span');

	//give the elements a classname defined in css for styling purposes.
	section.setAttribute('class', 'news-feed');
	imageDiv.setAttribute('class', 'news-image-wrapper');
	newsDiv.setAttribute('class', 'news-box');
	newsLink.setAttribute('target', '_blank');

	//give h2 textContent equal to news "title" property, but with the first character
	//replaced with the uppercase version of the first character
	heading.textContent = news.title.replace(news.title.charAt(0), news.title.charAt(0).toUpperCase());

	//give p element the description property
	para.textContent = news.description;

	//give the a element a href link of the url property
	newsLink.href = news.url;

	//get time of news
	newsDate.textContent = news.publishedAt;

	//set news image
	//image.src = objectURL;
	image.src = news.urlToImage;
	image.alt = news.title;

	//append the elements to the DOM to add the news to the UI
	main.appendChild(section);
	section.appendChild(imageDiv).appendChild(image);
	section.appendChild(newsDiv).appendChild(heading);
	section.appendChild(newsDiv).appendChild(newsLink).appendChild(para);
	section.appendChild(newsDiv).appendChild(newsDate);
};

function openDb(data) {
	if('serviceWorker' in navigator) {
	  	//create database news-24/7 and object store headlines with date('publishedAt') as primary key
	    return idb.open('news-24/7', 1, function(upgradeDb) {
	    	let newsStore = upgradeDb.createObjectStore('headlines', { keyPath: 'publishedAt' });
	    	//create an index 'by-date', that looks at the 'publishedAt' property of the stored object
	    	newsStore.createIndex('by-date', 'publishedAt');
	    });
	}
}

app.storeInDb = function(finalResult) {
	return dbPromise.then(function(db) {
		if(!db) return;
  		let tx = db.transaction('headlines', 'readwrite');
  		let store = tx.objectStore('headlines');
  		finalResult.articles.forEach(function(headline) {
    		store.put(headline);
  		});
  		//clean the database by removing the oldest post. keep the newest 20 and delete the rest
  		//null and prev makes the cursor go backwards through the index/store
  		//TO FIX: to get the last headlines from the news source or country visited when offline
  		//Delete from the beginning not after 20. this ensure that the last news viewed will be show when offline
  		store.index('by-date').openCursor(null, 'prev').then(function(cursor) {
  			return cursor.advance(20);  //advance pass the newsest 20 post.
  		}).then(function deleteRest(cursor) {  //delete post after 20
  			if(!cursor) return;                //if the post is undefined, return, else delete
  			cursor.delete();
  			return cursor.continue().then(deleteRest); //call same function to loop through the remaining entry
  		});
	});
};

app.showCachedHeadlines = function() {
	//show cached headlines if we're not showing any headlines already
	//use index to group by a particular item. in this case group by date.
    return dbPromise.then(function(db) {
      if(!db) return;
      let index = db.transaction('headlines')
        .objectStore('headlines').index('by-date');
      return index.getAll();
    }).then(function(headlines) {
        //pass the headlines for display. .reverse() ensures that we get the last, first.
        return headlines.reverse();
    });
};

//we want to only have cache of only the images currently on the page
app.cleanImageCache = function() {
	console.log('in clean image cache');
	//get all the news headlines in the news-24/7 object store
	//gather all the photo urls
	//open the headline-news-images cache, and delete any entry that is no longer needed
	let imagesNeeded = [];

	return dbPromise.then(function(db) {
		if(!db) return;
		let tx = db.transaction('headlines');
		return tx.objectStore('headlines').getAll().then(function(headlines) {
			headlines.forEach(function(headline) {
				if(headline.urlToImage) {
					//put the url of the current images in the browser in imagesNeeded
					imagesNeeded.push(headline.urlToImage);
				}
			});
			return caches.open('headline-news-images');
		}).then(function(cache) {
			return cache.keys().then(function(requests) {
				requests.forEach(function(request) {
					let url = new URL(request.url);

					//if the url of the images in the cache does not include any
					//in the images needed then delete.
					if(!imagesNeeded.includes(url.href)) {
						console.log('deleting image not on the page currently...');
						cache.delete(request);
					}
				});
			});
		});
	});
};

//Entry point. Show users news from their location by default.
app.detectUserLocation();
//app.initiateDefaultSetup('ng', 'nigeria');

//clean the image cache...
app.cleanImageCache();

//...every 5 seconds
setInterval(function() {
	app.cleanImageCache();
}, 1000 * 60 * 5);

  //SERVICE WORKER
  //for update notification
  let newWoker;
  let notification = document.querySelector('.notification');
  let refresh = document.querySelector('#refresh');
  let dismiss = document.querySelector('#dismiss');

  function trackInstalling(worker) {
  	//sw fires an event statechange whenever the value of the state property changes
  	worker.addEventListener('statechange', function() {
  		if(worker.state == 'installed') {
  			updateReady(worker);
  		}
  	});
  }

  function updateReady(worker) {
  	newWorker = worker;
  	showMessage();
  }

  function showMessage() {
  	notification.classList.add('show-notification');
  	//show the message after delaying for some seconds to allow the page to load up
  	//setTimeout(function() {
  	//notification.classList.add('show-notification');
  	//}, 8000);
  }

  function removeMessage() {
  	notification.classList.remove('show-notification');
  }

  refresh.addEventListener('click', function() {
	//send a message to the sw
	newWorker.postMessage({message: 'skipWaiting'});
	removeMessage();
  });

  dismiss.addEventListener('click', function() {
	removeMessage();
	//TODO: call showmessage to show again, after some length of time.
  });

  //To install a service worker
  //Register it in your page. This tell the brower where the service worker js file lives
  //check if service worker is supported in the users browser
  if('serviceWorker' in navigator) {
    navigator.serviceWorker
       .register('/service-worker.js')
       .then(function(reg) {

          //if there's no controller, the page wasn't loaded via a sw, it
          //was loaded from the network. so we're looking
          //at the latest version. if that's the case, exit early
          if(!navigator.serviceWorker.controller) {
          	return;
          }

          //if there's a worker waiting, there's an update ready
          if(reg.waiting) {
          	updateReady(reg.waiting);
          	return;
          }

          //if there's a worker installing, there is an update in progress
          //the object may fail, so we listen to the statechanges to track it
          //and if it reaches the install state, we tell the user about it...
          if(reg.installing) {
          	trackInstalling(reg.installing);
          	return;
          }

          //...otherwise listen for the updatefound event, when it fires
          //track the state of the installing worker and if it reaches
          //the install state, we tell the user
          reg.addEventListener('updatefound', function() {
          	trackInstalling(reg.installing);
          });

        })
        .catch(function() {
          console.log('sw registration failed');
        });

    //reload web page to activate the new sw
    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', function() {
    	if (refreshing) return;
   		window.location.reload();
    	refreshing = true;
  	});
  }
},{"idb":2}],2:[function(require,module,exports){
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  }
  else {
    self.idb = exp;
  }
}());

},{}]},{},[1]);
