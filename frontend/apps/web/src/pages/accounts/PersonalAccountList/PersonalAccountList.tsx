import { GroupArchivedDisclaimer } from "@/components";
import { DeleteAccountModal } from "@/components/accounts/DeleteAccountModal";
import { MobilePaper } from "@/components/style";
import { useTitle } from "@/core/utils";
import { useIsSmallScreen } from "@/hooks";
import { useAppDispatch, useAppSelector } from "@/store";
import { AccountSortMode } from "@abrechnung/core";
import { createAccount, selectCurrentUserId, useGroup, useIsGroupWritable, useSortedAccounts } from "@abrechnung/redux";
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
import { toast } from "react-toastify";
import { PersonalAccountListItem } from "./PersonalAccountListItem";

interface Props {
    groupId: number;
}

const MAX_ITEMS_PER_PAGE = 40;

export const PersonalAccountList: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const group = useGroup(groupId);
    const isSmallScreen = useIsSmallScreen();

    const [searchValue, setSearchValue] = useState("");
    const [sortMode, setSortMode] = useState<AccountSortMode>("name");

    const personalAccounts = useSortedAccounts(groupId, sortMode, "personal", searchValue);

    const isGroupWritable = useIsGroupWritable(groupId);
    const currentUserId = useAppSelector(selectCurrentUserId);

    const [currentPage, setCurrentPage] = useState(0);
    const shouldShowPagination = personalAccounts.length > MAX_ITEMS_PER_PAGE;
    const numPages = Math.ceil(personalAccounts.length / MAX_ITEMS_PER_PAGE);

    const paginatedAccounts = personalAccounts.slice(
        currentPage * MAX_ITEMS_PER_PAGE,
        (currentPage + 1) * MAX_ITEMS_PER_PAGE
    );

    useTitle(t("accounts.list.tabTitle", "", { groupName: group?.name }));

    const [accountDelete, setAccountDelete] = useState<Account | null>(null);
    const showDeleteModal = accountDelete !== null;

    const onCloseDeleteModal = () => {
        setAccountDelete(null);
    };

    const onCreateEvent = () => {
        dispatch(createAccount({ groupId, type: "personal" }))
            .unwrap()
            .then(({ account }) => {
                navigate(`/groups/${groupId}/accounts/${account.id}?no-redirect=true`);
            })
            .catch((err) => {
                toast.error(`Error while creating account: ${err}`);
            });
    };

    if (!group || currentUserId == null) {
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
                                        <SearchIcon sx={{ color: "action.active" }} />
                                    </InputAdornment>
                                }
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="clear search input"
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
                                    <MenuItem value="name">{t("common.name")}</MenuItem>
                                    <MenuItem value="description">{t("common.description")}</MenuItem>
                                    <MenuItem value="last_changed">{t("common.lastChanged")}</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                        {!isSmallScreen && isGroupWritable && (
                            <Box sx={{ display: "flex-item" }}>
                                <Tooltip title="Create Account">
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
                            <Alert severity="info">{t("accounts.noAccounts")}</Alert>
                        ) : (
                            paginatedAccounts.map((account) => (
                                <PersonalAccountListItem
                                    key={account.id}
                                    groupId={groupId}
                                    account={account}
                                    currentUserId={currentUserId}
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
                        onClose={onCloseDeleteModal}
                        account={accountDelete}
                    />
                    <Fab color="primary" sx={{ position: "fixed", bottom: 16, right: 16 }} onClick={onCreateEvent}>
                        <AddIcon />
                    </Fab>
                </>
            )}
        </>
    );
};
