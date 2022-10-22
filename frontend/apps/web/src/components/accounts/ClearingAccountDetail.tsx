import React from "react";
import { Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { accountsSeenByUser } from "../../state/accounts";
import { Group, Account } from "@abrechnung/types";
import { useEffect, useState } from "react";
import { accountBalances } from "../../state/transactions";
import { ClearingAccountIcon, PersonalAccountIcon } from "../style/AbrechnungIcons";
import { useTheme } from "@mui/material/styles";

interface Props {
    group: Group;
    account: Account;
}

export const ClearingAccountDetail: React.FC<Props> = ({ group, account }) => {
    const theme = useTheme();

    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const balances = useRecoilValue(accountBalances(group.id));

    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        for (const share of Object.values(account.clearingShares)) {
            if (share !== 1) {
                setShowAdvanced(true);
                break;
            }
        }
    }, [account]);

    const clearingShareValue = (accountID) => {
        return account.clearingShares?.hasOwnProperty(accountID) ? account.clearingShares[accountID] : 0;
    };

    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Account</TableCell>
                        {showAdvanced && <TableCell>Shares</TableCell>}
                        <TableCell width="100px" align="right">
                            Shared
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {accounts
                        .filter((a) => balances.get(account.id)?.clearingResolution.has(a.id))
                        .map((a) => (
                            <TableRow hover key={a.id}>
                                <TableCell sx={{ padding: "0 16px" }}>
                                    {/*TODO: proper link*/}
                                    <Link
                                        style={{
                                            color: theme.palette.text.primary,
                                            textDecoration: "none",
                                            display: "block",
                                            height: "100%",
                                            width: "100%",
                                            padding: "16px 0",
                                        }}
                                        to={`/groups/${group.id}/accounts/${a.id}`}
                                    >
                                        <Grid container direction="row" alignItems="center">
                                            <Grid item>
                                                {a.type === "personal" ? (
                                                    <PersonalAccountIcon />
                                                ) : (
                                                    <ClearingAccountIcon />
                                                )}
                                            </Grid>
                                            <Grid item sx={{ ml: 1 }}>
                                                <Typography variant="body2" component="span">
                                                    {a.name}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Link>
                                </TableCell>
                                {showAdvanced && <TableCell width="50px">{clearingShareValue(a.id)}</TableCell>}
                                <TableCell width="100px" align="right">
                                    {balances.get(account.id)?.clearingResolution.get(a.id)?.toFixed(2)}{" "}
                                    {group.currencySymbol}
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ClearingAccountDetail;
