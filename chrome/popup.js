// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
let headline = document.getElementById('headline');
function getForwardingEnabled() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['forwarding_enabled'], function(result) {
      resolve(result.forwarding_enabled);
    });
  });
}
getForwardingEnabled().then(isForwardingEnabled => {
  console.log("Called getForwardingEnabled");
  if(isForwardingEnabled) {
    headline.innerText = "SCION forwarding enabled"
  } else {
    headline.innerText = "SCION forwarding disabled"
  }
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