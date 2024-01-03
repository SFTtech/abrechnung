export type ReplaceConstStringWithString<T> = {
    [K in keyof T]: T[K] extends string ? string : ReplaceConstStringWithString<T[K]>;
};

export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
