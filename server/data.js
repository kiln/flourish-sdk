/* * * * * * GENERATED FILE - DO NOT EDIT * * * * * *
 * * * * * * GENERATED FILE - DO NOT EDIT * * * * * *
 * * * * * * GENERATED FILE - DO NOT EDIT * * * * * */
 
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// Polyfills for IE11 and Edge

// Add findIndex method to Array
// https://tc39.github.io/ecma262/#sec-array.prototype.findindex
if (!Array.prototype.findIndex) {
	Object.defineProperty(Array.prototype, "findIndex", {
		value: function(predicate) {
			if (this == null) {
				throw new TypeError("this is null or not defined");
			}
			var o = Object(this);
			var len = o.length >>> 0;
			if (typeof predicate !== "function") {
				throw new TypeError("predicate must be a function");
			}
			var this_arg = arguments[1];
			var k = 0;
			while (k < len) {
				var k_value = o[k];
				if (predicate.call(this_arg, k_value, k, o)) {
					return k;
				}
				k++;
			}
			return -1;
		},
		configurable: true,
		writable: true
	});
}

function extractData(data_binding, data_by_id) {
	var columns = [];
	var data_table_ids = [];
	var num_rows = 0;
	var dataset = [];
	dataset.column_names = {};

	for (var key in data_binding) {
		if (data_binding[key].columns === undefined && data_binding[key].column === undefined) continue;

		var b = data_binding[key];
		b.key = key;

		if (!(b.data_table_id in data_by_id)) {
			var data_by_id_keys = [];
			for (var k in data_by_id) data_by_id_keys.push(k);

			console.error("Data table id " + b.data_table_id + " not in " + JSON.stringify(data_by_id_keys));
			continue;
		}

		var data_table = data_by_id[b.data_table_id];
		if (data_table.length == 0) {
			console.warn("Empty data table");
			continue;
		}

		if ("columns" in b && b.columns != null) {
			var column_count = data_table[0].length;
			b.columns = b.columns.filter(function(i) { return i < column_count; });
			dataset.column_names[key] = b.columns.map(function(i) {
				return data_by_id[b.data_table_id][0][i];
			});
		}
		else if ("column" in b && b.column != null) {
			dataset.column_names[key] = data_table[0][b.column];
		}
		else {
			throw new Error("Data binding includes no column(s) specification: " + JSON.stringify(b));
		}

		if (data_table_ids.indexOf(b.data_table_id) == -1) {
			data_table_ids.push(b.data_table_id);
			num_rows = Math.max(num_rows, data_by_id[b.data_table_id].length - 1);
		}
		columns.push(b);
	}

	for (var i = 0; i < num_rows; i++) {
		var o = {};
		for (var j = 0; j < columns.length; j++) {
			b = columns[j];
			var table = data_by_id[b.data_table_id];
			if (i+1 >= table.length) continue;

			if ("columns" in b && b.columns != null) {
				o[b.key] = b.columns
					.filter(function(c) { return c < table[i+1].length; })
					.map(function(c) { return table[i+1][c]; });
			}
			else if ("column" in b && b.column != null) {
				if (b.column >= table[i+1].length) o[b.key] = "";
				else o[b.key] = table[i+1][b.column];
			}
		}
		dataset.push(o);
	}

	return dataset;
}

function trimTrailingEmptyRows(data) {
	for (var i = data.length; i-- > 1;) {
		if (!data[i] || !data[i].length || data[i].findIndex(function(col) { return col !== null && col !== ""; }) == -1) {
			data.splice(i, 1);
		}
		else break;
	}
	return data;
}

function trimWhitespace(data) {
	data.forEach(function(row) {
		for (var i=0; i < row.length; i++) {
			if (row[i] && typeof row[i] == "string") row[i] = row[i].trim();
		}
	});
	return data;
}

exports.extractData = extractData;
exports.trimTrailingEmptyRows = trimTrailingEmptyRows;
exports.trimWhitespace = trimWhitespace;
