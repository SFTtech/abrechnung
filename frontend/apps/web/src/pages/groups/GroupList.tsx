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
    Stack,
    Typography,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { MobilePaper, ListItemLink } from "@/components/style";
import { selectIsGuestUser, selectGroups } from "@abrechnung/redux";
import { useAppSelector } from "@/store";
import { useTitle } from "@/core/utils";
import { useTranslation } from "react-i18next";
import { Group } from "@abrechnung/api";
import { DateTime } from "luxon";

const GList: React.FC<{ groups: Group[] }> = ({ groups }) => {
    const { t } = useTranslation();
    const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

    const openGroupDeletionModal = (groupID: number) => {
        const g = groups.find((group) => group.id === groupID);
        if (g) {
            setGroupToDelete(g);
        }
    };

    const closeGroupDeletionModal = () => {
        setGroupToDelete(null);
    };

    return (
        <>
            <List>
                {groups.length === 0 ? (
                    <ListItem key={0}>
                        <span>{t("groups.list.noGroups")}</span>
                    </ListItem>
                ) : (
                    groups.map((group) => {
                        return (
                            <ListItemLink sx={{ padding: 0 }} key={group.id} to={`/groups/${group.id}`}>
                                <ListItemText
                                    primary={group.name}
                                    secondary={
                                        <>
                                            {group.description && (
                                                <>
                                                    {group.description}
                                                    <br />
                                                </>
                                            )}
                                            {t("common.lastChangedWithTime", {
                                                datetime: DateTime.fromISO(group.last_changed).toLocaleString(
                                                    DateTime.DATETIME_FULL
                                                ),
                                            })}
                                        </>
                                    }
                                />
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        aria-label="delete-group"
                                        onClick={() => openGroupDeletionModal(group.id)}
                                    >
                                        <Delete />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItemLink>
                        );
                    })
                )}
            </List>
            {groupToDelete != null && (
                <GroupDeleteModal
                    show={groupToDelete != null}
                    onClose={closeGroupDeletionModal}
                    groupToDelete={groupToDelete}
                />
            )}
        </>
    );
};

export const GroupList: React.FC = () => {
    const { t } = useTranslation();
    useTitle(t("groups.list.tabTitle"));
    const [showGroupCreationModal, setShowGroupCreationModal] = useState(false);
    const groups = useAppSelector((state) => selectGroups(state, false));
    const archivedGroups = useAppSelector((state) => selectGroups(state, true));
    const isGuest = useAppSelector(selectIsGuestUser);

    const openGroupCreateModal = () => {
        setShowGroupCreationModal(true);
    };

    const closeGroupCreateModal = (reason: string) => {
        if (reason !== "backdropClick") {
            setShowGroupCreationModal(false);
        }
    };

    return (
        <Stack spacing={2}>
            <MobilePaper>
                <Typography component="h3" variant="h5">
                    {t("groups.list.header")}
                </Typography>
                {isGuest && <Alert severity="info">{t("groups.list.guestUserDisclaimer")}</Alert>}
                <GList groups={groups} />
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
            </MobilePaper>
            {archivedGroups.length > 0 && (
                <MobilePaper>
                    <Typography component="h3" variant="h5">
                        {t("groups.list.archivedGroups")}
                    </Typography>
                    <GList groups={archivedGroups} />
                </MobilePaper>
            )}
        </Stack>
    );
};
