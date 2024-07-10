import { DatasetType } from "./types";
export declare function safeStringify(obj: unknown): string | undefined;
export declare function javaScriptStringify(v: unknown): string | undefined;
export declare function stringifyPreparedData(data: {
    [dataset: string]: DatasetType;
}): string;
