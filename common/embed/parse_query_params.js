"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseQueryParams;
function parseQueryParams() {
    // Query string parameters
    var location = window.location;
    // We use srcdoc to load the decrypted content for password-protected projects,
    // which creates a nested window.
    if (location.href == "about:srcdoc") {
        location = window.parent.location;
    }
    var params = {};
    (function (query, re, match) {
        while (match = re.exec(query)) {
            params[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
        }
    })(location.search.substring(1).replace(/\+/g, "%20"), /([^&=]+)=?([^&]*)/g);
    return params;
}
