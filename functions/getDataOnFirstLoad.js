async function getDataOnFirstLoad(urlType) {
    if (urlType !== 'channel') return;
    document.querySelector("#channel-tagline").insertAdjacentHTML('beforebegin', `<div class='channelMonetization'>${loadingMonetizationStatus()}</div>`); 
  
    let isMonetized = await fetchAndCheckMonetization(urlType);
    return document.querySelector(".channelMonetization").innerHTML = isMonetized == 'true' ? monetized("Channel") : notMonetized("Channel");
}
