import * as React from "react";
import { TextFieldProps } from "@mui/material";
import { DisabledTextField } from "../DisabledTextField";
import { evaluateExpression } from "./mathExpression";
import { useTranslation } from "react-i18next";

export type NumericInputProps = {
    onChange: (value: number) => void;
    value?: number | undefined;
    isCurrency?: boolean | false;
} & Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "onKeyUp">;

const getDecimalSeparator = (locale: string) => {
    const numberWithDecimalSeparator = 1.1;
    const separator = Intl.NumberFormat(locale)
        .formatToParts(numberWithDecimalSeparator)
        .find((part) => part.type === "decimal")!.value;

    return [separator, separator === "." ? "," : "."];
};

const adjustLocaleDecimalSeparators = (value: string, locale: string): string => {
    const [decimalSeparator, thousandSeparator] = getDecimalSeparator(locale);
    return value.replaceAll(thousandSeparator, "").replaceAll(decimalSeparator, ".");
};

const currencyFormatConfig = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
};

const numberFormatConfig = {
    maximumFractionDigits: 12,
};

export const NumericInput: React.FC<NumericInputProps> = ({
    value,
    isCurrency,
    onChange,
    error,
    helperText,
    ...props
}) => {
    const { i18n } = useTranslation();
    const inputRef = React.useRef<HTMLInputElement>(null);

    const [internalValue, setInternalValue] = React.useState("");
    const [internalError, setInternalError] = React.useState(false);
    const [internalHelperText, setInternalHelperText] = React.useState<string | undefined>(undefined);

    const formatValue = React.useCallback(
        (value: number) => {
            return Intl.NumberFormat(i18n.language, isCurrency ? currencyFormatConfig : numberFormatConfig).format(
                value
            );
        },
        [i18n.language, isCurrency]
    );

    React.useEffect(() => {
        if (value != null) {
            setInternalValue(formatValue(value));
        }
    }, [value, setInternalValue, formatValue]);

    const onInternalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInternalValue(event.target.value);
    };

    const finalizeInput = () => {
        const updateValue = (value: number) => {
            setInternalValue(formatValue(value));
            onChange(value);
            setInternalError(false);
            setInternalHelperText(undefined);
        };

        // first, preprocess the input to have commas / dots adhere to the current locale
        const cleanedValue = adjustLocaleDecimalSeparators(internalValue, i18n.language);

        // next, try to evaluate any math expression present in the input, plain numbers will remain unchanged
        try {
            const evaluated = evaluateExpression(cleanedValue);
            updateValue(evaluated);
        } catch (e) {
            setInternalError(true);
            setInternalHelperText(String(e));
        }
    };

    const onInternalBlur = () => {
        finalizeInput();
    };

    const onKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter") {
            finalizeInput();
            inputRef.current?.select();
        }
    };

    const passedError = error || internalError;
    const passedHelperText = internalHelperText ?? helperText;

    return (
        <DisabledTextField
            value={internalValue}
            onChange={onInternalChange}
            onBlur={onInternalBlur}
            onKeyUp={onKeyUp}
            variant="standard"
            slotProps={{ input: { inputMode: "decimal" } }}
            onFocus={(event) => event.target.select()}
            error={passedError}
            helperText={passedHelperText}
            inputRef={inputRef}
            {...props}
        />
    );
};
