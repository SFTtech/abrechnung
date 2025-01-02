import { AccountTransactionList } from "@/components/accounts/AccountTransactionList";
import { BalanceHistoryGraph } from "@/components/accounts/BalanceHistoryGraph";
import { ClearingAccountDetail } from "@/components/accounts/ClearingAccountDetail";
import { MobilePaper } from "@/components/style";
import { Loading } from "@abrechnung/components";
import { useQuery, useTitle } from "@/core/utils";
import { Grid2 as Grid, Typography } from "@mui/material";
import * as React from "react";
import { Navigate, useParams } from "react-router";
import { AccountInfo } from "./AccountInfo";
import { useTranslation } from "react-i18next";
import { Account } from "@abrechnung/types";
import { useAccount, useGroup } from "@abrechnung/redux";

interface Props {
    groupId: number;
}

const AccountEdit: React.FC<{ groupId: number; account: Account }> = ({ groupId, account }) => {
    return (
        <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
                <MobilePaper>
                    <AccountInfo groupId={groupId} account={account} />
                </MobilePaper>
            </Grid>
        </Grid>
    );
};

export const AccountDetail: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const params = useParams();
    const accountId = Number(params["id"]);

    const group = useGroup(groupId);
    const account = useAccount(groupId, accountId);
    const query = useQuery();

    useTitle(
        t(account?.type === "clearing" ? "accounts.detail.tabTitleEvent" : "accounts.detail.tabTitleAccount", "", {
            group,
            account,
        })
    );

    if (account === undefined) {
        if (query.get("no-redirect") === "true") {
            return <Loading />;
        } else {
            return <Navigate to="/404" />;
        }
    }

    if (account.is_wip) {
        return <AccountEdit groupId={groupId} account={account} />;
    }

    return (
        <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
                <MobilePaper>
                    <AccountInfo groupId={groupId} account={account} />
                </MobilePaper>
            </Grid>
            {account.type === "personal" && (
                <Grid size={{ xs: 12 }}>
                    <MobilePaper>
                        <Typography variant="h6">{t("accounts.balanceOf", "", { account })}</Typography>
                        <BalanceHistoryGraph groupId={groupId} accountId={accountId} />
                    </MobilePaper>
                </Grid>
            )}
            {account.type === "clearing" && (
                <Grid size={{ xs: 12 }}>
                    <MobilePaper>
                        <ClearingAccountDetail groupId={groupId} account={account} />
                    </MobilePaper>
                </Grid>
            )}
            <Grid size={{ xs: 12 }}>
                <MobilePaper>
                    <AccountTransactionList groupId={groupId} account={account} />
                </MobilePaper>
            </Grid>
        </Grid>
    );
};
