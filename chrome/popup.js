// Copyright 2021 ETH, Ovgu
'use strict';


const headline = document.getElementById('headline');
const toggleRunning = document.getElementById('toggleRunning');
const checkboxRunning = document.getElementById('checkboxRunning');
const lineRunning = document.getElementById("lineRunning");
const scionmode = document.getElementById("scionmode");
const mainDomain = document.getElementById("maindomain");
const pathUsageContainer = document.getElementById("path-usage-container");

var perSiteStrictMode = {};
var popupMainDomain;

function humanFileSize(bytes, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + ' ' + units[u];
}

const newPathUsageChild = (pathUsage, index) => {
  // This is at the moment just for presentation purposes and needs to be
  // rewritten in the end...
  const isds = new Set(pathUsage.Path.split(" -> ").map(v => v.split("-")[0]));
  const isdMap = {
    19: "EU",
    17: "CH",
    16: "AWS",
    18: "US",
    21: "JP",
    22: "TW",
    25: "CN",
    20: "KR",
    26: "KREONET"
  }
  const flagMap = {
    "EU": "images/european-union.png",
    "CH": "images/switzerland.png",
    "AWS": "images/amazon.png",
    "US" :"images/united-states.png",
    "JP": "images/japan.png",
    "TW": "images/taiwan.png",
    "CN": "images/china.png",
    "KR": "images/south-korea.png",
    "KREONET": "",
  }


  return (
    `<div class="ac-sub">
      <input class="ac-input" id="ac-${index}" name="ac-${index}" type="checkbox" />
      <label class="ac-label" for="ac-${index}">${pathUsage.Domain}</label>
      <article class="ac-sub-text">
        <p><b>Strategy:</b> ${pathUsage.Strategy}</p>
        <p><b>Usage:</b> ${humanFileSize(pathUsage.Received)}</p>
        <p><b>ISDs:</b> </p>
        <div class="flag-container">
        ${[...isds].map(isd => `<div class="flag">
                                <img src=${flagMap[isdMap[isd]]}>
                                <div class="description">
                                  <p>(${isdMap[isd]})</p>
                                </div>
                              </div>
                                `).join("")}
        </div>
       
        <div class="ac-sub">
          <input class="ac-input" id="ac-${index}-path" name="ac-${index}-path" type="checkbox" />
          <label class="ac-label" for="ac-${index}-path"><b>Path:</b></label>
          <article class="ac-sub-text">
           <p>${pathUsage.Path}</p>
          </article >
        </div >
      </article >
    </div > `
  )
}

const updatePathUsage = () => {
  pathUsageContainer.innerHTML = "";
  fetch("http://localhost:8888/pathUsage", {
    method: "GET"
  }).then(response => {

    if (response.status === 200) {
      response.json().then(res => {
        const startIndex = 2; // The first indices are already used the parent container
        res.forEach((pathUsage, i) => {
          pathUsageContainer.innerHTML += newPathUsageChild(pathUsage, i + startIndex);
        })
      });
    }
  });


};


window.onload = function () {

  // Update Forwarding badge depending on storage settings
  getStorageValue('forwarding_enabled').then(isForwardingEnabled => {
    if (isForwardingEnabled) {
      headline.innerText = "Active"
      headline.className = "inline-block rounded-full text-white bg-green-500 px-2 py-1 text-xs font-bold mr-3";
    } else {
      headline.innerText = "Inactive"
      headline.className = "inline-block rounded-full text-white bg-red-500 px-2 py-1 text-xs font-bold mr-3";
    }
  });

  // Load extension running value and remove other settings in case its not running
  getStorageValue('extension_running').then((val) => {
    toggleRunning.checked = false;// val;
    if (!val) {
      headline.innerText = "Inactive"
      headline.className = "inline-block rounded-full text-white bg-red-500 px-2 py-1 text-xs font-bold mr-3";
    }
  });

  updatePathUsage();
}

// Start/Stop global forwarding
function toggleExtensionRunning() {

  toggleRunning.checked = !toggleRunning.checked;
  const newPerSiteStrictMode = {
    ...perSiteStrictMode,
    [popupMainDomain]: toggleRunning.checked,
  };

  if (toggleRunning.checked) {
    mainDomain.innerHTML = "SCION preference for " + popupMainDomain;
    toggleRunning.classList.remove("halfchecked");
    lineRunning.style.backgroundColor = "#48bb78";
    scionmode.innerHTML = "Strict";
  } else {
    mainDomain.innerHTML = "SCION preference for " + popupMainDomain;
    toggleRunning.classList.add("halfchecked");
    lineRunning.style.backgroundColor = "#cccccc";
    scionmode.innerHTML = "When available";
  }

  saveStorageValue('perSiteStrictMode', newPerSiteStrictMode).then(() => {
    perSiteStrictMode = newPerSiteStrictMode;
  });

}
checkboxRunning.onclick = toggleExtensionRunning;


