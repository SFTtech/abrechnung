import React from "react";

import { useRecoilValue } from "recoil";
import { accountsSeenByUser } from "../../state/accounts";
import { Autocomplete, Box, Popper, TextField, TextFieldProps, Typography } from "@mui/material";
import { DisabledTextField } from "./DisabledTextField";
import { CompareArrows, Person } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { Group, Account } from "@abrechnung/types";

const StyledAutocompletePopper = styled(Popper)(({ theme }) => ({
    minWidth: 200,
}));

export type AccountSelectProps = {
    group: Group;
    onChange: (acc: Account) => void;
    value?: Account | null;
    exclude?: number[] | null;
    disabled?: boolean;
    noDisabledStyling?: boolean;
    className?: string | null;
} & Omit<TextFieldProps, "value" | "onChange">;

export const AccountSelect: React.FC<AccountSelectProps> = ({
    group,
    onChange,
    value = null,
    exclude = null,
    disabled = false,
    noDisabledStyling = false,
    className = null,
    ...props
}) => {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const filteredAccounts =
        exclude !== null ? accounts.filter((account) => exclude.indexOf(account.id) < 0) : accounts;

    return (
        <Autocomplete
            options={filteredAccounts}
            getOptionLabel={(acc: Account) => acc.name}
            value={value}
            disabled={disabled}
            openOnFocus
            fullWidth
            PopperComponent={StyledAutocompletePopper}
            disableClearable
            className={className}
            onChange={(event, newValue: Account) => onChange(newValue)}
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
};

export default AccountSelect;
