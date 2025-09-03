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
const SELECTOR_FOR_TRANSLATION_TABLE = 'th[data-title*="Translation"]';

const MAIN_PANEL_ID = 'FMPool-SetTranslation';

class SetTranslation {

    isDebug = true;

    // Planon UI
    translateNameLangs = [];

    // file
    fileHeaders = [];
    rowFileData = [];
    headerRow = 9;
    rawFileContent = "";

    // translation Config
    selectedTranslateNameIndex;
    selectedFileIndex;
    configs = [];

    // intern
    abort = false;

    constructor() {
        if (SetTranslation._instance) {
            return SetTranslation._instance;
        }
        SetTranslation._instance = this;
        SetTranslation._instance.debug(["Init SetTranslation"]);
        this.createMenu();
    }

    createMenu() {
        this.waitForElm(CHECK_FOR_SELECTOR_TO_CREATE_CONTROL).then((elm) => {
            this.debug(["Check for selector success.", $(SELECTOR_FOR_ADDING_PANEL)]);
            this.waitForElm(SELECTOR_FOR_ADDING_PANEL).then((elm) => {
                this.debug(["Selector for adding panel exist.", $(SELECTOR_FOR_ADDING_PANEL)]);
                $(SELECTOR_FOR_ADDING_PANEL).append(MAIN_PANEL);
                this.addControls();
                this.setDefaults();
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
        $(".btn-abort").click(function () {
            SetTranslation._instance.abort = true;
        });
        $("#csv-lang-file").on("change", function (event) {
            SetTranslation._instance.readLangCsvFile(event);
        });
        $("#csv-lang-file-hedaer-row").on("change", function (event) {
            SetTranslation._instance.csvFileIndexChanged(event);
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

    setDefaults(){
        $("#csv-lang-file-hedaer-row").val(this.headerRow);
    }

    startTranslation() {
        SetTranslation._instance.debug(["Start translation"]);
        SetTranslation._instance.abort = false;
        SetTranslation._instance.prepareTranslationConfig();
        if(SetTranslation._instance.configs.length > 0){
            SetTranslation._instance.log("Config okay. Start setting translations.");
            SetTranslation._instance.prepareStart();
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

    prepareStart(){
        this.debug(["prepareStart", $("caption")]);
        SetTranslation._instance.clickThroughList(SetTranslation._instance.getClickableItemList(), 0);
    }

    getClickableItemList(){
        // TODO make configurable
        var regExCaptionText = "Picklist";
        var table;
        $("caption").each(function (index) {
            var text = $(this).text();
            if(text.includes(regExCaptionText)) {
                table = $(this).parent();
            }
        });
        this.debug([$("caption"), table]);
        return $(table).find("tbody tr");
    }

    clickThroughList(list, index){
        SetTranslation._instance.debug(["clickThroughList", list, index]);
        if(SetTranslation._instance.abort) {
            SetTranslation._instance.debug(["abort", list, index]);
            SetTranslation._instance.log("Abort");
            return;
        }
        if(index == list.length){
            var hasNextPage = SetTranslation._instance.goToNextPage();
            if(!hasNextPage) {
                SetTranslation._instance.log("Finished");
            }            
            return;
        }
        var currentElement = list[index];
        var code = $(currentElement).find(":nth-child(2)").text().trim();
        SetTranslation._instance.log(`Set item (Code: ${code}) ${index} of ${list.length} on current page.`);
        $(currentElement).click();
        SetTranslation._instance.debug(["clickThroughList -> clicked next element", currentElement, code]);
        SetTranslation._instance.waitForElm('input[value="' + code + '"]').then((elm) => {
            SetTranslation._instance.setTranslationAndSave(list, index + 1);
        });
    }

    goToNextPage() {
        SetTranslation._instance.debug(["goToNextPage"]);
        if ($(".ProxyNavigator").length) {
            var currentPage = $('a.page-link[disabled="disabled"] span').text();
            var nextPage = Number(currentPage) + 1;
            SetTranslation._instance.debug([".ProxyNavigator", currentPage, nextPage]);
            $("span.page-link-bg").each(function (index) {
                var text = $(this).text();
                if(nextPage == text) {
                    $(this).parent().click();
                    SetTranslation._instance.waitForElm('a.page-link[disabled="disabled"][title*="' + text + '"]').then((elm) => {
                        SetTranslation._instance.clickThroughList(SetTranslation._instance.getClickableItemList(), 0);
                    });
                    return true;
                }
            });
        }
        return false;
    }

    setTranslationAndSave(list, index) {
        SetTranslation._instance.debug(["Set translation", list, index]);
        SetTranslation._instance.configs.forEach(config => {
            var targetLang = config.getTargetLanguage();
            var indexLang = config.getIndexLanguage();
            var indexValue = SetTranslation._instance.getTextByLang(indexLang);
            var translation = config.getTranslatedText(indexValue);
            SetTranslation._instance.debug(["execute config", config, targetLang]);
            SetTranslation._instance.setTextForLang(targetLang, translation, indexLang, list, index);
        });
    }

    getTextByLang(lang) {
        SetTranslation._instance.debug(["getTextByLang", $(`div[title="${lang}"]`)]);
        var tableRowParent = SetTranslation._instance.getTableRowForLang(lang);
        return tableRowParent.find('span.labelledFieldValue').text();
    }

    setTextForLang(lang, text, langForRandomClick, list, index) {
        SetTranslation._instance.debug(["setTextForLang", lang, text, langForRandomClick]);
        var tableRowParent = SetTranslation._instance.getTableRowForLang(lang);
        $(tableRowParent.find('span.editButton')).click();
        SetTranslation._instance.waitForElm('input.cellEditor').then((elm) => {
            elm.value = text;
             // Click another element to accept input
            var randomRowParent = SetTranslation._instance.getTableRowForLang(langForRandomClick);
            $(randomRowParent.find('span.editButton')).click();
            SetTranslation._instance.debug(["setTextForLang", $(elm), randomRowParent]);
            SetTranslation._instance.waitForElm('a.BomSave[aria-disabled="false"]').then((elm) => {
                SetTranslation._instance.debug(["click save Translation", $(elm)]);
                $(elm).click();
                SetTranslation._instance.waitForElm('a.BomSave[aria-disabled="true"]').then((elm) => {
                    SetTranslation._instance.clickThroughList(list, index);
                });
            });
        });
    }

    getTableRowForLang(lang){
        return $(`div[title="${lang}"]`).parent().parent();
    }

    getLangFromPicklist() {
        this.debug(["start getLangFromPicklist"]);
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
        SetTranslation._instance.debug(["readLangCsvFile", event]);
        SetTranslation._instance.rawFileContent = "";
        const file = event.target.files.item(0)
        SetTranslation._instance.rawFileContent = await file.text();
        SetTranslation._instance.prcessCsvFile();
    }

    prcessCsvFile(){
        const text = SetTranslation._instance.rawFileContent;
        if(text == ""){
            return;
        }
        SetTranslation._instance.fileHeaders = [];
        SetTranslation._instance.rowFileData = [];
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

    csvFileIndexChanged(event){
        SetTranslation._instance.debug(["csvFileIndexChanged", event, event.target.value]);
        SetTranslation._instance.headerRow = new Number(event.target.value);
        SetTranslation._instance.prcessCsvFile();
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
            $('.translation-config-wrapper').show();
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
            message.push(SetTranslation._instance);
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

    getTargetLanguage() {
        return this.targetLang;
    }

    getIndexLanguage() {
        return this.indexLang;
    }

    getTranslatedText(key) {
        return this.translationMap.get(key);
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
    <div class="row">
        <div class="menu">
            <img src="https://fmpool.it/media/favicon.png" />
            <button class="set-translation-main-button">&#x1F310;</button>
        </div>
    </div>
    <div class="controls">
        <div class="translation-config">
            <div class="row">
                <div class="row">
                    <span>CSV File:</span><input id="csv-lang-file" type="file"/>
                </div>
                <div class="row">
                    <span>Number Header Row:</span><input id="csv-lang-file-hedaer-row" type="number"/>
                </div>
            </div>
            <div class="row">
                <span>Language Index (Planon):</span><select id="fmp-translation-index"></select><button class="refresh-available-lang">&#x21bb;</button>
            </div>
            <div class="row">
                <span>CSV File Index Column:</span><select id="fmp-csv-file-index"></select>
            </div>
        </div>
        <div class="row">
            <div class="translation-config-wrapper">
        </div>
        </div>
        <div class="control-process">
            <div class="row">
                <button class="btn-control-process btn-start">&#x25B8;</button>
                <button class="btn-control-process btn-abort">&#x2A2f;</button>
            </div>
        </div>
        <div class="row log">
            <div class="row">
                <span>Log:</span>
            </div>
            <div class="row">
                <textarea readonly id="fmp-set-translation-log"></textarea>
            </div>
        </div>
    </div>
</div>
`;

GM_addStyle(`
    body div#FMPool-SetTranslation {
        position: absolute;
        top: 60px;
        right: 0;
        z-index: 5;
        background-color: rgb(217, 234, 211);
        color: #000000;
        padding: 4px;
        border-style: solid;
        border-width: 2px;
        border-color: #fee900;
    }
    #FMPool-SetTranslation button {
        cursor: pointer;
    }
    .menu {
        justify-content: center;
        align-items: center;
        display: flex;
    }
    .menu * {
        margin-left: 5px;
    }
    .set-translation-main-button {
        width: 32px;
        height: 32px;
        font-size: 20px;
    }
    .controls {
        display:none;
        margin-top:3px;
    }
    .translation-config, .translation-config-wrapper {
        border-style: dashed;
        padding: 2px;
        border-width: 1.5px;
        border-radius: 5px;
    }
    .translation-config-wrapper {
        margin-top: 3px;
        display:none;
    }
    .control-process {
        border-style: solid;
        margin-top: 3px;
        padding: 2px;
        border-width: 1.5px;
        border-radius: 5px;
        text-align: center;
    }
    .btn-control-process {
        font-size: 20px;
    }
    .btn-start {
        background-color: darkgreen;
    }
    .btn-abort {
        background-color: red;
    }
    .log {
        margin-top:3px;
    }
    #fmp-set-translation-log{
        width: 100%;
        background-color: lightgrey;
        color:#000000 !important;
    }
`);