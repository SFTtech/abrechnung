import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { Grid, Typography } from "@mui/material";
import { MobilePaper } from "../components/style/mobile";
import { useTitle } from "../core/utils";
import BalanceHistoryGraph from "../components/accounts/BalanceHistoryGraph";
import AccountTransactionList from "../components/accounts/AccountTransactionList";
import ClearingAccountDetail from "../components/accounts/ClearingAccountDetail";
import { selectAccountSlice, selectGroupSlice, useAppSelector } from "../store";
import { selectAccountById, selectGroupById } from "@abrechnung/redux";

interface Props {
    groupId: number;
}

export const AccountDetail: React.FC<Props> = ({ groupId }) => {
    const params = useParams();
    const accountId = Number(params["id"]);

    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );

    useTitle(`${group.name} - Account ${account?.name}`);

    if (account === undefined) {
        return <Navigate to="/404" />;
    }

    return (
        <Grid container spacing={2}>
            {account.type === "personal" && (
                <Grid item xs={12}>
                    <MobilePaper>
                        <Typography variant="h6">Balance of {account.name}</Typography>
                        <BalanceHistoryGraph groupId={groupId} accountId={accountId} />
                    </MobilePaper>
                </Grid>
            )}
            {account.type === "clearing" && (
                <Grid item xs={12}>
                    <MobilePaper>
                        <Typography variant="h6">Clearing distribution of {account.name}</Typography>
                        <ClearingAccountDetail groupId={groupId} accountId={accountId} />
                    </MobilePaper>
                </Grid>
            )}
            <Grid item xs={12}>
                <MobilePaper>
                    <Typography variant="h6">Transactions involving {account.name}</Typography>
                    <AccountTransactionList groupId={groupId} accountId={accountId} />
                </MobilePaper>
            </Grid>
        </Grid>
    );
};

export default AccountDetail;
