import React, {useState} from "react";

import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import AccountCreateModal from "./AccountCreateModal";
import List from "@material-ui/core/List";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItem from "@material-ui/core/ListItem";
import IconButton from "@material-ui/core/IconButton";
import Add from "@material-ui/icons/Add";
import Delete from "@material-ui/icons/Delete";
import {Edit} from "@material-ui/icons";
import Grid from "@material-ui/core/Grid";
import AccountEditModal from "./AccountEditModal";

export default function Accounts({group, showActions = true, short = false}) {
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const [showAccountEditModal, setShowAccountEditModal] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState(null);
    const accounts = useRecoilValue(groupAccounts(group.group_id));

    const openAccountEdit = (account) => {
        setAccountToEdit(account);
        setShowAccountEditModal(true);
    }

    const closeAccountEdit = () => {
        setShowAccountEditModal(false);
        setAccountToEdit(null);
    }

    return (
        <div>
            <List>
                {accounts.length === 0 ? (
                    <ListItem key={0}>
                        <ListItemText primary="No Accounts"/>
                    </ListItem>
                ) : (
                    accounts.map(account => (
                        <ListItem key={`${account.account_id}-${account.revision_id}`}>
                            {short ? (
                                <>
                                    <ListItemText primary={account.name}/>
                                    <ListItemText primary={account.balance} color={account.balance >= 0 ? "success" : "danger"}/>
                                </>
                            ) : (
                                <>
                                    <ListItemText primary={account.name}
                                                  secondary={account.description}/>
                                    <ListItemText primary={account.balance}/>
                                </>
                            )}
                            {showActions && (
                                <ListItemSecondaryAction>
                                    <IconButton color="primary" onClick={() => openAccountEdit(account)}>
                                        <Edit/>
                                    </IconButton>
                                    <IconButton color="secondary">
                                        <Delete/>
                                    </IconButton>
                                </ListItemSecondaryAction>
                            )}
                        </ListItem>
                    ))
                )}
            </List>
            {showActions && (
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
        </div>
    );
}
