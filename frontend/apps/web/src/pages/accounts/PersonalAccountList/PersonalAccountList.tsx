import { DeleteAccountModal } from "@/components/accounts/DeleteAccountModal";
import { MobilePaper } from "@/components/style/mobile";
import { useTitle } from "@/core/utils";
import { selectAccountSlice, selectAuthSlice, selectGroupSlice, useAppDispatch, useAppSelector } from "@/store";
import { AccountSortMode } from "@abrechnung/core";
import {
    createAccount,
    selectCurrentUserId,
    selectCurrentUserPermissions,
    selectGroupById,
    selectSortedAccounts,
} from "@abrechnung/redux";
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
import { toast } from "react-toastify";
import { PersonalAccountListItem } from "./PersonalAccountListItem";

interface Props {
    groupId: number;
}

export const PersonalAccountList: React.FC<Props> = ({ groupId }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const theme: Theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

    const [searchValue, setSearchValue] = useState("");
    const [sortMode, setSortMode] = useState<AccountSortMode>("name");

    const personalAccounts = useAppSelector((state) =>
        selectSortedAccounts({
            state: selectAccountSlice(state),
            groupId,
            type: "personal",
            searchTerm: searchValue,
            sortMode,
        })
    );

    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state, groupId }));
    const currentUserId = useAppSelector((state) => selectCurrentUserId({ state: selectAuthSlice(state) }));

    useTitle(`${group.name} - Accounts`);

    const [accountDeleteId, setAccountDeleteId] = useState<number | null>(null);
    const showDeleteModal = accountDeleteId !== null;

    const onShowDeleteModal = (accountId: number) => {
        setAccountDeleteId(accountId);
    };
    const onCloseDeleteModal = () => {
        setAccountDeleteId(null);
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
                                <MenuItem value="name">Name</MenuItem>
                                <MenuItem value="description">Description</MenuItem>
                                <MenuItem value="last_changed">Last changed</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                    {!isSmallScreen && (
                        <Box sx={{ display: "flex-item" }}>
                            <Tooltip title="Create Account">
                                <IconButton color="primary" onClick={onCreateEvent}>
                                    <AddIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                </Box>
                <Divider sx={{ mt: 1 }} />
                <List>
                    {personalAccounts.length === 0 ? (
                        <Alert severity="info">No Accounts</Alert>
                    ) : (
                        personalAccounts.map((account) => (
                            <PersonalAccountListItem
                                key={account.id}
                                groupId={groupId}
                                accountId={account.id}
                                currentUserId={currentUserId}
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
                        onClose={onCloseDeleteModal}
                        accountId={accountDeleteId}
                    />
                    <Fab color="primary" sx={{ position: "fixed", bottom: 16, right: 16 }} onClick={onCreateEvent}>
                        <AddIcon />
                    </Fab>
                </>
            )}
        </>
    );
};
