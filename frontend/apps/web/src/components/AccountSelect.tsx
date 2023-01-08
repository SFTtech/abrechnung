import React from "react";
import { Autocomplete, Box, Popper, TextField, TextFieldProps, Typography } from "@mui/material";
import { DisabledTextField } from "./style/DisabledTextField";
import { styled } from "@mui/material/styles";
import { Account } from "@abrechnung/types";
import { useAppSelector, selectAccountSlice } from "../store";
import { selectGroupAccounts } from "@abrechnung/redux";
import { getAccountIcon } from "./style/AbrechnungIcons";

const StyledAutocompletePopper = styled(Popper)(({ theme }) => ({
    minWidth: 200,
}));

export type AccountSelectProps = {
    groupId: number;
    onChange: (acc: Account) => void;
    value?: number | undefined;
    exclude?: number[] | undefined;
    disabled?: boolean;
    noDisabledStyling?: boolean;
    className?: string | undefined;
} & Omit<TextFieldProps, "value" | "onChange">;

export const AccountSelect: React.FC<AccountSelectProps> = ({
    groupId,
    onChange,
    value,
    exclude,
    className,
    disabled = false,
    noDisabledStyling = false,
    ...props
}) => {
    const accounts = useAppSelector((state) => selectGroupAccounts({ state: selectAccountSlice(state), groupId }));

    const [filteredAccounts, setFilteredAccounts] = React.useState<Account[]>([]);

    React.useEffect(() => {
        setFilteredAccounts(exclude ? accounts.filter((account) => exclude.indexOf(account.id) < 0) : accounts);
    }, [exclude, setFilteredAccounts, accounts]);

    return (
        <Autocomplete
            options={filteredAccounts}
            getOptionLabel={(acc: Account) => acc.name}
            multiple={false}
            value={value !== undefined ? accounts.find((acc) => acc.id === value) : undefined}
            disabled={disabled}
            openOnFocus
            fullWidth
            PopperComponent={StyledAutocompletePopper}
            disableClearable
            className={className}
            onChange={(event, newValue: Account) => onChange(newValue)}
            renderOption={(props, account) => (
                <Box component="li" {...props}>
                    {getAccountIcon(account.type)}
                    <Box sx={{ ml: 1, display: "flex", flexDirection: "column" }}>
                        <Typography variant="body2" component="span">
                            {account.name}
                        </Typography>
                        {account.type === "clearing" && account.dateInfo != null && (
                            <Typography variant="caption" component="span">
                                {account.dateInfo}
                            </Typography>
                        )}
                    </Box>
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
