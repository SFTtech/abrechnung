import React from "react";
import AccountSelect, { AccountSelectProps } from "../style/AccountSelect";
import { useAppSelector, useAppDispatch, selectTransactionSlice, selectAccountSlice } from "../../store";
import { selectTransactionById, selectGroupAccounts, wipTransactionUpdated } from "@abrechnung/redux";

type Props = {
    groupId: number;
    transactionId: number;
    isEditing: boolean;
    onChange?: AccountSelectProps["onChange"];
} & Omit<AccountSelectProps, "onChange">;

export const TransactionCreditorShare: React.FC<Props> = ({ groupId, transactionId, isEditing, ...props }) => {
    const accounts = useAppSelector((state) => selectGroupAccounts({ state: selectAccountSlice(state), groupId }));
    const dispatch = useAppDispatch();
    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    const shareAccountID =
        Object.keys(transaction.creditorShares).length === 0 ? null : Object.keys(transaction.creditorShares)[0];

    const getAccount = (accountID) => {
        return accounts.find((account) => account.id === accountID);
    };

    const onCreditorChange = (account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        if (shareAccountID !== account.id) {
            dispatch(wipTransactionUpdated({ ...transaction, creditorShares: { [account.id]: 1.0 } }));
        }
    };

    return (
        <AccountSelect
            margin="normal"
            groupId={groupId}
            value={shareAccountID === null ? null : getAccount(parseInt(shareAccountID))}
            onChange={onCreditorChange}
            noDisabledStyling={true}
            disabled={!isEditing}
            {...props}
        />
    );
};

export default TransactionCreditorShare;
