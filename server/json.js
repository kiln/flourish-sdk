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

function stringifyDataset(dataset) {
	return "(function(array, fields){ array.column_names = fields; return array; })(" + safeStringify(dataset) + ", " + safeStringify(dataset.column_names) + ")";
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

exports.safeStringify = safeStringify;
exports.stringifyPreparedData = stringifyPreparedData;
