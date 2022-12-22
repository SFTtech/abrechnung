import React from "react";
import AccountSelect, { AccountSelectProps } from "../style/AccountSelect";
import { Account } from "@abrechnung/types";
import { useAppSelector, useAppDispatch, selectTransactionSlice, selectAccountSlice } from "../../store";
import { selectTransactionById, selectGroupAccounts, wipTransactionUpdated } from "@abrechnung/redux";

type Props = {
    groupId: number;
    transactionId: number;
    isEditing: boolean;
    onChange?: AccountSelectProps["onChange"];
} & Omit<AccountSelectProps, "onChange">;

export const TransactionDebitorShare: React.FC<Props> = ({ groupId, transactionId, isEditing, ...props }) => {
    const accounts = useAppSelector((state) => selectGroupAccounts({ state: selectAccountSlice(state), groupId }));
    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const dispatch = useAppDispatch();

    const shareAccountID: null | number =
        Object.keys(transaction.debitorShares).length === 0 ? null : Number(Object.keys(transaction.debitorShares)[0]);

    const getAccount = (accountID: number) => {
        return accounts.find((account) => account.id === accountID);
    };

    const onDebitorShareChange = (account: Account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        if (shareAccountID !== account.id) {
            dispatch(wipTransactionUpdated({ ...transaction, debitorShares: { [account.id]: 1.0 } }));
        }
    };

    return (
        <AccountSelect
            margin="normal"
            groupId={groupId}
            noDisabledStyling={true}
            value={shareAccountID === null ? null : getAccount(shareAccountID)}
            onChange={onDebitorShareChange}
            disabled={!isEditing}
            {...props}
        />
    );
};

export default TransactionDebitorShare;
