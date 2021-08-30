import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Grid from "@material-ui/core/Grid";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import IconButton from "@material-ui/core/IconButton";
import { Edit } from "@material-ui/icons";
import Delete from "@material-ui/icons/Delete";
import Add from "@material-ui/icons/Add";
import AccountCreateModal from "../../components/groups/AccountCreateModal";
import AccountEditModal from "../../components/groups/AccountEditModal";
import React, { useState } from "react";
import { useRecoilValue } from "recoil";
import { groupAccounts } from "../../recoil/groups";
import { makeStyles, Paper } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    }
}));

export default function Accounts({ group }) {
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const [showAccountEditModal, setShowAccountEditModal] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState(null);
    const accounts = useRecoilValue(groupAccounts(group.id));
    const classes = useStyles();

    const openAccountEdit = (account) => {
        setAccountToEdit(account);
        setShowAccountEditModal(true);
    };

    const closeAccountEdit = () => {
        setShowAccountEditModal(false);
        setAccountToEdit(null);
    };


    return (
        <Paper elevation={1} className={classes.paper}>
            <List>
                {accounts.length === 0 ? (
                    <ListItem key={0}>
                        <ListItemText primary="No Accounts" />
                    </ListItem>
                ) : (
                    accounts.map(account => (
                        <ListItem key={account.id}>
                            <ListItemText primary={account.name}
                                          secondary={account.description} />
                            <ListItemSecondaryAction>
                                <IconButton color="primary" onClick={() => openAccountEdit(account)}>
                                    <Edit />
                                </IconButton>
                                <IconButton color="secondary">
                                    <Delete />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))
                )}
            </List>
            <>
                <Grid container justify="center">
                    <IconButton color="primary"
                                onClick={() => setShowAccountCreationModal(true)}>
                        <Add />
                    </IconButton>
                </Grid>
                <AccountCreateModal show={showAccountCreationModal}
                                    onClose={() => setShowAccountCreationModal(false)}
                                    group={group} />
                <AccountEditModal show={showAccountEditModal} onClose={closeAccountEdit} account={accountToEdit}
                                  group={group} />
            </>
        </Paper>
    );
}
