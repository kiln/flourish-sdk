type ColumnTypeInMetadata = {
    type: string;
    type_id: string;
    output_format_id: string;
};
export type DatasetType = Record<string, unknown>[] & {
    column_names: {
        [data_binding_key: string]: string | string[];
    };
    metadata: {
        [data_binding_key: string]: ColumnTypeInMetadata | (ColumnTypeInMetadata | null)[];
    };
    timestamps: {
        last_updated?: Date;
    };
};
export type DataBinding = {
    data_table_id: number;
} & ({
    column: number;
    columns?: null;
} | {
    column?: null;
    columns: number[];
});
export type DataBindings = Record<string, DataBinding>;
export type TemplateDataBinding = {
    dataset: string;
    key: string;
    name?: string;
    type?: string;
    description?: string;
    data_type?: string[];
    assignment?: {
        can_rebind?: boolean;
        min_columns?: number;
        max_columns?: number;
        hints: Record<string, unknown>;
    };
    optional?: boolean;
} & ({
    column: string;
} | {
    columns: string;
});
export type KeyToTemplateDataBinding = {
    [key: string]: TemplateDataBinding;
};
export type DatasetToKeyToTemplateDataBinding = {
    [dataset: string]: KeyToTemplateDataBinding;
};
export type ColumnType = {
    index: number;
    type_id: string;
    output_format_id: string;
};
export type ColumnTypesById = {
    [data_table_id: string]: ColumnType[];
};
export type NullableColumnTypesById = {
    [data_table_id: string]: ColumnType[] | null;
};
export {};
