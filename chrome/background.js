// Copyright 2021 ETH

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
          const hostSet = new Set(resp.split('\n'));
          chrome.storage.sync.set({'list': [...hostSet]}, function() {
            console.log('Storing the host list:\n' + [...hostSet]);
          });
        }
      }
    };
  req.send();
}

function loadHostList(){
  var req = new XMLHttpRequest();
  req.open("GET", "http://localhost:8888/scion-host", true);
  req.onreadystatechange = function() {
      if (req.readyState == 4) {
        if (req.status == 200) {
          const resp = req.responseText;
          const hostList = resp.split('\n');
          getSyncHosts().then(hostSet => {
            for (const host of hostList){
              hostSet.add(host);
            }
            chrome.storage.sync.set({'list': [...hostSet]}, function() {
              console.log('Hosts from proxy:\n' + hostList);
            });
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

function updatePACScript(hostList){
  // Receive message from popup.js when adding or removing hostname

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

chrome.storage.onChanged.addListener((changes, namespace) =>{
  if (namespace == 'sync' && changes.list?.newValue){
    updatePACScript(changes.list.newValue);
    checkPACconfig();
  }
})

getSyncHosts().then(hostSet => {
  console.log('Stored host list:\n' + [...hostSet]);
  return hostSet;}).then(hostSet => {
    updatePACScript([...hostSet]);
    checkPACconfig();
  });
loadHostList();


