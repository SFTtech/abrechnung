import { selectAccountById, wipAccountUpdated } from "@abrechnung/redux";
import React, { useEffect, useState } from "react";
import { DisabledTextField } from "../../components/style/DisabledTextField";
import { selectAccountSlice, useAppDispatch, useAppSelector } from "../../store";

interface Props {
    groupId: number;
    accountId: number;
}

export const AccountName: React.FC<Props> = ({ groupId, accountId }) => {
    const [name, setName] = useState("");
    const [error, setError] = useState(false);

    const dispatch = useAppDispatch();

    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );

    useEffect(() => {
        setName(account.name);
    }, [account, setName]);

    const save = () => {
        if (!error && account.isWip && name !== account.name) {
            dispatch(wipAccountUpdated({ ...account, name }));
        }
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            save();
        }
    };

    const onChange = (event) => {
        setName(event.target.value);
    };

    return (
        <DisabledTextField
            label="Name"
            helperText={error ? "name is required" : null}
            variant="standard"
            margin="normal"
            fullWidth
            error={error}
            onChange={onChange}
            onKeyUp={onKeyUp}
            onBlur={save}
            value={name}
            disabled={!account.isWip}
        />
    );
};

export default AccountName;
