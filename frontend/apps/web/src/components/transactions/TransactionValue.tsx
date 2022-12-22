import React, { useEffect, useState } from "react";
import { DisabledTextField } from "../style/DisabledTextField";
import { useAppSelector, useAppDispatch, selectTransactionSlice } from "../../store";
import { selectTransactionById, wipTransactionUpdated } from "@abrechnung/redux";
import { parseAbrechnungFloat } from "@abrechnung/utils";

interface Props {
    groupId: number;
    transactionId: number;
}

export const TransactionValue: React.FC<Props> = ({ groupId, transactionId }) => {
    const [transactionValue, setTransactionValue] = useState("");
    const [error, setError] = useState(false);

    const dispatch = useAppDispatch();

    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    useEffect(() => {
        setTransactionValue(transaction.value.toFixed(2));
    }, [transaction, setTransactionValue]);

    const save = () => {
        if (!error && transaction.isWip && transactionValue !== String(transaction.value)) {
            dispatch(wipTransactionUpdated({ ...transaction, value: parseAbrechnungFloat(transactionValue) }));
        }
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            save();
        }
    };

    const onChange = (event) => {
        const value = parseAbrechnungFloat(event.target.value);
        if (isNaN(value)) {
            setError(true);
        } else {
            setError(false);
        }
        setTransactionValue(event.target.value);
    };

    return (
        <DisabledTextField
            label="Value"
            helperText={error ? "please input a valid decimal number" : null}
            variant="standard"
            margin="dense"
            fullWidth
            error={error}
            onChange={onChange}
            onKeyUp={onKeyUp}
            onBlur={save}
            value={transactionValue}
            disabled={!transaction.isWip}
        />
    );
};

export default TransactionValue;
