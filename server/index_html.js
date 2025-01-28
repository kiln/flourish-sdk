"use strict";
const URL = require("url");
const parse5 = require("parse5"), RewriteLinks = require("rewrite-links");
const { defaultTreeAdapter: TA } = require("parse5");
function findChild(node, nodeName, ok_if_not_found) {
    for (const child of TA.getChildNodes(node)) {
        if (child.nodeName == nodeName) {
            return child;
        }
    }
    if (ok_if_not_found) {
        return null;
    }
    throw new Error("Node not found: " + nodeName);
}
function findHtmlNode(document) {
    return findChild(document, "html");
}
function findHead(document) {
    return findChild(findHtmlNode(document), "head");
}
function findBody(document) {
    return findChild(findHtmlNode(document), "body");
}
function replaceTitle(document, title) {
    const head = findHead(document);
    let title_node = findChild(head, "title", true);
    if (title_node) {
        for (const child of TA.getChildNodes(title_node)) {
            TA.detachNode(child);
        }
    }
    else {
        title_node = TA.createElement("title", head.namespaceURI, []);
        TA.appendChild(head, title_node);
    }
    TA.insertText(title_node, title);
}
function appendFragmentToBody(document, fragment) {
    const body = findBody(document);
    for (const child of TA.getChildNodes(fragment)) {
        TA.appendChild(body, child);
    }
}
function insertOembedLink(document, oembed_url) {
    const head = findHead(document);
    const link_node = TA.createElement("link", head.namespaceURI, [
        { name: "rel", value: "alternate" },
        { name: "type", value: "application/json+oembed" },
        { name: "href", value: oembed_url },
    ]);
    TA.appendChild(head, link_node);
}
function insertCanonicalLink(document, canonical_url) {
    const head = findHead(document);
    const link_node = TA.createElement("link", head.namespaceURI, [
        { name: "rel", value: "canonical" },
        { name: "href", value: canonical_url },
    ]);
    TA.appendChild(head, link_node);
}
function rewriteLinks(document, static_prefix) {
    if (!static_prefix.endsWith("/")) {
        static_prefix += "/";
    }
    const rewriter = new RewriteLinks(function (url) {
        // We don’t want to rewrite URLs that are just fragment identifiers
        if (url.startsWith("#")) {
            return url;
        }
        // ... or relative self-links
        if (url == "" || url == ".") {
            return url;
        }
        return URL.resolve(static_prefix, url); // eslint-disable-line node/no-deprecated-api
    });
    return rewriter.rewriteDocument(document);
}
async function render(template_text, params) {
    const document = parse5.parse(template_text), script_fragment = params.parsed_script || parse5.parseFragment(params.script);
    replaceTitle(document, params.title);
    if (params.canonical_url) {
        insertCanonicalLink(document, params.canonical_url);
    }
    if (params.oembed_url) {
        insertOembedLink(document, params.oembed_url);
    }
    appendFragmentToBody(document, script_fragment);
    const rewritten_document = await rewriteLinks(document, params.static);
    return parse5.serialize(rewritten_document);
}
exports.render = render;
//# sourceMappingURL=index_html.js.map