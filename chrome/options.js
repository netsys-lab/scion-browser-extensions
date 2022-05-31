// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Copyright 2021 ETH, Ovgu
'use strict';

const toggleGlobalStrict = document.getElementById('toggleGlobalStrict');
const checkboxGlobalStrict = document.getElementById('checkboxGlobalStrict');
const lineStrictMode = document.getElementById('lineStrictMode');
const tableSitePreferences = document.getElementById('tableBodySitePreferences');

const tableSitePreferencesRow = ` 
<tr>
<td class="p-2 whitespace-nowrap">
  <div class="text-left">{site}</div>
</td>
<td class="p-2 whitespace-nowrap flex">
  <div class="text-left font-medium mr-3">
    <div class="relative cursor-pointer" id="checkBoxSite-{site}">
      <input id="toggleSite-{site}" {checked} type="checkbox" class="site-pref-entry sr-only" onchange="" />
      <div class="w-8 h-4 bg-gray-400 rounded-full shadow-inner" style="background-color: {backgroundColor};"></div>
      <div class="dot2 absolute w-4 h-4 bg-white rounded-full shadow -left-1 -top-0 transition"></div>
    </div>
  </div>
  <span style="font-size: 12px">{mode}</span>
</td>
</tr>`

const placeholderToggleID = "toggleISD-";

window.onload = function () {
    getStorageValue('isd_whitelist').then((isdSet) => {
        displayToggleISD(isdSet);
    });
    registerToggleISDHandler();
}

function displayToggleISD(isdSet) {
    if (!isdSet) {
        return;
    }
    for (const id of isdSet) {
        var isdToggle = document.getElementById(placeholderToggleID + id);
        if (isdToggle) {
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


function toggleISD(checked_id) {
    var isdToggle = document.getElementById(checked_id);
    isdToggle.checked = !isdToggle.checked;
    var id = checked_id.split("toggleISD-")[1];
    applyWhitelist(id, isdToggle.checked);
}


async function applyWhitelist(isd, checked) {
    const isdList = await getStorageValue('isd_whitelist');
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
    if (!list) {
        return list;
    }
    return list.filter(l => !!l);
}

/* Optional Javascript to close the radio button version by clicking it again */
var myRadios = document.getElementsByName('tabs2');
var setCheck;
var x = 0;
for (x = 0; x < myRadios.length; x++) {
    myRadios[x].onclick = function () {
        if (setCheck != this) {
            setCheck = this;
        } else {
            this.checked = false;
            setCheck = null;
        }
    };
}

function toggleGlobalStrictMode() {
    toggleGlobalStrict.checked = !toggleGlobalStrict.checked;
    if (toggleGlobalStrict.checked) {
        lineStrictMode.style.backgroundColor = '#48bb78';
    } else {
        lineStrictMode.style.backgroundColor = '#cccccc';
    }
    saveStorageValue('globalStrictMode', toggleGlobalStrict.checked).then((val) => {

    });
}

getStorageValue('globalStrictMode').then(val => {
    toggleGlobalStrict.checked = val;
    if (toggleGlobalStrict.checked) {
        lineStrictMode.style.backgroundColor = '#48bb78';
    } else {
        lineStrictMode.style.backgroundColor = '#cccccc';
    }
});

getStorageValue('perSiteStrictMode').then(perSiteStrictMode => {
    tableSitePreferences.innerHTML = '';
    Object.keys(perSiteStrictMode || {}).forEach(k => {
        let row = tableSitePreferencesRow.replace("{site}", k);
        row = row.replace("{checked}", perSiteStrictMode[k] ? "checked=true" : "");
        row = row.replace("{mode}", perSiteStrictMode[k] ? 'strict' : 'when available');
        row = row.replace("{backgroundColor}", perSiteStrictMode[k] ? '#48bb78' : '');
        tableSitePreferences.innerHTML += row;
    });
    console.warn(perSiteStrictMode);
});


document.getElementById('checkboxGlobalStrict')
    .addEventListener('click', function () {
        toggleGlobalStrictMode();
    });
