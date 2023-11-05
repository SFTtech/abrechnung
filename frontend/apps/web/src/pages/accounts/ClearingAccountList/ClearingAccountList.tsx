import { AccountSortMode } from "@abrechnung/core";
import { createAccount, selectCurrentUserPermissions, selectGroupById, selectSortedAccounts } from "@abrechnung/redux";
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
    Select,
    Theme,
    Tooltip,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TagSelector } from "../../../components/TagSelector";
import { DeleteAccountModal } from "../../../components/accounts/DeleteAccountModal";
import { MobilePaper } from "../../../components/style/mobile";
import { useTitle } from "../../../core/utils";
import { selectAccountSlice, selectGroupSlice, useAppDispatch, useAppSelector } from "../../../store";
import { getAccountLink } from "../../../utils";
import { ClearingAccountListItem } from "./ClearingAccountListItem";

interface Props {
    groupId: number;
}

const emptyList = [];

export const ClearingAccountList: React.FC<Props> = ({ groupId }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const theme: Theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

    const [searchValue, setSearchValue] = useState("");
    const [tagFilter, setTagFilter] = useState<string[]>(emptyList);
    const [sortMode, setSortMode] = useState<AccountSortMode>("last_changed");
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const clearingAccounts = useAppSelector((state) =>
        selectSortedAccounts({
            state: selectAccountSlice(state),
            groupId,
            type: "clearing",
            searchTerm: searchValue,
            sortMode,
            tags: tagFilter,
            wipAtTop: true,
        })
    );

    useTitle(`${group.name} - Events`);

    const [accountDeleteId, setAccountDeleteId] = useState<number | null>(null);
    const showDeleteModal = accountDeleteId !== null;

    const onShowDeleteModal = (accountId: number) => {
        setAccountDeleteId(accountId);
    };
    const onCloseDeleteModal = () => {
        setAccountDeleteId(null);
    };

    const handleChangeTagFilter = (newTags: string[]) => setTagFilter(newTags);

    const onCreateEvent = () => {
        dispatch(createAccount({ groupId, type: "clearing" }))
            .unwrap()
            .then(({ account }) => {
                navigate(getAccountLink(groupId, account.type, account.id) + "?no-redirect=true");
            });
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
                                        <ClearIcon />
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
                                onChange={(evt) => setSortMode(evt.target.value as AccountSortMode)}
                                value={sortMode}
                            >
                                <MenuItem value="last_changed">Last changed</MenuItem>
                                <MenuItem value="name">Name</MenuItem>
                                <MenuItem value="description">Description</MenuItem>
                                <MenuItem value="dateInfo">Date</MenuItem>
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
                    {!isSmallScreen && (
                        <Box sx={{ display: "flex-item" }}>
                            <Tooltip title="Create Event">
                                <IconButton color="primary" onClick={onCreateEvent}>
                                    <AddIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                </Box>
                <Divider sx={{ mt: 1 }} />
                <List>
                    {clearingAccounts.length === 0 ? (
                        <Alert severity="info">No Events</Alert>
                    ) : (
                        clearingAccounts.map((account) => (
                            <ClearingAccountListItem
                                key={account.id}
                                groupId={groupId}
                                accountId={account.id}
                                setAccountToDelete={onShowDeleteModal}
                            />
                        ))
                    )}
                </List>
            </MobilePaper>
            {permissions.canWrite && (
                <>
                    <DeleteAccountModal
                        groupId={groupId}
                        show={showDeleteModal}
                        onAccountDeleted={onCloseDeleteModal}
                        onClose={onCloseDeleteModal}
                        accountId={accountDeleteId}
                    />
                    <Fab color="primary" onClick={onCreateEvent} sx={{ position: "fixed", bottom: 16, right: 16 }}>
                        <AddIcon />
                    </Fab>
                </>
            )}
        </>
    );
};
