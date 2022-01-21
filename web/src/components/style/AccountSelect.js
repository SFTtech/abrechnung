import React from "react";

import { useRecoilValue } from "recoil";
import { accountsSeenByUser } from "../../recoil/accounts";
import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import { DisabledTextField } from "./DisabledTextField";
import { CompareArrows, Person } from "@mui/icons-material";

export default function AccountSelect({
    group,
    value,
    onChange,
    exclude = null,
    disabled = false,
    noDisabledStyling = false,
    className = null,
    ...props
}) {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const filteredAccounts =
        exclude !== null ? accounts.filter((account) => exclude.indexOf(account.id) < 0) : accounts;

    return (
        <Autocomplete
            options={filteredAccounts}
            getOptionLabel={(option) => option.name}
            value={value}
            disabled={disabled}
            openOnFocus
            fullWidth
            disableClearable
            className={className}
            onChange={(event, newValue) => onChange(newValue)}
            renderOption={(props, option) => (
                <Box component="li" {...props}>
                    {option.type === "personal" ? <Person /> : <CompareArrows />}
                    <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                        {option.name}
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
}
