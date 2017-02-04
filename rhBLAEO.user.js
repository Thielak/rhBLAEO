// ==UserScript==
// @name rhBLAEO
// @namespace revilheart
// @author revilheart
// @description Adds some cool features to BLAEO.
// @version 1.3.1
// @match http://backlog-deepness.rhcloud.com/*
// @match https://backlog-deepness.rhcloud.com/*
// @grant GM_xmlhttpRequest
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_deleteValue
// @grant GM_listValues
// @connect api.steampowered.com
// @run-at document-idle
// ==/UserScript==

(function() {
    "use strict";
    var DOM_Parser, DOM;    
    DOM_Parser = new DOMParser();
    DOM = {
        parse: function(HTML) {
            return DOM_Parser.parseFromString(HTML, "text/html");
        },
    };
    setDefaultValues();
    document.addEventListener("turbolinks:load", function() {
        loadFeatures();
    });
    loadFeatures();
    
    function setDefaultValues() {
        var DefaultValues, Key;
        DefaultValues = {
            Username: "?",
            SteamID64: "",
            SteamAPIKey: "",
            OwnedGames: [],
            LastSync: 0,
            TLCCurrentMonth: "",
            TLCList: "",
            TLCGames: [],
        };
        for (Key in DefaultValues) {
            if (typeof GM_getValue(Key) == "undefined") {
                GM_setValue(Key, DefaultValues[Key]);
            }
        }
    }

    function loadFeatures() {
        var TLCList;
        if (window.location.href.match(/\/settings\//)) {
            addSMButton();
        } else if (GM_getValue("SteamAPIKey")) {
            TLCList = GM_getValue("TLCList");
            if (!TLCList || (GM_getValue("TLCCurrentMonth") != getCurrentMonth())) {
                getTLCList();
            } else if (window.location.href.match(TLCList)) {
                checkTLCList();
            }
        }
    }

    function addSMButton() {
        var Navigation, SMButton;
        Navigation = document.getElementsByClassName("nav-pills")[0];
        Navigation.insertAdjacentHTML(
            "beforeEnd",
            "<li id=\"SMButton\"><a href=\"#rhBLAEO\">rhBLAEO</a></li>"
        );
        SMButton = document.getElementById("SMButton");
        SMButton.addEventListener("click", function() {
            window.location.hash = "#rhBLAEO";
            loadSMMenu();
        });
        if (window.location.href.match(/#rhBLAEO/)) {
            loadSMMenu();
        }

        function loadSMMenu() {
            var SMSteamAPIKey, SMSave, SMLastSync, SMSync, LastSync;
            Navigation.getElementsByClassName("active")[0].classList.remove("active");
            SMButton.classList.add("active");
            document.getElementsByClassName("col-sm-9")[0].innerHTML =
                "<div class=\"form-group\">" +
                "    <label class=\"control-label\">Steam API Key</label>" +
                "    <input class=\"form-control\" id=\"SMSteamAPIKey\" type=\"text\" value=\"" + GM_getValue("SteamAPIKey") + "\" style=\"margin: 0 0 10px;\"/>" +
                "    <div>" +
                "        <button class=\"btn btn-primary\" id=\"SMSave\" type=\"submit\">Save</button>" +
                "    </div>" +
                "</div>" +
                "<div class=\"form-group\">" +
                "    <label class=\"control=label\">Sync</label>" +
                "    <p>Your current username is <b id=\"SMUsername\">" + GM_getValue("Username") + "</b> and you have" +
                "    <b id=\"SMOwnedGames\">" + GM_getValue("OwnedGames").length + "</b> games in your library, right?</p>" +
                "    <p>" +
                "        <i>Last synced <span id=\"SMLastSync\"></span>.</i>" +
                "    </p>" +
                "    <div>" +
                "        <button class=\"btn btn-primary\" id=\"SMSync\" type=\"submit\">Sync</button>" +
                "    </div>" +
                "</div>";
            SMSteamAPIKey = document.getElementById("SMSteamAPIKey");
            SMSave = document.getElementById("SMSave");
            SMLastSync = document.getElementById("SMLastSync");
            SMSync = document.getElementById("SMSync");
            SMSave.addEventListener("click", function() {
                GM_setValue("SteamAPIKey", SMSteamAPIKey.value);
                saveSMSettings(setSMSync);
            });
            LastSync = GM_getValue("LastSync");
            SMLastSync.textContent = LastSync ? new Date(LastSync).toLocaleString() : "never";
            SMSync.addEventListener("click", setSMSync);

            function saveSMSettings(Callback) {
                SMSave.textContent = "Saving...";
                if (!GM_getValue("Username")) {
                    GM_setValue("Username", document.getElementsByClassName("navbar-btn")[0].href.match(/\/users\/(.*?)$/)[1]);
                }
                if (!GM_getValue("SteamID64")) {
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: "/users/" + GM_getValue("Username"),
                        onload: function(Response) {
                            GM_setValue("SteamID64", DOM.parse(Response.responseText).getElementsByClassName("btn-profile")[0].href.match(/\/profiles\/(.*?)$/)[1]);
                            SMSave.textContent = "Save";
                            Callback();
                        },
                    });
                } else {
                    SMSave.textContent = "Save";
                    Callback();
                }
            }

            function setSMSync() {
                SMSync.textContent = "Syncing...";
                syncStorage(function() {
                    document.getElementById("SMUsername").textContent = GM_getValue("Username");
                    document.getElementById("SMOwnedGames").textContent = GM_getValue("OwnedGames").length;
                    SMLastSync.textContent = new Date(GM_getValue("LastSync")).toLocaleString();
                    SMSync.textContent = "Sync";
                });
            }
        }
    }

    function syncStorage(Callback) {
        var OwnedGames;
        GM_setValue("Username", document.getElementsByClassName("navbar-btn")[0].href.match(/\/users\/(.*?)$/)[1]);
        OwnedGames = [];
        GM_xmlhttpRequest({
            method: "GET",
            url: "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=" + GM_getValue("SteamAPIKey") + "&steamid=" + GM_getValue("SteamID64") + "&format=json",
            onload: function(Response) {
                var I, N, Games;
                Games = JSON.parse(Response.responseText).response.games;
                for (I = 0, N = Games.length; I < N; ++I) {
                    OwnedGames.push(Games[I].appid);
                }
                GM_setValue("OwnedGames", OwnedGames);
                GM_setValue("LastSync", new Date().getTime());
                Callback();
            },
        });
    }

    function getCurrentMonth() {
        var CurrentMonth;
        CurrentMonth = new Date();
        CurrentMonth = ((CurrentMonth.getMonth() + 1) < 10) ? (
            CurrentMonth.getFullYear() + "-0" + (CurrentMonth.getMonth() + 1)) : (CurrentMonth.getFullYear() + "-" + (CurrentMonth.getMonth() + 1));
        return CurrentMonth;
    }

    function getTLCList() {
        var TLCCurrentMonth;
        TLCCurrentMonth = getCurrentMonth();
        GM_xmlhttpRequest({
            method: "GET",
            url: "/themes/" + TLCCurrentMonth,
            onload: function(Response) {
                var List;
                List = DOM.parse(Response.responseText).querySelector("[id*='theme-list']");
                if (List) {
                    GM_setValue("TLCList", List.getAttribute("href").match(/\/posts\/(.*?)$/)[1]);
                    GM_setValue("TLCCurrentMonth", TLCCurrentMonth);
                }
            },
        });
    }

    function checkTLCList() {
        var I, N, Items, TLCGames, OwnedGames, AppID;
        Items = document.getElementsByClassName("panel-default")[0].getElementsByTagName("ul")[0].children;
        TLCGames = GM_getValue("TLCGames");
        OwnedGames = GM_getValue("OwnedGames");
        for (I = 0, N = Items.length; I < N; ++I) {
            AppID = parseInt(Items[I].firstElementChild.href.match(/\d+/)[0]);
            if (TLCGames.indexOf(AppID) < 0) {
                TLCGames.push(AppID);
                tagTLCNew(Items[I]);
                if (OwnedGames.indexOf(AppID) >= 0) {
                    tagTLCOwned(Items[I]);
                }
            } else if (OwnedGames.indexOf(AppID) >= 0) {
                tagTLCOwned(Items[I]);
            }
        }
        GM_setValue("TLCGames", TLCGames);
        tagTLCStatus("Beaten", Items, "rgb(92 ,184, 92)", function() {
            tagTLCStatus("Completed", Items, "rgb(91, 192, 222)", function() {
                document.querySelector("[id*='counter']").innerHTML =
                    "<font size=\"4\"><b>" + Items.length + " Games</b></font>";
            });
        });
    }

    function tagTLCNew(Item) {
        Item.insertAdjacentHTML(
            "beforeEnd",
            "<b style=\"color: rgb(85, 85, 85);\"> [New]</b>"
        );
    }

    function tagTLCOwned(Item) {
        Item.insertAdjacentHTML(
            "beforeEnd",
            "<b style=\"color: rgb(217, 83, 79);\"> [Owned]</b>"
        );
    }

    function tagTLCStatus(Status, Items, Color, Callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: "/users/" + GM_getValue("Username") + "/games/" + Status.toLowerCase(),
            onload: function(Response) {
                var I, N, AppID;
                for (I = 0, N = Items.length; I < N; ++I) {
                    AppID = Items[I].firstElementChild.href.match(/\d+/)[0];
                    if ((new RegExp("/app/" + AppID)).exec(Response.responseText)) {
                        Items[I].insertAdjacentHTML(
                            "beforeEnd",
                            "<b style=\"color: " + Color + ";\"> [" + Status + "]</b>"
                        );
                    }
                }
                Callback();
            },
        });
    }
})();
