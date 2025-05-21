import "./polyfills";
import { ColumnType, NullableColumnTypesById, DataBinding, DatasetType, TemplateDataBinding, KeyToTemplateDataBinding } from "./types";
export { createInterpreter } from "@flourish/interpreter";
type AugmentedDataBinding = DataBinding & {
    key?: string;
    template_data_binding?: TemplateDataBinding;
};
type KeyToAugmentedDataBinding = {
    [key: string]: AugmentedDataBinding;
};
export type Timestamps = {
    last_updated?: Date;
};
export type DatasheetsTimestamps = {
    per_data_table: {
        [dt_id: string]: Timestamps;
    };
};
export declare function extractData(data_binding: KeyToAugmentedDataBinding, data_by_id: {
    [data_table_id: string]: string[][] | undefined;
}, column_types_by_id: NullableColumnTypesById, template_data_bindings: KeyToTemplateDataBinding | undefined, timestamps: DatasheetsTimestamps): DatasetType;
export declare function getColumnTypesForData(data: string[][]): ColumnType[];
export declare function getRandomSeededSample(column: string[], sample_size: number): string[];
export declare function mulberry32(seed: number): () => number;
export declare function trimTrailingEmptyRows(data: unknown[][]): unknown[][];
export declare function dropReturnCharacters(data: string[][]): string[][];
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
export declare function tidyTable(data: unknown[][]): string[][];
export declare function stripCommonFixes(str: string): string;
export declare function transposeNestedArray(nested_array: string[][]): string[][];
export declare function getSlicedData(arr: string[]): string[];
export declare function interpretColumn(arr: string[]): any;
export declare function sortDataTables(data_tables: {
    name: string;
}[], data_bindings: (string | TemplateDataBinding)[] | undefined): {
    name: string;
}[] | undefined;
