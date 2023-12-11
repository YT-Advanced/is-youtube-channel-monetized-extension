
var monetized = (type) => `<div style='font-size:13px; margin-top:7px; color: #4CBB17;'>${type} is monetized</div>`;
var notMonetized = (type) => `<div style='font-size:13px; margin-top:7px; color: #c54949;'>${type} is not monetized</div>`;
var loadingMonetizationStatus = () => `<div style='font-size:13px; margin-top:5px; color: #FFFF00;'>Loading monetization data...</div>`;
var failedToLoad = () => `<div style='font-size:13px; margin-top:5px; color: #c54949;'>Failed to gather monetization data! Please report this.</div>`;

var currentURL = window.location.href.split("&")[0].split("#")[0]

window.onload = function () {
  if (!checkForValidURL(window.location.href)) return;

  const urlType = getURLType(window.location.href);

  let element = urlType == 'channel' ? '#channel-tagline' : '#owner-sub-count';
  waitForElement(element).then(() => {
      return getDataOnFirstLoad(urlType);
  });
};

setInterval(async () => {
  let newURL = window.location.href.split("&")[0].split("#")[0];
  if (currentURL == newURL) return;
  if (!checkForValidURL(newURL)) return;
  currentURL = newURL;

  const urlType = getURLType(newURL);
  
  let addedElement = document.querySelector(getElementType(urlType));
  let element = urlType == 'channel' ? '#channel-tagline' : '#owner-sub-count';

  if (!addedElement) {
    waitForElement(element).then(() => {
      return document.querySelector(urlType == 'channel' ? '#channel-tagline' : 'h1.style-scope.ytd-watch-metadata').insertAdjacentHTML('beforebegin', `<div class='${urlType == 'channel' ? "channelMonetization" : "videoMonetization"}'>${loadingMonetizationStatus()}</div>`)
    });
  } else {
    addedElement.innerHTML = loadingMonetizationStatus();
  }

  try {
    let isMonetized = false;
    if (urlType === 'channel') {
      // Function to delay execution
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

      // Check if URL contains '@' and retry 5 times with 500 ms interval
      let urlContainsAt = currentURL.includes('@');
      for (let attempt = 0; attempt < 5 && !urlContainsAt; attempt++) {
        await delay(500); // Wait for 500 ms
        currentURL = window.location.href.split("&")[0].split("#")[0]; // Update current URL
        urlContainsAt = currentURL.includes('@');
      }
      isMonetized = await fetchAndCheckMonetization(urlType);
    } else {
      let response = await fetch(currentURL);
      let htmlText = await response.text();

      // Check for the yt_ad tag
      if (htmlText.includes(`[{"key":"yt_ad","value":"`)) {
          isMonetized = htmlText.split(`[{"key":"yt_ad","value":"`)[1].split(`"},`)[0] == '1' ? true : false;
      }
    }
    const element = await waitForElement('.channelMonetization');
    if (element) {
      element.innerHTML = isMonetized ? monetized(capitalizeFirstLetter(urlType)) : notMonetized(capitalizeFirstLetter(urlType));
    }
  } catch (e) {

    console.error(`[Is YouTube Channel Monetized?] An error occured while attempting to fetch data from YouTube\n${e}`);

    const element = await waitForElement(getElementType(urlType));
    if (!element) return;

    return element.innerHTML = failedToLoad();
  }

}, 1000)

async function fetchAndCheckMonetization(urlType) {
  // Check Join Button availability
  if (document.getElementById("sponsor-button").childElementCount !== 0) return true;

  let videoUrls = await getFeaturedVideoUrls(); // Fetch multiple URLs

  if (!videoUrls || videoUrls.length === 0) {
    //console.log('No video URLs found.');
    return false;
  }

  try {
    let validMonetizedVideos = 0;
    for (const videoUrl of videoUrls) {
      let response = await fetch(videoUrl);
      let htmlText = await response.text();

      // Check if the video is categorized under "Music"
      if (htmlText.includes(`"header":{"richListHeaderRenderer":{"title":{"simpleText":"Music"}`)) {
        //console.log(`Video [${videoUrl}] is categorized under 'Music' and will be skipped.`);
        continue;
      }

      // Check for the yt_ad tag
      if (htmlText.includes(`[{"key":"yt_ad","value":"`)) {
          //console.log(`Video [${videoUrl}] passes the yt_ad test.`);
          if (htmlText.split(`[{"key":"yt_ad","value":"`)[1].split(`"},`)[0] == '1') validMonetizedVideos++;
      }
  }

    return validMonetizedVideos > 0;
  } catch (error) {
    console.error('Error checking monetization:', error);
    return false;
  }
}


