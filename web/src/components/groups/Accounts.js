import React, {useState} from "react";

import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import AccountCreateModal from "./AccountCreateModal";
import List from "@material-ui/core/List";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItem from "@material-ui/core/ListItem";
import Paper from "@material-ui/core/Paper";
import IconButton from "@material-ui/core/IconButton";
import Add from "@material-ui/icons/Add";
import Delete from "@material-ui/icons/Delete";
import {Edit} from "@material-ui/icons";
import Grid from "@material-ui/core/Grid";
import {makeStyles} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function Accounts({group}) {
    const classes = useStyles();
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const accounts = useRecoilValue(groupAccounts(group.group_id));

    return (
        <Paper elevation={1} className={classes.paper}>
            <List>
                {accounts.length === 0 ? (
                    <ListItem key={0}>
                        <ListItemText primary="No Transactions"/>
                    </ListItem>
                ) : (
                    accounts.map(account => (
                        <ListItem key={account.account_id}>
                            <ListItemText primary={account.name}
                                          secondary={account.description}/>
                            <ListItemSecondaryAction>
                                <IconButton color="primary">
                                    <Edit/>
                                </IconButton>
                                <IconButton color="secondary">
                                    <Delete/>
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))
                )}
            </List>
            <Grid container justify="center">
                <IconButton color="primary"
                            onClick={() => setShowAccountCreationModal(true)}>
                    <Add/>
                </IconButton>
            </Grid>
            <AccountCreateModal show={showAccountCreationModal} onClose={() => setShowAccountCreationModal(false)}
                                group={group}/>
        </Paper>
    );
}
