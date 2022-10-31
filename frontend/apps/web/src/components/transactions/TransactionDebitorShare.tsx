import React from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { accountsSeenByUser } from "../../state/accounts";
import AccountSelect, { AccountSelectProps } from "../style/AccountSelect";
import { pendingTransactionDetailChanges } from "../../state/transactions";
import { Account, Group, Transaction } from "@abrechnung/types";

type Props = {
    group: Group;
    transaction: Transaction;
    isEditing: boolean;
    onChange?: AccountSelectProps["onChange"];
} & Omit<AccountSelectProps, "onChange">;

export const TransactionDebitorShare: React.FC<Props> = ({ group, transaction, isEditing, ...props }) => {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const shareAccountID: null | number =
        Object.keys(transaction.debitorShares).length === 0 ? null : Number(Object.keys(transaction.debitorShares)[0]);
    const setLocalTransactionDetails = useSetRecoilState(pendingTransactionDetailChanges(transaction.id));

    const getAccount = (accountID: number) => {
        return accounts.find((account) => account.id === accountID);
    };

    const onDebitorShareChange = (account: Account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        if (shareAccountID !== account.id) {
            setLocalTransactionDetails((currState) => {
                return {
                    ...currState,
                    debitorShares: {
                        [account.id]: 1.0,
                    },
                };
            });
        }
    };

    return (
        <AccountSelect
            group={group}
            noDisabledStyling={true}
            value={shareAccountID === null ? null : getAccount(shareAccountID)}
            onChange={onDebitorShareChange}
            disabled={!isEditing}
            {...props}
        />
    );
};

export default TransactionDebitorShare;
