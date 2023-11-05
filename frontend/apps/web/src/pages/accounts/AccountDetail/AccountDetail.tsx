import AccountTransactionList from "@/components/accounts/AccountTransactionList";
import BalanceHistoryGraph from "@/components/accounts/BalanceHistoryGraph";
import ClearingAccountDetail from "@/components/accounts/ClearingAccountDetail";
import { Loading } from "@/components/style/Loading";
import { MobilePaper } from "@/components/style/mobile";
import { useQuery, useTitle } from "@/core/utils";
import { selectAccountSlice, selectGroupSlice, useAppSelector } from "@/store";
import { selectAccountById, selectGroupById } from "@abrechnung/redux";
import { Grid, Typography } from "@mui/material";
import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { AccountInfo } from "./AccountInfo";

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

    if (account.is_wip) {
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
