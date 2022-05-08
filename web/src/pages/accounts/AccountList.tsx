import CreateAccountModal from "../../components/accounts/CreateAccountModal";
import EditAccountModal from "../../components/accounts/EditAccountModal";
import CreateClearingAccountModal from "../../components/accounts/CreateClearingAccountModal";
import EditClearingAccountModal from "../../components/accounts/EditClearingAccountModal";
import React, { useEffect, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { currUserPermissions, groupMemberIDsToUsername } from "../../state/groups";
import {
    accountsSeenByUser,
    clearingAccountsSeenByUser,
    groupAccounts,
    personalAccountsSeenByUser,
    updateAccount,
} from "../../state/accounts";
import { deleteAccount } from "../../api";
import { toast } from "react-toastify";
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Input,
    InputAdornment,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    SpeedDial,
    SpeedDialAction,
    SpeedDialIcon,
    Tab,
    Tooltip,
} from "@mui/material";
import { Add, Clear, ContentCopy, Delete, Edit } from "@mui/icons-material";
import ListItemLink from "../../components/style/ListItemLink";
import { MobilePaper } from "../../components/style/mobile";
import { ClearingAccountIcon, PersonalAccountIcon } from "../../components/style/AbrechnungIcons";
import { useTitle } from "../../utils";
import { userData } from "../../state/auth";
import { TabContext, TabList, TabPanel } from "@mui/lab";

