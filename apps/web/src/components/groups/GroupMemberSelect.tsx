import * as React from "react";
import { Autocomplete, Box, Popper, TextField, TextFieldProps, Typography } from "@mui/material";
import { DisabledTextField } from "@abrechnung/components";
import { styled } from "@mui/material/styles";
import { useListMembersQuery } from "@/core/generated/api";

const StyledAutocompletePopper = styled(Popper)(() => ({
    minWidth: 200,
}));

type Props = {
    groupId: number;
    onChange: (memberID: number) => void;
    value?: number | null;
    disabled?: boolean;
    noDisabledStyling?: boolean;
    className?: string | null;
} & TextFieldProps;

export const GroupMemberSelect: React.FC<Props> = ({
    groupId,
    onChange,
    value = null,
    disabled = false,
    noDisabledStyling = false,
    className,
    ...props
}) => {
    const { data: members } = useListMembersQuery({ groupId });
    const selected = members?.find((user) => user.user_id === value);

    return (
        <Autocomplete
            options={members ?? []}
            getOptionLabel={(option) => option.username}
            value={selected ?? null}
            multiple={false}
            disabled={disabled}
            openOnFocus
            fullWidth
            slots={{ popper: StyledAutocompletePopper }}
            className={className}
            onChange={(event, newValue) => onChange(Number(newValue))}
            renderOption={(props, user) => (
                <Box component="li" {...props}>
                    <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                        {user.username}
                    </Typography>
                </Box>
            )}
            renderInput={
                noDisabledStyling
                    ? (params) => <DisabledTextField variant="standard" {...params} {...props} />
                    : (params) => <TextField variant="standard" {...params} {...props} />
            }
        />
    );
};
