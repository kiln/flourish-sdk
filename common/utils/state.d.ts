export declare function isObject(x: unknown): x is Record<string, unknown>;
export declare function flatten(o: Record<string, unknown>, keys?: string[], result?: Record<string, unknown>): Record<string, unknown>;
export declare function unflatten(o: Record<string, any>): Record<string, any>;
export declare function merge<T extends Record<string, unknown>, S extends Record<string, unknown>>(dest: T, source: S): T & S;
export declare function deepCopyObject<T>(obj: T): T;
export declare function deepEqual(a: any, b: any): boolean;
export declare function getStateChanges(state1: Record<string, any>, state2: Record<string, any>): Record<string, any>;
