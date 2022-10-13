import React from "react";

import { useRecoilValue } from "recoil";
import { Autocomplete, Box, Popper, TextField, TextFieldProps, Typography } from "@mui/material";
import { DisabledTextField } from "../style/DisabledTextField";
import { styled } from "@mui/material/styles";
import { Group, groupMemberIDsToUsername, groupMembers } from "../../state/groups";

const StyledAutocompletePopper = styled(Popper)(({ theme }) => ({
    minWidth: 200,
}));

type Props = {
    group: Group;
    onChange: (memberID: number) => void;
    value?: number | null;
    disabled?: boolean;
    noDisabledStyling?: boolean;
    className?: string | null;
} & TextFieldProps;

export const GroupMemberSelect: React.FC<Props> = ({
    group,
    onChange,
    value = null,
    disabled = false,
    noDisabledStyling = false,
    className = null,
    ...props
}) => {
    const members = useRecoilValue(groupMembers(group.id));
    const memberIDToUsername = useRecoilValue(groupMemberIDsToUsername(group.id));

    return (
        <Autocomplete
            options={members.map((m) => m.user_id)}
            getOptionLabel={(option) => memberIDToUsername[option]}
            value={value}
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
