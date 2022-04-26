// Copyright 2021 ETH, Ovgu
'use strict';


function saveStorageValue(key, value) {
  return new Promise((resolve, reject) => {
    console.log("save")
    browser.storage.local.set({[key]: value}, function() {
      resolve();
    });
  });
}

function getStorageValue(key) {
  return new Promise((resolve, reject) => {
    browser.storage.local.get([key], function(result) {
      resolve(result[key]);
    });
  });
}

function toSet(key) {
    return new Promise(resolve => {
      resolve(new Set(key));
    });
}

async function createTab() {
  const containers = await browser.contextualIdentities.query({
    name: "SCION"
  });
  console.log("containers" + containers)

    browser.tabs.create({
      cookieStoreId: containers[0].cookieStoreId,
    });
}


document.getElementById('button-options')
            .addEventListener('click', function() {
              chrome.runtime.openOptionsPage();
          });

document.getElementById('button-open-in-scion')
  .addEventListener('click', createTab);