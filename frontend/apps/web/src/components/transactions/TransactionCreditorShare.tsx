import React from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { accountsSeenByUser } from "../../state/accounts";
import AccountSelect, { AccountSelectProps } from "../style/AccountSelect";
import { pendingTransactionDetailChanges } from "../../state/transactions";
import { Group, Transaction } from "@abrechnung/types";

type Props = {
    group: Group;
    transaction: Transaction;
    isEditing: boolean;
    onChange?: AccountSelectProps["onChange"];
} & Omit<AccountSelectProps, "onChange">;

export const TransactionCreditorShare: React.FC<Props> = ({ group, transaction, isEditing, ...props }) => {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const shareAccountID =
        Object.keys(transaction.creditorShares).length === 0 ? null : Object.keys(transaction.creditorShares)[0];
    const setLocalTransactionDetails = useSetRecoilState(pendingTransactionDetailChanges(transaction.id));

    const getAccount = (accountID) => {
        return accounts.find((account) => account.id === accountID);
    };

    const onCreditorChange = (account) => {
        if (account === null) {
            return; // TODO: some error handling
        }
        if (shareAccountID !== account.id) {
            setLocalTransactionDetails((currState) => {
                return {
                    ...currState,
                    creditorShares: {
                        [account.id]: 1.0,
                    },
                };
            });
        }
    };

    return (
        <AccountSelect
            group={group}
            value={shareAccountID === null ? null : getAccount(parseInt(shareAccountID))}
            onChange={onCreditorChange}
            noDisabledStyling={true}
            disabled={!isEditing}
            {...props}
        />
    );
};

export default TransactionCreditorShare;
