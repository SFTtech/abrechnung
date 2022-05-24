import React, { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { transactionsSeenByUser, getTransactionSortFunc, transactionCompareFn } from "../../state/transactions";
import { currUserPermissions } from "../../state/groups";
import {
    Alert,
    Box,
    Divider,
    FormControl,
    IconButton,
    Input,
    InputAdornment,
    InputLabel,
    List,
    MenuItem,
    Select,
    SpeedDial,
    SpeedDialAction,
    SpeedDialIcon,
    Theme,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    useMediaQuery,
} from "@mui/material";
import { Clear, CompareArrows, ShoppingCart } from "@mui/icons-material";
import { TransactionListEntry } from "./TransactionListEntry";
import { MobilePaper } from "../style/mobile";
import PurchaseCreateModal from "./purchase/PurchaseCreateModal";
import TransferCreateModal from "./transfer/TransferCreateModal";
import SearchIcon from "@mui/icons-material/Search";
import { useTitle } from "../../utils";
import { userData } from "../../state/auth";
import { accountsOwnedByUser } from "../../state/accounts";
import { useTheme } from "@mui/styles";

export default function TransactionList({ group }) {
    const [speedDialOpen, setSpeedDialOpen] = useState(false);
    const toggleSpeedDial = () => setSpeedDialOpen((currValue) => !currValue);

    const [showTransferCreateDialog, setShowTransferCreateDialog] = useState(false);
    const [showPurchaseCreateDialog, setShowPurchaseCreateDialog] = useState(false);
    const transactions = useRecoilValue(transactionsSeenByUser(group.id));
    const currentUser = useRecoilValue(userData);
    const userPermissions = useRecoilValue(currUserPermissions(group.id));
    const userAccounts = useRecoilValue(accountsOwnedByUser({ groupID: group.id, userID: currentUser.id }));

    const theme: Theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

    const [filteredTransactions, setFilteredTransactions] = useState([]);

    const [searchValue, setSearchValue] = useState("");

    const [filterMode, setFilterMode] = useState("all"); // all, mine, others
    const [sortMode, setSortMode] = useState("last_changed"); // last_changed, description, value, billed_at

    useEffect(() => {
        const userAccountIDs = userAccounts.map((a) => a.id);
        let filtered = transactions;
        if (searchValue != null && searchValue !== "") {
            filtered = transactions.filter((t) => t.filter(searchValue));
        }
        switch (filterMode) {
            case "mine":
                filtered = filtered.filter((t) => {
                    return userAccountIDs.reduce((acc, curr) => acc || t.account_balances.hasOwnProperty(curr), false);
                });
                break;
            case "others":
                filtered = filtered.filter((t) => {
                    return userAccountIDs.reduce((acc, curr) => acc && !t.account_balances.hasOwnProperty(curr), true);
                });
                break;
        }
        filtered = [...filtered].sort(getTransactionSortFunc(sortMode));

        setFilteredTransactions(filtered);
    }, [searchValue, setFilteredTransactions, filterMode, sortMode, transactions, userAccounts]);

    useTitle(`${group.name} - Transactions`);

    const openPurchaseCreateDialog = () => {
        setShowPurchaseCreateDialog(true);
    };

    const openTransferCreateDialog = () => {
        setShowTransferCreateDialog(true);
    };

    return (
        <>
            <MobilePaper>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "column", md: "row", lg: "row" },
                        alignItems: { md: "flex-end" },
                        pl: "16px",
                        justifyContent: "space-between",
                    }}
                >
                    <Box sx={{ display: "flex-item" }}>
                        <Box sx={{ minWidth: "56px" }}>
                            <SearchIcon sx={{ color: "action.active" }} />
                        </Box>
                        <Input
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="Search…"
                            inputProps={{
                                "aria-label": "search",
                            }}
                            endAdornment={
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="clear search input"
                                        onClick={(e) => setSearchValue("")}
                                        edge="end"
                                    >
                                        <Clear />
                                    </IconButton>
                                </InputAdornment>
                            }
                        />
                        {!isSmallScreen && (
                            <>
                                <Tooltip title="Create Purchase">
                                    <IconButton sx={{ ml: 1 }} color="primary" onClick={openPurchaseCreateDialog}>
                                        <ShoppingCart />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Create Transfer">
                                    <IconButton color="primary" onClick={openTransferCreateDialog}>
                                        <CompareArrows />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </Box>
                    <Box sx={{ display: "flex-item" }}>
                        <FormControl variant="standard" sx={{ minWidth: 120, mr: 2 }}>
                            <InputLabel id="select-sort-by-label">Sort by</InputLabel>
                            <Select
                                labelId="select-sort-by-label"
                                id="select-sort-by"
                                label="Sort by"
                                onChange={(evt) => setSortMode(evt.target.value)}
                                value={sortMode}
                            >
                                <MenuItem value="last_changed">Last changed</MenuItem>
                                <MenuItem value="description">Description</MenuItem>
                                <MenuItem value="value">Value</MenuItem>
                                <MenuItem value="billed_at">Billing date</MenuItem>
                            </Select>
                        </FormControl>
                        <ToggleButtonGroup
                            color="primary"
                            value={filterMode}
                            exclusive
                            onChange={(e, newValuee) => setFilterMode(newValuee)}
                        >
                            <ToggleButton value="all">All</ToggleButton>
                            <ToggleButton value="mine">Mine</ToggleButton>
                            <ToggleButton value="others">Others</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Box>
                <Divider sx={{ mt: 1 }} />
                <List>
                    {transactions.length === 0 ? (
                        <Alert severity="info">No Transactions</Alert>
                    ) : (
                        filteredTransactions.map((transaction) => (
                            <TransactionListEntry key={transaction.id} group={group} transaction={transaction} />
                        ))
                    )}
                </List>
                <TransferCreateModal
                    group={group}
                    show={showTransferCreateDialog}
                    onClose={(evt, reason) => {
                        if (reason !== "backdropClick") {
                            setShowTransferCreateDialog(false);
                        }
                    }}
                />
                <PurchaseCreateModal
                    group={group}
                    show={showPurchaseCreateDialog}
                    onClose={(evt, reason) => {
                        if (reason !== "backdropClick") {
                            setShowPurchaseCreateDialog(false);
                        }
                    }}
                />
            </MobilePaper>
            {userPermissions.can_write && (
                <SpeedDial
                    ariaLabel="Create Account"
                    sx={{ position: "fixed", bottom: 20, right: 20 }}
                    icon={<SpeedDialIcon />}
                    // onClose={() => setSpeedDialOpen(false)}
                    // onOpen={() => setSpeedDialOpen(true)}
                    onClick={toggleSpeedDial}
                    open={speedDialOpen}
                >
                    <SpeedDialAction
                        icon={<ShoppingCart />}
                        tooltipTitle="Purchase"
                        tooltipOpen
                        onClick={openPurchaseCreateDialog}
                    />
                    <SpeedDialAction
                        icon={<CompareArrows />}
                        tooltipTitle="Transfer"
                        tooltipOpen
                        onClick={openTransferCreateDialog}
                    />
                </SpeedDial>
            )}
        </>
    );
}
