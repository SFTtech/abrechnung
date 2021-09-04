import React, { useState } from "react";
import EditableField from "../../components/style/EditableField";

import { Alert } from "@material-ui/lab";
import Paper from "@material-ui/core/Paper";
import { Button, DialogActions, makeStyles } from "@material-ui/core";
import { toast } from "react-toastify";
import { leaveGroup, updateGroupMetadata } from "../../api";
import { currUserPermissions } from "../../recoil/groups";
import { useRecoilValue } from "recoil";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import Grid from "@material-ui/core/Grid";
import { useHistory } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    }
}));

export default function GroupDetail({ group }) {
    const classes = useStyles();

    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const history = useHistory();

    const userPermissions = useRecoilValue(currUserPermissions(group.id));

    // TODO: actually make the editing part work
    const updateGroup = ({ name = null, description = null, currencySymbol = null, terms = null }) => {
        updateGroupMetadata({
            groupID: group.id,
            name: name ? name : group.name,
            description: description ? description : group.description,
            currencySymbol: currencySymbol ? currencySymbol : group.currency_symbol,
            terms: terms ? terms : group.terms
        })
            .catch(err => {
                toast.error(err);
            });
    };

    const confirmLeaveGroup = () => {
        leaveGroup({ groupID: group.id })
            .then(res => {
                history.push("/")
            })
            .catch(err => {
                toast.error(err);
            });
    };

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
                onChange={name => updateGroup({ name: name })}
            />

            <EditableField
                label="Description"
                margin="normal"
                value={group.description}
                onChange={description => updateGroup({ description: description })}
            />

            <EditableField
                label="Currency Symbol"
                margin="normal"
                value={group.currency_symbol}
                onChange={currencySymbol => updateGroup({ currencySymbol: currencySymbol })}
            />

            <EditableField
                label="Terms"
                margin="normal"
                value={group.terms}
                onChange={terms => updateGroup({ terms: terms })}
            />

            {/*<List>*/}
            {/*    <ListItem>*/}
            {/*        <ListItemText primary="Created" secondary={group.created}/>*/}
            {/*    </ListItem>*/}
            {/*    <ListItem>*/}
            {/*        <ListItemText primary="Joined" secondary={group.joined}/>*/}
            {/*    </ListItem>*/}
            {/*</List>*/}

            <Grid container justify="center" style={{marginTop: 20}}>
                <Button color="secondary" variant="contained" onClick={() => setShowLeaveModal(true)}>
                    Leave Group
                </Button>
            </Grid>

            <Dialog open={showLeaveModal} onClose={() => setShowLeaveModal(false)}>
                <DialogTitle>Leave Group</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <span>Are you sure you want to leave the group {group.name}. If you are the last member to leave this group it will be deleted and its transaction will be lost forever...</span>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button color="secondary" onClick={confirmLeaveGroup}>
                        Yes pls
                    </Button>
                    <Button color="primary" onClick={() => setShowLeaveModal(false)}>
                        No
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
