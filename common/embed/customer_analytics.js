"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCustomerAnalyticsMessage = sendCustomerAnalyticsMessage;
exports.addAnalyticsListener = addAnalyticsListener;
exports.removeAnalyticsListener = removeAnalyticsListener;
exports.dispatchAnalyticsEvent = dispatchAnalyticsEvent;
exports.initCustomerAnalytics = initCustomerAnalytics;
// Embedded code - must work in IE
var enabled = false;
function getLocationData() {
    var data = {};
    if (window._Flourish_template_id) {
        data.template_id = window._Flourish_template_id;
    }
    if (window.Flourish && window.Flourish.app && window.Flourish.app.loaded_template_id) {
        data.template_id = window.Flourish.app.loaded_template_id;
    }
    if (window._Flourish_visualisation_id) {
        data.visualisation_id = window._Flourish_visualisation_id;
    }
    if (window.Flourish && window.Flourish.app && window.Flourish.app.loaded_visualisation) {
        data.visualisation_id = window.Flourish.app.loaded_visualisation.id;
    }
    if (window.Flourish && window.Flourish.app && window.Flourish.app.story) {
        data.story_id = window.Flourish.app.story.id;
        data.slide_count = window.Flourish.app.story.slides.length;
    }
    if (window.Flourish && window.Flourish.app && window.Flourish.app.current_slide) {
        // One indexed
        data.slide_index = window.Flourish.app.current_slide.index + 1;
    }
    return data;
}
function sendCustomerAnalyticsMessage(message) {
    if (!enabled)
        return;
    if (window.top === window.self)
        return;
    var embedded_window = window;
    if (embedded_window.location.pathname === "srcdoc")
        embedded_window = embedded_window.parent;
    var location_data = getLocationData();
    var message_with_metadata = {
        sender: "Flourish",
        method: "customerAnalytics"
    };
    for (var key in location_data) {
        if (location_data.hasOwnProperty(key)) {
            message_with_metadata[key] = location_data[key];
        }
    }
    for (var key in message) {
        if (message.hasOwnProperty(key)) {
            message_with_metadata[key] = message[key];
        }
    }
    embedded_window.parent.postMessage(JSON.stringify(message_with_metadata), "*");
}
function addAnalyticsListener(callback) {
    if (typeof callback !== "function") {
        throw new Error("Analytics callback is not a function");
    }
    window.Flourish._analytics_listeners.push(callback);
}
function removeAnalyticsListener(callback) {
    if (typeof callback !== "function") {
        throw new Error("Analytics callback is not a function");
    }
    window.Flourish._analytics_listeners = window.Flourish._analytics_listeners.filter(function (listener) {
        return callback !== listener;
    });
}
function dispatchAnalyticsEvent(message) {
    // If the window.Flourish object hasn't been created by the customer, they
    // can't be listening for analytics events
    if (!window.Flourish)
        return;
    window.Flourish._analytics_listeners.forEach(function (listener) {
        listener(message);
    });
}
function initCustomerAnalytics() {
    enabled = true;
    var events = [
        {
            event_name: "click",
            action_name: "click",
            use_capture: true
        },
        {
            event_name: "keydown",
            action_name: "key_down",
            use_capture: true
        },
        {
            event_name: "mouseenter",
            action_name: "mouse_enter",
            use_capture: false
        },
        {
            event_name: "mouseleave",
            action_name: "mouse_leave",
            use_capture: false
        }
    ];
    events.forEach(function (event) {
        document.body.addEventListener(event.event_name, function () {
            sendCustomerAnalyticsMessage({
                action: event.action_name
            });
        }, event.use_capture);
    });
}
