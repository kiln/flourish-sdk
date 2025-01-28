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
        credit_text = credit_text || "A Flourish data visualization";
    var credit = document.createElement("div");
    credit.setAttribute("class", "flourish-credit");
    credit.setAttribute("style", "width:100%!important;margin:0 0 4px!important;text-align:right!important;font-family:Helvetica,sans-serif!important;color:#888!important;font-size:11px!important;font-weight:bold!important;font-style:normal!important;-webkit-font-smoothing:antialiased!important;box-shadow:none!important;");
    var a = document.createElement("a");
    a.setAttribute("href", credit_url + query_string);
    a.setAttribute("target", "_top");
    a.setAttribute("style", "display:inline-block!important;text-decoration:none!important;font:inherit!important;color:inherit!important;border:none!important;margin:0 5px!important;box-shadow:none!important;");
    credit.appendChild(a);
    var img = document.createElement("img");
    img.setAttribute("alt", "Flourish logo");
    img.setAttribute("src", public_url + "resources/bosh.svg");
    img.setAttribute("style", "font:inherit!important;width:auto!important;height:12px!important;border:none!important;margin:0 2px 0!important;vertical-align:middle!important;display:inline-block!important;box-shadow:none!important;");
    a.appendChild(img);
    var span = document.createElement("span");
    span.setAttribute("style", "font:inherit!important;color:#888!important;vertical-align:middle!important;display:inline-block!important;box-shadow:none!important;");
    span.appendChild(document.createTextNode(credit_text));
    a.appendChild(span);
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
