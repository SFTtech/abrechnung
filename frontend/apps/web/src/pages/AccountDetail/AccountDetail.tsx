import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { Grid, Typography } from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle, useQuery } from "../../core/utils";
import BalanceHistoryGraph from "../../components/accounts/BalanceHistoryGraph";
import AccountTransactionList from "../../components/accounts/AccountTransactionList";
import ClearingAccountDetail from "../../components/accounts/ClearingAccountDetail";
import { selectAccountSlice, selectGroupSlice, useAppSelector } from "../../store";
import { selectAccountById, selectGroupById } from "@abrechnung/redux";
import { AccountInfo } from "./AccountInfo";
import { Loading } from "../../components/style/Loading";

interface Props {
    groupId: number;
}

const AccountEdit: React.FC<{ groupId: number; accountId: number }> = ({ groupId, accountId }) => {
    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <MobilePaper>
                    <AccountInfo groupId={groupId} accountId={accountId} />
                </MobilePaper>
            </Grid>
        </Grid>
    );
};

export const AccountDetail: React.FC<Props> = ({ groupId }) => {
    const params = useParams();
    const accountId = Number(params["id"]);

    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const query = useQuery();

    useTitle(`${group.name} - ${account?.type === "clearing" ? "Event" : "Account"} ${account?.name}`);

    if (account === undefined) {
        if (query.get("no-redirect") === "true") {
            return <Loading />;
        } else {
            return <Navigate to="/404" />;
        }
    }

    if (account.isWip) {
        return <AccountEdit groupId={groupId} accountId={accountId} />;
    }

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <MobilePaper>
                    <AccountInfo groupId={groupId} accountId={accountId} />
                </MobilePaper>
            </Grid>
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
