export type CSVHeaders<T extends object> = {
    [K in keyof T]: string;
};

export const buildCsv = <T extends object>(headers: CSVHeaders<T>, data: T[]): string => {
    const header = Object.values(headers).join(",") + "\n";

    const stringifiedData = data
        .map((row) =>
            Object.keys(headers)
                .map((headerKey) => String(row[headerKey as keyof T] ?? ""))
                .join(",")
        )
        .join("\n");

    return header + stringifiedData;
};
