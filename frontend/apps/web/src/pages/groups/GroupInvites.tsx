import {
    deleteGroupInvite,
    fetchGroupInvites,
    selectCurrentUserPermissions,
    selectGroupById,
    selectGroupInviteStatus,
    selectGroupInvites,
    selectGroupMembers,
    selectIsGuestUser,
    subscribe,
    unsubscribe,
} from "@abrechnung/redux";
import { Add, ContentCopy, Delete } from "@mui/icons-material";
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
import { DateTime } from "luxon";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { InviteLinkCreate } from "@/components/groups/InviteLinkCreate";
import { Loading } from "@/components/style/Loading";
import { MobilePaper } from "@/components/style";
import { api, ws } from "@/core/api";
import { useTitle } from "@/core/utils";
import { selectAuthSlice, selectGroupSlice, useAppDispatch, useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

interface Props {
    groupId: number;
}

export const GroupInvites: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const dispatch = useAppDispatch();
    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const invites = useAppSelector((state) => selectGroupInvites({ state: selectGroupSlice(state), groupId }));
    const members = useAppSelector((state) => selectGroupMembers({ state: selectGroupSlice(state), groupId }));
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const invitesLoadingStatus = useAppSelector((state) =>
        selectGroupInviteStatus({ state: selectGroupSlice(state), groupId })
    );

    const isGuest = useAppSelector((state) => selectIsGuestUser({ state: selectAuthSlice(state) }));

    useTitle(t("groups.invites.tabTitle", "", { groupName: group?.name }));

    useEffect(() => {
        dispatch(fetchGroupInvites({ groupId, api }));
        dispatch(subscribe({ subscription: { type: "group_invite", groupId }, websocket: ws }));
        return () => {
            dispatch(unsubscribe({ subscription: { type: "group_invite", groupId }, websocket: ws }));
        };
    }, [dispatch, groupId]);

    const deleteToken = (id: number) => {
        dispatch(deleteGroupInvite({ groupId, inviteId: id, api }))
            .unwrap()
            .catch((err) => {
                toast.error(err);
            });
    };

    const getMemberUsername = (memberID: number) => {
        const member = members.find((member) => member.user_id === memberID);
        if (member === undefined) {
            return "unknown";
        }
        return member.username;
    };

    const selectLink = (event: React.MouseEvent<HTMLLinkElement>) => {
        const node = event.target;
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(node as HTMLElement);
        selection?.removeAllRanges();
        selection?.addRange(range);
    };

    const copyToClipboard = (content: string) => {
        navigator.clipboard.writeText(content);
        toast.info("Link copied to clipboard!");
    };

    if (!permissions || !group) {
        return <Navigate to="/404" />;
    }

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                {t("groups.invites.header")}
            </Typography>
            {isGuest && <Alert severity="info">{t("groups.invites.guestUserDisclaimer")}</Alert>}
            {invitesLoadingStatus === "loading" ? (
                <Loading />
            ) : (
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
                                            <span>{t("groups.invites.tokenHidden")}</span>
                                        ) : (
                                            <span onClick={selectLink}>
                                                {window.location.origin}/invite/
                                                {invite.token}
                                            </span>
                                        )
                                    }
                                    secondary={
                                        <>
                                            {invite.description}, created by {getMemberUsername(invite.created_by)},
                                            valid until{" "}
                                            {DateTime.fromISO(invite.valid_until).toLocaleString(
                                                DateTime.DATETIME_FULL
                                            )}
                                            {invite.single_use && ", single use"}
                                            {invite.join_as_editor && ", join as editor"}
                                        </>
                                    }
                                />
                                {permissions.canWrite && (
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
            )}
            {permissions.canWrite && !isGuest && (
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
