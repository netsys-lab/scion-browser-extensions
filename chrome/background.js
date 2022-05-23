// Copyright 2021 ETH Ovgu

'use strict';

// This is a bit hacky but probably easier than wrapping everything
// in a bunder step
const imports = [
  'database.js'
];

var getRequestsDatabaseAdapter;

// TODO: if there are some race conditions, add a startup
// function that is called manually after all scripts are loaded
// Let's later move to something that allows using imports and
// maybe even typescript, e.g. https://github.com/abhijithvijayan/web-extension-starter
(async () => {
    const src = chrome.extension.getURL('database.js');
    const req = await import(src);
    getRequestsDatabaseAdapter = req.getRequestsDatabaseAdapter;
})();
// contentScript.main(/* chrome: no need to pass it */);

/**
 * This is the starting point to insert the existing PAC script of the current implementation
 */
var PACpreamble = " const scionHosts = new Set([\n"
var PACtemplate =
  " ])\n" +
      "function FindProxyForURL(url, host) {\n" +
          "if(scionHosts.has(host)) {\n" +
      "    return 'PROXY localhost:8888';\n" +
        "}\n" +
        "return 'DIRECT';\n" +
      "}"

var config = {
  mode: "pac_script",
  pacScript: {
    data: "function FindProxyForURL(url, host) {\n" +
    "    return 'PROXY localhost:8888';\n" +
    "}",
  }
};
chrome.proxy.settings.set(
  {value: config, scope: 'regular'},
  function() {});

checkPACconfig();

function updatePACScript(hostList){

  // Transform list to string
  let stringList = ""
  for (const hostname of hostList){
    stringList += "'"+ hostname + "',\n";
  }

  //PACpreamble + hosts concatenated with, + PACtemplate
  var config = {
    mode: "pac_script",
    pacScript: {
      data: PACpreamble + stringList + PACtemplate,
    }
  };
  chrome.proxy.settings.set(
    {value: config, scope: 'regular'},
    function() {});
}
// Double check if the script is set correctly
function checkPACconfig(){
  chrome.proxy.settings.get(
    {'incognito': false},
    function(config) {console.log(JSON.stringify(config));});
}

function geofence(isdList){
  let whiteArray = new Array()
  for (const isd of isdList){
    whiteArray.push("+ " + isd);
  }
  whiteArray.push("-")

  var req = new XMLHttpRequest();
  req.open("PUT", "http://localhost:8888/setPolicy", true);
  req.setRequestHeader('Content-type','application/json; charset=utf-8');
  req.onreadystatechange = function() {
      if (req.readyState == 4) {
        console.log("Response code to setISDPolicy:" + req.status);
      }
  };
  req.send(JSON.stringify(whiteArray));
}

chrome.storage.onChanged.addListener((changes, namespace) =>{
  if (namespace == 'sync' && changes.list?.newValue){
    //updatePACScript(changes.list.newValue);
    // checkPACconfig();
  }
  // In case we disable running for the extension, lets put an empty set for now
  // Later, we could remove the PAC script, but doesn't impact us now...
  else if (namespace == 'sync' && changes.extension_running?.newValue !== undefined){
    if(changes.extension_running.newValue) {
      getStorageValue('list').then(toSet).then(hostSet => {
        // updatePACScript(hostSet);
        // checkPACconfig();
      });
    } else {
        // updatePACScript(new Set());
        // checkPACconfig();
    }
    updateRunningIcon(changes.extension_running.newValue);
  }
  else if (namespace == 'sync' && changes.isd_whitelist?.newValue){
    geofence(changes.isd_whitelist.newValue);
  }
})

// Displays a green/blue SCION icon depending on the current url is
// being forwarded via SCION
async function handleTabChange(tab) {
  // check if the browser extension is running before doing anything
  // getStorageValue('extension_running').then(extensionRunning => {
  //  if(extensionRunning) {
      // Active tab needs to check if we have scion_forwarding enabled or not

      if (tab.active && tab.url) {
        const url = new URL(tab.url);
        const databaseAdapter = await getRequestsDatabaseAdapter();
        let requests = await databaseAdapter.get({mainDomain: url.hostname});
        var mixedContent;

        const mainDomainSCIONEnabled = requests.find(r => r.tabId === tab.id && r.domain === url.hostname && r.scionEnabled);
        requests.forEach(r => {
          if(!r.scionEnabled) {
              mixedContent = true;
          }
        });
        if(mainDomainSCIONEnabled) {
          if(mixedContent) {
            chrome.browserAction.setIcon({path: "/images/scion-38_mixed.jpg"});
          } else {
            chrome.browserAction.setIcon({path: "/images/scion-38_enabled.jpg"});
          }
        } else {
          chrome.browserAction.setIcon({path: "/images/scion-38_not_available.jpg"});
        }
      }
    //  }
    // }
  // });
}

chrome.tabs.onUpdated.addListener(function
  (tabId, changeInfo, tab) {
    // read changeInfo data and do something with it (like read the url)
    if (changeInfo.url) {
      handleTabChange(tab);

    }
  }
);

// Update icons and forwarding_enabled field depending on hostname of
// current active tab
chrome.tabs.onUpdated.addListener(function
  (tabId, changeInfo, tab) {
    // Url change in active tab
    handleTabChange(tab);
  }
);

// Changes icon depending on the extension is running or not
function updateRunningIcon(extensionRunning) {
  if(extensionRunning) {
    chrome.browserAction.setIcon({path: "/images/scion-38.jpg"});
  } else {
    chrome.browserAction.setIcon({path: "/images/scion-38_disabled.jpg"});
  }
}

// Do icon setup etc at startup
getStorageValue('extension_running').then(extensionRunning => {
  updateRunningIcon(extensionRunning);
});

// User switches between tabs
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    handleTabChange(tab);
  });
});


chrome.webRequest.onBeforeRequest.addListener(
  handleProxifiedRequest, {urls: ["<all_urls>"]}, ['blocking']);

function handleProxifiedRequest(requestInfo) {
  console.log("request" + JSON.stringify(requestInfo));

  let url = new URL(requestInfo.url);

  if (url.hostname == "localhost"){
    return {}
  }

  if(requestInfo.url.indexOf("chrome-extension") >= 0) {
    return {}
  }

  if(requestInfo.initiator.indexOf("chrome-extension") >= 0) {
    return {}
  }

  const requestDBEntry = {
    requestId: requestInfo.requestId,
    tabId: requestInfo.tabId,
    domain: url.hostname,
    mainDomain: new URL(requestInfo.initiator).hostname,
  };


  fetch("http://localhost:8888/resolve?host="+url.hostname, {
    method: "GET"
  }).then(response => {
     // TODO: If we move to e.g. IndexedDB, ensure not to open
    // a new connection here...
    console.warn("TEST");
    getRequestsDatabaseAdapter().then(databaseAdapter => {
      if(response.status === 200) {
        response.text().then(res =>{
          if (res != ""){
            requestDBEntry.scionEnabled = true;
            console.log(res)
            addHost(url.hostname)
          }
        });
      }
      databaseAdapter.add(requestDBEntry);

      });
  }).catch((e) => {
    debugger;
    console.warn("Resolution failed")
  })

  return{}
}

function addHost(host){
  return getStorageValue('list').then(toSet).then(hostSet => {
    hostSet.add(host);
    saveStorageValue('list', [...hostSet]).then(() => {
      console.log('Added host: ' + host);
    })
    return hostSet;
  });
}