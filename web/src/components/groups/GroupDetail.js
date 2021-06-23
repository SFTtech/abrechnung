import React from "react";
import EditableField from "../style/EditableField";

import {Alert} from "@material-ui/lab";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Paper from "@material-ui/core/Paper";
import {makeStyles} from "@material-ui/core";
import {updateGroupMetadata} from "../../recoil/groups";
import {toast} from "react-toastify";
import {useRecoilValue} from "recoil";
import {sessionToken} from "../../recoil/auth";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function GroupDetail({group}) {
    const classes = useStyles();
    const token = useRecoilValue(sessionToken);

    // TODO: actually make the editing part work
    const updateGroup = (name = null, description = null, currencySymbol = null, terms = null) => {
        updateGroupMetadata({
            sessionToken: token,
            groupID: group.group_id,
            name: name,
            description: description,
            currency_symbol: currencySymbol,
            terms: terms
        })
            .catch(err => {
                toast.error(`Error updating group ${err}!`, {
                    position: "top-right",
                    autoClose: 5000,
                });
            })
    }

    return (
        <Paper elevation={1} className={classes.paper}>
            {group.is_owner ? (
                <Alert severity="info">You are an owner of this group</Alert>
            ) : !group.can_write ? (
                <Alert severity="info">You only have read access to this group</Alert>
            ) : null}

            <EditableField
                label="Name"
                margin="normal"
                value={group.name}
                onChange={updateGroup}
            />

            <EditableField
                label="Description"
                margin="normal"
                value={group.description}
                onChange={updateGroup}
            />

            <EditableField
                label="Currency Symbol"
                margin="normal"
                value={group.currency_symbol}
                onChange={updateGroup}
            />

            <EditableField
                label="Terms"
                margin="normal"
                value={group.terms}
                onChange={updateGroup}
            />

            <List>
                <ListItem>
                    <ListItemText primary="Created" secondary={group.created}/>
                </ListItem>
                <ListItem>
                    <ListItemText primary="Joined" secondary={group.joined}/>
                </ListItem>
                <ListItem>
                    <ListItemText primary="Last changed"
                                  secondary={group.latest_commit === null ? "never" : group.latest_commit}/>
                </ListItem>
            </List>
        </Paper>
    );
}
