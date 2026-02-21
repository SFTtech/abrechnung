import { AccountTransactionList } from "@/pages/accounts/AccountDetail/AccountTransactionList";
import { BalanceHistoryGraph } from "@/pages/accounts/AccountDetail/BalanceHistoryGraph";
import { ClearingAccountDetail } from "@/pages/accounts/AccountDetail/ClearingAccountDetail";
import { MobilePaper } from "@/components/style";
import { useTitle } from "@/core/utils";
import { Grid, Typography } from "@mui/material";
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

    useTitle(
        t(account?.type === "clearing" ? "accounts.detail.tabTitleEvent" : "accounts.detail.tabTitleAccount", "", {
            group,
            account,
        })
    );

    if (account === undefined) {
        return <Navigate to={`/groups/${groupId}/accounts`} />;
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
