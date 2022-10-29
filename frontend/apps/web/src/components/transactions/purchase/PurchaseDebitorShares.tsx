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
import { Group, Account, Transaction } from "@abrechnung/types";
import { ShareInput } from "../../ShareInput";
import { Clear, Search as SearchIcon } from "@mui/icons-material";
import { ClearingAccountIcon, PersonalAccountIcon } from "../../style/AbrechnungIcons";

interface AccountTableRowProps {
    transaction: Transaction;
    account: Account;
    showAdvanced: boolean;
    debitorShareValueForAccount: (accountID: number) => number;
    showPositions: boolean;
    positionValueForAccount: (accountID: number) => number;
    debitorValueForAccount: (accountID: number) => number;
    updateDebShare: (accountID: number, value: number) => void;
}

const AccountTableRow: React.FC<AccountTableRowProps> = ({
    transaction,
    account,
    showAdvanced,
    debitorShareValueForAccount,
    showPositions,
    positionValueForAccount,
    debitorValueForAccount,
    updateDebShare,
}) => {
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
                        checked={transaction.details.debitorShares[account.id] !== undefined}
                        onChange={(event) => updateDebShare(account.id, event.target.checked ? 1.0 : 0)}
                    />
                )}
            </TableCell>
            {showPositions || transactionHasPositions ? (
                <>
                    <TableCell align="right">
                        {positionValueForAccount(account.id).toFixed(2)} {transaction.details.currencySymbol}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right">
                        {debitorValueForAccount(account.id).toFixed(2)} {transaction.details.currencySymbol}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell width="100px" align="right">
                        {(debitorValueForAccount(account.id) + positionValueForAccount(account.id)).toFixed(2)}{" "}
                        {transaction.details.currencySymbol}
                    </TableCell>
                </>
            ) : (
                <TableCell width="100px" align="right">
                    {(debitorValueForAccount(account.id) + positionValueForAccount(account.id)).toFixed(2)}{" "}
                    {transaction.details.currencySymbol}
                </TableCell>
            )}
        </TableRow>
    );
};

interface PurchaseDebitorSharesProps {
    group: Group;
    transaction: Transaction;
    showPositions: boolean;
}

export const PurchaseDebitorShares: React.FC<PurchaseDebitorSharesProps> = ({
    group,
    transaction,
    showPositions = false,
}) => {
    const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"));

    const accounts = useRecoilValue(accountsSeenByUser(group.id));

    const [searchValue, setSearchValue] = useState("");
    const [filteredAccounts, setFilteredAccounts] = useState([]);

    const [showAdvanced, setShowAdvanced] = useState(false);

    const transactionHasPositions =
        transaction.positions != null && transaction.positions.find((item) => !item.deleted) !== undefined;
    const setLocalTransactionDetails = useSetRecoilState(pendingTransactionDetailChanges(transaction.id));

    useEffect(() => {
        for (const share of Object.values(transaction.details.debitorShares)) {
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

    const debitorShareValueForAccount = (accountID: number) => {
        return transaction.details.debitorShares && transaction.details.debitorShares[accountID] !== undefined
            ? transaction.details.debitorShares[accountID]
            : 0;
    };

    const debitorValueForAccount = (accountID: number) => {
        if (transaction.accountBalances[accountID] === undefined) {
            return 0.0;
        }
        return transaction.accountBalances[accountID].commonDebitors;
    };

    const positionValueForAccount = (accountID: number) => {
        if (transaction.accountBalances[accountID] === undefined) {
            return 0.0;
        }
        return transaction.accountBalances[accountID].positions;
    };

    const updateDebShare = (accountID, value) => {
        if (value === 0) {
            setLocalTransactionDetails((currState) => {
                let newDebitorShares;
                if (currState.debitorShares === undefined) {
                    newDebitorShares = {
                        ...transaction.details.debitorShares,
                    };
                } else {
                    newDebitorShares = {
                        ...currState.debitorShares,
                    };
                }
                delete newDebitorShares[accountID];
                return {
                    ...currState,
                    debitorShares: newDebitorShares,
                };
            });
        } else {
            setLocalTransactionDetails((currState) => {
                let newDebitorShares;
                if (currState.debitorShares === undefined) {
                    newDebitorShares = {
                        ...transaction.details.debitorShares,
                        [accountID]: value,
                    };
                } else {
                    newDebitorShares = {
                        ...currState.debitorShares,
                        [accountID]: value,
                    };
                }
                return {
                    ...currState,
                    debitorShares: newDebitorShares,
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
                    {transaction.isWip && (
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
};

export default PurchaseDebitorShares;
