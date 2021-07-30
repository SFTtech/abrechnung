import React, {useState} from "react";

import {useRecoilValue} from "recoil";
import {deleteInviteToken, groupInviteTokens} from "../../recoil/groups";
import InviteLinkCreate from "../../components/groups/InviteLinkCreate";
import {toast} from "react-toastify";
import List from "@material-ui/core/List";
import IconButton from "@material-ui/core/IconButton";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import Delete from "@material-ui/icons/Delete";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import AddIcon from "@material-ui/icons/Add";
import { makeStyles, Paper } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function GroupInvites({group}) {
    const classes = useStyles();
    const [showModal, setShowModal] = useState(false);
    const tokens = useRecoilValue(groupInviteTokens(group.id));

    const deleteToken = (id) => {
        deleteInviteToken({groupID: group.id, tokenID: id})
            .then(result => {
                toast.success(`Removed invite link`, {
                    position: "top-right",
                    autoClose: 5000,
                });
            }).catch(err => {
            toast.error(`${err}`, {
                position: "top-right",
                autoClose: 5000,
            });
        })
    }

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Active Invite Links
            </Typography>
            <List>
                {tokens.length === 0 ? (
                    <ListItem><ListItemText primary="No Links"/></ListItem>
                ) : (
                    tokens.map((link, index) => (
                        <ListItem key={index}>
                            <ListItemText
                                primary={`${window.location.origin}/invite/${link.token}`}
                                secondary={link.description}/>
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => deleteToken(link.invite_id)}>
                                    <Delete/>
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))
                )}
            </List>
            <Grid container justify="center">
                <IconButton color="primary"
                            onClick={() => setShowModal(true)}>
                    <AddIcon/>
                </IconButton>
            </Grid>
            <InviteLinkCreate show={showModal} onClose={() => setShowModal(false)} group={group}/>
        </Paper>
    );
}
