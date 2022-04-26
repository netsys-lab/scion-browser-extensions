// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
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

const placeholderToggleID = "toggleISD-"

window.onload = function () {
    getStorageValue('isd_whitelist').then((isdSet) => {
        displayToggleISD(isdSet);
      });
      registerToggleISDHandler();
}

function displayToggleISD(isdSet){
    if(!isdSet) {
        return;
    }
    for (const id of isdSet){
        var isdToggle = document.getElementById(placeholderToggleID + id);
        if(isdToggle) {
            isdToggle.checked = true;
        }
    }
}

function registerToggleISDHandler() {
    const idsToggles = document.getElementsByClassName("isd-entry");
    for (let i = 0; i < idsToggles.length; i++) {
        const parentDiv = idsToggles[i].parentElement;
        parentDiv.onclick = () => {
            toggleISD(idsToggles[i].id);
        }
    }
};


function toggleISD(checked_id){
    var isdToggle = document.getElementById(checked_id);
    isdToggle.checked = !isdToggle.checked;
    var id = checked_id.split("toggleISD-")[1];
    applyWhitelist(id, isdToggle.checked);
}


async function applyWhitelist(isd, checked){
    console.log("whitelist")
    const isdList = await getStorageValue('isd_whitelist');
    console.log("whitelist-2")
    const isdSet = await toSet(removeEmptyEntries(isdList));
    if (checked) {
        isdSet.add(isd);
        console.log('Added isd to list: ' + isd);
    } else {
        isdSet.delete(isd);
        console.log('Delete isd to list: ' + isd);
    }
    const isdSet_1 = isdSet;
    await saveStorageValue('isd_whitelist', [...isdSet_1]);
    console.log([...isdSet_1]);
}

function removeEmptyEntries(list) {
    if(!list) {
        return list;
    }
    return list.filter(l => !!l);
}