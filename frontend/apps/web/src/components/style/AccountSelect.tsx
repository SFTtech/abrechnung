import React from "react";

import { Autocomplete, Box, Popper, TextField, TextFieldProps, Typography } from "@mui/material";
import { DisabledTextField } from "./DisabledTextField";
import { styled } from "@mui/material/styles";
import { Account } from "@abrechnung/types";
import { useAppSelector, selectAccountSlice } from "../../store";
import { selectGroupAccounts } from "@abrechnung/redux";
import { ClearingAccountIcon, PersonalAccountIcon } from "./AbrechnungIcons";

const StyledAutocompletePopper = styled(Popper)(({ theme }) => ({
    minWidth: 200,
}));

export type AccountSelectProps = {
    groupId: number;
    onChange: (acc: Account) => void;
    value?: Account | null;
    exclude?: number[] | null;
    disabled?: boolean;
    noDisabledStyling?: boolean;
    className?: string | null;
} & Omit<TextFieldProps, "value" | "onChange">;

export const AccountSelect: React.FC<AccountSelectProps> = ({
    groupId,
    onChange,
    value = null,
    exclude = null,
    disabled = false,
    noDisabledStyling = false,
    className = null,
    ...props
}) => {
    const accounts = useAppSelector((state) => selectGroupAccounts({ state: selectAccountSlice(state), groupId }));

    const [filteredAccounts, setFilteredAccounts] = React.useState<Account[]>([]);

    React.useEffect(() => {
        setFilteredAccounts(
            exclude !== null ? accounts.filter((account) => exclude.indexOf(account.id) < 0) : accounts
        );
    }, [exclude, setFilteredAccounts, accounts]);

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
                    {option.type === "personal" ? <PersonalAccountIcon /> : <ClearingAccountIcon />}
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
