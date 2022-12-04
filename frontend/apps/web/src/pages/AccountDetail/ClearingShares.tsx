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
import { ShareInput } from "../../components/ShareInput";
import { Clear, Search as SearchIcon } from "@mui/icons-material";
import { ClearingAccountIcon, PersonalAccountIcon } from "../../components/style/AbrechnungIcons";
import { useAppSelector, useAppDispatch, selectAccountSlice, selectGroupSlice } from "../../store";
import {
    selectAccountBalances,
    selectAccountById,
    selectGroupCurrencySymbol,
    wipAccountUpdated,
    selectSortedAccounts,
} from "@abrechnung/redux";

interface AccountTableRowProps {
    groupId: number;
    clearingAccountId: number;
    accountId: number;
    showAdvanced: boolean;
}

const AccountTableRow: React.FC<AccountTableRowProps> = ({ groupId, clearingAccountId, accountId, showAdvanced }) => {
    const dispatch = useAppDispatch();
    const clearingAccount = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId: clearingAccountId })
    );
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const balances = useAppSelector((state) => selectAccountBalances({ state, groupId }));

    const currencySymbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );

    const clearingShares = clearingAccount.type === "clearing" ? clearingAccount.clearingShares : {};

    const share = clearingShares[accountId] ?? 0;

    const updateClearingShares = (value) => {
        if (clearingAccount.type !== "clearing") {
            return;
        }
        if (value === 0) {
            const newShares = { ...clearingShares };
            delete newShares[accountId];

            dispatch(wipAccountUpdated({ ...clearingAccount, clearingShares: newShares }));
        } else {
            const newShares = { ...clearingShares, [accountId]: value };
            newShares[accountId] = value;

            dispatch(wipAccountUpdated({ ...clearingAccount, clearingShares: newShares }));
        }
    };

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
                    <ShareInput onChange={(value) => updateClearingShares(value)} value={share} />
                ) : (
                    <Checkbox
                        name={`${account.name}-checked`}
                        checked={share !== 0}
                        onChange={(event) => updateClearingShares(event.target.checked ? 1.0 : 0)}
                    />
                )}
            </TableCell>
            <TableCell width="100px" align="right">
                {(balances[clearingAccountId]?.clearingResolution[accountId] ?? 0).toFixed(2)} {currencySymbol}
            </TableCell>
        </TableRow>
    );
};

interface ClearingSharesProps {
    groupId: number;
    accountId: number;
}

export const ClearingShares: React.FC<ClearingSharesProps> = ({ groupId, accountId }) => {
    const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"));

    const [searchValue, setSearchValue] = useState("");
    const accounts = useAppSelector((state) =>
        selectSortedAccounts({ state: selectAccountSlice(state), groupId, sortMode: "name", searchTerm: searchValue })
    );

    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );

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

    return (
        <div>
            <Box sx={{ paddingLeft: 0 }}>
                <Grid container direction="row" justifyContent="space-between">
                    <Typography variant="subtitle1" sx={{ marginTop: 1, marginBottom: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "flex-end" }}>Participated</Box>
                    </Typography>
                    {account.isWip && (
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
                            <TableCell width="100px" align="right">
                                Shared
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {accounts
                            .filter((a) => a.id !== accountId)
                            .map((a) => (
                                <AccountTableRow
                                    key={a.id}
                                    groupId={groupId}
                                    clearingAccountId={accountId}
                                    accountId={a.id}
                                    showAdvanced={showAdvanced}
                                />
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};
