import React, { Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";
import Loading from "../../components/style/Loading";
import TransferDetails from "../../components/transactions/transfer/TransferDetails";
import PurchaseDetails from "../../components/transactions/purchase/PurchaseDetails";
import { useQuery, useTitle } from "../../core/utils";
import { Alert } from "@mui/material";
import { useAppSelector, selectGroupSlice, selectTransactionSlice } from "../../store";
import { selectGroupById, selectTransactionById } from "@abrechnung/redux";

interface Props {
    groupId: number;
}

export const Transaction: React.FC<Props> = ({ groupId }) => {
    const params = useParams();
    const transactionId = Number(params["id"]);

    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const query = useQuery();

    useTitle(`${group.name} - ${transaction?.description}`);

    if (transaction === undefined) {
        if (query.get("no-redirect") === "true") {
            return <Loading />;
        } else {
            return <Navigate to="/404" />;
        }
    }

    // TODO: handle 404
    return (
        <Suspense fallback={<Loading />}>
            {transaction.type === "transfer" ? (
                <TransferDetails groupId={groupId} transactionId={transactionId} />
            ) : transaction.type === "purchase" ? (
                <PurchaseDetails groupId={groupId} transactionId={transactionId} />
            ) : transaction.type === "mimo" ? (
                <Alert severity="error">Error: MIMO handling is not implemented yet</Alert>
            ) : (
                <Alert severity="error">Error: Invalid Transaction Type &quot{transaction.type}&quot</Alert>
            )}
        </Suspense>
    );
};

export default Transaction;
