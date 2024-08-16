import React, { useState } from "react";
import { GroupCreateModal } from "@/components/groups/GroupCreateModal";
import { GroupDeleteModal } from "@/components/groups/GroupDeleteModal";
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
import { Add, Delete } from "@mui/icons-material";
import { MobilePaper, ListItemLink } from "@/components/style";
import { selectIsGuestUser, selectGroups } from "@abrechnung/redux";
import { useAppSelector, selectGroupSlice, selectAuthSlice } from "@/store";
import { useTitle } from "@/core/utils";
import { useTranslation } from "react-i18next";
import { Group } from "@abrechnung/api";

export const GroupList: React.FC = () => {
    const { t } = useTranslation();
    useTitle(t("groups.list.tabTitle"));
    const [showGroupCreationModal, setShowGroupCreationModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
    const groups = useAppSelector((state) => selectGroups({ state: selectGroupSlice(state) }));
    const isGuest = useAppSelector((state) => selectIsGuestUser({ state: selectAuthSlice(state) }));

    const openGroupDeletionModal = (groupID: number) => {
        const g = groups.find((group) => group.id === groupID);
        if (g) {
            setGroupToDelete(g);
        }
    };

    const closeGroupDeletionModal = () => {
        setGroupToDelete(null);
    };

    const openGroupCreateModal = () => {
        setShowGroupCreationModal(true);
    };

    const closeGroupCreateModal = (reason: string) => {
        if (reason !== "backdropClick") {
            setShowGroupCreationModal(false);
        }
    };

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                {t("groups.list.header")}
            </Typography>
            {isGuest && <Alert severity="info">{t("groups.list.guestUserDisclaimer")}</Alert>}
            <List>
                {groups.length === 0 ? (
                    <ListItem key={0}>
                        <span>{t("groups.list.noGroups")}</span>
                    </ListItem>
                ) : (
                    groups.map((group) => {
                        return (
                            <ListItem sx={{ padding: 0 }} key={group.id}>
                                <ListItemLink to={`/groups/${group.id}`}>
                                    <ListItemText primary={group.name} secondary={group.description} />
                                </ListItemLink>
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        aria-label="delete-group"
                                        onClick={() => openGroupDeletionModal(group.id)}
                                    >
                                        <Delete />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        );
                    })
                )}
            </List>
            {!isGuest && (
                <>
                    <Grid container justifyContent="center">
                        <IconButton color="primary" onClick={openGroupCreateModal}>
                            <Add />
                        </IconButton>
                    </Grid>
                    <GroupCreateModal show={showGroupCreationModal} onClose={closeGroupCreateModal} />
                </>
            )}
            {groupToDelete != null && (
                <GroupDeleteModal
                    show={groupToDelete != null}
                    onClose={closeGroupDeletionModal}
                    groupToDelete={groupToDelete}
                />
            )}
        </MobilePaper>
    );
};
