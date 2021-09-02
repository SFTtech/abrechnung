import React, {useState} from "react";

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
import {makeStyles, Paper} from "@material-ui/core";
import {deleteGroupInvite} from "../../api";
import {currUserPermissions, groupInvites, groupMembers} from "../../recoil/groups";
import {useRecoilValue} from "recoil";
import {DateTime} from "luxon";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function GroupInvites({group}) {
    const classes = useStyles();
    const [showModal, setShowModal] = useState(false);
    const invites = useRecoilValue(groupInvites(group.id));
    const members = useRecoilValue(groupMembers(group.id));
    const userPermissions = useRecoilValue(currUserPermissions(group.id));

    const deleteToken = (id) => {
        deleteGroupInvite({groupID: group.id, inviteID: id})
            .catch(err => {
                toast.error(err);
            })
    }

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Active Invite Links
            </Typography>
            <List>
                {invites.length === 0 ? (
                    <ListItem><ListItemText primary="No Links"/></ListItem>
                ) : (
                    invites.map(invite => (
                        <ListItem key={invite.id}>
                            <ListItemText
                                primary={invite.token === null ? (
                                    <span>token hidden, was created by another member</span>
                                ) : (
                                    <span>{window.location.origin}/invite/{invite.token}</span>
                                )}
                                secondary={
                                    <>
                                        {invite.description},
                                        created
                                        by {members.find(member => member.user_id === invite.created_by)?.username},
                                        valid
                                        until {DateTime.fromISO(invite.valid_until).toLocaleString(DateTime.DATETIME_FULL)}
                                        {invite.single_use && ", single use"}
                                    </>
                                }
                            />
                            {userPermissions.can_write && (
                                <ListItemSecondaryAction>
                                    <IconButton onClick={() => deleteToken(invite.id)}>
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
                                    onClick={() => setShowModal(true)}>
                            <AddIcon/>
                        </IconButton>
                    </Grid>
                    <InviteLinkCreate show={showModal} onClose={() => setShowModal(false)} group={group}/>
                </>
            )}
        </Paper>
    );
}
