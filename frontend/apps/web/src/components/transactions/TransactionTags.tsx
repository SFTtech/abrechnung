import { selectTransactionById, wipTransactionUpdated } from "@abrechnung/redux";
import React from "react";
import { selectTransactionSlice, useAppDispatch, useAppSelector } from "../../store";
import { TagSelector } from "../TagSelector";

interface Props {
    groupId: number;
    transactionId: number;
}

export const TransactionTags: React.FC<Props> = ({ groupId, transactionId }) => {
    const dispatch = useAppDispatch();

    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    const handleChange = (newTags: string[]) => {
        dispatch(wipTransactionUpdated({ ...transaction, tags: newTags }));
    };

    return (
        <TagSelector
            margin="normal"
            fullWidth
            label="Tags"
            groupId={groupId}
            value={transaction.tags}
            editable={transaction.isWip}
            onChange={handleChange}
        />
    );
};
