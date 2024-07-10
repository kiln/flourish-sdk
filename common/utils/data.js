"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInterpreter = void 0;
exports.extractData = extractData;
exports.getColumnTypesForData = getColumnTypesForData;
exports.getRandomSeededSample = getRandomSeededSample;
exports.mulberry32 = mulberry32;
exports.trimTrailingEmptyRows = trimTrailingEmptyRows;
exports.dropReturnCharacters = dropReturnCharacters;
exports.tidyTable = tidyTable;
exports.stripCommonFixes = stripCommonFixes;
exports.transposeNestedArray = transposeNestedArray;
exports.getSlicedData = getSlicedData;
exports.interpretColumn = interpretColumn;
exports.sortDataTables = sortDataTables;
const interpreter_1 = require("@flourish/interpreter");
require("./polyfills");
var interpreter_2 = require("@flourish/interpreter");
Object.defineProperty(exports, "createInterpreter", { enumerable: true, get: function () { return interpreter_2.createInterpreter; } });
function getLatestDataTimestamps(data_table_timestamps) {
    const timestamps = {};
    const date_values = data_table_timestamps.map(t => t.last_updated?.getTime()).filter(Boolean);
    if (date_values.length) {
        const latest_date = Math.max(...date_values);
        timestamps.last_updated = new Date(latest_date);
    }
    return timestamps;
}
function extractData(data_binding, data_by_id, column_types_by_id, template_data_bindings, timestamps) {
    var columns = [];
    var data_table_ids = [];
    var num_rows = 0;
    var dataset = Object.assign([], { column_names: {}, metadata: {}, timestamps: {} });
    var interpreters_by_id = {};
    function getInterpretationIds(data_table_id, column_index) {
        if (!interpreters_by_id[data_table_id])
            return {};
        var by_column_index = interpreters_by_id[data_table_id];
        if (!by_column_index[column_index])
            return {};
        return by_column_index[column_index];
    }
    function getInterpreter(data_table_id, column_index) {
        const interpretation_ids = getInterpretationIds(data_table_id, column_index);
        if ("type_id" in interpretation_ids) {
            return interpreter_1.createInterpreter.getInterpretation(interpretation_ids.type_id);
        }
    }
    for (var data_table_id in column_types_by_id) {
        var lookup = {};
        var column_types = column_types_by_id[data_table_id];
        if (!column_types)
            continue;
        for (let i = 0; i < column_types.length; i++) {
            const type_id = column_types[i].type_id;
            const of_id = column_types[i].output_format_id;
            const output_format_id = (!of_id || of_id === "auto") ? type_id : of_id;
            lookup[column_types[i].index] = { type_id, output_format_id };
        }
        interpreters_by_id[data_table_id] = lookup;
    }
    for (var key in data_binding) {
        if (data_binding[key] === null)
            continue;
        if (data_binding[key].columns === undefined && data_binding[key].column === undefined)
            continue;
        var b = data_binding[key];
        b.template_data_binding = template_data_bindings[key];
        b.key = key;
        if (!(b.data_table_id in data_by_id)) {
            var data_by_id_keys = [];
            for (var k in data_by_id)
                data_by_id_keys.push(k);
            console.error("Data table id " + b.data_table_id + " not in " + JSON.stringify(data_by_id_keys));
            continue;
        }
        const data_table = data_by_id[b.data_table_id];
        if (data_table == null) {
            throw new Error(`[BUG] The data from the data table with ID ${b.data_table_id} was missing`);
        }
        if (data_table.length == 0) {
            console.warn("Empty data table");
            continue;
        }
        if ("columns" in b && b.columns != null) {
            var column_count = data_table[0].length;
            b.columns = b.columns.filter(function (i) { return i < column_count; });
            dataset.column_names[key] = b.columns.map(function (i) {
                return data_table[0][i];
            });
            dataset.metadata[key] = b.columns.map(function (i) {
                const interpretation_ids = getInterpretationIds(b.data_table_id, i);
                if ("type_id" in interpretation_ids) {
                    const { type_id, output_format_id } = interpretation_ids;
                    return {
                        type: type_id.split("$")[0],
                        type_id,
                        output_format_id: output_format_id
                    };
                }
                return null;
            });
        }
        else if ("column" in b && b.column != null) {
            dataset.column_names[key] = data_table[0][b.column];
            const interpretation_ids = getInterpretationIds(b.data_table_id, b.column);
            if ("type_id" in interpretation_ids) {
                const { type_id, output_format_id } = interpretation_ids;
                dataset.metadata[key] = {
                    type: type_id.split("$")[0],
                    type_id,
                    output_format_id: output_format_id
                };
            }
        }
        else {
            throw new Error("Data binding includes no column(s) specification: " + JSON.stringify(b));
        }
        if (data_table_ids.indexOf(b.data_table_id) == -1) {
            data_table_ids.push(b.data_table_id);
            num_rows = Math.max(num_rows, data_table.length - 1);
        }
        columns.push(b);
    }
    // gets the latest timestamp info across all data tables which are linked to by the bindings for this dataset
    // (this is typically only a single data table)\
    dataset.timestamps = getLatestDataTimestamps(data_table_ids.map(id => timestamps.per_data_table[id]));
    function parse(b, column_index, string_value) {
        if (!b.template_data_binding?.data_type)
            return string_value;
        var interpreter = getInterpreter(b.data_table_id, column_index);
        if (interpreter && interpreter.type == "number")
            string_value = stripCommonFixes(string_value);
        var result = interpreter ? interpreter.parse(string_value) : string_value;
        // We require our marshalled data to be JSON-serialisable,
        // therefore we convert NaNs to null here.
        if (Number.isNaN(result))
            result = null;
        return result;
    }
    for (var i = 0; i < num_rows; i++) {
        var o = {};
        for (var j = 0; j < columns.length; j++) {
            b = columns[j];
            const table = data_by_id[b.data_table_id];
            if (table == null) {
                throw new Error(`[BUG] The data from the data table with ID ${b.data_table_id} was missing`);
            }
            if (i + 1 >= table.length)
                continue;
            if (b.key == null)
                throw new Error(`BUG: 'key' was ${b.key} in ${b}`);
            if ("columns" in b && b.columns != null) {
                o[b.key] = b.columns
                    .filter(function (c) { return c < table[i + 1].length; })
                    .map(function (c) { return parse(b, c, table[i + 1][c]); });
            }
            else if ("column" in b && b.column != null) {
                if (b.column >= table[i + 1].length)
                    o[b.key] = parse(b, b.column, "");
                else
                    o[b.key] = parse(b, b.column, table[i + 1][b.column]);
            }
        }
        dataset.push(o);
    }
    return dataset;
}
function getColumnTypesForData(data) {
    return transposeNestedArray(data)
        .map(function (column, i) {
        const sliced_column = getSlicedData(column);
        const sample_size = 1000;
        let sample_data;
        if (sliced_column.length > (sample_size * 2))
            sample_data = getRandomSeededSample(sliced_column, sample_size);
        else
            sample_data = sliced_column;
        const type_id = interpretColumn(sample_data)[0].id;
        return { type_id: type_id, index: i, output_format_id: type_id };
    });
}
// Returns a random seeded sample of column values based on the column length.
// The sample is consistent and will update if the length of column changes.
function getRandomSeededSample(column, sample_size) {
    if (column.length <= sample_size * 2)
        return column;
    const rng = mulberry32(column.length);
    while (column.length > sample_size) {
        const random_index = Math.floor(rng() * column.length);
        column.splice(random_index, 1);
    }
    return column;
}
// Seeded RNG implementation taken from https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
function mulberry32(seed) {
    let a = seed;
    return function () {
        a |= 0;
        a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function trimTrailingEmptyRows(data) {
    for (var i = data.length; i-- > 1;) {
        if (!data[i] || !data[i].length || (Array.isArray(data[i]) && data[i].findIndex(function (col) { return col !== null && col !== ""; }) == -1)) {
            data.splice(i, 1);
        }
        else
            break;
    }
    return data;
}
function dropReturnCharacters(data) {
    for (const row of data) {
        for (let i = 0; i < row.length; i++) {
            // Due to a bug in HoT, pasting long lines from Excel can lead to the addition of
            // a newline character and a space *before* a space character.
            // This leads to a pattern of new line character followed by two spaces.
            // Here we identify that pattern and revert it.
            row[i] = row[i].replace(/(\r\n|\n|\r) {2}/g, " ");
        }
    }
    return data;
}
/**
 * Takes an array of arrays (typically tabular data) and rewrites
 * it so that:
 *   - Any trailing empty rows are removed
 *   - Any cell that was not a string is stringified
 *   - Any leading or trailing whitespace of a cell is removed
 *
 * (The potentially modified table is returned to match the convention
 * used by functions this is replacing, although (TODO) I think it
 * would be more obvious that this function has side-effects if it
 * did not return the table and the calling code was changed.)
 *
 * @param {any[][]} data
 * @returns {string[][]}
 */
function tidyTable(data) {
    trimTrailingEmptyRows(data);
    for (let row of data) {
        for (let i = 0; i < row.length; i++) {
            let value = row[i];
            // Convert null or undefined values to the empty string
            if (value == null)
                value = "";
            // If the value is not a string, convert it to one
            if (typeof value !== "string") {
                value = "" + value;
            }
            if (typeof value !== "string") {
                throw new Error("BUG: somehow value was not a string");
            }
            // Now value is a definitely a string, strip any leading
            // or trailing whitespace.
            row[i] = value.trim();
        }
    }
    // TypeScript can't infer that the returned data is definitely all
    // strings so use a cast.
    return data;
}
var ERROR_STRINGS = ["#DIV/0", "#N/A", "#NAME?", "#NULL!", "#NUM!", "#REF!", "#VALUE!", "#ERROR!"];
var interpreter = (0, interpreter_1.createInterpreter)().nMax(Infinity).nFailingValues(8).failureFraction(0.1);
function stripCommonFixes(str) {
    str = str || "";
    return str.replace(/[€£$￥%º]/g, "");
}
function transposeNestedArray(nested_array) {
    var n_inner = nested_array.length;
    var n_outer = n_inner > 0 ? nested_array[0].length : 0;
    var transposed_array = [];
    for (var i = 0; i < n_outer; i++) {
        var data = [];
        for (var j = 0; j < n_inner; j++) {
            data.push(nested_array[j][i]);
        }
        transposed_array.push(data);
    }
    return transposed_array;
}
function getSlicedData(arr) {
    const n = arr.length;
    if (n > 100)
        return arr.slice(10, n - 10);
    if (n > 50)
        return arr.slice(5, n - 5);
    if (n > 30)
        return arr.slice(4, n - 4);
    if (n > 20)
        return arr.slice(3, n - 3);
    if (n > 10)
        return arr.slice(2, n - 2);
    if (n > 1)
        return arr.slice(1, n);
    return arr.slice(0, 1);
}
function interpretColumn(arr) {
    var idata = arr.filter(function (d) {
        return d && !ERROR_STRINGS.includes(d.trim());
    })
        .map(stripCommonFixes);
    return interpreter(idata);
}
function sortDataTables(data_tables, data_bindings) {
    // Sort data tables to match order in the template data bindings
    if (!data_bindings || !data_bindings.length)
        return;
    if (!data_tables || !data_tables.length)
        return;
    var table_names = [];
    data_bindings.forEach(function (data_binding) {
        if (typeof data_binding === "string")
            return;
        let column;
        if ("column" in data_binding) {
            column = data_binding.column;
        }
        else if ("columns" in data_binding) {
            column = data_binding.columns;
        }
        if (column) {
            var table_name = column.match(/^(?:[^:]|:[^:])*/);
            if (table_name && table_names.indexOf(table_name[0]) == -1)
                table_names.push(table_name[0]);
        }
    });
    return data_tables.sort(function (dt1, dt2) {
        var i = table_names.indexOf(dt1.name), j = table_names.indexOf(dt2.name);
        return (i == -1 ? Infinity : i) < (j == -1 ? Infinity : j) ? -1 : 1;
    });
}
