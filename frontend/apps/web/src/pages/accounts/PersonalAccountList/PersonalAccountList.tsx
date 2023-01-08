import React, { useState } from "react";
import {
    Alert,
    Box,
    Divider,
    Fab,
    IconButton,
    Input,
    InputAdornment,
    List,
    FormControl,
    InputLabel,
    Select,
    Theme,
    useTheme,
    MenuItem,
    Tooltip,
    useMediaQuery,
} from "@mui/material";
import { Add as AddIcon, Clear as ClearIcon, Search as SearchIcon } from "@mui/icons-material";
import { PersonalAccountListItem } from "./PersonalAccountListItem";
import { DeleteAccountModal } from "../../../components/accounts/DeleteAccountModal";
import { selectAccountSlice, selectAuthSlice, useAppDispatch, useAppSelector } from "../../../store";
import {
    selectCurrentUserId,
    selectCurrentUserPermissions,
    selectSortedAccounts,
    createAccount,
} from "@abrechnung/redux";
import { MobilePaper } from "../../../components/style/mobile";
import { AccountSortMode } from "@abrechnung/core";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

interface Props {
    groupId: number;
}

export const PersonalAccountList: React.FC<Props> = ({ groupId }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
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
                                <MenuItem value="lastChanged">Last changed</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                    {!isSmallScreen && (
                        <Box sx={{ display: "flex-item" }}>
                            <Tooltip title="Create Account">
                                <IconButton color="primary">
                                    <AddIcon onClick={onCreateEvent} />
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
                    <Fab color="primary" sx={{ position: "fixed", bottom: 16, right: 16 }}>
                        <AddIcon onClick={onCreateEvent} />
                    </Fab>
                </>
            )}
        </>
    );
};
