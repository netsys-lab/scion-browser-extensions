// Copyright 2021 ETH, Ovgu
'use strict';

let headline = document.getElementById('headline');
let toggleRunning = document.getElementById('toggleRunning');
let checkboxRunning = document.getElementById('checkboxRunning');

window.onload = function () {

  // Update host list in popup
  getStorageValue('list').then((hostSet) => {
    if(!hostSet) {
      hostSet = [
        "www.scionlab.org",
        "www.scionlab.chat",
        "www.scion-pathguess.game"
      ];
      saveStorageValue('list', [...hostSet]).then(() => {
        console.log('Initialized hosts');
      })
    }
    displayHostList(hostSet); 
  });

  // Update Forwarding badge depending on storage settings
  getStorageValue('forwarding_enabled').then(isForwardingEnabled => {
    if(isForwardingEnabled) {
      headline.innerText = "Active"
      headline.className = "inline-block rounded-full text-white bg-green-500 px-2 py-1 text-xs font-bold mr-3";
    } else {
      headline.innerText = "Inactive"
      headline.className = "inline-block rounded-full text-white bg-red-500 px-2 py-1 text-xs font-bold mr-3";
    }
  });

  // Load extension running value and remove other settings in case its not running
  getStorageValue('extension_running').then((val) => {
    toggleRunning.checked = val;
    document.getElementById('domains-container').hidden = !toggleRunning.checked;
    if(!val) {
      headline.innerText = "Inactive"
      headline.className = "inline-block rounded-full text-white bg-red-500 px-2 py-1 text-xs font-bold mr-3";
    }
  });
}

// Start/Stop global forwarding
function toggleExtensionRunning () {
  toggleRunning.checked = !toggleRunning.checked
  saveStorageValue('extension_running',toggleRunning.checked).then(() => {
    document.getElementById('domains-container').hidden = !toggleRunning.checked;
  });

}
checkboxRunning.onclick = toggleExtensionRunning;



document.getElementById('button-write-hostname')
            .addEventListener('click', function() {
              let hostname = document.getElementById("input-hostname").value
              document.getElementById("input-hostname").value = ""
              addHost(hostname).then(hostSet=>{
                displayHostList([...hostSet]);
                return hostSet;
              })
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
                return hostSet;
              })
            });

function displayHostList(hostList){
  if (!hostList) {
    return;
  }
  document.getElementById('output').innerHTML = ""
  for(var i=0; i < hostList.length; i++){
    document.getElementById('output')
          .innerHTML+= '<label class="inline-flex items-center mt-3"> <input type="checkbox" id=hostname-' + i + ' class="form-checkbox h-4 w-4 text-gray-600"><span class="ml-2 text-gray-700">'+  hostList[i] + '</span> </label>';
  }
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

function deleteHosts(hostlist){
  return getStorageValue('list').then(toSet).then(hostSet => {
    for (const hostname of hostlist){
      hostSet.delete(hostname);
    }
    saveStorageValue('list', [...hostSet]).then(() => {
      console.log('Deleted hosts: ' + hostlist);
    })
    return hostSet;
  });
}

function openOptions() {
  
}


document.getElementById('button-options')
            .addEventListener('click', function() {
              chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
          });

  document.getElementById('button-open-in-scion')
    .addEventListener('click', function() {
      // get current tab
      chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {

        // since only one tab should be active and in the current window at once
        // the return variable should only have one entry
        var activeTab = tabs[0];
        var activeTabId = activeTab.id; // or do whatever you need

        chrome.tabGroups.query({
          title: 'SCION',
        }).then(groups => {
          if(groups && groups.length > 0 && groups[0]) {
            // get groups, filter by SCION
            chrome.tabs.group({ 
                groupId: groups[0].id,
                tabIds: [activeTabId],
            }, (result) => {
              console.warn(result);
            });
          } else {
            chrome.tabs.group({
              tabIds: [activeTabId],
          }, (result) => {
            console.warn(result);
            chrome.tabGroups.query({
            }).then(groups2 => {
              console.warn(groups2);
              const group = groups2.find(g => g.title === null || g.title === "");
              if (group) {
                console.warn(group);
                chrome.tabGroups.update(group.id, {
                  title: "SCION",
                  color: "blue"
                });
              }
            });
          });
          }
        })

       
     });

      
  });