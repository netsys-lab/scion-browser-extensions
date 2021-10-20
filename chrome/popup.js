// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
let headline = document.getElementById('headline');
let hostlist = document.getElementById('hostlist');
let toggleRunning = document.getElementById('toggleRunning');
let checkboxRunning = document.getElementById('checkboxRunning');

function getForwardingEnabled() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['forwarding_enabled'], function(result) {
      resolve(result.forwarding_enabled);
    });
  });
}
function getSyncHosts() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['list'], function(result) {
      const hostSet = new Set(result.list)
      resolve(hostSet);
    });
  });
}

getForwardingEnabled().then(isForwardingEnabled => {
  console.log("Called getForwardingEnabled with val " + getForwardingEnabled);
  if(isForwardingEnabled) {
    headline.innerText = "Active"
    headline.className = "inline-block rounded-full text-white bg-green-500 px-2 py-1 text-sm font-bold mr-3";
  } else {
    headline.innerText = "Inactive"
    headline.className = "inline-block rounded-full text-white bg-red-500 px-2 py-1 text-sm font-bold mr-3";
  }
}); 

function setExtensionRunning(value) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({'extension_running': value}, function() {
      resolve();
    });
  });
}

function getExtensionRunning() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['extension_running'], function(result) {
      resolve(result.extension_running);
    });
  });
}


function updateHosts () {
  getSyncHosts().then(hostSet => {
    hostlist.innerHTML = '';
    hostSet.forEach(val => {
      const newHost = document.createElement('div');
      newHost.className = 'text-base text-gray-700 font-medium';
      newHost.innerText = val;
      hostlist.appendChild(newHost);
    });
  });
}

updateHosts();


function toggleExtensionRunning () {
  toggleRunning.checked = !toggleRunning.checked
  setExtensionRunning(toggleRunning.checked);
}
checkboxRunning.onclick = toggleExtensionRunning;

getExtensionRunning().then((val) => {
  toggleRunning.checked = val;
});

/*
let changeColor = document.getElementById('changeColor');

chrome.storage.sync.get('color', function(data) {
  changeColor.style.backgroundColor = data.color;
  changeColor.setAttribute('value', data.color);
});

changeColor.onclick = function(element) {
  let color = element.target.value;
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.executeScript(
        tabs[0].id,
        {code: 'document.body.style.backgroundColor = "' + color + '";'});
  });
};
*/