import React, { useState } from "react";

import InviteLinkCreate from "../../components/groups/InviteLinkCreate";
import { toast } from "react-toastify";
import { deleteGroupInvite } from "../../api";
import { currUserPermissions, groupInvites, groupMembers } from "../../recoil/groups";
import { useRecoilValue } from "recoil";
import { DateTime } from "luxon";
import {
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Paper,
    Typography,
} from "@mui/material";
import { Add, ContentCopy, Delete } from "@mui/icons-material";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function GroupInvites({ group }) {
    const classes = useStyles();
    const [showModal, setShowModal] = useState(false);
    const invites = useRecoilValue(groupInvites(group.id));
    const members = useRecoilValue(groupMembers(group.id));
    const userPermissions = useRecoilValue(currUserPermissions(group.id));

    const deleteToken = (id) => {
        deleteGroupInvite({ groupID: group.id, inviteID: id }).catch((err) => {
            toast.error(err);
        });
    };

    const getMemberUsername = (member_id) => {
        const member = members.find((member) => member.user_id === member_id);
        if (member === undefined) {
            return "unknown";
        }
        return member.username;
    };

    const selectLink = (event) => {
        const node = event.target;
        if (document.body.createTextRange) {
            const range = document.body.createTextRange();
            range.moveToElementText(node);
            range.select();
        } else if (window.getSelection()) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(node);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };

    const copyToClipboard = (content) => {
        navigator.clipboard.writeText(content);
        toast.info("Link copied to clipboard!");
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Active Invite Links
            </Typography>
            <List>
                {invites.length === 0 ? (
                    <ListItem>
                        <ListItemText primary="No Links" />
                    </ListItem>
                ) : (
                    invites.map((invite) => (
                        <ListItem key={invite.id}>
                            <ListItemText
                                primary={
                                    invite.token === null ? (
                                        <span>token hidden, was created by another member</span>
                                    ) : (
                                        <span onClick={selectLink}>
                                            {window.location.origin}/invite/
                                            {invite.token}
                                        </span>
                                    )
                                }
                                secondary={
                                    <>
                                        {invite.description}, created by {getMemberUsername(invite.created_by)}, valid
                                        until{" "}
                                        {DateTime.fromISO(invite.valid_until).toLocaleString(DateTime.DATETIME_FULL)}
                                        {invite.single_use && ", single use"}
                                        {invite.join_as_editor && ", join as editor"}
                                    </>
                                }
                            />
                            {userPermissions.can_write && (
                                <ListItemSecondaryAction>
                                    <IconButton
                                        onClick={() =>
                                            copyToClipboard(`${window.location.origin}/invite/${invite.token}`)
                                        }
                                    >
                                        <ContentCopy />
                                    </IconButton>
                                    <IconButton onClick={() => deleteToken(invite.id)}>
                                        <Delete />
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
                        <IconButton color="primary" onClick={() => setShowModal(true)}>
                            <Add />
                        </IconButton>
                    </Grid>
                    <InviteLinkCreate show={showModal} onClose={() => setShowModal(false)} group={group} />
                </>
            )}
        </Paper>
    );
}
