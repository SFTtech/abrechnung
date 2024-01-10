import { TransactionSortMode } from "@abrechnung/core";
import {
    createTransaction,
    selectCurrentUserPermissions,
    selectGroupById,
    selectSortedTransactions,
    selectAccountIdToAccountMap,
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
    Pagination,
    Select,
    SpeedDial,
    SpeedDialAction,
    SpeedDialIcon,
    Stack,
    Theme,
    Tooltip,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { SaveAlt } from "@mui/icons-material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TagSelector } from "@/components/TagSelector";
import { PurchaseIcon, TransferIcon } from "@/components/style/AbrechnungIcons";
import { MobilePaper } from "@/components/style/mobile";
import { useTitle } from "@/core/utils";
import { selectGroupSlice, useAppDispatch, useAppSelector, selectAccountSlice } from "@/store";
import { TransactionListItem } from "./TransactionListItem";
import { useTranslation } from "react-i18next";

interface Props {
    groupId: number;
}

const emptyList = [];
const MAX_ITEMS_PER_PAGE = 40;

function exportCsv(groupId) {
    const accounts = useAppSelector((state) =>
        selectAccountIdToAccountMap({ state: selectAccountSlice(state), groupId })
    );

    let transactionsSorted = useAppSelector((state) =>
        selectSortedTransactions({ state, groupId, searchTerm: "", sortMode: "billed_at", tags: [] })
    );
    transactionsSorted = [...transactionsSorted].reverse();

    const accountIds = Object.keys(accounts).filter(id => !accounts[id].deleted);
    const accountNames = accountIds.map(id => accounts[id].name);
    const accountIndexById = Object.fromEntries(accountIds.map((id, index) => [id, index]));

    let exportedCsv = "ID,Date,Payer,Name,Tags,Value," + accountNames.join(",") + ",Description\n";
    for (const transaction of transactionsSorted) {
        if (transaction.is_wip) continue;

        const creditorId = Object.entries(transaction.creditor_shares)[0][0];
        const creditorName = accounts[creditorId].name;
        let tags = "";
        if (transaction.tags.length == 1) {
            tags = transaction.tags[0];
        } else if (transaction.tags.length > 1) {
            tags = JSON.stringify(transaction.tags.join(","));
        }

        let value = transaction.value;
        let total = accountIds.map(() => 0);

        if (transaction.type == "transfer") {
            total[accountIndexById[creditorId]] = transaction.value;
            const debitorId = Object.entries(transaction.debitor_shares)[0][0];
            total[accountIndexById[debitorId]] = -transaction.value;
            value = 0
        } else {
            let extraFromPositions = 0;
            let totalPositions = 0;
            for (let position of Object.values(transaction.positions)) {
                const totalShares = Object.values(position.usages).reduce((a, b) => a + b, 0) + position.communist_shares;
                for (let [accountId, shares] of Object.entries(position.usages)) {
                    let value = position.price*shares/totalShares;
                    total[accountIndexById[accountId]] += value;
                    totalPositions += value;
                }
                extraFromPositions += position.price*position.communist_shares/totalShares;
            }
            totalPositions += extraFromPositions;
            const valueMinusPositions = transaction.value - totalPositions;
            const totalShares = Object.values(transaction.debitor_shares).reduce((a, b) => a + b, 0);
            const numberOfDebitors = Object.values(transaction.debitor_shares).length;
            for (let [accountId, debitorShares] of Object.entries(transaction.debitor_shares)) {
                total[accountIndexById[accountId]] += valueMinusPositions*debitorShares/totalShares + extraFromPositions/numberOfDebitors;
            }
        }
        exportedCsv += `${transaction.id},${transaction.billed_at},${creditorName},${JSON.stringify(transaction.name)},${tags},${value.toFixed(2)},`;
        exportedCsv += total.map((value) => value.toFixed(2)).join(",");
        exportedCsv += "," + JSON.stringify(transaction.description) + "\n";
    }
    return exportedCsv;
}

function downloadCsv(str, filename) {
    let blob = new Blob([str], {type: "text/csv;charset=utf-8"});
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const TransactionList: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
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

    const [currentPage, setCurrentPage] = useState(0);
    const shouldShowPagination = transactions.length > MAX_ITEMS_PER_PAGE;
    const numPages = Math.ceil(transactions.length / MAX_ITEMS_PER_PAGE);

    const paginatedTransactions = transactions.slice(
        currentPage * MAX_ITEMS_PER_PAGE,
        (currentPage + 1) * MAX_ITEMS_PER_PAGE
    );

    useTitle(t("transactions.list.tabTitle", "", { groupName: group.name }));

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

    const exportedCsv = exportCsv(groupId);

    return (
        <>
            <MobilePaper>
                <Stack spacing={1}>
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
                                placeholder={t("common.search")}
                                inputProps={{
                                    "aria-label": "search",
                                }}
                                sx={{ pt: "16px" }}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="clear search input"
                                            onClick={() => setSearchValue("")}
                                            edge="end"
                                        >
                                            <Clear />
                                        </IconButton>
                                    </InputAdornment>
                                }
                            />
                            <FormControl variant="standard" sx={{ minWidth: 120, ml: 3 }}>
                                <InputLabel id="select-sort-by-label">{t("common.sortBy")}</InputLabel>
                                <Select
                                    labelId="select-sort-by-label"
                                    id="select-sort-by"
                                    label={t("common.sortBy")}
                                    onChange={(evt) => setSortMode(evt.target.value as TransactionSortMode)}
                                    value={sortMode}
                                >
                                    <MenuItem value="last_changed">{t("common.lastChanged")}</MenuItem>
                                    <MenuItem value="description">{t("common.description")}</MenuItem>
                                    <MenuItem value="value">{t("common.value")}</MenuItem>
                                    <MenuItem value="billed_at">{t("common.date")}</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl variant="standard" sx={{ minWidth: 120, ml: 3 }}>
                                <TagSelector
                                    label={t("common.filterByTags")}
                                    groupId={groupId}
                                    editable={true}
                                    value={tagFilter}
                                    onChange={handleChangeTagFilter}
                                    addCreateNewOption={false}
                                    chipProps={{ size: "small" }}
                                />
                            </FormControl>
                        </Box>
                        <Box sx={{ display: "flex-item" }}>
                            <div style={{ padding: "8px" }}>
                                <Tooltip title="Export CSV">
                                    <IconButton size="small" color="primary" onClick={() => {downloadCsv(exportedCsv, "transactions.csv");}}><SaveAlt /></IconButton>
                                </Tooltip>
                            </div>
                        </Box>
                        {!isSmallScreen && permissions.canWrite && (
                            <Box sx={{ display: "flex-item" }}>
                                <div style={{ padding: "8px" }}>
                                    <Add color="primary" />
                                </div>
                                <Tooltip title={t("transactions.createPurchase")}>
                                    <IconButton color="primary" onClick={onCreatePurchase}>
                                        <PurchaseIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t("transactions.createTransfer")}>
                                    <IconButton color="primary" onClick={onCreateTransfer}>
                                        <TransferIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    </Box>
                    <Divider />
                    <List>
                        {paginatedTransactions.length === 0 ? (
                            <Alert severity="info">{t("transactions.noTransactions")}</Alert>
                        ) : (
                            paginatedTransactions.map((transaction) => (
                                <TransactionListItem
                                    key={transaction.id}
                                    groupId={groupId}
                                    transactionId={transaction.id}
                                />
                            ))
                        )}
                    </List>
                    {shouldShowPagination && (
                        <>
                            <Divider />
                            <Box justifyContent="center" display="flex">
                                <Pagination
                                    count={numPages}
                                    page={currentPage + 1}
                                    onChange={(e, value) => setCurrentPage(value - 1)}
                                />
                            </Box>
                        </>
                    )}
                </Stack>
            </MobilePaper>
            {permissions.canWrite && (
                <SpeedDial
                    ariaLabel={t("transactions.createTransaction")}
                    sx={{ position: "fixed", bottom: 20, right: 20 }}
                    icon={<SpeedDialIcon />}
                    // onClose={() => setSpeedDialOpen(false)}
                    // onOpen={() => setSpeedDialOpen(true)}
                    onClick={toggleSpeedDial}
                    open={speedDialOpen}
                >
                    <SpeedDialAction
                        icon={<PurchaseIcon />}
                        tooltipTitle={t("transactions.purchase")}
                        tooltipOpen
                        onClick={onCreatePurchase}
                    />
                    <SpeedDialAction
                        icon={<TransferIcon />}
                        tooltipTitle={t("transactions.transfer")}
                        tooltipOpen
                        onClick={onCreateTransfer}
                    />
                </SpeedDial>
            )}
        </>
    );
};
