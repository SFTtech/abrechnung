import React from "react";
import EditableField from "../../components/style/EditableField";

import {Alert} from "@material-ui/lab";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Paper from "@material-ui/core/Paper";
import {makeStyles} from "@material-ui/core";
import {toast} from "react-toastify";
import {updateGroupMetadata} from "../../api";
import {currUserPermissions} from "../../recoil/groups";
import {useRecoilValue} from "recoil";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function GroupDetail({group}) {
    const classes = useStyles();

    const userPermissions = useRecoilValue(currUserPermissions(group.id));

    // TODO: actually make the editing part work
    const updateGroup = ({name = null, description = null, currencySymbol = null, terms = null}) => {
        updateGroupMetadata({
            groupID: group.id,
            name: name ? name : group.name,
            description: description ? description : group.description,
            currencySymbol: currencySymbol ? currencySymbol : group.currency_symbol,
            terms: terms ? terms : group.terms
        })
            .catch(err => {
                toast.error(`Error updating group ${err}!`);
            })
    }

    return (
        <Paper elevation={1} className={classes.paper}>
            {userPermissions.is_owner ? (
                <Alert severity="info">You are an owner of this group</Alert>
            ) : !userPermissions.can_write ? (
                <Alert severity="info">You only have read access to this group</Alert>
            ) : null}

            <EditableField
                label="Name"
                margin="normal"
                value={group.name}
                onChange={name => updateGroup({name: name})}
            />

            <EditableField
                label="Description"
                margin="normal"
                value={group.description}
                onChange={description => updateGroup({description: description})}
            />

            <EditableField
                label="Currency Symbol"
                margin="normal"
                value={group.currency_symbol}
                onChange={currencySymbol => updateGroup({currencySymbol: currencySymbol})}
            />

            <EditableField
                label="Terms"
                margin="normal"
                value={group.terms}
                onChange={terms => updateGroup({terms: terms})}
            />

            {/*<List>*/}
            {/*    <ListItem>*/}
            {/*        <ListItemText primary="Created" secondary={group.created}/>*/}
            {/*    </ListItem>*/}
            {/*    <ListItem>*/}
            {/*        <ListItemText primary="Joined" secondary={group.joined}/>*/}
            {/*    </ListItem>*/}
            {/*</List>*/}
        </Paper>
    );
}
