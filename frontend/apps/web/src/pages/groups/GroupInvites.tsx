import React, { useState } from "react";

import InviteLinkCreate from "../../components/groups/InviteLinkCreate";
import { toast } from "react-toastify";
import { api } from "../../core/api";
import { currUserPermissions, groupInvites, groupMembers } from "../../state/groups";
import { Group } from "@abrechnung/types";
import { useRecoilValue } from "recoil";
import { DateTime } from "luxon";
import {
    Alert,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Typography,
} from "@mui/material";
import { Add, ContentCopy, Delete } from "@mui/icons-material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../core/utils";
import { isGuestUser } from "../../state/auth";

interface Props {
    group: Group;
}

export const GroupInvites: React.FC<Props> = ({ group }) => {
    const [showModal, setShowModal] = useState(false);
    const invites = useRecoilValue(groupInvites(group.id));
    const members = useRecoilValue(groupMembers(group.id));
    const userPermissions = useRecoilValue(currUserPermissions(group.id));

    const isGuest = useRecoilValue(isGuestUser);

    useTitle(`${group.name} - Invite Links`);

    const deleteToken = (id) => {
        api.deleteGroupInvite(group.id, id).catch((err) => {
            toast.error(err);
        });
    };

    const getMemberUsername = (memberID) => {
        const member = members.find((member) => member.userID === memberID);
        if (member === undefined) {
            return "unknown";
        }
        return member.username;
    };

    const selectLink = (event) => {
        const node = event.target;
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
    };

    const copyToClipboard = (content) => {
        navigator.clipboard.writeText(content);
        toast.info("Link copied to clipboard!");
    };

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                Active Invite Links
            </Typography>
            {isGuest && (
                <Alert severity="info">
                    You are a guest user on this Abrechnung and therefore not permitted to create group invites.
                </Alert>
            )}
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
                                        {invite.description}, created by {getMemberUsername(invite.createdBy)}, valid
                                        until{" "}
                                        {DateTime.fromISO(invite.validUntil).toLocaleString(DateTime.DATETIME_FULL)}
                                        {invite.singleUse && ", single use"}
                                        {invite.joinAsEditor && ", join as editor"}
                                    </>
                                }
                            />
                            {userPermissions.canWrite && (
                                <ListItemSecondaryAction>
                                    <IconButton
                                        color="primary"
                                        onClick={() =>
                                            copyToClipboard(`${window.location.origin}/invite/${invite.token}`)
                                        }
                                    >
                                        <ContentCopy />
                                    </IconButton>
                                    <IconButton color="error" onClick={() => deleteToken(invite.id)}>
                                        <Delete />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            )}
                        </ListItem>
                    ))
                )}
            </List>
            {userPermissions.canWrite && !isGuest && (
                <>
                    <Grid container justifyContent="center">
                        <IconButton color="primary" onClick={() => setShowModal(true)}>
                            <Add />
                        </IconButton>
                    </Grid>
                    <InviteLinkCreate show={showModal} onClose={() => setShowModal(false)} group={group} />
                </>
            )}
        </MobilePaper>
    );
};

export default GroupInvites;
