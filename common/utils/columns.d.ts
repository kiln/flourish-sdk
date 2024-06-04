export function parseColumn(col_spec: any, is_optional: any): number;
export function printColumn(col_ix: any): string;
export function parseRange(col_range: any): number[];
export function parseColumns(cols_spec: any): number[];
export function printColumns(indexes: any): string;
export function parseDataBinding(d: any, data_table_ids: any): {
    data_table_id: any;
    column: number;
    columns: number[];
};
export function printDataBinding(r: any, data_table_names: any, print_data_table_name: any, optional: any): string;
