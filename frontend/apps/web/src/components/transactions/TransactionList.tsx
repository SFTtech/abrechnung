import React, { useEffect, useState } from "react";
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
import TransferCreateModal from "./transfer/TransferCreateModal";
import SearchIcon from "@mui/icons-material/Search";
import { useTitle, filterTransaction } from "../../core/utils";
import { useTheme } from "@mui/material/styles";
import {
    selectAccountSlice,
    selectGroupSlice,
    selectTransactionSlice,
    useAppDispatch,
    useAppSelector,
} from "../../store";
import {
    createPurchase,
    selectAccountIdToNameMap,
    selectGroupById,
    selectGroupTransactions,
    selectTransactionBalanceEffects,
    selectCurrentUserPermissions,
} from "@abrechnung/redux";
import { getTransactionSortFunc, TransactionSortMode } from "@abrechnung/core";
import { useNavigate } from "react-router-dom";

interface Props {
    groupId: number;
}

export const TransactionList: React.FC<Props> = ({ groupId }) => {
    const theme: Theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const transactions = useAppSelector((state) =>
        selectGroupTransactions({ state: selectTransactionSlice(state), groupId })
    );
    const balanceEffects = useAppSelector((state) =>
        selectTransactionBalanceEffects({ state: selectTransactionSlice(state), groupId })
    );

    const [speedDialOpen, setSpeedDialOpen] = useState(false);
    const toggleSpeedDial = () => setSpeedDialOpen((currValue) => !currValue);

    const [showTransferCreateDialog, setShowTransferCreateDialog] = useState(false);
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const groupAccountMap = useAppSelector((state) =>
        selectAccountIdToNameMap({ state: selectAccountSlice(state), groupId })
    );

    const [filteredTransactions, setFilteredTransactions] = useState([]);

    const [searchValue, setSearchValue] = useState("");

    const [sortMode, setSortMode] = useState<TransactionSortMode>("lastChanged");

    useEffect(() => {
        let filtered = transactions;
        if (searchValue != null && searchValue !== "") {
            filtered = transactions.filter((t) =>
                filterTransaction(t, balanceEffects[t.id], searchValue, groupAccountMap)
            );
        }
        filtered = [...filtered].sort(getTransactionSortFunc(sortMode));

        setFilteredTransactions(filtered);
    }, [searchValue, balanceEffects, setFilteredTransactions, sortMode, transactions, groupAccountMap]);

    useTitle(`${group.name} - Transactions`);

    const onCreatePurchase = () => {
        dispatch(createPurchase({ groupId }))
            .unwrap()
            .then(({ transaction }) => {
                navigate(`/groups/${groupId}/transactions/${transaction.id}?no-redirect=true`);
            });
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
                                <IconButton color="primary" onClick={onCreatePurchase}>
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
                            <TransactionListEntry
                                key={transaction.id}
                                groupId={groupId}
                                transactionId={transaction.id}
                            />
                        ))
                    )}
                </List>
                <TransferCreateModal
                    groupId={groupId}
                    show={showTransferCreateDialog}
                    onClose={(evt, reason) => {
                        if (reason !== "backdropClick") {
                            setShowTransferCreateDialog(false);
                        }
                    }}
                />
            </MobilePaper>
            {permissions.canWrite && (
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
                        onClick={onCreatePurchase}
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
