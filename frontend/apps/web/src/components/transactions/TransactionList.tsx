import React, { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import {
    getTransactionSortFunc,
    TransactionSortMode,
    groupTransactionsWithBalanceEffect,
} from "../../state/transactions";
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
    Tooltip,
    useMediaQuery,
} from "@mui/material";
import { Add, Clear } from "@mui/icons-material";
import { TransactionListEntry } from "./TransactionListEntry";
import { MobilePaper } from "../style/mobile";
import { PurchaseIcon, TransferIcon } from "../style/AbrechnungIcons";
import PurchaseCreateModal from "./purchase/PurchaseCreateModal";
import TransferCreateModal from "./transfer/TransferCreateModal";
import SearchIcon from "@mui/icons-material/Search";
import { useTitle, filterTransaction } from "../../core/utils";
import { userData } from "../../state/auth";
import { accountIDsToName, accountsOwnedByUser } from "../../state/accounts";
import { useTheme } from "@mui/material/styles";
import { Group } from "@abrechnung/types";

interface Props {
    group: Group;
}

export const TransactionList: React.FC<Props> = ({ group }) => {
    const [speedDialOpen, setSpeedDialOpen] = useState(false);
    const toggleSpeedDial = () => setSpeedDialOpen((currValue) => !currValue);

    const [showTransferCreateDialog, setShowTransferCreateDialog] = useState(false);
    const [showPurchaseCreateDialog, setShowPurchaseCreateDialog] = useState(false);
    const transactions = useRecoilValue(groupTransactionsWithBalanceEffect(group.id));
    const currentUser = useRecoilValue(userData);
    const userPermissions = useRecoilValue(currUserPermissions(group.id));
    const userAccounts = useRecoilValue(accountsOwnedByUser({ groupID: group.id, userID: currentUser.id }));
    const groupAccountMap = useRecoilValue(accountIDsToName(group.id));

    const theme: Theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

    const [filteredTransactions, setFilteredTransactions] = useState([]);

    const [searchValue, setSearchValue] = useState("");

    const [sortMode, setSortMode] = useState<TransactionSortMode>("lastChanged");

    useEffect(() => {
        let filtered = transactions;
        if (searchValue != null && searchValue !== "") {
            filtered = transactions.filter((t) => filterTransaction(t, t.balanceEffect, searchValue, groupAccountMap));
        }
        filtered = [...filtered].sort(getTransactionSortFunc(sortMode));

        setFilteredTransactions(filtered);
    }, [searchValue, setFilteredTransactions, sortMode, transactions, userAccounts, groupAccountMap]);

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
                        <Box sx={{ minWidth: "56px", pt: "16px" }}>
                            <SearchIcon sx={{ color: "action.active" }} />
                        </Box>
                        <Input
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="Search…"
                            inputProps={{
                                "aria-label": "search",
                            }}
                            sx={{ pt: "16px" }}
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
                        <FormControl variant="standard" sx={{ minWidth: 120, ml: 3 }}>
                            <InputLabel id="select-sort-by-label">Sort by</InputLabel>
                            <Select
                                labelId="select-sort-by-label"
                                id="select-sort-by"
                                label="Sort by"
                                onChange={(evt) => setSortMode(evt.target.value as TransactionSortMode)}
                                value={sortMode}
                            >
                                <MenuItem value="lastChanged">Last changed</MenuItem>
                                <MenuItem value="description">Description</MenuItem>
                                <MenuItem value="value">Value</MenuItem>
                                <MenuItem value="billedAt">Date</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                    {!isSmallScreen && (
                        <Box sx={{ display: "flex-item" }}>
                            <div style={{ padding: "8px" }}>
                                <Add color="primary" />
                            </div>
                            <Tooltip title="Create Purchase">
                                <IconButton color="primary" onClick={openPurchaseCreateDialog}>
                                    <PurchaseIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Create Transfer">
                                <IconButton color="primary" onClick={openTransferCreateDialog}>
                                    <TransferIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
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
            {userPermissions.canWrite && (
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
                        icon={<PurchaseIcon />}
                        tooltipTitle="Purchase"
                        tooltipOpen
                        onClick={openPurchaseCreateDialog}
                    />
                    <SpeedDialAction
                        icon={<TransferIcon />}
                        tooltipTitle="Transfer"
                        tooltipOpen
                        onClick={openTransferCreateDialog}
                    />
                </SpeedDial>
            )}
        </>
    );
};

export default TransactionList;
