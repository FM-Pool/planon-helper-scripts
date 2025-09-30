// ==UserScript==
// @name         Gadget finder
// @namespace    http://tampermonkey.net/
// @version      0.0.1.1
// @description  Find gadget and open backend
// @author       a.boll
// @match        *://*/*
// @include      https://*planoncloud.com*
// @icon         https://fmpool.it/media/favicon.png
// @grant        GM_addStyle
// ==/UserScript==
/* global $ */

class FmPoolGetGadget{

    constructor() {
        if (FmPoolGetGadget._instance) {
            return FmPoolGetGadget._instance;
        }
        FmPoolGetGadget._instance = this;
        this.homepageElementSelector = "pss_casepart_";
        console.log(["Gadget_Finder", $("frame"), this.homepageElementSelector]);
        console.log(["Gadget_Finder", $("form")]);
        this.getGadgetsOnHomepage();
        this.getServices();
    }

    getGadgetsOnHomepage(){
        console.log(["getGadgetsOnHomepage",arguments, $(".pss_sf_image_list_item")]);
        var selector = this.homepageElementSelector;
        $(".pss_sf_image_list_item").each(function (index) {
            var cssClasses = $(this).attr("class").split(/\s+/);
            console.log(["css",cssClasses, selector]);
            for(var i= 0; i < cssClasses.length; i++){
                var cssClass = cssClasses[i];
                console.log(["css check", cssClass, cssClass.indexOf(selector)]);
                if(cssClass.indexOf(selector) >= 0){
                    console.log(["Append", cssClass.replace(selector)]);
                    FmPoolGetGadget._instance.appendGadegtName($(this),cssClass.replace(selector, "") );
                }
            }
            console.log(["getGadgetsOnHomepage", cssClasses]);
        });
    }

    getServices(){
        console.log(["getServices", $("form").attr('action')]);
        $("form").each(function (index) {
            var url = $(this).attr('action');
            const regex = /\?.+/i;
            url = url.replace(regex, "");
            console.log(url);
            const serviceName = url.replace("./", "");
            FmPoolGetGadget._instance.appendGadegtName($(this), serviceName);
        });
    }

    appendGadegtName(jQElement, name, link){
        console.log(["appendGadegtName", window.location.href]);
        jQElement.append(`<div class="fmPool-gadget-name">${name}<a href="${link}" target="_blank">&#128279;</a></div>`);
    }

}

(function () {
    'use strict';

    // Your code here...
    const fmPoolGetGadget = new FmPoolGetGadget();
})();

if (module !== undefined && module.exports !== undefined) {
    module.exports = SetTranslation;
}

GM_addStyle(`
    body .fmPool-gadget-name {
        background-color: rgb(217, 234, 211);
        position: absolute;
        right: 10px;
        border-style: dashed;
        border-width: 2px;
        border-radius: 20px;
        padding: 2px;
        opacity: 0.75;
    }
    body .fmPool-gadget-name a {
        text-decoration: none;
    }
`);