export default function AccountList({ group }) {
    const [speedDialOpen, setSpeedDialOpen] = useState(false);
    const toggleSpeedDial = () => setSpeedDialOpen((currValue) => !currValue);

    const [showPersonalAccountCreationModal, setShowPersonalAccountCreationModal] = useState(false);
    const [showClearingAccountCreationModal, setShowClearingAccountCreationModal] = useState(false);

    const [activeTab, setActiveTab] = useState("personal");
    const [searchValuePersonal, setSearchValuePersonal] = useState("");
    const [searchValueClearing, setSearchValueClearing] = useState("");

    const [showPersonalAccountEditModal, setShowPersonalAccountEditModal] = useState(false);
    const [showClearingAccountEditModal, setShowClearingAccountEditModal] = useState(false);
    const [clearingAccountToCopy, setClearingAccountToCopy] = useState(undefined);
    const [accountToEdit, setAccountToEdit] = useState(null);
    const [clearingAccountToEdit, setClearingAccountToEdit] = useState(null);
    const setAccounts = useSetRecoilState(groupAccounts(group.id));
    const personalAccounts = useRecoilValue(personalAccountsSeenByUser(group.id));
    const clearingAccounts = useRecoilValue(clearingAccountsSeenByUser(group.id));
    const allAccounts = useRecoilValue(accountsSeenByUser(group.id));
    const [accountToDelete, setAccountToDelete] = useState(null);
    const userPermissions = useRecoilValue(currUserPermissions(group.id));
    const currentUser = useRecoilValue(userData);
    const memberIDToUsername = useRecoilValue(groupMemberIDsToUsername(group.id));

    const [filteredPersonalAccounts, setFilteredPersonalAccounts] = useState([]);
    const [filteredClearingAccounts, setFilteredClearingAccounts] = useState([]);
    useEffect(() => {
        if (searchValuePersonal != null && searchValuePersonal !== "") {
            setFilteredPersonalAccounts(
                personalAccounts.filter((t) => {
                    return (
                        t.name.toLowerCase().includes(searchValuePersonal.toLowerCase()) ||
                        t.description.toLowerCase().includes(searchValuePersonal.toLowerCase())
                    );
                })
            );
        } else {
            return setFilteredPersonalAccounts(personalAccounts);
        }
    }, [personalAccounts, searchValuePersonal, setFilteredPersonalAccounts]);

    useEffect(() => {
        if (searchValueClearing != null && searchValueClearing !== "") {
            setFilteredClearingAccounts(
                clearingAccounts.filter((t) => {
                    return (
                        t.name.toLowerCase().includes(searchValueClearing.toLowerCase()) ||
                        t.description.toLowerCase().includes(searchValueClearing.toLowerCase())
                    );
                })
            );
        } else {
            return setFilteredClearingAccounts(clearingAccounts);
        }
    }, [clearingAccounts, searchValueClearing, setFilteredClearingAccounts]);

    useTitle(`${group.name} - Accounts`);

    const openAccountEdit = (account) => {
        setAccountToEdit(account);
        setShowPersonalAccountEditModal(true);
    };

    const closeAccountEdit = () => {
        setShowPersonalAccountEditModal(false);
        setAccountToEdit(null);
    };

    const openClearingAccountEdit = (account) => {
        setClearingAccountToEdit(account);
        setShowClearingAccountEditModal(true);
    };

    const closeClearingAccountEdit = () => {
        setShowClearingAccountEditModal(false);
        setClearingAccountToEdit(null);
    };

    const confirmDeleteAccount = () => {
        if (accountToDelete !== null) {
            deleteAccount({ accountID: accountToDelete })
                .then((account) => {
                    updateAccount(account, setAccounts);
                    setAccountToDelete(null);
                })
                .catch((err) => {
                    toast.error(err);
                });
        }
    };

    const openCreateDialog = () => {
        setClearingAccountToCopy(undefined);
        setShowClearingAccountCreationModal(true);
    };

    const copyClearingAccount = (account) => {
        setClearingAccountToCopy(account);
        setShowClearingAccountCreationModal(true);
    };

    return (
        <>
            <MobilePaper>
                <TabContext value={activeTab}>
                    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                        <TabList onChange={(e, newValue) => setActiveTab(newValue)} centered>
                            <Tab label="Personal Accounts" value="personal" />
                            <Tab label="Clearing Accounts" value="clearing" />
                        </TabList>
                    </Box>
                    <TabPanel value="personal">
                        <List>
                            {personalAccounts.length === 0 ? (
                                <Alert severity="info">No Accounts</Alert>
                            ) : (
                                <>
                                    <ListItem>
                                        <Input
                                            value={searchValuePersonal}
                                            onChange={(e) => setSearchValuePersonal(e.target.value)}
                                            placeholder="Search…"
                                            inputProps={{
                                                "aria-label": "search",
                                            }}
                                            endAdornment={
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="clear search input"
                                                        onClick={(e) => setSearchValuePersonal("")}
                                                        edge="end"
                                                    >
                                                        <Clear />
                                                    </IconButton>
                                                </InputAdornment>
                                            }
                                        />
                                    </ListItem>
                                    <Divider />
                                    {filteredPersonalAccounts.map((account) => (
                                        <ListItem sx={{ padding: 0 }} key={account.id}>
                                            <ListItemLink to={`/groups/${group.id}/accounts/${account.id}`}>
                                                <ListItemText
                                                    primary={
                                                        <div>
                                                            <span>{account.name}</span>
                                                            {account.owning_user_id === currentUser.id ? (
                                                                <span>
                                                                    , owned by{" "}
                                                                    <Chip
                                                                        size="small"
                                                                        component="span"
                                                                        color="primary"
                                                                        label="you"
                                                                    />
                                                                </span>
                                                            ) : (
                                                                account.owning_user_id !== null && (
                                                                    <span>
                                                                        , owned by{" "}
                                                                        <Chip
                                                                            size="small"
                                                                            component="span"
                                                                            color="secondary"
                                                                            label={
                                                                                memberIDToUsername[
                                                                                    account.owning_user_id
                                                                                ]
                                                                            }
                                                                        />
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    }
                                                    secondary={account.description}
                                                />
                                            </ListItemLink>
                                            {userPermissions.can_write && (
                                                <ListItemSecondaryAction>
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => openAccountEdit(account)}
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => setAccountToDelete(account.id)}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            )}
                                        </ListItem>
                                    ))}
                                </>
                            )}
                        </List>
                        {userPermissions.can_write && (
                            <>
                                <Grid container justifyContent="center">
                                    <Tooltip title="Create Personal Account">
                                        <IconButton
                                            color="primary"
                                            onClick={() => setShowPersonalAccountCreationModal(true)}
                                        >
                                            <Add />
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                                <CreateAccountModal
                                    show={showPersonalAccountCreationModal}
                                    onClose={() => setShowPersonalAccountCreationModal(false)}
                                    group={group}
                                />
                                <EditAccountModal
                                    show={showPersonalAccountEditModal}
                                    onClose={closeAccountEdit}
                                    account={accountToEdit}
                                    group={group}
                                />
                            </>
                        )}
                    </TabPanel>
                    <TabPanel value="clearing">
                        <List>
                            {clearingAccounts.length === 0 ? (
                                <Alert severity="info">No Accounts</Alert>
                            ) : (
                                <>
                                    <ListItem>
                                        <Input
                                            value={searchValueClearing}
                                            onChange={(e) => setSearchValueClearing(e.target.value)}
                                            placeholder="Search…"
                                            inputProps={{
                                                "aria-label": "search",
                                            }}
                                            endAdornment={
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="clear search input"
                                                        onClick={(e) => setSearchValueClearing("")}
                                                        edge="end"
                                                    >
                                                        <Clear />
                                                    </IconButton>
                                                </InputAdornment>
                                            }
                                        />
                                    </ListItem>
                                    <Divider />
                                    {filteredClearingAccounts.map((account) => (
                                        <ListItem sx={{ padding: 0 }} key={account.id}>
                                            <ListItemLink to={`/groups/${group.id}/accounts/${account.id}`}>
                                                <ListItemText primary={account.name} secondary={account.description} />
                                            </ListItemLink>
                                            {userPermissions.can_write && (
                                                <ListItemSecondaryAction>
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => openClearingAccountEdit(account)}
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => copyClearingAccount(account)}
                                                    >
                                                        <ContentCopy />
                                                    </IconButton>
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => setAccountToDelete(account.id)}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            )}
                                        </ListItem>
                                    ))}
                                </>
                            )}
                        </List>
                        {userPermissions.can_write && (
                            <>
                                <Grid container justifyContent="center">
                                    <Tooltip title="Create Clearing Account">
                                        <IconButton color="primary" onClick={openCreateDialog}>
                                            <Add />
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                                <CreateClearingAccountModal
                                    show={showClearingAccountCreationModal}
                                    onClose={() => setShowClearingAccountCreationModal(false)}
                                    initialValues={clearingAccountToCopy}
                                    group={group}
                                />
                                <EditClearingAccountModal
                                    show={showClearingAccountEditModal}
                                    onClose={closeClearingAccountEdit}
                                    account={clearingAccountToEdit}
                                    group={group}
                                />
                            </>
                        )}
                    </TabPanel>
                </TabContext>
            </MobilePaper>
            {userPermissions.can_write && (
                <>
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
                            icon={<PersonalAccountIcon />}
                            tooltipTitle="Create Personal Account"
                            onClick={() => setShowPersonalAccountCreationModal(true)}
                        />
                        <SpeedDialAction
                            icon={<ClearingAccountIcon />}
                            tooltipTitle="Create Clearing Account"
                            onClick={openCreateDialog}
                        />
                    </SpeedDial>

                    <Dialog maxWidth="xs" aria-labelledby="confirmation-dialog-title" open={accountToDelete !== null}>
                        <DialogTitle id="confirmation-dialog-title">Confirm delete account</DialogTitle>
                        <DialogContent dividers>
                            Are you sure you want to delete the account "
                            {allAccounts.find((acc) => acc.id === accountToDelete)?.name}"
                        </DialogContent>
                        <DialogActions>
                            <Button autoFocus onClick={() => setAccountToDelete(null)} color="primary">
                                Cancel
                            </Button>
                            <Button onClick={confirmDeleteAccount} color="error">
                                Ok
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            )}
        </>
    );
}
