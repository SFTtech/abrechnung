import * as React from "react";
import { Control, Controller } from "react-hook-form";
import { HelperText } from "react-native-paper";
import { TransactionShareInput, TransactionShareInputProps } from "./transaction-shares/TransactionShareInput";

export type FormTransactionShareInputProps = Omit<TransactionShareInputProps, "value" | "onChange"> & {
    name: string;
    control: Control<any, any>;
};

export const FormTransactionShareInput: React.FC<FormTransactionShareInputProps> = ({ name, control, ...props }) => {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <>
                    <TransactionShareInput value={value} onChange={onChange} error={!!error} {...props} />
                    {error && <HelperText type="error">{error.message}</HelperText>}
                </>
            )}
        />
    );
};
