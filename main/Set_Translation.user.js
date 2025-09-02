// ==UserScript==
// @name         Set Translation
// @namespace    http://tampermonkey.net/
// @version      0.0.1.1
// @description  set translation
// @author       a.boll
// @match        *://*/*
// @include      https://*planoncloud.com*
// @icon         https://fmpool.it/media/favicon.png
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery-csv/1.0.40/jquery.csv.min.js
// @grant        GM_addStyle
// ==/UserScript==
/* global $ */

const CHECK_FOR_SELECTOR_TO_CREATE_CONTROL = '.PnWebPagedDrillDownListPanel';
const SELECTOR_FOR_ADDING_PANEL = 'body';
const SELECTOR_FOR_TRANSLATION_TABLE = 'th[data-title*="Translation"]'; // [data-title*="Translation text"]

const MAIN_PANEL_ID = 'FMPool-SetTranslation';

class SetTranslation {

    isDebug = true;
    
    pickListLang = [];

    fileHeaders = [];

    rowFileData = [];
    
    headerRow = 9;

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
            this.debug(["Check for selector success.", $(SELECTOR_FOR_ADDING_PANEL)]);
            this.waitForElm(SELECTOR_FOR_ADDING_PANEL).then((elm) => {
                this.debug(["Selector for adding panel exist.", $(SELECTOR_FOR_ADDING_PANEL)]);
                $(SELECTOR_FOR_ADDING_PANEL).append(MAIN_PANEL);
                this.addControls();
            });
            
        });
    }

    addControls() {
        $(".set-translation-main-button").click(function () {
            $("#" + MAIN_PANEL_ID + " .controls").toggle();
        });
        $(".refresh-available-lang").click(function () {
            SetTranslation._instance.getLangFromPicklist();
        });
        $(".btn-start").click(function () {
            SetTranslation._instance.startTranslation();
        });
        $("#csv-lang-file").on("change", function(event) { 
            SetTranslation._instance.readLangCsvFile(event);
        } );
    }

    startTranslation(){
        SetTranslation._instance.debug("Start translation");
    }

    setTranslationAndSave(){
        SetTranslation._instance.debug("Set translation");
        $("span.editButton")[0].click();
        SetTranslation._instance.waitForElm('input.cellEditor').then((elm) => {
            elm.value="asdsad";
            // Click another element to accept input
            $("span.editButton")[1].click();
            var saveButton = $("a.actionButton.BomSave.btn");
            SetTranslation._instance.debug(["translation element", $(elm), saveButton]);
            SetTranslation._instance.waitForElm('a.BomSave[aria-disabled="false"]').then((elm) => {
                SetTranslation._instance.debug(["click save Translation", $(elm)]);
                $(elm).click();
            }); 

        }); 
    }

    getLangFromPicklist(){
        this.debug("start getLangFromPicklist");
        SetTranslation._instance.pickListLang = [];
        var table = $(SELECTOR_FOR_TRANSLATION_TABLE).parent().parent().parent();
        var langCellWrappers = $(table).find('div.truncate-text');
        this.debug(["is translation table found. ",
            table, langCellWrappers]);
        langCellWrappers.each(function( index ) {
            var text = $(this).text();
            SetTranslation._instance.pickListLang.push(text);
            SetTranslation._instance.debug(["cell", text]);
            
        });
        this.debug(["Found langs in pick list", SetTranslation._instance.pickListLang]);
    }

    async readLangCsvFile(event){
        SetTranslation._instance.fileHeaders = [];
        SetTranslation._instance.rowFileData = [];
        SetTranslation._instance.debug(["readLangCsvFile", event]);
        const file = event.target.files.item(0)
        const text = await file.text();
        var lines = text.split(/\r?\n|\r|\n/g);
        SetTranslation._instance.debug(["File input", text, lines]);
        var headerRow = lines[SetTranslation._instance.headerRow-1];
        headerRow.split(";").forEach(element => {
            SetTranslation._instance.fileHeaders.push(element);
        });
        for(var i = SetTranslation._instance.headerRow; i < lines.length; i++) {
            SetTranslation._instance.rowFileData.push(lines[i].split(";"));
        }
        SetTranslation._instance.debug(["Found Headers", SetTranslation._instance.fileHeaders, SetTranslation._instance.rowFileData]);
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
        if(this.isDebug) {
            console.log(message);
        }
    }
}

(function () {
    'use strict';

    // Your code here...
    new SetTranslation();
})();

if (module !== undefined && module.exports !== undefined) {
    module.exports = SetTranslation;
}

const MAIN_PANEL = `
<div id="FMPool-SetTranslation" class="mainPanel navbar">
    <div class="menu">
        <button class="set-translation-main-button">Open</button>
    </div>
    <div class="controls">
        <div class="row">
            <span>CSV Datei:</span><input id="csv-lang-file" type="file"/>
        </div>
        <div class="row">
            <span>Sprache:</span><input id="language" type="text"/><button class="refresh-available-lang">&#x21bb;</button>
        </div>
        <div class="row">
            <button class="btn-start">Start</button>
        </div>
    </div>
</div>
`;

GM_addStyle(`
#FMPool-SetTranslation {
    position: absolute;
    top: 60px;
    right: 0;
    z-index: 5;
    background-color: rgb(217, 234, 211);
}
.controls {
    //display:none;
}
`);