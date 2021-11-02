import React from "react";

import { useRecoilValue } from "recoil";
import { groupAccounts } from "../../recoil/groups";
import DisabledTextField from "./DisabledTextField";
import { Autocomplete } from "@mui/lab";


export default function AccountSelect({ group, value, onChange, disabled = false, className = null, ...props }) {
    const accounts = useRecoilValue(groupAccounts(group.id));

    return (
        <Autocomplete
            options={accounts}
            getOptionLabel={(option) => option.name}
            style={{ minWidth: 200 }}
            value={value}
            disabled={disabled}
            openOnFocus
            disableClearable
            className={className}
            onChange={(event, newValue) => onChange(newValue)}
            renderInput={(params) => <DisabledTextField variant="standard" {...params} {...props} />}
        />
    );
}