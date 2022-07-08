// ==UserScript==
// @name         Psuedo Fullscreen
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Removes navigator bar, and fix YouTube resizing problems.
// @author       Tanawat J.
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @grant        none
// ==/UserScript==

let YT_elements = {all_loaded: true};
YT_elements.get = (name) => YT_elements[name];
window.YT_elements = YT_elements;

// Monad is quite useful in this context. Plz don't bully me lmao.
class Monad {
    constructor (name, value, logic) {
        if (typeof name != "string" || !value || typeof logic != "function") return;
        this.name = name;
        this.value = value;
        this.logic = logic;
        return this;
    }
    bind (fn, break_point_name) {
        if (!this.value) return;
        this.value = fn(this.value);
        if (this.name && this.logic(this)) {
            return this;
        }
        console.error(`Monad Error: the value of "${break_point_name || this.name || "unnamed monad"}" in the chain is ${this.value}.`);
    }
}
class YT_element {
    constructor (selector, metadata) {
        metadata.states = [];
        // Basically an "if, else if, else if, ..." on steroids.
        let monad = new Monad("YT element selector", selector, data => {
            if (data.value && data.value != null) return true;
            //Error handeling.
            YT_elements.all_loaded = false;
        })
        .bind(() => metadata, "YT element metadata")
        .bind(metadata => {metadata.el = document.querySelectorAll(selector); return metadata.el;})
        .bind(el => metadata.name, "YT element name")
        .bind(name => metadata).value;
        for ( let i in monad ) {
            this[i] = monad[i];
        }
        window.YT_elements[this.name] = this;
        return this;
    }
    listen (ev, fn) {
        for(let i in this.el){
            this.el[i].addEventListener(ev, fn);
        }
        return this;
    }
    newState (state, fn) {
        this.states[state] = fn;
        return this;
    }
    setState (state) {
        this.states[state](this);
        return this;
    }
}

main();
document.addEventListener('yt-navigate-start', main);
window.addEventListener('popstate', main);

function main () {
    'use strict';
    // Navigator page height regulator
    new YT_element("#page-manager", {
        name: "YT_page_manager"
    }).el[0].style.transition = "all .5s ease";
    // Navigator wrapper
    new YT_element("#masthead-container", {
        name: "YT_navigator"
    }).newState("hidden", (yt) => {
        YT_elements.get("YT_page_manager").el[0].style["margin-top"]="0";
        yt.el[0].style["max-height"] = "0";
        yt.el[0].style.overflow = "hidden";
        yt.el[0].style.opacity = "0";
    }).newState("show", (yt) => {
        YT_elements.get("YT_page_manager").el[0].style["margin-top"]="var(--ytd-masthead-height,var(--ytd-toolbar-height))";
        yt.el[0].style["max-height"] = "10vh";
        yt.el[0].style.overflow = "unset";
        yt.el[0].style.opacity = "1";
    }).setState("show").el[0].style.transition = "all 1s ease";
    // Theater button
    new YT_element(".ytp-size-button", {
        name: "YT_theater_btn"
    });
    // Video tag
    new YT_element(".html5-main-video", {
        name: "YT_video"
    });
    // Fullscreen button
    new YT_element(".ytp-fullscreen-button", {
        name: "YT_fullscreen_btn"
    });
    // Check conditions.
    if(document.location.href.indexOf("https://www.youtube.com/watch") != 0) return;
    if (!YT_elements.all_loaded) {
        // Try to reload if not all elements are loaded.
        YT_elements.all_loaded = true;
        return window.setTimeout(main, 2500);
    }
    // Theater wrapper
    const nav = YT_elements.get("YT_navigator");
    function update_theater () {
        const theater = new YT_element("#player-theater-container", {
            name: "YT_theater_container"
        });
        theater.el[0].style.transition = "opacity 1s ease";
        theater.newState("full", (yt) => {
            yt.el[0].style["min-height"] = "100vh";
            yt.el[0].style.opacity = "1";
        }).newState("original", (yt) => {
            yt.el[0].style["min-height"] = "0px";
            yt.el[0].style.opacity = "0";
        });
        if(theater.el[0].innerHTML) {
            nav.setState("show");
            theater.setState("original");
        } else {
            nav.setState("hidden");
            theater.setState("full");
        }
    }
    window.setTimeout(function() {
        let theater = document.getElementById("player-theater-container");
        if (theater?.innerHTML) {
            nav.setState("hidden");
            theater.style["min-height"] = "100vh";
            theater.style.opacity = "1";
            window.dispatchEvent(new Event('resize'));
        }
    }, 1200);
    YT_elements.get("YT_theater_btn").listen("click", update_theater);
};
