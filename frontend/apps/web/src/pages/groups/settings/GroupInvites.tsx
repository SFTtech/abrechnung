import { selectIsGuestUser, useCurrentUserPermissions } from "@abrechnung/redux";
import { Add, ContentCopy, Delete } from "@mui/icons-material";
import { Alert, Grid2 as Grid, IconButton, List, ListItem, ListItemText } from "@mui/material";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { InviteLinkCreate } from "@/components/groups/InviteLinkCreate";
import { Loading } from "@abrechnung/components";
import { useTitle } from "@/core/utils";
import { useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { Group } from "@abrechnung/api";
import { useFormatDatetime } from "@/hooks";
import { useDeleteInviteMutation, useListInvitesQuery, useListMembersQuery } from "@/core/generated/api";

interface GroupInviteProps {
    group: Group;
}

export const GroupInvites: React.FC<GroupInviteProps> = ({ group }) => {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const { data: invites } = useListInvitesQuery({ groupId: group.id });
    const { data: members } = useListMembersQuery({ groupId: group.id });
    const permissions = useCurrentUserPermissions(group.id);
    const formatDatetime = useFormatDatetime();
    const [deleteInvite] = useDeleteInviteMutation();

    const isGuest = useAppSelector(selectIsGuestUser);

    useTitle(t("groups.invites.tabTitle", { groupName: group?.name }));

    const deleteToken = (id: number) => {
        deleteInvite({ groupId: group.id, inviteId: id })
            .unwrap()
            .catch((err) => {
                toast.error(err);
            });
    };

    const getMemberUsername = (memberID: number) => {
        const member = members?.find((member) => member.user_id === memberID);
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

    const copyToClipboard = (content: string | null) => {
        if (!content) {
            return;
        }
        navigator.clipboard.writeText(content);
        toast.info("Link copied to clipboard!");
    };

    if (!permissions || !group) {
        return <Navigate to="/404" />;
    }

    const getInviteLink = (token: string | null) => {
        if (!token) {
            return null;
        }
        return `${window.location.origin}/invite/${token}`;
    };

    return (
        <>
            {isGuest && <Alert severity="info">{t("groups.invites.guestUserDisclaimer")}</Alert>}
            {invites == null ? (
                <Loading />
            ) : (
                <List>
                    {invites.length === 0 ? (
                        <ListItem>
                            <ListItemText primary="No Links" />
                        </ListItem>
                    ) : (
                        invites.map((invite) => (
                            <ListItem
                                key={invite.id}
                                secondaryAction={
                                    permissions.can_write && (
                                        <>
                                            <IconButton
                                                color="primary"
                                                onClick={() => copyToClipboard(getInviteLink(invite.token))}
                                            >
                                                <ContentCopy />
                                            </IconButton>
                                            <IconButton color="error" onClick={() => deleteToken(invite.id)}>
                                                <Delete />
                                            </IconButton>
                                        </>
                                    )
                                }
                            >
                                <ListItemText
                                    primary={
                                        invite.token === null ? (
                                            <span>{t("groups.invites.tokenHidden")}</span>
                                        ) : (
                                            <span
                                                onClick={selectLink}
                                                style={{ textOverflow: "ellipsis", maxWidth: "100%" }}
                                            >
                                                {getInviteLink(invite.token)}
                                            </span>
                                        )
                                    }
                                    secondary={
                                        <>
                                            {invite.description}, created by {getMemberUsername(invite.created_by)},
                                            valid until {formatDatetime(invite.valid_until, "full")}
                                            {invite.single_use && ", single use"}
                                            {invite.join_as_editor && ", join as editor"}
                                        </>
                                    }
                                />
                            </ListItem>
                        ))
                    )}
                </List>
            )}
            {permissions.can_write && !isGuest && (
                <>
                    <Grid container justifyContent="center">
                        <IconButton color="primary" onClick={() => setShowModal(true)}>
                            <Add />
                        </IconButton>
                    </Grid>
                    <InviteLinkCreate show={showModal} onClose={() => setShowModal(false)} group={group} />
                </>
            )}
        </>
    );
};
