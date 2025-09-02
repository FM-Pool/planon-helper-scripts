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

    // Planon UI
    translateNameLangs = [];

    // file
    fileHeaders = [];
    rowFileData = [];
    headerRow = 9;

    // translation Config
    selectedTranslateNameIndex;
    selectedFileIndex;
    configs;

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
        $("#csv-lang-file").on("change", function (event) {
            SetTranslation._instance.readLangCsvFile(event);
        });
        SetTranslation._instance.debug(["#fmp-translation-index onChange", $("#fmp-translation-index")]);
        $("#fmp-translation-index").on("change", function () {
            SetTranslation._instance.debug(["#fmp-translation-index onChange", this]);
            SetTranslation._instance.selectedTranslateNameIndex = this.value;
            SetTranslation._instance.setTranslationConfig();
        });
        SetTranslation._instance.debug(["#fmp-csv-file-index onChange", $("#fmp-csv-file-index")]);
        $("#fmp-csv-file-index").on("change", function () {
            SetTranslation._instance.debug(["#fmp-csv-file-index onChange", this]);
            SetTranslation._instance.selectedFileIndex = this.value;
            SetTranslation._instance.setTranslationConfig();
        });
    }

    startTranslation() {
        SetTranslation._instance.debug("Start translation");
        SetTranslation._instance.prepareTranslationConfig();
        if(SetTranslation._instance.configs.length > 0){
            SetTranslation._instance.log("Config okay. Start setting translations.");
        } else {
            SetTranslation._instance.log("No replacement configured. Please check config.");
        }
    }

    prepareTranslationConfig() {
        SetTranslation._instance.debug(["prepareTranslationConfig", $(".translation-config-row")]);
        SetTranslation._instance.log("Prepare Config");
        SetTranslation._instance.configs = [];
        $(".translation-config-row").each(function (index) {
            SetTranslation._instance.debug([".translation-config-row", $(this)]);
            var selectedFileColumn = $(this).find('select').val();
            if (selectedFileColumn != '') {
                var selectedTranslateNameCol = $(this).find('span').text();
                SetTranslation._instance.debug(["Found valid config row",
                    "targetLang: " + selectedTranslateNameCol,
                    "indexLang: " + SetTranslation._instance.selectedTranslateNameIndex,
                    "sourceColumnIndex: " + SetTranslation._instance.selectedFileIndex,
                    "sourceColumnTarget: " + selectedFileColumn,
                    "sourceColumns: " + SetTranslation._instance.fileHeaders,
                    SetTranslation._instance.rowFileData]);
                SetTranslation._instance.configs.push(
                    new TranslationConfig(
                        selectedTranslateNameCol,
                        SetTranslation._instance.selectedTranslateNameIndex,
                        SetTranslation._instance.selectedFileIndex,
                        selectedFileColumn,
                        SetTranslation._instance.fileHeaders,
                        SetTranslation._instance.rowFileData,
                    )
                );
            }
        });
    }

    setTranslationAndSave() {
        SetTranslation._instance.debug("Set translation");
        $("span.editButton")[0].click();
        SetTranslation._instance.waitForElm('input.cellEditor').then((elm) => {
            elm.value = "asdsad";
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

    getLangFromPicklist() {
        this.debug("start getLangFromPicklist");
        SetTranslation._instance.translateNameLangs = [];
        var table = $(SELECTOR_FOR_TRANSLATION_TABLE).parent().parent().parent();
        var langCellWrappers = $(table).find('div.truncate-text');
        this.debug(["is translation table found. ", table, langCellWrappers]);
        langCellWrappers.each(function (index) {
            var text = $(this).text();
            SetTranslation._instance.translateNameLangs.push(text);
            SetTranslation._instance.debug(["cell", text]);
        });
        SetTranslation._instance.resetTranslationSelectList()
        this.debug(["Found langs in pick list", SetTranslation._instance.translateNameLangs]);
    }

    async readLangCsvFile(event) {
        SetTranslation._instance.fileHeaders = [];
        SetTranslation._instance.rowFileData = [];
        SetTranslation._instance.debug(["readLangCsvFile", event]);
        const file = event.target.files.item(0)
        const text = await file.text();
        var lines = text.split(/\r?\n|\r|\n/g);
        SetTranslation._instance.debug(["File input", text, lines]);
        var headerRow = lines[SetTranslation._instance.headerRow - 1];
        headerRow.split(";").forEach(element => {
            SetTranslation._instance.fileHeaders.push(element);
        });
        for (var i = SetTranslation._instance.headerRow; i < lines.length; i++) {
            SetTranslation._instance.rowFileData.push(lines[i].split(";"));
        }
        SetTranslation._instance.debug(["Found Headers", SetTranslation._instance.fileHeaders, SetTranslation._instance.rowFileData]);
        SetTranslation._instance.resetFileIndexSelection();
    }

    resetFileIndexSelection() {
        SetTranslation._instance.debug(["resetFileIndexSelection"]);
        SetTranslation._instance.resetSelectionList('#fmp-csv-file-index', SetTranslation._instance.fileHeaders);
    }

    resetTranslationSelectList() {
        SetTranslation._instance.debug(["resetTranslationSelectList"]);
        SetTranslation._instance.resetSelectionList('#fmp-translation-index', SetTranslation._instance.translateNameLangs);
    }

    resetSelectionList(selector, options) {
        $(selector).find('option').remove();
        options.forEach(element => {
            $(selector).append(`<option value="${element}">${element}</option>`);
        });
        $(selector).val($(selector).find('option').first().val()).change();
        // Maybe explicit call is better, but for now it is fine when one of the selection has changed;
        SetTranslation._instance.setTranslationConfig();
    }

    setTranslationConfig() {
        SetTranslation._instance.debug(["setTranslationConfig", SetTranslation._instance.selectedFileIndex, SetTranslation._instance.selectedTranslateNameIndex]);
        if (SetTranslation._instance.rowFileData.length > 0 && SetTranslation._instance.translateNameLangs.length > 0) {
            $('.translation-config-wrapper').empty();
            SetTranslation._instance.translateNameLangs.forEach(element => {
                if (element != SetTranslation._instance.selectedTranslateNameIndex) {
                    $('.translation-config-wrapper').append(SetTranslation._instance.getTranslationConfigElement(element));
                }
            });
        }
    }

    getTranslationConfigElement(title) {
        var options = `<option value=""></option>`;
        SetTranslation._instance.fileHeaders.forEach(element => {
            if (element != SetTranslation._instance.selectedFileIndex) {
                options += `<option value="${element}">${element}</option>`
            }
        });
        return `<div class="row translation-config-row">
                    <span>${title}</span>
                    <select id="element-for-${title}">${options}</select>
                </div>`;
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

    log(message) {
        $("#fmp-set-translation-log").val(message);
    }

    debug(message) {
        if (this.isDebug) {
            console.log(message);
        }
    }
}

class TranslationConfig {

    constructor(targetLang, indexLang, sourceColumnIndex, sourceColumnTarget, sourceColumns, data) {
        this.targetLang = targetLang;
        this.indexLang = indexLang;
        this.sourceColumnIndex = sourceColumnIndex;
        this.sourceColumnTarget = sourceColumnTarget;
        this.sourceColumns = sourceColumns;
        this.data = data;
        this.createMap();
    }

    createMap() {
        this.translationMap = new Map([]);
        var indexColumn = this.sourceColumns.indexOf(this.sourceColumnIndex);
        var targetColumn = this.sourceColumns.indexOf(this.sourceColumnTarget);
        for (var i = 0; i < this.data.length; i++) {
            var key = this.data[i][indexColumn];
            var val = this.data[i][targetColumn];
            this.translationMap.set(key, val);
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
            <span>Pick List Index:</span><select id="fmp-translation-index"></select><button class="refresh-available-lang">&#x21bb;</button>
        </div>
        <div class="row">
            <span>CSV Datei Index Spalte:</span><select id="fmp-csv-file-index"></select>
        </div>
        <div class="row translation-config-wrapper">
        </div>
        <div class="row">
            <button class="btn-start">Start</button>
        </div>
        <div class="row">
            <span>Log:</span><input readonly id="fmp-set-translation-log" type="text"/>
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