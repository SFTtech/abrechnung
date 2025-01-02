import React, { useState } from "react";
import { GroupCreateModal } from "@/components/groups/GroupCreateModal";
import { Alert, Divider, Grid, IconButton, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import { MobilePaper, ListItemLink } from "@/components/style";
import { selectIsGuestUser, selectGroups } from "@abrechnung/redux";
import { useAppSelector } from "@/store";
import { useTitle } from "@/core/utils";
import { useTranslation } from "react-i18next";
import { Group } from "@abrechnung/api";
import { useIsSmallScreen } from "@/hooks";
import { DateTime } from "luxon";

const GList: React.FC<{ groups: Group[] }> = ({ groups }) => {
    const { t } = useTranslation();
    const isSmallScreen = useIsSmallScreen();

    return (
        <List>
            {groups.length === 0 ? (
                <ListItem>
                    <span>{t("groups.list.noGroups")}</span>
                </ListItem>
            ) : (
                groups.map((group) => {
                    return (
                        <>
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
                                            {t("groups.list.lastUpdateAt", {
                                                datetime: DateTime.fromISO(group.last_changed).toLocaleString(
                                                    DateTime.DATETIME_FULL
                                                ),
                                            })}
                                        </>
                                    }
                                />
                            </ListItemLink>
                            {isSmallScreen && <Divider component="li" />}
                        </>
                    );
                })
            )}
        </List>
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
