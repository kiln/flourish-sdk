export function extractData(data_binding: any, data_by_id: any, column_types_by_id: any, template_data_binding: any): {}[];
export function getColumnTypesForData(data: any): {
    type_id: any;
    index: number;
    output_format_id: any;
}[];
export function getRandomSeededSample(column: any, sample_size: any): any;
export function mulberry32(seed: any): () => number;
export function trimTrailingEmptyRows(data: any): any;
export function dropReturnCharacters(data: any): any;
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
export function tidyTable(data: any[][]): string[][];
export function stripCommonFixes(str: any): any;
export function transposeNestedArray(nested_array: any): any[][];
export function getSlicedData(arr: any): any;
export function interpretColumn(arr: any): any;
