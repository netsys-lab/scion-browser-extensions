// Copyright 2021 ETH Ovgu

'use strict';


function saveStorageValue(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({[key]: value}, function() {
      resolve();
    });
  });
}

function getStorageValue(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([key], function(result) {
      resolve(result[key]);
    });
  });
}

function toSet(key) {
    return new Promise(resolve => {
      resolve(new Set(key));
    });
}

function loadHostList(){
  fetch("http://localhost:8888/scionHosts", {
    mode: "no-cors",
  }).then(response => {
    if(response.status === 200) {
      response.text().then(resp => {
        const hostList = resp.split('\n');
          getStorageValue('list').then(toSet).then(hostSet => {
            for (const host of hostList){
              hostSet.add(host);
            }
            chrome.storage.sync.set({'list': [...hostSet]}, function() {
              console.log('Hosts from proxy:\n' + hostList);
              updatePACScript([...hostSet]);
              checkPACconfig();
            });
          });
      })
    }
  }).catch(e => {
    console.warn("Failed to fetch host list");
    console.error(e);
  })
}

function geofence(isdList){
  let whiteArray = new Array()
  for (const isd of isdList){
    whiteArray.push("+ " + isd);
  }
  whiteArray.push("-")

  fetch("http://localhost:8888/setPolicy", {
    method: "PUT",
    body: JSON.stringify(whiteArray),
    mode: "no-cors",
    headers: {
      'Content-type': 'application/json; charset=utf-8'
    }
  }).then(() => {
    console.log("Geofence successful")
  }).catch((e) => {
    console.warn("Geofence failed")
    console.error(e);
  })
}

async function handleProxifiedRequest(requestInfo) {
  // The following blocks potentially dangerous requests for privacy that come without a tabId
  console.log("request" + requestInfo.tabId)

  if(requestInfo.tabId === -1) {
    return {};
  }

  const tab = await browser.tabs.get(requestInfo.tabId);
  console.log(tab.cookieStoreId);

  // TODO: should check whether tab.cookieStoreId == SCION
  // At the moment we assume we only use either default or SCION
  if (tab.cookieStoreId != "firefox-default"){
    return {type: "http", host: "localhost", port: 8888};

  }
  return {type: "direct"};
}

chrome.storage.onChanged.addListener((changes, namespace) =>{
  if (namespace == 'sync' && changes.isd_whitelist?.newValue){
    geofence(changes.isd_whitelist.newValue);
  }
})

async function createContainer() {
  let scionContainers = await browser.contextualIdentities.query({
    name: "SCION"
  });
  if (!scionContainers){
    let identity = await browser.contextualIdentities.create({name: "SCION",
                                                    color: "blue",
                                                    icon: "fence"}
    );
    saveStorageValue('SCION-container', identity).then(() => {
      console.log(identity.cookieStoreId);
    })
  }
  else{
    saveStorageValue('SCION-container', scionContainers[0]).then(() => {
      console.log(scionContainers[0]);
    })
  }
}

// Changes icon depending on the extension is running or not
function updateRunningIcon(extensionRunning) {
  if(extensionRunning) {
    chrome.action.setIcon({path: "/images/scion-38.jpg"});
  } else {
    chrome.action.setIcon({path: "/images/scion-38_disabled.jpg"});
  }
}

console.log(browser.proxy);

if (browser.proxy) {
  browser.proxy.onRequest.addListener(handleProxifiedRequest, {urls: ["<all_urls>"]});
}

chrome.runtime.onInstalled.addListener(() => {
  // Do icon setup etc at startup
  getStorageValue('extension_running').then(extensionRunning => {
    // TODO: Fix
    // updateRunningIcon(extensionRunning);
  });
  createContainer();
  loadHostList();
});