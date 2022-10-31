import React, { Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { transactionByID } from "../../state/transactions";
import Loading from "../../components/style/Loading";
import TransferDetails from "../../components/transactions/transfer/TransferDetails";
import PurchaseDetails from "../../components/transactions/purchase/PurchaseDetails";
import { useTitle } from "../../core/utils";
import { Group } from "@abrechnung/types";
import { Alert } from "@mui/material";

interface Props {
    group: Group;
}

export const Transaction: React.FC<Props> = ({ group }) => {
    const params = useParams();
    const transactionID = parseInt(params["id"]);

    const transaction = useRecoilValue(transactionByID({ groupID: group.id, transactionID }));

    useTitle(`${group.name} - ${transaction?.description}`);

    if (transaction === undefined) {
        return <Navigate to="/404" />;
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
                <Alert severity="error">Error: Invalid Transaction Type &quot{transaction.type}&quot</Alert>
            )}
        </Suspense>
    );
};

export default Transaction;
