import { GroupArchivedDisclaimer } from "@/components";
import { TagSelector } from "@/components/TagSelector";
import { DeleteAccountModal } from "@/components/accounts/DeleteAccountModal";
import { MobilePaper } from "@/components/style";
import { useTitle } from "@/core/utils";
import { useIsSmallScreen } from "@/hooks";
import { useAppDispatch } from "@/store";
import { getAccountLink } from "@/utils";
import { AccountSortMode } from "@abrechnung/core";
import { createAccount, useGroup, useIsGroupWritable, useSortedAccounts } from "@abrechnung/redux";
import { Account } from "@abrechnung/types";
import { Add as AddIcon, Clear as ClearIcon, Search as SearchIcon } from "@mui/icons-material";
import {
    Alert,
    Box,
    Divider,
    Fab,
    FormControl,
    IconButton,
    Input,
    InputAdornment,
    InputLabel,
    List,
    MenuItem,
    Pagination,
    Select,
    Stack,
    Tooltip,
} from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";
import { ClearingAccountListItem } from "./ClearingAccountListItem";

interface Props {
    groupId: number;
}

const emptyList: string[] = [];
const MAX_ITEMS_PER_PAGE = 40;

export const ClearingAccountList: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const group = useGroup(groupId);
    const isGroupWritable = useIsGroupWritable(groupId);
    const isSmallScreen = useIsSmallScreen();

    const [searchValue, setSearchValue] = useState("");
    const [tagFilter, setTagFilter] = useState<string[]>(emptyList);
    const [sortMode, setSortMode] = useState<AccountSortMode>("last_changed");
    const clearingAccounts = useSortedAccounts(groupId, sortMode, "clearing", searchValue, true, tagFilter);

    const [currentPage, setCurrentPage] = useState(0);
    const shouldShowPagination = clearingAccounts.length > MAX_ITEMS_PER_PAGE;
    const numPages = Math.ceil(clearingAccounts.length / MAX_ITEMS_PER_PAGE);

    const paginatedAccounts = clearingAccounts.slice(
        currentPage * MAX_ITEMS_PER_PAGE,
        (currentPage + 1) * MAX_ITEMS_PER_PAGE
    );

    useTitle(t("events.list.tabTitle", { groupName: group?.name }));

    const [accountDelete, setAccountDelete] = useState<Account | null>(null);
    const showDeleteModal = accountDelete !== null;

    const onCloseDeleteModal = () => {
        setAccountDelete(null);
    };

    const handleChangeTagFilter = (newTags: string[]) => setTagFilter(newTags);

    const onCreateEvent = () => {
        dispatch(createAccount({ groupId, type: "clearing" }))
            .unwrap()
            .then(({ account }) => {
                navigate(getAccountLink(groupId, account.type, account.id) + "?no-redirect=true");
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
                    <Stack
                        direction={{ sm: "column", md: "row" }}
                        alignItems={{ md: "flex-end" }}
                        justifyContent="space-between"
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
                                        <SearchIcon />
                                    </InputAdornment>
                                }
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="clear search input"
                                            sx={{ padding: 0, margin: 0 }}
                                            onClick={() => setSearchValue("")}
                                            edge="end"
                                        >
                                            <ClearIcon />
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
                                    onChange={(evt) => setSortMode(evt.target.value as AccountSortMode)}
                                    value={sortMode}
                                >
                                    <MenuItem value="last_changed">{t("common.lastChanged")}</MenuItem>
                                    <MenuItem value="name">{t("common.name")}</MenuItem>
                                    <MenuItem value="description">{t("common.description")}</MenuItem>
                                    <MenuItem value="dateInfo">{t("common.date")}</MenuItem>
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
                        {!isSmallScreen && isGroupWritable && (
                            <Box sx={{ display: "flex-item" }}>
                                <Tooltip title={t("events.createEvent")}>
                                    <IconButton color="primary" onClick={onCreateEvent}>
                                        <AddIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    </Stack>
                    <Divider />
                    <List>
                        {paginatedAccounts.length === 0 ? (
                            <Alert severity="info">{t("events.noEvents")}</Alert>
                        ) : (
                            paginatedAccounts.map((account) => (
                                <ClearingAccountListItem
                                    key={account.id}
                                    group={group}
                                    account={account}
                                    setAccountToDelete={setAccountDelete}
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
                <>
                    <DeleteAccountModal
                        groupId={groupId}
                        show={showDeleteModal}
                        onAccountDeleted={onCloseDeleteModal}
                        onClose={onCloseDeleteModal}
                        account={accountDelete}
                    />
                    <Fab color="primary" onClick={onCreateEvent} sx={{ position: "fixed", bottom: 16, right: 16 }}>
                        <AddIcon />
                    </Fab>
                </>
            )}
        </>
    );
};
