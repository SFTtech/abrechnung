import React, { useEffect, useState } from "react";
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
import { Account } from "@abrechnung/types";
import { ShareInput } from "../../ShareInput";
import { Clear, Search as SearchIcon } from "@mui/icons-material";
import { ClearingAccountIcon, PersonalAccountIcon } from "../../style/AbrechnungIcons";
import { useAppSelector, useAppDispatch, selectAccountSlice, selectTransactionSlice } from "../../../store";
import {
    selectGroupAccounts,
    selectTransactionById,
    selectTransactionHasPositions,
    selectTransactionBalanceEffect,
    wipTransactionUpdated,
} from "@abrechnung/redux";

interface AccountTableRowProps {
    groupId: number;
    transactionId: number;
    account: Account;
    showAdvanced: boolean;
    debitorShareValueForAccount: (accountID: number) => number;
    showPositions: boolean;
    positionValueForAccount: (accountID: number) => number;
    debitorValueForAccount: (accountID: number) => number;
    updateDebShare: (accountID: number, value: number) => void;
}

const AccountTableRow: React.FC<AccountTableRowProps> = ({
    groupId,
    transactionId,
    account,
    showAdvanced,
    debitorShareValueForAccount,
    showPositions,
    positionValueForAccount,
    debitorValueForAccount,
    updateDebShare,
}) => {
    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const transactionHasPositions = useAppSelector((state) =>
        selectTransactionHasPositions({ state: selectTransactionSlice(state), groupId, transactionId })
    );

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
                        checked={transaction.debitorShares[account.id] !== undefined}
                        onChange={(event) => updateDebShare(account.id, event.target.checked ? 1.0 : 0)}
                    />
                )}
            </TableCell>
            {showPositions || transactionHasPositions ? (
                <>
                    <TableCell align="right">
                        {positionValueForAccount(account.id).toFixed(2)} {transaction.currencySymbol}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right">
                        {debitorValueForAccount(account.id).toFixed(2)} {transaction.currencySymbol}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell width="100px" align="right">
                        {(debitorValueForAccount(account.id) + positionValueForAccount(account.id)).toFixed(2)}{" "}
                        {transaction.currencySymbol}
                    </TableCell>
                </>
            ) : (
                <TableCell width="100px" align="right">
                    {(debitorValueForAccount(account.id) + positionValueForAccount(account.id)).toFixed(2)}{" "}
                    {transaction.currencySymbol}
                </TableCell>
            )}
        </TableRow>
    );
};

interface PurchaseDebitorSharesProps {
    groupId: number;
    transactionId: number;
    showPositions: boolean;
}

export const PurchaseDebitorShares: React.FC<PurchaseDebitorSharesProps> = ({
    groupId,
    transactionId,
    showPositions = false,
}) => {
    const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"));

    const accounts = useAppSelector((state) => selectGroupAccounts({ state: selectAccountSlice(state), groupId }));

    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const transactionHasPositions = useAppSelector((state) =>
        selectTransactionHasPositions({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const transactionBalanceEffect = useAppSelector((state) =>
        selectTransactionBalanceEffect({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    const dispatch = useAppDispatch();

    const [searchValue, setSearchValue] = useState("");
    const [filteredAccounts, setFilteredAccounts] = useState([]);

    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        for (const share of Object.values(transaction.debitorShares)) {
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
        return transaction.debitorShares && transaction.debitorShares[accountID] !== undefined
            ? transaction.debitorShares[accountID]
            : 0;
    };

    const debitorValueForAccount = (accountID: number) => {
        if (transactionBalanceEffect[accountID] === undefined) {
            return 0.0;
        }
        return transactionBalanceEffect[accountID].commonDebitors;
    };

    const positionValueForAccount = (accountID: number) => {
        if (transactionBalanceEffect[accountID] === undefined) {
            return 0.0;
        }
        return transactionBalanceEffect[accountID].positions;
    };

    const updateDebShare = (accountID, value) => {
        if (value === 0) {
            const newDebitorShares = { ...transaction.debitorShares };
            delete newDebitorShares[accountID];

            dispatch(wipTransactionUpdated({ ...transaction, debitorShares: newDebitorShares }));
        } else {
            const newDebitorShares = { ...transaction.debitorShares, [accountID]: value };
            newDebitorShares[accountID] = value;

            dispatch(wipTransactionUpdated({ ...transaction, debitorShares: newDebitorShares }));
        }
    };

    return (
        <div>
            <Box sx={{ paddingLeft: 0 }}>
                <Grid container direction="row" justifyContent="space-between">
                    <Typography variant="subtitle1" sx={{ marginTop: 1, marginBottom: 1 }}>
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
                                groupId={groupId}
                                transactionId={transactionId}
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
