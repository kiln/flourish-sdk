"use strict";
/* This file is used by the story player, and must be IE-compatible */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const customer_analytics_1 = require("./customer_analytics");
const dompurify_1 = __importDefault(require("dompurify"));
const parse_query_params_1 = __importDefault(require("./parse_query_params"));
var is_fixed_height;
var is_amp;
function isFixedHeight() {
    if (is_fixed_height == undefined) {
        var params = (0, parse_query_params_1.default)();
        // "referrer" in params implies this is an Embedly embed
        // Check whether embedding site is known to support dynamic resizing
        if ("referrer" in params) {
            is_fixed_height = /^https:\/\/medium.com\//.test(params.referrer);
        }
        else {
            is_fixed_height = !("auto" in params);
        }
    }
    return is_fixed_height;
}
function getHeightForBreakpoint(width) {
    var breakpoint_width = width || window.innerWidth;
    if (breakpoint_width > 999) {
        return 650;
    }
    if (breakpoint_width > 599) {
        return 575;
    }
    return 400;
}
function initScrolly(opts) {
    if (!opts) {
        return;
    }
    if (window.top === window.self) {
        return;
    }
    var embedded_window = window;
    if (embedded_window.location.pathname == "srcdoc") {
        embedded_window = embedded_window.parent;
    }
    var message = {
        sender: "Flourish",
        method: "scrolly",
        captions: opts.captions,
    };
    embedded_window.parent.postMessage(JSON.stringify(message), "*");
}
function notifyParentWindow(height, opts) {
    if (window.top === window.self) {
        return;
    }
    var embedded_window = window;
    if (embedded_window.location.pathname == "srcdoc") {
        embedded_window = embedded_window.parent;
    }
    if (is_amp) {
        // Message is not stringified for AMP
        height = parseInt(height, 10);
        embedded_window.parent.postMessage({
            sentinel: "amp",
            type: "embed-size",
            height: height,
        }, "*");
        return;
    }
    var message = {
        sender: "Flourish",
        context: "iframe.resize",
        method: "resize", // backwards compatibility
        height: height,
        src: embedded_window.location.toString(),
    };
    if (opts) {
        for (var name in opts) {
            message[name] = opts[name];
        }
    }
    embedded_window.parent.postMessage(JSON.stringify(message), "*");
}
function isSafari() {
    // Some example user agents:
    // Safari iOS: Mozilla/5.0 (iPhone; CPU iPhone OS 12_1_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1
    // Chrome OS X: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36
    // Embedded WkWebview on iOS: Mozilla/5.0 (iPhone; CPU iPhone OS 12_1_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16D5039a
    return (navigator.userAgent.indexOf("Safari") !== -1 || navigator.userAgent.indexOf("iPhone") !== -1) && navigator.userAgent.indexOf("Chrome") == -1;
}
function isString(s) {
    return typeof s === "string" || s instanceof String;
}
function isPossibleHeight(n) {
    if (typeof n === "number") {
        return !isNaN(n) && (n >= 0);
    }
    else if (isString(n)) {
        // First regex checks there is at least one digit in n and rejectsedge cases like "" and "px" that would pass second regex
        // Given first regex, second regex makes sure that n is either a pure number or a number with a valid CSS unit
        // Units based on https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units#lengths plus %
        return /\d/.test(n) && /^[0-9]*(\.[0-9]*)?(cm|mm|Q|in|pc|pt|px|em|ex|ch|rem|lh|vw|vh|vmin|vmax|%)?$/i.test(n);
    }
    return false;
}
function validateWarnMessage(message) {
    if (message.method !== "warn") {
        console.warn("BUG: validateWarnMessage called for method" + message.method);
        return false;
    }
    if ((message.message != null) && !isString(message.message)) {
        return false;
    }
    if ((message.explanation != null) && !isString(message.explanation)) {
        return false;
    }
    return true;
}
function validateResizeMessage(message) {
    if (message.method !== "resize") {
        console.warn("BUG: validateResizeMessage called for method" + message.method);
        return false;
    }
    if (!isString(message.src)) {
        return false;
    }
    if (!isString(message.context)) {
        return false;
    }
    if (!isPossibleHeight(message.height)) {
        return false;
    }
    return true;
}
function validateSetSettingMessage(_message) {
    throw new Error("Validation for setSetting is not implemented yet; see issue #4328");
}
function validateScrolly(message) {
    if (message.method !== "scrolly") {
        console.warn("BUG: validateScrolly called for method" + message.method);
        return false;
    }
    if (!Array.isArray(message.captions)) {
        return false;
    }
    return true;
}
function validateCustomerAnalyticsMessage(message) {
    if (message.method !== "customerAnalytics") {
        console.warn("BUG: validateCustomerAnalyticsMessage called for method" + message.method);
        return false;
    }
    // We don't consume customer analytics messages; they're just passed
    // on, and their structure is up to the customer, so there's no
    // point in validating them.
    return true;
}
function validateRequestUpload(message) {
    if (message.method !== "request-upload") {
        console.warn("BUG: validateResizeMessage called for method" + message.method);
        return false;
    }
    // FIXME: when adding validation for setSetting (see above) we should
    // also validate that this is a valid setting name of appropriate type
    if (!isString(message.name)) {
        return false;
    }
    if (!(message.accept == null || isString(message.accept))) {
        return false;
    }
    return true;
}
function getMessageValidators(methods) {
    var available_message_validators = {
        "warn": validateWarnMessage,
        "resize": validateResizeMessage,
        "setSetting": validateSetSettingMessage,
        "customerAnalytics": validateCustomerAnalyticsMessage,
        "request-upload": validateRequestUpload,
        "scrolly": validateScrolly,
    };
    var validators = {};
    for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        if (available_message_validators[method]) {
            validators[method] = available_message_validators[method];
        }
        else {
            throw new Error("No validator found for method " + method);
        }
    }
    return validators;
}
function startEventListeners(callback, allowed_methods, embed_domain) {
    var message_validators = getMessageValidators(allowed_methods);
    window.addEventListener("message", function (event) {
        var is_accepted_event_origin = (function () {
            if (event.origin == document.location.origin) {
                return true;
            }
            // If company has configured a custom origin for downloaded projects, allow it
            if (embed_domain) {
                const origin = event.origin.toLowerCase();
                embed_domain = embed_domain.toLowerCase();
                // Allow the domain itself…
                if (origin.endsWith("//" + embed_domain)) {
                    return true;
                }
                // and subdomains
                if (origin.endsWith("." + embed_domain)) {
                    return true;
                }
            }
            if (event.origin.match(/\/\/localhost:\d+$|\/\/(?:public|app)\.flourish.devlocal$|\/\/flourish-api\.com$|\.flourish\.(?:local(:\d+)?|net|rocks|studio)$|\.uri\.sh$|\/\/flourish-user-templates\.com$/)) {
                return true;
            }
            return false;
        })();
        // event.source is null when the message is sent by an extension
        // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#Using_window.postMessage_in_extensions
        if (event.source == null) {
            return;
        }
        if (!is_accepted_event_origin) {
            return;
        }
        var message;
        try {
            message = typeof event.data === "object" ? event.data : JSON.parse(event.data);
        }
        catch (e) {
            console.warn("Unexpected non-JSON message: " + JSON.stringify(event.data));
            return;
        }
        if (message.sender !== "Flourish") {
            return;
        }
        if (!message.method) {
            console.warn("The 'method' property was missing from message", message);
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(message_validators, message.method)) {
            console.warn("No validator implemented for message", message);
            return;
        }
        if (!message_validators[message.method](message)) {
            console.warn("Validation failed for the message", message);
            return;
        }
        var frames = document.querySelectorAll("iframe");
        for (var i = 0; i < frames.length; i++) {
            if (frames[i].contentWindow == event.source || frames[i].contentWindow == event.source.parent) {
                callback(message, frames[i]);
                return;
            }
        }
        console.warn("could not find frame", message);
    });
    if (isSafari()) {
        window.addEventListener("resize", onSafariWindowResize);
        onSafariWindowResize();
    }
}
function onSafariWindowResize() {
    // Ensure all iframes without explicit width attribute are sized to fit their container
    var containers = document.querySelectorAll(".flourish-embed");
    for (var i = 0; i < containers.length; i++) {
        var container = containers[i];
        if (container.getAttribute("data-width")) {
            continue;
        }
        var iframe = container.querySelector("iframe");
        // When embeds are dynamically loaded, we might have a container without a
        // loaded iframe yet
        if (!iframe) {
            continue;
        }
        var computed_style = window.getComputedStyle(container);
        var width = container.offsetWidth - parseFloat(computed_style.paddingLeft) - parseFloat(computed_style.paddingRight);
        iframe.style.width = width + "px";
    }
}
function createScrolly(iframe, captions) {
    var parent = iframe.parentNode;
    // Fallback to avoid any situation where the scrolly gets initialised twice
    if (parent.classList.contains("fl-scrolly-wrapper")) {
        console.warn("createScrolly is being called more than once per story. This should not happen.");
        return;
    }
    parent.classList.add("fl-scrolly-wrapper");
    parent.style.position = "relative";
    parent.style.paddingBottom = "1px";
    parent.style.transform = "translate3d(0, 0, 0)"; // Workaround for Safari https://stackoverflow.com/questions/50224855/not-respecting-z-index-on-safari-with-position-sticky
    iframe.style.position = "sticky";
    var h = parent.getAttribute("data-height") || null;
    if (!h) { // Scrollies require fixed height to work well, so if not height set …
        h = "80vh"; // … use a sensible fallback
        iframe.style.height = h; // And update the iframe height directly
    }
    iframe.style.top = "calc(50vh - " + h + "/2)";
    var credit = parent.querySelector(".flourish-credit");
    if (credit) {
        credit.style.position = "sticky";
        credit.style.top = "calc(50vh + " + h + "/2)";
    }
    captions.forEach(function (d, i) {
        var has_content = typeof d == "string" && d.trim() != "";
        var step = document.createElement("div");
        step.setAttribute("data-slide", i);
        step.classList.add("fl-scrolly-caption");
        step.style.position = "relative";
        step.style.transform = "translate3d(0,0,0)"; // Workaround for Safari https://stackoverflow.com/questions/50224855/not-respecting-z-index-on-safari-with-position-sticky
        step.style.textAlign = "center";
        step.style.maxWidth = "500px";
        step.style.height = "auto";
        step.style.marginTop = "0";
        step.style.marginBottom = has_content ? "100vh" : "50vh";
        step.style.marginLeft = "auto";
        step.style.marginRight = "auto";
        var caption = document.createElement("div");
        // eslint-disable-next-line flourish-security/dompurify
        caption.innerHTML = dompurify_1.default.sanitize(d, { ADD_ATTR: ["target"] });
        caption.style.visibility = has_content ? "" : "hidden";
        caption.style.display = "inline-block";
        caption.style.paddingTop = "1.25em";
        caption.style.paddingRight = "1.25em";
        caption.style.paddingBottom = "1.25em";
        caption.style.paddingLeft = "1.25em";
        caption.style.background = "rgba(255,255,255,0.9)";
        caption.style.boxShadow = "0px 0px 10px rgba(0,0,0,0.2)";
        caption.style.borderRadius = "10px";
        caption.style.textAlign = "center";
        caption.style.maxWidth = "100%";
        caption.style.margin = "0 20px";
        caption.style.overflowX = "hidden";
        step.appendChild(caption);
        parent.appendChild(step);
    });
    initIntersection(parent);
}
function initIntersection(container) {
    var t = "0%"; // Trigger when hits viewport; could be set by user in the future
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var iframe = container.querySelector("iframe");
                if (iframe) {
                    iframe.src = iframe.src.replace(/#slide-.*/, "") + "#slide-" + entry.target.getAttribute("data-slide");
                }
            }
        });
    }, { rootMargin: "0px 0px -" + t + " 0px" });
    var steps = container.querySelectorAll(".fl-scrolly-caption");
    for (var i = 0; i < steps.length; i++) {
        observer.observe(steps[i]);
    }
    // Set a max width on any images in the captions, to avoid ugly overflowing
    // in the rare cases where the
    // This won't happen much, but it is possible to paste an image into a
    // story caption, so better to handle this nicely since there's no other
    // way for the user to set it.
    var images = container.querySelectorAll(".fl-scrolly-caption img");
    images.forEach(function (img) { img.style.maxWidth = "100%"; });
}
function createEmbedIframe(embed_url, container, width, height, play_on_load) {
    var iframe = document.createElement("iframe");
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("title", "Interactive or visual content");
    iframe.setAttribute("sandbox", "allow-same-origin allow-forms allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation");
    container.appendChild(iframe);
    // If the iframe doesn't have an offset parent, either the element or a parent
    // is set to display: none. This can cause problems with visualisation loading, so
    // we need to poll for the iframe being displayed before loading the visualisation.
    // FIXME: In Chrome, fixed position elements also return null for `offsetParent`.
    // The chances of an embed which is both position: fixed and display: none are
    // pretty small, so fuhgeddaboudit . If it's an issue in the future, we'll have to
    // recurse through the parent elements to make sure the iframe is displaying.
    if (iframe.offsetParent || getComputedStyle(iframe).position === "fixed") {
        setIframeContent(embed_url, container, iframe, width, height, play_on_load);
    }
    else {
        var poll_item = {
            embed_url: embed_url,
            container: container,
            iframe: iframe,
            width: width,
            height: height,
            play_on_load: play_on_load,
        };
        // If this is the first embed on the page which is isn't displayed, set up a
        // list of hidden iframes to poll
        if (!window._flourish_poll_items) {
            window._flourish_poll_items = [poll_item];
        }
        else {
            // Otherwise, add this to the list of iframes which are being polled
            window._flourish_poll_items.push(poll_item);
        }
        if (window._flourish_poll_items.length > 1) {
            // If there were already items in the array then we have already started
            // polling in a different embed script, so we can return. This iframe will
            // have its contents set by the other embed script.
            return iframe;
        }
        // Poll to see whether any of the iframes have started displaying
        var interval = setInterval(function () {
            window._flourish_poll_items = window._flourish_poll_items.filter(function (item) {
                if (!item.iframe.offsetParent) {
                    // It's still not displaying, so return true to leave it in the array
                    return true;
                }
                // It's displaying, so set the content, and return false to remove it from
                // the array
                setIframeContent(item.embed_url, item.container, item.iframe, item.width, item.height, item.play_on_load);
                return false;
            });
            if (!window._flourish_poll_items.length) {
                // All of the iframes are displaying, so we can stop polling. If another
                // embed is added later, a new interval will be created by that embed script.
                clearInterval(interval);
            }
        }, 500);
    }
    return iframe;
}
function setIframeContent(embed_url, container, iframe, width, height, play_on_load) {
    var width_in_px;
    if (width && typeof width === "number") {
        width_in_px = width;
        width = "" + width + "px";
    }
    // The regular expression below detects widths that have been explicitly
    // expressed in px units. (It turns out CSS is more complicated than you may
    // have realised.)
    else if (width && width.match(/^[ \t\r\n\f]*([+-]?\d+|\d*\.\d+(?:[eE][+-]?\d+)?)(?:\\?[Pp]|\\0{0,4}[57]0(?:\r\n|[ \t\r\n\f])?)(?:\\?[Xx]|\\0{0,4}[57]8(?:\r\n|[ \t\r\n\f])?)[ \t\r\n\f]*$/)) {
        width_in_px = parseFloat(width);
    }
    if (height && typeof height === "number") {
        height = "" + height + "px";
    }
    // Odd design decision in Safari means need to set fixed width rather than %
    // as will try and size iframe to content otherwise. Must also set scrolling=no
    if (width) {
        iframe.style.width = width;
    }
    else if (isSafari()) {
        iframe.style.width = container.offsetWidth + "px";
    }
    else {
        iframe.style.width = "100%";
    }
    var fixed_height = !!height;
    if (!fixed_height) {
        if (embed_url.match(/\?/)) {
            embed_url += "&auto=1";
        }
        else {
            embed_url += "?auto=1";
        }
        // For initial height, use our standard breakpoints, based on the explicit
        // pixel width if we know it, or the iframe's measured width if not.
        height = getHeightForBreakpoint(width_in_px || iframe.offsetWidth) + "px";
    }
    if (height) {
        if (height.charAt(height.length - 1) === "%") {
            height = (parseFloat(height) / 100) * container.parentNode.offsetHeight + "px";
        }
        iframe.style.height = height;
    }
    iframe.setAttribute("src", embed_url + (play_on_load ? "#play-on-load" : ""));
    return iframe;
}
function initEmbedding() {
    is_amp = window.location.hash == "#amp=1";
    return {
        createEmbedIframe: createEmbedIframe,
        isFixedHeight: isFixedHeight,
        getHeightForBreakpoint: getHeightForBreakpoint,
        startEventListeners: startEventListeners,
        notifyParentWindow: notifyParentWindow,
        initScrolly: initScrolly,
        createScrolly: createScrolly,
        isSafari: isSafari,
        initCustomerAnalytics: customer_analytics_1.initCustomerAnalytics,
        addAnalyticsListener: customer_analytics_1.addAnalyticsListener,
        sendCustomerAnalyticsMessage: customer_analytics_1.sendCustomerAnalyticsMessage,
    };
}
exports.default = initEmbedding;
