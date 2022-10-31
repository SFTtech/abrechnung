import React, { useEffect, useState } from "react";
import { DisabledTextField } from "../style/DisabledTextField";
import { useSetRecoilState } from "recoil";
import { pendingTransactionDetailChanges } from "../../state/transactions";
import { Transaction } from "@abrechnung/types";

interface Props {
    transaction: Transaction;
}

export const TransactionDescription: React.FC<Props> = ({ transaction }) => {
    const [description, setDescription] = useState("");
    const [error, setError] = useState(false);
    const setLocalTransactionDetails = useSetRecoilState(pendingTransactionDetailChanges(transaction.id));

    useEffect(() => {
        setDescription(transaction.description);
    }, [transaction, setDescription]);

    const save = () => {
        if (!error && transaction.hasUnpublishedChanges && description !== transaction.description) {
            setLocalTransactionDetails((currState) => {
                return {
                    ...currState,
                    description: description,
                };
            });
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
        setDescription(value);
    };

    return (
        <DisabledTextField
            label="Description"
            error={error}
            variant="standard"
            helperText={error ? "please input a description" : null}
            fullWidth
            onChange={onChange}
            onKeyUp={onKeyUp}
            onBlur={save}
            disabled={!transaction.hasUnpublishedChanges}
            value={description}
        />
    );
};

export default TransactionDescription;
