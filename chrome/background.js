// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * This file contains some ideas and code snippets for the plugin
 * May be used as starting point
 * 
 */

/*
 * This could be used to intercept requests and to redirect them to another endpoint
 * May be obsolete with the PAC script... 
*/
chrome.webRequest.onBeforeRequest.addListener(function(details) {
  console.log(details.url);
  const pUrl = decodeURIComponent(details.url);
  const startIndex = pUrl.indexOf('https://', 5);
  const lastIndex = pUrl.indexOf('&', startIndex);
  let scionUrl = null;

  if (startIndex > 0 && lastIndex > 0) {
    scionUrl = pUrl.substring(startIndex, lastIndex);
    return {redirectUrl: 'Some SCION URL' + '?r=' + encodeURIComponent(scionUrl)};
  }

  return {
    redirectUrl: details.url,
  }
}, {
  urls: ['<all_urls>'], // or <all_urls>
  types: ['main_frame', 'sub_frame'],
}, [
  'blocking'
]);

/*
 * This would be the approach to support URLs like scion+https
 * Not sure if this works inside a browser plugin
 */
navigator.registerProtocolHandler("web+scion",
                                  "Some SCION URL %s",
                                  "SCION Web");

/**
 * This is the starting point to insert the existing PAC script of the current implementation
 */
var config = {
  mode: "pac_script",
  pacScript: {
    data: "function FindProxyForURL(url, host) {\n" +
              "if(host == 'scionlab.network') {\n" + 
          "    return 'HTTPS someurl';\n" +
            "}\n" +
            "return 'DIRECT';\n" + 
          "}"
  }
};

chrome.proxy.settings.set(
    {value: config, scope: 'regular'},
    function() {});

// Double check if the script is set correctly
chrome.proxy.settings.get(
  {'incognito': false},
  function(config) {console.log(JSON.stringify(config));});


chrome.omnibox.onInputEntered.addListener(
function(text) {
  // Encode user input for special characters , / ? : @ & = + $ #
  var newURL = 'Some SCION URL' + encodeURIComponent(text);
  chrome.tabs.create({ url: newURL });
});
  