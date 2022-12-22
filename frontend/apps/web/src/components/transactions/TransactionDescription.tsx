import React, { useEffect, useState } from "react";
import { DisabledTextField } from "../style/DisabledTextField";
import { useAppSelector, useAppDispatch, selectTransactionSlice } from "../../store";
import { selectTransactionById, wipTransactionUpdated } from "@abrechnung/redux";

interface Props {
    groupId: number;
    transactionId: number;
}

export const TransactionDescription: React.FC<Props> = ({ groupId, transactionId }) => {
    const [description, setDescription] = useState("");
    const [error, setError] = useState(false);

    const dispatch = useAppDispatch();

    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    useEffect(() => {
        setDescription(transaction.description);
    }, [transaction, setDescription]);

    const save = () => {
        if (!error && transaction.isWip && description !== transaction.description) {
            dispatch(wipTransactionUpdated({ ...transaction, description: description }));
        }
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            save();
        }
    };

    const onChange = (event) => {
        const value = event.target.value;
        if (value == null) {
            setError(true);
        } else {
            setError(false);
        }
        setDescription(value);
    };

    return (
        <DisabledTextField
            label="Description"
            error={error}
            variant="standard"
            margin="dense"
            helperText={error ? "please input a description" : null}
            fullWidth
            onChange={onChange}
            onKeyUp={onKeyUp}
            onBlur={save}
            disabled={!transaction.isWip}
            value={description}
        />
    );
};

export default TransactionDescription;
