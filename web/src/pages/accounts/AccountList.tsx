import CreateAccountModal from "../../components/accounts/CreateAccountModal";
import EditAccountModal from "../../components/accounts/EditAccountModal";
import CreateClearingAccountModal from "../../components/accounts/CreateClearingAccountModal";
import EditClearingAccountModal from "../../components/accounts/EditClearingAccountModal";
import React, { useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { currUserPermissions } from "../../state/groups";
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
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    SpeedDial,
    SpeedDialAction,
    SpeedDialIcon,
    Tooltip,
    Typography,
} from "@mui/material";
import { Add, ContentCopy, Delete, Edit } from "@mui/icons-material";
import ListItemLink from "../../components/style/ListItemLink";
import { MobilePaper } from "../../components/style/mobile";
import { ClearingAccountIcon, PersonalAccountIcon } from "../../components/style/AbrechnungIcons";
import { useTitle } from "../../utils";

export default function AccountList({ group }) {
    const [showPersonalAccountCreationModal, setShowPersonalAccountCreationModal] = useState(false);
    const [showClearingAccountCreationModal, setShowClearingAccountCreationModal] = useState(false);

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
                <Typography variant="h6" sx={{ ml: 2 }}>
                    Personal Accounts
                </Typography>
                <List sx={{ maxHeight: 400, overflow: "auto" }}>
                    {personalAccounts.length === 0 ? (
                        <Alert severity="info">No Accounts</Alert>
                    ) : (
                        personalAccounts.map((account) => (
                            <ListItem sx={{ padding: 0 }} key={account.id}>
                                <ListItemLink to={`/groups/${group.id}/accounts/${account.id}`}>
                                    <ListItemText primary={account.name} secondary={account.description} />
                                </ListItemLink>
                                {userPermissions.can_write && (
                                    <ListItemSecondaryAction>
                                        <IconButton color="primary" onClick={() => openAccountEdit(account)}>
                                            <Edit />
                                        </IconButton>
                                        <IconButton color="error" onClick={() => setAccountToDelete(account.id)}>
                                            <Delete />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                )}
                            </ListItem>
                        ))
                    )}
                </List>
                {userPermissions.can_write && (
                    <>
                        <Grid container justifyContent="center">
                            <Tooltip title="Create Personal Account">
                                <IconButton color="primary" onClick={() => setShowPersonalAccountCreationModal(true)}>
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
            </MobilePaper>
            <MobilePaper sx={{ marginTop: 3 }}>
                <Typography variant="h6" sx={{ ml: 2 }}>
                    Clearing Accounts
                </Typography>
                <List sx={{ maxHeight: 450, overflow: "auto" }}>
                    {clearingAccounts.length === 0 ? (
                        <Alert severity="info">No Accounts</Alert>
                    ) : (
                        clearingAccounts.map((account) => (
                            <ListItem sx={{ padding: 0 }} key={account.id}>
                                <ListItemLink to={`/groups/${group.id}/accounts/${account.id}`}>
                                    <ListItemText primary={account.name} secondary={account.description} />
                                </ListItemLink>
                                {userPermissions.can_write && (
                                    <ListItemSecondaryAction>
                                        <IconButton color="primary" onClick={() => openClearingAccountEdit(account)}>
                                            <Edit />
                                        </IconButton>
                                        <IconButton color="primary" onClick={() => copyClearingAccount(account)}>
                                            <ContentCopy />
                                        </IconButton>
                                        <IconButton color="error" onClick={() => setAccountToDelete(account.id)}>
                                            <Delete />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                )}
                            </ListItem>
                        ))
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
            </MobilePaper>
            {userPermissions.can_write && (
                <>
                    <SpeedDial
                        ariaLabel="Create Account"
                        sx={{ position: "fixed", bottom: 20, right: 20 }}
                        icon={<SpeedDialIcon />}
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
