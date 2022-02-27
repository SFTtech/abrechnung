import { groupAccountByID } from "../../recoil/accounts";
import { useRouteMatch } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { Grid, Typography } from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../utils";
import BalanceHistoryGraph from "../../components/accounts/BalanceHistoryGraph";
import AccountTransactionList from "../../components/accounts/AccountTransactionList";
import ClearingAccountDetail from "../../components/accounts/ClearingAccountDetail";

export default function AccountDetail({ group }) {
    const match = useRouteMatch();
    const accountID = parseInt(match.params.id);

    const account = useRecoilValue(groupAccountByID({ groupID: group.id, accountID: accountID }));
    // const userPermissions = useRecoilValue(currUserPermissions(group.id));

    useTitle(`${group.name} - Account ${account.name}`);

    // TODO: handle 404

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
