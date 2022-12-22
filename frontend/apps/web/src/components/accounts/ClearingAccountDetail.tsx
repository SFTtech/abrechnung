import React from "react";
import { Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ClearingAccountIcon, PersonalAccountIcon } from "../style/AbrechnungIcons";
import { useTheme } from "@mui/material/styles";
import { useAppSelector, selectAccountSlice, selectGroupSlice } from "../../store";
import {
    selectAccountBalances,
    selectAccountById,
    selectGroupAccounts,
    selectGroupCurrencySymbol,
} from "@abrechnung/redux";

interface Props {
    groupId: number;
    accountId: number;
}

export const ClearingAccountDetail: React.FC<Props> = ({ groupId, accountId }) => {
    const theme = useTheme();

    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const referencedAccounts = useAppSelector((state) =>
        selectGroupAccounts({ state: selectAccountSlice(state), groupId })
    );
    const currencySymbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );
    const balances = useAppSelector((state) => selectAccountBalances({ state, groupId }));

    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (account.type !== "clearing") {
            return;
        }
        for (const share of Object.values(account.clearingShares)) {
            if (share !== 1) {
                setShowAdvanced(true);
                break;
            }
        }
    }, [account]);

    const clearingShareValue = (accountId) => {
        if (account.type !== "clearing") {
            return 0;
        }
        return account.clearingShares[accountId] ?? 0;
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
                    {referencedAccounts
                        .filter((a) => balances[account.id]?.clearingResolution[a.id] !== undefined)
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
                                        to={`/groups/${groupId}/accounts/${a.id}`}
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
                                    {balances[account.id]?.clearingResolution[a.id]?.toFixed(2)} {currencySymbol}
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ClearingAccountDetail;
