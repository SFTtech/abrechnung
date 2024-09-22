import * as React from "react";
import { Control, Controller } from "react-hook-form";
import { HelperText } from "react-native-paper";
import { TagSelect, TagSelectProps } from "./tag-select";

export type FormTagSelect = Omit<TagSelectProps, "value" | "onChange"> & {
    name: string;
    control: Control<any, any>;
};

export const FormTagSelect: React.FC<FormTagSelect> = ({ name, control, ...props }) => {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <>
                    <TagSelect value={value} onChange={onChange} {...props} />
                    {error && <HelperText type="error">{error.message}</HelperText>}
                </>
            )}
        />
    );
};
