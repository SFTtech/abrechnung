import React, { Suspense } from "react";
import { useRouteMatch } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { transactionById } from "../../recoil/transactions";
import Loading from "../../components/style/Loading";
import { Alert } from "@mui/lab";
import TransferDetails from "../../components/transactions/transfer/TransferDetails";
import PurchaseDetails from "../../components/transactions/purchase/PurchaseDetails";
import { useTitle } from "../../utils";

export default function Transaction({ group }) {
    const match = useRouteMatch();
    const transactionID = parseInt(match.params.id);

    const transaction = useRecoilValue(transactionById({ groupID: group.id, transactionID: transactionID }));

    useTitle(`${group.name} - ${transaction.description}`);

    // TODO: handle 404
    return (
        <Suspense fallback={<Loading />}>
            {transaction.type === "transfer" ? (
                <TransferDetails group={group} transaction={transaction} />
            ) : transaction.type === "purchase" ? (
                <PurchaseDetails group={group} transaction={transaction} />
            ) : transaction.type === "mimo" ? (
                <Alert severity="danger">Error: MIMO handling is not implemented yet</Alert>
            ) : (
                <Alert severity="danger">Error: Invalid Transaction Type "{transaction.type}"</Alert>
            )}
        </Suspense>
    );
}
