/* * * * * * GENERATED FILE - DO NOT EDIT * * * * * *
 * * * * * * GENERATED FILE - DO NOT EDIT * * * * * *
 * * * * * * GENERATED FILE - DO NOT EDIT * * * * * */
 
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function parseColumn(col_spec) {
	col_spec = col_spec.toUpperCase();
	if (!/^[A-Z]+$/.test(col_spec)) {
		throw new Error("Invalid column spec: " + col_spec);
	}

	var col_ix = 0;
	for (var i = 0; i < col_spec.length; i++) {
		col_ix = col_ix * 26 + (col_spec.charCodeAt(i) - 64);
	}
	return col_ix - 1;
}

function printColumn(col_ix) {
	col_ix += 1;
	var col_spec = "";
	while (col_ix > 0) {
		var q = Math.floor(col_ix / 26),
		    r = col_ix % 26;

		if (r == 0) {
			q -= 1;
			r += 26;
		}

		col_spec = String.fromCharCode(64 + r) + col_spec;
		col_ix = q;
	}
	return col_spec;
}

function parseRange(col_range) {
	var dash_mo = col_range.match(/\s*(?:[-–—:]|\.\.)\s*/);
	if (!dash_mo) throw new Error("Failed to parse column range: " + col_range);

	var first = col_range.substr(0, dash_mo.index),
	    last = col_range.substr(dash_mo.index + dash_mo[0].length);

	var first_ix = parseColumn(first),
	    last_ix = parseColumn(last);

	var r = [];
	var incrementer = last_ix >= first_ix ? 1 : -1;
	var n = Math.abs(last_ix - first_ix) + 1;

	for (var i = 0; i < n; i++) {
		r.push(first_ix + i*incrementer);
	}

	return r;
}

function printRange(start, end) {
	return printColumn(start) + "-" + printColumn(end);
}

function parseColumns(cols_spec) {
	var indexes = [];

	cols_spec = cols_spec.replace(/^\s+|\s+$/g, "");
	var split_cols = cols_spec.split(/\s*,\s*/);
	if (split_cols.length == 1 && split_cols[0] === "") split_cols = [];

	for (var i = 0; i < split_cols.length; i++) {
		var col_or_range = split_cols[i];
		if (/^[A-Za-z]+$/.test(col_or_range)) {
			indexes.push(parseColumn(col_or_range));
		}
		else {
			Array.prototype.push.apply(indexes, parseRange(col_or_range));
		}
	}

	return indexes;
}

function splitIntoRanges(indexes) {
	var ranges = [];
	var start, end;
	for (var i = 0; i < indexes.length; i++) {
		if (i > 0 && indexes[i] == indexes[i-1] + 1) {
			end = indexes[i];
		}
		else {
			if (typeof start != "undefined") ranges.push([start, end]);
			start = end = indexes[i];
		}
	}
	if (typeof start != "undefined") ranges.push([start, end]);
	return ranges;
}

function printColumns(indexes) {
	var ranges = splitIntoRanges(indexes);

	var r = [];
	for (var i = 0; i < ranges.length; i++) {
		var range = ranges[i];
		if (range[0] == range[1]) r.push(printColumn(range[0]));
		else r.push(printRange(range[0], range[1]));
	}
	return r.join(",");
}

function parseDataBinding(d, data_table_ids) {
	var r = {};

	if (!(d.type in d)) {
		if (d.optional) return r;
		throw new Error("Data binding must specify '" + d.type + "': " + JSON.stringify(d));
	}

	var double_colon_ix = d[d.type].indexOf("::");
	if (double_colon_ix == -1) throw new Error("Invalid data binding: " + d[d.type]);
	var data_table_name = d[d.type].substr(0, double_colon_ix);
	r.data_table_id = data_table_ids[data_table_name];

	var col_spec = d[d.type].substr(double_colon_ix + 2);
	if (d.type == "column") r.column = parseColumn(col_spec);
	else if (d.type == "columns") r.columns = parseColumns(col_spec);
	else throw new Error("Unknown data binding type: " + d.type);

	return r;
}

function printDataBinding(r, data_table_names, print_data_table_name, optional) {
	var data_table_name = print_data_table_name ? data_table_names[r.data_table_id] + "::" : "";
	if ("column" in r) {
		return data_table_name + printColumn(r.column);
	}
	else if ("columns" in r) {
		return data_table_name + printColumns(r.columns);
	}
	else if (optional) {
		return "";
	}
	throw new Error("Data binding must have .column or .columns");
}

exports.parseColumn = parseColumn;
exports.parseColumns = parseColumns;
exports.parseDataBinding = parseDataBinding;
exports.parseRange = parseRange;
exports.printColumn = printColumn;
exports.printColumns = printColumns;
exports.printDataBinding = printDataBinding;
