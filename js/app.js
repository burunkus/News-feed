const API_KEY = '';
const REVERSE_GEO_API_KEY = '';

//store the news
let news;

//headline from any country of choice
let country;

//headline from a specific source
let source;

let userLat;

let userLng;

//check if geolocation is available on the users browser
if(!navigator.geolocation) {
  window.alert('your browser does not support geolocation service');
}

function geoSuccess(position) {
  getUserCurrentCountry(position.coords.latitude, position.coords.longitude);
}

function geoError(error) {
  window.alert(error.message + ': ' + 'This app uses your location to personalize your content. Please allow access');
}

navigator.geolocation.getCurrentPosition(geoSuccess, geoError);

//get the country of the user to enable customized news headline
//based on the users location initially
function getUserCurrentCountry(lat, lng) {

  //get user country using reverse geolocation
  let locationUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=country&key=${REVERSE_GEO_API_KEY}`;

  //fetch the url over the network, if ok, format the response to json. then get the data
  //returned from the response.
  fetch(locationUrl)
   .then(function(response) {
     if(response.ok) {
       return response.json();
      } else {
        window.alert('Geocoder failed due to: ' + response.status);
      }
    })
    .then(function(country) {
      //get country short code in the short name property and convert to lowercase
      let countryShortName = country.results[0].address_components[0].short_name.toLowerCase();
      //get country full name.
      let countryFullName = country.results[0].address_components[0].long_name;
      initiateDefaultSetup(countryShortName, countryFullName);
    });
}

function initiateDefaultSetup(shortName, fullName) {

  //set user country to be the selected country in the country button
  document.querySelector('.current-country').textContent = fullName;

  let url = `https://newsapi.org/v2/top-headlines?country=${shortName}&apiKey=${API_KEY}`;

  let req = new Request(url);

  //fetch news headlines from NEWS API
  fetch(req)
	  .then(function(response) {
		  if(response.ok) {
			  return response.json();
		  } else {
			  console.log(`Network Request for to newapi.org failed with error type ${response.code}: ${response.message}`);
		    }
	    })
	  .then(function(headlines) {
	  	//set received data to equal news, then call setUp
		news = headlines;
		setUp();
	});

  //pipe the list of sources to the UI
  let sourceList = document.getElementById('source');
  let sourcesUrl = `https://newsapi.org/v2/sources?apiKey=${API_KEY}`;
  let reqs = new Request(sourcesUrl);

  fetch(reqs)
  .then(function(response) {
    if(response.ok) {
      return response.json();
    } else {
      console.log(`Network request for ${url} failed with response ${response.status}: ${response.statusText}`);
    }
  })
  .then(function(data) {
    let sources = data.sources;
    for(let i = 0; i < sources.length; i++) {
      let li = document.createElement('li');
      li.dataset.sCode = sources[i].id;
      li.textContent = sources[i].name;
      sourceList.appendChild(li);
    }
  });
}

//set up the application
function setUp() {
  let country = document.querySelector('.current-country');
  let source = document.querySelector('.current-source');
  let searchNewsByCountryButton = document.querySelector('.country-filter');
  let searchNewsBySourceButton = document.querySelector('.source-filter');
  let main = document.querySelector('main');
  let countryBtn = document.getElementById('country-btn');
  let sourceBtn = document.getElementById('source-btn');
  let countryInput = document.getElementById('country-input');
  let sourceInput = document.getElementById('source-input');
  let countryDropDown = document.getElementById('country-nav-bar').getElementsByClassName('dropdown-menu');
  let sourceDropDown = document.getElementById('source-nav-bar').getElementsByClassName('dropdown-menu');

  //keep record of the previous search.
  let lastCountry = country.innerHTML;
  let lastSource = source.innerHTML;

  //finalResult will contain the results that need to be displayed after search has been done
  //Each will be an array containing objects, each object will represent a news
  let finalResult;

  //set finalResult to equal all retrieved news, then call updateDisplay() so all news will be displayed initially
  finalResult = news;
  updateDisplay();

  //when the search country/source button is clicked, open the dropdown
  countryBtn.addEventListener('click', function(e) {
  	e.preventDefault();
  	for(let i = 0; i < countryDropDown.length; i++) {
  	  	countryDropDown[i].classList.toggle('open');
  }});

  sourceBtn.addEventListener('click', function(e) {
  	e.preventDefault();
  	for(let i = 0; i < sourceDropDown.length; i++) {
  		sourceDropDown[i].classList.toggle('open');
  }});

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

  //when the filter button is clicked, call selectNews() to run a search to
  //select the type of news we want to display
  searchNewsByCountryButton.onclick = newsByCountry;
  searchNewsBySourceButton.onclick = newsBySource;

  function newsByCountry(e) {
  	//stop the form performing its default action- submitting
  	e.preventDefault();

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

	  	fetch(req)
	  		.then(function(response) {
	    		if(response.ok) {
	      			return response.json();
	    		} else {
	      			console.log(`Network request for ${url} failed with response ${response.status}: ${response.statusText}`);
	    		}
	  		})
	  		.then(function(data) {
	    		finalResult = data;
	    		updateDisplay();
	  		});
  	}
  }

  function newsBySource(e) {
  	//stop the form performing its default action- submitting
  	e.preventDefault();

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

	  fetch(req)
	  .then(function(response) {
	    if(response.ok) {
	      return response.json();
	    } else {
	      console.log(`Network request for ${url} failed with response ${response.status}: ${response.statusText}`);
	    }
	  })
	  .then(function(data) {
	    finalResult = data;
	    updateDisplay();
	  });
  	}
  }

  function updateDisplay() {
  	//remove previous contents(children) of the <main> element
  	while(main.firstChild) {
      main.removeChild(main.firstChild);
  	}

  	//if no news was found based on the search term, display a message.
  	if(finalResult.length === 0) {
  		let div = document.createElement('div');
  	  	let para = document.createElement('p');
  	  	para.textContent = 'No News to display from this search!';
  	  	div.appendChild(para);
  	  	main.appendChild(div);
  	//for each news in the array, pass its object to fetchBlob() to get the image if any.
  	} else {
  		for(let i = 0; i < finalResult.articles.length; i++) {
  			fetchBlob(finalResult.articles[i]);
  		}
  	}
  }

  //fetch the image url, then send the image url and the news object for display
  function fetchBlob(news) {
  	var url = news.urlToImage;

  	//fetch the image and convert resulting response to a blob- data that isn't necessarily in a JS-native format.
  	fetch(url)
  		.then(function(response) {
  			if(response.ok) {
  				return response.blob();
  			} else {
  				console.log(`Network Request for ${news.source.name} news image failed with ${response.code}: ${response.message}`);
  			}
  		})
  		.then(function(blob) {
			//convert the blob to an object URL
			objectURL = URL.createObjectURL(blob);
			//call displayNews
			displayNews(objectURL, news);
  		});
  }

  //display news inside <main> element
  function displayNews(objectURL, news) {
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
    image.src = objectURL;
    image.alt = news.title;

    //append the elements to the DOM to add the news to the UI
    main.appendChild(section);
    section.appendChild(imageDiv).appendChild(image);
    section.appendChild(newsDiv).appendChild(heading);
    section.appendChild(newsDiv).appendChild(newsLink).appendChild(para);
    section.appendChild(newsDiv).appendChild(newsDate);
  }
}