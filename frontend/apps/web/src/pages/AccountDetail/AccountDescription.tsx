import React, { useEffect, useState } from "react";
import { DisabledTextField } from "../../components/style/DisabledTextField";
import { useAppSelector, useAppDispatch, selectAccountSlice } from "../../store";
import { selectAccountById, wipAccountUpdated } from "@abrechnung/redux";

interface Props {
    groupId: number;
    accountId: number;
}

export const AccountDescription: React.FC<Props> = ({ groupId, accountId }) => {
    const [description, setDescription] = useState("");
    const [error, setError] = useState(false);

    const dispatch = useAppDispatch();

    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );

    useEffect(() => {
        setDescription(account.description);
    }, [account, setDescription]);

    const save = () => {
        if (!error && account.isWip && description !== account.description) {
            dispatch(wipAccountUpdated({ ...account, description }));
        }
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            save();
        }
    };

    const onChange = (event) => {
        setDescription(event.target.value);
    };

    return (
        <DisabledTextField
            label="Description"
            helperText={error ? "name is required" : null}
            variant="standard"
            fullWidth
            error={error}
            onChange={onChange}
            onKeyUp={onKeyUp}
            onBlur={save}
            value={description}
            disabled={!account.isWip}
        />
    );
};

export default AccountDescription;
