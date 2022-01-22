// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Copyright 2021 ETH, Ovgu
'use strict';

function registerToggleISDHandler() {

    const idsToggles = document.getElementsByClassName("isd-entry");
    for (let i = 0; i < idsToggles.length; i++) {
        const parentDiv = idsToggles[i].parentElement;
        parentDiv.onclick = () => {
            toggleISD(idsToggles[i].id);
        }
    }
};
registerToggleISDHandler();

function toggleISD(checked_id){
    var isdToggle = document.getElementById(checked_id);
    isdToggle.checked = !isdToggle.checked;
}

function applyWhitelist(){
    var isds = document.getElementsByClassName("isd-entry");
    let isdWhiteList = new Array()
    for(var i = 0; i < isds.length; i++) {
       if (isds[i].getAttribute("checked")){
           // push isd number
       }
    }
    geofence(isdWhiteList);
}

function geofence(isdList){
    // Transform list to string
    let stringList = ""
    for (const isd of isdList){
      stringList += isd + ",";
    }

    var req = new XMLHttpRequest();
    req.open("PUT", "http://localhost:8888/setISDPolicy", true);
    req.setRequestHeader('Content-type','application/raw; charset=utf-8');
    req.onreadystatechange = function() {
        if (req.readyState == 4) {
          if (req.status == 200) {
            const resp = req.responseText;
            console.log("Response from SKIP: " + resp);
            }
        }
    };
    req.send(stringList);
  }