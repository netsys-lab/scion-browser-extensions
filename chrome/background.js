// Copyright 2021 ETH Ovgu
'use strict';

/** Background State */
let globalStrictMode = false;
let perSiteStrictMode = {
  // "www.scionlab.org": true,
};
let knownNonSCION = {

};

let knownSCION = {

};

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

getStorageValue('perSiteStrictMode').then((val) => {
  perSiteStrictMode = val || {}; // Here we may get undefined which is bad
});

getStorageValue('globalStrictMode').then((val) => {
  globalStrictMode = !!val;
});

/* PAC configuration */
var config = {
  mode: "pac_script",
  pacScript: {
    data: "function FindProxyForURL(url, host) {\n" +
      "    return 'PROXY localhost:8888';\n" +
      "}",
  }
};
chrome.proxy.settings.set(
  { value: config, scope: 'regular' },
  function () { });

function geofence(isdList) {
  let whiteArray = new Array()
  for (const isd of isdList) {
    whiteArray.push("+ " + isd);
  }
  whiteArray.push("-")

  var req = new XMLHttpRequest();
  req.open("PUT", "http://localhost:8888/setPolicy", true);
  req.setRequestHeader('Content-type', 'application/json; charset=utf-8');
  req.onreadystatechange = function () {
    if (req.readyState == 4) {
      console.log("Response code to setISDPolicy:" + req.status);
    }
  };
  req.send(JSON.stringify(whiteArray));
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  // In case we disable running for the extension, lets put an empty set for now
  // Later, we could remove the PAC script, but doesn't impact us now...
  if (namespace == 'sync' && changes.extension_running?.newValue !== undefined) {
    updateRunningIcon(changes.extension_running.newValue);
  }
  else if (namespace == 'sync' && changes.isd_whitelist?.newValue) {
    geofence(changes.isd_whitelist.newValue);
  } else if (namespace == 'sync' && changes.perSiteStrictMode?.newValue !== undefined) {
    perSiteStrictMode = changes.perSiteStrictMode?.newValue;
  } else if (namespace == 'sync' && changes.globalStrictMode?.newValue !== undefined) {
    globalStrictMode = changes.globalStrictMode?.newValue;
  }


})

// Displays a green/blue SCION icon depending on the current url is
// being forwarded via SCION
async function handleTabChange(tab) {

  if (tab.active && tab.url) {
    const url = new URL(tab.url);
    const databaseAdapter = await getRequestsDatabaseAdapter();
    let requests = await databaseAdapter.get({ mainDomain: url.hostname });
    var mixedContent;

    const mainDomainSCIONEnabled = requests.find(r => r.tabId === tab.id && r.domain === url.hostname && r.scionEnabled);
    requests.forEach(r => {
      if (!r.scionEnabled) {
        mixedContent = true;
      }
    });
    if (mainDomainSCIONEnabled) {
      if (mixedContent) {
        chrome.browserAction.setIcon({ path: "/images/scion-38_mixed.jpg" });
      } else {
        chrome.browserAction.setIcon({ path: "/images/scion-38_enabled.jpg" });
      }
    } else {
      chrome.browserAction.setIcon({ path: "/images/scion-38_not_available.jpg" });
    }
  }
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
  if (extensionRunning) {
    chrome.browserAction.setIcon({ path: "/images/scion-38.jpg" });
  } else {
    chrome.browserAction.setIcon({ path: "/images/scion-38_disabled.jpg" });
  }
}

// Do icon setup etc at startup
getStorageValue('extension_running').then(extensionRunning => {
  updateRunningIcon(extensionRunning);
});

// User switches between tabs
chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    handleTabChange(tab);
  });
});


/* Request intercepting */
chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequest, { urls: ["<all_urls>"] }, ['blocking']);

chrome.webRequest.onBeforeRedirect.addListener(
  onBeforeRedirect, { urls: ["<all_urls>"] });

chrome.webRequest.onErrorOccurred.addListener(
  onErrorOccurred, { urls: ["<all_urls>"] });

function onBeforeRequest(requestInfo) {

  const url = new URL(requestInfo.url);

  // Skip all weird requests...
  if (url.hostname == "localhost") {
    return {}
  }

  if (requestInfo.url.startsWith("chrome-extension")) {
    return {};
  }

  if (requestInfo.initiator && requestInfo.initiator.startsWith("chrome-extension")) {
    return {};
  }

  console.log("request" + JSON.stringify(requestInfo.url));

  const requestDBEntry = {
    requestId: requestInfo.requestId,
    tabId: requestInfo.tabId,
    domain: url.hostname,
    mainDomain: requestInfo.initiator ? new URL(requestInfo.initiator).hostname : '',
  };

  getRequestsDatabaseAdapter().then(databaseAdapter => {
    // If we don't have any information about scion-enabled or not
    if (!knownNonSCION[url.hostname] && !knownSCION[url.hostname]) {
      // We can't do this in the onBeforeRedirect/onErrorOccured
      // Because these things are only done in strict mode
      // So we would loose all information for domains that are not in 
      // (global) strict mode
      fetch("http://localhost:8888/resolve?host=" + url.hostname, {
        method: "GET"
      }).then(response => {

        if (response.status === 200) {
          response.text().then(res => {
            if (res != "") {
              requestDBEntry.scionEnabled = true;
            }
            databaseAdapter.add(requestDBEntry, {
              mainDomain: requestDBEntry.mainDomain,
              scionEnabled: requestDBEntry.scionEnabled,
              domain: requestDBEntry.domain,
            });
          });
        }
      }).catch((e) => {
        console.warn("Resolution failed");
        console.error(e);
      });
    } else {
      requestDBEntry.scionEnabled = !!knownSCION[url.hostname];
      databaseAdapter.add(requestDBEntry);

    }
  });

  let checkDomain = url.hostname;
  if (requestInfo.initiator) {
    const mainDomain = new URL(requestInfo.initiator);
    checkDomain = mainDomain.hostname;
  }

  // Check document for strict mode
  if (globalStrictMode || perSiteStrictMode[checkDomain]) {
    if (knownNonSCION[url.hostname]) {
      return { cancel: true };
    } else if (knownSCION[url.hostname]) {
      return {};
    } else {
      return { redirectUrl: "http://localhost:8888/r?url=" + requestInfo.url };
    }
  }

  return {};
}



// Skip returns a valid redirect response, meaning there is SCION enabled 
// and we can do this request again
function onBeforeRedirect(details) {
  if (details.redirectUrl && details.url.startsWith("http://localhost:8888/r")) {
    const url = new URL(details.redirectUrl);
    knownSCION[url.hostname] = true;
  }
}

// Skip throws an error in the redirect-or-error handler: No SCION support
// For the domain
function onErrorOccurred(details) {
  console.log("Error: ", details.error);
  if (details.error === "net::ERR_TUNNEL_CONNECTION_FAILED") {
    chrome.tabs.update(details.tabId, { url: "http://localhost:8888/error?url="+details.url });
  }

  if (details.url.startsWith("http://localhost:8888/r")) {
    const url = new URL(details.url);
    // The actual URL that we need is in ?url=$url
    const target = url.search.split("=")[1];
    const targetUrl = new URL(target);
    knownNonSCION[targetUrl.hostname] = true;
  }
}

function printAllFields(obj) {
  for (let field in obj) {
      if (typeof obj[field] === "object") {
          // If the field is an object, print its fields recursively
          console.log(`${field}:`);
          printAllFields(obj[field]);
      } else {
          // If the field is a primitive type, print its value
          console.log(`${field}: ${obj[field]}`);
      }
  }
}
