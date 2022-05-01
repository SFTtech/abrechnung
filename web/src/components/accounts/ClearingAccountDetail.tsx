import {
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Theme,
    Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { accountsSeenByUser } from "../../state/accounts";
import { useEffect, useState } from "react";
import { accountBalances } from "../../state/transactions";
import { ClearingAccountIcon, PersonalAccountIcon } from "../style/AbrechnungIcons";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme: Theme) => ({
    shareValue: {
        marginTop: 8,
        marginBottom: 9,
    },
    checkboxLabel: {
        marginTop: 7,
        marginBottom: 7,
    },
    listItem: {
        paddingLeft: 0,
    },
    divider: {
        marginLeft: 0,
    },
    tableLink: {
        color: theme.palette.text.primary,
        textDecoration: "none",
        display: "block",
        height: "100%",
        width: "100%",
        padding: "16px 0",
    },
    tableLinkCell: {
        padding: "0 16px",
    },
}));

export default function ClearingAccountDetail({ group, account }) {
    const classes = useStyles();
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const balances = useRecoilValue(accountBalances(group.id));

    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        for (const share of Object.values(account.clearing_shares)) {
            if (share !== 1) {
                setShowAdvanced(true);
                break;
            }
        }
    }, [account]);

    const clearingShareValue = (accountID) => {
        return account.clearing_shares?.hasOwnProperty(accountID) ? account.clearing_shares[accountID] : 0;
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
                        .filter((a) => balances[account.id].clearingResolution.hasOwnProperty(a.id))
                        .map((a) => (
                            <TableRow hover key={a.id}>
                                <TableCell className={classes.tableLinkCell}>
                                    {/*TODO: proper link*/}
                                    <Link className={classes.tableLink} to={`/groups/${group.id}/accounts/${a.id}`}>
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
                                    {balances[account.id].clearingResolution[a.id].toFixed(2)} {group.currency_symbol}
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
