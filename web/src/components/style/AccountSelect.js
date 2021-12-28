import React from "react";

import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import {TextField, Autocomplete} from "@mui/material";
import {DisabledTextField} from "./DisabledTextField";


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
    const accounts = useRecoilValue(groupAccounts(group.id));
    const filteredAccounts = exclude !== null ? accounts.filter(account => exclude.indexOf(account.id) < 0) : accounts;

    return (
        <Autocomplete
            options={filteredAccounts}
            getOptionLabel={(option) => option.name}
            value={value}
            disabled={disabled}
            openOnFocus
            disableClearable
            className={className}
            onChange={(event, newValue) => onChange(newValue)}
            renderInput={
                noDisabledStyling
                    ? (params) => <DisabledTextField variant="standard" {...params} {...props} />
                    : (params) => <TextField variant="standard" {...params} {...props} />
            }
        />
    );
}