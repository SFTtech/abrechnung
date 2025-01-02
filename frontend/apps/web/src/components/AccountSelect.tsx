import { useSortedAccounts } from "@abrechnung/redux";
import { Account } from "@abrechnung/types";
import { Autocomplete, Box, Popper, TextField, TextFieldProps, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import React from "react";
import { getAccountIcon } from "./style/AbrechnungIcons";
import { DisabledTextField } from "@abrechnung/components";

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
    const accounts = useSortedAccounts(groupId, "name");

    const filteredAccounts = React.useMemo<Account[]>(() => {
        return exclude ? accounts.filter((account) => exclude.indexOf(account.id) < 0) : accounts;
    }, [accounts, exclude]);

    return (
        <Autocomplete
            options={filteredAccounts}
            getOptionLabel={(acc: Account) => acc.name}
            multiple={false}
            value={value !== undefined ? (accounts.find((acc) => acc.id === value) ?? undefined) : undefined}
            disabled={disabled}
            openOnFocus
            fullWidth
            slots={{ popper: StyledAutocompletePopper }}
            disableClearable
            className={className}
            onChange={(event, newValue: Account) => onChange(newValue)}
            renderOption={({ key, ...props }, account) => (
                <Box component="li" key={key} {...props}>
                    {getAccountIcon(account.type)}
                    <Box sx={{ ml: 1, display: "flex", flexDirection: "column" }}>
                        <Typography variant="body2" component="span">
                            {account.name}
                        </Typography>
                        {account.type === "clearing" && account.date_info != null && (
                            <Typography variant="caption" component="span">
                                {account.date_info}
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
