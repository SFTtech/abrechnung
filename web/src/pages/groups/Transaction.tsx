import React, { Suspense } from "react";
import { Redirect, useRouteMatch } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { transactionById } from "../../state/transactions";
import Loading from "../../components/style/Loading";
import { Alert } from "@mui/lab";
import TransferDetails from "../../components/transactions/transfer/TransferDetails";
import PurchaseDetails from "../../components/transactions/purchase/PurchaseDetails";
import { useTitle } from "../../utils";
import { Group } from "../../state/groups";

export default function Transaction({ group }: { group: Group }) {
    const match = useRouteMatch();
    const transactionID = parseInt(match.params["id"]);

    const transaction = useRecoilValue(transactionById({ groupID: group.id, transactionID: transactionID }));

    useTitle(`${group.name} - ${transaction?.description}`);

    if (transaction === undefined) {
        return <Redirect to="/404" />;
    }

    // TODO: handle 404
    return (
        <Suspense fallback={<Loading />}>
            {transaction.type === "transfer" ? (
                <TransferDetails group={group} transaction={transaction} />
            ) : transaction.type === "purchase" ? (
                <PurchaseDetails group={group} transaction={transaction} />
            ) : transaction.type === "mimo" ? (
                <Alert severity="error">Error: MIMO handling is not implemented yet</Alert>
            ) : (
                <Alert severity="error">Error: Invalid Transaction Type "{transaction.type}"</Alert>
            )}
        </Suspense>
    );
}
