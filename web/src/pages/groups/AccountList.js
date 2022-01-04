import AccountCreateModal from "../../components/groups/AccountCreateModal";
import AccountEditModal from "../../components/groups/AccountEditModal";
import React, {useState} from "react";
import {useRecoilValue, useSetRecoilState} from "recoil";
import {currUserPermissions, groupAccounts, groupAccountsRaw, updateAccount} from "../../recoil/groups";
import {deleteAccount} from "../../api";
import {toast} from "react-toastify";
import {
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
    Paper
} from "@mui/material";
import {Add, Delete, Edit} from "@mui/icons-material";
import ListItemLink from "../../components/style/ListItemLink";

export default function AccountList({group}) {
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const [showAccountEditModal, setShowAccountEditModal] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState(null);
    const setAccounts = useSetRecoilState(groupAccountsRaw(group.id));
    const accounts = useRecoilValue(groupAccounts(group.id));
    const [accountToDelete, setAccountToDelete] = useState(null);
    const userPermissions = useRecoilValue(currUserPermissions(group.id));

    const openAccountEdit = (account) => {
        setAccountToEdit(account);
        setShowAccountEditModal(true);
    };

    const closeAccountEdit = () => {
        setShowAccountEditModal(false);
        setAccountToEdit(null);
    };

    const confirmDeleteAccount = () => {
        if (accountToDelete !== null) {
            deleteAccount({groupID: group.id, accountID: accountToDelete})
                .then(account => {
                    updateAccount(account, setAccounts);
                    setAccountToDelete(null);
                })
                .catch(err => {
                    toast.error(err);
                });
        }
    };

    return (
        <Paper elevation={1} sx={{padding: 2}}>
            <List>
                {accounts.length === 0 ? (
                    <ListItem key={0}>
                        <ListItemText primary="No Accounts"/>
                    </ListItem>
                ) : (
                    accounts.map(account => (
                        <ListItem
                            sx={{padding: 0}}
                            key={account.id}
                        >
                            <ListItemLink
                                to={`/groups/${group.id}/accounts/${account.id}`}
                            >
                                <ListItemText primary={account.name}
                                              secondary={account.description}/>
                            </ListItemLink>
                            {userPermissions.can_write && (
                                <ListItemSecondaryAction>
                                    <IconButton color="primary" onClick={() => openAccountEdit(account)}>
                                        <Edit/>
                                    </IconButton>
                                    <IconButton color="error" onClick={() => setAccountToDelete(account.id)}>
                                        <Delete/>
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
                        <IconButton color="primary"
                                    onClick={() => setShowAccountCreationModal(true)}>
                            <Add/>
                        </IconButton>
                    </Grid>
                    <AccountCreateModal show={showAccountCreationModal}
                                        onClose={() => setShowAccountCreationModal(false)}
                                        group={group}/>
                    <AccountEditModal show={showAccountEditModal} onClose={closeAccountEdit} account={accountToEdit}
                                      group={group}/>
                </>
            )}
            <Dialog
                maxWidth="xs"
                aria-labelledby="confirmation-dialog-title"
                open={accountToDelete !== null}
            >
                <DialogTitle id="confirmation-dialog-title">Confirm delete account</DialogTitle>
                <DialogContent dividers>
                    Are you sure you want to delete the account
                    "{accounts.find(acc => acc.id === accountToDelete)?.name}"
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
        </Paper>
    );
}
