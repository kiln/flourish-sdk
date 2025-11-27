"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFlourishCredit = createFlourishCredit;
exports.getLocalizedCreditTextAndUrl = getLocalizedCreditTextAndUrl;
const localizations_1 = __importDefault(require("./localizations"));
function createFlourishCredit(credit_url, query_string, public_url, credit_text) {
    credit_url = credit_url || "https://flourish.studio",
        query_string = query_string || "?utm_source=api&utm_campaign=" + window.location.href,
        public_url = public_url || "https://public.flourish.studio/",
        credit_text = credit_text || "Made with Flourish • Create your own";
    var credit = document.createElement("div");
    credit.setAttribute("class", "flourish-credit");
    credit.setAttribute("style", "margin:4px 8px;text-align:right;font-family:system-ui,sans-serif;color:inherit;opacity:0.8;font-size:12px;font-weight:normal;font-style:normal;-webkit-font-smoothing:antialiased;box-shadow:none;");
    // Split credit text into prefix and CTA (linked part)
    // If no bullet (•) is present, the entire text will be linked
    var parts = credit_text.split("•");
    var UNICODE_NO_BREAK_SPACE = "\u00A0"; // Simple spacing without introducing line breaking
    var prefix_text = parts.length > 1 ? parts[0].trim() + `${UNICODE_NO_BREAK_SPACE}•${UNICODE_NO_BREAK_SPACE}` : "";
    var cta_text = parts.length > 1 ? parts[1].trim() : credit_text;
    if (prefix_text) {
        var prefix = document.createElement("span");
        prefix.setAttribute("style", "font:inherit;color:inherit;vertical-align:middle;display:inline-block;box-shadow:none;");
        prefix.appendChild(document.createTextNode(prefix_text));
        credit.appendChild(prefix);
    }
    var a = document.createElement("a");
    a.setAttribute("href", credit_url + query_string);
    a.setAttribute("target", "_blank");
    a.setAttribute("aria-label", cta_text + " (opens in new tab)");
    a.setAttribute("rel", "noopener noreferrer");
    a.setAttribute("style", "display:inline-block;text-decoration:none;font:inherit;color:inherit;border:none;box-shadow:none;");
    credit.appendChild(a);
    var span = document.createElement("span");
    span.setAttribute("style", "font:inherit;color:inherit;vertical-align:middle;display:inline-block;box-shadow:none;");
    span.appendChild(document.createTextNode(cta_text));
    a.appendChild(span);
    span.addEventListener("mouseover", () => {
        span.style.textDecoration = "underline";
    });
    span.addEventListener("mouseout", () => {
        span.style.textDecoration = "none";
    });
    return credit;
}
function getLocalizedCreditTextAndUrl(lang, credit_key) {
    var credit_text, credit_url;
    lang = lang || "en", credit_key = credit_key || "";
    credit_text = localizations_1.default[lang].credits[credit_key] || localizations_1.default.en.credits[credit_key] || localizations_1.default.en.credits.default;
    if (typeof credit_text == "object") {
        if (credit_text.url) {
            credit_url = credit_text.url;
        }
        credit_text = credit_text.text;
    }
    return {
        credit_text: credit_text,
        credit_url: credit_url,
    };
}
