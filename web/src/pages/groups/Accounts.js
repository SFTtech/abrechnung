import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Grid from "@material-ui/core/Grid";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import IconButton from "@material-ui/core/IconButton";
import {Edit} from "@material-ui/icons";
import Delete from "@material-ui/icons/Delete";
import Add from "@material-ui/icons/Add";
import AccountCreateModal from "../../components/groups/AccountCreateModal";
import AccountEditModal from "../../components/groups/AccountEditModal";
import React, {useState} from "react";
import {useRecoilValue} from "recoil";
import {currUserPermissions, groupAccounts} from "../../recoil/groups";
import {Dialog, DialogActions, DialogContent, DialogTitle, makeStyles, Paper} from "@material-ui/core";
import Button from "@material-ui/core/Button";
import {deleteAccount} from "../../api";
import {toast} from "react-toastify";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    }
}));

export default function Accounts({group}) {
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const [showAccountEditModal, setShowAccountEditModal] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState(null);
    const accounts = useRecoilValue(groupAccounts(group.id));
    const [accountToDelete, setAccountToDelete] = useState(null);
    const userPermissions = useRecoilValue(currUserPermissions(group.id));
    const classes = useStyles();

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
                .then(res => {
                    setAccountToDelete(null);
                })
                .catch(err => {
                    toast.error(err);
                })
        }
    }

    return (
        <Paper elevation={1} className={classes.paper}>
            <List>
                {accounts.length === 0 ? (
                    <ListItem key={0}>
                        <ListItemText primary="No Accounts"/>
                    </ListItem>
                ) : (
                    accounts.map(account => (
                        <ListItem key={account.id}>
                            <ListItemText primary={account.name}
                                          secondary={account.description}/>
                            {userPermissions.can_write && (
                                <ListItemSecondaryAction>
                                    <IconButton color="primary" onClick={() => openAccountEdit(account)}>
                                        <Edit/>
                                    </IconButton>
                                    <IconButton color="secondary" onClick={() => setAccountToDelete(account.id)}>
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
                    <Grid container justify="center">
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
                <DialogTitle id="confirmation-dialog-title">Confirm delete transaction</DialogTitle>
                <DialogContent dividers>
                    Are you sure you want to delete the account
                    "{accounts.find(acc => acc.id === accountToDelete)?.name}"
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={() => setAccountToDelete(null)} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={confirmDeleteAccount} color="secondary">
                        Ok
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