// Function to handle the delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractChannelBaseUrl(url) {
  // Regular expression to match both username and channel ID formats
  // and ignore any additional path components
  const regex = /^(https:\/\/www\.youtube\.com\/(?:@[\w.-]+|channel\/[\w-]+))\/?(?:[\/\w-]*)?/;
  const match = url.match(regex);
  return match ? match[1] : null;
}


async function fetchAndExtractThreeRandomVideoIds(url) {
  //console.log('Extracting video ids from url:');
  //console.log(url);
  try {
    let response = await fetch(url);
    let htmlText = await response.text();

    // Extract and check subscriber count
    const subCountRegex = /"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([\d.]+)([MK]?) subscribers/;
    const subMatch = subCountRegex.exec(htmlText);
    if (subMatch && subMatch[1]) {
      let subscriberCount = parseFloat(subMatch[1].replace(',', '.'));
      let multiplier = subMatch[2];
      if (multiplier === 'K') {
        subscriberCount *= 1000;
      } else if (multiplier === 'M') {
        subscriberCount *= 1000000;
      }
      //console.log('Subscriber count:', subscriberCount);
      if (subscriberCount < 500) {
        return false;
      }
    }

    // Manually parse the HTML to find the lengthText object
    let lengths = [];
    let start = 0;
    while ((start = htmlText.indexOf('"lengthText":{', start)) !== -1) {
      let count = 1;
      let end = start + 13;
      while (end < htmlText.length && count > 0) {
        if (htmlText[end] === '{') {
          count++;
        } else if (htmlText[end] === '}') {
          count--;
        }
        end++;
      }
      const lengthTextStr = htmlText.substring(start, end);
      const simpleTextMatch = /"simpleText":"([^"]+)"/.exec(lengthTextStr);
      if (simpleTextMatch) {
        lengths.push(simpleTextMatch[1]);
      }
      start = end;
    }
    //console.log('Video Lengths:', lengths);
    
    // Extract video IDs
    const idRegex = /"watchEndpoint":\{"videoId":"([^"]+)"/g;
    let ids = [];
    let idMatch;
    while ((idMatch = idRegex.exec(htmlText)) !== null) {
      ids.push(idMatch[1]);
    }
    //console.log('Video IDs:', ids);
    
    // Pair lengths and video IDs, and filter for videos longer than 4 minutes
    let longVideos = [];
    for (let i = 0; i < lengths.length; i++) {
      if (isVideoLongerThan4Minutes(lengths[i]) && ids[i]) {
        longVideos.push(`https://www.youtube.com/watch?v=${ids[i]}`);
      }
    }

    // Randomly select up to three videos from the list
    let selectedVideos = [];
    for (let i = 0; i < Math.min(3, longVideos.length); i++) {
      let index = Math.floor(Math.random() * longVideos.length);
      selectedVideos.push(longVideos.splice(index, 1)[0]);
    }
    //console.log('Selected Videos:', selectedVideos);
    return selectedVideos;
  } catch (error) {
    console.error('Error fetching or parsing HTML:', error);
  }

  return null;
}

function isVideoLongerThan4Minutes(lengthText) {
  const [minutes, seconds] = lengthText.split(':')
    .map(Number);
  return minutes > 4 || (minutes === 4 && seconds > 0);
}

async function getFeaturedVideoUrls() {
  const base_url = extractChannelBaseUrl(currentURL);
  const video_page_url = base_url + "/videos";
  //console.log(video_page_url);
  
  try {
    let videoUrls = await fetchAndExtractThreeRandomVideoIds(video_page_url);
    //console.log(videoUrls);
    return videoUrls;
  } catch (error) {
    console.error('Error in getFeaturedVideoUrls:', error);
    return [];
  }
}