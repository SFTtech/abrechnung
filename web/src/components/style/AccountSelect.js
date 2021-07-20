import React from "react";

import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";
import DisabledTextField from "./DisabledTextField";


export default function AccountSelect({group, value, onChange, disabled = false, className = null, ...props}) {
    const accounts = useRecoilValue(groupAccounts(group.group_id));

    return (
        <Autocomplete
            options={accounts}
            getOptionLabel={(option) => option.name}
            style={{minWidth: 200}}
            value={value}
            disabled={disabled}
            openOnFocus
            disableClearable
            className={className}
            onChange={(event, newValue) => onChange(newValue)}
            renderInput={(params) => <DisabledTextField {...params} {...props} />}
        />
    );
}