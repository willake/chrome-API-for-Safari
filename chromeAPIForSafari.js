/**
 * Edited by Willake on 11.07.17.
 */
var messagesJson;
var isInit = false;
var chrome = {
    notifications: {
        create: function (obj) {
            var notification = new Notification(obj.title, {
                icon: obj.iconUrl
                , body: obj.message
            });
            notification.show();
        }
    }
    , browserAction: {
        onClicked: {
            addListener: function (callBack) {
                var chromeCallBack = (function (cb) {
                    return function (event) {
                        if (event.command === "browserAction") {
                            tab = event.target.browserWindow.activeTab;
                            //tab.id = tab.url;
                            cb(tab);
                        }
                    }
                })(callBack);
                safari.application.addEventListener("command", chromeCallBack, false);
            }
        }
    }
    , tabs: {
        onActivate: {
            addListener: function (activateHandler) {
                safari.application.addEventListener("activate", activateHandler, true);
            }
            , removeListener: function (activateHandler) {
                safari.application.removeEventListener("activate", activateHandler, true);
            }
        }
        , onCreate: {
            addListener: function (openHandler) {
                safari.application.addEventListener("open", openHandler, true);
            }
            , removeListener: function (openHandler) {
                safari.application.removeEventListener("open", openHandler, true);
            }
        }
        , onUpdated: {
            addListener: function (updateHandler) {
                safari.application.addEventListener("navigate", updateHandler, true);
            }
            , removeListener: function (updateHandler) {
                safari.application.removeEventListener("navigate", updateHandler, true);
            }
        }
        , executeScript: function (tab, path) {
            safari.extension.addContentScriptFromURL(path, ["*"], [], true);
        }
        , insertCSS: function (tab, path) {
            safari.extension.addContentStyleSheetFromURL(path, ["*"], []);
        }
        , query: function (obj, callback) {
            if (obj.hasOwnProperty("active")) {
                if (obj.active) {
                    var activeTabs = new Array();
                    activeTabs[0] = safari.application.browserWindows[0].activeTab;
                    callback(activeTabs); //callback(safari.application.browserWindows[0].activeTab.browserWindow.tabs);
                }
            }
            else {
                callback(safari.application.browserWindows[0].tabs);
            }
        }
        , sendMessage: function (tab, data, callBack) {
            var name = "noCallBack";
            if (callBack) {
                name = "callBack" + new Date();
                tab.addEventListener('message', function respondToMsg(msg) {
                    if (msg.name === name) {
                        tab.removeEventListener('message', respondToMsg, false);
                        //callBack();
                    }
                }, false);
            }
            tab.page.dispatchMessage(name, data);
        }
        , onReplaced: {
            addListener: function (replaceandler) { // TODO dummy function for now.
            }
            , removeListener: function (replaceandler) {}
        }
        , onRemoved: {
            addListener: function (tab, removeHandler) {
                tab.addEventListener("close", removeHandler, true);
            }
        }
        , create: function (obj, callBack) { // TODO i only have implemented the url property
            var newTab = safari.application.activeBrowserWindow.openTab("foreground", 0);
            newTab.url = obj.url;
            if (callBack) {
                callBack(newTab);
            }
            //newTab.id = obj.url + new Date();
            //callBack(newTab);
            //console.log(newTab);
        }
        , get: function (tabId, callBack) {
            var tabIndex, winIndex, tab;
            safari.application.browserWindows.some(function (brWindow, wI) {
                winIndex = wI;
                return brWindow.tabs.some(function (tab, tabI) {
                    tabIndex = tabI;
                    //return tabId === tab.url;
                    return tabId === tab.id;
                })
            });
            if ((winIndex !== undefined) && (tabIndex !== undefined)) {
                tab = safari.application.browserWindows[winIndex].tabs[tabIndex];
                // prepare for highlight
                tab.index = tabIndex;
                tab.windowId = winIndex;
            }
            callBack(tab);
        }
        , highlight: function (obj) {
            safari.application.browserWindows[obj.windowId].tabs[obj.tabs].activate();
        }
    }
    , runtime: {
        onUpdateAvailable: {
            addListener: function () { // TODO dummy function for now
            }
        }
        , onMessage: {
            addListener: function (callBack) {
                var msgHandler = (function (cb) {
                    return function (event) {
                        var msgTarget = event.target.page ? event.target.page : safari.self.tab;
                        var sender = {}
                            , sendResponse;
                        if (event.name.indexOf("callBack") > -1) {
                            sendResponse = function (msg) {
                                msgTarget.dispatchMessage(event.name, msg); //TODO find out if sendResponse can have call back
                            }
                        }
                        else {
                            sendResponse = undefined;
                        }
                        sender.tab = event.target.page ? event.target : undefined;
                        if (sender.tab) {
                            //sender.tab.id = event.target.url;
                            sender.tab.id = event.target.id;
                        }
                        cb(event.message, sender, sendResponse);
                    }
                })(callBack);
                if (safari.self.addEventListener) {
                    safari.self.addEventListener("message", msgHandler, false);
                }
                else {
                    safari.application.addEventListener("message", msgHandler, false);
                }
            }
        }
        , sendMessage: function (data, callBack) {
            var name = "noCallBack";
            if (callBack) {
                name = "callBack" + new Date();
                safari.self.addEventListener('message', function respondToMsg(msg) {
                    if (msg.name === name) {
                        safari.self.removeEventListener('message', respondToMsg, false);
                        callBack(msg.message);
                    }
                }, false);
            }
            safari.self.tab.dispatchMessage(name, data);
        }
    }
    , extension: {
        getURL: function (url) {
            return safari.extension.baseURI + "src/" + url;
        }
        , getViews: function (view) {
            if (view.type == ViewType.POPUP) return safari.extension.toolbarItems;
            if (view.type == ViewType.TAB) return null;
        }
        , getBackgroundPage: function () {
            return safari.extension.globalPage.contentWindow;
        }
    }
    , i18n: {
        loadJson: function (callback) {
            var userLang = navigator.language;
            if (userLang == "en-US")
            userLang = "en";
            if (userLang == "zh-TW")
            userLang = "zh_TW";
            var path = safari.extension.baseURI + "src/_locales/" + userLang + "/messages.json";
            var xobj = new XMLHttpRequest();
            xobj.overrideMimeType("application/json");
            xobj.open('GET', path, true);
            xobj.onreadystatechange = function () {
                if (xobj.readyState == 4) {
                    messagesJson = JSON.parse(xobj.responseText);
                    callback();
                }
            }
            xobj.send(null);
        }
        , getMessage: function (msg) {
            return messagesJson[msg].message;
        }
    }
    , storage: {
        local: {
            get: function (key, callback) {
                var obj = new Object();
                if (typeof key === "string") {
                    if (Array.isArray(key)) {
                        var arr;
                        for (var item in key) {
                            arr.push(localStorage.getItem(item));
                        }
                        callback(arr);
                    }
                    else {}
                    callback(localStorage.getItem(key));
                }
                else if (typeof key === "object") {
                    for (var itemName in key) {
                        if (typeof key[itemName] === "object") {
                            if (typeof localStorage.getItem(itemName) !== null) {
                                obj[itemName] = JSON.parse(localStorage.getItem(itemName));
                            }
                            else {
                                obj[itemName] = null;
                            }
                        }
                        else {
                            obj[itemName] = localStorage.getItem(itemName);
                        }
                        if (obj[itemName] == null) obj[itemName] = key[itemName];
                    }
                    callback(obj);
                }
            }
            , set: function (key, callback) {
                if (typeof key === "string") {
                    if (Array.isArray(key)) {
                        var arr;
                        for (var item in key) {
                            arr.push(localStorage.getItem(item));
                        }
                    }
                }
                else if (typeof key === "object") {
                    for (var itemName in key) {
                        if (typeof key[itemName] === "object") localStorage.setItem(itemName, JSON.stringify(key[itemName]));
                        else {
                            var tmp = key[itemName];
                            localStorage.setItem(itemName, tmp);
                        }
                    }
                }
                else {}
                callback();
            }
            , remove: function (key, callback) {
                if (typeof key === "string") {
                    if (Array.isArray(key)) {
                        for (var itemName in key) {
                            localStorage.removeItem(itemName);
                        }
                    }
                    else {
                        localStorage.removeItem(key);
                    }
                    callback();
                }
                else if (typeof key === "object") {
                    for (var itemName in key) localStorage.removeItem(itemName);
                    callback();
                }
            }
        }
    }
}
var ViewType = {
    TAB: "tab"
    , POPUP: "popup"
}

function CheckItemInArray(items,array){
    for(var i in array)
        if(i == items)
            return true;
    
    return false;
}