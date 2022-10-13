import React from "react";
import { groupAccountByID } from "../../state/accounts";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { Grid, Typography } from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../core/utils";
import BalanceHistoryGraph from "../../components/accounts/BalanceHistoryGraph";
import AccountTransactionList from "../../components/accounts/AccountTransactionList";
import ClearingAccountDetail from "../../components/accounts/ClearingAccountDetail";

export default function AccountDetail({ group }) {
    const navigate = useNavigate();
    const params = useParams();
    const accountID = parseInt(params["id"]);

    const account = useRecoilValue(groupAccountByID({ groupID: group.id, accountID: accountID }));

    useTitle(`${group.name} - Account ${account?.name}`);

    if (account === undefined) {
        navigate("/404");
        return null;
    }

    return (
        <Grid container spacing={2}>
            {account.type === "personal" && (
                <Grid item xs={12}>
                    <MobilePaper>
                        <Typography variant="h6">Balance of {account.name}</Typography>
                        <BalanceHistoryGraph group={group} accountID={accountID} />
                    </MobilePaper>
                </Grid>
            )}
            {account.type === "clearing" && (
                <Grid item xs={12}>
                    <MobilePaper>
                        <Typography variant="h6">Clearing distribution of {account.name}</Typography>
                        <ClearingAccountDetail group={group} account={account} />
                    </MobilePaper>
                </Grid>
            )}
            <Grid item xs={12}>
                <MobilePaper>
                    <Typography variant="h6">Transactions involving {account.name}</Typography>
                    <AccountTransactionList group={group} accountID={accountID} />
                </MobilePaper>
            </Grid>
        </Grid>
    );
}
