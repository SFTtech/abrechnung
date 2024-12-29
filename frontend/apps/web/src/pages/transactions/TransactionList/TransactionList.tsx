import { GroupArchivedDisclaimer } from "@/components";
import { TagSelector } from "@/components/TagSelector";
import { MobilePaper } from "@/components/style";
import { PurchaseIcon, TransferIcon } from "@/components/style/AbrechnungIcons";
import { useTitle } from "@/core/utils";
import { useIsSmallScreen } from "@/hooks";
import { useAppDispatch, useAppSelector } from "@/store";
import { TransactionSortMode, transactionCsvDump } from "@abrechnung/core";
import {
    createTransaction,
    selectTransactionBalanceEffects,
    useGroup,
    useGroupAccounts,
    useIsGroupWritable,
    useSortedTransactions,
} from "@abrechnung/redux";
import { Transaction } from "@abrechnung/types";
import { Add, Clear, SaveAlt } from "@mui/icons-material";
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
    Tooltip,
} from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";
import { TransactionListItem } from "./TransactionListItem";

interface Props {
    groupId: number;
}

const emptyList: string[] = [];
const MAX_ITEMS_PER_PAGE = 40;

const downloadFile = (content: string, filename: string, mimetype: string) => {
    const blob = new Blob([content], { type: `${mimetype};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const useDownloadCsv = (groupId: number, transactions: Transaction[]) => {
    const accounts = useGroupAccounts(groupId);
    const balanceEffects = useAppSelector((state) => selectTransactionBalanceEffects(state, groupId));

    return React.useCallback(() => {
        const csv = transactionCsvDump(transactions, balanceEffects, accounts);
        downloadFile(csv, "transactions.csv", "text/csv");
    }, [accounts, balanceEffects, transactions]);
};

type TransactionListActionsProps = {
    groupId: number;
    searchValue: string;
    setSearchValue: (val: string) => void;
    sortMode: TransactionSortMode;
    setSortMode: (val: TransactionSortMode) => void;
    tagFilter: string[];
    setTagFilter: (val: string[]) => void;
    handleClickCreateTransfer: () => void;
    handleClickCreatePurchase: () => void;
    handleClickDownloadCsv: () => void;
};

const TransactionListActions: React.FC<TransactionListActionsProps> = ({
    groupId,
    searchValue,
    setSearchValue,
    sortMode,
    setSortMode,
    tagFilter,
    setTagFilter,
    handleClickCreateTransfer,
    handleClickCreatePurchase,
    handleClickDownloadCsv,
}) => {
    const { t } = useTranslation();
    const isSmallScreen = useIsSmallScreen();

    const handleChangeTagFilter = (newTags: string[]) => setTagFilter(newTags);

    const isGroupWritable = useIsGroupWritable(groupId);

    return (
        <Stack
            direction={{ sm: "column", md: "row" }}
            alignItems={{ md: "flex-end" }}
            justifyContent="space-between"
            spacing={1}
        >
            <Stack direction={{ sm: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                <Input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder={t("common.search")}
                    inputProps={{
                        "aria-label": "search",
                    }}
                    startAdornment={
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: "action.active" }} />
                        </InputAdornment>
                    }
                    endAdornment={
                        <InputAdornment position="end">
                            <IconButton aria-label="clear search input" onClick={() => setSearchValue("")} edge="end">
                                <Clear />
                            </IconButton>
                        </InputAdornment>
                    }
                />
                <FormControl variant="standard" sx={{ minWidth: 120 }}>
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
                <FormControl variant="standard" sx={{ minWidth: 120 }}>
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
            </Stack>
            {!isSmallScreen && (
                <Stack direction="row">
                    <Tooltip title={t("common.exportAsCsv")}>
                        <IconButton size="small" color="primary" onClick={handleClickDownloadCsv}>
                            <SaveAlt />
                        </IconButton>
                    </Tooltip>
                    {isGroupWritable && (
                        <>
                            <div style={{ padding: "8px" }}>
                                <Add color="primary" />
                            </div>
                            <Tooltip title={t("transactions.createPurchase")}>
                                <IconButton color="primary" onClick={handleClickCreatePurchase}>
                                    <PurchaseIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={t("transactions.createTransfer")}>
                                <IconButton color="primary" onClick={handleClickCreateTransfer}>
                                    <TransferIcon />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                </Stack>
            )}
        </Stack>
    );
};

export const TransactionList: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();

    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const group = useGroup(groupId);

    const [speedDialOpen, setSpeedDialOpen] = useState(false);
    const toggleSpeedDial = () => setSpeedDialOpen((currValue) => !currValue);

    const isGroupWritable = useIsGroupWritable(groupId);

    const [searchValue, setSearchValue] = useState("");
    const [tagFilter, setTagFilter] = useState<string[]>(emptyList);

    const [sortMode, setSortMode] = useState<TransactionSortMode>("last_changed");

    const transactions = useSortedTransactions(groupId, sortMode, searchValue, tagFilter);

    const [currentPage, setCurrentPage] = useState(0);
    const shouldShowPagination = transactions.length > MAX_ITEMS_PER_PAGE;
    const numPages = Math.ceil(transactions.length / MAX_ITEMS_PER_PAGE);

    const paginatedTransactions = transactions.slice(
        currentPage * MAX_ITEMS_PER_PAGE,
        (currentPage + 1) * MAX_ITEMS_PER_PAGE
    );

    useTitle(t("transactions.list.tabTitle", "", { groupName: group?.name }));

    const downloadCsv = useDownloadCsv(groupId, transactions);

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

    if (!group) {
        return <Navigate to="/404" />;
    }

    return (
        <>
            <MobilePaper>
                <Stack spacing={1}>
                    <GroupArchivedDisclaimer group={group} />
                    <TransactionListActions
                        groupId={group.id}
                        sortMode={sortMode}
                        setSortMode={setSortMode}
                        searchValue={searchValue}
                        tagFilter={tagFilter}
                        setTagFilter={setTagFilter}
                        setSearchValue={setSearchValue}
                        handleClickCreatePurchase={onCreatePurchase}
                        handleClickCreateTransfer={onCreateTransfer}
                        handleClickDownloadCsv={downloadCsv}
                    />
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
            {isGroupWritable && (
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
