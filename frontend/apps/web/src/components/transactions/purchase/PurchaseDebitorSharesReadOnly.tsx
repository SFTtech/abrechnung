import { useRecoilValue } from "recoil";
import {
    Box,
    Divider,
    Grid,
    List,
    ListItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { accountsSeenByUser } from "../../../state/accounts";
import { Group, Transaction, TransactionBalanceEffect, TransactionPosition } from "@abrechnung/types";
import { ClearingAccountIcon, PersonalAccountIcon } from "../../style/AbrechnungIcons";
import { useTheme } from "@mui/material/styles";

interface Props {
    group: Group;
    transaction: Transaction;
    positions: TransactionPosition[];
    transactionBalanceEffect: TransactionBalanceEffect;
}

export const PurchaseDebitorSharesReadOnly: React.FC<Props> = ({
    group,
    transaction,
    positions,
    transactionBalanceEffect,
}) => {
    const theme = useTheme();

    const accounts = useRecoilValue(accountsSeenByUser(group.id));

    const [debitorShareValues, setDebitorShareValues] = useState({});
    const [showAdvanced, setShowAdvanced] = useState(false);

    const transactionHasPositions = positions != null && positions.find((item) => !item.deleted) !== undefined;

    useEffect(() => {
        setDebitorShareValues(transaction.debitorShares);
        for (const share of Object.values(transaction.debitorShares)) {
            if (share !== 1) {
                setShowAdvanced(true);
                break;
            }
        }
    }, [transaction]);

    const debitorShareValueForAccount = (accountID) => {
        return debitorShareValues[accountID] ?? 0;
    };

    return (
        <List>
            <ListItem sx={{ paddingLeft: 0 }}>
                <Grid container direction="row" justifyContent="space-between">
                    <Typography variant="subtitle1" sx={{ marginTop: 1, marginBottom: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "flex-end" }}>For whom</Box>
                    </Typography>
                </Grid>
            </ListItem>
            <Divider variant="middle" sx={{ marginLeft: 0 }} />

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Account</TableCell>
                            {showAdvanced && <TableCell>Shares</TableCell>}
                            {transactionHasPositions ? (
                                <>
                                    <TableCell width="100px" align="right">
                                        Positions
                                    </TableCell>
                                    <TableCell width="3px" align="center">
                                        +
                                    </TableCell>
                                    <TableCell width="100px" align="right">
                                        Shared Rest
                                    </TableCell>
                                    <TableCell width="3px" align="center">
                                        =
                                    </TableCell>
                                    <TableCell width="100px" align="right">
                                        Total
                                    </TableCell>
                                </>
                            ) : (
                                <TableCell width="100px" align="right">
                                    Shared
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {accounts
                            .filter(
                                (account) =>
                                    transactionBalanceEffect[account.id] !== undefined &&
                                    (transactionBalanceEffect[account.id].commonDebitors !== 0 ||
                                        transactionBalanceEffect[account.id].positions)
                            )
                            .map((account) => (
                                <TableRow hover key={account.id}>
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
                                            to={`/groups/${group.id}/accounts/${account.id}`}
                                        >
                                            <Grid container direction="row" alignItems="center">
                                                <Grid item>
                                                    {account.type === "personal" ? (
                                                        <PersonalAccountIcon />
                                                    ) : (
                                                        <ClearingAccountIcon />
                                                    )}
                                                </Grid>
                                                <Grid item sx={{ ml: 1 }}>
                                                    <Typography variant="body2" component="span">
                                                        {account.name}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Link>
                                    </TableCell>
                                    {showAdvanced && (
                                        <TableCell width="50px">{debitorShareValueForAccount(account.id)}</TableCell>
                                    )}
                                    {transactionHasPositions ? (
                                        <>
                                            <TableCell align="right">
                                                {transactionBalanceEffect[account.id].positions.toFixed(2)}{" "}
                                                {transaction.currencySymbol}
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell align="right">
                                                {transactionBalanceEffect[account.id].commonDebitors.toFixed(2)}{" "}
                                                {transaction.currencySymbol}
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell width="100px" align="right">
                                                {(
                                                    transactionBalanceEffect[account.id].commonDebitors +
                                                    transactionBalanceEffect[account.id].positions
                                                ).toFixed(2)}{" "}
                                                {transaction.currencySymbol}
                                            </TableCell>
                                        </>
                                    ) : (
                                        <TableCell width="100px" align="right">
                                            {transactionBalanceEffect[account.id].commonDebitors.toFixed(2)}{" "}
                                            {transaction.currencySymbol}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </List>
    );
};

export default PurchaseDebitorSharesReadOnly;
