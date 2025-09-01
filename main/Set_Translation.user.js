// ==UserScript==
// @name         Set Translation
// @namespace    http://tampermonkey.net/
// @version      0.0.1.1
// @description  set translation
// @author       a.boll
// @match        *://*/*
// @include      https://*planoncloud.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        GM_addStyle
// ==/UserScript==
/* global $ */

const CHECK_FOR_SELECTOR_TO_CREATE_CONTROL = '.PnWebPagedDrillDownListPanel';

class SetTranslation {

    isDebug = true;
    
    constructor() {
        if (SetTranslation._instance) {
            return SetTranslation._instance;
        }
        SetTranslation._instance = this;
        SetTranslation._instance.debug("Init SetTranslation");
        this.createMenu();
    }

    createMenu() {
        this.waitForElm(CHECK_FOR_SELECTOR_TO_CREATE_CONTROL).then((elm) => {
            this.debug("Check for selector success");
        });
    }

    waitForElm(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    debug(message){
        if(this.debug) {
            console.log(message);
        }
    }
}

(function () {
    'use strict';

    // Your code here...
    //myInstance.createReplaceTextInExpressionPanel();
    new SetTranslation();
})();

if (module !== undefined && module.exports !== undefined) {
    //module.exports = ReplaceTextInReportFormulars;
}