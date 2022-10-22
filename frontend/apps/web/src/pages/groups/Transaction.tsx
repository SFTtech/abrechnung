import React, { Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { transactionById } from "../../state/transactions";
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
    const navigate = useNavigate();

    const transaction = useRecoilValue(transactionById({ groupID: group.id, transactionID: transactionID }));

    useTitle(`${group.name} - ${transaction?.details.description}`);

    if (transaction === undefined) {
        navigate("/404");
        return null;
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
};

export default Transaction;
