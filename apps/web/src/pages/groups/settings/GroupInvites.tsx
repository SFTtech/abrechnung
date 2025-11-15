import { selectIsGuestUser, useCurrentUserPermissions } from "@abrechnung/redux";
import { Add, ContentCopy, Delete, MoreVert } from "@mui/icons-material";
import { Alert, Grid, IconButton, List, ListItem, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import * as React from "react";
import { toast } from "react-toastify";
import { InviteLinkCreate } from "@/components/groups/InviteLinkCreate";
import { Loading } from "@abrechnung/components";
import { useTitle } from "@/core/utils";
import { useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { Group, GroupInvite } from "@abrechnung/api";
import { useFormatDatetime, useIsSmallScreen } from "@/hooks";
import { useDeleteInviteMutation, useListInvitesQuery, useListMembersQuery } from "@/core/generated/api";

const getInviteLink = (token: string | null) => {
    if (!token) {
        return null;
    }
    return `${window.location.origin}/invite/${token}`;
};

const copyToClipboard = (content: string | null) => {
    if (!content) {
        return;
    }
    navigator.clipboard.writeText(content);
    toast.info("Link copied to clipboard!");
};

const InviteActions: React.FC<{ group: Group; invite: GroupInvite }> = ({ group, invite }) => {
    const { t } = useTranslation();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchorEl);
    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
    };
    const isSmallScreen = useIsSmallScreen();
    const [deleteInvite] = useDeleteInviteMutation();

    const deleteToken = (id: number) => {
        deleteInvite({ groupId: group.id, inviteId: id })
            .unwrap()
            .catch((err) => {
                toast.error(err);
            });
    };

    const copy = () => {
        copyToClipboard(getInviteLink(invite.token));
    };

    const confirmDelete = () => {
        deleteToken(invite.id);
    };

    if (isSmallScreen) {
        return (
            <>
                <IconButton
                    aria-label="more"
                    id="long-button"
                    aria-controls={menuOpen ? "invite-actions-menu" : undefined}
                    aria-expanded={menuOpen ? "true" : undefined}
                    aria-haspopup="true"
                    onClick={handleOpenMenu}
                >
                    <MoreVert />
                </IconButton>
                <Menu
                    id="invite-actions-menu"
                    MenuListProps={{
                        "aria-labelledby": "long-button",
                    }}
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={handleCloseMenu}
                >
                    <MenuItem onClick={copy}>
                        <ListItemIcon>
                            <ContentCopy color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{t("common.copyToClipboard")}</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={copy}>
                        <ListItemIcon>
                            <Delete color="error" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{t("common.delete")}</ListItemText>
                    </MenuItem>
                </Menu>
            </>
        );
    }

    return (
        <>
            <IconButton color="primary" onClick={copy}>
                <ContentCopy />
            </IconButton>
            <IconButton color="error" onClick={confirmDelete}>
                <Delete />
            </IconButton>
        </>
    );
};

interface GroupInviteProps {
    group: Group;
}

export const GroupInvites: React.FC<GroupInviteProps> = ({ group }) => {
    const { t } = useTranslation();
    const [showModal, setShowModal] = React.useState(false);
    const { data: invites } = useListInvitesQuery({ groupId: group.id });
    const { data: members } = useListMembersQuery({ groupId: group.id });
    const permissions = useCurrentUserPermissions(group.id);
    const formatDatetime = useFormatDatetime();

    const isGuest = useAppSelector(selectIsGuestUser);

    useTitle(t("groups.invites.tabTitle", { groupName: group?.name }));

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

    if (!permissions || !group) {
        return <Navigate to="/404" />;
    }

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
                                    permissions.can_write && <InviteActions group={group} invite={invite} />
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
