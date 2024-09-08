import { useSearchParams } from "react-router-dom";

export const useQueryVar = <Val extends string | undefined>(
    name: string,
    defaultValue: Val
): [string | Val, (val: string) => void] => {
    const [searchParams, setSearchParams] = useSearchParams();

    const updateVal = (val: string) => {
        searchParams.set(name, val);
        setSearchParams(new URLSearchParams(searchParams));
    };

    return [searchParams.get(name) ?? defaultValue, updateVal];
};
