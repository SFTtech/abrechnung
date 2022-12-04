import React from "react";
import { Autocomplete, Box, Popper, TextField, TextFieldProps, Typography } from "@mui/material";
import { DisabledTextField } from "../style/DisabledTextField";
import { styled } from "@mui/material/styles";
import { selectGroupSlice, useAppSelector } from "../../store";
import { selectGroupMemberIds, selectGroupMemberIdToUsername } from "@abrechnung/redux";

const StyledAutocompletePopper = styled(Popper)(({ theme }) => ({
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
    className = null,
    ...props
}) => {
    const memberIds = useAppSelector((state) => selectGroupMemberIds({ state: selectGroupSlice(state), groupId }));
    const memberIDToUsername = useAppSelector((state) =>
        selectGroupMemberIdToUsername({ state: selectGroupSlice(state), groupId })
    );

    return (
        <Autocomplete
            options={memberIds}
            getOptionLabel={(option) => memberIDToUsername[option]}
            value={value}
            multiple={false}
            disabled={disabled}
            openOnFocus
            fullWidth
            PopperComponent={StyledAutocompletePopper}
            className={className}
            onChange={(event, newValue) => onChange(Number(newValue))}
            renderOption={(props, user_id) => (
                <Box component="li" {...props}>
                    <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                        {memberIDToUsername[user_id]}
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

export default GroupMemberSelect;
