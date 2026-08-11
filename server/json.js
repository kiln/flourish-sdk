/* * * * * * GENERATED FILE - DO NOT EDIT * * * * * *
 * * * * * * GENERATED FILE - DO NOT EDIT * * * * * *
 * * * * * * GENERATED FILE - DO NOT EDIT * * * * * */
 
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function escapeChar(c) {
	var hex = c.charCodeAt(0).toString(16);
	while (hex.length < 4) hex = "0" + hex;
	return "\\u" + hex;
}

// Stringify an object (etc.) in a form that can safely be inserted
// into a <script> block in a web page.
function safeStringify(obj) {
	const raw = JSON.stringify(obj);
	if (typeof raw === "undefined") return undefined;
	return raw.replace(/[\u2028\u2029<]/g, escapeChar);
}

function javaScriptStringify(v) {
	var type = typeof v;
	if (v == null) {
		// Catches both null and undefined
		return "null";
	}
	else if (type === "number" || type === "boolean" || type === "bigint" || type === "string" || type === "symbol") {
		return safeStringify(v);
	}
	if (Array.isArray(v)) {
		return "[" + v.map(javaScriptStringify).join(",") + "]";
	}
	else if (v instanceof Date) {
		return "new Date(" + v.getTime() + ")";
	}
	else if (Object.prototype.toString.call(v) === "[object Object]") {
		return "{" + Object.keys(v).map(function (k) {
			return safeStringify(k) + ":" + javaScriptStringify(v[k]);
		}) + "}";
	}
	else {
		throw new Error("javaScriptStringify couldn't handle " + type + " object: " + v);
	}
}

function stringifyDataset(dataset) {
	return "(function(array, column_names, metadata){ array.column_names = column_names; array.metadata = metadata; return array; })(" + javaScriptStringify(dataset) + ", " + safeStringify(dataset.column_names) + ", " + safeStringify(dataset.metadata) + ")";
}

function stringifyPreparedData(data) {
	var s = "{";
	var first = true;
	for (var dataset in data) {
		if (first) first = false; else s += ", ";
		s += safeStringify(dataset) + ": " + stringifyDataset(data[dataset]);
	}
	s += "}";

	return s;
}

exports.javaScriptStringify = javaScriptStringify;
exports.safeStringify = safeStringify;
exports.stringifyPreparedData = stringifyPreparedData;
