export type DebugExpand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type DebugExpandRecursive<T> = T extends object
    ? T extends infer O
        ? { [K in keyof O]: DebugExpandRecursive<O[K]> }
        : never
    : T;
