// Copyright 2021 ETH Ovgu

'use strict';

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

function loadHostList(){
  var req = new XMLHttpRequest();
  req.open("GET", "http://localhost:8888/scion-host", true);
  req.onreadystatechange = function() {
      if (req.readyState == 4) {
        if (req.status == 200) {
          const resp = req.responseText;
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
        }
      }
    };
  req.send();
}

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
  req.open("PUT", "http://localhost:8888/setISDPolicy", true);
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
    updatePACScript(changes.list.newValue);
    checkPACconfig();
  }
  // In case we disable running for the extension, lets put an empty set for now
  // Later, we could remove the PAC script, but doesn't impact us now...
  else if (namespace == 'sync' && changes.extension_running?.newValue !== undefined){
    if(changes.extension_running.newValue) {
      getStorageValue('list').then(toSet).then(hostSet => {
        updatePACScript(hostSet);
        checkPACconfig();
      });
    } else {
        updatePACScript(new Set());
        checkPACconfig();
    }
    updateRunningIcon(changes.extension_running.newValue);
  }
  else if (namespace == 'sync' && changes.isd_whitelist?.newValue){
    geofence(changes.isd_whitelist.newValue);
  }
})

loadHostList();

// Displays a green/blue SCION icon depending on the current url is
// being forwarded via SCION
function handleTabChange(tab) {
  // check if the browser extension is running before doing anything
  getStorageValue('extension_running').then(extensionRunning => {
    if(extensionRunning) {
      // Active tab needs to check if we have scion_forwarding enabled or not
      if (tab.active && tab.url) {
        const { hostname } = new URL(tab.url);
        getStorageValue('list').then(toSet).then(hostSet => {
          if (hostSet.has(hostname)) {
            saveStorageValue('forwarding_enabled', true);
            chrome.browserAction.setIcon({path: "/images/scion-38_enabled.jpg"});
          } else {
            saveStorageValue('forwarding_enabled', false);
            chrome.browserAction.setIcon({path: "/images/scion-38.jpg"});
          }
        });
      }
    }
  });

}

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