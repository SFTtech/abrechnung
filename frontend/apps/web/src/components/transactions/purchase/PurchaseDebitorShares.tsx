import React, { useEffect, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
    Box,
    Checkbox,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Theme,
    Typography,
    useMediaQuery,
} from "@mui/material";
import { pendingTransactionDetailChanges } from "../../../state/transactions";
import { accountsSeenByUser } from "../../../state/accounts";
import { ShareInput } from "../../ShareInput";
import { Clear, Search as SearchIcon } from "@mui/icons-material";
import { ClearingAccountIcon, PersonalAccountIcon } from "../../style/AbrechnungIcons";

function AccountTableRow({
    transaction,
    account,
    showAdvanced,
    debitorShareValueForAccount,
    showPositions,
    positionValueForAccount,
    debitorValueForAccount,
    updateDebShare,
}) {
    const transactionHasPositions =
        transaction.positions != null && transaction.positions.find((item) => !item.deleted) !== undefined;

    return (
        <TableRow hover>
            <TableCell>
                <Grid container direction="row" alignItems="center">
                    <Grid item>{account.type === "personal" ? <PersonalAccountIcon /> : <ClearingAccountIcon />}</Grid>
                    <Grid item sx={{ ml: 1 }}>
                        <Typography variant="body2" component="span">
                            {account.name}
                        </Typography>
                    </Grid>
                </Grid>
            </TableCell>
            <TableCell width="100px">
                {showAdvanced ? (
                    <ShareInput
                        onChange={(value) => updateDebShare(account.id, value)}
                        value={debitorShareValueForAccount(account.id)}
                    />
                ) : (
                    <Checkbox
                        name={`${account.name}-checked`}
                        checked={transaction.debitor_shares.hasOwnProperty(account.id)}
                        onChange={(event) => updateDebShare(account.id, event.target.checked ? 1.0 : 0)}
                    />
                )}
            </TableCell>
            {showPositions || transactionHasPositions ? (
                <>
                    <TableCell align="right">
                        {positionValueForAccount(account.id).toFixed(2)} {transaction.currency_symbol}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right">
                        {debitorValueForAccount(account.id).toFixed(2)} {transaction.currency_symbol}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell width="100px" align="right">
                        {(debitorValueForAccount(account.id) + positionValueForAccount(account.id)).toFixed(2)}{" "}
                        {transaction.currency_symbol}
                    </TableCell>
                </>
            ) : (
                <TableCell width="100px" align="right">
                    {(debitorValueForAccount(account.id) + positionValueForAccount(account.id)).toFixed(2)}{" "}
                    {transaction.currency_symbol}
                </TableCell>
            )}
        </TableRow>
    );
}

export default function PurchaseDebitorShares({ group, transaction, showPositions = false }) {
    const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"));

    const accounts = useRecoilValue(accountsSeenByUser(group.id));

    const [searchValue, setSearchValue] = useState("");
    const [filteredAccounts, setFilteredAccounts] = useState([]);

    const [showAdvanced, setShowAdvanced] = useState(false);

    const transactionHasPositions =
        transaction.positions != null && transaction.positions.find((item) => !item.deleted) !== undefined;
    const setLocalTransactionDetails = useSetRecoilState(pendingTransactionDetailChanges(transaction.id));

    useEffect(() => {
        for (const share of Object.values(transaction.debitor_shares)) {
            if (share !== 1) {
                setShowAdvanced(true);
                break;
            }
        }
    }, [transaction]);

    useEffect(() => {
        if (searchValue != null && searchValue !== "") {
            setFilteredAccounts(
                accounts.filter((acc) => {
                    return acc.name.toLowerCase().includes(searchValue.toLowerCase());
                })
            );
        } else {
            setFilteredAccounts(accounts);
        }
    }, [searchValue, accounts]);

    const debitorShareValueForAccount = (accountID) => {
        return transaction.debitor_shares && transaction.debitor_shares.hasOwnProperty(accountID)
            ? transaction.debitor_shares[accountID]
            : 0;
    };

    const debitorValueForAccount = (accountID) => {
        if (!transaction.account_balances.hasOwnProperty(accountID)) {
            return 0.0;
        }
        return transaction.account_balances[accountID].common_debitors;
    };

    const positionValueForAccount = (accountID) => {
        if (!transaction.account_balances.hasOwnProperty(accountID)) {
            return 0.0;
        }
        return transaction.account_balances[accountID].positions;
    };

    const updateDebShare = (accountID, value) => {
        if (value === 0) {
            setLocalTransactionDetails((currState) => {
                let newDebitorShares;
                if (currState.debitor_shares === undefined) {
                    newDebitorShares = {
                        ...transaction.debitor_shares,
                    };
                } else {
                    newDebitorShares = {
                        ...currState.debitor_shares,
                    };
                }
                delete newDebitorShares[accountID];
                return {
                    ...currState,
                    debitor_shares: newDebitorShares,
                };
            });
        } else {
            setLocalTransactionDetails((currState) => {
                let newDebitorShares;
                if (currState.debitor_shares === undefined) {
                    newDebitorShares = {
                        ...transaction.debitor_shares,
                        [accountID]: value,
                    };
                } else {
                    newDebitorShares = {
                        ...currState.debitor_shares,
                        [accountID]: value,
                    };
                }
                return {
                    ...currState,
                    debitor_shares: newDebitorShares,
                };
            });
        }
    };

    return (
        <div>
            <Box sx={{ paddingLeft: 0 }}>
                <Grid container direction="row" justifyContent="space-between">
                    <Typography variant="subtitle1" sx={{ marginTop: 7, marginBottom: 7 }}>
                        <Box sx={{ display: "flex", alignItems: "flex-end" }}>For whom</Box>
                    </Typography>
                    {transaction.is_wip && (
                        <FormControlLabel
                            control={<Checkbox name={`show-advanced`} />}
                            checked={showAdvanced}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                setShowAdvanced(event.target.checked)
                            }
                            label="Advanced"
                        />
                    )}
                </Grid>
            </Box>
            <Divider variant="middle" sx={{ marginLeft: 0 }} />
            <TableContainer sx={{ maxHeight: { md: 400 } }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                {isSmallScreen ? (
                                    "Account"
                                ) : (
                                    <TextField
                                        placeholder="Search ..."
                                        margin="none"
                                        size="small"
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        variant="standard"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="clear search input"
                                                        onClick={(e) => setSearchValue("")}
                                                        edge="end"
                                                    >
                                                        <Clear />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            </TableCell>
                            <TableCell width="100px">Shares</TableCell>
                            {showPositions || transactionHasPositions ? (
                                <>
                                    <TableCell width="100px" align="right">
                                        Positions
                                    </TableCell>
                                    <TableCell width="3px" align="center">
                                        +
                                    </TableCell>
                                    <TableCell width="100px" align="right">
                                        Shared + Rest
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
                        {filteredAccounts.map((account) => (
                            <AccountTableRow
                                key={account.id}
                                transaction={transaction}
                                account={account}
                                debitorValueForAccount={debitorValueForAccount}
                                debitorShareValueForAccount={debitorShareValueForAccount}
                                positionValueForAccount={positionValueForAccount}
                                showAdvanced={showAdvanced}
                                showPositions={showPositions}
                                updateDebShare={updateDebShare}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
}
