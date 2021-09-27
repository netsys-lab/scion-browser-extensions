// Copyright 2021 ETH

'use strict';

/**
 * This is the starting point to insert the existing PAC script of the current implementation
 */
var config = {
  mode: "pac_script",
  pacScript: {
    // data: " const scionHosts = new Set([" +
    //   "'scionlab.org'," +
    //   "'www.scionlab.org'," +
    //   "'www.scion-architecture.net'," +
    //   " ])\n" +
    //       "function FindProxyForURL(url, host) {\n" +
    //           "if(scionHosts.has(host)) {\n" +
    //       "    return 'PROXY localhost:8888';\n" +
    //         "}\n" +
    //         "return 'DIRECT';\n" +
    //       "}"
    url: "http://localhost:8888/skip.pac"
  }
};

chrome.proxy.settings.set(
    {value: config, scope: 'regular'},
    function() {});

// Double check if the script is set correctly
chrome.proxy.settings.get(
  {'incognito': false},
  function(config) {console.log(JSON.stringify(config));});

function loadHostList(){
  var req = new XMLHttpRequest();
  req.open("GET", "http://localhost:8888/scion-host", true);
  req.onreadystatechange = function() {
      if (req.readyState == 4) {
        if (req.status == 200) {
          const resp = req.responseText;
          const hostSet = new Set(resp.split('\n'));
          chrome.storage.sync.set({'list': [...hostSet]}, function() {
            console.log('Storing the host list:\n' + [...hostSet]);
          });
        }
      }
    };
  req.send();
}

function getSyncHosts() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['list'], function(result) {
      const hostSet = new Set(result.list)
      resolve(hostSet);
    });
  });
}

function addHost(host){
  getSyncHosts().then(hostSet => {
    hostSet.add(host);
    chrome.storage.sync.set({'list': [...hostSet]}, function() {
      console.log('Added host to:\n' + [...hostSet]);
    });
  });
}

//loadHostList();
getSyncHosts().then(hostSet => console.log('Stored host list:\n' + [...hostSet] ));
addHost("example.scion.net");

