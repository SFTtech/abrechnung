import * as React from "react";
import { z } from "zod";
import { useSearchParams } from "react-router";

export const StringyBoolean = z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase() : val),
    z.enum(["0", "1", "false", "true"]).transform((val) => val === "true" || val === "1")
);

export const useQueryState = <T extends Record<string, boolean | string | number>>(
    defaultState: T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: z.ZodType<T, any, any>
): [T, (val: Partial<T>) => void] => {
    const [searchParams, setSearchParams] = useSearchParams();

    const updateState = React.useCallback(
        (newState: Partial<T>) => {
            setSearchParams((prevState) => ({
                ...Object.fromEntries(prevState.entries()),
                ...newState,
            }));
        },
        [setSearchParams]
    );

    const searchAsObject = Object.fromEntries(searchParams.entries());
    const parsedQuery = schema.safeParse(searchAsObject);

    const state = parsedQuery.success ? parsedQuery.data : defaultState;

    return [state, updateState];
};
