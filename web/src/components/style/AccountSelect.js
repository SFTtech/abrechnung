import React from "react";

import { useRecoilValue } from "recoil";
import { groupAccounts } from "../../recoil/groups";
import { Autocomplete } from "@mui/lab";
import { TextField } from "@mui/material";
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

    let style = { minWidth: 200 };
    if (disabled) {
        style["-webkit-text-fill-color"] = "rgba(0, 0, 0, 0.8)";
        style.color = "rgba(0, 0, 0, 0.8)";
    }

    return (
        <Autocomplete
            options={filteredAccounts}
            getOptionLabel={(option) => option.name}
            style={style}
            value={value}
            disabled={disabled}
            openOnFocus
            disableClearable
            className={className}
            onChange={(event, newValue) => onChange(newValue)}
            renderInput={
                noDisabledStyling
                ? (params) => <TextField variant="standard" {...params} {...props} />
                : (params) => <DisabledTextField variant="standard" {...params} {...props} />
            }
        />
    );
}