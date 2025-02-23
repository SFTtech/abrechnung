import { Select, SelectProps } from "./Select";
import { CurrencyIdentifier, CurrencyIdentifiers, getCurrencySymbolForIdentifier } from "@abrechnung/core";
import * as React from "react";

export type CurrencyIdentifierSelectProps = Omit<
    SelectProps<CurrencyIdentifier, false, false, true>,
    "options" | "formatOption" | "multiple"
>;

export const CurrencyIdentifierSelect: React.FC<CurrencyIdentifierSelectProps> = (props) => {
    return (
        <Select
            disableClearable={true}
            multiple={false}
            nullable={false}
            options={CurrencyIdentifiers}
            formatOption={(identifier: CurrencyIdentifier) =>
                `${identifier} (${getCurrencySymbolForIdentifier(identifier)})`
            }
            {...props}
        />
    );
};
