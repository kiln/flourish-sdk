"use strict";

const URL = require("url"),
      path = require("path");

const parse5 = require("parse5"),
      RewriteLinks = require("rewrite-links");

const TA = parse5.treeAdapters.default;

function findChild(node, nodeName, ok_if_not_found) {
	for (let child of TA.getChildNodes(node)) {
		if (child.nodeName == nodeName) return child;
	}
	if (ok_if_not_found) return null;
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
		for (let child of TA.getChildNodes(title_node)) {
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
	for (let child of TA.getChildNodes(fragment)) {
		TA.appendChild(body, child);
	}
}

function rewriteLinks(document, static_prefix) {
	if (!static_prefix.endsWith("/")) static_prefix += "/";
	const rewriter = new RewriteLinks(function(url) {
		// We don’t want to rewrite URLs that are just fragment identifiers
		if (url.startsWith("#")) return url;

		// ... or relative self-links
		if (url == "" || url == ".") return url;

		return URL.resolve(static_prefix, url);
	});

	return rewriter.rewriteDocument(document);
}


function rewrite(url) {
	// We don’t want to rewrite URLs that are just fragment identifiers
	if (url.startsWith("#")) return url;

	// ... or relative self-links
	if (url == "" || url == ".") return url;

	return URL.resolve(args.base, url);
}

function render(template_text, params) {
	const document = parse5.parse(template_text),
	      script_fragment = params.parsed_script || parse5.parseFragment(params.script);

	replaceTitle(document, params.title);
	appendFragmentToBody(document, script_fragment);
	return rewriteLinks(document, params.static)
		.then(parse5.serialize.bind(parse5));
}

module.exports = {
	render
};
