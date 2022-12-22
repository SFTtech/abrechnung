import React, { useEffect, useState } from "react";
import { DisabledTextField } from "../style/DisabledTextField";
import { useAppSelector, useAppDispatch, selectTransactionSlice } from "../../store";
import { selectTransactionById, wipTransactionUpdated } from "@abrechnung/redux";

interface Props {
    groupId: number;
    transactionId: number;
}

export const TransactionName: React.FC<Props> = ({ groupId, transactionId }) => {
    const [name, setName] = useState("");
    const [error, setError] = useState(false);

    const dispatch = useAppDispatch();

    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    useEffect(() => {
        setName(transaction.name);
    }, [transaction, setName]);

    const save = () => {
        if (!error && transaction.isWip && name !== transaction.name) {
            dispatch(wipTransactionUpdated({ ...transaction, name: name }));
        }
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            save();
        }
    };

    const onChange = (event) => {
        const value = event.target.value;
        if (value == null || value === "") {
            setError(true);
        } else {
            setError(false);
        }
        setName(value);
    };

    return (
        <DisabledTextField
            label="Name"
            error={error}
            variant="standard"
            helperText={error ? "please input a name" : null}
            margin="dense"
            fullWidth
            onChange={onChange}
            onKeyUp={onKeyUp}
            onBlur={save}
            disabled={!transaction.isWip}
            value={name}
        />
    );
};

export default TransactionName;
