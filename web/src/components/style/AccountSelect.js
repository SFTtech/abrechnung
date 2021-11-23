import React from "react";

import { useRecoilValue } from "recoil";
import { groupAccounts } from "../../recoil/groups";
import { Autocomplete } from "@mui/lab";
import { TextField } from "@mui/material";


export default function AccountSelect({
                                          group,
                                          value,
                                          onChange,
                                          exclude = null,
                                          disabled = false,
                                          className = null,
                                          ...props
                                      }) {
    const accounts = useRecoilValue(groupAccounts(group.id));
    const filteredAccounts = exclude !== null ? accounts.filter(account => exclude.indexOf(account.id) < 0) : accounts;

    return (
        <Autocomplete
            options={filteredAccounts}
            getOptionLabel={(option) => option.name}
            style={{ minWidth: 200 }}
            value={value}
            disabled={disabled}
            openOnFocus
            disableClearable
            className={className}
            onChange={(event, newValue) => onChange(newValue)}
            renderInput={(params) => <TextField variant="standard" {...params} {...props} />}
        />
    );
}