function displayHostList(hostList) {
  if (!hostList) {
    return;
  }
  document.getElementById('output').innerHTML = ""
  for (var i = 0; i < hostList.length; i++) {
    document.getElementById('output')
      .innerHTML += '<label class="inline-flex items-center mt-3"> <input type="checkbox" id=hostname-' + i + ' class="form-checkbox h-4 w-4 text-gray-600"><span class="ml-2 text-gray-700">' + hostList[i] + '</span> </label>';
  }
}

function addHost(host) {
  return getStorageValue('list').then(toSet).then(hostSet => {
    hostSet.add(host);
    saveStorageValue('list', [...hostSet]).then(() => {
      console.log('Added host: ' + host);
    })
    return hostSet;
  });
}

function deleteHosts(hostlist) {
  return getStorageValue('list').then(toSet).then(hostSet => {
    for (const hostname of hostlist) {
      hostSet.delete(hostname);
    }
    saveStorageValue('list', [...hostSet]).then(() => {
      console.log('Deleted hosts: ' + hostlist);
    })
    return hostSet;
  });
}

document.getElementById("setPolicyButton")
    .addEventListener('click', function () {
      const sequence = document.getElementById('sequenceTextBox').value;

      var req = new XMLHttpRequest();
      req.open("PUT", "http://localhost:8888/setPolicy", true);
      req.setRequestHeader('Content-type', 'application/json; charset=utf-8');
      req.onreadystatechange = function () {
        if (req.readyState == 4) {
          console.log("Response code to setSequencePolicy:" + req.status);
        }
      };
      req.send(JSON.stringify(sequence));
    });

var getRequestsDatabaseAdapter;
async function loadRequestInfo() {
  const databaseAdapter = await getRequestsDatabaseAdapter();


  const domainList = document.getElementById("domainlist");
  const checkedDomains = [];
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    var activeTab = tabs[0];
    var activeTabId = activeTab.id; // or do whatever you need
    const url = new URL(activeTab.url);
    popupMainDomain = url.hostname;
    let requests = await databaseAdapter.get({ mainDomain: url.hostname }, true);
    const mainDomainSCIONEnabled = requests.find(r => r.tabId === activeTabId && r.domain === url.hostname && r.scionEnabled);
    const scionsupport = document.getElementById("scionsupport");

    if (perSiteStrictMode[url.hostname]) {
      mainDomain.innerHTML = "SCION preference for " + url.hostname;
      toggleRunning.checked = true; // true
      toggleRunning.classList.remove("halfchecked");
      lineRunning.style.backgroundColor = "#48bb78";
      scionmode.innerHTML = "Strict";
    } else if (mainDomainSCIONEnabled) {
      mainDomain.innerHTML = "SCION preference for " + url.hostname;
      toggleRunning.checked = false; // true
      toggleRunning.classList.add("halfchecked");
      lineRunning.style.backgroundColor = "#cccccc";
      scionmode.innerHTML = "When available";
    } else {
      const scionModePreference = document.getElementById('scionModePreference');
      scionModePreference.style.display = "none";
    }// TODO: Else case would be no SCION... toggleRunning.checked = false;
    requests = requests.filter(r => r.tabId === activeTabId);
    console.log(requests);
    let mixedContent = false;
    for (let i = requests.length - 1; i >= 0; i--) {
      const r = requests[i];
      if (!checkedDomains.find(d => d === r.domain)) {
        checkedDomains.push(r.domain);
        let p = document.createElement("p");
        p.style.fontSize = "14px"
        if (r.scionEnabled) {
          p.innerHTML = "<span>&#x2705;</span> " + r.domain;
        } else {
          mixedContent = true;
          p.innerHTML = "<span>&#x274C;</span> " + r.domain;
        }

        domainList.appendChild(p);
      }
    }
    requests.forEach(r => {
      if (!checkedDomains.find(d => d === r.domain)) {
        checkedDomains.push(r.domain);
        const sEnabled = requests.find(r2 => r.domain === r2.domain && r2.scionEnabled);
        let p = document.createElement("p");
        p.style.fontSize = "14px"
        if (sEnabled) {
          p.innerHTML = "<span>&#x2705;</span> " + r.domain;
        } else {
          mixedContent = true;
          p.innerHTML = "<span>&#x274C;</span> " + r.domain;
        }

        domainList.appendChild(p);
      }
    });
    if (mainDomainSCIONEnabled) {
      if (mixedContent) {
        scionsupport.innerHTML = "Not all resources loaded via SCION";
      } else {
        scionsupport.innerHTML = "All resources loaded via SCION";
      }
    } else {
      scionsupport.innerHTML = "No resourced loaded via SCION";
    }
  });

}



// TODO: if there are some race conditions, add a startup
// function that is called manually after all scripts are loaded
// Let's later move to something that allows using imports and
// maybe even typescript, e.g. https://github.com/abhijithvijayan/web-extension-starter
(() => {
  const src = chrome.extension.getURL('database.js');
  import(src).then(req => {
    getRequestsDatabaseAdapter = req.getRequestsDatabaseAdapter;
    getStorageValue('perSiteStrictMode').then((val) => {
      perSiteStrictMode = val || {};
      loadRequestInfo();
    });

  })

})();

document.getElementById('button-options')
  .addEventListener('click', function () {
    chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
  });