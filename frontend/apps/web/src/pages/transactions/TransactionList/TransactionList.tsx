import { TransactionSortMode } from "@abrechnung/core";
import {
    createTransaction,
    selectCurrentUserPermissions,
    selectGroupById,
    selectSortedTransactions,
} from "@abrechnung/redux";
import { Add, Clear } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
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
import { useTheme } from "@mui/material/styles";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TagSelector } from "../../../components/TagSelector";
import { PurchaseIcon, TransferIcon } from "../../../components/style/AbrechnungIcons";
import { MobilePaper } from "../../../components/style/mobile";
import { useTitle } from "../../../core/utils";
import { selectGroupSlice, useAppDispatch, useAppSelector } from "../../../store";
import { TransactionListItem } from "./TransactionListItem";

interface Props {
    groupId: number;
}
const emptyList = [];

export const TransactionList: React.FC<Props> = ({ groupId }) => {
    const theme: Theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));

    const [speedDialOpen, setSpeedDialOpen] = useState(false);
    const toggleSpeedDial = () => setSpeedDialOpen((currValue) => !currValue);

    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));

    const [searchValue, setSearchValue] = useState("");
    const [tagFilter, setTagFilter] = useState<string[]>(emptyList);

    const [sortMode, setSortMode] = useState<TransactionSortMode>("last_changed");

    const transactions = useAppSelector((state) =>
        selectSortedTransactions({ state, groupId, searchTerm: searchValue, sortMode, tags: tagFilter })
    );

    useTitle(`${group.name} - Transactions`);

    const onCreatePurchase = () => {
        dispatch(createTransaction({ groupId, type: "purchase" }))
            .unwrap()
            .then(({ transaction }) => {
                navigate(`/groups/${groupId}/transactions/${transaction.id}?no-redirect=true`);
            });
    };
    const onCreateTransfer = () => {
        dispatch(createTransaction({ groupId, type: "transfer" }))
            .unwrap()
            .then(({ transaction }) => {
                navigate(`/groups/${groupId}/transactions/${transaction.id}?no-redirect=true`);
            });
    };

    const handleChangeTagFilter = (newTags: string[]) => setTagFilter(newTags);

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
                                <MenuItem value="last_changed">Last changed</MenuItem>
                                <MenuItem value="description">Description</MenuItem>
                                <MenuItem value="value">Value</MenuItem>
                                <MenuItem value="billed_at">Date</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl variant="standard" sx={{ minWidth: 120, ml: 3 }}>
                            <TagSelector
                                label="Filter by tags"
                                groupId={groupId}
                                editable={true}
                                value={tagFilter}
                                onChange={handleChangeTagFilter}
                                addCreateNewOption={false}
                                chipProps={{ size: "small" }}
                            />
                        </FormControl>
                    </Box>
                    {!isSmallScreen && permissions.canWrite && (
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
                                <IconButton color="primary" onClick={onCreateTransfer}>
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
                        transactions.map((transaction) => (
                            <TransactionListItem
                                key={transaction.id}
                                groupId={groupId}
                                transactionId={transaction.id}
                            />
                        ))
                    )}
                </List>
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
                        onClick={onCreateTransfer}
                    />
                </SpeedDial>
            )}
        </>
    );
};

export default TransactionList;
