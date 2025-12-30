import { useAppSelector } from "@/store";
import { selectAccountIdToAccountMap } from "@abrechnung/redux";
import { Transaction } from "@abrechnung/types";
import * as React from "react";
import { Trans } from "react-i18next";

type TransactionPaidByProps = {
    groupId: number;
    transaction: Transaction;
};

export const TransactionPaidBy: React.FC<TransactionPaidByProps> = ({ groupId, transaction }) => {
    const accounts = useAppSelector((state) => selectAccountIdToAccountMap(state, groupId));

    const creditorNames = Object.keys(transaction.creditor_shares)
        .map((accountId) => accounts[Number(accountId)]?.name)
        .join(", ");
    const debitorNames = Object.keys(transaction.debitor_shares)
        .map((accountId) => accounts[Number(accountId)]?.name)
        .join(", ");

    return <Trans i18nKey="transactions.byFor" values={{ by: creditorNames, for: debitorNames }} />;
};
