import React, { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { transactionsSeenByUser } from "../../state/transactions";
import { currUserPermissions } from "../../state/groups";
import {
    Alert,
    Box,
    Divider,
    IconButton,
    Input,
    InputAdornment,
    List,
    SpeedDial,
    SpeedDialAction,
    SpeedDialIcon,
    ToggleButton,
    ToggleButtonGroup,
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

export default function TransactionList({ group }) {
    const [speedDialOpen, setSpeedDialOpen] = useState(false);
    const toggleSpeedDial = () => setSpeedDialOpen((currValue) => !currValue);

    const [showTransferCreateDialog, setShowTransferCreateDialog] = useState(false);
    const [showPurchaseCreateDialog, setShowPurchaseCreateDialog] = useState(false);
    const transactions = useRecoilValue(transactionsSeenByUser(group.id));
    const currentUser = useRecoilValue(userData);
    const userPermissions = useRecoilValue(currUserPermissions(group.id));
    const userAccounts = useRecoilValue(accountsOwnedByUser({ groupID: group.id, userID: currentUser.id }));

    const [filteredTransactions, setFilteredTransactions] = useState([]);

    const [searchValue, setSearchValue] = useState("");

    const [filterMode, setFilterMode] = useState("all"); // all, mine, others

    useEffect(() => {
        const userAccountIDs = userAccounts.map((a) => a.id);
        let filtered = transactions;
        if (searchValue != null && searchValue !== "") {
            filtered = transactions.filter((t) => {
                return t.description.toLowerCase().includes(searchValue.toLowerCase());
            });
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

        setFilteredTransactions(filtered);
    }, [searchValue, setFilteredTransactions, filterMode, transactions]);

    useTitle(`${group.name} - Transactions`);

    return (
        <>
            <MobilePaper>
                <Box sx={{ display: "flex", alignItems: "flex-end", pl: "16px", justifyContent: "space-between" }}>
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
                    </Box>
                    <Box sx={{ display: "flex-item" }}>
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
                    onClose={() => setShowTransferCreateDialog(false)}
                />
                <PurchaseCreateModal
                    group={group}
                    show={showPurchaseCreateDialog}
                    onClose={() => setShowPurchaseCreateDialog(false)}
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
                        tooltipTitle="Create Purchase"
                        onClick={() => setShowPurchaseCreateDialog(true)}
                    />
                    <SpeedDialAction
                        icon={<CompareArrows />}
                        tooltipTitle="Create Transfer"
                        onClick={() => setShowTransferCreateDialog(true)}
                    />
                </SpeedDial>
            )}
        </>
    );
}
