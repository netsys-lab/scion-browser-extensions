'use strict';

window.onload = chrome.storage.sync.get(['list'], function(result) {
  let hostList = result.list;
  displayHostList(hostList);
})

document.getElementById('button-write-hostname')
            .addEventListener('click', function() {
              let hostname = document.getElementById("input-hostname").value
              document.getElementById("input-hostname").value = ""
              addHost(hostname).then(hostSet=>{
                displayHostList([...hostSet]);
              });
            });




document.getElementById('button-delete-hostname')
            .addEventListener('click', function() {
              let hostCheckBoxes = document.getElementById("output").children
              let hostList = new Array()
              for (var i = 0; i < hostCheckBoxes.length; i++){
                if (hostCheckBoxes[i].getElementsByTagName("input")[0].checked){
                  let hostname = hostCheckBoxes[i].outerText;
                  hostList.push(hostname);
                }
              }
              deleteHosts(hostList).then(hostSet=>{
                displayHostList([...hostSet]);
              });
            });

function displayHostList(hostList){
  document.getElementById('output').innerHTML = ""
  for(var i=0; i < hostList.length; i++){
    document.getElementById('output')
          .innerHTML+= '<div><input type="checkbox" id=hostname-' + i + '>'+  hostList[i] + ' </input></div>';
  }
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
  return getSyncHosts().then(hostSet => {
    hostSet.add(host);
    chrome.storage.sync.set({'list': [...hostSet]}, function() {
      console.log('Added host: ' + host);
    });
    return hostSet;
  });
}

function deleteHosts(hostlist){
  return getSyncHosts().then(hostSet => {
    for (const hostname of hostlist){
      hostSet.delete(hostname);
    }
    chrome.storage.sync.set({'list': [...hostSet]}, function() {
      console.log('Deleted hosts: ' + hostlist);
    });
    return hostSet;
  });
}