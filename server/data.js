/* * * * * * GENERATED FILE - DO NOT EDIT * * * * * *
 * * * * * * GENERATED FILE - DO NOT EDIT * * * * * *
 * * * * * * GENERATED FILE - DO NOT EDIT * * * * * */
 
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function extractData(data_binding, data_by_id) {
	var columns = [];
	var data_table_ids = [];
	var num_rows = 0;
	var dataset = [];
	dataset.column_names = {};

	for (var key in data_binding) {
		var b = data_binding[key];
		b.key = key;

		if (!(b.data_table_id in data_by_id)) {
			var data_by_id_keys = [];
			for (var k in data_by_id) data_by_id_keys.push(k);

			console.error("Data table id " + b.data_table_id + " not in " + JSON.stringify(data_by_id_keys));
			continue;
		}

		if ("columns" in b && b.columns != null) {
			dataset.column_names[key] = b.columns.map(function(i) {
				return data_by_id[b.data_table_id][0][i];
			});
		}
		else if ("column" in b && b.column != null) {
			dataset.column_names[key] = data_by_id[b.data_table_id][0][b.column];
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
			var b = columns[j];
			var table = data_by_id[b.data_table_id];
			if (i+1 >= table.length) continue;

			if ("columns" in b && b.columns != null) {
				o[b.key] = b.columns.map(function(c) { return table[i+1][c]; });
			}
			else if ("column" in b && b.column != null) {
				o[b.key] = table[i+1][b.column];
			}
		}
		dataset.push(o);
	}

	return dataset;
}

function trimTrailingEmptyRows(data) {
	for (var i = data.length; i-- > 0; ) {
		if (data[i].findIndex(function(col) { return col !== null && col !== "" }) == -1) {
			data.splice(i,1);
		} 
		else break;
	}
	return data;
}

exports.extractData = extractData;
exports.trimTrailingEmptyRows = trimTrailingEmptyRows;
